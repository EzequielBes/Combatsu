import { Arsenal, relicStrikeMul, relicTechMul, weaponDef } from '../../core/arsenal';
import { ARSENAL, type ArsenalId } from '../../data/arsenal';
import type { MoveDef } from '../../data/moves';
import { Prop } from '../../game/Prop';
import type { TestScene } from '../TestScene';
import { debugParam } from './params';

/**
 * Arsenal da run (ARS-01..12): guarda a relíquia, a arma vinculada e a ferramenta comprada, aplica os bônus da
 * relíquia e põe a arma (ou a ferramenta) na mão do player no começo de cada rodada.
 */
export class ArsenalDirector {
  readonly arsenal = new Arsenal();
  /** O objeto vivo da arma vinculada; recriado a cada rodada, porque a área anterior o destrói. */
  private bound: Prop | null = null;

  constructor(readonly s: TestScene) {}

  /** Run nova: nada sobrevive. `?debug&arsenal=manoplas,bastao` compra os itens listados (repetir sobe o nível). */
  reset(): void {
    this.discardBound();
    this.arsenal.reset();
    for (const id of (debugParam('arsenal') ?? '').split(',')) if (id in ARSENAL) this.arsenal.buy(id as ArsenalId);
    this.syncTechBonus();
  }

  /** Compra na loja (ARS-02). Arma nova ou de nível novo: a que está na mão sai, e a próxima rodada entrega a atual. */
  buy(id: ArsenalId): void {
    this.arsenal.buy(id);
    if (ARSENAL[id].kind === 'weapon') this.discardBound();
    this.syncTechBonus();
  }

  /** ARS-05: multiplicador de dano do golpe corpo a corpo pela relíquia. */
  strikeMul(move: MoveDef): number {
    return relicStrikeMul(this.arsenal, move.strength === 'light');
  }

  /**
   * Começo de rodada (ARS-09, ARS-10): a arma vinculada volta para a mão; sem arma, a ferramenta comprada na loja é
   * entregue. Se o player já segura outra coisa (na sala a área não troca), a mão dele manda.
   */
  onRoundStart(): void {
    const player = this.s.player;
    const { weapon } = this.arsenal;
    if (weapon) {
      if (this.bound && !this.bound.isGone && player.heldProp === this.bound) return;
      this.discardBound();
      if (player.heldProp) return;
      const def = weaponDef(weapon.id, weapon.level);
      const { x, y } = player.sprite;
      const prop = new Prop(this.s, x, y, def, this.s.modifiers, (hit, at, target) =>
        this.s.combat.onConnect(hit, at, 'prop', target),
      );
      this.s.props.push(prop);
      this.putInHand(prop);
      this.bound = prop;
      return;
    }
    if (player.heldProp) return;
    const tool = this.arsenal.takePendingTool();
    if (!tool) return;
    const { x, y } = player.sprite;
    this.putInHand(this.s.drops.dropTool(ARSENAL[tool].tool!, false, x, y));
  }

  private putInHand(prop: Prop): void {
    if (prop.pickUp(this.s.player.id)) this.s.player.held = prop;
  }

  private discardBound(): void {
    const bound = this.bound;
    this.bound = null;
    if (!bound) return;
    if (this.s.player.heldProp === bound) this.s.player.held = null;
    bound.destroyNow();
  }

  /** ARS-06: o Rosário multiplica o dano de toda técnica, lido pelo `Loadout`. */
  private syncTechBonus(): void {
    this.s.loadout.damageMul = relicTechMul(this.arsenal);
  }

  /** Campo `arsenal` do snapshot de debug. */
  snapshot(): {
    relic: string | null;
    relicLevel: number;
    weapon: string | null;
    weaponLevel: number;
    tool: string | null;
  } {
    const { relic, weapon, pendingTool } = this.arsenal;
    return {
      relic: relic?.id ?? null,
      relicLevel: relic?.level ?? 0,
      weapon: weapon?.id ?? null,
      weaponLevel: weapon?.level ?? 0,
      tool: pendingTool,
    };
  }
}
