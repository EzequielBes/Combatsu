import { BOSS_AFFIX, type BossAffixId } from '../data/bossAffixes';
import { BOSS } from '../data/tuning';
import type { BossLineup } from './bossAffix';

export type BossArchetype = 'oni' | 'tecela';

export interface BossSpec {
  name: string;
  archetype: BossArchetype;
  maxHp: number;
  /** O fio da Chuva de Fios usa o dano de `projectile`; `lava` é o tique do Ígneo e `beam` o feixe do Sangue. */
  damage: { charge: number; leap: number; shockwave: number; projectile: number; lava: number; beam: number };
  projectileSpeed: number;
  volleyCount: number;
  /** Afixos na ordem da escalação (vazio sem escalação). */
  affixes: readonly BossAffixId[];
  /** Moldura Portador de Dedo (PDD-03..05). */
  finger: boolean;
  /** Escala do sprite e do corpo: 1, ou 1,25 no Portador (PDD-03). */
  bodyScale: number;
}

/** Parte da tuning dos afixos que a especificação usa: danos de lava e feixe e os números do Portador. */
export interface BossSpecAffixTuning {
  lava: { damage: number };
  beam: { damage: number };
  finger: { scale: number; hpMult: number; damageMult: number; extraProjectiles: number };
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

/**
 * Dano base × multiplicador do tier (BTIER-02) × multiplicador do Portador (PDD-04), arredondado uma vez só no fim:
 * `round(base × multTier × 1,5)`, nunca o dano do tier já arredondado vezes 1,5.
 */
function scaledDamage(base: number, mult: number, fingerMult = 1): number {
  return Math.round(base * mult * fingerMult);
}

/**
 * Especificação completa do chefe da rodada `r` (BTIER-01, 02, 05, 07; BLN-08; PDD-03..05): vida, dano de cada
 * ataque, de lava e do feixe, velocidade e contagem de projéteis, escala do corpo, afixos e moldura.
 *
 * Com escalação, o arquétipo, os afixos e o Portador vêm dela. Sem escalação vale a paridade por tier
 * (`archetypeFor`), sem afixos nem Portador, até os chamadores passarem a escalação.
 */
export function bossSpecFor(
  round: number,
  lineup?: BossLineup,
  t = BOSS,
  a: BossSpecAffixTuning = BOSS_AFFIX,
): BossSpec {
  const tier = tierFor(round);
  const archetype = lineup?.archetype ?? archetypeFor(tier);
  const finger = lineup?.finger ?? false;
  const mult = bossDamageMultFor(tier, t.tier);
  const fm = finger ? a.finger.damageMult : 1;
  const isTecela = archetype === 'tecela';
  const baseHp = bossHpFor(tier, t.tier);
  return {
    name: t.archetypes[archetype].name,
    archetype,
    maxHp: finger ? Math.round(baseHp * a.finger.hpMult) : baseHp,
    damage: {
      charge: scaledDamage(t.charge.damage, mult, fm),
      leap: scaledDamage(t.leap.damage, mult, fm),
      shockwave: scaledDamage(t.shockwave.damage, mult, fm),
      projectile: scaledDamage(t.volley.damage, mult, fm),
      lava: scaledDamage(a.lava.damage, mult, fm),
      beam: scaledDamage(a.beam.damage, mult, fm),
    },
    projectileSpeed: isTecela ? t.volley.speed * t.archetypes.tecela.projectileSpeedMult : t.volley.speed,
    volleyCount:
      (isTecela ? t.archetypes.tecela.volleyCount : t.volley.count) + (finger ? a.finger.extraProjectiles : 0),
    affixes: lineup?.affixes ?? [],
    finger,
    bodyScale: finger ? a.finger.scale : 1,
  };
}
