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
}
