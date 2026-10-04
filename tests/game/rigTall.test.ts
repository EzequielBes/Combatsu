// Heroico alto (spike boneco-articulado, P3): PRA-01..09, derivados da spec em .specs/features/boneco-articulado/spec.md.
import { describe, expect, it } from 'vitest';
import { ART_SCALE, PALETTE_KEYS } from '../../src/game/art/palette';
import { HEAD_TALL_FIGHT, HEAD_TALL_IDLE } from '../../src/game/art/rig/heads';
import { HEROICO, HEROICO_ALTO, headOf } from '../../src/game/art/rig/presets';
import { RIG_FRAME_40, rasterize, wristTexel } from '../../src/game/art/rig/rasterize';
import { idleFor, uppercutFor } from '../../src/game/art/rig/poses/uppercut';
import { TUNINGS } from '../../src/game/art/rig/poses/tunings';
import { RIG_TALL, RIG_TALL_ORIGIN, RIG_UPPERCUT_HITBOX, rigHitbox, rigStrike, rigTallSheet } from '../../src/game/art/rig/flag';
import { BONES, SOLE, boneLength, lengthsOf, measuredLength, solve } from '../../src/game/art/rig/skeleton';
import { isSingleComponent, isOpaque, topRowOf, touchesBottom } from '../../src/core/frameInvariants';
import { parseSheet } from '../../src/core/pixelGrid';
import { strikeToBody, strikeToWorld } from '../../src/core/strikePath';
import { MOVES } from '../../src/data/moves';
import { SIZE, TEX } from '../../src/game/textures';
import { PLAYER_FRAMES, PLAYER_FRAME_H } from '../../src/game/art/sprites/player';

const body = HEROICO_ALTO;
const set = uppercutFor(body, TUNINGS[body.name], RIG_FRAME_40);
const FRAME_ORIGIN = { originCol: RIG_FRAME_40.originCol, rows: RIG_FRAME_40.h };
/** Linha do topo do cabelo do idle-0 (frame de 30) convertida para o frame de 40 (mesma altura acima do pé). */
const HAIR_TOP_IDLE_40 = topRowOf(PLAYER_FRAMES['idle-0'], ['h', 'H', 'j'])! + (RIG_FRAME_40.h - PLAYER_FRAME_H);

describe('preset heroicoAlto (PRA-01, PRA-02)', () => {
  it('PRA-01: mede de 31 a 33 texels em pé e a soma das partes bate com a altura declarada', () => {
    expect(body.height).toBeGreaterThanOrEqual(31);
    expect(body.height).toBeLessThanOrEqual(33);
    expect(body.head + body.neck + body.torso + body.thigh + body.shin + SOLE).toBeCloseTo(body.height, 1);
  });

  it('PRA-01: a cabeça (com o cabelo) fica entre 0,19 e 0,25 da altura e as pernas em pelo menos 0,49', () => {
    expect(body.head / body.height).toBeGreaterThanOrEqual(0.19);
    expect(body.head / body.height).toBeLessThanOrEqual(0.25);
    expect((body.thigh + body.shin + SOLE) / body.height).toBeGreaterThanOrEqual(0.49);
    expect(body.thick.torso.shoulder).toBeGreaterThan(body.thick.torso.waist); // ombros em V sobre a cintura fina
  });

  it('PRA-01: o idle no frame de 40x40 tem a silhueta da altura declarada (±1), é uma peça só e não recorta', () => {
    const r = rasterize(idleFor(body, RIG_FRAME_40), { frame: RIG_FRAME_40 });
    expect(r.frame).toHaveLength(40);
    for (const row of r.frame) {
      expect(row).toHaveLength(40);
      for (const ch of row) expect(ch === '.' || PALETTE_KEYS.has(ch), `tecla '${ch}'`).toBe(true);
    }
    const top = r.frame.findIndex((row) => /[^.]/.test(row));
    expect(40 - top).toBeGreaterThanOrEqual(body.height - 1);
    expect(40 - top).toBeLessThanOrEqual(body.height + 1);
    expect(isSingleComponent(r.frame)).toBe(true);
    expect(r.clipped).toBe(0);
    for (const b of BONES) expect(Math.abs(measuredLength(r.joints, b) - boneLength(idleFor(body, RIG_FRAME_40), b)), b.name).toBeLessThanOrEqual(0.5);
  });

  it('PRA-02: braço, perna, pé, ombro e quadril de perto e de longe têm o mesmo comprimento', () => {
    const len = lengthsOf(body);
    expect(len.upperArmNear).toBe(len.upperArmFar);
    expect(len.foreArmNear).toBe(len.foreArmFar);
    expect(len.thighNear).toBe(len.thighFar);
    expect(len.shinNear).toBe(len.shinFar);
    expect(len.footNear).toBe(len.footFar);
    expect(body.shoulderNear).toBe(body.shoulderFar);
    expect(body.pelvisNear).toBe(body.pelvisFar);
  });

  it('PRA-03: o corpo tem a cabeça de idle e a de luta, cada uma com `head` linhas; o heroico do estudo segue com uma só', () => {
    expect(headOf(body)).toBe(HEAD_TALL_IDLE);
    expect(headOf(body, 'idle')).toBe(HEAD_TALL_IDLE);
    expect(headOf(body, 'fight')).toBe(HEAD_TALL_FIGHT);
    expect(HEAD_TALL_IDLE.grid).toHaveLength(body.head);
    expect(HEAD_TALL_FIGHT.grid).toHaveLength(body.head);
    expect(headOf(HEROICO, 'fight')).toBe(headOf(HEROICO, 'idle'));
  });
});

