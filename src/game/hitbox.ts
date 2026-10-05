import type Phaser from 'phaser';
import { Filters } from '../core/collision';
import type { HitboxShape } from '../core/combo';
import {
  TargetGate,
  canDamage,
  makeHitGate,
  orderTargets,
  type Hit,
  type HitReport,
  type Team,
  type Vec2,
} from '../core/hit';
import { PALETTE } from './art/palette';
import { deferContact, tagBody, type Hittable, type Rect } from './bodyTags';
import { isDebug } from './debug';

/**
 * Chamado a cada golpe aceito pelo alvo (`receiveHit` devolveu true), com o ponto de contato (faísca + hitstop).
 * `target` (T22, DIV-11/DIV-12) é o alvo de verdade, só passado pelo `AttackHitbox`: quem precisa dele depois do
 * toque (ex.: o Punho Divergente, para o 2º impacto no mesmo alvo) o guarda; os outros ignoram o 3º argumento.
 */
export type OnConnect = (hit: Hit, point: Vec2, target?: Hittable) => void;

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
  /** x de quem ataca neste frame: a referência da distância que ordena os alvos (TGT-04). */
  ownerX: number;
}

/**
 * Hitbox de um golpe corpo a corpo: um sensor Matter à frente de quem ataca, aberto na fase ativa do golpe.
 * Cada alvo leva o golpe uma vez só por abertura (makeHitGate), e o dono nunca se acerta. Com `maxTargets` o portão
 * é o `TargetGate`: os toques do passo são juntados e a decisão sai na fila adiada, do alvo mais perto para o mais
 * longe (TGT-03..06). O retângulo só aparece no modo debug (FIX-02/04); o golpe em si é mostrado pela animação.
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
    /** Ajusta o golpe logo antes de entregá-lo a cada alvo (bônus do contra-ataque, DOD-08). */
    private readonly prepareHit?: (hit: Hit) => Hit,
  ) {}

  get isOpen(): boolean {
    return this.current !== null;
  }

  /**
   * Abre a hitbox (fechando a anterior, se houver) na posição de quem ataca. Sem `maxTargets` (inimigo, chefe) cada
   * alvo é entregue no toque; com ele, vale o limite de alvos do golpe.
   */
  open(shape: HitboxShape, hit: Hit, x: number, y: number, facing: 1 | -1, maxTargets?: number): void {
    this.close();
    const gate = makeHitGate(this.ownerId);
    const targetGate = maxTargets === undefined ? null : new TargetGate(this.ownerId, maxTargets);
    /** Alvos tocados no passo que ainda esperam a fila adiada (só com `maxTargets`). */
    const touched: Hittable[] = [];
    const body = this.scene.matter.add.rectangle(0, 0, shape.width, shape.height, {
      isSensor: true,
      isStatic: true,
      collisionFilter: { ...Filters.hitbox },
    });
    /** Entrega o golpe ao alvo e devolve o desfecho para o portão. Faísca e hitstop só no golpe aceito (FX-06). */
    const deliver = (target: Hittable): 'accepted' | 'blocked' | 'refused' => {
      const delivered = this.prepareHit ? this.prepareHit(hit) : hit;
      const report: HitReport = {};
      if (!target.receiveHit(delivered, report)) return report.blocked ? 'blocked' : 'refused';
      // Posição + tamanho da hitbox (a posição do corpo sensor), nunca body.bounds.
      const { x, y } = body.position;
      this.onConnect?.(delivered, contactWith({ x, y, width: shape.width, height: shape.height }, target), target);
      return 'accepted';
    };
    /** Decide os alvos do passo: os mais perto primeiro, até acabarem as vagas (TGT-03, TGT-04). */
    const decide = (): void => {
      const ownerX = this.current?.ownerX ?? x;
      const candidates = touched.splice(0).map((target) => ({
        id: target.id,
        target,
        dist: Math.abs((target.hurtRect?.().x ?? body.position.x) - ownerX),
      }));
      for (const { id, target } of orderTargets(candidates)) {
        if (targetGate?.wants(id)) targetGate.note(id, deliver(target));
      }
    };
    tagBody(body, {
      kind: 'active',
      onTouch: (other) => {
        if (other.kind !== 'character' || !canDamage(this.team, other.target.team)) return;
        if (!targetGate) {
          if (gate(other.target.id)) deliver(other.target);
          return;
        }
        if (!targetGate.wants(other.target.id) || touched.includes(other.target)) return;
        touched.push(other.target);
        if (touched.length === 1) deferContact(decide);
      },
    });
    const color = hit.strength === 'heavy' ? PALETTE.A : PALETTE.w;
    // Só com o desenho da física ligado (`H` no debug): com o `?debug` sozinho o retângulo piscava na frente do golpe.
    const shown = isDebug() && this.scene.matter.world.drawDebug;
    const view = this.scene.add.rectangle(0, 0, shape.width, shape.height, color, 0.35).setVisible(shown);
    this.current = { body, view, shape, ownerX: x };
    this.follow(x, y, facing);
  }

  /** Mantém a hitbox à frente de quem ataca; chamar todo frame. */
  follow(x: number, y: number, facing: 1 | -1): void {
    if (!this.current) return;
    const { body, view, shape } = this.current;
    this.current.ownerX = x;
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
