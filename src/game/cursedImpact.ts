/*
 * Desenho do impacto de energia amaldiçoada (IMP-07..09), quadro a quadro num `Graphics`: lampejo em estrela no ponto
 * de contato, onda de choque fina que se parte, riscos de energia que voam para fora e o jato na direção do golpe.
 * O quadro `p = 0` fica parado na tela durante o hitstop inteiro, então ele sozinho precisa ler como o impacto.
 * Cores só da energia amaldiçoada (TRL-06) e vértices na grade de arte (AD-009).
 */
import type Phaser from 'phaser';
import type { Vec2 } from '../core/hit';
import type { Spike } from '../core/impactTier';
import { IMPACT_FEEL } from '../data/feel';
import { PALETTE } from './art/palette';
import { pts } from './points';

type Gfx = Phaser.GameObjects.Graphics;

export interface ImpactShape {
  /** Centro do contato, já na grade. */
  cx: number;
  cy: number;
  /** Direção do golpe (para onde o alvo é empurrado), em radianos. */
  dirAngle: number;
  /** Arredonda para a grade de arte. */
  snap: (v: number) => number;
  /** Passo da grade em px de mundo. */
  grid: number;
  /** Cores do desenho; sem isto, as da energia amaldiçoada. */
  tone?: ImpactTone;
}

/** Cores de um impacto: sombra por baixo, corpo e miolo claro, e o par alternado de alguns riscos. */
export interface ImpactTone {
  shadow: number;
  body: number;
  core: number;
  altBody: number;
  altCore: number;
}

/** Energia amaldiçoada (TRL-06): azul com miolo ciano, riscos alternados em roxo. */
export const CURSED_TONE: ImpactTone = {
  shadow: PALETTE.d!,
  body: PALETTE.c!,
  core: PALETTE.C!,
  altBody: PALETTE.u!,
  altCore: PALETTE.U!,
};

const toneOf = (s: ImpactShape): ImpactTone => s.tone ?? CURSED_TONE;

const easeOut = (p: number): number => 1 - (1 - p) * (1 - p);

/**
 * Agulha de energia ao longo de `ang`, de `from` a `to` px do centro: um losango fino com o bojo perto da cauda e a
 * ponta afiada na frente, com o miolo claro por dentro.
 */
function needle(g: Gfx, s: ImpactShape, ang: number, from: number, to: number, half: number, alt = false): void {
  if (to - from < s.grid * 2) return;
  const tone = toneOf(s);
  const cos = Math.cos(ang);
  const sin = Math.sin(ang);
  const at = (r: number, h: number): Vec2 => ({
    x: s.snap(s.cx + cos * r - sin * h),
    y: s.snap(s.cy + sin * r + cos * h),
  });
  const belly = from + (to - from) * 0.3;
  g.fillStyle(alt ? tone.altBody : tone.body, 1).fillPoints(
    pts([at(from, 0), at(belly, half), at(to, 0), at(belly, -half)]),
    true,
  );
  const inner = half * 0.45;
  if (inner < s.grid * 0.5) return;
  g.fillStyle(alt ? tone.altCore : tone.core, 1).fillPoints(
    pts([at(from + 2, 0), at(belly, inner), at(to - 3, 0), at(belly, -inner)]),
    true,
  );
}

/**
 * Lampejo em estrela de quatro pontas: o eixo longo atravessa o golpe (perpendicular à direção) e o curto segue a
 * direção, como o brilho de contato dos quadros de impacto do anime. `size` é o meio comprimento do eixo longo.
 */
function starFlash(g: Gfx, s: ImpactShape, size: number): void {
  // Abaixo disso a estrela vira um borrão escuro (só a sombra aparece): some de uma vez.
  if (size < 5) return;
  const across = s.dirAngle + Math.PI / 2;
  const tone = toneOf(s);
  const arm = (ang: number, len: number, half: number, color: number): void => {
    const cos = Math.cos(ang);
    const sin = Math.sin(ang);
    const at = (r: number, h: number): Vec2 => ({
      x: s.snap(s.cx + cos * r - sin * h),
      y: s.snap(s.cy + sin * r + cos * h),
    });
    g.fillStyle(color, 1).fillPoints(pts([at(-len, 0), at(0, half), at(len, 0), at(0, -half)]), true);
  };
  const half = Math.max(s.grid, size * 0.2);
  // Sombra azul-profunda por baixo: segura a leitura sobre o flash claro do inimigo.
  arm(across, size + 2, half + 2, tone.shadow);
  arm(s.dirAngle, size * 0.55 + 2, half + 2, tone.shadow);
  arm(across, size, half, tone.body);
  arm(s.dirAngle, size * 0.55, half, tone.body);
  arm(across, size * 0.72, half * 0.5, tone.core);
  arm(s.dirAngle, size * 0.36, half * 0.5, tone.core);
}

