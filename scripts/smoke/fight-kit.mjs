// Apoio dos smokes de luta (fight, defense, enemy-guard): boot com query, teclas e aproximação do inimigo.
// Não é um cenário (o runner só roda `*.smoke.mjs`). Toda tecla lida com `JustDown` fica segurada ao menos um passo.
export function makeKit({ page, baseUrl, assert }) {
  const snap = (ms) =>
    page.evaluate((n) => {
      window.__game.step(n);
      return window.__game.snapshot();
    }, ms);
  /** Um único frame (`step(16)`; `step(16.7)` viraria dois). */
  const frame = () => snap(16);
  const down = (code) => page.keyboard.down(code);
  const up = (code) => page.keyboard.up(code);
  const tap = async (code, holdMs = 50) => {
    await down(code);
    await snap(holdMs);
    await up(code);
    return snap(20);
  };
  const count = (snapshot, ev) => snapshot.events.filter((e) => e === ev).length;

  /**
   * Abre a página com a query, aguarda o harness e começa a rodada 1 com `J` no título. Os duelos precisam de um inimigo
   * isolado, então `maxAlive=1` é o padrão (SPN-06); a query pode trazer o seu próprio `maxAlive`. Sem `shove` na query
   * entra `shove=0`: quatro leves seguidos no mesmo inimigo sortearia o empurrão (RDG-16) e tornaria o cenário instável.
   */
  const boot = async (query) => {
    const q = query ?? '';
    const has = (name) => new RegExp(`(^|&)${name}=`).test(q);
    let full = q;
    if (!has('maxAlive')) full += `${full ? '&' : ''}maxAlive=1`;
    if (!has('shove')) full += `${full ? '&' : ''}shove=0`;
    await page.goto(`${baseUrl}?debug&seed=1&${full}`, { waitUntil: 'load' });
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
    await snap(20);
    await tap('KeyJ');
    const s = await snap(50);
    assert(s.run.state === 'roundActive', `run deveria começar: ${JSON.stringify(s.run)}`);
    return s;
  };

  const nearest = (s) =>
    s.enemies.filter((e) => e.state !== 'deadRagdoll' && e.state !== 'dissolving').sort((a, b) => Math.abs(a.x - s.player.x) - Math.abs(b.x - s.player.x))[0];

  /**
   * Anda rumo ao inimigo mais próximo até `|dx| < gap` (passos de um frame quando perto, para não passar dele), solta e
   * vira para ele; devolve o snapshot. O inimigo fica à frente do jogador, a menos de `gap + 20` px.
   */
  const approach = async (gap = 36) => {
    let s = await snap(20);
    for (let i = 0; i < 400; i++) {
      const t = nearest(s);
      const dx = t.x - s.player.x;
      if (Math.abs(dx) < gap) break;
      const dir = dx > 0 ? 'KeyD' : 'KeyA';
      await down(dir);
      s = await snap(Math.abs(dx) > 120 ? 50 : 16);
      await up(dir);
    }
    s = await snap(20);
    const t = nearest(s);
    const dir = t.x > s.player.x ? 'KeyD' : 'KeyA';
    if (s.player.facing !== (t.x > s.player.x ? 1 : -1)) {
      await down(dir);
      await snap(16);
      await up(dir);
      s = await snap(20);
    }
    const e = nearest(s);
    assert(
      s.player.facing === (e.x > s.player.x ? 1 : -1) && Math.abs(e.x - s.player.x) < gap + 20,
      `não encostou de frente no inimigo: ${JSON.stringify({ p: s.player.x, f: s.player.facing, e: s.enemies.map((x) => x.x) })}`,
    );
    return s;
  };

  /**
   * Leva o jogador a ~110 px do inimigo mais próximo (de frente) e espera ele chegar a menos de 40 px, o `attackRange`:
   * nesse frame (`f0`) a IA começa o preparo do golpe. O golpe abre a hitbox no update de `f0 + 27` e conecta no step de
   * `f0 + 28`. Devolve o snapshot de `f0` (o inimigo à frente); nenhum frame depois dele foi consumido.
   */
  const startDuel = async () => {
    let s = await approach(110);
    for (let i = 0; i < 200; i++) {
      s = await frame();
      const t = nearest(s);
      if (Math.abs(t.x - s.player.x) < 40) return s;
    }
    throw new Error(`o inimigo não chegou a 40 px: ${JSON.stringify(s.enemies.map((e) => e.x))}`);
  };

  /**
   * Passa frames até nenhum golpe ficar em curso, a guarda baixar e o jogador sair do atordoamento do golpe sofrido (o
   * inimigo comprometido não é mais interrompido pelo golpe, CMT-04: ele bate de volta, e o aperto seguinte se perderia).
   */
  const settle = async () => {
    let s = await snap(20);
    for (let i = 0; i < 100 && (s.player.move !== null || s.player.guard !== 'none' || s.player.frame.startsWith('hurt')); i++) s = await frame();
    return snap(60);
  };

  /**
   * Lê o frame atual e, se `pred` ainda não vale, passa um frame por vez até valer (no máximo `maxFrames`). Devolve o
   * snapshot em que `pred` valeu; falha com `what` se nunca vier. O frame em que vale não é consumido além dele.
   */
  const waitFor = async (pred, maxFrames = 120, what = 'a condição esperada') => {
    let s = await snap(0);
    for (let i = 0; i < maxFrames && !pred(s); i++) s = await frame();
    assert(pred(s), `${what}: não aconteceu em ${maxFrames} frames (${JSON.stringify({ hp: s.player.hp, move: s.player.move, ev: s.events.slice(-3), en: s.enemies.map((e) => [e.id, e.state, e.ai, e.committed]) })})`);
    return s;
  };

  /**
   * Espera o inimigo sair de `windup` e `attack` e o jogador sair do atordoamento (e do hitstop). O inimigo comprometido não é
   * mais cancelado pelo golpe (CMT-04) e bate de volta; um golpe dado a partir daqui, no descanso dele ou antes de um preparo
   * novo chegar ao ponto de compromisso (250 ms depois do começo), cancela o ataque como antes. Devolve o snapshot.
   */
  const waitQuiet = (maxFrames = 200) =>
    waitFor(
      (s) => !s.hitstop.frozen && !s.player.frame.startsWith('hurt') && s.enemies.every((e) => e.ai !== 'windup' && e.ai !== 'attack'),
      maxFrames,
      'o inimigo deveria sair do ataque',
    );

  /** Espera o inimigo mais perto ficar `committed` (200 ms ou menos de preparo pela frente, CMT-01); devolve o snapshot desse frame. */
  const waitCommit = (maxFrames = 200) =>
    waitFor((s) => nearest(s)?.committed === true, maxFrames, 'o inimigo mais perto deveria ficar committed');

  /** Vira o jogador para o inimigo mais perto com um toque de um frame na direção dele (como o fim do `approach`); devolve o snapshot. */
  const faceEnemy = async () => {
    let s = await snap(0);
    const e = nearest(s);
    const want = e.x > s.player.x ? 1 : -1;
    if (s.player.facing === want) return s;
    const dir = want === 1 ? 'KeyD' : 'KeyA';
    await down(dir);
    await frame();
    await up(dir);
    s = await snap(20);
    assert(s.player.facing === want, `o jogador deveria olhar para o inimigo: facing=${s.player.facing}, esperava ${want}`);
    return s;
  };

  return { snap, frame, down, up, tap, count, boot, nearest, approach, settle, startDuel, waitFor, waitQuiet, waitCommit, faceEnemy, assert };
}
