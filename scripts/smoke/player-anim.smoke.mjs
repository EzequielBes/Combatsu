// Animação do player no pulo (SPR-11, SPR-13) com `?debug&seed=1&enemyGuard=0`: no ápice aparece `apex-*`, no pouso
// `land-*` por até 120 ms (LAND_MS) e depois `idle-*`. O segundo pulo prova que `landMs` volta a 0 a cada pouso.
import { makeKit } from './fight-kit.mjs';

export default async function (ctx) {
  const { assert, snap, tap, boot, settle } = makeKit(ctx);
  await boot('enemyGuard=0');
  await settle();
  const STEP = 16;
  const LAND_MS = 120;

  /** Pula (W) e segue em passos de um frame até voltar ao chão e assentar; devolve a linha do tempo. */
  const jumpOnce = async () => {
    await tap('KeyW', 50);
    const trail = [];
    let s = await snap(STEP);
    for (let i = 0; i < 200; i++) {
      trail.push({ frame: s.player.frame, vy: s.player.vy, y: s.player.y });
      s = await snap(STEP);
      if (i > 20 && trail.length > 12 && trail.slice(-12).every((t) => t.frame.startsWith('idle-'))) break;
    }
    return trail;
  };

  for (const round of [1, 2]) {
    const trail = await jumpOnce();
    const names = trail.map((t) => t.frame);
    const where = `pulo ${round}: ${names.join(',')}`;

    // SPR-11: no ápice (|vy| < 60) o frame é apex-0.
    const apex = trail.filter((t) => t.frame === 'apex-0');
    assert(apex.length > 0, `SPR-11: nenhum apex-0 no topo. ${where}`);
    assert(apex.every((t) => Math.abs(t.vy) < 60), `SPR-11: apex-0 com |vy| >= 60: ${JSON.stringify(apex)}`);

    // SPR-13: o pouso mostra land-* por até 120 ms e só então idle-*.
    const firstLand = names.findIndex((n) => n.startsWith('land-'));
    assert(firstLand > 0, `SPR-13: nenhum frame land-* depois do pulo. ${where}`);
    let lastLand = firstLand;
    while (names[lastLand + 1]?.startsWith('land-')) lastLand++;
    const landSteps = lastLand - firstLand + 1;
    assert(landSteps * STEP <= LAND_MS + 2 * STEP, `SPR-13: land-* durou ${landSteps} passos (> ${LAND_MS} ms). ${where}`);
    assert(names[lastLand + 1]?.startsWith('idle-'), `SPR-13: depois do land veio ${names[lastLand + 1]} em vez de idle-*. ${where}`);
    assert(names.slice(0, firstLand).some((n) => n.startsWith('fall-')), `queda sem fall-* antes do pouso. ${where}`);
  }
}
