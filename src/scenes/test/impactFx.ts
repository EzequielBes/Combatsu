import { type Hit, type Vec2 } from '../../core/hit';
import { FINISHER_MOVE, MOVES } from '../../data/moves';
import { type Hittable } from '../../game/bodyTags';
import { Enemy } from '../../game/Enemy';
import { impactTier, type ImpactTier } from '../../core/impactTier';
import { CAMERA_FEEL } from '../../data/feel';
import { strikeToWorld } from '../../core/strikePath';
import { STRIKE_POINTS } from '../../game/art/sprites/strikePoints';
import { HD_ON } from '../../game/art/hd/flag';
import { hdStrike } from '../../game/art/hd/sheet';
import { currentSearch, rigStrike } from '../../game/art/rig/flag';
import { PLAYER_FRAME_H, PLAYER_FRAME_W, PLAYER_ORIGIN } from '../../game/art/sprites/player';
import { SIZE } from '../../game/textures';
import type { TestScene } from '../TestScene';

/** Efeitos do golpe do jogador: impacto amaldiçoado, reação da câmera, rastro, chama e rachadura. */
export class ImpactFx {
  constructor(readonly s: TestScene) {}

  /** Último impacto do golpe do jogador, para o snapshot (IMP-16). */
  lastImpact: { tier: ImpactTier; impactFrame: boolean } | null = null;

  /** `swingId` do último golpe que recebeu o quadro de impacto (IMP-14, IMP-16). */
  framedSwingId: number | null = null;

  /** Quadros sem ponto de golpe já avisados (EDG-01: um aviso por nome). */
  warnedStrikeFrames = new Set<string>();

  /** Golpe do jogador em startup com a chama acesa (TRL-07), para a chama seguir o ponto de golpe. */
  flameMove: string | null = null;

  /** Inimigos derrubados por golpe do jogador esperando tocar o chão para ganhar a rachadura (IMP-15). */
  crackWatch = new Map<Enemy, number>();

  /** Inimigos quebrados no começo do frame, para saber qual golpe quebrou a postura (IMP-03). */
  brokenAtFrameStart = new Set<number>();

  /** Quadro do jogo em que o último Kokusen disparou (IMP-13). */
  kokusenFrame = -1;

  /**
   * Impacto do golpe corpo a corpo do jogador (IMP-06..16): nível, camadas do `CursedFx`, quadro de impacto só no
   * decisivo sem Kokusen e uma vez por golpe (IMP-11, IMP-13, IMP-14), e a rachadura na queda da derrubada.
   */
  onMeleeImpact(hit: Hit, point: Vec2, target?: Hittable): void {
    const brokePosture = target instanceof Enemy && target.broken && !this.brokenAtFrameStart.has(target.id);
    const tier = impactTier(hit, { brokePosture });
    this.s.cursedFx.impact(
      tier,
      point,
      { x: hit.direction.x, y: hit.direction.y },
      hit.swingId ?? Math.floor(this.s.clockMs),
    );
    const kokusen = this.kokusenFrame === this.s.game.getFrame();
    const framed =
      tier === 'decisive' && !kokusen && hit.swingId !== undefined ? this.s.impactFrame.trigger(hit.swingId) : false;
    if (framed) this.framedSwingId = hit.swingId ?? null;
    // IMP-16: só o golpe que ganhou o filtro (ou outro alvo do mesmo golpe, IMP-14) reporta `impactFrame`.
    this.lastImpact = {
      tier,
      impactFrame:
        framed || (this.s.impactFrame.applied && hit.swingId !== undefined && hit.swingId === this.framedSwingId),
    };
    this.s.snapshot.debugEvents.push(`impact:${tier}`);
    // RCT-01, RCT-02: o inimigo comum que fica de pé desliza para longe do jogador.
    if (target instanceof Enemy) target.slideBy(tier, hit.direction.x >= 0 ? 1 : -1);
    if (hit.knockdown && target instanceof Enemy) this.crackWatch.set(target, this.s.clockMs);
    this.reactCamera(tier, hit, point, brokePosture);
  }

