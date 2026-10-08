import { describe, expect, it } from 'vitest';
import { ArenaDressing, VEIL_ALPHA, VEIL_FADE_MS } from '../../src/scenes/test/arena';
import type { TestScene } from '../../src/scenes/TestScene';

/** Retângulo falso: guarda o alpha como o do Phaser e devolve a si mesmo nos métodos encadeados. */
function fakeRect(): { alpha: number; setAlpha(a: number): unknown } & Record<string, unknown> {
  const rect = {
    alpha: 1,
    setOrigin: () => rect,
    setScrollFactor: () => rect,
    setDepth: () => rect,
    setAlpha: (a: number) => {
      rect.alpha = a;
      return rect;
    },
    destroy: () => undefined,
  };
  return rect;
}

/** Cena falsa com o mínimo que a arena usa: sem a folha do selo, então só o véu é criado. */
function arenaWithVeil(): { arena: ArenaDressing; veil: ReturnType<typeof fakeRect> } {
  const veil = fakeRect();
  const scene = {
    textures: { exists: () => false },
    add: { rectangle: () => veil },
    tweens: { add: () => undefined, killTweensOf: () => undefined },
  } as unknown as TestScene;
  const arena = new ArenaDressing(scene);
  arena.build('oni');
  return { arena, veil };
}

describe('véu vermelho da arena (ARN-09, ARN-10, ARN-11)', () => {
  it('começa apagado e fica apagado na fase 1', () => {
    const { arena, veil } = arenaWithVeil();
    expect(veil.alpha).toBe(0);
    arena.update(16, 1);
    expect(veil.alpha).toBe(0);
  });

  it('edge case: o chefe some ainda na fase 1 e o véu continua em 0', () => {
    const { arena, veil } = arenaWithVeil();
    arena.update(16, 1);
    // "Continua em 0" vale a cada passo, não só no fim: um véu que piscasse aceso e descesse passaria só no fim.
    for (let t = 0; t < 1000; t += 16) {
      arena.update(16, null);
      expect(veil.alpha).toBe(0);
    }
  });

  it('acende em 0,18 nas fases 2 e 3', () => {
    const { arena, veil } = arenaWithVeil();
    arena.update(16, 2);
    expect(veil.alpha).toBe(VEIL_ALPHA);
    expect(VEIL_ALPHA).toBe(0.18);
    arena.update(16, 3);
    expect(veil.alpha).toBe(0.18);
  });

  it('na vitória desce até 0 em 600 ms: metade aos 300 ms e 0 aos 600', () => {
    const { arena, veil } = arenaWithVeil();
    arena.update(16, 2);
    expect(VEIL_FADE_MS).toBe(600);
    arena.update(300, null);
    expect(veil.alpha).toBeCloseTo(0.09, 9);
    arena.update(299, null);
    expect(veil.alpha).toBeGreaterThan(0);
    arena.update(1, null);
    expect(veil.alpha).toBeCloseTo(0, 9);
  });

  it('fora da área de chefe não há véu', () => {
    const scene = { textures: { exists: () => false }, add: { rectangle: () => fakeRect() } } as unknown as TestScene;
    const arena = new ArenaDressing(scene);
    arena.build(null);
    expect(arena.veilView).toBeNull();
  });
});
