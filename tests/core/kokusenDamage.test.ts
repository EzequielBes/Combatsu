import { describe, expect, it } from 'vitest';
import { kokusenDamage, type KokusenScale } from '../../src/core/kokusen';
import { multipliersFor } from '../../src/core/difficulty';
import { KOKUSEN } from '../../src/data/techniques';
import { DIFFICULTY } from '../../src/data/tuning';

/** D da spec (ESC-02.4): `round(18 × LEVEL_FACTOR[0])`, o 2º impacto do Divergente Nv 1. */
const D = 18;
const BARE: KokusenScale = { forca: 0, meleeMul: 1, hpMul: 1 };

describe('ESC-02: dano do Kokusen com piso', () => {
  it('rodada 1 sem build dá 45', () => {
    expect(kokusenDamage(D, BARE)).toBe(45);
  });

  it('Força 5 e nada mais dá 68 (round(2,5 × 27), com 27 = round(18 × 1,5))', () => {
    expect(kokusenDamage(D, { ...BARE, forca: 5 })).toBe(68);
  });

  it('o golpe × 2,5 × meleeMul vale quando passa do piso', () => {
    expect(kokusenDamage(D, { ...BARE, meleeMul: 2 })).toBe(90);
    expect(kokusenDamage(D, { forca: 5, meleeMul: 1.35, hpMul: 1 })).toBe(Math.round(2.5 * 27 * 1.35));
  });

  it('o piso 45 × hpMul segue o HP da rodada: 1,48 na r9 dá 67 e 1,60 na r11 dá 72', () => {
    expect(kokusenDamage(D, { ...BARE, hpMul: 1.48 })).toBe(67);
    expect(kokusenDamage(D, { ...BARE, hpMul: 1.6 })).toBe(72);
  });

  it('o piso vem do multiplicador de HP da rodada e não da Força (a Força só sobe o golpe)', () => {
    const hpMul = multipliersFor(1, DIFFICULTY).hp;
    expect(kokusenDamage(D, { forca: 0, meleeMul: 1, hpMul })).toBe(Math.round(KOKUSEN.damage * hpMul));
  });

  it('dois lados do piso: 2º impacto 17 fica abaixo (43 → piso 45), 18 empata (45) e 19 passa (48)', () => {
    expect([17, 18, 19].map((d) => kokusenDamage(d, BARE))).toEqual([45, 45, 48]);
  });

  it('dois lados do piso inflado: golpe 90 contra piso 89 e 91 (hpMul 1,98 e 2,02)', () => {
    const at = (hpMul: number) => kokusenDamage(D, { forca: 0, meleeMul: 2, hpMul });
    expect([at(1.98), at(2.0), at(2.02)]).toEqual([90, 90, 91]);
  });
});
