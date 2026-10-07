// Chefe punível no corpo a corpo (BFX-02/05/06/07/08/09/10), com `?debug&seed=1&round=5&enemyGuard=0&tech=vermelho`.
// O player atrai a investida até a parede da esquerda: fica à esquerda do chefe, a menos de 360 px (alcance da
// investida) da parede, e o chefe bate nela e entra em `stagger` por 1500 ms. No primeiro `stagger` nada bate no chefe
// (duração + J+K logo ao sair dele não faz nada); no segundo: golpe tira round(dano x 1,5), J+K tira 48 e um segundo J+K 0.
// O último cenário vence o chefe com o Vermelho equipado e confere o upgrade grátis e o banner.
const FRAME_MS = 1000 / 60;

export default async function ({ page, baseUrl, assert }) {
  const ready = () =>
    page.waitForFunction(
      () => {
        try {
          return typeof window.__game.snapshot === 'function';
        } catch {
          return false;
        }
      },
      { timeout: 15_000 },
    );
  const snap = (ms) =>
    page.evaluate((n) => {
      window.__game.step(n);
      return window.__game.snapshot();
    }, ms);
  /** Um único frame (`step(16)`; `step(16.7)` viraria dois). */
  const frame = () => snap(16);
  const boot = async (query) => {
    await page.goto(`${baseUrl}?debug&seed=1&round=5&enemyGuard=0${query ? `&${query}` : ''}`, { waitUntil: 'load' });
    await ready();
    await snap(20);
    await page.keyboard.press('KeyJ', { delay: 50 });
    const s = await snap(50);
    assert(
      s.run.state === 'roundActive' && s.run.round === 5 && s.boss !== null,
      `rodada do chefe esperada: ${JSON.stringify(s.run)}`,
    );
    return s;
  };

  // --- Motorista do player: teclas seguradas, um frame por chamada ------------------------------------------------------
  let heldKeys = new Set();
  const setKeys = async (keys) => {
    const next = new Set(keys);
    for (const k of heldKeys) if (!next.has(k)) await page.keyboard.up(k);
    for (const k of next) if (!heldKeys.has(k)) await page.keyboard.down(k);
    heldKeys = next;
  };
  const goTo = (s, x, tol = 5) => (s.player.x < x - tol ? 'KeyD' : s.player.x > x + tol ? 'KeyA' : null);
  const both = async () => {
    await setKeys([]);
    await page.keyboard.down('KeyJ');
    await page.keyboard.down('KeyK');
    const s = await frame();
    await page.keyboard.up('KeyK');
    await page.keyboard.up('KeyJ');
    return s;
  };
  const finishers = (s) => s.events.filter((e) => e === 'finisher:boss').length;
  /** Frames de jogo até o hitstop soltar (o congelamento não conta como tempo de jogo). */
  const unfreeze = async (s) => {
    let cur = s;
    for (let i = 0; i < 40 && cur.hitstop.frozen; i++) cur = await frame();
    return cur;
  };

  // O corpo do chefe empurra o player: se ele estiver no caminho da investida, fica entre o chefe e a parede e o chefe
  // não chega a tocá-la (nada de stagger). Por isso o player espera em cima da plataforma da linha 12 (x 256..416, topo em
  // y = 384; o chefe, com 56 px de altura, passa por baixo), à esquerda de onde o chefe pousou, e só desce quando a
  // investida já passou dele.
  const onPlatform = (s) => s.player.y < 390;

  /**
   * Joga até o primeiro frame em `stagger` da parede e devolve o snapshot dele. O chefe ataca em ciclo (investida,
   * salto). O player sobe na plataforma, fica em x=330 enquanto o salto vem (o chefe pousa embaixo dele), vai para
   * x=270 e, quando a investida seguinte (para a esquerda) passa do player, desce e corre até o chefe.
   */
  const lureToWall = async (s0, maxFrames = 6000) => {
    let s = s0;
    let last = null; // último ataque visto
    let jumpFrames = 0;
    for (let i = 0; i < maxFrames; i++) {
      if (s.boss.state === 'stagger') {
        await setKeys([]);
        return s;
      }
      assert(!s.player.dead, `o player morreu antes de o chefe bater na parede: ${JSON.stringify(s.run)}`);
      if (s.boss.attack) last = s.boss.attack;
      const keys = [];
      const chargeEnding = s.boss.state === 'charge' && s.boss.x < 170;
      if (chargeEnding) {
        // A investida passou do player (que está em cima da plataforma): desce pela esquerda e vai ao chefe.
        const dir = onPlatform(s) || s.player.x > s.boss.x + 34 ? 'KeyA' : null;
        if (dir) keys.push(dir);
      } else if (!onPlatform(s)) {
        // Sobe na plataforma: vai a x=235, pula segurando o ↑ e segue para a direita até pousar nela.
        if (jumpFrames > 0 || s.player.y < 440) {
          keys.push('ArrowUp', 'KeyD');
          jumpFrames = Math.max(0, jumpFrames - 1);
        } else {
          const dir = goTo(s, 235, 6);
          if (dir) keys.push(dir);
          else {
            jumpFrames = 16;
            keys.push('ArrowUp', 'KeyD');
          }
        }
      } else {
        let target = 330;
        if (s.boss.state !== 'leap' && s.boss.attack !== 'leap' && last === 'leap' && s.boss.x < 420) target = 270;
        if (s.boss.attack === 'charge' && s.boss.x < 420) target = 270;
        const dir = goTo(s, target, 6);
        if (dir) keys.push(dir);
      }
      await setKeys(keys);
      s = await frame();
    }
    throw new Error(`o chefe nunca bateu na parede: ${JSON.stringify(s.boss)} player x=${s.player.x}`);
  };

  // --- 1) Primeiro stagger: duração e J+K fora do stagger -----------------------------------------------------------------
  let s = await boot('tech=vermelho');
  assert(s.boss.maxHp === 400, `BFX-01: o chefe do tier 1 deveria ter 400 de HP: ${JSON.stringify(s.boss)}`);
  s = await lureToWall(s);
  assert(s.boss.attack === null || s.boss.state === 'stagger', 'o chefe deveria estar parado em stagger');
  assert(
    s.boss.finisherReady === true,
    `BFX-06: o stagger da parede deveria liberar o finalizador: ${JSON.stringify(s.boss)}`,
  );
  assert(s.boss.poise === 100, `BFX-02: bater na parede não mexe na postura: ${s.boss.poise}`);
  assert(s.boss.x < 120, `o chefe deveria estar encostado na parede da esquerda: x=${s.boss.x}`);

  // BFX-02: o stagger dura 1500 ms de jogo (±1 frame), sem contar os frames congelados pelo hitstop.
  let gameFrames = 0;
  let cur = s;
  for (let i = 0; i < 400 && cur.boss.state === 'stagger'; i++) {
    // Sem bater no chefe: só desce e se aproxima, para estar a <= 48 px quando o stagger acabar.
    const k = Math.abs(cur.boss.x - cur.player.x) > 36 ? goTo(cur, cur.boss.x + 30, 4) : null;
    await setKeys(k ? [k] : []);
    cur = await frame();
    if (cur.boss.state === 'stagger' && !cur.hitstop.frozen) gameFrames++;
  }
  assert(cur.boss.state !== 'stagger', 'o stagger da parede nunca terminou');
  await setKeys([]);
  const staggerMs = (gameFrames + 1) * FRAME_MS;
  assert(
    Math.abs(staggerMs - 1500) <= FRAME_MS * 1.5,
    `BFX-02: o stagger deveria durar ~1500 ms, mediu ${staggerMs.toFixed(0)} ms`,
  );

  // BFX-08: no frame em que o stagger acaba o chefe está em descanso; J+K a <= 48 px não tira nada pelo finalizador.
  const dxOut = Math.abs(cur.boss.x - cur.player.x);
  assert(dxOut <= 48, `pré-condição do BFX-08: o player deveria estar a <= 48 px do chefe (${dxOut.toFixed(1)})`);
  const hpOut = cur.boss.hp;
  const evOut = finishers(cur);
  cur = await both();
  for (let i = 0; i < 6; i++) cur = await frame();
  assert(
    cur.boss.state !== 'stagger',
    `pré-condição do BFX-08: o chefe já deveria estar fora do stagger: ${cur.boss.state}`,
  );
  assert(
    cur.boss.hp === hpOut && finishers(cur) === evOut,
    `BFX-08: J+K fora do stagger não deveria tirar HP: ${hpOut} -> ${cur.boss.hp} ${JSON.stringify(cur.events.slice(-3))}`,
  );

  // Contraste (BFX-05): um golpe forte de teste fora do stagger tira o dano cheio, 18.
  cur = await frame();
  const hpPlain = cur.boss.hp;
  await page.keyboard.down('Digit2');
  cur = await frame();
  await page.keyboard.up('Digit2');
  for (let i = 0; i < 3; i++) cur = await frame();
  assert(
    hpPlain - cur.boss.hp === 18,
    `BFX-05: o golpe forte fora do stagger deveria tirar 18: ${hpPlain} -> ${cur.boss.hp}`,
  );

  // --- 2) Segundo stagger: golpe x1,5, finalizador de 48 e segundo J+K sem efeito -------------------------------------------
  cur = await unfreeze(cur);
  cur = await lureToWall(cur);
  assert(
    cur.boss.finisherReady === true,
    `BFX-06: o segundo stagger deveria liberar o finalizador de novo: ${JSON.stringify(cur.boss)}`,
  );
  // Chega a <= 40 px do chefe (o player ainda está descendo da plataforma e correndo até ele).
  for (let i = 0; i < 120 && Math.abs(cur.boss.x - cur.player.x) > 40 && cur.boss.state === 'stagger'; i++) {
    const k = goTo(cur, cur.boss.x + 30, 4);
    await setKeys(k ? [k] : []);
    cur = await frame();
  }
  await setKeys([]);
  cur = await frame();
  assert(cur.boss.state === 'stagger', `o stagger acabou antes das ações: ${JSON.stringify(cur.boss)}`);
  assert(
    Math.abs(cur.boss.x - cur.player.x) <= 48,
    `o player deveria estar a <= 48 px do chefe: ${Math.abs(cur.boss.x - cur.player.x).toFixed(1)}`,
  );

  // BFX-05: o golpe forte de teste (18) em stagger tira round(18 x 1,5) = 27.
  const hpBeforeHit = cur.boss.hp;
  await page.keyboard.down('Digit2');
  cur = await frame();
  await page.keyboard.up('Digit2');
  for (let i = 0; i < 3; i++) cur = await frame();
  assert(
    hpBeforeHit - cur.boss.hp === Math.round(18 * 1.5),
    `BFX-05: em stagger o golpe deveria tirar round(18 x 1,5) = 27: ${hpBeforeHit} -> ${cur.boss.hp}`,
  );
  cur = await unfreeze(cur);
  assert(cur.boss.state === 'stagger', `o stagger acabou antes do finalizador: ${JSON.stringify(cur.boss)}`);
  assert(cur.boss.finisherReady === true, 'um golpe comum não deveria gastar o finalizador');

  // BFX-06: J+K a <= 48 px tira round(0,12 x 400) = 48, com um único `finisher:boss`.
  const hpBeforeFin = cur.boss.hp;
  const finBefore = finishers(cur);
  cur = await both();
  assert(finishers(cur) === finBefore + 1, `BFX-06: esperava um finisher:boss: ${JSON.stringify(cur.events)}`);
  assert(hpBeforeFin - cur.boss.hp === 48, `BFX-06: o finalizador deveria tirar 48: ${hpBeforeFin} -> ${cur.boss.hp}`);
  assert(cur.boss.finisherReady === false, 'BFX-07: depois do uso o finalizador não deveria estar pronto');

  // BFX-07: um segundo J+K no mesmo stagger não tira nada.
  cur = await unfreeze(cur);
  assert(cur.boss.state === 'stagger', `o stagger acabou antes do segundo J+K: ${JSON.stringify(cur.boss)}`);
  const hpAfterFin = cur.boss.hp;
  const finAfter = finishers(cur);
  cur = await both();
  for (let i = 0; i < 6; i++) cur = await frame();
  assert(
    cur.boss.hp === hpAfterFin && finishers(cur) === finAfter,
    `BFX-07: o segundo J+K não deveria tirar HP: ${hpAfterFin} -> ${cur.boss.hp}`,
  );

  // --- 3) Vitória com o Vermelho: upgrade grátis e banner (BFX-09/10) ---------------------------------------------------
  s = await boot('tech=vermelho');
  assert(
    s.tech.slots[0] && s.tech.slots[0].id === 'vermelho' && s.tech.slots[0].level === 1,
    `o Vermelho deveria começar no Nv1: ${JSON.stringify(s.tech.slots)}`,
  );
  const press = async (key, ms = 17) => {
    await page.keyboard.press(key, { delay: 50 });
    return snap(ms);
  };
  for (let i = 0; i < 200 && s.boss && !s.events.includes('bossDefeatedFx'); i++) {
    s = await press('Digit2', 17);
    if (s.events.includes('bossDefeatedFx')) break;
    s = await snap(80);
  }
  assert(s.events.includes('bossDefeatedFx'), `o chefe não morreu: ${JSON.stringify(s.boss)}`);
  assert(
    s.tech.slots[0].level === 2,
    `BFX-09: o Vermelho deveria subir para o Nv2: ${JSON.stringify(s.tech.slots[0])}`,
  );
  // BFX-10: o banner do upgrade ocupa os últimos 800 ms dos 2000 ms de "Chefe derrotado!".
  let banner = null;
  for (let i = 0; i < 200 && banner === null; i++) {
    s = await snap(50);
    if (s.hud.banner && /Nv 2!$/.test(s.hud.banner)) banner = s.hud.banner;
  }
  assert(
    banner !== null && /Vermelho Nv 2!$/.test(banner),
    `BFX-10: o banner do upgrade não apareceu: ${s.hud.banner}`,
  );
}
