import { describe, expect, it } from 'vitest';
import { Filters, collides, ragdollFilter } from '../../src/core/collision';

const ALL_FILTERS = Object.entries(Filters);
const rag = ragdollFilter(-1);

describe('filtros de colisão', () => {
  it('objeto em repouso nunca bloqueia player, inimigo ou ragdoll', () => {
    expect(collides(Filters.propRest, Filters.player)).toBe(false);
    expect(collides(Filters.propRest, Filters.enemy)).toBe(false);
    expect(collides(Filters.propRest, rag)).toBe(false);
  });

  it('objeto em repouso colide com terreno e com outros objetos em repouso', () => {
    expect(collides(Filters.propRest, Filters.terrain)).toBe(true);
    expect(collides(Filters.propRest, Filters.propRest)).toBe(true);
  });

  it('objeto segurado, quebrando e corpo escondido não colidem com nada', () => {
    for (const [name, f] of ALL_FILTERS) {
      expect(collides(Filters.propHeld, f), `propHeld x ${name}`).toBe(false);
      expect(collides(Filters.propBreaking, f), `propBreaking x ${name}`).toBe(false);
      expect(collides(Filters.hidden, f), `hidden x ${name}`).toBe(false);
    }
  });

  it('objeto arremessado detecta terreno e personagens, mas não outros objetos', () => {
    expect(collides(Filters.propThrown, Filters.terrain)).toBe(true);
    expect(collides(Filters.propThrown, Filters.player)).toBe(true);
    expect(collides(Filters.propThrown, Filters.enemy)).toBe(true);
    expect(collides(Filters.propThrown, rag)).toBe(true);
    expect(collides(Filters.propThrown, Filters.propRest)).toBe(false);
  });

  it('hitbox de soco e objeto em golpe acertam personagens e ragdoll, mas ignoram terreno', () => {
    for (const f of [Filters.hitbox, Filters.propSwing]) {
      expect(collides(f, Filters.enemy)).toBe(true);
      expect(collides(f, Filters.player)).toBe(true);
      expect(collides(f, rag)).toBe(true);
      expect(collides(f, Filters.terrain)).toBe(false);
      expect(collides(f, Filters.propRest)).toBe(false);
    }
  });

  it('player e inimigo atravessam um ao outro e pisam no terreno', () => {
    expect(collides(Filters.player, Filters.enemy)).toBe(false);
    expect(collides(Filters.player, Filters.terrain)).toBe(true);
    expect(collides(Filters.enemy, Filters.terrain)).toBe(true);
  });

  it('partes do mesmo ragdoll não colidem entre si, mas colidem com o terreno', () => {
    expect(collides(rag, rag)).toBe(false);
    expect(collides(rag, Filters.terrain)).toBe(true);
    expect(() => ragdollFilter(1)).toThrow();
    expect(() => ragdollFilter(0)).toThrow();
  });
});
