import Phaser from 'phaser';
import type { FxRegistry } from '../../core/fxRegistry';
import type { Vec2 } from '../../core/hit';
import { PALETTE } from '../art/palette';
import { TEX } from '../textures';
import { RED_FX_COLORS } from './redPalette';
import { FRAME_MS } from './redTiming';

/** Cores do efeito, sempre lidas de `RED_FX_COLORS` (RDA-03/14): nunca `a`/`A`. */
export const RED_COLORS = {
  core: PALETTE[RED_FX_COLORS.core],
  glow: PALETTE[RED_FX_COLORS.glow],
  ring: PALETTE[RED_FX_COLORS.ring],
  edge: PALETTE[RED_FX_COLORS.edge],
  shadow: PALETTE[RED_FX_COLORS.shadow],
  flash: PALETTE[RED_FX_COLORS.flash],
};

const C = RED_COLORS;

/** Polimento (feat(fx)): "flash branco no núcleo (1-2 frames)" - era 100 ms (6 frames), tempo demais para um flash. */
export const FLASH_CORE_MS = FRAME_MS * 2;
/** "esfera vermelha expandindo em 3 frames" (Direção de arte, beat 6): mesma convenção do SHOCK_MS de KokusenFx. */
export const SPHERE_MS = FRAME_MS * 3;
/** Polimento: a esfera cresce até o raio real do dano (RED-10, redOrb.ts DETONATION_RADIUS) - antes parava em 30 px. */
const SPHERE_MAX_RADIUS = 96;
/** Polimento: onda de choque GROSSA (Direção de arte) e mais demorada, passando bem além do raio de dano. */
export const SHOCK_RING_MS = 280;
const SHOCK_RING_MAX_RADIUS = 160;
const SHOCK_RING_THICK_OUT = 6;
const SHOCK_RING_THICK_IN = 4;
const EMBER_DEBRIS_COUNT = 22; // TFX-04: bem abaixo de 64
export const DEBRIS_MS = 420;
/** Polimento: detritos do chão (pedaços `k`/`s`), simulados à mão (sem body Matter) num único Graphics. */
const CHUNK_DEBRIS_COUNT = 9;
const CHUNK_GRAVITY = 500; // px/s^2
const SMOKE_COUNT = 10;
const SMOKE_MS = 560;

/** Snap para a grade de 2 px (AD-009/TFX-02): geometria procedural sempre em texels pares. */
export const evenPx = (v: number): number => Math.round(v / 2) * 2;

interface ChunkDebris {
  readonly vx: number;
  readonly vy: number;
  readonly size: number;
  readonly color: number;
}

/**
 * Parte de mundo da detonação do Vermelho (RED-11): flash do núcleo, esfera, onda de choque, detritos e fumaça,
 * nesta ordem. A tela vermelha e a tremida ficam no `RedOrbFx`, que é dono do retângulo de flash.
 */
export function redDetonationBurst(scene: Phaser.Scene, registry: FxRegistry, point: Vec2): void {
  detonateCore(scene, registry, point);
  detonateSphere(scene, registry, point);
  detonateShockRing(scene, registry, point);
  detonateEmbers(scene, registry, point);
  detonateChunks(scene, registry, point);
  detonateSmoke(scene, registry, point);
}

function detonateCore(scene: Phaser.Scene, registry: FxRegistry, point: Vec2): void {
  const flash = scene.add
    .sprite(point.x, point.y, TEX.techOrbRed12, 'orb')
    .setTint(C.core)
    .setTintMode(Phaser.TintModes.FILL)
    .setScale(1.6)
    .setDepth(6);
  registry.add(flash);
  registry.scheduleDestroy(flash, FLASH_CORE_MS);
  scene.tweens.add({ targets: flash, alpha: 0, scale: 0.8, duration: FLASH_CORE_MS });
}

/**
 * Esfera: 3 camadas concêntricas (fora -> dentro) - borda escura `k`, corpo `R`, núcleo `W` encolhendo (o
 * flash inicial que "vira" o corpo vermelho conforme a esfera cresce até os 96 px do dano real, RED-10).
 */
function detonateSphere(scene: Phaser.Scene, registry: FxRegistry, point: Vec2): void {
  const sphere = scene.add.graphics().setDepth(4);
  registry.add(sphere);
  registry.scheduleDestroy(sphere, SPHERE_MS);
  scene.tweens.addCounter({
    from: 0,
    to: 1,
    duration: SPHERE_MS,
    onUpdate: (tw) => {
      const t = tw.getValue() ?? 0;
      const r = evenPx(8 + t * (SPHERE_MAX_RADIUS - 8));
      const coreR = evenPx(Math.max(0, r * 0.5 * (1 - t)));
      sphere
        .clear()
        .fillStyle(C.shadow, 0.85 * (1 - t))
        .fillCircle(point.x, point.y, r + 4)
        .fillStyle(C.glow, 0.9 - t * 0.2)
        .fillCircle(point.x, point.y, r)
        .fillStyle(C.core, Math.max(0, 1 - t * 1.6))
        .fillCircle(point.x, point.y, coreR);
    },
  });
}

