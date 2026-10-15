import { describe, expect, it } from 'vitest';
import { BossAI, type BossAIObservation, type BossAITuning } from '../../src/core/bossAI';
import { BOSS_AFFIX } from '../../src/data/bossAffixes';
import { BOSS } from '../../src/data/tuning';

/** Feixe abrindo as fases 1 e 3 e a Chuva de Fios abrindo a fase 2, só aqui, para chegar neles sem percorrer o ciclo. */
const TUNING: BossAITuning = {
  ...BOSS,
  cycles: {
    1: ['beam', 'charge'],
    2: ['threadRain', 'volley'],
    3: ['beam', 'threadRain', 'charge'],
  },
};

const WARN = BOSS_AFFIX.beam.warnMs; // 800 ms, sem windupMult
const BEAM_ON = BOSS_AFFIX.beam.activeMs; // 250 ms
const RAIN_WINDUP = BOSS.threadRain.windupMs; // 600 ms, sem windupMult
const RAIN_ON = BOSS.threadRain.activeMs; // 200 ms

function obs(extra: Partial<BossAIObservation> = {}): BossAIObservation {
  return {
    selfX: 500,
    playerX: 800,
    blocked: false,
    canAct: true,
    phase: 1,
    spec: { volleyCount: 3, projectileSpeed: 260 },
    ...extra,
  };
}

describe('BossAI: feixe do Sangue Convergente (SNG-02, SNG-03)', () => {
  it('a tuning do chefe leva o aviso e o tempo ativo do afixo', () => {
    expect(BOSS.beam).toEqual(BOSS_AFFIX.beam);
    expect(WARN).toBe(800);
    expect(BEAM_ON).toBe(250);
  });

  it('avisa ao entrar no preparo, com o lado do player; 799 ms ainda avisa, 800 ms abre o feixe', () => {
    const ai = new BossAI(TUNING);
    const start = ai.update(WARN - 1, obs());
    expect(start.state).toBe('windup');
    expect(start.attack).toBe('beam');
    expect(start.events).toEqual([{ type: 'telegraph', attack: 'beam', dir: 1, playerX: 800 }]);

    const on = ai.update(1, obs());
    expect(on.state).toBe('beam');
    expect(on.attack).toBe('beam');
    expect(on.vx).toBe(0);
    expect(on.events).toEqual([{ type: 'strikeOn', attack: 'beam', dir: 1 }]);
  });

  it('o feixe fica aberto 250 ms: 249 ms ainda aberto, 250 ms fecha e descansa', () => {
    const ai = new BossAI(TUNING);
    ai.update(WARN, obs());
    const open = ai.update(BEAM_ON - 1, obs());
    expect(open.state).toBe('beam');
    expect(open.events).toEqual([]);

    const off = ai.update(1, obs());
    expect(off.state).toBe('rest');
    expect(off.attack).toBeNull();
    expect(off.events).toEqual([{ type: 'strikeOff', attack: 'beam' }]);
  });

  it('o windupMult da fase 3 não encurta o aviso: 799 ms ainda avisa, 800 ms abre', () => {
    const ai = new BossAI(TUNING);
    expect(ai.update(WARN - 1, obs({ phase: 3 })).state).toBe('windup');
    expect(ai.update(1, obs({ phase: 3 })).state).toBe('beam');
  });

  it('a direção fica presa no aviso: o player troca de lado e o feixe sai no lado avisado', () => {
    const ai = new BossAI(TUNING);
    const start = ai.update(1, obs({ playerX: 200 }));
    expect(start.events).toEqual([{ type: 'telegraph', attack: 'beam', dir: -1, playerX: 200 }]);
    ai.update(WARN - 2, obs({ playerX: 900 }));
    const on = ai.update(1, obs({ playerX: 900 }));
    expect(on.events).toEqual([{ type: 'strikeOn', attack: 'beam', dir: -1 }]);
  });

  it('um frame longo atravessa aviso e feixe na ordem, sem perder evento', () => {
    const ai = new BossAI(TUNING);
    const out = ai.update(WARN + BEAM_ON, obs());
    expect(out.state).toBe('rest');
    expect(out.events.map((e) => e.type)).toEqual(['telegraph', 'strikeOn', 'strikeOff']);
  });

  it('depois do feixe o ciclo segue: o próximo ataque é a investida, que não avisa', () => {
    const ai = new BossAI(TUNING);
    ai.update(WARN + BEAM_ON, obs());
    const next = ai.update(BOSS.phases[0].restMs, obs());
    expect(next.state).toBe('windup');
    expect(next.attack).toBe('charge');
    expect(next.events).toEqual([]);
  });
});

