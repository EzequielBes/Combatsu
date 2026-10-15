// Eixos do Vermelho pelo debug (VRM-10, VRM-11, VRM-18) no mundo modular em HD, com
// `?debug&hd=1&area=modular&seed=1&maxAlive=3&tech=vermelho`. Cada cenário abre a sua própria página e lê o
// `build.vermelho` do snapshot (nível, pontos, ramo e os números resolvidos).
import { makeKit } from './fight-kit.mjs';

const BASE = 'hd=1&area=modular&maxAlive=3&tech=vermelho';
/** Quadros até a soltura: sinal 165 + carga 225 ms com a Conjuração 2, com folga. */
const CAST_FRAMES = 60;

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

/** Aperta `L` e passa quadros até o `techCast:vermelho`; devolve o snapshot da soltura e os quadros desde o aperto. */
async function castRed(kit, ctx, s0) {
  const seen = s0.events.length;
  await kit.down('KeyL');
  let s = await kit.frame();
  await kit.up('KeyL');
  let frames = 1;
  for (; frames < CAST_FRAMES && !s.events.slice(seen).includes('techCast:vermelho'); frames++) s = await kit.frame();
  ctx.assert(
    s.events.slice(seen).includes('techCast:vermelho'),
    `o Vermelho deveria soltar: ${JSON.stringify(s.tech)}`,
  );
  return { s, frames };
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

export default async function (ctx) {
  await cannon(ctx);
  await scaledOrb(ctx);
  await machineGun(ctx);
  await axisCap(ctx);
  await branch(ctx);
}
