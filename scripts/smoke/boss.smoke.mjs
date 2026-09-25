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
  const stepAndSnap = (ms) => page.evaluate((n) => { window.__game.step(n); return window.__game.snapshot(); }, ms);

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
}