describe('cabeças do heroico alto (PRA-03)', () => {
  it.each([
    ['idle', HEAD_TALL_IDLE],
    ['luta', HEAD_TALL_FIGHT],
  ])('%s: cabelo espetado (h, H, j), olho com íris e brilho (b, w), linha de pele (x) e contorno k, só com teclas da PALETTE', (_name, head) => {
    const text = head.grid.join('');
    for (const ch of ['h', 'H', 'j', 'b', 'w', 'x', 'p', 'P', 'k']) expect(text, ch).toContain(ch);
    for (const ch of text) expect(ch === '.' || PALETTE_KEYS.has(ch), `tecla '${ch}'`).toBe(true);
    expect(head.grid[0]).toMatch(/k\.+k/); // espetos no topo
    for (const row of head.grid) expect(row.length).toBe(head.grid[0].length);
    expect(head.neckCol).toBeGreaterThan(0);
    expect(head.neckCol).toBeLessThan(head.grid[0].length);
  });

  it('a cabeça de luta tem o mesmo tamanho da de idle e é diferente dela', () => {
    expect(HEAD_TALL_FIGHT.grid).toHaveLength(HEAD_TALL_IDLE.grid.length);
    expect(HEAD_TALL_FIGHT.grid[0]).toHaveLength(HEAD_TALL_IDLE.grid[0].length);
    expect(HEAD_TALL_FIGHT.neckCol).toBe(HEAD_TALL_IDLE.neckCol);
    expect(HEAD_TALL_FIGHT.grid).not.toEqual(HEAD_TALL_IDLE.grid);
  });

  it('o olho do idle tem o brilho w ao lado da íris b; o da luta é cerrado (sem w na linha do olho) e a boca abre com os dentes w', () => {
    const eyeRow = (grid: readonly string[]): string => grid.find((r) => r.includes('b'))!;
    expect(eyeRow(HEAD_TALL_IDLE.grid)).toContain('wb');
    expect(eyeRow(HEAD_TALL_FIGHT.grid)).not.toContain('w');
    const mouthRow = HEAD_TALL_FIGHT.grid[HEAD_TALL_FIGHT.grid.length - 2];
    expect(mouthRow).toContain('bw');
  });
});

