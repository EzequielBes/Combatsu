import { describe, expect, it } from 'vitest';
import { EnemyAI, type AIEvent, type AIInput, type AIOutput, type EnemyAIState, type EnemyAITuning } from '../../src/core/enemyAI';
import { ENEMY_AI, ENEMY_ATTACK } from '../../src/data/tuning';

/** Números do spec (SPN-12, LIM-03, LIM-07, AI-03). */
const SPEC: EnemyAITuning = {
  chaseSpeed: 70,
  attackRange: 40,
  windupMs: 450,
  attackMs: 120,
  restMs: 800,
  holdRange: 96,
  holdBase: 64,
  holdStep: 24,
  holdTolerance: 2,
  farRange: 320,
  farSpeedMult: 1.6,
  commitMs: 200,
  stringGapMs: 300,
  hits: 1,
};
/** Tuning diferente do padrão em todos os campos: pega constante fixa no código (fecha o item do backlog). */
const ALT: EnemyAITuning = {
  chaseSpeed: 50,
  attackRange: 25,
  windupMs: 200,
  attackMs: 60,
  restMs: 300,
  holdRange: 150,
  holdBase: 100,
  holdStep: 10,
  holdTolerance: 4,
  farRange: 500,
  farSpeedMult: 2,
  commitMs: 80,
  stringGapMs: 150,
  hits: 1,
};
const SELF = 500;
const FRAME = 16;

/** Entrada com o player `dist` px à direita (ou à esquerda, com `dist` negativo) e, por padrão, sem permissão. */
function at(dist: number, over: Partial<AIInput> = {}): AIInput {
  return { selfX: SELF, playerX: SELF + dist, canAct: true, granted: false, windupAllowed: true, holdRank: 0, ...over };
}

/** Roda a IA por `ms` em passos de 1 frame, acumulando os eventos. */
function run(ai: EnemyAI, ms: number, s: AIInput): AIOutput {
  let last: AIOutput = { vx: 0, facing: 1, events: [] };
  const events: AIOutput['events'] = [];
  for (let t = 0; t < ms; t += FRAME) {
    last = ai.update(Math.min(FRAME, ms - t), s);
    events.push(...last.events);
  }
  return { ...last, events };
}

/** IA com permissão e colada no player (a 20 px), já em windup. */
function inWindup(t: EnemyAITuning = SPEC): EnemyAI {
  const ai = new EnemyAI(t);
  const out = ai.update(FRAME, at(20, { granted: true }));
  expect(out.events).toEqual(['windupStart']);
  return ai;
}

