/**
 * Ajudantes puros dos ataques novos do chefe (CYC-09, CYC-11, SNG-02): onde caem os fios da chuva, a espessura do
 * aviso do feixe e o quadro antigo que cada ataque novo toca. Puro: sem `phaser`.
 */
import type { BossAttack } from './bossAI';

/** Ataques que já têm quadros desenhados nas folhas do chefe. */
export type BossAnimBase = 'charge' | 'leap' | 'volley';

/** Espessura do aviso do feixe no início e no fim do preparo, em px (SNG-02). */
export const BEAM_THICKNESS_MIN = 1;
export const BEAM_THICKNESS_MAX = 6;

const ANIM_BASE: Readonly<Record<BossAttack, BossAnimBase>> = {
  charge: 'charge',
  leap: 'leap',
  volley: 'volley',
  doubleCharge: 'charge',
  tripleLeap: 'leap',
  threadRain: 'volley',
  beam: 'volley',
};

/**
 * Posições dos fios da chuva: `centerX` (o X do jogador) mais cada deslocamento, presas a `[minX, maxX]` (CYC-09).
 * Perto da parede, mais de um fio pode cair no mesmo X.
 */
export function threadXs(centerX: number, minX: number, maxX: number, offsets: readonly number[]): number[] {
  return offsets.map((off) => Math.min(maxX, Math.max(minX, centerX + off)));
}

/**
 * Espessura da linha de aviso do feixe: cresce de 1 px em 0 ms até 6 px em `warnMs`, em px inteiros, e para no
 * máximo depois disso (SNG-02).
 */
export function beamThickness(elapsedMs: number, warnMs: number): number {
  const t = warnMs > 0 ? Math.min(1, Math.max(0, elapsedMs / warnMs)) : 1;
  return Math.round(BEAM_THICKNESS_MIN + (BEAM_THICKNESS_MAX - BEAM_THICKNESS_MIN) * t);
}

/** Quadro que o ataque toca: os ataques novos reaproveitam os da investida, do salto e da rajada (CYC-11). */
export function animBase(attack: BossAttack): BossAnimBase {
  return ANIM_BASE[attack];
}
