// Boneco articulado 2D (spike boneco-articulado): RIG-01..07 e EDG-01, derivados da spec em .specs/features/boneco-articulado/spec.md.
import { describe, expect, it } from 'vitest';
import { easeInCubic, easeInOutCubic, easeOutBack, inbetween, shortestArc } from '../../src/game/art/rig/interpolate';
import { PALETTE_KEYS } from '../../src/game/art/palette';
import { rasterize } from '../../src/game/art/rig/rasterize';
import { isSingleComponent, topRowOf, touchesBottom } from '../../src/core/frameInvariants';
import { RIG_GANCHO_FRAMES, RIG_GANCHO_POSES, RIG_GANCHO_SEQUENCE, RIG_GANCHO_SEQUENCE_POSES, RIG_GANCHO_STRIKE } from '../../src/game/art/rig/poses/ganchoAscendente';
import { strikeToBody } from '../../src/core/strikePath';
import { MOVES } from '../../src/data/moves';
import { SIZE } from '../../src/game/textures';
import { PLAYER_FRAMES, PLAYER_FRAME_H, PLAYER_FRAME_W, PLAYER_ORIGIN } from '../../src/game/art/sprites/player';
import { RIG_PHASE_FRAMES, rigEnabled, rigMoveFrame, rigSequenceFrameName, rigStrikePoint, withRigFrames } from '../../src/game/art/rig/flag';
import { PLAYER_MOVE_FRAMES } from '../../src/game/art/sprites/playerMoves';
import { BONES, REST_ANGLES, aimLimb, makePose, measuredLength, solve, type BoneName, type JointName, type Pose } from '../../src/game/art/rig/skeleton';

const JOINTS_REQUIRED: JointName[] = [
  'hip', 'chest', 'neck',
  'shoulderNear', 'shoulderFar', 'elbowNear', 'elbowFar', 'wristNear', 'wristFar',
  'hipNear', 'hipFar', 'kneeNear', 'kneeFar', 'ankleNear', 'ankleFar',
];

/** Poses de teste: repouso e uma sequência de ângulos arbitrários (ossos de qualquer direção). */
function scatteredPose(seed: number): Pose {
  const angles = {} as Record<BoneName, number>;
  BONES.forEach((b, i) => {
    angles[b.name] = REST_ANGLES[b.name] + ((seed * 37 + i * 91) % 360) - 180;
  });
  return makePose({ x: 10 + (seed % 5), y: 20 }, angles);
}

describe('esqueleto (RIG-01)', () => {
  it('define todas as juntas pedidas, cada uma ligada por um osso de comprimento fixo > 0', () => {
    const joints = Object.keys(solve(makePose({ x: 10, y: 22 })));
    for (const j of JOINTS_REQUIRED) expect(joints, j).toContain(j);
    for (const j of JOINTS_REQUIRED.filter((x) => x !== 'hip')) {
      const bone = BONES.find((b) => b.to === j);
      expect(bone, `osso que termina em ${j}`).toBeDefined();
      expect(bone!.length, j).toBeGreaterThan(0);
    }
  });

  it('a hierarquia é quadril -> peito -> pescoço, peito -> ombro -> cotovelo -> pulso, quadril -> quadril -> joelho -> tornozelo', () => {
    const parentOf = (j: JointName): JointName | undefined => BONES.find((b) => b.to === j)?.from;
    expect(parentOf('chest')).toBe('hip');
    expect(parentOf('neck')).toBe('chest');
    for (const side of ['Near', 'Far'] as const) {
      expect(parentOf(`shoulder${side}`)).toBe('chest');
      expect(parentOf(`elbow${side}`)).toBe(`shoulder${side}`);
      expect(parentOf(`wrist${side}`)).toBe(`elbow${side}`);
      expect(parentOf(`hip${side}`)).toBe('hip');
      expect(parentOf(`knee${side}`)).toBe(`hip${side}`);
      expect(parentOf(`ankle${side}`)).toBe(`knee${side}`);
    }
  });
});

