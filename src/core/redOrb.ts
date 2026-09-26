import { normalize, type Vec2 } from './hit';
import { Mover } from './mover';
import { TECHNIQUES } from '../data/techniques';

const SPEED = 560; // RED-05
const RANGE = 420; // RED-08
const DETONATION_RADIUS = 96; // RED-10

export interface RedOrbTarget {
  id: number;
  center: Vec2;
}

export interface RedOrbHit {
  targetId: number;
  damage: number;
  /** Impulso normalizado (sem magnitude), apontando para longe do orbe/ponto de detonação. */
  direction: Vec2;
}

/**
 * Estado do orbe Vermelho em voo (RED-02, 05, 06, 08, 10, 13, 14): avança horizontalmente por `Mover` a 560 px/s
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
