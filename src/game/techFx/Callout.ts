import type Phaser from 'phaser';
import { TECHNIQUES, type TechId } from '../../data/techniques';
import { PALETTE } from '../art/palette';
import { TEX } from '../textures';

const css = (color: number): string => `#${color.toString(16).padStart(6, '0')}`;

/** CAST-16: a chamada fica na tela por 900 ms. */
const CALLOUT_MS = 900;
/** Polimento (feat(hud)): entra/sai deslizando em ~150 ms (era 200 ms). */
const SLIDE_MS = 150;
const REST_X = 0;
/** Faixa (Direção de arte, "faixa anime"): fundo preto translúcido, bordas na cor da técnica, kanji 3x + nome grande. */
const BAND_W = 360;
const BAND_H = 100;
const START_X = -BAND_W;
/**
 * Centro vertical da faixa. Fica no terço superior da tela (viewport 540 px de altura -> terço = 180 px) só até
 * onde o resto do HUD deixa: `EnergyHud.ts` empilha barra de HP (Hud.ts, `MARGIN` 12) + painel de controles
 * (`PANEL_Y` 36 + ~5 linhas) + barra de energia (`BAR_Y` 124) + ícones de slot (`ICON_Y` 146, `ICON_SIZE` 48,
 * borda 2 px) - o pé dos ícones já fica em 146+48+2 = 196. Fix(hud): a faixa cobria o ícone do slot e o painel
 * de controles em Y=130; agora começa 8 px abaixo do pé dos ícones, garantidamente fora de tudo isso.
 */
const HUD_ICONS_BOTTOM_PX = 196; // EnergyHud.ts: ICON_Y (146) + ICON_SIZE (48) + ICON_BORDER_W (2)
const BAND_GAP_BELOW_HUD_PX = 8;
const BAND_TOP = HUD_ICONS_BOTTOM_PX + BAND_GAP_BELOW_HUD_PX;
const Y = BAND_TOP + BAND_H / 2;
const BORDER_H = 4;
const PAD_X = 14;
/** Kanji 3x maior que o antigo ícone de 28 px (mesmo tamanho do cartão do Kokusen, KANJI_SIZE). */
const ICON_SIZE = 84;
const TEXT_GAP = 16;
const DEPTH = 150;

/** Deslocamento (local, sem o `x` de deslizar) de cada peça: `bg`/bordas em 0, ícone e texto adiante dele. */
const BASE_X = { band: 0, icon: PAD_X, text: PAD_X + ICON_SIZE + TEXT_GAP };

/**
 * Chamada da conjuração (CAST-16): faixa horizontal (Direção de arte) que desliza da esquerda em 150 ms, fica
 * 900 ms e sai deslizando: fundo preto translúcido, bordas na cor da técnica (`TECHNIQUES[id].aura`), kanji 3x à
 * esquerda e nome em fonte maior e bold. Só desenha; quem decide quando chamar é o `techCast:<id>` do `TechCaster`.
 *
 * Sem `Container`: os objetos são somados direto na `uiLayer` (como o resto do HUD) - um `Container` criado com
 * filhos já prontos perde a câmera de UI, porque o roteador de câmeras da cena (`addUiCamera`) decide pelo
 * `displayList` de cada objeto no evento `ADDED_TO_SCENE`, que só dispara uma vez, antes do filho entrar no
 * `Container` (o filho nasce na lista da cena, não na da camada, e fica ignorado pela câmera de UI para sempre).
 * O deslizar anima um único número (`slideX`) e reaplica a posição de cada peça a cada passo.
 */
export class Callout {
  private readonly band: Phaser.GameObjects.Rectangle;
  private readonly borderTop: Phaser.GameObjects.Rectangle;
  private readonly borderBottom: Phaser.GameObjects.Rectangle;
  private readonly icon: Phaser.GameObjects.Sprite;
  private readonly text: Phaser.GameObjects.Text;
  private readonly parts: (Phaser.GameObjects.Rectangle | Phaser.GameObjects.Sprite | Phaser.GameObjects.Text)[];
  private readonly slide = { x: START_X };
  private msLeft = 0;
  private current: TechId | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
  ) {
    this.band = scene.add.rectangle(0, BAND_TOP, BAND_W, BAND_H, PALETTE.b, 0.72).setOrigin(0, 0);
    this.borderTop = scene.add.rectangle(0, BAND_TOP, BAND_W, BORDER_H, PALETTE.w).setOrigin(0, 0);
    this.borderBottom = scene.add
      .rectangle(0, BAND_TOP + BAND_H - BORDER_H, BAND_W, BORDER_H, PALETTE.w)
      .setOrigin(0, 0);
    this.icon = scene.add
      .sprite(BASE_X.icon, Y, TEX.kanji, 'kuro')
      .setOrigin(0, 0.5)
      .setDisplaySize(ICON_SIZE, ICON_SIZE);
    this.text = scene.add
      .text(BASE_X.text, Y, '', { fontFamily: 'monospace', fontSize: '30px', fontStyle: 'bold', color: css(PALETTE.w) })
      .setOrigin(0, 0.5);
    this.parts = [this.band, this.borderTop, this.borderBottom, this.icon, this.text];
    for (const o of this.parts) o.setScrollFactor(0).setDepth(DEPTH).setVisible(false);
    layer.add(this.parts);
    this.applySlide(START_X);
  }

  /** Reaplica `slideX` à posição local de cada peça (`band`/bordas em `BASE_X.band`, ícone e texto adiante dele). */
  private applySlide(x: number): void {
    this.band.x = BASE_X.band + x;
    this.borderTop.x = BASE_X.band + x;
    this.borderBottom.x = BASE_X.band + x;
    this.icon.x = BASE_X.icon + x;
    this.text.x = BASE_X.text + x;
  }

  /** Chamado no `techCast:<id>` (soltura, CAST-16). */
  show(id: TechId): void {
    const def = TECHNIQUES[id];
    const auraColor = (PALETTE[def.aura] ?? PALETTE.w) as number;
    this.current = id;
    this.msLeft = CALLOUT_MS;
    this.icon.setFrame(def.kanji);
    this.text.setText(def.name);
    this.borderTop.setFillStyle(auraColor);
    this.borderBottom.setFillStyle(auraColor);
    this.slide.x = START_X;
    this.applySlide(START_X);
    for (const o of this.parts) o.setVisible(true);
    this.scene.tweens.killTweensOf(this.slide);
    this.scene.tweens.add({
      targets: this.slide,
      x: REST_X,
      duration: SLIDE_MS,
      ease: 'Cubic.Out',
      onUpdate: () => this.applySlide(this.slide.x),
    });
  }

  update(dtMs: number): void {
    if (this.msLeft <= 0) return;
    this.msLeft -= dtMs;
    if (this.msLeft <= 0) {
      this.current = null;
      this.scene.tweens.killTweensOf(this.slide);
      this.scene.tweens.add({
        targets: this.slide,
        x: START_X,
        duration: SLIDE_MS,
        ease: 'Cubic.In',
        onUpdate: () => this.applySlide(this.slide.x),
        onComplete: () => {
          for (const o of this.parts) o.setVisible(false);
        },
      });
    }
  }

  /** `hud.callout` do snapshot (CAST-16); `null` fora da janela de 900 ms. */
  debug(): { id: TechId; name: string } | null {
    return this.current ? { id: this.current, name: this.text.text } : null;
  }
}
