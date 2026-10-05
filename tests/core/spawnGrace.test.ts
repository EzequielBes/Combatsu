import { describe, expect, it } from 'vitest';
import { SpawnGrace } from '../../src/core/spawnGrace';

describe('SpawnGrace: janela de 600 ms (WAVE-09)', () => {
  it('ativo em 0 ms', () => {
    const g = new SpawnGrace(600);
    expect(g.active).toBe(true);
  });

  it('ainda ativo depois de 599 ms somados', () => {
    const g = new SpawnGrace(600);
    g.update(599);
    expect(g.active).toBe(true);
  });

  it('inativo exatamente em 600 ms', () => {
    const g = new SpawnGrace(600);
    g.update(600);
    expect(g.active).toBe(false);
  });

  it('continua inativo depois de 600 ms', () => {
    const g = new SpawnGrace(600);
    g.update(600);
    g.update(1000);
    expect(g.active).toBe(false);
  });

  it('soma de updates pequenos dá o mesmo resultado que um update grande', () => {
    const small = new SpawnGrace(600);
    for (let i = 0; i < 600; i++) small.update(1);
    const big = new SpawnGrace(600);
    big.update(600);
    expect(small.active).toBe(big.active);
    expect(small.active).toBe(false);
  });

  it('soma de updates pequenos que ainda não chegou a 600 ms continua ativo, igual ao equivalente', () => {
    const small = new SpawnGrace(600);
    for (let i = 0; i < 599; i++) small.update(1);
    const big = new SpawnGrace(600);
    big.update(599);
    expect(small.active).toBe(big.active);
    expect(small.active).toBe(true);
  });
});
