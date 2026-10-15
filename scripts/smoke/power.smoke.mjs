// Fundação de poder (POW-*) no mundo modular em HD, com `?debug&hd=1&area=modular&seed=1`. Cada parte abre a sua
// própria página; as partes 6 e 7 do design entram com as tarefas que as ligam.
import { makeKit } from './fight-kit.mjs';

const BASE = 'hd=1&area=modular&enemyGuard=0&noshop=1';
/** Hitstop do golpe forte (90 ms) em quadros de 16 ms, com folga: quadro congelado por golpe no player é explicado. */
const PLAYER_HIT_FRAMES = 8;
/** Tentativas de Azul (recarga de 4000 ms entre elas) até ver um inimigo sair do `windup` para o `attack`. */
const BLUE_TRIES = 4;

const living = (s) => s.enemies.filter((e) => e.hp > 0 && e.state !== 'deadRagdoll' && e.state !== 'dissolving');

/**
 * Um Azul do toque ao fim da implosão, quadro a quadro. Devolve o que os tiques fizeram: ids com `chip:<id>`, quadros
 * de tique conferidos, quadros congelados sem golpe no player por perto, inimigos em `hitstun`, quem foi de `windup` a
 * `attack`, o tipo do último número de dano em cada quadro de tique e se a implosão congelou.
 */
async function castBlue(kit, start) {
  let s = await kit.tap('KeyL');
  const out = {
    cast: !!(s.tech.cast && s.tech.cast.id === 'azul'),
    chipIds: new Set(),
    tickFrames: 0,
    strayFrozen: [],
    hitstun: [],
    windupToAttack: new Set(),
    chipKinds: new Set(),
    implosionFrozen: null,
    implosionHit: false,
  };
  if (!out.cast) return { out, s };
  let eventsSeen = start.events.length;
  let lastPlayerHitFrame = -Infinity;
  let prevHp = s.player.hp;
  const inWindup = new Set();
  let orbSeen = false;
  for (let f = 0; f < 200; f++) {
    const before = s;
    s = await kit.frame();
    if (s.player.hp < prevHp) lastPlayerHitFrame = f;
    prevHp = s.player.hp;
    const fresh = s.events.slice(eventsSeen);
    eventsSeen = s.events.length;
    const orbAlive = s.techObjects.some((o) => o.kind === 'blue');
    const imploded = fresh.includes('blueImplode');
    if (imploded) {
      // POW-04.10: a implosão não tem banda, então o acerto dela ainda congela a cena.
      out.implosionHit = s.enemies.some((e) => {
        const was = before.enemies.find((b) => b.id === e.id);
        return was && e.hp < was.hp;
      });
      out.implosionFrozen = s.hitstop.frozen;
      break;
    }
    if (!orbAlive) {
      if (orbSeen) break;
      continue;
    }
    orbSeen = true;
    const playerHitNear = f - lastPlayerHitFrame <= PLAYER_HIT_FRAMES;
    const chips = fresh.filter((e) => e.startsWith('chip:'));
    for (const c of chips) out.chipIds.add(c.slice('chip:'.length));
    if (chips.length > 0) out.chipKinds.add(s.damageNumbers.last?.kind ?? null);
    if (chips.length > 0 && !playerHitNear) out.tickFrames++;
    if (s.hitstop.frozen && !playerHitNear) out.strayFrozen.push({ f, hitstop: s.hitstop, events: fresh });
    for (const e of s.enemies) {
      if (e.state === 'hitstun') out.hitstun.push({ id: e.id, f });
      if (e.ai === 'windup') inWindup.add(e.id);
      else if (e.ai === 'attack' && inWindup.has(e.id)) out.windupToAttack.add(e.id);
    }
  }
  return { out, s };
}

