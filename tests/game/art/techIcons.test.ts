import { describe, expect, it } from 'vitest';
// Importar no Vitest (Node, sem window) já prova que os ícones não carregam o `phaser` como valor.
import { TECHNIQUES } from '../../../src/data/techniques';
import { PALETTE } from '../../../src/game/art/palette';
import { TECH_ICON_IDS, TECH_ICON_SIZES, techIconSheet } from '../../../src/game/art/hd/techIcons';
import { TEX } from '../../../src/game/textures';

const DOMAINS = ['santuario', 'jackpot', 'amplificacao', 'vazio'] as const;
const LEVA2 = ['convergencia', 'caes', 'trovao', 'erupcao'] as const;
const keyOf = (color: number): string | undefined => Object.keys(PALETTE).find((k) => PALETTE[k] === color);

describe('ícones HD de técnica (decisão 4, F34)', () => {
  it('cobrem as técnicas do jogo, as 3 da leva 1, as 4 da leva 2 e os 4 Domínios (IC2-01)', () => {
    for (const id of Object.keys(TECHNIQUES)) expect(TECH_ICON_IDS, id).toContain(id);
    for (const id of ['boogie', 'ressonancia', 'fala', ...LEVA2, ...DOMAINS]) expect(TECH_ICON_IDS, id).toContain(id);
    expect(TECH_ICON_IDS).toHaveLength(16);
  });

  it('as folhas têm texturas próprias, uma por tamanho', () => {
    expect(TEX.techIcons).not.toBe(TEX.techIconsSmall);
    expect(Object.values(TEX).filter((v) => v === TEX.techIcons)).toHaveLength(1);
    expect(Object.values(TEX).filter((v) => v === TEX.techIconsSmall)).toHaveLength(1);
  });

  for (const size of TECH_ICON_SIZES) {
    describe(`no tamanho ${size}`, () => {
      const sheet = techIconSheet(size);

      it('é quadrado, com um quadro de size x size por ícone e pelo menos 14 px de largura (Phaser 4)', () => {
        expect(sheet.frameW).toBe(size);
        expect(sheet.frameH).toBe(size);
        expect(sheet.frameW).toBeGreaterThanOrEqual(14);
        expect(Object.keys(sheet.frames)).toEqual([...TECH_ICON_IDS]);
        for (const id of TECH_ICON_IDS) expect(sheet.frames[id], id).toHaveLength(size * size);
      });

      it('só usa cores da paleta única (ART-01)', () => {
        for (const id of TECH_ICON_IDS) {
          const used = new Set(sheet.frames[id]);
          used.delete(0);
          for (const idx of used) {
            expect(idx, id).toBeLessThan(sheet.colors.length);
            expect(keyOf(sheet.colors[idx]), `${id}: 0x${sheet.colors[idx].toString(16)}`).toBeDefined();
          }
        }
      });

      it('todo ícone tem a mesma placa: cantos transparentes, contorno k no meio das bordas e o miolo pintado', () => {
        const at = (px: Uint8Array, x: number, y: number): string | undefined =>
          px[y * size + x] === 0 ? undefined : keyOf(sheet.colors[px[y * size + x]]);
        const mid = size / 2;
        for (const id of TECH_ICON_IDS) {
          const px = sheet.frames[id];
          for (const [x, y] of [
            [0, 0],
            [size - 1, 0],
            [0, size - 1],
            [size - 1, size - 1],
          ])
            expect(at(px, x, y), `${id} canto (${x}, ${y})`).toBeUndefined();
          for (const [x, y] of [
            [mid, 0],
            [0, mid],
            [size - 1, mid],
            [mid, size - 1],
          ])
            expect(at(px, x, y), `${id} borda (${x}, ${y})`).toBe('k');
          for (let y = 1; y < size - 1; y++)
            for (let x = 1; x < size - 1; x++) {
              const inCorner = Math.min(x, size - 1 - x) + Math.min(y, size - 1 - y) < size * 0.12;
              if (!inCorner) expect(at(px, x, y), `${id} (${x}, ${y})`).toBeDefined();
            }
        }
      });

      it('só os Domínios têm a moldura roxa de dentro', () => {
        const gap = size >= 32 ? 3 : 1;
        for (const id of TECH_ICON_IDS) {
          const px = sheet.frames[id];
          const key = keyOf(sheet.colors[px[(size / 2) * size + gap]]);
          if ((DOMAINS as readonly string[]).includes(id)) expect(key, id).toBe('u');
          else expect(key, id).not.toBe('u');
        }
      });

      it('os ícones são todos diferentes e cada um usa pelo menos 8 índices (placa, contorno e o símbolo com luz)', () => {
        for (let i = 0; i < TECH_ICON_IDS.length; i++) {
          const a = sheet.frames[TECH_ICON_IDS[i]];
          expect(new Set(a).size, TECH_ICON_IDS[i]).toBeGreaterThanOrEqual(8);
          for (let j = i + 1; j < TECH_ICON_IDS.length; j++) {
            expect(a, `${TECH_ICON_IDS[i]} vs ${TECH_ICON_IDS[j]}`).not.toEqual(sheet.frames[TECH_ICON_IDS[j]]);
          }
        }
      });
    });
  }

  it('a folha é calculada uma vez por tamanho', () => {
    expect(techIconSheet(48)).toBe(techIconSheet(48));
    expect(techIconSheet(24)).not.toBe(techIconSheet(48));
  });
});
