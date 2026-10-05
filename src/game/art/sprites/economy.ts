/*
 * Fragmento amaldiçoado (ECO-23) e gota de cura (HEAL): pixel art em grade de texto, só com chaves da `PALETTE`.
 * Dados puros (sem `phaser` como valor), no mesmo padrão de `sprites/props.ts`.
 */

type Grid = readonly string[];

/**
 * Cristal roxo do fragmento (5x7 texels): um losango com contorno `k` e um brilho interno em `v`/`u`/`U` que
 * cintila entre os dois frames (spec: "cintila em 2 frames").
 */
const FRAGMENT_A: Grid = ['..k..', '.kUk.', 'kUuUk', 'kuvuk', 'kuvuk', '.kvk.', '..k..'];
const FRAGMENT_B: Grid = ['..k..', '.kuk.', 'kuUuk', 'kUvUk', 'kUvUk', '.kvk.', '..k..'];

/** Folha do fragmento (2 frames, para o cintilar, ECO-23). */
export const FRAGMENT_FRAMES: Record<string, Grid> = { a: FRAGMENT_A, b: FRAGMENT_B };

/** Ícone do contador de fragmentos no HUD: o mesmo cristal, 1 frame (ECO-23). */
export const FRAGMENT_ICON: Grid = FRAGMENT_A;

/**
 * Gota de cura (6x8 texels): verde (`g`/`G`) com um brilho branco (`w`) no topo, pulsando devagar entre os frames.
 */
const HEAL_A: Grid = ['..kk..', '.kwGk.', 'kGggGk', 'kgggGk', 'kgggGk', 'kgggGk', '.kgGk.', '..kk..'];
const HEAL_B: Grid = ['..kk..', '.kGgk.', 'kgGGgk', 'kGGGgk', 'kGGGgk', 'kGGGgk', '.kGgk.', '..kk..'];

/** Folha da gota de cura (2 frames, para o pulsar). */
export const HEAL_FRAMES: Record<string, Grid> = { a: HEAL_A, b: HEAL_B };
