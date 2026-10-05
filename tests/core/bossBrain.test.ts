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
    expect(events).toEqual([{ type: 'phaseChanged', phase: 2 }, { type: 'roarStart' }]);
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
    expect(events).toEqual([{ type: 'phaseChanged', phase: 3 }, { type: 'roarStart' }]);
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
    expect(events).toEqual([{ type: 'phaseChanged', phase: 3 }, { type: 'roarStart' }]);
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

    const events = brain.receiveHit(hit(200, 'light')); // em stagger vale ×1,5 (BFX-05): hp 546 - 300 = 246, abaixo dos 66% (396)
    expect(brain.hp).toBe(246);
    expect(brain.phase).toBe(2);
    expect(brain.state).toBe('roar');
    expect(events).toEqual([{ type: 'phaseChanged', phase: 2 }, { type: 'roarStart' }]);
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

describe('BossBrain: Kokusen (KOK-06, KOK-08, KOK-12, KOK-32)', () => {
  it('KOK-08: dano do Kokusen (45) tira 45 de hp e 3×45 = 135 de postura, nunca abaixo de 0', () => {
    const brain = active();
    const events = brain.receiveKokusen(45, 135);
    expect(brain.hp).toBe(555);
    expect(brain.poise).toBe(0); // teto de 100 (BOSS.poise.max): max(0, 100 - 135) = 0
    expect(events).toEqual([{ type: 'staggerStart' }]);
  });

  it('postura nunca fica abaixo de 0 mesmo com o teto ampliado (sem cruzar fase)', () => {
    const brain = active(MAX_HP, HIGH_POISE);
    const events = brain.receiveKokusen(45, 135);
    expect(brain.poise).toBe(1_000_000 - 135);
    expect(brain.hp).toBe(555);
    expect(events).toEqual([]);
  });

  it('KOK-12/32: cruzar um limiar de fase com o Kokusen perde os 45 cheios e entra em roar no mesmo frame', () => {
    const brain = new BossBrain(100); // 66% = 66: hp 100 -> 55 cruza o limiar da fase 2
    brain.update(1500); // active
    const events = brain.receiveKokusen(45, 135);
    expect(brain.hp).toBe(55);
    expect(brain.phase).toBe(2);
    expect(brain.state).toBe('roar');
    expect(events).toEqual([{ type: 'phaseChanged', phase: 2 }, { type: 'roarStart' }]);
  });

  it('na intro, no rugido ou morto: ignorado por completo, sem mudar hp nem postura', () => {
    const brain = new BossBrain(MAX_HP); // intro
    expect(brain.receiveKokusen(45, 135)).toEqual([]);
    expect(brain.hp).toBe(MAX_HP);

    const roaring = active();
    roaring.receiveHit(hit(204)); // cruza a fase 2, entra em roar
    expect(roaring.receiveKokusen(45, 135)).toEqual([]);
    expect(roaring.hp).toBe(396);

    const dead = active();
    dead.receiveHit(hit(9999, 'heavy'));
    expect(dead.receiveKokusen(45, 135)).toEqual([]);
    expect(dead.hp).toBe(0);
  });
});

describe('BossBrain: parry tira 30 de postura (PAR-07)', () => {
  it('cada parry (0 de dano, 30 de postura) tira 30 sem mexer no hp; o piso é 0 e zerar atordoa', () => {
    const brain = active();
    expect(brain.receiveKokusen(0, 30)).toEqual([]);
    expect(brain.poise).toBe(70);
    expect(brain.hp).toBe(MAX_HP);
    brain.receiveKokusen(0, 30);
    brain.receiveKokusen(0, 30);
    expect(brain.poise).toBe(10);
    // 10 - 30 fica em 0, nunca negativo, e a postura zerada atordoa o chefe.
    expect(brain.receiveKokusen(0, 30)).toEqual([{ type: 'staggerStart' }]);
    expect(brain.poise).toBe(0);
    expect(brain.state).toBe('stagger');
    expect(brain.hp).toBe(MAX_HP);
  });
});

