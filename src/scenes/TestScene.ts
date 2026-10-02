import Phaser from 'phaser';
import { armFor, propName, rareDef } from '../core/armed';
import { bossSpecFor } from '../core/bossTier';
import { Filters } from '../core/collision';
import { scaleFor } from '../core/difficulty';
import { DroppedTools } from '../core/droppedTools';
import type { CastState } from '../core/cast';
import { ComboCounter } from '../core/comboCounter';
import { CursedEnergy } from '../core/energy';
import { FxRegistry } from '../core/fxRegistry';
import { FxTimeline } from '../core/fxTimeline';
import type { Hit, Strength, Vec2 } from '../core/hit';
import { AttackGate } from '../core/attackGate';
import { Hitstop } from '../core/hitstop';
import { TILE, parseLevel, tileVariant, type LevelData } from '../core/level';
import { Loadout } from '../core/loadout';
import { Mastery, type MasterySlot } from '../core/mastery';
import { parseVariant, pickEnemyVariant } from '../core/enemyVariant';
import { capDrop, Loot, type EnemyDropResult, type LootOverrides, type ToolKey } from '../core/loot';
import { Modifiers } from '../core/modifiers';
import type { PickupPlayer } from '../core/pickup';
import type { PropState } from '../core/props';
import type { Rng } from '../core/rng';
import { acceptsPlayerInput, Run, type RunCommand } from '../core/run';
import { Shop, type BuyContext } from '../core/shop';
import { SlowMo } from '../core/slowMo';
import { Wallet } from '../core/wallet';
import { pickSpawnPoint } from '../core/spawnPoint';
import { farthestPoint, isBossRound, requireSpawnPoints } from '../core/waves';
import { BOSS_DEFEAT_HITSTOP_MS, HITSTOP_MS } from '../data/fx';
import { DEFENSE, FINISHER_MOVE, MOVES, STRUCTURE } from '../data/moves';
import { LEVEL_1 } from '../data/level1';
import { PROP_DEFS, TOOL_DEFS } from '../data/props';
import { FULL_SHOP_CATALOG, type ModifierId } from '../data/shop';
import { CAST_FX, CE, TECHNIQUES, type TechId } from '../data/techniques';
import {
  ARMED,
  BOSS,
  DIFFICULTY,
  DROPPED_TOOLS,
  ECONOMY,
  ENEMY,
  ENEMY_AI,
  ATTACK_GATE,
  ENEMY_ATTACK,
  PICKUP,
  PLAYER_COMBO,
  RUN,
  SHOP,
  WAVE,
} from '../data/tuning';
import { buildBackground } from '../game/art/background';
import { SLOWMO_TINT_COLOR } from '../game/art/combatColors';
import { createArt } from '../game/art';
import { tileFrameFor } from '../game/art/tiles';
import { routeContact, tagBody } from '../game/bodyTags';
import { Boss } from '../game/Boss';
import { Projectile } from '../game/Projectile';
import { bindDebugToggle, isDebug, onDebugChange } from '../game/debug';
import { registerDebugProbe, type DebugProbe, type GameSnapshot } from '../game/debugApi';
import { Enemy } from '../game/Enemy';
import { EnergyHud } from '../game/EnergyHud';
import { Fx, type SparkKind } from '../game/fx';
import { FxLab } from '../game/FxLab';
import { GAME_NAME, Hud } from '../game/Hud';
import type { InputSnapshot } from '../game/input';
import { PlayerInput, ShopInput } from '../game/input';
import { FloatTexts } from '../game/FloatTexts';
import { MAX_FRAME_MS } from '../game/physics';
import { Pickups } from '../game/Pickups';
import { Player, type Attacker, type DefenseKind } from '../game/Player';
import { Prop } from '../game/Prop';
import { ShopPanel } from '../game/ShopPanel';
import { TechCaster } from '../game/TechCaster';
import { TechRunner, type TechTarget } from '../game/TechRunner';
import { Aura } from '../game/techFx/Aura';
import { Callout } from '../game/techFx/Callout';
import { KokusenFx } from '../game/techFx/KokusenFx';
import { TEX } from '../game/textures';

type ContactEvent = { pairs: { bodyA: MatterJS.BodyType; bodyB: MatterJS.BodyType }[] };

/** Ferramenta amaldiçoada largada (chave em `TOOL_DEFS`, comum ou rara), nunca um objeto do mapa. */
const isDroppedTool = (key: string): boolean => key.startsWith('cursed');

const SPAWN_LIFT = 2;
/** Zoom da câmera do mundo (RES-01): 960x540 de tela mostram 640x360 px de mundo. */
const WORLD_ZOOM = 1.5;
/** Folga (px de tela) em que o player anda sem a câmera andar junto. */
const FOLLOW_DEADZONE = { w: 40, h: 24 };
/** Finalizador (FIN-04): zoom da câmera no golpe, tempo até chegar (ms; 80 para fechar em 100 ms reais com o frame de atraso do efeito) e depois de quanto tempo real volta ao normal. */
const FINISHER_ZOOM = 1.7;
const FINISHER_ZOOM_IN_MS = 80;
/** Hitstop do finalizador (FIN-02, ms). */
const FINISHER_HITSTOP_MS = 150;
const FINISHER_ZOOM_HOLD_MS = 450;
const FINISHER_ZOOM_OUT_MS = 250;
/** Alpha do tom azulado da câmera lenta (DOD-12). */
const SLOWMO_TINT_ALPHA = 0.22;
/** Quanto tempo (ms) o painel de controles fica na tela ao iniciar e a cada reinício (HUD-03). */
const CONTROLS_MS = 8000;

/** Parâmetro de URL que só vale em `?debug` (SHOP-23, SHOP-47); fora do debug, sempre `null`. */
function debugParam(name: string): string | null {
  return isDebug() ? new URLSearchParams(window.location.search).get(name) : null;
}

/** Duração (ms) do banner do upgrade grátis do chefe: o fim da faixa "Chefe derrotado!", sem atrasar "Rodada N concluída" (BFX-10). */
const BOSS_UPGRADE_BANNER_MS = 800;
/** Margem (px) além da borda da câmera em que um ponto ainda conta como visível (SPN-07). */
const SPAWN_VIEW_MARGIN = 32;
/** Chance de o spawn preferir os pontos às costas do player (SPN-08). */
const SPAWN_PREFER_BACK_CHANCE = 0.35;

/** Parâmetro de URL inteiro `>= min` só em `?debug` (`maxAlive`, `mastery`); ausente ou inválido vira `undefined`. */
function debugIntParam(name: string, min: number): number | undefined {
  const raw = debugParam(name);
  if (raw === null || raw.trim() === '') return undefined;
  const n = Number(raw);
  return Number.isInteger(n) && n >= min ? n : undefined;
}

/** Input neutro (RUN-08): fora de `roundActive`/`intermission` o player ignora tudo, mas o input continua sendo
 * lido (para não vazar um `JustDown` represado quando a run volta a aceitar). */
const NEUTRAL_INPUT: InputSnapshot = {
  left: false,
  right: false,
  down: false,
  jumpPressed: false,
  jumpHeld: false,
  jumpWPressed: false,
  upHeld: false,
  lightPressed: false,
  heavyPressed: false,
  heavyHeld: false,
  bothPressed: false,
  guardHeld: false,
  guardPressed: false,
  dodgePressed: false,
  interactPressed: false,
};

