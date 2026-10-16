// Ramos e Despertares do Corpo no jogo vivo (CRP-08 a CRP-13), cenários do `cursed-body.smoke.mjs`. Não é um cenário
// próprio (o runner só roda `*.smoke.mjs`): existe para o smoke caber no teto de 400 linhas.
import { makeKit } from './fight-kit.mjs';
import { BASE, DUMMY_X, walkToDummy } from './cursed-body-kit.mjs';
import { REGEN_PER_FRAME, spendRed } from './cursed-body-fury.mjs';

/** Um ponto fora do dano e da força (Fluxo) leva o Corpo ao Nv 2, onde o `ramo=` é aceito. */
const LEVEL_2 = 'axes=corpo.fluxo:1';
/** Quatro pontos fora do dano e da força levam o Corpo ao Nv 5: com o ramo, o Despertar liga. */
const LEVEL_5 = 'axes=corpo.fluxo:3,corpo.alcance:1';

const impacts = (s, seen) => s.events.slice(seen).filter((e) => e.startsWith('impact:'));

/**
 * Encosta no inimigo mais perto e faz a cadeia `jab → direto → gancho → cotovelada` (J quatro vezes, cada aperto
 * depois do acerto anterior, dentro da janela); devolve os níveis de impacto na ordem e o snapshot do fim.
 */
export async function chain(kit, ctx, strict = true) {
  await kit.approach();
  // Com um comum só espera ele sair do ataque; com 3 algum quase sempre está no preparo, e a espera não acaba.
  if (strict) await kit.waitQuiet();
  let s = await kit.approach();
  const seen = s.events.length;
  for (let k = 0; k < 4; k++) {
    const before = impacts(s, seen).length;
    // O aperto dentro do hitstop do acerto anterior se perde: espera o jogo voltar a andar.
    for (let f = 0; f < 20 && s.hitstop.frozen; f++) s = await kit.frame();
    await kit.tap('KeyJ', 16);
    for (let f = 0; f < 40 && impacts(s, seen).length === before; f++) s = await kit.frame();
  }
  const moves = s.events.slice(seen).filter((e) => e.startsWith('move:'));
  const whole = JSON.stringify(moves) === JSON.stringify(['move:jab', 'move:direto', 'move:gancho', 'move:cotovelada']);
  if (!strict) return { tiers: impacts(s, seen), s, seen, whole };
  ctx.assert(
    JSON.stringify(moves) === JSON.stringify(['move:jab', 'move:direto', 'move:gancho', 'move:cotovelada']),
    `a cadeia deveria sair inteira: ${JSON.stringify({ moves, impacts: impacts(s, seen) })}`,
  );
  return { tiers: impacts(s, seen), s, seen };
}

/**
 * CRP-08.2: com a Cadência o 4º golpe seguido que acerta (a cotovelada) é decisivo e o 3º não; sem ramo (e sem Peso,
 * que já derrubaria e seria decisivo pelo `impactTier`) a mesma cotovelada é `heavy`.
 */
async function cadenceDecisive(ctx) {
  const kit = makeKit(ctx);
  await kit.boot(`${BASE}&${LEVEL_2}&ramo=corpo:a`);
  const on = await chain(kit, ctx);
  await kit.boot(`${BASE}&${LEVEL_2}`);
  const off = await chain(kit, ctx);
  const view = JSON.stringify({ on: on.tiers, off: off.tiers });
  ctx.assert(on.s.build.corpo.branch === 'cadencia', `CRP-14: ramo Cadência: ${JSON.stringify(on.s.build.corpo)}`);
  ctx.assert(on.tiers[2] === 'impact:light' && on.tiers[3] === 'impact:decisive', `CRP-08.2: o 4º é decisivo: ${view}`);
  ctx.assert(off.tiers[3] === 'impact:heavy', `CRP-08.2: sem ramo o 4º é heavy: ${view}`);
}

/**
 * CRP-08.3 (laboratório, porque o boneco não revida e um golpe levado também zeraria): um golpe no ar, de costas
 * para o boneco, zera a contagem da Cadência.
 */
async function cadenceWhiffResets(ctx) {
  const kit = makeKit(ctx);
  let s = await walkToDummy(kit, ctx, `${LEVEL_2}&ramo=corpo:a`, 40);
  await kit.tap('KeyJ', 16);
  for (let f = 0; f < 30 && s.build.corpo.cadence === 0; f++) s = await kit.frame();
  ctx.assert(s.build.corpo.cadence === 1, `o jab que acerta conta 1: ${JSON.stringify(s.build.corpo)}`);
  s = await kit.snap(900);
  await kit.tap('KeyD', 16);
  await kit.tap('KeyJ', 16);
  s = await kit.snap(400);
  ctx.assert(s.player.facing === 1, `o player deveria estar de costas para o boneco: ${s.player.facing}`);
  ctx.assert(s.build.corpo.cadence === 0, `CRP-08.3: o golpe no ar zera a Cadência: ${JSON.stringify(s.build.corpo)}`);
}

