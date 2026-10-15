import { describe, expect, it } from 'vitest';
import { RED_AXES } from '../../src/data/techAxes';
import { CAST_FX, CE, KOKUSEN, LEVEL_FACTOR, TECHNIQUES } from '../../src/data/techniques';

describe('TECHNIQUES: números de nível 1 contra os ACs (DIV-01, RED-01, BLU-01, CUT-01)', () => {
  it('divergente: custo 20, cooldown 1200, sign 60, charge 60, release 80, recover 200 (DIV-01)', () => {
    expect(TECHNIQUES.divergente).toMatchObject({
      cost: 20,
      cooldownMs: 1200,
      signMs: 60,
      chargeMs: 60,
      releaseMs: 80,
      recoverMs: 200,
    });
  });

  it('vermelho: custo 30, cooldown 4500, sign 250, charge 350, release 100, recover 250 (RED-01, VRM-01)', () => {
    expect(TECHNIQUES.vermelho).toMatchObject({
      cost: 30,
      cooldownMs: 4500,
      signMs: 250,
      chargeMs: 350,
      releaseMs: 100,
      recoverMs: 250,
    });
  });

  it('azul: custo 35, cooldown 4000, sign 200, charge 250, release 100, recover 200 (BLU-01)', () => {
    expect(TECHNIQUES.azul).toMatchObject({
      cost: 35,
      cooldownMs: 4000,
      signMs: 200,
      chargeMs: 250,
      releaseMs: 100,
      recoverMs: 200,
    });
  });

  it('corte: custo 30, cooldown 2500, sign 150, charge 0, release 150, recover 200 (CUT-01)', () => {
    expect(TECHNIQUES.corte).toMatchObject({
      cost: 30,
      cooldownMs: 2500,
      signMs: 150,
      chargeMs: 0,
      releaseMs: 150,
      recoverMs: 200,
    });
  });
});

describe('TEC-14: custo por nível = baseCost − 5 × (n − 1)', () => {
  const costAtLevel = (baseCost: number, n: number): number => baseCost - 5 * (n - 1);

  it('azul: nível 1 → 35, nível 2 → 30, nível 3 → 25', () => {
    expect(costAtLevel(TECHNIQUES.azul.cost, 1)).toBe(35);
    expect(costAtLevel(TECHNIQUES.azul.cost, 2)).toBe(30);
    expect(costAtLevel(TECHNIQUES.azul.cost, 3)).toBe(25);
  });

  it('vermelho: a base é 30 e a Eficiência é a tabela dele (VRM-01, VRM-03), não o −5 por nível', () => {
    expect(TECHNIQUES.vermelho.cost).toBe(RED_AXES.eficiencia.cost[0]);
    expect(RED_AXES.eficiencia.cost).toEqual([30, 26, 22, 18]);
  });

  it('divergente: nível 1 → 20, nível 3 → 10', () => {
    expect(costAtLevel(TECHNIQUES.divergente.cost, 1)).toBe(20);
    expect(costAtLevel(TECHNIQUES.divergente.cost, 3)).toBe(10);
  });
});

describe('LEVEL_FACTOR: fatores de dano por nível (TEC-06)', () => {
  it('nível 1/2/3 = 1, 1.25, 1.5', () => {
    expect(LEVEL_FACTOR).toEqual([1, 1.25, 1.5]);
  });
});

describe('CE, KOKUSEN, CAST_FX: presentes com os campos usados pelas ACs', () => {
  it('CE tem max 100, regen 8, meleeGain 3, kokusenGain 30, tetos de upgrade (CE-01, CE-07, CE-09, KOK-09)', () => {
    expect(CE).toMatchObject({
      max: 100,
      regen: 8,
      meleeGain: 3,
      kokusenGain: 30,
      maxPerLevel: 20,
      maxCap: 200,
      regenPerLevel: 2,
      regenCap: 16,
    });
  });

  it('KOKUSEN tem janela 120–200, zona 60–8000, dano 45 (KOK-01, KOK-02, KOK-06, KOK-10)', () => {
    expect(KOKUSEN).toMatchObject({ windowFrom: 120, windowTo: 200, zoneFrom: 60, zoneMs: 8000, damage: 45 });
  });

  it('CAST_FX tem zoom base 1.5 e de carga 1.6 (CAST-15, CAST-19)', () => {
    expect(CAST_FX).toMatchObject({ zoomBase: 1.5, zoomCharge: 1.6, zoomBackMs: 250, calloutMs: 900, airGravity: 0.3 });
  });
});
