import { describe, expect, it } from 'vitest';
import { BlueOrbState, blueOrbSpawn } from '../../src/core/blueOrb';
import { TECHNIQUES } from '../../src/data/techniques';

describe('BLU-02: posição de nascimento, 110 px à frente ou 16 px antes da parede', () => {
  it('sem parede perto (>= 110 px), nasce a 110 px à frente (facing 1)', () => {
    const p = blueOrbSpawn({ x: 0, y: 20 }, 1, 500);
    expect(p).toEqual({ x: 110, y: 20 });
  });

  it('com facing -1, nasce 110 px para trás', () => {
    const p = blueOrbSpawn({ x: 0, y: 20 }, -1, 500);
    expect(p).toEqual({ x: -110, y: 20 });
  });

  it('com parede a 50 px, nasce 16 px antes dela (34 px à frente)', () => {
    const p = blueOrbSpawn({ x: 0, y: 20 }, 1, 50);
    expect(p).toEqual({ x: 34, y: 20 });
  });

  it('com parede a menos de 16 px, a distância não fica negativa', () => {
    const p = blueOrbSpawn({ x: 0, y: 20 }, 1, 10);
    expect(p).toEqual({ x: 0, y: 20 });
  });
});

describe('BLU-03: o orbe termina ao completar 1400 ms de vida', () => {
  it('antes de 1400 ms, não terminou', () => {
    const orb = new BlueOrbState({ x: 0, y: 0 });
    const step = orb.update(1399);
    expect(step.ended).toBe(false);
    expect(orb.ended).toBe(false);
  });

  it('ao completar 1400 ms, termina nesse passo', () => {
    const orb = new BlueOrbState({ x: 0, y: 0 });
    orb.update(1399);
    const step = orb.update(1);
    expect(step.ended).toBe(true);
    expect(orb.ended).toBe(true);
  });
});

describe('BLU-12: a posição do orbe nunca muda enquanto ele existe', () => {
  it('position continua igual à de nascimento depois de update', () => {
    const orb = new BlueOrbState({ x: 42, y: 7 });
    orb.update(500);
    orb.update(500);
    expect(orb.position).toEqual({ x: 42, y: 7 });
  });
});

describe('BLU-04: inimigos comuns a até 130 px são puxados a 150 px/s (L-010: 129/130/131 px)', () => {
  const orb = new BlueOrbState({ x: 0, y: 0 });

  it('a 129 px: puxado', () => {
    const pulls = orb.pullTargets([{ id: 1, center: { x: 129, y: 0 }, kind: 'enemy' }]);
    expect(pulls).toHaveLength(1);
    expect(pulls[0].velocity.x).toBeCloseTo(-150, 1); // puxa para o centro (x=0), então velocidade negativa
  });

  it('a exatamente 130 px: ainda puxado (raio inclusivo)', () => {
    const pulls = orb.pullTargets([{ id: 1, center: { x: 130, y: 0 }, kind: 'enemy' }]);
    expect(pulls).toHaveLength(1);
  });

  it('a 131 px: fora do raio, não puxado', () => {
    const pulls = orb.pullTargets([{ id: 1, center: { x: 131, y: 0 }, kind: 'enemy' }]);
    expect(pulls).toHaveLength(0);
  });

  it('o chefe nunca é puxado (BLU-05), mesmo perto do orbe', () => {
    const pulls = orb.pullTargets([{ id: 1, center: { x: 10, y: 0 }, kind: 'boss' }]);
    expect(pulls).toHaveLength(0);
  });
});

describe('BLU-06: a cada 250 ms de vida, quem está a até 130 px leva 5 de dano leve (5 ticks na vida toda)', () => {
  it('tickTargets dá 5 de dano leve para inimigo e chefe dentro do raio', () => {
    const orb = new BlueOrbState({ x: 0, y: 0 });
    const hits = orb.tickTargets([
      { id: 1, center: { x: 50, y: 0 }, kind: 'enemy' },
      { id: 2, center: { x: 50, y: 0 }, kind: 'boss' },
    ]);
    expect(hits).toEqual([
      { targetId: 1, damage: TECHNIQUES.azul.damage.tick },
      { targetId: 2, damage: TECHNIQUES.azul.damage.tick },
    ]);
    expect(TECHNIQUES.azul.damage.tick).toBe(5);
  });

  it('quem está fora do raio não entra no tick', () => {
    const orb = new BlueOrbState({ x: 0, y: 0 });
    const hits = orb.tickTargets([{ id: 1, center: { x: 300, y: 0 }, kind: 'enemy' }]);
    expect(hits).toHaveLength(0);
  });

  it('ao longo dos 1400 ms de vida, exatamente 5 ticks são sinalizados (250/500/750/1000/1250 ms)', () => {
    const orb = new BlueOrbState({ x: 0, y: 0 });
    let totalTicks = 0;
    for (let i = 0; i < 5; i++) totalTicks += orb.update(250).ticksCrossed;
    expect(totalTicks).toBe(5);
    const last = orb.update(150); // completa 1400 ms
    expect(last.ticksCrossed).toBe(0); // sem 6º tick
    expect(last.ended).toBe(true);
  });
});

describe('BLU-07: ao terminar, quem está a até 130 px do centro leva 10 de dano leve, uma vez', () => {
  it('implosionTargets dá 10 de dano leve para inimigo e chefe dentro do raio', () => {
    const orb = new BlueOrbState({ x: 0, y: 0 });
    const hits = orb.implosionTargets([
      { id: 1, center: { x: 50, y: 0 }, kind: 'enemy' },
      { id: 2, center: { x: 200, y: 0 }, kind: 'boss' },
    ]);
    expect(hits).toEqual([{ targetId: 1, damage: TECHNIQUES.azul.damage.end }]);
    expect(TECHNIQUES.azul.damage.end).toBe(10);
  });
});
