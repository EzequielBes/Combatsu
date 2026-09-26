import Phaser from 'phaser';
import { armFor, propName, rareDef } from '../core/armed';
import { bossSpecFor } from '../core/bossTier';
import { Filters } from '../core/collision';
import { scaleFor } from '../core/difficulty';
import { DroppedTools } from '../core/droppedTools';
import type { Hit, Strength, Vec2 } from '../core/hit';
import { Hitstop } from '../core/hitstop';
import { TILE, parseLevel, tileVariant, type LevelData } from '../core/level';
import { capDrop, Loot, type EnemyDropResult, type LootOverrides, type ToolKey } from '../core/loot';
import { Modifiers } from '../core/modifiers';
import type { PickupPlayer } from '../core/pickup';
import type { PropState } from '../core/props';
import type { Rng } from '../core/rng';
import { acceptsPlayerInput, Run, type RunCommand } from '../core/run';
import { Shop, type BuyContext } from '../core/shop';
import { Wallet } from '../core/wallet';
import { farthestPoint, isBossRound, requireSpawnPoints } from '../core/waves';
import { BOSS_DEFEAT_HITSTOP_MS, HITSTOP_MS } from '../data/fx';
import { LEVEL_1 } from '../data/level1';
import { PROP_DEFS, TOOL_DEFS } from '../data/props';
import { SHOP_CATALOG } from '../data/shop';
import {
  ARMED,
  BOSS,
  DIFFICULTY,
  DROPPED_TOOLS,
  ECONOMY,
  ENEMY,
  ENEMY_AI,
  ENEMY_ATTACK,
  PICKUP,
  PLAYER_COMBO,
  RUN,
  WAVE,
} from '../data/tuning';
import { buildBackground } from '../game/art/background';
import { createArt } from '../game/art';
import { tileFrameFor } from '../game/art/tiles';
import { routeContact, tagBody } from '../game/bodyTags';
import { Boss } from '../game/Boss';
import { Projectile } from '../game/Projectile';
import { bindDebugToggle, isDebug, onDebugChange } from '../game/debug';
import { registerDebugProbe, type DebugProbe, type GameSnapshot } from '../game/debugApi';
import { Enemy } from '../game/Enemy';
import { Fx, type SparkKind } from '../game/fx';
import { GAME_NAME, Hud } from '../game/Hud';
import type { InputSnapshot } from '../game/input';
import { PlayerInput, ShopInput } from '../game/input';
import { FloatTexts } from '../game/FloatTexts';
import { MAX_FRAME_MS } from '../game/physics';
import { Pickups } from '../game/Pickups';
import { Player } from '../game/Player';
import { Prop } from '../game/Prop';
import { TEX } from '../game/textures';

type ContactEvent = { pairs: { bodyA: MatterJS.BodyType; bodyB: MatterJS.BodyType }[] };

/** Ferramenta amaldiçoada largada (chave em `TOOL_DEFS`, comum ou rara), nunca um objeto do mapa. */
const isDroppedTool = (key: string): boolean => key.startsWith('cursed');

const SPAWN_LIFT = 2;
/** Zoom da câmera do mundo (RES-01): 960x540 de tela mostram 640x360 px de mundo. */
const WORLD_ZOOM = 1.5;
/** Folga (px de tela) em que o player anda sem a câmera andar junto. */
const FOLLOW_DEADZONE = { w: 40, h: 24 };
/** Quanto tempo (ms) o painel de controles fica na tela ao iniciar e a cada reinício (HUD-03). */
const CONTROLS_MS = 8000;
/** Input neutro (RUN-08): fora de `roundActive`/`intermission` o player ignora tudo, mas o input continua sendo
 * lido (para não vazar um `JustDown` represado quando a run volta a aceitar). */
