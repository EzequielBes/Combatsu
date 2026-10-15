import {
  axisAt,
  bitePctFor,
  boxCenter,
  killRefundPct,
  resolveBuild,
  type BodyKind,
  type Box,
  type TechBuild,
} from './axisRule';
import type { Vec2 } from './hit';
import {
  pickSwapTarget,
  swapPlacement,
  swapStunMs,
  type FitsPredicate,
  type SwapCandidate,
  type SwapKind,
} from './swap';
import { BOOGIE, type BoogieAxisId, type BoogieBranchId } from '../data/boogie';

export type BoogieBuild = TechBuild<BoogieAxisId, BoogieBranchId>;

/** Números resolvidos de uma build do Boogie Woogie (BOO-01, BOO-02). */
export interface BoogieStats {
  level: number;
  branch: BoogieBranchId | null;
  awakened: boolean;
  rangePx: number;
  stunMs: number;
  maxCharges: number;
  /** Recarga de uma carga (ms), já com o −20% do 3º ponto de Cargas. */
  chargeCooldownMs: number;
  shockDamage: number;
  cost: number;
  /** TRL-06: fração da recarga devolvida pelo 1º abate da conjuração (0,3 com Recarga no 3, senão 0). */
  killRefundPct: number;
  signMs: number;
  releaseMs: number;
  recoverMs: number;
}

/** BOO-01, BOO-02: resolve a build nos números da técnica. */
export function boogieStats(build: BoogieBuild): BoogieStats {
  const { level, branch, awakened } = resolveBuild(build);
  const a = build.axes;
  const capMul = a.cargas === 3 ? BOOGIE.chargeCooldownMulAtCap : 1;
  return {
    level,
    branch,
    awakened,
    rangePx: axisAt(BOOGIE.axes.alcance, a.alcance),
    stunMs: axisAt(BOOGIE.axes.tontura, a.tontura),
    maxCharges: axisAt(BOOGIE.axes.cargas, a.cargas),
    chargeCooldownMs: Math.round(axisAt(BOOGIE.axes.recarga, a.recarga) * capMul),
    shockDamage: axisAt(BOOGIE.axes.choque, a.choque),
    cost: axisAt(BOOGIE.axes.eficiencia, a.eficiencia),
    killRefundPct: killRefundPct(a.recarga),
    signMs: BOOGIE.signMs,
    releaseMs: BOOGIE.releaseMs,
    recoverMs: BOOGIE.recoverMs,
  };
}

/** Acerto do choque da troca: chip, sem hitstop nem interrupção (plano, seção 4). */
export interface ShockHit {
  targetId: number;
  damage: number;
  band: 'chip';
}

/**
 * BOO-07: corpos (inimigo comum e chefe) a até `radiusPx` de qualquer um dos pontos tomam um chip de `damage`, cada
 * um uma vez. Com dano 0, ninguém é atingido.
 */
export function shockHits(
  points: readonly Vec2[],
  damage: number,
  radiusPx: number,
  bodies: readonly SwapCandidate[],
): ShockHit[] {
  if (damage <= 0) return [];
  return bodies
    .filter((b) => b.kind === 'enemy' || b.kind === 'boss')
    .filter((b) => points.some((p) => Math.hypot(b.center.x - p.x, b.center.y - p.y) <= radiusPx))
    .map((b) => ({ targetId: b.id, damage, band: 'chip' as const }));
}

export interface SwapContext {
  /** Caixa do player agora. */
  player: Box;
  facing: 1 | -1;
  /** Corpos, orbes e projéteis vivos; os corpos também são os alvos do choque. */
  candidates: readonly SwapCandidate[];
  fits: FitsPredicate;
}

/** Troca recusada: a energia volta inteira e nenhuma carga é gasta (BOO-04, BOO-05). */
export interface BoogieRefusal {
  ok: false;
  reason: 'noCharge' | 'noTarget' | 'blockedPlayer' | 'blockedTarget' | 'noBranch';
  refund: number;
}

