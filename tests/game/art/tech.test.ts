import { describe, expect, it } from 'vitest';
import { parseSheet } from '../../../src/core/pixelGrid';
// Importar no Vitest (Node, sem window) já prova que a paleta não carrega o `phaser` como valor.
import { ART_SCALE, PALETTE_KEYS } from '../../../src/game/art/palette';
import { PLAYER_FRAMES, PLAYER_FRAME_H, PLAYER_FRAME_W, PLAYER_ORIGIN } from '../../../src/game/art/sprites/player';
import { PLAYER_TECH_FRAMES, fingertipOffsetPx, redFingertip } from '../../../src/game/art/sprites/playerTech';
import { KANJI_FRAMES } from '../../../src/game/art/sprites/kanji';
import {
  AURA_FRAMES,
  BLUE_ORB_FRAME,
  RED_ORB_FRAMES,
  RED_ORB_SIZES,
  TECH_SPARK_FRAMES,
} from '../../../src/game/art/sprites/techFx';
import { RED_FX_COLORS } from '../../../src/game/techFx/redPalette';

describe('frames de conjuração das técnicas (CAST-18, CAST-22)', () => {
  const IDS: Array<'divergente' | 'vermelho' | 'azul' | 'corte'> = ['divergente', 'vermelho', 'azul', 'corte'];
  const sheet = parseSheet('player-tech', PLAYER_TECH_FRAMES, PALETTE_KEYS);

  it('passa no parseSheet só com cores da paleta, todo frame com 32x24 texels (CAST-18/22)', () => {
    expect(sheet.width).toBe(PLAYER_FRAME_W);
    expect(sheet.height).toBe(PLAYER_FRAME_H);
  });

  it('cada técnica de CAST-18 tem os 4 frames sign/charge/release/recover', () => {
    for (const id of IDS) {
      for (const part of ['sign', 'charge', 'release', 'recover']) {
        expect(Object.hasOwn(PLAYER_TECH_FRAMES, `${id}-${part}`), `${id}-${part}`).toBe(true);
      }
    }
  });

  it('as 4 fases de cada técnica têm silhuetas distintas entre si (aprovação de arte, ronda 2)', () => {
    const PARTS = ['sign', 'charge', 'release', 'recover'] as const;
    for (const id of IDS) {
      const frames = PARTS.map((part) => PLAYER_TECH_FRAMES[`${id}-${part}`]);
      for (let i = 0; i < frames.length; i++) {
        for (let j = i + 1; j < frames.length; j++) {
          expect(frames[i], `${id}-${PARTS[i]} vs ${id}-${PARTS[j]}`).not.toEqual(frames[j]);
        }
      }
    }
  });

  it('tem o frame kokusen-hit, 32x24 texels só com cores da paleta', () => {
    expect(Object.hasOwn(PLAYER_TECH_FRAMES, 'kokusen-hit')).toBe(true);
    const frame = sheet.frames.find((f) => f.key === 'kokusen-hit')!;
    expect(frame.cells.length).toBe(PLAYER_FRAME_H);
    expect(frame.cells[0].length).toBe(PLAYER_FRAME_W);
  });

  it('nenhum frame de técnica repete o nome de um frame da folha base do player', () => {
    for (const key of Object.keys(PLAYER_TECH_FRAMES)) {
      expect(Object.hasOwn(PLAYER_FRAMES, key), key).toBe(false);
    }
  });
});

describe('kanji das técnicas (KOK-29, KOK-34, TFX-01)', () => {
  it('黒 (kuro) e 閃 (sen) têm 24x24 texels, só com cores da paleta (KOK-29/34)', () => {
    for (const id of ['kuro', 'sen'] as const) {
      const sheet = parseSheet(`kanji-${id}`, { [id]: KANJI_FRAMES[id] }, PALETTE_KEYS);
      expect(sheet.width, id).toBe(24);
      expect(sheet.height, id).toBe(24);
    }
  });

  it('赫 (aka), 蒼 (ao), 解 (kai) e 拳 (ken) também têm 24x24 texels, só com cores da paleta (TFX-01)', () => {
    for (const id of ['aka', 'ao', 'kai', 'ken'] as const) {
      const sheet = parseSheet(`kanji-${id}`, { [id]: KANJI_FRAMES[id] }, PALETTE_KEYS);
      expect(sheet.width, id).toBe(24);
      expect(sheet.height, id).toBe(24);
    }
  });

  it('os 6 kanji têm silhuetas distintas entre si', () => {
    const ids = Object.keys(KANJI_FRAMES) as (keyof typeof KANJI_FRAMES)[];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        expect(KANJI_FRAMES[ids[i]], `${ids[i]} vs ${ids[j]}`).not.toEqual(KANJI_FRAMES[ids[j]]);
      }
    }
  });
});

