import type { ItemAxis } from '../../core/axisBuild';
import { parseAxesParam, parseBranchParam } from '../../core/axisParam';
import { CAMERA_FEEL } from '../../data/feel';
import {
  BRANCH_NAMES,
  ITEM_BRANCHES,
  type AxisItem,
  type BranchId,
  type BodyAxisId,
  type RedAxisId,
} from '../../data/techAxes';
import { RUN } from '../../data/tuning';
import type { BodyBuildSnapshot, ChoicePage, RedBuildSnapshot } from '../../game/axisSnapshot';
import type { TestScene } from '../TestScene';
import { debugParam } from './params';

/**
 * Liga o `AxisBuild` do `Loadout` (os pontos do Vermelho e do Corpo, VRM-02, CRP-01) à loja, ao painel de ramo, ao
 * debug e ao banner do Despertar. Campo `axes` do `BuildDirector`; o estado mora no `loadout.axes`, zerado pelo
 * `loadout.reset()` da run nova.
 */
export class AxisDirector {
  constructor(readonly s: TestScene) {}

  private get build() {
    return this.s.loadout.axes;
  }

  private event(name: string): void {
    this.s.snapshot.debugEvents.push(name);
  }

  /**
   * Compra 1 ponto no eixo (loja, `axes=`): evento `axis:<item>.<eixo>`; o 1º Nv 2 da run emite
   * `branchPending:<item>` (VRM-11, CRP-08) e o ponto que liga o Despertar emite `awaken:<item>`. Devolve se gravou
   * (recusado no teto, VRM-02.3).
   */
  applyAxis<I extends AxisItem>(item: I, axis: ItemAxis<I>): boolean {
    const result = this.build.add(item, axis);
    if (!result.ok) return false;
    this.event(`axis:${item}.${axis}`);
    if (result.branchPending) this.event(`branchPending:${item}`);
    if (result.awakened) this.event(`awaken:${item}`);
    return true;
  }

  /**
   * `?debug&axes=<item>.<eixo>:<n>[,...]` e `ramo=<item>:<a|b>[,...]` (VRM-10, VRM-18, CRP-14), lidos depois do
   * `tech=`: cada entrada compra ponto a ponto até `n` ou até o teto (3 por eixo, 5 por item); o ramo vem depois, para
   * o Despertar seguir o nível dos eixos. O Vermelho só recebe ponto e ramo se estiver equipado.
   */
  applyDebug(): void {
    const redEquipped = this.s.loadout.levelOf('vermelho') > 0;
    for (const entry of parseAxesParam(debugParam('axes'))) {
      if (entry.item === 'vermelho' && !redEquipped) continue;
      for (let i = 0; i < entry.points; i++) if (!this.applyAxis(entry.item, entry.axis)) break;
    }
    for (const entry of parseBranchParam(debugParam('ramo'))) {
      if (entry.item === 'vermelho' && !redEquipped) continue;
      this.setBranch(entry.item, entry.branch);
    }
  }

  /** Páginas do painel de ramo, uma por item pendente, o Vermelho antes do Corpo (CRD-08). */
  choicePages(): ChoicePage[] {
    return this.build.pending.map((item) => {
      const [a, b] = ITEM_BRANCHES[item];
      return { item, options: [BRANCH_NAMES[a], BRANCH_NAMES[b]] };
    });
  }

  /** Confirma a opção do painel (`0` = `a`, `1` = `b`); com o item já no Nv 5 o Despertar liga aqui. */
  confirmBranch(item: AxisItem, option: 0 | 1): void {
    this.setBranch(item, ITEM_BRANCHES[item][option]);
  }

  /** Banner com o nome do Despertar e câmera lenta, só na 1ª vez da rodada (VRM-17, CRP-13). */
  announce(item: AxisItem, name: string): void {
    if (!this.build.announce(item)) return;
    this.s.hud.banner(name, RUN.bannerMs);
    this.s.effects.slowMo.trigger(CAMERA_FEEL.slowScale, CAMERA_FEEL.slowMs);
  }

  /** Começo de rodada: o Despertar volta a ser anunciado. */
  onRoundStart(): void {
    this.build.onRoundStart();
  }

  /** Campos `vermelho` (`null` sem ele equipado) e `corpo` do `build` do snapshot (VRM-10, CRP-14). */
  snapshot(): { vermelho: RedBuildSnapshot | null; corpo: BodyBuildSnapshot } {
    return { vermelho: this.redSnapshot(), corpo: this.bodySnapshot() };
  }

  /** Grava o ramo (recusado no Nv 1 e no 2º ramo): evento `branch:<item>:<ramo>` e, no Nv 5, `awaken:<item>`. */
  private setBranch(item: AxisItem, branch: BranchId): void {
    const wasAwake = this.build.awakened(item);
    if (!this.build.setBranch(item, branch)) return;
    this.event(`branch:${item}:${branch}`);
    if (!wasAwake && this.build.awakened(item)) this.event(`awaken:${item}`);
  }

  private redSnapshot(): RedBuildSnapshot | null {
    const { loadout } = this.s;
    if (loadout.levelOf('vermelho') === 0) return null;
    const stats = loadout.stats('vermelho');
    return {
      level: this.build.level('vermelho'),
      axes: this.build.axesOf('vermelho') as Record<RedAxisId, number>,
      branch: this.build.branch('vermelho'),
      awakened: this.build.awakened('vermelho'),
      stats: {
        cost: stats.cost,
        cooldownMs: stats.cooldownMs,
        signMs: stats.signMs,
        chargeMs: stats.chargeMs,
        radius: stats.red?.radius ?? 0,
        touch: stats.damage.hit,
        detonation: stats.damage.detonation,
      },
    };
  }

  private bodySnapshot(): BodyBuildSnapshot {
    return {
      level: this.build.level('corpo'),
      axes: this.build.axesOf('corpo') as Record<BodyAxisId, number>,
      branch: this.build.branch('corpo'),
      awakened: this.build.awakened('corpo'),
      fury: { stacks: 0, bonus: 0 },
      cadence: 0,
      aura: 0,
    };
  }
}
