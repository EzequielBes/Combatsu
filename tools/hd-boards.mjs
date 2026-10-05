// Pranchas do player HD (docs/plano-sprites-hd.md). Imagens de conferência, gravadas em .fable-out/ (não commitada).
//
// Sem argumentos, grava as pranchas gerais:
//   hd-prancha.png   o idle e o gancho ascendente a 4x sobre o céu noturno;
//   hd-rosto.png     a cabeça do idle e a do pico do gancho a 12x;
//   hd-silhueta.png  os mesmos quadros só com o contorno preenchido (teste nº 1: ler a pose pela silhueta);
//   hd-detalhe.png   a guarda, a antecipação e o pico a 8x, para conferir anatomia, mãos, pés e cabelo;
//   hd-tela.png      quatro quadros a 2x, como aparecem na tela (1 texel = 2 px), sobre claro e escuro.
//
// Com --frames, grava as pranchas de uma família de quadros, na ordem pedida:
//   node tools/hd-boards.mjs --frames run-,jump-,apex-0 --name locomocao [--detail run-0,run-3] [--out dir]
//   <name>.png           os quadros a 4x, 6 por linha (a ordem sai impressa no terminal);
//   <name>-silhueta.png  os mesmos em silhueta a 2x;
//   <name>-tela.png      os 8 primeiros a 2x sobre o céu e sobre a pedra;
//   <name>-detalhe.png   os quadros de --detail (até 4) a 8x.
// Cada item de --frames é um nome exato ou um prefixo (`jab@` pega a sequência inteira do golpe).
// Uso, a partir da raiz do repo.
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

const { renderHdPlayer, HD_STAGE } = await import(pathToFileURL(join(root, 'src/game/art/hd/player.ts')).href);
const { colors, frames, strikes } = renderHdPlayer();
const { w: FW, h: FH } = HD_STAGE;

const NIGHT = 0x1a2345;
const DEEP = 0x0e1326;
const STONE = 0x4a5780;
const INK = 0x0b0d1a;
const PAPER = 0xdfe0e6;

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
    // No Windows, um visualizador de imagens com o arquivo aberto trava a escrita.
    console.error(`Não foi possível gravar ${file} (arquivo aberto em outro programa?): ${e.code}`);
  }
}

const FULL = { x: 0, y: 0, w: FW, h: FH };

/** Desenha um recorte do quadro (em texels) na imagem, com `scale` px por texel; `solid` pinta tudo de uma cor. */
function blit(img, px, x0, y0, scale, crop = FULL, solid) {
  for (let y = 0; y < crop.h; y++) {
    for (let x = 0; x < crop.w; x++) {
      const idx = px[(crop.y + y) * FW + crop.x + x];
      if (idx !== 0) fill(img, x0 + x * scale, y0 + y * scale, scale, scale, solid ?? colors[idx]);
    }
  }
}

// ---------------------------------------------------------------- pranchas

/** Os quadros em grade: `cols` por linha, a `scale` px por texel. `solid` troca a pintura pela silhueta. */
function grid(name, keys, scale, cols, solid) {
  const pad = 8;
  const rows = Math.ceil(keys.length / cols);
  const img = image(cols * (FW * scale + pad) + pad, rows * (FH * scale + pad) + pad, solid ? PAPER : NIGHT);
  keys.forEach((key, i) => {
    const x0 = pad + (i % cols) * (FW * scale + pad);
    const y0 = pad + Math.floor(i / cols) * (FH * scale + pad);
    if (!solid) {
      fill(img, x0, y0, FW * scale, FH * scale, DEEP);
      fill(img, x0, y0 + (FH - 1) * scale, FW * scale, scale, STONE);
    }
    blit(img, frames[key], x0, y0, scale, FULL, solid);
    // Ponto de golpe em vermelho no pico do golpe.
    const move = key.endsWith('@active-0') ? key.slice(0, key.indexOf('@')) : undefined;
    const hit = move && strikes[`${move}-hit`];
    if (hit && !solid && scale >= 4)
      fill(img, x0 + hit.col * scale + 1, y0 + hit.row * scale + 1, scale - 2, scale - 2, 0xff3344);
  });
  savePng(name, img);
}

/** Quadros lado a lado com um recorte (em texels), a `scale` px por texel. */
function strip(name, items, scale, bg) {
  const pad = 8;
  const w = Math.max(...items.map((it) => it.crop.w));
  const h = Math.max(...items.map((it) => it.crop.h));
  const img = image(items.length * (w * scale + pad) + pad, h * scale + pad * 2, bg);
  items.forEach((it, i) => blit(img, frames[it.key], pad + i * (w * scale + pad), pad, scale, it.crop));
  savePng(name, img);
}

/** Como aparece na tela: 2 px por texel, sobre o céu escuro e sobre a pedra clara. */
function onScreen(name, keys) {
  const scale = 2;
  const img = image(keys.length * FW * scale, 2 * FH * scale, DEEP);
  fill(img, 0, FH * scale, img.w, FH * scale, STONE);
  keys.forEach((key, i) => {
    blit(img, frames[key], i * FW * scale, 0, scale);
    blit(img, frames[key], i * FW * scale, FH * scale, scale);
  });
  savePng(name, img);
}

/** Nomes pedidos em `--frames`: cada item casa por nome exato ou por prefixo, na ordem da folha. */
function select(list) {
  const all = Object.keys(frames);
  const out = [];
  for (const item of list.split(',')) {
    const found = all.filter((k) => k === item || k.startsWith(item));
    if (found.length === 0) console.error(`Nenhum quadro para '${item}'.`);
    for (const k of found) if (!out.includes(k)) out.push(k);
  }
  return out;
}

const BODY = { x: 8, y: 2, w: 66, h: 78 };

if (flag('frames')) {
  const name = flag('name') ?? 'familia';
  const keys = select(flag('frames'));
  console.log(`${keys.length} quadros, 6 por linha:\n  ${keys.join('\n  ')}`);
  grid(`${name}.png`, keys, 4, 6);
  grid(`${name}-silhueta.png`, keys, 2, 6, INK);
  onScreen(`${name}-tela.png`, keys.slice(0, 8));
  const detail = select(flag('detail') ?? keys.slice(0, 3).join(',')).slice(0, 4);
  strip(
    `${name}-detalhe.png`,
    detail.map((key) => ({ key, crop: BODY })),
    8,
    DEEP,
  );
} else {
  const seq = (move) => Object.keys(frames).filter((k) => k.startsWith(`${move}@`));
  const keys = [0, 1, 2, 3].map((i) => `idle-${i}`).concat(seq('ganchoAscendente'));
  grid('hd-prancha.png', keys, 4, 6);
  grid('hd-silhueta.png', keys, 2, 6, INK);
  const head = (key, x, y) => ({ key, crop: { x, y, w: 30, h: 30 } });
  strip('hd-rosto.png', [head('idle-0', 24, 12), head('ganchoAscendente@active-0', 26, 6)], 12, NIGHT);
  const body = (key) => ({ key, crop: { x: 14, y: 6, w: 52, h: 74 } });
  strip('hd-detalhe.png', ['idle-0', 'ganchoAscendente@startup-0', 'ganchoAscendente@active-0'].map(body), 8, DEEP);
  onScreen('hd-tela.png', [
    'idle-0',
    'ganchoAscendente@startup-0',
    'ganchoAscendente@active-0',
    'ganchoAscendente@recovery-1',
  ]);
}
