import { describe, expect, it } from 'vitest';
import { ComboTracker, type AttackStep, type ComboEvent } from '../../src/core/combo';
import type { Strength } from '../../src/core/hit';
import { PLAYER_COMBO, PROP_SWING } from '../../src/data/tuning';

const step = (name: string, strength: Strength): AttackStep => ({
  name,
  damage: 5,
  strength,
  force: 1,
  startupMs: 50,
  activeMs: 50,
  recoveryMs: 100,
  hitbox: { offsetX: 10, offsetY: 0, width: 10, height: 10 },
});
const STEPS = [step('a', 'light'), step('b', 'light'), step('c', 'heavy')];
const WINDOW = 200;
const types = (evs: ComboEvent[]): string[] => evs.map((e) => e.type);
/** startup (50) → active (50) → recovery (100). */
const finishStep = (c: ComboTracker): ComboEvent[] => [...c.update(50), ...c.update(50), ...c.update(100)];

describe('ComboTracker', () => {
  it('apertar parado começa o primeiro golpe e trava o player', () => {
    const c = new ComboTracker(STEPS, WINDOW);
    const evs = c.press();
    expect(evs).toEqual([{ type: 'stepStart', index: 0, step: STEPS[0] }]);
    expect(c.isAttacking).toBe(true);
  });

  it('liga e desliga a hitbox e abre a janela de combo sem travar o player', () => {
    const c = new ComboTracker(STEPS, WINDOW);
    c.press();
    expect(types(finishStep(c))).toEqual(['hitboxOn', 'hitboxOff']);
    expect(c.isAttacking).toBe(false);
    expect(c.currentIndex).toBe(0);
  });

  it('apertar dentro da janela encadeia o próximo golpe', () => {
    const c = new ComboTracker(STEPS, WINDOW);
    c.press();
    finishStep(c);
    expect(c.press()).toEqual([{ type: 'stepStart', index: 1, step: STEPS[1] }]);
  });

  it('apertar durante o golpe fica no buffer e encadeia assim que a recuperação acaba', () => {
    const c = new ComboTracker(STEPS, WINDOW);
    c.press();
    c.update(50); // hitboxOn
    c.press(); // buffer
    const evs = [...c.update(50), ...c.update(100)];
    expect(types(evs)).toEqual(['hitboxOff', 'stepStart']);
    expect(c.currentIndex).toBe(1);
  });

  it('janela expirada encerra o combo e o próximo aperto volta ao primeiro golpe', () => {
    const c = new ComboTracker(STEPS, WINDOW);
    c.press();
    finishStep(c);
    expect(types(c.update(WINDOW))).toEqual(['comboEnd']);
    expect(c.press()[0]).toMatchObject({ type: 'stepStart', index: 0 });
  });

  it('combo completo é leve, leve, forte e termina sozinho', () => {
    const c = new ComboTracker(STEPS, WINDOW);
    const starts: ComboEvent[] = [];
    let last: ComboEvent[] = [];
    for (let i = 0; i < 3; i++) {
      starts.push(...c.press());
      last = finishStep(c);
    }
    expect(starts.map((e) => (e.type === 'stepStart' ? e.step.strength : null))).toEqual(['light', 'light', 'heavy']);
    expect(types(last)).toEqual(['hitboxOn', 'hitboxOff', 'comboEnd']);
    expect(c.isAttacking).toBe(false);
  });

  it('aperto sobrando no último golpe não inicia combo fantasma', () => {
    const c = new ComboTracker(STEPS, WINDOW);
    c.press();
    finishStep(c);
    c.press();
    finishStep(c);
    c.press();
    c.update(50);
    c.press(); // buffer no último golpe
    const evs = [...c.update(50), ...c.update(100)];
    expect(types(evs)).toEqual(['hitboxOff', 'comboEnd']);
    expect(c.isAttacking).toBe(false);
    expect(c.press()[0]).toMatchObject({ type: 'stepStart', index: 0 });
  });

  it('spam de ataque guarda só um aperto no buffer', () => {
    const c = new ComboTracker(STEPS, WINDOW);
    c.press();
    for (let i = 0; i < 10; i++) c.press();
    const evs = finishStep(c);
    expect(evs.filter((e) => e.type === 'stepStart')).toHaveLength(1);
    expect(c.currentIndex).toBe(1);
  });

  it('cancelar durante a hitbox ativa desliga a hitbox e encerra', () => {
    const c = new ComboTracker(STEPS, WINDOW);
    c.press();
    c.update(50);
    expect(types(c.cancel())).toEqual(['hitboxOff', 'comboEnd']);
    expect(c.isAttacking).toBe(false);
    expect(c.cancel()).toEqual([]);
  });

  it('golpe único sem janela (golpe com objeto) termina direto', () => {
    const c = new ComboTracker([step('swing', 'heavy')], 0);
    c.press();
    expect(types(finishStep(c))).toEqual(['hitboxOn', 'hitboxOff', 'comboEnd']);
  });

  it('não aceita combo vazio', () => {
    expect(() => new ComboTracker([], WINDOW)).toThrow();
  });
});

describe('dados de combo', () => {
  it('o último golpe do combo do player é forte e os anteriores são leves', () => {
    expect(PLAYER_COMBO.length).toBeGreaterThanOrEqual(2);
    expect(PLAYER_COMBO.length).toBeLessThanOrEqual(3);
    expect(PLAYER_COMBO[PLAYER_COMBO.length - 1].strength).toBe('heavy');
    for (const s of PLAYER_COMBO.slice(0, -1)) expect(s.strength).toBe('light');
    for (const s of PLAYER_COMBO) expect(s.hitbox).toBeDefined();
  });

  it('golpe com objeto é sempre forte', () => {
    expect(PROP_SWING.strength).toBe('heavy');
  });
});
