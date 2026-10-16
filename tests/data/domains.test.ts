import { describe, expect, it } from 'vitest';
import { PALETTE_KEYS } from '../../src/game/art/palette';
import {
  AMPLIFICATION,
  DOMAIN_CHARGE,
  DOMAIN_COLORS,
  DOMAIN_IDS,
  DOMAIN_SHOP,
  DOMAINS,
  JACKPOT,
  SANCTUARY,
} from '../../src/data/domains';
import source from '../../src/data/domains.ts?raw';

describe('DOMAINS: ativação e duração da seção 5.6 (DOM-08, SAN-01, AMP-01)', () => {
  it('os três Domínios da leva 1, nesta ordem', () => {
    expect(DOMAIN_IDS).toEqual(['santuario', 'jackpot', 'amplificacao']);
  });

  it.each([
    ['santuario', 320, 0.4, 0.06, 0.2, 8],
    ['jackpot', 96, 0.4, 0.06, 0.2, 0],
    ['amplificacao', 96, 0.25, 0.04, 0.12, 8],
  ] as const)('%s: raio %i, comum %d, chefe %d, elite %d, empurrão %i', (id, radius, common, boss, elite, force) => {
    expect(DOMAINS[id].activation).toEqual({ radiusPx: radius, common, boss, elite, force });
  });

  it.each([
    ['santuario', [6000, 8000, 8000]],
    ['amplificacao', [7000, 9000, 9000]],
    ['jackpot', [2000, 2000, 2000]],
  ] as const)('%s dura %j por nível', (id, ms) => {
    expect(DOMAINS[id].durationMs).toEqual(ms);
  });

  it('todo Domínio tem nome e linha de efeito', () => {
    for (const id of DOMAIN_IDS) {
      expect(DOMAINS[id].name.length).toBeGreaterThan(0);
      expect(DOMAINS[id].line.length).toBeGreaterThan(0);
    }
  });
});

describe('DOMAIN_CHARGE (DOM-02, DOM-03, VEU-03)', () => {
  it('carga por evento: leve 1, forte 2, objeto 2, abate 1, defesa 5, conjuração 1, finalizador 5, Kokusen 15', () => {
    const { light, heavy, prop, kill, defense, techCast, finisher, kokusen } = DOMAIN_CHARGE;
    expect([light, heavy, prop, kill, defense, techCast, finisher, kokusen]).toEqual([1, 2, 2, 1, 5, 1, 5, 15]);
  });

  it('teto 100, esvazia 10 a cada 8000 ms e o Baú do Véu entrega cheio', () => {
    expect(DOMAIN_CHARGE.max).toBe(100);
    expect(DOMAIN_CHARGE.drainAfterMs).toBe(8000);
    expect(DOMAIN_CHARGE.drainStep).toBe(10);
    expect(DOMAIN_CHARGE.veilStart).toBe(100);
  });
});

describe('SANCTUARY, JACKPOT, AMPLIFICATION e DOMAIN_SHOP (SAN-*, JAC-*, AMP-*, DNV-*)', () => {
  it('Santuário: 4 gatilhos em 1000 ms, alvos 4/6/6, corte 6, Corte do Mundo 0,35 e 0,08', () => {
    expect(SANCTUARY.triggersPerWindow).toBe(4);
    expect(SANCTUARY.windowMs).toBe(1000);
    expect(SANCTUARY.targets).toEqual([4, 6, 6]);
    expect(SANCTUARY.cutBase).toBe(6);
    expect(SANCTUARY.worldCut).toEqual({ threshold: 0.35, bossFraction: 0.08 });
  });

  it('Jackpot: giro 2000 ms, base 0,33/0,40/0,40, Riichi 0,04, bônus 0,05, teto 0,60, piedade 2', () => {
    expect(JACKPOT.spinMs).toBe(2000);
    expect(JACKPOT.base).toEqual([0.33, 0.4, 0.4]);
    expect(JACKPOT.riichiStep).toBe(0.04);
    expect(JACKPOT.winStep).toBe(0.05);
    expect(JACKPOT.cap).toBe(0.6);
    expect(JACKPOT.pityMisses).toBe(2);
  });

  it('Jackpot: efeito 8000 ms com cura a cada 200 ms; falha 4000 ms, 400 ms e metade do custo e da recarga', () => {
    expect(JACKPOT.hit).toEqual({ ms: 8000, healEveryMs: 200 });
    expect(JACKPOT.miss).toEqual({ ms: 4000, healEveryMs: 400, costMul: 0.5, cooldownMul: 0.5 });
  });

  it('Amplificação Nv 3 dá 1,25 no corpo a corpo', () => {
    expect(AMPLIFICATION.meleeMulLv3).toBe(1.25);
  });

  it('loja: 40 + 10 por nível, da r8 em diante', () => {
    expect(DOMAIN_SHOP).toEqual({ base: 40, step: 10, minRound: 8 });
  });
});

describe('cores e pureza (DHD-04)', () => {
  it('toda chave de DOMAIN_COLORS existe na PALETTE', () => {
    const keys = Object.values(DOMAIN_COLORS);
    expect(keys.length).toBe(9);
    for (const key of keys) expect(PALETTE_KEYS.has(key), key).toBe(true);
  });

  it('o código-fonte não cita o motor', () => {
    expect(source.length).toBeGreaterThan(0);
    expect(source).not.toMatch(/phaser/i);
  });
});
