import { describe, expect, it } from 'vitest';
import { colorsFor, DAMAGE_KIND_PRIORITY } from '../../src/core/damageNumber';
import { CAMERA_FEEL, DAMAGE_NUMBER_FEEL, POWER_FEEL } from '../../src/data/feel';
import { HITSTOP_MS } from '../../src/data/fx';
import { PALETTE } from '../../src/game/art/palette';

describe('números de dano: dados (POW-05)', () => {
  it.each(DAMAGE_KIND_PRIORITY)('as cores de %s existem na PALETTE', (kind) => {
    const { fill, outline } = colorsFor(kind);
    expect(PALETTE[fill]).toBeTypeOf('number');
    expect(PALETTE[outline]).toBeTypeOf('number');
  });

  it('cobre os seis tipos', () => {
    expect([...DAMAGE_KIND_PRIORITY].sort()).toEqual(['chip', 'crit', 'kokusen', 'micro', 'strike', 'tech']);
  });

  it('vida 700 ms, sobe 18 px, fusão 300 ms, teto 12, pop 1,6 em 120 ms', () => {
    expect(DAMAGE_NUMBER_FEEL.lifeMs).toBe(700);
    expect(DAMAGE_NUMBER_FEEL.risePx).toBe(18);
    expect(DAMAGE_NUMBER_FEEL.mergeMs).toBe(300);
    expect(DAMAGE_NUMBER_FEEL.cap).toBe(12);
    expect(DAMAGE_NUMBER_FEEL.popScale).toBe(1.6);
    expect(DAMAGE_NUMBER_FEEL.popMs).toBe(120);
  });
});

describe('força: dados (POW-07 a POW-10)', () => {
  it('toda chave de tom existe na PALETTE (POW-09)', () => {
    expect(POWER_FEEL.tones).toHaveLength(4);
    for (const tone of POWER_FEEL.tones) {
      for (const key of Object.values(tone)) expect(PALETTE[key], key).toBeTypeOf('number');
    }
  });

  it('a base não muda: HITSTOP_MS 50/90 e tranco padrão 4 px (POW-08.10)', () => {
    expect(HITSTOP_MS).toEqual({ light: 50, heavy: 90 });
    expect(CAMERA_FEEL.kickPx).toBe(4);
  });

  it('teto de 10 pontos, patamares em 2, 5 e 8 e aura 0,3/0,6', () => {
    expect(POWER_FEEL.capPoints).toBe(10);
    expect(POWER_FEEL.tierFrom).toEqual([2, 5, 8]);
    expect(POWER_FEEL.auraPower).toEqual({ embers: 0.3, flame: 0.6 });
  });

  it('a mão da aura é o punho medido no idle, espelhado em volta do pé (POW-10.13)', () => {
    expect(POWER_FEEL.handOffset[1]).toEqual({ x: 13, y: -17 });
    expect(POWER_FEEL.handOffset[-1]).toEqual({ x: -13, y: -17 });
  });
});