/** Onda de choque: anel fino que, depois da metade, se parte em arcos (a onda se desfazendo). */
function shockwave(g: Gfx, s: ImpactShape, r: number, p: number, color: number, phase: number): void {
  const thick = p < 0.35 ? s.grid * 2 : s.grid;
  g.lineStyle(thick, color, 1);
  if (p < 0.45) {
    g.strokeCircle(s.cx, s.cy, r);
    return;
  }
  // Três arcos com vãos que crescem com `p`.
  const gap = 0.25 + (p - 0.45) * 1.3;
  for (let i = 0; i < 3; i++) {
    const a0 = phase + (i * Math.PI * 2) / 3 + gap / 2;
    const a1 = phase + ((i + 1) * Math.PI * 2) / 3 - gap / 2;
    if (a1 <= a0) continue;
    g.beginPath();
    g.arc(s.cx, s.cy, r, a0, a1);
    g.strokePath();
  }
}

/**
 * Impacto forte e decisivo no progresso `p` (0 a 1). Lampejo grande no contato, riscos radiais (os `spikes` do seed)
 * que se soltam do centro, jato de três riscos longos na direção do golpe e a onda de choque de `ringFromPx` a
 * `ringToPx`. O decisivo é maior e ganha uma segunda onda roxa atrasada.
 */
export function drawHeavyImpact(g: Gfx, s: ImpactShape, spikes: readonly Spike[], decisive: boolean, p: number): void {
  const k = decisive ? 1.35 : 1;
  const e = easeOut(p);
  g.clear();
  // Riscos radiais: a ponta corre até o comprimento sorteado e a cauda vem atrás, soltando o risco do centro.
  spikes.forEach((sp, i) => {
    const tip = 8 + sp.length * k * (0.45 + 0.75 * e);
    const tail = 5 + sp.length * k * e * 0.9;
    needle(g, s, sp.angle, tail, tip, 2.5 * (1 - p * 0.6), i % 2 === 1);
  });
  // Jato na direção do golpe: a energia que atravessa o alvo.
  [-0.3, 0, 0.26].forEach((off, i) => {
    const reach = (i === 1 ? 46 : 34) * k;
    needle(g, s, s.dirAngle + off, 6 + reach * e * 0.8, 12 + reach * (0.5 + 0.7 * e), 3 * (1 - p * 0.5), i === 2);
  });
  if (p > 0.06) {
    const r = (IMPACT_FEEL.ringFromPx + (IMPACT_FEEL.ringToPx - IMPACT_FEEL.ringFromPx) * e) * k;
    shockwave(g, s, r, p, p < 0.35 ? CURSED_TONE.core : CURSED_TONE.body, s.dirAngle);
    if (decisive && p > 0.25) shockwave(g, s, r * 0.62, p, CURSED_TONE.altBody, s.dirAngle + 1);
  }
  // O lampejo nasce cheio (é ele que fica parado no hitstop) e fecha rápido.
  starFlash(g, s, (decisive ? 26 : 18) * Math.max(0, 1 - p * 2.2));
  g.setAlpha(p < 0.55 ? 1 : 1 - (p - 0.55) / 0.45);
}

/**
 * Impacto leve no progresso `p`: lampejo pequeno e `angles.length` agulhas num cone em volta da direção do golpe,
 * cada uma voando até a sua distância.
 */
export function drawLightImpact(
  g: Gfx,
  s: ImpactShape,
  shards: readonly { angle: number; dist: number }[],
  p: number,
): void {
  const e = easeOut(p);
  g.clear();
  shards.forEach((sh, i) => {
    const tip = 7 + sh.dist * (0.25 + 0.75 * e);
    const tail = 3 + sh.dist * e * 0.85;
    needle(g, s, sh.angle, tail, tip, 2 * (1 - p * 0.5), i % 3 === 2);
  });
  starFlash(g, s, 10 * Math.max(0, 1 - p * 2.4));
  g.setAlpha(p < 0.5 ? 1 : 1 - (p - 0.5) / 0.5);
}

/**
 * Faísca de contato sem direção (golpe de técnica, de objeto, guarda, parry e os golpes que o jogador recebe): o mesmo
 * lampejo em estrela, de meio eixo `size`, com `rays` agulhas em volta que voam até a sua distância.
 */
export function drawSpark(
  g: Gfx,
  s: ImpactShape,
  rays: readonly { angle: number; dist: number }[],
  size: number,
  p: number,
): void {
  const e = easeOut(p);
  g.clear();
  rays.forEach((r, i) => {
    needle(g, s, r.angle, 4 + r.dist * e * 0.85, 8 + r.dist * (0.3 + 0.7 * e), 2 * (1 - p * 0.5), i % 2 === 1);
  });
  starFlash(g, s, size * Math.max(0, 1 - p * 1.8));
  g.setAlpha(p < 0.5 ? 1 : 1 - (p - 0.5) / 0.5);
}
