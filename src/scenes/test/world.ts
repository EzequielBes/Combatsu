import type Phaser from 'phaser';
import { Filters } from '../../core/collision';
import { TILE, tileVariant, type LevelData, type Rect } from '../../core/level';
import { FLOOR_ROWS } from '../../core/module';
import { AREA } from '../../data/tuning';
import type { AreaSpan } from '../../core/stage';
import { PROP_DEFS } from '../../data/props';
import { buildBackground } from '../../game/art/background';
import { PALETTE } from '../../game/art/palette';
import { tileFrameFor } from '../../game/art/tiles';
import { terrainSheetFor } from '../../game/art/tilesThemes';
import { tagBody } from '../../game/bodyTags';
import { Prop } from '../../game/Prop';
import { TEX } from '../../game/textures';
import type { TestScene } from '../TestScene';

/** Chave da folha do talismã do selo (THM-03); sem ela o selo é um retângulo da paleta (ARE-11). */
export const SEAL_SHEET = TEX.seal;

/** Quantas faíscas amaldiçoadas sobem do selo quando ele rompe (TRV-03). */
const SEAL_SPARKS = 10;

/**
 * Constrói e destrói tudo que pertence a uma área (ENV-01, ARE-11, TRV-01, TRV-03): tiles, corpos de terreno, selo,
 * fundo e objetos. A sala usa o mesmo `build` com a `LEVEL_1`, então só existe um caminho de construção.
 */
export class WorldBuilder {
  constructor(readonly s: TestScene) {}

  private tiles: Phaser.GameObjects.Image[] = [];
  private background: Phaser.GameObjects.Graphics[] = [];
  private staticBodies: MatterJS.BodyType[] = [];
  private sealBody: MatterJS.BodyType | null = null;
  private sealImage: Phaser.GameObjects.TileSprite | Phaser.GameObjects.Rectangle | null = null;
  private sealRect: Rect | null = null;
  private sparks: Phaser.GameObjects.Image[] = [];
  private spans: readonly AreaSpan[] = [];

  /** Selo ainda fechado (corpo sólido na área); `false` na sala, na konbini e depois de `openSeal`. */
  get sealed(): boolean {
    return this.sealBody !== null;
  }

  /** Imagem do selo como está desenhada agora (THM-03): textura, frame e alpha; `null` sem selo ou depois do efeito. */
  get sealView(): { texture: string; frame: string; alpha: number } | null {
    const image = this.sealImage;
    if (!image) return null;
    if (!('texture' in image)) return { texture: '', frame: '', alpha: image.alpha };
    return { texture: image.texture.key, frame: String(image.frame.name), alpha: image.alpha };
  }

  /** Folha do tile do chão no meio de cada trecho, lida da imagem desenhada (THM-02); vazio na sala. */
  floorSheets(): { id: string; sheet: string | null }[] {
    const y = FLOOR_ROWS[0] * TILE + TILE / 2;
    return this.spans.map((sp) => {
      const x = Math.floor((sp.col0 + sp.col1) / 2) * TILE + TILE / 2;
      const tile = this.tiles.find((t) => t.x === x && t.y === y);
      return { id: sp.id, sheet: tile ? tile.texture.key : null };
    });
  }

  /** Cores das faixas do fundo próximo como foram pintadas (THM-02); vazio na sala. */
  nearBands(): { wall: string; top: string }[] {
    const bands = this.background[2]?.getData('bands') as { wall: string; top: string }[] | undefined;
    return (bands ?? []).map((b) => ({ wall: b.wall, top: b.top }));
  }

  /** Borda esquerda do selo em px (TRV-05); `null` quando a área não tem selo. */
  get exitX(): number | null {
    return this.sealRect ? this.sealRect.x : null;
  }

  /**
   * Cria a área: tiles pela variante (ENV-01), corpos de terreno nos retângulos mesclados, selo, fundo e objetos.
   * Os corpos entram em `s.terrain` e os objetos em `s.props` NO MESMO array, porque `Player`, `TechRunner` e o
   * `Spawner` guardam a referência (design "Risks & Concerns"). O estado da construção anterior é descartado sem
   * destruir nada: numa cena reiniciada os objetos antigos já morreram com a cena.
   */
  build(rows: readonly string[], level: LevelData, spans: readonly AreaSpan[] = []): void {
    this.resetState();
    this.spans = spans;
    this.buildTiles(rows, spans);
    for (const r of level.solids) this.staticBodies.push(this.addTerrainBody(r));
    this.buildSeal(level.seal);
    this.background = buildBackground(this.s, level.widthPx, level.heightPx, spans);
    this.buildProps(level);
  }

