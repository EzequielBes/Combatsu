import type Phaser from 'phaser';

/** Chaves de textura. Trocar placeholder por arte real = carregar um PNG com a mesma chave. */
export const TEX = {
  terrain: 'terrain',
  player: 'player',
  /** Folha animada do player (o `player` acima é o corpo físico invisível). */
  playerArt: 'player-art',
  enemy: 'enemy',
  chair: 'chair',
  bottle: 'bottle',
  smoke: 'smoke',
  ragHead: 'rag-head',
  ragTorso: 'rag-torso',
  ragLimb: 'rag-limb',
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
  box(scene, TEX.enemy, SIZE.enemy.w, SIZE.enemy.h, 0xd62828, true);
  box(scene, TEX.chair, 26, 26, 0x8d5524);
  box(scene, TEX.bottle, 8, 20, 0x2a9d8f);
  box(scene, TEX.ragHead, 10, 10, 0xd62828);
  box(scene, TEX.ragTorso, 14, 18, 0xb71c1c);
  box(scene, TEX.ragLimb, 5, 14, 0xd62828);
  if (!scene.textures.exists(TEX.smoke)) {
    const g = scene.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture(TEX.smoke, 8, 8);
    g.destroy();
  }
}
