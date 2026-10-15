import { normalize, type Vec2 } from './hit';
import { Mover } from './mover';
import { TECH_GEOMETRY } from '../data/techniques';
import { RED_BASE, type TechStats } from './techStats';

/** Velocidade do orbe em px/s (RDA-11, supersede RED-05: era 560), lida de `TECH_GEOMETRY`. */
export const RED_ORB_SPEED = TECH_GEOMETRY.vermelho.speed;

/**
 * O que o orbe precisa da conjuração (TST-02): velocidade e alcance do voo (RDA-11, RED-08), raio da detonação
 * (RED-10) e os danos já escalados do toque (RED-06) e da detonação (RED-10), tirados do `TechStats` da soltura.
 */
export interface RedOrbConfig {
  speed: number;
  rangePx: number;
  radius: number;
  touch: number;
  detonation: number;
}

/** Geometria do Vermelho resolvida no `TechStats` (sensor, orbe, força, raio, anéis). */
export type RedGeometry = NonNullable<TechStats['red']>;

/** A geometria de um `TechStats` do Vermelho; sem `red` (não é o Vermelho) cai no Vermelho sem ponto (VRM-01). */
export function redGeometry(stats: TechStats): RedGeometry {
  return stats.red ?? RED_BASE;
}

/** O `RedOrbConfig` de um `TechStats` do Vermelho. */
export function redOrbConfig(stats: TechStats): RedOrbConfig {
  const red = redGeometry(stats);
  return {
    speed: red.speed,
    rangePx: red.rangePx,
    radius: red.radius,
    touch: stats.damage.hit,
    detonation: stats.damage.detonation,
  };
}

export interface RedOrbTarget {
  id: number;
  center: Vec2;
}

/** Golpe da repulsão na soltura (RDA-08): dano leve e força 10 para longe do player. */
export interface RepulseHit {
  targetId: number;
  damage: number;
  strength: 'light';
  force: number;
  direction: Vec2;
}

/** Alcance horizontal e vertical da repulsão em px, medidos do centro do alvo ao do player (RDA-08). */
const REPULSE_REACH_X = 80;
const REPULSE_REACH_Y = 48;
const REPULSE_DAMAGE = 4;
const REPULSE_FORCE = 10;

/**
 * RDA-08, RDA-09: alvos à frente de `origin` (sinal de `x − origin.x` igual ao `facing`, `dx = 0` fica de fora)
 * com `|dx| <= 80` e `|dy| <= 48` levam o `damage` `light` e força 10 para longe do player. Quem está atrás, ou
 * além do alcance, não entra. Cada alvo aparece uma vez. O dano vem da conjuração (VRM-04: o `repulseDamage`
 * resolvido); sem ele, os 4 da base.
 */
export function repulseTargets(
  origin: Vec2,
  facing: 1 | -1,
  targets: readonly RedOrbTarget[],
  damage = REPULSE_DAMAGE,
): RepulseHit[] {
  const hits: RepulseHit[] = [];
  for (const target of targets) {
    const dx = target.center.x - origin.x;
    const dy = target.center.y - origin.y;
    if (dx * facing <= 0 || Math.abs(dx) > REPULSE_REACH_X || Math.abs(dy) > REPULSE_REACH_Y) continue;
    hits.push({
      targetId: target.id,
      damage,
      strength: 'light',
      force: REPULSE_FORCE,
      direction: normalize({ x: dx, y: dy }),
    });
  }
  return hits;
}

/** Candidato à repulsão: o `kind` distingue o inimigo comum do chefe (EDG-03). */
export interface RepulseCandidate extends RedOrbTarget {
  kind: 'enemy' | 'boss';
}

/**
 * EDG-03: seleção de alvos da repulsão a partir de todos os candidatos. O chefe nunca entra (só o orbe o atinge,
 * RED-09), mesmo colado à frente do player; o resto segue as regras de `repulseTargets`.
 */
export function repulseTargetsFor(
  origin: Vec2,
  facing: 1 | -1,
  candidates: readonly RepulseCandidate[],
  damage = REPULSE_DAMAGE,
): RepulseHit[] {
  return repulseTargets(
    origin,
    facing,
    candidates.filter((c) => c.kind !== 'boss'),
    damage,
  );
}

/** Recuo do player na soltura, em px (RED-15). */
export const RED_RELEASE_PUSH_PX = 12;

/**
 * EDG-02: efeitos da soltura. A repulsão acontece sempre (no chão ou no ar); o recuo de 12 px (RED-15) só no chão.
 */
export function redReleaseEffects(state: { grounded: boolean }): { repulse: true; pushPx: number } {
  return { repulse: true, pushPx: state.grounded ? RED_RELEASE_PUSH_PX : 0 };
}

export interface RedOrbHit {
  targetId: number;
  damage: number;
  /** Impulso normalizado (sem magnitude), apontando para longe do orbe/ponto de detonação. */
  direction: Vec2;
}

