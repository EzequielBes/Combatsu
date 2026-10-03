import { describe, expect, it } from 'vitest';
import type { PlayerAnim } from '../../src/core/animState';
import { TILE, type TileVariant } from '../../src/core/level';
import { TRANSPARENT, parseSheet } from '../../src/core/pixelGrid';
// Importar no Vitest (Node, sem window) já prova que a paleta não carrega o `phaser` como valor.
import { ART_SCALE, PALETTE, PALETTE_KEYS } from '../../src/game/art/palette';
import {
  ENERGY_BAR_BG_COLOR,
  ENERGY_BAR_FILL_COLOR,
  ENERGY_BAR_FLASH_COLOR,
  ENERGY_BAR_MARK_COLOR,
  TECH_ICON_OVERLAY_COLOR,
} from '../../src/game/art/techColors';
import {
  PLAYER_ANIMS,
  PLAYER_FRAMES,
  animFrameConfigs,
  armStraight,
  legStraight,
  selOut,
  PLAYER_FRAME_H,
  PLAYER_FRAME_W,
  PLAYER_ORIGIN,
} from '../../src/game/art/sprites/player';
import { selOut as sharedSelOut, type SelOutConfig } from '../../src/game/art/selOut';
import { PLAYER_MOVE_FRAMES } from '../../src/game/art/sprites/playerMoves';
import playerBBoxBaseline from './fixtures/playerBBoxBaseline.json';
import enemyBBoxBaseline from './fixtures/enemyBBoxBaseline.json';
import { PLAYER_TECH_FRAMES, fingertipOffsetPx, redFingertip } from '../../src/game/art/sprites/playerTech';
import {
  COMBO_GRADE_COLORS,
  COMBO_TEXT_COLOR,
  STRUCTURE_BAR_BG_COLOR,
  STRUCTURE_BAR_BREAK_COLOR,
  STRUCTURE_BAR_FILL_COLOR,
} from '../../src/game/art/combatColors';
import { KANJI_FRAMES } from '../../src/game/art/sprites/kanji';
import { AURA_FRAMES, BLUE_ORB_FRAME, RED_ORB_FRAMES, RED_ORB_SIZES, TECH_SPARK_FRAMES } from '../../src/game/art/sprites/techFx';
import { RED_FX_COLORS } from '../../src/game/techFx/redPalette';
import { TILE_FRAMES, tileFrameFor } from '../../src/game/art/tiles';
import { PROP_SHARDS, PROP_SPRITES, SMOKE, SMOKE_CURSE } from '../../src/game/art/sprites/props';
import { FRAGMENT_FRAMES, FRAGMENT_ICON, HEAL_FRAMES } from '../../src/game/art/sprites/economy';
import { TOOL_FRAMES, TOOL_SHARDS } from '../../src/game/art/sprites/tools';
import { ENEMY_BAR, ENEMY_BAR_WELL, HUD_BAR, HUD_BAR_WELL } from '../../src/game/art/hud';
import {
  BOSS_BAR_BG_COLOR,
  BOSS_BAR_FILL_COLOR,
  BOSS_BAR_MARK_COLOR,
  BOSS_BAR_NAME_COLOR,
  RUN_BG_COLOR,
  RUN_TEXT_COLOR,
} from '../../src/game/Hud';
import { ENEMY_AI, ENEMY_ATTACK, PLAYER_COMBO } from '../../src/data/tuning';
import type { EnemyAnim } from '../../src/core/animState';
import {
  ENEMY_ANIMS,
  ENEMY_FRAMES,
  ENEMY_FRAME_H,
  ENEMY_FRAME_W,
  ENEMY_ORIGIN,
  ENEMY_RAG_PARTS,
  ENEMY_RAG_VARIANTS,
  ENEMY_VARIANT_FRAMES,
  type EnemyVariantId,
} from '../../src/game/art/sprites/enemy';
import {
  BOSS_ANIMS,
  BOSS_FRAMES,
  BOSS_FRAME_H,
  BOSS_FRAME_W,
  BOSS_ORIGIN,
  PROJECTILE_FRAME,
  SHOCKWAVE_FRAME,
  TECELA_COLOR_MAP,
  TECELA_FRAMES,
} from '../../src/game/art/sprites/boss';
import { BOSS, PLAYER_MOVE } from '../../src/data/tuning';
import { MOVE_NAMES } from '../../src/data/moves';

