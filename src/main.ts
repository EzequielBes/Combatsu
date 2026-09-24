import Phaser from 'phaser';
import { PALETTE } from './game/art/palette';
import { installDebugApi } from './game/debugApi';
import { isDebug } from './game/debug';
import { TestScene } from './scenes/TestScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: document.body,
  width: 960,
  height: 540,
  pixelArt: true,
  roundPixels: true,
  // Cor de limpeza do canvas vem da paleta (céu profundo), para nenhum furo mostrar cor fora dela (ART-01).
  backgroundColor: `#${PALETTE.e.toString(16).padStart(6, '0')}`,
  physics: {
    default: 'matter',
    matter: { gravity: { x: 0, y: 1 }, debug: false },
  },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [TestScene],
});

// `window.__game` só com `?debug` no boot (FND-09, FND-10); ligar o debug depois pelo F1 não o cria.
installDebugApi(game, window, isDebug());
