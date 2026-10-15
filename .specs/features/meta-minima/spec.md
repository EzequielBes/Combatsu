# Meta mínima (F39, restante) — Specification

## Problem Statement

O branch já tem o núcleo da F39 (`recorde-e-recomeco`): save versionado, recorde no HUD, painel de fim de run com dano
por fonte e recomeço com J em menos de 3 s. Falta o que faz a run seguinte começar diferente e dá um alvo além do
recorde: hoje toda run abre com os dois slots vazios, nada se conquista entre runs, a receita do Vazio Roxo é
esquecida ao morrer e o painel de fim não diz o que está perto de sair. O plano (`docs/plano-builds-e-habilidades.md`,
seção 5.10 e linha F39 da seção 6) pede a técnica inicial (1 de 3 sorteadas entre as liberadas, antes da r1, pelo
stream `startRng`), cerca de 8 conquistas que liberam só conteúdo no pool, o Grimório persistente (receitas vistas e
dica na loja) e a linha "falta pouco para: X" no fim da run.

O conteúdo que as conquistas liberam nasce em outras fases (F31 Domínio, F34 técnicas JJK, F35 talentos, F40 votos).
Esta spec define um registro de desbloqueios genérico: cada conquista aponta para um conteúdo, e só a conquista cujo
conteúdo já existe no código quando ela for implementada fica ativa. As outras dormem e acordam sozinhas quando o
conteúdo entrar, sem mudar o registro.

## Goals

