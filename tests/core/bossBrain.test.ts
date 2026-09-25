import { describe, expect, it } from 'vitest';
import { BossBrain, type BossBrainTuning } from '../../src/core/bossBrain';
import { BOSS } from '../../src/data/tuning';
import type { Hit, Strength } from '../../src/core/hit';

const MAX_HP = 600; // Assumption: vida do chefe tier 1.

/** Postura sem teto: isola os testes de fase do efeito colateral de postura de um golpe grande (BAI-07). */
const HIGH_POISE: BossBrainTuning = { ...BOSS, poise: { ...BOSS.poise, max: 1_000_000 } };

function hit(damage: number, strength: Strength = 'light'): Hit {
  return { ownerId: 999, damage, strength, direction: { x: 1, y: 0 }, force: 0 };
}

/** Sai da intro (1500 ms) e chega em `active`. */
function active(maxHp = MAX_HP, t: BossBrainTuning = BOSS): BossBrain {
  const brain = new BossBrain(maxHp, t);
  brain.update(1500);
  return brain;
}

describe('BossBrain: intro invulnerável (BOSS-06, BOSS-08)', () => {
  it('golpe em 1499 ms não tira hp e a intro continua', () => {
    const brain = new BossBrain(MAX_HP);
    expect(brain.update(1499)).toEqual([]);
    expect(brain.state).toBe('intro');
    expect(brain.receiveHit(hit(50))).toEqual([]);
    expect(brain.hp).toBe(600);
  });

  it('1 ms depois (total 1500 ms): introEnd, sai da intro', () => {
    const brain = new BossBrain(MAX_HP);
    brain.update(1499);
    const events = brain.update(1);
    expect(events).toEqual([{ type: 'introEnd' }]);
    expect(brain.state).toBe('active');
  });

  it('golpe depois da intro tira hp normalmente', () => {
    const brain = new BossBrain(MAX_HP);
    brain.update(1500);
    brain.receiveHit(hit(50));
    expect(brain.hp).toBe(550);
  });
});

describe('BossBrain: fase por fração de vida, maxHp 600 (BAI-01)', () => {
  it('hp 397 (dano 203): continua fase 1, sem phaseChanged', () => {
    const brain = active(MAX_HP, HIGH_POISE);
    const events = brain.receiveHit(hit(203));
    expect(brain.hp).toBe(397);
    expect(brain.phase).toBe(1);
    expect(events).toEqual([]);
  });

  it('hp 396 (dano 204, exatos 66%): fase 2, com phaseChanged e roarStart', () => {
    const brain = active();
    const events = brain.receiveHit(hit(204));
    expect(brain.hp).toBe(396);
    expect(brain.phase).toBe(2);
    expect(events).toEqual([
      { type: 'phaseChanged', phase: 2 },
      { type: 'roarStart' },
    ]);
    expect(brain.state).toBe('roar');
  });

  it('hp 199 a partir da fase 2: continua fase 2', () => {
    const brain = active();
    brain.receiveHit(hit(204)); // hp 396, fase 2, entra em roar
    brain.update(900); // sai do roar
    const events = brain.receiveHit(hit(197));
    expect(brain.hp).toBe(199);
    expect(brain.phase).toBe(2);
    expect(events).toEqual([]);
  });

  it('hp 198 a partir da fase 2 (exatos 33%): fase 3, com phaseChanged e roarStart', () => {
    const brain = active();
    brain.receiveHit(hit(204)); // hp 396, fase 2, entra em roar
    brain.update(900); // sai do roar
    const events = brain.receiveHit(hit(198));
    expect(brain.hp).toBe(198);
    expect(brain.phase).toBe(3);
    expect(events).toEqual([
      { type: 'phaseChanged', phase: 3 },
      { type: 'roarStart' },
    ]);
  });
});

