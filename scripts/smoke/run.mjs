// Smoke headless (FND-23, FND-11, FND-12): acha o Edge, roda o build, sobe o `vite preview` numa porta livre,
// executa cada scripts/smoke/*.smoke.mjs em ordem alfabética numa página nova e sai com o código de exitCodeFor.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import net from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import { DEFAULT_EDGE_PATHS, exitCodeFor, failedNames, findEdge } from './lib.ts';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const isWindows = process.platform === 'win32';

// 1. Edge
const edge = findEdge(process.env.EDGE_PATH, DEFAULT_EDGE_PATHS, existsSync);
if (!edge) {
  console.error('Edge não encontrado. Caminhos procurados:');
  for (const p of [process.env.EDGE_PATH, ...DEFAULT_EDGE_PATHS].filter(Boolean)) console.error(`  ${p}`);
  process.exit(2);
}

// 2. Build
console.log('> npm run build');
const build = spawnSync('npm run build', { cwd: root, stdio: 'inherit', shell: true });
if (build.status !== 0) {
  console.error('Build falhou.');
  process.exit(1);
}

// 3. Preview numa porta livre
const freePort = () =>
  new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });

const port = await freePort();
const baseUrl = `http://localhost:${port}/`;
const server = spawn(`npx vite preview --port ${port} --strictPort`, {
  cwd: root,
  stdio: 'ignore',
  shell: true,
});

const killServer = () => {
  if (server.exitCode !== null) return;
  // No Windows o shell deixa filhos; mata a árvore inteira.
  if (isWindows) spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
  else server.kill();
};

const waitForServer = async (timeoutMs) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(baseUrl, { signal: AbortSignal.timeout(1000) });
      if (res.ok) return true;
    } catch {
      // ainda subindo
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
};

if (!(await waitForServer(30_000))) {
  console.error(`vite preview não respondeu em ${baseUrl}`);
  killServer();
  process.exit(1);
}

// 4. Cenários
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

const files = readdirSync(here)
  .filter((f) => f.endsWith('.smoke.mjs'))
  // `npm run smoke -- <trecho>` roda só os cenários cujo nome contém o trecho (iteração rápida).
  .filter((f) => !process.argv[2] || f.includes(process.argv[2]))
  .sort();

const results = [];
const browser = await puppeteer.launch({
  executablePath: edge,
  headless: true,
  args: ['--use-angle=swiftshader', '--no-sandbox'],
});
try {
  for (const name of files) {
    const page = await browser.newPage();
    try {
      const mod = await import(pathToFileURL(join(here, name)).href);
      await mod.default({ page, baseUrl, assert });
      results.push({ name, ok: true });
      console.log(`ok    ${name}`);
    } catch (err) {
      results.push({ name, ok: false });
      console.log(`FALHA ${name}: ${err instanceof Error ? err.message : err}`);
    } finally {
      await page.close().catch(() => {});
    }
  }
} finally {
  await browser.close().catch(() => {});
  killServer();
}

// 5. Resultado
const failed = failedNames(results);
if (failed.length > 0) {
  console.log(`\n${failed.length} cenário(s) falharam:`);
  for (const n of failed) console.log(`  ${n}`);
} else {
  console.log(`\n${results.length} cenário(s) ok`);
}
process.exit(exitCodeFor(results));
