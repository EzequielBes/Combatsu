import { describe, expect, it } from 'vitest';
import { TRANSPARENT, parseSheet } from '../../../src/core/pixelGrid';
// Importar no Vitest (Node, sem window) já prova que a paleta não carrega o `phaser` como valor.
import { ART_SCALE, PALETTE_KEYS } from '../../../src/game/art/palette';
import enemyBBoxBaseline from '../fixtures/enemyBBoxBaseline.json';
import { ENEMY_AI, ENEMY_ATTACK } from '../../../src/data/tuning';
import type { EnemyAnim } from '../../../src/core/animState';
import {
  ENEMY_ANIMS,
  ENEMY_FRAMES,
  ENEMY_FRAME_H,
  ENEMY_FRAME_W,
  ENEMY_ORIGIN,
  ENEMY_RAG_PARTS,
  ENEMY_RAG_VARIANTS,
  ENEMY_VARIANT_FRAMES,
  type EnemyVariantId,
} from '../../../src/game/art/sprites/enemy';
import type Phaser from 'phaser';
import { createArt } from '../../../src/game/art';
import { TEX } from '../../../src/game/textures';
import { TELEGRAPH_FRAMES } from '../../../src/game/art/sprites/telegraph';
import { KIND_COLOR, type AttackKind } from '../../../src/core/attackKind';
import { artMeasure } from './helpers';

describe('folha do inimigo (CHR-03, CHR-04, ART-01)', () => {
  const sheet = parseSheet('enemy', ENEMY_FRAMES, PALETTE_KEYS);
  const CHR03: EnemyAnim[] = ['idle', 'walk', 'windup', 'attack', 'hurt', 'getup'];
  const colorsOf = (cells: (string | null)[][]): Set<string> =>
    new Set(cells.flat().filter((c): c is string => c !== null));

  it('passa no parseSheet só com cores da paleta, todos os frames do mesmo tamanho (48 px de altura)', () => {
    expect(sheet.width).toBe(ENEMY_FRAME_W);
    expect(sheet.height).toBe(ENEMY_FRAME_H);
    expect(sheet.height * ART_SCALE).toBe(48);
  });

  it('toda animação do CHR-03 existe e tem pelo menos um frame, e todo frame citado existe na folha', () => {
    for (const name of CHR03) {
      const anim = ENEMY_ANIMS[name];
      expect(anim, name).toBeDefined();
      expect(anim.frames.length, name).toBeGreaterThan(0);
      for (const f of anim.frames) expect(Object.hasOwn(ENEMY_FRAMES, f), `${name}: ${f}`).toBe(true);
    }
  });

  it('no frame attack a garra chega à borda da hitbox do ENEMY_ATTACK (até 1 texel além), na altura da hitbox', () => {
    const originCol = ENEMY_ORIGIN.x * ENEMY_FRAME_W;
    const footRow = ENEMY_ORIGIN.y * ENEMY_FRAME_H;
    // Corpo de 36 px com o pé na base: o centro fica 18 px acima do pé.
    const centerFromFoot = 18;
    const box = ENEMY_ATTACK.hitbox!;
    const edge = box.offsetX + box.width / 2;
    const frame = sheet.frames.find((f) => f.key === ENEMY_ANIMS.attack.frames[0])!;
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
    expect(reach).toBeGreaterThanOrEqual(edge);
    expect(reach).toBeLessThanOrEqual(edge + ART_SCALE);
    const rowTop = (reachRow - footRow) * ART_SCALE + centerFromFoot;
    expect(rowTop).toBeGreaterThanOrEqual(box.offsetY - box.height / 2 - ART_SCALE);
    expect(rowTop + ART_SCALE).toBeLessThanOrEqual(box.offsetY + box.height / 2 + ART_SCALE);
  });

  it('a origem fica no pé e a linha de centro cai num número inteiro de px', () => {
    expect(ENEMY_ORIGIN.y).toBe(1);
    expect(Number.isInteger(ENEMY_ORIGIN.x * ENEMY_FRAME_W * ART_SCALE)).toBe(true);
  });

  it('as partes do ragdoll (cabeça, tronco, membro) passam no parseSheet e só usam cores dos frames do inimigo', () => {
    const frameColors = new Set(sheet.frames.flatMap((f) => [...colorsOf(f.cells)]));
    expect(Object.keys(ENEMY_RAG_PARTS).sort()).toEqual(['head', 'limb', 'torso']);
    for (const [name, grid] of Object.entries(ENEMY_RAG_PARTS)) {
      const part = parseSheet(`rag-${name}`, { [name]: grid }, PALETTE_KEYS);
      for (const c of colorsOf(part.frames[0].cells)) expect(frameColors.has(c), `${name}: ${c}`).toBe(true);
    }
  });

  it('a cabeça do ragdoll tem o olho (o âmbar do olho dos frames)', () => {
    const head = colorsOf(parseSheet('rag-head', { head: ENEMY_RAG_PARTS.head }, PALETTE_KEYS).frames[0].cells);
    expect(head.has('A')).toBe(true);
  });
});

