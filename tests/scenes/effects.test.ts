import { describe, expect, it } from 'vitest';
import type { DamageKind } from '../../src/core/damageNumber';
import type { Hit, HitBand, Strength } from '../../src/core/hit';
import { HIT_BAND_FEEL } from '../../src/data/feel';
import { HITSTOP_MS } from '../../src/data/fx';
import type { Hittable } from '../../src/game/bodyTags';
import { EffectsDirector } from '../../src/scenes/test/effects';
import type { TestScene } from '../../src/scenes/TestScene';

/**
 * Cena falsa com o mínimo que o diretor usa: guarda as faíscas, as tremidas, as pausas e os números de dano, e expõe o
 * relógio real.
 */
function rig() {
  const sparks: { kind: string; size?: number }[] = [];
  const numbers: { targetId: number; value: number; kind: DamageKind }[] = [];
  const log = { shakes: 0, pauses: 0 };
  const loop = { time: 0 };
  const recorded: { source: string; damage: number }[] = [];
  const scene = {
    runDirector: { record: { onTechHit: (source: string, damage: number) => recorded.push({ source, damage }) } },
    fx: {
      spark: (_x: number, _y: number, kind: string, size?: number) => sparks.push({ kind, size }),
      shake: () => log.shakes++,
    },
    game: { loop },
    ui: {
      damageNumbers: {
        show: (target: { id: number }, value: number, kind: DamageKind) =>
          numbers.push({ targetId: target.id, value, kind }),
      },
    },
    matter: { world: { pause: () => log.pauses++, resume: () => undefined } },
    anims: { pauseAll: () => undefined, resumeAll: () => undefined },
    tweens: { pauseAll: () => undefined, resumeAll: () => undefined },
    time: { paused: false },
  } as unknown as TestScene;
  return { fx: new EffectsDirector(scene), sparks, numbers, log, loop, recorded };
}

const hit = (strength: Strength, band?: HitBand, damage = 1): Hit => ({
  ownerId: 1,
  damage,
  strength,
  direction: { x: 0, y: 0 },
  force: 0,
  tech: true,
  band,
});
const at = { x: 10, y: 20 };
const target = { id: 7, team: 'enemy' } as unknown as Hittable;
/** Anda `ms` de hitstop em passos de 10 ms (o diretor corta o quadro em `MAX_FRAME_MS`). */
const tick = (fx: EffectsDirector, ms: number) => {
  for (let left = ms; left > 0; left -= 10) fx.tickHitstop(0, Math.min(10, left));
};

describe('EffectsDirector.onTechConnect: número do dano levado (POW-06.7)', () => {
  it('o alvo que informa o dano levado (chefe em stagger, BFX-05) mostra esse valor, não o do golpe', () => {
    const r = rig();
    const boss = { id: 9, team: 'enemy', lastDamageTaken: 27 } as unknown as Hittable;
    r.fx.onTechConnect(hit('heavy', undefined, 18), at, boss, 'divergente');
    r.fx.onTechConnect(hit('heavy', undefined, 18), at, target, 'divergente');
    expect(r.numbers).toEqual([
      { targetId: 9, value: 27, kind: 'tech' },
      { targetId: 7, value: 18, kind: 'tech' },
    ]);
  });
});

