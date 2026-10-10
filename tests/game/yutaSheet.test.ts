import { describe, expect, it } from 'vitest';
import { RUN_FRAMES } from '../../src/game/art/hd/families/locomotion';
import { hdEnabled, yutaEnabled } from '../../src/game/art/hd/flag';
import { HD_MIN_FRAME_MS, HD_RUN_FRAME_MS } from '../../src/game/art/hd/sheet';
import {
  THROW_RUN,
  YUTA_FRAME,
  YUTA_ORIGIN,
  YUTA_SCALE,
  decodeAtlasFrame,
  yutaAnchors,
  yutaAnims,
  yutaHasAnim,
  yutaHasFrame,
  yutaMoveFrame,
  yutaRunEdgeMs,
  yutaSheet,
} from '../../src/game/art/hd/atlas/yutaSheet';
import { SIZE } from '../../src/game/textures';

const sheet = yutaSheet();
const W: number = YUTA_FRAME.w;
const H: number = YUTA_FRAME.h;

/** Linhas de cima e de baixo e colunas extremas dos texels opacos de um quadro. */
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

describe('decodeAtlasFrame', () => {
  it('desfaz os pares (repetições, índice)', () => {
    const encoded = btoa(String.fromCharCode(3, 0, 2, 5, 1, 7));
    expect([...decodeAtlasFrame(encoded, 6)]).toEqual([0, 0, 0, 5, 5, 7]);
  });

  it('recusa um quadro do tamanho errado', () => {
    expect(() => decodeAtlasFrame(btoa(String.fromCharCode(3, 0)), 4)).toThrow(/esperava 4/);
  });
});

describe('folha player-yuta', () => {
  it('todo quadro tem o tamanho da célula e só índices da tabela de cores', () => {
    expect(Object.keys(sheet.frames).length).toBeGreaterThan(0);
    for (const [name, px] of Object.entries(sheet.frames)) {
      expect(px.length, name).toBe(W * H);
      expect(Math.max(...px), name).toBeLessThan(sheet.colors.length);
    }
  });

  it('a guarda apoia a sola na última linha e tem a altura do corpo de 60 px de mundo', () => {
    const box = bbox(sheet.frames['idle-0']);
    expect(box.bottom).toBe(H - 1);
    const worldH = (box.bottom - box.top + 1) * YUTA_SCALE;
    expect(worldH).toBeGreaterThanOrEqual(56);
    expect(worldH).toBeLessThanOrEqual(64);
  });

  it('o eixo do corpo da guarda fica sobre a origem, dentro da meia largura do corpo físico', () => {
    const box = bbox(sheet.frames['idle-0']);
    const mid = (box.left + box.right) / 2;
    expect(Math.abs(mid - YUTA_FRAME.originCol) * YUTA_SCALE).toBeLessThanOrEqual(SIZE.player.w / 2);
    expect(YUTA_ORIGIN).toEqual({ x: YUTA_FRAME.originCol / W, y: 1 });
  });

  it('nenhum quadro encosta nas bordas laterais nem no alto da célula', () => {
    for (const [name, px] of Object.entries(sheet.frames)) {
      const box = bbox(px);
      expect(box.left, name).toBeGreaterThan(0);
      expect(box.right, name).toBeLessThan(W - 1);
      expect(box.top, name).toBeGreaterThan(0);
    }
  });

  it('na corrida a cabeça sobe e desce pouco e os pés nunca ficam longe do chão', () => {
    const run = yutaAnims().run.frames.map((f) => bbox(sheet.frames[f]));
    const tops = run.map((b) => b.top * YUTA_SCALE);
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(10);
    for (const b of run) expect((H - 1 - b.bottom) * YUTA_SCALE).toBeLessThanOrEqual(8);
  });
});

