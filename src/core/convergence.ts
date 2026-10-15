import { axisAt, boxCenter, killRefundPct, resolveBuild, type BodyKind, type Box, type TechBuild } from './axisRule';
import type { Vec2 } from './hit';
import { BiteLedger, boxesOverlap, boxInRadius, dist, nearestTarget, type WallProbe } from './techKit';
import { CONVERGENCE, type ConvergenceAxisId, type ConvergenceBranchId } from '../data/convergence';

export type ConvergenceBuild = TechBuild<ConvergenceAxisId, ConvergenceBranchId>;

/** Números resolvidos de uma build da Convergência (CNV-01, CNV-02). */
export interface ConvergenceStats {
  level: number;
  branch: ConvergenceBranchId | null;
  awakened: boolean;
  /** Alvos atravessados; `Infinity` no 3º ponto. */
  pierce: number;
  chargeMs: number;
  widthPx: number;
  hpCost: number;
  /** Dano por alvo na carga cheia. */
  damage: number;
  cooldownMs: number;
  cost: number;
  rangePx: number;
  /** TRL-06: fração da recarga devolvida quando o feixe mata (0,3 com Recarga no 3, senão 0). */
  killRefundPct: number;
  releaseMs: number;
  recoverMs: number;
}

/** CNV-01, CNV-02: resolve a build nos números da técnica. */
export function convergenceStats(build: ConvergenceBuild): ConvergenceStats {
  const { level, branch, awakened } = resolveBuild(build);
  const a = build.axes;
  return {
    level,
    branch,
    awakened,
    pierce: axisAt(CONVERGENCE.axes.perfuracao, a.perfuracao),
    chargeMs: axisAt(CONVERGENCE.axes.carga, a.carga),
    widthPx: axisAt(CONVERGENCE.axes.largura, a.largura),
    hpCost: axisAt(CONVERGENCE.axes.vida, a.vida),
    damage: axisAt(CONVERGENCE.axes.dano, a.dano),
    cooldownMs: axisAt(CONVERGENCE.axes.recarga, a.recarga),
    cost: CONVERGENCE.cost,
    rangePx: CONVERGENCE.rangePx,
    killRefundPct: killRefundPct(a.recarga),
    releaseMs: CONVERGENCE.releaseMs,
    recoverMs: CONVERGENCE.recoverMs,
  };
}

/**
 * CNV-03: fração do dano pelo tempo segurado. Tocar e soltar dá 50%; sobe linear até 100% na carga cheia e para ali
 * (segurar mais não dispara sozinho).
 */
export function chargeMul(stats: ConvergenceStats, heldMs: number): number {
  const frac = Math.min(Math.max(heldMs, 0) / stats.chargeMs, 1);
  return CONVERGENCE.minChargeMul + (1 - CONVERGENCE.minChargeMul) * frac;
}

export interface BeamTarget {
  id: number;
  kind: BodyKind;
  box: Box;
  hp: number;
  maxHp: number;
}

/** Acerto direto do feixe ou da dobra: faixa normal. `bite` é o componente do Sangue Perfurante. */
export interface BeamHit {
  targetId: number;
  damage: number;
  bite: number;
  killed: boolean;
  band: 'normal';
}

/** Estilhaço da Supernova: faixa micro. `bite` é o componente da Supernova Carmesim. */
export interface ShardHit {
  targetId: number;
  damage: number;
  bite: number;
  killed: boolean;
  band: 'micro';
}

export interface BeamContext {
  /** Boca do feixe (centro da faixa). */
  origin: Vec2;
  facing: 1 | -1;
  /** Vida atual do player. */
  hp: number;
  /** Tempo que a tecla ficou segurada antes de soltar (ms). */
  heldMs: number;
  targets: readonly BeamTarget[];
  /** CNV-05: o feixe para no 1º sólido. Sem a sonda, campo aberto. */
  wall?: WallProbe;
}

export interface BeamBend {
  from: Vec2;
  to: Vec2;
  hit: BeamHit;
}

export type BeamResult =
  | { ok: false; reason: 'hp'; refund: number }
  | {
      ok: true;
      hpCost: number;
      cost: number;
      /** Dano por alvo já com a carga. */
      damage: number;
      fullCharge: boolean;
      /** Onde o trecho reto acaba (parede, alcance ou o último atravessado). */
      end: Vec2;
      hits: BeamHit[];
      bends: BeamBend[];
      shards: { center: Vec2; radiusPx: number; hits: ShardHit[] } | null;
      /** TRL-06: ms a cortar da recarga se o feixe matou (só com Recarga no 3). */
      refundMs: number;
    };

/** Vida corrente dos alvos durante a resolução do feixe. */
class HpBook {
  private readonly hp = new Map<number, number>();
  private anyKill = false;

  constructor(targets: readonly BeamTarget[]) {
    for (const t of targets) this.hp.set(t.id, t.hp);
  }

  alive(id: number): boolean {
    return (this.hp.get(id) ?? 0) > 0;
  }

  /** Aplica o dano e diz se matou agora. */
  apply(id: number, amount: number): boolean {
    const before = this.hp.get(id) ?? 0;
    const after = before - amount;
    this.hp.set(id, after);
    const killed = before > 0 && after <= 0;
    if (killed) this.anyKill = true;
    return killed;
  }

