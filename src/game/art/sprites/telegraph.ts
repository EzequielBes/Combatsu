/*
 * Marcador de telegrafo (HGT-09): o ícone sobre a cabeça do inimigo durante o preparo e o golpe, 7x7 texels, um frame
 * por tipo de golpe. A forma já diz o tipo sem depender da cor: `!` branco (`white`), `×` carmim (`red`), `▼` âmbar
 * (`low`), todos com contorno `k`. A cor de cada um é a `KIND_COLOR` do tipo (a mesma do flash de compromisso).
 * Dados puros (sem `phaser` como valor), no mesmo padrão de `sprites/economy.ts`.
 */
import type { AttackKind } from '../../../core/attackKind';

type Grid = readonly string[];

/** `!` em `w`: haste larga que afina e um ponto, separados por uma linha de contorno. */
const WHITE: Grid = ['..kkk..', '.kwwwk.', '.kwwwk.', '..kwk..', '..kkk..', '..kwk..', '..kkk..'];

/** `×` em `t`: duas diagonais de 1 texel, o contorno `k` por fora de cada uma. */
const RED: Grid = ['.k...k.', 'ktk.ktk', '.ktktk.', '..ktk..', '.ktktk.', 'ktk.ktk', '.k...k.'];

/** `▼` em `A`: triângulo para baixo, a ponta no contorno de baixo. */
const LOW: Grid = ['kkkkkkk', 'kAAAAAk', 'kAAAAAk', '.kAAAk.', '.kAAAk.', '..kAk..', '...k...'];

/** Folha do marcador: o nome do frame é o tipo do golpe (HGT-07). */
export const TELEGRAPH_FRAMES: Record<AttackKind, Grid> = { white: WHITE, red: RED, low: LOW };
