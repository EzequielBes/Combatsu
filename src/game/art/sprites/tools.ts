/*
 * Ferramentas amaldiçoadas (ARM-19): faca e porrete, com o frame comum e o raro (contorno `A`, RAR-03), os
 * estilhaços recortados do próprio sprite (PRP-01), e os frames na mão do inimigo: `hold-a`/`hold-b` (aura roxa
 * tremulando, ARM-09) e `raised` (preparo, glow `U`). Dados puros (sem `phaser` como valor), mesmo padrão de
 * `sprites/props.ts`.
 */
import { cutShards, type Shard } from './props';

type Grid = readonly string[];

/** Troca o contorno `k` da grade original pela cor dada (aura ou raridade); as demais cores ficam. */
function withOutline(grid: Grid, color: string): string[] {
  return grid.map((row) => [...row].map((ch) => (ch === 'k' ? color : ch)).join(''));
}

/**
 * Adaga fina (3x10 texels): ponta com brilho, lâmina cinza-azulada, o roxo amaldiçoado subindo da guarda, guarda
 * dourada escura e cabo de madeira. O `k` fica só no contorno: `withOutline` troca todo `k` pela cor da aura.
 */
const KNIFE: Grid = ['.k.', 'kwk', 'kSk', 'kSk', 'kUk', 'kvk', 'kzk', 'kMk', 'kmk', 'kkk'];

/** Porrete pesado (5x8 texels): cabeça roxa amaldiçoada com cravos de osso, sombra embaixo e cabo de madeira. */
const CLUB: Grid = ['.kkk.', 'kUlUk', 'kluuk', 'kuuvk', '.kvk.', '.kMk.', '.kmk.', '.kkk.'];

/** Folha de uma ferramenta: comum, rara e as poses na mão do inimigo, todas do mesmo tamanho (ARM-19). */
function toolSheet(grid: Grid): Record<string, string[]> {
  const rare = withOutline(grid, 'A');
  return {
    common: [...grid],
    rare,
    'hold-a': withOutline(grid, 'u'),
    'hold-b': withOutline(grid, 'v'),
    raised: withOutline(grid, 'U'),
    'hold-rare': rare,
  };
}

export const TOOL_FRAMES: Record<'cursedKnife' | 'cursedClub', Record<string, string[]>> = {
  cursedKnife: toolSheet(KNIFE),
  cursedClub: toolSheet(CLUB),
};

/** Estilhaços de cada ferramenta (PRP-01), recortados do frame comum. */
export const TOOL_SHARDS: Record<'cursedKnife' | 'cursedClub', Shard[]> = {
  cursedKnife: cutShards(KNIFE, 2),
  cursedClub: cutShards(CLUB, 2),
};
