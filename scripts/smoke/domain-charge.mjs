// Parte 1 do `domain.smoke.mjs` (DOM-02): a barra do Domínio carrega com o que o jogador acerta. Não é um cenário (o
// runner só roda `*.smoke.mjs`). Lê `domain.charge` do snapshot vivo e os eventos `bodyHit:<golpe>:<alvo>:<dano>`,
// `enemyDied:<id>`, `parry` e `finisher:<id>`.

/** Carga por golpe do moveset, pela força do golpe (DOM-02): o `jab`, o `direto` e o `gancho` são leves. */
const STRIKE_CHARGE = { jab: 1, direto: 1, gancho: 1, cotovelada: 2, chuteFrontal: 2 };

const fresh = (s, seen) => s.events.slice(seen);
const bodyHits = (events) => events.filter((e) => e.startsWith('bodyHit:')).map((e) => e.split(':'));

/**
 * Anda quadro a quadro até `pred(events novos, snapshot)` valer; devolve o snapshot do quadro em que valeu e a carga do
 * quadro anterior (o salto de carga é medido nesse quadro só).
 */
async function frameWhere(kit, pred, max, what) {
  let s = await kit.snap(0);
  let before = s.domain.charge;
  const seen = s.events.length;
  for (let f = 0; f < max; f++) {
    before = s.domain.charge;
    const evBefore = s.events.length;
    s = await kit.frame();
    const now = s.events.slice(evBefore);
    if (pred(now, s)) return { s, before, now, all: fresh(s, seen) };
  }
  throw new Error(`${what}: não aconteceu em ${max} quadros (${JSON.stringify(s.events.slice(-4))})`);
}

/** Toca `J` (fora do hitstop) e devolve o quadro do acerto do golpe do moveset, com a carga antes dele. */
async function strike(kit) {
  let s = await kit.snap(0);
  for (let f = 0; f < 20 && s.hitstop.frozen; f++) s = await kit.frame();
  await kit.down('KeyJ');
  const hit = await frameWhere(kit, (now) => bodyHits(now).length > 0, 40, 'o golpe deveria acertar');
  await kit.up('KeyJ');
  return hit;
}

/** Carga esperada num quadro: o golpe do moveset (um por golpe, mesmo com vários alvos) e +1 por abate. */
function expectedJump(now) {
  const moves = new Set(bodyHits(now).map(([, move]) => move));
  const kills = now.filter((e) => e.startsWith('enemyDied:')).length;
  let sum = kills;
  for (const m of moves) sum += STRIKE_CHARGE[m] ?? 0;
  return sum;
}

/** `jab → direto → gancho → cotovelada` no comum isolado: +1, +1, +1, +2; depois o abate soma +1 no quadro dele. */
async function strikesAndKill(kit, base) {
  await kit.boot(`${base}&domain=santuario&enemyGuard=0`);
  await kit.approach();
  await kit.waitQuiet();
  await kit.approach();
  const moves = [];
  for (const want of ['jab', 'direto', 'gancho', 'cotovelada']) {
    const { s, before, now } = await strike(kit);
    const move = bodyHits(now)[0][1];
    moves.push(move);
    kit.assert(move === want, `a cadeia deveria seguir ${want}: ${JSON.stringify(moves)}`);
    kit.assert(
      s.domain.charge - before === expectedJump(now),
      `${move}: a carga deveria subir ${expectedJump(now)}, subiu ${s.domain.charge - before}`,
    );
  }
  kit.assert(
    (await kit.snap(0)).domain.charge === 5,
    `jab+direto+gancho+cotovelada = 5: ${(await kit.snap(0)).domain.charge}`,
  );
  // Até o comum morrer: no quadro do abate a carga sobe o golpe do quadro (se houver) mais 1.
  const died = (now) => now.some((e) => e.startsWith('enemyDied:'));
  let killed = null;
  for (let i = 0; i < 30 && !killed; i++) {
    await kit.settle();
    await kit.approach();
    const hit = await strike(kit);
    if (died(hit.now)) killed = hit;
    let prev = hit.s;
    for (let f = 0; f < 6 && !killed; f++) {
      const s = await kit.frame();
      const now = s.events.slice(prev.events.length);
      if (died(now)) killed = { s, before: prev.domain.charge, now };
      prev = s;
    }
  }
  kit.assert(killed, 'o comum deveria morrer');
  const jump = killed.s.domain.charge - killed.before;
  kit.assert(
    jump === expectedJump(killed.now),
    `o abate deveria somar 1 ao golpe do quadro: esperava ${expectedJump(killed.now)}, subiu ${jump} (${JSON.stringify(killed.now)})`,
  );
}

/**
 * Um golpe do moveset que acerta dois comuns encostados carrega uma vez (DOM-02.3); tenta até o golpe pegar os dois.
 * SPEC_DEVIATION: a T6 pede um `jab` em 2 comuns, mas o `jab` tem `maxTargets: 1` (`data/moves.ts`) e nunca acerta
 * dois. O mesmo efeito é provado com o `chuteFrontal` (`K`, forte, `maxTargets: 2`): +2 uma vez, não +4.
 */
