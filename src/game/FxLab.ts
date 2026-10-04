import Phaser from 'phaser';
import { Filters } from '../core/collision';
import { DummyHealth } from '../core/dummyHealth';
import type { CursedEnergy } from '../core/energy';
import type { Hit, Vec2 } from '../core/hit';
import type { Loadout } from '../core/loadout';
import type { CastState } from '../core/cast';
import type { TechId } from '../data/techniques';
import { newEntityId, tagBody, type Rect } from './bodyTags';
import { PALETTE } from './art/palette';
import { ENEMY_ORIGIN } from './art/sprites/enemy';
import type { Player } from './Player';
import { SIZE, TEX } from './textures';
import type { TechCaster } from './TechCaster';
import type { TechTarget } from './TechRunner';

/** FXL-06: vida máxima do boneco de treino - alta o bastante para aguentar uma sequência de técnicas seguidas. */
const DUMMY_MAX_HP = 1000;
/** FXL-06: tempo (ms) até a vida voltar ao máximo depois de zerar. */
const DUMMY_REGEN_MS = 1000;
/** FXL-05: offsets (px) de `playerSpawn.x` para os 3 bonecos, no chão principal. */
const DUMMY_OFFSETS = [120, 200, 280] as const;
/** Distância (px) do boneco em que o Punho Divergente/Kokusen conectam (DIV-02: janela segura de 11-59 px). */
const MELEE_RANGE_PX = 40;

/**
 * Boneco de treino do laboratório de efeitos (FXL-05/06): fica parado, nunca "morre" de verdade (`isDead` sempre
 * `false`, para o Punho Divergente/Kokusen nunca cancelarem o 2º impacto por alvo morto) e volta ao hp máximo
 * 1000 ms depois de zerar. Implementa `TechTarget` (não é uma `Enemy`) - o corpo físico usa a mesma categoria de
 * colisão do inimigo comum (`Filters.enemy`), então toda técnica o acerta pelo mesmo caminho de sempre.
 */
export class TrainingDummy implements TechTarget {
  readonly id = newEntityId();
  readonly team = 'enemy' as const;
  private readonly body: MatterJS.BodyType;
  private readonly view: Phaser.GameObjects.Sprite;
  private readonly health = new DummyHealth(DUMMY_MAX_HP, DUMMY_REGEN_MS);

  constructor(scene: Phaser.Scene, spawn: Vec2) {
    const { w, h } = SIZE.enemy;
    this.body = scene.matter.add.rectangle(spawn.x, spawn.y, w, h, {
      friction: 0.8,
      frictionAir: 0.02,
      chamfer: { radius: 4 },
      collisionFilter: { ...Filters.enemy },
    });
    scene.matter.body.setInertia(this.body, Infinity);
    tagBody(this.body, { kind: 'character', target: this });
    this.view = scene.add
      .sprite(spawn.x, spawn.y + h / 2, TEX.enemy, 'idle-0')
      .setOrigin(ENEMY_ORIGIN.x, ENEMY_ORIGIN.y)
      .setTint(PALETTE.M);
  }

  get x(): number {
    return this.body.position.x;
  }

  get fxSprite(): Phaser.GameObjects.Sprite {
    return this.view;
  }

  hurtRect(): Rect {
    const { x, y } = this.body.position;
    return { x, y, width: SIZE.enemy.w, height: SIZE.enemy.h };
  }

  /** FXL-06: nunca "morre" de verdade - só zera e volta ao máximo, ficando no lugar o tempo todo. */
  isDead(): boolean {
    return false;
  }

  setPull(_velocity: Vec2 | null): void {
    // Boneco de treino fica sempre parado (não é puxado pelo Azul); só existe para satisfazer `TechTarget`.
  }

  receiveHit(hit: Hit): boolean {
    this.health.receive(hit.damage); // FXL-06: ao zerar, 1000 ms até voltar ao hp cheio
    return true;
  }

  /** FXL-06: conta os 1000 ms até o hp voltar ao máximo. */
  update(dtMs: number): void {
    this.view.setPosition(this.body.position.x, this.body.position.y + SIZE.enemy.h / 2);
    this.health.update(dtMs);
  }

  debug(): { id: number; x: number; y: number; hp: number; maxHp: number } {
    return { id: this.id, x: this.x, y: this.body.position.y, hp: this.health.hp, maxHp: DUMMY_MAX_HP };
  }

  destroyNow(): void {
    this.view.destroy();
  }
}

/** Cast fictício de sinal/carga só para a aura (tecla 1, FXL-02): nunca passa por `CastMachine`/`Loadout`/`CursedEnergy`. */
const AURA_DEMO_SIGN_MS = 400;
const AURA_DEMO_CHARGE_MS = 500;
const AURA_DEMO_TOTAL_MS = AURA_DEMO_SIGN_MS + AURA_DEMO_CHARGE_MS;

/**
 * Laboratório de efeitos (T28, `?debug&fxlab`): 3 bonecos de treino que voltam ao hp cheio (FXL-06), teclas 1-6
 * disparando cada efeito mirado no boneco mais próximo sem gastar energia nem mexer em recarga (FXL-07/09), e a
 * tecla 0 alternando a câmera lenta (FXL-03). Reusa o `TechCaster`/`TechRunner`/`Loadout`/`CursedEnergy` reais da
 * cena - a única forma de garantir que o laboratório mostra exatamente os mesmos efeitos do jogo de verdade.
 */
export class FxLab {
  static readonly LEGEND = '1 aura · 2 divergente · 3 kokusen · 4 vermelho · 5 azul · 6 corte · 0 lento';

