import type Phaser from 'phaser';
import type { CursedEnergy } from '../core/energy';
import type { Loadout } from '../core/loadout';
import { TECHNIQUES } from '../data/techniques';
import { ART_SCALE, PALETTE } from './art/palette';
import { HUD_BAR } from './art/hud';
import {
  ENERGY_BAR_BG_COLOR,
  ENERGY_BAR_FILL_COLOR,
  ENERGY_BAR_FLASH_COLOR,
  ENERGY_BAR_MARK_COLOR,
  TECH_ICON_OVERLAY_COLOR,
} from './art/techColors';
import { TEX } from './textures';

/**
 * Alinhada com a barra de HP (Hud.ts: `MARGIN` 12), abaixo do painel de controles (`PANEL_Y = 36` + ~5 linhas de
 * texto) para não empilhar em cima dele nos primeiros `CONTROLS_MS` de cada run (conferido no screenshot de T20).
 * Polimento (feat(hud)): mesma largura da barra de HP (Hud.ts: 56 texels x `ART_SCALE`) e mais alta/visível.
 */
const BAR_X = 12;
const BAR_Y = 124;
const BAR_W = HUD_BAR[0].length * ART_SCALE;
const BAR_H = 14;
const MARK_W = 3;
/** Ícones de slot (polimento): quadrados, kanji em 2x (era 24 px), borda e rótulo da tecla (`L`/`I`) no canto. */
const ICON_SIZE = 48;
const ICON_BORDER_W = 2;
const ICON_GAP = 10;
const ICON_Y = BAR_Y + BAR_H + 8;
/** Tecla principal de cada slot (TechCaster.ts: slot 1 = L/C, slot 2 = I/V). */
const SLOT_LABEL: readonly ['L', 'I'] = ['L', 'I'];
/** Duração do flash de recusa por falta de energia (TEC-10). */
const FLASH_MS = 300;
const DEPTH = 101;

interface SlotIcon {
  icon: Phaser.GameObjects.Sprite;
  border: Phaser.GameObjects.Rectangle;
  overlay: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
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
      // Borda do ícone quadrado (polimento): moldura simples, não a pixel art da barra de HP.
      const border = scene.add
        .rectangle(x - ICON_BORDER_W, ICON_Y - ICON_BORDER_W, ICON_SIZE + ICON_BORDER_W * 2, ICON_SIZE + ICON_BORDER_W * 2)
        .setOrigin(0, 0)
        .setStrokeStyle(ICON_BORDER_W, PALETTE.w, 1)
        .setVisible(false);
      const icon = scene.add
        .sprite(x, ICON_Y, TEX.kanji, 'kuro')
        .setOrigin(0, 0)
        .setDisplaySize(ICON_SIZE, ICON_SIZE)
        .setVisible(false);
      // Overlay escuro do topo para baixo (TEC-09): encolhe conforme a recarga esvazia.
      const overlay = scene.add.rectangle(x, ICON_Y, ICON_SIZE, 0, TECH_ICON_OVERLAY_COLOR, 0.75).setOrigin(0, 0).setVisible(false);
      // Rótulo da tecla do slot (polimento): `L` (slot 1, teclas L/C) ou `I` (slot 2, teclas I/V).
      const label = scene.add
        .text(x + ICON_SIZE - 2, ICON_Y + ICON_SIZE - 2, SLOT_LABEL[i], {
          fontFamily: 'monospace',
          fontSize: '13px',
          fontStyle: 'bold',
          color: '#ffffff',
          backgroundColor: 'rgba(0,0,0,0.6)',
          padding: { x: 2, y: 0 },
        })
        .setOrigin(1, 1)
        .setVisible(false);
      return { icon, border, overlay, label };
    }) as [SlotIcon, SlotIcon];

    const objs: (Phaser.GameObjects.Rectangle | Phaser.GameObjects.Sprite | Phaser.GameObjects.Text)[] = [
      this.bg,
      this.fill,
      ...this.marks,
      ...this.slots.flatMap((s) => [s.border, s.icon, s.overlay, s.label]),
    ];
    for (const o of objs) o.setScrollFactor(0).setDepth(DEPTH);
    layer.add(objs);
  }

  /** Chamado toda vez que uma conjuração é recusada por falta de energia (TEC-10; `techDenied:energy`). */
  flashDenied(): void {
    this.flashMs = FLASH_MS;
  }

  /** Centro do ícone do slot (T21 "Direção de feel"): destino do ícone que voa da carta da loja. */
  slotIconPosition(slot: 0 | 1): { x: number; y: number } {
    const icon = this.slots[slot].icon;
    return { x: icon.x + ICON_SIZE / 2, y: icon.y + ICON_SIZE / 2 };
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
        slot.border.setVisible(false);
        slot.overlay.setVisible(false);
        slot.label.setVisible(false);
        return;
      }
      const def = TECHNIQUES[s.id];
      const cost = loadout.cost(s.id);
      mark.setPosition(BAR_X + (BAR_W * cost) / energy.max, BAR_Y).setVisible(true); // TEC-12
      slot.icon.setFrame(def.kanji).setVisible(true);
      slot.border.setVisible(true);
      slot.label.setVisible(true);
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
    const allObjs: (Phaser.GameObjects.Rectangle | Phaser.GameObjects.Sprite | Phaser.GameObjects.Text)[] = [
      this.bg,
      this.fill,
      ...this.marks,
      ...this.slots.flatMap((s) => [s.border, s.icon, s.overlay, s.label]),
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