/**
 * CRP-09: com o Martelo Negro (Cadência no Nv 5) o decisivo derruba os comuns a até 48 px do acerto e tira 4 % da
 * vida máxima de cada um (evento `martelo:<id>:<dano levado>`, porque o número na tela se funde em 300 ms).
 */
async function blackHammer(ctx) {
  const kit = makeKit(ctx);
  // `mods=vida:5`: a vida a mais segura o player vivo entre os 3 comuns pelas tentativas da cadeia.
  let s = await kit.boot(`${BASE}&maxAlive=3&mods=vida:5&${LEVEL_5}&ramo=corpo:a`);
  ctx.assert(s.build.corpo.awakened === true, `CRP-13: Martelo Negro ligado: ${JSON.stringify(s.build.corpo)}`);
  for (let i = 0; i < 40 && s.enemies.length < 3; i++) s = await kit.snap(300);
  for (let tries = 0; tries < 6; tries++) {
    // Com 3 comuns um deles pode bater no meio da cadeia e cortá-la: tenta de novo.
    const { s: end, seen } = await chain(kit, ctx, false);
    const hits = end.events
      .slice(seen)
      .filter((e) => e.startsWith('martelo:'))
      .map((e) => e.split(':').slice(1).map(Number));
    if (hits.length === 0) continue;
    for (let f = 0; f < 4; f++) s = await kit.frame();
    const view = JSON.stringify({ hits, en: s.enemies.map((e) => [e.id, e.state, e.hp, e.maxHp]) });
    for (const [id, dmg] of hits) {
      const e = s.enemies.find((x) => x.id === id);
      ctx.assert(dmg === Math.round(0.04 * e.maxHp), `CRP-09: o vizinho leva 4 % da vida máxima: ${view}`);
      ctx.assert(e.state === 'ragdollStun' || e.hp === 0, `CRP-09: o vizinho cai: ${view}`);
    }
    return;
  }
  ctx.assert(false, `CRP-09: nenhum vizinho a 48 px em 6 cadeias: ${JSON.stringify(s.enemies.map((e) => e.x))}`);
}

const waveHits = (s, seen) =>
  s.events
    .slice(seen)
    .filter((e) => /^fistWave:\d+:/.test(e))
    .map((e) => e.split(':').slice(1).map(Number));

/**
 * Dá o forte de um alvo (rasteira) no comum mais perto e segue a onda por 30 quadros; devolve o dano do golpe no alvo, os acertos da
 * onda, o `damageNumbers.last` do quadro do acerto da onda e as variações de energia dos quadros sem hitstop.
 */
async function heavyWithWave(kit) {
  let s = await kit.approach();
  const hp0 = new Map(s.enemies.map((e) => [e.id, e.hp]));
  const seen = s.events.length;
  // A rasteira (S+K) é o forte de um alvo só: o chute frontal pegaria os dois comuns juntos e não sobraria alvo à onda.
  await kit.down('KeyS');
  await kit.tap('KeyK', 16);
  await kit.up('KeyS');
  let strike = null;
  let number = null;
  let waveCe = null;
  const ce = [];
  for (let f = 0; f < 40; f++) {
    const prev = s;
    s = await kit.frame();
    ce.push(s.ce.cur - prev.ce.cur);
    const struck = s.enemies.filter((e) => e.hp < (hp0.get(e.id) ?? e.hp));
    if (strike === null && struck.length > 0)
      strike = { ids: struck.map((e) => e.id), damage: hp0.get(struck[0].id) - struck[0].hp };
    if (number === null && waveHits(s, seen).length > 0) {
      number = s.damageNumbers.last;
      waveCe = s.ce.cur - prev.ce.cur;
    }
  }
  return { strike, waves: waveHits(s, seen), number, waveCe, tail: ce.slice(-10), events: s.events.slice(seen) };
}

/**
 * CRP-10, CRP-12: com a Onda do Punho o forte que acerta solta a onda, e o 2º comum, atrás do alvo, leva um número
 * `micro` de `round(0,4 × dano do golpe)`; a onda não gasta energia nem para a regeneração (todo quadro sem hitstop do
 * voo sobe a barra só pela regeneração).
 */
