import {
  CutSchedule,
  cutAngles,
  cutConfig,
  cutGeometry,
  type CutGeometry,
  type CutHit,
  type CutTarget,
} from '../../core/cut';
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
  /** Geometria da conjuração em curso (ângulos e linha da vista), fixa no `techCast:corte`. */
  private geometry: CutGeometry | null = null;
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
      const stats = this.ctx.loadout.stats('corte'); // TST-02: tempos, retângulo e dano fixos na conjuração
      this.schedule = new CutSchedule(cutConfig(stats));
      this.geometry = cutGeometry(stats);
      this.cast = this.ctx.currentCast();
    }
    if (!this.schedule || !this.geometry) return;
    const due = this.schedule.update(dtMs);
    if (due.length === 0) return;

    const { player } = this.ctx;
    const facing = player.facing;
    const geometry = this.geometry;
    const angles = cutAngles(facing, geometry.anglesDeg); // CUT-05
    const center = { x: player.sprite.x, y: player.sprite.y };
    const targets: CutTarget[] = [
      ...enemies.map((e) => ({ id: e.id, body: cornerRect(e.hurtRect()) })),
      ...(boss ? [{ id: boss.id, body: cornerRect(boss.hurtRect()) }] : []),
    ];
    for (const i of due) {
      this.fx.cut(center.x, center.y, facing, angles[i], geometry); // CUT-04
      this.ctx.emit('cut'); // CUT-08: um evento por corte
      for (const hit of this.schedule.targetsHit(center, facing, targets)) this.applyHit(hit, enemies, boss);
    }
    if (due.includes(2)) this.schedule = null; // agenda encerrada após o 3º corte
  }

  private applyHit(hit: CutHit, enemies: readonly TechTarget[], boss: Boss | null): void {
    const dealt: Hit = {
      ownerId: this.ctx.player.id,
      damage: hit.damage, // CUT-03, TEC-06: já escalado no stat da conjuração
      strength: 'light',
      force: 0,
      direction: { x: 0, y: -1 },
      ...techMarks('light', 'corte'),
    };
    const enemy = enemies.find((e) => e.id === hit.targetId);
    if (enemy) {
      if (enemy.receiveHit(dealt)) {
        this.ctx.onTechHit(dealt, { x: enemy.x, y: enemy.hurtRect().y }, enemy);
        this.ctx.masteryHit(this.cast, enemy);
        this.fx.split(enemy.x, enemy.hurtRect().y); // CUT-06
      }
      return;
    }
    if (boss && boss.id === hit.targetId && boss.receiveHit(dealt)) {
      this.ctx.onTechHit(dealt, { x: boss.x, y: boss.hurtRect().y }, boss);
      this.ctx.masteryHit(this.cast, boss);
      this.fx.split(boss.x, boss.hurtRect().y); // CUT-06
    }
  }
}

/** `hurtRect()` devolve posição do CENTRO do corpo (convenção do jogo); o `CutSchedule` puro espera cantos. */
function cornerRect(r: Rect): Rect {
  return { x: r.x - r.width / 2, y: r.y - r.height / 2, width: r.width, height: r.height };
}
