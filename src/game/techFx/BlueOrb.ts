import Phaser from 'phaser';
import { inwardStreaks, snap2, vortexArms, type VortexArmsOptions } from '../../core/blueVortex';
import type { FxRegistry } from '../../core/fxRegistry';
import type { FxTimeline } from '../../core/fxTimeline';
import { PALETTE } from '../art/palette';
import { TEX } from '../textures';

/**
 * Cores do Azul no anime (BLA-04): azul-profundo `d` por fora, azul `c` no meio, ciano `C` perto do núcleo e branco
 * `W` no centro incandescente. Nada de cinza nem de roxo: o Azul é luz azul sendo sugada para um ponto.
 */
const C = { deep: PALETTE.d, mid: PALETTE.c, light: PALETTE.C, white: PALETTE.W };

/** Braços do vórtice (BLA-01): 4 braços dando pouco mais de uma volta, girando no sentido horário. */
const ARMS: VortexArmsOptions = { arms: 4, outer: 46, inner: 12, turns: 1.1, spin: -7.5, samples: 28 };
/**
 * Redemoinho na superfície da esfera (BLA-03): braços claros e rápidos desenhados por cima do núcleo, para ele
 * "revolver" em vez de ler como anéis parados.
 */
const ARMS_SURFACE: VortexArmsOptions = { arms: 3, outer: 13, inner: 3, turns: 0.8, spin: -14, samples: 10 };
/** Riscos de luz sugados (BLA-02): curtos e bem curvos, girando junto com o vórtice. */
const STREAKS = { count: 14, outer: 60, inner: 14, lifeMs: 420, swirl: -3.2, length: 0.2 };
/** Núcleo (BLA-03): raios das camadas, de fora para dentro, em px. */
const CORE_RINGS: ReadonlyArray<[number, number]> = [
  [14, C.mid],
  [11, C.light],
  [6, C.white],
];
/** Pulso do núcleo e do halo. */
const PULSE_MS = 360;
/** Halo (bloom) atrás do vórtice. */
const HALO_RADIUS = 40;
/** 3 anéis de espaço dobrando, contraindo para o centro, defasados. */
const DISTORT_RING_COUNT = 3;
const DISTORT_CYCLE_MS = 760;
const DISTORT_RADIUS = 58;
const DEBRIS_EVERY_MS = 160;
const IMPLODE_MS = 200;
const IMPLODE_FLASH_MS = 160;
/** Raios de choque da implosão. */
const IMPLODE_SPIKES = 10;

/** Desenha um bloco quadrado de `size` px centrado na grade de 2 px. */
function block(g: Phaser.GameObjects.Graphics, x: number, y: number, size: number, color: number, alpha: number): void {
  if (alpha <= 0.02) return;
  g.fillStyle(color, alpha).fillRect(snap2(x) - size / 2, snap2(y) - size / 2, size, size);
}

/** Linha de blocos de 2 px entre dois pontos, com a cor e a opacidade interpoladas da cauda à cabeça. */
function blockLine(
  g: Phaser.GameObjects.Graphics,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  color: (t: number) => number,
  alpha: (t: number) => number,
): void {
  const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 2));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    block(g, ax + (bx - ax) * t, ay + (by - ay) * t, 2, color(t), alpha(t));
  }
}

/**
 * Vistas do Azul no estilo do anime (BLU-08, BLA-01..05): núcleo pequeno e incandescente em camadas com brilho,
 * halo azul, braços de vórtice girando e afunilando, riscos de luz sugados em curva, anéis de distorção contraindo
 * e poeira do chão puxada; termina numa implosão com flash e raios de choque. Só desenha; o puxão/dano é do
 * `TechRunner`, a partir do `BlueOrbState` (core, puro), e a geometria do vórtice vem de `core/blueVortex`.
 */
