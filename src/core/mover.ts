export type MoverStatus = 'moving' | 'expired';

/**
 * Move um ponto ao longo do eixo horizontal a `speed` px/s, na direção `dir`, até `maxDist` px (BAT-12).
 * Usado pelos projéteis (1200 px) e pelas ondas de choque (600 px) do chefe.
 */
export class Mover {
  private _x: number;
  private _traveled = 0;

  constructor(
    x: number,
    private readonly dir: 1 | -1,
    private readonly speed: number,
    private readonly maxDist: number,
  ) {
    this._x = x;
  }

  get x(): number {
    return this._x;
  }

  /** Distância percorrida até agora, sempre <= `maxDist`. */
  get traveled(): number {
    return this._traveled;
  }

  /** Avança `dtMs`, sem passar de `maxDist`; devolve `'expired'` ao chegar ao alcance máximo. */
  update(dtMs: number): MoverStatus {
    if (this._traveled >= this.maxDist) return 'expired';
    const remaining = this.maxDist - this._traveled;
    const step = Math.min(this.speed * (dtMs / 1000), remaining);
    this._x += this.dir * step;
    this._traveled += step;
    return this._traveled >= this.maxDist ? 'expired' : 'moving';
  }
}
