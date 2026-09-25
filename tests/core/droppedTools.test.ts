import { describe, expect, it } from 'vitest';
import { DroppedTools } from '../../src/core/droppedTools';
import type { PropState } from '../../src/core/props';

const T = { restMs: 20000, max: 6 };

function statesOf(entries: [number, PropState][]): Map<number, PropState> {
  return new Map(entries);
}

describe('DroppedTools: tempo de vida em repouso (ARM-13, ARM-28)', () => {
  it('19999 ms em rest fica; 20000 ms expira e é removida do registro', () => {
    const dt = new DroppedTools(T);
    const states = statesOf([[1, 'rest']]);
    dt.admit(1, states);
    expect(dt.update(19999, states)).toEqual([]);
    expect(dt.update(1, states)).toEqual([1]);
    expect(dt.ids).toEqual([]);
  });

  it('sair de rest e voltar zera a contagem (ARM-28)', () => {
    const dt = new DroppedTools(T);
    const states = statesOf([[1, 'rest']]);
    dt.admit(1, states);
    expect(dt.update(10000, states)).toEqual([]); // 10000 ms em rest

    states.set(1, 'held'); // saiu de rest: zera
    expect(dt.update(5000, states)).toEqual([]); // não conta enquanto não está em rest

    states.set(1, 'rest'); // voltou ao repouso: contagem do zero de novo
    expect(dt.update(19999, states)).toEqual([]); // só 19999 ms desde que voltou
    expect(dt.update(1, states)).toEqual([1]); // agora sim, 20000 ms desde a volta
  });
});

describe('DroppedTools: teto de 6 (ARM-14)', () => {
  it('com 6 registradas e uma nova, devolve a mais antiga em rest para remover', () => {
    const dt = new DroppedTools(T);
    const states = statesOf([1, 2, 3, 4, 5, 6].map((id) => [id, 'rest' as PropState]));
    for (const id of [1, 2, 3, 4, 5, 6]) dt.admit(id, states);
    // id 1 é a mais antiga: avança o tempo dela mais que as outras
    dt.update(5000, states);

    const evict = dt.admit(7, statesOf([...states, [7, 'rest']]));
    expect(evict).toBe(1);
  });

  it('com 6 registradas e nenhuma em rest, devolve null', () => {
    const dt = new DroppedTools(T);
    const states = statesOf([1, 2, 3, 4, 5, 6].map((id) => [id, 'held' as PropState]));
    for (const id of [1, 2, 3, 4, 5, 6]) dt.admit(id, states);
    expect(dt.admit(7, states)).toBeNull();
  });

  it('com 5 registradas, devolve null (ainda cabe)', () => {
    const dt = new DroppedTools(T);
    const states = statesOf([1, 2, 3, 4, 5].map((id) => [id, 'rest' as PropState]));
    for (const id of [1, 2, 3, 4, 5]) dt.admit(id, states);
    expect(dt.admit(6, states)).toBeNull();
  });
});

describe('DroppedTools: clear e forget', () => {
  it('clear esvazia todo o registro', () => {
    const dt = new DroppedTools(T);
    const states = statesOf([
      [1, 'rest'],
      [2, 'rest'],
    ]);
    dt.admit(1, states);
    dt.admit(2, states);
    dt.clear();
    expect(dt.ids).toEqual([]);
  });

  it('forget tira uma ferramenta do registro (ex.: quebrou)', () => {
    const dt = new DroppedTools(T);
    const states = statesOf([
      [1, 'rest'],
      [2, 'rest'],
    ]);
    dt.admit(1, states);
    dt.admit(2, states);
    dt.forget(1);
    expect(dt.ids.sort()).toEqual([2]);
  });
});
