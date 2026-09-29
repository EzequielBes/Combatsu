# Refinamento Jev — combate-estilo-luta

Gerado por `jev-refine` (Jev, TypeSafe System One). Consultivo (AD-007): cada AC sinalizado é reescrito ou registrado em Assumptions.
Limiares: ambiguous > 0,6 · bundled > 0,6 · testable < 0,6 · precision < 2 (escala 0–3).

**84 ACs, 23 sinalizados.**

| AC | ambiguous | bundled | testable | precision | resultado |
| --- | --- | --- | --- | --- | --- |
| CTL-01 | 0.36 | 0.24 | 0.93 | 2.78 | ok |
| CTL-02 | 0.28 | 0.22 | 0.93 | 2.74 | ok |
| CTL-03 | 0.69 | 0.21 | 0.86 | 2.20 | ⚠️ ambiguous |
| CTL-07 | 0.58 | 0.22 | 0.87 | 2.83 | ok |
| CTL-08 | 0.57 | 0.20 | 0.85 | 2.44 | ok |
| CTL-04 | 0.47 | 0.44 | 0.94 | 2.95 | ok |
| CTL-05 | 0.65 | 0.33 | 0.86 | 2.21 | ⚠️ ambiguous |
| CTL-06 | 0.59 | 0.43 | 0.79 | 2.94 | ok |
| MOV-01 | 0.51 | 0.40 | 0.78 | 2.19 | ok |
| MOV-02 | 0.38 | 0.21 | 0.90 | 2.78 | ok |
| MOV-03 | 0.60 | 0.16 | 0.85 | 2.86 | ok |
| MOV-04 | 0.59 | 0.84 | 0.84 | 2.71 | ⚠️ bundled |
| MOV-05 | 0.43 | 0.20 | 0.88 | 2.69 | ok |
| MOV-06 | 0.45 | 0.17 | 0.90 | 2.71 | ok |
| MOV-17 | 0.56 | 0.18 | 0.87 | 2.67 | ok |
| MOV-07 | 0.43 | 0.16 | 0.89 | 2.72 | ok |
| MOV-08 | 0.62 | 0.19 | 0.87 | 2.48 | ⚠️ ambiguous |
| MOV-09 | 0.56 | 0.30 | 0.84 | 2.53 | ok |
| MOV-16 | 0.56 | 0.13 | 0.87 | 2.93 | ok |
| MOV-10 | 0.54 | 0.21 | 0.86 | 2.92 | ok |
| MOV-11 | 0.57 | 0.29 | 0.90 | 2.92 | ok |
| MOV-12 | 0.38 | 0.21 | 0.95 | 2.99 | ok |
| MOV-13 | 0.62 | 0.32 | 0.89 | 2.88 | ⚠️ ambiguous |
| MOV-18 | 0.39 | 0.37 | 0.93 | 2.97 | ok |
| MOV-14 | 0.58 | 0.56 | 0.88 | 2.97 | ok |
| MOV-15 | 0.63 | 0.50 | 0.84 | 2.48 | ⚠️ ambiguous |
| GRD-01 | 0.58 | 0.30 | 0.92 | 2.84 | ok |
| GRD-02 | 0.42 | 0.14 | 0.92 | 2.99 | ok |
| GRD-07 | 0.58 | 0.15 | 0.91 | 2.96 | ok |
| GRD-06 | 0.43 | 0.13 | 0.91 | 2.77 | ok |
| GRD-03 | 0.54 | 0.19 | 0.86 | 2.22 | ok |
| GRD-04 | 0.43 | 0.14 | 0.85 | 2.31 | ok |
| GRD-05 | 0.45 | 0.15 | 0.92 | 2.95 | ok |
| PAR-01 | 0.60 | 0.31 | 0.92 | 2.95 | ok |
| PAR-02 | 0.43 | 0.17 | 0.91 | 2.98 | ok |
| PAR-09 | 0.62 | 0.16 | 0.90 | 2.91 | ⚠️ ambiguous |
| PAR-03 | 0.47 | 0.26 | 0.93 | 2.99 | ok |
| PAR-10 | 0.54 | 0.60 | 0.89 | 2.91 | ok |
| PAR-07 | 0.50 | 0.29 | 0.93 | 2.99 | ok |
| PAR-08 | 0.48 | 0.12 | 0.83 | 2.93 | ok |
| PAR-04 | 0.73 | 0.17 | 0.87 | 2.95 | ⚠️ ambiguous |
| PAR-05 | 0.52 | 0.23 | 0.90 | 2.94 | ok |
| PAR-06 | 0.41 | 0.13 | 0.90 | 2.57 | ok |
| DOD-01 | 0.58 | 0.34 | 0.91 | 2.94 | ok |
| DOD-09 | 0.66 | 0.20 | 0.87 | 2.90 | ⚠️ ambiguous |
| DOD-02 | 0.68 | 0.19 | 0.86 | 2.90 | ⚠️ ambiguous |
| DOD-03 | 0.60 | 0.20 | 0.89 | 2.93 | ok |
| DOD-07 | 0.59 | 0.21 | 0.86 | 2.98 | ok |
| DOD-08 | 0.72 | 0.28 | 0.85 | 2.94 | ⚠️ ambiguous |
| DOD-04 | 0.52 | 0.14 | 0.89 | 2.96 | ok |
| DOD-10 | 0.39 | 0.14 | 0.90 | 2.67 | ok |
| DOD-05 | 0.47 | 0.18 | 0.88 | 2.64 | ok |
| DOD-06 | 0.64 | 0.47 | 0.87 | 2.69 | ⚠️ ambiguous |
| STR-01 | 0.47 | 0.52 | 0.89 | 2.85 | ok |
| STR-02 | 0.49 | 0.36 | 0.93 | 2.99 | ok |
| STR-03 | 0.63 | 0.32 | 0.91 | 2.96 | ⚠️ ambiguous |
| STR-04 | 0.69 | 0.22 | 0.91 | 2.96 | ⚠️ ambiguous |
| STR-07 | 0.71 | 0.21 | 0.91 | 2.95 | ⚠️ ambiguous |
| STR-05 | 0.48 | 0.36 | 0.92 | 2.99 | ok |
| STR-10 | 0.56 | 0.19 | 0.91 | 2.94 | ok |
| STR-06 | 0.53 | 0.36 | 0.90 | 2.98 | ok |
| STR-11 | 0.64 | 0.19 | 0.89 | 2.94 | ⚠️ ambiguous |
| STR-08 | 0.65 | 0.32 | 0.87 | 2.85 | ⚠️ ambiguous |
| FIN-01 | 0.66 | 0.46 | 0.90 | 2.97 | ⚠️ ambiguous |
| FIN-02 | 0.54 | 0.13 | 0.79 | 2.92 | ok |
| FIN-04 | 0.64 | 0.22 | 0.81 | 2.97 | ⚠️ ambiguous |
| FIN-03 | 0.57 | 0.22 | 0.88 | 2.83 | ok |
| STR-09 | 0.54 | 0.32 | 0.89 | 2.70 | ok |
| AIR-01 | 0.44 | 0.15 | 0.88 | 2.60 | ok |
| AIR-02 | 0.53 | 0.26 | 0.88 | 2.62 | ok |
| AIR-03 | 0.56 | 0.56 | 0.88 | 2.49 | ok |
| AIR-04 | 0.68 | 0.18 | 0.78 | 2.65 | ⚠️ ambiguous |
| EBL-01 | 0.70 | 0.28 | 0.67 | 2.96 | ⚠️ ambiguous |
| EBL-02 | 0.59 | 0.58 | 0.90 | 2.93 | ok |
| EBL-03 | 0.59 | 0.21 | 0.79 | 2.48 | ok |
| EBL-05 | 0.57 | 0.15 | 0.88 | 2.77 | ok |
| EBL-04 | 0.59 | 0.78 | 0.89 | 2.61 | ⚠️ bundled |
| CMB-01 | 0.56 | 0.13 | 0.93 | 2.84 | ok |
| CMB-02 | 0.60 | 0.49 | 0.92 | 2.98 | ok |
| CMB-03 | 0.57 | 0.20 | 0.92 | 2.92 | ok |
| CMB-04 | 0.52 | 0.21 | 0.87 | 2.80 | ok |
| CMB-05 | 0.53 | 0.21 | 0.80 | 2.14 | ok |
| SPC-01 | 0.69 | 0.23 | 0.84 | 2.81 | ⚠️ ambiguous |
| SPC-02 | 0.52 | 0.21 | 0.91 | 2.97 | ok |

