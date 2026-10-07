import { describe, expect, it } from 'vitest';
import { HealthRegen, regenCap, roundClearHeal } from '../../src/core/healthRegen';
import { PLAYER_REGEN } from '../../src/data/tuning';

const t = { delayMs: 4000, perSec: 2, capFraction: 0.6, roundClearFraction: 0.2 };

/** Avança `ms` em frames de 16 ms e devolve o total curado. */
function run(r: HealthRegen, ms: number, hp: number, maxHp = 100, dead = false): number {
  let healed = 0;
  for (let left = ms; left > 0; left -= 16) healed += r.update(Math.min(16, left), hp + healed, maxHp, dead);
  return healed;
}

describe('HealthRegen (REG-01..04)', () => {
  it('REG-01: nada antes do atraso sem dano', () => {
    const r = new HealthRegen(t);
    expect(run(r, 3984, 20)).toBe(0);
  });

  it('REG-01: depois do atraso cura perSec HP por segundo, só em HP inteiros', () => {
    const r = new HealthRegen(t);
    run(r, 4000, 20);
    expect(run(r, 1000, 20)).toBe(2);
    expect(Number.isInteger(r.update(16, 22, 100, false))).toBe(true);
  });

  it('REG-02: levar dano recomeça a espera', () => {
    const r = new HealthRegen(t);
    run(r, 5000, 20);
    r.hurt();
    expect(run(r, 3000, 20)).toBe(0);
  });

  it('REG-03: para no teto de capFraction do hp máximo e não passa dele', () => {
    const r = new HealthRegen(t);
    expect(run(r, 60000, 55)).toBe(regenCap(100, t) - 55);
    expect(run(r, 5000, 60)).toBe(0);
    expect(run(r, 5000, 80)).toBe(0);
  });

  it('REG-03: o teto acompanha o hp máximo comprado na loja', () => {
    expect(regenCap(175, t)).toBe(105);
  });

  it('REG-04: morto não cura e conta como dano', () => {
    const r = new HealthRegen(t);
    run(r, 5000, 20);
    expect(r.update(16, 0, 100, true)).toBe(0);
    expect(run(r, 3000, 20)).toBe(0);
  });

  it('REG-05: a cura de fim de rodada é uma fatia do hp máximo', () => {
    expect(roundClearHeal(100, t)).toBe(20);
    expect(roundClearHeal(175, t)).toBe(35);
  });

  it('tuning do jogo: regenera devagar e para antes da vida cheia', () => {
    expect(PLAYER_REGEN.capFraction).toBeLessThan(1);
    expect(PLAYER_REGEN.perSec).toBeLessThanOrEqual(5);
  });
});
