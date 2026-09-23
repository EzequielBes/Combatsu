import { describe, expect, it } from 'vitest';
import { validatePropDef } from '../../src/core/props';
import { PROP_DEFS } from '../../src/data/props';
import { TEX } from '../../src/game/textures';

describe('PROP_DEFS', () => {
  it('todas as definições são válidas e apontam para texturas existentes', () => {
    const textures: string[] = Object.values(TEX);
    for (const d of Object.values(PROP_DEFS)) {
      expect(() => validatePropDef(d)).not.toThrow();
      expect(textures).toContain(d.texture);
    }
  });

  it('cadeira é pesada e resistente, garrafa é leve e frágil', () => {
    const { chair, bottle } = PROP_DEFS;
    expect(chair.mass).toBeGreaterThan(bottle.mass);
    expect(chair.durability).toBeGreaterThan(bottle.durability);
    expect(bottle.durability).toBe(1);
  });

  it('o level usa só chaves que existem aqui', () => {
    expect(Object.keys(PROP_DEFS).sort()).toEqual(['bottle', 'chair']);
  });
});
