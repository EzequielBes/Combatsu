import { describe, expect, it } from 'vitest';
import { BOSS_AFFIX } from '../../src/data/bossAffixes';
import { LAVA_DEPTH, LavaStrips } from '../../src/core/bossLava';

const GROUND = 300;
/** Jogador de 20 × 40 em pé no chão, centrado em `x`. */
const feet = (x: number, bottom = GROUND) => ({ x, y: bottom - 20, width: 20, height: 40 });

function withStrip(): LavaStrips {
  const lava = new LavaStrips();
  lava.add(200, 100, GROUND);
  return lava;
}

describe('LavaStrips', () => {
  it('usa os números do afixo', () => {
    expect(BOSS_AFFIX.lava.durationMs).toBe(2000);
    expect(BOSS_AFFIX.lava.tickMs).toBe(600);
  });

  it('IGN-02: a faixa vive 1999 ms e some aos 2000 ms', () => {
    const lava = withStrip();
    expect(lava.strips).toEqual([{ minX: 100, maxX: 200, groundY: GROUND, ageMs: 0 }]);
    lava.update(1999);
    expect(lava.strips).toHaveLength(1);
    lava.update(1);
    expect(lava.strips).toHaveLength(0);
    expect(lava.tick(feet(150), true)).toBe(false);
  });

  it('IGN-03: o 1º contato bate na hora', () => {
    expect(withStrip().tick(feet(150), true)).toBe(true);
  });

  it('IGN-03: 599 ms depois não bate; 600 ms depois bate de novo', () => {
    const lava = withStrip();
    expect(lava.tick(feet(150), true)).toBe(true);
    lava.update(599);
    expect(lava.tick(feet(150), true)).toBe(false);
    lava.update(1);
    expect(lava.tick(feet(150), true)).toBe(true);
    expect(lava.tick(feet(150), true)).toBe(false);
  });

  it('o relógio do tique é um só: sair e voltar não bate antes de 600 ms', () => {
    const lava = withStrip();
    expect(lava.tick(feet(150), true)).toBe(true);
    lava.update(300);
    expect(lava.tick(feet(400), true)).toBe(false);
    expect(lava.tick(feet(150), true)).toBe(false);
  });

  it('IGN-05: no ar não bate, nem dentro da faixa', () => {
    const lava = withStrip();
    expect(lava.tick(feet(150), false)).toBe(false);
    expect(lava.tick(feet(150, GROUND - LAVA_DEPTH - 1), true)).toBe(false);
    expect(lava.tick(feet(150), true)).toBe(true);
  });

  it('fora da faixa não bate; a borda conta', () => {
    const lava = withStrip();
    expect(lava.tick(feet(79), true)).toBe(false);
    expect(lava.tick(feet(221), true)).toBe(false);
    expect(lava.tick(feet(90), true)).toBe(true);
  });

  it('duas faixas sob o jogador não dobram o tique', () => {
    const lava = withStrip();
    lava.add(120, 180, GROUND);
    expect(lava.tick(feet(150), true)).toBe(true);
    expect(lava.tick(feet(150), true)).toBe(false);
  });

  it('cada faixa some pela própria idade', () => {
    const lava = withStrip();
    lava.update(1000);
    lava.add(400, 500, GROUND);
    lava.update(1000);
    expect(lava.strips.map((s) => s.minX)).toEqual([400]);
  });

  it('clear esvazia e o próximo contato bate na hora', () => {
    const lava = withStrip();
    expect(lava.tick(feet(150), true)).toBe(true);
    lava.clear();
    expect(lava.strips).toHaveLength(0);
    expect(lava.tick(feet(150), true)).toBe(false);
    lava.add(100, 200, GROUND);
    expect(lava.tick(feet(150), true)).toBe(true);
  });
});