describe('BossBrain: rugido de 900 ms ao mudar de fase (BAI-04, BAI-05, BAI-12)', () => {
  it('899 ms: ainda em roar, e um golpe nesse meio-tempo não tira hp', () => {
    const brain = active();
    brain.receiveHit(hit(204)); // hp 396, entra em roar
    expect(brain.update(899)).toEqual([]);
    expect(brain.state).toBe('roar');
    expect(brain.receiveHit(hit(999))).toEqual([]);
    expect(brain.hp).toBe(396);
  });

  it('900 ms: roarEnd, volta a active', () => {
    const brain = active();
    brain.receiveHit(hit(204));
    brain.update(899);
    const events = brain.update(1);
    expect(events).toEqual([{ type: 'roarEnd' }]);
    expect(brain.state).toBe('active');
  });
});

describe('BossBrain: cada limiar dispara uma vez só (BAI-06)', () => {
  it('golpes seguidos dentro da mesma fase não repetem phaseChanged', () => {
    const brain = active();
    const first = brain.receiveHit(hit(204)); // hp 396, fase 2
    expect(first.some((e) => e.type === 'phaseChanged')).toBe(true);
    brain.update(900); // sai do roar
    const second = brain.receiveHit(hit(50)); // hp 346, ainda fase 2
    expect(second.some((e) => e.type === 'phaseChanged')).toBe(false);
    const third = brain.receiveHit(hit(50)); // hp 296, ainda fase 2
    expect(third.some((e) => e.type === 'phaseChanged')).toBe(false);
    expect(brain.phase).toBe(2);
  });

  it('um golpe que atravessa os dois limiares vai direto para a fase 3 com um único roar', () => {
    const brain = active();
    const events = brain.receiveHit(hit(450)); // hp 150, abaixo dos 33% (198)
    expect(brain.hp).toBe(150);
    expect(brain.phase).toBe(3);
    expect(events).toEqual([
      { type: 'phaseChanged', phase: 3 },
      { type: 'roarStart' },
    ]);
  });
});

describe('BossBrain: postura (BAI-07)', () => {
  it('golpe leve de dano 10 tira 10 de postura', () => {
    const brain = active();
    brain.receiveHit(hit(10, 'light'));
    expect(brain.poise).toBe(90);
  });

  it('golpe forte de dano 18 tira 36 de postura (2x)', () => {
    const brain = active();
    brain.receiveHit(hit(18, 'heavy'));
    expect(brain.poise).toBe(64);
  });

  it('nunca fica abaixo de 0, mesmo com dano muito maior que a postura restante', () => {
    const brain = active(100000); // maxHp grande: o golpe não muda de fase nem mata
    brain.receiveHit(hit(1000, 'heavy')); // 2x1000 = 2000 de postura pedida
    expect(brain.poise).toBe(0);
    expect(brain.hp).toBe(99000);
    expect(brain.phase).toBe(1);
  });
});

describe('BossBrain: postura 0 -> stagger 1200 ms -> volta a 100 (BAI-08)', () => {
  it('três golpes fortes de dano 18 zeram a postura e entram em stagger', () => {
    const brain = active();
    brain.receiveHit(hit(18, 'heavy')); // poise 64
    brain.receiveHit(hit(18, 'heavy')); // poise 28
    const events = brain.receiveHit(hit(18, 'heavy')); // poise max(0, 28-36) = 0
    expect(brain.poise).toBe(0);
    expect(brain.state).toBe('stagger');
    expect(events).toEqual([{ type: 'staggerStart' }]);
  });

  it('1199 ms: ainda em stagger, com postura 0', () => {
    const brain = active();
    brain.receiveHit(hit(18, 'heavy'));
    brain.receiveHit(hit(18, 'heavy'));
    brain.receiveHit(hit(18, 'heavy'));
    expect(brain.update(1199)).toEqual([]);
    expect(brain.state).toBe('stagger');
    expect(brain.poise).toBe(0);
  });

  it('1200 ms: staggerEnd, postura volta a 100', () => {
    const brain = active();
    brain.receiveHit(hit(18, 'heavy'));
    brain.receiveHit(hit(18, 'heavy'));
    brain.receiveHit(hit(18, 'heavy'));
    brain.update(1199);
    const events = brain.update(1);
    expect(events).toEqual([{ type: 'staggerEnd' }]);
    expect(brain.state).toBe('active');
    expect(brain.poise).toBe(100);
  });
});

