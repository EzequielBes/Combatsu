# Refinamento Jev — run-e-rodadas

Gerado por `jev-refine` (Jev, TypeSafe System One). Consultivo (AD-007): cada AC sinalizado é reescrito ou registrado em Assumptions.
Limiares: ambiguous > 0,6 · bundled > 0,6 · testable < 0,6 · precision < 2 (escala 0–3).

**31 ACs, 9 sinalizados.**

| AC | ambiguous | bundled | testable | precision | resultado |
| --- | --- | --- | --- | --- | --- |
| RUN-01 | 0.39 | 0.74 | 0.91 | 2.90 | ⚠️ bundled |
| RUN-02 | 0.40 | 0.53 | 0.91 | 2.92 | ok |
| RUN-03 | 0.47 | 0.22 | 0.89 | 2.57 | ok |
| RUN-04 | 0.46 | 0.63 | 0.91 | 2.50 | ⚠️ bundled |
| RUN-05 | 0.46 | 0.34 | 0.91 | 2.96 | ok |
| RUN-06 | 0.50 | 0.27 | 0.83 | 2.77 | ok |
| RUN-10 | 0.46 | 0.19 | 0.91 | 2.97 | ok |
| RUN-07 | 0.48 | 0.55 | 0.91 | 2.69 | ok |
| RUN-08 | 0.55 | 0.35 | 0.90 | 2.53 | ok |
| RUN-09 | 0.54 | 0.22 | 0.87 | 2.60 | ok |
| WAVE-01 | 0.26 | 0.17 | 0.95 | 3.00 | ok |
| WAVE-02 | 0.62 | 0.56 | 0.80 | 2.77 | ⚠️ ambiguous |
| WAVE-03 | 0.58 | 0.17 | 0.85 | 2.88 | ok |
| WAVE-04 | 0.66 | 0.36 | 0.83 | 2.88 | ⚠️ ambiguous |
| WAVE-05 | 0.39 | 0.24 | 0.86 | 2.65 | ok |
| WAVE-06 | 0.63 | 0.42 | 0.85 | 2.51 | ⚠️ ambiguous |
| WAVE-08 | 0.62 | 0.40 | 0.87 | 2.96 | ⚠️ ambiguous |
| WAVE-07 | 0.63 | 0.22 | 0.87 | 2.79 | ⚠️ ambiguous |
| DIF-01 | 0.34 | 0.17 | 0.96 | 2.99 | ok |
| DIF-05 | 0.32 | 0.14 | 0.95 | 2.99 | ok |
| DIF-06 | 0.38 | 0.35 | 0.93 | 2.99 | ok |
| DIF-02 | 0.59 | 0.62 | 0.83 | 2.32 | ⚠️ bundled |
| DIF-03 | 0.51 | 0.30 | 0.82 | 2.40 | ok |
| DIF-04 | 0.57 | 0.35 | 0.85 | 2.27 | ok |
| RHUD-01 | 0.51 | 0.41 | 0.89 | 2.69 | ok |
| RHUD-02 | 0.47 | 0.37 | 0.86 | 2.97 | ok |
| RHUD-03 | 0.50 | 0.19 | 0.85 | 2.28 | ok |
| RHUD-04 | 0.60 | 0.44 | 0.54 | 1.87 | ⚠️ testable, precision |
| RHUD-07 | 0.37 | 0.16 | 0.91 | 2.99 | ok |
| RHUD-05 | 0.47 | 0.34 | 0.82 | 2.91 | ok |
| RHUD-06 | 0.48 | 0.47 | 0.83 | 2.89 | ok |

## Revisão do autor (24/09)

Primeira rodada (limiares 0,5): 16 de 26 sinalizados. Reescritos a partir dela: RUN-06 dividido em RUN-06 + RUN-10; RUN-07 e RUN-08 com eventos e inputs enumerados; WAVE-02 com a fórmula do rodízio; WAVE-04 e WAVE-07 com o tempo e a sequência definidos; WAVE-06 dividido em WAVE-06 + WAVE-08; DIF-01 dividido em DIF-01, DIF-05 e DIF-06; DIF-02 virou uma propriedade monotônica; DIF-04 aponta o campo do snapshot; RHUD-04 dividido em RHUD-04 + RHUD-07.

Flags restantes, aceitos:
- RUN-01, RUN-04 (bundled 0,77 / 0,62): cada um é uma única transição de estado cujo resultado tem dois campos; um teste só verifica os dois.
- WAVE-02, 04, 06, 07, 08 (ambiguous 0,61–0,67, faixa limítrofe): as fórmulas e os valores estão explícitos; os testes de `waves.test.ts` fixam os números.
- RHUD-04 (testable 0,55): a regra de paleta já tem teste automatizado no repo (`tests/game/art.test.ts`); o Jev não tem esse contexto.
