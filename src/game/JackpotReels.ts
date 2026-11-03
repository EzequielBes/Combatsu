import Phaser from 'phaser';
import { REEL_SYMBOLS, reelFaces, type JackpotResult } from '../core/jackpot';
import { DOMAIN_COLORS } from '../data/domains';
import { PALETTE } from './art/palette';
import { UI_SIZE } from './art/hd/screen';

/** O que os tambores mostram agora; `null` sem o Jackpot ativo (DomainFxView.reels). */
export interface ReelsView {
  /** Giro em curso (JAC-01). */
  spinning: boolean;
  /** Resultado da parada; `null` no giro. */
  result: JackpotResult | null;
  /** Falhas seguidas depois da parada (escolhem as faces da falha). */
  misses: number;
  /** Chance mostrada (1 com a piedade armada). */
  chance: number;
  guaranteed: boolean;
  /** Relógio de jogo: no giro, o símbolo de cada caixa troca com ele (sem `Rng`). */
  clockMs: number;
}

/** `domainFx.reels` do snapshot: lido dos `Text` vivos (L-076). */
export interface ReelsSnapshot {
  spinning: boolean;
  faces: [string, string, string];
  /** Chance lida do texto (`Riichi NN%` → 0,NN; `GARANTIDO` → 1); `null` fora do giro. */
  chance: number | null;
  label: string;
}

const BOX = 34;
const GAP = 8;
/** Abaixo da barra do chefe e do nome dele (topo central), acima do banner (25% da altura). */
const TOP = 52;
/** Troca do símbolo no giro, em ms de jogo; cada caixa defasada para não girarem iguais. */
const SPIN_STEP_MS = 70;
const DEPTH = 89;
const css = (key: keyof typeof PALETTE): string => `#${PALETTE[key].toString(16).padStart(6, '0')}`;
const OUTLINE = { stroke: css('k'), strokeThickness: 3 };

/** Texto do giro (JAC-06): a chance em por cento ou "GARANTIDO" com a piedade armada. */
export const reelsLabel = (view: ReelsView): string => {
  if (!view.spinning) return view.result === 'jackpot' ? 'JACKPOT!' : 'FALHA';
  return view.guaranteed ? 'GARANTIDO' : `Riichi ${Math.round(view.chance * 100)}%`;
};

/** Faces de agora: no giro, pelo relógio de jogo; parado, as do `reelFaces`. */
export const facesFor = (view: ReelsView): [string, string, string] => {
  if (!view.spinning && view.result) return reelFaces(view.result, view.misses);
  const n = REEL_SYMBOLS.length;
  const step = Math.floor(view.clockMs / SPIN_STEP_MS);
  return [0, 1, 2].map((i) => REEL_SYMBOLS[(step + i * 3) % n]) as [string, string, string];
};

/**
 * Os tambores do Jackpot (JAC-06, DHD-04): três caixas com borda `A` e o símbolo, no topo central da `uiLayer`, e o
 * texto `Riichi NN%` (ou `GARANTIDO`) embaixo. O `DomainFx` cria, anda e destrói.
 */
export class JackpotReels {
  private readonly boxes: Phaser.GameObjects.Rectangle[];
  private readonly faces: Phaser.GameObjects.Text[];
  private readonly label: Phaser.GameObjects.Text;
  private spinning = false;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer) {
    const x0 = UI_SIZE.w / 2 - (3 * BOX + 2 * GAP) / 2 + BOX / 2;
    const cy = TOP + BOX / 2;
    const style = { fontFamily: 'monospace', fontSize: '20px', fontStyle: 'bold', color: css(DOMAIN_COLORS.reelFace) };
    this.boxes = [0, 1, 2].map((i) =>
      scene.add
        .rectangle(x0 + i * (BOX + GAP), cy, BOX, BOX, PALETTE.K, 0.9)
        .setStrokeStyle(2, PALETTE[DOMAIN_COLORS.reelBorder])
        .setScrollFactor(0)
        .setDepth(DEPTH),
    );
    this.faces = [0, 1, 2].map((i) =>
      scene.add
        .text(x0 + i * (BOX + GAP), cy, '', { ...style, ...OUTLINE })
        .setOrigin(0.5, 0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH),
    );
    const labelStyle = { fontFamily: 'monospace', fontSize: '13px', color: css(DOMAIN_COLORS.reelText), ...OUTLINE };
    this.label = scene.add
      .text(UI_SIZE.w / 2, TOP + BOX + 4, '', labelStyle)
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH);
    layer.add([...this.boxes, ...this.faces, this.label]);
    this.show(null);
  }

  /** Mostra a vista; `null` esconde tudo. */
  show(view: ReelsView | null): void {
    const on = view !== null;
    for (const o of [...this.boxes, ...this.faces, this.label]) o.setVisible(on);
    this.spinning = view?.spinning ?? false;
    if (!view) return;
    const faces = facesFor(view);
    this.faces.forEach((t, i) => t.setText(faces[i]));
    this.label.setText(reelsLabel(view));
  }

  /** Lido dos `Text` vivos; `null` com os tambores escondidos. */
  debug(): ReelsSnapshot | null {
    if (!this.label.visible) return null;
    const label = this.label.text;
    const pct = /^Riichi (\d+)%$/.exec(label);
    const chance = label === 'GARANTIDO' ? 1 : pct ? Number(pct[1]) / 100 : null;
    return {
      spinning: this.spinning,
      faces: this.faces.map((t) => t.text) as [string, string, string],
      chance,
      label,
    };
  }

  destroy(): void {
    for (const o of [...this.boxes, ...this.faces, this.label]) o.destroy();
  }
}
