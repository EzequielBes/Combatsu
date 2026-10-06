import { Filters, type CollisionFilter } from './collision';
import { TargetGate, type Hit, type TargetOutcome, type Vec2 } from './hit';

/** Criar um objeto novo = preencher um PropDef, sem código novo. */
export interface PropDef {
  key: string;
  texture: string; // chave em TEX
  mass: number; // peso
  damage: number;
  durability: number; // nº de impactos até quebrar (inteiro ≥ 1)
  throwSpeed: number; // px/s
  knockback: number; // impulso em px por step do Matter
  socket: 'front' | 'back'; // onde fica na mão: à frente ou nas costas/ombro
  tags: readonly string[]; // reservado para técnicas futuras ("cortante", "inflamável")
}

export type PropState = 'rest' | 'held' | 'swing' | 'thrown' | 'breaking' | 'gone';
export type PropImpact = 'ignored' | 'continue' | 'toRest' | 'broke';

export const PROP_BREAK_MS = 400;

/** Alvos que um balanço com o objeto na mão alcança (TGT-07); o arremesso não tem teto (PST-07). */
export const PROP_SWING_TARGETS = 2;

const FILTER_BY_STATE: Record<PropState, CollisionFilter> = {
  rest: Filters.propRest,
  held: Filters.propHeld,
  swing: Filters.propSwing,
  thrown: Filters.propThrown,
  breaking: Filters.propBreaking,
  gone: Filters.propBreaking,
};

export function validatePropDef(def: PropDef): void {
  if (!Number.isInteger(def.durability) || def.durability < 1) {
    throw new Error(`${def.key}: durability precisa ser inteiro >= 1`);
  }
  if (def.mass <= 0) throw new Error(`${def.key}: mass precisa ser > 0`);
  if (def.throwSpeed <= 0) throw new Error(`${def.key}: throwSpeed precisa ser > 0`);
  if (def.damage < 0) throw new Error(`${def.key}: damage não pode ser negativo`);
}

/**
 * Bater ou arremessar objeto é sempre golpe forte. O arremesso derruba quem sobrevive (`knockdown`, PST-07); o
 * balanço só faz cambalear (PST-08).
 */
export function propHit(def: PropDef, ownerId: number, direction: Vec2, state: PropState = 'swing'): Hit {
  const hit: Hit = { ownerId, damage: def.damage, strength: 'heavy', direction, force: def.knockback };
  return state === 'thrown' ? { ...hit, knockdown: true } : hit;
}

/**
 * Repouso → Segurando → (Golpe | Arremessado) → Repouso ou Quebrando → Sumiu.
 * O filtro de colisão de cada estado garante que o objeto nunca trava
 * fisicamente um personagem.
 */
export class PropMachine {
  private _state: PropState = 'rest';
  private _impacts = 0;
  private _holderId: number | null = null;
  private _ownerId: number | null = null;
  private gate: TargetGate | null = null;
  private breakTimer = 0;

  constructor(readonly def: PropDef) {
    validatePropDef(def);
  }

  get state(): PropState {
    return this._state;
  }

  get impacts(): number {
    return this._impacts;
  }

  get holderId(): number | null {
    return this._holderId;
  }

  get ownerId(): number | null {
    return this._ownerId;
  }

  get filter(): CollisionFilter {
    return FILTER_BY_STATE[this._state];
  }

  pickUp(holderId: number): boolean {
    if (this._state !== 'rest') return false;
    this._state = 'held';
    this._holderId = holderId;
    return true;
  }

  drop(): boolean {
    if (this._state !== 'held') return false;
    this.toRest();
    return true;
  }

  startSwing(): boolean {
    if (this._state !== 'held' || this._holderId === null) return false;
    this._state = 'swing';
    this.arm(this._holderId, PROP_SWING_TARGETS);
    return true;
  }

  endSwing(): boolean {
    if (this._state !== 'swing') return false;
    this._state = 'held';
    this.disarm();
    return true;
  }

  throw(): boolean {
    if (this._state !== 'held' || this._holderId === null) return false;
    const owner = this._holderId;
    this._state = 'thrown';
    this._holderId = null;
    this.arm(owner, Infinity);
    return true;
  }

  /** Quem segurava morreu ou sumiu. */
  holderGone(): boolean {
    if (this._state !== 'held' && this._state !== 'swing') return false;
    this.toRest();
    return true;
  }

  /**
   * O golpe ou arremesso em curso ainda quer este alvo? Só consulta: `false` para o dono, para alvo já tentado e,
   * no balanço, sem vaga (TGT-07). Quem bate depois conta o desfecho em `note`.
   */
  wants(targetId: number): boolean {
    return this.gate !== null && this.gate.wants(targetId);
  }

  /** Anota o desfecho do golpe no alvo: aceito e segurado pela guarda gastam vaga, recusado não (TGT-05, TGT-06). */
  note(targetId: number, outcome: TargetOutcome): void {
    this.gate?.note(targetId, outcome);
  }

  /** Atalho de `wants` + `note` como golpe aceito: `true` só na primeira vez de cada alvo, nunca para o dono. */
  tryHit(targetId: number): boolean {
    if (!this.wants(targetId)) return false;
    this.note(targetId, 'accepted');
    return true;
  }

  /** Um impacto (em personagem, parede, chão) durante golpe ou voo. */
  registerImpact(): PropImpact {
    if (this._state !== 'swing' && this._state !== 'thrown') return 'ignored';
    this._impacts += 1;
    if (this._impacts >= this.def.durability) {
      this._state = 'breaking';
      this._holderId = null;
      this.disarm();
      this.breakTimer = PROP_BREAK_MS;
      return 'broke';
    }
    if (this._state === 'thrown') {
      this.toRest();
      return 'toRest';
    }
    return 'continue';
  }

  /** true no frame em que o objeto termina de quebrar e deve ser removido. */
  update(dtMs: number): boolean {
    if (this._state !== 'breaking') return false;
    this.breakTimer -= dtMs;
    if (this.breakTimer > 0) return false;
    this._state = 'gone';
    return true;
  }

  private arm(ownerId: number, maxTargets: number): void {
    this._ownerId = ownerId;
    this.gate = new TargetGate(ownerId, maxTargets);
  }

  private disarm(): void {
    this._ownerId = null;
    this.gate = null;
  }

  private toRest(): void {
    this._state = 'rest';
    this._holderId = null;
    this.disarm();
  }
}

/** Saída do arremesso em relação ao centro do corpo de quem arremessa (px; x para a frente). */
export const THROW_RELEASE: Vec2 = { x: 12, y: -4 };

/**
 * Ponto de onde o objeto arremessado parte (THR-01): na altura do tronco de quem arremessa, à frente dele, e nunca
 * na mão. Com o corpo HD a mão fica acima da cabeça de um inimigo comum (a cadeira vai no ombro), e o objeto que
 * saía dali passava por cima do alvo; como player e inimigo têm corpos de mesma altura no mesmo chão, partir do
 * tronco mantém o arco do arremesso dentro da altura do inimigo.
 */
export function throwOrigin(holderX: number, holderY: number, facing: 1 | -1): Vec2 {
  return { x: holderX + THROW_RELEASE.x * facing, y: holderY + THROW_RELEASE.y };
}
