import { describe, expect, it } from 'vitest';
import { EnemyBrain, type EnemyEvent, type EnemyTuning } from '../../src/core/enemyBrain';
import type { Hit } from '../../src/core/hit';
import { ENEMY } from '../../src/data/tuning';

const T: EnemyTuning = {
  maxHp: 30,
  hitstunMs: 100,
  ragdollStunMs: 500,
  getUpMs: 200,
  deathRagdollMs: 1000,
  dissolveMs: 300,
  staggerMs: 150,
};
const light = (damage = 5, extra: Partial<Hit> = {}): Hit => ({
  ownerId: 1,
  damage,
  strength: 'light',
  direction: { x: 1, y: 0 },
  force: 3,
  ...extra,
});
const heavy = (damage = 10, extra: Partial<Hit> = {}): Hit => ({
  ownerId: 1,
  damage,
  strength: 'heavy',
  direction: { x: 1, y: -0.5 },
  force: 9,
  ...extra,
});
/** Golpe forte que derruba (rasteira, lançador): o que antes todo golpe forte fazia (PST-05). */
const down = (damage = 10, extra: Partial<Hit> = {}): Hit => heavy(damage, { knockdown: true, ...extra });
const types = (evs: EnemyEvent[]): string[] => evs.map((e) => e.type);

describe('EnemyBrain', () => {
  it('golpe leve: reação por animação, depois volta ao normal', () => {
    const b = new EnemyBrain(T);
    expect(types(b.receiveHit(light()))).toEqual(['hitReaction']);
    expect(b.state).toBe('hitstun');
    expect(b.hp).toBe(25);
    b.update(100);
    expect(b.state).toBe('idle');
  });

  it('golpe forte que derruba: ragdoll, atordoado, levanta e volta ao normal (PST-05, substitui "forte = ragdoll")', () => {
    const b = new EnemyBrain(T);
    expect(types(b.receiveHit(down()))).toEqual(['ragdoll']);
    expect(b.state).toBe('ragdollStun');
    expect(types(b.update(500))).toEqual(['getUp']);
    expect(b.state).toBe('gettingUp');
    expect(types(b.update(200))).toEqual(['recovered']);
    expect(b.state).toBe('idle');
  });

  it('caído leva dano de golpe leve sem reiniciar o tempo no chão', () => {
    const b = new EnemyBrain(T);
    b.receiveHit(down());
    b.update(300);
    expect(types(b.receiveHit(light()))).toEqual(['hurtWhileDown']);
    expect(b.hp).toBe(15);
    expect(types(b.update(200))).toEqual(['getUp']);
  });

  it('golpe forte de técnica em quem já está caído dá novo impulso e reinicia o tempo no chão (GND-04, substitui "forte = ragdoll")', () => {
    const b = new EnemyBrain(T);
    b.receiveHit(down(1));
    b.update(300);
    expect(types(b.receiveHit(down(1, { tech: true })))).toEqual(['ragdoll']);
    expect(b.update(300)).toEqual([]);
    expect(types(b.update(200))).toEqual(['getUp']);
  });

  it('golpe leve de técnica enquanto levanta interrompe e vira reação leve (GND-04; sem técnica o golpe é recusado, GND-03)', () => {
    const b = new EnemyBrain(T);
    b.receiveHit(down(1));
    b.update(500);
    expect(types(b.receiveHit(light(1, { tech: true })))).toEqual(['hitReaction']);
    expect(b.state).toBe('hitstun');
  });

  it('golpe fatal: ragdoll permanente, dissolve e some', () => {
    const b = new EnemyBrain(T);
    expect(types(b.receiveHit(heavy(30)))).toEqual(['died', 'ragdoll']);
    expect(b.state).toBe('deadRagdoll');
    expect(b.isDead).toBe(true);
    expect(types(b.update(1000))).toEqual(['dissolve']);
    expect(b.state).toBe('dissolving');
    expect(types(b.update(300))).toEqual(['removed']);
    expect(b.state).toBe('gone');
    expect(b.update(1000)).toEqual([]);
  });

  it('golpe fatal leve também termina em ragdoll', () => {
    const b = new EnemyBrain(T);
    expect(types(b.receiveHit(light(30)))).toEqual(['died', 'ragdoll']);
  });

  it('dano excedente não deixa hp negativo', () => {
    const b = new EnemyBrain(T);
    b.receiveHit(heavy(999));
    expect(b.hp).toBe(0);
  });

  it('golpes depois de morto são ignorados (sem morte dupla)', () => {
    const b = new EnemyBrain(T);
    b.receiveHit(heavy(30));
    expect(b.receiveHit(heavy())).toEqual([]);
    expect(b.receiveHit(light())).toEqual([]);
    b.update(1000);
    expect(b.receiveHit(heavy())).toEqual([]);
    expect(b.state).toBe('dissolving');
  });
});

