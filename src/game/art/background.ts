import type Phaser from 'phaser';
import type { ModuleTheme } from '../../core/module';
import { Brush, rng } from './scenery/brush';
import { layerBands, type ThemeSpan } from './scenery/layers';

export type { ThemeSpan } from './scenery/layers';

/** Fatores de rolagem das três camadas de fundo (ENV-02): distante, média e próxima. */
export const PARALLAX = [0.1, 0.3, 0.6] as const;

/** Profundidade das camadas: todas atrás do terreno (profundidade 0). */
const DEPTH = [-30, -20, -10];

/**
 * Linha do "chão" de cada camada, em coordenadas da própria camada. Com a câmera no chão da sala (zoom 1,5), o
 * piso cobre a base de cada camada; tudo abaixo dessa linha é preenchido até o fim para nunca abrir buraco.
 */
const GROUND = [400, 420, 450];

/** Cor do muro da camada próxima por tema (THM-02): `wall` é a base e `top` a linha acesa; só chaves da paleta. */
export const NEAR_COLORS: Record<ModuleTheme, { wall: string; top: string }> = {
  rua: { wall: 'E', top: 'f' },
  beco: { wall: 'n', top: 'N' },
  parque: { wall: 'g', top: 'G' },
  konbini: { wall: 'N', top: 's' },
  santuario: { wall: 'm', top: 'M' },
};

/** Faixa de cor da camada próxima: de `x0` a `x1` na coordenada da própria camada. */
export interface Band {
  x0: number;
  x1: number;
  wall: string;
  top: string;
}

/** Faixas da camada próxima com as cores do tema de cada trecho (THM-02): `layerBands` no fator da próxima. */
export function bandsFor(spans: readonly ThemeSpan[], x0: number, x1: number): Band[] {
  return layerBands(spans, x0, x1, PARALLAX[2]).map((b) => ({ x0: b.x0, x1: b.x1, ...NEAR_COLORS[b.theme] }));
}

/**
 * Fundo da escola à noite em três camadas de parallax (ENV-02), desenhado com Graphics só com cores da paleta:
 * - distante (0,1): céu em faixas com dither, estrelas, lua com halo e a silhueta do prédio principal com a torre;
 * - média (0,3): alas da escola com telhado de beiral, árvores e postes acesos;
 * - próxima (0,6): muro de pilares de pedra com gradil.
 * Com `spans` (THM-02) a camada próxima ganha a cor do tema de cada módulo; sem eles (a sala) sai a de sempre.
 * Devolve as camadas na ordem de PARALLAX.
 */
export function buildBackground(
  scene: Phaser.Scene,
  widthPx: number,
  heightPx: number,
  spans?: readonly ThemeSpan[],
): Phaser.GameObjects.Graphics[] {
  const x0 = -128;
  const x1 = widthPx + 128;
  const bottom = heightPx + 256;
  const bands = spans && spans.length > 0 ? bandsFor(spans, x0, x1) : undefined;
  const painters = [paintFar, paintMid, (b: Brush, span: Span) => paintNear(b, span, bands)];
  const layers = PARALLAX.map((factor, i) => {
    const g = scene.add.graphics().setScrollFactor(factor, factor).setDepth(DEPTH[i]);
    painters[i](new Brush(g), { x0, x1, ground: GROUND[i], bottom });
    return g;
  });
  // As cores pintadas na camada próxima ficam no objeto, para o snapshot de debug conferir o tema (THM-02).
  layers[2].setData('bands', bands ?? []);
  return layers;
}

interface Span {
  x0: number;
  x1: number;
  ground: number;
  bottom: number;
}

