import { describe, expect, it } from 'vitest';
import { RedOrbState } from '../../src/core/redOrb';
import { TECHNIQUES } from '../../src/data/techniques';

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

describe('RED-05: o orbe avança na direção do lançamento a 560 px/s', () => {
  it('depois de 250 ms (140 px a 560 px/s), x andou 140 px na direção do facing', () => {
    const state = new RedOrbState(0, 1);
    state.update(250);
    expect(state.x).toBeCloseTo(140, 1);
  });

  it('com facing -1, x anda para trás', () => {
    const state = new RedOrbState(0, -1);
    state.update(250);
    expect(state.x).toBeCloseTo(-140, 1);
  });
});

describe('RED-06: o toque em um inimigo comum dá 30 de dano forte e impulso para longe do orbe', () => {
  it('primeiro toque devolve o dano e uma direção que se afasta do orbe', () => {
    const state = new RedOrbState(100, 1);
    const hit = state.hitTest({ id: 1, center: { x: 150, y: 0 } }, 0);
    expect(hit).not.toBeNull();
    expect(hit!.damage).toBe(TECHNIQUES.vermelho.damage.hit);
    expect(hit!.damage).toBe(30);
    expect(hit!.direction.x).toBeGreaterThan(0); // alvo à frente do orbe: empurra para a frente
  });

  it('o mesmo alvo não é atingido de novo pelo mesmo orbe', () => {
    const state = new RedOrbState(100, 1);
    state.hitTest({ id: 1, center: { x: 150, y: 0 } }, 0);
    const second = state.hitTest({ id: 1, center: { x: 150, y: 0 } }, 0);
    expect(second).toBeNull();
  });

  it('um alvo diferente ainda pode ser atingido', () => {
    const state = new RedOrbState(100, 1);
    state.hitTest({ id: 1, center: { x: 150, y: 0 } }, 0);
    const other = state.hitTest({ id: 2, center: { x: 150, y: 10 } }, 0);
    expect(other).not.toBeNull();
  });
});

describe('RED-08: o orbe detona ao completar o alcance de 420 px (L-010: 419/420 px)', () => {
  it('a 419 px o orbe ainda não detonou', () => {
    const state = new RedOrbState(0, 1);
    const detonatedNow = state.update((419 / 560) * 1000);
    expect(detonatedNow).toBe(false);
    expect(state.detonated).toBe(false);
    expect(state.traveled).toBeCloseTo(419, 1);
  });

  it('ao completar 420 px o orbe detona nesse frame', () => {
    const state = new RedOrbState(0, 1);
    state.update((419 / 560) * 1000);
    const detonatedNow = state.update((1 / 560) * 1000);
    expect(detonatedNow).toBe(true);
    expect(state.detonated).toBe(true);
    expect(state.traveled).toBeCloseTo(420, 1);
  });

  it('detonate() também marca o orbe como detonado (parede ou chefe)', () => {
    const state = new RedOrbState(0, 1);
    expect(state.detonated).toBe(false);
    state.detonate();
    expect(state.detonated).toBe(true);
  });
});

describe('RED-10: a detonação atinge quem está a até 96 px do ponto (L-010: 95/96/97 px)', () => {
  const point = { x: 0, y: 0 };

  it('a 95 px do ponto: atingido', () => {
    const state = new RedOrbState(0, 1);
    const hits = state.detonationTargets([{ id: 1, center: { x: 95, y: 0 } }], point);
    expect(hits).toHaveLength(1);
    expect(hits[0].damage).toBe(TECHNIQUES.vermelho.damage.detonation);
    expect(hits[0].damage).toBe(25);
  });

  it('a exatamente 96 px do ponto: ainda atingido (raio inclusivo)', () => {
    const state = new RedOrbState(0, 1);
    const hits = state.detonationTargets([{ id: 1, center: { x: 96, y: 0 } }], point);
    expect(hits).toHaveLength(1);
  });

  it('a 97 px do ponto: fora do raio, não atingido', () => {
    const state = new RedOrbState(0, 1);
    const hits = state.detonationTargets([{ id: 1, center: { x: 97, y: 0 } }], point);
    expect(hits).toHaveLength(0);
  });

  it('quem já foi atingido em voo não recebe o dano da detonação de novo', () => {
    const state = new RedOrbState(0, 1);
    state.hitTest({ id: 1, center: { x: 10, y: 0 } }, 0);
    const hits = state.detonationTargets([{ id: 1, center: { x: 10, y: 0 } }], point);
    expect(hits).toHaveLength(0);
  });

  it('o impulso radial aponta para longe do ponto de detonação', () => {
    const state = new RedOrbState(0, 1);
    const hits = state.detonationTargets([{ id: 1, center: { x: -50, y: 0 } }], point);
    expect(hits[0].direction.x).toBeLessThan(0);
  });
});

describe('RED-13: a detonação remove o orbe (marcado detonado) no frame em que acontece', () => {
  it('depois de detonationTargets ou update de alcance, `detonated` reflete o estado do frame', () => {
    const state = new RedOrbState(0, 1);
    state.detonate();
    expect(state.detonated).toBe(true);
  });
});

describe('RED-14: em voo, o orbe expõe a distância percorrida', () => {
  it('traveled começa em 0 e cresce com o voo', () => {
    const state = new RedOrbState(0, 1);
    expect(state.traveled).toBe(0);
    state.update(100);
    expect(state.traveled).toBeCloseTo(56, 1); // 560 px/s * 0,1 s
  });
});
