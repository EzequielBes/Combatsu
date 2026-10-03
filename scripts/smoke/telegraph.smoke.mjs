// Telegrafo e ponto de compromisso do inimigo comum (HGT-01..03, HGT-07, HGT-08, HGT-13, EDG-08, CMT-01..08, CMT-10) com
// `?debug&seed=1&maxAlive=1&shove=0` (o kit). Um inimigo isolado ataca o jogador parado: o ciclo é determinístico em frames de
// jogo. `startDuel` devolve o frame `f0` em que a IA começa o preparo; o ponto de compromisso (CMT-01) cai 200 ms (12 frames)
// antes da hitbox, e o preparo do inimigo comum dura 450 ms (27 frames; o porrete soma 150). Lê `enemies[].telegraph`,
// `committed`, `commitFlash`, `ai`, `state`, `attack`, `structure`, `guarding`, `events` e `player.hp` do snapshot vivo.
// Frames de jogo: os passos com o hitstop ligado não contam (o tempo da cena não anda neles).
import { makeKit } from './fight-kit.mjs';

const FRAME_MS = 1000 / 60;
/** Chave da PALETTE do flash de compromisso por tipo de golpe (CMT-02). */
const FLASH = { white: 'w', red: 't', low: 'A' };
const WINDUP_MS = 450;
const CLUB_EXTRA_MS = 150;
const COMMIT_MS = 200;
const JAB_DAMAGE = 6;

