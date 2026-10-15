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

export const bodyScenarios = () => ({
  corpoGolpe: (t) => bodyStrikeScenario(t),
  corpoFuria: (t) => furyAuraScenario(t),
});
