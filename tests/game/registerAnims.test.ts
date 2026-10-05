import { describe, expect, it } from 'vitest';
import type Phaser from 'phaser';
import { registerAnims } from '../../src/game/art';
import { BOSS_ANIMS, BOSS_FRAMES, bossAnimKey } from '../../src/game/art/sprites/boss';
import type { AnimDef } from '../../src/game/art/sprites/player';

/** Cena falsa: só o que `registerAnims` usa, capturando a config passada ao `anims.create`. */
function fakeScene(frames: string[]) {
  const created: Array<{
    key: string;
    repeat: number;
    frames: Array<{ key: string; frame: string; duration?: number }>;
  }> = [];
  const scene = {
    textures: { get: () => ({ has: (f: string) => frames.includes(f) }) },
    anims: { exists: () => false, remove: () => undefined, create: (c: (typeof created)[number]) => created.push(c) },
  } as unknown as Phaser.Scene;
  return { scene, created };
}

describe('registerAnims repassa a duração por frame ao Phaser (SPR-08)', () => {
  it('cada frame recebe a duration declarada em durations', () => {
    const { scene, created } = fakeScene(['a', 'b']);
    const anims: Record<string, AnimDef> = {
      idle: { frames: ['a', 'b'], frameRate: 2, repeat: -1, durations: [520, 160] },
    };
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

describe('registerAnims com as animações do chefe (BAN-07, EDG-02)', () => {
  const keyOf = (name: string): string => bossAnimKey('oni', name);

  it('BAN-07: cada animação de 2 ou mais frames chega ao Phaser com a duration de cada frame e o repeat declarado', () => {
    const { scene, created } = fakeScene(Object.keys(BOSS_FRAMES));
    registerAnims(scene, 'boss-oni', BOSS_ANIMS, keyOf);
    const byKey = new Map(created.map((c) => [c.key, c]));
    const multi = Object.entries(BOSS_ANIMS).filter(([, def]) => def.frames.length >= 2);
    // idle, os três preparos, charge, volley, roar e stagger.
    expect(multi).toHaveLength(8);
    for (const [name, def] of multi) {
      const config = byKey.get(keyOf(name));
      expect(config, name).toBeDefined();
      expect(
        config!.frames.map((f) => f.frame),
        name,
      ).toEqual(def.frames);
      expect(
        config!.frames.map((f) => f.duration),
        name,
      ).toEqual(def.durations);
      expect(config!.repeat, name).toBe(def.repeat);
    }
    // Os valores da spec num caso concreto, lidos do que chegou ao Phaser.
    expect(byKey.get('boss-oni-stagger')!.frames.map((f) => f.duration)).toEqual([220, 220]);
    expect(byKey.get('boss-oni-stagger')!.repeat).toBe(-1);
    expect(byKey.get('boss-oni-idle')!.frames.map((f) => f.duration)).toEqual(BOSS_ANIMS.idle.durations);
  });

  it('EDG-02: durations com tamanho diferente de frames numa animação do chefe lança erro com o nome dela', () => {
    const { scene } = fakeScene(Object.keys(BOSS_FRAMES));
    const broken: Record<string, AnimDef> = { ...BOSS_ANIMS, roar: { ...BOSS_ANIMS.roar, durations: [80] } };
    expect(() => registerAnims(scene, 'boss-oni', broken, keyOf)).toThrow(/roar/);
  });
});
