# Alinhamento Jev — energia-e-tecnicas

Gerado por `jev-align` (Jev, TypeSafe System One). Consultivo: task sinalizada é reescrita ou justificada; story sinalizada ganha feedback ou escolha no polimento.
Limiares: covers < 0,6 · atomic < 0,6 · choice < 0,6 · feedback < 2 (escala 0–3).

## Tasks × ACs

**31 tasks, 9 sinalizadas.**

| Task | covers | atomic | resultado |
| --- | --- | --- | --- |
| T1 | 0.75 | 0.86 | ok |
| T2 | 0.67 | 0.89 | ok |
| T3 | 0.70 | 0.84 | ok |
| T4 | 0.71 | 0.84 | ok |
| T5 | 0.42 | 0.81 | ⚠️ covers |
| T6 | 0.80 | 0.81 | ok |
| T7 | 0.82 | 0.88 | ok |
| T8 | 0.53 | 0.85 | ⚠️ covers |
| T9 | 0.60 | 0.84 | ok |
| T10 | 0.79 | 0.87 | ok |
| T11 | 0.83 | 0.88 | ok |
| T12 | 0.76 | 0.88 | ok |
| T13 | 0.58 | 0.81 | ⚠️ covers |
| T14 | 0.57 | 0.80 | ⚠️ covers |
| T15 | 0.32 | 0.76 | ⚠️ covers |
| T16 | 0.56 | 0.65 | ⚠️ covers |
| T17 | 0.77 | 0.65 | ok |
| T18 | 0.80 | 0.87 | ok |
| T19 | 0.69 | 0.81 | ok |
| T20 | 0.58 | 0.72 | ⚠️ covers |
| T21 | 0.51 | 0.74 | ⚠️ covers |
| T22 | 0.60 | 0.80 | ok |
| T23 | 0.76 | 0.84 | ok |
| T24 | 0.65 | 0.80 | ok |
| T25 | 0.44 | 0.83 | ⚠️ covers |
| T26 | 0.72 | 0.88 | ok |
| T27 | 0.74 | 0.85 | ok |
| T28 | 0.72 | 0.86 | ok |
| T29 | 0.75 | 0.68 | ok |
| T30 | 0.62 | 0.74 | ok |
| T31 | 0.64 | 0.60 | ok |

## Stories × diversão

**10 stories, 1 sinalizadas.**

| Story | choice | feedback | resultado |
| --- | --- | --- | --- |
| P1: Energia amaldiçoada e slots | 0.88 | 3.00 | ok |
| P1: Técnicas e energia na loja | 0.92 | 2.97 | ok |
| P1: Conjuração — selo, carga e soltura | 0.90 | 3.00 | ok |
| P1: Punho Divergente | 0.84 | 2.95 | ok |
| P1: Kokusen (Black Flash) | 0.92 | 3.00 | ok |
| P1: Reversão de Técnica: Vermelho | 0.87 | 3.00 | ok |
| P2: Técnica Amplificada: Azul | 0.87 | 2.95 | ok |
| P2: Desmantelar | 0.64 | 2.96 | ok |
| P2: Laboratório de efeitos | 0.89 | 2.99 | ok |
| P1: Invariantes dos efeitos de técnica | 0.24 | 2.39 | ⚠️ choice |

## Revisão do autor

Rodada 1 (26/09): 9 de 31 tasks com `covers` < 0,6 e 1 story com `choice` baixo. Todas aceitas, pelo mesmo motivo: o AC é dividido de propósito entre tasks.
- **T5 (TFX-05), T8 (KOK-09/10), T21 (TSH-05)**: a task é a metade pura (regra + teste unitário); a ligação no jogo está em T23/T24, T24 e T6/T21, que citam o mesmo AC.
- **T13 (TFX-01), T14/T15 (CAST-18/22), T16 (TFX-01)**: a arte é dividida por técnica; CAST-18 só fecha com T14 + T15 e TFX-01 com T13 + T16.
- **T20 (TFX-03/09), T25 (TFX-04)**: invariantes valem para todas as técnicas; o registro e o limite nascem nessas tasks e cada técnica os usa; a prova ponta a ponta é o `fx.live` em T30.
- **Story "Invariantes dos efeitos" (`choice` 0,24)**: é uma regra técnica (paleta, grade, limpeza, fallback), não uma escolha do jogador; o feedback dela é o próprio efeito das outras stories.
