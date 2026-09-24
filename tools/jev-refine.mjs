// Refinamento de ACs com o Jev (AD-007): node tools/jev-refine.mjs <spec.md> grava refinement.md ao lado da spec.
// A chave vem de TYPESAFE_API_KEY ou do .env.local e nunca é impressa nem gravada (FND-18).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { JevAuthError, askWithRetry, formatReport, parseAcs, readKey } from './jev-refine/lib.ts';

const CONCURRENCY = 4;
const specPath = process.argv[2];
if (!specPath) {
  console.error('uso: node tools/jev-refine.mjs <spec.md>');
  process.exit(1);
}

const envLocal = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : null;
const key = readKey(process.env, envLocal);
if (!key) {
  console.warn('Aviso: TYPESAFE_API_KEY não encontrada (ambiente ou .env.local); refinamento Jev pulado.');
  process.exit(0);
}

let acs;
try {
  acs = parseAcs(readFileSync(specPath, 'utf8'));
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rows = [];
try {
  for (let i = 0; i < acs.length; i += CONCURRENCY) {
    const batch = acs.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map((ac) => askWithRetry(ac, key, fetch, sleep)));
    batch.forEach((ac, j) => rows.push({ ac, result: results[j] }));
  }
} catch (err) {
  if (err instanceof JevAuthError) {
    console.error(err.message);
    process.exit(1);
  }
  throw err;
}

const folder = dirname(specPath);
const outPath = join(folder, 'refinement.md');
let report = formatReport(basename(folder), rows);
// Preserva a revisão escrita à mão: tudo a partir de "## Revisão do autor" no arquivo anterior volta ao fim.
if (existsSync(outPath)) {
  const old = readFileSync(outPath, 'utf8');
  const at = old.indexOf('## Revisão do autor');
  if (at >= 0) report += `\n${old.slice(at)}`;
}
writeFileSync(outPath, report);
console.log(report);
