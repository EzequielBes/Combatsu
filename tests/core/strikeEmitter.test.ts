import { describe, expect, it } from 'vitest';
import { StrikeEmitter, type WaveOpts, type WaveTarget } from '../../src/core/strikeEmitter';

const SHORT: WaveOpts = { pierce: false, rangePx: 80 };
const LONG: WaveOpts = { pierce: true, rangePx: 160 };
/** Alvo 20×40 com a borda esquerda em `x`, cruzando a altura 0. */
const target = (id: number, x: number): WaveTarget => ({ id, rect: { x, y: -20, width: 20, height: 40 } });
const origin = { x: 0, y: 0 };

/** Anda `ms` em passos de 10 ms e junta os acertos. */
function run(e: StrikeEmitter, ms: number, targets: WaveTarget[], except: number[] = []) {
  const hits = [];
  for (let t = 0; t < ms; t += 10) hits.push(...e.update(10, targets, except));
  return hits;
}

describe('CRP-10: alcance e velocidade', () => {
  it('a onda curta anda a 600 px/s e acaba em 80 px', () => {
    const e = new StrikeEmitter();
    expect(e.emit(origin, 1, 10, SHORT, 0)).toBe(true);
    e.update(100, []);
    expect(e.waves[0].x).toBeCloseTo(60, 6);
    e.update(20, []);
    expect(e.waves).toHaveLength(1);
    e.update(20, []);
    expect(e.waves).toHaveLength(0);
  });

  it('a onda longa acaba em 160 px e nunca passa disso', () => {
    const e = new StrikeEmitter();
    e.emit(origin, -1, 10, LONG, 0);
    e.update(260, []);
    expect(e.waves[0].x).toBeCloseTo(-156, 6);
    e.update(10, []);
    expect(e.waves).toHaveLength(0);
  });

  it('alvo a 79 px é tocado e a 81 px não', () => {
    const near = new StrikeEmitter();
    near.emit(origin, 1, 10, SHORT, 0);
    expect(run(near, 400, [target(1, 79)]).map((h) => h.targetId)).toEqual([1]);
    const far = new StrikeEmitter();
    far.emit(origin, 1, 10, SHORT, 0);
    expect(run(far, 400, [target(1, 81)])).toEqual([]);
  });

  it('a onda para a esquerda toca o alvo à esquerda', () => {
    const e = new StrikeEmitter();
    e.emit(origin, -1, 10, SHORT, 0);
    expect(run(e, 400, [target(1, -60), target(2, 30)]).map((h) => h.targetId)).toEqual([1]);
  });

  it('o acerto leva o dano da onda', () => {
    const e = new StrikeEmitter();
    e.emit(origin, 1, 7, SHORT, 0);
    expect(run(e, 400, [target(1, 30)])).toEqual([{ waveId: expect.any(Number), targetId: 1, damage: 7 }]);
  });

  it('alvo fora da altura da onda não é tocado', () => {
    const e = new StrikeEmitter();
    e.emit({ x: 0, y: 100 }, 1, 10, SHORT, 0);
    expect(run(e, 400, [target(1, 30)])).toEqual([]);
  });
});

describe('CRP-10, CRP-11: quem a onda acerta', () => {
  const lined = [target(2, 60), target(1, 30), target(3, 120)];

  it('sem pierce acerta só o 1º que toca, o mais perto, e some', () => {
    const e = new StrikeEmitter();
    e.emit(origin, 1, 10, SHORT, 0);
    expect(run(e, 500, lined).map((h) => h.targetId)).toEqual([1]);
    expect(e.waves).toHaveLength(0);
  });

  it('com pierce acerta todos no alcance, cada um uma vez, o mais perto primeiro', () => {
    const e = new StrikeEmitter();
    e.emit(origin, 1, 10, LONG, 0);
    expect(run(e, 500, lined).map((h) => h.targetId)).toEqual([1, 2, 3]);
  });

  it('o alvo excluído (o do golpe) não é acertado e não barra a onda', () => {
    const e = new StrikeEmitter();
    e.emit(origin, 1, 10, SHORT, 0);
    expect(run(e, 500, lined, [1]).map((h) => h.targetId)).toEqual([2]);
  });

  it('cada alvo uma vez por onda, mas duas ondas acertam o mesmo alvo', () => {
    const e = new StrikeEmitter();
    e.emit(origin, 1, 10, LONG, 0);
    e.emit(origin, 1, 10, LONG, 100);
    const ids = run(e, 500, [target(1, 30)]).map((h) => h.targetId);
    expect(ids).toEqual([1, 1]);
  });

  it('passo grande não atravessa o alvo sem tocar', () => {
    const e = new StrikeEmitter();
    e.emit(origin, 1, 10, SHORT, 0);
    expect(e.update(100, [target(1, 20)]).map((h) => h.targetId)).toEqual([1]);
  });
});

describe('CRP-12: teto de 4 ondas em 1000 ms', () => {
  const fill = (e: StrikeEmitter): void => {
    for (const t of [0, 100, 200, 300]) expect(e.emit(origin, 1, 10, SHORT, t)).toBe(true);
  };

  it('a 4ª sai e a 5ª não', () => {
    const e = new StrikeEmitter();
    fill(e);
    expect(e.emit(origin, 1, 10, SHORT, 400)).toBe(false);
    expect(e.waves).toHaveLength(4);
  });

  it('a onda descartada não cria onda nem acerto', () => {
    const e = new StrikeEmitter();
    fill(e);
    e.emit(origin, 1, 10, SHORT, 400);
    expect(e.waves).toHaveLength(4);
  });

  it('a 1ª sai da janela em 1000 ms: 999 não, 1000 e 1001 sim', () => {
    for (const [now, ok] of [
      [999, false],
      [1000, true],
      [1001, true],
    ] as const) {
      const e = new StrikeEmitter();
      fill(e);
      expect(e.emit(origin, 1, 10, SHORT, now)).toBe(ok);
    }
  });

  it('a janela desliza: a onda descartada não conta e em 1099 só a vaga da 1ª está livre', () => {
    const e = new StrikeEmitter();
    fill(e);
    e.emit(origin, 1, 10, SHORT, 500);
    expect(e.emit(origin, 1, 10, SHORT, 1099)).toBe(true);
    expect(e.emit(origin, 1, 10, SHORT, 1099)).toBe(false);
  });

  it('reset limpa ondas e janela', () => {
    const e = new StrikeEmitter();
    fill(e);
    e.reset();
    expect(e.waves).toHaveLength(0);
    expect(e.emit(origin, 1, 10, SHORT, 400)).toBe(true);
  });
});
