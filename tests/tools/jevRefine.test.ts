import { describe, expect, it } from 'vitest';
import { buildRequest, flagsFor, formatReport, parseAcs, type Answers } from '../../tools/jev-refine/lib';

const SPEC = `# Exemplo

### P1: Rodadas ⭐ MVP

**User Story**: Como jogador, quero rodadas numeradas.

**Acceptance Criteria**:

1. RUN-01: WHEN the run starts THEN the game SHALL set round to 1.
2. RUN-02: The game SHALL show the round number.

### P2: Loja

**User Story**: Como jogador, quero comprar.

1. SHOP-01: IF the player has no coins THEN the shop SHALL disable buying.

## Edge Cases

- IF two enemies die THEN the scene SHALL count two.
`;

const base: Answers = { ambiguous: 0.3, bundled: 0.3, testable: 0.9, precision: 2.5 };

describe('parseAcs', () => {
  it('extrai ID, story e critério de cada AC', () => {
    const acs = parseAcs(SPEC);
    expect(acs.map((a) => a.id)).toEqual(['RUN-01', 'RUN-02', 'SHOP-01']);
    expect(acs[0].criterion).toBe('WHEN the run starts THEN the game SHALL set round to 1.');
    expect(acs[0].story).toContain('P1: Rodadas');
    expect(acs[0].story).toContain('Como jogador, quero rodadas numeradas.');
    expect(acs[2].story).toContain('Como jogador, quero comprar.');
    expect(acs[2].criterion).toBe('IF the player has no coins THEN the shop SHALL disable buying.');
  });

  it('spec sem AC lança "nenhum AC encontrado"', () => {
    expect(() => parseAcs('# Nada\n\n- IF x THEN y SHALL z.\n')).toThrow('nenhum AC encontrado');
  });
});

describe('flagsFor (FND-14)', () => {
  it('sem nenhum limiar cruzado não sinaliza', () => {
    expect(flagsFor(base)).toEqual([]);
  });
  it('ambiguous: 0,61 sinaliza, 0,60 não', () => {
    expect(flagsFor({ ...base, ambiguous: 0.61 })).toEqual(['ambiguous']);
    expect(flagsFor({ ...base, ambiguous: 0.6 })).toEqual([]);
  });
  it('bundled: 0,61 sinaliza, 0,60 não', () => {
    expect(flagsFor({ ...base, bundled: 0.61 })).toEqual(['bundled']);
    expect(flagsFor({ ...base, bundled: 0.6 })).toEqual([]);
  });
  it('testable: 0,59 sinaliza, 0,60 não', () => {
    expect(flagsFor({ ...base, testable: 0.59 })).toEqual(['testable']);
    expect(flagsFor({ ...base, testable: 0.6 })).toEqual([]);
  });
  it('precision: 1,99 sinaliza, 2 não', () => {
    expect(flagsFor({ ...base, precision: 1.99 })).toEqual(['precision']);
    expect(flagsFor({ ...base, precision: 2 })).toEqual([]);
  });
});

describe('formatReport (FND-13)', () => {
  const acs = parseAcs(SPEC);
  const report = formatReport('exemplo', [
    { ac: acs[0], result: { ambiguous: 0.41, bundled: 0.77, testable: 0.55, precision: 2.89 } },
    { ac: acs[1], result: { ambiguous: 0.39, bundled: 0.51, testable: 0.91, precision: 2.91 } },
    { ac: acs[2], result: { error: '529' } },
  ]);
  const rows = report.split('\n').filter((l) => /^\| [A-Z]+-\d+ \|/.test(l));

  it('uma linha por AC com ID, os 4 valores e os julgamentos que sinalizaram', () => {
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatch(/^\| RUN-01 \| 0\.41 \| 0\.77 \| 0\.55 \| 2\.89 \| .*bundled, testable \|$/);
    expect(rows[0]).not.toContain('ok');
  });
  it('AC sem flag vira ok', () => {
    expect(rows[1]).toBe('| RUN-02 | 0.39 | 0.51 | 0.91 | 2.91 | ok |');
  });
  it('AC com erro vira "erro <status>" (FND-24)', () => {
    expect(rows[2]).toContain('| SHOP-01 | erro 529 |');
  });
  it('resume o total e os sinalizados', () => {
    expect(report).toContain('3 ACs, 1 sinalizados');
  });
});

describe('buildRequest', () => {
  it('usa jev-latest, 3 perguntas noul e precision score com 4 níveis', () => {
    const req = buildRequest(parseAcs(SPEC)[0]) as {
      model: string;
      state: { criterion: string; story: string };
      questions: Record<string, { type: string; criteria: unknown }>;
    };
    expect(req.model).toBe('jev-latest');
    expect(req.state.criterion).toBe('WHEN the run starts THEN the game SHALL set round to 1.');
    expect(Object.keys(req.questions).sort()).toEqual(['ambiguous', 'bundled', 'precision', 'testable']);
    for (const q of ['ambiguous', 'bundled', 'testable']) expect(req.questions[q].type).toBe('noul');
    expect(req.questions.precision.type).toBe('score');
    expect(req.questions.precision.criteria).toHaveLength(4);
  });
});
