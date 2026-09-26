import type Phaser from 'phaser';
import type { CursedEnergy } from '../core/energy';
import type { Loadout } from '../core/loadout';
import { TECHNIQUES } from '../data/techniques';
import {
  ENERGY_BAR_BG_COLOR,
  ENERGY_BAR_FILL_COLOR,
  ENERGY_BAR_FLASH_COLOR,
  ENERGY_BAR_MARK_COLOR,
  TECH_ICON_OVERLAY_COLOR,
} from './art/techColors';
import { TEX } from './textures';

/** Alinhada com a barra de HP (Hud.ts: `MARGIN` 12, `LABEL_W` 26), logo abaixo dela (TEC-07). */
const BAR_X = 12 + 26;
const BAR_Y = 12 + 20;
const BAR_W = 104;
const BAR_H = 6;
const MARK_W = 2;
/** Ícones de slot (kanji reduzido da folha 24x24, TEC-09), lado a lado abaixo da barra. */
const ICON_SIZE = 24;
const ICON_GAP = 6;
const ICON_Y = BAR_Y + BAR_H + 6;
/** Duração do flash de recusa por falta de energia (TEC-10). */
const FLASH_MS = 300;
const DEPTH = 101;

interface SlotIcon {
  icon: Phaser.GameObjects.Sprite;
  overlay: Phaser.GameObjects.Rectangle;
}

/**
 * HUD de energia amaldiçoada e slots de técnica (TEC-07/09/10/11/12), na `uiLayer` (AD-003): barra sob a de HP
 * com marca de custo por slot equipado, ícone com overlay de recarga e flash de recusa. Só desenha; a lógica é
 * de `CursedEnergy`/`Loadout` (core).
 */
export class EnergyHud {
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly marks: [Phaser.GameObjects.Rectangle, Phaser.GameObjects.Rectangle];
  private readonly slots: [SlotIcon, SlotIcon];
  private flashMs = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Layer,
  ) {
    this.bg = scene.add.rectangle(BAR_X, BAR_Y, BAR_W, BAR_H, ENERGY_BAR_BG_COLOR).setOrigin(0, 0);
    this.fill = scene.add.rectangle(BAR_X, BAR_Y, 0, BAR_H, ENERGY_BAR_FILL_COLOR).setOrigin(0, 0);
    this.marks = [0, 1].map(() =>
      scene.add.rectangle(BAR_X, BAR_Y, MARK_W, BAR_H, ENERGY_BAR_MARK_COLOR).setOrigin(0, 0).setVisible(false),
    ) as [Phaser.GameObjects.Rectangle, Phaser.GameObjects.Rectangle];
    this.slots = [0, 1].map((i) => {
      const x = BAR_X + i * (ICON_SIZE + ICON_GAP);
      const icon = scene.add
        .sprite(x, ICON_Y, TEX.kanji, 'kuro')
        .setOrigin(0, 0)
        .setDisplaySize(ICON_SIZE, ICON_SIZE)
        .setVisible(false);
      // Overlay escuro do topo para baixo (TEC-09): encolhe conforme a recarga esvazia.
      const overlay = scene.add.rectangle(x, ICON_Y, ICON_SIZE, 0, TECH_ICON_OVERLAY_COLOR, 0.75).setOrigin(0, 0).setVisible(false);
      return { icon, overlay };
    }) as [SlotIcon, SlotIcon];

    const objs: (Phaser.GameObjects.Rectangle | Phaser.GameObjects.Sprite)[] = [
      this.bg,
      this.fill,
      ...this.marks,
      ...this.slots.flatMap((s) => [s.icon, s.overlay]),
    ];
    for (const o of objs) o.setScrollFactor(0).setDepth(DEPTH);
    layer.add(objs);
  }

  /** Chamado toda vez que uma conjuração é recusada por falta de energia (TEC-10; `techDenied:energy`). */
  flashDenied(): void {
    this.flashMs = FLASH_MS;
  }

  update(dtMs: number, energy: CursedEnergy, loadout: Loadout): void {
    const frac = Math.max(0, Math.min(1, energy.cur / energy.max));
    this.fill.width = BAR_W * frac; // TEC-07

    loadout.slotsView.forEach((s, i) => {
      const mark = this.marks[i];
      const slot = this.slots[i];
      if (!s) {
        mark.setVisible(false);
        slot.icon.setVisible(false);
        slot.overlay.setVisible(false);
        return;
      }
      const def = TECHNIQUES[s.id];
      const cost = loadout.cost(s.id);
      mark.setPosition(BAR_X + (BAR_W * cost) / energy.max, BAR_Y).setVisible(true); // TEC-12
      slot.icon.setFrame(def.kanji).setVisible(true);
      const cdFrac = Math.max(0, Math.min(1, loadout.cooldownOf(i as 0 | 1) / def.cooldownMs));
      slot.overlay.height = ICON_SIZE * cdFrac; // TEC-09
      slot.overlay.setVisible(cdFrac > 0);
    });

    this.flashMs = Math.max(0, this.flashMs - dtMs);
    this.fill.setFillStyle(this.flashMs > 0 ? ENERGY_BAR_FLASH_COLOR : ENERGY_BAR_FILL_COLOR);
  }

  /** `hud.energy`/`hud.techIgnoredByMain` do snapshot (TEC-08/11). */
  debugState(): {
    techIgnoredByMain: boolean;
    energy: {
      width: number;
      fillWidth: number;
      marks: (number | null)[];
      icons: { cooldownOverlayHeight: number }[];
      flashing: boolean;
    };
  } {
    const mainId = this.scene.cameras.main.id;
    const allObjs: (Phaser.GameObjects.Rectangle | Phaser.GameObjects.Sprite)[] = [
      this.bg,
      this.fill,
      ...this.marks,
      ...this.slots.flatMap((s) => [s.icon, s.overlay]),
    ];
    return {
      // TEC-11: checagem real (a `uiLayer` está de fato ignorada pela câmera principal e todo objeto está nela).
      techIgnoredByMain: (this.layer.cameraFilter & mainId) === mainId && allObjs.every((o) => o.displayList === this.layer),
      energy: {
        width: BAR_W,
        fillWidth: this.fill.width,
        marks: this.marks.map((m) => (m.visible ? m.x - BAR_X : null)),
        icons: this.slots.map((s) => ({ cooldownOverlayHeight: s.overlay.visible ? s.overlay.height : 0 })),
        flashing: this.flashMs > 0,
      },
    };
  }
}
