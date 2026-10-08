# Votos e evoluções — Specification

## Problem Statement

O usuário quer que o jogo vicie e tenha várias formas de rejogar, testando estratégias e builds (pedido de 08/10). Hoje
a run oferece atributos, técnicas, passivas e arsenal na loja, mas nenhuma escolha troca algo por poder e nenhuma
combinação vira uma coisa nova. Decisão AD-024: entram os Votos Vinculativos (o *shibari* de Jujutsu Kaisen) depois de
cada chefe e as evoluções de técnica por receita, começando pelo Vazio Roxo.

## Goals

- [ ] Depois de cada chefe o jogador escolhe 1 de 3 votos (ou recusa), e o voto muda o combate pelo resto da run.
- [ ] Com Azul e Vermelho no nível máximo, a loja oferece o Vazio Roxo, que funde as duas técnicas numa só.
- [ ] Duas runs com votos diferentes pedem jeitos diferentes de jogar (o usuário confirma jogando).

## Out of Scope

| Feature | Reason |
| --- | --- |
| Passivas novas e raridade | Entram com os desbloqueios da F25 `meta-progressao` |
| Expansão de Domínio | Depende das evoluções e dos desbloqueios; fica para depois da F25 |
| Outras evoluções além do Vazio Roxo | A regra de receitas fica pronta; receitas novas são conteúdo de depois |
| Final da run na rodada 20 e modo sem fim | F25 (precisa de save) |
| Votos fora do pós-chefe (eventos na travessia) | F26 `graus-e-eventos` |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Quando o voto aparece | Na konbini depois de uma rodada de chefe, antes da loja: um painel com 3 votos | É a pausa natural depois do chefe; a loja continua igual | y (AD-024: "depois de cada chefe") |
| Recusar | Pode recusar (Enter) e ir para a loja sem voto | O voto tem custo; obrigar a escolher tira a decisão | n |
| Quantos votos por run | Um por chefe, acumulam; o mesmo voto nunca aparece duas vezes | Cada chefe vira um ponto de virada | n |
| Sorteio | Pela seed da run (stream próprio), entre os votos ainda não tomados | Mesma seed, mesmas ofertas, como a loja | y |
| Lista de votos | Os 8 da tabela de requisitos VOW-10..VOW-17, com números em `src/data/vows.ts` | Cada voto liga num ponto que o combate já tem (dano, custo, guarda, Reversa, vida, fragmentos) | n |
| Evolução | Uma carta na loja quando as duas técnicas da receita estão equipadas no nível 3; comprar troca as duas por uma técnica nova no slot da primeira e libera o outro slot | Fiel ao Vazio Roxo de Gojo (Azul + Vermelho) e cabe nos 2 slots | n |
| Vazio Roxo | Esfera roxa grande que avança devagar, atravessa e apaga: dano alto uma vez em cada inimigo que toca e no chefe | É a técnica-assinatura do anime | n |
| Preço da evolução | 60 fragmentos | Acima de uma técnica no nível 3; é o prêmio de investir nas duas | n |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Votos Vinculativos ⭐ MVP

**User Story**: Como jogador, quero trocar uma fraqueza por poder depois de vencer um chefe, para cada run tomar um
rumo diferente.

**Why P1**: É o pedido central de rejogabilidade desta feature.

**Acceptance Criteria**:

1. VOW-01: WHEN the konbini opens after a boss round THEN the system SHALL show a vow panel with 3 distinct vows before the shop.
2. VOW-02: WHEN the konbini opens after a non-boss round THEN the system SHALL open the shop with no vow panel.
3. VOW-03: WHEN the player presses 1, 2 or 3 on the vow panel THEN the system SHALL take that vow, close the panel and open the shop.
4. VOW-04: WHEN the player presses Enter on the vow panel THEN the system SHALL close it without taking a vow and open the shop.
5. VOW-05: The vow draw SHALL never offer a vow already taken in the run.
6. VOW-06: IF fewer than 3 vows are left untaken THEN the panel SHALL offer only the remaining ones, and SHALL not open when none is left.
7. VOW-07: The same run seed and the same taken vows SHALL draw the same 3 vows.
8. VOW-08: WHEN a new run starts THEN the system SHALL clear every taken vow.
9. VOW-09: The debug snapshot SHALL report the taken vows and, while the panel is open, its offers.
10. VOW-10: WHILE the vow "Corpo de vidro" is taken the player max HP SHALL be multiplied by 0.6 and every player damage (strikes and techniques) by 1.35.
11. VOW-11: WHILE the vow "Sem guarda" is taken the player SHALL not guard nor parry, and heavy strikes SHALL deal ×1.6 damage.
12. VOW-12: WHILE the vow "Pacto do feiticeiro" is taken melee strikes SHALL deal ×0.7 damage and techniques ×1.5.
13. VOW-13: WHILE the vow "Fluxo selado" is taken techniques SHALL cost ×0.6 energy and the Reverse Cursed Energy SHALL not heal.
14. VOW-14: WHILE the vow "Cura proibida" is taken the Reverse Cursed Energy SHALL heal ×2, and SHALL heal only while the player HP is below 30% of max HP.
15. VOW-15: WHILE the vow "Ganância" is taken fragment pickups SHALL be worth ×1.6 and the damage the player takes SHALL be ×1.25.
16. VOW-16: WHILE the vow "Fúria" is taken every player damage SHALL grow by 3% per kill in the current round, up to +45%, and the passive regeneration SHALL be off.
17. VOW-17: WHILE the vow "Pele de pedra" is taken the damage the player takes SHALL be ×0.7 and every player damage ×0.8.
18. VOW-18: WHEN two taken vows change the same number THEN their multipliers SHALL multiply.

