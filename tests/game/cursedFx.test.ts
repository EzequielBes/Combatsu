import { describe, expect, it, vi } from 'vitest';
import type { ImpactTier } from '../../src/core/impactTier';
import { trailStyle } from '../../src/core/strikePath';
import { PALETTE } from '../../src/game/art/palette';
import { CURSED_FX_KEYS, CursedFx, canSpawnParticle, trailPolygon, type ImpactLook } from '../../src/game/CursedFx';
import { CURSED_TONE, toneFromKeys, type ImpactTone } from '../../src/game/cursedImpact';
import { IMPACT_FEEL, POWER_FEEL } from '../../src/data/feel';

// A folha de pedacinhos pede canvas; aqui só importa o desenho em `Graphics`.
vi.mock('../../src/game/art/render', () => ({ registerSheet: () => undefined }));

describe('CursedFx (parte pura)', () => {
  it('TRL-06: as cores do efeito são exatamente d, c, C, u e U, todas na paleta', () => {
    expect([...CURSED_FX_KEYS].sort()).toEqual(['C', 'U', 'c', 'd', 'u']);
    for (const k of CURSED_FX_KEYS) expect(PALETTE[k]).toBeTypeOf('number');
    for (const k of ['k', 'b', 'a', 'A']) expect(CURSED_FX_KEYS).not.toContain(k);
  });

  it('EDG-03: estilhaços e resíduos são pulados a partir do teto, não antes', () => {
    expect(canSpawnParticle(IMPACT_FEEL.fxCap - 1)).toBe(true);
    expect(canSpawnParticle(IMPACT_FEEL.fxCap)).toBe(false);
    expect(canSpawnParticle(IMPACT_FEEL.fxCap + 1)).toBe(false);
  });

  it('TRL-03: o polígono do rastro cai na grade de 2 px e é mais fino nas pontas que no meio', () => {
    const poly = trailPolygon(
      [
        { x: 100, y: 200 },
        { x: 160, y: 180 },
      ],
      8,
    );
    expect(poly.length).toBeGreaterThanOrEqual(6);
    for (const p of poly) {
      expect(p.x % 2).toBe(0);
      expect(p.y % 2).toBe(0);
    }
    const xs = poly.map((p) => p.x);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(98);
    expect(Math.max(...xs)).toBeLessThanOrEqual(162);
    const near = (x: number): number[] => poly.filter((p) => Math.abs(p.x - x) <= 4).map((p) => p.y);
    const span = (ys: number[]): number => Math.max(...ys) - Math.min(...ys);
    expect(span(near(130))).toBeGreaterThan(span(near(102)));
  });

  it('TRL-03: caminho com menos de 2 pontos não gera polígono', () => {
    expect(trailPolygon([{ x: 1, y: 1 }], 4)).toEqual([]);
  });
});

type Call = [string, ...unknown[]];

/** Cena falsa: cada `Graphics` grava as chamadas, e o contador do impacto fica guardado para andar o `p` à mão. */
function rig() {
  const logs: Call[][] = [];
  const counters: ((t: { getValue: () => number }) => void)[] = [];
  const graphics = () => {
    const log: Call[] = [];
    logs.push(log);
    const g: Record<string, unknown> = { active: true, setDepth: () => g, once: () => g, destroy: () => undefined };
    const rec = ['clear', 'fillStyle', 'fillPoints', 'lineStyle', 'strokeCircle', 'arc', 'beginPath', 'strokePath'];
    for (const m of [...rec, 'setAlpha', 'fillRect', 'strokePoints']) {
      g[m] = (...a: unknown[]) => {
        log.push([m, ...a]);
        return g;
      };
    }
    return g;
  };
  const scene = {
    add: { graphics },
    tweens: {
      add: () => ({ progress: 0 }),
      addCounter: (c: { onUpdate: (t: { getValue: () => number }) => void }) => counters.push(c.onUpdate),
    },
  };
  const fx = new CursedFx(scene as never);
  /** Desenha o impacto em `p` e devolve as chamadas daquele quadro. */
  const drawAt = (tier: ImpactTier, p: number, look?: ImpactLook): Call[] => {
    fx.impact(tier, { x: 101, y: 57 }, { x: 1, y: -0.2 }, 42, look);
    const log = logs.at(-1)!;
    if (p > 0) {
      log.length = 0;
      counters.at(-1)!({ getValue: () => p });
    }
    return [...log];
  };
  return { fx, drawAt };
}

const AT = { x: 101, y: 57 };
/** Maior distância do centro entre os vértices preenchidos. */
const reach = (log: Call[]): number =>
  Math.max(
    ...log
      .filter((c) => c[0] === 'fillPoints')
      .flatMap((c) => (c[1] as { x: number; y: number }[]).map((v) => Math.hypot(v.x - AT.x, v.y - AT.y))),
  );