/** POW-04/15, POW-03: o tique do Azul é chip, a luta segue com 5 inimigos dentro dele e a implosão ainda congela. */
async function blueTicksAsChip(ctx) {
  const { assert } = ctx;
  const kit = makeKit(ctx);
  let s = await kit.boot(`${BASE}&maxAlive=5&tech=azul`);
  // Os inimigos nascem à direita e perseguem: espera os 5 vivos com o mais perto já colado no player.
  for (let i = 0; i < 300; i++) {
    const alive = living(s);
    const ahead = alive.filter((e) => e.x > s.player.x && e.x - s.player.x < 70);
    if (alive.length >= 5 && ahead.length > 0) break;
    s = await kit.snap(50);
  }
  assert(living(s).length >= 5, `esperava 5 inimigos vivos: ${JSON.stringify(s.run)}`);

  const chipIds = new Set();
  const windupToAttack = new Set();
  const chipKinds = new Set();
  let tickFrames = 0;
  let implosions = 0;
  for (let attempt = 0; attempt < BLUE_TRIES && windupToAttack.size === 0; attempt++) {
    for (let i = 0; i < 100 && (s.tech.cast !== null || s.tech.slots[0].cooldownMs > 0); i++) s = await kit.snap(100);
    const res = await castBlue(kit, s);
    s = res.s;
    const o = res.out;
    assert(
      o.cast,
      `Azul deveria ter começado (tentativa ${attempt + 1}): ${JSON.stringify(s.tech)} ce=${JSON.stringify(s.ce)}`,
    );
    assert(
      o.strayFrozen.length === 0,
      `POW-04.11: hitstop num quadro de tique sem golpe no player: ${JSON.stringify(o.strayFrozen.slice(0, 3))}`,
    );
    assert(
      o.hitstun.length === 0,
      `POW-04.11: inimigo em hitstun pelo tique: ${JSON.stringify(o.hitstun.slice(0, 5))}`,
    );
    if (o.implosionHit) {
      assert(o.implosionFrozen === true, 'POW-04.10: a implosão acertou e deveria congelar a cena');
      implosions++;
    }
    for (const id of o.chipIds) chipIds.add(id);
    for (const id of o.windupToAttack) windupToAttack.add(id);
    for (const k of o.chipKinds) chipKinds.add(k);
    tickFrames += o.tickFrames;
    assert(!s.player.dead, 'o player morreu durante o Azul');
  }
  assert(chipIds.size >= 2, `POW-15.9: esperava eventos chip:<id> de vários inimigos: ${[...chipIds].join(',')}`);
  assert(
    chipKinds.size === 1 && chipKinds.has('chip'),
    `POW-06.7: o tique do Azul deveria mostrar o número chip: ${JSON.stringify([...chipKinds])}`,
  );
  assert(tickFrames >= 3, `POW-04.11: poucos quadros de tique conferidos: ${tickFrames}`);
  assert(implosions >= 1, 'POW-04.10: nenhuma implosão acertou um inimigo');
  assert(windupToAttack.size >= 1, `POW-04.11: nenhum inimigo foi de windup a attack em ${BLUE_TRIES} Azuis`);
}

/**
 * POW-05/06: o jab que acerta deixa no snapshot um número `strike` com o dano que o inimigo perdeu; o golpe que o
 * inimigo dá no player não abre número.
 */
