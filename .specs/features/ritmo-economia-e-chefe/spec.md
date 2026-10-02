# Ritmo, economia e chefe — Specification

## Problem Statement

No playtest de 02/10 o usuário apontou três problemas.

1. **Rodadas vazias.** Cada rodada tem só 3 a 6 inimigos, no máximo 4 vivos, que nascem nos mesmos 2 pontos e só quando outro morre. Os inimigos ainda ficam patrulhando até o jogador chegar a 200 px.
2. **Pouco fragmento.** Com poucos abates, a renda é baixa: o jogador só consegue comprar uma técnica boa uma rodada antes do chefe. Há também um bug: Energia e Fluxo cobram e não aplicam nada, porque `TestScene.ts:245` cria `new Modifiers()` com o catálogo da F4. Além disso, nenhuma loja garante o upgrade de uma técnica já equipada, então levar o Vermelho ao Nv3 leva cerca de 25 lojas.
3. **Chefe que não se vence no corpo a corpo.** Medido no harness (`?debug&round=5`, cerca de 13 s colado nele): os golpes conectam, mas tiram só 100 dos 600 de HP, enquanto o jogador perde 76 dos 100. A investida e o salto não deixam abertura clara para revidar.

Esta feature é a primeira entrega da expansão "Combate de Mestre" (design em `docs/superpowers/specs/2026-10-02-combate-mestre-design.md`). Ela aumenta o volume e o ritmo de inimigos com um limitador simples de atacantes, corrige e acelera a progressão, e torna o chefe vencível no corpo a corpo. O HP e o dano dos inimigos comuns deixam de crescer por rodada (AD-014).

## Goals

- [ ] **Volume e ritmo.** Toda rodada comum tem 6 + 2·(r − 1) inimigos (teto 20) e mantém de 5 a 8 vivos.
  - Inimigos nascem fora da câmera e perseguem desde o nascimento.
  - Nunca mais de 2 atacam ao mesmo tempo.
- [ ] **Renda média (modelo determinístico).** A renda acumulada chega a pelo menos 15 fragmentos ao fim da rodada 1 e a pelo menos 100 antes da rodada 5. Com isso dá para comprar a 1ª técnica na primeira loja e ter uma técnica no Nv2 antes do 1º chefe.
- [ ] **Energia e Fluxo funcionam.** Comprar aplica o efeito.
- [ ] **Upgrade garantido.** Com uma técnica equipada e upável, toda loja oferece o upgrade dela.
- [ ] **Maestria e chefe.** A técnica também sobe de nível com o uso (maestria) e com a vitória sobre o chefe.
- [ ] **Chefe vencível no corpo a corpo.**
  - HP base do tier 1 = 400.
  - A investida contra a parede e o pouso do salto abrem janelas de punição.
  - A postura quebrada abre um finalizador de 12% do HP.

## Out of Scope

| Feature | Reason |
| --- | --- |
| `AttackDirector` completo (prioridade das costas, token de oportunidade, anel tático, fintas) | F14 `ia-tatica`; aqui entra só o limitador simples |
| Arquétipos com comportamento, Conjurador, Elites | F14 e F15 |
| Composição da onda, curva de ensino, dicas | F16 `pressao-e-curva` |
| Parry só de frente, abaixar, `maxTargets`, regras de ragdoll, invulnerabilidade de 300 ms | F12 `combate-mestre` |
| Novos ataques ou padrões do chefe | Aqui só entram janelas de punição e finalizador; o kit do chefe é o mesmo da F2 |
| Mudar dano e escala por tier do chefe | O chefe tem a sua própria escala (BTIER); só o HP base muda |
| Arte nova (sprites, efeitos do finalizador do chefe) | Reaproveita o hitstop e o zoom do finalizador comum |
| Persistência entre runs | F6 |

---

## Assumptions & Open Questions

**Open questions:** none - all resolved or logged above.

Decisões do agente por delegação do usuário ("decidir seguindo a própria recomendação"). Os números ficam em `src/data/tuning.ts` e `src/data/shop.ts`.

