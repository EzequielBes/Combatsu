import { describe, expect, it } from 'vitest';
import { Sleeper } from '../../src/core/sleeper';
import { SLEEPER } from '../../src/data/npc';

const CFG = { rangePx: 50, charMs: 40, holdMs: 1000, mouthMs: 120, line: 'agentes zzzz' };

describe('dorminhoco', () => {
  it('dorme calado até levar um golpe por perto', () => {
    const s = new Sleeper(CFG);
    s.update(5000);
    expect(s.talking).toBe(false);
    expect(s.text).toBe('');
    expect(s.frame).toBe('sleep');
  });

  it('o golpe longe não o faz falar; o de perto, dos dois lados, faz', () => {
    const s = new Sleeper(CFG);
    expect(s.poke(51)).toBe(false);
    expect(s.poke(-51)).toBe(false);
    expect(s.talking).toBe(false);
    expect(s.poke(-50)).toBe(true);
    expect(s.talking).toBe(true);
  });

  it('a frase sai letra por letra, com a boca mexendo, e fica inteira até o fim', () => {
    const s = new Sleeper(CFG);
    s.poke(0);
    expect(s.text).toBe('a');
    expect(s.frame).toBe('talk-1');
    s.update(120);
    expect(s.text).toBe('agen');
    expect(s.frame).toBe('talk-0');
    s.update(CFG.line.length * CFG.charMs);
    expect(s.text).toBe(CFG.line);
    // Frase inteira na tela: a boca fecha.
    expect(s.frame).toBe('sleep');
    expect(s.talking).toBe(true);
  });

  it('outro golpe no meio da fala não recomeça a frase; depois de calar, pode falar de novo', () => {
    const s = new Sleeper(CFG);
    s.poke(0);
    s.update(200);
    expect(s.poke(0)).toBe(false);
    expect(s.text.length).toBeGreaterThan(1);
    s.update(CFG.line.length * CFG.charMs + CFG.holdMs);
    expect(s.talking).toBe(false);
    expect(s.text).toBe('');
    expect(s.poke(10)).toBe(true);
  });

  it('a frase do jogo é a pedida e cabe em poucos segundos', () => {
    expect(SLEEPER.line).toBe('Preciso criar agentes, agentes... preciso agentes zzzz');
    expect(SLEEPER.line.length * SLEEPER.charMs + SLEEPER.holdMs).toBeLessThan(6000);
  });
});
