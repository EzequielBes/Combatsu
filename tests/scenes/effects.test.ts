import { describe, expect, it } from 'vitest';
import type { Hit, HitBand, Strength } from '../../src/core/hit';
import { HIT_BAND_FEEL } from '../../src/data/feel';
import { HITSTOP_MS } from '../../src/data/fx';
import { EffectsDirector } from '../../src/scenes/test/effects';
import type { TestScene } from '../../src/scenes/TestScene';

/** Cena falsa com o mínimo que o diretor usa: guarda as faíscas, as tremidas e as pausas, e expõe o relógio real. */
function rig() {
  const sparks: { kind: string; size?: number }[] = [];
  const log = { shakes: 0, pauses: 0 };
  const loop = { time: 0 };
  const scene = {
    fx: {
      spark: (_x: number, _y: number, kind: string, size?: number) => sparks.push({ kind, size }),
      shake: () => log.shakes++,
    },
    game: { loop },
    matter: { world: { pause: () => log.pauses++, resume: () => undefined } },
    anims: { pauseAll: () => undefined, resumeAll: () => undefined },
    tweens: { pauseAll: () => undefined, resumeAll: () => undefined },
    time: { paused: false },
  } as unknown as TestScene;
  return { fx: new EffectsDirector(scene), sparks, log, loop };
}

const hit = (strength: Strength, band?: HitBand): Hit => ({
  ownerId: 1,
  damage: 1,
  strength,
  direction: { x: 0, y: 0 },
  force: 0,
  tech: true,
  band,
});
const at = { x: 10, y: 20 };
/** Anda `ms` de hitstop em passos de 10 ms (o diretor corta o quadro em `MAX_FRAME_MS`). */
const tick = (fx: EffectsDirector, ms: number) => {
  for (let left = ms; left > 0; left -= 10) fx.tickHitstop(0, Math.min(10, left));
};

describe('EffectsDirector.onTechConnect (POW-03)', () => {
  it('acerto normal segue igual: faísca do tipo, tremida no forte, hitstop e freeze', () => {
    const r = rig();
    r.fx.onTechConnect(hit('heavy'), at);
    expect(r.sparks).toEqual([{ kind: 'heavy', size: undefined }]);
    expect(r.log.shakes).toBe(1);
    expect(r.fx.hitstop.frozen).toBe(true);
    expect(r.fx.frozen).toBe(true);
    tick(r.fx, HITSTOP_MS.heavy);
    expect(r.fx.frozen).toBe(false);
  });

  it('chip: faísca 6, sem hitstop, sem freeze e sem tremida', () => {
    const r = rig();
    r.fx.onTechConnect(hit('heavy', 'chip'), at);
    expect(r.sparks).toEqual([{ kind: 'heavy', size: HIT_BAND_FEEL.chip.sparkSize }]);
    expect(r.fx.hitstop.frozen).toBe(false);
    expect(r.fx.frozen).toBe(false);
    expect(r.log).toEqual({ shakes: 0, pauses: 0 });
  });

  it('micro: faísca 10 e hitstop de 15 ms no leve, que acaba nos 15 ms', () => {
    const r = rig();
    r.fx.onTechConnect(hit('light', 'micro'), at);
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
      r.fx.onTechConnect(hit('heavy', 'micro'), at);
      tick(r.fx, HIT_BAND_FEEL.micro.heavyMs);
    }
    expect(r.log.pauses).toBe(3);
    r.loop.time = HIT_BAND_FEEL.micro.windowMs - 1;
    r.fx.onTechConnect(hit('light', 'micro'), at);
    expect(r.sparks).toHaveLength(4);
    expect(r.sparks[3]).toEqual({ kind: 'light', size: HIT_BAND_FEEL.micro.sparkSize });
    expect(r.fx.frozen).toBe(false);
    expect(r.log.pauses).toBe(3);
    r.loop.time = HIT_BAND_FEEL.micro.windowMs;
    r.fx.onTechConnect(hit('light', 'micro'), at);
    expect(r.fx.frozen).toBe(true);
  });
});
