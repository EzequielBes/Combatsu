// Defesa do jogador e quebra de estrutura (GRD-02/03/07/08, CTL-09, PAR-02/03/04/09/10/11, DOD-01/03/07/08/11/12,
// STR-05/06, FIN-01/02) com `?debug&seed=1&enemyGuard=0`. Um inimigo comum ataca o jogador parado: o ciclo é
// determinístico em frames de jogo (preparo de 27 frames, a hitbox abre no update de `f0 + 27` e conecta no step de
// `f0 + 28`, onde `f0` é o frame em que ele chega a menos de 40 px). O jogador aperta `U` ou `Q` poucos frames antes.
// Lê `player.*`, `enemies[]`, `events`, `fx.layers`, `timeScale` e `hitstop` do snapshot vivo; valores vêm da spec.
import { makeKit } from './fight-kit.mjs';

const FRAME_MS = 1000 / 60;

export default async function (ctx) {
  const { assert, snap, frame, down, up, count, boot, nearest, approach, startDuel } = makeKit(ctx);

  /** Duelo: o inimigo chega a <40 px (frame 0) e o jogador se cola nele (~15 px), ainda de frente para ele. */
  const duel = async ({ close = true } = {}) => {
    await boot('enemyGuard=0');
    const d = { s: await startDuel(), f: 0 };
    d.step = async () => {
      d.s = await frame();
      d.f += 1;
      return d.s;
    };
    d.to = async (n) => {
      while (d.f < n) await d.step();
    };
    d.dist = () => Math.abs(nearest(d.s).x - d.s.player.x);
    if (close) {
      // O jogador ainda desliza uns 13 px depois de soltar `D`: solta a 30 px para parar de frente, a ~15 px.
      await down('KeyD');
      for (let i = 0; i < 20 && d.dist() > 30; i++) await d.step();
      await up('KeyD');
      for (let i = 0; i < 6; i++) await d.step();
      assert(
        nearest(d.s).x > d.s.player.x && d.dist() < 30,
        `o inimigo deveria ficar à frente, colado: ${JSON.stringify({ p: d.s.player.x, e: nearest(d.s).x })}`,
      );
    }
    return d;
  };
  /** Aperta uma tecla por um frame. */
  const tapFrame = async (d, code) => {
    await down(code);
    await d.step();
    await up(code);
  };
  /** Passa frames até `pred(snapshot)` (no máximo `max`); falha se nunca vier. */
  const until = async (d, pred, max, what) => {
    for (let i = 0; i < max && !pred(d.s); i++) await d.step();
    assert(
      pred(d.s),
      `${what}: não aconteceu em ${max} frames (hp=${d.s.player.hp}, events=${JSON.stringify(d.s.events.slice(-4))})`,
    );
    return d.s;
  };
  /** Frames seguidos com o hitstop ligado a partir do snapshot atual (inclusive). */
  const frozenRun = async (d) => {
    let n = 0;
    while (d.s.hitstop.frozen && n < 30) {
      n++;
      await d.step();
    }
    return n;
  };
  /** Espera `n` frames de jogo (fora do hitstop). */
  const gameFrames = async (d, n) => {
    for (let i = 0; i < n;) {
      await d.step();
      if (!d.s.hitstop.frozen) i++;
    }
  };
  /** Três parries seguidos (35 + 35 + 35 de estrutura): devolve o duelo no frame do 3º parry. */
  const parryThree = async () => {
    const d = await duel();
    await d.to(24);
    for (let i = 1; i <= 3; i++) {
      const before = count(d.s, 'parry');
      await tapFrame(d, 'KeyU');
      await until(d, (s) => count(s, 'parry') === before + 1, 40, `parry ${i}`);
      if (i < 3) await gameFrames(d, 48);
    }
    return d;
  };

  // --- Anti-spam do parry e esquiva (sem inimigo por perto) ------------------------------------------------------------
  await boot('enemyGuard=0');
  let s = await snap(20);
  await down('KeyD');
  for (let i = 0; i < 40 && s.player.x < 300; i++) s = await snap(50);
  await up('KeyD');
  s = await snap(300);
  assert(
    s.player.dodge.cooldownMs === 0 && s.player.guard === 'none',
    `estado inicial da defesa: ${JSON.stringify(s.player)}`,
  );

  const fd = { s, f: 0, step: async () => (fd.s = await frame()) };
  // PAR-01/PAR-04: o 1º aperto abre a janela; o 2º, 200 ms depois (< 300 ms), não abre; o 3º, 416 ms depois, abre.
  await down('KeyU');
  await fd.step();
  assert(fd.s.player.guard === 'parry', `PAR-01: o primeiro aperto deveria abrir a janela: ${fd.s.player.guard}`);
  await up('KeyU');
  for (let i = 0; i < 11; i++) await fd.step();
  assert(fd.s.player.guard === 'none', `a janela de 150 ms deveria ter fechado: ${fd.s.player.guard}`);
  await down('KeyU'); // 12 frames (200 ms) depois do primeiro aperto
  const window2 = [];
  for (let i = 0; i < 14; i++) {
    await fd.step();
    window2.push(fd.s.player.guard);
  }
  assert(
    window2.every((g) => g === 'guard'),
    `PAR-04: aperto a 200 ms do anterior não deveria abrir janela: ${JSON.stringify(window2)}`,
  );
  await up('KeyU');
  for (let i = 0; i < 25; i++) await fd.step(); // 416 ms depois do segundo aperto
  await down('KeyU');
  await fd.step();
  assert(fd.s.player.guard === 'parry', `PAR-01: aperto a mais de 300 ms deveria abrir a janela: ${fd.s.player.guard}`);
  await up('KeyU');
  for (let i = 0; i < 30; i++) await fd.step();

  // DOD-01/DOD-09/DOD-11: Q com A segurado anda 96 px (±4) para a esquerda em 200 ms; sem direção, para longe de
  // onde olha (o esquiva não vira o jogador: ele segue olhando para a direita, então vai à esquerda de novo).
  const dash = async (holdKey, heldDir) => {
    const before = await snap(16);
    const x0 = before.player.x;
    const expectedDir = holdKey ? heldDir : -before.player.facing;
    if (holdKey) await down(holdKey);
    await down('KeyQ');
    let st = await frame();
    await up('KeyQ');
    if (holdKey) await up(holdKey);
    assert(
      count(st, 'dodge') === count(before, 'dodge') + 1,
      `DOD-09: um dodge esperado: ${JSON.stringify(st.events.slice(-3))}`,
    );
    let activeFrames = 1;
    let trail = st.fx.layers.includes('dodge.trail');
    for (let i = 0; i < 40 && st.player.dodge.active; i++) {
      st = await frame();
      if (st.player.dodge.active) activeFrames++;
      trail = trail || st.fx.layers.includes('dodge.trail');
    }
    st = await snap(120);
    const dx = st.player.x - x0;
    assert(Math.abs(dx - expectedDir * 96) <= 4, `DOD-01: andou ${dx.toFixed(1)} px, esperava ${expectedDir * 96} ±4`);
    assert(
      Math.abs(activeFrames * FRAME_MS - 200) <= 34,
      `DOD-01: a esquiva durou ${(activeFrames * FRAME_MS).toFixed(0)} ms, esperava 200`,
    );
    assert(trail, 'DOD-11: fx.layers deveria incluir dodge.trail durante a esquiva');
    await snap(500); // recarga de 450 ms
  };
  await dash('KeyA', -1);
  await dash(null, 0);

  // --- Bloqueio de frente (GRD-02/07/08/09, CTL-09, STR-03) --------------------------------------------------------------
  let d = await duel();
  await d.to(6);
  await down('KeyU');
  await d.step();
  const xBeforeBlock = d.s.player.x;
  const blocksBefore = count(d.s, 'block');
  const hp0 = d.s.player.hp;
  await until(d, (st) => count(st, 'block') === blocksBefore + 1, 60, 'GRD-07 block');
  assert(d.s.player.hp === hp0, `GRD-02: bloqueado de frente deveria dar 0 de dano, hp ${hp0} -> ${d.s.player.hp}`);
  assert(
    d.s.fx.layers.includes('guard.spark'),
    `GRD-08: fx.layers sem guard.spark no frame do bloqueio: ${JSON.stringify(d.s.fx.layers)}`,
  );
  assert(
    d.s.player.guard === 'guard' && d.s.player.frame === 'guard',
    `CTL-09: guard=${d.s.player.guard} frame=${d.s.player.frame}`,
  );
  assert(
    d.s.player.structure.cur === 15,
    `STR-03: bloqueio de golpe comum deveria dar +15: ${JSON.stringify(d.s.player.structure)}`,
  );
  for (let i = 0; i < 10; i++) await d.step();
  assert(
    count(d.s, 'block') === blocksBefore + 1,
    `GRD-07: exatamente um block por golpe: ${count(d.s, 'block') - blocksBefore}`,
  );
  assert(
    Math.abs(Math.abs(d.s.player.x - xBeforeBlock) - 8) <= 2,
    `GRD-09: recuo de ${(d.s.player.x - xBeforeBlock).toFixed(1)} px, esperava 8 ±2`,
  );
  await up('KeyU');

  // --- Golpe pelas costas (GRD-03) -------------------------------------------------------------------------------------------
  await boot('enemyGuard=0');
  s = await approach(110);
  await down('KeyA'); // vira para longe do inimigo (ele fica atrás do jogador)
  s = await frame();
  await up('KeyA');
  const back = { s, f: 0 };
  back.step = async () => {
    back.s = await frame();
    back.f += 1;
    return back.s;
  };
  assert(back.s.player.facing === -1, `o jogador deveria olhar para trás do inimigo: facing=${back.s.player.facing}`);
  for (let i = 0; i < 200 && Math.abs(nearest(back.s).x - back.s.player.x) >= 40; i++) await back.step();
  const f0Back = back.f;
  while (back.f < f0Back + 6) await back.step();
  await down('KeyU');
  await back.step();
  const hpBack = back.s.player.hp;
  const blocksBack = count(back.s, 'block');
  const attackerDamage = nearest(back.s).damage;
  await until(back, (st) => st.player.hp < hpBack, 60, 'GRD-03 golpe pelas costas');
  assert(
    hpBack - back.s.player.hp === attackerDamage,
    `GRD-03: pelas costas deveria dar o dano cheio ${attackerDamage}, deu ${hpBack - back.s.player.hp}`,
  );
  assert(count(back.s, 'block') === blocksBack, 'GRD-03: golpe pelas costas não deveria ser bloqueado');
  await up('KeyU');

  // --- Parry (PAR-02/03/09/10/11, CTL-09) e o inimigo aparado parado por 400 ms ----------------------------------------------
  d = await duel();
  await d.to(24); // aperta 3 frames (50 ms) antes do contato
  const parriesBefore = count(d.s, 'parry');
  const hpParry = d.s.player.hp;
  await down('KeyU');
  await d.step();
  assert(d.s.player.guard === 'parry', `PAR-01: guard deveria ser parry logo depois do aperto: ${d.s.player.guard}`);
  await up('KeyU');
  await until(d, (st) => count(st, 'parry') === parriesBefore + 1, 40, 'PAR-09 parry');
  const target = nearest(d.s);
  assert(d.s.player.hp === hpParry, `PAR-02: parry deveria dar 0 de dano, hp ${hpParry} -> ${d.s.player.hp}`);
  assert(
    d.s.fx.layers.includes('parry.flash') && d.s.fx.layers.includes('parry.ring'),
    `PAR-11: camadas do parry no frame: ${JSON.stringify(d.s.fx.layers)}`,
  );
  assert(
    target.structure.cur === 35,
    `PAR-03: estrutura do atacante deveria ser 35: ${JSON.stringify(target.structure)}`,
  );
  assert(
    d.s.player.structure.cur === 0,
    `PAR-06: o parry não soma estrutura ao jogador: ${JSON.stringify(d.s.player.structure)}`,
  );
  assert(
    d.s.player.frame === 'guard' && d.s.player.guard === 'parry',
    `CTL-09: frame=${d.s.player.frame} guard=${d.s.player.guard}`,
  );
  const frozen = await frozenRun(d);
  assert(
    Math.abs(frozen * FRAME_MS - 80) <= 17,
    `PAR-08: hitstop de ${(frozen * FRAME_MS).toFixed(0)} ms, esperava 80`,
  );
  assert(count(d.s, 'parry') === parriesBefore + 1, 'PAR-09: exatamente um parry');
  // PAR-10: com o jogador longe (esquiva para trás) o inimigo aparado só volta a andar depois de 400 ms de jogo.
  await tapFrame(d, 'KeyQ');
  const ex0 = nearest(d.s).x;
  let idleFrames = 0;
  let moved = false;
  for (let i = 0; i < 80 && !moved; i++) {
    await d.step();
    if (d.s.hitstop.frozen) continue;
    if (Math.abs(nearest(d.s).x - ex0) > 0.5) moved = true;
    else idleFrames++;
  }
  assert(moved, 'PAR-10: o inimigo aparado deveria voltar a andar depois da supressão');
  assert(
    Math.abs(idleFrames * FRAME_MS - 400) <= 50,
    `PAR-10: parado por ${(idleFrames * FRAME_MS).toFixed(0)} ms, esperava 400`,
  );
  assert(d.s.player.hp === hpParry, `PAR-10: o jogador não deveria ter levado dano: hp ${d.s.player.hp}`);

  // --- Quebra do inimigo por três parries: atordoado 1500 ms (STR-05, STR-10, STR-08) -------------------------------------------
  d = await parryThree();
  const boss = nearest(d.s);
  assert(
    boss.structure.cur === 100 && boss.structure.broken,
    `PAR-03/STR-05: 3 parries deveriam quebrar a estrutura (teto 100): ${JSON.stringify(boss.structure)}`,
  );
  assert(
    count(d.s, `guardBreak:${boss.id}`) === 1,
    `STR-10: um guardBreak:${boss.id}: ${JSON.stringify(d.s.events.filter((e) => e.startsWith('guardBreak')))}`,
  );
  const bx0 = boss.x;
  const hpBreak = d.s.player.hp;
  let stunFrames = 0;
  for (let i = 0; i < 200 && nearest(d.s).structure.broken; i++) {
    await d.step();
    if (!d.s.hitstop.frozen && nearest(d.s).structure.broken) stunFrames++;
  }
  assert(
    Math.abs(stunFrames * FRAME_MS - 1500) <= 50,
    `STR-05: atordoado por ${(stunFrames * FRAME_MS).toFixed(0)} ms, esperava 1500`,
  );
  assert(d.s.player.hp === hpBreak, `STR-05: quebrado não ataca, hp ${hpBreak} -> ${d.s.player.hp}`);
  assert(Math.abs(nearest(d.s).x - bx0) <= 0.5, `STR-05: quebrado não anda (${bx0} -> ${nearest(d.s).x})`);
  assert(
    nearest(d.s).structure.cur === 0 && !nearest(d.s).structure.broken,
    `STR-08: ao fim do atordoamento a estrutura volta a 0: ${JSON.stringify(nearest(d.s).structure)}`,
  );

  // --- Finalizador (FIN-01, FIN-02) ---------------------------------------------------------------------------------------------
  d = await parryThree();
  const victim = nearest(d.s);
  await frozenRun(d);
  await gameFrames(d, 6);
  assert(nearest(d.s).structure.broken, 'o inimigo deveria seguir quebrado antes do finalizador');
  const hpEnemy = nearest(d.s).hp;
  const finBefore = d.s.events.filter((e) => e.startsWith('finisher:')).length;
  await down('KeyJ');
  await down('KeyK');
  await d.step();
  await up('KeyK');
  await up('KeyJ');
  await until(
    d,
    (st) => st.events.filter((e) => e.startsWith('finisher:')).length === finBefore + 1,
    6,
    'FIN-01 finisher',
  );
  assert(
    count(d.s, `finisher:${victim.id}`) === 1,
    `FIN-01: um finisher:${victim.id}: ${JSON.stringify(d.s.events.filter((e) => e.startsWith('finisher')))}`,
  );
  const finFrozen = await frozenRun(d);
  assert(
    Math.abs(finFrozen * FRAME_MS - 150) <= 25,
    `FIN-02: hitstop de ${(finFrozen * FRAME_MS).toFixed(0)} ms, esperava 150`,
  );
  const afterFin = d.s.enemies.find((e) => e.id === victim.id);
  assert(
    hpEnemy - afterFin.hp === 40,
    `FIN-01: o finalizador deveria causar 40 de dano, causou ${hpEnemy - afterFin.hp}`,
  );

  // --- Esquiva perfeita (DOD-03/07/08/11/12) --------------------------------------------------------------------------------------
  d = await duel();
  await d.to(25); // Espaço 3 frames antes do contato: a invencibilidade (180 ms) cobre o golpe
  const perfectBefore = count(d.s, 'perfectDodge');
  const enemyHp = nearest(d.s).hp;
  const hpDodge = d.s.player.hp;
  // DGA-06: a esquiva principal é o Espaço (o Q segue como atalho, coberto pelos outros cenários).
  const yBeforeDodge = d.s.player.y;
  await tapFrame(d, 'Space');
  assert(
    d.s.player.y >= yBeforeDodge - 1,
    `DGA-06: o Espaço não deveria mais pular: ${yBeforeDodge} -> ${d.s.player.y}`,
  );
  await until(d, (st) => count(st, 'perfectDodge') === perfectBefore + 1, 40, 'DOD-03 perfectDodge');
  // DGA-03/04: a esquiva perfeita deixa a imagem residual e acende as linhas de foco.
  assert(d.s.fx.layers.includes('dodge.zanzou'), `DGA-03: esperava dodge.zanzou: ${JSON.stringify(d.s.fx.layers)}`);
  const perfectAt = d.f;
  assert(
    d.s.player.hp === hpDodge,
    `DOD-03: a esquiva perfeita não deveria custar vida: ${hpDodge} -> ${d.s.player.hp}`,
  );
  assert(d.s.timeScale === 0.3, `DOD-07: timeScale deveria ser 0.3, veio ${d.s.timeScale}`);
  assert(
    d.s.fx.layers.includes('dodge.slowTint'),
    `DOD-12: fx.layers sem dodge.slowTint na câmera lenta: ${JSON.stringify(d.s.fx.layers)}`,
  );
  assert(
    d.s.fx.layers.includes('dodge.trail') && d.s.player.dodge.active,
    `DOD-11: dodge.trail durante a esquiva: ${JSON.stringify(d.s.fx.layers)}`,
  );
  let slowFrames = 0;
  while (d.s.timeScale === 0.3 && slowFrames < 60) {
    slowFrames++;
    await d.step();
  }
  assert(
    Math.abs(slowFrames * FRAME_MS - 400) <= 40,
    `DOD-07: câmera lenta por ${(slowFrames * FRAME_MS).toFixed(0)} ms, esperava 400`,
  );
  assert(d.s.timeScale === 1, `DOD-07: depois dos 400 ms o timeScale deveria voltar a 1: ${d.s.timeScale}`);
  assert(count(d.s, 'perfectDodge') === perfectBefore + 1, 'DOD-03: exatamente um perfectDodge por esquiva');
  // DOD-08: o primeiro golpe em até 1000 ms causa ×1,5 (jab 6 -> 9), uma vez (o seguinte, direto, 7).
  await until(d, (st) => !st.player.dodge.active, 60, 'fim da esquiva');
  await down('KeyD');
  for (let i = 0; i < 40 && d.dist() > 30; i++) await d.step();
  await up('KeyD');
  await tapFrame(d, 'KeyJ');
  await until(d, (st) => nearest(st).hp < enemyHp, 30, 'primeiro golpe depois da esquiva perfeita');
  assert(
    (d.f - perfectAt) * FRAME_MS <= 1000,
    `o golpe deveria vir em até 1000 ms da esquiva perfeita: ${(d.f - perfectAt) * FRAME_MS} ms`,
  );
  assert(
    enemyHp - nearest(d.s).hp === 9,
    `DOD-08: jab de 6 deveria causar 9 (×1,5), causou ${enemyHp - nearest(d.s).hp}`,
  );
  const afterJab = nearest(d.s).hp;
  for (let i = 0; i < 6; i++) await d.step();
  await tapFrame(d, 'KeyJ'); // dentro da recovery do jab: vira direto
  await until(d, (st) => nearest(st).hp < afterJab, 40, 'segundo golpe');
  assert(
    afterJab - nearest(d.s).hp === 7,
    `DOD-08: o bônus vale uma vez, o direto deveria causar 7, causou ${afterJab - nearest(d.s).hp}`,
  );

  // --- Guarda quebrada do jogador (STR-06, STR-11, STR-08) --------------------------------------------------------------------
  d = await duel();
  await d.to(6);
  await down('KeyU');
  const gbBefore = count(d.s, 'guardBreak:player');
  await until(d, (st) => st.player.structure.broken, 3000, 'STR-06 guarda quebrada');
  assert(d.s.player.structure.cur === 100, `STR-06: estrutura cheia (100): ${JSON.stringify(d.s.player.structure)}`);
  assert(
    count(d.s, 'guardBreak:player') === gbBefore + 1,
    `STR-11: um guardBreak:player: ${JSON.stringify(d.s.events.filter((e) => e.startsWith('guardBreak')))}`,
  );
  await frozenRun(d);
  // Durante o atordoamento o jogador ignora o input: D segurado não anda e J não começa golpe.
  await up('KeyU');
  await down('KeyD');
  await down('KeyJ');
  let sx = d.s.player.x;
  let stun = 0;
  let moveSeen = null;
  for (let i = 0; i < 120 && d.s.player.structure.broken; i++) {
    await d.step();
    if (d.s.hitstop.frozen) continue;
    if (d.s.player.structure.broken) stun++;
    if (stun === 8) sx = d.s.player.x; // o recuo de 8 px do bloqueio que quebrou a guarda já terminou
    if (d.s.player.move !== null) moveSeen = d.s.player.move;
  }
  await up('KeyJ');
  await up('KeyD');
  assert(
    Math.abs(stun * FRAME_MS - 800) <= 50,
    `STR-06: atordoado por ${(stun * FRAME_MS).toFixed(0)} ms, esperava 800`,
  );
  assert(moveSeen === null, `STR-06: atordoado não deveria golpear (${moveSeen})`);
  assert(
    Math.abs(d.s.player.x - sx) <= 2,
    `STR-06: atordoado não deveria andar (${sx.toFixed(1)} -> ${d.s.player.x.toFixed(1)})`,
  );
  assert(
    d.s.player.structure.cur === 0 && !d.s.player.structure.broken,
    `STR-08: ao fim do atordoamento a estrutura volta a 0: ${JSON.stringify(d.s.player.structure)}`,
  );
}
