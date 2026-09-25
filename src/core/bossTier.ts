import { BOSS } from '../data/tuning';

export type BossArchetype = 'oni' | 'tecela';

export interface BossSpec {
  name: string;
  archetype: BossArchetype;
  maxHp: number;
  damage: { charge: number; leap: number; shockwave: number; projectile: number };
  projectileSpeed: number;
  volleyCount: number;
}

/** Tier do chefe da rodada `r` (só chamado em rodada de chefe, `r` múltiplo de 5). */
export function tierFor(round: number): number {
  return round / 5;
}

/** Vida máxima do chefe no tier `t` (BTIER-01): cresce até o teto `hpCap`, arredondada. */
export function bossHpFor(tier: number, t = BOSS.tier): number {
  return Math.round(t.hpBase * Math.min(1 + t.hpPerTier * (tier - 1), t.hpCap));
}

/** Multiplicador de dano dos ataques no tier `t` (BTIER-02), sem arredondar (a task de cada ataque arredonda). */
export function bossDamageMultFor(tier: number, t = BOSS.tier): number {
  return Math.min(1 + t.damagePerTier * (tier - 1), t.damageCap);
}

/**
 * Arquétipo por tier (BTIER-04): "Oni do Portão" nos tiers 1 e 2; a partir do tier 3, alterna por paridade
 * (ímpar = Tecelã de Maldições, par = Oni do Portão).
 */
export function archetypeFor(tier: number): BossArchetype {
  if (tier <= 2) return 'oni';
  return tier % 2 === 1 ? 'tecela' : 'oni';
}

/** Dano base × multiplicador do tier, arredondado a inteiro (BTIER-02). */
function scaledDamage(base: number, mult: number): number {
  return Math.round(base * mult);
}

/**
 * Especificação completa do chefe da rodada `r` (BTIER-01, 02, 04, 05, 07): vida, dano de cada ataque,
 * velocidade e contagem de projéteis, já escalados pelo tier e pelo arquétipo.
 */
export function bossSpecFor(round: number, t = BOSS): BossSpec {
  const tier = tierFor(round);
  const archetype = archetypeFor(tier);
  const mult = bossDamageMultFor(tier, t.tier);
  const isTecela = archetype === 'tecela';
  const archetypeTuning = t.archetypes[archetype];
  return {
    name: archetypeTuning.name,
    archetype,
    maxHp: bossHpFor(tier, t.tier),
    damage: {
      charge: scaledDamage(t.charge.damage, mult),
      leap: scaledDamage(t.leap.damage, mult),
      shockwave: scaledDamage(t.shockwave.damage, mult),
      projectile: scaledDamage(t.volley.damage, mult),
    },
    projectileSpeed: isTecela ? t.volley.speed * t.archetypes.tecela.projectileSpeedMult : t.volley.speed,
    volleyCount: isTecela ? t.archetypes.tecela.volleyCount : t.volley.count,
  };
}
