/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import { Loadout, type TechLevel } from '../../src/core/loadout';
import { PURPLE } from '../../src/core/purple';
import { RED_ORB_SPEED } from '../../src/core/redOrb';
import { resolveTechStats } from '../../src/core/techStats';
import { TECH_GEOMETRY, TECHNIQUES, type TechId } from '../../src/data/techniques';
import blueOrbSrc from '../../src/core/blueOrb.ts?raw';
import cutSrc from '../../src/core/cut.ts?raw';
import redOrbSrc from '../../src/core/redOrb.ts?raw';
import blueTechSrc from '../../src/game/tech/blue.ts?raw';
import purpleTechSrc from '../../src/game/tech/purple.ts?raw';
import redTechSrc from '../../src/game/tech/red.ts?raw';
import blueFxSrc from '../../src/game/techFx/BlueOrb.ts?raw';
import cutFxSrc from '../../src/game/techFx/CutFx.ts?raw';
import redDetonationSrc from '../../src/game/techFx/redDetonation.ts?raw';

const IDS: readonly TechId[] = ['divergente', 'vermelho', 'azul', 'corte', 'roxo'];
const LEVELS: readonly TechLevel[] = [1, 2, 3];
const MULS = [1, 1.35] as const;

/**
 * Lê `const NOME = valor` do código-fonte de um módulo (os adaptadores de `game/` puxam o Phaser e as constantes dos
 * módulos de regra não são exportadas). Número ou lista de números (`[0, 60, 120] as const`).
 */
function constOf(src: string, name: string): number | number[] {
  const m = new RegExp(`const ${name}\\s*=\\s*(\\[[^\\]]*\\]|-?[\\d.]+)`).exec(src);
  if (!m) throw new Error(`constante ${name} não encontrada`);
  const raw = m[1];
  return raw.startsWith('[') ? raw.slice(1, -1).split(',').map(Number) : Number(raw);
}

describe('TST-01.6: resolveTechStats = Loadout de hoje, 5 técnicas × níveis × multiplicadores 1 e 1,35', () => {
  for (const id of IDS) {
    for (const level of LEVELS) {
      for (const damageMul of MULS) {
        for (const vowDamageMul of MULS) {
          for (const costMul of MULS) {
            it(`${id} Nv ${level}, dano ${damageMul}, voto ${vowDamageMul}, custo ${costMul}`, () => {
              const loadout = new Loadout();
              loadout.equip(0, id, level);
              loadout.damageMul = damageMul;
              loadout.vowDamageMul = vowDamageMul;
              loadout.costMul = costMul;
              const stats = resolveTechStats({ id, level, damageMul, vowDamageMul, costMul });
              expect(stats.id).toBe(id);
              expect(stats.level).toBe(level);
              expect(stats.cost).toBe(loadout.cost(id));
              const def = TECHNIQUES[id];
              expect(Object.keys(stats.damage)).toEqual(Object.keys(def.damage));
              for (const [key, base] of Object.entries(def.damage)) {
                expect(stats.damage[key]).toBe(loadout.damage(id, base));
              }
            });
          }
        }
      }
    }
  }

  it('custo cai 5 por nível e o costMul arredonda no fim: Vermelho Nv 3 com 1,35 = round(35 × 1,35) = 47', () => {
    expect(resolveTechStats({ id: 'vermelho', level: 3, damageMul: 1, vowDamageMul: 1, costMul: 1.35 }).cost).toBe(47);
  });

  it('dano arredonda só depois dos três fatores: Divergente 1º Nv 2 com 1,35 e 1,35 = round(27,34) = 27', () => {
    const s = resolveTechStats({ id: 'divergente', level: 2, damageMul: 1.35, vowDamageMul: 1.35, costMul: 1 });
    expect(s.damage.first).toBe(27);
  });
});

