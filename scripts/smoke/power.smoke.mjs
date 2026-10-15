// Fundação de poder (POW-*) no mundo modular em HD, com `?debug&hd=1&area=modular&seed=1`. Cada parte abre a sua
// própria página; as partes 1 a 4, 6 e 7 do design entram com as tarefas que as ligam.
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
 * `attack` e se a implosão congelou.
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
    tickFrames += o.tickFrames;
    assert(!s.player.dead, 'o player morreu durante o Azul');
  }
  assert(chipIds.size >= 2, `POW-15.9: esperava eventos chip:<id> de vários inimigos: ${[...chipIds].join(',')}`);
  assert(tickFrames >= 3, `POW-04.11: poucos quadros de tique conferidos: ${tickFrames}`);
  assert(implosions >= 1, 'POW-04.10: nenhuma implosão acertou um inimigo');
  assert(windupToAttack.size >= 1, `POW-04.11: nenhum inimigo foi de windup a attack em ${BLUE_TRIES} Azuis`);
}

export default async function (ctx) {
  await blueTicksAsChip(ctx);
}
