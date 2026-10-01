import { describe, expect, it } from 'vitest';
import type Phaser from 'phaser';
import { registerAnims } from '../../src/game/art';
import type { AnimDef } from '../../src/game/art/sprites/player';

/** Cena falsa: só o que `registerAnims` usa, capturando a config passada ao `anims.create`. */
function fakeScene(frames: string[]) {
  const created: Array<{ key: string; frames: Array<{ key: string; frame: string; duration?: number }> }> = [];
  const scene = {
    textures: { get: () => ({ has: (f: string) => frames.includes(f) }) },
    anims: { exists: () => false, remove: () => undefined, create: (c: (typeof created)[number]) => created.push(c) },
  } as unknown as Phaser.Scene;
  return { scene, created };
}

describe('registerAnims repassa a duração por frame ao Phaser (SPR-08)', () => {
  it('cada frame recebe a duration declarada em durations', () => {
    const { scene, created } = fakeScene(['a', 'b']);
    const anims: Record<string, AnimDef> = { idle: { frames: ['a', 'b'], frameRate: 2, repeat: -1, durations: [520, 160] } };
    registerAnims(scene, 'tex', anims, (n) => `p-${n}`);
    expect(created[0].key).toBe('p-idle');
    expect(created[0].frames.map((f) => f.duration)).toEqual([520, 160]);
  });

  it('sem durations, nenhum frame recebe duration (vale o frameRate)', () => {
    const { scene, created } = fakeScene(['a', 'b']);
    registerAnims(scene, 'tex', { run: { frames: ['a', 'b'], frameRate: 12, repeat: -1 } }, (n) => n);
    expect(created[0].frames.every((f) => f.duration === undefined)).toBe(true);
  });

  it('durations com tamanho diferente de frames lança erro com o nome da animação', () => {
    const { scene } = fakeScene(['a', 'b']);
    const bad = { quebrada: { frames: ['a', 'b'], frameRate: 2, repeat: 0, durations: [10] } };
    expect(() => registerAnims(scene, 'tex', bad, (n) => n)).toThrow(/quebrada/);
  });
});
