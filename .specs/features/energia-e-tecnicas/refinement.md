# Refinamento Jev — energia-e-tecnicas

Gerado por `jev-refine` (Jev, TypeSafe System One). Consultivo (AD-007): cada AC sinalizado é reescrito ou registrado em Assumptions.
Limiares: ambiguous > 0,6 · bundled > 0,6 · testable < 0,6 · precision < 2 (escala 0–3).

**148 ACs, 54 sinalizados.**

| AC | ambiguous | bundled | testable | precision | resultado |
| --- | --- | --- | --- | --- | --- |
| CE-01 | 0.45 | 0.58 | 0.93 | 2.99 | ok |
| CE-02 | 0.53 | 0.12 | 0.91 | 2.97 | ok |
| CE-03 | 0.43 | 0.13 | 0.91 | 2.63 | ok |
| CE-04 | 0.67 | 0.29 | 0.83 | 2.19 | ⚠️ ambiguous |
| CE-05 | 0.57 | 0.14 | 0.87 | 2.31 | ok |
| CE-06 | 0.58 | 0.28 | 0.89 | 1.99 | ⚠️ precision |
| CE-07 | 0.57 | 0.15 | 0.94 | 2.98 | ok |
| CE-09 | 0.49 | 0.14 | 0.95 | 2.99 | ok |
| CE-08 | 0.62 | 0.16 | 0.81 | 2.31 | ⚠️ ambiguous |
| TEC-01 | 0.49 | 0.15 | 0.91 | 2.83 | ok |
| TEC-02 | 0.57 | 0.36 | 0.90 | 2.70 | ok |
| TEC-03 | 0.37 | 0.20 | 0.92 | 2.51 | ok |
| TEC-04 | 0.58 | 0.35 | 0.91 | 2.53 | ok |
| TEC-13 | 0.56 | 0.15 | 0.93 | 2.96 | ok |
| TEC-05 | 0.54 | 0.61 | 0.92 | 2.96 | ⚠️ bundled |
| TEC-06 | 0.56 | 0.20 | 0.92 | 2.81 | ok |
| TEC-14 | 0.51 | 0.21 | 0.94 | 2.90 | ok |
| TEC-07 | 0.54 | 0.53 | 0.84 | 2.59 | ok |
| TEC-12 | 0.61 | 0.25 | 0.88 | 2.91 | ⚠️ ambiguous |
| TEC-09 | 0.66 | 0.22 | 0.81 | 2.88 | ⚠️ ambiguous |
| TEC-10 | 0.58 | 0.20 | 0.74 | 2.82 | ok |
| TEC-08 | 0.63 | 0.34 | 0.83 | 2.12 | ⚠️ ambiguous |
| TEC-11 | 0.49 | 0.34 | 0.91 | 2.98 | ok |
| TEC-15 | 0.65 | 0.54 | 0.80 | 2.28 | ⚠️ ambiguous |
| CAST-01 | 0.57 | 0.24 | 0.88 | 2.75 | ok |
| CAST-02 | 0.58 | 0.45 | 0.88 | 2.51 | ok |
| CAST-03 | 0.53 | 0.23 | 0.90 | 2.26 | ok |
| CAST-04 | 0.56 | 0.15 | 0.89 | 2.44 | ok |
| CAST-05 | 0.52 | 0.46 | 0.94 | 2.90 | ok |
| CAST-06 | 0.51 | 0.53 | 0.94 | 2.91 | ok |
| CAST-07 | 0.59 | 0.56 | 0.88 | 2.35 | ok |
| CAST-21 | 0.66 | 0.16 | 0.83 | 2.90 | ⚠️ ambiguous |
| CAST-20 | 0.63 | 0.15 | 0.82 | 2.23 | ⚠️ ambiguous |
| CAST-08 | 0.51 | 0.14 | 0.88 | 2.35 | ok |
| CAST-09 | 0.62 | 0.52 | 0.89 | 2.83 | ⚠️ ambiguous |
| CAST-10 | 0.65 | 0.36 | 0.81 | 2.32 | ⚠️ ambiguous |
| CAST-11 | 0.62 | 0.18 | 0.88 | 2.91 | ⚠️ ambiguous |
| CAST-12 | 0.70 | 0.18 | 0.83 | 2.38 | ⚠️ ambiguous |
| CAST-13 | 0.55 | 0.75 | 0.81 | 2.25 | ⚠️ bundled |
| CAST-14 | 0.52 | 0.19 | 0.85 | 2.34 | ok |
| CAST-15 | 0.66 | 0.16 | 0.80 | 2.77 | ⚠️ ambiguous |
| CAST-19 | 0.60 | 0.15 | 0.83 | 2.98 | ok |
| CAST-16 | 0.63 | 0.35 | 0.86 | 2.93 | ⚠️ ambiguous |
| CAST-17 | 0.58 | 0.13 | 0.87 | 2.41 | ok |
| CAST-18 | 0.62 | 0.45 | 0.90 | 2.98 | ⚠️ ambiguous |
| CAST-22 | 0.55 | 0.18 | 0.85 | 2.93 | ok |
| DIV-01 | 0.49 | 0.59 | 0.90 | 2.94 | ok |
| DIV-02 | 0.67 | 0.29 | 0.79 | 2.16 | ⚠️ ambiguous |
| DIV-11 | 0.63 | 0.19 | 0.81 | 2.08 | ⚠️ ambiguous |
| DIV-03 | 0.61 | 0.18 | 0.88 | 2.88 | ⚠️ ambiguous |
| DIV-04 | 0.70 | 0.18 | 0.88 | 2.89 | ⚠️ ambiguous |
| DIV-12 | 0.66 | 0.23 | 0.75 | 1.95 | ⚠️ ambiguous, precision |
| DIV-05 | 0.68 | 0.16 | 0.82 | 2.34 | ⚠️ ambiguous |
| DIV-06 | 0.62 | 0.17 | 0.85 | 2.34 | ⚠️ ambiguous |
| DIV-07 | 0.66 | 0.25 | 0.84 | 2.95 | ⚠️ ambiguous |
| DIV-08 | 0.59 | 0.17 | 0.87 | 2.96 | ok |
| DIV-09 | 0.63 | 0.69 | 0.86 | 2.90 | ⚠️ ambiguous, bundled |
| DIV-10 | 0.53 | 0.18 | 0.86 | 2.69 | ok |
| KOK-01 | 0.64 | 0.21 | 0.91 | 2.98 | ⚠️ ambiguous |
| KOK-02 | 0.53 | 0.19 | 0.86 | 2.98 | ok |
| KOK-03 | 0.59 | 0.30 | 0.81 | 2.24 | ok |
| KOK-04 | 0.63 | 0.63 | 0.88 | 2.70 | ⚠️ ambiguous, bundled |
| KOK-05 | 0.55 | 0.19 | 0.82 | 2.32 | ok |
| KOK-06 | 0.55 | 0.18 | 0.90 | 2.86 | ok |
| KOK-07 | 0.61 | 0.44 | 0.76 | 2.03 | ⚠️ ambiguous |
| KOK-08 | 0.55 | 0.25 | 0.91 | 2.97 | ok |
| KOK-09 | 0.48 | 0.24 | 0.91 | 2.76 | ok |
| KOK-10 | 0.53 | 0.33 | 0.91 | 2.97 | ok |
| KOK-30 | 0.48 | 0.13 | 0.90 | 2.89 | ok |
| KOK-11 | 0.35 | 0.13 | 0.93 | 2.98 | ok |
| KOK-31 | 0.40 | 0.14 | 0.94 | 2.99 | ok |
| KOK-12 | 0.64 | 0.42 | 0.91 | 2.91 | ⚠️ ambiguous |
| KOK-32 | 0.55 | 0.32 | 0.91 | 2.63 | ok |
| KOK-13 | 0.59 | 0.19 | 0.83 | 2.84 | ok |
| KOK-14 | 0.57 | 0.20 | 0.84 | 2.98 | ok |
| KOK-15 | 0.52 | 0.62 | 0.86 | 2.99 | ⚠️ bundled |
| KOK-16 | 0.58 | 0.17 | 0.77 | 2.14 | ok |
| KOK-17 | 0.64 | 0.19 | 0.78 | 2.87 | ⚠️ ambiguous |
| KOK-18 | 0.44 | 0.24 | 0.93 | 2.98 | ok |
| KOK-33 | 0.56 | 0.33 | 0.91 | 2.98 | ok |
| KOK-19 | 0.56 | 0.18 | 0.91 | 2.88 | ok |
| KOK-20 | 0.48 | 0.14 | 0.83 | 2.57 | ok |
| KOK-21 | 0.59 | 0.26 | 0.71 | 2.32 | ok |
| KOK-22 | 0.63 | 0.42 | 0.72 | 2.73 | ⚠️ ambiguous |
| KOK-23 | 0.57 | 0.22 | 0.88 | 2.80 | ok |
| KOK-24 | 0.55 | 0.41 | 0.83 | 2.97 | ok |
| KOK-25 | 0.45 | 0.33 | 0.91 | 2.97 | ok |
| KOK-26 | 0.55 | 0.19 | 0.88 | 2.90 | ok |
| KOK-27 | 0.51 | 0.14 | 0.89 | 2.69 | ok |
| KOK-28 | 0.60 | 0.16 | 0.90 | 2.85 | ok |
| KOK-29 | 0.51 | 0.46 | 0.90 | 2.99 | ok |
| KOK-34 | 0.55 | 0.26 | 0.89 | 2.95 | ok |
| RED-01 | 0.49 | 0.60 | 0.89 | 2.95 | ok |
| RED-02 | 0.60 | 0.19 | 0.85 | 2.90 | ok |
| RED-03 | 0.59 | 0.20 | 0.83 | 2.76 | ok |
| RED-04 | 0.36 | 0.15 | 0.85 | 2.63 | ok |
| RED-05 | 0.59 | 0.30 | 0.84 | 2.70 | ok |
| RED-15 | 0.64 | 0.21 | 0.89 | 2.95 | ⚠️ ambiguous |
| RED-06 | 0.64 | 0.61 | 0.82 | 2.74 | ⚠️ ambiguous, bundled |
| RED-07 | 0.53 | 0.38 | 0.82 | 2.69 | ok |
| RED-08 | 0.60 | 0.47 | 0.87 | 2.20 | ok |
| RED-09 | 0.63 | 0.16 | 0.85 | 2.67 | ⚠️ ambiguous |
| RED-10 | 0.62 | 0.68 | 0.88 | 2.97 | ⚠️ ambiguous, bundled |
| RED-11 | 0.54 | 0.16 | 0.85 | 2.94 | ok |
| RED-16 | 0.62 | 0.16 | 0.87 | 2.94 | ⚠️ ambiguous |
| RED-12 | 0.60 | 0.27 | 0.82 | 2.86 | ok |
| RED-17 | 0.50 | 0.16 | 0.70 | 2.76 | ok |
| RED-13 | 0.56 | 0.15 | 0.87 | 2.72 | ok |
| RED-14 | 0.60 | 0.33 | 0.82 | 2.16 | ok |
| BLU-01 | 0.45 | 0.64 | 0.89 | 2.94 | ⚠️ bundled |
| BLU-02 | 0.62 | 0.20 | 0.90 | 2.97 | ⚠️ ambiguous |
| BLU-03 | 0.57 | 0.19 | 0.89 | 2.86 | ok |
| BLU-12 | 0.55 | 0.15 | 0.89 | 2.70 | ok |
| BLU-04 | 0.51 | 0.19 | 0.88 | 2.92 | ok |
| BLU-05 | 0.55 | 0.18 | 0.84 | 2.15 | ok |
| BLU-06 | 0.59 | 0.29 | 0.88 | 2.97 | ok |
| BLU-07 | 0.68 | 0.32 | 0.88 | 2.96 | ⚠️ ambiguous |
| BLU-11 | 0.67 | 0.62 | 0.88 | 2.92 | ⚠️ ambiguous, bundled |
| BLU-08 | 0.50 | 0.17 | 0.89 | 2.97 | ok |
| BLU-09 | 0.36 | 0.15 | 0.88 | 2.68 | ok |
| BLU-10 | 0.54 | 0.17 | 0.90 | 2.73 | ok |
| CUT-01 | 0.49 | 0.58 | 0.88 | 2.90 | ok |
| CUT-02 | 0.55 | 0.19 | 0.75 | 2.78 | ok |
| CUT-03 | 0.67 | 0.22 | 0.90 | 2.97 | ⚠️ ambiguous |
| CUT-04 | 0.64 | 0.15 | 0.82 | 2.49 | ⚠️ ambiguous |
| CUT-08 | 0.68 | 0.14 | 0.83 | 2.87 | ⚠️ ambiguous |
| CUT-05 | 0.72 | 0.64 | 0.78 | 2.93 | ⚠️ ambiguous, bundled |
| CUT-06 | 0.65 | 0.24 | 0.80 | 2.94 | ⚠️ ambiguous |
| FXL-01 | 0.61 | 0.21 | 0.86 | 2.78 | ⚠️ ambiguous |
| FXL-05 | 0.58 | 0.22 | 0.87 | 2.95 | ok |
| FXL-06 | 0.55 | 0.67 | 0.90 | 2.96 | ⚠️ bundled |
| FXL-02 | 0.56 | 0.75 | 0.62 | 2.31 | ⚠️ bundled |
| FXL-07 | 0.48 | 0.23 | 0.88 | 2.61 | ok |
| FXL-09 | 0.49 | 0.24 | 0.88 | 2.65 | ok |
| FXL-03 | 0.45 | 0.17 | 0.84 | 2.97 | ok |
| FXL-04 | 0.47 | 0.22 | 0.81 | 2.99 | ok |
| FXL-08 | 0.35 | 0.26 | 0.86 | 2.99 | ok |
| TFX-01 | 0.58 | 0.27 | 0.84 | 2.62 | ok |
| TFX-08 | 0.59 | 0.35 | 0.93 | 2.98 | ok |
| TFX-02 | 0.57 | 0.25 | 0.86 | 2.96 | ok |
| TFX-03 | 0.61 | 0.18 | 0.85 | 2.91 | ⚠️ ambiguous |
| TFX-09 | 0.65 | 0.17 | 0.81 | 2.62 | ⚠️ ambiguous |
| TFX-04 | 0.53 | 0.17 | 0.90 | 3.00 | ok |
| TFX-05 | 0.58 | 0.21 | 0.86 | 2.80 | ok |
| TFX-06 | 0.56 | 0.22 | 0.75 | 2.62 | ok |
| TFX-10 | 0.61 | 0.37 | 0.78 | 2.03 | ⚠️ ambiguous |
| TFX-11 | 0.56 | 0.16 | 0.89 | 2.95 | ok |
| TFX-07 | 0.60 | 0.25 | 0.88 | 2.46 | ok |

