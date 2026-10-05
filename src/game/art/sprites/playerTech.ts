/**
 * Frames de conjuração do player (CAST-18/22): selo, carga, soltura e retorno de cada técnica, 32x24 texels,
 * compostos com as partes do boneco de papel de `sprites/player.ts` (AD-002) — o personagem continua o mesmo;
 * só o braço, a mão e a pose mudam por quadro. `kokusen-hit` é o quadro do soco do Punho Divergente quando vira
 * Kokusen (corpo mais inclinado que o `cross`).
 *
 * As 4 fases de toda técnica têm silhueta própria (aprovação de arte, ronda 2): `sign` recolhido e compacto,
 * `charge` com os joelhos flexionados e o corpo baixando (`drop` maior + pernas afundadas em `CHARGE_LEGS`),
 * `release` com o corpo projetado à frente (`lean` grande + pernas avançadas bem mais que o `sign`), `recover` a
 * meio caminho de volta ao `sign`. Direção de arte (spec.md, "Direção de arte" de cada técnica):
 * - Punho Divergente: punho puxado para trás no sign (o braço de trás quase some atrás do tronco, só a manga
 *   aparece — mais recolhido que o wind-up do `cross`), envolto em energia azul `c`/`C` tremulando no charge (o
 *   mesmo braço, agora com a cor trocada), soco mais esticado que o `cross` no release (19 texels; o `cross` tem
 *   16) e retorno no recover.
 * - Desmantelar: sign com dois dedos junto ao rosto (a mão sobe até a altura da bochecha, não fica à frente do
 *   quadril como as outras), charge trazendo a mão para a posição de corte, release com o braço cortando o ar
 *   na diagonal (cruzando o corpo, não mais um golpe reto) e recover.
 * - Vermelho: braço esticado à frente com indicador e médio apontados, tingidos de vermelho `r`/`R`; no charge a
 *   outra mão aparece por baixo do braço segurando o pulso (`WRIST_GRIP`), como apoio enquanto a esfera cresce.
 * - Azul: no sign e no charge a mão fica ERGUIDA acima da linha dos ombros (reusa `ARM_UP` de `player.ts` com a
 *   palma trocada pelo núcleo `c`/`d`); no release a mão desce e empurra a esfera à frente do peito.
 */
import { ART_SCALE } from '../palette';
import {
  ARM_COCK,
  ARM_GUARD,
  ARM_UP,
  HEAD_FOCUS,
  LEGS_WIDE,
  PLAYER_FRAME_H,
  PLAYER_FRAME_W,
  PLAYER_ORIGIN,
  Y_LEGS,
  armStraight,
  cropPart,
  far,
  pose,
  recolor,
  type Grid,
  type Placed,
} from './player';

/** Punho do Divergente envolto em energia azul (carga): mistura tremulante de `c`/`C` no lugar da pele do punho. */
const ARM_DIVERGENT_CHARGE: Grid = ['kkksNk', 'kCcNnk', 'kcCnk.', '.kkk..'];

/**
 * Braço esticado com dois dedos (indicador e médio) unidos na ponta, tingidos por `hi`/`fill` em vez do punho
 * fechado de `armStraight` — usado pelo Desmantelar (branco) e pela Vermelho (vermelho).
 */
function armPointed(len: number, hi: string, fill: string): string[] {
  const sleeve = len - 7;
  return [
    'k'.repeat(len - 1) + '.',
    'k' + 's'.repeat(sleeve) + `sk${hi}${hi}${fill}k`,
    'k' + 'N'.repeat(sleeve) + `sk${hi}${hi}${fill}k`,
    'k' + 'n'.repeat(sleeve) + 'NkPPxk',
    'k'.repeat(len - 1) + '.',
  ];
}

/** Mão de apoio segurando o pulso por baixo (Vermelho, charge): uma peça `far` própria, curta, colocada logo
 * abaixo da manga do braço esticado — mais simples e mais confiável que sobrepor o braço já pronto. */
export const WRIST_GRIP: Grid = ['.kkk.', 'kppPk', 'ksnNk', '.kkk.'];
/** Posição (x, y na área de desenho) da mão de apoio no `vermelho-charge`. */
export const WRIST_GRIP_AT = { x: 13, y: 13 } as const;

/**
 * Palma aberta à frente, dedos juntos, com um núcleo `core` entre eles em vez do punho fechado — usada pela
 * Azul no release (a esfera azul nasce nesse núcleo, fora do sprite, via `techFx`).
 */
function armPalm(len: number, core: string): string[] {
  const sleeve = len - 7;
  return [
    'k'.repeat(len - 1) + '.',
    'k' + 's'.repeat(sleeve) + `skp${core}pk`,
    'k' + 'N'.repeat(sleeve) + `skP${core}Pk`,
    'k' + 'n'.repeat(sleeve) + 'NkPPxk',
    'k'.repeat(len - 1) + '.',
  ];
}

