import { techKind } from '../../core/damageNumber';
import { type Hit, type Vec2 } from '../../core/hit';
import { MicroBudget } from '../../core/hitBand';
import { Hitstop } from '../../core/hitstop';
import { SlowMo } from '../../core/slowMo';
import { HIT_BAND_FEEL } from '../../data/feel';
import { HITSTOP_MS } from '../../data/fx';
import type { TechId } from '../../data/techniques';
import type { Hittable } from '../../game/bodyTags';
import { MAX_FRAME_MS } from '../../game/physics';
import type { TestScene } from '../TestScene';

/** Diretor de efeitos de tempo: hitstop (congelamento), câmera lenta e escala de tempo do jogo. */
export class EffectsDirector {
  constructor(readonly s: TestScene) {}

  readonly hitstop = new Hitstop();

  /** Teto do hitstop dos acertos micro (POW-03, POW-14), contado no relógio real do jogo. */
  readonly microBudget = new MicroBudget();

  /** Câmera lenta da esquiva perfeita (DOD-07), em tempo real; a escala vai para o tempo de jogo (`applyTimeScale`). */
  slowMo = new SlowMo();

  /** Se a pausa do hitstop está aplicada (física, animações, tweens e timers). */
  frozen = false;

  /** Aplica a escala da câmera lenta (e do laboratório de efeitos) ao tempo de jogo: timers, tweens e física. */
  applyTimeScale(): void {
    const scale = this.slowMo.timeScale * (this.s.fxLab?.timeScale ?? 1);
    if (this.s.time.timeScale !== scale) this.s.time.timeScale = scale;
    if (this.s.tweens.timeScale !== scale) this.s.tweens.timeScale = scale;
    const timing = this.s.matter.world.engine.timing;
    if (timing.timeScale !== scale) timing.timeScale = scale;
  }

  /**
   * Golpe de técnica que conectou (T22+): mesma faísca + tremida + hitstop de FX-01..03, mas sem o +3 de CE-06
   * (CE-08 - dano de técnica não passa pelo `onConnect` normal, de propósito). As faixas (POW-03) aliviam o dano
   * frequente: o chip só risca a faísca pequena, sem hitstop nem `freeze`; o micro ganha 15/20 ms enquanto o teto
   * deixa (a faísca média sai mesmo com o teto cheio). Nenhuma das duas treme a câmera. Todo acerto, de qualquer
   * faixa, mostra no alvo o dano que ele levou (o chefe em `stagger` leva ×1,5, BFX-05), com o tipo da faixa (`tech`,
   * `micro` ou `chip`, POW-06.7). O dano entra no registro da run pela técnica de origem, antes da faixa (DMG-02; o
   * Kokusen chega como `divergente`, DMG-07).
   */
  onTechConnect(hit: Hit, point: Vec2, target: Hittable, source: TechId): void {
    this.s.runDirector.record.onTechHit(source, hit.damage);
    this.s.ui.damageNumbers.show(target, target.lastDamageTaken ?? hit.damage, techKind(hit.band), point);
    if (hit.band === 'chip') {
      this.s.fx.spark(point.x, point.y, hit.strength, HIT_BAND_FEEL.chip.sparkSize);
      return;
    }
    if (hit.band === 'micro') {
      this.s.fx.spark(point.x, point.y, hit.strength, HIT_BAND_FEEL.micro.sparkSize);
      // Relógio real: o hitstop congela o tempo de jogo, e a janela do teto precisa andar durante ele.
      const ms = this.microBudget.grant(hit.strength, this.s.game.loop.time);
      if (ms > 0) this.stop(ms);
      return;
    }
    this.s.fx.spark(point.x, point.y, hit.strength);
    if (hit.strength === 'heavy') this.s.fx.shake();
    // VRM-04: a detonação do Vermelho soma o hitstop da Potência (o toque e o estilhaço não trazem bônus).
    this.stop(HITSTOP_MS[hit.strength] + (hit.hitstopBonusMs ?? 0));
  }

  /** Dispara o hitstop de `ms` e congela a cena. */
  private stop(ms: number): void {
    this.hitstop.trigger(ms);
    this.freeze();
  }

  /**
   * Conta o hitstop no PRE_UPDATE, antes do step do Matter (que roda no UPDATE): ao acabar, a física já anda
   * neste mesmo frame. O frame em que o golpe conectou não conta, porque o golpe veio no meio dele.
   */
  tickHitstop(_time: number, delta: number): void {
    if (!this.frozen) return;
    this.hitstop.update(Math.min(delta, MAX_FRAME_MS));
    if (!this.hitstop.frozen) this.unfreeze();
  }

  freeze(): void {
    if (this.frozen) return;
    this.frozen = true;
    this.s.matter.world.pause();
    this.s.anims.pauseAll();
    this.s.tweens.pauseAll();
    this.s.time.paused = true;
  }

  /** Retoma tudo. Seguro de chamar sem congelamento (no create e no SHUTDOWN). */
  unfreeze(): void {
    this.frozen = false;
    this.s.matter.world?.resume();
    this.s.anims.resumeAll();
    this.s.tweens.resumeAll();
    this.s.time.paused = false;
  }
}
