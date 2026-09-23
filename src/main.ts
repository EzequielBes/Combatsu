import Phaser from 'phaser';
import { TestScene } from './scenes/TestScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: document.body,
  width: 960,
  height: 540,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#1b1b2f',
  physics: {
    default: 'matter',
    matter: { gravity: { x: 0, y: 1 }, debug: false },
  },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [TestScene],
});
