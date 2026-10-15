import { TECH_GEOMETRY } from '../../data/techniques';

/**
 * Tamanho do orbe Azul na vista, do `TechStats` da conjuração (TST-03): o halo e o anel de distorção mais largo
 * crescem junto com o `radius` da puxada (BLU-04), na proporção da tabela (`haloPx / radius`, `distortPx / radius`).
 * Sem `phaser` aqui para os testes lerem a conta.
 */
export interface BlueOrbLook {
  halo: number;
  distort: number;
}

/** Halo e distorção para um orbe de `radius`: os da tabela, escalados com o raio. */
export function blueOrbLook(radius: number): BlueOrbLook {
  const { haloPx, distortPx, radius: base } = TECH_GEOMETRY.azul;
  return { halo: (radius * haloPx) / base, distort: (radius * distortPx) / base };
}
