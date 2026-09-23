import { describe, expect, it } from 'vitest';
import { attackFrame, pickPlayerAnim, type PlayerAnimInput } from '../../src/core/animState';

/** Parado no chão, sem golpe, sem objeto. */
const base: PlayerAnimInput = { hurt: false, attack: null, grounded: true, vx: 0, vy: 0, holding: false };
const pick = (over: Partial<PlayerAnimInput>) => pickPlayerAnim({ ...base, ...over });

describe('pickPlayerAnim (CHR-01)', () => {
  it('idle: parado no chão', () => {
    expect(pick({})).toBe('idle');
  });

  it('run só acima de 10 px/s em |vx|, nos dois sentidos', () => {
    expect(pick({ vx: 10 })).toBe('idle');
    expect(pick({ vx: -10 })).toBe('idle');
    expect(pick({ vx: 10.5 })).toBe('run');
    expect(pick({ vx: -220 })).toBe('run');
  });

  it('no ar: jump se vy < 0, senão fall (ar vence run)', () => {
    expect(pick({ grounded: false, vy: -300, vx: 220 })).toBe('jump');
    expect(pick({ grounded: false, vy: 0, vx: 220 })).toBe('fall');
    expect(pick({ grounded: false, vy: 400 })).toBe('fall');
  });

  it('golpe vence ar e run: a animação é o nome do golpe', () => {
    expect(pick({ attack: { name: 'jab', phase: 'startup' }, grounded: false, vy: -100, vx: 200 })).toBe('jab');
    expect(pick({ attack: { name: 'cross', phase: 'active' }, vx: 200 })).toBe('cross');
    expect(pick({ attack: { name: 'kick', phase: 'recovery' } })).toBe('kick');
  });

  it('swing e throw têm a mesma precedência do golpe', () => {
    expect(pick({ attack: { name: 'swing', phase: 'active' }, holding: true, grounded: false, vy: 50 })).toBe('swing');
    expect(pick({ attack: { name: 'throw', phase: 'active' }, vx: 200 })).toBe('throw');
  });

  it('hurt vence tudo', () => {
    expect(
      pick({ hurt: true, attack: { name: 'kick', phase: 'active' }, grounded: false, vy: -100, vx: 200, holding: true }),
    ).toBe('hurt');
  });

  it('segurando objeto: carry-run correndo e carry-idle parado', () => {
    expect(pick({ holding: true })).toBe('carry-idle');
    expect(pick({ holding: true, vx: 10 })).toBe('carry-idle');
    expect(pick({ holding: true, vx: -150 })).toBe('carry-run');
  });

  it('segurando objeto no ar: o ar vem antes (jump/fall)', () => {
    expect(pick({ holding: true, grounded: false, vy: -200 })).toBe('jump');
    expect(pick({ holding: true, grounded: false, vy: 200 })).toBe('fall');
  });
});

describe('attackFrame (CHR-02)', () => {
  it('startup mostra o preparo', () => {
    expect(attackFrame('startup')).toBe('wind');
  });

  it('active mostra o membro esticado (hit) durante toda a janela ativa', () => {
    expect(attackFrame('active')).toBe('hit');
  });

  it('recovery e window mostram a volta', () => {
    expect(attackFrame('recovery')).toBe('recover');
    expect(attackFrame('window')).toBe('recover');
  });
});
