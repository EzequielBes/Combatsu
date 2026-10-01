// Defesa, lacunas do Verifier (GRD-05/06, PAR-07, DOD-06 e os edge cases de objeto na mão e rugido do chefe) com
// `?debug&seed=1&enemyGuard=0`. Rodada de chefe: `round=5` (Oni do Portão, 600 de vida, postura 100). Lê `player.*`,
// `boss.*`, `events`, `hud.heldItem` e `hitstop` do snapshot vivo; os valores vêm da spec (40% de 220 px/s, 25% do
// dano, postura -30, esquiva que cancela o golpe que acertou). Sincroniza pelo estado do chefe, não por tempo fixo.
import { makeKit } from './fight-kit.mjs';

export default async function (ctx) {
  const { assert, snap, frame, down, up, tap, count, boot, nearest, approach } = makeKit(ctx);
  const tapFrame = async (code) => {
    await down(code);
    const s = await frame();
    await up(code);
    return s;
  };
  /** Anda `n` frames segurando `keys` e devolve o snapshot final. */
  const walk = async (keys, n) => {
    for (const k of keys) await down(k);
    let s = null;
    for (let i = 0; i < n; i++) s = await frame();
    for (const k of keys.slice().reverse()) await up(k);
    return s;
  };

  // --- GRD-05: guardando, a velocidade de corrida cai a 40% (88 de 220 px/s) --------------------------------------------
  await boot('enemyGuard=0');
  let s = await snap(20);
  // O harness às vezes roda um tick extra de física num frame (+3,7 px a 220 px/s): a velocidade é a mediana do deslocamento
  // por frame, que ignora esses saltos.
  const speedOver = async (keys, settleFrames, measureFrames) => {
    for (const k of keys) await down(k);
    let cur = null;
    for (let i = 0; i < settleFrames; i++) cur = await frame();
    const steps = [];
    for (let i = 0; i < measureFrames; i++) {
      const x0 = cur.player.x;
      cur = await frame();
      steps.push(Math.abs(cur.player.x - x0));
    }
    for (const k of keys.slice().reverse()) await up(k);
    steps.sort((a, b) => a - b);
    return { speed: steps[Math.floor(steps.length / 2)] * 60, guard: cur.player.guard };
  };
  const normal = await speedOver(['KeyD'], 20, 30);
  assert(Math.abs(normal.speed - 220) <= 4, `GRD-05: velocidade normal deveria ser 220 px/s, mediu ${normal.speed.toFixed(1)}`);
  await walk([], 30);
  const guarded = await speedOver(['KeyU', 'KeyA'], 20, 30);
  assert(guarded.guard === 'guard', `GRD-05: deveria estar em guarda: ${guarded.guard}`);
  assert(Math.abs(guarded.speed - 88) <= 4, `GRD-05: guardando deveria andar a 40% (88 px/s), mediu ${guarded.speed.toFixed(1)}`);
  assert(Math.abs(guarded.speed / normal.speed - 0.4) <= 0.02, `GRD-05: razão guarda/normal ${(guarded.speed / normal.speed).toFixed(3)}, esperava 0,4`);

  // --- DOD-06: a esquiva cancela a recovery de um golpe que já acertou, no mesmo frame ----------------------------------------
  await boot('enemyGuard=0');
  s = await approach();
  const hp0 = nearest(s).hp;
  await tapFrame('KeyJ');
  s = await frame();
  let hitAt = -1;
  for (let i = 0; i < 30 && hitAt < 0; i++) {
    if (nearest(s).hp < hp0) hitAt = i;
    else s = await frame();
  }
  assert(hitAt >= 0, 'DOD-06: o jab deveria acertar o inimigo');
  for (let i = 0; i < 8; i++) s = await frame(); // hitstop e fim do ativo: o jab segue na recovery
  assert(s.player.move === 'jab' && !s.player.dodge.active, `DOD-06: o jab deveria estar na recovery: ${s.player.move}`);
  const dodgesBefore = count(s, 'dodge');
  s = await tapFrame('KeyQ');
  assert(s.player.move === null, `DOD-06: o golpe deveria terminar no frame da esquiva: ${s.player.move}`);
  assert(s.player.dodge.active && count(s, 'dodge') === dodgesBefore + 1, `DOD-06: a esquiva deveria começar no mesmo frame: ${JSON.stringify(s.player.dodge)}`);
  // Golpe que não acertou: a recovery não cancela (`Q` não faz nada até o golpe acabar).
  await boot('enemyGuard=0');
  s = await snap(20);
  await tapFrame('KeyJ');
  for (let i = 0; i < 8; i++) s = await frame();
  assert(s.player.move === 'jab', `o jab no vazio deveria seguir em curso: ${s.player.move}`);
  const missDodges = count(s, 'dodge');
  s = await tapFrame('KeyQ');
  assert(!s.player.dodge.active && count(s, 'dodge') === missDodges, `DOD-06: jab que não acertou não pode ser cancelado pela esquiva: ${JSON.stringify(s.player.dodge)}`);

  // --- Edge case: com objeto na mão, guarda, parry e esquiva funcionam ---------------------------------------------------------
  await boot('enemyGuard=0');
  s = await snap(20);
  const chair = s.worldProps.find((p) => p.key === 'chair');
  assert(chair, `nenhuma cadeira no mapa: ${JSON.stringify(s.worldProps)}`);
  for (let i = 0; i < 40 && Math.abs(s.player.x - chair.x) > 20; i++) {
    await down('KeyD');
    s = await snap(50);
    await up('KeyD');
  }
  s = await snap(60);
  s = await tap('KeyE');
  assert(s.hud.heldItem !== null, `deveria segurar a cadeira: ${JSON.stringify(s.hud.heldItem)}`);
  await snap(500);
  await down('KeyU');
  s = await frame();
  assert(s.player.guard === 'parry', `edge objeto: o aperto de U com objeto na mão deveria abrir o parry: ${s.player.guard}`);
  for (let i = 0; i < 12; i++) s = await frame();
  assert(s.player.guard === 'guard' && s.hud.heldItem !== null, `edge objeto: guarda de pé com o objeto na mão: ${s.player.guard}`);
  await up('KeyU');
  await snap(100);
  const dodgesProp = count(s, 'dodge');
  s = await tapFrame('KeyQ');
  assert(s.player.dodge.active && count(s, 'dodge') === dodgesProp + 1, `edge objeto: a esquiva deveria funcionar com objeto na mão: ${JSON.stringify(s.player.dodge)}`);
  assert(s.hud.heldItem !== null, 'edge objeto: a esquiva não solta o objeto');

  // --- Chefe: bloqueio (GRD-06) e parry (PAR-07) de golpe real ---------------------------------------------------------------
  /** Rodada de chefe com o jogador andando 90 frames para a direita (x ~447), virado para o chefe. */
  const bossFight = async () => {
    await boot('round=5&enemyGuard=0');
    await walk(['KeyD'], 90);
    return snap(20);
  };
  // GRD-06: golpe do chefe de frente com a guarda de pé causa round(dano x 0,25). A investida (dano 18) que acerta o jogador
  // de frente perde round(4,5) = 5 de vida no frame do `block` (o pouso do salto vem junto com a onda de choque de trás).
  s = await bossFight();
  await down('KeyU');
  let prev = s;
  let blocked = null;
  for (let i = 0; i < 600 && !blocked; i++) {
    s = await frame();
    if (count(s, 'block') > count(prev, 'block') && s.boss.attack === 'charge') blocked = { prev, s };
    else prev = s;
  }
  await up('KeyU');
  assert(blocked, 'GRD-06: a investida do chefe deveria ser bloqueada');
  assert(blocked.s.player.guard === 'guard', `GRD-06: guarda de pé no bloqueio: ${blocked.s.player.guard}`);
  assert(blocked.prev.player.hp - blocked.s.player.hp === 5, `GRD-06: bloqueio do golpe do chefe deveria custar round(18 x 0,25) = 5, custou ${blocked.prev.player.hp - blocked.s.player.hp}`);

  // PAR-07: parry no pouso do salto: a vida não muda e a postura do chefe cai 30 (100 -> 70).
  s = await bossFight();
  let leapFrames = 0;
  prev = s;
  let parried = null;
  for (let i = 0; i < 900 && !parried; i++) {
    s = await frame();
    leapFrames = s.boss.state === 'leap' ? leapFrames + 1 : 0;
    if (leapFrames === 38) await down('KeyU'); // a janela de 150 ms (9 frames) abre 4 frames antes do pouso e o cobre
    if (count(s, 'parry') > count(prev, 'parry')) parried = { prev, s };
    else prev = s;
  }
  await up('KeyU');
  assert(parried, 'PAR-07: o golpe do chefe deveria ser aparado');
  assert(parried.prev.boss.poise === 100, `PAR-07: postura inicial do chefe 100: ${parried.prev.boss.poise}`);
  assert(parried.s.player.hp === parried.prev.player.hp, `PAR-07: parry não custa vida: ${parried.prev.player.hp} -> ${parried.s.player.hp}`);
  assert(parried.s.boss.poise === 70, `PAR-07: o parry deveria tirar 30 de postura do chefe (100 -> 70), ficou ${parried.s.boss.poise}`);
  assert(parried.s.boss.hp === parried.prev.boss.hp, `PAR-07: o parry não tira vida do chefe: ${parried.prev.boss.hp} -> ${parried.s.boss.hp}`);

  // Edge case: no rugido, os golpes do chefe seguem as regras da guarda. O golpe de teste (Digit2, sem alcance) leva o chefe a
  // 66% de vida; o jogador foge durante o salto e a onda de choque do pouso (imbloqueável, 12) nasce longe e ainda viaja quando
  // o rugido começa (o golpe de teste entra um frame depois do pouso). Com a guarda de pé a onda passa (GRD-04: 12 de dano, sem
  // `block`); com um parry no momento do contato ela é anulada (PAR-02: 0 de dano, um `parry`).
  const roar = async (mode) => {
    let cur = await bossFight();
    if (mode === 'guard') await down('KeyU');
    while (cur.boss.state === 'intro') cur = await frame();
    const heavy = async () => {
      await down('Digit2');
      const f = await frame();
      await up('Digit2');
      return f;
    };
    const hpFull = cur.boss.hp;
    cur = await heavy();
    const heavyDmg = hpFull - cur.boss.hp;
    assert(heavyDmg > 0, `o golpe de teste deveria tirar vida do chefe: ${hpFull} -> ${cur.boss.hp}`);
    const threshold = Math.floor(cur.boss.maxHp * 0.66);
    while (cur.boss.hp - heavyDmg > threshold) {
      cur = await heavy();
      assert(cur.boss.state !== 'roar', 'o chefe não deveria rugir antes do limiar de 66%');
    }
    assert(cur.boss.phase === 1, `o chefe deveria seguir na fase 1: ${cur.boss.phase}`);
    for (let i = 0; i < 900 && cur.boss.state !== 'leap'; i++) cur = await frame();
    assert(cur.boss.state === 'leap', 'o chefe deveria saltar');
    const away = cur.player.x >= cur.boss.x ? 1 : -1;
    const awayKey = away === 1 ? 'KeyD' : 'KeyA';
    await down(awayKey);
    for (let i = 0; i < 120 && cur.boss.state === 'leap'; i++) cur = await frame();
    await up(awayKey);
    assert(cur.boss.state === 'rest', `o chefe deveria ter pousado: ${cur.boss.state}`);
    const waves = cur.projectiles.filter((p) => p.kind === 'shockwave');
    assert(waves.length === 2, `o pouso deveria soltar duas ondas: ${JSON.stringify(cur.projectiles)}`);
    cur = await heavy();
    assert(cur.boss.state === 'roar' && cur.boss.phase === 2, `o golpe de teste deveria levar o chefe ao rugido da fase 2: ${JSON.stringify(cur.boss)}`);
    const hpBefore = cur.player.hp;
    const base = { parry: count(cur, 'parry'), block: count(cur, 'block') };
    let prev = cur;
    for (let i = 0; i < 40 && cur.boss.state === 'roar'; i++) {
      prev = cur;
      const wave = cur.projectiles.find((p) => p.kind === 'shockwave' && Math.sign(cur.player.x - p.x) === p.dir && Math.abs(cur.player.x - p.x) <= 48);
      if (mode === 'parry' && wave && cur.player.guard === 'none') await down('KeyU');
      cur = await frame();
      if (cur.player.hp !== hpBefore || count(cur, 'parry') > base.parry) break;
    }
    await up('KeyU');
    assert(cur.boss.state === 'roar', 'o contato deveria acontecer durante o rugido');
    return { cur, prev, hpBefore, base };
  };
  const guardRoar = await roar('guard');
  assert(guardRoar.hpBefore - guardRoar.cur.player.hp === 12, `rugido: a onda imbloqueável deveria causar 12 apesar da guarda, causou ${guardRoar.hpBefore - guardRoar.cur.player.hp}`);
  assert(count(guardRoar.cur, 'block') === guardRoar.base.block && count(guardRoar.cur, 'parry') === guardRoar.base.parry, 'rugido: a guarda não bloqueia a onda imbloqueável');
  const parryRoar = await roar('parry');
  assert(count(parryRoar.cur, 'parry') === parryRoar.base.parry + 1, `rugido: o parry deveria anular a onda: ${JSON.stringify(parryRoar.cur.events.slice(-3))}`);
  assert(parryRoar.cur.player.hp === parryRoar.hpBefore, `rugido: parry custa 0 de vida: ${parryRoar.hpBefore} -> ${parryRoar.cur.player.hp}`);
}
