# Arena do santuário — Specification

## Problem Statement

O usuário achou a área do chefe "muito feia" e pediu "um refinamento, área bem desenvolvida". Depois da F22 a arena
tem só o muro de pedra com lanternas; o céu, a escola com o relógio e a camada média são os mesmos de qualquer rua,
o selo existe só à direita, o chefe não muda nada no lugar e a arena tem uma tela e pouco de largura (40 colunas).
Plano: `docs/plano-cenario-rejogabilidade-hordas.md`, F23.

## Goals

- [ ] A arena do chefe não mostra a escola nem o horizonte da cidade: tem céu do Véu e um santuário próprio.
- [ ] O Oni do Portão e a Tecelã de Maldições lutam em versões diferentes da mesma arena.
- [ ] A arena reage ao chefe: fecha dos dois lados na luta, avermelha na fase 2 e se acalma na vitória.
- [ ] Smokes `boss` e `world-` verdes.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Lanternas que quebram com golpe | Objeto destrutível é a F20 `portas-e-destrutiveis`; aqui as lanternas são cenário |
| Mudar a IA, os ataques ou a vida do chefe | Pedido é de ambiente |
| Arenas diferentes por chefe (módulos novos) | A mesma arena com decoração por arquétipo atende o pedido sem mexer no sorteio |
| Luz dinâmica que segue técnica ou golpe | A luz da fase é uma sobreposição de cor |
| Versão antiga (`?hd=0`) | Processo do projeto: só HD |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Largura da arena | 52 colunas (era 40), com os pontos de spawn nas duas bordas e dois slots de objeto | Mais espaço para a investida e o salto do chefe sem sair de 2 telas; mexe em `modules.test.ts` e nos smokes que medem o santuário | n |
| Céu do Véu | A camada distante da arena troca a escola e a cidade por um céu escurecido com a borda da cúpula do Véu, lua e montanhas | Tira a cara de "pátio de escola" de que o usuário reclamou | n |
| Decoração por chefe | Pelo arquétipo do chefe da rodada (`oni` ou `tecela`), passado para a construção da área | Os dois arquétipos já existem em `core/bossTier` | y |
| Selo da esquerda | Só visual (a coluna 0 já é parede sólida); queima junto com o da direita | Fecha a arena dos dois lados sem mudar a física | y |
| Luz da fase 2 | Sobreposição `PALETTE.r` com alpha 0,18 entre a camada próxima e a decoração (profundidade −7), presa à câmera | Avermelha o fundo sem tingir lutadores nem HUD | y |
| Vitória | A sobreposição some em 600 ms | Mesma ideia do selo que queima | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Santuário próprio ⭐ MVP

**User Story**: Como jogador, quero que a arena do chefe pareça um santuário dentro do Véu, para a luta contra o chefe
ter peso de duelo.

**Why P1**: É a reclamação do usuário.

**Acceptance Criteria**:

1. ARN-01: WHEN every span of an area has the theme `santuario` THEN the far background layer SHALL be painted by the Veil-sky painter instead of the school painter.
2. ARN-02: The Veil-sky painter SHALL paint no texel with the school-window colors `a` or `A` (the school and the city windows are gone).
3. ARN-03: The `santuario` middle painter SHALL be distinct from the school middle painter and SHALL have at least 2 palette colors in every painted 32x32 px window from 60 to 20 px above its ground line.
4. ARN-04: The `santuario` middle painter SHALL produce different drawings for the archetypes `oni` and `tecela`.
5. ARN-05: WHEN a boss area is built THEN the scene SHALL pass the archetype of that round's boss to the background (`area.arenaVariant` in the debug snapshot).
6. ARN-06: The `santuario` theme SHALL have a decoration piece and a foreground painter.

**Independent Test**: `?debug&round=5` e `?debug&round=15` mostram o santuário com céu do Véu, sem a escola, e com
decoração diferente; os testes de arte cobrem ARN-01 a ARN-04 e ARN-06.

---

### P2: A arena reage ao chefe

**User Story**: Como jogador, quero que a arena feche, se tinja e se acalme com a luta, para sentir as fases do chefe.

**Why P2**: Dá ritmo; a arena já fica bonita sem isso.

**Acceptance Criteria**:

1. ARN-07: WHILE the boss area seal is closed the scene SHALL draw column 0 (rows 0 to 14) with the `seal` frame.
2. ARN-08: WHEN the boss area seal opens THEN the left seal SHALL fade out in `AREA.sealBurnMs` like the right one.
3. ARN-09: WHILE the boss phase is 2 or 3 the scene SHALL show a camera-fixed overlay of `PALETTE.r` with alpha 0.18 at depth −7.
4. ARN-10: WHILE the boss phase is 1 the overlay alpha SHALL be 0.
5. ARN-11: WHEN the boss is defeated THEN the overlay SHALL fade to alpha 0 within 600 ms.

**Independent Test**: no smoke `boss`, `area.leftSeal` existe na luta e some depois da vitória; `area.veil.alpha` é 0
na fase 1, 0,18 na fase 2 e volta a 0 depois da vitória.

---

### P3: Arena mais larga

**User Story**: Como jogador, quero mais espaço na arena para esquivar das investidas.

**Why P3**: Melhora a luta, mas mexe em testes e smokes do mundo.

**Acceptance Criteria**:

1. ARN-12: The `santuario` module SHALL be 52 columns wide, with spawn points `E` near both edges and two object slots `p`.

---

## Edge Cases

- IF an area mixes `santuario` with another theme THEN the far layer SHALL keep the school painter.
- WHEN an area is not a boss area THEN `area.arenaVariant` SHALL be `null` and no left seal or overlay SHALL exist.
- IF the boss dies while already in phase 1 THEN the overlay SHALL stay at alpha 0.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| ARN-01 | P1: Santuário próprio | Execute | Implementing |
| ARN-02 | P1: Santuário próprio | Execute | Implementing |
| ARN-03 | P1: Santuário próprio | Tasks | Pending |
| ARN-04 | P1: Santuário próprio | Tasks | Pending |
| ARN-05 | P1: Santuário próprio | Tasks | Pending |
| ARN-06 | P1: Santuário próprio | Tasks | Pending |
| ARN-07 | P2: A arena reage ao chefe | Tasks | Pending |
| ARN-08 | P2: A arena reage ao chefe | Tasks | Pending |
| ARN-09 | P2: A arena reage ao chefe | Tasks | Pending |
| ARN-10 | P2: A arena reage ao chefe | Tasks | Pending |
| ARN-11 | P2: A arena reage ao chefe | Tasks | Pending |
| ARN-12 | P3: Arena mais larga | Tasks | Pending |

**Coverage:** 12 total, 12 mapped to tasks, 0 unmapped.

---

## Success Criteria

- [ ] O usuário luta contra o Oni e a Tecelã e aprova a arena.
- [ ] Gate verde; smokes `boss` e `world-` verdes.
