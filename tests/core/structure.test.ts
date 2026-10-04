import { describe, expect, it } from 'vitest';
import { ENEMY_STRUCTURE, PLAYER_STRUCTURE, Structure, enemyStructureGain } from '../../src/core/structure';
import { MOVES, STRUCTURE } from '../../src/data/moves';

const enemy = () => new Structure(ENEMY_STRUCTURE);
const player = () => new Structure(PLAYER_STRUCTURE);

describe('STR-01: estrutura entre 0 e 100', () => {
  it('começa em 0, max 100, não quebrada', () => {
    const s = enemy();
    expect([s.cur, s.max, s.broken]).toEqual([0, 100, false]);
  });

  it('nunca passa de 100 nem fica abaixo de 0', () => {
    const s = enemy();
    s.add(95);
    s.add(3);
    expect(s.cur).toBe(98);
    const p = player();
    p.add(10);
    p.update(60000);
    expect(p.cur).toBe(0);
  });
});

describe('STR-02: ganho do inimigo por golpe, com teto', () => {
  it('leve +4, forte +10, chuteCarregado +40, joelhada +30 (10 + 20)', () => {
    expect(MOVES.jab.structureGain).toBe(4);
    expect(MOVES.socoAereo.structureGain).toBe(4);
    expect(MOVES.chuteFrontal.structureGain).toBe(10);
    expect(MOVES.voadora.structureGain).toBe(10);
    expect(MOVES.chuteCarregado.structureGain).toBe(40);
    expect(MOVES.joelhada.structureGain).toBe(30);
  });

  it('todo golpe leve soma 4 e todo forte soma 10, exceto o carregado (40), a joelhada (30) e os dois Contras (30, CNT-09/CNT-10)', () => {
    for (const m of Object.values(MOVES)) {
      const expected =
        m.name === 'chuteCarregado' ? 40 : ['joelhada', 'contra', 'contraGancho'].includes(m.name) ? 30 : m.strength === 'light' ? 4 : 10;
      expect(m.structureGain, m.name).toBe(expected);
    }
  });

  it('add soma o ganho na barra do inimigo', () => {
    const s = enemy();
    s.add(MOVES.jab.structureGain);
    s.add(MOVES.chuteFrontal.structureGain);
    expect(s.cur).toBe(14);
  });

  it('o ganho é limitado a 100', () => {
    const s = enemy();
    s.add(90);
    s.add(MOVES.chuteCarregado.structureGain);
    expect(s.cur).toBe(100);
  });
});

describe('STR-03: bloqueio soma estrutura ao jogador, com teto', () => {
  it('+15 por golpe comum e +25 por golpe do chefe', () => {
    const p = player();
    p.add(15);
    expect(p.cur).toBe(15);
    p.add(25);
    expect(p.cur).toBe(40);
  });

  it('teto de 100', () => {
    const p = player();
    p.add(90);
    p.add(25);
    expect(p.cur).toBe(100);
  });
});

describe('PAR-03: parry soma 35 ao atacante, com teto', () => {
  it('+35 na estrutura do inimigo', () => {
    const s = enemy();
    s.add(35);
    expect(s.cur).toBe(35);
    s.add(35);
    s.add(35);
    expect(s.cur).toBe(100);
  });
});

describe('STR-04: inimigo cai 10/s depois de 1500 ms sem subir (tempo de jogo)', () => {
  it('em 1499 ms e em 1500 ms nada mudou', () => {
    const a = enemy();
    a.add(50);
    a.update(1499);
    expect(a.cur).toBe(50);
    const b = enemy();
    b.add(50);
    b.update(1500);
    expect(b.cur).toBe(50);
  });

  it('1000 ms depois dos 1500 ms caiu exatamente 10', () => {
    const s = enemy();
    s.add(50);
    s.update(1500);
    s.update(1000);
    expect(s.cur).toBeCloseTo(40, 5);
  });

  it('a queda só conta a partir de 1500 ms (1499 + 1000 cai 9,99)', () => {
    const s = enemy();
    s.add(50);
    s.update(1499);
    s.update(1000);
    expect(s.cur).toBeCloseTo(40.01, 5);
  });

  it('um novo ganho reinicia o atraso', () => {
    const s = enemy();
    s.add(50);
    s.update(1400);
    s.add(4);
    s.update(1400);
    expect(s.cur).toBe(54);
  });

  it('para em 0', () => {
    const s = enemy();
    s.add(20);
    s.update(1500);
    s.update(60000);
    expect(s.cur).toBe(0);
  });
});

