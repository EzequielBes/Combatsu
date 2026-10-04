// Prancha do boneco articulado (spike boneco-articulado, RIG-08). Grava três PNGs (escala em SPRITE_SCALE, padrão 4x):
//   compare.png: em cima os 3 frames atuais do ganchoAscendente, embaixo os 3 do boneco (quadrado vermelho = ponto de golpe);
//   strip.png: a sequência de quadros do boneco (antecipação, wind, hit, overshoot, recover);
//   idle-compare.png: o `idle-0` desenhado à mão ao lado do idle do boneco (calibração do corpo).
// Uso, a partir da raiz do repo:  node tools/rig-preview.mjs [outDir]
// Os .ts são importados em Node com um hook de resolução; o desenho roda no Edge via puppeteer-core.
import { existsSync, mkdirSync } from 'node:fs';
import { register } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(process.argv[2] ?? join(root, 'docs', 'art', 'rig'));
mkdirSync(outDir, { recursive: true });

const hookSrc = `export async function resolve(spec, ctx, next) {
  try { return await next(spec, ctx); } catch (e) {
    if (spec.startsWith('.') && !spec.endsWith('.ts')) return next(spec + '.ts', ctx);
    throw e;
  }
}`;
register('data:text/javascript,' + encodeURIComponent(hookSrc));

const src = (p) => import(pathToFileURL(join(root, 'src', p)).href);
const { PALETTE } = await src('game/art/palette.ts');
const { PLAYER_MOVE_FRAMES } = await src('game/art/sprites/playerMoves.ts');
const { RIG_GANCHO_FRAMES, RIG_GANCHO_SEQUENCE, RIG_GANCHO_STRIKE } = await src('game/art/rig/poses/ganchoAscendente.ts');
const { PLAYER_FRAMES } = await src('game/art/sprites/player.ts');
const { rasterize } = await src('game/art/rig/rasterize.ts');
const { POSE_IDLE } = await src('game/art/rig/poses/idle.ts');
const { DEFAULT_EDGE_PATHS, findEdge } = await import(pathToFileURL(join(root, 'scripts', 'smoke', 'lib.ts')).href);

const NAMES = ['ganchoAscendente-wind', 'ganchoAscendente-hit', 'ganchoAscendente-recover'];
const current = NAMES.map((n) => ({ name: 'atual ' + n.split('-')[1], rows: PLAYER_MOVE_FRAMES[n] }));
const rig = NAMES.map((n) => ({ name: 'boneco ' + n.split('-')[1], rows: RIG_GANCHO_FRAMES[n] }));
rig[1].mark = RIG_GANCHO_STRIKE;
const strip = RIG_GANCHO_SEQUENCE.map((r, i) => ({ name: String(i + 1), rows: r.frame }));

const idleCompare = [
  { name: 'idle-0 desenhado', rows: PLAYER_FRAMES['idle-0'] },
  { name: 'idle do boneco', rows: rasterize(POSE_IDLE).frame },
];

const edge = findEdge(process.env.EDGE_PATH, DEFAULT_EDGE_PATHS, existsSync);
if (!edge) {
  console.error('Edge não encontrado (defina EDGE_PATH).');
  process.exit(2);
}

const pageFn = (data) => {
  const S = data.scale, BG = '#2a3863', cw = 32 * S + 8, ch = 30 * S + 22;
  const hex = (n) => '#' + n.toString(16).padStart(6, '0');
  const board = (id, lines) => {
    const cols = Math.max(...lines.map((r) => r.length));
    const cv = document.createElement('canvas');
    cv.id = id; cv.width = cols * cw; cv.height = lines.length * ch;
    document.body.appendChild(cv);
    const ctx = cv.getContext('2d');
    ctx.fillStyle = BG; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.font = '12px monospace'; ctx.textBaseline = 'top';
    lines.forEach((frames, ry) => frames.forEach((f, cx) => {
      const x = cx * cw + 4, y = ry * ch + 2;
      ctx.strokeStyle = '#4a5780'; ctx.strokeRect(x - 3.5, y - 1.5, cw - 1, ch - 1);
      f.rows.forEach((row, j) => [...row].forEach((c, i) => {
        if (c === '.') return;
        ctx.fillStyle = hex(data.palette[c]); ctx.fillRect(x + i * S, y + j * S, S, S);
      }));
      ctx.fillStyle = '#fff'; ctx.fillText(f.name, x, y + 30 * S + 3);
      if (f.mark) { ctx.strokeStyle = '#ff3344'; ctx.lineWidth = 1; ctx.strokeRect(x + f.mark.col * S + 0.5, y + f.mark.row * S + 0.5, S - 1, S - 1); }
    }));
  };
  board('compare', [data.current, data.rig]);
  board('strip', [data.strip]);
  board('idle-compare', [data.idleCompare]);
};

const browser = await puppeteer.launch({ executablePath: edge, headless: true });
try {
  const page = await browser.newPage();
  await page.setContent('<body style="margin:0;background:#000"></body>');
  await page.evaluate(pageFn, { palette: PALETTE, current, rig, strip, idleCompare, scale: Number(process.env.SPRITE_SCALE) || 4 });
  for (const id of ['compare', 'strip', 'idle-compare']) {
    await (await page.$('#' + id)).screenshot({ path: join(outDir, id + '.png') });
    console.log('  ' + join(outDir, id + '.png'));
  }
} finally {
  await browser.close();
}
