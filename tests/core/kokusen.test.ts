import { describe, expect, it } from 'vitest';
import { Kokusen } from '../../src/core/kokusen';
import { CursedEnergy } from '../../src/core/energy';
import { Run } from '../../src/core/run';
import { KOKUSEN } from '../../src/data/techniques';
import { RUN, WAVE } from '../../src/data/tuning';

function armed(): Kokusen {
  const k = new Kokusen();
  k.startAttempt();
  k.armFirstImpact();
  return k;
}

describe('KOK-01: fora da zona, a janela abre de 120 a 200 ms (L-010)', () => {
  it('119 ms: fechada', () => {
    expect(new Kokusen().windowOpen(119)).toBe(false);
  });
  it('120 ms: aberta', () => {
    expect(new Kokusen().windowOpen(120)).toBe(true);
  });
  it('200 ms: ainda aberta', () => {
    expect(new Kokusen().windowOpen(200)).toBe(true);
  });
  it('201 ms: já fechada (L-010)', () => {
    expect(new Kokusen().windowOpen(201)).toBe(false);
  });
});

describe('KOK-02: na zona, a janela abre de 60 a 200 ms (L-010)', () => {
  it('59 ms na zona: fechada', () => {
    const k = new Kokusen();
    k.land(new CursedEnergy());
    expect(k.windowOpen(59)).toBe(false);
  });
  it('60 ms na zona: aberta', () => {
    const k = new Kokusen();
    k.land(new CursedEnergy());
    expect(k.windowOpen(60)).toBe(true);
  });
});

describe('KOK-05: antes do 1º impacto, a tecla não conta (ignored)', () => {
  it('press antes de armFirstImpact devolve ignored, mesmo dentro da janela', () => {
    const k = new Kokusen();
    k.startAttempt();
    expect(k.press(150)).toBe('ignored');
  });
});

describe('KOK-03: dentro da janela, sem trava, a tecla vira hit', () => {
  it('press aos 150 ms (dentro de 120-200) devolve hit', () => {
    const k = armed();
    expect(k.press(150)).toBe('hit');
  });
});

describe('KOK-04: depois do 1º impacto e antes da janela, a tecla vira miss e trava a tentativa', () => {
  it('press aos 80 ms (antes de 120) devolve miss', () => {
    const k = armed();
    expect(k.press(80)).toBe('miss');
  });

  it('depois de um miss, um novo press dentro da janela continua miss (trava)', () => {
    const k = armed();
    k.press(80); // miss, trava
    expect(k.press(150)).toBe('miss');
  });

  it('depois de um hit, um novo press também não conta mais (trava)', () => {
    const k = armed();
    k.press(150); // hit, trava
    expect(k.press(160)).toBe('miss');
  });
});

describe('KOK-09: um Kokusen soma 30 de energia, com teto no máximo', () => {
  it('de 60 para 90', () => {
    const energy = new CursedEnergy();
    energy.trySpend(40); // 100 -> 60
    const k = new Kokusen();
    k.land(energy);
    expect(energy.cur).toBe(90);
  });

  it('não passa do teto (max 100)', () => {
    const energy = new CursedEnergy();
    energy.trySpend(10); // 100 -> 90
    const k = new Kokusen();
    k.land(energy);
    expect(energy.cur).toBe(100);
  });
});

describe('KOK-10: um Kokusen abre a zona em 8000 ms', () => {
  it('zoneMs vira 8000 e zone vira true', () => {
    const k = new Kokusen();
    k.land(new CursedEnergy());
    expect(k.zoneMs).toBe(8000);
    expect(k.zone).toBe(true);
  });
});

describe('KOK-30: um Kokusen soma 1 ao streak', () => {
  it('streak sobe de 0 para 1, e de 1 para 2 num segundo Kokusen', () => {
    const k = new Kokusen();
    k.land(new CursedEnergy());
    expect(k.streak).toBe(1);
    k.land(new CursedEnergy());
    expect(k.streak).toBe(2);
  });
});

describe('KOK-11: a zona fecha quando zoneMs chega a 0 (L-010: 7999/8000 ms)', () => {
  it('aos 7999 ms de tick a zona ainda está ativa', () => {
    const k = new Kokusen();
    k.land(new CursedEnergy());
    k.tick(7999);
    expect(k.zone).toBe(true);
    expect(k.zoneMs).toBe(1);
  });

  it('ao completar 8000 ms de tick a zona fecha', () => {
    const k = new Kokusen();
    k.land(new CursedEnergy());
    k.tick(8000);
    expect(k.zone).toBe(false);
    expect(k.zoneMs).toBe(0);
  });
});

