// Traz um atlas de quadros desenhados (PNG) para o jogo como dados: `src/game/art/hd/atlas/<nome>Atlas.data.ts`.
//
// O atlas é uma grade de células iguais, um quadro por célula, lido da esquerda para a direita e de cima para baixo.
// O JSON ao lado dá o tamanho da célula, a coluna do eixo do corpo e os nomes dos quadros, na ordem:
//   { "cell": { "w": 192, "h": 160 }, "origin": { "x": 72 }, "frames": ["idle-0", "run-0", ...] }
// Opcional: "frameData": [{ "name": "vermelho-release", "hand": { "dx": 58, "dy": 80 } }], a mão que conjura naquele
// quadro, em texels a partir do eixo (para a frente) e acima da sola. Com "angle" (graus, sentido horário; 0 = antebraço
// para cima, 90 = para a frente), o objeto na mão gira junto. Vai para `hands` no arquivo gerado.
// A sola do pé de apoio fica na última linha da célula. Alfa abaixo de 128 vira transparente; cada cor opaca vira um
// índice na tabela `colors` (no máximo 255 cores: o atlas chega aqui já reduzido à paleta).
//
// Uso, a partir da raiz do repo. A fonte da arte do protagonista são os PNGs soltos de `assets/yuta/quadros/`
// (um por quadro, do tamanho da célula), com os nomes e a ordem em `assets/yuta/atlas.json`:
//   node tools/sprite-atlas.mjs --dir assets/yuta/quadros --json assets/yuta/atlas.json --name yuta
//   npx prettier --write src/game/art/hd/atlas
//
// Para trazer um atlas novo (uma imagem só, em grade) e separá-lo em quadros:
//   --png <atlas.png>  lê as células do atlas em vez dos PNGs soltos (`--dir` some);
//   --split <pasta>    em vez de importar, grava cada quadro como `<pasta>/<quadro>.png`.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateSync, inflateSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const need = (name) => {
  const v = flag(name);
  if (!v) throw new Error(`Falta --${name}`);
  return v;
};

// ---------------------------------------------------------------- PNG (8 bits, RGB ou RGBA, sem entrelaçamento)

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/** Desfaz o filtro de uma linha do PNG, no lugar. `prev` é a linha de cima já desfeita (ou zeros). */
function unfilter(type, line, prev, bpp) {
  for (let i = 0; i < line.length; i++) {
    const a = i >= bpp ? line[i - bpp] : 0;
    const b = prev[i];
    const c = i >= bpp ? prev[i - bpp] : 0;
    const add = type === 1 ? a : type === 2 ? b : type === 3 ? (a + b) >> 1 : type === 4 ? paeth(a, b, c) : 0;
    line[i] = (line[i] + add) & 255;
  }
}

/** Lê um PNG e devolve `{ w, h, rgba }` com 4 bytes por pixel. */
function readPng(path) {
  const buf = readFileSync(path);
  let pos = 8;
  let w = 0;
  let h = 0;
  let channels = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('latin1', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      const colorType = data[9];
      if (data[8] !== 8 || (colorType !== 2 && colorType !== 6) || data[12] !== 0)
        throw new Error(`${path}: só PNG de 8 bits, RGB ou RGBA, sem entrelaçamento`);
      channels = colorType === 6 ? 4 : 3;
    } else if (type === 'IDAT') idat.push(data);
    pos += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * channels;
  const rgba = new Uint8Array(w * h * 4);
  let prev = new Uint8Array(stride);
  for (let y = 0; y < h; y++) {
    const at = y * (stride + 1);
    const line = Uint8Array.from(raw.subarray(at + 1, at + 1 + stride));
    unfilter(raw[at], line, prev, channels);
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      rgba[o] = line[x * channels];
      rgba[o + 1] = line[x * channels + 1];
      rgba[o + 2] = line[x * channels + 2];
      rgba[o + 3] = channels === 4 ? line[x * channels + 3] : 255;
    }
    prev = line;
  }
  return { w, h, rgba };
}

/** Grava um PNG RGBA de 8 bits. */
function writePng(path, w, h, rgba) {
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
    const out = Buffer.alloc(body.length + 8);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc32(body), body.length + 4);
    return out;
  };
  const head = Buffer.alloc(13);
  head.writeUInt32BE(w, 0);
  head.writeUInt32BE(h, 4);
  head.set([8, 6, 0, 0, 0], 8);
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) raw.set(rgba.subarray(y * w * 4, (y + 1) * w * 4), y * (w * 4 + 1) + 1);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  writeFileSync(
    path,
    Buffer.concat([sig, chunk('IHDR', head), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]),
  );
}

