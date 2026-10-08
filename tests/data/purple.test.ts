import { describe, expect, it } from 'vitest';
import { TECHNIQUES } from '../../src/data/techniques';

describe('Vazio Roxo nos dados (EVO-06, EVO-07)', () => {
  it('custa 70 de energia, recarrega em 6000 ms e dá 60 de dano no nível 1', () => {
    const roxo = TECHNIQUES.roxo;
    expect(roxo.cost).toBe(70);
    expect(roxo.cooldownMs).toBe(6000);
    expect(roxo.damage.hit).toBe(60);
    expect(roxo.kanji).toBe('murasaki');
  });
});
