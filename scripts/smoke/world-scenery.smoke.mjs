// Cenário por tema (CEN-06, CEN-10, CEN-11, CEN-13, CEN-14) em HD, com `?debug&modules=rua,beco,parque&seed=3`:
// o primeiro plano tem a rolagem 1,15 × 1 lida do objeto, há decoração em cada módulo, os corpos estáticos do Matter
// são os mesmos com e sem a decoração (`decor=0`), a mesma URL dá a mesma decoração, e a sala não tem nada disso.
const QUERY = 'debug&hd=1&enemyGuard=0&maxAlive=1&seed=3&modules=rua,beco,parque';

export default async function ({ page, baseUrl, assert }) {
  const load = async (query) => {
    await page.goto(`${baseUrl}?${query}`, { waitUntil: 'load' });
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
    // O título mostra a rua selada (ARE-09); a área da rodada 1 só existe depois do J.
    await page.evaluate(() => window.__game.step(20));
    await page.keyboard.press('KeyJ', { delay: 50 });
    return page.evaluate(() => {
      window.__game.step(50);
      return window.__game.snapshot().area;
    });
  };

  const area = await load(QUERY);
  assert(area.mode === 'modular', `o cenário deveria abrir no mundo modular: ${area.mode}`);
  assert(
    JSON.stringify(area.modules) === '["rua","beco","parque"]',
    `módulos da área: ${JSON.stringify(area.modules)}`,
  );
  // CEN-11: rolagem do primeiro plano lida do objeto do Phaser.
  assert(
    area.front !== null && area.front.sx === 1.15 && area.front.sy === 1,
    `CEN-11: rolagem do primeiro plano: ${JSON.stringify(area.front)}`,
  );
  // CEN-13: pelo menos uma peça em cada módulo.
  assert(
    area.layout.decorPerModule.length === area.modules.length && area.layout.decorPerModule.every((n) => n >= 1),
    `CEN-13: peças por módulo: ${JSON.stringify(area.layout.decorPerModule)}`,
  );
  // CEN-13: a decoração fica na frente da camada próxima e atrás do player, e as peças encostam no topo do piso.
  // "Atrás dos atores" vale para o player, os inimigos vivos e o terreno, lidos dos objetos vivos.
  const { nearDepth, decorDepth, playerDepth, enemyMinDepth, terrainDepth, decorFoot } = area.layout;
  assert(
    enemyMinDepth !== null && terrainDepth !== null,
    `CEN-13: sem inimigo ou terreno: ${JSON.stringify(area.layout)}`,
  );
  assert(
    nearDepth < decorDepth && decorDepth < Math.min(playerDepth, enemyMinDepth, terrainDepth),
    `CEN-13: profundidades próxima < decoração < atores e terreno: ${JSON.stringify(area.layout)}`,
  );
  assert(decorFoot === 480, `CEN-13: o pé da decoração deveria ser o topo do piso (480): ${decorFoot}`);

  // CEN-06 e CEN-10: uma faixa da próxima e uma da média por módulo.
  assert(area.bands.length === 3, `CEN-06: faixas da camada próxima: ${JSON.stringify(area.bands)}`);
  assert(
    JSON.stringify(area.midBands) === JSON.stringify(area.modules.map((theme) => ({ theme }))),
    `CEN-10: faixas da camada média: ${JSON.stringify(area.midBands)}`,
  );

  // CEN-15: a mesma URL monta a mesma decoração.
  const again = await load(QUERY);
  assert(again.decor === area.decor, `CEN-15: decoração diferente na segunda carga: ${again.decor} != ${area.decor}`);

  // CEN-14: a decoração não cria corpo do Matter.
  const bare = await load(`${QUERY}&decor=0`);
  assert(bare.decor === 0 && bare.front === null, `decor=0 deveria desligar a decoração: ${JSON.stringify(bare)}`);
  assert(
    bare.staticBodies === area.staticBodies && bare.bodies === area.bodies,
    `CEN-14: corpos com decoração ${area.bodies} (${area.staticBodies} estáticos), sem ${bare.bodies} (${bare.staticBodies})`,
  );

  // Edge case: a sala de teste não tem primeiro plano nem decoração.
  const room = await load('debug&hd=1&area=sala');
  assert(room.mode === 'sala' && room.front === null && room.decor === 0, `a sala: ${JSON.stringify(room)}`);
}
