import Phaser from 'phaser';
import type { BossAffixId } from '../../data/bossAffixes';
import { outlineKeyAt } from '../../core/bossAffix';
import { PALETTE } from '../art/palette';

/** Leitura do contorno para o snapshot de debug: cor atual, quadro das cópias e o quadro do sprite do chefe. */
export interface AffixOutlineView {
  /** Chave da `PALETTE` da cor do contorno agora (BRD-03, BRD-07). */
  key: string;
  /** Quadro que as 4 cópias mostram (o mesmo do chefe depois do `update`). */
  frame: string;
  /** Quadro do sprite do chefe no mesmo instante. */
  sourceFrame: string;
  visible: boolean;
}

/** Deslocamentos das 4 cópias (px): esquerda, direita, cima e baixo; juntas desenham a borda de 1 px. */
const OFFSETS: readonly (readonly [number, number])[] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];
/** As cópias ficam logo atrás do sprite do chefe, na mesma faixa de profundidade dele. */
const BEHIND = 0.001;

/**
 * Contorno de 1 px do chefe na cor do afixo (BRD-03, BRD-07): 4 cópias do sprite dele com `tintMode FILL`, deslocadas
 * ±1 px e atrás dele. Só existe com Ígneo ou Invocador (`create` devolve `null` sem afixo de contorno); com os dois a
 * cor alterna a cada 600 ms pelo `outlineKeyAt`. O `update` roda depois do `boss.update` e copia textura, quadro,
 * posição, escala, espelho, alfa e visibilidade, então o quadro trocando acompanha no mesmo quadro de tela.
 */
export class AffixOutline {
  private readonly copies: Phaser.GameObjects.Sprite[];
  private elapsedMs = 0;
  private key: string;

  private constructor(
    scene: Phaser.Scene,
    private readonly source: Phaser.GameObjects.Sprite,
    private readonly affixes: readonly BossAffixId[],
    firstKey: string,
  ) {
    this.key = firstKey;
    this.copies = OFFSETS.map(() =>
      scene.add
        .sprite(source.x, source.y, source.texture.key, source.frame.name)
        .setTint(PALETTE[firstKey])
        .setTintMode(Phaser.TintModes.FILL),
    );
    this.sync();
  }

  /** Contorno do chefe de sprite `source` com os afixos `affixes`; `null` sem Ígneo nem Invocador. */
  static create(
    scene: Phaser.Scene,
    source: Phaser.GameObjects.Sprite,
    affixes: readonly BossAffixId[],
  ): AffixOutline | null {
    const key = outlineKeyAt(affixes, 0);
    return key === null ? null : new AffixOutline(scene, source, affixes, key);
  }

  /** Por quadro, depois do `boss.update`: avança o relógio da troca de cor e copia o sprite do chefe. */
  update(dtMs: number): void {
    this.elapsedMs += dtMs;
    const key = outlineKeyAt(this.affixes, this.elapsedMs) ?? this.key;
    if (key !== this.key) {
      this.key = key;
      for (const c of this.copies) c.setTint(PALETTE[key]);
    }
    this.sync();
  }

  /** Remove as cópias (chefe morto, chefe novo ou run nova). */
  destroy(): void {
    for (const c of this.copies) c.destroy();
    this.copies.length = 0;
  }

  view(): AffixOutlineView | null {
    const first = this.copies[0];
    if (!first) return null;
    return {
      key: this.key,
      frame: String(first.frame.name),
      sourceFrame: this.source.active ? String(this.source.frame.name) : '',
      visible: first.visible,
    };
  }

  private sync(): void {
    const src = this.source;
    // O sprite do chefe some no `destroyNow` (run nova): as cópias apagam até o `destroy` delas chegar.
    if (!src.active) {
      for (const c of this.copies) c.setVisible(false);
      return;
    }
    const sameTexture = this.copies[0]?.texture.key === src.texture.key;
    OFFSETS.forEach(([dx, dy], i) => {
      const c = this.copies[i];
      if (!c) return;
      if (!sameTexture) c.setTexture(src.texture.key, src.frame.name);
      else if (c.frame.name !== src.frame.name) c.setFrame(src.frame.name);
      c.setOrigin(src.originX, src.originY)
        .setPosition(src.x + dx, src.y + dy)
        .setScale(src.scaleX, src.scaleY)
        .setFlip(src.flipX, src.flipY)
        .setRotation(src.rotation)
        .setAlpha(src.alpha)
        .setVisible(src.visible)
        .setDepth(src.depth - BEHIND);
    });
  }
}
