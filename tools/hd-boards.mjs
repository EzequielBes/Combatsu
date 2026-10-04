// Pranchas do player HD (fase 1 de docs/plano-sprites-hd.md). Grava em .fable-out/ (não commitada):
//   hd-prancha.png   os 12 quadros (idle em cima, gancho embaixo) a 4x sobre o céu noturno;
//   hd-rosto.png     a cabeça do idle e a do pico do gancho a 12x;
//   hd-silhueta.png  os mesmos 12 quadros só com o contorno preenchido (teste nº 1: ler a pose pela silhueta);
//   hd-detalhe.png   a guarda, a antecipação e o pico a 8x, para conferir anatomia, mãos, pés e cabelo;
//   hd-tela.png      idle e pico do gancho a 2x, como aparecem na tela (1 texel = 2 px), sobre claro e escuro.
// Uso, a partir da raiz do repo:  node tools/hd-boards.mjs [outDir]
import { mkdirSync, writeFileSync } from 'node:fs';
import { register } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { crc32, deflateSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(process.argv[2] ?? join(root, '.fable-out'));
mkdirSync(outDir, { recursive: true });

const hookSrc = `export async function resolve(spec, ctx, next) {
  try { return await next(spec, ctx); } catch (e) {
    if (spec.startsWith('.') && !spec.endsWith('.ts')) return next(spec + '.ts', ctx);
    throw e;
  }
}`;
register('data:text/javascript,' + encodeURIComponent(hookSrc));

const { renderHdPlayer, HD_STAGE } = await import(pathToFileURL(join(root, 'src/game/art/hd/player.ts')).href);
const { colors, frames, strikes } = renderHdPlayer();
const { w: FW, h: FH } = HD_STAGE;

const NIGHT = 0x1a2345;
const DEEP = 0x0e1326;
const STONE = 0x4a5780;

// ---------------------------------------------------------------- imagem e PNG

function image(w, h, bg) {
  const data = new Uint8Array(w * h * 3);
  for (let i = 0; i < w * h; i++) put(data, i, bg);
  return { w, h, data };
}

function put(data, i, rgb) {
  data[i * 3] = rgb >> 16;
  data[i * 3 + 1] = (rgb >> 8) & 255;
  data[i * 3 + 2] = rgb & 255;
}

function fill(img, x0, y0, w, h, rgb) {
  for (let y = Math.max(0, y0); y < Math.min(img.h, y0 + h); y++)
    for (let x = Math.max(0, x0); x < Math.min(img.w, x0 + w); x++) put(img.data, y * img.w + x, rgb);
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

/** Desenha um recorte do quadro (em texels) na imagem, com `scale` px por texel; `solid` pinta tudo de uma cor. */
function blit(img, px, x0, y0, scale, crop = { x: 0, y: 0, w: FW, h: FH }, solid) {
  for (let y = 0; y < crop.h; y++) {
    for (let x = 0; x < crop.w; x++) {
      const idx = px[(crop.y + y) * FW + crop.x + x];
      if (idx !== 0) fill(img, x0 + x * scale, y0 + y * scale, scale, scale, solid ?? colors[idx]);
    }
  }
}

// ---------------------------------------------------------------- pranchas

const idle = [0, 1, 2, 3].map((i) => `hd-idle-${i}`);
const gancho = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => `hd-gancho-${i}`);

function sheet(name, scale, solid) {
  const pad = 8;
  const cols = 6;
  const keys = [...idle, ...gancho];
  const img = image(cols * (FW * scale + pad) + pad, 2 * (FH * scale + pad) + pad, solid ? 0xdfe0e6 : NIGHT);
  keys.forEach((key, i) => {
    const x0 = pad + (i % cols) * (FW * scale + pad);
    const y0 = pad + Math.floor(i / cols) * (FH * scale + pad);
    if (!solid) {
      fill(img, x0, y0, FW * scale, FH * scale, DEEP);
      fill(img, x0, y0 + (FH - 1) * scale, FW * scale, scale, STONE);
    }
    blit(img, frames[key], x0, y0, scale, undefined, solid);
    if (!solid && key === 'hd-gancho-2') {
      const hit = strikes['ganchoAscendente-hit'];
      fill(img, x0 + hit.col * scale + 1, y0 + hit.row * scale + 1, scale - 2, scale - 2, 0xff3344);
    }
  });
  savePng(name, img);
}

sheet('hd-prancha.png', 4);
sheet('hd-silhueta.png', 2, 0x0b0d1a);

// Rosto a 12x: recorte de 30x30 em volta da cabeça do idle e do pico do gancho.
{
  const scale = 12;
  const crop = (key, x, y) => ({ key, crop: { x, y, w: 30, h: 30 } });
  const heads = [crop('hd-idle-0', 24, 12), crop('hd-gancho-2', 26, 6)];
  const img = image(heads.length * (30 * scale + 8) + 8, 30 * scale + 16, NIGHT);
  heads.forEach((h, i) => blit(img, frames[h.key], 8 + i * (30 * scale + 8), 8, scale, h.crop));
  savePng('hd-rosto.png', img);
}

// Como aparece na tela: 2 px por texel, sobre o céu escuro e sobre a pedra clara.
{
  const scale = 2;
  const keys = ['hd-idle-0', 'hd-gancho-0', 'hd-gancho-2', 'hd-gancho-5'];
  const img = image(keys.length * FW * scale, 2 * FH * scale, DEEP);
  fill(img, 0, FH * scale, img.w, FH * scale, STONE);
  keys.forEach((key, i) => {
    blit(img, frames[key], i * FW * scale, 0, scale);
    blit(img, frames[key], i * FW * scale, FH * scale, scale);
  });
  savePng('hd-tela.png', img);
}

// Detalhe a 8x: a guarda, a antecipação e o pico, para conferir anatomia, mãos, pés e cabelo.
{
  const scale = 8;
  const crop = { x: 14, y: 6, w: 52, h: 74 };
  const keys = ['hd-idle-0', 'hd-gancho-0', 'hd-gancho-2'];
  const img = image(keys.length * (crop.w * scale + 8) + 8, crop.h * scale + 16, DEEP);
  keys.forEach((key, i) => blit(img, frames[key], 8 + i * (crop.w * scale + 8), 8, scale, crop));
  savePng('hd-detalhe.png', img);
}
