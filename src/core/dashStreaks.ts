/**
 * Linhas de velocidade da esquiva (DGA-02, AD-009): riscos horizontais ao longo do caminho do dash, em alturas
 * espalhadas pelo corpo, como os quadros de movimento rápido de Jujutsu Kaisen. Função pura de uma seed, com tudo na
 * grade de 2 px; o `DodgeFx` só desenha e anima.
 */
import { snap2 } from './blueVortex';

export interface DashStreak {
  /** Altura do risco, relativa ao pé (negativa para cima). */
  y: number;
  /** Começo e fim do risco, relativos ao ponto de saída do dash, já no sentido do dash. */
  x0: number;
  x1: number;
  /** Espessura (px). */
  width: 2 | 4;
  /** Atraso para acender (ms): os riscos aparecem em cascata, não todos de uma vez. */
  delayMs: number;
}

export interface DashStreakOptions {
  count: number;
  /** Altura do corpo (px). */
  height: number;
  /** Comprimento do caminho do dash (px). */
  distance: number;
  /** Sentido do dash. */
  dir: 1 | -1;
}

function hash01(n: number): number {
  let t = (n + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * Riscos do dash (DGA-02): `count` riscos em alturas espalhadas do pé ao alto da cabeça, cada um cobrindo um trecho
 * do caminho (mais longos no meio do corpo, onde o movimento lê melhor), com espessura e atraso sorteados pela seed.
 */
export function dashStreaks(seed: number, o: DashStreakOptions): DashStreak[] {
  const out: DashStreak[] = [];
  for (let i = 0; i < o.count; i++) {
    const r = (k: number): number => hash01(seed * 7919 + i * 104729 + k * 1299709);
    // Alturas em faixas, com um sorteio dentro de cada faixa: espalha sem amontoar.
    const band = (i + 0.2 + 0.6 * r(1)) / o.count;
    const y = -o.height * (0.1 + 0.85 * band);
    const middle = 1 - Math.abs(band - 0.5) * 2; // 1 no meio do corpo, 0 nas pontas
    const len = o.distance * (0.35 + 0.45 * middle + 0.2 * r(2));
    const start = (o.distance - len) * r(3);
    out.push({
      y: snap2(y),
      x0: snap2(start * o.dir),
      x1: snap2((start + len) * o.dir),
      width: r(4) < 0.35 ? 4 : 2,
      delayMs: Math.round(r(5) * 60),
    });
  }
  return out;
}
