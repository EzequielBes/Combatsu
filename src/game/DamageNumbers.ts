import type Phaser from 'phaser';
import { colorsFor, DamageBook, sizeFor, spreadOffset, type DamageEntry, type DamageKind } from '../core/damageNumber';
import type { Vec2 } from '../core/hit';
import { DAMAGE_NUMBER_FEEL } from '../data/feel';
import { PALETTE } from './art/palette';
import { css } from './FloatTexts';
import type { DamageNumbersSnapshot } from './powerSnapshot';

/** Espessura do contorno do texto em px de mundo. */
const OUTLINE_PX = 3;
/** Resolução do texto: o mundo é ampliado pela câmera, e o número tem de sair nítido nesse zoom (como o dorminhoco). */
const TEXT_RESOLUTION = 4;
/**
 * Profundidade do número: acima de todo efeito de mundo (impacto amaldiçoado e faíscas em 3, técnicas em 4 a 7), para
 * ler desde o primeiro quadro, e abaixo das linhas de foco e do HUD.
 */
const NUMBER_DEPTH = 8;
/** Folga, em caixas, que um número já no lugar tolera antes de trocar de degrau (os alvos presos no Azul tremem). */
const KEEP_SLACK = 0.7;

interface ShownNumber {
  readonly entry: Readonly<DamageEntry>;
  readonly obj: Phaser.GameObjects.Text;
  /** Ponto (já erguido) do acerto mais recente somado: o número persegue o alvo arrastado (o Azul puxa). */
  anchor: Vec2;
  /** Deslocamento que o tira de cima dos números que já estavam vivos; só muda quando um deles chega perto. */
  spread: Vec2;
  /** Onde o número está, sem a subida: anda até `anchor + spread`. */
  x: number;
  y: number;
  /** Tempo restante do "pop" do Kokusen (ms); 0 sem pop. */
  popMs: number;
}

/** Destino do número, sem a subida: o ponto do acerto mais o espalhamento. */
function target(view: ShownNumber): Vec2 {
  return { x: view.anchor.x + view.spread.x, y: view.anchor.y + view.spread.y };
}

/**
 * Vista do número de dano (POW-05, POW-06): texto no mundo acima do ponto de contato, por cima do impacto, que sobe e
 * some. Segue o alvo a cada acerto somado e não nasce em cima de outro número vivo. Quem decide fusão, tipo e
 * teto é o `DamageBook` do `core`; aqui só se desenha o que ele devolve. O relógio é próprio (soma do `dt` do
 * `update`), então a vida do número não depende do relógio da cena. Fica fora do `FloatTexts` para não mudar o
 * `debug()` dele, e fora do orçamento de efeitos (`fxCap`).
 */
export class DamageNumbers {
  private readonly book = new DamageBook();
  private readonly shown = new Map<number, ShownNumber>();
  private clockMs = 0;

  constructor(private readonly scene: Phaser.Scene) {}

  /** Um acerto de `value` em `target`, no ponto `at`: soma no número vivo do alvo ou abre um novo. */
  show(target: { readonly id: number }, value: number, kind: DamageKind, at: Vec2): void {
    const change = this.book.add(target.id, value, kind, this.clockMs);
    if (change.evicted !== null) this.drop(change.evicted);
    const lifted = { x: at.x, y: at.y - DAMAGE_NUMBER_FEEL.liftPx };
    const view = this.shown.get(change.entry.id);
    if (!view) return this.spawn(change.entry, lifted);
    view.anchor = lifted;
    this.restyle(view);
  }

  /** Troca o tipo do número mais recente do alvo (o Kokusen chega depois do acerto) e dá o "pop". */
  promote(targetId: number, kind: DamageKind): void {
    const change = this.book.promote(targetId, kind);
    const view = change && this.shown.get(change.entry.id);
    if (!view) return;
    view.popMs = DAMAGE_NUMBER_FEEL.popMs;
    this.restyle(view);
  }

  update(dtMs: number): void {
    this.clockMs += dtMs;
    for (const id of this.book.expire(this.clockMs)) this.drop(id);
    this.separate();
    for (const view of this.shown.values()) this.place(view, dtMs);
  }

  /** Nova run ou troca de área: some com todo número vivo. */
  clear(): void {
    for (const view of this.shown.values()) view.obj.destroy();
    this.shown.clear();
    this.book.clear();
  }

  /** Snapshot de debug (POW-13): quantos vivos, o último número tocado e onde cada vivo está. */
  snapshot(): DamageNumbersSnapshot {
    const last = this.book.last;
    const spots = [...this.shown.values()].map((v) => ({ x: Math.round(v.obj.x), y: Math.round(v.obj.y) }));
    return { live: this.book.live, last: last ? { ...last } : null, spots };
  }

  private spawn(entry: Readonly<DamageEntry>, at: Vec2): void {
    const spread = spreadOffset(at, [...this.shown.values()].map(target));
    const obj = this.scene.add
      .text(at.x, at.y, '', { fontFamily: 'monospace', strokeThickness: OUTLINE_PX })
      .setOrigin(0.5, 1)
      .setResolution(TEXT_RESOLUTION)
      .setDepth(NUMBER_DEPTH);
    const view: ShownNumber = { entry, obj, anchor: at, spread, x: at.x + spread.x, y: at.y + spread.y, popMs: 0 };
    this.shown.set(entry.id, view);
    this.restyle(view);
  }

  /**
   * Quem nasceu depois sai de cima de quem já estava (o Azul junta os alvos depois que os números nasceram): o número
   * cujo destino cobre o de um mais velho troca para o degrau livre mais perto de onde está, e o `place` o leva até lá
   * sem pular.
   */
  private separate(): void {
    const older: Vec2[] = [];
    for (const view of this.shown.values()) {
      const at = target(view);
      const free = spreadOffset(at, older, KEEP_SLACK);
      if (free.x !== 0 || free.y !== 0) view.spread = spreadOffset(view.anchor, older, 1, { x: view.x, y: view.y });
      older.push(target(view));
    }
  }

  /** Texto, tamanho e cores a partir do valor somado e do tipo atual. */
  private restyle(view: ShownNumber): void {
    const { value, kind } = view.entry;
    const colors = colorsFor(kind);
    view.obj
      .setText(String(value))
      .setFontSize(sizeFor(value, kind))
      .setColor(css(PALETTE[colors.fill]))
      .setStroke(css(PALETTE[colors.outline]), OUTLINE_PX);
    this.place(view, 0);
  }

  /**
   * Anda até o ponto do acerto mais recente com o espalhamento (meia-vida `followMs`), sobe `risePx` ao longo da vida, contada do último
   * acerto somado, e esmaece; o pop encolhe de 1,6 a 1,0.
   */
  private place(view: ShownNumber, dtMs: number): void {
    const f = DAMAGE_NUMBER_FEEL;
    const t = Math.min(1, Math.max(0, (this.clockMs - view.entry.lastMs) / f.lifeMs));
    const k = 1 - Math.pow(0.5, dtMs / f.followMs);
    const to = target(view);
    view.x += (to.x - view.x) * k;
    view.y += (to.y - view.y) * k;
    view.popMs = Math.max(0, view.popMs - dtMs);
    const scale = 1 + (f.popScale - 1) * (view.popMs / f.popMs);
    view.obj
      .setPosition(view.x, view.y - f.risePx * t)
      .setAlpha(1 - t)
      .setScale(scale);
  }

  private drop(id: number): void {
    this.shown.get(id)?.obj.destroy();
    this.shown.delete(id);
  }
}
