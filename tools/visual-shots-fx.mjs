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

/** Cenários da aura da Energia Reversa e do Azul (RCA-*, BLA-*), recortados em volta do efeito. */
export const techFxScenarios = () => ({
  // Aura da Energia Amaldiçoada Reversa (RCA-*): concentração, aura cheia curando e o apagar, sem inimigos na tela.
  async reversa(t) {
    for (const hd of ['', 'hd=1&']) {
      const tag = hd ? 'hd' : 'base';
      await t.open(`${hd}spawn=0&regen=0&noshop=1&enemyGuard=0`);
      await t.page.keyboard.press('Tab');
      await t.page.keyboard.press('Digit4');
      await t.snap(400);
      await t.down('KeyF');
      for (const [n, wait] of [
        ['02', 2],
        ['08', 6],
        ['20', 12],
        ['30', 10],
        ['34', 4],
        ['40', 6],
      ]) {
        await t.snap((1000 / 60) * wait);
        await t.close(`90-reversa-${tag}-${n}`, 80);
      }
      await t.up('KeyF');
      await t.snap(1000 / 60);
      await t.close(`90-reversa-${tag}-solta+1`, 80);
    }
  },
  // Azul no estilo do anime (BLA-*): recorte em volta do orbe, do nascer à implosão.
  async azul(t) {
    await t.open('enemyGuard=0&noshop=1&fxlab');
    await t.page.keyboard.press('Tab');
    await t.snap(300);
    await t.page.keyboard.press('Digit5');
    const orb = (s) => s.techObjects?.find((o) => o.kind === 'blue');
    let s = await t.snap(0);
    for (let i = 0; i < 120 && !orb(s); i++) s = await t.frame();
    t.assert(orb(s), 'o Azul não nasceu');
    const at = orb(s);
    const shots = new Set([1, 4, 10, 20, 40, 60]);
    for (let i = 1; i <= 60 && orb(s); i++) {
      s = await t.frame();
      if (shots.has(i)) await t.close(`91-azul-${String(i).padStart(2, '0')}`, 80, at);
    }
    for (let i = 0; i < 200 && orb(s); i++) s = await t.frame();
    for (const n of [0, 3, 6, 10]) {
      await t.close(`91-azul-implosao+${n}`, 80, at);
      for (let k = 0; k < (n === 0 ? 3 : n === 3 ? 3 : 4); k++) await t.frame();
    }
  },
});
