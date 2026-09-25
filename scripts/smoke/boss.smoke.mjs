// Chefe no jogo (T8: BOSS-01/03/06/08, BAT-01/05/09/11, BAI-04/13, BHUD-04) com `?debug&seed=1&round=5`, para a
// run começar direto na rodada de chefe sem esperar as 4 rodadas anteriores. LEVEL_1 tem dois pontos `E`, em
// x=624 e x=1200; o player nasce em x=112, então o ponto mais distante (BOSS-03) é o de x=1200.
export default async function ({ page, baseUrl, assert }) {
  await page.goto(`${baseUrl}?debug&seed=1&round=5`, { waitUntil: 'load' });
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
  // Avança `ms` e devolve o snapshot resultante (padrão dos outros cenários de smoke).
  // O chefe nunca sai da sala (544 px de altura): guarda contra o corpo afundar no chão depois de um pouso.
  const stepAndSnap = async (ms) => {
    const sn = await page.evaluate((n) => { window.__game.step(n); return window.__game.snapshot(); }, ms);
    if (sn.boss) assert(sn.boss.y < 544, `o chefe saiu da sala: ${JSON.stringify(sn.boss)}`);
    return sn;
  };

  await stepAndSnap(20);

  // J começa a run direto na rodada 5 (?round=5): um chefe só, zero inimigos comuns (BOSS-01, BHUD-04).
  await page.keyboard.press('KeyJ', { delay: 50 });
  let snap = await stepAndSnap(50);
  assert(
    snap.run.state === 'roundActive' && snap.run.round === 5,
    `run deveria começar direto na rodada 5: ${JSON.stringify(snap.run)}`,
  );
  assert(snap.enemies.length === 0, `rodada de chefe não deveria ter inimigos comuns: ${snap.enemies.length}`);
  assert(snap.boss !== null, 'a rodada 5 deveria ter um chefe');
  assert(
    snap.boss.name === 'Oni do Portão' && snap.boss.maxHp === 600,
    `chefe do tier 1 errado: ${JSON.stringify(snap.boss)}`,
  );

  // BOSS-03: nasce no ponto E mais distante do player (E em x=624 e x=1200; player em x=112 -> o mais distante é 1200).
  assert(Math.abs(snap.player.x - 112) < 1, `player não estava no spawn esperado: x=${snap.player.x}`);
  assert(Math.abs(snap.boss.x - 1200) < 1, `chefe não nasceu no ponto E mais distante do player: x=${snap.boss.x}`);

  const introX = snap.boss.x;
  const maxHp = snap.boss.maxHp;

  // BOSS-06/08: por ~1400 ms (dentro dos 1500 ms de intro) o x não muda e um golpe de teste no meio não tira hp.
  let s = snap;
  for (let i = 0; i < 7; i++) {
    if (i === 3) await page.keyboard.press('Digit2', { delay: 50 }); // golpe de teste forte no meio da intro
    s = await stepAndSnap(200);
    assert(s.boss.state === 'intro', `esperava o chefe ainda na intro: ${JSON.stringify(s.boss)}`);
    assert(Math.abs(s.boss.x - introX) < 0.5, `x do chefe mudou durante a intro: ${s.boss.x}`);
    assert(s.boss.hp === maxHp, `golpe de teste tirou hp do chefe durante a intro: ${JSON.stringify(s.boss)}`);
  }
  // O próprio chefe recusa o golpe na intro (retorno de receiveHit, que decide faísca e hitstop).
  assert(!s.events.includes('bossHitAccepted'), `o chefe aceitou golpe na intro: ${JSON.stringify(s.events)}`);

  // Passa o fim da intro (1500 ms) e confere que o primeiro ataque do ciclo da fase 1 é a investida, em preparo.
  let afterIntro = null;
  for (let i = 0; i < 10 && !afterIntro; i++) {
    const next = await stepAndSnap(50);
    if (next.boss.state !== 'intro') afterIntro = next;
  }
  assert(afterIntro, 'chefe não saiu da intro a tempo');
  assert(
    afterIntro.boss.state === 'windup' && afterIntro.boss.attack === 'charge',
    `primeiro ataque da fase 1 deveria ser um preparo de investida: ${JSON.stringify(afterIntro.boss)}`,
  );

  // BAT-01/05/11: o preparo da investida dura pelo menos 600 ms (fase 1, sem multiplicador), sem o x mudar; só
  // depois do preparo o x começa a mudar. Passo de 50 ms: múltiplo exato do tick fixo de 1000/60 ms do `step`
  // (que arredonda pra cima), senão o total contado fica menor que o tempo simulado de verdade.
  const windupBossX = afterIntro.boss.x;
  let windupMs = 0;
  s = afterIntro;
  while (s.boss.state === 'windup') {
    assert(Math.abs(s.boss.x - windupBossX) < 0.5, `x do chefe mudou durante o preparo da investida: ${s.boss.x}`);
    s = await stepAndSnap(50);
    windupMs += 50;
    if (windupMs > 2000) throw new Error('preparo da investida nunca terminou');
  }
  assert(windupMs >= 600, `preparo da investida deveria durar >= 600 ms, mediu ${windupMs} ms`);
  assert(s.boss.state === 'charge', `depois do preparo o chefe deveria estar investindo: ${JSON.stringify(s.boss)}`);
  const afterCharge = await stepAndSnap(150);
  assert(
    Math.abs(afterCharge.boss.x - windupBossX) > 5,
    `x do chefe não mudou depois do preparo da investida: ${afterCharge.boss.x}`,
  );

  // BAT-08/13: sem tocar em nenhuma tecla de movimento, deixa o chefe terminar a investida e o salto sozinho até
  // ficar perto do player parado (o salto mira o x do player, que nunca se move) e confere que o contato do corpo
  // sem hitbox aberta não tira hp. `state === 'rest'` garante que qualquer hitbox de pouso de 1 frame já fechou
  // (o passo de 50 ms cobre vários ticks de física de 1/60 s).
  let contact = null;
  let cur = afterCharge;
  for (let i = 0; i < 300 && !contact; i++) {
    cur = await stepAndSnap(50);
    const close = Math.abs(cur.boss.x - cur.player.x) < 50;
    if (close && cur.boss.state === 'rest') contact = cur;
  }
  assert(contact, 'o chefe nunca ficou perto do player parado depois da investida e do salto');
  // Um tick extra (a hitbox de pouso é criada no meio do tick em que `state` já lê 'rest'; o Matter só detecta a
  // colisão no tick seguinte) para o dano legítimo do pouso, se acertou, já estar aplicado antes da linha de base.
  const settled = await stepAndSnap(50);
  const hpBeforeContact = settled.player.hp;
  const afterContact = await stepAndSnap(100);
  assert(
    afterContact.player.hp === hpBeforeContact,
    `player perdeu hp encostado no chefe sem hitbox aberta (BAT-08): ${hpBeforeContact} -> ${afterContact.player.hp}`,
  );

  // BAI-04/13: golpes de teste até cruzar 66% de vida (396 de 600) - state vira 'roar', golpes durante o rugido
  // não tiram hp e o player recebe um empurrão para longe do chefe.
  let prev = afterContact;
  let roared = null;
  for (let i = 0; i < 20 && !roared; i++) {
    await page.keyboard.press('Digit2', { delay: 50 });
    const next = await stepAndSnap(100);
    if (next.boss.state === 'roar' && prev.boss.state !== 'roar') roared = { prev, next };
    prev = next;
  }
  assert(roared, 'o chefe nunca entrou em rugido depois de cruzar 66% de vida');
  assert(roared.next.boss.hp <= maxHp * 0.66, `hp deveria estar em 66% ou menos: ${roared.next.boss.hp}`);

  // Golpe de teste durante o rugido (BAI-12/BOSS-08): não deveria tirar hp.
  const hpAtRoar = roared.next.boss.hp;
  await page.keyboard.press('Digit2', { delay: 50 });
  const stillRoar = await stepAndSnap(50);
  assert(stillRoar.boss.state === 'roar', `chefe deveria continuar em rugido: ${JSON.stringify(stillRoar.boss)}`);
  assert(
    stillRoar.boss.hp === hpAtRoar,
    `golpe de teste durante o rugido tirou hp: ${hpAtRoar} -> ${stillRoar.boss.hp}`,
  );

  // Empurrão (BAI-13): compara o x do player de antes do golpe que cruzou o limiar com o de depois - deve ter se
  // afastado do chefe na direção esperada (a mesma checagem do Boss.ts: para o lado onde o player já estava).
  const expectedDir = roared.prev.player.x >= roared.prev.boss.x ? 1 : -1;
  const pushDelta = roared.next.player.x - roared.prev.player.x;
  assert(
    Math.sign(pushDelta) === expectedDir && Math.abs(pushDelta) > 1,
    `player deveria ter sido empurrado para longe do chefe ao entrar em rugido: antes=${roared.prev.player.x} depois=${roared.next.player.x} (chefe em ${roared.prev.boss.x})`,
  );

  // BHUD-04: o snapshot lê o chefe vivo (não o tuning) e tem os campos esperados.
  assert(
    typeof stillRoar.boss.phase === 'number' &&
      typeof stillRoar.boss.poise === 'number' &&
      stillRoar.boss.archetype === 'oni',
    `snapshot do chefe incompleto: ${JSON.stringify(stillRoar.boss)}`,
  );

  // T9 (BAT-03/04/06/12): na fase 2 o ciclo é investida -> rajada -> salto (BAI-02); avança sem prever o tempo
  // exato de cada ataque, só observando `snapshot.projectiles` (lido do objeto vivo) até ver a rajada e o pouso.
  // Cada projétil tem um `id` único (nunca reaproveitado): identifica um disparo mesmo que ele já tenha sumido
  // (acertou o player) antes do próximo nascer, então a contagem não depende de vários estarem vivos ao mesmo
  // tempo. `step(1 tick)` a cada volta: `step(ms)` sempre arredonda para cima ao tick fixo de 1000/60 ms, então
  // medir o intervalo entre disparos com uma unidade "elapsed" diferente do tick real desalinha a medição.
  const TICK_MS = 1000 / 60;
  const boltFirst = new Map(); // id -> { t, speed }
  const boltOrder = [];
  const waveFirst = new Map(); // id -> { t, dir, height }
  const waveOrder = [];
  let volleyHpBefore = null;
  let volleyHit = null; // dano isolado enquanto boss.state === 'volley' (só o projétil causa dano nesse estado)
  let elapsed = 0;
  cur = stillRoar;
  for (let i = 0; i < 1500 && (boltOrder.length < 3 || waveOrder.length < 2); i++) {
    cur = await stepAndSnap(1);
    elapsed += TICK_MS;
    for (const p of cur.projectiles) {
      if (p.kind === 'projectile' && !boltFirst.has(p.id)) {
        boltFirst.set(p.id, { t: elapsed, speed: p.speed });
        boltOrder.push(p.id);
      } else if (p.kind === 'shockwave' && !waveFirst.has(p.id)) {
        waveFirst.set(p.id, { t: elapsed, dir: p.dir, height: p.height });
        waveOrder.push(p.id);
      }
    }
    if (cur.boss.state === 'volley' && volleyHpBefore === null) volleyHpBefore = cur.player.hp;
    if (volleyHpBefore !== null && !volleyHit && cur.player.hp < volleyHpBefore) {
      volleyHit = { before: volleyHpBefore, after: cur.player.hp };
    }
  }
  assert(boltOrder.length >= 3, `a rajada da fase 2 nunca disparou os 3 projéteis esperados (BAT-04): ${boltOrder.length}`);
  assert(waveOrder.length >= 2, `o chefe nunca pousou de um salto na fase 2 com as duas ondas de choque (BAT-03): ${waveOrder.length}`);

  // BAT-04: os 3 primeiros projéteis da rajada, a 260 px/s (tier 1, Oni), ~150 ms entre disparos (±1 frame no
  // relógio do `BossAI`, que é puro - ver tests/core/bossAI.test.ts). Do lado de fora (smoke), um projétil que
  // acerta o player (BAT-06, checado logo abaixo) dispara um hitstop de 50 ms (`HITSTOP_MS.light`) que congela a
  // cena inteira, inclusive o cronômetro da rajada - por isso a folga aqui é maior que ±1 frame: cobre o caso em
  // que um golpe (ou mais de um) da própria rajada gera hitstop entre dois disparos.
  const firstThreeBolts = boltOrder.slice(0, 3).map((id) => boltFirst.get(id));
  assert(
    firstThreeBolts.every((b) => Math.abs(b.speed - 260) < 0.01),
    `projétil da rajada com velocidade errada: ${JSON.stringify(firstThreeBolts)}`,
  );
  for (let i = 1; i < firstThreeBolts.length; i++) {
    const delta = firstThreeBolts[i].t - firstThreeBolts[i - 1].t;
    assert(
      delta >= 140 && delta <= 300,
      `intervalo entre disparos deveria ser ~150 ms (+ hitstop se algum acertou): ${JSON.stringify(firstThreeBolts)}`,
    );
  }

  // BAT-06: um projétil que acerta o player tira o dano do spec (10 no tier 1); isolado porque durante o estado
  // `volley` só o projétil pode causar dano (o chefe não tem hitbox de investida/pouso aberta nesse estado).
  assert(volleyHit, 'nenhum projétil da rajada acertou o player para confirmar o dano (BAT-06)');
  assert(
    volleyHit.before - volleyHit.after === 10,
    `dano do projétil deveria ser 10 (tier 1): ${volleyHit.before} -> ${volleyHit.after}`,
  );

  // BAT-03: as duas ondas do pouso, direções opostas e 20 px de altura, lidas no instante em que cada uma nasceu.
  const firstTwoWaves = waveOrder.slice(0, 2).map((id) => waveFirst.get(id));
  const dirs = firstTwoWaves.map((w) => w.dir).sort();
  assert(dirs[0] === -1 && dirs[1] === 1, `ondas deveriam ter direções opostas: ${JSON.stringify(firstTwoWaves)}`);
  assert(
    firstTwoWaves.every((w) => w.height === 20),
    `onda de choque deveria ter 20 px de altura: ${JSON.stringify(firstTwoWaves)}`,
  );

  // BAT-06/12: as ondas somem (parede ou 600 px) - continua avançando até a lista ficar sem nenhuma onda viva,
  // guardando o último estado de cada onda para saber onde e com quanto percorrido ela sumiu.
  const waveLast = new Map();
  const noteWaves = (snap) => {
    for (const p of snap.projectiles) if (p.kind === 'shockwave') waveLast.set(p.id, { x: p.x, traveled: p.traveled });
  };
  noteWaves(cur);
  let wavesCleared = cur.projectiles.filter((p) => p.kind === 'shockwave').length === 0;
  for (let i = 0; i < 500 && !wavesCleared; i++) {
    cur = await stepAndSnap(20);
    noteWaves(cur);
    if (cur.projectiles.filter((p) => p.kind === 'shockwave').length === 0) wavesCleared = true;
  }
  assert(wavesCleared, 'as ondas de choque nunca sumiram (parede ou 600 px)');
  // BAT-06 (parede): o salto mira o x do player, então as ondas acima nasceram em cima dele e sumiram no contato.
  // Para exercitar a parede, espera o próximo salto e anda para a direita durante o voo: o pouso fica perto da
  // parede esquerda e a onda que vai para a esquerda bate nela sem passar pelo player, bem antes dos 600 px (BAT-12).
  // Posiciona o player a menos de ~400 px de uma parede (sala de 1280 px, paredes internas em x = 32 e 1248),
  // para o pouso ficar perto dela; durante o voo ele anda para longe dessa parede, liberando o caminho da onda.
  if (Math.abs(cur.player.x - 640) < 240) {
    const key = cur.player.x < 640 ? 'KeyA' : 'KeyD';
    await page.keyboard.down(key);
    for (let i = 0; i < 40 && Math.abs(cur.player.x - 640) < 240; i++) cur = await stepAndSnap(50);
    await page.keyboard.up(key);
  }
  let inLeap = false;
  for (let i = 0; i < 1500 && !inLeap; i++) {
    cur = await stepAndSnap(20);
    if (cur.boss && cur.boss.state === 'leap') inLeap = true;
  }
  assert(inLeap, 'o chefe não saltou de novo para o teste da parede');
  const nearLeft = cur.player.x < 640;
  const towardWall = nearLeft ? -1 : 1;
  await page.keyboard.down(nearLeft ? 'KeyD' : 'KeyA');
  cur = await stepAndSnap(800);
  await page.keyboard.up(nearLeft ? 'KeyD' : 'KeyA');
  const wallWaves = new Map();
  const noteWall = (snap) => {
    for (const p of snap.projectiles) if (p.kind === 'shockwave') wallWaves.set(p.id, { x: p.x, dir: p.dir, traveled: p.traveled });
  };
  noteWall(cur);
  for (let i = 0; i < 200 && cur.projectiles.some((p) => p.kind === 'shockwave'); i++) {
    cur = await stepAndSnap(20);
    noteWall(cur);
  }
  // A onda que vai para a parede próxima some encostada nela (x a menos de 70 px da parede, sem passar dela) e
  // bem antes dos 600 px do alcance: remoção pela parede (BAT-06), não pelo Mover (BAT-12).
  const atWall = (w) => (w.dir === -1 ? w.x > 30 && w.x < 102 : w.x > 1178 && w.x < 1250);
  const wallRemoved = [...wallWaves.values()].some((w) => w.dir === towardWall && atWall(w) && w.traveled < 560);
  assert(wallRemoved, `a onda deveria sumir na parede antes do alcance: ${JSON.stringify([...wallWaves.values()])}`);

  // Edge case (pouso): com o player embaixo da plataforma da linha 12 do LEVEL_1 (x 256..416, topo em y = 384),
  // o chefe pousa no piso principal (centro em 480 − 28 = 452), nunca em cima da plataforma.
  {
    const under = (x) => x >= 280 && x <= 392; // dentro da plataforma, com margem para o corpo do player
    // Recalcula a direção a cada passo: o chefe pode empurrar ou atingir o player no caminho.
    for (let i = 0; i < 160 && !under(cur.player.x); i++) {
      const key = cur.player.x > 336 ? 'KeyA' : 'KeyD';
      await page.keyboard.down(key);
      cur = await stepAndSnap(50);
      await page.keyboard.up(key);
    }
    assert(under(cur.player.x), `player não chegou embaixo da plataforma: ${cur.player.x}`);
    let flying = false;
    let landed = false;
    for (let i = 0; i < 1500 && !landed; i++) {
      cur = await stepAndSnap(20);
      if (cur.boss && cur.boss.state === 'leap') flying = true;
      else if (flying && cur.boss) landed = true;
    }
    assert(landed, 'o chefe não saltou para o teste do pouso');
    assert(Math.abs(cur.boss.y - 452) < 3, `o chefe deveria pousar no piso (y 452): ${JSON.stringify(cur.boss)}`);
  }

  // Edge case (T9): J depois de um game over com o chefe vivo e projéteis em voo -> nova run sem chefe nem projéteis.
  // O ciclo da fase 2 continua (investida -> rajada -> salto): avança até o próximo ataque pôr algum projétil em
  // voo de novo, para matar o player com pelo menos um projétil (ou onda) vivo na hora do game over.
  let hasFlying = false;
  for (let i = 0; i < 1000 && !hasFlying; i++) {
    cur = await stepAndSnap(20);
    if (cur.projectiles.length > 0) hasFlying = true;
  }
  assert(hasFlying, 'nenhum novo projétil apareceu para testar o edge case de game over em pleno voo');
  await page.keyboard.press('Digit3', { delay: 50 }); // mata o player (tecla 3)
  let overSnap = await stepAndSnap(100);
  for (let i = 0; i < 20 && overSnap.run.state !== 'gameOver'; i++) overSnap = await stepAndSnap(100);
  assert(overSnap.run.state === 'gameOver', `esperava game over depois da morte do player: ${JSON.stringify(overSnap.run)}`);
  assert(overSnap.boss !== null, 'o chefe deveria continuar vivo no game over (para o teste do edge case)');
  // RUN-05/11: a trava de 1000 ms (RUN.gameOverLockMs) precisa passar antes do J valer para começar uma run nova.
  await stepAndSnap(1100);
  await page.keyboard.press('KeyJ', { delay: 50 });
  const newRun = await stepAndSnap(50);
  // `?round=5` (debug) faz a run nova recomeçar direto numa rodada de chefe: um chefe novo nasce no mesmo
  // comando que reinicia (startRun + spawn), então o teste do `startRun` (design.md: "remove o chefe e os
  // projéteis") é o chefe estar zerado (não o antigo, com hp=384/fase 2 ainda em rajada) e nenhum projétil velho.
  assert(newRun.projectiles.length === 0, `nova run não deveria ter projéteis do chefe anterior: ${JSON.stringify(newRun.projectiles)}`);
  assert(
    newRun.boss !== null && newRun.boss.hp === newRun.boss.maxHp && newRun.boss.state === 'intro',
    `nova run deveria ter um chefe novo (não o antigo em pleno combate): ${JSON.stringify(newRun.boss)}`,
  );

  // BTIER-05/07: rodada 15 (tier 3) é a Tecelã de Maldições - rajada de 5 projéteis a 325 px/s (260 x 1.25).
  await page.goto(`${baseUrl}?debug&seed=1&round=15`, { waitUntil: 'load' });
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
  await stepAndSnap(20);
  await page.keyboard.press('KeyJ', { delay: 50 });
  let snap15 = await stepAndSnap(50);
  assert(
    snap15.boss !== null && snap15.boss.archetype === 'tecela' && snap15.boss.name === 'Tecelã de Maldições',
    `rodada 15 deveria ter a Tecelã de Maldições: ${JSON.stringify(snap15.boss)}`,
  );
  const maxHp15 = snap15.boss.maxHp;

  // Passa a intro (1500 ms) e traz a vida a 66% ou menos com golpes de teste, até a fase 2 (que tem rajada).
  for (let i = 0; i < 10 && snap15.boss.state === 'intro'; i++) snap15 = await stepAndSnap(200);
  assert(snap15.boss.state !== 'intro', 'chefe da rodada 15 não saiu da intro a tempo');
  for (let i = 0; i < 40 && snap15.boss.hp > maxHp15 * 0.66; i++) {
    await page.keyboard.press('Digit2', { delay: 50 });
    snap15 = await stepAndSnap(100);
  }
  assert(snap15.boss.hp <= maxHp15 * 0.66, `Tecelã deveria estar em 66% de vida ou menos: ${snap15.boss.hp}`);
  // Sai do rugido (900 ms) para a IA voltar a agir.
  for (let i = 0; i < 20 && snap15.boss.state === 'roar'; i++) snap15 = await stepAndSnap(100);
  assert(snap15.boss.state !== 'roar', 'Tecelã nunca saiu do rugido a tempo');

  // Id único por projétil (nunca reaproveitado): conta disparos mesmo que um já tenha sumido antes do próximo.
  const bolt15First = new Map();
  const bolt15Order = [];
  cur = snap15;
  for (let i = 0; i < 1500 && bolt15Order.length < 5; i++) {
    cur = await stepAndSnap(1);
    for (const p of cur.projectiles) {
      if (p.kind === 'projectile' && !bolt15First.has(p.id)) {
        bolt15First.set(p.id, p);
        bolt15Order.push(p.id);
      }
    }
  }
  assert(bolt15Order.length >= 5, `a rajada da Tecelã (rodada 15) nunca disparou os 5 projéteis esperados (BTIER-05): ${bolt15Order.length}`);
  const volley15 = bolt15Order.slice(0, 5).map((id) => bolt15First.get(id));
  assert(
    volley15.every((p) => Math.abs(p.speed - 325) < 0.01),
    `projétil da Tecelã deveria ir a 325 px/s (BTIER-07): ${JSON.stringify(volley15)}`,
  );
}
