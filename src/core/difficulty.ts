/** Tuning da escala de dificuldade por rodada (DIF-01, DIF-05, DIF-06); lógica em T2. */
export interface DifficultyTuning {
  hpPerRound: number;
  hpCap: number;
  damagePerRound: number;
  damageCap: number;
  speedPerRound: number;
  speedCap: number;
}