### Volume, spawn e IA

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Tamanho da onda | `min(6 + 2·(r − 1), 20)` nas rodadas comuns; a rodada de chefe continua só com o chefe | Pedido do usuário por mais inimigos | y |
| Vivos ao mesmo tempo | `maxAliveFor(r) = min(5 + floor((r − 1) / 2), 8)`: 5, 5, 6, 6, 7, 7, 8… | Mais pressão, mas legível | y |
| Ritmo de nascimento | Início da rodada: até 3 imediatos (respeitando `pointGapMs`). Depois, 1 a cada 1500 ms enquanto houver vaga e fila | "Gotejamento" contínuo, sem esperar alguém morrer para começar | y |
| Pontos de spawn | `LEVEL_1` ganha 2 pontos `E` nas colunas 1 e 38 da linha do chão (total 4) | Cobre as duas bordas | y |
| Escolha do ponto | Pontos cujo `x` esteja fora da câmera, com 32 px de margem. Com 35% de chance (stream da onda), prefere os do lado das costas do jogador (oposto ao `facing`). Sem ponto fora da câmera, usa o mais distante (`farthestPoint`) | Ninguém nasce na cara do jogador; pressão pelas costas | y |
| Perseguição | O estado `patrol` deixa de existir: todo inimigo que pode agir anda rumo ao jogador. Acima de 320 px de distância anda a ×1,6 da `chaseSpeed` | Comportamento roguelike pedido; quem nasce longe chega logo | y |
| Limitador de atacantes | No máximo 2 inimigos em `windup` ou `attack` ao mesmo tempo, e no mínimo 350 ms entre dois inícios de `windup`. Um inimigo ao alcance sem permissão para em `hold`, a 64–96 px do jogador | Decisão do usuário ("2 por vez"); a F14 troca pelo diretor completo | y |
| Ordem da permissão | Quem chegou primeiro ao alcance (FIFO pelo instante em que entrou em `hold`) | Simples e justo; a F14 introduz prioridade | y |
| Inimigos em `hold` | Mantêm pelo menos 24 px de distância entre si no eixo x | Evita a pilha de bonecos no mesmo pixel | y |
| HP e dano dos comuns | `DIFFICULTY.hpPerRound = 0` e `damagePerRound = 0`; `speedPerRound` continua 0,03 | AD-014: dificuldade por mecânica | y |

### Economia e loja

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Drop por inimigo | Continua `rng.int(2, 4)` (média 3) × valor `1 + floor((r − 1) / 5)` | A renda sobe pelo volume; renda esperada = soma de `waveSize × 3 × valor` → 18 / 42 / 72 / 108 ao fim das rodadas 1–4 | y |
| Preço das técnicas | 25% mais barato, arredondado: Divergente 15/11, Desmantelar 23/11, Azul 26/15, Vermelho 30/15 (`base/step`) | 1ª técnica comum cabe na 1ª loja; Vermelho cabe na 2ª | y |
| Rodada mínima do nível (`techGate`) | Nv2 a partir da rodada 2; Nv3 a partir da rodada 4 | Upar antes do chefe | y |
| Rodada da loja | É a rodada que acabou de terminar, como hoje em `openShop(round)` | Comportamento atual | y |
| Oferta "Aprimorar" | Com alguma técnica equipada abaixo do Nv3 e com o próximo nível liberado pela rodada, o slot 0 da loja (também após reroll) é o upgrade de uma delas, sorteada por igual entre as elegíveis | Pedido: upar técnica sem depender da sorte | y |
| Coexistência com TSH-05 | Com os dois slots vazios, vale a garantia antiga (técnica nova no slot 0); "Aprimorar" só existe com alguma técnica equipada | As duas garantias nunca disputam o mesmo slot | y |
| Texto de nível da carta de técnica | `Nv {nível atual + 1}/3`, no mesmo formato dos modificadores | O usuário vê o que está comprando | y |
| Bug de Energia/Fluxo | A cena cria `new Modifiers(FULL_SHOP_CATALOG)` | Causa raiz: o catálogo padrão dava teto 0 | y |

