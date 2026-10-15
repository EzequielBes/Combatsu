import { describe, expect, it } from 'vitest';
import {
  RED_ORB_SPEED,
  RedOrbState,
  redGeometry,
  redOrbConfig,
  redReleaseEffects,
  repulseTargets,
  repulseTargetsFor,
} from '../../src/core/redOrb';
import { axisAt } from '../../src/core/axisRule';
import { Loadout } from '../../src/core/loadout';
import { RED_BASE, resolveTechStats } from '../../src/core/techStats';
import { RED_AXES } from '../../src/data/techAxes';
import { TECHNIQUES } from '../../src/data/techniques';
import { equipRed } from './redLevel';

/** O orbe do Vermelho Nv 1 sem multiplicadores, como o adaptador o constrói na soltura (TST-02). */
const RED_LV1 = redOrbConfig(resolveTechStats({ id: 'vermelho', level: 1, damageMul: 1, vowDamageMul: 1, costMul: 1 }));

describe('RED-02: o frame do núcleo do orbe segue o terço da carga', () => {
  const chargeMs = TECHNIQUES.vermelho.chargeMs; // 350 ms

  it('no 1º terço (0 a <116,67 ms) o frame é o de 4 texels', () => {
    expect(RedOrbState.chargeFrame(0, chargeMs)).toBe(4);
    expect(RedOrbState.chargeFrame(100, chargeMs)).toBe(4);
  });

  it('no 2º terço (116,67 a <233,33 ms) o frame é o de 8 texels', () => {
    expect(RedOrbState.chargeFrame(200, chargeMs)).toBe(8);
  });

  it('no último terço (233,33 ms em diante) o frame é o de 12 texels', () => {
    expect(RedOrbState.chargeFrame(300, chargeMs)).toBe(12);
    expect(RedOrbState.chargeFrame(chargeMs, chargeMs)).toBe(12);
  });
});

describe('RED-05, RDA-11: o orbe avança na direção do lançamento a 760 px/s', () => {
  it('depois de 250 ms (190 px a 760 px/s), x andou 190 px na direção do facing', () => {
    const state = new RedOrbState(0, 1, RED_LV1);
    state.update(250);
    expect(state.x).toBeCloseTo(190, 1);
  });

  it('com facing -1, x anda para trás', () => {
    const state = new RedOrbState(0, -1, RED_LV1);
    state.update(250);
    expect(state.x).toBeCloseTo(-190, 1);
  });
});

describe('RED-06: o toque em um inimigo comum dá 30 de dano forte e impulso para longe do orbe', () => {
  it('primeiro toque devolve o dano e uma direção que se afasta do orbe', () => {
    const state = new RedOrbState(100, 1, RED_LV1);
    const hit = state.hitTest({ id: 1, center: { x: 150, y: 0 } }, 0);
    expect(hit).not.toBeNull();
    expect(hit!.damage).toBe(TECHNIQUES.vermelho.damage.hit);
    expect(hit!.damage).toBe(30);
    expect(hit!.direction.x).toBeGreaterThan(0); // alvo à frente do orbe: empurra para a frente
  });

  it('o mesmo alvo não é atingido de novo pelo mesmo orbe', () => {
    const state = new RedOrbState(100, 1, RED_LV1);
    state.hitTest({ id: 1, center: { x: 150, y: 0 } }, 0);
    const second = state.hitTest({ id: 1, center: { x: 150, y: 0 } }, 0);
    expect(second).toBeNull();
  });

  it('um alvo diferente ainda pode ser atingido', () => {
    const state = new RedOrbState(100, 1, RED_LV1);
    state.hitTest({ id: 1, center: { x: 150, y: 0 } }, 0);
    const other = state.hitTest({ id: 2, center: { x: 150, y: 10 } }, 0);
    expect(other).not.toBeNull();
  });
});

describe('RED-08: o orbe detona ao completar o alcance de 320 px (VRM-09, era 420; L-010: 319/320 px)', () => {
  it('a 319 px o orbe ainda não detonou', () => {
    const state = new RedOrbState(0, 1, RED_LV1);
    const detonatedNow = state.update((319 / 760) * 1000);
    expect(detonatedNow).toBe(false);
    expect(state.detonated).toBe(false);
    expect(state.traveled).toBeCloseTo(319, 1);
  });

  it('ao completar 320 px o orbe detona nesse frame', () => {
    const state = new RedOrbState(0, 1, RED_LV1);
    state.update((319 / 760) * 1000);
    const detonatedNow = state.update((1 / 760) * 1000);
    expect(detonatedNow).toBe(true);
    expect(state.detonated).toBe(true);
    expect(state.traveled).toBeCloseTo(320, 1);
  });

  it('detonate() também marca o orbe como detonado (parede ou chefe)', () => {
    const state = new RedOrbState(0, 1, RED_LV1);
    expect(state.detonated).toBe(false);
    state.detonate();
    expect(state.detonated).toBe(true);
  });
});

