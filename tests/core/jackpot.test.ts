import { describe, expect, it, vi } from 'vitest';
import { JackpotState, guaranteed, jackpotChance, reelFaces, shownChance } from '../../src/core/jackpot';

const missN = (s: JackpotState, n: number): void => {
  for (let i = 0; i < n; i++) {
    s.startSpin();
    s.stop(1, () => 0.99);
  }
};

/** Anda `totalMs` em passos de `stepMs` e soma os tiques. */
const ticksOver = (s: JackpotState, totalMs: number, stepMs: number): number => {
  let ticks = 0;
  for (let t = 0; t < totalMs; t += stepMs) ticks += s.tickEffect(Math.min(stepMs, totalMs - t));
  return ticks;
};

describe('jackpotChance (JAC-02)', () => {
  it('Nv 1: 0,33 com 0 golpes, 0,37 com 1, 0,57 com 6', () => {
    expect(jackpotChance({ level: 1, strikes: 0, jackpotsWon: 0 })).toBe(0.33);
    expect(jackpotChance({ level: 1, strikes: 1, jackpotsWon: 0 })).toBe(0.37);
    expect(jackpotChance({ level: 1, strikes: 6, jackpotsWon: 0 })).toBe(0.57);
  });

  it('Nv 2: 0,40 com 0 golpes; 7 golpes batem no teto de 0,60; 4 dão 0,56, abaixo do teto', () => {
    expect(jackpotChance({ level: 2, strikes: 0, jackpotsWon: 0 })).toBe(0.4);
    expect(jackpotChance({ level: 2, strikes: 4, jackpotsWon: 0 })).toBe(0.56);
    expect(jackpotChance({ level: 2, strikes: 7, jackpotsWon: 0 })).toBe(0.6);
  });

  it('Nv 3 soma 0,05 por jackpot ganho; Nv 2 não soma', () => {
    expect(jackpotChance({ level: 3, strikes: 0, jackpotsWon: 2 })).toBe(0.5);
    expect(jackpotChance({ level: 2, strikes: 0, jackpotsWon: 2 })).toBe(0.4);
  });

  it('o teto vale para a soma do bônus e do Riichi', () => {
    expect(jackpotChance({ level: 3, strikes: 3, jackpotsWon: 2 })).toBe(0.6);
    expect(jackpotChance({ level: 3, strikes: 2, jackpotsWon: 2 })).toBe(0.58);
  });
});

describe('JackpotState: Riichi e parada (JAC-01, JAC-03)', () => {
  it('onStrike fora do giro não soma; no giro soma um por golpe', () => {
    const s = new JackpotState();
    s.onStrike();
    expect(s.strikes).toBe(0);
    s.startSpin();
    expect(s.phase).toBe('spin');
    s.onStrike();
    s.onStrike();
    expect(s.strikes).toBe(2);
    s.stop(1, () => 0.99);
    s.onStrike();
    expect(s.strikes).toBe(2);
  });

  it('draw abaixo da chance dá jackpot; igual à chance dá falha', () => {
    const a = new JackpotState();
    a.startSpin();
    a.onStrike();
    expect(a.stop(1, () => 0.369999)).toBe('jackpot');
    expect(a.phase).toBe('jackpot');
    const b = new JackpotState();
    b.startSpin();
    b.onStrike();
    expect(b.stop(1, () => 0.37)).toBe('miss');
    expect(b.phase).toBe('miss');
  });

  it('jackpot arma 8000 ms de efeito; falha arma 4000 ms', () => {
    const s = new JackpotState();
    s.startSpin();
    s.stop(1, () => 0);
    expect(s.effectMs).toBe(8000);
    s.startSpin();
    s.stop(1, () => 0.99);
    expect(s.effectMs).toBe(4000);
  });
});

