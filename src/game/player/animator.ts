import Phaser from 'phaser';
import {
  RUN_THRESHOLD,
  attackFrame,
  pickPlayerAnim,
  type AttackPhase,
  type PlayerAnimInput,
} from '../../core/animState';
import { CHARGE_MS, DODGE } from '../../data/moves';
import { playerAnimKey } from '../art';
import { PALETTE } from '../art/palette';
import { PLAYER_ORIGIN } from '../art/sprites/player';
import { RIG_ON, RIG_TALL_ORIGIN, rigMoveFrame } from '../art/rig/flag';
import { HD_ON } from '../art/hd/flag';
import { HD_ORIGIN, hdHasAnim, hdHasFrame, hdHasMove, hdHeldName, hdMoveFrame, playerHdAnimKey } from '../art/hd/sheet';
import { PLAYER_MOVE, PROP_SWING } from '../../data/tuning';
import { SIZE, TEX } from '../textures';
import type { Player } from '../Player';

/** Animações de corrida cujo ritmo na folha HD acompanha a velocidade de corrida. */
const HD_RUN_ANIMS: ReadonlySet<string> = new Set(['run', 'carry-run']);
/** Piscar da invulnerabilidade: meio período (ms) e alpha da fase apagada. */
const BLINK_MS = 70;
const BLINK_ALPHA = 0.25;
/** Troca de frame do atordoamento da guarda quebrada (ms). */
const STUN_FRAME_MS = 120;
/** Alpha do corpo enquanto a esquiva torna invulnerável. */
const DODGE_ALPHA = 0.6;
/** Frame da esquiva pelo tempo que falta de recarga (450 ms desde o início): primeira metade `dodge-0`, depois `dodge-1`. */
const DODGE_ELAPSED_HALF = (cooldownMs: number): 0 | 1 =>
  DODGE.cooldownMs - cooldownMs < DODGE.durationMs / 2 ? 0 : 1;

/** Animador do player: escolha de frame e de folha de sprite (inclui o caminho `rig=1`/`player-rig`), piscar e flash. */
export class PlayerAnimator {
  private rigPhaseKey = '';
  private rigPhaseT0 = 0;
  private chargeTinted = false;
  /** Flash sólido temporário (HEAL-10, ex.: cura), independente do piscar de invulnerabilidade. */
  flashMs = 0;
  flashColor: string | null = null;

  constructor(private readonly p: Player) {}

  /** Troca a folha do sprite visível (e a origem dela) só quando muda: `player-art` ou, no gancho com o boneco, `player-rig` (PRA-08). */
  setSheet(texture: string, origin: { x: number; y: number }): void {
    if (this.p.view.texture.key === texture) return;
    this.p.view.setTexture(texture);
    this.p.view.setOrigin(origin.x, origin.y);
  }

  /** Põe o sprite visível, com a origem no pé, na posição de desenho do corpo, na folha pedida (a normal por padrão). */
  placeView(texture: string = TEX.playerArt, origin: { x: number; y: number } = PLAYER_ORIGIN): void {
    this.setSheet(texture, origin);
    const p = this.p.renderPos;
    this.p.view.setPosition(p.x, p.y + SIZE.player.h / 2);
  }

  /** Pisca enquanto invulnerável (HP-02). */
  blink(dtMs: number): void {
    if (!this.p.health.invulnerable) {
      this.p.blinkMs = 0;
      this.p.view.setAlpha(this.p.dodge.invulnerable ? DODGE_ALPHA : 1);
      return;
    }
    this.p.blinkMs += dtMs;
    this.p.view.setAlpha(Math.floor(this.p.blinkMs / BLINK_MS) % 2 === 0 ? BLINK_ALPHA : 1);
  }

  /** Flash sólido por `ms` (HEAL-10), na cor da PALETTE indicada; independente do piscar de invulnerabilidade. */
  flash(colorKey: string, ms: number): void {
    this.flashMs = ms;
    this.flashColor = colorKey;
    this.p.view.setTint(PALETTE[colorKey]).setTintMode(Phaser.TintModes.FILL);
  }

  tickFlash(dtMs: number): void {
    if (this.flashMs <= 0) return;
    this.flashMs -= dtMs;
    if (this.flashMs <= 0) {
      this.p.view.clearTint();
      this.flashColor = null;
    }
  }

