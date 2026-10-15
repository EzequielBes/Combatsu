import { wallStunFrom } from '../../core/wallStun';
import type { Vec2 } from '../../core/hit';
import { RED_AWAKENINGS } from '../../data/techAxes';
import { tagOf } from '../../game/bodyTags';
import { Enemy } from '../../game/Enemy';
import type { TestScene } from '../TestScene';

/** Par de contato do Matter; a normal fica em `collision`, que o tipo do `ContactEvent` não declara. */
type ContactPair = { bodyA: MatterJS.BodyType; bodyB: MatterJS.BodyType; collision?: { normal?: Vec2 } };

/**
 * A parede que atordoa (VRM-16): o comum derrubado por um golpe com `wallStun` (`enemy.wallStunArmed`) que bate o
 * ragdoll numa parede do terreno fica em `ragdollStun` por 600 ms contados do toque e emite `wallStun:<id>`; o chão
 * não atordoa nem desarma (ver o SPEC_DEVIATION de `core/wallStun.ts`). A regra mora em `core/wallStun.ts`; aqui só os pares do Matter. Campo `wallStun` do
 * `CombatLinks`, que repassa os pares de cada `collisionstart`.
 */
export class WallStun {
  constructor(readonly s: TestScene) {}

  onContacts(pairs: readonly ContactPair[]): void {
    for (const pair of pairs) {
      const enemy =
        this.armedAgainstTerrain(pair.bodyA, pair.bodyB) ?? this.armedAgainstTerrain(pair.bodyB, pair.bodyA);
      const normal = pair.collision?.normal;
      if (!enemy || !normal) continue;
      if (wallStunFrom(normal, enemy.wallStunArmed) !== 'stun') continue;
      enemy.wallStun(RED_AWAKENINGS.vermelhoMaximo.wallStunMs);
      this.s.snapshot.debugEvents.push(`wallStun:${enemy.id}`);
    }
  }

  /** O comum armado dono da parte de ragdoll `part`, se `other` for terreno. */
  private armedAgainstTerrain(part: MatterJS.BodyType, other: MatterJS.BodyType): Enemy | null {
    if (tagOf(other)?.kind !== 'terrain') return null;
    const tag = tagOf(part);
    if (tag?.kind !== 'character' || !(tag.target instanceof Enemy)) return null;
    const enemy = tag.target;
    return enemy.wallStunArmed && enemy.ragdollBodies?.includes(part) ? enemy : null;
  }
}
