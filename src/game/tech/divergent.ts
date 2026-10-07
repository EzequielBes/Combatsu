import type { ActiveCastView } from '../../core/cast';
import { DivergentState } from '../../core/divergent';
import type { CursedEnergy } from '../../core/energy';
import type { FxRegistry } from '../../core/fxRegistry';
import type { FxTimeline } from '../../core/fxTimeline';
import type { Hit, Vec2 } from '../../core/hit';
import { Kokusen } from '../../core/kokusen';
import { KOKUSEN, TECHNIQUES } from '../../data/techniques';
import { PLAYER_COMBO } from '../../data/tuning';
import { HD_ON } from '../art/hd/flag';
import { hdAnchors } from '../art/hd/sheet';
import type { Hittable } from '../bodyTags';
import { Boss } from '../Boss';
import { AttackHitbox } from '../hitbox';
import { DivergentFx } from '../techFx/DivergentFx';
import { SIZE } from '../textures';
import { techMarks, type CastRef, type TechContext } from './shared';

/** DIV-02: mesmo tamanho e offset da hitbox do `direto` (o cross do combo de socos). */
const CROSS_HITBOX = PLAYER_COMBO.find((s) => s.name === 'direto')!.hitbox!;
/**
 * Impulso (px por step do Matter) dos impactos do Divergente: a mesma escala do combo comum (leve ~ `jab`/`direto`,
 * forte ~ `chute`), já que a spec não fixa um número - só o dano (DIV-03/04). KOK-07 dobra o valor `second` para
 * a versão Kokusen (`KOKUSEN.knockbackMul`).
 */
export const DIVERGENT_FORCE = { first: 3, second: 9 } as const;

/**
 * Punho Divergente: hitbox do soco (DIV-02), 1 alvo (DIV-11), 1º impacto e o 2º atrasado no mesmo alvo
 * (DIV-03/04/12), com o eco/anel/aura/estouro/punho fantasma da direção de arte (DIV-07..10); e o Kokusen (T23)
 * quando a tecla do slot que conjurou o Divergente é apertada na janela certa (KOK-01..13, 28, 32).
 */
export class DivergentTech {
  private readonly hitbox: AttackHitbox;
  private readonly fx: DivergentFx;
  /** Zona/streak do Kokusen persistem entre casts (KOK-10/11/30/31); um só por toda a run. */
  private readonly kokusen = new Kokusen();
  private state: DivergentState | null = null;
  private target: Hittable | null = null;
  /** Slot que conjurou o Divergente em curso - é o único cuja tecla conta para o Kokusen (KOK-03). */
  private slot: 0 | 1 | null = null;
  /** `true` assim que uma tentativa deste cast acerta a janela (KOK-03); decide o 2º impacto na resolução. */
  private pendingKokusen = false;
  /** `true` depois que a hitbox do 1º impacto já abriu neste cast (DIV-11); nunca reabre, mesmo com `release` restante. */
  private hitboxOpened = false;
  private cast: CastRef | null = null;

  constructor(
    private readonly ctx: TechContext,
    private readonly energy: CursedEnergy,
    fx: FxTimeline,
    registry: FxRegistry,
    /** KOK-13: hitstop de 220 ms do Kokusen (FX-02 já garante que o maior pendente vence). */
    private readonly triggerHitstop: (ms: number) => void,
    /** T24: cinema do Kokusen (negativo/duotom/raios/faíscas/zoom/cartão), chamado uma vez por acerto. */
    private readonly onKokusen: (target: Hittable, point: Vec2, facing: 1 | -1, streak: number) => void,
  ) {
    const { player } = ctx;
    this.hitbox = new AttackHitbox(ctx.scene, player.id, player.team, (hit, point, target) =>
      this.onFirstImpact(hit, point, target!),
    );
    this.fx = new DivergentFx(ctx.scene, fx, registry);
  }

  /** Janela/zona do Kokusen (contrato `kokusen` do snapshot, TFX-07). */
  get kokusenSnapshot(): { zone: boolean; zoneMs: number; streak: number; windowOpen: boolean } {
    const t = this.state?.sinceImpactMs ?? 0;
    return {
      zone: this.kokusen.zone,
      zoneMs: this.kokusen.zoneMs,
      streak: this.kokusen.streak,
      windowOpen: this.target !== null && this.kokusen.windowOpen(t),
    };
  }

