import type Phaser from 'phaser';
import type { Vec2 } from '../core/hit';
import { FOCUS_FEEL } from '../data/feel';
import { PALETTE } from './art/palette';

/** Acima do tom da câmera lenta (profundidade 90) e abaixo das faixas do HUD. */
const DEPTH = 95;
/** Largura (px) da base de cada linha, na borda da tela: varia entre as duas por linha. */
const BASE_MIN = 5;
const BASE_MAX = 10;
/** Quanto a ponta interna de cada linha varia além do círculo livre (px), para o leque não ficar uniforme. */
const TIP_JITTER = 46;
const LINE_ALPHA = 0.85;

/** Valor determinístico em 0..1 por índice e canal: o leque de uma tela é sempre o mesmo para o mesmo ponto. */
const noise = (i: number, channel: number): number => {
  const v = Math.sin(i * 12.9898 + channel * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

/** Distância do ponto até a borda da tela na direção do ângulo (a linha começa fora dela, com folga). */
function edgeDistance(center: Vec2, angle: number, w: number, h: number): number {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const tx = dx > 0 ? (w - center.x) / dx : dx < 0 ? -center.x / dx : Number.POSITIVE_INFINITY;
  const ty = dy > 0 ? (h - center.y) / dy : dy < 0 ? -center.y / dy : Number.POSITIVE_INFINITY;
  return Math.min(tx, ty);
}

/**
 * Triângulos das linhas de foco (FOC-01, FOC-02): `FOCUS_FEEL.lines` linhas radiais, largas na borda da tela e
 * afinadas até uma ponta que para fora do círculo livre de `clearRadiusPx` ao redor de `center` (coordenadas de tela).
 * Pura, para o desenho e o teste dividirem a conta.
 */
export function focusLinePolygons(center: Vec2, w: number, h: number): Vec2[][] {
  const polys: Vec2[][] = [];
  const n = FOCUS_FEEL.lines;
  for (let i = 0; i < n; i++) {
    const angle = ((i + noise(i, 1) * 0.6) / n) * Math.PI * 2;
    const tip = FOCUS_FEEL.clearRadiusPx + noise(i, 2) * TIP_JITTER;
    const outer = edgeDistance(center, angle, w, h) + 4;
    if (outer <= tip + 8) continue; // o ponto está colado na borda: sem espaço para esta linha
    const half = (BASE_MIN + noise(i, 3) * (BASE_MAX - BASE_MIN)) / 2;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const nx = -dy;
    const ny = dx;
    polys.push([
      { x: center.x + dx * tip, y: center.y + dy * tip },
      { x: center.x + dx * outer + nx * half, y: center.y + dy * outer + ny * half },
      { x: center.x + dx * outer - nx * half, y: center.y + dy * outer - ny * half },
    ]);
  }
  return polys;
}

/**
 * Linhas de foco do golpe decisivo (FOC-01, FOC-02): na camada de UI (AD-003), convergem para o ponto do acerto por
 * 180 ms de tempo REAL (anda durante o hitstop) e somem. `update` redesenha o leque com o alpha caindo.
 */
export class FocusLines {
  private readonly gfx: Phaser.GameObjects.Graphics;
  private ageMs = Number.POSITIVE_INFINITY;
  private center: Vec2 = { x: 0, y: 0 };
  private lines = 0;

  constructor(
    scene: Phaser.Scene,
    uiLayer: Phaser.GameObjects.Layer,
    private readonly screenW: number,
    private readonly screenH: number,
  ) {
    this.gfx = scene.add.graphics().setDepth(DEPTH).setVisible(false);
    uiLayer.add(this.gfx);
  }

  /** Acende (ou reinicia) as linhas em volta do ponto de tela `center`. */
  show(center: Vec2): void {
    this.center = center;
    this.ageMs = 0;
    this.draw();
  }

  /** Avança o tempo real e redesenha; ao fim apaga. */
  update(realDtMs: number): void {
    if (this.ageMs >= FOCUS_FEEL.ms) return;
    this.ageMs += realDtMs;
    this.draw();
  }

  /** Linhas visíveis agora e a idade (ms reais); `null` fora dos 180 ms (debug). */
  get view(): { lines: number; ageMs: number } | null {
    return this.ageMs < FOCUS_FEEL.ms ? { lines: this.lines, ageMs: Math.round(this.ageMs) } : null;
  }

  destroy(): void {
    this.gfx.destroy();
  }

  private draw(): void {
    this.gfx.clear();
    if (this.ageMs >= FOCUS_FEEL.ms) {
      this.lines = 0;
      this.gfx.setVisible(false);
      return;
    }
    const polys = focusLinePolygons(this.center, this.screenW, this.screenH);
    this.lines = polys.length;
    this.gfx.setVisible(true).fillStyle(PALETTE.w!, LINE_ALPHA * (1 - this.ageMs / FOCUS_FEEL.ms));
    for (const p of polys) this.gfx.fillTriangle(p[0]!.x, p[0]!.y, p[1]!.x, p[1]!.y, p[2]!.x, p[2]!.y);
  }
}
