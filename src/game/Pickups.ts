import Phaser from 'phaser';
import { burstVelocity } from '../core/loot';
import type { Rect } from '../core/level';
import {
  createPickup,
  stepPickup,
  visible,
  type PickupKind,
  type PickupPlayer,
  type PickupState,
  type PickupStepResult,
} from '../core/pickup';
import type { Rng } from '../core/rng';
import type { PickupTuning } from '../data/tuning';
import { newEntityId } from './bodyTags';
import { TEX } from './textures';

interface PickupEntry {
  state: PickupState;
  sprite: Phaser.GameObjects.Sprite;
}

export interface PickupUpdateResult {
  collected: PickupState[];
  expired: PickupState[];
}

/** Gerencia os pickups vivos na cena: física pura (core/pickup) + sprite. Nada de Matter aqui (design.md). */
export class Pickups {
  private entries: PickupEntry[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly t: PickupTuning,
  ) {}

  /** Quantos fragmentos estão vivos agora (ECO-15: teto de 60). */
  get liveFragments(): number {
    return this.entries.reduce((n, e) => n + (e.state.kind === 'fragment' ? 1 : 0), 0);
  }

  /**
   * Varre todo fragmento vivo para a carteira (SHOP-05, SHOP-36): remove cada um da cena e devolve a soma dos
   * valores. Gotas de cura não são tocadas (SHOP-37).
   */
  collectFragments(): number {
    let total = 0;
    const remaining: PickupEntry[] = [];
    for (const e of this.entries) {
      if (e.state.kind === 'fragment') {
        total += e.state.value;
        e.sprite.destroy();
      } else {
        remaining.push(e);
      }
    }
    this.entries = remaining;
    return total;
  }

  /**
   * Cria `count` pickups no ponto do drop, com a velocidade do estouro sorteada no `rng` da run (ECO-06). O
   * último pickup carrega `value + extraValue` (ECO-28); os demais carregam `value`.
   */
  spawnDrop(rng: Rng, x: number, y: number, kind: PickupKind, count: number, value: number, extraValue: number): void {
    const texture = kind === 'fragment' ? TEX.fragment : TEX.healDrop;
    for (let i = 0; i < count; i++) {
      const { vx, vy } = burstVelocity(rng);
      const v = i === count - 1 ? value + extraValue : value;
      const state = createPickup(newEntityId(), kind, v, x, y, vx, vy);
      const sprite = this.scene.add.sprite(x, y, texture, 'a');
      this.entries.push({ state, sprite });
    }
  }

  /**
   * Avança todos os pickups vivos; devolve os coletados e os expirados neste frame (removidos da lista).
   * `magnetRange` vem de `Modifiers.magnetRange` lido na hora pela cena (MOD-07): sem cache aqui.
   */
  update(dtMs: number, ctx: { solids: readonly Rect[]; player: PickupPlayer; magnetRange: number }): PickupUpdateResult {
    const collected: PickupState[] = [];
    const expired: PickupState[] = [];
    const remaining: PickupEntry[] = [];
    const t = { ...this.t, magnetRange: ctx.magnetRange };
    for (const e of this.entries) {
      const result: PickupStepResult = stepPickup(e.state, dtMs, { solids: ctx.solids, player: ctx.player, t });
      if (result === 'collected') {
        collected.push(e.state);
        e.sprite.destroy();
        continue;
      }
      if (result === 'expired') {
        expired.push(e.state);
        e.sprite.destroy();
        continue;
      }
      e.sprite.setPosition(e.state.x, e.state.y).setVisible(visible(e.state, t));
      remaining.push(e);
    }
    this.entries = remaining;
    return { collected, expired };
  }

  /** Nova run (ECO-27): remove todos os pickups da cena. */
  clear(): void {
    for (const e of this.entries) e.sprite.destroy();
    this.entries = [];
  }

  /** Snapshot de debug (ECO-19). */
  debug(): { id: number; kind: PickupKind; value: number; x: number; y: number; ageMs: number; magnet: boolean }[] {
    return this.entries.map((e) => ({
      id: e.state.id,
      kind: e.state.kind,
      value: e.state.value,
      x: e.state.x,
      y: e.state.y,
      ageMs: e.state.ageMs,
      magnet: e.state.magnet,
    }));
  }
}
