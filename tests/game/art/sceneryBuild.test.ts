import { describe, expect, it } from 'vitest';
import type Phaser from 'phaser';
import { buildBackground } from '../../../src/game/art/background';
import { Brush, clipX } from '../../../src/game/art/scenery/brush';
import { veilSky } from '../../../src/game/art/scenery/santuarioSky';
import { santuarioMid } from '../../../src/game/art/scenery/santuarioMid';
import { schoolFar } from '../../../src/game/art/scenery/school';
import type { BossArchetype } from '../../../src/core/bossTier';
import { RasterSink } from './sceneryRaster';

/** `Graphics` falso: grava os texels como o `RasterSink` e aceita as chamadas de montagem do `buildBackground`. */
class FakeGraphics extends RasterSink {
  setScrollFactor(): this {
    return this;
  }
  setDepth(): this {
    return this;
  }
  setData(): this {
    return this;
  }
}

/** Monta o fundo de verdade numa cena falsa e devolve os rasters das três camadas. */
function build(spans: { theme: 'santuario' | 'rua'; col0: number; col1: number }[], variant: BossArchetype | null) {
  const scene = { add: { graphics: () => new FakeGraphics() } } as unknown as Phaser.Scene;
  return buildBackground(scene, W, H, spans, variant) as unknown as FakeGraphics[];
}

/** Área baixa e larga o bastante para pegar o santuário (x ≈ 680 na média): o teste roda rápido. */
const W = 900;
const H = 200;
/** Mesma faixa que o `buildBackground` usa (x de −128 a largura + 128; fundo a altura + 256). */
const AREA = { x0: -128, x1: W + 128, bottom: H + 256 };
const ARENA = [{ theme: 'santuario' as const, col0: 1, col1: 26 }];

/** Pinta direto; a média passa pelo recorte da faixa (como no `paintBands`), a distante não. */
function direct(
  paint: (b: Brush, a: never) => void,
  ground: number,
  variant: BossArchetype | null,
  clip: boolean,
): RasterSink {
  const sink = new RasterSink();
  paint(new Brush(clip ? clipX(sink, AREA.x0, AREA.x1) : sink), { ...AREA, ground, variant } as never);
  return sink;
}

describe('fundo da arena montado de verdade (ARN-01, ARN-04, ARN-05)', () => {
  it('a camada distante da arena é o céu do Véu', () => {
    const [far] = build(ARENA, 'oni');
    expect([...far.texels]).toEqual([...direct(veilSky, 400, 'oni', false).texels]);
  });

  it.each(['oni', 'tecela'] as const)('a camada média da arena é o santuário com a variante %s', (variant) => {
    const [, mid] = build(ARENA, variant);
    expect([...mid.texels]).toEqual([...direct(santuarioMid, 420, variant, true).texels]);
  });

  it('as médias do Oni e da Tecelã montadas são diferentes', () => {
    const oni = JSON.stringify([...build(ARENA, 'oni')[1].texels]);
    const tecela = JSON.stringify([...build(ARENA, 'tecela')[1].texels]);
    expect(oni).not.toBe(tecela);
  });

  it('fora da arena (rua) a camada distante é a escola', () => {
    const [far] = build([{ theme: 'rua', col0: 1, col1: 26 }], null);
    expect([...far.texels]).toEqual([...direct(schoolFar, 400, null, false).texels]);
  });
});
