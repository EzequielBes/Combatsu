import { TECH_GEOMETRY } from '../data/techniques';
import type { TechStats } from './techStats';

interface CutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CutTarget {
  id: number;
  /** Corpo do alvo (inimigo ou chefe), fornecido pelo chamador — a física fica para a fase 5. */
  body: CutRect;
}

export interface CutHit {
  targetId: number;
  damage: number;
}

/** Geometria do Desmantelar resolvida no `TechStats` (tempos, ângulos, retângulo de dano e linha da vista). */
export type CutGeometry = NonNullable<TechStats['cut']>;

/**
 * O que a agenda precisa da conjuração (TST-02): instante de cada corte (CUT-02), retângulo de dano à frente do
 * player (CUT-03: de `nearPx` a `farPx`, `heightPx` de altura) e o dano já escalado de cada corte, tirados do
 * `TechStats` da conjuração.
 */
export interface CutConfig {
  times: readonly number[];
  nearPx: number;
  farPx: number;
  heightPx: number;
  damage: number;
}

/** A geometria de um `TechStats` do Corte; sem `cut` (não é o Corte) cai na da tabela. */
export function cutGeometry(stats: TechStats): CutGeometry {
  return stats.cut ?? TECH_GEOMETRY.corte;
}

/** O `CutConfig` de um `TechStats` do Corte. */
export function cutConfig(stats: TechStats): CutConfig {
  const { times, nearPx, farPx, heightPx } = cutGeometry(stats);
  return { times, nearPx, farPx, heightPx, damage: stats.damage.cut };
}

/** Sobreposição de retângulos com bordas inclusas (fecha o "de 60 a 180 px", CUT-03: 59/60 e 180/181 px). */
function overlaps(a: CutRect, b: CutRect): boolean {
  return a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y;
}

/** CUT-03: retângulo do corte, de `nearPx` a `farPx` à frente do centro do player, `heightPx` de altura, centrado nele. */
function cutRect(config: CutConfig, playerCenter: { x: number; y: number }, facing: 1 | -1): CutRect {
  const { nearPx, farPx, heightPx } = config;
  const x = facing === 1 ? playerCenter.x + nearPx : playerCenter.x - farPx;
  return { x, y: playerCenter.y - heightPx / 2, width: farPx - nearPx, height: heightPx };
}

/**
 * CUT-05: ângulos (graus, a partir da horizontal) dos 3 cortes, na ordem, espelhados se o player olha para a
 * esquerda. Os ângulos vêm do stat; sem eles, os da tabela (20°, −25°, 70°).
 */
export function cutAngles(
  facing: 1 | -1,
  anglesDeg: readonly number[] = TECH_GEOMETRY.corte.anglesDeg,
): readonly [number, number, number] {
  return anglesDeg.map((deg) => (facing === 1 ? deg : -deg)) as [number, number, number];
}

/** CUT-04: meio do retângulo de dano (onde a linha da vista é centrada) e o comprimento da linha, do stat. */
export function cutLine(geometry: { nearPx: number; farPx: number; lineLen: number }): {
  midPx: number;
  lenPx: number;
} {
  return { midPx: (geometry.nearPx + geometry.farPx) / 2, lenPx: geometry.lineLen };
}

/**
 * Agenda do Desmantelar (CUT-02, 03, 05): 3 cortes nos `times` do `config` (0/60/120 ms) depois de entrar em
 * `release`, cada um acertando quem estiver no retângulo à frente do player (60 a 180 px). Não decide ângulo de
 * desenho nem física — só o relógio e a lista de quem é atingido. Sem `phaser` aqui.
 */
export class CutSchedule {
  private elapsedMs = 0;
  private readonly done: boolean[];

  constructor(private readonly config: CutConfig) {
    this.done = config.times.map(() => false);
  }

  /** CUT-02: avança o relógio desde a entrada em `release`; devolve os índices (0, 1, 2) dos cortes deste passo. */
  update(dtMs: number): number[] {
    const before = this.elapsedMs;
    this.elapsedMs += dtMs;
    const due: number[] = [];
    this.config.times.forEach((t, i) => {
      if (!this.done[i] && before <= t && this.elapsedMs >= t) {
        this.done[i] = true;
        due.push(i);
      }
    });
    return due;
  }

  /** CUT-03: alvos cujo corpo sobrepõe o retângulo do corte, à frente do player, com o dano já escalado. */
  targetsHit(playerCenter: { x: number; y: number }, facing: 1 | -1, targets: readonly CutTarget[]): CutHit[] {
    const rect = cutRect(this.config, playerCenter, facing);
    return targets.filter((t) => overlaps(rect, t.body)).map((t) => ({ targetId: t.id, damage: this.config.damage }));
  }
}
