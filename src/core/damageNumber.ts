/**
 * Regra pura do número de dano (POW-05): tamanho e cor por tipo, e o livro que decide se um acerto soma num número vivo
 * ou abre um novo. Sem Phaser: a vista (`game/DamageNumbers.ts`) só desenha o que o livro devolve.
 */
import { DAMAGE_NUMBER_FEEL } from '../data/feel';
import type { HitBand, Vec2 } from './hit';

export type DamageKind = 'kokusen' | 'crit' | 'tech' | 'strike' | 'micro' | 'chip';

/** Do mais forte ao mais fraco: na fusão fica o tipo que aparece primeiro aqui. */
export const DAMAGE_KIND_PRIORITY: readonly DamageKind[] = ['kokusen', 'crit', 'tech', 'strike', 'micro', 'chip'];

/** Chaves da `PALETTE` (1 letra): preenchimento e contorno do texto. */
export interface DamageColors {
  fill: string;
  outline: string;
}

const COLORS: Readonly<Record<DamageKind, DamageColors>> = {
  strike: { fill: 'w', outline: 'k' },
  tech: { fill: 'c', outline: 'k' },
  crit: { fill: 'A', outline: 'k' },
  kokusen: { fill: 'b', outline: 'R' },
  micro: { fill: 'c', outline: 'k' },
  chip: { fill: 'S', outline: 'k' },
};

/** Tamanho do texto em px (POW-05.1): micro e chip ficam sempre no menor. */
export function sizeFor(value: number, kind: DamageKind): number {
  const f = DAMAGE_NUMBER_FEEL;
  if (kind === 'micro' || kind === 'chip' || value < f.midFrom) return f.sizePx.small;
  return value < f.bigFrom ? f.sizePx.mid : f.sizePx.big;
}

/** Cores do tipo (POW-05.2), em chaves da paleta. */
export function colorsFor(kind: DamageKind): DamageColors {
  return COLORS[kind];
}

/** Tipo do número de um golpe de técnica (POW-06.7): a faixa do acerto decide; sem faixa, `tech`. */
export function techKind(band: HitBand | undefined): DamageKind {
  return band ?? 'tech';
}

/**
 * Degraus do espalhamento, em caixas `spreadPx` (POW-05): no lugar, depois dos lados meio degrau acima, logo acima, e
 * assim por diante. Vizinhos da lista nunca se cobrem: diferem uma caixa inteira na largura ou na altura.
 */
const SPREAD_STEPS: readonly (readonly [number, number])[] = [
  [0, 0],
  [1, -0.5],
  [-1, -0.5],
  [0, -1],
  [1, -1.5],
  [-1, -1.5],
  [0, -2],
  [2, -1],
  [-2, -1],
];

/** Folga de `p` até o vizinho mais perto em `taken`, em caixas: >= 1 numa das direções quer dizer que não cobre. */
function gapTo(p: Vec2, taken: readonly Vec2[]): number {
  const { w, h } = DAMAGE_NUMBER_FEEL.spreadPx;
  let gap = Infinity;
  for (const t of taken) gap = Math.min(gap, Math.max(Math.abs(p.x - t.x) / w, Math.abs(p.y - t.y) / h));
  return gap;
}

/**
 * Deslocamento que afasta um número que nasce em `at` dos números vivos em `taken` (POW-05): o primeiro degrau cuja
 * caixa não cobre a de nenhum deles. Com todos ocupados, fica o degrau mais longe do vizinho mais perto. `slack` é a
 * folga mínima, em caixas, para um degrau contar como livre: abaixo de 1 tolera uma sobra pequena (o número que já está
 * no lugar não troca de degrau porque o alvo andou 2 px). Com `near`, entre os degraus livres fica o mais perto desse
 * ponto: o número que troca de degrau anda o mínimo e não atravessa os outros.
 */
export function spreadOffset(at: Vec2, taken: readonly Vec2[], slack = 1, near?: Vec2): Vec2 {
  const { w, h } = DAMAGE_NUMBER_FEEL.spreadPx;
  let crowded: Vec2 = { x: 0, y: 0 };
  let crowdedGap = -1;
  let free: Vec2 | null = null;
  let freeDist = Infinity;
  for (const [sx, sy] of SPREAD_STEPS) {
    const off = { x: sx * w, y: sy * h };
    const p = { x: at.x + off.x, y: at.y + off.y };
    const gap = gapTo(p, taken);
    if (gap >= slack) {
      if (!near) return off;
      const dist = Math.hypot(p.x - near.x, p.y - near.y);
      if (dist < freeDist) [free, freeDist] = [off, dist];
    } else if (gap > crowdedGap) {
      [crowded, crowdedGap] = [off, gap];
    }
  }
  return free ?? crowded;
}

