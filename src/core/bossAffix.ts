/**
 * Escalação do chefe de cada rodada (BLN-01..07, PDD-01/02): arquétipo, afixos e moldura Portador de Dedo, sorteados
 * pelo stream `bossAffixRng` da `Run` e guardados por rodada. Puro: sem `phaser`.
 *
 * O sorteio consome sempre a mesma quantidade do stream, em toda rodada: 1 `next()` do arquétipo, 1 `int()` por vaga
 * de afixo do tier e 1 `next()` do Portador (inclusive antes da r10, comparado com chance 0). Assim a rodada seguinte
 * não depende do que saiu nesta. Os overrides de debug (BLN-09/10) entram depois do sorteio, sobre uma cópia.
 */
import {
  AFFIX_RULES,
  BOSS_AFFIX,
  BOSS_AFFIX_IDS,
  BOSS_AFFIXES,
  type AffixRules,
  type BossAffixId,
  type GenderedName,
} from '../data/bossAffixes';
import { BOSS } from '../data/tuning';
import type { BossAITuning, BossAttack } from './bossAI';
import type { BossBrainTuning } from './bossBrain';
import type { BossArchetype, BossSpec } from './bossTier';
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

/** Forma do nome que concorda com o arquétipo: o Oni é masculino, a Tecelã é feminina. */
function gendered(name: GenderedName, archetype: BossArchetype): string {
  return archetype === 'tecela' ? name.f : name.m;
}

/** Nome do afixo na forma do arquétipo ("Adaptativo" no Oni, "Adaptativa" na Tecelã). */
export function affixName(id: BossAffixId, archetype: BossArchetype): string {
  return gendered(BOSS_AFFIXES[id].name, archetype);
}

/** Nome, afixos na ordem da escalação e o Portador(a) de Dedo, separados por ` · `. */
function joinLabel(head: string, lineup: Pick<BossLineup, 'archetype' | 'affixes' | 'finger'>): string {
  const parts = [head, ...lineup.affixes.map((id) => affixName(id, lineup.archetype))];
  if (lineup.finger) parts.push(gendered(BOSS_AFFIX.finger.name, lineup.archetype));
  return parts.join(' · ');
}

/** Rótulo da barra do chefe (BRD-01): "Tecelã de Maldições · Adaptativa · Portadora de Dedo"; sem afixo, só o nome. */
export function bossBarLabel(spec: Pick<BossSpec, 'name' | 'archetype' | 'affixes' | 'finger'>): string {
  return joinLabel(spec.name, spec);
}

/** Aviso da loja antes da rodada de chefe (BRD-04): "Próximo: Oni · Ígneo", com o nome curto do arquétipo. */
export function announceText(lineup: BossLineup): string {
  return `Próximo: ${joinLabel(BOSS.archetypes[lineup.archetype].shortName, lineup)}`;
}

/** Cores (chaves da `PALETTE`) dos glifos ao lado da barra (BRD-02): um por afixo, na ordem, e o do Portador. */
export function glyphKeys(spec: Pick<BossSpec, 'affixes' | 'finger'>): string[] {
  const keys = spec.affixes.map((id) => BOSS_AFFIXES[id].glyph);
  if (spec.finger) keys.push(BOSS_AFFIX.finger.glyph);
  return keys;
}

/**
 * Cor do contorno de 1 px no instante `ms` (BRD-03): `null` sem afixo de contorno (Ígneo, Invocador), a cor dele
 * com um só, e com os dois alterna na ordem da escalação a cada `outlineSwapMs` (599 ms o 1º, 600 ms o 2º).
 */
export function outlineKeyAt(
  affixes: readonly BossAffixId[],
  ms: number,
  swapMs: number = BOSS_AFFIX.outlineSwapMs,
): string | null {
  const keys = affixes.map((id) => BOSS_AFFIXES[id].outline).filter((key): key is string => key !== null);
  if (keys.length === 0) return null;
  return keys[Math.floor(Math.max(ms, 0) / swapMs) % keys.length];
}

export type BossCycles = Readonly<Record<1 | 2 | 3, readonly BossAttack[]>>;

/** Parte da tuning que os ciclos usam: os ciclos de cada arquétipo. */
export interface ArchetypeCycles {
  archetypes: Readonly<Record<BossArchetype, { cycles: BossCycles }>>;
}

const PHASES = [1, 2, 3] as const;

/**
 * Ciclos de ataque do chefe por fase (CYC-01..04): os do arquétipo e, com Sangue Convergente, um `beam` logo depois
 * do 1º ataque de cada fase (SNG-01). Devolve cópias: a tabela da tuning não muda.
 */
export function cyclesFor(
  archetype: BossArchetype,
  affixes: readonly BossAffixId[],
  t: ArchetypeCycles = BOSS,
): BossCycles {
  const base = t.archetypes[archetype].cycles;
  const blood = affixes.includes('sangue');
  const out = {} as Record<1 | 2 | 3, BossAttack[]>;
  for (const phase of PHASES) {
    const [first, ...rest] = base[phase];
    out[phase] = blood ? [first, 'beam', ...rest] : [first, ...rest];
  }
  return out;
}

/**
 * Tuning do `BossAI` e do `BossBrain` derivada da escalação (AFX-01): a IA leva os ciclos do arquétipo e dos afixos
 * e os números do `BOSS`; o cérebro é o `BOSS` (na leva 1 nenhum afixo mexe nele; a vida já vem do `spec.maxHp`).
 */
export function bossTuningFor(
  spec: Pick<BossSpec, 'archetype' | 'affixes'>,
  t: typeof BOSS = BOSS,
): { ai: BossAITuning; brain: BossBrainTuning } {
  return { ai: { ...t, cycles: cyclesFor(spec.archetype, spec.affixes, t) }, brain: t };
}