describe('pendências dos inimigos (EPD-01..04)', () => {
  it('EPD-01: no impact do bruto, as linhas 0 a 11 têm exatamente 1 texel w (a ponta do chifre)', () => {
    expect(artMeasure.countOf(ENEMY_VARIANT_FRAMES.bruto.impact.slice(0, 12), 'w')).toBe(1);
  });

  it('EPD-02: no attack-0 do bruto, a coluna da ponta do punho tem exatamente 3 texels opacos', () => {
    const rows = ENEMY_VARIANT_FRAMES.bruto['attack-0'];
    const tip = artMeasure.box(rows)[2];
    expect(rows.filter((row) => row[tip] !== TRANSPARENT)).toHaveLength(3);
  });

  it('EPD-03: no rastejante, o topo do hurt-uppercut-0 fica pelo menos 3 linhas acima do topo do hurt-head-a-0', () => {
    const frames = ENEMY_VARIANT_FRAMES.rastejante;
    const headTop = artMeasure.box(frames['hurt-head-a-0'])[1];
    const uppercutTop = artMeasure.box(frames['hurt-uppercut-0'])[1];
    expect(headTop - uppercutTop).toBeGreaterThanOrEqual(3);
  });

  it.each([
    ['corcunda', 9],
    ['rastejante', 8],
  ] as const)('EPD-05: no impact do %s, a borda branca começa na linha %i e não na de cima', (id, firstRimRow) => {
    const rightmost = (row: string): string => [...row].filter((c) => c !== TRANSPARENT).at(-1)!;
    const rows = ENEMY_VARIANT_FRAMES[id].impact;
    expect(rightmost(rows[firstRimRow])).toBe('w');
    expect(rightmost(rows[firstRimRow - 1])).not.toBe('w');
  });

  it('EPD-06: o punho do bruto tem os cantos arredondados fora do golpe (idle-0 e walk-0)', () => {
    expect(ENEMY_VARIANT_FRAMES.bruto['idle-0'][22][19]).toBe(TRANSPARENT);
    expect(ENEMY_VARIANT_FRAMES.bruto['walk-0'][20][21]).toBe(TRANSPARENT);
  });

  it.each(['corcunda', 'rastejante', 'bruto'] as const)(
    'EPD-04: no hurt-uppercut-0 do %s, a base da caixa opaca fica na linha 20 ou acima',
    (id) => {
      expect(artMeasure.box(ENEMY_VARIANT_FRAMES[id]['hurt-uppercut-0'])[3]).toBeLessThanOrEqual(20);
    },
  );
});

describe('alinhamento dos frames do inimigo contra a linha de base congelada (EVR-07)', () => {
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
  const baseline = enemyBBoxBaseline as Record<string, number[]>;
  const entries = Object.entries(baseline);

  it('a fixture congelada cobre os 11 frames pré-existentes', () => {
    expect(entries).toHaveLength(11);
    expect(Object.keys(ENEMY_FRAMES)).toEqual(expect.arrayContaining(entries.map(([n]) => n)));
  });

  it('cada borda da bbox fica a até 2 texels da linha de base', () => {
    for (const [name, base] of entries) {
      expect(ENEMY_FRAMES[name], `frame ${name} existe`).toBeDefined();
      const now = bboxOf(ENEMY_FRAMES[name]);
      for (let i = 0; i < 4; i++) {
        expect(Math.abs(now[i] - base[i]), `${name} borda ${i}: ${now[i]} vs ${base[i]}`).toBeLessThanOrEqual(2);
      }
    }
  });

  it('o limite de 2 texels vale dos dois lados: deslocar o frame 2 texels dá desvio 2, 3 dá desvio 3', () => {
    const base = baseline['idle-0'];
    const rows = ENEMY_FRAMES['idle-0'];
    const shiftRight = (d: number) => rows.map((r) => '.'.repeat(d) + r.slice(0, r.length - d));
    const shiftLeft = (d: number) => rows.map((r) => r.slice(d) + '.'.repeat(d));
    const off = (r: readonly string[]) => Math.max(...bboxOf(r).map((v, i) => Math.abs(v - base[i])));
    // o idle-0 ocupa as colunas 4..20 de 0..31, então o deslocamento não corta nada
    expect(off(rows)).toBe(0);
    expect(off(shiftRight(2))).toBe(2);
    expect(off(shiftRight(3))).toBe(3);
    expect(off(shiftLeft(2))).toBe(2);
    expect(off(shiftLeft(3))).toBe(3);
  });
});

