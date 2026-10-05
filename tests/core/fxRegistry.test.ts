import { describe, expect, it } from 'vitest';
import { FxRegistry, type Destroyable } from '../../src/core/fxRegistry';

function fakeObj(): Destroyable & { destroyed: boolean } {
  const obj = { destroyed: false, destroy: () => {} };
  obj.destroy = () => {
    obj.destroyed = true;
  };
  return obj;
}

describe('FxRegistry', () => {
  it('conta o que está registrado em size (fx.live, TFX-09)', () => {
    const reg = new FxRegistry();
    const a = fakeObj();
    const b = fakeObj();
    reg.add(a);
    reg.add(b);
    expect(reg.size).toBe(2);
  });

  it('sem prazo armado, um objeto fica vivo indefinidamente (efeito ainda em andamento)', () => {
    const reg = new FxRegistry();
    const a = fakeObj();
    reg.add(a);
    reg.update(10_000);
    expect(reg.size).toBe(1);
    expect(a.destroyed).toBe(false);
  });

  it('TFX-03: destrói e remove exatamente quando o prazo chega a 0', () => {
    const reg = new FxRegistry();
    const a = fakeObj();
    reg.add(a);
    reg.scheduleDestroy(a, 300);
    reg.update(299);
    expect(reg.size).toBe(1);
    expect(a.destroyed).toBe(false);
    reg.update(1);
    expect(reg.size).toBe(0);
    expect(a.destroyed).toBe(true);
  });

  it('TFX-09: 300 ms depois do fim do efeito, size volta ao valor de antes dele começar', () => {
    const reg = new FxRegistry();
    const before = fakeObj();
    reg.add(before);
    expect(reg.size).toBe(1); // valor "de antes do efeito começar" para o objeto que sobra.

    const effect = fakeObj();
    reg.add(effect);
    expect(reg.size).toBe(2);

    reg.scheduleDestroy(effect, 300);
    reg.update(300);
    expect(reg.size).toBe(1);
    expect(before.destroyed).toBe(false);
  });

  it('scheduleDestroy em objeto não registrado não afeta o registro', () => {
    const reg = new FxRegistry();
    const outside = fakeObj();
    reg.scheduleDestroy(outside, 100);
    reg.update(1000);
    expect(reg.size).toBe(0);
    expect(outside.destroyed).toBe(false);
  });
});