  /**
   * Escolhe a animação pelo animState (CHR-01). Nos golpes o frame sai da fase do combo (CHR-02), não do relógio
   * da animação: na fase ativa, com a hitbox ligada, aparece o frame *-hit com o membro esticado.
   */
  /** Ms desde que a fase atual do golpe começou (só para os quadros do boneco, `?debug&rig=1`). */
  rigPhaseMs(phase: AttackPhase): number {
    return this.phaseMs(`${this.p.strikes.swingId}:${phase}`);
  }

  /** Ms desde que a chave de fase `k` passou a valer (a chave muda a cada fase de cada golpe). */
  private phaseMs(k: string): number {
    if (this.rigPhaseKey !== k) {
      this.rigPhaseKey = k;
      this.rigPhaseT0 = this.p.clockMs;
    }
    return this.p.clockMs - this.rigPhaseT0;
  }

  /** Quadro do golpe em curso pelo boneco (`?debug&rig=1`, sem `?hd=1`), ou `undefined`. */
  private rigFrame(
    mv: { name: string; startupMs: number; activeMs: number; recoveryMs: number },
    phase: AttackPhase,
    ms: number,
  ): string | undefined {
    // PRA-08: os quadros do heroico alto estão na folha `player-rig` (40x40, origem no pé na coluna 12).
    return RIG_ON && !HD_ON ? rigMoveFrame(mv.name, phase, ms, mv) : undefined;
  }

  /**
   * Mostra um quadro parado. Com `?hd=1`, na folha HD (1 texel = 1 px) se ela já tem o quadro; senão na folha normal.
   * Escala negativa espelha em volta da origem (o pé no centro do corpo); o flipX espelharia em volta do centro do
   * frame, que é mais largo que o corpo.
   */
  private show(name: string): Phaser.GameObjects.Sprite {
    const v = this.p.view;
    const frame = HD_ON ? hdHeldName(name, this.heavyHeld(), hdHasFrame) : name;
    if (HD_ON && hdHasFrame(frame)) this.placeView(TEX.playerHd, HD_ORIGIN);
    else this.placeView();
    v.setScale(this.p.facing, 1);
    v.anims.stop();
    v.setFrame(frame);
    return v;
  }

  /** O objeto na mão é dos pesados (cadeira, clava): com `?hd=1` a pegada é a do ombro, com os quadros `heavy-`. */
  private heavyHeld(): boolean {
    return this.p.held?.def.socket === 'back';
  }

  /**
   * Quadro do golpe com objeto (`?hd=1`): a sequência HD da pegada em uso, pela fase do golpe; `undefined` sem ela.
   */
  private propSwingFrame(phase: AttackPhase): string | undefined {
    if (!HD_ON) return undefined;
    const move = hdHeldName('swing', this.heavyHeld(), hdHasMove);
    return hdMoveFrame(move, phase, this.phaseMs(`prop:${phase}`), PROP_SWING);
  }

  /** Toca uma animação, na folha HD quando ela tem todos os quadros dela (`?hd=1`). */
  private play(name: string): Phaser.GameObjects.Sprite {
    const v = this.p.view;
    const anim = HD_ON ? hdHeldName(name, this.heavyHeld(), hdHasAnim) : name;
    const hd = HD_ON && hdHasAnim(anim);
    if (hd) this.placeView(TEX.playerHd, HD_ORIGIN);
    else this.placeView();
    v.setScale(this.p.facing, 1);
    v.anims.play(hd ? playerHdAnimKey(anim) : playerAnimKey(anim), true);
    // A corrida HD tem o passo medido para a velocidade de corrida base: com a corrida mais rápida (MOD-06) o ciclo
    // acelera na mesma proporção, e o pé de apoio continua sem patinar.
    v.anims.timeScale = hd && HD_RUN_ANIMS.has(name) ? this.p.modifiers.runSpeed / PLAYER_MOVE.runSpeed : 1;
    return v;
  }

