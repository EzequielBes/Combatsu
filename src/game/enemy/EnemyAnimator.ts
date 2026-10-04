import type Phaser from 'phaser';
import { RUN_THRESHOLD, pickEnemyAnim, type LightReaction } from '../../core/animState';
import { KIND_COLOR, type AttackKind } from '../../core/attackKind';
import type { HitReaction } from '../../core/hitReaction';
import type { ToolKey } from '../../core/loot';
import { enemyAnimKey } from '../art';
import { PALETTE } from '../art/palette';
import { ENEMY_ORIGIN } from '../art/sprites/enemy';
import { PX_PER_S_TO_STEP } from '../physics';
import { SIZE, TEX, enemyTex } from '../textures';
import type { EnemyCtx } from './context';
import { BAR_DEPTH, BAR_RISE } from './EnemyHud';

/** Duração (ms) da reação `body` de quem foi esbarrado por um inimigo deslizando (RCT-04): soma dos 3 frames. */
const TOUCH_REACTION_MS = 220;
/** Duração (ms) do flash na cor do tipo no ponto de compromisso (CMT-02). */
const COMMIT_FLASH_MS = 80;
/** Ferramenta na mão (ARM-09): aura alternando a cada 150 ms; offset à frente do corpo. */
const WEAPON_AURA_MS = 150;
const WEAPON_OFFSET = { x: 10, y: 2 };
/** No golpe o inimigo fica acima do player (depth 1): a garra aparece por cima de quem ela atinge. */
const ATTACK_DEPTH = 2;
/** Marcador do tipo do golpe (HGT-07): a base fica esta folga (px) acima do topo da barra de vida, na mesma profundidade. */
const TELEGRAPH_GAP = 3;

/**
 * Visual do inimigo: o sprite animado (origem no pé, no centro do corpo), a escolha de animação do `pickEnemyAnim`
 * (CHR-03), as reações de hurt, o flash de compromisso, o marcador do tipo do golpe e a ferramenta na mão.
 */
export class EnemyAnimator {
  readonly view: Phaser.GameObjects.Sprite;
  /** Marcador do tipo do golpe sobre a cabeça, visível em `windup` e `attack` (HGT-07, HGT-08). */
  private readonly marker: Phaser.GameObjects.Image;
  /** Sprite da ferramenta na mão (ARM-09/10), `null` se o inimigo não está armado. */
  private readonly weaponView: Phaser.GameObjects.Sprite | null;
  /** Reação leve em curso (HRX-02); só vale enquanto o cérebro está em hitstun. */
  private reaction: LightReaction | null = null;
  /** Última reação de cabeça, para a alternância cabeça-a/cabeça-b (HRX-01). */
  lastReaction: HitReaction | null = null;
  /** Chave da animação de reação que está tocando: evita reiniciar a cada frame (HRX-02). */
  private reactionKey: string | null = null;
  /** Chave da `PALETTE` do flash de compromisso em curso (CMT-02); `null` fora do flash. */
  private commitFlashKey: string | null = null;
  private guardTinted = false;
  /** Tempo (ms de jogo) que falta da reação `body` por esbarrão (RCT-04). */
  private touchMs = 0;

  constructor(
    private readonly c: EnemyCtx,
    spawn: { x: number; y: number },
    private readonly weaponInfo: { tool: ToolKey; rare: boolean } | null,
  ) {
    const scene = c.scene;
    this.view = scene.add
      .sprite(spawn.x, spawn.y + SIZE.enemy.h / 2, enemyTex(c.variant), 'idle-0')
      .setOrigin(ENEMY_ORIGIN.x, ENEMY_ORIGIN.y);
    this.weaponView = weaponInfo
      ? scene.add.sprite(
          spawn.x,
          spawn.y,
          weaponInfo.tool === 'cursedKnife' ? TEX.cursedKnife : TEX.cursedClub,
          'hold-a',
        )
      : null;
    // Mundo, não HUD (AD-003): a câmera de UI ignora tudo o que nasce fora da `uiLayer`.
    this.marker = scene.add
      .image(0, 0, TEX.fxTelegraph, c.tuning.attack.kind)
      .setOrigin(0.5, 1)
      .setDepth(BAR_DEPTH)
      .setVisible(false);
  }

