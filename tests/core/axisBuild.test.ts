import { describe, expect, it } from 'vitest';
import { AxisBuild } from '../../src/core/axisBuild';

/** Põe `n` pontos no eixo, conferindo cada compra. */
function fill(build: AxisBuild, item: 'vermelho' | 'corpo', axis: string, n: number): void {
  for (let i = 0; i < n; i++) {
    expect(build.add(item, axis as never).ok).toBe(true);
  }
}

describe('VRM-02, CRP-01: nível e tetos', () => {
  it('começa no Nv 1 nos dois itens, sem ramo nem fila', () => {
    const b = new AxisBuild();
    expect(b.level('vermelho')).toBe(1);
    expect(b.level('corpo')).toBe(1);
    expect(b.branch('vermelho')).toBeNull();
    expect(b.pending).toEqual([]);
  });

  it('nível = 1 + pontos', () => {
    const b = new AxisBuild();
    fill(b, 'vermelho', 'potencia', 2);
    fill(b, 'vermelho', 'escala', 1);
    expect(b.total('vermelho')).toBe(3);
    expect(b.level('vermelho')).toBe(4);
    expect(b.points('vermelho', 'potencia')).toBe(2);
    expect(b.axesOf('vermelho')).toEqual({
      potencia: 2,
      escala: 1,
      conjuracao: 0,
      eficiencia: 0,
      recarga: 0,
      perfuracao: 0,
    });
  });

  it('eixo 2→3 aceito; 3→4 recusado sem mudar nada', () => {
    const b = new AxisBuild();
    fill(b, 'corpo', 'peso', 2);
    expect(b.canAdd('corpo', 'peso')).toBe(true);
    expect(b.add('corpo', 'peso').ok).toBe(true);
    expect(b.canAdd('corpo', 'peso')).toBe(false);
    expect(b.add('corpo', 'peso')).toEqual({ ok: false });
    expect(b.points('corpo', 'peso')).toBe(3);
    expect(b.level('corpo')).toBe(4);
  });

  it('item 4→5 aceito; 5→6 recusado sem mudar nada', () => {
    const b = new AxisBuild();
    fill(b, 'vermelho', 'potencia', 3);
    fill(b, 'vermelho', 'escala', 1);
    expect(b.canAdd('vermelho', 'recarga')).toBe(true);
    expect(b.add('vermelho', 'recarga').ok).toBe(true);
    expect(b.total('vermelho')).toBe(5);
    expect(b.canAdd('vermelho', 'recarga')).toBe(false);
    expect(b.add('vermelho', 'recarga')).toEqual({ ok: false });
    expect(b.total('vermelho')).toBe(5);
    expect(b.level('vermelho')).toBe(6);
  });

  it('eixo de outro item é recusado e vale 0', () => {
    const b = new AxisBuild();
    expect(b.canAdd('vermelho', 'impacto' as never)).toBe(false);
    expect(b.add('vermelho', 'impacto' as never)).toEqual({ ok: false });
    expect(b.points('vermelho', 'impacto' as never)).toBe(0);
    expect(b.total('vermelho')).toBe(0);
  });

  it('os itens não dividem pontos', () => {
    const b = new AxisBuild();
    fill(b, 'vermelho', 'potencia', 3);
    fill(b, 'vermelho', 'escala', 2);
    expect(b.canAdd('corpo', 'impacto')).toBe(true);
    expect(b.level('corpo')).toBe(1);
  });
});

