import { boxCenter, type Box } from './axisRule';
import type { Vec2 } from './hit';

/** O que a palma pode trocar: corpo (inimigo comum ou chefe), o orbe próprio ou um projétil. */
export type SwapKind = 'enemy' | 'boss' | 'orb' | 'projectile';

/**
 * Candidato à troca. O corpo traz a caixa (`width`/`height`) para trocar com os pés alinhados; o orbe e o projétil
 * podem vir sem caixa e trocam centro com centro.
 */
export interface SwapCandidate {
  id: number;
  kind: SwapKind;
  center: Vec2;
  size?: { width: number; height: number };
}

/** Diz se a caixa cabe ali sem sobrepor corpo estático do Matter nem módulo do mundo (fornecido pelo adaptador). */
export type FitsPredicate = (box: Box) => boolean;

export type SwapPlacement =
  { ok: true; playerBox: Box; targetCenter: Vec2 } | { ok: false; reason: 'blockedPlayer' | 'blockedTarget' };

/**
 * BOO-03: o candidato à frente do player (`dx × facing > 0`; quem está na mesma linha vertical fica de fora) com a
 * distância entre centros até `rangePx`, o mais perto; no empate, o menor id. `null` se ninguém serve.
 */
export function pickSwapTarget(
  origin: Vec2,
  facing: 1 | -1,
  rangePx: number,
  candidates: readonly SwapCandidate[],
): SwapCandidate | null {
  let best: SwapCandidate | null = null;
  let bestDist = Infinity;
  for (const c of candidates) {
    const dx = c.center.x - origin.x;
    if (dx * facing <= 0) continue;
    const dist = Math.hypot(dx, c.center.y - origin.y);
    if (dist > rangePx) continue;
    if (dist < bestDist || (dist === bestDist && best !== null && c.id < best.id)) {
      best = c;
      bestDist = dist;
    }
  }
  return best;
}

/** Corpo com caixa troca de pés alinhados; o resto troca centro com centro. */
function isGroundedBody(target: SwapCandidate): target is SwapCandidate & { size: { width: number; height: number } } {
  return (target.kind === 'enemy' || target.kind === 'boss') && target.size !== undefined;
}

/**
 * Regra de segurança da troca (`core/swap`, BOO-04): calcula onde a caixa do player e o centro do alvo ficam depois
 * da troca e recusa se a caixa do player não cabe no destino. Quando o alvo tem caixa, a dele também precisa caber
 * no lugar do player (o chefe grande não nasce dentro da parede). O adaptador move os dois só com `ok: true`.
 */
export function swapPlacement(player: Box, target: SwapCandidate, fits: FitsPredicate): SwapPlacement {
  const pc = boxCenter(player);
  let playerBox: Box;
  let targetCenter: Vec2;
  if (isGroundedBody(target)) {
    const targetFeet = target.center.y + target.size.height / 2;
    const playerFeet = player.y + player.height;
    playerBox = { ...player, x: target.center.x - player.width / 2, y: targetFeet - player.height };
    targetCenter = { x: pc.x, y: playerFeet - target.size.height / 2 };
  } else {
    playerBox = { ...player, x: target.center.x - player.width / 2, y: target.center.y - player.height / 2 };
    targetCenter = pc;
  }
  if (!fits(playerBox)) return { ok: false, reason: 'blockedPlayer' };
  if (target.size !== undefined) {
    const { width, height } = target.size;
    const targetBox = { x: targetCenter.x - width / 2, y: targetCenter.y - height / 2, width, height };
    if (!fits(targetBox)) return { ok: false, reason: 'blockedTarget' };
  }
  return { ok: true, playerBox, targetCenter };
}

/** BOO-06: tontura do trocado. Só o inimigo comum fica tonto; chefe, orbe e projétil nunca. */
export function swapStunMs(kind: SwapKind, stunMs: number): number {
  return kind === 'enemy' ? stunMs : 0;
}