### Maestria

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Pontos | +1 por inimigo comum distinto atingido por uma conjuração; +3 se for o chefe | Usar a técnica a faz evoluir | y |
| Limiares | Nv1→2 com 15 pontos; Nv2→3 com 25 pontos. Ao subir, os pontos voltam a 0. No Nv3, não acumula | Primeira subida em cerca de 2–3 rodadas de uso | y |
| Relação com `techGate` | A maestria ignora a rodada mínima | Recompensa direta por usar; o teto 3 continua valendo | y |
| Reequipar | Pontos são por técnica equipada; trocar a técnica do slot zera os pontos dela. Nesta versão a loja nunca remove técnica | Sem estado órfão | y |
| HUD | Barra de 2 px sob o ícone de cada slot no `EnergyHud`, com a fração `pontos / limiar` | Feedback de progresso | y |

### Chefe

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| HP base | `BOSS.tier.hpBase = 400`; o resto da escala por tier não muda | ~40 golpes de 10 em vez de ~60 | y |
| Investida na parede | Se a investida termina por `blocked`, o chefe entra em `stagger` por 1500 ms, sem mudar a postura | Janela de punição clara: atrair a investida para a parede | y |
| Pouso do salto | O descanso depois do pouso dura `max(restMs da fase, 800)` ms | Garante janela mesmo na fase 3 (restMs 500) | y |
| Dano no `stagger` | Golpes recebidos em `stagger` causam ×1,5 de dano (arredondado) | Premia aproveitar a janela | y |
| Finalizador do chefe | Em `stagger`, J+K com o jogador a ≤ 48 px do centro do chefe causa `round(0,12 × maxHp)` de dano, uma vez por `stagger`, com o hitstop e o zoom do finalizador comum. Não leva o ×1,5 | Fecha o loop "quebrar → finalizar" contra o chefe | y |
| Upgrade grátis ao vencer o chefe | Sobe 1 nível a técnica equipada de menor nível abaixo do 3 (empate: slot 0), com banner `"{nome} Nv {n}!"`. Sem técnica upável, nada muda | Recompensa pelo marco | y |

### Debug

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Chaves de debug | `?debug&maxAlive=N` fixa o teto de vivos; `?debug&mastery=N` dá N pontos iniciais a cada técnica equipada | Smokes determinísticos | y |

---

## User Stories

### P1: Energia e Fluxo aplicam o efeito ⭐ MVP

**User Story**: Como jogador, quero que comprar Energia ou Fluxo realmente aumente a minha energia, para não jogar fragmentos fora.

**Why P1**: É bug: dinheiro gasto sem efeito.

**Acceptance Criteria**:

1. PRG-01: WHEN o jogador compra "Energia" na loja THEN o nível de `energia` SHALL aumentar em exatamente 1.
2. PRG-02: WHEN o jogador compra "Fluxo" na loja THEN o nível de `fluxo` SHALL aumentar em exatamente 1.
3. PRG-03: WHEN `energia` está no nível 5 (máximo do catálogo) THEN a loja SHALL deixar de sortear "Energia".
4. PRG-04: WHEN `fluxo` está no nível 4 (máximo do catálogo) THEN a loja SHALL deixar de sortear "Fluxo".
5. PRG-05: WHILE `energia` está no nível n, o teto de energia (`energy.max`) SHALL ser `cursedEnergyMaxAtLevel(n)`.
6. PRG-06: WHILE `fluxo` está no nível n, a regeneração por segundo SHALL ser `cursedEnergyRegenAtLevel(n)`.

**Independent Test**: Com `?debug&tech=divergente&fragments=200`, comprar Energia na primeira loja; o snapshot mostra `energy.max` acima de 100.

---

### P1: Mais inimigos, nascendo fora da câmera e sempre perseguindo ⭐ MVP

**User Story**: Como jogador, quero rodadas cheias de inimigos vindo de todos os lados, para o jogo ter o ritmo de um roguelike e render fragmentos.

**Why P1**: É a reclamação central do playtest; sem volume não há economia.

**Acceptance Criteria**:

