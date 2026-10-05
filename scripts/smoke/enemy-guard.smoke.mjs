// Inimigos que bloqueiam (EBL-02/03/04/05) com `?debug&seed=1&enemyGuard=1` (chance 1: todo inimigo comum parado,
// de frente e a até 60 px levanta a guarda por 600 ms quando o jogador começa um golpe leve) e o contador de combo
// com a nota de estilo no HUD (CMB-03/04/05) com `enemyGuard=0`. Lê `enemies[]`, `events`, `combo` e `hud.combo`.
import { makeKit } from './fight-kit.mjs';

export default async function (ctx) {
  const { assert, frame, down, up, count, boot, nearest, approach } = makeKit(ctx);
  const dist = (s) => Math.abs(nearest(s).x - s.player.x);
  const tapFrame = async (code) => {
    await down(code);
    const s = await frame();
    await up(code);
    return s;
  };
  /** Passa frames até `pred(snapshot)`; falha se não acontecer em `max` frames. */
  const until = async (s0, pred, max, what) => {
    let s = s0;
    for (let i = 0; i < max && !pred(s); i++) s = await frame();
    assert(
      pred(s),
      `${what}: não aconteceu em ${max} frames (${JSON.stringify({ hp: s.player.hp, move: s.player.move, combo: s.combo, px: s.player.x, f: s.player.facing, en: s.enemies.map((x) => [x.x, x.y, x.state, x.hp]) })})`,
    );
    return s;
  };

  // --- EBL-02, EBL-03, EBL-05: leve bloqueado, forte passa e derruba a guarda -------------------------------------------------
  await boot('enemyGuard=1');
  let s = await approach();
  const id = nearest(s).id;
  const hp0 = nearest(s).hp;
  const blocks0 = count(s, `enemyBlock:${id}`);
  await tapFrame('KeyJ'); // jab: começa um golpe leve, o inimigo levanta a guarda
  s = await until(await frame(), (st) => count(st, `enemyBlock:${id}`) === blocks0 + 1, 30, 'EBL-02 enemyBlock');
  let e = s.enemies.find((x) => x.id === id);
  assert(e.guarding, `EBL-02: o inimigo deveria estar guardando no frame do bloqueio: ${JSON.stringify(e)}`);
  assert(e.hp === hp0, `EBL-02: leve de frente na guarda deveria dar 0 de dano, hp ${hp0} -> ${e.hp}`);
  assert(e.structure.cur === 8, `EBL-02: o bloqueio deveria somar 8 de estrutura: ${JSON.stringify(e.structure)}`);
  for (let i = 0; i < 3; i++) s = await frame();
  assert(count(s, `enemyBlock:${id}`) === blocks0 + 1, `EBL-02: exatamente um enemyBlock:${id} por golpe`);
  // EBL-03/05: um forte apertado na recovery do jab vira a joelhada (12, forte); a guarda cai e o dano é cheio.
  for (let i = 0; i < 4; i++) s = await frame();
  assert(s.player.move === 'jab', `o jab deveria estar na recovery: ${s.player.move}`);
  assert(s.enemies.find((x) => x.id === id).guarding, 'a guarda de 600 ms ainda deveria estar de pé');
  await tapFrame('KeyK');
  let prev = s;
  s = await frame();
  for (let i = 0; i < 40 && s.enemies.find((x) => x.id === id).hp === hp0; i++) {
    prev = s;
    s = await frame();
  }
  e = s.enemies.find((x) => x.id === id);
  assert(prev.enemies.find((x) => x.id === id).guarding, 'EBL-03: a guarda deveria estar de pé até o forte acertar');
  assert(hp0 - e.hp === 12, `EBL-03: o forte de frente deveria causar o dano cheio (12), causou ${hp0 - e.hp}`);
  assert(!e.guarding, `EBL-05: a guarda deveria cair no frame do forte: ${JSON.stringify(e)}`);
  assert(count(s, `enemyBlock:${id}`) === blocks0 + 1, 'EBL-03: o forte não deveria virar enemyBlock');

  // --- EBL-04: o chute carregado passa pela guarda com dano cheio e +40 de estrutura ---------------------------------------------
  await boot('enemyGuard=1');
  s = await approach(120);
  s = await until(s, (st) => dist(st) < 85, 200, 'inimigo se aproximando');
  const cid = nearest(s).id;
  assert(dist(s) > 60, `o chute frontal inicial não pode alcançar o inimigo: dist=${dist(s)}`);
  await down('KeyK'); // chuteFrontal no vazio; K segue segurado para o carregado
  s = await frame();
  assert(s.player.move === 'chuteFrontal', `K deveria começar o chuteFrontal: ${s.player.move}`);
  s = await until(s, (st) => st.player.move === null, 60, 'fim do chuteFrontal');
  assert(dist(s) < 60, `o inimigo deveria estar a menos de 60 px para levantar a guarda: dist=${dist(s)}`);
  assert(
    s.enemies.find((x) => x.id === cid).hp === s.enemies.find((x) => x.id === cid).maxHp,
    'o chuteFrontal inicial não deveria ter acertado',
  );
  await down('KeyJ'); // jab: levanta a guarda
  s = await frame();
  await up('KeyJ');
  await up('KeyK'); // solta o K depois de mais de 400 ms: o carregado sai quando o jab acabar
  let last = s;
  let hit = false;
  for (let i = 0; i < 100 && !hit; i++) {
    const before = s;
    s = await frame();
    last = before;
    hit = s.enemies.find((x) => x.id === cid).hp < before.enemies.find((x) => x.id === cid).hp;
  }
  assert(hit, `EBL-04: o chuteCarregado deveria acertar o inimigo (move=${s.player.move})`);
  const before = last.enemies.find((x) => x.id === cid);
  const after = s.enemies.find((x) => x.id === cid);
  assert(
    s.player.move === 'chuteCarregado',
    `EBL-04: o golpe que acertou deveria ser o chuteCarregado: ${s.player.move}`,
  );
  assert(
    before.guarding,
    `EBL-04: o inimigo deveria estar guardando quando o carregado acertou: ${JSON.stringify(before)}`,
  );
  assert(
    before.hp - after.hp === 24,
    `EBL-04: o carregado deveria causar o dano cheio (24), causou ${before.hp - after.hp}`,
  );
  assert(
    after.structure.cur - before.structure.cur === 40,
    `EBL-04: o carregado deveria somar 40 de estrutura: ${before.structure.cur} -> ${after.structure.cur}`,
  );
  assert(
    count(s, `enemyBlock:${cid}`) === count(last, `enemyBlock:${cid}`),
    'EBL-04: o carregado não deveria virar enemyBlock (o jab antes dele pode ter sido bloqueado, o carregado não)',
  );

  // --- Combo e nota de estilo (CMB-03, CMB-04, CMB-05) -----------------------------------------------------------------------------
  await boot('enemyGuard=0');
  s = await approach();
  const cmbId = nearest(s).id;
  // AI-04 -> CMT-03/04: o inimigo que já decidiu atacar não é cancelado pelo primeiro golpe do combo: ele bate de volta e tira vida
  // do jogador (o `hp` do combo deixaria de ser 100). Para o combo começar no descanso do inimigo (800 ms), o jogador segura a
  // guarda e deixa o primeiro golpe dele ser bloqueado ou aparado antes (sem dano).
  {
    const swings0 = count(s, 'block') + count(s, 'parry');
    await down('KeyU');
    s = await until(
      s,
      (st) => count(st, 'block') + count(st, 'parry') > swings0,
      80,
      'o primeiro golpe do inimigo deveria ser bloqueado ou aparado',
    );
    await up('KeyU');
    s = await until(s, (st) => st.player.guard === 'none' && !st.hitstop.frozen, 60, 'guarda baixa');
    assert(s.player.hp === 100, `o bloqueio não deveria custar vida: ${s.player.hp}`);
  }
  /** Vai até o inimigo (até 34 px) e espera o jogador parar; não passa por cima dele. */
  const closeIn = async (st) => {
    let cur = st;
    if (dist(cur) > 34) {
      const key = nearest(cur).x > cur.player.x ? 'KeyD' : 'KeyA';
      await down(key);
      for (let i = 0; i < 40 && dist(cur) > 34; i++) cur = await frame();
      await up(key);
      for (let i = 0; i < 6; i++) cur = await frame();
    }
    return cur;
  };
  /** Executa um golpe e espera o combo subir um acerto. */
  const land = async (st, keys, name) => {
    let cur = await closeIn(st);
    const hits0 = cur.combo.hits;
    for (const k of keys) await down(k);
    cur = await frame();
    for (const k of keys.slice().reverse()) await up(k);
    assert(cur.player.move === name, `esperava começar ${name}: ${cur.player.move}`);
    cur = await until(cur, (x) => x.combo.hits === hits0 + 1, 40, `${name} deveria acertar`);
    assert(cur.player.hp === 100, `o jogador não pode levar dano no meio do combo (${name}): hp=${cur.player.hp}`);
    return cur;
  };
  /** Espera acabar o golpe e a janela de 260 ms de encadeamento, para o próximo aperto ser um golpe novo. */
  const settleFresh = async (st) => {
    let cur = st;
    for (let i = 0; i < 60 && cur.player.move !== null; i++) cur = await frame();
    // 300 ms > 260 ms; caminha até o inimigo nesse tempo, senão o golpe pesado que o lançou deixa a janela de 1500 ms curta demais.
    const key = nearest(cur).x > cur.player.x ? 'KeyD' : 'KeyA';
    let held = false;
    for (let i = 0; i < 90 && (i < 18 || held); i++) {
      if (!held && dist(cur) > 34) {
        await down(key);
        held = true;
      } else if (held && dist(cur) <= 34) {
        await up(key);
        held = false;
      }
      cur = await frame();
    }
    if (held) await up(key);
    return cur;
  };
  /** Espera acabar o golpe (dentro da janela de encadeamento). */
  const settleChain = async (st) => {
    let cur = st;
    for (let i = 0; i < 60 && cur.player.move !== null; i++) cur = await frame();
    return cur;
  };
  const expectGrade = (st, hits, grade, distinct, req) => {
    assert(st.combo.hits === hits, `${req}: combo.hits esperado ${hits}, veio ${st.combo.hits}`);
    assert(
      st.combo.grade === grade,
      `CMB-03: com ${distinct} golpes distintos a nota deveria ser ${grade}, veio ${st.combo.grade}`,
    );
    if (hits >= 2) {
      // CMB-04/05: o HUD mostra `<hits> hits` à direita e a letra da nota embaixo.
      assert(
        st.hud.combo.text === `${hits} hits`,
        `CMB-04: texto do HUD esperado "${hits} hits", veio ${JSON.stringify(st.hud.combo.text)}`,
      );
      assert(
        st.hud.combo.x > 480,
        `CMB-04: o HUD do combo deveria ficar do lado direito da tela (x=${st.hud.combo.x})`,
      );
      assert(
        st.hud.combo.grade === grade,
        `CMB-05: a letra no HUD esperada ${grade}, veio ${JSON.stringify(st.hud.combo.grade)}`,
      );
    } else {
      assert(
        st.hud.combo.text === null && st.hud.combo.grade === null,
        `com ${hits} acerto o HUD do combo deveria estar escondido: ${JSON.stringify(st.hud.combo)}`,
      );
    }
  };

  s = await land(s, ['KeyS', 'KeyJ'], 'socoBaixo');
  expectGrade(s, 1, null, 1, 'CMB-01');
  s = await settleFresh(s);
  s = await land(s, ['KeyJ'], 'jab');
  expectGrade(s, 2, 'D', 2, 'CMB-03');
  s = await settleChain(s);
  s = await land(s, ['KeyJ'], 'direto');
  expectGrade(s, 3, 'C', 3, 'CMB-03');
  s = await settleChain(s);
  s = await land(s, ['KeyJ'], 'gancho');
  expectGrade(s, 4, 'B', 4, 'CMB-03');
  s = await settleChain(s);
  s = await land(s, ['KeyK'], 'chuteFrontal');
  expectGrade(s, 5, 'A', 5, 'CMB-03');
  s = await settleFresh(s);
  s = await land(s, ['KeyS', 'KeyK'], 'rasteira');
  expectGrade(s, 6, 'S', 6, 'CMB-03');
  assert(
    s.enemies.some((x) => x.id === cmbId && x.hp > 0),
    'o alvo do combo deveria seguir vivo',
  );
}