describe('gancho ascendente do heroicoAlto no frame de 40x40 (PRA-04)', () => {
  const frames = { idle: rasterize(set.idle, { frame: RIG_FRAME_40 }), wind: set.frames.wind, hit: set.frames.hit, recover: set.frames.recover };

  for (const name of ['idle', 'wind', 'hit', 'recover'] as const) {
    it(`${name}: 40x40 só com teclas da PALETTE, uma peça só, sem recorte e ossos com o comprimento definido`, () => {
      const r = frames[name];
      expect(r.frame).toHaveLength(40);
      for (const row of r.frame) {
        expect(row).toHaveLength(40);
        for (const ch of row) expect(ch === '.' || PALETTE_KEYS.has(ch), `tecla '${ch}'`).toBe(true);
      }
      expect(isSingleComponent(r.frame), 'POS-02').toBe(true);
      expect(r.clipped).toBe(0);
      const pose = { idle: set.idle, wind: set.wind, hit: set.hit, recover: set.recover }[name];
      for (const b of BONES) expect(Math.abs(measuredLength(r.joints, b) - boneLength(pose, b)), b.name).toBeLessThanOrEqual(0.5);
    });
  }

  it('os 12 quadros da sequência são de uma peça só, sem recorte, e o pico é o hit', () => {
    expect(set.sequence).toHaveLength(12);
    for (const [i, r] of set.sequence.entries()) {
      expect(r.frame, `quadro ${i}`).toHaveLength(40);
      expect(isSingleComponent(r.frame), `quadro ${i}`).toBe(true);
      expect(r.clipped, `quadro ${i}`).toBe(0);
    }
    expect(set.sequence[7].frame).toEqual(set.frames.hit.frame);
  });

  it('o hit toca o chão (POS-03) e os golpes usam a cabeça de luta', () => {
    expect(touchesBottom(set.frames.hit.frame)).toBe(true);
    const fight = rasterize(set.hit, { frame: RIG_FRAME_40, head: headOf(body, 'fight'), headOverNearArm: TUNINGS[body.name]!.headOverNearArm }).frame;
    expect(set.frames.hit.frame).toEqual(fight);
    expect(set.frames.hit.frame).not.toEqual(rasterize(set.hit, { frame: RIG_FRAME_40, head: headOf(body, 'idle'), headOverNearArm: TUNINGS[body.name]!.headOverNearArm }).frame);
  });
});

describe('ponto de golpe do heroicoAlto (PRA-05)', () => {
  it('a hitbox do rig é a do ganchoAscendente com a borda de cima 20 px mais alta e a de baixo no mesmo lugar', () => {
    const box = MOVES.ganchoAscendente.hitbox!;
    expect(RIG_UPPERCUT_HITBOX.offsetX).toBe(box.offsetX);
    expect(RIG_UPPERCUT_HITBOX.width).toBe(box.width);
    expect(RIG_UPPERCUT_HITBOX.offsetY + RIG_UPPERCUT_HITBOX.height / 2).toBe(box.offsetY + box.height / 2); // borda de baixo
    expect(RIG_UPPERCUT_HITBOX.offsetY - RIG_UPPERCUT_HITBOX.height / 2).toBe(box.offsetY - box.height / 2 - 20); // borda de cima
  });

  it.each(['?debug&rig=1', '?rig=1&debug'])('%s: rigHitbox dá a caixa do rig só para o gancho ascendente', (search) => {
    expect(rigHitbox('ganchoAscendente', search)).toBe(RIG_UPPERCUT_HITBOX);
    expect(rigHitbox('jab', search)).toBeUndefined();
  });

  it.each(['', '?debug', '?rig=1', '?debug&rig=0'])('"%s": sem rig=1 rigHitbox é undefined (a hitbox do MOVES vale)', (search) => {
    expect(rigHitbox('ganchoAscendente', search)).toBeUndefined();
  });

  it('o pulso do hit é pele, cai na hitbox do rig + 4 px (POS-01), acima do cabelo do idle-0 e 6 texels ou mais à frente da origem (POS-05, POS-10)', () => {
    const { col, row } = set.strike;
    expect('pPqx').toContain(set.frames.hit.frame[row][col]);
    const p = strikeToBody({ col, row }, SIZE.player.h, FRAME_ORIGIN);
    expect(Math.abs(p.x - RIG_UPPERCUT_HITBOX.offsetX)).toBeLessThanOrEqual(RIG_UPPERCUT_HITBOX.width / 2 + 4);
    expect(Math.abs(p.y - RIG_UPPERCUT_HITBOX.offsetY)).toBeLessThanOrEqual(RIG_UPPERCUT_HITBOX.height / 2 + 4);
    expect(row).toBeLessThan(HAIR_TOP_IDLE_40);
    expect(col - FRAME_ORIGIN.originCol).toBeGreaterThanOrEqual(6);
    const j = solve(set.hit);
    expect(Math.hypot(j.wristNear.x - j.shoulderNear.x, j.wristNear.y - j.shoulderNear.y)).toBeLessThanOrEqual(body.upperArm + body.foreArm + 0.01);
  });
});

