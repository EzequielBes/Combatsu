import { describe, expect, it } from 'vitest';
import {
  bodyStrike,
  CadenceCounter,
  FuryCounter,
  marteloTargets,
  widenForward,
  type BodyPoints,
  type MarteloTarget,
} from '../../src/core/cursedBody';
import { MOVES } from '../../src/data/moves';

const ZERO: BodyPoints = { impacto: 0, peso: 0, ritmo: 0, alcance: 0, fluxo: 0, furia: 0 };
const pts = (patch: Partial<BodyPoints>): BodyPoints => ({ ...ZERO, ...patch });
const LIGHT = MOVES.jab;
const HEAVY = MOVES.cotovelada;

describe('CRP-02 a CRP-05: números por ponto', () => {
  it('Impacto 1, 1,1, 1,2 e 1,3 com 0 a 3 pontos', () => {
    expect([0, 1, 2, 3].map((p) => bodyStrike(pts({ impacto: p }), LIGHT).impactMul)).toEqual([1, 1.1, 1.2, 1.3]);
  });

  it('Peso 1, 1,2, 1,4 e 1,6 na força', () => {
    expect([0, 1, 2, 3].map((p) => bodyStrike(pts({ peso: p }), LIGHT).forceMul)).toEqual([1, 1.2, 1.4, 1.6]);
  });

  it('Ritmo 1, 0,92, 0,85 e 0,78 no recovery', () => {
    expect([0, 1, 2, 3].map((p) => bodyStrike(pts({ ritmo: p }), LIGHT).recoveryMul)).toEqual([1, 0.92, 0.85, 0.78]);
  });

  it('Alcance 0, 6, 10 e 14 px', () => {
    expect([0, 1, 2, 3].map((p) => bodyStrike(pts({ alcance: p }), LIGHT).reachPx)).toEqual([0, 6, 10, 14]);
  });

  it('sem pontos o golpe é o de hoje', () => {
    expect(bodyStrike(ZERO, HEAVY)).toEqual({
      impactMul: 1,
      forceMul: 1,
      recoveryMul: 1,
      reachPx: 0,
      knockdown: false,
      wallStun: false,
    });
  });

  it('knockdown só com Peso 2 ou mais, nos dois lados, e só no golpe forte', () => {
    expect(bodyStrike(pts({ peso: 1 }), HEAVY).knockdown).toBe(false);
    expect(bodyStrike(pts({ peso: 2 }), HEAVY).knockdown).toBe(true);
    expect(bodyStrike(pts({ peso: 3 }), HEAVY).knockdown).toBe(true);
    expect(bodyStrike(pts({ peso: 2 }), LIGHT).knockdown).toBe(false);
    expect(bodyStrike(pts({ peso: 3 }), LIGHT).knockdown).toBe(false);
  });

  it('wallStun só com Peso 3', () => {
    expect(bodyStrike(pts({ peso: 2 }), HEAVY).wallStun).toBe(false);
    expect(bodyStrike(pts({ peso: 3 }), HEAVY).wallStun).toBe(true);
  });

  it('pontos fora de 0 a 3 lançam RangeError', () => {
    expect(() => bodyStrike(pts({ impacto: 4 }), LIGHT)).toThrow(RangeError);
    expect(() => bodyStrike(pts({ ritmo: -1 }), LIGHT)).toThrow(RangeError);
  });
});

describe('CRP-05: widenForward', () => {
  const shape = { offsetX: 20, offsetY: -4, width: 30, height: 12 };
  const back = (s: typeof shape) => s.offsetX - s.width / 2;
  const front = (s: typeof shape) => s.offsetX + s.width / 2;

  it('mantém a borda de trás e leva a da frente `px` adiante', () => {
    for (const px of [0, 6, 10, 14]) {
      const w = widenForward(shape, px);
      expect(back(w)).toBe(back(shape));
      expect(front(w)).toBe(front(shape) + px);
      expect(w.offsetY).toBe(shape.offsetY);
      expect(w.height).toBe(shape.height);
    }
  });

  it('não muda o original', () => {
    widenForward(shape, 14);
    expect(shape.width).toBe(30);
  });
});

