import type Phaser from 'phaser';
import { UI_SIZE } from '../art/hd/screen';
import { PALETTE } from '../art/palette';
import { BOSS_BAR_WIDTH, MARGIN, RUN_TEXT_STYLE } from '../Hud';

/** Lado do glifo de cada afixo, em px da câmera de UI (BRD-02). */
const GLYPH_SIZE = 6;
/** Espaço entre dois glifos vizinhos. */
const GLYPH_GAP = 2;
/** Espaço entre a barra do chefe e o 1º glifo: o do Ígneo tem a cor da barra e, colado nela, parecia um pedaço dela. */
const BAR_GAP = 8;
/** Topo do glifo: centrado na barra de 12 px que começa em `MARGIN`. */
const GLYPH_Y = MARGIN + 3;
/** Borda clara de 1 px: a escura (`k`) sumia no céu escuro, e esta separa o glifo do Ígneo da barra laranja. */
const GLYPH_EDGE_COLOR = PALETTE.S;
/** Mesma profundidade da barra do chefe no `Hud`. */
const UI_DEPTH = 100;
/** Topo do aviso "Próximo:" na loja: logo abaixo da área da barra do chefe (12 px de barra a partir de `MARGIN`). */
const ANNOUNCE_Y = MARGIN + 24;
/** Acima do painel da loja (profundidade 200 no `ShopPanel`), que escurece a arena e o resto do HUD. */
const ANNOUNCE_DEPTH = 210;

/**
 * Leitura do chefe na câmera de UI (BRD-02/04/07): um quadrado de 6 px por afixo (e um do Portador de Dedo) logo à
 * direita da barra do chefe, na cor da `PALETTE` que `data/bossAffixes.ts` define, e o aviso "Próximo:" da loja
 * abaixo da área da barra. Tudo nasce sob demanda na `uiLayer` e é reaproveitado; o `BossDirector` mostra e esconde
 * os glifos junto com a barra e o aviso junto com a loja.
 */
export class BossReadout {
  private readonly glyphs: Phaser.GameObjects.Rectangle[] = [];
  private shown: string[] = [];
  private announce: Phaser.GameObjects.Text | null = null;

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

  /** Mostra o aviso da próxima rodada de chefe (BRD-04), centrado abaixo da área da barra. */
  showAnnounce(text: string): void {
    this.announce ??= this.makeAnnounce();
    this.announce.setText(text).setVisible(true);
  }

  /** Esconde o aviso (a loja fechou: rodada nova ou run nova). */
  hideAnnounce(): void {
    this.announce?.setVisible(false);
  }

  /** Texto do aviso visível, ou `null` sem aviso (snapshot de debug, BRD-08). */
  announced(): string | null {
    return this.announce?.visible ? this.announce.text : null;
  }

  private makeAnnounce(): Phaser.GameObjects.Text {
    const text = this.scene.add
      .text(UI_SIZE.w / 2, ANNOUNCE_Y, '', RUN_TEXT_STYLE)
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(ANNOUNCE_DEPTH);
    this.layer.add(text);
    return text;
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