describe('TST-01.6: os tempos saem de TECHNIQUES em todo nível', () => {
  for (const id of IDS) {
    it(`${id}: recarga e as quatro fases iguais às de TECHNIQUES nos níveis 1 a 3`, () => {
      const def = TECHNIQUES[id];
      for (const level of LEVELS) {
        const s = resolveTechStats({ id, level, damageMul: 1.35, vowDamageMul: 1.35, costMul: 1.35 });
        expect([s.cooldownMs, s.signMs, s.chargeMs, s.releaseMs, s.recoverMs]).toEqual([
          def.cooldownMs,
          def.signMs,
          def.chargeMs,
          def.releaseMs,
          def.recoverMs,
        ]);
      }
    });
  }
});

describe('TST-01.6: TECH_GEOMETRY sem número novo (igual às constantes ainda nos módulos)', () => {
  it('Vermelho (T6): os números de hoje, lidos pela regra, pelo adaptador e pela vista sem cópia', () => {
    const g = TECH_GEOMETRY.vermelho;
    const { radius, orbTexels, sensorPx, speed, rangePx, force, ringPx, rings } = g;
    expect({ radius, orbTexels, sensorPx, speed, rangePx, force, ringPx, rings }).toEqual({
      radius: 96,
      orbTexels: 12,
      sensorPx: 6,
      speed: 760,
      rangePx: 420,
      force: 8,
      ringPx: 160,
      rings: 1,
    });
    expect(RED_ORB_SPEED).toBe(g.speed);
    // TST-03: nenhuma cópia do raio, do anel, do voo, do sensor ou da força nos módulos que agora leem do stat.
    for (const name of ['DETONATION_RADIUS', 'RANGE', 'SPEED']) expect(redOrbSrc).not.toContain(`const ${name} =`);
    for (const name of ['SPHERE_MAX_RADIUS', 'SHOCK_RING_MAX_RADIUS']) expect(redDetonationSrc).not.toContain(name);
    expect(redDetonationSrc).not.toMatch(/\b(96|160)\b/);
    for (const name of ['RED_ORB_RADIUS', 'RED_FORCE']) expect(redTechSrc).not.toContain(`const ${name}`);
    expect(redTechSrc).toContain(`${g.orbTexels}: TEX.techOrbRed${g.orbTexels}`);
    expect(redTechSrc).toContain('ORB_TEX[red.orbTexels]');
    expect(g.repulse).toEqual({
      damage: constOf(redOrbSrc, 'REPULSE_DAMAGE'),
      force: constOf(redOrbSrc, 'REPULSE_FORCE'),
      reachX: constOf(redOrbSrc, 'REPULSE_REACH_X'),
      reachY: constOf(redOrbSrc, 'REPULSE_REACH_Y'),
    });
  });

  it('Azul (T7): os números de hoje, lidos pela regra, pelo adaptador e pela vista sem cópia', () => {
    expect(TECH_GEOMETRY.azul).toEqual({
      aheadPx: 110,
      wallMarginPx: 16,
      radius: 130,
      pullSpeed: 150,
      tickMs: 250,
      lifeMs: 1400,
      wallQueryPx: 130,
      haloPx: 40,
      distortPx: 58,
    });
    // TST-02/03: nenhuma cópia da geometria nem leitura de TECHNIQUES na regra, no adaptador ou na vista do Azul.
    for (const name of ['AHEAD_PX', 'WALL_MARGIN_PX', 'RADIUS', 'PULL_SPEED', 'TICK_MS', 'LIFE_MS']) {
      expect(blueOrbSrc).not.toContain(`const ${name} =`);
    }
    expect(blueOrbSrc).not.toContain('TECHNIQUES');
    expect(blueTechSrc).not.toContain('BLUE_WALL_QUERY_PX');
    expect(blueTechSrc).not.toContain('loadout.damage(');
    expect(blueTechSrc).toContain("this.ctx.loadout.stats('azul')");
    for (const name of ['HALO_RADIUS', 'DISTORT_RADIUS']) expect(blueFxSrc).not.toContain(name);
    expect(blueFxSrc).not.toMatch(/\b(130|40|58)\b/);
  });

  it('Corte: tempos, ângulos, retângulo de dano e linha da vista', () => {
    const g = TECH_GEOMETRY.corte;
    expect([...g.times]).toEqual(constOf(cutSrc, 'CUT_TIMES'));
    expect([...g.anglesDeg]).toEqual(constOf(cutSrc, 'CUT_ANGLES_DEG'));
    expect(g.nearPx).toBe(constOf(cutSrc, 'NEAR_PX'));
    expect(g.farPx).toBe(constOf(cutSrc, 'FAR_PX'));
    expect(g.heightPx).toBe(constOf(cutSrc, 'HEIGHT_PX'));
    expect(g.lineLen).toBe(constOf(cutFxSrc, 'CUT_LINE_LEN'));
    expect((g.nearPx + g.farPx) / 2).toBe(constOf(cutFxSrc, 'CUT_MID_PX'));
  });

  it('Roxo: PURPLE de core/purple.ts mais a altura e a força de game/tech/purple.ts', () => {
    const { lift, force, ...sphere } = TECH_GEOMETRY.roxo;
    expect(sphere).toEqual(PURPLE);
    expect(lift).toBe(constOf(purpleTechSrc, 'SPHERE_LIFT'));
    expect(force).toBe(constOf(purpleTechSrc, 'PURPLE_FORCE'));
  });
});

