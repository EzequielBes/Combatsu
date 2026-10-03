# Refinamento Jev — sprite-chefes-e-acabamento

Gerado por `jev-refine` (Jev, TypeSafe System One). Consultivo (AD-007): cada AC sinalizado é reescrito ou registrado em Assumptions.
Limiares: ambiguous > 0,6 · bundled > 0,6 · testable < 0,6 · precision < 2 (escala 0–3).

**38 ACs, 25 sinalizados.**

| AC | ambiguous | bundled | testable | precision | resultado |
| --- | --- | --- | --- | --- | --- |
| BSP-01 | 0.61 | 0.80 | 0.91 | 2.92 | ⚠️ ambiguous, bundled |
| BSP-02 | 0.50 | 0.14 | 0.91 | 2.95 | ok |
| BSP-03 | 0.63 | 0.33 | 0.88 | 2.90 | ⚠️ ambiguous |
| BSP-04 | 0.34 | 0.14 | 0.89 | 2.97 | ok |
| BSP-05 | 0.44 | 0.54 | 0.89 | 2.98 | ok |
| BSP-06 | 0.53 | 0.19 | 0.88 | 2.50 | ok |
| BSP-07 | 0.53 | 0.53 | 0.81 | 2.79 | ok |
| BSP-08 | 0.60 | 0.33 | 0.84 | 2.86 | ok |
| BSP-09 | 0.61 | 0.86 | 0.85 | 2.93 | ⚠️ ambiguous, bundled |
| BSP-10 | 0.49 | 0.17 | 0.85 | 2.91 | ok |
| BSP-11 | 0.52 | 0.21 | 0.88 | 2.85 | ok |
| BSP-12 | 0.60 | 0.86 | 0.82 | 2.82 | ⚠️ bundled |
| BSP-13 | 0.73 | 0.29 | 0.55 | 1.20 | ⚠️ ambiguous, testable, precision |
| BAN-01 | 0.58 | 0.68 | 0.88 | 2.95 | ⚠️ bundled |
| BAN-02 | 0.63 | 0.50 | 0.81 | 2.96 | ⚠️ ambiguous |
| BAN-03 | 0.67 | 0.70 | 0.82 | 2.95 | ⚠️ ambiguous, bundled |
| BAN-04 | 0.52 | 0.86 | 0.88 | 2.83 | ⚠️ bundled |
| BAN-05 | 0.63 | 0.74 | 0.86 | 2.95 | ⚠️ ambiguous, bundled |
| BAN-06 | 0.56 | 0.67 | 0.82 | 2.72 | ⚠️ bundled |
| BAN-07 | 0.66 | 0.82 | 0.88 | 2.45 | ⚠️ ambiguous, bundled |
| LMB-01 | 0.66 | 0.63 | 0.91 | 2.94 | ⚠️ ambiguous, bundled |
| LMB-02 | 0.69 | 0.85 | 0.87 | 2.98 | ⚠️ ambiguous, bundled |
| LMB-03 | 0.69 | 0.82 | 0.87 | 2.96 | ⚠️ ambiguous, bundled |
| LMB-04 | 0.66 | 0.65 | 0.82 | 2.95 | ⚠️ ambiguous, bundled |
| LMB-05 | 0.69 | 0.24 | 0.84 | 2.89 | ⚠️ ambiguous |
| LMB-06 | 0.64 | 0.82 | 0.87 | 2.86 | ⚠️ ambiguous, bundled |
| LMB-07 | 0.49 | 0.16 | 0.90 | 2.98 | ok |
| LMB-08 | 0.61 | 0.29 | 0.84 | 2.97 | ⚠️ ambiguous |
| BPW-01 | 0.69 | 0.84 | 0.69 | 2.67 | ⚠️ ambiguous, bundled |
| BPW-02 | 0.66 | 0.85 | 0.81 | 2.90 | ⚠️ ambiguous, bundled |
| BPW-03 | 0.50 | 0.14 | 0.88 | 2.97 | ok |
| OBJ-01 | 0.61 | 0.79 | 0.85 | 2.93 | ⚠️ ambiguous, bundled |
| OBJ-02 | 0.72 | 0.83 | 0.83 | 2.87 | ⚠️ ambiguous, bundled |
| OBJ-03 | 0.54 | 0.86 | 0.89 | 2.98 | ⚠️ bundled |
| OBJ-04 | 0.56 | 0.87 | 0.90 | 2.97 | ⚠️ bundled |
| EPD-01 | 0.60 | 0.17 | 0.88 | 2.95 | ok |
| EPD-02 | 0.58 | 0.16 | 0.90 | 2.98 | ok |
| EPD-03 | 0.48 | 0.17 | 0.89 | 2.93 | ok |

## Revisão do autor

- **BSP-13** (ambiguous 0,73, testable 0,55, precision 1,20): reescrito. Agora diz, chave a chave, que `TECELA_COLOR_MAP[k]` é uma chave da paleta diferente de `k`.
- **Sinalizados como ambíguos** (BSP-01, BSP-03, BSP-09, BAN-02, BAN-03, BAN-05, BAN-07, LMB-01 a LMB-06, LMB-08, BPW-01, BPW-02, OBJ-01, OBJ-02): mantidos. Todos ficaram entre 0,61 e 0,72, logo acima do limiar. Os termos que o Jev não conhece ("diferença entre dois frames", "perfil de uma coluna", "caixa opaca", "componente", "k interno") estão definidos no Glossário da spec, e cada AC cita linhas, colunas e valores exatos.
- **Sinalizados como agrupados** (BSP-01, BSP-09, BSP-12, BAN-01, BAN-03 a BAN-07, LMB-01 a LMB-04, LMB-06, BPW-01, BPW-02, OBJ-01 a OBJ-04): mantidos. Cada um é um catálogo conferido num laço só (todos os frames, todas as animações, todas as chaves de cor) ou um par tamanho + conteúdo do mesmo sprite. Separar geraria ACs triviais.
- Decisão registrada na tabela de Assumptions da spec (linha "ACs sinalizados pelo Jev").
