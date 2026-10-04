// Comparador das capturas de `tools/visual-shots.mjs`: decodifica os PNGs (só `zlib`, sem dependência), conta os pixels
// diferentes de cada par e grava uma imagem de diferença por estado (a captura B esmaecida com os pixels diferentes em
// magenta), um recorte ampliado `<estado>.zoom.png` com A, B e a diferença lado a lado, e um `report.json`.
//   node tools/visual-diff.mjs <pasta-A> <pasta-B> <pasta-diff> [tolerância por canal, padrão 0]
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import zlib from 'node:zlib';

const [dirA, dirB, dirOut, tolArg] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const TOL = Number(tolArg ?? 0);
/** `--recorte=estado:x0,y0,x1,y1` (pode repetir): só grava `<estado>.recorte.png` dessa caixa, ampliada. */
const CROPS = process.argv
  .filter((a) => a.startsWith('--recorte='))
  .map((a) => a.slice(10).split(':'))
  .map(([state, box]) => ({ state, box: box.split(',').map(Number) }));
if (!dirA || !dirB || !dirOut) {
  console.error(
    'uso: node tools/visual-diff.mjs <pasta-A> <pasta-B> <pasta-diff> [tolerância] [--recorte=estado:x0,y0,x1,y1]',
  );
  process.exit(2);
}

/** Preditor de Paeth do filtro 4 do PNG. */
function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/** Desfaz o filtro de uma linha (`cur` no lugar), dada a anterior e os bytes por pixel. */
function unfilter(type, cur, prev, bpp) {
  for (let i = 0; i < cur.length; i++) {
    const left = i >= bpp ? cur[i - bpp] : 0;
    const up = prev ? prev[i] : 0;
    const upLeft = prev && i >= bpp ? prev[i - bpp] : 0;
    if (type === 1) cur[i] = (cur[i] + left) & 255;
    else if (type === 2) cur[i] = (cur[i] + up) & 255;
    else if (type === 3) cur[i] = (cur[i] + ((left + up) >> 1)) & 255;
    else if (type === 4) cur[i] = (cur[i] + paeth(left, up, upLeft)) & 255;
  }
}

/** Lê os blocos do PNG: devolve o cabeçalho e os dados comprimidos juntos. */
function readChunks(buf) {
  const idat = [];
  let head = null;
  for (let off = 8; off < buf.length;) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('latin1', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') head = { w: data.readUInt32BE(0), h: data.readUInt32BE(4), depth: data[8], color: data[9] };
    if (type === 'IDAT') idat.push(data);
    off += 12 + len;
  }
  return { head, raw: zlib.inflateSync(Buffer.concat(idat)) };
}

/** PNG de 8 bits RGB ou RGBA, sem entrelaçamento (o que o `canvas.toDataURL` grava) para RGBA. */
function decodePng(file) {
  const { head, raw } = readChunks(readFileSync(file));
  if (!head || head.depth !== 8 || (head.color !== 2 && head.color !== 6))
    throw new Error(`PNG não suportado: ${file}`);
  const bpp = head.color === 6 ? 4 : 3;
  const stride = head.w * bpp;
  const rgba = Buffer.alloc(head.w * head.h * 4, 255);
  let prev = null;
  for (let y = 0; y < head.h; y++) {
    const start = y * (stride + 1);
    const line = raw.subarray(start + 1, start + 1 + stride);
    unfilter(raw[start], line, prev, bpp);
    for (let x = 0; x < head.w; x++) line.copy(rgba, (y * head.w + x) * 4, x * bpp, x * bpp + bpp);
    prev = line;
  }
  return { w: head.w, h: head.h, rgba };
}

const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  let crc = 0xffffffff;
  for (const b of body) crc = CRC[(crc ^ b) & 255] ^ (crc >>> 8);
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE((crc ^ 0xffffffff) >>> 0, 8 + data.length);
  return out;
}

