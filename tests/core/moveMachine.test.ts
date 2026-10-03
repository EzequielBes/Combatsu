import { describe, expect, it } from 'vitest';
import { MoveMachine, moveTravelAt, type MoveContext, type MoveEvent } from '../../src/core/moveMachine';
import { MOVES } from '../../src/data/moves';

const GROUND: MoveContext = { grounded: true, down: false, up: false, forward: false };
const AIR: MoveContext = { ...GROUND, grounded: false };
const starts = (evs: MoveEvent[]): string[] =>
  evs.flatMap((e) => (e.type === 'moveStart' ? [e.move.name] : []));

/** Avança startup → active → recovery do golpe atual (cada `update` cruza uma fase). */
function finishPhases(m: MoveMachine): MoveEvent[] {
  const move = m.def!;
  return [...m.update(move.startupMs), ...m.update(move.activeMs), ...m.update(move.recoveryMs)];
}

describe('golpe inicial por botão, direção e ar (MOV-02, MOV-05..08, MOV-17)', () => {
  const cases: Array<[string, 'light' | 'heavy', Partial<MoveContext>, string]> = [
    ['MOV-02 leve parado', 'light', {}, 'jab'],
    ['MOV-05 forte parado', 'heavy', {}, 'chuteFrontal'],
    ['MOV-06 S + leve', 'light', { down: true }, 'socoBaixo'],
    ['MOV-17 S + forte', 'heavy', { down: true }, 'rasteira'],
    ['MOV-07 W + leve', 'light', { up: true }, 'ganchoAscendente'],
    ['MOV-08 frente + forte', 'heavy', { forward: true }, 'chuteEmpurrao'],
  ];
  for (const [label, button, dir, expected] of cases) {
    it(`${label} inicia ${expected}`, () => {
      const m = new MoveMachine();
      expect(starts(m.press(button, { ...GROUND, ...dir }))).toEqual([expected]);
      expect(m.current).toBe(expected);
    });
  }
});

describe('sem golpe em andamento × com golpe (MOV-02, MOV-13, MOV-18)', () => {
  it('player.move é null antes, o nome durante startup/active/recovery e null depois', () => {
    const m = new MoveMachine();
    expect(m.current).toBeNull();
    m.press('light', GROUND);
    expect(m.current).toBe('jab');
    m.update(MOVES.jab.startupMs);
    expect(m.current).toBe('jab');
    m.update(MOVES.jab.activeMs);
    expect(m.current).toBe('jab');
    m.update(MOVES.jab.recoveryMs);
    expect(m.current).toBeNull();
  });

  it('cada golpe iniciado emite exatamente um moveStart com o nome; apertar durante o golpe não inicia outro', () => {
    const m = new MoveMachine();
    expect(starts(m.press('light', GROUND))).toEqual(['jab']);
    expect(starts(m.press('light', GROUND))).toEqual([]);
    expect(starts(m.press('heavy', GROUND))).toEqual([]);
    expect(m.current).toBe('jab');
  });

  it('liga a hitbox no active e desliga no fim; moveEnd ao sair do golpe', () => {
    const m = new MoveMachine();
    m.press('heavy', GROUND);
    const evs = finishPhases(m);
    expect(evs.map((e) => e.type)).toEqual(['hitboxOn', 'hitboxOff', 'moveEnd']);
  });
});

