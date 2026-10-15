// Eixos do Vermelho pelo debug (VRM-10, VRM-11, VRM-18) no mundo modular em HD, com
// `?debug&hd=1&area=modular&seed=1&maxAlive=3&tech=vermelho`. Cada cenário abre a sua própria página e lê o
// `build.vermelho` do snapshot (nível, pontos, ramo e os números resolvidos).
// Os cenários dos ramos e Despertares (4º em diante) moram em `red-branches.mjs`.
import { makeKit } from './fight-kit.mjs';
import { BASE, branchScenarios, castRed } from './red-branches.mjs';

/** VRM-10: Potência 3 e Escala 2 dão o Nv 6, o raio 144 da Escala 2 e o toque 45 da Potência 3. */
async function cannon(ctx) {
  const kit = makeKit(ctx);
  const s = await kit.boot(`${BASE}&axes=vermelho.potencia:3,vermelho.escala:2`);
  const red = s.build.vermelho;
  ctx.assert(
    red !== null,
    `VRM-10: build.vermelho deveria existir com o Vermelho equipado: ${JSON.stringify(s.build)}`,
  );
  ctx.assert(red.level === 6, `VRM-10: Nv 6 com 5 pontos: ${JSON.stringify(red)}`);
  ctx.assert(red.stats.radius === 144, `VRM-03: raio 144 com Escala 2: ${JSON.stringify(red.stats)}`);
  ctx.assert(red.stats.touch === 45, `VRM-03: toque 45 com Potência 3: ${JSON.stringify(red.stats)}`);
  ctx.assert(s.tech.slots[0]?.level === 6, `VRM-02: o slot mostra o nível dos eixos: ${JSON.stringify(s.tech.slots)}`);
}

/**
 * VRM-05 (cenário 2): com Escala 2 o orbe vivo tem o sensor de 8 px e o sprite de 16 texels, lidos do motor (o raio do
 * corpo do Matter e a chave do sprite, L-043), e a esfera da detonação cresce até o raio 144.
 */
async function scaledOrb(ctx) {
  const kit = makeKit(ctx);
  const { s } = await castRed(kit, ctx, await kit.boot(`${BASE}&axes=vermelho.escala:2`));
  const orb = s.techObjects.find((o) => o.kind === 'red');
  ctx.assert(
    orb?.sensorPx === 8 && orb.texture === 'tech-orb-red-16',
    `VRM-05: sensor 8 e textura tech-orb-red-16 com Escala 2: ${JSON.stringify(s.techObjects)}`,
  );
  const done = await kit.waitFor(
    (x) => x.fx.red.sphereR === 144,
    120,
    `VRM-05: a esfera da detonação deveria crescer até 144 (${JSON.stringify(s.fx.red)})`,
  );
  ctx.assert(done.events.includes('redDetonate'), `a detonação deveria emitir redDetonate: ${done.events.slice(-5)}`);
}

/**
 * VRM-10: Recarga 3 e Conjuração 2 armam 2300 ms de recarga no quadro da soltura; o sinal mais a carga, contados em
 * quadros do aperto até o `techCast`, dão os 390 ms (com 1 quadro de folga; sem ponto seriam 600).
 */
async function machineGun(ctx) {
  const kit = makeKit(ctx);
  let s = await kit.boot(`${BASE}&axes=vermelho.recarga:3,vermelho.conjuracao:2`);
  const { stats } = s.build.vermelho;
  ctx.assert(
    stats.cooldownMs === 2300 && stats.signMs + stats.chargeMs === 390,
    `VRM-03: recarga 2300 e sinal mais carga 390: ${JSON.stringify(stats)}`,
  );
  const cast = await castRed(kit, ctx, s);
  s = cast.s;
  ctx.assert(
    Math.abs(cast.frames * 16 - 390) <= 16,
    `VRM-03: sinal mais carga 390 ms pelos eventos: ${cast.frames} quadros (${cast.frames * 16} ms)`,
  );
  // A recarga nasce cheia na soltura e o mesmo quadro já desconta o seu próprio passo (16 ms).
  const cd = s.tech.slots[0].cooldownMs;
  ctx.assert(cd <= 2300 && cd >= 2300 - 20, `VRM-03: recarga 2300 logo depois do techCast: ${cd}`);
}

/** VRM-10: 4 pontos num eixo param no teto de 3. */
async function axisCap(ctx) {
  const kit = makeKit(ctx);
  const s = await kit.boot(`${BASE}&axes=vermelho.potencia:4`);
  const red = s.build.vermelho;
  ctx.assert(red.axes.potencia === 3 && red.level === 4, `VRM-02.3: Potência 4 fica em 3: ${JSON.stringify(red)}`);
}