1. SPN-01: The `waveSize` SHALL ser `min(6 + 2·(r − 1), 20)` numa rodada `r` que não é de chefe.
2. SPN-02: The `maxAliveFor(r)` SHALL ser `min(5 + floor((r − 1) / 2), 8)`.
3. SPN-03: WHEN uma rodada comum começa THEN o primeiro `update` do spawner SHALL liberar exatamente `min(3, maxAliveFor(r), waveSize(r))` inimigos.
4. SPN-04: WHILE a fila da rodada não está vazia e há menos de `maxAliveFor(r)` vivos, o spawner SHALL liberar 1 inimigo a cada 1500 ms contados desde o último spawn.
5. SPN-05: IF já existem `maxAliveFor(r)` inimigos vivos THEN o spawner SHALL não liberar nenhum inimigo.
6. SPN-06: The `LEVEL_1` SHALL ter 4 pontos `E` de spawn, 2 deles nas colunas 1 e 38 da linha do chão.
7. SPN-07: WHEN um inimigo comum é liberado THEN o ponto escolhido SHALL ter `x < worldView.left − 32` ou `x > worldView.right + 32`, quando existir um ponto assim.
8. SPN-08: WHEN mais de um ponto está fora da câmera THEN a escolha SHALL preferir, com probabilidade 0,35 (stream da onda), um ponto do lado oposto ao `facing` do jogador, quando existir.
9. SPN-09: IF nenhum dos pontos `E` tem `x` fora de `[worldView.left − 32, worldView.right + 32]` THEN o ponto escolhido SHALL ser o de maior `|x − player.x|` (`farthestPoint`).
10. SPN-10: The IA do inimigo comum SHALL nunca estar no estado `patrol`.
11. SPN-11: WHILE um inimigo pode agir, não tem permissão de ataque pendente e está a mais de 96 px do jogador, a velocidade horizontal dele SHALL ter o sinal de `player.x − x`.
12. SPN-12: WHILE um inimigo persegue a mais de 320 px do jogador, a velocidade dele SHALL ser `chaseSpeed × 1,6`.
13. SPN-13: The `scaleFor(r)` SHALL devolver `maxHp` igual ao de `scaleFor(1)` para todo `r` de 1 a 30.
14. SPN-14: The `scaleFor(r)` SHALL devolver o dano do ataque igual ao de `scaleFor(1)` para todo `r` de 1 a 30.

**Independent Test**: `?debug&seed=1`, rodada 1: em 6 s nascem pelo menos 5 inimigos, todos fora da câmera e nenhum em `patrol`; o HUD mostra 6 na rodada.

---

### P1: No máximo 2 atacam ao mesmo tempo ⭐ MVP

**User Story**: Como jogador, quero que os inimigos se revezem no ataque, para que mais inimigos signifiquem mais pressão e não um empilhamento injusto.

**Why P1**: Sem o limite, 8 vivos viram dano sem defesa.

**Acceptance Criteria**:

1. LIM-01: The jogo SHALL manter no máximo 2 inimigos comuns em `windup` ou `attack` ao mesmo tempo.
2. LIM-02: WHEN um inimigo começa `windup` THEN nenhum outro inimigo SHALL começar `windup` antes de 350 ms.
3. LIM-03: WHEN um inimigo sem permissão de ataque fica a 96 px ou menos do jogador THEN ele SHALL entrar no estado `hold`.
4. LIM-04: WHEN abre uma vaga de ataque THEN a permissão SHALL ir para o inimigo que está há mais tempo em `hold`.
5. LIM-05: WHILE dois inimigos estão em `hold` do mesmo lado do jogador, a distância entre eles no eixo x SHALL ser de pelo menos 24 px.
6. LIM-06: IF um inimigo com permissão é interrompido (golpe, ragdoll, morte) THEN a vaga dele SHALL ser liberada no mesmo frame.
7. LIM-07: WHILE um inimigo está em `hold`, ele SHALL se mover para manter `|x − player.x|` entre 64 e 96 px.
8. LIM-08: WHEN um inimigo em `hold` recebe a permissão THEN ele SHALL sair de `hold`, avançar até `attackRange` e iniciar `windup`.

**Independent Test**: `?debug&maxAlive=6&enemyGuard=0`, jogador parado por 20 s: nenhum frame tem mais de 2 inimigos em `windup|attack`.

---

### P1: Renda que permite comprar e upar antes do chefe ⭐ MVP

**User Story**: Como jogador, quero ter fragmentos para comprar uma técnica cedo e upar antes do primeiro chefe.

**Why P1**: Reclamação direta do usuário.

**Acceptance Criteria**:

1. ECN-01: The custo de técnica (`base/step`) SHALL ser Divergente 15/11, Desmantelar 23/11, Azul 26/15 e Vermelho 30/15.
2. ECN-02: The `techGate(2)` SHALL ser 2 (o nível 2 de uma técnica pode ser comprado a partir da loja da rodada 2).
3. ECN-03: The `expectedIncome(r) = Σ_{i=1..r, i não é rodada de chefe} waveSize(i) × 3 × (1 + floor((i − 1) / 5))` SHALL ser ≥ 15 para r = 1.
4. ECN-04: The `expectedIncome(4)` SHALL ser ≥ 100.
5. ECN-05: WHEN uma loja da rodada R é criada com pelo menos uma técnica equipada de nível n < 3 e `techGate(n + 1) ≤ R` THEN `offers[0]` SHALL ser uma dessas técnicas.
6. ECN-06: WHEN o jogador faz reroll numa loja da rodada R com uma técnica equipada de nível n < 3 e `techGate(n + 1) ≤ R` THEN o novo `offers[0]` SHALL ser uma técnica equipada de nível n < 3 com `techGate(n + 1) ≤ R`.
7. ECN-07: IF nenhuma técnica equipada cumpre a condição do ECN-05 THEN os 3 slots SHALL vir do sorteio por peso do SHOP-08, sem slot reservado para técnica equipada.
8. ECN-08: The carta de técnica SHALL mostrar `Nv {nível atual + 1}/3`.
9. ECN-09: The `techGate(3)` SHALL ser 4 (o nível 3 pode ser comprado a partir da loja da rodada 4).

**Independent Test**: `?debug&tech=vermelho&round=2&fragments=60`: ao abrir a loja, o slot 0 é "Vermelho" com "Nv 2/3" e custo 45.

---

### P1: Chefe vencível no corpo a corpo ⭐ MVP

**User Story**: Como jogador, quero aberturas claras para punir o chefe com golpes, para vencê-lo jogando bem e não só com técnicas à distância.

**Why P1**: O usuário perdeu para o 1º chefe em todas as runs.

**Acceptance Criteria**:

1. BFX-01: The HP máximo do chefe no tier 1 SHALL ser 400.
2. BFX-02: WHEN a investida do chefe termina por bater na parede THEN o chefe SHALL entrar em `stagger` por 1500 ms.
3. BFX-03: WHEN a investida termina por alcance máximo, sem bater na parede, THEN o chefe SHALL entrar no descanso normal da fase, sem `stagger`.
4. BFX-04: WHEN o chefe pousa de um salto THEN o descanso seguinte SHALL durar `max(restMs da fase, 800)` ms.
5. BFX-05: WHILE o chefe está em `stagger`, um golpe recebido SHALL causar `round(dano × 1,5)` de dano.
6. BFX-06: WHILE o chefe está em `stagger` e o jogador está a 48 px ou menos do centro dele, WHEN o jogador aperta J+K THEN o chefe SHALL perder `round(0,12 × maxHp)` de HP.
7. BFX-07: IF o jogador já usou o finalizador no `stagger` atual THEN um novo J+K SHALL não causar dano até o próximo `stagger`.
8. BFX-08: IF o chefe está em qualquer estado diferente de `stagger` THEN J+K com o jogador a 48 px ou menos SHALL tirar 0 de HP do chefe pelo finalizador.
9. BFX-09: WHEN o chefe é derrotado e o jogador tem técnica equipada abaixo do Nv3 THEN a técnica de menor nível (empate: slot 0) SHALL subir 1 nível.
10. BFX-10: WHEN o upgrade grátis do BFX-09 acontece THEN o HUD SHALL mostrar o banner `"{nome} Nv {n}!"`.

**Independent Test**: `?debug&round=5`: atrair a investida até a parede e bater nele parado por 1,5 s; quebrar a postura e fazer J+K tira 48 HP.

---

### P2: Maestria, a técnica sobe com o uso

**User Story**: Como jogador, quero que a técnica que eu uso evolua sozinha, para ser recompensado por usá-la em combate.

**Why P2**: Acelera a progressão, mas a loja já resolve o essencial.

**Acceptance Criteria**:

1. MST-01: WHEN uma conjuração de técnica equipada atinge um inimigo comum que ela ainda não tinha atingido THEN a técnica SHALL ganhar 1 ponto de maestria.
2. MST-02: WHEN uma conjuração atinge o chefe pela primeira vez nessa conjuração THEN a técnica SHALL ganhar 3 pontos de maestria.
3. MST-03: WHEN uma técnica no Nv1 chega a 15 pontos THEN ela SHALL subir para o Nv2 e os pontos SHALL voltar a 0.
4. MST-04: WHEN uma técnica no Nv2 chega a 25 pontos THEN ela SHALL subir para o Nv3 e os pontos SHALL voltar a 0.
5. MST-05: WHILE uma técnica está no Nv3, ela SHALL não acumular pontos.
6. MST-06: WHEN uma técnica no Nv1 chega a 15 pontos durante a rodada 1 THEN ela SHALL subir para o Nv2, mesmo que `techGate(2)` seja maior que 1.
7. MST-07: WHEN uma técnica sobe por maestria THEN o HUD SHALL mostrar o banner `"{nome} Nv {n}!"`.
8. MST-08: The `EnergyHud` SHALL desenhar sob cada slot ocupado abaixo do Nv3 uma barra de largura `round(larguraDoSlot × pontos / limiar)` px.

**Independent Test**: `?debug&tech=vermelho&mastery=14`: um Vermelho que atinge um inimigo sobe para o Nv2.

---

## Edge Cases

- EDG-01: IF a rodada tem menos inimigos na fila que o burst inicial THEN o spawner SHALL liberar só os da fila.
- EDG-02: WHEN o último inimigo da fila nasce THEN o gotejamento SHALL parar e a rodada SHALL acabar quando todos morrerem (como hoje).
- EDG-03: IF o jogador morre com inimigos em `hold` THEN as permissões do limitador SHALL ser zeradas no reinício da run.
- EDG-04: WHEN uma loja abre com as duas técnicas equipadas no Nv3 THEN nenhuma oferta "Aprimorar" SHALL aparecer.
- EDG-05: IF a investida bate na parede durante a fase de transição (rugido pendente) THEN o rugido SHALL ter prioridade sobre o `stagger` (regra atual "o rugido vence").
- EDG-06: IF o finalizador do chefe leva o HP a 0 THEN o chefe SHALL morrer pelo fluxo normal de derrota (banner, cura, recompensa e BFX-09).

---

## Implicit-requirement dimensions sweep

