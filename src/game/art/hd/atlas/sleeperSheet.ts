/*
 * Folha `npc-sleeper`: o dorminhoco na poltrona de massagem, em quadros desenhados trazidos pelo
 * `tools/sprite-atlas.mjs` (`sleeperAtlas.data.ts`; a fonte são os PNGs de `assets/dorminhoco/quadros/`). Mesma
 * densidade do protagonista novo: 2 texels por px de mundo. Puro, sem `phaser`.
 */
import type { HdSheet } from '../sheet';
import { SLEEPER_ATLAS_DATA } from './sleeperAtlas.data';
import { decodeAtlasFrame } from './yutaSheet';

/** Origem do sprite: o meio da base da poltrona, no chão. */
export const SLEEPER_ORIGIN = { x: SLEEPER_ATLAS_DATA.originCol / SLEEPER_ATLAS_DATA.frameW, y: 1 } as const;

/** Escala de exibição: 2 texels da folha por px de mundo. */
export const SLEEPER_SCALE = 0.5;

/** Altura da figura em px de mundo (a célula inteira), para pôr a fala acima da cabeça. */
export const SLEEPER_HEIGHT = SLEEPER_ATLAS_DATA.frameH * SLEEPER_SCALE;

let cached: HdSheet | undefined;

export function sleeperSheet(): HdSheet {
  if (cached) return cached;
  const { frameW, frameH, colors } = SLEEPER_ATLAS_DATA;
  const frames: Record<string, Uint8Array> = {};
  for (const [name, encoded] of Object.entries(SLEEPER_ATLAS_DATA.frames))
    frames[name] = decodeAtlasFrame(encoded, frameW * frameH);
  cached = { frameW, frameH, colors, frames };
  return cached;
}