/** VRM-11: o ponto que chega ao Nv 2 deixa o ramo pendente; VRM-18: `ramo=vermelho:a` grava o Ricochete. */
async function branch(ctx) {
  const kit = makeKit(ctx);
  let s = await kit.boot(`${BASE}&axes=vermelho.potencia:1`);
  ctx.assert(
    s.events.includes('branchPending:vermelho') && s.build.vermelho.branch === null,
    `VRM-11: branchPending:vermelho no Nv 2: ${JSON.stringify({ events: s.events, red: s.build.vermelho })}`,
  );
  s = await kit.boot(`${BASE}&axes=vermelho.potencia:1&ramo=vermelho:a`);
  ctx.assert(s.build.vermelho.branch === 'ricochete', `VRM-18: ramo Ricochete: ${JSON.stringify(s.build.vermelho)}`);
  ctx.assert(s.build.vermelho.awakened === false, `VRM-17: sem Despertar no Nv 2: ${JSON.stringify(s.build.vermelho)}`);
}

/** `HITSTOP_MS.heavy` (`src/data/fx.ts`): o hitstop de um acerto forte de técnica sem bônus. */
const HEAVY_HITSTOP_MS = 90;
/**
 * De onde o player solta o Vermelho para a esquerda no laboratório (bonecos parados em x 232, 312 e 392): o orbe
 * detona pelo alcance ~335 px à esquerda do player, perto de x 370, depois de atravessar o boneco de 392 (o toque) e
 * sem tocar o de 312, que fica no raio de 96 da detonação.
 */
const RING_SPOT_X = 690;

/**
 * VRM-04 (T26): com Potência 3 a detonação desenha 4 anéis (1 mais 3) e o hitstop parte de `HITSTOP_MS.heavy + 30`;
 * o toque não leva bônus. Roda no laboratório (`fxlab`, que usa a sala) porque os bonecos de treino ficam parados: um
 * inimigo comum anda durante a carga e não dá para garantir um alvo intocado no raio da detonação.
 */
async function powerRings(ctx) {
  const kit = makeKit(ctx);
  let s = await kit.boot('hd=1&fxlab&tech=vermelho&axes=vermelho.potencia:3');
  await kit.down('KeyD');
  for (let i = 0; i < 400 && s.player.x < RING_SPOT_X; i++) s = await kit.frame();
  await kit.up('KeyD');
  await kit.down('KeyA');
  await kit.frame();
  await kit.up('KeyA');
  s = await kit.snap(200);
  ctx.assert(s.player.facing === -1, `o player deveria olhar para os bonecos: ${JSON.stringify(s.player)}`);
  ({ s } = await castRed(kit, ctx, s));
  const seen = s.events.length;
  let touch = null;
  let last = s.hitstop.remainingMs;
  for (let i = 0; i < 120 && !s.events.slice(seen).includes('redDetonate'); i++) {
    s = await kit.frame();
    const detonated = s.events.slice(seen).includes('redDetonate');
    if (!detonated && touch === null && s.hitstop.remainingMs > last) touch = s.hitstop.remainingMs;
    last = s.hitstop.remainingMs;
  }
  ctx.assert(touch === HEAVY_HITSTOP_MS, `VRM-04: o toque fica no hitstop forte, sem bônus: ${touch}`);
  ctx.assert(s.events.slice(seen).includes('redDetonate'), `o orbe deveria detonar: ${JSON.stringify(s.techObjects)}`);
  const far = s.fxlab.dummies.find((d) => d.x === 312);
  ctx.assert(far.hp < far.maxHp, `a detonação deveria acertar o boneco intocado: ${JSON.stringify(s.fxlab.dummies)}`);
  ctx.assert(
    s.hitstop.remainingMs === HEAVY_HITSTOP_MS + 30,
    `VRM-04: hitstop da detonação ${HEAVY_HITSTOP_MS} + 30 com Potência 3: ${JSON.stringify(s.hitstop)}`,
  );
  let maxRings = s.fx.red.rings;
  for (let i = 0; i < 60 && maxRings < 4; i++) {
    s = await kit.frame();
    maxRings = Math.max(maxRings, s.fx.red.rings);
  }
  for (let i = 0; i < 20; i++) maxRings = Math.max(maxRings, (s = await kit.frame()).fx.red.rings);
  ctx.assert(maxRings === 4, `VRM-04: 4 anéis de choque com Potência 3: ${maxRings}`);
}

/**
 * VRM-08 (cenário 3): com Perfuração 2 e 3 inimigos juntos, o 1º comum atravessado solta 2 estilhaços `micro` de 9
 * (os multiplicadores valem 1 na rodada 1) nos vizinhos, e nenhum inimigo leva 2 estilhaços na mesma conjuração. O
 * número na tela do vizinho se funde com o do toque quando o orbe chega nele, então o dano vem do evento
 * `redShard:<atravessado>:<alvo>:<dano>` (o que o alvo levou de fato) e a faixa, do `hitstop.microMs`.
 */
