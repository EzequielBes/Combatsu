/**
 * Regra do afixo Adaptativo (ADP-01..05): conta, por fonte, os golpes que o chefe aceitou nos últimos 20 s; a fonte
 * não adaptada com mais acertos adapta ao chegar a 5 (no máximo 2 fontes) e passa a tirar a metade; a fonte adaptada
 * que fica 10 s sem acertar é esquecida e perde os acertos da janela. Puro: sem `phaser` e sem `Date.now` (relógio
 * próprio pelo `update`). Quem aplica a escala no dano e na postura é o `BossBrain`.
 */
import type { Hit } from './hit';
import type { TechId } from '../data/techniques';
import { BOSS_AFFIX } from '../data/bossAffixes';

/** Fonte de golpe que o Adaptativo conta: corpo a corpo leve, forte ou uma técnica pelo seu id (ADP-01). */
export type AdaptSource = 'light' | 'heavy' | TechId;

/** Golpe que pode trazer a técnica de origem; o `Hit` da F29 não muda (tipo estrutural). */
export type TechHit = Hit & { techId?: TechId };

export interface AdaptTuning {
  /** Janela em que os acertos contam (ADP-01). */
  windowMs: number;
  /** Acertos na janela para a fonte adaptar (ADP-03). */
  minHits: number;
  /** Teto de fontes adaptadas ao mesmo tempo (ADP-03). */
  maxAdapted: number;
  /** Tempo sem acerto da fonte adaptada até esquecê-la (ADP-05). */
  forgetMs: number;
  /** Escala do dano e da postura da fonte adaptada (ADP-04). */
  mult: number;
}

/**
 * Fonte do golpe: técnica pelo `techId`, corpo a corpo (objeto incluído) pela `strength`. Golpe de técnica sem
 * `techId` (laboratório) não conta (ADP-02). Kokusen, finalizador e aparo nem passam por aqui.
 */
export function adaptSourceOf(hit: Pick<TechHit, 'strength' | 'tech' | 'techId'>): AdaptSource | null {
  if (hit.tech) return hit.techId ?? null;
  return hit.strength;
}

interface Mark {
  readonly source: AdaptSource;
  readonly atMs: number;
}

export class Adaptation {
  private nowMs = 0;
  /** Acertos na janela, em ordem de chegada (o mais antigo primeiro). */
  private marks: Mark[] = [];
  private readonly lastHitMs = new Map<AdaptSource, number>();
  private readonly order: AdaptSource[] = [];

  constructor(private readonly tuning: AdaptTuning = BOSS_AFFIX.adapt) {}

  /** Fontes adaptadas, na ordem em que adaptaram (ADP-06, ADP-07). */
  get adapted(): readonly AdaptSource[] {
    return this.order;
  }

  /**
   * Um golpe aceito pelo chefe. Devolve a escala dele: `mult` se a fonte já estava adaptada antes deste golpe,
   * senão 1. Registra o acerto e reavalia a adaptação (ADP-03). Fonte `null` não conta e sai inteira.
   */
  onHit(source: AdaptSource | null): number {
    if (source === null) return 1;
    const scale = this.order.includes(source) ? this.tuning.mult : 1;
    this.marks.push({ source, atMs: this.nowMs });
    this.lastHitMs.set(source, this.nowMs);
    this.reevaluate();
    return scale;
  }

  /** Avança o relógio: descarta os acertos velhos e esquece a fonte adaptada parada (ADP-01, ADP-05). */
  update(dtMs: number): void {
    this.nowMs += dtMs;
    const { windowMs, forgetMs } = this.tuning;
    this.marks = this.marks.filter((m) => this.nowMs - m.atMs < windowMs);
    for (const source of [...this.order]) {
      if (this.nowMs - (this.lastHitMs.get(source) ?? 0) < forgetMs) continue;
      this.order.splice(this.order.indexOf(source), 1);
      // Sem apagar, o próximo golpe de qualquer fonte a readaptaria na hora.
      this.marks = this.marks.filter((m) => m.source !== source);
    }
  }

  private reevaluate(): void {
    if (this.order.length >= this.tuning.maxAdapted) return;
    const counts = new Map<AdaptSource, number>();
    for (const m of this.marks) {
      if (!this.order.includes(m.source)) counts.set(m.source, (counts.get(m.source) ?? 0) + 1);
    }
    let best: AdaptSource | null = null;
    let bestCount = 0;
    // Em ordem de último acerto, do mais antigo: no empate fica a que chegou ao número primeiro.
    for (const source of this.byLastHit(counts.keys())) {
      const count = counts.get(source) ?? 0;
      if (count > bestCount) {
        best = source;
        bestCount = count;
      }
    }
    if (best !== null && bestCount >= this.tuning.minHits) this.order.push(best);
  }

  private byLastHit(sources: Iterable<AdaptSource>): AdaptSource[] {
    const last = new Map<AdaptSource, number>();
    this.marks.forEach((m, i) => last.set(m.source, i));
    return [...sources].sort((a, b) => (last.get(a) ?? 0) - (last.get(b) ?? 0));
  }
}
