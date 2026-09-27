import type Phaser from 'phaser';
import type { ActiveCastView } from '../core/cast';
import type { CursedEnergy } from '../core/energy';
import { DivergentState } from '../core/divergent';
import type { FxRegistry } from '../core/fxRegistry';
import type { FxTimeline } from '../core/fxTimeline';
import type { Hit, Vec2 } from '../core/hit';
import { Kokusen } from '../core/kokusen';
import type { Loadout } from '../core/loadout';
import { KOKUSEN, TECHNIQUES } from '../data/techniques';
import { PLAYER_COMBO } from '../data/tuning';
import type { Hittable } from './bodyTags';
import { Boss } from './Boss';
import { AttackHitbox } from './hitbox';
import type { Player } from './Player';
import { DivergentFx } from './techFx/DivergentFx';

/** DIV-02: mesmo tamanho e offset da hitbox do `direto` (o cross do combo de socos). */
const CROSS_HITBOX = PLAYER_COMBO.find((s) => s.name === 'direto')!.hitbox!;
/**
 * Impulso (px por step do Matter) dos impactos do Divergente: a mesma escala do combo comum (leve ~ `jab`/`direto`,
 * forte ~ `chute`), já que a spec não fixa um número - só o dano (DIV-03/04). KOK-07 dobra o valor `second` para
 * a versão Kokusen (`KOKUSEN.knockbackMul`).
 */
export const DIVERGENT_FORCE = { first: 3, second: 9 } as const;

/**
 * Executa as técnicas a partir do que o `TechCaster` já decidiu (design "TechRunner.ts"): Punho Divergente -
 * hitbox do soco (DIV-02), 1 alvo (DIV-11), 1º impacto e o 2º atrasado no mesmo alvo (DIV-03/04/12), com o
 * eco/anel/aura/estouro/punho fantasma da direção de arte (DIV-07..10); e o Kokusen (T23) quando a tecla do slot
 * que conjurou o Divergente é apertada na janela certa (KOK-01..13, 28, 32).
 */
export class TechRunner {
  private readonly hitbox: AttackHitbox;
  private readonly divergentFx: DivergentFx;
  /** Zona/streak do Kokusen persistem entre casts (KOK-10/11/30/31); um só por toda a run. */
  private readonly kokusen = new Kokusen();
  private divergent: DivergentState | null = null;
  private divergentTarget: Hittable | null = null;
  /** Slot que conjurou o Divergente em curso - é o único cuja tecla conta para o Kokusen (KOK-03). */
  private divergentSlot: 0 | 1 | null = null;
  /** `true` assim que uma tentativa deste cast acerta a janela (KOK-03); decide o 2º impacto na resolução. */
  private pendingKokusen = false;
  private frameEvents: string[] = [];

  constructor(
    scene: Phaser.Scene,
    private readonly player: Player,
    private readonly loadout: Loadout,
    private readonly energy: CursedEnergy,
    fx: FxTimeline,
    registry: FxRegistry,
    /** Golpe de técnica que conectou: faísca + hitstop, sem o +3 de CE-06 (CE-08 - a cena decide isso). */
    private readonly onTechHit: (hit: Hit, point: Vec2) => void,
    /** KOK-13: hitstop de 220 ms do Kokusen (FX-02 já garante que o maior pendente vence). */
    private readonly triggerHitstop: (ms: number) => void,
    /** T24: cinema do Kokusen (negativo/duotom/raios/faíscas/zoom/cartão), chamado uma vez por acerto. */
    private readonly onKokusen: (target: Hittable, point: Vec2, facing: 1 | -1, streak: number) => void,
  ) {
    this.hitbox = new AttackHitbox(scene, player.id, player.team, (hit, point, target) => this.onFirstImpact(hit, point, target!));
    this.divergentFx = new DivergentFx(scene, fx, registry);
  }

  /** Eventos deste frame (`divergent2`, `kokusen`, `kokusenMiss`). */
  get events(): readonly string[] {
    return this.frameEvents;
  }

  /** Janela/zona do Kokusen (contrato `kokusen` do snapshot, TFX-07). */
  get kokusenSnapshot(): { zone: boolean; zoneMs: number; streak: number; windowOpen: boolean } {
    const t = this.divergent?.sinceImpactMs ?? 0;
    return {
      zone: this.kokusen.zone,
      zoneMs: this.kokusen.zoneMs,
      streak: this.kokusen.streak,
      windowOpen: this.divergentTarget !== null && this.kokusen.windowOpen(t),
    };
  }

