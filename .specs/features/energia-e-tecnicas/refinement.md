# Refinamento Jev — energia-e-tecnicas

Gerado por `jev-refine` (Jev, TypeSafe System One). Consultivo (AD-007): cada AC sinalizado é reescrito ou registrado em Assumptions.
Limiares: ambiguous > 0,6 · bundled > 0,6 · testable < 0,6 · precision < 2 (escala 0–3).

**165 ACs, 64 sinalizados.**

| AC | ambiguous | bundled | testable | precision | resultado |
| --- | --- | --- | --- | --- | --- |
| CE-01 | 0.43 | 0.55 | 0.93 | 2.99 | ok |
| CE-02 | 0.54 | 0.13 | 0.91 | 2.97 | ok |
| CE-03 | 0.41 | 0.12 | 0.91 | 2.67 | ok |
| CE-04 | 0.68 | 0.31 | 0.82 | 2.10 | ⚠️ ambiguous |
| CE-05 | 0.55 | 0.14 | 0.87 | 2.34 | ok |
| CE-06 | 0.57 | 0.27 | 0.89 | 2.17 | ok |
| CE-07 | 0.54 | 0.14 | 0.94 | 2.99 | ok |
| CE-09 | 0.47 | 0.13 | 0.95 | 2.99 | ok |
| CE-08 | 0.65 | 0.17 | 0.82 | 2.24 | ⚠️ ambiguous |
| TEC-01 | 0.47 | 0.16 | 0.90 | 2.85 | ok |
| TEC-02 | 0.58 | 0.41 | 0.90 | 2.73 | ok |
| TEC-03 | 0.39 | 0.21 | 0.92 | 2.43 | ok |
| TEC-04 | 0.57 | 0.34 | 0.91 | 2.50 | ok |
| TEC-13 | 0.57 | 0.16 | 0.93 | 2.96 | ok |
| TEC-05 | 0.53 | 0.62 | 0.93 | 2.97 | ⚠️ bundled |
| TEC-06 | 0.55 | 0.21 | 0.91 | 2.83 | ok |
| TEC-14 | 0.51 | 0.22 | 0.94 | 2.88 | ok |
| TEC-07 | 0.57 | 0.51 | 0.84 | 2.62 | ok |
| TEC-12 | 0.64 | 0.25 | 0.88 | 2.90 | ⚠️ ambiguous |
| TEC-09 | 0.65 | 0.23 | 0.82 | 2.89 | ⚠️ ambiguous |
| TEC-10 | 0.57 | 0.20 | 0.68 | 2.87 | ok |
| TEC-08 | 0.62 | 0.31 | 0.82 | 2.15 | ⚠️ ambiguous |
| TEC-11 | 0.46 | 0.38 | 0.91 | 2.97 | ok |
| TEC-15 | 0.62 | 0.59 | 0.82 | 2.25 | ⚠️ ambiguous |
| TSH-01 | 0.48 | 0.51 | 0.94 | 2.97 | ok |
| TSH-02 | 0.59 | 0.35 | 0.94 | 2.95 | ok |
| TSH-03 | 0.66 | 0.37 | 0.84 | 2.19 | ⚠️ ambiguous |
| TSH-04 | 0.70 | 0.33 | 0.90 | 2.91 | ⚠️ ambiguous |
| TSH-05 | 0.64 | 0.53 | 0.72 | 2.26 | ⚠️ ambiguous |
| TSH-06 | 0.60 | 0.37 | 0.91 | 2.69 | ok |
| TSH-07 | 0.64 | 0.18 | 0.91 | 2.94 | ⚠️ ambiguous |
| TSH-08 | 0.63 | 0.48 | 0.90 | 2.88 | ⚠️ ambiguous |
| TSH-15 | 0.62 | 0.50 | 0.91 | 2.87 | ⚠️ ambiguous |
| TSH-09 | 0.72 | 0.31 | 0.85 | 2.26 | ⚠️ ambiguous |
| TSH-10 | 0.48 | 0.15 | 0.94 | 2.98 | ok |
| TSH-11 | 0.57 | 0.14 | 0.92 | 2.97 | ok |
| TSH-12 | 0.58 | 0.24 | 0.89 | 2.96 | ok |
| TSH-16 | 0.61 | 0.22 | 0.86 | 2.53 | ⚠️ ambiguous |
| TSH-13 | 0.48 | 0.17 | 0.84 | 2.82 | ok |
| TSH-17 | 0.53 | 0.18 | 0.79 | 2.76 | ok |
| TSH-14 | 0.49 | 0.19 | 0.93 | 2.96 | ok |
| CAST-01 | 0.57 | 0.23 | 0.87 | 2.69 | ok |
| CAST-02 | 0.59 | 0.39 | 0.88 | 2.54 | ok |
| CAST-03 | 0.52 | 0.24 | 0.90 | 2.39 | ok |
| CAST-04 | 0.53 | 0.14 | 0.89 | 2.42 | ok |
| CAST-05 | 0.50 | 0.49 | 0.94 | 2.88 | ok |
| CAST-06 | 0.49 | 0.53 | 0.94 | 2.93 | ok |
| CAST-07 | 0.62 | 0.57 | 0.89 | 2.43 | ⚠️ ambiguous |
| CAST-21 | 0.68 | 0.16 | 0.82 | 2.88 | ⚠️ ambiguous |
| CAST-20 | 0.64 | 0.15 | 0.83 | 2.20 | ⚠️ ambiguous |
| CAST-08 | 0.50 | 0.15 | 0.88 | 2.22 | ok |
| CAST-09 | 0.63 | 0.52 | 0.89 | 2.84 | ⚠️ ambiguous |
| CAST-10 | 0.66 | 0.34 | 0.81 | 2.35 | ⚠️ ambiguous |
| CAST-11 | 0.62 | 0.19 | 0.87 | 2.90 | ⚠️ ambiguous |
| CAST-12 | 0.69 | 0.18 | 0.83 | 2.35 | ⚠️ ambiguous |
| CAST-13 | 0.53 | 0.68 | 0.82 | 2.24 | ⚠️ bundled |
| CAST-14 | 0.55 | 0.19 | 0.85 | 2.40 | ok |
| CAST-15 | 0.64 | 0.15 | 0.80 | 2.81 | ⚠️ ambiguous |
| CAST-19 | 0.61 | 0.18 | 0.83 | 2.98 | ⚠️ ambiguous |
| CAST-16 | 0.62 | 0.32 | 0.86 | 2.92 | ⚠️ ambiguous |
| CAST-17 | 0.63 | 0.14 | 0.86 | 2.51 | ⚠️ ambiguous |
| CAST-18 | 0.64 | 0.47 | 0.90 | 2.98 | ⚠️ ambiguous |
| CAST-22 | 0.58 | 0.18 | 0.85 | 2.91 | ok |
| DIV-01 | 0.49 | 0.51 | 0.90 | 2.92 | ok |
| DIV-02 | 0.64 | 0.27 | 0.79 | 2.25 | ⚠️ ambiguous |
| DIV-11 | 0.64 | 0.20 | 0.81 | 2.33 | ⚠️ ambiguous |
| DIV-03 | 0.57 | 0.18 | 0.88 | 2.86 | ok |
| DIV-04 | 0.70 | 0.18 | 0.87 | 2.88 | ⚠️ ambiguous |
| DIV-12 | 0.68 | 0.20 | 0.72 | 1.91 | ⚠️ ambiguous, precision |
| DIV-05 | 0.68 | 0.16 | 0.81 | 2.37 | ⚠️ ambiguous |
| DIV-06 | 0.62 | 0.16 | 0.84 | 2.39 | ⚠️ ambiguous |
| DIV-07 | 0.64 | 0.24 | 0.85 | 2.96 | ⚠️ ambiguous |
| DIV-08 | 0.59 | 0.17 | 0.86 | 2.98 | ok |
| DIV-09 | 0.62 | 0.66 | 0.87 | 2.89 | ⚠️ ambiguous, bundled |
| DIV-10 | 0.54 | 0.18 | 0.85 | 2.70 | ok |
| KOK-01 | 0.64 | 0.20 | 0.92 | 2.98 | ⚠️ ambiguous |
| KOK-02 | 0.56 | 0.17 | 0.86 | 2.97 | ok |
| KOK-03 | 0.59 | 0.29 | 0.81 | 2.31 | ok |
| KOK-04 | 0.62 | 0.62 | 0.89 | 2.69 | ⚠️ ambiguous, bundled |
| KOK-05 | 0.57 | 0.20 | 0.82 | 2.39 | ok |
| KOK-06 | 0.56 | 0.17 | 0.90 | 2.93 | ok |
| KOK-07 | 0.61 | 0.44 | 0.79 | 2.07 | ⚠️ ambiguous |
| KOK-08 | 0.53 | 0.26 | 0.91 | 2.98 | ok |
| KOK-09 | 0.51 | 0.26 | 0.90 | 2.80 | ok |
| KOK-10 | 0.55 | 0.32 | 0.92 | 2.98 | ok |
| KOK-30 | 0.48 | 0.13 | 0.91 | 2.87 | ok |
| KOK-11 | 0.37 | 0.14 | 0.94 | 2.97 | ok |
| KOK-31 | 0.39 | 0.15 | 0.94 | 2.99 | ok |
| KOK-12 | 0.63 | 0.40 | 0.91 | 2.88 | ⚠️ ambiguous |
| KOK-32 | 0.55 | 0.26 | 0.91 | 2.82 | ok |
| KOK-13 | 0.59 | 0.19 | 0.83 | 2.87 | ok |
| KOK-14 | 0.58 | 0.20 | 0.83 | 2.97 | ok |
| KOK-15 | 0.53 | 0.59 | 0.85 | 2.99 | ok |
| KOK-16 | 0.60 | 0.17 | 0.76 | 2.15 | ok |
| KOK-17 | 0.64 | 0.19 | 0.77 | 2.89 | ⚠️ ambiguous |
| KOK-18 | 0.42 | 0.22 | 0.93 | 2.99 | ok |
| KOK-33 | 0.57 | 0.35 | 0.91 | 2.98 | ok |
| KOK-19 | 0.57 | 0.21 | 0.91 | 2.90 | ok |
| KOK-20 | 0.51 | 0.14 | 0.84 | 2.56 | ok |
| KOK-21 | 0.60 | 0.23 | 0.73 | 2.23 | ok |
| KOK-22 | 0.62 | 0.43 | 0.70 | 2.77 | ⚠️ ambiguous |
| KOK-23 | 0.57 | 0.24 | 0.88 | 2.81 | ok |
| KOK-24 | 0.53 | 0.44 | 0.82 | 2.98 | ok |
| KOK-25 | 0.47 | 0.33 | 0.91 | 2.98 | ok |
| KOK-26 | 0.56 | 0.20 | 0.89 | 2.87 | ok |
| KOK-27 | 0.53 | 0.16 | 0.90 | 2.69 | ok |
| KOK-28 | 0.60 | 0.16 | 0.90 | 2.88 | ok |
| KOK-29 | 0.50 | 0.46 | 0.91 | 2.99 | ok |
| KOK-34 | 0.59 | 0.24 | 0.90 | 2.94 | ok |
| RED-01 | 0.50 | 0.63 | 0.89 | 2.93 | ⚠️ bundled |
| RED-02 | 0.56 | 0.18 | 0.86 | 2.91 | ok |
| RED-03 | 0.56 | 0.19 | 0.85 | 2.81 | ok |
| RED-04 | 0.35 | 0.15 | 0.86 | 2.67 | ok |
| RED-05 | 0.59 | 0.32 | 0.85 | 2.73 | ok |
| RED-15 | 0.65 | 0.21 | 0.89 | 2.95 | ⚠️ ambiguous |
| RED-06 | 0.64 | 0.63 | 0.84 | 2.66 | ⚠️ ambiguous, bundled |
| RED-07 | 0.54 | 0.36 | 0.82 | 2.75 | ok |
| RED-08 | 0.59 | 0.37 | 0.87 | 2.33 | ok |
| RED-09 | 0.61 | 0.15 | 0.85 | 2.46 | ⚠️ ambiguous |
| RED-10 | 0.60 | 0.68 | 0.88 | 2.97 | ⚠️ bundled |
| RED-11 | 0.53 | 0.16 | 0.87 | 2.96 | ok |
| RED-16 | 0.64 | 0.15 | 0.88 | 2.94 | ⚠️ ambiguous |
| RED-12 | 0.62 | 0.31 | 0.80 | 2.84 | ⚠️ ambiguous |
| RED-17 | 0.49 | 0.17 | 0.73 | 2.67 | ok |
| RED-13 | 0.54 | 0.19 | 0.88 | 2.77 | ok |
| RED-14 | 0.59 | 0.30 | 0.84 | 2.17 | ok |
| BLU-01 | 0.48 | 0.67 | 0.90 | 2.92 | ⚠️ bundled |
| BLU-02 | 0.63 | 0.20 | 0.90 | 2.97 | ⚠️ ambiguous |
| BLU-03 | 0.56 | 0.20 | 0.88 | 2.83 | ok |
| BLU-12 | 0.53 | 0.16 | 0.90 | 2.71 | ok |
| BLU-04 | 0.49 | 0.21 | 0.88 | 2.96 | ok |
| BLU-05 | 0.56 | 0.18 | 0.86 | 2.23 | ok |
| BLU-06 | 0.62 | 0.27 | 0.88 | 2.97 | ⚠️ ambiguous |
| BLU-07 | 0.71 | 0.37 | 0.88 | 2.96 | ⚠️ ambiguous |
| BLU-11 | 0.68 | 0.57 | 0.89 | 2.92 | ⚠️ ambiguous |
| BLU-08 | 0.52 | 0.17 | 0.89 | 2.97 | ok |
| BLU-09 | 0.36 | 0.14 | 0.89 | 2.76 | ok |
| BLU-10 | 0.54 | 0.17 | 0.90 | 2.76 | ok |
| CUT-01 | 0.48 | 0.53 | 0.88 | 2.91 | ok |
| CUT-02 | 0.55 | 0.19 | 0.73 | 2.81 | ok |
| CUT-03 | 0.67 | 0.22 | 0.90 | 2.98 | ⚠️ ambiguous |
| CUT-04 | 0.64 | 0.14 | 0.82 | 2.51 | ⚠️ ambiguous |
| CUT-08 | 0.68 | 0.15 | 0.83 | 2.91 | ⚠️ ambiguous |
| CUT-05 | 0.72 | 0.65 | 0.79 | 2.93 | ⚠️ ambiguous, bundled |
| CUT-06 | 0.64 | 0.28 | 0.78 | 2.93 | ⚠️ ambiguous |
| FXL-01 | 0.56 | 0.23 | 0.85 | 2.78 | ok |
| FXL-05 | 0.58 | 0.23 | 0.88 | 2.96 | ok |
| FXL-06 | 0.55 | 0.68 | 0.89 | 2.95 | ⚠️ bundled |
| FXL-02 | 0.56 | 0.77 | 0.60 | 2.24 | ⚠️ bundled |
| FXL-07 | 0.50 | 0.22 | 0.88 | 2.62 | ok |
| FXL-09 | 0.48 | 0.23 | 0.89 | 2.63 | ok |
| FXL-03 | 0.45 | 0.17 | 0.86 | 2.96 | ok |
| FXL-04 | 0.49 | 0.21 | 0.80 | 2.99 | ok |
| FXL-08 | 0.38 | 0.24 | 0.86 | 2.99 | ok |
| TFX-01 | 0.59 | 0.28 | 0.86 | 2.64 | ok |
| TFX-08 | 0.59 | 0.30 | 0.94 | 2.97 | ok |
| TFX-02 | 0.58 | 0.24 | 0.85 | 2.96 | ok |
| TFX-03 | 0.61 | 0.20 | 0.85 | 2.93 | ⚠️ ambiguous |
| TFX-09 | 0.66 | 0.17 | 0.80 | 2.57 | ⚠️ ambiguous |
| TFX-04 | 0.51 | 0.15 | 0.90 | 3.00 | ok |
| TFX-05 | 0.57 | 0.20 | 0.86 | 2.76 | ok |
| TFX-06 | 0.57 | 0.22 | 0.75 | 2.60 | ok |
| TFX-10 | 0.58 | 0.42 | 0.79 | 2.03 | ok |
| TFX-11 | 0.58 | 0.15 | 0.90 | 2.95 | ok |
| TFX-07 | 0.61 | 0.26 | 0.88 | 2.48 | ⚠️ ambiguous |

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

**4ª rodada (26/09, depois da F4):** entrou a story "Técnicas e energia na loja" (TSH-01..17), porque a F4 fechou sem vender técnicas. 165 ACs, 64 sinalizados. Dos TSH, a 1ª passada sinalizou 11; TSH-08/12/13 foram divididos (TSH-15..17), TSH-10/11 ganharam a fórmula explícita (o Jev não vê CE-07/CE-09) e TSH-14 o evento exato. Sobraram 8 TSH só com `ambiguous` 0,61–0,72, sem flag de precisão ou testabilidade: aceitos pelo mesmo motivo dos anteriores (termos do jogo fora do glossário). Os demais ACs não mudaram; a variação de contagem neles é ruído do Jev entre rodadas.
