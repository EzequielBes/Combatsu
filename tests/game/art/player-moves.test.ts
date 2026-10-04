import { describe, expect, it } from 'vitest';
import { TRANSPARENT, parseSheet } from '../../../src/core/pixelGrid';
// Importar no Vitest (Node, sem window) já prova que a paleta não carrega o `phaser` como valor.
import { PALETTE_KEYS } from '../../../src/game/art/palette';
import {
  PLAYER_FRAMES,
  armStraight,
  legStraight,
  PLAYER_FRAME_H,
  PLAYER_TOP_PAD,
  PLAYER_FRAME_W,
} from '../../../src/game/art/sprites/player';
import { PLAYER_MOVE_FRAMES } from '../../../src/game/art/sprites/playerMoves';
import { PLAYER_TECH_FRAMES } from '../../../src/game/art/sprites/playerTech';
import { MOVE_NAMES } from '../../../src/data/moves';
import { artMeasure } from './helpers';

describe('braço e perna esticados do player com antebraço e canela finos (LMB-01..03, EDG-01)', () => {
  const lens = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, i) => from + i);
  /** As 5 últimas colunas são a ponta do membro: contorno do pulso ou tornozelo, punho ou pé (3) e contorno da ponta. */
  const TIP_COLS = 5;
  /** Maior sequência de colunas seguidas com perfil até `max`, antes da ponta. */
  const thinRunBeforeTip = (profile: number[], max: number): number => {
    let best = 0;
    let run = 0;
    for (let x = 0; x < profile.length - TIP_COLS; x++) {
      run = profile[x] <= max ? run + 1 : 0;
      best = Math.max(best, run);
    }
    return best;
  };

  it.each(lens(9, 22))(
    'LMB-01: com len %i, braço e perna têm 5 linhas, len colunas e texel opaco na última coluna',
    (len) => {
      for (const [name, part] of [
        ['armStraight', armStraight(len)],
        ['legStraight', legStraight(len)],
      ] as const) {
        expect(part, name).toHaveLength(5);
        expect(Math.max(...part.map((row) => row.length)), name).toBe(len);
        expect(artMeasure.profile(part)[len - 1], name).toBeGreaterThanOrEqual(1);
      }
    },
  );

  it.each(lens(12, 22))(
    'LMB-02: armStraight(%i) tem 3+ colunas seguidas de perfil até 4 antes do punho e 1+ coluna de perfil 5 entre as 5 últimas',
    (len) => {
      const profile = artMeasure.profile(armStraight(len));
      expect(thinRunBeforeTip(profile, 4)).toBeGreaterThanOrEqual(3);
      expect(profile.slice(len - 5).filter((p) => p === 5).length).toBeGreaterThanOrEqual(1);
    },
  );

  it.each(lens(12, 22))(
    'LMB-03: legStraight(%i) tem 3+ colunas seguidas de perfil até 4 antes do pé e 2+ colunas de perfil 5 entre as 6 últimas',
    (len) => {
      const profile = artMeasure.profile(legStraight(len));
      expect(thinRunBeforeTip(profile, 4)).toBeGreaterThanOrEqual(3);
      expect(profile.slice(len - 6).filter((p) => p === 5).length).toBeGreaterThanOrEqual(2);
    },
  );

  it.each(lens(9, 11))('EDG-01: armStraight(%i) não afina: toda coluna antes do punho tem perfil 5', (len) => {
    const profile = artMeasure.profile(armStraight(len));
    expect(profile.slice(0, len - TIP_COLS)).toEqual(Array<number>(len - TIP_COLS).fill(5));
  });
});

describe('chute alto saindo do quadril (LMB-07, LMB-08)', () => {
  const rows = PLAYER_MOVE_FRAMES['chuteAlto-hit'];

  it('LMB-07: nenhum texel de uniforme (s, N, n, o) fica nas linhas 0 a 6 à esquerda da coluna 20', () => {
    for (let y = 0; y <= 6; y++) {
      for (let x = 0; x < 20; x++) expect('sNno'.includes(rows[y][x]), `(${x}, ${y}) = ${rows[y][x]}`).toBe(false);
    }
  });

  it('LMB-08: a ponta do pé continua na coluna 31, numa linha de 2 a 6 (mais a folga do topo)', () => {
    expect(artMeasure.box(rows)[2]).toBe(31);
    const tipRows = rows.map((row, y) => (row[31] !== TRANSPARENT ? y : -1)).filter((y) => y >= 0);
    expect(tipRows.length).toBeGreaterThan(0);
    for (const y of tipRows) {
      expect(y).toBeGreaterThanOrEqual(2 + PLAYER_TOP_PAD);
      expect(y).toBeLessThanOrEqual(6 + PLAYER_TOP_PAD);
    }
  });
});