  /**
   * Câmera que reage ao impacto (CAM-01..05, CAM-07): tranco no forte, micro-zoom no decisivo (nunca durante o zoom
   * do finalizador) e câmera lenta na quebra de postura e no Contra; um novo gatilho reinicia sem empilhar (CAM-04).
   */
  reactCamera(tier: ImpactTier, hit: Hit, point: Vec2, brokePosture: boolean): void {
    if (tier === 'decisive') this.s.focusLines.show(this.s.camera.worldToScreen(point));
    if (tier === 'heavy') this.s.camera.cameraKick.kick(hit.direction.x, hit.direction.y);
    const cam = this.s.cameras.main;
    // O finalizador é decisivo, mas o zoom dele manda (CAM-05); `finisherZoomMs` só liga depois do `onConnect`.
    if (
      tier === 'decisive' &&
      hit.moveName !== FINISHER_MOVE &&
      this.s.camera.finisherZoomMs <= 0 &&
      !cam.zoomEffect.isRunning
    ) {
      this.s.camera.zoomPulse.start();
      this.s.camera.zoomPulseMs = CAMERA_FEEL.zoomInMs + CAMERA_FEEL.zoomHoldMs + CAMERA_FEEL.zoomOutMs;
    }
    if (brokePosture || hit.counter) this.s.effects.slowMo.trigger(CAMERA_FEEL.slowScale, CAMERA_FEEL.slowMs);
  }

  /** Fase do golpe do jogador: rastro no `active` e chama no startup do forte (TRL-03, TRL-07, TRL-08, EDG-01). */
  onStrikePhase(name: string, phase: 'startup' | 'active' | 'recovery' | 'end'): void {
    const strength = MOVES[name]?.strength ?? 'light';
    if (phase === 'startup') {
      if (strength !== 'heavy') return;
      const wind = this.strikeWorld(`${name}-wind`);
      if (!wind) return;
      this.flameMove = name;
      this.s.cursedFx.flameStart(wind);
    } else if (phase === 'active') {
      this.stopFlame();
      const from = this.strikeWorld(`${name}-wind`);
      const to = this.strikeWorld(`${name}-hit`);
      if (from && to) this.s.cursedFx.trail([from, to], strength);
    } else {
      this.stopFlame();
    }
  }

  stopFlame(): void {
    this.flameMove = null;
    this.s.cursedFx.flameStop();
  }

  /** Ponto de golpe do quadro em coordenadas de mundo; `null` (com um aviso por nome) sem entrada (EDG-01). */
  strikeWorld(frameName: string): Vec2 | null {
    // PRA-08: com o boneco, o wind e o hit do gancho saem do pulso do heroico alto, no frame dele (40x40, eixo na coluna 12).
    // `?hd=1`: o corpo HD tem ponto de golpe próprio (1 px por texel); vence o boneco.
    const hd = HD_ON ? hdStrike(frameName) : undefined;
    const rig = hd ? { pt: hd.pt, frame: { ...hd.frame, texelPx: hd.texelPx } } : rigStrike(frameName, currentSearch());
    const pt = rig?.pt ?? STRIKE_POINTS[frameName];
    if (!pt) {
      if (!this.warnedStrikeFrames.has(frameName)) {
        this.warnedStrikeFrames.add(frameName);
        console.warn(`Sem ponto de golpe para o quadro ${frameName}: nenhum rastro.`);
      }
      return null;
    }
    const drawn = this.s.player.renderPos;
    return strikeToWorld(
      pt,
      { x: drawn.x, footY: drawn.y + SIZE.player.h / 2 },
      this.s.player.facing,
      rig?.frame ?? { originCol: PLAYER_ORIGIN.x * PLAYER_FRAME_W, rows: PLAYER_FRAME_H },
    );
  }

  /** Por quadro: a chama segue o ponto de golpe, o jogador atingido apaga a chama (EDG-02) e a rachadura espera o chão. */
  updateCursedFx(): void {
    if (this.flameMove !== null) {
      const at = this.strikeWorld(`${this.flameMove}-wind`);
      if (at && this.s.player.hp >= this.s.lastPlayerHp && !this.s.player.dead) this.s.cursedFx.flameMove(at);
      else this.stopFlame();
    }
    for (const [enemy, since] of this.crackWatch) {
      const bodies = enemy.ragdollBodies;
      if (enemy.removed || this.s.clockMs - since > 3000 || (bodies === null && this.s.clockMs - since > 400)) {
        this.crackWatch.delete(enemy);
        continue;
      }
      if (bodies === null) continue;
      const touching = bodies.find(
        (b) =>
          this.s.matter.query.region(this.s.terrain, {
            min: { x: b.bounds.min.x, y: b.bounds.max.y - 1 },
            max: { x: b.bounds.max.x, y: b.bounds.max.y + 2 },
          }).length > 0,
      );
      if (touching) {
        this.s.cursedFx.crack({ x: touching.position.x, y: touching.bounds.max.y });
        this.crackWatch.delete(enemy);
      }
    }
  }
}
