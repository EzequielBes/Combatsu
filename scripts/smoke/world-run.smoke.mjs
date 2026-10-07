// Run modular sem loja (ARE-01/02/05/07/12, KON-04, RCH-01) com `?debug&noshop=1&maxAlive=1&seed=11`: as rodadas 1 a 3
// andam do começo ao selo, derrubam a onda (tecla 2) e saem direto para a área seguinte. O `area=modular` evita que o
// runner force a sala de teste (`area=sala`) nesta URL.
const SEED_URL = '?debug&area=modular&enemyGuard=0&noshop=1&maxAlive=1&seed=11';
const ROUNDS = 3;
// RCH-01: alcance horizontal máximo do ponto de spawn (`SPAWN.reachPx`).
const REACH_PX = 900;

export default async function ({ page, baseUrl, assert }) {
  const stepAndSnap = async (ms) =>
    page.evaluate((n) => {
      window.__game.step(n);
      return window.__game.snapshot();
    }, ms);
  const open = async (query) => {
    await page.goto(`${baseUrl}${query}`, { waitUntil: 'load' });
    await page.waitForFunction(
      () => {
        try {
          return typeof window.__game.snapshot === 'function';
        } catch {
          return false;
        }
      },
      { timeout: 15_000 },
    );
    await stepAndSnap(20);
    await page.keyboard.press('KeyJ', { delay: 50 });
    return stepAndSnap(50);
  };

  /**
   * Joga as rodadas 1 a `rounds`: anda para a direita; derruba o inimigo que chega perto e, junto ao selo (ou em
   * `traverse`), todo inimigo vivo. Devolve os ids dos módulos de cada área, a maior distância de spawn medida e os
   * eventos acumulados. A última rodada para em `traverse`, sem sair.
   */
  const playRounds = async (query, rounds) => {
    let snap = await open(query);
    const areas = [];
    const seen = new Set();
    let maxSpawnDx = 0;
    let spawned = 0;
    await page.keyboard.down('KeyD');
    try {
      for (let round = 1; round <= rounds; round++) {
        assert(
          snap.run.state === 'roundActive' && snap.run.round === round,
          `rodada ${round} deveria estar ativa: ${JSON.stringify(snap.run)}`,
        );
        areas.push(snap.area.modules);
        const last = round === rounds;
        for (let i = 0; i < 6000; i++) {
          const done = last
            ? snap.run.state === 'traverse'
            : snap.run.round === round + 1 && snap.run.state === 'roundActive';
          if (done) break;
          const nearSeal = snap.area.exitX !== null && snap.player.x > snap.area.exitX - 100;
          const close = snap.enemies.some((e) => e.hp > 0 && Math.abs(e.x - snap.player.x) < 100);
          if (snap.enemies.some((e) => e.hp > 0) && (nearSeal || snap.run.state === 'traverse' || close)) {
            await page.keyboard.press('Digit2', { delay: 20 });
          }
          const prevX = snap.player.x;
          snap = await stepAndSnap(50);
          assert(!snap.player.dead, `o player morreu na rodada ${round}: ${JSON.stringify(snap.run)}`);
          for (const e of snap.enemies) {
            if (seen.has(e.id)) continue;
            seen.add(e.id);
            spawned++;
            // O player andou até ~11 px neste passo de 50 ms: vale a menor das duas distâncias (a do spawn está entre elas).
            maxSpawnDx = Math.max(maxSpawnDx, Math.min(Math.abs(e.x - prevX), Math.abs(e.x - snap.player.x)));
          }
        }
        const reached = last ? snap.run.state === 'traverse' : snap.run.round === round + 1;
        assert(reached, `rodada ${round} não terminou: ${JSON.stringify(snap.run)} x=${snap.player.x}`);
      }
    } finally {
      await page.keyboard.up('KeyD');
    }
    return { areas, snap, maxSpawnDx, spawned };
  };

  const first = await playRounds(SEED_URL, ROUNDS);
  const ids = first.areas;

  // ARE-01/02: 2 módulos nas rodadas 1 e 2 e 3 na rodada 3.
  assert(ids.map((a) => a.length).join() === '2,2,3', `ARE-01/02: esperava 2, 2 e 3 módulos: ${JSON.stringify(ids)}`);
  // ARE-05: o primeiro módulo de duas áreas seguidas nunca é o mesmo.
  for (let i = 1; i < ids.length; i++) {
    assert(
      ids[i][0] !== ids[i - 1][0],
      `ARE-05: área ${i + 1} começa com o mesmo módulo da anterior: ${JSON.stringify(ids)}`,
    );
  }
  // ARE-04: nenhum vizinho repetido dentro da área.
  for (const area of ids) {
    area.forEach((id, i) =>
      assert(i === 0 || id !== area[i - 1], `ARE-04: vizinhos repetidos: ${JSON.stringify(area)}`),
    );
  }
  // KON-04: com `noshop=1` a saída vai direto à próxima área, sem `shopOpen`.
  assert(
    !first.snap.events.some((e) => e.startsWith('shopOpen')),
    `KON-04: a loja abriu com noshop=1: ${JSON.stringify(first.snap.events)}`,
  );
  const builtEvents = first.snap.events.filter((e) => e.startsWith('areaBuilt:'));
  assert(
    builtEvents.slice(-2).join() === `areaBuilt:${ids[1].join(',')},areaBuilt:${ids[2].join(',')}`,
    `os eventos areaBuilt deveriam fechar nas áreas 2 e 3: ${JSON.stringify(builtEvents)}`,
  );
  // RCH-01: todo inimigo nasce a no máximo 900 px (horizontal) do player.
  assert(first.spawned >= 12, `esperava inimigos das 3 rodadas: ${first.spawned}`);
  assert(
    first.maxSpawnDx <= REACH_PX,
    `RCH-01: inimigo nasceu a ${Math.round(first.maxSpawnDx)} px do player (máximo ${REACH_PX})`,
  );

  // ARE-07: a mesma seed repete os ids das 3 áreas, numa carga nova da página.
  const again = await playRounds(SEED_URL, ROUNDS);
  assert(
    JSON.stringify(again.areas) === JSON.stringify(ids),
    `ARE-07: a mesma seed deu áreas diferentes: ${JSON.stringify(ids)} x ${JSON.stringify(again.areas)}`,
  );

  // ARE-12: `modules=parque,rua` força essa ordem em toda área comum (rodadas 1 e 2).
  const forced = await playRounds('?debug&enemyGuard=0&noshop=1&maxAlive=1&seed=11&modules=parque,rua', 2);
  assert(
    forced.areas.every((a) => JSON.stringify(a) === '["parque","rua"]'),
    `ARE-12: esperava parque,rua nas duas áreas: ${JSON.stringify(forced.areas)}`,
  );
}
