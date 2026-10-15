// Cenário 2 do `power.smoke.mjs` (POW-07, POW-08, POW-09, POW-13): cada ponto de força muda o soco forte no jogo vivo.
// Não é um cenário (o runner só roda `*.smoke.mjs`); fica à parte para o `power.smoke` caber no teto de linhas.
import { makeKit } from './fight-kit.mjs';

const BASE = 'hd=1&area=modular&enemyGuard=0&noshop=1';
/** Build de 8 pontos sem `forca` (POW-07.1): Manoplas Nv 3 (6) e Punho Pesado (2). */
const EIGHT_POINTS = 'arsenal=manoplas,manoplas,manoplas&perks=punhoPesado';
/** Quadros lidos depois do acerto do forte, com o hitstop de 90 ms e o deslize inteiros dentro. */
const PUSH_FRAMES = 40;
/** Quadros depois do acerto em que o tremor do impacto conta (90 ms de tremor, com folga; depois o inimigo pode bater). */
const SHAKE_FRAMES = 10;
const near = (a, b) => Math.abs(a - b) < 1e-9;

/**
 * Encosta no inimigo, dá a cotovelada (forte) e devolve o maior deslocamento do inimigo atingido nos quadros depois
 * do acerto, medido a partir de onde ele estava no quadro do acerto; também o rastro mais largo do golpe, o maior
 * `slide.remainingPx` do atingido, o maior `hitstop.remainingMs` desde o acerto, o `fx.lastImpact`, a maior distância
 * do tranco da câmera (`camera.kickPx`) e se a câmera tremeu logo depois do acerto (POW-08, POW-09).
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
  let kickPx = s.camera.kickPx;
  let shook = s.camera.shaking;
  let push = 0;
  for (let f = 0; f < PUSH_FRAMES; f++) {
    s = await kit.frame();
    for (const t of s.fx.trails) trailPx = Math.max(trailPx, t.widthPx);
    hitstopMs = Math.max(hitstopMs, s.hitstop.remainingMs);
    kickPx = Math.max(kickPx, s.camera.kickPx);
    if (f < SHAKE_FRAMES) shook ||= s.camera.shaking;
    const e = s.enemies.find((x) => x.id === hit.id);
    if (e) push = Math.max(push, Math.abs(e.x - x0));
    if (e?.slide) slidePx = Math.max(slidePx, e.slide.remainingPx);
  }
  return { power: s.power, push, state: hit.state, trailPx, slidePx, hitstopMs, lastImpact, kickPx, shook };
}

/**
 * POW-07/08/09/13: Manoplas Nv 3 e Punho Pesado são 8 pontos, patamar 3 e escala 1,4 no snapshot, e o forte empurra o
 * inimigo mais longe que sem build (a força do golpe ×1,24 pelo `strikeMods`), com o rastro 4 px mais largo, o
 * deslize 24 % maior, o hitstop partindo de 90 + 30 ms, o tranco de 4 + 0,3 × 8 px, o tremor do patamar 2 em diante e o
 * impacto pintado com o tom do patamar 3.
 */
export async function strikeForceScales(ctx) {
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
    p.points === 8 && p.tier === 3 && near(p.impactScale, 1.4) && p.hitstopBonusMs.heavy === 30,
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
    near(plain.kickPx, 4) && near(built.kickPx, 4 + 0.3 * 8),
    `POW-08.4: o tranco deveria andar 4 px sem build e 6,4 px com 8 pontos: ${plain.kickPx} e ${built.kickPx}`,
  );
  assert(
    !plain.shook && built.shook,
    `POW-08.9: só o patamar 2 ou mais treme a câmera no forte: sem build ${plain.shook}, com 8 pontos ${built.shook}`,
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
