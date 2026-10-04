import type Phaser from 'phaser';
import type { EnemyAI } from '../../core/enemyAI';
import type { EnemyBase } from '../../core/difficulty';
import type { EnemyBrain } from '../../core/enemyBrain';
import type { EnemyGuard } from '../../core/enemyGuard';
import type { EnemyVariant } from '../../core/enemyVariant';
import type { Vec2 } from '../../core/hit';
import type { Structure } from '../../core/structure';
import type { BodyRenderPos } from '../physics';
import type { Ragdoll } from '../Ragdoll';

/** Estado mutável que mais de uma parte do inimigo lê ou escreve; mora aqui para ninguém ter dono duplicado. */
export interface EnemyShared {
  facing: 1 | -1;
  ragdoll: Ragdoll | null;
  /**
   * vx da IA em px por step, reaplicado a cada step do Matter (null = a física manda). O Matter roda em passo
   * fixo de 60 Hz e dá vários steps por frame abaixo de 60 fps; aplicado só uma vez por frame, o atrito com o
   * chão comia o vx nos steps seguintes e a velocidade caía junto com o fps (AI-06).
   */
  walkVxStep: number | null;
  /** Tempo (ms de jogo) sem atacar nem andar depois de um parry (PAR-10). */
  suppressedMs: number;
  removed: boolean;
}

/** Saídas do inimigo para a cena, lidas na hora da chamada (a cena as liga depois do spawn). */
export interface EnemyHooks {
  /** Evento de debug (`guardBreak:<id>`, ...). */
  event(name: string): void;
  /** Faísca azul do bloqueio, no ponto de contato. */
  block(point: Vec2): void;
}

/** O que as partes do inimigo compartilham: os objetos do núcleo (corpo, cérebro, IA, postura, guarda) e o estado comum. */
export interface EnemyCtx {
  readonly id: number;
  readonly scene: Phaser.Scene;
  readonly body: MatterJS.BodyType;
  readonly tuning: EnemyBase;
  readonly variant: EnemyVariant;
  readonly brain: EnemyBrain;
  readonly ai: EnemyAI;
  readonly structure: Structure;
  readonly guard: EnemyGuard;
  readonly drawPos: BodyRenderPos;
  readonly hooks: EnemyHooks;
  readonly s: EnemyShared;
}
