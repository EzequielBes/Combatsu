import type { Strength } from '../core/hit';

/** Duração do hitstop por força do golpe (FX-01): 50 ms leve, 90 ms forte. Golpe de objeto usa o forte. */
export const HITSTOP_MS: Readonly<Record<Strength, number>> = { light: 50, heavy: 90 };

/** Hitstop na derrota do chefe (BWIN-02): fixo, maior que qualquer golpe (FX-02 pega o maior, nunca a soma). */
export const BOSS_DEFEAT_HITSTOP_MS = 250;