- [ ] Toda run sem `?debug` abre com o painel `Técnica inicial`: 3 técnicas liberadas, sorteadas pelo `startRng`, cada carta dizendo o que a técnica faz; uma tecla equipa a escolhida de graça no slot 0, Enter começa sem técnica e com o preço da carta mais barata em fragmentos, e nada anda enquanto o painel está aberto. A técnica recém-liberada vem garantida na 1ª carta do painel seguinte.
- [ ] O registro tem as 8 conquistas da tabela CNQ-01; cada uma ativa tranca o seu conteúdo em todo sorteio até ser cumprida, e cumprir libera o conteúdo já no próximo sorteio da mesma run, com o aviso `Liberado: <conteúdo>`.
- [ ] Conquista com conteúdo que ainda não existe no código fica dormente: não tranca nada, não conta progresso e não aparece no painel. Com zero conquistas ativas o jogo roda igual, só sem a linha "falta pouco".
- [ ] Desbloqueios, progresso das conquistas e Grimório sobrevivem ao recarregar a página (save v2 com migração da v1 que mantém o recorde).
- [ ] A loja mostra a dica do Grimório quando metade de uma receita está na mão, com as peças e o resultado revelados se a receita já foi vista em alguma run.
- [ ] O painel de fim de run mostra o que a run liberou, `Falta pouco para: <conteúdo> (<tipo>) · <condição> (<atual>/<alvo>)` com a conquista de contagem mais perto e `Desafio: <conteúdo> (<tipo>) · <condição>` com um marco ainda trancado, que gira com a rodada da morte para todo marco aparecer.
- [ ] O recomeço continua rápido: com o painel da técnica inicial, a escolha é aceita até 3000 ms depois da morte.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Save, recorde, marcador, painel de fim de run, dano por fonte, recomeço com J | Prontos neste branch (`recorde-e-recomeco`); aqui só são estendidos |
| O conteúdo liberado em si (Boogie Woogie, Ressonância, Fala, Zona Negra, Hora Extra, Proporção 7:3, Restrição Celestial, 4º tambor do Jackpot) | Cada um é da sua fase (F31, F34, F35, F40); esta feature só registra a conquista e tranca o conteúdo quando ele existir |
| O efeito do 4º tambor do Jackpot | A F31 define 3 tambores e não define o 4º; a conquista `jackpots` dorme até uma fase declarar a melhoria `jackpotTambor4` |
| Conquista que dá poder (dano, vida, energia, preço) | Decisão do plano: o desbloqueio é só de conteúdo; poder permanente é o Altar, depois da F41 |
| Altar, moeda permanente, estilos iniciais, seed diária, Panteão, Graus de maldição, Sukuna na r30 | Plano, seção 5.10, coluna "Depois" |
| Página ou tela do Grimório e lista de conquistas num menu | O pedido é a dica na loja e o "falta pouco"; uma tela própria é conteúdo de depois |
| Receitas novas, formato `{kind, id, minLevel}[]`, Duos, Uniões e Evoluções além do Roxo | F33, F36 e F37; o Grimório lê o formato que existir |
| Conquistas da leva 2 (Convergência, Cães, Trovão, Vazio Ilimitado, talentos e afixos da leva 2) | F41; entram como linhas novas no registro, sem mudar o formato |
| Apagar o save ou zerar o progresso pela interface | Não pedido; `?debug&nosave=1` e `?debug&unlock=` cobrem os testes |
| Sincronizar o save entre abas ou dispositivos | Fora do escopo de um save local mínimo (igual à `recorde-e-recomeco`) |
| Trancar conteúdo que já existe antes da F39 | As 4 técnicas à venda, as 6 passivas, os 8 votos, o arsenal e a receita do Roxo continuam livres desde a 1ª run |
| Técnica inicial com nível acima do primeiro, ou duas técnicas iniciais | O plano pede uma técnica; o resto se compra |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Decisões do plano que valem | 3 técnicas + Domínio, pool de 7 vagas, arma imbuída e escala do inimigo na F30 (decisões 1, 3, 5 e 6 da seção 7); "nada automático" | Confirmadas pelo usuário; nesta feature "nada automático" quer dizer que o painel da técnica inicial nunca escolhe sozinho nem fecha por tempo | y |
| Pool da técnica inicial | As técnicas vendidas na loja como carta de técnica (`kind: 'technique'`) que estão liberadas; o resultado de União ou Evolução (hoje o `roxo`) nunca entra | "1 de 3 sorteadas entre as liberadas"; a União é prêmio de receita, não ponto de partida | y (plano) |
| Nível e preço da técnica inicial | Entra no slot 0 no nível que a 1ª compra dá, sem gastar fragmentos; daí em diante é uma técnica equipada como qualquer outra (preço do próximo nível, receitas, abandono) | É uma compra grátis, não uma técnica especial; com o slot 0 ocupado a regra da loja de hoje vale sem caso novo. Abandonar devolve a fração do que foi gasto nela, que é 0: a técnica grátis não vira fragmento | n |
| Recusar a técnica inicial | Enter começa a run sem técnica e credita o preço de Nv 1 (`cost.base` da carta da loja) da carta mais barata entre as oferecidas; o rodapé mostra o número | Recusa sem nada em troca é opção morta: ninguém aperta Enter, e a conquista `chefeSemTecnica` vira jogar contra o painel. Com os fragmentos a troca é real: técnica agora (a r1 com ela, entre 3 que não escolhi) contra o valor da carta mais barata para gastar na 1ª loja no que eu quiser (outra técnica, passiva, atributo). O valor nunca passa o da carta mais barata, então recusar nunca rende mais que pegar; o preço vem da carta e acompanha a F30 sem número novo. O painel de votos já usa Enter para recusar | n |
| Técnica recém-liberada | A técnica liberada por conquista que ainda não apareceu num painel da Técnica inicial entra como a 1ª carta do próximo painel, com a etiqueta `Novo`; as outras 2 saem do sorteio sem ela. Com mais de uma, a 1ª na ordem de desbloqueio; as outras esperam os painéis seguintes. Sai da lista quando um painel a oferece, escolhida ou não. A lista vive só em memória (o diretor sobrevive ao R e ao J) e some ao recarregar a página | Com 7 técnicas no pool, o sorteio de 3 pode passar runs sem mostrar o que acabou de sair, e o prêmio some; a 1ª carta garantida é o momento de usar o que ganhou. Em memória para não abrir um campo no save só para isso | n |
| Texto da carta da técnica inicial | Nome, `Nv 1/<nível máximo da carta>`, o papel da técnica (`STARTER_ROLES[id]` nos dados, até 20 caracteres, omitido se não houver) e os números do Nv 1: `<custo> CE · <recarga> s` | O texto da loja para técnica nova é `Nova · slot 1` (`core/shop.ts:114-121`), que não ajuda a escolher; a escolha precisa dizer o que cada uma faz. O nível máximo vem da carta porque a F30 leva as técnicas ao Nv 6 | n |
| Teclas do painel | 1, 2 e 3 escolhem a carta; Enter recusa; nenhuma outra tecla faz nada | As mesmas do painel de votos (`shopDirector.updateVowPanel`), já no `input.ts` como `buySlot` e `confirm` | n |
| Onde o painel abre | Toda run nova (do título e do recomeço) entra em `roundActive` na r1 como hoje, com o painel aberto e o jogo congelado como na loja (SHOP-33): nada de spawn, temporizador da run, física, energia ou recarga anda; o player recebe input neutro | Mantém o RST-01 e a máquina da `Run` sem estado novo (`run.ts` está na lista de exceções de complexidade do `.oxlintrc.json`); o congelamento segue a regra da loja que já existe. O como (pular o `run.update` ou outro) fica para o design | n |
| Banner da r1 com o painel aberto | O banner `Rodada 1` (ou a variante de recorde, RMK-05) só aparece quando o painel fecha, por `RUN.bannerMs` | Um banner que expira atrás do painel não é visto | n |
| Recomeço com o painel | O RST-02 passa a valer para a escolha: a 1ª tecla do painel é aceita até 3000 ms depois da morte, e o player recebe input no update seguinte à escolha | O alvo do plano é "recomeço em menos de 3 s"; o tempo que o jogador gasta pensando não é do jogo | n |
| Painel no `?debug` | Com `?debug` o painel só abre com `starter=1`; `tech=` vence e nunca abre o painel | Os smokes de hoje apertam J e esperam lutar; nenhum muda | n |
| Stream `startRng` | Criado a cada run nova com `seed ^ <sal próprio>` em `core/run.ts`, junto dos outros, e consumido só pelo sorteio da técnica inicial; o sal é diferente dos 10 de hoje e dos reservados pelas outras specs (`axisRng`, `choiceRng`, `chestRng`, `bossAffixRng`, `domainRng`) | Regra da seção 6 do plano: todo sorteio novo tem stream com sal em `run.ts`. O stream cresce o `run.ts` em poucas linhas sem mudar complexidade | y (plano) |
| Sorteio | Embaralhamento parcial uniforme do pool na ordem de declaração do `TECHNIQUES`, 3 sem repetir; com menos de 3 no pool, todas, na ordem do sorteio | Determinístico por seed e conjunto liberado, o que o teste precisa | n |
| As 8 conquistas | As da tabela CNQ-01. Quatro vêm do plano (r5 → Boogie Woogie; 3 Kokusen numa rodada → Zona Negra; chefe sem técnicas → Restrição Celestial; 3 Jackpots → mais um tambor); as outras quatro são propostas desta spec | O plano pede "~8" e dá 4 exemplos; as propostas usam eventos que o jogo já tem (chefe derrotado, finalizador, Contra, golpe aceito) e ligam cada conquista ao estilo do conteúdo que ela libera | n (4 do plano: y) |
| "3 Jackpots" | Soma entre runs | Cada Jackpot pede uma barra cheia de Domínio (~46 s); 3 numa run só ficaria fora do alcance de quem morre entre a r6 e a r12, a run normal do plano | n |
| Rótulo da condição | Diz a tecla ou a técnica que a condição pede quando não é óbvio: Kokusen só sai do Punho Divergente, Contra é J logo após uma defesa certa, finalizador é J + K | O rótulo é a única explicação que o jogador recebe (não há tela de conquistas); `3 Kokusen na mesma rodada (0/3)` não diz a quem nunca comprou o Divergente por onde começar | n |
| Progresso do `chefeR10` | Contagem `run`: a rodada do chefe derrotado na run (o da r5 dá 5/10), alvo 10 | Como marco 0/1, "vencer o chefe da r10" nunca entraria no "falta pouco" e não diria que vencer o da r5 é metade do caminho | n |
| "Vencer um chefe sem técnicas" | O chefe é derrotado e nenhum slot de técnica esteve ocupado em nenhum update entre o spawn dele e a derrota; o Domínio pode ser usado | O Domínio não ocupa slot de técnica, e a Amplificação é a ultimate do lutador que a Restrição Celestial converte | n |
| Ids de conteúdo | Os que as outras specs já fixam: `boogie`, `ressonancia`, `fala` (F34), `zonaNegra`, `horaExtra`, `proporcao` (F35). `restricaoCelestial` (F40) e `jackpotTambor4` (melhoria de Domínio) são provisórios: a fase que criar o conteúdo usa esse id ou troca a linha do registro | A conquista acorda pelo id; id errado é só uma conquista dormente, não uma quebra | n |
| Conteúdo existe | Técnica: id em `TECHNIQUES`; talento: id em `PERKS`; voto: id em `VOWS`; melhoria de Domínio: id na lista de melhorias que a fase do Domínio declarar nos dados | Leitura direta das tabelas de `data/`, sem lista à parte para manter | n |
| Conquista dormente | Não tranca, não avalia, não guarda progresso, não aparece no painel nem no aviso | A conquista deve ser vista no momento em que o conteúdo dela pode ser usado; progresso de algo que não existe seria número sem sentido | n |
| Conteúdo trancado em sorteio | Nenhum sorteio de oferta o inclui: técnica inicial, cartas da loja, baú do chefe, Baú do Véu e painel de votos. Melhoria de Domínio trancada não vale | "Liberam só conteúdo no pool" | y (plano) |
| Quando o liberado aparece | Do próximo sorteio em diante, na mesma run; uma loja já aberta não sorteia de novo | Liberar e só ver na run seguinte apaga o momento; sortear de novo a loja aberta mudaria cartas na frente do jogador | n |
| Progresso guardado | Melhor valor já alcançado (conquista "numa run" ou "numa rodada") ou soma (conquista "entre runs"), por id; marco vale 0 ou 1 | O "falta pouco" lê o melhor que o jogador já fez, não só a última run | n |
| Quando grava | No update em que uma conquista se cumpre ou o Grimório ganha receita (uma escrita por update, mesmo com duas coisas), e na morte quando o recorde mudou ou o progresso mudou desde a última escrita | Conquista no meio da run não pode sumir porque a aba fechou; o progresso fino só na morte segue o REC-06 | n |
| Save corrompido na parte da meta | Descarta o save inteiro (SAVE-05 vale para os campos novos) | Mesma regra do recorde; o jogo escreve o save sozinho e corrupção é rara | n |
| Id desconhecido no save (desbloqueio, progresso, Grimório) | Fica guardado e é ignorado | Um id de um build mais novo ou de conteúdo removido não derruba o save | n |
| Chave da receita no Grimório | O id do resultado (`Recipe.into`, hoje `roxo`; no formato da F37, o id do item que nasce) | O resultado identifica a receita nos dois formatos | n |
| Receita "vista" | Quando a carta dela aparece numa loja aberta (inclusive depois de reroll), quando o baú do chefe a oferece, ou quando a fusão acontece | É o momento em que o jogador lê a receita inteira | n |
| "Metade da receita na mão" | Pelo menos metade das peças na mão e a receita ainda não pronta (alguma peça fora da mão ou abaixo do nível que a receita pede), com peça na mão = técnica equipada, talento ou passiva tomada, ou arma em qualquer nível; com 2 peças, 1 na mão ou as 2 com alguma abaixo do nível | Texto do plano (5.7) no formato de hoje (2 peças) e no da F37. Com as duas peças no Nv 1 a receita ainda não fecha; esconder a dica justo aí deixaria o jogador sem saber que precisa levar as duas ao nível pedido | n |
| Dica do Grimório | Uma linha só, da 1ª receita elegível na ordem dos dados, peças na mão primeiro: `Grimório: <peça na mão> Nv <n> + <outra peça> Nv <n> → <resultado>` se a receita está no Grimório; senão `Grimório: <peça na mão> + ? → ?`, ou `Grimório: <peças na mão> → ?` com todas na mão | A receita vista fica revelada (plano 5.7), com o nível que cada peça pede (hoje Nv 3, `EVOLUTION_LEVEL`): sem ele, quem compra o Azul por causa da dica não vê nada acontecer. A não vista só diz que existe. Uma linha não cobre a loja | n |
| Onde a dica e os avisos nascem | Classes novas criadas pelo `UiSetup` ou pelo diretor da meta (`scenes/test/metaDirector`, nome do plano), que mora junto do `RecordDirector` no `RunDirector` | `TestScene.ts` está em 399/400 linhas efetivas; `Hud.ts` e `ShopPanel.ts` estão nas exceções do lint e não crescem | y (plano, seção 6) |
| Aviso de conquista | `Liberado: <nome do conteúdo> (<tipo>)`, com o tipo `técnica`, `talento`, `voto` ou `Domínio`, centrado em (480, 172) no espaço de UI 960x540, por 2500 ms, na cor de destaque; dois avisos seguidos entram em fila, cada um com os seus 2500 ms | O banner da rodada mora em y 135 (`Hud.ts:150`, `h2 * 0.25`) com ~28 px de altura; y 172 fica logo abaixo sem cobrir. Sem o tipo, `Liberado: Zona Negra` não diz se é para procurar entre as técnicas, os talentos ou os votos | n |
| Aviso de receita nova | `Grimório: <nome da receita>` no mesmo lugar e na mesma fila do aviso de conquista | Um lugar só para mensagens de meta no meio da luta | n |
| Run que não conta | Run iniciada com `?debug&round=N` (N > 1) e o laboratório de efeitos (`?debug&fxlab`) não somam progresso, não cumprem conquista e não registram receita | Mesma regra do REC-09 e do DMG-05 | n |
| Debug | `unlock=all`, `unlock=none` ou `unlock=<id da conquista>,...` fixa os desbloqueios da sessão; `grimoire=<chave>,...` fixa o Grimório; os dois deixam a sessão sem escrita, como `record=` | Os smokes nunca tocam o save real e conseguem montar "trancado", "liberado" e "receita vista" sem jogar runs inteiras | n |
| Smokes que dependem de conteúdo trancável | O passo que ativa a trava de uma conquista põe `unlock=all` nos smokes que já sorteiam aquele conteúdo (por exemplo `talents.smoke.mjs` da F35) | O navegador headless começa com o save vazio: sem isso, o conteúdo some do sorteio e o smoke quebra | n |
| Formato do save | `{ version: 2, record, meta: { unlocks, progress, grimoire } }`; o passo `MIGRATIONS[1]` mantém o `record` e cria `meta` vazio | O `core/save.ts` já tem a lista de passos pronta para isso (SAVE-03) | n |
| Linha "falta pouco" | Entre as conquistas de contagem (`run`, `round`, `total`) ativas e trancadas, a de maior razão progresso/alvo depois da morte; empate pela ordem do registro; com razão 0 em todas, a 1ª da ordem | Com a r1 a conquista `rodada5` já tem 1/5, então a linha quase sempre tem conteúdo; a ordem do registro é a ordem pensada de descoberta. Marco fica de fora: com 0/1 ele perde para qualquer contagem começada e nunca seria visto | n |
| Linha "Desafio" | Um marco (`milestone`) ativo e trancado, o de índice `(rodada em que a run acabou - 1) mod <marcos ativos trancados>` na ordem do registro: `Desafio: <conteúdo> (<tipo>) · <condição>`, logo depois do "falta pouco" | Sem lista de conquistas na interface, o painel de fim é o único lugar onde o jogador fica sabendo de um marco; girar pela rodada da morte mostra todos ao longo das runs sem estado novo e é determinístico para o teste | n |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Técnica inicial ⭐ MVP

