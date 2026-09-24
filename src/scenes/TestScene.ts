import Phaser from 'phaser';
import { Filters } from '../core/collision';
import type { Hit, Strength, Vec2 } from '../core/hit';
import { Hitstop } from '../core/hitstop';
import { TILE, parseLevel, tileVariant, type LevelData } from '../core/level';
import { HITSTOP_MS } from '../data/fx';
import { LEVEL_1 } from '../data/level1';
import { PROP_DEFS } from '../data/props';
import { ENEMY_RESPAWN_MS, PLAYER_COMBO } from '../data/tuning';
import { buildBackground } from '../game/art/background';
import { createArt } from '../game/art';
import { tileFrameFor } from '../game/art/tiles';
import { routeContact, tagBody } from '../game/bodyTags';
import { bindDebugToggle, isDebug, onDebugChange } from '../game/debug';
import { Enemy } from '../game/Enemy';
import { Fx, type SparkKind } from '../game/fx';
import { Hud } from '../game/Hud';
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

export class TestScene extends Phaser.Scene {
  private level!: LevelData;
  private terrain: MatterJS.BodyType[] = [];
  private controls!: PlayerInput;
  private player!: Player;
  private enemies: Enemy[] = [];
  private props: Prop[] = [];
  /** Tudo que a câmera de UI desenha mora aqui; o resto da cena é mundo. */
  private uiLayer!: Phaser.GameObjects.Layer;
  private fx!: Fx;
  private hud!: Hud;
  private readonly hitstop = new Hitstop();
  /** Se a pausa do hitstop está aplicada (física, animações, tweens e timers). */
  private frozen = false;

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
    this.fx = new Fx(this);
    this.level = parseLevel(LEVEL_1);
    buildBackground(this, this.level.widthPx, this.level.heightPx);
    this.terrain = [];
    this.enemies = [];
    this.buildTerrain();
    this.listenForContacts();

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
    for (const e of this.level.enemies) this.spawnEnemy({ x: e.x, y: e.y - SPAWN_LIFT });

    this.cameras.main
      .setZoom(WORLD_ZOOM)
      .setRoundPixels(true)
      .setBounds(0, 0, this.level.widthPx, this.level.heightPx)
      .startFollow(this.player.sprite, true, 0.15, 0.15)
      .setDeadzone(FOLLOW_DEADZONE.w, FOLLOW_DEADZONE.h);

    // Ferramentas de ajuste (golpes de teste e debug do Matter): só valem no modo debug.
    bindDebugToggle(this);
    this.onKey('ONE', () => isDebug() && this.debugHit('light'));
    this.onKey('TWO', () => isDebug() && this.debugHit('heavy'));
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
    this.player.update(dt, this.controls.read());
    for (const e of [...this.enemies]) e.update(dt, this.player.sprite.x);
    for (const prop of this.props) prop.update(dt);
    this.props = this.props.filter((prop) => !prop.isGone);
  }

  private spawnEnemy(at: Vec2): void {
    this.enemies.push(
      new Enemy(
        this,
        at,
        (dead) => {
          this.enemies = this.enemies.filter((e) => e !== dead);
          this.time.delayedCall(ENEMY_RESPAWN_MS, () => this.spawnEnemy(dead.spawn));
        },
        // A garra que acerta o player também é um golpe que conecta.
        (hit, point) => this.onConnect(hit, point, hit.strength),
      ),
    );
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

  /** Aplica em todos os inimigos o mesmo golpe que o combo do player daria. */
  private debugHit(strength: Strength): void {
    const step = PLAYER_COMBO.find((s) => s.strength === strength)!;
    for (const e of this.enemies) {
      e.receiveHit({
        ownerId: 0,
        damage: step.damage,
        strength,
        force: step.force,
        direction: { x: e.x >= this.player.sprite.x ? 1 : -1, y: -0.6 },
      });
    }
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
