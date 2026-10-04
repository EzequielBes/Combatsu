import { TECHNIQUES } from '../data/techniques';

interface CutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CutTarget {
  id: number;
  /** Corpo do alvo (inimigo ou chefe), fornecido pelo chamador — a física fica para a fase 5. */
  body: CutRect;
}

export interface CutHit {
  targetId: number;
  damage: number;
}

const CUT_TIMES = [0, 60, 120] as const; // CUT-02
const CUT_ANGLES_DEG = [20, -25, 70] as const; // CUT-05, na ordem dos cortes
const NEAR_PX = 60;
const FAR_PX = 180;
const HEIGHT_PX = 48;

/** Sobreposição de retângulos com bordas inclusas (fecha o "de 60 a 180 px", CUT-03: 59/60 e 180/181 px). */
function overlaps(a: CutRect, b: CutRect): boolean {
  return a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y;
}

/** CUT-03: retângulo do corte, de 60 a 180 px à frente do centro do player, 48 px de altura, centrado nele. */
function cutRect(playerCenter: { x: number; y: number }, facing: 1 | -1): CutRect {
  const width = FAR_PX - NEAR_PX;
  const x = facing === 1 ? playerCenter.x + NEAR_PX : playerCenter.x - FAR_PX;
  return { x, y: playerCenter.y - HEIGHT_PX / 2, width, height: HEIGHT_PX };
}

/** CUT-05: ângulos (graus, a partir da horizontal) dos 3 cortes, na ordem, espelhados se o player olha para a esquerda. */
export function cutAngles(facing: 1 | -1): readonly [number, number, number] {
  return CUT_ANGLES_DEG.map((deg) => (facing === 1 ? deg : -deg)) as [number, number, number];
}

/**
 * Agenda do Desmantelar (CUT-02, 03, 05): 3 cortes aos 0/60/120 ms depois de entrar em `release`, cada um
 * acertando quem estiver no retângulo de 60 a 180 px à frente do player. Não decide ângulo de desenho nem
 * física — só o relógio e a lista de quem é atingido. Sem `phaser` aqui.
 */
export class CutSchedule {
  private elapsedMs = 0;
  private readonly done: [boolean, boolean, boolean] = [false, false, false];

  /** CUT-02: avança o relógio desde a entrada em `release`; devolve os índices (0, 1, 2) dos cortes deste passo. */
  update(dtMs: number): number[] {
    const before = this.elapsedMs;
    this.elapsedMs += dtMs;
    const due: number[] = [];
    CUT_TIMES.forEach((t, i) => {
      if (!this.done[i] && before <= t && this.elapsedMs >= t) {
        this.done[i] = true;
        due.push(i);
      }
    });
    return due;
  }

  /** CUT-03: alvos cujo corpo sobrepõe o retângulo do corte, à frente do player. */
  targetsHit(playerCenter: { x: number; y: number }, facing: 1 | -1, targets: readonly CutTarget[]): CutHit[] {
    const rect = cutRect(playerCenter, facing);
    return targets
      .filter((t) => overlaps(rect, t.body))
      .map((t) => ({ targetId: t.id, damage: TECHNIQUES.corte.damage.cut }));
  }
}
