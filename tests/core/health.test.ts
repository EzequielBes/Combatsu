import { describe, expect, it } from 'vitest';
import { Health } from '../../src/core/health';
import { PLAYER_HEALTH } from '../../src/data/tuning';

/** Números do spec ("Números de vida e IA"): hp 100, invulnerável 700 ms, atordoado 200 ms, respawn 1000 ms. */
const SPEC = { maxHp: 100, invulnMs: 700, staggerMs: 200, respawnMs: 1000 };
/** Dano do golpe do inimigo no spec. */
const ENEMY_HIT = 12;

describe('tuning real da vida do player (números do spec)', () => {
  it('PLAYER_HEALTH = 100 / 700 / 200 / 1000', () => {
    expect(PLAYER_HEALTH).toEqual(SPEC);
  });
});

describe('Health: dano e invulnerabilidade (HP-01, HP-02)', () => {
  it('começa com hp cheio, vivo, sem invulnerabilidade nem atordoamento', () => {
    const h = new Health(PLAYER_HEALTH);
    expect(h.hp).toBe(100);
    expect(h.max).toBe(100);
    expect(h.dead).toBe(false);
    expect(h.invulnerable).toBe(false);
    expect(h.staggered).toBe(false);
  });

  it('um golpe tira o dano do hp e deixa invulnerável', () => {
    const h = new Health(PLAYER_HEALTH);
    expect(h.receive(ENEMY_HIT)).toBe('hurt');
    expect(h.hp).toBe(88);
    expect(h.invulnerable).toBe(true);
  });

  it('invulnerável por 700 ms: golpes nesse tempo são ignorados, depois voltam a valer', () => {
    const h = new Health(PLAYER_HEALTH);
    h.receive(ENEMY_HIT);
    expect(h.update(699)).not.toContain('invulnEnd');
    expect(h.receive(ENEMY_HIT)).toBe('ignored');
    expect(h.hp).toBe(88);
    expect(h.update(1)).toContain('invulnEnd');
    expect(h.invulnerable).toBe(false);
    expect(h.receive(ENEMY_HIT)).toBe('hurt');
    expect(h.hp).toBe(76);
  });

  it('borda: dois golpes no mesmo frame tiram vida uma vez só', () => {
    const h = new Health(PLAYER_HEALTH);
    expect(h.receive(ENEMY_HIT)).toBe('hurt');
    expect(h.receive(ENEMY_HIT)).toBe('ignored');
    expect(h.hp).toBe(88);
  });
});

describe('Health: atordoamento (HP-03)', () => {
  it('atordoado por 200 ms depois do golpe', () => {
    const h = new Health(PLAYER_HEALTH);
    h.receive(ENEMY_HIT);
    expect(h.staggered).toBe(true);
    expect(h.update(199)).toEqual([]);
    expect(h.staggered).toBe(true);
    expect(h.update(1)).toEqual(['staggerEnd']);
    expect(h.staggered).toBe(false);
    // Ainda invulnerável: o atordoamento é mais curto que a invulnerabilidade.
    expect(h.invulnerable).toBe(true);
  });
});

describe('Health: morte e respawn (HP-04)', () => {
  const kill = (h: Health): void => {
    for (let i = 0; i < 20 && !h.dead; i++) {
      h.receive(ENEMY_HIT);
      h.update(PLAYER_HEALTH.invulnMs);
    }
  };

  it('hp chega a 0: died; renasce com 100 de hp depois de 1000 ms', () => {
    const h = new Health(PLAYER_HEALTH);
    for (let i = 0; i < 8; i++) {
      expect(h.receive(ENEMY_HIT)).toBe('hurt');
      h.update(700);
    }
    expect(h.hp).toBe(4);
    expect(h.receive(ENEMY_HIT)).toBe('died');
    expect(h.hp).toBe(0);
    expect(h.dead).toBe(true);
    expect(h.update(999)).not.toContain('respawn');
    expect(h.dead).toBe(true);
    expect(h.update(1)).toContain('respawn');
    expect(h.dead).toBe(false);
    expect(h.hp).toBe(100);
  });

  it('dano excedente não deixa o hp negativo', () => {
    const h = new Health(PLAYER_HEALTH);
    expect(h.receive(250)).toBe('died');
    expect(h.hp).toBe(0);
  });

  it('morto ignora golpes até renascer', () => {
    const h = new Health(PLAYER_HEALTH);
    kill(h);
    expect(h.receive(ENEMY_HIT)).toBe('ignored');
    expect(h.hp).toBe(0);
  });

  it('depois de renascer volta a levar dano normalmente', () => {
    const h = new Health(PLAYER_HEALTH);
    kill(h);
    h.update(1000);
    expect(h.receive(ENEMY_HIT)).toBe('hurt');
    expect(h.hp).toBe(88);
  });
});
