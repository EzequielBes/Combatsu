import { describe, expect, it } from 'vitest';
import { parseSheet } from '../../../src/core/pixelGrid';
import { PALETTE_KEYS } from '../../../src/game/art/palette';
import { WEAPON_FX, weaponFxSheets, weaponFxTex, type ImbuedWeapon } from '../../../src/game/art/hd/weaponFx';
import artIndexSource from '../../../src/game/art/index.ts?raw';
import { artMeasure } from './helpers';

const WEAPONS = Object.keys(WEAPON_FX) as ImbuedWeapon[];
const opaque = (rows: readonly string[]): number => rows.join('').replaceAll('.', '').length;
/** O risco sem o contorno escuro `K` (que só segura a leitura sobre a pedra clara). */
const stroke = (rows: readonly string[]): string[] => rows.map((row) => row.replaceAll('K', '.'));
const framesOf = (weapon: ImbuedWeapon, part: 'trail' | 'impact'): string[][] =>
  Object.values(WEAPON_FX[weapon][part].frames);

describe('efeitos HD das armas imbuídas: folhas', () => {
  it('toda folha passa no parseSheet só com cores da paleta e quadros do mesmo tamanho', () => {
    for (const { key, frames } of weaponFxSheets()) {
      expect(() => parseSheet(key, frames, PALETTE_KEYS), key).not.toThrow();
    }
  });

  it('todo quadro tem pelo menos 14 px de largura (o Phaser 4 não desenha folha mais estreita) e nenhum é vazio', () => {
    for (const { key, frames } of weaponFxSheets()) {
      for (const [name, rows] of Object.entries(frames)) {
        expect(rows[0].length, `${key}/${name}`).toBeGreaterThanOrEqual(14);
        expect(opaque(rows), `${key}/${name}`).toBeGreaterThan(0);
      }
    }
  });

  it('as 4 armas têm rastro e impacto de 4 quadros, com a âncora dentro do quadro', () => {
    expect(WEAPONS).toEqual(['lamina', 'bastao', 'lanca', 'osso']);
    for (const weapon of WEAPONS) {
      for (const part of ['trail', 'impact'] as const) {
        const sheet = WEAPON_FX[weapon][part];
        expect(Object.keys(sheet.frames), `${weapon}/${part}`).toEqual([0, 1, 2, 3].map((i) => `${part}-${i}`));
        const [first] = Object.values(sheet.frames);
        expect(sheet.anchor.x, `${weapon}/${part}`).toBeGreaterThanOrEqual(0);
        expect(sheet.anchor.x, `${weapon}/${part}`).toBeLessThan(first[0].length);
        expect(sheet.anchor.y, `${weapon}/${part}`).toBeGreaterThanOrEqual(0);
        expect(sheet.anchor.y, `${weapon}/${part}`).toBeLessThan(first.length);
      }
    }
  });

  it('cada quadro muda bastante do anterior (a sequência anda) e o último é o mais apagado do impacto', () => {
    for (const weapon of WEAPONS) {
      for (const part of ['trail', 'impact'] as const) {
        const frames = framesOf(weapon, part);
        for (let i = 1; i < frames.length; i++) {
          expect(artMeasure.difference(frames[i - 1], frames[i]), `${weapon}/${part}-${i}`).toBeGreaterThan(0.3);
        }
      }
      const impact = framesOf(weapon, 'impact').map(opaque);
      expect(Math.min(...impact), weapon).toBe(impact[3]);
    }
  });

  it('as chaves de textura são únicas e seguem `weapon-fx-<arma>-<parte>`', () => {
    const keys = weaponFxSheets().map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain(weaponFxTex('osso', 'charge'));
    for (const key of keys) expect(key).toMatch(/^weapon-fx-(lamina|bastao|lanca|osso)-(trail|impact|charge)$/);
  });

  it('o art/index registra as folhas a 1 px por texel (sem ligar ao combate, que é da F36)', () => {
    expect(artIndexSource).toContain('weaponFxSheets()');
    expect(artIndexSource).toMatch(/registerSheet\(scene, key, parseSheet\(key, frames, PALETTE_KEYS\), 1\)/);
  });
});

