import { describe, expect, it } from 'vitest';
import { Health } from '../../src/core/health';
import { PLAYER_HEALTH } from '../../src/data/tuning';

describe('Health: sem respawn com respawnMs Infinity (RUN-03)', () => {
  it('depois de morrer e somar 1 000 000 ms, continua morto e nunca emite respawn', () => {
    const h = new Health({ ...PLAYER_HEALTH, respawnMs: Infinity });
    h.receive(PLAYER_HEALTH.maxHp);
    expect(h.dead).toBe(true);
    const events = h.update(1_000_000);
    expect(events).not.toContain('respawn');
    expect(h.dead).toBe(true);
  });
});

describe('Health.reset() (RUN-02, RUN-05)', () => {
  it('depois de morto: hp = maxHp, dead = false, sem invulnerabilidade nem atordoamento', () => {
    const h = new Health(PLAYER_HEALTH);
    h.receive(PLAYER_HEALTH.maxHp);
    expect(h.dead).toBe(true);
    h.reset();
    expect(h.hp).toBe(PLAYER_HEALTH.maxHp);
    expect(h.dead).toBe(false);
    expect(h.invulnerable).toBe(false);
    expect(h.staggered).toBe(false);
  });

  it('com hp parcial e invulnerável: hp = maxHp e invulnerable = false', () => {
    const h = new Health(PLAYER_HEALTH);
    h.receive(10);
    expect(h.hp).toBe(PLAYER_HEALTH.maxHp - 10);
    expect(h.invulnerable).toBe(true);
    h.reset();
    expect(h.hp).toBe(PLAYER_HEALTH.maxHp);
    expect(h.invulnerable).toBe(false);
  });

  it('não deixa um respawn pendente disparar depois do reset', () => {
    const h = new Health(PLAYER_HEALTH);
    h.receive(PLAYER_HEALTH.maxHp);
    h.reset();
    const events = h.update(PLAYER_HEALTH.respawnMs);
    expect(events).not.toContain('respawn');
    expect(h.dead).toBe(false);
    expect(h.hp).toBe(PLAYER_HEALTH.maxHp);
  });
});