describe('STR-07: jogador cai 20/s depois de 1000 ms sem bloquear', () => {
  it('em 999 ms e 1000 ms nada mudou', () => {
    const a = player();
    a.add(50);
    a.update(999);
    expect(a.cur).toBe(50);
    const b = player();
    b.add(50);
    b.update(1000);
    expect(b.cur).toBe(50);
  });

  it('1000 ms depois dos 1000 ms caiu exatamente 20', () => {
    const s = player();
    s.add(50);
    s.update(1000);
    s.update(1000);
    expect(s.cur).toBeCloseTo(30, 5);
  });

  it('a queda só conta a partir de 1000 ms (999 + 1000 cai 19,98)', () => {
    const s = player();
    s.add(50);
    s.update(999);
    s.update(1000);
    expect(s.cur).toBeCloseTo(30.02, 5);
  });
});

describe('STR-05, STR-06, STR-08: quebra, atordoamento e volta a 0', () => {
  it('quebra exatamente em 100 (99 não quebra) e add devolve `true` uma vez', () => {
    const a = enemy();
    expect(a.add(99)).toBe(false);
    expect(a.broken).toBe(false);
    expect(a.add(1)).toBe(true);
    expect(a.broken).toBe(true);
    expect(a.add(10)).toBe(false);
  });

  it('inimigo quebrado fica atordoado por 1500 ms: 1499 ainda quebrado, 1500 acabou', () => {
    const s = enemy();
    s.add(100);
    expect(s.stunRemainingMs).toBe(1500);
    expect(s.update(1499)).toBe(false);
    expect(s.broken).toBe(true);
    expect(s.update(1)).toBe(true);
    expect(s.broken).toBe(false);
  });

  it('jogador quebrado fica atordoado por 800 ms: 799 ainda quebrado, 800 acabou', () => {
    const s = player();
    s.add(100);
    expect(s.stunRemainingMs).toBe(800);
    expect(s.update(799)).toBe(false);
    expect(s.broken).toBe(true);
    expect(s.update(1)).toBe(true);
    expect(s.broken).toBe(false);
  });

  it('STR-08: ao fim do atordoamento a estrutura é 0 e não quebrada', () => {
    for (const s of [enemy(), player()]) {
      s.add(100);
      s.update(5000);
      expect([s.cur, s.broken]).toEqual([0, false]);
    }
  });

  it('durante a quebra a barra fica em 100 e não cai', () => {
    const s = enemy();
    s.add(100);
    s.update(1000);
    expect(s.cur).toBe(100);
  });

  it('depois de recuperar pode quebrar de novo', () => {
    const s = enemy();
    s.add(100);
    s.update(1500);
    expect(s.add(100)).toBe(true);
  });

  it('reset (nova run) zera tudo', () => {
    const s = enemy();
    s.add(100);
    s.reset();
    expect([s.cur, s.broken]).toEqual([0, false]);
  });
});

describe('STR-02: ganho aplicado ao inimigo pelo golpe que acertou', () => {
  it('golpe do grafo soma o valor dele; sem golpe do grafo, leve soma 4 e forte soma 10', () => {
    expect(enemyStructureGain({ moveName: 'chuteCarregado', strength: 'heavy' })).toBe(40);
    expect(enemyStructureGain({ moveName: 'joelhada', strength: 'heavy' })).toBe(30);
    expect(enemyStructureGain({ moveName: 'jab', strength: 'light' })).toBe(4);
    expect(enemyStructureGain({ strength: 'light' })).toBe(4);
    expect(enemyStructureGain({ strength: 'heavy' })).toBe(10);
  });
});

describe('PST-14, PST-16, DEF-13, DEF-19: números novos da postura', () => {
  it('fora do foco a postura do inimigo cai 40/s e o alívio do jogador ao defender bem é 10', () => {
    expect(STRUCTURE.enemy.offFocusDecayPerSec).toBe(40);
    expect(STRUCTURE.player.evadeRelief).toBe(10);
  });
});

