import { describe, expect, it } from 'vitest';
import { BossAI, type BossAIObservation, type BossAttack } from '../../src/core/bossAI';
import { BOSS } from '../../src/data/tuning';

const ONI = { volleyCount: 3, projectileSpeed: 260 };
const TECELA = { volleyCount: 5, projectileSpeed: 325 };

const CYCLES: Record<1 | 2 | 3, BossAttack[]> = {
  1: ['charge', 'leap'],
  2: ['charge', 'volley', 'leap'],
  3: ['volley', 'charge', 'leap', 'charge'],
};

function windupMs(attack: BossAttack, phase: 1 | 2 | 3): number {
  const base = attack === 'charge' ? BOSS.charge.windupMs : attack === 'leap' ? BOSS.leap.windupMs : BOSS.volley.windupMs;
  return base * BOSS.phases[phase - 1].windupMult;
}

function bodyMs(attack: BossAttack, volleyCount = ONI.volleyCount): number {
  if (attack === 'charge') return (BOSS.charge.maxDist / BOSS.charge.speed) * 1000;
  if (attack === 'leap') return BOSS.leap.durationMs;
  return (volleyCount - 1) * BOSS.volley.intervalMs;
}

function restMs(phase: 1 | 2 | 3): number {
  return BOSS.phases[phase - 1].restMs;
}

/** ms decorridos até o início do preparo do ataque no índice `idx` do ciclo da fase (soma dos anteriores). */
function timeBeforeIndex(phase: 1 | 2 | 3, idx: number): number {
  let total = 0;
  for (let i = 0; i < idx; i++) {
    const a = CYCLES[phase][i];
    total += windupMs(a, phase) + bodyMs(a) + restMs(phase);
  }
  return total;
}

function obsFor(phase: 1 | 2 | 3, extra: Partial<BossAIObservation> = {}): BossAIObservation {
  return { selfX: 0, playerX: 1000, blocked: false, canAct: true, phase, spec: ONI, ...extra };
}

describe('BossAI: preparo por fase, valores exatos do spec (BAT-01/02/04, BAI-03)', () => {
  it.each<[BossAttack, number, number, number]>([
    ['charge', 600, 510, 420],
    ['leap', 500, 425, 350],
    ['volley', 700, 595, 490],
  ])('%s: fase1=%i, fase2=%i, fase3=%i', (attack, p1, p2, p3) => {
    expect(windupMs(attack, 1)).toBeCloseTo(p1, 6);
    expect(windupMs(attack, 2)).toBeCloseTo(p2, 6);
    expect(windupMs(attack, 3)).toBeCloseTo(p3, 6);
  });
});

describe('BossAI: todo preparo >= 350 ms em todas as fases (BAT-05)', () => {
  it('charge/leap/volley em fase 1, 2 e 3 nunca ficam abaixo de 350 ms', () => {
    const attacks: BossAttack[] = ['charge', 'leap', 'volley'];
    for (const a of attacks) {
      for (const phase of [1, 2, 3] as const) {
        expect(windupMs(a, phase)).toBeGreaterThanOrEqual(350);
      }
    }
  });
});

describe('BossAI: limite exato do preparo por fase (ataque não começa 1 ms antes)', () => {
  function boundaryCase(phase: 1 | 2 | 3, idx: number) {
    const attack = CYCLES[phase][idx];
    const ai = new BossAI();
    const obs = obsFor(phase);
    const setup = timeBeforeIndex(phase, idx);
    const w = windupMs(attack, phase);
    ai.update(setup, obs);
    const before = ai.update(w - 1, obs);
    expect(before.state).toBe('windup');
    expect(before.attack).toBe(attack);
    expect(before.vx).toBe(0);
    const after = ai.update(1, obs);
    expect(after.state).not.toBe('windup');
  }

  it('investida, fase 1 (600 ms)', () => boundaryCase(1, 0));
  it('investida, fase 2 (510 ms)', () => boundaryCase(2, 0));
  it('investida, fase 3 (420 ms, 2º ataque do ciclo)', () => boundaryCase(3, 1));
  it('salto, fase 1 (500 ms, 2º ataque do ciclo)', () => boundaryCase(1, 1));
  it('salto, fase 2 (425 ms, 3º ataque do ciclo)', () => boundaryCase(2, 2));
  it('salto, fase 3 (350 ms, 3º ataque do ciclo)', () => boundaryCase(3, 2));
  it('rajada, fase 2 (595 ms, 2º ataque do ciclo)', () => boundaryCase(2, 1));
  it('rajada, fase 3 (490 ms, 1º ataque do ciclo)', () => boundaryCase(3, 0));
});

