import type Phaser from 'phaser';
import type { ActiveCastView } from '../../core/cast';
import type { FxRegistry } from '../../core/fxRegistry';
import type { FxTimeline } from '../../core/fxTimeline';
import { type TechId } from '../../data/techniques';
import { type AuraColor } from '../art/sprites/techFx';
import { TEX } from '../textures';

/** TechId → cor da aura (Direção de arte de cada story): Divergente/Azul em azul, Vermelho em vermelho,
 * Desmantelar em branco. Mapeamento próprio (não é `TechDef.aura`, que é uma cor de ícone/loja diferente). */
const AURA_COLOR_BY_TECH: Record<TechId, AuraColor> = {
  divergente: 'blue',
  vermelho: 'red',
  azul: 'blue',
  corte: 'white',
};

/** Troca de frame da chama (tremular, CAST-14): arbitrário dentro do "tremular" da direção de arte. */
const FLICKER_MS = 120;
/** "a aura se apaga em 150 ms" na recuperação (Direção de arte, spec P1 Conjuração). */
const FADE_MS = 150;
/** Atrás do player (profundidade 1 em Player.ts): a pose da conjuração continua legível, com a chama saindo
 * pelos lados e por cima (conferido no screenshot de T20). */
const AURA_DEPTH = 0;
/** Ampliada da grade 9x14 texels (18x28 px já em ART_SCALE) para envolver o corpo, sem virar um borrão maior que
 * ele (conferido no screenshot de T20). */
const AURA_SCALE = 2.2;

/**
 * Aura de chama da conjuração (CAST-14): camada `cast.aura` em `sign`/`charge`, tremulando (2 frames) na cor da
 * técnica; se apaga em 150 ms ao sair dessa janela. Só desenha; a regra (quando aparece) é o `cast` da
 * `CastMachine`, lido pelo `TechCaster`.
 */
export class Aura {
  private sprite: Phaser.GameObjects.Sprite | null = null;
  private activeColor: AuraColor | null = null;
  private flickerMs = 0;
  private frameB = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: FxTimeline,
    private readonly registry: FxRegistry,
  ) {}

  /** Centro da chama enquanto ela está visível (ITP-10, snapshot de debug); `null` sem aura. */
  get pos(): { x: number; y: number } | null {
    return this.sprite ? { x: this.sprite.x, y: this.sprite.y } : null;
  }

  /**
   * `reverse` (RCT-10): canalizando a Energia Reversa sem conjuração, a mesma chama em branco; a conjuração, quando
   * existe, tem a preferência.
   */
  update(dtMs: number, cast: ActiveCastView | null, x: number, y: number, reverse = false): void {
    const casting = cast !== null && (cast.state === 'sign' || cast.state === 'charge');
    const color: AuraColor | null = casting ? AURA_COLOR_BY_TECH[cast.id] : reverse ? 'white' : null;
    if (color) {
      // CAST-14: reafirmada a cada frame vivo; some sozinha assim que este `if` deixar de rodar.
      this.fx.add('cast.aura', Math.max(dtMs, 1), 'game');
      if (!this.sprite || this.activeColor !== color) {
        this.sprite?.destroy();
        this.sprite = this.scene.add
          .sprite(x, y, TEX.techAura, `${color}-a`)
          .setDepth(AURA_DEPTH)
          .setAlpha(0.9)
          .setScale(AURA_SCALE);
        this.registry.add(this.sprite);
        this.activeColor = color;
        this.flickerMs = 0;
        this.frameB = false;
      }
      this.sprite.setPosition(x, y);
      this.flickerMs += dtMs;
      if (this.flickerMs >= FLICKER_MS) {
        this.flickerMs -= FLICKER_MS;
        this.frameB = !this.frameB;
        this.sprite.setFrame(`${color}-${this.frameB ? 'b' : 'a'}`);
      }
    } else if (this.sprite) {
      // TFX-03: fora de sign/charge (release/recover/cancelada) a chama some em 150 ms.
      const sprite = this.sprite;
      this.sprite = null;
      this.activeColor = null;
      this.scene.tweens.add({ targets: sprite, alpha: 0, duration: FADE_MS });
      this.registry.scheduleDestroy(sprite, FADE_MS);
    }
  }
}
