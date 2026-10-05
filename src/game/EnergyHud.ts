import type Phaser from 'phaser';
import type { CursedEnergy } from '../core/energy';
import type { Loadout } from '../core/loadout';
import type { Mastery } from '../core/mastery';
import { masteryBarWidth } from '../core/masteryBar';
import { TECHNIQUES } from '../data/techniques';
import { ART_SCALE, PALETTE } from './art/palette';
import { HUD_BAR_WELL } from './art/hud';
import {
  ENERGY_BAR_BG_COLOR,
  ENERGY_BAR_FILL_COLOR,
  ENERGY_BAR_FLASH_COLOR,
  ENERGY_BAR_MARK_COLOR,
  TECH_ICON_OVERLAY_COLOR,
} from './art/techColors';
import { TEX } from './textures';

/**
 * A barra de energia é irmã da de HP (Hud.ts): mesma moldura em pixel art, mesmo rótulo à esquerda (`CE`, de
 * "cursed energy") e a mesma largura, logo abaixo dela e da faixa fina de estrutura (que termina em y=32). O
 * preenchimento ocupa o poço da moldura.
 */
const MARGIN = 12;
const LABEL_W = 26;
const FRAME_X = MARGIN + LABEL_W;
const FRAME_Y = 34;
const BAR_X = FRAME_X + HUD_BAR_WELL.x * ART_SCALE;
const BAR_Y = FRAME_Y + HUD_BAR_WELL.y * ART_SCALE;
const BAR_W = HUD_BAR_WELL.w * ART_SCALE;
const BAR_H = HUD_BAR_WELL.h * ART_SCALE;
const MARK_W = 2;
/** Ícones de slot (polimento): quadrados, kanji em 2x (era 24 px), borda e rótulo da tecla (`L`/`I`) no canto. */
const ICON_SIZE = 48;
const ICON_BORDER_W = 2;
const ICON_GAP = 10;
/** Abaixo do contador de fragmentos e da linha do objeto na mão (Hud.ts: y=54 e y=70, 14 px de texto). */
const ICON_Y = 92;
const ICON_X = MARGIN + ICON_BORDER_W;
/** Barra de maestria (MST-08): 2 px de altura, colada sob o ícone, com a largura do slot. */
const MASTERY_BAR_H = 2;
const MASTERY_BAR_Y = ICON_Y + ICON_SIZE + ICON_BORDER_W + 2;
/** Tecla principal de cada slot (TechCaster.ts: slot 1 = L/C, slot 2 = I/V). */
const SLOT_LABEL: readonly ['L', 'I'] = ['L', 'I'];
/** Duração do flash de recusa por falta de energia (TEC-10). */
const FLASH_MS = 300;
const DEPTH = 101;
/** O mesmo texto do rótulo `HP` (Hud.ts). */
const LABEL_STYLE = {
  fontFamily: 'monospace',
  fontSize: '12px',
  color: `#${PALETTE.w!.toString(16).padStart(6, '0')}`,
};

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
  private readonly masteryBars: [Phaser.GameObjects.Rectangle, Phaser.GameObjects.Rectangle];
  private flashMs = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Layer,
  ) {
    const label = scene.add.text(MARGIN, FRAME_Y + 1, 'CE', LABEL_STYLE);
    const frame = scene.add.image(FRAME_X, FRAME_Y, TEX.hudBar).setOrigin(0, 0);
    this.bg = scene.add.rectangle(BAR_X, BAR_Y, BAR_W, BAR_H, ENERGY_BAR_BG_COLOR).setOrigin(0, 0);
    this.fill = scene.add.rectangle(BAR_X, BAR_Y, 0, BAR_H, ENERGY_BAR_FILL_COLOR).setOrigin(0, 0);
    this.marks = [0, 1].map(() =>
      scene.add.rectangle(BAR_X, BAR_Y, MARK_W, BAR_H, ENERGY_BAR_MARK_COLOR).setOrigin(0, 0).setVisible(false),
    ) as [Phaser.GameObjects.Rectangle, Phaser.GameObjects.Rectangle];
    this.slots = [0, 1].map((i) => {
      const x = ICON_X + i * (ICON_SIZE + ICON_GAP);
      // Borda do ícone quadrado (polimento): moldura simples, não a pixel art da barra de HP.
      const border = scene.add
        .rectangle(
          x - ICON_BORDER_W,
          ICON_Y - ICON_BORDER_W,
          ICON_SIZE + ICON_BORDER_W * 2,
          ICON_SIZE + ICON_BORDER_W * 2,
        )
        .setOrigin(0, 0)
        .setStrokeStyle(ICON_BORDER_W, PALETTE.w, 1)
        .setVisible(false);
      const icon = scene.add
        .sprite(x, ICON_Y, TEX.kanji, 'kuro')
        .setOrigin(0, 0)
        .setDisplaySize(ICON_SIZE, ICON_SIZE)
        .setVisible(false);
      // Overlay escuro do topo para baixo (TEC-09): encolhe conforme a recarga esvazia.
      const overlay = scene.add
        .rectangle(x, ICON_Y, ICON_SIZE, 0, TECH_ICON_OVERLAY_COLOR, 0.75)
        .setOrigin(0, 0)
        .setVisible(false);
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

    this.masteryBars = [0, 1].map((i) =>
      scene.add
        .rectangle(ICON_X + i * (ICON_SIZE + ICON_GAP), MASTERY_BAR_Y, 0, MASTERY_BAR_H, ENERGY_BAR_FILL_COLOR)
        .setOrigin(0, 0)
        .setVisible(false),
    ) as [Phaser.GameObjects.Rectangle, Phaser.GameObjects.Rectangle];

    const objs = [
      label,
      frame,
      this.bg,
      this.fill,
      ...this.marks,
      ...this.masteryBars,
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

  update(dtMs: number, energy: CursedEnergy, loadout: Loadout, mastery: Mastery): void {
    const frac = Math.max(0, Math.min(1, energy.cur / energy.max));
    this.fill.width = BAR_W * frac; // TEC-07

    loadout.slotsView.forEach((s, i) => {
      const mark = this.marks[i];
      const slot = this.slots[i];
      const bar = this.masteryBars[i];
      if (!s) {
        bar.setVisible(false);
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
      // MST-08: sob o slot ocupado abaixo do Nv3, largura = round(largura do slot × pontos / limiar).
      const width = masteryBarWidth(ICON_SIZE, mastery.points(i as 0 | 1), mastery.threshold(s.level));
      if (width === null) {
        bar.setVisible(false);
      } else {
        bar.width = width;
        bar.setVisible(true);
      }
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
      icons: { cooldownOverlayHeight: number; iconHeight: number }[];
      /** MST-08: largura (px) da barra de maestria de cada slot, `null` se não está desenhada (vazio ou Nv3). */
      masteryBars: (number | null)[];
      flashing: boolean;
    };
  } {
    const mainId = this.scene.cameras.main.id;
    const allObjs: (Phaser.GameObjects.Rectangle | Phaser.GameObjects.Sprite | Phaser.GameObjects.Text)[] = [
      this.bg,
      this.fill,
      ...this.marks,
      ...this.masteryBars,
      ...this.slots.flatMap((s) => [s.border, s.icon, s.overlay, s.label]),
    ];
    return {
      // TEC-11: checagem real (a `uiLayer` está de fato ignorada pela câmera principal e todo objeto está nela).
      techIgnoredByMain:
        (this.layer.cameraFilter & mainId) === mainId && allObjs.every((o) => o.displayList === this.layer),
      energy: {
        width: BAR_W,
        fillWidth: this.fill.width,
        marks: this.marks.map((m) => (m.visible ? m.x - BAR_X : null)),
        icons: this.slots.map((s) => ({
          cooldownOverlayHeight: s.overlay.visible ? s.overlay.height : 0,
          iconHeight: ICON_SIZE,
        })),
        masteryBars: this.masteryBars.map((b) => (b.visible ? b.width : null)),
        flashing: this.flashMs > 0,
      },
    };
  }
}
