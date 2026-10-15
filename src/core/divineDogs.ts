import { axisAt, boxCenter, killRefundPct, resolveBuild, type BodyKind, type Box, type TechBuild } from './axisRule';
import type { Vec2 } from './hit';
import { BiteLedger, KillRefund, nearestTarget, segmentEntry } from './techKit';
import { DIVINE_DOGS, type DogsAxisId, type DogsBranchId } from '../data/divineDogs';

export type DogsBuild = TechBuild<DogsAxisId, DogsBranchId>;

/** Números resolvidos de uma build dos Cães Divinos (CAO-01, CAO-02). */
export interface DogsStats {
  level: number;
  branch: DogsBranchId | null;
  awakened: boolean;
  dogs: number;
  dashPxS: number;
  rangePx: number;
  bites: number;
  biteDamage: number;
  rootMs: number;
  bossRootMs: number;
  cost: number;
  cooldownMs: number;
  /** TRL-06: fração da recarga devolvida pelo 1º abate da conjuração (0,3 com Recarga no 3, senão 0). */
  killRefundPct: number;
  lifeMs: number;
  signMs: number;
  recoverMs: number;
}

/** CAO-01, CAO-02: resolve a build nos números da técnica. */
export function dogsStats(build: DogsBuild): DogsStats {
  const { level, branch, awakened } = resolveBuild(build);
  const a = build.axes;
  const rootMs = axisAt(DIVINE_DOGS.axes.prisao, a.prisao);
  const capped = (points: number): boolean => points >= 3;
  return {
    level,
    branch,
    awakened,
    dogs: axisAt(DIVINE_DOGS.axes.caes, a.caes),
    dashPxS: DIVINE_DOGS.speedPxS * (capped(a.caes) ? DIVINE_DOGS.capDashMul : 1),
    rangePx: axisAt(DIVINE_DOGS.axes.alcance, a.alcance),
    bites: axisAt(DIVINE_DOGS.axes.mordidas, a.mordidas),
    biteDamage: capped(a.mordidas) ? DIVINE_DOGS.capBiteDamage : DIVINE_DOGS.biteDamage,
    rootMs,
    bossRootMs: Math.round(rootMs * DIVINE_DOGS.bossRootMul),
    cost: axisAt(DIVINE_DOGS.axes.eficiencia, a.eficiencia),
    cooldownMs: axisAt(DIVINE_DOGS.axes.recarga, a.recarga),
    killRefundPct: killRefundPct(a.recarga),
    lifeMs: DIVINE_DOGS.lifeMs,
    signMs: DIVINE_DOGS.signMs,
    recoverMs: DIVINE_DOGS.recoverMs,
  };
}

/** Alvo vivo visto pelos cães: quem sai da lista morreu. */
export interface DogTarget {
  id: number;
  kind: BodyKind;
  box: Box;
  maxHp: number;
}

/** Mordida (de cão ou do lobo): faixa micro. `bite` é o componente proporcional dos Despertares. */
export interface DogBite {
  type: 'bite';
  dogId: number;
  targetId: number;
  damage: number;
  rootMs: number;
  bite: number;
  band: 'micro';
}

export type DogEvent =
  | DogBite
  | { type: 'leap'; dogId: number; targetId: number; from: Vec2; to: Vec2 }
  | { type: 'gone'; dogId: number; at: Vec2 };

/** Cão (ou lobo) para o adaptador desenhar. */
export interface DogView {
  id: number;
  x: number;
  y: number;
  dir: 1 | -1;
  state: 'run' | 'latched';
}

interface Dog {
  id: number;
  x: number;
  y: number;
  dir: 1 | -1;
  traveled: number;
  state: 'run' | 'latched' | 'gone';
  targetId: number | null;
  bitesLeft: number;
  timerMs: number;
  /** Alvos que este cão já mordeu (Matilha Faminta, saltos do lobo). */
  bitten: Set<number>;
  rooted: boolean;
}

