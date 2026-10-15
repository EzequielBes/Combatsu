/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import { blueOrbLook } from '../../src/game/techFx/blueLook';
import fxSource from '../../src/game/techFx/BlueOrb.ts?raw';
import techSource from '../../src/game/tech/blue.ts?raw';

describe('TST-03: o halo e a distorção do Azul têm o tamanho do stat da conjuração', () => {
  it('130 dá os números de hoje (halo 40, distorção 58) e cresce junto com o raio', () => {
    expect(blueOrbLook(130)).toEqual({ halo: 40, distort: 58 });
    expect(blueOrbLook(195)).toEqual({ halo: 60, distort: 87 });
    expect(blueOrbLook(65)).toEqual({ halo: 20, distort: 29 });
  });

  it('a vista recebe o raio do adaptador e não guarda cópia dele', () => {
    expect(fxSource).toContain('update(dtMs: number, x: number, y: number, radius: number)');
    expect(fxSource).toContain('blueOrbLook(radius)');
    expect(fxSource).not.toMatch(/\b130\b/);
    expect(techSource).toContain('this.fx.update(dtMs, point.x, point.y, orb.blue.radius)');
  });
});
