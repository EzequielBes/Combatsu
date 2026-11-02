import { DOMAIN_IDS, type DomainId } from '../data/domains';
import type { Rng } from './rng';

/**
 * Baú do Véu (VEU-02): dois Domínios diferentes dos três, sorteados pelo `chestRng`. Sorteia o primeiro entre os três
 * e o segundo entre os dois que sobram, então a mesma seed dá sempre o mesmo par.
 */
export function drawVeil(rng: Rng): [DomainId, DomainId] {
  const pool = [...DOMAIN_IDS];
  const first = pool.splice(rng.int(0, pool.length - 1), 1)[0]!;
  const second = pool[rng.int(0, pool.length - 1)]!;
  return [first, second];
}