/** CAO-07: alturas das faixas de um grupo de `n` cães, espalhadas em volta de `y`. */
function laneYs(n: number, y: number): number[] {
  const spread = DIVINE_DOGS.laneSpreadPx;
  if (n <= 0) return [];
  if (n === 1) return [y];
  return Array.from({ length: n }, (_, i) => y - spread / 2 + (i * spread) / (n - 1));
}

/**
 * Os cães de uma conjuração (plano, seção 5.1): saem dos pés do player, correm rentes ao chão, mordem o 1º alvo da
 * faixa e somem. Pura: o adaptador desenha, aplica as mordidas e avisa os abates em `claimKillRefund`.
 */
export class DogPack {
  private readonly dogs: Dog[] = [];
  private readonly wolf: boolean;
  private readonly ledger = new BiteLedger();
  private readonly refund: KillRefund;
  private elapsedMs = 0;

  /** `feet`: ponto do player no chão (centro x, y do chão). */
  constructor(
    readonly stats: DogsStats,
    feet: Vec2,
    facing: 1 | -1,
  ) {
    this.refund = new KillRefund(stats.cooldownMs, stats.killRefundPct);
    this.wolf = stats.branch === 'totalidade';
    const laneY = feet.y - DIVINE_DOGS.laneLiftPx;
    const forward = this.wolf ? 1 : stats.branch === 'matilha' ? Math.ceil(stats.dogs / 2) : stats.dogs;
    const backward = this.wolf ? 0 : stats.dogs - forward;
    const spawn = (y: number, dir: 1 | -1): void => {
      this.dogs.push({
        id: this.dogs.length + 1,
        x: feet.x,
        y,
        dir,
        traveled: 0,
        state: 'run',
        targetId: null,
        bitesLeft: 0,
        timerMs: 0,
        bitten: new Set(),
        rooted: false,
      });
    };
    for (const y of laneYs(forward, laneY)) spawn(y, facing);
    for (const y of laneYs(backward, laneY)) spawn(y, facing === 1 ? -1 : 1);
  }

  /** Os cães ainda na tela (cópia), para a vista. */
  get view(): DogView[] {
    return this.dogs
      .filter((d) => d.state !== 'gone')
      .map((d) => ({ id: d.id, x: d.x, y: d.y, dir: d.dir, state: d.state as 'run' | 'latched' }));
  }

  /** Todos sumiram: o adaptador pode descartar a matilha. */
  get done(): boolean {
    return this.dogs.every((d) => d.state === 'gone');
  }

  /** CAO-03 a CAO-09: avança investida, mordidas, saltos e o tempo de vida. */
  update(dtMs: number, targets: readonly DogTarget[]): DogEvent[] {
    this.elapsedMs += dtMs;
    const events: DogEvent[] = [];
    for (const dog of this.dogs) {
      if (dog.state === 'run') this.run(dog, dtMs, targets, events);
      else if (dog.state === 'latched') this.latched(dog, dtMs, targets, events);
    }
    if (this.elapsedMs >= this.stats.lifeMs) {
      for (const dog of this.dogs) if (dog.state !== 'gone') this.vanish(dog, events);
    }
    return events;
  }

  /** CAO-10 (TRL-06): o adaptador avisa que uma mordida desta conjuração matou; devolve os ms a cortar da recarga. */
  claimKillRefund(): number {
    return this.refund.claim();
  }

  /** CAO-03, CAO-04: corre pela faixa e trava no 1º alvo; no fim do alcance, some. */
  private run(dog: Dog, dtMs: number, targets: readonly DogTarget[], events: DogEvent[]): void {
    const step = Math.min((this.stats.dashPxS * dtMs) / 1000, this.stats.rangePx - dog.traveled);
    let first: DogTarget | null = null;
    let firstAt = Infinity;
    for (const t of targets) {
      const d = segmentEntry(dog, dog.dir, step, t.box);
      if (d === null) continue;
      if (d < firstAt || (d === firstAt && first !== null && t.id < first.id)) {
        first = t;
        firstAt = d;
      }
    }
    if (first === null) {
      dog.x += dog.dir * step;
      dog.traveled += step;
      if (dog.traveled >= this.stats.rangePx) this.vanish(dog, events);
      return;
    }
    dog.x += dog.dir * firstAt;
    dog.traveled += firstAt;
    this.latch(dog, first, events);
  }

