// Invariantes da arte do feel (impacto-amaldiçoado, fase de poses): POS-01..06 e POS-10 sobre os frames do player.
import { describe, expect, it } from 'vitest';
import { isOpaque, topRowOf } from '../../src/core/frameInvariants';
import { PLAYER_FRAMES, PLAYER_FRAME_H, PLAYER_FRAME_W, PLAYER_ORIGIN } from '../../src/game/art/sprites/player';
import { PLAYER_MOVE_FRAMES } from '../../src/game/art/sprites/playerMoves';
import { PLAYER_TECH_FRAMES } from '../../src/game/art/sprites/playerTech';

const ALL: Record<string, readonly string[]> = { ...PLAYER_FRAMES, ...PLAYER_MOVE_FRAMES, ...PLAYER_TECH_FRAMES };
const HAIR = ['h', 'H', 'j'];
const ORIGIN_COL = PLAYER_ORIGIN.x * PLAYER_FRAME_W;

const lastOpaqueRow = (rows: readonly string[]): number => {
  let last = -1;
  rows.forEach((row, y) => {
    if ([...row].some((c) => c !== '.')) last = y;
  });
  return last;
};

describe('folga de 6 linhas no topo do frame do player (POS-05, POS-10)', () => {
  it('a altura do frame é 30 e a origem continua no pé', () => {
    expect(PLAYER_FRAME_H).toBe(30);
    expect(PLAYER_ORIGIN.y).toBe(1);
  });

  it('todo frame do player, dos golpes e das técnicas tem 30 linhas de 32 colunas', () => {
    for (const [name, rows] of Object.entries(ALL)) {
      expect(rows.length, name).toBe(30);
      for (const row of rows) expect(row.length, name).toBe(32);
    }
  });

  it('o pé de idle-0 não muda de lugar no mundo: a última linha opaca é a última do frame, como era com 24 linhas', () => {
    expect(lastOpaqueRow(ALL['idle-0'])).toBe(PLAYER_FRAME_H - 1);
  });

  it('a cabeça de idle-0 continua à mesma altura do pé: o topo do cabelo está 22 linhas acima da linha do pé, como era', () => {
    // Antes: cabelo na linha 1 de 24 (pé na 23), ou seja, 22 linhas acima. Agora: linha 7 de 30 (pé na 29).
    expect(topRowOf(ALL['idle-0'], HAIR)).toBe(7);
    expect(PLAYER_FRAME_H - 1 - topRowOf(ALL['idle-0'], HAIR)!).toBe(22);
  });

  it('nenhum frame pré-existente usa a folga: as 6 linhas do topo de todos estão vazias até um frame ser redesenhado para usá-la', () => {
    // Só os frames redesenhados para usar a folga ficam de fora: o gancho ascendente e o contra-gancho.
    for (const [name, rows] of Object.entries(ALL)) {
      if (/^(ganchoAscendente|contraGancho)-/.test(name)) continue;
      for (let r = 0; r < 6; r++) expect(rows[r], `${name} linha ${r}`).toBe('.'.repeat(32));
    }
  });

  it('as 6 linhas novas do topo de idle-0 estão vazias', () => {
    for (let r = 0; r < 6; r++) expect(ALL['idle-0'][r], `linha ${r}`).toBe('.'.repeat(32));
  });
});

// Ponto de golpe provisório (coluna e linha do frame) do punho nos frames `-hit` do gancho. A T13 cria `STRIKE_POINTS`
// com o valor definitivo; até lá estes valores marcam o centro do punho.
const UPPERCUT_POINT: Record<string, { col: number; row: number }> = {
  'ganchoAscendente-hit': { col: 21, row: 5 },
  'contraGancho-hit': { col: 21, row: 5 },
};
const HAIR_TOP_IDLE = topRowOf(ALL['idle-0'], HAIR)!;
/** POS-05: o ponto fica acima do topo do cabelo de idle-0. */
const aboveHead = (pt: { row: number }): boolean => pt.row < HAIR_TOP_IDLE;
/** POS-10: o ponto fica pelo menos 6 texels à frente da coluna da origem. */
const inFront = (pt: { col: number }): boolean => pt.col - ORIGIN_COL >= 6;

describe('gancho ascendente: o punho passa da cabeça e vai à frente (POS-05, POS-10)', () => {
  it('os limiares valem nos dois lados: a linha do cabelo e a coluna 6 à frente da origem', () => {
    expect(HAIR_TOP_IDLE).toBe(7);
    expect(aboveHead({ row: 6 })).toBe(true);
    expect(aboveHead({ row: 7 })).toBe(false);
    expect(ORIGIN_COL).toBe(10);
    expect(inFront({ col: 16 })).toBe(true);
    expect(inFront({ col: 15 })).toBe(false);
  });

  it.each(Object.keys(UPPERCUT_POINT))('%s: o ponto de golpe é um texel opaco do punho (pele) do frame', (name) => {
    const { col, row } = UPPERCUT_POINT[name];
    expect(isOpaque(ALL[name], col, row), name).toBe(true);
    expect('pP').toContain(ALL[name][row][col]);
  });

  it.each(Object.keys(UPPERCUT_POINT))('%s: o ponto de golpe fica acima do topo do cabelo de idle-0 (POS-05)', (name) => {
    expect(aboveHead(UPPERCUT_POINT[name]), name).toBe(true);
  });

  it.each(Object.keys(UPPERCUT_POINT))('%s: o ponto de golpe fica 6 texels ou mais à frente da origem (POS-10)', (name) => {
    expect(inFront(UPPERCUT_POINT[name]), name).toBe(true);
  });

  it.each(Object.keys(UPPERCUT_POINT))('%s: o punho está acima do cabelo do próprio frame, não colado ao rosto', (name) => {
    const rows = ALL[name];
    const { col, row } = UPPERCUT_POINT[name];
    const ownHairTop = topRowOf(rows, HAIR)!;
    expect(row, name).toBeLessThan(ownHairTop);
    // O punho (pele) começa pelo menos 1 linha acima do cabelo, na coluna do ponto.
    const fistTop = rows.findIndex((r) => 'pP'.includes(r[col]));
    expect(fistTop, name).toBeGreaterThanOrEqual(0);
    expect(fistTop, name).toBeLessThan(ownHairTop - 1);
  });
});
