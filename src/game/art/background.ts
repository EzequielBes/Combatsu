import type Phaser from 'phaser';
import type { BossArchetype } from '../../core/bossTier';
import type { ModuleTheme } from '../../core/module';
import { Brush, clipX, type PaintSink } from './scenery/brush';
import { schoolFar, stonePillar } from './scenery/school';
import { farPainterFor, NEAR_COLORS, SCHOOL_SCENERY, THEME_SCENERY } from './scenery/index';
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
  variant: BossArchetype | null = null,
): Phaser.GameObjects.Graphics[] {
  const x0 = -128;
  const x1 = widthPx + 128;
  const bottom = heightPx + 256;
  const themed = spans !== undefined && spans.length > 0;
  const layers = PARALLAX.map((factor, i) => scene.add.graphics().setScrollFactor(factor, factor).setDepth(DEPTH[i]));
  const far = farPainterFor(spans ?? []);
  far(new Brush(layers[0]), { x0, x1, ground: GROUND[0], bottom, variant });
  let midVariant: BossArchetype | null = null;
  for (const layer of [1, 2] as const) {
    const bands = themed ? layerBands(spans, x0, x1, PARALLAX[layer]) : [{ x0, x1, theme: null }];
    const used = paintBands(layers[layer], bands, layer === 1 ? 'mid' : 'near', {
      ground: GROUND[layer],
      bottom,
      variant,
    });
    if (layer === 1) midVariant = used;
  }
  // O que cada camada recebeu fica no objeto, para o snapshot de debug conferir (THM-02, CEN-10, ARN-01, ARN-05).
  layers[0].setData('far', far === schoolFar ? 'school' : 'veil');
  layers[1].setData('variant', midVariant);
  layers[2].setData('bands', themed ? bandsFor(spans, x0, x1) : []);
  layers[1].setData('midBands', themed ? layerBands(spans, x0, x1, PARALLAX[1]).map((b) => ({ theme: b.theme })) : []);
  return layers;
}

/**
 * Pinta uma camada faixa a faixa com o pintor do tema de cada uma (`theme: null` é a escola da sala), recortado na
 * faixa (CEN-07); na camada próxima, cobre cada emenda com um pilar de pedra (CEN-02). Devolve a variante que os
 * pintores receberam (ARN-05), para o snapshot ler o que foi pintado e não o que foi pedido.
 */
export function paintBands(
  sink: PaintSink,
  bands: readonly { x0: number; x1: number; theme: ModuleTheme | null }[],
  which: 'mid' | 'near',
  { ground, bottom, variant = null }: { ground: number; bottom: number; variant?: BossArchetype | null },
): BossArchetype | null {
  for (const band of bands) {
    const scenery = band.theme === null ? SCHOOL_SCENERY : THEME_SCENERY[band.theme];
    scenery[which](new Brush(clipX(sink, band.x0, band.x1)), {
      x0: band.x0,
      x1: band.x1,
      ground,
      bottom,
      variant,
    });
  }
  // Só a camada próxima cobre a emenda: na média, um pilar de pedra entre prédios destoa.
  if (which === 'near') {
    const brush = new Brush(sink);
    for (const x of seams(bands)) stonePillar(brush, x, ground, bottom);
  }
  return variant;
}
