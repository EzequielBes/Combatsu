import { describe, expect, it } from 'vitest';
import { CounterWindow } from '../../src/core/counter';
import { COUNTER } from '../../src/data/moves';

/** Janela aberta com `ms` e já avançada `elapsed` de jogo. */
function opened(kind: 'contra' | 'contraGancho', ms: number, elapsed = 0): CounterWindow {
  const w = new CounterWindow();
  w.open(kind, ms);
  if (elapsed > 0) w.update(elapsed);
  return w;
}

describe('janela aberta por 450 ms (CNT-01..03)', () => {
  it('fechada antes de abrir: sem kind e sem tempo', () => {
    const w = new CounterWindow();
    expect(w.isOpen).toBe(false);
    expect(w.kind).toBeNull();
    expect(w.remainingMs).toBe(0);
  });

  it('logo depois de abrir está aberta, com o kind e os 450 ms', () => {
    const w = opened('contra', 450);
    expect(w.isOpen).toBe(true);
    expect(w.kind).toBe('contra');
    expect(w.remainingMs).toBe(450);
  });

  it('em 449 ms ainda está aberta, com 1 ms pela frente', () => {
    const w = opened('contra', 450, 449);
    expect(w.isOpen).toBe(true);
    expect(w.remainingMs).toBe(1);
  });

  it('em 450 ms está fechada, sem kind e sem tempo', () => {
    const w = opened('contra', 450, 450);
    expect(w.isOpen).toBe(false);
    expect(w.kind).toBeNull();
    expect(w.remainingMs).toBe(0);
  });

  it('contraGancho com 450 ms: mesmo limiar, kind contraGancho', () => {
    expect(opened('contraGancho', 450, 449).kind).toBe('contraGancho');
    expect(opened('contraGancho', 450, 450).isOpen).toBe(false);
  });
});

describe('janela da Deflexão de 900 ms (CNT-04)', () => {
  it('em 899 ms ainda está aberta, com 1 ms pela frente', () => {
    const w = opened('contra', COUNTER.deflectWindowMs, 899);
    expect(w.isOpen).toBe(true);
    expect(w.remainingMs).toBe(1);
  });

  it('em 900 ms está fechada', () => {
    expect(opened('contra', COUNTER.deflectWindowMs, 900).isOpen).toBe(false);
  });

  it('com um tempo fora do padrão (300 ms) o limiar anda junto', () => {
    expect(opened('contra', 300, 299).isOpen).toBe(true);
    expect(opened('contra', 300, 300).isOpen).toBe(false);
  });
});

describe('o tempo só anda em update (CNT-20)', () => {
  it('sem update o remainingMs não muda e a janela não fecha', () => {
    const w = opened('contra', 450);
    expect(w.remainingMs).toBe(450);
    expect(w.remainingMs).toBe(450);
    expect(w.isOpen).toBe(true);
  });

  it('update(0), como num frame de hitstop, não gasta tempo', () => {
    const w = opened('contra', 450);
    w.update(0);
    expect(w.remainingMs).toBe(450);
  });
});

describe('open com a janela aberta troca kind e tempo (CNT-13)', () => {
  it('descarta o tempo que faltava e passa a ter o kind e a duração inteira do novo evento', () => {
    const w = opened('contra', 450, 400);
    expect(w.remainingMs).toBe(50);
    w.open('contraGancho', 450);
    expect(w.kind).toBe('contraGancho');
    expect(w.remainingMs).toBe(450);
    w.update(449);
    expect(w.isOpen).toBe(true);
    w.update(1);
    expect(w.isOpen).toBe(false);
  });

  it('um evento mais curto também troca: 900 ms de Deflexão trocados por 450 ms ficam com 450 ms', () => {
    const w = opened('contra', 900, 100);
    w.open('contra', 450);
    expect(w.remainingMs).toBe(450);
  });
});

describe('take consome o aperto e fecha a janela (CNT-05, CNT-06)', () => {
  it('take(true) com aperto devolve o kind e fecha; a segunda chamada devolve null', () => {
    const w = opened('contraGancho', 450);
    w.buffer();
    expect(w.take(true)).toBe('contraGancho');
    expect(w.isOpen).toBe(false);
    expect(w.take(true)).toBeNull();
  });

  it('take(true) sem aperto não consome a janela', () => {
    const w = opened('contra', 450);
    expect(w.take(true)).toBeNull();
    expect(w.isOpen).toBe(true);
  });

  it('take(true) sem janela aberta devolve null, mesmo com aperto', () => {
    const w = new CounterWindow();
    w.buffer();
    expect(w.take(true)).toBeNull();
  });
});

describe('aperto guardado durante a esquiva ou o abaixar (CNT-07)', () => {
  it('buffer() seguido de take(false) devolve null e mantém o aperto; o take(true) seguinte devolve o kind', () => {
    const w = opened('contra', 450);
    w.buffer();
    expect(w.take(false)).toBeNull();
    expect(w.isOpen).toBe(true);
    expect(w.take(true)).toBe('contra');
  });

  it('o aperto guardado vale enquanto a janela está aberta: em 449 ms o take(true) ainda devolve o kind', () => {
    const w = opened('contra', 450);
    w.buffer();
    w.update(449);
    expect(w.take(true)).toBe('contra');
  });

  it('se a janela fecha antes, o take(true) devolve null e o aperto guardado some', () => {
    const w = opened('contra', 450);
    w.buffer();
    w.update(450);
    expect(w.take(true)).toBeNull();
    // O aperto não volta numa janela nova.
    w.open('contra', 450);
    expect(w.take(true)).toBeNull();
  });

  it('close() descarta a janela e o aperto guardado', () => {
    const w = opened('contra', 450);
    w.buffer();
    w.close();
    expect(w.isOpen).toBe(false);
    expect(w.take(true)).toBeNull();
    w.open('contra', 450);
    expect(w.take(true)).toBeNull();
  });
});
