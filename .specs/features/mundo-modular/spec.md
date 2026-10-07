# Mundo modular — Specification

## Problem Statement

O jogo inteiro acontece numa sala de 40x17 tiles (`src/data/level1.ts`) com plataformas flutuantes. A run repete o
mesmo espaço da rodada 1 ao chefe, e o espaço não participa da luta. O usuário pediu um mapa mais aberto, com cara de
Sifu na jogabilidade e com rejogabilidade estruturada (plano aprovado em 07/10/2026: "O Bairro sob o Véu").

Esta feature é a primeira da expansão (F18 a F21). Ela troca a sala única por **áreas montadas com módulos feitos à
mão**, sorteados pela seed. O fluxo vira híbrido: a onda acontece numa área aberta, fechar a onda rompe o **selo** e o
jogador caminha até a saída, passa pela **konbini** (a loja) e entra na próxima área. Tudo no térreo: escadas, andares
e a Casa Amaldiçoada são da F19.

## Goals

- [ ] Nenhuma rodada comum acontece na sala de teste: cada área tem de 2 a 3 módulos, de 48 a 120 tiles de largura, sem
      plataformas flutuantes.
- [ ] Duas seeds diferentes dão sequências de áreas diferentes, e a mesma seed sempre dá a mesma sequência.
- [ ] O loop "onda → selo rompe → caminhar até a saída → konbini (loja) → próxima área" funciona da rodada 1 ao chefe
      da rodada 5 sem travar.
- [ ] Os inimigos continuam chegando rápido num mapa maior: nenhum nasce a mais de 900 px do jogador enquanto houver
      ponto válido mais perto.
- [ ] Todo módulo passa no lint de level design (gramática da seção 3 do plano, recortada para o térreo).
- [ ] Os 35 smokes existentes continuam passando (na sala de teste legada).

## Out of Scope

| Feature | Reason |
| --- | --- |
| Escadas, pisos atravessáveis, buracos, andares, Casa Amaldiçoada, prédio em obras | F19 `verticalidade` (precisa do grafo de navegação dos inimigos) |
| Grafo de navegação e IA que muda de andar | F19 |
| Portas interativas, shoji, janelas, móveis destrutíveis, técnicas × ambiente, spawn diegético | F20 `portas-e-destrutiveis` |
| Telhados, beiradas, vidro, saída dupla (rotas), condições do Véu, desafios, segredos | F21 `perigos-e-rotas` |
| Objetos novos (máquina de venda, lixeira, estante) | F20; aqui os slots usam a cadeira e a garrafa que já existem |
| Variantes de mobília desenhadas por módulo | A variedade da F18 vem dos slots sorteados; variantes chegam com os módulos da F19 a F21 |
| Mudar a economia, a regra da loja ou a frequência da loja | A loja continua abrindo a cada rodada, como na F11; só muda onde ela abre |
| Mudar a IA do chefe ou do inimigo comum | A IA é a mesma; só a escolha do ponto de spawn muda |
| Arte detalhada dos temas (asfalto, muro, torii, fachada da konbini) | P2 desta feature cobre só o mínimo legível (tiles e cor de fundo por tema) |
| Meta-progressão e desbloqueio de módulos | F6 |

---

## Assumptions & Open Questions

**Open questions:** none - all resolved or logged above.

Decisões do agente a partir do plano aprovado. Os números ficam em `src/data/tuning.ts` e nos módulos em
`src/data/modules/`.

