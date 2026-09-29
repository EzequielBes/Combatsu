// Vermelho, Azul e Desmantelar em jogo de verdade (RED-06/10/11/16, BLU-04/07/11, CUT-03/08), com
// `?debug&seed=1&noshop=1&tech=<id>`. Uma navegação por técnica para não misturar recarga/slot entre elas.
export default async function ({ page, baseUrl, assert }) {
  const stepAndSnap = async (ms) =>
    page.evaluate((n) => {
      window.__game.step(n);
      return window.__game.snapshot();
    }, ms);
  const frame = () => stepAndSnap(16);
  const tap = async (code) => {
    await page.keyboard.down(code);
    await stepAndSnap(50);
    await page.keyboard.up(code);
    return stepAndSnap(20);
  };
  const waitReady = () =>
    page.waitForFunction(
      () => {
        try {
          return typeof window.__game.snapshot === 'function';
        } catch {
          return false;
        }
      },
      { timeout: 15_000 },
    );
  const countOf = (events, name) => events.filter((e) => e === name).length;

  const startRun = async (query) => {
    await page.goto(`${baseUrl}?debug&seed=1&noshop=1&${query}`, { waitUntil: 'load' });
    await waitReady();
    await stepAndSnap(20);
    await page.keyboard.press('KeyJ', { delay: 50 });
    const snap = await stepAndSnap(300);
    assert(snap.run.state === 'roundActive', `run deveria começar: ${JSON.stringify(snap.run)}`);
    return snap;
  };

  /** Anda até `targetId` ficar a `dx` px do player (± tolerância), voltando o snapshot mais recente. */
  const approachTo = async (snapIn, targetId, dxWanted, tol) => {
    let snap = snapIn;
    for (let i = 0; i < 200; i++) {
      const t = snap.enemies.find((e) => e.id === targetId);
      if (!t) break;
      const dx = t.x - snap.player.x;
      if (Math.abs(dx - dxWanted) <= tol) break;
      const dir = dx > dxWanted ? 'KeyD' : 'KeyA';
      await page.keyboard.down(dir);
      snap = await stepAndSnap(50);
      await page.keyboard.up(dir);
    }
    return snap;
  };

  // --- Vermelho (RED-06/11/16): alvo a curta distância, atingido direto pelo orbe -------------------------------
  {
    let snap = await startRun('tech=vermelho');
    let target = snap.enemies[0];
    for (let i = 0; i < 20 && !target; i++) {
      snap = await stepAndSnap(300);
      target = snap.enemies[0];
    }
    assert(target, `nenhum inimigo nasceu: ${JSON.stringify(snap.enemies)}`);
    // Fica a ~150 px (bem dentro dos 420 px de alcance, longe de qualquer parede) para o orbe acertar de frente.
    snap = await approachTo(snap, target.id, 150, 20);
    const t0 = snap.enemies.find((e) => e.id === target.id);
    assert(t0 && Math.abs(t0.x - snap.player.x - 150) <= 30, `não cheguei perto o bastante do alvo: ${JSON.stringify(t0)}`);
    const hpBefore = t0.hp;
    const detonateBefore = countOf(snap.events, 'redDetonate');
    snap = await tap('KeyL');
    assert(snap.tech.cast && snap.tech.cast.id === 'vermelho', `Vermelho deveria ter começado: ${JSON.stringify(snap.tech.cast)}`);
    // sign 250 + charge 350 = 600 ms até a soltura; espera a soltura e o toque no alvo.
    let hit = null;
    for (let i = 0; i < 60 && hit === null; i++) {
      snap = await frame();
      const now = snap.enemies.find((e) => e.id === target.id);
      if (now && now.hp < hpBefore) hit = now;
    }
    assert(hit, `RED-06: o orbe nunca acertou o alvo direto: ${JSON.stringify(snap.tech.cast)}`);
    assert(hit.hp === hpBefore - 30, `RED-06: dano direto deveria ser 30: ${hpBefore} -> ${hit.hp}`);
    assert(hit.state === 'ragdollStun', `RED-06: alvo deveria entrar em ragdoll: ${JSON.stringify(hit)}`);
    // O orbe segue voando (perfura) até os 420 px e detona no ar - RED-11/RED-16.
    let detonated = null;
    for (let i = 0; i < 60 && detonated === null; i++) {
      snap = await frame();
      if (countOf(snap.events, 'redDetonate') > detonateBefore) detonated = snap;
    }
    assert(detonated, 'RED-16: o orbe nunca detonou depois do toque direto');
    assert(countOf(detonated.events, 'redDetonate') === detonateBefore + 1, `RED-16: esperava exatamente um redDetonate: ${JSON.stringify(detonated.events)}`);
    assert(
      ['red.flashCore', 'red.sphere', 'red.shockRing', 'red.debris', 'red.screenFlash'].every((l) => detonated.fx.layers.includes(l)),
      `RED-11: fx.layers incompleto na detonação: ${JSON.stringify(detonated.fx.layers)}`,
    );
    assert(detonated.techObjects.every((o) => o.kind !== 'red'), `RED-13: o orbe deveria ter sumido de techObjects: ${JSON.stringify(detonated.techObjects)}`);
  }

  // --- Vermelho (RED-10): alvo bem além dos 420 px de alcance, dentro dos 96 px de detonação, nunca tocado -------
  {
    let snap = await startRun('tech=vermelho');
    const launchX = snap.player.x; // o player não anda neste cenário (RED-10 não depende de perseguição).
    let splashHp = null;
    for (let attempt = 0; attempt < 6 && splashHp === null; attempt++) {
      // Espera o slot ficar livre (recarga de 3000 ms entre tentativas) e um inimigo estar na janela de detonação
      // (a ~512 px do spawn, oscilando com o patrulhamento de ±48 px, fora do alcance de perseguição do player).
      for (let i = 0; i < 40 && (snap.tech.cast !== null || snap.tech.slots[0].cooldownMs > 0); i++) snap = await stepAndSnap(100);
      let candidate = null;
      for (let i = 0; i < 30 && !candidate; i++) {
        candidate = snap.enemies.find((e) => e.x - launchX > 424 && e.x - launchX <= 510 && e.hp === e.maxHp);
        if (candidate) break;
        snap = await stepAndSnap(150);
      }
      if (!candidate) continue; // nenhum inimigo na janela desta vez - tenta de novo na próxima folga de recarga.
      const targetId = candidate.id;
      const hpBefore = candidate.hp;
      const detonateBefore = countOf(snap.events, 'redDetonate');
      snap = await tap('KeyL');
      if (!(snap.tech.cast && snap.tech.cast.id === 'vermelho')) continue; // recusado - tenta de novo.
      // sign 250 + charge 350 + voo dos 420 px a 560 px/s (~750 ms) ~= 1350 ms até detonar sem tocar ninguém antes.
      for (let i = 0; i < 40 && countOf(snap.events, 'redDetonate') <= detonateBefore; i++) snap = await stepAndSnap(50);
      const after = snap.enemies.find((e) => e.id === targetId);
      if (after && after.hp === hpBefore - 25) splashHp = after.hp; // RED-10: só o estouro (25), nunca o toque direto.
    }
    assert(splashHp !== null, `RED-10: o estouro nunca acertou um alvo fora do toque direto em 6 tentativas: ${JSON.stringify(snap.enemies)}`);
  }

  // --- Azul (BLU-04/07/11): inimigo perto é puxado, leva o dano da implosão e o orbe some com o evento -----------
  {
    let snap = await startRun('tech=azul');
    let target = snap.enemies[0];
    for (let i = 0; i < 20 && !target; i++) {
      snap = await stepAndSnap(300);
      target = snap.enemies[0];
    }
    assert(target, `nenhum inimigo nasceu: ${JSON.stringify(snap.enemies)}`);
    // A esfera nasce 110 px à frente do player (BLU-02); fica a 90 px do alvo para ele já nascer dentro do raio de 130.
    snap = await approachTo(snap, target.id, 90, 15);
    const t0 = snap.enemies.find((e) => e.id === target.id);
    const xBefore = t0.x;
    snap = await tap('KeyL');
    assert(snap.tech.cast && snap.tech.cast.id === 'azul', `Azul deveria ter começado: ${JSON.stringify(snap.tech.cast)}`);
    // sign 200 + charge 250 = 450 ms até a soltura (a esfera nasce e passa a existir em techObjects).
    let orbSeen = false;
    for (let i = 0; i < 60 && !orbSeen; i++) {
      snap = await frame();
      if (snap.techObjects.some((o) => o.kind === 'blue')) orbSeen = true;
    }
    assert(orbSeen, 'BLU-10: a esfera azul nunca apareceu em techObjects');
    // BLU-04: o alvo se aproxima da esfera (px de distância cai) enquanto ela existe.
    let pulled = false;
    for (let i = 0; i < 30 && !pulled; i++) {
      snap = await frame();
      const now = snap.enemies.find((e) => e.id === target.id);
      if (now && Math.abs(now.x - xBefore) > 4) pulled = true;
    }
    assert(pulled, `BLU-04: o inimigo nunca se mexeu em direção à esfera: ${xBefore} parado`);
    assert(
      snap.fx.layers.includes('blue.core') && snap.fx.layers.includes('blue.spiralIn') && snap.fx.layers.includes('blue.distortRing'),
      `BLU-08: fx.layers da esfera incompleto: ${JSON.stringify(snap.fx.layers)}`,
    );
    // Espera os 1400 ms (BLU-03/11): a esfera implode, some de techObjects e dá o dano final de uma vez (BLU-07).
    // O hp "de antes" precisa ser o do passo IMEDIATAMENTE anterior ao da implosão - os tiques de 250 ms (BLU-06)
    // continuam descontando 5 até lá, então qualquer leitura mais cedo incluiria tiques que não são a implosão.
    const implodeBefore = countOf(snap.events, 'blueImplode');
    let hpBeforeImplode = snap.enemies.find((e) => e.id === target.id)?.hp;
    let imploded = null;
    for (let i = 0; i < 40 && imploded === null; i++) {
      const hpThisStep = snap.enemies.find((e) => e.id === target.id)?.hp;
      snap = await stepAndSnap(50);
      if (countOf(snap.events, 'blueImplode') > implodeBefore) {
        imploded = snap;
        hpBeforeImplode = hpThisStep;
      }
    }
    assert(imploded, 'BLU-11: a esfera nunca implodiu depois de 1400 ms');
    assert(countOf(imploded.events, 'blueImplode') === implodeBefore + 1, `BLU-11: esperava exatamente um blueImplode: ${JSON.stringify(imploded.events)}`);
    assert(imploded.techObjects.every((o) => o.kind !== 'blue'), `BLU-11: a esfera deveria ter sumido de techObjects: ${JSON.stringify(imploded.techObjects)}`);
    const afterImplode = imploded.enemies.find((e) => e.id === target.id);
    if (afterImplode && hpBeforeImplode !== undefined) {
      assert(hpBeforeImplode - afterImplode.hp === 10, `BLU-07: a implosão deveria tirar 10 de uma vez: ${hpBeforeImplode} -> ${afterImplode.hp}`);
    }
  }

  // --- Desmantelar (CUT-03/08): 3 cortes na área de 60-180 px à frente, 10 de dano leve cada -----------------------
  {
    let snap = await startRun('tech=corte');
    let target = snap.enemies[0];
    for (let i = 0; i < 20 && !target; i++) {
      snap = await stepAndSnap(300);
      target = snap.enemies[0];
    }
    assert(target, `nenhum inimigo nasceu: ${JSON.stringify(snap.enemies)}`);
    // Fica bem no meio da janela de 60-180 px para sobreviver a qualquer reação entre um corte e o outro.
    snap = await approachTo(snap, target.id, 120, 15);
    const t0 = snap.enemies.find((e) => e.id === target.id);
    const hpBefore = t0.hp;
    const cutBefore = countOf(snap.events, 'cut');
    snap = await tap('KeyL');
    assert(snap.tech.cast && snap.tech.cast.id === 'corte', `Desmantelar deveria ter começado: ${JSON.stringify(snap.tech.cast)}`);
    let sawLine = false;
    let sawSplit = false;
    for (let i = 0; i < 60 && countOf(snap.events, 'cut') < cutBefore + 3; i++) {
      snap = await frame();
      if (snap.fx.layers.includes('cut.line')) sawLine = true;
      if (snap.fx.layers.includes('cut.split')) sawSplit = true;
    }
    assert(countOf(snap.events, 'cut') === cutBefore + 3, `CUT-08: esperava exatamente 3 eventos cut: ${JSON.stringify(snap.events)}`);
    assert(sawLine, `CUT-04: fx.layers nunca teve cut.line: ${JSON.stringify(snap.fx.layers)}`);
    assert(sawSplit, `CUT-06: fx.layers nunca teve cut.split: ${JSON.stringify(snap.fx.layers)}`);
    const after = snap.enemies.find((e) => e.id === target.id);
    assert(after, `o alvo sumiu durante os cortes: ${JSON.stringify(snap.enemies)}`);
    assert(hpBefore - after.hp === 30, `CUT-03: 3 cortes de 10 deveriam tirar 30 no total: ${hpBefore} -> ${after.hp}`);
  }
}