## Revisão do autor

Três rodadas em 28/09: 72 ACs com 50 sinalizados → 84 com 29 → 84 com 23, e nenhum flag de precisão ou testabilidade na última.
- A maioria dos flags da 1ª rodada era ambiguidade limítrofe causada por vocabulário de jogo de luta fora do glossário do Jev. O `jev-refine` passou a ler a seção `## Glossário` da própria spec (`parseGlossary` em `tools/jev-refine/lib.ts`), o que vale para as próximas features.
- Divididos por comportamentos independentes: CTL-03 (pegar/arremessar/largar), MOV-06/MOV-17, MOV-13/MOV-18, GRD-02/GRD-07, PAR-02/PAR-09, PAR-03/PAR-10, DOD-01/DOD-09, DOD-04/DOD-10, STR-05/STR-10, STR-06/STR-11, FIN-02/FIN-04, EBL-03/EBL-05, CMB-04/CMB-05. Ganharam precisão GRD-03 (lado do atacante), PAR-05 (guarda depois da janela), STR-04/STR-07 (queda em tempo de jogo).

Aceitos como estão:
- **MOV-04 (bundled)**: é a tabela de sequências do grafo, um único dado conferido por um teste de tabela.
- **EBL-04 (bundled)**: um golpe, dois números do mesmo resultado (dano cheio + 40 de estrutura).
- **ambiguous 0,60–0,77** nos demais: termos já definidos no glossário da spec; cada AC tem um único teste óbvio.