/** Tuning do jogo: 380 ms de cambaleio e 220 ms de hitstun, os números da spec. */
const REAL: EnemyTuning = ENEMY;

describe('EnemyBrain: cambaleio do golpe forte (PST-01, PST-02, PST-03)', () => {
  it('ENEMY.staggerMs vale 380', () => {
    expect(ENEMY.staggerMs).toBe(380);
  });

  it('golpe forte sem knockdown: stagger, sem ragdoll, e vida cai o dano (PST-01, PST-02)', () => {
    const b = new EnemyBrain(REAL);
    const evs = b.receiveHit(heavy(10));
    expect(types(evs)).toEqual(['stagger']);
    expect(b.state).toBe('stagger');
    expect(b.hp).toBe(REAL.maxHp - 10);
  });

  it('volta a idle em 380 ms e ainda está em stagger em 379 ms (PST-03)', () => {
    const b = new EnemyBrain(REAL);
    b.receiveHit(heavy());
    expect(b.update(379)).toEqual([]);
    expect(b.state).toBe('stagger');
    expect(b.update(1)).toEqual([]);
    expect(b.state).toBe('idle');
  });

  it('usa staggerMs do tuning (150 ms): 149 ainda stagger, 150 idle', () => {
    const b = new EnemyBrain(T);
    b.receiveHit(heavy());
    b.update(149);
    expect(b.state).toBe('stagger');
    b.update(1);
    expect(b.state).toBe('idle');
  });

  it('golpe leve continua em hitstun (hitReaction), não em stagger', () => {
    const b = new EnemyBrain(REAL);
    expect(types(b.receiveHit(light()))).toEqual(['hitReaction']);
    expect(b.state).toBe('hitstun');
  });

  it('forte que sobrevive não dá ragdoll: ragdoll só com knockdown ou morte', () => {
    const b = new EnemyBrain(REAL);
    expect(types(b.receiveHit(heavy(10)))).not.toContain('ragdoll');
    const fatal = new EnemyBrain(REAL);
    expect(types(fatal.receiveHit(heavy(REAL.maxHp)))).toEqual(['died', 'ragdoll']);
  });
});

describe('EnemyBrain: golpe que derruba (PST-05)', () => {
  it.each([
    ['heavy', down(10)],
    ['light', light(5, { knockdown: true })],
  ])('knockdown em golpe %s leva a ragdollStun com o evento ragdoll', (_name, hit) => {
    const b = new EnemyBrain(REAL);
    expect(types(b.receiveHit(hit))).toEqual(['ragdoll']);
    expect(b.state).toBe('ragdollStun');
  });

  it('o tempo no chão é o do tuning, ou o do contexto quando vem (MOV-10)', () => {
    const a = new EnemyBrain(T);
    a.receiveHit(down());
    a.update(499);
    expect(a.state).toBe('ragdollStun');
    expect(types(a.update(1))).toEqual(['getUp']);
    const b = new EnemyBrain(T);
    b.receiveHit(down(), { ragdollStunMs: 900 });
    b.update(899);
    expect(b.state).toBe('ragdollStun');
    expect(types(b.update(1))).toEqual(['getUp']);
  });

  it('knockdown durante o cambaleio leva a ragdollStun', () => {
    const b = new EnemyBrain(REAL);
    b.receiveHit(heavy());
    expect(types(b.receiveHit(down()))).toEqual(['ragdoll']);
    expect(b.state).toBe('ragdollStun');
  });
});

