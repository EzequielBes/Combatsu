import type { MoveDef } from '../data/moves';
import { BODY_AXES } from '../data/techAxes';
import { axisAt } from './axisRule';
import type { Hit } from './hit';
import { relicStrikeMul, relicTechMul, type Arsenal } from './arsenal';
import { strikeMultiplier, type Perks } from './build';
import { NEUTRAL_DOMAIN_MODS, type DomainStatMods } from './domainEffects';
import type { VowEffects } from './vows';

/** Traços de um golpe corpo a corpo que as passivas, a relíquia e os votos leem (BLD-06, ARS-05, VOW-10..12). */
export interface MeleeTraits {
  heavy: boolean;
  light: boolean;
  counter: boolean;
  /** Primeiro golpe depois de uma esquiva perfeita, com o Passo sombrio armado. */
  shadow: boolean;
}

/** Traços do golpe `move`; `shadow` diz se o Passo sombrio está armado (quem gasta é o `BuildDirector`). */
export function traitsOf(move: MoveDef, shadow: boolean): MeleeTraits {
  return { heavy: move.strength === 'heavy', light: move.strength === 'light', counter: !!move.counter, shadow };
}

/** POW-11: objeto do mundo e arma vinculada batem como golpe forte, sem contra nem Passo sombrio. */
export const PROP_TRAITS: Readonly<MeleeTraits> = Object.freeze({
  heavy: true,
  light: false,
  counter: false,
  shadow: false,
});

/** Multiplicadores lidos pelo `strikes.ts` ao abrir a hitbox; `damage` é o multiplicador, não o dano. */
export interface StrikeMods {
  damage: number;
  force: number;
  /** Px a mais da hitbox para a frente (Alcance do Corpo, CRP-05). */
  reachPx: number;
  /** Multiplicador do `recovery` (Ritmo do Corpo, CRP-04). */
  recoveryMul: number;
  /** Marcas que o golpe leva no `Hit` (Peso e Cadência do Corpo, CRP-03, CRP-08, CRP-09). */
  marks: Pick<Hit, 'knockdown' | 'wallStun' | 'decisive' | 'maxHpBonus'>;
}

/** O golpe do `MOVES` sem nada do Corpo: dano e força 1, hitbox e `recovery` iguais, nenhuma marca. */
export const NO_STRIKE_MODS: Readonly<StrikeMods> = Object.freeze({
  damage: 1,
  force: 1,
  reachPx: 0,
  recoveryMul: 1,
  marks: Object.freeze({}),
});

export interface StatInput {
  perks: Perks;
  arsenal: Arsenal;
  /** Efeitos dos votos já agregados (a Fúria já vem com os abates). */
  vows: VowEffects;
  /** Vida máxima pelos modificadores da loja, antes do voto. */
  baseMaxHp: number;
  /** Pontos do Impacto do Corpo (0 a 3, CRP-02); ausente = 0. */
  impact?: number;
  /** O que o Domínio ativo muda (JAC-04, JAC-05, AMP-05); ausente = neutro. */
  domain?: DomainStatMods;
}

/** Os números do combate que saem de passivas, arsenal e votos juntos (POW-01). */
export interface StatSheet {
  /** Multiplicador de dano do golpe corpo a corpo com os traços `t`. */
  meleeMul(t: MeleeTraits): number;
  /** Dano das técnicas pela relíquia (`loadout.damageMul`). */
  relicTechMul: number;
  /** Dano das técnicas pelos votos (`loadout.vowDamageMul`). */
  vowTechMul: number;
  /** Custo de energia das técnicas (`loadout.costMul`). */
  costMul: number;
  /** Dano que o player sofre (`player.damageTakenMul`). */
  damageTakenMul: number;
  /** Vida máxima já com o voto (`player.setMaxHp`). */
  maxHp: number;
  /** Guarda e parry desligados (Sem guarda). */
  guardOff: boolean;
  /** Custo das técnicas pelo Domínio (`loadout.domainCostMul`): 0 no jackpot, 0,5 na falha, 1 fora. */
  domainCostMul: number;
  /** Recarga das técnicas pelo Domínio (`loadout.domainCooldownMul`). */
  domainCooldownMul: number;
}

/** Parte dos votos no golpe corpo a corpo, agrupada como o `VowDirector.strikeMul` de antes (o ponto flutuante depende). */
function vowStrikeMul(vows: VowEffects, heavy: boolean): number {
  return vows.damageMul * vows.meleeMul * (heavy ? vows.heavyMul : 1);
}

/**
 * POW-01: único lugar que combina passivas, arsenal e votos. A ordem dos fatores é a de antes (build × arsenal ×
 * votos), para o `Math.round` do dano cair no mesmo inteiro.
 */
export function statSheet(input: StatInput): StatSheet {
  const { perks, arsenal, vows, baseMaxHp, impact = 0, domain = NEUTRAL_DOMAIN_MODS } = input;
  const impactMul = axisAt(BODY_AXES.impacto.impactMul, impact);
  return {
    // O Domínio multiplica por último: neutro, o número fica igual ao de antes.
    meleeMul: (t) =>
      strikeMultiplier(perks, t) *
      relicStrikeMul(arsenal, t.light) *
      vowStrikeMul(vows, t.heavy) *
      impactMul *
      domain.meleeMul,
    relicTechMul: relicTechMul(arsenal),
    vowTechMul: vows.techDamageMul * vows.damageMul,
    costMul: vows.techCostMul,
    damageTakenMul: vows.damageTakenMul,
    maxHp: Math.round(baseMaxHp * vows.maxHpMul),
    guardOff: vows.guardOff,
    domainCostMul: domain.costMul,
    domainCooldownMul: domain.cooldownMul,
  };
}