describe('orbes e aura das técnicas (TFX-01)', () => {
  it('o orbe Vermelho passa no parseSheet nos 3 tamanhos da carga (RED-02), com núcleo W e borda carmim t', () => {
    for (const size of RED_ORB_SIZES) {
      const sheet = parseSheet(`red-orb-${size}`, { orb: RED_ORB_FRAMES[size] }, PALETTE_KEYS);
      expect(sheet.width).toBe(size);
      expect(sheet.height).toBe(size);
      const colors = new Set(sheet.frames[0].cells.flat());
      expect(colors.has('W')).toBe(true);
      expect(colors.has('t')).toBe(true);
    }
  });

  it('os orbes de 8 e 12 texels têm W no centro e passam por T, R e t até a borda (RDA-02)', () => {
    for (const size of [8, 12] as const) {
      const cells = parseSheet(`red-orb-${size}`, { orb: RED_ORB_FRAMES[size] }, PALETTE_KEYS).frames[0].cells;
      const mid = Math.floor(size / 2);
      // Anda do centro para a direita: W -> T -> R -> t, nessa ordem de aparição.
      const order = cells[mid].slice(mid).filter((c): c is string => c !== null);
      const firstSeen = [...new Set(order)];
      expect(firstSeen, `${size}`).toEqual(['W', 'T', 'R', 't']);
      expect(order[order.length - 1], `${size}`).toBe('t');
    }
  });

  it('a rampa do orbe segue os raios W até 0,3, T até 0,55, R até 0,8 e t na borda (RDA-02)', () => {
    for (const size of [8, 12] as const) {
      const cells = parseSheet(`red-orb-${size}`, { orb: RED_ORB_FRAMES[size] }, PALETTE_KEYS).frames[0].cells;
      const center = (size - 1) / 2;
      const seen = new Set<string>();
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const r = Math.hypot(x - center, y - center) / (size / 2); // fração do raio do disco
          const expected = r <= 0.3 ? 'W' : r <= 0.55 ? 'T' : r <= 0.8 ? 'R' : r <= 1 ? 't' : null;
          expect(cells[y][x], `${size} (${x},${y}) r=${r.toFixed(3)}`).toBe(expected);
          if (expected) seen.add(expected);
        }
      }
      // Os quatro anéis existem de fato nesse tamanho (a rampa não degenerou).
      expect([...seen].sort(), `${size}`).toEqual(['R', 'T', 'W', 't']);
    }
  });

  it('nenhum frame do orbe Vermelho contém a nem A (RDA-03)', () => {
    for (const size of RED_ORB_SIZES) {
      const colors = new Set(
        parseSheet(`red-orb-${size}`, { orb: RED_ORB_FRAMES[size] }, PALETTE_KEYS).frames[0].cells.flat(),
      );
      expect(colors.has('a'), `${size}`).toBe(false);
      expect(colors.has('A'), `${size}`).toBe(false);
    }
  });

  it('todas as chaves de RED_FX_COLORS estão em {b, t, T, R, W} e existem na paleta (RDA-03, RDA-14)', () => {
    const allowed = new Set(['b', 't', 'T', 'R', 'W']);
    const keys = Object.values(RED_FX_COLORS).flat();
    expect(keys.length).toBeGreaterThan(0);
    for (const k of keys) {
      expect(allowed.has(k), k).toBe(true);
      expect(PALETTE_KEYS.has(k), k).toBe(true);
    }
  });

  it('o orbe Vermelho é um disco: o canto do quadro é transparente em todo tamanho (RED-02)', () => {
    for (const size of RED_ORB_SIZES) {
      const cells = parseSheet(`red-orb-${size}`, { orb: RED_ORB_FRAMES[size] }, PALETTE_KEYS).frames[0].cells;
      expect(cells[0][0], `${size}`).toBeNull();
      expect(cells[0][size - 1], `${size}`).toBeNull();
      expect(cells[size - 1][0], `${size}`).toBeNull();
      expect(cells[size - 1][size - 1], `${size}`).toBeNull();
      // O centro (a região mais quente) é sempre W, nunca R (não é um preenchimento uniforme).
      const mid = Math.floor(size / 2);
      expect(cells[mid][mid], `${size}`).toBe('W');
    }
  });

  it('o orbe Azul passa no parseSheet, com núcleo d, anel C e borda clara W', () => {
    const sheet = parseSheet('blue-orb', { orb: BLUE_ORB_FRAME }, PALETTE_KEYS);
    const colors = new Set(sheet.frames[0].cells.flat());
    expect(colors.has('d')).toBe(true);
    expect(colors.has('C')).toBe(true);
    expect(colors.has('W')).toBe(true);
  });

  it('o orbe Azul é um disco: o canto do quadro é transparente e o centro é o núcleo d', () => {
    const cells = parseSheet('blue-orb', { orb: BLUE_ORB_FRAME }, PALETTE_KEYS).frames[0].cells;
    const size = BLUE_ORB_FRAME.length;
    expect(cells[0][0]).toBeNull();
    expect(cells[0][size - 1]).toBeNull();
    expect(cells[size - 1][0]).toBeNull();
    expect(cells[size - 1][size - 1]).toBeNull();
    const mid = Math.floor(size / 2);
    expect(cells[mid][mid]).toBe('d');
  });

  it('a chama da aura tem 2 frames por cor, do mesmo tamanho, que não são idênticos (cintilam)', () => {
    const sheet = parseSheet('aura', AURA_FRAMES, PALETTE_KEYS);
    for (const color of ['blue', 'red', 'white', 'purple'] as const) {
      expect(AURA_FRAMES[`${color}-a`], color).not.toEqual(AURA_FRAMES[`${color}-b`]);
    }
    expect(sheet.frames).toHaveLength(8);
  });

  it('as faíscas das técnicas passam no parseSheet só com cores da paleta', () => {
    const sheet = parseSheet('tech-sparks', TECH_SPARK_FRAMES, PALETTE_KEYS);
    expect(sheet.frames).toHaveLength(3);
  });

  it('a faísca redOut do Vermelho não usa a nem A, só t, T e R (RDA-03, RDA-14)', () => {
    const cells = parseSheet('tech-sparks', TECH_SPARK_FRAMES, PALETTE_KEYS).frames.find(
      (f) => f.key === 'redOut',
    )!.cells;
    const colors = new Set(cells.flat().filter((c): c is string => c !== null));
    expect(colors.has('a')).toBe(false);
    expect(colors.has('A')).toBe(false);
    expect([...colors].every((c) => ['t', 'T', 'R'].includes(c))).toBe(true);
  });
});

