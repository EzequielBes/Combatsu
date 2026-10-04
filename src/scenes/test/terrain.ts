import { Filters } from '../../core/collision';
import { TILE, tileVariant } from '../../core/level';
import { LEVEL_1 } from '../../data/level1';
import { tileFrameFor } from '../../game/art/tiles';
import { tagBody } from '../../game/bodyTags';
import { TEX } from '../../game/textures';
import type { TestScene } from '../TestScene';

/** Desenho do terreno tile a tile e os corpos estáticos do Matter. */
export class TerrainBuilder {
  constructor(readonly s: TestScene) {}

  /** Desenho tile a tile pela variante (ENV-01); a física continua nos retângulos mesclados do parseLevel. */
  buildTerrain(): void {
    LEVEL_1.forEach((row, ty) => {
      for (let tx = 0; tx < row.length; tx++) {
        const variant = tileVariant(LEVEL_1, tx, ty);
        if (!variant) continue;
        this.s.add.image(tx * TILE + TILE / 2, ty * TILE + TILE / 2, TEX.terrain, tileFrameFor(variant, tx, ty));
      }
    });
    for (const r of this.s.level.solids) {
      const cx = r.x + r.width / 2;
      const cy = r.y + r.height / 2;
      const body = this.s.matter.add.rectangle(cx, cy, r.width, r.height, {
        isStatic: true,
        label: 'terrain',
        collisionFilter: { ...Filters.terrain },
      });
      tagBody(body, { kind: 'terrain' });
      this.s.terrain.push(body);
    }
  }
}
