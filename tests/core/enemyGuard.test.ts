import { describe, expect, it } from 'vitest';
import { EnemyGuard, type GuardTrigger } from '../../src/core/enemyGuard';
import { Rng } from '../../src/core/rng';

const NEAR: GuardTrigger = { round: 1, idle: true, playerFacingEnemy: true, distancePx: 40 };

/** Sorteio que grava a probabilidade pedida e responde `answer`. */
function fakeRoll(answer: boolean): { chance: (p: number) => boolean; asked: number[] } {
  const asked: number[] = [];
  return {
    asked,
    chance: (p: number) => {
      asked.push(p);
      return answer;
    },
  };
}

const guardUp = (): EnemyGuard => {
  const g = new EnemyGuard(fakeRoll(true));
  expect(g.onPlayerLightMove(NEAR)).toBe(true);
  return g;
};

describe('EBL-01: chance por rodada = min(0.1 + 0.03 × (rodada − 1), 0.4)', () => {
  it('rodada 1 → 0.1, rodada 11 → 0.4, rodada 20 → 0.4 (teto)', () => {
    expect(EnemyGuard.chanceFor(1)).toBeCloseTo(0.1, 10);
    expect(EnemyGuard.chanceFor(11)).toBeCloseTo(0.4, 10);
    expect(EnemyGuard.chanceFor(20)).toBe(0.4);
  });

  it('rodada 10 ainda está abaixo do teto (0.37) e a 11 chega nele', () => {
    expect(EnemyGuard.chanceFor(10)).toBeCloseTo(0.37, 10);
    expect(EnemyGuard.chanceFor(10)).toBeLessThan(EnemyGuard.chanceFor(11));
  });

  it('sorteia com a chance da rodada', () => {
    const roll = fakeRoll(false);
    const g = new EnemyGuard(roll);
    g.onPlayerLightMove({ ...NEAR, round: 1 });
    g.onPlayerLightMove({ ...NEAR, round: 20 });
    expect(roll.asked[0]).toBeCloseTo(0.1, 10);
    expect(roll.asked[1]).toBe(0.4);
  });

  it('usa o RNG da run: com a mesma seed, sobe a guarda exatamente quando o sorteio cai abaixo da chance', () => {
    for (let seed = 0; seed < 20; seed++) {
      const expected = new Rng(seed).next() < 0.4;
      const g = new EnemyGuard(new Rng(seed));
      expect(g.onPlayerLightMove({ ...NEAR, round: 20 })).toBe(expected);
    }
  });

  it('a guarda dura 600 ms: 599 ainda guarda, 600 acabou', () => {
    const g = guardUp();
    g.update(599);
    expect(g.guarding).toBe(true);
    g.update(1);
    expect(g.guarding).toBe(false);
  });

  it('sorteio que falha não levanta a guarda', () => {
    const g = new EnemyGuard(fakeRoll(false));
    expect(g.onPlayerLightMove(NEAR)).toBe(false);
    expect(g.guarding).toBe(false);
  });

  it('só reage a 60 px ou menos (60 sim, 61 não), sem sortear fora das condições', () => {
    const roll = fakeRoll(true);
    const g = new EnemyGuard(roll);
    expect(g.onPlayerLightMove({ ...NEAR, distancePx: 61 })).toBe(false);
    expect(roll.asked).toEqual([]);
    expect(g.onPlayerLightMove({ ...NEAR, distancePx: 60 })).toBe(true);
  });

  it('só em `idle` e com o jogador virado para ele', () => {
    const roll = fakeRoll(true);
    const g = new EnemyGuard(roll);
    expect(g.onPlayerLightMove({ ...NEAR, idle: false })).toBe(false);
    expect(g.onPlayerLightMove({ ...NEAR, playerFacingEnemy: false })).toBe(false);
    expect(roll.asked).toEqual([]);
  });
});

