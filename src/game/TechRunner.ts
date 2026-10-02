import type Phaser from 'phaser';
import type { ActiveCastView } from '../core/cast';
import { Filters } from '../core/collision';
import type { CursedEnergy } from '../core/energy';
import { DivergentState } from '../core/divergent';
import type { FxRegistry } from '../core/fxRegistry';
import type { FxTimeline } from '../core/fxTimeline';
import { canDamage, normalize, type Hit, type Vec2 } from '../core/hit';
import { Kokusen } from '../core/kokusen';
import type { Loadout } from '../core/loadout';
import { RedOrbState, type RedOrbTarget } from '../core/redOrb';
import { BlueOrbState, blueOrbSpawn, type BlueOrbDamage, type BlueOrbTarget } from '../core/blueOrb';
import { CutSchedule, cutAngles, type CutHit, type CutTarget } from '../core/cut';
import { KOKUSEN, TECHNIQUES } from '../data/techniques';
import { PLAYER_COMBO } from '../data/tuning';
import { newEntityId, tagBody, type BodyTag, type Hittable, type Rect } from './bodyTags';
import { Boss } from './Boss';
import { AttackHitbox } from './hitbox';
import type { Player } from './Player';
import { bodyOf, PX_PER_S_TO_STEP, setIgnoreGravity } from './physics';
import { TEX } from './textures';
import { DivergentFx } from './techFx/DivergentFx';
import { RedOrbFx } from './techFx/RedOrb';
import { BlueOrbFx } from './techFx/BlueOrb';
import { CutFx } from './techFx/CutFx';

/** DIV-02: mesmo tamanho e offset da hitbox do `direto` (o cross do combo de socos). */
const CROSS_HITBOX = PLAYER_COMBO.find((s) => s.name === 'direto')!.hitbox!;
/**
 * Impulso (px por step do Matter) dos impactos do Divergente: a mesma escala do combo comum (leve ~ `jab`/`direto`,
 * forte ~ `chute`), já que a spec não fixa um número - só o dano (DIV-03/04). KOK-07 dobra o valor `second` para
 * a versão Kokusen (`KOKUSEN.knockbackMul`).
 */
export const DIVERGENT_FORCE = { first: 3, second: 9 } as const;
/**
 * Alvo dos varredores de área do Vermelho/Azul/Desmantelar (RED-10, BLU-04/06/07, CUT-03): posição e área de
 * acerto, além do `Hittable` comum. A `Enemy` real satisfaz isto estruturalmente; o `TrainingDummy` do
 * laboratório de efeitos (T28, `src/game/FxLab.ts`) também, sem o `TechRunner` precisar conhecer nenhum dos dois.
 */
export interface TechTarget extends Hittable {
  readonly x: number;
  hurtRect(): Rect;
  /** BLU-04/05: puxão do orbe Azul (px/step, já convertido); `null` limpa (fora do raio ou orbe sumiu). */
  setPull(velocity: Vec2 | null): void;
}

/** Raio do sensor de voo do orbe Vermelho (px de mundo); pequeno, o orbe visual é que dá o tamanho percebido. */
const RED_ORB_RADIUS = 6;
/** RED-06/09/10: força (px/step) dos impactos do Vermelho - mesma escala do 2º impacto do Divergente. */
const RED_FORCE = 8;
/** RED-15: recuo do player na soltura, no chão, oposto ao facing. */
const RED_PUSH_PX = 12;
/** BLU-02: alcance da consulta de parede à frente do player (folga acima dos 110 px do orbe). */
const BLUE_WALL_QUERY_PX = 130;

/** Conjuração que originou um golpe: `id` cresce a cada conjuração iniciada, `slot` é o do loadout (MST-01, MST-02). */
interface CastRef {
  readonly id: number;
  readonly slot: 0 | 1;
}

interface RedOrbEntry {
  readonly cast: CastRef | null;
  readonly id: number;
  readonly state: RedOrbState;
  readonly body: MatterJS.BodyType;
  readonly view: Phaser.GameObjects.Sprite;
}

interface BlueOrbEntry {
  readonly cast: CastRef | null;
  readonly id: number;
  readonly state: BlueOrbState;
}

