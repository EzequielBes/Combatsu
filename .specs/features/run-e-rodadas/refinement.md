# Refinamento Jev — run-e-rodadas

Gerado por `jev-refine` (Jev, TypeSafe System One). Consultivo (AD-007): cada AC sinalizado é reescrito ou registrado em Assumptions.
Limiares: ambiguous > 0,6 · bundled > 0,6 · testable < 0,6 · precision < 2 (escala 0–3).

**34 ACs, 7 sinalizados.**

| AC | ambiguous | bundled | testable | precision | resultado |
| --- | --- | --- | --- | --- | --- |
| RUN-01 | 0.42 | 0.75 | 0.91 | 2.89 | ⚠️ bundled |
| RUN-02 | 0.40 | 0.53 | 0.92 | 2.90 | ok |
| RUN-03 | 0.50 | 0.22 | 0.89 | 2.62 | ok |
| RUN-04 | 0.45 | 0.64 | 0.91 | 2.47 | ⚠️ bundled |
| RUN-05 | 0.45 | 0.37 | 0.92 | 2.96 | ok |
| RUN-06 | 0.49 | 0.25 | 0.85 | 2.76 | ok |
| RUN-10 | 0.46 | 0.18 | 0.92 | 2.97 | ok |
| RUN-11 | 0.60 | 0.23 | 0.87 | 2.77 | ok |
| RUN-07 | 0.48 | 0.55 | 0.91 | 2.67 | ok |
| RUN-08 | 0.57 | 0.35 | 0.89 | 2.51 | ok |
| RUN-09 | 0.53 | 0.24 | 0.87 | 2.48 | ok |
| WAVE-01 | 0.29 | 0.17 | 0.94 | 2.99 | ok |
| WAVE-02 | 0.64 | 0.53 | 0.82 | 2.71 | ⚠️ ambiguous |
| WAVE-03 | 0.58 | 0.17 | 0.86 | 2.87 | ok |
| WAVE-04 | 0.66 | 0.37 | 0.83 | 2.91 | ⚠️ ambiguous |
| WAVE-05 | 0.42 | 0.25 | 0.86 | 2.64 | ok |
| WAVE-06 | 0.62 | 0.40 | 0.86 | 2.45 | ⚠️ ambiguous |
| WAVE-08 | 0.64 | 0.45 | 0.87 | 2.95 | ⚠️ ambiguous |
| WAVE-07 | 0.60 | 0.21 | 0.87 | 2.77 | ok |
| WAVE-09 | 0.52 | 0.58 | 0.87 | 2.94 | ok |
| DIF-01 | 0.35 | 0.16 | 0.96 | 2.99 | ok |
| DIF-05 | 0.30 | 0.15 | 0.96 | 2.98 | ok |
| DIF-06 | 0.34 | 0.39 | 0.94 | 2.99 | ok |
| DIF-02 | 0.59 | 0.50 | 0.82 | 2.31 | ok |
| DIF-03 | 0.53 | 0.29 | 0.81 | 2.32 | ok |
| DIF-04 | 0.56 | 0.39 | 0.86 | 2.28 | ok |
| RHUD-01 | 0.49 | 0.45 | 0.89 | 2.70 | ok |
| RHUD-02 | 0.48 | 0.40 | 0.86 | 2.97 | ok |
| RHUD-03 | 0.52 | 0.21 | 0.84 | 2.39 | ok |
| RHUD-04 | 0.60 | 0.43 | 0.54 | 1.86 | ⚠️ testable, precision |
| RHUD-07 | 0.36 | 0.17 | 0.92 | 2.99 | ok |
| RHUD-08 | 0.47 | 0.40 | 0.89 | 2.89 | ok |
| RHUD-05 | 0.47 | 0.34 | 0.84 | 2.93 | ok |
| RHUD-06 | 0.45 | 0.51 | 0.81 | 2.88 | ok |

## Revisão do autor (24/09)

Primeira rodada (limiares 0,5): 16 de 26 sinalizados. Reescritos a partir dela: RUN-06 dividido em RUN-06 + RUN-10; RUN-07 e RUN-08 com eventos e inputs enumerados; WAVE-02 com a fórmula do rodízio; WAVE-04 e WAVE-07 com o tempo e a sequência definidos; WAVE-06 dividido em WAVE-06 + WAVE-08; DIF-01 dividido em DIF-01, DIF-05 e DIF-06; DIF-02 virou uma propriedade monotônica; DIF-04 aponta o campo do snapshot; RHUD-04 dividido em RHUD-04 + RHUD-07.

Flags restantes, aceitos:
- RUN-01, RUN-04 (bundled 0,77 / 0,62): cada um é uma única transição de estado cujo resultado tem dois campos; um teste só verifica os dois.
- WAVE-02, 04, 06, 07, 08 (ambiguous 0,61–0,67, faixa limítrofe): as fórmulas e os valores estão explícitos; os testes de `waves.test.ts` fixam os números.
- RHUD-04 (testable 0,55): a regra de paleta já tem teste automatizado no repo (`tests/game/art.test.ts`); o Jev não tem esse contexto.

Rodada de 24/09 depois do Design (ferramenta oficial `tools/jev-refine.mjs`): 34 ACs, 7 sinalizados. Os ACs novos RUN-11, WAVE-09 e RHUD-08 saíram `ok`. Os 7 flags são os mesmos já aceitos acima (RUN-01/04 bundled; WAVE-02/04/06/08 ambiguous limítrofe; RHUD-04 testable).
