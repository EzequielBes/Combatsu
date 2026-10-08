import type Phaser from 'phaser';
import type { BossArchetype } from '../../core/bossTier';
import { TILE } from '../../core/level';
import { FLOOR_ROWS } from '../../core/module';
import { AREA } from '../../data/tuning';
import { SCREEN } from '../../game/art/hd/screen';
import { PALETTE } from '../../game/art/palette';
import { TEX } from '../../game/textures';
import type { TestScene } from '../TestScene';

/** Véu vermelho da fase (ARN-09): alpha nas fases 2 e 3, profundidade entre a camada próxima (−10) e a decoração (−5). */
export const VEIL_ALPHA = 0.18;
export const VEIL_DEPTH = -7;
/** Tempo para o véu sumir depois da vitória (ARN-11). */
export const VEIL_FADE_MS = 600;

/**
 * Acabamento da arena do chefe (ARN-07..11): o selo da esquerda, só visual (a coluna 0 já é parede), e o véu
 * vermelho preso à câmera que acende na fase 2 do chefe e some na vitória. Nada disso existe fora da área de chefe.
 */
export class ArenaDressing {
  constructor(private readonly s: TestScene) {}

  private leftSeal: Phaser.GameObjects.TileSprite | null = null;
  private veil: Phaser.GameObjects.Rectangle | null = null;
  /** O chefe já apareceu nesta arena: a ausência dele depois disso é a vitória. */
  private bossSeen = false;

  /** Cria o selo da esquerda e o véu (apagado) quando `variant` diz que a área é de chefe. */
  build(variant: BossArchetype | null): void {
    this.bossSeen = false;
    if (variant === null) return;
    const h = FLOOR_ROWS[0] * TILE;
    if (this.s.textures.exists(TEX.seal)) {
      this.leftSeal = this.s.add.tileSprite(TILE / 2, h / 2, TILE, h, TEX.seal, 'seal').setDepth(1);
    }
    // Preso à câmera: com `scrollFactor` 0 e o zoom em volta do centro do canvas, o retângulo do canvas cobre a tela.
    this.veil = this.s.add
      .rectangle(0, 0, SCREEN.w, SCREEN.h, PALETTE.r, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(VEIL_DEPTH)
      .setAlpha(0);
  }

  /** O selo da arena rompeu (ARN-08): o da esquerda queima no mesmo tempo do da direita. */
  openSeal(): void {
    const seal = this.leftSeal;
    if (!seal) return;
    this.s.tweens.add({
      targets: seal,
      alpha: 0,
      duration: AREA.sealBurnMs,
      onComplete: () => {
        seal.destroy();
        if (this.leftSeal === seal) this.leftSeal = null;
      },
    });
  }

  /**
   * A cada quadro (ARN-09..11): com o chefe vivo, o véu acende nas fases 2 e 3 e apaga na 1; depois que o chefe
   * apareceu e sumiu (vitória), o véu desce até 0 em `VEIL_FADE_MS`.
   */
  update(dtMs: number, bossPhase: number | null): void {
    const veil = this.veil;
    if (!veil) return;
    if (bossPhase !== null) {
      this.bossSeen = true;
      veil.setAlpha(bossPhase >= 2 ? VEIL_ALPHA : 0);
      return;
    }
    if (this.bossSeen) veil.setAlpha(Math.max(0, veil.alpha - (VEIL_ALPHA * dtMs) / VEIL_FADE_MS));
  }

  /** Destrói tudo da arena (ARE-11). */
  teardown(): void {
    if (this.leftSeal) this.s.tweens.killTweensOf(this.leftSeal);
    this.leftSeal?.destroy();
    this.veil?.destroy();
    this.leftSeal = null;
    this.veil = null;
    this.bossSeen = false;
  }

  /** Selo da esquerda como está desenhado (ARN-07, ARN-08); `null` fora da arena ou depois do efeito. */
  get leftSealView(): {
    texture: string;
    frame: string;
    alpha: number;
    left: number;
    top: number;
    width: number;
    height: number;
  } | null {
    const seal = this.leftSeal;
    if (!seal) return null;
    return {
      texture: seal.texture.key,
      frame: String(seal.frame.name),
      alpha: seal.alpha,
      left: seal.x - seal.width * seal.originX,
      top: seal.y - seal.height * seal.originY,
      width: seal.width,
      height: seal.height,
    };
  }

  /** Véu vermelho lido do objeto (ARN-09..11); `null` fora da arena. */
  get veilView(): { alpha: number; depth: number; color: number; scroll: number } | null {
    const veil = this.veil;
    return veil ? { alpha: veil.alpha, depth: veil.depth, color: veil.fillColor, scroll: veil.scrollFactorX } : null;
  }
}
