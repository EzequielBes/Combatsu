import { describe, expect, it } from 'vitest';
import { CutSchedule, cutAngles } from '../../src/core/cut';
import { TECHNIQUES } from '../../src/data/techniques';

describe('CUT-02: 3 cortes aos 0, 60 e 120 ms depois de entrar em `release`', () => {
  it('o 1º passo já dispara o corte de 0 ms', () => {
    const schedule = new CutSchedule();
    expect(schedule.update(10)).toEqual([0]);
  });

  it('ao completar 60 ms acumulados dispara o 2º corte', () => {
    const schedule = new CutSchedule();
    schedule.update(10); // corte 0
    expect(schedule.update(50)).toEqual([1]); // 10 + 50 = 60
  });

  it('ao completar 120 ms acumulados dispara o 3º corte, e cada corte só acontece uma vez', () => {
    const schedule = new CutSchedule();
    schedule.update(10); // 0
    schedule.update(50); // 60
    expect(schedule.update(60)).toEqual([2]); // 120
    expect(schedule.update(1000)).toEqual([]); // nenhum corte novo depois do 3º
  });

  it('um dt grande que cruza os 3 tempos de uma vez dispara os 3 cortes no mesmo passo', () => {
    const schedule = new CutSchedule();
    expect(schedule.update(200)).toEqual([0, 1, 2]);
  });
});

const PLAYER_CENTER = { x: 0, y: 0 };

describe('CUT-03: dano de 10 leve para quem sobrepõe o retângulo de 60 a 180 px, 48 px de altura (L-010: 59/60 e 180/181 px)', () => {
  const schedule = new CutSchedule();

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
