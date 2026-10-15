import { describe, expect, it } from 'vitest';
import { adaptSourceOf } from '../../src/core/bossAdapt';
import { techMarks } from '../../src/game/tech/shared';

describe('techMarks', () => {
  it('ADP-01: o golpe da técnica leva o id dela e o Adaptativo conta por ele', () => {
    expect(techMarks('light', 'azul')).toEqual({ tech: true, techId: 'azul' });
    expect(techMarks('heavy', 'roxo')).toEqual({ tech: true, knockdown: true, techId: 'roxo' });
    expect(adaptSourceOf({ strength: 'heavy', ...techMarks('heavy', 'vermelho') })).toBe('vermelho');
  });
});
