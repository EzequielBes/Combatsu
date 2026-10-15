import { axisAt, killRefundPct, resolveBuild, type BodyKind, type Box, type TechBuild } from './axisRule';
import type { Vec2 } from './hit';
import { BiteLedger, boxesOverlap, boxInRadius, KillRefund } from './techKit';
import { ERUPTION, type EruptionAxisId, type EruptionBranchId } from '../data/eruption';

export type EruptionBuild = TechBuild<EruptionAxisId, EruptionBranchId>;

/** Números resolvidos de uma build da Erupção (ERU-01, ERU-02). */
export interface EruptionStats {
  level: number;
  branch: EruptionBranchId | null;
  awakened: boolean;
  heightPx: number;
  eruptions: number;
  /** Dano chip de cada tique da queima (0 = sem queima). */
  burnChip: number;
  damage: number;
  cost: number;
  cooldownMs: number;
  /** TRL-06: fração da recarga devolvida pelo 1º abate da conjuração (0,3 com Recarga no 3, senão 0). */
  killRefundPct: number;
  signMs: number;
  recoverMs: number;
}

/** ERU-01, ERU-02: resolve a build nos números da técnica. */
export function eruptionStats(build: EruptionBuild): EruptionStats {
  const { level, branch, awakened } = resolveBuild(build);
  const a = build.axes;
  return {
    level,
    branch,
    awakened,
    heightPx: axisAt(ERUPTION.axes.altura, a.altura),
    eruptions: axisAt(ERUPTION.axes.erupcoes, a.erupcoes),
    burnChip: axisAt(ERUPTION.axes.queima, a.queima),
    damage: axisAt(ERUPTION.axes.dano, a.dano),
    cost: axisAt(ERUPTION.axes.eficiencia, a.eficiencia),
    cooldownMs: axisAt(ERUPTION.axes.recarga, a.recarga),
    killRefundPct: killRefundPct(a.recarga),
    signMs: ERUPTION.signMs,
    recoverMs: ERUPTION.recoverMs,
  };
}

/** Alvo vivo visto pela Erupção: quem sai da lista morreu. */
export interface EruptionTarget {
  id: number;
  kind: BodyKind;
  box: Box;
  maxHp: number;
}

/** Acerto direto (pilar, meteoro, caldeira): faixa normal. `bite` é o componente dos Despertares. */
export interface EruptHit {
  targetId: number;
  damage: number;
  bite: number;
  knockdown: boolean;
  band: 'normal';
}

export interface MinorHit<B extends 'micro' | 'chip'> {
  targetId: number;
  damage: number;
  band: B;
}

export type EruptionEvent =
  | { type: 'pillar'; x: number; hits: EruptHit[] }
  | { type: 'meteor'; x: number; hits: EruptHit[] }
  | { type: 'caldeira'; x: number; hits: EruptHit[] }
  | { type: 'shard'; x: number; hits: MinorHit<'micro'>[] }
  | ({ type: 'burn' } & MinorHit<'chip'>)
  | { type: 'lava'; x: number; hits: MinorHit<'chip'>[] };

interface Timed {
  x: number;
  atMs: number;
}

interface Burn {
  nextMs: number;
  endMs: number;
}

interface Pool {
  x: number;
  nextMs: number;
  endMs: number;
}

/**
 * Uma conjuração da Erupção (plano, seção 5.1): a fila de pilares (ou meteoros) à frente, a queima de quem foi
 * atingido e a lava do ramo. Os tempos são contados desde a conjuração, no instante agendado (não no do quadro),
 * para o resultado não depender do passo. Pura: o adaptador desenha e aplica os acertos.
 */
export class EruptionCast {
  private elapsedMs = 0;
  private slots: Timed[];
  private shards: Timed[] = [];
  private readonly burns = new Map<number, Burn>();
  private pools: Pool[] = [];
  private readonly ledger = new BiteLedger();
  private readonly refund: KillRefund;

