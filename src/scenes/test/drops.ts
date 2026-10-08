import { propName, rareDef } from '../../core/armed';
import { capDrop, elixirHeal, type EnemyDropResult, type ToolKey } from '../../core/loot';
import { type PickupKind, type PickupPlayer } from '../../core/pickup';
import { type PropState } from '../../core/props';
import { TOOL_DEFS } from '../../data/props';
import { ECONOMY, ELIXIR } from '../../data/tuning';
import { Prop } from '../../game/Prop';
import { isDroppedTool } from './params';
import type { TestScene } from '../TestScene';

/** Pickups, drops de abate, ferramentas largadas e o objeto na mão. */
export class Drops {
  constructor(readonly s: TestScene) {}

  /** Move e coleta os pickups vivos (ECO-06..11, HEAL-03/04) e avança os textos flutuantes da coleta. */
  updatePickups(dtMs: number): void {
    const pr = this.s.player.hurtRect();
    const player: PickupPlayer = {
      x: pr.x - pr.width / 2,
      y: pr.y - pr.height / 2,
      w: pr.width,
      h: pr.height,
      alive: !this.s.player.dead,
      canHeal: this.s.player.hp < this.s.player.maxHp,
    };
    const { collected, expired } = this.s.pickups.update(dtMs, {
      solids: this.s.level.solids,
      player,
      magnetRange: this.s.modifiers.magnetRange,
    });
    for (const p of collected) this.onPickupCollected(p);
    for (let i = 0; i < expired.length; i++) this.s.snapshot.debugEvents.push('pickupExpired');
    this.s.floatTexts.update(dtMs);
    // ECO-16: o contador do HUD acompanha a carteira no mesmo frame da coleta.
    this.s.hud.setFragments(this.s.wallet.fragments);
  }

  /** Fragmento credita a carteira; gota cura (teto em maxHp, HEAL-03) - cada uma com o "+N" e o evento (ECO-29/HEAL-08). */
  onPickupCollected(p: { kind: PickupKind; value: number; x: number; y: number }): void {
    if (p.kind === 'fragment') {
      this.s.wallet.add(p.value);
      this.s.snapshot.debugEvents.push(`collect:fragment:${p.value}`);
      this.s.floatTexts.spawn(`+${p.value}`, 'U', p.x, p.y);
      return;
    }
    const restored = this.s.player.heal(p.value);
    this.s.snapshot.debugEvents.push(`collect:${p.kind}:${restored}`);
    this.s.floatTexts.spawn(`+${restored}`, 'G', p.x, p.y);
    this.s.player.flash('G', 80);
  }

  /** Nome e pips do objeto na mão (ITEM-01/02), `null` de mãos vazias (ITEM-03). */
  heldItemInfo(): { name: string; pips: number; maxPips: number } | null {
    const prop = this.s.player.heldProp;
    if (!prop) return null;
    return { name: propName(prop.def), pips: prop.def.durability - prop.machine.impacts, maxPips: prop.def.durability };
  }

  /** Sorteia e materializa o drop de um abate (ECO-01/05, ECO-15/28, HEAL-01/02) no ponto da morte. */
  applyDrop(result: EnemyDropResult, x: number, y: number): void {
    const cap = capDrop(result.fragments, this.s.pickups.liveFragments, ECONOMY.maxLiveFragments);
    if (cap.spawn > 0)
      this.s.pickups.spawnDrop(this.s.lootRng, x, y, 'fragment', cap.spawn, result.value, cap.extraOnLast);
    if (result.heal) this.s.pickups.spawnDrop(this.s.lootRng, x, y, 'heal', 1, ECONOMY.healAmount, 0);
  }

  /**
   * Sorteia o Elixir de um abate de inimigo comum (ELX-01/02) no stream próprio e o solta no ponto da morte; a cura
   * é fixada no drop pela vida máxima de agora (ELX-04). A velocidade do estouro sai do mesmo stream do Elixir.
   */
  rollElixir(armed: boolean, x: number, y: number): void {
    const rng = this.s.run.elixirRng;
    if (!rng || !this.s.elixir.enemyDrop(armed)) return;
    this.s.pickups.spawnDrop(rng, x, y, 'elixir', 1, elixirHeal(this.s.player.maxHp, ELIXIR), 0);
    this.s.snapshot.debugEvents.push('drop:elixir');
  }

  /**
   * Ferramenta largada por um inimigo armado (ARM-08): nasce em `rest`, pronta para pegar (design.md). Se o teto
   * de 6 já estiver cheio, a mais antiga em `rest` some antes (ARM-14).
   */
  dropTool(tool: ToolKey, rare: boolean, x: number, y: number): Prop {
    const def = rare ? rareDef(TOOL_DEFS[tool]) : TOOL_DEFS[tool];
    const prop = new Prop(
      this.s,
      x,
      y,
      def,
      this.s.modifiers,
      (hit, at, target) => this.s.combat.onConnect(hit, at, 'prop', target),
      rare,
    );
    const evictId = this.s.droppedTools.admit(prop.id, this.toolStates());
    if (evictId !== null) {
      this.s.props.find((p) => p.id === evictId)?.destroyNow();
      this.s.droppedTools.forget(evictId);
    }
    this.s.props.push(prop);
    return prop;
  }

  /** Estado atual de cada ferramenta largada registrada (para `DroppedTools.admit`/`update`). */
  toolStates(): Map<number, PropState> {
    const states = new Map<number, PropState>();
    for (const p of this.s.props) if (isDroppedTool(p.def.key)) states.set(p.id, p.machine.state);
    return states;
  }

  /** Sumiço por tempo (ARM-13) e limpeza do registro para ferramentas que já sumiram por outro motivo (quebra, teto). */
  updateDroppedTools(dtMs: number): void {
    const expired = this.s.droppedTools.update(dtMs, this.toolStates());
    for (const id of expired) {
      const p = this.s.props.find((pr) => pr.id === id);
      if (!p) continue;
      this.s.fx.curseSmoke(p.sprite.x, p.sprite.y);
      p.destroyNow();
    }
    for (const p of this.s.props) if (isDroppedTool(p.def.key) && p.isGone) this.s.droppedTools.forget(p.id);
  }
}
