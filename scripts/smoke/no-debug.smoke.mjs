// Sem `?debug`, o jogo sobe mas não expõe `window.__game` (FND-10).
export default async function ({ page, baseUrl, assert }) {
  await page.goto(baseUrl, { waitUntil: 'load' });
  await page.waitForSelector('canvas', { timeout: 15_000 });
  const kind = await page.evaluate(() => typeof window.__game);
  assert(kind === 'undefined', `window.__game deveria ser undefined sem ?debug, veio ${kind}`);
}
