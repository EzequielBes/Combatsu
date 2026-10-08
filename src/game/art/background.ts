import type Phaser from 'phaser';
import type { ModuleTheme } from '../../core/module';
import { Brush, clipX, rng, type PaintSink } from './scenery/brush';
import { stonePillar } from './scenery/school';
import { NEAR_COLORS, SCHOOL_SCENERY, THEME_SCENERY } from './scenery/index';
import type { LayerArea } from './scenery/types';
import { layerBands, seams, type ThemeSpan } from './scenery/layers';

export type { ThemeSpan } from './scenery/layers';
export { NEAR_COLORS } from './scenery/index';

/** Fatores de rolagem das três camadas de fundo (ENV-02): distante, média e próxima. */
export const PARALLAX = [0.1, 0.3, 0.6] as const;

/** Profundidade das camadas: todas atrás do terreno (profundidade 0). */
const DEPTH = [-30, -20, -10];

/**
 * Linha do "chão" de cada camada, em coordenadas da própria camada. Com a câmera no chão da sala (zoom 1,5), o
 * piso cobre a base de cada camada; tudo abaixo dessa linha é preenchido até o fim para nunca abrir buraco.
 */
const GROUND = [400, 420, 450];

/** Faixa de cor da camada próxima: de `x0` a `x1` na coordenada da própria camada. */
export interface Band {
  x0: number;
  x1: number;
  wall: string;
  top: string;
}

/** Faixas da camada próxima com as cores do tema de cada trecho (THM-02): `layerBands` no fator da próxima. */
export function bandsFor(spans: readonly ThemeSpan[], x0: number, x1: number): Band[] {
  return layerBands(spans, x0, x1, PARALLAX[2]).map((b) => ({ x0: b.x0, x1: b.x1, ...NEAR_COLORS[b.theme] }));
}

/**
 * Fundo da escola à noite em três camadas de parallax (ENV-02), desenhado com Graphics só com cores da paleta:
 * - distante (0,1): céu em faixas com dither, estrelas, lua com halo e a silhueta do prédio principal com a torre;
 * - média (0,3): alas da escola com telhado de beiral, árvores e postes acesos;
 * - próxima (0,6): muro de pilares de pedra com gradil.
 * Com `spans` (THM-02) a camada próxima ganha a cor do tema de cada módulo; sem eles (a sala) sai a de sempre.
 * Devolve as camadas na ordem de PARALLAX.
 */
export function buildBackground(
  scene: Phaser.Scene,
  widthPx: number,
  heightPx: number,
  spans?: readonly ThemeSpan[],
): Phaser.GameObjects.Graphics[] {
  const x0 = -128;
  const x1 = widthPx + 128;
  const bottom = heightPx + 256;
  const themed = spans !== undefined && spans.length > 0;
  const layers = PARALLAX.map((factor, i) => scene.add.graphics().setScrollFactor(factor, factor).setDepth(DEPTH[i]));
  paintFar(new Brush(layers[0]), { x0, x1, ground: GROUND[0], bottom });
  for (const layer of [1, 2] as const) {
    const bands = themed ? layerBands(spans, x0, x1, PARALLAX[layer]) : [{ x0, x1, theme: null }];
    paintBands(layers[layer], bands, layer === 1 ? 'mid' : 'near', { ground: GROUND[layer], bottom });
  }
  // As faixas pintadas ficam no objeto, para o snapshot de debug conferir o tema (THM-02, CEN-10).
  layers[2].setData('bands', themed ? bandsFor(spans, x0, x1) : []);
  layers[1].setData('midBands', themed ? layerBands(spans, x0, x1, PARALLAX[1]).map((b) => ({ theme: b.theme })) : []);
  return layers;
}

/**
 * Pinta uma camada faixa a faixa com o pintor do tema de cada uma (`theme: null` é a escola da sala), recortado na
 * faixa (CEN-07); na camada próxima, cobre cada emenda com um pilar de pedra (CEN-02).
 */
export function paintBands(
  sink: PaintSink,
  bands: readonly { x0: number; x1: number; theme: ModuleTheme | null }[],
  which: 'mid' | 'near',
  { ground, bottom }: { ground: number; bottom: number },
): void {
  for (const band of bands) {
    const scenery = band.theme === null ? SCHOOL_SCENERY : THEME_SCENERY[band.theme];
    scenery[which](new Brush(clipX(sink, band.x0, band.x1)), { x0: band.x0, x1: band.x1, ground, bottom });
  }
  // Só a camada próxima cobre a emenda: na média, um pilar de pedra entre prédios destoa.
  if (which !== 'near') return;
  const brush = new Brush(sink);
  for (const x of seams(bands)) stonePillar(brush, x, ground, bottom);
}