describe('golpes derivados no formato novo (LMB-09, LMB-10, LMB-11)', () => {
  it('LMB-09: a palmaExplosiva-hit tem exatamente 2 texels A à direita da coluna 20 (o brilho da palma)', () => {
    const beyond = PLAYER_MOVE_FRAMES['palmaExplosiva-hit'].map((row) => row.slice(21));
    expect(artMeasure.countOf(beyond, 'A')).toBe(2);
  });

  it('LMB-10: a cotovelada-hit termina em ponta: a ponta do frame fica na coluna 23 e tem 1 texel opaco', () => {
    const rows = PLAYER_MOVE_FRAMES['cotovelada-hit'];
    const tip = artMeasure.box(rows)[2];
    expect(tip).toBe(23);
    expect(rows.filter((row) => row[tip] !== TRANSPARENT)).toHaveLength(1);
  });

  it('LMB-11: o pisao-hit tem a sola do sapato: pelo menos 3 texels s na linha 22 (mais a folga do topo)', () => {
    expect(artMeasure.countOf([PLAYER_MOVE_FRAMES['pisao-hit'][22 + PLAYER_TOP_PAD]], 's')).toBeGreaterThanOrEqual(3);
  });
});

describe('frames dos golpes do chão (MOV-14, T8)', () => {
  // `jab` já existe em PLAYER_FRAMES (feature anterior); os outros 12 vêm de PLAYER_MOVE_FRAMES (T8).
  const GROUND_MOVES = [
    'jab',
    'direto',
    'gancho',
    'cotovelada',
    'chuteFrontal',
    'chuteAlto',
    'joelhada',
    'chuteGiratorio',
    'socoBaixo',
    'rasteira',
    'ganchoAscendente',
    'chuteEmpurrao',
    'chuteCarregado',
  ] as const;
  const ALL_FRAMES = { ...PLAYER_FRAMES, ...PLAYER_MOVE_FRAMES };
  const sheet = parseSheet('player+moves', ALL_FRAMES, PALETTE_KEYS);

  it('passa no parseSheet só com cores da paleta, todo frame 32x24 texels', () => {
    expect(sheet.width).toBe(PLAYER_FRAME_W);
    expect(sheet.height).toBe(PLAYER_FRAME_H);
  });

  it('cada um dos 13 golpes do chão tem os frames wind, hit e recover', () => {
    for (const move of GROUND_MOVES) {
      for (const part of ['wind', 'hit', 'recover']) {
        expect(Object.hasOwn(ALL_FRAMES, `${move}-${part}`), `${move}-${part}`).toBe(true);
      }
    }
  });

  it('os 3 frames de cada golpe são distintos entre si', () => {
    for (const move of GROUND_MOVES) {
      const wind = ALL_FRAMES[`${move}-wind`];
      const hit = ALL_FRAMES[`${move}-hit`];
      const recover = ALL_FRAMES[`${move}-recover`];
      expect(wind, `${move}: wind vs hit`).not.toEqual(hit);
      expect(hit, `${move}: hit vs recover`).not.toEqual(recover);
      expect(wind, `${move}: wind vs recover`).not.toEqual(recover);
    }
  });

  it('nenhum frame novo de PLAYER_MOVE_FRAMES repete um nome já usado por PLAYER_FRAMES ou PLAYER_TECH_FRAMES', () => {
    for (const key of Object.keys(PLAYER_MOVE_FRAMES)) {
      expect(Object.hasOwn(PLAYER_FRAMES, key), key).toBe(false);
      expect(Object.hasOwn(PLAYER_TECH_FRAMES, key), key).toBe(false);
    }
  });
});

