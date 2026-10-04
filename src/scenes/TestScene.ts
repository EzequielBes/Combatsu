import Phaser from 'phaser';
import { clampCenter } from '../core/cameraFollow';
import { DroppedTools } from '../core/droppedTools';
import { ComboCounter } from '../core/comboCounter';
import { CursedEnergy } from '../core/energy';
import { FxRegistry } from '../core/fxRegistry';
import { FxTimeline } from '../core/fxTimeline';
import { type Hit, type Vec2 } from '../core/hit';
import { AttackGate } from '../core/attackGate';
import { parseLevel, type LevelData } from '../core/level';
import { Loadout } from '../core/loadout';
import { MoveReading } from '../core/moveReading';
import { Mastery } from '../core/mastery';
import { Loot } from '../core/loot';
import { Modifiers } from '../core/modifiers';
import { type Rng } from '../core/rng';
import { acceptsPlayerInput, Run } from '../core/run';
import { SlowMo } from '../core/slowMo';
import { CameraKick, ZoomPulse } from '../core/cameraKick';
import { Wallet } from '../core/wallet';
import { requireSpawnPoints } from '../core/waves';
import { LEVEL_1 } from '../data/level1';
import { PROP_DEFS } from '../data/props';
import { FULL_SHOP_CATALOG } from '../data/shop';
import { type TechId } from '../data/techniques';
import { DROPPED_TOOLS, ATTACK_GATE, PICKUP, RUN, WAVE } from '../data/tuning';
import { buildBackground } from '../game/art/background';
import { createArt } from '../game/art';
import { type Hittable } from '../game/bodyTags';
import { Boss } from '../game/Boss';
import { Projectile } from '../game/Projectile';
import { bindDebugToggle, isDebug } from '../game/debug';
import { registerDebugProbe, type DebugProbe, type GameSnapshot } from '../game/debugApi';
import { Enemy } from '../game/Enemy';
import { EnergyHud } from '../game/EnergyHud';
import { Fx } from '../game/fx';
import { FxLab } from '../game/FxLab';
import { Hud } from '../game/Hud';
import { PlayerInput, ShopInput } from '../game/input';
import { FloatTexts } from '../game/FloatTexts';
import { MAX_FRAME_MS } from '../game/physics';
import { Pickups } from '../game/Pickups';
import { Player } from '../game/Player';
import { Prop } from '../game/Prop';
import { ShopPanel } from '../game/ShopPanel';
import { TechCaster } from '../game/TechCaster';
import { TechRunner, type TechTarget } from '../game/TechRunner';
import { Aura } from '../game/techFx/Aura';
import { Callout } from '../game/techFx/Callout';
import { KokusenFx } from '../game/techFx/KokusenFx';
import { CursedFx } from '../game/CursedFx';
import { ImpactFrame } from '../game/ImpactFrame';
import { FocusLines } from '../game/FocusLines';
import { debugParam, debugIntParam, NEUTRAL_INPUT, SPAWN_LIFT } from './test/params';
import { WORLD_ZOOM, FINISHER_ZOOM_OUT_MS, CameraRig } from './test/camera';
import { EffectsDirector } from './test/effects';
import { ImpactFx } from './test/impactFx';
import { CombatLinks } from './test/combat';
import { Spawner } from './test/spawner';
import { Drops } from './test/drops';
import { ShopDirector } from './test/shopDirector';
import { DebugSnapshot } from './test/snapshot';
import { BOSS_UPGRADE_BANNER_MS, RunDirector } from './test/runDirector';
import { UiSetup } from './test/uiSetup';
import { TerrainBuilder } from './test/terrain';