describe('BossAI: Chuva de Fios (CYC-09, CYC-10)', () => {
  it('marca no X do player ao entrar no preparo; 599 ms ainda prepara, 600 ms abre os fios', () => {
    const ai = new BossAI(TUNING);
    const start = ai.update(RAIN_WINDUP - 1, obs({ phase: 2, playerX: 640 }));
    expect(start.state).toBe('windup');
    expect(start.attack).toBe('threadRain');
    expect(start.events).toEqual([{ type: 'telegraph', attack: 'threadRain', dir: 1, playerX: 640 }]);

    const on = ai.update(1, obs({ phase: 2, playerX: 100 }));
    expect(on.state).toBe('threadRain');
    expect(on.events).toEqual([{ type: 'strikeOn', attack: 'threadRain', dir: 1 }]);
  });

  it('os fios ficam 200 ms: 199 ms ainda abertos, 200 ms fecham e descansa', () => {
    const ai = new BossAI(TUNING);
    ai.update(RAIN_WINDUP, obs({ phase: 2 }));
    expect(ai.update(RAIN_ON - 1, obs({ phase: 2 })).events).toEqual([]);
    const off = ai.update(1, obs({ phase: 2 }));
    expect(off.state).toBe('rest');
    expect(off.events).toEqual([{ type: 'strikeOff', attack: 'threadRain' }]);
  });

  it('o windupMult da fase 3 não encurta o preparo: 599 ms ainda prepara, 600 ms abre', () => {
    const ai = new BossAI(TUNING);
    ai.update(WARN + BEAM_ON, obs({ phase: 3 }));
    ai.update(BOSS.phases[2].restMs, obs({ phase: 3 })); // entra no preparo da chuva
    expect(ai.update(RAIN_WINDUP - 1, obs({ phase: 3 })).state).toBe('windup');
    expect(ai.update(1, obs({ phase: 3 })).state).toBe('threadRain');
  });
});

describe('BossAI: interrupção no feixe e na chuva (edge case, BAI-05)', () => {
  it('no aviso do feixe: só telegraphCancel, nunca strikeOn; o aviso recomeça inteiro', () => {
    const ai = new BossAI(TUNING);
    ai.update(500, obs());
    const cut = ai.update(16, obs({ canAct: false }));
    expect(cut.state).toBe('rest');
    expect(cut.attack).toBeNull();
    expect(cut.events).toEqual([{ type: 'telegraphCancel' }]);

    const again = ai.update(1, obs());
    expect(again.events).toEqual([{ type: 'telegraph', attack: 'beam', dir: 1, playerX: 800 }]);
    const before = ai.update(WARN - 2, obs());
    expect(before.events).toEqual([]);
    expect(before.state).toBe('windup');
  });

  it('no preparo da chuva: só telegraphCancel', () => {
    const ai = new BossAI(TUNING);
    ai.update(300, obs({ phase: 2 }));
    expect(ai.update(16, obs({ phase: 2, canAct: false })).events).toEqual([{ type: 'telegraphCancel' }]);
  });

  it('com o feixe aberto: fecha (strikeOff) e apaga o aviso', () => {
    const ai = new BossAI(TUNING);
    ai.update(WARN + 100, obs());
    expect(ai.update(16, obs({ canAct: false })).events).toEqual([
      { type: 'strikeOff', attack: 'beam' },
      { type: 'telegraphCancel' },
    ]);
  });

  it('parado de novo sem ataque, não repete o cancelamento', () => {
    const ai = new BossAI(TUNING);
    ai.update(500, obs());
    ai.update(16, obs({ canAct: false }));
    expect(ai.update(16, obs({ canAct: false })).events).toEqual([]);
  });
});
