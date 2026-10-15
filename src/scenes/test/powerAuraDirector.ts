import Phaser from 'phaser';
import { atRest, type PowerAura, type PowerLook } from '../../core/power';
import { POWER_FEEL } from '../../data/feel';
import type { Player } from '../../game/Player';
import { CursedFlame } from '../../game/techFx/CursedFlame';
import type { TestScene } from '../TestScene';

/** Logo atrás do player (profundidade 1), como a chama do Divergente: o punho fica por cima e a chama o envolve. */
const AURA_DEPTH = 0.9;

/** Repouso do player (POW-10.14): parado no chão, sem golpe, sem conjurar nem canalizar, vivo e no quadro do `idle`. */
const playerAtRest = (p: Player): boolean =>
  atRest({
    movePhase: p.movePhase,
    grounded: p.grounded,
    casting: p.castLock !== null,
    channeling: p.channeling,
    dead: p.dead,
    idleFrame: p.frameName.startsWith('idle-'),
  });

/**
 * Brasas (patamar 2) e chama no punho (patamar 3) na mão parada (POW-10): uma `CursedFlame` vermelha no punho da
 * frente, no ponto de desenho do corpo mais o `POWER_FEEL.handOffset` do lado para onde o player olha. Fora do repouso
 * a chama some no mesmo quadro (POW-10.14): as línguas que restassem ficariam no ponto da mão parada, que na corrida ou
 * no golpe cai sobre o rosto.
 */
export class PowerAuraDirector {
  private player: Player | null = null;
  private flame: CursedFlame | null = null;
  private lit: PowerAura = 'off';
  private seed = 1;

  constructor(private readonly s: TestScene) {}

  /** Estado real da chama neste quadro (o que o snapshot lê): acesa com o `power` das brasas ou da chama, ou apagada. */
  get view(): PowerAura {
    return this.lit;
  }

  /**
   * Player novo (a cada `create`, também no `R`): larga a chama do player anterior. No `SHUTDOWN` a cena já destrói os
   * objetos dela, então a referência só é zerada, sem chama órfã apontando para um container destruído.
   */
  bind(player: Player): void {
    this.drop();
    this.lit = 'off';
    this.player = player;
    this.s.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.flame = null;
      this.player = null;
      this.lit = 'off';
    });
  }

  /** A cada quadro, com a força de agora: acende no repouso com aura no patamar, senão tira a chama. */
  update(deltaMs: number, look: PowerLook): void {
    const p = this.player;
    const lit = p && look.aura !== 'off' && playerAtRest(p) ? look.aura : 'off';
    this.lit = lit;
    if (!p || lit === 'off') {
      this.drop();
      return;
    }
    const draw = p.renderPos;
    this.flame ??= new CursedFlame(this.s, 'red', AURA_DEPTH, this.seed++);
    const hand = POWER_FEEL.handOffset[p.facing];
    this.flame.tick(deltaMs, { x: draw.x + hand.x, y: draw.y + hand.y }, POWER_FEEL.auraPower[lit]);
  }

  private drop(): void {
    this.flame?.destroy();
    this.flame = null;
  }
}
