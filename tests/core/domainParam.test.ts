import { describe, expect, it } from 'vitest';
import { parseChargeParam, parseDomainParam, parseMissesParam } from '../../src/core/domainParam';

describe('parseDomainParam: `<id>[:<nível>]` (DDB-02)', () => {
  it('santuario sem nível é Nv 1', () => {
    expect(parseDomainParam('santuario')).toEqual({ id: 'santuario', level: 1 });
  });

  it('jackpot:3 é Nv 3', () => {
    expect(parseDomainParam('jackpot:3')).toEqual({ id: 'jackpot', level: 3 });
  });

  it('amplificacao:1 e :2 aceitos (os dois lados do intervalo)', () => {
    expect(parseDomainParam('amplificacao:1')).toEqual({ id: 'amplificacao', level: 1 });
    expect(parseDomainParam('amplificacao:2')).toEqual({ id: 'amplificacao', level: 2 });
  });

  it.each(['amplificacao:0', 'santuario:4', 'santuario:1.5', 'xx', '', 'santuario:', 'santuario:1:2'])(
    '%j → null',
    (raw) => {
      expect(parseDomainParam(raw)).toBeNull();
    },
  );

  it('null → null', () => {
    expect(parseDomainParam(null)).toBeNull();
  });
});

describe('parseChargeParam: inteiro de 0 a 100 (DDB-02)', () => {
  it('0 e 100 aceitos', () => {
    expect(parseChargeParam('0')).toBe(0);
    expect(parseChargeParam('100')).toBe(100);
    expect(parseChargeParam('50')).toBe(50);
  });

  it.each(['101', '-1', '5.5', '', 'abc'])('%j → null', (raw) => {
    expect(parseChargeParam(raw)).toBeNull();
  });

  it('null → null', () => {
    expect(parseChargeParam(null)).toBeNull();
  });
});

describe('parseMissesParam: inteiro de 0 a 2 (DDB-02)', () => {
  it('0 e 2 aceitos', () => {
    expect(parseMissesParam('0')).toBe(0);
    expect(parseMissesParam('2')).toBe(2);
  });

  it.each(['3', '-1', '1.5', '', 'x'])('%j → null', (raw) => {
    expect(parseMissesParam(raw)).toBeNull();
  });
});
