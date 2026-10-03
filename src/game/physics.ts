import type Phaser from 'phaser';
import type { CollisionFilter } from '../core/collision';
import type { Vec2 } from '../core/hit';
import { StepLerp, stepAlpha } from '../core/stepLerp';

/** Matter mede velocidade em px por step de 1/60 s; a lógica pura usa px/s. */
export const PX_PER_S_TO_STEP = 1 / 60;

/** Limite de delta por frame (aba em segundo plano, GC) antes de entrar na lógica. */
export const MAX_FRAME_MS = 50;

export function bodyOf(go: Phaser.GameObjects.GameObject): MatterJS.BodyType {
  return go.body as MatterJS.BodyType;
}

export function applyFilter(body: MatterJS.BodyType, f: CollisionFilter): void {
  body.collisionFilter.category = f.category;
  body.collisionFilter.mask = f.mask;
  body.collisionFilter.group = f.group;
}

/** O fork do Matter no Phaser respeita body.ignoreGravity. */
export function setIgnoreGravity(body: MatterJS.BodyType, value: boolean): void {
  (body as MatterJS.BodyType & { ignoreGravity: boolean }).ignoreGravity = value;
}

/** Fração entre os dois últimos passos de física a desenhar neste quadro (ITP-01), lida do acumulador do Matter. */
export function renderAlpha(scene: Phaser.Scene): number {
  const runner = scene.matter.world.runner as unknown as { timeBuffer: number; delta: number };
  return stepAlpha(runner.timeBuffer, runner.delta);
}

/**
 * Posição de desenho de um corpo (ITP-05, ITP-07): guarda a posição a cada passo de física e devolve a interpolada
 * para este quadro. A física, as hitboxes e a lógica continuam lendo o corpo; só o que se vê usa isto.
 */
export class BodyRenderPos {
  private lerp: StepLerp;
  private readonly onStepped = (): void => this.lerp.push(this.body.position);

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly body: MatterJS.BodyType,
  ) {
    this.lerp = new StepLerp(body.position);
    scene.matter.world.on('afterupdate', this.onStepped);
    scene.events.once('shutdown', () => this.stop());
  }

  get(): Vec2 {
    return this.lerp.at(renderAlpha(this.scene));
  }

  /** O corpo foi reposicionado (renascer, nova run): a posição de desenho vai junto, sem deslizar (EDG-02). */
  snap(): void {
    this.lerp = new StepLerp(this.body.position);
  }

  stop(): void {
    this.scene.matter.world?.off('afterupdate', this.onStepped);
  }
}
