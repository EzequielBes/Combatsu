import { describe, expect, it } from 'vitest';
import { inCone, speak, speechStats, type SpeechBuild, type SpeechTarget } from '../../src/core/cursedSpeech';
import type { SpeechAxisId, SpeechBranchId } from '../../src/data/cursedSpeech';

const ZERO: Record<SpeechAxisId, number> = { alcance: 0, atordoamento: 0, vida: 0, cone: 0, eficiencia: 0, recarga: 0 };
const build = (
  axes: Partial<Record<SpeechAxisId, number>> = {},
  branch: SpeechBranchId | null = null,
): SpeechBuild => ({
  axes: { ...ZERO, ...axes },
  branch,
});

const ORIGIN = { x: 0, y: 0 };
const tgt = (id: number, x: number, y = 0, kind: 'enemy' | 'boss' = 'enemy', maxHp = 100): SpeechTarget => ({
  id,
  kind,
  center: { x, y },
  maxHp,
});
const cast = (b: SpeechBuild, targets: SpeechTarget[], hp = 100) =>
  speak(speechStats(b), { origin: ORIGIN, facing: 1, hp, targets });

describe('FAL-01: números base', () => {
  it('alcance 140, atordoa 600 (chefe 150), vida 8, cone 30°, custo 25, recarga 4000', () => {
    expect(speechStats(build())).toMatchObject({
      level: 1,
      rangePx: 140,
      stunMs: 600,
      bossStunMs: 150,
      hpCost: 8,
      coneDeg: 30,
      cost: 25,
      cooldownMs: 4000,
      branch: null,
      awakened: false,
    });
  });
});

describe('FAL-02: cada eixo no 3', () => {
  it.each([
    ['alcance', { rangePx: 260 }],
    ['atordoamento', { stunMs: 1200, bossStunMs: 300 }],
    ['vida', { hpCost: 2 }],
    ['cone', { coneDeg: 60 }],
    ['eficiencia', { cost: 15 }],
    ['recarga', { cooldownMs: 2200 }],
  ] as const)('%s', (axis, expected) => {
    expect(speechStats(build({ [axis]: 3 }))).toMatchObject({ level: 4, ...expected });
  });
});

describe('FAL-03: o cone', () => {
  it('à frente, no alcance e dentro da metade da abertura (bordas inclusas)', () => {
    const edge = { x: 100 * Math.cos(Math.PI / 12), y: 100 * Math.sin(Math.PI / 12) }; // 15°
    expect(inCone(ORIGIN, 1, 140, 30, edge)).toBe(true);
    expect(inCone(ORIGIN, 1, 140, 30, { x: 100, y: 30 })).toBe(false); // ≈16,7°
    expect(inCone(ORIGIN, 1, 140, 60, { x: 100, y: 30 })).toBe(true);
    expect(inCone(ORIGIN, 1, 140, 30, { x: 140, y: 0 })).toBe(true);
    expect(inCone(ORIGIN, 1, 140, 30, { x: 141, y: 0 })).toBe(false);
    // dentro da abertura (≈24,8°) e com dx no alcance, mas a distância (≈143) passa de 140
    expect(inCone(ORIGIN, 1, 140, 60, { x: 130, y: 60 })).toBe(false);
  });

  it('o alvo no mesmo ponto do player (dx = 0) fica de fora', () => {
    expect(inCone(ORIGIN, 1, 140, 60, ORIGIN)).toBe(false);
  });

  it('atrás ou na mesma linha vertical fica de fora; olhando para a esquerda, vale à esquerda', () => {
    expect(inCone(ORIGIN, 1, 140, 60, { x: -50, y: 0 })).toBe(false);
    expect(inCone(ORIGIN, 1, 140, 60, { x: 0, y: -10 })).toBe(false);
    expect(inCone(ORIGIN, -1, 140, 60, { x: -50, y: 0 })).toBe(true);
  });

  it('a fala atordoa quem está no cone, do mais perto ao mais longe; o chefe atordoa 150', () => {
    const r = cast(build(), [tgt(1, 120), tgt(2, 60, 0, 'boss'), tgt(3, 60, 60), tgt(4, -30)]);
    expect(r.ok && r.hits).toEqual([
      {
        targetId: 2,
        kind: 'boss',
        stunMs: 150,
        damage: 0,
        knockdown: false,
        force: 0,
        direction: { x: 1, y: 0 },
        band: 'normal',
      },
      {
        targetId: 1,
        kind: 'enemy',
        stunMs: 600,
        damage: 0,
        knockdown: false,
        force: 0,
        direction: { x: 1, y: 0 },
        band: 'normal',
      },
    ]);
    expect(r.ok && { hpCost: r.hpCost, cost: r.cost }).toEqual({ hpCost: 8, cost: 25 });
  });
});

