/*
 * Cabeças do boneco por proporção. A cabeça é uma grade de texto carimbada no pescoço: `neckCol` é a coluna da grade que
 * fica sobre o pescoço (a base da cabeça sai até a linha acima da junta do pescoço). Puro, sem `phaser`.
 */
import { HEAD_FOCUS, type Grid } from '../sprites/player';
import type { Proportions } from './skeleton';

export interface HeadSprite {
  grid: Grid;
  neckCol: number;
}

/** A cabeça do golpe (13x11), a do boneco chibi `atual`. */
export const HEAD_CHIBI: HeadSprite = { grid: HEAD_FOCUS, neckCol: 5 };

const BY_NAME: Record<string, HeadSprite> = { atual: HEAD_CHIBI };

/** Cabeça do corpo (a do chibi se o corpo não tem cabeça própria). */
export function headOf(body: Proportions): HeadSprite {
  return BY_NAME[body.name] ?? HEAD_CHIBI;
}

/** Registra a cabeça de um preset. */
export function registerHead(name: string, head: HeadSprite): void {
  BY_NAME[name] = head;
}