  update(
    dtMs: number,
    cast: ActiveCastView | null,
    castEvents: readonly string[],
    slotPressed: readonly [boolean, boolean],
  ): void {
    this.kokusen.tick(dtMs); // KOK-11/31: a zona esfria com o relógio de jogo, mesmo sem nenhum cast em curso.
    // CAST-17: `techCast:divergente` só entra em `events` na entrada de `release` - início de um cast novo (DIV-11
    // vale por cast; um cast anterior já resolvido não deve vazar alvo para este).
    if (castEvents.includes('techCast:divergente')) this.beginCast(cast!.slot);
    const phase = cast?.id === 'divergente' ? cast.state : null;
    this.updateFist(dtMs, phase);
    this.updateHitbox(phase === 'release');
    this.updateWaiting(dtMs, slotPressed);
  }

  private beginCast(slot: 0 | 1): void {
    this.state = new DivergentState();
    this.cast = this.ctx.currentCast();
    this.target = null;
    this.slot = slot;
    this.pendingKokusen = false;
    this.hitboxOpened = false;
    this.kokusen.startAttempt();
    this.fx.hideWaiting();
  }

  /** Chama no punho: aura no preparo (DIV-10), rastro no soco, e some fora do Divergente. */
  private updateFist(dtMs: number, phase: ActiveCastView['state'] | null): void {
    const { player } = this.ctx;
    // `?hd=1`: a chama fica no punho que vai bater (o de perto do quadro HD), não no ponto fixo à frente do corpo.
    const hand = HD_ON ? hdAnchors(player.frameName)?.near : undefined;
    const at = hand ? { x: hand.x, y: hand.y + SIZE.player.h / 2 } : undefined;
    const { x, y } = player.sprite;
    if (phase === 'sign' || phase === 'charge') {
      // DIV-10: chama no punho durante o preparo.
      this.fx.fistAura(dtMs, x, y, player.facing, at);
    } else if (phase === 'release') {
      // No soco a chama segue no punho e fica para trás dele, em rastro.
      this.fx.fistFlame(dtMs, x, y, player.facing, at);
    } else {
      this.fx.hideFistAura(dtMs);
    }
  }

  private updateHitbox(releasing: boolean): void {
    const { player } = this.ctx;
    if (releasing) {
      // DIV-02/11: abre uma única vez por conjuração - reabrir depois do 1º impacto (onFirstImpact fecha a
      // hitbox) criava um gate novo que podia acertar o mesmo alvo (ou um vizinho) de novo no frame seguinte.
      if (!this.hitboxOpened) {
        this.openHitbox();
        this.hitboxOpened = true;
      }
      if (this.hitbox.isOpen) this.hitbox.follow(player.sprite.x, player.sprite.y, player.facing);
    } else if (this.hitbox.isOpen) {
      // DIV-05: fora de `release` (ou cast cancelado) a hitbox fecha - sem toque, sem 2º impacto.
      this.hitbox.close();
    }
  }

  /** Espera entre o 1º e o 2º impacto: anel no alvo, tentativa de Kokusen e a resolução no fim do atraso. */
  private updateWaiting(dtMs: number, slotPressed: readonly [boolean, boolean]): void {
    if (!this.state) return;
    // DIV-06: o alvo do 1º impacto morreu antes do 2º - cancela o 2º impacto (checado a cada frame da espera).
    if (this.target?.isDead?.()) this.state.targetDied();
    if (this.target) {
      // DIV-07/08/12: o anel e o eco seguem o alvo no seu centro ATUAL, mesmo em ragdoll.
      const rect = this.target.hurtRect?.();
      if (rect) this.fx.waiting(dtMs, rect.x, rect.y, this.state.ringRadius());
      this.pollKokusen(this.state.sinceImpactMs, slotPressed);
    }
    const resolvedId = this.state.update(dtMs);
    if (resolvedId === null || !this.target) return;
    if (this.pendingKokusen) this.resolveKokusen(this.target);
    else this.resolveSecondImpact(this.target);
  }

  /** KOK-03/04/05: só a tecla do slot que conjurou este Divergente conta, e só depois do 1º impacto. */
  private pollKokusen(sinceImpactMs: number, slotPressed: readonly [boolean, boolean]): void {
    if (this.slot === null || !slotPressed[this.slot]) return;
    const result = this.kokusen.press(sinceImpactMs);
    if (result === 'hit') this.pendingKokusen = true;
    else if (result === 'miss') this.ctx.emit('kokusenMiss'); // KOK-04
  }