  /** Estados que travam o frame antes do golpe e da locomoção; devolve o nome do frame, ou `undefined`. */
  private lockedFrame(): { frame: string; trail?: boolean } | undefined {
    const p = this.p;
    const down = p.health.staggered || p.health.dead;
    // CAST-13: em qualquer fase da conjuração, o frame vem do `castLock`, não do animState normal.
    if (p.castLock) return { frame: `${p.castLock.id}-${p.castLock.state}` };
    // RCT-05: canalizando a Energia Reversa, o selo de mão parado.
    if (p.channeling && !down) return { frame: 'azul-sign' };
    if (p.poseMs > 0 && !down) return { frame: 'palmaExplosiva-hit', trail: true };
    // Guarda quebrada (STR-06): cambaleia alternando os dois frames de atordoamento.
    if (p.structure.broken && !p.health.dead) return { frame: `stunned-${Math.floor(p.clockMs / STUN_FRAME_MS) % 2}` };
    // Esquiva (DOD-01/11): corpo encolhido e rastro de imagens; o segundo frame na metade final do dash.
    if (p.dodge.active) return { frame: `dodge-${DODGE_ELAPSED_HALF(p.dodge.cooldownMs)}`, trail: true };
    // Abaixar (DEF-09): corpo agachado parado enquanto durar.
    if (p.duck.active && !down) return { frame: 'duck' };
    // CTL-09: guarda ou janela de parry mostram o frame `guard`. Com `?hd=1` a janela de parry mostra a deflexão
    // (`parry`), que na folha antiga existe mas nunca foi usada.
    if (p.guard.state !== 'none' && !down && !p.moves.isMoving)
      return { frame: HD_ON && p.guard.state === 'parry' ? 'parry' : 'guard' };
    return undefined;
  }

  /** Golpe do grafo: o frame vem da fase, não do relógio da animação (CHR-02). Devolve se havia golpe. */
  private animateMove(): boolean {
    const mv = this.p.moves.def;
    if (!mv || this.p.health.staggered || this.p.health.dead) return false;
    const phase = this.p.moves.phase as AttackPhase;
    const ms = this.rigPhaseMs(phase);
    // Com `?hd=1` o golpe com sequência HD toca os quadros dela; os outros caem no `-wind/-hit/-recover`.
    const hd = HD_ON ? hdMoveFrame(mv.name, phase, ms, mv) : undefined;
    const rig = this.rigFrame(mv, phase, ms);
    let v: Phaser.GameObjects.Sprite;
    if (rig) {
      v = this.p.view;
      this.placeView(TEX.playerRig, RIG_TALL_ORIGIN);
      v.setScale(this.p.facing, 1);
      v.anims.stop();
      v.setFrame(rig);
    } else {
      v = this.show(hd ?? `${mv.name}-${attackFrame(phase)}`);
    }
    if (phase === 'active' && mv.strength === 'heavy') this.p.fx.afterimage(v);
    return true;
  }

  animate(grounded: boolean): void {
    const locked = this.lockedFrame();
    if (locked) {
      const v = this.show(locked.frame);
      if (locked.trail) this.p.fx.afterimage(v);
      return;
    }
    if (this.animateMove()) return;
    this.tickChargeGlow();
    const input: PlayerAnimInput = {
      // Atordoado pelo golpe ou morto até o respawn.
      hurt: this.p.health.staggered || this.p.health.dead,
      attack: this.currentAttack(grounded),
      grounded,
      vx: this.p.move.vx,
      vy: this.p.move.vy,
      holding: this.p.held !== null,
      landMs: this.p.landMs,
    };
    const anim = pickPlayerAnim(input);
    const still = input.attack && anim !== 'throw' && anim !== 'hurt';
    const swing = still && anim === 'swing' ? this.propSwingFrame(input.attack!.phase as AttackPhase) : undefined;
    const v = still ? this.show(swing ?? `${anim}-${attackFrame(input.attack!.phase)}`) : this.play(anim);
    // Rastro enquanto o chute está na fase ativa ou a pose de arremesso está na tela (FX-05), já com o frame novo.
    if ((anim === 'kick' && input.attack?.phase === 'active') || anim === 'throw') this.p.fx.afterimage(v);
  }

  /** Chute carregado pronto (segurando `K` há CHARGE_MS): o corpo pisca branco (direção de arte do grafo). */
  tickChargeGlow(): void {
    if (this.flashMs > 0) return;
    const charged = this.p.heavyHoldMs >= CHARGE_MS;
    if (charged) {
      this.chargeTinted = true;
      if (Math.floor(this.p.clockMs / 80) % 2 === 0) this.p.view.setTint(PALETTE.w).setTintMode(Phaser.TintModes.FILL);
      else this.p.view.clearTint();
    } else if (this.chargeTinted) {
      this.chargeTinted = false;
      this.p.view.clearTint();
    }
  }

  /** Golpe em andamento para a animação. Na janela do combo, só enquanto o player está parado no chão. */
  currentAttack(grounded: boolean): PlayerAnimInput['attack'] {
    if (this.p.throwPoseMs > 0) return { name: 'throw', phase: 'active' };
    const still = grounded && Math.abs(this.p.move.vx) <= RUN_THRESHOLD;
    const swing = this.p.propSwing.phase;
    if (swing !== 'idle' && (swing !== 'window' || still)) return { name: 'swing', phase: swing };
    return null;
  }
}