export default async function (ctx) {
  const { assert, snap, frame, down, up, count, boot, nearest, startDuel, waitFor, waitCommit } = makeKit(ctx);

  /** HGT-07/HGT-08: o marcador vale o tipo em `windup` e `attack` e é `null` nos outros estados da IA. */
  const checkMarker = (s, kind, label, at) => {
    const e = nearest(s);
    const striking = e.ai === 'windup' || e.ai === 'attack';
    assert(
      e.telegraph === (striking ? kind : null),
      `${label}: HGT-07/08 em ${at} (ai=${e.ai}) o marcador deveria ser ${striking ? kind : null}, veio ${e.telegraph}`,
    );
    return e;
  };

  /**
   * Um ciclo inteiro (preparo, golpe, descanso e o que vem depois) de um inimigo isolado, frame a frame a partir de `f0`.
   * Confere o marcador em todo frame, o ponto de compromisso (12 frames antes do golpe), o flash (5 frames, 80 ms ±1 frame,
   * no frame do compromisso) e o `committed` até o fim do golpe. Devolve os índices medidos (0 = `f0`).
   */
  const cycle = async (query, kind, label, windupMs) => {
    await boot(query);
    // HGT-08: de longe o inimigo persegue (`chase`) e não mostra marcador.
    let s = await snap(0);
    for (let i = 0; i < 3; i++) {
      checkMarker(s, kind, label, `chase ${i}`);
      s = await snap(48);
    }
    s = await startDuel();
    const rows = [];
    const note = (st) => {
      const e = checkMarker(st, kind, label, `frame ${rows.length}`);
      assert(e.attack.kind === kind && e.attack.length === 1, `${label}: attack.kind/length no frame ${rows.length}: ${JSON.stringify(e.attack)}`);
      rows.push({ ai: e.ai, committed: e.committed, flash: e.commitFlash, tele: e.telegraph, index: e.attack.index });
    };
    note(s);
    assert(rows[0].ai === 'windup', `${label}: o f0 deveria ser o primeiro frame de preparo: ${rows[0].ai}`);
    for (let i = 1; i <= 110; i++) {
      s = await frame();
      note(s);
    }
    const attackIdx = rows.findIndex((r) => r.ai === 'attack');
    const commitIdx = rows.findIndex((r) => r.committed);
    const lastAttack = rows.map((r) => r.ai).lastIndexOf('attack');
    assert(attackIdx > 0 && commitIdx > 0, `${label}: o ciclo não chegou ao golpe: ${JSON.stringify(rows.map((r) => r.ai).slice(0, 60))}`);
    // O preparo do inimigo comum dura `windupMs` (27 frames de 450 ms; o porrete 36 de 600 ms).
    assert(Math.abs(attackIdx * FRAME_MS - windupMs) <= FRAME_MS, `${label}: preparo de ${(attackIdx * FRAME_MS).toFixed(0)} ms, esperava ${windupMs}`);
    // CMT-01: `committed` vira `true` com 200 ms de preparo pela frente (12 frames antes do golpe) e não antes.
    assert(attackIdx - commitIdx === COMMIT_MS / FRAME_MS, `${label}: CMT-01 o compromisso deveria vir 12 frames (200 ms) antes do golpe: compromisso ${commitIdx}, golpe ${attackIdx}`);
    assert(rows.slice(0, commitIdx).every((r) => !r.committed), `${label}: CMT-01 committed antes do ponto de compromisso`);
    assert(rows.slice(commitIdx, lastAttack + 1).every((r) => r.committed), `${label}: CMT-01 committed deveria seguir até o fim do golpe`);
    assert(rows[lastAttack + 1].ai === 'rest' && !rows[lastAttack + 1].committed, `${label}: CMT-01 depois do golpe vem o descanso, sem compromisso: ${JSON.stringify(rows[lastAttack + 1])}`);
    // CMT-02: o flash começa no frame do compromisso, tem a cor do tipo e dura 80 ms (5 frames, ±1 frame).
    const flashIdx = rows.map((r, i) => (r.flash !== null ? i : -1)).filter((i) => i >= 0);
    assert(flashIdx.length > 0 && flashIdx[0] === commitIdx, `${label}: CMT-02 o flash deveria começar no frame do compromisso (${commitIdx}): ${JSON.stringify(flashIdx)}`);
    assert(flashIdx.every((i) => rows[i].flash === FLASH[kind]), `${label}: CMT-02 o flash deveria ser ${FLASH[kind]}: ${JSON.stringify(rows.filter((r) => r.flash !== null).map((r) => r.flash))}`);
    assert(flashIdx.every((v, k) => v === commitIdx + k), `${label}: CMT-02 o flash deveria ser contínuo: ${JSON.stringify(flashIdx)}`);
    assert(Math.abs(flashIdx.length * FRAME_MS - 80) <= FRAME_MS && flashIdx.length === 5, `${label}: CMT-02 o flash durou ${flashIdx.length} frames (${(flashIdx.length * FRAME_MS).toFixed(0)} ms), esperava 80 ms (5 frames)`);
    // HGT-07/HGT-08: o ciclo passou por todos os estados que contam.
    assert(rows.filter((r) => r.ai === 'windup').length >= windupMs / FRAME_MS - 1, `${label}: preparo curto demais`);
    assert(rows.filter((r) => r.ai === 'rest').length >= 40, `${label}: o descanso (800 ms) deveria aparecer: ${rows.filter((r) => r.ai === 'rest').length} frames`);
    return { attackIdx, commitIdx };
  };

  // --- HGT-01/02/03, HGT-07/08, HGT-13, EDG-08, CMT-01/02: marcador e flash por tipo --------------------------------------------
  const natural = await cycle('enemyGuard=0&enemyVariant=corcunda', 'white', 'corcunda (HGT-03)', WINDUP_MS);
  await cycle('enemyGuard=0&enemyVariant=rastejante', 'low', 'rastejante (HGT-02)', WINDUP_MS);
  await cycle('enemyGuard=0&enemyVariant=bruto', 'white', 'bruto (HGT-03)', WINDUP_MS);
  await cycle('enemyGuard=0&enemyVariant=rastejante&armed=club&round=3', 'red', 'porrete em rastejante (HGT-01)', WINDUP_MS + CLUB_EXTRA_MS);
  await cycle('enemyGuard=0&enemyVariant=corcunda&enemyAttack=red', 'red', 'enemyAttack=red (HGT-13)', WINDUP_MS);
  await cycle('enemyGuard=0&enemyVariant=corcunda&enemyAttack=low', 'low', 'enemyAttack=low (HGT-13)', WINDUP_MS);
  await cycle('enemyGuard=0&enemyVariant=rastejante&enemyAttack=white', 'white', 'enemyAttack=white em rastejante (HGT-13)', WINDUP_MS);
  await cycle('enemyGuard=0&enemyVariant=rastejante&enemyAttack=RED', 'low', 'enemyAttack=RED inválido (EDG-08)', WINDUP_MS);
  assert(natural.attackIdx === 27 && natural.commitIdx === 15, `o ciclo base deveria ter o golpe no frame 27 e o compromisso no 15: ${JSON.stringify(natural)}`);

  /** Duelo com um passo que conta só os frames de jogo (fora do hitstop) desde `f0`. */
  const duel = async (query) => {
    await boot(query);
    const d = { s: await startDuel(), gf: 0 };
    d.step = async () => {
      d.s = await frame();
      if (!d.s.hitstop.frozen) d.gf += 1;
      return d.s;
    };
    d.tap = async (code) => {
      await down(code);
      await d.step();
      await up(code);
    };
    d.enemy = () => nearest(d.s);
    d.id = d.enemy().id;
    return d;
  };

  // --- CMT-03: golpe leve antes do compromisso cancela o preparo (a garra não sai) -------------------------------------------------
  {
    const d = await duel('enemyGuard=0&enemyVariant=corcunda');
    for (let i = 0; i < 3; i++) await d.step();
    assert(d.enemy().ai === 'windup' && !d.enemy().committed, `CMT-03: o inimigo deveria estar em preparo, antes do compromisso: ${JSON.stringify(d.enemy())}`);
    const hp0 = d.s.player.hp;
    const ehp0 = d.enemy().hp;
    await d.tap('KeyJ');
    assert(d.s.player.move === 'jab', `CMT-03: o jab deveria começar: ${d.s.player.move}`);
    // A janela inteira em que o golpe pendente sairia (preparo de 27 frames de jogo) e mais 18 frames de folga; o preparo novo,
    // depois do hitstun, só termina em golpe a partir do frame 53.
    let hitstun = false;
    while (d.gf < natural.attackIdx + 18) {
      await d.step();
      const e = d.enemy();
      assert(e.ai !== 'attack', `CMT-03: a garra não deveria sair, ai=attack no frame de jogo ${d.gf}`);
      assert(d.s.player.hp === hp0, `CMT-03: o jogador não deveria levar o golpe pendente, hp ${hp0} -> ${d.s.player.hp} no frame de jogo ${d.gf}`);
      assert(count(d.s, `armored:${d.id}`) === 0, 'CMT-03: antes do compromisso o golpe cancela, não há armored');
      if (e.state === 'hitstun') hitstun = true;
    }
    assert(hitstun, 'CMT-03: o jab antes do compromisso deveria deixar o inimigo em hitstun');
    assert(ehp0 - d.enemy().hp === JAB_DAMAGE, `CMT-03: o jab deveria tirar ${JAB_DAMAGE} de vida: ${ehp0} -> ${d.enemy().hp}`);
  }

  // --- CMT-04/05/06: golpe leve depois do compromisso é absorvido (armored) e a garra sai no frame previsto ------------------------
  {
    const d = await duel('enemyGuard=0&enemyVariant=corcunda');
    while (!d.enemy().committed) await d.step();
    assert(d.gf === natural.commitIdx, `o compromisso deveria vir no frame de jogo ${natural.commitIdx}: ${d.gf}`);
    const hp0 = d.s.player.hp;
    const ehp0 = d.enemy().hp;
    const armored0 = count(d.s, `armored:${d.id}`);
    await d.tap('KeyJ');
    assert(d.s.player.move === 'jab', `CMT-04: o jab deveria começar: ${d.s.player.move}`);
    let attackGf = -1;
    let hitGf = -1;
    for (let i = 0; i < 80 && hitGf < 0; i++) {
      await d.step();
      const e = d.enemy();
      assert(e.state === 'idle', `CMT-04: o cérebro deveria continuar em idle depois do golpe absorvido: ${e.state} no frame de jogo ${d.gf}`);
      if (attackGf < 0 && e.ai === 'attack') attackGf = d.gf;
      if (d.s.player.hp < hp0) hitGf = d.gf;
    }
    assert(attackGf === natural.attackIdx, `CMT-05: a hitbox deveria abrir no frame de jogo ${natural.attackIdx}, abriu no ${attackGf}`);
    assert(hitGf > 0 && hitGf - attackGf <= 2, `CMT-05: o jogador deveria levar o golpe logo depois de a hitbox abrir: golpe ${attackGf}, dano ${hitGf}`);
    assert(hp0 - d.s.player.hp === d.enemy().damage, `CMT-05: o jogador deveria perder ${d.enemy().damage} de vida: ${hp0} -> ${d.s.player.hp}`);
    assert(ehp0 - d.enemy().hp === JAB_DAMAGE, `CMT-04: o jab deveria tirar ${JAB_DAMAGE} de vida: ${ehp0} -> ${d.enemy().hp}`);
    assert(count(d.s, `armored:${d.id}`) === armored0 + 1, `CMT-06: exatamente um armored:${d.id}: ${JSON.stringify(d.s.events.filter((x) => x.startsWith('armored')))}`);
  }

  // --- CMT-07: golpe que derruba depois do compromisso: ragdollStun e a garra não sai ---------------------------------------------
  {
    const d = await duel('enemyGuard=0&enemyVariant=corcunda');
    await down('KeyS');
    while (!d.enemy().committed) await d.step();
    const hp0 = d.s.player.hp;
    await down('KeyK');
    await d.step();
    await up('KeyK');
    await up('KeyS');
    assert(d.s.player.move === 'rasteira', `CMT-07: S+K deveria começar a rasteira: ${d.s.player.move}`);
    // O golpe pendente sairia em até 12 frames; o inimigo caído só se levanta (900 + 350 ms) e prepara outro bem depois da janela.
    let knocked = false;
    for (let i = 0; i < 70; i++) {
      await d.step();
      const e = d.enemy();
      assert(e.ai !== 'attack', `CMT-07: a garra não deveria sair, ai=attack ${i} frames depois da rasteira`);
      assert(d.s.player.hp === hp0, `CMT-07: o jogador não deveria levar o golpe pendente: hp ${hp0} -> ${d.s.player.hp}`);
      if (e.state === 'ragdollStun') knocked = true;
    }
    assert(knocked, 'CMT-07: a rasteira depois do compromisso deveria deixar o inimigo em ragdollStun');
    assert(count(d.s, `armored:${d.id}`) === 0, 'CMT-07: golpe que derruba não é absorvido (sem armored)');
  }

  // --- CMT-08: postura cheia depois do compromisso: quebrado e a garra não sai ------------------------------------------------------
  // A postura chega a 90 sem quebrar: dois parries (35 + 35) e dois chutes frontais (+10 cada) antes do compromisso, que cancelam o
  // preparo e cambaleiam o inimigo. No compromisso seguinte o terceiro chute leva a 100.
  {
    const d = await duel('enemyGuard=0&enemyVariant=corcunda');
    const parry = async () => {
      const before = count(d.s, 'parry');
      await d.tap('KeyU');
      for (let i = 0; i < 40 && count(d.s, 'parry') === before; i++) await d.step();
      assert(count(d.s, 'parry') === before + 1, 'CMT-08: o parry da preparação não aconteceu');
    };
    const gameFrames = async (n) => {
      const until = d.gf + n;
      while (d.gf < until) await d.step();
    };
    while (d.gf < 24) await d.step(); // U três frames antes do contato
    await parry();
    await gameFrames(48);
    await parry();
    while (d.s.hitstop.frozen) await d.step();
    assert(d.enemy().structure.cur === 70, `CMT-08: dois parries deveriam dar 70 de postura: ${JSON.stringify(d.enemy().structure)}`);
    /** Chute frontal quando o jogador está livre; devolve a postura do inimigo depois do golpe. */
    const kick = async (want) => {
      // A janela de Contra do parry (450 ms) ainda estaria aberta: com ela, K daria o `contra` e não o chute frontal.
      await waitFor((st) => st.player.move === null && !st.player.frame.startsWith('hurt') && !st.hitstop.frozen && !st.player.counter.open, 120, 'o jogador deveria ficar livre para o chute');
      d.s = await snap(0);
      const before = d.enemy().structure.cur;
      await d.tap('KeyK');
      // O segundo K cai na janela de encadeamento do primeiro e vira o `chuteAlto`, também forte (+10 de postura).
      assert(['chuteFrontal', 'chuteAlto'].includes(d.s.player.move), `CMT-08: K deveria começar um chute forte: ${d.s.player.move}`);
      for (let i = 0; i < 30 && d.enemy().structure.cur === before; i++) await d.step();
      assert(d.enemy().structure.cur === want, `CMT-08: o chute deveria levar a postura a ${want}: ${before} -> ${d.enemy().structure.cur}`);
    };
    await kick(80);
    await kick(90);
    // Espera o começo do próximo compromisso (a postura só cai depois de 1500 ms sem ganho, bem mais que o que falta).
    d.s = await waitFor((st) => !nearest(st).committed, 120, 'o inimigo deveria sair do compromisso');
    d.s = await waitCommit();
    assert(d.enemy().ai === 'windup' && d.enemy().structure.cur === 90, `CMT-08: o compromisso deveria começar com 90 de postura: ${JSON.stringify(d.enemy())}`);
    assert(d.s.player.move === null && !d.s.player.frame.startsWith('hurt'), `CMT-08: o jogador deveria estar livre para o golpe final: ${d.s.player.move}/${d.s.player.frame}`);
    const hp0 = d.s.player.hp;
    await d.tap('KeyK');
    assert(d.s.player.move === 'chuteFrontal', `CMT-08: K deveria começar o chuteFrontal: ${d.s.player.move}`);
    // O golpe pendente sairia em 11 frames; a janela segue pelo atordoamento da quebra (1500 ms), bem além dela.
    for (let i = 0; i < 45; i++) {
      await d.step();
      assert(d.enemy().ai !== 'attack', `CMT-08: a garra não deveria sair, ai=attack ${i} frames depois do chute`);
      assert(d.s.player.hp === hp0, `CMT-08: o jogador não deveria levar o golpe pendente: hp ${hp0} -> ${d.s.player.hp}`);
    }
    assert(d.enemy().structure.broken && d.enemy().structure.cur === 100, `CMT-08: a postura deveria chegar a 100 e quebrar: ${JSON.stringify(d.enemy().structure)}`);
  }

  // --- CMT-10: comprometido não levanta a guarda (enemyGuard=1) ---------------------------------------------------------------------
  // Contraste: antes do compromisso o mesmo leve levanta a guarda e é segurado (sem vida, +8 de postura).
  {
    const d = await duel('enemyGuard=1&enemyVariant=corcunda');
    for (let i = 0; i < 3; i++) await d.step();
    assert(d.enemy().ai === 'windup' && !d.enemy().committed, `CMT-10: o inimigo deveria estar em preparo, antes do compromisso: ${JSON.stringify(d.enemy())}`);
    const ehp0 = d.enemy().hp;
    await d.tap('KeyJ');
    for (let i = 0; i < 12 && count(d.s, `enemyBlock:${d.id}`) === 0; i++) await d.step();
    assert(count(d.s, `enemyBlock:${d.id}`) === 1 && d.enemy().guarding, `CMT-10: antes do compromisso o leve deveria ser segurado pela guarda: ${JSON.stringify(d.enemy())}`);
    assert(d.enemy().hp === ehp0 && d.enemy().structure.cur === 8, `CMT-10: o leve segurado não tira vida e soma 8 de postura: ${JSON.stringify(d.enemy())}`);
  }
  {
    const d = await duel('enemyGuard=1&enemyVariant=corcunda');
    while (!d.enemy().committed) await d.step();
    const blocks0 = count(d.s, `enemyBlock:${d.id}`);
    const ehp0 = d.enemy().hp;
    const armored0 = count(d.s, `armored:${d.id}`);
    assert(!d.enemy().guarding, 'CMT-10: o inimigo não deveria estar guardando antes do golpe');
    await d.tap('KeyJ');
    assert(d.s.player.move === 'jab' && !d.enemy().guarding, `CMT-10: o jab deveria começar sem a guarda subir: ${d.s.player.move}/${d.enemy().guarding}`);
    // A janela inteira em que a guarda poderia subir: do aperto até o fim do golpe do inimigo.
    for (let i = 0; i < 60 && d.enemy().ai !== 'rest'; i++) {
      await d.step();
      assert(!d.enemy().guarding, `CMT-10: o inimigo comprometido não deveria levantar a guarda (ai=${d.enemy().ai}, frame de jogo ${d.gf})`);
    }
    assert(d.enemy().ai === 'rest', 'CMT-10: o ciclo deveria terminar no descanso');
    assert(count(d.s, `enemyBlock:${d.id}`) === blocks0, `CMT-10: o jab no comprometido não deveria ser bloqueado: ${count(d.s, `enemyBlock:${d.id}`)} bloqueios`);
    assert(ehp0 - d.enemy().hp === JAB_DAMAGE, `CMT-10: o jab deveria tirar ${JAB_DAMAGE} de vida: ${ehp0} -> ${d.enemy().hp}`);
    assert(count(d.s, `armored:${d.id}`) === armored0 + 1, 'CMT-10: o jab deveria ser absorvido (armored)');
  }
}
