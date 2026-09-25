// Alinhamento dos planos com o Jev (AD-007, estendido na F4): confere se cada task cobre os ACs que cita e é
// atômica, e se cada story dá ao jogador uma escolha ou sensação que vale jogar. Puro e sem imports locais (como
// lib.ts): a CLI injeta `ask`, feito com `postWithRetry`.

export interface TaskRow {
  id: string;
  title: string;
  what: string;
  done: string;
  acs: { id: string; criterion: string }[];
}

export interface StoryRow {
  title: string;
  story: string;
  criteria: string[];
}

const AC_LINE = /^\s*\d+\.\s+([A-Z]+-\d+):\s+(.*\bSHALL\b.*)$/;

/** Mapa id → texto de todos os ACs da spec. */
export function acIndex(spec: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of spec.split(/\r?\n/)) {
    const m = line.match(AC_LINE);
    if (m) map.set(m[1], m[2]);
  }
  return map;
}

/** Tasks `### Tn: título` com What, Done when e os ACs de `**Requirement**` resolvidos na spec. */
export function parseTasks(tasks: string, acs: Map<string, string>): TaskRow[] {
  const rows: TaskRow[] = [];
  for (const block of tasks.split(/^### /m).slice(1)) {
    const head = block.match(/^(T\d+):\s*(.*)/);
    if (!head) continue;
    const what = block.match(/\*\*What\*\*:\s*(.*)/)?.[1] ?? '';
    const req = block.match(/\*\*Requirement\*\*:\s*(.*)/)?.[1] ?? '';
    const doneAt = block.indexOf('**Done when**');
    const done = doneAt >= 0 ? block.slice(doneAt, block.indexOf('**Tests**', doneAt)).trim() : '';
    const ids = req.match(/[A-Z]+-\d+/g) ?? [];
    rows.push({ id: head[1], title: head[2].trim(), what, done, acs: ids.map((id) => ({ id, criterion: acs.get(id) ?? '(AC não encontrado na spec)' })) });
  }
  return rows;
}

/** Stories `### Pn: título` com a User Story e os critérios. */
export function parseStories(spec: string): StoryRow[] {
  const rows: StoryRow[] = [];
  for (const block of spec.split(/^### /m).slice(1)) {
    const title = block.match(/^(P\d:.*)/)?.[1]?.replace('⭐ MVP', '').trim();
    const story = block.match(/\*\*User Story\*\*:\s*(.*)/)?.[1];
    if (!title || !story) continue;
    const criteria = block.split(/\r?\n/).flatMap((l) => l.match(AC_LINE)?.[2] ?? []);
    rows.push({ title, story, criteria });
  }
  return rows;
}

const TASK_QUESTIONS = {
  covers: {
    type: 'noul',
    instructions:
      'Would implementing exactly what `what` and `done` describe satisfy every acceptance criterion in `acs`? Answer no if any criterion in `acs` is not addressed by the task description or its done list.',
    criteria: { true: 'Yes: every listed criterion is addressed.', false: 'No: at least one listed criterion is not addressed.' },
  },
  atomic: {
    type: 'noul',
    instructions:
      'Is this task one cohesive unit of work that a developer can finish, test and commit on its own, without mixing unrelated concerns?',
    criteria: { true: 'Yes: one cohesive, committable unit.', false: 'No: it mixes unrelated work and should be split.' },
  },
};

const STORY_QUESTIONS = {
  choice: {
    type: 'noul',
    instructions:
      'In this action roguelite game, does the story in `story`, as detailed by `criteria`, give the player a meaningful decision or a noticeable change in how the game feels to play?',
    criteria: { true: 'Yes: the player makes a real choice or feels a clear difference.', false: 'No: it is invisible or has no decision for the player.' },
  },
  feedback: {
    type: 'score',
    instructions: 'How clearly do `criteria` specify the feedback the player sees or feels when this story happens?',
    criteria: [
      'None: no visible or felt feedback is specified.',
      'Weak: feedback is implied but not specified.',
      'Clear: the main feedback is specified.',
      'Rich: feedback is specified with concrete visuals, numbers or texts.',
    ],
  },
};

export function buildTaskRequest(t: TaskRow): object {
  return { model: 'jev-latest', state: { what: t.what, done: t.done, acs: t.acs }, questions: TASK_QUESTIONS };
}

export function buildStoryRequest(s: StoryRow): object {
  return { model: 'jev-latest', state: { story: s.story, criteria: s.criteria }, questions: STORY_QUESTIONS };
}

export type Ask = (request: object) => Promise<Record<string, { noul?: number; score?: number }> | { error: string }>;

const f = (x: number | undefined): string => (x ?? 0).toFixed(2);

/** Relatório `alignment.md`: task sinalizada se covers < 0,6 ou atomic < 0,6; story se choice < 0,6 ou feedback < 2. */
export async function alignReport(name: string, tasks: TaskRow[], stories: StoryRow[], ask: Ask): Promise<string> {
  const taskLines: string[] = [];
  let taskFlags = 0;
  for (const t of tasks) {
    const a = await ask(buildTaskRequest(t));
    if ('error' in a) {
      taskLines.push(`| ${t.id} | erro ${a.error} | | erro |`);
      continue;
    }
    const flags = [a.covers.noul! < 0.6 && 'covers', a.atomic.noul! < 0.6 && 'atomic'].filter(Boolean);
    if (flags.length) taskFlags++;
    taskLines.push(`| ${t.id} | ${f(a.covers.noul)} | ${f(a.atomic.noul)} | ${flags.length ? `⚠️ ${flags.join(', ')}` : 'ok'} |`);
  }
  const storyLines: string[] = [];
  let storyFlags = 0;
  for (const s of stories) {
    const a = await ask(buildStoryRequest(s));
    if ('error' in a) {
      storyLines.push(`| ${s.title} | erro ${a.error} | | erro |`);
      continue;
    }
    const flags = [a.choice.noul! < 0.6 && 'choice', a.feedback.score! < 2 && 'feedback'].filter(Boolean);
    if (flags.length) storyFlags++;
    storyLines.push(`| ${s.title} | ${f(a.choice.noul)} | ${f(a.feedback.score)} | ${flags.length ? `⚠️ ${flags.join(', ')}` : 'ok'} |`);
  }
  return `# Alinhamento Jev — ${name}

Gerado por \`jev-align\` (Jev, TypeSafe System One). Consultivo: task sinalizada é reescrita ou justificada; story sinalizada ganha feedback ou escolha no polimento.
Limiares: covers < 0,6 · atomic < 0,6 · choice < 0,6 · feedback < 2 (escala 0–3).

## Tasks × ACs

**${tasks.length} tasks, ${taskFlags} sinalizadas.**

| Task | covers | atomic | resultado |
| --- | --- | --- | --- |
${taskLines.join('\n')}

## Stories × diversão

**${stories.length} stories, ${storyFlags} sinalizadas.**

| Story | choice | feedback | resultado |
| --- | --- | --- | --- |
${storyLines.join('\n')}
`;
}