export class TestScene extends Phaser.Scene implements DebugProbe {
  readonly terrainBuilder = new TerrainBuilder(this);
  readonly ui = new UiSetup(this);
  readonly runDirector = new RunDirector(this);
  readonly snapshot = new DebugSnapshot(this);
  readonly shopDirector = new ShopDirector(this);
  readonly drops = new Drops(this);
  readonly spawner = new Spawner(this);
  readonly combat = new CombatLinks(this);
  readonly impactFx = new ImpactFx(this);
  readonly effects = new EffectsDirector(this);
  readonly camera = new CameraRig(this);
  level!: LevelData;
  terrain: MatterJS.BodyType[] = [];
  controls!: PlayerInput;
  /** Teclas da loja (SHOP-45, SHOP-28..30, SHOP-16, SHOP-03), lidas só com `run.state === 'shop'`. */
  shopInput!: ShopInput;
  player!: Player;
  enemies: Enemy[] = [];
  /** Limitador de atacantes (LIM-01..07): 2 vagas, fila FIFO e 350 ms entre windups; zerado a cada `startRun` (EDG-03). */
  attackGate = new AttackGate(ATTACK_GATE);
  /** Só existe numa rodada de chefe (BOSS-01); `null` fora dela ou depois de removido. */
  boss: Boss | null = null;
  /** Projéteis da rajada e ondas de choque do pouso do chefe (BAT-03/04/06/12). */
  projectiles: Projectile[] = [];
  props: Prop[] = [];
  /** Tudo que a câmera de UI desenha mora aqui; o resto da cena é mundo. */
  uiLayer!: Phaser.GameObjects.Layer;
  fx!: Fx;
  hud!: Hud;
  /** Barra de energia e slots de técnica (TEC-07..12), na `uiLayer`. */
  energyHud!: EnergyHud;
  run!: Run;
  /** Carteira de fragmentos da run (ECO-12..14) e os sorteios de drop, criados a cada `startRun` com o `lootRng`. */
  wallet!: Wallet;
  /** Níveis de modificador da run (MOD-01..09): lidos na hora por Player/Pickups/Loot; zerados a cada `startRun`. */
  modifiers!: Modifiers;
  /** Energia amaldiçoada do player (CE-01..09), zerada a cada `startRun`. */
  energy!: CursedEnergy;
  /** Slots de técnica (TEC-01..06), vazios a cada `startRun` (ou `?debug&tech=`, TEC-02). */
  loadout!: Loadout;
  /** Pontos de maestria por slot (MST-01..06): zerados a cada `startRun` e ao equipar técnica nova no slot. */
  mastery = new Mastery();
  /** Conjuração de técnicas (CAST-*), dona da `CastMachine` e dos ganchos do `Player`. */
  techCaster!: TechCaster;
  /** Executa a técnica na soltura (T22+: Punho Divergente/Kokusen), dona da hitbox e das camadas próprias dela. */
  techRunner!: TechRunner;
  /** T28 (`?debug&fxlab`): laboratório de efeitos, `null` fora dele. */
  fxLab: FxLab | null = null;
  /**
   * Camadas de efeito de técnica (design "Dois relógios"): `game` para (hoje) `cast.aura`, `real` para as
   * cinemáticas do Kokusen (T24), que a Fase 6 confere continuarem andando durante o hitstop (TFX-05).
   */
  realtimeFx!: FxTimeline;
  /** Objetos de efeito de técnica vivos (TFX-03/09); `fx.live` do snapshot é `fxRegistry.size`. */
  fxRegistry!: FxRegistry;
  aura!: Aura;
  callout!: Callout;
  /** Cinema do Kokusen (T24): negativo/duotom/raios/faíscas/zoom/cartão, tudo em tempo real (TFX-05). */
  kokusenFx!: KokusenFx;
  cursedFx!: CursedFx;
  impactFrame!: ImpactFrame;
  /** Linhas de foco do golpe decisivo (FOC-01), na `uiLayer`. */
  focusLines!: FocusLines;
  /** Painel da loja na câmera de UI (T10), criado uma vez e mostrado/escondido a cada abertura/fechamento. */
  shopPanel!: ShopPanel;
  loot!: Loot;
  lootRng!: Rng;
  pickups!: Pickups;
  floatTexts!: FloatTexts;
  /** Tempo de vida e teto das ferramentas largadas (ARM-13/14/18/28); vive a cena toda. */
  droppedTools!: DroppedTools;
  /** Detecta a transição para morto (RUN-04): só o primeiro frame morto conta como evento. */
  wasPlayerDead = false;
  /** Relógio de jogo da cena (ms), só para o intervalo entre usos do mesmo ponto de spawn (SPN-08). */
  clockMs = 0;
  /** Contador de combo e nota de estilo (CMB-01..03). */
  comboCounter = new ComboCounter();
  lastPlayerHp = 0;
  /** Histórico dos golpes do jogador nos últimos 3000 ms, para o inimigo ler a repetição (RDG-01); zerado a cada run. */
  reading = new MoveReading();
  /** Foco da postura (PST-13): id do último inimigo comum que aceitou golpe corpo a corpo, de objeto ou o finalizador. */
  focusId: number | null = null;

