import { afterEach, describe, expect, it } from 'vitest';
import { installDebugApi, registerDebugProbe, type GameSnapshot } from '../../src/game/debugApi';

const DT = 1000 / 60;

function fakeGame() {
  const calls = { sleep: 0, steps: [] as { time: number; delta: number }[] };
  const game = {
    loop: {
      now: 1234,
      sleep: () => {
        calls.sleep++;
      },
    },
    headlessStep: (time: number, delta: number) => {
      calls.steps.push({ time, delta });
    },
  };
  return { game, calls };
}

type Api = { snapshot(): GameSnapshot; step(ms: number): void };

afterEach(() => registerDebugProbe(null));

describe('installDebugApi', () => {
  it('sem debug não define __game (FND-10)', () => {
    const target: { __game?: Api } = {};
    installDebugApi(fakeGame().game, target, false);
    expect(target.__game).toBeUndefined();
  });

  it('snapshot devolve o que o probe registrado devolve (FND-09)', () => {
    const snap: GameSnapshot = {
      player: {
        x: 10,
        y: 20,
        hp: 100,
        dead: false,
        facing: 1,
        flash: null,
        maxHp: 100,
        vy: 0,
        move: null,
        frame: 'idle-0',
        view: { x: 10, y: 20 },
        guard: 'none',
        structure: { cur: 0, max: 100, broken: false },
        dodge: { active: false, invulnerable: false, cooldownMs: 0 },
        duck: { active: false },
        counter: { open: false, kind: null, remainingMs: 0 },
        invulnerable: false,
      },
      enemies: [
        {
          id: 7,
          x: 30,
          y: 40,
          hp: 60,
          state: 'idle',
          ai: 'chase',
          maxHp: 60,
          damage: 12,
          chaseSpeed: 70,
          weapon: null,
          weaponVisible: null,
          structure: { cur: 0, max: 100, broken: false },
          guarding: false,
          variant: 'corcunda',
          view: { x: 30, y: 40 },
          frame: 'idle-0',
          spriteVisible: true,
          ragdollVisible: null,
          ragdollTextures: null,
          slide: null,
          telegraph: null,
          committed: false,
          commitFlash: null,
          attack: { kind: 'white', index: 0, length: 1 },
          downHits: 0,
          lightStreak: 0,
          guardRead: false,
        },
      ],
      focusId: null,
      reading: { move: null, repeats: 0 },
      events: ['enemyDied:3'],
      deaths: [{ id: 3, x: 50, y: 60 }],
      boss: null,
      projectiles: [],
      run: { state: 'roundActive', round: 1, kills: 0, alive: 1, queued: 2, maxAlive: 5 },
      attackers: 0,
      gate: { active: 0, queue: [] },
      level: { playerSpawn: { x: 96, y: 460 } },
      area: {
        mode: 'sala',
        modules: [],
        widthPx: 1280,
        heightPx: 544,
        sealed: false,
        exitX: null,
        staticBodies: 4,
        sheets: [],
        bands: [],
        midBands: [],
        decor: 0,
        front: null,
        layout: { nearDepth: null, decorDepth: null, decorFoot: null, decorPerModule: [], playerDepth: 1 },
        bodies: 4,
        seal: null,
        transitioning: false,
        fade: { running: false, out: true, alpha: 0 },
      },
      hud: {
        ignoredByMain: true,
        round: 'Rodada 1',
        remaining: 'Inimigos: 3',
        banner: null,
        center: null,
        bannerPos: { x: 480, y: 135 },
        bossBar: { visible: false, name: '', width: 400, fillWidth: 400, marks: [264, 132] },
        bossBarIgnoredByMain: true,
        fragments: '4',
        heldItem: null,
        combo: { text: null, grade: null, x: 948, ignoredByMain: true },
        controls: '',
        ceOutline: { stroke: '#0b0d1a', thickness: 3 },
        outlines: {
          hp: { stroke: '#0b0d1a', thickness: 3 },
          fragments: { stroke: '#0b0d1a', thickness: 3 },
          heldItem: { stroke: '#0b0d1a', thickness: 3 },
          round: { stroke: '#0b0d1a', thickness: 3 },
          remaining: { stroke: '#0b0d1a', thickness: 3 },
        },
        techIgnoredByMain: true,
        energy: {
          width: 104,
          fillWidth: 104,
          marks: [null, null],
          masteryBars: [null, null],
          icons: [
            { cooldownOverlayHeight: 0, iconHeight: 48 },
            { cooldownOverlayHeight: 0, iconHeight: 48 },
          ],
          flashing: false,
        },
        callout: null,
        kokusenCard: null,
      },
      combo: { hits: 0, grade: null },
      timeScale: 1,
      hitstop: { frozen: false, remainingMs: 0 },
      wallet: { fragments: 4 },
      shop: { open: false, offers: [], rerollCost: 0, selected: 0, panel: null },
      modifiers: { vida: 0, forca: 0, agilidade: 0, ima: 0, sorte: 0 },
      build: { build: null, points: { lutador: 0, feiticeiro: 0, veloz: 0 }, perks: [], shadowArmed: false },
      arsenal: { relic: null, relicLevel: 0, weapon: null, weaponLevel: 0, tool: null },
      pickups: [{ id: 1, kind: 'fragment', value: 1, x: 70, y: 80, ageMs: 100, magnet: false }],
      floatTexts: [{ text: '+1', color: 'U', x: 70, y: 76 }],
      worldProps: [
        {
          id: 2,
          key: 'cursedKnife',
          state: 'rest',
          x: 90,
          y: 100,
          durabilityLeft: 6,
          rare: false,
          vx: 0,
          texture: 'cursed-knife',
          frame: 'common',
        },
      ],
      ce: { cur: 100, max: 100, regen: 8 },
      tech: { slots: [null, null], cast: null },
      kokusen: { zone: false, zoneMs: 0, streak: 0, windowOpen: false },
      techObjects: [],
      fx: {
        live: 0,
        degraded: false,
        layers: [],
        aura: null,
        trails: [],
        focus: null,
        lastImpact: null,
        red: { glowColor: null, glow: { active: false, color: null }, screenFlashColor: null, orb: null },
      },
      camera: {
        zoom: 1.5,
        worldView: { left: 0, right: 640 },
        bounds: { x: 0, y: 0, width: 1280, height: 544 },
        center: { x: 320, y: 180 },
        scroll: { x: -160, y: -90 },
        roundPixels: false,
        phaserFollow: false,
      },
      physics: { alpha: 0.5 },
      finisher: { distPx: null },
      fxlab: null,
    };
    registerDebugProbe({ debugSnapshot: () => snap });
    const target: { __game?: Api } = {};
    installDebugApi(fakeGame().game, target, true);
    expect(target.__game!.snapshot()).toEqual(snap);
  });

  it('step dorme o loop uma vez e avança em passos fixos de 1000/60 ms com tempo crescente (FND-22)', () => {
    const { game, calls } = fakeGame();
    const target: { __game?: Api } = {};
    installDebugApi(game, target, true);

    target.__game!.step(100);
    expect(calls.sleep).toBe(1);
    expect(calls.steps).toHaveLength(6);
    for (const s of calls.steps) expect(s.delta).toBe(DT);
    for (let i = 1; i < calls.steps.length; i++) expect(calls.steps[i].time).toBeGreaterThan(calls.steps[i - 1].time);

    target.__game!.step(50);
    expect(calls.sleep).toBe(1);
    expect(calls.steps).toHaveLength(9);
    for (let i = 1; i < calls.steps.length; i++) expect(calls.steps[i].time).toBeGreaterThan(calls.steps[i - 1].time);
  });

  it('step arredonda para cima os ms que não fecham um passo: ceil(ms / (1000/60)) (FND-22)', () => {
    const { game, calls } = fakeGame();
    const target: { __game?: Api } = {};
    installDebugApi(game, target, true);

    target.__game!.step(20);
    expect(calls.steps).toHaveLength(2);
    target.__game!.step(1);
    expect(calls.steps).toHaveLength(3);
  });
});
