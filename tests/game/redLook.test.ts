/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import { shockRingRadius } from '../../src/game/techFx/redLook';
import orbSource from '../../src/game/techFx/RedOrb.ts?raw';
import detonationSource from '../../src/game/techFx/redDetonation.ts?raw';

describe('TST-03: a detonação do Vermelho tem o tamanho do stat da conjuração', () => {
  it('a onda de choque vai além da esfera na proporção da tabela: 96 → 160 de hoje, 120 → 200, 168 → 280', () => {
    expect(shockRingRadius(96)).toBe(160);
    expect(shockRingRadius(120)).toBe(200);
    expect(shockRingRadius(168)).toBe(280);
  });

  it('a vista recebe o look e não guarda cópia do raio de dano nem do anel', () => {
    // O 160 do `RedOrb.ts` é a velocidade das faíscas da carga, não o anel; o anel só existe no `redDetonation.ts`.
    expect(orbSource).not.toMatch(/\b96\b/);
    expect(detonationSource).not.toMatch(/\b(96|160)\b/);
    expect(orbSource).toContain('detonate(point: Vec2, _facing: 1 | -1, look: RedDetonationLook)');
    // VRM-05: o `onSphere` só devolve ao snapshot o raio que a esfera desenhou; o tamanho continua o do look.
    expect(detonationSource).toContain('detonateSphere(scene, registry, point, look.radius, onSphere)');
    expect(detonationSource).toContain('shockRingRadius(look.radius)');
  });
});
