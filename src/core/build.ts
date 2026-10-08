import {
  BUILD_MIN_POINTS,
  BUILD_WEIGHT,
  PERK,
  PERK_IDS,
  PERK_POINTS,
  PERKS,
  type Build,
  type PerkId,
} from '../data/perks';
import { ARSENAL, type ArsenalId } from '../data/arsenal';
import type { ShopEntryId } from '../data/shop';
import { TECHNIQUES, type TechId } from '../data/techniques';
import type { Arsenal } from './arsenal';
import type { Loadout } from './loadout';
import type { Modifiers } from './modifiers';

/** Passivas compradas na run (BLD-01): cada uma no máximo uma vez; `reset` a cada run nova. */
export class Perks {
  private readonly owned = new Set<PerkId>();

  has(id: PerkId): boolean {
    return this.owned.has(id);
  }

  /** `false` se já tinha. */
  add(id: PerkId): boolean {
    if (this.owned.has(id)) return false;
    this.owned.add(id);
    return true;
  }

  get list(): PerkId[] {
    return PERK_IDS.filter((id) => this.owned.has(id));
  }

  reset(): void {
    this.owned.clear();
  }
}

export type BuildPoints = Record<Build, number>;

const BUILDS: readonly Build[] = ['lutador', 'feiticeiro', 'veloz'];

/**
 * Pontos de afinidade de cada build (BLD-02), só pelo que já foi comprado. A primeira técnica não conta para
 * `feiticeiro`: a loja a garante para todo mundo, então ela não diz nada sobre a escolha do jogador; contam os
 * níveis acima do primeiro, `energia` e `fluxo`. Relíquia e arma vinculada valem o próprio nível na build delas.
 */
export function buildPoints(modifiers: Modifiers, loadout: Loadout, perks: Perks, arsenal?: Arsenal): BuildPoints {
  const techIds = Object.keys(TECHNIQUES) as TechId[];
  const techUpgrades = techIds.reduce((sum, id) => sum + Math.max(0, loadout.levelOf(id) - 1), 0);
  const perkPoints = (build: Build): number =>
    perks.list.filter((id) => PERKS[id].build === build).length * PERK_POINTS;
  const gear = (build: Build): number =>
    [arsenal?.relic, arsenal?.weapon].reduce(
      (sum, slot) => sum + (slot && ARSENAL[slot.id].build === build ? slot.level : 0),
      perkPoints(build),
    );
  return {
    lutador: modifiers.level('forca') + Math.floor(modifiers.level('vida') / 2) + gear('lutador'),
    feiticeiro: techUpgrades + modifiers.level('energia') + modifiers.level('fluxo') + gear('feiticeiro'),
    veloz: modifiers.level('agilidade') + gear('veloz'),
  };
}

/** A build do jogador (BLD-03): a linha com mais pontos, a partir de `BUILD_MIN_POINTS`; empate fica com a primeira. */
export function dominantBuild(points: BuildPoints): Build | null {
  let best: Build | null = null;
  for (const build of BUILDS) {
    if (points[build] < BUILD_MIN_POINTS) continue;
    if (best === null || points[build] > points[best]) best = build;
  }
  return best;
}

/** Build a que uma carta da loja pertence (BLD-04); `null` para as neutras (ímã, sorte, cura). */
export function buildOfEntry(id: ShopEntryId): Build | null {
  if (id in PERKS) return PERKS[id as PerkId].build;
  if (id in ARSENAL) return ARSENAL[id as ArsenalId].build;
  if (id in TECHNIQUES || id === 'energia' || id === 'fluxo') return 'feiticeiro';
  if (id === 'forca' || id === 'vida') return 'lutador';
  if (id === 'agilidade') return 'veloz';
  return null;
}

/** Multiplicador do peso de sorteio de uma carta (BLD-05): cresce com os pontos do jogador na build dela. */
export function buildWeight(id: ShopEntryId, points: BuildPoints): number {
  const build = buildOfEntry(id);
  if (build === null) return 1;
  return 1 + BUILD_WEIGHT.perPoint * Math.min(points[build], BUILD_WEIGHT.maxPoints);
}

export interface StrikeTraits {
  heavy: boolean;
  counter: boolean;
  /** Primeiro golpe depois de uma esquiva perfeita. */
  shadow: boolean;
}

/** Multiplicador de dano de um golpe corpo a corpo pelas passivas (BLD-06); os bônus se multiplicam. */
export function strikeMultiplier(perks: Perks, strike: StrikeTraits): number {
  let mul = 1;
  if (strike.heavy && perks.has('punhoPesado')) mul *= PERK.heavyMul;
  if (strike.counter && perks.has('contraAfiado')) mul *= PERK.counterMul;
  if (strike.shadow && perks.has('passoSombrio')) mul *= PERK.shadowMul;
  return mul;
}
