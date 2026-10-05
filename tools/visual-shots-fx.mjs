// Cenários dos efeitos de contato com o corpo HD (`?hd=1`) para `tools/visual-shots.mjs`: recortes ampliados em volta
// do player, do contato até o efeito apagar.

/** `base` são os parâmetros de URL comuns a todas as capturas. */
export const fxScenarios = (BASE) => ({
  // Impacto dos golpes com o corpo HD: soco leve, chute forte e o decisivo, do contato até o efeito apagar.
  async hdImpacto(t) {
    const hit = (s) => s.fx.lastImpact !== null;
    for (const [tag, keys] of [
      ['leve', ['KeyJ']],
      ['forte', ['KeyK']],
      ['decisivo', ['KeyS', 'KeyK']],
    ]) {
      await t.open(`hd=1&${BASE}`);
      await t.approach(40);
      await t.press(...keys);
      // Um quadro por vez até o golpe acertar; o que vem antes é o preparo e o rastro.
      let s = await t.snap(0);
      for (let i = 0; i < 90 && !hit(s); i++) {
        if (i % 3 === 0) await t.close(`86-hd-${tag}-pre-${String(i).padStart(2, '0')}`, 96);
        s = await t.frame();
      }
      t.assert(hit(s), `o golpe ${tag} não acertou`);
      for (let i = 0; i < 16; i++) {
        if (i < 8 || i % 2 === 0) await t.close(`86-hd-${tag}-hit+${String(i).padStart(2, '0')}`, 96);
        await t.frame();
      }
    }
  },
  // Faísca de contato fora do golpe do jogador: o golpe sofrido e a guarda (o inimigo bate ~28 quadros depois de
  // chegar a 40 px, `startDuel`).
  async hdFaisca(t) {
    const run = async (tag, act, done) => {
      let s = await t.open(`hd=1&${BASE}`);
      const hp = s.player.hp;
      await t.startDuel();
      await act();
      for (let i = 0; i < 90 && !done(s, hp); i++) s = await t.frame();
      t.assert(done(s, hp), `a faísca ${tag} não aconteceu`);
      for (const n of [0, 3, 5, 7, 9]) {
        await t.close(`87-hd-faisca-${tag}+${n}`, 96);
        await t.snap(32);
      }
    };
    await run(
      'sofrido',
      async () => {},
      (s, hp) => s.player.hp < hp,
    );
    await run('guarda', () => t.down('KeyU'), t.layer('guard.spark'));
    await t.up('KeyU');
  },
});
