/**
 * Escalação do chefe de cada rodada (BLN-01..07, PDD-01/02): arquétipo, afixos e moldura Portador de Dedo, sorteados
 * pelo stream `bossAffixRng` da `Run` e guardados por rodada. Puro: sem `phaser`.
 *
 * O sorteio consome sempre a mesma quantidade do stream, em toda rodada: 1 `next()` do arquétipo, 1 `int()` por vaga
 * de afixo do tier e 1 `next()` do Portador (inclusive antes da r10, comparado com chance 0). Assim a rodada seguinte
 * não depende do que saiu nesta. Os overrides de debug (BLN-09/10) entram depois do sorteio, sobre uma cópia.
 */
import { AFFIX_RULES, BOSS_AFFIX, BOSS_AFFIX_IDS, type AffixRules, type BossAffixId } from '../data/bossAffixes';
import type { BossArchetype } from './bossTier';
import { tierFor } from './bossTier';
import type { Rng } from './rng';

export interface BossLineup {
  archetype: BossArchetype;
  /** Afixos na ordem do sorteio, sem repetidos nem par incompatível. */
  affixes: readonly BossAffixId[];
  /** Moldura Portador de Dedo: não ocupa vaga de afixo (PDD-02). */
  finger: boolean;
}

/** Overrides de debug da escalação (`?debug&bossArch=`, `bossAffix=`, `finger=`); campo ausente = vale o sorteio. */
export interface LineupOverrides {
  archetype?: BossArchetype;
  affixes?: readonly BossAffixId[];
  finger?: boolean;
}

/** Parte da tuning do Portador que o sorteio usa. */
export interface FingerOdds {
  fromRound: number;
  chance: number;
}

/** Quantos afixos o chefe do tier leva; tier além do fim da tabela usa o último valor (BLN-05, BLN-06). */
export function affixCountFor(tier: number, rules: AffixRules = AFFIX_RULES): number {
  const table = rules.countByTier;
  return table[Math.min(Math.max(tier, 1), table.length) - 1];
}

function clashes(a: BossAffixId, b: BossAffixId, rules: AffixRules): boolean {
  return rules.incompatible.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

/** Afixos que ainda cabem: no pool do tier, fora dos já escolhidos e sem par incompatível com eles (BLN-07). */
function eligible(pool: readonly BossAffixId[], chosen: readonly BossAffixId[], rules: AffixRules): BossAffixId[] {
  return pool.filter((id) => !chosen.includes(id) && !chosen.some((c) => clashes(id, c, rules)));
}

/**
 * Sorteia a escalação do chefe da rodada `round` (BLN-04..07, PDD-01/02): arquétipo 50/50, uma vaga por afixo do
 * tier (a r5 só do pool leve), Portador com `next() < chance` a partir da r10. Se as incompatibilidades esvaziarem o
 * pool, a vaga ainda consome o seu sorteio e fica vazia, para o consumo do stream não mudar.
 */
export function drawLineup(
  rng: Rng,
  round: number,
  rules: AffixRules = AFFIX_RULES,
  finger: FingerOdds = BOSS_AFFIX.finger,
): BossLineup {
  const tier = tierFor(round);
  const archetype: BossArchetype = rng.next() < 0.5 ? 'oni' : 'tecela';
  const pool = tier <= 1 ? rules.lightPool : BOSS_AFFIX_IDS;
  const affixes: BossAffixId[] = [];
  for (let slot = 0; slot < affixCountFor(tier, rules); slot++) {
    const options = eligible(pool, affixes, rules);
    if (options.length === 0) {
      rng.next();
      continue;
    }
    affixes.push(options[rng.int(0, options.length - 1)]);
  }
  const chance = round >= finger.fromRound ? finger.chance : 0;
  return { archetype, affixes, finger: rng.next() < chance };
}

const ARCHETYPES: readonly BossArchetype[] = ['oni', 'tecela'];

/** Arquétipo válido (`oni`, `tecela`) ou `undefined` (BLN-10: inválido é ignorado). Molde: `parseVariant`. */
export function parseBossArch(raw: string | null | undefined): BossArchetype | undefined {
  return (ARCHETYPES as readonly string[]).includes(raw ?? '') ? (raw as BossArchetype) : undefined;
}

/**
 * Lista de afixos separada por vírgula, ou `none` para lista vazia (BLN-10). Um id desconhecido invalida o valor
 * inteiro (`undefined`, vale o sorteio); repetidos ficam uma vez só. É debug: não confere tier nem par incompatível.
 */
export function parseBossAffixes(raw: string | null | undefined): readonly BossAffixId[] | undefined {
  const text = raw?.trim() ?? '';
  if (text === 'none') return [];
  if (text === '') return undefined;
  const ids = text.split(',').map((part) => part.trim());
  const known = BOSS_AFFIX_IDS as readonly string[];
  if (!ids.every((id) => known.includes(id))) return undefined;
  return [...new Set(ids)] as BossAffixId[];
}

/** `1` liga e `0` desliga o Portador; outro valor é `undefined` (BLN-10). Vale em qualquer rodada, por ser debug. */
export function parseFinger(raw: string | null | undefined): boolean | undefined {
  if (raw === '1') return true;
  if (raw === '0') return false;
  return undefined;
}

/** Escalação com os overrides por cima, numa cópia: a original (a do cache) não muda (BLN-09). */
export function applyOverrides(lineup: BossLineup, o: LineupOverrides = {}): BossLineup {
  return {
    archetype: o.archetype ?? lineup.archetype,
    affixes: [...(o.affixes ?? lineup.affixes)],
    finger: o.finger ?? lineup.finger,
  };
}

/**
 * Cache da escalação por rodada (BLN-02, BLN-03): a loja (aviso), a área e o spawn pedem o mesmo chefe em momentos
 * diferentes e veem o mesmo. Quem pede primeiro consome o stream. Guarda o `Rng` que gerou o cache: quando a `Run`
 * cria um stream novo (run nova), a identidade muda e o cache zera sozinho.
 *
 * O resultado depende da ordem dos pedidos (pedir a r10 antes da r5 troca as duas); o jogo pede sempre em ordem de
 * rodada, inclusive quando a run começa direto numa rodada de chefe (`?round=N`). Os overrides de debug valem só na
 * saída: o cache guarda o sorteio puro e o consumo do stream é o mesmo com ou sem eles (BLN-09).
 */
export class BossLineups {
  private source: Rng | null = null;
  private readonly byRound = new Map<number, BossLineup>();

  constructor(
    private readonly rules: AffixRules = AFFIX_RULES,
    private readonly finger: FingerOdds = BOSS_AFFIX.finger,
  ) {}

  lineupFor(rng: Rng, round: number, overrides?: LineupOverrides): BossLineup {
    if (rng !== this.source) {
      this.source = rng;
      this.byRound.clear();
    }
    let lineup = this.byRound.get(round);
    if (!lineup) {
      lineup = drawLineup(rng, round, this.rules, this.finger);
      this.byRound.set(round, lineup);
    }
    return applyOverrides(lineup, overrides);
  }
}
