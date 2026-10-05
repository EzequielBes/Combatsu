// Finalizador e pisão (FIN-01 borda, FIN-03, FIN-04, AIR-03) com `?debug&seed=1&enemyGuard=0`. O inimigo quebra com três
// parries (35 x 3, teto 100; atordoado 1500 ms) e `finisher.distPx` do snapshot dá a distância viva até ele, a mesma que o
// finalizador usa: o jogador se afasta em passos de um frame até ficar a (40, 41] px (J+K não faz nada) e depois a <= 40 px
// (J+K faz: 40 de dano, `finisher:<id>`, zoom 1,7 em até 100 ms). Os valores vêm da spec.
import { makeKit } from './fight-kit.mjs';

const FRAME_MS = 1000 / 60;

export default async function (ctx) {
  const { assert, snap, frame, down, up, count, boot, nearest, approach, startDuel } = makeKit(ctx);
  const duel = async () => {
    await boot('enemyGuard=0');
    const d = { s: await startDuel(), f: 0 };
    d.step = async () => {
      d.s = await frame();
      d.f += 1;
      return d.s;
    };
    d.to = async (n) => {
      while (d.f < n) await d.step();
    };
    d.dist = () => Math.abs(nearest(d.s).x - d.s.player.x);
    await down('KeyD');
    for (let i = 0; i < 20 && d.dist() > 30; i++) await d.step();
    await up('KeyD');
    for (let i = 0; i < 6; i++) await d.step();
    assert(
      nearest(d.s).x > d.s.player.x && d.dist() < 30,
      `o inimigo deveria ficar à frente, colado: ${JSON.stringify({ p: d.s.player.x, e: nearest(d.s).x })}`,
    );
    return d;
  };
  const tapFrame = async (d, code) => {
    await down(code);
    await d.step();
    await up(code);
  };
  const until = async (d, pred, max, what) => {
    for (let i = 0; i < max && !pred(d.s); i++) await d.step();
    assert(
      pred(d.s),
      `${what}: não aconteceu em ${max} frames (hp=${d.s.player.hp}, events=${JSON.stringify(d.s.events.slice(-4))})`,
    );
    return d.s;
  };
  const gameFrames = async (d, n) => {
    for (let i = 0; i < n;) {
      await d.step();
      if (!d.s.hitstop.frozen) i++;
    }
  };
  const frozenRun = async (d) => {
    let n = 0;
    while (d.s.hitstop.frozen && n < 30) {
      n++;
      await d.step();
    }
    return n;
  };
  /** Três parries seguidos: devolve o duelo no frame do 3º, o inimigo quebrado à frente. */
  const breakEnemy = async () => {
    const d = await duel();
    await d.to(24);
    for (let i = 1; i <= 3; i++) {
      const before = count(d.s, 'parry');
      await tapFrame(d, 'KeyU');
      await until(d, (s) => count(s, 'parry') === before + 1, 40, `parry ${i}`);
      if (i < 3) await gameFrames(d, 48);
    }
    await frozenRun(d);
    assert(nearest(d.s).structure.broken, 'o inimigo deveria estar quebrado');
    return d;
  };

  const both = async (d) => {
    await down('KeyJ');
    await down('KeyK');
    await d.step();
    await up('KeyK');
    await up('KeyJ');
    return d.s;
  };
  const finishers = (s) => s.events.filter((e) => e.startsWith('finisher:')).length;

  // --- FIN-03: `both` com o inimigo ao lado, mas sem quebra, não faz nada --------------------------------------------------
  {
    await boot('enemyGuard=0');
    const s0 = await approach();
    assert(
      !nearest(s0).structure.broken && s0.finisher.distPx === null,
      `o inimigo não deveria estar quebrado: ${JSON.stringify(nearest(s0).structure)}`,
    );
    const d0 = { s: s0, step: async () => (d0.s = await frame()) };
    const hpE = nearest(s0).hp;
    const s1 = await both(d0);
    for (let i = 0; i < 12; i++) await d0.step();
    assert(
      finishers(d0.s) === 0 && nearest(d0.s).hp === hpE,
      `FIN-03: sem inimigo quebrado nada deveria acontecer: ${JSON.stringify(d0.s.events.slice(-3))} hp ${hpE} -> ${nearest(d0.s).hp}`,
    );
    assert(s1.camera.zoom === d0.s.camera.zoom, 'FIN-03: sem finalizador o zoom não muda');
  }

  // --- Inimigo quebrado: borda de 40 px (FIN-01/03) e zoom (FIN-04) -----------------------------------------------------------
  const d = await breakEnemy();
  // Afasta-se até ~34 px e então anda em toques de um frame (4 frames de pausa) até a distância cair em (40,41].
  await down('KeyA');
  while (d.s.finisher.distPx < 29) await d.step();
  await up('KeyA');
  for (let i = 0; i < 8; i++) await d.step();
  let tries = 0;
  while (!(d.s.finisher.distPx > 40.05 && d.s.finisher.distPx <= 40.95) && tries++ < 30) {
    const key = d.s.finisher.distPx <= 40.05 ? 'KeyA' : 'KeyD';
    await tapFrame(d, key);
    for (let i = 0; i < 2; i++) await d.step();
  }
  const edge = d.s.finisher.distPx;
  assert(edge > 40 && edge <= 41, `não achou a posição em (40, 41]: ${edge}`);
  assert(nearest(d.s).structure.broken, 'o inimigo precisa seguir quebrado');
  const hpEdge = nearest(d.s).hp;
  await both(d);
  for (let i = 0; i < 6; i++) await d.step();
  assert(
    finishers(d.s) === 0 && nearest(d.s).hp === hpEdge,
    `FIN-01: a ${edge.toFixed(2)} px (> 40) não deveria finalizar: ${JSON.stringify(d.s.events.slice(-3))}`,
  );
  // Aproxima até <= 40 px.
  tries = 0;
  while (!(d.s.finisher.distPx <= 40 && d.s.finisher.distPx > 36) && tries++ < 30) {
    const key = d.s.finisher.distPx <= 36 ? 'KeyA' : 'KeyD';
    await tapFrame(d, key);
    for (let i = 0; i < 2; i++) await d.step();
  }
  const inside = d.s.finisher.distPx;
  assert(inside <= 40 && inside > 36, `não achou a posição em (36, 40]: ${inside}`);
  assert(nearest(d.s).structure.broken, 'o inimigo precisa seguir quebrado');
  const victim = nearest(d.s);
  const zoom0 = d.s.camera.zoom;
  await both(d);
  assert(
    finishers(d.s) === 1 && count(d.s, `finisher:${victim.id}`) === 1,
    `FIN-01: a ${inside.toFixed(2)} px deveria finalizar: ${JSON.stringify(d.s.events.slice(-3))}`,
  );
  assert(victim.hp - d.s.enemies.find((e) => e.id === victim.id).hp === 40, 'FIN-01: 40 de dano');
  // FIN-04: o zoom da câmera principal chega a 1,7 em até 100 ms reais (6 frames de 16,7 ms) e não passa disso.
  assert(zoom0 < 1.7, `FIN-04: o zoom antes do finalizador deveria ser menor que 1,7: ${zoom0}`);
  let zoomFrames = 0;
  while (d.s.camera.zoom < 1.7 - 1e-6 && zoomFrames < 30) {
    await d.step();
    zoomFrames++;
  }
  assert(
    zoomFrames * FRAME_MS <= 100,
    `FIN-04: o zoom levou ${(zoomFrames * FRAME_MS).toFixed(0)} ms para chegar a 1,7, esperava <= 100`,
  );
  assert(Math.abs(d.s.camera.zoom - 1.7) <= 1e-6, `FIN-04: o zoom deveria parar em 1,7: ${d.s.camera.zoom}`);

  // --- AIR-03: heavy no ar com `S` segurado começa o `pisao` e a velocidade vertical vai à queda máxima (900 px/s) ----------------
  const airFrames = async (withStomp) => {
    await boot('enemyGuard=0');
    let s = await snap(60);
    // Só pula parado no chão: logo após o boot o jogador ainda pode estar caindo do spawn e o Space seria ignorado.
    for (let i = 0, prevY = NaN; i < 60; i++) {
      if (s.player.vy === 0 && s.player.y === prevY) break;
      prevY = s.player.y;
      s = await frame();
    }
    // Segura o Space até o topo: soltar cedo corta o pulo (salto curto) e o jogador mal sai do chão.
    await down('Space');
    for (let i = 0; i < 40 && !(s.player.vy >= 0 && s.player.y < 440); i++) s = await frame();
    await up('Space');
    const air = { y: s.player.y, vy: s.player.vy };
    if (!withStomp) {
      s = await frame();
      return { air, s };
    }
    await down('KeyS');
    await down('KeyK');
    s = await frame();
    await up('KeyK');
    await up('KeyS');
    return { air, s };
  };
  const free = await airFrames(false);
  assert(free.s.player.vy < 900, `AIR-03: sem o pisão a queda não chega a 900 px/s (vy ${free.s.player.vy})`);
  const stomp = await airFrames(true);
  assert(stomp.air.y < 440, `AIR-03: o jogador deveria estar no ar: y=${stomp.air.y}`);
  assert(stomp.s.player.move === 'pisao', `AIR-03: heavy no ar com S deveria começar o pisao: ${stomp.s.player.move}`);
  assert(
    stomp.s.player.vy === 900,
    `AIR-03: o pisao deveria levar a velocidade vertical a 900 px/s, veio ${stomp.s.player.vy}`,
  );
}
