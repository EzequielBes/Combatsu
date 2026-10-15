import {
  axisAt,
  bitePctFor,
  boxCenter,
  maxHpBite,
  resolveBuild,
  type BodyKind,
  type Box,
  type TechBuild,
} from './axisRule';
import type { Vec2 } from './hit';
import type { Rng } from './rng';
import { RESONANCE, type ResonanceAxisId, type ResonanceBranchId } from '../data/resonance';

export type ResonanceBuild = TechBuild<ResonanceAxisId, ResonanceBranchId>;

/** Números resolvidos de uma build da Ressonância (RES-01, RES-02). */
export interface ResonanceStats {
  level: number;
  branch: ResonanceBranchId | null;
  awakened: boolean;
  nails: number;
  detonationDamage: number;
  markMs: number;
  propagationPx: number;
  cost: number;
  cooldownMs: number;
  signMs: number;
  releaseMs: number;
  recoverMs: number;
}

/** RES-01, RES-02: resolve a build nos números da técnica. */
export function resonanceStats(build: ResonanceBuild): ResonanceStats {
  const { level, branch, awakened } = resolveBuild(build);
  const a = build.axes;
  return {
    level,
    branch,
    awakened,
    nails: axisAt(RESONANCE.axes.pregos, a.pregos),
    detonationDamage: axisAt(RESONANCE.axes.detonacao, a.detonacao),
    markMs: axisAt(RESONANCE.axes.marca, a.marca),
    propagationPx: axisAt(RESONANCE.axes.propagacao, a.propagacao),
    cost: axisAt(RESONANCE.axes.eficiencia, a.eficiencia),
    cooldownMs: axisAt(RESONANCE.axes.recarga, a.recarga),
    signMs: RESONANCE.signMs,
    releaseMs: RESONANCE.releaseMs,
    recoverMs: RESONANCE.recoverMs,
  };
}

/** Alvo vivo visto pela Ressonância: caixa para o prego, vida para saber quem a detonação mata. */
export interface ResTarget {
  id: number;
  kind: BodyKind;
  box: Box;
  hp: number;
  maxHp: number;
}

export interface MicroHit {
  targetId: number;
  damage: number;
  band: 'micro';
}

export type ResonanceEvent =
  ({ type: 'nail' } & MicroHit) | { type: 'grampo'; center: Vec2; hits: MicroHit[] } | ({ type: 'echo' } & MicroHit);

export interface DetonationHit {
  targetId: number;
  damage: number;
  marks: number;
  killed: boolean;
  /** O alvo entrou na cascata pela propagação de um abate (RES-06). */
  propagated: boolean;
  band: 'normal';
}

export interface Detonation {
  hits: DetonationHit[];
  /** Coroa de Pregos: a 2ª detonação no centro do grupo (RES-10). */
  crown: { center: Vec2; hits: { targetId: number; damage: number; band: 'normal' }[] } | null;
}

/** Eco do Boneco de Palha sobre um dano qualquer que o chefe tomou (RES-11). */
export interface StrawEcho {
  targetId: number;
  damage: number;
  /** Componente proporcional do 1º eco da janela (1% do HP máximo); 0 nos seguintes. */
  bite: number;
  poise: true;
  band: 'micro';
}

/**
 * RES-12: alturas dos pregos, em leque de `spreadPx` centrado em `originY`. Com `rng`, cada prego desvia até
 * `jitterPx` para cima ou para baixo; sem ele, o leque é regular.
 */
export function nailHeights(count: number, originY: number, rng?: Rng): number[] {
  const { spreadPx, jitterPx } = RESONANCE.nail;
  const step = count > 1 ? spreadPx / (count - 1) : 0;
  const top = count > 1 ? originY - spreadPx / 2 : originY;
  return Array.from({ length: count }, (_, i) => top + i * step + (rng ? rng.int(-jitterPx, jitterPx) : 0));
}

interface Nail {
  x: number;
  y: number;
  dir: 1 | -1;
  traveled: number;
}

/** Distância ao longo do voo até o prego entrar na caixa, ou `null` se o trecho não toca a caixa. */
function entryDistance(nail: Nail, step: number, box: Box): number | null {
  if (nail.y < box.y || nail.y > box.y + box.height) return null;
  const x1 = nail.x + nail.dir * step;
  if (Math.max(nail.x, x1) < box.x || Math.min(nail.x, x1) > box.x + box.width) return null;
  return nail.dir === 1 ? Math.max(box.x - nail.x, 0) : Math.max(nail.x - (box.x + box.width), 0);
}

