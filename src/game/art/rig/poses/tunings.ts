/*
 * Ajustes finos do gancho ascendente por preset de proporção (ver `uppercutFor`). O que não está aqui usa o padrão.
 * As medidas são relativas ao corpo: `ahead` texels à frente do eixo e `up` texels acima do chão, valem em qualquer frame.
 */
import type { Reach, Tuning } from './uppercut';

export const TUNINGS: Readonly<Record<string, Partial<Tuning>>> = {
  heroico: { strike: { ahead: 7.6, up: 22.9 }, hitHipAhead: 2 },
  semi: { strike: { ahead: 6.8, up: 22.3 }, hitHipAhead: 1.9 },
  inter: { strike: { ahead: 6.4, up: 21.6 }, hitHipAhead: 2.4, hitRise: 1.3, tiptoe: 1.5 },
};

/** O ponto mais perto do corpo que ainda passa nos testes de alcance (POS-05, POS-10): 6 texels à frente, linha 6 do frame de 30. */
export const MIN_STRIKE: Reach = { ahead: 6.05, up: 21.25 };
