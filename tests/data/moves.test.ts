import { describe, expect, it } from 'vitest';
import { CHARGE_MS, COUNTER, DEFENSE, DUCK, MOVES, MOVE_WINDOW_MS, type MoveDef } from '../../src/data/moves';
import { MoveMachine } from '../../src/core/moveMachine';
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
      ownerId: 1,
      damage: 1,
      strength: 'light',
      direction: { x: 1, y: 0 },
      force: 1,
      unblockable: true,
      moveName: 'jab',
    };
    expect(hit.unblockable).toBe(true);
    expect(hit.moveName).toBe('jab');
  });
});

describe('limite de alvos por golpe (TGT-01, TGT-02)', () => {
  const ONE_TARGET = ['voadora', 'rasteira', 'contra', 'contraGancho'];

  it('todo golpe light, a voadora, a rasteira, o contra e o contraGancho têm maxTargets 1 (TGT-01)', () => {
    for (const m of Object.values(MOVES)) {
      if (m.strength === 'light' || ONE_TARGET.includes(m.name)) expect(m.maxTargets, m.name).toBe(1);
    }
    for (const name of ONE_TARGET) expect(MOVES[name], name).toBeDefined();
  });

  it('todo outro golpe heavy tem maxTargets 2 (TGT-02)', () => {
    const others = Object.values(MOVES).filter((m) => m.strength === 'heavy' && !ONE_TARGET.includes(m.name));
    expect(others.length).toBeGreaterThan(0);
    for (const m of others) expect(m.maxTargets, m.name).toBe(2);
  });
});

describe('golpes que derrubam (PST-04)', () => {
  it('knockdown é true só em rasteira, ganchoAscendente e palmaExplosiva e ausente nos outros', () => {
    const KNOCKDOWN = ['rasteira', 'ganchoAscendente', 'palmaExplosiva'];
    for (const m of Object.values(MOVES)) {
      if (KNOCKDOWN.includes(m.name)) expect(m.knockdown, m.name).toBe(true);
      else expect(m.knockdown, m.name).toBeUndefined();
    }
  });
});

describe('Contras (CNT-09, CNT-10)', () => {
  it('contra: 10 de dano, heavy, 50/80/160 ms, +30 de estrutura, unblockable e counter', () => {
    expect(MOVES.contra).toMatchObject({
      damage: 10,
      strength: 'heavy',
      startupMs: 50,
      activeMs: 80,
      recoveryMs: 160,
      structureGain: 30,
      unblockable: true,
      counter: true,
    });
  });

  it('contraGancho: 12 de dano, heavy, 50/90/200 ms, +30 de estrutura, unblockable e counter', () => {
    expect(MOVES.contraGancho).toMatchObject({
      damage: 12,
      strength: 'heavy',
      startupMs: 50,
      activeMs: 90,
      recoveryMs: 200,
      structureGain: 30,
      unblockable: true,
      counter: true,
    });
  });

  it('os dois entram por via counter, sem follow-ups, e nenhum outro golpe tem counter', () => {
    expect(MOVES.contra.input).toEqual({ via: 'counter' });
    expect(MOVES.contraGancho.input).toEqual({ via: 'counter' });
    expect(MOVES.contra.followUps).toEqual({});
    expect(MOVES.contraGancho.followUps).toEqual({});
    const withCounter = Object.values(MOVES)
      .filter((m) => m.counter)
      .map((m) => m.name);
    expect(withCounter.sort()).toEqual(['contra', 'contraGancho']);
  });

  it('o contraGancho usa a hitbox do ganchoAscendente e o contra a do punho (FIST, a do jab)', () => {
    expect(MOVES.contraGancho.hitbox).toEqual(MOVES.ganchoAscendente.hitbox);
    expect(MOVES.contra.hitbox).toEqual(MOVES.jab.hitbox);
  });

  it('nenhum golpe tem um Contra em followUps (CNT-08: só a janela inicia o Contra)', () => {
    for (const m of Object.values(MOVES)) {
      for (const target of Object.values(m.followUps))
        expect(MOVES[target as string].counter, `${m.name} -> ${target}`).toBeUndefined();
    }
  });

  it('a MoveMachine nunca escolhe um Contra por botão, direção, ar ou meia-lua (initialMove)', () => {
    const bools = [false, true];
    const started: string[] = [];
    for (const button of ['light', 'heavy'] as const)
      for (const grounded of bools)
        for (const down of bools)
          for (const up of bools)
            for (const forward of bools)
              for (const motion of bools) {
                const m = new MoveMachine();
                for (const e of m.press(button, { grounded, down, up, forward, motion })) {
                  if (e.type === 'moveStart') started.push(e.move.name);
                }
              }
    expect(started.length).toBeGreaterThan(0);
    for (const name of started) expect(MOVES[name].counter, name).toBeUndefined();
  });
});

describe('voadora com custo, quique e erro punível (VOA-01, VOA-04..07, VOA-09)', () => {
  it('postureCost 15, whiffRecoveryMs 460, recoveryMs 160 e bounce { backPx 36, ms 150, vy -240 }', () => {
    expect(MOVES.voadora.postureCost).toBe(15);
    expect(MOVES.voadora.whiffRecoveryMs).toBe(460);
    expect(MOVES.voadora.recoveryMs).toBe(160);
    expect(MOVES.voadora.bounce).toEqual({ backPx: 36, ms: 150, vy: -240 });
  });

  it('só a voadora tem postureCost, whiffRecoveryMs e bounce', () => {
    for (const m of Object.values(MOVES)) {
      if (m.name === 'voadora') continue;
      expect(m.postureCost, m.name).toBeUndefined();
      expect(m.whiffRecoveryMs, m.name).toBeUndefined();
      expect(m.bounce, m.name).toBeUndefined();
    }
  });
});

describe('abaixar e janela de Contra em dados (DEF-07, DEF-15, CNT-01, CNT-04, DFL-11)', () => {
  it('DUCK = 320 ms ativo e recarga de 450 ms', () => {
    expect(DUCK).toEqual({ durationMs: 320, cooldownMs: 450 });
  });

  it('COUNTER = janela de 450 ms, 900 ms na Deflexão e cambaleio de 900 ms', () => {
    expect(COUNTER).toEqual({ windowMs: 450, deflectWindowMs: 900, deflectStaggerMs: 900 });
  });
});

describe('guarda sem andar (DEF-05, substitui GRD-05)', () => {
  it('a velocidade com a guarda de pé vale 0 da de corrida (era 0,4 no GRD-05)', () => {
    expect(DEFENSE.guardSpeedFactor).toBe(0);
  });
});
