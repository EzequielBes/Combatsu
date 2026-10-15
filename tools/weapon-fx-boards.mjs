// Prancha dos efeitos HD das armas imbuídas (src/game/art/hd/weaponFx/). Imagem de conferência, gravada em
// .fable-out/ (não commitada):
//   armas-fx.png       cada folha numa linha, quadro a quadro a 6x, com o texel de ancoragem marcado em vermelho;
//   armas-fx-tela.png  as mesmas sequências a 2x (como na tela, zoom 2) sobre o céu noturno e sobre a pedra clara;
//   armas-fx-escala.png o quadro cheio do rastro e o 1º do impacto sobre o player HD num golpe, a 3x, para a escala
//                       (a posição é aproximada: prender o efeito ao golpe é da F36);
//   armas-fx-amaldicoado.png os 3 primeiros quadros do impacto a 3x, sozinhos e por cima de um arremedo do
//                       lampejo amaldiçoado (a estrela de 4 pontas do cursedImpact, no quadro parado do hitstop),
//                       para ver se a arma soma ao impacto de hoje sem poluir.
// Uso, a partir da raiz do repo: node tools/weapon-fx-boards.mjs [--out dir]
import { mkdirSync, writeFileSync } from 'node:fs';
import { register } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { crc32, deflateSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const outFlag = args.indexOf('--out');
const outDir = resolve(outFlag >= 0 ? args[outFlag + 1] : join(root, '.fable-out'));
mkdirSync(outDir, { recursive: true });

const hookSrc = `export async function resolve(spec, ctx, next) {
  try { return await next(spec, ctx); } catch (e) {
    if (spec.startsWith('.') && !spec.endsWith('.ts')) return next(spec + '.ts', ctx);
    throw e;
  }
}`;
register('data:text/javascript,' + encodeURIComponent(hookSrc));

const load = (path) => import(pathToFileURL(join(root, path)).href);
const { WEAPON_FX } = await load('src/game/art/hd/weaponFx/index.ts');
const { PALETTE } = await load('src/game/art/palette.ts');
const { renderHdPlayer, HD_STAGE } = await load('src/game/art/hd/player.ts');

const NIGHT = 0x1a2345;
const DEEP = 0x0e1326;
const STONE = 0x7584ad;
const PAPER = 0xdfe0e6;

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

function savePng(name, img) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(img.w, 0);
  ihdr.writeUInt32BE(img.h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const raw = Buffer.alloc((img.w * 3 + 1) * img.h);
  for (let y = 0; y < img.h; y++)
    Buffer.from(img.data.buffer, y * img.w * 3, img.w * 3).copy(raw, y * (img.w * 3 + 1) + 1);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const file = join(outDir, name);
  writeFileSync(
    file,
    Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]),
  );
  console.log(file);
}

function blit(img, rows, x0, y0, scale) {
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch !== '.') fill(img, x0 + x * scale, y0 + y * scale, scale, scale, PALETTE[ch]);
    }),
  );
}

/** Todas as folhas: [rótulo, quadros (lista de grades), âncora]. */
const sheets = Object.entries(WEAPON_FX).flatMap(([weapon, art]) =>
  ['trail', 'impact', 'charge']
    .filter((part) => art[part])
    .map((part) => [`${weapon}-${part}`, Object.values(art[part].frames), art[part].anchor]),
);

function board(name, scale, bgs, marks) {
  const pad = 6;
  const cellW = (rows) => rows[0].length * scale;
  const widths = sheets.map(([, frames]) => frames.length * (cellW(frames[0]) + pad) * bgs.length + pad * bgs.length);
  const heights = sheets.map(([, frames]) => frames[0].length * scale + pad);
  const img = image(
    Math.max(...widths) + pad,
    heights.reduce((a, b) => a + b, pad),
    PAPER,
  );
  let y = pad;
  sheets.forEach(([label, frames, anchor], s) => {
    let x = pad;
    for (const bg of bgs) {
      for (const rows of frames) {
        fill(img, x, y, cellW(rows), rows.length * scale, bg);
        blit(img, rows, x, y, scale);
        if (marks) fill(img, x + anchor.x * scale + 2, y + anchor.y * scale + 2, scale - 4, scale - 4, 0xff3344);
        x += cellW(rows) + pad;
      }
      x += pad;
    }
    console.log(`${label}: ${frames.length} quadros de ${frames[0][0].length}x${frames[0].length}`);
    y += heights[s];
  });
  savePng(name, img);
}

