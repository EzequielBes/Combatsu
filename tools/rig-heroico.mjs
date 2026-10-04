// Estudo do heroico alto (spike heroico-fable). Grava, em escala SPRITE_SCALE (padrão 6x):
//   heroico.png: 2 linhas x 3 colunas (atual, heroico 26, heroico alto) em idle e no pico do gancho;
//   tira.png: os 12 quadros do gancho do heroico alto, com o ponto de golpe no quadro 8;
//   rosto.png: as cabeças a 12x (escala dobrada), lado a lado;
//   escala.png: player atual, heroico alto e inimigo `corcunda`, pé a pé, na mesma escala.
// Os frames têm tamanhos diferentes (32x30 e 40x40): cada célula usa o tamanho da própria grade e alinha pela base.
// Uso, a partir da raiz do repo:  node tools/rig-heroico.mjs [outDir]   (padrão: .fable-out)
import { existsSync, mkdirSync } from 'node:fs';
import { register } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

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

const src = (p) => import(pathToFileURL(join(root, 'src', p)).href);
const { PALETTE } = await src('game/art/palette.ts');
const { PLAYER_FRAMES, HEAD_FOCUS } = await src('game/art/sprites/player.ts');
const { PLAYER_MOVE_FRAMES } = await src('game/art/sprites/playerMoves.ts');
const { ENEMY_VARIANT_FRAMES } = await src('game/art/sprites/enemy.ts');
const { HEROICO, HEROICO_ALTO, headOf } = await src('game/art/rig/presets.ts');
const { uppercutFor } = await src('game/art/rig/poses/uppercut.ts');
const { TUNINGS } = await src('game/art/rig/poses/tunings.ts');
const { rasterize, RIG_FRAME_40 } = await src('game/art/rig/rasterize.ts');
const { DEFAULT_EDGE_PATHS, findEdge } = await import(pathToFileURL(join(root, 'scripts', 'smoke', 'lib.ts')).href);

const set26 = uppercutFor(HEROICO, TUNINGS.heroico);
const setAlto = uppercutFor(HEROICO_ALTO, TUNINGS.heroicoAlto, RIG_FRAME_40);
const idle26 = rasterize(set26.idle, { frame: set26.frame }).frame;
const idleAlto = rasterize(setAlto.idle, { frame: setAlto.frame }).frame;

const heroico = [
  [
    { name: 'idle-0 atual', rows: PLAYER_FRAMES['idle-0'] },
    { name: 'heroico 26 idle', rows: idle26 },
    { name: 'heroico alto idle', rows: idleAlto },
  ],
  [
    { name: 'gancho atual hit', rows: PLAYER_MOVE_FRAMES['ganchoAscendente-hit'] },
    { name: 'heroico 26 hit', rows: set26.frames.hit.frame, mark: set26.strike },
    { name: 'heroico alto hit', rows: setAlto.frames.hit.frame, mark: setAlto.strike },
  ],
];
const tira = [0, 6].map((o) =>
  setAlto.sequence.slice(o, o + 6).map((r, k) => ({ name: String(o + k + 1), rows: r.frame, mark: o + k === 7 ? setAlto.strike : undefined })),
);
const heads = [
  { name: 'atual', rows: HEAD_FOCUS },
  { name: 'heroico', rows: headOf(HEROICO).grid },
  { name: 'alto idle', rows: headOf(HEROICO_ALTO, 'idle').grid },
  { name: 'alto fight', rows: headOf(HEROICO_ALTO, 'fight').grid },
];
const escala = {
  player: { rows: PLAYER_FRAMES['idle-0'], originCol: 10, name: 'idle-0 atual' },
  alto: { rows: idleAlto, originCol: setAlto.frame.originCol, name: 'heroico alto idle' },
  enemy: ENEMY_VARIANT_FRAMES.corcunda['idle-0'],
};

const body = HEROICO_ALTO;
const top = idleAlto.findIndex((r) => /[^.]/.test(r));
console.log(
  `heroico alto: altura ${idleAlto.length - top} (topo ${top}), cabeça ${body.head}, perna (quadril ao chão) ${(body.thigh + body.shin + 1.8).toFixed(1)}, ` +
    `braço ${(body.upperArm + body.foreArm).toFixed(1)}, golpe col ${setAlto.strike.col} row ${setAlto.strike.row}`,
);

const edge = findEdge(process.env.EDGE_PATH, DEFAULT_EDGE_PATHS, existsSync);
if (!edge) {
  console.error('Edge não encontrado (defina EDGE_PATH).');
  process.exit(2);
}

