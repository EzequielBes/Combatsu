import { zoom } from '../game/art/hd/screen';
import { CAMERA_FEEL } from '../data/feel';
import type { Vec2 } from './hit';

/**
 * Tranco da câmera no golpe forte (CAM-01): desloca 4 px na direção do acerto e volta ao ponto de seguir em 120 ms.
 * Tempo REAL: quem chama passa o dt não escalado em `update`, para o tranco rodar durante o hitstop.
 */
export class CameraKick {
  private dir: Vec2 = { x: 0, y: 0 };
  private elapsed = Number.POSITIVE_INFINITY;

  /** Liga (ou reinicia) o tranco; a direção é normalizada (vetor nulo não desloca). */
  kick(dirX: number, dirY: number): void {
    const len = Math.hypot(dirX, dirY);
    this.dir = len === 0 ? { x: 0, y: 0 } : { x: dirX / len, y: dirY / len };
    this.elapsed = 0;
  }

  /** Avança o tempo real e devolve o deslocamento atual da câmera em px. */
  update(realDtMs: number): Vec2 {
    if (this.elapsed < CAMERA_FEEL.kickMs) this.elapsed += realDtMs;
    if (this.elapsed >= CAMERA_FEEL.kickMs) return { x: 0, y: 0 };
    const px = CAMERA_FEEL.kickPx * (1 - this.elapsed / CAMERA_FEEL.kickMs);
    return { x: this.dir.x * px, y: this.dir.y * px };
  }
}

/**
 * Pulso de zoom do golpe decisivo (CAM-02): 1,5 → 1,6 em 60 ms, segura 200 ms e volta a 1,5 em 120 ms. Tempo REAL.
 */
export class ZoomPulse {
  private elapsed = Number.POSITIVE_INFINITY;

  start(): void {
    this.elapsed = 0;
  }

  /** Avança o tempo real e devolve o zoom atual. */
  update(realDtMs: number): number {
    const { zoomInMs: inMs, zoomHoldMs: holdMs, zoomOutMs: outMs } = CAMERA_FEEL;
    const base = zoom(CAMERA_FEEL.zoomBase);
    const peak = zoom(CAMERA_FEEL.zoomPeak);
    const total = inMs + holdMs + outMs;
    if (this.elapsed < total) this.elapsed += realDtMs;
    const t = this.elapsed;
    if (t >= total) return base;
    if (t < inMs) return base + (peak - base) * (t / inMs);
    if (t <= inMs + holdMs) return peak;
    return peak - (peak - base) * ((t - inMs - holdMs) / outMs);
  }
}