**User Story**: Como jogador, quero escolher uma de três técnicas antes da r1, para cada run já começar com uma cara
diferente.

**Why P1**: É o que o plano lista primeiro em "o que faz a run seguinte diferente", e é a única parte que o jogador
sente em toda run, mesmo sem nenhuma conquista ativa.

**Acceptance Criteria**:

1. STA-01: The starter pool SHALL hold every technique id that has a `kind: 'technique'` card in the shop catalog and is unlocked (base or unlocked by an achievement), and SHALL never hold the result of a union or evolution recipe (today `roxo`).
2. STA-02: WHEN a run starts THEN the system SHALL draw 3 distinct techniques from the starter pool with the `startRng` stream, uniformly, from the pool in `TECHNIQUES` declaration order; IF the pool has fewer than 3 techniques THEN the system SHALL offer all of them. WHERE a fresh technique is in the pool (STA-18) it SHALL be the first offer and the other offers SHALL be drawn from the pool without it.
3. STA-03: WHEN a run starts THEN `core/run.ts` SHALL create the `startRng` stream from the run seed XOR a salt of its own, distinct from every other stream salt, and only the starter draw SHALL consume it.
4. STA-04: The starter draw SHALL return the same offers in the same order for the same seed, the same unlocked set and the same fresh technique.
5. STA-05: WHEN a run starts (from `title` or from `gameOver`) THEN the system SHALL show the starter panel with the title `Técnica inicial`, one card per offer with its key (`1`, `2`, `3`), the technique name, `Nv 1/<max level of its shop card>`, its role line from `STARTER_ROLES` when present and its level-1 numbers `<energy cost> CE · <cooldown in seconds> s`, and the footer `1-3 escolhe · Enter: sem técnica (+<refusal fragments>)`.
6. STA-06: WHILE the starter panel is open the run SHALL be in `roundActive` at round 1 with 0 enemies, no enemy SHALL spawn, the run timers, physics, energy regeneration and cooldowns SHALL not advance, and the player SHALL receive neutral input.
7. STA-07: WHEN 1, 2 or 3 is pressed on the open starter panel and that card exists THEN the system SHALL equip that technique in slot 0 at the level a first purchase gives, SHALL leave the wallet unchanged, SHALL close the panel and SHALL push the debug event `starter:<id>`.
8. STA-08: WHEN Enter is pressed on the open starter panel THEN the system SHALL close the panel with both technique slots empty, SHALL add to the wallet the refusal fragments (the level-1 price, `cost.base`, of the cheapest offered card) and SHALL push the debug event `starterRefused`.
9. STA-09: IF 1, 2 or 3 is pressed for a card that does not exist THEN the panel SHALL stay open and nothing SHALL change.
10. STA-10: IF J or Enter is pressed in the same update that starts the run THEN the starter panel SHALL not read that press as a choice or a refusal.
11. STA-11: WHILE the starter panel is open and no key is pressed the panel SHALL stay open, with no time limit and no automatic choice.
12. STA-12: WHEN the starter panel closes THEN gameplay SHALL resume in the next update and the round banner of RMK-05 (`Rodada 1`, or `Rodada 1 · Novo recorde!` when it applies) SHALL show for `RUN.bannerMs` (1500 ms); WHILE the panel is open the round banner SHALL be hidden.
13. STA-13: The technique taken in the starter panel SHALL behave as a bought technique: the shop SHALL price its next level, recipes SHALL count it and abandoning it SHALL follow the rule for any equipped technique, which refunds a share of the fragments spent on it (0 for the free level).
14. STA-14: WHERE `?debug` is present the starter panel SHALL open only with `starter=1`, and WHERE `?debug&tech=` is present the starter panel SHALL not open.
15. STA-15: The starter panel SHALL use only `PALETTE` colors, SHALL fit inside the 960x540 UI space and SHALL be created outside `TestScene.ts`.
16. STA-16: WHERE the starter panel is enabled, WHEN J or Enter is pressed on the run summary panel 1000 ms after the death THEN the starter panel SHALL accept a choice no later than 3000 ms after the death.
17. STA-17: The debug snapshot SHALL report under `meta.starter` whether the panel is open, the offered technique ids in order, the chosen id (`null` when refused or before a choice), the refusal fragments and the fresh technique ids still waiting.
18. STA-18: WHEN an achievement unlocks a technique THEN that technique SHALL be fresh until a starter panel offers it (chosen or not); the first fresh technique in unlock order SHALL be the first offer of the next starter panel with the tag `Novo`, and the fresh list SHALL live in memory only (kept across R and J, lost on page reload).

