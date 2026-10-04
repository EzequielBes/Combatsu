import { hitFieldsFor, type AttackKind } from '../../core/attackKind';
import type { AIEvent } from '../../core/enemyAI';
import type { Hit } from '../../core/hit';
import { AttackHitbox, type OnConnect } from '../hitbox';
import type { EnemyCtx } from './context';
import type { EnemyAnimator } from './EnemyAnimator';

/** Id da próxima sequência de golpes (DFL-10): global, para duas sequências de inimigos diferentes não se misturarem. */
let nextStringId = 1;

/**
 * Ataque do inimigo: traduz os eventos da IA (preparo, ponto de compromisso, hitbox, sequência de golpes) em efeitos
 * no corpo e na garra (AI-01..05).
 */
export class EnemyAttack {
  private readonly hitbox: AttackHitbox;
  private wantAttackNow = false;
  private windupStartNow = false;
  /** Id da sequência de golpes em curso; muda a cada `windupStart` (DFL-10). */
  private stringId = 0;
  /** Dano da última garra realmente aberta (DIF-04); antes do primeiro golpe, o dano com que o inimigo nasceu. */
  lastDamage: number;

  constructor(
    private readonly c: EnemyCtx,
    private readonly anim: EnemyAnimator,
    onConnect?: OnConnect,
  ) {
    this.lastDamage = c.tuning.attack.damage;
    this.hitbox = new AttackHitbox(c.scene, c.id, 'enemy', onConnect);
  }

  /** `true` no frame em que a IA emitiu `wantAttack` (espera em `hold`, LIM-03): a cena pede vaga ao limitador. */
  get wantsAttack(): boolean {
    return this.wantAttackNow;
  }

  /** `true` no frame em que a IA emitiu `windupStart`: a cena avisa o limitador (`noteWindup`, LIM-02). */
  get windupStarted(): boolean {
    return this.windupStartNow;
  }

  /** Tipo do golpe deste inimigo (HGT-01..06), resolvido pela cena no spawn. */
  get kind(): AttackKind {
    return this.c.tuning.attack.kind;
  }

  /** Zera os avisos de um frame para o limitador; o `onAI` do frame os liga de novo. */
  beginFrame(): void {
    this.wantAttackNow = false;
    this.windupStartNow = false;
  }

  /** A garra acompanha o corpo. */
  follow(): void {
    this.hitbox.follow(this.c.body.position.x, this.c.body.position.y, this.c.s.facing);
  }

  close(): void {
    this.hitbox.close();
  }

  onAI(events: AIEvent[]): void {
    for (const ev of events) {
      if (ev === 'hitboxOn') this.openAttack();
      else if (ev === 'hitboxOff') this.hitbox.close();
      else if (ev === 'wantAttack') this.wantAttackNow = true;
      else if (ev === 'windupStart') {
        this.windupStartNow = true;
        this.stringId = nextStringId++;
      } else if (ev === 'commit') this.anim.flashCommit();
    }
    // Toda mudança de estado da IA passa por aqui (`update` e `interrupt`): o marcador acompanha na hora.
    this.anim.updateTelegraph();
  }

  /**
   * Garra: dano da rodada (DIF-04), time 'enemy' (nunca acerta outro inimigo, AI-05). Altura e `unblockable` saem do
   * tipo do golpe (HGT-04..06) e `string` diz qual golpe da sequência é este (DFL-10, DFL-15). A hitbox abre com um
   * portão novo a cada golpe, então o seguinte da sequência acerta de novo quem o anterior já acertou (DFL-05).
   */
  private openAttack(): void {
    const { tuning, ai, body, s } = this.c;
    const step = tuning.attack;
    const hit: Hit = {
      ownerId: this.c.id,
      damage: step.damage,
      strength: step.strength,
      force: step.force,
      direction: { x: s.facing, y: -0.3 },
      ...hitFieldsFor(this.kind),
      string: { id: this.stringId, index: ai.hitIndex, length: ai.hits },
    };
    this.lastDamage = hit.damage;
    this.hitbox.open(step.hitbox!, hit, body.position.x, body.position.y, s.facing);
  }
}