describe('comprimento dos ossos (RIG-02)', () => {
  it.each([0, 1, 2, 3, 4, 5, 6, 7])('pose %i: cada osso mede o comprimento definido, com 0,5 texel de tolerância', (seed) => {
    const joints = solve(scatteredPose(seed));
    for (const b of BONES) expect(Math.abs(measuredLength(joints, b) - b.length), `${b.name} na pose ${seed}`).toBeLessThanOrEqual(0.5);
  });

  it('a cinemática inversa mantém os comprimentos, mesmo com o alvo fora de alcance', () => {
    for (const target of [{ x: 14, y: 8 }, { x: 40, y: -30 }, { x: 10.5, y: 20 }]) {
      const joints = solve(aimLimb(makePose({ x: 10, y: 22 }), 'armNear', target, 1));
      for (const b of BONES) expect(Math.abs(measuredLength(joints, b) - b.length), b.name).toBeLessThanOrEqual(0.5);
    }
  });
});

describe('inbetween (RIG-07)', () => {
  const a = makePose({ x: 10, y: 24 }, { spine: 170, thighNear: 350, foreArmNear: 20 });
  const b = makePose({ x: 12, y: 20 }, { spine: 200, thighNear: 10, foreArmNear: -30 });

  it('com t = 0 devolve a pose a e com t = 1 devolve a pose b', () => {
    expect(inbetween(a, b, 0)).toEqual(a);
    expect(inbetween(a, b, 1)).toEqual(b);
  });

  it('devolve cópias: mexer no resultado não altera as poses de entrada', () => {
    const r = inbetween(a, b, 0);
    r.angles.spine = 0;
    expect(a.angles.spine).toBe(170);
  });

  it('interpola pelo menor arco: de 350 a 10 graus passa por 0, não por 180', () => {
    expect(shortestArc(0, inbetween(a, b, 0.5).angles.thighNear)).toBeCloseTo(0, 6);
    expect(shortestArc(350, 10)).toBe(20);
    expect(shortestArc(10, 350)).toBe(-20);
  });

  it('a raiz e os ângulos andam em linha reta no meio do caminho', () => {
    const m = inbetween(a, b, 0.5);
    expect(m.root).toEqual({ x: 11, y: 22 });
    expect(m.angles.spine).toBeCloseTo(185, 6);
    expect(m.angles.foreArmNear).toBeCloseTo(-5, 6);
  });

  it('fora de [0, 1] extrapola (overshoot) e o easing parte de 0 e chega em 1', () => {
    expect(inbetween(a, b, 1.5).root).toEqual({ x: 13, y: 18 });
    for (const ease of [easeInOutCubic, easeInCubic, easeOutBack]) {
      expect(ease(0), ease.name).toBeCloseTo(0, 9);
      expect(ease(1), ease.name).toBeCloseTo(1, 9);
    }
    expect(Math.max(...[0.6, 0.7, 0.8, 0.9].map((t) => easeOutBack(t)))).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------- rasterizador (RIG-03, EDG-01)

/** Poses variadas (repouso, braços erguidos, perna esticada, tronco inclinado) para varrer o rasterizador. */
/** Guarda dentro da grade: braços dobrados na frente do peito, pés no chão. */
const stanceAt = (x: number): Pose => {
  let p = makePose({ x, y: 22.5 });
  p = aimLimb(p, 'armNear', { x: x + 3.5, y: 17.5 }, -1);
  p = aimLimb(p, 'armFar', { x: x + 3, y: 16 }, -1);
  p = aimLimb(p, 'legNear', { x: x + 3, y: 28 }, 1);
  return aimLimb(p, 'legFar', { x: x - 3, y: 28 }, 1);
};
const RASTER_POSES: Array<[string, Pose]> = [
  ['guarda', stanceAt(10)],
  ['braço para cima', aimLimb(makePose({ x: 10, y: 22.5 }), 'armNear', { x: 16, y: 8 }, -1)],
  ['perna para a frente', aimLimb(makePose({ x: 10, y: 22.5 }), 'legNear', { x: 15, y: 25 }, 1)],
  ['tronco para trás', makePose({ x: 10, y: 21 }, { spine: 200 })],
];

describe('rasterize (RIG-03)', () => {
  it.each(RASTER_POSES)('%s: grade de 30 linhas x 32 colunas só com teclas da PALETTE', (_name, pose) => {
    const { frame } = rasterize(pose);
    expect(frame).toHaveLength(30);
    for (const row of frame) {
      expect(row).toHaveLength(32);
      for (const ch of row) expect(ch === '.' || PALETTE_KEYS.has(ch), `tecla '${ch}'`).toBe(true);
    }
  });

  it('o corpo aparece: há texels opacos, a cabeça é carimbada no pescoço e o contorno k existe', () => {
    const { frame } = rasterize(RASTER_POSES[0][1]);
    const opaque = frame.join('').replace(/\./g, '');
    expect(opaque.length).toBeGreaterThan(100);
    expect(topRowOf(frame, ['h', 'H', 'j'])).not.toBeNull();
    expect(opaque).toContain('k');
  });
});

describe('recorte (EDG-01)', () => {
  const opaqueCols = (frame: readonly string[], col: number): number[] => frame.map((r, y) => (r[col] !== '.' ? y : -1)).filter((y) => y >= 0);

  it('uma pose inteira dentro da grade não recorta nada', () => {
    expect(rasterize(RASTER_POSES[0][1]).clipped).toBe(0);
  });

  it('empurrada para fora da borda esquerda, recorta e conta os texels; o que fica é igual ao da pose original', () => {
    const base = stanceAt(14);
    const shift = 12;
    const moved = { root: { x: base.root.x - shift, y: base.root.y }, angles: base.angles };
    const a = rasterize(base);
    const b = rasterize(moved);
    expect(a.clipped).toBe(0);
    expect(b.clipped).toBeGreaterThan(0);
    expect(b.frame).toHaveLength(30);
    for (let x = 0; x < 32 - shift; x++) expect(opaqueCols(b.frame, x), `coluna ${x}`).toEqual(opaqueCols(a.frame, x + shift));
  });

  it('o que cai fora da borda de baixo também é contado', () => {
    const r = rasterize({ ...stanceAt(10), root: { x: 10, y: 28 } });
    expect(r.frame).toHaveLength(30);
    expect(r.clipped).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------- gancho ascendente pelo boneco (RIG-02, RIG-04..06)

const RIG_NAMES = ['ganchoAscendente-wind', 'ganchoAscendente-hit', 'ganchoAscendente-recover'] as const;
const ORIGIN_COL = PLAYER_ORIGIN.x * PLAYER_FRAME_W;
const HAIR_TOP_IDLE = topRowOf(PLAYER_FRAMES['idle-0'], ['h', 'H', 'j'])!;
const FRAME_ORIGIN = { originCol: ORIGIN_COL, rows: PLAYER_FRAME_H };
const UPPERCUT_BOX = MOVES.ganchoAscendente.hitbox!;

describe('frames do gancho ascendente pelo boneco', () => {
  it.each(RIG_NAMES)('%s: 30 linhas x 32 colunas só com teclas da PALETTE (RIG-03)', (name) => {
    const frame = RIG_GANCHO_FRAMES[name];
    expect(frame).toHaveLength(30);
    for (const row of frame) {
      expect(row).toHaveLength(32);
      for (const ch of row) expect(ch === '.' || PALETTE_KEYS.has(ch), `${name} tecla '${ch}'`).toBe(true);
    }
  });

  it.each(RIG_NAMES)('%s: nenhum texel recortado e todo osso mede o comprimento definido (RIG-02)', (name) => {
    const r = rasterize(RIG_GANCHO_POSES[name]);
    expect(r.clipped, name).toBe(0);
    for (const b of BONES) expect(Math.abs(measuredLength(r.joints, b) - b.length), `${name} ${b.name}`).toBeLessThanOrEqual(0.5);
  });

  it.each(RIG_NAMES)('%s: os texels opacos formam um componente só, 8-conexo (RIG-04, POS-02)', (name) => {
    expect(isSingleComponent(RIG_GANCHO_FRAMES[name]), name).toBe(true);
  });

  it('o hit tem texel opaco na última linha: o corpo toca o chão (RIG-05, POS-03)', () => {
    expect(touchesBottom(RIG_GANCHO_FRAMES['ganchoAscendente-hit'])).toBe(true);
  });

  it('o pulso do hit é o ponto de golpe: texel de pele, dentro da hitbox + 4 px (RIG-06, POS-01)', () => {
    const { col, row } = RIG_GANCHO_STRIKE;
    expect('pPqx').toContain(RIG_GANCHO_FRAMES['ganchoAscendente-hit'][row][col]);
    const p = strikeToBody({ col, row }, SIZE.player.h, FRAME_ORIGIN);
    expect(Math.abs(p.x - UPPERCUT_BOX.offsetX), `x ${p.x}`).toBeLessThanOrEqual(UPPERCUT_BOX.width / 2 + 4);
    expect(Math.abs(p.y - UPPERCUT_BOX.offsetY), `y ${p.y}`).toBeLessThanOrEqual(UPPERCUT_BOX.height / 2 + 4);
  });

  it('o ponto de golpe fica acima do topo do cabelo de idle-0 e 6 texels ou mais à frente da origem (RIG-06, POS-05, POS-10)', () => {
    expect(HAIR_TOP_IDLE).toBe(7);
    expect(ORIGIN_COL).toBe(10);
    expect(RIG_GANCHO_STRIKE.row).toBeLessThan(HAIR_TOP_IDLE);
    expect(RIG_GANCHO_STRIKE.col - ORIGIN_COL).toBeGreaterThanOrEqual(6);
  });
});

describe('sequência do gancho ascendente (RIG-08)', () => {
  it('tem pelo menos 8 quadros, todos de 30x32, sem recorte e de uma peça só', () => {
    expect(RIG_GANCHO_SEQUENCE.length).toBeGreaterThanOrEqual(8);
    for (const [i, r] of RIG_GANCHO_SEQUENCE.entries()) {
      expect(r.frame, `quadro ${i}`).toHaveLength(30);
      expect(r.clipped, `quadro ${i}`).toBe(0);
      expect(isSingleComponent(r.frame), `quadro ${i}`).toBe(true);
    }
  });

  it('o punho sobe do wind ao hit passando pelos quadros intermediários, com overshoot depois do hit', () => {
    const y = RIG_GANCHO_SEQUENCE_POSES.map((p) => solve(p).wristNear.y);
    const hit = solve(RIG_GANCHO_POSES['ganchoAscendente-hit']).wristNear.y;
    const wind = solve(RIG_GANCHO_POSES['ganchoAscendente-wind']).wristNear.y;
    expect(Math.max(...y)).toBeGreaterThan(wind - 0.01);
    expect(Math.min(...y)).toBeLessThan(hit + 0.01);
  });
});

// ---------------------------------------------------------------- chave de debug (RIG-09, RIG-10)

describe('chave ?debug&rig=1 (RIG-09, RIG-10)', () => {
  const base = { ...PLAYER_MOVE_FRAMES };

  it.each(['?debug&rig=1', '?rig=1&debug', '?debug=1&rig=1'])('%s troca os 3 frames do gancho ascendente pelos do boneco (RIG-09)', (search) => {
    const out = withRigFrames(base, search);
    for (const name of RIG_NAMES) expect(out[name], name).toBe(RIG_GANCHO_FRAMES[name]);
    expect(out['ganchoAscendente-hit']).not.toBe(base['ganchoAscendente-hit']);
    expect(rigStrikePoint('ganchoAscendente-hit', search)).toEqual(RIG_GANCHO_STRIKE);
  });

  it.each(['', '?debug', '?rig=1', '?debug&rig=0', '?debug&rig=true', '?rig=1&nodebug'])('"%s" mantém os frames atuais (RIG-10)', (search) => {
    expect(withRigFrames(base, search)).toBe(base);
    expect(rigEnabled(search)).toBe(false);
    expect(rigStrikePoint('ganchoAscendente-hit', search)).toBeUndefined();
  });

  it('com rig=1 só os 3 frames do gancho ascendente mudam; os outros golpes seguem os mesmos', () => {
    const out = withRigFrames(base, '?debug&rig=1');
    for (const name of Object.keys(base)) {
      if (!RIG_NAMES.includes(name as (typeof RIG_NAMES)[number])) expect(out[name], name).toBe(base[name]);
    }
  });
});

// ---------------------------------------------------------------- sequência no jogo (quadros por fase)

describe('quadros da sequência por fase do gancho ascendente (rig=1)', () => {
  const def = { startupMs: 90, activeMs: 90, recoveryMs: 260 };

  it('as 3 fases repartem os 12 quadros da sequência, em ordem e sem repetir', () => {
    const all = [...RIG_PHASE_FRAMES.startup, ...RIG_PHASE_FRAMES.active, ...RIG_PHASE_FRAMES.recovery];
    expect(all).toEqual(Array.from({ length: RIG_GANCHO_SEQUENCE.length }, (_, i) => i));
  });

  it('o pico (hit) cai no active e o wind e o recover nas pontas das suas fases', () => {
    expect(RIG_GANCHO_SEQUENCE[RIG_PHASE_FRAMES.active[1]].frame).toEqual(RIG_GANCHO_FRAMES['ganchoAscendente-hit']);
    expect(RIG_GANCHO_SEQUENCE[RIG_PHASE_FRAMES.startup[2]].frame).toEqual(RIG_GANCHO_FRAMES['ganchoAscendente-wind']);
    expect(RIG_GANCHO_SEQUENCE[RIG_PHASE_FRAMES.recovery[2]].frame).toEqual(RIG_GANCHO_FRAMES['ganchoAscendente-recover']);
  });

  it('cada quadro dura uma fatia igual da fase: startup 90 ms em 6 quadros, active em 3 e recovery 260 ms em 3', () => {
    const at = (phase: 'startup' | 'active' | 'recovery', ms: number): string | undefined => rigMoveFrame('ganchoAscendente', phase, ms, def);
    expect(at('startup', 0)).toBe('ganchoAscendente-rig-0');
    expect(at('startup', 14)).toBe('ganchoAscendente-rig-0');
    expect(at('startup', 15)).toBe('ganchoAscendente-rig-1');
    expect(at('startup', 89)).toBe('ganchoAscendente-rig-5');
    expect(at('active', 0)).toBe('ganchoAscendente-rig-6');
    expect(at('active', 30)).toBe('ganchoAscendente-rig-7');
    expect(at('active', 60)).toBe('ganchoAscendente-rig-8');
    expect(at('recovery', 86)).toBe('ganchoAscendente-rig-9');
    expect(at('recovery', 87)).toBe('ganchoAscendente-rig-10');
    expect(at('recovery', 174)).toBe('ganchoAscendente-rig-11');
  });

  it('passando do fim da fase segura o último quadro; outro golpe não usa o boneco', () => {
    expect(rigMoveFrame('ganchoAscendente', 'recovery', 9999, def)).toBe('ganchoAscendente-rig-11');
    expect(rigMoveFrame('jab', 'startup', 10, def)).toBeUndefined();
  });

  it('com rig=1 os 12 quadros são registrados como frames; sem rig=1 nenhum', () => {
    const on = withRigFrames(PLAYER_MOVE_FRAMES, '?debug&rig=1');
    for (let i = 0; i < 12; i++) expect(on[rigSequenceFrameName(i)], `quadro ${i}`).toBeDefined();
    const off = withRigFrames(PLAYER_MOVE_FRAMES, '?debug');
    expect(Object.keys(off).filter((k) => k.includes('-rig-'))).toEqual([]);
  });
});
