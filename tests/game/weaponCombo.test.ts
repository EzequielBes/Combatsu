import { describe, expect, it } from 'vitest';
import { ComboTracker } from '../../src/core/combo';
import { COMBO_WINDOW_MS, PROP_SWING, PROP_SWING_COMBO } from '../../src/data/tuning';
import { HEAVY } from '../../src/game/art/hd/families/carry';
import { MOVE_PHASE_FRAMES, moveFrameName, type MovePhase } from '../../src/game/art/hd/frames';
import { hdHasFrame, hdHasMove, hdHeldName } from '../../src/game/art/hd/sheet';

/** Nome do golpe na folha HD para o passo `step` do combo com objeto (o mesmo cálculo do animador). */
const moveOf = (step: number, heavy: boolean): string =>
  hdHeldName(step === 0 ? 'swing' : `swing-${step + 1}`, heavy, hdHasMove);

describe('combo de três golpes com objeto', () => {
  it('o primeiro passo é o golpe de sempre e os três são fortes', () => {
    expect(PROP_SWING_COMBO).toHaveLength(3);
    expect(PROP_SWING_COMBO[0]).toBe(PROP_SWING);
    expect(PROP_SWING_COMBO.map((s) => s.strength)).toEqual(['heavy', 'heavy', 'heavy']);
    expect(new Set(PROP_SWING_COMBO.map((s) => s.name)).size).toBe(3);
  });

  it('apertos seguidos encadeiam os três golpes e o combo fecha no terceiro', () => {
    const combo = new ComboTracker(PROP_SWING_COMBO, COMBO_WINDOW_MS);
    const seen: number[] = [];
    combo.press();
    for (let t = 0; t < 4000 && combo.phase !== 'idle'; t += 10) {
      if (combo.isAttacking) combo.press();
      if (!seen.includes(combo.currentIndex)) seen.push(combo.currentIndex);
      combo.update(10);
    }
    expect(seen).toEqual([0, 1, 2]);
    expect(combo.phase).toBe('idle');
  });

  it('um aperto só dá um golpe e deixa a janela para o segundo', () => {
    const combo = new ComboTracker(PROP_SWING_COMBO, COMBO_WINDOW_MS);
    combo.press();
    const total = PROP_SWING.startupMs + PROP_SWING.activeMs + PROP_SWING.recoveryMs;
    for (let t = 0; t < total; t += 10) combo.update(10);
    expect(combo.phase).toBe('window');
    combo.press();
    expect([combo.currentIndex, combo.phase]).toEqual([1, 'startup']);
  });

  it('cada passo tem a própria sequência na folha HD, nas duas pegadas, com todos os quadros', () => {
    const names = [0, 1, 2].flatMap((step) => [moveOf(step, false), moveOf(step, true)]);
    expect(names).toEqual(['swing', `${HEAVY}swing`, 'swing-2', `${HEAVY}swing-2`, 'swing-3', `${HEAVY}swing-3`]);
    for (const name of names) {
      for (const phase of Object.keys(MOVE_PHASE_FRAMES) as MovePhase[]) {
        for (let i = 0; i < MOVE_PHASE_FRAMES[phase]; i++) {
          expect(hdHasFrame(moveFrameName(name, phase, i)), `${name} ${phase} ${i}`).toBe(true);
        }
      }
    }
  });
});
