import type Phaser from 'phaser';
import type { Hit, Strength, Vec2 } from '../../core/hit';
import type { Loadout } from '../../core/loadout';
import type { Hittable, Rect } from '../bodyTags';
import type { Player } from '../Player';

/**
 * Alvo dos varredores de área do Vermelho/Azul/Desmantelar (RED-10, BLU-04/06/07, CUT-03): posição e área de
 * acerto, além do `Hittable` comum. A `Enemy` real satisfaz isto estruturalmente; o `TrainingDummy` do
 * laboratório de efeitos (T28, `src/game/FxLab.ts`) também, sem o `TechRunner` precisar conhecer nenhum dos dois.
 */
export interface TechTarget extends Hittable {
  readonly x: number;
  hurtRect(): Rect;
  /** BLU-04/05: puxão do orbe Azul (px/step, já convertido); `null` limpa (fora do raio ou orbe sumiu). */
  setPull(velocity: Vec2 | null): void;
}

/** Conjuração que originou um golpe: `id` cresce a cada conjuração iniciada, `slot` é o do loadout (MST-01, MST-02). */
export interface CastRef {
  readonly id: number;
  readonly slot: 0 | 1;
}

/** O que cada técnica enxerga do `TechRunner`: a cena, o player e os avisos que voltam para a cena. */
export interface TechContext {
  readonly scene: Phaser.Scene;
  readonly player: Player;
  readonly loadout: Loadout;
  /** Conjuração mais recente; as técnicas que vivem além do cast (orbes, cortes) guardam a própria cópia. */
  currentCast(): CastRef | null;
  /** Golpe de técnica que conectou: faísca + hitstop, sem o +3 de CE-06 (CE-08 - a cena decide isso). */
  onTechHit(hit: Hit, point: Vec2): void;
  /** MST-01/02: avisa a cena que `target` aceitou um golpe da conjuração `cast`; sem conjuração conhecida, ignora. */
  masteryHit(cast: CastRef | null, target: Hittable): void;
  /** Evento deste frame (`divergent2`, `kokusen`, `kokusenMiss`, `redDetonate`, `blueImplode`, `cut`). */
  emit(event: string): void;
}

/**
 * Marcas de todo golpe de técnica (PST-09, GND-04, GND-07): `tech` o deixa fora do limite de 1 golpe no chão; o golpe
 * forte também derruba quem sobrevive (`knockdown`, AD-021). Todo `Hit` criado pelas técnicas as leva.
 */
export const techMarks = (strength: Strength): Pick<Hit, 'tech' | 'knockdown'> =>
  strength === 'heavy' ? { tech: true, knockdown: true } : { tech: true };
