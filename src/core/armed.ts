import type { EnemyBase } from './difficulty';
import type { PropDef } from './props';
import type { ArmedTuning } from '../data/tuning';
import type { ToolKey } from './loot';

/** Nome em português de cada objeto comum, pela chave base do `PropDef` (sem o sufixo `Rare`). */
export const PROP_NAMES: Record<string, string> = {
  chair: 'Cadeira',
  bottle: 'Garrafa',
  cursedKnife: 'Faca Amaldiçoada',
  cursedClub: 'Porrete Amaldiçoado',
};

/** Nome em português do objeto, com o sufixo " Rara" quando a def for a versão rara (ITEM-01, RAR-07). */
export function propName(def: PropDef): string {
  const rare = def.key.endsWith('Rare');
  const baseKey = rare ? def.key.slice(0, -'Rare'.length) : def.key;
  const name = PROP_NAMES[baseKey] ?? baseKey;
  return rare ? `${name} Rara` : name;
}

/**
 * Tuning do inimigo com a ferramenta amaldiçoada na mão (ARM-05..07, ARM-20..23): não recebe raridade, porque o
 * inimigo bate igual segurando a versão comum ou a rara (RAR-04) — só o objeto largado muda. Não muta `base`.
 */
export function armFor(tool: ToolKey, base: EnemyBase, t: ArmedTuning): EnemyBase {
  if (tool === 'cursedKnife') {
    const { knife } = t;
    return {
      ...base,
      attack: {
        ...base.attack,
        damage: Math.round(base.attack.damage * knife.dmg),
        hitbox: base.attack.hitbox && {
          ...base.attack.hitbox,
          width: base.attack.hitbox.width + knife.widen,
          offsetX: base.attack.hitbox.offsetX + knife.widen / 2,
        },
      },
    };
  }
  const { club } = t;
  return {
    ...base,
    ai: { ...base.ai, windupMs: base.ai.windupMs + club.windupPlus },
    attack: {
      ...base.attack,
      damage: Math.round(base.attack.damage * club.dmg),
      strength: 'heavy',
      hitbox: base.attack.hitbox && {
        ...base.attack.hitbox,
        width: base.attack.hitbox.width + club.widen,
        offsetX: base.attack.hitbox.offsetX + club.widen / 2,
      },
    },
  };
}

/** Versão rara de um `PropDef` (RAR-02, RAR-06): dano ×1,5 arredondado, durabilidade +2, mesma textura. */
export function rareDef(def: PropDef): PropDef {
  return { ...def, key: `${def.key}Rare`, damage: Math.round(def.damage * 1.5), durability: def.durability + 2 };
}
