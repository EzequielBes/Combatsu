import { describe, expect, it } from 'vitest';
import { DAMAGE_SOURCES, DamageLedger, sourceLabel } from '../../src/core/runSummary';
import { TECHNIQUES } from '../../src/data/techniques';

describe('DAMAGE_SOURCES', () => {
  it('golpe primeiro, técnicas na ordem de TechId, objeto por último', () => {
    expect(DAMAGE_SOURCES).toEqual(['golpe', 'divergente', 'vermelho', 'azul', 'corte', 'roxo', 'objeto']);
  });

  it('rótulos: Golpe, Objeto e o nome da técnica', () => {
    expect(sourceLabel('golpe')).toBe('Golpe');
    expect(sourceLabel('objeto')).toBe('Objeto');
    expect(sourceLabel('azul')).toBe(TECHNIQUES.azul.name);
    expect(sourceLabel('divergente')).toBe('Punho Divergente');
  });
});

describe('DamageLedger', () => {
  it('soma por fonte e ignora valor não positivo ou não finito', () => {
    const ledger = new DamageLedger();
    ledger.add('golpe', 10);
    ledger.add('golpe', 5.5);
    ledger.add('azul', 0);
    ledger.add('azul', -3);
    ledger.add('azul', Number.NaN);
    const totals = ledger.totals();
    expect(totals.golpe).toBe(15.5);
    expect(totals.azul).toBe(0);
    expect(Object.keys(totals)).toEqual([...DAMAGE_SOURCES]);
  });

  it('rows filtra dano 0 e ordena do maior ao menor', () => {
    const ledger = new DamageLedger();
    ledger.add('golpe', 20);
    ledger.add('vermelho', 50);
    ledger.add('objeto', 30);
    expect(ledger.rows().map((r) => r.source)).toEqual(['vermelho', 'objeto', 'golpe']);
    expect(ledger.rows().map((r) => r.label)).toEqual([TECHNIQUES.vermelho.name, 'Objeto', 'Golpe']);
    expect(ledger.rows().map((r) => r.pct)).toEqual([50, 30, 20]);
  });

  it('empate segue a ordem de DAMAGE_SOURCES, não a ordem de chegada', () => {
    const ledger = new DamageLedger();
    ledger.add('objeto', 40);
    ledger.add('corte', 40);
    ledger.add('golpe', 40);
    ledger.add('divergente', 40);
    expect(ledger.rows().map((r) => r.source)).toEqual(['golpe', 'divergente', 'corte', 'objeto']);
  });

  it('dano inteiro arredondado; porcentagens de frações difíceis somam 100 ± 1', () => {
    const ledger = new DamageLedger();
    ledger.add('golpe', 33.4);
    ledger.add('azul', 33.3);
    ledger.add('roxo', 33.3);
    const rows = ledger.rows();
    expect(rows.map((r) => r.damage)).toEqual([33, 33, 33]);
    const sum = rows.reduce((s, r) => s + r.pct, 0);
    expect(Math.abs(sum - 100)).toBeLessThanOrEqual(1);

    const halves = new DamageLedger();
    halves.add('golpe', 1);
    halves.add('vermelho', 1);
    halves.add('objeto', 6);
    const halfRows = halves.rows();
    expect(halfRows.map((r) => r.pct)).toEqual([75, 13, 13]);
    expect(Math.abs(halfRows.reduce((s, r) => s + r.pct, 0) - 100)).toBeLessThanOrEqual(1);
  });

  it('sem dano, rows é vazio', () => {
    expect(new DamageLedger().rows()).toEqual([]);
  });

  it('reset zera todas as fontes (DMG-06)', () => {
    const ledger = new DamageLedger();
    for (const source of DAMAGE_SOURCES) ledger.add(source, 7);
    ledger.reset();
    expect(Object.values(ledger.totals()).every((v) => v === 0)).toBe(true);
    expect(ledger.rows()).toEqual([]);
    ledger.add('corte', 3);
    expect(ledger.rows()).toEqual([{ source: 'corte', label: TECHNIQUES.corte.name, damage: 3, pct: 100 }]);
  });

  it('totals devolve cópia: mexer nela não altera o registro', () => {
    const ledger = new DamageLedger();
    ledger.add('golpe', 5);
    ledger.totals().golpe = 999;
    expect(ledger.totals().golpe).toBe(5);
  });
});