describe('VRM-11, CRP-08.1: ramo pendente só no 1º Nv 2 da run', () => {
  it('o ponto que leva ao Nv 2 põe o item na fila; os seguintes não', () => {
    const b = new AxisBuild();
    expect(b.add('vermelho', 'potencia')).toEqual({ ok: true, branchPending: true, awakened: false });
    expect(b.pending).toEqual(['vermelho']);
    expect(b.add('vermelho', 'escala')).toEqual({ ok: true, branchPending: false, awakened: false });
    expect(b.pending).toEqual(['vermelho']);
  });

  it('escolhido o ramo, a fila esvazia e não volta', () => {
    const b = new AxisBuild();
    b.add('corpo', 'impacto');
    expect(b.setBranch('corpo', 'cadencia')).toBe(true);
    expect(b.pending).toEqual([]);
    expect(b.branch('corpo')).toBe('cadencia');
    const r = b.add('corpo', 'ritmo');
    expect(r.ok && r.branchPending).toBe(false);
    expect(b.pending).toEqual([]);
  });

  it('Vermelho antes do Corpo, seja qual for a ordem da compra', () => {
    const b = new AxisBuild();
    b.add('corpo', 'fluxo');
    b.add('vermelho', 'recarga');
    expect(b.pending).toEqual(['vermelho', 'corpo']);
  });
});

describe('setBranch: só ramo do item, uma vez e a partir do Nv 2', () => {
  it('no Nv 1 recusa', () => {
    const b = new AxisBuild();
    expect(b.setBranch('vermelho', 'ricochete')).toBe(false);
    expect(b.branch('vermelho')).toBeNull();
  });

  it('ramo de outro item recusa', () => {
    const b = new AxisBuild();
    b.add('vermelho', 'potencia');
    expect(b.setBranch('vermelho', 'cadencia' as never)).toBe(false);
    expect(b.pending).toEqual(['vermelho']);
  });

  it('o segundo ramo recusa e o primeiro fica', () => {
    const b = new AxisBuild();
    b.add('vermelho', 'potencia');
    expect(b.setBranch('vermelho', 'contido')).toBe(true);
    expect(b.setBranch('vermelho', 'ricochete')).toBe(false);
    expect(b.branch('vermelho')).toBe('contido');
  });
});

describe('VRM-17, CRP-13: Despertar no Nv 5 com ramo', () => {
  it('Nv 4 com ramo não desperta; o ponto do Nv 5 desperta e diz isso uma vez', () => {
    const b = new AxisBuild();
    b.add('vermelho', 'potencia');
    b.setBranch('vermelho', 'ricochete');
    fill(b, 'vermelho', 'potencia', 2);
    expect(b.level('vermelho')).toBe(4);
    expect(b.awakened('vermelho')).toBe(false);
    expect(b.add('vermelho', 'escala')).toEqual({ ok: true, branchPending: false, awakened: true });
    expect(b.awakened('vermelho')).toBe(true);
    expect(b.add('vermelho', 'escala')).toEqual({ ok: true, branchPending: false, awakened: false });
    expect(b.awakened('vermelho')).toBe(true);
  });

  it('Nv 5 com o ramo pendente não desperta; desperta ao escolher o ramo (edge case)', () => {
    const b = new AxisBuild();
    fill(b, 'corpo', 'furia', 3);
    fill(b, 'corpo', 'alcance', 1);
    expect(b.level('corpo')).toBe(5);
    expect(b.awakened('corpo')).toBe(false);
    expect(b.pending).toEqual(['corpo']);
    expect(b.setBranch('corpo', 'ondaDoPunho')).toBe(true);
    expect(b.awakened('corpo')).toBe(true);
  });
});

