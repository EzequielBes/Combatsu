import { SCREEN, UI_SCALE, UI_SIZE } from '../../game/art/hd/screen';
import Phaser from 'phaser';
import { SLOWMO_TINT_COLOR } from '../../game/art/combatColors';
import { isDebug, onDebugChange } from '../../game/debug';
import { EnergyHud } from '../../game/EnergyHud';
import { FxLab } from '../../game/FxLab';
import { GAME_NAME, Hud } from '../../game/Hud';
import { Callout } from '../../game/techFx/Callout';
import type { TestScene } from '../TestScene';

/** Quanto tempo (ms) o painel de controles fica na tela ao iniciar e a cada reinício (HUD-03). */
export const CONTROLS_MS = 8000;

/** Alpha do tom azulado da câmera lenta (DOD-12). */
export const SLOWMO_TINT_ALPHA = 0.22;

/** Câmera de UI, HUD, painel de controles e o tom da câmera lenta. */
export class UiSetup {
  constructor(readonly s: TestScene) {}

  /** Tom azulado sobre a tela enquanto a câmera lenta está ativa (DOD-12), na câmera de UI. */
  slowTint!: Phaser.GameObjects.Rectangle;

  /**
   * Duas câmeras (AD-003): a principal desenha o mundo com zoom e a de UI (zoom 1, sem scroll) só a `uiLayer`.
   * Todo objeto que entra na cena depois (inimigo que renasce, partículas, hitbox, debug da física) é ignorado
   * pela câmera de UI, a menos que entre na `uiLayer`.
   */
  addUiCamera(): void {
    this.s.uiLayer = this.s.add.layer();
    this.s.cameras.main.ignore(this.s.uiLayer);
    const ui = this.s.cameras.add(0, 0, SCREEN.w, SCREEN.h, false, 'ui');
    // Com `?hd=1` (canvas 1280x720) a UI continua desenhada em 960x540: origem no canto e zoom 4/3 (os objetos da UI têm
    // scrollFactor 0, então o scroll não serve para o ajuste). Sem a chave: zoom 1, e a origem não muda nada.
    ui.setOrigin(0, 0).setZoom(UI_SCALE);
    const route = (obj: Phaser.GameObjects.GameObject): void => {
      // Um objeto nasce na lista da cena e só depois é movido para a camada: aí ele volta a ser da UI.
      if (obj.displayList === this.s.uiLayer) {
        obj.cameraFilter &= ~ui.id;
        // A câmera de UI amplia por `UI_SCALE`: o texto é rasterizado já nesse tamanho para não sair borrado.
        if (UI_SCALE !== 1 && obj instanceof Phaser.GameObjects.Text) obj.setResolution(UI_SCALE);
      } else ui.ignore(obj);
    };
    this.s.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, route);
    this.s.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.s.events.off(Phaser.Scenes.Events.ADDED_TO_SCENE, route),
    );
  }

  /** FXL-04/08: legenda e rótulo de velocidade do laboratório, só linhas extras quando `fxLab` existe. */
  controlsLines(): string[] {
    return [
      'A/D ou ←/→: mover   Espaço/W: pular (segure = mais alto)',
      'J leve · K forte · U guarda/parry · Q esquiva · E pegar',
      'E: pegar / arremessar   S+E: largar   L / I: técnicas   F (segurar): Energia Reversa',
      'S+Q: abaixar   U+direção: virar na guarda   defesa certa + J: Contra',
      'R: reiniciar   Tab: mostrar/esconder controles',
      ...(isDebug() ? ['F1: sair do debug   H: física e hitboxes   1/2: golpe leve/forte de teste'] : []),
      ...(this.s.fxLab ? [FxLab.LEGEND, this.s.fxLab.speedLabel] : []),
    ];
  }

  /** Reaplica `controlsLines()` no painel (FXL-08: o rótulo de velocidade muda ao apertar 0). */
  refreshControlsText(): void {
    this.s.hud.setControlsText(this.controlsLines().join('\n'));
  }

  addHud(): void {
    this.s.hud = new Hud(this.s, this.s.uiLayer, this.controlsLines().join('\n'));
    this.s.energyHud = new EnergyHud(this.s, this.s.uiLayer);
    this.s.callout = new Callout(this.s, this.s.uiLayer);
    // DOD-12: tom azulado por cima do mundo na câmera lenta, na `uiLayer` (a câmera de UI é a que o desenha).
    this.slowTint = this.s.add
      .rectangle(0, 0, UI_SIZE.w, UI_SIZE.h, SLOWMO_TINT_COLOR, SLOWMO_TINT_ALPHA)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(90)
      .setVisible(false);
    this.s.uiLayer.add(this.slowTint);
    this.s.hud.setPlayerHp(this.s.player.hp, this.s.player.maxHp);
    // FXL-04: no laboratório a legenda fica sempre visível, não só os primeiros `CONTROLS_MS`.
    this.s.hud.showControls(this.s.fxLab ? Number.MAX_SAFE_INTEGER : CONTROLS_MS);
    // Boot em `title` (RUN-01/RHUD-05): tela com o nome do jogo até o primeiro J/Enter.
    this.s.hud.setCenter([GAME_NAME, 'J / Enter para começar']);
    // Tab alterna o painel; a captura impede o navegador de tirar o foco do jogo (HUD-03).
    this.s.input.keyboard!.addCapture('TAB');
    this.s.onKey('TAB', () => this.s.hud.toggleControls());
    const off = onDebugChange((on) => {
      this.refreshControlsText();
      // Saindo do debug, o desenho da física não pode continuar ligado.
      if (!on && this.s.matter.world.drawDebug) this.toggleDebugDraw();
    });
    this.s.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
  }

  toggleDebugDraw(): void {
    const world = this.s.matter.world;
    if (!world.debugGraphic) {
      // createDebugGraphic já liga o desenho; sem isso o primeiro H desligava na hora e parecia não funcionar.
      world.createDebugGraphic();
      world.drawDebug = false;
    }
    world.drawDebug = !world.drawDebug;
    world.debugGraphic.clear();
  }
}