describe('BossBrain: regeneração de postura (BAI-09)', () => {
  it('1999 ms sem golpe não regenera', () => {
    const brain = active();
    brain.receiveHit(hit(40, 'light')); // poise 60
    brain.update(1999);
    expect(brain.poise).toBe(60);
  });

  it('exatamente 2000 ms: ainda sem regeneração (o tempo além do atraso é 0)', () => {
    const brain = active();
    brain.receiveHit(hit(40, 'light')); // poise 60
    brain.update(2000);
    expect(brain.poise).toBe(60);
  });

  it('2000 ms + 1000 ms: regenera 15 (15/s por 1 s), sem passar do teto', () => {
    const brain = active();
    brain.receiveHit(hit(40, 'light')); // poise 60
    brain.update(2000);
    brain.update(1000);
    expect(brain.poise).toBe(75);
  });

  it('tempo suficiente regenera até 100 e não passa disso', () => {
    const brain = active();
    brain.receiveHit(hit(40, 'light')); // poise 60
    brain.update(2000);
    brain.update(10000); // 15/s * 10s = 150, bem acima do que falta (40)
    expect(brain.poise).toBe(100);
  });
});

describe('BossBrain: golpe leve com postura > 0 mantém o estado; golpe forte nunca gera ragdoll (BAI-10, BAI-14)', () => {
  it('golpe leve sem zerar a postura: nenhum evento, estado continua active', () => {
    const brain = active();
    const events = brain.receiveHit(hit(10, 'light'));
    expect(events).toEqual([]);
    expect(brain.state).toBe('active');
  });

  it('golpe forte sem zerar a postura: nenhum evento, estado continua active (não existe ragdoll)', () => {
    const brain = active();
    const events = brain.receiveHit(hit(18, 'heavy'));
    expect(events).toEqual([]);
    expect(brain.state).toBe('active');
  });
});

describe('BossBrain: edge cases de prioridade entre fase, postura e morte', () => {
  it('em stagger, cruzar um limiar de fase encerra o stagger e começa o roar (roar vence)', () => {
    const brain = active();
    brain.receiveHit(hit(18, 'heavy')); // poise 64, hp 582
    brain.receiveHit(hit(18, 'heavy')); // poise 28, hp 564
    brain.receiveHit(hit(18, 'heavy')); // poise 0, hp 546, stagger
    expect(brain.state).toBe('stagger');

    const events = brain.receiveHit(hit(200, 'light')); // hp 346, abaixo dos 66% (396)
    expect(brain.hp).toBe(346);
    expect(brain.phase).toBe(2);
    expect(brain.state).toBe('roar');
    expect(events).toEqual([
      { type: 'phaseChanged', phase: 2 },
      { type: 'roarStart' },
    ]);
  });

  it('morrer em stagger emite died único, sem staggerEnd nem phaseChanged', () => {
    const brain = active();
    brain.receiveHit(hit(18, 'heavy'));
    brain.receiveHit(hit(18, 'heavy'));
    brain.receiveHit(hit(18, 'heavy')); // stagger, hp 546
    const events = brain.receiveHit(hit(999, 'heavy')); // hp <= 0
    expect(brain.hp).toBe(0);
    expect(brain.state).toBe('dead');
    expect(events).toEqual([{ type: 'died' }]);
  });

  it('um golpe que mataria e cruzaria fase ao mesmo tempo: morre, sem entrar em roar', () => {
    const brain = new BossBrain(250);
    brain.update(1500); // active
    const events = brain.receiveHit(hit(300, 'light')); // cruzaria os 33% (82.5) e também é letal
    expect(brain.hp).toBe(0);
    expect(brain.state).toBe('dead');
    expect(events).toEqual([{ type: 'died' }]);
  });

  it('já morto: qualquer golpe ou update não muda nada', () => {
    const brain = active();
    brain.receiveHit(hit(9999, 'heavy'));
    expect(brain.state).toBe('dead');
    expect(brain.receiveHit(hit(10))).toEqual([]);
    expect(brain.update(5000)).toEqual([]);
    expect(brain.hp).toBe(0);
  });
});
