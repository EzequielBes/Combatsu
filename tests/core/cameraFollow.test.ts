import { describe, expect, it } from 'vitest';
import { clampCenter, followCenter, scrollFor, type FollowConfig } from '../../src/core/cameraFollow';
import { STEP_BUFFER_MARGIN, StepLerp, stepAlpha } from '../../src/core/stepLerp';

const FRAME = 1000 / 60;
const CFG: FollowConfig = {
  deadzone: { w: 40, h: 24 },
  lerp: 0.15,
  view: { w: 640, h: 360 },
  bounds: { x: 0, y: 0, w: 1280, h: 544 },
};
const C = { x: 600, y: 250 };

describe('followCenter: zona morta e amortecimento por tempo (CAM-01, CAM-02, CAM-03)', () => {
  it('CAM-01: com o alvo dentro da zona morta (inclusive na borda), o centro não muda', () => {
    for (const t of [
      { x: 600, y: 250 },
      { x: 620, y: 250 },
      { x: 580, y: 250 },
      { x: 600, y: 262 },
      { x: 600, y: 238 },
    ]) {
      expect(followCenter(C, t, CFG, FRAME)).toEqual(C);
    }
  });

  it('CAM-02: alvo d px além da borda: num quadro de 1000/60 ms o centro anda 0,15 × d na direção dele', () => {
    const right = followCenter(C, { x: 600 + 20 + 100, y: 250 }, CFG, FRAME);
    expect(right.x).toBeCloseTo(600 + 15, 10);
    expect(right.y).toBe(250);
    const left = followCenter(C, { x: 600 - 20 - 100, y: 250 }, CFG, FRAME);
    expect(left.x).toBeCloseTo(600 - 15, 10);
    const down = followCenter(C, { x: 600, y: 250 + 12 + 40 }, CFG, FRAME);
    expect(down.y).toBeCloseTo(250 + 6, 10);
    expect(down.x).toBe(600);
    const up = followCenter(C, { x: 600, y: 250 - 12 - 40 }, CFG, FRAME);
    expect(up.y).toBeCloseTo(250 - 6, 10);
  });

  it('CAM-02: um texel além da borda já move; na borda exata, não', () => {
    expect(followCenter(C, { x: 621, y: 250 }, CFG, FRAME).x).toBeCloseTo(600.15, 10);
    expect(followCenter(C, { x: 620, y: 250 }, CFG, FRAME).x).toBe(600);
  });

  it('CAM-03: dois quadros de 1000/120 ms chegam ao mesmo ponto que um de 1000/60 ms (alvo parado)', () => {
    const target = { x: 760, y: 320 };
    const one = followCenter(C, target, CFG, FRAME);
    const two = followCenter(followCenter(C, target, CFG, FRAME / 2), target, CFG, FRAME / 2);
    expect(Math.abs(two.x - one.x)).toBeLessThanOrEqual(1e-6);
    expect(Math.abs(two.y - one.y)).toBeLessThanOrEqual(1e-6);
    // Sem o amortecimento por tempo, meio quadro a 0,15 cada daria um ponto diferente.
    const naive = 600 + 140 * 0.15 + (140 - 140 * 0.15) * 0.15;
    expect(Math.abs(naive - one.x)).toBeGreaterThan(1);
  });
});

describe('clampCenter: a vista fica dentro do mundo (CAM-04, CAM-05)', () => {
  it('CAM-04: o centro fica entre bounds.x + view.w/2 e bounds.x + bounds.w − view.w/2, e o mesmo em y', () => {
    expect(clampCenter({ x: 0, y: 0 }, CFG.view, CFG.bounds)).toEqual({ x: 320, y: 180 });
    expect(clampCenter({ x: 5000, y: 5000 }, CFG.view, CFG.bounds)).toEqual({ x: 960, y: 364 });
    expect(clampCenter({ x: 320, y: 180 }, CFG.view, CFG.bounds)).toEqual({ x: 320, y: 180 });
    expect(clampCenter({ x: 960, y: 364 }, CFG.view, CFG.bounds)).toEqual({ x: 960, y: 364 });
    expect(clampCenter({ x: 700, y: 300 }, CFG.view, CFG.bounds)).toEqual({ x: 700, y: 300 });
  });

  it('CAM-04: o followCenter já devolve o centro dentro dos limites', () => {
    const c = followCenter({ x: 950, y: 360 }, { x: 5000, y: 5000 }, CFG, FRAME);
    expect(c).toEqual({ x: 960, y: 364 });
  });

  it('CAM-05: com a vista maior que os limites num eixo, o centro fica em bounds.x + view.w/2 nesse eixo', () => {
    const view = { w: 2000, h: 360 };
    expect(clampCenter({ x: 900, y: 300 }, view, CFG.bounds)).toEqual({ x: 1000, y: 300 });
    expect(clampCenter({ x: -50, y: 9000 }, { w: 640, h: 800 }, { x: 10, y: 20, w: 1280, h: 544 })).toEqual({
      x: 330,
      y: 420,
    });
  });
});

