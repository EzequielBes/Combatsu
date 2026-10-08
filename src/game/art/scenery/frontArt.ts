import type { ModuleTheme } from '../../../core/module';
import { type Brush, rng } from './brush';
import { hashSeed } from './paint';

/**
 * Primeiro plano (CEN-11, CEN-12): silhuetas escuras e ralas que passam na frente do piso, com rolagem 1,15, para dar
 * profundidade. Tudo fica abaixo do topo do piso (`floorTop`), então nunca cobre o corpo de um lutador; o pé da peça
 * fica em `bottom` (abaixo da borda da tela) e ela cresce para cima até no máximo `floorTop`.
 */
type FrontPainter = (b: Brush, x: number, floorTop: number, bottom: number) => void;

/** Altura mínima livre entre o topo do piso e a peça mais alta. */
const CLEAR = 4;

/** Tufo de capim alto: lâminas finas de alturas diferentes, com a ponta acesa pela lua. */
function grass(b: Brush, x: number, floorTop: number, bottom: number): void {
  const rand = rng(hashSeed(x));
  for (let i = 0; i < 9; i++) {
    const h = 20 + Math.floor(rand() * 10) * 2;
    const bx = x + i * 4 - 16;
    const top = Math.max(floorTop + CLEAR, bottom - h);
    b.rect(bx, top, 2, bottom - top, 'k');
    b.dot(bx, top, 'n');
  }
}

/** Cone de trânsito em silhueta, com a faixa refletiva apagada. */
function cone(b: Brush, x: number, floorTop: number, bottom: number): void {
  const top = Math.max(floorTop + CLEAR, bottom - 40);
  for (let y = top; y < bottom - 6; y += 2) {
    const half = 2 + Math.floor(((y - top) / (bottom - top)) * 10);
    b.rect(x - half, y, half * 2, 2, 'k');
  }
  b.rect(x - 6, top + 14, 12, 2, 'K');
  b.rect(x - 14, bottom - 6, 28, 6, 'k');
}

/** Cano grosso deitado no chão do beco, com a abraçadeira. */
function pipeRun(b: Brush, x: number, floorTop: number, bottom: number): void {
  const top = Math.max(floorTop + CLEAR, bottom - 22);
  b.rect(x - 40, top, 80, bottom - top, 'k');
  b.rect(x - 40, top, 80, 2, 'K');
  b.rect(x - 4, top, 8, bottom - top, 'K');
}

/** Ponta de prateleira da konbini vista de perto, embaixo da tela. */
function shelfEnd(b: Brush, x: number, floorTop: number, bottom: number): void {
  const top = Math.max(floorTop + CLEAR, bottom - 30);
  b.rect(x - 30, top, 60, bottom - top, 'k');
  b.rect(x - 30, top, 60, 2, 'K');
  b.rect(x - 26, top + 8, 52, 2, 'K');
}

/** Peças de primeiro plano por tema; o santuário fica sem (F23). */
const FRONT_ART: Partial<Record<ModuleTheme, readonly FrontPainter[]>> = {
  rua: [cone, grass],
  beco: [pipeRun, cone],
  parque: [grass, grass],
  konbini: [shelfEnd],
};

/** Distância entre duas peças do primeiro plano, na coordenada da camada. */
const GAP = 220;

/**
 * Pinta o primeiro plano da faixa [`x0`, `x1`) do tema, uma peça a cada `GAP` px alternando as peças do tema;
 * sem peça para o tema, nada.
 */
export function paintFront(
  b: Brush,
  theme: ModuleTheme,
  { x0, x1, floorTop, bottom }: { x0: number; x1: number; floorTop: number; bottom: number },
): void {
  const pieces = FRONT_ART[theme];
  if (!pieces) return;
  const rand = rng(hashSeed(x0 + 907));
  let i = 0;
  for (let x = x0 + 60 + Math.floor(rand() * 60); x < x1 - 30; x += GAP + Math.floor(rand() * 4) * 20, i++) {
    pieces[i % pieces.length](b, x, floorTop, bottom);
  }
}
