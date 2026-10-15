/*
 * Mãos dos ícones HD: o punho fechado (Punho Divergente) e a mão aberta de palma para a frente (Boogie Woogie,
 * Amplificação de Domínio), no espaço 0 a 1 e com o chanfro da luz única dos ícones. Puro, sem `phaser`.
 */
import { bevelInk, type IconCanvas, type Ink } from './canvas';
import { box, circle, rotate, stroke, union, type Sdf } from './sdf';

/**
 * Punho fechado visto de frente, com os quatro dedos dobrados em cima e o polegar atravessado embaixo; centro em
 * (cx, cy), largura `s`. A pele é `[linha, sombra, base, luz]`. No ícone pequeno os dedos são só três riscos.
 * `ang` gira o punho em volta do centro (radianos, horário na tela); a luz continua de cima e da esquerda.
 */
export function fist(c: IconCanvas, cx: number, cy: number, s: number, skin: readonly string[], ang = 0): void {
  const [line, lo, base, hi] = skin;
  const p = c.px;
  const turn = (shape: Sdf): Sdf => (ang ? rotate(shape, cx, cy, ang) : shape);
  const fw = s / 4;
  const small = c.size < 32;
  // No pequeno, os nós dos dedos saem na silhueta (quatro calombos em cima): o risco interno sozinho lia como pão.
  const knuckles = [0, 1, 2, 3].map((k) => circle(cx - s * 0.5 + fw * (k + 0.5), cy - s * 0.36, fw * 0.55));
  const hand = turn(
    union(
      box(cx, cy, s * 0.5, s * 0.42, s * 0.18),
      circle(cx - s * 0.48, cy + s * 0.08, s * 0.14),
      ...(small ? knuckles : []),
    ),
  );
  c.fill(hand, bevelInk(hand, p, base, hi, lo), { line });
  if (small) {
    for (let k = 1; k < 4; k++) c.fill(turn(box(cx - s * 0.5 + fw * k, cy - s * 0.26, p * 0.5, s * 0.14)), line);
  } else {
    for (let k = 0; k < 4; k++) {
      const finger = turn(box(cx - s * 0.5 + fw * (k + 0.5), cy - s * 0.17, fw / 2, s * 0.25, fw * 0.45));
      c.fill(finger, bevelInk(finger, p, base, hi, lo), { line });
    }
  }
  const thumb = turn(box(cx - s * 0.1, cy + s * 0.2, s * 0.38, s * 0.11, s * 0.11));
  c.fill(thumb, bevelInk(thumb, p, base, hi, lo), { line });
}

/**
 * Mão aberta, palma para a frente e dedos para cima, com o polegar aberto para a esquerda; centro da palma em
 * (cx, cy), largura da palma `s`. Devolve a silhueta inteira, para quem quiser contornar a mão.
 */
export function palmShape(cx: number, cy: number, s: number): { palm: Sdf; fingers: Sdf[]; thumb: Sdf } {
  const palm = box(cx, cy, s * 0.5, s * 0.46, s * 0.2);
  const fw = s / 4;
  const lens = [0.5, 0.64, 0.6, 0.46];
  const fingers = lens.map((len, k) => {
    const fx = cx - s * 0.5 + fw * (k + 0.5);
    const top = cy - s * 0.3 - s * len;
    return stroke(fx, cy - s * 0.2, fx + (k - 1.5) * s * 0.035, top, fw * 0.52);
  });
  const thumb = rotate(
    stroke(cx - s * 0.5, cy + s * 0.2, cx - s * 0.5, cy - s * 0.45, fw * 0.5),
    cx - s * 0.5,
    cy + s * 0.2,
    -0.55,
  );
  return { palm, fingers, thumb };
}

/**
 * Desenha a mão aberta com a tinta dada (o padrão é o chanfro da pele `[linha, sombra, base, luz]`). No ícone
 * pequeno a mão é uma silhueta só, sem linha por dedo (a linha de 1 texel comeria o dedo), com os vãos em riscos.
 */
export function palm(c: IconCanvas, cx: number, cy: number, s: number, skin: readonly string[], ink?: Ink): void {
  const [line, lo, base, hi] = skin;
  const { palm: body, fingers, thumb } = palmShape(cx, cy, s);
  if (c.size < 32) {
    const all = union(body, thumb, ...fingers);
    c.fill(all, ink ?? bevelInk(all, c.px, base, hi, lo, 1));
    const fw = s / 4;
    for (let k = 1; k < 4; k++) {
      const x = cx - s * 0.5 + fw * k + (k - 2) * s * 0.02;
      c.fill(stroke(x, cy - s * 0.25, x + (k - 2) * s * 0.03, cy - s * 0.75, c.px * 0.5), line);
    }
    return;
  }
  const paint = (shape: Sdf): void => c.fill(shape, ink ?? bevelInk(shape, c.px, base, hi, lo), { line });
  paint(thumb);
  for (const f of fingers) paint(f);
  paint(body);
  c.fill(stroke(cx - s * 0.18, cy + s * 0.1, cx + s * 0.25, cy - s * 0.05, c.px * 0.5), lo);
}
