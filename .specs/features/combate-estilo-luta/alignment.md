# Alinhamento Jev — combate-estilo-luta

Gerado por `jev-align` (Jev, TypeSafe System One). Consultivo: task sinalizada é reescrita ou justificada; story sinalizada ganha feedback ou escolha no polimento.
Limiares: covers < 0,6 · atomic < 0,6 · choice < 0,6 · feedback < 2 (escala 0–3).

## Tasks × ACs

**21 tasks, 10 sinalizadas.**

| Task | covers | atomic | resultado |
| --- | --- | --- | --- |
| T1 | 0.50 | 0.85 | ⚠️ covers |
| T2 | 0.66 | 0.85 | ok |
| T3 | 0.70 | 0.81 | ok |
| T4 | 0.67 | 0.87 | ok |
| T5 | 0.76 | 0.86 | ok |
| T6 | 0.77 | 0.85 | ok |
| T7 | 0.68 | 0.71 | ok |
| T8 | 0.26 | 0.76 | ⚠️ covers |
| T9 | 0.66 | 0.56 | ⚠️ atomic |
| T10 | 0.46 | 0.60 | ⚠️ covers |
| T11 | 0.72 | 0.77 | ok |
| T12 | 0.72 | 0.73 | ok |
| T13 | 0.29 | 0.76 | ⚠️ covers |
| T14 | 0.69 | 0.66 | ok |
| T15 | 0.67 | 0.88 | ok |
| T16 | 0.57 | 0.87 | ⚠️ covers |
| T17 | 0.72 | 0.88 | ok |
| T18 | 0.35 | 0.80 | ⚠️ covers |
| T19 | 0.59 | 0.68 | ⚠️ covers |
| T20 | 0.53 | 0.70 | ⚠️ covers |
| T21 | 0.70 | 0.36 | ⚠️ atomic |

## Stories × diversão

**10 stories, 0 sinalizadas.**

| Story | choice | feedback | resultado |
| --- | --- | --- | --- |
| P1: Controles de luta | 0.81 | 2.30 | ok |
| P1: Grafo de golpes | 0.89 | 2.38 | ok |
| P1: Guarda | 0.92 | 2.94 | ok |
| P1: Parry | 0.94 | 2.90 | ok |
| P1: Esquiva | 0.94 | 2.84 | ok |
| P1: Estrutura e finalizador | 0.90 | 2.86 | ok |
| P2: Aéreos e voadora | 0.88 | 2.39 | ok |
| P2: Inimigos que bloqueiam | 0.85 | 2.26 | ok |
| P2: Contador de combo e nota de estilo | 0.81 | 2.96 | ok |
| P3: Palma explosiva (meia-lua) | 0.74 | 2.26 | ok |

## Revisão do autor

Rodada 1 (28/09): 9 de 21 tasks e 5 de 10 stories sinalizadas. As stories de Controles, Guarda, Parry, Esquiva e Aéreos tinham o feedback só na "Direção de arte", não em ACs. Entraram CTL-09 (pose de guarda), GRD-08/GRD-09 (faísca e empurrão do bloqueio), PAR-11 (flash e anel do parry), DOD-11/DOD-12 (rastro e tom da câmera lenta) e AIR-05 (rastro da voadora), todos verificáveis por `fx.layers`.

Rodada 2: 0 de 10 stories e 10 de 21 tasks sinalizadas. Aceitas:
- **covers baixo em T1, T8, T10, T13, T16, T18, T19, T20**: o AC é dividido de propósito — a regra pura numa task da fase 1 e a ligação no jogo numa da fase 3/4; MOV-14 (frames) entre T8 e T9; as tasks de smoke citam ACs já testados em unidade e conferem o caminho vivo.
- **atomic baixo em T9 (arte aérea + defesa + cores) e T21 (bloqueio + combo)**: uma única entrega de arte e um único cenário de smoke por área; separar só multiplicaria o custo do harness.
