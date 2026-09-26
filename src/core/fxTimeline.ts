/** Um frame a 60 fps, em ms; toda duração de camada é arredondada para cima em frames inteiros (L-003). */
const FRAME_MS = 1000 / 60;

export type FxClock = 'game' | 'real';

interface FxLayer {
  name: string;
  clock: FxClock;
  remainingMs: number;
}

/**
 * Linha do tempo de camadas de efeito nomeadas (TFX-05): cada camada some sozinha quando seu tempo acaba. Camadas
 * `game` usam o relógio de jogo (para no hitstop, quando `gameDt` é 0); camadas `real` usam o relógio real (as
 * cinemáticas do Kokusen, que continuam durante o hitstop). Sem `phaser` aqui.
 */
export class FxTimeline {
  private items: FxLayer[] = [];

  /** Acrescenta (ou reinicia) a camada `name`; `ms` é arredondado para cima em frames inteiros de 60 fps. */
  add(name: string, ms: number, clock: FxClock = 'game'): void {
    const frames = Math.max(1, Math.ceil(ms / FRAME_MS));
    this.items = this.items.filter((l) => l.name !== name);
    this.items.push({ name, clock, remainingMs: frames * FRAME_MS });
  }

  has(name: string): boolean {
    return this.items.some((l) => l.name === name);
  }

  /** Nomes das camadas vivas neste frame (o `fx.layers` do snapshot). */
  layers(): string[] {
    return this.items.map((l) => l.name);
  }

  /**
   * Avança cada camada pelo relógio correspondente (TFX-05): `game` não anda quando `gameDt` é 0 (hitstop);
   * `real` sempre anda. Remove a camada quando seu tempo chega a 0.
   */
  update(gameDt: number, realDt: number): void {
    this.items = this.items.filter((l) => {
      l.remainingMs -= l.clock === 'game' ? gameDt : realDt;
      return l.remainingMs > 0;
    });
  }
}
