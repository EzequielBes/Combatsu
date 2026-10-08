import { describe, expect, it } from 'vitest';
import { farPainterFor, THEME_SCENERY } from '../../../src/game/art/scenery/index';
import { schoolFar } from '../../../src/game/art/scenery/school';

describe('camada distante por tema (ARN-01)', () => {
  it('área só de santuário: o céu do santuário', () => {
    expect(THEME_SCENERY.santuario.far).toBeDefined();
    expect(farPainterFor([{ theme: 'santuario' }])).toBe(THEME_SCENERY.santuario.far);
  });

  it('santuário misturado com outro tema: a escola', () => {
    expect(farPainterFor([{ theme: 'santuario' }, { theme: 'rua' }])).toBe(schoolFar);
  });

  it('sem trechos (a sala) e áreas de combate: a escola', () => {
    expect(farPainterFor([])).toBe(schoolFar);
    expect(farPainterFor([{ theme: 'rua' }, { theme: 'beco' }])).toBe(schoolFar);
  });
});