  /** `feet`: ponto do player no chão (centro x, y do chão). */
  constructor(
    readonly stats: EruptionStats,
    private readonly feet: Vec2,
    facing: 1 | -1,
  ) {
    this.refund = new KillRefund(stats.cooldownMs, stats.killRefundPct);
    const delay = stats.branch === 'meteoro' ? ERUPTION.meteoro.delayMs : 0;
    this.slots = Array.from({ length: stats.eruptions }, (_, i) => ({
      x: feet.x + facing * (ERUPTION.aheadPx + i * ERUPTION.spacingPx),
      atMs: stats.signMs + i * ERUPTION.staggerMs + delay,
    }));
  }

  /** Nada mais a acontecer: o adaptador pode descartar a conjuração. */
  get done(): boolean {
    return this.slots.length === 0 && this.shards.length === 0 && this.burns.size === 0 && this.pools.length === 0;
  }

  /** As poças de lava vivas, para a vista. */
  get lavaView(): { x: number; leftMs: number }[] {
    return this.pools.map((p) => ({ x: p.x, leftMs: Math.max(0, p.endMs - this.elapsedMs) }));
  }

  /** ERU-03 a ERU-08: avança a fila, os estilhaços, a queima e a lava. */
  update(dtMs: number, targets: readonly EruptionTarget[]): EruptionEvent[] {
    this.elapsedMs += dtMs;
    const events: EruptionEvent[] = [];
    for (const slot of this.due(this.slots, (s) => (this.slots = s))) events.push(this.erupt(slot, targets));
    for (const shard of this.due(this.shards, (s) => (this.shards = s))) events.push(this.shard(shard, targets));
    this.tickBurns(targets, events);
    this.tickPools(targets, events);
    return events;
  }

  /** ERU-09 (TRL-06): o adaptador avisa que um acerto desta conjuração matou; devolve os ms a cortar da recarga. */
  claimKillRefund(): number {
    return this.refund.claim();
  }

  /** Tira da lista o que venceu até agora, na ordem do tempo. */
  private due(list: Timed[], keep: (rest: Timed[]) => void): Timed[] {
    const now = list.filter((t) => t.atMs <= this.elapsedMs).sort((p, q) => p.atMs - q.atMs);
    keep(list.filter((t) => t.atMs > this.elapsedMs));
    return now;
  }

  /** ERU-03, ERU-05, ERU-06, ERU-07: um pilar (ou meteoro) da fila. */
  private erupt(slot: Timed, targets: readonly EruptionTarget[]): EruptionEvent {
    const { branch, awakened } = this.stats;
    if (branch === 'lagoDeLava') {
      const { tickMs, durationMs } = ERUPTION.lagoDeLava;
      this.pools.push({ x: slot.x, nextMs: slot.atMs + tickMs, endMs: slot.atMs + durationMs });
    }
    if (branch !== 'meteoro') return { type: 'pillar', x: slot.x, hits: this.pillarHits(slot, targets, false) };
    const { radiusPx, damageMul } = ERUPTION.meteoro;
    const center = { x: slot.x, y: this.feet.y };
    const damage = Math.round(this.stats.damage * damageMul);
    const hits = this.directHits(
      targets.filter((t) => boxInRadius(t.box, center, radiusPx)),
      slot,
      damage,
      awakened,
      true,
    );
    if (awakened) {
      const { offsetPx, delayMs } = ERUPTION.chuvaDeMeteoros;
      const atMs = slot.atMs + delayMs;
      this.shards.push({ x: slot.x - offsetPx, atMs }, { x: slot.x + offsetPx, atMs });
    }
    return { type: 'meteor', x: slot.x, hits };
  }

  /** O retângulo do pilar no `x`, do chão até a altura. */
  private pillarHits(at: Timed, targets: readonly EruptionTarget[], bite: boolean): EruptHit[] {
    const { widthPx } = ERUPTION;
    const rect: Box = {
      x: at.x - widthPx / 2,
      y: this.feet.y - this.stats.heightPx,
      width: widthPx,
      height: this.stats.heightPx,
    };
    const inside = targets.filter((t) => boxesOverlap(rect, t.box));
    return this.directHits(inside, at, this.stats.damage, bite, false);
  }

