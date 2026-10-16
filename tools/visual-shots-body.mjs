// Cenários do Corpo Amaldiçoado (CRP-04, CRP-05, CRP-07, CRP-10) para `tools/visual-shots.mjs`, em HD e para os dois
// lados: recortes em volta do player a cada quadro do golpe.

/** Abre o jogo sem inimigos com os pontos do Corpo e vira o player para o lado pedido. */
async function openBody(t, axes, side) {
  await t.open(`hd=1&enemyGuard=0&noshop=1&maxAlive=0&shove=0&axes=${axes}`);
  if (side === 'esq') await t.press('KeyA');
  await t.snap(300);
}

// Ritmo 3 (pós-imagem na `recovery`) e Alcance 3 (rastro 14 px mais largo), num leve e num forte, parado.
async function bodyStrikeScenario(t) {
  for (const [tag, axes] of [
    ['ritmo', 'corpo.ritmo:3'],
    ['alcance', 'corpo.alcance:3'],
    ['base', ''],
  ]) {
    for (const side of ['dir', 'esq']) {
      for (const key of ['KeyJ', 'KeyK']) {
        await openBody(t, axes, side);
        await t.press(key);
        for (let i = 0; i < 22; i++) {
          await t.close(
            `99-corpo-${tag}-${side}-${key === 'KeyJ' ? 'leve' : 'forte'}-${String(i).padStart(2, '0')}`,
            64,
          );
          await t.frame();
        }
      }
    }
  }
}

// Aura da Fúria (CRP-07.11): 7 acúmulos no boneco do laboratório (que não revida), e o player parado e correndo para os
// dois lados com a aura acesa; mais as capturas a cada acúmulo para ver o raio crescer.
async function furyAuraScenario(t) {
  let s = await t.open('hd=1&fxlab&noshop=1&shove=0&axes=corpo.furia:3');
  await t.down('KeyD');
  for (let i = 0; i < 300 && s.player.x < 440; i++) s = await t.frame();
  await t.up('KeyD');
  await t.snap(300);
  await t.press('KeyA');
  await t.snap(300);
  for (let k = 1; k <= 7; k++) {
    await t.press('KeyJ');
    await t.snap(900);
    await t.close(`99-furia-acumulo-${k}`, 64);
  }
  await t.press('KeyD');
  await t.snap(200);
  await t.close('99-furia-parado-dir', 64);
  for (const [key, side] of [
    ['KeyD', 'dir'],
    ['KeyA', 'esq'],
  ]) {
    await t.down(key);
    for (let i = 0; i < 24; i++) {
      if (i % 3 === 0) await t.close(`99-furia-correndo-${side}-${String(i).padStart(2, '0')}`, 64);
      await t.frame();
    }
    await t.up(key);
  }
  await t.snap(300);
  await t.close('99-furia-parado-esq', 64);
}

// Onda do Punho (CRP-10) no mundo modular: a rasteira no comum mais perto solta a onda. Na rua os dois comuns vêm da
// direita (a onda vai à direita, até o 2º); no beco o player corre até a boca da esquerda e bate no comum que nasce
// lá (a onda vai à esquerda).
async function fistWaveScenario(t) {
  for (const [tag, extra] of [
    ['rua', ''],
    ['beco', '&modules=beco'],
  ]) {
    const q = `hd=1&area=modular&maxAlive=2&enemyGuard=0&noshop=1&shove=0&axes=corpo.fluxo:1&ramo=corpo:b${extra}`;
    let s = await t.open(q);
    if (extra) {
      await t.down('KeyA');
      for (let i = 0; i < 200 && s.player.x > 90; i++) s = await t.frame();
      await t.up('KeyA');
    }
    for (let i = 0; i < 40 && s.enemies.length < 2; i++) s = await t.snap(300);
    for (let tries = 0; tries < 6; tries++) {
      await t.waitQuiet();
      s = await t.approach();
      const seen = s.events.length;
      // O chute frontal acerta na altura do tronco: a onda anda acima da faixa de dicas do pé da tela.
      await t.press('KeyK');
      const side = s.player.facing === 1 ? 'dir' : 'esq';
      let n = 0;
      for (let i = 0; i < 40; i++) {
        s = await t.frame();
        if (!s.events.slice(seen).includes('fistWave:emit') || s.hitstop.frozen || n >= 16) continue;
        n += 1;
        const at = { x: s.player.x + s.player.facing * 50, y: s.player.y };
        await t.close(`99-onda-${tag}-${side}-${String(n).padStart(2, '0')}`, 100, at);
      }
      if (n > 0) break;
    }
  }
}

