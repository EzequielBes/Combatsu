import { describe, expect, it } from 'vitest';
import type { PlayerAnim } from '../../../src/core/animState';
import { TRANSPARENT, parseSheet } from '../../../src/core/pixelGrid';
// Importar no Vitest (Node, sem window) já prova que a paleta não carrega o `phaser` como valor.
import { ART_SCALE, PALETTE_KEYS } from '../../../src/game/art/palette';
import {
  PLAYER_ANIMS,
  PLAYER_FRAMES,
  animFrameConfigs,
  selOut,
  PLAYER_FRAME_H,
  PLAYER_TOP_PAD,
  PLAYER_FRAME_W,
  PLAYER_ORIGIN,
} from '../../../src/game/art/sprites/player';
import { selOut as sharedSelOut, type SelOutConfig } from '../../../src/game/art/selOut';
import { PLAYER_MOVE_FRAMES } from '../../../src/game/art/sprites/playerMoves';
import playerBBoxBaseline from '../fixtures/playerBBoxBaseline.json';
import { PLAYER_TECH_FRAMES } from '../../../src/game/art/sprites/playerTech';
import { PLAYER_COMBO } from '../../../src/data/tuning';

describe('folha do player (CHR-01, ART-01, ART-03)', () => {
  const sheet = parseSheet('player', PLAYER_FRAMES, PALETTE_KEYS);
  const CHR01: PlayerAnim[] = [
    'idle',
    'run',
    'jump',
    'fall',
    'jab',
    'cross',
    'kick',
    'carry-idle',
    'carry-run',
    'swing',
    'throw',
    'hurt',
  ];

  it('passa no parseSheet só com cores da paleta, todos os frames do mesmo tamanho', () => {
    expect(sheet.width).toBe(PLAYER_FRAME_W);
    expect(sheet.height).toBe(PLAYER_FRAME_H);
    // 30 texels de altura = 60 px com ART_SCALE 2: os 24 do spec original mais 6 de folga no topo (impacto-amaldicoado, POS-05).
    expect(sheet.height * ART_SCALE).toBe(60);
  });

  it('toda animação do CHR-01 existe e tem pelo menos um frame, e todo frame citado existe na folha', () => {
    for (const name of CHR01) {
      const anim = PLAYER_ANIMS[name];
      expect(anim, name).toBeDefined();
      expect(anim.frames.length, name).toBeGreaterThan(0);
      for (const f of anim.frames) expect(Object.hasOwn(PLAYER_FRAMES, f), `${name}: ${f}`).toBe(true);
    }
  });

  it('jab, cross e kick têm os frames wind, hit e recover', () => {
    for (const name of ['jab', 'cross', 'kick']) {
      for (const part of ['wind', 'hit', 'recover']) {
        expect(Object.hasOwn(PLAYER_FRAMES, `${name}-${part}`), `${name}-${part}`).toBe(true);
      }
    }
  });

  it('no frame *-hit o membro chega à borda da hitbox do golpe (até 1 texel além), na altura da hitbox', () => {
    const originCol = PLAYER_ORIGIN.x * PLAYER_FRAME_W;
    const footRow = PLAYER_ORIGIN.y * PLAYER_FRAME_H;
    // O corpo físico tem 36 px com o pé na base: o centro fica 18 px acima do pé.
    const centerFromFoot = 18;
    const byAnim: Record<string, number> = { jab: 0, cross: 1, kick: 2 };
    for (const [name, index] of Object.entries(byAnim)) {
      const box = PLAYER_COMBO[index].hitbox!;
      const edge = box.offsetX + box.width / 2;
      const frame = sheet.frames.find((f) => f.key === `${name}-hit`)!;
      let reach = -Infinity;
      let reachRow = -1;
      frame.cells.forEach((row, y) =>
        row.forEach((c, x) => {
          if (c === null) return;
          const px = (x + 1 - originCol) * ART_SCALE;
          if (px > reach) {
            reach = px;
            reachRow = y;
          }
        }),
      );
      expect(reach, name).toBeGreaterThanOrEqual(edge);
      expect(reach, name).toBeLessThanOrEqual(edge + ART_SCALE);
      // Linha mais à frente, em px relativos ao centro do corpo (y para baixo), dentro da faixa da hitbox.
      const rowTop = (reachRow - footRow) * ART_SCALE + centerFromFoot;
      expect(rowTop, name).toBeGreaterThanOrEqual(box.offsetY - box.height / 2 - ART_SCALE);
      expect(rowTop + ART_SCALE, name).toBeLessThanOrEqual(box.offsetY + box.height / 2 + ART_SCALE);
    }
  });

  it('a origem fica no pé (base do frame)', () => {
    expect(PLAYER_ORIGIN.y).toBe(1);
  });
});

