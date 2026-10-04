// Boneco articulado 2D (spike boneco-articulado): RIG-01..07 e EDG-01, derivados da spec em .specs/features/boneco-articulado/spec.md.
import { describe, expect, it } from 'vitest';
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
