import type Phaser from 'phaser';
import { Filters } from '../core/collision';
import type { HitboxShape } from '../core/combo';
import { canDamage, makeHitGate, type Hit, type Team, type Vec2 } from '../core/hit';
import { PALETTE } from './art/palette';
import { tagBody, type Hittable, type Rect } from './bodyTags';
import { isDebug } from './debug';

/** Chamado a cada golpe aceito pelo alvo (`receiveHit` devolveu true), com o ponto de contato (faísca + hitstop). */
export type OnConnect = (hit: Hit, point: Vec2) => void;

/**
 * Ponto de contato entre quem bate e quem apanha: o centro da interseção dos dois retângulos. Se eles não se
 * cruzam num eixo (o sensor tocou uma parte do ragdoll fora do retângulo), vale o meio do vão nesse eixo.
 */
export function contactPoint(a: Rect, b: Rect): Vec2 {
  const mid = (ac: number, as: number, bc: number, bs: number): number =>
    (Math.max(ac - as / 2, bc - bs / 2) + Math.min(ac + as / 2, bc + bs / 2)) / 2;
  return { x: mid(a.x, a.width, b.x, b.width), y: mid(a.y, a.height, b.y, b.height) };
}

/** Ponto de contato de um golpe cuja área é `area`; sem área do alvo, o centro de quem bate. */
export function contactWith(area: Rect, target: Hittable): Vec2 {
  const hurt = target.hurtRect?.();
  return hurt ? contactPoint(area, hurt) : { x: area.x, y: area.y };
}

interface OpenHitbox {
  body: MatterJS.BodyType;
  view: Phaser.GameObjects.Rectangle;
  shape: HitboxShape;
}

/**
 * Hitbox de um golpe corpo a corpo: um sensor Matter à frente de quem ataca, aberto na fase ativa do golpe.
 * Cada alvo leva o golpe uma vez só por abertura (makeHitGate), e o dono nunca se acerta. O retângulo só aparece
 * no modo debug (FIX-02/04); o golpe em si é mostrado pela animação.
 */
export class AttackHitbox {
  private current: OpenHitbox | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly ownerId: number,
    /** Time de quem ataca: o golpe só atinge o outro time (AI-05). */
    private readonly team: Team,
    /** Chamado a cada golpe aceito pelo alvo. */
    private readonly onConnect?: OnConnect,
  ) {}

  get isOpen(): boolean {
    return this.current !== null;
  }

  /** Abre a hitbox (fechando a anterior, se houver) na posição de quem ataca. */
  open(shape: HitboxShape, hit: Hit, x: number, y: number, facing: 1 | -1): void {
    this.close();
    const gate = makeHitGate(this.ownerId);
    const body = this.scene.matter.add.rectangle(0, 0, shape.width, shape.height, {
      isSensor: true,
      isStatic: true,
      collisionFilter: { ...Filters.hitbox },
    });
    tagBody(body, {
      kind: 'active',
      onTouch: (other) => {
        if (other.kind !== 'character' || !canDamage(this.team, other.target.team) || !gate(other.target.id)) return;
        if (!other.target.receiveHit(hit)) return; // ignorado: sem faísca nem hitstop (FX-06)
        // Posição + tamanho da hitbox (a posição do corpo sensor), nunca body.bounds.
        const { x, y } = body.position;
        this.onConnect?.(hit, contactWith({ x, y, width: shape.width, height: shape.height }, other.target));
      },
    });
    const color = hit.strength === 'heavy' ? PALETTE.A : PALETTE.w;
    const view = this.scene.add.rectangle(0, 0, shape.width, shape.height, color, 0.35).setVisible(isDebug());
    this.current = { body, view, shape };
    this.follow(x, y, facing);
  }

  /** Mantém a hitbox à frente de quem ataca; chamar todo frame. */
  follow(x: number, y: number, facing: 1 | -1): void {
    if (!this.current) return;
    const { body, view, shape } = this.current;
    const hx = x + shape.offsetX * facing;
    const hy = y + shape.offsetY;
    this.scene.matter.body.setPosition(body, { x: hx, y: hy });
    view.setPosition(hx, hy);
  }

  close(): void {
    if (!this.current) return;
    this.scene.matter.world.remove(this.current.body);
    this.current.view.destroy();
    this.current = null;
  }
}