### Formato e gramática

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Altura do módulo | Exatamente 17 linhas, igual à `LEVEL_1`; linhas 15 e 16 são o chão sólido em toda a largura | Encaixe garantido entre módulos e mesma câmera vertical de hoje | y |
| Largura do módulo | De 16 a 48 colunas | Cabe 1 espaço de luta de 12 tiles com folga; a área (2 a 3 módulos) fica entre 48 e 120 | y |
| Legenda do módulo | `#` sólido, `.` vazio, `E` ponto de spawn, `c` cadeira, `b` garrafa, `p` slot de objeto. `P` e qualquer outro caractere são proibidos | O spawn do player é da área, não do módulo; o resto da legenda nova é da F19 a F21 | y |
| Plataformas flutuantes | Proibidas: nenhum `#` nas linhas 0 a 14 de um módulo | Pedido do usuário; a verticalidade volta com escadas e andares na F19 | y |
| Espaço de luta | Todo módulo de combate tem ≥ 12 colunas seguidas com as linhas 9 a 14 vazias (pé-direito de 6 tiles) | Seção 3 do plano: 3 inimigos + player sem empilhar | y |
| Pontos de spawn | Todo módulo de combate tem ≥ 2 `E`, todos na linha 14; a konbini tem 0 | Seção 3 do plano; a konbini é segura | y |
| Arma de cenário | Todo módulo de combate tem ≥ 1 `c`, `b` ou `p` | Pilar 1 ("o espaço é uma arma") | y |
| Módulos do lançamento | Combate: `rua` (40 col.), `beco` (20 col.), `parque` (32 col.). Especiais: `konbini` (20 col.) e `santuario` (40 col., chefe) | O plano pede rua, beco e santuário; o `parque` entra para o sorteio ter 3 opções de combate e a regra anti-repetição ter efeito | y |

### Área e sorteio

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Quantos módulos por área | 2 nas rodadas 1 e 2; 3 da rodada 3 em diante; a rodada de chefe é só o `santuario` | Áreas crescem com a run; o chefe tem arena plana e própria | y |
| Montagem | Os módulos ficam lado a lado, da esquerda para a direita, com 1 coluna `#` de parede antes do primeiro e 1 coluna de **selo** depois do último | Mundo contínuo dentro da área; parede impede voltar, selo prende até a onda acabar | y |
| Largura da área | Se a soma passar de 120 colunas, troca o último módulo pelo mais estreito que respeite a regra anti-repetição; se ficar abaixo de 48, acrescenta o `beco` | Mantém a área no intervalo do Goal sem módulo especial | y |
| Sorteio | Stream próprio `seed ^ 0x1f83d9ab` (AD-006). Cada módulo sai uniforme entre os de combate, menos o módulo imediatamente anterior | Determinismo por seed sem mexer nos streams que já existem | y |
| Anti-repetição entre áreas | O primeiro módulo de uma área nunca é o primeiro módulo da área anterior | Regra anti-enjoo do plano; com 3 módulos de combate sempre há opção | y |
| Spawn do player na área | Coluna 3 da área, em cima do chão (linha 14) | Entrada pela esquerda, longe do selo | y |
| Construção entre áreas | A área anterior é destruída inteira (corpos estáticos, imagens de tile, fundo, objetos, pickups, textos flutuantes) e a nova é construída antes do primeiro quadro dela | Mundo físico pequeno: só uma área existe por vez | y |
| Fade da transição | 250 ms escurecendo e 250 ms clareando, com input neutro durante os 500 ms | Disfarça a reconstrução sem pausar o loop | y |

### Travessia, selo e konbini

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Estado novo da run | `traverse` substitui `intermission` no modo modular: entra quando a onda fecha e sai quando o jogador chega à saída. Não tem timer | O jogador anda no próprio ritmo (plano, seção 2) | y |
| Selo | Coluna sólida no fim da área enquanto a run está em `roundActive`; deixa de ser sólida na entrada de `traverse`, com um efeito de 400 ms do talismã queimando | Barreira legível; o efeito é só visual | y |
| Saída | Quando o centro do corpo do player passa do x do selo durante `traverse`, a run recebe `exitReached` uma única vez | Gatilho simples e idempotente | y |
| Pickups no chão ao sair | Fragmentos são creditados, gotas de cura e o Elixir são aplicados (com o teto da vida), e depois somem | Nada coletável se perde por pressa; a coleta continua valendo a pena porque cura antes da konbini | y |
| Objeto na mão ao sair | Some com a área; o player entra na área nova de mãos vazias | Objetos pertencem ao cenário do módulo | y |
| Konbini | Ao chegar à saída, a área vira o módulo `konbini`, o player entra pela esquerda e a loja abre na hora (o `ShopPanel` e o `Shop` de hoje, sem mudança) | Loja diegética com a mesma regra e a mesma frequência da F11 | y |
| Fechar a loja | Faz a transição para a área da próxima rodada e emite `roundStart` | Sem caminhada extra na konbini; o ritmo continua o de hoje | y |
| `?debug&noshop=1` | A saída leva direto à próxima área, sem konbini | Mantém o atalho dos cenários de teste | y |
| Morte em `traverse` | Vale como em `roundActive`: vai para `gameOver` | Ainda há perigo (nenhum, hoje, mas a F21 traz) e a regra fica uniforme | y |

