import type { AIOutput } from '../../core/enemyAI';
import type { Vec2 } from '../../core/hit';
import type { ImpactTier } from '../../core/impactTier';
import { Slide } from '../../core/slide';
import { SLIDE_FEEL } from '../../data/feel';
import { PX_PER_S_TO_STEP } from '../physics';
import { SIZE } from '../textures';
import type { EnemyCtx } from './context';

/** Empurrão scriptado (SPC-02): número de steps do Matter em que o corpo anda os px do golpe. */
const SLIDE_STEPS = 25;

/**
 * Movimento do inimigo: o andar da IA reaplicado a cada step do Matter (AI-06), o puxão do orbe Azul (BLU-04), o
 * empurrão scriptado (SPC-02, MOV-*) e o deslizamento do golpe forte (RCT-01..05).
 */
export class EnemyMovement {
  /** BLU-04: velocidade (px/step) do puxão do orbe Azul, reaplicada a cada step (L-001); `null` fora do raio. */
  private pull: Vec2 | null = null;
  /** Deslizamento do golpe forte/decisivo (RCT-01, RCT-02); distinto do empurrão scriptado `slide` (SPC-02). */
  private readonly hitSlide = new Slide();
  private hitSlideDir: 1 | -1 = 1;
  private slideResidueMs = 0;
  /** Quem já foi esbarrado neste deslizamento (RCT-04: uma vez por inimigo). */
  private readonly slideTouched = new Set<object>();
  /** Empurrão scriptado em curso (SPC-02, MOV-*): velocidade x por step e steps que faltam. */
  private slide: {
    vxStep: number;
    stepsLeft: number;
    friction: Map<MatterJS.BodyType, { f: number; fs: number }>;
  } | null = null;

  constructor(private readonly c: EnemyCtx) {}

  /** BLU-04/05: puxão do orbe Azul (px/step, já convertido); `null` limpa (fora do raio ou orbe sumiu). */
  setPull(velocity: Vec2 | null): void {
    this.pull = velocity;
  }

  /** Um step do Matter (antes do update da cena): empurrão, puxão ou o andar da IA. */
  onStep(): void {
    const { scene, body, brain, s } = this.c;
    if (this.slide) {
      this.stepSlide();
      return;
    }
    // Os steps do Matter rodam antes do update da cena: sem este teste, o vx de andar do frame anterior passava
    // por cima do empurrão de um golpe recebido neste frame.
    if (brain.state !== 'idle' || s.ragdoll) return;
    if (this.pull) {
      scene.matter.body.setVelocity(body, { x: this.pull.x, y: this.pull.y });
      return;
    }
    if (s.walkVxStep === null) return;
    scene.matter.body.setVelocity(body, { x: s.walkVxStep, y: body.velocity.y });
  }

  /** Guarda o vx de andar desta passada da IA para o `onStep` reaplicar (AI-06). */
  setWalk(out: AIOutput, canAct: boolean): void {
    const s = this.c.s;
    s.walkVxStep = canAct && !s.ragdoll ? out.vx * PX_PER_S_TO_STEP : null;
  }

  /** Corpo escondido acompanha o tronco para o "levantar" nascer no lugar certo. */
  followRagdoll(): void {
    const { scene, body, s } = this.c;
    if (!s.ragdoll) return;
    scene.matter.body.setPosition(body, s.ragdoll.center);
    scene.matter.body.setVelocity(body, { x: 0, y: 0 });
  }

  /** Fora do ragdoll: para no lugar quando a IA não age e anda quando ela age. */
  drive(out: AIOutput, canAct: boolean, graceActive: boolean): void {
    const { scene, body, brain, s } = this.c;
    // Aparado ou quebrado com o cérebro livre: fica no lugar, sem andar (PAR-10, STR-05).
    if (!canAct && brain.state === 'idle' && !graceActive && !this.slide) {
      scene.matter.body.setVelocity(body, { x: 0, y: body.velocity.y });
    }
    if (canAct) {
      s.facing = out.facing;
      // A IA só mexe no x; o y fica com a física (gravidade). Sem canAct o empurrão do golpe segue livre.
      scene.matter.body.setVelocity(body, { x: out.vx * PX_PER_S_TO_STEP, y: body.velocity.y });
    }
  }