describe('Structure.reduce (DEF-13, DEF-19)', () => {
  it('reduce(10) leva 25 a 15', () => {
    const s = player();
    s.add(25);
    s.reduce(10);
    expect(s.cur).toBe(15);
  });

  it('reduce(10) leva 6 a 0, sem ficar negativa', () => {
    const s = player();
    s.add(6);
    s.reduce(10);
    expect(s.cur).toBe(0);
  });

  it('reduce com o alívio do tuning (evadeRelief) tira 10 da postura do jogador', () => {
    const s = player();
    s.add(STRUCTURE.player.blockRegular);
    s.reduce(STRUCTURE.player.evadeRelief);
    expect(s.cur).toBe(5);
  });

  it('quebrada, não muda: continua em 100, quebrada e com o atordoamento inteiro', () => {
    const s = enemy();
    s.add(100);
    s.reduce(10);
    expect(s.cur).toBe(100);
    expect(s.broken).toBe(true);
    expect(s.stunRemainingMs).toBe(1500);
  });

  it('não reinicia o atraso da queda: 1400 ms + reduce + 100 ms já começa a cair', () => {
    const s = enemy();
    s.add(50);
    s.update(1400);
    s.reduce(10);
    expect(s.cur).toBe(40);
    s.update(100); // completa os 1500 ms desde o último ganho
    expect(s.cur).toBe(40);
    s.update(1000);
    expect(s.cur).toBeCloseTo(30, 5);
  });

  it('com a queda já em curso, reduce não a interrompe nem zera o relógio', () => {
    const s = enemy();
    s.add(50);
    s.update(1500);
    s.reduce(10);
    s.update(1000);
    expect(s.cur).toBeCloseTo(30, 5); // 50 - 10 - 10 de queda
  });
});

describe('Structure.update com taxa de queda por parâmetro (PST-14, PST-16)', () => {
  it('update(dt, 40) cai 40/s depois do atraso: 1499 ms não cai, 1500 ms ainda não, e 1000 ms depois caiu 40', () => {
    const a = enemy();
    a.add(50);
    a.update(1499, 40);
    expect(a.cur).toBe(50);
    const b = enemy();
    b.add(50);
    b.update(1500, 40);
    expect(b.cur).toBe(50);
    b.update(1000, 40);
    expect(b.cur).toBeCloseTo(10, 5);
  });

  it('a queda a 40/s começa em 1500 ms: 25 ms depois dos 1500 caiu exatamente 1', () => {
    const s = enemy();
    s.add(50);
    s.update(1500, 40);
    s.update(25, 40);
    expect(s.cur).toBeCloseTo(49, 5);
  });

  it('update(dt) sem taxa cai a do tuning (10/s para o inimigo, 20/s para o jogador)', () => {
    const e = enemy();
    e.add(50);
    e.update(1500);
    e.update(1000);
    expect(e.cur).toBeCloseTo(40, 5);
    const p = player();
    p.add(50);
    p.update(1000);
    p.update(1000);
    expect(p.cur).toBeCloseTo(30, 5);
  });

  it('a taxa do parâmetro vale só para aquele passo: 40/s e depois a do tuning', () => {
    const s = enemy();
    s.add(80);
    s.update(1500);
    s.update(500, 40); // -20
    s.update(1000); // -10 do tuning
    expect(s.cur).toBeCloseTo(50, 5);
  });

  it('usa a taxa do tuning recebido (25/s), diferente do padrão', () => {
    const s = new Structure({ max: 100, decayDelayMs: 500, decayPerSec: 25, stunMs: 1000 });
    s.add(60);
    s.update(500);
    s.update(1000);
    expect(s.cur).toBeCloseTo(35, 5);
    s.update(1000, 40);
    expect(s.cur).toBeCloseTo(0, 5); // 35 - 40, parando em 0
  });

  it('a taxa por parâmetro também só vale depois do atraso e para em 0', () => {
    const s = enemy();
    s.add(20);
    s.update(1500, 40);
    s.update(60000, 40);
    expect(s.cur).toBe(0);
  });
});
