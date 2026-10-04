import { describe, expect, it } from 'vitest';
import { PLAYER_ANIMS, PLAYER_FRAMES, PLAYER_FRAME_H, clippedOf, composeWithStats, type Grid } from '../../src/game/art/sprites/player';
import { PLAYER_MOVE_FRAMES } from '../../src/game/art/sprites/playerMoves';
import { PLAYER_TECH_FRAMES, WRIST_GRIP, WRIST_GRIP_AT } from '../../src/game/art/sprites/playerTech';

const ALL: Record<string, readonly string[]> = { ...PLAYER_FRAMES, ...PLAYER_MOVE_FRAMES, ...PLAYER_TECH_FRAMES };
const frame = (name: string): readonly string[] => {
  const f = ALL[name];
  expect(f, `frame ${name} existe`).toBeDefined();
  return f;
};

/** Limite do salto do centro do uniforme entre frames seguidos (SPF-03); o defeito do giratório era de ~11. */
const SPF03_MAX = 8;

/** Tamanhos dos componentes 8-conexos de pixels opacos, sem contar `S` (rastro de movimento, SPR-14). */
function componentSizes(rows: readonly string[]): number[] {
  const opaque = (x: number, y: number): boolean => {
    const c = rows[y]?.[x];
    return c !== undefined && c !== '.' && c !== 'S';
  };
  const seen = new Set<string>();
  const sizes: number[] = [];
  rows.forEach((row, y) =>
    [...row].forEach((_, x) => {
      if (!opaque(x, y) || seen.has(`${x},${y}`)) return;
      let size = 0;
      const stack: Array<[number, number]> = [[x, y]];
      seen.add(`${x},${y}`);
      while (stack.length) {
        const [cx, cy] = stack.pop()!;
        size++;
        for (let dx = -1; dx <= 1; dx++)
          for (let dy = -1; dy <= 1; dy++) {
            const k = `${cx + dx},${cy + dy}`;
            if (opaque(cx + dx, cy + dy) && !seen.has(k)) {
              seen.add(k);
              stack.push([cx + dx, cy + dy]);
            }
          }
      }
      sizes.push(size);
    }),
  );
  return sizes;
}

/** Coluna média dos pixels de uniforme (`n`, `N`, `o`). */
function uniformCenter(rows: readonly string[]): number {
  let sum = 0;
  let count = 0;
  rows.forEach((row) => [...row].forEach((c, x) => { if (c === 'n' || c === 'N' || c === 'o') { sum += x; count++; } }));
  return sum / count;
}

/** Altura opaca (linhas entre a primeira e a última com pixel). */
function opaqueHeight(rows: readonly string[]): number {
  const filled = rows.map((r, y) => ([...r].some((c) => c !== '.') ? y : -1)).filter((y) => y >= 0);
  return filled[filled.length - 1] - filled[0] + 1;
}

describe('compose conta pixels opacos cortados (SPF-02)', () => {
  const part: Grid = ['kkk', 'k.k'];

  it('uma parte com 3 pixels opacos em x = -1 gera clipped = 3', () => {
    const col: Grid = ['k', 'k', 'k'];
    expect(composeWithStats([col, -1, 5]).clipped).toBe(3);
  });

  it('uma parte inteira dentro da grade gera clipped = 0', () => {
    expect(composeWithStats([part, 4, 4]).clipped).toBe(0);
  });

  it('pixels transparentes fora da grade não contam, e os opacos fora de cima, de baixo e da direita contam', () => {
    expect(composeWithStats([['.k'], -1, 0]).clipped).toBe(0);
    expect(composeWithStats([['k'], 0, -1]).clipped).toBe(1);
    expect(composeWithStats([['k'], 0, 24]).clipped).toBe(1);
    expect(composeWithStats([['k'], 30, 0]).clipped).toBe(1);
    expect(composeWithStats([['k'], 29, 0]).clipped).toBe(0);
  });
});

describe('golpes sem salto, perna solta ou corte (SPF-01..04)', () => {
  const FIXED = [
    'chuteGiratorio-hit',
    'chuteGiratorio-wind',
    'chuteCarregado-wind',
    'chuteEmpurrao-hit',
    'ganchoAscendente-hit',
  ];

  it.each(FIXED)('%s: um componente só (SPF-01)', (name) => {
    expect(componentSizes(frame(name)), name).toHaveLength(1);
  });

  it.each(FIXED)('%s: nenhum pixel cortado (SPF-02)', (name) => {
    expect(clippedOf(frame(name)), name).toBe(0);
  });

  it('o centro do uniforme do chuteGiratorio-hit fica a até 4 texels da coluna 10 (SPF-04)', () => {
    expect(Math.abs(uniformCenter(frame('chuteGiratorio-hit')) - 10)).toBeLessThanOrEqual(4);
  });

  it.each(['chuteGiratorio', 'chuteCarregado'])('%s: o centro do uniforme muda até 8 texels entre fases (SPF-03)', (move) => {
    const seq = ['wind', 'hit', 'recover'].map((p) => uniformCenter(frame(`${move}-${p}`)));
    for (let i = 1; i < seq.length; i++) expect(Math.abs(seq[i] - seq[i - 1]), `${move} fase ${i}`).toBeLessThanOrEqual(SPF03_MAX);
  });
});

