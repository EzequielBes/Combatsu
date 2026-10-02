// Aparências e reações do inimigo comum (EVR-04/05/06, HRX-02/04/05/06) com `?debug&seed=1&enemyGuard=0` (L-042: sem guarda
// o golpe sempre conecta). Lê `enemies[].variant/frame/spriteVisible/ragdollVisible/ragdollTextures` e `hitstop` do snapshot.
// Os valores vêm da spec: frames `hurt-<reação>-0` logo após o golpe, `impact` durante o hitstop, ragdoll só depois dele.
import { makeKit } from './fight-kit.mjs';
import { Rng } from '../../src/core/rng.ts';
import { pickEnemyVariant } from '../../src/core/enemyVariant.ts';

export default async function (ctx) {
  const { page, baseUrl, assert } = ctx;
  const { snap, frame, down, up, tap, count, boot, nearest, approach } = makeKit(ctx);
  const dist = (s) => Math.abs(nearest(s).x - s.player.x);
  const byId = (s, id) => s.enemies.find((e) => e.id === id);
  const VARIANTS = ['corcunda', 'rastejante', 'bruto'];
  const until = async (s0, pred, max, what) => {
    let s = s0;
    for (let i = 0; i < max && !pred(s); i++) s = await frame();
    assert(pred(s), `${what}: não aconteceu em ${max} frames (${JSON.stringify({ hp: s.player.hp, move: s.player.move, px: s.player.x, fc: s.player.facing, en: s.enemies.map((x) => [x.id, x.state, x.hp, x.frame, x.x]) })})`);
    return s;
  };

  /** Abre a run com outra seed (o `boot` do kit fixa seed=1). */
  const bootSeed = async (seed) => {
    await page.goto(`${baseUrl}?debug&seed=${seed}&enemyGuard=0&noshop=1`, { waitUntil: 'load' });
    await page.waitForFunction(
      () => {
        try {
          return typeof window.__game.snapshot === 'function';
        } catch {
          return false;
        }
      },
      { timeout: 15_000 },
    );
    await snap(20);
    await tap('KeyJ');
    const s = await snap(50);
    assert(s.run.state === 'roundActive', `run deveria começar: ${JSON.stringify(s.run)}`);
    return s;
  };

  // --- EVR-05: override `enemyVariant` válido e inválido ---------------------------------------------------------------------------
  /** Passa ~3 s no round 1 e devolve as aparências por id. */
  const spawnSeq = async () => {
    let s = await snap(50);
    for (let i = 0; i < 30; i++) s = await snap(100);
    return s.enemies.map((e) => [e.id, e.variant]);
  };
  await boot('enemyGuard=0&maxAlive=5&enemyVariant=bruto');
  const forced = await spawnSeq();
  assert(forced.length >= 2, `EVR-05: esperava ao menos 2 inimigos: ${JSON.stringify(forced)}`);
  assert(forced.every(([, v]) => v === 'bruto'), `EVR-05: todo inimigo deveria ser bruto: ${JSON.stringify(forced)}`);
  await boot('enemyGuard=0&maxAlive=5');
  const plain = await spawnSeq();
  await boot('enemyGuard=0&maxAlive=5&enemyVariant=zzz');
  const invalid = await spawnSeq();
  assert(invalid.every(([, v]) => VARIANTS.includes(v)), `EVR-05: id inválido deveria cair no sorteio: ${JSON.stringify(invalid)}`);
  assert(JSON.stringify(invalid) === JSON.stringify(plain), `EVR-05: id inválido deveria dar o mesmo sorteio da run normal: ${JSON.stringify({ invalid, plain })}`);

  // --- EVR-04: mesma seed, mesma sequência nas 2 primeiras ondas -----------------------------------------------------------------
  /** Aparências por id das rodadas 1 e 2: mata a rodada 1 com o golpe de teste (tecla 2) e deixa a 2 nascer. */
  const twoRounds = async (seed) => {
    let s = await bootSeed(seed);
    const seen = new Map();
    const note = (st) => st.enemies.forEach((e) => seen.set(e.id, e.variant));
    for (let i = 0; i < 400 && s.run.round < 2; i++) {
      await down('Digit2');
      s = await snap(50);
      await up('Digit2');
      note(s);
      s = await snap(250);
      note(s);
    }
    assert(s.run.round >= 2, `EVR-04: a rodada 2 deveria começar (seed ${seed}): ${JSON.stringify(s.run)}`);
    for (let i = 0; i < 20; i++) {
      s = await snap(100);
      note(s);
    }
    return [...seen.entries()].sort((a, b) => a[0] - b[0]);
  };
  const a1 = await twoRounds(7);
  const a2 = await twoRounds(7);
  assert(a1.length >= 3, `EVR-04: esperava aparências de várias ondas: ${JSON.stringify(a1)}`);
  assert(JSON.stringify(a1.map(([, v]) => v)) === JSON.stringify(a2.map(([, v]) => v)), `EVR-04: mesma seed, sequência diferente: ${JSON.stringify({ a1, a2 })}`);
  // O adaptador usa o stream próprio (`seed ^ 0x6a09e667`), não outro: a sequência por ordem de spawn (ids crescentes; outros objetos também consomem ids) bate com ele.
  const rng = new Rng(7 ^ 0x6a09e667);
  const expected = a1.map(() => pickEnemyVariant(rng));
  assert(JSON.stringify(a1.map(([, v]) => v)) === JSON.stringify(expected), `EVR-04: a sequência deveria vir do stream da aparência: ${JSON.stringify({ a1, expected })}`);
  const all = new Set();
  for (const seed of [1, 2, 3]) for (const [, v] of await twoRounds(seed)) all.add(v);
  assert(all.size >= 2, `EVR-04: o sorteio deveria variar a aparência: ${JSON.stringify([...all])}`);

  // --- HRX-02: reação por golpe, do frame 0 ------------------------------------------------------------------------------------
  await boot('enemyGuard=0');
  let s = await approach();
  const id = nearest(s).id;
  const tdist = (st) => Math.abs(byId(st, id).x - st.player.x);
  const closeIn = async (st) => {
    let cur = st;
    if (tdist(cur) > 34) {
      const key = byId(cur, id).x > cur.player.x ? 'KeyD' : 'KeyA';
      await down(key);
      for (let i = 0; i < 40 && tdist(cur) > 34; i++) cur = await frame();
      await up(key);
      for (let i = 0; i < 6; i++) cur = await frame();
    }
    const dir = byId(cur, id).x > cur.player.x ? 1 : -1;
    if (cur.player.facing !== dir) {
      const k = dir === 1 ? 'KeyD' : 'KeyA';
      await down(k);
      await frame();
      await up(k);
      cur = await frame();
      if (tdist(cur) > 34) cur = await closeIn(cur);
    }
    return cur;
  };
  /** Executa o golpe e devolve o snapshot do frame em que o alvo perdeu vida (a leitura mais cedo possível). */
  const land = async (st, keys, name) => {
    let cur = await closeIn(st);
    const hp0 = byId(cur, id).hp;
    for (const k of keys) await down(k);
    cur = await frame();
    for (const k of keys.slice().reverse()) await up(k);
    assert(cur.player.move === name, `esperava começar ${name}: ${cur.player.move}`);
    return until(cur, (x) => byId(x, id).hp < hp0, 40, `${name} deveria acertar`);
  };
  const settleFresh = async (st) => {
    let cur = st;
    for (let i = 0; i < 60 && cur.player.move !== null; i++) cur = await frame();
    for (let i = 0; i < 18; i++) cur = await frame(); // 300 ms > 260 ms da janela de encadeamento
    for (let i = 0; i < 90 && byId(cur, id).frame.startsWith('hurt'); i++) cur = await frame();
    return cur;
  };
  const settleChain = async (st) => {
    let cur = st;
    for (let i = 0; i < 60 && cur.player.move !== null; i++) cur = await frame();
    return cur;
  };
  const expectFrame = (st, want, req) => {
    const e = byId(st, id);
    assert(e.frame === want, `${req}: esperava o frame ${want} logo após o golpe, veio ${e.frame}`);
    assert(e.spriteVisible && e.ragdollVisible === null, `${req}: o sprite deveria estar visível e sem ragdoll: ${JSON.stringify({ v: e.spriteVisible, r: e.ragdollVisible })}`);
  };
  s = await land(s, ['KeyS', 'KeyJ'], 'socoBaixo');
  expectFrame(s, 'hurt-body-0', 'HRX-02 socoBaixo');
  // O mesmo golpe de novo, com o inimigo ainda na mesma reação: ela recomeça do frame 0 (L-046).
  s = await settleChain(s);
  assert(byId(s, id).frame.startsWith('hurt-body-') && byId(s, id).frame !== 'hurt-body-0', `HRX-02: a 1ª reação deveria ter avançado: ${byId(s, id).frame}`);
  s = await land(s, ['KeyS', 'KeyJ'], 'socoBaixo');
  expectFrame(s, 'hurt-body-0', 'HRX-02 socoBaixo de novo (reinicia a mesma reação)');
  s = await settleFresh(s);
  s = await land(s, ['KeyJ'], 'jab');
  expectFrame(s, 'hurt-head-a-0', 'HRX-02 jab');
  s = await settleFresh(s);
  s = await land(s, ['KeyJ'], 'jab');
  expectFrame(s, 'hurt-head-b-0', 'HRX-02 jab de novo alterna');
  // O `direto` cai sobre o inimigo ainda em reação: a nova começa do frame 0 mesmo assim.
  s = await settleChain(s);
  s = await land(s, ['KeyJ'], 'direto');
  expectFrame(s, 'hurt-head-a-0', 'HRX-02 direto (alterna de novo, reinicia)');
  s = await settleChain(s);
  s = await land(s, ['KeyJ'], 'gancho');
  expectFrame(s, 'hurt-uppercut-0', 'HRX-02 gancho');

  // --- HRX-04: aparado ou quebrado continua em `hurt` --------------------------------------------------------------------------------
  {
    await boot('enemyGuard=0');
    let d = await approach(110);
    for (let i = 0; i < 200 && Math.abs(nearest(d).x - d.player.x) >= 40; i++) d = await frame();
    assert(Math.abs(nearest(d).x - d.player.x) < 40, 'o inimigo deveria chegar a 40 px');
    let f = 0;
    const step = async () => {
      d = await frame();
      f += 1;
    };
    await down('KeyD');
    for (let i = 0; i < 20 && Math.abs(nearest(d).x - d.player.x) > 30; i++) await step();
    await up('KeyD');
    for (let i = 0; i < 6; i++) await step();
    while (f < 24) await step();
    const gameFrames = async (n) => {
      for (let i = 0; i < n; ) {
        await step();
        if (!d.hitstop.frozen) i++;
      }
    };
    for (let i = 1; i <= 3; i++) {
      const before = count(d, 'parry');
      await down('KeyU');
      await step();
      await up('KeyU');
      for (let k = 0; k < 40 && count(d, 'parry') !== before + 1; k++) await step();
      assert(count(d, 'parry') === before + 1, `parry ${i} não aconteceu`);
      for (let k = 0; k < 40 && d.hitstop.frozen; k++) await step();
      const e = nearest(d);
      assert(e.frame === 'hurt', `HRX-04: aparado (parry ${i}) deveria mostrar hurt, veio ${e.frame}`);
      if (i < 3) await gameFrames(48);
    }
    const broken = nearest(d);
    assert(broken.structure.broken, 'o inimigo deveria estar quebrado');
    await step();
    assert(nearest(d).frame === 'hurt', `HRX-04: quebrado deveria seguir em hurt: ${nearest(d).frame}`);
  }

  // --- HRX-05 / EVR-06: golpe forte, pose de impacto no hitstop, ragdoll depois ---------------------------------------------------------
  for (const variant of VARIANTS) {
    await boot(`enemyGuard=0&enemyVariant=${variant}`);
    s = await approach();
    const vid = nearest(s).id;
    await down('KeyK');
    s = await frame();
    await up('KeyK');
    assert(s.player.move === 'chuteFrontal', `esperava chuteFrontal: ${s.player.move}`);
    for (let i = 0; i < 40 && !s.hitstop.frozen; i++) s = await frame();
    assert(s.hitstop.frozen, `HRX-05 (${variant}): o golpe forte deveria disparar hitstop`);
    let frozenFrames = 0;
    while (s.hitstop.frozen && frozenFrames < 60) {
      const e = byId(s, vid);
      assert(e.frame === 'impact', `HRX-05 (${variant}): no hitstop o frame deveria ser impact, veio ${e.frame}`);
      assert(e.spriteVisible === true, `HRX-05 (${variant}): o sprite deveria estar visível no hitstop`);
      assert(e.ragdollVisible === false, `HRX-05 (${variant}): o ragdoll deveria estar escondido no hitstop: ${e.ragdollVisible}`);
      frozenFrames++;
      s = await frame();
    }
    assert(frozenFrames > 0 && !s.hitstop.frozen, `HRX-05 (${variant}): o hitstop deveria acabar (${frozenFrames} frames)`);
    const after = byId(s, vid);
    assert(after.spriteVisible === false && after.ragdollVisible === true, `HRX-05 (${variant}): no primeiro update depois do hitstop o ragdoll deveria aparecer: ${JSON.stringify({ sp: after.spriteVisible, rd: after.ragdollVisible, st: after.state })}`);
    assert(after.variant === variant, `a aparência deveria ser ${variant}: ${after.variant}`);
    assert(Array.isArray(after.ragdollTextures) && after.ragdollTextures.length === 6, `EVR-06 (${variant}): esperava 6 partes: ${JSON.stringify(after.ragdollTextures)}`);
    assert(
      after.ragdollTextures.every((k) => new RegExp(`^rag-(head|torso|limb)-${variant}$`).test(k)),
      `EVR-06 (${variant}): partes deveriam ser rag-<parte>-${variant}: ${JSON.stringify(after.ragdollTextures)}`,
    );
    for (const part of ['head', 'torso', 'limb']) assert(after.ragdollTextures.includes(`rag-${part}-${variant}`), `EVR-06 (${variant}): faltou ${part}`);
  }

  // --- HRX-06: golpe forte sem hitstop (golpe de teste, tecla 2, não passa por onConnect): troca no próximo update ---------------------
  {
    await boot('enemyGuard=0');
    s = await snap(300);
    const ids = s.enemies.map((e) => e.id);
    assert(ids.length >= 1, 'HRX-06: precisa de inimigo');
    await down('Digit2');
    s = await frame();
    await up('Digit2');
    assert(!s.hitstop.frozen, `HRX-06: o golpe de teste não deveria ter hitstop: ${JSON.stringify(s.hitstop)}`);
    const ragdolled = ids.filter((i) => byId(s, i) && byId(s, i).ragdollVisible !== null);
    assert(ragdolled.length >= 1, `HRX-06: o golpe forte deveria derrubar alguém: ${JSON.stringify(s.enemies.map((e) => [e.id, e.state]))}`);
    const next = await frame();
    assert(!next.hitstop.frozen, 'HRX-06: sem hitstop no frame seguinte');
    for (const i of ragdolled) {
      const e = byId(next, i);
      assert(e.ragdollVisible === true && e.spriteVisible === false, `HRX-06: no próximo update o ragdoll deveria aparecer: ${JSON.stringify({ id: i, sp: e.spriteVisible, rd: e.ragdollVisible })}`);
    }
  }
}
