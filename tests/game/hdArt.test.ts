import { describe, expect, it } from 'vitest';
import { strikeToBody } from '../../src/core/strikePath';
import { RIG_UPPERCUT_HITBOX } from '../../src/game/art/rig/flag';
import { HD_COLORS } from '../../src/game/art/hd/palette';
import { HD_STAGE, renderHdPlayer } from '../../src/game/art/hd/player';
import { moveFrameName } from '../../src/game/art/hd/frames';
import { PLAYER_ANIMS } from '../../src/game/art/sprites/player';
import {
  HD_FRAME,
  hdAnims,
  hdHasAnim,
  hdHasFrame,
  hdHeldName,
  hdPlayerSheet,
  hdStrike,
} from '../../src/game/art/hd/sheet';
import { SIZE } from '../../src/game/textures';

const render = renderHdPlayer();
const { w: W, h: H } = HD_STAGE;

/** Caixa dos texels opacos de um quadro. */
function bbox(px: Uint8Array): { top: number; bottom: number; left: number; right: number } {
  const box = { top: H, bottom: -1, left: W, right: -1 };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (px[y * W + x] === 0) continue;
      box.top = Math.min(box.top, y);
      box.bottom = Math.max(box.bottom, y);
      box.left = Math.min(box.left, x);
      box.right = Math.max(box.right, x);
    }
  }
  return box;
}

const HD_IDLE_FRAMES = PLAYER_ANIMS.idle.frames;
const ALL_FRAMES = Object.keys(render.frames);

describe('HD-01: a folha player-hd tem os quadros do contrato', () => {
  it('o stage do rasterizador e o frame da folha são o mesmo 96x80 com o eixo na coluna 36', () => {
    expect(HD_STAGE).toEqual({ w: HD_FRAME.w, h: HD_FRAME.h, originCol: HD_FRAME.originCol });
  });

  it('todo quadro tem 96x80 índices, e o idle e os golpes HD têm todos os seus quadros', () => {
    const sheet = hdPlayerSheet();
    for (const key of ALL_FRAMES) expect(sheet.frames[key]?.length, key).toBe(W * H);
    for (const key of HD_IDLE_FRAMES) expect(hdHasFrame(key), key).toBe(true);
    for (const move of render.moves) {
      for (const key of [`${move}-wind`, `${move}-hit`, `${move}-recover`, moveFrameName(move, 'recovery', 2)])
        expect(hdHasFrame(key), key).toBe(true);
    }
  });

  it('a animação idle existe inteira na folha HD', () => {
    expect(Object.keys(hdAnims())).toContain('idle');
  });

  it('carregar objeto tem as duas pegadas: a leve com os nomes da folha antiga e a pesada com o prefixo heavy-', () => {
    const anims = Object.keys(hdAnims());
    for (const name of ['carry-idle', 'carry-run', 'heavy-carry-idle', 'heavy-carry-run'])
      expect(anims).toContain(name);
    expect(render.moves).toContain('swing');
    expect(render.moves).toContain('heavy-swing');
    expect(hdHeldName('carry-idle', true, hdHasAnim)).toBe('heavy-carry-idle');
    expect(hdHeldName('carry-idle', false, hdHasAnim)).toBe('carry-idle');
    expect(hdHeldName('jab-hit', true, hdHasFrame)).toBe('jab-hit');
  });

  it('todo índice de cor existe na tabela e a paleta fica em até 64 cores', () => {
    expect(HD_COLORS.length - 1).toBeLessThanOrEqual(64);
    for (const key of ALL_FRAMES) {
      expect(Math.max(...render.frames[key]), key).toBeLessThan(HD_COLORS.length);
    }
  });
});

describe('HD-02: o corpo cabe no frame e pisa no chão', () => {
  it('nenhum quadro encosta nas bordas de cima, da esquerda ou da direita (nada foi cortado)', () => {
    for (const key of ALL_FRAMES) {
      const b = bbox(render.frames[key]);
      expect(b.top, key).toBeGreaterThan(0);
      expect(b.left, key).toBeGreaterThan(0);
      expect(b.right, key).toBeLessThan(W - 1);
    }
  });

  it('no idle o pé chega à última linha do frame e o corpo mede de 58 a 66 texels com o cabelo', () => {
    for (const key of HD_IDLE_FRAMES) {
      const b = bbox(render.frames[key]);
      expect(b.bottom, key).toBe(H - 1);
      const height = b.bottom - b.top + 1;
      expect(height, key).toBeGreaterThanOrEqual(58);
      expect(height, key).toBeLessThanOrEqual(66);
    }
  });

  it('os 4 quadros do idle respiram: não são todos iguais', () => {
    const distinct = new Set(HD_IDLE_FRAMES.map((k) => render.frames[k].join(',')));
    expect(distinct.size).toBeGreaterThanOrEqual(3);
  });
});

describe('HD-03: o gancho bate acima e à frente da cabeça, dentro da hitbox', () => {
  const hit = hdStrike('ganchoAscendente-hit')!;
  const wind = hdStrike('ganchoAscendente-wind')!;

  it('o punho do pico fica acima do punho da antecipação e à frente do eixo', () => {
    expect(hit.pt.row).toBeLessThan(wind.pt.row - 20);
    expect(hit.pt.col).toBeGreaterThan(HD_FRAME.originCol + 6);
  });

  it('o punho do pico é opaco no quadro do pico', () => {
    const px = render.frames[moveFrameName('ganchoAscendente', 'active', 0)];
    expect(px[hit.pt.row * W + hit.pt.col]).not.toBe(0);
  });

  it('o ponto de golpe cai na hitbox do gancho do corpo alto, com 4 px de folga', () => {
    const p = strikeToBody(hit.pt, SIZE.player.h, { ...hit.frame, texelPx: hit.texelPx });
    const hb = RIG_UPPERCUT_HITBOX;
    expect(p.x).toBeGreaterThanOrEqual(hb.offsetX - hb.width / 2 - 4);
    expect(p.x).toBeLessThanOrEqual(hb.offsetX + hb.width / 2 + 4);
    expect(p.y).toBeGreaterThanOrEqual(hb.offsetY - hb.height / 2 - 4);
    expect(p.y).toBeLessThanOrEqual(hb.offsetY + hb.height / 2 + 4);
  });

  it('frame sem ponto de golpe devolve undefined', () => {
    expect(hdStrike('idle-0')).toBeUndefined();
  });
});
