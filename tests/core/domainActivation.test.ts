import { describe, expect, it } from 'vitest';
import { DomainState } from '../../src/core/domain';
import {
  ActiveDomain,
  activationDamage,
  activationDenial,
  activationTargets,
  inRadius,
} from '../../src/core/domainActivation';
import { DOMAINS } from '../../src/data/domains';

const state = (opts: { owned?: boolean; charge?: number; active?: boolean } = {}): DomainState => {
  const s = new DomainState();
  if (opts.owned ?? true) s.own('santuario', 1, opts.charge ?? 100);
  if (opts.active) s.active = new ActiveDomain('santuario', 1);
  return s;
};

describe('activationDenial: ordem none → active → charge → busy (DOM-06, DOM-07)', () => {
  it('barra cheia, sem ativo e livre: aceita', () => {
    expect(activationDenial(state(), false)).toBeNull();
  });

  it('cada recusa sozinha', () => {
    expect(activationDenial(state({ owned: false }), false)).toBe('none');
    expect(activationDenial(state({ active: true }), false)).toBe('active');
    expect(activationDenial(state({ charge: 99 }), false)).toBe('charge');
    expect(activationDenial(state(), true)).toBe('busy');
  });

  it('combinadas: com ativo e carga 0 o motivo é active', () => {
    expect(activationDenial(state({ active: true, charge: 0 }), true)).toBe('active');
    expect(activationDenial(state({ owned: false }), true)).toBe('none');
    expect(activationDenial(state({ charge: 0 }), true)).toBe('charge');
  });

  it('nenhuma recusa muda a carga (DOM-07)', () => {
    const cases = [state({ charge: 40 }), state({ charge: 100 }), state({ active: true, charge: 0 })];
    const busy = [false, true, false];
    cases.forEach((s, i) => {
      const before = s.charge;
      activationDenial(s, busy[i]);
      expect(s.charge).toBe(before);
    });
  });
});

describe('inRadius: borda inclusa e distância euclidiana (DOM-08)', () => {
  const c = { x: 0, y: 0 };
  it('raio 320: 320 px dentro, 321 px fora', () => {
    expect(inRadius(c, { x: 320, y: 0 }, 320)).toBe(true);
    expect(inRadius(c, { x: -321, y: 0 }, 320)).toBe(false);
  });

  it('raio 96: 96 px dentro, 97 px fora', () => {
    expect(inRadius(c, { x: -96, y: 0 }, 96)).toBe(true);
    expect(inRadius(c, { x: 97, y: 0 }, 96)).toBe(false);
  });

  it('alvo acima conta pela distância euclidiana', () => {
    expect(inRadius(c, { x: 60, y: -80 }, 100)).toBe(true);
    expect(inRadius(c, { x: 60, y: -81 }, 100)).toBe(false);
  });
});

describe('activationDamage e activationTargets (DOM-08)', () => {
  it('max(1, round(fração × maxHp))', () => {
    expect(activationDamage(0.4, 30)).toBe(12);
    expect(activationDamage(0.25, 30)).toBe(8);
    expect(activationDamage(0.06, 400)).toBe(24);
    expect(activationDamage(0.4, 1)).toBe(1);
    expect(activationDamage(0.04, 10)).toBe(1);
  });

  it('maxHp escalado (r35) mantém a fração', () => {
    expect(activationDamage(0.4, 30 * 7.5)).toBe(Math.round(0.4 * 225));
  });

  const targets = [
    { id: 1, center: { x: 320, y: 0 }, maxHp: 30, isBoss: false },
    { id: 2, center: { x: 321, y: 0 }, maxHp: 30, isBoss: false },
    { id: 3, center: { x: -90, y: 0 }, maxHp: 400, isBoss: true },
    { id: 4, center: { x: 96, y: 0 }, maxHp: 20, isBoss: false },
  ];

  it.each([
    [
      'santuario',
      [
        { id: 1, d: 12 },
        { id: 3, d: 24 },
        { id: 4, d: 8 },
      ],
    ],
    [
      'jackpot',
      [
        { id: 3, d: 24 },
        { id: 4, d: 8 },
      ],
    ],
    [
      'amplificacao',
      [
        { id: 3, d: 16 },
        { id: 4, d: 5 },
      ],
    ],
  ] as const)('%s: alvos e dano pelas frações do comum e do chefe', (id, expected) => {
    const hits = activationTargets({ x: 0, y: 0 }, targets, DOMAINS[id]);
    expect(hits.map((h) => ({ id: h.target.id, d: h.damage }))).toEqual(expected);
  });
});

describe('ActiveDomain: relógio do Domínio (DOM-10, SAN-01, AMP-01)', () => {
  it.each([
    ['santuario', 1, 6000],
    ['santuario', 2, 8000],
    ['santuario', 3, 8000],
    ['amplificacao', 1, 7000],
    ['amplificacao', 2, 9000],
    ['amplificacao', 3, 9000],
  ] as const)('%s Nv %i dura %i ms', (id, level, ms) => {
    const a = new ActiveDomain(id, level);
    expect(a.id).toBe(id);
    expect(a.level).toBe(level);
    expect(a.totalMs).toBe(ms);
    expect(a.remainingMs).toBe(ms);
  });

  it('update devolve falso em total − 1 e verdadeiro em total', () => {
    const a = new ActiveDomain('santuario', 1);
    expect(a.update(5999)).toBe(false);
    expect(a.remainingMs).toBe(1);
    expect(a.update(1)).toBe(true);
    expect(a.remainingMs).toBe(0);
  });

  it('restart troca o total e o restante', () => {
    const a = new ActiveDomain('jackpot', 1);
    a.update(2000);
    a.restart(8000);
    expect(a.totalMs).toBe(8000);
    expect(a.remainingMs).toBe(8000);
    expect(a.update(7999)).toBe(false);
    expect(a.update(1)).toBe(true);
  });
});