/** Círculo contra caixa: o ponto da caixa mais perto do centro está dentro do raio. */
function boxInRadius(box: Box, center: Vec2, radius: number): boolean {
  const dx = center.x - Math.max(box.x, Math.min(center.x, box.x + box.width));
  const dy = center.y - Math.max(box.y, Math.min(center.y, box.y + box.height));
  return dx * dx + dy * dy <= radius * radius;
}

/** O vivo mais perto de `from` (centro a centro) dentro de `radius`, fora de `skip`; empate pelo menor id. */
function nearestWithin(from: Vec2, radius: number, targets: readonly ResTarget[], skip: (id: number) => boolean) {
  let best: ResTarget | null = null;
  let bestDist = Infinity;
  for (const t of targets) {
    if (skip(t.id)) continue;
    const c = boxCenter(t.box);
    const d = Math.hypot(c.x - from.x, c.y - from.y);
    if (d > radius) continue;
    if (d < bestDist || (d === bestDist && best !== null && t.id < best.id)) {
      best = t;
      bestDist = d;
    }
  }
  return best;
}

/**
 * Ressonância (plano, seção 5.1): o 1º toque lança os pregos, que cravam e marcam; o 2º toque detona as marcas vivas
 * em cascata. Pura: o adaptador desenha os pregos, aplica os acertos e cobra a energia do 1º toque.
 */
export class ResonanceState {
  readonly stats: ResonanceStats;
  private _phase: 'ready' | 'armed' | 'cooldown' = 'ready';
  private nails: Nail[] = [];
  private readonly marks = new Map<number, number[]>();
  private cooldownLeft = 0;
  private echoes: { targetId: number; damage: number; leftMs: number }[] = [];
  private readonly straw = new Map<number, number>();
  private readonly strawBitten = new Set<number>();

  constructor(build: ResonanceBuild) {
    this.stats = resonanceStats(build);
  }

  get phase(): 'ready' | 'armed' | 'cooldown' {
    return this._phase;
  }

  /** O que a tecla faz agora: lançar, detonar ou nada (recarga). */
  get nextTap(): 'throw' | 'detonate' | 'none' {
    if (this._phase === 'ready') return 'throw';
    return this._phase === 'armed' ? 'detonate' : 'none';
  }

  get nailsInFlight(): number {
    return this.nails.length;
  }

  get cooldownLeftMs(): number {
    return this.cooldownLeft;
  }

  get totalMarks(): number {
    let n = 0;
    for (const list of this.marks.values()) n += list.length;
    return n;
  }

  marksOn(targetId: number): number {
    return this.marks.get(targetId)?.length ?? 0;
  }

  /** RES-03, RES-12: o 1º toque. Devolve o custo, ou `null` fora da fase de lançar. */
  throwNails(origin: Vec2, facing: 1 | -1, rng?: Rng): { cost: number } | null {
    if (this._phase !== 'ready') return null;
    this.nails = nailHeights(this.stats.nails, origin.y, rng).map((y) => ({
      x: origin.x,
      y,
      dir: facing,
      traveled: 0,
    }));
    this._phase = 'armed';
    return { cost: this.stats.cost };
  }

  /** RES-03, RES-05, RES-08, RES-09: avança pregos, marcas, ecos, janelas e recarga. */
  update(dtMs: number, targets: readonly ResTarget[]): ResonanceEvent[] {
    this.tickCooldown(dtMs);
    this.tickMarks(dtMs);
    const events = this.advanceNails(dtMs, targets);
    events.push(...this.tickEchoes(dtMs));
    for (const [id, left] of this.straw) {
      if (left - dtMs <= 0) this.straw.delete(id);
      else this.straw.set(id, left - dtMs);
    }
    if (this._phase === 'armed' && this.nails.length === 0 && this.marks.size === 0) this.startCooldown();
    return events;
  }

  /** RES-04, RES-06, RES-09, RES-10, RES-11: o 2º toque. `null` fora da fase armada. */
  detonate(targets: readonly ResTarget[]): Detonation | null {
    if (this._phase !== 'armed') return null;
    const { hits, marks } = this.cascade(targets);
    const crown = this.crown(hits, marks, targets);
    this.afterDetonation(hits, targets);
    this.marks.clear();
    this.nails = [];
    this.startCooldown();
    return { hits, crown };
  }

