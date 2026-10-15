import { describe, expect, it } from 'vitest';
import { AFFIX_RULES, BOSS_AFFIX, BOSS_AFFIX_IDS, BOSS_AFFIXES } from '../../src/data/bossAffixes';
import { PALETTE_KEYS } from '../../src/game/art/palette';
import { TECHNIQUES } from '../../src/data/techniques';

describe('dados dos afixos de chefe (AFX-02)', () => {
  it('tem os 4 afixos da leva 1, cada um com nome nas duas formas', () => {
    expect(BOSS_AFFIX_IDS).toEqual(['igneo', 'invocador', 'sangue', 'adaptativo']);
    expect(Object.keys(BOSS_AFFIXES).sort()).toEqual([...BOSS_AFFIX_IDS].sort());
    expect(BOSS_AFFIXES.igneo.name).toEqual({ m: 'Ígneo', f: 'Ígnea' });
    expect(BOSS_AFFIXES.invocador.name).toEqual({ m: 'Invocador', f: 'Invocadora' });
    expect(BOSS_AFFIXES.sangue.name).toEqual({ m: 'Sangue Convergente', f: 'Sangue Convergente' });
    expect(BOSS_AFFIXES.adaptativo.name).toEqual({ m: 'Adaptativo', f: 'Adaptativa' });
    expect(BOSS_AFFIX.finger.name).toEqual({ m: 'Portador de Dedo', f: 'Portadora de Dedo' });
  });

  it('só Ígneo e Invocador são leves, e o pool leve é derivado deles', () => {
    const light = BOSS_AFFIX_IDS.filter((id) => BOSS_AFFIXES[id].light);
    expect(light).toEqual(['igneo', 'invocador']);
    expect(AFFIX_RULES.lightPool).toEqual(['igneo', 'invocador']);
  });

  it('conta 1 afixo nos tiers 1 e 2, 2 nos tiers 3 e 4 e 3 do tier 5 em diante; incompatíveis vazia', () => {
    expect(AFFIX_RULES.countByTier).toEqual([1, 1, 2, 2, 3]);
    expect(AFFIX_RULES.incompatible).toEqual([]);
  });

  it('guarda os números da lava, da invocação, do feixe e do Adaptativo', () => {
    expect(BOSS_AFFIX.lava).toEqual({ durationMs: 2000, tickMs: 600, damage: 4 });
    expect(BOSS_AFFIX.summon).toEqual({ count: 3, firstBossCount: 2, maxAlive: 4, spotGap: 28 });
    expect(BOSS_AFFIX.beam).toMatchObject({ warnMs: 800, activeMs: 250, damage: 16, thickness: [1, 6] });
    expect(BOSS_AFFIX.adapt).toEqual({ windowMs: 20000, minHits: 5, maxAdapted: 2, forgetMs: 10000, mult: 0.5 });
    expect(BOSS_AFFIX.outlineSwapMs).toBe(600);
  });

  it('guarda os números do Portador de Dedo (PDD-01..05)', () => {
    expect(BOSS_AFFIX.finger).toMatchObject({
      fromRound: 10,
      chance: 0.1,
      scale: 1.25,
      hpMult: 1.3,
      damageMult: 1.5,
      extraProjectiles: 1,
    });
  });

  it('tem rótulo curto para leve, forte e cada técnica', () => {
    const keys = ['light', 'heavy', ...Object.keys(TECHNIQUES)];
    expect(Object.keys(BOSS_AFFIX.adaptLabels).sort()).toEqual(keys.sort());
    expect(BOSS_AFFIX.adaptLabels.light).toBe('Leve');
    expect(BOSS_AFFIX.adaptLabels.heavy).toBe('Forte');
  });
});

describe('cores dos afixos vêm da PALETTE (BRD-07)', () => {
  it('toda chave de contorno e de glifo existe na PALETTE', () => {
    for (const id of BOSS_AFFIX_IDS) {
      const def = BOSS_AFFIXES[id];
      expect(PALETTE_KEYS.has(def.glyph), `${id}.glyph`).toBe(true);
      if (def.outline !== null) expect(PALETTE_KEYS.has(def.outline), `${id}.outline`).toBe(true);
    }
    expect(PALETTE_KEYS.has(BOSS_AFFIX.finger.glyph)).toBe(true);
  });

  it('usa as cores da spec: contorno a/u, glifos a/u/r/A e R do Portador', () => {
    expect(BOSS_AFFIX_IDS.map((id) => BOSS_AFFIXES[id].outline)).toEqual(['a', 'u', null, null]);
    expect(BOSS_AFFIX_IDS.map((id) => BOSS_AFFIXES[id].glyph)).toEqual(['a', 'u', 'r', 'A']);
    expect(BOSS_AFFIX.finger.glyph).toBe('R');
  });

  it('a regra do teste pega uma chave que não existe', () => {
    expect(PALETTE_KEYS.has('?')).toBe(false);
  });
});
