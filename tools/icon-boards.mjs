// Prancha dos ícones HD de técnica (`src/game/art/hd/techIcons.ts`). Imagem de conferência, gravada em .fable-out/
// (não commitada): uma coluna por ícone, com
//   linha 1  o ícone de 48 a 4x (para olhar texel por texel);
//   linha 2  o ícone de 24 a 8x;
//   linha 3  os dois no tamanho da tela: 48 e 24 a 1x e a 2x, sobre o fundo escuro do HUD e sobre a pedra clara.
// Com --fx, a prancha da folha `tech-fx-leva1` (`src/game/art/hd/fx/leva1Fx.ts`) sai junto, em fx-leva1.png:
//   linha 1  cada quadro a 8x;
//   linha 2  cada quadro a 1x, 2x e 4x sobre o fundo escuro do HUD, a pedra clara e o corpo do inimigo, o prego
//            também virado para a esquerda e 3 cabeças de prego lado a lado (a marca cheia);
//   e, para olhar em movimento, a tira fx-leva1-giro.png e o loop animado fx-leva1-anim.png (APNG).
// Uso, a partir da raiz do repo: node tools/icon-boards.mjs [--only id,id] [--out dir] [--name icones-tecnica] [--fx]
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

/** Linhas do RGB com o byte de filtro na frente, comprimidas (o miolo do IDAT). */
function encode(img) {
  const raw = Buffer.alloc((img.w * 3 + 1) * img.h);
  for (let y = 0; y < img.h; y++)
    Buffer.from(img.data.buffer, y * img.w * 3, img.w * 3).copy(raw, y * (img.w * 3 + 1) + 1);
  return deflateSync(raw);
}

/** Grava o PNG; com mais de uma imagem em `frames`, um APNG em loop com `ms` por quadro (o navegador anima). */
function savePng(name, img, frames = [img], ms = 125) {
  const u32 = (...v) => {
    const b = Buffer.alloc(v.length * 4);
    v.forEach((x, i) => b.writeUInt32BE(x, i * 4));
    return b;
  };
  const ihdr = Buffer.concat([u32(img.w, img.h), Buffer.from([8, 2, 0, 0, 0])]);
  const parts = [Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr)];
  if (frames.length > 1) {
    parts.push(chunk('acTL', u32(frames.length, 0)));
    let seq = 0;
    frames.forEach((f, i) => {
      const delay = Buffer.from([ms >> 8, ms & 255, 3, 232, 0, 0]);
      parts.push(chunk('fcTL', Buffer.concat([u32(seq++, img.w, img.h, 0, 0), delay])));
      parts.push(i === 0 ? chunk('IDAT', encode(f)) : chunk('fdAT', Buffer.concat([u32(seq++), encode(f)])));
    });
  } else parts.push(chunk('IDAT', encode(img)));
  parts.push(chunk('IEND', Buffer.alloc(0)));
  const file = join(outDir, name);
  try {
    writeFileSync(file, Buffer.concat(parts));
    console.log(file);
  } catch (e) {
    console.error(`Não foi possível gravar ${file} (arquivo aberto em outro programa?): ${e.code}`);
  }
}

/** Desenha o quadro `id` da folha em (x0, y0), a `scale` px por texel. */
function blit(img, sheet, id, x0, y0, scale, flip = false) {
  const px = sheet.frames[id];
  for (let y = 0; y < sheet.frameH; y++)
    for (let x = 0; x < sheet.frameW; x++) {
      const idx = px[y * sheet.frameW + (flip ? sheet.frameW - 1 - x : x)];
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

if (args.includes('--fx')) {
  const { LEVA1_FX_FRAMES, leva1FxSheet } = await import(
    pathToFileURL(join(root, 'src/game/art/hd/fx/leva1Fx.ts')).href
  );
  const fx = leva1FxSheet();
  const n = fx.frameW;
  const ENEMY = 0x8e7fa6;
  const fcell = n * 8;
  const strip = 16 + 32 + 64 + 3 * 8;
  const fimg = image(LEVA1_FX_FRAMES.length * (fcell + pad) + pad, pad * 3 + fcell + 3 * (64 + 8), BG);
  LEVA1_FX_FRAMES.forEach((id, i) => {
    const x0 = pad + i * (fcell + pad);
    fill(fimg, x0, pad, fcell, fcell, HUD);
    blit(fimg, fx, id, x0, pad, 8);
    for (const [k, bg] of [HUD, STONE, ENEMY].entries()) {
      const y = pad * 2 + fcell + k * (64 + 8);
      fill(fimg, x0, y, Math.max(fcell, strip), 64 + 4, bg);
      blit(fimg, fx, id, x0 + 2, y + 2, 1);
      blit(fimg, fx, id, x0 + 2 + n + 4, y + 2, 2);
      blit(fimg, fx, id, x0 + 2 + n * 3 + 8, y + 2, 4);
      if (id === 'nail') blit(fimg, fx, id, x0 + 2, y + 2 + n + 4, 2, true);
      if (id === 'nailHead') for (let m = 0; m < 3; m++) blit(fimg, fx, id, x0 + 2 + m * 14, y + 2 + n * 2, 1);
    }
  });
  savePng('fx-leva1.png', fimg);
  motionBoards(fx);
}

/**
 * O que só se julga em movimento: a tira do giro do atordoado (8 quadros seguidos, 2 voltas, a 8x e a 2x sobre o
 * inimigo) e da palma (palm-0, palm-1, vazio) em fx-leva1-giro.png, e o mesmo em loop animado (APNG, 125 ms por
 * quadro, abrir no navegador) em fx-leva1-anim.png.
 */
function motionBoards(fx) {
  const n = fx.frameW;
  const ENEMY = 0x8e7fa6;
  const stun = (t) => `stun-${t % 4}`;
  const palm = (t) => [null, 'palm-0', 'palm-0', 'palm-1', 'palm-1', null, null, null][t % 8];
  const strip = image(pad + 8 * (n * 8 + 4), pad * 3 + n * 8 * 2 + n * 2, BG);
  for (let t = 0; t < 8; t++) {
    const x = pad + t * (n * 8 + 4);
    fill(strip, x, pad, n * 8, n * 8, HUD);
    blit(strip, fx, stun(t), x, pad, 8);
    fill(strip, x, pad * 2 + n * 8, n * 8, n * 2, ENEMY);
    blit(strip, fx, stun(t), x + n * 3, pad * 2 + n * 8, 2);
    const y = pad * 3 + n * 10;
    fill(strip, x, y, n * 8, n * 8, HUD);
    if (palm(t)) blit(strip, fx, palm(t), x, y, 8);
  }
  savePng('fx-leva1-giro.png', strip);
  const frames = [];
  for (let t = 0; t < 16; t++) {
    const f = image(pad * 4 + n * 4 * 2 + n * 2, pad * 2 + n * 4, HUD);
    blit(f, fx, stun(t), pad, pad, 4);
    fill(f, pad * 2 + n * 4, pad, n * 2, n * 2, ENEMY);
    blit(f, fx, stun(t), pad * 2 + n * 4, pad, 2);
    if (palm(t)) blit(f, fx, palm(t), pad * 3 + n * 6, pad, 4);
    frames.push(f);
  }
  savePng('fx-leva1-anim.png', frames[0], frames);
}
