/*
 * Quadros intermediários do boneco: interpola duas poses pelo menor arco de cada ângulo. Puro, sem `phaser`.
 */
import { BONES, clonePose, type Pose } from './skeleton';

/** Diferença de `from` até `to` pelo menor arco, em (-180, 180]. */
export function shortestArc(from: number, to: number): number {
  const d = (((to - from) % 360) + 540) % 360 - 180;
  return d === -180 ? 180 : d;
}

/**
 * Interpola `a` e `b` em `t`. Com t = 0 devolve `a` e com t = 1 devolve `b`, exatamente; fora de [0, 1] extrapola (o
 * overshoot do golpe passa de 1). A raiz interpola em linha reta e cada ângulo pelo menor arco.
 */
export function inbetween(a: Pose, b: Pose, t: number): Pose {
  if (t === 0) return clonePose(a);
  if (t === 1) return clonePose(b);
  const out: Pose = { root: { x: a.root.x + (b.root.x - a.root.x) * t, y: a.root.y + (b.root.y - a.root.y) * t }, angles: { ...a.angles } };
  if (a.body) out.body = a.body;
  const sa = a.armScale ?? 1;
  const sb = b.armScale ?? 1;
  if (a.armScale !== undefined || b.armScale !== undefined) out.armScale = sa + (sb - sa) * t;
  for (const { name } of BONES) out.angles[name] = a.angles[name] + shortestArc(a.angles[name], b.angles[name]) * t;
  return out;
}

/** Easing: arranca devagar e termina devagar. */
export const easeInOutCubic = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
/** Easing: acelera até o fim (o soco dispara). */
export const easeInCubic = (t: number): number => t * t * t;
/** Easing: chega passando do alvo e volta (overshoot); `s` = 1.70158 é o clássico, ~10% de passada. */
export const easeOutBack = (t: number, s = 1.70158): number => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2;
