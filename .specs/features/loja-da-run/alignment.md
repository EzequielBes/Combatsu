# Alinhamento Jev — loja-da-run

Gerado por `jev-align` (Jev, TypeSafe System One). Consultivo: task sinalizada é reescrita ou justificada; story sinalizada ganha feedback ou escolha no polimento.
Limiares: covers < 0,6 · atomic < 0,6 · choice < 0,6 · feedback < 2 (escala 0–3).

## Tasks × ACs

**14 tasks, 2 sinalizadas.**

| Task | covers | atomic | resultado |
| --- | --- | --- | --- |
| T1 | 0.79 | 0.88 | ok |
| T2 | 0.74 | 0.88 | ok |
| T3 | 0.56 | 0.84 | ⚠️ covers |
| T4 | 0.77 | 0.81 | ok |
| T5 | 0.62 | 0.87 | ok |
| T6 | 0.83 | 0.88 | ok |
| T7 | 0.76 | 0.85 | ok |
| T8 | 0.71 | 0.77 | ok |
| T9 | 0.75 | 0.82 | ok |
| T10 | 0.67 | 0.84 | ok |
| T11 | 0.67 | 0.65 | ok |
| T12 | 0.73 | 0.79 | ok |
| T13 | 0.84 | 0.74 | ok |
| T14 | 0.35 | 0.68 | ⚠️ covers |

## Stories × diversão

**4 stories, 0 sinalizadas.**

| Story | choice | feedback | resultado |
| --- | --- | --- | --- |
| P1: Modificadores de atributo com teto | 0.93 | 2.27 | ok |
| P1: Loja entre rodadas com 3 ofertas | 0.95 | 2.93 | ok |
| P2: Reroll das ofertas | 0.90 | 2.70 | ok |
| P2: Navegação por teclado | 0.84 | 2.45 | ok |

## Revisão do autor

Rodada 1 (25/09): 14 de 14 tasks com `covers` baixo e a story de Reroll com `feedback` 1,28. Causa: o "Done when" das tasks não dizia como cada AC citado seria conferido, e o reroll não tinha retorno visível. Correção: cada task ganhou uma linha "`<ID>` conferido: …" por AC citado, e a spec ganhou a direção de feel do reroll e o SHOP-46 (dica com o novo custo).

Rodada 2: 2 de 14 tasks sinalizadas, 0 stories. Aceitas:
- **T3 (covers 0,56)**: é a metade pura de MOD-10/MOD-11 (`Health.setMax`/`reset`); a ligação com a compra e a nova run está em T8, que também cita os dois.
- **T14 (covers 0,35)**: smoke ponta a ponta que cita 24 ACs; cada um já tem teste unitário na fase 1, e o smoke confere o caminho vivo de cada um pelo snapshot.