describe('três aparências do inimigo (EVR-01, EVR-02, EVR-03, EVR-10)', () => {
  const IDS: EnemyVariantId[] = ['corcunda', 'rastejante', 'bruto'];
  const nonEmpty = (rows: readonly string[]) =>
    rows.flatMap((r, y) => [...r].map((c, x) => ({ c, x, y }))).filter((t) => t.c !== TRANSPARENT);
  const dominant = (rows: readonly string[]): string => {
    const count = new Map<string, number>();
    for (const { c } of nonEmpty(rows)) count.set(c, (count.get(c) ?? 0) + 1);
    // ignora contorno e cores de detalhe (olho, boca, osso): a cor do corpo é a mais frequente fora delas
    const skip = new Set(['k', 'K', 'b', 'w', 'A', 'a', 'r', 'R', 'S', 'H', 'n']);
    return [...count].filter(([c]) => !skip.has(c)).sort((a, b) => b[1] - a[1])[0][0];
  };

  it('EVR-01: as 3 aparências têm todo frame citado por ENEMY_ANIMS, em 32x24, só com cores da paleta', () => {
    expect(Object.keys(ENEMY_VARIANT_FRAMES).sort()).toEqual([...IDS].sort());
    for (const id of IDS) {
      const frames = ENEMY_VARIANT_FRAMES[id];
      const sheet = parseSheet(`enemy-${id}`, frames, PALETTE_KEYS);
      expect(sheet.width, id).toBe(ENEMY_FRAME_W);
      expect(sheet.height, id).toBe(ENEMY_FRAME_H);
      for (const [name, anim] of Object.entries(ENEMY_ANIMS)) {
        for (const f of anim.frames) expect(Object.hasOwn(frames, f), `${id} ${name}: ${f}`).toBe(true);
      }
    }
    expect(ENEMY_FRAMES).toBe(ENEMY_VARIANT_FRAMES.corcunda);
  });

  it('EVR-02: cada par difere em pelo menos 25% dos texels do idle-0 e a cor dominante é distinta', () => {
    const idle = (id: EnemyVariantId) => ENEMY_VARIANT_FRAMES[id]['idle-0'];
    const pairs: [EnemyVariantId, EnemyVariantId][] = [
      ['corcunda', 'rastejante'],
      ['corcunda', 'bruto'],
      ['rastejante', 'bruto'],
    ];
    for (const [a, b] of pairs) {
      const ra = idle(a);
      const rb = idle(b);
      const cellsA = nonEmpty(ra);
      const cellsB = nonEmpty(rb);
      const union = new Map<string, true>();
      for (const t of [...cellsA, ...cellsB]) union.set(`${t.x},${t.y}`, true);
      let differ = 0;
      for (const key of union.keys()) {
        const [x, y] = key.split(',').map(Number);
        if (ra[y][x] !== rb[y][x]) differ++;
      }
      expect(differ / Math.min(cellsA.length, cellsB.length), `${a} x ${b}`).toBeGreaterThanOrEqual(0.25);
    }
    expect(IDS.map((id) => dominant(idle(id)))).toEqual(['i', 'g', 'u']);
  });

  it('EVR-03: no frame attack a garra de cada aparência chega à borda da hitbox do ENEMY_ATTACK (até 1 texel além), na altura', () => {
    const originCol = ENEMY_ORIGIN.x * ENEMY_FRAME_W;
    const box = ENEMY_ATTACK.hitbox!;
    const edge = box.offsetX + box.width / 2;
    for (const id of IDS) {
      const rows = ENEMY_VARIANT_FRAMES[id][ENEMY_ANIMS.attack.frames[0]];
      const cells = nonEmpty(rows);
      const maxX = Math.max(...cells.map((t) => t.x));
      const reach = (maxX + 1 - originCol) * ART_SCALE;
      expect(reach, id).toBeGreaterThanOrEqual(edge);
      expect(reach, id).toBeLessThanOrEqual(edge + ART_SCALE);
      // a ponta (coluna mais à frente) fica na faixa vertical da hitbox: linhas 9..19 do frame (pé na linha 24, centro 18 px acima)
      for (const t of cells.filter((c) => c.x === maxX)) {
        const rowTop = (t.y - ENEMY_FRAME_H) * ART_SCALE + 18;
        expect(rowTop, id).toBeGreaterThanOrEqual(box.offsetY - box.height / 2 - ART_SCALE);
        expect(rowTop + ART_SCALE, id).toBeLessThanOrEqual(box.offsetY + box.height / 2 + ART_SCALE);
      }
    }
  });

  it('EVR-10: o idle-0 de cada aparência tem no máximo 4 texels k internos (sel-out aplicado)', () => {
    for (const id of IDS) {
      const rows = ENEMY_VARIANT_FRAMES[id]['idle-0'];
      let interior = 0;
      for (let y = 1; y < rows.length - 1; y++) {
        for (let x = 1; x < rows[y].length - 1; x++) {
          if (rows[y][x] !== 'k') continue;
          const n = [rows[y - 1][x], rows[y + 1][x], rows[y][x - 1], rows[y][x + 1]];
          if (n.every((c) => c !== TRANSPARENT)) interior++;
        }
      }
      expect(interior, id).toBeLessThanOrEqual(4);
    }
  });

  it('EVR-08: idle >= 4, walk >= 6, windup 2, attack 2 e getup >= 3 frames, todos com durations e todo frame citado existe', () => {
    const min: Record<string, number> = { idle: 4, walk: 6, windup: 2, attack: 2, getup: 3 };
    for (const [name, n] of Object.entries(min)) {
      const anim = ENEMY_ANIMS[name];
      if (name === 'windup' || name === 'attack') expect(anim.frames, name).toHaveLength(n);
      else expect(anim.frames.length, name).toBeGreaterThanOrEqual(n);
      expect(anim.durations, name).toBeDefined();
      expect(anim.durations!.length, name).toBe(anim.frames.length);
      for (const d of anim.durations!) expect(d, name).toBeGreaterThan(0);
      for (const id of IDS)
        for (const f of anim.frames)
          expect(Object.hasOwn(ENEMY_VARIANT_FRAMES[id], f), `${id} ${name}: ${f}`).toBe(true);
    }
  });

  it('EVR-09: o windup segura windup-1 nos últimos 200 ms do preparo (soma antes dele <= 250 ms; 250 passa, 251 falha)', () => {
    const holdsFinal200 = (durations: readonly number[]) =>
      durations.slice(0, -1).reduce((a, b) => a + b, 0) <= ENEMY_AI.windupMs - 200;
    expect(ENEMY_AI.windupMs).toBe(450);
    expect(ENEMY_ANIMS.windup.frames.at(-1)).toBe('windup-1');
    expect(holdsFinal200(ENEMY_ANIMS.windup.durations!)).toBe(true);
    expect(holdsFinal200([250, 200])).toBe(true);
    expect(holdsFinal200([251, 199])).toBe(false);
    for (const id of IDS) {
      const frames = ENEMY_VARIANT_FRAMES[id];
      // o frame de máximo preparo é distinto do início e o alias `windup` aponta para ele
      expect(frames['windup-1'], id).not.toEqual(frames['windup-0']);
      expect(frames.windup, id).toEqual(frames['windup-1']);
    }
  });

  it('HRX-03: as 4 reações leves têm 3 frames (60, 90, 70 ms, uma vez), o frame 0 difere >= 2 texels de bbox do idle-0 e head-a difere de head-b; impact existe', () => {
    const bbox = (rows: readonly string[]): number[] => {
      const cells = nonEmpty(rows);
      return [
        Math.min(...cells.map((c) => c.x)),
        Math.min(...cells.map((c) => c.y)),
        Math.max(...cells.map((c) => c.x)),
        Math.max(...cells.map((c) => c.y)),
      ];
    };
    const names = ['hurt-head-a', 'hurt-head-b', 'hurt-uppercut', 'hurt-body'];
    for (const id of IDS) {
      const frames = ENEMY_VARIANT_FRAMES[id];
      const idle = bbox(frames['idle-0']);
      for (const n of names) {
        const anim = ENEMY_ANIMS[n];
        expect(anim.frames, `${id} ${n}`).toEqual([0, 1, 2].map((i) => `${n}-${i}`));
        expect(anim.durations, `${id} ${n}`).toEqual([60, 90, 70]);
        expect(anim.repeat, `${id} ${n}`).toBe(0);
        const b = bbox(frames[`${n}-0`]);
        expect(Math.max(...b.map((v, i) => Math.abs(v - idle[i]))), `${id} ${n} bbox`).toBeGreaterThanOrEqual(2);
      }
      expect(frames['hurt-head-a-0'], id).not.toEqual(frames['hurt-head-b-0']);
      expect(ENEMY_ANIMS.impact.frames).toEqual(['impact']);
      expect(Object.hasOwn(frames, 'impact'), id).toBe(true);
    }
  });

  it('as partes do ragdoll das 3 aparências têm 8x7, 8x10 e 3x8 texels e só cores da paleta', () => {
    for (const id of IDS) {
      const { head, torso, limb } = ENEMY_RAG_VARIANTS[id];
      const size = (g: readonly string[]) => [Math.max(...g.map((r) => r.length)), g.length];
      expect(size(head), id).toEqual([8, 7]);
      expect(size(torso), id).toEqual([8, 10]);
      expect(size(limb), id).toEqual([3, 8]);
      for (const [n, g] of Object.entries({ head, torso, limb }))
        parseSheet(`rag-${n}-${id}`, { [n]: g }, PALETTE_KEYS);
    }
    expect(ENEMY_RAG_PARTS).toBe(ENEMY_RAG_VARIANTS.corcunda);
  });
});

