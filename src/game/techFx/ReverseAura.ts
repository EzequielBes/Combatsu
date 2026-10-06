import Phaser from 'phaser';
import { snap2 } from '../../core/blueVortex';
import type { FxRegistry } from '../../core/fxRegistry';
import type { FxTimeline } from '../../core/fxTimeline';
import { auraMotes, auraWisps, type AuraOptions } from '../../core/reverseAura';
import { PALETTE } from '../art/palette';

/**
 * Cores da energia positiva (RCA-04): miolo branco `W`, meio branco quente `w` e borda ciano `C`/`c`. É a mesma
 * família da energia amaldiçoada azul do jogador, só que clara: no anime a Reversa aparece como luz, não como sombra.
 */
const C = { core: PALETTE.W, warm: PALETTE.w, edge: PALETTE.C, outer: PALETTE.c };

/** Atrás do player (profundidade 1): as línguas contornam a silhueta. */
const BACK_DEPTH = 0;
/** À frente do player: partículas e o pulso no chão. */
const FRONT_DEPTH = 2;
/** Línguas por aura e pontos por língua; a largura e a altura vêm do corpo desenhado (`body`). */
const WISP_COUNT = 9;
const WISP_SAMPLES = 12;
const MOTES = 14;
const MOTE_LIFE_MS = 950;
/** Some em 180 ms quando a canalização para. */
const FADE_MS = 180;
/** Pulso no chão a cada HP curado (RCA-05). */
const PULSE_MS = 340;

/** Bloco quadrado de `size` px na grade de 2 px. */
function block(g: Phaser.GameObjects.Graphics, x: number, y: number, size: number, color: number, alpha: number): void {
  if (alpha <= 0.02) return;
  g.fillStyle(color, alpha).fillRect(snap2(x) - size / 2, snap2(y) - size / 2, size, size);
}

/**
 * Aura da Energia Amaldiçoada Reversa no estilo de Jujutsu Kaisen (RCA-01..05): línguas de energia subindo do corpo
 * e ondulando (borda ciano, miolo branco), um brilho suave em volta do corpo, partículas de luz subindo e um pulso
 * no chão a cada cura. Cresce do pé durante a concentração (`warmup`) e some suave ao parar. Só desenha; a
 * geometria vem de `core/reverseAura` e a regra (quando está ativa) do `ReverseCursed`.
 */
export class ReverseAuraFx {
  private back: Phaser.GameObjects.Graphics | null = null;
  private front: Phaser.GameObjects.Graphics | null = null;
  private glow: Phaser.Filters.Glow | null = null;
  private timeMs = 0;
  /** 0..1: sobe na concentração, desce no fade. */
  private intensity = 0;
  private pulseMs = Infinity;
  private readonly degraded: boolean;

