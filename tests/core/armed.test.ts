import { describe, expect, it } from 'vitest';
import { armFor, propName, rareDef, PROP_NAMES } from '../../src/core/armed';
import { scaleFor, type EnemyBase } from '../../src/core/difficulty';
import { validatePropDef } from '../../src/core/props';
import { ARMED, DIFFICULTY, ENEMY, ENEMY_AI, ENEMY_ATTACK } from '../../src/data/tuning';
import { TOOL_DEFS } from '../../src/data/props';

const BASE: EnemyBase = { brain: ENEMY, ai: ENEMY_AI, attack: ENEMY_ATTACK };

describe('armFor: cursedKnife (ARM-05, ARM-20, ARM-21)', () => {
  it('rodada 1 (dano base 12): dano 15, hitbox +8 de largura e +4 de offsetX, força e preparo iguais', () => {
    const base = scaleFor(1, BASE, DIFFICULTY);
    const armed = armFor('cursedKnife', base, ARMED);
    expect(armed.attack.damage).toBe(15);
    expect(armed.attack.hitbox!.width).toBe(base.attack.hitbox!.width + 8);
    expect(armed.attack.hitbox!.offsetX).toBe(base.attack.hitbox!.offsetX + 4);
    expect(armed.attack.force).toBe(base.attack.force);
    expect(armed.attack.strength).toBe(base.attack.strength);
    expect(armed.ai.windupMs).toBe(base.ai.windupMs);
  });

  it('rodada 10 escalada (dano base 21): dano 26', () => {
    const base = scaleFor(10, BASE, DIFFICULTY);
    expect(base.attack.damage).toBe(21);
    const armed = armFor('cursedKnife', base, ARMED);
    expect(armed.attack.damage).toBe(26);
  });

  it('não muta o `base` recebido', () => {
    const base = scaleFor(1, BASE, DIFFICULTY);
    const before = JSON.parse(JSON.stringify(base));
    armFor('cursedKnife', base, ARMED);
    expect(base).toEqual(before);
  });
});

describe('armFor: cursedClub (ARM-06, ARM-07, ARM-22, ARM-23)', () => {
  it('rodada 1: dano 19, strength heavy, hitbox +12 de largura e +6 de offsetX, preparo 450 -> 600', () => {
    const base = scaleFor(1, BASE, DIFFICULTY);
    const armed = armFor('cursedClub', base, ARMED);
    expect(armed.attack.damage).toBe(19);
    expect(armed.attack.strength).toBe('heavy');
    expect(armed.attack.hitbox!.width).toBe(base.attack.hitbox!.width + 12);
    expect(armed.attack.hitbox!.offsetX).toBe(base.attack.hitbox!.offsetX + 6);
    expect(armed.ai.windupMs).toBe(base.ai.windupMs + 150);
    expect(base.ai.windupMs).toBe(450);
    expect(armed.ai.windupMs).toBe(600);
  });

  it('não muta o `base` recebido', () => {
    const base = scaleFor(1, BASE, DIFFICULTY);
    const before = JSON.parse(JSON.stringify(base));
    armFor('cursedClub', base, ARMED);
    expect(base).toEqual(before);
  });
});

describe('TOOL_DEFS.cursedKnife e cursedClub (ARM-11, ARM-24)', () => {
  it('faca: dano 16, durabilidade 6, arremesso 820, empurrão 6, massa 1, socket front, def válida', () => {
    const knife = TOOL_DEFS.cursedKnife;
    expect(knife).toMatchObject({ damage: 16, durability: 6, throwSpeed: 820, knockback: 6, mass: 1, socket: 'front' });
    expect(() => validatePropDef(knife)).not.toThrow();
  });

  it('porrete: dano 26, durabilidade 5, arremesso 480, empurrão 12, massa 6, socket back, def válida', () => {
    const club = TOOL_DEFS.cursedClub;
    expect(club).toMatchObject({ damage: 26, durability: 5, throwSpeed: 480, knockback: 12, mass: 6, socket: 'back' });
    expect(() => validatePropDef(club)).not.toThrow();
  });
});

describe('rareDef (RAR-02, RAR-06)', () => {
  it('faca rara: dano 24, durabilidade 8, chave com sufixo Rare', () => {
    const rare = rareDef(TOOL_DEFS.cursedKnife);
    expect(rare.damage).toBe(24);
    expect(rare.durability).toBe(8);
    expect(rare.key).toBe('cursedKnifeRare');
    expect(() => validatePropDef(rare)).not.toThrow();
  });

  it('porrete raro: dano 39, durabilidade 7, chave com sufixo Rare', () => {
    const rare = rareDef(TOOL_DEFS.cursedClub);
    expect(rare.damage).toBe(39);
    expect(rare.durability).toBe(7);
    expect(rare.key).toBe('cursedClubRare');
  });
});

describe('PROP_NAMES e propName (ITEM-01, RAR-07)', () => {
  it('nomes em português: Cadeira, Garrafa, Faca Amaldiçoada, Porrete Amaldiçoado', () => {
    expect(PROP_NAMES).toEqual({
      chair: 'Cadeira',
      bottle: 'Garrafa',
      cursedKnife: 'Faca Amaldiçoada',
      cursedClub: 'Porrete Amaldiçoado',
    });
  });

  it('propName devolve o nome comum para uma def comum', () => {
    expect(propName(TOOL_DEFS.cursedKnife)).toBe('Faca Amaldiçoada');
    expect(propName(TOOL_DEFS.cursedClub)).toBe('Porrete Amaldiçoado');
  });

  it('propName termina em " Rara" para uma def rara (RAR-07)', () => {
    expect(propName(rareDef(TOOL_DEFS.cursedKnife))).toBe('Faca Amaldiçoada Rara');
    expect(propName(rareDef(TOOL_DEFS.cursedClub))).toBe('Porrete Amaldiçoado Rara');
  });
});
