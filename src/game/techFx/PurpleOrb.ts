import type Phaser from 'phaser';
import type { FxRegistry } from '../../core/fxRegistry';
import type { FxTimeline } from '../../core/fxTimeline';
import { PURPLE } from '../../core/purple';
import { Brush, type Key } from '../art/scenery/brush';

/** Cores do Vazio Roxo (EVO-08): só chaves da `PALETTE`, do contorno escuro ao núcleo branco. */
export const PURPLE_FX_COLORS: readonly Key[] = ['v', 'u', 'U', 'T', 'W', 'k'];

/** Quantas posições antigas o rastro guarda (um a cada quadro). */
const TRAIL = 10;
const DEPTH = 3;

/**
 * Vista do Vazio Roxo (EVO-05, EVO-08): na carga, uma esfera roxa crescendo na mão; em voo, a esfera grande com o
 * núcleo branco, a borda roxa que pulsa, duas faíscas magenta girando (o vermelho e o azul colidindo) e um rastro
 * escuro que apaga o que fica para trás. Só desenha; a regra é a `PurpleSphere`.
 */
export class PurpleOrbFx {
  private g: Phaser.GameObjects.Graphics | null = null;
  private readonly trail: { x: number; y: number }[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: FxTimeline,
    private readonly registry: FxRegistry,
  ) {}

  private graphics(): Phaser.GameObjects.Graphics {
    if (!this.g || !this.g.active) {
      this.g = this.scene.add.graphics().setDepth(DEPTH);
      this.registry.add(this.g);
    }
    return this.g;
  }

  /** Carga (sign/charge): esfera crescendo de 4 px até 1/3 do raio na mão, `t` de 0 a 1. */
  charge(x: number, y: number, t: number): void {
    const g = this.graphics().clear();
    const b = new Brush(g);
    const r = 4 + Math.round((PURPLE.radius / 3) * Math.min(1, Math.max(0, t)));
    b.disc(x, y, r + 2, 'v');
    b.disc(x, y, r, 'u');
    b.disc(x, y, Math.max(2, r - 4), 'U');
    this.fx.add('purple.charge', 50, 'game');
  }

  /** Esfera em voo no centro (`x`, `y`), com a idade em ms para o pulso e o giro das faíscas. */
  flight(x: number, y: number, ageMs: number): void {
    this.trail.push({ x, y });
    if (this.trail.length > TRAIL) this.trail.shift();
    const g = this.graphics().clear();
    const b = new Brush(g);
    // Rastro: discos escuros diminuindo para trás, o "vazio" que a esfera deixa.
    this.trail.forEach((p, i) => {
      const k = (i + 1) / this.trail.length;
      b.disc(p.x, p.y, Math.round((PURPLE.radius * 0.8 * k) / 2) * 2, i % 2 === 0 ? 'k' : 'v');
    });
    const pulse = Math.round(Math.sin(ageMs / 60) * 2) * 2;
    const R = PURPLE.radius;
    b.disc(x, y, R + 4 + pulse, 'v');
    b.disc(x, y, R, 'u');
    b.disc(x, y, R - 8, 'U');
    b.disc(x, y, R - 18, 'W');
    // Duas faíscas magenta girando em sentidos opostos.
    for (const [dir, phase] of [
      [1, 0],
      [-1, Math.PI],
    ] as const) {
      const a = dir * (ageMs / 90) + phase;
      for (let s = 0; s < 4; s++) {
        const ang = a - dir * s * 0.18;
        b.disc(x + Math.cos(ang) * (R - 4), y + Math.sin(ang) * (R - 4), 4 - s, s === 0 ? 'W' : 'T');
      }
    }
    this.fx.add('purple.orb', 50, 'game');
  }

  /** Lampejo no alvo tocado. */
  hit(x: number, y: number): void {
    const flash = this.scene.add.circle(x, y, 18, 0xffffff, 0.9).setDepth(DEPTH + 1);
    this.registry.add(flash);
    this.registry.scheduleDestroy(flash, 140);
    this.scene.tweens.add({ targets: flash, scale: 1.8, alpha: 0, duration: 140 });
    this.fx.add('purple.hit', 140, 'game');
  }

  /** Fim do voo (ou da carga sem disparo): apaga o desenho e o rastro. */
  clear(): void {
    this.trail.length = 0;
    this.g?.clear();
  }
}
