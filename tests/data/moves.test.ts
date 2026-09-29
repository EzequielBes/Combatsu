import { describe, expect, it } from 'vitest';
import { CHARGE_MS, MOVES, MOVE_WINDOW_MS, type MoveDef } from '../../src/data/moves';
import type { Hit } from '../../src/core/hit';

describe('grafo de golpes em dados (MOV-01)', () => {
  it('cada golpe tem nome igual à chave, dano, força, tempos, hitbox, entrada e follow-ups', () => {
    for (const [key, m] of Object.entries(MOVES)) {
      expect(m.name).toBe(key);
      expect(m.damage).toBeGreaterThan(0);
      expect(['light', 'heavy']).toContain(m.strength);
      expect(m.force).toBeGreaterThan(0);
      expect(m.startupMs).toBeGreaterThan(0);
      expect(m.activeMs).toBeGreaterThan(0);
      expect(m.recoveryMs).toBeGreaterThan(0);
      expect(m.hitbox).toBeDefined();
      expect(m.input.via).toBeDefined();
      expect(m.followUps).toBeDefined();
    }
  });

  it('todo follow-up aponta para um golpe existente', () => {
    for (const m of Object.values(MOVES)) {
      for (const target of Object.values(m.followUps)) expect(MOVES[target as string]).toBeDefined();
    }
  });

  it('há pelo menos 14 golpes distintos (Goals)', () => {
    expect(Object.keys(MOVES).length).toBeGreaterThanOrEqual(14);
  });

  it('janela de encadeamento 260 ms e carregado 400 ms', () => {
    expect(MOVE_WINDOW_MS).toBe(260);
    expect(CHARGE_MS).toBe(400);
  });
});

describe('follow-ups do chão (MOV-04)', () => {
  const next = (name: string, button: 'light' | 'heavy'): string | undefined => MOVES[name].followUps[button];

  it('jab -J-> direto -J-> gancho -J-> cotovelada', () => {
    expect(next('jab', 'light')).toBe('direto');
    expect(next('direto', 'light')).toBe('gancho');
    expect(next('gancho', 'light')).toBe('cotovelada');
  });

  it('chuteFrontal -K-> chuteAlto; jab -K-> joelhada; direto -K-> chuteGiratorio', () => {
    expect(next('chuteFrontal', 'heavy')).toBe('chuteAlto');
    expect(next('jab', 'heavy')).toBe('joelhada');
    expect(next('direto', 'heavy')).toBe('chuteGiratorio');
  });

  it('nenhum outro follow-up existe além dos seis da spec', () => {
    const all = Object.entries(MOVES).flatMap(([n, m]) =>
      Object.entries(m.followUps).map(([b, t]) => `${n}-${b}->${t}`),
    );
    expect(all.sort()).toEqual(
      [
        'jab-light->direto',
        'direto-light->gancho',
        'gancho-light->cotovelada',
        'chuteFrontal-heavy->chuteAlto',
        'jab-heavy->joelhada',
        'direto-heavy->chuteGiratorio',
      ].sort(),
    );
  });
});

describe('dano e força dos golpes do chão (MOV-12)', () => {
  const expected: Record<string, [number, 'light' | 'heavy']> = {
    jab: [6, 'light'],
    direto: [7, 'light'],
    gancho: [9, 'light'],
    cotovelada: [14, 'heavy'],
    chuteFrontal: [12, 'heavy'],
    chuteAlto: [14, 'heavy'],
    joelhada: [12, 'heavy'],
    chuteGiratorio: [18, 'heavy'],
    socoBaixo: [6, 'light'],
    rasteira: [10, 'heavy'],
    ganchoAscendente: [10, 'heavy'],
    chuteEmpurrao: [12, 'heavy'],
    chuteCarregado: [24, 'heavy'],
  };
  for (const [name, [damage, strength]] of Object.entries(expected)) {
    it(`${name} = ${damage} ${strength}`, () => {
      const m: MoveDef = MOVES[name];
      expect(m.damage).toBe(damage);
      expect(m.strength).toBe(strength);
    });
  }
});

describe('golpes aéreos e palma (AIR-01..03, SPC-01)', () => {
  it('socoAereo 7 light, voadora 16 heavy, pisao 14 heavy, palmaExplosiva 20 heavy', () => {
    expect([MOVES.socoAereo.damage, MOVES.socoAereo.strength]).toEqual([7, 'light']);
    expect([MOVES.voadora.damage, MOVES.voadora.strength]).toEqual([16, 'heavy']);
    expect([MOVES.pisao.damage, MOVES.pisao.strength]).toEqual([14, 'heavy']);
    expect([MOVES.palmaExplosiva.damage, MOVES.palmaExplosiva.strength]).toEqual([20, 'heavy']);
  });
});

describe('Hit ganha campos opcionais (T1)', () => {
  it('aceita unblockable e moveName', () => {
    const hit: Hit = {
      ownerId: 1, damage: 1, strength: 'light', direction: { x: 1, y: 0 }, force: 1,
      unblockable: true, moveName: 'jab',
    };
    expect(hit.unblockable).toBe(true);
    expect(hit.moveName).toBe('jab');
  });
});
