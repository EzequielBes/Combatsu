import type Phaser from 'phaser';
import { colorsFor, DamageBook, sizeFor, type DamageEntry, type DamageKind } from '../core/damageNumber';
import type { Vec2 } from '../core/hit';
import { DAMAGE_NUMBER_FEEL } from '../data/feel';
import { PALETTE } from './art/palette';
import { css, FX_DEPTH } from './FloatTexts';
import type { DamageNumbersSnapshot } from './powerSnapshot';

/** Espessura do contorno do texto em px de mundo. */
const OUTLINE_PX = 3;
/** Resolução do texto: o mundo é ampliado pela câmera, e o número tem de sair nítido nesse zoom (como o dorminhoco). */
const TEXT_RESOLUTION = 4;

interface ShownNumber {
  readonly entry: Readonly<DamageEntry>;
  readonly obj: Phaser.GameObjects.Text;
  readonly x: number;
  readonly y: number;
  /** Tempo restante do "pop" do Kokusen (ms); 0 sem pop. */
  popMs: number;
}

/**
 * Vista do número de dano (POW-05, POW-06): texto no mundo acima do alvo, que sobe e some. Quem decide fusão, tipo e
 * teto é o `DamageBook` do `core`; aqui só se desenha o que ele devolve. O relógio é próprio (soma do `dt` do
 * `update`), então a vida do número não depende do relógio da cena. Fica fora do `FloatTexts` para não mudar o
 * `debug()` dele, e fora do orçamento de efeitos (`fxCap`).
 */
export class DamageNumbers {
  private readonly book = new DamageBook();
  private readonly shown = new Map<number, ShownNumber>();
  private clockMs = 0;

  constructor(private readonly scene: Phaser.Scene) {}

  /** Um acerto de `value` em `target`, no ponto `at`: soma no número vivo do alvo ou abre um novo. */
  show(target: { readonly id: number }, value: number, kind: DamageKind, at: Vec2): void {
    const change = this.book.add(target.id, value, kind, this.clockMs);
    if (change.evicted !== null) this.drop(change.evicted);
    const view = this.shown.get(change.entry.id);
    if (view) this.restyle(view);
    else this.spawn(change.entry, at);
  }

  /** Troca o tipo do número mais recente do alvo (o Kokusen chega depois do acerto) e dá o "pop". */
  promote(targetId: number, kind: DamageKind): void {
    const change = this.book.promote(targetId, kind);
    const view = change && this.shown.get(change.entry.id);
    if (!view) return;
    view.popMs = DAMAGE_NUMBER_FEEL.popMs;
    this.restyle(view);
  }

  update(dtMs: number): void {
    this.clockMs += dtMs;
    for (const id of this.book.expire(this.clockMs)) this.drop(id);
    for (const view of this.shown.values()) this.place(view, dtMs);
  }

  /** Nova run ou troca de área: some com todo número vivo. */
  clear(): void {
    for (const view of this.shown.values()) view.obj.destroy();
    this.shown.clear();
    this.book.clear();
  }

  /** Snapshot de debug (POW-13): quantos vivos e o último número tocado. */
  snapshot(): DamageNumbersSnapshot {
    const last = this.book.last;
    return { live: this.book.live, last: last ? { ...last } : null };
  }

  private spawn(entry: Readonly<DamageEntry>, at: Vec2): void {
    const obj = this.scene.add
      .text(at.x, at.y, '', { fontFamily: 'monospace', strokeThickness: OUTLINE_PX })
      .setOrigin(0.5, 1)
      .setResolution(TEXT_RESOLUTION)
      .setDepth(FX_DEPTH);
    const view: ShownNumber = { entry, obj, x: at.x, y: at.y, popMs: 0 };
    this.shown.set(entry.id, view);
    this.restyle(view);
  }

  /** Texto, tamanho e cores a partir do valor somado e do tipo atual. */
  private restyle(view: ShownNumber): void {
    const { value, kind } = view.entry;
    const colors = colorsFor(kind);
    view.obj
      .setText(String(value))
      .setFontSize(sizeFor(value, kind))
      .setColor(css(PALETTE[colors.fill]))
      .setStroke(css(PALETTE[colors.outline]), OUTLINE_PX);
    this.place(view, 0);
  }

  /** Sobe `risePx` ao longo da vida, contada do último acerto somado, e esmaece; o pop encolhe de 1,6 a 1,0. */
  private place(view: ShownNumber, dtMs: number): void {
    const f = DAMAGE_NUMBER_FEEL;
    const t = Math.min(1, Math.max(0, (this.clockMs - view.entry.lastMs) / f.lifeMs));
    view.popMs = Math.max(0, view.popMs - dtMs);
    const scale = 1 + (f.popScale - 1) * (view.popMs / f.popMs);
    view.obj
      .setPosition(view.x, view.y - f.risePx * t)
      .setAlpha(1 - t)
      .setScale(scale);
  }

  private drop(id: number): void {
    this.shown.get(id)?.obj.destroy();
    this.shown.delete(id);
  }
}
