import type { PropDef } from '../core/props';

export const PROP_DEFS: Record<string, PropDef> = {
  chair: {
    key: 'chair',
    texture: 'chair',
    mass: 8,
    damage: 20,
    durability: 4,
    throwSpeed: 520,
    knockback: 10,
    socket: 'back',
    debrisColor: 0x8d5524,
    tags: ['inflamável'],
  },
  bottle: {
    key: 'bottle',
    texture: 'bottle',
    mass: 1,
    damage: 12,
    durability: 1,
    throwSpeed: 760,
    knockback: 6,
    socket: 'front',
    debrisColor: 0x2a9d8f,
    tags: ['cortante'],
  },
};