describe('marcador de telegrafo (HGT-09, T16 da combate-mestre)', () => {
  const KINDS: AttackKind[] = ['white', 'red', 'low'];
  const opaque = (kind: AttackKind): string[] =>
    TELEGRAPH_FRAMES[kind].flatMap((row, y) => [...row].flatMap((c, x) => (c === TRANSPARENT ? [] : [`${x},${y}`])));

  it('a folha tem os frames white, red e low, todos do mesmo tamanho (7x7 texels), só com cores da paleta', () => {
    expect(Object.keys(TELEGRAPH_FRAMES).sort()).toEqual(['low', 'red', 'white']);
    const sheet = parseSheet('telegraph', TELEGRAPH_FRAMES, PALETTE_KEYS);
    expect(sheet.frames).toHaveLength(3);
    expect(sheet.width).toBe(7);
    expect(sheet.height).toBe(7);
  });

  it('o conjunto de texels opacos difere em cada par de frames', () => {
    for (const [a, b] of [
      ['white', 'red'],
      ['white', 'low'],
      ['red', 'low'],
    ] as const) {
      expect(opaque(a), `${a} vs ${b}`).not.toEqual(opaque(b));
    }
  });

  it.each(KINDS)('%s: usa a cor do tipo (KIND_COLOR) e o contorno k, e mais nenhuma', (kind) => {
    const colors = new Set(TELEGRAPH_FRAMES[kind].flatMap((row) => [...row]).filter((c) => c !== TRANSPARENT));
    expect([...colors].sort()).toEqual(['k', KIND_COLOR[kind]].sort());
  });

  it('TEX.fxTelegraph existe e não repete a chave de outra textura', () => {
    expect(typeof TEX.fxTelegraph).toBe('string');
    const sameKey = Object.entries(TEX).filter(([, key]) => key === TEX.fxTelegraph);
    expect(sameKey).toHaveLength(1);
  });

  it('createArt registra a folha do marcador em TEX.fxTelegraph, com um frame por tipo', () => {
    const sheets = new Map<string, string[]>();
    const ctx = new Proxy({}, { get: () => () => undefined, set: () => true });
    const graphics = new Proxy({}, { get: () => () => undefined });
    const scene = {
      textures: {
        exists: () => false,
        remove: () => undefined,
        createCanvas: (key: string) => {
          const frames: string[] = [];
          sheets.set(key, frames);
          return { getContext: () => ctx, add: (name: string) => frames.push(name), refresh: () => undefined };
        },
        get: (key: string) => ({ has: (frame: string) => sheets.get(key)?.includes(frame) ?? false }),
      },
      anims: { exists: () => false, remove: () => undefined, create: () => undefined },
      add: { graphics: () => graphics },
    } as unknown as Phaser.Scene;
    createArt(scene);
    expect(sheets.get(TEX.fxTelegraph)).toEqual(['white', 'red', 'low']);
  });
});