async function jabShowsStrikeNumber(ctx) {
  const { assert } = ctx;
  const kit = makeKit(ctx);
  await kit.boot(BASE);
  let s = await kit.approach();
  assert(
    s.damageNumbers.live === 0 && s.damageNumbers.last === null,
    `números antes do jab: ${JSON.stringify(s.damageNumbers)}`,
  );
  const hpBefore = new Map(s.enemies.map((e) => [e.id, e.hp]));
  await kit.down('KeyJ');
  let lost = 0;
  for (let f = 0; f < 40 && lost === 0; f++) {
    s = await kit.frame();
    if (f === 3) await kit.up('KeyJ');
    lost = s.enemies.reduce((sum, e) => sum + Math.max(0, (hpBefore.get(e.id) ?? e.hp) - e.hp), 0);
  }
  await kit.up('KeyJ');
  assert(lost > 0, `o jab deveria acertar: ${JSON.stringify(s.enemies.map((e) => [e.id, e.hp, e.state]))}`);
  const last = s.damageNumbers.last;
  assert(
    last !== null && last.value === lost && last.kind === 'strike' && s.damageNumbers.live === 1,
    `POW-06.7: esperava o número strike de ${lost}: ${JSON.stringify(s.damageNumbers)}`,
  );

  // O número some em 700 ms; depois disso, o golpe do inimigo no player não pode abrir outro.
  s = await kit.waitFor((x) => x.damageNumbers.live === 0, 120, 'o número do jab deveria sumir');
  let prevHp = s.player.hp;
  let playerHit = false;
  for (let f = 0; f < 600 && !playerHit; f++) {
    s = await kit.frame();
    playerHit = s.player.hp < prevHp;
    prevHp = s.player.hp;
  }
  assert(playerHit, `o inimigo deveria acertar o player parado: hp=${s.player.hp}`);
  for (let f = 0; f < 5; f++) s = await kit.frame();
  assert(
    s.damageNumbers.live === 0 && s.damageNumbers.last?.value === lost && s.damageNumbers.last?.kind === 'strike',
    `POW-06.7: golpe de inimigo no player não mostra número: ${JSON.stringify(s.damageNumbers)}`,
  );
}

/** O jab que acerta deixa um número `strike` no livro; devolve o snapshot com ele vivo. */
async function jabNumber(kit, assert, where) {
  let s = await kit.approach();
  const hpBefore = new Map(s.enemies.map((e) => [e.id, e.hp]));
  await kit.down('KeyJ');
  for (let f = 0; f < 40 && s.damageNumbers.live === 0; f++) {
    s = await kit.frame();
    if (f === 3) await kit.up('KeyJ');
  }
  await kit.up('KeyJ');
  const hit = s.enemies.some((e) => e.hp < (hpBefore.get(e.id) ?? e.hp));
  assert(
    hit && s.damageNumbers.live >= 1 && s.damageNumbers.last?.kind === 'strike',
    `${where}: o jab deveria deixar um número vivo: ${JSON.stringify(s.damageNumbers)}`,
  );
  return s;
}

/**
 * POW-06.9 (edge case do reset): com o número do jab vivo o player morre (tecla 3) e começa a run nova; o primeiro
 * snapshot dela já não tem número vivo nem o último tocado (o `clear` zera o livro; sem ele o `last` sobreviveria).
 */
async function runResetClearsNumbers(ctx) {
  const { assert } = ctx;
  const kit = makeKit(ctx);
  await kit.boot(BASE);
  let s = await jabNumber(kit, assert, 'reset');
  await kit.tap('Digit3');
  for (let i = 0; i < 40 && s.run.state !== 'gameOver'; i++) s = await kit.snap(100);
  assert(s.run.state === 'gameOver', `esperava gameOver: ${JSON.stringify(s.run)}`);
  s = await kit.snap(1200);
  assert(
    s.damageNumbers.last !== null,
    `o último número deveria seguir no livro até a run nova: ${JSON.stringify(s.damageNumbers)}`,
  );
  await kit.down('KeyJ');
  for (let f = 0; f < 20 && s.run.state !== 'roundActive'; f++) s = await kit.frame();
  await kit.up('KeyJ');
  assert(s.run.state === 'roundActive' && s.run.round === 1, `a run nova deveria começar: ${JSON.stringify(s.run)}`);
  assert(
    s.damageNumbers.live === 0 && s.damageNumbers.last === null,
    `POW-06.9: a run nova começou com números da anterior: ${JSON.stringify(s.damageNumbers)}`,
  );
}

