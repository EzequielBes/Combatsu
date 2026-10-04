// Boneco articulado 2D (spike boneco-articulado): RIG-01..07 e EDG-01, derivados da spec em .specs/features/boneco-articulado/spec.md.
import { describe, expect, it } from 'vitest';
import { easeInCubic, easeInOutCubic, easeOutBack, inbetween, shortestArc } from '../../src/game/art/rig/interpolate';
import { PALETTE_KEYS } from '../../src/game/art/palette';
import { rasterize } from '../../src/game/art/rig/rasterize';
import { topRowOf } from '../../src/core/frameInvariants';
import { BONES, REST_ANGLES, aimLimb, makePose, measuredLength, solve, type BoneName, type JointName, type Pose } from '../../src/game/art/rig/skeleton';

const JOINTS_REQUIRED: JointName[] = [
  'hip', 'chest', 'neck',
  'shoulderNear', 'shoulderFar', 'elbowNear', 'elbowFar', 'wristNear', 'wristFar',
  'hipNear', 'hipFar', 'kneeNear', 'kneeFar', 'ankleNear', 'ankleFar',
];

/** Poses de teste: repouso e uma sequência de ângulos arbitrários (ossos de qualquer direção). */
function scatteredPose(seed: number): Pose {
  const angles = {} as Record<BoneName, number>;
  BONES.forEach((b, i) => {
    angles[b.name] = REST_ANGLES[b.name] + ((seed * 37 + i * 91) % 360) - 180;
  });
  return makePose({ x: 10 + (seed % 5), y: 20 }, angles);
}

describe('esqueleto (RIG-01)', () => {
  it('define todas as juntas pedidas, cada uma ligada por um osso de comprimento fixo > 0', () => {
    const joints = Object.keys(solve(makePose({ x: 10, y: 22 })));
    for (const j of JOINTS_REQUIRED) expect(joints, j).toContain(j);
    for (const j of JOINTS_REQUIRED.filter((x) => x !== 'hip')) {
      const bone = BONES.find((b) => b.to === j);
      expect(bone, `osso que termina em ${j}`).toBeDefined();
      expect(bone!.length, j).toBeGreaterThan(0);
    }
  });

  it('a hierarquia é quadril -> peito -> pescoço, peito -> ombro -> cotovelo -> pulso, quadril -> quadril -> joelho -> tornozelo', () => {
    const parentOf = (j: JointName): JointName | undefined => BONES.find((b) => b.to === j)?.from;
    expect(parentOf('chest')).toBe('hip');
    expect(parentOf('neck')).toBe('chest');
    for (const side of ['Near', 'Far'] as const) {
      expect(parentOf(`shoulder${side}`)).toBe('chest');
      expect(parentOf(`elbow${side}`)).toBe(`shoulder${side}`);
      expect(parentOf(`wrist${side}`)).toBe(`elbow${side}`);
      expect(parentOf(`hip${side}`)).toBe('hip');
      expect(parentOf(`knee${side}`)).toBe(`hip${side}`);
      expect(parentOf(`ankle${side}`)).toBe(`knee${side}`);
    }
  });
});

describe('comprimento dos ossos (RIG-02)', () => {
  it.each([0, 1, 2, 3, 4, 5, 6, 7])('pose %i: cada osso mede o comprimento definido, com 0,5 texel de tolerância', (seed) => {
    const joints = solve(scatteredPose(seed));
    for (const b of BONES) expect(Math.abs(measuredLength(joints, b) - b.length), `${b.name} na pose ${seed}`).toBeLessThanOrEqual(0.5);
  });

  it('a cinemática inversa mantém os comprimentos, mesmo com o alvo fora de alcance', () => {
    for (const target of [{ x: 14, y: 8 }, { x: 40, y: -30 }, { x: 10.5, y: 20 }]) {
      const joints = solve(aimLimb(makePose({ x: 10, y: 22 }), 'armNear', target, 1));
      for (const b of BONES) expect(Math.abs(measuredLength(joints, b) - b.length), b.name).toBeLessThanOrEqual(0.5);
    }
  });
});

