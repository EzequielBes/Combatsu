// Ataques novos do chefe no jogo vivo, em `?debug&hd=1&area=modular` (AFX-01, CYC-03/05/07/08/11).
// 1º cenário: `round=15&bossArch=oni&bossAffix=none`. O `Boss` monta a IA com `bossTuningFor(spec)`: a fase 2 do Oni
// abre com a Investida Dupla (duas investidas com um preparo curto entre elas, sem descanso, e um `chargeTrail` por
// investida chegando ao `BossAffixFx` pelo `fxSink`) e a fase 3 segue `volley, charge, tripleLeap`, com 3 pousos e as
// ondas de choque só no último. Nenhum ataque novo pede quadro que não existe (o Phaser avisaria "Missing animation").
// As fases avançam com o golpe forte de teste (tecla 2), que o chefe aceita fora da intro e do rugido.
// 2º cenário (CYC-04, CYC-09, CYC-10, BRD-07): `round=5&bossArch=tecela&bossAffix=none`. A fase 2 da Tecelã segue
// `charge, volley, threadRain`: o aviso põe 5 marcas no chão em X do player −96, −48, 0, +48, +96 (presas ao nível), e
// na abertura cada marca vira um fio; o player parado sob o fio do meio perde o dano de projétil do tier uma vez só.
// Capturas do aviso e dos fios abertos em `.fable-out/boss-attacks-threads-*.png`.
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.fable-out');
/** Deslocamentos dos fios a partir do X do player (`BOSS.threadRain.offsets`, CYC-09). */
const THREAD_OFFSETS = [-96, -48, 0, 48, 96];
/** Metade da largura do fio (`BOSS.threadRain.width` = 12). */
const THREAD_HALF_W = 6;

