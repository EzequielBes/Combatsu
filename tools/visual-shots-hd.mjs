// Cenários do corpo HD (`?hd=1`) para `tools/visual-shots.mjs`: o mesmo `t` (abrir, avançar, capturar) dos outros.

/** Os cenários HD; `base` são os parâmetros de URL comuns a todas as capturas. */
export const hdScenarios = (BASE) => ({
  async hd(t) {
    await t.open(`hd=1&${BASE}&tech=vermelho`);
    await t.at(500, '80-hd-idle');
    await t.down('KeyD');
    await t.at(250, '81-hd-corrida-a');
    await t.at(100, '81-hd-corrida-b');
    await t.up('KeyD');
    await t.settle();
    await t.press('KeyW', 'KeyJ');
    await t.watch(80, [['82-hd-gancho', (s) => s.player.frame === 'ganchoAscendente@active-0']]);
    await t.settle();
    await t.tap('KeyL');
    await t.watch(240, [
      ['83-hd-vermelho-carga', (s) => s.fx.red.glow.active, 10],
      ['83-hd-vermelho-carga+16', (s) => s.fx.red.glow.active, 16],
      ['83-hd-vermelho-voo', t.layer('red.trail'), 3],
    ]);
  },
  // Punho Divergente com o corpo HD: a chama no punho no preparo, no soco e apagando na volta.
  async hdDivergente(t) {
    await t.open(`hd=1&${BASE}&tech=divergente`);
    await t.snap(500);
    await t.tap('KeyL');
    const frame = (name) => (s) => s.player.frame === name;
    await t.watch(120, [
      ['84-hd-divergente-charge', frame('divergente-charge'), 3],
      ['84-hd-divergente-release', frame('divergente-release'), 2],
      ['84-hd-divergente-release+4', frame('divergente-release'), 4],
      ['84-hd-divergente-recover', frame('divergente-recover'), 3],
      ['84-hd-divergente-recover+9', frame('divergente-recover'), 9],
    ]);
  },
});
