import { TECH_GEOMETRY } from '../../data/techniques';

/**
 * Tamanho da detonação do Vermelho, do `TechStats` da conjuração (TST-03): a esfera cresce até o `radius` do dano
 * (RED-10) e a onda de choque vai além dele na proporção da tabela (`ringPx / radius`). Só números: as cores seguem
 * em `RED_FX_COLORS`. Sem `phaser` aqui para os testes lerem a conta.
 */
export interface RedDetonationLook {
  radius: number;
  rings: number;
}

/** Raio máximo da onda de choque para uma esfera de `radius`: o `ringPx` da tabela, escalado com o raio. */
export function shockRingRadius(radius: number): number {
  return (radius * TECH_GEOMETRY.vermelho.ringPx) / TECH_GEOMETRY.vermelho.radius;
}
