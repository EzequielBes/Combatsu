// Presets de proporção do boneco articulado (estudo): PRP-01..05, derivados da spec em .specs/features/boneco-articulado/spec.md.
import { describe, expect, it } from 'vitest';
import { PALETTE_KEYS } from '../../src/game/art/palette';
import { rasterize } from '../../src/game/art/rig/rasterize';
import { HEROICO, INTER, PRESETS, SEMI, headOf } from '../../src/game/art/rig/presets';
import { TUNINGS } from '../../src/game/art/rig/poses/tunings';
import { idleFor, uppercutFor } from '../../src/game/art/rig/poses/uppercut';
import { BONES, SOLE, bonesOf, boneLength, lengthsOf, measuredLength, solve } from '../../src/game/art/rig/skeleton';
import { isSingleComponent, topRowOf, touchesBottom } from '../../src/core/frameInvariants';
import { strikeToBody } from '../../src/core/strikePath';
import { MOVES } from '../../src/data/moves';
import { SIZE } from '../../src/game/textures';
import { PLAYER_FRAMES, PLAYER_FRAME_H, PLAYER_FRAME_W, PLAYER_ORIGIN } from '../../src/game/art/sprites/player';

const BOX = MOVES.ganchoAscendente.hitbox!;
const FRAME_ORIGIN = { originCol: PLAYER_ORIGIN.x * PLAYER_FRAME_W, rows: PLAYER_FRAME_H };
const HAIR_TOP_IDLE = topRowOf(PLAYER_FRAMES['idle-0'], ['h', 'H', 'j'])!;

describe.each(PRESETS)('preset $name', (body) => {
  const set = uppercutFor(body, TUNINGS[body.name]);
  const frames = { wind: set.frames.wind, hit: set.frames.hit, recover: set.frames.recover, idle: rasterize(idleFor(body)) };

  it('PRP-01: mede de 24 a 26 texels em pé e a soma das partes bate com a altura declarada', () => {
    expect(body.height).toBeGreaterThanOrEqual(24);
    expect(body.height).toBeLessThanOrEqual(26);
    expect(body.head + body.neck + body.torso + body.thigh + body.shin + SOLE).toBeCloseTo(body.height, 1);
    const idle = frames.idle.frame;
    expect(30 - idle.findIndex((r) => /[^.]/.test(r)), 'altura da silhueta no idle').toBeGreaterThanOrEqual(body.height - 1);
    expect(30 - idle.findIndex((r) => /[^.]/.test(r))).toBeLessThanOrEqual(body.height + 1);
  });

  it('PRP-02: braço e perna de perto e de longe têm o mesmo comprimento', () => {
    const len = lengthsOf(body);
    expect(len.upperArmNear).toBe(len.upperArmFar);
    expect(len.foreArmNear).toBe(len.foreArmFar);
    expect(len.thighNear).toBe(len.thighFar);
    expect(len.shinNear).toBe(len.shinFar);
    expect(len.footNear).toBe(len.footFar);
    expect(body.shoulderNear).toBe(body.shoulderFar);
    expect(body.pelvisNear).toBe(body.pelvisFar);
  });

  it('PRP-03: a cabeça tem a altura declarada, o olho (w e b) e o cabelo espetado', () => {
    const { grid } = headOf(body);
    expect(grid).toHaveLength(body.head);
    const text = grid.join('');
    for (const ch of ['h', 'H', 'j', 'p', 'k', 'b']) expect(text, ch).toContain(ch);
    expect(grid[0]).toMatch(/k\.+k/); // espetos no topo
    for (const row of grid) expect(row.length).toBe(grid[0].length);
  });

  for (const name of ['idle', 'wind', 'hit', 'recover'] as const) {
    it(`PRP-04 (${name}): 30x32 só com teclas da PALETTE, uma peça só, sem recorte e ossos com o comprimento definido`, () => {
      const r = frames[name];
      expect(r.frame).toHaveLength(30);
      for (const row of r.frame) {
        expect(row).toHaveLength(32);
        for (const ch of row) expect(ch === '.' || PALETTE_KEYS.has(ch)).toBe(true);
      }
      expect(isSingleComponent(r.frame), 'POS-02').toBe(true);
      expect(r.clipped).toBe(0);
      const pose = { idle: set.idle, wind: set.wind, hit: set.hit, recover: set.recover }[name];
      for (const b of BONES) expect(Math.abs(measuredLength(r.joints, b) - boneLength(pose, b)), b.name).toBeLessThanOrEqual(0.5);
    });
  }

  it('PRP-04: os 12 quadros da sequência são de uma peça só e sem recorte, e o pico é o hit', () => {
    expect(set.sequence).toHaveLength(12);
    for (const [i, r] of set.sequence.entries()) {
      expect(isSingleComponent(r.frame), `quadro ${i}`).toBe(true);
      expect(r.clipped, `quadro ${i}`).toBe(0);
    }
    expect(set.sequence[7].frame).toEqual(set.frames.hit.frame);
  });

  it('PRP-04: o hit toca o chão (POS-03)', () => {
    expect(touchesBottom(set.frames.hit.frame)).toBe(true);
  });

  it('PRP-05: o pulso do hit é pele, cai na hitbox + 4 px (POS-01) e fica acima do cabelo do idle-0 e 6 texels à frente da origem (POS-05, POS-10)', () => {
    const { col, row } = set.strike;
    expect('pPqx').toContain(set.frames.hit.frame[row][col]);
    const p = strikeToBody({ col, row }, SIZE.player.h, FRAME_ORIGIN);
    expect(Math.abs(p.x - BOX.offsetX)).toBeLessThanOrEqual(BOX.width / 2 + 4);
    expect(Math.abs(p.y - BOX.offsetY)).toBeLessThanOrEqual(BOX.height / 2 + 4);
    expect(row).toBeLessThan(HAIR_TOP_IDLE);
    expect(col - FRAME_ORIGIN.originCol).toBeGreaterThanOrEqual(6);
    // O punho é o do braço esticado: nunca mais longe do ombro que o comprimento do braço (mais a tolerância da grade).
    const j = solve(set.hit);
    const arm = body.upperArm + body.foreArm;
    expect(Math.hypot(j.wristNear.x - j.shoulderNear.x, j.wristNear.y - j.shoulderNear.y)).toBeLessThanOrEqual(arm + 0.01);
  });
});

describe('os presets em conjunto (PRP-01)', () => {
  it('as pernas ficam mais longas e a cabeça menor de C para A', () => {
    const legs = (b: typeof HEROICO): number => (b.thigh + b.shin + SOLE) / b.height;
    const head = (b: typeof HEROICO): number => b.head / b.height;
    expect(legs(HEROICO)).toBeGreaterThan(legs(SEMI));
    expect(legs(SEMI)).toBeGreaterThan(legs(INTER));
    expect(legs(INTER)).toBeGreaterThan(6.4 / 24); // mais longas que as do atual
    expect(head(HEROICO)).toBeLessThan(head(SEMI));
    expect(head(SEMI)).toBeLessThan(head(INTER));
    expect(head(INTER)).toBeLessThan(11 / 24);
    expect(legs(HEROICO)).toBeGreaterThanOrEqual(0.49);
  });

  it('bonesOf entrega os mesmos 16 ossos para todo corpo', () => {
    for (const b of PRESETS) expect(bonesOf(b).map((x) => x.name)).toEqual(BONES.map((x) => x.name));
  });
});