describe('BossBrain: stun por parede não mexe na postura (BFX-02, BFX-08)', () => {
  it('stun entra em stagger por ms dados, com causa wall e a postura intacta', () => {
    const brain = active(400);
    brain.receiveHit(hit(10, 'light')); // poise 90
    const events = brain.stun(1500);
    expect(events).toEqual([{ type: 'staggerStart' }]);
    expect(brain.state).toBe('stagger');
    expect(brain.staggerCause).toBe('wall');
    expect(brain.poise).toBe(90);
  });

  it('1499 ms ainda em stagger; 1500 ms sai e a postura NÃO volta a 100', () => {
    const brain = active(400);
    brain.receiveHit(hit(10, 'light')); // poise 90
    brain.stun(1500);
    expect(brain.update(1499)).toEqual([]);
    expect(brain.state).toBe('stagger');
    expect(brain.update(1)).toEqual([{ type: 'staggerEnd' }]);
    expect(brain.state).toBe('active');
    expect(brain.poise).toBe(90);
    expect(brain.staggerCause).toBeNull();
  });

  it('já o stagger por postura restaura a postura a 100 ao sair e tem causa poise', () => {
    const brain = active(400);
    brain.receiveHit(hit(50, 'heavy')); // poise 0
    expect(brain.staggerCause).toBe('poise');
    brain.update(BOSS.staggerMs);
    expect(brain.poise).toBe(100);
  });

  it('golpes durante o stagger da parede não gastam a postura nem recomeçam o stagger', () => {
    const brain = active(400);
    brain.receiveHit(hit(10, 'light')); // poise 90
    brain.stun(1500);
    const events = brain.receiveHit(hit(60, 'heavy')); // poderia zerar a postura se contasse
    expect(events).toEqual([]);
    expect(brain.poise).toBe(90);
    expect(brain.staggerCause).toBe('wall');
  });

  it.each(['intro', 'roar', 'dead'] as const)('stun é ignorado em %s', (state) => {
    const brain = new BossBrain(400, HIGH_POISE);
    if (state !== 'intro') brain.update(1500);
    if (state === 'roar') brain.receiveHit(hit(150, 'light')); // cruza 66% de 400 (264): hp 250
    if (state === 'dead') brain.receiveHit(hit(999, 'light'));
    expect(brain.state).toBe(state);
    expect(brain.stun(1500)).toEqual([]);
    expect(brain.state).toBe(state);
  });

  it('stun durante um stagger por postura é ignorado e não troca a causa', () => {
    const brain = active(400);
    brain.receiveHit(hit(50, 'heavy'));
    expect(brain.stun(1500)).toEqual([]);
    expect(brain.staggerCause).toBe('poise');
  });
});

describe('BossBrain: dano ×1,5 em stagger (BFX-05)', () => {
  it('golpe de 10 em stagger tira 15; fora dele tira 10', () => {
    const brain = active(400);
    brain.receiveHit(hit(10, 'light'));
    expect(brain.hp).toBe(390);
    brain.stun(1500);
    brain.receiveHit(hit(10, 'light'));
    expect(brain.hp).toBe(375);
  });

  it('arredonda: golpe de 7 em stagger tira round(10,5) = 11', () => {
    const brain = active(400);
    brain.stun(1500);
    brain.receiveHit(hit(7, 'light'));
    expect(brain.hp).toBe(389);
  });

  it('depois que o stagger acaba o dano volta ao normal', () => {
    const brain = active(400);
    brain.stun(1500);
    brain.update(1500);
    brain.receiveHit(hit(10, 'light'));
    expect(brain.hp).toBe(390);
  });

  it('tuning não padrão: staggerDamageMult 2 tira 20 com golpe de 10', () => {
    const brain = active(400, { ...BOSS, staggerDamageMult: 2 });
    brain.stun(1500);
    brain.receiveHit(hit(10, 'light'));
    expect(brain.hp).toBe(380);
  });

  it('receiveKokusen continua sem o multiplicador', () => {
    const brain = active(400);
    brain.stun(1500);
    brain.receiveKokusen(10, 0);
    expect(brain.hp).toBe(390);
  });
});

