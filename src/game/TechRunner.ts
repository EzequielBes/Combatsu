import type Phaser from 'phaser';
import type { ActiveCastView } from '../core/cast';
import type { CursedEnergy } from '../core/energy';
import type { FxRegistry } from '../core/fxRegistry';
import type { FxTimeline } from '../core/fxTimeline';
import type { Hit, Vec2 } from '../core/hit';
import type { Loadout } from '../core/loadout';
import type { Hittable } from './bodyTags';
import { Boss } from './Boss';
import type { Player } from './Player';
import { BlueTech } from './tech/blue';
import { CutTech } from './tech/cut';
import { DivergentTech } from './tech/divergent';
import { RedTech } from './tech/red';
import type { CastRef, TechContext, TechTarget } from './tech/shared';
import type { RedOrbFx } from './techFx/RedOrb';

export { DIVERGENT_FORCE } from './tech/divergent';
export type { TechTarget } from './tech/shared';

/**
 * Executa as técnicas a partir do que o `TechCaster` já decidiu (design "TechRunner.ts"). Cada técnica mora no seu
 * arquivo em `tech/` (Punho Divergente + Kokusen, Vermelho, Azul, Desmantelar); aqui fica só o que é comum: a
 * conjuração em curso (MST-02), os eventos do frame e o contrato do snapshot (`techObjects`, `kokusen`, `fx.red`).
 */
export class TechRunner {
  private readonly divergent: DivergentTech;
  private readonly red: RedTech;
  private readonly blue: BlueTech;
  private readonly cut: CutTech;
  private frameEvents: string[] = [];
  /** Contador de conjurações iniciadas (MST-02): cada `techCast:<id>` ganha um `castId` novo. */
  private castSeq = 0;
  /** Conjuração mais recente; as técnicas que vivem além do cast (orbes, cortes) guardam a própria cópia. */
  private currentCast: CastRef | null = null;

  constructor(
    scene: Phaser.Scene,
    player: Player,
    loadout: Loadout,
    energy: CursedEnergy,
    fx: FxTimeline,
    registry: FxRegistry,
    uiLayer: Phaser.GameObjects.Layer,
    /** BAT-06/terreno: mesma lista do `Player`, para achar a distância até a parede à frente (BLU-02). */
    terrain: MatterJS.BodyType[],
    /** Golpe de técnica que conectou: faísca + hitstop, sem o +3 de CE-06 (CE-08 - a cena decide isso). */
    onTechHit: (hit: Hit, point: Vec2) => void,
    /** KOK-13: hitstop de 220 ms do Kokusen (FX-02 já garante que o maior pendente vence). */
    triggerHitstop: (ms: number) => void,
    /** T24: cinema do Kokusen (negativo/duotom/raios/faíscas/zoom/cartão), chamado uma vez por acerto. */
    onKokusen: (target: Hittable, point: Vec2, facing: 1 | -1, streak: number) => void,
    /** MST-01/02: o alvo aceitou um golpe da técnica do `slot` na conjuração `castId` (a cena aplica a maestria). */
    onMasteryHit: (slot: 0 | 1, castId: number, targetId: number, isBoss: boolean) => void,
  ) {
    const ctx: TechContext = {
      scene,
      player,
      loadout,
      currentCast: () => this.currentCast,
      onTechHit,
      masteryHit: (cast, target) => {
        if (cast) onMasteryHit(cast.slot, cast.id, target.id, target instanceof Boss);
      },
      emit: (event) => this.frameEvents.push(event),
    };
    this.divergent = new DivergentTech(ctx, energy, fx, registry, triggerHitstop, onKokusen);
    this.red = new RedTech(ctx, fx, registry, uiLayer);
    this.blue = new BlueTech(ctx, fx, registry, terrain);
    this.cut = new CutTech(ctx, fx, registry);
  }

  /** Eventos deste frame (`divergent2`, `kokusen`, `kokusenMiss`, `redDetonate`). */
  get events(): readonly string[] {
    return this.frameEvents;
  }

  /** Janela/zona do Kokusen (contrato `kokusen` do snapshot, TFX-07). */
  get kokusenSnapshot(): DivergentTech['kokusenSnapshot'] {
    return this.divergent.kokusenSnapshot;
  }

  /** `fx.red` do snapshot (RDA-04/05/06/13): estado vivo das vistas do Vermelho. */
  get redDebugState(): ReturnType<RedOrbFx['debugState']> {
    return this.red.debugState;
  }

  /** `techObjects` do snapshot (RED-14, BLU-10): os orbes vivos agora. */
  get techObjectsSnapshot(): { id: number; kind: 'red' | 'blue'; x: number; y: number; traveled: number }[] {
    return [this.red.snapshot, this.blue.snapshot].filter((orb) => orb !== null);
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
    this.divergent.update(dtMs, cast, castEvents, slotPressed);
    this.red.update(dtMs, cast, castEvents, enemies);
    this.blue.update(dtMs, castEvents, enemies, boss);
    this.cut.update(dtMs, castEvents, enemies, boss);
  }
}