describe('alinhamento dos frames do player contra a linha de base congelada (SPR-06)', () => {
  const bboxOf = (rows: readonly string[]): [number, number, number, number] => {
    let x0 = Infinity,
      y0 = Infinity,
      x1 = -1,
      y1 = -1;
    rows.forEach((row, y) => {
      [...row].forEach((c, x) => {
        if (c === TRANSPARENT) return;
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      });
    });
    return [x0, y0, x1, y1];
  };
  const all: Record<string, readonly string[]> = { ...PLAYER_FRAMES, ...PLAYER_MOVE_FRAMES, ...PLAYER_TECH_FRAMES };
  const entries = Object.entries(playerBBoxBaseline as Record<string, number[]>);

  it('a fixture congelada cobre os 102 frames pré-existentes', () => {
    expect(entries).toHaveLength(102);
  });

  it('cada borda da bbox fica a até 2 texels da linha de base', () => {
    for (const [name, base] of entries) {
      expect(all[name], `frame ${name} existe`).toBeDefined();
      // A fixture é de antes da folga de 6 linhas no topo: compara a bbox sem a folga.
      const now = bboxOf(all[name]);
      now[1] -= PLAYER_TOP_PAD;
      now[3] -= PLAYER_TOP_PAD;
      for (let i = 0; i < 4; i++) {
        expect(Math.abs(now[i] - base[i]), `${name} borda ${i}: ${now[i]} vs ${base[i]}`).toBeLessThanOrEqual(2);
      }
    }
  });
});

describe('duração por frame nas animações (SPR-08)', () => {
  const base = { frames: ['a', 'b', 'c'], frameRate: 10, repeat: 0 };

  it('devolve cada frame com a sua duration quando a animação declara durations', () => {
    expect(animFrameConfigs('x', { ...base, durations: [70, 1000, 1] })).toEqual([
      { frame: 'a', duration: 70 },
      { frame: 'b', duration: 1000 },
      { frame: 'c', duration: 1 },
    ]);
  });

  it('sem durations, devolve só os frames, sem duration', () => {
    expect(animFrameConfigs('x', base)).toEqual([{ frame: 'a' }, { frame: 'b' }, { frame: 'c' }]);
  });

  it('lança erro com o nome da animação quando durations tem tamanho diferente de frames', () => {
    expect(() => animFrameConfigs('minha-anim', { ...base, durations: [10, 10] })).toThrow(/minha-anim/);
    expect(() => animFrameConfigs('minha-anim', { ...base, durations: [10, 10, 10, 10] })).toThrow(/minha-anim/);
  });

  it('duração 0 (ou negativa) lança erro com o nome da animação; duração 1 passa', () => {
    expect(() => animFrameConfigs('zero', { ...base, durations: [10, 0, 10] })).toThrow(/zero/);
    expect(() => animFrameConfigs('neg', { ...base, durations: [10, -5, 10] })).toThrow(/neg/);
    expect(() => animFrameConfigs('um', { ...base, durations: [1, 1, 1] })).not.toThrow();
  });
});

