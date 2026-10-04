// Preview de sprites (SPR-15, EVR-07): do player grava player-sheet.png (todos os frames, rotulados, a 4x) e um
// anim-<name>.png por animação de PLAYER_ANIMS; do inimigo grava enemy-<aparência>-sheet.png e
// enemy-<aparência>-anim-<name>.png por aparência. Uso, a partir da raiz do repo:
//   node tools/sprite-preview.mjs [outDir] [--only player|enemy]
// Os .ts são importados em Node com um hook de resolução (imports sem extensão); o desenho roda no Edge via puppeteer-core.
import { existsSync, mkdirSync } from 'node:fs';
import { register } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const onlyIdx = args.indexOf('--only');
const only = onlyIdx >= 0 ? args.splice(onlyIdx, 2)[1] : 'all';
if (!['all', 'player', 'enemy'].includes(only)) {
  console.error('--only aceita player, enemy ou all.');
  process.exit(2);
}
const outDir = resolve(args[0] ?? join(root, 'docs', 'art'));
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
const P = await src('game/art/sprites/player.ts');
const { PLAYER_MOVE_FRAMES } = await src('game/art/sprites/playerMoves.ts');
const { PLAYER_TECH_FRAMES } = await src('game/art/sprites/playerTech.ts');
const { DEFAULT_EDGE_PATHS, findEdge } = await import(pathToFileURL(join(root, 'scripts', 'smoke', 'lib.ts')).href);

const E = await src('game/art/sprites/enemy.ts');

const toAnims = (defs) =>
  Object.entries(defs).map(([name, def]) => ({
    name,
    frames: def.frames.map((f, i) => ({ name: f, ms: def.durations?.[i] ?? Math.round(1000 / def.frameRate) })),
  }));

// Cada alvo: prefixo do arquivo da prancha e das tiras, frames e animações. O inimigo gera um alvo por aparência
// (ENEMY_VARIANT_FRAMES, quando existir; antes disso, só a folha atual, que é a corcunda).
const targets = [];
if (only !== 'enemy') {
  targets.push({
    sheet: 'player-sheet.png',
    anim: (n) => `anim-${n}.png`,
    frames: { ...P.PLAYER_FRAMES, ...PLAYER_MOVE_FRAMES, ...PLAYER_TECH_FRAMES },
    anims: toAnims(P.PLAYER_ANIMS),
  });
}
if (only !== 'player') {
  const variants = E.ENEMY_VARIANT_FRAMES ?? { corcunda: E.ENEMY_FRAMES };
  for (const [v, vFrames] of Object.entries(variants)) {
    targets.push({
      sheet: `enemy-${v}-sheet.png`,
      anim: (n) => `enemy-${v}-anim-${n}.png`,
      frames: vFrames,
      anims: toAnims(E.ENEMY_ANIMS),
    });
  }
}

const edge = findEdge(process.env.EDGE_PATH, DEFAULT_EDGE_PATHS, existsSync);
if (!edge) {
  console.error('Edge não encontrado (defina EDGE_PATH).');
  process.exit(2);
}

const pageFn = (data) => {
  const S = data.scale,
    BG = '#2a3863';
  const hex = (n) => '#' + n.toString(16).padStart(6, '0');
  const sprite = (ctx, rows, x, y) => {
    rows.forEach((row, ry) =>
      [...row].forEach((c, rx) => {
        if (c === '.') return;
        ctx.fillStyle = hex(data.palette[c]);
        ctx.fillRect(x + rx * S, y + ry * S, S, S);
      }),
    );
  };
  const make = (w, h) => {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    cv.className = 'shot';
    document.body.appendChild(cv);
    const ctx = cv.getContext('2d');
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);
    ctx.font = '12px monospace';
    ctx.textBaseline = 'top';
    return [cv, ctx];
  };
  const fh = Object.values(data.frames)[0].length; // altura do frame em texels (24 do inimigo, 30 do player)
  const cw = 32 * S + 8,
    ch = fh * S + 22;
  const label = (ctx, t, x, y) => {
    ctx.fillStyle = '#fff';
    ctx.fillText(t, x, y);
  };
  // prancha
  const names = Object.keys(data.frames),
    cols = 6,
    rows = Math.ceil(names.length / cols);
  const [sheet, sctx] = make(cols * cw, rows * ch);
  sheet.id = 'sheet';
  names.forEach((n, i) => {
    const x = (i % cols) * cw + 4,
      y = Math.floor(i / cols) * ch + 2;
    sctx.strokeStyle = '#4a5780';
    sctx.strokeRect(x - 3.5, y - 1.5, cw - 1, ch - 1);
    sprite(sctx, data.frames[n], x, y);
    label(sctx, n, x, y + fh * S + 3);
  });
  // tiras
  data.anims.forEach((a, i) => {
    const [cv, ctx] = make(Math.max(a.frames.length, 1) * cw, ch + 14);
    cv.id = 'anim-' + i;
    a.frames.forEach((f, j) => {
      const x = j * cw + 4;
      sprite(ctx, data.frames[f.name], x, 2);
      label(ctx, f.name, x, fh * S + 3);
      label(ctx, f.ms + 'ms', x, fh * S + 17);
    });
  });
};

const browser = await puppeteer.launch({ executablePath: edge, headless: true });
try {
  const page = await browser.newPage();
  const scale = Number(process.env.SPRITE_SCALE) || 4;
  const shot = async (sel, file) => {
    const el = await page.$(sel);
    await el.screenshot({ path: join(outDir, file) });
    console.log('  ' + file);
  };
  for (const t of targets) {
    await page.setContent('<body style="margin:0;background:#000"></body>');
    await page.evaluate(pageFn, { palette: PALETTE, frames: t.frames, anims: t.anims, scale });
    await shot('#sheet', t.sheet);
    for (let i = 0; i < t.anims.length; i++) await shot('#anim-' + i, t.anim(t.anims[i].name));
    console.log(`Prancha e ${t.anims.length} animações de ${t.sheet} em ${outDir}`);
  }
} finally {
  await browser.close();
}
