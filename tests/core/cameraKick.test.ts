import { describe, expect, it } from 'vitest';
import { CameraKick, ZoomPulse } from '../../src/core/cameraKick';

describe('CAM-01: tranco de 4 px que volta em 120 ms', () => {
  it('no início vale 4 px na direção normalizada', () => {
    const k = new CameraKick();
    k.kick(3, 4);
    const o = k.update(0);
    expect(o.x).toBeCloseTo(2.4, 10);
    expect(o.y).toBeCloseTo(3.2, 10);
    expect(Math.hypot(o.x, o.y)).toBeCloseTo(4, 10);
  });
  it('só horizontal: 4 px para a esquerda', () => {
    const k = new CameraKick();
    k.kick(-10, 0);
    expect(k.update(0).x).toBeCloseTo(-4, 10);
  });
  it('vai a zero em 120 ms e fica em zero depois (os dois lados da borda)', () => {
    const k = new CameraKick();
    k.kick(1, 0);
    expect(k.update(119).x).toBeGreaterThan(0);
    expect(k.update(1)).toEqual({ x: 0, y: 0 });
    expect(k.update(500)).toEqual({ x: 0, y: 0 });
  });
  it('meio do caminho vale metade', () => {
    const k = new CameraKick();
    k.kick(1, 0);
    expect(k.update(60).x).toBeCloseTo(2, 10);
  });
  it('sem kick fica em zero; direção nula não gera NaN', () => {
    const k = new CameraKick();
    expect(k.update(10)).toEqual({ x: 0, y: 0 });
    k.kick(0, 0);
    const o = k.update(0);
    expect(Number.isFinite(o.x) && Number.isFinite(o.y)).toBe(true);
  });
  it('um novo kick reinicia o tempo', () => {
    const k = new CameraKick();
    k.kick(1, 0);
    k.update(100);
    k.kick(0, 1);
    expect(k.update(0).y).toBeCloseTo(4, 10);
  });
});

describe('CAM-02: pulso de zoom 1.5 → 1.6 em 60 ms, segura 200, volta em 120', () => {
  const at = (ms: number): number => {
    const z = new ZoomPulse();
    z.start();
    return z.update(ms);
  };
  it('antes de começar vale 1.5', () => {
    expect(new ZoomPulse().update(100)).toBe(1.5);
  });
  it('sobe até 1.6 em 60 ms (antes da borda ainda abaixo)', () => {
    expect(at(0)).toBeCloseTo(1.5, 10);
    expect(at(30)).toBeCloseTo(1.55, 10);
    expect(at(59)).toBeLessThan(1.6);
    expect(at(60)).toBeCloseTo(1.6, 10);
  });
  it('segura 1.6 até 260 ms e desce depois', () => {
    expect(at(260)).toBeCloseTo(1.6, 10);
    expect(at(261)).toBeLessThan(1.6);
  });
  it('volta a 1.5 em 380 ms e fica', () => {
    expect(at(320)).toBeCloseTo(1.55, 10);
    expect(at(379)).toBeGreaterThan(1.5);
    expect(at(380)).toBeCloseTo(1.5, 10);
    expect(at(1000)).toBe(1.5);
  });
  it('acumula passos de dt e reinicia no novo start', () => {
    const z = new ZoomPulse();
    z.start();
    z.update(30);
    expect(z.update(30)).toBeCloseTo(1.6, 10);
    z.start();
    expect(z.update(0)).toBeCloseTo(1.5, 10);
  });
});
