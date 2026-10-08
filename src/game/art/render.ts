import type Phaser from 'phaser';
import type { ParsedSheet } from '../../core/pixelGrid';
import { ART_SCALE, PALETTE } from './palette';

/**
 * Pinta uma folha já validada numa textura de canvas: frames lado a lado na horizontal, cada texel como um
 * bloco ART_SCALE x ART_SCALE com a cor da paleta, e um frame nomeado por quadro (a chave do frame na folha).
 */
export function registerSheet(
  scene: Phaser.Scene,
  textureKey: string,
  sheet: ParsedSheet,
  /** Px de mundo por texel: o padrão é o da arte antiga; as folhas HD passam 1. */
  scale: number = ART_SCALE,
): void {
  const w = sheet.width * scale;
  const h = sheet.height * scale;
  // As texturas são do jogo, não da cena: no reinício a antiga ainda existe.
  if (scene.textures.exists(textureKey)) scene.textures.remove(textureKey);
  const texture = scene.textures.createCanvas(textureKey, w * sheet.frames.length, h);
  if (!texture) throw new Error(`Não foi possível criar a textura '${textureKey}'`);

  const ctx = texture.getContext();
  sheet.frames.forEach((frame, i) => {
    const x0 = i * w;
    frame.cells.forEach((row, y) =>
      row.forEach((ch, x) => {
        if (ch === null) return;
        ctx.fillStyle = `#${PALETTE[ch].toString(16).padStart(6, '0')}`;
        ctx.fillRect(x0 + x * scale, y * scale, scale, scale);
      }),
    );
    texture.add(frame.key, 0, x0, 0, w, h);
  });
  texture.refresh();
}

/** Folha indexada: quadros de `frameW x frameH` com índices numa tabela de cores (0 = transparente). */
export interface IndexedSheet {
  frameW: number;
  frameH: number;
  colors: readonly number[];
  frames: Readonly<Record<string, Uint8Array>>;
}

/** Largura máxima da textura de uma folha indexada (px); passou disso, os quadros quebram em linhas. */
const MAX_SHEET_W = 4096;

/**
 * Pinta uma folha indexada numa textura de canvas a 1 px por texel (sem `ART_SCALE`), um frame nomeado por quadro.
 * Os quadros ficam lado a lado e quebram em nova linha antes de passar de 4096 px de largura.
 */
export function registerIndexedSheet(scene: Phaser.Scene, textureKey: string, sheet: IndexedSheet): void {
  const names = Object.keys(sheet.frames);
  const { frameW: fw, frameH: fh } = sheet;
  const perRow = Math.max(1, Math.min(names.length, Math.floor(MAX_SHEET_W / fw)));
  const rows = Math.max(1, Math.ceil(names.length / perRow));
  if (scene.textures.exists(textureKey)) scene.textures.remove(textureKey);
  const texture = scene.textures.createCanvas(textureKey, perRow * fw, rows * fh);
  if (!texture) throw new Error(`Não foi possível criar a textura '${textureKey}'`);

  const ctx = texture.getContext();
  const css = sheet.colors.map((c) => `#${c.toString(16).padStart(6, '0')}`);
  names.forEach((name, i) => {
    const x0 = (i % perRow) * fw;
    const y0 = Math.floor(i / perRow) * fh;
    const px = sheet.frames[name];
    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        const idx = px[y * fw + x];
        if (idx === 0) continue;
        ctx.fillStyle = css[idx];
        ctx.fillRect(x0 + x, y0 + y, 1, 1);
      }
    }
    texture.add(name, 0, x0, y0, fw, fh);
  });
  texture.refresh();
}