### Spawn num mapa maior

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Alcance do spawn | Candidatos = pontos fora da câmera (margem de 32 px, SPN-07) **e** com distância horizontal ao player ≤ 900 px. A preferência pelas costas (SPN-08) continua sobre esses candidatos | Inimigo que nasce a 3000 px demora e dilui a pressão (risco da seção 10 do plano). 900 px ≈ 2,8 vistas de 320 px de meia-largura | y |
| Sem candidato ao alcance | Usa o ponto fora da câmera mais perto do player; sem nenhum fora da câmera, o `farthestPoint` de hoje | Degrada sem travar | y |

### Compatibilidade

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Sala de teste | `?debug&area=sala` usa a `LEVEL_1` e o fluxo antigo (intermission de 2500 ms → loja na mesma sala). O `?debug&fxlab` sempre usa a sala | 35 smokes medem posições da sala; o laboratório de efeitos precisa do espaço fixo | y |
| Smokes antigos | O runner (`scripts/smoke/run.mjs`) acrescenta `area=sala` a toda URL de cenário que não tenha `area=` nem `modules=` | Nenhum smoke antigo precisa ser reescrito | y |
| Modo padrão | Sem `area=sala`, com ou sem `?debug`, o jogo usa o mundo modular | O link de teste do usuário (`?debug&hd=1…`) já mostra a feature | y |
| `?debug&modules=a,b` | Força a lista de módulos de toda área comum; ids desconhecidos ou de módulo especial são ignorados; lista vazia volta ao sorteio. Não afeta a rodada de chefe | UAT direto num módulo | y |
| Refinamento Jev (AD-007) | Não rodou: não há `TYPESAFE_API_KEY` nesta máquina. O fluxo segue com aviso, como a AD-007 permite | A decisão é consultiva | y |

---

## User Stories

### P1: Módulos com gramática validada ⭐ MVP

**User Story**: Como designer do jogo, quero cada pedaço de cenário escrito como um módulo de dados que um teste valida,
para que nenhum espaço mal planejado chegue ao jogador.

**Why P1**: Sem formato e sem gramática não há o que montar, e a qualidade dos espaços é o pilar da expansão.

**Acceptance Criteria**:

1. MDL-01: The module loader SHALL accept a module only when its grid has exactly 17 rows of equal length between 16 and 48 columns.
2. MDL-02: The module loader SHALL accept only the characters `#`, `.`, `E`, `c`, `b` and `p` in a module grid.
3. MDL-03: IF a module grid breaks MDL-01 or MDL-02 THEN the module loader SHALL throw an error naming the module id and the offending row and column.
4. MDL-04: The level-design lint SHALL fail any module whose rows 15 and 16 are not solid (`#`) in every column.
5. MDL-05: The level-design lint SHALL fail any module with a solid tile in rows 0 to 14.
6. MDL-06: The level-design lint SHALL fail any combat or boss module that has fewer than 12 consecutive columns whose rows 9 to 14 are all non-solid.
7. MDL-07: The level-design lint SHALL fail any combat or boss module with fewer than 2 `E` tiles, or with an `E` outside row 14.
8. MDL-08: The level-design lint SHALL fail any combat or boss module with no `c`, `b` or `p` tile.
9. MDL-09: The level-design lint SHALL fail the `konbini` module if it contains any `E` tile.
10. MDL-10: The module catalog SHALL contain the combat modules `rua` (40 columns), `beco` (20 columns) and `parque` (32 columns) and the special modules `konbini` (20 columns) and `santuario` (40 columns), and every one SHALL pass the lint.

**Independent Test**: `npm test` roda o lint sobre o catálogo; um módulo de teste com uma plataforma na linha 12 falha com a mensagem de MDL-05.

