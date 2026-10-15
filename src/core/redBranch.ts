import { RED_AWAKENINGS, RED_BRANCHES, type RedBranchId } from '../data/techAxes';
import { boxCenter, type BodyKind, type Box } from './axisRule';
import { normalize, type Vec2 } from './hit';
import { boxInRadius, nearestTarget } from './techKit';

/**
 * Regras puras do ramo e do Despertar do Vermelho e da Perfuração (spec `vermelho-e-corpo`, VRM-08, VRM-09, VRM-12 a
 * VRM-15). Sem Phaser: o `game/tech/redFlight.ts` e o `redField.ts` ligam estas contas ao motor.
 *
 * Contagem das detonações: `n` começa em 1 na 1ª detonação do orbe, seja no inimigo, na parede, no chão ou no chefe
 * (edge case: chefe primeiro conta como a 1ª), e sobe 1 a cada detonação de rebote.
 */

/** Alvo das escolhas do rebote e do estilhaço; `kind` ausente é comum. */
export interface RedTarget {
  id: number;
  box: Box;
  kind?: BodyKind;
}

/** Onde a detonação aconteceu: contato (inimigo, parede, chão, chefe) ou o fim do voo no ar. */
export type DetonationSite = 'enemy' | 'wall' | 'floor' | 'boss' | 'end';

/** O que o ramo e o Despertar mudam no orbe de uma conjuração (copiado na soltura). */
export interface RedPlan {
  /** Atravessa os comuns (sem ramo e Contido); o Ricochete detona no 1º (VRM-12.2). */
  pierce: boolean;
  /** Rebotes no máximo: 0 sem ramo e no Contido, 1 no Ricochete, 3 no Fliperama. */
  maxRebounds: 0 | 1 | 3;
  /** Rebate também da detonação no fim do voo, no ar (Fliperama: "qualquer alvo"); o Ricochete só do contato. */
  reboundAny: boolean;
  /** Segurar a tecla do slot prende o orbe (Contido, VRM-14). */
  holdable: boolean;
  /** Fator do raio na detonação do orbe segurado (1,4 no Contido; o adaptador só aplica no orbe segurado). */
  radiusMul: number;
  /** A detonação deixa o campo do Vermelho Máximo (VRM-15). */
  field: boolean;
  /** A detonação `n` soma o componente proporcional (4 %, chefe 1 %). */
  pctOnDetonation: (n: number) => boolean;
}

const never = (): boolean => false;

/** O plano do orbe para o ramo e o Despertar (VRM-12 a VRM-15). Sem ramo, o orbe de hoje. */
export function redPlan(branch: RedBranchId | null, awakened: boolean): RedPlan {
  const plan: RedPlan = {
    pierce: true,
    maxRebounds: 0,
    reboundAny: false,
    holdable: false,
    radiusMul: 1,
    field: false,
    pctOnDetonation: never,
  };
  if (branch === 'ricochete') {
    plan.pierce = false;
    plan.maxRebounds = awakened ? RED_AWAKENINGS.fliperama.rebounds : RED_BRANCHES.ricochete.rebounds;
    if (awakened) {
      plan.reboundAny = true;
      plan.pctOnDetonation = (n) => n === RED_AWAKENINGS.fliperama.pctAt;
    }
  } else if (branch === 'contido') {
    plan.holdable = true;
    plan.radiusMul = RED_BRANCHES.contido.radiusMul;
    if (awakened) {
      plan.field = true;
      plan.pctOnDetonation = () => true;
    }
  }
  return plan;
}

/**
 * A detonação `n` (contada como no topo do arquivo) rebate? A parede e o chão contam como rebote (edge case do
 * Fliperama); o fim do voo no ar só rebate com `reboundAny`.
 */
export function shouldRebound(plan: RedPlan, n: number, site: DetonationSite): boolean {
  if (n > plan.maxRebounds) return false;
  return site !== 'end' || plan.reboundAny;
}

/** VRM-12.4: fator do toque e da detonação na detonação `n`: 1 na 1ª, 0,7 nas seguintes. */
export function detonationMul(n: number): number {
  return n <= 1 ? 1 : RED_BRANCHES.ricochete.afterFirstMul;
}

/** VRM-13: velocidade do orbe depois de `n` detonações no Fliperama (×1,15 por detonação). */
export function speedAfter(n: number, base: number): number {
  return base * (1 + RED_AWAKENINGS.fliperama.speedStep) ** n;
}

/** Destino do rebote: o alvo escolhido (ou `null`) e a direção horizontal do novo voo. */
export interface ReboundPick {
  targetId: number | null;
  dir: 1 | -1;
}

/**
 * VRM-09, VRM-12.3, VRM-12.5: o comum mais perto a ≤ `reachPx` do ponto da detonação, fora dos atingidos por ela
 * (`hitByLast`) e a ≤ `maxFromPlayerPx` do player na horizontal; o chefe nunca é destino (edge case). Sem alvo, o orbe
 * volta na direção horizontal oposta à que voava (`dir`). Alvo na mesma vertical do ponto também vira para trás.
 */