  private openHitbox(): void {
    const { player, loadout } = this.ctx;
    const hit: Hit = {
      ownerId: player.id,
      damage: loadout.damage('divergente', TECHNIQUES.divergente.damage.first), // DIV-03, TEC-06
      strength: 'light',
      force: DIVERGENT_FORCE.first,
      direction: { x: player.facing, y: -0.15 },
      ...techMarks('light'),
    };
    this.hitbox.open(CROSS_HITBOX, hit, player.sprite.x, player.sprite.y, player.facing);
  }

  /** DIV-03/11: primeiro alvo tocado - registra e fecha a hitbox (ignora qualquer outro pelo resto do cast). */
  private onFirstImpact(hit: Hit, point: Vec2, target: Hittable): void {
    if (!this.state || this.state.targetId !== null) return;
    this.hitbox.close(); // DIV-11
    this.state.firstImpact(target.id);
    this.target = target;
    this.kokusen.armFirstImpact(); // KOK-05: só a partir do 1º impacto a tecla do slot conta para o Kokusen.
    this.ctx.onTechHit(hit, point);
    this.ctx.masteryHit(this.cast, target);
  }

  /** Centro ATUAL do alvo (DIV-12); sem área de acerto, cai no player. */
  private impactPoint(target: Hittable): Vec2 {
    const rect = target.hurtRect?.();
    const { sprite } = this.ctx.player;
    return rect ? { x: rect.x, y: rect.y } : { x: sprite.x, y: sprite.y };
  }

  /** DIV-04/09/12: 200 ms depois do 1º impacto, sem Kokusen (T23 decide quando isso não vale). */
  private resolveSecondImpact(target: Hittable): void {
    const { player, loadout } = this.ctx;
    this.fx.hideWaiting();
    const point = this.impactPoint(target);
    const hit: Hit = {
      ownerId: player.id,
      damage: loadout.damage('divergente', TECHNIQUES.divergente.damage.second), // DIV-04, TEC-06
      strength: 'heavy',
      force: DIVERGENT_FORCE.second,
      direction: { x: player.facing, y: -0.3 },
      ...techMarks('heavy'),
    };
    if (target.receiveHit(hit)) {
      this.ctx.onTechHit(hit, point);
      this.ctx.masteryHit(this.cast, target);
    }
    // DIV-12: desenhado no centro ATUAL do alvo (`point`, lido agora, não no ponto do 1º impacto).
    this.fx.burst(point.x, point.y, player.facing);
    this.ctx.emit('divergent2');
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
    const { player } = this.ctx;
    this.fx.hideWaiting();
    const point = this.impactPoint(target);
    const hit: Hit = {
      ownerId: player.id,
      damage: KOKUSEN.damage, // KOK-06: 45 fixos (18 × 2.5), não escalados pelo nível (TEC-06 não se aplica aqui)
      strength: 'heavy',
      // KOK-07: 2× o impulso do 2º impacto comum; o chefe não é empurrado (a postura dele é que sofre, KOK-08).
      force: target instanceof Boss ? 0 : DIVERGENT_FORCE.second * KOKUSEN.knockbackMul,
      direction: { x: player.facing, y: -0.3 },
      ...techMarks('heavy'),
    };
    // KOK-08: no chefe, postura própria (3× o dano), não a fórmula 2× de um golpe forte comum.
    if (target instanceof Boss) target.receiveKokusen(KOKUSEN.damage, KOKUSEN.damage * KOKUSEN.poiseMul);
    if (target instanceof Boss || target.receiveHit(hit)) {
      this.ctx.onTechHit(hit, point);
      this.ctx.masteryHit(this.cast, target);
    }
    this.kokusen.land(this.energy); // KOK-09/10/30
    this.triggerHitstop(KOKUSEN.hitstopMs); // KOK-13
    this.ctx.emit('kokusen'); // KOK-28
    this.onKokusen(target, point, player.facing, this.kokusen.streak); // T24: cinema
    this.endCast();
  }

  /** Fim do cast do Divergente em curso (com ou sem Kokusen): pronto para o próximo. */
  private endCast(): void {
    this.target = null;
    this.state = null;
    this.slot = null;
    this.cast = null;
    this.pendingKokusen = false;
  }
}
