/// <reference types="vite/client" />
import orbSource from '../../src/game/techFx/RedOrb.ts?raw';
import detonationSource from '../../src/game/techFx/redDetonation.ts?raw';
import { describe, expect, it } from 'vitest';

/** As vistas do Vermelho moram em dois arquivos; a regra de cor vale para os dois. */
const source = `${orbSource}
${detonationSource}`;

describe('RDA-14: o RedOrbFx só lê cores de RED_FX_COLORS', () => {
  const allowed = new Set(['b', 't', 'T', 'R', 'W']);

  it('nenhum PALETTE.<chave> fora de {b, t, T, R, W} (nem a, nem A)', () => {
    const keys = [...source.matchAll(/\bPALETTE\.([A-Za-z])\b/g)].map((m) => m[1]);
    for (const k of keys) expect(allowed.has(k), `PALETTE.${k}`).toBe(true);
  });

  it('todo acesso PALETTE[...] passa por RED_FX_COLORS', () => {
    const accesses = [...source.matchAll(/\bPALETTE\[([^\]]+)\]/g)].map((m) => m[1]);
    expect(accesses.length).toBeGreaterThan(0);
    for (const a of accesses) expect(a, a).toMatch(/^RED_FX_COLORS\.\w+$/);
  });
});
