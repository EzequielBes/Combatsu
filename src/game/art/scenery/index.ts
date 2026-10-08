import type { ModuleTheme } from '../../../core/module';
import { BECO_SCENERY } from './beco';
import { PARQUE_SCENERY } from './parque';
import { RUA_SCENERY } from './rua';
import { schoolMid, schoolNear, type NearColors } from './school';
import type { ThemeScenery } from './types';

/** Cor do muro da camada próxima por tema (THM-02): `wall` é a base e `top` a linha acesa; só chaves da paleta. */
export const NEAR_COLORS: Record<ModuleTheme, NearColors> = {
  rua: { wall: 'E', top: 'f' },
  beco: { wall: 'n', top: 'N' },
  parque: { wall: 'g', top: 'G' },
  konbini: { wall: 'N', top: 's' },
  santuario: { wall: 'm', top: 'M' },
};

/**
 * Pintores de cenário de cada tema (CEN-07, CEN-08). Começam todos com a escola e a cor de muro da F18 (THM-02);
 * cada tema troca pelos seus nas tarefas T9 a T13.
 */
export const THEME_SCENERY: Record<ModuleTheme, ThemeScenery> = {
  rua: RUA_SCENERY,
  beco: BECO_SCENERY,
  parque: PARQUE_SCENERY,
  konbini: { mid: schoolMid, near: schoolNear(NEAR_COLORS.konbini) },
  santuario: { mid: schoolMid, near: schoolNear(NEAR_COLORS.santuario) },
};

/** O fundo da sala de teste (sem trechos): a escola de sempre. */
export const SCHOOL_SCENERY: ThemeScenery = { mid: schoolMid, near: schoolNear({ wall: 'E', top: 'f' }) };