export interface BoogieSwap {
  ok: true;
  targetId: number;
  kind: SwapKind;
  playerBox: Box;
  targetCenter: Vec2;
  /** Tontura do trocado (0 no chefe, no orbe e no projétil). */
  stunMs: number;
  shock: ShockHit[];
  /** A troca usou a 2ª palma da Dupla Palma (não gastou carga). */
  usedFollowUp: boolean;
  cost: number;
}

export interface FeintCandidate {
  id: number;
  kind: BodyKind;
  center: Vec2;
  /** O inimigo está preparando um golpe (só o chefe com a Finta Total usa). */
  windingUp?: boolean;
}

export interface BoogieFeint {
  ok: true;
  /** Inimigos comuns que erram o próximo golpe, com a janela de Contra aberta (BOO-10). */
  misses: { targetId: number; counterWindowMs: number }[];
  /** Finta Total: o chefe que teve o golpe cancelado e a fração do HP máximo que toma (BOO-11). */
  bossCancel: { targetId: number; maxHpPct: number } | null;
  cost: number;
}

/** Eco da Palma: pede ao adaptador a troca de volta com o alvo da 2ª troca (BOO-12). */
export interface BoogieEchoEvent {
  type: 'echo';
  targetId: number;
  kind: SwapKind;
  /** Fração do HP máximo que o trocado toma: 4% no comum, 1% no chefe, 0 no orbe e no projétil. */
  maxHpPct: number;
}

function echoPct(kind: SwapKind): number {
  if (kind === 'enemy' || kind === 'boss') return bitePctFor(kind);
  return 0;
}

/**
 * Boogie Woogie (plano, seção 2.5): cargas, recarga carga a carga, a troca com a regra de segurança, a Palma Falsa e
 * a Dupla Palma com os Despertares. Pura: o adaptador move os corpos, aplica tontura e dano e cobra a energia.
 */
export class BoogieState {
  readonly stats: BoogieStats;
  private _charges: number;
  private rechargeLeft = 0;
  private followUpLeft = 0;
  private fintaLeft = 0;
  private refundArmed = false;
  private echoes: { targetId: number; kind: SwapKind; leftMs: number }[] = [];

  constructor(build: BoogieBuild) {
    this.stats = boogieStats(build);
    this._charges = this.stats.maxCharges;
  }

  get charges(): number {
    return this._charges;
  }

  /** Tempo até a próxima carga voltar (0 com as cargas cheias). */
  get rechargeLeftMs(): number {
    return this.rechargeLeft;
  }

  /** BOO-09: a 2ª palma da Dupla Palma está armada. */
  get followUpArmed(): boolean {
    return this.followUpLeft > 0;
  }

  /** Tempo até a Finta Total poder cancelar o chefe de novo. */
  get fintaCooldownMs(): number {
    return this.fintaLeft;
  }

  canCast(): boolean {
    return this._charges > 0 || this.followUpLeft > 0;
  }

  /** BOO-10: com a Palma Falsa, segurar a tecla por `feintHoldMs` ou mais finge em vez de trocar. */
  isFeint(heldMs: number): boolean {
    return this.stats.branch === 'palmaFalsa' && heldMs >= BOOGIE.feintHoldMs;
  }

  /** BOO-08, BOO-09, BOO-11, BOO-12: avança recarga, janelas e ecos; devolve os ecos vencidos neste passo. */
  update(dtMs: number): BoogieEchoEvent[] {
    this.tickRecharge(dtMs);
    this.followUpLeft = Math.max(0, this.followUpLeft - dtMs);
    this.fintaLeft = Math.max(0, this.fintaLeft - dtMs);
    const due: BoogieEchoEvent[] = [];
    for (const echo of this.echoes) {
      echo.leftMs -= dtMs;
      if (echo.leftMs <= 0) {
        due.push({ type: 'echo', targetId: echo.targetId, kind: echo.kind, maxHpPct: echoPct(echo.kind) });
      }
    }
    this.echoes = this.echoes.filter((e) => e.leftMs > 0);
    return due;
  }