describe('animações da folha player-yuta', () => {
  it('tem a guarda e a corrida, com todos os quadros na folha', () => {
    expect(yutaHasAnim('idle')).toBe(true);
    expect(yutaHasAnim('run')).toBe(true);
    expect(yutaHasAnim('jab')).toBe(false);
    for (const def of Object.values(yutaAnims())) expect(def.frames.every(yutaHasFrame)).toBe(true);
  });

  it('o ciclo da corrida, de duas passadas, dura o mesmo que o da folha HD, com cada quadro acima do tempo mínimo', () => {
    const { durations, frames } = yutaAnims().run;
    expect(durations).toHaveLength(frames.length);
    const total = durations!.reduce((a, b) => a + b, 0);
    expect(Math.abs(total - RUN_FRAMES * HD_RUN_FRAME_MS)).toBeLessThanOrEqual(frames.length);
    for (const ms of durations!) expect(ms).toBeGreaterThanOrEqual(HD_MIN_FRAME_MS);
  });
});

describe('golpes e pulo da folha player-yuta', () => {
  it('o golpe que a folha tem mostra a antecipação, o impacto e a antecipação de novo na volta', () => {
    expect(yutaMoveFrame('jab', 'startup')).toBe('jab-wind');
    expect(yutaMoveFrame('jab', 'active')).toBe('jab-hit');
    expect(yutaMoveFrame('jab', 'recovery')).toBe('jab-wind');
    for (const move of ['direto', 'chuteFrontal', 'chuteAlto', 'rasteira', 'voadora'])
      expect(yutaMoveFrame(move, 'active'), move).toBe(`${move}-hit`);
  });

  it('o golpe que a folha não tem fica para a folha HD', () => {
    expect(yutaMoveFrame('chuteCarregado', 'active')).toBeUndefined();
  });

  it('no impacto o membro passa da guarda: o punho e o pé chegam mais longe que a mão da guarda', () => {
    const guard = bbox(sheet.frames['idle-0']).right;
    for (const move of ['jab', 'direto', 'chuteFrontal', 'rasteira'])
      expect(bbox(sheet.frames[`${move}-hit`]).right, move).toBeGreaterThan(guard + 10);
  });

  it('tem as animações do ar e o agachar', () => {
    for (const name of ['jump', 'apex', 'fall', 'land']) expect(yutaHasAnim(name), name).toBe(true);
    expect(yutaHasFrame('duck')).toBe(true);
    const duck = bbox(sheet.frames.duck);
    expect(duck.bottom - duck.top).toBeLessThan(bbox(sheet.frames['idle-0']).bottom - bbox(sheet.frames['idle-0']).top);
  });
});

describe('defesa, reação e técnicas da folha player-yuta', () => {
  it('tem os quadros de defesa que o animador pede pelo nome', () => {
    for (const frame of ['guard', 'parry', 'dodge-0', 'dodge-1', 'duck', 'hurt'])
      expect(yutaHasFrame(frame), frame).toBe(true);
    expect(yutaAnims().hurt.frames).toEqual(['hurt', 'hurt-1']);
    expect(yutaHasFrame('stunned-0') && yutaHasFrame('stunned-1')).toBe(true);
  });

  it('cada técnica tem selo, carga, disparo e volta, com a mão que conjura marcada dentro do corpo', () => {
    for (const tech of ['vermelho', 'azul', 'corte', 'divergente']) {
      for (const state of ['sign', 'charge', 'release', 'recover']) {
        const frame = `${tech}-${state}`;
        expect(yutaHasFrame(frame), frame).toBe(true);
        const hand = yutaAnchors(frame);
        expect(hand, frame).toBeDefined();
        const box = bbox(sheet.frames[frame]);
        const col = YUTA_FRAME.originCol + hand!.tip.x / YUTA_SCALE;
        const row = H - 1 + hand!.tip.y / YUTA_SCALE;
        expect(col, frame).toBeGreaterThanOrEqual(box.left - 4);
        expect(col, frame).toBeLessThanOrEqual(box.right + 4);
        expect(row, frame).toBeGreaterThanOrEqual(box.top - 4);
        expect(row, frame).toBeLessThanOrEqual(box.bottom);
      }
    }
    expect(yutaHasFrame('kokusen-hit')).toBe(true);
  });

  it('no disparo do Vermelho a mão está à frente e acima da cintura', () => {
    const hand = yutaAnchors('vermelho-release')!;
    expect(hand.tip.x).toBeGreaterThan(20);
    expect(hand.tip.y).toBeLessThan(-30);
    expect(yutaAnchors('idle-0')).toBeUndefined();
  });
});