describe('follow-ups e janela de 260 ms (MOV-03, MOV-04)', () => {
  it('aperto durante a recovery encadeia o follow-up no fim da recovery', () => {
    const m = new MoveMachine();
    m.press('light', GROUND);
    m.update(MOVES.jab.startupMs);
    m.update(MOVES.jab.activeMs);
    expect(m.press('light', GROUND)).toEqual([]);
    expect(m.current).toBe('jab');
    expect(starts(m.update(MOVES.jab.recoveryMs))).toEqual(['direto']);
    expect(m.current).toBe('direto');
  });

  it('aperto antecipado na startup fica no buffer e encadeia no fim da recovery', () => {
    const m = new MoveMachine();
    m.press('light', GROUND);
    m.press('light', GROUND);
    expect(starts(finishPhases(m))).toEqual(['direto']);
  });

  it('aperto 260 ms depois da recovery ainda encadeia; 261 ms não (recomeça no golpe base)', () => {
    const at = (ms: number): string[] => {
      const m = new MoveMachine();
      m.press('light', GROUND);
      finishPhases(m);
      m.update(ms);
      return starts(m.press('light', GROUND));
    };
    expect(at(259)).toEqual(['direto']);
    expect(at(260)).toEqual(['direto']);
    expect(at(261)).toEqual(['jab']);
  });

  it('a janela não conta como golpe em andamento (player.move null)', () => {
    const m = new MoveMachine();
    m.press('light', GROUND);
    finishPhases(m);
    expect(m.phase).toBe('window');
    expect(m.current).toBeNull();
  });

  it('J,J,J,J: jab → direto → gancho → cotovelada', () => {
    const m = new MoveMachine();
    const seq = [...starts(m.press('light', GROUND))];
    for (let i = 0; i < 3; i++) {
      m.press('light', GROUND);
      seq.push(...starts(finishPhases(m)));
    }
    expect(seq).toEqual(['jab', 'direto', 'gancho', 'cotovelada']);
  });

  it('K,K: chuteFrontal → chuteAlto; J,K: jab → joelhada; J,J,K: direto → chuteGiratorio', () => {
    const chain = (buttons: Array<'light' | 'heavy'>): string[] => {
      const m = new MoveMachine();
      const seq = [...starts(m.press(buttons[0], GROUND))];
      for (const b of buttons.slice(1)) {
        m.press(b, GROUND);
        seq.push(...starts(finishPhases(m)));
      }
      return seq;
    };
    expect(chain(['heavy', 'heavy'])).toEqual(['chuteFrontal', 'chuteAlto']);
    expect(chain(['light', 'heavy'])).toEqual(['jab', 'joelhada']);
    expect(chain(['light', 'light', 'heavy'])).toEqual(['jab', 'direto', 'chuteGiratorio']);
  });

  it('depois da cotovelada (sem follow-ups) o golpe termina em idle', () => {
    const m = new MoveMachine();
    m.press('light', GROUND);
    for (let i = 0; i < 3; i++) {
      m.press('light', GROUND);
      finishPhases(m);
    }
    expect(m.current).toBe('cotovelada');
    finishPhases(m);
    expect(m.phase).toBe('idle');
  });
});

describe('chute carregado (MOV-09, MOV-16)', () => {
  it('soltar K com 400 ms dispara o carregado só quando o golpe atual acaba', () => {
    const m = new MoveMachine();
    m.press('heavy', GROUND);
    expect(m.release('heavy', 400, GROUND)).toEqual([]);
    expect(m.current).toBe('chuteFrontal');
    m.update(MOVES.chuteFrontal.startupMs);
    m.update(MOVES.chuteFrontal.activeMs);
    expect(m.current).toBe('chuteFrontal');
    expect(starts(m.update(MOVES.chuteFrontal.recoveryMs))).toEqual(['chuteCarregado']);
    expect(m.current).toBe('chuteCarregado');
  });

  it('soltar K com 399 ms não dispara o carregado', () => {
    const m = new MoveMachine();
    m.press('heavy', GROUND);
    m.release('heavy', 399, GROUND);
    expect(starts(finishPhases(m))).toEqual([]);
    expect(m.current).toBeNull();
  });

  it('com 400 ms, o carregado tem prioridade sobre um follow-up no buffer', () => {
    const m = new MoveMachine();
    m.press('heavy', GROUND);
    m.press('heavy', GROUND);
    m.release('heavy', 400, GROUND);
    expect(starts(finishPhases(m))).toEqual(['chuteCarregado']);
  });

  it('sem golpe em andamento, soltar com 400 ms inicia o carregado na hora', () => {
    const m = new MoveMachine();
    expect(starts(m.release('heavy', 400, GROUND))).toEqual(['chuteCarregado']);
  });

  it('soltar o leve com 400 ms não carrega', () => {
    const m = new MoveMachine();
    expect(m.release('light', 400, GROUND)).toEqual([]);
    expect(m.current).toBeNull();
  });
});