async function twoTargets(kit, base) {
  await kit.boot(`${base}&domain=santuario&enemyGuard=0&maxAlive=2`);
  for (let attempt = 0; attempt < 25; attempt++) {
    await kit.settle();
    let s = await kit.approach(28);
    for (let f = 0; f < 20 && s.hitstop.frozen; f++) s = await kit.frame();
    const before = s.domain.charge;
    const evBefore = s.events.length;
    await kit.tap('KeyK', 16);
    for (let f = 0; f < 30 && !s.events.slice(evBefore).some((e) => e.startsWith('bodyHit:')); f++)
      s = await kit.frame();
    // Os dois alvos do mesmo golpe chegam no mesmo quadro de contato ou logo depois; nada mais foi apertado.
    for (let f = 0; f < 6; f++) s = await kit.frame();
    const now = s.events.slice(evBefore);
    const targets = new Set(bodyHits(now).map(([, , id]) => id));
    if (targets.size < 2 || now.some((e) => e.startsWith('enemyDied:'))) continue;
    const moves = new Set(bodyHits(now).map(([, move]) => move));
    kit.assert(moves.size === 1 && moves.has('chuteFrontal'), `um golpe só: ${JSON.stringify(now)}`);
    kit.assert(
      s.domain.charge - before === 2,
      `um chuteFrontal em 2 comuns deveria subir 2, subiu ${s.domain.charge - before}: ${JSON.stringify(now)}`,
    );
    return;
  }
  throw new Error('nenhum chuteFrontal pegou dois comuns encostados em 25 tentativas');
}

/** Duelo do `defense.smoke`: o comum chega a menos de 40 px e o jogador cola nele (~15 px), de frente. */
async function duel(kit, query) {
  await kit.boot(query);
  const d = { s: await kit.startDuel(), f: 0 };
  d.step = async () => {
    d.s = await kit.frame();
    d.f += 1;
    return d.s;
  };
  const dist = () => Math.abs(kit.nearest(d.s).x - d.s.player.x);
  await kit.down('KeyD');
  for (let i = 0; i < 20 && dist() > 30; i++) await d.step();
  await kit.up('KeyD');
  for (let i = 0; i < 6; i++) await d.step();
  return d;
}

/** Parry +5 (três seguidos quebram a estrutura) e o finalizador +5, não +7 (DOM-02.3). */
async function parryAndFinisher(kit, base) {
  const d = await duel(kit, `${base}&domain=santuario&enemyGuard=0`);
  while (d.f < 24) await d.step();
  for (let i = 1; i <= 3; i++) {
    const parries = kit.count(d.s, 'parry');
    const before = d.s.domain.charge;
    await kit.down('KeyU');
    await d.step();
    await kit.up('KeyU');
    for (let f = 0; f < 40 && kit.count(d.s, 'parry') === parries; f++) await d.step();
    kit.assert(kit.count(d.s, 'parry') === parries + 1, `parry ${i} deveria sair`);
    kit.assert(d.s.domain.charge - before === 5, `parry ${i}: +5, subiu ${d.s.domain.charge - before}`);
    if (i < 3) for (let n = 0; n < 48;) if (!(await d.step()).hitstop.frozen) n++;
  }
  for (let f = 0; f < 30 && d.s.hitstop.frozen; f++) await d.step();
  for (let n = 0; n < 6;) if (!(await d.step()).hitstop.frozen) n++;
  kit.assert(kit.nearest(d.s).structure.broken, 'o comum deveria estar quebrado antes do finalizador');
  const before = d.s.domain.charge;
  const fins = d.s.events.filter((e) => e.startsWith('finisher:')).length;
  await kit.down('KeyJ');
  await kit.down('KeyK');
  await d.step();
  await kit.up('KeyK');
  await kit.up('KeyJ');
  for (let f = 0; f < 6 && d.s.events.filter((e) => e.startsWith('finisher:')).length === fins; f++) await d.step();
  kit.assert(d.s.events.filter((e) => e.startsWith('finisher:')).length === fins + 1, 'o finalizador deveria sair');
  kit.assert(d.s.domain.charge - before === 5, `finalizador: +5 (não 7), subiu ${d.s.domain.charge - before}`);
}

/** Sem Domínio os mesmos golpes deixam a carga em 0 (DOM-02.5). */
async function noDomain(kit, base) {
  await kit.boot(`${base}&enemyGuard=0`);
  await kit.approach();
  await kit.waitQuiet();
  await kit.approach();
  for (let k = 0; k < 4; k++) await strike(kit);
  const s = await kit.snap(0);
  kit.assert(s.domain.owned === null && s.domain.charge === 0, `sem Domínio a carga fica em 0: ${s.domain.charge}`);
}

export async function chargeFromStrikes(kit, base) {
  await strikesAndKill(kit, base);
  await twoTargets(kit, base);
  await parryAndFinisher(kit, base);
  await noDomain(kit, base);
}
