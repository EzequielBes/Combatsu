import Phaser from 'phaser';
import { clampCenter } from '../../core/cameraFollow';
import { parseLevel, type LevelData } from '../../core/level';
import { Rng } from '../../core/rng';
import { type RunCommand } from '../../core/run';
import { composeArea, konbiniArea, parseModulesParam, Stage, type AreaGrid, type AreaSpan } from '../../core/stage';
import { requireSpawnPoints } from '../../core/waves';
import { LEVEL_1 } from '../../data/level1';
import { COMBAT_IDS, MODULES } from '../../data/modules';
import { AREA } from '../../data/tuning';
import { debugParam, SPAWN_LIFT } from './params';
import type { TestScene } from '../TestScene';

/** Seed fixa do fundo do título (ARE-09): o `rua` sozinho, selado; a seed da run só entra no `roundStart(1)`. */
const TITLE_SEED = 1;

/** Grade e dados prontos para a cena construir (usado no `create`). */
export interface InitialArea {
  rows: readonly string[];
  level: LevelData;
  /** Trechos com tema por módulo (THM-02); ausente na sala. */
  spans?: readonly AreaSpan[];
}

/**
 * Liga a run ao mundo no modo modular (ARE-09..11, TRV-03..10, KON-01..05): decide a área de cada comando, abre o
 * selo, detecta a saída e conduz o fade. No modo sala fica inerte: a cena constrói a `LEVEL_1` e nada mais muda.
 */
export class AreaDirector {
  constructor(
    readonly s: TestScene,
    readonly mode: 'modular' | 'sala',
  ) {}

  /** `true` entre o início do fade de saída e o fim do fade de entrada; a cena dá input neutro ao player (TRV-10). */
  transitioning = false;

  /** Ids dos módulos da área atual, na ordem (campo `area.modules` do snapshot, LEG-05). */
  moduleIds: string[] = [];

  private stage: Stage | null = null;
  private onFadeOut: (() => void) | null = null;

  /**
   * Área que a cena constrói no `create`: a `LEVEL_1` na sala, ou o `rua` selado de fundo do título no modo
   * modular (a seed da run só entra no `roundStart(1)`, que reconstrói).
   */
  initialArea(): InitialArea {
    // A instância vive a cena toda: um reinício (R) no meio de uma transição não pode deixar estado para trás.
    this.transitioning = false;
    this.onFadeOut = null;
    this.stage = null;
    if (this.mode === 'sala') {
      const level = parseLevel(LEVEL_1);
      requireSpawnPoints(level, 'LEVEL_1');
      this.moduleIds = [];
      return { rows: LEVEL_1, level };
    }
    const grid = composeArea(['rua'], MODULES, new Rng(TITLE_SEED));
    const level = parseLevel(grid.rows);
    requireSpawnPoints(level, 'rua');
    this.moduleIds = grid.spans.map((sp) => sp.id);
    return { rows: grid.rows, level, spans: grid.spans };
  }

  /** Comandos da `Run` que mudam o mundo (design "Fluxo de comandos"); chamado antes do tratamento de hoje. */
  onCommand(cmd: RunCommand): void {
    if (this.mode === 'sala') return;
    switch (cmd.type) {
      case 'startRun':
        this.stage = new Stage(
          this.s.run.stageRng!,
          this.s.run.slotRng!,
          parseModulesParam(debugParam('modules'), COMBAT_IDS),
        );
        break;
      case 'roundStart':
        if (this.stage) this.rebuild(this.stage.compose(this.stage.nextArea(cmd.round)));
        break;
      case 'roundCleared':
        this.s.world.openSeal();
        break;
      case 'shopOpen':
        this.rebuild(konbiniArea(MODULES));
        break;
      default:
        break;
    }
  }

  /** Por quadro: em `traverse`, o centro do player passar da borda esquerda do selo começa a saída (TRV-05). */
  update(_dtMs: number): void {
    if (this.mode === 'sala') return;
    // A morte durante o fade de saída cancela a transição: o `gameOver` manda (design "Risks & Concerns").
    if (this.onFadeOut && this.s.player.dead) {
      this.cancelExit();
      return;
    }
    const exitX = this.s.world.exitX;
    if (this.transitioning || this.s.run.state !== 'traverse' || exitX === null || this.s.player.dead) return;
    if (this.s.player.sprite.x > exitX) this.beginExit();
  }

  /**
   * Fecha a loja com fade (KON-02, TRV-10): escurece em `AREA.fadeMs` e só então chama `close` (que fecha de verdade:
   * `run.closeShop()`, retoma o Matter e esconde o painel). O `roundStart` seguinte reconstrói e clareia.
   */
  closeShopWithFade(close: () => void): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.fadeOutThen(close);
  }

  /** Reconstrói o mundo com a grade da área (ARE-09, ARE-10, ARE-11) e clareia a câmera. */
  rebuild(grid: AreaGrid): void {
    const s = this.s;
    s.world.teardown();
    const level = parseLevel(grid.rows);
    // KON-05: a konbini (sem selo) nunca tem ponto de spawn; toda área de combate ou de chefe tem de ter.
    if (grid.sealCol !== null) requireSpawnPoints(level, grid.spans.map((sp) => sp.id).join(','));
    s.level = level;
    s.world.build(grid.rows, level, grid.spans);
    s.player.setSpawn(level.player.x, level.player.y - SPAWN_LIFT);
    s.player.placeAtSpawn();
    s.cameras.main.setBounds(0, 0, level.widthPx, level.heightPx);
    const follow = s.camera.followConfig();
    s.camera.camCenter = clampCenter(s.player.renderPos, follow.view, follow.bounds);
    s.camera.followCamera(0);
    // O `worldView` só se atualiza no `preRender` do desenho: sem isto os `spawn` do mesmo update veriam a vista da área antiga (SPN-07).
    s.cameras.main.preRender();
    s.spawner.spawnLastUsed.clear();
    this.moduleIds = grid.spans.map((sp) => sp.id);
    s.cameras.main.fadeIn(AREA.fadeMs);
    if (this.transitioning) {
      s.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, () => {
        this.transitioning = false;
      });
    }
    s.snapshot.debugEvents.push(`areaBuilt:${this.moduleIds.join(',')}`);
  }

  private beginExit(): void {
    this.transitioning = true;
    this.fadeOutThen(() => this.finishExit());
  }

  /** Fim do fade de saída (TRV-07, TRV-08): credita os pickups, destrói o objeto da mão e pede a saída à run. */
  private finishExit(): void {
    const s = this.s;
    if (s.player.dead || s.run.state !== 'traverse') {
      this.transitioning = false;
      return;
    }
    for (const p of s.pickups.takeAll()) s.drops.onPickupCollected(p);
    s.hud.setFragments(s.wallet.fragments);
    s.player.dropHeldForTransition();
    s.run.exitReached();
  }

  private fadeOutThen(done: () => void): void {
    const cam = this.s.cameras.main;
    const handler = (): void => {
      this.onFadeOut = null;
      done();
    };
    this.onFadeOut = handler;
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, handler);
    cam.fadeOut(AREA.fadeMs);
  }

  private cancelExit(): void {
    if (this.onFadeOut) this.s.cameras.main.off(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, this.onFadeOut);
    this.onFadeOut = null;
    this.transitioning = false;
  }
}
