// Estudo de proporções do boneco articulado (spike boneco-articulado). Grava, em escala SPRITE_SCALE (padrão 6x):
//   estudo.png: 4 colunas (idle-0 desenhado atual, heroico, semi, inter) x 2 linhas (idle e pico do gancho);
//   tira-heroico.png, tira-semi.png, tira-inter.png: os 12 quadros do gancho de cada preset;
//   escala.png: cada preset parado ao lado de um inimigo atual (idle da aparência `corcunda`), na mesma escala.
// Uso, a partir da raiz do repo:  node tools/rig-study.mjs [outDir]
import { existsSync, mkdirSync } from 'node:fs';
import { register } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(process.argv[2] ?? join(root, 'docs', 'art', 'rig', 'proporcoes'));
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
const { PLAYER_FRAMES } = await src('game/art/sprites/player.ts');
const { PLAYER_MOVE_FRAMES } = await src('game/art/sprites/playerMoves.ts');
const { ENEMY_VARIANT_FRAMES } = await src('game/art/sprites/enemy.ts');
const { PRESETS } = await src('game/art/rig/presets.ts');
const { DEFAULT_TUNING, uppercutFor, reachShortfall } = await src('game/art/rig/poses/uppercut.ts');
const { TUNINGS, MIN_STRIKE } = await src('game/art/rig/poses/tunings.ts');
const { rasterize } = await src('game/art/rig/rasterize.ts');
const { headOf } = await src('game/art/rig/presets.ts');
const { CHIBI } = await src('game/art/rig/skeleton.ts');
const { DEFAULT_EDGE_PATHS, findEdge } = await import(pathToFileURL(join(root, 'scripts', 'smoke', 'lib.ts')).href);

const sets = PRESETS.map((b) => uppercutFor(b, TUNINGS[b.name]));
const letter = ['A', 'B', 'C'];
const label = (i) => `${letter[i]} ${sets[i].body.name} ${sets[i].body.height}`;

const idleDrawn = { name: 'idle-0 atual', rows: PLAYER_FRAMES['idle-0'] };
const hitDrawn = { name: 'gancho atual (hit)', rows: PLAYER_MOVE_FRAMES['ganchoAscendente-hit'] };
const estudo = [
  [idleDrawn, ...sets.map((s, i) => ({ name: label(i) + ' idle', rows: rasterize(s.idle).frame }))],
  [hitDrawn, ...sets.map((s, i) => ({ name: label(i) + ' hit', rows: s.frames.hit.frame, mark: s.strike }))],
];
const tiras = sets.map((s) => ({
  id: 'tira-' + s.body.name,
  lines: [0, 6].map((o) =>
    s.sequence
      .slice(o, o + 6)
      .map((r, k) => ({ name: String(o + k + 1), rows: r.frame, mark: o + k === 7 ? s.strike : undefined })),
  ),
}));
const heads = [CHIBI, ...PRESETS].map((b) => ({ name: b.name, rows: headOf(b).grid }));
const enemy = ENEMY_VARIANT_FRAMES.corcunda['idle-0'];
const escala = sets.map((s, i) => ({ name: label(i), player: rasterize(s.idle).frame, enemy }));

for (const [i, s] of sets.entries()) {
  const body = s.body;
  const j = rasterize(s.idle).frame;
  const top = j.findIndex((r) => /[^.]/.test(r));
  const target = TUNINGS[body.name]?.strike ?? DEFAULT_TUNING.strike;
  console.log(
    `${label(i)}: topo ${top} (altura ${30 - top}), cabeça ${body.head}, perna (quadril ao chão) ${(body.thigh + body.shin + 1.8).toFixed(1)}, braço ${(body.upperArm + body.foreArm).toFixed(1)}, ` +
      `golpe col ${s.strike.col} row ${s.strike.row}, falta p/ alvo ${reachShortfall(s, target).toFixed(2)}, p/ mínimo ${reachShortfall(s, MIN_STRIKE).toFixed(2)}`,
  );
}

const edge = findEdge(process.env.EDGE_PATH, DEFAULT_EDGE_PATHS, existsSync);
if (!edge) {
  console.error('Edge não encontrado (defina EDGE_PATH).');
  process.exit(2);
}