export default async function ({ page, baseUrl, assert }) {
  mkdirSync(OUT_DIR, { recursive: true });
  const missingAnims = [];
  page.on('console', (msg) => {
    if (msg.text().includes('Missing animation')) missingAnims.push(msg.text());
  });
  let s = null;
  const step = (ms) =>
    page.evaluate((m) => {
      window.__game.step(m);
      return window.__game.snapshot();
    }, ms);
  // Um tick fixo por volta: cada transição de estado do chefe aparece num snapshot próprio.
  const tick = () => step(1);

  /** Abre a r`round` com o chefe fixado por `query`, entra na rodada e espera o fim da intro do chefe. */
  const openBoss = async (query) => {
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
    s = await step(50);
    for (let i = 0; i < 20 && !s.boss; i++) s = await step(50);
    assert(s.boss, `o chefe deveria nascer (${query}): ${JSON.stringify(s.run)}`);
    assert(JSON.stringify(s.boss.fx) === '{}', `o chefe nasce sem eventos de vista: ${JSON.stringify(s.boss.fx)}`);
    for (let i = 0; i < 60 && s.boss.state === 'intro'; i++) s = await step(50);
    assert(s.boss.state !== 'intro', 'o chefe não saiu da intro');
  };

  await openBoss('round=15&bossArch=oni&bossAffix=none&finger=0');
  assert(
    s.boss.archetype === 'oni' && s.boss.affixes.length === 0 && !s.boss.finger,
    `chefe fixado errado: ${JSON.stringify(s.boss)}`,
  );

  /** Golpe forte de teste até a fase `phase` começar (rugido); devolve o snapshot do fim do rugido. */
  const pushToPhase = async (phase) => {
    for (let i = 0; i < 200 && s.boss.phase < phase; i++) {
      await page.keyboard.press('Digit2', { delay: 20 });
      s = await step(50);
      assert(s.boss, `o chefe sumiu antes da fase ${phase}`);
    }
    assert(s.boss.phase === phase, `o chefe não chegou à fase ${phase}: ${JSON.stringify(s.boss)}`);
    for (let i = 0; i < 200 && s.boss.state === 'roar'; i++) s = await tick();
    assert(s.boss.state !== 'roar', `o rugido da fase ${phase} não acabou`);
  };

  // --- Fase 2: Investida Dupla (CYC-03, CYC-05) ---------------------------------------------------------------
  await pushToPhase(2);
  // O ciclo recomeça do primeiro ataque na troca de fase: a fase 2 do Oni abre com a Investida Dupla.
  for (let i = 0; i < 400 && !s.boss.attack; i++) s = await tick();
  assert(
    s.boss.phase === 2 && s.boss.attack === 'doubleCharge',
    `a fase 2 do Oni deveria abrir com a Investida Dupla: ${JSON.stringify(s.boss)}`,
  );
  // Observa uma Investida Dupla inteira: as pernas (entradas em `charge`) e o preparo curto entre elas, sem o ataque
  // acabar no meio (o descanso zera o `attack`, então as duas pernas no mesmo ataque provam que não houve descanso). Se a 1ª perna bater na parede (CYC-06, uma perna só), espera a próxima volta do ciclo.
  let dc = null;
  for (let tries = 0; tries < 4 && !dc; tries++) {
    for (let i = 0; i < 1500 && s.boss.attack !== 'doubleCharge'; i++) s = await tick();
    assert(s.boss.attack === 'doubleCharge', `a Investida Dupla não voltou no ciclo: ${JSON.stringify(s.boss)}`);
    const trailsBefore = s.boss.fx.chargeTrail ?? 0;
    const seen = { legs: 0, windupBetween: false, stagger: false };
    let prevState = s.boss.state;
    for (let i = 0; i < 600 && s.boss.attack === 'doubleCharge'; i++) {
      s = await tick();
      if (s.boss.state === 'charge' && prevState !== 'charge') seen.legs++;
      if (seen.legs === 1 && s.boss.state === 'windup' && s.boss.attack === 'doubleCharge') seen.windupBetween = true;
      prevState = s.boss.state;
    }
    seen.stagger = s.boss.state === 'stagger';
    const trails = (s.boss.fx.chargeTrail ?? 0) - trailsBefore;
    if (seen.legs === 1 && seen.stagger) continue; // parede na 1ª perna: outra volta
    dc = { ...seen, trails };
  }
  assert(dc, 'nenhuma Investida Dupla terminou sem parede na 1ª perna');
  assert(dc.legs === 2, `a Investida Dupla deveria ter duas investidas: ${JSON.stringify(dc)}`);
  assert(dc.windupBetween, `entre as duas investidas há um preparo curto: ${JSON.stringify(dc)}`);
  // Um rastro por investida chega ao `BossAffixFx` pelo `fxSink` (IGN-01 pelo caminho do AFX-01).
  assert(dc.trails === 2, `um chargeTrail por investida no fxSink: ${JSON.stringify(dc)}`);

  // --- Fase 3: volley, charge, tripleLeap (CYC-03, CYC-07, CYC-08) --------------------------------------------
  await pushToPhase(3);
  const order = [];
  const seenWaves = new Set();
  for (const p of s.projectiles) if (p.kind === 'shockwave') seenWaves.add(p.id);
  let landings = 0;
  let inTriple = false;
  let tripleDone = false;
  /** Pouso em que cada onda de choque nova apareceu (0 = antes do Salto Triplo). */
  const waveAtLanding = [];
  let prev = s.boss;
  for (let i = 0; i < 4000 && !tripleDone; i++) {
    s = await tick();
    assert(s.boss, 'o chefe sumiu na fase 3');
    const b = s.boss;
    if (b.attack && b.attack !== order[order.length - 1]) order.push(b.attack);
    if (b.attack === 'tripleLeap') inTriple = true;
    if (inTriple && prev.state === 'leap' && b.state !== 'leap') landings++;
    for (const p of s.projectiles) {
      if (p.kind !== 'shockwave' || seenWaves.has(p.id)) continue;
      seenWaves.add(p.id);
      waveAtLanding.push(inTriple ? landings : 0);
    }
    if (inTriple && b.attack !== 'tripleLeap') tripleDone = true;
    prev = b;
  }
  assert(tripleDone, `o Salto Triplo não aconteceu na fase 3: ${JSON.stringify(order)}`);
  assert(
    JSON.stringify(order.slice(0, 3)) === JSON.stringify(['volley', 'charge', 'tripleLeap']),
    `ciclo da fase 3 do Oni deveria abrir com volley, charge, tripleLeap: ${JSON.stringify(order)}`,
  );
  assert(landings === 3, `o Salto Triplo deveria pousar 3 vezes: ${landings}`);
  const tripleWaves = waveAtLanding.filter((n) => n > 0);
  assert(
    tripleWaves.length === 2 && tripleWaves.every((n) => n === 3),
    `as duas ondas de choque saem só no 3º pouso: ${JSON.stringify(waveAtLanding)}`,
  );

  // CYC-11: os ataques novos tocaram só quadros que existem nas folhas do chefe.
  assert(missingAnims.length === 0, `animação inexistente pedida: ${JSON.stringify(missingAnims.slice(0, 3))}`);

  await threadRainScenario({ page, assert, openBoss, pushToPhase, tick, snap: () => s });
}

