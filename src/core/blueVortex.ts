/**
 * Geometria do vórtice do Azul no estilo do anime (BLA-01..05, AD-009): braços em espiral que giram e afunilam para o
 * centro, e riscos de velocidade sendo sugados em curva. Tudo é função pura do tempo (e de uma seed), com os pontos na
 * grade de 2 px; o `BlueOrbFx` só desenha o que sai daqui.
 */

/** Ponto do efeito, relativo ao centro do orbe, já na grade de 2 px. */
export interface VortexPoint {
  x: number;
  y: number;
  /** 0 na borda de fora, 1 no núcleo: decide cor, espessura e opacidade. */
  depth: number;
}

export interface VortexArmsOptions {
  arms: number;
  /** Raio onde os braços nascem (px). */
  outer: number;
  /** Raio onde os braços somem no núcleo (px). */
  inner: number;
  /** Voltas que cada braço dá da borda ao núcleo. */
  turns: number;
  /** Velocidade de giro (rad/s); o sentido anti-horário é o positivo. */
  spin: number;
  /** Pontos por braço. */
  samples: number;
}

/** Arredonda para a grade de 2 px (AD-009/TFX-02). */
export const snap2 = (v: number): number => Math.round(v / 2) * 2;

/**
 * Braços da espiral logarítmica (BLA-01): `arms` braços igualmente espaçados, girando com o tempo. O raio cai da
 * borda ao núcleo em progressão geométrica (os pontos se apertam perto do centro, como água descendo um ralo) e
 * o ângulo avança `turns` voltas no caminho.
 */
export function vortexArms(timeMs: number, o: VortexArmsOptions): VortexPoint[][] {
  const base = (o.spin * timeMs) / 1000;
  const out: VortexPoint[][] = [];
  for (let a = 0; a < o.arms; a++) {
    const offset = (a / o.arms) * Math.PI * 2;
    const arm: VortexPoint[] = [];
    for (let i = 0; i < o.samples; i++) {
      const t = i / (o.samples - 1);
      const r = o.outer * Math.pow(o.inner / o.outer, t);
      const ang = base + offset + t * o.turns * Math.PI * 2;
      arm.push({ x: snap2(Math.cos(ang) * r), y: snap2(Math.sin(ang) * r), depth: t });
    }
    out.push(arm);
  }
  return out;
}

/** Hash inteiro barato e determinístico (mulberry32 de um passo), para sortear sem estado. */
function hash01(n: number): number {
  let t = (n + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export interface InwardStreak {
  /** Cabeça (mais perto do núcleo) e cauda do risco, relativas ao centro, na grade de 2 px. */
  head: { x: number; y: number };
  tail: { x: number; y: number };
  /** 0 acabou de nascer na borda, 1 chegando ao núcleo. */
  progress: number;
}

export interface InwardStreakOptions {
  count: number;
  outer: number;
  inner: number;
  /** Duração da viagem de cada risco (ms). */
  lifeMs: number;
  /** Quanto o risco gira no caminho até o núcleo (rad): dá a curva de redemoinho. */
  swirl: number;
  /** Comprimento do risco em fração do caminho. */
  length: number;
}

/**
 * Riscos de velocidade sendo sugados (BLA-02): `count` riscos defasados no tempo, cada um nascendo num ângulo
 * sorteado pela seed a cada ciclo e descendo em curva até o núcleo, acelerando (a cabeça anda mais rápido no fim).
 */
export function inwardStreaks(seed: number, timeMs: number, o: InwardStreakOptions): InwardStreak[] {
  const out: InwardStreak[] = [];
  for (let i = 0; i < o.count; i++) {
    const local = timeMs + (i / o.count) * o.lifeMs;
    const cycle = Math.floor(local / o.lifeMs);
    const progress = (local % o.lifeMs) / o.lifeMs;
    const start = hash01(seed * 7919 + i * 104729 + cycle * 1299709) * Math.PI * 2;
    const at = (p: number): { x: number; y: number } => {
      const eased = p * p;
      const r = o.outer + (o.inner - o.outer) * eased;
      const ang = start + o.swirl * eased;
      return { x: snap2(Math.cos(ang) * r), y: snap2(Math.sin(ang) * r) };
    };
    out.push({ head: at(progress), tail: at(Math.max(0, progress - o.length)), progress });
  }
  return out;
}