describe('o punho e o rosto (PRA-06)', () => {
  const head = headOf(body, 'fight');
  /** O texel do pulso de perto cai num texel opaco da grade da cabeça carimbada nesta pose. */
  const wristOnHead = (pose: typeof set.hit): boolean => {
    const j = solve(pose);
    const hx = Math.round(j.neck.x - head.neckCol);
    const hy = Math.round(j.neck.y - head.grid.length);
    return isOpaque(head.grid, Math.floor(j.wristNear.x) - hx, Math.floor(j.wristNear.y) - hy);
  };

  it('em nenhum quadro da sequência o pulso de perto cai sobre a cabeça: o braço sobe pela frente do peito', () => {
    for (const [i, pose] of set.sequencePoses.entries()) expect(wristOnHead(pose), `quadro ${i}`).toBe(false);
  });

  it('no hit, a linha opaca mais alta do frame é o punho (pele), acima da grade da cabeça', () => {
    const j = solve(set.hit);
    const headTop = Math.round(j.neck.y - head.grid.length);
    const top = set.frames.hit.frame.findIndex((row) => /[^.]/.test(row));
    expect(top).toBeLessThan(headTop);
    expect(set.frames.hit.frame[top + 1]).toMatch(/[pPqx]/); // a linha de cima é o contorno k; logo abaixo vem a pele do punho
  });
});

describe('acabamento do corpo do heroicoAlto (PRA-07)', () => {
  const idle = rasterize(set.idle, { frame: RIG_FRAME_40 }).frame;
  const hipRow = Math.floor(solve(set.idle).hip.y);
  const below = idle.slice(hipRow + 2, 39).join('');
  const torso = idle.slice(solve(set.idle).neck.y | 0, hipRow).join('');

  it('a calça abaixo do cinto usa K e n e o cinto tem a fivela A e z', () => {
    expect(below).toContain('K');
    expect(below).toContain('n');
    expect(idle[hipRow - 1] + idle[hipRow] + idle[hipRow + 1]).toMatch(/zA/);
    expect(idle.join('')).toContain('z');
    expect(idle.join('')).toContain('A');
  });

  it('o paletó tem a luz s/S no ombro e no peito e a borda fria y nas costas', () => {
    expect(torso).toMatch(/[sS]/);
    expect(torso).toContain('S');
    expect(torso).toContain('y');
  });

  it('cada sapato tem a sola s na fileira de baixo e o brilho S em cima', () => {
    const sole = idle[38];
    const shine = idle[37];
    const spans = [...sole.matchAll(/[^.k]+/g)];
    expect(spans.length).toBeGreaterThanOrEqual(2);
    for (const m of spans) expect(m[0], `sapato em ${m.index}`).toContain('s');
    expect(shine).toContain('S');
    expect(idle[39].replace(/\./g, '')).toMatch(/^k+$/);
  });

  it('o pescoço de pele aparece entre o queixo e a gola e a coluna escura do tronco some', () => {
    const neckRow = idle.findIndex((row, i) => i > 8 && /^\.*k[xP]+k\.*$/.test(row));
    expect(neckRow).toBeGreaterThan(8);
    expect(idle[neckRow + 1]).toMatch(/s/); // gola logo abaixo
    // Nas linhas do peito nenhuma coluna interna é só contorno (o em todas): o tronco é pano, não bloco riscado.
    const chest = idle.slice(neckRow + 2, neckRow + 6);
    for (let col = 9; col <= 15; col++) expect(chest.every((row) => row[col] === 'o'), `coluna ${col}`).toBe(false);
  });
});

