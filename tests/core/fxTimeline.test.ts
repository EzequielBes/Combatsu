import { describe, expect, it } from 'vitest';
import { FxTimeline } from '../../src/core/fxTimeline';

describe('FxTimeline.add: duração arredondada para cima em frames inteiros de 60 fps (L-003)', () => {
  it('33 ms vira 2 frames (33,33 ms): viva até 33 ms de game dt, some em 34 ms (L-010)', () => {
    const fx = new FxTimeline();
    fx.add('cast.aura', 33, 'game');
    fx.update(33, 0);
    expect(fx.has('cast.aura')).toBe(true);
    fx.update(1, 0);
    expect(fx.has('cast.aura')).toBe(false);
  });

  it('66 ms vira 4 frames (66,67 ms): viva até 66 ms de game dt, some em 67 ms (L-010)', () => {
    const fx = new FxTimeline();
    fx.add('kokusen.duotone', 66, 'game');
    fx.update(66, 0);
    expect(fx.has('kokusen.duotone')).toBe(true);
    fx.update(1, 0);
    expect(fx.has('kokusen.duotone')).toBe(false);
  });
});

describe('TFX-05: camadas `game` não andam quando `gameDt` é 0 (hitstop); camadas `real` andam', () => {
  it('camada `game` sobrevive a vários updates com gameDt = 0, mesmo com realDt grande', () => {
    const fx = new FxTimeline();
    fx.add('cast.aura', 100, 'game');
    fx.update(0, 500);
    fx.update(0, 500);
    fx.update(0, 500);
    expect(fx.has('cast.aura')).toBe(true);
    fx.update(100, 0); // volta o tempo de jogo: agora sim termina
    expect(fx.has('cast.aura')).toBe(false);
  });

  it('camada `real` (kokusen.invert) termina normalmente mesmo com gameDt = 0 (hitstop)', () => {
    const fx = new FxTimeline();
    fx.add('kokusen.invert', 33, 'real');
    fx.update(0, 40); // hitstop: gameDt 0, mas o relógio real avança 40 ms (> 33,33 ms de duração)
    expect(fx.has('kokusen.invert')).toBe(false);
  });
});

describe('FxTimeline.layers/has: nomes das camadas vivas', () => {
  it('layers() lista os nomes vivos; has() reflete a mesma lista', () => {
    const fx = new FxTimeline();
    fx.add('divergente.fistAura', 200, 'game');
    fx.add('cast.aura', 200, 'game');
    expect(fx.layers().sort()).toEqual(['cast.aura', 'divergente.fistAura']);
    expect(fx.has('cast.aura')).toBe(true);
    expect(fx.has('nao-existe')).toBe(false);
  });

  it('add de novo com o mesmo nome reinicia a duração em vez de duplicar', () => {
    const fx = new FxTimeline();
    fx.add('cast.aura', 33, 'game');
    fx.update(30, 0);
    fx.add('cast.aura', 33, 'game'); // reinicia
    expect(fx.layers().filter((n) => n === 'cast.aura')).toHaveLength(1);
    fx.update(30, 0);
    expect(fx.has('cast.aura')).toBe(true); // se não tivesse reiniciado, já teria acabado (30+30 > 33,33)
  });
});
