// Apoio dos smokes da loja com carta de eixo (`shop-axes`): abrir a página, vencer a rodada, andar até a konbini e
// procurar a carta do Vermelho. Não é um cenário (o runner só roda `*.smoke.mjs`).

/** Base dos cenários: mundo modular em HD, Vermelho equipado com 1 ponto de Potência, carteira cheia, rodada 4 (comum). */
export const BASE = 'hd=1&area=modular&enemyGuard=0&seed=3&regen=0&maxAlive=8&fragments=200&round=4&tech=vermelho';

export function makeShopKit({ page, baseUrl, assert }) {
  const step = (ms) =>
    page.evaluate((n) => {
      window.__game.step(n);
      return window.__game.snapshot();
    }, ms);
  /** A loja e o painel leem `JustDown`: a tecla fica segurada durante um passo do jogo. */
  const tap = async (code) => {
    await page.keyboard.down(code);
    await step(50);
    await page.keyboard.up(code);
    return step(20);
  };
  const open = async (query) => {
    await page.goto(`${baseUrl}?debug&${query}`, { waitUntil: 'load' });
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
  const shopCards = (s) => (s.shop.panel?.cards ?? []).filter((c) => c.lines.length > 0).length;

  /** Vence a rodada e anda até a konbini; devolve o snapshot com a loja (ou um painel) aberta. */
  const clearAndReachShop = async (s0) => {
    let s = s0;
    for (let i = 0; i < 400 && s.run.state === 'roundActive'; i++) {
      await page.keyboard.press('Digit2', { delay: 20 });
      s = await step(80);
      if (s.player.dead) throw new Error('o player morreu antes de vencer a rodada');
    }
    for (let i = 0; i < 200 && s.run.state !== 'traverse'; i++) s = await step(50);
    await page.keyboard.down('KeyD');
    for (let i = 0; i < 600 && s.run.state !== 'shop'; i++) s = await step(50);
    await page.keyboard.up('KeyD');
    for (let i = 0; i < 20 && s.vows.panelCards === 0 && !s.choice?.open && shopCards(s) === 0; i++) {
      s = await step(50);
    }
    return s;
  };

  /** Rerola (com fragmentos de sobra) até a carta 0 ser a do Vermelho; a carta 0 sai do `axisRng` (CRD-02). */
  const rerollToRedCard = async (s0) => {
    let s = s0;
    for (let i = 0; i < 12 && s.shop.offers[0]?.id !== 'vermelho'; i++) s = await tap('KeyR');
    assert(
      s.shop.offers[0]?.id === 'vermelho',
      `a carta 0 deveria ser a do Vermelho: ${JSON.stringify(s.shop.offers)}`,
    );
    return s;
  };

  /** Leva a seleção da loja à carta `slot` com `A`/`D` (a tecla `D` da caminhada pode ter movido a seleção ao abrir). */
  const selectCard = async (s0, slot) => {
    let s = s0;
    for (let i = 0; i < 8 && s.shop.selected !== slot; i++) s = await tap(s.shop.selected > slot ? 'KeyA' : 'KeyD');
    assert(s.shop.selected === slot, `a seleção deveria ir à carta ${slot}: ${s.shop.selected}`);
    return s;
  };

  return { step, tap, open, shopCards, clearAndReachShop, rerollToRedCard, selectCard };
}