// Onda do Punho para a esquerda (CRP-10): na rua o player pula por cima do comum que vem da direita e bate nele de
// costas para a direita, e o chute frontal solta a onda para a esquerda.
async function fistWaveLeftScenario(t) {
  let s = await t.open('hd=1&area=modular&maxAlive=1&enemyGuard=0&noshop=1&shove=0&axes=corpo.fluxo:1&ramo=corpo:b');
  for (let i = 0; i < 40 && s.enemies.length < 1; i++) s = await t.snap(300);
  for (let tries = 0; tries < 8; tries++) {
    s = await t.approach(60);
    await t.down('KeyD');
    for (let i = 0; i < 40 && s.player.x < t.nearest(s).x + 50; i++) {
      if (i % 12 === 0) await t.press('KeyW');
      s = await t.frame();
    }
    await t.up('KeyD');
    s = await t.snap(200);
    if (s.player.x <= t.nearest(s).x) continue;
    await t.waitQuiet();
    s = await t.approach();
    if (s.player.facing !== -1) continue;
    const seen = s.events.length;
    await t.press('KeyK');
    let n = 0;
    for (let i = 0; i < 40 && n < 16; i++) {
      s = await t.frame();
      if (!s.events.slice(seen).includes('fistWave:emit') || s.hitstop.frozen) continue;
      n += 1;
      await t.close(`99-onda-esq-${String(n).padStart(2, '0')}`, 100, { x: s.player.x - 50, y: s.player.y });
    }
    if (n > 0) return;
  }
  t.assert(false, 'a onda para a esquerda não saiu');
}

// Punho que Rasga (CRP-11, CRP-13): a 1ª onda da rodada com o Despertar mostra o banner e a câmera lenta, e a onda
// atravessa os comuns atrás do alvo (tela inteira e recortes à frente do player).
async function tearingWaveScenario(t) {
  let s = await t.open(
    'hd=1&area=modular&maxAlive=3&enemyGuard=0&noshop=1&shove=0&mods=vida:5&axes=corpo.fluxo:3,corpo.alcance:1&ramo=corpo:b',
  );
  for (let i = 0; i < 40 && s.enemies.length < 3; i++) s = await t.snap(300);
  await t.waitQuiet();
  s = await t.approach();
  const seen = s.events.length;
  await t.press('KeyK');
  let n = 0;
  for (let i = 0; i < 60 && n < 10; i++) {
    s = await t.frame();
    if (!s.events.slice(seen).includes('fistWave:emit')) continue;
    if (n === 0) await t.shot('99-rasga-anuncio');
    n += 1;
    if (!s.hitstop.frozen)
      await t.close(`99-rasga-${String(n).padStart(2, '0')}`, 110, {
        x: s.player.x + s.player.facing * 70,
        y: s.player.y,
      });
  }
  t.assert(n > 0, 'a onda do Punho que Rasga não saiu');
}

export const bodyScenarios = () => ({
  corpoGolpe: (t) => bodyStrikeScenario(t),
  corpoFuria: (t) => furyAuraScenario(t),
  corpoOnda: (t) => fistWaveScenario(t),
  corpoOndaEsq: (t) => fistWaveLeftScenario(t),
  corpoRasga: (t) => tearingWaveScenario(t),
});