**Independent Test**: `?debug&hd=1&area=modular&nosave=1&starter=1&seed=7` → J → o painel mostra 3 técnicas e
`enemies` fica 0 por 2 s → apertar 2 → a técnica da 2ª carta está no slot 0 no nível da 1ª compra, os fragmentos não
mudam e a onda começa. Repetir com a mesma seed dá as mesmas 3 cartas; Enter começa com os slots vazios e com o menor
preço de Nv 1 das 3 cartas a mais na carteira.

---

### P1: Registro de desbloqueios e conquistas ⭐ MVP

**User Story**: Como jogador, quero cumprir objetivos que liberam técnicas, talentos e votos novos, para cada run
abrir uma possibilidade que a anterior não tinha.

**Why P1**: É o "desbloqueio novo no pool" do plano; sem ele a técnica inicial sorteia sempre entre as mesmas 4.

**Acceptance Criteria**:

1. CNQ-01: The unlock registry (`data/unlocks.ts`) SHALL hold exactly these 8 achievements, in this order: `rodada5` (start round 5 in a run, target 5, run best, content technique `boogie`); `kokusenRodada` (3 Kokusen in the same round, target 3, round best, talent `zonaNegra`); `chefeSemTecnica` (defeat a boss with no technique equipped, target 1, milestone, vow `restricaoCelestial`); `jackpots` (3 Jackpots, target 3, total across runs, domain upgrade `jackpotTambor4`); `chefeR10` (defeat the round 10 boss, target 10, run best of the defeated boss round, technique `ressonancia`); `contras` (10 Contra hits in a run, target 10, run best, technique `fala`); `semDano` (clear a round from round 3 on without taking a hit, target 1, milestone, talent `horaExtra`); `finalizadorChefe` (defeat a boss with the finisher, target 1, milestone, talent `proporcao`).
2. UNL-01: The unlock rules (`core/unlocks.ts`) SHALL not import Phaser nor touch `localStorage`, and SHALL take the registry, the stored progress and the stored unlocks as input.
3. UNL-02: Each registry entry SHALL declare an id, a condition label in Portuguese, a target integer >= 1, a scope (`run`, `round`, `total` or `milestone`) and one content `{ kind, id }` with kind `technique`, `talent`, `vow` or `domainUpgrade`.
4. UNL-03: An achievement SHALL be active only WHEN its content exists in the game data (technique id in `TECHNIQUES`, talent id in `PERKS`, vow id in `VOWS`, domain upgrade id in the domain upgrade list); otherwise it SHALL be dormant.
5. UNL-04: WHILE an achievement is dormant the system SHALL not evaluate it, SHALL not store progress for it, and SHALL not show it in the toast, the run summary or the snapshot list of active achievements.
6. UNL-05: WHILE an active achievement is not unlocked its content SHALL not appear in any offer draw (starter panel, shop cards, boss chest, Baú do Véu, vow panel), and a locked domain upgrade SHALL not apply.
7. UNL-06: Content that no registry entry names SHALL always be available, and every technique, perk, vow, arsenal item and recipe that exists before this feature SHALL stay available from the first run.
8. UNL-07: WHEN an achievement is unlocked during a run THEN its content SHALL be eligible from the next offer draw of that same run, and an offer already on screen SHALL not be redrawn.
9. UNL-08: The debug equip parameters (`tech=`, `perks=`, `vows=` and the domain parameter of the F31) SHALL equip locked content.
10. CNQ-02: WHEN the progress of an active, not unlocked achievement reaches its target THEN the system SHALL add its id to the unlocks, SHALL push the debug event `unlock:<id>` and SHALL queue the toast `Liberado: <content name> (<kind label>)`.
11. CNQ-03: WHEN the progress is one below the target THEN the achievement SHALL stay locked, and WHEN it equals the target THEN it SHALL unlock in that same update.
12. CNQ-04: The stored progress of a `run` or `round` achievement SHALL be the greatest value reached in any run or round, the stored progress of a `total` achievement SHALL be the sum over all runs, and a `milestone` SHALL store 0 or 1.
13. CNQ-05: WHEN a round starts THEN the `rodada5` progress of the run SHALL be that round number.
14. CNQ-06: WHEN a Kokusen lands THEN the `kokusenRodada` count of the current round SHALL grow by 1, and WHEN a round starts THEN that count SHALL reset to 0.
15. CNQ-07: WHEN a boss is defeated and no technique slot was occupied in any update from that boss spawn to its defeat THEN `chefeSemTecnica` SHALL be met.
16. CNQ-08: WHEN the reels of the Jackpot stop on a jackpot (`jackpot:hit`) THEN the `jackpots` total SHALL grow by 1.
17. CNQ-09: WHEN a boss is defeated THEN the `chefeR10` progress of the run SHALL be the round number of that boss, so the round 5 boss gives 5/10 and the round 10 boss meets it.
18. CNQ-10: WHEN a common enemy or the boss accepts a Contra strike from the player's moveset THEN the `contras` count of the run SHALL grow by 1; a domain activation hit SHALL not count, even with `counter: true`.
19. CNQ-11: WHEN a round with number >= 3 is cleared and the player accepted no enemy, boss or projectile hit since that round started THEN `semDano` SHALL be met; a blocked, parried or dodged hit SHALL not count as accepted.
20. CNQ-12: WHEN the boss finisher brings the boss HP to 0 THEN `finalizadorChefe` SHALL be met; a finisher (`finisher:boss`) that leaves the boss alive SHALL not count.
21. CNQ-13: IF the run started with `?debug&round=N` (N > 1) or runs in the effects lab THEN the system SHALL not add progress, SHALL not unlock and SHALL not register recipes.
22. CNQ-14: IF an achievement is already unlocked THEN meeting it again SHALL not push an event, queue a toast nor write the save.
23. CNQ-15: The toast SHALL be centered at (480, 172) in the 960x540 UI space, in the palette highlight color, for 2500 ms; WHEN a second toast arrives while one is visible THEN it SHALL show after the first one ends, for its own 2500 ms.
24. CNQ-16: The debug snapshot SHALL report under `meta` the unlocked ids, the stored progress by id, the active ids, the dormant ids and the toast on screen (`null` when none).

