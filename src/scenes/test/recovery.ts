import { HealthRegen, roundClearHeal } from '../../core/healthRegen';
import { ReverseCursed } from '../../core/reverseCursed';
import { PLAYER_REGEN } from '../../data/tuning';
import { ReverseAuraFx } from '../../game/techFx/ReverseAura';
import { DRAWN_PLAYER, SIZE } from '../../game/textures';
import { HD_ON } from '../../game/art/hd/flag';
import type { InputSnapshot } from '../../game/input';
import { debugParam } from './params';
import type { TestScene } from '../TestScene';

/** De quanto em quanto tempo de cura a Energia Reversa mostra o "+N" acumulado (ms). */
const REVERSE_TEXT_MS = 500;

/**
 * Recuperação de vida do player por quadro: regeneração passiva fora de combate (REG-01..04), cura de fim de
 * rodada (REG-05) e a Energia Amaldiçoada Reversa (RCT-01..10). As regras moram em `core`; aqui só se aplica a
 * cura, o gasto de energia, a trava do player e o retorno visual.
 */
export class Recovery {
  readonly regen = new HealthRegen(PLAYER_REGEN);
  readonly reverse = new ReverseCursed();
  /** HP curados pela Energia Reversa ainda não mostrados no "+N". */
  private shownPending = 0;
  private textMs = 0;
  /**
   * `?debug&regen=0` desliga a regeneração passiva e a cura de fim de rodada, para os cenários que medem o hp exato
   * (gota de cura, dano). A Energia Reversa continua ligada.
   */
  private passiveOn: boolean | null = null;

  /** Aura da Energia Reversa (RCA-*), criada na primeira vez que a cena roda. */
  private aura: ReverseAuraFx | null = null;
  private auraRegistry: unknown = null;

  constructor(readonly s: TestScene) {}

  private get passive(): boolean {
    this.passiveOn ??= debugParam('regen') !== '0';
    return this.passiveOn;
  }

  /** Chamar depois do `player.update`, com `damaged` = o player perdeu vida neste frame. */
  update(dt: number, input: InputSnapshot, damaged: boolean): void {
    const p = this.s.player;
    if (damaged) {
      this.regen.hurt();
      // RCT-07: levar dano corta a canalização.
      this.push(this.reverse.interrupt());
    }

    const step = this.reverse.update(dt, {
      held: input.reverseHeld,
      // RCT-04: uma conjuração de técnica tem a preferência sobre a canalização.
      canChannel: p.canChannel() && this.s.techCaster.cast === null,
      hp: p.hp,
      maxHp: p.maxHp,
      energy: this.s.energy.cur,
    });
    this.push(step.events);
    // RCT-08: sem energia, a barra pisca como numa técnica recusada.
    if (step.events.includes('rctDenied')) this.s.energyHud.flashDenied();
    // VOW-13/14: Fluxo selado desliga a cura da Reversa; Cura proibida dobra e só cura abaixo de 30% da vida.
    const fx = this.s.vows.effects;
    const allowed = !fx.rctOff && (fx.rctBelow === null || p.hp < fx.rctBelow * p.maxHp);
    if (allowed && step.heal > 0 && this.s.energy.trySpend(step.spend)) {
      const restored = p.heal(Math.round(step.heal * fx.rctHealMul));
      this.shownPending += restored;
      if (restored > 0) this.reverseAura().pulse();
    }
    p.channeling = this.reverse.active;
    // RCA-01..05: presa ao sprite (posição de desenho), com o pé na base do corpo.
    const drawn = p.renderPos;
    this.reverseAura().update(dt, this.reverse.active, this.reverse.warmup, drawn.x, drawn.y + SIZE.player.h / 2);
    this.showReverseHeal(dt);

    // REG-01..04: a passiva não soma com a canalização, que já está curando.
    const passive = this.regen.update(dt, p.hp, p.maxHp, p.dead);
    // VOW-16: a Fúria desliga a regeneração passiva.
    if (passive > 0 && !this.reverse.active && this.passive && !fx.regenOff) p.heal(passive);
  }

  /** REG-05: fechar uma rodada devolve uma fatia da vida máxima, com o "+N" sobre o player. */
  roundCleared(): void {
    const p = this.s.player;
    if (p.dead || !this.passive) return;
    const restored = p.heal(roundClearHeal(p.maxHp, PLAYER_REGEN));
    if (restored <= 0) return;
    this.s.snapshot.debugEvents.push(`roundHeal:${restored}`);
    const at = p.renderPos;
    this.s.floatTexts.spawn(`+${restored}`, 'G', at.x, at.y - 24);
    p.flash('G', 80);
  }

  /** Nova run: sem canalização, sem fração guardada, com a espera da passiva recomeçando. */
  reset(): void {
    this.reverse.reset();
    this.regen.reset();
    this.s.player.channeling = false;
    this.aura?.destroy();
    this.shownPending = 0;
    this.textMs = 0;
  }

  /** "+N" verde a cada `REVERSE_TEXT_MS` de cura, e o que sobrar quando a canalização para (RCT-10). */
  private showReverseHeal(dt: number): void {
    if (this.reverse.healing) this.textMs += dt;
    const flush = this.textMs >= REVERSE_TEXT_MS || !this.reverse.active;
    if (!flush) return;
    if (this.shownPending <= 0) {
      this.textMs = 0;
      return;
    }
    const at = this.s.player.renderPos;
    this.s.floatTexts.spawn(`+${this.shownPending}`, 'G', at.x, at.y - 24);
    this.s.player.flash('G', 80);
    this.shownPending = 0;
    this.textMs = 0;
  }

  /** A cena recria `fxRegistry` ao reiniciar (`R`); a aura acompanha o registro atual. */
  private reverseAura(): ReverseAuraFx {
    if (!this.aura || this.auraRegistry !== this.s.fxRegistry) {
      this.aura = new ReverseAuraFx(
        this.s,
        this.s.realtimeFx,
        this.s.fxRegistry,
        HD_ON ? DRAWN_PLAYER.hd : DRAWN_PLAYER.base,
      );
      this.auraRegistry = this.s.fxRegistry;
    }
    return this.aura;
  }

  private push(events: readonly string[]): void {
    this.s.snapshot.debugEvents.push(...events);
  }
}
