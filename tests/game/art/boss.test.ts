import { describe, expect, it } from 'vitest';
import { TRANSPARENT, parseSheet } from '../../../src/core/pixelGrid';
// Importar no Vitest (Node, sem window) já prova que a paleta não carrega o `phaser` como valor.
import { ART_SCALE, PALETTE_KEYS } from '../../../src/game/art/palette';
import { ENEMY_FRAME_H, ENEMY_FRAME_W } from '../../../src/game/art/sprites/enemy';
import {
  BOSS_ANIMS,
  BOSS_FRAMES,
  BOSS_FRAME_H,
  BOSS_FRAME_W,
  BOSS_ORIGIN,
  PROJECTILE_FRAME,
  SHOCKWAVE_FRAME,
  TECELA_COLOR_MAP,
  TECELA_FRAMES,
} from '../../../src/game/art/sprites/boss';
import { BOSS, PLAYER_MOVE } from '../../../src/data/tuning';
import { artMeasure } from './helpers';

describe('folha do chefe (BTIER-06, BAT-05, ART-01)', () => {
  const sheet = parseSheet('boss', BOSS_FRAMES, PALETTE_KEYS);
  const STATES = [
    'idle',
    'windup-charge',
    'charge',
    'windup-leap',
    'leap',
    'windup-volley',
    'volley',
    'roar',
    'stagger',
    'dead',
  ];

  it('passa no parseSheet só com cores da paleta, com o frame maior que o do inimigo nas duas dimensões', () => {
    expect(sheet.width).toBe(BOSS_FRAME_W);
    expect(sheet.height).toBe(BOSS_FRAME_H);
    expect(BOSS_FRAME_W).toBeGreaterThan(ENEMY_FRAME_W);
    expect(BOSS_FRAME_H).toBeGreaterThan(ENEMY_FRAME_H);
  });

  it('tem um frame e uma animação para cada estado do design, todos citando frames existentes', () => {
    for (const name of STATES) {
      expect(Object.hasOwn(BOSS_FRAMES, name), name).toBe(true);
      const anim = BOSS_ANIMS[name];
      expect(anim, name).toBeDefined();
      for (const f of anim.frames) expect(Object.hasOwn(BOSS_FRAMES, f), `${name}: ${f}`).toBe(true);
    }
  });

  it('cada frame de preparo é visualmente distinto do idle (BAT-05)', () => {
    for (const name of ['windup-charge', 'windup-leap', 'windup-volley']) {
      expect(BOSS_FRAMES[name], name).not.toEqual(BOSS_FRAMES.idle);
    }
  });

  it('a origem fica no pé, no centro do corpo', () => {
    expect(BOSS_ORIGIN.y).toBe(1);
    expect(BOSS_ORIGIN.x * BOSS_FRAME_W).toBe(BOSS_FRAME_W / 2);
  });

  it('TECELA_COLOR_MAP só usa cores da paleta e muda ao menos 3 cores em relação ao Oni (BTIER-06)', () => {
    for (const [from, to] of Object.entries(TECELA_COLOR_MAP)) {
      expect(PALETTE_KEYS.has(from), from).toBe(true);
      expect(PALETTE_KEYS.has(to), to).toBe(true);
    }
    const distinct = Object.entries(TECELA_COLOR_MAP).filter(([from, to]) => from !== to);
    expect(distinct.length).toBeGreaterThanOrEqual(3);
  });

  it('a grade da Tecelã reaproveita os mesmos frames do Oni, só com as cores trocadas (BTIER-06)', () => {
    const tecelaSheet = parseSheet('boss-tecela', TECELA_FRAMES, PALETTE_KEYS);
    expect(tecelaSheet.width).toBe(sheet.width);
    expect(tecelaSheet.height).toBe(sheet.height);
    expect(Object.keys(TECELA_FRAMES).sort()).toEqual(Object.keys(BOSS_FRAMES).sort());
    const changedColors = new Set<string>();
    BOSS_FRAMES.idle.forEach((row, y) => {
      [...row].forEach((ch, x) => {
        const other = TECELA_FRAMES.idle[y][x];
        if (ch !== other) changedColors.add(ch);
      });
    });
    expect(changedColors.size).toBeGreaterThanOrEqual(3);
  });
});

