/**
 * Cores da barra de energia amaldiçoada e dos ícones de slot de técnica (TEC-15). Todo valor vem da `PALETTE`
 * (TFX-01): nenhuma cor de hex solta aqui, só chaves existentes.
 */
import { PALETTE } from './palette';

/** Preenchimento da barra de energia (TEC-07). */
export const ENERGY_BAR_FILL_COLOR = PALETTE.c;
/** Fundo/poço da barra, atrás do preenchimento. */
export const ENERGY_BAR_BG_COLOR = PALETTE.K;
/** Marca vertical de custo na barra (TEC-12). */
export const ENERGY_BAR_MARK_COLOR = PALETTE.w;
/** Flash da barra quando uma conjuração é recusada por falta de energia (TEC-10). */
export const ENERGY_BAR_FLASH_COLOR = PALETTE.R;
/** Overlay escuro de recarga sobre o ícone do slot (TEC-09). */
export const TECH_ICON_OVERLAY_COLOR = PALETTE.k;