describe('scrollFor: scroll na grade de pixel de tela (CAM-06)', () => {
  it('devolve centro − metade do canvas, arredondado ao múltiplo mais próximo de 1/zoom', () => {
    const s = scrollFor({ x: 500.3, y: 300.7 }, { w: 960, h: 540 }, 1.5);
    expect(s.x).toBeCloseTo(30 / 1.5, 10); // 20,3 × 1,5 = 30,45 -> 30
    expect(s.y).toBeCloseTo(46 / 1.5, 10); // 30,7 × 1,5 = 46,05 -> 46
    expect(scrollFor({ x: 480, y: 270 }, { w: 960, h: 540 }, 1.5)).toEqual({ x: 0, y: 0 });
  });

  it('arredonda para o mais próximo, dos dois lados do meio', () => {
    // 0,3 × 1,5 = 0,45 -> 0; 0,4 × 1,5 = 0,6 -> 1 (= 0,6667 px de mundo)
    expect(scrollFor({ x: 480.3, y: 270 }, { w: 960, h: 540 }, 1.5).x).toBe(0);
    expect(scrollFor({ x: 480.4, y: 270 }, { w: 960, h: 540 }, 1.5).x).toBeCloseTo(1 / 1.5, 10);
  });

  it('com zoom 2 a grade é de meio px de mundo', () => {
    expect(scrollFor({ x: 480.3, y: 270.8 }, { w: 960, h: 540 }, 2)).toEqual({ x: 0.5, y: 1 });
  });
});

describe('correr a 220 px/s com física a 60 Hz: variação na tela por taxa de atualização (ITP-04)', () => {
  const STEP = 1000 / 60;
  const ZOOM = 1.5;
  const SPEED = 220;
  const WIDE: FollowConfig = { ...CFG, bounds: { x: -1e6, y: -1e6, w: 2e6, h: 2e6 } };

  /** Maior variação na tela, em regime, de (posição de desenho − scroll) × zoom entre quadros seguidos. */
  function maxScreenJitter(hz: number, method: 'novo' | 'antigo'): number {
    const frameMs = 1000 / hz;
    let buffer = STEP;
    let bodyX = 0;
    const lerp = new StepLerp({ x: 0, y: 0 });
    let center = { x: 0, y: 0 };
    let oldScroll = -480;
    const rel: number[] = [];
    for (let f = 0; f < hz * 4; f++) {
      // Acumulador do Matter no Phaser: junta o tempo do quadro e dá um passo a cada 1,5 passo acumulado.
      buffer = Math.min(buffer + frameMs, frameMs + STEP * STEP_BUFFER_MARGIN);
      while (buffer >= STEP * STEP_BUFFER_MARGIN) {
        bodyX += (SPEED * STEP) / 1000;
        lerp.push({ x: bodyX, y: 0 });
        buffer -= STEP;
      }
      let screenX: number;
      if (method === 'novo') {
        const draw = lerp.at(stepAlpha(buffer, STEP));
        center = followCenter(center, draw, WIDE, frameMs);
        const scroll = scrollFor(center, { w: 960, h: 540 }, ZOOM);
        screenX = (draw.x - scroll.x) * ZOOM;
      } else {
        // O que o Phaser fazia: lerp por quadro, Math.floor no scroll (dentro da realimentação) e no sprite.
        const right = oldScroll + 480 + WIDE.deadzone.w / 2;
        if (bodyX > right) oldScroll += (bodyX - right) * WIDE.lerp;
        oldScroll = Math.floor(oldScroll);
        screenX = (Math.floor(bodyX) - oldScroll) * ZOOM;
      }
      if (f > hz * 2) rel.push(screenX);
    }
    return Math.max(...rel.slice(1).map((v, i) => Math.abs(v - rel[i])));
  }

  it.each([60, 75, 120, 144])('a %i Hz, o método novo varia no máximo 1 px na tela', (hz) => {
    expect(maxScreenJitter(hz, 'novo')).toBeLessThanOrEqual(1);
  });

  it.each([60, 75, 120, 144])(
    'a %i Hz, o método antigo (floor na realimentação, sem interpolar) passava de 1 px',
    (hz) => {
      expect(maxScreenJitter(hz, 'antigo')).toBeGreaterThan(1);
    },
  );
});