---

### P1: Área montada pela seed ⭐ MVP

**User Story**: Como jogador, quero que cada rodada aconteça num trecho diferente do bairro, para que a run não repita
o mesmo espaço.

**Why P1**: É a base da rejogabilidade pedida.

**Acceptance Criteria**:

1. ARE-01: WHEN a non-boss area is drawn for round 1 or 2 THEN the stage assembler SHALL compose it from 2 combat modules.
2. ARE-02: WHEN a non-boss area is drawn for round 3 or later THEN the stage assembler SHALL compose it from 3 combat modules.
3. ARE-03: WHEN the area for a boss round (`isBossRound`) is drawn THEN the stage assembler SHALL compose it from the `santuario` module only.
4. ARE-04: The stage assembler SHALL never place the same module id in two adjacent positions of one area.
5. ARE-05: WHEN two consecutive non-boss areas are drawn THEN the stage assembler SHALL never use the same module id as the first module of both.
6. ARE-06: The stage assembler SHALL keep every non-boss area between 48 and 120 columns wide, counting the wall and seal columns.
7. ARE-07: The stage assembler SHALL draw from its own RNG stream seeded with `seed ^ 0x1f83d9ab`, so the same seed SHALL give the same sequence of module ids for rounds 1 to 10.
8. ARE-08: The assembled area SHALL have one solid wall column before the first module and one seal column after the last module.
9. ARE-09: WHEN an area is built THEN the scene SHALL place the player spawn at column 3 of the area, standing on row 14.
10. ARE-10: WHEN an area is built THEN the scene SHALL set the world camera bounds to the area width and height in pixels.
11. ARE-11: WHEN an area is replaced THEN the scene SHALL destroy every static terrain body, tile image, background graphic, prop, pickup and floating text of the previous area, so that the Matter static body count SHALL equal the new area's merged solid rectangles plus its seal.
12. ARE-12: WHERE `?debug&modules=<ids>` lists known combat module ids THEN the stage assembler SHALL compose every non-boss area from exactly those modules, in that order.
13. ARE-13: IF `?debug&modules=` contains only unknown or special ids THEN the stage assembler SHALL ignore the parameter and draw normally.

**Independent Test**: com `?debug&seed=7` a rodada 1 tem 2 módulos e a 3 tem 3; recarregar com a mesma seed dá os mesmos ids no snapshot.

---

### P1: Selo, travessia e saída ⭐ MVP

**User Story**: Como jogador, quero que vencer a onda rompa o selo e me deixe seguir em frente no meu ritmo, para que
o mapa pareça um lugar que eu atravesso, não uma sala que reinicia.

**Why P1**: É o fluxo híbrido escolhido pelo usuário.

**Acceptance Criteria**:

1. TRV-01: WHILE the run is in `roundActive` the seal column SHALL be solid for the player, enemies and props.
2. TRV-02: WHEN the last enemy of a round dies in the modular world THEN the run SHALL go from `roundActive` to `traverse` and emit `roundCleared` in the same update.
3. TRV-03: WHEN the run enters `traverse` THEN the scene SHALL remove the seal's solid body and play a 400 ms seal-burn effect.
4. TRV-04: WHILE the run is in `traverse` the run SHALL accept player input (`acceptsPlayerInput` returns `true`), spawn no enemy and advance no run timer.
5. TRV-05: WHEN the player body's center x passes the seal column's left edge while the run is in `traverse` THEN the scene SHALL call `exitReached()` exactly once for that area.
6. TRV-06: IF `exitReached()` is called while the run is not in `traverse` THEN the run SHALL ignore it.
7. TRV-07: WHEN the area is left through the exit THEN the scene SHALL credit every fragment pickup still in the area to the wallet and apply every heal drop and Elixir still in the area, capped at max HP.
8. TRV-08: WHEN the area is left through the exit THEN the scene SHALL destroy the prop the player is holding, leaving the player's hands empty.
9. TRV-09: IF the player dies while the run is in `traverse` THEN the run SHALL go to `gameOver` with the same summary rules as `roundActive`.
10. TRV-10: WHEN an area transition happens THEN the scene SHALL fade the world camera to black in 250 ms, rebuild, and fade back in 250 ms, with neutral player input during the 500 ms.

