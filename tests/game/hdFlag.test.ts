import { describe, expect, it } from 'vitest';
import { strikeToWorld } from '../../src/core/strikePath';
import { hdEnabled } from '../../src/game/art/hd/flag';
import { screenFor, zoom } from '../../src/game/art/hd/screen';
import { MOVE_PHASE_FRAMES, moveFrameName, type MovePhase } from '../../src/game/art/hd/frames';
import { HD_MIN_FRAME_MS, hdMoveFrame } from '../../src/game/art/hd/sheet';
import { ART_SCALE } from '../../src/game/art/palette';

const DEF = { startupMs: 90, activeMs: 90, recoveryMs: 260 };

describe('hdEnabled', () => {
  it('fica ligado por padrão e só desliga com hd=0', () => {
    expect(hdEnabled('')).toBe(true);
    expect(hdEnabled('?debug')).toBe(true);
    expect(hdEnabled('?hd=1')).toBe(true);
    expect(hdEnabled('?hd')).toBe(true);
    expect(hdEnabled('?hd=0')).toBe(false);
    expect(hdEnabled('?debug&hd=0')).toBe(false);
  });
});

describe('hdMoveFrame', () => {
  it('reparte cada fase em fatias iguais do tempo da fase', () => {
    const f = (phase: MovePhase, i: number): string => moveFrameName('ganchoAscendente', phase, i);
    expect(hdMoveFrame('ganchoAscendente', 'startup', 0, DEF)).toBe(f('startup', 0));
    expect(hdMoveFrame('ganchoAscendente', 'startup', 44, DEF)).toBe(f('startup', 0));
    expect(hdMoveFrame('ganchoAscendente', 'startup', 45, DEF)).toBe(f('startup', 1));
    expect(hdMoveFrame('ganchoAscendente', 'active', 0, DEF)).toBe(f('active', 0));
    expect(hdMoveFrame('ganchoAscendente', 'active', 89, DEF)).toBe(f('active', 1));
    expect(hdMoveFrame('ganchoAscendente', 'recovery', 0, DEF)).toBe(f('recovery', 0));
    expect(hdMoveFrame('ganchoAscendente', 'recovery', 180, DEF)).toBe(f('recovery', 2));
  });

  it('não passa do último quadro nem do primeiro', () => {
    expect(hdMoveFrame('ganchoAscendente', 'recovery', 9999, DEF)).toBe(
      moveFrameName('ganchoAscendente', 'recovery', MOVE_PHASE_FRAMES.recovery - 1),
    );
    expect(hdMoveFrame('ganchoAscendente', 'startup', -10, DEF)).toBe(moveFrameName('ganchoAscendente', 'startup', 0));
  });

  it('fase curta demais para dois quadros de 33 ms mostra só o primeiro', () => {
    const quick = { startupMs: 60, activeMs: 80, recoveryMs: 120 };
    expect(hdMoveFrame('ganchoAscendente', 'startup', 59, quick)).toBe(moveFrameName('ganchoAscendente', 'startup', 0));
    expect(hdMoveFrame('ganchoAscendente', 'active', 79, quick)).toBe(moveFrameName('ganchoAscendente', 'active', 1));
    expect(Math.floor(quick.startupMs / HD_MIN_FRAME_MS)).toBe(1);
  });

  it('golpe sem arte HD ou fase desconhecida: undefined', () => {
    expect(hdMoveFrame('golpeQueNaoExiste', 'startup', 0, DEF)).toBeUndefined();
    expect(hdMoveFrame('ganchoAscendente', 'idle', 0, DEF)).toBeUndefined();
    expect(hdMoveFrame('ganchoAscendente', 'window', 0, DEF)).toBeUndefined();
  });
});

describe('strikeToWorld com px por texel', () => {
  const pt = { col: 40, row: 10 };
  const at = { x: 100, footY: 200 };
  const frame = { originCol: 36, rows: 80 };

  it('texelPx 1 mede em px de mundo; sem o campo vale ART_SCALE', () => {
    expect(strikeToWorld(pt, at, 1, { ...frame, texelPx: 1 })).toEqual({ x: 104, y: 200 - (80 - 10 - 0.5) });
    expect(strikeToWorld(pt, at, 1, frame)).toEqual({
      x: 100 + 4 * ART_SCALE,
      y: 200 - (80 - 10 - 0.5) * ART_SCALE,
    });
  });

  it('facing -1 espelha o deslocamento horizontal', () => {
    expect(strikeToWorld(pt, at, -1, { ...frame, texelPx: 1 }).x).toBe(96);
  });
});

describe('tela', () => {
  it('sem HD nada muda: 960x540 e o zoom dos dados', () => {
    const s = screenFor(false);
    expect(s).toEqual({ w: 960, h: 540, zoomFactor: 1 });
    expect(zoom(1.5, s)).toBe(1.5);
  });

  it('com HD: 1280x720 e zoom x 4/3 (o zoom base 1,5 vira 2)', () => {
    const s = screenFor(true);
    expect(s).toEqual({ w: 1280, h: 720, zoomFactor: 4 / 3 });
    expect(zoom(1.5, s)).toBeCloseTo(2, 12);
    expect(s.w / zoom(1.5, s)).toBeCloseTo(640, 9);
    expect(s.h / zoom(1.5, s)).toBeCloseTo(360, 9);
  });
});
