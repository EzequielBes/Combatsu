// Prancha dos ícones HD de técnica (`src/game/art/hd/techIcons.ts`). Imagem de conferência, gravada em .fable-out/
// (não commitada): uma coluna por ícone, com
//   linha 1  o ícone de 48 a 4x (para olhar texel por texel);
//   linha 2  o ícone de 24 a 8x;
//   linha 3  os dois no tamanho da tela: 48 e 24 a 1x e a 2x, sobre o fundo escuro do HUD e sobre a pedra clara.
// Uso, a partir da raiz do repo: node tools/icon-boards.mjs [--only id,id] [--out dir] [--name icones-tecnica]
import { mkdirSync, writeFileSync } from 'node:fs';
import { register } from 'node:module';
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

const hookSrc = `export async function resolve(spec, ctx, next) {
  try { return await next(spec, ctx); } catch (e) {
    if (spec.startsWith('.') && !spec.endsWith('.ts')) return next(spec + '.ts', ctx);
    throw e;
  }
}`;
register('data:text/javascript,' + encodeURIComponent(hookSrc));

const { TECH_ICON_IDS, techIconSheet } = await import(pathToFileURL(join(root, 'src/game/art/hd/techIcons.ts')).href);

const BG = 0x1a2345;
const HUD = 0x0e1326;
const STONE = 0x7584ad;

function image(w, h, bg) {
  const data = new Uint8Array(w * h * 3);
  const img = { w, h, data };
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
  const png = Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  try {
    writeFileSync(file, png);
    console.log(file);
  } catch (e) {
    console.error(`Não foi possível gravar ${file} (arquivo aberto em outro programa?): ${e.code}`);
  }
}

/** Desenha o quadro `id` da folha em (x0, y0), a `scale` px por texel. */
function blit(img, sheet, id, x0, y0, scale) {
  const px = sheet.frames[id];
  for (let y = 0; y < sheet.frameH; y++)
    for (let x = 0; x < sheet.frameW; x++) {
      const idx = px[y * sheet.frameW + x];
      if (idx !== 0) fill(img, x0 + x * scale, y0 + y * scale, scale, scale, sheet.colors[idx]);
    }
}

const IDS = flag('only') ? flag('only').split(',') : TECH_ICON_IDS;
const big = techIconSheet(48);
const small = techIconSheet(24);
const pad = 12;
const cell = 192;
const row3 = 2 * (48 * 2 + 4);
const img = image(IDS.length * (cell + pad) + pad, pad + cell + pad + cell + pad + row3 + pad, BG);
IDS.forEach((id, i) => {
  const x0 = pad + i * (cell + pad);
  blit(img, big, id, x0, pad, 4);
  blit(img, small, id, x0, pad * 2 + cell, 8);
  const y3 = pad * 3 + cell * 2;
  for (const [k, bg] of [HUD, STONE].entries()) {
    const y = y3 + k * (48 * 2 + 4);
    fill(img, x0, y, cell, 48 * 2 + 4, bg);
    blit(img, big, id, x0 + 2, y + 2, 1);
    blit(img, small, id, x0 + 52, y + 2, 1);
    blit(img, big, id, x0 + 78, y + 2, 2);
  }
  // O de 24 a 2x (o tamanho do slot), embaixo do de 48 a 1x.
  blit(img, small, id, x0 + 2, y3 + 54, 2);
  blit(img, small, id, x0 + 2, y3 + 100 + 54, 2);
});
savePng(`${flag('name') ?? 'icones-tecnica'}.png`, img);
