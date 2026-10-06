import { describe, expect, it } from 'vitest';
import { ReverseCursed, type ReverseInput, type ReverseStep } from '../../src/core/reverseCursed';
import { REVERSE_CURSED } from '../../src/data/techniques';

const t = { warmupMs: 250, hpPerSec: 12, energyPerHp: 2 };

const input = (over: Partial<ReverseInput> = {}): ReverseInput => ({
  held: true,
  canChannel: true,
  hp: 40,
  maxHp: 100,
  energy: 100,
  ...over,
});

/** Simula `ms` em frames de 16 ms aplicando cura e gasto, como a cena faz. */
function channel(r: ReverseCursed, ms: number, start: ReverseInput) {
  const s = { ...start };
  let healed = 0;
  let spent = 0;
  const events: string[] = [];
  for (let left = ms; left > 0; left -= 16) {
    const step: ReverseStep = r.update(Math.min(16, left), s);
    s.hp += step.heal;
    s.energy -= step.spend;
    healed += step.heal;
    spent += step.spend;
    events.push(...step.events);
  }
  return { healed, spent, events, state: s };
}

describe('ReverseCursed (RCT-01..09)', () => {
  it('RCT-01: segurar a tecla com vida faltando e energia começa a canalizar', () => {
    const r = new ReverseCursed(t);
    expect(r.update(16, input()).events).toEqual(['rctStart']);
    expect(r.active).toBe(true);
  });

  it('RCT-02: nada cura durante a concentração', () => {
    const r = new ReverseCursed(t);
    expect(channel(r, 240, input()).healed).toBe(0);
    expect(r.healing).toBe(false);
  });

  it('RCT-02: depois da concentração cura hpPerSec por segundo', () => {
    const r = new ReverseCursed(t);
    channel(r, 256, input());
    expect(channel(r, 1000, input()).healed).toBe(12);
  });

  it('RCT-03: gasta sempre o dobro em energia do que cura', () => {
    const r = new ReverseCursed(t);
    const { healed, spent } = channel(r, 3000, input());
    expect(healed).toBeGreaterThan(0);
    expect(spent).toBe(healed * 2);
  });

  it('RCT-04: soltar a tecla para', () => {
    const r = new ReverseCursed(t);
    channel(r, 500, input());
    expect(r.update(16, input({ held: false })).events).toEqual(['rctStop']);
    expect(r.active).toBe(false);
  });

  it('RCT-04: para na vida cheia, sem curar além do teto', () => {
    const r = new ReverseCursed(t);
    const { state, events } = channel(r, 5000, input({ hp: 95 }));
    expect(state.hp).toBe(100);
    expect(events).toContain('rctStop');
    expect(r.active).toBe(false);
  });

  it('RCT-04: para quando a energia acaba, sem gastar além do que tem', () => {
    const r = new ReverseCursed(t);
    const { state, healed } = channel(r, 10000, input({ hp: 10, energy: 21 }));
    expect(healed).toBe(10);
    expect(state.energy).toBe(1);
    expect(r.active).toBe(false);
  });

  it('RCT-04: o player ficar ocupado (golpe, conjuração, atordoamento) para', () => {
    const r = new ReverseCursed(t);
    channel(r, 400, input());
    expect(r.update(16, input({ canChannel: false })).events).toEqual(['rctStop']);
  });

  it('RCT-07: levar dano corta na hora e a próxima canalização recomeça a concentração', () => {
    const r = new ReverseCursed(t);
    channel(r, 600, input());
    expect(r.interrupt()).toEqual(['rctStop']);
    expect(r.interrupt()).toEqual([]);
    expect(channel(r, 240, input()).healed).toBe(0);
  });

  it('RCT-08: sem energia para 1 HP não começa e avisa só no aperto', () => {
    const r = new ReverseCursed(t);
    expect(r.update(16, input({ energy: 1 })).events).toEqual(['rctDenied']);
    expect(r.update(16, input({ energy: 1 })).events).toEqual([]);
    expect(r.active).toBe(false);
  });

  it('RCT-09: vida cheia ou player ocupado não começa', () => {
    const r = new ReverseCursed(t);
    expect(r.update(16, input({ hp: 100 })).events).toEqual([]);
    expect(r.update(16, input({ canChannel: false })).events).toEqual([]);
    expect(r.active).toBe(false);
  });

  it('tuning do jogo: a cura custa o dobro em energia', () => {
    expect(REVERSE_CURSED.energyPerHp).toBe(2);
  });
});
