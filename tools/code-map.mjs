/*
 * Mapa do código sob demanda, para achar o arquivo certo sem abrir a base inteira.
 *
 *   npm run map                 resumo por pasta (arquivos e linhas)
 *   npm run map -- game/tech    um arquivo por linha: tamanho, o que faz e o que exporta
 *   npm run map -- enemy boss   vários filtros (trecho do caminho); basta casar um
 *
 * Nada é gravado em disco: o mapa sai sempre do código atual, então não envelhece.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['src', 'tests', 'scripts', 'tools'];
const CODE = /\.(ts|mjs)$/;
const SUMMARY_MAX = 100;
const EXPORTS_MAX = 6;

/** Todos os arquivos de código sob `dir`, com `/` no caminho em qualquer sistema. */
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return walk(path);
    return CODE.test(entry.name) ? [path] : [];
  });
}

/** Primeira frase de um comentário de bloco, sem os asteriscos. */
function firstSentence(block) {
  const text = block
    .replace(/^\/\*+|\*+\/$/g, '')
    .replace(/^\s*\*\s?/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
  const sentence = text.match(/^.*?\.(?=\s|$)/)?.[0] ?? text;
  return sentence.length > SUMMARY_MAX ? `${sentence.slice(0, SUMMARY_MAX - 1)}…` : sentence;
}

/** O que o arquivo faz: o comentário da classe exportada, senão o primeiro comentário de bloco. */
function summaryOf(source) {
  const ofClass = source.match(/(\/\*\*(?:(?!\*\/)[\s\S])*\*\/)\s*export (?:abstract )?class /);
  const block = ofClass?.[1] ?? source.match(/\/\*[\s\S]*?\*\//)?.[0];
  return block ? firstSentence(block) : '';
}

function exportsOf(source) {
  const names = [
    ...source.matchAll(/^export (?:default )?(?:abstract )?(?:class|function|const|interface|type|enum) (\w+)/gm),
  ].map((m) => m[1]);
  const shown = names.slice(0, EXPORTS_MAX).join(', ');
  return names.length > EXPORTS_MAX ? `${shown} +${names.length - EXPORTS_MAX}` : shown;
}

function describe(path) {
  const source = readFileSync(join(process.cwd(), path), 'utf8');
  return { path, lines: source.split('\n').length, summary: summaryOf(source), exports: exportsOf(source) };
}

function printFolders(files) {
  const folders = new Map();
  for (const file of files) {
    const dir = file.path.slice(0, file.path.lastIndexOf('/'));
    const sum = folders.get(dir) ?? { count: 0, lines: 0 };
    folders.set(dir, { count: sum.count + 1, lines: sum.lines + file.lines });
  }
  for (const [dir, sum] of folders) console.log(`${dir}/  ${sum.count} arquivos, ${sum.lines} linhas`);
  console.log('\nDetalhe de uma pasta ou arquivo: npm run map -- <trecho do caminho>');
}

function printFiles(files) {
  for (const file of files) {
    const parts = [`${file.path} (${file.lines})`, file.summary, file.exports && `[${file.exports}]`];
    console.log(parts.filter(Boolean).join(' — '));
  }
}

const filters = process.argv.slice(2).map((arg) => arg.replaceAll('\\', '/').toLowerCase());
const files = ROOTS.flatMap(walk)
  .filter((path) => filters.length === 0 || filters.some((f) => path.toLowerCase().includes(f)))
  .sort()
  .map(describe);

if (filters.length === 0) printFolders(files);
else if (files.length === 0) console.log('Nenhum arquivo casa com o filtro.');
else printFiles(files);
