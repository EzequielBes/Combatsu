import { describe, expect, it } from 'vitest';
import { colorsFor, DAMAGE_KIND_PRIORITY } from '../../src/core/damageNumber';
import { DAMAGE_NUMBER_FEEL } from '../../src/data/feel';
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