**Independent Test**: `?debug&round=5` → vencer o Oni → na konbini o painel mostra 3 votos; escolher um; a loja abre; o
snapshot traz o voto e o efeito (por exemplo, a vida máxima cai para 60% com Corpo de vidro).

---

### P2: Evolução Vazio Roxo

**User Story**: Como jogador que investiu no Azul e no Vermelho, quero fundir os dois no Vazio Roxo, para a build de
feiticeiro ter um ápice.

**Why P2**: Dá um alvo de longo prazo dentro da run; depende de as duas técnicas chegarem ao nível 3.

**Acceptance Criteria**:

1. EVO-01: WHILE both techniques of a recipe are equipped at level 3 the shop SHALL include the evolution card among its offers.
2. EVO-02: WHILE either technique of the recipe is missing or below level 3 the shop SHALL not offer the evolution.
3. EVO-03: WHEN the player buys the evolution THEN the system SHALL replace the first recipe technique's slot with the evolved technique at level 1 and SHALL empty the other recipe technique's slot.
4. EVO-04: The evolution SHALL cost 60 fragments and SHALL be sold at most once per run.
5. EVO-05: WHEN the player casts the Vazio Roxo THEN the system SHALL launch a purple sphere that moves forward at 180 px/s for 1600 ms.
6. EVO-06: The Vazio Roxo sphere SHALL hit every common enemy and the boss it touches exactly once per cast, for 60 damage at level 1.
7. EVO-07: The Vazio Roxo SHALL cost 70 energy and have a 6000 ms cooldown.
8. EVO-08: The Vazio Roxo SHALL use only `PALETTE` colors.

**Independent Test**: `?debug&tech=azul,vermelho&techLevel=3&fragments=200` → a loja oferece o Vazio Roxo → comprar →
conjurar → a esfera atravessa a fila de inimigos acertando cada um uma vez.

---

## Edge Cases

- IF the player dies with the vow panel never shown THEN the next run SHALL start with no vows.
- WHEN the vow "Sem guarda" is taken while the guard is held THEN the guard SHALL drop on the next frame.
- IF "Corpo de vidro" lowers max HP below the current HP THEN the current HP SHALL be clamped to the new max.
- WHEN the player buys the "vida" upgrade with "Corpo de vidro" taken THEN the new max HP SHALL also be multiplied by 0.6.
- IF the evolved technique is equipped THEN the shop SHALL not offer the recipe techniques again in that run.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| VOW-01 | P1: Votos Vinculativos | Execute | Implementing |
| VOW-02 | P1: Votos Vinculativos | Execute | Implementing |
| VOW-03 | P1: Votos Vinculativos | Execute | Implementing |
| VOW-04 | P1: Votos Vinculativos | Execute | Implementing |
| VOW-05 | P1: Votos Vinculativos | Execute | Implementing |
| VOW-06 | P1: Votos Vinculativos | Execute | Implementing |
| VOW-07 | P1: Votos Vinculativos | Execute | Implementing |
| VOW-08 | P1: Votos Vinculativos | Execute | Implementing |
| VOW-09 | P1: Votos Vinculativos | Execute | Implementing |
| VOW-10 | P1: Votos Vinculativos | Execute | Implementing |
| VOW-11 | P1: Votos Vinculativos | Execute | Implementing |
| VOW-12 | P1: Votos Vinculativos | Execute | Implementing |
| VOW-13 | P1: Votos Vinculativos | Execute | Implementing |
| VOW-14 | P1: Votos Vinculativos | Execute | Implementing |
| VOW-15 | P1: Votos Vinculativos | Execute | Implementing |
| VOW-16 | P1: Votos Vinculativos | Execute | Implementing |
| VOW-17 | P1: Votos Vinculativos | Execute | Implementing |
| VOW-18 | P1: Votos Vinculativos | Execute | Implementing |
| EVO-01 | P2: Evolução Vazio Roxo | Execute | Implementing |
| EVO-02 | P2: Evolução Vazio Roxo | Execute | Implementing |
| EVO-03 | P2: Evolução Vazio Roxo | Execute | Implementing |
| EVO-04 | P2: Evolução Vazio Roxo | Execute | Implementing |
| EVO-05 | P2: Evolução Vazio Roxo | Tasks | Pending |
| EVO-06 | P2: Evolução Vazio Roxo | Tasks | Pending |
| EVO-07 | P2: Evolução Vazio Roxo | Execute | Implementing |
| EVO-08 | P2: Evolução Vazio Roxo | Execute | Implementing |

**Coverage:** 26 total, 26 mapped to tasks, 0 unmapped.

---

## Success Criteria

- [ ] O usuário joga duas runs com votos diferentes e sente a diferença.
- [ ] O Vazio Roxo aparece, funde as técnicas e limpa uma fila de inimigos.
- [ ] Gate verde; smokes `shop`, `boss`, `tech` e os novos verdes.
