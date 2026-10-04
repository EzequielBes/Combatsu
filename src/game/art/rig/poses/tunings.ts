/*
 * Ajustes finos do gancho ascendente por preset de proporção (ver `uppercutFor`). O que não está aqui usa o padrão.
 */
import type { Tuning } from './uppercut';

export const TUNINGS: Readonly<Record<string, Partial<Tuning>>> = {
  heroico: {},
  semi: {},
  inter: {},
};