const rings = (log: Call[]): number[] =>
  log.filter((c) => c[0] === 'strokeCircle' || c[0] === 'arc').map((c) => c[3] as number);
const fills = (log: Call[]): number[] => log.filter((c) => c[0] === 'fillStyle').map((c) => c[1] as number);
const lines = (log: Call[]): number[] => log.filter((c) => c[0] === 'lineStyle').map((c) => c[2] as number);
const colorsOf = (t: ImpactTone): number[] => [t.shadow, t.body, t.core, t.altBody, t.altCore];
const BIG: ImpactLook = { scale: 1.5, tone: CURSED_TONE };
const RED: ImpactTone = toneFromKeys(POWER_FEEL.tones[3]);

describe('CursedFx: força do corpo no impacto (POW-08, POW-09)', () => {
  it('sem look a forma é a de hoje: escala 1 e tom amaldiçoado dão o mesmo desenho', () => {
    const r = rig();
    for (const tier of ['heavy', 'decisive'] as const) {
      for (const p of [0, 0.3, 0.7]) {
        expect(r.drawAt(tier, p, { scale: 1, tone: CURSED_TONE })).toEqual(r.drawAt(tier, p));
      }
    }
    const e = 1 - 0.7 * 0.7;
    const ring = IMPACT_FEEL.ringFromPx + (IMPACT_FEEL.ringToPx - IMPACT_FEEL.ringFromPx) * e;
    expect(rings(r.drawAt('heavy', 0.3))[0]).toBeCloseTo(ring);
    expect(new Set([...fills(r.drawAt('decisive', 0)), ...lines(r.drawAt('decisive', 0.3))])).toEqual(
      new Set(colorsOf(CURSED_TONE)),
    );
  });

  it('escala 1,5 aumenta agulhas, estrela e as duas ondas', () => {
    const r = rig();
    for (const tier of ['heavy', 'decisive'] as const) {
      expect(reach(r.drawAt(tier, 0.3, BIG))).toBeGreaterThan(reach(r.drawAt(tier, 0.3)) * 1.3);
      const [w1, w2] = [rings(r.drawAt(tier, 0.3)), rings(r.drawAt(tier, 0.3, BIG))];
      expect(w2.length).toBe(w1.length);
      w2.forEach((rad, i) => expect(rad).toBeCloseTo(w1[i]! * 1.5));
    }
    expect(rings(r.drawAt('decisive', 0.3, BIG))).toHaveLength(2);
    // No `p = 0` a estrela domina o centro: a sombra do eixo longo cresce com a escala.
    const star = (log: Call[]) =>
      reach(log.filter((c, i) => c[0] === 'fillPoints' && log[i - 1]![1] === CURSED_TONE.shadow));
    expect(star(r.drawAt('heavy', 0, BIG))).toBeGreaterThan(star(r.drawAt('heavy', 0)) * 1.3);
  });

  it('agulhas, estrela e as duas ondas usam o tom dado', () => {
    const r = rig();
    const look = { scale: 1, tone: RED };
    const used = [...fills(r.drawAt('decisive', 0, look)), ...fills(r.drawAt('decisive', 0.3, look))];
    expect(used).toContain(RED.shadow);
    for (const c of used) expect(colorsOf(RED)).toContain(c);
    expect(lines(r.drawAt('decisive', 0.2, look))).toEqual([RED.core]);
    expect(lines(r.drawAt('decisive', 0.5, look))).toEqual([RED.body, RED.altBody]);
  });

  it('o leve ignora o look', () => {
    const r = rig();
    for (const p of [0, 0.4]) expect(r.drawAt('light', p, { scale: 1.5, tone: RED })).toEqual(r.drawAt('light', p));
  });

  it('extraPx soma na largura do rastro', () => {
    const r = rig();
    const path = [
      { x: 100, y: 200 },
      { x: 160, y: 180 },
    ];
    r.fx.trail(path, 'heavy');
    r.fx.trail(path, 'heavy', 3);
    r.fx.trail(path, 'light', 1);
    expect(r.fx.trails.map((t) => t.widthPx)).toEqual([
      trailStyle('heavy').widthPx,
      trailStyle('heavy').widthPx + 3,
      trailStyle('light').widthPx + 1,
    ]);
  });

  it('toneFromKeys resolve as 5 chaves da paleta em cada patamar', () => {
    expect(toneFromKeys(POWER_FEEL.tones[0])).toEqual(CURSED_TONE);
    for (const keys of POWER_FEEL.tones) {
      const tone = toneFromKeys(keys);
      expect(colorsOf(tone)).toEqual(
        [keys.shadow, keys.body, keys.core, keys.altBody, keys.altCore].map((k) => PALETTE[k]),
      );
      for (const c of colorsOf(tone)) expect(c).toBeTypeOf('number');
    }
  });
});
