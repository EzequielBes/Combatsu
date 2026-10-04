// Invariantes da arte do feel (impacto-amaldiçoado, fase de poses): POS-01..06 e POS-10 sobre os frames do player.
import { describe, expect, it } from 'vitest';
import { strikeToBody } from '../../src/core/strikePath';
import { MOVES } from '../../src/data/moves';
import { SIZE } from '../../src/game/textures';
import {
  headLeftCol,
  isOpaque,
  isSingleComponent,
  thighShinHeights,
  topRowOf,
  touchesBottom,
} from '../../src/core/frameInvariants';
import { PLAYER_FRAMES, PLAYER_FRAME_H, PLAYER_FRAME_W, PLAYER_ORIGIN } from '../../src/game/art/sprites/player';
import { STRIKE_POINTS } from '../../src/game/art/sprites/strikePoints';
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

// Ponto de golpe oficial (T13) do punho nos frames `-hit` do gancho.
const UPPERCUT_POINT: Record<string, { col: number; row: number }> = {
  'ganchoAscendente-hit': STRIKE_POINTS['ganchoAscendente-hit'],
  'contraGancho-hit': STRIKE_POINTS['contraGancho-hit'],
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

  it.each(Object.keys(UPPERCUT_POINT))(
    '%s: o ponto de golpe fica acima do topo do cabelo de idle-0 (POS-05)',
    (name) => {
      expect(aboveHead(UPPERCUT_POINT[name]), name).toBe(true);
    },
  );

  it.each(Object.keys(UPPERCUT_POINT))(
    '%s: o ponto de golpe fica 6 texels ou mais à frente da origem (POS-10)',
    (name) => {
      expect(inFront(UPPERCUT_POINT[name]), name).toBe(true);
    },
  );

  it.each(Object.keys(UPPERCUT_POINT))(
    '%s: o punho está acima do cabelo do próprio frame, não colado ao rosto',
    (name) => {
      const rows = ALL[name];
      const { col, row } = UPPERCUT_POINT[name];
      const ownHairTop = topRowOf(rows, HAIR)!;
      expect(row, name).toBeLessThan(ownHairTop);
      // O punho (pele) começa pelo menos 1 linha acima do cabelo, na coluna do ponto.
      const fistTop = rows.findIndex((r) => 'pP'.includes(r[col]));
      expect(fistTop, name).toBeGreaterThanOrEqual(0);
      expect(fistTop, name).toBeLessThan(ownHairTop - 1);
    },
  );
});

// ---------------------------------------------------------------- chutes (POS-02, POS-03, POS-06)

const KICKS = ['kick', 'chuteFrontal', 'chuteEmpurrao', 'chuteAlto', 'chuteCarregado'] as const;
const PHASES = ['wind', 'hit', 'recover'] as const;

describe('chutes: corpo inteiro e uma peça só (POS-02, POS-03)', () => {
  const frames = KICKS.flatMap((k) => PHASES.map((ph) => `${k}-${ph}`));

  it.each(frames)('%s: os texels opacos formam um componente só, 8-conexo (POS-02)', (name) => {
    expect(isSingleComponent(ALL[name]), name).toBe(true);
  });

  it.each(KICKS)('%s-hit: há texel opaco na última linha, o corpo toca o chão (POS-03)', (kick) => {
    expect(touchesBottom(ALL[`${kick}-hit`]), kick).toBe(true);
  });

  it.each(KICKS)(
    '%s-hit: a perna de apoio está plantada, com o pé na última linha, e não há linhas S soltas',
    (kick) => {
      const rows = ALL[`${kick}-hit`];
      expect(rows.join(''), kick).not.toContain('S');
    },
  );

  it.each(['kick', 'chuteFrontal', 'chuteEmpurrao'])('%s-wind e -recover também não têm linhas S soltas', (kick) => {
    expect(ALL[`${kick}-wind`].join('')).not.toContain('S');
    expect(ALL[`${kick}-recover`].join('')).not.toContain('S');
  });
});