/**
 * POW-06.9: o número do jab fica no livro até a saída da área; a tecla 2 fecha a onda (sem número), o player cruza o
 * selo aberto e o primeiro snapshot da rodada 2, na área nova, já não tem número vivo nem o último tocado.
 */
async function areaChangeClearsNumbers(ctx) {
  const { assert } = ctx;
  const kit = makeKit(ctx);
  await kit.boot(`${BASE}&modules=beco,parque`);
  let s = await jabNumber(kit, assert, 'troca de área');
  for (let i = 0; i < 600 && s.run.state === 'roundActive'; i++) {
    if (s.enemies.some((e) => e.hp > 0)) await kit.tap('Digit2', 20);
    s = await kit.snap(50);
  }
  assert(s.run.state === 'traverse', `a onda deveria fechar: ${JSON.stringify(s.run)}`);
  assert(
    s.damageNumbers.last !== null,
    `o último número deveria seguir no livro até a saída: ${JSON.stringify(s.damageNumbers)}`,
  );
  const firstArea = s.area.modules.join(',');
  await kit.down('KeyD');
  for (let i = 0; i < 1200 && s.run.round === 1; i++) s = await kit.frame();
  await kit.up('KeyD');
  assert(s.run.round === 2, `a saída deveria levar à rodada 2: ${JSON.stringify(s.run)} x=${s.player.x}`);
  assert(
    s.events.filter((e) => e.startsWith('areaBuilt:')).length === 2,
    `esperava a área nova construída depois de ${firstArea}: ${JSON.stringify(s.events)}`,
  );
  assert(
    s.damageNumbers.live === 0 && s.damageNumbers.last === null,
    `POW-06.9: a área nova começou com números da anterior: ${JSON.stringify(s.damageNumbers)}`,
  );
}

/** Build de 8 pontos sem `forca` (POW-07.1): Manoplas Nv 3 (6) e Punho Pesado (2). */
const EIGHT_POINTS = 'arsenal=manoplas,manoplas,manoplas&perks=punhoPesado';
/** Quadros lidos depois do acerto do forte, com o hitstop de 90 ms e o deslize inteiros dentro. */
const PUSH_FRAMES = 40;

/**
 * Encosta no inimigo, dá a cotovelada (forte) e devolve o maior deslocamento do inimigo atingido nos quadros depois
 * do acerto, medido a partir de onde ele estava no quadro do acerto; também o rastro mais largo do golpe, o maior
 * `slide.remainingPx` do atingido, o maior `hitstop.remainingMs` desde o acerto e o `fx.lastImpact` (POW-08, POW-09).
 */
async function heavyPush(kit, assert, query, label) {
  await kit.boot(`${BASE}&${query}`);
  let s = await kit.approach();
  const hpBefore = new Map(s.enemies.map((e) => [e.id, e.hp]));
  await kit.down('KeyK');
  let hit = null;
  let trailPx = 0;
  for (let f = 0; f < 60 && hit === null; f++) {
    s = await kit.frame();
    if (f === 1) await kit.up('KeyK');
    for (const t of s.fx.trails) trailPx = Math.max(trailPx, t.widthPx);
    hit = s.enemies.find((e) => e.hp < (hpBefore.get(e.id) ?? e.hp)) ?? null;
  }
  await kit.up('KeyK');
  assert(hit !== null, `${label}: a cotovelada deveria acertar: ${JSON.stringify(s.enemies.map((e) => [e.x, e.hp]))}`);
  const x0 = hit.x;
  const lastImpact = s.fx.lastImpact;
  let hitstopMs = s.hitstop.remainingMs;
  let slidePx = hit.slide?.remainingPx ?? 0;
  let push = 0;
  for (let f = 0; f < PUSH_FRAMES; f++) {
    s = await kit.frame();
    for (const t of s.fx.trails) trailPx = Math.max(trailPx, t.widthPx);
    hitstopMs = Math.max(hitstopMs, s.hitstop.remainingMs);
    const e = s.enemies.find((x) => x.id === hit.id);
    if (e) push = Math.max(push, Math.abs(e.x - x0));
    if (e?.slide) slidePx = Math.max(slidePx, e.slide.remainingPx);
  }
  return { power: s.power, push, state: hit.state, trailPx, slidePx, hitstopMs, lastImpact };
}

