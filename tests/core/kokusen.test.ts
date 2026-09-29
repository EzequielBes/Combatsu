import { describe, expect, it } from 'vitest';
import { Kokusen } from '../../src/core/kokusen';
import { CursedEnergy } from '../../src/core/energy';

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
