import { describe, expect, it } from 'vitest';
import { EnemyBrain, type EnemyEvent, type EnemyTuning } from '../../src/core/enemyBrain';
import type { Hit } from '../../src/core/hit';

const T: EnemyTuning = { maxHp: 30, hitstunMs: 100, ragdollStunMs: 500, getUpMs: 200, deathRagdollMs: 1000, dissolveMs: 300 };
const light = (damage = 5): Hit => ({ ownerId: 1, damage, strength: 'light', direction: { x: 1, y: 0 }, force: 3 });
const heavy = (damage = 10): Hit => ({ ownerId: 1, damage, strength: 'heavy', direction: { x: 1, y: -0.5 }, force: 9 });
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

  it('golpe forte: ragdoll, atordoado, levanta e volta ao normal', () => {
    const b = new EnemyBrain(T);
    expect(types(b.receiveHit(heavy()))).toEqual(['ragdoll']);
    expect(b.state).toBe('ragdollStun');
    expect(types(b.update(500))).toEqual(['getUp']);
    expect(b.state).toBe('gettingUp');
    expect(types(b.update(200))).toEqual(['recovered']);
    expect(b.state).toBe('idle');
  });

  it('caído leva dano de golpe leve sem reiniciar o tempo no chão', () => {
    const b = new EnemyBrain(T);
    b.receiveHit(heavy());
    b.update(300);
    expect(types(b.receiveHit(light()))).toEqual(['hurtWhileDown']);
    expect(b.hp).toBe(15);
    expect(types(b.update(200))).toEqual(['getUp']);
  });

  it('golpe forte em quem já está caído dá novo impulso e reinicia o tempo no chão', () => {
    const b = new EnemyBrain(T);
    b.receiveHit(heavy(1));
    b.update(300);
    expect(types(b.receiveHit(heavy(1)))).toEqual(['ragdoll']);
    expect(b.update(300)).toEqual([]);
    expect(types(b.update(200))).toEqual(['getUp']);
  });

  it('golpe leve enquanto levanta interrompe e vira reação leve', () => {
    const b = new EnemyBrain(T);
    b.receiveHit(heavy(1));
    b.update(500);
    expect(types(b.receiveHit(light(1)))).toEqual(['hitReaction']);
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
