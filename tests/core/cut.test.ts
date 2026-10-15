import { describe, expect, it } from 'vitest';
import { CutSchedule, cutAngles, cutConfig, cutGeometry, cutLine, type CutConfig } from '../../src/core/cut';
import { Loadout } from '../../src/core/loadout';
import { resolveTechStats } from '../../src/core/techStats';
import { TECH_GEOMETRY, TECHNIQUES } from '../../src/data/techniques';

/** O `CutConfig` do Corte Nv 1 sem multiplicador: os números de hoje (0/60/120 ms, 60 a 180 px, 48 px, dano 10). */
const BASE = cutConfig(resolveTechStats({ id: 'corte', level: 1, damageMul: 1, vowDamageMul: 1, costMul: 1 }));

describe('CUT-02: 3 cortes aos 0, 60 e 120 ms depois de entrar em `release`', () => {
  it('o 1º passo já dispara o corte de 0 ms', () => {
    const schedule = new CutSchedule(BASE);
    expect(schedule.update(10)).toEqual([0]);
  });

  it('ao completar 60 ms acumulados dispara o 2º corte', () => {
    const schedule = new CutSchedule(BASE);
    schedule.update(10); // corte 0
    expect(schedule.update(50)).toEqual([1]); // 10 + 50 = 60
  });

  it('ao completar 120 ms acumulados dispara o 3º corte, e cada corte só acontece uma vez', () => {
    const schedule = new CutSchedule(BASE);
    schedule.update(10); // 0
    schedule.update(50); // 60
    expect(schedule.update(60)).toEqual([2]); // 120
    expect(schedule.update(1000)).toEqual([]); // nenhum corte novo depois do 3º
  });

  it('um dt grande que cruza os 3 tempos de uma vez dispara os 3 cortes no mesmo passo', () => {
    const schedule = new CutSchedule(BASE);
    expect(schedule.update(200)).toEqual([0, 1, 2]);
  });
});

const PLAYER_CENTER = { x: 0, y: 0 };

describe('CUT-03: dano de 10 leve para quem sobrepõe o retângulo de 60 a 180 px, 48 px de altura (L-010: 59/60 e 180/181 px)', () => {
  const schedule = new CutSchedule(BASE);

  it('a 59 px à frente (facing 1): não é atingido', () => {
    const hits = schedule.targetsHit(PLAYER_CENTER, 1, [{ id: 1, body: { x: 59, y: 0, width: 0, height: 0 } }]);
    expect(hits).toHaveLength(0);
  });

  it('a exatamente 60 px à frente: atingido, com 10 de dano leve', () => {
    const hits = schedule.targetsHit(PLAYER_CENTER, 1, [{ id: 1, body: { x: 60, y: 0, width: 0, height: 0 } }]);
    expect(hits).toEqual([{ targetId: 1, damage: TECHNIQUES.corte.damage.cut }]);
    expect(TECHNIQUES.corte.damage.cut).toBe(10);
  });

  it('a exatamente 180 px à frente: ainda atingido', () => {
    const hits = schedule.targetsHit(PLAYER_CENTER, 1, [{ id: 1, body: { x: 180, y: 0, width: 0, height: 0 } }]);
    expect(hits).toHaveLength(1);
  });

  it('a 181 px à frente: fora do retângulo, não atingido', () => {
    const hits = schedule.targetsHit(PLAYER_CENTER, 1, [{ id: 1, body: { x: 181, y: 0, width: 0, height: 0 } }]);
    expect(hits).toHaveLength(0);
  });

  it('fora da faixa de altura (48 px centrados no player), não é atingido mesmo dentro do x', () => {
    const hits = schedule.targetsHit(PLAYER_CENTER, 1, [{ id: 1, body: { x: 100, y: 30, width: 0, height: 0 } }]);
    expect(hits).toHaveLength(0);
  });

  it('com facing -1, o retângulo espelha para o outro lado', () => {
    const hits = schedule.targetsHit(PLAYER_CENTER, -1, [{ id: 1, body: { x: -100, y: 0, width: 0, height: 0 } }]);
    expect(hits).toEqual([{ targetId: 1, damage: TECHNIQUES.corte.damage.cut }]);
  });
});

