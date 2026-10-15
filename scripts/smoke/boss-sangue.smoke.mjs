// Feixe do Sangue Convergente no jogo vivo, em `?debug&hd=1&area=modular` (SNG-01..03, BRD-07).
// `round=10&bossArch=oni&bossAffix=sangue&finger=0&regen=0`. Um piloto reativo pula a investida e foge do salto; no
// feixe o player fica parado. O cenário mede: o 1º ataque da fase 1 é a investida e o 2º é o `beam` (SNG-01); o aviso
// dura ~800 ms com a linha engrossando de 1 a 6 px, na altura do peito do chefe, dele até a borda da tela no lado do
// player (SNG-02), com o sprite do chefe olhando para esse lado em todo aviso e feixe medidos, inclusive depois de
// uma investida que passou do player; em pé, o feixe aberto tira `round(16 × 1,15) = 18` uma vez só (SNG-03); no
// feixe seguinte, abaixado na hora da abertura, nada, e o feixe fica aberto ~250 ms. `regen=0`: a recuperação passiva não mexe na vida entre um
// quadro e outro. Capturas do aviso e do feixe em `.fable-out/boss-sangue-*.png`.
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.fable-out');
/** Dano do feixe na r10: `round(BOSS_AFFIX.beam.damage × (1 + 0,15 × (tier 2 − 1)))` = round(18,4). */
const BEAM_DAMAGE = 18;
/** Quadros de 1000/60 ms: 800 ms de aviso e 250 ms de feixe aberto (`BOSS_AFFIX.beam`). */
const WARN_FRAMES = 48;
const ACTIVE_FRAMES = 15;
/** Quadros com o pulo segurado (o pulo mais alto). */
const JUMP_HOLD = 11;
/** Quadros de aviso que faltam quando o player abaixa: os 320 ms do abaixar cobrem os 250 ms do feixe. */
const DUCK_LEAD = 2;
const QUERY = 'round=10&bossArch=oni&bossAffix=sangue&finger=0&regen=0';

export default async function ({ page, baseUrl, assert }) {
  mkdirSync(OUT_DIR, { recursive: true });
  await page.setViewport({ width: 1280, height: 720 });
  const g = makeGame(page, baseUrl, assert);
  let s = await g.open();
  assert(
    s.boss.affixes.join() === 'sangue' && s.boss.beam?.phase === 'idle' && s.boss.beam.damage === BEAM_DAMAGE,
    `o chefe com Sangue nasce com o feixe parado e o dano do tier: ${JSON.stringify(s.boss)}`,
  );
  const ctx = { attacks: [], mem: { jumpLeft: 0, jumpDir: null, leapTo: 0 }, prev: null, facing: [] };
  if (s.boss.state === 'windup') ctx.attacks.push({ phase: s.boss.phase, attack: s.boss.attack });
  // Em pé: o 1º feixe em que o player está limpo (sem invulnerabilidade da investida) mede o golpe cheio.
  let standing = null;
  for (let tries = 0; tries < 4 && !standing; tries++) {
    const m = await measureBeam(g, page, s, ctx, { duck: false, shots: tries === 0 });
    s = m.s;
    if (m.clean) standing = m;
  }
  assert(standing, `nenhum feixe pegou o player em pé e limpo: ${JSON.stringify(ctx.attacks)}`);
  checkWarn(standing, assert);
  const hit = standing.active.filter((f) => f.hits > 0);
  const actx = JSON.stringify(standing.active);
  assert(hit.length === 1, `em pé, o feixe acerta uma vez só: ${actx}`);
  assert(hit[0].hpLoss === BEAM_DAMAGE, `em pé, o feixe tira ${BEAM_DAMAGE}: ${actx}`);
  // Abaixado: o feixe seguinte passa por cima (DEF-11) e fica aberto os 250 ms.
  const ducked = await measureBeam(g, page, s, ctx, { duck: true, shots: false });
  const dctx = JSON.stringify(ducked.active);
  assert(ducked.duckedAtOpen, `o player deveria estar abaixado na abertura: ${dctx}`);
  assert(
    ducked.active.every((f) => f.hits === 0 && f.hpLoss === 0),
    `abaixado, o feixe não acerta: ${dctx}`,
  );
  assert(Math.abs(ducked.active.length - ACTIVE_FRAMES) <= 1, `o feixe fica aberto ~250 ms: ${ducked.active.length}`);
  checkCycle(ctx.attacks, assert);
  const backward = ctx.facing.filter((f) => f.facing !== f.dir);
  assert(ctx.facing.length > 0, 'nenhum quadro de feixe registrou o lado do sprite');
  assert(backward.length === 0, `o feixe sai pelas costas do chefe: ${JSON.stringify(backward.slice(0, 5))}`);
}

