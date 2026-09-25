# Refinamento Jev — loja-da-run

Gerado por `jev-refine` (Jev, TypeSafe System One). Consultivo (AD-007): cada AC sinalizado é reescrito ou registrado em Assumptions.
Limiares: ambiguous > 0,6 · bundled > 0,6 · testable < 0,6 · precision < 2 (escala 0–3).

**56 ACs, 18 sinalizados.**

| AC | ambiguous | bundled | testable | precision | resultado |
| --- | --- | --- | --- | --- | --- |
| MOD-01 | 0.49 | 0.18 | 0.91 | 2.97 | ok |
| MOD-02 | 0.46 | 0.53 | 0.94 | 2.92 | ok |
| MOD-03 | 0.57 | 0.58 | 0.93 | 2.98 | ok |
| MOD-04 | 0.51 | 0.14 | 0.95 | 2.98 | ok |
| MOD-11 | 0.64 | 0.27 | 0.87 | 2.40 | ⚠️ ambiguous |
| MOD-05 | 0.54 | 0.23 | 0.90 | 2.84 | ok |
| MOD-06 | 0.43 | 0.13 | 0.94 | 2.97 | ok |
| MOD-07 | 0.41 | 0.14 | 0.95 | 2.98 | ok |
| MOD-08 | 0.58 | 0.15 | 0.91 | 2.98 | ok |
| MOD-12 | 0.47 | 0.18 | 0.88 | 2.99 | ok |
| MOD-09 | 0.59 | 0.46 | 0.93 | 2.68 | ok |
| MOD-10 | 0.44 | 0.14 | 0.93 | 3.00 | ok |
| SHOP-01 | 0.54 | 0.15 | 0.92 | 2.98 | ok |
| SHOP-32 | 0.51 | 0.26 | 0.91 | 2.97 | ok |
| SHOP-02 | 0.45 | 0.13 | 0.80 | 2.91 | ok |
| SHOP-33 | 0.49 | 0.30 | 0.89 | 2.62 | ok |
| SHOP-03 | 0.54 | 0.30 | 0.91 | 2.82 | ok |
| SHOP-35 | 0.61 | 0.19 | 0.86 | 2.90 | ⚠️ ambiguous |
| SHOP-04 | 0.54 | 0.27 | 0.79 | 2.46 | ok |
| SHOP-05 | 0.73 | 0.21 | 0.85 | 2.81 | ⚠️ ambiguous |
| SHOP-36 | 0.60 | 0.15 | 0.86 | 2.58 | ok |
| SHOP-37 | 0.63 | 0.18 | 0.77 | 2.29 | ⚠️ ambiguous |
| SHOP-06 | 0.49 | 0.74 | 0.92 | 2.95 | ⚠️ bundled |
| SHOP-38 | 0.54 | 0.20 | 0.90 | 2.98 | ok |
| SHOP-07 | 0.59 | 0.29 | 0.87 | 2.20 | ok |
| SHOP-39 | 0.62 | 0.16 | 0.86 | 2.41 | ⚠️ ambiguous |
| SHOP-18 | 0.62 | 0.49 | 0.87 | 2.91 | ⚠️ ambiguous |
| SHOP-08 | 0.57 | 0.32 | 0.86 | 2.43 | ok |
| SHOP-09 | 0.46 | 0.16 | 0.85 | 2.86 | ok |
| SHOP-40 | 0.61 | 0.82 | 0.84 | 2.35 | ⚠️ ambiguous, bundled |
| SHOP-45 | 0.63 | 0.22 | 0.89 | 1.86 | ⚠️ ambiguous, precision |
| SHOP-19 | 0.40 | 0.18 | 0.93 | 2.64 | ok |
| SHOP-41 | 0.60 | 0.13 | 0.87 | 2.84 | ok |
| SHOP-42 | 0.51 | 0.78 | 0.86 | 2.97 | ⚠️ bundled |
| SHOP-43 | 0.58 | 0.21 | 0.90 | 2.78 | ok |
| SHOP-10 | 0.65 | 0.40 | 0.89 | 2.69 | ⚠️ ambiguous |
| SHOP-11 | 0.68 | 0.52 | 0.88 | 2.48 | ⚠️ ambiguous |
| SHOP-13 | 0.54 | 0.63 | 0.91 | 2.91 | ⚠️ bundled |
| SHOP-12 | 0.30 | 0.15 | 0.95 | 2.98 | ok |
| SHOP-14 | 0.66 | 0.34 | 0.88 | 2.55 | ⚠️ ambiguous |
| SHOP-15 | 0.64 | 0.48 | 0.88 | 2.39 | ⚠️ ambiguous |
| SHOP-44 | 0.71 | 0.31 | 0.86 | 2.66 | ⚠️ ambiguous |
| SHOP-20 | 0.53 | 0.27 | 0.75 | 2.28 | ok |
| SHOP-21 | 0.64 | 0.42 | 0.72 | 2.41 | ⚠️ ambiguous |
| SHOP-22 | 0.62 | 0.73 | 0.91 | 2.89 | ⚠️ ambiguous, bundled |
| SHOP-23 | 0.52 | 0.20 | 0.91 | 2.98 | ok |
| SHOP-24 | 0.53 | 0.49 | 0.77 | 2.30 | ok |
| SHOP-16 | 0.49 | 0.60 | 0.89 | 2.64 | ok |
| SHOP-25 | 0.60 | 0.14 | 0.91 | 2.87 | ok |
| SHOP-17 | 0.52 | 0.15 | 0.92 | 2.98 | ok |
| SHOP-26 | 0.47 | 0.48 | 0.91 | 2.50 | ok |
| SHOP-27 | 0.53 | 0.14 | 0.88 | 2.97 | ok |
| SHOP-28 | 0.49 | 0.22 | 0.91 | 2.91 | ok |
| SHOP-29 | 0.54 | 0.22 | 0.91 | 2.91 | ok |
| SHOP-30 | 0.59 | 0.21 | 0.78 | 2.21 | ok |
| SHOP-31 | 0.36 | 0.56 | 0.79 | 2.05 | ok |

## Revisão do autor

Três rodadas em 25/09: 43 ACs com 16 sinalizados → 56 ACs com 20 → 56 com 18. Da rodada 1 para a 2, todo AC `bundled` com comportamentos independentes (abrir loja + evento, compra + efeito + evento, streams) foi dividido. Na rodada 2 ficou claro que o Jev só recebe a story e o AC, não o cabeçalho da seção: a definição de "compra válida" foi levada para dentro de SHOP-45 e dos ACs de recusa, o que tirou os flags de precisão de SHOP-42 e SHOP-24.

Aceitos como estão (revisão do autor):
- **ambiguous 0,61–0,73** (MOD-11, SHOP-05, SHOP-10, SHOP-11, SHOP-14, SHOP-15, SHOP-18, SHOP-21, SHOP-35, SHOP-37, SHOP-39, SHOP-44): valores exatos já estão no AC; o que resta são termos do jogo (`wallet`, `shop`, `events`) que o glossário do Jev não define. Cada um tem um único teste óbvio.
- **SHOP-45 precision 1,86**: o resultado "that offer SHALL be bought" é definido pelos ACs SHOP-19, SHOP-41, SHOP-42 e SHOP-43, que o testam valor a valor.
- **bundled** SHOP-06 (quantidade + ids distintos), SHOP-13 (carteira + evento), SHOP-42 (flag + texto da carta), SHOP-22 (campos do snapshot), SHOP-40 (ondas + drops): cada par é o mesmo resultado visto em dois lugares; um teste só confere os dois.
