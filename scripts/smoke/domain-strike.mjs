// Parte 2 do `domain.smoke.mjs`, acerto (DOM-08, DOM-09): o golpe decisivo da ativação no raio e na fração do Domínio,
// o hitstop, o número de dano, o banner, a guarda, o compromisso da garra e o comum levantando. Não é um cenário (o
// runner só roda `*.smoke.mjs`). Lê `enemies[]`, `player`, `hitstop`, `damageNumbers.last`, `hud.banner` e os eventos
// `domain:<id>`, `armored:<id>` e `enemyDied:<id>` do snapshot vivo.

/** Folga em px em volta da borda do raio: o snapshot dá o centro do corpo, o mesmo que a ativação lê, mas arredondado. */
const EDGE_SLACK = 6;

const alive = (s) => s.enemies.filter((e) => e.hp > 0 && e.state !== 'deadRagdoll' && e.state !== 'dissolving');
const dist = (s, e) => Math.hypot(e.x - s.player.x, e.y - s.player.y);

/** Aperta `P` por um quadro; devolve o snapshot de antes e o do quadro da ativação. */
async function activate(kit) {
  let before = await kit.snap(0);
  // A tecla apertada e solta num quadro congelado se perde (o `Key.onUp` apaga a borda): espera o jogo andar.
  for (let f = 0; f < 30 && before.hitstop.frozen; f++) before = await kit.frame();
  await kit.down('KeyP');
  const s = await kit.frame();
  await kit.up('KeyP');
  const fresh = s.events.slice(before.events.length);
  kit.assert(
    fresh.some((e) => e.startsWith('domain:')),
    `a ativação deveria sair: ${JSON.stringify({ fresh, d: s.domain, run: s.run.state, frozen: before.hitstop })}`,
  );
  return { before, s };
}

/**
 * Espera os comuns vivos (que nascem juntos no mundo modular e chegam em bando) ficarem todos a uma distância entre
 * `lo` e `hi` do player; devolve o snapshot desse quadro.
 */
async function waitBand(kit, lo, hi) {
  let s = await kit.snap(0);
  for (let i = 0; i < 900; i++) {
    const live = alive(s);
    if (live.length > 0 && live.every((e) => dist(s, e) > lo && dist(s, e) < hi)) return s;
    s = await kit.frame();
  }
  throw new Error(`os comuns não ficaram entre ${lo} e ${hi} px: ${JSON.stringify(alive(s).map((e) => dist(s, e)))}`);
}

/** Cada comum vivo antes da ativação: dentro do raio perde `round(fração × maxHp)`, fora não perde nada (L-043). */
function assertRadius(kit, before, s, radius, fraction, label) {
  for (const e of alive(before)) {
    const now = s.enemies.find((x) => x.id === e.id);
    const lost = e.hp - (now ? Math.max(0, now.hp) : 0);
    const want = dist(before, e) <= radius ? Math.max(1, Math.round(fraction * e.maxHp)) : 0;
    kit.assert(
      lost === Math.min(want, e.hp),
      `${label}: comum ${e.id} a ${dist(before, e).toFixed(0)} px deveria perder ${want}, perdeu ${lost}`,
    );
  }
}

/**
 * Santuário: o bando a até 320 px perde `round(0,40 × maxHp)` e, noutra run, o bando a mais de 320 px não perde nada
 * (L-043: o raio e a fração chegam ao motor); hitstop de 150, número `strike` e o banner com o nome (DOM-08, DOM-09).
 */