/**
 * Executa as técnicas a partir do que o `TechCaster` já decidiu (design "TechRunner.ts"): Punho Divergente -
 * hitbox do soco (DIV-02), 1 alvo (DIV-11), 1º impacto e o 2º atrasado no mesmo alvo (DIV-03/04/12), com o
 * eco/anel/aura/estouro/punho fantasma da direção de arte (DIV-07..10); o Kokusen (T23) quando a tecla do slot
 * que conjurou o Divergente é apertada na janela certa (KOK-01..13, 28, 32); e a Reversão de Técnica: Vermelho
 * (T25), dona do seu estado puro (`RedOrbState`) e das vistas próprias em `techFx/RedOrb.ts`. Dono de
 * `techObjects` (o contrato do snapshot para o orbe vivo).
 */
export class TechRunner {
  private readonly hitbox: AttackHitbox;
  private readonly divergentFx: DivergentFx;
  private readonly redFx: RedOrbFx;
  private readonly blueFx: BlueOrbFx;
  private readonly cutFx: CutFx;
  /** Zona/streak do Kokusen persistem entre casts (KOK-10/11/30/31); um só por toda a run. */
  private readonly kokusen = new Kokusen();
  private divergent: DivergentState | null = null;
  private divergentTarget: Hittable | null = null;
  /** Slot que conjurou o Divergente em curso - é o único cuja tecla conta para o Kokusen (KOK-03). */
  private divergentSlot: 0 | 1 | null = null;
  /** `true` assim que uma tentativa deste cast acerta a janela (KOK-03); decide o 2º impacto na resolução. */
  private pendingKokusen = false;
  /** `true` depois que a hitbox do 1º impacto já abriu neste cast (DIV-11); nunca reabre, mesmo com `release` restante. */
  private hitboxOpened = false;
  private redOrb: RedOrbEntry | null = null;
  private blueOrb: BlueOrbEntry | null = null;
  private cutSchedule: CutSchedule | null = null;
  private frameEvents: string[] = [];
  /** Contador de conjurações iniciadas (MST-02): cada `techCast:<id>` ganha um `castId` novo. */
  private castSeq = 0;
  /** Conjuração mais recente; as técnicas que vivem além do cast (orbes, cortes) guardam a própria cópia. */
  private currentCast: CastRef | null = null;
  private divergentCast: CastRef | null = null;
  private cutCast: CastRef | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    private readonly loadout: Loadout,
    private readonly energy: CursedEnergy,
    fx: FxTimeline,
    registry: FxRegistry,
    uiLayer: Phaser.GameObjects.Layer,
    /** BAT-06/terreno: mesma lista do `Player`, para achar a distância até a parede à frente (BLU-02). */
    private readonly terrain: MatterJS.BodyType[],
    /** Golpe de técnica que conectou: faísca + hitstop, sem o +3 de CE-06 (CE-08 - a cena decide isso). */
    private readonly onTechHit: (hit: Hit, point: Vec2) => void,
    /** KOK-13: hitstop de 220 ms do Kokusen (FX-02 já garante que o maior pendente vence). */
    private readonly triggerHitstop: (ms: number) => void,
    /** T24: cinema do Kokusen (negativo/duotom/raios/faíscas/zoom/cartão), chamado uma vez por acerto. */
    private readonly onKokusen: (target: Hittable, point: Vec2, facing: 1 | -1, streak: number) => void,
    /** MST-01/02: o alvo aceitou um golpe da técnica do `slot` na conjuração `castId` (a cena aplica a maestria). */
    private readonly onMasteryHit: (slot: 0 | 1, castId: number, targetId: number, isBoss: boolean) => void,
  ) {
    this.hitbox = new AttackHitbox(scene, player.id, player.team, (hit, point, target) => this.onFirstImpact(hit, point, target!));
    this.divergentFx = new DivergentFx(scene, fx, registry);
    this.redFx = new RedOrbFx(scene, fx, registry, uiLayer);
    this.blueFx = new BlueOrbFx(scene, fx, registry);
    this.cutFx = new CutFx(scene, fx, registry);
  }

  /** Eventos deste frame (`divergent2`, `kokusen`, `kokusenMiss`, `redDetonate`). */
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

  /** `techObjects` do snapshot (RED-14, BLU-10): os orbes vivos agora. */
  get techObjectsSnapshot(): { id: number; kind: 'red' | 'blue'; x: number; y: number; traveled: number }[] {
    const out: { id: number; kind: 'red' | 'blue'; x: number; y: number; traveled: number }[] = [];
    if (this.redOrb) out.push({ id: this.redOrb.id, kind: 'red', x: this.redOrb.state.x, y: this.redOrb.body.position.y, traveled: this.redOrb.state.traveled });
    if (this.blueOrb) out.push({ id: this.blueOrb.id, kind: 'blue', x: this.blueOrb.state.position.x, y: this.blueOrb.state.position.y, traveled: 0 });
    return out;
  }

  update(
    dtMs: number,
    cast: ActiveCastView | null,
    castEvents: readonly string[],
    slotPressed: readonly [boolean, boolean],
    enemies: readonly TechTarget[],
    boss: Boss | null,
  ): void {
    this.frameEvents = [];
    if (castEvents.some((ev) => ev.startsWith('techCast:'))) {
      this.currentCast = cast ? { id: ++this.castSeq, slot: cast.slot } : null;
    }
    this.kokusen.tick(dtMs); // KOK-11/31: a zona esfria com o relógio de jogo, mesmo sem nenhum cast em curso.
    this.updateDivergent(dtMs, cast, castEvents, slotPressed);
    this.updateRed(dtMs, cast, castEvents, enemies);
    this.updateBlue(dtMs, castEvents, enemies, boss);
    this.updateCut(dtMs, castEvents, enemies, boss);
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
      this.divergentCast = this.currentCast;
      this.divergentTarget = null;
      this.divergentSlot = cast!.slot;
      this.pendingKokusen = false;
      this.hitboxOpened = false;
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
      // DIV-02/11: abre uma única vez por conjuração - reabrir depois do 1º impacto (onFirstImpact fecha a
      // hitbox) criava um gate novo que podia acertar o mesmo alvo (ou um vizinho) de novo no frame seguinte.
      if (!this.hitboxOpened) {
        this.openHitbox();
        this.hitboxOpened = true;
      }
      if (this.hitbox.isOpen) this.hitbox.follow(this.player.sprite.x, this.player.sprite.y, this.player.facing);
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
    this.masteryHit(this.divergentCast, target);
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
    if (target.receiveHit(hit)) {
      this.onTechHit(hit, point);
      this.masteryHit(this.divergentCast, target);
    }
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
      this.masteryHit(this.divergentCast, target);
    } else {
      const hit: Hit = {
        ownerId: this.player.id,
        damage: KOKUSEN.damage, // KOK-06: 45 fixos (18 × 2.5), não escalados pelo nível (TEC-06 não se aplica aqui)
        strength: 'heavy',
        force: DIVERGENT_FORCE.second * KOKUSEN.knockbackMul, // KOK-07: 2× o impulso do 2º impacto comum
        direction: { x: this.player.facing, y: -0.3 },
      };
      if (target.receiveHit(hit)) {
        this.onTechHit(hit, point);
        this.masteryHit(this.divergentCast, target);
      }
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
    this.divergentCast = null;
    this.pendingKokusen = false;
  }

  /** MST-01/02: avisa a cena que `target` aceitou um golpe da conjuração `cast`; sem conjuração conhecida, ignora. */
  private masteryHit(cast: CastRef | null, target: Hittable): void {
    if (cast) this.onMasteryHit(cast.slot, cast.id, target.id, target instanceof Boss);
  }

  // --- Vermelho (T25) --------------------------------------------------------------------------------------

  private updateRed(dtMs: number, cast: ActiveCastView | null, castEvents: readonly string[], enemies: readonly TechTarget[]): void {
    const charging = cast?.id === 'vermelho' && (cast.state === 'sign' || cast.state === 'charge');
    if (charging) {
      // RED-02/03/04: orbe crescendo + faíscas + anel + poeira, na ponta dos dedos.
      this.redFx.chargeUpdate(dtMs, this.player.sprite.x, this.player.sprite.y, this.player.facing, cast!.elapsedMs, TECHNIQUES.vermelho.chargeMs);
    } else {
      this.redFx.hideCharge();
    }

    if (castEvents.includes('techCast:vermelho')) {
      // RED-15: recuo no chão, oposto ao facing (fora do chão a soltura não empurra).
      if (this.player.grounded) this.player.pushHorizontal(this.player.facing === 1 ? -1 : 1, RED_PUSH_PX);
      this.spawnRedOrb(this.player.facing);
    }

    const orb = this.redOrb;
    if (!orb) return;
    if (!orb.state.detonated) {
      const expired = orb.state.update(dtMs); // RED-08: alcance máximo (420 px)
      if (!expired) {
        this.scene.matter.body.setPosition(orb.body, { x: orb.state.x, y: orb.body.position.y });
        orb.view.setPosition(orb.state.x, orb.body.position.y);
        this.redFx.flightUpdate(dtMs, orb.state.x, orb.body.position.y);
      }
    }
    if (orb.state.detonated) this.finishRedDetonation(orb, enemies);
  }

  private spawnRedOrb(facing: 1 | -1): void {
    if (this.redOrb) {
      this.scene.matter.world.remove(this.redOrb.body);
      this.redOrb.view.destroy();
      this.redOrb = null;
    }
    const point = this.redFx.fingertip(this.player.sprite.x, this.player.sprite.y, facing);
    const state = new RedOrbState(point.x, facing);
    const body = this.scene.matter.add.circle(point.x, point.y, RED_ORB_RADIUS, {
      isSensor: true,
      collisionFilter: { ...Filters.techOrb },
    });
    setIgnoreGravity(body, true);
    const view = this.scene.add.sprite(point.x, point.y, TEX.techOrbRed12, 'orb').setDepth(2);
    const entry: RedOrbEntry = { cast: this.currentCast, id: newEntityId(), state, body, view };
    tagBody(body, { kind: 'active', onTouch: (other) => this.onRedTouch(entry, other) });
    this.redOrb = entry;
  }

  /** RED-06/08/09: toque em parede/chefe detona; toque em inimigo comum acerta e o orbe segue voando (piercing). */
  private onRedTouch(orb: RedOrbEntry, other: BodyTag): void {
    if (orb !== this.redOrb || orb.state.detonated) return;
    if (other.kind === 'terrain') {
      orb.state.detonate(); // RED-08
      return;
    }
    if (other.kind !== 'character') return;
    const target = other.target;
    if (!canDamage('player', target.team)) return;
    const rect = target.hurtRect?.();
    const center = rect ? { x: rect.x, y: rect.y } : { x: orb.state.x, y: orb.body.position.y };
    const direction = normalize({ x: center.x - orb.state.x, y: center.y - orb.body.position.y });
    if (target instanceof Boss) {
      const hit: Hit = {
        ownerId: this.player.id,
        damage: this.loadout.damage('vermelho', TECHNIQUES.vermelho.damage.hit), // RED-09, TEC-06
        strength: 'heavy',
        force: RED_FORCE,
        direction,
      };
      if (target.receiveHit(hit)) {
        this.onTechHit(hit, center);
        this.masteryHit(orb.cast, target);
      }
      orb.state.detonate(); // RED-08: toque no chefe também detona
      return;
    }
    const result = orb.state.hitTest({ id: target.id, center }, orb.body.position.y);
    if (!result) return; // já atingido por este orbe antes (edge case: não acerta de novo)
    const hit: Hit = {
      ownerId: this.player.id,
      damage: this.loadout.damage('vermelho', result.damage), // RED-06, TEC-06
      strength: 'heavy',
      force: RED_FORCE,
      direction: result.direction,
    };
    if (target.receiveHit(hit)) {
      this.onTechHit(hit, center);
      this.masteryHit(orb.cast, target);
    }
  }

  private finishRedDetonation(orb: RedOrbEntry, enemies: readonly TechTarget[]): void {
    const point = { x: orb.state.x, y: orb.body.position.y };
    const targets: RedOrbTarget[] = enemies.map((e) => ({ id: e.id, center: { x: e.x, y: e.hurtRect().y } }));
    for (const splash of orb.state.detonationTargets(targets, point)) {
      const enemy = enemies.find((e) => e.id === splash.targetId);
      if (!enemy) continue;
      const hit: Hit = {
        ownerId: this.player.id,
        damage: this.loadout.damage('vermelho', splash.damage), // RED-10, TEC-06
        strength: 'heavy',
        force: RED_FORCE,
        direction: splash.direction,
      };
      if (enemy.receiveHit(hit)) {
        this.onTechHit(hit, { x: enemy.x, y: enemy.hurtRect().y });
        this.masteryHit(orb.cast, enemy);
      }
    }
    this.redFx.detonate(point, this.player.facing); // RED-11/12/17
    this.frameEvents.push('redDetonate'); // RED-16
    this.scene.matter.world.remove(orb.body);
    orb.view.destroy();
    if (this.redOrb === orb) this.redOrb = null;
  }

  // --- Azul (T26) -------------------------------------------------------------------------------------------

  private updateBlue(dtMs: number, castEvents: readonly string[], enemies: readonly TechTarget[], boss: Boss | null): void {
    if (castEvents.includes('techCast:azul')) this.spawnBlueOrb(this.player.facing);

    const orb = this.blueOrb;
    if (!orb) return;
    const point = orb.state.position;
    this.blueFx.update(dtMs, point.x, point.y); // BLU-08/09

    const enemyTargets: BlueOrbTarget[] = enemies.map((e) => ({ id: e.id, center: { x: e.x, y: e.hurtRect().y }, kind: 'enemy' }));
    const allTargets: BlueOrbTarget[] = boss
      ? [...enemyTargets, { id: boss.id, center: { x: boss.x, y: boss.hurtRect().y }, kind: 'boss' }] // BLU-05: chefe nunca puxado, só listado para o tick/implosão.
      : enemyTargets;

    // BLU-04/05: puxão reaplicado a cada frame (L-001), só em inimigo comum, dentro do raio.
    const pulls = orb.state.pullTargets(enemyTargets);
    for (const e of enemies) {
      const pull = pulls.find((p) => p.targetId === e.id);
      e.setPull(pull ? { x: pull.velocity.x * PX_PER_S_TO_STEP, y: pull.velocity.y * PX_PER_S_TO_STEP } : null);
    }

    const { ticksCrossed, ended } = orb.state.update(dtMs);
    for (let i = 0; i < ticksCrossed; i++) {
      for (const dmg of orb.state.tickTargets(allTargets)) this.applyBlueDamage(dmg, enemies, boss, orb.cast); // BLU-06
    }
    if (ended) {
      for (const dmg of orb.state.implosionTargets(allTargets)) this.applyBlueDamage(dmg, enemies, boss, orb.cast); // BLU-07
      this.blueFx.implode(point.x, point.y); // BLU-11
      this.frameEvents.push('blueImplode'); // BLU-11
      for (const e of enemies) e.setPull(null);
      this.blueOrb = null;
    }
  }

  private spawnBlueOrb(facing: 1 | -1): void {
    if (this.blueOrb) {
      this.blueFx.hide();
      this.blueOrb = null;
    }
    const center = { x: this.player.sprite.x, y: this.player.sprite.y };
    const point = blueOrbSpawn(center, facing, this.wallDistanceAhead(facing)); // BLU-02
    this.blueOrb = { cast: this.currentCast, id: newEntityId(), state: new BlueOrbState(point) };
  }

  /** BLU-02: distância (px) até a primeira parede à frente do player, `Infinity` se nenhuma dentro da consulta. */
  private wallDistanceAhead(facing: 1 | -1): number {
    const { x, y } = bodyOf(this.player.sprite).position;
    const halfH = this.player.sprite.displayHeight / 2;
    const region =
      facing === 1
        ? { min: { x, y: y - halfH }, max: { x: x + BLUE_WALL_QUERY_PX, y: y + halfH } }
        : { min: { x: x - BLUE_WALL_QUERY_PX, y: y - halfH }, max: { x, y: y + halfH } };
    const hits = this.scene.matter.query.region(this.terrain, region);
    let closest = Infinity;
    for (const body of hits) {
      const edge = facing === 1 ? body.bounds.min.x : body.bounds.max.x;
      const dist = facing === 1 ? edge - x : x - edge;
      // Desvio (fix(fx) do lote de polimento): o chão (uma faixa larga por linha, parseLevel) sempre entra no
      // resultado da `query.region` porque os pés do player tocam o topo dele - a borda esquerda dessa faixa fica
      // muito atrás do player (`edge` bem menor que `x`), o que dava `dist` bem negativo. Como o laço só guardava
      // o menor `dist` (sem checar o sinal), esse negativo sempre vencia qualquer parede real e o `Math.max(0, …)`
      // final zerava tudo - o orbe Azul nascia sempre colado no player (BLU-02 quebrado sempre, não só perto de
      // parede). Só um corpo cuja borda relevante está à frente do player (`dist >= 0`) conta como parede real.
      if (dist >= 0 && dist < closest) closest = dist;
    }
    return Math.max(0, closest);
  }

  private applyBlueDamage(dmg: BlueOrbDamage, enemies: readonly TechTarget[], boss: Boss | null, cast: CastRef | null): void {
    const hit: Hit = {
      ownerId: this.player.id,
      damage: this.loadout.damage('azul', dmg.damage), // BLU-06/07, TEC-06
      strength: 'light',
      force: 0,
      direction: { x: 0, y: -1 },
    };
    const enemy = enemies.find((e) => e.id === dmg.targetId);
    if (enemy) {
      if (enemy.receiveHit(hit)) {
        this.onTechHit(hit, { x: enemy.x, y: enemy.hurtRect().y });
        this.masteryHit(cast, enemy);
      }
      return;
    }
    if (boss && boss.id === dmg.targetId && boss.receiveHit(hit)) {
      this.onTechHit(hit, { x: boss.x, y: boss.hurtRect().y });
      this.masteryHit(cast, boss);
    }
  }

  // --- Desmantelar (T27) ------------------------------------------------------------------------------------

  private updateCut(dtMs: number, castEvents: readonly string[], enemies: readonly TechTarget[], boss: Boss | null): void {
    if (castEvents.includes('techCast:corte')) {
      this.cutSchedule = new CutSchedule();
      this.cutCast = this.currentCast;
    }
    if (!this.cutSchedule) return;
    const due = this.cutSchedule.update(dtMs);
    if (due.length === 0) return;

    const facing = this.player.facing;
    const angles = cutAngles(facing); // CUT-05
    const center = { x: this.player.sprite.x, y: this.player.sprite.y };
    const targets: CutTarget[] = [
      ...enemies.map((e) => ({ id: e.id, body: cornerRect(e.hurtRect()) })),
      ...(boss ? [{ id: boss.id, body: cornerRect(boss.hurtRect()) }] : []),
    ];
    for (const i of due) {
      this.cutFx.cut(center.x, center.y, facing, angles[i]); // CUT-04
      this.frameEvents.push('cut'); // CUT-08: um evento por corte
      for (const hit of this.cutSchedule.targetsHit(center, facing, targets)) this.applyCutHit(hit, enemies, boss);
    }
    if (due.includes(2)) this.cutSchedule = null; // agenda encerrada após o 3º corte
  }

  private applyCutHit(hit: CutHit, enemies: readonly TechTarget[], boss: Boss | null): void {
    const dealt: Hit = {
      ownerId: this.player.id,
      damage: this.loadout.damage('corte', hit.damage), // CUT-03, TEC-06
      strength: 'light',
      force: 0,
      direction: { x: 0, y: -1 },
    };
    const enemy = enemies.find((e) => e.id === hit.targetId);
    if (enemy) {
      if (enemy.receiveHit(dealt)) {
        this.onTechHit(dealt, { x: enemy.x, y: enemy.hurtRect().y });
        this.masteryHit(this.cutCast, enemy);
        this.cutFx.split(enemy.x, enemy.hurtRect().y); // CUT-06
      }
      return;
    }
    if (boss && boss.id === hit.targetId && boss.receiveHit(dealt)) {
      this.onTechHit(dealt, { x: boss.x, y: boss.hurtRect().y });
      this.masteryHit(this.cutCast, boss);
      this.cutFx.split(boss.x, boss.hurtRect().y); // CUT-06
    }
  }
}

/** `hurtRect()` devolve posição do CENTRO do corpo (convenção do jogo); o `CutSchedule` puro espera cantos. */
function cornerRect(r: Rect): Rect {
  return { x: r.x - r.width / 2, y: r.y - r.height / 2, width: r.width, height: r.height };
}
