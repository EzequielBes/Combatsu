import type { Brush } from './brush';
import { speckle, wire } from './paint';
import type { LayerArea } from './types';

/**
 * Camada média da arena do chefe (ARN-03, ARN-04): a escadaria de pedra sobe até o salão do santuário, com o torii
 * vermelho na frente e a árvore sagrada cingida pela `shimenawa` ao lado. O Oni do Portão deixa o torii rachado e
 * acorrentado; a Tecelã de Maldições enche o lugar de fios e casulos.
 */

/**
 * Centro do santuário na camada: a média rola a 0,3, e a câmera centrada no ponto de mundo X mostra no meio da tela
 * o x `0,3 · X + 448` da camada (`toLayerX`). Na arena, X vai de 320 a largura − 320, então o meio fica perto de 680.
 */
const CX = 680;

/** Escadaria: degraus que estreitam para cima, com o espelho escuro e o piso aceso pela lua. */
function stairs(b: Brush, ground: number): void {
  for (let i = 0; i < 11; i++) {
    const half = 130 - i * 6;
    const y = ground - 20 - (i + 1) * 9;
    b.rect(CX - half, y, half * 2, 9, 'N');
    b.rect(CX - half, y, half * 2, 2, 'S');
    b.rect(CX - half, y + 2, 4, 7, 's');
  }
  // Muretas de pedra dos dois lados da escada.
  for (const side of [-1, 1]) {
    const x = CX + side * 136 - (side < 0 ? 10 : 0);
    b.rect(x, ground - 60, 10, 40, 's');
    b.rect(x, ground - 60, 10, 2, 'S');
  }
}

/** Salão do santuário no alto da escada: corpo de madeira, treliça, e o telhado curvo com a cumeeira enfeitada. */
function hall(b: Brush, ground: number): void {
  const base = ground - 119;
  const w = 180;
  const x = CX - w / 2;
  b.rect(x - 6, base - 4, w + 12, 4, 's');
  b.rect(x, base - 48, w, 44, 'K');
  for (let px = x + 4; px < x + w; px += 34) b.rect(px, base - 48, 6, 44, 'm');
  for (let px = x + 14; px < x + w - 10; px += 34) {
    b.rect(px, base - 40, 18, 28, 'n');
    for (let ly = base - 38; ly < base - 14; ly += 6) b.rect(px + 2, ly, 14, 2, 'K');
  }
  b.rect(CX - 10, base - 40, 20, 32, 'a');
  b.rect(CX - 8, base - 38, 16, 2, 'A');
  // Telhado: abas que abrem em curva para fora e a cumeeira.
  for (let row = 0; row < 26; row += 2) {
    const flare = Math.round((((26 - row) / 26) ** 2 * 18) / 2) * 2;
    const half = w / 2 + 24 - row * 2 + flare;
    b.rect(CX - half, base - 50 - row, half * 2, 2, row % 6 === 0 ? 'n' : 'k');
  }
  b.rect(CX - 60, base - 80, 120, 4, 'k');
  b.rect(CX - 60, base - 80, 120, 2, 'N');
  for (const side of [-1, 1]) b.rect(CX + side * 62 - 3, base - 86, 6, 8, 'k');
}

/** Torii vermelho: dois pilares, a viga de baixo (`nuki`) e a de cima (`kasagi`) com as pontas levantadas. */
function torii(b: Brush, ground: number, cracked: boolean): void {
  const top = ground - 168;
  for (const side of [-1, 1]) {
    const x = CX + side * 76 - 6;
    b.rect(x, top + 18, 12, ground - top - 18, 'r');
    b.rect(x, top + 18, 4, ground - top - 18, 't');
    b.rect(x - 4, ground - 12, 20, 12, 'k');
  }
  b.rect(CX - 98, top + 34, 196, 8, 'r');
  b.rect(CX - 98, top + 34, 196, 2, 't');
  b.rect(CX - 112, top + 10, 224, 10, 'r');
  b.rect(CX - 112, top + 10, 224, 2, 'T');
  b.rect(CX - 118, top + 2, 236, 8, 'k');
  b.rect(CX - 124, top - 2, 10, 6, 'k');
  b.rect(CX + 114, top - 2, 10, 6, 'k');
  b.rect(CX - 8, top + 20, 16, 14, 'k');
  b.rect(CX - 6, top + 22, 12, 10, 'l');
  if (!cracked) return;
  // Oni: o pilar da esquerda racha em diagonal, falta um pedaço da viga e correntes pendem da viga de baixo.
  for (let i = 0; i < 12; i++) b.rect(CX - 82 + (i % 3) * 2, top + 60 + i * 6, 4, 4, 'k');
  b.rect(CX + 40, top + 2, 30, 8, 'e');
  // Correntes grossas: elos de 6x6 alternando de frente e de lado.
  for (const [cx, len] of [
    [CX - 50, 56],
    [CX - 10, 40],
    [CX + 30, 64],
  ] as const) {
    for (let y = top + 42, i = 0; y < top + 42 + len; y += 6, i++) {
      if (i % 2 === 0) {
        b.rect(cx - 2, y, 6, 6, 'S');
        b.rect(cx, y + 2, 2, 2, 'K');
      } else {
        b.rect(cx, y, 2, 6, 's');
      }
    }
  }
}

