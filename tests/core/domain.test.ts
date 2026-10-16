import { describe, expect, it } from 'vitest';
import { type ChargeEvent, DomainState, domainBarView } from '../../src/core/domain';
import { ActiveDomain } from '../../src/core/domainActivation';
import source from '../../src/core/domain.ts?raw';

const owned = (charge = 0): DomainState => {
  const s = new DomainState();
  s.own('santuario', 1, charge);
  return s;
};

/** Santuário Nv 1 (6000 ms) com metade do tempo restante. */
const halfActive = (): ActiveDomain => {
  const a = new ActiveDomain('santuario', 1);
  a.update(3000);
  return a;
};

describe('carga de 0 a 100 (DOM-01)', () => {
  it('é inteira e não passa de 100 nem fica abaixo de 0', () => {
    const s = owned(95);
    s.addCharge('kokusen');
    expect(s.charge).toBe(100);
    s.setCharge(-5);
    expect(s.charge).toBe(0);
    s.setCharge(250);
    expect(s.charge).toBe(100);
    s.setCharge(42.7);
    expect(s.charge).toBe(43);
  });

  it('o código-fonte não cita o motor', () => {
    expect(source.length).toBeGreaterThan(0);
    expect(source).not.toMatch(/phaser/i);
  });
});

describe('carga por evento (DOM-02)', () => {
  it.each([
    ['light', 1],
    ['heavy', 2],
    ['prop', 2],
    ['kill', 1],
    ['defense', 5],
    ['techCast', 1],
    ['finisher', 5],
    ['kokusen', 15],
  ] as [ChargeEvent, number][])('%s soma %i', (ev, n) => {
    const s = owned(10);
    s.addCharge(ev);
    expect(s.charge).toBe(10 + n);
  });

  it('sem dono nenhum evento muda a carga (DOM-02.5)', () => {
    const s = new DomainState();
    s.addCharge('kokusen');
    expect(s.charge).toBe(0);
  });

  it('com Domínio ativo nenhum evento muda a carga (DOM-02.5)', () => {
    const s = owned(0);
    s.active = halfActive();
    s.addCharge('kokusen');
    s.addCharge('light');
    expect(s.charge).toBe(0);
  });
});

describe('esvaziamento (DOM-03)', () => {
  it('7999 ms sem carga não muda; 8000 ms tira 10; 16000 ms tira 20', () => {
    const s = owned(50);
    s.tick(7999, true);
    expect(s.charge).toBe(50);
    s.tick(1, true);
    expect(s.charge).toBe(40);
    s.tick(7999, true);
    expect(s.charge).toBe(40);
    s.tick(1, true);
    expect(s.charge).toBe(30);
  });

  it('16000 ms num passo só tira 20', () => {
    const s = owned(50);
    s.tick(16000, true);
    expect(s.charge).toBe(30);
  });

  it('piso 0', () => {
    const s = owned(5);
    s.tick(8000, true);
    expect(s.charge).toBe(0);
    s.tick(8000, true);
    expect(s.charge).toBe(0);
  });

  it('um evento zera o relógio', () => {
    const s = owned(50);
    s.tick(7000, true);
    s.addCharge('light');
    s.tick(7999, true);
    expect(s.charge).toBe(51);
    s.tick(1, true);
    expect(s.charge).toBe(41);
  });

  it('carga 100 não esvazia', () => {
    const s = owned(100);
    s.tick(20000, true);
    expect(s.charge).toBe(100);
  });

  it('fora de roundActive o relógio não anda', () => {
    const s = owned(50);
    s.tick(7999, true);
    s.tick(20000, false);
    expect(s.charge).toBe(50);
    s.tick(1, true);
    expect(s.charge).toBe(40);
  });
});

