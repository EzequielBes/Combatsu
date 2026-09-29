/**
 * Cores da barra de estrutura (STR-09) e do HUD do combo (CMB-04/05). Todo valor vem da `PALETTE` (ART-01):
 * nenhuma cor de hex solta aqui, só chaves existentes.
 */
import { PALETTE } from './palette';

/** Fundo/poço da barra de estrutura, atrás do preenchimento (mesmo tom escuro da barra de energia). */
export const STRUCTURE_BAR_BG_COLOR = PALETTE.K;
/** Preenchimento amarelo da barra de estrutura (spec.md: "barra de estrutura amarela"). */
export const STRUCTURE_BAR_FILL_COLOR = PALETTE.A;
/** Flash branco quando a estrutura quebra (a barra estoura, STR-05/06/10/11). */
export const STRUCTURE_BAR_BREAK_COLOR = PALETTE.W;

/** Texto "N hits" do combo (CMB-04), no mesmo tom do resto do HUD da run. */
export const COMBO_TEXT_COLOR = PALETTE.w;
/** Cores das notas do combo (CMB-05), em intensidade crescente de D (mais comum) a S (mais rara). */
export const COMBO_GRADE_COLORS: Readonly<Record<'D' | 'C' | 'B' | 'A' | 'S', number>> = {
  D: PALETTE.s,
  C: PALETTE.c,
  B: PALETTE.a,
  A: PALETTE.A,
  S: PALETTE.W,
};

/** Tom azulado que cobre a tela na câmera lenta da esquiva perfeita (DOD-12). */
export const SLOWMO_TINT_COLOR = PALETTE.d;