function makeGame(page, baseUrl, assert) {
  const step = (ms) =>
    page.evaluate((m) => {
      window.__game.step(m);
      return window.__game.snapshot();
    }, ms);
  const held = new Set();
  /** Deixa seguradas exatamente as teclas de `want`. */
  const hold = async (want) => {
    for (const k of [...held]) {
      if (want.has(k)) continue;
      held.delete(k);
      await page.keyboard.up(k);
    }
    for (const k of want) {
      if (held.has(k)) continue;
      held.add(k);
      await page.keyboard.down(k);
    }
  };
  /** Abre a rodada de chefe com o Sangue fixado e espera o fim da intro. */
  const open = async () => {
    held.clear();
    await page.goto(`${baseUrl}?debug&hd=1&area=modular&enemyGuard=0&seed=1&${QUERY}`, { waitUntil: 'load' });
    await page.waitForFunction(
      () => {
        try {
          return !!window.__game.snapshot();
        } catch {
          return false;
        }
      },
      { timeout: 15_000 },
    );
    await step(20);
    await page.keyboard.press('KeyJ', { delay: 50 });
    let s = await step(50);
    for (let i = 0; i < 20 && !s.boss; i++) s = await step(50);
    assert(s.boss, `o chefe deveria nascer: ${JSON.stringify(s.run)}`);
    // Quadro a quadro: o preparo do 1º ataque começa logo no fim da intro e entra na conta do ciclo.
    for (let i = 0; i < 3000 && s.boss.state === 'intro'; i++) s = await step(1);
    assert(s.boss.state !== 'intro', 'o chefe não saiu da intro');
    return s;
  };
  return { step, hold, open, tick: () => step(1) };
}

/** Piloto de sobrevivência: pula a investida que vem na direção do player e sai do ponto de pouso do salto. */
function survive(s, prev, mem) {
  const p = s.player;
  const b = s.boss;
  if (mem.jumpLeft > 0) {
    mem.jumpLeft--;
    return new Set(['KeyW']);
  }
  if (!b || !p.grounded) return new Set();
  const towardPlayer = prev?.boss && Math.sign(b.x - prev.boss.x) === Math.sign(p.x - b.x);
  if (b.state === 'charge' && towardPlayer && Math.abs(b.x - p.x) < 100) {
    mem.jumpLeft = JUMP_HOLD - 1;
    return new Set(['KeyW']);
  }
  for (const w of s.projectiles) {
    if (w.kind === 'shockwave' && Math.sign(p.x - w.x) === w.dir && Math.abs(p.x - w.x) < 50) {
      mem.jumpLeft = 5;
      return new Set(['KeyW']);
    }
  }
  if (b.state === 'leap') {
    if (prev?.boss?.state !== 'leap') mem.leapTo = p.x;
    if (Math.abs(p.x - mem.leapTo) < 90) {
      const away = p.x >= mem.leapTo ? 1 : -1;
      const nearWall = away > 0 ? p.x > s.area.widthPx - 80 : p.x < 80;
      return new Set([(nearWall ? -away : away) > 0 ? 'KeyD' : 'KeyA']);
    }
  }
  return new Set();
}

/** Um quadro: anota o ataque que começa o preparo (para o ciclo) e devolve o snapshot novo. */
async function frame(g, s, ctx, want) {
  await g.hold(want);
  ctx.prev = s;
  const next = await g.tick();
  if (next.boss?.state === 'windup' && s.boss?.state !== 'windup') {
    ctx.attacks.push({ phase: next.boss.phase, attack: next.boss.attack });
  }
  return next;
}

/**
 * Pilota até o próximo aviso do feixe e mede, quadro a quadro, o aviso e o feixe aberto. Com `duck`, abaixa
 * (`S` + `Espaço`) `DUCK_LEAD` quadros antes do fim do aviso; sem, fica parado.
 */