/**
 * 2º cenário: Chuva de Fios da Tecelã na fase 2 (CYC-04, CYC-09, CYC-10). O player fica parado: o fio do meio cai no X
 * dele. Uma chuva só vale para a conta do dano se o player estava sob um fio, sem invulnerabilidade e sem projétil da
 * rajada em voo na abertura (senão outro golpe poderia somar ou ser somado); até 4 voltas do ciclo.
 */
async function threadRainScenario({ page, assert, openBoss, pushToPhase, tick, snap }) {
  // Viewport do tamanho do canvas HD: a captura sai 1:1.
  await page.setViewport({ width: 1280, height: 720 });
  await openBoss('round=5&bossArch=tecela&bossAffix=none&finger=0');
  // Esconde a lista de controles do debug, que cobre o chão onde as marcas caem.
  await page.keyboard.press('Tab', { delay: 20 });
  let s = snap();
  assert(s.boss.archetype === 'tecela', `chefe fixado errado: ${JSON.stringify(s.boss)}`);
  assert(
    s.boss.threads && s.boss.threads.phase === 'idle' && s.boss.threads.hits === 0,
    `a chuva nasce parada: ${JSON.stringify(s.boss.threads)}`,
  );
  await pushToPhase(2);
  s = snap();
  const widthPx = s.area.widthPx;
  let rain = null;
  for (let tries = 0; tries < 4 && !rain; tries++) {
    for (let i = 0; i < 3000 && s.boss && s.boss.threads.phase !== 'warn'; i++) s = await tick();
    assert(s.boss?.threads.phase === 'warn', `a Chuva de Fios não avisou na fase 2: ${JSON.stringify(s.boss)}`);
    assert(s.boss.attack === 'threadRain', `o aviso dos fios é do ataque threadRain: ${JSON.stringify(s.boss)}`);
    // CYC-09: 5 marcas em X do player + deslocamentos, presas a [0, largura do nível].
    const expected = THREAD_OFFSETS.map((off) => Math.min(widthPx, Math.max(0, s.player.x + off)));
    const xs = s.boss.threads.xs;
    assert(
      xs.length === 5 && xs.every((x, i) => Math.abs(x - expected[i]) <= 3),
      `marcas fora do lugar: ${JSON.stringify({ xs, expected, player: s.player.x })}`,
    );
    if (tries === 0) await shoot(page, 'boss-attacks-threads-warn.png');
    let before = s;
    for (let i = 0; i < 120 && s.boss && s.boss.threads.phase === 'warn'; i++) {
      before = s;
      s = await tick();
      if (tries === 0 && i === 18) await shoot(page, 'boss-attacks-threads-warn-mid.png');
    }
    assert(s.boss?.threads.phase === 'active', `o aviso não virou fios: ${JSON.stringify(s.boss?.threads)}`);
    assert(JSON.stringify(s.boss.threads.xs) === JSON.stringify(xs), 'os fios caem onde as marcas estavam');
    if (tries === 0) await shoot(page, 'boss-attacks-threads-active.png');
    const under = xs.some((x) => Math.abs(x - before.player.x) <= THREAD_HALF_W);
    const clean = !before.player.invulnerable && !before.player.dead && before.projectiles.length === 0;
    let after = s;
    let projectiles = 0;
    for (let i = 0; i < 120 && after.boss && after.boss.threads.phase === 'active'; i++) {
      after = await tick();
      projectiles += after.projectiles.length;
      if (tries === 0 && i === 6) await shoot(page, 'boss-attacks-threads-active-mid.png');
    }
    s = after;
    assert(s.boss?.threads.phase === 'idle', `os fios não fecharam: ${JSON.stringify(s.boss?.threads)}`);
    if (!under || !clean || projectiles > 0) continue;
    rain = {
      hits: s.boss.threads.hits - before.boss.threads.hits,
      hpLoss: before.player.hp - s.player.hp,
      damage: s.boss.threads.damage,
    };
  }
  assert(rain, 'nenhuma Chuva de Fios caiu com o player parado sob um fio e sem outro golpe por perto');
  // CYC-10: um acerto só (um fio por abertura; os vizinhos ficam a 48 px), com o dano de projétil do tier.
  assert(rain.damage > 0 && rain.hits === 1, `o fio acerta o player uma vez: ${JSON.stringify(rain)}`);
  assert(rain.hpLoss === rain.damage, `o player perde o dano de projétil do tier: ${JSON.stringify(rain)}`);
}

/** Desenha o quadro atual e salva a captura em `.fable-out/`. */
async function shoot(page, file) {
  await page.evaluate(() => window.__game.render());
  await page.screenshot({ path: join(OUT_DIR, file) });
}