const NEUTRAL_INPUT: InputSnapshot = {
  left: false,
  right: false,
  down: false,
  jumpPressed: false,
  jumpHeld: false,
  attackPressed: false,
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
  /** Só existe numa rodada de chefe (BOSS-01); `null` fora dela ou depois de removido. */
  private boss: Boss | null = null;
  /** Chefe derrotado espera o fim do hitstop da vitória para sumir (não é destruído dentro do próprio golpe). */
  private bossDefeatedPending = false;
  /** Na rodada de chefe, "Rodada N concluída" entra depois da faixa "Chefe derrotado!" (BHUD-03 + RHUD-03). */
  private clearedBanner: { round: number; afterMs: number } | null = null;
  /** Projéteis da rajada e ondas de choque do pouso do chefe (BAT-03/04/06/12). */
  private projectiles: Projectile[] = [];
  private props: Prop[] = [];
  /** Tudo que a câmera de UI desenha mora aqui; o resto da cena é mundo. */
  private uiLayer!: Phaser.GameObjects.Layer;
  private fx!: Fx;
  private hud!: Hud;
  private run!: Run;
  /** Carteira de fragmentos da run (ECO-12..14) e os sorteios de drop, criados a cada `startRun` com o `lootRng`. */
  private wallet!: Wallet;
  /** Níveis de modificador da run (MOD-01..09): lidos na hora por Player/Pickups/Loot; zerados a cada `startRun`. */
  private modifiers!: Modifiers;
  /** Loja aberta (SHOP-01), recriada a cada `shopOpen`; `null` fora da loja. */
  private shop: Shop | null = null;
  private loot!: Loot;
  private lootRng!: Rng;
  private pickups!: Pickups;
  private floatTexts!: FloatTexts;
  /** Tempo de vida e teto das ferramentas largadas (ARM-13/14/18/28); vive a cena toda. */
  private droppedTools!: DroppedTools;
  /** Detecta a transição para morto (RUN-04): só o primeiro frame morto conta como evento. */
  private wasPlayerDead = false;
  private readonly hitstop = new Hitstop();
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
    this.events.on(Phaser.Scenes.Events.PRE_UPDATE, this.tickHitstop, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.PRE_UPDATE, this.tickHitstop, this);
      this.hitstop.reset();
      this.unfreeze();
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
    this.projectiles = [];
    this.buildTerrain();
    this.listenForContacts();
    // `?debug&round=N` (design): só em debug, a run já começa na rodada N (smoke da luta de chefe sem esperar 4 rodadas).
    this.run = new Run(RUN, WAVE, this.level.enemies.length, { firstRound: this.firstRoundForDebug() });
    this.wasPlayerDead = false;
    // MOD-01: uma instância por cena, zerada a cada `startRun` (MOD-10); Player/Prop/Pickups/Loot leem dela na hora.
    this.modifiers = new Modifiers();

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
    // Sem spawn inicial de inimigos (RUN-01): a run começa em `title`, e os inimigos entram pelo comando `spawn`.

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
    this.onKey('ONE', () => isDebug() && this.debugHit('light'));
    this.onKey('TWO', () => isDebug() && this.debugHit('heavy'));
    this.onKey('THREE', () => isDebug() && this.player.debugKill());
    // Tecla 4 (só debug): 50 de dano no player, para o smoke medir a cura da vitória abaixo do teto (BWIN-01).
    this.onKey('FOUR', () => isDebug() && this.player.debugHurt(50));
    this.onKey('H', () => isDebug() && this.toggleDebugDraw());
    // Fora da loja, R reinicia a cena; dentro dela é reroll (SHOP-16), lido por `ShopInput` no `update`.
    this.onKey('R', () => {
      if (this.run.state !== 'shop') this.scene.restart();
    });
    this.addHud();
  }

  update(_time: number, delta: number): void {
    // A barra acompanha o golpe na hora, mesmo durante o hitstop que ele disparou.
    this.hud.setPlayerHp(this.player.hp, this.player.maxHp);
    // Congelado pelo hitstop: player, inimigos e objetos param (os timers de combo, IA e vida também).
    if (this.frozen) return;
    const dt = Math.min(delta, MAX_FRAME_MS);
    // SHOP-33: na loja, nada de gameplay anda; só o input da loja, `run.update`, o painel e o HUD.
    if (this.run.state === 'shop') {
      this.updateShop();
    } else {
      // Lê sempre (para não represar um `JustDown`), mas fora de roundActive/intermission o player recebe neutro (RUN-08).
      const raw = this.controls.read();
      this.player.update(dt, acceptsPlayerInput(this.run.state) ? raw : NEUTRAL_INPUT);
      this.updatePickups(dt);
      // Morte do player (RUN-04): só a transição para morto conta, uma vez.
      if (this.player.dead && !this.wasPlayerDead) this.run.playerDied();
      this.wasPlayerDead = this.player.dead;
      for (const e of [...this.enemies]) e.update(dt, this.player.sprite.x);
      this.boss?.update(dt, this.player.sprite.x);
      if (this.bossDefeatedPending) {
        this.boss?.destroyNow();
        this.boss = null;
        this.bossDefeatedPending = false;
      }
      if (this.boss) this.hud.setBossHp(this.boss.hp, this.boss.maxHp);
      if (this.clearedBanner) {
        this.clearedBanner.afterMs -= dt;
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
    this.hud.setRun(this.run.round > 0 ? { round: this.run.round, remaining: this.run.alive + this.run.queued } : null);
    this.hud.setHeldItem(this.heldItemInfo());
    this.hud.update(dt);
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
      applyModifier: (id) => this.modifiers.apply(id),
      // SHOP-12/MOD-11: cura (consumível) e o +15 de HP da compra de `vida` passam pelo mesmo `heal` com teto.
      healPlayer: (amount) => this.player.heal(amount),
    };
    if (input.buySlot !== null) this.resolveBuy(shop, input.buySlot, ctx);
    else if (input.buySelected) this.resolveBuy(shop, shop.selected, ctx);
    if (input.moveRight) shop.move(1);
    if (input.moveLeft) shop.move(-1);
    if (input.reroll && !shop.reroll(this.wallet)) this.debugEvents.push('rerollRefused');
    if (input.confirm) this.closeShop();
  }

  /** Traduz o `BuyResult` tipado do `Shop` num evento de debug (design "Error Handling Strategy"). */
  private resolveBuy(shop: Shop, slot: number, ctx: BuyContext): void {
    const offerId = shop.view(ctx.wallet, ctx.hp, ctx.maxHp).offers[slot]?.id ?? null;
    const result = shop.buy(slot, ctx);
    if (result.ok) this.debugEvents.push(`buy:${result.id}:${result.cost}`);
    else if (result.reason === 'funds' && offerId) this.debugEvents.push(`buyRefused:${offerId}:funds`);
    else if (result.reason === 'fullHp') this.debugEvents.push('buyRefused:cura:fullHp');
  }

  /** Abre a loja (SHOP-01): varre os fragmentos vivos para a carteira e pausa o Matter (SHOP-05/33/36/37). */
  private openShop(round: number): void {
    this.wallet.add(this.pickups.collectFragments());
    this.matter.world.pause();
    this.shop = new Shop(SHOP_CATALOG, this.modifiers, this.run.shopRng!, round);
    this.debugEvents.push(`shopOpen:${round}`);
  }

  /** Fecha a loja (SHOP-03/35): arma o pedido na `Run`, retoma o Matter e limpa a loja. */
  private closeShop(): void {
    this.run.closeShop();
    this.matter.world.resume();
    this.shop = null;
    this.debugEvents.push('shopClose');
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
        if (cmd.kind === 'boss') this.spawnBoss(cmd.round);
        else this.spawnFromCommand(cmd.point, cmd.round);
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
        this.openShop(cmd.round);
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
    // Higiene: uma loja não deveria sobreviver a um game over (gameOver só sai de roundActive/intermission), mas
    // uma run nova nunca deve carregar a loja da anterior.
    if (this.shop) this.matter.world.resume();
    this.shop = null;
    this.hud.hideBossBar();
    for (const proj of this.projectiles) proj.destroyNow();
    this.projectiles = [];
    this.player.resetForRun();
    // ECO-14/27: carteira zerada e nenhum pickup/texto flutuante sobrevive à run anterior.
    this.wallet.reset();
    this.pickups.clear();
    this.floatTexts.clear();
    // ARM-18: nenhuma ferramenta largada sobrevive à run anterior (a cadeira/garrafa do mapa não são drops).
    for (const prop of this.props) if (isDroppedTool(prop.def.key)) prop.destroyNow();
    this.props = this.props.filter((prop) => !prop.isGone);
    this.droppedTools.clear();
    // MOD-01/MOD-10: upgrades da run anterior não sobrevivem (AD-004).
    this.modifiers.reset();
    // ECO-17: o stream de loot nasce com a seed desta run, já criado pelo `Run.update` que despachou este comando.
    this.lootRng = this.run.lootRng!;
    this.loot = new Loot(this.lootRng, ECONOMY, this.lootOverrides(), this.modifiers);
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

  /** Onda da rodada (WAVE-02): tuning escalado pela rodada (DIF-04) e graça ao nascer (WAVE-09). */
  private spawnFromCommand(point: number, round: number): void {
    const at = this.level.enemies[point];
    const spawnAt: Vec2 = { x: at.x, y: at.y - SPAWN_LIFT };
    const scaled = scaleFor(round, { brain: ENEMY, ai: ENEMY_AI, attack: ENEMY_ATTACK }, DIFFICULTY);
    // ARM-01..03: sorteado depois da escala da rodada (armFor multiplica o dano já escalado).
    const armedRoll = this.loot.rollArmed(round);
    const tuning = armedRoll ? armFor(armedRoll.tool, scaled, ARMED) : scaled;
    const enemy = new Enemy(
      this,
      spawnAt,
      tuning,
      RUN.spawnGraceMs,
      (dead) => {
        this.enemies = this.enemies.filter((e) => e !== dead);
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
    );
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
    this.clearedBanner = { round: this.run.round, afterMs: BOSS.defeatBannerMs };
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
      },
      enemies: this.enemies.map((e) => ({
        id: e.id,
        x: e.x,
        y: e.hurtRect().y,
        hp: e.hp,
        state: e.state,
        maxHp: e.maxHp,
        damage: e.damage,
        patrolSpeed: e.patrolSpeed,
        chaseSpeed: e.chaseSpeed,
        weapon: e.weapon,
        weaponVisible: e.weaponVisible,
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
      hud: this.hud.debugState(),
      hitstop: { frozen: this.hitstop.frozen, remainingMs: this.hitstop.remaining },
      level: { playerSpawn: { x: this.level.player.x, y: this.level.player.y - SPAWN_LIFT } },
      wallet: { fragments: this.wallet.fragments },
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
    };
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

  private addHud(): void {
    const lines = (): string[] => [
      'A/D ou ←/→: mover   Espaço/W: pular (segure = mais alto)',
      'J/X: golpe (combo de 3)   com objeto na mão: golpe forte',
      'K/Z: pegar / arremessar   S+K: largar',
      'R: reiniciar   Tab: mostrar/esconder controles',
      ...(isDebug() ? ['F1: sair do debug   H: debug da física   1/2: golpe leve/forte de teste'] : []),
    ];
    this.hud = new Hud(this, this.uiLayer, lines().join('\n'));
    this.hud.setPlayerHp(this.player.hp, this.player.maxHp);
    this.hud.showControls(CONTROLS_MS);
    // Boot em `title` (RUN-01/RHUD-05): tela com o nome do jogo até o primeiro J/Enter.
    this.hud.setCenter([GAME_NAME, 'J / Enter para começar']);
    // Tab alterna o painel; a captura impede o navegador de tirar o foco do jogo (HUD-03).
    this.input.keyboard!.addCapture('TAB');
    this.onKey('TAB', () => this.hud.toggleControls());
    const off = onDebugChange((on) => {
      this.hud.setControlsText(lines().join('\n'));
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