export class TestScene extends Phaser.Scene implements DebugProbe {
  private level!: LevelData;
  private terrain: MatterJS.BodyType[] = [];
  private controls!: PlayerInput;
  /** Teclas da loja (SHOP-45, SHOP-28..30, SHOP-16, SHOP-03), lidas só com `run.state === 'shop'`. */
  private shopInput!: ShopInput;
  private player!: Player;
  private enemies: Enemy[] = [];
  /** Limitador de atacantes (LIM-01..07): 2 vagas, fila FIFO e 350 ms entre windups; zerado a cada `startRun` (EDG-03). */
  private attackGate = new AttackGate(ATTACK_GATE);
  /** Só existe numa rodada de chefe (BOSS-01); `null` fora dela ou depois de removido. */
  private boss: Boss | null = null;
  /** Chefe derrotado espera o fim do hitstop da vitória para sumir (não é destruído dentro do próprio golpe). */
  private bossDefeatedPending = false;
  /** Na rodada de chefe, "Rodada N concluída" entra depois da faixa "Chefe derrotado!" (BHUD-03 + RHUD-03). */
  private clearedBanner: { round: number; afterMs: number; upgradeText: string | null } | null = null;
  /** Projéteis da rajada e ondas de choque do pouso do chefe (BAT-03/04/06/12). */
  private projectiles: Projectile[] = [];
  private props: Prop[] = [];
  /** Tudo que a câmera de UI desenha mora aqui; o resto da cena é mundo. */
  private uiLayer!: Phaser.GameObjects.Layer;
  private fx!: Fx;
  private hud!: Hud;
  /** Barra de energia e slots de técnica (TEC-07..12), na `uiLayer`. */
  private energyHud!: EnergyHud;
  private run!: Run;
  /** Carteira de fragmentos da run (ECO-12..14) e os sorteios de drop, criados a cada `startRun` com o `lootRng`. */
  private wallet!: Wallet;
  /** Níveis de modificador da run (MOD-01..09): lidos na hora por Player/Pickups/Loot; zerados a cada `startRun`. */
  private modifiers!: Modifiers;
  /** Energia amaldiçoada do player (CE-01..09), zerada a cada `startRun`. */
  private energy!: CursedEnergy;
  /** Slots de técnica (TEC-01..06), vazios a cada `startRun` (ou `?debug&tech=`, TEC-02). */
  private loadout!: Loadout;
  /** Pontos de maestria por slot (MST-01..06): zerados a cada `startRun` e ao equipar técnica nova no slot. */
  private mastery = new Mastery();
  /** Conjuração de técnicas (CAST-*), dona da `CastMachine` e dos ganchos do `Player`. */
  private techCaster!: TechCaster;
  /** Executa a técnica na soltura (T22+: Punho Divergente/Kokusen), dona da hitbox e das camadas próprias dela. */
  private techRunner!: TechRunner;
  /** T28 (`?debug&fxlab`): laboratório de efeitos, `null` fora dele. */
  private fxLab: FxLab | null = null;
  /**
   * Camadas de efeito de técnica (design "Dois relógios"): `game` para (hoje) `cast.aura`, `real` para as
   * cinemáticas do Kokusen (T24), que a Fase 6 confere continuarem andando durante o hitstop (TFX-05).
   */
  private realtimeFx!: FxTimeline;
  /** Objetos de efeito de técnica vivos (TFX-03/09); `fx.live` do snapshot é `fxRegistry.size`. */
  private fxRegistry!: FxRegistry;
  private aura!: Aura;
  private callout!: Callout;
  /** Cinema do Kokusen (T24): negativo/duotom/raios/faíscas/zoom/cartão, tudo em tempo real (TFX-05). */
  private kokusenFx!: KokusenFx;
  /** Último estado de conjuração visto (CAST-15/19): dispara o zoom da câmera só na troca de estado. */
  private lastCastState: CastState | null = null;
  /** Loja aberta (SHOP-01), recriada a cada `shopOpen`; `null` fora da loja. */
  private shop: Shop | null = null;
  /** 1ª técnica equipada nesta compra (TSH-06), para o ícone voar da carta ao slot (T21); `null` fora disso. */
  private pendingTechEquip: { id: TechId; slot: 0 | 1 } | null = null;
  /** Painel da loja na câmera de UI (T10), criado uma vez e mostrado/escondido a cada abertura/fechamento. */
  private shopPanel!: ShopPanel;
  private loot!: Loot;
  private lootRng!: Rng;
  private pickups!: Pickups;
  private floatTexts!: FloatTexts;
  /** Tempo de vida e teto das ferramentas largadas (ARM-13/14/18/28); vive a cena toda. */
  private droppedTools!: DroppedTools;
  /** Detecta a transição para morto (RUN-04): só o primeiro frame morto conta como evento. */
  private wasPlayerDead = false;
  /** Relógio de jogo da cena (ms), só para o intervalo entre usos do mesmo ponto de spawn (SPN-08). */
  private clockMs = 0;
  /** Instante (`clockMs`) do último spawn comum em cada índice de ponto `E` (SPN-08). */
  private spawnLastUsed = new Map<number, number>();
  private readonly hitstop = new Hitstop();
  /** Câmera lenta da esquiva perfeita (DOD-07), em tempo real; a escala vai para o tempo de jogo (`applyTimeScale`). */
  private slowMo = new SlowMo();
  /** Contador de combo e nota de estilo (CMB-01..03). */
  private comboCounter = new ComboCounter();
  private lastPlayerHp = 0;
  /** Tom azulado sobre a tela enquanto a câmera lenta está ativa (DOD-12), na câmera de UI. */
  private slowTint!: Phaser.GameObjects.Rectangle;
  /** Tempo real (ms) até o zoom do finalizador voltar ao normal; 0 = sem finalizador em curso. */
  private finisherZoomMs = 0;
  /** Se a pausa do hitstop está aplicada (física, animações, tweens e timers). */
  private frozen = false;
  /** Eventos lidos pelo smoke no snapshot de debug, ex.: `enemyDied:7`. */
  private debugEvents: string[] = [];
  private debugDeaths: { id: number; x: number; y: number }[] = [];

  constructor() {
    super('TestScene');
  }

