import Phaser from 'phaser';
import type { FxRegistry } from '../../core/fxRegistry';
import type { FxTimeline } from '../../core/fxTimeline';
import { PALETTE } from '../art/palette';
import { TEX } from '../textures';

const SPIRAL_RADIUS = 46;
const SPIRAL_MAX = 60; // TFX-04
/** Polimento (feat(fx)): "núcleo d grande" - o frame de 10 texels sozinho (20 px) sumia na tela; agora ~52 px. */
const CORE_DISPLAY_PX = 52;
/** Pulso da borda `C` por cima do núcleo (Direção de arte "borda C pulsando"), mesma cadência do RedOrb.glowRing. */
const CORE_PULSE_CYCLE_MS = 420;
/** 3 anéis de distorção defasados (Direção de arte "2-3 anéis... contraindo"): cada um no seu próprio ponto do
 * ciclo, para nunca sumirem todos juntos e ficarem sempre visíveis contraindo. */
const DISTORT_RING_COUNT = 3;
const DISTORT_CYCLE_MS = 900;
const DEBRIS_EVERY_MS = 180;
const IMPLODE_MS = 220;
const IMPLODE_FLASH_MS = 140;

/**
 * Vistas do Azul (BLU-08): núcleo grande com borda pulsando, espiral de partículas entrando, 3 anéis de distorção
 * contraindo e pedrinhas/poeira do chão sugadas; termina numa implosão branca com um flash curto. Só desenha; o
 * puxão/dano é do `TechRunner`, a partir do `BlueOrbState` (core, puro) — não há corpo Matter próprio (a posição
 * nunca muda, BLU-12).
 */
