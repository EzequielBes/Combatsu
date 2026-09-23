import type { Hit } from '../core/hit';

/** Qualquer coisa que pode levar um golpe (player, inimigo). */
export interface Hittable {
  readonly id: number;
  receiveHit(hit: Hit): void;
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