  /** BOO-03 a BOO-07, BOO-09, BOO-12: tenta a troca com o candidato mais perto à frente. */
  swap(ctx: SwapContext): BoogieSwap | BoogieRefusal {
    const usedFollowUp = this.followUpLeft > 0;
    if (!usedFollowUp && this._charges <= 0) return this.refuse('noCharge');
    const origin = boxCenter(ctx.player);
    const target = pickSwapTarget(origin, ctx.facing, this.stats.rangePx, ctx.candidates);
    if (target === null) return this.refuse('noTarget');
    const placement = swapPlacement(ctx.player, target, ctx.fits);
    if (!placement.ok) return this.refuse(placement.reason);
    if (usedFollowUp) {
      this.followUpLeft = 0;
      if (this.stats.awakened && this.stats.branch === 'duplaPalma') {
        this.echoes.push({ targetId: target.id, kind: target.kind, leftMs: BOOGIE.echoDelayMs });
      }
    } else {
      this.spendCharge();
      if (this.stats.branch === 'duplaPalma') this.followUpLeft = BOOGIE.doubleWindowMs;
    }
    this.refundArmed = true;
    const arrival = boxCenter(placement.playerBox);
    return {
      ok: true,
      targetId: target.id,
      kind: target.kind,
      playerBox: placement.playerBox,
      targetCenter: placement.targetCenter,
      stunMs: swapStunMs(target.kind, this.stats.stunMs),
      shock: shockHits([origin, arrival], this.stats.shockDamage, BOOGIE.shockRadiusPx, ctx.candidates),
      usedFollowUp,
      cost: this.stats.cost,
    };
  }

  /**
   * TRL-06: o adaptador avisa que um acerto desta técnica (choque, eco, Finta Total) matou. O 1º abate desde a última
   * troca ou finta corta 30% da recarga da carga em curso (com Recarga no 3). Devolve os ms cortados.
   */
  onTechKill(): number {
    if (!this.refundArmed || this.stats.killRefundPct <= 0) return 0;
    this.refundArmed = false;
    if (this._charges >= this.stats.maxCharges) return 0;
    const cut = Math.round(this.stats.chargeCooldownMs * this.stats.killRefundPct);
    this.rechargeLeft -= cut;
    this.tickRecharge(0);
    return cut;
  }

  /** BOO-10, BOO-11: a Palma Falsa. Gasta carga e energia como a troca, mas ninguém sai do lugar. */
  feint(origin: Vec2, candidates: readonly FeintCandidate[]): BoogieFeint | BoogieRefusal {
    if (this.stats.branch !== 'palmaFalsa') return this.refuse('noBranch');
    if (this._charges <= 0) return this.refuse('noCharge');
    this.spendCharge();
    this.refundArmed = true;
    const near = candidates.filter(
      (c) => Math.hypot(c.center.x - origin.x, c.center.y - origin.y) <= BOOGIE.feintRadiusPx,
    );
    const misses = near
      .filter((c) => c.kind === 'enemy')
      .map((c) => ({ targetId: c.id, counterWindowMs: BOOGIE.counterWindowMs }));
    return { ok: true, misses, bossCancel: this.fintaTotal(near), cost: this.stats.cost };
  }

  private fintaTotal(near: readonly FeintCandidate[]): BoogieFeint['bossCancel'] {
    if (!this.stats.awakened || this.fintaLeft > 0) return null;
    const boss = near.find((c) => c.kind === 'boss' && c.windingUp === true);
    if (boss === undefined) return null;
    this.fintaLeft = BOOGIE.fintaTotalCooldownMs;
    return { targetId: boss.id, maxHpPct: bitePctFor('boss') };
  }

  private spendCharge(): void {
    if (this._charges === this.stats.maxCharges) this.rechargeLeft = this.stats.chargeCooldownMs;
    this._charges -= 1;
  }

  private tickRecharge(dtMs: number): void {
    if (this._charges >= this.stats.maxCharges) return;
    this.rechargeLeft -= dtMs;
    while (this.rechargeLeft <= 0 && this._charges < this.stats.maxCharges) {
      this._charges += 1;
      this.rechargeLeft = this._charges < this.stats.maxCharges ? this.rechargeLeft + this.stats.chargeCooldownMs : 0;
    }
  }

  private refuse(reason: BoogieRefusal['reason']): BoogieRefusal {
    return { ok: false, reason, refund: this.stats.cost };
  }
}