**Independent Test**: smoke com `?debug&modules=beco,parque&maxAlive=1`: mata a onda (tecla 2), confirma `traverse` e o selo aberto, anda para a direita e vê a konbini.

---

### P1: Konbini como loja ⭐ MVP

**User Story**: Como jogador, quero comprar na konbini entre uma área e outra, para que a loja faça parte do bairro.

**Why P1**: Fecha o loop híbrido sem mudar a economia.

**Acceptance Criteria**:

1. KON-01: WHEN `exitReached()` resolves without `?debug&noshop=1` THEN the scene SHALL build the `konbini` module as the area, place the player at its column 3 and the run SHALL go to `shop` and emit `shopOpen` for the current round.
2. KON-02: WHILE the run is in `shop` inside the konbini the shop SHALL behave exactly as before this feature (same offers, prices, reroll and panel).
3. KON-03: WHEN the shop is closed THEN the scene SHALL build the next round's area, the run SHALL emit `roundStart` for round + 1, and the player SHALL stand at column 3 of the new area.
4. KON-04: WHERE `?debug&noshop=1` is set, WHEN `exitReached()` resolves THEN the scene SHALL build the next round's area directly and the run SHALL emit `roundStart` for round + 1 without `shopOpen`.
5. KON-05: The konbini area SHALL never spawn an enemy.

**Independent Test**: no mesmo smoke da travessia, a loja abre na konbini; fechar com Esc/J leva à rodada 2 numa área nova.

---

### P1: Spawn ao alcance num mapa maior ⭐ MVP

**User Story**: Como jogador, quero que os inimigos cheguem rápido mesmo numa área comprida, para que a pressão da onda
não se perca.

**Why P1**: Risco principal de um mapa maior (seção 10 do plano).

**Acceptance Criteria**:

1. RCH-01: The spawn picker SHALL only consider, as candidates, points outside the camera margin (SPN-07) whose horizontal distance to the player is at most 900 px.
2. RCH-02: WHEN a point is exactly 900 px from the player and outside the camera margin THEN the spawn picker SHALL treat it as a candidate; WHEN it is 901 px away THEN the spawn picker SHALL not.
3. RCH-03: IF no point is a candidate under RCH-01 THEN the spawn picker SHALL return the off-camera point nearest the player.
4. RCH-04: IF no point is outside the camera margin THEN the spawn picker SHALL return `farthestPoint` as before.
5. RCH-05: The spawn picker SHALL keep the back-side preference (SPN-08) and the per-point gap (SPN-09) over the RCH-01 candidates.

**Independent Test**: teste em Node com pontos a 500, 900, 901 e 2000 px.

---

### P1: Sala de teste e compatibilidade ⭐ MVP

**User Story**: Como desenvolvedor, quero manter a sala de teste e os smokes que dependem dela, para que a feature não
quebre o que já foi validado.

**Why P1**: 35 smokes e o laboratório de efeitos medem a geometria da sala.

**Acceptance Criteria**:

1. LEG-01: WHERE `?area=sala` is set the scene SHALL build `LEVEL_1` and the run SHALL use the `intermission` flow (2500 ms, then `shop`) with no seal, no `traverse` and no konbini.
2. LEG-02: WHERE `?debug&fxlab` is set the scene SHALL build `LEVEL_1` regardless of `area` or `modules`.
3. LEG-03: The smoke runner SHALL append `area=sala` to every scenario URL that contains neither `area=` nor `modules=`.
4. LEG-04: WHEN neither `area=sala` nor `fxlab` is set THEN the scene SHALL use the modular world.
5. LEG-05: The debug snapshot SHALL expose `area: { mode: 'modular' | 'sala', modules: string[], widthPx: number, heightPx: number, sealed: boolean, exitX: number | null, staticBodies: number }`, where `staticBodies` is the count of static Matter bodies in the world.

**Independent Test**: `npm run smoke` passa os 35 cenários antigos; `?debug&area=sala` abre a sala de sempre.

---

### P2: Objetos sorteados nos slots