describe('FAL-04: custo em vida', () => {
  it('vida igual ao custo recusa, com a energia de volta; um acima passa', () => {
    expect(cast(build(), [tgt(1, 60)], 8)).toEqual({ ok: false, reason: 'hp', refund: 25 });
    expect(cast(build(), [tgt(1, 60)], 9).ok).toBe(true);
    expect(cast(build({ vida: 3 }), [tgt(1, 60)], 3).ok).toBe(true);
  });
});

describe('FAL-05: "Exploda"', () => {
  it('cada atordoado toma 20', () => {
    const r = cast(build({ alcance: 1 }, 'exploda'), [tgt(1, 60), tgt(2, 170, 0, 'boss')]);
    expect(r.ok && r.hits.map((h) => [h.targetId, h.damage, h.knockdown])).toEqual([
      [1, 20, false],
      [2, 20, false],
    ]);
  });
});

describe('FAL-06: "Volte"', () => {
  it('empurra para longe com força 9 e derruba o comum; o chefe só recua (força 2,7)', () => {
    const r = cast(build({ cone: 3 }, 'volte'), [tgt(1, 60, 30), tgt(2, 100, 0, 'boss')]);
    expect(r.ok && r.hits[0]).toMatchObject({ targetId: 1, knockdown: true, force: 9, damage: 0 });
    expect(r.ok && r.hits[0].direction.x).toBeCloseTo(2 / Math.sqrt(5));
    expect(r.ok && r.hits[1]).toMatchObject({ targetId: 2, knockdown: false, stunMs: 150 });
    expect(r.ok && r.hits[1].force).toBeCloseTo(2.7);
  });
});

describe('FAL-07: Exploda em Cadeia (Despertar do "Exploda")', () => {
  const awake = build({ alcance: 3, atordoamento: 1 }, 'exploda');

  it('o atordoado que morre explode: vizinhos a até 70 px atordoam 300 (chefe 75) e tomam 4% (chefe 1%)', () => {
    const r = cast(awake, [tgt(1, 60)]);
    if (!r.ok) throw new Error('recusou');
    expect(r.cast.isStunned(1)).toBe(true);
    const living = [tgt(2, 120), tgt(3, 60, 70, 'boss', 1000), tgt(4, 200), tgt(5, 60, -71)]; // 5 a 71 px
    expect(r.cast.onTargetDied({ id: 1, center: { x: 60, y: 0 } }, living)).toEqual({
      center: { x: 60, y: 0 },
      hits: [
        { targetId: 2, stunMs: 300, damage: 4, knockdown: false, band: 'micro' },
        { targetId: 3, stunMs: 75, damage: 10, knockdown: false, band: 'micro' },
      ],
    });
  });

  it('a cadeia segue pelo vizinho atordoado, e o componente sai uma vez por alvo', () => {
    const r = cast(awake, [tgt(1, 60)]);
    if (!r.ok) throw new Error('recusou');
    r.cast.onTargetDied({ id: 1, center: { x: 60, y: 0 } }, [tgt(2, 120), tgt(5, 110)]);
    const next = r.cast.onTargetDied({ id: 2, center: { x: 120, y: 0 } }, [tgt(5, 110)]);
    expect(next?.hits).toEqual([{ targetId: 5, stunMs: 300, damage: 0, knockdown: false, band: 'micro' }]);
  });

  it('quem morre depois do atordoamento acabar não explode', () => {
    const r = cast(awake, [tgt(1, 60)]);
    if (!r.ok) throw new Error('recusou');
    r.cast.update(800);
    expect(r.cast.isStunned(1)).toBe(false);
    expect(r.cast.onTargetDied({ id: 1, center: { x: 60, y: 0 } }, [tgt(2, 100)])).toBeNull();
  });

  it('sem o Despertar (Nv 4) não explode', () => {
    const r = cast(build({ alcance: 3 }, 'exploda'), [tgt(1, 60)]);
    if (!r.ok) throw new Error('recusou');
    expect(r.cast.onTargetDied({ id: 1, center: { x: 60, y: 0 } }, [tgt(2, 100)])).toBeNull();
  });
});

