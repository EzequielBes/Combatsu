import type { Hit, Team } from '../core/hit';

/** Retângulo pelo centro, em px de mundo. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Qualquer coisa que pode levar um golpe (player, inimigo). */
export interface Hittable {
  readonly id: number;
  readonly team: Team;
  /**
   * Aplica o golpe. Devolve `true` se o alvo aceitou (dano ou reação) e `false` se ignorou (invulnerável, morto,
   * dissolvendo): só golpe aceito gera faísca, tremida e hitstop (FX-06).
   */
  receiveHit(hit: Hit): boolean;
  /**
   * Área de quem leva o golpe, para achar o ponto de contato da faísca. Sai da posição + tamanho do corpo, nunca
   * de `body.bounds` (o Matter alarga o AABB pela velocidade). Sem ela, a faísca sai no centro de quem bate.
   */
  hurtRect?(): Rect;
}

export type BodyTag =
  | { kind: 'terrain' }
  | { kind: 'character'; target: Hittable }
  | { kind: 'active'; onTouch(other: BodyTag): void };

interface BodyLike {
  parent?: BodyLike;
}

const tags = new WeakMap<object, BodyTag>();
let nextId = 1;

export function newEntityId(): number {
  return nextId++;
}

export function tagBody(body: object, tag: BodyTag): void {
  tags.set(body, tag);
}

export function tagOf(body: BodyLike): BodyTag | undefined {
  return tags.get(body) ?? (body.parent ? tags.get(body.parent) : undefined);
}

/** Chamado para cada par do evento collisionstart do Matter. */
export function routeContact(bodyA: BodyLike, bodyB: BodyLike): void {
  const a = tagOf(bodyA);
  const b = tagOf(bodyB);
  if (!a || !b) return;
  if (a.kind === 'active') a.onTouch(b);
  if (b.kind === 'active') b.onTouch(a);
}