  update(dtMs: number, cast: ActiveCastView | null, castEvents: readonly string[], slotPressed: readonly [boolean, boolean]): void {
    this.frameEvents = [];
    this.kokusen.tick(dtMs); // KOK-11/31: a zona esfria com o relógio de jogo, mesmo sem nenhum cast em curso.
    this.updateDivergent(dtMs, cast, castEvents, slotPressed);
  }

  private updateDivergent(
    dtMs: number,
    cast: ActiveCastView | null,
    castEvents: readonly string[],
    slotPressed: readonly [boolean, boolean],
  ): void {
    // CAST-17: `techCast:divergente` só entra em `events` na entrada de `release` - início de um cast novo (DIV-11
    // vale por cast; um cast anterior já resolvido não deve vazar alvo para este).
    if (castEvents.includes('techCast:divergente')) {
      this.divergent = new DivergentState();
      this.divergentTarget = null;
      this.divergentSlot = cast!.slot;
      this.pendingKokusen = false;
      this.kokusen.startAttempt();
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
      // KOK-03/04/05: só a tecla do slot que conjurou este Divergente conta, e só depois do 1º impacto.
      if (this.divergentSlot !== null && slotPressed[this.divergentSlot]) {
        const result = this.kokusen.press(this.divergent.sinceImpactMs);
        if (result === 'hit') this.pendingKokusen = true;
        else if (result === 'miss') this.frameEvents.push('kokusenMiss'); // KOK-04
      }
    }
    const resolvedId = this.divergent.update(dtMs);
    if (resolvedId === null || !this.divergentTarget) return;
    if (this.pendingKokusen) this.resolveKokusen(this.divergentTarget);
    else this.resolveSecondImpact(this.divergentTarget);
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
    this.kokusen.armFirstImpact(); // KOK-05: só a partir do 1º impacto a tecla do slot conta para o Kokusen.
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
    this.endCast();
  }

  /** KOK-06..13, 28, 32: o 2º impacto vira Kokusen - dano fixo, ragdoll/postura dobrados, energia, zona e hitstop. */
  private resolveKokusen(target: Hittable): void {
    // Edge case (BOSS-08, BAI-12): chefe em `roar`/intocável no momento da resolução - 0 dano e sem Kokusen, como
    // um 2º impacto comum (que já dá 0 dano por `receiveHit` recusar sozinho).
    if (target instanceof Boss && (target.state === 'roar' || target.state === 'intro')) {
      this.resolveSecondImpact(target);
      return;
    }
    this.divergentFx.hideWaiting();
    const rect = target.hurtRect?.();
    const point = rect ? { x: rect.x, y: rect.y } : { x: this.player.sprite.x, y: this.player.sprite.y };
    if (target instanceof Boss) {
      // KOK-08: postura própria (3× o dano), não a fórmula 2× de um golpe forte comum.
      target.receiveKokusen(KOKUSEN.damage, KOKUSEN.damage * KOKUSEN.poiseMul);
      this.onTechHit(
        { ownerId: this.player.id, damage: KOKUSEN.damage, strength: 'heavy', force: 0, direction: { x: this.player.facing, y: -0.3 } },
        point,
      );
    } else {
      const hit: Hit = {
        ownerId: this.player.id,
        damage: KOKUSEN.damage, // KOK-06: 45 fixos (18 × 2.5), não escalados pelo nível (TEC-06 não se aplica aqui)
        strength: 'heavy',
        force: DIVERGENT_FORCE.second * KOKUSEN.knockbackMul, // KOK-07: 2× o impulso do 2º impacto comum
        direction: { x: this.player.facing, y: -0.3 },
      };
      if (target.receiveHit(hit)) this.onTechHit(hit, point);
    }
    this.kokusen.land(this.energy); // KOK-09/10/30
    this.triggerHitstop(KOKUSEN.hitstopMs); // KOK-13
    this.frameEvents.push('kokusen'); // KOK-28
    this.onKokusen(target, point, this.player.facing, this.kokusen.streak); // T24: cinema
    this.endCast();
  }

  /** Fim do cast do Divergente em curso (com ou sem Kokusen): pronto para o próximo. */
  private endCast(): void {
    this.divergentTarget = null;
    this.divergent = null;
    this.divergentSlot = null;
    this.pendingKokusen = false;
  }
}