Tabela do registro (CNQ-01), com os textos que o painel e o aviso mostram:

| Ordem | Id | Rótulo da condição (`<condition label>`) | Alvo | Escopo | Conteúdo | Fase do conteúdo |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `rodada5` | começar a r5 numa run | 5 | `run` | técnica `boogie` (Boogie Woogie) | F34 |
| 2 | `kokusenRodada` | 3 Kokusen na mesma rodada (Punho Divergente) | 3 | `round` | talento `zonaNegra` (Zona Negra) | F35 |
| 3 | `chefeSemTecnica` | vencer um chefe sem técnica equipada | 1 | `milestone` | voto `restricaoCelestial` (Restrição Celestial) | F40 |
| 4 | `jackpots` | 3 Jackpots, somando as runs | 3 | `total` | melhoria `jackpotTambor4` (4º tambor do Jackpot) | sem fase |
| 5 | `chefeR10` | vencer o chefe da r10 | 10 | `run` (rodada do chefe vencido) | técnica `ressonancia` (Ressonância) | F34 |
| 6 | `contras` | 10 Contras numa run (J após defender) | 10 | `run` | técnica `fala` (Fala Amaldiçoada) | F34 |
| 7 | `semDano` | limpar uma rodada da r3 em diante sem levar golpe | 1 | `milestone` | talento `horaExtra` (Hora Extra) | F35 |
| 8 | `finalizadorChefe` | derrotar um chefe com o finalizador (J + K) | 1 | `milestone` | talento `proporcao` (Proporção 7:3) | F35 |

O `<content name>` é o nome do conteúdo nos dados (`TechDef.name`, nome do talento, nome do voto, nome da melhoria), e o
`<kind label>` vem de `KIND_LABELS` (`técnica`, `talento`, `voto`, `Domínio`). Toda linha `Falta pouco para`/`Desafio`
montada com qualquer entrada do registro e o maior progresso possível cabe em `SUMMARY_LINE_MAX` (100) caracteres.

**Independent Test**: com uma técnica de teste no registro apontando para um id que existe (teste de unidade) e com o
conteúdo real quando a fase dele existir: `?debug&hd=1&area=modular&nosave=1&unlock=none` → limpar até começar a r5 →
o aviso `Liberado: Boogie Woogie (técnica)` aparece e o `unlock:rodada5` entra nos eventos → a loja seguinte pode
oferecer o Boogie Woogie, e o painel da Técnica inicial da run seguinte o mostra na 1ª carta com `Novo`. Antes da r5, nenhum sorteio o oferece. Sem a F34 no código, `rodada5` aparece em `meta.dormant`.

---

### P1: Save da meta com migração ⭐ MVP

**User Story**: Como jogador, quero que o que liberei continue liberado depois de fechar o jogo, sem perder o recorde
que já tinha.

**Why P1**: Desbloqueio que some ao recarregar não é progressão entre runs.

**Acceptance Criteria**:

