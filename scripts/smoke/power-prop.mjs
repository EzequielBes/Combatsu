// Cenário 6 do `power.smoke.mjs` (POW-11): o golpe com o bastão vinculado leva o bônus da build, não gasta o Passo
// sombrio e passa pelo impacto amaldiçoado `heavy`, sem a faísca roxa, também no arremesso. Não é um cenário (o runner só roda `*.smoke.mjs`); fica à parte para o `power.smoke` caber no teto de linhas.
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

/** POW-11.4: o acerto de objeto do jogador dispara `impact:heavy` e nenhuma faísca roxa (`spark:prop`). */
function assertCursedImpact(assert, s, eventsBefore, where) {
  const fresh = s.events.slice(eventsBefore);
  assert(
    fresh.includes('impact:heavy') && s.fx.lastImpact?.tier === 'heavy',
    `POW-11.4 (${where}): o objeto deveria bater pelo impacto heavy: ${JSON.stringify(fresh)}, ${JSON.stringify(s.fx.lastImpact)}`,
  );
  assert(!fresh.includes('spark:prop'), `POW-11.4 (${where}): sem a faísca roxa do objeto: ${JSON.stringify(fresh)}`);
}

/** Arremessa o objeto da mão (E) rumo ao inimigo e confere que o acerto que derruba (`knockdown`) passa pelo impacto. */
async function clubThrow(kit, assert) {
  const flying = (snap) => snap.worldProps.some((p) => p.key === 'boundClub' && p.state === 'thrown');
  let s = await kit.approach(60);
  let eventsBefore = 0;
  let hpBefore = new Map();
  const lostHp = (snap) => snap.enemies.some((e) => e.hp < (hpBefore.get(e.id) ?? e.hp));
  // O arremesso só sai fora de golpe, atordoamento e esquiva: tenta a cada 2 quadros até a volta do golpe do bastão acabar.
  for (let tries = 0; tries < 30 && !flying(s) && !lostHp(s); tries++) {
    s = await kit.waitQuiet();
    eventsBefore = s.events.length;
    hpBefore = new Map(s.enemies.map((e) => [e.id, e.hp]));
    await kit.down('KeyE');
    s = await kit.frame();
    await kit.up('KeyE');
    s = await kit.frame();
  }
  assert(flying(s) || lostHp(s), `o bastão deveria sair voando: ${JSON.stringify(s.worldProps.at(-1))}`);
  for (let f = 0; f < 40 && !lostHp(s); f++) s = await kit.frame();
  assert(lostHp(s), `o bastão arremessado deveria acertar: ${JSON.stringify(s.worldProps.at(-1))}`);
  assertCursedImpact(assert, s, eventsBefore, 'arremesso');
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
 * POW-11.1/11.2/11.4: o golpe do bastão causa X sem build e `round(X × 1,3)` com Manoplas Nv 3 (o `meleeMul` do golpe forte
 * vale para o objeto); com o Passo sombrio armado o golpe do bastão causa X de novo e o deixa armado.
 */
export async function propDamageScales(ctx) {
  const { assert } = ctx;
  const kit = makeKit(ctx);
  await kit.boot(`${BASE}&arsenal=bastao&perks=`);
  const plain = await clubHit(kit, assert, 'sem build');
  assertCursedImpact(assert, plain.s, 0, 'golpe');
  await kit.waitQuiet();
  await clubThrow(kit, assert);
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