describe('EBL-02: leve de frente na guarda', () => {
  it('0 de dano, +8 de estrutura e bloqueado', () => {
    const g = guardUp();
    const r = g.resolveHit({ damage: 6, strength: 'light', fromFront: true, structureGain: 4 });
    expect(r).toEqual({ damage: 0, structureGain: 8, blocked: true, guardEnded: false });
    expect(g.guarding).toBe(true);
  });

  it('leve pelas costas passa com o dano e a estrutura normais', () => {
    const g = guardUp();
    const r = g.resolveHit({ damage: 6, strength: 'light', fromFront: false, structureGain: 4 });
    expect(r).toEqual({ damage: 6, structureGain: 4, blocked: false, guardEnded: false });
  });

  it('sem guarda o leve causa dano normal', () => {
    const g = new EnemyGuard(fakeRoll(false));
    const r = g.resolveHit({ damage: 6, strength: 'light', fromFront: true, structureGain: 4 });
    expect(r).toEqual({ damage: 6, structureGain: 4, blocked: false, guardEnded: false });
  });
});

describe('EBL-03, EBL-05: forte de frente na guarda', () => {
  it('dano cheio, estrutura normal e a guarda acaba no mesmo golpe', () => {
    const g = guardUp();
    const r = g.resolveHit({ damage: 12, strength: 'heavy', fromFront: true, structureGain: 10 });
    expect(r).toEqual({ damage: 12, structureGain: 10, blocked: false, guardEnded: true });
    expect(g.guarding).toBe(false);
  });
});

describe('EBL-04: chuteCarregado na guarda', () => {
  it('dano cheio (24) e +40 de estrutura, sem ser bloqueado', () => {
    const g = guardUp();
    const r = g.resolveHit({ damage: 24, strength: 'heavy', unblockable: true, fromFront: true, structureGain: 40 });
    expect(r).toEqual({ damage: 24, structureGain: 40, blocked: false, guardEnded: true });
  });
});

/** Guarda levantada por `tryRaise`, de leitura ou comum. */
const raised = (read: boolean): EnemyGuard => {
  const g = new EnemyGuard(fakeRoll(true));
  expect(g.tryRaise(1, read)).toBe(true);
  return g;
};

describe('EnemyGuard.tryRaise (RDG-04)', () => {
  it('chance 0 não chama o sorteio nem levanta a guarda', () => {
    const roll = fakeRoll(true);
    const g = new EnemyGuard(roll);
    expect(g.tryRaise(0, false)).toBe(false);
    expect(g.tryRaise(0, true)).toBe(false);
    expect(roll.asked).toEqual([]);
    expect(g.guarding).toBe(false);
  });

  it('chance 1 levanta a guarda mesmo que o sorteio respondesse não', () => {
    const g = new EnemyGuard(fakeRoll(false));
    expect(g.tryRaise(1, false)).toBe(true);
    expect(g.guarding).toBe(true);
  });

  it('com o Rng da run, chance 0 e chance 1 não consomem o stream (AD-006)', () => {
    const rng = new Rng(7);
    const g = new EnemyGuard(rng);
    g.tryRaise(0, false);
    g.reset();
    g.tryRaise(1, true);
    expect(rng.next()).toBe(new Rng(7).next());
  });

  it('chance entre 0 e 1 sorteia uma vez com essa chance e segue a resposta', () => {
    const yes = fakeRoll(true);
    const up = new EnemyGuard(yes);
    expect(up.tryRaise(0.3, false)).toBe(true);
    expect(yes.asked).toEqual([0.3]);
    expect(up.guarding).toBe(true);
    const no = fakeRoll(false);
    const down = new EnemyGuard(no);
    expect(down.tryRaise(0.3, false)).toBe(false);
    expect(no.asked).toEqual([0.3]);
    expect(down.guarding).toBe(false);
  });

  it('já guardando, não sorteia de novo e não troca o tipo da guarda', () => {
    const roll = fakeRoll(true);
    const g = new EnemyGuard(roll);
    expect(g.tryRaise(0.5, false)).toBe(true);
    expect(g.tryRaise(0.5, true)).toBe(false);
    expect(roll.asked).toEqual([0.5]);
    expect(g.read).toBe(false);
  });

  it('a guarda levantada dura 600 ms: 599 ainda guarda, 600 acabou', () => {
    const g = raised(true);
    g.update(599);
    expect(g.guarding).toBe(true);
    g.update(1);
    expect(g.guarding).toBe(false);
  });

  it('onPlayerLightMove continua funcionando por cima de tryRaise (EBL-01)', () => {
    const roll = fakeRoll(true);
    const g = new EnemyGuard(roll);
    expect(g.onPlayerLightMove(NEAR, 0)).toBe(false);
    expect(roll.asked).toEqual([]);
    expect(g.onPlayerLightMove(NEAR, 1)).toBe(true);
    expect(g.guarding).toBe(true);
    expect(g.read).toBe(false);
  });
});