describe('EffectsDirector.onTechConnect (POW-03)', () => {
  it('acerto normal segue igual: faísca do tipo, tremida no forte, hitstop e freeze', () => {
    const r = rig();
    r.fx.onTechConnect(hit('heavy'), at, target, 'divergente');
    expect(r.sparks).toEqual([{ kind: 'heavy', size: undefined }]);
    expect(r.log.shakes).toBe(1);
    expect(r.fx.hitstop.frozen).toBe(true);
    expect(r.fx.frozen).toBe(true);
    tick(r.fx, HITSTOP_MS.heavy);
    expect(r.fx.frozen).toBe(false);
  });

  it('chip: faísca 6, sem hitstop, sem freeze e sem tremida', () => {
    const r = rig();
    r.fx.onTechConnect(hit('heavy', 'chip'), at, target, 'divergente');
    expect(r.sparks).toEqual([{ kind: 'heavy', size: HIT_BAND_FEEL.chip.sparkSize }]);
    expect(r.fx.hitstop.frozen).toBe(false);
    expect(r.fx.frozen).toBe(false);
    expect(r.log).toEqual({ shakes: 0, pauses: 0 });
  });

  it('micro: faísca 10 e hitstop de 15 ms no leve, que acaba nos 15 ms', () => {
    const r = rig();
    r.fx.onTechConnect(hit('light', 'micro'), at, target, 'divergente');
    expect(r.sparks).toEqual([{ kind: 'light', size: HIT_BAND_FEEL.micro.sparkSize }]);
    expect(r.fx.frozen).toBe(true);
    expect(r.log.shakes).toBe(0);
    r.fx.tickHitstop(0, HIT_BAND_FEEL.micro.lightMs - 1);
    expect(r.fx.frozen).toBe(true);
    r.fx.tickHitstop(0, 1);
    expect(r.fx.frozen).toBe(false);
  });

  it('micro com o teto cheio: ainda risca a faísca 10, mas não congela; a janela anda no relógio real', () => {
    const r = rig();
    // 3 × 20 ms = 60 ms, o teto inteiro.
    for (let i = 0; i < 3; i++) {
      r.fx.onTechConnect(hit('heavy', 'micro'), at, target, 'divergente');
      tick(r.fx, HIT_BAND_FEEL.micro.heavyMs);
    }
    expect(r.log.pauses).toBe(3);
    r.loop.time = HIT_BAND_FEEL.micro.windowMs - 1;
    r.fx.onTechConnect(hit('light', 'micro'), at, target, 'divergente');
    expect(r.sparks).toHaveLength(4);
    expect(r.sparks[3]).toEqual({ kind: 'light', size: HIT_BAND_FEEL.micro.sparkSize });
    expect(r.fx.frozen).toBe(false);
    expect(r.log.pauses).toBe(3);
    r.loop.time = HIT_BAND_FEEL.micro.windowMs;
    r.fx.onTechConnect(hit('light', 'micro'), at, target, 'divergente');
    expect(r.fx.frozen).toBe(true);
  });
});

describe('EffectsDirector.onTechConnect: registro da run (DMG-02)', () => {
  it('soma o dano na técnica de origem em toda faixa, inclusive no chip que volta cedo', () => {
    const r = rig();
    r.fx.onTechConnect(hit('heavy', undefined, 18), at, target, 'vermelho');
    r.fx.onTechConnect(hit('light', 'micro', 4), at, target, 'azul');
    r.fx.onTechConnect(hit('light', 'chip', 2), at, target, 'divergente');
    expect(r.recorded).toEqual([
      { source: 'vermelho', damage: 18 },
      { source: 'azul', damage: 4 },
      { source: 'divergente', damage: 2 },
    ]);
  });
});

describe('EffectsDirector.onTechConnect: número de dano (POW-06.7)', () => {
  it('mostra no alvo o dano do golpe com o tipo da faixa: tech sem faixa, micro e chip', () => {
    const r = rig();
    r.fx.onTechConnect(hit('heavy', undefined, 18), at, target, 'divergente');
    r.fx.onTechConnect(hit('light', 'micro', 4), at, target, 'divergente');
    r.fx.onTechConnect(hit('light', 'chip', 2), at, target, 'divergente');
    expect(r.numbers).toEqual([
      { targetId: 7, value: 18, kind: 'tech' },
      { targetId: 7, value: 4, kind: 'micro' },
      { targetId: 7, value: 2, kind: 'chip' },
    ]);
  });

  it('micro com o teto cheio ainda mostra o número (edge case)', () => {
    const r = rig();
    for (let i = 0; i < 4; i++) {
      r.fx.onTechConnect(hit('heavy', 'micro', 3), at, target, 'divergente');
      tick(r.fx, HIT_BAND_FEEL.micro.heavyMs);
    }
    expect(r.log.pauses).toBe(3);
    expect(r.sparks).toHaveLength(4);
    expect(r.numbers.map((n) => n.kind)).toEqual(['micro', 'micro', 'micro', 'micro']);
  });
});