const pageFn = (data) => {
  const S = data.scale,
    BG = '#2a3863',
    cw = 32 * S + 8,
    ch = 30 * S + 24;
  const hex = (n) => '#' + n.toString(16).padStart(6, '0');
  const drawRows = (ctx, rows, x, y, S = data.scale) =>
    rows.forEach((row, j) =>
      [...row].forEach((c, i) => {
        if (c === '.') return;
        ctx.fillStyle = hex(data.palette[c]);
        ctx.fillRect(x + i * S, y + j * S, S, S);
      }),
    );
  const canvasOf = (id, w, h) => {
    const cv = document.createElement('canvas');
    cv.id = id;
    cv.width = w;
    cv.height = h;
    document.body.appendChild(cv);
    const ctx = cv.getContext('2d');
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);
    ctx.font = '13px monospace';
    ctx.textBaseline = 'top';
    return ctx;
  };
  const board = (id, lines) => {
    const cols = Math.max(...lines.map((r) => r.length));
    const ctx = canvasOf(id, cols * cw, lines.length * ch);
    lines.forEach((frames, ry) =>
      frames.forEach((f, cx) => {
        const x = cx * cw + 4,
          y = ry * ch + 2;
        ctx.strokeStyle = '#4a5780';
        ctx.strokeRect(x - 3.5, y - 1.5, cw - 1, ch - 1);
        ctx.fillStyle = '#35446f';
        ctx.fillRect(x, y + 30 * S, 32 * S, 1); // chão
        drawRows(ctx, f.rows, x, y);
        ctx.fillStyle = '#fff';
        ctx.fillText(f.name, x, y + 30 * S + 4);
        if (f.mark) {
          ctx.strokeStyle = '#ff3344';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + f.mark.col * S + 0.5, y + f.mark.row * S + 0.5, S - 1, S - 1);
        }
      }),
    );
  };
  board('estudo', data.estudo);
  for (const t of data.tiras) board(t.id, t.lines);
  {
    // Cabeças em escala grande (cabecas.png)
    const K = S * 2,
      cwh = 15 * K,
      chh = 12 * K + 20;
    const c2 = canvasOf('cabecas', 4 * cwh, chh);
    data.heads.forEach((h, k) => {
      drawRows(c2, h.rows, k * cwh + K, K, K);
      c2.fillStyle = '#fff';
      c2.fillText(h.name, k * cwh + K, 12 * K + 4);
    });
  }
  // Escala: jogador (origem na coluna 10) e inimigo (centro na coluna 12,5) pé a pé, o inimigo 12 texels à frente.
  const ew = 32,
    ox = 12;
  const W = 3 * (ew + ox + 6) * S,
    H = 34 * S + 24;
  const ctx = canvasOf('escala', W, H);
  data.escala.forEach((e, k) => {
    const x0 = k * (ew + ox + 6) * S;
    const gy = 31 * S;
    ctx.fillStyle = '#35446f';
    ctx.fillRect(x0, gy, (ew + ox + 6) * S, 2);
    drawRows(ctx, e.player, x0 + 2 * S, gy - 30 * S);
    drawRows(ctx, e.enemy, x0 + (2 + ox + 10 - 12.5) * S, gy - 24 * S);
    ctx.fillStyle = '#fff';
    ctx.fillText(e.name, x0 + 6, gy + 6);
  });
};

const browser = await puppeteer.launch({ executablePath: edge, headless: true });
try {
  const page = await browser.newPage();
  await page.setContent('<body style="margin:0;background:#000"></body>');
  await page.evaluate(pageFn, {
    palette: PALETTE,
    estudo,
    tiras,
    escala,
    heads,
    scale: Number(process.env.SPRITE_SCALE) || 6,
  });
  for (const id of ['estudo', 'cabecas', ...tiras.map((t) => t.id), 'escala']) {
    await (await page.$('#' + id)).screenshot({ path: join(outDir, id + '.png') });
    console.log('  ' + join(outDir, id + '.png'));
  }
} finally {
  await browser.close();
}
