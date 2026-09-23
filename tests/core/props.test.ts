import { describe, expect, it } from 'vitest';
import { Filters, collides } from '../../src/core/collision';
import { PROP_BREAK_MS, PropMachine, propHit, validatePropDef, type PropDef } from '../../src/core/props';

const PLAYER = 1;
const ENEMY = 2;
const ENEMY_2 = 3;

const def = (durability: number): PropDef => ({
  key: 'test',
  texture: 'chair',
  mass: 5,
  damage: 10,
  durability,
  throwSpeed: 500,
  knockback: 8,
  socket: 'front',
  debrisColor: 0xffffff,
  tags: [],
});

const held = (durability = 3): PropMachine => {
  const m = new PropMachine(def(durability));
  m.pickUp(PLAYER);
  return m;
};

describe('PropMachine — estados sem hit', () => {
  it('começa em repouso', () => {
    const m = new PropMachine(def(3));
    expect(m.state).toBe('rest');
    expect(m.filter).toEqual(Filters.propRest);
  });

  it('em repouso, segurado ou quebrando nunca bloqueia player nem inimigo', () => {
    const m = new PropMachine(def(1));
    const check = (): void => {
      expect(collides(m.filter, Filters.player)).toBe(false);
      expect(collides(m.filter, Filters.enemy)).toBe(false);
    };
    check(); // rest
    m.pickUp(PLAYER);
    check(); // held
    m.startSwing();
    m.tryHit(ENEMY);
    m.registerImpact(); // durabilidade 1 → quebra
    expect(m.state).toBe('breaking');
    check();
  });

  it('só pega do repouso e guarda quem segura', () => {
    const m = new PropMachine(def(3));
    expect(m.pickUp(PLAYER)).toBe(true);
    expect(m.state).toBe('held');
    expect(m.holderId).toBe(PLAYER);
    expect(m.pickUp(ENEMY)).toBe(false);
    expect(m.holderId).toBe(PLAYER);
  });

  it('largar (inclusive no ar) volta ao repouso sem dono', () => {
    const m = held();
    expect(m.drop()).toBe(true);
    expect(m.state).toBe('rest');
    expect(m.holderId).toBeNull();
    expect(m.drop()).toBe(false);
  });

  it('ações fora de hora são recusadas', () => {
    const m = new PropMachine(def(3));
    expect(m.throw()).toBe(false);
    expect(m.startSwing()).toBe(false);
    expect(m.endSwing()).toBe(false);
    expect(m.registerImpact()).toBe('ignored');
    expect(m.tryHit(ENEMY)).toBe(false);
  });

  it('quem segura sumiu (morreu): objeto cai em repouso', () => {
    const a = held();
    expect(a.holderGone()).toBe(true);
    expect(a.state).toBe('rest');
    const b = held();
    b.startSwing();
    expect(b.holderGone()).toBe(true);
    expect(b.state).toBe('rest');
    expect(b.tryHit(ENEMY)).toBe(false);
  });
});

describe('PropMachine — golpe com objeto na mão', () => {
  it('o dono nunca se acerta e cada alvo toma um acerto por golpe', () => {
    const m = held();
    expect(m.startSwing()).toBe(true);
    expect(m.state).toBe('swing');
    expect(m.ownerId).toBe(PLAYER);
    expect(m.tryHit(PLAYER)).toBe(false);
    expect(m.tryHit(ENEMY)).toBe(true);
    expect(m.tryHit(ENEMY)).toBe(false);
    expect(m.tryHit(ENEMY_2)).toBe(true);
  });

  it('terminar o golpe volta a segurar, e o próximo golpe pode acertar o mesmo alvo', () => {
    const m = held();
    m.startSwing();
    m.tryHit(ENEMY);
    expect(m.endSwing()).toBe(true);
    expect(m.state).toBe('held');
    expect(m.tryHit(ENEMY)).toBe(false);
    m.startSwing();
    expect(m.tryHit(ENEMY)).toBe(true);
  });

  it('impacto abaixo da durabilidade continua na mão', () => {
    const m = held(3);
    m.startSwing();
    expect(m.registerImpact()).toBe('continue');
    expect(m.state).toBe('swing');
    expect(m.impacts).toBe(1);
  });

  it('quebrar durante o golpe solta o holder', () => {
    const m = held(1);
    m.startSwing();
    expect(m.registerImpact()).toBe('broke');
    expect(m.state).toBe('breaking');
    expect(m.holderId).toBeNull();
    expect(m.ownerId).toBeNull();
    expect(m.endSwing()).toBe(false);
  });
});

describe('PropMachine — arremesso', () => {
  it('arremessar solta da mão e mantém o dono para não se acertar', () => {
    const m = held();
    expect(m.throw()).toBe(true);
    expect(m.state).toBe('thrown');
    expect(m.holderId).toBeNull();
    expect(m.ownerId).toBe(PLAYER);
    expect(m.filter).toEqual(Filters.propThrown);
    expect(m.tryHit(PLAYER)).toBe(false);
  });

  it('objeto resistente que bate e não quebra volta ao repouso', () => {
    const m = held(3);
    m.throw();
    expect(m.registerImpact()).toBe('toRest');
    expect(m.state).toBe('rest');
    expect(m.ownerId).toBeNull();
    expect(m.tryHit(ENEMY)).toBe(false);
    expect(m.pickUp(PLAYER)).toBe(true);
  });

  it('todo objeto quebra quando os impactos chegam na durabilidade, e some depois', () => {
    const m = new PropMachine(def(2));
    m.pickUp(PLAYER);
    m.throw();
    expect(m.registerImpact()).toBe('toRest');
    m.pickUp(PLAYER);
    m.throw();
    expect(m.registerImpact()).toBe('broke');
    expect(m.state).toBe('breaking');
    expect(m.filter).toEqual(Filters.propBreaking);
    expect(m.update(PROP_BREAK_MS - 1)).toBe(false);
    expect(m.update(1)).toBe(true);
    expect(m.state).toBe('gone');
    expect(m.update(100)).toBe(false);
  });
});

describe('propHit e validação', () => {
  it('golpe com objeto é sempre forte e usa dano/força do objeto', () => {
    const hit = propHit(def(3), PLAYER, { x: 1, y: 0 });
    expect(hit).toEqual({ ownerId: PLAYER, damage: 10, strength: 'heavy', direction: { x: 1, y: 0 }, force: 8 });
  });

  it('recusa definições inválidas', () => {
    expect(() => validatePropDef(def(0))).toThrow(/durability/);
    expect(() => validatePropDef(def(1.5))).toThrow(/durability/);
    expect(() => validatePropDef({ ...def(1), mass: 0 })).toThrow(/mass/);
    expect(() => validatePropDef({ ...def(1), throwSpeed: 0 })).toThrow(/throwSpeed/);
    expect(() => validatePropDef({ ...def(1), damage: -1 })).toThrow(/damage/);
  });
});
