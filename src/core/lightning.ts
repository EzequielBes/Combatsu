import { Rng } from './rng';

export interface Vec2i {
  x: number;
  y: number;
}

export interface Bolt {
  /** Vértices absolutos (origem incluída como o 1º); cada um a uma distância par da origem (KOK-19, TFX-02). */
  vertices: Vec2i[];
}

const MIN_BOLTS = 5;
const MAX_BOLTS = 8;
const MIN_SEG = 6;
const MAX_SEG = 14;
const MIN_TOTAL = 40;
const MAX_TOTAL = 110;
const FAN_RAD = (70 * Math.PI) / 180;
const ZIGZAG_RAD = (25 * Math.PI) / 180;

/**
 * Passos pares (múltiplos de 2 em x e y) com comprimento entre `MIN_SEG` e `MAX_SEG`: uma grade fixa de
 * candidatos, calculada uma vez, sem aleatoriedade — o raio escolhe entre eles com o `Rng` (KOK-19, TFX-02: os
 * vértices ficam sempre em coordenadas inteiras pares em relação à origem, porque cada passo já é um par de
 * inteiros pares e a soma de inteiros pares é sempre um inteiro par).
 */
const STEP_CANDIDATES: ReadonlyArray<{ dx: number; dy: number; angle: number }> = (() => {
  const steps: Array<{ dx: number; dy: number; angle: number }> = [];
  for (let dx = -MAX_SEG; dx <= MAX_SEG; dx += 2) {
    for (let dy = -MAX_SEG; dy <= MAX_SEG; dy += 2) {
      if (dx === 0 && dy === 0) continue;
      const len = Math.hypot(dx, dy);
      if (len >= MIN_SEG && len <= MAX_SEG) steps.push({ dx, dy, angle: Math.atan2(dy, dx) });
    }
  }
  return steps;
})();

function angleDiff(a: number, b: number): number {
  let d = Math.abs(a - b) % (2 * Math.PI);
  if (d > Math.PI) d = 2 * Math.PI - d;
  return d;
}

/** Passo (par, 6–14 px) cujo ângulo fica mais perto de `wanted`, entre os candidatos mais próximos, sorteado pelo `rng`. */
function pickStep(rng: Rng, wanted: number): { dx: number; dy: number } {
  const sorted = [...STEP_CANDIDATES].sort((a, b) => angleDiff(a.angle, wanted) - angleDiff(b.angle, wanted));
  const pool = sorted.slice(0, 6); // os 6 mais alinhados: dá variedade sem fugir da direção pedida
  const pick = pool[rng.int(0, pool.length - 1)];
  return { dx: pick.dx, dy: pick.dy };
}

/**
 * Um raio em zigue-zague ao redor de `boltAngle`: soma sempre entre 40 e 110 px (KOK-33), porque só continua
 * enquanto ainda não chegou a 40, ou enquanto está a 96 px ou menos (o próximo passo, no máximo 14 px, nunca
 * ultrapassa 110).
 */
function buildBolt(rng: Rng, boltAngle: number): Bolt {
  const vertices: Vec2i[] = [{ x: 0, y: 0 }];
  let x = 0;
  let y = 0;
  let total = 0;
  while (total < MIN_TOTAL || (total <= MAX_TOTAL - MAX_SEG && rng.chance(0.5))) {
    const deviation = (rng.next() * 2 - 1) * ZIGZAG_RAD;
    const step = pickStep(rng, boltAngle + deviation);
    x += step.dx;
    y += step.dy;
    total += Math.hypot(step.dx, step.dy);
    vertices.push({ x, y });
  }
  return { vertices };
}

/**
 * Raios pretos do Kokusen (KOK-18..21, 33, TFX-02): 5 a 8 raios em zigue-zague num leque de ~±70° em torno de
 * `dir`, cada um com 40 a 110 px de comprimento total, vértices em coordenadas inteiras pares relativas a
 * `origin`, determinísticos pela `seed` (mesma seed, origem e direção sempre devolvem os mesmos raios). Não
 * decide desenho nem cor — só a geometria. Sem `phaser` aqui.
 */
export function lightningBolts(seed: number, origin: Vec2i, dir: Vec2i): Bolt[] {
  const rng = new Rng(seed);
  const baseAngle = Math.atan2(dir.y, dir.x);
  const boltCount = rng.int(MIN_BOLTS, MAX_BOLTS);
  const bolts: Bolt[] = [];
  for (let i = 0; i < boltCount; i++) {
    const fan = (rng.next() * 2 - 1) * FAN_RAD;
    const bolt = buildBolt(rng, baseAngle + fan);
    bolts.push({ vertices: bolt.vertices.map((v) => ({ x: origin.x + v.x, y: origin.y + v.y })) });
  }
  return bolts;
}