export class BlueOrbFx {
  private halo: Phaser.GameObjects.Graphics | null = null;
  private vortex: Phaser.GameObjects.Graphics | null = null;
  private core: Phaser.GameObjects.Graphics | null = null;
  private distortRing: Phaser.GameObjects.Graphics | null = null;
  private glow: Phaser.Filters.Glow | null = null;
  private elapsedMs = 0;
  private debrisMs = 0;
  /** Seed dos riscos: muda a cada orbe, para dois Azuis seguidos não desenharem os mesmos riscos. */
  private seed = 0;
  private readonly degraded: boolean;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: FxTimeline,
    private readonly registry: FxRegistry,
  ) {
    // AD-009: sem WebGL, nenhum filtro é criado e o resto do efeito toca igual.
    this.degraded = scene.game.renderer.type !== Phaser.WEBGL;
  }

  /** BLU-08/09: chamado todo frame em que o orbe existe. */
  update(dtMs: number, x: number, y: number): void {
    this.fx.add('blue.core', Math.max(dtMs, 1), 'game');
    this.fx.add('blue.spiralIn', Math.max(dtMs, 1), 'game');
    this.fx.add('blue.distortRing', Math.max(dtMs, 1), 'game');
    this.fx.add('blue.debrisIn', Math.max(dtMs, 1), 'game');

    if (!this.core) this.create();
    this.elapsedMs += dtMs;
    const t = this.elapsedMs;
    const pulse = Math.sin((t / PULSE_MS) * Math.PI * 2);
    // Nasce rápido (os primeiros 120 ms crescem do ponto ao tamanho cheio), como o Azul se formando na mão.
    const grow = Math.min(1, t / 120);

    this.drawHalo(x, y, pulse, grow);
    this.drawDistortion(x, y, grow);
    this.drawVortex(x, y, t, grow);
    this.drawCore(x, y, pulse, grow);
    this.spawnDebris(dtMs, x, y);
  }

  /**
   * BLU-11: implosão (BLA-05) - a esfera colapsa num ponto branco e o espaço que estava dobrado volta de uma vez:
   * anel branco e ciano e raios curtos estourando para fora. Some com o orbe todo.
   */
  implode(x: number, y: number): void {
    const g = this.scene.add.graphics().setDepth(4);
    this.registry.add(g);
    this.registry.scheduleDestroy(g, IMPLODE_MS + IMPLODE_FLASH_MS);
    this.scene.tweens.addCounter({
      from: 0,
      to: IMPLODE_MS + IMPLODE_FLASH_MS,
      duration: IMPLODE_MS + IMPLODE_FLASH_MS,
      onUpdate: (tw) => {
        const ms = tw.getValue() ?? 0;
        g.clear();
        // Colapso: o ponto encolhe rápido (quadrático) até sumir no fim de IMPLODE_MS.
        const c = Math.min(1, ms / IMPLODE_MS);
        const r = snap2(CORE_RINGS[0][0] * (1 - c) * (1 - c));
        if (r >= 2)
          g.fillStyle(C.light, 1)
            .fillCircle(x, y, r + 2)
            .fillStyle(C.white, 1)
            .fillCircle(x, y, r);
        // Estouro: começa no meio do colapso.
        const k = Math.max(0, Math.min(1, (ms - IMPLODE_MS * 0.5) / IMPLODE_FLASH_MS));
        if (k <= 0 || k >= 1) return;
        g.lineStyle(4, C.white, 1 - k).strokeCircle(x, y, 4 + k * 46);
        g.lineStyle(2, C.light, (1 - k) * 0.8).strokeCircle(x, y, 2 + k * 30);
        for (let i = 0; i < IMPLODE_SPIKES; i++) {
          const a = (i / IMPLODE_SPIKES) * Math.PI * 2 + 0.3;
          const r0 = 10 + k * 34;
          const r1 = r0 + 10 * (1 - k);
          blockLine(
            g,
            x + Math.cos(a) * r0,
            y + Math.sin(a) * r0,
            x + Math.cos(a) * r1,
            y + Math.sin(a) * r1,
            () => C.white,
            () => 1 - k,
          );
        }
      },
    });

    this.hide();
  }

  /** Remove as vistas persistentes (implosão ou cancelamento); TFX-03/09 via `FxRegistry` (prazo 0). */
  hide(): void {
    for (const g of [this.halo, this.vortex, this.core, this.distortRing]) if (g) this.registry.scheduleDestroy(g, 0);
    this.halo = this.vortex = this.core = this.distortRing = null;
    this.glow = null;
    this.elapsedMs = 0;
    this.debrisMs = 0;
  }

  private create(): void {
    this.seed++;
    this.halo = this.scene.add.graphics().setDepth(1);
    this.distortRing = this.scene.add.graphics().setDepth(1);
    this.vortex = this.scene.add.graphics().setDepth(2);
    this.core = this.scene.add.graphics().setDepth(3);
    for (const g of [this.halo, this.distortRing, this.vortex, this.core]) this.registry.add(g);
    if (!this.degraded) {
      // Phaser 4: o objeto liga os filtros antes de usar; o Glow fica no espaço de tela, como no Vermelho.
      this.core.enableFilters();
      this.glow = this.core.filters!.external.addGlow(C.light, 6, 0, 1, false, 16, 14);
    }
  }

  /** Bloom azul atrás de tudo (BLA-04): dois discos translúcidos pulsando. */
  private drawHalo(x: number, y: number, pulse: number, grow: number): void {
    const r = HALO_RADIUS * grow * (1 + 0.06 * pulse);
    this.halo!.clear()
      .fillStyle(C.deep, 0.32)
      .fillCircle(x, y, r)
      .fillStyle(C.mid, 0.16)
      .fillCircle(x, y, r * 0.72);
  }

  /** Anéis de espaço dobrando (BLU-08): finos, do azul-profundo ao azul, contraindo e sumindo no núcleo. */
  private drawDistortion(x: number, y: number, grow: number): void {
    const g = this.distortRing!.clear();
    for (let i = 0; i < DISTORT_RING_COUNT; i++) {
      const phase = ((this.elapsedMs / DISTORT_CYCLE_MS + i / DISTORT_RING_COUNT) % 1) as number; // 0 borda -> 1 centro
      const radius = (DISTORT_RADIUS * (1 - phase) + 14) * grow;
      const alpha = 0.55 * Math.sin(Math.PI * phase);
      g.lineStyle(2, i % 2 === 0 ? C.deep : C.mid, alpha).strokeCircle(x, y, radius);
    }
  }

  /** Braços do vórtice e riscos sugados (BLA-01, BLA-02), em blocos de pixel. */
  private drawVortex(x: number, y: number, t: number, grow: number): void {
    const g = this.vortex!.clear();
    // Claros o bastante para ler no céu noturno: azul na borda, ciano no meio, branco chegando ao núcleo.
    const armColor = (depth: number): number => (depth < 0.4 ? C.mid : depth < 0.8 ? C.light : C.white);
    for (const arm of vortexArms(t, ARMS)) {
      for (let i = 0; i < arm.length - 1; i++) {
        const a = arm[i];
        const b = arm[i + 1];
        const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2));
        for (let s = 0; s < steps; s++) {
          const f = s / steps;
          const depth = a.depth + (b.depth - a.depth) * f;
          // Traço contínuo, mais grosso e mais opaco perto do núcleo: o braço "engorda" ao ser sugado.
          const size = depth > 0.55 ? 4 : 2;
          const alpha = (0.4 + 0.55 * depth) * grow;
          block(
            g,
            x + (a.x + (b.x - a.x) * f) * grow,
            y + (a.y + (b.y - a.y) * f) * grow,
            size,
            armColor(depth),
            alpha,
          );
        }
      }
    }
    for (const s of inwardStreaks(this.seed, t, STREAKS)) {
      const fadeIn = Math.min(1, s.progress * 4);
      blockLine(
        g,
        x + s.tail.x * grow,
        y + s.tail.y * grow,
        x + s.head.x * grow,
        y + s.head.y * grow,
        (k) => (k > 0.7 ? C.white : C.light),
        (k) => (0.25 + 0.75 * k) * fadeIn * grow,
      );
    }
  }

  /** Núcleo incandescente em camadas (BLA-03), pulsando; o Glow (WebGL) espalha a luz ciano. */
  private drawCore(x: number, y: number, pulse: number, grow: number): void {
    const g = this.core!.clear();
    for (const [r, color] of CORE_RINGS) {
      const rr = Math.max(1, snap2(r * grow * (1 + 0.08 * pulse)));
      g.fillStyle(color, 1).fillCircle(x, y, rr);
    }
    // A superfície revolve: braços brancos/ciano girando rápido por cima das camadas.
    for (const arm of vortexArms(this.elapsedMs, ARMS_SURFACE)) {
      for (const p of arm) block(g, x + p.x * grow, y + p.y * grow, 2, p.depth > 0.5 ? C.white : C.deep, 0.7 * grow);
    }
    if (this.glow) this.glow.outerStrength = 5 + 2 * pulse;
  }

  /** Pedrinhas e poeira do chão sendo sugadas (BLU-08). */
  private spawnDebris(dtMs: number, x: number, y: number): void {
    this.debrisMs += dtMs;
    if (this.debrisMs < DEBRIS_EVERY_MS) return;
    this.debrisMs -= DEBRIS_EVERY_MS;
    const gx = x + (Math.random() * 2 - 1) * 48;
    const gy = y + 34;
    const burst = this.scene.add
      .particles(gx, gy, TEX.fxBit, {
        frame: 'dust',
        moveToX: x,
        moveToY: y,
        lifespan: 300,
        scale: { start: 1.2, end: 0.4 },
        alpha: { start: 0.9, end: 0 },
        emitting: false,
      })
      .setDepth(2);
    burst.explode(4);
    this.registry.add(burst);
    this.registry.scheduleDestroy(burst, 360);
  }
}
