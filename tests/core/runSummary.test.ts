import { describe, expect, it } from 'vitest';
import {
  DAMAGE_SOURCES,
  DamageLedger,
  RETRY_LINE,
  SUMMARY_LINE_MAX,
  type SummaryInput,
  listLines,
  sourceLabel,
  summaryLines,
} from '../../src/core/runSummary';
import { TECHNIQUES } from '../../src/data/techniques';
import { VOWS } from '../../src/data/vows';

describe('DAMAGE_SOURCES', () => {
  it('golpe primeiro, técnicas na ordem de TechId, objeto por último', () => {
    expect(DAMAGE_SOURCES).toEqual(['golpe', 'divergente', 'vermelho', 'azul', 'corte', 'roxo', 'objeto']);
  });

  it('rótulos: Golpe, Objeto e o nome da técnica', () => {
    expect(sourceLabel('golpe')).toBe('Golpe');
    expect(sourceLabel('objeto')).toBe('Objeto');
    expect(sourceLabel('azul')).toBe('Azul');
    expect(sourceLabel('divergente')).toBe('Divergente');
    expect(sourceLabel('vermelho')).toBe('Vermelho');
    for (const def of Object.values(TECHNIQUES)) expect(def.short).not.toContain(':');
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
    expect(ledger.rows().map((r) => r.label)).toEqual(['Vermelho', 'Objeto', 'Golpe']);
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
    expect(ledger.rows()).toEqual([{ source: 'corte', label: TECHNIQUES.corte.short, damage: 3, pct: 100 }]);
  });

  it('totals devolve cópia: mexer nela não altera o registro', () => {
    const ledger = new DamageLedger();
    ledger.add('golpe', 5);
    ledger.totals().golpe = 999;
    expect(ledger.totals().golpe).toBe(5);
  });
});

const EMPTY_BUILD = { techniques: [], perks: [], relic: null, weapon: null, vows: [] };

function input(over: Partial<SummaryInput> = {}): SummaryInput {
  return {
    round: 3,
    kills: 12,
    fragments: 40,
    build: EMPTY_BUILD,
    damage: [],
    newRecord: false,
    bestRound: 5,
    ...over,
  };
}

const texts = (over: Partial<SummaryInput> = {}) => summaryLines(input(over)).map((l) => l.text);

