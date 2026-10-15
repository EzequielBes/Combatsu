import { axisAt, bitePctFor, killRefundPct, maxHpBite, resolveBuild, type BodyKind, type TechBuild } from './axisRule';
import { normalize, type Vec2 } from './hit';
import { CURSED_SPEECH, type SpeechAxisId, type SpeechBranchId } from '../data/cursedSpeech';

export type SpeechBuild = TechBuild<SpeechAxisId, SpeechBranchId>;

/** Números resolvidos de uma build da Fala Amaldiçoada (FAL-01, FAL-02). */
export interface SpeechStats {
  level: number;
  branch: SpeechBranchId | null;
  awakened: boolean;
  rangePx: number;
  stunMs: number;
  bossStunMs: number;
  hpCost: number;
  coneDeg: number;
  cost: number;
  cooldownMs: number;
  /** TRL-06: fração da recarga devolvida pelo 1º abate da conjuração (0,3 com Recarga no 3, senão 0). */
  killRefundPct: number;
  signMs: number;
  releaseMs: number;
  recoverMs: number;
}

/** FAL-01, FAL-02: resolve a build nos números da técnica. */
export function speechStats(build: SpeechBuild): SpeechStats {
  const { level, branch, awakened } = resolveBuild(build);
  const a = build.axes;
  const stunMs = axisAt(CURSED_SPEECH.axes.atordoamento, a.atordoamento);
  return {
    level,
    branch,
    awakened,
    rangePx: axisAt(CURSED_SPEECH.axes.alcance, a.alcance),
    stunMs,
    bossStunMs: Math.round(stunMs * CURSED_SPEECH.bossStunMul),
    hpCost: axisAt(CURSED_SPEECH.axes.vida, a.vida),
    coneDeg: axisAt(CURSED_SPEECH.axes.cone, a.cone),
    cost: axisAt(CURSED_SPEECH.axes.eficiencia, a.eficiencia),
    cooldownMs: axisAt(CURSED_SPEECH.axes.recarga, a.recarga),
    killRefundPct: killRefundPct(a.recarga),
    signMs: CURSED_SPEECH.signMs,
    releaseMs: CURSED_SPEECH.releaseMs,
    recoverMs: CURSED_SPEECH.recoverMs,
  };
}

/**
 * FAL-03: o ponto está à frente (`dx × facing > 0`), a até `rangePx` de `origin`, e o ângulo dele com a direção do
 * olhar é no máximo metade da abertura do cone.
 */
export function inCone(origin: Vec2, facing: 1 | -1, rangePx: number, coneDeg: number, point: Vec2): boolean {
  const ahead = (point.x - origin.x) * facing;
  if (ahead <= 0) return false;
  const dy = point.y - origin.y;
  if (Math.hypot(ahead, dy) > rangePx) return false;
  const angleDeg = (Math.atan2(Math.abs(dy), ahead) * 180) / Math.PI;
  return angleDeg <= coneDeg / 2 + 1e-9;
}

export interface SpeechTarget {
  id: number;
  kind: BodyKind;
  center: Vec2;
  maxHp: number;
}

/** Acerto da fala: atordoa sempre; o "Exploda" soma dano e o "Volte" empurra (e derruba o comum). */
export interface SpeechHit {
  targetId: number;
  kind: BodyKind;
  stunMs: number;
  damage: number;
  knockdown: boolean;
  force: number;
  direction: Vec2;
  band: 'normal';
}

/** Acerto dos Despertares (explosão em cadeia e esmagamento), discreto: faixa micro. */
export interface SpeechEffectHit {
  targetId: number;
  stunMs: number;
  damage: number;
  knockdown: boolean;
  band: 'micro';
}

export interface SpeechContext {
  origin: Vec2;
  facing: 1 | -1;
  /** Vida atual do player. */
  hp: number;
  targets: readonly SpeechTarget[];
  /**
   * FAL-09: linha de visão do player até o alvo (o adaptador testa os sólidos do mundo). Sem ela, todo alvo no cone
   * é visto.
   */
  lineOfSight?: (from: Vec2, to: Vec2) => boolean;
}

export type SpeechResult =
  | { ok: false; reason: 'hp'; refund: number }
  | { ok: true; hpCost: number; cost: number; hits: SpeechHit[]; cast: SpeechCast };

function speechHit(stats: SpeechStats, origin: Vec2, t: SpeechTarget): SpeechHit {
  const boss = t.kind === 'boss';
  const volte = stats.branch === 'volte';
  const volteForce = CURSED_SPEECH.volte.force * (boss ? CURSED_SPEECH.volte.bossForceMul : 1);
  return {
    targetId: t.id,
    kind: t.kind,
    stunMs: boss ? stats.bossStunMs : stats.stunMs,
    damage: stats.branch === 'exploda' ? CURSED_SPEECH.exploda.damage : 0,
    knockdown: volte && !boss,
    force: volte ? volteForce : 0,
    direction: normalize({ x: t.center.x - origin.x, y: t.center.y - origin.y }),
    band: 'normal',
  };
}

/**
 * FAL-03 a FAL-06: a fala. Recusa (sem gastar nada, a energia volta) se a vida não passa do custo em vida: a técnica
 * nunca mata o player. Os acertos saem do mais perto ao mais longe, empate pelo menor id.
 */
