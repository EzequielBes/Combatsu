import { describe, expect, it } from 'vitest';
import { EnemyAI, type AIOutput } from '../../src/core/enemyAI';
import { ENEMY_AI, ENEMY_ATTACK } from '../../src/data/tuning';

/** Números do spec (Assumptions: "Distâncias da IA" e "Números de vida e IA"). */
const SPEC = {
  patrolRange: 48,
  patrolSpeed: 35,
  chaseRange: 200,
  chaseSpeed: 70,
  attackRange: 40,
  windupMs: 450,
  attackMs: 120,
  restMs: 800,
};
const SPAWN = 500;
const FRAME = 16;

/** Roda a IA por `ms` em passos de 1 frame, acumulando os eventos. */
function run(ai: EnemyAI, ms: number, s: { selfX: number; playerX: number; canAct?: boolean }): AIOutput {
  let last: AIOutput = { vx: 0, facing: 1, events: [] };
  const events: AIOutput['events'] = [];
  for (let t = 0; t < ms; t += FRAME) {
    last = ai.update(Math.min(FRAME, ms - t), { canAct: true, ...s });
    events.push(...last.events);
  }
  return { ...last, events };
}

/** IA colada no player (a 20 px), já em windup. */
function inWindup(): EnemyAI {
  const ai = new EnemyAI(ENEMY_AI, SPAWN);
  const out = ai.update(FRAME, { selfX: SPAWN, playerX: SPAWN + 20, canAct: true });
  expect(out.events).toEqual(['windupStart']);
  return ai;
}

describe('tuning real da IA do inimigo (números do spec)', () => {
  it('ENEMY_AI tem as distâncias, velocidades e tempos do spec', () => {
    expect(ENEMY_AI).toEqual(SPEC);
  });

  it('ENEMY_ATTACK: 12 de dano, hitbox ativa por 120 ms', () => {
    expect(ENEMY_ATTACK.damage).toBe(12);
    expect(ENEMY_ATTACK.activeMs).toBe(120);
  });
});

describe('EnemyAI: patrulha (AI-01)', () => {
  it('com o player a 200 px ou mais, patrulha a 35 px/s', () => {
    const ai = new EnemyAI(ENEMY_AI, SPAWN);
    const out = ai.update(FRAME, { selfX: SPAWN, playerX: SPAWN + 200, canAct: true });
    expect(ai.state).toBe('patrol');
    expect(Math.abs(out.vx)).toBe(35);
    expect(out.facing).toBe(Math.sign(out.vx));
  });

  it('vira na borda de spawn ± 48 px e volta', () => {
    const ai = new EnemyAI(ENEMY_AI, SPAWN);
    const far = SPAWN + 1000;
    expect(ai.update(FRAME, { selfX: SPAWN + 48, playerX: far, canAct: true }).vx).toBe(-35);
    expect(ai.update(FRAME, { selfX: SPAWN, playerX: far, canAct: true }).vx).toBe(-35);
    expect(ai.update(FRAME, { selfX: SPAWN - 48, playerX: far, canAct: true }).vx).toBe(35);
    expect(ai.update(FRAME, { selfX: SPAWN, playerX: far, canAct: true }).vx).toBe(35);
  });

  it('simulado, nunca sai de spawn ± 48 px (com folga de 1 frame)', () => {
    const ai = new EnemyAI(ENEMY_AI, SPAWN);
    let x = SPAWN;
    let min = x;
    let max = x;
    for (let i = 0; i < 1000; i++) {
      x += (ai.update(FRAME, { selfX: x, playerX: SPAWN - 900, canAct: true }).vx * FRAME) / 1000;
      min = Math.min(min, x);
      max = Math.max(max, x);
    }
    const step = (35 * FRAME) / 1000;
    expect(max).toBeLessThanOrEqual(SPAWN + 48 + step);
    expect(min).toBeGreaterThanOrEqual(SPAWN - 48 - step);
    // E vai de fato até as duas bordas.
    expect(max).toBeGreaterThanOrEqual(SPAWN + 48);
    expect(min).toBeLessThanOrEqual(SPAWN - 48);
  });

  it('longe do spawn (depois de perseguir), volta para a faixa de patrulha', () => {
    const ai = new EnemyAI(ENEMY_AI, SPAWN);
    expect(ai.update(FRAME, { selfX: SPAWN + 150, playerX: SPAWN + 400, canAct: true }).vx).toBe(-35);
    expect(ai.update(FRAME, { selfX: SPAWN - 150, playerX: SPAWN - 400, canAct: true }).vx).toBe(35);
  });
});

