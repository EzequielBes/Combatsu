import { describe, expect, it } from 'vitest';
import {
  BossLineups,
  applyOverrides,
  drawLineup,
  parseBossAffixes,
  parseBossArch,
  parseFinger,
  type BossLineup,
  type LineupOverrides,
} from '../../src/core/bossAffix';
import { Rng } from '../../src/core/rng';

const seeds = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, i) => from + i);

describe('parseBossArch (BLN-09, BLN-10)', () => {
  it.each(['oni', 'tecela'] as const)('%s é aceito', (id) => {
    expect(parseBossArch(id)).toBe(id);
  });

  it.each([null, undefined, '', 'x', 'Oni', 'tecelã', ' oni'])('%j é ignorado', (raw) => {
    expect(parseBossArch(raw)).toBeUndefined();
  });
});

describe('parseBossAffixes (BLN-09, BLN-10)', () => {
  it('none dá lista vazia (não undefined)', () => {
    expect(parseBossAffixes('none')).toEqual([]);
  });

  it('um id ou vários separados por vírgula, na ordem dada', () => {
    expect(parseBossAffixes('sangue')).toEqual(['sangue']);
    expect(parseBossAffixes('igneo,invocador,sangue,adaptativo')).toEqual([
      'igneo',
      'invocador',
      'sangue',
      'adaptativo',
    ]);
    expect(parseBossAffixes('adaptativo, igneo')).toEqual(['adaptativo', 'igneo']);
  });

  it('repetido fica uma vez só', () => {
    expect(parseBossAffixes('igneo,igneo,sangue')).toEqual(['igneo', 'sangue']);
  });

  it('é debug: par incompatível ou afixo pesado passam como vieram', () => {
    expect(parseBossAffixes('igneo,sangue')).toEqual(['igneo', 'sangue']);
  });

  it.each([null, undefined, '', 'foo', 'igneo,foo', 'foo,igneo', 'igneo,', 'none,igneo', 'IGNEO'])(
    '%j invalida o valor inteiro',
    (raw) => {
      expect(parseBossAffixes(raw)).toBeUndefined();
    },
  );
});

describe('parseFinger (BLN-09, BLN-10)', () => {
  it('1 liga e 0 desliga', () => {
    expect(parseFinger('1')).toBe(true);
    expect(parseFinger('0')).toBe(false);
  });

  it.each([null, undefined, '', 'true', '2', 'sim'])('%j é ignorado', (raw) => {
    expect(parseFinger(raw)).toBeUndefined();
  });
});

describe('applyOverrides: por cima do sorteio, numa cópia (BLN-09)', () => {
  const drawn: BossLineup = { archetype: 'tecela', affixes: ['igneo'], finger: false };

  it('sem override devolve uma cópia igual', () => {
    const out = applyOverrides(drawn);
    expect(out).toEqual(drawn);
    expect(out).not.toBe(drawn);
    expect(out.affixes).not.toBe(drawn.affixes);
  });

  it('cada campo presente manda; o ausente vem do sorteio', () => {
    expect(applyOverrides(drawn, { archetype: 'oni' })).toEqual({ ...drawn, archetype: 'oni' });
    expect(applyOverrides(drawn, { affixes: ['sangue', 'adaptativo'] })).toEqual({
      ...drawn,
      affixes: ['sangue', 'adaptativo'],
    });
    expect(applyOverrides(drawn, { finger: true })).toEqual({ ...drawn, finger: true });
  });

  it('affixes [] (none) zera os afixos, e finger false desliga um Portador sorteado', () => {
    const portador: BossLineup = { archetype: 'oni', affixes: ['invocador'], finger: true };
    expect(applyOverrides(portador, { affixes: [], finger: false })).toEqual({
      archetype: 'oni',
      affixes: [],
      finger: false,
    });
  });

  it('não muda a escalação original', () => {
    const original: BossLineup = { archetype: 'tecela', affixes: ['igneo'], finger: false };
    applyOverrides(original, { archetype: 'oni', affixes: [], finger: true });
    expect(original).toEqual({ archetype: 'tecela', affixes: ['igneo'], finger: false });
  });
});

describe('BossLineups.lineupFor com overrides (BLN-09, BLN-10)', () => {
  const all: LineupOverrides = { archetype: 'oni', affixes: ['sangue'], finger: true };

  it.each([5, 10, 25])('na r%i o próximo next() do stream é igual com e sem override', (round) => {
    for (const seed of seeds(1, 30)) {
      const plain = new Rng(seed);
      const overridden = new Rng(seed);
      new BossLineups().lineupFor(plain, round);
      new BossLineups().lineupFor(overridden, round, all);
      expect(overridden.next()).toBe(plain.next());
    }
  });

  it('o override manda no resultado e o cache guarda o sorteio puro', () => {
    const lineups = new BossLineups();
    const rng = new Rng(3);
    expect(lineups.lineupFor(rng, 10, all)).toEqual({ archetype: 'oni', affixes: ['sangue'], finger: true });
    expect(lineups.lineupFor(rng, 10)).toEqual(drawLineup(new Rng(3), 10));
  });

  it('valor inválido é ignorado: parse dá undefined e vale o sorteio', () => {
    const o: LineupOverrides = {
      archetype: parseBossArch('x'),
      affixes: parseBossAffixes('foo'),
      finger: parseFinger('2'),
    };
    expect(new BossLineups().lineupFor(new Rng(9), 15, o)).toEqual(drawLineup(new Rng(9), 15));
  });

  it('bossAffix=none dá lista vazia mesmo onde o tier pede 3 afixos', () => {
    const lineup = new BossLineups().lineupFor(new Rng(4), 25, { affixes: parseBossAffixes('none') });
    expect(lineup.affixes).toEqual([]);
    expect(drawLineup(new Rng(4), 25).affixes).toHaveLength(3); // o sorteio teria afixos: o teste discrimina
  });

  it('finger=1 vale antes da r10 (é debug), sem mudar o consumo', () => {
    const plain = new Rng(6);
    const overridden = new Rng(6);
    new BossLineups().lineupFor(plain, 5);
    expect(new BossLineups().lineupFor(overridden, 5, { finger: parseFinger('1') }).finger).toBe(true);
    expect(drawLineup(new Rng(6), 5).finger).toBe(false);
    expect(overridden.next()).toBe(plain.next());
  });
});