describe('ritmo de referência (DOM-04)', () => {
  it('de 0 chega a 100 com 40 < t ≤ 60 s, em passos de 16 ms', () => {
    const s = owned(0);
    const plan: [ChargeEvent, number][] = [
      ['light', 1000],
      ['heavy', 4000],
      ['kill', 5000],
      ['defense', 20000],
      ['techCast', 5000],
    ];
    const next = plan.map(([, every]) => every);
    let t = 0;
    while (s.charge < 100 && t < 120000) {
      t += 16;
      plan.forEach(([ev, every], i) => {
        while (t >= next[i]) {
          s.addCharge(ev);
          next[i] += every;
        }
      });
      s.tick(16, true);
    }
    expect(t).toBeGreaterThan(40000);
    expect(t).toBeLessThanOrEqual(60000);
  });
});

describe('posse, nível e reinício (DOM-05, DNV-01, VEU-03, VEU-04)', () => {
  it('own(id) dá Nv 1 e carga 0; own(id, 1, 100) dá a carga cheia', () => {
    const a = new DomainState();
    a.own('jackpot');
    expect(a.owned).toEqual({ id: 'jackpot', level: 1 });
    expect(a.charge).toBe(0);
    const b = new DomainState();
    b.own('santuario', 1, 100);
    expect(b.charge).toBe(100);
  });

  it('raise sobe 1 → 2 → 3 sem mexer na carga e recusa no Nv 3', () => {
    const s = owned(37);
    expect(s.raise()).toBe(true);
    expect(s.owned?.level).toBe(2);
    expect(s.raise()).toBe(true);
    expect(s.owned?.level).toBe(3);
    expect(s.raise()).toBe(false);
    expect(s.owned?.level).toBe(3);
    expect(s.charge).toBe(37);
  });

  it('raise sem Domínio recusa', () => {
    const s = new DomainState();
    expect(s.raise()).toBe(false);
    expect(s.owned).toBeNull();
  });

  it('reset zera posse, carga, ativo, veilPending e bossChestPending', () => {
    const s = owned(80);
    s.active = halfActive();
    s.markVeil(['santuario', 'jackpot']);
    s.bossChestPending = true;
    s.reset();
    expect(s.owned).toBeNull();
    expect(s.charge).toBe(0);
    expect(s.active).toBeNull();
    expect(s.veilPending).toBeNull();
    expect(s.bossChestPending).toBe(false);
  });

  it('reset também zera o relógio do esvaziamento', () => {
    const s = owned(50);
    s.tick(7000, true);
    s.reset();
    s.own('santuario', 1, 50);
    s.tick(7999, true);
    expect(s.charge).toBe(50);
  });

  it('setCharge sem dono não faz nada', () => {
    const s = new DomainState();
    s.setCharge(60);
    expect(s.charge).toBe(0);
  });

  it('markVeil e takeVeil: o par sai da fila uma vez', () => {
    const s = new DomainState();
    s.markVeil(['amplificacao', 'jackpot']);
    expect(s.veilPending).toEqual(['amplificacao', 'jackpot']);
    expect(s.takeVeil()).toEqual(['amplificacao', 'jackpot']);
    expect(s.veilPending).toBeNull();
    expect(s.takeVeil()).toBeNull();
  });

  it('ready só com carga 100 e nenhum ativo', () => {
    const s = owned(99);
    expect(s.ready).toBe(false);
    s.setCharge(100);
    expect(s.ready).toBe(true);
    s.active = halfActive();
    expect(s.ready).toBe(false);
  });
});

describe('domainBarView (DHD-01 a DHD-03)', () => {
  it('escondida sem dono', () => {
    expect(domainBarView(new DomainState())).toMatchObject({ visible: false, blinking: false, active: false });
  });

  it('carregando: fill = charge / 100, sem piscar', () => {
    expect(domainBarView(owned(50))).toEqual({ visible: true, fill: 0.5, blinking: false, active: false });
  });

  it('cheia e sem ativo: pisca', () => {
    expect(domainBarView(owned(100))).toEqual({ visible: true, fill: 1, blinking: true, active: false });
  });

  it('ativo: fill = remainingMs / totalMs, sem piscar', () => {
    const s = owned(0);
    s.active = halfActive();
    expect(domainBarView(s)).toEqual({ visible: true, fill: 0.5, blinking: false, active: true });
  });
});
