import { describe, expect, it } from 'vitest';
import { strikeToWorld } from '../../src/core/strikePath';
import { hdEnabled } from '../../src/game/art/hd/flag';
import { screenFor, zoom } from '../../src/game/art/hd/screen';
import {
  HD_IDLE_FRAMES,
  HD_IDLE_FRAME_MS,
  HD_UPPERCUT_PHASES,
  hdIdleFrame,
  hdMoveFrame,
} from '../../src/game/art/hd/sheet';
import { ART_SCALE } from '../../src/game/art/palette';

const DEF = { startupMs: 90, activeMs: 90, recoveryMs: 260 };

describe('hdEnabled', () => {
  it('liga só com hd=1', () => {
    expect(hdEnabled('?hd=1')).toBe(true);
    expect(hdEnabled('?debug&hd=1')).toBe(true);
    expect(hdEnabled('?hd=0')).toBe(false);
    expect(hdEnabled('?hd')).toBe(false);
    expect(hdEnabled('?debug')).toBe(false);
    expect(hdEnabled('')).toBe(false);
  });
});

describe('hdIdleFrame', () => {
  it('troca de quadro a cada HD_IDLE_FRAME_MS e dá a volta', () => {
    expect(hdIdleFrame(0)).toBe(HD_IDLE_FRAMES[0]);
    expect(hdIdleFrame(HD_IDLE_FRAME_MS - 1)).toBe(HD_IDLE_FRAMES[0]);
    expect(hdIdleFrame(HD_IDLE_FRAME_MS)).toBe(HD_IDLE_FRAMES[1]);
    expect(hdIdleFrame(HD_IDLE_FRAME_MS * HD_IDLE_FRAMES.length)).toBe(HD_IDLE_FRAMES[0]);
  });

  it('relógio negativo cai no primeiro quadro', () => {
    expect(hdIdleFrame(-50)).toBe(HD_IDLE_FRAMES[0]);
  });
});

describe('hdMoveFrame', () => {
  it('reparte cada fase em fatias iguais do tempo da fase', () => {
    const { startup, active, recovery } = HD_UPPERCUT_PHASES;
    expect(hdMoveFrame('ganchoAscendente', 'startup', 0, DEF)).toBe(startup[0]);
    expect(hdMoveFrame('ganchoAscendente', 'startup', 44, DEF)).toBe(startup[0]);
    expect(hdMoveFrame('ganchoAscendente', 'startup', 45, DEF)).toBe(startup[1]);
    expect(hdMoveFrame('ganchoAscendente', 'active', 0, DEF)).toBe(active[0]);
    expect(hdMoveFrame('ganchoAscendente', 'active', 89, DEF)).toBe(active[1]);
    expect(hdMoveFrame('ganchoAscendente', 'recovery', 0, DEF)).toBe(recovery[0]);
    expect(hdMoveFrame('ganchoAscendente', 'recovery', 130, DEF)).toBe(recovery[2]);
  });

  it('não passa do último quadro nem do primeiro', () => {
    expect(hdMoveFrame('ganchoAscendente', 'recovery', 9999, DEF)).toBe(HD_UPPERCUT_PHASES.recovery[3]);
    expect(hdMoveFrame('ganchoAscendente', 'startup', -10, DEF)).toBe(HD_UPPERCUT_PHASES.startup[0]);
  });

  it('golpe sem arte HD ou fase desconhecida: undefined', () => {
    expect(hdMoveFrame('socoLeve', 'startup', 0, DEF)).toBeUndefined();
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