describe('FAL-08: Esmague (Despertar do "Volte")', () => {
  const awake = build({ alcance: 3, vida: 1 }, 'volte');

  it('o empurrado que bate em outro corpo toma 4% e os dois caem; uma vez só', () => {
    const r = cast(awake, [tgt(1, 60, 0, 'enemy', 200)]);
    if (!r.ok) throw new Error('recusou');
    expect(r.cast.onPushedImpact(tgt(1, 60, 0, 'enemy', 200), tgt(9, 90))).toEqual([
      { targetId: 1, stunMs: 0, damage: 8, knockdown: true, band: 'micro' },
      { targetId: 9, stunMs: 0, damage: 0, knockdown: true, band: 'micro' },
    ]);
    expect(r.cast.onPushedImpact(tgt(1, 60, 0, 'enemy', 200), 'wall')).toBeNull();
  });

  it('o empurrado que bate no chefe cai; o chefe não cai nem toma o componente', () => {
    const r = cast(awake, [tgt(1, 60)]);
    if (!r.ok) throw new Error('recusou');
    expect(r.cast.onPushedImpact(tgt(1, 60), tgt(9, 90, 0, 'boss', 3000))).toEqual([
      { targetId: 1, stunMs: 0, damage: 4, knockdown: true, band: 'micro' },
      { targetId: 9, stunMs: 0, damage: 0, knockdown: false, band: 'micro' },
    ]);
  });

  it('o chefe na parede toma 1% e não cai', () => {
    const boss = tgt(2, 100, 0, 'boss', 3000);
    const r = cast(awake, [boss]);
    if (!r.ok) throw new Error('recusou');
    expect(r.cast.onPushedImpact(boss, 'wall')).toEqual([
      { targetId: 2, stunMs: 0, damage: 30, knockdown: false, band: 'micro' },
    ]);
  });

  it('fora da janela de 800 ms, quem não foi empurrado, ou sem o Despertar: nada', () => {
    const r = cast(awake, [tgt(1, 60)]);
    if (!r.ok) throw new Error('recusou');
    expect(r.cast.onPushedImpact(tgt(7, 60), 'wall')).toBeNull();
    r.cast.update(801);
    expect(r.cast.onPushedImpact(tgt(1, 60), 'wall')).toBeNull();
    const edge = cast(awake, [tgt(1, 60)]);
    if (!edge.ok) throw new Error('recusou');
    edge.cast.update(800);
    expect(edge.cast.onPushedImpact(tgt(1, 60), 'wall')).toHaveLength(1); // 800 ms ainda vale
    const s = cast(build({ alcance: 3 }, 'volte'), [tgt(1, 60)]);
    if (!s.ok) throw new Error('recusou');
    expect(s.cast.onPushedImpact(tgt(1, 60), 'wall')).toBeNull();
  });
});

describe('FAL-09: linha de visão', () => {
  it('quem está atrás de parede (sem linha de visão) fica fora da fala', () => {
    const lineOfSight = (_from: unknown, to: { x: number }): boolean => to.x < 80;
    const r = speak(speechStats(build()), {
      origin: ORIGIN,
      facing: 1,
      hp: 100,
      targets: [tgt(1, 60), tgt(2, 100)],
      lineOfSight,
    });
    expect(r.ok && r.hits.map((h) => h.targetId)).toEqual([1]);
  });
});

describe('TRL-06: abate com Recarga no 3 devolve 30% da recarga, uma vez por fala', () => {
  it('2200 → 660 no 1º abate, 0 nos seguintes; sem o teto, 0', () => {
    const r = cast(build({ recarga: 3 }, null), [tgt(1, 60)]);
    if (!r.ok) throw new Error('recusou');
    expect(r.cast.claimKillRefund()).toBe(660);
    expect(r.cast.claimKillRefund()).toBe(0);
    const s = cast(build({ recarga: 2 }), [tgt(1, 60)]);
    if (!s.ok) throw new Error('recusou');
    expect(s.cast.claimKillRefund()).toBe(0);
  });
});
