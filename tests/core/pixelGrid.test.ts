import { describe, expect, it } from 'vitest';
import { parseSheet } from '../../src/core/pixelGrid';

const COLORS: ReadonlySet<string> = new Set(['k', 'w', 'r']);

describe('parseSheet', () => {
  it('devolve largura, altura e células por frame, com "." como transparente (null)', () => {
    const sheet = parseSheet('heroi', { a: ['k.w', 'rrk'] }, COLORS);
    expect(sheet.name).toBe('heroi');
    expect(sheet.width).toBe(3);
    expect(sheet.height).toBe(2);
    expect(sheet.frames).toEqual([
      {
        key: 'a',
        cells: [
          ['k', null, 'w'],
          ['r', 'r', 'k'],
        ],
      },
    ]);
  });

  it('preserva a ordem em que os frames foram escritos', () => {
    const sheet = parseSheet('heroi', { idle: ['k'], run: ['w'], jab: ['.'] }, COLORS);
    expect(sheet.frames.map((f) => f.key)).toEqual(['idle', 'run', 'jab']);
    expect(sheet.frames[2].cells).toEqual([[null]]);
  });

  it('rejeita linhas de larguras diferentes citando o sprite', () => {
    const call = () => parseSheet('heroi', { a: ['kkk', 'kk'] }, COLORS);
    expect(call).toThrow(/heroi/);
    expect(call).toThrow(/largura/);
  });

  it('rejeita caractere fora da paleta citando o sprite, o caractere e a posição', () => {
    const call = () => parseSheet('heroi', { a: ['kkk', 'kxk'] }, COLORS);
    expect(call).toThrow(/heroi/);
    expect(call).toThrow(/'x'/);
    expect(call).toThrow(/\(1, 1\)/);
  });

  it('rejeita frames de tamanhos diferentes citando o sprite', () => {
    expect(() => parseSheet('inimigo', { a: ['kk', 'kk'], b: ['kk'] }, COLORS)).toThrow(/inimigo.*tamanho/);
    expect(() => parseSheet('inimigo', { a: ['kk'], b: ['kkk'] }, COLORS)).toThrow(/inimigo.*tamanho/);
  });

  it('rejeita folha sem frames e frame sem linhas citando o sprite', () => {
    expect(() => parseSheet('vazio', {}, COLORS)).toThrow(/vazio.*sem frames/);
    expect(() => parseSheet('oco', { a: [] }, COLORS)).toThrow(/oco.*sem linhas/);
  });
});