describe('BossAI: descanso depois de cada ataque, por fase (BAI-11)', () => {
  it('fase 1: 899 ms ainda descansando, 900 ms começa o próximo preparo', () => {
    const ai = new BossAI();
    const obs = obsFor(1);
    ai.update(windupMs('charge', 1) + bodyMs('charge'), obs); // termina a investida, entra em rest
    const before = ai.update(899, obs);
    expect(before.state).toBe('rest');
    expect(before.attack).toBeNull();
    const after = ai.update(1, obs);
    expect(after.state).toBe('windup');
    expect(after.attack).toBe('leap');
  });

  it('fase 2: 699 ms ainda descansando, 700 ms começa o próximo preparo', () => {
    const ai = new BossAI();
    const obs = obsFor(2);
    ai.update(windupMs('charge', 2) + bodyMs('charge'), obs);
    const before = ai.update(699, obs);
    expect(before.state).toBe('rest');
    const after = ai.update(1, obs);
    expect(after.state).toBe('windup');
    expect(after.attack).toBe('volley');
  });

  it('fase 3: 499 ms ainda descansando, 500 ms começa o próximo preparo', () => {
    const ai = new BossAI();
    const obs = obsFor(3);
    ai.update(windupMs('volley', 3) + bodyMs('volley'), obs);
    const before = ai.update(499, obs);
    expect(before.state).toBe('rest');
    const after = ai.update(1, obs);
    expect(after.state).toBe('windup');
    expect(after.attack).toBe('charge');
  });
});

describe('BossAI: ciclo de ataques por fase (BAI-02)', () => {
  function driveAttackSequence(phase: 1 | 2 | 3, steps: number, stepMs = 10): BossAttack[] {
    const ai = new BossAI();
    const obs = obsFor(phase);
    const seq: BossAttack[] = [];
    let last: BossAttack | null = null;
    for (let i = 0; i < steps; i++) {
      const out = ai.update(stepMs, obs);
      if (out.attack && out.attack !== last) seq.push(out.attack);
      last = out.attack;
    }
    return seq;
  }

  it('fase 1: investida -> salto -> investida (recomeça)', () => {
    const seq = driveAttackSequence(1, 1000);
    expect(seq.slice(0, 4)).toEqual(['charge', 'leap', 'charge', 'leap']);
  });

  it('fase 2: investida -> rajada -> salto -> investida (recomeça)', () => {
    const seq = driveAttackSequence(2, 800);
    expect(seq.slice(0, 4)).toEqual(['charge', 'volley', 'leap', 'charge']);
  });

  it('fase 3: rajada -> investida -> salto -> investida -> rajada (recomeça)', () => {
    const seq = driveAttackSequence(3, 800);
    expect(seq.slice(0, 5)).toEqual(['volley', 'charge', 'leap', 'charge', 'volley']);
  });

  it('trocar de fase reinicia o ciclo do primeiro ataque, não continua de onde estava', () => {
    const ai = new BossAI();
    let obs = obsFor(1);
    // avança o bastante pra completar a 1ª investida da fase 1 (cycleIndex vira 1, ainda descansando)
    for (let i = 0; i < 200; i++) ai.update(10, obs);
    // troca para a fase 3 antes do próximo preparo começar: CYCLES[3] = [volley, charge, leap, charge]
    obs = obsFor(3);
    let firstAfterSwitch: BossAttack | null = null;
    for (let i = 0; i < 300 && !firstAfterSwitch; i++) {
      const out = ai.update(10, obs);
      if (out.attack) firstAfterSwitch = out.attack;
    }
    // se o ciclo não tivesse reiniciado, o índice 1 herdado daria 'charge' (CYCLES[3][1]), não 'volley'
    expect(firstAfterSwitch).toBe('volley');
  });
});