  get killedAny(): boolean {
    return this.anyKill;
  }
}

/** CNV-05: faixa do feixe e os atravessados, na ordem da entrada, até a perfuração. */
function straightBeam(stats: ConvergenceStats, ctx: BeamContext, book: HpBook) {
  const probed = ctx.wall?.(ctx.origin, ctx.facing, stats.rangePx) ?? stats.rangePx;
  // Sonda negativa (boca já dentro da parede) vira 0: a faixa nunca vira para trás.
  const length = Math.min(Math.max(probed, 0), stats.rangePx);
  const band: Box = {
    x: ctx.facing === 1 ? ctx.origin.x : ctx.origin.x - length,
    y: ctx.origin.y - stats.widthPx / 2,
    width: length,
    height: stats.widthPx,
  };
  const entry = (b: Box): number =>
    ctx.facing === 1 ? Math.max(b.x - ctx.origin.x, 0) : Math.max(ctx.origin.x - (b.x + b.width), 0);
  const crossed = ctx.targets
    .filter((t) => book.alive(t.id) && boxesOverlap(band, t.box))
    .sort((p, q) => entry(p.box) - entry(q.box) || p.id - q.id)
    .slice(0, stats.pierce);
  const stopped = crossed.length >= stats.pierce;
  const end = stopped
    ? boxCenter(crossed[crossed.length - 1].box)
    : { x: ctx.origin.x + ctx.facing * length, y: ctx.origin.y };
  return { crossed, end };
}

/** CNV-07, CNV-09: as dobras da Curva, do fim do feixe para o vivo mais perto ainda não atingido. */
function bendBeam(
  stats: ConvergenceStats,
  ctx: BeamContext,
  from: Vec2,
  hitIds: Set<number>,
  dmg: number,
  book: HpBook,
): BeamBend[] {
  const bends: BeamBend[] = [];
  const count = stats.awakened ? CONVERGENCE.sanguePerfurante.bends : CONVERGENCE.curva.bends;
  const ledger = new BiteLedger();
  let at = from;
  for (let i = 0; i < count; i++) {
    const next = nearestTarget(at, CONVERGENCE.curva.radiusPx, ctx.targets, (id) => hitIds.has(id) || !book.alive(id));
    if (next === null) break;
    hitIds.add(next.id);
    const bite = stats.awakened ? ledger.bite(next) : 0;
    const to = boxCenter(next.box);
    const killed = book.apply(next.id, dmg + bite);
    bends.push({ from: at, to, hit: { targetId: next.id, damage: dmg, bite, killed, band: 'normal' } });
    at = to;
  }
  return bends;
}

/** CNV-06, CNV-08: estilhaços da Supernova em volta do fim do feixe, nos vivos, do mais perto ao mais longe. */
function supernovaShards(stats: ConvergenceStats, ctx: BeamContext, center: Vec2, dmg: number, book: HpBook) {
  const radiusPx = stats.awakened ? CONVERGENCE.supernovaCarmesim.radiusPx : CONVERGENCE.supernova.radiusPx;
  const damage = Math.round(dmg * CONVERGENCE.supernova.damageMul);
  const ledger = new BiteLedger();
  const hits: ShardHit[] = ctx.targets
    .filter((t) => book.alive(t.id) && boxInRadius(t.box, center, radiusPx))
    .sort((p, q) => dist(boxCenter(p.box), center) - dist(boxCenter(q.box), center) || p.id - q.id)
    .map((t) => {
      const bite = stats.awakened ? ledger.bite(t) : 0;
      return { targetId: t.id, damage, bite, killed: book.apply(t.id, damage + bite), band: 'micro' as const };
    });
  return { center, radiusPx, hits };
}

/**
 * CNV-03 a CNV-10: solta o feixe. Recusa (a energia volta) se pagar a vida deixaria o player abaixo do piso de 1.
 * Resolve na ordem: trecho reto, dobras (Curva) ou estilhaços (Supernova); cada acerto já vê a vida que sobrou.
 */
export function fireBeam(stats: ConvergenceStats, ctx: BeamContext): BeamResult {
  if (stats.hpCost > 0 && ctx.hp - stats.hpCost < CONVERGENCE.hpFloor) {
    return { ok: false, reason: 'hp', refund: stats.cost };
  }
  const mul = chargeMul(stats, ctx.heldMs);
  const dmg = Math.round(stats.damage * mul);
  const book = new HpBook(ctx.targets);
  const { crossed, end } = straightBeam(stats, ctx, book);
  const hits: BeamHit[] = crossed.map((t) => ({
    targetId: t.id,
    damage: dmg,
    bite: 0,
    killed: book.apply(t.id, dmg),
    band: 'normal',
  }));
  const hitIds = new Set(crossed.map((t) => t.id));
  const bends = stats.branch === 'curva' ? bendBeam(stats, ctx, end, hitIds, dmg, book) : [];
  const shards = stats.branch === 'supernova' ? supernovaShards(stats, ctx, end, dmg, book) : null;
  return {
    ok: true,
    hpCost: stats.hpCost,
    cost: stats.cost,
    damage: dmg,
    fullCharge: mul >= 1,
    end,
    hits,
    bends,
    shards,
    refundMs: book.killedAny ? Math.round(stats.cooldownMs * stats.killRefundPct) : 0,
  };
}
