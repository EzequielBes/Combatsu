// Kokusen escalado (ESC-02, ESC-05) com `?debug&hd=1&area=modular&seed=1&noshop=1&tech=divergente`: sem build na
// rodada 1 o Kokusen tira 45 e o snapshot mostra `difficulty` { round: 1, hpMul: 1, damageMul: 1 }; com `mods=forca:5`
// o mesmo golpe tira 68. O número flutuante funde o 1º impacto (12) com o Kokusen (`mergeMs`, POW-06) e vira do tipo
// `kokusen`: vale 12 + dano. No chefe (rodada 5) o Kokusen tira o mesmo dano de HP e 3x dele da postura (`poiseMul`):
// 45 x 3 = 135 passa dos 100 da postura e põe o chefe em `stagger`, o que 45 de postura não faria (ESC-02.5).
// Lê o dano do inimigo vivo e o número do motor.
export default async function ({ page, baseUrl, assert }) {
  const stepAndSnap = async (ms) =>
    page.evaluate((n) => {
      window.__game.step(n);
      return window.__game.snapshot();
    }, ms);
  const frame = () => stepAndSnap(16);
  const countOf = (events, name) => events.filter((e) => e === name).length;
  const press1 = async (code) => {
    await page.keyboard.down(code);
    const s = await frame();
    await page.keyboard.up(code);
    return s;
  };

  /** Abre o jogo com `extra`, começa a run e devolve o primeiro snapshot da rodada. */
  const boot = async (extra) => {
    await page.goto(
      `${baseUrl}?debug&hd=1&area=modular&enemyGuard=0&maxAlive=1&shove=0&seed=1&noshop=1&tech=divergente${extra}`,
      {
        waitUntil: 'load',
      },
    );
    await page.waitForFunction(() => typeof window.__game?.snapshot === 'function', { timeout: 15_000 });
    await stepAndSnap(20);
    await page.keyboard.press('KeyJ', { delay: 50 });
    return stepAndSnap(300);
  };

  /** Anda até um inimigo intacto, conjura o Divergente, aperta a tecla na janela e devolve o snapshot do Kokusen. */
  const landKokusen = async (start) => {
    let snap = start;
    for (let attempt = 0; attempt < 6; attempt++) {
      let target = snap.enemies.find((e) => e.hp === e.maxHp && Math.abs(e.y - snap.player.y) < 24);
      for (let i = 0; i < 20 && !target; i++) {
        snap = await stepAndSnap(300);
        target = snap.enemies.find((e) => e.hp === e.maxHp && Math.abs(e.y - snap.player.y) < 24);
      }
      assert(target, `nenhum inimigo intacto: ${JSON.stringify(snap.enemies)}`);
      for (let i = 0; i < 400; i++) {
        const t = snap.enemies.find((e) => e.id === target.id);
        if (!t || Math.abs(t.x - snap.player.x) <= 40) break;
        const dir = t.x >= snap.player.x ? 'KeyD' : 'KeyA';
        await page.keyboard.down(dir);
        snap = await stepAndSnap(50);
        await page.keyboard.up(dir);
      }
      for (let i = 0; i < 40 && (snap.tech.cast !== null || snap.tech.slots[0].cooldownMs > 0); i++) {
        snap = await stepAndSnap(100);
      }
      snap = await press1('KeyL');
      if (!(snap.tech.cast && snap.tech.cast.state === 'sign')) continue;
      let hit = false;
      for (let i = 0; i < 24 && !hit; i++) {
        snap = await frame();
        if (snap.tech.cast === null) break;
        const t = snap.enemies.find((e) => e.id === target.id);
        hit = !!t && t.hp < t.maxHp;
      }
      if (!hit) continue;
      let open = null;
      for (let i = 0; i < 20 && open === null; i++) {
        snap = await frame();
        if (snap.kokusen.windowOpen) open = snap;
      }
      if (!open) continue;
      const before = countOf(snap.events, 'kokusen');
      snap = await press1('KeyL');
      for (let i = 0; i < 20; i++) {
        if (countOf(snap.events, 'kokusen') > before) return { snap, target };
        snap = await frame();
      }
    }
    assert(false, 'o Kokusen nunca pousou em 6 tentativas');
    return null;
  };

  // Sem build na rodada 1: 45 e a dificuldade em 1.
  let snap = await boot('');
  assert(
    snap.difficulty && snap.difficulty.round === 1 && snap.difficulty.hpMul === 1 && snap.difficulty.damageMul === 1,
    `ESC-05: difficulty na rodada 1 deveria ser 1/1/1: ${JSON.stringify(snap.difficulty)}`,
  );
  let landed = await landKokusen(snap);
  let enemy = landed.snap.enemies.find((e) => e.id === landed.target.id);
  assert(
    enemy && enemy.hp === landed.target.maxHp - 12 - 45,
    `ESC-02.5: sem build o Kokusen tira 45 (depois dos 12 do 1º impacto): ${JSON.stringify(enemy)}`,
  );
  assert(
    landed.snap.damageNumbers.last?.kind === 'kokusen' && landed.snap.damageNumbers.last.value === 12 + 45,
    `ESC-02.5: o número do Kokusen deveria ser 12 + 45 do tipo kokusen: ${JSON.stringify(landed.snap.damageNumbers)}`,
  );

  // Com Força 5: 68.
  snap = await boot('&mods=forca:5');
  landed = await landKokusen(snap);
  const last = landed.snap.damageNumbers.last;
  assert(
    last?.kind === 'kokusen' && last.value === 12 + 68,
    `ESC-02.5: com Força 5 o Kokusen deveria tirar 68: ${JSON.stringify(landed.snap.damageNumbers)}`,
  );
  enemy = landed.snap.enemies.find((e) => e.id === landed.target.id);
  assert(
    !enemy || enemy.hp === Math.max(0, landed.target.maxHp - 12 - 68),
    `ESC-02.5: o inimigo deveria perder 12 + 68: ${JSON.stringify(enemy)}`,
  );

  // No chefe: o HP cai pelo dano do Kokusen e a postura cai dano x poiseMul (135 > 100), então ele entra em stagger.
  await page.goto(
    `${baseUrl}?debug&hd=1&area=modular&seed=1&noshop=1&tech=divergente&round=5&bossArch=oni&bossAffix=none&finger=0&regen=0`,
    { waitUntil: 'load' },
  );
  await page.waitForFunction(() => typeof window.__game?.snapshot === 'function', { timeout: 15_000 });
  await stepAndSnap(20);
  await page.keyboard.press('KeyJ', { delay: 50 });
  snap = await stepAndSnap(300);
  let bossKokusen = null;
  for (let attempt = 0; attempt < 12 && !bossKokusen; attempt++) {
    for (let i = 0; i < 80 && snap.boss && (snap.boss.state === 'intro' || snap.boss.state === 'roar'); i++) {
      snap = await stepAndSnap(100);
    }
    for (let i = 0; i < 40 && (snap.tech.cast !== null || snap.tech.slots[0].cooldownMs > 0); i++) {
      snap = await stepAndSnap(100);
    }
    for (let i = 0; i < 200 && snap.boss && Math.abs(snap.boss.x - snap.player.x) > 40; i++) {
      const dir = snap.boss.x >= snap.player.x ? 'KeyD' : 'KeyA';
      await page.keyboard.down(dir);
      snap = await stepAndSnap(50);
      await page.keyboard.up(dir);
    }
    if (!snap.boss || snap.boss.state === 'dead' || snap.player.dead) break;
    const hpBefore = snap.boss.hp;
    snap = await press1('KeyL');
    if (!(snap.tech.cast && snap.tech.cast.state === 'sign')) continue;
    let hit = false;
    for (let i = 0; i < 24 && !hit; i++) {
      snap = await frame();
      if (snap.tech.cast === null) break;
      hit = !!snap.boss && snap.boss.hp < hpBefore;
    }
    if (!hit) continue;
    const afterFirst = snap.boss.hp;
    let open = false;
    for (let i = 0; i < 20 && !open; i++) {
      snap = await frame();
      open = snap.kokusen.windowOpen;
    }
    if (!open) continue;
    const before = countOf(snap.events, 'kokusen');
    snap = await press1('KeyL');
    for (let i = 0; i < 20 && !bossKokusen; i++) {
      if (countOf(snap.events, 'kokusen') > before) bossKokusen = { snap, afterFirst };
      else snap = await frame();
    }
  }
  assert(bossKokusen, 'o Kokusen nunca pousou no chefe em 12 tentativas');
  assert(
    bossKokusen.snap.boss.hp === bossKokusen.afterFirst - 45,
    `ESC-02.5: o chefe deveria perder 45 de HP no Kokusen: ${bossKokusen.afterFirst} -> ${bossKokusen.snap.boss.hp}`,
  );
  assert(
    bossKokusen.snap.boss.state === 'stagger' && bossKokusen.snap.boss.poise === 0,
    `ESC-02.5: 45 x poiseMul (3) = 135 deveria zerar a postura e pôr o chefe em stagger: ${JSON.stringify(bossKokusen.snap.boss)}`,
  );
}
