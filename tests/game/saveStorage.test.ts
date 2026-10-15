/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import { SAVE_KEY } from '../../src/core/save';
import { SaveStorage, type StorageLike } from '../../src/game/saveStorage';

/** Storage falso em memória que conta as chamadas e pode lançar em cada ponto. */
function fakeStorage(fail: { get?: boolean; set?: boolean; access?: boolean } = {}) {
  const data = new Map<string, string>();
  const calls = { access: 0, get: 0, set: 0 };
  const storage: StorageLike = {
    getItem(key) {
      calls.get += 1;
      if (fail.get) throw new Error('getItem bloqueado');
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      calls.set += 1;
      if (fail.set) throw new Error('cota cheia');
      data.set(key, value);
    },
  };
  const getStorage = () => {
    calls.access += 1;
    if (fail.access) throw new Error('SecurityError');
    return storage;
  };
  return { data, calls, getStorage };
}

describe('SaveStorage (SAVE-07)', () => {
  it('lê nada, escreve e lê de volta na chave do save', () => {
    const fake = fakeStorage();
    const port = new SaveStorage(fake.getStorage);
    expect(port.read()).toBeNull();
    expect(port.write('{"version":1}')).toBe(true);
    expect(fake.data.get(SAVE_KEY)).toBe('{"version":1}');
    expect(port.read()).toBe('{"version":1}');
    expect(port.kind).toBe('local');
  });

  it('getItem lançando vira memória sem exceção e devolve null', () => {
    const fake = fakeStorage({ get: true });
    const port = new SaveStorage(fake.getStorage);
    expect(() => port.read()).not.toThrow();
    expect(port.kind).toBe('memory');
    expect(port.read()).toBeNull();
  });

  it('setItem lançando vira memória sem exceção e devolve false', () => {
    const fake = fakeStorage({ set: true });
    const port = new SaveStorage(fake.getStorage);
    expect(port.write('x')).toBe(false);
    expect(port.kind).toBe('memory');
  });

  it('o próprio acesso ao storage lançando vira memória', () => {
    const fake = fakeStorage({ access: true });
    const port = new SaveStorage(fake.getStorage);
    expect(port.read()).toBeNull();
    expect(port.kind).toBe('memory');
    expect(port.write('x')).toBe(false);
  });

  it('em memória não chama mais o storage', () => {
    const fake = fakeStorage({ get: true });
    const port = new SaveStorage(fake.getStorage);
    port.read();
    const before = { ...fake.calls };
    expect(port.read()).toBeNull();
    expect(port.write('x')).toBe(false);
    expect(fake.calls).toEqual(before);
    expect(fake.calls.set).toBe(0);
  });

  it('sem window (fora do navegador) o padrão cai para memória', () => {
    const port = new SaveStorage();
    expect(port.read()).toBeNull();
    expect(port.kind).toBe('memory');
  });
});

// Conteúdo bruto de cada .ts de src/, lido pelo Vite.
const sources = import.meta.glob<string>('../../src/**/*.ts', { query: '?raw', import: 'default', eager: true });

describe('única porta do localStorage (SAVE-01)', () => {
  it('lista os .ts de src/', () => {
    expect(Object.keys(sources).some((f) => f.endsWith('/src/game/saveStorage.ts'))).toBe(true);
  });

  it('só game/saveStorage.ts cita localStorage', () => {
    const files = Object.entries(sources)
      .filter(([, text]) => text.includes('localStorage'))
      .map(([file]) => file.replace(/^.*\/src\//, ''));
    expect(files).toEqual(['game/saveStorage.ts']);
  });
});