describe('inbetween (RIG-07)', () => {
  const a = makePose({ x: 10, y: 24 }, { spine: 170, thighNear: 350, foreArmNear: 20 });
  const b = makePose({ x: 12, y: 20 }, { spine: 200, thighNear: 10, foreArmNear: -30 });

  it('com t = 0 devolve a pose a e com t = 1 devolve a pose b', () => {
    expect(inbetween(a, b, 0)).toEqual(a);
    expect(inbetween(a, b, 1)).toEqual(b);
  });

  it('devolve cópias: mexer no resultado não altera as poses de entrada', () => {
    const r = inbetween(a, b, 0);
    r.angles.spine = 0;
    expect(a.angles.spine).toBe(170);
  });

  it('interpola pelo menor arco: de 350 a 10 graus passa por 0, não por 180', () => {
    expect(shortestArc(0, inbetween(a, b, 0.5).angles.thighNear)).toBeCloseTo(0, 6);
    expect(shortestArc(350, 10)).toBe(20);
    expect(shortestArc(10, 350)).toBe(-20);
  });

  it('a raiz e os ângulos andam em linha reta no meio do caminho', () => {
    const m = inbetween(a, b, 0.5);
    expect(m.root).toEqual({ x: 11, y: 22 });
    expect(m.angles.spine).toBeCloseTo(185, 6);
    expect(m.angles.foreArmNear).toBeCloseTo(-5, 6);
  });

  it('fora de [0, 1] extrapola (overshoot) e o easing parte de 0 e chega em 1', () => {
    expect(inbetween(a, b, 1.5).root).toEqual({ x: 13, y: 18 });
    for (const ease of [easeInOutCubic, easeInCubic, easeOutBack]) {
      expect(ease(0), ease.name).toBeCloseTo(0, 9);
      expect(ease(1), ease.name).toBeCloseTo(1, 9);
    }
    expect(Math.max(...[0.6, 0.7, 0.8, 0.9].map((t) => easeOutBack(t)))).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------- rasterizador (RIG-03, EDG-01)

/** Poses variadas (repouso, braços erguidos, perna esticada, tronco inclinado) para varrer o rasterizador. */
/** Guarda dentro da grade: braços dobrados na frente do peito, pés no chão. */
const stanceAt = (x: number): Pose => {
  let p = makePose({ x, y: 22.5 });
  p = aimLimb(p, 'armNear', { x: x + 3.5, y: 17.5 }, -1);
  p = aimLimb(p, 'armFar', { x: x + 3, y: 16 }, -1);
  p = aimLimb(p, 'legNear', { x: x + 3, y: 28 }, 1);
  return aimLimb(p, 'legFar', { x: x - 3, y: 28 }, 1);
};
const RASTER_POSES: Array<[string, Pose]> = [
  ['guarda', stanceAt(10)],
  ['braço para cima', aimLimb(makePose({ x: 10, y: 22.5 }), 'armNear', { x: 16, y: 8 }, -1)],
  ['perna para a frente', aimLimb(makePose({ x: 10, y: 22.5 }), 'legNear', { x: 15, y: 25 }, 1)],
  ['tronco para trás', makePose({ x: 10, y: 21 }, { spine: 200 })],
];

describe('rasterize (RIG-03)', () => {
  it.each(RASTER_POSES)('%s: grade de 30 linhas x 32 colunas só com teclas da PALETTE', (_name, pose) => {
    const { frame } = rasterize(pose);
    expect(frame).toHaveLength(30);
    for (const row of frame) {
      expect(row).toHaveLength(32);
      for (const ch of row) expect(ch === '.' || PALETTE_KEYS.has(ch), `tecla '${ch}'`).toBe(true);
    }
  });

  it('o corpo aparece: há texels opacos, a cabeça é carimbada no pescoço e o contorno k existe', () => {
    const { frame } = rasterize(RASTER_POSES[0][1]);
    const opaque = frame.join('').replace(/\./g, '');
    expect(opaque.length).toBeGreaterThan(100);
    expect(topRowOf(frame, ['h', 'H', 'j'])).not.toBeNull();
    expect(opaque).toContain('k');
  });
});

describe('recorte (EDG-01)', () => {
  const opaqueCols = (frame: readonly string[], col: number): number[] => frame.map((r, y) => (r[col] !== '.' ? y : -1)).filter((y) => y >= 0);

  it('uma pose inteira dentro da grade não recorta nada', () => {
    expect(rasterize(RASTER_POSES[0][1]).clipped).toBe(0);
  });

  it('empurrada para fora da borda esquerda, recorta e conta os texels; o que fica é igual ao da pose original', () => {
    const base = stanceAt(14);
    const shift = 9;
    const moved = { root: { x: base.root.x - shift, y: base.root.y }, angles: base.angles };
    const a = rasterize(base);
    const b = rasterize(moved);
    expect(a.clipped).toBe(0);
    expect(b.clipped).toBeGreaterThan(0);
    expect(b.frame).toHaveLength(30);
    for (let x = 0; x < 32 - shift; x++) expect(opaqueCols(b.frame, x), `coluna ${x}`).toEqual(opaqueCols(a.frame, x + shift));
  });

  it('o que cai fora da borda de baixo também é contado', () => {
    const r = rasterize({ ...stanceAt(10), root: { x: 10, y: 28 } });
    expect(r.frame).toHaveLength(30);
    expect(r.clipped).toBeGreaterThan(0);
  });
});