describe('EnemyBrain: golpe leve ou forte durante o cambaleio (PST-10, PST-11)', () => {
  it.each([
    [280, 100, 220], // resto 100: leve vira max(100, 220) = 220
    [80, 300, 300], // resto 300: leve mantém 300
  ])('leve em stagger com resto %i ms: continua stagger com max(%i, 220) = %i ms pela frente', (spent, _rest, expected) => {
    const b = new EnemyBrain(REAL);
    b.receiveHit(heavy());
    b.update(spent);
    expect(b.state).toBe('stagger');
    const evs = b.receiveHit(light());
    expect(types(evs)).toEqual(['hitReaction']);
    expect(b.state).toBe('stagger');
    b.update(expected - 1);
    expect(b.state).toBe('stagger');
    b.update(1);
    expect(b.state).toBe('idle');
  });

  it('forte em stagger volta a ter 380 ms pela frente', () => {
    const b = new EnemyBrain(REAL);
    b.receiveHit(heavy());
    b.update(280); // resto 100
    expect(types(b.receiveHit(heavy()))).toEqual(['stagger']);
    b.update(379);
    expect(b.state).toBe('stagger');
    b.update(1);
    expect(b.state).toBe('idle');
  });

  it('usa hitstunMs do tuning (100 ms): resto 60 vira 100 e resto 130 fica 130', () => {
    const a = new EnemyBrain(T);
    a.receiveHit(heavy());
    a.update(90); // resto 60
    a.receiveHit(light());
    a.update(99);
    expect(a.state).toBe('stagger');
    a.update(1);
    expect(a.state).toBe('idle');
    const b = new EnemyBrain({ ...T, staggerMs: 230 });
    b.receiveHit(heavy());
    b.update(100); // resto 130
    b.receiveHit(light());
    b.update(129);
    expect(b.state).toBe('stagger');
    b.update(1);
    expect(b.state).toBe('idle');
  });
});

describe('EnemyBrain: armadura do inimigo comprometido (CMT-04, CMT-06, CMT-07, CNT-21)', () => {
  it.each([
    ['light', light(6)],
    ['heavy', heavy(6)],
  ])('golpe %s sem knockdown nem counter: continua idle, tira a vida e devolve um armored', (_name, hit) => {
    const b = new EnemyBrain(REAL);
    const evs = b.receiveHit(hit, { committed: true });
    expect(types(evs)).toEqual(['armored']);
    expect(b.state).toBe('idle');
    expect(b.hp).toBe(REAL.maxHp - 6);
  });

  it('o evento armored leva o golpe aceito', () => {
    const b = new EnemyBrain(REAL);
    const hit = light(6);
    expect(b.receiveHit(hit, { committed: true })).toEqual([{ type: 'armored', hit }]);
  });

  it('sem committed o mesmo golpe leve vira hitstun (regressão)', () => {
    const b = new EnemyBrain(REAL);
    expect(types(b.receiveHit(light(6), { committed: false }))).toEqual(['hitReaction']);
    expect(b.state).toBe('hitstun');
  });

  it.each([
    ['heavy', down(6)],
    ['light', light(6, { knockdown: true })],
  ])('golpe %s com knockdown derruba mesmo comprometido (CMT-07)', (_name, hit) => {
    const b = new EnemyBrain(REAL);
    expect(types(b.receiveHit(hit, { committed: true }))).toEqual(['ragdoll']);
    expect(b.state).toBe('ragdollStun');
  });

  it('Contra comprometido ou não: stagger de 380 ms (CNT-21)', () => {
    for (const committed of [true, false]) {
      const b = new EnemyBrain(REAL);
      expect(types(b.receiveHit(heavy(10, { counter: true }), { committed }))).toEqual(['stagger']);
      expect(b.state).toBe('stagger');
      b.update(379);
      expect(b.state).toBe('stagger');
      b.update(1);
      expect(b.state).toBe('idle');
    }
  });

  it('golpe fatal em inimigo comprometido: died e ragdoll', () => {
    const b = new EnemyBrain(REAL);
    expect(types(b.receiveHit(light(REAL.maxHp), { committed: true }))).toEqual(['died', 'ragdoll']);
    expect(b.state).toBe('deadRagdoll');
  });
});

