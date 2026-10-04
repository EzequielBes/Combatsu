// Invariantes da arte do feel (impacto-amaldiçoado, fase de poses): POS-01..06 e POS-10 sobre os frames do player.
import { describe, expect, it } from 'vitest';
import { topRowOf } from '../../src/core/frameInvariants';
import { PLAYER_FRAMES, PLAYER_FRAME_H, PLAYER_ORIGIN } from '../../src/game/art/sprites/player';
import { PLAYER_MOVE_FRAMES } from '../../src/game/art/sprites/playerMoves';
import { PLAYER_TECH_FRAMES } from '../../src/game/art/sprites/playerTech';

const ALL: Record<string, readonly string[]> = { ...PLAYER_FRAMES, ...PLAYER_MOVE_FRAMES, ...PLAYER_TECH_FRAMES };
const HAIR = ['h', 'H', 'j'];

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
    const REDRAWN = new Set<string>(); // ganchoAscendente-*, contraGancho-* entram aqui na T10
    for (const [name, rows] of Object.entries(ALL)) {
      if (REDRAWN.has(name)) continue;
      for (let r = 0; r < 6; r++) expect(rows[r], `${name} linha ${r}`).toBe('.'.repeat(32));
    }
  });

  it('as 6 linhas novas do topo de idle-0 estão vazias', () => {
    for (let r = 0; r < 6; r++) expect(ALL['idle-0'][r], `linha ${r}`).toBe('.'.repeat(32));
  });
});