/** Mão erguida acima da linha dos ombros (Azul, sign/charge): `ARM_UP` de `player.ts` com a palma trocada pelo
 * núcleo de energia. */
function armRaisedPalm(core: string): Grid {
  return recolor(ARM_UP, { p: core });
}

/** Dois dedos junto ao rosto (Desmantelar, sign): igual à `armPointed`, só mais curta, para caber perto da
 * bochecha em vez de à frente do quadril. */
function armFingersAtFace(hi: string, fill: string): string[] {
  return armPointed(8, hi, fill);
}

/** Corte diagonal cruzando o corpo (Desmantelar, release): uma lâmina de energia de 2 texels de espessura, com
 * contorno de 1 texel, subindo da base do quadril até acima do ombro oposto. */
function armDiagonalCut(hi: string): Grid {
  const size = 12;
  return Array.from({ length: size }, (_, y) => {
    const edge = size - 1 - y;
    return Array.from({ length: size }, (_, x) => {
      if (x === edge || x === edge - 1) return hi;
      if (x === edge + 1 || x === edge - 2) return 'k';
      return '.';
    }).join('');
  });
}

/** Pernas do "charge": mesma base do `LEGS_WIDE`, afundada 1 texel (joelhos flexionados, corpo baixando junto
 * com o `drop` maior da cabeça/tronco). */
const CHARGE_LEGS: Placed = cropPart([LEGS_WIDE, 0, Y_LEGS + 1], { bottom: 1 });

/** Pernas do "release": o mesmo `LEGS_WIDE` do `sign`/`recover`, mas empurrado bem mais à frente (o avanço do
 * golpe, igual ao `cross-hit`/`kick-hit` de `player.ts`) — a perna de trás fica visivelmente para trás do
 * quadril projetado, esticada pela distância percorrida. */
function releaseLegs(shift: number): Placed[] {
  return [[LEGS_WIDE, shift, Y_LEGS]];
}