export function pickRebound(
  point: Vec2,
  dir: 1 | -1,
  candidates: readonly RedTarget[],
  hitByLast: ReadonlySet<number>,
  playerX: number,
  reachPx: number = RED_BRANCHES.ricochete.reboundRangePx,
  maxFromPlayerPx = 320,
): ReboundPick {
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const skip = (id: number): boolean => {
    const c = byId.get(id);
    if (c === undefined || c.kind === 'boss' || hitByLast.has(id)) return true;
    return Math.abs(boxCenter(c.box).x - playerX) > maxFromPlayerPx + 1e-9;
  };
  const target = nearestTarget(point, reachPx, candidates, skip);
  const back = dir === 1 ? -1 : 1;
  if (target === null) return { targetId: null, dir: back };
  const dx = boxCenter(target.box).x - point.x;
  return { targetId: target.id, dir: dx > 0 ? 1 : dx < 0 ? -1 : back };
}

/**
 * VRM-08: os `count` comuns mais perto do atravessado (`passed`), a ≤ `reachPx` dele, o mais perto primeiro. Cada um
 * leva no máximo um estilhaço por conjuração: `alreadyHit` é o registro da conjuração e recebe os escolhidos.
 */
export function shardTargets(
  passed: RedTarget,
  others: readonly RedTarget[],
  count: number,
  alreadyHit: Set<number>,
  reachPx = 60,
): number[] {
  const from = boxCenter(passed.box);
  const kindOf = new Map(others.map((c) => [c.id, c.kind]));
  const skip = (id: number): boolean => id === passed.id || alreadyHit.has(id) || kindOf.get(id) === 'boss';
  const picked: number[] = [];
  for (let i = 0; i < count; i++) {
    const t = nearestTarget(from, reachPx, others, skip);
    if (t === null) break;
    alreadyHit.add(t.id);
    picked.push(t.id);
  }
  return picked;
}

/**
 * VRM-15: o campo do Vermelho Máximo. Dura `durationMs` (1200) e dá um tique a cada `tickMs` (200), o último no fim:
 * 6 tiques no total. `update` devolve os tiques vencidos no passo e se o campo acabou.
 */
export class RedField {
  private elapsed = 0;
  private ticked = 0;

  constructor(
    readonly center: Vec2,
    readonly radius: number,
    private readonly durationMs: number = RED_AWAKENINGS.vermelhoMaximo.fieldMs,
    private readonly tickMs: number = RED_AWAKENINGS.vermelhoMaximo.fieldTickMs,
  ) {}

  update(dtMs: number): { ticks: number; ended: boolean } {
    this.elapsed = Math.min(this.elapsed + dtMs, this.durationMs);
    const due = Math.floor(this.elapsed / this.tickMs + 1e-9);
    const ticks = due - this.ticked;
    this.ticked = due;
    return { ticks, ended: this.elapsed >= this.durationMs };
  }

  /** A caixa está dentro do raio do campo. */
  covers(box: Box): boolean {
    return boxInRadius(box, this.center, this.radius);
  }
}

/**
 * VRM-15: velocidade do empurrão do campo, do centro para fora, em px/s. Alvo no centro exato vai para cima (o
 * `normalize` de `core/hit.ts`).
 */
export function pushVelocity(
  center: Vec2,
  target: Vec2,
  speedPxS: number = RED_AWAKENINGS.vermelhoMaximo.pushSpeed,
): Vec2 {
  const n = normalize({ x: target.x - center.x, y: target.y - center.y });
  return { x: n.x * speedPxS, y: n.y * speedPxS };
}

/** Estado do orbe do Contido no quadro. */
export type HoldStep = 'fly' | 'hover' | 'detonate';

/**
 * VRM-14: o orbe do Contido. Com a tecla segurada na saída (`armed`), voa como hoje, paira ao fim de `rangePx` e
 * detona ao soltar ou aos `holdMs` (1200) desde a saída, o que vier primeiro. Solto na saída, voa sempre (`fly`) e o
 * orbe detona como o sem ramo. Depois de `detonate`, continua `detonate`.
 */
export class ContidoHold {
  private elapsed = 0;
  private done = false;

  constructor(
    readonly armed: boolean,
    private readonly speed: number,
    private readonly rangePx: number,
    private readonly holdMs: number = RED_BRANCHES.contido.holdMs,
  ) {}

  update(dtMs: number, held: boolean): HoldStep {
    if (!this.armed) return 'fly';
    if (this.done) return 'detonate';
    this.elapsed += dtMs;
    if (!held || this.elapsed >= this.holdMs) {
      this.done = true;
      return 'detonate';
    }
    return (this.elapsed / 1000) * this.speed >= this.rangePx ? 'hover' : 'fly';
  }
}