describe('KOK-31: quando a zona fecha, o streak zera', () => {
  it('streak volta a 0 no frame em que a zona expira', () => {
    const k = new Kokusen();
    k.land(new CursedEnergy());
    k.land(new CursedEnergy());
    expect(k.streak).toBe(2);
    k.tick(8000);
    expect(k.streak).toBe(0);
  });

  it('enquanto a zona segue ativa, o streak não é afetado pelo tick', () => {
    const k = new Kokusen();
    k.land(new CursedEnergy());
    k.tick(5000);
    expect(k.streak).toBe(1);
  });
});

describe('sorteio por cast: o tempo até o 2º impacto e a largura da janela mudam de um golpe para o outro', () => {
  /** Devolve os valores dados, em ordem (o 1º sorteio é o tempo, o 2º a largura). */
  const rolls =
    (...values: number[]) =>
    (): number =>
      values.shift() ?? 0;

  it('sem sorteio vale a janela de base: 2º impacto aos 200 ms, janela de 120 a 200', () => {
    const k = new Kokusen();
    k.startAttempt();
    expect(k.delayMs).toBe(200);
    expect(k.windowOpen(119)).toBe(false);
    expect(k.windowOpen(120)).toBe(true);
  });

  it('o sorteio 0 dá o golpe mais rápido e a janela mais estreita; o 1, o mais lento e a mais larga', () => {
    const k = new Kokusen();
    k.startAttempt(rolls(0, 0));
    expect(k.delayMs).toBe(KOKUSEN.delayMs.min);
    expect(k.windowOpen(KOKUSEN.delayMs.min - KOKUSEN.windowMs.min - 1)).toBe(false);
    expect(k.windowOpen(KOKUSEN.delayMs.min - KOKUSEN.windowMs.min)).toBe(true);
    k.startAttempt(rolls(1, 1));
    expect(k.delayMs).toBe(KOKUSEN.delayMs.max);
    expect(k.windowOpen(KOKUSEN.delayMs.max - KOKUSEN.windowMs.max)).toBe(true);
    expect(k.windowOpen(KOKUSEN.delayMs.max + 1)).toBe(false);
  });

  it('a janela sempre termina no 2º impacto, que é quando o anel fecha', () => {
    for (const r of [0, 0.25, 0.5, 0.75, 1]) {
      const k = new Kokusen();
      k.startAttempt(rolls(r, 1 - r));
      expect(k.windowOpen(k.delayMs)).toBe(true);
      expect(k.windowOpen(k.delayMs + 1)).toBe(false);
    }
  });

  it('nenhum instante fixo acerta todos os golpes: o mais rápido já fechou quando o mais lento abre', () => {
    const fast = new Kokusen();
    fast.startAttempt(rolls(0, 1));
    const slow = new Kokusen();
    slow.startAttempt(rolls(1, 1));
    for (let t = 0; t <= KOKUSEN.delayMs.max; t++) expect(fast.windowOpen(t) && slow.windowOpen(t), `${t}`).toBe(false);
  });

  it('na zona a janela sorteada abre 60 ms mais cedo e termina no mesmo instante', () => {
    const k = new Kokusen();
    k.land(new CursedEnergy());
    k.startAttempt(rolls(0.5, 0.5));
    const width = Math.round((KOKUSEN.windowMs.min + KOKUSEN.windowMs.max) / 2);
    expect(k.windowOpen(k.delayMs - width - 60)).toBe(true);
    expect(k.windowOpen(k.delayMs - width - 61)).toBe(false);
    expect(k.windowOpen(k.delayMs + 1)).toBe(false);
  });

  it('a run dá um sorteio próprio para o Kokusen, igual para a mesma seed', () => {
    const draws = (seed: number): number[] => {
      const run = new Run(RUN, WAVE);
      run.startPressed();
      run.update(16, () => seed);
      return [run.kokusenRng!.next(), run.kokusenRng!.next(), run.kokusenRng!.next()];
    };
    expect(new Run(RUN, WAVE).kokusenRng).toBeNull();
    expect(draws(7)).toEqual(draws(7));
    expect(draws(7)).not.toEqual(draws(8));
  });
});
