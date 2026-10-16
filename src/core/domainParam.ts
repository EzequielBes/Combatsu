import { DOMAIN_CHARGE, DOMAIN_IDS, JACKPOT, type DomainId, type DomainLevel } from '../data/domains';

/** Parâmetros de debug do Domínio (DDB-02): entrada inválida devolve `null` e o parâmetro é ignorado. */

/** Só dígitos: `-1`, `1.5`, vazio e letras ficam de fora. */
const DIGITS = /^\d+$/;

const intIn = (raw: string | null, max: number): number | null => {
  if (raw === null || !DIGITS.test(raw)) return null;
  const n = Number(raw);
  return n <= max ? n : null;
};

const isDomainId = (id: string): id is DomainId => (DOMAIN_IDS as readonly string[]).includes(id);

/** `?domain=<id>[:<nível>]`: nível de 1 a 3, Nv 1 quando falta. */
export const parseDomainParam = (raw: string | null): { id: DomainId; level: DomainLevel } | null => {
  if (!raw) return null;
  const [id = '', level, ...rest] = raw.split(':');
  if (rest.length > 0 || !isDomainId(id)) return null;
  if (level === undefined) return { id, level: 1 };
  const n = intIn(level, 3);
  return n !== null && n >= 1 ? { id, level: n as DomainLevel } : null;
};

/** `?charge=<n>`: inteiro de 0 a 100. */
export const parseChargeParam = (raw: string | null): number | null => intIn(raw, DOMAIN_CHARGE.max);

/** `?jackpotMisses=<n>`: falhas seguidas do Jackpot, inteiro de 0 a `JACKPOT.pityMisses`. */
export const parseMissesParam = (raw: string | null): number | null => intIn(raw, JACKPOT.pityMisses);
