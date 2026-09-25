import type Phaser from 'phaser';
import { PALETTE } from './art/palette';

/** Sobe (px) e duração (ms) do texto flutuante de coleta (ECO-30, HEAL-07). */
const RISE_PX = 16;
const LIFE_MS = 400;
const FX_DEPTH = 3;

const css = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;

interface FloatTextEntry {
  text: string;
  color: string;
  x: number;
  ageMs: number;
  obj: Phaser.GameObjects.Text;
}

/** "+N" que sobe do ponto de coleta e some (ECO-30, HEAL-07): mundo, não HUD. */
export class FloatTexts {
  private entries: FloatTextEntry[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  /** `color` é a chave de 1 letra da PALETTE (ex.: 'U', 'G'), igual ao contrato do snapshot. */
  spawn(text: string, color: string, x: number, y: number): void {
    const obj = this.scene.add
      .text(x, y, text, { fontFamily: 'monospace', fontSize: '12px', color: css(PALETTE[color]) })
      .setOrigin(0.5, 1)
      .setDepth(FX_DEPTH);
    this.entries.push({ text, color, x, ageMs: 0, obj });
  }

  update(dtMs: number): void {
    const remaining: FloatTextEntry[] = [];
    for (const e of this.entries) {
      e.ageMs += dtMs;
      if (e.ageMs >= LIFE_MS) {
        e.obj.destroy();
        continue;
      }
      this.positionEntry(e, e.obj.y + this.deltaY(dtMs));
      remaining.push(e);
    }
    this.entries = remaining;
  }

  /** Nova run: some com todo texto flutuante pendente. */
  clear(): void {
    for (const e of this.entries) e.obj.destroy();
    this.entries = [];
  }

  /** Snapshot de debug: posição atual (a inicial é a do pickup, ECO-30/HEAL-07), texto e cor. */
  debug(): { text: string; color: string; x: number; y: number }[] {
    return this.entries.map((e) => ({ text: e.text, color: e.color, x: e.x, y: e.obj.y }));
  }

  private positionEntry(e: FloatTextEntry, y: number): void {
    e.obj.setPosition(e.x, y).setAlpha(1 - e.ageMs / LIFE_MS);
  }

  private deltaY(dtMs: number): number {
    return -(RISE_PX * dtMs) / LIFE_MS;
  }
}