describe('BossAI: investida (BAT-01, BAT-09)', () => {
  it('player à direita no fim do preparo: vx = +320, hitboxOn nesse frame', () => {
    const ai = new BossAI();
    const obs = obsFor(1, { selfX: 0, playerX: 500 });
    const out = ai.update(windupMs('charge', 1), obs);
    expect(out.state).toBe('charge');
    expect(out.vx).toBe(320);
    expect(out.events).toEqual([{ type: 'hitboxOn' }]);
  });

  it('hitboxOn não se repete nos frames seguintes da investida', () => {
    const ai = new BossAI();
    const obs = obsFor(1, { selfX: 0, playerX: 500 });
    ai.update(windupMs('charge', 1), obs);
    const mid = ai.update(100, obs);
    expect(mid.events).toEqual([]);
  });

  it('para exatamente em 360 px, somando o deslocamento por vários updates pequenos', () => {
    const ai = new BossAI();
    const obs = obsFor(1, { selfX: 0, playerX: 500 });
    ai.update(windupMs('charge', 1), obs); // entra na investida, 0 px percorridos
    let last = ai.update(125, obs);
    for (let i = 1; i < 8; i++) last = ai.update(125, obs); // 8 * 40 px = 320 px, ainda < 360
    expect(last.state).toBe('charge');
    const final = ai.update(125, obs); // 9º passo: total 360 px exatos
    expect(final.state).not.toBe('charge');
    expect(final.events).toEqual([{ type: 'hitboxOff' }]);
  });

  it('blocked encerra o movimento antes de completar os 360 px', () => {
    const ai = new BossAI();
    const obs = obsFor(1, { selfX: 0, playerX: 500 });
    ai.update(windupMs('charge', 1), obs);
    ai.update(50, obs); // anda um pouco, ainda longe de 360 px
    const out = ai.update(10, { ...obs, blocked: true });
    expect(out.state).not.toBe('charge');
    expect(out.vx).toBe(0);
    expect(out.events).toEqual([{ type: 'hitboxOff' }]);
  });

  it('player no mesmo x do chefe usa o facing atual, não um valor fixo (edge case)', () => {
    const ai = new BossAI();
    const left = obsFor(1, { selfX: 100, playerX: 50 }); // investida 1: player à esquerda -> facing -1
    const afterWindup = ai.update(windupMs('charge', 1), left);
    expect(afterWindup.vx).toBe(-320);

    ai.update(bodyMs('charge'), left); // termina a investida
    ai.update(restMs(1), left); // termina o descanso, começa o preparo do salto
    ai.update(windupMs('leap', 1), left); // termina o preparo do salto (facing continua -1: player à esquerda)
    ai.update(700, left); // salto completo (duração fixa, não escala por fase)
    ai.update(restMs(1), left); // termina o descanso, começa o preparo da 2ª investida

    const same = obsFor(1, { selfX: 100, playerX: 100 }); // 2ª investida: player no mesmo x
    const secondCharge = ai.update(windupMs('charge', 1), same);
    expect(secondCharge.state).toBe('charge');
    expect(secondCharge.vx).toBe(-320); // manteve o facing anterior, não virou +320
  });
});

