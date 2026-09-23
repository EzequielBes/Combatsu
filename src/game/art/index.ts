import type Phaser from 'phaser';
import { parseSheet } from '../../core/pixelGrid';
import { TEX, createPlaceholderTextures } from '../textures';
import { PALETTE_KEYS } from './palette';
import { registerSheet } from './render';
import { PLAYER_ANIMS, PLAYER_FRAMES, type AnimDef } from './sprites/player';
import { registerTiles } from './tiles';

/** Chave da animação do player no AnimationManager (global do jogo). */
export const playerAnimKey = (name: string): string => `player-${name}`;

/**
 * Registra toda a arte da cena: tileset, folha do player e as animações.
 * Inimigo, ragdoll, cadeira, garrafa e fumaça continuam com o placeholder até ganharem arte; o placeholder do
 * player também fica, porque é a textura do corpo físico invisível (o tamanho dela define o corpo).
 */
export function createArt(scene: Phaser.Scene): void {
  createPlaceholderTextures(scene);
  registerTiles(scene);
  registerSheet(scene, TEX.playerArt, parseSheet('player', PLAYER_FRAMES, PALETTE_KEYS));
  registerAnims(scene, TEX.playerArt, PLAYER_ANIMS, playerAnimKey);
}

/**
 * Cria as animações de uma folha. Lança erro na inicialização se uma animação citar um frame que não existe.
 * No reinício da cena a textura é recriada, então a animação antiga (que aponta para os frames velhos) sai antes.
 */
export function registerAnims(
  scene: Phaser.Scene,
  textureKey: string,
  anims: Record<string, AnimDef>,
  keyOf: (name: string) => string,
): void {
  const texture = scene.textures.get(textureKey);
  for (const [name, def] of Object.entries(anims)) {
    for (const frame of def.frames) {
      if (!texture.has(frame)) {
        throw new Error(`Animação '${name}' cita o frame '${frame}', que não existe na textura '${textureKey}'`);
      }
    }
    const key = keyOf(name);
    if (scene.anims.exists(key)) scene.anims.remove(key);
    scene.anims.create({
      key,
      frames: def.frames.map((frame) => ({ key: textureKey, frame })),
      frameRate: def.frameRate,
      repeat: def.repeat,
    });
  }
}
