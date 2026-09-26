/**
 * Kanji das técnicas em pixel art, 24x24 texels (KOK-29): 黒 (kuro, Kokusen), 閃 (sen, só no cartão 黒閃), 赫
 * (aka, Vermelho), 蒼 (ao, Azul) e 解 (kai, Desmantelar). Traços de 2 texels para ler bem no tamanho pequeno
 * (AD-002). Dados puros (sem `phaser` como valor): rodam no Vitest.
 *
 * Cada glifo é uma estilização em blocos do caractere real (a grade de texto não dá para caligrafia fina), com
 * a cor de traço da própria técnica: `b` (preto) para 黒/閃 (duotom do Kokusen, KOK-22), `R`/`r` para 赫
 * (Vermelho), `c`/`C` para 蒼 (Azul) e `w`/`W` para 解 (Desmantelar, mesma aura branca do gesto de corte).
 */
export type KanjiId = 'kuro' | 'sen' | 'aka' | 'ao' | 'kai';

const SIZE = 24;

/** Grade 24x24 em branco (só '.'), para desenhar por cima com linhas retas. */
function blank(): string[][] {
  return Array.from({ length: SIZE }, () => Array<string>(SIZE).fill('.'));
}

/** Linha horizontal de `y` a `y + thickness - 1`, de `x0` a `x1` (inclusive), com o caractere `ch`. */
function hline(g: string[][], x0: number, x1: number, y: number, ch: string, thickness = 2): void {
  for (let t = 0; t < thickness; t++) {
    const row = g[y + t];
    if (!row) continue;
    for (let x = x0; x <= x1; x++) if (row[x] !== undefined) row[x] = ch;
  }
}

/** Linha vertical de `x` a `x + thickness - 1`, de `y0` a `y1` (inclusive), com o caractere `ch`. */
function vline(g: string[][], x: number, y0: number, y1: number, ch: string, thickness = 2): void {
  for (let t = 0; t < thickness; t++) {
    for (let y = y0; y <= y1; y++) {
      const row = g[y];
      if (row && row[x + t] !== undefined) row[x + t] = ch;
    }
  }
}

/** Diagonal em passo simples (Bresenham grosseiro, suficiente na grade de texel) entre dois pontos. */
function diag(g: string[][], x0: number, y0: number, x1: number, y1: number, ch: string, thickness = 2): void {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / steps);
    const y = Math.round(y0 + ((y1 - y0) * i) / steps);
    for (let tx = 0; tx < thickness; tx++) {
      const row = g[y];
      if (row && row[x + tx] !== undefined) row[x + tx] = ch;
    }
  }
}

function toRows(g: string[][]): string[] {
  return g.map((row) => row.join(''));
}

/** 黒 (kuro, "preto"): campo quadriculado em cima (里) e as 4 chamas (灬) embaixo. */
function kuro(): string[] {
  const g = blank();
  // Moldura do campo (里): quadrado com cruz interna, formando 4 células (como 田).
  hline(g, 4, 19, 3, 'b');
  hline(g, 4, 19, 12, 'b');
  vline(g, 4, 3, 12, 'b');
  vline(g, 18, 3, 12, 'b');
  vline(g, 11, 3, 12, 'b');
  hline(g, 4, 19, 7, 'b');
  // Haste central descendo até as chamas.
  vline(g, 11, 12, 15, 'b');
  // 灬: 4 chamas curtas na base.
  vline(g, 3, 17, 21, 'b');
  vline(g, 8, 16, 21, 'b');
  vline(g, 14, 16, 21, 'b');
  vline(g, 19, 17, 21, 'b');
  return toRows(g);
}

/** 閃 (sen, "clarão"): moldura de portão (門) com o raio/pessoa (人) dentro. */
function sen(): string[] {
  const g = blank();
  // Moldura do portão: duas colunas e uma barra no topo.
  vline(g, 2, 2, 21, 'b');
  vline(g, 20, 2, 21, 'b');
  hline(g, 2, 21, 2, 'b');
  hline(g, 2, 21, 20, 'b');
  // Raio (a "pessoa"/clarão) em zigue-zague dentro do portão, na cor de destaque do Kokusen.
  diag(g, 14, 5, 9, 11, 'R');
  diag(g, 9, 11, 15, 13, 'R');
  diag(g, 15, 13, 8, 20, 'R');
  return toRows(g);
}

/** 赫 (aka, "rubro"): dois radicais 赤 lado a lado (telhado + haste + base em V), na cor do Vermelho. */
function aka(): string[] {
  const g = blank();
  for (const x0 of [2, 13]) {
    hline(g, x0, x0 + 8, 3, 'r');
    vline(g, x0 + 3, 3, 14, 'r');
    diag(g, x0 + 3, 14, x0, 20, 'R');
    diag(g, x0 + 3, 14, x0 + 8, 20, 'R');
  }
  return toRows(g);
}

/** 蒼 (ao, "azul-pálido"): grama (艹) em cima, telhado e um núcleo (口) embaixo, na cor do Azul. */
function ao(): string[] {
  const g = blank();
  // 艹: duas hastes curtas no topo.
  vline(g, 7, 2, 5, 'c');
  vline(g, 15, 2, 5, 'c');
  // Telhado (亠/宀): barra e as duas beiradas caindo.
  hline(g, 4, 19, 7, 'c');
  diag(g, 4, 7, 2, 10, 'c');
  diag(g, 19, 7, 21, 10, 'c');
  // Corpo com o núcleo (口) no meio.
  vline(g, 4, 10, 20, 'c');
  vline(g, 19, 10, 20, 'c');
  hline(g, 9, 14, 13, 'C');
  hline(g, 9, 14, 18, 'C');
  vline(g, 9, 13, 18, 'C');
  vline(g, 13, 13, 18, 'C');
  return toRows(g);
}

/** 解 (kai, "desmantelar"): chifre (角) à esquerda, boi (牛) à direita, cortados por uma lâmina (刀) diagonal. */
function kai(): string[] {
  const g = blank();
  // 角 (esquerda): haste central com duas pontas em cima e uma barra no meio.
  vline(g, 6, 3, 14, 'w');
  diag(g, 4, 3, 6, 6, 'w');
  diag(g, 9, 3, 6, 6, 'w');
  hline(g, 3, 10, 9, 'w');
  // 牛 (direita): cruz com um traço inclinado no topo (chifres do boi).
  vline(g, 17, 3, 20, 'w');
  hline(g, 13, 21, 8, 'w');
  diag(g, 13, 3, 17, 5, 'w');
  // 刀 (lâmina do corte): diagonal cheia atravessando o glifo, em branco puro.
  diag(g, 3, 20, 20, 4, 'W', 2);
  return toRows(g);
}

export const KANJI_FRAMES: Record<KanjiId, readonly string[]> = {
  kuro: kuro(),
  sen: sen(),
  aka: aka(),
  ao: ao(),
  kai: kai(),
};