describe('passe de sel-out e acabamento do idle-0 (SPR-03, SPR-04, SPR-05)', () => {
  const toCanvas = (rows: string[]): string[][] => rows.map((r) => [...r]);

  it('k interno vira x (vizinhos de pele), h (cabelo) ou o (demais); k de borda e b não mudam', () => {
    const canvas = toCanvas([
      '.pp.hh..bbb',
      '.pkp.kh.bkb',
      '.pp.hh..bbb',
      '...........',
      'NNNk.......',
      'NkN........',
      'NNN........',
    ]);
    selOut(canvas);
    expect(canvas[1][2]).toBe('x'); // cercado de pele
    expect(canvas[4][3]).toBe('k'); // contorno: encosta em transparente
    expect(canvas[5][1]).toBe('o'); // cercado de uniforme
    expect(canvas[0][8]).toBe('b'); // b nunca muda
  });

  it('limiar da maioria: exatamente 2 vizinhos de pele viram x; 1 de pele e 3 de uniforme viram o', () => {
    const two = toCanvas(['.p.', 'NkN', '.p.']);
    selOut(two);
    expect(two[1][1]).toBe('x');
    const one = toCanvas(['.p.', 'NkN', '.N.']);
    selOut(one);
    expect(one[1][1]).toBe('o');
  });

  it('limiar da maioria no cabelo: 1 vizinho de cabelo e 3 de uniforme viram o', () => {
    const canvas = toCanvas(['.h.', 'NkN', '.N.']);
    selOut(canvas);
    expect(canvas[1][1]).toBe('o');
  });

  it('k interno com 2 vizinhos de cabelo vira h', () => {
    const canvas = toCanvas(['.hh.', 'hkhk', '.hh.']);
    selOut(canvas);
    expect(canvas[1][1]).toBe('h');
  });

  it('o idle-0 tem no máximo 8 texels k internos (a linha de base era 17)', () => {
    const rows = PLAYER_FRAMES['idle-0'];
    let n = 0;
    rows.forEach((row, y) =>
      [...row].forEach((c, x) => {
        if (c !== 'k' || y === 0 || y === rows.length - 1 || x === 0 || x === row.length - 1) return;
        const nb = [rows[y - 1][x], rows[y + 1][x], row[x - 1], row[x + 1]];
        if (nb.every((v) => v !== TRANSPARENT)) n++;
      }),
    );
    expect(n).toBeLessThanOrEqual(8);
  });

  it('a cabeça (linhas 0-10 do desenho, mais a folga do topo) tem o branco do olho w ao lado de uma pupila escura e os 3 tons de cabelo', () => {
    const head = PLAYER_FRAMES['idle-0'].slice(PLAYER_TOP_PAD, 11 + PLAYER_TOP_PAD);
    expect(head.some((r) => /w[bk]|[bk]w/.test(r))).toBe(true);
    const joined = head.join('');
    for (const tone of ['h', 'j', 'H']) expect(joined, tone).toContain(tone);
  });

  it('o tronco (linhas 11-17 do desenho, mais a folga do topo) tem o botão dourado A, a luz de borda y e a linha interna o', () => {
    const joined = PLAYER_FRAMES['idle-0'].slice(11 + PLAYER_TOP_PAD, 18 + PLAYER_TOP_PAD).join('');
    for (const c of ['A', 'y', 'o']) expect(joined, c).toContain(c);
  });
});

describe('rastros de movimento nos golpes (SPR-14)', () => {
  const count = (rows: readonly string[], ch: string): number => rows.join('').split(ch).length - 1;
  const tipCol = (rows: readonly string[]): number =>
    Math.max(...rows.map((r) => [...r].reduce((m, c, x) => (c === TRANSPARENT ? m : x), -1)));

  // O kick saiu desta lista (impacto-amaldicoado, POS-06): o chute redesenhado não tem linhas S soltas; o rastro do golpe
  // passa a ser o procedural da feature. Ver tests/game/feelArt.test.ts.
  it.each(['jab', 'cross'])(
    '$0-hit tem pelo menos 3 S a mais que o próprio wind e todos ficam antes da ponta',
    (name) => {
      const hit = PLAYER_FRAMES[`${name}-hit`];
      const wind = PLAYER_FRAMES[`${name}-wind`];
      expect(count(hit, 'S') - count(wind, 'S')).toBeGreaterThanOrEqual(3);
      const tip = tipCol(hit);
      hit.forEach((row, y) =>
        [...row].forEach((c, x) => {
          if (c === 'S') expect(x, `${name}-hit S em (${x},${y})`).toBeLessThan(tip);
        }),
      );
    },
  );

  it('o rastro não muda o alcance: a ponta do membro continua na mesma coluna de antes', () => {
    expect(tipCol(PLAYER_FRAMES['jab-hit'])).toBe(27);
    expect(tipCol(PLAYER_FRAMES['cross-hit'])).toBe(27);
    expect(tipCol(PLAYER_FRAMES['kick-hit'])).toBe(30);
  });
});

