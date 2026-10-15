import { ITEM_AXES, ITEM_BRANCHES, type AxisId, type AxisItem, type BranchId } from '../data/techAxes';
import { TECH_RULE } from '../data/techRule';
import { resolveBuild } from './axisRule';

export type { AxisId, AxisItem, BranchId };

/** Eixos de um item (o Vermelho não aceita eixo do Corpo e vice-versa). */
export type ItemAxis<I extends AxisItem> = (typeof ITEM_AXES)[I][number];
/** Ramos de um item. */
export type ItemBranch<I extends AxisItem> = (typeof ITEM_BRANCHES)[I][number];

/**
 * Resultado da compra de um ponto. Recusado não muda nada (VRM-02.3). `branchPending` diz que este ponto pôs o item na
 * fila do ramo (1º Nv 2 da run); `awakened` diz que este ponto ligou o Despertar.
 */
export type AddResult = { ok: false } | { ok: true; branchPending: boolean; awakened: boolean };

/** Ordem da fila de ramos pendentes: o Vermelho antes do Corpo (CRD-08). */
const ITEM_ORDER: readonly AxisItem[] = ['vermelho', 'corpo'];

function zeroAxes(item: AxisItem): Record<string, number> {
  return Object.fromEntries(ITEM_AXES[item].map((axis) => [axis, 0]));
}

/**
 * Estado puro dos itens com eixo da F30, o Vermelho e o Corpo Amaldiçoado (VRM-02, VRM-11, VRM-17, CRP-01, CRP-08,
 * CRP-13): pontos por eixo, ramo, fila de ramos pendentes e anúncio do Despertar por rodada. É o guardião da compra que
 * a leva 1 deixou para a F30: valida pelo `canAdd` antes de gravar, porque o `axisLevel` lança `RangeError` em estado
 * inválido. Nível e Despertar saem do `resolveBuild`. Sem `phaser` aqui.
 */
export class AxisBuild {
  private axes: Record<AxisItem, Record<string, number>> = { vermelho: zeroAxes('vermelho'), corpo: zeroAxes('corpo') };
  private branches: Record<AxisItem, BranchId | null> = { vermelho: null, corpo: null };
  /** Itens que já passaram pelo 1º Nv 2 desta run (o ramo só é oferecido uma vez). */
  private offered = new Set<AxisItem>();
  private queue = new Set<AxisItem>();
  /** Itens cujo Despertar já foi anunciado nesta rodada. */
  private announced = new Set<AxisItem>();

  /** Pontos do item no eixo; eixo de outro item vale 0. */
  points<I extends AxisItem>(item: I, axis: ItemAxis<I>): number {
    return this.axes[item][axis] ?? 0;
  }

  /** Pontos do item, por eixo (cópia). */
  axesOf<I extends AxisItem>(item: I): Record<ItemAxis<I>, number> {
    return { ...this.axes[item] } as Record<ItemAxis<I>, number>;
  }

  total(item: AxisItem): number {
    return Object.values(this.axes[item]).reduce((sum, n) => sum + n, 0);
  }

  /** VRM-02, CRP-01: nível = 1 + pontos (1 a 6). */
  level(item: AxisItem): number {
    return this.resolved(item).level;
  }

  /** VRM-02.3: o eixo é do item, está abaixo de 3 pontos e o item abaixo de 5. */
  canAdd<I extends AxisItem>(item: I, axis: ItemAxis<I>): boolean {
    if (!(ITEM_AXES[item] as readonly string[]).includes(axis)) return false;
    return this.points(item, axis) < TECH_RULE.axisCap && this.total(item) < TECH_RULE.pointCap;
  }

  /**
   * Compra um ponto. Recusa sem mudar nada (VRM-02.3); no 1º Nv 2 da run põe o item na fila do ramo (VRM-11, CRP-08.1);
   * no Nv 5 com ramo escolhido liga o Despertar (VRM-17, CRP-13).
   */
  add<I extends AxisItem>(item: I, axis: ItemAxis<I>): AddResult {
    if (!this.canAdd(item, axis)) return { ok: false };
    const wasAwake = this.awakened(item);
    const row: Record<string, number> = this.axes[item];
    row[axis] += 1;
    let branchPending = false;
    if (this.level(item) >= TECH_RULE.branchLevel && !this.offered.has(item)) {
      this.offered.add(item);
      if (this.branches[item] === null) {
        this.queue.add(item);
        branchPending = true;
      }
    }
    return { ok: true, branchPending, awakened: !wasAwake && this.awakened(item) };
  }

  /** Eixo-foco (maestria, prêmio do chefe): mais pontos abaixo do teto, empate pela ordem da tabela; `null` no teto. */
  focusAxis<I extends AxisItem>(item: I): ItemAxis<I> | null {
    if (this.total(item) >= TECH_RULE.pointCap) return null;
    let best: ItemAxis<I> | null = null;
    for (const axis of ITEM_AXES[item] as readonly ItemAxis<I>[]) {
      const n = this.points(item, axis);
      if (n >= TECH_RULE.axisCap) continue;
      if (best === null || n > this.points(item, best)) best = axis;
    }
    return best;
  }

  branch<I extends AxisItem>(item: I): ItemBranch<I> | null {
    return this.branches[item] as ItemBranch<I> | null;
  }

  /**
   * Escolhe o ramo: só um ramo do item, uma vez por run e a partir do Nv 2. Tira o item da fila; com o nível já no 5
   * o Despertar liga aqui (edge case do ramo pendente).
   */
  setBranch<I extends AxisItem>(item: I, branch: ItemBranch<I>): boolean {
    if (!(ITEM_BRANCHES[item] as readonly string[]).includes(branch)) return false;
    if (this.branches[item] !== null || this.level(item) < TECH_RULE.branchLevel) return false;
    this.branches[item] = branch;
    this.offered.add(item);
    this.queue.delete(item);
    return true;
  }

  /** Itens com ramo pendente, sempre o Vermelho antes do Corpo. */
  get pending(): readonly AxisItem[] {
    return ITEM_ORDER.filter((item) => this.queue.has(item));
  }

  /** VRM-17, CRP-13: Despertar ligado (ramo escolhido e Nv 5). */
  awakened(item: AxisItem): boolean {
    return this.resolved(item).awakened;
  }

  /** `true` só na 1ª vez da rodada com o Despertar ligado (banner e câmera lenta). */
  announce(item: AxisItem): boolean {
    if (!this.awakened(item) || this.announced.has(item)) return false;
    this.announced.add(item);
    return true;
  }

  /** Começo de rodada: o Despertar volta a ser anunciado. */
  onRoundStart(): void {
    this.announced.clear();
  }

  /** O item sai do jogo (o Vermelho evolui): pontos, ramo, fila e anúncio somem; o ramo não volta nesta run. */
  resetItem(item: AxisItem): void {
    this.axes[item] = zeroAxes(item);
    this.branches[item] = null;
    this.queue.delete(item);
    this.announced.delete(item);
  }

  /** Run nova: tudo no Nv 1, sem ramo e com a fila vazia (CRP-01, edge case do reset com ramo pendente). */
  reset(): void {
    for (const item of ITEM_ORDER) this.resetItem(item);
    this.offered.clear();
    this.announced.clear();
  }

  private resolved(item: AxisItem) {
    return resolveBuild({ axes: this.axes[item], branch: this.branches[item] });
  }
}