describe('medidas de arte do glossário (limiares dos dois lados)', () => {
  it('difference: 1 posição diferente em 5 da união dá 0,2; em 6 dá menos que 0,2', () => {
    expect(artMeasure.difference(['aaaaa'], ['aaaab'])).toBeCloseTo(0.2, 10);
    expect(artMeasure.difference(['aaaaaa'], ['aaaaab'])).toBeLessThan(0.2);
    // Posição transparente nos dois não entra na união; opaca em um só entra e conta como diferente.
    expect(artMeasure.difference(['a..'], ['ab.'])).toBe(0.5);
  });

  it('components: diagonal liga (8-conexo); um texel de vão separa', () => {
    expect(artMeasure.components(['a.', '.a'])).toBe(1);
    expect(artMeasure.components(['a.a'])).toBe(2);
  });

  it('interiorK: só conta o k com os 4 vizinhos opacos e dentro do frame', () => {
    expect(artMeasure.interiorK(['aaa', 'aka', 'aaa'])).toBe(1);
    expect(artMeasure.interiorK(['a.a', 'aka', 'aaa'])).toBe(0);
    expect(artMeasure.interiorK(['kkk', 'aaa', 'aaa'])).toBe(0);
  });

  it('box, dominant e profile leem o que o glossário define', () => {
    expect(artMeasure.box(['....', '.ab.', '..c.'])).toEqual([1, 1, 2, 2]);
    expect(artMeasure.dominant(['kkkk', 'aab.'])).toBe('a');
    expect(artMeasure.profile(['ab', 'a', '.b'])).toEqual([2, 2]);
  });
});

describe('chefes desenhados por pose articulada (BSP-01..13)', () => {
  const NAMES = Object.keys(BOSS_FRAMES);
  const WINDUPS = ['windup-charge', 'windup-leap', 'windup-volley'];

  it('BSP-01: as folhas do Oni e da Tecelã passam no parseSheet com 40x32 texels e só chaves da paleta', () => {
    for (const [name, frames] of [
      ['boss-oni', BOSS_FRAMES],
      ['boss-tecela', TECELA_FRAMES],
    ] as const) {
      const sheet = parseSheet(name, frames, PALETTE_KEYS);
      expect(sheet.width, name).toBe(40);
      expect(sheet.height, name).toBe(32);
    }
  });

  it('BSP-03: o idle do Oni tem cada tom de pele (A, a, z, m) em pelo menos 10 texels', () => {
    for (const tone of ['A', 'a', 'z', 'm']) {
      expect(artMeasure.countOf(BOSS_FRAMES.idle, tone), tone).toBeGreaterThanOrEqual(10);
    }
  });

  it('BSP-04: o idle do Oni tem no máximo 12 texels k internos', () => {
    expect(artMeasure.interiorK(BOSS_FRAMES.idle)).toBeLessThanOrEqual(12);
  });

  it('BSP-05: a caixa opaca do idle cobre a hurtbox (colunas 10 a 29, linhas 4 a 31)', () => {
    const [x0, y0, x1, y1] = artMeasure.box(BOSS_FRAMES.idle);
    expect(x0).toBeLessThanOrEqual(10);
    expect(x1).toBeGreaterThanOrEqual(29);
    expect(y0).toBeLessThanOrEqual(4);
    expect(y1).toBe(31);
  });

  it.each(NAMES)('BSP-06: %s forma um único componente', (name) => {
    expect(artMeasure.components(BOSS_FRAMES[name]), name).toBe(1);
  });

  it('BSP-07: idle e os três preparos diferem entre si em pelo menos 0,20', () => {
    const group = ['idle', ...WINDUPS];
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const d = artMeasure.difference(BOSS_FRAMES[group[i]], BOSS_FRAMES[group[j]]);
        expect(d, `${group[i]} x ${group[j]}`).toBeGreaterThanOrEqual(0.2);
      }
    }
  });

  it('BSP-08: cada ataque difere do próprio preparo em pelo menos 0,20', () => {
    for (const attack of ['charge', 'leap', 'volley']) {
      const d = artMeasure.difference(BOSS_FRAMES[attack], BOSS_FRAMES[`windup-${attack}`]);
      expect(d, attack).toBeGreaterThanOrEqual(0.2);
    }
  });

  it('BSP-09: o dead tem no máximo 14 linhas de altura e fica apoiado na linha 31', () => {
    const [, y0, , y1] = artMeasure.box(BOSS_FRAMES.dead);
    expect(y1).toBe(31);
    expect(y1 - y0 + 1).toBeLessThanOrEqual(14);
  });

  it('BSP-10: o topo do stagger fica pelo menos 2 linhas abaixo do topo do idle', () => {
    expect(artMeasure.box(BOSS_FRAMES.stagger)[1] - artMeasure.box(BOSS_FRAMES.idle)[1]).toBeGreaterThanOrEqual(2);
  });

  it('BSP-11: as duas folhas têm os mesmos frames', () => {
    expect(Object.keys(TECELA_FRAMES).sort()).toEqual([...NAMES].sort());
  });

  it.each(NAMES)('BSP-11: %s da Tecelã é o do Oni com o TECELA_COLOR_MAP aplicado texel a texel', (name) => {
    const mapped = BOSS_FRAMES[name].map((row) => [...row].map((c) => TECELA_COLOR_MAP[c] ?? c).join(''));
    expect(TECELA_FRAMES[name]).toEqual(mapped);
  });

  it('BSP-12: a cor dominante do idle é a no Oni e u na Tecelã', () => {
    expect(artMeasure.dominant(BOSS_FRAMES.idle)).toBe('a');
    expect(artMeasure.dominant(TECELA_FRAMES.idle)).toBe('u');
  });

  it('BSP-13: o mapa da Tecelã tem exatamente as 11 trocas da spec (pele, juba, pano e brilho do olho)', () => {
    expect(TECELA_COLOR_MAP).toEqual({
      A: 'U',
      a: 'u',
      z: 'v',
      m: 'K',
      H: 'w',
      j: 'I',
      h: 'i',
      U: 'l',
      u: 'L',
      v: 'q',
      R: 'C',
    });
  });

  it('BSP-14: o leap tem os pés recolhidos: a base da caixa opaca fica na linha 28 ou acima', () => {
    expect(artMeasure.box(BOSS_FRAMES.leap)[3]).toBeLessThanOrEqual(28);
  });
});

