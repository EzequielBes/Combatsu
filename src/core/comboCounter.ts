import { COMBO_STYLE } from '../data/moves';

export type ComboGrade = 'D' | 'C' | 'B' | 'A' | 'S';

/**
 * Contador de combo e nota de estilo (CMB-01..03): cada golpe acertado soma um hit; 1500 ms sem acertar, ou o
 * jogador levar dano, zera. A nota vem dos golpes DISTINTOS do combo, e só existe com 2 hits ou mais.
 */
export class ComboCounter {
  private _hits = 0;
  private moves = new Set<string>();
  private sinceHitMs = 0;

  constructor(
    private readonly expireMs: number = COMBO_STYLE.expireMs,
    private readonly minHitsForGrade: number = COMBO_STYLE.minHitsForGrade,
  ) {}

  get hits(): number {
    return this._hits;
  }

  /** Quantos golpes diferentes entraram no combo atual. */
  get distinctMoves(): number {
    return this.moves.size;
  }

  get grade(): ComboGrade | null {
    if (this._hits < this.minHitsForGrade) return null;
    let grade: ComboGrade = COMBO_STYLE.grades[0].grade;
    for (const g of COMBO_STYLE.grades) if (this.moves.size >= g.minDistinct) grade = g.grade;
    return grade;
  }

  /** Um golpe do jogador acertou um alvo. */
  hit(moveName: string): void {
    this._hits += 1;
    this.moves.add(moveName);
    this.sinceHitMs = 0;
  }

  update(dtMs: number): void {
    if (this._hits === 0) return;
    this.sinceHitMs += dtMs;
    if (this.sinceHitMs >= this.expireMs) this.reset();
  }

  /** O jogador levou dano (CMB-02). */
  playerDamaged(): void {
    this.reset();
  }

  reset(): void {
    this._hits = 0;
    this.moves.clear();
    this.sinceHitMs = 0;
  }
}
