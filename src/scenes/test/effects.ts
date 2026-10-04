import { type Hit, type Vec2 } from '../../core/hit';
import { Hitstop } from '../../core/hitstop';
import { SlowMo } from '../../core/slowMo';
import { HITSTOP_MS } from '../../data/fx';
import { MAX_FRAME_MS } from '../../game/physics';
import type { TestScene } from '../TestScene';

/** Diretor de efeitos de tempo: hitstop (congelamento), câmera lenta e escala de tempo do jogo. */
export class EffectsDirector {
  constructor(readonly s: TestScene) {}

  readonly hitstop = new Hitstop();

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
   * (CE-08 - dano de técnica não passa pelo `onConnect` normal, de propósito).
   */
  onTechConnect(hit: Hit, point: Vec2): void {
    this.s.fx.spark(point.x, point.y, hit.strength);
    if (hit.strength === 'heavy') this.s.fx.shake();
    this.hitstop.trigger(HITSTOP_MS[hit.strength]);
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
