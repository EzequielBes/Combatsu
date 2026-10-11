import type { ModuleTheme } from '../core/module';
import type { SleeperConfig } from '../core/sleeper';

/**
 * O dorminhoco: um NPC de cenário, sem corpo físico nem vida, que dorme numa poltrona de massagem na rua. `col` é a
 * coluna dentro do módulo (entre a caixa e o poste, longe dos pontos de spawn); `zEveryMs` é o intervalo dos "z" que
 * sobem enquanto ele só dorme.
 */
export const SLEEPER: SleeperConfig & { theme: ModuleTheme; col: number; zEveryMs: number } = {
  theme: 'rua',
  col: 26,
  rangePx: 56,
  charMs: 45,
  holdMs: 1600,
  mouthMs: 130,
  zEveryMs: 1500,
  line: 'Preciso criar agentes, agentes... preciso agentes zzzz',
};
