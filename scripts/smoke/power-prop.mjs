// Cenário 6 do `power.smoke.mjs` (POW-11): o golpe com o bastão vinculado leva o bônus da build e não gasta o Passo
// sombrio. Não é um cenário (o runner só roda `*.smoke.mjs`); fica à parte para o `power.smoke` caber no teto de linhas.
import { makeKit } from './fight-kit.mjs';

const BASE = 'hd=1&area=modular&enemyGuard=0&noshop=1';
/**
 * Quadros depois do começo de um preparo novo do inimigo em que a esquiva sai rumo a ele: o golpe dele abre no quadro
 * 26 e a invencibilidade da esquiva cobre 11 quadros (180 ms). Para trás, o dash tiraria o player do alcance e o golpe
 * não chegaria. Cada tentativa que falha tenta o quadro seguinte da lista.
 */
const DODGE_FRAMES = [24, 22, 26];

/** Encosta no inimigo, bate com o objeto na mão e devolve o snapshot do acerto e a vida que o inimigo perdeu. */
async function clubHit(kit, assert, where) {
  let s = await kit.approach();
  const held = s.worldProps.find((p) => p.state === 'held');
  assert(held?.key === 'boundClub', `${where}: o bastão deveria estar na mão: ${JSON.stringify(s.worldProps)}`);
  const hpBefore = new Map(s.enemies.map((e) => [e.id, e.hp]));
  await kit.down('KeyJ');
  let lost = 0;
  for (let f = 0; f < 40 && lost === 0; f++) {
    s = await kit.frame();
    if (f === 3) await kit.up('KeyJ');
    lost = s.enemies.reduce((sum, e) => sum + Math.max(0, (hpBefore.get(e.id) ?? e.hp) - e.hp), 0);
  }
  await kit.up('KeyJ');
  assert(
    lost > 0,
    `${where}: o bastão deveria acertar: ${JSON.stringify(s.enemies.map((e) => [e.id, e.hp, e.state]))}`,
  );
  return { s, lost };
}

/** Esquiva perfeita no golpe do inimigo até o Passo sombrio armar (BLD-06); devolve o snapshot armado. */
async function armShadow(kit, assert) {
  let s = null;
  for (const at of DODGE_FRAMES) {
    await kit.waitQuiet();
    s = await kit.approach(30);
    for (let f = 0; f < 300 && kit.nearest(s).ai === 'windup'; f++) s = await kit.frame();
    for (let f = 0; f < 300 && kit.nearest(s).ai !== 'windup'; f++) s = await kit.frame();
    const toward = kit.nearest(s).x > s.player.x ? 'KeyD' : 'KeyA';
    for (let f = 0; f < at; f++) await kit.frame();
    await kit.down(toward);
    await kit.down('Space');
    s = await kit.frame();
    await kit.up('Space');
    for (let f = 0; f < 40 && !s.build.shadowArmed; f++) {
      s = await kit.frame();
      if (f === 6) await kit.up(toward);
    }
    await kit.up(toward);
    if (s.build.shadowArmed) return kit.waitQuiet();
  }
  assert(false, `a esquiva perfeita deveria armar o Passo sombrio: ${JSON.stringify(s?.build)}`);
  return s;
}

/**
 * POW-11.1/11.2: o golpe do bastão causa X sem build e `round(X × 1,3)` com Manoplas Nv 3 (o `meleeMul` do golpe forte
 * vale para o objeto); com o Passo sombrio armado o golpe do bastão causa X de novo e o deixa armado.
 */
export async function propDamageScales(ctx) {
  const { assert } = ctx;
  const kit = makeKit(ctx);
  await kit.boot(`${BASE}&arsenal=bastao&perks=`);
  const plain = await clubHit(kit, assert, 'sem build');
  await kit.boot(`${BASE}&arsenal=bastao,manoplas,manoplas,manoplas&perks=`);
  const built = await clubHit(kit, assert, 'Manoplas Nv 3');
  assert(
    built.lost === Math.round(plain.lost * 1.3),
    `POW-11.1: com Manoplas Nv 3 o bastão deveria causar round(${plain.lost} × 1,3): ${built.lost}`,
  );

  await kit.boot(`${BASE}&arsenal=bastao&perks=passoSombrio`);
  await armShadow(kit, assert);
  const shadow = await clubHit(kit, assert, 'Passo sombrio armado');
  assert(
    shadow.lost === plain.lost && shadow.s.build.shadowArmed,
    `POW-11.2: o golpe do bastão não gasta o Passo sombrio: ${shadow.lost} contra ${plain.lost}, ${JSON.stringify(shadow.s.build)}`,
  );
}