describe('ponta dos dedos do Vermelho por frame (RDA-04)', () => {
  const FRAMES = ['vermelho-sign', 'vermelho-charge', 'vermelho-release'] as const;
  const originCol = PLAYER_ORIGIN.x * PLAYER_FRAME_W;

  it.each(FRAMES)('%s: o pixel devolvido é R e é o de maior coluna entre todos os R do frame', (name) => {
    const rows = PLAYER_TECH_FRAMES[name];
    const { col, row } = redFingertip(name);
    expect(rows[row][col]).toBe('R');
    let maxCol = -1;
    rows.forEach((line) =>
      [...line].forEach((ch, c) => {
        if (ch === 'R') maxCol = Math.max(maxCol, c);
      }),
    );
    expect(col).toBe(maxCol);
  });

  it('a ponta avança com o braço: sign < charge < release em coluna', () => {
    expect(redFingertip('vermelho-sign').col).toBeLessThan(redFingertip('vermelho-charge').col);
    expect(redFingertip('vermelho-charge').col).toBeLessThan(redFingertip('vermelho-release').col);
  });

  it.each(FRAMES)('%s: o deslocamento em px usa a origem e a escala, e espelha em x com facing -1', (name) => {
    const { col, row } = redFingertip(name);
    const right = fingertipOffsetPx(name, 1);
    const left = fingertipOffsetPx(name, -1);
    expect(right).toEqual({ x: (col - originCol) * ART_SCALE, y: (row - PLAYER_FRAME_H) * ART_SCALE });
    expect(left.x).toBe(-right.x);
    expect(left.y).toBe(right.y);
    expect(right.x).toBeGreaterThan(0);
  });

  it('um frame que não é do Vermelho lança erro', () => {
    expect(() => redFingertip('azul-charge')).toThrow(/azul-charge/);
  });
});
