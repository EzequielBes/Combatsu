import type Phaser from 'phaser';
import { parseSheet } from '../../core/pixelGrid';
import { TEX, createPlaceholderTextures } from '../textures';
import { ENEMY_BAR, HUD_BAR } from './hud';
import { PALETTE_KEYS } from './palette';
import { registerSheet } from './render';
import { ENEMY_ANIMS, ENEMY_FRAMES, ENEMY_RAG_PARTS } from './sprites/enemy';
import { PLAYER_ANIMS, PLAYER_FRAMES, type AnimDef } from './sprites/player';
import { PROP_SHARDS, PROP_SPRITES, SMOKE, SMOKE_CURSE } from './sprites/props';
import { registerTiles } from './tiles';

/** Chave da animação do player no AnimationManager (global do jogo). */
export const playerAnimKey = (name: string): string => `player-${name}`;
/** Chave da animação do inimigo no AnimationManager. */
export const enemyAnimKey = (name: string): string => `enemy-${name}`;

/** Textura dos estilhaços de um objeto, pela textura do próprio objeto (PRP-01). */
export const shardsKey = (texture: string): string => `${texture}-shards`;

/**
 * Registra toda a arte da cena: tileset, folhas do player e do inimigo, partes do ragdoll, objetos com os seus
 * estilhaços, fumaça e as animações. O placeholder do player fica, porque é a textura do corpo físico invisível
 * (o tamanho dela define o corpo).
 */
export function createArt(scene: Phaser.Scene): void {
  createPlaceholderTextures(scene);
  registerTiles(scene);
  registerSheet(scene, TEX.playerArt, parseSheet('player', PLAYER_FRAMES, PALETTE_KEYS));
  registerAnims(scene, TEX.playerArt, PLAYER_ANIMS, playerAnimKey);
  registerSheet(scene, TEX.enemy, parseSheet('enemy', ENEMY_FRAMES, PALETTE_KEYS));
  registerAnims(scene, TEX.enemy, ENEMY_ANIMS, enemyAnimKey);
  // Uma textura por parte do ragdoll, nas cores da folha do inimigo (CHR-04).
  const rag = {
    [TEX.ragHead]: ENEMY_RAG_PARTS.head,
    [TEX.ragTorso]: ENEMY_RAG_PARTS.torso,
    [TEX.ragLimb]: ENEMY_RAG_PARTS.limb,
  };
  for (const [key, grid] of Object.entries(rag)) {
    registerSheet(scene, key, parseSheet(key, { [key]: grid }, PALETTE_KEYS));
  }
  // Objetos: a textura de 1 frame define o corpo físico (26x26 e 8x20 px, iguais aos placeholders antigos).
  const props = { [TEX.chair]: 'chair', [TEX.bottle]: 'bottle' } as const;
  for (const [texture, key] of Object.entries(props)) {
    registerSheet(scene, texture, parseSheet(key, { [key]: PROP_SPRITES[key] }, PALETTE_KEYS));
    const shards = Object.fromEntries(PROP_SHARDS[key].map((s) => [s.key, s.grid]));
    registerSheet(scene, shardsKey(texture), parseSheet(shardsKey(key), shards, PALETTE_KEYS));
  }
  registerSheet(scene, TEX.smoke, parseSheet('smoke', { smoke: SMOKE }, PALETTE_KEYS));
  registerSheet(scene, TEX.smokeCurse, parseSheet('smoke-curse', SMOKE_CURSE, PALETTE_KEYS));
  registerSheet(scene, TEX.hudBar, parseSheet('hud-bar', { bar: HUD_BAR }, PALETTE_KEYS));
  registerSheet(scene, TEX.enemyBar, parseSheet('enemy-bar', { bar: ENEMY_BAR }, PALETTE_KEYS));
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