  private readonly wisps: AuraOptions;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: FxTimeline,
    private readonly registry: FxRegistry,
    /** Tamanho do corpo desenhado (px de mundo): o sprite HD é mais alto que o normal. */
    body: { width: number; height: number },
  ) {
    this.wisps = { count: WISP_COUNT, samples: WISP_SAMPLES, ...body };
    this.degraded = scene.game.renderer.type !== Phaser.WEBGL;
  }

  /** Visível agora (ativa ou apagando): o snapshot e o smoke leem isto. */
  get visible(): boolean {
    return this.back !== null;
  }

  /** Um HP curado (RCA-05): reacende o pulso no chão. */
  pulse(): void {
    this.pulseMs = 0;
  }

  /**
   * Chamar todo frame. `active`: canalizando; `warmup` (0..1): quanto da concentração já passou; (`x`, `feetY`):
   * centro do player na horizontal e o pé, na posição de desenho.
   */
  update(dtMs: number, active: boolean, warmup: number, x: number, feetY: number): void {
    const target = active ? 0.35 + 0.65 * warmup : 0;
    this.intensity = active ? target : Math.max(0, this.intensity - dtMs / FADE_MS);
    if (this.intensity <= 0) {
      this.destroy();
      return;
    }
    this.fx.add('reverse.aura', Math.max(dtMs, 1), 'game');
    if (!this.back) this.create();
    this.timeMs += dtMs;
    this.pulseMs += dtMs;
    this.drawBack(x, feetY);
    this.drawFront(x, feetY);
  }

  /** Nova run ou cena saindo: tira tudo da tela na hora. */
  destroy(): void {
    if (this.back) this.registry.scheduleDestroy(this.back, 0);
    if (this.front) this.registry.scheduleDestroy(this.front, 0);
    this.back = this.front = null;
    this.glow = null;
    this.intensity = 0;
    this.pulseMs = Infinity;
  }

  private create(): void {
    this.back = this.scene.add.graphics().setDepth(BACK_DEPTH);
    this.front = this.scene.add.graphics().setDepth(FRONT_DEPTH);
    this.registry.add(this.back);
    this.registry.add(this.front);
    if (!this.degraded) {
      this.back.enableFilters();
      this.glow = this.back.filters!.external.addGlow(C.edge, 1, 0, 1, false, 10, 6);
    }
  }

  /** Brilho do corpo e línguas (RCA-01, RCA-02, RCA-04): borda ciano larga por baixo, miolo branco fino por cima. */
  private drawBack(x: number, feetY: number): void {
    const k = this.intensity;
    const g = this.back!.clear();
    const breathe = 1 + 0.05 * Math.sin(this.timeMs / 140);
    // Brilho em volta do corpo, de leve.
    g.fillStyle(C.edge, 0.07 * k).fillEllipse(
      x,
      feetY - this.wisps.height * 0.55,
      this.wisps.width * 2.2 * breathe,
      this.wisps.height * 1.9 * breathe,
    );

    const wisps = auraWisps(this.timeMs, k, this.wisps);
    // Duas passadas: a borda ciano larga e, por cima, o miolo branco fino - a língua tem "contorno de luz".
    for (const layer of ['edge', 'core'] as const) {
      for (const wisp of wisps) {
        for (let i = 0; i < wisp.length - 1; i++) {
          const a = wisp[i];
          const b = wisp[i + 1];
          const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2));
          for (let s = 0; s < steps; s++) {
            const f = s / steps;
            const t = a.t + (b.t - a.t) * f;
            const px = x + a.x + (b.x - a.x) * f;
            const py = feetY + a.y + (b.y - a.y) * f;
            // A língua afina para a ponta: borda ciano de 6 px a 2 px, miolo branco de 4 px a 2 px.
            if (layer === 'edge') {
              const size = t < 0.35 ? 6 : t < 0.75 ? 4 : 2;
              block(g, px, py, size, t < 0.7 ? C.edge : C.outer, (0.85 - 0.4 * t) * k);
            } else {
              const size = t < 0.4 ? 4 : 2;
              if (t < 0.9) block(g, px, py, size, t < 0.55 ? C.core : C.warm, (0.95 - 0.55 * t) * k);
            }
          }
        }
      }
    }
    if (this.glow) this.glow.outerStrength = 0.6 + 0.8 * k;
  }

  /** Partículas de luz subindo (RCA-03) e o pulso no chão a cada cura (RCA-05). */
  private drawFront(x: number, feetY: number): void {
    const k = this.intensity;
    const g = this.front!.clear();
    for (const m of auraMotes(this.timeMs, MOTES, this.wisps.width, this.wisps.height, MOTE_LIFE_MS)) {
      const alpha = Math.sin(Math.PI * m.life) * 0.9 * k;
      block(g, x + m.x, feetY + m.y, 2, m.life < 0.5 ? C.core : C.edge, alpha);
    }
    if (this.pulseMs < PULSE_MS) {
      const p = this.pulseMs / PULSE_MS;
      g.lineStyle(2, C.core, (1 - p) * 0.9 * k).strokeEllipse(x, feetY - 1, 16 + p * 44, 4 + p * 10);
      g.lineStyle(2, C.edge, (1 - p) * 0.6 * k).strokeEllipse(x, feetY - 1, 10 + p * 30, 2 + p * 6);
    }
  }
}
