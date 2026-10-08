import { describe, expect, it } from 'vitest';
import { TILE } from '../../../src/core/level';
import { CANVAS_CX, layerBands, seams, toLayerX } from '../../../src/game/art/scenery/layers';

const SPANS = [
  { theme: 'beco' as const, col0: 1, col1: 20 },
  { theme: 'parque' as const, col0: 21, col1: 52 },
  { theme: 'rua' as const, col0: 53, col1: 93 },
];

/**
 * Modelo de câmera do Phaser: a camada de rolagem `f` desenha o ponto `x` na tela em `(x − f·scrollX − cx)·zoom + cx`,
 * com `cx` a meia largura do canvas; centrar a câmera no ponto de mundo X dá `scrollX = X − cx`.
 */
const screenX = (x: number, f: number, worldX: number, cx: number, zoom: number): number =>
  (x - f * (worldX - cx) - cx) * zoom + cx;

describe('conversão de mundo para camada (CEN-02, CEN-07)', () => {
  it.each([
    [0.3, 640, 2],
    [0.6, 640, 2],
    [1.15, 640, 2],
    [0.6, 480, 1.5],
  ])('fator %f, canvas de meia largura %i e zoom %f: o ponto convertido cai no centro da tela', (f, cx, zoom) => {
    for (const worldX of [672, 1344, 2900]) {
      expect(screenX(toLayerX(worldX, f, cx), f, worldX, cx, zoom)).toBeCloseTo(cx, 9);
    }
  });

  it('sem navegador (versão antiga) a meia largura do canvas é 480', () => {
    expect(CANVAS_CX).toBe(480);
  });
});

describe('faixas por camada de parallax (CEN-07, CEN-02)', () => {
  it.each([0.3, 0.6, 1.15])('no fator %f a fronteira é a emenda do módulo convertida (canvas HD)', (f) => {
    const bands = layerBands(SPANS, -128, 4000, f, 640);
    expect(bands.map((b) => b.theme)).toEqual(['beco', 'parque', 'rua']);
    expect(bands[0].x0).toBe(-128);
    expect(bands[2].x1).toBe(4000);
    expect(bands[0].x1).toBeCloseTo(toLayerX(21 * TILE, f, 640), 9);
    expect(bands[1].x0).toBe(bands[0].x1);
    expect(bands[1].x1).toBeCloseTo(toLayerX(53 * TILE, f, 640), 9);
    expect(bands[2].x0).toBe(bands[1].x1);
  });

  it('toLayerX no fator 1 é a própria coordenada de mundo', () => {
    expect(toLayerX(777, 1)).toBe(777);
  });

  it('seams devolve as fronteiras internas; um trecho só não tem fronteira', () => {
    const bands = layerBands(SPANS, -128, 4000, 0.6);
    expect(seams(bands)).toEqual([bands[0].x1, bands[1].x1]);
    expect(seams(layerBands([SPANS[0]], -128, 4000, 0.6))).toEqual([]);
  });
});