  /** Frame do marcador de telegrafo se ele está visível, lido do sprite desenhado; senão `null` (HGT-07, HGT-08). */
  get telegraph(): AttackKind | null {
    return this.marker.visible ? (String(this.marker.frame.name) as AttackKind) : null;
  }

  /** Chave da `PALETTE` do flash de compromisso enquanto ele dura, lido do tint do sprite; `null` fora dele (CMT-02). */
  get commitFlash(): string | null {
    return this.commitFlashKey !== null && this.view.isTinted ? this.commitFlashKey : null;
  }

  /** Sprite da ferramenta visível (ARM-10); `null` sem arma. */
  get weaponVisible(): boolean | null {
    return this.weaponView ? this.weaponView.visible : null;
  }

  /** Avança o tempo de jogo da reação `body` por esbarrão (RCT-04). */
  tick(dtMs: number): void {
    this.touchMs = Math.max(0, this.touchMs - dtMs);
  }

  /** Esbarrão de outro inimigo deslizando (RCT-04): a reação `body` toca por `TOUCH_REACTION_MS`. */
  touch(): void {
    this.touchMs = TOUCH_REACTION_MS;
    this.reactionKey = null;
  }

  animate(): void {
    const { brain, ai, structure, guard, body, drawPos, s } = this.c;
    const vxPerS = body.velocity.x / PX_PER_S_TO_STEP;
    const stunned = s.suppressedMs > 0 || structure.broken;
    if (brain.state !== 'hitstun') this.reaction = null;
    const picked = pickEnemyAnim({
      brain: brain.state,
      ai: ai.state,
      moving: Math.abs(vxPerS) > RUN_THRESHOLD,
      reaction: this.reaction,
    });
    const touching = this.touchMs > 0 && brain.state === 'idle' && !stunned && (picked === 'idle' || picked === 'walk');
    const anim = touching ? 'hurt-body' : stunned && picked !== 'getup' ? 'hurt' : picked;
    const draw = drawPos.get();
    this.view.setPosition(draw.x, draw.y + SIZE.enemy.h / 2);
    // Escala negativa espelha em volta da origem (o pé no centro do corpo), não do centro do frame largo.
    this.view.setScale(s.facing, 1);
    this.view.setDepth(anim === 'attack' ? ATTACK_DEPTH : 0);
    // Guarda (EBL-01): sem quadro próprio na arte, o corpo fica azulado enquanto a guarda está de pé.
    if (guard.guarding) {
      this.view.setTint(PALETTE.c);
      this.guardTinted = true;
    } else if (this.guardTinted) {
      this.view.clearTint();
      this.guardTinted = false;
    }
    if (brain.state === 'stagger') {
      // Cambaleio (PST-01) e Deflexão (DFL-11): o frame de impacto fica parado enquanto o estado dura.
      this.view.anims.stop();
      this.view.setFrame('impact');
      this.reactionKey = null;
      return;
    }
    const key = enemyAnimKey(this.c.variant, anim);
    if (anim.startsWith('hurt-')) {
      // Reação leve: já foi iniciada do frame 0 no golpe; aqui só garante a chave certa, sem reiniciar enquanto vale.
      if (this.reactionKey !== key) {
        this.view.anims.play(key, false);
        this.reactionKey = key;
      }
      return;
    }
    this.reactionKey = null;
    this.view.anims.play(key, true);
  }

