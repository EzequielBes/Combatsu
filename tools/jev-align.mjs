// Alinhamento dos planos com o Jev: node tools/jev-align.mjs <pasta-da-feature> grava alignment.md na pasta.
// Confere tasks × ACs (cobertura e atomicidade) e stories × diversão. Chave como no jev-refine (nunca impressa).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { JevAuthError, postWithRetry, readKey } from './jev-refine/lib.ts';
import { acIndex, alignReport, parseStories, parseTasks } from './jev-refine/align.ts';

const dir = process.argv[2];
if (!dir) {
  console.error('uso: node tools/jev-align.mjs <pasta-da-feature>');
  process.exit(1);
}
const envLocal = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : null;
const key = readKey(process.env, envLocal);
if (!key) {
  console.warn('Aviso: TYPESAFE_API_KEY não encontrada (ambiente ou .env.local); alinhamento Jev pulado.');
  process.exit(0);
}
const spec = readFileSync(join(dir, 'spec.md'), 'utf8');
const tasksPath = join(dir, 'tasks.md');
const tasks = existsSync(tasksPath) ? parseTasks(readFileSync(tasksPath, 'utf8'), acIndex(spec)) : [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  const report = await alignReport(basename(dir), tasks, parseStories(spec), async (request) => {
    const r = await postWithRetry(request, key, fetch, sleep);
    return 'error' in r ? r : r.answers;
  });
  writeFileSync(join(dir, 'alignment.md'), report);
  console.log(report);
} catch (err) {
  if (err instanceof JevAuthError) {
    console.error(err.message);
    process.exit(1);
  }
  throw err;
}
