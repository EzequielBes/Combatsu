import Phaser from 'phaser';
import { PALETTE } from './art/palette';
import { duotoneMatrix } from './techFx/KokusenFx';

/** Quantos quadros renderizados o quadro de impacto fica na câmera (IMP-11): a linguagem de 2 quadros do anime. */
export const IMPACT_FRAME_RENDERS = 2;

/**
 * Quadro de impacto do golpe decisivo: por exatamente 2 quadros renderizados a câmera do mundo ganha o postFX
 * `impactFrame` (duotone de energia amaldiçoada: sombras no marinho quase preto `k`, luzes no ciano `C`, como os
 * quadros de corte do anime; o negativo preto e vermelho fica só para o Kokusen) e depois ele é removido
 * (IMP-11). A contagem é em `POST_RENDER` do jogo, que também roda durante o hitstop, então o efeito dura 2
 * quadros na tela mesmo com a simulação congelada. Um mesmo `swingId` só dispara uma vez (IMP-14). Sem WebGL o
 * postFX não existe: `degraded` fica `true` e `trigger` não faz nada (IMP-12); anel e espinhos seguem no `CursedFx`.
 */
export class ImpactFrame {
  /** `true` sem WebGL (IMP-12): o postFX não é criado. */
  readonly degraded: boolean;
  private effect: Phaser.FX.ColorMatrix | null = null;
  private rendersLeft = 0;
  private lastSwingId: number | null = null;

  /**
   * `canApply` devolve `false` com o jogo pausado pela loja ou pelo título (EDG-05): o quadro não começa.
   */
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly canApply: () => boolean = () => true,
  ) {
    this.degraded = scene.game.renderer.type !== Phaser.WEBGL;
    scene.game.events.on(Phaser.Core.Events.POST_RENDER, this.onPostRender, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  /** `true` enquanto o postFX está na câmera (o snapshot lê isto: `fx.lastImpact.impactFrame`). */
  get applied(): boolean {
    return this.effect !== null;
  }

  /**
   * Começa o quadro de impacto do golpe `swingId`. Devolve `true` se começou; `false` se o `swingId` já disparou
   * (IMP-14), se o jogo está pausado (EDG-05) ou sem WebGL (IMP-12).
   */
  trigger(swingId: number): boolean {
    if (this.lastSwingId === swingId) return false;
    if (this.degraded || !this.canApply()) return false;
    this.lastSwingId = swingId;
    this.clear();
    const cm = this.scene.cameras.main.postFX.addColorMatrix();
    cm.set(duotoneMatrix(PALETTE.k, PALETTE.C));
    cm.contrast(0.4, true);
    this.effect = cm;
    this.rendersLeft = IMPACT_FRAME_RENDERS;
    return true;
  }

  /** Remove o postFX na hora e solta os ouvintes (reinício da cena). */
  destroy(): void {
    this.clear();
    this.scene.game?.events?.off(Phaser.Core.Events.POST_RENDER, this.onPostRender, this);
  }

  private onPostRender(): void {
    if (this.effect === null) return;
    this.rendersLeft -= 1;
    if (this.rendersLeft <= 0) this.clear();
  }

  private clear(): void {
    if (this.effect) this.scene.cameras.main?.postFX?.remove(this.effect as unknown as Phaser.FX.Controller);
    this.effect = null;
    this.rendersLeft = 0;
  }
}
