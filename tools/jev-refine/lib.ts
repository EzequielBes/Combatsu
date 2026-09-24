// Lógica pura do refinamento de ACs com o Jev (AD-007). Sem Node nem imports locais: a CLI .mjs importa este
// arquivo direto e o Vitest o testa com fakes.

export interface AcRow {
  id: string;
  story: string;
  criterion: string;
}

export interface Answers {
  ambiguous: number;
  bundled: number;
  testable: number;
  precision: number;
}

export type AcResult = Answers | { error: string };

const AC_LINE = /^\s*\d+\.\s+([A-Z]+-\d+):\s+((?:WHEN|WHILE|WHERE|IF|The)\b.*\bSHALL\b.*)$/;

/** ACs numerados `N. ID: WHEN|WHILE|WHERE|IF|The … SHALL`, com a story corrente (título + User Story). */
export function parseAcs(markdown: string): AcRow[] {
  const acs: AcRow[] = [];
  let story = '';
  for (const line of markdown.split(/\r?\n/)) {
    const title = line.match(/^###\s+(.*)/);
    if (title) story = title[1];
    const us = line.match(/^\*\*User Story\*\*:\s*(.*)/);
    if (us) story = `${story}: ${us[1]}`;
    const m = line.match(AC_LINE);
    if (m) acs.push({ id: m[1], story, criterion: m[2] });
  }
  if (acs.length === 0) throw new Error('nenhum AC encontrado');
  return acs;
}

/** Julgamentos que sinalizam o AC (FND-14). */
export function flagsFor(a: Answers): string[] {
  const flags: string[] = [];
  if (a.ambiguous > 0.6) flags.push('ambiguous');
  if (a.bundled > 0.6) flags.push('bundled');
  if (a.testable < 0.6) flags.push('testable');
  if (a.precision < 2) flags.push('precision');
  return flags;
}

const GLOSSARY = {
  jogo: 'Jogo de plataforma e ação 2D (Phaser + Matter), inspirado em Jujutsu Kaisen.',
  run: 'Uma partida roguelite: começa na tela de título e termina quando o player morre.',
  rodada: 'Uma onda numerada de inimigos; termina quando todos os inimigos dela morrem.',
  intermission: 'Intervalo entre rodadas.',
  'window.__game': 'Objeto de teste exposto só no modo debug.',
  AC: 'Critério de aceite em notação EARS (WHEN/WHILE/WHERE/IF ... SHALL).',
};

const QUESTIONS = {
  ambiguous: {
    type: 'noul',
    instructions:
      'Can the acceptance criterion in `criterion` be reasonably read in two materially different ways, such that two developers would implement or test different behavior? Use `story` and `glossary` as context; terms defined in the glossary are not ambiguous.',
    criteria: {
      true: 'Yes: there are at least two materially different readings.',
      false: 'No: a competent developer has a single clear reading.',
    },
  },
  bundled: {
    type: 'noul',
    instructions:
      'Does the acceptance criterion in `criterion` require more than one independent behavior, such that it would need two or more separate tests that could pass or fail independently? A list of values of one single calculation counts as one behavior.',
    criteria: {
      true: 'Yes: it bundles two or more independent behaviors.',
      false: 'No: it describes one behavior.',
    },
  },
  testable: {
    type: 'noul',
    instructions:
      'Can the acceptance criterion in `criterion` be verified by an automated test (unit test on pure game logic, or a scripted headless browser check reading a debug snapshot) that asserts a concrete expected value or state?',
    criteria: {
      true: 'Yes: an automated test with a concrete expected outcome is straightforward.',
      false: 'No: verifying it needs human judgment or the expected outcome is undefined.',
    },
  },
  precision: {
    type: 'score',
    instructions: 'How concretely does the acceptance criterion in `criterion` define its expected outcome?',
    criteria: [
      'Vague: the outcome is described with subjective words (quickly, gracefully, fun) and no measurable value.',
      'Partial: the outcome names what changes but leaves an important value, bound, or condition unspecified.',
      'Concrete: the outcome names the resulting state or value, with minor details left to convention.',
      'Exact: the outcome gives exact values, bounds, texts, or states that a test can assert directly.',
    ],
  },
};

/** Corpo do POST /v1/systemone para um AC. */
export function buildRequest(ac: AcRow): object {
  return { model: 'jev-latest', state: { story: ac.story, criterion: ac.criterion, glossary: GLOSSARY }, questions: QUESTIONS };
}

const f = (x: number): string => x.toFixed(2);

/** Relatório markdown com uma linha por AC (FND-13); AC que falhou vira `erro <status>` (FND-24). */
export function formatReport(name: string, rows: { ac: AcRow; result: AcResult }[]): string {
  let flagged = 0;
  const lines = rows.map(({ ac, result }) => {
    if ('error' in result) return `| ${ac.id} | erro ${result.error} | | | | erro |`;
    const flags = flagsFor(result);
    if (flags.length > 0) flagged++;
    const verdict = flags.length > 0 ? `⚠️ ${flags.join(', ')}` : 'ok';
    return `| ${ac.id} | ${f(result.ambiguous)} | ${f(result.bundled)} | ${f(result.testable)} | ${f(result.precision)} | ${verdict} |`;
  });
  return `# Refinamento Jev — ${name}

Gerado por \`jev-refine\` (Jev, TypeSafe System One). Consultivo (AD-007): cada AC sinalizado é reescrito ou registrado em Assumptions.
Limiares: ambiguous > 0,6 · bundled > 0,6 · testable < 0,6 · precision < 2 (escala 0–3).

**${rows.length} ACs, ${flagged} sinalizados.**

| AC | ambiguous | bundled | testable | precision | resultado |
| --- | --- | --- | --- | --- | --- |
${lines.join('\n')}
`;
}
