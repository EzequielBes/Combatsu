import { describe, expect, it } from 'vitest';
import type { PlayerAnim } from '../../src/core/animState';
import { TILE, type TileVariant } from '../../src/core/level';
import { TRANSPARENT, parseSheet } from '../../src/core/pixelGrid';
// Importar no Vitest (Node, sem window) já prova que a paleta não carrega o `phaser` como valor.
import { ART_SCALE, PALETTE, PALETTE_KEYS } from '../../src/game/art/palette';
import { PLAYER_ANIMS, PLAYER_FRAMES, PLAYER_FRAME_H, PLAYER_FRAME_W, PLAYER_ORIGIN } from '../../src/game/art/sprites/player';
import { TILE_FRAMES, tileFrameFor } from '../../src/game/art/tiles';
import { PLAYER_COMBO } from '../../src/data/tuning';

describe('paleta única (ART-01)', () => {
  it('tem no máximo 32 cores, cada uma com chave de 1 caractere', () => {
    const keys = Object.keys(PALETTE);
    expect(keys.length).toBeGreaterThan(0);
    expect(keys.length).toBeLessThanOrEqual(32);
    for (const k of keys) expect([...k]).toHaveLength(1);
  });

  it('reserva "." para transparente: não está na paleta', () => {
    expect(TRANSPARENT).toBe('.');
    expect(Object.hasOwn(PALETTE, '.')).toBe(false);
    expect(PALETTE_KEYS.has('.')).toBe(false);
  });

  it('só tem cores válidas entre 0x000000 e 0xffffff', () => {
    for (const color of Object.values(PALETTE)) {
      expect(Number.isInteger(color)).toBe(true);
      expect(color).toBeGreaterThanOrEqual(0x000000);
      expect(color).toBeLessThanOrEqual(0xffffff);
    }
  });

  it('PALETTE_KEYS tem exatamente as chaves da paleta', () => {
    expect([...PALETTE_KEYS].sort()).toEqual(Object.keys(PALETTE).sort());
  });
});

describe('escala de texel (ART-03)', () => {
  it('1 texel de arte = 2 px de mundo', () => {
    expect(ART_SCALE).toBe(2);
  });
});

describe('tileset (ENV-01, ART-01)', () => {
  const VARIANTS: TileVariant[] = [
    'top',
    'middle',
    'left',
    'right',
    'top-left',
    'top-right',
    'thin',
    'thin-left',
    'thin-right',
  ];

  it('a folha passa no parseSheet só com cores da paleta, em tiles de 16x16 texels (32 px)', () => {
    const sheet = parseSheet('tiles', TILE_FRAMES, PALETTE_KEYS);
    expect(sheet.width * ART_SCALE).toBe(TILE);
    expect(sheet.height * ART_SCALE).toBe(TILE);
  });

  it('tem um frame para cada variante do ENV-01', () => {
    for (const v of VARIANTS) expect(Object.keys(TILE_FRAMES)).toContain(v);
  });

  it('tileFrameFor sempre devolve um frame da folha daquela variante, igual para a mesma posição', () => {
    for (const v of VARIANTS) {
      for (let tx = 0; tx < 20; tx++) {
        for (let ty = 0; ty < 10; ty++) {
          const key = tileFrameFor(v, tx, ty);
          expect(Object.hasOwn(TILE_FRAMES, key)).toBe(true);
          expect(key === v || key.startsWith(`${v}~`)).toBe(true);
          expect(tileFrameFor(v, tx, ty)).toBe(key);
        }
      }
    }
  });
});

describe('folha do player (CHR-01, ART-01, ART-03)', () => {
  const sheet = parseSheet('player', PLAYER_FRAMES, PALETTE_KEYS);
  const CHR01: PlayerAnim[] = [
    'idle',
    'run',
    'jump',
    'fall',
    'jab',
    'cross',
    'kick',
    'carry-idle',
    'carry-run',
    'swing',
    'throw',
    'hurt',
  ];

  it('passa no parseSheet só com cores da paleta, todos os frames do mesmo tamanho', () => {
    expect(sheet.width).toBe(PLAYER_FRAME_W);
    expect(sheet.height).toBe(PLAYER_FRAME_H);
    // 24 texels de altura = 48 px com ART_SCALE 2, como no spec.
    expect(sheet.height * ART_SCALE).toBe(48);
  });

  it('toda animação do CHR-01 existe e tem pelo menos um frame, e todo frame citado existe na folha', () => {
    for (const name of CHR01) {
      const anim = PLAYER_ANIMS[name];
      expect(anim, name).toBeDefined();
      expect(anim.frames.length, name).toBeGreaterThan(0);
      for (const f of anim.frames) expect(Object.hasOwn(PLAYER_FRAMES, f), `${name}: ${f}`).toBe(true);
    }
  });

  it('jab, cross e kick têm os frames wind, hit e recover', () => {
    for (const name of ['jab', 'cross', 'kick']) {
      for (const part of ['wind', 'hit', 'recover']) {
        expect(Object.hasOwn(PLAYER_FRAMES, `${name}-${part}`), `${name}-${part}`).toBe(true);
      }
    }
  });

  it('no frame *-hit o membro chega à borda da hitbox do golpe (até 1 texel além), na altura da hitbox', () => {
    const originCol = PLAYER_ORIGIN.x * PLAYER_FRAME_W;
    const footRow = PLAYER_ORIGIN.y * PLAYER_FRAME_H;
    // O corpo físico tem 36 px com o pé na base: o centro fica 18 px acima do pé.
    const centerFromFoot = 18;
    const byAnim: Record<string, number> = { jab: 0, cross: 1, kick: 2 };
    for (const [name, index] of Object.entries(byAnim)) {
      const box = PLAYER_COMBO[index].hitbox!;
      const edge = box.offsetX + box.width / 2;
      const frame = sheet.frames.find((f) => f.key === `${name}-hit`)!;
      let reach = -Infinity;
      let reachRow = -1;
      frame.cells.forEach((row, y) =>
        row.forEach((c, x) => {
          if (c === null) return;
          const px = (x + 1 - originCol) * ART_SCALE;
          if (px > reach) {
            reach = px;
            reachRow = y;
          }
        }),
      );
      expect(reach, name).toBeGreaterThanOrEqual(edge);
      expect(reach, name).toBeLessThanOrEqual(edge + ART_SCALE);
      // Linha mais à frente, em px relativos ao centro do corpo (y para baixo), dentro da faixa da hitbox.
      const rowTop = (reachRow - footRow) * ART_SCALE + centerFromFoot;
      expect(rowTop, name).toBeGreaterThanOrEqual(box.offsetY - box.height / 2 - ART_SCALE);
      expect(rowTop + ART_SCALE, name).toBeLessThanOrEqual(box.offsetY + box.height / 2 + ART_SCALE);
    }
  });

  it('a origem fica no pé (base do frame)', () => {
    expect(PLAYER_ORIGIN.y).toBe(1);
  });
});
