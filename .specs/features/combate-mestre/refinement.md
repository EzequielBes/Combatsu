# Refinamento Jev — combate-mestre

Gerado por `jev-refine` (Jev, TypeSafe System One). Consultivo (AD-007): cada AC sinalizado é reescrito ou registrado em Assumptions.
Limiares: ambiguous > 0,6 · bundled > 0,6 · testable < 0,6 · precision < 2 (escala 0–3).

**155 ACs, 46 sinalizados.**

| AC | ambiguous | bundled | testable | precision | resultado |
| --- | --- | --- | --- | --- | --- |
| HGT-01 | 0.40 | 0.16 | 0.94 | 2.99 | ok |
| HGT-02 | 0.48 | 0.21 | 0.93 | 2.98 | ok |
| HGT-03 | 0.50 | 0.20 | 0.93 | 2.97 | ok |
| HGT-04 | 0.47 | 0.55 | 0.93 | 2.90 | ok |
| HGT-05 | 0.41 | 0.57 | 0.93 | 2.99 | ok |
| HGT-06 | 0.45 | 0.50 | 0.93 | 2.98 | ok |
| HGT-07 | 0.63 | 0.46 | 0.86 | 2.51 | ⚠️ ambiguous |
| HGT-08 | 0.48 | 0.19 | 0.94 | 2.97 | ok |
| HGT-09 | 0.72 | 0.41 | 0.70 | 2.02 | ⚠️ ambiguous |
| HGT-10 | 0.51 | 0.15 | 0.91 | 2.97 | ok |
| HGT-11 | 0.37 | 0.16 | 0.93 | 3.00 | ok |
| HGT-12 | 0.56 | 0.39 | 0.88 | 2.86 | ok |
| HGT-13 | 0.57 | 0.22 | 0.90 | 2.88 | ok |
| CMT-01 | 0.62 | 0.39 | 0.88 | 2.90 | ⚠️ ambiguous |
| CMT-02 | 0.61 | 0.32 | 0.79 | 2.74 | ⚠️ ambiguous |
| CMT-03 | 0.57 | 0.21 | 0.86 | 2.77 | ok |
| CMT-04 | 0.56 | 0.24 | 0.88 | 2.90 | ok |
| CMT-05 | 0.60 | 0.25 | 0.77 | 2.16 | ok |
| CMT-06 | 0.63 | 0.30 | 0.88 | 2.90 | ⚠️ ambiguous |
| CMT-07 | 0.59 | 0.23 | 0.83 | 2.70 | ok |
| CMT-08 | 0.60 | 0.22 | 0.84 | 2.84 | ok |
| CMT-09 | 0.57 | 0.18 | 0.85 | 2.59 | ok |
| CMT-10 | 0.46 | 0.16 | 0.87 | 2.49 | ok |
| TGT-01 | 0.46 | 0.40 | 0.94 | 2.99 | ok |
| TGT-02 | 0.46 | 0.21 | 0.93 | 2.99 | ok |
| TGT-03 | 0.67 | 0.19 | 0.90 | 2.79 | ⚠️ ambiguous |
| TGT-04 | 0.65 | 0.46 | 0.90 | 2.16 | ⚠️ ambiguous |
| TGT-05 | 0.68 | 0.38 | 0.86 | 2.04 | ⚠️ ambiguous |
| TGT-06 | 0.50 | 0.20 | 0.89 | 2.75 | ok |
| TGT-07 | 0.60 | 0.18 | 0.89 | 2.95 | ok |
| PST-01 | 0.55 | 0.21 | 0.84 | 2.98 | ok |
| PST-02 | 0.49 | 0.18 | 0.90 | 2.99 | ok |
| PST-03 | 0.57 | 0.18 | 0.87 | 2.90 | ok |
| PST-04 | 0.39 | 0.49 | 0.94 | 2.97 | ok |
| PST-05 | 0.57 | 0.19 | 0.89 | 2.87 | ok |
| PST-06 | 0.61 | 0.27 | 0.85 | 2.81 | ⚠️ ambiguous |
| PST-07 | 0.66 | 0.22 | 0.84 | 2.77 | ⚠️ ambiguous |
| PST-08 | 0.68 | 0.28 | 0.83 | 2.64 | ⚠️ ambiguous |
| PST-09 | 0.60 | 0.24 | 0.87 | 2.83 | ok |
| PST-10 | 0.60 | 0.27 | 0.87 | 2.97 | ok |
| PST-11 | 0.66 | 0.30 | 0.86 | 2.95 | ⚠️ ambiguous |
| PST-12 | 0.58 | 0.27 | 0.84 | 2.88 | ok |
| PST-13 | 0.39 | 0.20 | 0.92 | 2.80 | ok |
| PST-14 | 0.65 | 0.32 | 0.89 | 2.95 | ⚠️ ambiguous |
| PST-15 | 0.66 | 0.30 | 0.87 | 2.92 | ⚠️ ambiguous |
| PST-16 | 0.62 | 0.22 | 0.89 | 2.95 | ⚠️ ambiguous |
| GND-01 | 0.64 | 0.26 | 0.88 | 2.54 | ⚠️ ambiguous |
| GND-02 | 0.59 | 0.57 | 0.91 | 2.75 | ok |
| GND-03 | 0.46 | 0.18 | 0.90 | 2.60 | ok |
| GND-04 | 0.64 | 0.23 | 0.87 | 2.58 | ⚠️ ambiguous |
| GND-05 | 0.55 | 0.16 | 0.90 | 2.93 | ok |
| GND-06 | 0.51 | 0.17 | 0.88 | 2.68 | ok |
| GND-07 | 0.45 | 0.17 | 0.91 | 2.83 | ok |
| VOA-01 | 0.52 | 0.14 | 0.88 | 2.92 | ok |
| VOA-02 | 0.66 | 0.17 | 0.82 | 2.63 | ⚠️ ambiguous |
| VOA-03 | 0.66 | 0.15 | 0.87 | 2.77 | ⚠️ ambiguous |
| VOA-04 | 0.49 | 0.17 | 0.90 | 2.82 | ok |
| VOA-05 | 0.49 | 0.33 | 0.89 | 2.98 | ok |
| VOA-06 | 0.51 | 0.18 | 0.90 | 2.99 | ok |
| VOA-07 | 0.51 | 0.18 | 0.89 | 2.99 | ok |
| VOA-08 | 0.56 | 0.22 | 0.89 | 2.96 | ok |
| VOA-09 | 0.49 | 0.17 | 0.89 | 2.98 | ok |
| DEF-01 | 0.58 | 0.25 | 0.87 | 2.81 | ok |
| DEF-02 | 0.61 | 0.20 | 0.85 | 2.79 | ⚠️ ambiguous |
| DEF-03 | 0.52 | 0.22 | 0.88 | 2.89 | ok |
| DEF-04 | 0.66 | 0.30 | 0.90 | 2.77 | ⚠️ ambiguous |
| DEF-05 | 0.56 | 0.22 | 0.88 | 2.99 | ok |
| DEF-06 | 0.67 | 0.19 | 0.88 | 2.90 | ⚠️ ambiguous |
| DEF-07 | 0.53 | 0.28 | 0.93 | 2.99 | ok |
| DEF-08 | 0.59 | 0.17 | 0.88 | 2.92 | ok |
| DEF-09 | 0.32 | 0.13 | 0.92 | 2.96 | ok |
| DEF-10 | 0.32 | 0.13 | 0.94 | 2.99 | ok |
| DEF-11 | 0.44 | 0.15 | 0.93 | 2.99 | ok |
| DEF-12 | 0.65 | 0.25 | 0.88 | 2.94 | ⚠️ ambiguous |
| DEF-13 | 0.44 | 0.29 | 0.93 | 2.98 | ok |
| DEF-14 | 0.52 | 0.19 | 0.89 | 2.89 | ok |
| DEF-15 | 0.64 | 0.53 | 0.84 | 2.81 | ⚠️ ambiguous |
| DEF-16 | 0.51 | 0.48 | 0.87 | 2.78 | ok |
| DEF-17 | 0.56 | 0.20 | 0.89 | 2.87 | ok |
| DEF-18 | 0.50 | 0.19 | 0.90 | 2.99 | ok |
| DEF-19 | 0.48 | 0.29 | 0.91 | 2.98 | ok |
| DEF-20 | 0.64 | 0.35 | 0.85 | 2.71 | ⚠️ ambiguous |
| DEF-21 | 0.62 | 0.22 | 0.85 | 2.97 | ⚠️ ambiguous |
| DEF-22 | 0.56 | 0.34 | 0.89 | 2.92 | ok |
| CNT-01 | 0.57 | 0.35 | 0.92 | 2.99 | ok |
| CNT-02 | 0.52 | 0.30 | 0.92 | 2.99 | ok |
| CNT-03 | 0.55 | 0.37 | 0.91 | 2.98 | ok |
| CNT-04 | 0.64 | 0.35 | 0.89 | 2.98 | ⚠️ ambiguous |
| CNT-05 | 0.59 | 0.17 | 0.85 | 2.24 | ok |
| CNT-06 | 0.48 | 0.14 | 0.90 | 2.99 | ok |
| CNT-07 | 0.64 | 0.25 | 0.82 | 2.48 | ⚠️ ambiguous |
| CNT-08 | 0.60 | 0.19 | 0.90 | 2.94 | ok |
| CNT-09 | 0.42 | 0.40 | 0.95 | 2.99 | ok |
| CNT-10 | 0.39 | 0.43 | 0.94 | 2.99 | ok |
| CNT-11 | 0.53 | 0.19 | 0.90 | 2.97 | ok |
| CNT-12 | 0.60 | 0.29 | 0.86 | 2.40 | ok |
| CNT-13 | 0.62 | 0.31 | 0.88 | 2.46 | ⚠️ ambiguous |
| CNT-14 | 0.49 | 0.16 | 0.89 | 2.88 | ok |
| CNT-15 | 0.65 | 0.25 | 0.80 | 2.92 | ⚠️ ambiguous |
| CNT-16 | 0.49 | 0.20 | 0.91 | 2.84 | ok |
| CNT-17 | 0.69 | 0.22 | 0.88 | 2.85 | ⚠️ ambiguous |
| CNT-18 | 0.60 | 0.18 | 0.83 | 2.03 | ok |
| CNT-19 | 0.48 | 0.18 | 0.91 | 2.95 | ok |
| CNT-20 | 0.43 | 0.15 | 0.88 | 2.82 | ok |
| CNT-21 | 0.59 | 0.26 | 0.85 | 2.94 | ok |
| DFL-01 | 0.49 | 0.42 | 0.90 | 2.94 | ok |
| DFL-02 | 0.57 | 0.19 | 0.86 | 2.90 | ok |
| DFL-03 | 0.42 | 0.17 | 0.87 | 2.85 | ok |
| DFL-04 | 0.55 | 0.17 | 0.89 | 2.91 | ok |
| DFL-05 | 0.61 | 0.22 | 0.85 | 2.40 | ⚠️ ambiguous |
| DFL-06 | 0.54 | 0.16 | 0.85 | 2.88 | ok |
| DFL-07 | 0.53 | 0.20 | 0.88 | 2.91 | ok |
| DFL-08 | 0.57 | 0.22 | 0.83 | 2.85 | ok |
| DFL-09 | 0.67 | 0.33 | 0.85 | 2.86 | ⚠️ ambiguous |
| DFL-10 | 0.47 | 0.22 | 0.92 | 2.98 | ok |
| DFL-11 | 0.60 | 0.19 | 0.89 | 2.93 | ok |
| DFL-12 | 0.54 | 0.18 | 0.88 | 2.74 | ok |
| DFL-13 | 0.63 | 0.33 | 0.85 | 2.94 | ⚠️ ambiguous |
| DFL-14 | 0.50 | 0.20 | 0.91 | 2.95 | ok |
| DFL-15 | 0.49 | 0.52 | 0.91 | 2.96 | ok |
| DFL-16 | 0.44 | 0.15 | 0.86 | 2.62 | ok |
| RDG-01 | 0.55 | 0.19 | 0.89 | 2.95 | ok |
| RDG-02 | 0.46 | 0.14 | 0.92 | 2.98 | ok |
| RDG-03 | 0.67 | 0.37 | 0.67 | 2.55 | ⚠️ ambiguous |
| RDG-04 | 0.52 | 0.19 | 0.80 | 2.55 | ok |
| RDG-05 | 0.63 | 0.23 | 0.87 | 2.88 | ⚠️ ambiguous |
| RDG-06 | 0.58 | 0.17 | 0.89 | 2.96 | ok |
| RDG-07 | 0.55 | 0.18 | 0.90 | 2.95 | ok |
| RDG-08 | 0.59 | 0.18 | 0.88 | 2.78 | ok |
| RDG-09 | 0.61 | 0.24 | 0.87 | 2.87 | ⚠️ ambiguous |
| RDG-10 | 0.73 | 0.26 | 0.80 | 2.65 | ⚠️ ambiguous |
| RDG-11 | 0.53 | 0.46 | 0.89 | 2.74 | ok |
| RDG-12 | 0.62 | 0.30 | 0.83 | 2.34 | ⚠️ ambiguous |
| RDG-13 | 0.64 | 0.21 | 0.88 | 2.93 | ⚠️ ambiguous |
| RDG-14 | 0.68 | 0.20 | 0.86 | 2.96 | ⚠️ ambiguous |
| RDG-15 | 0.65 | 0.21 | 0.88 | 2.96 | ⚠️ ambiguous |
| RDG-16 | 0.65 | 0.24 | 0.65 | 2.84 | ⚠️ ambiguous |
| RDG-17 | 0.52 | 0.18 | 0.88 | 2.85 | ok |
| RDG-18 | 0.56 | 0.17 | 0.88 | 2.98 | ok |
| RDG-19 | 0.57 | 0.50 | 0.88 | 2.98 | ok |
| RDG-20 | 0.52 | 0.18 | 0.91 | 2.97 | ok |
| RDG-21 | 0.59 | 0.21 | 0.85 | 2.92 | ok |
| RDG-22 | 0.48 | 0.19 | 0.89 | 2.97 | ok |
| RDG-23 | 0.59 | 0.23 | 0.84 | 2.77 | ok |
| EDG-01 | 0.33 | 0.14 | 0.93 | 3.00 | ok |
| EDG-02 | 0.35 | 0.13 | 0.93 | 2.99 | ok |
| EDG-03 | 0.39 | 0.16 | 0.94 | 2.99 | ok |
| EDG-04 | 0.37 | 0.13 | 0.92 | 2.99 | ok |
| EDG-05 | 0.66 | 0.26 | 0.83 | 2.59 | ⚠️ ambiguous |
| EDG-06 | 0.67 | 0.22 | 0.83 | 2.82 | ⚠️ ambiguous |
| EDG-07 | 0.52 | 0.17 | 0.89 | 2.99 | ok |
| EDG-08 | 0.55 | 0.24 | 0.77 | 2.32 | ok |
| EDG-09 | 0.61 | 0.26 | 0.82 | 2.36 | ⚠️ ambiguous |
| EDG-10 | 0.59 | 0.23 | 0.87 | 2.98 | ok |
| EDG-11 | 0.54 | 0.25 | 0.87 | 2.92 | ok |