describe('RED-10: a detonação atinge quem está a até 96 px do ponto (L-010: 95/96/97 px)', () => {
  const point = { x: 0, y: 0 };

  it('a 95 px do ponto: atingido', () => {
    const state = new RedOrbState(0, 1, RED_LV1);
    const hits = state.detonationTargets([{ id: 1, center: { x: 95, y: 0 } }], point);
    expect(hits).toHaveLength(1);
    expect(hits[0].damage).toBe(TECHNIQUES.vermelho.damage.detonation);
    expect(hits[0].damage).toBe(25);
  });

  it('a exatamente 96 px do ponto: ainda atingido (raio inclusivo)', () => {
    const state = new RedOrbState(0, 1, RED_LV1);
    const hits = state.detonationTargets([{ id: 1, center: { x: 96, y: 0 } }], point);
    expect(hits).toHaveLength(1);
  });

  it('a 97 px do ponto: fora do raio, não atingido', () => {
    const state = new RedOrbState(0, 1, RED_LV1);
    const hits = state.detonationTargets([{ id: 1, center: { x: 97, y: 0 } }], point);
    expect(hits).toHaveLength(0);
  });

  it('quem já foi atingido em voo não recebe o dano da detonação de novo', () => {
    const state = new RedOrbState(0, 1, RED_LV1);
    state.hitTest({ id: 1, center: { x: 10, y: 0 } }, 0);
    const hits = state.detonationTargets([{ id: 1, center: { x: 10, y: 0 } }], point);
    expect(hits).toHaveLength(0);
  });

  it('o impulso radial aponta para longe do ponto de detonação', () => {
    const state = new RedOrbState(0, 1, RED_LV1);
    const hits = state.detonationTargets([{ id: 1, center: { x: -50, y: 0 } }], point);
    expect(hits[0].direction.x).toBeLessThan(0);
  });
});

describe('RED-13: a detonação remove o orbe (marcado detonado) no frame em que acontece', () => {
  it('depois de detonationTargets ou update de alcance, `detonated` reflete o estado do frame', () => {
    const state = new RedOrbState(0, 1, RED_LV1);
    state.detonate();
    expect(state.detonated).toBe(true);
  });
});

describe('RED-14: em voo, o orbe expõe a distância percorrida', () => {
  it('traveled começa em 0 e cresce com o voo', () => {
    const state = new RedOrbState(0, 1, RED_LV1);
    expect(state.traveled).toBe(0);
    state.update(100);
    expect(state.traveled).toBeCloseTo(76, 1); // 760 px/s * 0,1 s (RDA-11)
  });
});

describe('RDA-11: o orbe percorre 760 px em 1000 ms de voo livre', () => {
  it('a velocidade exportada é 760 px/s', () => {
    expect(RED_ORB_SPEED).toBe(760);
  });

  it('com um alcance maior que o do orbe, 1000 ms rendem 760 px (a 100 ms: 76 px)', () => {
    const state = new RedOrbState(0, 1, RED_LV1);
    state.update(100);
    expect(state.traveled).toBeCloseTo(76, 5);
    expect(state.traveled / 0.1).toBeCloseTo(760, 3);
  });

  it('os 320 px de alcance (VRM-09) terminam em ~421 ms', () => {
    const state = new RedOrbState(0, 1, RED_LV1);
    expect(state.update(420)).toBe(false);
    expect(state.update(2)).toBe(true);
  });
});

describe('RDA-08, RDA-09, EDG-03: repulseTargets na soltura', () => {
  const origin = { x: 100, y: 200 };
  const at = (id: number, dx: number, dy = 0) => ({ id, center: { x: origin.x + dx, y: origin.y + dy } });

  it('um alvo a 80 px à frente entra e um a 81 px não (L-010)', () => {
    expect(repulseTargets(origin, 1, [at(1, 80)]).map((h) => h.targetId)).toEqual([1]);
    expect(repulseTargets(origin, 1, [at(2, 81)])).toEqual([]);
  });

  it('um alvo com |dy| de 48 entra e um com 49 não, acima ou abaixo', () => {
    expect(repulseTargets(origin, 1, [at(1, 40, 48)])).toHaveLength(1);
    expect(repulseTargets(origin, 1, [at(2, 40, -48)])).toHaveLength(1);
    expect(repulseTargets(origin, 1, [at(3, 40, 49)])).toEqual([]);
    expect(repulseTargets(origin, 1, [at(4, 40, -49)])).toEqual([]);
  });

  it('um alvo atrás do player não entra, nos dois sentidos de facing', () => {
    expect(repulseTargets(origin, 1, [at(1, -30)])).toEqual([]);
    expect(repulseTargets(origin, -1, [at(2, 30)])).toEqual([]);
  });

  it('com facing -1, quem está à esquerda a até 80 px entra', () => {
    expect(repulseTargets(origin, -1, [at(1, -80), at(2, -81)]).map((h) => h.targetId)).toEqual([1]);
  });

  it('um alvo com dx = 0 não entra', () => {
    expect(repulseTargets(origin, 1, [at(1, 0, 10)])).toEqual([]);
    expect(repulseTargets(origin, -1, [at(2, 0, 10)])).toEqual([]);
  });

  it('o hit é { damage: 4, strength: light, force: 10 } com direção normalizada para longe do player', () => {
    const [hit] = repulseTargets(origin, 1, [at(7, 30, 40)]);
    expect(hit).toMatchObject({ targetId: 7, damage: 4, strength: 'light', force: 10 });
    expect(hit.direction.x).toBeCloseTo(0.6, 5);
    expect(hit.direction.y).toBeCloseTo(0.8, 5);
    const [left] = repulseTargets(origin, -1, [at(8, -30, 0)]);
    expect(left.direction).toEqual({ x: -1, y: 0 });
  });

  it('cada alvo da lista vira um hit, na ordem; lista vazia não gera hit', () => {
    expect(repulseTargets(origin, 1, [at(1, 10), at(2, 20), at(3, 200)]).map((h) => h.targetId)).toEqual([1, 2]);
    expect(repulseTargets(origin, 1, [])).toEqual([]);
  });
});