describe('paleta única (ART-01)', () => {
  it('tem no máximo 42 cores (RDA-01, AD-017), cada uma com chave de 1 caractere', () => {
    const keys = Object.keys(PALETTE);
    expect(keys.length).toBeGreaterThan(0);
    expect(keys.length).toBeLessThanOrEqual(42);
    for (const k of keys) expect([...k]).toHaveLength(1);
  });

  it('tem as 5 chaves do player (o, x, j, y, z) e, com as 2 do Vermelho (t, T), soma 42 cores (SPR-01, RDA-01)', () => {
    const keys = Object.keys(PALETTE);
    for (const k of ['o', 'x', 'j', 'y', 'z']) expect(keys, k).toContain(k);
    // SPEC_DEVIATION: a spec da SPR-01 dizia 34 + 5 = 39, mas a paleta já tinha 35 chaves (total real 40).
    // Reason: contagem da spec desatualizada; a F10 (RDA-01, AD-017) soma `t` e `T` e fixa o total em 42.
    expect(keys).toHaveLength(42);
    expect(PALETTE.o).toBe(0x161d3d);
    expect(PALETTE.x).toBe(0x6b3a2e);
    expect(PALETTE.j).toBe(0x33263b);
    expect(PALETTE.y).toBe(0x8fa3c9);
    expect(PALETTE.z).toBe(0x9c6a1f);
  });

  it('tem o carmim t e o magenta-claro T do Vermelho (RDA-01)', () => {
    expect(Object.keys(PALETTE)).toHaveLength(42);
    expect(PALETTE.t).toBe(0xd1103a);
    expect(PALETTE.T).toBe(0xff4f8b);
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

describe('paleta das técnicas (TFX-08)', () => {
  it('adiciona exatamente as 4 chaves b, R, W e d com os valores do AC', () => {
    expect(PALETTE.b).toBe(0x050205);
    expect(PALETTE.R).toBe(0xff3344);
    expect(PALETTE.W).toBe(0xffffff);
    expect(PALETTE.d).toBe(0x14307a);
  });
});

describe('cores da barra de energia e ícones de slot (TEC-15)', () => {
  it('preenchimento, fundo, marca, flash e overlay são cores da paleta', () => {
    for (const c of [
      ENERGY_BAR_FILL_COLOR,
      ENERGY_BAR_BG_COLOR,
      ENERGY_BAR_MARK_COLOR,
      ENERGY_BAR_FLASH_COLOR,
      TECH_ICON_OVERLAY_COLOR,
    ]) {
      expect(Object.values(PALETTE)).toContain(c);
    }
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

describe('frames de conjuração das técnicas (CAST-18, CAST-22)', () => {
  const IDS: Array<'divergente' | 'vermelho' | 'azul' | 'corte'> = ['divergente', 'vermelho', 'azul', 'corte'];
  const sheet = parseSheet('player-tech', PLAYER_TECH_FRAMES, PALETTE_KEYS);

  it('passa no parseSheet só com cores da paleta, todo frame com 32x24 texels (CAST-18/22)', () => {
    expect(sheet.width).toBe(PLAYER_FRAME_W);
    expect(sheet.height).toBe(PLAYER_FRAME_H);
  });

  it('cada técnica de CAST-18 tem os 4 frames sign/charge/release/recover', () => {
    for (const id of IDS) {
      for (const part of ['sign', 'charge', 'release', 'recover']) {
        expect(Object.hasOwn(PLAYER_TECH_FRAMES, `${id}-${part}`), `${id}-${part}`).toBe(true);
      }
    }
  });

  it('as 4 fases de cada técnica têm silhuetas distintas entre si (aprovação de arte, ronda 2)', () => {
    const PARTS = ['sign', 'charge', 'release', 'recover'] as const;
    for (const id of IDS) {
      const frames = PARTS.map((part) => PLAYER_TECH_FRAMES[`${id}-${part}`]);
      for (let i = 0; i < frames.length; i++) {
        for (let j = i + 1; j < frames.length; j++) {
          expect(frames[i], `${id}-${PARTS[i]} vs ${id}-${PARTS[j]}`).not.toEqual(frames[j]);
        }
      }
    }
  });

  it('tem o frame kokusen-hit, 32x24 texels só com cores da paleta', () => {
    expect(Object.hasOwn(PLAYER_TECH_FRAMES, 'kokusen-hit')).toBe(true);
    const frame = sheet.frames.find((f) => f.key === 'kokusen-hit')!;
    expect(frame.cells.length).toBe(PLAYER_FRAME_H);
    expect(frame.cells[0].length).toBe(PLAYER_FRAME_W);
  });

  it('nenhum frame de técnica repete o nome de um frame da folha base do player', () => {
    for (const key of Object.keys(PLAYER_TECH_FRAMES)) {
      expect(Object.hasOwn(PLAYER_FRAMES, key), key).toBe(false);
    }
  });
});

describe('kanji das técnicas (KOK-29, KOK-34, TFX-01)', () => {
  it('黒 (kuro) e 閃 (sen) têm 24x24 texels, só com cores da paleta (KOK-29/34)', () => {
    for (const id of ['kuro', 'sen'] as const) {
      const sheet = parseSheet(`kanji-${id}`, { [id]: KANJI_FRAMES[id] }, PALETTE_KEYS);
      expect(sheet.width, id).toBe(24);
      expect(sheet.height, id).toBe(24);
    }
  });

  it('赫 (aka), 蒼 (ao), 解 (kai) e 拳 (ken) também têm 24x24 texels, só com cores da paleta (TFX-01)', () => {
    for (const id of ['aka', 'ao', 'kai', 'ken'] as const) {
      const sheet = parseSheet(`kanji-${id}`, { [id]: KANJI_FRAMES[id] }, PALETTE_KEYS);
      expect(sheet.width, id).toBe(24);
      expect(sheet.height, id).toBe(24);
    }
  });

  it('os 6 kanji têm silhuetas distintas entre si', () => {
    const ids = Object.keys(KANJI_FRAMES) as (keyof typeof KANJI_FRAMES)[];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        expect(KANJI_FRAMES[ids[i]], `${ids[i]} vs ${ids[j]}`).not.toEqual(KANJI_FRAMES[ids[j]]);
      }
    }
  });
});

describe('orbes e aura das técnicas (TFX-01)', () => {
  it('o orbe Vermelho passa no parseSheet nos 3 tamanhos da carga (RED-02), com núcleo W e borda carmim t', () => {
    for (const size of RED_ORB_SIZES) {
      const sheet = parseSheet(`red-orb-${size}`, { orb: RED_ORB_FRAMES[size] }, PALETTE_KEYS);
      expect(sheet.width).toBe(size);
      expect(sheet.height).toBe(size);
      const colors = new Set(sheet.frames[0].cells.flat());
      expect(colors.has('W')).toBe(true);
      expect(colors.has('t')).toBe(true);
    }
  });

  it('os orbes de 8 e 12 texels têm W no centro e passam por T, R e t até a borda (RDA-02)', () => {
    for (const size of [8, 12] as const) {
      const cells = parseSheet(`red-orb-${size}`, { orb: RED_ORB_FRAMES[size] }, PALETTE_KEYS).frames[0].cells;
      const mid = Math.floor(size / 2);
      // Anda do centro para a direita: W -> T -> R -> t, nessa ordem de aparição.
      const order = cells[mid].slice(mid).filter((c): c is string => c !== null);
      const firstSeen = [...new Set(order)];
      expect(firstSeen, `${size}`).toEqual(['W', 'T', 'R', 't']);
      expect(order[order.length - 1], `${size}`).toBe('t');
    }
  });

  it('a rampa do orbe segue os raios W até 0,3, T até 0,55, R até 0,8 e t na borda (RDA-02)', () => {
    for (const size of [8, 12] as const) {
      const cells = parseSheet(`red-orb-${size}`, { orb: RED_ORB_FRAMES[size] }, PALETTE_KEYS).frames[0].cells;
      const center = (size - 1) / 2;
      const seen = new Set<string>();
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const r = Math.hypot(x - center, y - center) / (size / 2); // fração do raio do disco
          const expected = r <= 0.3 ? 'W' : r <= 0.55 ? 'T' : r <= 0.8 ? 'R' : r <= 1 ? 't' : null;
          expect(cells[y][x], `${size} (${x},${y}) r=${r.toFixed(3)}`).toBe(expected);
          if (expected) seen.add(expected);
        }
      }
      // Os quatro anéis existem de fato nesse tamanho (a rampa não degenerou).
      expect([...seen].sort(), `${size}`).toEqual(['R', 'T', 'W', 't']);
    }
  });

  it('nenhum frame do orbe Vermelho contém a nem A (RDA-03)', () => {
    for (const size of RED_ORB_SIZES) {
      const colors = new Set(parseSheet(`red-orb-${size}`, { orb: RED_ORB_FRAMES[size] }, PALETTE_KEYS).frames[0].cells.flat());
      expect(colors.has('a'), `${size}`).toBe(false);
      expect(colors.has('A'), `${size}`).toBe(false);
    }
  });

  it('todas as chaves de RED_FX_COLORS estão em {b, t, T, R, W} e existem na paleta (RDA-03, RDA-14)', () => {
    const allowed = new Set(['b', 't', 'T', 'R', 'W']);
    const keys = Object.values(RED_FX_COLORS).flat();
    expect(keys.length).toBeGreaterThan(0);
    for (const k of keys) {
      expect(allowed.has(k), k).toBe(true);
      expect(PALETTE_KEYS.has(k), k).toBe(true);
    }
  });

  it('o orbe Vermelho é um disco: o canto do quadro é transparente em todo tamanho (RED-02)', () => {
    for (const size of RED_ORB_SIZES) {
      const cells = parseSheet(`red-orb-${size}`, { orb: RED_ORB_FRAMES[size] }, PALETTE_KEYS).frames[0].cells;
      expect(cells[0][0], `${size}`).toBeNull();
      expect(cells[0][size - 1], `${size}`).toBeNull();
      expect(cells[size - 1][0], `${size}`).toBeNull();
      expect(cells[size - 1][size - 1], `${size}`).toBeNull();
      // O centro (a região mais quente) é sempre W, nunca R (não é um preenchimento uniforme).
      const mid = Math.floor(size / 2);
      expect(cells[mid][mid], `${size}`).toBe('W');
    }
  });

  it('o orbe Azul passa no parseSheet, com núcleo d, anel C e borda clara W', () => {
    const sheet = parseSheet('blue-orb', { orb: BLUE_ORB_FRAME }, PALETTE_KEYS);
    const colors = new Set(sheet.frames[0].cells.flat());
    expect(colors.has('d')).toBe(true);
    expect(colors.has('C')).toBe(true);
    expect(colors.has('W')).toBe(true);
  });

  it('o orbe Azul é um disco: o canto do quadro é transparente e o centro é o núcleo d', () => {
    const cells = parseSheet('blue-orb', { orb: BLUE_ORB_FRAME }, PALETTE_KEYS).frames[0].cells;
    const size = BLUE_ORB_FRAME.length;
    expect(cells[0][0]).toBeNull();
    expect(cells[0][size - 1]).toBeNull();
    expect(cells[size - 1][0]).toBeNull();
    expect(cells[size - 1][size - 1]).toBeNull();
    const mid = Math.floor(size / 2);
    expect(cells[mid][mid]).toBe('d');
  });

  it('a chama da aura tem 2 frames por cor, do mesmo tamanho, que não são idênticos (cintilam)', () => {
    const sheet = parseSheet('aura', AURA_FRAMES, PALETTE_KEYS);
    for (const color of ['blue', 'red', 'white'] as const) {
      expect(AURA_FRAMES[`${color}-a`], color).not.toEqual(AURA_FRAMES[`${color}-b`]);
    }
    expect(sheet.frames).toHaveLength(6);
  });

  it('as faíscas das técnicas passam no parseSheet só com cores da paleta', () => {
    const sheet = parseSheet('tech-sparks', TECH_SPARK_FRAMES, PALETTE_KEYS);
    expect(sheet.frames).toHaveLength(3);
  });

  it('a faísca redOut do Vermelho não usa a nem A, só t, T e R (RDA-03, RDA-14)', () => {
    const cells = parseSheet('tech-sparks', TECH_SPARK_FRAMES, PALETTE_KEYS).frames.find((f) => f.key === 'redOut')!.cells;
    const colors = new Set(cells.flat().filter((c): c is string => c !== null));
    expect(colors.has('a')).toBe(false);
    expect(colors.has('A')).toBe(false);
    expect([...colors].every((c) => ['t', 'T', 'R'].includes(c))).toBe(true);
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

describe('folha do chefe (BTIER-06, BAT-05, ART-01)', () => {
  const sheet = parseSheet('boss', BOSS_FRAMES, PALETTE_KEYS);
  const STATES = [
    'idle',
    'windup-charge',
    'charge',
    'windup-leap',
    'leap',
    'windup-volley',
    'volley',
    'roar',
    'stagger',
    'dead',
  ];

  it('passa no parseSheet só com cores da paleta, com o frame maior que o do inimigo nas duas dimensões', () => {
    expect(sheet.width).toBe(BOSS_FRAME_W);
    expect(sheet.height).toBe(BOSS_FRAME_H);
    expect(BOSS_FRAME_W).toBeGreaterThan(ENEMY_FRAME_W);
    expect(BOSS_FRAME_H).toBeGreaterThan(ENEMY_FRAME_H);
  });

  it('tem um frame e uma animação para cada estado do design, todos citando frames existentes', () => {
    for (const name of STATES) {
      expect(Object.hasOwn(BOSS_FRAMES, name), name).toBe(true);
      const anim = BOSS_ANIMS[name];
      expect(anim, name).toBeDefined();
      for (const f of anim.frames) expect(Object.hasOwn(BOSS_FRAMES, f), `${name}: ${f}`).toBe(true);
    }
  });

  it('cada frame de preparo é visualmente distinto do idle (BAT-05)', () => {
    for (const name of ['windup-charge', 'windup-leap', 'windup-volley']) {
      expect(BOSS_FRAMES[name], name).not.toEqual(BOSS_FRAMES.idle);
    }
  });

  it('a origem fica no pé, no centro do corpo', () => {
    expect(BOSS_ORIGIN.y).toBe(1);
    expect(BOSS_ORIGIN.x * BOSS_FRAME_W).toBe(BOSS_FRAME_W / 2);
  });

  it('TECELA_COLOR_MAP só usa cores da paleta e muda ao menos 3 cores em relação ao Oni (BTIER-06)', () => {
    for (const [from, to] of Object.entries(TECELA_COLOR_MAP)) {
      expect(PALETTE_KEYS.has(from), from).toBe(true);
      expect(PALETTE_KEYS.has(to), to).toBe(true);
    }
    const distinct = Object.entries(TECELA_COLOR_MAP).filter(([from, to]) => from !== to);
    expect(distinct.length).toBeGreaterThanOrEqual(3);
  });

  it('a grade da Tecelã reaproveita os mesmos frames do Oni, só com as cores trocadas (BTIER-06)', () => {
    const tecelaSheet = parseSheet('boss-tecela', TECELA_FRAMES, PALETTE_KEYS);
    expect(tecelaSheet.width).toBe(sheet.width);
    expect(tecelaSheet.height).toBe(sheet.height);
    expect(Object.keys(TECELA_FRAMES).sort()).toEqual(Object.keys(BOSS_FRAMES).sort());
    const changedColors = new Set<string>();
    BOSS_FRAMES.idle.forEach((row, y) => {
      [...row].forEach((ch, x) => {
        const other = TECELA_FRAMES.idle[y][x];
        if (ch !== other) changedColors.add(ch);
      });
    });
    expect(changedColors.size).toBeGreaterThanOrEqual(3);
  });
});

/** Medidas do Glossário da spec `sprite-chefes-e-acabamento`, usadas pelos blocos BSP, BAN, BPW, LMB, OBJ e EPD. */
const artMeasure = {
  /** Menor retângulo com todos os texels opacos: [esquerda, topo, direita, base]. */
  box(rows: readonly string[]): [number, number, number, number] {
    let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
    rows.forEach((row, y) =>
      [...row].forEach((c, x) => {
        if (c === TRANSPARENT) return;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x);
        y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }),
    );
    return [x0, y0, x1, y1];
  },
  /** Posições em que os dois frames diferem, sobre as posições em que pelo menos um é opaco. */
  difference(a: readonly string[], b: readonly string[]): number {
    let union = 0;
    let differ = 0;
    a.forEach((row, y) =>
      [...row].forEach((c, x) => {
        const other = b[y][x];
        if (c === TRANSPARENT && other === TRANSPARENT) return;
        union++;
        if (c !== other) differ++;
      }),
    );
    return differ / union;
  },
  /** Quantidade de componentes 8-conexos de texels opacos. */
  components(rows: readonly string[]): number {
    const opaque = (x: number, y: number): boolean => rows[y]?.[x] !== undefined && rows[y][x] !== TRANSPARENT;
    const seen = new Set<string>();
    let count = 0;
    rows.forEach((row, y) =>
      [...row].forEach((_, x) => {
        if (!opaque(x, y) || seen.has(`${x},${y}`)) return;
        count++;
        const stack: Array<[number, number]> = [[x, y]];
        seen.add(`${x},${y}`);
        while (stack.length) {
          const [cx, cy] = stack.pop()!;
          for (let dx = -1; dx <= 1; dx++)
            for (let dy = -1; dy <= 1; dy++) {
              const key = `${cx + dx},${cy + dy}`;
              if (opaque(cx + dx, cy + dy) && !seen.has(key)) {
                seen.add(key);
                stack.push([cx + dx, cy + dy]);
              }
            }
        }
      }),
    );
    return count;
  },
  /** Texels `k` cujos 4 vizinhos estão dentro do frame e são opacos. */
  interiorK(rows: readonly string[]): number {
    let n = 0;
    for (let y = 1; y < rows.length - 1; y++) {
      for (let x = 1; x < rows[y].length - 1; x++) {
        if (rows[y][x] !== 'k') continue;
        if ([rows[y - 1][x], rows[y + 1][x], rows[y][x - 1], rows[y][x + 1]].every((c) => c !== TRANSPARENT)) n++;
      }
    }
    return n;
  },
  /** Quantos texels do frame têm a chave `key`. */
  countOf(rows: readonly string[], key: string): number {
    return rows.join('').split(key).length - 1;
  },
  /** Chaves distintas do frame, sem o transparente. */
  keysOf(rows: readonly string[]): Set<string> {
    return new Set([...rows.join('')].filter((c) => c !== TRANSPARENT));
  },
  /** A chave mais frequente do frame, sem contar `k`. */
  dominant(rows: readonly string[]): string {
    const count = new Map<string, number>();
    for (const c of rows.join('')) if (c !== TRANSPARENT && c !== 'k') count.set(c, (count.get(c) ?? 0) + 1);
    return [...count].sort((a, b) => b[1] - a[1])[0][0];
  },
  /** Texels opacos de cada coluna de uma parte (linhas de larguras diferentes contam como transparente). */
  profile(part: readonly string[]): number[] {
    const width = Math.max(...part.map((r) => r.length));
    return Array.from({ length: width }, (_, x) => part.filter((r) => (r[x] ?? TRANSPARENT) !== TRANSPARENT).length);
  },
};

describe('medidas de arte do glossário (limiares dos dois lados)', () => {
  it('difference: 1 posição diferente em 5 da união dá 0,2; em 6 dá menos que 0,2', () => {
    expect(artMeasure.difference(['aaaaa'], ['aaaab'])).toBeCloseTo(0.2, 10);
    expect(artMeasure.difference(['aaaaaa'], ['aaaaab'])).toBeLessThan(0.2);
    // Posição transparente nos dois não entra na união; opaca em um só entra e conta como diferente.
    expect(artMeasure.difference(['a..'], ['ab.'])).toBe(0.5);
  });

  it('components: diagonal liga (8-conexo); um texel de vão separa', () => {
    expect(artMeasure.components(['a.', '.a'])).toBe(1);
    expect(artMeasure.components(['a.a'])).toBe(2);
  });

  it('interiorK: só conta o k com os 4 vizinhos opacos e dentro do frame', () => {
    expect(artMeasure.interiorK(['aaa', 'aka', 'aaa'])).toBe(1);
    expect(artMeasure.interiorK(['a.a', 'aka', 'aaa'])).toBe(0);
    expect(artMeasure.interiorK(['kkk', 'aaa', 'aaa'])).toBe(0);
  });

  it('box, dominant e profile leem o que o glossário define', () => {
    expect(artMeasure.box(['....', '.ab.', '..c.'])).toEqual([1, 1, 2, 2]);
    expect(artMeasure.dominant(['kkkk', 'aab.'])).toBe('a');
    expect(artMeasure.profile(['ab', 'a', '.b'])).toEqual([2, 2]);
  });
});

describe('chefes desenhados por pose articulada (BSP-01..13)', () => {
  const NAMES = Object.keys(BOSS_FRAMES);
  const WINDUPS = ['windup-charge', 'windup-leap', 'windup-volley'];

  it('BSP-01: as folhas do Oni e da Tecelã passam no parseSheet com 40x32 texels e só chaves da paleta', () => {
    for (const [name, frames] of [['boss-oni', BOSS_FRAMES], ['boss-tecela', TECELA_FRAMES]] as const) {
      const sheet = parseSheet(name, frames, PALETTE_KEYS);
      expect(sheet.width, name).toBe(40);
      expect(sheet.height, name).toBe(32);
    }
  });

  it('BSP-03: o idle do Oni tem cada tom de pele (A, a, z, m) em pelo menos 10 texels', () => {
    for (const tone of ['A', 'a', 'z', 'm']) {
      expect(artMeasure.countOf(BOSS_FRAMES.idle, tone), tone).toBeGreaterThanOrEqual(10);
    }
  });

  it('BSP-04: o idle do Oni tem no máximo 12 texels k internos', () => {
    expect(artMeasure.interiorK(BOSS_FRAMES.idle)).toBeLessThanOrEqual(12);
  });

  it('BSP-05: a caixa opaca do idle cobre a hurtbox (colunas 10 a 29, linhas 4 a 31)', () => {
    const [x0, y0, x1, y1] = artMeasure.box(BOSS_FRAMES.idle);
    expect(x0).toBeLessThanOrEqual(10);
    expect(x1).toBeGreaterThanOrEqual(29);
    expect(y0).toBeLessThanOrEqual(4);
    expect(y1).toBe(31);
  });

  it.each(NAMES)('BSP-06: %s forma um único componente', (name) => {
    expect(artMeasure.components(BOSS_FRAMES[name]), name).toBe(1);
  });

  it('BSP-07: idle e os três preparos diferem entre si em pelo menos 0,20', () => {
    const group = ['idle', ...WINDUPS];
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const d = artMeasure.difference(BOSS_FRAMES[group[i]], BOSS_FRAMES[group[j]]);
        expect(d, `${group[i]} x ${group[j]}`).toBeGreaterThanOrEqual(0.2);
      }
    }
  });

  it('BSP-08: cada ataque difere do próprio preparo em pelo menos 0,20', () => {
    for (const attack of ['charge', 'leap', 'volley']) {
      const d = artMeasure.difference(BOSS_FRAMES[attack], BOSS_FRAMES[`windup-${attack}`]);
      expect(d, attack).toBeGreaterThanOrEqual(0.2);
    }
  });

  it('BSP-09: o dead tem no máximo 14 linhas de altura e fica apoiado na linha 31', () => {
    const [, y0, , y1] = artMeasure.box(BOSS_FRAMES.dead);
    expect(y1).toBe(31);
    expect(y1 - y0 + 1).toBeLessThanOrEqual(14);
  });

  it('BSP-10: o topo do stagger fica pelo menos 2 linhas abaixo do topo do idle', () => {
    expect(artMeasure.box(BOSS_FRAMES.stagger)[1] - artMeasure.box(BOSS_FRAMES.idle)[1]).toBeGreaterThanOrEqual(2);
  });

  it('BSP-11: as duas folhas têm os mesmos frames', () => {
    expect(Object.keys(TECELA_FRAMES).sort()).toEqual([...NAMES].sort());
  });

  it.each(NAMES)('BSP-11: %s da Tecelã é o do Oni com o TECELA_COLOR_MAP aplicado texel a texel', (name) => {
    const mapped = BOSS_FRAMES[name].map((row) => [...row].map((c) => TECELA_COLOR_MAP[c] ?? c).join(''));
    expect(TECELA_FRAMES[name]).toEqual(mapped);
  });

  it('BSP-12: a cor dominante do idle é a no Oni e u na Tecelã', () => {
    expect(artMeasure.dominant(BOSS_FRAMES.idle)).toBe('a');
    expect(artMeasure.dominant(TECELA_FRAMES.idle)).toBe('u');
  });

  it('BSP-13: o mapa da Tecelã tem exatamente as 11 trocas da spec (pele, juba, pano e brilho do olho)', () => {
    expect(TECELA_COLOR_MAP).toEqual({ A: 'U', a: 'u', z: 'v', m: 'K', H: 'w', j: 'I', h: 'i', U: 'l', u: 'L', v: 'q', R: 'C' });
  });

  it('BSP-14: o leap tem os pés recolhidos: a base da caixa opaca fica na linha 28 ou acima', () => {
    expect(artMeasure.box(BOSS_FRAMES.leap)[3]).toBeLessThanOrEqual(28);
  });
});

describe('animações dos chefes em laço (BAN-01..06)', () => {
  /** Dois frames distintos, em laço, começando pelo frame com o nome do estado. */
  const expectLoopOfTwo = (name: string): void => {
    const anim = BOSS_ANIMS[name];
    expect(anim.frames, name).toHaveLength(2);
    expect(anim.frames[0], name).toBe(name);
    expect(anim.repeat, name).toBe(-1);
    expect(BOSS_FRAMES[anim.frames[0]], name).not.toEqual(BOSS_FRAMES[anim.frames[1]]);
  };

  it('BAN-01: idle tem 4 frames em laço, 4 durações maiores que 0 e nenhum par consecutivo igual (contando a volta)', () => {
    const { frames, repeat, durations } = BOSS_ANIMS.idle;
    expect(frames).toHaveLength(4);
    expect(repeat).toBe(-1);
    expect(durations).toHaveLength(4);
    for (const d of durations!) expect(d).toBeGreaterThan(0);
    frames.forEach((f, i) => {
      const next = frames[(i + 1) % frames.length];
      expect(BOSS_FRAMES[f], `${f} x ${next}`).not.toEqual(BOSS_FRAMES[next]);
    });
  });

  it.each(['windup-charge', 'windup-leap', 'windup-volley'])('BAN-02: %s tem 2 frames distintos em laço, com 90 ms por frame', (name) => {
    expectLoopOfTwo(name);
    expect(BOSS_ANIMS[name].durations).toEqual([90, 90]);
  });

  it.each([
    ['charge', 80],
    ['roar', 80],
    ['stagger', 220],
  ] as const)('BAN-03: %s tem 2 frames distintos em laço, com %i ms por frame', (name, ms) => {
    expectLoopOfTwo(name);
    expect(BOSS_ANIMS[name].durations).toEqual([ms, ms]);
  });

  it('BAN-04: volley tem 2 frames distintos em laço e um ciclo dura BOSS.volley.intervalMs', () => {
    expectLoopOfTwo('volley');
    const durations = BOSS_ANIMS.volley.durations!;
    expect(durations).toHaveLength(2);
    for (const d of durations) expect(d).toBeGreaterThan(0);
    expect(durations[0] + durations[1]).toBe(BOSS.volley.intervalMs);
  });

  it.each(['leap', 'dead'])('BAN-05: %s tem 1 frame, com o nome do estado', (name) => {
    expect(BOSS_ANIMS[name].frames).toEqual([name]);
  });

  it('BAN-06: todo frame citado por BOSS_ANIMS existe nas folhas do Oni e da Tecelã', () => {
    for (const [name, anim] of Object.entries(BOSS_ANIMS)) {
      for (const f of anim.frames) {
        expect(Object.hasOwn(BOSS_FRAMES, f), `oni ${name}: ${f}`).toBe(true);
        expect(Object.hasOwn(TECELA_FRAMES, f), `tecela ${name}: ${f}`).toBe(true);
      }
    }
  });
});

describe('braço e perna esticados do player com antebraço e canela finos (LMB-01..03, EDG-01)', () => {
  const lens = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, i) => from + i);
  /** As 5 últimas colunas são a ponta do membro: contorno do pulso ou tornozelo, punho ou pé (3) e contorno da ponta. */
  const TIP_COLS = 5;
  /** Maior sequência de colunas seguidas com perfil até `max`, antes da ponta. */
  const thinRunBeforeTip = (profile: number[], max: number): number => {
    let best = 0;
    let run = 0;
    for (let x = 0; x < profile.length - TIP_COLS; x++) {
      run = profile[x] <= max ? run + 1 : 0;
      best = Math.max(best, run);
    }
    return best;
  };

  it.each(lens(9, 22))('LMB-01: com len %i, braço e perna têm 5 linhas, len colunas e texel opaco na última coluna', (len) => {
    for (const [name, part] of [['armStraight', armStraight(len)], ['legStraight', legStraight(len)]] as const) {
      expect(part, name).toHaveLength(5);
      expect(Math.max(...part.map((row) => row.length)), name).toBe(len);
      expect(artMeasure.profile(part)[len - 1], name).toBeGreaterThanOrEqual(1);
    }
  });

  it.each(lens(12, 22))('LMB-02: armStraight(%i) tem 3+ colunas seguidas de perfil até 4 antes do punho e 1+ coluna de perfil 5 entre as 5 últimas', (len) => {
    const profile = artMeasure.profile(armStraight(len));
    expect(thinRunBeforeTip(profile, 4)).toBeGreaterThanOrEqual(3);
    expect(profile.slice(len - 5).filter((p) => p === 5).length).toBeGreaterThanOrEqual(1);
  });

  it.each(lens(12, 22))('LMB-03: legStraight(%i) tem 3+ colunas seguidas de perfil até 4 antes do pé e 2+ colunas de perfil 5 entre as 6 últimas', (len) => {
    const profile = artMeasure.profile(legStraight(len));
    expect(thinRunBeforeTip(profile, 4)).toBeGreaterThanOrEqual(3);
    expect(profile.slice(len - 6).filter((p) => p === 5).length).toBeGreaterThanOrEqual(2);
  });

  it.each(lens(9, 11))('EDG-01: armStraight(%i) não afina: toda coluna antes do punho tem perfil 5', (len) => {
    const profile = artMeasure.profile(armStraight(len));
    expect(profile.slice(0, len - TIP_COLS)).toEqual(Array<number>(len - TIP_COLS).fill(5));
  });
});

describe('chute alto saindo do quadril (LMB-07, LMB-08)', () => {
  const rows = PLAYER_MOVE_FRAMES['chuteAlto-hit'];

  it('LMB-07: nenhum texel de uniforme (s, N, n, o) fica nas linhas 0 a 6 à esquerda da coluna 20', () => {
    for (let y = 0; y <= 6; y++) {
      for (let x = 0; x < 20; x++) expect('sNno'.includes(rows[y][x]), `(${x}, ${y}) = ${rows[y][x]}`).toBe(false);
    }
  });

  it('LMB-08: a ponta do pé continua na coluna 31, numa linha de 2 a 6', () => {
    expect(artMeasure.box(rows)[2]).toBe(31);
    const tipRows = rows.map((row, y) => (row[31] !== TRANSPARENT ? y : -1)).filter((y) => y >= 0);
    expect(tipRows.length).toBeGreaterThan(0);
    for (const y of tipRows) {
      expect(y).toBeGreaterThanOrEqual(2);
      expect(y).toBeLessThanOrEqual(6);
    }
  });
});

describe('golpes derivados no formato novo (LMB-09, LMB-10, LMB-11)', () => {
  it('LMB-09: a palmaExplosiva-hit tem exatamente 2 texels A à direita da coluna 20 (o brilho da palma)', () => {
    const beyond = PLAYER_MOVE_FRAMES['palmaExplosiva-hit'].map((row) => row.slice(21));
    expect(artMeasure.countOf(beyond, 'A')).toBe(2);
  });

  it('LMB-10: a cotovelada-hit termina em ponta: a ponta do frame fica na coluna 23 e tem 1 texel opaco', () => {
    const rows = PLAYER_MOVE_FRAMES['cotovelada-hit'];
    const tip = artMeasure.box(rows)[2];
    expect(tip).toBe(23);
    expect(rows.filter((row) => row[tip] !== TRANSPARENT)).toHaveLength(1);
  });

  it('LMB-11: o pisao-hit tem a sola do sapato: pelo menos 3 texels s na linha 22', () => {
    expect(artMeasure.countOf([PLAYER_MOVE_FRAMES['pisao-hit'][22]], 's')).toBeGreaterThanOrEqual(3);
  });
});

describe('objetos com volume (OBJ-01, OBJ-02)', () => {
  it('OBJ-01: a cadeira tem 13x13 texels e pelo menos 6 chaves distintas, entre elas m, M, s e S', () => {
    const sheet = parseSheet('chair', { chair: PROP_SPRITES.chair }, PALETTE_KEYS);
    expect(sheet.width).toBe(13);
    expect(sheet.height).toBe(13);
    const keys = artMeasure.keysOf(PROP_SPRITES.chair);
    expect(keys.size).toBeGreaterThanOrEqual(6);
    for (const key of ['m', 'M', 's', 'S']) expect(keys.has(key), key).toBe(true);
  });

  it('OBJ-02: a garrafa tem 4x10 texels e as chaves G, g, w, l e L', () => {
    const sheet = parseSheet('bottle', { bottle: PROP_SPRITES.bottle }, PALETTE_KEYS);
    expect(sheet.width).toBe(4);
    expect(sheet.height).toBe(10);
    const keys = artMeasure.keysOf(PROP_SPRITES.bottle);
    for (const key of ['G', 'g', 'w', 'l', 'L']) expect(keys.has(key), key).toBe(true);
  });
});

describe('ferramentas com volume (OBJ-03, OBJ-04)', () => {
  it.each([
    ['cursedKnife', 3, 10, ['w', 'z']],
    ['cursedClub', 5, 8, ['l', 'M']],
  ] as const)('%s: o frame common tem %ix%i texels, pelo menos 7 chaves distintas (entre elas %j) e nenhuma A', (key, w, h, required) => {
    const common = TOOL_FRAMES[key].common;
    const sheet = parseSheet(key, { common }, PALETTE_KEYS);
    expect(sheet.width).toBe(w);
    expect(sheet.height).toBe(h);
    const keys = artMeasure.keysOf(common);
    expect(keys.size).toBeGreaterThanOrEqual(7);
    for (const k of required) expect(keys.has(k), k).toBe(true);
    expect(keys.has('A')).toBe(false);
  });
});

describe('pendências dos inimigos (EPD-01..04)', () => {
  it('EPD-01: no impact do bruto, as linhas 0 a 11 têm exatamente 1 texel w (a ponta do chifre)', () => {
    expect(artMeasure.countOf(ENEMY_VARIANT_FRAMES.bruto.impact.slice(0, 12), 'w')).toBe(1);
  });

  it('EPD-02: no attack-0 do bruto, a coluna da ponta do punho tem exatamente 3 texels opacos', () => {
    const rows = ENEMY_VARIANT_FRAMES.bruto['attack-0'];
    const tip = artMeasure.box(rows)[2];
    expect(rows.filter((row) => row[tip] !== TRANSPARENT)).toHaveLength(3);
  });

  it('EPD-03: no rastejante, o topo do hurt-uppercut-0 fica pelo menos 3 linhas acima do topo do hurt-head-a-0', () => {
    const frames = ENEMY_VARIANT_FRAMES.rastejante;
    const headTop = artMeasure.box(frames['hurt-head-a-0'])[1];
    const uppercutTop = artMeasure.box(frames['hurt-uppercut-0'])[1];
    expect(headTop - uppercutTop).toBeGreaterThanOrEqual(3);
  });

  it.each([
    ['corcunda', 9],
    ['rastejante', 8],
  ] as const)('EPD-05: no impact do %s, a borda branca começa na linha %i e não na de cima', (id, firstRimRow) => {
    const rightmost = (row: string): string => [...row].filter((c) => c !== TRANSPARENT).at(-1)!;
    const rows = ENEMY_VARIANT_FRAMES[id].impact;
    expect(rightmost(rows[firstRimRow])).toBe('w');
    expect(rightmost(rows[firstRimRow - 1])).not.toBe('w');
  });

  it('EPD-06: o punho do bruto tem os cantos arredondados fora do golpe (idle-0 e walk-0)', () => {
    expect(ENEMY_VARIANT_FRAMES.bruto['idle-0'][22][19]).toBe(TRANSPARENT);
    expect(ENEMY_VARIANT_FRAMES.bruto['walk-0'][20][21]).toBe(TRANSPARENT);
  });

  it.each(['corcunda', 'rastejante', 'bruto'] as const)('EPD-04: no hurt-uppercut-0 do %s, a base da caixa opaca fica na linha 20 ou acima', (id) => {
    expect(artMeasure.box(ENEMY_VARIANT_FRAMES[id]['hurt-uppercut-0'])[3]).toBeLessThanOrEqual(20);
  });
});

describe('projétil e onda de choque do chefe (BAT-03/04/07)', () => {
  it('o projétil passa no parseSheet só com cores da paleta', () => {
    const sheet = parseSheet('boss-projectile', { projectile: PROJECTILE_FRAME }, PALETTE_KEYS);
    expect(sheet.frames).toHaveLength(1);
  });

  it('a onda de choque tem 10 texels de altura (20 px de mundo com ART_SCALE 2, BAT-03)', () => {
    const sheet = parseSheet('boss-shockwave', { shockwave: SHOCKWAVE_FRAME }, PALETTE_KEYS);
    expect(sheet.height).toBe(10);
    expect(sheet.height * ART_SCALE).toBe(BOSS.shockwave.height);
  });

  it('BPW-01: o projétil tem 8x8 texels, os 4 cantos transparentes e os tons w, U, u e v', () => {
    const sheet = parseSheet('boss-projectile', { projectile: PROJECTILE_FRAME }, PALETTE_KEYS);
    expect(sheet.width).toBe(8);
    expect(sheet.height).toBe(8);
    const cells = sheet.frames[0].cells;
    for (const [x, y] of [[0, 0], [7, 0], [0, 7], [7, 7]]) expect(cells[y][x], `(${x}, ${y})`).toBeNull();
    const keys = artMeasure.keysOf(PROJECTILE_FRAME);
    for (const tone of ['w', 'U', 'u', 'v']) expect(keys.has(tone), tone).toBe(true);
  });

  it('BPW-02: a onda de choque tem 16x10 texels, pelo menos 30% transparentes e os tons w, A, a e z', () => {
    const sheet = parseSheet('boss-shockwave', { shockwave: SHOCKWAVE_FRAME }, PALETTE_KEYS);
    expect(sheet.width).toBe(16);
    expect(sheet.height).toBe(10);
    expect(artMeasure.countOf(SHOCKWAVE_FRAME, TRANSPARENT) / (16 * 10)).toBeGreaterThanOrEqual(0.3);
    const keys = artMeasure.keysOf(SHOCKWAVE_FRAME);
    for (const tone of ['w', 'A', 'a', 'z']) expect(keys.has(tone), tone).toBe(true);
  });

  it('BPW-03: a linha 9 (a base) da onda de choque tem pelo menos 12 texels opacos', () => {
    expect([...SHOCKWAVE_FRAME[9]].filter((c) => c !== TRANSPARENT).length).toBeGreaterThanOrEqual(12);
  });

  it('a altura da onda é menor que o ápice do pulo do player, computado do PLAYER_MOVE (BAT-07)', () => {
    const jumpApex = PLAYER_MOVE.jumpSpeed ** 2 / (2 * PLAYER_MOVE.gravity);
    expect(jumpApex).toBeCloseTo(49, 5);
    expect(BOSS.shockwave.height).toBeLessThan(jumpApex);
  });
});

describe('fragmento amaldiçoado e ícone do contador (ECO-23)', () => {
  it('a folha do fragmento passa no parseSheet, tem 5x7 texels em 2 frames', () => {
    const sheet = parseSheet('fragment', FRAGMENT_FRAMES, PALETTE_KEYS);
    expect(sheet.width).toBe(5);
    expect(sheet.height).toBe(7);
    expect(sheet.frames.map((f) => f.key).sort()).toEqual(['a', 'b']);
  });

  it('os 2 frames do fragmento cintilam: não são idênticos', () => {
    expect(FRAGMENT_FRAMES.a).not.toEqual(FRAGMENT_FRAMES.b);
  });

  it('o ícone do contador passa no parseSheet só com cores da paleta', () => {
    const sheet = parseSheet('fragment-icon', { icon: FRAGMENT_ICON }, PALETTE_KEYS);
    expect(sheet.frames).toHaveLength(1);
  });
});

describe('gota de cura (HEAL)', () => {
  it('a folha da gota passa no parseSheet, tem 6x8 texels em 2 frames que pulsam', () => {
    const sheet = parseSheet('heal-drop', HEAL_FRAMES, PALETTE_KEYS);
    expect(sheet.width).toBe(6);
    expect(sheet.height).toBe(8);
    expect(sheet.frames.map((f) => f.key).sort()).toEqual(['a', 'b']);
    expect(HEAL_FRAMES.a).not.toEqual(HEAL_FRAMES.b);
  });
});

describe('ferramentas amaldiçoadas (ARM-19, RAR-03)', () => {
  const colorsOf = (cells: (string | null)[][]): Set<string> =>
    new Set(cells.flat().filter((c): c is string => c !== null));

  for (const key of ['cursedKnife', 'cursedClub'] as const) {
    it(`${key}: a folha passa no parseSheet só com cores da paleta, todos os frames do mesmo tamanho`, () => {
      const sheet = parseSheet(key, TOOL_FRAMES[key], PALETTE_KEYS);
      expect(sheet.frames.map((f) => f.key).sort()).toEqual(
        ['common', 'hold-a', 'hold-b', 'hold-rare', 'raised', 'rare'].sort(),
      );
    });

    it(`${key}: o frame rare tem contorno A e o common tem contorno k`, () => {
      const sheet = parseSheet(key, TOOL_FRAMES[key], PALETTE_KEYS);
      const rare = colorsOf(sheet.frames.find((f) => f.key === 'rare')!.cells);
      const common = colorsOf(sheet.frames.find((f) => f.key === 'common')!.cells);
      expect(rare.has('A')).toBe(true);
      expect(rare.has('k')).toBe(false);
      expect(common.has('k')).toBe(true);
      expect(common.has('A')).toBe(false);
    });

    it(`${key}: o frame raised tem o brilho U`, () => {
      const sheet = parseSheet(key, TOOL_FRAMES[key], PALETTE_KEYS);
      const raised = colorsOf(sheet.frames.find((f) => f.key === 'raised')!.cells);
      expect(raised.has('U')).toBe(true);
    });

    it(`${key}: hold-a e hold-b diferem só no contorno da aura (u vs v)`, () => {
      const sheet = parseSheet(key, TOOL_FRAMES[key], PALETTE_KEYS);
      const holdA = sheet.frames.find((f) => f.key === 'hold-a')!;
      const holdB = sheet.frames.find((f) => f.key === 'hold-b')!;
      const replaced = holdA.cells.map((row, y) => row.map((c, x) => (c === 'u' ? holdB.cells[y][x] : c)));
      expect(replaced).toEqual(holdB.cells);
      expect(colorsOf(holdA.cells).has('u')).toBe(true);
      expect(colorsOf(holdB.cells).has('v')).toBe(true);
    });

    it(`${key}: os estilhaços passam no parseSheet e só usam cores do frame comum`, () => {
      const source = colorsOf(parseSheet(key, { common: TOOL_FRAMES[key].common }, PALETTE_KEYS).frames[0].cells);
      const shards = TOOL_SHARDS[key];
      expect(shards.length).toBeGreaterThan(1);
      const frames = Object.fromEntries(shards.map((s) => [s.key, s.grid]));
      const sheet = parseSheet(`${key}-shards`, frames, PALETTE_KEYS);
      for (const f of sheet.frames) {
        const colors = colorsOf(f.cells);
        expect(colors.size, f.key).toBeGreaterThan(0);
        for (const c of colors) expect(source.has(c), `${f.key}: ${c}`).toBe(true);
      }
    });
  }
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

describe('frames dos golpes do chão (MOV-14, T8)', () => {
  // `jab` já existe em PLAYER_FRAMES (feature anterior); os outros 12 vêm de PLAYER_MOVE_FRAMES (T8).
  const GROUND_MOVES = [
    'jab',
    'direto',
    'gancho',
    'cotovelada',
    'chuteFrontal',
    'chuteAlto',
    'joelhada',
    'chuteGiratorio',
    'socoBaixo',
    'rasteira',
    'ganchoAscendente',
    'chuteEmpurrao',
    'chuteCarregado',
  ] as const;
  const ALL_FRAMES = { ...PLAYER_FRAMES, ...PLAYER_MOVE_FRAMES };
  const sheet = parseSheet('player+moves', ALL_FRAMES, PALETTE_KEYS);

  it('passa no parseSheet só com cores da paleta, todo frame 32x24 texels', () => {
    expect(sheet.width).toBe(PLAYER_FRAME_W);
    expect(sheet.height).toBe(PLAYER_FRAME_H);
  });

  it('cada um dos 13 golpes do chão tem os frames wind, hit e recover', () => {
    for (const move of GROUND_MOVES) {
      for (const part of ['wind', 'hit', 'recover']) {
        expect(Object.hasOwn(ALL_FRAMES, `${move}-${part}`), `${move}-${part}`).toBe(true);
      }
    }
  });

  it('os 3 frames de cada golpe são distintos entre si', () => {
    for (const move of GROUND_MOVES) {
      const wind = ALL_FRAMES[`${move}-wind`];
      const hit = ALL_FRAMES[`${move}-hit`];
      const recover = ALL_FRAMES[`${move}-recover`];
      expect(wind, `${move}: wind vs hit`).not.toEqual(hit);
      expect(hit, `${move}: hit vs recover`).not.toEqual(recover);
      expect(wind, `${move}: wind vs recover`).not.toEqual(recover);
    }
  });

  it('nenhum frame novo de PLAYER_MOVE_FRAMES repete um nome já usado por PLAYER_FRAMES ou PLAYER_TECH_FRAMES', () => {
    for (const key of Object.keys(PLAYER_MOVE_FRAMES)) {
      expect(Object.hasOwn(PLAYER_FRAMES, key), key).toBe(false);
      expect(Object.hasOwn(PLAYER_TECH_FRAMES, key), key).toBe(false);
    }
  });
});

describe('frames aéreos, de defesa e de status (MOV-14, T9)', () => {
  const AIR_MOVES = ['socoAereo', 'voadora', 'pisao', 'palmaExplosiva'] as const;
  const STATUS_FRAMES = ['guard', 'parry', 'dodge-0', 'dodge-1', 'stunned-0', 'stunned-1'] as const;
  const sheet = parseSheet('player-moves-air', PLAYER_MOVE_FRAMES, PALETTE_KEYS);

  it('passa no parseSheet só com cores da paleta, todo frame 32x24 texels', () => {
    expect(sheet.width).toBe(PLAYER_FRAME_W);
    expect(sheet.height).toBe(PLAYER_FRAME_H);
  });

  it('cada um dos golpes aéreos e a palma têm os frames wind, hit e recover, distintos entre si', () => {
    for (const move of AIR_MOVES) {
      const wind = PLAYER_MOVE_FRAMES[`${move}-wind`];
      const hit = PLAYER_MOVE_FRAMES[`${move}-hit`];
      const recover = PLAYER_MOVE_FRAMES[`${move}-recover`];
      expect(wind, `${move}-wind`).toBeDefined();
      expect(hit, `${move}-hit`).toBeDefined();
      expect(recover, `${move}-recover`).toBeDefined();
      expect(wind, `${move}: wind vs hit`).not.toEqual(hit);
      expect(hit, `${move}: hit vs recover`).not.toEqual(recover);
      expect(wind, `${move}: wind vs recover`).not.toEqual(recover);
    }
  });

  it('guard, parry, dodge-0/1 e stunned-0/1 existem, 32x24 texels só com cores da paleta', () => {
    for (const name of STATUS_FRAMES) {
      expect(Object.hasOwn(PLAYER_MOVE_FRAMES, name), name).toBe(true);
      const frame = sheet.frames.find((f) => f.key === name)!;
      expect(frame.cells.length, name).toBe(PLAYER_FRAME_H);
      expect(frame.cells[0].length, name).toBe(PLAYER_FRAME_W);
    }
  });

  it('guard e parry são posturas distintas; dodge-0/1 e stunned-0/1 diferem entre si', () => {
    expect(PLAYER_MOVE_FRAMES.guard).not.toEqual(PLAYER_MOVE_FRAMES.parry);
    expect(PLAYER_MOVE_FRAMES['dodge-0']).not.toEqual(PLAYER_MOVE_FRAMES['dodge-1']);
    expect(PLAYER_MOVE_FRAMES['stunned-0']).not.toEqual(PLAYER_MOVE_FRAMES['stunned-1']);
  });
});

describe('frames do abaixar e dos Contras (CNT-17, T9 da combate-mestre)', () => {
  const COUNTER_MOVES = ['contra', 'contraGancho'] as const;
  const NEW_FRAMES = [
    'duck',
    'contra-wind',
    'contra-hit',
    'contra-recover',
    'contraGancho-wind',
    'contraGancho-hit',
    'contraGancho-recover',
  ] as const;
  const topRow = (rows: readonly string[]): number => rows.findIndex((r) => [...r].some((c) => c !== TRANSPARENT));

  it('os 7 frames existem em PLAYER_MOVE_FRAMES (CNT-17)', () => {
    for (const name of NEW_FRAMES) expect(Object.hasOwn(PLAYER_MOVE_FRAMES, name), name).toBe(true);
  });

  it('passam no parseSheet só com cores da paleta, no tamanho dos outros frames (32x24 texels)', () => {
    const subset = Object.fromEntries(NEW_FRAMES.map((n) => [n, PLAYER_MOVE_FRAMES[n]]));
    const sheet = parseSheet('player-moves-counter', subset, PALETTE_KEYS);
    expect(sheet.frames).toHaveLength(7);
    expect(sheet.width).toBe(PLAYER_FRAME_W);
    expect(sheet.height).toBe(PLAYER_FRAME_H);
  });

  it('todo golpe de MOVE_NAMES tem os frames wind, hit e recover na folha do jogador (MOV-14)', () => {
    const all = { ...PLAYER_FRAMES, ...PLAYER_MOVE_FRAMES };
    expect(MOVE_NAMES).toEqual(expect.arrayContaining(['contra', 'contraGancho']));
    for (const move of MOVE_NAMES) {
      for (const part of ['wind', 'hit', 'recover']) expect(Object.hasOwn(all, `${move}-${part}`), `${move}-${part}`).toBe(true);
    }
  });

  it('as 3 fases de cada Contra são distintas entre si (golpe legível)', () => {
    for (const move of COUNTER_MOVES) {
      const wind = PLAYER_MOVE_FRAMES[`${move}-wind`];
      const hit = PLAYER_MOVE_FRAMES[`${move}-hit`];
      const recover = PLAYER_MOVE_FRAMES[`${move}-recover`];
      expect(wind, `${move}: wind vs hit`).not.toEqual(hit);
      expect(hit, `${move}: hit vs recover`).not.toEqual(recover);
      expect(wind, `${move}: wind vs recover`).not.toEqual(recover);
    }
  });

  it('o topo opaco do duck fica pelo menos 3 texels abaixo do topo do idle-0', () => {
    expect(topRow(PLAYER_MOVE_FRAMES.duck) - topRow(PLAYER_FRAMES['idle-0'])).toBeGreaterThanOrEqual(3);
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

describe('alinhamento dos frames do player contra a linha de base congelada (SPR-06)', () => {
  const bboxOf = (rows: readonly string[]): [number, number, number, number] => {
    let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
    rows.forEach((row, y) => {
      [...row].forEach((c, x) => {
        if (c === TRANSPARENT) return;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x);
        y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      });
    });
    return [x0, y0, x1, y1];
  };
  const all: Record<string, readonly string[]> = { ...PLAYER_FRAMES, ...PLAYER_MOVE_FRAMES, ...PLAYER_TECH_FRAMES };
  const entries = Object.entries(playerBBoxBaseline as Record<string, number[]>);

  it('a fixture congelada cobre os 102 frames pré-existentes', () => {
    expect(entries).toHaveLength(102);
  });

  it('cada borda da bbox fica a até 2 texels da linha de base', () => {
    for (const [name, base] of entries) {
      expect(all[name], `frame ${name} existe`).toBeDefined();
      const now = bboxOf(all[name]);
      for (let i = 0; i < 4; i++) {
        expect(Math.abs(now[i] - base[i]), `${name} borda ${i}: ${now[i]} vs ${base[i]}`).toBeLessThanOrEqual(2);
      }
    }
  });
});

describe('duração por frame nas animações (SPR-08)', () => {
  const base = { frames: ['a', 'b', 'c'], frameRate: 10, repeat: 0 };

  it('devolve cada frame com a sua duration quando a animação declara durations', () => {
    expect(animFrameConfigs('x', { ...base, durations: [70, 1000, 1] })).toEqual([
      { frame: 'a', duration: 70 },
      { frame: 'b', duration: 1000 },
      { frame: 'c', duration: 1 },
    ]);
  });

  it('sem durations, devolve só os frames, sem duration', () => {
    expect(animFrameConfigs('x', base)).toEqual([{ frame: 'a' }, { frame: 'b' }, { frame: 'c' }]);
  });

  it('lança erro com o nome da animação quando durations tem tamanho diferente de frames', () => {
    expect(() => animFrameConfigs('minha-anim', { ...base, durations: [10, 10] })).toThrow(/minha-anim/);
    expect(() => animFrameConfigs('minha-anim', { ...base, durations: [10, 10, 10, 10] })).toThrow(/minha-anim/);
  });

  it('duração 0 (ou negativa) lança erro com o nome da animação; duração 1 passa', () => {
    expect(() => animFrameConfigs('zero', { ...base, durations: [10, 0, 10] })).toThrow(/zero/);
    expect(() => animFrameConfigs('neg', { ...base, durations: [10, -5, 10] })).toThrow(/neg/);
    expect(() => animFrameConfigs('um', { ...base, durations: [1, 1, 1] })).not.toThrow();
  });
});

describe('passe de sel-out e acabamento do idle-0 (SPR-03, SPR-04, SPR-05)', () => {
  const toCanvas = (rows: string[]): string[][] => rows.map((r) => [...r]);

  it('k interno vira x (vizinhos de pele), h (cabelo) ou o (demais); k de borda e b não mudam', () => {
    const canvas = toCanvas([
      '.pp.hh..bbb',
      '.pkp.kh.bkb',
      '.pp.hh..bbb',
      '...........',
      'NNNk.......',
      'NkN........',
      'NNN........',
    ]);
    selOut(canvas);
    expect(canvas[1][2]).toBe('x'); // cercado de pele
    expect(canvas[4][3]).toBe('k'); // contorno: encosta em transparente
    expect(canvas[5][1]).toBe('o'); // cercado de uniforme
    expect(canvas[0][8]).toBe('b'); // b nunca muda
  });

  it('limiar da maioria: exatamente 2 vizinhos de pele viram x; 1 de pele e 3 de uniforme viram o', () => {
    const two = toCanvas(['.p.', 'NkN', '.p.']);
    selOut(two);
    expect(two[1][1]).toBe('x');
    const one = toCanvas(['.p.', 'NkN', '.N.']);
    selOut(one);
    expect(one[1][1]).toBe('o');
  });

  it('limiar da maioria no cabelo: 1 vizinho de cabelo e 3 de uniforme viram o', () => {
    const canvas = toCanvas(['.h.', 'NkN', '.N.']);
    selOut(canvas);
    expect(canvas[1][1]).toBe('o');
  });

  it('k interno com 2 vizinhos de cabelo vira h', () => {
    const canvas = toCanvas(['.hh.', 'hkhk', '.hh.']);
    selOut(canvas);
    expect(canvas[1][1]).toBe('h');
  });

  it('o idle-0 tem no máximo 8 texels k internos (a linha de base era 17)', () => {
    const rows = PLAYER_FRAMES['idle-0'];
    let n = 0;
    rows.forEach((row, y) =>
      [...row].forEach((c, x) => {
        if (c !== 'k' || y === 0 || y === rows.length - 1 || x === 0 || x === row.length - 1) return;
        const nb = [rows[y - 1][x], rows[y + 1][x], row[x - 1], row[x + 1]];
        if (nb.every((v) => v !== TRANSPARENT)) n++;
      }),
    );
    expect(n).toBeLessThanOrEqual(8);
  });

  it('a cabeça (linhas 0-10) tem o branco do olho w ao lado de uma pupila escura e os 3 tons de cabelo', () => {
    const head = PLAYER_FRAMES['idle-0'].slice(0, 11);
    expect(head.some((r) => /w[bk]|[bk]w/.test(r))).toBe(true);
    const joined = head.join('');
    for (const tone of ['h', 'j', 'H']) expect(joined, tone).toContain(tone);
  });

  it('o tronco (linhas 11-17) tem o botão dourado A, a luz de borda y e a linha interna o', () => {
    const joined = PLAYER_FRAMES['idle-0'].slice(11, 18).join('');
    for (const c of ['A', 'y', 'o']) expect(joined, c).toContain(c);
  });
});

describe('rastros de movimento nos golpes (SPR-14)', () => {
  const count = (rows: readonly string[], ch: string): number => rows.join('').split(ch).length - 1;
  const tipCol = (rows: readonly string[]): number => Math.max(...rows.map((r) => [...r].reduce((m, c, x) => (c === TRANSPARENT ? m : x), -1)));

  it.each(['jab', 'cross', 'kick'])('$0-hit tem pelo menos 3 S a mais que o próprio wind e todos ficam antes da ponta', (name) => {
    const hit = PLAYER_FRAMES[`${name}-hit`];
    const wind = PLAYER_FRAMES[`${name}-wind`];
    expect(count(hit, 'S') - count(wind, 'S')).toBeGreaterThanOrEqual(3);
    const tip = tipCol(hit);
    hit.forEach((row, y) =>
      [...row].forEach((c, x) => {
        if (c === 'S') expect(x, `${name}-hit S em (${x},${y})`).toBeLessThan(tip);
      }),
    );
  });

  it('o rastro não muda o alcance: a ponta do membro continua na mesma coluna de antes', () => {
    expect(tipCol(PLAYER_FRAMES['jab-hit'])).toBe(27);
    expect(tipCol(PLAYER_FRAMES['cross-hit'])).toBe(27);
    expect(tipCol(PLAYER_FRAMES['kick-hit'])).toBe(30);
  });
});

describe('animações de movimento do player (SPR-09, SPR-12)', () => {
  it('idle tem 4 frames, repete, e nenhum par consecutivo (inclusive o de volta ao início) é igual (SPR-09)', () => {
    const { frames, repeat } = PLAYER_ANIMS.idle;
    expect(frames).toHaveLength(4);
    expect(repeat).toBe(-1);
    frames.forEach((f, i) => {
      const next = frames[(i + 1) % frames.length];
      expect(PLAYER_FRAMES[f], `${f} vs ${next}`).not.toEqual(PLAYER_FRAMES[next]);
    });
  });

  it('jump, apex, fall, land e hurt têm o tamanho e o repeat do spec e só citam frames existentes (SPR-12)', () => {
    const spec: Array<[string, number, number, 'min' | 'exact']> = [
      ['jump', 2, 0, 'min'],
      ['apex', 1, 0, 'min'],
      ['fall', 2, -1, 'min'],
      ['land', 2, 0, 'exact'],
      ['hurt', 2, 0, 'exact'],
    ];
    for (const [name, n, repeat, mode] of spec) {
      const anim = PLAYER_ANIMS[name];
      expect(anim, name).toBeDefined();
      if (mode === 'exact') expect(anim.frames, name).toHaveLength(n);
      else expect(anim.frames.length, name).toBeGreaterThanOrEqual(n);
      expect(anim.repeat, name).toBe(repeat);
      for (const f of anim.frames) expect(Object.hasOwn(PLAYER_FRAMES, f), `${name}: ${f}`).toBe(true);
    }
  });
});

describe('selOut compartilhado e configurável (EVR-10)', () => {
  const toCanvas = (rows: string[]): string[][] => rows.map((r) => [...r]);
  const cfg: SelOutConfig = {
    rules: [
      { keys: new Set(['g', 'G']), line: 'n' },
      { keys: new Set(['A']), line: 'b' },
    ],
    fallback: 'K',
  };

  it('com regra própria, k cercado de 2+ vizinhos do grupo vira a linha do grupo', () => {
    const c = toCanvas(['.g.', 'GkG', '.g.']);
    selOut(c, cfg);
    expect(c[1][1]).toBe('n');
  });

  it('limiar dos dois lados: 2 vizinhos do grupo valem, 1 não', () => {
    const two = toCanvas(['.g.', 'NkN', '.G.']);
    selOut(two, cfg);
    expect(two[1][1]).toBe('n');
    const one = toCanvas(['.g.', 'NkN', '.N.']);
    selOut(one, cfg);
    expect(one[1][1]).toBe('K');
  });

  it('o fallback vale quando nenhuma regra bate; as regras valem na ordem', () => {
    const none = toCanvas(['.N.', 'NkN', '.N.']);
    selOut(none, cfg);
    expect(none[1][1]).toBe('K');
    const both = toCanvas(['.g.', 'gkA', '.A.']); // 2 de g e 2 de A: a primeira regra ganha
    selOut(both, cfg);
    expect(both[1][1]).toBe('n');
    const second = toCanvas(['.A.', 'NkA', '.N.']);
    selOut(second, cfg);
    expect(second[1][1]).toBe('b');
  });

  it('contorno externo (vizinho transparente ou borda) e outras teclas não mudam', () => {
    const c = toCanvas(['.g.', 'gkg', '...', 'gbg']);
    selOut(c, cfg);
    expect(c[1][1]).toBe('k');
    expect(c[3][1]).toBe('b');
  });

  it('sem configuração vale a regra do player (pele -> x)', () => {
    const c = toCanvas(['.p.', 'pkN', '.N.']);
    selOut(c);
    expect(c[1][1]).toBe('x');
  });

  it('o player reexporta o mesmo selOut', () => {
    expect(selOut).toBe(sharedSelOut);
  });
});

describe('alinhamento dos frames do inimigo contra a linha de base congelada (EVR-07)', () => {
  const bboxOf = (rows: readonly string[]): [number, number, number, number] => {
    let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
    rows.forEach((row, y) => {
      [...row].forEach((c, x) => {
        if (c === TRANSPARENT) return;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x);
        y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      });
    });
    return [x0, y0, x1, y1];
  };
  const baseline = enemyBBoxBaseline as Record<string, number[]>;
  const entries = Object.entries(baseline);

  it('a fixture congelada cobre os 11 frames pré-existentes', () => {
    expect(entries).toHaveLength(11);
    expect(Object.keys(ENEMY_FRAMES)).toEqual(expect.arrayContaining(entries.map(([n]) => n)));
  });

  it('cada borda da bbox fica a até 2 texels da linha de base', () => {
    for (const [name, base] of entries) {
      expect(ENEMY_FRAMES[name], `frame ${name} existe`).toBeDefined();
      const now = bboxOf(ENEMY_FRAMES[name]);
      for (let i = 0; i < 4; i++) {
        expect(Math.abs(now[i] - base[i]), `${name} borda ${i}: ${now[i]} vs ${base[i]}`).toBeLessThanOrEqual(2);
      }
    }
  });

  it('o limite de 2 texels vale dos dois lados: deslocar o frame 2 texels dá desvio 2, 3 dá desvio 3', () => {
    const base = baseline['idle-0'];
    const rows = ENEMY_FRAMES['idle-0'];
    const shiftRight = (d: number) => rows.map((r) => '.'.repeat(d) + r.slice(0, r.length - d));
    const shiftLeft = (d: number) => rows.map((r) => r.slice(d) + '.'.repeat(d));
    const off = (r: readonly string[]) => Math.max(...bboxOf(r).map((v, i) => Math.abs(v - base[i])));
    // o idle-0 ocupa as colunas 4..20 de 0..31, então o deslocamento não corta nada
    expect(off(rows)).toBe(0);
    expect(off(shiftRight(2))).toBe(2);
    expect(off(shiftRight(3))).toBe(3);
    expect(off(shiftLeft(2))).toBe(2);
    expect(off(shiftLeft(3))).toBe(3);
  });
});

describe('três aparências do inimigo (EVR-01, EVR-02, EVR-03, EVR-10)', () => {
  const IDS: EnemyVariantId[] = ['corcunda', 'rastejante', 'bruto'];
  const nonEmpty = (rows: readonly string[]) => rows.flatMap((r, y) => [...r].map((c, x) => ({ c, x, y }))).filter((t) => t.c !== TRANSPARENT);
  const dominant = (rows: readonly string[]): string => {
    const count = new Map<string, number>();
    for (const { c } of nonEmpty(rows)) count.set(c, (count.get(c) ?? 0) + 1);
    // ignora contorno e cores de detalhe (olho, boca, osso): a cor do corpo é a mais frequente fora delas
    const skip = new Set(['k', 'K', 'b', 'w', 'A', 'a', 'r', 'R', 'S', 'H', 'n']);
    return [...count].filter(([c]) => !skip.has(c)).sort((a, b) => b[1] - a[1])[0][0];
  };

  it('EVR-01: as 3 aparências têm todo frame citado por ENEMY_ANIMS, em 32x24, só com cores da paleta', () => {
    expect(Object.keys(ENEMY_VARIANT_FRAMES).sort()).toEqual([...IDS].sort());
    for (const id of IDS) {
      const frames = ENEMY_VARIANT_FRAMES[id];
      const sheet = parseSheet(`enemy-${id}`, frames, PALETTE_KEYS);
      expect(sheet.width, id).toBe(ENEMY_FRAME_W);
      expect(sheet.height, id).toBe(ENEMY_FRAME_H);
      for (const [name, anim] of Object.entries(ENEMY_ANIMS)) {
        for (const f of anim.frames) expect(Object.hasOwn(frames, f), `${id} ${name}: ${f}`).toBe(true);
      }
    }
    expect(ENEMY_FRAMES).toBe(ENEMY_VARIANT_FRAMES.corcunda);
  });

  it('EVR-02: cada par difere em pelo menos 25% dos texels do idle-0 e a cor dominante é distinta', () => {
    const idle = (id: EnemyVariantId) => ENEMY_VARIANT_FRAMES[id]['idle-0'];
    const pairs: [EnemyVariantId, EnemyVariantId][] = [
      ['corcunda', 'rastejante'],
      ['corcunda', 'bruto'],
      ['rastejante', 'bruto'],
    ];
    for (const [a, b] of pairs) {
      const ra = idle(a);
      const rb = idle(b);
      const cellsA = nonEmpty(ra);
      const cellsB = nonEmpty(rb);
      const union = new Map<string, true>();
      for (const t of [...cellsA, ...cellsB]) union.set(`${t.x},${t.y}`, true);
      let differ = 0;
      for (const key of union.keys()) {
        const [x, y] = key.split(',').map(Number);
        if (ra[y][x] !== rb[y][x]) differ++;
      }
      expect(differ / Math.min(cellsA.length, cellsB.length), `${a} x ${b}`).toBeGreaterThanOrEqual(0.25);
    }
    expect(IDS.map((id) => dominant(idle(id)))).toEqual(['i', 'g', 'u']);
  });

  it('EVR-03: no frame attack a garra de cada aparência chega à borda da hitbox do ENEMY_ATTACK (até 1 texel além), na altura', () => {
    const originCol = ENEMY_ORIGIN.x * ENEMY_FRAME_W;
    const box = ENEMY_ATTACK.hitbox!;
    const edge = box.offsetX + box.width / 2;
    for (const id of IDS) {
      const rows = ENEMY_VARIANT_FRAMES[id][ENEMY_ANIMS.attack.frames[0]];
      const cells = nonEmpty(rows);
      const maxX = Math.max(...cells.map((t) => t.x));
      const reach = (maxX + 1 - originCol) * ART_SCALE;
      expect(reach, id).toBeGreaterThanOrEqual(edge);
      expect(reach, id).toBeLessThanOrEqual(edge + ART_SCALE);
      // a ponta (coluna mais à frente) fica na faixa vertical da hitbox: linhas 9..19 do frame (pé na linha 24, centro 18 px acima)
      for (const t of cells.filter((c) => c.x === maxX)) {
        const rowTop = (t.y - ENEMY_FRAME_H) * ART_SCALE + 18;
        expect(rowTop, id).toBeGreaterThanOrEqual(box.offsetY - box.height / 2 - ART_SCALE);
        expect(rowTop + ART_SCALE, id).toBeLessThanOrEqual(box.offsetY + box.height / 2 + ART_SCALE);
      }
    }
  });

  it('EVR-10: o idle-0 de cada aparência tem no máximo 4 texels k internos (sel-out aplicado)', () => {
    for (const id of IDS) {
      const rows = ENEMY_VARIANT_FRAMES[id]['idle-0'];
      let interior = 0;
      for (let y = 1; y < rows.length - 1; y++) {
        for (let x = 1; x < rows[y].length - 1; x++) {
          if (rows[y][x] !== 'k') continue;
          const n = [rows[y - 1][x], rows[y + 1][x], rows[y][x - 1], rows[y][x + 1]];
          if (n.every((c) => c !== TRANSPARENT)) interior++;
        }
      }
      expect(interior, id).toBeLessThanOrEqual(4);
    }
  });

  it('EVR-08: idle >= 4, walk >= 6, windup 2, attack 2 e getup >= 3 frames, todos com durations e todo frame citado existe', () => {
    const min: Record<string, number> = { idle: 4, walk: 6, windup: 2, attack: 2, getup: 3 };
    for (const [name, n] of Object.entries(min)) {
      const anim = ENEMY_ANIMS[name];
      if (name === 'windup' || name === 'attack') expect(anim.frames, name).toHaveLength(n);
      else expect(anim.frames.length, name).toBeGreaterThanOrEqual(n);
      expect(anim.durations, name).toBeDefined();
      expect(anim.durations!.length, name).toBe(anim.frames.length);
      for (const d of anim.durations!) expect(d, name).toBeGreaterThan(0);
      for (const id of IDS) for (const f of anim.frames) expect(Object.hasOwn(ENEMY_VARIANT_FRAMES[id], f), `${id} ${name}: ${f}`).toBe(true);
    }
  });

  it('EVR-09: o windup segura windup-1 nos últimos 200 ms do preparo (soma antes dele <= 250 ms; 250 passa, 251 falha)', () => {
    const holdsFinal200 = (durations: readonly number[]) => durations.slice(0, -1).reduce((a, b) => a + b, 0) <= ENEMY_AI.windupMs - 200;
    expect(ENEMY_AI.windupMs).toBe(450);
    expect(ENEMY_ANIMS.windup.frames.at(-1)).toBe('windup-1');
    expect(holdsFinal200(ENEMY_ANIMS.windup.durations!)).toBe(true);
    expect(holdsFinal200([250, 200])).toBe(true);
    expect(holdsFinal200([251, 199])).toBe(false);
    for (const id of IDS) {
      const frames = ENEMY_VARIANT_FRAMES[id];
      // o frame de máximo preparo é distinto do início e o alias `windup` aponta para ele
      expect(frames['windup-1'], id).not.toEqual(frames['windup-0']);
      expect(frames.windup, id).toEqual(frames['windup-1']);
    }
  });

  it('HRX-03: as 4 reações leves têm 3 frames (60, 90, 70 ms, uma vez), o frame 0 difere >= 2 texels de bbox do idle-0 e head-a difere de head-b; impact existe', () => {
    const bbox = (rows: readonly string[]): number[] => {
      const cells = nonEmpty(rows);
      return [Math.min(...cells.map((c) => c.x)), Math.min(...cells.map((c) => c.y)), Math.max(...cells.map((c) => c.x)), Math.max(...cells.map((c) => c.y))];
    };
    const names = ['hurt-head-a', 'hurt-head-b', 'hurt-uppercut', 'hurt-body'];
    for (const id of IDS) {
      const frames = ENEMY_VARIANT_FRAMES[id];
      const idle = bbox(frames['idle-0']);
      for (const n of names) {
        const anim = ENEMY_ANIMS[n];
        expect(anim.frames, `${id} ${n}`).toEqual([0, 1, 2].map((i) => `${n}-${i}`));
        expect(anim.durations, `${id} ${n}`).toEqual([60, 90, 70]);
        expect(anim.repeat, `${id} ${n}`).toBe(0);
        const b = bbox(frames[`${n}-0`]);
        expect(Math.max(...b.map((v, i) => Math.abs(v - idle[i]))), `${id} ${n} bbox`).toBeGreaterThanOrEqual(2);
      }
      expect(frames['hurt-head-a-0'], id).not.toEqual(frames['hurt-head-b-0']);
      expect(ENEMY_ANIMS.impact.frames).toEqual(['impact']);
      expect(Object.hasOwn(frames, 'impact'), id).toBe(true);
    }
  });

  it('as partes do ragdoll das 3 aparências têm 8x7, 8x10 e 3x8 texels e só cores da paleta', () => {
    for (const id of IDS) {
      const { head, torso, limb } = ENEMY_RAG_VARIANTS[id];
      const size = (g: readonly string[]) => [Math.max(...g.map((r) => r.length)), g.length];
      expect(size(head), id).toEqual([8, 7]);
      expect(size(torso), id).toEqual([8, 10]);
      expect(size(limb), id).toEqual([3, 8]);
      for (const [n, g] of Object.entries({ head, torso, limb })) parseSheet(`rag-${n}-${id}`, { [n]: g }, PALETTE_KEYS);
    }
    expect(ENEMY_RAG_PARTS).toBe(ENEMY_RAG_VARIANTS.corcunda);
  });
});

describe('ponta dos dedos do Vermelho por frame (RDA-04)', () => {
  const FRAMES = ['vermelho-sign', 'vermelho-charge', 'vermelho-release'] as const;
  const originCol = PLAYER_ORIGIN.x * PLAYER_FRAME_W;

  it.each(FRAMES)('%s: o pixel devolvido é R e é o de maior coluna entre todos os R do frame', (name) => {
    const rows = PLAYER_TECH_FRAMES[name];
    const { col, row } = redFingertip(name);
    expect(rows[row][col]).toBe('R');
    let maxCol = -1;
    rows.forEach((line) => [...line].forEach((ch, c) => { if (ch === 'R') maxCol = Math.max(maxCol, c); }));
    expect(col).toBe(maxCol);
  });

  it('a ponta avança com o braço: sign < charge < release em coluna', () => {
    expect(redFingertip('vermelho-sign').col).toBeLessThan(redFingertip('vermelho-charge').col);
    expect(redFingertip('vermelho-charge').col).toBeLessThan(redFingertip('vermelho-release').col);
  });

  it.each(FRAMES)('%s: o deslocamento em px usa a origem e a escala, e espelha em x com facing -1', (name) => {
    const { col, row } = redFingertip(name);
    const right = fingertipOffsetPx(name, 1);
    const left = fingertipOffsetPx(name, -1);
    expect(right).toEqual({ x: (col - originCol) * ART_SCALE, y: (row - PLAYER_FRAME_H) * ART_SCALE });
    expect(left.x).toBe(-right.x);
    expect(left.y).toBe(right.y);
    expect(right.x).toBeGreaterThan(0);
  });

  it('um frame que não é do Vermelho lança erro', () => {
    expect(() => redFingertip('azul-charge')).toThrow(/azul-charge/);
  });
});