  /**
   * RES-07: alvo marcado que morreu por outra fonte. As marcas dele pulam inteiras, com duração nova, para o vivo mais
   * perto no raio de propagação. Devolve para quem pularam, ou `null`.
   */
  onTargetDied(
    dead: { id: number; center: Vec2 },
    living: readonly ResTarget[],
  ): { toId: number; marks: number } | null {
    const count = this.marksOn(dead.id);
    this.marks.delete(dead.id);
    if (count === 0 || this.stats.propagationPx <= 0) return null;
    const to = nearestWithin(dead.center, this.stats.propagationPx, living, (id) => id === dead.id);
    if (to === null) return null;
    for (let i = 0; i < count; i++) this.addMark(to.id);
    return { toId: to.id, marks: count };
  }

  /**
   * RES-11: Boneco de Palha. Com a janela aberta no chefe, devolve o eco de 50% de `damage` (com postura); o 1º eco da
   * janela também tira 1% do HP máximo. O adaptador não repassa o próprio eco para cá.
   */
  strawDollEcho(targetId: number, damage: number, maxHp: number): StrawEcho | null {
    if (!this.straw.has(targetId) || damage <= 0) return null;
    const bite = this.strawBitten.has(targetId) ? 0 : maxHpBite(maxHp, 'boss', bitePctFor('boss'));
    this.strawBitten.add(targetId);
    const echo = Math.round(damage * RESONANCE.bonecoDePalha.echoMul);
    return { targetId, damage: echo, bite, poise: true, band: 'micro' };
  }

  private cascade(targets: readonly ResTarget[]): { hits: DetonationHit[]; marks: number } {
    const byId = new Map(targets.map((t) => [t.id, t]));
    const queue = new Map<number, { marks: number; propagated: boolean }>();
    for (const id of [...this.marks.keys()].sort((a, b) => a - b)) {
      if (byId.has(id)) queue.set(id, { marks: this.marksOn(id), propagated: false });
    }
    const hits: DetonationHit[] = [];
    const done = new Set<number>();
    let total = 0;
    for (const [id, entry] of queue) {
      const t = byId.get(id) as ResTarget;
      done.add(id);
      const damage = entry.marks * this.stats.detonationDamage;
      const killed = damage >= t.hp;
      total += entry.marks;
      hits.push({ targetId: id, damage, marks: entry.marks, killed, propagated: entry.propagated, band: 'normal' });
      if (killed && this.stats.propagationPx > 0) this.propagate(t, targets, done, queue);
    }
    return { hits, marks: total };
  }

  /** RES-06: 1 marca do morto pula para o vivo mais perto que ainda não detonou; entra no fim da fila. */
  private propagate(
    from: ResTarget,
    targets: readonly ResTarget[],
    done: ReadonlySet<number>,
    queue: Map<number, { marks: number; propagated: boolean }>,
  ): void {
    const to = nearestWithin(boxCenter(from.box), this.stats.propagationPx, targets, (id) => done.has(id));
    if (to === null) return;
    const queued = queue.get(to.id);
    if (queued) queued.marks += 1;
    else queue.set(to.id, { marks: 1, propagated: true });
  }

  /** RES-10: Coroa de Pregos, com 5+ marcas na mesma detonação. */
  private crown(hits: readonly DetonationHit[], marks: number, targets: readonly ResTarget[]): Detonation['crown'] {
    if (!this.stats.awakened || this.stats.branch !== 'grampo' || marks < RESONANCE.coroa.minMarks) return null;
    const byId = new Map(targets.map((t) => [t.id, t]));
    const group = hits.filter((h) => !h.propagated).map((h) => boxCenter((byId.get(h.targetId) as ResTarget).box));
    const center = {
      x: group.reduce((s, c) => s + c.x, 0) / group.length,
      y: group.reduce((s, c) => s + c.y, 0) / group.length,
    };
    const killed = new Set(hits.filter((h) => h.killed).map((h) => h.targetId));
    const crownHits = targets
      .filter((t) => !killed.has(t.id) && boxInRadius(t.box, center, RESONANCE.coroa.radiusPx))
      .map((t) => ({
        targetId: t.id,
        damage: this.stats.detonationDamage + maxHpBite(t.maxHp, t.kind, bitePctFor('enemy')),
        band: 'normal' as const,
      }));
    return { center, hits: crownHits };
  }

