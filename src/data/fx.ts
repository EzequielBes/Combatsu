import type { Strength } from '../core/hit';

/** Duração do hitstop por força do golpe (FX-01): 50 ms leve, 90 ms forte. Golpe de objeto usa o forte. */
export const HITSTOP_MS: Readonly<Record<Strength, number>> = { light: 50, heavy: 90 };
