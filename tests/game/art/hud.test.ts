import { describe, expect, it } from 'vitest';
import { parseSheet } from '../../../src/core/pixelGrid';
// Importar no Vitest (Node, sem window) já prova que a paleta não carrega o `phaser` como valor.
import { PALETTE, PALETTE_KEYS } from '../../../src/game/art/palette';
import {
  COMBO_GRADE_COLORS,
  COMBO_TEXT_COLOR,
  STRUCTURE_BAR_BG_COLOR,
  STRUCTURE_BAR_BREAK_COLOR,
  STRUCTURE_BAR_FILL_COLOR,
} from '../../../src/game/art/combatColors';
import { ENEMY_BAR, ENEMY_BAR_WELL, HUD_BAR, HUD_BAR_WELL } from '../../../src/game/art/hud';
import {
  BOSS_BAR_BG_COLOR,
  BOSS_BAR_FILL_COLOR,
  BOSS_BAR_MARK_COLOR,
  BOSS_BAR_NAME_COLOR,
  RUN_BG_COLOR,
  RUN_TEXT_COLOR,
} from '../../../src/game/Hud';

describe('cores do HUD da run (RHUD-04)', () => {
  it('o texto e o fundo dos elementos novos (rodada, faixa, título/game over) são cores da paleta', () => {
    expect(Object.values(PALETTE)).toContain(RUN_TEXT_COLOR);
    expect(Object.values(PALETTE)).toContain(RUN_BG_COLOR);
  });
});

describe('cores da barra do chefe (BHUD-06)', () => {
  it('preenchimento, fundo, marcas e nome são cores da paleta', () => {
    for (const c of [BOSS_BAR_FILL_COLOR, BOSS_BAR_BG_COLOR, BOSS_BAR_MARK_COLOR, BOSS_BAR_NAME_COLOR]) {
      expect(Object.values(PALETTE)).toContain(c);
    }
  });
});

describe('molduras das barras de vida (HUD-01/02, ART-01)', () => {
  it('passam no parseSheet só com cores da paleta, com o poço dentro da moldura e pintado de K', () => {
    for (const [name, grid, well] of [
      ['hud-bar', HUD_BAR, HUD_BAR_WELL],
      ['enemy-bar', ENEMY_BAR, ENEMY_BAR_WELL],
    ] as const) {
      const sheet = parseSheet(name, { [name]: grid }, PALETTE_KEYS);
      expect(well.x + well.w, name).toBeLessThan(sheet.width);
      expect(well.y + well.h, name).toBeLessThan(sheet.height);
      for (let y = well.y; y < well.y + well.h; y++) {
        for (let x = well.x; x < well.x + well.w; x++) expect(grid[y][x], `${name} (${x}, ${y})`).toBe('K');
      }
    }
  });
});

describe('cores da barra de estrutura e do combo (STR-09)', () => {
  it('fundo, preenchimento e quebra da barra de estrutura são cores da paleta', () => {
    for (const c of [STRUCTURE_BAR_BG_COLOR, STRUCTURE_BAR_FILL_COLOR, STRUCTURE_BAR_BREAK_COLOR]) {
      expect(Object.values(PALETTE)).toContain(c);
    }
  });

  it('o texto do combo e as 5 notas (D/C/B/A/S) são cores da paleta, cada uma diferente da anterior', () => {
    expect(Object.values(PALETTE)).toContain(COMBO_TEXT_COLOR);
    const order: Array<'D' | 'C' | 'B' | 'A' | 'S'> = ['D', 'C', 'B', 'A', 'S'];
    for (const grade of order) expect(Object.values(PALETTE)).toContain(COMBO_GRADE_COLORS[grade]);
    for (let i = 1; i < order.length; i++) {
      expect(COMBO_GRADE_COLORS[order[i]], order[i]).not.toBe(COMBO_GRADE_COLORS[order[i - 1]]);
    }
  });
});
