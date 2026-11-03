import Phaser from 'phaser';
import { DOMAIN_COLORS, DOMAIN_FX } from '../data/domains';
import { PALETTE } from './art/palette';
import { UI_SIZE } from './art/hd/screen';
import { JackpotReels, type ReelsSnapshot, type ReelsView } from './JackpotReels';

/** O que a vista do Domínio mostra agora: a vinheta com o Santuário ativo (SAN-06), os tambores com o Jackpot (JAC-06). */
export interface DomainFxView {
  vignette: boolean;
  reels: ReelsView | null;
}

/** `domainFx` do snapshot de debug: o alpha real da vinheta (0 apagada), os objetos da `uiLayer` e os tambores. */
export interface DomainFxSnapshot {
  vignette: number;
  uiObjects: number;
  reels: ReelsSnapshot | null;
}

/** Abaixo do tom da câmera lenta (90) e do HUD. */
const DEPTH = 89;
const OFF: DomainFxView = { vignette: false, reels: null };
const SNAP_MS = 1e-6;

/**
 * A vista do Domínio na tela (SAN-06, JAC-06, DHD-04, DHD-05): a vinheta do Santuário, 4 faixas de `vignettePx` nas
 * bordas da tela na cor `t` da `PALETTE`, na `uiLayer` (AD-003), e os tambores do Jackpot (`JackpotReels`). Acende e
 * apaga em `fadeMs` no relógio próprio (o `POST_UPDATE` da cena, que anda também na konbini, na derrota e no hitstop,
 * onde o diretor do Domínio para; depois do `update` da cena, a vista mostra o estado do mesmo quadro). Lê a vista pelo
 * `bind`; o `UiSetup` a cria e a destrói no `SHUTDOWN`.
 */
export class DomainFx {
  private readonly edges: Phaser.GameObjects.Rectangle[];
  private readonly reels: JackpotReels;
  /** Quanto do fade está aceso, de 0 a `fadeMs`: o alpha sai exato nas duas pontas. */
  private litMs = 0;
  private source: () => DomainFxView = () => OFF;
  private readonly tick = (_time: number, deltaMs: number): void => this.update(deltaMs, this.source());

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Layer,
  ) {
    const { w, h } = UI_SIZE;
    const p = DOMAIN_FX.vignettePx;
    const color = PALETTE[DOMAIN_COLORS.vignette];
    const rects: [number, number, number, number][] = [
      [0, 0, w, p],
      [0, h - p, w, p],
      [0, p, p, h - 2 * p],
      [w - p, p, p, h - 2 * p],
    ];
    this.edges = rects.map(([x, y, rw, rh]) =>
      scene.add
        .rectangle(x, y, rw, rh, color, 1)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH)
        .setAlpha(0)
        .setVisible(false),
    );
    layer.add(this.edges);
    this.reels = new JackpotReels(scene, layer);
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.tick);
  }

  /** A vista que o efeito lê a cada quadro (o `UiSetup` liga a do `domainPowers`). */
  bind(source: () => DomainFxView): void {
    this.source = source;
  }

  /** Anda o fade `dtMs` rumo à vista: de 0 a `vignetteAlpha` (ligada) ou de volta a 0 (apagada) em `fadeMs`. */
  update(dtMs: number, view: DomainFxView): void {
    const { fadeMs, vignetteAlpha } = DOMAIN_FX;
    const ms = this.litMs + (view.vignette ? dtMs : -dtMs);
    // O passo do quadro (1000/60) não é exato: um resto de arredondamento perto das pontas conta como a ponta.
    this.litMs = ms < SNAP_MS ? 0 : ms > fadeMs - SNAP_MS ? fadeMs : ms;
    const alpha = (vignetteAlpha * this.litMs) / fadeMs;
    for (const e of this.edges) e.setAlpha(alpha).setVisible(alpha > 0);
    this.reels.show(view.reels);
  }

  /** Lido dos retângulos vivos (L-076): o alpha desenhado, não o pedido. */
  debug(): DomainFxSnapshot {
    const edge = this.edges[0];
    return { vignette: edge.visible ? edge.alpha : 0, uiObjects: this.layer.list.length, reels: this.reels.debug() };
  }

  destroy(): void {
    this.scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.tick);
    for (const e of this.edges) e.destroy();
    this.reels.destroy();
  }
}
