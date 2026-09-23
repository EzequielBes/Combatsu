import Phaser from 'phaser';
import { Filters } from '../core/collision';
import { parseLevel, type LevelData } from '../core/level';
import { LEVEL_1 } from '../data/level1';
import { routeContact, tagBody } from '../game/bodyTags';
import { PlayerInput } from '../game/input';
import { MAX_FRAME_MS } from '../game/physics';
import { Player } from '../game/Player';
import { TEX, createPlaceholderTextures } from '../game/textures';

type ContactEvent = { pairs: { bodyA: MatterJS.BodyType; bodyB: MatterJS.BodyType }[] };

/** Spawns ficam no centro do tile; sobe um pouco para o corpo não nascer dentro do chão. */
const SPAWN_LIFT = 2;

export class TestScene extends Phaser.Scene {
  private level!: LevelData;
  private terrain: MatterJS.BodyType[] = [];
  private controls!: PlayerInput;
  private player!: Player;

  constructor() {
    super('TestScene');
  }

  create(): void {
    createPlaceholderTextures(this);
    this.level = parseLevel(LEVEL_1);
    this.terrain = [];
    this.buildTerrain();
    this.listenForContacts();

    this.controls = new PlayerInput(this);
    const p = this.level.player;
    this.player = new Player(this, p.x, p.y - SPAWN_LIFT, this.terrain);

    this.cameras.main.setBounds(0, 0, this.level.widthPx, this.level.heightPx);
    this.cameras.main.startFollow(this.player.sprite, true, 0.15, 0.15);
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(delta, MAX_FRAME_MS);
    this.player.update(dt, this.controls.read());
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
