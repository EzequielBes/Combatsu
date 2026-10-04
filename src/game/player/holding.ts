import { type ComboEvent } from '../../core/combo';
import { bodyOf } from '../physics';
import type { Prop } from '../Prop';
import type { Player } from '../Player';

/** Alcance da zona de coleta à frente do player (px); atrás vale metade. */
const PICKUP_REACH = 24;
/** Tempo (ms) que a pose de arremesso fica na tela depois de soltar o objeto. */
const THROW_POSE_MS = 200;

/** Objeto na mão do player: pegar, soltar, arremessar e balançar. */
export class PlayerHolding {
  constructor(private readonly p: Player) {}

  interact(dropInstead: boolean): void {
    if (this.p.held) {
      const prop = this.p.held;
      this.p.held = null;
      prop.release(this.p.sprite.x, this.p.sprite.y, dropInstead ? 'drop' : 'throw', this.p.facing);
      if (!dropInstead) this.p.throwPoseMs = THROW_POSE_MS;
      return;
    }
    const target = this.findPickup();
    if (target && target.pickUp(this.p.id)) {
      this.p.held = target;
      this.p.strikes.onMove(this.p.moves.cancel());
      this.p.heavyHoldMs = -1;
    }
  }

  /** Zona de coleta (consulta de região) em volta do player, maior para a frente. */
  findPickup(): Prop | null {
    const candidates = this.p.props().filter((p) => p.machine.state === 'rest');
    if (candidates.length === 0) return null;
    // Posição + tamanho do sprite, não body.bounds (alargado pela velocidade do frame; ver touchesTerrain).
    const { x, y } = bodyOf(this.p.sprite).position;
    const halfW = this.p.sprite.displayWidth / 2;
    const halfH = this.p.sprite.displayHeight / 2;
    const front = PICKUP_REACH;
    const back = PICKUP_REACH / 2;
    const zone = {
      min: { x: x - halfW - (this.p.facing < 0 ? front : back), y: y - halfH - 4 },
      max: { x: x + halfW + (this.p.facing > 0 ? front : back), y: y + halfH + 4 },
    };
    const inZone = new Set(
      this.p.scene.matter.query.region(
        candidates.map((p) => p.body),
        zone,
      ),
    );
    let best: Prop | null = null;
    let bestDist = Infinity;
    for (const p of candidates) {
      if (!inZone.has(p.body)) continue;
      const d = Math.abs(p.sprite.x - this.p.sprite.x) + Math.abs(p.sprite.y - this.p.sprite.y);
      if (d < bestDist) {
        best = p;
        bestDist = d;
      }
    }
    return best;
  }

  onPropSwing(events: ComboEvent[]): void {
    for (const ev of events) {
      if (ev.type === 'hitboxOn') this.p.held?.startSwing();
      else if (ev.type === 'hitboxOff' || ev.type === 'comboEnd') this.p.held?.endSwing();
    }
  }
}
