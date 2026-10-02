// Pressão da onda e limitador de atacantes (SPN-01/03/07/10, LIM-01/02/05, PRG-01/05), com `?debug&seed=1`.
// 1) Rodada 1: 6 na onda, ao menos 5 nascidos em 6 s, todo spawn fora do `worldView` com margem, nenhum `patrol`.
// 2) `maxAlive=6&enemyGuard=0` com o player parado por 20 s: `attackers <= 2` em todo frame, dois `windup` nunca a
//    menos de 350 ms e inimigos parados em `hold` do mesmo lado a >= 20 px um do outro.
// 3) `tech=divergente&fragments=200`: comprar Energia sobe `energy.max` (`ce.max`).
// 4) Game over com vaga/fila ocupadas e run nova (J): `gate.active === 0` e fila vazia (EDG-03).
export default async function ({ page, baseUrl, assert }) {
  const FRAME_MS = 1000 / 60;
  const ready = () =>
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
  const snap = (ms) =>
    page.evaluate((n) => {
      window.__game.step(n);
      return window.__game.snapshot();
    }, ms);
  /** Um único frame (`step(16)`; `step(16.7)` viraria dois). */
  const frame = () => snap(16);
  const boot = async (query) => {
    await page.goto(`${baseUrl}?debug&seed=1${query ? `&${query}` : ''}`, { waitUntil: 'load' });
    await ready();
    await snap(20);
    await page.keyboard.press('KeyJ', { delay: 50 });
    const s = await snap(16);
    assert(s.run.state === 'roundActive', `run deveria começar: ${JSON.stringify(s.run)}`);
    return s;
  };
  const outsideView = (x, view) => x < view.left - 32 || x > view.right + 32;

  // --- 1) Rodada 1 com seed 1: tamanho da onda, ritmo de nascimento, spawn fora da câmera, sem patrulha -------------
  {
    let s = await boot('enemyGuard=0');
    s = await snap(50); // o primeiro update do spawner roda no frame seguinte à partida
    // SPN-01: a onda da rodada 1 tem 6 (vivos + na fila + abatidos), e o teto de vivos é 5 (SPN-02).
    assert(s.run.maxAlive === 5, `SPN-02: teto de vivos da rodada 1 deveria ser 5: ${JSON.stringify(s.run)}`);
    assert(s.run.alive + s.run.queued + s.run.kills === 6, `SPN-01: a onda da rodada 1 deveria ter 6: ${JSON.stringify(s.run)}`);
    // SPN-03: o primeiro update libera exatamente o burst de 3.
    assert(s.run.alive === 3 && s.run.queued === 3, `SPN-03: o burst inicial deveria liberar 3: ${JSON.stringify(s.run)}`);

    const seen = new Map(); // id -> posição do primeiro frame visto
    const note = (st) => {
      for (const e of st.enemies) {
        if (seen.has(e.id)) continue;
        seen.set(e.id, { x: e.x, view: st.camera.worldView });
      }
      for (const e of st.enemies) assert(e.ai !== 'patrol', `SPN-10: inimigo ${e.id} em patrol: ${JSON.stringify(e)}`);
    };
    note(s);
    // 6 s de rodada, um frame por vez; o player fica parado e a onda termina de nascer.
    for (let i = 0; i < Math.ceil(6000 / FRAME_MS) && s.run.state === 'roundActive' && !s.player.dead; i++) {
      s = await frame();
      note(s);
    }
    assert(seen.size >= 5, `SPN-02/03: ao menos 5 nascidos em 6 s, vieram ${seen.size}`);
    // SPN-07: o ponto de cada inimigo, lido no frame em que ele apareceu, fica fora do worldView ± 32.
    for (const [id, p] of seen) {
      assert(outsideView(p.x, p.view), `SPN-07: inimigo ${id} nasceu dentro da câmera: x=${p.x} view=${JSON.stringify(p.view)}`);
    }
  }

  // --- 2) Limitador: player parado por 20 s com `maxAlive=6` --------------------------------------------------------
  {
    // O player parado apanha até morrer; cada trecho vale até ele chegar a 25 de vida (ou a rodada acabar) e o próximo
    // recomeça a run, até somar 20 s amostrados frame a frame.
    const TARGET_MS = 20_000;
    let sampledMs = 0;
    let frames = 0;
    let maxAttackers = 0;
    let holdSamples = 0;
    let settledPairs = 0;
    let minHoldGap = Infinity;
    const windupFrames = []; // frame em que cada `windup` começou, de qualquer inimigo
    for (let segment = 0; segment < 12 && sampledMs < TARGET_MS; segment++) {
      let s = await boot('maxAlive=6&enemyGuard=0');
      assert(s.run.maxAlive === 6, `SPN-06: ?debug&maxAlive=6 deveria fixar o teto: ${JSON.stringify(s.run)}`);
      const prevAi = new Map();
      const lastX = new Map(); // id -> x do frame anterior
      const stillFrames = new Map(); // id -> frames seguidos sem mudar de x
      while (sampledMs < TARGET_MS && s.run.state === 'roundActive' && s.player.hp > 25) {
        s = await frame();
        frames++;
        sampledMs += FRAME_MS;
        // LIM-01: no máximo 2 em windup/attack, tanto no contador do snapshot quanto contando pela IA.
        const byAi = s.enemies.filter((e) => e.ai === 'windup' || e.ai === 'attack').length;
        maxAttackers = Math.max(maxAttackers, s.attackers, byAi);
        assert(s.attackers <= 2 && byAi <= 2, `LIM-01: ${s.attackers}/${byAi} atacantes no frame ${frames}: ${JSON.stringify(s.enemies.map((e) => [e.id, e.ai]))}`);
        assert(s.gate.active <= 2, `LIM-01: o limitador ocupa ${s.gate.active} vagas: ${JSON.stringify(s.gate)}`);
        for (const e of s.enemies) {
          assert(e.ai !== 'patrol', `SPN-10: inimigo ${e.id} em patrol`);
          if (e.ai === 'windup' && prevAi.get(e.id) !== 'windup') windupFrames.push({ frame: frames, id: e.id });
          prevAi.set(e.id, e.ai);
        }
        // LIM-05: dois em `hold` do mesmo lado, ambos parados (x sem mudar) há pelo menos 10 frames, ficam a >= 20 px
        // (vagas 64 + 24k com folga de ±2, LIM-07). Na troca de vaga a distância pode cair por um instante.
        // Só conta "parado" em frame que anda (fora do hitstop), com o inimigo livre para agir e já em `hold` (cérebro `idle`, fora
        // da graça de nascimento): congelado, atordoado ou descansando do golpe (`rest`) ele fica parado sem estar na vaga.
        for (const e of s.enemies) {
          const last = lastX.get(e.id);
          const free = !s.hitstop.frozen && e.state === 'idle' && e.ai === 'hold';
          if (!free) stillFrames.set(e.id, 0);
          else stillFrames.set(e.id, last !== undefined && Math.abs(e.x - last) < 0.5 ? (stillFrames.get(e.id) ?? 0) + 1 : 0);
          lastX.set(e.id, e.x);
        }
        for (const side of [-1, 1]) {
          const holders = s.enemies
            .filter((e) => e.ai === 'hold' && Math.sign(e.x - s.player.x) === side)
            .sort((a, b) => Math.abs(a.x - s.player.x) - Math.abs(b.x - s.player.x));
          for (let i = 1; i < holders.length; i++) {
            const gap = Math.abs(holders[i].x - holders[i - 1].x);
            minHoldGap = Math.min(minHoldGap, gap);
            holdSamples++;
            const settled = (stillFrames.get(holders[i].id) ?? 0) >= 10 && (stillFrames.get(holders[i - 1].id) ?? 0) >= 10;
            if (!settled) continue;
            settledPairs++;
            assert(gap >= 20, `LIM-05: par parado a ${gap.toFixed(1)} px: ${JSON.stringify({ px: s.player.x, q: s.gate, h: holders.map((h) => [h.id, h.x]) })}`);
          }
        }
      }
    }
    assert(sampledMs >= TARGET_MS, `esperava 20 s amostrados, vieram ${(sampledMs / 1000).toFixed(1)} s`);
    assert(maxAttackers >= 1, 'o limitador nunca viu um atacante em 20 s: o cenário não exercitou nada');
    assert(windupFrames.length >= 3, `esperava ao menos 3 windups em 20 s, vieram ${windupFrames.length}`);
    // LIM-02: dois `windup` (de inimigos diferentes ou não) nunca começam a menos de 350 ms um do outro.  O contador de
    // frames segue entre os trechos, então a emenda de dois boots só pode dar uma folga maior.
    for (let i = 1; i < windupFrames.length; i++) {
      const gapMs = (windupFrames[i].frame - windupFrames[i - 1].frame) * FRAME_MS;
      assert(gapMs >= 350 - 1, `LIM-02: dois windupStart a ${gapMs.toFixed(0)} ms: ${JSON.stringify([windupFrames[i - 1], windupFrames[i]])}`);
    }
    // Os dois lados da regra do `hold`: pelo menos uma amostra com dois ou mais segurados no mesmo lado.
    assert(holdSamples > 0, `LIM-03/05: nunca houve dois em hold no mesmo lado em 20 s (min=${minHoldGap})`);
    assert(settledPairs > 0, `LIM-05: nenhum par parado em hold foi medido (amostras=${holdSamples})`);
  }

  // --- 3) Energia: comprar sobe energy.max (PRG-01, PRG-05) --------------------------------------------------------------
  {
    let s = await boot('enemyGuard=0&tech=divergente&fragments=200');
    assert(s.ce.max === 100, `PRG-05: sem Energia o teto deveria ser 100: ${JSON.stringify(s.ce)}`);
    for (let i = 0; i < 80 && s.run.state === 'roundActive'; i++) {
      await page.keyboard.press('Digit2', { delay: 50 });
      s = await snap(300);
    }
    for (let i = 0; i < 400 && s.run.state !== 'shop'; i++) s = await snap(50);
    assert(s.run.state === 'shop', `a loja deveria abrir depois da rodada 1: ${JSON.stringify(s.run)}`);
    const tap = async (code) => {
      await page.keyboard.down(code);
      await snap(50);
      await page.keyboard.up(code);
      return snap(20);
    };
    for (let i = 0; i < 8 && !s.shop.offers.some((o) => o.id === 'energia' && !o.sold); i++) s = await tap('KeyR');
    const slot = s.shop.offers.findIndex((o) => o.id === 'energia' && !o.sold);
    assert(slot >= 0, `Energia não apareceu em 8 rerolls: ${JSON.stringify(s.shop.offers)}`);
    const offer = s.shop.offers[slot];
    const wallet = s.wallet.fragments;
    s = await tap(`Digit${slot + 1}`);
    // `modifiers` do snapshot só lista os da F4; a compra de Energia aparece no evento, na carteira e no teto.
    assert(s.events.includes(`buy:energia:${offer.cost}`), `PRG-01: esperava buy:energia:${offer.cost}: ${JSON.stringify(s.events)}`);
    assert(s.wallet.fragments === wallet - offer.cost, `PRG-01: carteira ${wallet} - ${offer.cost} != ${s.wallet.fragments}`);
    // A cena congelada da loja não roda o `update` que aplica os níveis; o teto novo vale quando a rodada 2 anda.
    s = await tap('Enter');
    s = await snap(50);
    assert(s.run.state === 'roundActive' && s.ce.max === 120, `PRG-05: o teto de 120 deveria seguir na rodada 2: ${JSON.stringify({ run: s.run, ce: s.ce })}`);
  }

  // --- 4) Nova run libera as vagas e a fila do limitador (EDG-03) ------------------------------------------------------
  {
    let s = await boot('maxAlive=6&enemyGuard=0');
    // Player parado até o limitador ter vaga ocupada ou fila (inimigos pedindo para atacar).
    for (let i = 0; i < 1200 && s.gate.active === 0 && s.gate.queue.length === 0 && s.player.hp > 25; i++) s = await frame();
    assert(s.gate.active > 0 || s.gate.queue.length > 0, `EDG-03: o cenário nunca ocupou vaga nem fila: ${JSON.stringify(s.gate)}`);
    // Mata o player com o dano de debug (tecla 4) até o game over.
    for (let i = 0; i < 40 && s.run.state !== 'gameOver'; i++) {
      await page.keyboard.press('Digit4', { delay: 30 });
      s = await snap(100);
    }
    assert(s.run.state === 'gameOver', `EDG-03: esperava gameOver: ${JSON.stringify(s.run)}`);
    s = await snap(1500); // passa o bloqueio do game over
    // Run nova (J): `onStartRun` zera o limitador no mesmo frame, antes de qualquer inimigo novo pedir vaga.
    await page.keyboard.press('KeyJ', { delay: 50 });
    s = await frame();
    assert(s.run.state === 'roundActive', `EDG-03: a run nova deveria começar: ${JSON.stringify(s.run)}`);
    assert(s.gate.active === 0 && s.gate.queue.length === 0, `EDG-03: vagas/fila deveriam zerar com a run nova: ${JSON.stringify(s.gate)}`);
  }
}