describe('CUT-05: os 3 cortes ficam a 20°, −25° e 70°, na ordem, espelhados se o player olha para a esquerda', () => {
  it('facing 1: ângulos na ordem original', () => {
    expect(cutAngles(1)).toEqual([20, -25, 70]);
  });

  it('facing -1: ângulos espelhados (sinal invertido), na mesma ordem', () => {
    expect(cutAngles(-1)).toEqual([-20, 25, -70]);
  });
});

describe('TST-02: a agenda, o retângulo e o dano saem do stat da conjuração', () => {
  it('o config do Corte Nv 1 sem multiplicador tem os números da tabela', () => {
    const { times, nearPx, farPx, heightPx } = TECH_GEOMETRY.corte;
    expect(BASE).toEqual({ times, nearPx, farPx, heightPx, damage: TECHNIQUES.corte.damage.cut });
  });

  it('o dano é o do stat, já escalado: Nv 3 com Rosário e voto = Loadout.damage de hoje', () => {
    const loadout = new Loadout();
    loadout.equip(0, 'corte', 3);
    loadout.damageMul = 1.35;
    loadout.vowDamageMul = 1.35;
    const config = cutConfig(loadout.stats('corte'));
    expect(config.damage).toBe(loadout.damage('corte', TECHNIQUES.corte.damage.cut));
    const hits = new CutSchedule(config).targetsHit(PLAYER_CENTER, 1, [
      { id: 7, body: { x: 100, y: 0, width: 0, height: 0 } },
    ]);
    expect(hits).toEqual([{ targetId: 7, damage: config.damage }]);
  });

  it('outro retângulo no config muda quem é atingido (de 0 a 300 px, 10 px de altura)', () => {
    const wide: CutConfig = { ...BASE, nearPx: 0, farPx: 300, heightPx: 10 };
    const at = (x: number, y: number) =>
      new CutSchedule(wide).targetsHit(PLAYER_CENTER, 1, [{ id: 1, body: { x, y, width: 0, height: 0 } }]);
    expect(at(20, 0)).toHaveLength(1); // antes dos 60 px de hoje
    expect(at(300, 0)).toHaveLength(1);
    expect(at(301, 0)).toHaveLength(0);
    expect(at(100, 6)).toHaveLength(0); // fora dos 10 px de altura
  });

  it('outros tempos no config mudam o relógio da agenda', () => {
    const schedule = new CutSchedule({ ...BASE, times: [0, 100, 200] });
    expect(schedule.update(10)).toEqual([0]);
    expect(schedule.update(50)).toEqual([]); // 60 ms: o 2º corte de hoje, mas aqui só aos 100
    expect(schedule.update(40)).toEqual([1]);
  });

  it('os ângulos vêm do stat quando passados, espelhados do mesmo jeito', () => {
    expect(cutAngles(1, [10, -15, 45])).toEqual([10, -15, 45]);
    expect(cutAngles(-1, [10, -15, 45])).toEqual([-10, 15, -45]);
  });
});

describe('TST-03: a linha da vista é medida pelo stat', () => {
  it('a geometria da tabela dá a linha de hoje: 240 px centrada a 120 px (meio de 60 a 180)', () => {
    expect(cutLine(TECH_GEOMETRY.corte)).toEqual({ midPx: 120, lenPx: 240 });
  });

  it('a linha acompanha o retângulo e o comprimento do stat', () => {
    expect(cutLine({ nearPx: 40, farPx: 240, lineLen: 300 })).toEqual({ midPx: 140, lenPx: 300 });
  });

  it('sem geometria de Corte no stat, cai na da tabela', () => {
    const red = resolveTechStats({ id: 'vermelho', level: 1, damageMul: 1, vowDamageMul: 1, costMul: 1 });
    expect(cutGeometry(red)).toBe(TECH_GEOMETRY.corte);
  });
});