  /** Acertos diretos, do mais perto do `x` ao mais longe (empate pelo id), acendendo a queima. */
  private directHits(
    hit: readonly EruptionTarget[],
    at: Timed,
    damage: number,
    bite: boolean,
    knockdown: boolean,
  ): EruptHit[] {
    const off = (t: EruptionTarget): number => Math.abs(t.box.x + t.box.width / 2 - at.x);
    return [...hit]
      .sort((p, q) => off(p) - off(q) || p.id - q.id)
      .map((t) => {
        this.ignite(t.id, at.atMs);
        return {
          targetId: t.id,
          damage,
          bite: bite ? this.ledger.bite(t) : 0,
          knockdown: knockdown && t.kind === 'enemy',
          band: 'normal',
        };
      });
  }

  /** ERU-04: acende (ou renova, sem somar) a queima a partir do instante do acerto. */
  private ignite(targetId: number, atMs: number): void {
    if (this.stats.burnChip <= 0) return;
    this.burns.set(targetId, { nextMs: atMs + ERUPTION.burn.tickMs, endMs: atMs + ERUPTION.burn.durationMs });
  }

  /** ERU-07: um estilhaço da Chuva de Meteoros. */
  private shard(at: Timed, targets: readonly EruptionTarget[]): EruptionEvent {
    const { radiusPx, damageMul } = ERUPTION.chuvaDeMeteoros;
    const damage = Math.round(this.stats.damage * damageMul);
    const center = { x: at.x, y: this.feet.y };
    const hits = targets
      .filter((t) => boxInRadius(t.box, center, radiusPx))
      .sort((p, q) => p.id - q.id)
      .map((t) => ({ targetId: t.id, damage, band: 'micro' as const }));
    return { type: 'shard', x: at.x, hits };
  }

  /** ERU-04: tiques da queima vencidos; quem morreu (fora da lista) perde a queima. */
  private tickBurns(targets: readonly EruptionTarget[], events: EruptionEvent[]): void {
    const { tickMs } = ERUPTION.burn;
    for (const [id, burn] of this.burns) {
      const alive = targets.some((t) => t.id === id);
      while (alive && burn.nextMs <= this.elapsedMs && burn.nextMs <= burn.endMs) {
        events.push({ type: 'burn', targetId: id, damage: this.stats.burnChip, band: 'chip' });
        burn.nextMs += tickMs;
      }
      if (!alive || burn.nextMs > burn.endMs) this.burns.delete(id);
    }
  }

  /** ERU-06, ERU-08: tiques da lava; no fim, a Caldeira entra em erupção no lugar da poça. */
  private tickPools(targets: readonly EruptionTarget[], events: EruptionEvent[]): void {
    const { widthPx, heightPx, tickMs, chip } = ERUPTION.lagoDeLava;
    const damage = Math.max(chip, this.stats.burnChip);
    for (const pool of this.pools) {
      const rect: Box = { x: pool.x - widthPx / 2, y: this.feet.y - heightPx, width: widthPx, height: heightPx };
      while (pool.nextMs <= this.elapsedMs && pool.nextMs <= pool.endMs) {
        const hits = targets
          .filter((t) => boxesOverlap(rect, t.box))
          .sort((p, q) => p.id - q.id)
          .map((t) => ({ targetId: t.id, damage, band: 'chip' as const }));
        if (hits.length > 0) events.push({ type: 'lava', x: pool.x, hits });
        pool.nextMs += tickMs;
      }
      if (pool.endMs <= this.elapsedMs && this.stats.awakened) {
        const at = { x: pool.x, atMs: pool.endMs };
        events.push({ type: 'caldeira', x: pool.x, hits: this.pillarHits(at, targets, true) });
      }
    }
    this.pools = this.pools.filter((p) => p.endMs > this.elapsedMs);
  }
}

/** Conjura a Erupção: devolve o custo e a conjuração. Não recusa: sem alvo, os pilares sobem no vazio. */
export function erupt(stats: EruptionStats, feet: Vec2, facing: 1 | -1): { cost: number; cast: EruptionCast } {
  return { cost: stats.cost, cast: new EruptionCast(stats, feet, facing) };
}
