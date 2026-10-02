import { normalize, type Vec2 } from './hit';
import { Mover } from './mover';
import { TECHNIQUES } from '../data/techniques';

/** Velocidade do orbe em px/s (RDA-11, supersede RED-05: era 560). */
export const RED_ORB_SPEED = 760;
const SPEED = RED_ORB_SPEED;
const RANGE = 420; // RED-08
const DETONATION_RADIUS = 96; // RED-10

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
 * com `|dx| <= 80` e `|dy| <= 48` levam 4 de dano `light` e força 10 para longe do player. Quem está atrás, ou
 * além do alcance, não entra. Cada alvo aparece uma vez.
 */
export function repulseTargets(origin: Vec2, facing: 1 | -1, targets: readonly RedOrbTarget[]): RepulseHit[] {
  const hits: RepulseHit[] = [];
  for (const target of targets) {
    const dx = target.center.x - origin.x;
    const dy = target.center.y - origin.y;
    if (dx * facing <= 0 || Math.abs(dx) > REPULSE_REACH_X || Math.abs(dy) > REPULSE_REACH_Y) continue;
    hits.push({
      targetId: target.id,
      damage: REPULSE_DAMAGE,
      strength: 'light',
      force: REPULSE_FORCE,
      direction: normalize({ x: dx, y: dy }),
    });
  }
  return hits;
}

export interface RedOrbHit {
  targetId: number;
  damage: number;
  /** Impulso normalizado (sem magnitude), apontando para longe do orbe/ponto de detonação. */
  direction: Vec2;
}

/**
 * Estado do orbe Vermelho em voo (RED-02, 05, 06, 08, 10, 13, 14): avança horizontalmente por `Mover` a 760 px/s
 * até 420 px, marca quem já foi atingido (uma vez cada) e decide o dano/impulso do toque e da detonação (parede,
 * chefe ou alcance). A física (sensor Matter, aplicar o impulso) fica para a fase 5. Sem `phaser` aqui.
 */
export class RedOrbState {
  private readonly mover: Mover;
  private readonly hitIds = new Set<number>();
  private _detonated = false;

  constructor(x: number, dir: 1 | -1) {
    this.mover = new Mover(x, dir, SPEED, RANGE);
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

  /** RED-02: o frame do núcleo do orbe (4/8/12 texels) conforme o terço da carga já decorrido. */
  static chargeFrame(elapsedMs: number, chargeMs: number): 4 | 8 | 12 {
    const third = chargeMs / 3;
    if (elapsedMs < third) return 4;
    if (elapsedMs < third * 2) return 8;
    return 12;
  }

  /** RED-06: dano e impulso ao tocar `target` (pela primeira vez); `null` se esse alvo já foi atingido. */
  hitTest(target: RedOrbTarget, orbY: number): RedOrbHit | null {
    if (this.hitIds.has(target.id)) return null;
    this.hitIds.add(target.id);
    const direction = normalize({ x: target.center.x - this.x, y: target.center.y - orbY });
    return { targetId: target.id, damage: TECHNIQUES.vermelho.damage.hit, direction };
  }

  /** RED-10: alvos a até 96 px do ponto de detonação, ainda não atingidos por este orbe, cada um uma vez. */
  detonationTargets(targets: readonly RedOrbTarget[], point: Vec2): RedOrbHit[] {
    const hits: RedOrbHit[] = [];
    for (const target of targets) {
      if (this.hitIds.has(target.id)) continue;
      const dx = target.center.x - point.x;
      const dy = target.center.y - point.y;
      if (Math.hypot(dx, dy) > DETONATION_RADIUS) continue;
      this.hitIds.add(target.id);
      hits.push({ targetId: target.id, damage: TECHNIQUES.vermelho.damage.detonation, direction: normalize({ x: dx, y: dy }) });
    }
    return hits;
  }

  /** RED-08: avança o voo; devolve `true` no frame em que os 420 px se completam (detona por alcance). */
  update(dtMs: number): boolean {
    if (this._detonated) return false;
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
}