describe('objeto na mão e transições da corrida na folha player-yuta', () => {
  it('parado com objeto e o arremesso são animações da folha, com a mão e o giro do objeto marcados', () => {
    for (const anim of ['carry-idle', 'throw']) {
      expect(yutaHasAnim(anim), anim).toBe(true);
      for (const frame of yutaAnims()[anim].frames) {
        const hand = yutaAnchors(frame);
        expect(hand, frame).toBeDefined();
        expect(hand!.nearAngle, frame).toBeGreaterThanOrEqual(0);
        expect(hand!.nearAngle, frame).toBeLessThanOrEqual(180);
        expect(hand!.near.y, frame).toBeLessThan(-25);
      }
    }
  });

  it('o golpe com objeto leve sai da folha: antecipação, impacto e volta própria', () => {
    expect(yutaMoveFrame('swing', 'startup')).toBe('swing-wind');
    expect(yutaMoveFrame('swing', 'active')).toBe('swing-hit');
    expect(yutaMoveFrame('swing', 'recovery')).toBe('swing-recover');
    expect(yutaAnchors('swing-hit')!.near.x).toBeGreaterThan(yutaAnchors('swing-wind')!.near.x);
  });

  it('a arrancada e a freada tocam uma vez e são curtas: no máximo 300 ms', () => {
    for (const edge of ['run-start', 'run-stop'] as const) {
      const def = yutaAnims()[edge];
      expect(def.repeat, edge).toBe(0);
      expect(def.frames.every(yutaHasFrame), edge).toBe(true);
      expect(yutaRunEdgeMs(edge), edge).toBe(def.durations!.reduce((a, b) => a + b, 0));
      expect(yutaRunEdgeMs(edge), edge).toBeLessThanOrEqual(300);
    }
  });
});

