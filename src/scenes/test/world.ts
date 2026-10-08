import type Phaser from 'phaser';
import type { BossArchetype } from '../../core/bossTier';
import { Filters } from '../../core/collision';
import { TILE, tileVariant, type LevelData, type Rect } from '../../core/level';
import { FLOOR_ROWS } from '../../core/module';
import { AREA } from '../../data/tuning';
import type { AreaSpan } from '../../core/stage';
import { PROP_DEFS } from '../../data/props';
import { buildBackground } from '../../game/art/background';
import { Brush, clipX } from '../../game/art/scenery/brush';
import { decorSlots } from '../../game/art/scenery/decor';
import { paintDecor } from '../../game/art/scenery/decorArt';
import { paintFront } from '../../game/art/scenery/frontArt';
import { layerBands, toLayerX } from '../../game/art/scenery/layers';
import { PALETTE } from '../../game/art/palette';
import { tileFrameFor } from '../../game/art/tiles';
import { terrainSheetFor } from '../../game/art/tilesThemes';
import { tagBody } from '../../game/bodyTags';
import { Prop } from '../../game/Prop';
import { TEX } from '../../game/textures';
import type { TestScene } from '../TestScene';
import { ArenaDressing } from './arena';
import { debugParam } from './params';

/** Chave da folha do talismã do selo (THM-03); sem ela o selo é um retângulo da paleta (ARE-11). */
export const SEAL_SHEET = TEX.seal;

/** Primeiro plano (CEN-11): rola 1,15 na horizontal e 1 na vertical, na frente dos atores. */
export const FRONT_SCROLL = { x: 1.15, y: 1 } as const;
const FRONT_DEPTH = 50;
/** Decoração (CEN-13): atrás dos atores e do terreno (0) e na frente da camada próxima do fundo (−10). */
const DECOR_DEPTH = -5;

/** Quantas faíscas amaldiçoadas sobem do selo quando ele rompe (TRV-03). */
const SEAL_SPARKS = 10;

/**
 * Constrói e destrói tudo que pertence a uma área (ENV-01, ARE-11, TRV-01, TRV-03): tiles, corpos de terreno, selo,
 * fundo e objetos. A sala usa o mesmo `build` com a `LEVEL_1`, então só existe um caminho de construção.
 */
export class WorldBuilder {
  constructor(readonly s: TestScene) {
    this.arena = new ArenaDressing(s);
  }

  /** Selo da esquerda e véu vermelho da arena do chefe (ARN-07..11). */
  readonly arena: ArenaDressing;

  private tiles: Phaser.GameObjects.Image[] = [];
  private background: Phaser.GameObjects.Graphics[] = [];
  private staticBodies: MatterJS.BodyType[] = [];
  private sealBody: MatterJS.BodyType | null = null;
  private sealImage: Phaser.GameObjects.TileSprite | Phaser.GameObjects.Rectangle | null = null;
  private sealRect: Rect | null = null;
  private sparks: Phaser.GameObjects.Image[] = [];
  private spans: readonly AreaSpan[] = [];
  private decor: Phaser.GameObjects.Graphics | null = null;
  private front: Phaser.GameObjects.Graphics | null = null;
  private decorCount = 0;
  /** Arquétipo do chefe da arena (ARN-05); `null` fora da área de chefe. */
  private variant: BossArchetype | null = null;
  /** Peças desenhadas em cada trecho, na ordem dos trechos (CEN-13). */
  private decorPerSpan: number[] = [];
  /** Linha mais baixa pintada pela decoração, em px de mundo (CEN-13: o pé das peças); `null` sem decoração. */
  private decorBottom: number | null = null;

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

