// Pranchas de uma folha HD qualquer (`HdSheet`: quadros indexados de mesmo tamanho), chamadas pelo
// `tools/hd-boards.mjs --sheet`. Imagens de conferência, gravadas em .fable-out/ (não commitada).
//
//   node tools/hd-boards.mjs --sheet src/game/art/hd/fx/dogsSheet.ts:dogsSheet --name caes [--seq run-] [--out dir]
//   <name>.png          todos os quadros a 8x, 6 por linha (a ordem sai impressa no terminal), com a linha do chão;
//   <name>-ciclo.png    só com --seq: a sequência a 8x virada para a direita, espelhada, em escala 1,5 (vizinho mais
//                       próximo, como o Phaser com pixelArt) e em casca de cebola (o quadro anterior em fantasma
//                       atrás do atual), para ver a continuidade de cada membro de um quadro para o outro;
//   <name>-tela.png     como aparece na tela (câmera com zoom 2: 1 texel = 2 px): com --seq, uma fila de 5 em fases
//                       diferentes para cada lado e a escala 1,5; sem --seq, os quadros; sobre o céu e sobre a pedra.
// Cada pedaço de --sheet é `<arquivo .ts>:<função que devolve a folha>`.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { crc32, deflateSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const outDir = resolve(flag('out') ?? join(root, '.fable-out'));
mkdirSync(outDir, { recursive: true });

const [file, fn] = flag('sheet').split(':');
const mod = await import(pathToFileURL(join(root, file)).href);
const sheet = mod[fn]();
const { frameW: FW, frameH: FH, colors } = sheet;
const names = Object.keys(sheet.frames);
const name = flag('name') ?? fn;

const SKY = 0x1a2345;
const DEEP = 0x0e1326;
const STONE = 0x4a5780;
const WALL = 0x7584ad;
const GHOST = 0xd9822b;
const PAD = 8;

// ---------------------------------------------------------------- imagem e PNG

function image(w, h, bg) {
  const img = { w, h, data: new Uint8Array(w * h * 3) };
  fill(img, 0, 0, w, h, bg);
  return img;
}

function fill(img, x0, y0, w, h, rgb) {
  for (let y = Math.max(0, y0); y < Math.min(img.h, y0 + h); y++)
    for (let x = Math.max(0, x0); x < Math.min(img.w, x0 + w); x++) {
      const i = (y * img.w + x) * 3;
      img.data[i] = rgb >> 16;
      img.data[i + 1] = (rgb >> 8) & 255;
      img.data[i + 2] = rgb & 255;
    }
}

function chunk(type, body) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(body.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])), 0);
  return Buffer.concat([head, body, crc]);
}

function savePng(file, img) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(img.w, 0);
  ihdr.writeUInt32BE(img.h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const raw = Buffer.alloc((img.w * 3 + 1) * img.h);
  for (let y = 0; y < img.h; y++)
    Buffer.from(img.data.buffer, y * img.w * 3, img.w * 3).copy(raw, y * (img.w * 3 + 1) + 1);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const path = join(outDir, file);
  try {
    writeFileSync(
      path,
      Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]),
    );
    console.log(path);
  } catch (e) {
    console.error(`Não foi possível gravar ${path} (arquivo aberto em outro programa?): ${e.code}`);
  }
}

// ---------------------------------------------------------------- desenho

/**
 * O quadro na imagem com o canto em (x0, y0): `scale` px de tela por texel (pode ser fracionário: cada px de tela lê
 * o texel do vizinho mais próximo), espelhado com `flip`, todo numa cor só com `solid`.
 */
function blit(img, key, x0, y0, scale, { flip = false, solid } = {}) {
  const px = sheet.frames[key];
  const w = Math.round(FW * scale);
  const h = Math.round(FH * scale);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const tx = Math.min(FW - 1, Math.floor(x / scale));
      const idx = px[Math.min(FH - 1, Math.floor(y / scale)) * FW + (flip ? FW - 1 - tx : tx)];
      if (idx !== 0) fill(img, x0 + x, y0 + y, 1, 1, solid ?? colors[idx]);
    }
}

