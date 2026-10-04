/*
 * Mãos do player HD, no sistema local da mão: origem no pulso, `u` segue o antebraço e `f` atravessa a mão. Três
 * formas: punho fechado, mão aberta (palma, guarda aberta, faca de mão) e o selo de dois dedos das técnicas.
 * Poucos tons, para ler limpo a 2 px por texel. Puro, sem `phaser`.
 */
import type { Vec2 } from '../rig/skeleton';
import type { HandShape } from './frames';
import { MAT } from './palette';
import type { HdCanvas } from './raster';
import { boxed, inLocal, localEllipse, localOf, localRect, type Local } from './shapes';

/** Punho fechado: um bloco de cantos cortados. */
const fist = boxed(
  (f, u) => {
    if (Math.abs(f) > 2.4 || u < -0.4 || u > 4.3) return null;
    const corner = Math.abs(f) > 1.6 && (u > 3.5 || u < 0.4);
    return corner ? null : { x: 0, y: 0, z: 1 };
  },
  [-2.4, 2.4, -0.4, 4.3],
);

/** Mão aberta: a palma e os dedos juntos, com a ponta arredondada. */
const palm = boxed(
  (f, u) => {
    if (Math.abs(f) > 2.2 || u < -0.4 || u > 6.4) return null;
    const corner = Math.abs(f) > 1.3 && (u > 5.6 || u < 0.3);
    return corner ? null : { x: 0, y: 0, z: 1 };
  },
  [-2.2, 2.2, -0.4, 6.4],
);

interface Ctx {
  c: HdCanvas;
  hand: Local;
  part: number;
  /** Tom do bloco da mão (a mão de longe fica um tom abaixo). */
  base: number;
}

/** Punho: o bloco, a dobra dos dedos em sombra, os nós claros na ponta e o polegar cruzando por baixo. */
function paintFist({ c, hand, part, base }: Ctx): void {
  const on = { onlyOn: part };
  c.paint(inLocal(hand, fist), MAT.skin, part, { flat: base });
  c.paint(inLocal(hand, localRect(-2.4, 2.4, 2.1, 3.1)), MAT.skin, part, { ...on, flat: base - 1 });
  c.paint(inLocal(hand, localRect(0.4, 2.4, 3.3, 4.3)), MAT.skin, part, { ...on, flat: base + 1 });
  c.paint(inLocal(hand, localEllipse(1.6, 0.7, 1.4, 0.9)), MAT.skin, part, { flat: base });
  c.paint(inLocal(hand, localRect(0.4, 2.8, 1.4, 2.1)), MAT.skin, part, { ...on, flat: base - 1 });
}

/** Mão aberta: a palma, a linha da base dos dedos, a ponta dos dedos clara e o polegar aberto para o lado. */
function paintOpen({ c, hand, part, base }: Ctx): void {
  const on = { onlyOn: part };
  c.paint(inLocal(hand, palm), MAT.skin, part, { flat: base });
  c.paint(inLocal(hand, localEllipse(2.6, 1.8, 1, 1.7)), MAT.skin, part, { flat: base });
  c.paint(inLocal(hand, localRect(-2.2, 2.2, 2.6, 3.6)), MAT.skin, part, { ...on, flat: base - 1 });
  c.paint(inLocal(hand, localRect(-2.2, 2.2, 5.2, 6.4)), MAT.skin, part, { ...on, flat: base + 1 });
}

/** Selo: o punho com o indicador e o médio esticados juntos, a ponta clara. */
function paintSign(ctx: Ctx): void {
  paintFist(ctx);
  const { c, hand, part, base } = ctx;
  c.paint(inLocal(hand, localRect(-1.8, 0.4, 3.6, 8.2)), MAT.skin, part, { flat: base });
  c.paint(inLocal(hand, localRect(-1.8, 0.4, 7, 8.2)), MAT.skin, part, { onlyOn: part, flat: base + 1 });
  c.paint(inLocal(hand, localRect(-1.8, 0.4, 3.6, 4.6)), MAT.skin, part, { onlyOn: part, flat: base - 1 });
}

const PAINTERS: Record<HandShape, (ctx: Ctx) => void> = { fist: paintFist, open: paintOpen, sign: paintSign };

/** Pinta a mão na ponta do antebraço (do cotovelo ao pulso), na forma pedida. */
export function paintHand(c: HdCanvas, wrist: Vec2, elbow: Vec2, part: number, far: boolean, shape: HandShape): void {
  const len = Math.hypot(wrist.x - elbow.x, wrist.y - elbow.y) || 1;
  const hand = localOf(wrist, { x: (wrist.x - elbow.x) / len, y: (wrist.y - elbow.y) / len });
  PAINTERS[shape]({ c, hand, part, base: far ? 2 : 3 });
}