/** Árvore sagrada: tronco largo, copa escura, corda `shimenawa` em volta e as tiras de papel `shide`. */
function sacredTree(b: Brush, cx: number, ground: number): void {
  b.rect(cx - 18, ground - 120, 36, 100, 'K');
  b.rect(cx - 18, ground - 120, 8, 100, 'm');
  speckle(b, cx - 18, ground - 120, 36, 100, ['m', 'n'], 0.25, 1301);
  // Copa larga e baixa, quase toda na sombra: o verde só no alto, do lado da lua.
  b.disc(cx, ground - 150, 52, 'K');
  b.disc(cx - 40, ground - 136, 38, 'K');
  b.disc(cx + 42, ground - 140, 36, 'K');
  b.disc(cx + 12, ground - 170, 22, 'g');
  speckle(b, cx - 80, ground - 204, 160, 96, ['g', 'n', 'K'], 0.22, 1303);
  b.rect(cx - 22, ground - 92, 44, 6, 'l');
  b.rect(cx - 22, ground - 92, 44, 2, 'w');
  for (let x = cx - 16; x <= cx + 12; x += 14) {
    b.rect(x, ground - 86, 4, 4, 'w');
    b.rect(x + 2, ground - 82, 4, 4, 'w');
    b.rect(x, ground - 78, 4, 4, 'w');
  }
}

/** Tecelã: fios pálidos que caem em curva entre a árvore, o torii e o salão, e casulos pendurados neles. */
function webs(b: Brush, ground: number): void {
  const tree = CX - 270;
  const anchors: readonly (readonly [number, number, number, number, number])[] = [
    // x0, x1, altura, barriga, casulo na posição (0..1) do fio; 0 = sem casulo.
    [tree + 40, CX - 112, ground - 170, 20, 0.55],
    [tree + 20, CX - 100, ground - 130, 26, 0.35],
    [CX - 112, CX + 112, ground - 166, 30, 0.5],
    [CX + 112, CX + 260, ground - 160, 22, 0.6],
    [CX + 90, CX + 230, ground - 120, 18, 0],
  ];
  for (const [x0, x1, y, sag, at] of anchors) {
    wire(b, x0, x1, y, sag, 'I');
    if (at === 0) continue;
    const cx = Math.round((x0 + (x1 - x0) * at) / 2) * 2;
    const cy = y + Math.round((4 * sag * at * (1 - at)) / 2) * 2;
    b.rect(cx, cy, 2, 10, 'I');
    b.disc(cx + 1, cy + 18, 7, 'i');
    b.rect(cx - 4, cy + 14, 10, 2, 'I');
    b.rect(cx - 4, cy + 20, 10, 2, 'I');
    b.dot(cx - 2, cy + 16, 'I');
  }
}

/** Camada média da arena do chefe (ARN-03, ARN-04). */
export function santuarioMid(b: Brush, { x0, x1, ground, bottom, variant }: LayerArea): void {
  b.rect(x0, ground - 20, x1 - x0, bottom - ground + 20, 'K');
  // Arbustos podados ao pé de tudo, com folhas e sombra.
  for (let x = x0; x < x1; x += 22) b.disc(x, ground - 22, 12, 'K');
  speckle(b, x0, ground - 34, x1 - x0, 20, ['g', 'n'], 0.3, 1321);
  sacredTree(b, CX - 270, ground);
  stairs(b, ground);
  hall(b, ground);
  torii(b, ground, variant === 'oni');
  if (variant === 'tecela') webs(b, ground);
}
