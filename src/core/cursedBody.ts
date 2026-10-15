import type { MoveDef } from '../data/moves';
import { BODY_AWAKENINGS, BODY_AXES, BODY_BRANCHES, type BodyAxisId } from '../data/techAxes';
import { axisAt, type BodyKind, type Box } from './axisRule';
import type { HitboxShape } from './combo';
import type { Vec2 } from './hit';
import { boxInRadius } from './techKit';

/**
 * Regras puras do Corpo Amaldiçoado em combate (spec `vermelho-e-corpo`, CRP-02 a CRP-09). Sem Phaser: o
 * `bodyDirector` liga estas contas ao golpe do player.
 */

/** Pontos do Corpo por eixo (0 a 3 cada). */
export type BodyPoints = Readonly<Record<BodyAxisId, number>>;

/** O que os pontos mudam num golpe do moveset. */
export interface BodyStrike {
  /** Multiplicador de dano do Impacto (CRP-02). */
  impactMul: number;
  /** Multiplicador da força do golpe (Peso, CRP-03). */
  forceMul: number;
  /** Multiplicador do `recovery` (Ritmo, CRP-04). */
  recoveryMul: number;
  /** Px a mais da hitbox para a frente (Alcance, CRP-05). */
  reachPx: number;
  /** O golpe forte derruba o comum (Peso a partir de 2, CRP-03.5). */
  knockdown: boolean;
  /** O comum derrubado que bate na parede fica atordoado (Peso 3, VRM-16). */
  wallStun: boolean;
}

/** CRP-02 a CRP-05: o efeito dos pontos do Corpo no golpe `move`. */
export function bodyStrike(points: BodyPoints, move: MoveDef): BodyStrike {
  const { peso } = BODY_AXES;
  return {
    impactMul: axisAt(BODY_AXES.impacto.impactMul, points.impacto),
    forceMul: axisAt(peso.forceMul, points.peso),
    recoveryMul: axisAt(BODY_AXES.ritmo.recoveryMul, points.ritmo),
    reachPx: axisAt(BODY_AXES.alcance.reachPx, points.alcance),
    knockdown: move.strength === 'heavy' && points.peso >= peso.knockdownFrom,
    wallStun: points.peso >= peso.wallStunAt,
  };
}

/** CRP-05: alarga a hitbox `px` para a frente e mantém a borda de trás (a caixa é centrada no `offsetX`). */
export function widenForward(shape: HitboxShape, px: number): HitboxShape {
  return { ...shape, width: shape.width + px, offsetX: shape.offsetX + px / 2 };
}

/** CRP-07: acúmulos da Fúria. Um acúmulo por golpe que acerta (vários alvos do mesmo golpe contam um). */
export class FuryCounter {
  private count = 0;
  private lastSwing: number | null = null;

  get stacks(): number {
    return this.count;
  }

  /** O golpe `swingId` acertou: soma um acúmulo, uma vez por golpe. */
  onConnect(swingId: number): void {
    if (this.lastSwing === swingId) return;
    this.lastSwing = swingId;
    this.count += 1;
  }

  /** O player perdeu HP: zera. Golpe defendido sem perda de HP não chama isto e as pilhas ficam. */
  onHpLoss(): void {
    this.count = 0;
  }

  /** Bônus de dano corpo a corpo (fração) com os `points` da Fúria: acúmulos × passo, até o teto. */
  bonus(points: number): number {
    const step = axisAt(BODY_AXES.furia.furyStep, points);
    const cap = axisAt(BODY_AXES.furia.furyCap, points);
    return Math.min(this.count * step, cap);
  }

  /** A Fúria está no teto (dispara a 2ª onda do Punho que Rasga, CRP-11). Sem pontos não há teto a atingir. */
  atCap(points: number): boolean {
    return points > 0 && this.bonus(points) >= axisAt(BODY_AXES.furia.furyCap, points);
  }

  reset(): void {
    this.count = 0;
    this.lastSwing = null;
  }
}

/** CRP-08: contagem de golpes seguidos que acertam; todo `every`-ésimo é decisivo. */
export class CadenceCounter {
  private seq = 0;
  private lastSwing: number | null = null;

  get count(): number {
    return this.seq;
  }

  /** O golpe `swingId` acertou: conta uma vez por golpe. */
  onConnect(swingId: number): void {
    if (this.lastSwing === swingId) return;
    this.lastSwing = swingId;
    this.seq += 1;
  }

  /** O fim da janela ativa do golpe: sem nenhum acerto, a contagem volta a 0 (CRP-08.3). */
  onActiveEnd(_swingId: number, connected: boolean): void {
    if (!connected) this.seq = 0;
  }

  onHpLoss(): void {
    this.seq = 0;
  }

  /** O próximo golpe que acertar é o `every`-ésimo (o 4º, o 8º...). */
  nextIsDecisive(): boolean {
    return this.seq % BODY_BRANCHES.cadencia.every === BODY_BRANCHES.cadencia.every - 1;
  }

  reset(): void {
    this.seq = 0;
    this.lastSwing = null;
  }
}

/** Inimigo visto pelo Martelo Negro: id, caixa de acerto e o tipo (ausente = comum). */
export interface MarteloTarget {
  id: number;
  box: Box;
  kind?: BodyKind;
}

/**
 * CRP-09: ids dos comuns com a caixa a até `areaPx` do ponto do acerto, menos o alvo do golpe (`exceptId`). O chefe
 * fica de fora.
 */
export function marteloTargets(
  point: Vec2,
  enemies: readonly MarteloTarget[],
  exceptId: number,
  areaPx: number = BODY_AWAKENINGS.marteloNegro.areaPx,
): number[] {
  return enemies
    .filter((e) => e.id !== exceptId && e.kind !== 'boss' && boxInRadius(e.box, point, areaPx))
    .map((e) => e.id);
}