1. MSV-01: The current save version SHALL be 2, and the stored save SHALL be `{ version: 2, record, meta }` with `meta` holding `unlocks` (array of strings), `progress` (object of integers >= 0 by achievement id) and `grimoire` (array of strings).
2. MSV-02: WHEN a version 1 save is loaded THEN the migration step from 1 to 2 SHALL keep the `record` unchanged and SHALL add an empty `meta` (`unlocks: []`, `progress: {}`, `grimoire: []`).
3. MSV-03: WHEN a version 1 save with a record is loaded and the next write happens THEN the stored save SHALL have `version: 2` and the same record.
4. MSV-04: IF `meta` is missing in a version 2 save, or `unlocks` or `grimoire` is not an array of strings, or a `progress` value is not an integer >= 0 THEN the loader SHALL treat the whole save as invalid (SAVE-05).
5. MSV-05: The loader SHALL keep unlock, progress and Grimório ids that the registry or the recipes do not know, and the game SHALL ignore them.
6. MSV-06: WHEN an achievement unlocks or the Grimório gains a recipe during an update THEN the system SHALL write the save once in that update, with the stored record, the current unlocks, the current progress and the current Grimório.
7. MSV-07: WHEN the run enters `gameOver` THEN the system SHALL write the save once IF the record changed or the progress changed since the last write, and SHALL not write otherwise.
8. MSV-08: IF the run is equal to or worse than the record THEN the written save SHALL keep the old record (REC-03 kept for the record field).
9. MSV-09: IF the scene restarts with R or the page closes THEN the system SHALL not write, and progress gained since the last write SHALL be lost.
10. MSV-10: IF the stored save is newer than the game, the storage is `off` (`nosave=1`), or `record=`, `unlock=` or `grimoire=` is present THEN the system SHALL not write during that session and SHALL keep unlocks, progress and Grimório in memory, still applying them to the draws.
11. MSV-11: IF writing `localStorage` throws THEN the meta SHALL stay in memory and the snapshot SHALL report `storage: 'memory'` (SAVE-07 kept).
12. MSV-12: WHEN the page is reloaded after an unlock was written THEN the game SHALL load that unlock and keep its content available.

**Independent Test**: teste de unidade do `core/save`: um save v1 com recorde r7 sobe para v2 com r7 e meta vazia; um
v2 com `progress.kokusenRodada = -1` é inválido; ids desconhecidos voltam iguais no `serializeSave`. No jogo:
`?debug&hd=1&area=modular&unlock=none` não escreve; sem parâmetro de debug, cumprir `rodada5` e recarregar mantém o
desbloqueio.

---

### P2: Grimório persistente e dica na loja

**User Story**: Como jogador, quero que a loja me lembre das receitas que já vi, para caçar a fusão de propósito em
vez de depender de lembrar.

**Why P2**: Hoje só existe a receita do Roxo; a dica cresce de valor com as receitas da F36 e da F37, mas a memória entre
runs precisa nascer junto com o save da meta.

**Acceptance Criteria**:

1. GRI-01: The Grimório SHALL be the stored list of recipe keys, with the key of a recipe being the id of the item it creates (today `Recipe.into`).
2. GRI-02: WHEN a recipe card is shown in an open shop (including after a reroll), or the boss chest offers it, or the fusion happens THEN the system SHALL add its key to the Grimório IF absent, SHALL push the debug event `grimoire:<key>` and SHALL queue the toast `Grimório: <recipe name>`.
3. GRI-03: IF the recipe key is already in the Grimório THEN the system SHALL not push the event, queue the toast nor write the save.
4. GRI-04: WHILE the shop is open and a recipe has at least half of its pieces in hand and is not ready (at least one piece missing or below the level the recipe needs) THEN the shop SHALL show one hint line, a piece in hand being an equipped technique, a taken talent or perk, or the weapon, at any level.
5. GRI-05: WHERE the recipe of the hint is in the Grimório the hint SHALL read `Grimório: <piece in hand> Nv <level> + <other piece> Nv <level> → <result>`, pieces in hand first and each group in recipe order, with technique short labels and the level each piece needs (today `EVOLUTION_LEVEL`, 3).
6. GRI-06: WHERE the recipe of the hint is not in the Grimório the hint SHALL read `Grimório: <pieces in hand> + ? → ?`, or `Grimório: <pieces in hand> → ?` when every piece is in hand.
7. GRI-07: WHEN more than one recipe qualifies THEN the hint SHALL use the first one in the recipe data order.
8. GRI-08: IF no recipe qualifies, the vow panel is open, or the shop is closed THEN the hint SHALL be hidden.
9. GRI-09: The hint SHALL not overlap the shop panel bounds, SHALL use only `PALETTE` colors and SHALL not add lines to `ShopPanel.ts`.
10. GRI-10: The debug snapshot SHALL report under `meta` the Grimório keys and the hint text (`null` when hidden).

**Independent Test**: `?debug&hd=1&area=modular&nosave=1&tech=vermelho` → abrir a loja → a dica lê
`Grimório: Vermelho + ? → ?`; com `grimoire=roxo` a mesma loja lê `Grimório: Vermelho Nv 3 + Azul Nv 3 → Vazio Roxo`;
com `tech=vermelho,azul` (as duas no Nv 1) lê `Grimório: Azul + Vermelho → ?`; com `tech=azul:3,vermelho:3` a carta
do Roxo aparece e a dica some.

---

### P2: "Falta pouco" e liberados no fim da run

**User Story**: Como jogador, quero ver ao morrer o que a run liberou e o que está perto de sair, para ter um motivo
concreto para a próxima tentativa.

**Why P2**: Fecha o loop do recomeço com um alvo além do recorde; depende das conquistas (P1).

**Acceptance Criteria**:

1. FAL-01: WHEN the run summary panel opens and at least one active counting achievement (scope `run`, `round` or `total`) is not unlocked THEN the panel SHALL show `Falta pouco para: <content name> (<kind label>) · <condition label> (<progress>/<target>)` for the nearest achievement.
2. FAL-02: The nearest achievement SHALL be the active, not unlocked counting achievement with the greatest ratio of stored progress (after this death) to target; WHEN two ratios tie THEN the first in registry order SHALL win; a milestone SHALL never be the nearest.
3. FAL-03: IF no active counting achievement is left locked THEN the panel SHALL not show the `Falta pouco para` line, and IF no active milestone is left locked THEN the panel SHALL not show the `Desafio` line.
4. FAL-04: WHEN the run unlocked content THEN the panel SHALL show `Liberado: <name> (<kind label>), <name> (<kind label>)` in the palette highlight color, in unlock order, wrapped like the other lists of the panel.
5. FAL-05: The meta lines SHALL form one block after the record line and before `J / Enter para tentar de novo`, opened with the half-line gap of END-16.
6. FAL-06: The panel SHALL fit inside the 960x540 UI space with the END-14 load plus 2 unlocked items, the `Falta pouco para` line and the `Desafio` line.
7. FAL-07: The debug snapshot SHALL report the nearest achievement id and the challenge achievement id (`null` when none), and the panel text lines SHALL include the meta lines.
8. FAL-08: WHEN the run summary panel opens and at least one active milestone is not unlocked THEN the panel SHALL show, right after the `Falta pouco para` line, `Desafio: <content name> (<kind label>) · <condition label>` for the locked active milestone at index `(round the run ended in - 1) mod <number of locked active milestones>` in registry order.