describe('chutes: coxa mais grossa que a canela (POS-06)', () => {
  // Colunas de leitura, dentro da perna que bate e longe do quadril e do pé: uma na coxa e outra na canela.
  const LEG_BAND = { top: 14, bottom: 29 };
  const READ: Record<string, { thighCol: number; shinCol: number }> = {
    'kick-hit': { thighCol: 15, shinCol: 22 },
    'chuteFrontal-hit': { thighCol: 15, shinCol: 22 },
    'chuteEmpurrao-hit': { thighCol: 14, shinCol: 22 },
  };

  it('o limiar vale nos dois lados: 1 texel a mais passa, igual falha', () => {
    const thicker = (h: { thigh: number; shin: number }): boolean => h.thigh - h.shin >= 1;
    expect(thicker({ thigh: 6, shin: 5 })).toBe(true);
    expect(thicker({ thigh: 5, shin: 5 })).toBe(false);
  });

  it.each(Object.keys(READ))('%s: a coxa é pelo menos 1 texel mais alta que a canela e as duas existem', (name) => {
    const { thighCol, shinCol } = READ[name];
    const h = thighShinHeights(ALL[name], LEG_BAND, thighCol, shinCol);
    expect(h.shin, name).toBeGreaterThan(0);
    expect(h.thigh - h.shin, name).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------- pulo (POS-02, POS-04)

const JUMP_SEQ = ['idle-0', 'jump-0', 'jump-1', 'apex-0', 'fall-0', 'fall-1', 'land-0', 'land-1'] as const;

describe('pulo: a cabeça não salta de coluna e o corpo é uma peça só (POS-02, POS-04)', () => {
  it('o limiar vale nos dois lados: diferença de 1 coluna passa, de 2 falha', () => {
    const ok = (a: number, b: number): boolean => Math.abs(a - b) <= 1;
    expect(ok(6, 7)).toBe(true);
    expect(ok(6, 8)).toBe(false);
  });

  it('a coluna mais à esquerda do cabelo difere no máximo 1 entre frames consecutivos da sequência', () => {
    const cols = JUMP_SEQ.map((n) => headLeftCol(ALL[n], HAIR));
    cols.forEach((c, i) => expect(c, JUMP_SEQ[i]).not.toBeNull());
    for (let i = 1; i < cols.length; i++) {
      expect(Math.abs(cols[i]! - cols[i - 1]!), `${JUMP_SEQ[i - 1]} -> ${JUMP_SEQ[i]}`).toBeLessThanOrEqual(1);
    }
  });

  it.each(JUMP_SEQ)('%s: os texels opacos formam um componente só, 8-conexo (POS-02)', (name) => {
    expect(isSingleComponent(ALL[name]), name).toBe(true);
  });
});

// ---------------------------------------------------------------- pontos de golpe (TRL-01, TRL-02, POS-01)

/** Hitbox de `kick`, que não está em `MOVES`: a mesma do chute frontal. */
const KICK_BOX = { offsetX: 26, offsetY: 6, width: 32, height: 20 };
const STRIKE_MOVES = [...Object.keys(MOVES), ...('kick' in MOVES ? [] : ['kick'])];
const STRIKE_FRAMES = STRIKE_MOVES.flatMap((m) => [`${m}-wind`, `${m}-hit`]);
const FRAME_ORIGIN = { originCol: ORIGIN_COL, rows: PLAYER_FRAME_H };

/** O ponto (px relativos ao centro do corpo) cai dentro do retângulo da hitbox expandido em `pad` px de cada lado. */
const insideBox = (
  p: { x: number; y: number },
  box: { offsetX: number; offsetY: number; width: number; height: number },
  pad: number,
): boolean => Math.abs(p.x - box.offsetX) <= box.width / 2 + pad && Math.abs(p.y - box.offsetY) <= box.height / 2 + pad;

describe('STRIKE_POINTS (TRL-01, TRL-02, POS-01)', () => {
  it('a folga de 4 px vale nos dois lados da borda', () => {
    const box = { offsetX: 20, offsetY: 0, width: 20, height: 20 };
    expect(insideBox({ x: 34, y: 0 }, box, 4)).toBe(true);
    expect(insideBox({ x: 35, y: 0 }, box, 4)).toBe(false);
  });

  it('todo frame -wind e -hit dos golpes de MOVES, jab e kick tem ponto de golpe (TRL-01)', () => {
    for (const name of STRIKE_FRAMES) {
      expect(ALL[name], `frame ${name}`).toBeDefined();
      expect(STRIKE_POINTS[name], name).toBeDefined();
    }
  });

  it('não sobra ponto de golpe sem frame correspondente', () => {
    for (const name of Object.keys(STRIKE_POINTS)) expect(STRIKE_FRAMES, name).toContain(name);
  });

  it.each(STRIKE_FRAMES)('%s: o ponto de golpe é um texel opaco do frame (TRL-02)', (name) => {
    const { col, row } = STRIKE_POINTS[name];
    expect(isOpaque(ALL[name], col, row), name).toBe(true);
  });

  it.each(STRIKE_MOVES)('%s-hit: o ponto de golpe fica dentro da hitbox + 4 px (POS-01)', (move) => {
    const box = MOVES[move]?.hitbox ?? KICK_BOX;
    const p = strikeToBody(STRIKE_POINTS[`${move}-hit`], SIZE.player.h, FRAME_ORIGIN);
    expect(insideBox(p, box, 4), `${move}-hit em (${p.x}, ${p.y})`).toBe(true);
  });
});

// ---------------------------------------------------------------- varredura de todos os golpes (POS-02, POS-03)

const SWEEP_FRAMES = STRIKE_MOVES.flatMap((m) => ['wind', 'hit', 'recover'].map((ph) => `${m}-${ph}`));
/** POS-03 não vale para golpe aéreo (`input` press com `air: true`). */
const isAirPress = (move: string): boolean => {
  const input = MOVES[move]?.input;
  return input?.via === 'press' && input.air === true;
};

describe('varredura: todo golpe de MOVES, jab e kick (POS-02, POS-03)', () => {
  it.each(SWEEP_FRAMES)('%s existe e os texels opacos formam um componente só (POS-02)', (name) => {
    expect(ALL[name], name).toBeDefined();
    expect(isSingleComponent(ALL[name]), name).toBe(true);
  });

  it.each(STRIKE_MOVES.filter((m) => !isAirPress(m)))('%s-hit: há texel opaco na última linha (POS-03)', (move) => {
    expect(touchesBottom(ALL[`${move}-hit`]), move).toBe(true);
  });

  it('os golpes aéreos ficam fora do POS-03: socoAereo, voadora e pisao', () => {
    expect(STRIKE_MOVES.filter(isAirPress).sort()).toEqual(['pisao', 'socoAereo', 'voadora']);
  });
});

describe('pisão: o corpo tem pernas visíveis abaixo do cinto em toda a sequência', () => {
  it.each(['wind', 'hit', 'recover'])('pisao-%s tem texels opacos nas linhas 24 em diante (as pernas)', (phase) => {
    const legs = ALL[`pisao-${phase}`].slice(24).join('');
    expect(
      [...legs].some((c) => c !== '.'),
      phase,
    ).toBe(true);
  });
});
