import { CutSchedule, cutAngles, type CutHit, type CutTarget } from '../../core/cut';
import type { FxRegistry } from '../../core/fxRegistry';
import type { FxTimeline } from '../../core/fxTimeline';
import type { Hit } from '../../core/hit';
import type { Rect } from '../bodyTags';
import type { Boss } from '../Boss';
import { CutFx } from '../techFx/CutFx';
import { techMarks, type CastRef, type TechContext, type TechTarget } from './shared';

/** Desmantelar (T27): três cortes agendados à frente do player, cada um acertando quem estiver na linha. */
export class CutTech {
  private readonly fx: CutFx;
  private schedule: CutSchedule | null = null;
  private cast: CastRef | null = null;

  constructor(
    private readonly ctx: TechContext,
    fx: FxTimeline,
    registry: FxRegistry,
  ) {
    this.fx = new CutFx(ctx.scene, fx, registry);
  }

  update(dtMs: number, castEvents: readonly string[], enemies: readonly TechTarget[], boss: Boss | null): void {
    if (castEvents.includes('techCast:corte')) {
      this.schedule = new CutSchedule();
      this.cast = this.ctx.currentCast();
    }
    if (!this.schedule) return;
    const due = this.schedule.update(dtMs);
    if (due.length === 0) return;

    const { player } = this.ctx;
    const facing = player.facing;
    const angles = cutAngles(facing); // CUT-05
    const center = { x: player.sprite.x, y: player.sprite.y };
    const targets: CutTarget[] = [
      ...enemies.map((e) => ({ id: e.id, body: cornerRect(e.hurtRect()) })),
      ...(boss ? [{ id: boss.id, body: cornerRect(boss.hurtRect()) }] : []),
    ];
    for (const i of due) {
      this.fx.cut(center.x, center.y, facing, angles[i]); // CUT-04
      this.ctx.emit('cut'); // CUT-08: um evento por corte
      for (const hit of this.schedule.targetsHit(center, facing, targets)) this.applyHit(hit, enemies, boss);
    }
    if (due.includes(2)) this.schedule = null; // agenda encerrada após o 3º corte
  }

  private applyHit(hit: CutHit, enemies: readonly TechTarget[], boss: Boss | null): void {
    const dealt: Hit = {
      ownerId: this.ctx.player.id,
      damage: this.ctx.loadout.damage('corte', hit.damage), // CUT-03, TEC-06
      strength: 'light',
      force: 0,
      direction: { x: 0, y: -1 },
      ...techMarks('light'),
    };
    const enemy = enemies.find((e) => e.id === hit.targetId);
    if (enemy) {
      if (enemy.receiveHit(dealt)) {
        this.ctx.onTechHit(dealt, { x: enemy.x, y: enemy.hurtRect().y });
        this.ctx.masteryHit(this.cast, enemy);
        this.fx.split(enemy.x, enemy.hurtRect().y); // CUT-06
      }
      return;
    }
    if (boss && boss.id === hit.targetId && boss.receiveHit(dealt)) {
      this.ctx.onTechHit(dealt, { x: boss.x, y: boss.hurtRect().y });
      this.ctx.masteryHit(this.cast, boss);
      this.fx.split(boss.x, boss.hurtRect().y); // CUT-06
    }
  }
}

/** `hurtRect()` devolve posição do CENTRO do corpo (convenção do jogo); o `CutSchedule` puro espera cantos. */
function cornerRect(r: Rect): Rect {
  return { x: r.x - r.width / 2, y: r.y - r.height / 2, width: r.width, height: r.height };
}
