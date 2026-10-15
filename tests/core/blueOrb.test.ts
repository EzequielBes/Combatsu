import { describe, expect, it } from 'vitest';
import { BlueOrbState, blueOrbConfig, blueOrbSpawn, type BlueOrbConfig } from '../../src/core/blueOrb';
import { Loadout } from '../../src/core/loadout';
import { TECH_GEOMETRY, TECHNIQUES } from '../../src/data/techniques';

/** TST-02: o orbe do Azul no Nv 1, sem multiplicador (os números de hoje). */
const NV1: BlueOrbConfig = blueOrbConfig(new Loadout().stats('azul'));

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
    const orb = new BlueOrbState({ x: 0, y: 0 }, NV1);
    const step = orb.update(1399);
    expect(step.ended).toBe(false);
    expect(orb.ended).toBe(false);
  });

  it('ao completar 1400 ms, termina nesse passo', () => {
    const orb = new BlueOrbState({ x: 0, y: 0 }, NV1);
    orb.update(1399);
    const step = orb.update(1);
    expect(step.ended).toBe(true);
    expect(orb.ended).toBe(true);
  });
});

describe('BLU-12: a posição do orbe nunca muda enquanto ele existe', () => {
  it('position continua igual à de nascimento depois de update', () => {
    const orb = new BlueOrbState({ x: 42, y: 7 }, NV1);
    orb.update(500);
    orb.update(500);
    expect(orb.position).toEqual({ x: 42, y: 7 });
  });
});

describe('BLU-04: inimigos comuns a até 130 px são puxados a 150 px/s (L-010: 129/130/131 px)', () => {
  const orb = new BlueOrbState({ x: 0, y: 0 }, NV1);

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
    const orb = new BlueOrbState({ x: 0, y: 0 }, NV1);
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
    const orb = new BlueOrbState({ x: 0, y: 0 }, NV1);
    const hits = orb.tickTargets([{ id: 1, center: { x: 300, y: 0 }, kind: 'enemy' }]);
    expect(hits).toHaveLength(0);
  });

  it('ao longo dos 1400 ms de vida, exatamente 5 ticks são sinalizados (250/500/750/1000/1250 ms)', () => {
    const orb = new BlueOrbState({ x: 0, y: 0 }, NV1);
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
    const orb = new BlueOrbState({ x: 0, y: 0 }, NV1);
    const hits = orb.implosionTargets([
      { id: 1, center: { x: 50, y: 0 }, kind: 'enemy' },
      { id: 2, center: { x: 200, y: 0 }, kind: 'boss' },
    ]);
    expect(hits).toEqual([{ targetId: 1, damage: TECHNIQUES.azul.damage.end }]);
    expect(TECHNIQUES.azul.damage.end).toBe(10);
  });
});

describe('TST-02: o orbe lê raio, puxada, tempos e danos do stat do nascimento', () => {
  it('o config do Nv 1 é o da tabela, com os danos de hoje', () => {
    const { radius, pullSpeed, tickMs, lifeMs } = TECH_GEOMETRY.azul;
    expect(NV1).toEqual({ radius, pullSpeed, tickMs, lifeMs, tick: 5, end: 10 });
    expect([radius, pullSpeed, tickMs, lifeMs]).toEqual([130, 150, 250, 1400]);
  });

  it('o dano vem escalado como o Loadout.damage: Nv 3 com 1,35 e 1,35', () => {
    const loadout = new Loadout();
    loadout.equip(0, 'azul', 3);
    loadout.damageMul = 1.35;
    loadout.vowDamageMul = 1.35;
    const config = blueOrbConfig(loadout.stats('azul'));
    expect(config.tick).toBe(loadout.damage('azul', TECHNIQUES.azul.damage.tick));
    expect(config.end).toBe(loadout.damage('azul', TECHNIQUES.azul.damage.end));
    const orb = new BlueOrbState({ x: 0, y: 0 }, config);
    expect(orb.tickTargets([{ id: 1, center: { x: 10, y: 0 }, kind: 'enemy' }])[0].damage).toBe(config.tick);
    expect(orb.implosionTargets([{ id: 1, center: { x: 10, y: 0 }, kind: 'boss' }])[0].damage).toBe(config.end);
  });

  it('um raio maior no config vale para puxada, tique e implosão (L-010: 159/160/161 px)', () => {
    const orb = new BlueOrbState({ x: 0, y: 0 }, { ...NV1, radius: 160 });
    const at = (x: number) => [{ id: 1, center: { x, y: 0 }, kind: 'enemy' as const }];
    expect(orb.pullTargets(at(159))).toHaveLength(1);
    expect(orb.pullTargets(at(160))).toHaveLength(1);
    expect(orb.pullTargets(at(161))).toHaveLength(0);
    expect(orb.tickTargets(at(160))).toHaveLength(1);
    expect(orb.implosionTargets(at(161))).toHaveLength(0);
  });

  it('puxada, intervalo e vida do config: 200 px/s, tique a cada 300 ms, 900 ms de vida', () => {
    const orb = new BlueOrbState({ x: 0, y: 0 }, { ...NV1, pullSpeed: 200, tickMs: 300, lifeMs: 900 });
    expect(orb.pullTargets([{ id: 1, center: { x: 50, y: 0 }, kind: 'enemy' }])[0].velocity.x).toBeCloseTo(-200, 5);
    expect(orb.update(299)).toEqual({ ticksCrossed: 0, ended: false });
    expect(orb.update(1)).toEqual({ ticksCrossed: 1, ended: false });
    expect(orb.update(600)).toEqual({ ticksCrossed: 2, ended: true });
  });

  it('o nascimento lê a distância e a folga da geometria passada (sem ela, a da tabela)', () => {
    expect(blueOrbSpawn({ x: 0, y: 0 }, 1, 500, { aheadPx: 140, wallMarginPx: 20 })).toEqual({ x: 140, y: 0 });
    expect(blueOrbSpawn({ x: 0, y: 0 }, 1, 100, { aheadPx: 140, wallMarginPx: 20 })).toEqual({ x: 80, y: 0 });
  });
});