export function speak(stats: SpeechStats, ctx: SpeechContext): SpeechResult {
  if (ctx.hp <= stats.hpCost) return { ok: false, reason: 'hp', refund: stats.cost };
  const dist = (t: SpeechTarget): number => Math.hypot(t.center.x - ctx.origin.x, t.center.y - ctx.origin.y);
  const hits = ctx.targets
    .filter((t) => inCone(ctx.origin, ctx.facing, stats.rangePx, stats.coneDeg, t.center))
    .filter((t) => ctx.lineOfSight?.(ctx.origin, t.center) ?? true)
    .sort((a, b) => dist(a) - dist(b) || a.id - b.id)
    .map((t) => speechHit(stats, ctx.origin, t));
  return { ok: true, hpCost: stats.hpCost, cost: stats.cost, hits, cast: new SpeechCast(stats, hits) };
}

/**
 * O rastro de uma fala: quem segue atordoado por ela (Exploda em Cadeia) e quem foi empurrado e ainda pode esmagar
 * (Esmague). O componente proporcional sai uma vez por alvo nesta conjuração.
 */
export class SpeechCast {
  private readonly stunned = new Map<number, number>();
  private readonly pushed = new Set<number>();
  private readonly bitten = new Set<number>();
  private elapsedMs = 0;
  private refundClaimed = false;

  constructor(
    private readonly stats: SpeechStats,
    hits: readonly SpeechHit[],
  ) {
    for (const h of hits) {
      if (h.stunMs > 0) this.stunned.set(h.targetId, h.stunMs);
      if (stats.branch === 'volte') this.pushed.add(h.targetId);
    }
  }

  isStunned(targetId: number): boolean {
    return (this.stunned.get(targetId) ?? 0) > 0;
  }

  update(dtMs: number): void {
    this.elapsedMs += dtMs;
    for (const [id, left] of this.stunned) {
      if (left - dtMs <= 0) this.stunned.delete(id);
      else this.stunned.set(id, left - dtMs);
    }
  }

  /**
   * FAL-07: Exploda em Cadeia. O atordoado por esta fala que morre explode: os vizinhos vivos a até 70 px ficam
   * atordoados 300 ms (chefe 75) e tomam 4% do HP máximo (chefe 1%). Eles passam a contar como atordoados, e a cadeia
   * segue quando um deles morrer.
   */
  onTargetDied(
    dead: { id: number; center: Vec2 },
    living: readonly SpeechTarget[],
  ): { center: Vec2; hits: SpeechEffectHit[] } | null {
    const wasStunned = this.isStunned(dead.id);
    this.stunned.delete(dead.id);
    if (!wasStunned || !this.stats.awakened || this.stats.branch !== 'exploda') return null;
    const { radiusPx, stunMs } = CURSED_SPEECH.explodaEmCadeia;
    const hits = living
      .filter((t) => t.id !== dead.id)
      .filter((t) => Math.hypot(t.center.x - dead.center.x, t.center.y - dead.center.y) <= radiusPx)
      .map((t) => {
        const stun = t.kind === 'boss' ? Math.round(stunMs * CURSED_SPEECH.bossStunMul) : stunMs;
        this.stunned.set(t.id, Math.max(this.stunned.get(t.id) ?? 0, stun));
        return { targetId: t.id, stunMs: stun, damage: this.bite(t), knockdown: false, band: 'micro' as const };
      });
    return { center: dead.center, hits };
  }

  /**
   * FAL-08: Esmague. O empurrado por esta fala que bate em parede ou em outro corpo dentro da janela toma 4% do HP
   * máximo (chefe 1%), uma vez, e os dois caem; o chefe nunca cai.
   */
  onPushedImpact(pushed: SpeechTarget, other: SpeechTarget | 'wall'): SpeechEffectHit[] | null {
    if (!this.stats.awakened || this.stats.branch !== 'volte') return null;
    if (!this.pushed.has(pushed.id) || this.elapsedMs > CURSED_SPEECH.esmague.windowMs) return null;
    this.pushed.delete(pushed.id);
    const hits: SpeechEffectHit[] = [
      { targetId: pushed.id, stunMs: 0, damage: this.bite(pushed), knockdown: pushed.kind === 'enemy', band: 'micro' },
    ];
    if (other !== 'wall') {
      hits.push({ targetId: other.id, stunMs: 0, damage: 0, knockdown: other.kind === 'enemy', band: 'micro' });
    }
    return hits;
  }

  /**
   * TRL-06: o adaptador avisa que um acerto desta fala matou. O 1º abate da conjuração devolve 30% da recarga (com
   * Recarga no 3): devolve os ms a cortar da recarga, e 0 nos seguintes ou abaixo do teto.
   */
  claimKillRefund(): number {
    if (this.refundClaimed || this.stats.killRefundPct <= 0) return 0;
    this.refundClaimed = true;
    return Math.round(this.stats.cooldownMs * this.stats.killRefundPct);
  }

  private bite(t: SpeechTarget): number {
    if (this.bitten.has(t.id)) return 0;
    this.bitten.add(t.id);
    return maxHpBite(t.maxHp, t.kind, bitePctFor(t.kind));
  }
}