  /** Destrói tudo da área (ARE-11) e esvazia `s.terrain` e `s.props` no lugar (nunca reatribui). */
  teardown(): void {
    const s = this.s;
    for (const img of this.tiles) img.destroy();
    for (const g of this.background) g.destroy();
    for (const body of this.staticBodies) s.matter.world.remove(body);
    this.removeSeal();
    this.clearSparks();
    for (const prop of s.props) prop.destroyNow();
    for (const proj of s.projectiles) proj.destroyNow();
    s.projectiles = [];
    s.terrain.length = 0;
    s.props.length = 0;
    s.pickups.clear();
    s.floatTexts.clear();
    s.droppedTools.clear();
    this.resetState();
  }

  /** Rompe o selo (TRV-03): remove o corpo e toca o efeito de `AREA.sealBurnMs`; idempotente. */
  openSeal(): void {
    const body = this.sealBody;
    const rect = this.sealRect;
    if (!body || !rect) return;
    this.sealBody = null;
    this.s.matter.world.remove(body);
    const at = this.s.terrain.indexOf(body);
    if (at >= 0) this.s.terrain.splice(at, 1);
    const image = this.sealImage;
    if (image) {
      this.s.tweens.add({
        targets: image,
        alpha: 0,
        duration: AREA.sealBurnMs,
        onComplete: () => this.destroySealImage(),
      });
    }
    this.burstSparks(rect);
  }

  private resetState(): void {
    this.tiles = [];
    this.background = [];
    this.staticBodies = [];
    this.sealBody = null;
    this.sealImage = null;
    this.sealRect = null;
    this.sparks = [];
    this.spans = [];
  }

  private buildTiles(rows: readonly string[], spans: readonly AreaSpan[]): void {
    rows.forEach((row, ty) => {
      for (let tx = 0; tx < row.length; tx++) {
        const variant = tileVariant(rows, tx, ty);
        if (!variant) continue;
        this.tiles.push(
          this.s.add.image(
            tx * TILE + TILE / 2,
            ty * TILE + TILE / 2,
            terrainSheetFor(tx, ty, spans),
            tileFrameFor(variant, tx, ty),
          ),
        );
      }
    });
  }

  private addTerrainBody(r: Rect): MatterJS.BodyType {
    const body = this.s.matter.add.rectangle(r.x + r.width / 2, r.y + r.height / 2, r.width, r.height, {
      isStatic: true,
      label: 'terrain',
      collisionFilter: { ...Filters.terrain },
    });
    tagBody(body, { kind: 'terrain' });
    this.s.terrain.push(body);
    return body;
  }

  /** Corpo sólido do selo (TRV-01) e a imagem: o frame `seal` se a folha existir, senão um retângulo da `PALETTE`. */
  private buildSeal(seal: Rect | null): void {
    if (!seal) return;
    this.sealRect = seal;
    this.sealBody = this.addTerrainBody(seal);
    const cx = seal.x + seal.width / 2;
    const cy = seal.y + seal.height / 2;
    this.sealImage = this.s.textures.exists(SEAL_SHEET)
      ? this.s.add.tileSprite(cx, cy, seal.width, seal.height, SEAL_SHEET, 'seal')
      : this.s.add.rectangle(cx, cy, seal.width, seal.height, PALETTE.v, 0.7).setStrokeStyle(2, PALETTE.U);
    this.sealImage.setDepth(1);
  }

  private buildProps(level: LevelData): void {
    for (const p of level.props) {
      const def = PROP_DEFS[p.key];
      if (!def) throw new Error(`Objeto sem definição: ${p.key}`);
      this.s.props.push(
        new Prop(this.s, p.x, p.y, def, this.s.modifiers, (hit, at, target) =>
          this.s.combat.onConnect(hit, at, 'prop', target),
        ),
      );
    }
  }

  /** Faíscas amaldiçoadas que sobem ao longo do selo e somem junto com ele (TRV-03). */
  private burstSparks(seal: Rect): void {
    for (let i = 0; i < SEAL_SPARKS; i++) {
      const x = seal.x + TILE / 2 + ((i % 3) - 1) * 8;
      const y = seal.y + ((i + 0.5) / SEAL_SPARKS) * seal.height;
      const bit = this.s.add.image(x, y, TEX.cursedBit, i % 2 === 0 ? 'U' : 'C').setDepth(2);
      this.sparks.push(bit);
      this.s.tweens.add({
        targets: bit,
        y: y - 48,
        alpha: 0,
        duration: AREA.sealBurnMs,
        onComplete: () => bit.destroy(),
      });
    }
  }

  private destroySealImage(): void {
    this.sealImage?.destroy();
    this.sealImage = null;
  }

  private removeSeal(): void {
    if (this.sealImage) this.s.tweens.killTweensOf(this.sealImage);
    this.destroySealImage();
    if (this.sealBody) this.s.matter.world.remove(this.sealBody);
    this.sealBody = null;
    this.sealRect = null;
  }

  private clearSparks(): void {
    for (const bit of this.sparks) {
      this.s.tweens.killTweensOf(bit);
      bit.destroy();
    }
    this.sparks = [];
  }
}
