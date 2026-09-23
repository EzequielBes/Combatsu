/*
 * Molduras das barras de vida (HUD-01/02) em pixel art. Dados puros (sem `phaser` como valor). A parte que enche
 * fica no "poço" escuro de cada moldura; o adaptador desenha o preenchimento em passos de 1 texel.
 */

/** Área interna (em texels) onde entra o preenchimento da barra. */
export interface Well {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Moldura de `w x h` texels: contorno escuro com cantos cortados, aro claro de 1 texel (legível contra o fundo
 * noturno escuro) e poço escuro.
 */
function frame(w: number, h: number): { grid: string[]; well: Well } {
  const edge = 2;
  const grid = Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => {
      const border = x === 0 || y === 0 || x === w - 1 || y === h - 1;
      const corner = (x === 0 || x === w - 1) && (y === 0 || y === h - 1);
      if (corner) return '.';
      if (border) return 'k';
      if (x === 1 || y === 1 || x === w - 2 || y === h - 2) return 'S';
      return 'K';
    }).join(''),
  );
  return { grid, well: { x: edge, y: edge, w: w - 2 * edge, h: h - 2 * edge } };
}

const PLAYER = frame(56, 8);
const ENEMY = frame(16, 6);

/** Barra do player (HUD-01): 56x8 texels (112x16 px), poço de 52x4 texels. */
export const HUD_BAR = PLAYER.grid;
export const HUD_BAR_WELL: Well = PLAYER.well;
/** Barra acima do inimigo (HUD-02): 16x6 texels (32x12 px), poço de 12x2 texels, no mesmo estilo da do player. */
export const ENEMY_BAR = ENEMY.grid;
export const ENEMY_BAR_WELL: Well = ENEMY.well;
