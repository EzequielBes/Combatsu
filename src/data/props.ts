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
    tags: ['cortante'],
  },
};

/**
 * Ferramentas amaldiçoadas (ARM-11, ARM-24), largadas pelo inimigo armado.
 * SPEC_DEVIATION: o design fala em `PROP_DEFS.cursedKnife`/`cursedClub`, mas `PROP_DEFS` é fixado pelo teste
 * existente `tests/data/props.test.ts` ("o level usa só chaves que existem aqui" = ['bottle', 'chair']), porque é
 * o conjunto que `level.ts` sabe spawnar. Ferramentas não nascem no level (só na morte de um inimigo armado), então
 * ficam num mapa próprio para não quebrar esse teste nem misturar as duas origens.
 * Reason: preservar o teste existente sem enfraquecê-lo, como pedem as regras de execução.
 */
export const TOOL_DEFS: Record<'cursedKnife' | 'cursedClub', PropDef> = {
  cursedKnife: {
    key: 'cursedKnife',
    texture: 'cursedKnife',
    mass: 1,
    damage: 16,
    durability: 6,
    throwSpeed: 820,
    knockback: 6,
    socket: 'front',
    tags: ['amaldiçoado'],
  },
  cursedClub: {
    key: 'cursedClub',
    texture: 'cursedClub',
    mass: 6,
    damage: 26,
    durability: 5,
    throwSpeed: 480,
    knockback: 12,
    socket: 'back',
    tags: ['amaldiçoado'],
  },
};
