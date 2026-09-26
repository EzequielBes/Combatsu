import type Phaser from 'phaser';
import type { ActiveCastView } from '../core/cast';
import { DivergentState } from '../core/divergent';
import type { FxRegistry } from '../core/fxRegistry';
import type { FxTimeline } from '../core/fxTimeline';
import type { Hit, Vec2 } from '../core/hit';
import type { Loadout } from '../core/loadout';
import { TECHNIQUES } from '../data/techniques';
import { PLAYER_COMBO } from '../data/tuning';
import type { Hittable } from './bodyTags';
import { AttackHitbox } from './hitbox';
import type { Player } from './Player';
import { DivergentFx } from './techFx/DivergentFx';

/** DIV-02: mesmo tamanho e offset da hitbox do `direto` (o cross do combo de socos). */
const CROSS_HITBOX = PLAYER_COMBO.find((s) => s.name === 'direto')!.hitbox!;
/**
 * Impulso (px por step do Matter) dos impactos do Divergente: a mesma escala do combo comum (leve ~ `jab`/`direto`,
 * forte ~ `chute`), já que a spec não fixa um número - só o dano (DIV-03/04). KOK-07 dobra o valor `second` para
 * a versão Kokusen (T23).
 */
export const DIVERGENT_FORCE = { first: 3, second: 9 } as const;

/**
 * Executa as técnicas a partir do que o `TechCaster` já decidiu (design "TechRunner.ts"). T22: só o Punho
 * Divergente - hitbox do soco (DIV-02), 1 alvo (DIV-11), 1º impacto e o 2º atrasado no mesmo alvo (DIV-03/04/12),
 * com o eco/anel/aura/estouro/punho fantasma da direção de arte (DIV-07..10). T23+ acrescenta o Kokusen por cima
 * do mesmo 2º impacto.
 */
export class TechRunner {
  private readonly hitbox: AttackHitbox;
  private readonly divergentFx: DivergentFx;
  private divergent: DivergentState | null = null;
  private divergentTarget: Hittable | null = null;
  private frameEvents: string[] = [];

  constructor(
    scene: Phaser.Scene,
    private readonly player: Player,
    private readonly loadout: Loadout,
    fx: FxTimeline,
    registry: FxRegistry,
    /** Golpe de técnica que conectou: faísca + hitstop, sem o +3 de CE-06 (CE-08 - a cena decide isso). */
    private readonly onTechHit: (hit: Hit, point: Vec2) => void,
  ) {
    this.hitbox = new AttackHitbox(scene, player.id, player.team, (hit, point, target) => this.onFirstImpact(hit, point, target!));
    this.divergentFx = new DivergentFx(scene, fx, registry);
  }

  /** Eventos deste frame (`divergent2`; T23 acrescenta `kokusen`/`kokusenMiss`). */
  get events(): readonly string[] {
    return this.frameEvents;
  }

  update(dtMs: number, cast: ActiveCastView | null, castEvents: readonly string[]): void {
    this.frameEvents = [];
    this.updateDivergent(dtMs, cast, castEvents);
  }

  private updateDivergent(dtMs: number, cast: ActiveCastView | null, castEvents: readonly string[]): void {
    // CAST-17: `techCast:divergente` só entra em `events` na entrada de `release` - início de um cast novo (DIV-11
    // vale por cast; um cast anterior já resolvido não deve vazar alvo para este).
    if (castEvents.includes('techCast:divergente')) {
      this.divergent = new DivergentState();
      this.divergentTarget = null;
      this.divergentFx.hideWaiting();
    }

    const isDivergent = cast?.id === 'divergente';
    if (isDivergent && (cast!.state === 'sign' || cast!.state === 'charge')) {
      // DIV-10: aura do punho durante o preparo.
      this.divergentFx.fistAura(dtMs, this.player.sprite.x, this.player.sprite.y, this.player.facing);
    } else {
      this.divergentFx.hideFistAura();
    }

    const releasing = isDivergent && cast!.state === 'release';
    if (releasing) {
      // DIV-02: hitbox aberta durante toda a `release`; abre uma vez só (o próprio `open` reseta o gate por alvo).
      if (!this.hitbox.isOpen) this.openHitbox();
      this.hitbox.follow(this.player.sprite.x, this.player.sprite.y, this.player.facing);
    } else if (this.hitbox.isOpen) {
      // DIV-05: fora de `release` (ou cast cancelado) a hitbox fecha - sem toque, sem 2º impacto.
      this.hitbox.close();
    }

    if (!this.divergent) return;
    // DIV-06: o alvo do 1º impacto morreu antes do 2º - cancela o 2º impacto (checado a cada frame da espera).
    if (this.divergentTarget?.isDead?.()) this.divergent.targetDied();
    if (this.divergentTarget) {
      // DIV-07/08/12: o anel e o eco seguem o alvo no seu centro ATUAL, mesmo em ragdoll.
      const rect = this.divergentTarget.hurtRect?.();
      if (rect) this.divergentFx.waiting(dtMs, rect.x, rect.y, this.divergent.ringRadius());
    }
    const resolvedId = this.divergent.update(dtMs);
    if (resolvedId !== null && this.divergentTarget) this.resolveSecondImpact(this.divergentTarget);
  }

  private openHitbox(): void {
    const hit: Hit = {
      ownerId: this.player.id,
      damage: this.loadout.damage('divergente', TECHNIQUES.divergente.damage.first), // DIV-03, TEC-06
      strength: 'light',
      force: DIVERGENT_FORCE.first,
      direction: { x: this.player.facing, y: -0.15 },
    };
    this.hitbox.open(CROSS_HITBOX, hit, this.player.sprite.x, this.player.sprite.y, this.player.facing);
  }

  /** DIV-03/11: primeiro alvo tocado - registra e fecha a hitbox (ignora qualquer outro pelo resto do cast). */
  private onFirstImpact(hit: Hit, point: Vec2, target: Hittable): void {
    if (!this.divergent || this.divergent.targetId !== null) return;
    this.hitbox.close(); // DIV-11
    this.divergent.firstImpact(target.id);
    this.divergentTarget = target;
    this.onTechHit(hit, point);
  }

  /** DIV-04/09/12: 200 ms depois do 1º impacto, sem Kokusen (T23 decide quando isso não vale). */
  private resolveSecondImpact(target: Hittable): void {
    this.divergentFx.hideWaiting();
    const rect = target.hurtRect?.();
    const point = rect ? { x: rect.x, y: rect.y } : { x: this.player.sprite.x, y: this.player.sprite.y };
    const hit: Hit = {
      ownerId: this.player.id,
      damage: this.loadout.damage('divergente', TECHNIQUES.divergente.damage.second), // DIV-04, TEC-06
      strength: 'heavy',
      force: DIVERGENT_FORCE.second,
      direction: { x: this.player.facing, y: -0.3 },
    };
    if (target.receiveHit(hit)) this.onTechHit(hit, point);
    // DIV-12: desenhado no centro ATUAL do alvo (`point`, lido agora, não no ponto do 1º impacto).
    this.divergentFx.burst(point.x, point.y, this.player.facing);
    this.frameEvents.push('divergent2');
    this.divergentTarget = null;
    this.divergent = null;
  }
}
