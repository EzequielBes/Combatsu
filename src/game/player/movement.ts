import type { InputSnapshot } from '../input';
import { stepMovement } from '../../core/movement';
import { DEFENSE } from '../../data/moves';
import { CAST_FX } from '../../data/techniques';
import { PLAYER_KNOCKBACK } from '../../data/tuning';
import { PX_PER_S_TO_STEP } from '../physics';
import { RUN_THRESHOLD } from '../../core/animState';
import { type MoveState } from '../../core/movement';
import { PLAYER_MOVE } from '../../data/tuning';
import { bodyOf } from '../physics';
import { SIZE } from '../textures';
import type { Player } from '../Player';

/** Espessura das zonas de sensor de chão/teto (px). */
const SENSOR_DEPTH = 3;
/** Recuo lateral das zonas de sensor (px), para não pegar paredes. */
const SENSOR_INSET = 3;

/** Movimento do player: deslocamento por step de física, pulo com `W`, poeira e sensores de terreno. */
export class PlayerMovement {
  /** Pulo iniciado com `W` (AD-011): relógio de jogo (ms) da saída do chão, y do chão e o aperto de `W` mais recente. */
  wJump: { startMs: number; groundY: number } | null = null;
  lastWPressMs = -Infinity;
  /**
   * Deslocamento x pendente (px) da esquiva, da voadora e do recuo do bloqueio. O Matter roda 0, 1 ou 2 steps por
   * frame conforme o tempo real; aplicar a velocidade do frame em todos os steps fazia o dash de 96 px andar de 96 a
   * 158 px. Aqui o total sai inteiro no primeiro step depois de produzido (mesmo padrão do L-001 do inimigo).
   */
  scriptedDx = 0;
  /** Um step já aplicou `scriptedDx` neste frame: os steps seguintes zeram o x até o próximo `update`. */
  stepDriven = false;
  readonly onStep = (): void => {
    const body = bodyOf(this.p.sprite);
    if (this.scriptedDx !== 0) {
      this.p.scene.matter.body.setVelocity(body, { x: this.scriptedDx, y: body.velocity.y });
      this.scriptedDx = 0;
      this.stepDriven = true;
    } else if (this.stepDriven) {
      this.p.scene.matter.body.setVelocity(body, { x: 0, y: body.velocity.y });
    }
  };

  constructor(private readonly p: Player) {}

  /**
   * Integra o movimento do frame (andar, pulo, gravidade), aplica os deslocamentos dirigidos (golpe, esquiva, recuos),
   * o recuo do golpe recebido e a velocidade do corpo. `frozen` = golpe em curso, atordoado, conjurando, esquivando ou
   * abaixado (sem controle por input); `bounceVy` = velocidade vertical do quique da voadora, ou `null`.
   */
  step(
    dtMs: number,
    input: InputSnapshot,
    sensors: { grounded: boolean; ceiling: boolean },
    frozen: boolean,
    ducking: boolean,
    bounceVy: number | null,
  ): void {
    const before = this.p.move;
    const wPressedAt = input.jumpWPressed ? this.p.clockMs : this.p.loco.lastWPressMs;
    this.p.loco.lastWPressMs = wPressedAt;
    const groundYBefore = this.p.sprite.y;
    // MOD-06: velocidade de corrida lida de `modifiers` a cada frame, sem cache; CAST-11: gravidade a 30% em
    // `sign`/`charge` (só nesses dois estados: em `release`/`recover` a gravidade já volta ao normal).
    const castAirGravity = this.p.castLock?.state === 'sign' || this.p.castLock?.state === 'charge';
    const moveTuning = {
      ...PLAYER_MOVE,
      // DEF-04, DEF-05: com a guarda de pé (`guard` ou `parry`) o jogador vira com a direção (o `stepMovement` já vira o
      // `facing`) e não anda: o fator é 0 e substitui os 40% do GRD-05.
      runSpeed: this.p.modifiers.runSpeed * (this.p.guard.state === 'none' ? 1 : DEFENSE.guardSpeedFactor),
      gravity: castAirGravity ? PLAYER_MOVE.gravity * CAST_FX.airGravity : PLAYER_MOVE.gravity,
    };
    this.p.move = stepMovement(this.p.move, input, sensors, dtMs, moveTuning, frozen);
    // DEF-10: abaixado a velocidade horizontal é 0, sem deslizar a corrida que vinha antes do `S`+`Q`.
    if (ducking) this.p.move = { ...this.p.move, vx: 0 };
    // VOA-06: o quique mantém os −240 px/s no primeiro `update` depois do acerto; a gravidade só atua a partir do seguinte.
    if (bounceVy !== null) this.p.move = { ...this.p.move, vy: bounceVy, jumping: false };
    this.p.strikes.applyMoveTravel(dtMs);
    this.p.strikes.applyStepIn(dtMs);
    this.p.defense.applyDash(dtMs);
    this.p.defense.applyBlockPush(dtMs);
    this.p.strikes.applyPush(dtMs);
    this.p.loco.trackWJump(before, groundYBefore, wPressedAt);
    this.p.loco.kickUpDust(before, sensors.grounded, dtMs);
    // Recuo: enquanto atordoado, empurrado na direção do golpe; morto, fica parado no lugar.
    if (this.p.health.staggered) this.p.move = { ...this.p.move, vx: this.p.knockDir * PLAYER_KNOCKBACK };
    else if (this.p.health.dead) this.p.move = { ...this.p.move, vx: 0 };
    this.p.sprite.setVelocity(this.p.move.vx * PX_PER_S_TO_STEP, this.p.move.vy * PX_PER_S_TO_STEP);
  }

