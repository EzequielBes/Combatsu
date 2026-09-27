import Phaser from 'phaser';
import { CastMachine, type ActiveCastView, type CastContext, type CastEvent } from '../core/cast';
import type { CursedEnergy } from '../core/energy';
import type { Loadout } from '../core/loadout';
import type { Player } from './Player';

type Key = Phaser.Input.Keyboard.Key;
// JustDown "consome" a borda: chamar em todas as teclas, não parar na primeira (mesmo padrão de input.ts).
const anyJustDown = (keys: Key[]): boolean => keys.map((k) => Phaser.Input.Keyboard.JustDown(k)).some(Boolean);

/**
 * Conjuração de técnicas do player (design "TechCaster.ts"): teclas `L`/`C` (slot 1) e `I`/`V` (slot 2) — se as
 * duas forem apertadas no mesmo frame, só o slot 1 conta (edge case). Dona da `CastMachine` e dos ganchos finos
 * do `Player` (`castLock`, `cancelMelee`, `onDamaged`); T20 acrescenta os fx comuns (aura, zoom, callout) por
 * cima do mesmo `cast`, e T22+ chama o `TechRunner` a partir do evento `techCast:<id>`.
 */
export class TechCaster {
  private readonly machine: CastMachine;
  private readonly slot1Keys: Key[];
  private readonly slot2Keys: Key[];
  private pendingEvents: string[] = [];
  private frameEvents: string[] = [];
  private framePressed: [boolean, boolean] = [false, false];

  constructor(
    scene: Phaser.Scene,
    private readonly player: Player,
    energy: CursedEnergy,
    loadout: Loadout,
  ) {
    this.machine = new CastMachine(energy, loadout);
    const kb = scene.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.slot1Keys = [kb.addKey(K.L), kb.addKey(K.C)];
    this.slot2Keys = [kb.addKey(K.I), kb.addKey(K.V)];
    // CAST-07/20/21: dano em sign/charge cancela a conjuração; gancho fino do Player, lógica aqui.
    player.onDamaged = () => this.pendingEvents.push(...this.mapEvents(this.machine.damageTaken()));
  }

  /** Conjuração ativa (contrato `tech.cast` do snapshot, TEC-08). */
  get cast(): ActiveCastView | null {
    return this.machine.cast;
  }

  /** Eventos de debug deste frame (`techCast:<id>`, `techDenied:<motivo>`, `techCancel`). */
  get events(): readonly string[] {
    return this.frameEvents;
  }

  /**
   * Slot apertado (JustDown) neste frame, mesmo enquanto uma conjuração já está em andamento nesse slot (T23: o
   * Kokusen precisa saber disso mesmo quando `request` só devolve `[]` por já haver um cast ativo, CAST-08). Só
   * slot 1 conta se os dois vierem no mesmo frame (edge case da spec).
   */
  get slotPressed(): readonly [boolean, boolean] {
    return this.framePressed;
  }

  /**
   * FxLab (T28): pede a conjuração do `slot` sem depender do teclado - mesmo caminho de `request` que uma tecla
   * real usaria (CAST-01/09/10), incluindo o cancelamento do golpe em andamento. Os eventos entram no próximo
   * `update` (mesmo canal de `onDamaged`), então deve ser chamado antes dele no mesmo frame.
   */
  requestSlot(slot: 0 | 1): void {
    const ctx: CastContext = { meleePhase: this.player.meleePhase(), busy: this.player.isBusyForCast() };
    const reqEvents = this.machine.request(slot, ctx);
    if (reqEvents.some((e) => e.type === 'enter')) this.player.cancelMelee();
    this.pendingEvents.push(...this.mapEvents(reqEvents));
  }

  /**
   * FxLab (T28): força o slot como apertado neste frame (KOK-03 sem depender do teclado, timing garantido pelo
   * laboratório). Só vale chamado depois do `update` deste frame - senão o próprio `update` sobrescreve.
   */
  forcePress(slot: 0 | 1): void {
    this.framePressed = slot === 0 ? [true, this.framePressed[1]] : [this.framePressed[0], true];
  }

  update(dtMs: number): void {
    const events = [...this.pendingEvents];
    this.pendingEvents = [];
    // CAST-01/05/06/08/09/10: slot 1 (L/C) vence sobre o slot 2 (I/V) quando os dois são apertados no mesmo frame.
    const slot1 = anyJustDown(this.slot1Keys);
    const slot2 = anyJustDown(this.slot2Keys);
    this.framePressed = [slot1, slot2 && !slot1];
    const ctx: CastContext = { meleePhase: this.player.meleePhase(), busy: this.player.isBusyForCast() };
    const reqEvents = slot1 ? this.machine.request(0, ctx) : slot2 ? this.machine.request(1, ctx) : [];
    // CAST-10: um pedido que de fato inicia a conjuração encerra o golpe corpo a corpo em andamento (recover).
    if (reqEvents.some((e) => e.type === 'enter')) this.player.cancelMelee();
    events.push(...this.mapEvents(reqEvents));
    events.push(...this.mapEvents(this.machine.update(dtMs)));
    this.frameEvents = events;
    this.applyCastLock();
  }

  private applyCastLock(): void {
    const cast = this.machine.cast;
    this.player.castLock = cast ? { id: cast.id, state: cast.state } : null;
  }

  private mapEvents(evs: CastEvent[]): string[] {
    const out: string[] = [];
    for (const ev of evs) {
      if (ev.type === 'enter' && ev.state === 'release') {
        // CAST-17: o id vem do cast ainda ativo neste mesmo tick (a entrada em `release` não o encerra).
        const id = this.machine.cast?.id;
        if (id) out.push(`techCast:${id}`);
      } else if (ev.type === 'denied') out.push(`techDenied:${ev.reason}`);
      else if (ev.type === 'cancel') out.push('techCancel');
    }
    return out;
  }
}
