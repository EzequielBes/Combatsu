import { describe, expect, it } from 'vitest';
import type { PlayerAnim } from '../../src/core/animState';
import { TILE, type TileVariant } from '../../src/core/level';
import { TRANSPARENT, parseSheet } from '../../src/core/pixelGrid';
// Importar no Vitest (Node, sem window) já prova que a paleta não carrega o `phaser` como valor.
import { ART_SCALE, PALETTE, PALETTE_KEYS } from '../../src/game/art/palette';
import { PLAYER_ANIMS, PLAYER_FRAMES, PLAYER_FRAME_H, PLAYER_FRAME_W, PLAYER_ORIGIN } from '../../src/game/art/sprites/player';
import { TILE_FRAMES, tileFrameFor } from '../../src/game/art/tiles';
import { PROP_SHARDS, PROP_SPRITES, SMOKE, SMOKE_CURSE } from '../../src/game/art/sprites/props';
import { ENEMY_BAR, ENEMY_BAR_WELL, HUD_BAR, HUD_BAR_WELL } from '../../src/game/art/hud';
import { ENEMY_ATTACK, PLAYER_COMBO } from '../../src/data/tuning';
import type { EnemyAnim } from '../../src/core/animState';
import {
  ENEMY_ANIMS,
  ENEMY_FRAMES,
  ENEMY_FRAME_H,
  ENEMY_FRAME_W,
  ENEMY_ORIGIN,
  ENEMY_RAG_PARTS,
} from '../../src/game/art/sprites/enemy';

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

describe('folha do inimigo (CHR-03, CHR-04, ART-01)', () => {
  const sheet = parseSheet('enemy', ENEMY_FRAMES, PALETTE_KEYS);
  const CHR03: EnemyAnim[] = ['idle', 'walk', 'windup', 'attack', 'hurt', 'getup'];
  const colorsOf = (cells: (string | null)[][]): Set<string> =>
    new Set(cells.flat().filter((c): c is string => c !== null));

  it('passa no parseSheet só com cores da paleta, todos os frames do mesmo tamanho (48 px de altura)', () => {
    expect(sheet.width).toBe(ENEMY_FRAME_W);
    expect(sheet.height).toBe(ENEMY_FRAME_H);
    expect(sheet.height * ART_SCALE).toBe(48);
  });

  it('toda animação do CHR-03 existe e tem pelo menos um frame, e todo frame citado existe na folha', () => {
    for (const name of CHR03) {
      const anim = ENEMY_ANIMS[name];
      expect(anim, name).toBeDefined();
      expect(anim.frames.length, name).toBeGreaterThan(0);
      for (const f of anim.frames) expect(Object.hasOwn(ENEMY_FRAMES, f), `${name}: ${f}`).toBe(true);
    }
  });

  it('no frame attack a garra chega à borda da hitbox do ENEMY_ATTACK (até 1 texel além), na altura da hitbox', () => {
    const originCol = ENEMY_ORIGIN.x * ENEMY_FRAME_W;
    const footRow = ENEMY_ORIGIN.y * ENEMY_FRAME_H;
    // Corpo de 36 px com o pé na base: o centro fica 18 px acima do pé.
    const centerFromFoot = 18;
    const box = ENEMY_ATTACK.hitbox!;
    const edge = box.offsetX + box.width / 2;
    const frame = sheet.frames.find((f) => f.key === ENEMY_ANIMS.attack.frames[0])!;
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
    expect(reach).toBeGreaterThanOrEqual(edge);
    expect(reach).toBeLessThanOrEqual(edge + ART_SCALE);
    const rowTop = (reachRow - footRow) * ART_SCALE + centerFromFoot;
    expect(rowTop).toBeGreaterThanOrEqual(box.offsetY - box.height / 2 - ART_SCALE);
    expect(rowTop + ART_SCALE).toBeLessThanOrEqual(box.offsetY + box.height / 2 + ART_SCALE);
  });

  it('a origem fica no pé e a linha de centro cai num número inteiro de px', () => {
    expect(ENEMY_ORIGIN.y).toBe(1);
    expect(Number.isInteger(ENEMY_ORIGIN.x * ENEMY_FRAME_W * ART_SCALE)).toBe(true);
  });

  it('as partes do ragdoll (cabeça, tronco, membro) passam no parseSheet e só usam cores dos frames do inimigo', () => {
    const frameColors = new Set(sheet.frames.flatMap((f) => [...colorsOf(f.cells)]));
    expect(Object.keys(ENEMY_RAG_PARTS).sort()).toEqual(['head', 'limb', 'torso']);
    for (const [name, grid] of Object.entries(ENEMY_RAG_PARTS)) {
      const part = parseSheet(`rag-${name}`, { [name]: grid }, PALETTE_KEYS);
      for (const c of colorsOf(part.frames[0].cells)) expect(frameColors.has(c), `${name}: ${c}`).toBe(true);
    }
  });

  it('a cabeça do ragdoll tem o olho (o âmbar do olho dos frames)', () => {
    const head = colorsOf(parseSheet('rag-head', { head: ENEMY_RAG_PARTS.head }, PALETTE_KEYS).frames[0].cells);
    expect(head.has('A')).toBe(true);
  });
});

