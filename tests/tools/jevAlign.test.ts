import { describe, expect, it } from 'vitest';
import { acIndex, alignReport, buildTaskRequest, parseStories, parseTasks } from '../../tools/jev-refine/align';

const SPEC = `### P1: Loja ⭐ MVP

**User Story**: Como jogador, quero comprar upgrades.

1. SHOP-01: WHEN the round ends THEN the run SHALL open the shop.
2. SHOP-02: WHILE the shop is open, no enemy SHALL spawn.

### P2: Reroll

**User Story**: Como jogador, quero rerolar.

1. SHOP-16: WHEN R is pressed THEN the shop SHALL draw 3 offers.
`;

const TASKS = `## Task Breakdown

### T1: Estado shop

**What**: estado shop na run.
**Requirement**: SHOP-01, SHOP-02

**Done when**:

- [ ] abre a loja
- [ ] sem spawn

**Tests**: unit

---

### T2: Reroll

**What**: reroll.
**Requirement**: SHOP-16, SHOP-99

**Done when**:

- [ ] reroll

**Tests**: unit
`;

describe('parse do alinhamento', () => {
  it('resolve os ACs citados por cada task e marca os ausentes', () => {
    const tasks = parseTasks(TASKS, acIndex(SPEC));
    expect(tasks.map((t) => t.id)).toEqual(['T1', 'T2']);
    expect(tasks[0].acs.map((a) => a.id)).toEqual(['SHOP-01', 'SHOP-02']);
    expect(tasks[0].acs[1].criterion).toContain('no enemy SHALL spawn');
    expect(tasks[0].done).toContain('sem spawn');
    expect(tasks[1].acs[1].criterion).toBe('(AC não encontrado na spec)');
  });

  it('lê as stories com seus critérios, sem o selo de MVP', () => {
    const stories = parseStories(SPEC);
    expect(stories.map((s) => s.title)).toEqual(['P1: Loja', 'P2: Reroll']);
    expect(stories[0].criteria).toHaveLength(2);
  });

  it('o pedido da task leva o what, o done e os ACs', () => {
    const [t] = parseTasks(TASKS, acIndex(SPEC));
    const req = buildTaskRequest(t) as { state: { what: string; acs: unknown[] }; questions: object };
    expect(req.state.what).toBe('estado shop na run.');
    expect(req.state.acs).toHaveLength(2);
    expect(Object.keys(req.questions)).toEqual(['covers', 'atomic']);
  });
});

describe('alignReport', () => {
  it('sinaliza nos limiares: covers/atomic < 0,6 e choice < 0,6 ou feedback < 2', async () => {
    const tasks = parseTasks(TASKS, acIndex(SPEC));
    const stories = parseStories(SPEC);
    const answers: Record<string, { noul?: number; score?: number }>[] = [
      { covers: { noul: 0.6 }, atomic: { noul: 0.6 } },
      { covers: { noul: 0.59 }, atomic: { noul: 0.9 } },
      { choice: { noul: 0.6 }, feedback: { score: 2 } },
      { choice: { noul: 0.9 }, feedback: { score: 1.99 } },
    ];
    let i = 0;
    const report = await alignReport('x', tasks, stories, async () => answers[i++]);
    expect(report).toContain('| T1 | 0.60 | 0.60 | ok |');
    expect(report).toContain('| T2 | 0.59 | 0.90 | ⚠️ covers |');
    expect(report).toContain('| P1: Loja | 0.60 | 2.00 | ok |');
    expect(report).toContain('| P2: Reroll | 0.90 | 1.99 | ⚠️ feedback |');
    expect(report).toContain('**2 tasks, 1 sinalizadas.**');
  });

  it('erro da API vira linha de erro sem derrubar o relatório', async () => {
    const report = await alignReport('x', parseTasks(TASKS, acIndex(SPEC)), [], async () => ({ error: '500' }));
    expect(report).toContain('| T1 | erro 500 | | erro |');
  });
});