function encodePng(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  const head = Buffer.alloc(13);
  head.writeUInt32BE(w, 0);
  head.writeUInt32BE(h, 4);
  head.set([8, 6, 0, 0, 0], 8);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk('IHDR', head),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Conta os pixels diferentes e pinta a imagem de diferença; devolve também a caixa que contém todos eles. */
function compare(a, b) {
  const out = Buffer.alloc(a.rgba.length);
  const box = { x0: a.w, y0: a.h, x1: -1, y1: -1 };
  let count = 0;
  let maxDelta = 0;
  for (let i = 0; i < a.rgba.length; i += 4) {
    let delta = 0;
    for (let c = 0; c < 3; c++) delta = Math.max(delta, Math.abs(a.rgba[i + c] - b.rgba[i + c]));
    maxDelta = Math.max(maxDelta, delta);
    if (delta > TOL) {
      const x = (i / 4) % a.w;
      const y = Math.floor(i / 4 / a.w);
      box.x0 = Math.min(box.x0, x);
      box.y0 = Math.min(box.y0, y);
      box.x1 = Math.max(box.x1, x);
      box.y1 = Math.max(box.y1, y);
      count++;
      out.set([255, 0, 255, 255], i);
    } else {
      const gray = (b.rgba[i] + b.rgba[i + 1] + b.rgba[i + 2]) / 3;
      out.fill(Math.round(gray * 0.35), i, i + 3);
      out[i + 3] = 255;
    }
  }
  return { count, maxDelta, box: count > 0 ? [box.x0, box.y0, box.x1, box.y1] : null, out };
}

/** Recorte da caixa (com folga) de cada imagem, lado a lado e ampliado sem filtro: A, B, diferença. */
function zoomStrip(images, w, box) {
  const h = images[0].length / 4 / w;
  const x0 = Math.max(0, box[0] - 8);
  const y0 = Math.max(0, box[1] - 8);
  const cw = Math.min(w, box[2] + 9) - x0;
  const ch = Math.min(h, box[3] + 9) - y0;
  const scale = Math.max(1, Math.min(8, Math.floor(640 / cw), Math.floor(720 / ch)));
  const gap = 4;
  const ow = (cw * 3 + gap * 2) * scale;
  const out = Buffer.alloc(ow * ch * scale * 4, 255);
  for (let y = 0; y < ch * scale; y++) {
    for (let x = 0; x < ow; x++) {
      const col = Math.floor(x / scale);
      const k = Math.floor(col / (cw + gap));
      const sx = col - k * (cw + gap);
      if (sx >= cw) continue;
      const src = ((y0 + Math.floor(y / scale)) * w + x0 + sx) * 4;
      images[k].copy(out, (y * ow + x) * 4, src, src + 4);
    }
  }
  return encodePng(ow, ch * scale, out);
}

mkdirSync(dirOut, { recursive: true });
for (const { state, box } of CROPS) {
  const a = decodePng(join(dirA, `${state}.png`));
  const b = decodePng(join(dirB, `${state}.png`));
  const file = join(dirOut, `${state}.recorte.png`);
  writeFileSync(file, zoomStrip([a.rgba, b.rgba, compare(a, b).out], a.w, box));
  console.log(file);
}
if (CROPS.length > 0) process.exit(0);
const names = readdirSync(dirA)
  .filter((f) => f.endsWith('.png'))
  .sort();
const report = [];
for (const name of names) {
  const state = name.replace(/\.png$/, '');
  let b;
  try {
    b = decodePng(join(dirB, name));
  } catch {
    report.push({ state, missing: true });
    console.log(`${state.padEnd(34)} sem par em B`);
    continue;
  }
  const a = decodePng(join(dirA, name));
  if (a.w !== b.w || a.h !== b.h) {
    report.push({ state, sizeA: [a.w, a.h], sizeB: [b.w, b.h] });
    console.log(`${state.padEnd(34)} tamanhos diferentes: ${a.w}x${a.h} e ${b.w}x${b.h}`);
    continue;
  }
  const { count, maxDelta, box, out } = compare(a, b);
  const pct = (count / (a.w * a.h)) * 100;
  if (count > 0) {
    writeFileSync(join(dirOut, name), encodePng(a.w, a.h, out));
    writeFileSync(join(dirOut, `${state}.zoom.png`), zoomStrip([a.rgba, b.rgba, out], a.w, box));
  }
  report.push({ state, diffPixels: count, pct: Number(pct.toFixed(3)), maxDelta, box });
  console.log(
    `${state.padEnd(34)} ${String(count).padStart(7)} px ${pct.toFixed(2).padStart(6)}%  Δmáx ${maxDelta}${box ? `  caixa ${box.join(',')}` : ''}`,
  );
}
writeFileSync(join(dirOut, 'report.json'), JSON.stringify(report, null, 2));
const same = report.filter((r) => r.diffPixels === 0).length;
console.log(`\n${same} de ${report.length} estados idênticos; diferenças em ${dirOut}`);