**User Story**: Como jogador, quero que o mesmo módulo traga armas diferentes de uma run para outra, para que eu releia
o espaço.

**Why P2**: Camada 2 de rejogabilidade; o loop funciona sem ela.

**Acceptance Criteria**:

1. SLT-01: WHEN an area is built THEN each `p` slot SHALL become a chair with chance 0.4, a bottle with chance 0.4, or stay empty with chance 0.2, drawn from its own slot RNG stream seeded with `seed ^ 0x5be0cd19`.
2. SLT-02: The stage assembler SHALL never draw module ids from the slot RNG stream, so that adding or removing a slot never changes which modules are drawn for the same seed.
3. SLT-03: Fixed `c` and `b` tiles SHALL always spawn their prop.

**Independent Test**: teste em Node: 1000 slots sorteados ficam em 40/40/20 ± 5 pontos.

---

### P2: Tema visual por módulo

**User Story**: Como jogador, quero perceber que saí da rua e entrei no beco, para que o bairro tenha lugares.

**Why P2**: Legibilidade; a jogabilidade não depende disso.

**Acceptance Criteria**:

1. THM-01: Every module SHALL declare a theme among `rua`, `beco`, `parque`, `konbini` and `santuario`.
2. THM-02: WHEN an area is built THEN the scene SHALL draw each module's tiles with the frames of its theme and its background band with the theme color, using only `PALETTE` colors.
3. THM-03: The seal column SHALL be drawn with the `seal` tile frame while solid and SHALL not be drawn after the seal-burn effect ends.

**Independent Test**: captura visual de uma área `rua,beco,parque` mostra três chãos distintos e o selo.

---

## Edge Cases

- IF the player and the last enemy die in the same update THEN the run SHALL go to `gameOver` and never to `traverse` (RUN-04 priority).
- IF `exitReached()` is called twice in the same update THEN the run SHALL resolve only one transition.
- WHEN a new run starts from `gameOver` THEN the scene SHALL build round 1's area for the new seed and place the player at its column 3.
- WHEN `?debug&round=5` is set THEN the first area SHALL be the `santuario`.
- IF a prop is thrown past the opened seal THEN the scene SHALL not call `exitReached()` (only the player body triggers it).
- WHEN the boss round is cleared THEN the run SHALL enter `traverse` and the santuário seal SHALL open like any other.

---

## Implicit-requirement dimensions

