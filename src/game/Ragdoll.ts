import Phaser from 'phaser';
import { ragdollFilter } from '../core/collision';
import { normalize, type Vec2 } from '../core/hit';
import { PALETTE } from './art/palette';
import { bodyOf } from './physics';
import { TEX } from './textures';

interface PartSpec {
  key: string;
  dx: number;
  dy: number;
}

/**
 * Posições relativas ao centro do inimigo. Índice 0 = tronco. Poucos segmentos grandes de propósito.
 * Tamanhos vindos da arte (ENEMY_RAG_PARTS, 2 px por texel): tronco 16x20, cabeça 16x14, membro 6x16.
 */
const PARTS: readonly PartSpec[] = [
  { key: TEX.ragTorso, dx: 0, dy: 0 },
  { key: TEX.ragHead, dx: 0, dy: -17 },
  { key: TEX.ragLimb, dx: -11, dy: -1 },
  { key: TEX.ragLimb, dx: 11, dy: -1 },
  { key: TEX.ragLimb, dx: -4, dy: 12 },
  { key: TEX.ragLimb, dx: 4, dy: 12 },
];

/** [parte A, parte B, x da junta, y da junta] relativos ao centro do inimigo: pescoço, ombros, quadris. */
const JOINTS: readonly (readonly [number, number, number, number])[] = [
  [0, 1, 0, -10],
  [0, 2, -8, -7],
  [0, 3, 8, -7],
  [0, 4, -4, 7],
  [0, 5, 4, 7],
];

/** Teto do impulso: acima disso as juntas esticam e o corpo "explode". */
const MAX_FORCE = 14;

export class Ragdoll {
  readonly parts: Phaser.Physics.Matter.Image[];
  private readonly joints: MatterJS.ConstraintType[];

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
  ) {
    const filter = ragdollFilter(scene.matter.world.nextGroup(true));
    this.parts = PARTS.map((p) =>
      scene.matter.add.image(x + p.dx, y + p.dy, p.key, undefined, {
        collisionFilter: { ...filter },
        friction: 0.6,
        frictionAir: 0.03,
        restitution: 0.1,
        density: 0.002,
        chamfer: { radius: 2 },
      }),
    );
    this.joints = JOINTS.map(([a, b, jx, jy]) => {
      const pa = this.parts[a];
      const pb = this.parts[b];
      return scene.matter.add.constraint(bodyOf(pa), bodyOf(pb), 0, 0.7, {
        pointA: { x: x + jx - pa.x, y: y + jy - pa.y },
        pointB: { x: x + jx - pb.x, y: y + jy - pb.y },
        damping: 0.1,
      });
    });
  }

  get bodies(): MatterJS.BodyType[] {
    return this.parts.map(bodyOf);
  }

  get center(): Vec2 {
    const torso = this.parts[0];
    return { x: torso.x, y: torso.y };
  }

  impulse(direction: Vec2, force: number): void {
    const d = normalize(direction);
    const f = Math.min(force, MAX_FORCE);
    for (const p of this.parts) {
      p.setVelocity(d.x * f + Phaser.Math.FloatBetween(-0.6, 0.6), d.y * f + Phaser.Math.FloatBetween(-0.6, 0.6));
    }
    this.parts[0].setAngularVelocity(0.12 * Math.sign(d.x || 1));
  }

  flash(): void {
    for (const p of this.parts) p.setTintFill(PALETTE.w);
    this.scene.time.delayedCall(60, () => {
      for (const p of this.parts) if (p.active) p.clearTint();
    });
  }

  /** Fumaça/energia amaldiçoada + fade. */
  dissolve(durationMs: number): void {
    // Preenchimento (não multiplicação): o corpo vira silhueta roxa da paleta enquanto some (ART-01).
    for (const p of this.parts) p.setTintFill(PALETTE.u);
    this.scene.tweens.add({ targets: this.parts, alpha: 0, duration: durationMs });
    const c = this.center;
    const smoke = this.scene.add.particles(c.x, c.y, TEX.smokeCurse, {
      frame: ['u', 'v', 'U'], // cor de origem vem do frame, sem tint multiplicativo (ART-01)
      speed: { min: 15, max: 60 },
      angle: { min: 200, max: 340 },
      lifespan: 800,
      scale: { start: 1, end: 0 }, // começa no tamanho de texel da textura (ART-03)
      alpha: { start: 0.8, end: 0 },
      emitting: false,
    });
    smoke.explode(30);
    this.scene.time.delayedCall(1000, () => smoke.destroy());
  }

  destroy(): void {
    for (const j of this.joints) this.scene.matter.world.removeConstraint(j);
    for (const p of this.parts) p.destroy();
  }
}
