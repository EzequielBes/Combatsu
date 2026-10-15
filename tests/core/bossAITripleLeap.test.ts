import { describe, expect, it } from 'vitest';
import { BossAI, type BossAIObservation, type BossAITuning } from '../../src/core/bossAI';
import { BOSS } from '../../src/data/tuning';

/** Fase 2 abrindo com o Salto Triplo só aqui, para chegar nele sem percorrer o ciclo; a fase 3 é a do Oni (CYC-03). */
const TUNING: BossAITuning = {
  ...BOSS,
  cycles: {
    1: ['charge', 'leap'],
    2: ['tripleLeap', 'volley'],
    3: ['volley', 'charge', 'tripleLeap', 'doubleCharge'],
  },
};

const WINDUP_P2 = BOSS.leap.windupMs * BOSS.phases[1].windupMult; // 425 ms: abre como o salto
const LEAP_MS = BOSS.leap.durationMs; // 700 ms no ar
const GAP = BOSS.tripleLeap.gapMs; // 200 ms entre pouso e saída, sem windupMult
const RECOVERY = Math.max(BOSS.leap.recoveryMs, BOSS.phases[1].restMs); // 800 ms: a recuperação vence o descanso

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

/** Leva a IA até o 1º pouso: devolve a saída desse frame. */
function firstLanding(ai: BossAI) {
  ai.update(WINDUP_P2, obs());
  return ai.update(LEAP_MS, obs({ selfX: 1000 }));
}

/** Do 1º pouso até o 3º: devolve as saídas dos pousos 2 e 3. */
function remainingLandings(ai: BossAI) {
  ai.update(GAP, obs({ selfX: 1000, playerX: 400 }));
  const second = ai.update(LEAP_MS, obs({ selfX: 400 }));
  ai.update(GAP, obs({ selfX: 400, playerX: 800 }));
  const third = ai.update(LEAP_MS, obs({ selfX: 800 }));
  return { second, third };
}

describe('BossAI: Salto Triplo, três saltos encadeados (CYC-07)', () => {
  it('o preparo de abertura é o do salto com o windupMult da fase: 424 ms ainda prepara, 425 ms salta', () => {
    const ai = new BossAI(TUNING);
    expect(ai.update(WINDUP_P2 - 1, obs()).state).toBe('windup');
    const out = ai.update(1, obs());
    expect(out.state).toBe('leap');
    expect(out.attack).toBe('tripleLeap');
    expect(out.leap).toEqual({ fromX: 0, toX: 1000, progress: 0 });
  });

  it('1º pouso sem descanso: parado na espera; 199 ms ainda espera, 200 ms sai o 2º salto', () => {
    const ai = new BossAI(TUNING);
    const land = firstLanding(ai);
    expect(land.state).toBe('windup');
    expect(land.attack).toBe('tripleLeap');
    expect(land.leap).toEqual({ fromX: 0, toX: 1000, progress: 1 });

    const before = ai.update(GAP - 1, obs({ selfX: 1000 }));
    expect(before.state).toBe('windup');
    expect(before.leap).toBeNull();
    expect(before.events).toEqual([]);

    const second = ai.update(1, obs({ selfX: 1000 }));
    expect(second.state).toBe('leap');
    expect(second.attack).toBe('tripleLeap');
  });

  it('cada salto mira o X do player na saída dele, partindo de onde o anterior pousou', () => {
    const ai = new BossAI(TUNING);
    firstLanding(ai);
    ai.update(GAP - 1, obs({ selfX: 1000, playerX: 50 }));
    const second = ai.update(1, obs({ selfX: 1000, playerX: 400 }));
    expect(second.leap).toEqual({ fromX: 1000, toX: 400, progress: 0 });
    ai.update(LEAP_MS, obs({ selfX: 400, playerX: 9999 })); // o alvo ficou preso na saída
    const third = ai.update(GAP, obs({ selfX: 400, playerX: 800 }));
    expect(third.leap).toEqual({ fromX: 400, toX: 800, progress: 0 });
  });

  it('a sobra do frame do pouso corre na espera: um update só cobre preparo + salto + 200 ms', () => {
    const ai = new BossAI(TUNING);
    const out = ai.update(WINDUP_P2 + LEAP_MS + GAP, obs());
    expect(out.state).toBe('leap');
    expect(out.events).toEqual([{ type: 'landed', final: false }]);
  });
});

describe('BossAI: Salto Triplo, pousos e recuperação (CYC-08)', () => {
  it('três eventos landed, com final só no 3º', () => {
    const ai = new BossAI(TUNING);
    const first = firstLanding(ai);
    const { second, third } = remainingLandings(ai);
    expect(first.events).toEqual([{ type: 'landed', final: false }]);
    expect(second.events).toEqual([{ type: 'landed', final: false }]);
    expect(third.events).toEqual([{ type: 'landed', final: true }]);
  });

  it('descanso só depois do 3º pouso: recuperação de pouso e o ciclo segue para a rajada', () => {
    const ai = new BossAI(TUNING);
    firstLanding(ai);
    const { second, third } = remainingLandings(ai);
    expect(second.state).toBe('windup');
    expect(third.state).toBe('rest');
    expect(third.attack).toBeNull();
    expect(ai.update(RECOVERY - 1, obs({ selfX: 800 })).state).toBe('rest');
    const next = ai.update(1, obs({ selfX: 800 }));
    expect(next.state).toBe('windup');
    expect(next.attack).toBe('volley');
  });

  it('o salto simples pousa uma vez só, sempre final', () => {
    const ai = new BossAI(TUNING);
    const p1 = obs({ phase: 1 });
    ai.update(BOSS.charge.windupMs, p1);
    ai.update((BOSS.charge.maxDist / BOSS.charge.speed) * 1000 + BOSS.phases[0].restMs, p1);
    ai.update(BOSS.leap.windupMs, p1);
    const land = ai.update(LEAP_MS, p1);
    expect(land.events).toEqual([{ type: 'landed', final: true }]);
    expect(land.state).toBe('rest');
  });
});

describe('BossAI: Salto Triplo interrompido (edge case)', () => {
  it('troca de fase (rugido, sem canAct) na espera do 2º: o ciclo novo começa do 1º ataque da fase 3', () => {
    const ai = new BossAI(TUNING);
    firstLanding(ai);
    const roar = ai.update(100, obs({ selfX: 1000, phase: 3, canAct: false }));
    expect(roar.state).toBe('rest');
    expect(roar.leap).toBeNull();
    expect(roar.events).toEqual([]);
    const back = ai.update(1, obs({ selfX: 1000, phase: 3 }));
    expect(back.state).toBe('windup');
    expect(back.attack).toBe('volley');
  });

  it('interrompido no ar do 2º na mesma fase: recomeça do zero, com três saltos de novo', () => {
    const ai = new BossAI(TUNING);
    firstLanding(ai);
    ai.update(GAP + 100, obs({ selfX: 1000 }));
    ai.update(50, obs({ selfX: 1000, canAct: false }));
    // canAct volta: o mesmo ataque recomeça do preparo de abertura (425 ms), não da espera de 200 ms.
    expect(ai.update(GAP, obs({ selfX: 700 })).state).toBe('windup');
    ai.update(WINDUP_P2 - GAP, obs({ selfX: 700 }));
    const land = ai.update(LEAP_MS, obs({ selfX: 1000 }));
    expect(land.events).toEqual([{ type: 'landed', final: false }]); // o contador de saltos foi zerado
  });
});