describe('animações de movimento do player (SPR-09, SPR-12)', () => {
  it('idle tem 4 frames, repete, e nenhum par consecutivo (inclusive o de volta ao início) é igual (SPR-09)', () => {
    const { frames, repeat } = PLAYER_ANIMS.idle;
    expect(frames).toHaveLength(4);
    expect(repeat).toBe(-1);
    frames.forEach((f, i) => {
      const next = frames[(i + 1) % frames.length];
      expect(PLAYER_FRAMES[f], `${f} vs ${next}`).not.toEqual(PLAYER_FRAMES[next]);
    });
  });

  it('jump, apex, fall, land e hurt têm o tamanho e o repeat do spec e só citam frames existentes (SPR-12)', () => {
    const spec: Array<[string, number, number, 'min' | 'exact']> = [
      ['jump', 2, 0, 'min'],
      ['apex', 1, 0, 'min'],
      ['fall', 2, -1, 'min'],
      ['land', 2, 0, 'exact'],
      ['hurt', 2, 0, 'exact'],
    ];
    for (const [name, n, repeat, mode] of spec) {
      const anim = PLAYER_ANIMS[name];
      expect(anim, name).toBeDefined();
      if (mode === 'exact') expect(anim.frames, name).toHaveLength(n);
      else expect(anim.frames.length, name).toBeGreaterThanOrEqual(n);
      expect(anim.repeat, name).toBe(repeat);
      for (const f of anim.frames) expect(Object.hasOwn(PLAYER_FRAMES, f), `${name}: ${f}`).toBe(true);
    }
  });
});

describe('selOut compartilhado e configurável (EVR-10)', () => {
  const toCanvas = (rows: string[]): string[][] => rows.map((r) => [...r]);
  const cfg: SelOutConfig = {
    rules: [
      { keys: new Set(['g', 'G']), line: 'n' },
      { keys: new Set(['A']), line: 'b' },
    ],
    fallback: 'K',
  };

  it('com regra própria, k cercado de 2+ vizinhos do grupo vira a linha do grupo', () => {
    const c = toCanvas(['.g.', 'GkG', '.g.']);
    selOut(c, cfg);
    expect(c[1][1]).toBe('n');
  });

  it('limiar dos dois lados: 2 vizinhos do grupo valem, 1 não', () => {
    const two = toCanvas(['.g.', 'NkN', '.G.']);
    selOut(two, cfg);
    expect(two[1][1]).toBe('n');
    const one = toCanvas(['.g.', 'NkN', '.N.']);
    selOut(one, cfg);
    expect(one[1][1]).toBe('K');
  });

  it('o fallback vale quando nenhuma regra bate; as regras valem na ordem', () => {
    const none = toCanvas(['.N.', 'NkN', '.N.']);
    selOut(none, cfg);
    expect(none[1][1]).toBe('K');
    const both = toCanvas(['.g.', 'gkA', '.A.']); // 2 de g e 2 de A: a primeira regra ganha
    selOut(both, cfg);
    expect(both[1][1]).toBe('n');
    const second = toCanvas(['.A.', 'NkA', '.N.']);
    selOut(second, cfg);
    expect(second[1][1]).toBe('b');
  });

  it('contorno externo (vizinho transparente ou borda) e outras teclas não mudam', () => {
    const c = toCanvas(['.g.', 'gkg', '...', 'gbg']);
    selOut(c, cfg);
    expect(c[1][1]).toBe('k');
    expect(c[3][1]).toBe('b');
  });

  it('sem configuração vale a regra do player (pele -> x)', () => {
    const c = toCanvas(['.p.', 'pkN', '.N.']);
    selOut(c);
    expect(c[1][1]).toBe('x');
  });

  it('o player reexporta o mesmo selOut', () => {
    expect(selOut).toBe(sharedSelOut);
  });
});
