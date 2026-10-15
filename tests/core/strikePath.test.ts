import { describe, expect, it } from 'vitest';
import { extendPath, pathLength, strikeToBody, strikeToWorld, trailStyle } from '../../src/core/strikePath';

// Frame de 30 linhas, origem na coluna 12 e no pé (base do frame). Texel = 2 px.
const FRAME = { originCol: 12, rows: 30 };

describe('strikeToWorld (TRL-03)', () => {
  it('facing 1: x cresce com a coluna e y sobe com a linha menor', () => {
    const p = strikeToWorld({ col: 17, row: 10 }, { x: 100, footY: 200 }, 1, FRAME);
    expect(p.x).toBe(100 + 5 * 2);
    expect(p.y).toBe(200 - (30 - 10 - 0.5) * 2);
  });

  it('facing -1 espelha em volta da coluna de origem e mantém o y', () => {
    const at = { x: 100, footY: 200 };
    const right = strikeToWorld({ col: 17, row: 10 }, at, 1, FRAME);
    const left = strikeToWorld({ col: 17, row: 10 }, at, -1, FRAME);
    expect(left.x - at.x).toBe(-(right.x - at.x));
    expect(left.y).toBe(right.y);
  });

  it('ponto na própria coluna de origem fica em x do jogador nos dois lados', () => {
    const at = { x: 100, footY: 200 };
    expect(strikeToWorld({ col: 12, row: 29 }, at, 1, FRAME).x).toBe(100);
    expect(strikeToWorld({ col: 12, row: 29 }, at, -1, FRAME).x).toBe(100);
  });

  it('a última linha do frame fica meio texel acima do pé', () => {
    expect(strikeToWorld({ col: 12, row: 29 }, { x: 0, footY: 200 }, 1, FRAME).y).toBe(199);
  });
});

describe('strikeToBody (POS-01)', () => {
  it('é relativo ao centro do corpo com facing direito', () => {
    // corpo de 48 px de altura: o pé está 24 px abaixo do centro
    const p = strikeToBody({ col: 17, row: 29 }, 48, FRAME);
    expect(p.x).toBe(10);
    expect(p.y).toBe(24 - 1);
  });

  it('concorda com strikeToWorld a menos da origem', () => {
    const pt = { col: 20, row: 8 };
    const body = strikeToBody(pt, 48, FRAME);
    const world = strikeToWorld(pt, { x: 0, footY: 24 }, 1, FRAME);
    expect(body).toEqual({ x: world.x, y: world.y });
  });
});

describe('trailStyle (TRL-04, TRL-05)', () => {
  it('leve: 4 px e 140 ms', () => {
    expect(trailStyle('light')).toEqual({ widthPx: 4, fadeMs: 140 });
  });
  it('forte: 8 px e 220 ms', () => {
    expect(trailStyle('heavy')).toEqual({ widthPx: 8, fadeMs: 220 });
  });
});

describe('extendPath e pathLength (CRP-05: o Alcance alonga o rastro)', () => {
  it('soma os segmentos do caminho', () => {
    expect(
      pathLength([
        { x: 0, y: 0 },
        { x: 3, y: 4 },
        { x: 3, y: 10 },
      ]),
    ).toBe(11);
    expect(pathLength([{ x: 5, y: 5 }])).toBe(0);
  });

  it('alonga a ponta 14 px na direção do último trecho, para a direita e para a esquerda', () => {
    const right = extendPath(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      14,
    );
    expect(right).toEqual([
      { x: 0, y: 0 },
      { x: 24, y: 0 },
    ]);
    const left = extendPath(
      [
        { x: 0, y: 0 },
        { x: -3, y: -4 },
      ],
      10,
    );
    expect(left[1]!.x).toBeCloseTo(-9);
    expect(left[1]!.y).toBeCloseTo(-12);
    expect(pathLength(left)).toBeCloseTo(15);
  });

  it('mantém o começo e o meio e cresce exatamente os px pedidos', () => {
    const path = [
      { x: 0, y: 0 },
      { x: 4, y: 3 },
      { x: 10, y: 3 },
    ];
    const out = extendPath(path, 6);
    expect(out.slice(0, 2)).toEqual(path.slice(0, 2));
    expect(pathLength(out)).toBeCloseTo(pathLength(path) + 6);
  });

  it('sem alcance (0 px) devolve o caminho igual', () => {
    const path = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    expect(extendPath(path, 0)).toEqual(path);
  });

  it('com a ponta repetida usa o último trecho que anda', () => {
    const out = extendPath(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 0 },
      ],
      14,
    );
    expect(out[out.length - 1]).toEqual({ x: 24, y: 0 });
  });
});
