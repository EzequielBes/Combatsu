import { describe, expect, it } from 'vitest';
import { BossBrain } from '../../src/core/bossBrain';
import type { Hit, Strength } from '../../src/core/hit';

const MAX_HP = 600; // Assumption: vida do chefe tier 1.

function hit(damage: number, strength: Strength = 'light'): Hit {
  return { ownerId: 999, damage, strength, direction: { x: 1, y: 0 }, force: 0 };
}

/** Sai da intro (1500 ms) e chega em `active`. */
function active(): BossBrain {
  const brain = new BossBrain(MAX_HP);
  brain.update(1500);
  return brain;
}

/** Zera a postura (100) com três golpes fortes de dano 18 e entra em `stagger` (hp 546). */
function staggered(): BossBrain {
  const brain = active();
  for (let i = 0; i < 3; i++) brain.receiveHit(hit(18, 'heavy'));
  return brain;
}

describe('BossBrain.receiveHit com escala (ADP-04)', () => {
  it('scale 0,5: dano e postura pela metade, arredondados', () => {
    const brain = active();
    brain.receiveHit(hit(15, 'heavy'), 0.5); // dano round(7,5) = 8; postura round(30 × 0,5) = 15
    expect(brain.hp).toBe(592);
    expect(brain.poise).toBe(85);
  });

  it('dano nunca abaixo de 1, mesmo quando a escala arredonda para 0', () => {
    const brain = active();
    brain.receiveHit(hit(1), 0.4); // round(0,4) = 0 -> 1; postura round(0,4) = 0
    expect(brain.hp).toBe(599);
    expect(brain.poise).toBe(100);
  });

  it('postura × 0,5 num golpe leve', () => {
    const brain = active();
    brain.receiveHit(hit(20), 0.5);
    expect(brain.poise).toBe(90);
    expect(brain.hp).toBe(590);
  });

  it('em `stagger` o multiplicador vem depois da escala: round(round(dano × 0,5) × 1,5)', () => {
    const brain = staggered();
    expect(brain.state).toBe('stagger');
    brain.receiveHit(hit(15), 0.5); // round(7,5) = 8, depois round(8 × 1,5) = 12
    expect(brain.hp).toBe(546 - 12);
  });

  it('scale 1 é igual a não passar escala', () => {
    const a = active();
    const b = active();
    a.receiveHit(hit(15, 'heavy'));
    b.receiveHit(hit(15, 'heavy'), 1);
    expect(b.hp).toBe(a.hp);
    expect(b.poise).toBe(a.poise);

    const sa = staggered();
    const sb = staggered();
    sa.receiveHit(hit(15));
    sb.receiveHit(hit(15), 1);
    expect(sb.hp).toBe(sa.hp);
  });

  it('a escala não fura a invulnerabilidade da intro', () => {
    const brain = new BossBrain(MAX_HP);
    expect(brain.receiveHit(hit(50), 0.5)).toEqual([]);
    expect(brain.hp).toBe(MAX_HP);
  });
});
