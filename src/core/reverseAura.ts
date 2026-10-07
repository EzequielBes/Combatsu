/**
 * Geometria da aura da Energia Amaldiçoada Reversa no estilo do anime (RCA-01..05, AD-009): línguas de energia que
 * sobem do corpo ondulando, como a aura de energia amaldiçoada de Jujutsu Kaisen, e partículas de luz subindo.
 * Função pura do tempo e da intensidade, com os pontos na grade de 2 px; o `ReverseAuraFx` só desenha.
 */
import { snap2 } from './blueVortex';

/** Ponto de uma língua, relativo ao pé do player (y negativo para cima), na grade de 2 px. */
export interface WispPoint {
  x: number;
  y: number;
  /** 0 na base, 1 na ponta: a língua afina e some para a ponta. */
  t: number;
}

export interface AuraOptions {
  /** Número de línguas. */
  count: number;
  /** Largura do corpo (px): as bases se espalham por ela. */
  width: number;
  /** Altura do corpo (px): as pontas passam um pouco dela. */
  height: number;
  /** Pontos por língua. */
  samples: number;
}

/** Hash determinístico em [0, 1) para dar a cada língua seu próprio ritmo, sem estado e sem sorteio global. */
function hash01(n: number): number {
  let t = (n + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * Línguas da aura (RCA-01, RCA-02): as bases se distribuem pela largura do corpo, das pernas à cintura; cada língua
 * sobe até acima da cabeça, ondulando mais quanto mais alto (a ponta é a que mais balança) e pulsando de
 * comprimento no próprio ritmo. As das bordas sobem abertas para fora, contornando a silhueta. `intensity` (0..1)
 * encolhe tudo: na concentração da técnica a aura cresce do pé até a altura cheia.
 */
export function auraWisps(timeMs: number, intensity: number, o: AuraOptions): WispPoint[][] {
  const k = Math.max(0, Math.min(1, intensity));
  const s = timeMs / 1000;
  const out: WispPoint[][] = [];
  for (let i = 0; i < o.count; i++) {
    const side = o.count === 1 ? 0 : (i / (o.count - 1)) * 2 - 1; // -1 (esquerda) .. 1 (direita)
    const seed = hash01(i * 7919 + 17);
    const speed = 1.6 + seed * 1.4;
    const flicker = 0.9 + 0.1 * Math.sin(s * speed * 2.3 + seed * 6.28);
    const baseY = -o.height * (0.12 + 0.3 * (1 - Math.abs(side)));
    // As do meio sobem mais alto que as das bordas e passam da cabeça; `k` traz a ponta de volta para a base.
    const tipY = baseY + (-o.height * (1.05 + 0.5 * (1 - Math.abs(side))) * flicker - baseY) * k;
    const baseX = side * o.width * 0.5;
    const wisp: WispPoint[] = [];
    for (let j = 0; j < o.samples; j++) {
      const t = j / (o.samples - 1);
      // Sobe colada ao corpo: estufa um pouco para fora no meio (contorna a silhueta) e fecha para dentro na
      // ponta, como uma chama; a ponta é a que mais ondula.
      const bulge = side * o.width * 0.18 * Math.sin(Math.PI * t);
      const close = 1 - 0.45 * t;
      const sway = Math.sin(s * speed * 3 - t * 4.2 + seed * 6.28) * (1 + 5 * t * t) * k;
      wisp.push({ x: snap2(baseX * close + bulge + sway), y: snap2(baseY + (tipY - baseY) * t), t });
    }
    out.push(wisp);
  }
  return out;
}

export interface Mote {
  x: number;
  y: number;
  /** 0 nasceu agora, 1 vai sumir. */
  life: number;
}

/**
 * Partículas de luz subindo do corpo (RCA-03): `count` partículas defasadas, cada uma nascendo numa posição
 * sorteada por ciclo dentro da largura do corpo e subindo com um leve zigue-zague até sumir acima da cabeça.
 */
export function auraMotes(timeMs: number, count: number, width: number, height: number, lifeMs: number): Mote[] {
  const out: Mote[] = [];
  for (let i = 0; i < count; i++) {
    const local = timeMs + (i / count) * lifeMs;
    const cycle = Math.floor(local / lifeMs);
    const life = (local % lifeMs) / lifeMs;
    const r = hash01(i * 104729 + cycle * 1299709);
    const x0 = (r * 2 - 1) * width * 0.7;
    const y0 = -height * (0.1 + 0.6 * hash01(r * 1e6 + 3));
    out.push({
      x: snap2(x0 + Math.sin(life * 9 + r * 6.28) * 3),
      y: snap2(y0 - life * height * 0.9),
      life,
    });
  }
  return out;
}
