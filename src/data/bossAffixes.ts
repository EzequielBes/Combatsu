/**
 * Afixos de chefe da leva 1 (AFX-02, plano 5.8): ids, nomes nas duas formas, leveza, cores e os números de cada afixo
 * e da moldura Portador de Dedo. A regra mora em `core/bossAffix.ts`. Sem `phaser`.
 *
 * Toda cor é uma chave da `PALETTE` (`game/art/palette.ts`, BRD-07); o teste confere cada uma.
 */
import type { TechId } from './techniques';

export type BossAffixId = 'igneo' | 'invocador' | 'sangue' | 'adaptativo';

/** Nome na forma masculina (Oni) e feminina (Tecelã). */
export interface GenderedName {
  m: string;
  f: string;
}

export interface BossAffixDef {
  name: GenderedName;
  /** Afixo leve: muda o padrão de ataque sem somar número; o único pool da r5 (BLN-05). */
  light: boolean;
  /** Cor do contorno de 1 px no sprite (BRD-03); `null` quando o afixo se lê por outra marca. */
  outline: string | null;
  /** Cor do glifo de 6 px ao lado da barra (BRD-02). */
  glyph: string;
}

/** Ordem fixa dos afixos: é a ordem do pool que o sorteio indexa. */
export const BOSS_AFFIX_IDS: readonly BossAffixId[] = ['igneo', 'invocador', 'sangue', 'adaptativo'];

export const BOSS_AFFIXES: Readonly<Record<BossAffixId, BossAffixDef>> = {
  igneo: { name: { m: 'Ígneo', f: 'Ígnea' }, light: true, outline: 'a', glyph: 'a' },
  invocador: { name: { m: 'Invocador', f: 'Invocadora' }, light: true, outline: 'u', glyph: 'u' },
  sangue: { name: { m: 'Sangue Convergente', f: 'Sangue Convergente' }, light: false, outline: null, glyph: 'r' },
  adaptativo: { name: { m: 'Adaptativo', f: 'Adaptativa' }, light: false, outline: null, glyph: 'A' },
};

export interface AffixRules {
  /** Afixos por chefe, índice = tier − 1; tier além do fim usa o último (BLN-05, BLN-06). */
  countByTier: readonly number[];
  /** Pares que nunca saem juntos (BLN-07); vazia na leva 1, a leva 2 (F41) preenche. */
  incompatible: readonly (readonly [BossAffixId, BossAffixId])[];
  /** Pool da r5: só os afixos leves. */
  lightPool: readonly BossAffixId[];
}

export const AFFIX_RULES: AffixRules = {
  countByTier: [1, 1, 2, 2, 3],
  incompatible: [],
  lightPool: BOSS_AFFIX_IDS.filter((id) => BOSS_AFFIXES[id].light),
};

/** Fonte de golpe que o Adaptativo conta (ADP-01): corpo a corpo leve, forte ou uma técnica. */
export type AdaptLabelKey = 'light' | 'heavy' | TechId;

/** Números dos afixos e do Portador, num lugar só. */
export const BOSS_AFFIX = {
  /** Ígneo: faixa de lava no trecho da investida (IGN-02..04); dano × multiplicador do tier, arredondado. */
  lava: { durationMs: 2000, tickMs: 600, damage: 4 },
  /** Invocador: comuns por troca de fase, na r5, e teto de vivos (INV-01, INV-02). */
  summon: { count: 3, firstBossCount: 2, maxAlive: 4 },
  /**
   * Sangue Convergente (SNG-02, SNG-03): aviso, feixe aberto, dano × multiplicador do tier, espessura da linha de
   * aviso (1 → 6 px) e altura da caixa do feixe (px).
   */
  beam: { warnMs: 800, activeMs: 250, damage: 16, thickness: [1, 6] as const, height: 10 },
  /** Adaptativo (ADP-01..05): janela, acertos mínimos, teto de fontes, esquecimento e escala da fonte adaptada. */
  adapt: { windowMs: 20000, minHits: 5, maxAdapted: 2, forgetMs: 10000, mult: 0.5 },
  /** Portador de Dedo (PDD-01..05): não ocupa vaga de afixo. */
  finger: {
    fromRound: 10,
    chance: 0.1,
    scale: 1.25,
    hpMult: 1.3,
    damageMult: 1.5,
    extraProjectiles: 1,
    name: { m: 'Portador de Dedo', f: 'Portadora de Dedo' } as GenderedName,
    glyph: 'R',
  },
  /** Com Ígneo e Invocador juntos, o contorno alterna a cada tanto (BRD-03). */
  outlineSwapMs: 600,
  /** Rótulo curto de cada fonte adaptada, sob a roda (ADP-06). */
  adaptLabels: {
    light: 'Leve',
    heavy: 'Forte',
    divergente: 'Divergente',
    vermelho: 'Vermelho',
    azul: 'Azul',
    corte: 'Corte',
    roxo: 'Roxo',
  } as Readonly<Record<AdaptLabelKey, string>>,
} as const;
