import type { ModuleDef } from '../../core/module';
import { BECO } from './beco';
import { KONBINI } from './konbini';
import { PARQUE } from './parque';
import { RUA } from './rua';
import { SANTUARIO } from './santuario';

/** Catálogo do mundo modular por id (MDL-10). */
export const MODULES: Record<string, ModuleDef> = {
  rua: RUA,
  beco: BECO,
  parque: PARQUE,
  konbini: KONBINI,
  santuario: SANTUARIO,
};

/** Módulos de combate, na ordem do sorteio (ARE-04, ARE-07). */
export const COMBAT_IDS: readonly string[] = ['rua', 'beco', 'parque'];
