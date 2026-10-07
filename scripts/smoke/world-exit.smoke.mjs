// Saída da área com curas no chão (TRV-07) com `?debug&seed=9&armed=knife&heal=1&regen=0&modules=beco,parque&maxAlive=1`:
// cada abate solta uma gota de cura (`heal=1`) e a seed 9 sorteia o Elixir no sexto abate (o último da rodada 1, com
// os inimigos armados a 20%). Com a vida cheia as curas esperam no chão; a vida só cai no fim do fade de saída, e a
// saída tem de aplicar todas as curas vivas, com teto no `maxHp`.
const TILE = 32;

export default async function ({ page, baseUrl, assert }) {
  await page.goto(`${baseUrl}?debug&enemyGuard=0&seed=9&armed=knife&heal=1&regen=0&modules=beco,parque&maxAlive=1`, {
    waitUntil: 'load',
  });
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
  const stepAndSnap = async (ms) =>
    page.evaluate((n) => {
      window.__game.step(n);
      return window.__game.snapshot();
    }, ms);

  await stepAndSnap(20);
  await page.keyboard.press('KeyJ', { delay: 50 });
  let snap = await stepAndSnap(50);
  assert(
    snap.run.state === 'roundActive' && snap.run.round === 1,
    `rodada 1 deveria começar: ${JSON.stringify(snap.run)}`,
  );
  const exitX = snap.area.exitX;
  assert(
    exitX === 53 * TILE && snap.area.sealed === true,
    `selo fechado em ${53 * TILE}: ${JSON.stringify(snap.area)}`,
  );

  // Anda até o selo fechado, derrubando no caminho (tecla 2) até 3 inimigos para a onda de 6 seguir aberta.
  await page.keyboard.down('KeyD');
  let still = 0;
  let prevX = snap.player.x;
  for (let i = 0; i < 400 && still < 5; i++) {
    if (snap.run.kills < 3 && snap.enemies.some((e) => e.hp > 0)) await page.keyboard.press('Digit2', { delay: 20 });
    snap = await stepAndSnap(100);
    assert(
      snap.run.state === 'roundActive' && !snap.player.dead,
      `a onda não deveria acabar andando: ${JSON.stringify(snap.run)}`,
    );
    still = snap.player.x - prevX < 0.5 && snap.player.x > exitX - 120 ? still + 1 : 0;
    prevX = snap.player.x;
  }
  assert(still >= 5, `player não chegou ao selo: x=${snap.player.x} exitX=${exitX}`);

  // THM-03: enquanto o selo é sólido ele é desenhado com o frame `seal`. Daqui o player fica parado (D solta) para o
  // efeito do selo ser medido sem a saída o interromper.
  await page.keyboard.up('KeyD');
  assert(
    snap.area.sealed && snap.area.seal?.texture === 'seal' && snap.area.seal.frame === 'seal',
    `THM-03: o selo sólido deveria usar o frame seal: ${JSON.stringify(snap.area)}`,
  );

  // Derruba o resto da onda junto ao selo; o último abate deixa as curas e o Elixir frescos no chão.
  for (let i = 0; i < 1200 && snap.run.state === 'roundActive'; i++) {
    if (snap.enemies.some((e) => e.hp > 0)) await page.keyboard.press('Digit2', { delay: 20 });
    snap = await stepAndSnap(16);
  }
  assert(
    snap.run.state === 'traverse' && snap.run.kills === 6,
    `a onda deveria fechar com 6 abates: ${JSON.stringify(snap.run)}`,
  );
  const cure = (s) => s.pickups.filter((p) => p.kind !== 'fragment');
  assert(
    cure(snap).some((p) => p.kind === 'heal') && cure(snap).some((p) => p.kind === 'elixir'),
    `TRV-07: esperava uma gota de cura e um Elixir no chão ao fechar a onda: ${JSON.stringify(snap.pickups)}`,
  );
  assert(
    snap.player.hp === snap.player.maxHp,
    `a vida deveria estar cheia até aqui: ${snap.player.hp}/${snap.player.maxHp}`,
  );

  // TRV-03/THM-03: o selo rompe com um efeito de 400 ms e depois a imagem some. O `TweenManager` do Phaser anda pelo
  // relógio de parede (`Date.now()`), não pelos passos do `step`: a duração é medida em tempo real dentro da página,
  // quadro a quadro, com uma pausa curta entre os passos.
  assert(
    snap.area.sealed === false && snap.area.seal !== null,
    `TRV-03: o selo deveria estar rompendo: ${JSON.stringify(snap.area)}`,
  );
  const burn = await page.evaluate(async () => {
    const t0 = performance.now();
    const alphas = [];
    const times = [];
    for (;;) {
      window.__game.step(16);
      const s = window.__game.snapshot();
      if (s.area.seal === null || performance.now() - t0 > 2000) {
        return { ms: performance.now() - t0, alphas, times, module: s.area.modules[0], state: s.run.state };
      }
      alphas.push(s.area.seal.alpha);
      times.push(performance.now() - t0);
      await new Promise((resolve) => setTimeout(resolve, 4));
    }
  });
  assert(
    burn.alphas.every((a, i) => i === 0 || a <= burn.alphas[i - 1]) && burn.alphas.length > 5,
    `TRV-03: o selo deveria só esmaecer: ${JSON.stringify(burn.alphas)}`,
  );
  assert(
    burn.module === 'beco' && burn.state === 'traverse',
    `a área não deveria mudar ainda: ${JSON.stringify(burn)}`,
  );
  // Os primeiros ~100 ms do tween andam devagar no modo em passos (o `TweenManager` ainda alcança o relógio de parede);
  // por isso a duração sai da inclinação da parte linear (alpha de 0,8 a 0,1), que vale `duração = Δt / Δalpha`.
  const at = (limit) => burn.alphas.findIndex((a) => a <= limit);
  const from = at(0.8);
  const to = burn.alphas.length - 1;
  assert(
    from >= 0 && burn.alphas[to] <= 0.1,
    `TRV-03: o selo deveria chegar perto de 0: ${JSON.stringify(burn.alphas)}`,
  );
  const duration = (burn.times[to] - burn.times[from]) / (burn.alphas[from] - burn.alphas[to]);
  assert(duration >= 350 && duration <= 450, `TRV-03: o efeito do selo durou ${duration.toFixed(0)} ms (esperava 400)`);
  assert(burn.ms <= 800, `TRV-03: a imagem do selo deveria sumir ao fim do efeito: ${burn.ms.toFixed(0)} ms`);
  snap = await stepAndSnap(16);
  await page.keyboard.down('KeyD');

  // Cruza a saída (D segue apertada). Perto do fim do fade de saída tira 50 de vida (tecla 4): as curas vivas ainda
  // estão no chão e só a saída pode aplicá-las.
  let hurt = null;
  let last = snap;
  const events = [];
  for (let i = 0; i < 1200 && snap.area.modules[0] !== 'konbini'; i++) {
    if (hurt === null && snap.area.transitioning && snap.area.fade.out && snap.area.fade.alpha >= 0.8) {
      await page.keyboard.press('Digit4', { delay: 20 });
      snap = await stepAndSnap(16);
      hurt = snap;
    } else {
      snap = await stepAndSnap(16);
    }
    if (snap.area.modules[0] !== 'konbini') last = snap;
    events.push(...snap.events);
  }
  assert(snap.area.modules[0] === 'konbini', `a saída não levou à konbini: ${JSON.stringify(snap.area)}`);
  assert(
    hurt !== null && hurt.player.hp < hurt.player.maxHp,
    `o player deveria perder vida no fim do fade: ${hurt?.player.hp}`,
  );

  // TRV-07: hp final = min(maxHp, hp depois do dano + soma das curas que ainda estavam vivas nesse quadro).
  const alive = cure(hurt);
  const sum = alive.reduce((n, p) => n + p.value, 0);
  assert(
    alive.some((p) => p.kind === 'heal') && alive.some((p) => p.kind === 'elixir'),
    `TRV-07: as curas deveriam seguir no chão no fim do fade: ${JSON.stringify(hurt.pickups)} (último ${JSON.stringify(last.pickups)})`,
  );
  const expected = Math.min(snap.player.maxHp, hurt.player.hp + sum);
  assert(
    snap.player.hp === expected,
    `TRV-07: vida ${snap.player.hp} != min(${snap.player.maxHp}, ${hurt.player.hp} + ${sum}) = ${expected}`,
  );
  assert(snap.pickups.length === 0, `TRV-07: sobrou pickup depois da saída: ${JSON.stringify(snap.pickups)}`);
  const seen = [...new Set([...events, ...snap.events])];
  assert(
    seen.some((e) => e.startsWith('collect:heal:')) && seen.some((e) => e.startsWith('collect:elixir:')),
    `TRV-07: faltou a coleta de cura e do Elixir: ${JSON.stringify(seen.filter((e) => e.startsWith('collect:')))}`,
  );
}