  /** Trava no alvo e morde na hora. */
  private latch(dog: Dog, target: DogTarget, events: DogEvent[]): void {
    dog.state = 'latched';
    dog.targetId = target.id;
    dog.bitesLeft = this.wolf ? 1 : this.stats.bites;
    this.bite(dog, target, events);
  }

  /** CAO-03, CAO-06, CAO-09: as mordidas seguintes, o salto do lobo e o pulo da Matilha Faminta. */
  private latched(dog: Dog, dtMs: number, targets: readonly DogTarget[], events: DogEvent[]): void {
    const target = targets.find((t) => t.id === dog.targetId) ?? null;
    dog.timerMs -= dtMs;
    if (target !== null && dog.bitesLeft > 0) {
      if (dog.timerMs <= 0) this.bite(dog, target, events);
      return;
    }
    // Quem pode pular espera o intervalo antes de ir; quem não pode some na hora.
    if (this.jumpRadius(dog) > 0 && dog.timerMs > 0) return;
    this.next(dog, target, targets, events);
  }

  /** Acabou o alvo (mordidas no fim ou morto): o lobo salta, o cão faminto pula, os outros somem. */
  private next(dog: Dog, current: DogTarget | null, targets: readonly DogTarget[], events: DogEvent[]): void {
    const from = current !== null ? boxCenter(current.box) : { x: dog.x, y: dog.y };
    const jump = this.jumpRadius(dog);
    const pick = jump > 0 ? nearestTarget(from, jump, targets, (id) => dog.bitten.has(id)) : null;
    if (pick === null) {
      this.vanish(dog, events);
      return;
    }
    const to = boxCenter(pick.box);
    events.push({ type: 'leap', dogId: dog.id, targetId: pick.id, from, to });
    dog.x = to.x;
    this.latch(dog, pick, events);
  }

  /** Raio do próximo pulo: o lobo até o teto de alvos; o cão só na Matilha Faminta; 0 = some. */
  private jumpRadius(dog: Dog): number {
    const { awakened, branch } = this.stats;
    if (this.wolf) {
      const max = awakened ? DIVINE_DOGS.totalidadeNegra.targets : DIVINE_DOGS.totalidade.targets;
      return dog.bitten.size < max ? DIVINE_DOGS.totalidade.leapRadiusPx : 0;
    }
    return awakened && branch === 'matilha' ? DIVINE_DOGS.matilhaFaminta.jumpRadiusPx : 0;
  }

  /** CAO-05, CAO-06, CAO-08, CAO-09: uma mordida; a 1ª de cada cão prende. */
  private bite(dog: Dog, target: DogTarget, events: DogEvent[]): void {
    const { stats } = this;
    const root = dog.rooted ? 0 : target.kind === 'boss' ? stats.bossRootMs : stats.rootMs;
    dog.rooted = true;
    dog.bitten.add(target.id);
    dog.bitesLeft -= 1;
    dog.timerMs = this.wolf ? DIVINE_DOGS.totalidade.leapMs : DIVINE_DOGS.biteIntervalMs;
    events.push({
      type: 'bite',
      dogId: dog.id,
      targetId: target.id,
      damage: this.wolf ? stats.biteDamage * stats.dogs : stats.biteDamage,
      rootMs: root,
      bite: stats.awakened ? this.ledger.bite(target) : 0,
      band: 'micro',
    });
  }

  private vanish(dog: Dog, events: DogEvent[]): void {
    dog.state = 'gone';
    events.push({ type: 'gone', dogId: dog.id, at: { x: dog.x, y: dog.y } });
  }
}

/** Conjura os cães: devolve o custo e a matilha. A técnica não recusa: sem alvo, os cães correm e somem. */
export function summonDogs(stats: DogsStats, feet: Vec2, facing: 1 | -1): { cost: number; pack: DogPack } {
  return { cost: stats.cost, pack: new DogPack(stats, feet, facing) };
}
