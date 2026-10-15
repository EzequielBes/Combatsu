import type { BossAIEvent } from '../../core/bossAI';
import type { ThreadRain, ThreadRainView } from './ThreadRain';

/** Eventos do `BossAI` que só a vista dos ataques novos e dos afixos usa (IGN-01, SNG-02/03, CYC-09/10). */
export type BossFxEvent = Extract<
  BossAIEvent,
  { type: 'chargeTrail' | 'telegraph' | 'strikeOn' | 'strikeOff' | 'telegraphCancel' }
>;

/** Onde o chefe está quando o evento sai: X do corpo, topo do chão abaixo dele, altura do tronco e o lado. */
export interface BossFxAnchor {
  x: number;
  groundY: number;
  chestY: number;
  facing: 1 | -1;
}

/** Quem recebe os eventos de vista do chefe (o `Boss` chama; o `BossDirector` liga ao `BossAffixFx`). */
export type BossFxSink = (ev: BossFxEvent, anchor: BossFxAnchor) => void;

/**
 * Roteador dos eventos de vista de um chefe (AFX-01): o `BossDirector.attach` cria um por chefe e o liga ao
 * `fxSink` dele. Aviso, abertura e fechamento da Chuva de Fios vão para o `ThreadRain` (CYC-09/10); o rastro da
 * investida (lava do Ígneo) e o feixe do Sangue ainda só são contados, para o snapshot, até as vistas deles existirem.
 */
export class BossAffixFx {
  private readonly counts: Partial<Record<BossFxEvent['type'], number>> = {};

  constructor(private readonly threads: ThreadRain | null = null) {}

  /** Recebe um evento do chefe (atribuído ao `boss.fxSink`). */
  readonly route = (ev: BossFxEvent, anchor: BossFxAnchor): void => {
    this.counts[ev.type] = (this.counts[ev.type] ?? 0) + 1;
    if (ev.type === 'telegraph' && ev.attack === 'threadRain') this.threads?.telegraph(ev.playerX, anchor);
    else if (ev.type === 'strikeOn' && ev.attack === 'threadRain') this.threads?.strikeOn();
    // A interrupção no preparo apaga as marcas sem abrir; no corpo ela já vem depois do `strikeOff` (BAI-05).
    else if ((ev.type === 'strikeOff' && ev.attack === 'threadRain') || ev.type === 'telegraphCancel') {
      this.threads?.clear();
    }
  };

  /** Quantos eventos de cada tipo chegaram desde que o chefe nasceu (snapshot de debug). */
  debug(): Partial<Record<BossFxEvent['type'], number>> {
    return { ...this.counts };
  }

  /** Estado da Chuva de Fios (snapshot de debug); `null` sem a vista. */
  threadsView(): ThreadRainView | null {
    return this.threads?.view() ?? null;
  }

  /** O chefe caiu: nada do que ele lançou fica aberto em cena (a IA dele não fecha mais nada). */
  clear(): void {
    this.threads?.clear();
  }

  /** Chefe novo ou run nova: remove as vistas de vez. */
  destroy(): void {
    this.threads?.destroy();
  }
}
