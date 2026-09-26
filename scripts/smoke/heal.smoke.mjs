// `noshop=1` (SHOP-47): o cenário atravessa várias rodadas contando com a intermissão, sem passar pela loja.
// Gota de cura (HEAL-01..10) com `?debug&seed=1&heal=1`: cada abate solta uma gota; ela cura o teto de 8 hp só
// quando falta vida, e fica esperando no chão com vida cheia.
export default async function ({ page, baseUrl, assert }) {
  await page.goto(`${baseUrl}?debug&seed=1&heal=1&noshop=1`, { waitUntil: 'load' });
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
  const stepAndSnap = async (ms) =>
    page.evaluate((n) => {
      window.__game.step(n);
      return window.__game.snapshot();
    }, ms);

  await stepAndSnap(20);
  await page.keyboard.press('KeyJ', { delay: 50 });
  let snap = await stepAndSnap(50);

  // Tecla 4: 50 de dano de teste, para a cura ter o que restaurar.
  await page.keyboard.press('Digit4', { delay: 50 });
  snap = await stepAndSnap(50);
  const hpAfterHurt = snap.player.hp;
  assert(hpAfterHurt < 100, `player deveria ter tomado dano: ${hpAfterHurt}`);

  // HEAL-01/06: com heal=1, o primeiro abate já solta uma gota.
  for (let i = 0; i < 20 && snap.pickups.filter((p) => p.kind === 'heal').length === 0; i++) {
    await page.keyboard.press('Digit2', { delay: 50 });
    snap = await stepAndSnap(300);
  }
  const heal = snap.pickups.find((p) => p.kind === 'heal');
  assert(heal, `esperava uma gota de cura com heal=1: ${JSON.stringify(snap.pickups)}`);
  assert(heal.value === 8, `HEAL-03: a gota deveria valer 8 hp: ${heal.value}`);

  // Anda até a gota - o ímã puxa (HEAL-09: canHeal verdadeiro, player com vida faltando). Mais de um armado pode
  // ter morrido junto (Digit2 acerta todos de uma vez), então mais de uma gota pode ser coletada no caminho - o
  // que importa (HEAL-03/08) é que cada coleta individual restaura exatamente 8.
  const eventsBefore = snap.events.length;
  // Passos de 16 ms (1 frame): no frame em que o hp sobe, o flash de 80 ms (HEAL-10) ainda está aceso.
  let flashSeen = null;
  for (let i = 0; i < 600 && snap.pickups.some((p) => p.id === heal.id); i++) {
    const dir = heal.x >= snap.player.x ? 'KeyD' : 'KeyA';
    const hpBefore = snap.player.hp;
    await page.keyboard.down(dir);
    snap = await stepAndSnap(16);
    await page.keyboard.up(dir);
    if (flashSeen === null && snap.player.hp > hpBefore) flashSeen = snap.player.flash;
  }
  assert(flashSeen === 'G', `HEAL-10: no frame da cura o player deveria piscar em G: ${flashSeen}`);
  const healsBefore = snap.events.filter((e) => e.startsWith('collect:heal:')).length;
  const afterFlash = await stepAndSnap(120);
  // Outra gota coletada nesse meio tempo reacende o flash; só vale checar o apagar sem nova coleta.
  const healsAfter = afterFlash.events.filter((e) => e.startsWith('collect:heal:')).length;
  assert(healsAfter > healsBefore || afterFlash.player.flash === null,`HEAL-10: o flash deveria apagar depois de 80 ms: ${afterFlash.player.flash}`);
  snap = afterFlash;
  assert(!snap.pickups.some((p) => p.id === heal.id), 'a gota deveria ter sido coletada');
  const newHealCollects = snap.events.slice(eventsBefore).filter((e) => e.startsWith('collect:heal:'));
  assert(newHealCollects.length > 0, `HEAL-08: esperava ao menos um collect:heal: nos eventos: ${JSON.stringify(snap.events)}`);
  assert(
    newHealCollects.every((e) => e === 'collect:heal:8'),
    `HEAL-03: cada gota coletada com vida faltando deveria restaurar 8: ${JSON.stringify(newHealCollects)}`,
  );
  const restored = snap.player.hp - hpAfterHurt;
  assert(restored === 8 * newHealCollects.length, `HEAL-03: hp restaurado não bate com as coletas: ${hpAfterHurt} -> ${snap.player.hp}, coletas=${newHealCollects.length}`);

  // Cura vida cheia (bate até full ou fica perto do teto): sobe até maxHp com mais golpes de teste + gotas.
  for (let i = 0; i < 20 && snap.player.hp < 100; i++) {
    await page.keyboard.press('Digit2', { delay: 50 });
    snap = await stepAndSnap(300);
    for (let j = 0; j < 100 && snap.pickups.some((p) => p.kind === 'heal') && snap.player.hp < 100; j++) {
      const h = snap.pickups.find((p) => p.kind === 'heal');
      const dir = h.x >= snap.player.x ? 'KeyD' : 'KeyA';
      await page.keyboard.down(dir);
      snap = await stepAndSnap(50);
      await page.keyboard.up(dir);
    }
  }
  assert(snap.player.hp === 100, `deveria ter chegado à vida cheia para testar HEAL-04/09: ${snap.player.hp}`);

  // HEAL-04/09: com vida cheia, uma gota nem entra em ímã nem é coletada, mesmo com o player em cima dela. O teste
  // acontece no intervalo entre rodadas (nenhum inimigo vivo para ferir o player e tornar a coleta legítima).
  const nearestHeal = (s) =>
    s.pickups
      .filter((p) => p.kind === 'heal')
      .sort((p, q) => Math.abs(p.x - s.player.x) - Math.abs(q.x - s.player.x))[0] ?? null;
  let fullHpHeal = null;
  for (let attempt = 0; attempt < 6 && !fullHpHeal; attempt++) {
    for (let i = 0; i < 40 && snap.run.state !== 'intermission'; i++) {
      await page.keyboard.press('Digit2', { delay: 50 });
      snap = await stepAndSnap(300);
    }
    // Ferido no caminho: as gotas da própria leva curam até o teto.
    for (let i = 0; i < 80 && snap.player.hp < 100 && nearestHeal(snap); i++) {
      const dir = nearestHeal(snap).x >= snap.player.x ? 'KeyD' : 'KeyA';
      await page.keyboard.down(dir);
      snap = await stepAndSnap(50);
      await page.keyboard.up(dir);
    }
    if (snap.run.state === 'intermission' && snap.player.hp === 100) fullHpHeal = nearestHeal(snap);
    if (!fullHpHeal) {
      for (let i = 0; i < 20 && snap.run.state !== 'roundActive'; i++) snap = await stepAndSnap(300);
    }
  }
  assert(fullHpHeal, `HEAL-04: esperava uma gota no chão com a vida cheia no intervalo: ${JSON.stringify(snap.pickups)}`);
  {
    // Capturado já aqui: os passeios abaixo podem, sozinhos, consumir boa parte (ou tudo) dos 10000 ms de vida.
    const eventsBeforeExpiry = snap.events.length;
    for (let i = 0; i < 60 && Math.abs(snap.player.x - fullHpHeal.x) >= 4; i++) {
      const dir = fullHpHeal.x >= snap.player.x ? 'KeyD' : 'KeyA';
      await page.keyboard.down(dir);
      snap = await stepAndSnap(50);
      await page.keyboard.up(dir);
    }
    assert(snap.player.hp === 100, `a vida deveria seguir cheia ao chegar na gota: ${snap.player.hp}`);
    const stillThere = snap.pickups.find((p) => p.id === fullHpHeal.id);
    assert(stillThere, 'HEAL-04: a gota deveria continuar no chão com vida cheia, mesmo com o player em cima');
    assert(stillThere.magnet === false, 'HEAL-09: a gota não deveria entrar em ímã com vida cheia');

    // HEAL-05: morto o player não coleta nada (ECO-11) e os pickups seguem no chão até expirar (edge case da spec):
    // a gota rastreada só pode sumir por expiração, sem depender de nenhum inimigo errar o golpe.
    await page.keyboard.press('Digit3', { delay: 50 });
    let elapsed = 0;
    let cur = await stepAndSnap(50);
    assert(cur.player.dead, 'o player deveria estar morto para a espera da expiração');
    while (elapsed < 12000 && cur.pickups.some((p) => p.id === fullHpHeal.id)) {
      cur = await stepAndSnap(500);
      elapsed += 500;
    }
    assert(
      !cur.pickups.some((p) => p.id === fullHpHeal.id),
      `HEAL-05: a gota deveria ter expirado sozinha: ${JSON.stringify(cur.pickups)}`,
    );
    const newEvents = cur.events.slice(eventsBeforeExpiry);
    assert(!newEvents.some((e) => e.startsWith('collect:heal:')), `ECO-11: morto não coleta: ${JSON.stringify(newEvents)}`);
    assert(newEvents.includes('pickupExpired'), `esperava o evento pickupExpired (HEAL-05): ${JSON.stringify(newEvents)}`);
  }
}
