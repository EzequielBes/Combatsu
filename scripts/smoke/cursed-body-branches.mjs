// Ramos e Despertares do Corpo no jogo vivo (CRP-08 a CRP-13), cenários do `cursed-body.smoke.mjs`. Não é um cenário
// próprio (o runner só roda `*.smoke.mjs`): existe para o smoke caber no teto de 400 linhas.
import { makeKit } from './fight-kit.mjs';
import { BASE, walkToDummy } from './cursed-body-kit.mjs';

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
  await kit.waitQuiet();
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
  let s = await kit.boot(`${BASE}&maxAlive=3&${LEVEL_5}&ramo=corpo:a`);
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

export async function branchScenarios(ctx) {
  await cadenceDecisive(ctx);
  await cadenceWhiffResets(ctx);
  await blackHammer(ctx);
}
