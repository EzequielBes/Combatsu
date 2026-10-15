import type { Vec2 } from '../../core/hit';
import { repulseTargetsFor, type RepulseCandidate } from '../../core/redOrb';
import { Boss } from '../Boss';
import type { RedOrbFx } from '../techFx/RedOrb';
import { strikeRed } from './redFlight';
import type { TechContext, TechTarget } from './shared';

/**
 * RDA-08/09/10, EDG-03: na soltura do Vermelho, quem está à frente (até 80 px em x e 48 px em y do centro do player)
 * leva o `damage` leve e é empurrado; quem está atrás não. O chefe fica de fora (só o orbe o atinge, RED-09). VRM-04: o
 * dano é o `repulseDamage` resolvido (4, 5, 5 e 6 com 0 a 3 pontos de Potência, vezes os multiplicadores). Tirado do
 * `red.ts` para ele caber no teto da T24.
 */
export function redRepulse(
  ctx: TechContext,
  fx: RedOrbFx,
  enemies: readonly TechTarget[],
  damage: number,
  onKill: () => void,
): void {
  const { player } = ctx;
  const origin = { x: player.sprite.x, y: player.sprite.y };
  fx.repulse(origin, player.facing);
  const candidates: RepulseCandidate[] = enemies.map((e) => ({
    id: e.id,
    kind: e instanceof Boss ? 'boss' : 'enemy',
    center: { x: e.x, y: e.hurtRect().y },
  }));
  for (const r of repulseTargetsFor(origin, player.facing, candidates, damage)) {
    const enemy = enemies.find((e) => e.id === r.targetId);
    if (!enemy) continue;
    // MST-01: a repulsão faz parte da mesma conjuração do orbe (mesmo `castId`, então o alvo conta uma vez só).
    const cast = ctx.currentCast();
    const at = (): Vec2 => ({ x: enemy.x, y: enemy.hurtRect().y });
    const blow = { damage: r.damage, strength: r.strength, force: r.force, direction: r.direction };
    strikeRed(ctx, enemy, at, cast, blow, onKill);
  }
}
