import { type Brush, rng } from './brush';
import { hashSeed, speckle } from './paint';
import { veilSky } from './santuarioSky';
import { schoolMid } from './school';
import type { LayerArea, ThemeScenery } from './types';

/**
 * Santuário (CEN-01): na próxima, muro de pedra irregular (ishigaki) com a cobertura de telhas de barro escuras e
 * lanternas de pedra (tōrō) acesas na frente, no lugar do muro marrom chapado da F18. A média continua a da escola
 * até a F23 (`arena-do-santuario`).
 */

/** Altura do muro acima do chão da camada. */
const WALL_H = 56;

/** Pedras de alturas e larguras sorteadas, fiada a fiada, com junta escura e a aresta de cima acesa. */
function stones(b: Brush, x0: number, x1: number, top: number, bottom: number): void {
  const rand = rng(hashSeed(x0 + 701));
  for (let y = top; y < bottom;) {
    const h = 8 + Math.floor(rand() * 3) * 2;
    for (let x = x0 - Math.floor(rand() * 8) * 2; x < x1;) {
      const w = 14 + Math.floor(rand() * 7) * 2;
      b.rect(x, y, w, h, rand() < 0.35 ? 'n' : 'N');
      b.rect(x, y, w - 2, 2, rand() < 0.2 ? 'S' : 's');
      b.rect(x + w - 2, y, 2, h, 'K');
      x += w;
    }
    b.rect(x0, y + h - 2, x1 - x0, 2, 'K');
    y += h;
  }
}

/** Cobertura de telhas: faixa escura com as pontas das telhas arredondadas e a cumeeira acesa pela lua. */
function roofCap(b: Brush, x0: number, x1: number, top: number): void {
  b.rect(x0, top - 10, x1 - x0, 10, 'K');
  b.rect(x0, top - 10, x1 - x0, 2, 'N');
  for (let x = x0; x < x1; x += 6) {
    b.rect(x, top - 2, 4, 2, 'n');
    b.dot(x + 4, top - 6, 'n');
  }
}

/** Lanterna de pedra: base, haste, caixa de fogo acesa, telhadinho e a joia no topo. */
function lantern(b: Brush, cx: number, ground: number): void {
  b.rect(cx - 12, ground - 6, 24, 36, 's');
  b.rect(cx - 12, ground - 6, 24, 2, 'S');
  b.rect(cx - 5, ground - 40, 10, 34, 's');
  b.rect(cx - 5, ground - 40, 2, 34, 'S');
  b.rect(cx - 10, ground - 46, 20, 6, 'N');
  b.rect(cx - 8, ground - 62, 16, 16, 's');
  b.rect(cx - 5, ground - 59, 10, 10, 'a');
  b.rect(cx - 3, ground - 57, 6, 6, 'A');
  b.rect(cx - 1, ground - 55, 2, 2, 'w');
  b.rect(cx - 14, ground - 68, 28, 6, 'n');
  b.rect(cx - 10, ground - 72, 20, 4, 'n');
  b.rect(cx - 14, ground - 68, 28, 2, 'N');
  b.rect(cx - 2, ground - 78, 4, 6, 's');
}

function near(b: Brush, { x0, x1, ground, bottom }: LayerArea): void {
  const top = ground - WALL_H;
  stones(b, x0, x1, top, bottom);
  speckle(b, x0, top, x1 - x0, bottom - top, ['n', 'g'], 0.08, 703);
  roofCap(b, x0, x1, top);
  b.dither(x0, ground - 8, x1 - x0, 8, 'n');
  for (let x = x0 + 70; x < x1; x += 220) lantern(b, x, ground);
}

export const SANTUARIO_SCENERY: ThemeScenery = { far: veilSky, mid: schoolMid, near };
