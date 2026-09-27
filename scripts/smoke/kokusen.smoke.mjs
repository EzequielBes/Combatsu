// Punho Divergente e Kokusen (DIV-03/04/07/09, KOK-03/04/06/09/13/14/15/17/24/25/28, TFX-09) com
// `?debug&seed=1&noshop=1&tech=divergente`. Os dois pontos de spawn de inimigo do level de teste ficam longe do
// spawn do player (RUN-02): anda-se até um inimigo intacto para cada conjuração; `approachFreshEnemy` força o
// fim da rodada (`noshop=1` pula a loja) se os 3 inimigos da rodada 1 (WAVE.base) não bastarem.
export default async function ({ page, baseUrl, assert }) {
  const stepAndSnap = async (ms) =>
    page.evaluate((n) => {
      window.__game.step(n);
      return window.__game.snapshot();
    }, ms);
  const frame = () => stepAndSnap(16); // ~16.667 ms, um único passo interno (STEP_MS do debugApi).
  const press1 = async (code) => {
    await page.keyboard.down(code);
    const s = await frame();
    await page.keyboard.up(code);
    return s;
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

  await page.goto(`${baseUrl}?debug&seed=1&noshop=1&tech=divergente`, { waitUntil: 'load' });
  await waitReady();
  await stepAndSnap(20);
  await page.keyboard.press('KeyJ', { delay: 50 });
  let snap = await stepAndSnap(300);
  assert(snap.run.state === 'roundActive', `run deveria começar: ${JSON.stringify(snap.run)}`);

  const usedIds = new Set();
  const freshFilter = (e) => e.hp === e.maxHp && !usedIds.has(e.id) && Math.abs(e.y - snap.player.y) < 24;
  /**
   * Anda até um inimigo intacto (hp === maxHp), ainda não usado num teste anterior, na mesma plataforma. Por
   * causa do bug documentado abaixo (hitbox do Divergente reabrindo sozinha em `release`), os inimigos que
   * sobram na rodada 1 (WAVE.base = 3) podem já estar todos feridos/mortos quando chega a vez do 3º teste; se
   * não houver nenhum intacto, força o fim da rodada (mata todo mundo com o golpe de teste forte) e espera a
   * próxima rodada nascer com um lote novo (`noshop=1` pula a loja, SHOP-47).
   */
  const approachFreshEnemy = async () => {
    let target = snap.enemies.find(freshFilter);
    for (let i = 0; i < 20 && !target; i++) {
      // Ainda não nasceu (rodízio de 800 ms, WAVE-04): espera um pouco mais.
      snap = await stepAndSnap(300);
      target = snap.enemies.find(freshFilter);
    }
    if (!target) {
      const round = snap.run.round;
      for (let i = 0; i < 40 && snap.run.round === round; i++) {
        await page.keyboard.press('Digit2', { delay: 30 });
        snap = await stepAndSnap(300);
      }
      assert(snap.run.round > round, `esperava a rodada avançar para repor inimigos: ${JSON.stringify(snap.run)}`);
      for (let i = 0; i < 20 && !target; i++) {
        target = snap.enemies.find(freshFilter);
        if (target) break;
        snap = await stepAndSnap(300);
      }
    }
    assert(target, `nenhum inimigo intacto disponível mesmo depois de forçar a próxima rodada: ${JSON.stringify(snap.enemies)}`);
    const targetId = target.id;
    usedIds.add(targetId);
    // Para dentro de [11, 59] px (offsetX 22 + largura 26 da hitbox `direto`, ±11 da metade da largura do
    // inimigo, SIZE.enemy.w) o Punho Divergente conecta; parar a 40 px, bem no meio dessa faixa, dá folga contra
    // um passo de 50 ms que "atropele" o alvo (o inimigo também anda em direção ao player, ENEMY_AI.chaseSpeed) e
    // deixe a distância final perigosamente pequena (<11, um "buraco" entre o corpo do player e a própria hitbox).
    for (let i = 0; i < 400; i++) {
      const t = snap.enemies.find((e) => e.id === targetId);
      if (!t) break;
      const dx = t.x - snap.player.x;
      if (Math.abs(dx) <= 40) break;
      const dir = dx >= 0 ? 'KeyD' : 'KeyA';
      await page.keyboard.down(dir);
      snap = await stepAndSnap(50);
      await page.keyboard.up(dir);
    }
    const finalTarget = snap.enemies.find((e) => e.id === targetId);
    assert(
      finalTarget && Math.abs(finalTarget.x - snap.player.x) > 11 && Math.abs(finalTarget.x - snap.player.x) <= 59,
      `não cheguei a uma distância segura do inimigo ${targetId}: ${JSON.stringify(snap.player)} vs ${JSON.stringify(finalTarget)}`,
    );
    // Sem parada aqui de propósito: a IA do inimigo (ENEMY_AI) começa a preparar o próprio golpe assim que o
    // player entra no alcance e, se ficarmos parados perto dele por meio segundo, o ataque dele acerta primeiro e
    // cancela a nossa conjuração (CAST-07). Conjurando na hora (a seguir) a gente sempre ganha a corrida.
    return targetId;
  };

  /** Espera o slot 1 ficar livre (sem cast e sem recarga) antes da próxima conjuração. */
  const waitSlotReady = async () => {
    for (let i = 0; i < 40 && (snap.tech.cast !== null || snap.tech.slots[0].cooldownMs > 0); i++) snap = await stepAndSnap(100);
    assert(snap.tech.cast === null && snap.tech.slots[0].cooldownMs === 0, `slot 1 deveria estar livre: ${JSON.stringify(snap.tech)}`);
  };

  /**
   * Conjura o Divergente (player já parado perto de `targetId`) e devolve o hp do alvo no momento exato do 1º
   * impacto (DIV-03: 12 de dano leve). A IA do inimigo pode acertar o player durante `sign`/`charge` (CAST-07)
   * e cancelar a conjuração, ou o alvo pode se afastar entre uma tentativa e outra: repete a aproximação e a
   * conjuração até 3 vezes antes de falhar de verdade.
   */
  const castAndWaitFirstImpact = async (targetId) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      for (let i = 0; i < 40 && (snap.tech.cast !== null || snap.tech.slots[0].cooldownMs > 0); i++) snap = await stepAndSnap(100);
      let t = snap.enemies.find((e) => e.id === targetId);
      for (let i = 0; i < 100 && t && Math.abs(t.x - snap.player.x) > 40; i++) {
        const dir = t.x >= snap.player.x ? 'KeyD' : 'KeyA';
        await page.keyboard.down(dir);
        snap = await stepAndSnap(50);
        await page.keyboard.up(dir);
        t = snap.enemies.find((e) => e.id === targetId);
      }
      if (!t) break;
      const before = t.hp;
      snap = await press1('KeyL');
      if (!(snap.tech.cast && snap.tech.cast.state === 'sign')) continue; // recusado (energia/recarga): tenta de novo
      snap = await stepAndSnap(50);
      snap = await stepAndSnap(50); // ~116,7 ms: perto do fim do charge (60+60), ainda não em release.
      let impact = null;
      let cancelled = false;
      for (let i = 0; i < 20 && impact === null && !cancelled; i++) {
        snap = await frame();
        if (snap.tech.cast === null) {
          cancelled = true;
          break;
        }
        const now = snap.enemies.find((e) => e.id === targetId);
        if (now && now.hp < before) impact = now.hp;
      }
      if (impact !== null) {
        assert(impact === before - 12, `DIV-03: 1º impacto deveria tirar 12: ${before} -> ${impact}`);
        return before;
      }
      // Cancelada (dano em sign/charge, CAST-07) ou não conectou: espera o slot liberar e tenta de novo.
    }
    assert(false, `DIV-03: o 1º impacto em ${targetId} nunca aconteceu depois de 3 tentativas`);
    return -1;
  };

  // --- Cenário 1: 2º impacto normal (sem apertar a tecla de novo), DIV-04/07/09, e TFX-09 ---------------------
  const fxBaseline = snap.fx.live;
  const target1 = await approachFreshEnemy();
  const before1 = await castAndWaitFirstImpact(target1);
  const divergent2Before = countOf(snap.events, 'divergent2');
  let sawWaitingFx = false;
  let secondImpact = null;
  for (let i = 0; i < 20 && secondImpact === null; i++) {
    snap = await frame();
    if (snap.fx.layers.includes('divergente.echo') && snap.fx.layers.includes('divergente.ring')) sawWaitingFx = true; // DIV-07
    if (countOf(snap.events, 'divergent2') > divergent2Before) secondImpact = snap;
  }
  assert(sawWaitingFx, `DIV-07: nunca vi divergente.echo/ring esperando o 2º impacto: ${JSON.stringify(snap.fx.layers)}`);
  assert(secondImpact, `DIV-04: o 2º impacto normal nunca aconteceu: ${JSON.stringify(snap.tech.cast)}`);
  const enemyAfter2 = secondImpact.enemies.find((e) => e.id === target1);
  assert(enemyAfter2.hp === before1 - 12 - 18, `DIV-04: 2º impacto deveria tirar 18 a mais: ${JSON.stringify(enemyAfter2)}`);
  assert(
    secondImpact.fx.layers.includes('divergente.burst') && secondImpact.fx.layers.includes('divergente.fistGhost'),
    `DIV-09: sem Kokusen, fx.layers deveria ter burst + fistGhost: ${JSON.stringify(secondImpact.fx.layers)}`,
  );
  assert(
    countOf(secondImpact.events, 'kokusen') === 0,
    `cenário 1 não deveria produzir Kokusen: ${JSON.stringify(secondImpact.events)}`,
  );

  // TFX-09: 300 ms depois do fim do efeito (estouro 220 ms + punho fantasma 180 ms), `fx.live` volta ao valor de
  // antes da conjuração — dá bastante folga (700 ms reais) para tudo (aura, eco/anel, estouro, fantasma) sumir.
  snap = await stepAndSnap(700);
  assert(snap.fx.live === fxBaseline, `TFX-09: fx.live deveria voltar a ${fxBaseline}, veio ${snap.fx.live}: ${JSON.stringify(snap.fx.layers)}`);

  // --- Cenário 2: tecla do slot ~160 ms depois do 1º impacto, dentro da janela → Kokusen -----------------------
  await waitSlotReady();
  const target2 = await approachFreshEnemy();
  const before2 = await castAndWaitFirstImpact(target2);
  let windowSnap = null;
  for (let i = 0; i < 20 && windowSnap === null; i++) {
    snap = await frame();
    if (snap.kokusen.windowOpen) windowSnap = snap;
  }
  assert(windowSnap, 'KOK-01/02: a janela do Kokusen nunca abriu');
  const ceBeforeKokusen = windowSnap.ce.cur;
  const kokusenBefore = countOf(windowSnap.events, 'kokusen');
  snap = await press1('KeyL'); // KOK-03: mesma tecla do slot que conjurou o Divergente em curso.
  let landed = null;
  for (let i = 0; i < 20 && landed === null; i++) {
    snap = await frame();
    if (countOf(snap.events, 'kokusen') > kokusenBefore) landed = snap;
  }
  assert(landed, 'KOK-28: o Kokusen nunca resolveu depois da tecla dentro da janela');
  assert(countOf(landed.events, 'kokusen') === kokusenBefore + 1, `KOK-28: esperava exatamente um kokusen a mais: ${JSON.stringify(landed.events)}`);
  const enemyAfterKokusen = landed.enemies.find((e) => e.id === target2);
  assert(enemyAfterKokusen.hp === before2 - 12 - 45, `KOK-06: Kokusen deveria tirar 45 (2,5×18): ${JSON.stringify(enemyAfterKokusen)}`);
  assert(
    Math.min(100, ceBeforeKokusen + 30) === landed.ce.cur,
    `KOK-09: energia deveria subir 30 com teto: ${ceBeforeKokusen} -> ${landed.ce.cur}`,
  );
  assert(landed.hitstop.frozen === true && landed.hitstop.remainingMs > 200, `KOK-13: hitstop de 220 ms esperado: ${JSON.stringify(landed.hitstop)}`);
  assert(landed.fx.layers.includes('kokusen.invert'), `KOK-14: fx.layers deveria ter kokusen.invert: ${JSON.stringify(landed.fx.layers)}`);
  assert(landed.hud.kokusenCard && landed.hud.kokusenCard.streak === 1, `KOK-25: hud.kokusenCard deveria ter streak 1: ${JSON.stringify(landed.hud.kokusenCard)}`);
  assert(landed.kokusen.zone === true && landed.kokusen.streak === 1, `KOK-10/30: zona/streak deveriam estar ativos: ${JSON.stringify(landed.kokusen)}`);

  // KOK-24: zoom sobe perto de 1,68 logo depois (até 60 ms reais); 4 passos internos (~66,7 ms) cobrem a subida
  // sem já alcançar os ~100 ms (6 frames de 60 fps, TFX-05/timeline) em que o duotom (KOK-15) termina. `kokusen.bolts`
  // (KOK-17) só entra em `fx.layers` no frame seguinte ao do próprio Kokusen (o `KokusenFx.update` deste frame já
  // rodou antes do `trigger`, design "Dois relógios") - por isso é lido aqui, não em `landed`.
  let peakZoom = landed.camera.zoom;
  for (let i = 0; i < 4; i++) {
    snap = await frame();
    peakZoom = Math.max(peakZoom, snap.camera.zoom);
  }
  assert(peakZoom >= 1.6, `KOK-24: zoom deveria ter subido perto de 1,68: ${peakZoom}`);
  assert(snap.fx.layers.includes('kokusen.bolts'), `KOK-17: fx.layers deveria ter kokusen.bolts: ${JSON.stringify(snap.fx.layers)}`);
  // KOK-15: neste ponto (4 frames ≈ 66,7 ms depois do Kokusen) o invert (2 frames, 33,3 ms) já acabou e o duotom
  // (mais 4 frames, 66,7 ms) ainda está no meio - os dois nunca coexistem.
  assert(snap.fx.layers.includes('kokusen.duotone'), `KOK-15: fx.layers deveria ter kokusen.duotone: ${JSON.stringify(snap.fx.layers)}`);
  assert(!snap.fx.layers.includes('kokusen.invert'), `KOK-15: invert e duotone não deveriam coexistir: ${JSON.stringify(snap.fx.layers)}`);
  snap = await stepAndSnap(500);
  assert(Math.abs(snap.camera.zoom - 1.5) < 0.02, `KOK-24: zoom deveria ter voltado a 1,5: ${snap.camera.zoom}`);

  // --- Cenário 3: tecla bem antes da janela abrir (poucos frames depois do 1º impacto) → kokusenMiss ------------
  await waitSlotReady();
  const target3 = await approachFreshEnemy();
  const before3 = await castAndWaitFirstImpact(target3);
  // Um hitstop residual (do golpe de teste que limpou a rodada anterior em `approachFreshEnemy`, ou do próprio
  // 1º impacto leve, HITSTOP_MS.light=50 ms) pode congelar 1-2 frames logo aqui: espera destravar antes de contar
  // os frames do aperto "cedo demais", senão a tecla pode cair além do previsto e não bater a janela certa.
  for (let i = 0; i < 10 && snap.hitstop.frozen; i++) snap = await frame();
  const kokusenBefore3 = countOf(snap.events, 'kokusen');
  // KOK-05: só depois do 1º impacto a tecla conta; tenta apertar nos primeiros frames (bem abaixo dos 60 ms do
  // `zoneFrom`, mesmo se a zona já estiver ativa) até a tecla realmente contar (miss ou, por engano, kokusen).
  let missLanded = false;
  for (let i = 0; i < 3 && !missLanded; i++) {
    snap = await frame();
    const missBefore = countOf(snap.events, 'kokusenMiss');
    const kokusenBeforeX = countOf(snap.events, 'kokusen');
    snap = await press1('KeyL');
    if (countOf(snap.events, 'kokusen') > kokusenBeforeX) {
      assert(false, `KOK-04: a tecla deveria ter sido cedo demais (miss), mas virou Kokusen: ${JSON.stringify(snap.events)}`);
    }
    if (countOf(snap.events, 'kokusenMiss') > missBefore) missLanded = true;
  }
  assert(missLanded, `KOK-04: esperava um kokusenMiss: ${JSON.stringify(snap.events)}`);
  const divergent2Before3 = countOf(snap.events, 'divergent2');
  let secondImpact3 = null;
  for (let i = 0; i < 20 && secondImpact3 === null; i++) {
    snap = await frame();
    if (countOf(snap.events, 'divergent2') > divergent2Before3) secondImpact3 = snap;
  }
  assert(secondImpact3, 'o 2º impacto do cenário 3 (sem Kokusen) nunca aconteceu');
  assert(countOf(secondImpact3.events, 'kokusen') === kokusenBefore3, `KOK-04: não deveria ter virado Kokusen: ${JSON.stringify(secondImpact3.events)}`);
  const enemyAfter3 = secondImpact3.enemies.find((e) => e.id === target3);
  assert(enemyAfter3.hp === before3 - 12 - 18, `2º impacto comum deveria tirar 18 a mais: ${JSON.stringify(enemyAfter3)}`);
}
