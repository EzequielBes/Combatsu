import type { CursedEnergy } from './energy';
import { CE, KOKUSEN } from '../data/techniques';
import { meleeDamageAtLevel } from './modifiers';

export type KokusenPressResult = 'hit' | 'miss' | 'ignored';

/** O que escala o Kokusen: nível de Força, multiplicador de golpe pesado da folha e multiplicador de HP da rodada. */
export interface KokusenScale {
  forca: number;
  meleeMul: number;
  hpMul: number;
}

/**
 * ESC-02: dano do Kokusen, `max(round(2,5 × meleeDamageAtLevel(D, forca) × meleeMul), round(45 × hpMul))`. `D` é o 2º
 * impacto cru com o fator de nível, sem os multiplicadores de técnica; o piso acompanha o HP do inimigo da rodada.
 */
export function kokusenDamage(secondImpact: number, scale: KokusenScale): number {
  const hit = Math.round(KOKUSEN.mul * meleeDamageAtLevel(secondImpact, scale.forca) * scale.meleeMul);
  return Math.max(hit, Math.round(KOKUSEN.damage * scale.hpMul));
}

/**
 * Kokusen / Black Flash (KOK-01..05, 09..11, 30, 31): a janela do 2º impacto do Punho Divergente, a tentativa por
 * cast (trava depois de um erro ou de um acerto) e a zona (renova a cada acerto, esfria o streak ao expirar).
 * Sem `phaser` aqui.
 */
export class Kokusen {
  private firstImpactHappened = false;
  private locked = false;
  private _zoneMs = 0;
  private _streak = 0;
  private _delayMs: number = KOKUSEN.windowTo;
  private widthMs: number = KOKUSEN.windowTo - KOKUSEN.windowFrom;

  /** `true` enquanto a zona está ativa (renovada pelo último Kokusen; KOK-10, KOK-11). */
  get zone(): boolean {
    return this._zoneMs > 0;
  }

  get zoneMs(): number {
    return this._zoneMs;
  }

  /** KOK-30, KOK-31: sequência de Kokusen na zona atual; zera quando a zona expira. */
  get streak(): number {
    return this._streak;
  }

  /** Tempo (ms) do 1º ao 2º impacto neste cast: o fim da janela e o tempo em que o anel fecha. */
  get delayMs(): number {
    return this._delayMs;
  }

  /**
   * Chamar ao iniciar um novo Punho Divergente (`sign`): libera a tentativa deste cast. Com `roll` (sorteio de 0 a
   * 1), o cast sorteia o tempo até o 2º impacto e a largura da janela dentro de `KOKUSEN.delayMs` e
   * `KOKUSEN.windowMs`, para o mesmo ritmo de dedo não acertar sempre; sem `roll`, vale a janela de base.
   */
  startAttempt(roll?: () => number): void {
    this.firstImpactHappened = false;
    this.locked = false;
    const pick = (range: { min: number; max: number }, r: number): number =>
      Math.round(range.min + (range.max - range.min) * Math.min(Math.max(r, 0), 1));
    this._delayMs = roll ? pick(KOKUSEN.delayMs, roll()) : KOKUSEN.windowTo;
    this.widthMs = roll ? pick(KOKUSEN.windowMs, roll()) : KOKUSEN.windowTo - KOKUSEN.windowFrom;
  }

  /** DIV-03: chamar quando o 1º impacto do Divergente em curso acontece; a partir daqui `press` conta (KOK-05). */
  armFirstImpact(): void {
    this.firstImpactHappened = true;
  }

  /**
   * KOK-01, KOK-02: janela aberta em função do tempo desde o 1º impacto e de a zona estar ativa. Ela termina no 2º
   * impacto (`delayMs`) e dura a largura deste cast; na zona abre mais cedo.
   */
  windowOpen(t: number): boolean {
    const early = this.zone ? KOKUSEN.windowFrom - KOKUSEN.zoneFrom : 0;
    return t >= this._delayMs - this.widthMs - early && t <= this._delayMs;
  }

  /**
   * KOK-03, KOK-04, KOK-05: resultado de apertar a tecla do slot que conjurou o Punho Divergente em curso.
   * Antes do 1º impacto, a tecla não conta (`ignored`). Depois do 1º impacto, a 1ª tentativa decide: dentro da
   * janela vira `hit`, fora dela vira `miss` e trava a tentativa (nenhum novo aperto deste cast pode virar `hit`).
   */
  press(t: number): KokusenPressResult {
    if (!this.firstImpactHappened) return 'ignored'; // KOK-05
    if (this.locked) return 'miss';
    this.locked = true; // KOK-04: trava a tentativa, acerte ou erre
    return this.windowOpen(t) ? 'hit' : 'miss';
  }

  /** KOK-09, KOK-10, KOK-30: um Kokusen acertou — soma energia (com teto), abre/renova a zona e sobe o streak. */
  land(energy: CursedEnergy): void {
    energy.gain(CE.kokusenGain);
    this._zoneMs = KOKUSEN.zoneMs;
    this._streak += 1;
  }

  /** KOK-11, KOK-31: some com a zona ao longo do tempo; ao chegar a 0, a zona fecha e o streak zera. */
  tick(dtMs: number): void {
    if (this._zoneMs <= 0) return;
    this._zoneMs = Math.max(0, this._zoneMs - dtMs);
    if (this._zoneMs === 0) this._streak = 0;
  }
}
