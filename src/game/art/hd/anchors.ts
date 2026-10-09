/*
 * Mãos do quadro que o player mostra, seja qual for a folha: a do protagonista novo quando o quadro é dela e tem a mão
 * marcada, senão a da folha HD. É o que o jogo usa para prender o objeto na mão e fazer nascer o efeito das técnicas.
 */
import { yutaAnchors } from './atlas/yutaSheet';
import { YUTA_ON } from './flag';
import type { HdAnchors } from './player';
import { hdAnchors } from './sheet';

/** Mãos do quadro em px a partir do pé do corpo (x para a frente do player, y negativo para cima), ou `undefined`. */
export const playerAnchors = (frameName: string): HdAnchors | undefined =>
  (YUTA_ON ? yutaAnchors(frameName) : undefined) ?? hdAnchors(frameName);
