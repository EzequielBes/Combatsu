import type { Brush, Key } from './brush';
import { rng } from './brush';
import type { LayerArea, LayerPainter } from './types';

/** Cores do muro baixo da camada próxima: `wall` é a base e `top` a linha acesa (THM-02). */
export interface NearColors {
  wall: Key;
  top: Key;
}

/** Camada média da escola (ENV-02): alas com telhado de beiral, árvores e postes acesos. */
export function schoolMid(b: Brush, { x0, x1, ground, bottom }: LayerArea): void {
  // Base contínua (muro baixo do pátio) para nunca aparecer céu embaixo.
  b.rect(x0, ground - 20, x1 - x0, bottom - ground + 20, 'K');

  const rand = rng(31);
  let x = x0;
  let n = 0;
  while (x < x1) {
    const kind = n % 3;
    if (kind === 0) {
      // Ala da escola com telhado de beiral.
      const w = 160 + Math.floor(rand() * 3) * 32;
      const top = ground - 70;
      b.rect(x, top, w, bottom - top, 'K');
      // Telhado: beiral saliente, duas águas em degraus, cumeeira acesa pela lua.
      b.rect(x - 10, top - 6, w + 20, 6, 'k');
      b.rect(x - 12, top - 4, 4, 4, 'k');
      b.rect(x + w + 8, top - 4, 4, 4, 'k');
      for (let i = 1; i <= 5; i++) b.rect(x - 8 + i * 8, top - 6 - i * 4, w + 16 - i * 16, 4, 'k');
      b.rect(x + 32, top - 30, w - 64, 2, 'n');
      for (let wy = top + 12; wy < ground - 14; wy += 20) {
        for (let wx = x + 12; wx < x + w - 16; wx += 20) {
          const r = rand();
          b.rect(wx, wy, 10, 10, r < 0.2 ? 'A' : r < 0.35 ? 'a' : 'k');
          b.rect(wx + 4, wy, 2, 10, 'K');
        }
      }
      x += w + 40;
    } else if (kind === 1) {
      // Árvore: copa em discos, tronco fino, borda de cima acesa.
      const cx = x + 40;
      const top = ground - 90 - Math.floor(rand() * 3) * 10;
      b.rect(cx - 3, top + 40, 6, ground - top - 40, 'K');
      b.disc(cx, top + 30, 28, 'K');
      b.disc(cx - 22, top + 42, 20, 'K');
      b.disc(cx + 22, top + 44, 18, 'K');
      b.disc(cx - 4, top + 20, 18, 'K');
      for (let i = -12; i <= 8; i += 4) b.dot(cx + i, top + 3 + Math.abs(i) / 2, 'n');
      x += 110;
    } else {
      // Poste aceso com um halo pequeno.
      const px = x + 20;
      const top = ground - 110;
      b.disc(px + 8, top + 4, 14, 'n');
      b.rect(px - 2, top, 4, ground - top, 'k');
      b.rect(px - 2, top - 2, 14, 4, 'k');
      b.rect(px + 4, top + 2, 8, 4, 'A');
      b.rect(px + 6, top + 2, 4, 2, 'w');
      x += 80;
    }
    n++;
  }
}

/**
 * Camada próxima da escola (ENV-02): muro baixo na cor `colors`, gradil e pilares de pedra. Com as cores de cada tema
 * é o muro chapado da F18, que os pintores por tema substituem (CEN-01).
 */
export function schoolNear(colors: NearColors): LayerPainter {
  return (b, { x0, x1, ground, bottom }) => {
    // Tons médios (E/f), nunca o preto do contorno: os personagens passam na frente desta camada e o contorno
    // deles (k) precisa se destacar dela.
    // Muro baixo de pedra.
    b.rect(x0, ground - 36, x1 - x0, bottom - ground + 36, colors.wall);
    b.rect(x0, ground - 36, x1 - x0, 2, colors.top);
    // Gradil: dois trilhos e barras finas.
    const railTop = ground - 76;
    b.rect(x0, railTop, x1 - x0, 4, 'K');
    b.rect(x0, railTop, x1 - x0, 2, 'n');
    b.rect(x0, railTop + 24, x1 - x0, 4, 'K');
    for (let x = x0; x < x1; x += 12) {
      b.rect(x, railTop - 6, 2, 40, 'K');
      b.dot(x, railTop - 8, 'n');
    }
    // Pilares de pedra com capitel.
    for (let x = x0 + 40; x < x1; x += 208) {
      const top = ground - 110;
      b.rect(x, top, 20, bottom - top, 'K');
      b.rect(x + 2, top + 6, 16, ground - top - 42, 'E');
      b.rect(x + 2, top + 6, 2, ground - top - 42, 'f');
      b.rect(x - 4, top - 4, 28, 10, 'K');
      b.rect(x - 4, top - 4, 28, 2, 'f');
      b.rect(x + 2, top - 10, 16, 6, 'K');
      b.rect(x + 4, top - 10, 12, 2, 'n');
    }
  };
}