| Dimensão | Resultado |
| --- | --- |
| Input validation & bounds | Tetos em SPN-01, SPN-02, MST-05; `?debug&maxAlive`/`mastery` só valem em debug e com inteiro ≥ 0 (senão são ignorados) |
| Failure / partial-failure states | SPN-09 (nenhum ponto fora da câmera), ECN-07, LIM-06 |
| Idempotency / duplicate handling | MST-01/02 contam cada alvo uma vez por conjuração; BFX-07 aplica o finalizador uma vez por `stagger` |
| Auth boundaries & rate limits | N/A: jogo local de um jogador |
| Concurrency / ordering | LIM-01..04, LIM-08: limite e ordem FIFO das permissões; LIM-06 libera no mesmo frame |
| Data lifecycle / expiry | EDG-03; pontos de maestria zeram ao subir (MST-03/04) e no `startRun` |
| Observability | O snapshot de debug ganha `wave.maxAlive`, `enemies[].state` com `hold`, `attackers`, `techniques.slots[].mastery` e `boss.state` |
| External-dependency failure | N/A: sem dependência externa em runtime |
| State-transition integrity | SPN-10 (sem `patrol`), BFX-02/03/04, EDG-05 |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| PRG-01 | P1: Energia e Fluxo | Specify | Pending |
| PRG-02 | P1: Energia e Fluxo | Specify | Pending |
| PRG-03 | P1: Energia e Fluxo | Specify | Pending |
| PRG-04 | P1: Energia e Fluxo | Specify | Pending |
| PRG-05 | P1: Energia e Fluxo | Specify | Pending |
| PRG-06 | P1: Energia e Fluxo | Specify | Pending |
| SPN-01 | P1: Mais inimigos | Specify | Pending |
| SPN-02 | P1: Mais inimigos | Specify | Pending |
| SPN-03 | P1: Mais inimigos | Specify | Pending |
| SPN-04 | P1: Mais inimigos | Specify | Pending |
| SPN-05 | P1: Mais inimigos | Specify | Pending |
| SPN-06 | P1: Mais inimigos | Specify | Pending |
| SPN-07 | P1: Mais inimigos | Specify | Pending |
| SPN-08 | P1: Mais inimigos | Specify | Pending |
| SPN-09 | P1: Mais inimigos | Specify | Pending |
| SPN-10 | P1: Mais inimigos | Specify | Pending |
| SPN-11 | P1: Mais inimigos | Specify | Pending |
| SPN-12 | P1: Mais inimigos | Specify | Pending |
| SPN-13 | P1: Mais inimigos | Specify | Pending |
| SPN-14 | P1: Mais inimigos | Specify | Pending |
| LIM-01 | P1: Limitador | Specify | Pending |
| LIM-02 | P1: Limitador | Specify | Pending |
| LIM-03 | P1: Limitador | Specify | Pending |
| LIM-04 | P1: Limitador | Specify | Pending |
| LIM-05 | P1: Limitador | Specify | Pending |
| LIM-06 | P1: Limitador | Specify | Pending |
| LIM-07 | P1: Limitador | Specify | Pending |
| LIM-08 | P1: Limitador | Specify | Pending |
| ECN-01 | P1: Renda | Specify | Pending |
| ECN-02 | P1: Renda | Specify | Pending |
| ECN-03 | P1: Renda | Specify | Pending |
| ECN-04 | P1: Renda | Specify | Pending |
| ECN-05 | P1: Renda | Specify | Pending |
| ECN-06 | P1: Renda | Specify | Pending |
| ECN-07 | P1: Renda | Specify | Pending |
| ECN-08 | P1: Renda | Specify | Pending |
| ECN-09 | P1: Renda | Specify | Pending |
| BFX-01 | P1: Chefe | Specify | Pending |
| BFX-02 | P1: Chefe | Specify | Pending |
| BFX-03 | P1: Chefe | Specify | Pending |
| BFX-04 | P1: Chefe | Specify | Pending |
| BFX-05 | P1: Chefe | Specify | Pending |
| BFX-06 | P1: Chefe | Specify | Pending |
| BFX-07 | P1: Chefe | Specify | Pending |
| BFX-08 | P1: Chefe | Specify | Pending |
| BFX-09 | P1: Chefe | Specify | Pending |
| BFX-10 | P1: Chefe | Specify | Pending |
| MST-01 | P2: Maestria | Specify | Pending |
| MST-02 | P2: Maestria | Specify | Pending |
| MST-03 | P2: Maestria | Specify | Pending |
| MST-04 | P2: Maestria | Specify | Pending |
| MST-05 | P2: Maestria | Specify | Pending |
| MST-06 | P2: Maestria | Specify | Pending |
| MST-07 | P2: Maestria | Specify | Pending |
| MST-08 | P2: Maestria | Specify | Pending |
| EDG-01 | Edge cases | Specify | Pending |
| EDG-02 | Edge cases | Specify | Pending |
| EDG-03 | Edge cases | Specify | Pending |
| EDG-04 | Edge cases | Specify | Pending |
| EDG-05 | Edge cases | Specify | Pending |
| EDG-06 | Edge cases | Specify | Pending |

**Coverage:** 61 total, 0 mapped to tasks, 61 unmapped ⚠️ (Tasks ainda não feitas)

---

## Success Criteria

- [ ] Smoke: rodada 1 com seed 1 tem 6 inimigos, nenhum nasce dentro da câmera e nunca há mais de 2 em `windup|attack`.
- [ ] Teste puro: renda esperada ≥ 15 (r1) e ≥ 100 (r4).
- [ ] Smoke: na rodada 5, só com corpo a corpo (investida na parede + finalizador), o chefe de 400 HP perde pelo menos 25% do HP em 20 s de luta scriptada.
- [ ] UAT do usuário: consegue comprar técnica na 1ª loja e chega ao 1º chefe com uma técnica no Nv2.