describe('corrida com objeto, arremesso em corrida e respiração na folha player-yuta', () => {
  it('a corrida com objeto dura o mesmo que a corrida e tem a mão marcada em todo quadro', () => {
    const total = (name: string): number => yutaAnims()[name].durations!.reduce((a, b) => a + b, 0);
    expect(Math.abs(total('carry-run') - total('run'))).toBeLessThanOrEqual(8);
    for (const frame of yutaAnims()['carry-run'].frames) expect(yutaAnchors(frame), frame).toBeDefined();
  });

  it('o arremesso em corrida toca uma vez, dentro dos 200 ms da pose de arremesso', () => {
    const def = yutaAnims()[THROW_RUN];
    expect(def.repeat).toBe(0);
    expect(def.frames.length).toBeGreaterThanOrEqual(3);
    expect(def.durations!.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(200);
    for (const ms of def.durations!) expect(ms).toBeGreaterThanOrEqual(HD_MIN_FRAME_MS);
  });

  it('a guarda respira entre o quadro base e o segundo, sem tirar os pés do lugar', () => {
    const { frames, durations } = yutaAnims().idle;
    expect(frames).toEqual(['idle-0', 'idle-1']);
    expect(durations).toHaveLength(2);
    const [a, b] = frames.map((f) => bbox(sheet.frames[f]));
    expect(Math.abs(a.left - b.left)).toBeLessThanOrEqual(2);
    expect(Math.abs(a.right - b.right)).toBeLessThanOrEqual(3);
    expect(Math.abs(a.top - b.top)).toBeLessThanOrEqual(3);
  });

  it('o soco do Divergente e o do Kokusen chegam à frente do corpo, onde a hitbox está', () => {
    for (const frame of ['divergente-release', 'kokusen-hit'])
      expect((bbox(sheet.frames[frame]).right - YUTA_FRAME.originCol) * YUTA_SCALE, frame).toBeGreaterThanOrEqual(34);
  });
});

describe('objeto pesado e socos novos na folha player-yuta', () => {
  it('a pegada pesada tem parado, corrida, arremesso e arremesso em corrida, com a mão marcada', () => {
    for (const anim of ['heavy-carry-idle', 'heavy-carry-run', 'heavy-throw', 'heavy-throw-run']) {
      expect(yutaHasAnim(anim), anim).toBe(true);
      for (const frame of yutaAnims()[anim].frames) expect(yutaAnchors(frame), frame).toBeDefined();
    }
    // Parado, o objeto não pula: os dois quadros prendem no mesmo ponto.
    expect(yutaAnchors('heavy-carry-idle-0')).toEqual(yutaAnchors('heavy-carry-idle-1'));
    // No arremesso o objeto sai de cima da cabeça para a frente do corpo.
    expect(yutaAnchors('heavy-throw-0')!.near.y).toBeLessThan(yutaAnchors('heavy-throw-1')!.near.y);
    expect(yutaAnchors('heavy-throw-1')!.near.x).toBeGreaterThan(yutaAnchors('heavy-throw-0')!.near.x);
  });

  it('gancho, cotovelada e contra-gancho têm antecipação e impacto na folha', () => {
    for (const move of ['gancho', 'cotovelada', 'contraGancho']) {
      expect(yutaMoveFrame(move, 'startup'), move).toBe(`${move}-wind`);
      expect(yutaMoveFrame(move, 'active'), move).toBe(`${move}-hit`);
    }
  });

  it('voadora e soco baixo têm volta própria', () => {
    expect(yutaMoveFrame('voadora', 'recovery')).toBe('voadora-recover');
    expect(yutaMoveFrame('socoBaixo', 'recovery')).toBe('socoBaixo-recover');
  });

  it('nos golpes de chão que partem da guarda os pés ficam onde a guarda os tem', () => {
    const guard = bbox(sheet.frames['idle-0']);
    for (const frame of ['jab-hit', 'direto-wind', 'direto-hit', 'gancho-hit', 'socoBaixo-hit'])
      expect(Math.abs(bbox(sheet.frames[frame]).left - guard.left), frame).toBeLessThanOrEqual(4);
  });
});

describe('golpes com arma na folha player-yuta', () => {
  it('os três golpes do combo com objeto leve e os dois com objeto pesado têm antecipação, impacto e volta', () => {
    for (const move of ['swing', 'swing-2', 'swing-3', 'heavy-swing', 'heavy-swing-2']) {
      expect(yutaMoveFrame(move, 'startup'), move).toBe(`${move}-wind`);
      expect(yutaMoveFrame(move, 'active'), move).toBe(`${move}-hit`);
      expect(yutaMoveFrame(move, 'recovery'), move).toBe(`${move}-recover`);
      for (const part of ['wind', 'hit', 'recover']) expect(yutaAnchors(`${move}-${part}`), move).toBeDefined();
    }
  });

  it('do começo ao impacto a arma desce de cima da cabeça e vai para a frente', () => {
    for (const move of ['swing', 'swing-2', 'heavy-swing', 'heavy-swing-2']) {
      const wind = yutaAnchors(`${move}-wind`)!;
      const hit = yutaAnchors(`${move}-hit`)!;
      expect(hit.near.y, move).toBeGreaterThan(wind.near.y);
      expect(hit.near.x, move).toBeGreaterThan(wind.near.x);
      expect(hit.nearAngle, move).toBeGreaterThan(wind.nearAngle);
    }
  });
});

describe('yutaEnabled', () => {
  it('acompanha o HD e desliga com ?yuta=0', () => {
    expect(yutaEnabled('')).toBe(true);
    expect(yutaEnabled('?debug')).toBe(true);
    expect(yutaEnabled('?yuta=0')).toBe(false);
    expect(yutaEnabled('?hd=0')).toBe(false);
    expect(hdEnabled('?yuta=0')).toBe(true);
  });
});
