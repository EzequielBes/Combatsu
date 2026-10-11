import Phaser from 'phaser';
import { ART_SCALE } from './art/palette';
import type { PaintSink } from './art/scenery/brush';

/** Lado (em texels) de cada pedaço de textura: cabe em qualquer GPU e só os pedaços pintados existem. */
export const BAKE_CHUNK = 512;

/** Retângulo, em px na coordenada da camada, fora do qual nada é pintado (o que a câmera nunca mostra). */
export interface BakeClip {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface BakedLayerConfig {
  depth: number;
  scrollX: number;
  scrollY: number;
  clip?: BakeClip;
}

/** Pedaço em pintura: a posição na grade de pedaços e um `uint32` RGBA por texel. */
interface Chunk {
  cx: number;
  cy: number;
  pixels: Uint32Array<ArrayBuffer>;
}

/** Cor `0xRRGGBB` opaca na ordem de bytes do `ImageData` (R, G, B, A) lida como `uint32` little-endian. */
function packed(color: number): number {
  return (0xff000000 | ((color & 0xff) << 16) | (color & 0xff00) | (color >>> 16)) >>> 0;
}

let nextId = 0;

/**
 * Camada de cenário pintada uma vez só: recebe os mesmos `fillStyle`/`fillRect` de um `Graphics`, mas grava em
 * texels (pedaços de `BAKE_CHUNK`; 1 px de textura = 1 texel de `ART_SCALE` px, a grade em que o `Brush` pinta) que
 * o `commit` envia para texturas mostradas por imagens ampliadas. O `Graphics` guardava cada retângulo e o Phaser
 * refazia a lista inteira a cada quadro (centenas de milhares na camada próxima); aqui o custo por quadro é o de
 * poucas imagens. O `commit` fecha a pintura.
 */
export class BakedLayer implements PaintSink {
  readonly depth: number;
  readonly scrollFactorX: number;
  readonly scrollFactorY: number;

  private readonly id = nextId++;
  /** Pedaços em pintura, pela chave numérica de `chunkAt`; esvaziado pelo `commit`. */
  private readonly chunks = new Map<number, Chunk>();
  /** Texturas e imagens criadas pelo `commit`. */
  private readonly shown: { key: string; image: Phaser.GameObjects.Image }[] = [];
  private readonly data = new Map<string, unknown>();
  /** Recorte em texels. */
  private readonly clip: BakeClip | null;
  private color = packed(0);
  private sealed = false;
  private destroyed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    config: BakedLayerConfig,
  ) {
    this.depth = config.depth;
    this.scrollFactorX = config.scrollX;
    this.scrollFactorY = config.scrollY;
    const c = config.clip;
    const t = ART_SCALE;
    // Em texels, para fora: o recorte nunca corta o que a câmera alcança.
    this.clip = c
      ? { x0: Math.floor(c.x0 / t), y0: Math.floor(c.y0 / t), x1: Math.ceil(c.x1 / t), y1: Math.ceil(c.y1 / t) }
      : null;
    // O gerenciador de texturas é do jogo, não da cena: sem isto um reinício de cena deixaria as texturas vivas.
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  /** Cor dos próximos retângulos. O cenário só pinta opaco (ART-01), então o alpha não é usado. */
  fillStyle(color: number): this {
    this.color = packed(color);
    return this;
  }

  /**
   * Retângulo em px na coordenada da camada. As bordas vão para o texel mais próximo: o `Brush` já pinta nessa grade,
   * e só o recorte de faixa de tema (`clipX`) cai fora dela.
   */
  fillRect(x: number, y: number, width: number, height: number): this {
    const clip = this.clip;
    const t = ART_SCALE;
    const x0 = Math.max(Math.round(x / t), clip ? clip.x0 : -Infinity);
    const y0 = Math.max(Math.round(y / t), clip ? clip.y0 : -Infinity);
    const x1 = Math.min(Math.round((x + width) / t), clip ? clip.x1 : Infinity);
    const y1 = Math.min(Math.round((y + height) / t), clip ? clip.y1 : Infinity);
    if (x1 <= x0 || y1 <= y0) return this;
    if (this.sealed) throw new Error('Camada de cenário já fechada pelo commit');
    const size = BAKE_CHUNK;
    for (let cy = Math.floor(y0 / size); cy * size < y1; cy++) {
      for (let cx = Math.floor(x0 / size); cx * size < x1; cx++) {
        const pixels = this.chunkAt(cx, cy).pixels;
        const left = Math.max(x0, cx * size) - cx * size;
        const right = Math.min(x1, (cx + 1) * size) - cx * size;
        const bottom = Math.min(y1, (cy + 1) * size) - cy * size;
        for (let row = Math.max(y0, cy * size) - cy * size; row < bottom; row++) {
          pixels.fill(this.color, row * size + left, row * size + right);
        }
      }
    }
    return this;
  }

  /**
   * Fecha a pintura: cada pedaço vira uma textura e uma imagem com a rolagem e a profundidade da camada. No WebGL a
   * textura nasce direto dos bytes; passar por um canvas custava a maior parte do tempo de montagem da área.
   */
  commit(): void {
    if (this.sealed) return;
    this.sealed = true;
    const size = BAKE_CHUNK;
    const textures = this.scene.textures;
    const webgl = this.scene.game.renderer.type === Phaser.WEBGL;
    for (const { cx, cy, pixels } of this.chunks.values()) {
      const key = `baked-${this.id}-${cx},${cy}`;
      if (webgl) textures.addUint8Array(key, new Uint8Array(pixels.buffer), size, size);
      else {
        const bytes = new Uint8ClampedArray(pixels.buffer);
        textures.createCanvas(key, size, size)?.context.putImageData(new ImageData(bytes, size, size), 0, 0);
      }
      const image = this.scene.add
        .image(cx * size * ART_SCALE, cy * size * ART_SCALE, key)
        .setOrigin(0, 0)
        .setScale(ART_SCALE)
        .setScrollFactor(this.scrollFactorX, this.scrollFactorY)
        .setDepth(this.depth);
      this.shown.push({ key, image });
    }
    this.chunks.clear();
  }

  setData(key: string, value: unknown): this {
    this.data.set(key, value);
    return this;
  }

  getData(key: string): unknown {
    return this.data.get(key);
  }

  /** Destrói as imagens e libera as texturas; idempotente. */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.sealed = true;
    this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    for (const { key, image } of this.shown) {
      image.destroy();
      this.scene.textures.remove(key);
    }
    this.shown.length = 0;
    this.chunks.clear();
  }

  private chunkAt(cx: number, cy: number): Chunk {
    // Chave numérica (a pintura passa aqui centenas de milhares de vezes): cabe qualquer área do jogo.
    const at = (cx + 4096) * 8192 + cy + 4096;
    let chunk = this.chunks.get(at);
    if (!chunk) {
      chunk = { cx, cy, pixels: new Uint32Array(BAKE_CHUNK * BAKE_CHUNK) };
      this.chunks.set(at, chunk);
    }
    return chunk;
  }
}
