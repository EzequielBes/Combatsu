import { describe, expect, it } from 'vitest';
import type { BossAttack } from '../../src/core/bossAI';
import { animBase, beamThickness, threadXs } from '../../src/core/bossAttacks';
import { BOSS_ANIMS } from '../../src/game/art/sprites/boss';
import { BOSS } from '../../src/data/tuning';

const ALL: readonly BossAttack[] = ['charge', 'leap', 'volley', 'doubleCharge', 'tripleLeap', 'threadRain', 'beam'];

describe('threadXs (CYC-09)', () => {
  const offsets = BOSS.threadRain.offsets;

  it('marca 5 posições em volta do jogador no meio da arena', () => {
    expect(threadXs(500, 0, 1000, offsets)).toEqual([404, 452, 500, 548, 596]);
  });

  it('prende os fios à borda esquerda', () => {
    expect(threadXs(20, 0, 1000, offsets)).toEqual([0, 0, 20, 68, 116]);
  });

  it('prende os fios à borda direita', () => {
    expect(threadXs(990, 0, 1000, offsets)).toEqual([894, 942, 990, 1000, 1000]);
  });

  it('nenhum fio sai dos limites', () => {
    for (const x of [-50, 0, 47, 953, 1000, 1050]) {
      for (const tx of threadXs(x, 0, 1000, offsets)) {
        expect(tx).toBeGreaterThanOrEqual(0);
        expect(tx).toBeLessThanOrEqual(1000);
      }
    }
  });
});

describe('beamThickness (SNG-02)', () => {
  it('começa com 1 px e chega a 6 px em 800 ms', () => {
    expect(beamThickness(0, 800)).toBe(1);
    expect(beamThickness(800, 800)).toBe(6);
  });

  it('cresce sem voltar e fica entre 1 e 6 px', () => {
    let prev = 0;
    for (let ms = -100; ms <= 1000; ms += 50) {
      const px = beamThickness(ms, 800);
      expect(Number.isInteger(px)).toBe(true);
      expect(px).toBeGreaterThanOrEqual(Math.max(1, prev));
      expect(px).toBeLessThanOrEqual(6);
      prev = px;
    }
  });

  it('aviso de 0 ms já nasce grosso', () => {
    expect(beamThickness(0, 0)).toBe(6);
  });
});

describe('animBase (CYC-11)', () => {
  it('os ataques novos caem nos quadros da investida, do salto e da rajada', () => {
    expect(animBase('doubleCharge')).toBe('charge');
    expect(animBase('tripleLeap')).toBe('leap');
    expect(animBase('threadRain')).toBe('volley');
    expect(animBase('beam')).toBe('volley');
  });

  it('os ataques antigos tocam o próprio quadro', () => {
    for (const a of ['charge', 'leap', 'volley'] as const) expect(animBase(a)).toBe(a);
  });

  it('todo ataque toca animações que existem na folha do chefe (preparo e corpo)', () => {
    for (const a of ALL) {
      expect(BOSS_ANIMS[animBase(a)]).toBeDefined();
      expect(BOSS_ANIMS[`windup-${animBase(a)}`]).toBeDefined();
    }
  });
});
