# Refinamento Jev — fundacao-harness-jev

Gerado por `jev-refine` (Jev, TypeSafe System One). Consultivo (AD-007): cada AC sinalizado é reescrito ou registrado em Assumptions.
Limiares: ambiguous > 0,6 · bundled > 0,6 · testable < 0,6 · precision < 2 (escala 0–3).

**24 ACs, 8 sinalizados.**

| AC | ambiguous | bundled | testable | precision | resultado |
| --- | --- | --- | --- | --- | --- |
| FND-01 | 0.33 | 0.15 | 0.93 | 2.95 | ok |
| FND-02 | 0.32 | 0.22 | 0.81 | 2.96 | ok |
| FND-20 | 0.59 | 0.24 | 0.78 | 2.45 | ok |
| FND-03 | 0.23 | 0.13 | 0.95 | 3.00 | ok |
| FND-21 | 0.32 | 0.14 | 0.95 | 2.99 | ok |
| FND-04 | 0.50 | 0.19 | 0.91 | 2.96 | ok |
| FND-05 | 0.32 | 0.47 | 0.95 | 2.94 | ok |
| FND-06 | 0.44 | 0.59 | 0.95 | 2.99 | ok |
| FND-07 | 0.35 | 0.66 | 0.95 | 2.98 | ⚠️ bundled |
| FND-08 | 0.46 | 0.50 | 0.93 | 2.98 | ok |
| FND-09 | 0.56 | 0.56 | 0.83 | 2.58 | ok |
| FND-22 | 0.58 | 0.42 | 0.70 | 2.02 | ok |
| FND-10 | 0.43 | 0.16 | 0.91 | 2.99 | ok |
| FND-23 | 0.54 | 0.83 | 0.62 | 1.91 | ⚠️ bundled, precision |
| FND-11 | 0.48 | 0.82 | 0.87 | 2.89 | ⚠️ bundled |
| FND-12 | 0.47 | 0.59 | 0.82 | 2.68 | ok |
| FND-13 | 0.71 | 0.49 | 0.69 | 2.28 | ⚠️ ambiguous |
| FND-14 | 0.48 | 0.74 | 0.56 | 2.95 | ⚠️ bundled, testable |
| FND-15 | 0.61 | 0.68 | 0.64 | 2.59 | ⚠️ ambiguous, bundled |
| FND-16 | 0.55 | 0.34 | 0.79 | 2.77 | ok |
| FND-24 | 0.67 | 0.55 | 0.63 | 2.46 | ⚠️ ambiguous |
| FND-17 | 0.56 | 0.45 | 0.83 | 2.66 | ok |
| FND-18 | 0.37 | 0.57 | 0.74 | 2.60 | ok |
| FND-19 | 0.23 | 0.11 | 0.53 | 2.95 | ⚠️ testable |

## Revisão do autor (24/09)

Primeira rodada (limiares 0,5): 15 de 19 sinalizados. Reescritos a partir dela: FND-02 e FND-03 divididos (+FND-20, FND-21); FND-08 com a chamada `onEnemyDied` e o evento do snapshot; FND-09 dividido (+FND-22 `step`); FND-11 dividido (+FND-23 pipeline); FND-13 com o conteúdo da linha; FND-14 com os limiares calibrados; FND-16 dividido (+FND-24).

Flags restantes, aceitos:
- FND-07, FND-11, FND-14, FND-15, FND-23 (bundled 0,66–0,83): cada um é uma única guarda ou regra (entrada inválida, código de saída, OR de limiares, pular sem chave, pipeline do smoke) verificada por um único teste.
- FND-13, FND-24 (ambiguous 0,67–0,71): o formato da linha está explícito; os testes com `fetch` falso fixam a saída.
- FND-19 (testable 0,53): um teste que lê o `.gitignore` resolve; o Jev não tem esse contexto.
