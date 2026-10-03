import type Phaser from 'phaser';
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
  /** `true` se o alvo já morreu (DIV-06: sem isso, o Punho Divergente não sabe cancelar o 2º impacto). */
  isDead?(): boolean;
  /** Sprite visual do alvo (KOK-16: silhueta `b` durante o negativo do Kokusen); ausente sem um sprite próprio. */
  readonly fxSprite?: Phaser.GameObjects.Sprite;
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

const deferred: Array<() => void> = [];

/**
 * Registra uma função para rodar depois que todos os pares do evento foram roteados (TGT-04): é o único ponto em
 * que todos os toques do passo são conhecidos, e a ordem dos pares do Matter não é garantida.
 */
export function deferContact(fn: () => void): void {
  deferred.push(fn);
}

/**
 * Roteia todos os pares do evento collisionstart e só então roda as funções adiadas, na ordem do registro. Uma
 * função registrada durante a fila entra no fim dela e roda no mesmo evento.
 */
export function routeContacts(pairs: ReadonlyArray<{ bodyA: BodyLike; bodyB: BodyLike }>): void {
  for (const pair of pairs) routeContact(pair.bodyA, pair.bodyB);
  try {
    for (let i = 0; i < deferred.length; i += 1) deferred[i]!();
  } finally {
    deferred.length = 0; // uma função que falha não deixa a fila presa para o evento seguinte
  }
}