describe('EnemyBrain: limite de um golpe no chão (GND-01..07)', () => {
  /** Inimigo derrubado, ainda em `ragdollStun`. */
  function onGround(t: EnemyTuning = REAL): EnemyBrain {
    const b = new EnemyBrain(t);
    b.receiveHit(down(1));
    expect(b.state).toBe('ragdollStun');
    return b;
  }

  it('downHits é 0 ao cair (GND-05)', () => {
    expect(onGround().downHits).toBe(0);
  });

  it('o 1º golpe sem técnica tira vida, vira hurtWhileDown e não muda o tempo que falta (GND-01, GND-06)', () => {
    const b = onGround(T);
    b.update(300); // faltam 200
    const hp = b.hp;
    expect(types(b.receiveHit(light(6)))).toEqual(['hurtWhileDown']);
    expect(b.hp).toBe(hp - 6);
    expect(b.downHits).toBe(1);
    b.update(199);
    expect(b.state).toBe('ragdollStun');
    expect(types(b.update(1))).toEqual(['getUp']);
  });

  it('golpe forte com knockdown no 1º golpe do chão também só tira vida, sem novo impulso nem reinício (GND-06)', () => {
    const b = onGround(T);
    b.update(300);
    expect(types(b.receiveHit(down(6)))).toEqual(['hurtWhileDown']);
    expect(b.downHits).toBe(1);
    b.update(199);
    expect(b.state).toBe('ragdollStun');
    expect(types(b.update(1))).toEqual(['getUp']);
  });

  it('o 2º golpe sem técnica no mesmo chão é recusado: sem eventos e o hp igual (GND-02)', () => {
    const b = onGround();
    b.receiveHit(light(6));
    const hp = b.hp;
    expect(b.receiveHit(light(6))).toEqual([]);
    expect(b.receiveHit(heavy(6))).toEqual([]);
    expect(b.hp).toBe(hp);
    expect(b.downHits).toBe(1);
    expect(b.state).toBe('ragdollStun');
  });

  it('gettingUp recusa o golpe sem técnica: sem eventos, hp igual, estado igual (GND-03)', () => {
    const b = onGround(T);
    b.update(500);
    expect(b.state).toBe('gettingUp');
    const hp = b.hp;
    expect(b.receiveHit(light(6))).toEqual([]);
    expect(b.receiveHit(heavy(6))).toEqual([]);
    expect(b.hp).toBe(hp);
    expect(b.state).toBe('gettingUp');
  });

  it('golpe de técnica é aceito em ragdollStun e em gettingUp (GND-04)', () => {
    const grounded = onGround(T);
    grounded.receiveHit(light(6)); // o 1º golpe do chão já foi gasto
    const hp = grounded.hp;
    expect(types(grounded.receiveHit(light(6, { tech: true })))).toEqual(['hurtWhileDown']);
    expect(grounded.hp).toBe(hp - 6);
    const rising = onGround(T);
    rising.update(500);
    expect(rising.state).toBe('gettingUp');
    expect(types(rising.receiveHit(light(6, { tech: true })))).toEqual(['hitReaction']);
  });

  it('golpe de técnica não muda downHits, antes e depois do 1º golpe do chão (GND-07)', () => {
    const b = onGround();
    b.receiveHit(light(1, { tech: true }));
    expect(b.downHits).toBe(0);
    b.receiveHit(light(1));
    expect(b.downHits).toBe(1);
    b.receiveHit(light(1, { tech: true }));
    expect(b.downHits).toBe(1);
    b.receiveHit(down(1, { tech: true }));
    expect(b.downHits).toBe(1);
  });

  it('downHits volta a 0 numa nova queda (GND-05)', () => {
    const b = onGround(T);
    b.receiveHit(light(1));
    expect(b.downHits).toBe(1);
    b.update(500); // gettingUp
    b.update(200); // idle
    expect(b.state).toBe('idle');
    b.receiveHit(down(1));
    expect(b.state).toBe('ragdollStun');
    expect(b.downHits).toBe(0);
    expect(types(b.receiveHit(light(1)))).toEqual(['hurtWhileDown']); // o limite vale de novo
  });

  it('o 1º golpe no chão pode matar: died e ragdoll, estado deadRagdoll (GND-01)', () => {
    const b = onGround();
    const evs = b.receiveHit(light(REAL.maxHp));
    expect(types(evs)).toEqual(['died', 'ragdoll']);
    expect(b.state).toBe('deadRagdoll');
    expect(b.hp).toBe(0);
  });
});

