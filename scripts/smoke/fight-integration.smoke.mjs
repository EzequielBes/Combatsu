// Integração da luta (CTL-08, MOV-15 e os edge cases de técnica em conjuração e nova run) com `?debug&seed=1&enemyGuard=0`.
// CTL-08: `S`+`E` com o objeto na mão solta (estado `rest`, sem velocidade), diferente do `E` que arremessa. MOV-15: com
// `forca` 1 comprada na loja o jab causa round(6 x 1,1) = 7 (e não 6) e soma +3 de energia amaldiçoada. Técnica em
// conjuração: `U`/`Q` não começam guarda, parry nem esquiva. Nova run: estrutura do jogador 0, combo zerado, `timeScale` 1.
// Lê `hud.heldItem`, `worldProps`, `enemies[]`, `modifiers`, `ce`, `tech.cast`, `player.*` e `combo` do snapshot vivo.
import { makeKit } from './fight-kit.mjs';

export default async function (ctx) {
  const { assert, snap, frame, down, up, tap, count, boot, nearest, approach, startDuel } = makeKit(ctx);
  const tapFrame = async (code) => {
    await down(code);
    const s = await frame();
    await up(code);
    return s;
  };

  // --- CTL-08: `S`+`E` com o objeto na mão solta no chão, sem arremessar -------------------------------------------------------
  await boot('enemyGuard=0');
  let s = await snap(20);
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
  await down('KeyS');
  await down('KeyE');
  s = await frame();
  await up('KeyE');
  await up('KeyS');
  assert(s.hud.heldItem === null, `CTL-08: S+E deveria soltar o objeto: ${JSON.stringify(s.hud.heldItem)}`);
  for (let i = 0; i < 4; i++) s = await frame();
  const dropped = s.worldProps.find((p) => p.key === 'chair');
  assert(dropped, 'CTL-08: a cadeira solta deveria seguir na cena');
  assert(
    dropped.state === 'rest' && dropped.vx === 0,
    `CTL-08: solto vira rest sem velocidade, não thrown: ${JSON.stringify(dropped)}`,
  );
  assert(
    Math.abs(dropped.x - s.player.x) <= 40,
    `CTL-08: o objeto cai perto do jogador: ${dropped.x} vs ${s.player.x}`,
  );

  // --- MOV-15: o dano do golpe passa por `modifiers.meleeDamage` (forca 1: jab 6 -> 7) e soma +3 de CE -----------------------------
  await boot('enemyGuard=0&fragments=200&tech=vermelho');
  s = await snap(20);
  for (let i = 0; i < 40 && s.run.state === 'roundActive'; i++) {
    await tap('Digit2');
    s = await snap(300);
  }
  assert(s.run.state === 'intermission', `rodada 1 não limpou: ${JSON.stringify(s.run)}`);
  for (let i = 0; i < 200 && s.run.state !== 'shop'; i++) s = await snap(20);
  assert(s.run.state === 'shop', `a loja deveria abrir: ${JSON.stringify(s.run)}`);
  for (let i = 0; i < 10 && !s.shop.offers.some((o) => o.id === 'forca' && !o.sold); i++) s = await tap('KeyR');
  const slot = s.shop.offers.findIndex((o) => o.id === 'forca' && !o.sold);
  assert(slot >= 0, `forca não apareceu na loja: ${JSON.stringify(s.shop.offers)}`);
  s = await tap(`Digit${slot + 1}`);
  assert(s.modifiers.forca === 1, `forca deveria estar no nível 1: ${JSON.stringify(s.modifiers)}`);
  s = await tap('Enter');
  assert(s.run.state === 'roundActive' && s.run.round === 2, `rodada 2 deveria começar: ${JSON.stringify(s.run)}`);
  for (let i = 0; i < 40 && s.enemies.length === 0; i++) s = await snap(300);
  // A energia nasce no teto (100): conjura o Vermelho no vazio para gastar energia e deixar espaço para os +3.
  s = await tap('KeyL');
  for (let i = 0; i < 120 && s.tech.cast !== null; i++) s = await frame();
  assert(s.ce.cur <= s.ce.max - 3, `MOV-15: pré-condição, energia abaixo do teto: ${s.ce.cur}/${s.ce.max}`);
  s = await snap(300);
  s = await approach();
  const target = nearest(s);
  const hpE = target.hp;
  await down('KeyJ');
  let prev = await frame();
  await up('KeyJ');
  let hit = null;
  for (let i = 0; i < 30 && !hit; i++) {
    const cur = await frame();
    if (cur.enemies.find((e) => e.id === target.id).hp < hpE) hit = { prev, cur };
    else prev = cur;
  }
  assert(hit, 'MOV-15: o jab deveria acertar');
  assert(
    hpE - hit.cur.enemies.find((e) => e.id === target.id).hp === 7,
    `MOV-15: com forca 1 o jab (6) deveria causar 7, causou ${hpE - hit.cur.enemies.find((e) => e.id === target.id).hp}`,
  );
  // CE-06: +3 por golpe que conecta. Sem limite de alvos nesta branch, o jab pode pegar dois inimigos empilhados no
  // mesmo frame (o Vermelho, agora mais rápido, muda onde eles param): conta quantos perderam vida e exige +3 por cada.
  const struck = hit.cur.enemies.filter((e) => {
    const before = hit.prev.enemies.find((p) => p.id === e.id);
    return before !== undefined && e.hp < before.hp;
  }).length;
  const ceGain = hit.cur.ce.cur - hit.prev.ce.cur;
  assert(
    struck >= 1 && ceGain >= 3 * struck && ceGain <= 3 * struck + 0.2,
    `MOV-15: cada golpe que conecta deveria somar +3 de energia (CE-06): ${struck} atingido(s), somou ${ceGain}`,
  );

  // --- Edge case: com técnica em conjuração, guarda, parry e esquiva não começam -----------------------------------------------
  await boot('enemyGuard=0&tech=vermelho');
  s = await snap(60);
  const dodges0 = count(s, 'dodge');
  const parries0 = count(s, 'parry');
  await down('KeyL');
  s = await frame();
  await up('KeyL');
  assert(s.tech.cast !== null, `a conjuração deveria ter começado: ${JSON.stringify(s.tech)}`);
  let castFrames = 0;
  for (let i = 0; i < 120 && s.tech.cast !== null; i++) {
    if (i % 3 === 0) {
      await down('KeyU');
      await down('KeyQ');
    }
    s = await frame();
    await up('KeyU');
    await up('KeyQ');
    if (s.tech.cast === null) break;
    castFrames++;
    assert(
      s.player.guard === 'none',
      `edge conjuração: guarda/parry não começam em conjuração: ${s.player.guard} (cast ${JSON.stringify(s.tech.cast)})`,
    );
    assert(
      !s.player.dodge.active && count(s, 'dodge') === dodges0,
      `edge conjuração: a esquiva não começa em conjuração: ${JSON.stringify(s.player.dodge)}`,
    );
  }
  assert(castFrames >= 6, `a conjuração deveria durar alguns frames: ${castFrames}`);
  assert(count(s, 'parry') === parries0, 'edge conjuração: nenhum parry em conjuração');
  // Controle: terminada a conjuração, a guarda volta a funcionar.
  for (let i = 0; i < 20; i++) s = await frame();
  s = await tapFrame('KeyU');
  assert(s.player.guard === 'parry', `depois da conjuração o U deveria abrir o parry: ${s.player.guard}`);

  // --- Edge case: nova run zera a estrutura do jogador, o combo e o `timeScale` ------------------------------------------------
  // Um inimigo comum bate no jogador, que bloqueia (estrutura 15) e morre logo depois; a trava do game over (1000 ms) é menor
  // que o decaimento da estrutura (1000 ms de espera + 20/s), então a estrutura ainda é > 0 quando o J começa a run nova.
  await boot('enemyGuard=0');
  const d = { s: await startDuel(), f: 0 };
  d.step = async () => {
    d.s = await frame();
    d.f += 1;
    return d.s;
  };
  await down('KeyD');
  for (let i = 0; i < 20 && Math.abs(nearest(d.s).x - d.s.player.x) > 30; i++) await d.step();
  await up('KeyD');
  for (let i = 0; i < 6; i++) await d.step();
  while (d.f < 6) await d.step();
  await down('KeyU');
  const blocks0 = count(d.s, 'block');
  for (let i = 0; i < 60 && count(d.s, 'block') === blocks0; i++) await d.step();
  await up('KeyU');
  assert(
    count(d.s, 'block') === blocks0 + 1 && d.s.player.structure.cur === 15,
    `pré-condição: bloqueio deveria dar 15 de estrutura: ${JSON.stringify(d.s.player.structure)}`,
  );
  await tap('Digit3'); // o jogador morre
  s = await snap(50);
  for (let i = 0; i < 100 && s.run.state !== 'gameOver'; i++) s = await frame();
  assert(s.run.state === 'gameOver', `deveria dar game over: ${JSON.stringify(s.run)}`);
  for (let i = 0; i < 61; i++) s = await frame(); // trava de 1000 ms
  assert(
    s.player.structure.cur > 0,
    `pré-condição: a estrutura ainda deveria ser > 0 antes da run nova: ${JSON.stringify(s.player.structure)}`,
  );
  s = await tap('KeyJ');
  assert(s.run.state === 'roundActive' && s.run.round === 1, `a run nova deveria começar: ${JSON.stringify(s.run)}`);
  assert(
    s.player.structure.cur === 0 && !s.player.structure.broken,
    `nova run: estrutura do jogador deveria ser 0: ${JSON.stringify(s.player.structure)}`,
  );
  assert(
    s.enemies.every((e) => e.structure.cur === 0 && !e.structure.broken),
    `nova run: estrutura dos inimigos deveria ser 0: ${JSON.stringify(s.enemies.map((e) => e.structure))}`,
  );
  assert(
    s.combo.hits === 0 && s.combo.grade === null && s.hud.combo.text === null,
    `nova run: o combo deveria zerar: ${JSON.stringify(s.combo)} ${JSON.stringify(s.hud.combo)}`,
  );
  assert(s.timeScale === 1, `nova run: timeScale deveria ser 1: ${s.timeScale}`);
}
