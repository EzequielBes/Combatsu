import type { CoreModifierId } from '../data/shop';

/** Ids aceitos no `?mods=`: o `Record` obriga a listar todo `CoreModifierId` (POW-13). */
const CORE_IDS: Record<CoreModifierId, true> = { vida: true, forca: true, agilidade: true, ima: true, sorte: true };

const isCoreId = (id: string): id is CoreModifierId => Object.hasOwn(CORE_IDS, id);

/** Nível válido: só dígitos e maior que zero (`-1`, `0`, `1.5` e vazio ficam de fora). */
const LEVEL = /^\d+$/;

/**
 * Lê o parâmetro de debug `?mods=<id>:<n>[,<id>:<n>]` e devolve os pares que valem (POW-13.2). Entrada com id
 * desconhecido ou nível que não é inteiro positivo some sem derrubar o resto (POW-13.3). O teto de nível não é
 * aplicado aqui: quem aplica é o `modifiers.apply`.
 */
export const parseModsParam = (raw: string | null): [CoreModifierId, number][] => {
  if (!raw) return [];
  const pairs: [CoreModifierId, number][] = [];
  for (const entry of raw.split(',')) {
    const [id = '', level = '', ...rest] = entry.trim().split(':');
    const n = Number(level);
    if (rest.length > 0 || !isCoreId(id) || !LEVEL.test(level) || n <= 0) continue;
    pairs.push([id, n]);
  }
  return pairs;
};