/**
 * Onda de choque: anel GROSSO (4-6 px, Direção de arte) - branco por baixo, vermelho por cima e mais fino,
 * deixando 1-2 px de borda branca visível nos dois lados (mesma técnica de "contorno" das outras vistas).
 */
function detonateShockRing(scene: Phaser.Scene, registry: FxRegistry, point: Vec2): void {
  const shock = scene.add.graphics().setDepth(4);
  registry.add(shock);
  registry.scheduleDestroy(shock, SHOCK_RING_MS);
  scene.tweens.addCounter({
    from: 0,
    to: 1,
    duration: SHOCK_RING_MS,
    onUpdate: (tw) => {
      const t = tw.getValue() ?? 0;
      const r = evenPx(20 + t * (SHOCK_RING_MAX_RADIUS - 20));
      const a = 1 - t;
      shock
        .clear()
        .lineStyle(SHOCK_RING_THICK_OUT, C.ring, a)
        .strokeCircle(point.x, point.y, r)
        .lineStyle(SHOCK_RING_THICK_IN, C.glow, a)
        .strokeCircle(point.x, point.y, r);
    },
  });
}

/** Detritos-faísca (embers): a mesma faísca `redOut`, em mais quantidade e maior, para o "estouro" ficar denso. */
function detonateEmbers(scene: Phaser.Scene, registry: FxRegistry, point: Vec2): void {
  const embers = scene.add
    .particles(point.x, point.y, TEX.techSpark, {
      frame: 'redOut',
      angle: { min: 0, max: 360 },
      speed: { min: 80, max: 220 },
      lifespan: DEBRIS_MS,
      scale: { start: 1.4, end: 0.4 },
      alpha: { start: 1, end: 0 },
      gravityY: 260,
      emitting: false,
    })
    .setDepth(4);
  embers.explode(EMBER_DEBRIS_COUNT); // TFX-04: bem abaixo de 64
  registry.add(embers);
  registry.scheduleDestroy(embers, DEBRIS_MS);
}

/**
 * Detritos do chão (pedaços `k`/`s`, Direção de arte): sem particle system (só 2 cores fixas por peça, cada
 * uma com seu próprio tamanho) - um único Graphics simula a queda de cada pedaço à mão (sem body Matter).
 */
function detonateChunks(scene: Phaser.Scene, registry: FxRegistry, point: Vec2): void {
  const chunks: ChunkDebris[] = Array.from({ length: CHUNK_DEBRIS_COUNT }, (_, i) => {
    const angle = Math.PI * (i / CHUNK_DEBRIS_COUNT) * 2 + Math.random() * 0.6 - 0.9; // espalhado, tendendo para cima
    const speed = 70 + Math.random() * 110;
    return {
      vx: Math.cos(angle) * speed,
      vy: -Math.abs(Math.sin(angle) * speed) - 40,
      size: evenPx(2 + Math.round(Math.random())) || 2,
      color: i % 2 === 0 ? C.shadow : C.glow,
    };
  });
  const debris = scene.add.graphics().setDepth(4);
  registry.add(debris);
  registry.scheduleDestroy(debris, DEBRIS_MS);
  scene.tweens.addCounter({
    from: 0,
    to: DEBRIS_MS,
    duration: DEBRIS_MS,
    onUpdate: (tw) => {
      const elapsedMs = tw.getValue() ?? 0;
      const tSec = elapsedMs / 1000;
      const a = 1 - elapsedMs / DEBRIS_MS;
      debris.clear();
      for (const c of chunks) {
        const px = evenPx(point.x + c.vx * tSec);
        const py = evenPx(point.y + c.vy * tSec + 0.5 * CHUNK_GRAVITY * tSec * tSec);
        debris.fillStyle(c.color, a).fillRect(px - c.size / 2, py - c.size / 2, c.size, c.size);
      }
    },
  });
}

/** Fumaça (Direção de arte, beat 6): rajada curta com a textura genérica `smoke`, sem tint (ART-01). */
function detonateSmoke(scene: Phaser.Scene, registry: FxRegistry, point: Vec2): void {
  const smoke = scene.add
    .particles(point.x, point.y, TEX.smoke, {
      frame: 'smoke',
      speed: { min: 20, max: 70 },
      angle: { min: 200, max: 340 },
      lifespan: SMOKE_MS,
      scale: { start: 1.6, end: 0.4 },
      alpha: { start: 0.55, end: 0 },
      emitting: false,
    })
    .setDepth(3);
  smoke.explode(SMOKE_COUNT);
  registry.add(smoke);
  registry.scheduleDestroy(smoke, SMOKE_MS);
}