  create(): void {
    // Antes de criar qualquer objeto, para a câmera de UI ignorar tudo que for mundo.
    this.addUiCamera();
    createArt(this);
    // Reinício no meio de um hitstop (R): a cena nova começa descongelada. As animações são do jogo, não da cena.
    this.hitstop.reset();
    this.unfreeze();
    this.slowMo = new SlowMo();
    this.comboCounter = new ComboCounter();
    this.finisherZoomMs = 0;
    this.events.on(Phaser.Scenes.Events.PRE_UPDATE, this.tickHitstop, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.PRE_UPDATE, this.tickHitstop, this);
      this.hitstop.reset();
      this.unfreeze();
      // Câmera lenta em andamento não vaza para a cena nova.
      this.time.timeScale = 1;
      this.tweens.timeScale = 1;
    });
    this.debugEvents = [];
    this.debugDeaths = [];
    registerDebugProbe(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => registerDebugProbe(null));
    this.fx = new Fx(this);
    this.level = parseLevel(LEVEL_1);
    requireSpawnPoints(this.level, 'LEVEL_1');
    buildBackground(this, this.level.widthPx, this.level.heightPx);
    this.terrain = [];
    this.enemies = [];
    this.attackGate = new AttackGate(ATTACK_GATE);
    this.projectiles = [];
    this.buildTerrain();
    this.listenForContacts();
    // `?debug&round=N` (design): só em debug, a run já começa na rodada N (smoke da luta de chefe sem esperar 4 rodadas).
    // `?debug&maxAlive=N` (inteiro >= 1) fixa o teto de vivos no lugar de `maxAliveFor` (SPN-02).
    this.run = new Run(RUN, WAVE, { firstRound: this.firstRoundForDebug(), maxAliveOverride: debugIntParam('maxAlive', 1) });
    this.clockMs = 0;
    this.spawnLastUsed = new Map();
    this.wasPlayerDead = false;
    // MOD-01: uma instância por cena, zerada a cada `startRun` (MOD-10); Player/Prop/Pickups/Loot leem dela na hora.
    this.modifiers = new Modifiers(FULL_SHOP_CATALOG);
    // F5: uma instância por cena, zeradas a cada `startRun` (CE-01, TEC-01).
    this.energy = new CursedEnergy();
    this.loadout = new Loadout();
    this.mastery = new Mastery();

    this.props = [];
    for (const s of this.level.props) {
      const def = PROP_DEFS[s.key];
      if (!def) throw new Error(`Objeto sem definição: ${s.key}`);
      this.props.push(new Prop(this, s.x, s.y, def, this.modifiers, (hit, at) => this.onConnect(hit, at, 'prop')));
    }

    this.controls = new PlayerInput(this);
    this.shopInput = new ShopInput(this);
    const p = this.level.player;
    const strike = (hit: Hit, at: Vec2): void => this.onConnect(hit, at, hit.strength);
    this.player = new Player(this, p.x, p.y - SPAWN_LIFT, this.terrain, () => this.props, this.fx, this.modifiers, strike);
    this.player.onEvent = (ev) => {
      this.debugEvents.push(ev);
      if (ev.startsWith('move:')) this.onPlayerMoveStart(ev.slice(5));
    };
    this.player.attackerOf = (ownerId) => this.attackerOf(ownerId);
    this.player.onDefense = (kind, point) => this.onDefense(kind, point);
    this.lastPlayerHp = this.player.hp;
    // Sem spawn inicial de inimigos (RUN-01): a run começa em `title`, e os inimigos entram pelo comando `spawn`.
    this.techCaster = new TechCaster(this, this.player, this.energy, this.loadout);
    this.realtimeFx = new FxTimeline();
    this.fxRegistry = new FxRegistry();
    this.aura = new Aura(this, this.realtimeFx, this.fxRegistry);
    // T24: cartão/raios/faíscas/zoom do Kokusen, na `uiLayer` (o cartão é HUD) + câmera/mundo (raios, faíscas).
    this.kokusenFx = new KokusenFx(this, this.realtimeFx, this.fxRegistry, this.uiLayer);
    // T22+: dono da hitbox do Punho Divergente/Kokusen e das camadas de fx próprias delas (eco, anel, estouro...).
    this.techRunner = new TechRunner(
      this,
      this.player,
      this.loadout,
      this.energy,
      this.realtimeFx,
      this.fxRegistry,
      this.uiLayer,
      this.terrain,
      (hit, point) => this.onTechConnect(hit, point),
      (ms) => {
        this.hitstop.trigger(ms);
        this.freeze();
      },
      (target, point, facing, streak) => this.kokusenFx.trigger(target, point, facing, streak),
      // MST-01/02: acerto de técnica em alvo real vira ponto de maestria.
      (slot, castId, targetId, isBoss) => this.onMasteryHit(slot, castId, targetId, isBoss),
    );

    // T28: laboratório de efeitos (`?debug&fxlab`) - bonecos de treino + teclas 1-6/0, sem ondas (FXL-01).
    if (debugParam('fxlab') !== null) {
      this.fxLab = new FxLab(this, this.player, this.loadout, this.energy, this.techCaster);
      this.fxLab.spawnDummies({ x: p.x, y: p.y - SPAWN_LIFT });
      const lab = this.fxLab;
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => lab.destroyNow());
    }

    // Economia (ECO-12..14): carteira e pickups vivem a cena toda; `loot`/`lootRng` são recriados a cada startRun.
    this.wallet = new Wallet();
    this.pickups = new Pickups(this, PICKUP);
    this.floatTexts = new FloatTexts(this);
    this.droppedTools = new DroppedTools(DROPPED_TOOLS);

    this.cameras.main
      .setZoom(WORLD_ZOOM)
      .setRoundPixels(true)
      .setBounds(0, 0, this.level.widthPx, this.level.heightPx)
      .startFollow(this.player.sprite, true, 0.15, 0.15)
      .setDeadzone(FOLLOW_DEADZONE.w, FOLLOW_DEADZONE.h);

    // J também é ataque (PlayerInput): o listener aqui é independente e só começa/recomeça a run (RUN-02/05).
    this.onKey('J', () => this.run.startPressed());
    this.onKey('ENTER', () => this.run.startPressed());

    // Ferramentas de ajuste (golpes de teste e debug do Matter): só valem no modo debug.
    bindDebugToggle(this);
    // Na loja, 1/2/3 compram (SHOP-45) e nunca disparam as teclas de debug.
    const debugKeys = (): boolean => isDebug() && this.run.state !== 'shop';
    // T28: no fxlab as teclas 1-4 (e as novas 5/6/0) são só do laboratório - nunca golpe leve/forte, matar ou
    // machucar o player (essas continuam fora do fxlab, como sempre foram).
    this.onKey('ONE', () => (this.fxLab ? debugKeys() && this.fxLab.pressKey(1) : debugKeys() && this.debugHit('light')));
    this.onKey('TWO', () => (this.fxLab ? debugKeys() && this.fxLab.pressKey(2) : debugKeys() && this.debugHit('heavy')));
    this.onKey('THREE', () => (this.fxLab ? debugKeys() && this.fxLab.pressKey(3) : debugKeys() && this.player.debugKill()));
    // Tecla 4 (só debug): 50 de dano no player, para o smoke medir a cura da vitória abaixo do teto (BWIN-01).
    this.onKey('FOUR', () => (this.fxLab ? debugKeys() && this.fxLab.pressKey(4) : debugKeys() && this.player.debugHurt(50)));
    this.onKey('FIVE', () => debugKeys() && this.fxLab?.pressKey(5));
    this.onKey('SIX', () => debugKeys() && this.fxLab?.pressKey(6));
    // FXL-03: tecla 0 alterna a câmera lenta; refaz o texto do painel para o rótulo de velocidade (FXL-08).
    this.onKey('ZERO', () => {
      if (!debugKeys() || !this.fxLab) return;
      this.fxLab.toggleTimeScale();
      this.refreshControlsText();
    });
    this.onKey('H', () => isDebug() && this.toggleDebugDraw());
    // Fora da loja, R reinicia a cena; dentro dela é reroll (SHOP-16), lido por `ShopInput` no `update`.
    this.onKey('R', () => {
      if (this.run.state !== 'shop') this.scene.restart();
    });
    this.addHud();
    this.shopPanel = new ShopPanel(this, this.uiLayer);
  }

  update(_time: number, delta: number): void {
    // A barra acompanha o golpe na hora, mesmo durante o hitstop que ele disparou.
    this.hud.setPlayerHp(this.player.hp, this.player.maxHp);
    this.hud.setPlayerStructure(this.player.structureView);
    this.hud.setCombo(this.comboCounter.hits, this.comboCounter.grade);
    // FXL-03: a câmera lenta multiplica o `dt` de jogo/efeitos junto com `time`/`tweens`/física do Matter
    // (aplicados em `fxLab.toggleTimeScale`) - um só fator, tudo anda devagar junto.
    const realDt = Math.min(delta, MAX_FRAME_MS);
    // Câmera lenta da esquiva perfeita (DOD-07): conta em tempo real e, enquanto dura, o tempo de jogo (física,
    // tweens, timers e a lógica pelo `dt` abaixo) anda a 30%. O relógio real dos efeitos (`base`) não desacelera.
    this.slowMo.update(realDt);
    this.applyTimeScale();
    const base = realDt * (this.fxLab?.timeScale ?? 1);
    const clamped = base * this.slowMo.timeScale;
    this.slowTint.setVisible(this.slowMo.active);
    if (this.finisherZoomMs > 0) {
      this.finisherZoomMs -= realDt;
      if (this.finisherZoomMs <= 0) this.cameras.main.zoomTo(WORLD_ZOOM, FINISHER_ZOOM_OUT_MS, 'Linear', true);
    }
    // Dois relógios (design): a parte `real` das camadas de efeito (as cinemáticas do Kokusen, T24) anda mesmo
    // congelada; a parte `game` (hoje só `cast.aura`) para no hitstop (TFX-05) — por isso este `update` roda
    // ANTES do retorno adiante, mas com `gameDt` zerado enquanto `frozen`.
    this.realtimeFx.update(this.frozen ? 0 : clamped, base);
    // DOD-12: a camada `dodge.slowTint` fica viva enquanto a câmera lenta dura (re-adicionada a cada frame).
    if (this.slowMo.active) this.realtimeFx.add('dodge.slowTint', 1, 'real');
    // TFX-03/09: a destruição agendada dos objetos de efeito é em tempo real, independe do hitstop.
    this.fxRegistry.update(base);
    // T24 (TFX-05): negativo/duotom/raios/faíscas/cartão do Kokusen andam com o relógio real, mesmo congelados.
    this.kokusenFx.update(base, this.frozen);
    // Congelado pelo hitstop: player, inimigos e objetos param (os timers de combo, IA e vida também).
    if (this.frozen) return;
    const dt = clamped;
    this.clockMs += dt;
    // SHOP-33: na loja, nada de gameplay anda; só o input da loja, `run.update`, o painel e o HUD.
    if (this.run.state === 'shop') {
      this.updateShop();
    } else {
      // Lê sempre (para não represar um `JustDown`), mas fora de roundActive/intermission o player recebe neutro (RUN-08).
      const raw = this.controls.read();
      const input = acceptsPlayerInput(this.run.state) ? raw : NEUTRAL_INPUT;
      this.player.update(dt, input);
      // FIN-01/03: `J`+`K` juntos perto de um inimigo quebrado é o finalizador; sem alvo, nada acontece.
      if (input.bothPressed && !this.player.dead) this.tryFinisher();
      this.comboCounter.update(dt);
      // CMB-02: o jogador levar dano zera o combo (a vida caiu neste frame, seja golpe cheio ou o que passa pela guarda).
      if (this.player.hp < this.lastPlayerHp) this.comboCounter.playerDamaged();
      this.lastPlayerHp = this.player.hp;
      // DOD-11: enquanto a esquiva está ativa a camada `dodge.trail` fica viva (o rastro em si sai do Player).
      if (this.player.dodgeView.active) this.realtimeFx.add('dodge.trail', 100);
      // AIR-05: enquanto a voadora está ativa a camada `air.kickTrail` fica viva (o rastro em si sai do Player).
      if (this.player.moveName === 'voadora' && this.player.movePhase === 'active') this.realtimeFx.add('air.kickTrail', 100);
      this.techCaster.update(dt);
      // FXL-02/KOK-03: a tecla 3 arma o Kokusen sem timing manual - injeta a "tecla apertada de novo" no exato
      // frame em que a janela abre (o `windowOpen` já reflete o começo deste frame, antes do `techRunner.update`).
      if (this.fxLab?.consumeKokusenAutoPress(this.techRunner.kokusenSnapshot.windowOpen)) this.techCaster.forcePress(0);
      this.debugEvents.push(...this.techCaster.events);
      // T28: no laboratório, o Vermelho/Azul/Desmantelar também miram os bonecos de treino, não só os inimigos.
      const techTargets: readonly TechTarget[] = this.fxLab ? [...this.enemies, ...this.fxLab.dummies] : this.enemies;
      // T22+: executa a técnica a partir do estado de conjuração, dos eventos deste frame e do slot apertado (Kokusen).
      this.techRunner.update(dt, this.techCaster.cast, this.techCaster.events, this.techCaster.slotPressed, techTargets, this.boss);
      this.debugEvents.push(...this.techRunner.events);
      // TEC-10: a barra pisca quando uma conjuração é recusada por falta de energia.
      if (this.techCaster.events.includes('techDenied:energy')) this.energyHud.flashDenied();
      // TSH-10/11: níveis de `energia`/`fluxo` lidos na hora, sem cache (mesmo padrão de `modifiers.runSpeed`).
      this.energy.setLevels(this.modifiers.level('energia'), this.modifiers.level('fluxo'));
      this.loadout.tick(dt);
      // CE-04/05: sem regen enquanto há uma conjuração em andamento.
      this.energy.update(dt, this.techCaster.cast !== null);
      // FXL-07/09: no laboratório a energia fica sempre no teto e a recarga do slot 0 sempre zerada - nenhuma
      // técnica de teste gasta ou deixa recarga pendente, mesmo enquanto uma conjuração está no meio do caminho.
      if (this.fxLab) {
        this.energy.gain(this.energy.max);
        this.loadout.clearCooldown(0);
        this.loadout.clearCooldown(1);
      }
      this.fxLab?.update(dt);
      // CAST-14: aura por técnica em sign/charge, sobre o corpo do player; tecla 1 do fxlab mostra só a aura.
      this.aura.update(dt, this.techCaster.cast ?? this.fxLab?.auraDemoCast() ?? null, this.player.sprite.x, this.player.sprite.y);
      // KOK-27: aura preta com faíscas vermelhas no player enquanto a zona do Kokusen está ativa.
      this.kokusenFx.zoneAura(dt, this.techRunner.kokusenSnapshot.zone, this.player.sprite.x, this.player.sprite.y);
      // CAST-16: a chamada aparece exatamente no frame em que a soltura começa (`techCast:<id>`).
      for (const ev of this.techCaster.events) {
        if (ev.startsWith('techCast:')) this.callout.show(ev.slice('techCast:'.length) as TechId);
      }
      this.callout.update(dt);
      this.updateCastZoom();
      this.updatePickups(dt);
      // Morte do player (RUN-04): só a transição para morto conta, uma vez.
      if (this.player.dead && !this.wasPlayerDead) this.run.playerDied();
      this.wasPlayerDead = this.player.dead;
      this.updateEnemies(dt);
      this.boss?.update(dt, this.player.sprite.x);
      if (this.bossDefeatedPending) {
        this.boss?.destroyNow();
        this.boss = null;
        this.bossDefeatedPending = false;
      }
      if (this.boss) this.hud.setBossHp(this.boss.hp, this.boss.maxHp);
      if (this.clearedBanner) {
        this.clearedBanner.afterMs -= dt;
        // BFX-10: o banner do upgrade grátis ocupa o fim da faixa "Chefe derrotado!", antes de "Rodada N concluída".
        if (this.clearedBanner.upgradeText && this.clearedBanner.afterMs <= BOSS_UPGRADE_BANNER_MS) {
          this.hud.banner(this.clearedBanner.upgradeText, BOSS_UPGRADE_BANNER_MS);
          this.clearedBanner.upgradeText = null;
        }
        if (this.clearedBanner.afterMs <= 0) {
          if (this.run.state === 'intermission') this.hud.banner(`Rodada ${this.clearedBanner.round} concluída`, Infinity);
          this.clearedBanner = null;
        }
      }
      for (const proj of this.projectiles) proj.update(dt);
      this.projectiles = this.projectiles.filter((proj) => !proj.removed);
      for (const prop of this.props) prop.update(dt);
      this.updateDroppedTools(dt);
      this.props = this.props.filter((prop) => !prop.isGone);
    }
    for (const cmd of this.run.update(dt, this.seedForNewRun)) this.applyRunCommand(cmd);
    // Rodada e restantes (RHUD-01) acompanham o `run` a cada frame; fora de rodada (title) fica escondido.
    // T28: no fxlab a onda nunca nasce de verdade (FXL-01), mas o spawner interno da `Run` segue contando como se
    // tivesse nascido - sem isso "Inimigos: N" mentiria na tela do laboratório.
    this.hud.setRun(this.run.round > 0 && !this.fxLab ? { round: this.run.round, remaining: this.run.alive + this.run.queued } : null);
    this.hud.setHeldItem(this.heldItemInfo());
    this.hud.update(dt);
    this.energyHud.update(dt, this.energy, this.loadout, this.mastery);
  }

  /**
   * Zoom da câmera principal na conjuração (CAST-15/19): dispara só na troca de estado, nunca a cada frame — a
   * carga anima até 1,6 ao longo do `chargeMs` da técnica, e a soltura (ou um cancelamento em `sign`/`charge`,
   * CAST-07) devolve o zoom base em 250 ms.
   */
  private updateCastZoom(): void {
    const state = this.techCaster.cast?.state ?? null;
    if (state === this.lastCastState) return;
    const cam = this.cameras.main;
    if (state === 'charge' && this.techCaster.cast) {
      cam.zoomTo(CAST_FX.zoomCharge, Math.max(1, TECHNIQUES[this.techCaster.cast.id].chargeMs), 'Linear', true);
    } else if (state === 'release') {
      cam.zoomTo(CAST_FX.zoomBase, CAST_FX.zoomBackMs, 'Linear', true);
    } else if (state === null && (this.lastCastState === 'sign' || this.lastCastState === 'charge')) {
      cam.zoomTo(CAST_FX.zoomBase, CAST_FX.zoomBackMs, 'Linear', true);
    }
    this.lastCastState = state;
  }

  /**
   * Loja aberta (SHOP-45, SHOP-28..30, SHOP-16/26, SHOP-03): traduz `ShopInput` em ações do `Shop` e eventos de
   * debug. `run.closeShop()` só arma o pedido; o `run.update` logo depois, no chamador, resolve a troca de rodada.
   */
  private updateShop(): void {
    const shop = this.shop;
    if (!shop) return;
    const input = this.shopInput.read();
    const ctx: BuyContext = {
      wallet: this.wallet,
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      applyModifier: (id) => {
        const applied = this.modifiers.apply(id);
        // MOD-04/MOD-11: `vida` sobe o teto real do player e cura os mesmos 15.
        if (applied && id === 'vida') {
          this.player.setMaxHp(this.modifiers.maxHp);
          this.player.heal(SHOP.vidaPerLevel);
        }
        return applied;
      },
      // SHOP-12/MOD-11: cura (consumível) e o +15 de HP da compra de `vida` passam pelo mesmo `heal` com teto.
      healPlayer: (amount) => this.player.heal(amount),
      // TSH-06/07: equipa no primeiro slot vazio (não equipada) ou sobe 1 nível (já equipada); TSH-14: exatamente
      // um `techUnlock:<id>` quando os dois slots estavam vazios antes desta compra.
      applyTechnique: (id) => {
        const bothEmptyBefore = !this.loadout.hasAny();
        if (this.loadout.levelOf(id) > 0) {
          this.loadout.upgrade(id);
        } else {
          const slot = this.loadout.firstEmpty();
          if (slot !== null && this.loadout.equip(slot, id, 1)) {
            this.pendingTechEquip = { id, slot };
            this.mastery.resetSlot(slot); // PRG-04 / reequipar: técnica nova no slot começa sem pontos
          }
        }
        if (bothEmptyBefore) this.debugEvents.push(`techUnlock:${id}`);
      },
    };
    if (input.buySlot !== null) this.resolveBuy(shop, input.buySlot, ctx);
    else if (input.buySelected) this.resolveBuy(shop, shop.selected, ctx);
    if (input.moveRight) shop.move(1);
    if (input.moveLeft) shop.move(-1);
    if (input.reroll) this.resolveReroll(shop);
    if (input.confirm) this.closeShop();
    // T10: o painel acompanha a `view` a cada frame (compra/reroll/movimento mudam custo, seleção, sold...).
    this.shopPanel.update(shop.view(this.wallet, this.player.hp, this.player.maxHp));
    // T11: o contador de fragmentos do HUD pulsa sozinho quando o valor muda (compra, reroll, varredura ao abrir).
    this.hud.setFragments(this.wallet.fragments);
  }

  /** Traduz o `BuyResult` tipado do `Shop` num evento de debug (design "Error Handling Strategy"). */
  private resolveBuy(shop: Shop, slot: number, ctx: BuyContext): void {
    const offerId = shop.view(ctx.wallet, ctx.hp, ctx.maxHp).offers[slot]?.id ?? null;
    this.pendingTechEquip = null;
    const result = shop.buy(slot, ctx);
    // `shop.buy` pode ter escrito em `pendingTechEquip` de dentro de `ctx.applyTechnique` (outro método): o TS não
    // enxerga essa escrita através da chamada e estreitaria a leitura para o `null` de cima sem este cast.
    const equipped = this.pendingTechEquip as { id: TechId; slot: 0 | 1 } | null;
    if (result.ok) {
      this.debugEvents.push(`buy:${result.id}:${result.cost}`);
      // T11: carta pisca branco e o custo pago sobe em "−N".
      this.shopPanel.flashBuy(slot, result.cost);
      // Direção de feel (T21): 1ª técnica equipada faz o ícone voar da carta ao slot do HUD em 300 ms.
      if (equipped) {
        const kanji = TECHNIQUES[equipped.id].kanji;
        this.shopPanel.flyToSlot(slot, kanji, this.energyHud.slotIconPosition(equipped.slot));
      }
    } else if (result.reason === 'funds' && offerId) this.debugEvents.push(`buyRefused:${offerId}:funds`);
    else if (result.reason === 'fullHp') this.debugEvents.push('buyRefused:cura:fullHp');
  }

  /** Reroll (SHOP-16/25/26): paga pelo custo atual antes de sortear, para o "−N" da animação (T11). */
  private resolveReroll(shop: Shop): void {
    const cost = shop.rerollCost;
    if (shop.reroll(this.wallet)) this.shopPanel.flipReroll(cost);
    else this.debugEvents.push('rerollRefused');
  }

  /**
   * Abre a loja (SHOP-01): varre os fragmentos vivos para a carteira e pausa o Matter (SHOP-05/33/36/37).
   * `FULL_SHOP_CATALOG` (F5) inclui as técnicas e `energia`/`fluxo`; o `loadout` decide elegibilidade e a
   * garantia do espaço 0 (TSH-05).
   */
  private openShop(round: number): void {
    this.wallet.add(this.pickups.collectFragments());
    this.matter.world.pause();
    this.shop = new Shop(FULL_SHOP_CATALOG, this.modifiers, this.run.shopRng!, round, this.loadout);
    this.shopPanel.show(this.shop.view(this.wallet, this.player.hp, this.player.maxHp));
    this.debugEvents.push(`shopOpen:${round}`);
  }

  /** Fecha a loja (SHOP-03/35): arma o pedido na `Run`, retoma o Matter e limpa a loja. */
  private closeShop(): void {
    this.run.closeShop();
    this.matter.world.resume();
    this.shop = null;
    this.shopPanel.hide();
    this.debugEvents.push('shopClose');
  }

  /**
   * Campo `shop` do snapshot (SHOP-22): `open` só no estado `shop`; nível vem dos modificadores ou do `loadout`
   * (técnica, F5) conforme o `kind` da entrada.
   */
  private shopSnapshot(): GameSnapshot['shop'] {
    const view = this.shop?.view(this.wallet, this.player.hp, this.player.maxHp);
    return {
      open: this.run.state === 'shop',
      offers: (view?.offers ?? [])
        .filter((o) => o.id !== null)
        .map((o) => {
          const entry = FULL_SHOP_CATALOG.find((e) => e.id === o.id)!;
          const level =
            entry.kind === 'modifier'
              ? this.modifiers.level(entry.id as ModifierId)
              : entry.kind === 'technique'
                ? this.loadout.levelOf(entry.id as TechId)
                : 0;
          return { id: o.id!, level, maxLevel: entry.maxLevel, cost: o.cost!, sold: o.sold, affordable: o.affordable };
        }),
      rerollCost: view?.rerollCost ?? 0,
      selected: view?.selected ?? 0,
      panel: this.shop ? this.shopPanel.debug() : null,
    };
  }

  /** Seed da run: fixa por `?seed=N` só em `?debug` (design); senão o relógio (runs variadas). */
  private seedForNewRun = (): number => {
    if (isDebug()) {
      const raw = new URLSearchParams(window.location.search).get('seed');
      if (raw !== null) {
        const n = Number(raw);
        if (Number.isFinite(n)) return n;
      }
    }
    return Date.now();
  };

  /** Rodada inicial da run: `?round=N` só em `?debug` (design); sem a opção, a run começa na rodada 1. */
  private firstRoundForDebug(): number | undefined {
    if (!isDebug()) return undefined;
    const raw = new URLSearchParams(window.location.search).get('round');
    if (raw === null) return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  }

  private applyRunCommand(cmd: RunCommand): void {
    switch (cmd.type) {
      case 'startRun':
        this.onStartRun();
        break;
      case 'spawn':
        // FXL-01: nenhuma onda nasce no laboratório de efeitos - só os bonecos de treino (FXL-05).
        if (this.fxLab) break;
        if (cmd.kind === 'boss') this.spawnBoss(cmd.round);
        // SPN-07..09: comum nasce fora da câmera (worldView real, facing do player); o chefe segue no mais distante.
        else this.spawnFromCommand(this.pickEnemySpawnPoint(), cmd.round);
        break;
      case 'roundStart':
        // Volta da tela de título ou de game over: some com o texto central da rodada anterior.
        this.hud.setCenter(null);
        this.hud.banner(`Rodada ${cmd.round}`, RUN.bannerMs);
        break;
      case 'roundCleared':
        // Fica até o próximo `roundStart` (RHUD-03). Na rodada de chefe, ela entra depois de "Chefe derrotado!",
        // que o `onBossDefeated` já mostrou (BHUD-03).
        if (!isBossRound(cmd.round)) this.hud.banner(`Rodada ${cmd.round} concluída`, Infinity);
        break;
      case 'shopOpen':
        // SHOP-47: `?debug&noshop=1` pula a loja sem varrer nada (cenários da F1/F3 que atravessam rodadas).
        if (debugParam('noshop') === '1') this.run.closeShop();
        else this.openShop(cmd.round);
        break;
      case 'gameOver':
        this.hud.setCenter([
          `Rodada alcançada: ${cmd.round}`,
          `Abates: ${cmd.kills}`,
          `Fragmentos: ${this.wallet.fragments}`,
          'J / Enter para tentar de novo',
        ]);
        break;
    }
  }

  /**
   * Nova run (RUN-01/05): remove os inimigos restantes na hora e devolve o player ao spawn com a vida cheia.
   * Também remove o chefe e os projéteis dele, se algum estiver vivo (edge case: game over em plena luta de
   * chefe, com o chefe e/ou projéteis dele ainda em cena).
   */
  private onStartRun(): void {
    for (const e of this.enemies) e.destroyNow();
    this.enemies = [];
    this.boss?.destroyNow();
    this.boss = null;
    this.bossDefeatedPending = false;
    this.clearedBanner = null;
    this.spawnLastUsed.clear();
    this.attackGate.reset();
    // Higiene: uma loja não deveria sobreviver a um game over (gameOver só sai de roundActive/intermission), mas
    // uma run nova nunca deve carregar a loja da anterior.
    if (this.shop) this.matter.world.resume();
    this.shop = null;
    this.shopPanel.hide();
    this.hud.hideBossBar();
    for (const proj of this.projectiles) proj.destroyNow();
    this.projectiles = [];
    this.player.resetForRun();
    // Edge case: nova run zera o combo e a câmera lenta (estruturas zeram no reset do player e dos inimigos).
    this.comboCounter.reset();
    this.slowMo.reset();
    this.lastPlayerHp = this.player.hp;
    // ECO-14/27: carteira zerada e nenhum pickup/texto flutuante sobrevive à run anterior.
    this.wallet.reset();
    // SHOP-23: `?debug&fragments=N` (inteiro >= 0) começa a run com N fragmentos; inválido é ignorado.
    const startFragments = Number(debugParam('fragments'));
    if (debugParam('fragments') !== null && Number.isInteger(startFragments)) this.wallet.add(startFragments);
    this.pickups.clear();
    this.floatTexts.clear();
    // ARM-18: nenhuma ferramenta largada sobrevive à run anterior (a cadeira/garrafa do mapa não são drops).
    for (const prop of this.props) if (isDroppedTool(prop.def.key)) prop.destroyNow();
    this.props = this.props.filter((prop) => !prop.isGone);
    this.droppedTools.clear();
    // MOD-01/MOD-10: upgrades da run anterior não sobrevivem (AD-004).
    this.modifiers.reset();
    // CE-01/TEC-01: energia e slots voltam ao início da run; `?debug&tech=` equipa por cima (TEC-02).
    this.energy.reset();
    this.loadout.reset();
    this.mastery.reset();
    this.equipDebugTech();
    this.applyDebugMastery();
    // ECO-17: o stream de loot nasce com a seed desta run, já criado pelo `Run.update` que despachou este comando.
    this.lootRng = this.run.lootRng!;
    this.loot = new Loot(this.lootRng, ECONOMY, this.lootOverrides(), this.modifiers);
  }

  /**
   * `?debug&tech=<id>[,<id>]` (TEC-02): equipa em nível 1, na ordem, ignorando ids desconhecidos e o segundo id
   * quando os dois slots já couberam; sem o parâmetro, os dois slots ficam vazios (TEC-01, AD-005).
   */
  private equipDebugTech(): void {
    const raw = debugParam('tech');
    if (raw === null) return;
    const ids = raw.split(',').filter((id): id is TechId => id in TECHNIQUES);
    let slot = 0;
    for (const id of ids) {
      if (slot > 1) break;
      if (this.loadout.equip(slot as 0 | 1, id, 1)) slot++;
    }
  }

  /** `?debug&mastery=N` (inteiro >= 0): cada técnica equipada começa a run com N pontos de maestria; inválido é ignorado. */
  private applyDebugMastery(): void {
    const n = debugIntParam('mastery', 0);
    if (n === undefined) return;
    for (const slot of [0, 1] as const) if (this.loadout.slotsView[slot]) this.mastery.setPoints(slot, n);
  }

  /** Nome da técnica como a loja mostra, para os banners de nível (MST-07, BFX-10). */
  private techName(id: TechId): string {
    return FULL_SHOP_CATALOG.find((e) => e.id === id)?.name ?? TECHNIQUES[id].name;
  }

  /**
   * Acerto de técnica em alvo real (MST-01..07): soma maestria ao slot e, no limiar, sobe 1 nível com o banner
   * `"{nome} Nv {n}!"`. No laboratório de efeitos (bonecos de treino) não há maestria.
   */
  private onMasteryHit(slot: MasterySlot, castId: number, targetId: number, isBoss: boolean): void {
    if (this.fxLab) return;
    const equipped = this.loadout.slotsView[slot];
    if (!equipped) return;
    const { levelUp } = this.mastery.registerHit(slot, equipped.level, castId, targetId, isBoss);
    if (levelUp && this.loadout.upgrade(equipped.id)) {
      this.hud.banner(`${this.techName(equipped.id)} Nv ${this.loadout.levelOf(equipped.id)}!`, RUN.bannerMs);
    }
  }

  /**
   * Upgrade grátis da vitória sobre o chefe (BFX-09): sobe 1 nível a técnica equipada de menor nível abaixo do 3
   * (empate: slot 0). Devolve o texto do banner (BFX-10), ou `null` se nada era upável.
   */
  private bossRewardUpgrade(): string | null {
    let pick: { id: TechId; level: number } | null = null;
    for (const s of this.loadout.slotsView) {
      if (s && s.level < 3 && (pick === null || s.level < pick.level)) pick = s;
    }
    if (!pick || !this.loadout.upgrade(pick.id)) return null;
    return `${this.techName(pick.id)} Nv ${this.loadout.levelOf(pick.id)}!`;
  }

  /** Overrides de debug dos sorteios (HEAL-06, ARM-15, RAR-05): `heal=N`, `armed=knife|club` e `rare=1`. */
  private lootOverrides(): LootOverrides {
    if (!isDebug()) return {};
    const params = new URLSearchParams(window.location.search);
    const overrides: LootOverrides = {};
    const heal = params.get('heal');
    if (heal !== null) {
      const n = Number(heal);
      if (Number.isFinite(n)) overrides.healChance = n;
    }
    const armed = params.get('armed');
    if (armed === 'knife') overrides.armed = 'cursedKnife';
    else if (armed === 'club') overrides.armed = 'cursedClub';
    const rare = params.get('rare');
    if (rare !== null) overrides.rare = rare === '1' || rare === 'true';
    return overrides;
  }

  /** Move e coleta os pickups vivos (ECO-06..11, HEAL-03/04) e avança os textos flutuantes da coleta. */
  private updatePickups(dtMs: number): void {
    const pr = this.player.hurtRect();
    const player: PickupPlayer = {
      x: pr.x - pr.width / 2,
      y: pr.y - pr.height / 2,
      w: pr.width,
      h: pr.height,
      alive: !this.player.dead,
      canHeal: this.player.hp < this.player.maxHp,
    };
    const { collected, expired } = this.pickups.update(dtMs, {
      solids: this.level.solids,
      player,
      magnetRange: this.modifiers.magnetRange,
    });
    for (const p of collected) this.onPickupCollected(p);
    for (let i = 0; i < expired.length; i++) this.debugEvents.push('pickupExpired');
    this.floatTexts.update(dtMs);
    // ECO-16: o contador do HUD acompanha a carteira no mesmo frame da coleta.
    this.hud.setFragments(this.wallet.fragments);
  }

  /** Fragmento credita a carteira; gota cura (teto em maxHp, HEAL-03) - cada uma com o "+N" e o evento (ECO-29/HEAL-08). */
  private onPickupCollected(p: { kind: 'fragment' | 'heal'; value: number; x: number; y: number }): void {
    if (p.kind === 'fragment') {
      this.wallet.add(p.value);
      this.debugEvents.push(`collect:fragment:${p.value}`);
      this.floatTexts.spawn(`+${p.value}`, 'U', p.x, p.y);
      return;
    }
    const restored = this.player.heal(p.value);
    this.debugEvents.push(`collect:heal:${restored}`);
    this.floatTexts.spawn(`+${restored}`, 'G', p.x, p.y);
    this.player.flash('G', 80);
  }

  /** Nome e pips do objeto na mão (ITEM-01/02), `null` de mãos vazias (ITEM-03). */
  private heldItemInfo(): { name: string; pips: number; maxPips: number } | null {
    const prop = this.player.heldProp;
    if (!prop) return null;
    return { name: propName(prop.def), pips: prop.def.durability - prop.machine.impacts, maxPips: prop.def.durability };
  }

  /** Sorteia e materializa o drop de um abate (ECO-01/05, ECO-15/28, HEAL-01/02) no ponto da morte. */
  private applyDrop(result: EnemyDropResult, x: number, y: number): void {
    const cap = capDrop(result.fragments, this.pickups.liveFragments, ECONOMY.maxLiveFragments);
    if (cap.spawn > 0) this.pickups.spawnDrop(this.lootRng, x, y, 'fragment', cap.spawn, result.value, cap.extraOnLast);
    if (result.heal) this.pickups.spawnDrop(this.lootRng, x, y, 'heal', 1, ECONOMY.healAmount, 0);
  }

  /**
   * Ferramenta largada por um inimigo armado (ARM-08): nasce em `rest`, pronta para pegar (design.md). Se o teto
   * de 6 já estiver cheio, a mais antiga em `rest` some antes (ARM-14).
   */
  private dropTool(tool: ToolKey, rare: boolean, x: number, y: number): void {
    const def = rare ? rareDef(TOOL_DEFS[tool]) : TOOL_DEFS[tool];
    const prop = new Prop(this, x, y, def, this.modifiers, (hit, at) => this.onConnect(hit, at, 'prop'), rare);
    const evictId = this.droppedTools.admit(prop.id, this.toolStates());
    if (evictId !== null) {
      this.props.find((p) => p.id === evictId)?.destroyNow();
      this.droppedTools.forget(evictId);
    }
    this.props.push(prop);
  }

  /** Estado atual de cada ferramenta largada registrada (para `DroppedTools.admit`/`update`). */
  private toolStates(): Map<number, PropState> {
    const states = new Map<number, PropState>();
    for (const p of this.props) if (isDroppedTool(p.def.key)) states.set(p.id, p.machine.state);
    return states;
  }

  /** Sumiço por tempo (ARM-13) e limpeza do registro para ferramentas que já sumiram por outro motivo (quebra, teto). */
  private updateDroppedTools(dtMs: number): void {
    const expired = this.droppedTools.update(dtMs, this.toolStates());
    for (const id of expired) {
      const p = this.props.find((pr) => pr.id === id);
      if (!p) continue;
      this.fx.curseSmoke(p.sprite.x, p.sprite.y);
      p.destroyNow();
    }
    for (const p of this.props) if (isDroppedTool(p.def.key) && p.isGone) this.droppedTools.forget(p.id);
  }

  /**
   * Inimigos comuns + limitador de atacantes (LIM-01..07, EDG-03). Por inimigo, a cena entrega `granted`,
   * `windupAllowed` e `holdRank`; depois do `update` lê o que a IA emitiu: `windupStart` → `noteWindup`,
   * `wantAttack` → `request`, e libera a vaga (ou a fila) no mesmo frame em que o estado sai de
   * {approach, windup, attack} ou o inimigo morre/some.
   */
  private updateEnemies(dt: number): void {
    const gate = this.attackGate;
    gate.update(dt);
    const px = this.player.sprite.x;
    const sideOf = (x: number): 1 | -1 => (x - px >= 0 ? 1 : -1);
    for (const e of [...this.enemies]) {
      // Posição na fila de espera entre os que esperam do mesmo lado do player (LIM-05, LIM-07).
      const side = sideOf(e.x);
      const sameSide = gate
        .queueOrder()
        .filter((id) => {
          const other = this.enemies.find((o) => o.id === id);
          return other !== undefined && other.aiState === 'hold' && sideOf(other.x) === side;
        });
      const at = sameSide.indexOf(e.id);
      e.update(dt, px, {
        granted: gate.isGranted(e.id),
        windupAllowed: gate.windupAllowed(),
        holdRank: at >= 0 ? at : sameSide.length,
      });
      if (e.windupStarted) gate.noteWindup(e.id);
      const s = e.aiState;
      if (e.removed || e.isDead()) gate.release(e.id);
      else if (e.wantsAttack) gate.request(e.id);
      else if (s !== 'approach' && s !== 'windup' && s !== 'attack') gate.release(e.id);
    }
  }

  /** Ponto `E` do próximo inimigo comum (SPN-07..09) e registro do uso para o intervalo entre usos (SPN-08). */
  private pickEnemySpawnPoint(): number {
    const view = this.cameras.main.worldView;
    const point = pickSpawnPoint({
      points: this.level.enemies,
      viewLeft: view.left,
      viewRight: view.right,
      margin: SPAWN_VIEW_MARGIN,
      playerX: this.player.sprite.x,
      playerFacing: this.player.facing,
      lastUsedAt: this.spawnLastUsed,
      nowMs: this.clockMs,
      gapMs: WAVE.pointGapMs,
      rng: this.run.spawnRng!,
      preferBackChance: SPAWN_PREFER_BACK_CHANCE,
    });
    this.spawnLastUsed.set(point, this.clockMs);
    return point;
  }

  /** Onda da rodada (WAVE-02): tuning escalado pela rodada (DIF-04) e graça ao nascer (WAVE-09). */
  private spawnFromCommand(point: number, round: number): void {
    const at = this.level.enemies[point];
    const spawnAt: Vec2 = { x: at.x, y: at.y - SPAWN_LIFT };
    const scaled = scaleFor(round, { brain: ENEMY, ai: ENEMY_AI, attack: ENEMY_ATTACK }, DIFFICULTY);
    // ARM-01..03: sorteado depois da escala da rodada (armFor multiplica o dano já escalado).
    const armedRoll = this.loot.rollArmed(round);
    const tuning = armedRoll ? armFor(armedRoll.tool, scaled, ARMED) : scaled;
    // EVR-04/05: o sorteio sempre consome o stream próprio (a sequência não muda com o override); `?debug&enemyVariant=`
    // com um id válido manda no resultado, um inválido cai no sorteio normal.
    const drawn = this.run.variantRng ? pickEnemyVariant(this.run.variantRng) : 'corcunda';
    const variant = parseVariant(debugParam('enemyVariant')) ?? drawn;
    const enemy = new Enemy(
      this,
      spawnAt,
      tuning,
      RUN.spawnGraceMs,
      (dead) => {
        this.enemies = this.enemies.filter((e) => e !== dead);
        this.attackGate.release(dead.id);
      },
      // A garra que acerta o player também é um golpe que conecta.
      (hit, hitPoint) => this.onConnect(hit, hitPoint, hit.strength),
      // Drop do inimigo comum (design.md): sai daqui, não do onEnemyDied (que o chefe também chama).
      (dead, x, y) => {
        this.onEnemyDied(dead.id, x, y);
        this.applyDrop(this.loot.enemyDrop(this.run.round, dead.weapon !== null), x, y);
        if (dead.weapon) this.dropTool(dead.weapon, dead.weaponRare, x, y);
      },
      armedRoll,
      variant,
    );
    enemy.onEvent = (ev) => this.debugEvents.push(ev);
    enemy.guardRng = this.run.guardRng;
    enemy.onBlock = (at) => {
      this.fx.spark(at.x, at.y, 'guard');
      this.realtimeFx.add('guard.spark', 100);
    };
    this.enemies.push(enemy);
    this.debugEvents.push(`spawnFx:${enemy.id}`);
    this.fx.curseSmoke(spawnAt.x, spawnAt.y);
  }

  /**
   * Onda de chefe (BOSS-01/03): nasce no ponto `E` mais distante do player no momento do spawn, com o `BossSpec`
   * escalado pela rodada/tier (T2). Se um chefe anterior ainda estivesse por aqui (não deveria, mas por hygiene),
   * ele é removido antes - só existe um por vez.
   */
  private spawnBoss(round: number): void {
    this.boss?.destroyNow();
    const point = farthestPoint(this.level.enemies, this.player.sprite.x);
    const at = this.level.enemies[point];
    const spawnAt: Vec2 = { x: at.x, y: at.y - SPAWN_LIFT };
    const spec = bossSpecFor(round);
    this.boss = new Boss(
      this,
      spawnAt,
      spec,
      this.terrain,
      // O golpe que conecta (do player ou do teste de debug) também é um golpe que conecta (faísca + hitstop).
      (hit, hitPoint) => this.onConnect(hit, hitPoint, hit.strength),
      // Rugido (BAI-13): empurra o player para longe do chefe.
      (dir) => this.player.pushHorizontal(dir, BOSS.roarImpulse),
      // Pouso do salto (BAT-03): duas ondas de choque, uma para cada lado, rente ao chão.
      (x, y, damage) => {
        this.spawnProjectile('shockwave', x, y, 1, BOSS.shockwave.speed, BOSS.shockwave.maxDist, damage);
        this.spawnProjectile('shockwave', x, y, -1, BOSS.shockwave.speed, BOSS.shockwave.maxDist, damage);
      },
      // Disparo da rajada (BAT-04, BTIER-05/07): um projétil por evento `fire`, já com o `speed` do arquétipo.
      (x, y, dir, speed, damage) => this.spawnProjectile('projectile', x, y, dir, speed, BOSS.volley.maxDist, damage),
      (dead, x, y) => this.onBossDefeated(dead, x, y),
    );
    // Entrada (BHUD-01/05): barra cheia com o nome e a faixa do chefe durante a intro.
    this.hud.showBossBar(spec.name);
    this.hud.banner(`Chefe: ${spec.name}`, BOSS.introMs);
  }

  /**
   * Vitória (BWIN-01..03, BHUD-03): conta o abate, cura 30% do maxHp, hitstop de 250 ms (o `trigger` fica com o
   * maior, então o golpe fatal de 90 ms não encurta), tremida e fumaça na posição do chefe. O chefe some no fim
   * do hitstop, fora do próprio `receiveHit` que o matou.
   */
  private onBossDefeated(dead: Boss, x: number, y: number): void {
    this.onEnemyDied(dead.id, x, y);
    this.applyDrop(this.loot.bossDrop(this.run.round), x, y);
    this.player.heal(Math.round(BOSS.healFraction * this.player.maxHp));
    this.hitstop.trigger(BOSS_DEFEAT_HITSTOP_MS);
    this.freeze();
    this.fx.shake();
    this.fx.curseSmoke(x, y);
    this.debugEvents.push('bossDefeatedFx');
    this.hud.hideBossBar();
    // BHUD-03: a faixa entra na hora da morte; "Rodada N concluída" vem depois dela (RHUD-03).
    this.hud.banner('Chefe derrotado!', BOSS.defeatBannerMs);
    this.clearedBanner = { round: this.run.round, afterMs: BOSS.defeatBannerMs, upgradeText: this.bossRewardUpgrade() };
    this.bossDefeatedPending = true;
  }

  /** Cria um projétil ou onda de choque do chefe e o adiciona à lista da cena (BAT-03/04/06/12). */
  private spawnProjectile(
    kind: 'projectile' | 'shockwave',
    x: number,
    y: number,
    dir: 1 | -1,
    speed: number,
    maxDist: number,
    damage: number,
  ): void {
    this.projectiles.push(
      new Projectile(this, kind, x, y, dir, speed, maxDist, damage, (hit, hitPoint) => this.onConnect(hit, hitPoint, hit.strength)),
    );
  }

  /** Um abate (FND-08, WAVE-06): conta na onda da rodada, além de ir para o snapshot de debug. */
  onEnemyDied(enemyId: number, x: number, y: number): void {
    this.debugEvents.push(`enemyDied:${enemyId}`);
    this.debugDeaths.push({ id: enemyId, x, y });
    this.run.enemyDied(enemyId);
  }

  debugSnapshot(): GameSnapshot {
    return {
      player: {
        x: this.player.sprite.x,
        y: this.player.sprite.y,
        hp: this.player.hp,
        dead: this.player.dead,
        facing: this.player.facing,
        flash: this.player.activeFlash,
        maxHp: this.player.maxHp,
        vy: this.player.verticalSpeed,
        move: this.player.moveName,
        frame: this.player.frameName,
        guard: this.player.guardState,
        structure: this.player.structureView,
        dodge: this.player.dodgeView,
      },
      enemies: this.enemies.map((e) => ({
        id: e.id,
        x: e.x,
        y: e.hurtRect().y,
        hp: e.hp,
        state: e.state,
        maxHp: e.maxHp,
        damage: e.damage,
        chaseSpeed: e.chaseSpeed,
        weapon: e.weapon,
        weaponVisible: e.weaponVisible,
        structure: e.structureView,
        guarding: e.guarding,
        variant: e.variant,
        frame: e.frame,
        spriteVisible: e.spriteVisible,
        ragdollVisible: e.ragdollVisible,
        ragdollTextures: e.ragdollTextures,
      })),
      events: [...this.debugEvents],
      deaths: this.debugDeaths.map((d) => ({ ...d })),
      boss: this.boss
        ? {
            hp: this.boss.hp,
            maxHp: this.boss.maxHp,
            phase: this.boss.phase,
            state: this.boss.state,
            attack: this.boss.attackName,
            poise: this.boss.poise,
            archetype: this.boss.archetype,
            name: this.boss.name,
            x: this.boss.x,
            y: this.boss.y,
          }
        : null,
      projectiles: this.projectiles.map((p) => ({
        id: p.id,
        x: p.x,
        y: p.y,
        dir: p.dir,
        speed: p.speed,
        kind: p.kind,
        height: p.height,
        traveled: p.traveled,
      })),
      run: { state: this.run.state, round: this.run.round, kills: this.run.kills, alive: this.run.alive, queued: this.run.queued },
      hud: {
        ...this.hud.debugState(),
        ...this.energyHud.debugState(),
        callout: this.callout.debug(),
        kokusenCard: this.kokusenFx.cardDebug(),
      },
      combo: { hits: this.comboCounter.hits, grade: this.comboCounter.grade },
      timeScale: this.slowMo.timeScale,
      hitstop: { frozen: this.hitstop.frozen, remainingMs: this.hitstop.remaining },
      level: { playerSpawn: { x: this.level.player.x, y: this.level.player.y - SPAWN_LIFT } },
      wallet: { fragments: this.wallet.fragments },
      shop: this.shopSnapshot(),
      modifiers: this.modifiers.levels,
      pickups: this.pickups.debug(),
      floatTexts: this.floatTexts.debug(),
      worldProps: this.props.map((p) => ({
        id: p.id,
        key: p.def.key,
        state: p.machine.state,
        x: p.sprite.x,
        y: p.sprite.y,
        durabilityLeft: p.def.durability - p.machine.impacts,
        rare: p.rare,
        vx: p.vx,
      })),
      ce: { cur: this.energy.cur, max: this.energy.max, regen: this.energy.regen },
      tech: this.techSnapshot(),
      kokusen: this.techRunner.kokusenSnapshot, // TFX-07, KOK-01/02/10/11/30/31
      techObjects: this.techRunner.techObjectsSnapshot, // RED-14, BLU-10
      fx: { live: this.fxRegistry.size, degraded: this.kokusenFx.degraded, layers: this.realtimeFx.layers() },
      // Desvio da Fase 6 (CAST-15/KOK-24): zoom da câmera principal, sem contrato prévio no snapshot.
      camera: { zoom: this.cameras.main.zoom },
      // T23 (FIN-01/03): distância viva ao inimigo quebrado mais perto, a mesma que o finalizador usa; sem contrato prévio.
      finisher: { distPx: this.nearestFinishable()?.dist ?? null },
      // T28: laboratório de efeitos, sem contrato prévio no snapshot; `null` fora do fxlab.
      fxlab: this.fxLab?.debug() ?? null,
    };
  }

  /** `tech` do snapshot (TEC-08): slots do loadout e a conjuração ativa (CAST-*). */
  private techSnapshot(): GameSnapshot['tech'] {
    const [s0, s1] = this.loadout.slotsView;
    const slotView = (slot: 0 | 1, s: { id: TechId; level: 1 | 2 | 3 } | null) =>
      s ? { id: s.id, level: s.level, cooldownMs: this.loadout.cooldownOf(slot) } : null;
    return { slots: [slotView(0, s0), slotView(1, s1)], cast: this.techCaster.cast };
  }

  /**
   * Golpe que conectou: faísca no ponto de contato (FX-03), tremida só no forte e hitstop (FX-01/02). Golpe de
   * objeto é forte (hitstop de 90 ms) e tem a faísca roxa.
   */
  private onConnect(hit: Hit, point: Vec2, kind: SparkKind): void {
    this.fx.spark(point.x, point.y, kind);
    if (hit.strength === 'heavy') this.fx.shake();
    this.hitstop.trigger(HITSTOP_MS[hit.strength]);
    this.freeze();
    // CE-06/CE-08: só o golpe corpo a corpo do próprio player (soco do combo ou objeto na mão, `ownerId` é o
    // dele) aplicado a um alvo ganha energia; golpes que o player recebe têm outro dono, e dano de técnica (T22+)
    // não passa por este caminho.
    if (hit.ownerId === this.player.id) {
      this.energy.gain(CE.meleeGain);
      if (hit.moveName) this.player.hitLanded();
      // CMB-01: todo golpe do jogador que acerta conta; objeto na mão entra como um golpe "objeto" para a nota.
      this.comboCounter.hit(hit.moveName ?? 'objeto');
    }
  }

  /**
   * O jogador começou um golpe (`move:<nome>`): se é leve, os inimigos comuns perto e de frente sorteiam a guarda
   * (EBL-01). `?debug&enemyGuard=N` fixa a chance (N=1: sempre levantam).
   */
  private onPlayerMoveStart(name: string): void {
    if (MOVES[name]?.strength !== 'light') return;
    const raw = debugParam('enemyGuard');
    const override = raw !== null && Number.isFinite(Number(raw)) ? Number(raw) : undefined;
    const me = { x: this.player.sprite.x, facing: this.player.facing };
    for (const e of this.enemies) e.onPlayerLightMove(me, this.run.round, override);
  }

  /** Quem bateu no jogador, para o lado do golpe, o tipo (chefe) e o efeito do parry (PAR-03/07/10). */
  private attackerOf(ownerId: number): Attacker | null {
    const enemy = this.enemies.find((e) => e.id === ownerId);
    if (enemy) return { x: enemy.x, isBoss: false, parried: () => enemy.parried() };
    const boss = this.boss;
    if (boss && boss.id === ownerId) return { x: boss.x, isBoss: true, parried: () => boss.parried() };
    // Projéteis e ondas de choque só existem pelo chefe.
    const proj = this.projectiles.find((p) => p.id === ownerId);
    if (proj) return { x: proj.x, isBoss: true, parried: () => undefined };
    return null;
  }

  /**
   * Defesa do jogador (GRD-08, PAR-08, PAR-11): faíscas azuis no bloqueio; no parry flash em estrela, anel dourado
   * e hitstop de 80 ms. As camadas `game` seguem vivas durante o hitstop, como a estrela do golpe.
   */
  private onDefense(kind: DefenseKind, point: Vec2): void {
    if (kind === 'block') {
      this.fx.spark(point.x, point.y, 'guard');
      this.realtimeFx.add('guard.spark', 100);
    } else if (kind === 'parry') {
      this.fx.spark(point.x, point.y, 'parry');
      this.fx.parryRing(point.x, point.y);
      this.realtimeFx.add('parry.flash', 100);
      this.realtimeFx.add('parry.ring', 200);
      this.hitstop.trigger(DEFENSE.parryHitstopMs);
      this.freeze();
    } else {
      // Esquiva perfeita (DOD-07): câmera lenta com tom azulado e o "tique" branco no jogador.
      this.slowMo.trigger();
      this.player.flash('w', 60);
    }
  }

  /** Aplica a escala da câmera lenta (e do laboratório de efeitos) ao tempo de jogo: timers, tweens e física. */
  private applyTimeScale(): void {
    const scale = this.slowMo.timeScale * (this.fxLab?.timeScale ?? 1);
    if (this.time.timeScale !== scale) this.time.timeScale = scale;
    if (this.tweens.timeScale !== scale) this.tweens.timeScale = scale;
    const timing = this.matter.world.engine.timing;
    if (timing.timeScale !== scale) timing.timeScale = scale;
  }

  /** Inimigo comum quebrado (e ainda não finalizado) mais perto do jogador, com a distância entre os centros do corpo. */
  private nearestFinishable(): { enemy: Enemy; dist: number } | null {
    const pr = this.player.hurtRect();
    let best: { enemy: Enemy; dist: number } | null = null;
    for (const e of this.enemies) {
      if (!e.finishable) continue;
      const r = e.hurtRect();
      const dist = Math.hypot(r.x - pr.x, r.y - pr.y);
      if (!best || dist < best.dist) best = { enemy: e, dist };
    }
    return best;
  }

  /**
   * Finalizador (FIN-01..04): com `J`+`K` a até 40 px de um inimigo comum quebrado (e ainda não finalizado nesta
   * quebra) o golpe causa 40 de dano, congela 150 ms e a câmera dá zoom 1,7 em 100 ms; sem alvo, nada (FIN-03).
   */
  private tryFinisher(): void {
    if (this.tryBossFinisher()) return;
    const near = this.nearestFinishable();
    const target = near && near.dist <= STRUCTURE.finisherRangePx ? near.enemy : null;
    if (!target) return;
    const pr = this.player.hurtRect();
    const at = target.hurtRect();
    const dir: 1 | -1 = at.x >= pr.x ? 1 : -1;
    const hit: Hit = {
      ownerId: this.player.id,
      damage: STRUCTURE.finisherDamage,
      strength: 'heavy',
      force: 12,
      direction: { x: dir, y: -0.6 },
      moveName: FINISHER_MOVE,
    };
    this.player.finisherPose(dir);
    if (!target.receiveHit(hit)) return;
    target.markFinished();
    this.debugEvents.push(`finisher:${target.id}`);
    // Faísca, tremida, energia e combo do golpe comum; depois o congelamento maior do finalizador (o maior vence).
    this.onConnect(hit, { x: at.x, y: at.y }, 'heavy');
    this.hitstop.trigger(FINISHER_HITSTOP_MS);
    this.freeze();
    this.cameras.main.zoomTo(FINISHER_ZOOM, FINISHER_ZOOM_IN_MS, 'Linear', true);
    this.finisherZoomMs = FINISHER_ZOOM_HOLD_MS;
  }

  /**
   * Finalizador do chefe (BFX-06..08): com ele vivo, em `stagger`, com o finalizador pronto e a até
   * `BOSS.finisher.rangePx` do player (distância horizontal entre os centros), tira 12% do HP máximo, com o mesmo
   * hitstop e zoom do finalizador comum. Devolve se foi aplicado; fora disso o fluxo do inimigo comum segue.
   */
  private tryBossFinisher(): boolean {
    const boss = this.boss;
    if (!boss || boss.state !== 'stagger' || !boss.finisherReady) return false;
    if (Math.abs(boss.x - this.player.sprite.x) > BOSS.finisher.rangePx) return false;
    const dir: 1 | -1 = boss.x >= this.player.sprite.x ? 1 : -1;
    this.player.finisherPose(dir);
    boss.receiveFinisher();
    this.debugEvents.push('finisher:boss');
    const at = boss.hurtRect();
    this.fx.spark(at.x, at.y, 'heavy');
    this.fx.shake();
    this.hitstop.trigger(FINISHER_HITSTOP_MS);
    this.freeze();
    this.cameras.main.zoomTo(FINISHER_ZOOM, FINISHER_ZOOM_IN_MS, 'Linear', true);
    this.finisherZoomMs = FINISHER_ZOOM_HOLD_MS;
    return true;
  }

  /**
   * Golpe de técnica que conectou (T22+): mesma faísca + tremida + hitstop de FX-01..03, mas sem o +3 de CE-06
   * (CE-08 - dano de técnica não passa pelo `onConnect` normal, de propósito).
   */
  private onTechConnect(hit: Hit, point: Vec2): void {
    this.fx.spark(point.x, point.y, hit.strength);
    if (hit.strength === 'heavy') this.fx.shake();
    this.hitstop.trigger(HITSTOP_MS[hit.strength]);
    this.freeze();
  }

  /**
   * Conta o hitstop no PRE_UPDATE, antes do step do Matter (que roda no UPDATE): ao acabar, a física já anda
   * neste mesmo frame. O frame em que o golpe conectou não conta, porque o golpe veio no meio dele.
   */
  private tickHitstop(_time: number, delta: number): void {
    if (!this.frozen) return;
    this.hitstop.update(Math.min(delta, MAX_FRAME_MS));
    if (!this.hitstop.frozen) this.unfreeze();
  }

  private freeze(): void {
    if (this.frozen) return;
    this.frozen = true;
    this.matter.world.pause();
    this.anims.pauseAll();
    this.tweens.pauseAll();
    this.time.paused = true;
  }

  /** Retoma tudo. Seguro de chamar sem congelamento (no create e no SHUTDOWN). */
  private unfreeze(): void {
    this.frozen = false;
    this.matter.world?.resume();
    this.anims.resumeAll();
    this.tweens.resumeAll();
    this.time.paused = false;
  }

  /** Aplica em todos os inimigos e no chefe (se houver) o mesmo golpe que o combo do player daria. */
  private debugHit(strength: Strength): void {
    const step = PLAYER_COMBO.find((s) => s.strength === strength)!;
    const hitToward = (targetX: number): Hit => ({
      ownerId: 0,
      damage: step.damage,
      strength,
      force: step.force,
      direction: { x: targetX >= this.player.sprite.x ? 1 : -1, y: -0.6 },
    });
    for (const e of this.enemies) e.receiveHit(hitToward(e.x));
    // Golpe aceito pelo chefe vai para o snapshot: na intro e no rugido ele recusa (BOSS-08, BAI-12).
    if (this.boss?.receiveHit(hitToward(this.boss.x))) this.debugEvents.push('bossHitAccepted');
  }

  /**
   * Duas câmeras (AD-003): a principal desenha o mundo com zoom e a de UI (zoom 1, sem scroll) só a `uiLayer`.
   * Todo objeto que entra na cena depois (inimigo que renasce, partículas, hitbox, debug da física) é ignorado
   * pela câmera de UI, a menos que entre na `uiLayer`.
   */
  private addUiCamera(): void {
    this.uiLayer = this.add.layer();
    this.cameras.main.ignore(this.uiLayer);
    const ui = this.cameras.add(0, 0, this.scale.width, this.scale.height, false, 'ui');
    const route = (obj: Phaser.GameObjects.GameObject): void => {
      // Um objeto nasce na lista da cena e só depois é movido para a camada: aí ele volta a ser da UI.
      if (obj.displayList === this.uiLayer) obj.cameraFilter &= ~ui.id;
      else ui.ignore(obj);
    };
    this.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, route);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(Phaser.Scenes.Events.ADDED_TO_SCENE, route));
  }

  /** FXL-04/08: legenda e rótulo de velocidade do laboratório, só linhas extras quando `fxLab` existe. */
  private controlsLines(): string[] {
    return [
      'A/D ou ←/→: mover   Espaço/W: pular (segure = mais alto)',
      'J leve · K forte · U guarda/parry · Q esquiva · E pegar',
      'E: pegar / arremessar   S+E: largar   J/X leve   K/Z forte',
      'R: reiniciar   Tab: mostrar/esconder controles',
      ...(isDebug() ? ['F1: sair do debug   H: debug da física   1/2: golpe leve/forte de teste'] : []),
      ...(this.fxLab ? [FxLab.LEGEND, this.fxLab.speedLabel] : []),
    ];
  }

  /** Reaplica `controlsLines()` no painel (FXL-08: o rótulo de velocidade muda ao apertar 0). */
  private refreshControlsText(): void {
    this.hud.setControlsText(this.controlsLines().join('\n'));
  }

  private addHud(): void {
    this.hud = new Hud(this, this.uiLayer, this.controlsLines().join('\n'));
    this.energyHud = new EnergyHud(this, this.uiLayer);
    this.callout = new Callout(this, this.uiLayer);
    // DOD-12: tom azulado por cima do mundo na câmera lenta, na `uiLayer` (a câmera de UI é a que o desenha).
    this.slowTint = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, SLOWMO_TINT_COLOR, SLOWMO_TINT_ALPHA)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(90)
      .setVisible(false);
    this.uiLayer.add(this.slowTint);
    this.hud.setPlayerHp(this.player.hp, this.player.maxHp);
    // FXL-04: no laboratório a legenda fica sempre visível, não só os primeiros `CONTROLS_MS`.
    this.hud.showControls(this.fxLab ? Number.MAX_SAFE_INTEGER : CONTROLS_MS);
    // Boot em `title` (RUN-01/RHUD-05): tela com o nome do jogo até o primeiro J/Enter.
    this.hud.setCenter([GAME_NAME, 'J / Enter para começar']);
    // Tab alterna o painel; a captura impede o navegador de tirar o foco do jogo (HUD-03).
    this.input.keyboard!.addCapture('TAB');
    this.onKey('TAB', () => this.hud.toggleControls());
    const off = onDebugChange((on) => {
      this.refreshControlsText();
      // Saindo do debug, o desenho da física não pode continuar ligado.
      if (!on && this.matter.world.drawDebug) this.toggleDebugDraw();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
  }

  private toggleDebugDraw(): void {
    const world = this.matter.world;
    if (!world.debugGraphic) {
      // createDebugGraphic já liga o desenho; sem isso o primeiro H desligava na hora e parecia não funcionar.
      world.createDebugGraphic();
      world.drawDebug = false;
    }
    world.drawDebug = !world.drawDebug;
    world.debugGraphic.clear();
  }

  private onKey(key: string, fn: () => void): void {
    const kb = this.input.keyboard!;
    const event = `keydown-${key}`;
    kb.on(event, fn);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => kb.off(event, fn));
  }

  /** Desenho tile a tile pela variante (ENV-01); a física continua nos retângulos mesclados do parseLevel. */
  private buildTerrain(): void {
    LEVEL_1.forEach((row, ty) => {
      for (let tx = 0; tx < row.length; tx++) {
        const variant = tileVariant(LEVEL_1, tx, ty);
        if (!variant) continue;
        this.add.image(tx * TILE + TILE / 2, ty * TILE + TILE / 2, TEX.terrain, tileFrameFor(variant, tx, ty));
      }
    });
    for (const r of this.level.solids) {
      const cx = r.x + r.width / 2;
      const cy = r.y + r.height / 2;
      const body = this.matter.add.rectangle(cx, cy, r.width, r.height, {
        isStatic: true,
        label: 'terrain',
        collisionFilter: { ...Filters.terrain },
      });
      tagBody(body, { kind: 'terrain' });
      this.terrain.push(body);
    }
  }

  private listenForContacts(): void {
    const onStart = (event: ContactEvent): void => {
      for (const pair of event.pairs) routeContact(pair.bodyA, pair.bodyB);
    };
    this.matter.world.on('collisionstart', onStart);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.matter.world?.off('collisionstart', onStart));
  }
}