describe('heroicoAlto no jogo (PRA-08)', () => {
  const RIG_NAMES = Array.from({ length: 12 }, (_, i) => `ganchoAscendente-rig-${i}`);
  const RIG_ON_SEARCHES = ['?debug&rig=1', '?rig=1&debug'];
  const RIG_OFF_SEARCHES = ['', '?debug', '?rig=1', '?debug&rig=0'];

  it('a textura do heroico alto é `player-rig`', () => {
    expect(TEX.playerRig).toBe('player-rig');
  });

  it.each(RIG_ON_SEARCHES)('%s: rigTallSheet dá os 12 quadros ganchoAscendente-rig-0..11 de 40x40, iguais aos da sequência, e a folha passa no parseSheet', (search) => {
    const sheet = rigTallSheet(search);
    expect(sheet).toBeDefined();
    expect(Object.keys(sheet!)).toEqual(RIG_NAMES);
    for (const [i, name] of RIG_NAMES.entries()) {
      const grid = sheet![name];
      expect(grid, name).toHaveLength(40);
      for (const row of grid) expect(row, name).toHaveLength(40);
      const foreign = [...grid.join('')].filter((ch) => ch !== '.' && !PALETTE_KEYS.has(ch));
      expect(foreign, `${name}: teclas fora da PALETTE`).toEqual([]);
      expect(grid, name).toEqual(RIG_TALL.sequence[i].frame);
    }
    const parsed = parseSheet('player-rig', sheet!, PALETTE_KEYS);
    expect(parsed.width).toBe(40);
    expect(parsed.height).toBe(40);
    expect(parsed.frames).toHaveLength(12);
  });

  it.each(RIG_OFF_SEARCHES)('"%s": sem rig=1 não há folha player-rig nem ponto de golpe do heroico alto', (search) => {
    expect(rigTallSheet(search)).toBeUndefined();
    expect(rigStrike('ganchoAscendente-hit', search)).toBeUndefined();
    expect(rigStrike('ganchoAscendente-wind', search)).toBeUndefined();
  });

  it.each([
    ['ganchoAscendente-wind', 'wind', wristTexel(RIG_TALL.frames.wind.joints)],
    ['ganchoAscendente-hit', 'hit', RIG_TALL.strike],
  ] as const)('%s: o ponto de golpe é o pulso de perto do %s do heroico alto, num texel de pele, no frame de 40 com o eixo na coluna 12', (frameName, phase, wrist) => {
    const rig = rigStrike(frameName, '?debug&rig=1');
    expect(rig).toBeDefined();
    expect(rig!.pt).toEqual(wrist);
    expect(rig!.frame).toEqual({ originCol: 12, rows: 40 });
    expect('pPqx').toContain(RIG_TALL.frames[phase].frame[rig!.pt.row][rig!.pt.col]);
  });

  it('rigStrike só vale para o wind e o hit do gancho ascendente', () => {
    expect(rigStrike('jab-hit', '?debug&rig=1')).toBeUndefined();
    expect(rigStrike('ganchoAscendente-recover', '?debug&rig=1')).toBeUndefined();
  });

  it('a origem do sprite é a coluna 12 de 40 no x e o pé no y, e cai num px inteiro', () => {
    expect(RIG_TALL_ORIGIN).toEqual({ x: 0.3, y: 1 });
    expect(Number.isInteger(RIG_TALL_ORIGIN.x * 40 * ART_SCALE)).toBe(true);
  });

  it('no mundo, o punho do hit fica acima da altura do frame antigo (30 texels) e à frente do corpo; virado, fica atrás', () => {
    const rig = rigStrike('ganchoAscendente-hit', '?debug&rig=1')!;
    const at = { x: 100, footY: 480 };
    const p = strikeToWorld(rig.pt, at, 1, rig.frame);
    expect(p.y).toBeLessThan(at.footY - ART_SCALE * PLAYER_FRAME_H);
    expect(p.x).toBeGreaterThan(at.x);
    const mirrored = strikeToWorld(rig.pt, at, -1, rig.frame);
    expect(mirrored.x).toBeLessThan(at.x);
    expect(mirrored.y).toBe(p.y);
  });
});