async function measureBeam(g, page, s, ctx, { duck, shots }) {
  await g.hold(new Set());
  for (let i = 0; i < 3000 && s.boss && !s.player.dead && s.boss.beam.phase !== 'warn'; i++) {
    s = await frame(g, s, ctx, survive(s, ctx.prev, ctx.mem));
  }
  ctx.mem.jumpLeft = 0;
  if (!s.boss || s.boss.beam.phase !== 'warn') throw new Error(`o feixe não avisou: ${JSON.stringify(s.boss)}`);
  const warn = [];
  const active = [];
  let duckedAtOpen = false;
  for (let i = 0; i < 200 && s.boss && s.boss.beam.phase !== 'idle'; i++) {
    const b = s.boss.beam;
    ctx.facing.push({ phase: b.phase, dir: b.dir, facing: s.boss.facing, side: Math.sign(s.player.x - s.boss.x) });
    if (b.phase === 'warn') warn.push(warnFrame(s));
    if (shots && b.phase === 'warn' && warn.length === 24) await shoot(page, 'boss-sangue-warn.png');
    if (shots && b.phase === 'active' && active.length === 3) await shoot(page, 'boss-sangue-beam.png');
    const lead = b.phase === 'warn' && WARN_FRAMES - warn.length <= DUCK_LEAD;
    const want = duck && lead && s.player.duck.active === false ? new Set(['KeyS', 'Space']) : new Set();
    const prev = s;
    s = await frame(g, s, ctx, want);
    if (s.boss?.beam.phase === 'active') {
      if (prev.boss.beam.phase === 'warn') duckedAtOpen = s.player.duck.active;
      active.push({
        hits: s.boss.beam.hits - prev.boss.beam.hits,
        hpLoss: prev.player.hp - s.player.hp,
        invulnerable: prev.player.invulnerable,
        duck: s.player.duck.active,
      });
    }
  }
  await g.hold(new Set());
  const clean = !duck && active.length > 0 && !active[0].invulnerable && warn.every((f) => f.grounded);
  return { s, warn, active, clean, duckedAtOpen };
}

/** O que a conta do aviso precisa de um quadro em que a linha está em cena. */
function warnFrame(s) {
  const b = s.boss.beam;
  const view = s.camera.worldView;
  return {
    t: b.thickness,
    ms: Math.round(b.warnElapsedMs),
    dir: b.dir,
    side: Math.sign(s.player.x - s.boss.x),
    fromX: Math.round(b.fromX),
    toX: b.toX,
    edge: b.dir > 0 ? view.right : view.left,
    y: b.y,
    bossY: s.boss.y,
    grounded: s.player.grounded,
  };
}

/** SNG-01: na fase 1 do Oni (investida, salto), o feixe entra logo depois do 1º ataque. */
function checkCycle(attacks, assert) {
  const p1 = attacks.filter((a) => a.phase === 1).map((a) => a.attack);
  assert(p1.slice(0, 3).join() === 'charge,beam,leap', `ciclo da fase 1 com o feixe em 2º: ${p1.join()}`);
  for (let i = 3; i + 1 < p1.length; i += 3) {
    assert(p1[i + 1] === 'beam', `o feixe volta em 2º a cada volta do ciclo: ${p1.join()}`);
  }
}

/** SNG-02: ~800 ms de aviso, linha de 1 a 6 px no peito do chefe, dele até a borda da tela no lado do player. */
function checkWarn(m, assert) {
  const w = m.warn;
  const ctx = JSON.stringify(w.map((f) => [f.t, f.ms, f.dir, f.side, f.toX, f.edge]));
  assert(Math.abs(w.length - WARN_FRAMES) <= 1, `o aviso deveria durar ~800 ms (${w.length} quadros): ${ctx}`);
  assert(w[0].t <= 2 && w[w.length - 1].t >= 5, `a linha engrossa de 1 a 6 px: ${ctx}`);
  assert(
    w.every((f, i) => i === 0 || f.t >= w[i - 1].t),
    `a linha nunca afina no aviso: ${ctx}`,
  );
  assert(w.every((f) => f.dir === w[0].dir) && w[0].dir === w[0].side, `a linha sai no lado do player: ${ctx}`);
  assert(
    w.every((f) => Math.abs(f.toX - f.edge) <= 2),
    `a linha vai até a borda da tela: ${ctx}`,
  );
  assert(
    w.every((f) => Math.abs(f.y - f.bossY) <= 2),
    `a linha fica na altura do peito do chefe: ${JSON.stringify(w[0])}`,
  );
}

async function shoot(page, name) {
  await page.evaluate(() => window.__game.render());
  await page.screenshot({ path: join(OUT_DIR, name) });
}
