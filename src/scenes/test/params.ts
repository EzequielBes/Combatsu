import { isDebug } from '../../game/debug';
import { type InputSnapshot } from '../../game/input';

/** Parâmetro de URL que só vale em `?debug` (SHOP-23, SHOP-47); fora do debug, sempre `null`. */
export function debugParam(name: string): string | null {
  return isDebug() ? new URLSearchParams(window.location.search).get(name) : null;
}

/** Parâmetro de URL inteiro `>= min` só em `?debug` (`maxAlive`, `mastery`); ausente ou inválido vira `undefined`. */
export function debugIntParam(name: string, min: number): number | undefined {
  const raw = debugParam(name);
  if (raw === null || raw.trim() === '') return undefined;
  const n = Number(raw);
  return Number.isInteger(n) && n >= min ? n : undefined;
}

/** Input neutro (RUN-08): fora de `roundActive`/`intermission` o player ignora tudo, mas o input continua sendo
 * lido (para não vazar um `JustDown` represado quando a run volta a aceitar). */
export const NEUTRAL_INPUT: InputSnapshot = {
  left: false,
  right: false,
  down: false,
  jumpPressed: false,
  jumpHeld: false,
  jumpWPressed: false,
  upHeld: false,
  lightPressed: false,
  heavyPressed: false,
  heavyHeld: false,
  bothPressed: false,
  guardHeld: false,
  guardPressed: false,
  dodgePressed: false,
  interactPressed: false,
};

/** Ferramenta amaldiçoada largada (chave em `TOOL_DEFS`, comum ou rara), nunca um objeto do mapa. */
export const isDroppedTool = (key: string): boolean => key.startsWith('cursed');

export const SPAWN_LIFT = 2;
