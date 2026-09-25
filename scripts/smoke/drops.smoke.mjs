// Fragmentos (ECO-01, ECO-08..10, ECO-16, ECO-21..22, ECO-27) com `?debug&seed=1`: mata um inimigo, anda até os
// fragmentos e confere carteira, ímã, eventos, HUD, expiração e a limpeza numa run nova.
export default async function ({ page, baseUrl, assert }) {
  await page.goto(`${baseUrl}?debug&seed=1`, { waitUntil: 'load' });
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
  assert(snap.run.state === 'roundActive', `run deveria estar ativa: ${JSON.stringify(snap.run)}`);
  assert(snap.wallet.fragments === 0, `carteira deveria começar em 0 (ECO-14): ${snap.wallet.fragments}`);

  // ECO-01: mata inimigos com golpe de teste até um drop de fragmentos aparecer no chão.
  for (let i = 0; i < 20 && snap.pickups.filter((p) => p.kind === 'fragment').length === 0; i++) {
    await page.keyboard.press('Digit2', { delay: 50 });
    snap = await stepAndSnap(300);
  }
  const dropped = snap.pickups.filter((p) => p.kind === 'fragment');
  assert(dropped.length >= 2, `ECO-01/02: esperava ao menos 2 fragmentos soltos, veio ${dropped.length}: ${JSON.stringify(dropped)}`);
  // ECO-06: velocidade inicial do estouro dentro da faixa (vx nasce e é imediatamente movido pelo passo do pickup;
  // a checagem de fundo mora em pickup.test.ts - aqui só confirmamos que o pickup existe com um id e um valor > 0).
  assert(dropped.every((p) => p.value > 0 && typeof p.id === 'number'), `pickup sem id/valor válido: ${JSON.stringify(dropped)}`);

  // ECO-09: um fragmento nunca tocado expira aos 15000 ms - isola um pickup específico e confere id sumindo.
  const trackedId = dropped[0].id;
  let far = await stepAndSnap(14500); // ainda dentro dos 15 s (ECO-21 pisca nos últimos 3 s, mas continua vivo)
  assert(
    far.pickups.some((p) => p.id === trackedId),
    `pickup ${trackedId} sumiu cedo demais (deveria durar 15000 ms): ${JSON.stringify(far.pickups)}`,
  );
  far = await stepAndSnap(700);
  assert(
    !far.pickups.some((p) => p.id === trackedId),
    `pickup ${trackedId} deveria ter expirado aos 15000 ms: ${JSON.stringify(far.pickups)}`,
  );
  assert(far.events.includes('pickupExpired'), `esperava o evento pickupExpired: ${JSON.stringify(far.events)}`);

  // ECO-08/10/16/29/30: mata mais inimigos e anda até os fragmentos novos - o ímã puxa perto e a coleta credita.
  snap = far;
  for (let i = 0; i < 20 && snap.pickups.filter((p) => p.kind === 'fragment').length === 0; i++) {
    await page.keyboard.press('Digit2', { delay: 50 });
    snap = await stepAndSnap(300);
  }
  assert(snap.pickups.filter((p) => p.kind === 'fragment').length > 0, 'nenhum fragmento novo para testar a coleta');
  let sawMagnet = false;
  for (let i = 0; i < 300 && snap.pickups.filter((p) => p.kind === 'fragment').length > 0; i++) {
    const target = snap.pickups.find((p) => p.kind === 'fragment');
    if (target.magnet) sawMagnet = true;
    const dir = target.x >= snap.player.x ? 'KeyD' : 'KeyA';
    await page.keyboard.down(dir);
    snap = await stepAndSnap(50);
    await page.keyboard.up(dir);
  }
  assert(
    snap.pickups.filter((p) => p.kind === 'fragment').length === 0,
    `todos os fragmentos deveriam ter sido coletados: ${JSON.stringify(snap.pickups)}`,
  );
  assert(sawMagnet, 'ECO-10: nenhum fragmento entrou em modo ímã ao aproximar');
  assert(snap.wallet.fragments > 0, `carteira deveria ter aumentado (ECO-08): ${snap.wallet.fragments}`);
  assert(
    snap.events.some((e) => e.startsWith('collect:fragment:')),
    `esperava collect:fragment: nos eventos (ECO-29): ${JSON.stringify(snap.events)}`,
  );
  assert(
    snap.hud.fragments === String(snap.wallet.fragments),
    `ECO-16: hud.fragments (${snap.hud.fragments}) deveria bater com a carteira (${snap.wallet.fragments})`,
  );

  // ECO-22: game over mostra "Fragmentos: N" com o saldo da carteira no momento da morte.
  const walletAtDeath = snap.wallet.fragments;
  await page.keyboard.press('Digit3', { delay: 50 }); // mata o player
  let over = await stepAndSnap(100);
  for (let i = 0; i < 20 && over.run.state !== 'gameOver'; i++) over = await stepAndSnap(100);
  assert(over.run.state === 'gameOver', `esperava game over: ${JSON.stringify(over.run)}`);
  const center = over.hud.center ?? [];
  assert(
    center.includes(`Fragmentos: ${walletAtDeath}`),
    `game over sem a linha de fragmentos esperada (Fragmentos: ${walletAtDeath}): ${JSON.stringify(center)}`,
  );

  // ECO-27: nova run zera a carteira e limpa os pickups.
  await stepAndSnap(1100); // trava de RUN.gameOverLockMs
  await page.keyboard.press('KeyJ', { delay: 50 });
  const fresh = await stepAndSnap(50);
  assert(fresh.wallet.fragments === 0, `nova run deveria zerar a carteira: ${fresh.wallet.fragments}`);
  assert(fresh.pickups.length === 0, `nova run deveria remover todo pickup: ${JSON.stringify(fresh.pickups)}`);
}
