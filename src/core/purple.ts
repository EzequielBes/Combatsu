import { TECH_GEOMETRY } from '../data/techniques';
import type { TechStats } from './techStats';

/**
 * Números da esfera do Vazio Roxo (EVO-05, EVO-06): reexport de `TECH_GEOMETRY.roxo` (TST-02), a única fonte.
 * Velocidade (px/s), duração do voo (ms), raio (px de mundo: toca quem tiver a caixa de acerto a esta distância do
 * centro), distância de nascimento à frente do player, altura do voo acima do centro do corpo e empurrão do golpe.
 */
export const PURPLE = TECH_GEOMETRY.roxo;

/** Geometria do Roxo resolvida no `TechStats` (voo, raio, nascimento, altura e força). */
export type PurpleGeometry = NonNullable<TechStats['purple']>;

/** A geometria de um `TechStats` do Roxo; sem `purple` (não é o Roxo) cai na da tabela. */
export function purpleGeometry(stats: TechStats): PurpleGeometry {
  return stats.purple ?? PURPLE;
}

/** O que a regra do voo usa da geometria: velocidade (px/s), vida (ms) e raio de toque (px de mundo). */
export interface PurpleFlight {
  speed: number;
  lifeMs: number;
  radius: number;
}

/** Alvo visto pela esfera: id e a caixa de acerto (centro e meia largura/altura, px de mundo). */
export interface PurpleTarget {
  id: number;
  x: number;
  y: number;
  halfW: number;
  halfH: number;
}

/**
 * Esfera do Vazio Roxo (EVO-05, EVO-06): avança em linha reta na velocidade da `geometry` pela vida dela e toca cada
 * alvo no máximo uma vez por conjuração. A `geometry` vem do stat do disparo; sem ela, a da tabela (`PURPLE`). Pura:
 * a cena aplica o dano aos ids que `update` devolve.
 */
export class PurpleSphere {
  private elapsedMs = 0;
  private readonly hitIds = new Set<number>();

  constructor(
    private readonly startX: number,
    readonly y: number,
    readonly facing: 1 | -1,
    private readonly geometry: PurpleFlight = PURPLE,
  ) {}

  get x(): number {
    return this.startX + this.facing * this.traveled;
  }

  /** Distância percorrida desde o nascimento (px), parada ao fim da vida. */
  get traveled(): number {
    const { speed, lifeMs } = this.geometry;
    return speed * (Math.min(this.elapsedMs, lifeMs) / 1000);
  }

  /** A esfera ainda voa (EVO-05): some ao completar a vida da `geometry`. */
  get alive(): boolean {
    return this.elapsedMs < this.geometry.lifeMs;
  }

  get ageMs(): number {
    return this.elapsedMs;
  }

  /** Ids já tocados nesta conjuração. */
  get hits(): readonly number[] {
    return [...this.hitIds];
  }

  /** Avança `dtMs` e devolve os ids tocados pela primeira vez neste passo (EVO-06). */
  update(dtMs: number, targets: readonly PurpleTarget[]): number[] {
    if (!this.alive) return [];
    this.elapsedMs += dtMs;
    const cx = this.x;
    const { radius } = this.geometry;
    const fresh: number[] = [];
    for (const t of targets) {
      if (this.hitIds.has(t.id)) continue;
      // Círculo contra caixa: o ponto da caixa mais perto do centro está dentro do raio.
      const dx = cx - Math.max(t.x - t.halfW, Math.min(cx, t.x + t.halfW));
      const dy = this.y - Math.max(t.y - t.halfH, Math.min(this.y, t.y + t.halfH));
      if (dx * dx + dy * dy <= radius * radius) {
        this.hitIds.add(t.id);
        fresh.push(t.id);
      }
    }
    return fresh;
  }
}
