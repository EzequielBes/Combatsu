import { describe, expect, it } from 'vitest';
import { BossAI, type BossAIEvent, type BossAttack } from '../../src/core/bossAI';
import { animBase, beamThickness, threadXs } from '../../src/core/bossAttacks';
import { BOSS_ANIMS } from '../../src/game/art/sprites/boss';
import { BOSS } from '../../src/data/tuning';

const ALL: readonly BossAttack[] = ['charge', 'leap', 'volley', 'doubleCharge', 'tripleLeap', 'threadRain', 'beam'];

describe('threadXs (CYC-09)', () => {
  const offsets = BOSS.threadRain.offsets;

  it('marca 5 posições em volta do jogador no meio da arena', () => {
    expect(threadXs(500, 0, 1000, offsets)).toEqual([404, 452, 500, 548, 596]);
  });

  it('prende os fios à borda esquerda', () => {
    expect(threadXs(20, 0, 1000, offsets)).toEqual([0, 0, 20, 68, 116]);
  });

  it('prende os fios à borda direita', () => {
    expect(threadXs(990, 0, 1000, offsets)).toEqual([894, 942, 990, 1000, 1000]);
  });

  it('nenhum fio sai dos limites', () => {
    for (const x of [-50, 0, 47, 953, 1000, 1050]) {
      for (const tx of threadXs(x, 0, 1000, offsets)) {
        expect(tx).toBeGreaterThanOrEqual(0);
        expect(tx).toBeLessThanOrEqual(1000);
      }
    }
  });
});

describe('beamThickness (SNG-02)', () => {
  it('começa com 1 px e chega a 6 px em 800 ms', () => {
    expect(beamThickness(0, 800)).toBe(1);
    expect(beamThickness(800, 800)).toBe(6);
  });

  it('cresce sem voltar e fica entre 1 e 6 px', () => {
    let prev = 0;
    for (let ms = -100; ms <= 1000; ms += 50) {
      const px = beamThickness(ms, 800);
      expect(Number.isInteger(px)).toBe(true);
      expect(px).toBeGreaterThanOrEqual(Math.max(1, prev));
      expect(px).toBeLessThanOrEqual(6);
      prev = px;
    }
  });

  it('aviso de 0 ms já nasce grosso', () => {
    expect(beamThickness(0, 0)).toBe(6);
  });
});

describe('animBase (CYC-11)', () => {
  it('os ataques novos caem nos quadros da investida, do salto e da rajada', () => {
    expect(animBase('doubleCharge')).toBe('charge');
    expect(animBase('tripleLeap')).toBe('leap');
    expect(animBase('threadRain')).toBe('volley');
    expect(animBase('beam')).toBe('volley');
  });

  it('os ataques antigos tocam o próprio quadro', () => {
    for (const a of ['charge', 'leap', 'volley'] as const) expect(animBase(a)).toBe(a);
  });

  it('todo ataque toca animações que existem na folha do chefe (preparo e corpo)', () => {
    for (const a of ALL) {
      expect(BOSS_ANIMS[animBase(a)]).toBeDefined();
      expect(BOSS_ANIMS[`windup-${animBase(a)}`]).toBeDefined();
    }
  });
});

describe('chargeTrail ao fim da investida (IGN-01)', () => {
  const DT = 16;
  /** Passo máximo de um frame da investida: o trecho pode ficar até isso aquém do alcance (o corpo anda depois). */
  const STEP = (BOSS.charge.speed * DT) / 1000;
  const ONI_SPEC = { volleyCount: 3, projectileSpeed: 260 };
  const onlyCharge = { ...BOSS, cycles: { 1: ['charge'], 2: ['charge'], 3: ['charge'] } } as const;

  type Trail = Extract<BossAIEvent, { type: 'chargeTrail' }>;

  /**
   * Roda o chefe frame a frame como o motor: a observação vê a posição de agora e o corpo anda com o `vx` devolvido;
   * `wallX` para o corpo na parede e liga `blocked`. Para no fim da 1ª investida (ou em `untilMs`).
   */
  function run(opts: { selfX: number; playerX: number; wallX?: number; untilMs?: number; interruptAtMs?: number }) {
    const ai = new BossAI(onlyCharge);
    let x = opts.selfX;
    let blocked = false;
    const trails: Trail[] = [];
    let endEvents: BossAIEvent[] = [];
    let endX = x;
    for (let ms = 0; ms < (opts.untilMs ?? 5000); ms += DT) {
      const canAct = opts.interruptAtMs === undefined || ms < opts.interruptAtMs;
      const out = ai.update(DT, { selfX: x, playerX: opts.playerX, blocked, canAct, phase: 1, spec: ONI_SPEC });
      for (const e of out.events) if (e.type === 'chargeTrail') trails.push(e);
      if (trails.length > 0 && opts.untilMs === undefined) {
        endEvents = out.events;
        endX = x;
        break;
      }
      const next = x + (out.vx * DT) / 1000;
      const wall = opts.wallX;
      blocked = wall !== undefined && (opts.selfX < wall ? next >= wall : next <= wall);
      x = blocked && wall !== undefined ? wall : next;
    }
    return { trails, endEvents, endX };
  }

  it('por alcance, para a direita: do X de saída até onde o corpo parou, cobrindo o alcance', () => {
    const { trails, endX } = run({ selfX: 500, playerX: 1000 });
    expect(trails).toHaveLength(1);
    const [t] = trails;
    expect(t.fromX).toBe(500);
    expect(t.toX).toBe(endX);
    expect(t.toX).toBeGreaterThan(t.fromX);
    expect(t.toX - t.fromX).toBeGreaterThanOrEqual(BOSS.charge.maxDist - STEP);
    expect(t.toX - t.fromX).toBeLessThanOrEqual(BOSS.charge.maxDist);
  });

  it('por alcance, para a esquerda: toX fica à esquerda de fromX', () => {
    const { trails } = run({ selfX: 500, playerX: 0 });
    expect(trails).toHaveLength(1);
    const [t] = trails;
    expect(t.fromX).toBe(500);
    expect(t.toX).toBeLessThan(t.fromX);
    expect(t.fromX - t.toX).toBeGreaterThanOrEqual(BOSS.charge.maxDist - STEP);
    expect(t.fromX - t.toX).toBeLessThanOrEqual(BOSS.charge.maxDist);
  });

  it('pela parede à direita: o trecho acaba na parede, no mesmo frame do wallStun', () => {
    const { trails, endEvents } = run({ selfX: 500, playerX: 1000, wallX: 600 });
    expect(trails).toEqual([{ type: 'chargeTrail', fromX: 500, toX: 600 }]);
    expect(endEvents.map((e) => e.type)).toEqual(['hitboxOff', 'wallStun', 'chargeTrail']);
  });

  it('pela parede à esquerda: o trecho acaba na parede', () => {
    const { trails } = run({ selfX: 500, playerX: 0, wallX: 420 });
    expect(trails).toEqual([{ type: 'chargeTrail', fromX: 500, toX: 420 }]);
  });

  it('um rastro por investida, cada um saindo de onde a anterior parou', () => {
    const { trails } = run({ selfX: 100, playerX: 5000, untilMs: 8000 });
    expect(trails.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < trails.length; i++) expect(trails[i].fromX).toBe(trails[i - 1].toX);
  });

  it('investida cancelada sem canAct não deixa rastro', () => {
    const windup = BOSS.charge.windupMs * BOSS.phases[0].windupMult;
    const { trails } = run({ selfX: 500, playerX: 1000, untilMs: 3000, interruptAtMs: windup + 200 });
    expect(trails).toEqual([]);
  });
});
