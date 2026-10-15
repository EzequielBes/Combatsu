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

export const bodyScenarios = () => ({
  corpoGolpe: (t) => bodyStrikeScenario(t),
});
