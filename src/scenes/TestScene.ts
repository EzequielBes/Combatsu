import Phaser from 'phaser';
import { Filters } from '../core/collision';
import type { Strength, Vec2 } from '../core/hit';
import { parseLevel, type LevelData } from '../core/level';
import { LEVEL_1 } from '../data/level1';
import { PROP_DEFS } from '../data/props';
import { ENEMY_RESPAWN_MS, PLAYER_COMBO } from '../data/tuning';
import { routeContact, tagBody } from '../game/bodyTags';
import { Enemy } from '../game/Enemy';
import { PlayerInput } from '../game/input';
import { MAX_FRAME_MS } from '../game/physics';
import { Player } from '../game/Player';
import { Prop } from '../game/Prop';
import { TEX, createPlaceholderTextures } from '../game/textures';

type ContactEvent = { pairs: { bodyA: MatterJS.BodyType; bodyB: MatterJS.BodyType }[] };

const SPAWN_LIFT = 2;

export class TestScene extends Phaser.Scene {
  private level!: LevelData;
  private terrain: MatterJS.BodyType[] = [];
  private controls!: PlayerInput;
  private player!: Player;
  private enemies: Enemy[] = [];
  private props: Prop[] = [];

  constructor() {
    super('TestScene');
  }

  create(): void {
    createPlaceholderTextures(this);
    this.level = parseLevel(LEVEL_1);
    this.terrain = [];
    this.enemies = [];
    this.buildTerrain();
    this.listenForContacts();

    this.props = [];
    for (const s of this.level.props) {
      const def = PROP_DEFS[s.key];
      if (!def) throw new Error(`Objeto sem definição: ${s.key}`);
      this.props.push(new Prop(this, s.x, s.y, def));
    }

    this.controls = new PlayerInput(this);
    const p = this.level.player;
    this.player = new Player(this, p.x, p.y - SPAWN_LIFT, this.terrain, () => this.props);
    for (const e of this.level.enemies) this.spawnEnemy({ x: e.x, y: e.y - SPAWN_LIFT });

    this.cameras.main.setBounds(0, 0, this.level.widthPx, this.level.heightPx);
    this.cameras.main.startFollow(this.player.sprite, true, 0.15, 0.15);

    // Ferramentas de ajuste: golpes de teste e debug do Matter.
    this.onKey('ONE', () => this.debugHit('light'));
    this.onKey('TWO', () => this.debugHit('heavy'));
    this.onKey('H', () => this.toggleDebugDraw());
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(delta, MAX_FRAME_MS);
    this.player.update(dt, this.controls.read());
    for (const e of [...this.enemies]) e.update(dt, this.player.sprite.x);
    for (const prop of this.props) prop.update(dt);
    this.props = this.props.filter((prop) => !prop.isGone);
  }

  private spawnEnemy(at: Vec2): void {
    this.enemies.push(
      new Enemy(this, at, (dead) => {
        this.enemies = this.enemies.filter((e) => e !== dead);
        this.time.delayedCall(ENEMY_RESPAWN_MS, () => this.spawnEnemy(dead.spawn));
      }),
    );
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

  private toggleDebugDraw(): void {
    const world = this.matter.world;
    if (!world.debugGraphic) world.createDebugGraphic();
    world.drawDebug = !world.drawDebug;
    world.debugGraphic.clear();
  }

  private onKey(key: string, fn: () => void): void {
    const kb = this.input.keyboard!;
    const event = `keydown-${key}`;
    kb.on(event, fn);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => kb.off(event, fn));
  }

  private buildTerrain(): void {
    for (const r of this.level.solids) {
      const cx = r.x + r.width / 2;
      const cy = r.y + r.height / 2;
      this.add.tileSprite(cx, cy, r.width, r.height, TEX.terrain);
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
