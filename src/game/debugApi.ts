import type { AttackKind } from '../core/attackKind';
import type { BossAIState, BossAttack } from '../core/bossAI';
import type { BossBrainState } from '../core/bossBrain';
import type { BossArchetype } from '../core/bossTier';
import type { CastState } from '../core/cast';
import type { CounterKind } from '../core/counter';
import type { EnemyVariant } from '../core/enemyVariant';
import type { EnemyAIState } from '../core/enemyAI';
import type { EnemyState } from '../core/enemyBrain';
import type { ToolKey } from '../core/loot';
import type { PropState } from '../core/props';
import type { RunState } from '../core/run';
import type { TechId } from '../data/techniques';

/** Maestria do slot (MST-08): pontos atuais e limiar do nível atual (`null` no Nv3, que não acumula). */
export interface TechMasteryView {
  points: number;
  threshold: number | null;
}

/** Estado lido pelo smoke headless em `?debug` (FND-09). */
export interface GameSnapshot {
  /** `facing` e `flash` (cor do flash em andamento, HEAL-10) servem ao smoke da economia. */
  player: {
    x: number;
    y: number;
    hp: number;
    dead: boolean;
    facing: 1 | -1;
    flash: string | null;
    maxHp: number;
    vy: number;
    /** Nome do golpe em curso, `null` sem golpe (MOV-18). */
    move: string | null;
    /** Frame do sprite do jogador em cena, ex.: `guard` (CTL-09). */
    frame: string;
    /** Textura do sprite do jogador em cena (`player-art`, `player-rig` ou `player-hd`). */
    sheet?: string;
    /** Centro do corpo como a tela o mostra: interpolado entre os dois últimos passos de física (ITP-05). */
    view: { x: number; y: number };
    /** `parry` = janela de parry aberta (GRD-01, PAR-01). */
    guard: 'none' | 'guard' | 'parry';
    /** Estrutura 0..100 arredondada; `broken` = atordoado pela guarda quebrada (STR-01, STR-06). */
    structure: { cur: number; max: number; broken: boolean };
    dodge: { active: boolean; invulnerable: boolean; cooldownMs: number };
    /** Abaixado: `active` pelos 320 ms de jogo do abaixar (DEF-07, DEF-09, DEF-10). */
    duck: { active: boolean };
    /** Janela de Contra (CNT-01..07): `remainingMs` é tempo de jogo e não diminui no hitstop (CNT-20). */
    counter: { open: boolean; kind: CounterKind | null; remainingMs: number };
    /** Invulnerável depois de um golpe cheio, por 300 ms de jogo (PST-15). */
    invulnerable: boolean;
  };
  enemies: {
    id: number;
    x: number;
    y: number;
    hp: number;
    state: EnemyState;
    /** Estado da IA (`chase|hold|approach|windup|attack|rest`, SPN-10, LIM-03). */
    ai: EnemyAIState;
    maxHp: number;
    damage: number;
    /** Velocidade de perseguição da IA em uso, já escalada pela rodada (DIF-04/06). */
    chaseSpeed: number;
    /** Ferramenta amaldiçoada na mão (ARM-16), `null` se desarmado. */
    weapon: ToolKey | null;
    /** Sprite da ferramenta visível (ARM-10); `null` sem arma. */
    weaponVisible: boolean | null;
    /** Estrutura do inimigo comum (STR-01), arredondada; `broken` = atordoado pela quebra (CTL-05). */
    structure: { cur: number; max: number; broken: boolean };
    /** Guardando (EBL-01) (CTL-05). */
    guarding: boolean;
    /** Aparência sorteada (EVR-04/05). */
    variant: EnemyVariant;
    /** Centro do corpo como a tela o mostra (ITP-07). */
    view: { x: number; y: number };
    /** Frame atual do sprite e se ele está visível (HRX-02/05). */
    frame: string;
    spriteVisible: boolean;
    /** Ragdoll visível; `null` fora de ragdoll (HRX-05/06). */
    ragdollVisible: boolean | null;
    /** Chaves de textura das 6 partes do ragdoll; `null` fora de ragdoll (EVR-06). */
    ragdollTextures: string[] | null;
    /** Deslizamento do golpe forte em curso (RCT-06); `null` fora dele. */
    slide: { remainingPx: number } | null;
    /** Frame do marcador de telegrafo visível, lido do sprite desenhado; `null` com ele escondido (HGT-07, HGT-08). */
    telegraph: AttackKind | null;
    /** Comprometido: o golpe pendente sai mesmo levando golpe comum (CMT-01). */
    committed: boolean;
    /** Chave da `PALETTE` do flash de compromisso em curso, lida do tint do sprite; `null` fora dele (CMT-02). */
    commitFlash: string | null;
    /** Tipo do golpe e posição na sequência: `index` a partir de 1 em `windup` e `attack`, 0 fora (DFL-15). */
    attack: { kind: AttackKind; index: number; length: number };
    /** Golpes aceitos no `ragdollStun` atual (GND-05). */
    downHits: number;
    /** Leves seguidos aceitos por este inimigo (RDG-13..15). */
    lightStreak: number;
    /** A guarda de pé é de leitura (RDG-06). */
    guardRead: boolean;
  }[];
  /** Foco da postura: último inimigo comum que aceitou golpe corpo a corpo, de objeto ou o finalizador (PST-13); `null` sem foco. */
  focusId: number | null;
  /** Último golpe do grafo iniciado e as repetições dele nos 3000 ms anteriores (RDG-01); `move` `null` sem histórico. */
  reading: { move: string | null; repeats: number };
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
    /** Centro do corpo como a tela o mostra (ITP-07). */
    view: { x: number; y: number };
    /** O finalizador (J+K) ainda pode ser usado neste `stagger` (BFX-06, BFX-07). */
    finisherReady: boolean;
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
  run: { state: RunState; round: number; kills: number; alive: number; queued: number; maxAlive: number };
  /** Inimigos comuns em `windup` ou `attack` agora (LIM-01). */
  attackers: number;
  /** Limitador de atacantes (LIM-01, LIM-04): vagas ocupadas e ids na fila FIFO. */
  gate: { active: number; queue: number[] };
  /** Spawn do player no level, já com o mesmo ajuste que a cena aplica (RUN-02/05). */
  level: { playerSpawn: { x: number; y: number } };
  /** Área atual (LEG-05): modo, ids dos módulos, tamanho em px, selo fechado, borda esquerda do selo e corpos estáticos do Matter. */
  area: {
    mode: 'modular' | 'sala';
    modules: string[];
    widthPx: number;
    heightPx: number;
    sealed: boolean;
    exitX: number | null;
    staticBodies: number;
    /** Folha de terreno do chão no meio de cada trecho, lida da imagem desenhada (THM-02); vazio na sala. */
    sheets: { id: string; sheet: string | null }[];
    /** Cores `wall` e `top` das faixas do fundo próximo, uma por trecho (THM-02); vazio na sala. */
    bands: { wall: string; top: string }[];
    /** Tema de cada faixa da camada média, uma por trecho (CEN-10); vazio na sala. */
    midBands: { theme: string }[];
    /** Peças de decoração desenhadas na área (CEN-13); 0 na sala e com `?debug&decor=0`. */
    decor: number;
    /** Arquétipo do chefe que o fundo da arena recebeu (ARN-05); `null` fora da área de chefe. */
    arenaVariant: string | null;
    /** Selo da esquerda da arena (ARN-07, ARN-08); `null` fora da arena ou depois do efeito. */
    leftSeal: { texture: string; frame: string; alpha: number } | null;
    /** Véu vermelho da fase do chefe, lido do objeto (ARN-09..11); `null` fora da arena. */
    veil: { alpha: number; depth: number; color: number; scroll: number } | null;
    /** Rolagem do primeiro plano lida do objeto (CEN-11); `null` na sala e com `?debug&decor=0`. */
    front: { sx: number; sy: number } | null;
    /** Profundidades vivas da camada próxima, da decoração e do player, e o pé da decoração em px (CEN-13). */
    layout: {
      nearDepth: number | null;
      decorDepth: number | null;
      decorFoot: number | null;
      /** Peças de decoração desenhadas em cada módulo, na ordem dos módulos. */
      decorPerModule: number[];
      /** Profundidade dos tiles do terreno (CEN-13); `null` sem tiles. */
      terrainDepth: number | null;
      playerDepth: number;
      /** Menor profundidade entre os inimigos vivos (CEN-13); `null` sem inimigo. */
      enemyMinDepth: number | null;
    };
    /** Todos os corpos do mundo do Matter, estáticos e dinâmicos (CEN-14). */
    bodies: number;
    /** Imagem do selo desenhada agora (THM-03); `null` sem selo ou depois do efeito de 400 ms. */
    seal: { texture: string; frame: string; alpha: number } | null;
    /** Entre o início do fade de saída e o fim do fade de entrada: o input do player é neutro (TRV-10). */
    transitioning: boolean;
    /** Fade da câmera do mundo (TRV-10): `out` escurece, senão clareia; `alpha` de 0 (claro) a 1 (preto). */
    fade: { running: boolean; out: boolean; alpha: number };
  };
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
    /** HUD do combo (CMB-04/05): texto `N hits` e letra da nota, `null` escondidos; `x` é a borda direita. */
    combo: { text: string | null; grade: string | null; x: number; ignoredByMain: boolean };
    /** Texto do painel de controles na tela (CTL-06). */
    controls: string;
    /** Contorno do rótulo "CE" da barra de energia, lido do texto vivo (CEN-05). */
    ceOutline: { stroke: string; thickness: number };
    /** Contorno lido dos textos vivos do HUD (CEN-05). */
    outlines: Record<
      'hp' | 'fragments' | 'heldItem' | 'round' | 'remaining' | 'bossName',
      { stroke: string; thickness: number }
    >;
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
      /** MST-08: largura (px) da barra de maestria de cada slot, `null` se não está desenhada (vazio ou Nv3). */
      masteryBars: (number | null)[];
      flashing: boolean;
    };
  };
  /** Contador de combo (CMB-01..03): hits e nota (`null` com menos de 2 hits). */
  combo: { hits: number; grade: 'D' | 'C' | 'B' | 'A' | 'S' | null };
  /** Escala de tempo da cena: 1, ou 0.3 na câmera lenta da esquiva perfeita (DOD-07). */
  timeScale: number;
  /** Estado do hitstop (BWIN-02). */
  hitstop: { frozen: boolean; remainingMs: number };
  /** Carteira de fragmentos da run (ECO-19). */
  wallet: { fragments: number };
  /** Um item por pickup vivo (fragmento ou gota de cura), lido do objeto vivo (ECO-19). */
  pickups: {
    id: number;
    kind: 'fragment' | 'heal' | 'elixir';
    value: number;
    x: number;
    y: number;
    ageMs: number;
    magnet: boolean;
  }[];
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
  /** Build deduzida das compras, pontos por linha e passivas da run (BLD-*). */
  build: { build: string | null; points: Record<string, number>; perks: string[]; shadowArmed: boolean };
  /** Relíquia e arma vinculada equipadas, com o nível, e a ferramenta comprada ainda não entregue (ARS-*). */
  arsenal: {
    relic: string | null;
    relicLevel: number;
    weapon: string | null;
    weaponLevel: number;
    tool: string | null;
  };
  /** Textos flutuantes de coleta ("+N") ainda na tela (ECO-30, HEAL-07). */
  floatTexts: { text: string; color: string; x: number; y: number }[];
  /** Um item por objeto na cena (mapa e ferramentas largadas), lido do objeto vivo (ARM-16). */
  worldProps: {
    id: number;
    key: string;
    state: PropState;
    x: number;
    y: number;
    durabilityLeft: number;
    rare: boolean;
    vx: number;
    /** Textura e frame do sprite (`__MISSING` = chave sem textura registrada). */
    texture: string;
    frame: string;
  }[];
  /** Energia amaldiçoada do player (CE-01..09, TEC-08), lida do estado vivo. */
  ce: { cur: number; max: number; regen: number };
  /** Loadout de técnicas e a conjuração ativa (TEC-01..06/08, CAST-*), contrato exato da spec. */
  tech: {
    slots: [
      { id: TechId; level: 1 | 2 | 3; cooldownMs: number; mastery: TechMasteryView } | null,
      { id: TechId; level: 1 | 2 | 3; cooldownMs: number; mastery: TechMasteryView } | null,
    ];
    cast: { slot: 0 | 1; id: TechId; state: CastState; elapsedMs: number } | null;
  };
  /** Janela e zona do Kokusen (KOK-01/02/10/11/30/31), lidas do estado vivo. */
  kokusen: { zone: boolean; zoneMs: number; streak: number; windowOpen: boolean };
  /** Orbes vivos (RED-14, BLU-*); placeholder `[]` até a Fase 5 criar orbes de verdade. */
  techObjects: { id: number; kind: 'red' | 'blue'; x: number; y: number; traveled: number }[];
  /** Camadas de efeito de técnica vivas (TFX-*), lidas do `FxTimeline`/`FxRegistry` da cena. */
  fx: {
    live: number;
    degraded: boolean;
    layers: string[];
    /** Centro da aura de conjuração enquanto visível (ITP-10); `null` sem aura. */
    aura: { x: number; y: number } | null;
    /** Rastros de energia vivos (TRL-10). */
    trails: { tier: 'light' | 'heavy'; widthPx: number; ageMs: number }[];
    /** Linhas de foco do golpe decisivo (FOC-01); `null` fora dos 180 ms reais. */
    focus: { lines: number; ageMs: number } | null;
    /** Último impacto do golpe do jogador (IMP-16); `null` antes do primeiro. */
    lastImpact: { tier: 'light' | 'heavy' | 'decisive'; impactFrame: boolean } | null;
    /** Vermelho (RDA-04/05/06/13, EDG-01): cores do halo e do flash, Glow só com WebGL, centro do orbe na carga. */
    red: {
      glowColor: number | null;
      glow: { active: boolean; color: number | null };
      screenFlashColor: number | null;
      orb: { x: number; y: number } | null;
    };
  };
  /**
   * Desvio da Fase 6 (T29/T30, CAST-15/KOK-24): a spec não tinha um jeito de o smoke ler o zoom da câmera
   * principal; acrescentado aqui só para o smoke observar o zoom durante a conjuração e o Kokusen.
   */
  camera: {
    zoom: number;
    worldView: { left: number; right: number };
    /** Limites da câmera do mundo (`getBounds`): a área inteira em px (ARE-10). */
    bounds: { x: number; y: number; width: number; height: number };
    /** Centro da câmera do mundo em ponto flutuante e o scroll aplicado, na grade de pixel de tela (CAM-07). */
    center: { x: number; y: number };
    scroll: { x: number; y: number };
    /** `roundPixels` da câmera do mundo e se o `startFollow` do Phaser está ligado; os dois ficam desligados (CAM-07). */
    roundPixels: boolean;
    phaserFollow: boolean;
  };
  /** Fração (0 a 1) entre os dois últimos passos de física que este quadro desenha (ITP-05, ITP-07). */
  physics: { alpha: number };
  /** Distância (px, centro a centro) ao inimigo comum quebrado mais perto, a do finalizador (FIN-01/03); `null` sem alvo. */
  finisher: { distPx: number | null };
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