  constructor() {
    super('TestScene');
  }

  debugSnapshot(): GameSnapshot {
    return this.snapshot.debugSnapshot();
  }

  create(): void {
    // Antes de criar qualquer objeto, para a câmera de UI ignorar tudo que for mundo.
    this.ui.addUiCamera();
    createArt(this);
    // Reinício no meio de um hitstop (R): a cena nova começa descongelada. As animações são do jogo, não da cena.
    this.effects.hitstop.reset();
    this.effects.unfreeze();
    this.effects.slowMo = new SlowMo();
    this.camera.cameraKick = new CameraKick();
    this.camera.zoomPulse = new ZoomPulse();
    this.camera.zoomPulseMs = 0;
    this.comboCounter = new ComboCounter();
    this.reading = new MoveReading();
    this.focusId = null;
    this.camera.finisherZoomMs = 0;
    this.events.on(Phaser.Scenes.Events.PRE_UPDATE, this.effects.tickHitstop, this.effects);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.PRE_UPDATE, this.effects.tickHitstop, this.effects);
      this.effects.hitstop.reset();
      this.effects.unfreeze();
      // Câmera lenta em andamento não vaza para a cena nova.
      this.time.timeScale = 1;
      this.tweens.timeScale = 1;
    });
    this.snapshot.debugEvents = [];
    this.snapshot.debugDeaths = [];
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
    this.terrainBuilder.buildTerrain();
    this.combat.listenForContacts();
    // `?debug&round=N` (design): só em debug, a run já começa na rodada N (smoke da luta de chefe sem esperar 4 rodadas).
    // `?debug&maxAlive=N` (inteiro >= 1) fixa o teto de vivos no lugar de `maxAliveFor` (SPN-02).
    this.run = new Run(RUN, WAVE, {
      firstRound: this.runDirector.firstRoundForDebug(),
      maxAliveOverride: debugIntParam('maxAlive', 1),
    });
    this.clockMs = 0;
    this.spawner.spawnLastUsed = new Map();
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
      this.props.push(
        new Prop(this, s.x, s.y, def, this.modifiers, (hit, at, target) =>
          this.combat.onConnect(hit, at, 'prop', target),
        ),
      );
    }

    this.controls = new PlayerInput(this);
    this.shopInput = new ShopInput(this);
    const p = this.level.player;
    const strike = (hit: Hit, at: Vec2, target?: Hittable): void =>
      this.combat.onConnect(hit, at, hit.strength, target);
    this.player = new Player(
      this,
      p.x,
      p.y - SPAWN_LIFT,
      this.terrain,
      () => this.props,
      this.fx,
      this.modifiers,
      strike,
      (name, phase) => this.impactFx.onStrikePhase(name, phase),
    );
    this.player.onEvent = (ev) => {
      this.snapshot.debugEvents.push(ev);
      if (ev.startsWith('move:')) this.combat.onPlayerMoveStart(ev.slice(5));
    };
    this.player.attackerOf = (ownerId) => this.combat.attackerOf(ownerId);
    this.player.onDefense = (kind, point) => this.combat.onDefense(kind, point);
    this.lastPlayerHp = this.player.hp;
    // Sem spawn inicial de inimigos (RUN-01): a run começa em `title`, e os inimigos entram pelo comando `spawn`.
    this.techCaster = new TechCaster(this, this.player, this.energy, this.loadout);
    this.realtimeFx = new FxTimeline();
    this.fxRegistry = new FxRegistry();
    this.aura = new Aura(this, this.realtimeFx, this.fxRegistry);
    // T24: cartão/raios/faíscas/zoom do Kokusen, na `uiLayer` (o cartão é HUD) + câmera/mundo (raios, faíscas).
    this.kokusenFx = new KokusenFx(this, this.realtimeFx, this.fxRegistry, this.uiLayer);
    // Impacto amaldiçoado: rastro, chama, estilhaços, anel, rachadura e o quadro de impacto (EDG-05: não com loja ou título).
    this.cursedFx = new CursedFx(this);
    this.impactFrame = new ImpactFrame(this, () => this.run.state !== 'shop' && this.run.state !== 'title');
    this.impactFx.lastImpact = null;
    this.impactFx.warnedStrikeFrames = new Set();
    this.impactFx.flameMove = null;
    this.impactFx.crackWatch = new Map();
    this.impactFx.brokenAtFrameStart = new Set();
    this.impactFx.kokusenFrame = -1;
    // EDG-04: reinício da cena destrói todo efeito vivo.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cursedFx.destroyAll());
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
      (hit, point) => this.effects.onTechConnect(hit, point),
      (ms) => {
        this.effects.hitstop.trigger(ms);
        this.effects.freeze();
      },
      (target, point, facing, streak) => {
        this.impactFx.kokusenFrame = this.game.getFrame();
        this.kokusenFx.trigger(target, point, facing, streak);
      },
      // MST-01/02: acerto de técnica em alvo real vira ponto de maestria.
      (slot, castId, targetId, isBoss) => this.runDirector.onMasteryHit(slot, castId, targetId, isBoss),
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

    // CAM-07: sem o `startFollow` do Phaser (lerp por quadro e floor dentro da realimentação faziam o player tremer
    // contra a câmera) e sem `roundPixels`: com 2 px por texel e zoom 1,5, todo texel ocupa 3 px de tela.
    this.cameras.main
      .setZoom(WORLD_ZOOM)
      .setRoundPixels(false)
      .setBounds(0, 0, this.level.widthPx, this.level.heightPx);
    const follow = this.camera.followConfig();
    this.camera.camCenter = clampCenter(this.player.renderPos, follow.view, follow.bounds);
    this.camera.followCamera(0);

    // J também é ataque (PlayerInput): o listener aqui é independente e só começa/recomeça a run (RUN-02/05).
    this.onKey('J', () => this.run.startPressed());
    this.onKey('ENTER', () => this.run.startPressed());

    // Ferramentas de ajuste (golpes de teste e debug do Matter): só valem no modo debug.
    bindDebugToggle(this);
    // Na loja, 1/2/3 compram (SHOP-45) e nunca disparam as teclas de debug.
    const debugKeys = (): boolean => isDebug() && this.run.state !== 'shop';
    // T28: no fxlab as teclas 1-4 (e as novas 5/6/0) são só do laboratório - nunca golpe leve/forte, matar ou
    // machucar o player (essas continuam fora do fxlab, como sempre foram).
    this.onKey('ONE', () =>
      this.fxLab ? debugKeys() && this.fxLab.pressKey(1) : debugKeys() && this.combat.debugHit('light'),
    );
    this.onKey('TWO', () =>
      this.fxLab ? debugKeys() && this.fxLab.pressKey(2) : debugKeys() && this.combat.debugHit('heavy'),
    );
    this.onKey('THREE', () =>
      this.fxLab ? debugKeys() && this.fxLab.pressKey(3) : debugKeys() && this.player.debugKill(),
    );
    // Tecla 4 (só debug): 50 de dano no player, para o smoke medir a cura da vitória abaixo do teto (BWIN-01).
    this.onKey('FOUR', () =>
      this.fxLab ? debugKeys() && this.fxLab.pressKey(4) : debugKeys() && this.player.debugHurt(50),
    );
    this.onKey('FIVE', () => debugKeys() && this.fxLab?.pressKey(5));
    this.onKey('SIX', () => debugKeys() && this.fxLab?.pressKey(6));
    // FXL-03: tecla 0 alterna a câmera lenta; refaz o texto do painel para o rótulo de velocidade (FXL-08).
    this.onKey('ZERO', () => {
      if (!debugKeys() || !this.fxLab) return;
      this.fxLab.toggleTimeScale();
      this.ui.refreshControlsText();
    });
    this.onKey('H', () => isDebug() && this.ui.toggleDebugDraw());
    // Fora da loja, R reinicia a cena; dentro dela é reroll (SHOP-16), lido por `ShopInput` no `update`.
    this.onKey('R', () => {
      if (this.run.state !== 'shop') this.scene.restart();
    });
    this.ui.addHud();
    this.shopPanel = new ShopPanel(this, this.uiLayer);
    this.focusLines = new FocusLines(this, this.uiLayer, this.scale.width, this.scale.height);
  }

  update(_time: number, delta: number): void {
    // A barra acompanha o golpe na hora, mesmo durante o hitstop que ele disparou.
    this.hud.setPlayerHp(this.player.hp, this.player.maxHp);
    this.hud.setPlayerStructure(this.player.structureView);
    this.hud.setCombo(this.comboCounter.hits, this.comboCounter.grade);
    // FXL-03: a câmera lenta multiplica o `dt` de jogo/efeitos junto com `time`/`tweens`/física do Matter
    // (aplicados em `fxLab.toggleTimeScale`) - um só fator, tudo anda devagar junto.
    const realDt = Math.min(delta, MAX_FRAME_MS);
    // A câmera segue no tempo real, inclusive no hitstop e na loja: a posição de desenho do player já é a deste quadro.
    this.camera.followCamera(realDt);
    // Câmera lenta da esquiva perfeita (DOD-07): conta em tempo real e, enquanto dura, o tempo de jogo (física,
    // tweens, timers e a lógica pelo `dt` abaixo) anda a 30%. O relógio real dos efeitos (`base`) não desacelera.
    this.effects.slowMo.update(realDt);
    // FOC-01: as linhas de foco andam em tempo real, também no hitstop.
    this.focusLines.update(realDt);
    this.effects.applyTimeScale();
    const base = realDt * (this.fxLab?.timeScale ?? 1);
    const clamped = base * this.effects.slowMo.timeScale;
    this.ui.slowTint.setVisible(this.effects.slowMo.active);
    if (this.camera.finisherZoomMs > 0) {
      this.camera.finisherZoomMs -= realDt;
      if (this.camera.finisherZoomMs <= 0) this.cameras.main.zoomTo(WORLD_ZOOM, FINISHER_ZOOM_OUT_MS, 'Linear', true);
    }
    // Dois relógios (design): a parte `real` das camadas de efeito (as cinemáticas do Kokusen, T24) anda mesmo
    // congelada; a parte `game` (hoje só `cast.aura`) para no hitstop (TFX-05) — por isso este `update` roda
    // ANTES do retorno adiante, mas com `gameDt` zerado enquanto `frozen`.
    this.realtimeFx.update(this.effects.frozen ? 0 : clamped, base);
    // DOD-12: a camada `dodge.slowTint` fica viva enquanto a câmera lenta dura (re-adicionada a cada frame).
    if (this.effects.slowMo.active) this.realtimeFx.add('dodge.slowTint', 1, 'real');
    // CNT-14: a camada `counter.ready` fica viva enquanto a janela de Contra está aberta (re-adicionada a cada frame,
    // também no hitstop, que não gasta a janela).
    if (this.player.counterView.open) this.realtimeFx.add('counter.ready', 1, 'real');
    // TFX-03/09: a destruição agendada dos objetos de efeito é em tempo real, independe do hitstop.
    this.fxRegistry.update(base);
    // T24 (TFX-05): negativo/duotom/raios/faíscas/cartão do Kokusen andam com o relógio real, mesmo congelados.
    this.kokusenFx.update(base, this.effects.frozen);
    // Congelado pelo hitstop: player, inimigos e objetos param (os timers de combo, IA e vida também).
    if (this.effects.frozen) return;
    const dt = clamped;
    this.clockMs += dt;
    // SHOP-33: na loja, nada de gameplay anda; só o input da loja, `run.update`, o painel e o HUD.
    if (this.run.state === 'shop') {
      this.shopDirector.updateShop();
    } else {
      // Lê sempre (para não represar um `JustDown`), mas fora de roundActive/intermission o player recebe neutro (RUN-08).
      const raw = this.controls.read();
      const input = acceptsPlayerInput(this.run.state) ? raw : NEUTRAL_INPUT;
      this.impactFx.brokenAtFrameStart = new Set(this.enemies.filter((e) => e.broken).map((e) => e.id));
      this.player.update(dt, input);
      this.impactFx.updateCursedFx();
      // FIN-01/03: `J`+`K` juntos perto de um inimigo quebrado é o finalizador; sem alvo, nada acontece.
      if (input.bothPressed && !this.player.dead) this.combat.tryFinisher();
      this.comboCounter.update(dt);
      // CMB-02: o jogador levar dano zera o combo (a vida caiu neste frame, seja golpe cheio ou o que passa pela guarda).
      if (this.player.hp < this.lastPlayerHp) this.comboCounter.playerDamaged();
      this.lastPlayerHp = this.player.hp;
      // DOD-11: enquanto a esquiva está ativa a camada `dodge.trail` fica viva (o rastro em si sai do Player).
      if (this.player.dodgeView.active) this.realtimeFx.add('dodge.trail', 100);
      // AIR-05: enquanto a voadora está ativa a camada `air.kickTrail` fica viva (o rastro em si sai do Player).
      if (this.player.moveName === 'voadora' && this.player.movePhase === 'active')
        this.realtimeFx.add('air.kickTrail', 100);
      this.techCaster.update(dt);
      // FXL-02/KOK-03: a tecla 3 arma o Kokusen sem timing manual - injeta a "tecla apertada de novo" no exato
      // frame em que a janela abre (o `windowOpen` já reflete o começo deste frame, antes do `techRunner.update`).
      if (this.fxLab?.consumeKokusenAutoPress(this.techRunner.kokusenSnapshot.windowOpen))
        this.techCaster.forcePress(0);
      this.snapshot.debugEvents.push(...this.techCaster.events);
      // T28: no laboratório, o Vermelho/Azul/Desmantelar também miram os bonecos de treino, não só os inimigos.
      const techTargets: readonly TechTarget[] = this.fxLab ? [...this.enemies, ...this.fxLab.dummies] : this.enemies;
      // T22+: executa a técnica a partir do estado de conjuração, dos eventos deste frame e do slot apertado (Kokusen).
      this.techRunner.update(
        dt,
        this.techCaster.cast,
        this.techCaster.events,
        this.techCaster.slotPressed,
        techTargets,
        this.boss,
      );
      this.snapshot.debugEvents.push(...this.techRunner.events);
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
      // CAST-14: aura por técnica em sign/charge, sobre o player; tecla 1 do fxlab mostra só a aura. Ela fica presa
      // ao sprite (posição de desenho), não ao corpo: senão anda meio passo à frente dele ao correr (ITP-10).
      const drawn = this.player.renderPos;
      this.aura.update(dt, this.techCaster.cast ?? this.fxLab?.auraDemoCast() ?? null, drawn.x, drawn.y);
      // KOK-27: aura preta com faíscas vermelhas no player enquanto a zona do Kokusen está ativa.
      this.kokusenFx.zoneAura(dt, this.techRunner.kokusenSnapshot.zone, this.player.sprite.x, this.player.sprite.y);
      // CAST-16: a chamada aparece exatamente no frame em que a soltura começa (`techCast:<id>`).
      for (const ev of this.techCaster.events) {
        if (ev.startsWith('techCast:')) this.callout.show(ev.slice('techCast:'.length) as TechId);
      }
      this.callout.update(dt);
      this.camera.updateCastZoom();
      this.drops.updatePickups(dt);
      // Morte do player (RUN-04): só a transição para morto conta, uma vez.
      if (this.player.dead && !this.wasPlayerDead) this.run.playerDied();
      this.wasPlayerDead = this.player.dead;
      this.combat.updateEnemies(dt);
      this.boss?.update(dt, this.player.sprite.x);
      if (this.runDirector.bossDefeatedPending) {
        this.boss?.destroyNow();
        this.boss = null;
        this.runDirector.bossDefeatedPending = false;
      }
      if (this.boss) this.hud.setBossHp(this.boss.hp, this.boss.maxHp);
      if (this.runDirector.clearedBanner) {
        this.runDirector.clearedBanner.afterMs -= dt;
        // BFX-10: o banner do upgrade grátis ocupa o fim da faixa "Chefe derrotado!", antes de "Rodada N concluída".
        if (
          this.runDirector.clearedBanner.upgradeText &&
          this.runDirector.clearedBanner.afterMs <= BOSS_UPGRADE_BANNER_MS
        ) {
          this.hud.banner(this.runDirector.clearedBanner.upgradeText, BOSS_UPGRADE_BANNER_MS);
          this.runDirector.clearedBanner.upgradeText = null;
        }
        if (this.runDirector.clearedBanner.afterMs <= 0) {
          if (this.run.state === 'intermission')
            this.hud.banner(`Rodada ${this.runDirector.clearedBanner.round} concluída`, Infinity);
          this.runDirector.clearedBanner = null;
        }
      }
      for (const proj of this.projectiles) proj.update(dt);
      this.projectiles = this.projectiles.filter((proj) => !proj.removed);
      for (const prop of this.props) prop.update(dt);
      this.drops.updateDroppedTools(dt);
      this.props = this.props.filter((prop) => !prop.isGone);
    }
    for (const cmd of this.run.update(dt, this.runDirector.seedForNewRun)) this.runDirector.applyRunCommand(cmd);
    // Rodada e restantes (RHUD-01) acompanham o `run` a cada frame; fora de rodada (title) fica escondido.
    // T28: no fxlab a onda nunca nasce de verdade (FXL-01), mas o spawner interno da `Run` segue contando como se
    // tivesse nascido - sem isso "Inimigos: N" mentiria na tela do laboratório.
    this.hud.setRun(
      this.run.round > 0 && !this.fxLab ? { round: this.run.round, remaining: this.run.alive + this.run.queued } : null,
    );
    this.hud.setHeldItem(this.drops.heldItemInfo());
    this.hud.update(dt);
    this.energyHud.update(dt, this.energy, this.loadout, this.mastery);
  }

  onKey(key: string, fn: () => void): void {
    const kb = this.input.keyboard!;
    const event = `keydown-${key}`;
    kb.on(event, fn);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => kb.off(event, fn));
  }
}