  /** Tema de cada faixa da camada média como foi pintada (CEN-10); vazio na sala. */
  midBands(): { theme: string }[] {
    const bands = this.background[1]?.getData('midBands') as { theme: string }[] | undefined;
    return (bands ?? []).map((b) => ({ theme: b.theme }));
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
  build(
    rows: readonly string[],
    level: LevelData,
    spans: readonly AreaSpan[] = [],
    variant: BossArchetype | null = null,
  ): void {
    this.resetState();
    this.spans = spans;
    this.variant = variant;
    this.buildTiles(rows, spans);
    for (const r of level.solids) this.staticBodies.push(this.addTerrainBody(r));
    this.buildSeal(level.seal);
    this.background = buildBackground(this.s, level.widthPx, level.heightPx, spans, variant);
    // `?debug&decor=0` desliga decoração e primeiro plano (o smoke compara os corpos do Matter com e sem eles).
    if (spans.length > 0 && debugParam('decor') !== '0') this.buildScenery(spans, level);
    this.arena.build(variant);
    this.buildProps(level);
  }

  /** Destrói tudo da área (ARE-11) e esvazia `s.terrain` e `s.props` no lugar (nunca reatribui). */
  teardown(): void {
    const s = this.s;
    for (const img of this.tiles) img.destroy();
    for (const g of this.background) g.destroy();
    this.decor?.destroy();
    this.front?.destroy();
    for (const body of this.staticBodies) s.matter.world.remove(body);
    this.removeSeal();
    this.arena.teardown();
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
    this.arena.openSeal();
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
    this.decor = null;
    this.front = null;
    this.decorCount = 0;
    this.variant = null;
    this.decorPerSpan = [];
    this.decorBottom = null;
  }

  /** Arquétipo do chefe passado ao fundo da arena (ARN-05); `null` fora da área de chefe. */
  get arenaVariant(): BossArchetype | null {
    return this.variant;
  }

  /** Peças de decoração desenhadas na área (CEN-13); 0 na sala. */
  get decorPieces(): number {
    return this.decorCount;
  }

  /**
   * Profundidades lidas dos objetos (CEN-13): camada próxima do fundo e decoração (`null` sem ela), e a linha mais
   * baixa pintada pela decoração.
   */
  get sceneryLayout(): {
    nearDepth: number | null;
    decorDepth: number | null;
    decorFoot: number | null;
    decorPerModule: number[];
    terrainDepth: number | null;
  } {
    return {
      terrainDepth: this.tiles[0]?.depth ?? null,
      decorPerModule: [...this.decorPerSpan],
      nearDepth: this.background[2]?.depth ?? null,
      decorDepth: this.decor?.depth ?? null,
      decorFoot: this.decorBottom,
    };
  }

  /** Rolagem do primeiro plano como está no objeto (CEN-11); `null` sem primeiro plano (a sala). */
  get frontScroll(): { sx: number; sy: number } | null {
    return this.front ? { sx: this.front.scrollFactorX, sy: this.front.scrollFactorY } : null;
  }

  /**
   * Decoração sem colisão (CEN-13, CEN-14) numa `Graphics` só, no mundo, e o primeiro plano (CEN-11, CEN-12) com a
   * rolagem `FRONT_SCROLL`, só abaixo do topo do piso. Nenhum dos dois cria corpo do Matter.
   */
  private buildScenery(spans: readonly AreaSpan[], level: LevelData): void {
    const floorTop = FLOOR_ROWS[0] * TILE;
    this.decor = this.s.add.graphics().setDepth(DECOR_DEPTH);
    const decor = this.decor;
    let foot = -Infinity;
    // Mede o pé das peças enquanto pinta: a cena é quem escolhe a linha do chão (CEN-13).
    const brush = new Brush({
      fillStyle: (color, alpha) => decor.fillStyle(color, alpha),
      fillRect: (x, y, w, h) => {
        foot = Math.max(foot, y + h);
        return decor.fillRect(x, y, w, h);
      },
    });
    const drawn = decorSlots(spans).filter((slot, i) => paintDecor(brush, slot.theme, slot.x, floorTop, i));
    this.decorCount = drawn.length;
    this.decorPerSpan = spans.map(
      (sp) => drawn.filter((d) => d.x >= sp.col0 * TILE && d.x < (sp.col1 + 1) * TILE).length,
    );
    this.decorBottom = Number.isFinite(foot) ? foot : null;
    this.front = this.s.add.graphics().setScrollFactor(FRONT_SCROLL.x, FRONT_SCROLL.y).setDepth(FRONT_DEPTH);
    const f = FRONT_SCROLL.x;
    const bands = layerBands(spans, toLayerX(-128, f), toLayerX(level.widthPx + 128, f), f);
    for (const band of bands) {
      paintFront(new Brush(clipX(this.front, band.x0, band.x1)), band.theme, {
        x0: band.x0,
        x1: band.x1,
        floorTop,
        // A tela mostra o mundo até a altura da área: a peça nasce 8 px abaixo e cresce para dentro da tela.
        bottom: level.heightPx + 8,
      });
    }
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
