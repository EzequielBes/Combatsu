/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';

// Conteúdo bruto de cada .ts do núcleo e dos dados, lido pelo Vite (sem depender dos tipos do Node).
const sources = import.meta.glob<string>(['../../src/core/**/*.ts', '../../src/data/**/*.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

describe('núcleo sem Math.random (FND-04, AD-006)', () => {
  it('lista os .ts de src/core e src/data', () => {
    const files = Object.keys(sources);
    expect(files.some((f) => f.includes('/src/core/'))).toBe(true);
    expect(files.some((f) => f.includes('/src/data/'))).toBe(true);
  });

  it('nenhum arquivo cita Math.random', () => {
    const offenders = Object.entries(sources)
      .filter(([, text]) => text.includes('Math.random'))
      .map(([file]) => file);
    expect(offenders).toEqual([]);
  });
});
