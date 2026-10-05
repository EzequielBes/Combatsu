/*
 * Defesa e reação do player HD: guarda, parry, esquiva, abaixar, dano e atordoamento. Cada estado tem uma silhueta
 * própria, porque o jogador decide o que fazer olhando para ela: a guarda é fechada e alta, o parry abre uma mão para
 * fora, a esquiva e o abaixar encolhem o corpo, o dano joga o tronco para trás e o atordoamento solta os braços.
 */
import type { HdFamily, HdFrameSpec } from '../frames';
import type { Kit } from '../kit';

type Frames = Record<string, HdFrameSpec>;

/** Os pés da guarda do idle: de onde tudo parte e para onde tudo volta. */
function feet(k: Kit) {
  return {
    legNear: { ankle: { x: k.cx + k.stance.near, y: k.g }, foot: 90 },
    legFar: { ankle: { x: k.cx + k.stance.far, y: k.g }, foot: 90 },
  };
}

/** Guarda levantada e parry: o bloqueio fechado e a deflexão de mão aberta. */
function blockFrames(k: Kit): Frames {
  return {
    // Bloqueio: peso atrás, ombro de perto adiantado, o antebraço de perto em pé na frente do rosto e o de longe
    // empilhado embaixo, cobrindo o tronco; mãos abertas.
    guard: {
      pose: k.pose({
        hip: { x: k.cx - 4.5, y: k.hy + 7 },
        spine: 179,
        neck: 2,
        shoulderNear: -60,
        armNear: { to: k.at(8, 44.5), bend: -1 },
        armFar: { to: k.at(9.5, 34), bend: -1 },
        ...feet(k),
      }),
      hands: { near: 'open', far: 'open' },
    },
    // Parry: um tapa curto e seco na altura do rosto, com a palma varrendo o golpe para fora; o punho de trás fica
    // no queixo, armado para o Contra (que parte desta pose).
    parry: {
      pose: k.pose({
        hip: { x: k.cx + 2, y: k.hy + 3.6 },
        spine: 172,
        neck: 8,
        shoulderNear: -60,
        armNear: { to: k.at(18.5, 44), bend: -1 },
        armFar: { rel: { x: k.arm * 0.4, y: -k.arm * 0.02 }, bend: -1 },
        legNear: feet(k).legNear,
        legFar: { ankle: { x: k.cx + k.stance.far, y: k.g - 1 }, foot: 68 },
      }),
      hands: { near: 'palm' },
    },
  };
}

/** Esquiva com dash e abaixar: o corpo encolhe para sair da linha do golpe. */
function evadeFrames(k: Kit): Frames {
  return {
    // Primeira metade do dash: corpo baixo e projetado, a perna de trás empurra na ponta do pé.
    'dodge-0': {
      pose: k.pose({
        hip: { x: k.cx + 3, y: k.hy + 9 },
        spine: 142,
        neck: 16,
        armNear: { rel: { x: 6, y: 6 }, bend: -1 },
        armFar: { rel: { x: 8, y: 1 }, bend: -1 },
        legNear: { ankle: { x: k.cx + 11, y: k.g }, foot: 90 },
        legFar: { ankle: { x: k.cx - 11, y: k.g - 5 }, foot: 35 },
      }),
    },
    // Metade final: freia com a perna da frente esticada à frente, o tronco volta e as mãos sobem para a guarda.
    'dodge-1': {
      pose: k.pose({
        hip: { x: k.cx - 2.5, y: k.hy + 8 },
        spine: 164,
        neck: 12,
        armNear: { rel: { x: 9, y: 3 }, bend: -1 },
        armFar: { rel: { x: 7, y: -2 }, bend: -1 },
        legNear: { ankle: { x: k.cx + 14, y: k.g }, foot: 100 },
        legFar: { ankle: { x: k.cx - 9, y: k.g }, foot: 90 },
      }),
    },
    // Abaixar: agachamento fundo sobre a ponta do pé de trás (o joelho não toca o chão), antebraços à frente da cabeça.
    duck: {
      pose: k.pose({
        hip: { x: k.cx - 2.5, y: k.hy + 12 },
        spine: 156,
        neck: 16,
        armNear: { rel: { x: 15.5, y: -5 }, bend: -1 },
        armFar: { rel: { x: 13.5, y: 0.5 }, bend: -1 },
        legNear: { ankle: { x: k.cx + k.stance.near + 2, y: k.g }, foot: 90 },
        legFar: { ankle: { x: k.cx + k.stance.far + 3.5, y: k.g - 2.5 }, foot: 50 },
      }),
    },
  };
}

/** Levar um golpe: o impacto (90 ms) e a recuperação cambaleando (220 ms). */
function hurtFrames(k: Kit): Frames {
  return {
    hurt: {
      pose: k.pose({
        hip: { x: k.cx - 4.5, y: k.hy + 3 },
        spine: 202,
        neck: 14,
        armNear: { rel: { x: 12, y: 5 }, bend: -1 },
        armFar: { rel: { x: 10, y: -3 }, bend: -1 },
        legNear: { ankle: { x: k.cx + k.stance.near, y: k.g - 1.5 }, foot: 110 },
        legFar: { ankle: { x: k.cx + k.stance.far - 3, y: k.g }, foot: 90 },
      }),
      expr: 'pain',
      hands: { near: 'relaxed', far: 'relaxed' },
    },
    'hurt-1': {
      pose: k.pose({
        hip: { x: k.cx - 6, y: k.hy + 6.5 },
        spine: 160,
        neck: -8,
        armNear: { rel: { x: 4, y: 14 }, bend: -1 },
        armFar: { rel: { x: 8, y: 8 }, bend: -1 },
        legNear: { ankle: { x: k.cx + k.stance.near - 2, y: k.g }, foot: 90 },
        legFar: { ankle: { x: k.cx + k.stance.far - 7, y: k.g - 1.5 }, foot: 62 },
      }),
      expr: 'pain',
      hands: { near: 'relaxed', far: 'relaxed' },
    },
  };
}

/** Guarda quebrada: joelhos cedendo, braços caídos e a cabeça balançando para trás e para a frente. */
function stunnedFrames(k: Kit): Frames {
  return {
    'stunned-0': {
      pose: k.pose({
        hip: { x: k.cx - 2.5, y: k.hy + 8 },
        spine: 186,
        neck: 14,
        armNear: { rel: { x: 2, y: 17 }, bend: -1 },
        armFar: { rel: { x: -4, y: 16.5 }, bend: -1 },
        legNear: { ankle: { x: k.cx + k.stance.near + 2, y: k.g }, foot: 90 },
        legFar: { ankle: { x: k.cx + k.stance.far - 1, y: k.g }, foot: 90 },
      }),
      expr: 'pain',
      hands: { near: 'relaxed', far: 'relaxed' },
    },
    'stunned-1': {
      pose: k.pose({
        hip: { x: k.cx - 0.5, y: k.hy + 9 },
        spine: 172,
        neck: -16,
        armNear: { rel: { x: 4, y: 17 }, bend: -1 },
        armFar: { rel: { x: 7, y: 16 }, bend: -1 },
        legNear: { ankle: { x: k.cx + k.stance.near + 2, y: k.g }, foot: 90 },
        legFar: { ankle: { x: k.cx + k.stance.far - 1, y: k.g }, foot: 90 },
      }),
      expr: 'pain',
      hands: { near: 'relaxed', far: 'relaxed' },
    },
  };
}

export function defenseFamily(k: Kit): HdFamily {
  return { frames: { ...blockFrames(k), ...evadeFrames(k), ...hurtFrames(k), ...stunnedFrames(k) } };
}
