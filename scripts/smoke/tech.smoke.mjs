// Energia amaldiçoada, conjuração de técnica e HUD (CE-01, TEC-01/02/07/09/10/12, CAST-01/05/07/14/15/16/17)
// com `?debug&seed=1[&tech=divergente]`. A compra da técnica garantida (TSH-05/06/14) mora em `shop.smoke.mjs`
// (reusa o `openShop` de lá).
export default async function ({ page, baseUrl, assert }) {
  // Um passo interno do jogo (`step()` arredonda para cima em múltiplos de 1000/60 ms, FND-22): usado para
  // capturar a borda exata de `JustDown` sem passar do estado seguinte da conjuração.
  const stepAndSnap = async (ms) =>
    page.evaluate((n) => {
      window.__game.step(n);
      return window.__game.snapshot();
    }, ms);
  const frame = () => stepAndSnap(16); // ~16.667 ms, um único passo interno.
  // A tecla fica segurada durante um único passo interno, para o `JustDown` disparar sem já avançar de estado.
  const press1 = async (code) => {
    await page.keyboard.down(code);
    const snap = await frame();
    await page.keyboard.up(code);
    return snap;
  };
  const waitReady = async () =>
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

  // CE-01/TEC-01: sem `tech=`, a run começa com 100/100/8 de energia e os dois slots vazios (AD-005).
  await page.goto(`${baseUrl}?debug&enemyGuard=0&seed=1`, { waitUntil: 'load' });
  await waitReady();
  let snap = await stepAndSnap(20);
  assert(
    snap.ce.cur === 100 && snap.ce.max === 100 && snap.ce.regen === 8,
    `CE-01: energia inicial deveria ser 100/100/8: ${JSON.stringify(snap.ce)}`,
  );
  assert(
    snap.tech.slots[0] === null && snap.tech.slots[1] === null,
    `TEC-01: slots deveriam vir vazios: ${JSON.stringify(snap.tech.slots)}`,
  );

  // A partir daqui, `?debug&tech=divergente` (TEC-02): o `equipDebugTech` só roda no `startRun` (RunCommand
  // `startRun`, disparado ao apertar J) - por isso a run já começa aqui, antes de olhar os slots.
  await page.goto(`${baseUrl}?debug&enemyGuard=0&seed=1&tech=divergente`, { waitUntil: 'load' });
  await waitReady();
  await stepAndSnap(20);
  await page.keyboard.press('KeyJ', { delay: 50 });
  snap = await stepAndSnap(300);
  assert(snap.run.state === 'roundActive', `run deveria começar: ${JSON.stringify(snap.run)}`);
  assert(
    snap.tech.slots[0] &&
      snap.tech.slots[0].id === 'divergente' &&
      snap.tech.slots[0].level === 1 &&
      snap.tech.slots[0].cooldownMs === 0,
    `TEC-02: slot 1 deveria ter o Divergente em nv 1, sem recarga: ${JSON.stringify(snap.tech.slots)}`,
  );
  assert(snap.tech.slots[1] === null, `TEC-02: slot 2 deveria continuar vazio: ${JSON.stringify(snap.tech.slots)}`);

  // TEC-07/12: com 100/100 a barra fica cheia (fill = largura) e a marca do custo 20 fica em largura × 20/100.
  const barW = snap.hud.energy.width;
  assert(barW > 0, `TEC-07: barra sem largura: ${barW}`);
  assert(
    Math.abs(snap.hud.energy.fillWidth - barW) < 0.01,
    `TEC-07: barra cheia deveria preencher ${barW}: ${snap.hud.energy.fillWidth}`,
  );
  assert(
    snap.hud.energy.marks[0] !== null && Math.abs(snap.hud.energy.marks[0] - (barW * 20) / 100) <= 1,
    `TEC-12: marca do custo do slot 1 deveria ficar em largura × 20/100: ${JSON.stringify(snap.hud.energy.marks)}`,
  );
  assert(
    snap.hud.energy.marks[1] === null,
    `TEC-12: slot 2 vazio não deveria ter marca: ${JSON.stringify(snap.hud.energy.marks)}`,
  );
  assert(
    snap.hud.energy.icons[0].cooldownOverlayHeight === 0,
    `TEC-09: sem recarga, overlay deveria ser 0: ${JSON.stringify(snap.hud.energy.icons)}`,
  );

  // CAST-01: L (slot 1) com energia e sem recarga inicia a conjuração em `sign`.
  snap = await press1('KeyL');
  assert(
    snap.tech.cast &&
      snap.tech.cast.slot === 0 &&
      snap.tech.cast.id === 'divergente' &&
      snap.tech.cast.state === 'sign',
    `CAST-01: conjuração deveria começar em sign: ${JSON.stringify(snap.tech.cast)}`,
  );
  // CAST-14: aura na camada `cast.aura` enquanto sign/charge.
  assert(
    snap.fx.layers.includes('cast.aura'),
    `CAST-14: fx.layers deveria ter cast.aura: ${JSON.stringify(snap.fx.layers)}`,
  );
  const zoomAtSign = snap.camera.zoom;

  // Avança para perto do fim do `charge` (signMs 60 + quase todo o chargeMs 60): zoom já deveria ter subido bem
  // acima da base (CAST-15: 1,5 → 1,6 ao longo do charge).
  snap = await stepAndSnap(50);
  snap = await stepAndSnap(50);
  assert(snap.tech.cast && snap.tech.cast.state === 'charge', `esperava charge: ${JSON.stringify(snap.tech.cast)}`);
  assert(
    snap.fx.layers.includes('cast.aura'),
    `CAST-14: aura deveria continuar em charge: ${JSON.stringify(snap.fx.layers)}`,
  );
  assert(
    snap.camera.zoom > zoomAtSign + 0.05,
    `CAST-15: zoom deveria ter subido bem acima da base durante o charge: ${zoomAtSign} -> ${snap.camera.zoom}`,
  );

  // Entra em `release` (mais ~33 ms): CAST-16 (chamada no HUD) e CAST-17 (evento techCast:divergente).
  snap = await stepAndSnap(20);
  assert(snap.tech.cast && snap.tech.cast.state === 'release', `esperava release: ${JSON.stringify(snap.tech.cast)}`);
  assert(
    snap.hud.callout && snap.hud.callout.id === 'divergente' && snap.hud.callout.name === 'Punho Divergente',
    `CAST-16: callout deveria mostrar o Punho Divergente: ${JSON.stringify(snap.hud.callout)}`,
  );
  assert(
    snap.events.filter((e) => e === 'techCast:divergente').length === 1,
    `CAST-17: esperava um techCast:divergente: ${JSON.stringify(snap.events)}`,
  );

  // Avança por recover e volta a `null`; a recarga do slot 1 fica presa em 1200 ms (CAST-04) e some com o tempo.
  snap = await stepAndSnap(100);
  assert(snap.tech.cast && snap.tech.cast.state === 'recover', `esperava recover: ${JSON.stringify(snap.tech.cast)}`);
  snap = await stepAndSnap(250);
  assert(snap.tech.cast === null, `conjuração deveria ter terminado: ${JSON.stringify(snap.tech.cast)}`);
  // 900 ms (CALLOUT_MS) ainda não se passaram desde a entrada em `release`: a chamada segue visível.
  assert(
    snap.hud.callout && snap.hud.callout.id === 'divergente',
    `CAST-16: callout ainda deveria estar visível: ${JSON.stringify(snap.hud.callout)}`,
  );
  assert(
    snap.tech.slots[0].cooldownMs > 0,
    `CAST-04: recarga deveria estar em andamento: ${JSON.stringify(snap.tech.slots)}`,
  );

  // TEC-09: overlay de recarga proporcional ao tempo restante (altura do ícone lida do snapshot, cooldown total 1200 ms) em dois
  // pontos distintos - confirma que o valor acompanha `cooldownMs`, não fica travado.
  const cd1 = snap.tech.slots[0].cooldownMs;
  const h1 = snap.hud.energy.icons[0].cooldownOverlayHeight;
  const iconH = snap.hud.energy.icons[0].iconHeight;
  assert(
    Math.abs(h1 - (iconH * cd1) / 1200) <= 1,
    `TEC-09: overlay ${h1} não bate com ${iconH}×${cd1}/1200: ${JSON.stringify(snap.hud.energy)}`,
  );
  snap = await stepAndSnap(400);
  const cd2 = snap.tech.slots[0].cooldownMs;
  assert(cd2 > 0 && cd2 < cd1, `recarga deveria continuar caindo: ${cd1} -> ${cd2}`);
  const h2 = snap.hud.energy.icons[0].cooldownOverlayHeight;
  assert(
    Math.abs(h2 - (iconH * cd2) / 1200) <= 1,
    `TEC-09: overlay ${h2} não bate com ${iconH}×${cd2}/1200: ${JSON.stringify(snap.hud.energy)}`,
  );

  // Espera a recarga zerar de vez (bem depois disso os 900 ms do callout também já se passaram, CAST-16).
  for (let i = 0; i < 20 && snap.tech.slots[0].cooldownMs > 0; i++) snap = await stepAndSnap(100);
  assert(snap.tech.slots[0].cooldownMs === 0, `recarga deveria ter zerado: ${JSON.stringify(snap.tech.slots)}`);
  assert(
    snap.hud.energy.icons[0].cooldownOverlayHeight === 0,
    `TEC-09: overlay deveria zerar com a recarga: ${JSON.stringify(snap.hud.energy.icons)}`,
  );
  assert(
    snap.hud.callout === null,
    `CAST-16: callout deveria ter sumido depois de 900 ms: ${JSON.stringify(snap.hud.callout)}`,
  );

  // CAST-05: conjura repetidamente (custo 20, sem alvo por perto - o player nasce longe dos pontos de spawn de
  // inimigo do level de teste) até a energia não bastar mais para uma nova conjuração.
  let denied = false;
  for (let i = 0; i < 20 && !denied; i++) {
    for (let w = 0; w < 30 && (snap.tech.cast !== null || snap.tech.slots[0].cooldownMs > 0); w++)
      snap = await stepAndSnap(100);
    assert(
      snap.tech.cast === null && snap.tech.slots[0].cooldownMs === 0,
      `slot 1 deveria estar livre para conjurar: ${JSON.stringify(snap.tech)}`,
    );
    const before = snap.ce.cur;
    snap = await press1('KeyL');
    // A recusa (se houver) já é decidida neste exato frame: cast fica null e a energia não mudou ainda (senão a
    // regen do frame seguinte, com o cast livre de novo, mascararia a comparação abaixo).
    const deniedNow = snap.tech.cast === null && before < 20;
    if (deniedNow) {
      // Uma recusa não gasta energia (não passa pelo `trySpend`); a regen do próprio frame (CE-04, ~0,13 num
      // passo de 16,667 ms) continua normal, já que não havia cast em andamento nem antes nem durante ele.
      assert(
        snap.ce.cur >= before && snap.ce.cur < before + 1,
        `CAST-05: energia não deveria ser gasta numa recusa: ${before} -> ${snap.ce.cur}`,
      );
      // TEC-10: a barra pisca de vermelho (300 ms) exatamente na tecla que é recusada por falta de energia.
      assert(
        snap.hud.energy.flashing === true,
        `TEC-10: a barra deveria piscar na recusa por energia: ${JSON.stringify(snap.hud.energy)}`,
      );
      assert(
        snap.events.filter((e) => e === 'techDenied:energy').length >= 1,
        `CAST-05: esperava techDenied:energy com energia ${before} < 20: ${JSON.stringify(snap.events)}`,
      );
      denied = true;
    } else {
      snap = await stepAndSnap(300);
    }
  }
  assert(denied, 'CAST-05: nunca vi uma recusa por falta de energia depois de 20 conjurações');

  // CAST-07: espera a energia regenerar o bastante para uma conjuração (sem estar conjurando, CE-04) e então
  // cancela com dano (tecla 4 de debug) ainda em `sign`; a energia não pode ter sido gasta.
  for (let i = 0; i < 40 && snap.ce.cur < 20; i++) snap = await stepAndSnap(300);
  assert(snap.ce.cur >= 20, `energia deveria ter regenerado o bastante: ${snap.ce.cur}`);
  const ceBeforeCancel = snap.ce.cur;
  snap = await press1('KeyL');
  assert(
    snap.tech.cast && snap.tech.cast.state === 'sign',
    `deveria estar em sign para o teste de cancelamento: ${JSON.stringify(snap.tech.cast)}`,
  );
  snap = await press1('Digit4'); // debugHurt(50): dano real, aciona onDamaged -> CastMachine.damageTaken.
  assert(
    snap.tech.cast === null,
    `CAST-07: a conjuração deveria ter sido cancelada: ${JSON.stringify(snap.tech.cast)}`,
  );
  assert(
    snap.events.filter((e) => e === 'techCancel').length >= 1,
    `CAST-07: esperava um techCancel: ${JSON.stringify(snap.events)}`,
  );
  // O cancelamento em si não gasta nada (`trySpend` nunca roda); a regen do próprio frame do dano (a energia já
  // não está mais "conjurando" quando o `CursedEnergy.update` deste frame roda, CE-05) pode adiantar ~0,13.
  assert(
    snap.ce.cur >= ceBeforeCancel && snap.ce.cur < ceBeforeCancel + 1,
    `CAST-07: energia não deveria ser gasta no cancelamento: ${ceBeforeCancel} -> ${snap.ce.cur}`,
  );
  assert(
    snap.tech.slots[0].cooldownMs === 0,
    `CAST-21: cancelar não deveria armar a recarga: ${JSON.stringify(snap.tech.slots)}`,
  );

  // Espera o dano do CAST-07 passar (atordoamento/invulnerabilidade), a recarga zerar e a energia bastar.
  const waitCastReady = async () => {
    for (let i = 0; i < 60 && (snap.tech.cast !== null || snap.tech.slots[0].cooldownMs > 0 || snap.ce.cur < 20); i++) {
      snap = await stepAndSnap(100);
    }
    snap = await stepAndSnap(800);
  };

  // CE-05: durante `sign` e `charge` a energia não regenera (8/s daria ~+0,13 por passo).
  await waitCastReady();
  snap = await press1('KeyL');
  assert(
    snap.tech.cast && snap.tech.cast.state === 'sign',
    `CE-05: deveria ter entrado em sign: ${JSON.stringify(snap.tech.cast)}`,
  );
  const ceAtSign = snap.ce.cur;
  let sawCharge = false;
  for (
    let i = 0;
    i < 20 && snap.tech.cast && (snap.tech.cast.state === 'sign' || snap.tech.cast.state === 'charge');
    i++
  ) {
    snap = await frame();
    const st = snap.tech.cast && snap.tech.cast.state;
    if (st === 'sign' || st === 'charge') {
      if (st === 'charge') sawCharge = true;
      assert(snap.ce.cur === ceAtSign, `CE-05: energia mudou durante ${st}: ${ceAtSign} -> ${snap.ce.cur}`);
    }
  }
  assert(sawCharge, 'CE-05: nunca vi o estado charge');

  // CAST-11: no ar, em sign/charge, a gravidade vale 30% (1800 × 0,3 / 60 = 9 px/s por passo; em queda livre, 30).
  await waitCastReady();
  snap = await press1('Space');
  snap = await frame();
  const vyA = (snap = await frame()).player.vy;
  const vyB = (snap = await frame()).player.vy;
  const freeDelta = vyB - vyA;
  assert(
    Math.abs(freeDelta - 30) <= 1.5,
    `CAST-11: pré-condição, gravidade normal no ar deveria somar ~30 px/s por passo: ${freeDelta}`,
  );
  snap = await press1('KeyL');
  assert(
    snap.tech.cast && snap.tech.cast.state === 'sign',
    `CAST-11: deveria ter conjurado no ar: ${JSON.stringify(snap.tech.cast)}`,
  );
  const castDeltas = [];
  let prevVy = snap.player.vy;
  for (let i = 0; i < 6; i++) {
    snap = await frame();
    const st = snap.tech.cast && snap.tech.cast.state;
    if (st !== 'sign' && st !== 'charge') break;
    castDeltas.push(snap.player.vy - prevVy);
    prevVy = snap.player.vy;
  }
  assert(castDeltas.length >= 3, `CAST-11: poucos passos em sign/charge no ar: ${JSON.stringify(castDeltas)}`);
  assert(
    castDeltas.every((d) => Math.abs(d - 9) <= 1.5),
    `CAST-11: no ar em sign/charge a gravidade deveria ser 30% (~9 px/s por passo): ${JSON.stringify(castDeltas)}`,
  );
}