  /** RES-09, RES-11: o Boneco agenda o eco no chefe; o Boneco de Palha abre a janela dele. */
  private afterDetonation(hits: readonly DetonationHit[], targets: readonly ResTarget[]): void {
    if (this.stats.branch !== 'boneco') return;
    const bosses = new Set(targets.filter((t) => t.kind === 'boss').map((t) => t.id));
    this.strawBitten.clear();
    for (const h of hits) {
      if (!bosses.has(h.targetId)) continue;
      const damage = Math.round(h.damage * RESONANCE.boneco.echoMul);
      this.echoes.push({ targetId: h.targetId, damage, leftMs: RESONANCE.boneco.echoDelayMs });
      if (this.stats.awakened) this.straw.set(h.targetId, RESONANCE.bonecoDePalha.windowMs);
    }
  }

  private advanceNails(dtMs: number, targets: readonly ResTarget[]): ResonanceEvent[] {
    const events: ResonanceEvent[] = [];
    const flying: Nail[] = [];
    for (const nail of this.nails) {
      const step = Math.min(RESONANCE.nail.speed * (dtMs / 1000), RESONANCE.nail.rangePx - nail.traveled);
      const hit = this.firstAlong(nail, step, targets);
      if (hit !== null) {
        events.push(...this.stick(hit.target, { x: nail.x + nail.dir * hit.dist, y: nail.y }, targets));
        continue;
      }
      nail.x += nail.dir * step;
      nail.traveled += step;
      if (nail.traveled < RESONANCE.nail.rangePx) flying.push(nail);
    }
    this.nails = flying;
    return events;
  }

  private firstAlong(nail: Nail, step: number, targets: readonly ResTarget[]) {
    let best: { target: ResTarget; dist: number } | null = null;
    for (const t of targets) {
      const dist = entryDistance(nail, step, t.box);
      if (dist === null) continue;
      if (best === null || dist < best.dist || (dist === best.dist && t.id < best.target.id))
        best = { target: t, dist };
    }
    return best;
  }

  /** RES-03, RES-08: o prego crava, marca e dá o toque; com o Grampo, explode em volta do ponto. */
  private stick(target: ResTarget, point: Vec2, targets: readonly ResTarget[]): ResonanceEvent[] {
    this.addMark(target.id);
    const events: ResonanceEvent[] = [
      { type: 'nail', targetId: target.id, damage: RESONANCE.nail.damage, band: 'micro' },
    ];
    if (this.stats.branch === 'grampo') {
      const hits = targets
        .filter((t) => boxInRadius(t.box, point, RESONANCE.grampo.radiusPx))
        .map((t) => ({ targetId: t.id, damage: RESONANCE.grampo.damage, band: 'micro' as const }));
      events.push({ type: 'grampo', center: point, hits });
    }
    return events;
  }

  private addMark(targetId: number): void {
    const list = this.marks.get(targetId) ?? [];
    list.push(this.stats.markMs);
    this.marks.set(targetId, list);
  }

  private tickMarks(dtMs: number): void {
    for (const [id, list] of this.marks) {
      const alive = list.map((ms) => ms - dtMs).filter((ms) => ms > 0);
      if (alive.length === 0) this.marks.delete(id);
      else this.marks.set(id, alive);
    }
  }

  private tickEchoes(dtMs: number): ResonanceEvent[] {
    const due: ResonanceEvent[] = [];
    for (const e of this.echoes) {
      e.leftMs -= dtMs;
      if (e.leftMs <= 0) due.push({ type: 'echo', targetId: e.targetId, damage: e.damage, band: 'micro' });
    }
    this.echoes = this.echoes.filter((e) => e.leftMs > 0);
    return due;
  }

  private tickCooldown(dtMs: number): void {
    if (this._phase !== 'cooldown') return;
    this.cooldownLeft = Math.max(0, this.cooldownLeft - dtMs);
    if (this.cooldownLeft === 0) this._phase = 'ready';
  }

  private startCooldown(): void {
    this._phase = 'cooldown';
    this.cooldownLeft = this.stats.cooldownMs;
  }
}
