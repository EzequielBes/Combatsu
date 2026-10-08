import type { ModuleTheme } from '../../../core/module';
import { BECO_SCENERY } from './beco';
import { KONBINI_SCENERY } from './konbini';
import { PARQUE_SCENERY } from './parque';
import { RUA_SCENERY } from './rua';
import { SANTUARIO_SCENERY } from './santuario';
import { schoolMid, schoolNear, type NearColors } from './school';
import type { ThemeScenery } from './types';

/**
 * Cor-chave da camada próxima por tema (THM-02): o snapshot de debug ainda reporta estas chaves por trecho (CEN-06);
 * o desenho do muro de cada tema está no arquivo do tema. A sala de teste ainda pinta o muro da escola com elas.
 */
export const NEAR_COLORS: Record<ModuleTheme, NearColors> = {
  rua: { wall: 'E', top: 'f' },
  beco: { wall: 'n', top: 'N' },
  parque: { wall: 'g', top: 'G' },
  konbini: { wall: 'N', top: 's' },
  santuario: { wall: 'm', top: 'M' },
};

/** Pintores de cenário de cada tema (CEN-07, CEN-08); o santuário ainda usa a média da escola até a F23. */
export const THEME_SCENERY: Record<ModuleTheme, ThemeScenery> = {
  rua: RUA_SCENERY,
  beco: BECO_SCENERY,
  parque: PARQUE_SCENERY,
  konbini: KONBINI_SCENERY,
  santuario: SANTUARIO_SCENERY,
};

/** O fundo da sala de teste (sem trechos): a escola de sempre. */
export const SCHOOL_SCENERY: ThemeScenery = { mid: schoolMid, near: schoolNear({ wall: 'E', top: 'f' }) };