describe('BossAI: salto (BAT-02, BAT-10)', () => {
  it('toX fixado no fim do preparo; progress 0 -> 1 em 700 ms; landed uma única vez', () => {
    const ai = new BossAI();
    const obs = obsFor(1, { selfX: 100, playerX: 50 });
    ai.update(windupMs('charge', 1) + bodyMs('charge') + restMs(1), obs); // chega no preparo do salto (idx 1)

    const start = ai.update(windupMs('leap', 1), { ...obs, playerX: 777 }); // fixa toX = 777 no fim do preparo
    expect(start.state).toBe('leap');
    expect(start.leap).toEqual({ fromX: 100, toX: 777, progress: 0 });
    expect(start.events).toEqual([]);

    const half = ai.update(350, { ...obs, playerX: 777 });
    expect(half.leap).not.toBeNull();
    expect(half.leap!.progress).toBeCloseTo(0.5, 10);
    expect(half.events).toEqual([]);

    const before = ai.update(349, { ...obs, playerX: 777 }); // total 699 ms
    expect(before.state).toBe('leap');
    expect(before.events).toEqual([]);

    const landed = ai.update(1, { ...obs, playerX: 9999 }); // total 700 ms exatos; playerX aqui não importa mais
    expect(landed.events).toEqual([{ type: 'landed' }]);
    expect(landed.leap).toEqual({ fromX: 100, toX: 777, progress: 1 });
  });
});

describe('BossAI: rajada (BAT-04, BTIER-05, BTIER-07)', () => {
  it('Tecelã: 5 disparos a 325 px/s, 150 ms entre eles, terminando exatamente no 5º', () => {
    const ai = new BossAI();
    const obs = obsFor(3, { selfX: 0, playerX: 500, spec: TECELA });

    const first = ai.update(windupMs('volley', 3), obs); // preparo termina: 1º disparo imediato
    expect(first.state).toBe('volley');
    expect(first.events).toEqual([{ type: 'fire', dir: 1, speed: 325 }]);

    const none = ai.update(149, obs);
    expect(none.events).toEqual([]);

    const second = ai.update(1, obs); // total 150 ms desde o 1º disparo
    expect(second.events).toEqual([{ type: 'fire', dir: 1, speed: 325 }]);

    ai.update(150, obs); // 3º disparo
    ai.update(150, obs); // 4º disparo
    const fifth = ai.update(150, obs); // 5º e último disparo: a rajada acaba nesse mesmo frame
    expect(fifth.events).toEqual([{ type: 'fire', dir: 1, speed: 325 }]);
    expect(fifth.state).toBe('rest');
    expect(fifth.attack).toBeNull();
  });

  it('Oni: 3 disparos a 260 px/s, dir para a esquerda quando o player está à esquerda', () => {
    const ai = new BossAI();
    const obs = obsFor(3, { selfX: 500, playerX: 0, spec: ONI });
    const first = ai.update(windupMs('volley', 3), obs);
    expect(first.events).toEqual([{ type: 'fire', dir: -1, speed: 260 }]);
  });
});

describe('BossAI: sem canAct cancela o ataque em andamento (BAI-05)', () => {
  it('durante a investida: fecha a hitbox, zera vx e cancela', () => {
    const ai = new BossAI();
    const obs = obsFor(1, { selfX: 0, playerX: 500 });
    ai.update(windupMs('charge', 1), obs); // entra na investida (hitboxOn já disparado)
    ai.update(50, obs); // andando
    const interrupted = ai.update(10, { ...obs, canAct: false });
    expect(interrupted.vx).toBe(0);
    expect(interrupted.state).toBe('rest');
    expect(interrupted.attack).toBeNull();
    expect(interrupted.events).toEqual([{ type: 'hitboxOff' }]);
  });

  it('durante o preparo: cancela sem hitboxOff (a hitbox nunca abriu)', () => {
    const ai = new BossAI();
    const obs = obsFor(1, { selfX: 0, playerX: 500 });
    ai.update(100, obs); // ainda no meio do preparo de 600 ms
    const interrupted = ai.update(10, { ...obs, canAct: false });
    expect(interrupted.events).toEqual([]);
    expect(interrupted.state).toBe('rest');
  });

  it('depois de canAct voltar, o ataque cancelado não retoma: reinicia do preparo', () => {
    const ai = new BossAI();
    const obs = obsFor(1, { selfX: 0, playerX: 500 });
    ai.update(windupMs('charge', 1), obs); // entra na investida
    ai.update(50, obs); // andando
    ai.update(10, { ...obs, canAct: false }); // interrompe
    const resumed = ai.update(1, obs); // canAct volta
    expect(resumed.state).not.toBe('charge');
  });
});