export class BlueOrbFx {
  private core: Phaser.GameObjects.Sprite | null = null;
  private corePulse: Phaser.GameObjects.Graphics | null = null;
  private corePulseMs = 0;
  private spiral: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private distortRing: Phaser.GameObjects.Graphics | null = null;
  private distortMs = 0;
  private debrisMs = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: FxTimeline,
    private readonly registry: FxRegistry,
  ) {}

  /** BLU-08/09: chamado todo frame em que o orbe existe. */
  update(dtMs: number, x: number, y: number): void {
    this.fx.add('blue.core', Math.max(dtMs, 1), 'game');
    this.fx.add('blue.spiralIn', Math.max(dtMs, 1), 'game');
    this.fx.add('blue.distortRing', Math.max(dtMs, 1), 'game');
    this.fx.add('blue.debrisIn', Math.max(dtMs, 1), 'game');

    if (!this.core) {
      this.core = this.scene.add.sprite(x, y, TEX.techOrbBlue, 'orb').setDisplaySize(CORE_DISPLAY_PX, CORE_DISPLAY_PX).setDepth(2);
      this.registry.add(this.core);
    }

    if (!this.corePulse) {
      this.corePulse = this.scene.add.graphics().setDepth(2);
      this.registry.add(this.corePulse);
      this.corePulseMs = 0;
    }
    this.corePulseMs += dtMs;
    const pulse = 1 + 0.14 * Math.sin(this.corePulseMs / (CORE_PULSE_CYCLE_MS / (Math.PI * 2)));
    this.corePulse.clear().lineStyle(3, PALETTE.C, 0.85).strokeCircle(x, y, (CORE_DISPLAY_PX / 2 - 2) * pulse);

    if (!this.spiral) {
      // BLU-09: nascem na borda de um círculo em volta do orbe e são mandadas para o próprio centro (moveTo).
      // Polimento: mais partículas, mais rápido e maiores ("bem visível", Direção de arte).
      this.spiral = this.scene.add
        .particles(x, y, TEX.techSpark, {
          frame: 'blueIn',
          emitZone: { type: 'edge', source: new Phaser.Geom.Circle(0, 0, SPIRAL_RADIUS), quantity: 48 },
          moveToX: x,
          moveToY: y,
          lifespan: 480,
          scale: { start: 1.8, end: 0.6 },
          alpha: { start: 1, end: 0 },
          maxAliveParticles: SPIRAL_MAX, // TFX-04
          frequency: 16,
        })
        .setDepth(2);
      this.registry.add(this.spiral);
    }

    if (!this.distortRing) {
      this.distortRing = this.scene.add.graphics().setDepth(1);
      this.registry.add(this.distortRing);
      this.distortMs = 0;
    }
    this.distortMs = (this.distortMs + dtMs) % DISTORT_CYCLE_MS;
    this.distortRing.clear();
    for (let i = 0; i < DISTORT_RING_COUNT; i++) {
      // Cada anel defasado por 1/3 do ciclo: sempre há pelo menos um bem visível contraindo (Direção de arte,
      // "2-3 anéis de distorção contraindo (não cinza)") - grosso, ciano vivo, nunca a cor cinza do polimento antigo.
      const phase = (this.distortMs / DISTORT_CYCLE_MS + i / DISTORT_RING_COUNT) % 1; // 0 (borda) -> 1 (centro)
      const radius = SPIRAL_RADIUS * (1 - phase) + 6;
      const alpha = 0.85 * Math.sin(Math.PI * (1 - phase)); // nasce e morre suave, pico no meio do caminho
      this.distortRing.lineStyle(3, PALETTE.C, Math.max(0, alpha)).strokeCircle(x, y, radius);
    }

    this.debrisMs += dtMs;
    if (this.debrisMs >= DEBRIS_EVERY_MS) {
      this.debrisMs -= DEBRIS_EVERY_MS;
      // Pedrinhas/poeira do chão sendo sugadas (Direção de arte): nascem perto do chão, ao redor do orbe, e são
      // puxadas para o centro - textura de poeira (`fxBit`/dust), não a faísca ciano da espiral, para dar variedade.
      const gx = x + (Math.random() * 2 - 1) * 44;
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

  /** BLU-11: implosão num ponto branco com um flash curto (Direção de arte, "Implosão") - some com o orbe todo. */
  implode(x: number, y: number): void {
    const flash = this.scene.add.sprite(x, y, TEX.techOrbBlue, 'orb').setDisplaySize(CORE_DISPLAY_PX, CORE_DISPLAY_PX).setTintFill(PALETTE.W).setDepth(3);
    this.registry.add(flash);
    this.registry.scheduleDestroy(flash, IMPLODE_MS);
    this.scene.tweens.add({ targets: flash, scale: 0.1, alpha: 0, duration: IMPLODE_MS });

    // Pequeno flash (Direção de arte): um anel branco curto que estoura para fora no instante do colapso, além
    // do ponto que encolhe - sem ele a implosão lia como um simples fade, não como um "pop".
    const burst = this.scene.add.graphics().setDepth(3);
    this.registry.add(burst);
    this.registry.scheduleDestroy(burst, IMPLODE_FLASH_MS);
    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: IMPLODE_FLASH_MS,
      onUpdate: (tw) => {
        const t = tw.getValue() ?? 0;
        burst.clear().lineStyle(4, PALETTE.W, 1 - t).strokeCircle(x, y, 4 + t * (CORE_DISPLAY_PX / 2 + 14));
      },
    });

    this.hide();
  }

  /** Remove as vistas persistentes (implosão ou cancelamento); TFX-03/09 via `FxRegistry` (prazo 0). */
  hide(): void {
    if (this.core) {
      this.registry.scheduleDestroy(this.core, 0);
      this.core = null;
    }
    if (this.corePulse) {
      this.registry.scheduleDestroy(this.corePulse, 0);
      this.corePulse = null;
    }
    if (this.spiral) {
      this.registry.scheduleDestroy(this.spiral, 0);
      this.spiral = null;
    }
    if (this.distortRing) {
      this.registry.scheduleDestroy(this.distortRing, 0);
      this.distortRing = null;
    }
  }
}