/**
 * POW-07/08/09/13: Manoplas Nv 3 e Punho Pesado são 8 pontos, patamar 3 e escala 1,4 no snapshot, e o forte empurra o
 * inimigo mais longe que sem build (a força do golpe ×1,24 pelo `strikeMods`), com o rastro 4 px mais largo, o
 * deslize 24 % maior, o hitstop partindo de 90 + 30 ms e o impacto pintado com o tom do patamar 3.
 */
async function strikeForceScales(ctx) {
  const { assert } = ctx;
  const kit = makeKit(ctx);
  const plain = await heavyPush(kit, assert, 'perks=', 'sem build');
  assert(
    plain.power.points === 0 && plain.power.tier === 0 && plain.power.impactScale === 1 && plain.power.aura === 'off',
    `POW-13: sem build o snapshot deveria ler 0 pontos: ${JSON.stringify(plain.power)}`,
  );
  const built = await heavyPush(kit, assert, EIGHT_POINTS, '8 pontos');
  const p = built.power;
  assert(
    p.points === 8 && p.tier === 3 && Math.abs(p.impactScale - 1.4) < 1e-9 && p.hitstopBonusMs.heavy === 30,
    `POW-07/13: esperava 8 pontos, patamar 3 e escala 1,4: ${JSON.stringify(p)}`,
  );
  assert(
    built.push > plain.push + 0.5,
    `POW-08.5: o forte deveria empurrar mais com 8 pontos: ${built.push.toFixed(2)} px (${built.state}) contra ${plain.push.toFixed(2)} px (${plain.state})`,
  );
  assert(
    plain.trailPx > 0 && built.trailPx === plain.trailPx + 4,
    `POW-08.7: o rastro deveria ficar 4 px mais largo: ${built.trailPx} contra ${plain.trailPx}`,
  );
  assert(
    plain.slidePx > 0 && Math.abs(built.slidePx / plain.slidePx - 1.24) < 0.02,
    `POW-08.6: o deslize deveria ser 24 % maior: ${built.slidePx.toFixed(2)} px contra ${plain.slidePx.toFixed(2)} px`,
  );
  assert(
    plain.hitstopMs === 90 && built.hitstopMs === 120,
    `POW-08.8: o hitstop deveria partir de 90 sem build e de 120 com 8 pontos: ${plain.hitstopMs} e ${built.hitstopMs}`,
  );
  assert(
    plain.lastImpact?.tier === 'heavy' && plain.lastImpact.tone === 'c',
    `POW-09: sem build o forte pinta no tom de sempre: ${JSON.stringify(plain.lastImpact)}`,
  );
  assert(
    built.lastImpact?.tier === 'heavy' && built.lastImpact.tone === 'b',
    `POW-09: com 8 pontos o forte pinta no tom do patamar 3: ${JSON.stringify(built.lastImpact)}`,
  );
}

/** Build de 6 pontos (patamar 2): Manoplas Nv 2 (4) e Punho Pesado (2). */
const SIX_POINTS = 'arsenal=manoplas,manoplas&perks=punhoPesado';

/** Espera o player parar no quadro do `idle`; a aura lê o repouso no começo do quadro, então acende no seguinte. */
async function settleIdle(kit, where) {
  const s = await kit.waitFor(
    (x) => x.player.frame.startsWith('idle-'),
    120,
    `${where}: o player deveria parar no idle`,
  );
  return { idle: s, next: await kit.frame() };
}