describe('BossBrain: finalizador (BFX-06, BFX-07, BFX-08, EDG-06)', () => {
  it('em stagger, tira round(0,12 × 400) = 48, sem o ×1,5, e um segundo uso devolve []', () => {
    const brain = active(400);
    brain.stun(1500);
    expect(brain.finisherReady).toBe(true);
    expect(brain.receiveFinisher()).toEqual([]);
    expect(brain.hp).toBe(352);
    expect(brain.finisherReady).toBe(false);
    expect(brain.receiveFinisher()).toEqual([]);
    expect(brain.hp).toBe(352);
  });

  it('o stagger por postura também libera o finalizador', () => {
    const brain = active(400);
    brain.receiveHit(hit(5, 'heavy')); // poise 90
    brain.receiveHit(hit(50, 'heavy')); // poise 0, hp 345 (400-5-50)
    expect(brain.state).toBe('stagger');
    expect(brain.finisherReady).toBe(true);
    brain.receiveFinisher();
    expect(brain.hp).toBe(345 - 48);
  });

  it('fora de stagger devolve [] e não tira HP (active, intro, roar)', () => {
    const brain = new BossBrain(400, HIGH_POISE);
    expect(brain.receiveFinisher()).toEqual([]);
    expect(brain.hp).toBe(400);
    brain.update(1500);
    expect(brain.finisherReady).toBe(false);
    expect(brain.receiveFinisher()).toEqual([]);
    brain.receiveHit(hit(150, 'light')); // roar
    expect(brain.state).toBe('roar');
    expect(brain.receiveFinisher()).toEqual([]);
    expect(brain.hp).toBe(250);
  });

  it('um novo stagger rearma o finalizador (uma vez por stagger)', () => {
    const brain = active(400);
    brain.stun(1500);
    brain.receiveFinisher();
    brain.update(1500);
    expect(brain.finisherReady).toBe(false);
    expect(brain.receiveFinisher()).toEqual([]);
    brain.stun(1500);
    expect(brain.finisherReady).toBe(true);
    brain.receiveFinisher();
    expect(brain.hp).toBe(400 - 48 - 48);
  });

  it('o finalizador que zera o HP emite died e o chefe morre (EDG-06)', () => {
    // Sem limiares de fase no caminho: o HP vai a 48 e o finalizador (48) zera.
    const low = active(400, { ...BOSS, phaseThresholds: { phase2: 0, phase3: 0 } });
    low.receiveHit(hit(352, 'light')); // hp 48
    low.stun(1500);
    expect(low.receiveFinisher()).toEqual([{ type: 'died' }]);
    expect(low.hp).toBe(0);
    expect(low.state).toBe('dead');
    expect(low.finisherReady).toBe(false);
  });

  it('a saída por rugido (limiar de fase) desarma o finalizador', () => {
    const brain = active(400);
    brain.stun(1500);
    brain.receiveHit(hit(120, 'light')); // ×1,5 = 180: hp 220, cruza 66% (264) e 33% (132)? 220 > 132: fase 2
    expect(brain.state).toBe('roar');
    expect(brain.finisherReady).toBe(false);
    expect(brain.staggerCause).toBeNull();
  });

  it('tuning não padrão: hpFraction 0,25 tira 100 de 400', () => {
    const brain = active(400, { ...BOSS, finisher: { hpFraction: 0.25 } });
    brain.stun(1500);
    brain.receiveFinisher();
    expect(brain.hp).toBe(300);
  });
});
