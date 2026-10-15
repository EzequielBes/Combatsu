// Lava do Ígneo no jogo vivo, em `?debug&hd=1&area=modular` (IGN-01..05, BRD-07, edge cases da lava).
// 1º cenário: `round=10&bossArch=oni&bossAffix=igneo&finger=0&regen=0`. Um piloto reativo mantém o player vivo: pula a
// investida por cima (a hitbox dela só cobre a altura do corpo do chefe), foge do ponto de pouso do salto e pula as
// ondas de choque. Quando uma investida termina com o player parado no trecho que ela percorreu, a faixa nasce sob os pés
// dele e o cenário mede: a faixa cobre do X de saída ao X de parada do chefe (IGN-01); parado nela, o player perde
// `round(4 × 1,15) = 5` por tique, a cada 600 ms, sem ser empurrado (IGN-03/04); no ar sobre a faixa, com o relógio
// pronto, nada, e ao pousar o tique vem na hora (IGN-05); a faixa some com 2000 ms (IGN-02). `regen=0`: a recuperação
// passiva não mexe na vida entre um quadro e outro. Captura da faixa em `.fable-out/boss-igneo-lava.png`.
// 2º cenário: o chefe morre (golpes de teste, tecla 2) com uma faixa viva, e a lava some no mesmo quadro.
// 3º cenário: o player morre (tecla 3) com uma faixa viva; a run nova começa sem lava.
// 4º cenário: o contorno de 1 px (BRD-03): `a` só com Ígneo, alternando `a`/`u` a cada 600 ms com Ígneo + Invocador,
// ausente com Sangue; as cópias mostram o quadro do chefe em todo quadro em que ele troca. Capturas do chefe em
// movimento em `.fable-out/boss-igneo-outline-<n>.png`.
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.fable-out');
/** Dano do tique na r10: `round(BOSS_AFFIX.lava.damage × (1 + 0,15 × (tier 2 − 1)))` = round(4,6). */
const LAVA_DAMAGE = 5;
/** Quadros de 1000/60 ms: 600 ms entre tiques e 2000 ms de vida da faixa (`BOSS_AFFIX.lava`). */
const TICK_FRAMES = 36;
const LIFE_FRAMES = 120;
/** Zona de contato da faixa acima do chão (`LAVA_DEPTH`) e o retângulo do player (`SIZE.player`). */
const LAVA_DEPTH = 8;
const PLAYER = { w: 20, h: 36 };
/** Quadros com o pulo segurado (o pulo mais alto) e quadros depois de um tique até pular no teste do ar. */
const JUMP_HOLD = 11;
const JUMP_AFTER_TICK = 20;
const QUERY = 'round=10&bossArch=oni&bossAffix=igneo&finger=0&regen=0';
/** Quadros de 1000/60 ms entre trocas de cor do contorno com dois afixos (`BOSS_AFFIX.outlineSwapMs` = 600). */
const SWAP_FRAMES = 36;

export default async function ({ page, baseUrl, assert }) {
  mkdirSync(OUT_DIR, { recursive: true });
  await page.setViewport({ width: 1280, height: 720 });
  const g = makeGame(page, baseUrl, assert);
  await measureScenario(g, assert, page);
  await bossDeathScenario(g, assert);
  await restartScenario(g, assert, page);
  await outlineScenario(g, assert, page);
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
  /** Abre a rodada de chefe com o Ígneo fixado e espera o fim da intro. */
  const open = async (query = QUERY) => {
    held.clear();
    await page.goto(`${baseUrl}?debug&hd=1&area=modular&enemyGuard=0&seed=1&${query}`, { waitUntil: 'load' });
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
    assert(s.boss, `o chefe deveria nascer (${query}): ${JSON.stringify(s.run)}`);
    const igneo = s.boss.affixes.includes('igneo');
    assert(
      igneo === query.includes('igneo') && (!igneo || s.boss.lava?.strips.length === 0),
      `o chefe Ígneo nasce com a lava vazia: ${JSON.stringify(s.boss)}`,
    );
    for (let i = 0; i < 60 && s.boss.state === 'intro'; i++) s = await step(50);
    assert(s.boss.state !== 'intro', 'o chefe não saiu da intro');
    return s;
  };
  return { step, hold, open, tick: () => step(1) };
}

