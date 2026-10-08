import { type Brush, rng } from './brush';
import { speckle } from './paint';
import type { LayerArea } from './types';

/**
 * Céu da arena do chefe (ARN-01, ARN-02): o santuário fica dentro do Véu, a cúpula de energia que isola o duelo. O céu
 * escurece para o roxo nas bordas da cúpula, a lua aparece velada, e no horizonte só há montanhas e cedros: nada da
 * escola nem da cidade com janelas acesas.
 */

/**
 * A distante rola a 0,1: a câmera centrada no ponto de mundo X mostra no meio da tela o x `0,1 · X + 576` da camada
 * (`toLayerX`), quase parado entre 608 e 720 na arena. A cúpula e a lua ficam centradas aí.
 */
const VIEW_CX = 650;

/** Cúpula do Véu: arco em dither roxo de raio `rx` × `ry` acima do horizonte; por fora dele, preto. */
function veilDome(b: Brush, x0: number, x1: number, ground: number): void {
  const rx = 430;
  const ry = 200;
  for (let x = x0; x < x1; x += 2) {
    const t = Math.min(1, Math.abs(x - VIEW_CX) / rx);
    const y = Math.round((ground - Math.sqrt(1 - t * t) * ry) / 2) * 2;
    b.rect(x, -256, 2, Math.max(0, y + 256 - 10), 'k');
    b.rect(x, y - 10, 2, 4, 'v');
    b.rect(x, y - 6, 2, 2, (x / 2) % 2 === 0 ? 'U' : 'u');
    b.rect(x, y - 4, 2, 2, 'u');
    if ((x / 2) % 2 === 0) b.rect(x, y - 2, 2, 2, 'v');
    if ((x / 2) % 4 === 0) b.dot(x, y + 2, 'v');
  }
}

/** Lua atrás do Véu: disco apagado com faixas roxas passando na frente. */
function veiledMoon(b: Brush, mx: number, my: number): void {
  b.disc(mx, my, 34, 'E');
  b.disc(mx, my, 26, 'L');
  b.disc(mx + 4, my + 4, 12, 'i');
  b.dither(mx - 30, my - 6, 60, 4, 'v');
  b.dither(mx - 26, my + 8, 52, 4, 'v');
}

/** Cordilheira em degraus: picos sorteados, com a encosta da lua mais clara. */
function mountains(b: Brush, x0: number, x1: number, base: number, peak: number, seed: number): void {
  const rand = rng(seed);
  for (let x = x0 - 80; x < x1;) {
    const w = 120 + Math.floor(rand() * 4) * 30;
    const h = peak - Math.floor(rand() * 4) * 12;
    for (let row = 0; row < h; row += 4) {
      const half = Math.round((((h - row) / h) * (w / 2)) / 2) * 2;
      b.rect(x + w / 2 - half, base - row - 4, half * 2, 4, 'n');
      b.rect(x + w / 2 - half, base - row - 4, 4, 4, 'N');
    }
    x += w * 0.7;
  }
}

/** Fileira de cedros: troncos finos e copas pontudas em camadas. */
function cedars(b: Brush, x0: number, x1: number, base: number, seed: number): void {
  const rand = rng(seed);
  for (let x = x0; x < x1; x += 14 + Math.floor(rand() * 4) * 4) {
    const h = 30 + Math.floor(rand() * 5) * 6;
    for (let row = 0; row < h; row += 4) {
      const half = 2 + Math.floor((row / h) * 8) * 2 - (row % 12 === 8 ? 2 : 0);
      b.rect(x - half, base - h + row, half * 2, 4, 'K');
    }
  }
}

/** Camada distante da arena do chefe (ARN-01, ARN-02). */
export function veilSky(b: Brush, { x0, x1, ground, bottom }: LayerArea): void {
  const w = x1 - x0;
  // Dentro da cúpula: céu fundo no alto, médio no meio e um horizonte arroxeado, com faixas de dither.
  b.rect(x0, -256, w, 256 + 180, 'e');
  b.rect(x0, 180, w, 12, 'e');
  b.dither(x0, 180, w, 12, 'E');
  b.rect(x0, 192, w, 120, 'E');
  b.rect(x0, 312, w, 12, 'E');
  b.dither(x0, 312, w, 12, 'v');
  b.rect(x0, 324, w, bottom - 324, 'E');
  b.dither(x0, 340, w, ground - 340, 'v');
  speckle(b, x0, 100, w, 200, ['S', 'C', 'U'], 0.04, 1201, 6);
  veiledMoon(b, VIEW_CX + 150, 250);
  veilDome(b, x0, x1, ground);
  mountains(b, x0, x1, ground - 10, 90, 1203);
  b.rect(x0, ground - 12, w, bottom - ground + 12, 'n');
  cedars(b, x0, x1, ground - 2, 1205);
  b.rect(x0, ground - 4, w, bottom - ground + 4, 'K');
  // Partículas amaldiçoadas soltas dentro do Véu.
  speckle(b, x0, 40, w, ground - 80, ['u', 'v'], 0.02, 1207, 8);
}