board('armas-fx.png', 6, [DEEP], true);
board('armas-fx-tela.png', 2, [NIGHT, STONE], false);

/** Golpe de referência de cada arma e onde fica o centro do rastro em relação ao ponto do golpe (aproximado). */
const SCALE_CASES = [
  ['lamina', 'direto', { x: -15, y: 0 }],
  ['bastao', 'gancho', { x: -14, y: 8 }],
  ['lanca', 'contra', { x: -34, y: 10 }],
  ['osso', 'palmaExplosiva', { x: -20, y: 2 }],
];

function scaleBoard() {
  const scale = 3;
  const { colors, frames, strikes } = renderHdPlayer();
  const { w, h } = HD_STAGE;
  const cellW = (w + 40) * scale;
  const img = image(SCALE_CASES.length * (cellW + 6) + 6, h * scale + 12, PAPER);
  SCALE_CASES.forEach(([weapon, move, pivot], i) => {
    const x0 = 6 + i * (cellW + 6);
    fill(img, x0, 6, cellW, h * scale, NIGHT);
    const px = frames[`${move}@active-0`];
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const idx = px[y * w + x];
        if (idx) fill(img, x0 + x * scale, 6 + y * scale, scale, scale, colors[idx]);
      }
    const hit = strikes[`${move}-hit`];
    const art = WEAPON_FX[weapon];
    const trail = art.trail.frames['trail-1'];
    const impact = art.impact.frames['impact-0'];
    const tx = hit.col + pivot.x - art.trail.anchor.x;
    const ty = hit.row + pivot.y - art.trail.anchor.y;
    blit(img, trail, x0 + tx * scale, 6 + ty * scale, scale);
    const ix = hit.col + 8 - art.impact.anchor.x;
    const iy = hit.row - art.impact.anchor.y;
    blit(img, impact, x0 + ix * scale, 6 + iy * scale, scale);
  });
  savePng('armas-fx-escala.png', img);
}

scaleBoard();

/** Losango de `len` no eixo e `half` de largura, em volta de (cx, cy), no ângulo `ang` (a ponta da estrela). */
function diamond(img, x0, y0, scale, cx, cy, ang, len, half, rgb) {
  const r = Math.ceil(Math.max(len, half));
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++) {
      const along = Math.abs(x * Math.cos(ang) + y * Math.sin(ang));
      const across = Math.abs(-x * Math.sin(ang) + y * Math.cos(ang));
      if (along / len + across / half <= 1) fill(img, x0 + (cx + x) * scale, y0 + (cy + y) * scale, scale, scale, rgb);
    }
}

/** Arremedo do lampejo amaldiçoado parado do hitstop: o eixo longo atravessa o golpe, com sombra, corpo e miolo. */
function cursedStar(img, x0, y0, scale, cx, cy) {
  const size = 11;
  const half = Math.max(1, size * 0.2);
  const arms = [
    [Math.PI / 2, size],
    [0, size * 0.55],
  ];
  const layers = [
    [2, 2, PALETTE.d],
    [0, 0, PALETTE.c],
  ];
  for (const [dl, dh, rgb] of layers)
    for (const [ang, len] of arms) diamond(img, x0, y0, scale, cx, cy, ang, len + dl, half + dh, rgb);
  for (const [ang, len] of arms) diamond(img, x0, y0, scale, cx, cy, ang, len * 0.68, half * 0.5, PALETTE.C);
}

function cursedBoard() {
  const scale = 3;
  const pad = 6;
  const rowsOf = Object.entries(WEAPON_FX).map(([, art]) => art.impact);
  const cell = 40 * scale;
  const img = image(pad + 6 * (cell + pad) + pad, pad + rowsOf.length * (cell + pad), PAPER);
  rowsOf.forEach((sheet, r) => {
    const frames = Object.values(sheet.frames).slice(0, 3);
    const y0 = pad + r * (cell + pad);
    [false, true].forEach((under, k) =>
      frames.forEach((rows, f) => {
        const x0 = pad + (k * 3 + f) * (cell + pad) + k * pad;
        fill(img, x0, y0, cell, cell, NIGHT);
        const ox = Math.floor((40 - rows[0].length) / 2);
        const oy = Math.floor((40 - rows.length) / 2);
        if (under && f === 0) cursedStar(img, x0, y0, scale, ox + sheet.anchor.x, oy + sheet.anchor.y);
        blit(img, rows, x0 + ox * scale, y0 + oy * scale, scale);
      }),
    );
  });
  savePng('armas-fx-amaldicoado.png', img);
}

cursedBoard();
