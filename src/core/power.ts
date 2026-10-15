import { CAMERA_FEEL, POWER_FEEL } from '../data/feel';
import type { MovePhase } from './moveMachine';

/**
 * Força do corpo (POW-07 a POW-10): pontos de Força, Manoplas e Punho Pesado viram um patamar (saltos em 2, 5 e 8) e
 * uma escala contínua por ponto (teto de 10). Só números e chaves da paleta: quem pinta é o adaptador (AD-001, AD-009).
 */

export type PowerTier = 0 | 1 | 2 | 3;

/** Tom do impacto forte em chaves da `PALETTE`; o `ImpactTone` com as cores nasce no adaptador. */
export interface ToneKeys {
  shadow: string;
  body: string;
  core: string;
  altBody: string;
  altCore: string;
}

export type PowerAura = 'off' | 'embers' | 'flame';

export interface PowerLook {
  /** Pontos sem teto, como o jogador comprou. */
  points: number;
  tier: PowerTier;
  /** Pontos com o teto de 10, base da escala contínua. */
  p: number;
  impactScale: number;
  kickPx: number;
  forceMul: number;
  slideMul: number;
  trailBonusPx: number;
  hitstopBonusMs: { light: number; heavy: number };
  /** Tremor da câmera no impacto forte e decisivo do jogador. */
  shakes: boolean;
  tone: ToneKeys;
  /** Aura desejada pelo patamar; o repouso (`atRest`) decide se ela aparece. */
  aura: PowerAura;
}

/** POW-07.1: Força (0 a 5) + 2 × Manoplas (0 a 3) + 2 com o Punho Pesado. */
export function powerPoints(src: { forca: number; manoplas: number; punhoPesado: boolean }): number {
  return src.forca + 2 * src.manoplas + (src.punhoPesado ? 2 : 0);
}

/** POW-07.2: 0 abaixo de 2 pontos, 1 a partir de 2, 2 a partir de 5 e 3 a partir de 8. */
export function powerTier(points: number): PowerTier {
  const [one, two, three] = POWER_FEEL.tierFrom;
  if (points >= three) return 3;
  if (points >= two) return 2;
  if (points >= one) return 1;
  return 0;
}

const AURA_BY_TIER: readonly PowerAura[] = ['off', 'off', 'embers', 'flame'];

/** POW-08 a POW-10: tudo o que a força muda na tela, num objeto só. */
export function powerLook(points: number): PowerLook {
  const tier = powerTier(points);
  const p = Math.min(points, POWER_FEEL.capPoints);
  return {
    points,
    tier,
    p,
    impactScale: 1 + POWER_FEEL.scalePerPoint * p,
    kickPx: CAMERA_FEEL.kickPx + POWER_FEEL.kickPxPerPoint * p,
    forceMul: 1 + POWER_FEEL.forcePerPoint * p,
    slideMul: 1 + POWER_FEEL.slidePerPoint * p,
    trailBonusPx: Math.floor(p / POWER_FEEL.trailEveryPoints),
    hitstopBonusMs: { light: POWER_FEEL.hitstopBonusMs.light[tier], heavy: POWER_FEEL.hitstopBonusMs.heavy[tier] },
    shakes: tier >= POWER_FEEL.shakeFromTier,
    tone: { ...POWER_FEEL.tones[tier] },
    aura: AURA_BY_TIER[tier]!,
  };
}

/** Estado do player que decide o repouso da aura (POW-10.14). */
export interface RestState {
  movePhase: MovePhase;
  grounded: boolean;
  /** `castLock` armado (conjurando uma técnica). */
  casting: boolean;
  /** Canalizando a Energia Reversa. */
  channeling: boolean;
  dead: boolean;
  /** O quadro na tela é do `idle` (andando, o quadro é da corrida). */
  idleFrame: boolean;
}

/** Repouso: sem golpe, no chão, sem conjurar nem canalizar, vivo e com o quadro do `idle`. */
export function atRest(s: RestState): boolean {
  return s.movePhase === 'idle' && s.grounded && !s.casting && !s.channeling && !s.dead && s.idleFrame;
}