describe('EnemyGuard: marca de leitura (RDG-06, RDG-07, RDG-08)', () => {
  it('heavy de frente na guarda de leitura: dano 0, +8 de estrutura, bloqueado e a guarda termina', () => {
    const g = raised(true);
    const r = g.resolveHit({ damage: 18, strength: 'heavy', fromFront: true, structureGain: 10 });
    expect(r).toEqual({ damage: 0, structureGain: 8, blocked: true, guardEnded: true });
    expect(g.guarding).toBe(false);
  });

  it('heavy com unblockable passa com o dano cheio e a guarda termina', () => {
    const g = raised(true);
    const r = g.resolveHit({ damage: 24, strength: 'heavy', unblockable: true, fromFront: true, structureGain: 40 });
    expect(r).toEqual({ damage: 24, structureGain: 40, blocked: false, guardEnded: true });
    expect(g.guarding).toBe(false);
  });

  it('light de frente é segurado, soma 8 e a guarda continua', () => {
    const g = raised(true);
    const r = g.resolveHit({ damage: 6, strength: 'light', fromFront: true, structureGain: 4 });
    expect(r).toEqual({ damage: 0, structureGain: 8, blocked: true, guardEnded: false });
    expect(g.guarding).toBe(true);
    expect(g.read).toBe(true);
  });

  it('heavy pelas costas passa com o dano e a estrutura normais, e a guarda de leitura continua', () => {
    const g = raised(true);
    const r = g.resolveHit({ damage: 18, strength: 'heavy', fromFront: false, structureGain: 10 });
    expect(r).toEqual({ damage: 18, structureGain: 10, blocked: false, guardEnded: false });
    expect(g.guarding).toBe(true);
  });

  it('guarda comum (read falso): os resultados de EBL-02 a EBL-05 não mudam', () => {
    const light = raised(false).resolveHit({ damage: 6, strength: 'light', fromFront: true, structureGain: 4 });
    expect(light).toEqual({ damage: 0, structureGain: 8, blocked: true, guardEnded: false });
    const gHeavy = raised(false);
    const heavy = gHeavy.resolveHit({ damage: 12, strength: 'heavy', fromFront: true, structureGain: 10 });
    expect(heavy).toEqual({ damage: 12, structureGain: 10, blocked: false, guardEnded: true });
    expect(gHeavy.guarding).toBe(false);
    const charged = raised(false).resolveHit({
      damage: 24,
      strength: 'heavy',
      unblockable: true,
      fromFront: true,
      structureGain: 40,
    });
    expect(charged).toEqual({ damage: 24, structureGain: 40, blocked: false, guardEnded: true });
  });

  it('read é true só com a guarda de leitura de pé', () => {
    expect(new EnemyGuard(fakeRoll(true)).read).toBe(false);
    expect(raised(false).read).toBe(false);
    expect(raised(true).read).toBe(true);
  });

  it('read volta a false quando a guarda termina por tempo, por golpe forte e por reset()', () => {
    const timed = raised(true);
    timed.update(599);
    expect(timed.read).toBe(true);
    timed.update(1);
    expect(timed.read).toBe(false);
    const broken = raised(true);
    broken.resolveHit({ damage: 18, strength: 'heavy', fromFront: true, structureGain: 10 });
    expect(broken.read).toBe(false);
    const cleared = raised(true);
    cleared.reset();
    expect(cleared.read).toBe(false);
    expect(cleared.guarding).toBe(false);
  });

  it('uma guarda comum levantada depois de uma de leitura não herda a marca', () => {
    const g = raised(true);
    g.update(600);
    expect(g.tryRaise(1, false)).toBe(true);
    expect(g.read).toBe(false);
    const r = g.resolveHit({ damage: 12, strength: 'heavy', fromFront: true, structureGain: 10 });
    expect(r).toEqual({ damage: 12, structureGain: 10, blocked: false, guardEnded: true });
  });
});
