import type { BossAIState, BossAttack } from '../core/bossAI';
import type { BossBrainState } from '../core/bossBrain';
import type { BossArchetype } from '../core/bossTier';
import type { EnemyState } from '../core/enemyBrain';
import type { ToolKey } from '../core/loot';
import type { PropState } from '../core/props';
import type { RunState } from '../core/run';

/** Estado lido pelo smoke headless em `?debug` (FND-09). */
export interface GameSnapshot {
  player: { x: number; y: number; hp: number; dead: boolean };
  enemies: {
    id: number;
    x: number;
    y: number;
    hp: number;
    state: EnemyState;
    maxHp: number;
    damage: number;
    /** Velocidades da IA em uso, já escaladas pela rodada (DIF-04/06). */
    patrolSpeed: number;
    chaseSpeed: number;
    /** Ferramenta amaldiçoada na mão (ARM-16), `null` se desarmado. */
    weapon: ToolKey | null;
  }[];
  events: string[];
  /** Um por abate, com a posição que chegou em `onEnemyDied` (FND-08). */
  deaths: { id: number; x: number; y: number }[];
  /**
   * Estado do chefe (BHUD-04), lido do objeto vivo; `null` sem chefe na cena. `x` não está na lista da spec, mas
   * é necessário para o smoke confirmar o ponto de spawn (BOSS-03).
   */
  boss: {
    hp: number;
    maxHp: number;
    phase: 1 | 2 | 3;
    /** Fora de `active`, o estado do `BossBrain`; em `active`, o sub-estado do `BossAI` (BAT-11). */
    state: BossBrainState | BossAIState;
    attack: BossAttack | null;
    poise: number;
    archetype: BossArchetype;
    name: string;
    x: number;
    /** Centro do corpo; fica dentro da sala (0..544) durante toda a luta. */
    y: number;
  } | null;
  /**
   * Projéteis da rajada e ondas de choque do pouso do chefe, lidos do objeto vivo (BAT-03/04/06/12, BTIER-05/07).
   * `id` é único por instância (nunca reaproveitado) - o smoke usa para contar disparos mesmo que um projétil
   * já tenha sumido (acertou o player) antes do próximo nascer.
   */
  projectiles: {
    id: number;
    x: number;
    y: number;
    dir: 1 | -1;
    speed: number;
    kind: 'projectile' | 'shockwave';
    height: number;
    traveled: number;
  }[];
  /** Estado da máquina de run (RUN-09). */
  run: { state: RunState; round: number; kills: number; alive: number; queued: number };
  /** Spawn do player no level, já com o mesmo ajuste que a cena aplica (RUN-02/05). */
  level: { playerSpawn: { x: number; y: number } };
  /** Estado do HUD da run (RHUD-01..07). */
  hud: {
    ignoredByMain: boolean;
    round: string;
    remaining: string;
    banner: string | null;
    center: string[] | null;
    bannerPos: { x: number; y: number };
    bossBar: { visible: boolean; name: string; width: number; fillWidth: number; marks: number[] };
    bossBarIgnoredByMain: boolean;
    /** Texto do contador de fragmentos (ECO-16). */
    fragments: string;
    /** Objeto na mão (ITEM-01..03), `null` de mãos vazias. */
    heldItem: { name: string; pips: number; maxPips: number } | null;
  };
  /** Estado do hitstop (BWIN-02). */
  hitstop: { frozen: boolean; remainingMs: number };
  /** Carteira de fragmentos da run (ECO-19). */
  wallet: { fragments: number };
  /** Um item por pickup vivo (fragmento ou gota de cura), lido do objeto vivo (ECO-19). */
  pickups: { id: number; kind: 'fragment' | 'heal'; value: number; x: number; y: number; ageMs: number; magnet: boolean }[];
  /** Textos flutuantes de coleta ("+N") ainda na tela (ECO-30, HEAL-07). */
  floatTexts: { text: string; color: string; x: number; y: number }[];
  /** Um item por objeto na cena (mapa e ferramentas largadas), lido do objeto vivo (ARM-16). */
  worldProps: { id: number; key: string; state: PropState; x: number; y: number; durabilityLeft: number; rare: boolean }[];
}

export interface DebugProbe {
  debugSnapshot(): GameSnapshot;
}

/** O pedaço do Phaser.Game que o step usa; tipado aqui para testar com um game falso. */
export interface SteppableGame {
  loop: { sleep(): void; now: number };
  headlessStep(time: number, delta: number): void;
}

const STEP_MS = 1000 / 60;
let probe: DebugProbe | null = null;

/** A cena se registra no create e passa `null` no SHUTDOWN. */
export function registerDebugProbe(p: DebugProbe | null): void {
  probe = p;
}

/**
 * Só com `debugOn` define `target.__game` (FND-10). O primeiro `step` dorme o loop de tempo real: dali em
 * diante o jogo só anda por `step`, em passos fixos de 1000/60 ms (FND-22).
 */
export function installDebugApi(game: SteppableGame, target: object, debugOn: boolean): void {
  if (!debugOn) return;
  let manual = false;
  let time = 0;
  const api = {
    snapshot(): GameSnapshot {
      if (!probe) throw new Error('nenhuma cena registrada no debug');
      return probe.debugSnapshot();
    },
    step(ms: number): void {
      if (!manual) {
        game.loop.sleep();
        manual = true;
        time = game.loop.now;
      }
      const n = Math.ceil(ms / STEP_MS);
      for (let i = 0; i < n; i++) {
        time += STEP_MS;
        game.headlessStep(time, STEP_MS);
      }
    },
  };
  (target as { __game?: typeof api }).__game = api;
}