describe('efeitos HD das armas imbuídas: a forma e a cor de cada arma', () => {
  const keysOf = (weapon: ImbuedWeapon, part: 'trail' | 'impact'): Set<string> =>
    new Set(framesOf(weapon, part).flatMap((rows) => [...artMeasure.keysOf(rows)]));

  it('Lâmina: o risco do rastro é branco e o impacto tem a gota vermelha com o brilho roxo', () => {
    const peak = stroke(framesOf('lamina', 'trail')[1]);
    expect(['W', 'w']).toContain(artMeasure.dominant(peak));
    expect(keysOf('lamina', 'trail').has('a')).toBe(false);
    const drop = framesOf('lamina', 'impact')[3];
    for (const key of ['r', 't', 'U']) expect(artMeasure.keysOf(drop).has(key), key).toBe(true);
  });

  it('Bastão: o arco é dourado e de madeira, e há poeira no rastro e no impacto', () => {
    const trail = keysOf('bastao', 'trail');
    for (const key of ['A', 'a', 'M', 's', 'i']) expect(trail.has(key), key).toBe(true);
    const impact = keysOf('bastao', 'impact');
    for (const key of ['s', 'i', 'I']) expect(impact.has(key), key).toBe(true);
    const lamina = stroke(framesOf('lamina', 'trail')[1]);
    expect(opaque(framesOf('bastao', 'trail')[1])).toBeGreaterThan(opaque(lamina) * 3);
  });

  it('Lança: a estocada é reta (cabe em 15 texels de altura) e a anulação tem o miolo preto', () => {
    const trail = framesOf('lanca', 'trail')[1];
    expect(trail.length).toBeLessThanOrEqual(15);
    expect(artMeasure.keysOf(trail).has('b')).toBe(true);
    const { frames, anchor } = WEAPON_FX.lanca.impact;
    expect(frames['impact-0'][anchor.y][anchor.x]).toBe('b');
    expect(artMeasure.components(frames['impact-2'])).toBeGreaterThanOrEqual(6);
  });

  it('Osso de Dragão: brasas no rastro e no impacto, com a crista de osso no rastro', () => {
    const trail = keysOf('osso', 'trail');
    for (const key of ['A', 'a', 'R', 'l']) expect(trail.has(key), key).toBe(true);
    const impact = keysOf('osso', 'impact');
    for (const key of ['A', 'a', 'w']) expect(impact.has(key), key).toBe(true);
  });

  it('os impactos não repetem a estrela radial do amaldiçoado: o Bastão sai achatado e o fogo do Osso sobe', () => {
    const extent = (rows: readonly string[], axis: 'x' | 'y'): number => {
      const at: number[] = [];
      rows.forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && at.push(axis === 'x' ? x : y)));
      return Math.max(...at) - Math.min(...at) + 1;
    };
    const smash = framesOf('bastao', 'impact')[0];
    expect(extent(smash, 'x')).toBeGreaterThan(extent(smash, 'y') * 1.6);
    const { frames, anchor } = WEAPON_FX.osso.impact;
    const burst = frames['impact-0'];
    expect(opaque(burst.slice(0, anchor.y))).toBeGreaterThan(opaque(burst.slice(anchor.y + 1)) * 2);
  });

  it('Osso de Dragão: as cargas acendem de 1 a 3, cada uma com a chama tremendo em 2 quadros', () => {
    const charge = WEAPON_FX.osso.charge!.frames;
    expect(Object.keys(charge)).toEqual(['charge-1a', 'charge-1b', 'charge-2a', 'charge-2b', 'charge-3a', 'charge-3b']);
    for (const n of [1, 2, 3]) {
      for (const flick of ['a', 'b']) {
        const rows = charge[`charge-${n}${flick}`];
        expect(artMeasure.countOf(rows, 'w'), `${n}${flick}`).toBe(n);
        expect(artMeasure.countOf(rows, 'K') > 0, `${n}${flick}`).toBe(n < 3);
      }
      expect(charge[`charge-${n}a`]).not.toEqual(charge[`charge-${n}b`]);
    }
  });
});