describe('TST-01: cada técnica leva só a própria geometria', () => {
  it('Divergente sem geometria; as outras quatro com a chave delas, do TECH_GEOMETRY', () => {
    const at = (id: TechId) => resolveTechStats({ id, level: 1, damageMul: 1, vowDamageMul: 1, costMul: 1 });
    const keys = (id: TechId) => (['red', 'blue', 'cut', 'purple'] as const).filter((k) => at(id)[k] !== undefined);
    expect(keys('divergente')).toEqual([]);
    expect(keys('vermelho')).toEqual(['red']);
    expect(keys('azul')).toEqual(['blue']);
    expect(keys('corte')).toEqual(['cut']);
    expect(keys('roxo')).toEqual(['purple']);
    expect(at('vermelho').red).toBe(TECH_GEOMETRY.vermelho);
    expect(at('azul').blue).toBe(TECH_GEOMETRY.azul);
    expect(at('corte').cut).toBe(TECH_GEOMETRY.corte);
    expect(at('roxo').purple).toBe(TECH_GEOMETRY.roxo);
  });
});

describe('TST-01/TST-02: Loadout.stats(id) = resolveTechStats com os multiplicadores do Loadout', () => {
  for (const id of IDS) {
    for (const level of LEVELS) {
      it(`${id} Nv ${level}: stats, custo e recarga saem do mesmo TechStats`, () => {
        const loadout = new Loadout();
        loadout.equip(1, id, level);
        loadout.damageMul = 1.35;
        loadout.vowDamageMul = 1.35;
        loadout.costMul = 1.35;
        const expected = resolveTechStats({ id, level, damageMul: 1.35, vowDamageMul: 1.35, costMul: 1.35 });
        expect(loadout.stats(id)).toEqual(expected);
        expect(loadout.cost(id)).toBe(expected.cost);
        loadout.startCooldown(1);
        expect(loadout.cooldownOf(1)).toBe(expected.cooldownMs);
      });
    }
  }

  it('não equipada resolve como nível 1 (TEC-14), sem multiplicador', () => {
    const loadout = new Loadout();
    expect(loadout.stats('corte')).toEqual(
      resolveTechStats({ id: 'corte', level: 1, damageMul: 1, vowDamageMul: 1, costMul: 1 }),
    );
  });

  it('o stat acompanha o multiplicador escrito depois (resolvido a cada chamada)', () => {
    const loadout = new Loadout();
    loadout.equip(0, 'vermelho', 3);
    const before = loadout.stats('vermelho').cost;
    loadout.costMul = 1.35;
    expect(before).toBe(TECHNIQUES.vermelho.cost - 10);
    expect(loadout.stats('vermelho').cost).toBe(47);
  });

  it('dano de base fora da tabela usa o nível do stat: 10 no Nv 2 com 1,35 e 1,35 = round(22,78) = 23', () => {
    const loadout = new Loadout();
    loadout.equip(0, 'vermelho', 2);
    loadout.damageMul = 1.35;
    loadout.vowDamageMul = 1.35;
    expect(loadout.damage('vermelho', 10)).toBe(23);
  });
});