## Revisão do autor (25/09)

**1ª rodada:** 124 ACs, 65 sinalizados. Reescritos a partir dela:
- **Divididos:**
  - TEC-04 (+13), TEC-06 (+14), TEC-11 (+15)
  - CAST-07 (+21), CAST-18 (+22)
  - DIV-02 (+11)
  - KOK-10 (+30), KOK-11 (+31), KOK-12 (+32), KOK-18 (+33), KOK-29 (+34)
  - RED-12 (+17), BLU-03 (+12), CUT-04 (+08)
  - FXL-01 (+05, +06), FXL-02 (+07), FXL-04 (+08)
  - TFX-01 (+08), TFX-03 (+09), TFX-06 (+10, +11)
- **Com números ou regras explícitos:**
  - CE-08 (sem o +3), CAST-02 (ordem e estados de 0 ms pulados), KOK-03 (qual tecla e a trava)
  - TEC-06 (arredondamento para cima na metade), TEC-12 e TEC-09 (fórmulas com `barLeft` e a recarga total)
  - BLU-07 (raio medido do centro), CUT-05 (ângulos 20°, −25° e 70°)
  - FXL-04 (texto exato da legenda), TFX-02 (deslocamentos pares), TFX-08 (valores hex das 4 cores novas)
- **Contradição corrigida:** DIV-04 dizia "no ponto do primeiro contato", e o edge case dizia "na posição atual do alvo". Agora vale a posição atual (DIV-12).

