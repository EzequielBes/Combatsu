import type { BossAIState, BossAttack } from '../core/bossAI';
import type { BossBrainState } from '../core/bossBrain';
import type { BossArchetype } from '../core/bossTier';
import type { CastState } from '../core/cast';
import type { EnemyState } from '../core/enemyBrain';
import type { ToolKey } from '../core/loot';
import type { PropState } from '../core/props';
import type { RunState } from '../core/run';
import type { TechId } from '../data/techniques';

/** Estado lido pelo smoke headless em `?debug` (FND-09). */
export interface GameSnapshot {
  /** `facing` e `flash` (cor do flash em andamento, HEAL-10) servem ao smoke da economia. */
  player: { x: number; y: number; hp: number; dead: boolean; facing: 1 | -1; flash: string | null; maxHp: number; vy: number };
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
    /** Sprite da ferramenta visível (ARM-10); `null` sem arma. */
    weaponVisible: boolean | null;
    /** Estrutura do inimigo comum (STR-01), arredondada; `broken` = atordoado pela quebra (CTL-05). */
    structure: { cur: number; max: number; broken: boolean };
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
    /** Barra de energia e ícones de slot na `uiLayer` (TEC-11). */
    techIgnoredByMain: boolean;
    /** Chamada da conjuração (CAST-16), `null` fora da janela de 900 ms. */
    callout: { id: TechId; name: string } | null;
    /** Cartão 黒閃 do Kokusen (KOK-25/26), `null` fora da janela de 800 ms. */
    kokusenCard: { streak: number } | null;
    /** Estado vivo da barra de energia e dos ícones de slot (TEC-07/09/10/12). */
    energy: {
      width: number;
      fillWidth: number;
      /** Offset (px) da marca de custo a partir do início da barra; `null` sem técnica no slot (TEC-12). */
      marks: (number | null)[];
      icons: { cooldownOverlayHeight: number; iconHeight: number }[];
      flashing: boolean;
    };
  };
  /** Estado do hitstop (BWIN-02). */
  hitstop: { frozen: boolean; remainingMs: number };
  /** Carteira de fragmentos da run (ECO-19). */
  wallet: { fragments: number };
  /** Um item por pickup vivo (fragmento ou gota de cura), lido do objeto vivo (ECO-19). */
  pickups: { id: number; kind: 'fragment' | 'heal'; value: number; x: number; y: number; ageMs: number; magnet: boolean }[];
  /** Loja entre rodadas (SHOP-22): `open` só no estado `shop`; ofertas sem os espaços vazios. */
  shop: {
    open: boolean;
    offers: { id: string; level: number; maxLevel: number; cost: number; sold: boolean; affordable: boolean }[];
    rerollCost: number;
    selected: number;
    /** Painel visível: linhas de texto de cada carta (status, nome, nível, prévia, custo), realce e dica. */
    panel: { cards: { lines: string[]; highlighted: boolean }[]; hint: string } | null;
  };
  /** Nível atual de cada modificador da run (SHOP-22). */
  modifiers: Record<string, number>;
  /** Textos flutuantes de coleta ("+N") ainda na tela (ECO-30, HEAL-07). */
  floatTexts: { text: string; color: string; x: number; y: number }[];
  /** Um item por objeto na cena (mapa e ferramentas largadas), lido do objeto vivo (ARM-16). */
  worldProps: { id: number; key: string; state: PropState; x: number; y: number; durabilityLeft: number; rare: boolean; vx: number }[];
  /** Energia amaldiçoada do player (CE-01..09, TEC-08), lida do estado vivo. */
  ce: { cur: number; max: number; regen: number };
  /** Loadout de técnicas e a conjuração ativa (TEC-01..06/08, CAST-*), contrato exato da spec. */
  tech: {
    slots: [
      { id: TechId; level: 1 | 2 | 3; cooldownMs: number } | null,
      { id: TechId; level: 1 | 2 | 3; cooldownMs: number } | null,
    ];
    cast: { slot: 0 | 1; id: TechId; state: CastState; elapsedMs: number } | null;
  };
  /** Janela e zona do Kokusen (KOK-01/02/10/11/30/31), lidas do estado vivo. */
  kokusen: { zone: boolean; zoneMs: number; streak: number; windowOpen: boolean };
  /** Orbes vivos (RED-14, BLU-*); placeholder `[]` até a Fase 5 criar orbes de verdade. */
  techObjects: { id: number; kind: 'red' | 'blue'; x: number; y: number; traveled: number }[];
  /** Camadas de efeito de técnica vivas (TFX-*), lidas do `FxTimeline`/`FxRegistry` da cena. */
  fx: { live: number; degraded: boolean; layers: string[] };
  /**
   * Desvio da Fase 6 (T29/T30, CAST-15/KOK-24): a spec não tinha um jeito de o smoke ler o zoom da câmera
   * principal; acrescentado aqui só para o smoke observar o zoom durante a conjuração e o Kokusen.
   */
  camera: { zoom: number };
  /**
   * Laboratório de efeitos (T28, `?debug&fxlab`), sem contrato prévio na spec: `null` fora do fxlab. Legenda e
   * rótulo de velocidade exatos (FXL-04/08) e o estado vivo dos bonecos de treino (FXL-05/06).
   */
  fxlab: {
    legend: string;
    speedLabel: string;
    timeScale: number;
    dummies: { id: number; x: number; y: number; hp: number; maxHp: number }[];
  } | null;
}

export interface DebugProbe {
  debugSnapshot(): GameSnapshot;
}

/** O pedaço do Phaser.Game que o step usa; tipado aqui para testar com um game falso. */
export interface SteppableGame {
  loop: { sleep(): void; now: number };
  headlessStep(time: number, delta: number): void;
  /**
   * Passo completo do Phaser (com render), opcional - o game falso dos testes não precisa dele. T31
   * (`fxlab.smoke.mjs`): `render()` usa isto com `delta=0` para desenhar o quadro atual sem avançar nenhum
   * relógio, só para a captura de tela sair fiel ao estado vivo (o `headlessStep` normal nunca desenha, FND-22).
   */
  step?(time: number, delta: number): void;
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
    /** T31: desenha o quadro atual (delta 0, nenhum relógio anda) para uma captura fiel ao vivo (`page.screenshot`). */
    render(): void {
      if (!manual) {
        game.loop.sleep();
        manual = true;
        time = game.loop.now;
      }
      game.step?.(time, 0);
    },
  };
  (target as { __game?: typeof api }).__game = api;
}
