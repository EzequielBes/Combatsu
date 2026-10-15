import { describe, expect, it } from 'vitest';
import { BossAI, type BossAIObservation, type BossAITuning } from '../../src/core/bossAI';
import { BOSS } from '../../src/data/tuning';

/** Ciclos do Oni fixados aqui (CYC-03): a fase 2 abre com a Investida Dupla; a fase 3 abre com a rajada. */
const TUNING: BossAITuning = {
  ...BOSS,
  cycles: {
    1: ['charge', 'leap'],
    2: ['doubleCharge', 'volley', 'leap'],
    3: ['volley', 'charge', 'tripleLeap', 'doubleCharge'],
  },
};

const WINDUP_P2 = BOSS.charge.windupMs * BOSS.phases[1].windupMult; // 510 ms: abre como a investida
const CHARGE_MS = (BOSS.charge.maxDist / BOSS.charge.speed) * 1000; // 1125 ms até o alcance máximo
const REWINDUP = BOSS.doubleCharge.rewindupMs; // 250 ms, sem windupMult
const REST_P2 = BOSS.phases[1].restMs;

function obs(extra: Partial<BossAIObservation> = {}): BossAIObservation {
  return {
    selfX: 0,
    playerX: 1000,
    blocked: false,
    canAct: true,
    phase: 2,
    spec: { volleyCount: 3, projectileSpeed: 260 },
    ...extra,
  };
}

/** Leva a IA até o fim da 1ª investida pelo alcance: devolve a saída desse frame. */
function endFirstCharge(ai: BossAI, end: Partial<BossAIObservation> = {}) {
  ai.update(WINDUP_P2, obs());
  return ai.update(CHARGE_MS, obs({ selfX: BOSS.charge.maxDist, ...end }));
}

describe('BossAI: Investida Dupla, preparo da 2ª investida (CYC-05)', () => {
  it('o preparo de abertura é o da investida com o windupMult da fase: 509 ms ainda prepara, 510 ms investe', () => {
    const ai = new BossAI(TUNING);
    expect(ai.update(WINDUP_P2 - 1, obs()).state).toBe('windup');
    const out = ai.update(1, obs());
    expect(out.state).toBe('charge');
    expect(out.attack).toBe('doubleCharge');
    expect(out.vx).toBe(BOSS.charge.speed);
    expect(out.events).toEqual([{ type: 'hitboxOn' }]);
  });

  it('fim pelo alcance: sem descanso, entra no preparo; 249 ms ainda prepara, 250 ms começa a 2ª', () => {
    const ai = new BossAI(TUNING);
    const end = endFirstCharge(ai);
    expect(end.state).toBe('windup');
    expect(end.attack).toBe('doubleCharge');
    expect(end.vx).toBe(0);
    expect(end.events.map((e) => e.type)).toEqual(['hitboxOff', 'chargeTrail']);

    const before = ai.update(REWINDUP - 1, obs({ selfX: 360 }));
    expect(before.state).toBe('windup');
    expect(before.vx).toBe(0);
    expect(before.events).toEqual([]);

    const second = ai.update(1, obs({ selfX: 360 }));
    expect(second.state).toBe('charge');
    expect(second.attack).toBe('doubleCharge');
    expect(second.events).toEqual([{ type: 'hitboxOn' }]);
  });

  it('a 2ª investida vai para o player: atrás do chefe ao fim da 1ª, ela volta (vx < 0)', () => {
    const ai = new BossAI(TUNING);
    endFirstCharge(ai, { playerX: 100 });
    const second = ai.update(REWINDUP, obs({ selfX: 360, playerX: 100 }));
    expect(second.state).toBe('charge');
    expect(second.vx).toBe(-BOSS.charge.speed);
  });

  it('a 2ª sai do X onde a 1ª parou: o rastro dela começa ali', () => {
    const ai = new BossAI(TUNING);
    endFirstCharge(ai, { playerX: 100 });
    ai.update(REWINDUP, obs({ selfX: 360, playerX: 100 }));
    const end = ai.update(CHARGE_MS, obs({ selfX: 0, playerX: 100 }));
    expect(end.events).toContainEqual({ type: 'chargeTrail', fromX: 360, toX: 0 });
  });

  it('a sobra do frame do fim da 1ª corre no preparo: um update só cobre preparo + 1ª + 250 ms', () => {
    const ai = new BossAI(TUNING);
    const out = ai.update(WINDUP_P2 + CHARGE_MS + REWINDUP, obs());
    expect(out.state).toBe('charge');
    expect(out.attack).toBe('doubleCharge');
  });

  it('fim da 2ª pelo alcance: descanso da fase e o ciclo segue para a rajada', () => {
    const ai = new BossAI(TUNING);
    endFirstCharge(ai);
    ai.update(REWINDUP, obs({ selfX: 360 }));
    const end = ai.update(CHARGE_MS, obs({ selfX: 0 }));
    expect(end.state).toBe('rest');
    expect(end.attack).toBeNull();
    expect(ai.update(REST_P2 - 1, obs()).state).toBe('rest');
    const next = ai.update(1, obs());
    expect(next.state).toBe('windup');
    expect(next.attack).toBe('volley');
  });

  it('parede na 2ª investida atordoa como uma investida comum e encerra o ataque', () => {
    const ai = new BossAI(TUNING);
    endFirstCharge(ai);
    ai.update(REWINDUP, obs({ selfX: 360 }));
    ai.update(100, obs({ selfX: 360 }));
    const out = ai.update(10, obs({ selfX: 300, blocked: true }));
    expect(out.events.map((e) => e.type)).toEqual(['hitboxOff', 'wallStun', 'chargeTrail']);
    expect(out.state).toBe('rest');
  });
});