describe('summaryLines', () => {
  it('build vazia e sem dano: nenhuma/nenhum em cada lista e Dano: nenhum', () => {
    expect(texts()).toEqual([
      'Rodada alcançada: 3',
      'Abates: 12',
      'Fragmentos: 40',
      'Técnicas: nenhuma',
      'Passivas: nenhuma',
      'Arsenal: nenhum',
      'Votos: nenhum',
      'Dano: nenhum',
      'Recorde: r5',
      'J / Enter para tentar de novo',
    ]);
  });

  it('lista cada item com nome e nível, e o dano de cada fonte', () => {
    const ledger = new DamageLedger();
    ledger.add('golpe', 60.4);
    ledger.add('azul', 40);
    const lines = texts({
      build: {
        techniques: [
          { id: 'azul', level: 2 },
          { id: 'divergente', level: 1 },
        ],
        perks: ['punhoPesado', 'refluxo'],
        relic: { id: 'manoplas', level: 2 },
        weapon: { id: 'bastao', level: 1 },
        vows: ['furia', 'ganancia'],
      },
      damage: ledger.rows(),
    });
    expect(lines.slice(3, 9)).toEqual([
      'Técnicas: Azul Nv 2, Divergente Nv 1',
      'Passivas: Punho pesado, Refluxo',
      'Arsenal: Manoplas de ferro Nv 2, Bastão selado Nv 1',
      `Votos: ${VOWS.furia.name}, ${VOWS.ganancia.name}`,
      'Golpe: 60 (60%)',
      'Azul: 40 (40%)',
    ]);
  });

  it('só a arma vinculada, sem relíquia, ainda aparece no arsenal', () => {
    expect(texts({ build: { ...EMPTY_BUILD, weapon: { id: 'lamina', level: 3 } } })).toContain(
      'Arsenal: Lâmina vinculada Nv 3',
    );
  });

  it('id desconhecido some da linha sem quebrar as outras', () => {
    const lines = texts({
      build: {
        techniques: [
          { id: 'sumiu', level: 2 },
          { id: 'roxo', level: 1 },
        ],
        perks: ['toString', 'executor'],
        relic: { id: 'velha', level: 1 },
        weapon: null,
        vows: ['inventado'],
      },
    });
    expect(lines.slice(3, 7)).toEqual([
      `Técnicas: ${TECHNIQUES.roxo.short} Nv 1`,
      'Passivas: Executor',
      'Arsenal: nenhum',
      'Votos: nenhum',
    ]);
  });

  it('Recorde! com highlight quando bateu; Recorde: rN sem highlight quando não; nada sem recorde', () => {
    const beat = summaryLines(input({ newRecord: true, bestRound: 3 }));
    expect(beat.at(-2)).toEqual({ text: 'Recorde!', highlight: true });
    expect(beat.filter((l) => l.text.startsWith('Recorde')).length).toBe(1);

    const lost = summaryLines(input({ bestRound: 7 }));
    expect(lost.at(-2)).toEqual({ text: 'Recorde: r7' });
    expect(lost.some((l) => l.text === 'Recorde!' || l.highlight)).toBe(false);

    const none = summaryLines(input({ bestRound: null }));
    expect(none.some((l) => l.text.startsWith('Recorde'))).toBe(false);
  });

  it('a última linha é sempre J / Enter para tentar de novo', () => {
    for (const over of [{}, { newRecord: true }, { bestRound: null }]) {
      expect(summaryLines(input(over)).at(-1)).toEqual({ text: 'J / Enter para tentar de novo' });
    }
    expect(RETRY_LINE).toBe('J / Enter para tentar de novo');
  });
});

describe('listLines', () => {
  /** Item de `n` caracteres. */
  const item = (n: number, ch = 'a') => ch.repeat(n);

  it('linha de 99 e 100 caracteres cabe numa só; 101 quebra em ", " numa segunda linha', () => {
    expect(SUMMARY_LINE_MAX).toBe(100);
    // 'X: ' (3) + 40 + ', ' (2) + resto
    for (const total of [99, 100]) {
      const lines = listLines('X', [item(40), item(total - 45, 'b')], 'nada');
      expect(lines).toEqual([`X: ${item(40)}, ${item(total - 45, 'b')}`]);
      expect(lines[0].length).toBe(total);
    }
    const broken = listLines('X', [item(40), item(56, 'b')], 'nada');
    expect(broken).toEqual([`X: ${item(40)},`, item(56, 'b')]);
  });

  it('a quebra fica depois do último item que cabe: 99 e 100 na primeira linha, 101 empurra o item', () => {
    // Primeira parte com 'X: ' + 20 + ', ' + k caracteres, seguida de um item que nunca cabe junto.
    for (const head of [99, 100]) {
      const lines = listLines('X', [item(20), item(head - 25, 'b'), item(30, 'c')], 'nada');
      expect(lines[0]).toBe(`X: ${item(20)}, ${item(head - 25, 'b')},`);
      expect(lines[1]).toBe(item(30, 'c'));
    }
    const pushed = listLines('X', [item(20), item(76, 'b'), item(10, 'c')], 'nada');
    expect(pushed).toEqual([`X: ${item(20)},`, `${item(76, 'b')}, ${item(10, 'c')}`]);
  });

  it('lista vazia, ou só com ids desconhecidos, mostra o texto de vazio', () => {
    expect(listLines('Votos', [], 'nenhum')).toEqual(['Votos: nenhum']);
    expect(listLines('Votos', [null, null], 'nenhum')).toEqual(['Votos: nenhum']);
  });
});