describe('objetos com arte (PRP-01, ART-01, ART-03)', () => {
  const colorsOf = (cells: (string | null)[][]): Set<string> =>
    new Set(cells.flat().filter((c): c is string => c !== null));
  // Tamanhos atuais dos corpos físicos, que saem do tamanho da textura: a física não pode mudar.
  const BODY_PX = { chair: { w: 26, h: 26 }, bottle: { w: 8, h: 20 } } as const;

  for (const key of ['chair', 'bottle'] as const) {
    it(`${key}: passa no parseSheet só com cores da paleta, com o mesmo tamanho do corpo atual`, () => {
      const sheet = parseSheet(key, { [key]: PROP_SPRITES[key] }, PALETTE_KEYS);
      expect(sheet.width * ART_SCALE).toBe(BODY_PX[key].w);
      expect(sheet.height * ART_SCALE).toBe(BODY_PX[key].h);
    });

    it(`${key}: tem contorno (k) e pelo menos dois tons próprios além dele`, () => {
      const colors = colorsOf(parseSheet(key, { [key]: PROP_SPRITES[key] }, PALETTE_KEYS).frames[0].cells);
      expect(colors.has('k')).toBe(true);
      expect(colors.size).toBeGreaterThanOrEqual(3);
    });

    it(`${key}: os fragmentos passam no parseSheet e só usam cores do sprite de origem`, () => {
      const source = colorsOf(parseSheet(key, { [key]: PROP_SPRITES[key] }, PALETTE_KEYS).frames[0].cells);
      const shards = PROP_SHARDS[key];
      expect(shards.length).toBeGreaterThan(1);
      const frames = Object.fromEntries(shards.map((s) => [s.key, s.grid]));
      const sheet = parseSheet(`${key}-shards`, frames, PALETTE_KEYS);
      for (const f of sheet.frames) {
        const colors = colorsOf(f.cells);
        expect(colors.size, f.key).toBeGreaterThan(0);
        for (const c of colors) expect(source.has(c), `${f.key}: ${c}`).toBe(true);
      }
    });

    it(`${key}: cada fragmento é um recorte do sprite na sua posição, e juntos cobrem todo texel pintado`, () => {
      const grid = PROP_SPRITES[key];
      const covered = new Set<string>();
      for (const s of PROP_SHARDS[key]) {
        s.grid.forEach((row, dy) =>
          [...row].forEach((ch, dx) => {
            if (ch === '.') return;
            expect(grid[s.y + dy]?.[s.x + dx], `${s.key} (${dx}, ${dy})`).toBe(ch);
            covered.add(`${s.x + dx},${s.y + dy}`);
          }),
        );
      }
      grid.forEach((row, y) =>
        [...row].forEach((ch, x) => {
          if (ch !== '.') expect(covered.has(`${x},${y}`), `(${x}, ${y})`).toBe(true);
        }),
      );
    });
  }

  it('a fumaça da dissolução tem um frame por roxo da paleta (u, v, U), cada um só com a sua cor (ART-01)', () => {
    const sheet = parseSheet('smoke-curse', SMOKE_CURSE, PALETTE_KEYS);
    expect(sheet.frames.map((fr) => fr.key).sort()).toEqual(['U', 'u', 'v']);
    for (const fr of sheet.frames) {
      const colors = new Set(fr.cells.flat().filter((c) => c !== null));
      expect([...colors]).toEqual([fr.key]);
    }
  });

  it('a fumaça é uma textura pequena da paleta', () => {
    const sheet = parseSheet('smoke', { smoke: SMOKE }, PALETTE_KEYS);
    expect(sheet.width * ART_SCALE).toBeLessThanOrEqual(8);
    expect(sheet.height * ART_SCALE).toBeLessThanOrEqual(8);
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