describe('EnemyAI: perseguição (AI-02)', () => {
  it('com o player a menos de 200 px na horizontal, anda até ele a 70 px/s', () => {
    const ai = new EnemyAI(ENEMY_AI, SPAWN);
    let out = ai.update(FRAME, { selfX: SPAWN, playerX: SPAWN + 199, canAct: true });
    expect(ai.state).toBe('chase');
    expect(out.vx).toBe(70);
    expect(out.facing).toBe(1);
    out = ai.update(FRAME, { selfX: SPAWN, playerX: SPAWN - 150, canAct: true });
    expect(out.vx).toBe(-70);
    expect(out.facing).toBe(-1);
  });

  it('a distância é só horizontal: player 150 px acima e 100 px ao lado ainda é perseguido', () => {
    // A IA nem recebe y: 100 px em x decidem sozinhos.
    const ai = new EnemyAI(ENEMY_AI, SPAWN);
    expect(ai.update(FRAME, { selfX: SPAWN, playerX: SPAWN + 100, canAct: true }).vx).toBe(70);
  });

  it('o player sai para 200 px ou mais: volta a patrulhar', () => {
    const ai = new EnemyAI(ENEMY_AI, SPAWN);
    ai.update(FRAME, { selfX: SPAWN, playerX: SPAWN + 150, canAct: true });
    expect(ai.state).toBe('chase');
    const out = ai.update(FRAME, { selfX: SPAWN, playerX: SPAWN + 200, canAct: true });
    expect(ai.state).toBe('patrol');
    expect(Math.abs(out.vx)).toBe(35);
  });
});

describe('EnemyAI: preparo, golpe e descanso (AI-03)', () => {
  it('a menos de 40 px entra em windup parado e virado para o player', () => {
    const ai = new EnemyAI(ENEMY_AI, SPAWN);
    ai.update(FRAME, { selfX: SPAWN, playerX: SPAWN - 100, canAct: true });
    const out = ai.update(FRAME, { selfX: SPAWN, playerX: SPAWN - 39, canAct: true });
    expect(ai.state).toBe('windup');
    expect(out.events).toEqual(['windupStart']);
    expect(out.vx).toBe(0);
    expect(out.facing).toBe(-1);
  });

  it('a exatamente 40 px ainda persegue', () => {
    const ai = new EnemyAI(ENEMY_AI, SPAWN);
    const out = ai.update(FRAME, { selfX: SPAWN, playerX: SPAWN + 40, canAct: true });
    expect(ai.state).toBe('chase');
    expect(out.vx).toBe(70);
  });

  it('windup dura 450 ms, parado; o golpe liga a hitbox por 120 ms; descansa 800 ms parado', () => {
    const ai = inWindup();
    const at = { selfX: SPAWN, playerX: SPAWN + 20, canAct: true };
    let out = ai.update(449, at);
    expect(ai.state).toBe('windup');
    expect(out.events).toEqual([]);
    expect(out.vx).toBe(0);
    out = ai.update(1, at);
    expect(ai.state).toBe('attack');
    expect(out.events).toEqual(['hitboxOn']);
    expect(out.vx).toBe(0);
    out = ai.update(119, at);
    expect(out.events).toEqual([]);
    expect(ai.state).toBe('attack');
    out = ai.update(1, at);
    expect(out.events).toEqual(['hitboxOff']);
    expect(ai.state).toBe('rest');
    out = ai.update(799, { ...at, playerX: SPAWN + 150 });
    expect(ai.state).toBe('rest');
    expect(out.vx).toBe(0);
    expect(out.events).toEqual([]);
    ai.update(1, { ...at, playerX: SPAWN + 150 });
    // Depois do descanso, volta a perseguir (player a 150 px).
    out = ai.update(FRAME, { ...at, playerX: SPAWN + 150 });
    expect(ai.state).toBe('chase');
    expect(out.vx).toBe(70);
  });

  it('depois do descanso, com o player longe, volta a patrulhar', () => {
    const ai = inWindup();
    run(ai, 450 + 120 + 800, { selfX: SPAWN, playerX: SPAWN + 20 });
    const out = ai.update(FRAME, { selfX: SPAWN, playerX: SPAWN + 600, canAct: true });
    expect(ai.state).toBe('patrol');
    expect(Math.abs(out.vx)).toBe(35);
  });

  it('eventos de um ciclo inteiro, na ordem: windupStart, hitboxOn, hitboxOff', () => {
    const ai = new EnemyAI(ENEMY_AI, SPAWN);
    const out = run(ai, FRAME + 450 + 120, { selfX: SPAWN, playerX: SPAWN + 20 });
    expect(out.events).toEqual(['windupStart', 'hitboxOn', 'hitboxOff']);
  });

  it('o player muda de lado no preparo: o inimigo vira para ele', () => {
    const ai = inWindup();
    const out = ai.update(FRAME, { selfX: SPAWN, playerX: SPAWN - 10, canAct: true });
    expect(ai.state).toBe('windup');
    expect(out.facing).toBe(-1);
  });
});

