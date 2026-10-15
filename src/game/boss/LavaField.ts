import type Phaser from 'phaser';
import { LavaStrips, type LavaStrip, type LavaTarget } from '../../core/bossLava';
import type { Hit } from '../../core/hit';
import { BOSS_AFFIX } from '../../data/bossAffixes';
import { PALETTE } from '../art/palette';

/** Quem pisa na lava: o `Player` (retângulo pelo centro, chão e o caminho de dano de hoje). */
export interface LavaVictim {
  hurtRect(): LavaTarget;
  readonly grounded: boolean;
  receiveHit(hit: Hit): boolean;
}

/** Leitura da lava para o snapshot de debug: faixas vivas, tiques do relógio, tiques aceitos pelo player e o dano. */
export interface LavaView {
  strips: LavaStrip[];
  ticks: number;
  hits: number;
  damage: number;
}

/** Altura desenhada da faixa (px): rente ao chão, menor que a zona de contato (`LAVA_DEPTH`). */
const STRIP_H = 4;
/** Fio claro no topo da faixa (px). */
const CREST_H = 1;
/** Últimos ms de vida em que a faixa esmaece, para avisar que vai sumir. */
const FADE_MS = 400;
/** Atrás dos personagens (0..2) e na frente da decoração do cenário (-5): a lava fica sob os pés. */
const DEPTH = -1;
/** Base `a` (laranja) e crista `A` (âmbar), da `PALETTE` (BRD-07). */
const BASE_COLOR = PALETTE.a;
const CREST_COLOR = PALETTE.A;

/**
 * Vista e dano da lava do Ígneo (IGN-01..05, BRD-07): cada `chargeTrail` vira uma faixa `LavaStrips` desenhada como um
 * retângulo `a` com crista `A` no chão. Por quadro, se o player está no chão encostado numa faixa e o relógio de
 * 600 ms permite, ele leva um golpe pelo `receiveHit` de hoje: `low`, imbloqueável, sem empurrão, dono = chefe, dano
 * do tier (`spec.damage.lava`, já com o Portador). No ar, nada (DEF-17).
 */
export class LavaField {
  private readonly strips: LavaStrips;
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly hit: Hit;
  private readonly durationMs: number;
  private ticks = 0;
  private hits = 0;

  constructor(
    scene: Phaser.Scene,
    ownerId: number,
    /** Dano de cada tique: `spec.damage.lava` do chefe. */
    private readonly damage: number,
    t: { durationMs: number; tickMs: number } = BOSS_AFFIX.lava,
  ) {
    this.strips = new LavaStrips(t);
    this.durationMs = t.durationMs;
    this.hit = {
      ownerId,
      damage,
      strength: 'light',
      force: 0,
      height: 'low',
      unblockable: true,
      direction: { x: 0, y: -1 },
    };
    this.gfx = scene.add.graphics().setDepth(DEPTH);
  }

  /** Rastro de uma investida (IGN-01): faixa de `fromX` a `toX` sobre o chão `groundY`. */
  add(fromX: number, toX: number, groundY: number): void {
    this.strips.add(fromX, toX, groundY);
    this.draw();
  }

  /** Envelhece as faixas (IGN-02) e aplica o tique em quem pisa (IGN-03..05). */
  update(dtMs: number, victim: LavaVictim): void {
    // O relógio do tique anda mesmo sem faixa: uma faixa nova logo depois de outra não espera um tique a mais.
    const had = this.strips.strips.length > 0;
    this.strips.update(dtMs);
    if (this.strips.tick(victim.hurtRect(), victim.grounded)) {
      this.ticks++;
      if (victim.receiveHit({ ...this.hit, direction: { ...this.hit.direction } })) this.hits++;
    }
    if (had) this.draw();
  }

  /** Chefe morto ou fora de cena: todas as faixas somem de uma vez. */
  clear(): void {
    this.strips.clear();
    this.gfx.clear();
  }

  /** Remove a vista de vez (chefe novo ou run nova). */
  destroy(): void {
    this.clear();
    this.gfx.destroy();
  }

  view(): LavaView {
    return {
      strips: this.strips.strips.map((s) => ({ ...s })),
      ticks: this.ticks,
      hits: this.hits,
      damage: this.damage,
    };
  }

  private draw(): void {
    const g = this.gfx.clear();
    for (const s of this.strips.strips) {
      const alpha = Math.min(1, (this.durationMs - s.ageMs) / FADE_MS);
      const left = Math.round(s.minX);
      const width = Math.max(1, Math.round(s.maxX) - left);
      const top = Math.round(s.groundY) - STRIP_H;
      g.fillStyle(BASE_COLOR, alpha).fillRect(left, top, width, STRIP_H);
      g.fillStyle(CREST_COLOR, alpha).fillRect(left, top, width, CREST_H);
    }
  }
}