const pageFn = (data) => {
  const S = data.scale, BG = '#2a3863', PAD = 6, LBL = 22, MINW = 110;
  const hex = (n) => '#' + n.toString(16).padStart(6, '0');
  const drawRows = (ctx, rows, x, y, k = S) =>
    rows.forEach((row, j) => [...row].forEach((c, i) => {
      if (c === '.') return;
      ctx.fillStyle = hex(data.palette[c]); ctx.fillRect(x + i * k, y + j * k, k, k);
    }));
  const canvasOf = (id, w, h) => {
    const cv = document.createElement('canvas');
    cv.id = id; cv.width = w; cv.height = h;
    document.body.appendChild(cv);
    const ctx = cv.getContext('2d');
    ctx.fillStyle = BG; ctx.fillRect(0, 0, w, h);
    ctx.font = '13px monospace'; ctx.textBaseline = 'top';
    return ctx;
  };
  const gw = (f) => Math.max(...f.rows.map((r) => r.length));
  const cellW = (f) => Math.max(gw(f) * S, MINW);
  // Board: cada célula tem a largura da própria grade; os frames de uma linha alinham pela base (pé na última linha).
  const board = (id, lines) => {
    const lineH = lines.map((l) => Math.max(...l.map((f) => f.rows.length)) * S);
    const W = Math.max(...lines.map((l) => l.reduce((a, f) => a + cellW(f) + PAD * 2, 0)));
    const H = lineH.reduce((a, h) => a + h + LBL + PAD * 2, 0);
    const ctx = canvasOf(id, W, H);
    let y0 = 0;
    lines.forEach((frames, ry) => {
      let x0 = 0;
      frames.forEach((f) => {
        const w = cellW(f), h = f.rows.length * S;
        const x = x0 + PAD, yb = y0 + PAD + lineH[ry]; // yb = linha de base
        const y = yb - h;
        ctx.strokeStyle = '#4a5780'; ctx.strokeRect(x0 + 0.5, y0 + 0.5, w + PAD * 2 - 1, lineH[ry] + LBL + PAD * 2 - 1);
        ctx.fillStyle = '#35446f'; ctx.fillRect(x, yb, gw(f) * S, 1); // chão
        drawRows(ctx, f.rows, x, y);
        ctx.fillStyle = '#fff'; ctx.fillText(f.name, x, yb + 4);
        if (f.mark) { ctx.fillStyle = '#ff3344'; ctx.fillRect(x + f.mark.col * S, y + f.mark.row * S, S, S); }
        x0 += w + PAD * 2;
      });
      y0 += lineH[ry] + LBL + PAD * 2;
    });
  };
  board('heroico', data.heroico);
  board('tira', data.tira);
  { // Cabeças em escala grande (rosto.png)
    const K = S * 2;
    const cw = Math.max(...data.heads.map((h) => gw(h))) * K + 2 * K;
    const hh = Math.max(...data.heads.map((h) => h.rows.length)) * K;
    const ctx = canvasOf('rosto', data.heads.length * cw, hh + 2 * K + 20);
    data.heads.forEach((h, k) => {
      drawRows(ctx, h.rows, k * cw + K, K, K);
      ctx.fillStyle = '#fff'; ctx.fillText(h.name, k * cw + K, K + hh + 4);
    });
  }
  { // Escala: player e heroico alto (origem na própria coluna) e inimigo (centro 12,5) pé a pé, o inimigo 12 texels à frente.
    const e = data.escala, cw = 48 * S;
    const maxH = Math.max(e.player.rows.length, e.alto.rows.length, e.enemy.length);
    const gy = (maxH + 1) * S;
    const ctx = canvasOf('escala', 2 * cw, gy + 30);
    [e.player, e.alto].forEach((p, k) => {
      const x0 = k * cw, px = x0 + 2 * S;
      ctx.fillStyle = '#35446f'; ctx.fillRect(x0, gy, cw, 2);
      drawRows(ctx, p.rows, px, gy - p.rows.length * S);
      drawRows(ctx, e.enemy, px + (p.originCol + 12 - 12.5) * S, gy - e.enemy.length * S);
      ctx.fillStyle = '#fff'; ctx.fillText(p.name, x0 + 6, gy + 6);
    });
  }
};

const browser = await puppeteer.launch({ executablePath: edge, headless: true });
try {
  const page = await browser.newPage();
  await page.setContent('<body style="margin:0;background:#000"></body>');
  await page.evaluate(pageFn, { palette: PALETTE, heroico, tira, heads, escala, scale: Number(process.env.SPRITE_SCALE) || 6 });
  for (const id of ['heroico', 'tira', 'rosto', 'escala']) {
    await (await page.$('#' + id)).screenshot({ path: join(outDir, id + '.png') });
    console.log('  ' + join(outDir, id + '.png'));
  }
} finally {
  await browser.close();
}