/** IA já em `hold` com o rank dado, num dist dado (entra a 96/holdRange e depois testa a faixa). */
function inHold(t: EnemyAITuning, rank: number): EnemyAI {
  const ai = new EnemyAI(t);
  ai.update(FRAME, at(t.holdRange, { holdRank: rank }));
  expect(ai.state).toBe('hold');
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

describe('EnemyAI: nunca patrulha (SPN-10)', () => {
  it('começa em chase e, por qualquer distância e permissão, nunca entra em patrol', () => {
    const ai = new EnemyAI(SPEC);
    expect(ai.state).toBe('chase');
    const seen = new Set<string>();
    for (const dist of [-1000, -400, -321, -100, -96, -50, -20, 0, 20, 39, 40, 41, 96, 97, 150, 321, 900]) {
      for (const granted of [false, true]) {
        for (const windupAllowed of [false, true]) {
          const a = new EnemyAI(SPEC);
          for (let i = 0; i < 40; i++) {
            a.update(FRAME, at(dist, { granted, windupAllowed }));
            seen.add(a.state);
          }
          seen.add(ai.state);
        }
      }
    }
    expect(seen.has('patrol')).toBe(false);
    expect([...seen].every((s) => ['chase', 'hold', 'approach', 'windup', 'attack', 'rest'].includes(s))).toBe(true);
  });

  it('o player longe (900 px) não faz o inimigo ficar parado: ele corre atrás', () => {
    const ai = new EnemyAI(SPEC);
    const out = ai.update(FRAME, at(900));
    expect(ai.state).toBe('chase');
    expect(out.vx).toBeGreaterThan(0);
  });

  it('depois do descanso volta a perseguir, mesmo com o player longe', () => {
    const ai = inWindup();
    run(ai, 450 + 120 + 800, at(20, { granted: true }));
    const out = ai.update(FRAME, at(600));
    expect(ai.state).toBe('chase');
    expect(out.vx).toBeCloseTo(112); // acima de 320 px corre a x1,6
  });
});

describe('EnemyAI: perseguição (SPN-11)', () => {
  it('o sinal do vx segue o sinal de playerX - selfX, e facing acompanha', () => {
    const right = new EnemyAI(SPEC).update(FRAME, at(200));
    expect(right.vx).toBe(70);
    expect(right.facing).toBe(1);
    const left = new EnemyAI(SPEC).update(FRAME, at(-200));
    expect(left.vx).toBe(-70);
    expect(left.facing).toBe(-1);
  });

  it('a distância é só horizontal: a IA nem recebe y', () => {
    expect(new EnemyAI(SPEC).update(FRAME, at(150)).vx).toBe(70);
  });
});

describe('EnemyAI: corrida acima de 320 px (SPN-12)', () => {
  it('a 320 px: velocidade x1; a 321 px: x1,6', () => {
    const near = new EnemyAI(SPEC).update(FRAME, at(320));
    expect(near.vx).toBeCloseTo(70);
    const far = new EnemyAI(SPEC).update(FRAME, at(321));
    expect(far.vx).toBeCloseTo(112);
  });

  it('o mesmo vale para o lado esquerdo', () => {
    expect(new EnemyAI(SPEC).update(FRAME, at(-320)).vx).toBeCloseTo(-70);
    expect(new EnemyAI(SPEC).update(FRAME, at(-321)).vx).toBeCloseTo(-112);
  });

  it('usa farRange e farSpeedMult do tuning (500 e x2)', () => {
    expect(new EnemyAI(ALT).update(FRAME, at(500)).vx).toBeCloseTo(50);
    expect(new EnemyAI(ALT).update(FRAME, at(501)).vx).toBeCloseTo(100);
  });
});

describe('EnemyAI: espera em hold (LIM-03)', () => {
  it('sem permissão a 96 px entra em hold e pede para atacar; a 97 px continua em chase', () => {
    const inside = new EnemyAI(SPEC);
    const out = inside.update(FRAME, at(96));
    expect(inside.state).toBe('hold');
    expect(out.events).toEqual(['wantAttack']);
    const outside = new EnemyAI(SPEC);
    const out2 = outside.update(FRAME, at(97));
    expect(outside.state).toBe('chase');
    expect(out2.events).toEqual([]);
  });

  it('usa holdRange do tuning (150): 150 px é hold e 151 px é chase', () => {
    const a = new EnemyAI(ALT);
    a.update(FRAME, at(150));
    expect(a.state).toBe('hold');
    const b = new EnemyAI(ALT);
    b.update(FRAME, at(151));
    expect(b.state).toBe('chase');
  });

  it('colado no player (20 px) sem permissão também espera em hold, sem iniciar windup', () => {
    const ai = new EnemyAI(SPEC);
    const out = ai.update(FRAME, at(20));
    expect(ai.state).toBe('hold');
    expect(out.events).toEqual(['wantAttack']);
    expect(out.events).not.toContain('windupStart');
  });

  it('o pedido wantAttack sai a cada frame em hold e só em hold', () => {
    const ai = new EnemyAI(SPEC);
    expect(ai.update(FRAME, at(90)).events).toEqual(['wantAttack']);
    expect(ai.update(FRAME, at(90)).events).toEqual(['wantAttack']);
    expect(new EnemyAI(SPEC).update(FRAME, at(300)).events).toEqual([]);
    expect(new EnemyAI(SPEC).update(FRAME, at(90, { granted: true })).events).toEqual([]);
  });
});

describe('EnemyAI: distância de espera 64 + 24k ± 2 (LIM-07)', () => {
  it('k = 0: alvo 64; parado em 62 e 66 px, anda para dentro em 67 px e para fora em 61 px', () => {
    const p = (dist: number): number => inHold(SPEC, 0).update(FRAME, at(dist)).vx;
    expect(p(66)).toBe(0);
    expect(p(62)).toBe(0);
    expect(p(64)).toBe(0);
    expect(p(67)).toBe(70); // longe demais: aproxima
    expect(p(61)).toBe(-70); // perto demais: afasta
  });

  it('k = 0 com o player à esquerda: os sentidos se invertem', () => {
    const ai = inHold(SPEC, 0);
    expect(ai.update(FRAME, at(-67)).vx).toBe(-70); // aproxima (player à esquerda)
    expect(ai.update(FRAME, at(-61)).vx).toBe(70); // afasta
  });

  it('k = 2: alvo 112; parado em 110 e 114 px, anda em 109 e 115 px (e continua em hold até 114)', () => {
    const p = (dist: number): AIOutput => inHold(SPEC, 2).update(FRAME, at(dist, { holdRank: 2 }));
    expect(p(110).vx).toBe(0);
    expect(p(114).vx).toBe(0);
    expect(p(112).vx).toBe(0);
    expect(p(109).vx).toBe(-70);
    expect(p(115).vx).toBe(70);
    const ai = inHold(SPEC, 2);
    ai.update(FRAME, at(114, { holdRank: 2 }));
    expect(ai.state).toBe('hold');
    ai.update(FRAME, at(115, { holdRank: 2 }));
    expect(ai.state).toBe('chase'); // 115 > alvo + folga: sai de hold e persegue
  });

  it('k = 2 saindo de chase a 96 px entra em hold e se afasta até o alvo', () => {
    const ai = new EnemyAI(SPEC);
    const out = ai.update(FRAME, at(96, { holdRank: 2 }));
    expect(ai.state).toBe('hold');
    expect(out.vx).toBe(-70); // 96 < 112 - 2
  });

  it('usa holdBase, holdStep e holdTolerance do tuning (100 + 10k ± 4; k = 1 => 110)', () => {
    const p = (dist: number): number => inHold(ALT, 1).update(FRAME, at(dist, { holdRank: 1 })).vx;
    expect(p(106)).toBe(0);
    expect(p(114)).toBe(0);
    expect(p(105)).toBe(-50);
    expect(p(115)).toBe(50);
  });

  it('holdDistance(k) = holdBase + holdStep * k', () => {
    expect(new EnemyAI(SPEC).holdDistance(0)).toBe(64);
    expect(new EnemyAI(SPEC).holdDistance(2)).toBe(112);
    expect(new EnemyAI(ALT).holdDistance(3)).toBe(130);
  });

  it('em hold o inimigo olha sempre para o player', () => {
    const ai = inHold(SPEC, 0);
    expect(ai.update(FRAME, at(-70)).facing).toBe(-1);
    expect(ai.update(FRAME, at(70)).facing).toBe(1);
  });
});

describe('EnemyAI: permissão, aproximação e golpe (LIM-08)', () => {
  it('com permissão e fora do alcance, avança em approach a chaseSpeed', () => {
    const ai = inHold(SPEC, 0);
    const out = ai.update(FRAME, at(70, { granted: true }));
    expect(ai.state).toBe('approach');
    expect(out.vx).toBe(70);
    expect(out.events).toEqual([]);
  });

  it('approach vai até attackRange: 41 px ainda avança, 40 px inicia windup parado', () => {
    const near = new EnemyAI(SPEC);
    const o41 = near.update(FRAME, at(41, { granted: true }));
    expect(near.state).toBe('approach');
    expect(o41.vx).toBe(70);
    const o40 = near.update(FRAME, at(40, { granted: true }));
    expect(near.state).toBe('windup');
    expect(o40.events).toEqual(['windupStart']);
    expect(o40.vx).toBe(0);
  });

  it('usa attackRange do tuning (25): 26 px approach, 25 px windup', () => {
    const ai = new EnemyAI(ALT);
    ai.update(FRAME, at(26, { granted: true }));
    expect(ai.state).toBe('approach');
    ai.update(FRAME, at(25, { granted: true }));
    expect(ai.state).toBe('windup');
  });

  it('granted sem windupAllowed no alcance não entra em windup: espera parado em approach', () => {
    const ai = new EnemyAI(SPEC);
    const out = ai.update(FRAME, at(20, { granted: true, windupAllowed: false }));
    expect(ai.state).toBe('approach');
    expect(out.events).toEqual([]);
    expect(out.vx).toBe(0);
    const out2 = ai.update(FRAME, at(20, { granted: true, windupAllowed: true }));
    expect(ai.state).toBe('windup');
    expect(out2.events).toEqual(['windupStart']);
  });

  it('windupAllowed falso não impede o approach fora do alcance', () => {
    const ai = new EnemyAI(SPEC);
    expect(ai.update(FRAME, at(80, { granted: true, windupAllowed: false })).vx).toBe(70);
  });

  it('perder a permissão em approach volta a esperar (hold) ou perseguir', () => {
    const ai = new EnemyAI(SPEC);
    ai.update(FRAME, at(80, { granted: true }));
    ai.update(FRAME, at(80, { granted: false }));
    expect(ai.state).toBe('hold');
    ai.update(FRAME, at(200, { granted: false }));
    expect(ai.state).toBe('chase');
  });
});

describe('EnemyAI: preparo, golpe e descanso (AI-03)', () => {
  it('o windup vira para o player', () => {
    const ai = new EnemyAI(SPEC);
    const out = ai.update(FRAME, at(-39, { granted: true }));
    expect(ai.state).toBe('windup');
    expect(out.facing).toBe(-1);
    expect(out.vx).toBe(0);
  });

  it('windup dura 450 ms, parado; o golpe liga a hitbox por 120 ms; descansa 800 ms parado', () => {
    const ai = inWindup();
    const s = at(20, { granted: true });
    let out = ai.update(449, s);
    expect(ai.state).toBe('windup');
    expect(out.events).toEqual(['commit']); // 1 ms pela frente: já passou o ponto de compromisso (CMT-01)
    expect(out.vx).toBe(0);
    out = ai.update(1, s);
    expect(ai.state).toBe('attack');
    expect(out.events).toEqual(['hitboxOn']);
    expect(out.vx).toBe(0);
    out = ai.update(119, s);
    expect(out.events).toEqual([]);
    expect(ai.state).toBe('attack');
    out = ai.update(1, s);
    expect(out.events).toEqual(['hitboxOff']);
    expect(ai.state).toBe('rest');
    out = ai.update(799, at(150));
    expect(ai.state).toBe('rest');
    expect(out.vx).toBe(0);
    expect(out.events).toEqual([]);
    ai.update(1, at(150));
    // Depois do descanso, volta a perseguir (player a 150 px, sem permissão).
    out = ai.update(FRAME, at(150));
    expect(ai.state).toBe('chase');
    expect(out.vx).toBe(70);
  });

  it('usa windupMs, attackMs e restMs do tuning (200, 60 e 300)', () => {
    const ai = inWindup(ALT);
    const s = at(20, { granted: true });
    expect(ai.update(199, s).events).toEqual(['commit']); // 1 ms pela frente: já passou o compromisso (CMT-01)
    expect(ai.update(1, s).events).toEqual(['hitboxOn']);
    expect(ai.update(59, s).events).toEqual([]);
    expect(ai.update(1, s).events).toEqual(['hitboxOff']);
    ai.update(299, at(400));
    expect(ai.state).toBe('rest');
    ai.update(1, at(400));
    ai.update(1, at(400));
    expect(ai.state).toBe('chase');
  });

  it('eventos de um ciclo inteiro, na ordem: windupStart, hitboxOn, hitboxOff', () => {
    const ai = new EnemyAI(SPEC);
    const out = run(ai, FRAME + 450 + 120, at(20, { granted: true }));
    expect(out.events).toEqual(['windupStart', 'commit', 'hitboxOn', 'hitboxOff']);
  });

  it('o player muda de lado no preparo: o inimigo vira para ele', () => {
    const ai = inWindup();
    const out = ai.update(FRAME, at(-10, { granted: true }));
    expect(ai.state).toBe('windup');
    expect(out.facing).toBe(-1);
  });

  it('o golpe e o descanso não viram o inimigo, mesmo se o player trocar de lado', () => {
    const ai = inWindup();
    ai.update(450, at(20, { granted: true })); // attack, facing 1
    expect(ai.update(FRAME, at(-50, { granted: true })).facing).toBe(1);
    run(ai, 120, at(-50, { granted: true })); // vai ao rest
    expect(ai.state).toBe('rest');
    expect(ai.update(FRAME, at(-50)).facing).toBe(1);
  });
});

describe('EnemyAI: interrupção (AI-04, LIM-06)', () => {
  it('canAct = false zera vx no chase e no hold', () => {
    const ai = new EnemyAI(SPEC);
    expect(ai.update(FRAME, at(900, { canAct: false })).vx).toBe(0);
    expect(ai.update(FRAME, at(73, { canAct: false })).vx).toBe(0);
  });

  it('canAct = false no preparo cancela o golpe: nunca emite hitboxOn e volta a chase', () => {
    const ai = inWindup();
    const out = run(ai, 2000, at(20, { canAct: false, granted: true }));
    expect(out.vx).toBe(0);
    expect(out.events).not.toContain('hitboxOn');
    expect(ai.state).toBe('chase');
  });

  it('canAct = false na aproximação a cancela: volta a chase', () => {
    const ai = new EnemyAI(SPEC);
    ai.update(FRAME, at(80, { granted: true }));
    expect(ai.state).toBe('approach');
    ai.update(FRAME, at(80, { granted: true, canAct: false }));
    expect(ai.state).toBe('chase');
  });

  it('canAct = false no golpe fecha a hitbox (hitboxOff) e não abre de novo', () => {
    const ai = inWindup();
    const s = at(20, { granted: true });
    expect(ai.update(450, s).events).toEqual(['commit', 'hitboxOn']);
    const first = ai.update(FRAME, { ...s, canAct: false });
    expect(first.events).toEqual(['hitboxOff']);
    expect(first.vx).toBe(0);
    const rest = run(ai, 2000, { ...s, canAct: false });
    expect(rest.events).toEqual([]);
  });

  it('canAct = false no descanso: o relógio do descanso continua correndo', () => {
    const ai = inWindup();
    run(ai, 450 + 120, at(20, { granted: true }));
    expect(ai.state).toBe('rest');
    ai.update(800, at(20, { canAct: false }));
    expect(ai.state).toBe('rest');
    ai.update(FRAME, at(150));
    expect(ai.state).toBe('chase');
  });

  it('interrupt() no preparo volta para chase sem eventos, e o ciclo recomeça do zero', () => {
    const ai = inWindup();
    const s = at(20, { granted: true });
    ai.update(400, s);
    expect(ai.interrupt()).toEqual([]);
    expect(ai.state).toBe('chase');
    const again = ai.update(FRAME, s);
    expect(again.events).toEqual(['windupStart']);
    expect(ai.update(449, s).events).toEqual(['commit']);
    expect(ai.update(1, s).events).toEqual(['hitboxOn']);
  });

  it('interrupt() no golpe devolve hitboxOff e volta para chase', () => {
    const ai = inWindup();
    ai.update(450, at(20, { granted: true }));
    expect(ai.state).toBe('attack');
    expect(ai.interrupt()).toEqual(['hitboxOff']);
    expect(ai.state).toBe('chase');
  });

  it('interrupt() na aproximação volta para chase', () => {
    const ai = new EnemyAI(SPEC);
    ai.update(FRAME, at(80, { granted: true }));
    expect(ai.interrupt()).toEqual([]);
    expect(ai.state).toBe('chase');
  });

  it('interrupt() em chase, hold ou rest não emite nada nem muda o estado', () => {
    const ai = new EnemyAI(SPEC);
    ai.update(FRAME, at(150));
    expect(ai.interrupt()).toEqual([]);
    expect(ai.state).toBe('chase');
    ai.update(FRAME, at(80));
    expect(ai.interrupt()).toEqual([]);
    expect(ai.state).toBe('hold');
    const r = inWindup();
    run(r, 450 + 120, at(20, { granted: true }));
    expect(r.interrupt()).toEqual([]);
    expect(r.state).toBe('rest');
  });

  it('borda: morrer no preparo nunca abre a hitbox', () => {
    const ai = inWindup();
    ai.update(300, at(20, { granted: true }));
    const out = run(ai, 5000, at(20, { canAct: false, granted: true }));
    expect(out.events).toEqual([]);
  });
});

describe('LIM-05 com o tuning real: vizinhos parados em hold ficam a pelo menos 20 px', () => {
  /** Anda o inimigo (x integrado pela vx da IA) até parar em `hold` com o rank dado; devolve a distância final. */
  function settle(rank: number, startDist: number): number {
    const ai = new EnemyAI(ENEMY_AI);
    const playerX = 0;
    let x = startDist;
    let still = 0;
    for (let i = 0; i < 2000 && still < 10; i++) {
      const out = ai.update(1000 / 60, { selfX: x, playerX, canAct: true, granted: false, windupAllowed: false, holdRank: rank });
      x += (out.vx * 1000) / 60 / 1000;
      still = out.vx === 0 ? still + 1 : 0;
    }
    expect(ai.state).toBe('hold');
    return Math.abs(x - playerX);
  }

  it('o tuning do jogo usa tolerância de ±2 px em volta de 64 + 24k (LIM-07)', () => {
    expect(ENEMY_AI.holdTolerance).toBe(2);
    expect(ENEMY_AI.holdBase).toBe(64);
    expect(ENEMY_AI.holdStep).toBe(24);
  });

  it('vindo de perto ou de longe, ranks vizinhos param a >= 20 px um do outro', () => {
    for (const k of [0, 1, 2]) {
      const pairs = [
        [settle(k, 30), settle(k + 1, 96)],
        [settle(k, 96), settle(k + 1, 40)],
      ];
      for (const [a, b] of pairs) {
        expect(Math.abs(a - (64 + 24 * k))).toBeLessThanOrEqual(2);
        expect(Math.abs(b - (64 + 24 * (k + 1)))).toBeLessThanOrEqual(2);
        expect(Math.abs(b - a)).toBeGreaterThanOrEqual(20);
      }
    }
  });
});

/** Roda a IA em passos de `dt` e devolve cada evento com o tempo acumulado ao fim do passo em que saiu. */
function timeline(ai: EnemyAI, s: AIInput, dt: number, totalMs: number): { ev: AIEvent; t: number; state: EnemyAIState }[] {
  const seen: { ev: AIEvent; t: number; state: EnemyAIState }[] = [];
  for (let t = dt; t <= totalMs; t += dt) {
    for (const ev of ai.update(dt, s).events) seen.push({ ev, t, state: ai.state });
  }
  return seen;
}

/** Primeiro fim de passo em que o instante exato `ms` já passou: a sobra do frame faz o tempo ser exato. */
const frameOf = (ms: number, dt: number): number => Math.ceil(ms / dt) * dt;

/** Tempos dos eventos de `kind`, na ordem em que saíram. */
const timesOf = (seen: { ev: AIEvent; t: number }[], kind: AIEvent): number[] => seen.filter((e) => e.ev === kind).map((e) => e.t);

describe('EnemyAI: ponto de compromisso (CMT-01)', () => {
  it('fora do ciclo (chase, hold, approach) não está comprometido', () => {
    const ai = new EnemyAI(SPEC);
    ai.update(FRAME, at(300));
    expect(ai.state).toBe('chase');
    expect(ai.committed).toBe(false);
    ai.update(FRAME, at(80));
    expect(ai.state).toBe('hold');
    expect(ai.committed).toBe(false);
    ai.update(FRAME, at(80, { granted: true }));
    expect(ai.state).toBe('approach');
    expect(ai.committed).toBe(false);
  });

  it('com 201 ms de preparo pela frente não está comprometido; com 200 ms está, e o commit sai nesse passo', () => {
    const ai = inWindup();
    const s = at(20, { granted: true });
    expect(ai.committed).toBe(false); // 450 ms pela frente
    const before = ai.update(249, s); // 201 ms pela frente
    expect(before.events).toEqual([]);
    expect(ai.committed).toBe(false);
    const at200 = ai.update(1, s); // 200 ms pela frente
    expect(at200.events).toEqual(['commit']);
    expect(ai.committed).toBe(true);
    expect(ai.state).toBe('windup');
  });

  it('usa commitMs do tuning (80, preparo de 200): 81 ms pela frente não, 80 ms sim', () => {
    const ai = inWindup(ALT);
    const s = at(20, { granted: true });
    expect(ai.update(119, s).events).toEqual([]); // 81 ms pela frente
    expect(ai.committed).toBe(false);
    expect(ai.update(1, s).events).toEqual(['commit']); // 80 ms pela frente
    expect(ai.committed).toBe(true);
  });

  it('continua comprometido em attack e volta a false em rest', () => {
    const ai = inWindup();
    const s = at(20, { granted: true });
    ai.update(450, s);
    expect(ai.state).toBe('attack');
    expect(ai.committed).toBe(true);
    ai.update(120, s);
    expect(ai.state).toBe('rest');
    expect(ai.committed).toBe(false);
  });

  it('interrupt() no preparo comprometido volta a false, e o ataque seguinte emite commit de novo', () => {
    const ai = inWindup();
    const s = at(20, { granted: true });
    ai.update(300, s);
    expect(ai.committed).toBe(true);
    ai.interrupt();
    expect(ai.state).toBe('chase');
    expect(ai.committed).toBe(false);
    expect(ai.update(FRAME, s).events).toEqual(['windupStart']);
    expect(ai.committed).toBe(false);
    expect(ai.update(250, s).events).toEqual(['commit']);
  });

  it('interrupt() no golpe volta a false', () => {
    const ai = inWindup();
    ai.update(450, at(20, { granted: true }));
    expect(ai.committed).toBe(true);
    ai.interrupt();
    expect(ai.committed).toBe(false);
  });

  it('canAct = false no preparo comprometido: committed volta a false', () => {
    const ai = inWindup();
    const s = at(20, { granted: true });
    ai.update(300, s);
    expect(ai.committed).toBe(true);
    ai.update(FRAME, { ...s, canAct: false });
    expect(ai.committed).toBe(false);
  });

  it('um passo grande que cruza o compromisso e o fim do preparo emite commit uma vez, antes da hitboxOn', () => {
    const ai = inWindup();
    expect(ai.update(450, at(20, { granted: true })).events).toEqual(['commit', 'hitboxOn']);
  });

  it('com commitMs maior que o preparo o commit sai junto com o windupStart, uma vez só', () => {
    const quick: EnemyAITuning = { ...SPEC, windupMs: 100, commitMs: 150 };
    const ai = new EnemyAI(quick);
    const first = ai.update(FRAME, at(20, { granted: true }));
    expect(first.events).toEqual(['windupStart', 'commit']);
    expect(ai.committed).toBe(true);
    expect(timesOf(timeline(ai, at(20, { granted: true }), FRAME, 300), 'commit')).toEqual([]);
  });

  it('commit sai exatamente uma vez por ataque e windupStart só no primeiro preparo, com hits 3', () => {
    const ai = new EnemyAI({ ...SPEC, hits: 3 });
    const first = ai.update(FRAME, at(20, { granted: true }));
    expect(first.events).toEqual(['windupStart']);
    const seen = timeline(ai, at(20, { granted: true }), FRAME, 1600);
    const count = (k: AIEvent): number => seen.filter((e) => e.ev === k).length;
    expect(count('windupStart')).toBe(0);
    expect(count('commit')).toBe(1);
    expect(count('hitboxOn')).toBe(3);
    expect(count('hitboxOff')).toBe(3);
  });
});

describe('EnemyAI: sequência de golpes (DFL-02, DFL-03, DFL-04, DFL-06, DFL-15)', () => {
  const TWO: EnemyAITuning = { ...SPEC, hits: 2 };

  it('hits devolve o tamanho da sequência do tuning', () => {
    expect(new EnemyAI(SPEC).hits).toBe(1);
    expect(new EnemyAI(TWO).hits).toBe(2);
  });

  it.each([16, 7, 33])('hits 2 com dt de %i ms: a 2ª hitboxOn sai 300 ms depois da 1ª hitboxOff, sem perder a sobra do frame', (dt) => {
    const ai = new EnemyAI(TWO);
    ai.update(FRAME, at(20, { granted: true }));
    const seen = timeline(ai, at(20, { granted: true }), dt, 1000);
    // Tempos exatos desde o fim do frame do windupStart: 450 preparo, 120 golpe, 300 intervalo, 120 golpe.
    expect(timesOf(seen, 'commit')).toEqual([frameOf(250, dt)]);
    expect(timesOf(seen, 'hitboxOn')).toEqual([frameOf(450, dt), frameOf(870, dt)]);
    expect(timesOf(seen, 'hitboxOff')).toEqual([frameOf(570, dt), frameOf(990, dt)]);
  });

  it('o estado entre os dois golpes é windup e rest só vem depois do último', () => {
    const ai = new EnemyAI(TWO);
    const s = at(20, { granted: true });
    ai.update(FRAME, s);
    const states: EnemyAIState[] = [];
    const offStates: EnemyAIState[] = [];
    for (let t = 0; t < 1000; t += FRAME) {
      const out = ai.update(FRAME, s);
      states.push(ai.state);
      if (out.events.includes('hitboxOff')) offStates.push(ai.state);
    }
    expect(offStates).toEqual(['windup', 'rest']); // fim do 1º golpe volta ao preparo; o do último descansa
    const firstAttack = states.indexOf('attack');
    const secondAttack = states.indexOf('attack', states.indexOf('windup', firstAttack));
    const gap = states.slice(states.indexOf('windup', firstAttack), secondAttack);
    expect(gap.length).toBeGreaterThan(0);
    expect(gap.every((st) => st === 'windup')).toBe(true); // entre os golpes só existe windup
    expect(states.indexOf('rest')).toBeGreaterThan(secondAttack); // rest só depois do 2º golpe começar
  });

  it('hitIndex vale 1 no primeiro golpe, 2 no segundo e 0 fora de golpe', () => {
    const ai = new EnemyAI(TWO);
    const s = at(20, { granted: true });
    expect(ai.hitIndex).toBe(0); // chase
    ai.update(FRAME, s);
    expect(ai.state).toBe('windup');
    expect(ai.hitIndex).toBe(1); // preparo do 1º
    ai.update(450, s);
    expect(ai.state).toBe('attack');
    expect(ai.hitIndex).toBe(1); // 1º golpe
    ai.update(120, s);
    expect(ai.state).toBe('windup');
    expect(ai.hitIndex).toBe(2); // preparo do 2º
    expect(ai.committed).toBe(true); // 300 ms pela frente e já comprometido (CMT-01)
    ai.update(300, s);
    expect(ai.state).toBe('attack');
    expect(ai.hitIndex).toBe(2); // 2º golpe
    ai.update(120, s);
    expect(ai.state).toBe('rest');
    expect(ai.hitIndex).toBe(0); // descanso
    ai.update(800, at(150));
    ai.update(FRAME, at(150));
    expect(ai.state).toBe('chase');
    expect(ai.hitIndex).toBe(0);
  });

  it('hitIndex é 0 em hold e approach', () => {
    const ai = new EnemyAI(TWO);
    ai.update(FRAME, at(80));
    expect(ai.state).toBe('hold');
    expect(ai.hitIndex).toBe(0);
    ai.update(FRAME, at(80, { granted: true }));
    expect(ai.state).toBe('approach');
    expect(ai.hitIndex).toBe(0);
  });

  it('com hits 3, windupStart sai só no primeiro preparo e o intervalo é windup nas duas vezes', () => {
    const ai = new EnemyAI({ ...SPEC, hits: 3 });
    const s = at(20, { granted: true });
    expect(ai.update(FRAME, s).events).toEqual(['windupStart']);
    ai.update(450, s);
    expect(ai.update(120, s).events).toEqual(['hitboxOff']);
    expect(ai.state).toBe('windup');
    expect(ai.hitIndex).toBe(2);
    expect(ai.update(300, s).events).toEqual(['hitboxOn']);
    expect(ai.update(120, s).events).toEqual(['hitboxOff']);
    expect(ai.state).toBe('windup');
    expect(ai.hitIndex).toBe(3);
    expect(ai.update(300, s).events).toEqual(['hitboxOn']);
    expect(ai.update(120, s).events).toEqual(['hitboxOff']);
    expect(ai.state).toBe('rest');
  });

  it('o intervalo respeita 299 e 300 ms (limiar dos dois lados)', () => {
    const ai = new EnemyAI(TWO);
    const s = at(20, { granted: true });
    ai.update(FRAME, s);
    ai.update(450, s);
    ai.update(120, s); // fim do 1º golpe, entra no intervalo
    expect(ai.update(299, s).events).toEqual([]);
    expect(ai.state).toBe('windup');
    expect(ai.update(1, s).events).toEqual(['hitboxOn']);
  });

  it('usa stringGapMs e hits do tuning (150 ms, 3 golpes; preparo 200, golpe 60, compromisso 80)', () => {
    const seq: EnemyAITuning = { ...ALT, hits: 3 };
    const ai = new EnemyAI(seq);
    ai.update(FRAME, at(20, { granted: true }));
    const seen = timeline(ai, at(20, { granted: true }), 7, 700);
    expect(timesOf(seen, 'commit')).toEqual([frameOf(120, 7)]);
    expect(timesOf(seen, 'hitboxOn')).toEqual([frameOf(200, 7), frameOf(410, 7), frameOf(620, 7)]);
    expect(timesOf(seen, 'hitboxOff')).toEqual([frameOf(260, 7), frameOf(470, 7), frameOf(680, 7)]);
  });

  it('com hits 1 o ciclo continua 450 + 120 + 800 ms: hitboxOn, hitboxOff e volta a chase', () => {
    const ai = new EnemyAI(SPEC);
    ai.update(FRAME, at(20, { granted: true }));
    const seen = timeline(ai, at(20, { granted: true }), 1, 570);
    expect(timesOf(seen, 'hitboxOn')).toEqual([450]);
    expect(timesOf(seen, 'hitboxOff')).toEqual([570]);
    expect(ai.state).toBe('rest');
    // O descanso dura 800 ms: 799 ms depois ainda é rest, 800 ms depois volta a chase.
    ai.update(799, at(150));
    expect(ai.state).toBe('rest');
    ai.update(1, at(150));
    expect(ai.state).toBe('chase');
  });

  it('com hits 1 o hitIndex fica em 1 no preparo e no golpe, e rest vem logo depois do golpe', () => {
    const ai = new EnemyAI(SPEC);
    const s = at(20, { granted: true });
    ai.update(FRAME, s);
    expect(ai.hitIndex).toBe(1);
    ai.update(450, s);
    expect(ai.hitIndex).toBe(1);
    expect(ai.update(120, s).events).toEqual(['hitboxOff']);
    expect(ai.state).toBe('rest');
  });
});

describe('EnemyAI: sequência interrompida (EDG-05)', () => {
  const TWO: EnemyAITuning = { ...SPEC, hits: 2 };

  /** IA com 2 golpes, já no intervalo entre o 1º e o 2º. */
  function inGap(): EnemyAI {
    const ai = new EnemyAI(TWO);
    const s = at(20, { granted: true });
    ai.update(FRAME, s);
    ai.update(450, s);
    ai.update(120, s);
    expect(ai.state).toBe('windup');
    expect(ai.hitIndex).toBe(2);
    return ai;
  }

  it('interrupt() no intervalo volta a chase sem evento e nenhuma hitboxOn sai depois', () => {
    const ai = inGap();
    expect(ai.interrupt()).toEqual([]);
    expect(ai.state).toBe('chase');
    expect(ai.hitIndex).toBe(0);
    expect(ai.committed).toBe(false);
    const rest = timeline(ai, at(150), FRAME, 3000);
    expect(rest.map((e) => e.ev)).not.toContain('hitboxOn');
  });

  it('interrupt() no 1º golpe fecha a hitbox e o 2º golpe nunca abre', () => {
    const ai = new EnemyAI(TWO);
    const s = at(20, { granted: true });
    ai.update(FRAME, s);
    expect(ai.update(450, s).events).toEqual(['commit', 'hitboxOn']);
    expect(ai.interrupt()).toEqual(['hitboxOff']);
    expect(ai.state).toBe('chase');
    const rest = timeline(ai, at(150), FRAME, 3000);
    expect(rest.map((e) => e.ev)).not.toContain('hitboxOn');
  });

  it('canAct = false no intervalo: nenhuma hitboxOn depois, nem com a permissão de volta', () => {
    const ai = inGap();
    const s = at(20, { granted: true });
    const down = timeline(ai, { ...s, canAct: false }, FRAME, 2000);
    expect(down.map((e) => e.ev)).not.toContain('hitboxOn');
    expect(ai.state).toBe('chase');
  });

  it('canAct = false no meio do 1º golpe fecha a hitbox uma vez e o 2º golpe nunca abre', () => {
    const ai = new EnemyAI(TWO);
    const s = at(20, { granted: true });
    ai.update(FRAME, s);
    ai.update(450, s);
    expect(ai.update(FRAME, { ...s, canAct: false }).events).toEqual(['hitboxOff']);
    const rest = timeline(ai, { ...s, canAct: false }, FRAME, 3000);
    expect(rest).toEqual([]);
  });

  it('depois de interrompida, a próxima investida recomeça a sequência do golpe 1', () => {
    const ai = inGap();
    ai.interrupt();
    const s = at(20, { granted: true });
    expect(ai.update(FRAME, s).events).toEqual(['windupStart']);
    expect(ai.hitIndex).toBe(1);
    expect(ai.committed).toBe(false);
    const seen = timeline(ai, s, FRAME, 900);
    expect(timesOf(seen, 'hitboxOn')).toHaveLength(2);
  });
});
