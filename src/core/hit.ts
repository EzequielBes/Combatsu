export type Strength = 'light' | 'heavy';

/** Lado de quem ataca ou é atacado. */
export type Team = 'player' | 'enemy';

export interface Vec2 {
  x: number;
  y: number;
}

/** Altura do golpe: `high` se evita abaixando (DEF-11), `low` se evita pulando (DEF-17). */
export type HitHeight = 'high' | 'low';

/** Um golpe de uma sequência de inimigo; `index` conta a partir de 1 (DFL-15). */
export interface HitString {
  id: number;
  index: number;
  length: number;
}

/** Um golpe, agnóstico da origem (soco, objeto, e no futuro técnica). */
export interface Hit {
  ownerId: number;
  damage: number;
  strength: Strength;
  direction: Vec2;
  /** Impulso em px por step do Matter (1/60 s). */
  force: number;
  /** A guarda do alvo não reduz o dano (GRD-04, carregado e shockwave do chefe). */
  unblockable?: boolean;
  /** Nome do golpe do jogador que originou o hit (combo, eventos). */
  moveName?: string;
  /** Ausente = corpo inteiro: não dá para abaixar nem pular (HGT-12). */
  height?: HitHeight;
  /** Derruba o inimigo comum que sobrevive (AD-021, PST-05). */
  knockdown?: boolean;
  /** Golpe de técnica: fica fora do limite do chão (GND-04). */
  tech?: boolean;
  /** Contra: cambaleia até o inimigo comprometido (CMT-09, CNT-21). */
  counter?: boolean;
  /** Golpe de uma sequência de inimigo (DFL-10, DFL-15). */
  string?: HitString;
}

/** O alvo conta a quem bateu que segurou o golpe com a guarda (TGT-06). */
export interface HitReport {
  blocked?: boolean;
}

export function normalize(v: Vec2): Vec2 {
  const len = Math.hypot(v.x, v.y);
  return len === 0 ? { x: 0, y: -1 } : { x: v.x / len, y: v.y / len };
}

/**
 * Regra de time (AI-05): só se acerta quem é do outro time. Golpe de inimigo nunca atinge inimigo, e a máscara
 * da hitbox (que inclui ENEMY) sozinha não impede isso.
 */
export function canDamage(attacker: Team, target: Team): boolean {
  return attacker !== target;
}

/**
 * Um gate por ataque: ignora o dono e deixa cada alvo ser acertado uma vez só,
 * mesmo que o sensor encoste em várias partes dele (ex.: ragdoll).
 */
export function makeHitGate(ownerId: number): (targetId: number) => boolean {
  const alreadyHit = new Set<number>();
  return (targetId) => {
    if (targetId === ownerId || alreadyHit.has(targetId)) return false;
    alreadyHit.add(targetId);
    return true;
  };
}

export type TargetOutcome = 'accepted' | 'blocked' | 'refused';

/**
 * Portão de alvos de um golpe com teto (TGT-03): ignora o dono, tenta cada alvo uma vez só e para quando as vagas
 * acabam. Golpe aceito ou segurado pela guarda gasta vaga; golpe recusado (morto, levantando, limite do chão) não
 * gasta (TGT-05, TGT-06). Quem decide a ordem dos alvos é `orderTargets`.
 */
export class TargetGate {
  private readonly tried = new Set<number>();
  private spent = 0;

  constructor(
    private readonly ownerId: number,
    private readonly maxTargets: number,
  ) {}

  get slotsLeft(): number {
    return this.maxTargets - this.spent;
  }

  wants(targetId: number): boolean {
    return targetId !== this.ownerId && !this.tried.has(targetId) && this.slotsLeft > 0;
  }

  note(targetId: number, outcome: TargetOutcome): void {
    this.tried.add(targetId);
    if (outcome !== 'refused') this.spent += 1;
  }
}

/** TGT-04: ordena por distância horizontal ao dono e, no empate, por id. Devolve uma cópia. */
export function orderTargets<T extends { id: number; dist: number }>(candidates: readonly T[]): T[] {
  return [...candidates].sort((a, b) => a.dist - b.dist || a.id - b.id);
}
