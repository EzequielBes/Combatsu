import type Phaser from 'phaser';
import { UI_SIZE } from '../art/hd/screen';
import { PALETTE } from '../art/palette';
import { BOSS_BAR_WIDTH, MARGIN } from '../Hud';

/** Lado do glifo de cada afixo, em px da câmera de UI (BRD-02). */
const GLYPH_SIZE = 6;
/** Espaço entre dois glifos vizinhos. */
const GLYPH_GAP = 2;
/** Espaço entre a ponta direita da barra do chefe e o primeiro glifo. */
const BAR_GAP = 5;
/** Topo do glifo: centrado na barra de 12 px que começa em `MARGIN`. */
const GLYPH_Y = MARGIN + 3;
/** Borda escura de 1 px, para o glifo claro (Portador, Ígneo) não sumir no cenário. */
const GLYPH_EDGE_COLOR = PALETTE.k;
/** Mesma profundidade da barra do chefe no `Hud`. */
const UI_DEPTH = 100;

/**
 * Leitura do chefe na câmera de UI (BRD-02/07): um quadrado de 6 px por afixo (e um do Portador de Dedo) logo à
 * direita da barra do chefe, na cor da `PALETTE` que `data/bossAffixes.ts` define. Os quadrados nascem sob demanda
 * na `uiLayer` e são reaproveitados; o `BossDirector` mostra e esconde junto com a barra.
 */
export class BossReadout {
  private readonly glyphs: Phaser.GameObjects.Rectangle[] = [];
  private shown: string[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Layer,
  ) {}

  /** Mostra um glifo por chave da `PALETTE`, na ordem; os que sobram ficam escondidos. */
  showGlyphs(keys: readonly string[]): void {
    const left = UI_SIZE.w / 2 + BOSS_BAR_WIDTH / 2 + BAR_GAP;
    keys.forEach((key, i) => {
      const glyph = this.glyphs[i] ?? this.makeGlyph();
      glyph.setPosition(left + i * (GLYPH_SIZE + GLYPH_GAP), GLYPH_Y);
      glyph.setFillStyle(PALETTE[key]).setVisible(true);
    });
    for (const glyph of this.glyphs.slice(keys.length)) glyph.setVisible(false);
    this.shown = [...keys];
  }

  /** Esconde todos os glifos (a barra saiu: chefe derrotado ou run nova). */
  hideGlyphs(): void {
    for (const glyph of this.glyphs) glyph.setVisible(false);
    this.shown = [];
  }

  /** Chaves dos glifos visíveis, na ordem (snapshot de debug). */
  visibleGlyphs(): string[] {
    return [...this.shown];
  }

  private makeGlyph(): Phaser.GameObjects.Rectangle {
    const glyph = this.scene.add
      .rectangle(0, 0, GLYPH_SIZE, GLYPH_SIZE, PALETTE.w)
      .setOrigin(0, 0)
      .setStrokeStyle(1, GLYPH_EDGE_COLOR)
      .setScrollFactor(0)
      .setDepth(UI_DEPTH);
    this.layer.add(glyph);
    this.glyphs.push(glyph);
    return glyph;
  }
}
