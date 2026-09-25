import type Phaser from 'phaser';
import type { CollisionFilter } from '../core/collision';

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

/** Vira sensor (sem resposta física, só evento de contato) sem recriar o corpo; usado no salto do chefe. */
export function setSensor(body: MatterJS.BodyType, value: boolean): void {
  body.isSensor = value;
}
