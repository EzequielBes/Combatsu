// Prancha da chama de energia amaldiçoada (`src/core/flame.ts` + `src/game/art/sprites/flame.ts`), sem abrir o jogo.
// Simula a chama num punho parado, depois num punho que dispara para a frente e para, e por fim apagando; grava os
// quadros lado a lado em .fable-out/chama-<cor>.png, a 4 px de tela por px de mundo (o jogo mostra a 1,5 ou 2).
// Uso, a partir da raiz do repo:  node tools/flame-preview.mjs [blue|red|white] [outDir]
import { mkdirSync, writeFileSync } from 'node:fs';
import { register } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { crc32, deflateSync } from 'node:zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const color = process.argv[2] ?? 'blue';
const outDir = resolve(process.argv[3] ?? join(root, '.fable-out'));
mkdirSync(outDir, { recursive: true });

const hookSrc = `export async function resolve(spec, ctx, next) {
  try { return await next(spec, ctx); } catch (e) {
    if (spec.startsWith('.') && !spec.endsWith('.ts')) return next(spec + '.ts', ctx);
    throw e;
  }
}`;
register('data:text/javascript,' + encodeURIComponent(hookSrc));
const src = (p) => import(pathToFileURL(join(root, 'src', p)).href);
const { FlameSim } = await src('core/flame.ts');
const { FLAME_FRAMES, flameFrame } = await src('game/art/sprites/flame.ts');
const { PALETTE, ART_SCALE } = await src('game/art/palette.ts');

const VIEW = { w: 110, h: 76 };
const SCALE = 4;
const PAD = 6;
const BG = 0x0e1326;
const SKIN = 0xf0c8a0;

/** Onde o punho está em cada instante (ms): parado, dispara 44 px em 80 ms, fica parado, e apaga aos 700 ms. */
const fistAt = (ms) => ({ x: 22 + Math.min(1, Math.max(0, (ms - 400) / 80)) * 44, y: 58 });
const LIT_UNTIL = 700;
const SHOTS = [60, 160, 300, 400, 430, 460, 480, 540, 660, 700, 760, 860];

function drawFrame(data, width, x0, y0, sim, fist, lit) {
  const put = (x, y, rgb) => {
    if (x < 0 || y < 0 || x >= VIEW.w || y >= VIEW.h) return;
    for (let dy = 0; dy < SCALE; dy++) {
      for (let dx = 0; dx < SCALE; dx++) {
        const i = ((y0 + y * SCALE + dy) * width + x0 + x * SCALE + dx) * 3;
        data[i] = rgb >> 16;
        data[i + 1] = (rgb >> 8) & 255;
        data[i + 2] = rgb & 255;
      }
    }
  };
  for (let y = 0; y < VIEW.h; y++) for (let x = 0; x < VIEW.w; x++) put(x, y, BG);
  // O punho, um bloco de pele de 6x6, por baixo da chama.
  if (lit)
    for (let y = -3; y < 3; y++) for (let x = -3; x < 3; x++) put(Math.round(fist.x) + x, Math.round(fist.y) + y, SKIN);
  const snap = (v) => Math.round(v / ART_SCALE) * ART_SCALE;
  for (const t of sim.tongues) {
    const grid = FLAME_FRAMES[flameFrame(color, t.stage, t.size)];
    const w = grid[0].length * ART_SCALE;
    const h = grid.length * ART_SCALE;
    // Origem (0,5; 1): a base da língua no ponto, como no `CursedFlame`.
    const left = snap(t.x) - w / 2;
    const top = snap(t.y) - h;
    grid.forEach((row, gy) =>
      [...row].forEach((ch, gx) => {
        if (ch === '.') return;
        for (let dy = 0; dy < ART_SCALE; dy++)
          for (let dx = 0; dx < ART_SCALE; dx++)
            put(Math.round(left) + gx * ART_SCALE + dx, Math.round(top) + gy * ART_SCALE + dy, PALETTE[ch]);
      }),
    );
  }
}

const cols = 6;
const rows = Math.ceil(SHOTS.length / cols);
const cellW = VIEW.w * SCALE + PAD;
const cellH = VIEW.h * SCALE + PAD;
const width = cols * cellW + PAD;
const height = rows * cellH + PAD;
const data = new Uint8Array(width * height * 3).fill(0x22);

const sim = new FlameSim(7);
let ms = 0;
SHOTS.forEach((shot, i) => {
  while (ms < shot) {
    ms += 1000 / 60;
    sim.tick(1000 / 60, ms <= LIT_UNTIL ? fistAt(ms) : null);
  }
  drawFrame(
    data,
    width,
    PAD + (i % cols) * cellW,
    PAD + Math.floor(i / cols) * cellH,
    sim,
    fistAt(ms),
    ms <= LIT_UNTIL,
  );
});

function chunk(type, body) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(body.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])), 0);
  return Buffer.concat([head, body, crc]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(width, 0);
ihdr.writeUInt32BE(height, 4);
ihdr[8] = 8;
ihdr[9] = 2;
const raw = Buffer.alloc((width * 3 + 1) * height);
for (let y = 0; y < height; y++) Buffer.from(data.buffer, y * width * 3, width * 3).copy(raw, y * (width * 3 + 1) + 1);
const file = join(outDir, `chama-${color}.png`);
writeFileSync(
  file,
  Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]),
);
console.log(file, `(${SHOTS.join(', ')} ms)`);
