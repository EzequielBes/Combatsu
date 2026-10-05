import { describe, expect, it } from 'vitest';
import { STEP_BUFFER_MARGIN, StepLerp, stepAlpha } from '../../src/core/stepLerp';

const STEP = 1000 / 60;

describe('stepAlpha: fração entre os dois últimos passos (ITP-01, EDG-01)', () => {
  it('a margem do acumulador é 1,5 passo, como no runner do Matter do Phaser', () => {
    expect(STEP_BUFFER_MARGIN).toBe(1.5);
  });

  it('devolve buffer / passo − 0,5', () => {
    expect(stepAlpha(STEP, STEP)).toBeCloseTo(0.5, 10);
    expect(stepAlpha(STEP * 0.75, STEP)).toBeCloseTo(0.25, 10);
    expect(stepAlpha(STEP * 1.25, STEP)).toBeCloseTo(0.75, 10);
  });

  it('limita a 0 e a 1, nos dois lados do limite', () => {
    expect(stepAlpha(STEP * 0.5, STEP)).toBe(0);
    expect(stepAlpha(STEP * 0.4, STEP)).toBe(0);
    expect(stepAlpha(STEP * 0.5 + 0.001, STEP)).toBeGreaterThan(0);
    expect(stepAlpha(STEP * 1.5, STEP)).toBe(1);
    expect(stepAlpha(STEP * 2, STEP)).toBe(1);
    expect(stepAlpha(STEP * 1.5 - 0.001, STEP)).toBeLessThan(1);
  });

  it('EDG-01: passo menor ou igual a 0 devolve 1', () => {
    expect(stepAlpha(10, 0)).toBe(1);
    expect(stepAlpha(10, -5)).toBe(1);
  });
});

describe('StepLerp: posição entre o passo anterior e o atual (ITP-02, ITP-03)', () => {
  it('antes de qualquer passo, devolve a posição inicial', () => {
    const lerp = new StepLerp({ x: 10, y: 20 });
    expect(lerp.at(0)).toEqual({ x: 10, y: 20 });
    expect(lerp.at(1)).toEqual({ x: 10, y: 20 });
  });

  it('ITP-02: at(alfa) = anterior + (atual − anterior) × alfa', () => {
    const lerp = new StepLerp({ x: 0, y: 100 });
    lerp.push({ x: 4, y: 108 });
    expect(lerp.at(0)).toEqual({ x: 0, y: 100 });
    expect(lerp.at(0.5)).toEqual({ x: 2, y: 104 });
    expect(lerp.at(1)).toEqual({ x: 4, y: 108 });
  });

  it('ITP-02: cada push guarda a posição atual como anterior', () => {
    const lerp = new StepLerp({ x: 0, y: 0 });
    lerp.push({ x: 4, y: 0 });
    lerp.push({ x: 10, y: 0 });
    expect(lerp.at(0)).toEqual({ x: 4, y: 0 });
    expect(lerp.at(0.5)).toEqual({ x: 7, y: 0 });
    expect(lerp.at(1)).toEqual({ x: 10, y: 0 });
  });

  it('ITP-03: salto de mais de 48 px não interpola; 48 px exatos interpola', () => {
    const far = new StepLerp({ x: 0, y: 0 });
    far.push({ x: 48.001, y: 0 });
    expect(far.at(0)).toEqual({ x: 48.001, y: 0 });
    expect(far.at(0.5)).toEqual({ x: 48.001, y: 0 });

    const edge = new StepLerp({ x: 0, y: 0 });
    edge.push({ x: 48, y: 0 });
    expect(edge.at(0)).toEqual({ x: 0, y: 0 });
    expect(edge.at(0.5)).toEqual({ x: 24, y: 0 });
  });

  it('ITP-03: o salto é medido pela distância, não por eixo', () => {
    const lerp = new StepLerp({ x: 0, y: 0 });
    lerp.push({ x: 40, y: 40 }); // 56,6 px
    expect(lerp.at(0)).toEqual({ x: 40, y: 40 });
  });

  it('o push copia a posição: mudar o objeto de fora não muda o que foi guardado', () => {
    const pos = { x: 1, y: 1 };
    const lerp = new StepLerp(pos);
    pos.x = 99;
    expect(lerp.at(1)).toEqual({ x: 1, y: 1 });
  });
});
