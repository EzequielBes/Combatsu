import { describe, expect, it } from 'vitest';
import { strikeToBody } from '../../src/core/strikePath';
import { RIG_UPPERCUT_HITBOX } from '../../src/game/art/rig/flag';
import { HD_COLORS } from '../../src/game/art/hd/palette';
import { ANKLE_HEIGHT } from '../../src/game/art/hd/body';
import { RUN_FRAMES, RUN_STEP } from '../../src/game/art/hd/families/locomotion';
import { HD_STAGE, hdFrameSpecs, renderHdPlayer } from '../../src/game/art/hd/player';
import { solve, worldAngles } from '../../src/game/art/rig/skeleton';
import { PLAYER_MOVE } from '../../src/data/tuning';
import { moveFrameName } from '../../src/game/art/hd/frames';
import { PLAYER_ANIMS } from '../../src/game/art/sprites/player';
import {
  HD_FRAME,
  HD_RUN_FRAME_MS,
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

describe('corrida HD: ciclo de 8 quadros sem patinar', () => {
  const specs = hdFrameSpecs().frames;
  const GROUND = H - 1 - ANKLE_HEIGHT;

  it('run, carry-run e heavy-carry-run têm os 8 quadros na folha, todos com a mesma duração', () => {
    for (const name of ['run', 'carry-run', 'heavy-carry-run']) {
      const def = hdAnims()[name]!;
      expect(def.frames, name).toEqual(Array.from({ length: RUN_FRAMES }, (_, i) => `${name}-${i}`));
      expect(def.durations, name).toEqual(def.frames.map(() => HD_RUN_FRAME_MS));
      expect(def.repeat, name).toBe(-1);
    }
  });

  it('o que o corpo anda num quadro, na velocidade de corrida, é o passo do pé de apoio (menos de 0,2 px de sobra)', () => {
    expect(Math.abs((PLAYER_MOVE.runSpeed * HD_RUN_FRAME_MS) / 1000 - RUN_STEP)).toBeLessThan(0.2);
  });

  it('cada pé fica três quadros seguidos no chão, e o ponto de apoio recua RUN_STEP de um para o outro', () => {
    for (const name of ['run', 'carry-run', 'heavy-carry-run']) {
      const joints = Array.from({ length: RUN_FRAMES }, (_, i) => solve(specs[`${name}-${i}`]!.pose));
      for (const [side, first] of [
        ['Near', 0],
        ['Far', RUN_FRAMES / 2],
      ] as const) {
        const [land, flat, push] = [0, 1, 2].map((d) => joints[first + d]!);
        // Contato e amortecimento apoiam o calcanhar; no impulso o calcanhar sobe e a ponta fica presa ao chão.
        expect(land![`ankle${side}`].y, name).toBeCloseTo(GROUND, 5);
        expect(flat![`ankle${side}`].y, name).toBeCloseTo(GROUND, 5);
        expect(push![`toe${side}`].y, name).toBeCloseTo(GROUND, 5);
        expect(land![`ankle${side}`].x - flat![`ankle${side}`].x, name).toBeCloseTo(RUN_STEP, 5);
        expect(flat![`toe${side}`].x - push![`toe${side}`].x, name).toBeCloseTo(RUN_STEP, 5);
        // No resto do ciclo o pé está no ar.
        for (let d = 3; d < RUN_FRAMES; d++) {
          const j = joints[(first + d) % RUN_FRAMES]!;
          expect(Math.max(j[`ankle${side}`].y, j[`toe${side}`].y), `${name} ${side} +${d}`).toBeLessThan(GROUND - 1);
        }
      }
    }
  });

  it('o joelho nunca inverte e o cotovelo dos braços que bombeiam dobra sempre para o mesmo lado', () => {
    for (let i = 0; i < RUN_FRAMES; i++) {
      const wa = worldAngles(specs[`run-${i}`]!.pose);
      const turn = (a: number): number => ((((a + 180) % 360) + 360) % 360) - 180;
      for (const side of ['Near', 'Far'] as const) {
        expect(turn(wa[`thigh${side}`] - wa[`shin${side}`]), `run-${i} joelho ${side}`).toBeGreaterThan(0);
        expect(turn(wa[`foreArm${side}`] - wa[`upperArm${side}`]), `run-${i} cotovelo ${side}`).toBeGreaterThan(0);
      }
    }
  });

  it('o quadril sobe e desce duas vezes por ciclo: os dois passos têm a mesma altura quadro a quadro', () => {
    const y = Array.from({ length: RUN_FRAMES }, (_, i) => specs[`run-${i}`]!.pose.root.y);
    for (let i = 0; i < RUN_FRAMES / 2; i++) expect(y[i]).toBeCloseTo(y[i + RUN_FRAMES / 2]!, 5);
    expect(Math.max(...y) - Math.min(...y)).toBeGreaterThanOrEqual(4);
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
