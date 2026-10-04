/**
 * Pontos de golpe (TRL-01): para cada frame `-wind` e `-hit` dos golpes de `MOVES` (e de `kick`, que não está no grafo),
 * o texel (coluna e linha do frame de 32x30) da ponta do membro que bate: punho, cotovelo, joelho ou pé.
 * O rastro de energia amaldiçoada liga estes pontos de um frame ao seguinte. Todo ponto cai num texel opaco (TRL-02) e,
 * nos frames `-hit`, dentro da hitbox do golpe com folga de 4 px (POS-01).
 */
export interface StrikePoint {
  col: number;
  row: number;
}

export const STRIKE_POINTS: Readonly<Record<string, StrikePoint>> = {
  'jab-wind': { col: 15, row: 14 },
  'jab-hit': { col: 26, row: 18 },
  'direto-wind': { col: 15, row: 14 },
  'direto-hit': { col: 26, row: 18 },
  'gancho-wind': { col: 15, row: 14 },
  'gancho-hit': { col: 24, row: 13 },
  'cotovelada-wind': { col: 15, row: 14 },
  'cotovelada-hit': { col: 20, row: 18 },
  'chuteFrontal-wind': { col: 15, row: 25 },
  'chuteFrontal-hit': { col: 29, row: 19 },
  'chuteAlto-wind': { col: 15, row: 19 },
  'chuteAlto-hit': { col: 30, row: 11 },
  'joelhada-wind': { col: 16, row: 26 },
  'joelhada-hit': { col: 21, row: 20 },
  'chuteGiratorio-wind': { col: 15, row: 18 },
  'chuteGiratorio-hit': { col: 28, row: 20 },
  'socoBaixo-wind': { col: 15, row: 16 },
  'socoBaixo-hit': { col: 25, row: 23 },
  'rasteira-wind': { col: 16, row: 27 },
  'rasteira-hit': { col: 30, row: 24 },
  'ganchoAscendente-wind': { col: 15, row: 15 },
  'ganchoAscendente-hit': { col: 21, row: 5 },
  'chuteEmpurrao-wind': { col: 15, row: 25 },
  'chuteEmpurrao-hit': { col: 30, row: 20 },
  'chuteCarregado-wind': { col: 18, row: 19 },
  'chuteCarregado-hit': { col: 30, row: 18 },
  'socoAereo-wind': { col: 15, row: 14 },
  'socoAereo-hit': { col: 25, row: 16 },
  'voadora-wind': { col: 14, row: 17 },
  'voadora-hit': { col: 29, row: 22 },
  'pisao-wind': { col: 14, row: 17 },
  'pisao-hit': { col: 13, row: 28 },
  'palmaExplosiva-wind': { col: 14, row: 15 },
  'palmaExplosiva-hit': { col: 26, row: 18 },
  'contra-wind': { col: 15, row: 15 },
  'contra-hit': { col: 25, row: 19 },
  'contraGancho-wind': { col: 15, row: 18 },
  'contraGancho-hit': { col: 21, row: 5 },
  'kick-wind': { col: 15, row: 25 },
  'kick-hit': { col: 29, row: 19 },
};