  /** Guarda de onde saiu um pulo iniciado com `W` (AD-011); qualquer outro pulo ou o pouso apaga a marca. */
  trackWJump(before: MoveState, groundY: number, wPressedAt: number): void {
    const jumped = this.p.move.jumping && !before.jumping;
    if (jumped) {
      const fromW = this.p.clockMs - wPressedAt <= PLAYER_MOVE.jumpBufferMs;
      this.wJump = fromW ? { startMs: this.p.clockMs, groundY } : null;
    } else if (this.wJump && this.touchesTerrain('below') && this.p.move.vy >= 0) {
      this.wJump = null;
    }
  }

  /** Poeira nos pés (FX-04): ao pular, ao pousar e ao virar enquanto corre no chão. */
  kickUpDust(before: MoveState, grounded: boolean, dtMs: number): void {
    const jumped = this.p.move.jumping && !before.jumping;
    const landed = grounded && !this.p.wasGrounded;
    const turned = grounded && this.p.move.facing !== before.facing && Math.abs(before.vx) > RUN_THRESHOLD;
    this.p.wasGrounded = grounded;
    this.p.landMs = landed ? 0 : this.p.landMs + dtMs;
    if (jumped || landed || turned) this.p.fx.dust(this.p.sprite.x, this.p.sprite.y + SIZE.player.h / 2);
  }

  /**
   * Sensor por região: uma faixa fina logo abaixo (ou acima) do corpo, recuada das laterais para não pegar paredes.
   * A região sai da posição + tamanho do sprite, não de `body.bounds`: o Matter alarga o AABB pela velocidade do
   * frame, e empurrando a parede a ~3,7 px/step isso passava da folga lateral e a parede virava "teto"/"chão".
   */
  touchesTerrain(side: 'below' | 'above'): boolean {
    const { x, y } = bodyOf(this.p.sprite).position;
    const halfW = this.p.sprite.displayWidth / 2;
    const halfH = this.p.sprite.displayHeight / 2;
    const y0 = side === 'below' ? y + halfH : y - halfH - SENSOR_DEPTH;
    const region = {
      min: { x: x - halfW + SENSOR_INSET, y: y0 },
      max: { x: x + halfW - SENSOR_INSET, y: y0 + SENSOR_DEPTH },
    };
    return this.p.scene.matter.query.region(this.p.terrain, region).length > 0;
  }
}
