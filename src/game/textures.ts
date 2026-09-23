import type Phaser from 'phaser';

/** Chaves de textura. Trocar placeholder por arte real = carregar um PNG com a mesma chave. */
export const TEX = {
  terrain: 'terrain',
  player: 'player',
  /** Folha animada do player (o `player` acima é o corpo físico invisível). */
  playerArt: 'player-art',
  /** Folha animada do inimigo (o corpo físico é um retângulo Matter, sem textura). */
  enemy: 'enemy',
  chair: 'chair',
  bottle: 'bottle',
  smoke: 'smoke',
  /** Partes do ragdoll do inimigo, desenhadas com as cores da folha dele (CHR-04). */
  ragHead: 'rag-head',
  ragTorso: 'rag-torso',
  ragLimb: 'rag-limb',
  /** Efeitos (FX-03/04): estrela do ponto de contato e pedacinhos da faísca e da poeira. */
  fxStar: 'fx-star',
  fxBit: 'fx-bit',
  /** Molduras das barras de vida do player (HUD-01) e do inimigo (HUD-02). */
  hudBar: 'hud-bar',
  enemyBar: 'enemy-bar',
} as const;

export const SIZE = {
  player: { w: 20, h: 36 },
  enemy: { w: 22, h: 36 },
} as const;

function box(scene: Phaser.Scene, key: string, w: number, h: number, fill: number, eye = false): void {
  if (scene.textures.exists(key)) return;
  const g = scene.add.graphics();
  g.fillStyle(fill, 1);
  g.fillRect(0, 0, w, h);
  g.lineStyle(2, 0x000000, 1);
  g.strokeRect(1, 1, w - 2, h - 2);
  if (eye) {
    // "olho" do lado direito: mostra para onde o personagem olha
    g.fillStyle(0xffffff, 1);
    g.fillRect(w - 7, 6, 4, 4);
  }
  g.generateTexture(key, w, h);
  g.destroy();
}

export function createPlaceholderTextures(scene: Phaser.Scene): void {
  box(scene, TEX.terrain, 32, 32, 0x4a4e69);
  box(scene, TEX.player, SIZE.player.w, SIZE.player.h, 0x3a86ff, true);
}
