import { describe, expect, it, vi } from 'vitest';
import type { BeamAttack } from '../../src/game/boss/BeamAttack';
import { BossAffixFx, type BossFxAnchor } from '../../src/game/boss/BossAffixFx';
import type { ThreadRain } from '../../src/game/boss/ThreadRain';

const anchor: BossFxAnchor = { x: 300, groundY: 500, chestY: 472, facing: -1 };

function fakes() {
  const beam = { telegraph: vi.fn(), strikeOn: vi.fn(), update: vi.fn(), clear: vi.fn(), destroy: vi.fn() };
  const threads = { telegraph: vi.fn(), strikeOn: vi.fn(), clear: vi.fn(), destroy: vi.fn() };
  const fx = new BossAffixFx(threads as unknown as ThreadRain, null, beam as unknown as BeamAttack);
  return { beam, threads, fx };
}

describe('BossAffixFx: feixe do Sangue Convergente (SNG-02/03)', () => {
  it('aviso, abertura e fechamento do feixe vão para o BeamAttack, com o lado preso do aviso', () => {
    const { beam, threads, fx } = fakes();
    fx.route({ type: 'telegraph', attack: 'beam', dir: -1, playerX: 120 }, anchor);
    expect(beam.telegraph).toHaveBeenCalledWith(-1, anchor);
    fx.update(16, {} as never);
    expect(beam.update).toHaveBeenCalledWith(16);
    fx.route({ type: 'strikeOn', attack: 'beam', dir: -1 }, anchor);
    expect(beam.strikeOn).toHaveBeenCalledTimes(1);
    fx.route({ type: 'strikeOff', attack: 'beam' }, anchor);
    expect(beam.clear).toHaveBeenCalledTimes(1);
    expect(threads.telegraph).not.toHaveBeenCalled();
    expect(threads.strikeOn).not.toHaveBeenCalled();
    expect(fx.debug()).toEqual({ telegraph: 1, strikeOn: 1, strikeOff: 1 });
  });

  it('a interrupção no preparo apaga o aviso sem abrir o feixe (BAI-05)', () => {
    const { beam, fx } = fakes();
    fx.route({ type: 'telegraph', attack: 'beam', dir: 1, playerX: 400 }, anchor);
    fx.route({ type: 'telegraphCancel' }, anchor);
    expect(beam.clear).toHaveBeenCalledTimes(1);
    expect(beam.strikeOn).not.toHaveBeenCalled();
  });

  it('a Chuva de Fios não chega no feixe', () => {
    const { beam, threads, fx } = fakes();
    fx.route({ type: 'telegraph', attack: 'threadRain', dir: 1, playerX: 400 }, anchor);
    fx.route({ type: 'strikeOn', attack: 'threadRain', dir: 1 }, anchor);
    fx.route({ type: 'strikeOff', attack: 'threadRain' }, anchor);
    expect(threads.telegraph).toHaveBeenCalledWith(400, anchor);
    expect(threads.strikeOn).toHaveBeenCalledTimes(1);
    expect(threads.clear).toHaveBeenCalledTimes(1);
    expect(beam.telegraph).not.toHaveBeenCalled();
    expect(beam.strikeOn).not.toHaveBeenCalled();
    expect(beam.clear).not.toHaveBeenCalled();
  });

  it('a morte do chefe e a run nova apagam e removem o feixe', () => {
    const { beam, fx } = fakes();
    fx.clear();
    expect(beam.clear).toHaveBeenCalledTimes(1);
    fx.destroy();
    expect(beam.destroy).toHaveBeenCalledTimes(1);
  });
});
