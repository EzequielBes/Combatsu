/*
 * Ajustes finos do gancho ascendente por preset de proporção (ver `uppercutFor`). O que não está aqui usa o padrão.
 */
import type { Vec2 } from '../skeleton';
import type { Tuning } from './uppercut';

export const TUNINGS: Readonly<Record<string, Partial<Tuning>>> = {
  heroico: { strike: { x: 17.6, y: 5.3 }, hitHipX: 12 },
  semi: { strike: { x: 16.8, y: 5.9 }, hitHipX: 11.9 },
  inter: { strike: { x: 16.4, y: 6.6 }, hitHipX: 12.4, hitRise: 1.3, tiptoe: 1.5 },
};

/** O ponto mais perto do corpo que ainda passa nos testes de alcance (POS-05, POS-10): coluna 16 e linha 6. */
export const MIN_STRIKE: Vec2 = { x: 16.05, y: 6.95 };
