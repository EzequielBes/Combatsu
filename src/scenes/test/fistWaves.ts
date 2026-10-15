import type { Box } from '../../core/axisRule';
import type { Hit, Vec2 } from '../../core/hit';
import { StrikeEmitter, type WaveOpts, type WaveTarget } from '../../core/strikeEmitter';
import type { Hittable, Rect } from '../../game/bodyTags';
import { FistWaveFx } from '../../game/FistWaveFx';
import type { TestScene } from '../TestScene';

/** Alvo que a onda pode tocar: o comum ou o chefe, vivos. */
type WaveVictim = Hittable & { id: number; hurtRect(): Rect; isDead(): boolean };

/** A caixa de acerto do alvo, do centro (`Rect`) para o canto (`Box`). */
export function boxOf(target: { hurtRect(): Rect }): Box {
  const r = target.hurtRect();
  return { x: r.x - r.width / 2, y: r.y - r.height / 2, width: r.width, height: r.height };
}

/**
 * As ondas do punho no jogo (CRP-10 a CRP-12): liga o `StrikeEmitter` puro aos inimigos da cena, entrega os acertos com
 * `band: 'micro'`, sem `tech`, pelo `effects.onTechConnect(..., 'golpe')` (somam em `golpe` no registro e não mexem
 * na energia) e desenha o `FistWaveFx`. Campo do `BodyDirector`; anda no tempo de jogo.
 */
export class FistWaves {
  readonly emitter = new StrikeEmitter();
  /** Os alvos do golpe que soltou cada onda viva: a onda passa por eles sem acertar (CRP-10). */
  private readonly except = new Map<number, Set<number>>();
  private fx: FistWaveFx | null = null;

  constructor(private readonly s: TestScene) {}

  /**
   * Solta uma onda do ponto do acerto para onde o player olha, sem tocar o alvo `exceptId`. Devolve se saiu (o teto de
   * 4 por segundo de jogo derruba o excedente, CRP-12). Eventos `fistWave:emit` e `fistWave:capped`.
   */
  emit(at: Vec2, damage: number, opts: WaveOpts, exceptId: number): boolean {
    const ok = this.emitter.emit(at, this.s.player.facing, damage, opts, this.s.clockMs);
    this.s.snapshot.debugEvents.push(ok ? 'fistWave:emit' : 'fistWave:capped');
    if (ok) this.except.set(this.emitter.waves[this.emitter.waves.length - 1]!.id, new Set([exceptId]));
    return ok;
  }

  /** O mesmo golpe acertou mais um alvo (golpe de 2 alvos): as ondas dele também passam por esse. */
  skip(targetId: number): void {
    for (const ids of this.except.values()) ids.add(targetId);
  }

  /** Anda as ondas, entrega os acertos e redesenha; sem onda viva a vista sai do `FxRegistry`. */
  update(dtMs: number): void {
    if (this.emitter.waves.length === 0) {
      this.dropFx();
      return;
    }
    const victims = this.victims();
    const targets: WaveTarget[] = victims.map((v) => ({ id: v.id, rect: boxOf(v) }));
    const dirOf = new Map(this.emitter.waves.map((w) => [w.id, w.dir]));
    const except = [...this.except.values()].flatMap((ids) => [...ids]);
    for (const h of this.emitter.update(dtMs, targets, except)) {
      const v = victims.find((x) => x.id === h.targetId);
      if (v) this.deliver(v, h.damage, dirOf.get(h.waveId) ?? 1);
    }
    for (const id of [...this.except.keys()]) if (!this.emitter.waves.some((w) => w.id === id)) this.except.delete(id);
    if (!this.fx || this.fx.destroyed) this.fx = new FistWaveFx(this.s, this.s.fxRegistry);
    this.fx.draw(this.emitter.waves);
  }

  /** Riscos desenhados agora (0 sem onda viva). */
  get shown(): number {
    return this.fx?.view ?? 0;
  }

  reset(): void {
    this.emitter.reset();
    this.except.clear();
    this.dropFx();
  }

  private victims(): WaveVictim[] {
    const list: WaveVictim[] = this.s.enemies.filter((e) => !e.isDead());
    const boss = this.s.boss;
    if (boss && !boss.isDead()) list.push(boss);
    return list;
  }

  /** Acerto `micro` da onda: número `micro` no alvo e evento `fistWave:<id>:<dano levado>`. */
  private deliver(v: WaveVictim, damage: number, dir: 1 | -1): void {
    const hit: Hit = {
      ownerId: this.s.player.id,
      damage,
      strength: 'light',
      force: 2,
      direction: { x: dir, y: -0.15 },
      band: 'micro',
    };
    if (!v.receiveHit(hit)) return;
    const r = v.hurtRect();
    this.s.effects.onTechConnect(hit, { x: r.x, y: r.y }, v, 'golpe');
    this.s.snapshot.debugEvents.push(`fistWave:${v.id}:${v.lastDamageTaken ?? damage}`);
  }

  private dropFx(): void {
    if (!this.fx) return;
    this.fx.draw([]);
    this.s.fxRegistry.scheduleDestroy(this.fx, 0);
    this.fx = null;
  }
}
