import { axisAt, boxCenter, killRefundPct, resolveBuild, type BodyKind, type Box, type TechBuild } from './axisRule';
import type { Strength, Vec2 } from './hit';
import { BiteLedger, KillRefund, nearestTarget } from './techKit';
import { THUNDER_FIST, type ThunderAxisId, type ThunderBranchId } from '../data/thunderFist';

export type ThunderBuild = TechBuild<ThunderAxisId, ThunderBranchId>;

/** Números resolvidos de uma build do Punho de Trovão (TRV-01, TRV-02). */
export interface ThunderStats {
  level: number;
  branch: ThunderBranchId | null;
  awakened: boolean;
  charges: number;
  jumps: number;
  jumpRadiusPx: number;
  damage: number;
  /** Atordoamento de cada acerto do raio no comum, já com a Estática. */
  stunMs: number;
  bossStunMs: number;
  cost: number;
  cooldownMs: number;
  windowMs: number;
  hopHitstopMs: number;
  /** TRL-06: fração da recarga devolvida pelo 1º abate da carga (0,3 com Recarga no 3, senão 0). */
  killRefundPct: number;
  signMs: number;
  recoverMs: number;
}

/** TRV-01, TRV-02, TRV-06: resolve a build nos números da técnica. */
export function thunderStats(build: ThunderBuild): ThunderStats {
  const { level, branch, awakened } = resolveBuild(build);
  const a = build.axes;
  const stunMs =
    axisAt(THUNDER_FIST.axes.atordoa, a.atordoa) + (branch === 'estatica' ? THUNDER_FIST.estatica.stunMs : 0);
  return {
    level,
    branch,
    awakened,
    charges: axisAt(THUNDER_FIST.axes.cargas, a.cargas),
    jumps: axisAt(THUNDER_FIST.axes.saltos, a.saltos),
    jumpRadiusPx: a.saltos >= 3 ? THUNDER_FIST.capJumpRadiusPx : THUNDER_FIST.jumpRadiusPx,
    damage: axisAt(THUNDER_FIST.axes.dano, a.dano),
    stunMs,
    bossStunMs: Math.round(stunMs * THUNDER_FIST.bossStunMul),
    cost: axisAt(THUNDER_FIST.axes.eficiencia, a.eficiencia),
    cooldownMs: axisAt(THUNDER_FIST.axes.recarga, a.recarga),
    windowMs: THUNDER_FIST.windowMs,
    hopHitstopMs: THUNDER_FIST.hopHitstopMs,
    killRefundPct: killRefundPct(a.recarga),
    signMs: THUNDER_FIST.signMs,
    recoverMs: THUNDER_FIST.recoverMs,
  };
}

/** Alvo vivo visto pelo raio. */
export interface ThunderTarget {
  id: number;
  kind: BodyKind;
  box: Box;
  maxHp: number;
}

/** Um acerto do raio em cadeia: faixa micro. `hop` 0 é o golpeado; `bite` é o componente da Descarga. */
export interface BoltHit {
  targetId: number;
  hop: number;
  from: Vec2;
  to: Vec2;
  damage: number;
  stunMs: number;
  bite: number;
  band: 'micro';
}

/** Um acerto do raio vertical da Tempestade: faixa micro. `bite` e `knockdown` vêm do Raio Celeste. */
export interface ColumnHit {
  targetId: number;
  damage: number;
  knockdown: boolean;
  bite: number;
  band: 'micro';
}

/** O que um golpe carregado solta. */
export interface Discharge {
  bolt: BoltHit[];
  column: { x: number; hits: ColumnHit[] } | null;
  chargesLeft: number;
}

/** Golpe do moveset que acertou: o golpeado e a força do golpe. */
export interface LandedStrike {
  targetId: number;
  strength: Strength;
}

/**
 * Punho de Trovão (plano, seção 5.1): a conjuração carrega o corpo; cada golpe do moveset que acerta gasta 1 carga e
 * solta o raio. Pura: o adaptador cobra a energia e guarda a recarga, chama `onStrike` a cada golpe que acerta e
 * aplica os acertos (com `hopHitstopMs` por salto).
 */
export class ThunderFist {
  private chargesLeft = 0;
  private windowLeft = 0;
  private readonly stunned = new Map<number, number>();
  private ledger = new BiteLedger();
  private refund: KillRefund;

  constructor(readonly stats: ThunderStats) {
    this.refund = new KillRefund(stats.cooldownMs, stats.killRefundPct);
  }

  get charges(): number {
    return this.chargesLeft;
  }

  get windowLeftMs(): number {
    return this.windowLeft;
  }