/** O tipo de maior prioridade entre os dois. */
export function strongerKind(a: DamageKind, b: DamageKind): DamageKind {
  return DAMAGE_KIND_PRIORITY.indexOf(a) <= DAMAGE_KIND_PRIORITY.indexOf(b) ? a : b;
}

/** Um número vivo. `lastMs` é o instante do último acerto somado: conta a vida e a janela de fusão. */
export interface DamageEntry {
  readonly id: number;
  readonly targetId: number;
  value: number;
  kind: DamageKind;
  lastMs: number;
}

/** O que mudou: o número tocado, se ele já existia (`merged`: fusão ou `promote`) e o id despejado pelo teto, se houve. */
export interface BookChange {
  entry: Readonly<DamageEntry>;
  merged: boolean;
  evicted: number | null;
}

/** Livro dos números vivos: fusão por alvo em 300 ms, prioridade do tipo e teto de 12 (POW-05.3 a 05.5). */
export class DamageBook {
  private entries: DamageEntry[] = [];
  private nextId = 1;
  private lastTouched: { value: number; kind: DamageKind } | null = null;

  /** Quantos números estão vivos. */
  get live(): number {
    return this.entries.length;
  }

  /** Valor (já somado) e tipo do último número tocado; `null` depois do `clear`. */
  get last(): { value: number; kind: DamageKind } | null {
    return this.lastTouched;
  }

  /** Registra um acerto de `value` no alvo `targetId` em `nowMs`. */
  add(targetId: number, value: number, kind: DamageKind, nowMs: number): BookChange {
    const recent = this.newestOf(targetId);
    if (recent && nowMs - recent.lastMs <= DAMAGE_NUMBER_FEEL.mergeMs) return this.merge(recent, value, kind, nowMs);
    let evicted: number | null = null;
    if (this.entries.length >= DAMAGE_NUMBER_FEEL.cap) {
      if (recent) return this.merge(recent, value, kind, nowMs);
      evicted = this.evictOldest();
    }
    const entry: DamageEntry = { id: this.nextId++, targetId, value, kind, lastMs: nowMs };
    this.entries.push(entry);
    return this.touch(entry, false, evicted);
  }

  /** Troca o tipo do número mais recente do alvo pelo de maior prioridade (o Kokusen chega depois do acerto). */
  promote(targetId: number, kind: DamageKind): BookChange | null {
    const recent = this.newestOf(targetId);
    if (!recent) return null;
    recent.kind = strongerKind(recent.kind, kind);
    return this.touch(recent, true, null);
  }

  /** Tira os números que viveram 700 ms desde o último acerto somado; devolve os ids removidos. */
  expire(nowMs: number): number[] {
    const gone: number[] = [];
    this.entries = this.entries.filter((e) => {
      const alive = nowMs - e.lastMs < DAMAGE_NUMBER_FEEL.lifeMs;
      if (!alive) gone.push(e.id);
      return alive;
    });
    return gone;
  }

  /** Nova run ou troca de área: some com tudo. */
  clear(): void {
    this.entries = [];
    this.lastTouched = null;
  }

  private merge(entry: DamageEntry, value: number, kind: DamageKind, nowMs: number): BookChange {
    entry.value += value;
    entry.kind = strongerKind(entry.kind, kind);
    entry.lastMs = nowMs;
    return this.touch(entry, true, null);
  }

  private touch(entry: DamageEntry, merged: boolean, evicted: number | null): BookChange {
    this.lastTouched = { value: entry.value, kind: entry.kind };
    return { entry, merged, evicted };
  }

  /** O número do alvo com o acerto somado mais recente. */
  private newestOf(targetId: number): DamageEntry | undefined {
    let best: DamageEntry | undefined;
    for (const e of this.entries) if (e.targetId === targetId && (!best || e.lastMs >= best.lastMs)) best = e;
    return best;
  }

  /** Despeja o número mais perto de sumir (o de acerto somado mais antigo). */
  private evictOldest(): number {
    let oldest = 0;
    for (let i = 1; i < this.entries.length; i++) if (this.entries[i].lastMs < this.entries[oldest].lastMs) oldest = i;
    return this.entries.splice(oldest, 1)[0].id;
  }
}