async function fistWave(ctx) {
  const kit = makeKit(ctx);
  let s = await kit.boot(`${BASE}&maxAlive=2&tech=vermelho&${LEVEL_2}&ramo=corpo:b`);
  ctx.assert(s.build.corpo.branch === 'ondaDoPunho', `CRP-14: ramo Onda do Punho: ${JSON.stringify(s.build.corpo)}`);
  for (let i = 0; i < 40 && s.enemies.length < 2; i++) s = await kit.snap(300);
  await spendRed(kit, ctx);
  for (let tries = 0; tries < 8; tries++) {
    await kit.waitQuiet();
    const r = await heavyWithWave(kit);
    const view = JSON.stringify(r);
    ctx.assert(r.events.includes('fistWave:emit'), `CRP-10: o forte que acerta solta a onda: ${view}`);
    const other = r.waves[0];
    if (!r.strike || !other) continue;
    const want = Math.round(0.4 * r.strike.damage);
    ctx.assert(other[1] === want, `CRP-10: o 2º comum leva round(0,4 × ${r.strike.damage}) = ${want}: ${view}`);
    ctx.assert(r.number?.kind === 'micro' && r.number.value === want, `CRP-10: número micro de ${want}: ${view}`);
    ctx.assert(
      r.waves.every(([id]) => !r.strike.ids.includes(id)),
      `CRP-10: a onda não acerta o alvo do golpe: ${view}`,
    );
    const regen = (d) => d > 0 && d <= REGEN_PER_FRAME + 0.01;
    ctx.assert(
      r.waveCe >= 0 && r.waveCe <= REGEN_PER_FRAME + 0.01,
      `CRP-12: o acerto da onda não rende energia: ${view}`,
    );
    ctx.assert(r.tail.every(regen), `CRP-12: a regeneração segue depois da onda: ${view}`);
    return;
  }
  ctx.assert(false, `CRP-10: a onda não chegou ao 2º comum em 8 fortes: ${JSON.stringify(s.enemies.map((e) => e.x))}`);
}

/**
 * Cinco pontos com a Fúria no 3 (o teto dela é o 7º acúmulo) e o Ritmo no 2 (a `recovery` × 0,85 deixa 3 fortes caberem
 * em 1000 ms de jogo): Nv 6, com o ramo o Despertar liga.
 */
const FURY_LEVEL_6 = 'axes=corpo.furia:3,corpo.ritmo:2';
const awakened = (s) => s.hud.banner === 'Punho que Rasga' && Math.abs(s.timeScale - 0.4) < 1e-9;

/** Dá a rasteira no comum mais perto e segue a onda; devolve os acertos dela, os alvos do golpe e o anúncio. */
async function sweepWave(kit) {
  await kit.waitQuiet();
  let s = await kit.approach();
  const hp0 = new Map(s.enemies.map((e) => [e.id, e.hp]));
  const seen = s.events.length;
  await kit.down('KeyS');
  await kit.tap('KeyK', 16);
  await kit.up('KeyS');
  let announced = null;
  let struck = null;
  for (let f = 0; f < 50; f++) {
    s = await kit.frame();
    struck ??= s.enemies.filter((e) => e.hp < (hp0.get(e.id) ?? e.hp)).map((e) => e.id);
    if (struck.length === 0) struck = null;
    if (announced === null && s.events.slice(seen).includes('fistWave:emit')) announced = awakened(s);
  }
  return { waves: waveHits(s, seen), struck: struck ?? [], announced, emitted: announced !== null };
}

/**
 * CRP-11, CRP-13: com o Punho que Rasga (Onda do Punho no Nv 5) a onda atravessa e acerta os 2 comuns atrás do alvo;
 * a 1ª onda da rodada mostra o banner do Despertar com o tempo a 0,4 e a 2ª não.
 */
async function tearingWave(ctx) {
  const kit = makeKit(ctx);
  let s = await kit.boot(`${BASE}&maxAlive=3&mods=vida:5&${LEVEL_5}&ramo=corpo:b`);
  ctx.assert(s.build.corpo.awakened === true, `CRP-13: Punho que Rasga ligado: ${JSON.stringify(s.build.corpo)}`);
  for (let i = 0; i < 40 && s.enemies.length < 3; i++) s = await kit.snap(300);
  const runs = [];
  for (let tries = 0; tries < 8; tries++) {
    const r = await sweepWave(kit);
    if (r.emitted) runs.push(r);
    const view = JSON.stringify(runs);
    if (runs.length === 1) ctx.assert(r.announced === true, `CRP-13: a 1ª onda da rodada anuncia: ${view}`);
    if (runs.length === 2) ctx.assert(r.announced === false, `CRP-13: a 2ª onda da rodada não anuncia: ${view}`);
    const others = new Set(r.waves.map(([id]) => id).filter((id) => !r.struck.includes(id)));
    if (runs.length >= 2 && others.size >= 2) return;
  }
  ctx.assert(false, `CRP-11: a onda deveria atravessar 2 comuns atrás do alvo: ${JSON.stringify(runs)}`);
}