describe('golpes aéreos (AIR-01..04)', () => {
  it('AIR-01: leve no ar sem golpe inicia socoAereo (7 light)', () => {
    const m = new MoveMachine();
    expect(starts(m.press('light', AIR))).toEqual(['socoAereo']);
    expect(m.def!.damage).toBe(7);
    expect(m.def!.strength).toBe('light');
  });

  it('AIR-02: forte no ar inicia voadora (16 heavy) que percorre 120 px (±8) à frente e desce durante o active', () => {
    const m = new MoveMachine();
    expect(starts(m.press('heavy', AIR))).toEqual(['voadora']);
    const move = m.def!;
    expect([move.damage, move.strength]).toEqual([16, 'heavy']);
    const end = moveTravelAt(move, move.activeMs);
    expect(Math.abs(end.forward - 120)).toBeLessThanOrEqual(8);
    expect(end.down).toBeGreaterThan(0);
    expect(moveTravelAt(move, 0)).toEqual({ forward: 0, down: 0 });
    expect(moveTravelAt(move, move.activeMs / 2).forward).toBeCloseTo(60, 5);
  });

  it('AIR-03: S + forte no ar inicia pisao (14 heavy) marcado como queda máxima', () => {
    const m = new MoveMachine();
    expect(starts(m.press('heavy', { ...AIR, down: true }))).toEqual(['pisao']);
    expect(m.def!.damage).toBe(14);
    expect(m.def!.strength).toBe('heavy');
    expect(m.def!.slam).toBe(true);
  });

  it('AIR-04: só um golpe aéreo por pulo; pousar libera o próximo', () => {
    const m = new MoveMachine();
    expect(starts(m.press('light', AIR))).toEqual(['socoAereo']);
    finishPhases(m);
    expect(starts(m.press('heavy', AIR))).toEqual([]);
    expect(starts(m.press('light', AIR))).toEqual([]);
    expect(m.current).toBeNull();
    m.land();
    expect(starts(m.press('heavy', AIR))).toEqual(['voadora']);
  });

  it('AIR-04: apertar no chão também libera o golpe aéreo do próximo pulo', () => {
    const m = new MoveMachine();
    m.press('light', AIR);
    finishPhases(m);
    m.press('light', GROUND);
    finishPhases(m);
    expect(m.press('light', AIR).length).toBeGreaterThan(0);
  });
});

describe('cancelamento (DOD-06 regra)', () => {
  it('só cancela na recovery de golpe que acertou; cancel() encerra o golpe', () => {
    const m = new MoveMachine();
    m.press('light', GROUND);
    m.update(MOVES.jab.startupMs);
    m.update(MOVES.jab.activeMs);
    expect(m.phase).toBe('recovery');
    expect(m.canDodgeCancel).toBe(false);
    m.hitLanded();
    expect(m.canDodgeCancel).toBe(true);
    expect(m.cancel().map((e) => e.type)).toEqual(['moveEnd']);
    expect(m.current).toBeNull();
    expect(m.canDodgeCancel).toBe(false);
  });

  it('cancel() no active desliga a hitbox', () => {
    const m = new MoveMachine();
    m.press('light', GROUND);
    m.update(MOVES.jab.startupMs);
    expect(m.cancel().map((e) => e.type)).toEqual(['hitboxOff', 'moveEnd']);
  });
});

describe('Contra iniciado pela janela (CNT-05, CNT-08)', () => {
  it('startCounter("contra") sem golpe em curso emite moveStart do contra', () => {
    const m = new MoveMachine();
    expect(starts(m.startCounter('contra'))).toEqual(['contra']);
    expect(m.current).toBe('contra');
    expect(m.phase).toBe('startup');
  });

  it('startCounter("contraGancho") também começa o golpe pelo nome', () => {
    const m = new MoveMachine();
    expect(starts(m.startCounter('contraGancho'))).toEqual(['contraGancho']);
    expect(m.def?.name).toBe('contraGancho');
  });

  it('com golpe em curso não faz nada: o golpe segue o mesmo e nenhum evento sai', () => {
    const m = new MoveMachine();
    m.press('light', GROUND);
    expect(m.startCounter('contra')).toEqual([]);
    expect(m.current).toBe('jab');
    m.update(MOVES.jab.startupMs);
    expect(m.startCounter('contra')).toEqual([]);
    expect(m.current).toBe('jab');
  });

  it('CNT-08: press sem contexto de Contra continua dando jab', () => {
    const m = new MoveMachine();
    expect(starts(m.press('light', GROUND))).toEqual(['jab']);
  });
});

