import type Phaser from 'phaser';
import type { ParsedSheet } from '../../core/pixelGrid';
import { ART_SCALE, PALETTE } from './palette';

/**
 * Pinta uma folha já validada numa textura de canvas: frames lado a lado na horizontal, cada texel como um
 * bloco ART_SCALE x ART_SCALE com a cor da paleta, e um frame nomeado por quadro (a chave do frame na folha).
 */
export function registerSheet(scene: Phaser.Scene, textureKey: string, sheet: ParsedSheet): void {
  const w = sheet.width * ART_SCALE;
  const h = sheet.height * ART_SCALE;
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
        ctx.fillRect(x0 + x * ART_SCALE, y * ART_SCALE, ART_SCALE, ART_SCALE);
      }),
    );
    texture.add(frame.key, 0, x0, 0, w, h);
  });
  texture.refresh();
}
