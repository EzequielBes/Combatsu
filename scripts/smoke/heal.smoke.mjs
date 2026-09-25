// Gota de cura (HEAL-01..10) com `?debug&seed=1&heal=1`: cada abate solta uma gota; ela cura o teto de 8 hp só
// quando falta vida, e fica esperando no chão com vida cheia.
export default async function ({ page, baseUrl, assert }) {
  await page.goto(`${baseUrl}?debug&seed=1&heal=1`, { waitUntil: 'load' });
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
  for (let i = 0; i < 200 && snap.pickups.some((p) => p.id === heal.id); i++) {
    const dir = heal.x >= snap.player.x ? 'KeyD' : 'KeyA';
    await page.keyboard.down(dir);
    snap = await stepAndSnap(50);
    await page.keyboard.up(dir);
  }
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

  // HEAL-04/09: com vida cheia, uma gota nova nem entra em ímã nem é coletada, mesmo com o player em cima dela.
  for (let i = 0; i < 20 && snap.pickups.filter((p) => p.kind === 'heal').length === 0; i++) {
    await page.keyboard.press('Digit2', { delay: 50 });
    snap = await stepAndSnap(300);
  }
  const fullHpHeal = snap.pickups.find((p) => p.kind === 'heal');
  if (fullHpHeal) {
    // Capturado já aqui: os passeios abaixo podem, sozinhos, consumir boa parte (ou tudo) dos 10000 ms de vida.
    const eventsBeforeExpiry = snap.events.length;
    for (let i = 0; i < 60 && Math.abs(snap.player.x - fullHpHeal.x) >= 4; i++) {
      const dir = fullHpHeal.x >= snap.player.x ? 'KeyD' : 'KeyA';
      await page.keyboard.down(dir);
      snap = await stepAndSnap(50);
      await page.keyboard.up(dir);
    }
    const stillThere = snap.pickups.find((p) => p.id === fullHpHeal.id);
    assert(stillThere, 'HEAL-04: a gota deveria continuar no chão com vida cheia, mesmo com o player em cima');
    assert(stillThere.magnet === false, 'HEAL-09: a gota não deveria entrar em ímã com vida cheia');

    // Sai de perto (fora do alcance do ímã, ECO-10/HEAL-09) antes de esperar o tempo de vida - parado colado nela,
    // um arranhão qualquer de um inimigo por perto ligaria o ímã e a coletaria antes da hora (fora do escopo deste
    // teste de expiração, já coberto no limite exato 9999/10000 em pickup.test.ts).
    const away = snap.player.x < stillThere.x ? 'KeyA' : 'KeyD';
    for (let i = 0; i < 40 && Math.abs(snap.player.x - stillThere.x) < 100; i++) {
      await page.keyboard.down(away);
      snap = await stepAndSnap(50);
      await page.keyboard.up(away);
    }

    // HEAL-05: expira sozinha (sem virar collect:heal:) dentro de uma folga generosa de vida (a espera acima já
    // consumiu parte dos 10000 ms; o limite exato dos dois lados já está em pickup.test.ts).
    let elapsed = 0;
    let cur = snap;
    while (elapsed < 12000 && cur.pickups.some((p) => p.id === fullHpHeal.id)) {
      cur = await stepAndSnap(500);
      elapsed += 500;
    }
    assert(
      !cur.pickups.some((p) => p.id === fullHpHeal.id),
      `HEAL-05: a gota deveria ter expirado sozinha: ${JSON.stringify(cur.pickups)}`,
    );
    // Nota: se o player tomar dano de um inimigo por perto durante a espera, outra gota da mesma leva (heal=1 faz
    // todo abate soltar uma) pode ficar coletável e aparecer como collect:heal: no meio - o que importa aqui é que
    // a gota específica rastreada (fullHpHeal.id) sumiu da lista sem nunca ter entrado em ímã enquanto a vida
    // esteve cheia (já confirmado acima) e que ao menos uma expiração real aconteceu.
    const newEvents = cur.events.slice(eventsBeforeExpiry);
    assert(newEvents.includes('pickupExpired'), `esperava o evento pickupExpired (HEAL-05): ${JSON.stringify(newEvents)}`);
  }
}