| Dimension | Coverage |
| --- | --- |
| Input validation & bounds | MDL-01..03 (dados do módulo), ARE-12/13 (`modules=`), RCH-02 (limite de 900 px) |
| Failure / partial-failure states | MDL-03 (módulo inválido falha alto); ARE-13 (parâmetro inválido degrada) |
| Idempotency / retry / duplicate | TRV-05, TRV-06 e o edge case de `exitReached` duplo |
| Auth boundaries & rate limits | N/A because o jogo é local e sem contas |
| Concurrency / ordering | Edge case de morte e último abate no mesmo update; a ordem fixa do `Run.update` continua |
| Data lifecycle / expiry | ARE-11 (nada da área anterior sobrevive), TRV-07/08 (pickups e objeto na mão) |
| Observability | LEG-05 (snapshot `area`) |
| External-dependency failure | N/A because a feature não chama nada externo |
| State-transition integrity | TRV-02, TRV-04, TRV-06, TRV-09, KON-01, KON-03, KON-04, LEG-01 |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| MDL-01 | P1: Módulos com gramática validada | Design | Implementing |
| MDL-02 | P1: Módulos com gramática validada | Design | Implementing |
| MDL-03 | P1: Módulos com gramática validada | Design | Implementing |
| MDL-04 | P1: Módulos com gramática validada | Design | Implementing |
| MDL-05 | P1: Módulos com gramática validada | Design | Implementing |
| MDL-06 | P1: Módulos com gramática validada | Design | Implementing |
| MDL-07 | P1: Módulos com gramática validada | Design | Implementing |
| MDL-08 | P1: Módulos com gramática validada | Design | Implementing |
| MDL-09 | P1: Módulos com gramática validada | Design | Implementing |
| MDL-10 | P1: Módulos com gramática validada | Design | Implementing |
| ARE-01 | P1: Área montada pela seed | Design | Implementing |
| ARE-02 | P1: Área montada pela seed | Design | Implementing |
| ARE-03 | P1: Área montada pela seed | Design | Implementing |
| ARE-04 | P1: Área montada pela seed | Design | Implementing |
| ARE-05 | P1: Área montada pela seed | Design | Implementing |
| ARE-06 | P1: Área montada pela seed | Design | Implementing |
| ARE-07 | P1: Área montada pela seed | Design | Implementing |
| ARE-08 | P1: Área montada pela seed | Design | Implementing |
| ARE-09 | P1: Área montada pela seed | Design | Implementing |
| ARE-10 | P1: Área montada pela seed | Design | Implementing |
| ARE-11 | P1: Área montada pela seed | Design | Implementing |
| ARE-12 | P1: Área montada pela seed | Design | Implementing |
| ARE-13 | P1: Área montada pela seed | Design | Implementing |
| TRV-01 | P1: Selo, travessia e saída | Design | Implementing |
| TRV-02 | P1: Selo, travessia e saída | Design | Implementing |
| TRV-03 | P1: Selo, travessia e saída | Design | Implementing |
| TRV-04 | P1: Selo, travessia e saída | Design | Implementing |
| TRV-05 | P1: Selo, travessia e saída | Design | Implementing |
| TRV-06 | P1: Selo, travessia e saída | Design | Implementing |
| TRV-07 | P1: Selo, travessia e saída | Design | Implementing |
| TRV-08 | P1: Selo, travessia e saída | Design | Implementing |
| TRV-09 | P1: Selo, travessia e saída | Design | Implementing |
| TRV-10 | P1: Selo, travessia e saída | Design | Implementing |
| KON-01 | P1: Konbini como loja | Design | Implementing |
| KON-02 | P1: Konbini como loja | Design | Implementing |
| KON-03 | P1: Konbini como loja | Design | Implementing |
| KON-04 | P1: Konbini como loja | Design | Implementing |
| KON-05 | P1: Konbini como loja | Design | Implementing |
| RCH-01 | P1: Spawn ao alcance num mapa maior | Design | Implementing |
| RCH-02 | P1: Spawn ao alcance num mapa maior | Design | Implementing |
| RCH-03 | P1: Spawn ao alcance num mapa maior | Design | Implementing |
| RCH-04 | P1: Spawn ao alcance num mapa maior | Design | Implementing |
| RCH-05 | P1: Spawn ao alcance num mapa maior | Design | Implementing |
| LEG-01 | P1: Sala de teste e compatibilidade | Design | Implementing |
| LEG-02 | P1: Sala de teste e compatibilidade | Design | Implementing |
| LEG-03 | P1: Sala de teste e compatibilidade | Design | Pending |
| LEG-04 | P1: Sala de teste e compatibilidade | Design | Implementing |
| LEG-05 | P1: Sala de teste e compatibilidade | Design | Pending |
| SLT-01 | P2: Objetos sorteados nos slots | Design | Implementing |
| SLT-02 | P2: Objetos sorteados nos slots | Design | Implementing |
| SLT-03 | P2: Objetos sorteados nos slots | Design | Implementing |
| THM-01 | P2: Tema visual por módulo | Design | Pending |
| THM-02 | P2: Tema visual por módulo | Design | Pending |
| THM-03 | P2: Tema visual por módulo | Design | Pending |

**Coverage:** 54 total, 0 mapped to tasks, 54 unmapped ⚠️ (mapeamento no Tasks)

---

## Success Criteria

- [ ] Uma run com `?debug&seed=N&noshop=1` atravessa as rodadas 1 a 5 (chefe incluído) no smoke, sem erro no console.
- [ ] As 10 primeiras áreas de 20 seeds diferentes respeitam ARE-04, ARE-05 e ARE-06 (teste em Node).
- [ ] `npm run gate` e `npm run smoke` passam, com os 35 smokes antigos e os novos da feature.
- [ ] UAT do usuário: a rua, o beco, o parque e o santuário leem como lugares diferentes, e a travessia não quebra o
      ritmo.