describe('frames aéreos, de defesa e de status (MOV-14, T9)', () => {
  const AIR_MOVES = ['socoAereo', 'voadora', 'pisao', 'palmaExplosiva'] as const;
  const STATUS_FRAMES = ['guard', 'parry', 'dodge-0', 'dodge-1', 'stunned-0', 'stunned-1'] as const;
  const sheet = parseSheet('player-moves-air', PLAYER_MOVE_FRAMES, PALETTE_KEYS);

  it('passa no parseSheet só com cores da paleta, todo frame 32x24 texels', () => {
    expect(sheet.width).toBe(PLAYER_FRAME_W);
    expect(sheet.height).toBe(PLAYER_FRAME_H);
  });

  it('cada um dos golpes aéreos e a palma têm os frames wind, hit e recover, distintos entre si', () => {
    for (const move of AIR_MOVES) {
      const wind = PLAYER_MOVE_FRAMES[`${move}-wind`];
      const hit = PLAYER_MOVE_FRAMES[`${move}-hit`];
      const recover = PLAYER_MOVE_FRAMES[`${move}-recover`];
      expect(wind, `${move}-wind`).toBeDefined();
      expect(hit, `${move}-hit`).toBeDefined();
      expect(recover, `${move}-recover`).toBeDefined();
      expect(wind, `${move}: wind vs hit`).not.toEqual(hit);
      expect(hit, `${move}: hit vs recover`).not.toEqual(recover);
      expect(wind, `${move}: wind vs recover`).not.toEqual(recover);
    }
  });

  it('guard, parry, dodge-0/1 e stunned-0/1 existem, 32x24 texels só com cores da paleta', () => {
    for (const name of STATUS_FRAMES) {
      expect(Object.hasOwn(PLAYER_MOVE_FRAMES, name), name).toBe(true);
      const frame = sheet.frames.find((f) => f.key === name)!;
      expect(frame.cells.length, name).toBe(PLAYER_FRAME_H);
      expect(frame.cells[0].length, name).toBe(PLAYER_FRAME_W);
    }
  });

  it('guard e parry são posturas distintas; dodge-0/1 e stunned-0/1 diferem entre si', () => {
    expect(PLAYER_MOVE_FRAMES.guard).not.toEqual(PLAYER_MOVE_FRAMES.parry);
    expect(PLAYER_MOVE_FRAMES['dodge-0']).not.toEqual(PLAYER_MOVE_FRAMES['dodge-1']);
    expect(PLAYER_MOVE_FRAMES['stunned-0']).not.toEqual(PLAYER_MOVE_FRAMES['stunned-1']);
  });
});

describe('frames do abaixar e dos Contras (CNT-17, T9 da combate-mestre)', () => {
  const COUNTER_MOVES = ['contra', 'contraGancho'] as const;
  const NEW_FRAMES = [
    'duck',
    'contra-wind',
    'contra-hit',
    'contra-recover',
    'contraGancho-wind',
    'contraGancho-hit',
    'contraGancho-recover',
  ] as const;
  const topRow = (rows: readonly string[]): number => rows.findIndex((r) => [...r].some((c) => c !== TRANSPARENT));

  it('os 7 frames existem em PLAYER_MOVE_FRAMES (CNT-17)', () => {
    for (const name of NEW_FRAMES) expect(Object.hasOwn(PLAYER_MOVE_FRAMES, name), name).toBe(true);
  });

  it('passam no parseSheet só com cores da paleta, no tamanho dos outros frames (32x24 texels)', () => {
    const subset = Object.fromEntries(NEW_FRAMES.map((n) => [n, PLAYER_MOVE_FRAMES[n]]));
    const sheet = parseSheet('player-moves-counter', subset, PALETTE_KEYS);
    expect(sheet.frames).toHaveLength(7);
    expect(sheet.width).toBe(PLAYER_FRAME_W);
    expect(sheet.height).toBe(PLAYER_FRAME_H);
  });

  it('todo golpe de MOVE_NAMES tem os frames wind, hit e recover na folha do jogador (MOV-14)', () => {
    const all = { ...PLAYER_FRAMES, ...PLAYER_MOVE_FRAMES };
    expect(MOVE_NAMES).toEqual(expect.arrayContaining(['contra', 'contraGancho']));
    for (const move of MOVE_NAMES) {
      for (const part of ['wind', 'hit', 'recover'])
        expect(Object.hasOwn(all, `${move}-${part}`), `${move}-${part}`).toBe(true);
    }
  });

  it('as 3 fases de cada Contra são distintas entre si (golpe legível)', () => {
    for (const move of COUNTER_MOVES) {
      const wind = PLAYER_MOVE_FRAMES[`${move}-wind`];
      const hit = PLAYER_MOVE_FRAMES[`${move}-hit`];
      const recover = PLAYER_MOVE_FRAMES[`${move}-recover`];
      expect(wind, `${move}: wind vs hit`).not.toEqual(hit);
      expect(hit, `${move}: hit vs recover`).not.toEqual(recover);
      expect(wind, `${move}: wind vs recover`).not.toEqual(recover);
    }
  });

  it('o topo opaco do duck fica pelo menos 3 texels abaixo do topo do idle-0', () => {
    expect(topRow(PLAYER_MOVE_FRAMES.duck) - topRow(PLAYER_FRAMES['idle-0'])).toBeGreaterThanOrEqual(3);
  });
});