describe('BossAI: Investida Dupla, parede na 1ª (CYC-06)', () => {
  it('parede na 1ª atordoa e não começa a 2ª: descanso da fase e o ciclo segue para a rajada', () => {
    const ai = new BossAI(TUNING);
    ai.update(WINDUP_P2, obs());
    ai.update(100, obs());
    const out = ai.update(10, obs({ selfX: 35, blocked: true }));
    expect(out.events.map((e) => e.type)).toEqual(['hitboxOff', 'wallStun', 'chargeTrail']);
    expect(out.state).toBe('rest');
    expect(out.attack).toBeNull();
    expect(ai.update(REST_P2 - 1, obs({ selfX: 35 })).state).toBe('rest');
    const next = ai.update(1, obs({ selfX: 35 }));
    expect(next.attack).toBe('volley');
  });

  it('parede no mesmo frame do alcance máximo: a parede vence, sem 2ª investida', () => {
    const ai = new BossAI(TUNING);
    ai.update(WINDUP_P2, obs());
    const out = ai.update(CHARGE_MS, obs({ selfX: 360, blocked: true }));
    expect(out.events.map((e) => e.type)).toContain('wallStun');
    expect(out.state).toBe('rest');
  });
});

describe('BossAI: Investida Dupla interrompida (edge case)', () => {
  it('troca de fase (rugido, sem canAct) no preparo da 2ª: o ciclo novo começa do 1º ataque da fase 3', () => {
    const ai = new BossAI(TUNING);
    endFirstCharge(ai);
    const roar = ai.update(100, obs({ selfX: 360, phase: 3, canAct: false }));
    expect(roar.state).toBe('rest');
    expect(roar.events).toEqual([]);
    const back = ai.update(1, obs({ selfX: 360, phase: 3 }));
    expect(back.state).toBe('windup');
    expect(back.attack).toBe('volley');
  });

  it('sem canAct na 2ª investida: fecha a hitbox e cancela', () => {
    const ai = new BossAI(TUNING);
    endFirstCharge(ai);
    ai.update(REWINDUP, obs({ selfX: 360 }));
    const out = ai.update(50, obs({ selfX: 344, canAct: false }));
    expect(out.events).toEqual([{ type: 'hitboxOff' }]);
    expect(out.state).toBe('rest');
    expect(out.vx).toBe(0);
  });

  it('interrompida no preparo da 2ª na mesma fase: recomeça do zero, com a 1ª investida e o encadeado de novo', () => {
    const ai = new BossAI(TUNING);
    endFirstCharge(ai);
    ai.update(100, obs({ selfX: 360, canAct: false }));
    // canAct volta: o mesmo ataque recomeça do preparo de abertura (510 ms), não do preparo de 250 ms.
    expect(ai.update(REWINDUP, obs({ selfX: 360 })).state).toBe('windup');
    const first = ai.update(WINDUP_P2 - REWINDUP, obs({ selfX: 360, playerX: 1000 }));
    expect(first.state).toBe('charge');
    const end = ai.update(CHARGE_MS, obs({ selfX: 720 }));
    expect(end.state).toBe('windup'); // a 1ª perna encadeia de novo: o encadeado foi zerado
  });
});