describe('animações dos chefes em laço (BAN-01..06)', () => {
  /** Dois frames distintos, em laço, começando pelo frame com o nome do estado. */
  const expectLoopOfTwo = (name: string): void => {
    const anim = BOSS_ANIMS[name];
    expect(anim.frames, name).toHaveLength(2);
    expect(anim.frames[0], name).toBe(name);
    expect(anim.repeat, name).toBe(-1);
    expect(BOSS_FRAMES[anim.frames[0]], name).not.toEqual(BOSS_FRAMES[anim.frames[1]]);
  };

  it('BAN-01: idle tem 4 frames em laço, 4 durações maiores que 0 e nenhum par consecutivo igual (contando a volta)', () => {
    const { frames, repeat, durations } = BOSS_ANIMS.idle;
    expect(frames).toHaveLength(4);
    expect(repeat).toBe(-1);
    expect(durations).toHaveLength(4);
    for (const d of durations!) expect(d).toBeGreaterThan(0);
    frames.forEach((f, i) => {
      const next = frames[(i + 1) % frames.length];
      expect(BOSS_FRAMES[f], `${f} x ${next}`).not.toEqual(BOSS_FRAMES[next]);
    });
  });

  it.each(['windup-charge', 'windup-leap', 'windup-volley'])(
    'BAN-02: %s tem 2 frames distintos em laço, com 90 ms por frame',
    (name) => {
      expectLoopOfTwo(name);
      expect(BOSS_ANIMS[name].durations).toEqual([90, 90]);
    },
  );

  it.each([
    ['charge', 80],
    ['roar', 80],
    ['stagger', 220],
  ] as const)('BAN-03: %s tem 2 frames distintos em laço, com %i ms por frame', (name, ms) => {
    expectLoopOfTwo(name);
    expect(BOSS_ANIMS[name].durations).toEqual([ms, ms]);
  });

  it('BAN-04: volley tem 2 frames distintos em laço e um ciclo dura BOSS.volley.intervalMs', () => {
    expectLoopOfTwo('volley');
    const durations = BOSS_ANIMS.volley.durations!;
    expect(durations).toHaveLength(2);
    for (const d of durations) expect(d).toBeGreaterThan(0);
    expect(durations[0] + durations[1]).toBe(BOSS.volley.intervalMs);
  });

  it.each(['leap', 'dead'])('BAN-05: %s tem 1 frame, com o nome do estado', (name) => {
    expect(BOSS_ANIMS[name].frames).toEqual([name]);
  });

  it('BAN-06: todo frame citado por BOSS_ANIMS existe nas folhas do Oni e da Tecelã', () => {
    for (const [name, anim] of Object.entries(BOSS_ANIMS)) {
      for (const f of anim.frames) {
        expect(Object.hasOwn(BOSS_FRAMES, f), `oni ${name}: ${f}`).toBe(true);
        expect(Object.hasOwn(TECELA_FRAMES, f), `tecela ${name}: ${f}`).toBe(true);
      }
    }
  });
});

