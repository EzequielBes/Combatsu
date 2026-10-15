import type { BossAIEvent } from '../../core/bossAI';
import type { BeamAttack, BeamView } from './BeamAttack';
import type { LavaField, LavaView, LavaVictim } from './LavaField';
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
 * `fxSink` dele. Aviso, abertura e fechamento da Chuva de Fios vão para o `ThreadRain` (CYC-09/10) e os do feixe
 * para o `BeamAttack`, só com Sangue Convergente (SNG-02/03); o rastro da investida vira faixa de lava no
 * `LavaField`, só com Ígneo (IGN-01). Todo evento é contado, para o snapshot.
 */
export class BossAffixFx {
  private readonly counts: Partial<Record<BossFxEvent['type'], number>> = {};

  constructor(
    private readonly threads: ThreadRain | null = null,
    /** Lava do Ígneo; `null` em chefe sem o afixo (o rastro da investida só é contado). */
    private readonly lava: LavaField | null = null,
    /** Feixe do Sangue Convergente; `null` em chefe sem o afixo. */
    private readonly beam: BeamAttack | null = null,
  ) {}

  /** Recebe um evento do chefe (atribuído ao `boss.fxSink`). */
  readonly route = (ev: BossFxEvent, anchor: BossFxAnchor): void => {
    this.counts[ev.type] = (this.counts[ev.type] ?? 0) + 1;
    if (ev.type === 'chargeTrail') this.lava?.add(ev.fromX, ev.toX, anchor.groundY);
    else if (ev.type === 'telegraphCancel') {
      // A interrupção no preparo apaga o aviso sem abrir; no corpo ela já vem depois do `strikeOff` (BAI-05).
      this.threads?.clear();
      this.beam?.clear();
    } else if (ev.attack === 'beam') this.routeBeam(ev, anchor);
    else if (ev.type === 'telegraph') this.threads?.telegraph(ev.playerX, anchor);
    else if (ev.type === 'strikeOn') this.threads?.strikeOn();
    else this.threads?.clear();
  };

  /** Aviso, abertura e fechamento do feixe (SNG-02/03): o lado vem preso do aviso. */
  private routeBeam(ev: Extract<BossFxEvent, { attack: unknown }>, anchor: BossFxAnchor): void {
    if (ev.type === 'telegraph') this.beam?.telegraph(ev.dir, anchor);
    else if (ev.type === 'strikeOn') this.beam?.strikeOn();
    else this.beam?.clear();
  }

  /** Por quadro, depois do `boss.update`: a lava envelhece e bate em quem pisa nela (IGN-02..05); o aviso engrossa. */
  update(dtMs: number, victim: LavaVictim): void {
    this.lava?.update(dtMs, victim);
    this.beam?.update(dtMs);
  }

  /** Quantos eventos de cada tipo chegaram desde que o chefe nasceu (snapshot de debug). */
  debug(): Partial<Record<BossFxEvent['type'], number>> {
    return { ...this.counts };
  }

  /** Estado da Chuva de Fios (snapshot de debug); `null` sem a vista. */
  threadsView(): ThreadRainView | null {
    return this.threads?.view() ?? null;
  }

  /** Lava do Ígneo (snapshot de debug); `null` em chefe sem o afixo. */
  lavaView(): LavaView | null {
    return this.lava?.view() ?? null;
  }

  /** Feixe do Sangue (snapshot de debug); `null` em chefe sem o afixo. */
  beamView(): BeamView | null {
    return this.beam?.view() ?? null;
  }

  /** O chefe caiu: nada do que ele lançou fica aberto em cena (a IA dele não fecha mais nada), nem a lava. */
  clear(): void {
    this.threads?.clear();
    this.lava?.clear();
    this.beam?.clear();
  }

  /** Chefe novo ou run nova: remove as vistas de vez. */
  destroy(): void {
    this.threads?.destroy();
    this.lava?.destroy();
    this.beam?.destroy();
  }
}
