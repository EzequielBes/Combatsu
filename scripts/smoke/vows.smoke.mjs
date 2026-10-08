// Votos Vinculativos (VOW-*) em HD. Cada bloco abre a página com a sua query e confere o efeito lido do jogo vivo.
const SEED = 3;

export default async function ({ page, baseUrl, assert }) {
  const step = (ms) =>
    page.evaluate((n) => {
      window.__game.step(n);
      return window.__game.snapshot();
    }, ms);
  const open = async (query) => {
    await page.goto(`${baseUrl}?debug&hd=1&enemyGuard=0&seed=${SEED}&${query}`, { waitUntil: 'load' });
    await page.waitForFunction(
      () => {
        try {
          return !!window.__game.snapshot();
        } catch {
          return false;
        }
      },
      { timeout: 15_000 },
    );
    await step(20);
    await page.keyboard.press('KeyJ', { delay: 50 });
    return step(50);
  };

  // VOW-09: o voto do debug entra na run (id desconhecido é ignorado) e aparece no snapshot, sem painel aberto.
  let s = await open('vows=corpoDeVidro,naoExiste');
  assert(JSON.stringify(s.vows.taken) === '["corpoDeVidro"]', `VOW-09: votos da run: ${JSON.stringify(s.vows)}`);
  assert(s.vows.offers === null, `VOW-09: painel fechado no começo: ${JSON.stringify(s.vows.offers)}`);
  assert(s.vows.effects.maxHpMul === 0.6, `VOW-09: efeitos no snapshot: ${JSON.stringify(s.vows.effects)}`);

  // VOW-08: sem o parâmetro, a run começa sem voto.
  s = await open('maxAlive=1');
  assert(JSON.stringify(s.vows.taken) === '[]', `VOW-08: run sem voto: ${JSON.stringify(s.vows)}`);

  // VOW-11/12: o multiplicador do golpe lido da composição da cena (a mesma do player): Sem guarda só no forte,
  // Pacto do feiticeiro nos dois.
  s = await open('vows=semGuarda');
  assert(s.vows.strike.light === 1 && s.vows.strike.heavy === 1.6, `VOW-11: golpe: ${JSON.stringify(s.vows.strike)}`);
  s = await open('vows=pactoDoFeiticeiro');
  assert(
    Math.abs(s.vows.strike.light - 0.7) < 1e-9 && Math.abs(s.vows.strike.heavy - 0.7) < 1e-9,
    `VOW-12: golpe: ${JSON.stringify(s.vows.strike)}`,
  );

  // VOW-13: com Fluxo selado o Desmantelar (30) custa 18 de energia, medido na barra viva ao conjurar.
  s = await open('vows=fluxoSelado&tech=corte&maxAlive=0');
  const before = s.ce.cur;
  await page.keyboard.down('KeyL');
  s = await step(17);
  await page.keyboard.up('KeyL');
  assert(
    s.tech.cast && s.tech.cast.id === 'corte',
    `VOW-13: a técnica deveria conjurar: ${JSON.stringify(s.tech.cast)}`,
  );
  // A energia sai no meio da conjuração (e a regeneração para durante ela): o menor valor da barra dá o custo.
  let low = s.ce.cur;
  for (let i = 0; i < 30; i++) low = Math.min(low, (await step(17)).ce.cur);
  assert(Math.abs(before - low - 18) < 0.5, `VOW-13: custo ${before - low} (esperava 18)`);

  // VOW-17: com Pele de pedra os 50 de dano de teste (tecla 4) viram 35 na vida viva.
  s = await open('vows=peleDePedra&regen=0&maxAlive=0');
  const hp0 = s.player.hp;
  await page.keyboard.press('Digit4', { delay: 50 });
  s = await step(17);
  assert(hp0 - s.player.hp === 35, `VOW-17: dano sofrido ${hp0 - s.player.hp} (esperava 35)`);
}
