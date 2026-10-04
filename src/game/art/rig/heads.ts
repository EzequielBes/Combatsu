/*
 * Cabeças do boneco por proporção. A cabeça é uma grade de texto carimbada no pescoço: `neckCol` é a coluna da grade que
 * fica sobre o pescoço (a base da cabeça termina na linha acima da junta do pescoço). Puro, sem `phaser`.
 * Todas seguem a identidade da cabeça do golpe (`HEAD_FOCUS`): cabelo escuro espetado (`h`, `H`, `j`), pele (`p`, `P`,
 * `x`), olho (`w`, `b`) e contorno `k`, de frente para a direita; só mudam de tamanho.
 */
import { HEAD_FOCUS, type Grid } from '../sprites/player';

export interface HeadSprite {
  grid: Grid;
  neckCol: number;
}

/** A cabeça do golpe (13x11), a do boneco chibi `atual`. */
export const HEAD_CHIBI: HeadSprite = { grid: HEAD_FOCUS, neckCol: 5 };

/** Cabeça de 5 linhas (heroico): espetos, franja, o olho e o queixo. */
export const HEAD_SMALL: HeadSprite = {
  grid: ['.k.k.k.', 'kHjHjhk', 'khhhppk', 'khhxbpk', '.knPpk.'],
  neckCol: 3,
};

/** Cabeça de 6 linhas (semi). */
export const HEAD_MEDIUM: HeadSprite = {
  grid: ['..k..k.k..', '.kHkkHjjk.', 'kjHjjjhhpk', 'khhhhhwbpk', 'khhhxPpppk', '.kknPpxk..'],
  neckCol: 4,
};

/** Cabeça de 8 linhas (inter): a do golpe com as mechas e o rosto comprimidos. */
export const HEAD_LARGE: HeadSprite = {
  grid: ['...k..k..k..', '..kHk.kHkjk.', '.kjHjkjHjHjk', 'kjhhHjhhjhpk', 'khhhhhpphwbk', 'khhhxPpppppk', '.khhxPpbbpk.', '.knnNkxPPxk.'],
  neckCol: 5,
};