/** Anda `frames` quadros com a tecla `code` segurada; devolve as auras lidas andando (sem os 2 primeiros quadros). */
async function walk(kit, code, frames) {
  const seen = new Set();
  await kit.down(code);
  let s = null;
  for (let f = 0; f < frames; f++) {
    s = await kit.frame();
    if (f >= 2) seen.add(s.power.aura);
  }
  await kit.up(code);
  return { s, seen };
}

/**
 * POW-10: com 8 pontos a chama do punho acende parado, apaga andando, volta virado para o outro lado no quadro
 * seguinte ao `idle`, apaga lançando técnica e volta depois do `R` sem chama órfã (a cena segue sem erro); com 6
 * pontos (patamar 2) são as brasas.
 */
async function restingHandFlame(ctx) {
  const { assert, page } = ctx;
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const kit = makeKit(ctx);
  await kit.boot(`${BASE}&${EIGHT_POINTS}&tech=vermelho`);
  let { idle, next } = await settleIdle(kit, 'começo');
  assert(
    next.power.aura === 'flame',
    `POW-10.12: parado com 8 pontos a chama deveria acender: ${JSON.stringify(next.power)} ${next.player.frame}`,
  );
  const facing = idle.player.facing;

  // Anda para o lado contrário (para longe do inimigo, que nasce à direita): a chama apaga e o player vira.
  const away = await walk(kit, facing === 1 ? 'KeyA' : 'KeyD', 20);
  assert(
    away.seen.size === 1 && away.seen.has('off'),
    `POW-10.14: andando a aura deveria ficar apagada: ${JSON.stringify([...away.seen])} ${away.s.player.frame}`,
  );
  ({ idle, next } = await settleIdle(kit, 'virado'));
  assert(idle.player.facing === -facing, `o player deveria ter virado: ${idle.player.facing}`);
  assert(
    next.power.aura === 'flame',
    `POW-10 (virar parado): a chama deveria voltar no quadro seguinte ao idle: ${next.power.aura} ${next.player.frame}`,
  );

  // Lançando o Vermelho: a chama apaga enquanto a conjuração trava o player.
  let s = await kit.tap('KeyL');
  const casting = new Set();
  for (let f = 0; f < 60 && s.tech.cast !== null; f++) {
    if (f >= 1) casting.add(s.power.aura);
    s = await kit.frame();
  }
  assert(casting.size > 0, `o Vermelho deveria ter começado: ${JSON.stringify(s.tech)}`);
  assert(
    casting.size === 1 && casting.has('off'),
    `POW-10.14: lançando técnica a aura deveria ficar apagada: ${JSON.stringify([...casting])}`,
  );

  // R reinicia a cena: a aura nasce de novo com o player novo e volta a acender parada, sem erro na página.
  await kit.tap('KeyR');
  s = await kit.snap(50);
  if (s.run.state === 'title') s = await kit.tap('KeyJ');
  ({ next } = await settleIdle(kit, 'depois do R'));
  assert(
    next.power.tier === 3 && next.power.aura === 'flame',
    `POW-10 (R): a chama deveria voltar no player novo: ${JSON.stringify(next.power)} ${JSON.stringify(next.run)}`,
  );
  for (let f = 0; f < 10; f++) s = await kit.frame();
  assert(errors.length === 0, `POW-10 (R): erro na página depois do R: ${errors.join(' | ')}`);

  // Patamar 2: as brasas.
  await kit.boot(`${BASE}&${SIX_POINTS}`);
  ({ next } = await settleIdle(kit, 'patamar 2'));
  assert(
    next.power.tier === 2 && next.power.aura === 'embers',
    `POW-10.12: parado com 6 pontos deveriam ser as brasas: ${JSON.stringify(next.power)}`,
  );
}

export default async function (ctx) {
  await strikeForceScales(ctx);
  await restingHandFlame(ctx);
  await jabShowsStrikeNumber(ctx);
  await runResetClearsNumbers(ctx);
  await areaChangeClearsNumbers(ctx);
  await blueTicksAsChip(ctx);
}