  /**
   * Começa o deslizamento do inimigo que ficou de pé depois de um golpe `heavy` ou `decisive` (RCT-01, RCT-02).
   * Derrubado, morto ou comprometido (o golpe foi absorvido) não desliza; `dir` é o lado para onde ele vai.
   */
  slideBy(tier: ImpactTier, dir: 1 | -1): void {
    const { brain, ai, s } = this.c;
    if (tier === 'light' || s.ragdoll || brain.isDead || ai.committed) return;
    this.hitSlide.start(tier, dir);
    this.hitSlideDir = dir;
    this.slideResidueMs = 0;
    this.slideTouched.clear();
  }

  /** Deslizamento em curso para o snapshot (RCT-06); `null` fora dele. */
  get slideView(): { remainingPx: number } | null {
    const remaining = this.hitSlide.remainingPx;
    return remaining === null ? null : { remainingPx: Math.round(remaining * 10) / 10 };
  }

  /** Um passo do deslizamento (tempo de jogo): anda, deixa resíduo, esbarra e para na parede (RCT-03..05). */
  stepHitSlide(dtMs: number): void {
    const { scene, body, brain, hooks, s } = this.c;
    if (this.hitSlide.remainingPx === null) return;
    if (s.ragdoll || brain.isDead) {
      this.hitSlide.start('light', 1);
      return;
    }
    const dir = this.hitSlideDir;
    const b = body.bounds;
    const blocked = hooks.isWall({
      min: { x: dir > 0 ? b.max.x : b.min.x - 2, y: b.min.y + 2 },
      max: { x: dir > 0 ? b.max.x + 2 : b.min.x, y: b.max.y - 2 },
    });
    const dx = this.hitSlide.update(dtMs, blocked);
    // O deslizamento manda no x: anula o impulso da reação para o deslocamento ser exatamente o pedido.
    scene.matter.body.setPosition(body, { x: body.position.x + dx, y: body.position.y });
    scene.matter.body.setVelocity(body, { x: 0, y: body.velocity.y });
    this.slideResidueMs += dtMs;
    while (this.slideResidueMs >= SLIDE_FEEL.residueEveryMs) {
      this.slideResidueMs -= SLIDE_FEEL.residueEveryMs;
      hooks.slideResidue({ x: body.position.x, y: body.position.y + SIZE.enemy.h / 2 });
    }
    for (const other of hooks.slideTouch()) {
      if (this.slideTouched.has(other)) continue;
      this.slideTouched.add(other);
      other.touched();
    }
  }

  startSlide(dir: 1 | -1, px: number): void {
    this.slide = { vxStep: (dir * px) / SLIDE_STEPS, stepsLeft: SLIDE_STEPS, friction: new Map() };
    // Sem atrito durante o empurrão: o chão não come o deslocamento, que fica exato (SPC-02); volta ao fim.
    for (const b of this.c.s.ragdoll ? this.c.s.ragdoll.bodies : [this.c.body]) {
      this.slide.friction.set(b, { f: b.friction, fs: b.frictionStatic });
      b.friction = 0;
      b.frictionStatic = 0;
    }
  }

  /**
   * Um step do empurrão: velocidade x fixa (L-001) em todas as partes por `SLIDE_STEPS` steps; o step seguinte
   * zera o x e devolve o atrito (deslocamento exato).
   */
  private stepSlide(): void {
    const slide = this.slide;
    if (!slide) return;
    const done = slide.stepsLeft === 0;
    const bodies = this.c.s.ragdoll ? this.c.s.ragdoll.bodies : [this.c.body];
    for (const b of bodies) {
      // Matter descontou `frictionAir` da velocidade a cada step: compensa para o corpo andar os px pedidos.
      const vx = done ? 0 : slide.vxStep / (1 - b.frictionAir);
      this.c.scene.matter.body.setVelocity(b, { x: vx, y: b.velocity.y });
    }
    if (done) this.endSlide();
    else slide.stepsLeft -= 1;
  }

  /** Devolve o atrito original às partes (as que já foram destruídas pelo getUp/remoção são ignoradas). */
  private endSlide(): void {
    const slide = this.slide;
    this.slide = null;
    if (!slide) return;
    for (const [b, { f, fs }] of slide.friction) {
      b.friction = f;
      b.frictionStatic = fs;
    }
  }

  /** Remoção do inimigo: larga o empurrão sem devolver o atrito (os corpos vão embora junto). */
  dropSlide(): void {
    this.slide = null;
  }
}