describe('pouso e pulo (SPF-01, SPF-02, SPF-05)', () => {
  it('a altura opaca de land-1 é menor ou igual à de idle-0 (SPF-05)', () => {
    expect(opaqueHeight(frame('land-1'))).toBeLessThanOrEqual(opaqueHeight(frame('idle-0')));
  });

  it('jump-0 tem um único componente e nenhum pixel cortado (SPF-01, SPF-02)', () => {
    expect(componentSizes(frame('jump-0'))).toHaveLength(1);
    expect(clippedOf(frame('jump-0'))).toBe(0);
  });
});

describe('mão do pulso no tom do braço de trás (SPF-06)', () => {
  // A área de desenho começa 2 colunas à direita do início do frame (FRAME_PAD).
  const FRAME_PAD = 2;

  it('nenhum pixel da região WRIST_GRIP no vermelho-charge usa a pele clara p', () => {
    const rows = frame('vermelho-charge');
    const region = WRIST_GRIP.map((_, dy) =>
      rows[WRIST_GRIP_AT.y + dy].slice(FRAME_PAD + WRIST_GRIP_AT.x, FRAME_PAD + WRIST_GRIP_AT.x + WRIST_GRIP[0].length),
    );
    expect(region.join('')).not.toContain('p');
    // A região tem a mão de verdade (não está vazia): pelo menos um pixel de pele da mão de trás (P).
    expect(region.join('')).toContain('P');
  });
});

describe('frames do abaixar e dos Contras: tronco alinhado e pés no chão (CNT-17, SPF-04)', () => {
  const NEW_FRAMES = [
    'duck',
    'contra-wind',
    'contra-hit',
    'contra-recover',
    'contraGancho-wind',
    'contraGancho-hit',
    'contraGancho-recover',
  ];
  /** Coluna do tronco: a fivela do cinto (`z`) só existe no `BODY`, então marca onde o tronco foi posto. */
  const torsoCol = (rows: readonly string[]): number => {
    const cols = rows.flatMap((row) => [...row].flatMap((c, x) => (c === 'z' ? [x] : [])));
    expect(cols.length, 'a fivela do cinto está visível').toBeGreaterThan(0);
    return cols.reduce((a, b) => a + b, 0) / cols.length;
  };
  /** Última linha com pixel opaco (S, rastro de movimento, não conta). */
  const lastOpaqueRow = (rows: readonly string[]): number => {
    let last = -1;
    rows.forEach((row, y) => {
      if ([...row].some((c) => c !== '.' && c !== 'S')) last = y;
    });
    return last;
  };

  it.each(NEW_FRAMES)('%s: o tronco fica a até 4 texels da coluna 10, a origem (SPF-04)', (name) => {
    expect(Math.abs(torsoCol(frame(name)) - 10), name).toBeLessThanOrEqual(4);
  });

  it.each(NEW_FRAMES)('%s: os pés tocam o chão (a última linha opaca é a última da grade)', (name) => {
    expect(lastOpaqueRow(frame(name)), name).toBe(PLAYER_FRAME_H - 1);
  });

});

describe('invariantes em todas as folhas do player (SPF-01, SPF-02, SPF-03)', () => {
  const names = Object.keys(ALL);

  it('a folha tem os frames de player, golpes e técnicas', () => {
    expect(names.length).toBeGreaterThanOrEqual(102);
  });

  it.each(names)('%s: um único componente 8-conexo, sem contar S (SPF-01)', (name) => {
    expect(componentSizes(frame(name)), name).toHaveLength(1);
  });

  it.each(names)('%s: nenhum pixel opaco descartado fora da grade (SPF-02)', (name) => {
    expect(clippedOf(frame(name)), name).toBe(0);
  });

  /** Sequências comparadas: as animações, wind -> hit -> recover de cada golpe e sign -> charge -> release -> recover de cada técnica. */
  const sequences: Record<string, string[]> = {};
  for (const [anim, def] of Object.entries(PLAYER_ANIMS)) sequences[`anim ${anim}`] = [...def.frames];
  for (const phases of [['wind', 'hit', 'recover'], ['sign', 'charge', 'release', 'recover']]) {
    const groups = new Set(names.filter((n) => n.endsWith(`-${phases[0]}`)).map((n) => n.slice(0, -phases[0].length - 1)));
    for (const g of groups) sequences[`${phases[0]} ${g}`] = phases.map((p) => `${g}-${p}`).filter((n) => n in ALL);
  }

  it.each(Object.entries(sequences))('%s: o centro do uniforme muda até 8 texels entre frames seguidos (SPF-03)', (_label, seq) => {
    for (let i = 1; i < seq.length; i++) {
      const delta = Math.abs(uniformCenter(frame(seq[i])) - uniformCenter(frame(seq[i - 1])));
      expect(delta, `${seq[i - 1]} -> ${seq[i]}`).toBeLessThanOrEqual(SPF03_MAX);
    }
  });
});
