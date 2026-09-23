import { Filters, type CollisionFilter } from './collision';
import { makeHitGate, type Hit, type Vec2 } from './hit';

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
  debrisColor: number;
  tags: readonly string[]; // reservado para técnicas futuras ("cortante", "inflamável")
}

export type PropState = 'rest' | 'held' | 'swing' | 'thrown' | 'breaking' | 'gone';
export type PropImpact = 'ignored' | 'continue' | 'toRest' | 'broke';

export const PROP_BREAK_MS = 400;

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

/** Bater ou arremessar objeto é sempre golpe forte. */
export function propHit(def: PropDef, ownerId: number, direction: Vec2): Hit {
  return { ownerId, damage: def.damage, strength: 'heavy', direction, force: def.knockback };
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
  private gate: ((targetId: number) => boolean) | null = null;
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
    this.arm(this._holderId);
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
    this.arm(owner);
    return true;
  }

  /** Quem segurava morreu ou sumiu. */
  holderGone(): boolean {
    if (this._state !== 'held' && this._state !== 'swing') return false;
    this.toRest();
    return true;
  }

  /** Consome o gate: true só na primeira vez para cada alvo neste golpe/arremesso, nunca para o dono. */
  tryHit(targetId: number): boolean {
    return this.gate !== null && this.gate(targetId);
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

  private arm(ownerId: number): void {
    this._ownerId = ownerId;
    this.gate = makeHitGate(ownerId);
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