  /** TRV-04: conjura. Repõe as cargas no máximo e a janela, sem somar; zera o rastro da carga anterior. */
  cast(): { cost: number } {
    this.chargesLeft = this.stats.charges;
    this.windowLeft = this.stats.windowMs;
    this.stunned.clear();
    this.ledger = new BiteLedger();
    this.refund = new KillRefund(this.stats.cooldownMs, this.stats.killRefundPct);
    return { cost: this.stats.cost };
  }

  /** TRV-04: a janela corre; no fim, as cargas que sobram se apagam. Os atordoamentos desta carga também correm. */
  update(dtMs: number): void {
    this.windowLeft = Math.max(0, this.windowLeft - dtMs);
    if (this.windowLeft === 0) this.chargesLeft = 0;
    for (const [id, left] of this.stunned) {
      if (left - dtMs <= 0) this.stunned.delete(id);
      else this.stunned.set(id, left - dtMs);
    }
  }

  /**
   * TRV-03 a TRV-08: um golpe do moveset acertou. Sem carga, ou com o golpeado fora da lista de vivos, não solta nada
   * (`null`) e não gasta carga.
   */
  onStrike(strike: LandedStrike, targets: readonly ThunderTarget[]): Discharge | null {
    if (this.chargesLeft <= 0) return null;
    const struck = targets.find((t) => t.id === strike.targetId);
    if (struck === undefined) return null;
    this.chargesLeft -= 1;
    const bolt = this.chain(struck, targets);
    const heavyColumn = this.stats.branch === 'tempestade' && strike.strength === 'heavy';
    const column = heavyColumn ? this.column(boxCenter(struck.box).x, targets) : null;
    return { bolt, column, chargesLeft: this.chargesLeft };
  }

  /** TRV-09 (TRL-06): o adaptador avisa que um acerto desta carga matou; devolve os ms a cortar da recarga. */
  claimKillRefund(): number {
    return this.refund.claim();
  }

  /** TRV-03, TRV-08: o raio salta do golpeado para o vivo mais perto ainda fora da cadeia, até os saltos. */
  private chain(struck: ThunderTarget, targets: readonly ThunderTarget[]): BoltHit[] {
    const visited = new Set<number>([struck.id]);
    const descarga = this.stats.awakened && this.stats.branch === 'estatica';
    let jumpsLeft = this.stats.jumps;
    let extraUsed = false;
    const hits: BoltHit[] = [];
    let current = struck;
    let from = boxCenter(struck.box);
    for (let hop = 0; ; hop++) {
      const to = boxCenter(current.box);
      const discharged = descarga && this.stunned.has(current.id);
      if (discharged && !extraUsed) {
        jumpsLeft += 1;
        extraUsed = true;
      }
      hits.push(this.boltHit(current, hop, from, to, discharged));
      if (jumpsLeft <= 0) break;
      const next = nearestTarget(to, this.stats.jumpRadiusPx, targets, (id) => visited.has(id));
      if (next === null) break;
      visited.add(next.id);
      jumpsLeft -= 1;
      current = next;
      from = to;
    }
    return hits;
  }

  private boltHit(t: ThunderTarget, hop: number, from: Vec2, to: Vec2, discharged: boolean): BoltHit {
    const stunMs = t.kind === 'boss' ? this.stats.bossStunMs : this.stats.stunMs;
    if (stunMs > 0) this.stunned.set(t.id, Math.max(this.stunned.get(t.id) ?? 0, stunMs));
    const bite = discharged ? this.ledger.bite(t) : 0;
    return { targetId: t.id, hop, from, to, damage: this.stats.damage, stunMs, bite, band: 'micro' };
  }

  /** TRV-05, TRV-07: raio vertical em todos com o centro a até 24 px do x, do mais perto ao mais longe. */
  private column(x: number, targets: readonly ThunderTarget[]): { x: number; hits: ColumnHit[] } {
    const { halfWidthPx, damageMul } = THUNDER_FIST.tempestade;
    const celeste = this.stats.awakened;
    const off = (t: ThunderTarget): number => Math.abs(boxCenter(t.box).x - x);
    const hits = targets
      .filter((t) => off(t) <= halfWidthPx)
      .sort((p, q) => off(p) - off(q) || p.id - q.id)
      .map((t) => ({
        targetId: t.id,
        damage: Math.round(this.stats.damage * damageMul),
        knockdown: celeste && t.kind === 'enemy',
        bite: celeste ? this.ledger.bite(t) : 0,
        band: 'micro' as const,
      }));
    return { x, hits };
  }
}
