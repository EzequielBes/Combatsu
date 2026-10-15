import { describe, expect, it } from 'vitest';
import { pickSwapTarget, swapPlacement, swapStunMs, type SwapCandidate } from '../../src/core/swap';
import type { Box } from '../../src/core/axisRule';

const ORIGIN = { x: 0, y: 0 };
const enemy = (id: number, x: number, y = 0): SwapCandidate => ({ id, kind: 'enemy', center: { x, y } });

describe('BOO-03: o candidato mais perto à frente, no alcance', () => {
  it('escolhe o mais perto entre os da frente', () => {
    const t = pickSwapTarget(ORIGIN, 1, 220, [enemy(1, 150), enemy(2, 90), enemy(3, -50)]);
    expect(t?.id).toBe(2);
  });

  it('quem está atrás não conta, mesmo mais perto', () => {
    expect(pickSwapTarget(ORIGIN, 1, 220, [enemy(1, -10)])).toBeNull();
    expect(pickSwapTarget(ORIGIN, -1, 220, [enemy(1, -10)])?.id).toBe(1);
  });

  it('na mesma linha vertical (dx = 0) fica de fora', () => {
    expect(pickSwapTarget(ORIGIN, 1, 220, [enemy(1, 0, -40)])).toBeNull();
  });

  it('alcance pela distância entre centros, com a borda inclusa', () => {
    expect(pickSwapTarget(ORIGIN, 1, 220, [enemy(1, 220)])?.id).toBe(1);
    expect(pickSwapTarget(ORIGIN, 1, 220, [enemy(1, 221)])).toBeNull();
    expect(pickSwapTarget(ORIGIN, 1, 220, [enemy(1, 200, 100)])).toBeNull(); // hypot ≈ 223,6
  });

  it('empate de distância: menor id', () => {
    expect(pickSwapTarget(ORIGIN, 1, 220, [enemy(5, 100), enemy(4, 100)])?.id).toBe(4);
  });

  it('orbe e projétil também servem', () => {
    const orb: SwapCandidate = { id: 9, kind: 'orb', center: { x: 50, y: -20 } };
    expect(pickSwapTarget(ORIGIN, 1, 220, [enemy(1, 100), orb])?.id).toBe(9);
  });
});

const PLAYER: Box = { x: 0, y: 0, width: 20, height: 60 }; // centro (10, 30), pés em 60
const always = (): boolean => true;

describe('BOO-04: regra de segurança da troca', () => {
  it('corpo troca de pés alinhados nos dois sentidos', () => {
    const boss: SwapCandidate = { id: 1, kind: 'boss', center: { x: 200, y: 20 }, size: { width: 40, height: 80 } };
    const p = swapPlacement(PLAYER, boss, always);
    // pés do chefe em 60: a caixa do player fica com o fundo em 60, centrada em x = 200
    expect(p).toEqual({ ok: true, playerBox: { x: 190, y: 0, width: 20, height: 60 }, targetCenter: { x: 10, y: 20 } });
  });

  it('orbe troca centro com centro', () => {
    const orb: SwapCandidate = { id: 2, kind: 'orb', center: { x: 100, y: -10 } };
    const p = swapPlacement(PLAYER, orb, always);
    expect(p).toEqual({
      ok: true,
      playerBox: { x: 90, y: -40, width: 20, height: 60 },
      targetCenter: { x: 10, y: 30 },
    });
  });

  it('a caixa do player que não cabe recusa', () => {
    const p = swapPlacement(PLAYER, enemy(1, 100), (box) => box.x < 50);
    expect(p).toEqual({ ok: false, reason: 'blockedPlayer' });
  });

  it('a caixa do alvo que não cabe no lugar do player recusa', () => {
    const big: SwapCandidate = { id: 1, kind: 'boss', center: { x: 200, y: 20 }, size: { width: 40, height: 80 } };
    const p = swapPlacement(PLAYER, big, (box) => box.width !== 40);
    expect(p).toEqual({ ok: false, reason: 'blockedTarget' });
  });

  it('o predicado recebe a caixa do destino', () => {
    const seen: Box[] = [];
    swapPlacement(PLAYER, enemy(1, 100), (box) => {
      seen.push(box);
      return true;
    });
    expect(seen).toEqual([{ x: 90, y: -30, width: 20, height: 60 }]); // sem caixa: centro com centro
  });
});

describe('BOO-06: só o comum fica tonto', () => {
  it('comum 400, chefe/orbe/projétil 0', () => {
    expect(swapStunMs('enemy', 400)).toBe(400);
    expect(swapStunMs('boss', 400)).toBe(0);
    expect(swapStunMs('orb', 400)).toBe(0);
    expect(swapStunMs('projectile', 400)).toBe(0);
  });
});