**Independent Test**: `?debug&hd=1&area=modular&nosave=1&unlock=none` → morrer na r2 → o painel lê
`Falta pouco para: Boogie Woogie (técnica) · começar a r5 numa run (2/5)` quando a F34 existir e, com a F35 e sem a
F40 (marcos ativos `semDano` e `finalizadorChefe`, índice (2 - 1) mod 2 = 1),
`Desafio: Proporção 7:3 (talento) · derrotar um chefe com o finalizador (J + K)`; sem conquista ativa as linhas não
aparecem. Teste de unidade da escolha do mais perto nos dois lados de cada empate e do marco do Desafio nas rodadas 1, 2
e 3.

---

## Edge Cases

- IF the starter pool is empty THEN the starter panel SHALL not open and the run SHALL start with empty slots (STA-02 cobre menos de 3; vazio não acontece com as 4 técnicas base, mas a regra não pode travar a run).
- IF two achievements are met in the same update THEN both SHALL unlock, the toasts SHALL queue in registry order and the save SHALL be written once (CNQ-02, CNQ-15, MSV-06).
- IF the player dies in the same update an achievement is met THEN the unlock SHALL count and SHALL appear in `Liberado:` of that run.
- IF the Restrição Celestial exists but the Amplificação does not THEN the unlock SHALL still be recorded and the vow panel SHALL follow the F40 offer rule (only offered once the Amplificação exists).
- WHEN the starter panel offers a technique whose shop card is gated by round (`techGate`) THEN the starter SHALL still offer it, because the gate rules the shop, not the starter.
- IF the save holds an unlock for an achievement whose content was removed THEN the game SHALL ignore it and keep it stored (MSV-05).
- WHEN `unlock=<id>` names an unknown id THEN that id SHALL be ignored and the rest SHALL apply.
- IF the R key restarts the scene while the starter panel is open THEN the scene SHALL restart as today and the next run SHALL draw again from `startRng`; a fresh technique that panel offered has already left the fresh list (STA-18 counts the offer, not the choice).
- WHEN two techniques unlock in the same run THEN the next starter panel SHALL show the first one as `Novo` and the second SHALL wait for the panel after (STA-18).
- WHEN the starter offers are `divergente`, `azul` and `vermelho` THEN Enter SHALL add 15 fragments (the `cost.base` of `divergente` today), never the price of the dearest card.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| STA-01 | P1: Técnica inicial | T9, T24 | In Tasks |
| STA-02 | P1: Técnica inicial | T9, T24 | In Tasks |
| STA-03 | P1: Técnica inicial | T10 | In Tasks |
| STA-04 | P1: Técnica inicial | T9, T24 | In Tasks |
| STA-05 | P1: Técnica inicial | T1, T17, T24 | In Tasks |
| STA-06 | P1: Técnica inicial | T3, T24 | In Tasks |
| STA-07 | P1: Técnica inicial | T1, T24 | In Tasks |
| STA-08 | P1: Técnica inicial | T9, T24 | In Tasks |
| STA-09 | P1: Técnica inicial | T24 | In Tasks |
| STA-10 | P1: Técnica inicial | T24 | In Tasks |
| STA-11 | P1: Técnica inicial | T24 | In Tasks |
| STA-12 | P1: Técnica inicial | T25 | In Tasks |
| STA-13 | P1: Técnica inicial | T24 | In Tasks |
| STA-14 | P1: Técnica inicial | T24, T30 | In Tasks |
| STA-15 | P1: Técnica inicial | T17 | In Tasks |
| STA-16 | P1: Técnica inicial | T25 | In Tasks |
| STA-17 | P1: Técnica inicial | T24 | In Tasks |
| STA-18 | P1: Técnica inicial | T9, T17, T24 | In Tasks |
| CNQ-01 | P1: Registro e conquistas | T6 | In Tasks |
| UNL-01 | P1: Registro e conquistas | T5 | In Tasks |
| UNL-02 | P1: Registro e conquistas | T5, T6 | In Tasks |
| UNL-03 | P1: Registro e conquistas | T5, T6, T29 | In Tasks |
| UNL-04 | P1: Registro e conquistas | T5, T19 | In Tasks |
| UNL-05 | P1: Registro e conquistas | T7, T20, T29 | In Tasks |
| UNL-06 | P1: Registro e conquistas | T7, T20 | In Tasks |
| UNL-07 | P1: Registro e conquistas | T7, T20 | In Tasks |
| UNL-08 | P1: Registro e conquistas | T20 | In Tasks |
| CNQ-02 | P1: Registro e conquistas | T5, T19 | In Tasks |
| CNQ-03 | P1: Registro e conquistas | T5 | In Tasks |
| CNQ-04 | P1: Registro e conquistas | T5 | In Tasks |
| CNQ-05 | P1: Registro e conquistas | T5, T19 | In Tasks |
| CNQ-06 | P1: Registro e conquistas | T5, T28 | In Tasks |
| CNQ-07 | P1: Registro e conquistas | T27 | In Tasks |
| CNQ-08 | P1: Registro e conquistas | T29 | In Tasks |
| CNQ-09 | P1: Registro e conquistas | T5, T27 | In Tasks |
| CNQ-10 | P1: Registro e conquistas | T8, T26 | In Tasks |
| CNQ-11 | P1: Registro e conquistas | T8, T19, T26 | In Tasks |
| CNQ-12 | P1: Registro e conquistas | T26 | In Tasks |
| CNQ-13 | P1: Registro e conquistas | T19 | In Tasks |
| CNQ-14 | P1: Registro e conquistas | T5, T19 | In Tasks |
| CNQ-15 | P1: Registro e conquistas | T15, T19 | In Tasks |
| CNQ-16 | P1: Registro e conquistas | T19, T30 | In Tasks |
| MSV-01 | P1: Save da meta | T4 | In Tasks |
| MSV-02 | P1: Save da meta | T4 | In Tasks |
| MSV-03 | P1: Save da meta | T14, T21 | In Tasks |
| MSV-04 | P1: Save da meta | T4, T13 | In Tasks |
| MSV-05 | P1: Save da meta | T4, T13 | In Tasks |
| MSV-06 | P1: Save da meta | T14, T21, T23 | In Tasks |
| MSV-07 | P1: Save da meta | T14, T18, T21 | In Tasks |
| MSV-08 | P1: Save da meta | T14, T18 | In Tasks |
| MSV-09 | P1: Save da meta | T18, T21 | In Tasks |
| MSV-10 | P1: Save da meta | T2, T13, T14 | In Tasks |
| MSV-11 | P1: Save da meta | T14, T21 | In Tasks |
| MSV-12 | P1: Save da meta | T21 | In Tasks |
| GRI-01 | P2: Grimório | T11 | In Tasks |
| GRI-02 | P2: Grimório | T23 | In Tasks |
| GRI-03 | P2: Grimório | T11, T23 | In Tasks |
| GRI-04 | P2: Grimório | T11, T23 | In Tasks |
| GRI-05 | P2: Grimório | T11, T23 | In Tasks |
| GRI-06 | P2: Grimório | T11, T23 | In Tasks |
| GRI-07 | P2: Grimório | T11, T23 | In Tasks |
| GRI-08 | P2: Grimório | T23 | In Tasks |
| GRI-09 | P2: Grimório | T16 | In Tasks |
| GRI-10 | P2: Grimório | T23 | In Tasks |
| FAL-01 | P2: Falta pouco | T12, T22 | In Tasks |
| FAL-02 | P2: Falta pouco | T5, T22 | In Tasks |
| FAL-03 | P2: Falta pouco | T12, T22 | In Tasks |
| FAL-04 | P2: Falta pouco | T12, T22 | In Tasks |
| FAL-05 | P2: Falta pouco | T12, T22 | In Tasks |
| FAL-06 | P2: Falta pouco | T12 | In Tasks |
| FAL-07 | P2: Falta pouco | T22 | In Tasks |
| FAL-08 | P2: Falta pouco | T5, T12, T22 | In Tasks |