function paintFar(b: Brush, { x0, x1, ground, bottom }: Span): void {
  const w = x1 - x0;
  // Céu: topo profundo, meio e horizonte, com faixas de dither entre eles.
  b.rect(x0, -256, w, 256 + 150, 'e');
  // O dither pinta só metade dos texels: a faixa precisa de base sólida, senão aparece o fundo do canvas (ART-01).
  b.rect(x0, 150, w, 12, 'e');
  b.dither(x0, 150, w, 12, 'E');
  b.rect(x0, 162, w, 78, 'E');
  b.rect(x0, 240, w, 12, 'E');
  b.dither(x0, 240, w, 12, 'f');
  b.rect(x0, 252, w, bottom - 252, 'f');

  // Estrelas: a maioria discreta, algumas brilhantes em cruz.
  const rand = rng(7);
  for (let i = 0; i < 110; i++) {
    const x = x0 + rand() * w;
    const y = rand() * 240;
    const r = rand();
    b.dot(x, y, r < 0.7 ? 'S' : r < 0.9 ? 'C' : 'w');
  }
  for (let i = 0; i < 8; i++) {
    const x = x0 + rand() * w;
    const y = 10 + rand() * 180;
    b.dot(x, y, 'w');
    for (const [dx, dy] of [
      [-2, 0],
      [2, 0],
      [0, -2],
      [0, 2],
    ])
      b.dot(x + dx, y + dy, 'S');
  }

  // Lua com halo.
  const mx = 600;
  const my = 140;
  b.disc(mx, my, 44, 'E');
  b.disc(mx, my, 36, 'f');
  b.disc(mx, my, 28, 'N');
  b.disc(mx, my, 20, 'l');
  b.disc(mx + 6, my + 6, 16, 'l');
  // Sombra do terminador (lado de baixo à direita) e crateras.
  for (let dy = -18; dy <= 18; dy += 2) {
    const half = Math.floor(Math.sqrt(20 * 20 - dy * dy) / 2) * 2;
    b.rect(mx + half - 4, my + dy, 4, 2, 'L');
  }
  b.disc(mx - 6, my - 6, 4, 'L');
  b.disc(mx + 6, my + 4, 2, 'L');
  b.disc(mx - 2, my + 10, 2, 'L');
  b.dot(mx - 10, my - 12, 'w');
  b.dot(mx - 12, my - 10, 'w');

  // Cidade ao longe: blocos baixos com algumas janelas.
  const city = rng(11);
  for (let x = x0; x < x1;) {
    const bw = 40 + Math.floor(city() * 5) * 12;
    const top = ground - 50 - Math.floor(city() * 6) * 10;
    b.rect(x, top, bw, bottom - top, 'E');
    for (let wy = top + 8; wy < ground - 6; wy += 10) {
      for (let wx = x + 6; wx < x + bw - 6; wx += 8) if (city() < 0.12) b.dot(wx, wy, 'a');
    }
    x += bw + 4;
  }

  // Prédio principal da escola com a torre do relógio.
  const sx = 300;
  const sw = 560;
  const st = ground - 90;
  b.rect(sx, st, sw, bottom - st, 'n');
  b.rect(sx - 4, st - 4, sw + 8, 4, 'N'); // beiral do telhado com a luz da lua
  const win = rng(23);
  for (let wy = st + 12; wy < ground - 10; wy += 18) {
    for (let wx = sx + 12; wx < sx + sw - 12; wx += 16) {
      b.rect(wx, wy, 6, 8, win() < 0.18 ? 'a' : 'K');
    }
  }
  const tx = sx + sw / 2 - 24;
  const tt = st - 70;
  b.rect(tx, tt, 48, st - tt, 'n');
  b.rect(tx - 4, tt - 4, 56, 4, 'N');
  b.rect(tx + 8, tt - 24, 32, 20, 'n');
  b.rect(tx + 14, tt - 34, 20, 10, 'n');
  b.rect(tx + 22, tt - 44, 4, 10, 'K');
  b.disc(tx + 24, tt + 22, 10, 'L');
  b.disc(tx + 24, tt + 22, 8, 'l');
  b.rect(tx + 24, tt + 14, 2, 8, 'k');
  b.rect(tx + 24, tt + 22, 6, 2, 'k');
}