describe('projétil e onda de choque do chefe (BAT-03/04/07)', () => {
  it('o projétil passa no parseSheet só com cores da paleta', () => {
    const sheet = parseSheet('boss-projectile', { projectile: PROJECTILE_FRAME }, PALETTE_KEYS);
    expect(sheet.frames).toHaveLength(1);
  });

  it('a onda de choque tem 10 texels de altura (20 px de mundo com ART_SCALE 2, BAT-03)', () => {
    const sheet = parseSheet('boss-shockwave', { shockwave: SHOCKWAVE_FRAME }, PALETTE_KEYS);
    expect(sheet.height).toBe(10);
    expect(sheet.height * ART_SCALE).toBe(BOSS.shockwave.height);
  });

  it('BPW-01: o projétil tem 8x8 texels, os 4 cantos transparentes e os tons w, U, u e v', () => {
    const sheet = parseSheet('boss-projectile', { projectile: PROJECTILE_FRAME }, PALETTE_KEYS);
    expect(sheet.width).toBe(8);
    expect(sheet.height).toBe(8);
    const cells = sheet.frames[0].cells;
    for (const [x, y] of [
      [0, 0],
      [7, 0],
      [0, 7],
      [7, 7],
    ])
      expect(cells[y][x], `(${x}, ${y})`).toBeNull();
    const keys = artMeasure.keysOf(PROJECTILE_FRAME);
    for (const tone of ['w', 'U', 'u', 'v']) expect(keys.has(tone), tone).toBe(true);
  });

  it('BPW-02: a onda de choque tem 16x10 texels, pelo menos 30% transparentes e os tons w, A, a e z', () => {
    const sheet = parseSheet('boss-shockwave', { shockwave: SHOCKWAVE_FRAME }, PALETTE_KEYS);
    expect(sheet.width).toBe(16);
    expect(sheet.height).toBe(10);
    expect(artMeasure.countOf(SHOCKWAVE_FRAME, TRANSPARENT) / (16 * 10)).toBeGreaterThanOrEqual(0.3);
    const keys = artMeasure.keysOf(SHOCKWAVE_FRAME);
    for (const tone of ['w', 'A', 'a', 'z']) expect(keys.has(tone), tone).toBe(true);
  });

  it('BPW-03: a linha 9 (a base) da onda de choque tem pelo menos 12 texels opacos', () => {
    expect([...SHOCKWAVE_FRAME[9]].filter((c) => c !== TRANSPARENT).length).toBeGreaterThanOrEqual(12);
  });

  it('a altura da onda é menor que o ápice do pulo do player, computado do PLAYER_MOVE (BAT-07)', () => {
    const jumpApex = PLAYER_MOVE.jumpSpeed ** 2 / (2 * PLAYER_MOVE.gravity);
    expect(jumpApex).toBeCloseTo(49, 5);
    expect(BOSS.shockwave.height).toBeLessThan(jumpApex);
  });
});