async function sanctuary(kit, base) {
  await kit.boot(`${base}&domain=santuario&charge=100&maxAlive=3&enemyGuard=0`);
  await waitBand(kit, 320 + EDGE_SLACK, 320 + 4 * EDGE_SLACK);
  let { before, s } = await activate(kit);
  assertRadius(kit, before, s, 320, 0.4, 'Santuário (fora)');
  kit.assert(s.hud.banner === 'Santuário Malevolente', `banner com o nome do Domínio: ${s.hud.banner}`);

  await kit.boot(`${base}&domain=santuario&charge=100&maxAlive=3&enemyGuard=0`);
  await waitBand(kit, 320 - 4 * EDGE_SLACK, 320 - EDGE_SLACK);
  ({ before, s } = await activate(kit));
  assertRadius(kit, before, s, 320, 0.4, 'Santuário (dentro)');
  kit.assert(
    s.hitstop.frozen && Math.abs(s.hitstop.remainingMs - 150) <= 17,
    `hitstop de 150: ${JSON.stringify(s.hitstop)}`,
  );
  const hitOne = alive(before)[0];
  kit.assert(
    s.damageNumbers.last?.kind === 'strike' && s.damageNumbers.last.value === Math.round(0.4 * hitOne.maxHp),
    `número strike com o valor aplicado: ${JSON.stringify(s.damageNumbers.last)}`,
  );
}

/** Amplificação: raio 96 (fora nada; dentro 0,25 e derruba o comum que sobrevive). */
async function amplification(kit, base) {
  await kit.boot(`${base}&domain=amplificacao&charge=100&maxAlive=2&enemyGuard=0`);
  await waitBand(kit, 96 + EDGE_SLACK, 96 + 4 * EDGE_SLACK);
  let { before, s } = await activate(kit);
  assertRadius(kit, before, s, 96, 0.25, 'Amplificação (fora)');

  await kit.boot(`${base}&domain=amplificacao&charge=100&maxAlive=2&enemyGuard=0`);
  await waitBand(kit, 40, 96 - EDGE_SLACK);
  ({ before, s } = await activate(kit));
  assertRadius(kit, before, s, 96, 0.25, 'Amplificação (dentro)');
  let t = s;
  const near = alive(before);
  for (let f = 0; f < 30 && !near.every((e) => t.enemies.find((x) => x.id === e.id)?.state === 'ragdollStun'); f++)
    t = await kit.frame();
  for (const e of near) {
    const now = t.enemies.find((x) => x.id === e.id);
    kit.assert(now?.state === 'ragdollStun', `a Amplificação derruba o comum ${e.id}: ${now?.state}`);
  }
}

/** Sem alvo nenhum: o hitstop de 150 sai do mesmo jeito (DOM-09). */
async function noTarget(kit, base) {
  await kit.boot(`${base}&domain=santuario&charge=100&spawn=0`);
  const { s } = await activate(kit);
  kit.assert(
    s.hitstop.frozen && Math.abs(s.hitstop.remainingMs - 150) <= 17,
    `hitstop sem alvo: ${JSON.stringify(s.hitstop)}`,
  );
  kit.assert(s.hud.banner === 'Santuário Malevolente', `banner sem alvo: ${s.hud.banner}`);
}

/** Comum de guarda levantada (`enemyGuard=1`) leva o acerto inteiro (DOM-08.6). */
async function guardUp(kit, base) {
  await kit.boot(`${base}&domain=santuario&charge=100&enemyGuard=1`);
  await kit.approach();
  await kit.waitQuiet();
  let s = await kit.approach();
  await kit.tap('KeyJ', 16);
  for (let f = 0; f < 30 && !kit.nearest(s).guarding; f++) s = await kit.frame();
  kit.assert(kit.nearest(s).guarding, `o comum deveria levantar a guarda: ${JSON.stringify(kit.nearest(s))}`);
  for (let f = 0; f < 20 && s.hitstop.frozen; f++) s = await kit.frame();
  const { before, s: after } = await activate(kit);
  const e = kit.nearest(before);
  kit.assert(e.guarding, 'a guarda ainda está de pé no quadro da ativação');
  assertRadius(kit, before, after, 320, 0.4, 'guarda levantada');
}

/**
 * O comum que entrou no compromisso da garra leva o acerto sem `armored:<id>` e a garra não fere o player; o mesmo
 * comum golpeado por um `jab` dá `armored:<id>` (CMT-04, os dois lados).
 */