/** Dano do forte com a Fúria 3 no teto (+35 %): `round(12 × 1,35)` = 16 e `round(14 × 1,35)` = 19. */
const HEAVY_AT_FURY_CAP = { chuteFrontal: 16, chuteAlto: 19 };

/**
 * CRP-11 e CRP-12 (laboratório: o boneco não revida, e a Fúria no teto pede 7 acertos sem levar golpe): com a Fúria no
 * teto o forte solta 2 ondas a 100 ms (6 quadros, com 1 de folga); fortes seguidos passam de 4 ondas em 1000 ms e a
 * excedente não sai (`fistWave:capped`), sem mudar o dano do forte. Um forte antes da Fúria gasta o anúncio da rodada,
 * para a câmera lenta não esticar os 100 ms.
 */
async function secondWaveAndCap(ctx) {
  const kit = makeKit(ctx);
  let s = await walkToDummy(kit, ctx, `${FURY_LEVEL_6}&ramo=corpo:b`, 40);
  await kit.tap('KeyK', 16);
  s = await kit.snap(1200);
  for (let k = 0; k < 7; k++) {
    await kit.tap('KeyJ', 16);
    s = await kit.snap(900);
  }
  ctx.assert(
    Math.abs(s.build.corpo.fury.bonus - 0.35) < 1e-9,
    `a Fúria deveria estar no teto: ${JSON.stringify(s.build.corpo)}`,
  );
  const log = [];
  for (let f = 0; f < 90; f++) {
    if (f % 3 === 0) await kit.down('KeyK');
    if (f % 3 === 1) await kit.up('KeyK');
    const prev = s;
    s = await kit.frame();
    // Quadro de jogo: o hitstop congela o relógio de jogo, que mede os 100 ms e a janela do teto.
    if (!s.hitstop.frozen) log.push({ f, e: 'tick', dmg: 0 });
    const dummy = (x) => x.fxlab.dummies.find((d) => d.x === DUMMY_X).hp;
    const fresh = s.events.slice(prev.events.length);
    for (const e of fresh) log.push({ f, e, dmg: dummy(prev) - dummy(s) });
  }
  await kit.up('KeyK');
  // Índice de cada quadro em quadros de jogo (sem os congelados do hitstop).
  const ticks = log.filter((x) => x.e === 'tick').map((x) => x.f);
  const gameFrame = (f) => ticks.filter((t) => t <= f).length;
  const emits = log.filter((x) => x.e === 'fistWave:emit').map((x) => gameFrame(x.f));
  const capped = log.filter((x) => x.e === 'fistWave:capped');
  const view = JSON.stringify({ emits, log: log.filter((x) => !x.e.startsWith('spark') && x.e !== 'tick') });
  ctx.assert(emits.length >= 2 && Math.abs(emits[1] - emits[0] - 6) <= 1, `CRP-11: 2 ondas a 100 ms: ${view}`);
  ctx.assert(capped.length >= 1, `CRP-12: a 5ª onda em 1000 ms não sai: ${view}`);
  const inWindow = emits.some((f) => emits.filter((g) => g >= f && g < f + 60).length > 4);
  ctx.assert(!inWindow, `CRP-12: nunca mais de 4 ondas em 1000 ms: ${view}`);
  // A onda barrada no quadro do próprio forte (não a 2ª, adiada): o forte tira o mesmo que tiraria com a onda.
  const struck = capped.filter((c) => c.dmg > 0);
  ctx.assert(struck.length >= 1, `edge case: um forte deveria ter a onda barrada: ${view}`);
  for (const c of struck) {
    const move = log
      .filter((x) => x.f <= c.f && x.e.startsWith('move:'))
      .pop()
      ?.e.slice(5);
    ctx.assert(c.dmg === HEAVY_AT_FURY_CAP[move], `edge case: o forte da onda barrada tira o mesmo: ${view}`);
  }
}

export async function branchScenarios(ctx) {
  await cadenceDecisive(ctx);
  await cadenceWhiffResets(ctx);
  await blackHammer(ctx);
  await fistWave(ctx);
  await tearingWave(ctx);
  await secondWaveAndCap(ctx);
}