/** O player está sobre o trecho da faixa, no chão ou no ar (só o eixo X). */
function over(strip, p) {
  return p.x + PLAYER.w / 2 >= strip.minX && p.x - PLAYER.w / 2 <= strip.maxX;
}

/** O player encosta na faixa `strip` (mesma conta do `LavaStrips`, retângulo pelo centro). */
function touches(strip, p) {
  const left = p.x - PLAYER.w / 2;
  const right = p.x + PLAYER.w / 2;
  const top = p.y - PLAYER.h / 2;
  const bottom = p.y + PLAYER.h / 2;
  return right >= strip.minX && left <= strip.maxX && bottom >= strip.groundY - LAVA_DEPTH && top <= strip.groundY;
}

/**
 * Piloto de sobrevivência: as teclas do quadro para não levar a investida, o pouso do salto nem a onda de choque.
 * `mem` guarda o pulo em curso e o alvo do salto (o X do player na decolagem, como o `BossAI`).
 */
function survive(s, prev, mem) {
  const p = s.player;
  const b = s.boss;
  if (mem.jumpLeft > 0) {
    mem.jumpLeft--;
    return new Set(['KeyW', ...(mem.jumpDir ? [mem.jumpDir] : [])]);
  }
  if (!b || !p.grounded) return new Set();
  const jump = (frames, dir = null) => {
    mem.jumpLeft = frames - 1;
    mem.jumpDir = dir;
    return new Set(['KeyW', ...(dir ? [dir] : [])]);
  };
  const towardPlayer = prev?.boss && Math.sign(b.x - prev.boss.x) === Math.sign(p.x - b.x);
  if (b.state === 'charge' && towardPlayer && Math.abs(b.x - p.x) < 100) return jump(JUMP_HOLD);
  for (const w of s.projectiles) {
    if (w.kind === 'shockwave' && Math.sign(p.x - w.x) === w.dir && Math.abs(p.x - w.x) < 50) return jump(6);
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

/**
 * 1º cenário. Cada quadro grava o que a conta precisa; o player fica parado na faixa até dois tiques no chão, pula
 * `JUMP_AFTER_TICK` quadros depois do 2º (fica no ar além dos 600 ms do relógio) e pousa nela.
 */
async function measureScenario(g, assert, page) {
  let s = await g.open();
  const mem = { jumpLeft: 0, jumpDir: null, leapTo: 0 };
  let prev = null;
  let chargeFromX = null;
  let lava = null; // medida da faixa em curso
  const done = [];
  let shot = false;
  for (let i = 0; i < 4000 && done.length < 1 && s.boss && !s.player.dead; i++) {
    const want = lava?.onIt && lava.mode !== 'free' ? pilotOnStrip(lava, s, mem) : survive(s, prev, mem);
    await g.hold(want);
    prev = s;
    s = await g.tick();
    if (!s.boss) break;
    if (s.boss.state === 'charge' && prev.boss.state !== 'charge') chargeFromX = prev.boss.x;
    const strips = s.boss.lava.strips;
    if (strips.length > (prev.boss.lava.strips.length ?? 0) && !lava) {
      const strip = strips[strips.length - 1];
      lava = { strip, frames: [], born: i, onIt: over(strip, s.player), mode: 'stand' };
      lava.trail = { fromX: chargeFromX, bossX: s.boss.x, trails: s.boss.fx.chargeTrail };
    }
    if (!lava) continue;
    const alive = strips.some((x) => x.minX === lava.strip.minX && x.maxX === lava.strip.maxX);
    lava.frames.push({
      alive,
      ticks: s.boss.lava.ticks - prev.boss.lava.ticks,
      hits: s.boss.lava.hits - prev.boss.lava.hits,
      hpLoss: prev.player.hp - s.player.hp,
      dx: s.player.x - prev.player.x,
      on: touches(lava.strip, s.player),
      over: over(lava.strip, s.player),
      grounded: s.player.grounded,
      wasGrounded: prev.player.grounded,
      invulnerable: prev.player.invulnerable,
    });
    if (!shot && lava.onIt && lava.frames.length === 10) {
      await page.evaluate(() => window.__game.render());
      await page.screenshot({ path: join(OUT_DIR, 'boss-igneo-lava.png') });
      shot = true;
    }
    if (!alive) {
      if (lava.onIt) done.push(lava);
      lava = null;
    }
  }
  await g.hold(new Set());
  assert(done.length > 0, `nenhuma investida deixou faixa sob o player: ${JSON.stringify(s.boss)} hp=${s.player.hp}`);
  checkMeasure(done, assert);
}

/** Teclas do quadro com o player na faixa: parado, depois o pulo do teste do ar, e livre depois do pouso. */
function pilotOnStrip(lava, s, mem) {
  const f = lava.frames;
  // O pulo por cima da investida termina antes de qualquer outra tecla.
  if (lava.mode === 'stand' && mem.jumpLeft > 0) {
    mem.jumpLeft--;
    return new Set(['KeyW', ...(mem.jumpDir ? [mem.jumpDir] : [])]);
  }
  const tickAt = f.flatMap((x, i) => (x.ticks > 0 ? [i] : []));
  if (lava.mode === 'stand' && tickAt.length >= 2 && f.length - 1 - tickAt[tickAt.length - 1] >= JUMP_AFTER_TICK) {
    lava.mode = 'jump';
    mem.jumpLeft = JUMP_HOLD - 1;
    mem.jumpDir = null;
    return new Set(['KeyW']);
  }
  if (lava.mode === 'jump') {
    if (mem.jumpLeft > 0) {
      mem.jumpLeft--;
      return new Set(['KeyW']);
    }
    if (s.player.grounded && f.length > 0 && !f[f.length - 1].wasGrounded) lava.mode = 'landed';
    return new Set();
  }
  if (lava.mode === 'landed' && f.length > 0 && f[f.length - 1].ticks === 0) lava.mode = 'free';
  return new Set();
}

function checkMeasure(done, assert) {
  const lava = done.find((l) => l.frames.some((f) => f.ticks > 0)) ?? done[0];
  const { strip, trail, frames } = lava;
  const ctx = JSON.stringify({ strip, trail, f: frames.map((f) => [f.ticks, f.hits, f.hpLoss, +f.on, +f.grounded]) });
  // IGN-01: a faixa vai do X de saída ao X de parada da investida.
  const ends = [strip.minX, strip.maxX];
  const near = (v) => ends.some((e) => Math.abs(e - v) <= 2);
  assert(trail.fromX !== null && near(trail.fromX) && near(trail.bossX), `faixa fora do trecho da investida: ${ctx}`);
  assert(strip.maxX - strip.minX > 40, `faixa curta demais: ${ctx}`);
  // IGN-02: viva por 2000 ms; o quadro em que a idade chega a 2000 já não a mostra.
  const life = frames.findIndex((f) => !f.alive);
  assert(Math.abs(life - (LIFE_FRAMES - 1)) <= 1, `a faixa deveria sumir com 2000 ms (${life} quadros): ${ctx}`);
  // IGN-03: 1º contato na hora; tiques no chão a 600 ms; cada um tira o dano do tier e não empurra (IGN-04, força 0).
  // O chão lido no snapshot é o do fim do passo de física: o tique pode vir no quadro seguinte ao do contato.
  const soon = (t, at) => t === at || t === at + 1;
  const tickAt = frames.flatMap((f, i) => (f.ticks > 0 && f.alive ? [i] : []));
  const contact = frames.findIndex((f) => f.on && f.grounded);
  assert(contact >= 0 && soon(tickAt[0], contact), `o 1º contato com a faixa bate na hora: ${ctx}`);
  const gaps = tickAt.slice(1).map((t, k) => t - tickAt[k]);
  assert(gaps.length >= 2 && gaps.every((d) => d >= TICK_FRAMES), `tiques mais perto que 600 ms: ${ctx}`);
  assert(Math.abs(gaps[0] - TICK_FRAMES) <= 1, `parado na faixa, um tique a cada 600 ms: ${ctx}`);
  const clean = tickAt.filter((t) => frames[t].hits > 0 && !frames[t].invulnerable);
  assert(clean.length >= 2, `o player deveria aceitar os tiques: ${ctx}`);
  for (const t of clean) {
    assert(frames[t].hpLoss === LAVA_DAMAGE, `cada tique tira ${LAVA_DAMAGE}: ${ctx}`);
    const standing = frames[t].wasGrounded && frames[t - 1]?.wasGrounded;
    assert(!standing || Math.abs(frames[t].dx) < 0.5, `a lava não empurra (força 0): ${ctx}`);
  }
  // IGN-05: no ar sobre a faixa, com o relógio pronto, nenhum tique; o pouso nela bate na hora.
  const air = frames.flatMap((f, i) => (!f.grounded && !f.wasGrounded && f.alive ? [i] : []));
  assert(
    air.every((i) => frames[i].ticks === 0),
    `tique com o player no ar: ${ctx}`,
  );
  const ready = air.filter((i) => frames[i].over && i - Math.max(...tickAt.filter((t) => t < i)) > TICK_FRAMES);
  assert(ready.length > 0, `o player deveria passar pelo ar sobre a faixa com o relógio pronto: ${ctx}`);
  const land = frames.findIndex((f, i) => i > ready[0] && f.grounded);
  const landTick = tickAt.find((t) => t >= land);
  assert(land > 0 && frames[land].on && soon(landTick, land), `o pouso na faixa deveria bater na hora: ${ctx}`);
}

/**
 * 2º cenário: golpes de teste até o chefe ficar a poucos golpes da morte, uma faixa nova e os últimos golpes com ela
 * viva. No quadro da morte, nenhuma faixa em cena.
 */
async function bossDeathScenario(g, assert) {
  let s = await g.open();
  for (let i = 0; i < 400 && s.boss && (s.boss.phase < 3 || s.boss.hp > 0.12 * s.boss.maxHp); i++) {
    if (s.player.dead) break;
    s = await pressTwo(g);
  }
  assert(s.boss && !s.player.dead, `o chefe deveria chegar perto da morte: ${JSON.stringify(s.boss)}`);
  const seen = s.boss.fx.chargeTrail ?? 0;
  const mem = { jumpLeft: 0, jumpDir: null, leapTo: 0 };
  let prev = null;
  for (let i = 0; i < 3000 && s.boss && (s.boss.fx.chargeTrail ?? 0) === seen && !s.player.dead; i++) {
    await g.hold(survive(s, prev, mem));
    prev = s;
    s = await g.tick();
  }
  await g.hold(new Set());
  assert(s.boss?.lava.strips.length > 0, `uma investida deveria deixar faixa: ${JSON.stringify(s.boss)}`);
  assert(s.bossLavaStrips === s.boss.lava.strips.length, `contagem de faixas do snapshot: ${s.bossLavaStrips}`);
  for (let i = 0; i < 100 && s.boss && s.boss.state !== 'dead' && s.boss.hp > 0; i++) s = await pressTwo(g);
  assert(!s.boss || s.boss.hp <= 0, `o chefe deveria morrer: ${JSON.stringify(s.boss)}`);
  assert(s.bossLavaStrips === 0, `a lava some na morte do chefe: ${s.bossLavaStrips}`);
  assert(!s.boss || s.boss.lava.strips.length === 0, `faixas no chefe morto: ${JSON.stringify(s.boss?.lava)}`);
  assert(!s.boss || s.boss.outline === null, `contorno no chefe morto: ${JSON.stringify(s.boss?.outline)}`);
}

async function pressTwo(g) {
  await g.hold(new Set(['Digit2']));
  await g.step(17);
  await g.hold(new Set());
  return g.step(17);
}

/** 3º cenário: o player morre com uma faixa viva; antes da trava do `gameOver` vencer a faixa ainda existe. */
async function restartScenario(g, assert, page) {
  let s = await g.open();
  for (let i = 0; i < 1500 && s.boss && s.bossLavaStrips === 0; i++) s = await g.tick();
  assert(s.bossLavaStrips > 0, `a primeira investida deveria deixar faixa: ${JSON.stringify(s.boss)}`);
  await page.keyboard.press('Digit3', { delay: 20 });
  for (let i = 0; i < 60 && s.run.state !== 'gameOver'; i++) s = await g.step(17);
  assert(s.run.state === 'gameOver', `esperava gameOver: ${JSON.stringify(s.run)}`);
  s = await g.step(1020);
  assert(
    s.bossLavaStrips > 0,
    `a faixa ainda vive no gameOver (o cenário mede a run nova, não a idade): ${s.bossLavaStrips}`,
  );
  await page.keyboard.press('KeyJ', { delay: 50 });
  s = await g.step(50);
  // Com `round=10` na URL a run nova recomeça na mesma rodada de chefe: um chefe novo, na intro, e nenhuma faixa.
  assert(s.run.state === 'roundActive' && s.run.kills === 0, `a run nova deveria começar: ${JSON.stringify(s.run)}`);
  assert(s.bossLavaStrips === 0, `a run nova começa sem lava: ${s.bossLavaStrips}`);
  assert(!s.boss || s.boss.lava.strips.length === 0, `faixa no chefe da run nova: ${JSON.stringify(s.boss?.lava)}`);
}

/**
 * 4º cenário (BRD-03, BRD-07). Ígneo: contorno `a` em todo quadro, com o quadro das cópias igual ao do chefe mesmo nos
 * quadros em que ele troca (capturas no meio do movimento). Ígneo + Invocador: `a` e `u` em trechos de 600 ms. Sangue:
 * sem contorno.
 */
async function outlineScenario(g, assert, page) {
  let s = await g.open();
  let changes = 0;
  let shots = 0;
  for (let i = 0; i < 900 && s.boss && (i < 240 || shots < 3); i++) {
    const prev = s;
    s = await g.tick();
    const o = s.boss?.outline;
    assert(o && o.key === 'a' && o.visible, `contorno laranja com Ígneo: ${JSON.stringify(o)}`);
    assert(o.frame === o.sourceFrame, `o contorno deveria mostrar o quadro do chefe: ${JSON.stringify(o)}`);
    if (prev.boss?.outline && prev.boss.outline.sourceFrame !== o.sourceFrame) {
      changes++;
      // Captura só com o chefe perto do player (a câmera segue o player), no quadro em que ele acabou de trocar.
      if (shots < 3 && changes % 4 === 1 && Math.abs(s.boss.x - s.player.x) < 260) {
        await page.evaluate(() => window.__game.render());
        await page.screenshot({ path: join(OUT_DIR, `boss-igneo-outline-${++shots}.png`) });
      }
    }
  }
  assert(changes >= 4, `o chefe deveria trocar de quadro durante o cenário (${changes})`);

  s = await g.open(QUERY.replace('bossAffix=igneo', 'bossAffix=igneo,invocador'));
  const keys = [];
  for (let i = 0; i < 200 && s.boss; i++) {
    s = await g.tick();
    keys.push(s.boss?.outline?.key ?? null);
  }
  const runs = [];
  for (const k of keys) {
    if (runs.length && runs[runs.length - 1].k === k) runs[runs.length - 1].n++;
    else runs.push({ k, n: 1 });
  }
  const inner = runs.slice(1, -1);
  const ctx = JSON.stringify(runs);
  assert(
    runs.every((r) => r.k === 'a' || r.k === 'u'),
    `só as cores dos dois afixos: ${ctx}`,
  );
  assert(inner.length >= 3, `o contorno deveria alternar com Ígneo + Invocador: ${ctx}`);
  assert(
    inner.every((r) => Math.abs(r.n - SWAP_FRAMES) <= 1),
    `troca a cada 600 ms: ${ctx}`,
  );

  s = await g.open(QUERY.replace('bossAffix=igneo', 'bossAffix=sangue'));
  s = await g.step(500);
  assert(s.boss && s.boss.outline === null, `sem contorno com Sangue: ${JSON.stringify(s.boss?.outline)}`);
}