function paintFar(b: Brush, { x0, x1, ground, bottom }: LayerArea): void {
  const w = x1 - x0;
  // Céu: topo profundo, meio e horizonte, com faixas de dither entre eles.
  b.rect(x0, -256, w, 256 + 150, 'e');
  // O dither pinta só metade dos texels: a faixa precisa de base sólida, senão aparece o fundo do canvas (ART-01).
  b.rect(x0, 150, w, 12, 'e');
  b.dither(x0, 150, w, 12, 'E');
  b.rect(x0, 162, w, 78, 'E');
  b.rect(x0, 240, w, 12, 'E');
  b.dither(x0, 240, w, 12, 'f');
  b.rect(x0, 252, w, bottom - 252, 'f');

  // Estrelas: a maioria discreta, algumas brilhantes em cruz.
  const rand = rng(7);
  for (let i = 0; i < 110; i++) {
    const x = x0 + rand() * w;
    const y = rand() * 240;
    const r = rand();
    b.dot(x, y, r < 0.7 ? 'S' : r < 0.9 ? 'C' : 'w');
  }
  for (let i = 0; i < 8; i++) {
    const x = x0 + rand() * w;
    const y = 10 + rand() * 180;
    b.dot(x, y, 'w');
    for (const [dx, dy] of [
      [-2, 0],
      [2, 0],
      [0, -2],
      [0, 2],
    ])
      b.dot(x + dx, y + dy, 'S');
  }

  // Lua com halo.
  const mx = 600;
  const my = 140;
  b.disc(mx, my, 44, 'E');
  b.disc(mx, my, 36, 'f');
  b.disc(mx, my, 28, 'N');
  b.disc(mx, my, 20, 'l');
  b.disc(mx + 6, my + 6, 16, 'l');
  // Sombra do terminador (lado de baixo à direita) e crateras.
  for (let dy = -18; dy <= 18; dy += 2) {
    const half = Math.floor(Math.sqrt(20 * 20 - dy * dy) / 2) * 2;
    b.rect(mx + half - 4, my + dy, 4, 2, 'L');
  }
  b.disc(mx - 6, my - 6, 4, 'L');
  b.disc(mx + 6, my + 4, 2, 'L');
  b.disc(mx - 2, my + 10, 2, 'L');
  b.dot(mx - 10, my - 12, 'w');
  b.dot(mx - 12, my - 10, 'w');

  // Cidade ao longe: blocos baixos com algumas janelas.
  const city = rng(11);
  for (let x = x0; x < x1;) {
    const bw = 40 + Math.floor(city() * 5) * 12;
    const top = ground - 50 - Math.floor(city() * 6) * 10;
    b.rect(x, top, bw, bottom - top, 'E');
    for (let wy = top + 8; wy < ground - 6; wy += 10) {
      for (let wx = x + 6; wx < x + bw - 6; wx += 8) if (city() < 0.12) b.dot(wx, wy, 'a');
    }
    x += bw + 4;
  }

  // Prédio principal da escola com a torre do relógio.
  const sx = 300;
  const sw = 560;
  const st = ground - 90;
  b.rect(sx, st, sw, bottom - st, 'n');
  b.rect(sx - 4, st - 4, sw + 8, 4, 'N'); // beiral do telhado com a luz da lua
  const win = rng(23);
  for (let wy = st + 12; wy < ground - 10; wy += 18) {
    for (let wx = sx + 12; wx < sx + sw - 12; wx += 16) {
      b.rect(wx, wy, 6, 8, win() < 0.18 ? 'a' : 'K');
    }
  }
  const tx = sx + sw / 2 - 24;
  const tt = st - 70;
  b.rect(tx, tt, 48, st - tt, 'n');
  b.rect(tx - 4, tt - 4, 56, 4, 'N');
  b.rect(tx + 8, tt - 24, 32, 20, 'n');
  b.rect(tx + 14, tt - 34, 20, 10, 'n');
  b.rect(tx + 22, tt - 44, 4, 10, 'K');
  b.disc(tx + 24, tt + 22, 10, 'L');
  b.disc(tx + 24, tt + 22, 8, 'l');
  b.rect(tx + 24, tt + 14, 2, 8, 'k');
  b.rect(tx + 24, tt + 22, 6, 2, 'k');
}