describe('EnemyAI: interrupção (AI-04)', () => {
  it('canAct = false zera vx na patrulha e na perseguição', () => {
    const ai = new EnemyAI(ENEMY_AI, SPAWN);
    expect(ai.update(FRAME, { selfX: SPAWN, playerX: SPAWN + 900, canAct: false }).vx).toBe(0);
    expect(ai.update(FRAME, { selfX: SPAWN, playerX: SPAWN + 100, canAct: false }).vx).toBe(0);
  });

  it('canAct = false no preparo cancela o golpe: nunca emite hitboxOn', () => {
    const ai = inWindup();
    const out = run(ai, 2000, { selfX: SPAWN, playerX: SPAWN + 20, canAct: false });
    expect(out.vx).toBe(0);
    expect(out.events).not.toContain('hitboxOn');
    expect(ai.state).not.toBe('windup');
    expect(ai.state).not.toBe('attack');
  });

  it('canAct = false no golpe fecha a hitbox (hitboxOff) e não abre de novo', () => {
    const ai = inWindup();
    const at = { selfX: SPAWN, playerX: SPAWN + 20, canAct: true };
    expect(ai.update(450, at).events).toEqual(['hitboxOn']);
    const first = ai.update(FRAME, { ...at, canAct: false });
    expect(first.events).toEqual(['hitboxOff']);
    expect(first.vx).toBe(0);
    const rest = run(ai, 2000, { ...at, canAct: false });
    expect(rest.events).toEqual([]);
  });

  it('interrupt() no preparo: sem eventos, e o ciclo recomeça do zero ao voltar a agir', () => {
    const ai = inWindup();
    const at = { selfX: SPAWN, playerX: SPAWN + 20, canAct: true };
    ai.update(400, at);
    expect(ai.interrupt()).toEqual([]);
    expect(ai.state).not.toBe('windup');
    // Recomeça: novo windupStart e mais 450 ms inteiros até o golpe.
    const again = ai.update(FRAME, at);
    expect(again.events).toEqual(['windupStart']);
    expect(ai.update(449, at).events).toEqual([]);
    expect(ai.update(1, at).events).toEqual(['hitboxOn']);
  });

  it('interrupt() no golpe devolve hitboxOff', () => {
    const ai = inWindup();
    ai.update(450, { selfX: SPAWN, playerX: SPAWN + 20, canAct: true });
    expect(ai.state).toBe('attack');
    expect(ai.interrupt()).toEqual(['hitboxOff']);
    expect(ai.state).not.toBe('attack');
  });

  it('interrupt() fora do preparo/golpe não emite nada', () => {
    const ai = new EnemyAI(ENEMY_AI, SPAWN);
    ai.update(FRAME, { selfX: SPAWN, playerX: SPAWN + 100, canAct: true });
    expect(ai.interrupt()).toEqual([]);
  });

  it('borda: morrer no preparo nunca abre a hitbox', () => {
    const ai = inWindup();
    const at = { selfX: SPAWN, playerX: SPAWN + 20 };
    ai.update(300, { ...at, canAct: true });
    // Morto: canAct fica false para sempre.
    const out = run(ai, 5000, { ...at, canAct: false });
    expect(out.events).toEqual([]);
  });
});