**Coverage:** 72 total, 72 mapped to tasks (`tasks.md`), 0 unmapped.

---

## Pontos de mudança conferidos no código

| Ponto | Onde está hoje | Observação |
| --- | --- | --- |
| Formato e migração do save | `core/save.ts` (`SAVE_VERSION = 1`, `MIGRATIONS = {}`, `parseSave`, `serializeSave(record)`) | Sobe para a v2 com o passo `MIGRATIONS[1]`; `serializeSave` passa a receber a meta |
| Carga e escrita | `scenes/test/recordDirector.ts` (`mountUi` lê uma vez, `onDeath` escreve só se o livro pede); `scenes/test/recordLoad.ts`; `game/saveStorage.ts` | A meta lê junto com o recorde; a escrita deixa de ser só da morte (MSV-06) |
| Streams da run | `core/run.ts:296-306` (`resolveStart` cria os 10 streams com `seed ^ sal`) | `startRng` entra aqui; `run.ts` está na lista de exceções de complexidade: só o stream novo, sem estado novo |
| Início da run | `core/run.ts:312-313` (`startRun` e `roundStart` no mesmo update); `TestScene.ts:364-365` (J/Enter chamam `run.startPressed`); `TestScene.ts:416-420` (a loja congela, `run.update` roda) | O painel abre com a run já em `roundActive` na r1; o congelamento segue o caminho da loja |
| Reset da run e técnica de debug | `scenes/test/runDirector.ts` (`onStartRun`: `loadout.reset()`, `equipDebugTech()`) | A técnica inicial entra depois do reset, e `tech=` desliga o painel (STA-14) |
| Painel de votos como molde | `scenes/test/shopDirector.ts:132-155` (1..3 toma, Enter recusa); `game/VowPanel.ts` | Mesmas teclas no painel da técnica inicial |
| Pool da técnica inicial | `data/shop.ts` (`TECHNIQUE_SHOP_ENTRIES`, `techGate`); `data/techniques.ts` (`TechId`, `TECHNIQUES`, `short`) | O `roxo` entra na loja só como carta de evolução (`kind: 'evolution'`), nunca como `technique` |
| Receitas | `data/evolutions.ts` (`RECIPES`, só o Roxo, `into` + `from`); `core/shop.ts:27` (`evolutionEligible`) | A chave do Grimório é o `into`; a carta aparece quando a receita está pronta |
| Fim de run | `core/runSummary.ts` (`summaryLines`, blocos com `gap`); `game/RunSummaryPanel.ts` (caixa centrada, `PANEL_LINE_H` 16) | O bloco da meta entra antes da linha do recomeço (FAL-05) |
| Banner da rodada | `game/Hud.ts:150` (`h2 * 0.25`, y 135 no espaço 960x540) | O aviso de conquista fica em y 172, abaixo dele |
| Eventos já existentes | `finisher:boss`, `bossDefeatedFx`, `evolve:<id>`, `shopOpen:<n>` em `snapshot.debugEvents`; Kokusen em `techRunner.kokusenSnapshot` | `jackpot:hit` nasce na F31 (JAC-03) |
| Conteúdo das outras fases | `boogie`, `ressonancia`, `fala` (F34, JJK-01); `zonaNegra`, `horaExtra`, `proporcao` (F35, tabela de talentos); Restrição Celestial (F40, sem spec); 4º tambor (sem fase) | Decide quais conquistas acordam quando esta feature for implementada |

---

## Success Criteria

- [ ] Toda run sem debug começa no painel `Técnica inicial`, e duas runs com seeds diferentes mostram cartas diferentes na maioria das vezes.
- [ ] Cumprir uma conquista ativa mostra `Liberado: X`, e X aparece no sorteio seguinte da mesma run e depois de recarregar a página.
- [ ] Um save v1 do branch de hoje carrega com o recorde intacto e passa a gravar v2.
- [ ] O painel de fim mostra `Falta pouco para:` com a conquista de contagem mais perto e `Desafio:` com um marco trancado; cada linha some quando não resta conquista do seu tipo ativa e trancada, e todo marco ativo trancado aparece no `Desafio` em alguma das rodadas de morte 1 a n.
- [ ] Recusar a técnica inicial vale o preço da carta mais barata: nunca é opção morta e nunca rende mais que pegar.
- [ ] Com zero conquistas ativas (nenhum conteúdo das F31/F34/F35/F40 no código), o gate e os smokes de hoje passam sem mudança, e a técnica inicial sorteia entre as 4 técnicas base.
- [ ] `TestScene.ts`, `Hud.ts` e `ShopPanel.ts` não ganham linha efetiva; nenhum arquivo novo entra nas exceções do `.oxlintrc.json`.
- [ ] Gate verde; smokes `hud`, `drops`, `run-loop`, `shop`, `world-restart` e os novos (`hd=1&area=modular`) verdes.
