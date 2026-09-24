# Refinamento Jev — run-e-rodadas

Gerado por `jev-refine` (Jev, TypeSafe System One). Consultivo (AD-007): cada AC sinalizado é reescrito ou registrado em Assumptions.
Limiares: ambiguous > 0,6 · bundled > 0,6 · testable < 0,6 · precision < 2 (escala 0–3).

**31 ACs, 8 sinalizados.**

| AC | ambiguous | bundled | testable | precision | resultado |
| --- | --- | --- | --- | --- | --- |
| RUN-01 | 0.41 | 0.77 | 0.91 | 2.89 | ⚠️ bundled |
| RUN-02 | 0.39 | 0.51 | 0.91 | 2.91 | ok |
| RUN-03 | 0.47 | 0.23 | 0.89 | 2.62 | ok |
| RUN-04 | 0.45 | 0.62 | 0.91 | 2.45 | ⚠️ bundled |
| RUN-05 | 0.47 | 0.36 | 0.91 | 2.96 | ok |
| RUN-06 | 0.47 | 0.27 | 0.85 | 2.79 | ok |
| RUN-10 | 0.46 | 0.18 | 0.91 | 2.97 | ok |
| RUN-07 | 0.47 | 0.60 | 0.91 | 2.60 | ok |
| RUN-08 | 0.56 | 0.35 | 0.89 | 2.50 | ok |
| RUN-09 | 0.51 | 0.22 | 0.88 | 2.55 | ok |
| WAVE-01 | 0.28 | 0.17 | 0.94 | 3.00 | ok |
| WAVE-02 | 0.62 | 0.58 | 0.81 | 2.70 | ⚠️ ambiguous |
| WAVE-03 | 0.58 | 0.16 | 0.85 | 2.86 | ok |
| WAVE-04 | 0.67 | 0.35 | 0.83 | 2.92 | ⚠️ ambiguous |
| WAVE-05 | 0.41 | 0.24 | 0.86 | 2.64 | ok |
| WAVE-06 | 0.62 | 0.48 | 0.86 | 2.52 | ⚠️ ambiguous |
| WAVE-08 | 0.63 | 0.46 | 0.87 | 2.95 | ⚠️ ambiguous |
| WAVE-07 | 0.61 | 0.23 | 0.86 | 2.71 | ⚠️ ambiguous |
| DIF-01 | 0.31 | 0.16 | 0.96 | 2.99 | ok |
| DIF-05 | 0.30 | 0.15 | 0.96 | 2.99 | ok |
| DIF-06 | 0.37 | 0.31 | 0.93 | 2.99 | ok |
| DIF-02 | 0.60 | 0.49 | 0.83 | 2.35 | ok |
| DIF-03 | 0.53 | 0.31 | 0.80 | 2.37 | ok |
| DIF-04 | 0.59 | 0.35 | 0.85 | 2.29 | ok |
| RHUD-01 | 0.49 | 0.44 | 0.88 | 2.73 | ok |
| RHUD-02 | 0.50 | 0.39 | 0.84 | 2.98 | ok |
| RHUD-03 | 0.50 | 0.20 | 0.84 | 2.29 | ok |
| RHUD-04 | 0.60 | 0.42 | 0.55 | 1.90 | ⚠️ testable, precision |
| RHUD-07 | 0.39 | 0.18 | 0.91 | 2.99 | ok |
| RHUD-05 | 0.43 | 0.35 | 0.83 | 2.94 | ok |
| RHUD-06 | 0.46 | 0.50 | 0.81 | 2.89 | ok |

## Revisão do autor (24/09)

Primeira rodada (limiares 0,5): 16 de 26 sinalizados. Reescritos a partir dela: RUN-06 dividido em RUN-06 + RUN-10; RUN-07 e RUN-08 com eventos e inputs enumerados; WAVE-02 com a fórmula do rodízio; WAVE-04 e WAVE-07 com o tempo e a sequência definidos; WAVE-06 dividido em WAVE-06 + WAVE-08; DIF-01 dividido em DIF-01, DIF-05 e DIF-06; DIF-02 virou uma propriedade monotônica; DIF-04 aponta o campo do snapshot; RHUD-04 dividido em RHUD-04 + RHUD-07.

Flags restantes, aceitos:
- RUN-01, RUN-04 (bundled 0,77 / 0,62): cada um é uma única transição de estado cujo resultado tem dois campos; um teste só verifica os dois.
- WAVE-02, 04, 06, 07, 08 (ambiguous 0,61–0,67, faixa limítrofe): as fórmulas e os valores estão explícitos; os testes de `waves.test.ts` fixam os números.
- RHUD-04 (testable 0,55): a regra de paleta já tem teste automatizado no repo (`tests/game/art.test.ts`); o Jev não tem esse contexto.