export const PLAYER_TECH_FRAMES: Record<string, readonly string[]> = {
  // Punho Divergente (DIV-*): mesma mecânica do cross (braço de trás), com energia azul na carga.
  'divergente-sign': pose({
    lean: -1,
    head: HEAD_FOCUS,
    near: [ARM_GUARD, 8, 11],
    far: [far(ARM_COCK), 1, 12],
    legs: [[LEGS_WIDE, 0, Y_LEGS]],
  }),
  'divergente-charge': pose({
    lean: -1,
    drop: 2,
    head: HEAD_FOCUS,
    near: [ARM_GUARD, 8, 13],
    far: [far(ARM_DIVERGENT_CHARGE), 1, 12],
    legs: [CHARGE_LEGS],
  }),
  'divergente-release': pose({
    lean: 5,
    head: HEAD_FOCUS,
    near: [ARM_GUARD, 10, 13],
    far: [far(armStraight(19)), 10, 11],
    legs: releaseLegs(3),
  }),
  'divergente-recover': pose({
    lean: 1,
    head: HEAD_FOCUS,
    near: [ARM_GUARD, 8, 11],
    far: [far(armStraight(10)), 9, 11],
    legs: [[LEGS_WIDE, 0, Y_LEGS]],
  }),

  // Desmantelar (CUT-*): dois dedos junto ao rosto no sign, corte diagonal cruzando o corpo no release.
  'corte-sign': pose({
    lean: -2,
    head: HEAD_FOCUS,
    near: [armFingersAtFace('W', 'w'), 10, 4],
    far: [far(ARM_GUARD), 8, 11],
    legs: [[LEGS_WIDE, 0, Y_LEGS]],
  }),
  'corte-charge': pose({
    lean: 0,
    drop: 2,
    head: HEAD_FOCUS,
    near: [armPointed(11, 'W', 'w'), 9, 9],
    far: [far(ARM_GUARD), 8, 12],
    legs: [CHARGE_LEGS],
  }),
  'corte-release': pose({
    lean: 2,
    head: HEAD_FOCUS,
    near: [armDiagonalCut('W'), 2, 8],
    far: [far(ARM_GUARD), 9, 12],
    legs: releaseLegs(2),
  }),
  'corte-recover': pose({
    lean: 1,
    head: HEAD_FOCUS,
    near: [armPointed(10, 'W', 'w'), 9, 11],
    far: [far(ARM_GUARD), 8, 11],
    legs: [[LEGS_WIDE, 0, Y_LEGS]],
  }),

  // Vermelho (RED-*): braço esticado à frente com indicador e médio apontados, tingidos de vermelho.
  'vermelho-sign': pose({
    lean: -2,
    head: HEAD_FOCUS,
    near: [armPointed(11, 'R', 'r'), 9, 11],
    far: [far(ARM_GUARD), 8, 11],
    legs: [[LEGS_WIDE, 0, Y_LEGS]],
  }),
  'vermelho-charge': pose({
    lean: 0,
    drop: 2,
    head: HEAD_FOCUS,
    near: [armPointed(14, 'R', 'r'), 9, 9],
    // Braço de trás: a mão de apoio passa pelo `far()` para não ficar na pele clara (`p`) do braço da frente.
    far: [far(WRIST_GRIP), WRIST_GRIP_AT.x, WRIST_GRIP_AT.y],
    legs: [CHARGE_LEGS],
  }),
  // A soltura empurra o player para trás (RED-15): lean e pernas recuam em vez de avançar.
  'vermelho-release': pose({
    lean: -2,
    head: HEAD_FOCUS,
    near: [armPointed(17, 'R', 'r'), 9, 11],
    far: [far(ARM_GUARD), 8, 11],
    legs: [cropPart([LEGS_WIDE, -1, Y_LEGS], { left: 1 })],
  }),
  'vermelho-recover': pose({
    lean: -1,
    head: HEAD_FOCUS,
    near: [armPointed(9, 'R', 'r'), 9, 13],
    far: [far(ARM_GUARD), 8, 11],
    legs: [[LEGS_WIDE, 0, Y_LEGS]],
  }),

  // Azul (BLU-*): mão erguida acima da linha dos ombros no sign/charge; desce e empurra a esfera no release.
  'azul-sign': pose({
    lean: -1,
    head: HEAD_FOCUS,
    near: [armRaisedPalm('c'), 11, 3],
    far: [far(ARM_GUARD), 8, 11],
    legs: [[LEGS_WIDE, 0, Y_LEGS]],
  }),
  'azul-charge': pose({
    lean: -1,
    drop: 2,
    head: HEAD_FOCUS,
    near: [armRaisedPalm('d'), 11, 3],
    far: [far(ARM_GUARD), 8, 12],
    legs: [CHARGE_LEGS],
  }),
  'azul-release': pose({
    lean: 2,
    head: HEAD_FOCUS,
    near: [armPalm(14, 'd'), 9, 9],
    far: [far(ARM_GUARD), 8, 11],
    legs: releaseLegs(1),
  }),
  'azul-recover': pose({
    lean: 0,
    head: HEAD_FOCUS,
    near: [armPalm(10, 'c'), 9, 9],
    far: [far(ARM_GUARD), 8, 11],
    legs: [[LEGS_WIDE, 0, Y_LEGS]],
  }),

  // Kokusen (KOK-*): mesmo soco do cross, corpo mais inclinado (o congelamento do Black Flash).
  'kokusen-hit': pose({
    lean: 5,
    head: HEAD_FOCUS,
    near: [ARM_GUARD, 10, 13],
    far: [far(armStraight(16)), 11, 11],
    legs: [[LEGS_WIDE, 3, Y_LEGS]],
  }),
};

/**
 * Ponta dos dedos do Vermelho (RDA-04): em `vermelho-sign|charge|release`, o pixel `R` de maior coluna do frame
 * (os dedos já são pintados de `R`/`r`); com empate de coluna vale o mais alto. `col`/`row` são texels do frame.
 */
export function redFingertip(frameName: string): { col: number; row: number } {
  const rows = PLAYER_TECH_FRAMES[frameName];
  if (!rows || !/^vermelho-(sign|charge|release)$/.test(frameName)) {
    throw new Error(`redFingertip: '${frameName}' não é um frame sign/charge/release do Vermelho`);
  }
  let tip: { col: number; row: number } | null = null;
  rows.forEach((line, row) =>
    [...line].forEach((ch, col) => {
      if (ch === 'R' && (tip === null || col > tip.col)) tip = { col, row };
    }),
  );
  if (!tip) throw new Error(`redFingertip: '${frameName}' não tem pixel R`);
  return tip;
}

/**
 * Deslocamento em px de mundo da ponta dos dedos em relação à origem do sprite (pé, centro do corpo), espelhado
 * em x por `facing` (RDA-04): `x = (col − colunaDaOrigem)·ART_SCALE·facing`, `y = (row − altura)·ART_SCALE`.
 */
export function fingertipOffsetPx(frameName: string, facing: 1 | -1): { x: number; y: number } {
  const { col, row } = redFingertip(frameName);
  const originCol = PLAYER_ORIGIN.x * PLAYER_FRAME_W;
  return { x: (col - originCol) * ART_SCALE * facing, y: (row - PLAYER_FRAME_H) * ART_SCALE };
}
