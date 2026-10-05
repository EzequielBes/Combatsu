import { describe, expect, it } from 'vitest';
import { FIST_FLAME, FLAME_SIZES, FLAME_STAGES, FlameSim } from '../../src/core/flame';
import { PALETTE_KEYS } from '../../src/game/art/palette';
import { FLAME_FRAMES, flameFrame } from '../../src/game/art/sprites/flame';
import { parseSheet } from '../../src/core/pixelGrid';

const STEP = 1000 / 60;
const run = (sim: FlameSim, ms: number, at: (t: number) => { x: number; y: number } | null): void => {
  for (let t = 0; t < ms; t += STEP) sim.tick(STEP, at(t));
};

describe('FLM-01: a chama acende, vive e apaga', () => {
  it('com a fonte parada nascem línguas, e todas ficam acima ou em volta dela', () => {
    const sim = new FlameSim(3);
    run(sim, 400, () => ({ x: 100, y: 100 }));
    expect(sim.tongues.length).toBeGreaterThan(15);
    for (const t of sim.tongues) {
      expect(t.y).toBeLessThanOrEqual(100 + FIST_FLAME.baseDrop + FIST_FLAME.spreadY);
      expect(Math.abs(t.x - 100)).toBeLessThanOrEqual(FIST_FLAME.spreadX + FIST_FLAME.swayPx);
    }
  });

  it('sem a fonte não nasce mais nada e a chama esvazia dentro da vida máxima de uma língua', () => {
    const sim = new FlameSim(3);
    run(sim, 300, () => ({ x: 0, y: 0 }));
    expect(sim.empty).toBe(false);
    run(sim, FIST_FLAME.lifeMs + FIST_FLAME.lifeJitterMs + STEP, () => null);
    expect(sim.empty).toBe(true);
  });

  it('a mesma semente dá a mesma chama; sementes diferentes, chamas diferentes', () => {
    const shot = (seed: number): string => {
      const sim = new FlameSim(seed);
      run(sim, 250, (t) => ({ x: t * 0.2, y: 50 }));
      return JSON.stringify(sim.tongues.map((t) => [Math.round(t.x), Math.round(t.y), t.stage, t.size]));
    };
    expect(shot(5)).toBe(shot(5));
    expect(shot(5)).not.toBe(shot(6));
  });
});

describe('FLM-02: a chama esfria e encolhe, e a ordem de desenho deixa o núcleo por cima', () => {
  const sim = new FlameSim(9);
  run(sim, 500, () => ({ x: 0, y: 0 }));

  it('estágio e tamanho ficam dentro da folha e todos os estágios aparecem', () => {
    const stages = new Set<number>();
    for (const t of sim.tongues) {
      expect(t.stage).toBeGreaterThanOrEqual(0);
      expect(t.stage).toBeLessThan(FLAME_STAGES);
      expect(t.size).toBeGreaterThanOrEqual(0);
      expect(t.size).toBeLessThan(FLAME_SIZES);
      stages.add(t.stage);
    }
    expect(stages.size).toBe(FLAME_STAGES);
  });

  it('a lista vai da língua mais velha (fria) para a mais nova (quente)', () => {
    const tongues = sim.tongues;
    const firstThird = tongues.slice(0, Math.floor(tongues.length / 3));
    const lastThird = tongues.slice(-Math.floor(tongues.length / 3));
    const mean = (list: readonly { stage: number }[]): number => list.reduce((a, t) => a + t.stage, 0) / list.length;
    expect(mean(firstThird)).toBeGreaterThan(mean(lastThird));
  });
});

describe('FLM-03: a fonte em movimento deixa rastro', () => {
  it('um disparo de 44 px em 80 ms deixa línguas ao longo de todo o caminho', () => {
    const sim = new FlameSim(4);
    run(sim, 80, (t) => ({ x: (t / 80) * 44, y: 0 }));
    const xs = sim.tongues.map((t) => t.x);
    // Nenhum vão maior que 8 px entre línguas vizinhas no eixo do movimento.
    const sorted = [...xs].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) expect(sorted[i]! - sorted[i - 1]!).toBeLessThan(8);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(30);
  });
});

describe('FLM-04: a folha da chama', () => {
  it('tem um frame por cor, estágio e tamanho, todos do mesmo tamanho e só com cores da paleta', () => {
    const sheet = parseSheet('cursed-flame', FLAME_FRAMES, PALETTE_KEYS);
    expect(sheet.frames.length).toBe(3 * FLAME_STAGES * FLAME_SIZES);
    for (const color of ['blue', 'red', 'white'] as const) {
      for (let stage = 0; stage < FLAME_STAGES; stage++) {
        for (let size = 0; size < FLAME_SIZES; size++)
          expect(FLAME_FRAMES[flameFrame(color, stage, size)]).toBeDefined();
      }
    }
  });
});