describe('CRP-07: Fúria', () => {
  const stack = (n: number, f = new FuryCounter()): FuryCounter => {
    for (let i = 1; i <= n; i++) f.onConnect(i);
    return f;
  };

  it('3%, 4% e 5% por acúmulo com 1, 2 e 3 pontos', () => {
    expect(stack(1).bonus(1)).toBeCloseTo(0.03, 10);
    expect(stack(1).bonus(2)).toBeCloseTo(0.04, 10);
    expect(stack(1).bonus(3)).toBeCloseTo(0.05, 10);
    expect(stack(2).bonus(3)).toBeCloseTo(0.1, 10);
  });

  it('tetos de 15%, 24% e 35%: o acúmulo que chega ao teto e o seguinte', () => {
    expect(stack(5).bonus(1)).toBeCloseTo(0.15, 10);
    expect(stack(6).bonus(1)).toBeCloseTo(0.15, 10);
    expect(stack(6).bonus(2)).toBeCloseTo(0.24, 10);
    expect(stack(7).bonus(2)).toBeCloseTo(0.24, 10);
    expect(stack(7).bonus(3)).toBeCloseTo(0.35, 10);
    expect(stack(8).bonus(3)).toBeCloseTo(0.35, 10);
  });

  it('atCap só no teto (4 e 5 acúmulos com 1 ponto) e nunca sem pontos', () => {
    expect(stack(4).atCap(1)).toBe(false);
    expect(stack(5).atCap(1)).toBe(true);
    expect(stack(30).atCap(0)).toBe(false);
  });

  it('sem pontos o bônus é 0', () => {
    expect(stack(10).bonus(0)).toBe(0);
  });

  it('um acúmulo por golpe, mesmo com vários alvos', () => {
    const f = new FuryCounter();
    f.onConnect(7);
    f.onConnect(7);
    expect(f.stacks).toBe(1);
    f.onConnect(8);
    expect(f.stacks).toBe(2);
  });

  it('a perda de HP zera; o golpe defendido (sem chamada) deixa as pilhas', () => {
    const f = stack(5);
    expect(f.stacks).toBe(5);
    f.onHpLoss();
    expect(f.stacks).toBe(0);
    expect(f.bonus(3)).toBe(0);
  });
});

describe('CRP-08: Cadência', () => {
  const connect = (c: CadenceCounter, from: number, to: number): void => {
    for (let i = from; i <= to; i++) {
      c.onConnect(i);
      c.onActiveEnd(i, true);
    }
  };

  it('decisiva no 4º e no 8º golpe seguido, não no 3º, 5º nem 7º', () => {
    const c = new CadenceCounter();
    const decisive: number[] = [];
    for (let i = 1; i <= 9; i++) {
      if (c.nextIsDecisive()) decisive.push(i);
      c.onConnect(i);
      c.onActiveEnd(i, true);
    }
    expect(decisive).toEqual([4, 8]);
  });

  it('um acerto por golpe, mesmo com vários alvos', () => {
    const c = new CadenceCounter();
    c.onConnect(1);
    c.onConnect(1);
    expect(c.count).toBe(1);
  });

  it('golpe que termina sem acertar zera; o que acertou mantém', () => {
    const c = new CadenceCounter();
    connect(c, 1, 3);
    c.onActiveEnd(4, false);
    expect(c.count).toBe(0);
    expect(c.nextIsDecisive()).toBe(false);
    connect(c, 5, 6);
    c.onActiveEnd(6, true);
    expect(c.count).toBe(2);
  });

  it('a perda de HP zera', () => {
    const c = new CadenceCounter();
    connect(c, 1, 3);
    expect(c.nextIsDecisive()).toBe(true);
    c.onHpLoss();
    expect(c.count).toBe(0);
    expect(c.nextIsDecisive()).toBe(false);
  });
});

describe('CRP-09: Martelo Negro', () => {
  /** Inimigo 20×20 com o centro em (cx, 0). */
  const at = (id: number, cx: number, kind?: 'boss'): MarteloTarget => ({
    id,
    box: { x: cx - 10, y: -10, width: 20, height: 20 },
    ...(kind ? { kind } : {}),
  });
  const point = { x: 0, y: 0 };

  it('a caixa a 47 e 48 px do ponto entra; a 49 não', () => {
    // A borda mais perto fica 10 px antes do centro.
    expect(marteloTargets(point, [at(2, 57)], 1)).toEqual([2]);
    expect(marteloTargets(point, [at(2, 58)], 1)).toEqual([2]);
    expect(marteloTargets(point, [at(2, 59)], 1)).toEqual([]);
    expect(marteloTargets(point, [at(2, 49)], 1)).toEqual([2]);
  });

  it('dos dois lados do ponto', () => {
    expect(marteloTargets(point, [at(2, -58), at(3, -59)], 1)).toEqual([2]);
  });

  it('deixa de fora o alvo do golpe e o chefe', () => {
    expect(marteloTargets(point, [at(1, 5), at(2, 5), at(3, 5, 'boss')], 1)).toEqual([2]);
  });

  it('o raio pode ser dado', () => {
    expect(marteloTargets(point, [at(2, 30)], 1, 19)).toEqual([]);
    expect(marteloTargets(point, [at(2, 30)], 1, 20)).toEqual([2]);
  });
});