/**
 * Estado do orbe Vermelho em voo (RED-02, 05, 06, 08, 10, 13, 14): avança horizontalmente por `Mover` na velocidade
 * do `config` até o alcance dele (320 px, VRM-09), marca quem já foi atingido e decide o dano/impulso do toque e da
 * detonação (parede, chefe ou alcance), com os danos e o raio do `config`. O rebote (VRM-12, VRM-13) recria o voo e
 * abre uma detonação nova: o toque continua 1 vez por orbe, mas a detonação seguinte pode pegar o mesmo alvo. O
 * `hover` (Contido, VRM-14) para o voo sem detonar. A física (sensor Matter, aplicar o impulso) fica no adaptador.
 * Sem `phaser` aqui.
 */
export class RedOrbState {
  private mover: Mover;
  /** Quem levou o toque em qualquer trecho do voo: o toque é 1 vez por orbe. */
  private readonly touchedIds = new Set<number>();
  /** Quem foi atingido (toque ou explosão) desde a última detonação: zera a cada rebote. */
  private readonly hitIds = new Set<number>();
  private _detonated = false;
  private _hovering = false;
  private _detonations = 0;

  constructor(
    x: number,
    dir: 1 | -1,
    private readonly config: RedOrbConfig,
  ) {
    this.mover = new Mover(x, dir, config.speed, config.rangePx);
  }

  get x(): number {
    return this.mover.x;
  }

  /** RED-14: distância percorrida até agora (parte do snapshot `techObjects`). */
  get traveled(): number {
    return this.mover.traveled;
  }

  get detonated(): boolean {
    return this._detonated;
  }

  /** VRM-14: o orbe parou no ar sem detonar (Contido). */
  get hovering(): boolean {
    return this._hovering;
  }

  /** VRM-12, VRM-13: quantas detonações já houve (o rebote conta a que o originou). */
  get detonations(): number {
    return this._detonations;
  }

  /** VRM-12.3: quem foi atingido nesta detonação (o `hitByLast` do `pickRebound`), lido antes do `rebound`. */
  get hitByCurrent(): ReadonlySet<number> {
    return this.hitIds;
  }

  /** RED-02: o frame do núcleo do orbe (4/8/12 texels) conforme o terço da carga já decorrido. */
  static chargeFrame(elapsedMs: number, chargeMs: number): 4 | 8 | 12 {
    const third = chargeMs / 3;
    if (elapsedMs < third) return 4;
    if (elapsedMs < third * 2) return 8;
    return 12;
  }

  /** RED-06: dano e impulso ao tocar `target` (pela primeira vez); `null` se esse alvo já foi atingido. */
  hitTest(target: RedOrbTarget, orbY: number): RedOrbHit | null {
    if (this.touchedIds.has(target.id) || this.hitIds.has(target.id)) return null;
    this.touchedIds.add(target.id);
    this.hitIds.add(target.id);
    const direction = normalize({ x: target.center.x - this.x, y: target.center.y - orbY });
    return { targetId: target.id, damage: this.config.touch, direction };
  }

  /** RED-10: alvos a até `config.radius` do ponto, ainda não atingidos nesta detonação, cada um uma vez. */
  detonationTargets(targets: readonly RedOrbTarget[], point: Vec2): RedOrbHit[] {
    const hits: RedOrbHit[] = [];
    for (const target of targets) {
      if (this.hitIds.has(target.id)) continue;
      const dx = target.center.x - point.x;
      const dy = target.center.y - point.y;
      if (Math.hypot(dx, dy) > this.config.radius) continue;
      this.hitIds.add(target.id);
      hits.push({
        targetId: target.id,
        damage: this.config.detonation,
        direction: normalize({ x: dx, y: dy }),
      });
    }
    return hits;
  }

  /** RED-08: avança o voo; devolve `true` no frame em que o alcance se completa (detona por alcance). */
  update(dtMs: number): boolean {
    if (this._detonated || this._hovering) return false;
    if (this.mover.update(dtMs) === 'expired') {
      this._detonated = true;
      return true;
    }
    return false;
  }

  /** RED-08, RED-13: detona por parede ou chefe (fora do alcance máximo, decidido pelo chamador). */
  detonate(): void {
    this._detonated = true;
  }

  /** VRM-14: para o voo onde está, sem detonar; o `update` não anda mais até um `detonate` ou `rebound`. */
  hover(): void {
    this._hovering = true;
  }

  /**
   * VRM-12, VRM-13: conta a detonação que acabou de acontecer e relança o orbe de `x` na direção `dir`, por
   * `rangePx` a `speed` px/s (o Fliperama acelera a cada rebote). A detonação seguinte pode pegar quem a anterior
   * pegou; o toque, não.
   */
  rebound(x: number, dir: 1 | -1, rangePx: number, speed: number): void {
    this._detonations++;
    this.mover = new Mover(x, dir, speed, rangePx);
    this.hitIds.clear();
    this._detonated = false;
    this._hovering = false;
  }
}
