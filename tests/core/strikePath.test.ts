import { describe, expect, it } from 'vitest';
import { strikeToBody, strikeToWorld, trailStyle } from '../../src/core/strikePath';

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
