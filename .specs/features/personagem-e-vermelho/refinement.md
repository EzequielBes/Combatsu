# Refinamento Jev — personagem-e-vermelho

Gerado por `jev-refine` (Jev, TypeSafe System One). Consultivo (AD-007): cada AC sinalizado é reescrito ou registrado em Assumptions.
Limiares: ambiguous > 0,6 · bundled > 0,6 · testable < 0,6 · precision < 2 (escala 0–3).

**22 ACs, 18 sinalizados.**

| AC | ambiguous | bundled | testable | precision | resultado |
| --- | --- | --- | --- | --- | --- |
| SPF-01 | 0.52 | 0.16 | 0.91 | 2.89 | ok |
| SPF-02 | 0.69 | 0.19 | 0.86 | 2.97 | ⚠️ ambiguous |
| SPF-03 | 0.74 | 0.22 | 0.81 | 2.92 | ⚠️ ambiguous |
| SPF-04 | 0.77 | 0.18 | 0.63 | 2.34 | ⚠️ ambiguous |
| SPF-05 | 0.53 | 0.13 | 0.82 | 2.80 | ok |
| SPF-06 | 0.66 | 0.18 | 0.68 | 2.63 | ⚠️ ambiguous |
| SPF-07 | 0.67 | 0.19 | 0.75 | 2.81 | ⚠️ ambiguous |
| RDA-01 | 0.51 | 0.52 | 0.93 | 2.98 | ok |
| RDA-02 | 0.73 | 0.32 | 0.66 | 2.70 | ⚠️ ambiguous |
| RDA-03 | 0.65 | 0.56 | 0.79 | 2.77 | ⚠️ ambiguous |
| RDA-04 | 0.62 | 0.19 | 0.87 | 2.93 | ⚠️ ambiguous |
| RDA-05 | 0.67 | 0.18 | 0.60 | 2.25 | ⚠️ ambiguous |
| RDA-06 | 0.70 | 0.21 | 0.66 | 1.98 | ⚠️ ambiguous, precision |
| RDA-07 | 0.59 | 0.48 | 0.74 | 2.78 | ok |
| RDA-08 | 0.69 | 0.37 | 0.86 | 2.93 | ⚠️ ambiguous |
| RDA-09 | 0.61 | 0.18 | 0.88 | 2.76 | ⚠️ ambiguous |
| RDA-10 | 0.69 | 0.27 | 0.80 | 2.74 | ⚠️ ambiguous |
| RDA-11 | 0.64 | 0.14 | 0.85 | 2.85 | ⚠️ ambiguous |
| RDA-12 | 0.67 | 0.53 | 0.79 | 2.74 | ⚠️ ambiguous |
| RDA-13 | 0.72 | 0.17 | 0.55 | 2.16 | ⚠️ ambiguous, testable |
| RDA-14 | 0.69 | 0.32 | 0.72 | 2.73 | ⚠️ ambiguous |
| RDA-15 | 0.67 | 0.24 | 0.85 | 2.88 | ⚠️ ambiguous |

## Revisão do autor (02/10)

**1ª rodada:** 21 ACs, 17 sinalizados. Mudanças:
- RDA-05, RDA-06, RDA-13 e EDG-01 passaram a ler valores do snapshot (`fx.red.glowColor`, `fx.red.glow`, `fx.red.screenFlashColor`, `fx.red.glow.active`).
- RDA-09 ganhou a regra exata de "atrás" (o sinal de `x − player.x` contra o `facing`).
- RDA-13 foi dividido em dois: a cor fica no RDA-13 e a duração foi para o RDA-15.

**3ª rodada:** 22 ACs. Sobram dois sinalizados além de `ambiguous`:
- **RDA-06** (precision 1,98): o valor esperado está fechado (`{ active: true, color: PALETTE.t }`). A nota vem do termo "renderer WebGL", que o smoke garante porque o Edge headless usa WebGL.
- **RDA-13** (testable 0,55): o RDA-05 tem a mesma forma (snapshot = `PALETTE.t`) e passou sem flag. O sinal oscila perto do limiar.

Os dois foram aceitos. Os demais `ambiguous` (0,6–0,75) são vocabulário do jogo com valores explícitos, o mesmo padrão das features anteriores.
