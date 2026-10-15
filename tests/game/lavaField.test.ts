import { describe, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import type { Hit } from '../../src/core/hit';
import { LavaField, type LavaVictim } from '../../src/game/boss/LavaField';

const GROUND = 300;
const BOSS_ID = 42;
const DAMAGE = 7;

/** Cena falsa: só o `add.graphics()` que a lava usa para desenhar (encadeável). */
function fakeScene(): Phaser.Scene {
  const gfx = {
    setDepth: () => gfx,
    clear: () => gfx,
    fillStyle: () => gfx,
    fillRect: () => gfx,
    destroy: vi.fn(),
  };
  return { add: { graphics: () => gfx } } as unknown as Phaser.Scene;
}

/** Player falso de 20 × 36 com os pés em `GROUND`, centrado em `x`, que aceita todo golpe e guarda os recebidos. */
function victim(x: number, grounded: boolean): LavaVictim & { hits: Hit[] } {
  const hits: Hit[] = [];
  return {
    hits,
    grounded,
    hurtRect: () => ({ x, y: GROUND - 18, width: 20, height: 36 }),
    receiveHit: (hit: Hit) => {
      hits.push(hit);
      return true;
    },
  };
}

describe('LavaField: o tique chega ao player pelo receiveHit (IGN-03..05)', () => {
  it('IGN-04: o golpe da lava é low, imbloqueável, sem empurrão, do chefe e com o dano do tier', () => {
    const lava = new LavaField(fakeScene(), BOSS_ID, DAMAGE);
    lava.add(200, 100, GROUND);
    const p = victim(150, true);
    lava.update(16, p);
    expect(p.hits).toHaveLength(1);
    expect(p.hits[0]).toMatchObject({ ownerId: BOSS_ID, damage: DAMAGE, height: 'low', unblockable: true, force: 0 });
    expect(lava.view()).toMatchObject({ ticks: 1, hits: 1, damage: DAMAGE });
  });

  it('IGN-05: no ar, sobre a faixa, nenhum golpe', () => {
    const lava = new LavaField(fakeScene(), BOSS_ID, DAMAGE);
    lava.add(100, 200, GROUND);
    const p = victim(150, false);
    lava.update(16, p);
    expect(p.hits).toEqual([]);
  });

  it('IGN-03: parado na faixa, o 2º golpe só vem 600 ms depois do 1º', () => {
    const lava = new LavaField(fakeScene(), BOSS_ID, DAMAGE);
    lava.add(100, 200, GROUND);
    const p = victim(150, true);
    lava.update(16, p);
    lava.update(599, p);
    expect(p.hits).toHaveLength(1);
    lava.update(1, p);
    expect(p.hits).toHaveLength(2);
  });
});