  readonly dummies: TrainingDummy[] = [];
  private timeScaleValue: 1 | 0.25 = 1;
  private auraDemoMsLeft = 0;
  /** `true` depois da tecla 3: arma para a próxima vez que a janela do Kokusen abrir (KOK-03 sem timing manual). */
  private wantsKokusen = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    private readonly loadout: Loadout,
    private readonly energy: CursedEnergy,
    private readonly techCaster: TechCaster,
  ) {}

  /** FXL-05: 3 bonecos no chão principal, em `playerSpawn.x + 120/200/280`. */
  spawnDummies(playerSpawn: Vec2): void {
    for (const offset of DUMMY_OFFSETS) {
      this.dummies.push(new TrainingDummy(this.scene, { x: playerSpawn.x + offset, y: playerSpawn.y }));
    }
  }

  get timeScale(): 1 | 0.25 {
    return this.timeScaleValue;
  }

  /** FXL-08: rótulo exato mostrado no HUD. */
  get speedLabel(): string {
    return `velocidade: ${this.timeScaleValue === 1 ? '1x' : '0.25x'}`;
  }

  /** FXL-03: alterna a escala de tempo da cena entre 1 e 0.25 (tempo de jogo, tweens e física do Matter juntos). */
  toggleTimeScale(): void {
    this.timeScaleValue = this.timeScaleValue === 1 ? 0.25 : 1;
    this.scene.time.timeScale = this.timeScaleValue;
    this.scene.tweens.timeScale = this.timeScaleValue;
    this.scene.matter.world.engine.timing.timeScale = this.timeScaleValue;
  }

  /** FXL-06: bonecos ficam contando o próprio relógio de regeneração, já escalado por `timeScale` (o chamador passa o dt escalado). */
  update(dtMs: number): void {
    for (const d of this.dummies) d.update(dtMs);
    if (this.auraDemoMsLeft > 0) this.auraDemoMsLeft = Math.max(0, this.auraDemoMsLeft - dtMs);
  }

  /** CAST-14 por cima da aura real: cast fictício de `sign`/`charge` só para a tecla 1 (não passa pelo `TechCaster`). */
  auraDemoCast(): { slot: 0 | 1; id: TechId; state: CastState; elapsedMs: number } | null {
    if (this.auraDemoMsLeft <= 0) return null;
    const elapsed = AURA_DEMO_TOTAL_MS - this.auraDemoMsLeft;
    return { slot: 0, id: 'divergente', state: elapsed < AURA_DEMO_SIGN_MS ? 'sign' : 'charge', elapsedMs: elapsed };
  }

  private nearestDummy(x: number): TrainingDummy | null {
    let best: TrainingDummy | null = null;
    let bestDist = Infinity;
    for (const d of this.dummies) {
      const dist = Math.abs(d.x - x);
      if (dist < bestDist) {
        best = d;
        bestDist = dist;
      }
    }
    return best;
  }

  /** FXL-02: dispara o efeito da tecla `n`, mirado no boneco mais próximo. FXL-07/09 ficam a cargo do chamador. */
  pressKey(n: 1 | 2 | 3 | 4 | 5 | 6): void {
    if (n === 1) {
      this.auraDemoMsLeft = AURA_DEMO_TOTAL_MS; // só a aura (key 1); não toca em loadout/energia/cooldown.
      return;
    }
    const id: TechId = n === 2 || n === 3 ? 'divergente' : n === 4 ? 'vermelho' : n === 5 ? 'azul' : 'corte';
    const target = this.nearestDummy(this.player.sprite.x);
    if (target) {
      const dir: 1 | -1 = target.x >= this.player.sprite.x ? 1 : -1;
      // O Punho Divergente/Kokusen (2/3) são corpo a corpo (alcance ~59 px, DIV-02) - bem mais curto que os 120 px
      // do boneco mais próximo (FXL-05). Sem isso a tecla nunca tocaria em nada; teleporta para dentro do alcance
      // (as técnicas à distância, 4-6, já alcançam os 120-420 px de onde o player nasce, sem precisar andar).
      if (n === 2 || n === 3) this.player.debugTeleportX(target.x - dir * MELEE_RANGE_PX);
      this.player.debugFace(dir);
    }
    this.loadout.equip(0, id, 1);
    this.loadout.clearCooldown(0);
    this.energy.gain(this.energy.max); // FXL-07: sempre no teto antes de pedir a conjuração.
    this.techCaster.requestSlot(0);
    this.wantsKokusen = n === 3;
  }

  /**
   * KOK-03 sem timing (tecla 3): observa a janela do Kokusen abrir e injeta a "tecla apertada de novo" nesse
   * exato frame - `windowOpen` já reflete o estado no início do frame (antes do `TechRunner.update` avançar o
   * relógio), então chamar isto logo antes dele arma o mesmo frame em que a janela abriu.
   */
  consumeKokusenAutoPress(windowOpen: boolean): boolean {
    if (!this.wantsKokusen || !windowOpen) return false;
    this.wantsKokusen = false;
    return true;
  }

  /** Contrato de debug do laboratório (T28, sem contrato prévio na spec): estado dos bonecos e da câmera lenta. */
  debug(): {
    legend: string;
    speedLabel: string;
    timeScale: number;
    dummies: { id: number; x: number; y: number; hp: number; maxHp: number }[];
  } {
    return {
      legend: FxLab.LEGEND,
      speedLabel: this.speedLabel,
      timeScale: this.timeScaleValue,
      dummies: this.dummies.map((d) => d.debug()),
    };
  }

  /** Some com os bonecos e devolve o tempo ao normal (SHUTDOWN da cena). */
  destroyNow(): void {
    for (const d of this.dummies) d.destroyNow();
    this.scene.time.timeScale = 1;
    this.scene.tweens.timeScale = 1;
    if (this.scene.matter.world?.engine) this.scene.matter.world.engine.timing.timeScale = 1;
  }
}