describe('endActive encerra a fase active (VOA-04, VOA-09)', () => {
  it('em active emite hitboxOff e a recovery dura recoveryMs (160 ms na voadora)', () => {
    const m = new MoveMachine();
    m.press('heavy', AIR);
    m.update(MOVES.voadora.startupMs);
    expect(m.phase).toBe('active');
    expect(m.endActive().map((e) => e.type)).toEqual(['hitboxOff']);
    expect(m.phase).toBe('recovery');
    m.update(159);
    expect(m.current).toBe('voadora');
    expect(m.update(1).map((e) => e.type)).toEqual(['moveEnd']);
    expect(m.current).toBeNull();
  });

  it('endActive não emite whiff, mesmo sem hitLanded', () => {
    const m = new MoveMachine();
    m.press('heavy', AIR);
    m.update(MOVES.voadora.startupMs);
    expect(m.endActive().some((e) => e.type === 'whiff')).toBe(false);
  });

  it('fora de active não faz nada: em startup, em recovery e sem golpe', () => {
    const m = new MoveMachine();
    expect(m.endActive()).toEqual([]);
    m.press('light', GROUND);
    expect(m.endActive()).toEqual([]);
    expect(m.phase).toBe('startup');
    m.update(MOVES.jab.startupMs);
    m.update(MOVES.jab.activeMs);
    expect(m.phase).toBe('recovery');
    expect(m.endActive()).toEqual([]);
    expect(m.phase).toBe('recovery');
  });

  it('depois do endActive o active não termina de novo: só um hitboxOff no golpe todo', () => {
    const m = new MoveMachine();
    m.press('heavy', AIR);
    m.update(MOVES.voadora.startupMs);
    const evs = [...m.endActive(), ...m.update(MOVES.voadora.recoveryMs)];
    expect(evs.filter((e) => e.type === 'hitboxOff')).toHaveLength(1);
  });
});

describe('recovery de quem erra a voadora (VOA-07, VOA-08, VOA-09)', () => {
  const whiffs = (evs: MoveEvent[]): number => evs.filter((e) => e.type === 'whiff').length;

  it('voadora sem hitLanded: recovery de 460 ms (ainda em golpe em 459 ms) e exatamente um whiff', () => {
    const m = new MoveMachine();
    m.press('heavy', AIR);
    const evs = [...m.update(MOVES.voadora.startupMs), ...m.update(MOVES.voadora.activeMs)];
    expect(m.phase).toBe('recovery');
    expect(whiffs(evs)).toBe(1);
    m.update(459);
    expect(m.current).toBe('voadora');
    expect(m.update(1).map((e) => e.type)).toEqual(['moveEnd']);
    expect(m.current).toBeNull();
  });

  it('o whiff leva o golpe que errou e sai junto do hitboxOff, depois dele', () => {
    const m = new MoveMachine();
    m.press('heavy', AIR);
    m.update(MOVES.voadora.startupMs);
    const evs = m.update(MOVES.voadora.activeMs);
    expect(evs.map((e) => e.type)).toEqual(['hitboxOff', 'whiff']);
    const whiff = evs[1];
    expect(whiff.type === 'whiff' && whiff.move.name).toBe('voadora');
  });

  it('voadora com hitLanded: recovery de 160 ms (ainda em golpe em 159 ms) e nenhum whiff', () => {
    const m = new MoveMachine();
    m.press('heavy', AIR);
    m.update(MOVES.voadora.startupMs);
    m.hitLanded();
    const evs = m.update(MOVES.voadora.activeMs);
    expect(whiffs(evs)).toBe(0);
    m.update(159);
    expect(m.current).toBe('voadora');
    expect(m.update(1).map((e) => e.type)).toEqual(['moveEnd']);
  });

  it('golpe sem whiffRecoveryMs que erra mantém a recovery normal e não emite whiff', () => {
    const m = new MoveMachine();
    m.press('light', GROUND);
    const evs = [...m.update(MOVES.jab.startupMs), ...m.update(MOVES.jab.activeMs)];
    expect(whiffs(evs)).toBe(0);
    m.update(MOVES.jab.recoveryMs - 1);
    expect(m.current).toBe('jab');
    m.update(1);
    expect(m.current).toBeNull();
  });

  it('com um mapa de golpes de tuning diferente (whiffRecoveryMs 300) a recovery de quem erra muda junto', () => {
    const quick = { ...MOVES.voadora, whiffRecoveryMs: 300 };
    const m = new MoveMachine({ ...MOVES, voadora: quick });
    m.press('heavy', AIR);
    m.update(quick.startupMs);
    m.update(quick.activeMs);
    m.update(299);
    expect(m.current).toBe('voadora');
    m.update(1);
    expect(m.current).toBeNull();
  });
});