describe('EDG-03: repulseTargetsFor exclui o chefe', () => {
  const origin = { x: 100, y: 200 };
  const cand = (id: number, kind: 'enemy' | 'boss', dx: number) => ({
    id,
    kind,
    center: { x: origin.x + dx, y: origin.y },
  });

  it('o chefe colado à frente não entra; o inimigo comum ao lado dele entra', () => {
    const hits = repulseTargetsFor(origin, 1, [cand(1, 'boss', 10), cand(2, 'enemy', 40)]);
    expect(hits.map((h) => h.targetId)).toEqual([2]);
  });

  it('só o chefe à frente gera lista vazia', () => {
    expect(repulseTargetsFor(origin, 1, [cand(1, 'boss', 10)])).toEqual([]);
  });

  it('inimigos comuns seguem as regras de alcance e lado de repulseTargets', () => {
    expect(
      repulseTargetsFor(origin, 1, [cand(1, 'enemy', 80), cand(2, 'enemy', 81), cand(3, 'enemy', -30)]).map(
        (h) => h.targetId,
      ),
    ).toEqual([1]);
  });
});

describe('EDG-02, RED-15: redReleaseEffects', () => {
  it('no chão repele e recua 12 px', () => {
    expect(redReleaseEffects({ grounded: true })).toEqual({ repulse: true, pushPx: 12 });
  });

  it('no ar repele igual e não recua', () => {
    expect(redReleaseEffects({ grounded: false })).toEqual({ repulse: true, pushPx: 0 });
  });
});

describe('TST-02: o orbe lê voo, raio e danos do RedOrbConfig tirado do TechStats', () => {
  it('Nv 1 sem multiplicadores dá os números de hoje: 760 px/s, 320 px, raio 96, toque 30, detonação 25', () => {
    expect(RED_LV1).toEqual({ speed: 760, rangePx: 320, radius: 96, touch: 30, detonation: 25 });
  });

  it('o dano já vem escalado como o Loadout.damage (Nv 3 = Potência 2, Rosário 1,35 e voto 1,35)', () => {
    const loadout = new Loadout();
    equipRed(loadout, 0, 3);
    loadout.damageMul = 1.35;
    loadout.vowDamageMul = 1.35;
    const config = redOrbConfig(loadout.stats('vermelho'));
    expect(config.touch).toBe(loadout.damage('vermelho', axisAt(RED_AXES.potencia.touch, 2)));
    expect(config.detonation).toBe(loadout.damage('vermelho', axisAt(RED_AXES.potencia.detonation, 2)));
    expect(config.touch).toBeGreaterThan(30);
  });

  it('redGeometry devolve o red do stat e, sem ele, o Vermelho sem ponto (VRM-01)', () => {
    const red = resolveTechStats({ id: 'vermelho', level: 1, damageMul: 1, vowDamageMul: 1, costMul: 1 });
    expect(redGeometry(red)).toBe(red.red);
    const blue = resolveTechStats({ id: 'azul', level: 1, damageMul: 1, vowDamageMul: 1, costMul: 1 });
    expect(redGeometry(blue)).toBe(RED_BASE);
  });

  const wide = { speed: 380, rangePx: 320, radius: 120, touch: 40, detonation: 33 };

  it('raio 120 do config: 119 e 120 px entram, 121 não (L-010), com a detonação 33 do config', () => {
    const at = (x: number) =>
      new RedOrbState(0, 1, wide).detonationTargets([{ id: 1, center: { x, y: 0 } }], { x: 0, y: 0 });
    expect(at(119).map((h) => h.damage)).toEqual([33]);
    expect(at(120)).toHaveLength(1);
    expect(at(121)).toEqual([]);
  });

  it('toque com o dano do config (40) e voo na velocidade e no alcance dele (380 px/s, 320 px)', () => {
    const state = new RedOrbState(0, 1, wide);
    expect(state.hitTest({ id: 1, center: { x: 10, y: 0 } }, 0)?.damage).toBe(40);
    state.update(250);
    expect(state.x).toBeCloseTo(95, 5);
    expect(state.update((224 / 380) * 1000)).toBe(false);
    expect(state.update((2 / 380) * 1000)).toBe(true);
    expect(state.traveled).toBeCloseTo(320, 5);
  });
});