async function committed(kit, base) {
  await kit.boot(`${base}&domain=santuario&charge=100&enemyGuard=0`);
  await kit.approach();
  await kit.waitQuiet();
  await kit.approach();
  const c = await kit.waitCommit();
  const id = kit.nearest(c).id;
  const hp = c.player.hp;
  const { before, s } = await activate(kit);
  let t = s;
  for (let f = 0; f < 60; f++) t = await kit.frame();
  const fresh = t.events.slice(before.events.length);
  kit.assert(!fresh.includes(`armored:${id}`), `a ativação não dá armored:${id}: ${JSON.stringify(fresh)}`);
  kit.assert(t.player.hp === hp, `a garra não sai: vida ${hp} → ${t.player.hp}`);
  assertRadius(kit, before, s, 320, 0.4, 'compromisso');

  await kit.boot(`${base}&domain=santuario&charge=100&enemyGuard=0`);
  await kit.approach();
  await kit.waitQuiet();
  await kit.approach();
  const c2 = await kit.waitCommit();
  const id2 = kit.nearest(c2).id;
  await kit.tap('KeyJ', 16);
  let u = await kit.snap(0);
  for (let f = 0; f < 30 && !u.events.slice(c2.events.length).includes(`armored:${id2}`); f++) u = await kit.frame();
  kit.assert(u.events.slice(c2.events.length).includes(`armored:${id2}`), `o jab no comprometido dá armored:${id2}`);
}

/** O comum levantando leva o acerto (o `tech` passa pelo `refuses` do chão). */
async function gettingUp(kit, base) {
  await kit.boot(`${base}&domain=santuario&charge=100&enemyGuard=0`);
  await kit.approach(80);
  let s = await kit.tap('Digit2', 16);
  for (let f = 0; f < 240 && kit.nearest(s)?.state !== 'gettingUp'; f++) s = await kit.frame();
  kit.assert(kit.nearest(s)?.state === 'gettingUp', `o comum deveria levantar: ${kit.nearest(s)?.state}`);
  const { before, s: after } = await activate(kit);
  const e = alive(before).find((x) => x.state === 'gettingUp');
  const now = after.enemies.find((x) => x.id === e.id);
  const want = Math.min(e.hp, Math.round(0.4 * e.maxHp));
  kit.assert(e.hp - Math.max(0, now.hp) === want, `levantando: perde ${want}, perdeu ${e.hp - Math.max(0, now.hp)}`);
}

/** O comum com 40% do HP ou menos morre e a morte não carrega a barra (edge case). */
async function killNoCharge(kit, base) {
  await kit.boot(`${base}&domain=santuario&charge=100&enemyGuard=0`);
  let s = await kit.snap(0);
  for (let i = 0; i < 30 && kit.nearest(s).hp > Math.round(0.4 * kit.nearest(s).maxHp); i++) {
    await kit.settle();
    await kit.approach();
    await kit.tap('KeyJ', 16);
    s = await kit.snap(100);
  }
  const target = kit.nearest(s);
  kit.assert(target.hp <= Math.round(0.4 * target.maxHp), `o comum deveria estar com 40% ou menos: ${target.hp}`);
  const { before, s: after } = await activate(kit);
  let t = after;
  for (let f = 0; f < 10; f++) t = await kit.frame();
  const fresh = t.events.slice(before.events.length);
  kit.assert(fresh.includes(`enemyDied:${target.id}`), `o comum ${target.id} morre: ${JSON.stringify(fresh)}`);
  kit.assert(t.domain.charge === 0, `a morte pela ativação não carrega: ${t.domain.charge}`);
}

export async function activationStrike(kit, base) {
  await sanctuary(kit, base);
  await amplification(kit, base);
  await noTarget(kit, base);
  await guardUp(kit, base);
  await committed(kit, base);
  await gettingUp(kit, base);
  await killNoCharge(kit, base);
}
