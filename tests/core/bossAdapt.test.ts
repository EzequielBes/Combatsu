import { describe, expect, it } from 'vitest';
import { BOSS_AFFIX } from '../../src/data/bossAffixes';
import { Adaptation, adaptSourceOf, type AdaptSource, type TechHit } from '../../src/core/bossAdapt';

function hit(extra: Partial<TechHit> = {}): TechHit {
  return { ownerId: 1, damage: 10, strength: 'light', direction: { x: 1, y: 0 }, force: 1, ...extra };
}

/** Dá `n` golpes da fonte e devolve a escala de cada um. */
function times(a: Adaptation, source: AdaptSource, n: number): number[] {
  return Array.from({ length: n }, () => a.onHit(source));
}

describe('adaptSourceOf', () => {
  it('ADP-01: corpo a corpo pela strength e técnica pelo techId', () => {
    expect(adaptSourceOf(hit())).toBe('light');
    expect(adaptSourceOf(hit({ strength: 'heavy' }))).toBe('heavy');
    expect(adaptSourceOf(hit({ strength: 'heavy', tech: true, techId: 'vermelho' }))).toBe('vermelho');
    expect(adaptSourceOf(hit({ tech: true, techId: 'corte' }))).toBe('corte');
  });

  it('ADP-02: golpe de técnica sem techId não conta', () => {
    expect(adaptSourceOf(hit({ tech: true }))).toBeNull();
    expect(adaptSourceOf(hit({ strength: 'heavy', tech: true }))).toBeNull();
  });
});

describe('Adaptation', () => {
  it('usa os números do afixo', () => {
    expect(BOSS_AFFIX.adapt).toEqual({ windowMs: 20000, minHits: 5, maxAdapted: 2, forgetMs: 10000, mult: 0.5 });
  });

  it('ADP-03: 4 acertos não adaptam; o 5º adapta', () => {
    const a = new Adaptation();
    times(a, 'heavy', 4);
    expect(a.adapted).toEqual([]);
    a.onHit('heavy');
    expect(a.adapted).toEqual(['heavy']);
  });

  it('fonte null não conta e sai inteira', () => {
    const a = new Adaptation();
    expect(times(a, 'light', 4)).toEqual([1, 1, 1, 1]);
    expect(a.onHit(null)).toBe(1);
    expect(a.adapted).toEqual([]);
  });

  it('fontes diferentes contam separadas', () => {
    const a = new Adaptation();
    times(a, 'light', 4);
    times(a, 'heavy', 4);
    times(a, 'divergente', 4);
    expect(a.adapted).toEqual([]);
  });

  it('ADP-01: acerto com idade 19999 ms ainda conta', () => {
    const a = new Adaptation();
    times(a, 'light', 4);
    a.update(19999);
    a.onHit('light');
    expect(a.adapted).toEqual(['light']);
  });

  it('ADP-01: acerto com idade 20000 ms já saiu da janela', () => {
    const a = new Adaptation();
    times(a, 'light', 4);
    a.update(20000);
    a.onHit('light');
    expect(a.adapted).toEqual([]);
    times(a, 'light', 3);
    expect(a.adapted).toEqual([]);
    a.onHit('light');
    expect(a.adapted).toEqual(['light']);
  });

  it('ADP-03: no máximo 2 fontes adaptadas', () => {
    const a = new Adaptation();
    times(a, 'heavy', 5);
    times(a, 'light', 5);
    times(a, 'azul', 8);
    expect(a.adapted).toEqual(['heavy', 'light']);
  });

  it('ADP-03: a fonte não adaptada com mais acertos é a que adapta', () => {
    const a = new Adaptation();
    times(a, 'heavy', 5);
    times(a, 'heavy', 6);
    expect(a.adapted).toEqual(['heavy']);
    times(a, 'roxo', 5);
    expect(a.adapted).toEqual(['heavy', 'roxo']);
  });

  /** Enche o teto com `x` e `y`, dá 5 golpes de cada fonte em `pair` e deixa `x` e `y` serem esquecidas. */
  function tied(pair: readonly AdaptSource[][]): Adaptation {
    const a = new Adaptation();
    times(a, 'heavy', 5);
    times(a, 'light', 5);
    a.update(1000);
    for (const sources of pair) for (const s of sources) a.onHit(s);
    expect(a.adapted).toEqual(['heavy', 'light']);
    a.update(9000);
    expect(a.adapted).toEqual([]);
    return a;
  }

  it('ADP-03: no empate fica a fonte que chegou ao número primeiro', () => {
    const round = ['vermelho', 'azul'] as AdaptSource[];
    const a = tied([round, round, round, round, round]);
    a.onHit('corte');
    expect(a.adapted).toEqual(['vermelho']);

    const b = tied([['azul'], ...Array.from({ length: 4 }, () => ['vermelho', 'azul'] as AdaptSource[]), ['vermelho']]);
    b.onHit('corte');
    expect(b.adapted).toEqual(['azul']);
  });

  it('ADP-04: a escala 0,5 vale só a partir do golpe seguinte à adaptação', () => {
    const a = new Adaptation();
    expect(times(a, 'heavy', 5)).toEqual([1, 1, 1, 1, 1]);
    expect(a.onHit('heavy')).toBe(0.5);
    expect(a.onHit('light')).toBe(1);
    expect(a.onHit('heavy')).toBe(0.5);
  });

  it('ADP-05: a fonte adaptada é esquecida aos 10000 ms sem acerto, não aos 9999', () => {
    const a = new Adaptation();
    times(a, 'heavy', 5);
    a.update(9999);
    expect(a.adapted).toEqual(['heavy']);
    a.update(1);
    expect(a.adapted).toEqual([]);
  });

  it('ADP-05: acerto da fonte adaptada reinicia o esquecimento; acerto de outra fonte não', () => {
    const a = new Adaptation();
    times(a, 'heavy', 5);
    a.update(9999);
    expect(a.onHit('heavy')).toBe(0.5);
    a.update(9999);
    a.onHit('light');
    expect(a.adapted).toEqual(['heavy']);
    a.update(1);
    expect(a.adapted).toEqual([]);
  });

  it('ADP-05: depois de esquecer, 1 golpe da mesma fonte não readapta e sai inteiro', () => {
    const a = new Adaptation();
    times(a, 'heavy', 8);
    a.update(10000);
    expect(a.adapted).toEqual([]);
    expect(a.onHit('heavy')).toBe(1);
    expect(a.adapted).toEqual([]);
    times(a, 'heavy', 3);
    expect(a.adapted).toEqual([]);
    a.onHit('heavy');
    expect(a.adapted).toEqual(['heavy']);
  });
});