function paintMid(b: Brush, { x0, x1, ground, bottom }: Span): void {
  // Base contínua (muro baixo do pátio) para nunca aparecer céu embaixo.
  b.rect(x0, ground - 20, x1 - x0, bottom - ground + 20, 'K');

  const rand = rng(31);
  let x = x0;
  let n = 0;
  while (x < x1) {
    const kind = n % 3;
    if (kind === 0) {
      // Ala da escola com telhado de beiral.
      const w = 160 + Math.floor(rand() * 3) * 32;
      const top = ground - 70;
      b.rect(x, top, w, bottom - top, 'K');
      // Telhado: beiral saliente, duas águas em degraus, cumeeira acesa pela lua.
      b.rect(x - 10, top - 6, w + 20, 6, 'k');
      b.rect(x - 12, top - 4, 4, 4, 'k');
      b.rect(x + w + 8, top - 4, 4, 4, 'k');
      for (let i = 1; i <= 5; i++) b.rect(x - 8 + i * 8, top - 6 - i * 4, w + 16 - i * 16, 4, 'k');
      b.rect(x + 32, top - 30, w - 64, 2, 'n');
      for (let wy = top + 12; wy < ground - 14; wy += 20) {
        for (let wx = x + 12; wx < x + w - 16; wx += 20) {
          const r = rand();
          b.rect(wx, wy, 10, 10, r < 0.2 ? 'A' : r < 0.35 ? 'a' : 'k');
          b.rect(wx + 4, wy, 2, 10, 'K');
        }
      }
      x += w + 40;
    } else if (kind === 1) {
      // Árvore: copa em discos, tronco fino, borda de cima acesa.
      const cx = x + 40;
      const top = ground - 90 - Math.floor(rand() * 3) * 10;
      b.rect(cx - 3, top + 40, 6, ground - top - 40, 'K');
      b.disc(cx, top + 30, 28, 'K');
      b.disc(cx - 22, top + 42, 20, 'K');
      b.disc(cx + 22, top + 44, 18, 'K');
      b.disc(cx - 4, top + 20, 18, 'K');
      for (let i = -12; i <= 8; i += 4) b.dot(cx + i, top + 3 + Math.abs(i) / 2, 'n');
      x += 110;
    } else {
      // Poste aceso com um halo pequeno.
      const px = x + 20;
      const top = ground - 110;
      b.disc(px + 8, top + 4, 14, 'n');
      b.rect(px - 2, top, 4, ground - top, 'k');
      b.rect(px - 2, top - 2, 14, 4, 'k');
      b.rect(px + 4, top + 2, 8, 4, 'A');
      b.rect(px + 6, top + 2, 4, 2, 'w');
      x += 80;
    }
    n++;
  }
}

function paintNear(b: Brush, { x0, x1, ground, bottom }: Span, bands?: readonly Band[]): void {
  // Tons médios (E/f), nunca o preto do contorno: os personagens passam na frente desta camada e o contorno
  // deles (k) precisa se destacar dela.
  // Muro baixo de pedra.
  for (const band of bands ?? [{ x0, x1, wall: 'E', top: 'f' }]) {
    b.rect(band.x0, ground - 36, band.x1 - band.x0, bottom - ground + 36, band.wall);
    b.rect(band.x0, ground - 36, band.x1 - band.x0, 2, band.top);
  }
  // Gradil: dois trilhos e barras finas.
  const railTop = ground - 76;
  b.rect(x0, railTop, x1 - x0, 4, 'K');
  b.rect(x0, railTop, x1 - x0, 2, 'n');
  b.rect(x0, railTop + 24, x1 - x0, 4, 'K');
  for (let x = x0; x < x1; x += 12) {
    b.rect(x, railTop - 6, 2, 40, 'K');
    b.dot(x, railTop - 8, 'n');
  }
  // Pilares de pedra com capitel.
  for (let x = x0 + 40; x < x1; x += 208) {
    const top = ground - 110;
    b.rect(x, top, 20, bottom - top, 'K');
    b.rect(x + 2, top + 6, 16, ground - top - 42, 'E');
    b.rect(x + 2, top + 6, 2, ground - top - 42, 'f');
    b.rect(x - 4, top - 4, 28, 10, 'K');
    b.rect(x - 4, top - 4, 28, 2, 'f');
    b.rect(x + 2, top - 10, 16, 6, 'K');
    b.rect(x + 4, top - 10, 12, 2, 'n');
  }
}
