import Phaser from 'phaser';
import { bossSpecFor } from '../core/bossTier';
import { Filters } from '../core/collision';
import { scaleFor } from '../core/difficulty';
import type { Hit, Strength, Vec2 } from '../core/hit';
import { Hitstop } from '../core/hitstop';
import { TILE, parseLevel, tileVariant, type LevelData } from '../core/level';
import { acceptsPlayerInput, Run, type RunCommand } from '../core/run';
import { farthestPoint, requireSpawnPoints } from '../core/waves';
import { HITSTOP_MS } from '../data/fx';
import { LEVEL_1 } from '../data/level1';
import { PROP_DEFS } from '../data/props';
import { BOSS, DIFFICULTY, ENEMY, ENEMY_AI, ENEMY_ATTACK, PLAYER_COMBO, RUN, WAVE } from '../data/tuning';
import { buildBackground } from '../game/art/background';
import { createArt } from '../game/art';
import { tileFrameFor } from '../game/art/tiles';
import { routeContact, tagBody } from '../game/bodyTags';
import { Boss } from '../game/Boss';
import { bindDebugToggle, isDebug, onDebugChange } from '../game/debug';
import { registerDebugProbe, type DebugProbe, type GameSnapshot } from '../game/debugApi';
import { Enemy } from '../game/Enemy';
import { Fx, type SparkKind } from '../game/fx';
import { GAME_NAME, Hud } from '../game/Hud';
import type { InputSnapshot } from '../game/input';
import { PlayerInput } from '../game/input';
import { MAX_FRAME_MS } from '../game/physics';
import { Player } from '../game/Player';
import { Prop } from '../game/Prop';
import { TEX } from '../game/textures';

type ContactEvent = { pairs: { bodyA: MatterJS.BodyType; bodyB: MatterJS.BodyType }[] };

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
  private player!: Player;
  private enemies: Enemy[] = [];
  /** Só existe numa rodada de chefe (BOSS-01); `null` fora dela ou depois de removido. */
  private boss: Boss | null = null;
  private props: Prop[] = [];
  /** Tudo que a câmera de UI desenha mora aqui; o resto da cena é mundo. */
  private uiLayer!: Phaser.GameObjects.Layer;
  private fx!: Fx;
  private hud!: Hud;
  private run!: Run;
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
    this.buildTerrain();
    this.listenForContacts();
    // `?debug&round=N` (design): só em debug, a run já começa na rodada N (smoke da luta de chefe sem esperar 4 rodadas).
    this.run = new Run(RUN, WAVE, this.level.enemies.length, { firstRound: this.firstRoundForDebug() });
    this.wasPlayerDead = false;

    this.props = [];
    for (const s of this.level.props) {
      const def = PROP_DEFS[s.key];
      if (!def) throw new Error(`Objeto sem definição: ${s.key}`);
      this.props.push(new Prop(this, s.x, s.y, def, (hit, at) => this.onConnect(hit, at, 'prop')));
    }

    this.controls = new PlayerInput(this);
    const p = this.level.player;
    const strike = (hit: Hit, at: Vec2): void => this.onConnect(hit, at, hit.strength);
    this.player = new Player(this, p.x, p.y - SPAWN_LIFT, this.terrain, () => this.props, this.fx, strike);
    // Sem spawn inicial de inimigos (RUN-01): a run começa em `title`, e os inimigos entram pelo comando `spawn`.

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
    this.onKey('H', () => isDebug() && this.toggleDebugDraw());
    this.onKey('R', () => this.scene.restart());
    this.addHud();
  }

  update(_time: number, delta: number): void {
    // A barra acompanha o golpe na hora, mesmo durante o hitstop que ele disparou.
    this.hud.setPlayerHp(this.player.hp, this.player.maxHp);
    // Congelado pelo hitstop: player, inimigos e objetos param (os timers de combo, IA e vida também).
    if (this.frozen) return;
    const dt = Math.min(delta, MAX_FRAME_MS);
    // Lê sempre (para não represar um `JustDown`), mas fora de roundActive/intermission o player recebe neutro (RUN-08).
    const raw = this.controls.read();
    this.player.update(dt, acceptsPlayerInput(this.run.state) ? raw : NEUTRAL_INPUT);
    // Morte do player (RUN-04): só a transição para morto conta, uma vez.
    if (this.player.dead && !this.wasPlayerDead) this.run.playerDied();
    this.wasPlayerDead = this.player.dead;
    for (const e of [...this.enemies]) e.update(dt, this.player.sprite.x);
    this.boss?.update(dt, this.player.sprite.x);
    for (const prop of this.props) prop.update(dt);
    this.props = this.props.filter((prop) => !prop.isGone);
    for (const cmd of this.run.update(dt, this.seedForNewRun)) this.applyRunCommand(cmd);
    // Rodada e restantes (RHUD-01) acompanham o `run` a cada frame; fora de rodada (title) fica escondido.
    this.hud.setRun(this.run.round > 0 ? { round: this.run.round, remaining: this.run.alive + this.run.queued } : null);
    this.hud.update(dt);
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
        // Fica até o próximo `roundStart` chamar `banner` de novo (RHUD-03).
        this.hud.banner(`Rodada ${cmd.round} concluída`, Infinity);
        break;
      case 'gameOver':
        this.hud.setCenter([
          `Rodada alcançada: ${cmd.round}`,
          `Abates: ${cmd.kills}`,
          'J / Enter para tentar de novo',
        ]);
        break;
    }
  }

  /**
   * Nova run (RUN-01/05): remove os inimigos restantes na hora e devolve o player ao spawn com a vida cheia.
   * Também remove o chefe se algum estiver vivo (edge case: game over em plena luta de chefe); os projéteis
   * dele ficam para o T9.
   */
  private onStartRun(): void {
    for (const e of this.enemies) e.destroyNow();
    this.enemies = [];
    this.boss?.destroyNow();
    this.boss = null;
    this.player.resetForRun();
  }

  /** Onda da rodada (WAVE-02): tuning escalado pela rodada (DIF-04) e graça ao nascer (WAVE-09). */
  private spawnFromCommand(point: number, round: number): void {
    const at = this.level.enemies[point];
    const spawnAt: Vec2 = { x: at.x, y: at.y - SPAWN_LIFT };
    const tuning = scaleFor(round, { brain: ENEMY, ai: ENEMY_AI, attack: ENEMY_ATTACK }, DIFFICULTY);
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
      (dead, x, y) => this.onEnemyDied(dead.id, x, y),
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
      // onLanded (BAT-03, ondas de choque) e onFire (BAT-04, projétil): T9.
      undefined,
      undefined,
      (dead, x, y) => this.onEnemyDied(dead.id, x, y),
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
      player: { x: this.player.sprite.x, y: this.player.sprite.y, hp: this.player.hp, dead: this.player.dead },
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
          }
        : null,
      run: { state: this.run.state, round: this.run.round, kills: this.run.kills, alive: this.run.alive, queued: this.run.queued },
      hud: this.hud.debugState(),
      level: { playerSpawn: { x: this.level.player.x, y: this.level.player.y - SPAWN_LIFT } },
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
    this.boss?.receiveHit(hitToward(this.boss.x));
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