describe('Piedade (JAC-03.5)', () => {
  it('com 2 falhas seguidas a 3ª parada é jackpot e o draw não é chamado', () => {
    const s = new JackpotState();
    missN(s, 2);
    expect(s.misses).toBe(2);
    const draw = vi.fn(() => 0.99);
    s.startSpin();
    expect(s.stop(1, draw)).toBe('jackpot');
    expect(draw).not.toHaveBeenCalled();
  });

  it('com 1 falha o draw é chamado e decide', () => {
    const s = new JackpotState();
    missN(s, 1);
    const draw = vi.fn(() => 0.99);
    s.startSpin();
    expect(s.stop(1, draw)).toBe('miss');
    expect(draw).toHaveBeenCalledTimes(1);
  });

  it('o jackpot zera misses e soma jackpotsWon; reset zera os dois', () => {
    const s = new JackpotState();
    missN(s, 1);
    s.startSpin();
    s.stop(1, () => 0);
    expect(s.misses).toBe(0);
    expect(s.jackpotsWon).toBe(1);
    missN(s, 1);
    expect(s.misses).toBe(1);
    s.reset();
    expect(s.misses).toBe(0);
    expect(s.jackpotsWon).toBe(0);
    expect(s.phase).toBe('idle');
  });
});

describe('tickEffect (JAC-04, JAC-05)', () => {
  it('40 tiques em 8000 ms de jackpot em passos de 16 ms', () => {
    const s = new JackpotState();
    s.startSpin();
    s.stop(1, () => 0);
    expect(ticksOver(s, 8000, 16)).toBe(40);
    expect(s.effectMs).toBe(0);
  });

  it('10 tiques em 4000 ms de falha em passos de 16 ms', () => {
    const s = new JackpotState();
    s.startSpin();
    s.stop(1, () => 0.99);
    expect(ticksOver(s, 4000, 16)).toBe(10);
  });

  it('o resto fica guardado entre passos: 199 ms não cura, 1 ms a mais cura um', () => {
    const s = new JackpotState();
    s.startSpin();
    s.stop(1, () => 0);
    expect(s.tickEffect(199)).toBe(0);
    expect(s.tickEffect(1)).toBe(1);
  });

  it('passar do fim do efeito não cura além dele; no giro não cura', () => {
    const s = new JackpotState();
    s.startSpin();
    expect(s.tickEffect(1000)).toBe(0);
    s.stop(1, () => 0.99);
    expect(ticksOver(s, 6000, 16)).toBe(10);
  });
});

describe('abort e endEffect (edge cases)', () => {
  it('abort no giro volta a idle sem resultado e sem mudar misses', () => {
    const s = new JackpotState();
    missN(s, 1);
    s.startSpin();
    s.onStrike();
    s.abort();
    expect(s.phase).toBe('idle');
    expect(s.misses).toBe(1);
    expect(s.jackpotsWon).toBe(0);
    expect(s.strikes).toBe(0);
  });

  it('endEffect encerra o efeito e guarda misses e jackpotsWon', () => {
    const s = new JackpotState();
    s.startSpin();
    s.stop(1, () => 0);
    s.endEffect();
    expect(s.phase).toBe('idle');
    expect(s.effectMs).toBe(0);
    expect(s.tickEffect(1000)).toBe(0);
    expect(s.jackpotsWon).toBe(1);
  });
});

describe('reelFaces (JAC-06)', () => {
  it('três iguais no jackpot', () => {
    const [a, b, c] = reelFaces('jackpot', 0);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('pelo menos um diferente na falha, para qualquer contagem de falhas', () => {
    for (const misses of [0, 1, 2, 3, 7]) {
      const faces = reelFaces('miss', misses);
      expect(new Set(faces).size).toBeGreaterThan(1);
    }
  });

  it('determinístico: mesma entrada, mesmas faces', () => {
    expect(reelFaces('miss', 1)).toEqual(reelFaces('miss', 1));
  });
});

describe('shownChance e guaranteed (JAC-06.11)', () => {
  it('com 2 falhas seguidas mostra 1 e guaranteed verdadeiro', () => {
    const s = new JackpotState();
    missN(s, 2);
    s.startSpin();
    expect(shownChance(s, 1)).toBe(1);
    expect(guaranteed(s)).toBe(true);
  });

  it('com 1 falha mostra a chance do jackpotChance e guaranteed falso', () => {
    const s = new JackpotState();
    missN(s, 1);
    s.startSpin();
    s.onStrike();
    expect(shownChance(s, 2)).toBe(jackpotChance({ level: 2, strikes: 1, jackpotsWon: 0 }));
    expect(shownChance(s, 2)).toBe(0.44);
    expect(guaranteed(s)).toBe(false);
  });
});
