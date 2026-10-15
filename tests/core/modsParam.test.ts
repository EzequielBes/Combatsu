import { describe, expect, it } from 'vitest';
import { parseModsParam } from '../../src/core/modsParam';

describe('parseModsParam (POW-13)', () => {
  it('lê um par e vários pares', () => {
    expect(parseModsParam('forca:5')).toEqual([['forca', 5]]);
    expect(parseModsParam('forca:5,vida:2')).toEqual([
      ['forca', 5],
      ['vida', 2],
    ]);
  });

  it('aceita todo modificador central', () => {
    expect(parseModsParam('vida:1,forca:2,agilidade:3,ima:4,sorte:5')).toEqual([
      ['vida', 1],
      ['forca', 2],
      ['agilidade', 3],
      ['ima', 4],
      ['sorte', 5],
    ]);
  });

  it('null e vazio dão lista vazia', () => {
    expect(parseModsParam(null)).toEqual([]);
    expect(parseModsParam('')).toEqual([]);
  });

  it.each(['xx:2', 'forca:-1', 'forca:0', 'forca:1.5', 'forca:', 'forca', 'energia:2', 'toString:1', 'forca:2:3'])(
    'descarta %s',
    (raw) => {
      expect(parseModsParam(raw)).toEqual([]);
    },
  );

  it('descarta só as entradas ruins e o resto vale', () => {
    expect(parseModsParam('xx:2,forca:5,forca:-1,vida:0,sorte:1.5,ima:,agilidade:3')).toEqual([
      ['forca', 5],
      ['agilidade', 3],
    ]);
  });

  it('não corta no teto: o teto é do modifiers.apply', () => {
    expect(parseModsParam('forca:99')).toEqual([['forca', 99]]);
  });
});
