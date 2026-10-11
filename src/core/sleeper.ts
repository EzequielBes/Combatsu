/** Números do dorminhoco: alcance do golpe que o faz falar, ritmo da fala e a frase. */
export interface SleeperConfig {
  /** Distância horizontal máxima (px) entre o player e o NPC para o golpe contar. */
  rangePx: number;
  /** Tempo (ms) por letra da frase. */
  charMs: number;
  /** Tempo (ms) com a frase inteira na tela antes de ele voltar a só dormir. */
  holdMs: number;
  /** A boca troca de quadro a cada tantos ms enquanto as letras aparecem. */
  mouthMs: number;
  line: string;
}

export type SleeperFrame = 'sleep' | 'talk-0' | 'talk-1';

/**
 * NPC que dorme e fala dormindo: um golpe do player dado perto dele começa a frase, que aparece letra por letra, fica
 * um tempo inteira e some. Enquanto fala, outro golpe não recomeça a frase. Puro, sem `phaser`.
 */
export class Sleeper {
  /** Ms desde o começo da fala; negativo enquanto só dorme. */
  private talkMs = -1;

  constructor(private readonly cfg: SleeperConfig) {}

  /** Golpe do player a `distPx` do NPC: devolve `true` se a fala começou agora. */
  poke(distPx: number): boolean {
    if (this.talking || Math.abs(distPx) > this.cfg.rangePx) return false;
    this.talkMs = 0;
    return true;
  }

  update(dtMs: number): void {
    if (this.talkMs < 0) return;
    this.talkMs += dtMs;
    if (this.talkMs >= this.totalMs) this.talkMs = -1;
  }

  get talking(): boolean {
    return this.talkMs >= 0;
  }

  /** A parte da frase já dita; vazia enquanto só dorme. */
  get text(): string {
    if (this.talkMs < 0) return '';
    return this.cfg.line.slice(0, Math.min(this.cfg.line.length, Math.floor(this.talkMs / this.cfg.charMs) + 1));
  }

  /** Dormindo, o quadro de boca fechada; falando, a boca alterna enquanto ainda há letra por sair. */
  get frame(): SleeperFrame {
    if (this.talkMs < 0 || this.talkMs >= this.cfg.line.length * this.cfg.charMs) return 'sleep';
    return Math.floor(this.talkMs / this.cfg.mouthMs) % 2 === 0 ? 'talk-1' : 'talk-0';
  }

  private get totalMs(): number {
    return this.cfg.line.length * this.cfg.charMs + this.cfg.holdMs;
  }
}
