import type { BossAIEvent } from '../../core/bossAI';

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
 * `fxSink` dele. Daqui saem o rastro da investida para a lava do Ígneo e o aviso/abertura/fechamento para o feixe do
 * Sangue e os fios da Tecelã; enquanto essas vistas não existem, ele só conta o que recebeu, para o snapshot.
 */
export class BossAffixFx {
  private readonly counts: Partial<Record<BossFxEvent['type'], number>> = {};

  /** Recebe um evento do chefe (atribuído ao `boss.fxSink`). */
  readonly route = (ev: BossFxEvent): void => {
    this.counts[ev.type] = (this.counts[ev.type] ?? 0) + 1;
  };

  /** Quantos eventos de cada tipo chegaram desde que o chefe nasceu (snapshot de debug). */
  debug(): Partial<Record<BossFxEvent['type'], number>> {
    return { ...this.counts };
  }
}
