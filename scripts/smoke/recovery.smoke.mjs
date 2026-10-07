// Recuperação de vida (REG-01..05, RCT-01..10) com `?debug&seed=1&noshop=1&spawn=0` (nenhum inimigo nasce): regeneração passiva depois de 4 s sem
// dano, e a Energia Amaldiçoada Reversa (F segurada) curando 12 hp/s com o dobro em energia, cortada por golpe.
export default async function ({ page, baseUrl, assert }) {
  const open = async (query) => {
    await page.goto(`${baseUrl}?debug&enemyGuard=0&seed=1&noshop=1&spawn=0${query}`, { waitUntil: 'load' });
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
  };
  const stepAndSnap = async (ms) =>
    page.evaluate((n) => {
      window.__game.step(n);
      return window.__game.snapshot();
    }, ms);
  /** Avança `ms` em passos de 16 ms e junta os eventos de todos os frames. */
  const stepCollect = async (ms) => {
    const events = [];
    let snap;
    for (let left = ms; left > 0; left -= 16) {
      snap = await stepAndSnap(Math.min(16, left));
      events.push(...snap.events);
    }
    return { snap, events };
  };

  // --- Energia Reversa (a passiva desligada para medir só a técnica) ---
  await open('&regen=0');
  await stepAndSnap(20);
  await page.keyboard.press('KeyJ', { delay: 50 });
  await stepAndSnap(50);
  await page.keyboard.press('Digit4', { delay: 50 });
  let snap = await stepAndSnap(400);
  const hpHurt = snap.player.hp;
  const ceFull = snap.ce.cur;
  assert(hpHurt === 50, `o player deveria estar com 50 hp depois do dano de teste: ${hpHurt}`);

  await page.keyboard.down('KeyF');
  let r = await stepCollect(200);
  assert(r.events.includes('rctStart'), `RCT-01: segurar F deveria começar a canalizar: ${JSON.stringify(r.events)}`);
  assert(r.snap.player.hp === hpHurt, `RCT-02: nada cura na concentração: ${r.snap.player.hp}`);

  r = await stepCollect(1050);
  const healed = r.snap.player.hp - hpHurt;
  const spent = ceFull - r.snap.ce.cur;
  assert(healed >= 10 && healed <= 13, `RCT-02: ~12 hp em 1 s de cura: ${healed}`);
  assert(Math.abs(spent - healed * 2) < 0.01, `RCT-03/06: gasto ${spent} deveria ser o dobro da cura ${healed}`);
  assert(
    r.snap.fx.layers.includes('reverse.aura'),
    `RCA-01: a aura deveria estar na tela canalizando: ${JSON.stringify(r.snap.fx.layers)}`,
  );

  // RCT-05: travado no lugar, mesmo apertando para andar.
  const x0 = r.snap.player.x;
  await page.keyboard.down('KeyD');
  r = await stepCollect(300);
  await page.keyboard.up('KeyD');
  assert(
    Math.abs(r.snap.player.x - x0) < 1,
    `RCT-05: o player não deveria andar canalizando: ${x0} -> ${r.snap.player.x}`,
  );

  // RCT-07: levar dano corta a canalização.
  await page.keyboard.press('Digit4', { delay: 50 });
  r = await stepCollect(32);
  assert(r.events.includes('rctStop'), `RCT-07: o golpe deveria cortar a canalização: ${JSON.stringify(r.events)}`);

  // RCT-04: soltar a tecla para.
  r = await stepCollect(400);
  await page.keyboard.up('KeyF');
  r = await stepCollect(50);
  assert(r.events.includes('rctStop'), `RCT-04: soltar F deveria parar: ${JSON.stringify(r.events)}`);
  const hpIdle = r.snap.player.hp;
  r = await stepCollect(500);
  assert(!r.snap.fx.layers.includes('reverse.aura'), `RCA-02: a aura deveria apagar com F solta`);
  assert(
    r.snap.player.hp === hpIdle,
    `com F solta e regen=0, o hp não deveria subir: ${hpIdle} -> ${r.snap.player.hp}`,
  );

  // --- Regeneração passiva ---
  await open('');
  await stepAndSnap(20);
  await page.keyboard.press('KeyJ', { delay: 50 });
  await stepAndSnap(50);
  await page.keyboard.press('Digit4', { delay: 50 });
  snap = await stepAndSnap(50);
  const hpPassive = snap.player.hp;
  r = await stepCollect(3500);
  assert(r.snap.player.hp === hpPassive, `REG-01: nada antes de 4 s sem dano: ${hpPassive} -> ${r.snap.player.hp}`);
  r = await stepCollect(2500);
  assert(r.snap.player.hp > hpPassive, `REG-01: depois de 4 s sem dano a vida deveria subir: ${r.snap.player.hp}`);
  assert(r.snap.player.hp <= 60, `REG-03: a passiva para em 60% do teto: ${r.snap.player.hp}`);
}