  /**
   * Parte visual da reação a golpe leve: animação `hurt-<reaction>` do frame 0, mesmo se já estava em outra reação
   * (HRX-02), (sem pisca branco, RCT-07), sem ragdoll. Quebrado ou aparado continua mostrando `hurt` (HRX-04,
   * decidido no `animate`).
   */
  hitReaction(picked: HitReaction | null): void {
    // Em cambaleio o corpo segue no frame `impact` (o `animate` o segura); a animação leve não toca (PST-10).
    if (picked && picked !== 'impact' && this.c.brain.state !== 'stagger') {
      this.reaction = picked;
      if (picked === 'head-a' || picked === 'head-b') this.lastReaction = picked;
      if (!this.c.structure.broken && this.c.s.suppressedMs <= 0) {
        const key = enemyAnimKey(this.c.variant, `hurt-${picked}`);
        this.view.anims.play(key, false);
        this.view.anims.restart();
        this.reactionKey = key;
      }
    } else {
      this.reaction = null;
    }
  }

  /** Cambaleio (PST-01): o corpo para no frame `impact`. */
  staggerPose(): void {
    this.reaction = null;
    this.reactionKey = null;
    this.view.anims.stop();
    this.view.setFrame('impact');
  }

  clearTint(): void {
    this.view.clearTint();
  }

  /** Pose de impacto antes do ragdoll (HRX-05/06): o sprite fica no frame `impact` até o ragdoll aparecer. */
  impactPose(): void {
    this.view.anims.stop();
    this.view.setVisible(true).setFrame('impact');
    this.reactionKey = null;
    this.reaction = null;
  }

  /** O ragdoll aparece e o sprite some (HRX-05/06). */
  hide(): void {
    this.view.setVisible(false);
  }

  /** Levantou: o sprite volta tocando a animação `getup`. */
  showAfterGetUp(): void {
    this.reactionKey = null;
    this.view.setVisible(true);
    this.animate();
  }

  /** Ponto de compromisso (CMT-02): o corpo pisca em cor sólida do tipo; o relógio da cena para no hitstop. */
  flashCommit(): void {
    const key = KIND_COLOR[this.c.tuning.attack.kind];
    this.commitFlashKey = key;
    this.view.setTintFill(PALETTE[key]);
    this.c.scene.time.delayedCall(COMMIT_FLASH_MS, () => {
      this.commitFlashKey = null;
      if (this.view.active) this.view.clearTint();
    });
  }

  /** Marcador sobre a cabeça: visível em `windup` e `attack`, fora do ragdoll, na posição de desenho (HGT-07, HGT-08). */
  updateTelegraph(): void {
    if (this.c.s.removed) return;
    const st = this.c.ai.state;
    const show = (st === 'windup' || st === 'attack') && !this.c.s.ragdoll && !this.c.brain.isDead;
    this.marker.setVisible(show);
    if (!show) return;
    const { x, y } = this.c.drawPos.get();
    this.marker.setPosition(Math.round(x), Math.round(y - BAR_RISE - TELEGRAPH_GAP));
  }

  /** Ferramenta na mão (ARM-09/10): some em ragdoll, senão segue a mão com a aura/preparo certo. */
  updateWeaponView(): void {
    if (!this.weaponView) return;
    if (this.c.s.ragdoll || this.c.s.removed) {
      this.weaponView.setVisible(false);
      return;
    }
    this.weaponView.setVisible(true);
    this.weaponView.setFrame(this.weaponFrame());
    const { x, y } = this.c.drawPos.get();
    this.weaponView.setPosition(x + WEAPON_OFFSET.x * this.c.s.facing, y + WEAPON_OFFSET.y);
    this.weaponView.setFlipX(this.c.s.facing < 0);
    this.weaponView.setDepth(this.view.depth);
  }

  /** `raised` no preparo (ARM-09, glow U); senão a aura alterna entre `hold-a`/`hold-b` (rara: `hold-rare` fixo). */
  private weaponFrame(): string {
    if (this.c.ai.state === 'windup') return 'raised';
    if (this.weaponInfo?.rare) return 'hold-rare';
    return Math.floor(this.c.scene.time.now / WEAPON_AURA_MS) % 2 === 0 ? 'hold-a' : 'hold-b';
  }

  destroy(): void {
    this.view.destroy();
    this.weaponView?.destroy();
    this.marker.destroy();
  }
}