describe('focusAxis: eixo-foco da maestria e do prêmio do chefe', () => {
  it('sem pontos, o 1º eixo da tabela', () => {
    const b = new AxisBuild();
    expect(b.focusAxis('vermelho')).toBe('potencia');
    expect(b.focusAxis('corpo')).toBe('impacto');
  });

  it('o eixo com mais pontos; empate pela ordem da tabela', () => {
    const b = new AxisBuild();
    fill(b, 'vermelho', 'recarga', 1);
    fill(b, 'vermelho', 'escala', 1);
    expect(b.focusAxis('vermelho')).toBe('escala');
    fill(b, 'vermelho', 'recarga', 1);
    expect(b.focusAxis('vermelho')).toBe('recarga');
  });

  it('eixo no teto sai do foco', () => {
    const b = new AxisBuild();
    fill(b, 'corpo', 'peso', 3);
    fill(b, 'corpo', 'fluxo', 1);
    expect(b.focusAxis('corpo')).toBe('fluxo');
  });

  it('item no teto de 5 pontos devolve null', () => {
    const b = new AxisBuild();
    fill(b, 'corpo', 'peso', 3);
    fill(b, 'corpo', 'fluxo', 1);
    expect(b.focusAxis('corpo')).not.toBeNull();
    fill(b, 'corpo', 'fluxo', 1);
    expect(b.focusAxis('corpo')).toBeNull();
  });
});

describe('announce: banner do Despertar uma vez por rodada', () => {
  function awake(): AxisBuild {
    const b = new AxisBuild();
    b.add('vermelho', 'potencia');
    b.setBranch('vermelho', 'contido');
    fill(b, 'vermelho', 'potencia', 2);
    fill(b, 'vermelho', 'escala', 1);
    return b;
  }

  it('sem Despertar não anuncia', () => {
    const b = new AxisBuild();
    fill(b, 'vermelho', 'potencia', 3);
    fill(b, 'vermelho', 'escala', 1);
    expect(b.announce('vermelho')).toBe(false);
  });

  it('só a 1ª vez da rodada; a rodada nova libera de novo', () => {
    const b = awake();
    expect(b.announce('vermelho')).toBe(true);
    expect(b.announce('vermelho')).toBe(false);
    expect(b.announce('corpo')).toBe(false);
    b.onRoundStart();
    expect(b.announce('vermelho')).toBe(true);
  });
});

describe('reset e resetItem', () => {
  it('reset: Corpo volta ao Nv 1, sem ramo, e a fila pendente cai (CRP-01, edge case do reset)', () => {
    const b = new AxisBuild();
    fill(b, 'corpo', 'impacto', 2);
    b.add('vermelho', 'potencia');
    b.setBranch('corpo', 'cadencia');
    b.reset();
    expect(b.level('corpo')).toBe(1);
    expect(b.level('vermelho')).toBe(1);
    expect(b.branch('corpo')).toBeNull();
    expect(b.pending).toEqual([]);
  });

  it('depois do reset, o 1º Nv 2 da run nova volta a pedir o ramo', () => {
    const b = new AxisBuild();
    b.add('corpo', 'impacto');
    b.setBranch('corpo', 'cadencia');
    b.reset();
    const r = b.add('corpo', 'impacto');
    expect(r.ok && r.branchPending).toBe(true);
    expect(b.pending).toEqual(['corpo']);
  });

  it('reset também libera o anúncio', () => {
    const b = new AxisBuild();
    b.add('corpo', 'impacto');
    b.setBranch('corpo', 'cadencia');
    fill(b, 'corpo', 'impacto', 2);
    fill(b, 'corpo', 'peso', 1);
    expect(b.announce('corpo')).toBe(true);
    b.reset();
    b.add('corpo', 'impacto');
    b.setBranch('corpo', 'cadencia');
    fill(b, 'corpo', 'impacto', 2);
    fill(b, 'corpo', 'peso', 1);
    expect(b.announce('corpo')).toBe(true);
  });

  it("resetItem('vermelho') zera o Vermelho e tira da fila, sem mexer no Corpo", () => {
    const b = new AxisBuild();
    fill(b, 'vermelho', 'potencia', 2);
    fill(b, 'corpo', 'ritmo', 1);
    expect(b.pending).toEqual(['vermelho', 'corpo']);
    b.resetItem('vermelho');
    expect(b.level('vermelho')).toBe(1);
    expect(b.branch('vermelho')).toBeNull();
    expect(b.pending).toEqual(['corpo']);
    expect(b.level('corpo')).toBe(2);
  });
});
