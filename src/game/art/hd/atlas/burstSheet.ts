/*
 * Folha `fx-kokusen-burst`: o estouro de raios pretos e vermelhos do Kokusen, em 5 quadros desenhados trazidos pelo
 * `tools/sprite-atlas.mjs` (`burstAtlas.data.ts`; a fonte são os PNGs de `assets/kokusen/quadros/`). 1 texel = 1 px
 * de mundo, com o centro do estouro no meio da célula. Puro, sem `phaser`.
 */
import type { HdSheet } from '../sheet';
import { BURST_ATLAS_DATA } from './burstAtlas.data';
import { decodeAtlasFrame } from './yutaSheet';

/** Quadros do estouro, na ordem em que tocam. */
export const BURST_FRAMES: readonly string[] = Object.keys(BURST_ATLAS_DATA.frames);

let cached: HdSheet | undefined;

export function burstSheet(): HdSheet {
  if (cached) return cached;
  const { frameW, frameH, colors } = BURST_ATLAS_DATA;
  const frames: Record<string, Uint8Array> = {};
  for (const [name, encoded] of Object.entries(BURST_ATLAS_DATA.frames))
    frames[name] = decodeAtlasFrame(encoded, frameW * frameH);
  cached = { frameW, frameH, colors, frames };
  return cached;
}
