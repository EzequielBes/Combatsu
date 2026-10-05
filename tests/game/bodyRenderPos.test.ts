import { describe, expect, it } from 'vitest';
import type Phaser from 'phaser';
import { BodyRenderPos, renderAlpha } from '../../src/game/physics';

const STEP = 1000 / 60;

/** Cena falsa: o runner do Matter com o acumulador, e os eventos que `BodyRenderPos` assina. */
function fakeScene(timeBuffer = STEP) {
  const handlers = new Map<string, () => void>();
  const runner = { timeBuffer, delta: STEP };
  const scene = {
    matter: {
      world: {
        runner,
        on: (ev: string, fn: () => void) => handlers.set(ev, fn),
        off: (ev: string, fn: () => void) => {
          if (handlers.get(ev) === fn) handlers.delete(ev);
        },
      },
    },
    events: { once: (ev: string, fn: () => void) => handlers.set(`scene:${ev}`, fn) },
  } as unknown as Phaser.Scene;
  return { scene, runner, handlers, step: () => handlers.get('afterupdate')?.() };
}

const bodyAt = (x: number, y: number) => ({ position: { x, y } }) as unknown as MatterJS.BodyType;

describe('renderAlpha lê o acumulador do Matter (ITP-01)', () => {
  it('com 1 passo sobrando (passo fixo, 60 Hz) o alfa é 0,5', () => {
    expect(renderAlpha(fakeScene(STEP).scene)).toBeCloseTo(0.5, 10);
  });

  it('acompanha o acumulador: 0,75 passo dá 0,25; 1,25 passo dá 0,75', () => {
    expect(renderAlpha(fakeScene(STEP * 0.75).scene)).toBeCloseTo(0.25, 10);
    expect(renderAlpha(fakeScene(STEP * 1.25).scene)).toBeCloseTo(0.75, 10);
  });
});

describe('BodyRenderPos: posição de desenho de um corpo (ITP-05, ITP-07, EDG-02)', () => {
  it('guarda a posição a cada `afterupdate` e devolve a interpolada pelo alfa do quadro', () => {
    const { scene, runner, step } = fakeScene(STEP);
    const body = bodyAt(100, 50);
    const pos = new BodyRenderPos(scene, body);
    expect(pos.get()).toEqual({ x: 100, y: 50 });

    body.position.x = 104;
    step();
    expect(pos.get()).toEqual({ x: 102, y: 50 }); // alfa 0,5: ponto médio

    runner.timeBuffer = STEP * 1.25; // quadro sem passo, mais tempo acumulado: anda para a posição atual
    expect(pos.get().x).toBeCloseTo(103, 10);
  });

  it('sem passo de física, mexer no corpo não muda a posição de desenho (só o passo registra)', () => {
    const { scene } = fakeScene(STEP);
    const body = bodyAt(100, 50);
    const pos = new BodyRenderPos(scene, body);
    body.position.x = 110;
    expect(pos.get()).toEqual({ x: 100, y: 50 });
  });

  it('EDG-02: snap leva a posição de desenho para o corpo reposicionado, sem deslizar', () => {
    const { scene, step } = fakeScene(STEP);
    const body = bodyAt(100, 50);
    const pos = new BodyRenderPos(scene, body);
    body.position.x = 104;
    step();
    body.position.x = 130; // reposicionado a menos de 48 px: sem o snap, deslizaria
    body.position.y = 60;
    pos.snap();
    expect(pos.get()).toEqual({ x: 130, y: 60 });
    step();
    expect(pos.get()).toEqual({ x: 130, y: 60 });
  });

  it('stop solta o listener: passos depois dele não mudam mais a posição', () => {
    const { scene, handlers, step } = fakeScene(STEP);
    const body = bodyAt(0, 0);
    const pos = new BodyRenderPos(scene, body);
    pos.stop();
    expect(handlers.has('afterupdate')).toBe(false);
    body.position.x = 10;
    step();
    expect(pos.get()).toEqual({ x: 0, y: 0 });
  });

  it('assina o shutdown da cena para parar sozinho', () => {
    const { scene, handlers } = fakeScene(STEP);
    new BodyRenderPos(scene, bodyAt(0, 0));
    handlers.get('scene:shutdown')!();
    expect(handlers.has('afterupdate')).toBe(false);
  });
});