describe('EnemyBrain: forceStagger e recover (DFL-11, RDG-09, RDG-22)', () => {
  it('forceStagger(900) leva idle a stagger por 900 ms', () => {
    const b = new EnemyBrain(REAL);
    b.forceStagger(900);
    expect(b.state).toBe('stagger');
    b.update(899);
    expect(b.state).toBe('stagger');
    b.update(1);
    expect(b.state).toBe('idle');
  });

  it('forceStagger em stagger troca o que faltava por 900 ms', () => {
    const b = new EnemyBrain(REAL);
    b.receiveHit(heavy());
    b.update(300); // faltam 80
    b.forceStagger(900);
    b.update(899);
    expect(b.state).toBe('stagger');
    b.update(1);
    expect(b.state).toBe('idle');
  });

  it('forceStagger é ignorado em ragdoll e morto', () => {
    const grounded = new EnemyBrain(T);
    grounded.receiveHit(down());
    grounded.forceStagger(900);
    expect(grounded.state).toBe('ragdollStun');
    grounded.update(499);
    expect(grounded.state).toBe('ragdollStun'); // o relógio do chão não mudou
    const dead = new EnemyBrain(T);
    dead.receiveHit(heavy(T.maxHp));
    dead.forceStagger(900);
    expect(dead.state).toBe('deadRagdoll');
  });

  it('recover() leva hitstun e stagger a idle e devolve true', () => {
    const hurt = new EnemyBrain(REAL);
    hurt.receiveHit(light());
    expect(hurt.recover()).toBe(true);
    expect(hurt.state).toBe('idle');
    const dazed = new EnemyBrain(REAL);
    dazed.receiveHit(heavy());
    expect(dazed.recover()).toBe(true);
    expect(dazed.state).toBe('idle');
    expect(dazed.update(1000)).toEqual([]);
  });

  it('recover() devolve false e não muda nada nos outros estados', () => {
    const idle = new EnemyBrain(REAL);
    expect(idle.recover()).toBe(false);
    expect(idle.state).toBe('idle');
    const grounded = new EnemyBrain(REAL);
    grounded.receiveHit(down());
    expect(grounded.recover()).toBe(false);
    expect(grounded.state).toBe('ragdollStun');
    grounded.update(REAL.ragdollStunMs);
    expect(grounded.state).toBe('gettingUp');
    expect(grounded.recover()).toBe(false);
    expect(grounded.state).toBe('gettingUp');
    const dead = new EnemyBrain(REAL);
    dead.receiveHit(heavy(REAL.maxHp));
    expect(dead.recover()).toBe(false);
    expect(dead.state).toBe('deadRagdoll');
  });
});