// ---------------------------------------------------------------- quadros indexados

/** Pares (repetições, índice) em base64: repetições de 1 a 255. */
function rle(indices) {
  const out = [];
  let i = 0;
  while (i < indices.length) {
    let n = 1;
    while (n < 255 && i + n < indices.length && indices[i + n] === indices[i]) n++;
    out.push(n, indices[i]);
    i += n;
  }
  return Buffer.from(out).toString('base64');
}

// O JSON pode vir com BOM (o PowerShell grava assim).
const meta = JSON.parse(readFileSync(resolve(need('json')), 'utf8').replace(/^﻿/, ''));
const { w: cw, h: ch } = meta.cell;
const dir = flag('dir');
const atlas = dir ? undefined : readPng(resolve(need('png')));
const perRow = atlas ? Math.floor(atlas.w / cw) : 1;
if (atlas && perRow * Math.floor(atlas.h / ch) < meta.frames.length)
  throw new Error(`O atlas de ${atlas.w}x${atlas.h} não tem ${meta.frames.length} células de ${cw}x${ch}`);

/** Pixels RGBA do quadro `frame` (a célula `n` do atlas, ou o PNG solto com o nome dele em `--dir`). */
function cellPixels(frame, n) {
  if (!atlas) {
    const one = readPng(join(resolve(dir), `${frame}.png`));
    if (one.w !== cw || one.h !== ch) throw new Error(`${frame}.png tem ${one.w}x${one.h}; a célula é ${cw}x${ch}`);
    return one.rgba;
  }
  const x0 = (n % perRow) * cw;
  const y0 = Math.floor(n / perRow) * ch;
  const out = new Uint8Array(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    const from = ((y0 + y) * atlas.w + x0) * 4;
    out.set(atlas.rgba.subarray(from, from + cw * 4), y * cw * 4);
  }
  return out;
}

const split = flag('split');
if (split) {
  const to = resolve(split);
  mkdirSync(to, { recursive: true });
  meta.frames.forEach((frame, n) => writePng(join(to, `${frame}.png`), cw, ch, cellPixels(frame, n)));
  console.log(`${to}
  ${meta.frames.length} quadros de ${cw}x${ch}`);
  process.exit(0);
}

const name = need('name');
const colors = [0];
const colorIndex = new Map();
const frames = {};
meta.frames.forEach((frame, n) => {
  const rgba = cellPixels(frame, n);
  const indices = new Uint8Array(cw * ch);
  for (let i = 0; i < cw * ch; i++) {
    const o = i * 4;
    if (rgba[o + 3] < 128) continue;
    const rgb = (rgba[o] << 16) | (rgba[o + 1] << 8) | rgba[o + 2];
    let idx = colorIndex.get(rgb);
    if (idx === undefined) {
      idx = colors.length;
      if (idx > 255) throw new Error('O atlas tem mais de 255 cores: reduza à paleta antes de importar');
      colors.push(rgb);
      colorIndex.set(rgb, idx);
    }
    indices[i] = idx;
  }
  frames[frame] = rle(indices);
});

const hands = (meta.frameData ?? []).filter((f) => f.hand && f.name in frames);
const hex = (c) => `0x${c.toString(16).padStart(6, '0')}`;
const constName = `${name.toUpperCase()}_ATLAS_DATA`;
const lines = [
  `// Gerado por tools/sprite-atlas.mjs (--name ${name}). Não editar à mão: mude o atlas e rode a ferramenta de novo.`,
  `export const ${constName} = {`,
  `  frameW: ${cw},`,
  `  frameH: ${ch},`,
  `  originCol: ${meta.origin.x},`,
  `  colors: [${colors.map(hex).join(', ')}],`,
  `  frames: {`,
  ...Object.entries(frames).map(([k, v]) => `    '${k}': '${v}',`),
  `  },`,
  `  hands: {`,
  ...hands.map(
    (f) => `    '${f.name}': [${[f.hand.dx, f.hand.dy, ...(f.angle === undefined ? [] : [f.angle])].join(', ')}],`,
  ),
  `  },`,
  `} as const;`,
  '',
];
const outDir = join(root, 'src/game/art/hd/atlas');
mkdirSync(outDir, { recursive: true });
const out = join(outDir, `${name}Atlas.data.ts`);
writeFileSync(out, lines.join('\n'));
console.log(`${out}\n  ${meta.frames.length} quadros de ${cw}x${ch}, ${colors.length - 1} cores`);
