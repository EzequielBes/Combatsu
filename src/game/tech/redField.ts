import type Phaser from 'phaser';
import type { Box } from '../../core/axisRule';
import type { EnemyState } from '../../core/enemyBrain';
import type { FxRegistry } from '../../core/fxRegistry';
import type { Vec2 } from '../../core/hit';
import { pushVelocity, RedField } from '../../core/redBranch';
import { RED_AWAKENINGS } from '../../data/techAxes';
import { PALETTE } from '../art/palette';
import type { Hittable, Rect } from '../bodyTags';
import type { Boss } from '../Boss';
import { Enemy } from '../Enemy';
import { PX_PER_S_TO_STEP } from '../physics';
import { RED_FX_COLORS } from '../techFx/redPalette';
import { strikeRed } from './redFlight';
import type { CastRef, TechContext, TechTarget } from './shared';

/** Estados de quem está em pé: o campo só empurra estes (o derrubado segue no chão, VRM-15). */
const STANDING: ReadonlySet<EnemyState> = new Set(['idle', 'hitstun', 'stagger']);

/** Quem leva o chip do campo: os comuns e o chefe. */
type ChipTarget = Hittable & Pick<TechTarget, 'x' | 'hurtRect'>;

/** A caixa de acerto do alvo, do centro (`Rect`) para o canto (`Box`). */
function boxOf(target: { hurtRect(): Rect }): Box {
  const r = target.hurtRect();
  return { x: r.x - r.width / 2, y: r.y - r.height / 2, width: r.width, height: r.height };
}

/** O que a detonação entrega ao campo: onde, de que tamanho, de qual conjuração e o chip já escalado. */
export interface RedFieldStart {
  readonly center: Vec2;
  readonly radius: number;
  readonly cast: CastRef | null;
  /** `round(3 × damageMul × vowDamageMul)`, calculado na soltura. */
  readonly chip: number;
  readonly onKill: () => void;
}

/**
 * O campo do Vermelho Máximo (VRM-15): depois da detonação, 1200 ms do mesmo raio que empurram os comuns em pé dentro
 * dele a 150 px/s e dão um `chip` a cada 200 ms em todo inimigo dentro (o chefe também). O empurrão é o `setPull` do
 * comum, escrito a cada quadro só em quem está dentro e em pé, e `null` uma vez ao sair ou no fim; o Azul escreve
 * depois dele no mesmo quadro, então com um orbe Azul vivo o puxão do Azul vale (edge case da spec). Vista mínima: um
 * anel da `RED_FX_COLORS` que esmaece, registrado no `FxRegistry`.
 */
export class RedFieldRunner {
  private field: RedField | null = null;
  private start: RedFieldStart | null = null;
  private readonly pushed = new Map<number, TechTarget>();
  private view: Phaser.GameObjects.Graphics | null = null;
  private elapsed = 0;

  constructor(
    private readonly ctx: TechContext,
    private readonly registry: FxRegistry,
  ) {}

  /** Abre o campo; um campo anterior ainda vivo acaba antes (solta os empurrões dele). */
  open(start: RedFieldStart): void {
    if (this.field) this.close();
    this.field = new RedField(start.center, start.radius);
    this.start = start;
    this.elapsed = 0;
    this.view = this.ctx.scene.add.graphics().setDepth(3);
    this.registry.add(this.view);
    this.ctx.emit('redField');
  }

  update(dtMs: number, enemies: readonly TechTarget[], boss: Boss | null): void {
    const field = this.field;
    const start = this.start;
    if (!field || !start) return;
    this.push(field, enemies);
    const { ticks, ended } = field.update(dtMs);
    for (let i = 0; i < ticks; i++) this.chipAll(field, start, boss ? [...enemies, boss] : enemies);
    this.elapsed += dtMs;
    this.draw(field);
    if (ended) this.close();
  }

  /** Empurra os comuns em pé dentro do raio, do centro para fora; quem saiu ou caiu perde o empurrão uma vez. */
  private push(field: RedField, enemies: readonly TechTarget[]): void {
    for (const e of enemies) {
      const inside = e instanceof Enemy && STANDING.has(e.state) && field.covers(boxOf(e));
      if (inside) {
        const v = pushVelocity(field.center, { x: e.x, y: e.hurtRect().y });
        e.setPull({ x: v.x * PX_PER_S_TO_STEP, y: v.y * PX_PER_S_TO_STEP });
        this.pushed.set(e.id, e);
      } else if (this.pushed.has(e.id)) {
        e.setPull(null);
        this.pushed.delete(e.id);
      }
    }
  }

  /** Um tique: `chip` em todo inimigo dentro do raio; emite `redChip:<alvo>:<dano levado>`. */
  private chipAll(field: RedField, start: RedFieldStart, targets: readonly ChipTarget[]): void {
    for (const t of targets) {
      if (!field.covers(boxOf(t))) continue;
      const at = (): Vec2 => ({ x: t.x, y: t.hurtRect().y });
      const blow = { damage: start.chip, strength: 'light' as const, force: 0, direction: { x: 0, y: -1 } };
      if (!strikeRed(this.ctx, t, at, start.cast, { ...blow, band: 'chip' }, start.onKill)) continue;
      this.ctx.emit(`redChip:${t.id}:${t.lastDamageTaken ?? start.chip}`);
    }
  }

  private draw(field: RedField): void {
    const t = Math.min(1, this.elapsed / RED_AWAKENINGS.vermelhoMaximo.fieldMs);
    const { x, y } = field.center;
    this.view
      ?.clear()
      .lineStyle(4, PALETTE[RED_FX_COLORS.ring], 0.7 * (1 - t))
      .strokeCircle(x, y, field.radius)
      .fillStyle(PALETTE[RED_FX_COLORS.glow], 0.18 * (1 - t))
      .fillCircle(x, y, field.radius);
  }

  /** Fim do campo: solta todo empurrão que ele deu e apaga a vista. */
  private close(): void {
    for (const e of this.pushed.values()) e.setPull(null);
    this.pushed.clear();
    if (this.view) this.registry.scheduleDestroy(this.view, 0);
    this.view = null;
    this.field = null;
    this.start = null;
    this.ctx.emit('redFieldEnd');
  }
}