// SPEC_DEVIATION: a T27 pedia 2 números `micro` no `damageNumbers`; o dano sai do evento `redShard:`.
// Reason: o número do vizinho se funde com o do toque do orbe (300 ms, o tipo mais forte vence), e o snapshot só traz o
// último número tocado.
async function pierceShards(ctx) {
  const kit = makeKit(ctx);
  let s = await kit.boot(`${BASE}&enemyGuard=0&axes=vermelho.perfuracao:2`);
  for (let i = 0; i < 40 && s.enemies.length < 3; i++) s = await kit.snap(300);
  ctx.assert(s.enemies.length === 3, `três inimigos vivos: ${JSON.stringify(s.enemies.map((e) => e.x))}`);
  s = await kit.approach(90);
  const xs = s.enemies.map((e) => e.x);
  ctx.assert(Math.max(...xs) - Math.min(...xs) <= 60, `os três deveriam estar juntos: ${JSON.stringify(xs)}`);
  const seen = s.events.length;
  ({ s } = await castRed(kit, ctx, s));
  let micro = 0;
  for (let i = 0; i < 120 && !s.events.slice(seen).includes('redDetonate'); i++) {
    s = await kit.frame();
    micro = Math.max(micro, s.hitstop.microMs);
  }
  const shards = s.events
    .slice(seen)
    .filter((e) => e.startsWith('redShard:'))
    .map((e) => e.split(':').slice(1).map(Number));
  const view = JSON.stringify(shards);
  ctx.assert(shards.length >= 2, `VRM-08: o Vermelho deveria soltar estilhaços: ${view}`);
  ctx.assert(
    shards.filter(([from]) => from === shards[0][0]).length === 2,
    `VRM-08: 2 vizinhos no 1º atravessado: ${view}`,
  );
  ctx.assert(
    shards.every(([, , dmg]) => dmg === 9),
    `VRM-08: cada estilhaço tira 9: ${view}`,
  );
  ctx.assert(new Set(shards.map(([, to]) => to)).size === shards.length, `VRM-08: ninguém leva 2 estilhaços: ${view}`);
  ctx.assert(micro > 0, `POW-03: o estilhaço é micro e ganha o hitstop dos micro: ${micro}`);
}

/** VRM-07: 30% da recarga de 2300 ms da Recarga 3. */
const KILL_REFUND_MS = 690;
/** Queda por quadro que já não é o tique normal da recarga (16 ms): só um reembolso passa disso. */
const TICK_SLACK_MS = 20;

/**
 * Solta o Vermelho com Recarga 3 nos três inimigos juntos e devolve as quedas da recarga do slot por quadro, da soltura
 * à detonação, mais quantos inimigos o Vermelho abateu. `weaken`: antes, golpes leves de teste (tecla 1) até todos
 * ficarem com vida que o toque de 30 tira de uma vez.
 */
async function refundRun(ctx, weaken) {
  const kit = makeKit(ctx);
  let s = await kit.boot(`${BASE}&enemyGuard=0&axes=vermelho.recarga:3`);
  for (let i = 0; i < 40 && s.enemies.length < 3; i++) s = await kit.snap(300);
  s = await kit.approach(90);
  for (let i = 0; i < 20 && weaken && s.enemies.some((e) => e.hp > 25); i++) {
    await ctx.page.keyboard.press('Digit1');
    s = await kit.snap(300);
  }
  if (weaken) s = await kit.approach(90);
  const alive = s.enemies.filter((e) => e.hp > 0).length;
  const seen = s.events.length;
  ({ s } = await castRed(kit, ctx, s));
  const drops = [];
  let last = s.tech.slots[0].cooldownMs;
  for (let i = 0; i < 120 && !s.events.slice(seen).includes('redDetonate'); i++) {
    s = await kit.frame();
    drops.push(Math.round(last - s.tech.slots[0].cooldownMs));
    last = s.tech.slots[0].cooldownMs;
  }
  const kills = alive - s.enemies.filter((e) => e.hp > 0).length;
  return { drops: drops.filter((d) => d > TICK_SLACK_MS), kills, view: JSON.stringify({ drops, kills }) };
}

/**
 * VRM-07 (T28): com Recarga 3, o 1º abate da conjuração corta 690 ms da recarga do slot no quadro do abate e os
 * seguintes não devolvem nada; sem abate a recarga só anda o tique normal.
 */
async function killRefund(ctx) {
  const none = await refundRun(ctx, false);
  ctx.assert(none.kills === 0 && none.drops.length === 0, `VRM-07: sem abate a recarga não cai: ${none.view}`);
  const many = await refundRun(ctx, true);
  ctx.assert(many.kills >= 2, `VRM-07: o Vermelho deveria abater 2 ou mais dos fracos: ${many.view}`);
  ctx.assert(
    many.drops.length === 1 && Math.abs(many.drops[0] - KILL_REFUND_MS) <= TICK_SLACK_MS,
    `VRM-07: com ${many.kills} abates a recarga cai ${KILL_REFUND_MS} ms uma vez só: ${many.view}`,
  );
}

export default async function (ctx) {
  await cannon(ctx);
  await scaledOrb(ctx);
  await powerRings(ctx);
  await pierceShards(ctx);
  await killRefund(ctx);
  await machineGun(ctx);
  await axisCap(ctx);
  await branch(ctx);
  await branchScenarios(ctx);
}
