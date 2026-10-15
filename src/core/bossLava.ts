/**
 * Faixas de lava do afixo Ígneo (IGN-02, IGN-03, IGN-05): cada investida deixa uma faixa no chão que some em 2 s;
 * quem está no chão tocando uma faixa leva um tique a cada 600 ms, o primeiro na hora. Puro: sem `phaser`. Quem
 * aplica o dano (pelo `receiveHit` do jogador) é o adaptador.
 */
import { BOSS_AFFIX } from '../data/bossAffixes';

/** Altura da faixa acima do chão, em px: a zona em que os pés do jogador contam como contato. */
export const LAVA_DEPTH = 8;

export interface LavaTuning {
  /** Tempo de vida de cada faixa (IGN-02). */
  durationMs: number;
  /** Intervalo mínimo entre dois tiques (IGN-03). */
  tickMs: number;
}

/** Uma faixa no chão: trecho `[minX, maxX]` sobre a linha do chão `groundY`, com a idade em ms. */
export interface LavaStrip {
  readonly minX: number;
  readonly maxX: number;
  readonly groundY: number;
  readonly ageMs: number;
}

/** Retângulo de quem pisa, pelo centro (como o `hurtRect()` das entidades). */
export interface LavaTarget {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface MutableStrip {
  minX: number;
  maxX: number;
  groundY: number;
  ageMs: number;
}

function touches(s: MutableStrip, r: LavaTarget): boolean {
  const left = r.x - r.width / 2;
  const right = r.x + r.width / 2;
  const top = r.y - r.height / 2;
  const bottom = r.y + r.height / 2;
  return right >= s.minX && left <= s.maxX && bottom >= s.groundY - LAVA_DEPTH && top <= s.groundY;
}

/** As faixas vivas de um chefe e o relógio do tique, que é um só para todas (pisar em duas não dobra o dano). */
export class LavaStrips {
  private readonly list: MutableStrip[] = [];
  /** Tempo desde o último tique; infinito antes do primeiro, para o 1º contato bater na hora. */
  private sinceTickMs = Number.POSITIVE_INFINITY;

  constructor(private readonly t: LavaTuning = BOSS_AFFIX.lava) {}

  /** Deixa uma faixa no trecho que a investida percorreu, em qualquer sentido (IGN-01). */
  add(fromX: number, toX: number, groundY: number): void {
    this.list.push({ minX: Math.min(fromX, toX), maxX: Math.max(fromX, toX), groundY, ageMs: 0 });
  }

  /** Envelhece as faixas, descarta as que chegaram a `durationMs` (IGN-02) e avança o relógio do tique. */
  update(dtMs: number): void {
    this.sinceTickMs += dtMs;
    for (const s of this.list) s.ageMs += dtMs;
    for (let i = this.list.length - 1; i >= 0; i--) {
      if (this.list[i].ageMs >= this.t.durationMs) this.list.splice(i, 1);
    }
  }

  /**
   * Verdadeiro quando é hora de um tique: o alvo está no chão (IGN-05), toca alguma faixa e passaram `tickMs` desde
   * o último tique (IGN-03). Ao bater, zera o relógio.
   */
  tick(rect: LavaTarget, grounded: boolean): boolean {
    if (!grounded || this.sinceTickMs < this.t.tickMs) return false;
    if (!this.list.some((s) => touches(s, rect))) return false;
    this.sinceTickMs = 0;
    return true;
  }

  /** As faixas vivas, para o desenho. */
  get strips(): readonly LavaStrip[] {
    return this.list;
  }

  /** Apaga tudo (chefe morto, run reiniciada) e zera o relógio do tique. */
  clear(): void {
    this.list.length = 0;
    this.sinceTickMs = Number.POSITIVE_INFINITY;
  }
}