## Revisão do autor (03/10)

**1ª rodada:** 136 ACs, 66 sinalizados. Mudanças feitas a partir dela:
- **Divididos (um desfecho por AC):**
  - CMT-03, CMT-07, CMT-08 e CMT-09 ficaram só com "a hitbox do golpe pendente não abre"; o estado do cérebro em cada caso já é de PST-05, STR-05 e CNT-21.
  - GND-01 (+06): dano aplicado e tempo no chão em ACs separados.
  - VOA-02 (+03) e VOA-07 (+08): evento e efeito separados.
  - DEF-07 (+08), DEF-17 (+18): a ação e o evento dela.
  - CNT-11 (+12): dano zero e golpe não cancelado.
  - DFL-02 (+03), DFL-07 (+08): tempo da hitbox, estado da IA e postura.
  - RDG-06 (+07, +08), RDG-11 (+12), RDG-13 (+14), RDG-17 (+18), RDG-20 (+21).
  - EDG-01 virou EDG-01..04; EDG-08 (+09).
- **Com valor observável:**
  - DEF-01, DEF-02, DEF-03, DEF-14 e EDG-06: "perde exatamente o `damage` do `Hit`" no lugar de "dano cheio".
  - TGT-06: "nenhum outro alvo recebe o golpe" no lugar de "ocupa uma vaga".
  - CNT-08: `player.move` igual a `jab`.
  - CNT-13: a janela passa a ter o `kind` e a duração inteira do novo evento.
  - RDG-23: N é a probabilidade do sorteio (1 sempre, 0 nunca).
  - PST-15: recusado nos 300 ms seguintes e aceito depois.
- **Removido:** um AC sobre a postura do jogador quebrada durante esquiva ou abaixar, estado que não acontece (quebrado, o jogador não age).
- **Glossário:** entraram "inimigo elegível para guarda" e "golpe cheio".

**2ª rodada:** 154 ACs, 48 sinalizados; 4 por `bundled` ou `precision`. TGT-04 ganhou a medida (centros dos corpos) e o desempate por id; GND-04 (+07) foi dividido; DFL-08 passou a citar os 300 ms do DFL-02; EDG-03 ficou só com `reading.move`.

**3ª rodada:** 155 ACs. Nenhum ficou sinalizado como `bundled`, `precision` ou `testable`; 46 seguem marcados só como `ambiguous`, todos entre 0,60 e 0,73. Esses foram aceitos: são regras de mecânica com números explícitos, como nas features anteriores, e a nota vem do vocabulário do jogo que o Jev não conhece (`windup`, `stagger`, comprometido, foco, `ragdollStun`), definido no Glossário e no contrato do snapshot da spec.