/** Célula de quadro: o fundo, a linha do chão logo abaixo do quadro e o quadro. */
function cell(img, x0, y0, w, h, draw) {
  fill(img, x0, y0, w, h, DEEP);
  fill(img, x0, y0 + h, w, 2, STONE);
  draw();
}

function grid(file, keys, scale, cols) {
  const cw = FW * scale;
  const ch = FH * scale;
  const rows = Math.ceil(keys.length / cols);
  const img = image(cols * (cw + PAD) + PAD, rows * (ch + PAD + 2) + PAD, SKY);
  keys.forEach((key, i) => {
    const x0 = PAD + (i % cols) * (cw + PAD);
    const y0 = PAD + Math.floor(i / cols) * (ch + PAD + 2);
    cell(img, x0, y0, cw, ch, () => blit(img, key, x0, y0, scale));
  });
  savePng(file, img);
}

/** As linhas da prancha do ciclo, cada uma com a sequência inteira. */
function cycle(file, seq) {
  const s = 8;
  const cw = FW * s;
  const ch = FH * s;
  const img = image(seq.length * (cw + PAD) + PAD, 4 * (ch + PAD + 2) + PAD, SKY);
  const rows = [
    (key, x, y) => blit(img, key, x, y, s),
    (key, x, y) => blit(img, key, x, y, s, { flip: true }),
    (key, x, y) => blit(img, key, x, y, 6),
    (key, x, y, i) => {
      blit(img, seq[(i + seq.length - 1) % seq.length], x, y, s, { solid: GHOST });
      blit(img, key, x, y, s);
    },
  ];
  rows.forEach((draw, r) => {
    seq.forEach((key, i) => {
      const x0 = PAD + i * (cw + PAD);
      const y0 = PAD + r * (ch + PAD + 2);
      const scaled = r === 2;
      const dy = ch - (scaled ? FH * 6 : FH * s);
      cell(img, x0, y0, cw, ch, () => draw(key, x0, y0 + dy, i));
      if (scaled) fill(img, x0, y0, 3, 3, 0xffc857);
    });
  });
  savePng(file, img);
}

/** Na tela: 2 px por texel (3 para a escala 1,5), uma faixa sobre o céu e outra sobre a pedra. */
function onScreen(file, seq) {
  const band = FH * 3 + 2 * PAD;
  const items = seq
    ? [
        ...[0, 1, 2, 3, 0].map((f, i) => ({ key: seq[(f + i) % seq.length], x: i * (FW * 2 - 14), s: 2 })),
        ...[2, 3, 0, 1, 2].map((f, i) => ({
          key: seq[(f + i) % seq.length],
          x: FW * 2 * 6 + i * (FW * 2 - 14),
          s: 2,
          flip: true,
        })),
        { key: seq[0], x: FW * 2 * 12, s: 3 },
        { key: seq[2], x: FW * 2 * 12 + FW * 3 + PAD, s: 3, flip: true },
      ]
    : names.map((key, i) => ({ key, x: i * (FW * 2 + PAD), s: 2 }));
  const w = Math.max(...items.map((it) => it.x + FW * it.s)) + 2 * PAD;
  const img = image(w, 3 * band, SKY);
  fill(img, 0, band, w, band, STONE);
  fill(img, 0, 2 * band, w, band, WALL);
  for (let b = 0; b < 3; b++)
    for (const it of items) {
      const y0 = b * band + band - PAD - Math.round(FH * it.s);
      blit(img, it.key, PAD + it.x, y0, it.s, { flip: it.flip });
    }
  savePng(file, img);
}

const prefix = flag('seq');
const seq = prefix ? names.filter((k) => k.startsWith(prefix)) : undefined;
console.log(`${names.length} quadros de ${FW}x${FH}, 6 por linha:\n  ${names.join('\n  ')}`);
grid(`${name}.png`, names, 8, 6);
if (seq?.length) cycle(`${name}-ciclo.png`, seq);
onScreen(`${name}-tela.png`, seq?.length ? seq : undefined);
