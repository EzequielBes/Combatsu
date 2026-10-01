import { describe, expect, it } from 'vitest';
import { pickHitReaction, REACTION_DURATIONS, type HitReaction } from '../../src/core/hitReaction';

const light = (moveName?: string) => ({ strength: 'light' as const, moveName });
const heavy = (moveName?: string) => ({ strength: 'heavy' as const, moveName });

describe('pickHitReaction (HRX-01)', () => {
  it('golpe forte sempre dá impact, mesmo com nome de corpo ou de uppercut', () => {
    expect(pickHitReaction(heavy(), null)).toBe('impact');
    expect(pickHitReaction(heavy('chuteFrontal'), null)).toBe('impact');
    expect(pickHitReaction(heavy('gancho'), 'head-a')).toBe('impact');
    expect(pickHitReaction(heavy('cotovelada'), 'body')).toBe('impact');
  });

  it.each(['socoBaixo', 'rasteira', 'cotovelada', 'joelhada', 'chuteFrontal', 'chuteEmpurrao'])(
    '%s (leve) dá body',
    (name) => {
      expect(pickHitReaction(light(name), null)).toBe('body');
      expect(pickHitReaction(light(name), 'head-a')).toBe('body');
    },
  );

  it.each(['gancho', 'ganchoAscendente', 'chuteAlto'])('%s (leve) dá uppercut', (name) => {
    expect(pickHitReaction(light(name), null)).toBe('uppercut');
    expect(pickHitReaction(light(name), 'head-b')).toBe('uppercut');
  });

  it('o resto alterna cabeça-a e cabeça-b', () => {
    expect(pickHitReaction(light('jab'), null)).toBe('head-a');
    expect(pickHitReaction(light('jab'), 'head-a')).toBe('head-b');
    expect(pickHitReaction(light('direto'), 'head-b')).toBe('head-a');
  });

  it('last body, uppercut ou impact reinicia em head-a', () => {
    const others: HitReaction[] = ['body', 'uppercut', 'impact'];
    for (const last of others) expect(pickHitReaction(light('jab'), last)).toBe('head-a');
  });

  it('golpe sem moveName cai na alternância de cabeça', () => {
    expect(pickHitReaction(light(), null)).toBe('head-a');
    expect(pickHitReaction(light(), 'head-a')).toBe('head-b');
    expect(pickHitReaction({ strength: 'light' }, 'head-b')).toBe('head-a');
  });

  it('nome desconhecido também alterna', () => {
    expect(pickHitReaction(light('chuteGiratorio'), null)).toBe('head-a');
  });

  it('durações da reação leve são 60, 90 e 70', () => {
    expect(REACTION_DURATIONS).toEqual([60, 90, 70]);
  });
});