**2ª rodada:** 146 ACs, 58 sinalizados. Ajustados:
- TEC-14 virou uma fórmula (`baseCost − 5 × (n − 1)`).
- CAST-18 passou a listar os nomes dos frames.
- CAST-10 explicita energia e recarga.
- DIV-04 e FXL-07 foram divididos (+DIV-12, +FXL-09).

**3ª rodada:** 148 ACs, 54 sinalizados, aceitos pelos motivos abaixo.
- **Ambiguous (0,60–0,72):** mecânica de jogo com valores explícitos fica nessa faixa mesmo quando está precisa (o mesmo padrão de F0, F1 e F2). Os testes em Node fixam os números. As notas também oscilam entre rodadas sem mudança de texto: CE-06 não foi sinalizado nas duas primeiras e ganhou um flag de precisão na terceira.
- **Bundled (≤ 0,75):** TEC-05, CAST-13, DIV-09, KOK-04, KOK-15, RED-06, RED-10, BLU-01, BLU-11, CUT-05, FXL-02 e FXL-06. Cada um é uma regra só, verificada num único teste: uma tabela de tempos, um mapeamento de teclas, um impacto com os seus efeitos ou uma sequência fixa de estados.
- **Precision:** DIV-12 (1,95) e CE-06 (1,99) ficam no limite. A posição do efeito é conferida pelo snapshot com a mesma tolerância de ±2 px da DIV-08.
