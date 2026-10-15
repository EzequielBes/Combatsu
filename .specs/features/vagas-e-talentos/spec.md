# Vagas e talentos - Specification

## Problem Statement

Depois da F34 o jogo tem 8 técnicas, eixos, ramos, Despertares e o Domínio, mas a build ainda cabe em duas caixas
fixas: 2 slots de técnica (`0 | 1` espalhado por 21 arquivos) e 6 passivas compradas uma vez só, sem nível e sem
limite. Toda run enche as mesmas caixas, a escolha "mais técnica ou mais corpo a corpo" não existe, a passiva comprada
não muda mais nada depois, e um erro de compra prende o jogador até a morte. A F35
(`docs/plano-builds-e-habilidades.md`, linha F35 da seção 6; seções 1.1, 1.2, 4 (aura de build) e 5.3, talentos da
leva 1) troca as caixas por um **pool de 7 vagas** dividido entre técnicas (no máximo 3, com o 3º slot nas teclas
`O`/`B`) e talentos (no máximo 6, Nv 1 a 3, cada nível com sinal visível e gatilho novo), mostra a build na loja
(`BuildBar`) com a bandeja do eixo-foco e o Abandonar, e junta os multiplicadores no agregador puro `buildEffects`,
com o piso de custo e a aura de build.

A F35 vem depois da F29 (`fundacao-de-poder`), da F30 (`vermelho-e-corpo`), da F31 (`expansao-de-dominio`), da F33
(`eixos-das-tecnicas`) e da F34 (`tecnicas-jjk-1`), e usa o que elas entregam sem mudar o contrato:
- F29: `core/statSheet.ts` e o `StatsDirector` (dono único dos multiplicadores), `Hit.band`, `DamageNumbers` (com o
  tipo `crit` amarelo), o `powerAuraDirector` (membro do `StatsDirector`), o `Player.strikeMods`, o tipo de snapshot
  em arquivo à parte e o POW-07 (Punho Pesado soma 2 pontos de força).
- F30: `core/axisBuild.ts` (`AxisBuild`, eixo-foco automático, `resetItem`), `Loadout.stats(id)`,
  `Loadout.refundCooldown(slot, fraction)`, `Loadout.lastSlot`, o piso de 60% do custo no `Loadout` (PRC-05), o
  `slotHeld`, a carta de 2 eixos (`core/shopDraw.ts`, `axisRng`, `W`/`S`), o item-foco automático, o preço do ponto,
  a trava por rodada e a inflação (`core/shopPricing.ts`), o `kokusenScale` e o `KOKUSEN` com o multiplicador 2,5 e o
  teto 3,4, a parede que atordoa (`ragdollStun` de 600 ms, VRM-16).
- F31: a barra de Domínio de 0 a 100 (`core/domain.ts`), embaixo da barra de energia, com as regras de carga.
- F33: as 5 técnicas no molde de eixos, o `ChoicePanel` completo com o `choiceDirector`, a maestria por `TechId` e o
  baú do chefe (`core/bossChest.ts`), que já aceita a opção "nível de talento" sem candidato.
- F34: o registro `TechId → TechModule`, o `techObjects` aberto, o `TechEmitter`, os ícones HD de técnica
  (`art/hd/techIcons`) e as 3 técnicas novas (Boogie Woogie, Ressonância, Fala), que só ocupam vaga como as outras.

Código conferido em 14/10 no worktree `docs/spec-vagas-e-talentos` (`f17a6a8`), que ainda não tem a F29 a F34:
- Slot como `0 | 1`: `core/cast.ts:18,40,74`, `core/loadout.ts:49,64,73,101,106,113` (tuplas `[x, x]` nas l.33-34),
  `core/mastery.ts:3`, `core/evolution.ts:19-20`, `core/bossReward.ts:5-6` (sai na F33), `game/TechCaster.ts:64,75`
  (`slot1Keys`/`slot2Keys`, `framePressed: [boolean, boolean]`), `game/TechRunner.ts:56`, `game/tech/shared.ts:22`,
  `game/tech/divergent.ts:41,92`, `game/EnergyHud.ts:44,149,177,181` (`SLOT_LABEL ['L', 'I']`), `game/FxLab.ts:156`,
  `game/debugApi.ts:329`, `scenes/test/runDirector.ts:166`, `scenes/test/shopDirector.ts:20,92`,
  `scenes/test/snapshot.ts:215`. Não são slot: `core/dodge.ts:8`, `game/player/defense.ts:154`,
  `game/player/animator.ts:56` e o `buySlot` de `game/input.ts:102` (índice de carta).
- `core/build.ts`: `Perks` é um `Set<PerkId>` (BLD-01, uma vez cada), `buildPoints` conta `PERK_POINTS` 2 por passiva,
  `strikeMultiplier` multiplica Punho Pesado, Contra Afiado e Passo Sombrio. `data/perks.ts`: 6 passivas,
  `PERK.cost` 18, `minRound` 2, `heavyMul` 1,25, `finisherHeal` 20, `parryEnergy` 12, `meleeEnergy` 2, `shadowMul`
  1,5, `counterMul` 1,4. `scenes/test/buildDirector.ts` liga cada passiva ao combate e lê `?debug&perks=a,b`.
- `core/arsenal.ts`: relíquia e arma vinculada com nível 1 a 3 (`ARSENAL_TUNING.maxLevel` 3), presas depois da 1ª
  compra (`arsenalEligible`), sem troca.
- `core/counter.ts` (`CounterWindow`, aberta por parry, Deflexão, esquiva perfeita e abaixar,
  `game/player/defense.ts:53-72`), `core/kokusen.ts` (janela sorteada `KOKUSEN.windowMs` 50 a 90 ms,
  `data/techniques.ts:129-134`), `game/enemy/EnemyHud.ts` (barra de vida do comum), `game/Hud.ts` (barra do chefe e
  barra de vida do player; está na exceção de `max-lines` e não cresce).
- Teclas livres no jogo, na loja e no debug: `O`, `B`, `T` (conferido em todo `addKey` de `src/`). A loja usa 1 a 4,
  `R`, `Enter`, `J`, `A`/`D` e, desde a F30, `W`/`S`.

## Goals

- [ ] O slot de técnica é um `SlotIndex` de 3 posições, e o 3º slot conjura com `O`/`B` como os outros dois.
- [ ] O pool de 7 vagas força a escolha: o feiticeiro fecha com 3 técnicas e 4 talentos, o lutador com 1 técnica e 6
      talentos, e cada habilidade nova custa +8 fragmentos por vaga já ocupada.
- [ ] Os 9 talentos da leva 1 sobem do Nv 1 ao Nv 3, todo nível muda algo que se vê, e o ícone na `TalentStrip`
      pisca quando o talento age.
- [ ] Na loja, a `BuildBar` mostra a build inteira; a bandeja (`T`) marca o eixo-foco e abandona um item devolvendo
      40% do que foi gasto nele.
- [ ] Todo multiplicador de talento passa pelo `core/buildEffects.ts`, o piso de 60% do custo mora nele, e a aura de
      build mostra em 5 estágios quanto da build está cheia.
- [ ] A `TestScene` não ganha nenhuma linha efetiva líquida na F35.

## Passos e commits

Na ordem do plano. Refatoração é passo próprio, com os smokes iguais; a mudança de comportamento vem no passo seguinte.
Cada passo de comportamento termina jogável.

| Passo | O que entra | `TestScene` (efetivas) |
| --- | --- | --- |
| 0. **Refatoração, com os smokes iguais** | `core/skillSlots.ts` com `SlotIndex = 0 \| 1` e `SLOT_COUNT = 2`; todo slot de técnica do código passa a usar o tipo e as tuplas viram listas de `SLOT_COUNT` | 0 |
| 1. **3º slot** | `SLOT_COUNT = 3`, teclas `O`/`B`, `EnergyHud` com 3 vagas (vazia tracejada), pontinhos de nível e o ícone do Corpo; `tech=` aceita 3 técnicas | 0 |
| 2a. **Refatoração, com os smokes iguais** | `Perks` vira `Map<PerkId, nível>`; nasce o `core/buildEffects.ts` com a parte das passivas que hoje está no `strikeMultiplier`, todas no Nv 1 com os números de hoje | 0 |
| 2b. **Pool de 7 vagas** | `core/skillSlots.ts` ganha o pool (7 vagas, 3 técnicas, 6 talentos), o acréscimo de +8 por vaga ocupada no preço da habilidade nova, a etiqueta da carta e a regra da categoria cheia | 0 |
| 2c. **Talentos da leva 1** | os 6 de hoje com nível e os números do plano, mais Proporção 7:3, Hora Extra e Zona Negra; carta de nível de talento; opção "nível de talento" no baú do chefe; `TalentStrip` com os ícones HD | 0 |
| 3. **`BuildBar` e bandeja** | `game/BuildBar.ts`, eixo-foco marcado pelo jogador, item-foco, Abandonar com `T` (devolve 40%), moldura por nível na carta | 0 |
| 4. **Piso e aura** | o piso de 60% sai do `Loadout` e vai para o `buildEffects`; aura de build em 5 estágios no `powerAuraDirector` | 0 |

## Out of Scope

| Feature | Reason |
| --- | --- |
| Talentos da leva 2 (Mão de Ferro, Osso Duro, Reversa Refinada, Domínio Simples, Seis Olhos) | F41 (`leva-2`); a F35 deixa a tabela de talentos aberta para eles |
| Arma imbuída, eixos da arma, arma no Nv 4 e evoluções de arma | F36. Na F35 a arma vinculada de hoje (Nv 1 a 3) só aparece na `BuildBar`, conta na aura e pode ser abandonada |
| Limite Rompido | Pede todas as vagas cheias e no teto, e a vaga da arma só chega ao teto (Nv 4) na F36; a linha da F35 no plano não o lista |
| Dedos de Sukuna e a chama vermelha e preta da aura com 3 ou mais Dedos | Relíquia da leva 2 (F41) |
| Marcas no rosto por nível de build | Pedem sobreposição quadro a quadro nos PNG do Yuta; feature de arte à parte (seção 4) |
| Duos (no máximo 4 por run) | F41 |
| Voto do Black Flash e evolução que somam janela do Kokusen | F40 e F37; a F35 já põe o teto conjunto de +30 ms no `buildEffects` |
| Selo de elite como fonte de ponto | F38 |
| 4ª técnica ou conjuração por acorde | Descartados no plano (seção 1.1): a `CastMachine` recusa a 2ª conjuração (CAST-08) e a mão direita não tem tecla vizinha livre |
| Troca de técnica de slot ou reordenação dos slots | O plano não pede; abandonar deixa o buraco no lugar (Assumptions) |
| Renomear `PerkId`, `Perks` e `data/perks.ts` para "talento" | Só a interface diz "Talento"; o nome no código não muda o jogo e tocaria arquivos sem ganho |
| Paleta própria por ramo e Despertar | Feature de arte à parte |
| Versão antiga (`?hd=0`) | Não recebe trabalho novo; os smokes antigos só não podem quebrar |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| 3 técnicas + Domínio, pool de 7 vagas, arma imbuída e escala do inimigo na F30 (decisões 1, 3, 5 e 6 da seção 7) | Valem; da F35 saem o 3º slot e o pool | Confirmadas pelo usuário | y |
| Demais decisões da seção 7 (eixo na carta, ícone HD, Kokusen escalado, limiares, bases novas) | Seguem a recomendação do plano, como nas specs da F30 e da F33 | O usuário mandou seguir a recomendação nas demais decisões | y |
| Nada automático | Todo efeito novo de talento sai de uma ação do jogador (golpe, defesa, Contra, Kokusen, finalizador, abate) e some sem ela; nenhum talento ataca sozinho | Pedido do usuário (topo do plano) | y |
| Prefixos dos requisitos | SIX (passo 0), TRS (3º slot), EHD (`EnergyHud`), POL (pool), TAL (talentos), TSP (`TalentStrip`), BBR (`BuildBar` e bandeja), ABD (Abandonar), BEF (`buildEffects`), AUR (aura de build), VGX (regras de casa) | O validador só aceita `CAT-NN`; nenhum desses prefixos existe nas specs | y |
| Onde mora o `SlotIndex` | `core/skillSlots.ts` (arquivo da lista da F35 no plano), com `SlotIndex`, `SLOT_COUNT` e `SLOT_INDICES`; o mesmo arquivo recebe as regras do pool no passo 2b | Um tipo, um lugar; o plano já nomeia o arquivo | n |
| Prioridade das teclas no mesmo quadro | Slot 0 vence o 1, que vence o 2 (a regra de hoje estendida) | O `TechCaster` dispara no `JustDown` e a `CastMachine` aceita uma conjuração | n |
| Rótulo do 3º slot no `EnergyHud` | `O` (o `SLOT_LABEL` vira `['L', 'I', 'O']`) | O HUD de hoje mostra a letra do esquema WASD | n |
| Vaga vazia | Os 3 slots de técnica sempre aparecem; o vazio mostra só a moldura tracejada e a letra, também quando o pool não deixa mais técnica entrar | Regra do plano ("vaga vazia aparece tracejada"); esconder confundiria a tecla com o lugar | n |
| Pontinhos de nível | 5 pontinhos sob cada técnica e sob o Corpo; pontinhos cheios = pontos de eixo postos (nível − 1) | Seção 1.2; o nível é `1 + pontos` | n |
| Ícone do Corpo e dos talentos | Desenhados em código em `src/game/art/hd/talentIcons.ts`, 16×16 texels em HD, só com cores da paleta, conferidos na prancha antes do commit; o arquivo nasce no passo 1 com o ícone do Corpo e recebe os 9 talentos no passo 2c | A F34 só desenha os ícones de técnica; o projeto pede arte HD em código e prancha (`CLAUDE.md`, "Arte") | n |
| Nome no código | `Perks`, `PerkId` e `data/perks.ts` ficam; a interface e os textos dizem "Talento" | Ver Out of Scope | n |
| Ocupação do pool | Vagas ocupadas = técnicas equipadas + talentos possuídos; o Corpo, a arma, a relíquia e o Domínio não ocupam | Seção 1.1 | y |
| União e pool | O Roxo ocupa 1 vaga; a União (2 técnicas → 1) libera a outra | "A União libera vaga" (decisão 1) | y |
| Etiqueta "OCUPA VAGA" | Mostra o pool: `OCUPA VAGA 5/7→6/7` (18 caracteres, cabe nos ~20 da carta); a contagem por categoria fica na `BuildBar` | O pool decide o acréscimo de +8; a carta de 150 px não cabe as duas contagens | n |
| Texto de nível nas cartas de melhoria | Toda carta de melhoria (técnica, Corpo, talento, relíquia, arma, Domínio) mostra `Nv a→b` no lugar do `Nv N/6` da F30 | Seção 1.2 ("Nv 3 → 4"), sem espaço em volta da seta para caber | n |
| Cor da moldura da carta | Pelo nível que a compra deixa: Nv 1 cinza; técnica e Corpo Nv 2 e 3 azul, Nv 4 roxo, Nv 5 e 6 dourado; talento, relíquia, arma e Domínio Nv 2 azul e Nv 3 roxo; carta que não sobe nível (atributo, cura, ferramenta) cinza | Seção 1.2 (cinza, azul, roxo e dourado no Despertar); o Despertar é o Nv 5 | n |
| Carta 1 com o pool | Sem técnica equipada, a carta 1 é técnica nova (a garantia de hoje); com técnica e com vaga, a carta 1 sai do sorteio ponderado de hoje (`buildWeight`) só entre os itens novos elegíveis (técnicas e talentos); sem item novo elegível, sai do sorteio de hoje | "Carta 1: item novo enquanto houver vaga" (seção 3.1) sem empurrar o lutador para técnica | n |
| Itens possuídos para a carta 0 | As técnicas equipadas, o Corpo e os talentos abaixo do Nv 3 (relíquia e arma continuam fora até a F36) | O talento com nível é item que sobe; a F30 deixou o conjunto aberto | n |
| Meta do eixo-foco com 5 itens (seção 2.1) | Medida com 3 técnicas, o Corpo e 1 talento: o eixo-foco da técnica de maior nível aparece em pelo menos 60% das lojas em 1000 seeds | A F33 deixou a meta para a F35; arma e relíquia como item ficam para a F36 | n |
| Rodada mínima e trava do talento | Talento novo a partir da loja da r2 (`PERK.minRound` de hoje); o Nv 2 e o Nv 3 não têm trava por rodada | O plano não dá trava de talento; o preço já sobe com a inflação | n |
| Afinidade dos talentos novos | Proporção 7:3 → `lutador`, Hora Extra → `veloz`, Zona Negra → `feiticeiro` (o Kokusen vem do Divergente) | O `buildWeight` precisa de uma linha para cada carta | n |
| Pontos de afinidade de talento com nível | `PERK_POINTS + (nível − 1)`: 2, 3 e 4 | Como a técnica, que conta os níveis acima do 1º | n |
| Pontos de força do Punho Pesado (POW-07) | +2 em qualquer nível | O nível já sobe o multiplicador do golpe forte; somar força por nível mexeria no patamar da F29 | n |
| Crítico | O dano do golpe crítico é o dano resolvido × o maior multiplicador de crítico entre as fontes que valem naquele acerto (não se multiplicam), arredondado; o número sai com o tipo `crit`. Técnica e Kokusen nunca são crítico (o Kokusen tem multiplicador e número próprios) | Duas fontes de crítico no mesmo golpe (Proporção e alvo "aberto") passariam de ×2,5; Kokusen ×3,1 com crítico ×2 daria ×6,2, acima do teto 3,4 do `KOKUSEN` | n |
| "Golpe" nos talentos | Golpe do moveset que acerta (não técnica, não objeto, não arma vinculada), salvo quando a linha diz outra coisa | Os talentos da leva 1 reagem ao golpe (seção 5.2) | n |
| Contra perfeito | O Contra que acerta e cujo aperto (`J`/`K`, ou o aperto guardado no `buffer`) chegou nos primeiros 150 ms da janela aberta | O jogo não tem Contra "perfeito"; o tempo da janela já está no `CounterWindow` e dá leitura de habilidade | n |
| Parry perfeito do Refluxo Nv 3 | Todo `parry` ou `deflect`, limitado a 1 vez a cada 8000 ms | O parry já é a defesa de tempo justo; o limite de 8 s do plano mostra que o gatilho é frequente | n |
| Recarga devolvida "da técnica do último slot" | Usa o `Loadout.lastSlot` da F30; sem último slot ou com o slot vazio, nada acontece e o limite de 8 s do Refluxo não é gasto | O plano manda pelo último slot usado | n |
| Alvo "aberto" do Contra Afiado Nv 2 | 1000 ms com contorno; todo golpe do player nele é crítico ×1,25; um alvo só por vez (o novo Contra perfeito troca o alvo) | Texto da seção 5.3 | n |
| Pós-imagem do Passo Sombrio Nv 2 | Fica 1500 ms no ponto da esquiva; o próximo golpe do inimigo cuja investida foi esquivada, começado nesses 1500 ms, não causa dano ao player e consome a pós-imagem; vale para comum e chefe | "O inimigo erra o próximo golpe nela"; o limite de tempo evita o efeito parado para sempre | n |
| Golpe sombrio que atravessa guarda (Nv 3) | O golpe sombrio ignora a guarda do comum (`EnemyGuard`) e o bloqueio do chefe | Texto da seção 5.3 | n |
| Parede do Punho Pesado Nv 3 | O golpe forte com `knockdown` ganha a regra da parede que atordoa da F30 (600 ms contados do toque) | A F30 já tem a regra para o Peso 3 e o Vermelho Máximo | n |
| Arco do Condutor Nv 3 | Com a energia cheia antes do ganho do golpe, um acerto `micro` de `round(6 × hpMul)` no comum vivo mais perto do alvo, a até 160 px dele, nunca o próprio alvo; no máximo 2 a cada 1000 ms | "Escala da rodada" = `hpMul` (F30); 160 px fica dentro da tela | n |
| Linha 7:3 | Linha amarela na barra de vida do comum (`EnemyHud`) e na do chefe, a 30% da largura; "abaixo da linha" = HP atual ≤ 30% do máximo antes do acerto | Seção 5.3 | n |
| Marca da Proporção Nv 3 | O abate por crítico marca o comum vivo mais perto a até 200 px do morto; a marca dura 5000 ms ou até o próximo golpe nele, que é crítico ×2 | O plano não dá alcance nem duração | n |
| Hora Extra | Contador de abates (comum e chefe) desde o último acúmulo ou dano; ao chegar ao limiar do nível (15, 12, 10) ganha 1 acúmulo de +5% e zera; teto de 3, 5 e 7 acúmulos (+15, +25, +35%); perder HP deixa `floor(acúmulos / 2)` e zera o contador, com o critério da Fúria da F30: golpe defendido (o chip da guarda incluído) e custo de voto não contam; o bônus vale para golpe e técnica; o estado dura a run inteira | Seção 5.3 ("a cada 15 abates... até +15%"); o passo de 5% é o do Nv 1; cortar o bônus no bloqueio puniria a defesa certa sem o jogador ver por quê | n |
| Zona Negra Nv 3 sem gatilho novo no plano | Além de +30 ms e ×3,1, o Kokusen solta um anel `micro` de 48 px em volta do alvo com 30% do dano do Kokusen nos outros comuns | A regra da seção 5.3 pede gatilho novo em todo nível; 48 px é o raio do Martelo Negro da F30 | n |
| Barra de Domínio do Executor Nv 3 | +20 de carga pelas regras da F31 (sem Domínio ou com Domínio ativo, não carrega) | "Enche 20% da barra de Domínio" | n |
| Número de cura | O `DamageNumbers` ganha o tipo `heal`, verde, sobre o player; é o número da cura do Executor Nv 2 e Nv 3 | Seção 5.3 ("número verde") | n |
| Brilho na barra de vida e linha na barra do chefe | Desenhados por objeto próprio sobre a posição exportada pelo `Hud`, sem crescer o `Hud.ts` | O `Hud.ts` está na exceção de `max-lines` e não cresce (seção 6) | n |
| Aviso do gatilho | Só o momento da tabela "Quando pisca" solta o evento de debug `talent:<id>` e pisca o ícone por 250 ms (gatilho repetido reinicia os 250 ms); o Condutor pisca a cada 3º golpe que acerta, não em todo golpe, e a Hora Extra só quando ganha ou perde acúmulo | Seção 1.2 ("piscam quando o gatilho dispara"); um ícone que pisca a cada golpe do combo fica aceso o tempo todo e não diz quem agiu | n |
| Zona Negra sem Divergente | Só o Divergente tem Kokusen (as técnicas da F34 não têm); sem ele equipado a loja não oferece Zona Negra nova nem o nível dela, e o baú não a sorteia; a Zona Negra que fica sem o Divergente (abandonado ou trocado pela União) mantém o nível e aparece a 40% de alfa na `TalentStrip` | Uma carta que não faz nada ocuparia uma vaga do pool às cegas; o lutador sem Divergente nunca a vê | n |
| Sinal do Nv 3 que o plano não desenha | Contra Afiado Nv 3: o arco azul do alvo à barra (o do Refluxo Nv 2) e o ícone do último slot pisca em branco 250 ms; Refluxo Nv 3: o ícone do último slot pisca em branco 250 ms quando a recarga zera; Passo Sombrio Nv 3: estilhaço roxo no ponto do golpe sombrio que passou por guarda ou bloqueio; Condutor Nv 3: raio azul em zigue-zague de 120 ms do alvo ao vizinho; Proporção Nv 3: o sinal "7:3" amarelo sobre a cabeça do marcado enquanto a marca dura; Zona Negra Nv 3: anel preto de 48 px por 200 ms | A regra da seção 5.3 ("um sinal visível e um gatilho novo") e o Goal "todo nível muda algo que se vê"; energia e recarga que mudam sem desenho não se notam no meio da luta | n |
| Bandeja: itens e ordem | Slots 0, 1 e 2 (os ocupados), Corpo, talentos na ordem de compra, arma, relíquia, Domínio; só aparece o que o jogador tem | A mesma ordem da `BuildBar` | n |
| Eixo-foco marcado | `W`/`S` no item selecionado percorre `automático → eixos abaixo do teto na ordem da tabela → automático`; marcar um eixo torna aquele item o item-foco (só um por vez); com todos em automático vale a regra automática da F30 | A seção 2.1 diz que o jogador marca o foco na bandeja; um item-foco só simplifica a carta 0 | n |
| Eixo marcado que chega ao teto | Volta a automático no item, e o item continua sendo o item-foco | O eixo-foco só vale abaixo do teto (seção 2.1) | n |
| O que se abandona | Técnica, talento, relíquia e arma; o Corpo (inato) e o Domínio (ultimate de baú, 1 vaga, fora do pool) não | O Abandonar é para trocar de rumo no pool e nas vagas presas; o Domínio abandonado não volta pela loja antes da r8 | n |
| Quanto devolve | `floor(0,4 × gasto)`, com gasto = soma do que o jogador pagou de fato (com inflação) pela compra do item e pelos níveis ou pontos dele nesta posse; fonte grátis (técnica inicial, debug, baú, maestria, painel) vale 0 | Seção 1.2 ("devolve 40% do que foi gasto no item") | n |
| Gasto do Roxo | Começa no preço pago pela União (60, ou 0 pelo baú) e soma os pontos do Roxo; não herda o gasto do Azul nem do Vermelho | A União já consome as duas peças | n |
| Slot que fica vazio | Abandonar a técnica do slot 0 ou 1 deixa o buraco; as outras não mudam de tecla, e a próxima técnica entra no 1º slot vazio | Mudar a tecla de uma técnica sob o dedo do jogador é pior que o buraco | n |
| Cartas abertas depois de abandonar | As mesmas cartas ficam; o preço e a etiqueta das cartas de item novo se refazem com a ocupação nova; a carta que deixou de ser elegível continua à vista com a moldura cinza e a linha do nível trocada por `SEM VAGA` (item novo sem lugar) ou `FORA DA BUILD` (melhoria do item abandonado), e é recusada na compra sem gastar | Não sortear de novo evita reroll grátis; refazer o preço mantém a carta honesta; a carta morta precisa parecer morta antes do aperto | n |
| Pergunta do Abandonar | `Abandonar <nome> Nv<nível>? +<devolução> fragmentos` (o nível mostra o que se perde; `+0` aparece na técnica inicial); o 2º `Enter` só vale 300 ms depois de a pergunta abrir; com a pergunta aberta a dica vira `Enter confirmar · A/D/W/S/T cancelar` | Na loja o `Enter` é "continuar": quem aperta duas vezes por hábito com a bandeja aberta abandonaria sem ler | n |
| Item abandonado comprado de novo | Volta no Nv 1, sem pontos, ramo nem Despertar, e o livro de gastos começa do preço da compra nova | O abandono limpa o item (ABD-03, ABD-04) | n |
| Denominador da aura | Níveis de vaga = soma dos níveis das técnicas equipadas (1 a 6), dos níveis de talento (1 a 3), dos pontos do Corpo (0 a 5), dos níveis da arma, da relíquia e do Domínio; fração = níveis ÷ 45, com teto 1 | 45 é a build cheia do feiticeiro (seção 3.3); o lutador cheio dá 39/45 (87%) e também chega ao estágio 4 | n |
| Forma da aura | Estágio 0 sem aura; 1 fiapos azuis nos pés até 8 px de altura; 2 até 20 px; 3 até 36 px; 4 chama no corpo inteiro (até 60 px), sempre em cores da paleta, junto com o tom da força da F29 | Seção 4 ("de fiapos azuis nos pés a chama inteira"); o player HD tem ~60 px | n |
| Parâmetros de debug | `perks=<id>[:<nível>][,...]` (nível 1 a 3, padrão 1; fora disso vira 1); `tech=` aceita até 3 técnicas; `focus=<item>.<eixo>` marca o eixo-foco; entradas que passariam do pool ou da categoria são ignoradas na ordem; lidos no reset da run | Os smokes montam a build sem comprar | n |
| Smokes novos | `third-slot.smoke.mjs`, `talents.smoke.mjs` e `build-bar.smoke.mjs`, todos com `?debug&hd=1&area=modular` | Regra de smoke novo do projeto | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: O slot de técnica vira um tipo só ⭐ MVP

**User Story**: Como desenvolvedor da F35, quero o slot de técnica num tipo `SlotIndex` com o número de slots num lugar
só, para o 3º slot entrar mudando uma constante e não 21 arquivos.

**Why P1**: Sem isto o 3º slot é uma caça a `0 | 1` em tupla, e um esquecido quebra em silêncio.

**Acceptance Criteria**:

1. SIX-01: WHEN step 0 is committed THEN `src/core/skillSlots.ts` SHALL export `SlotIndex` (`0 | 1`), `SLOT_COUNT` (2) and `SLOT_INDICES`, and every technique slot in `src/` (cast, loadout, mastery, evolution, `TechCaster`, `TechRunner`, the adapters of `game/tech/`, `EnergyHud`, `FxLab`, `debugApi`, `runDirector`, `shopDirector`, `snapshot`) SHALL use `SlotIndex`, with every per-slot tuple built from `SLOT_COUNT`.
2. SIX-01: The code SHALL keep no literal `0 | 1` type for a technique slot, and `core/dodge.ts`, `game/player/defense.ts`, `game/player/animator.ts` and the shop card index SHALL keep their own types.
3. SIX-02: WHEN step 0 is committed THEN every existing test SHALL pass with only types and imports changed, and the smokes `tech`, `techniques`, `kokusen`, `evolution`, `fxlab`, `shop` and `hud` SHALL pass unchanged.
4. VGX-01: The F35 tasks SHALL add no net effective line to `src/scenes/TestScene.ts`, which SHALL end the feature with the effective line count it had at the end of the F34 or fewer.
5. VGX-02: The F35 SHALL put no file in the exception lists of `.oxlintrc.json`, SHALL not grow `src/game/ShopPanel.ts`, `src/game/Hud.ts` nor `src/data/moves.ts` in effective lines, SHALL add no field to `src/game/Player.ts`, and every new file SHALL stay within 400 effective lines, 80 lines per function and complexity 15.
6. VGX-03: Every new snapshot field of the F35 SHALL be typed in a file apart from `src/game/debugApi.ts`.

**Independent Test**: `npm run gate`; `grep` sem `0 | 1` de slot em `src/`; os smokes listados passam sem mudança.

---

### P1: Três técnicas na mão ⭐ MVP

**User Story**: Como feiticeiro, quero um 3º slot de técnica na tecla `O` (ou `B` nas setas), para montar uma build de
3 técnicas sem acorde e sem tirar a mão do lugar.

**Why P1**: É o limite de vagas de técnica do plano (decisão 1) e a base do arquétipo feiticeiro.

**Acceptance Criteria**:

1. TRS-01: WHEN step 1 is committed THEN `SLOT_COUNT` SHALL be 3, the `Loadout` SHALL hold 3 slots, and `firstEmpty` SHALL return 0, then 1, then 2, then `null` as the slots fill.
2. TRS-02: WHEN `O` or `B` is pressed with a technique in slot 2 and no other slot key is pressed in the same frame THEN the `TechCaster` SHALL request the cast of slot 2 through the same `CastMachine` path as slots 0 and 1.
3. TRS-02: WHEN keys of two or more slots are pressed in the same frame THEN only the lowest slot index among them SHALL be requested.
4. TRS-03: The `slotPressed` and `slotHeld` views SHALL have 3 entries, and WHILE the Divergente is in slot 2 a press of `O` or `B` inside the Kokusen window SHALL land the Kokusen as a press of the slot 0 or 1 key does.
5. TRS-04: The debug parameter `tech=` SHALL equip up to 3 techniques in the listed order, and IF a 4th id is listed THEN it SHALL be ignored.
6. TRS-05: The debug snapshot SHALL report `tech.slots` with 3 entries (`null` for an empty slot) and `tech.cast.slot` from 0 to 2.
7. TRS-06: WHEN a new technique is bought with slots 0 and 1 taken and slot 2 empty THEN it SHALL go to slot 2, and the card icon SHALL fly to `EnergyHud.slotIconPosition(2)`.
8. TRS-07: WHEN the União happens with three techniques equipped THEN the Roxo SHALL take the slot of `from[0]`, the slot of the other component SHALL become empty, and the third technique SHALL keep its slot, points, branch and cooldown.
9. TRS-08: The mastery points and milestones of the F33 SHALL count for a technique in slot 2 exactly as in slots 0 and 1.
10. EHD-01: The `EnergyHud` SHALL show the 3 technique vacancies in slot order, labelled `L`, `I` and `O`.
11. EHD-02: WHILE a slot is empty its vacancy SHALL show a dashed frame and its letter, with no icon, cooldown overlay or mastery bar.
12. EHD-03: Under each occupied vacancy and under the Corpo icon the `EnergyHud` SHALL show 5 dots with the first `points` filled, `points` being the axis points of that item (level − 1).
13. EHD-04: The `EnergyHud` SHALL show the Corpo icon after the third vacancy, with the gold border WHILE the Corpo Despertar is on.
14. EHD-05: The 3 vacancies, the Corpo icon, the energy bar and the domain bar of the F31 SHALL not overlap, as read from the bounds reported in the snapshot `hud.slots` (`{x, y, w, h, empty, dots}` per vacancy) and `hud.body`.

**Independent Test**: `third-slot.smoke.mjs` com `?debug&hd=1&area=modular&tech=vermelho,azul,divergente`: `O` conjura
o Divergente, `B` também, `L+O` no mesmo quadro conjura só o Vermelho, o Kokusen sai pelo `O`; com `tech=vermelho`, as
vagas 1 e 2 aparecem tracejadas.

---

### P1: Sete vagas para escolher o caminho ⭐ MVP

**User Story**: Como jogador, quero um pool de 7 vagas dividido entre técnicas e talentos, com a habilidade nova
ficando mais cara a cada vaga ocupada, para decidir desde a r2 se vou de feiticeiro, de lutador ou no meio.

**Why P1**: É a decisão 6 do plano e o que tira a build das caixas fixas.

**Acceptance Criteria**:

1. POL-01: The pool SHALL have 7 vacancies, taken by the equipped techniques plus the owned talents, with at most 3 techniques and at most 6 talents, and the Corpo, the weapon, the relic and the Domain SHALL take no vacancy.
2. POL-02: The price of a new technique SHALL be `round((base + 8 × occupied) × inflation)`, with `base` 20 for a common and 26 for a rare one, and the price of a new talent SHALL be `round((18 + 8 × occupied) × inflation)`, with `occupied` the vacancies taken before the purchase and `inflation` the F30 factor of the shop round.
3. POL-02: WHEN only the starting technique is owned THEN a new talent in the round 2 shop SHALL cost 28 (`round(26 × 1.06)`), and WHEN 6 vacancies are taken THEN the surcharge before inflation SHALL be 48.
4. POL-03: Axis points, talent levels, the weapon, the relic, the Domain, the attributes, the cure and the reroll SHALL pay no pool surcharge.
5. POL-04: WHILE the pool is full no new technique and no new talent card SHALL be offered; WHILE 3 techniques are equipped no new technique card SHALL be offered; WHILE 6 talents are owned no new talent card SHALL be offered; upgrade cards SHALL still be offered in all three states.
6. POL-05: IF the purchase of a new technique or talent would pass the pool or its category cap THEN the shop SHALL refuse it, spend no fragment and emit `buyDenied:pool`.
7. POL-06: WHILE no technique is equipped and an eligible technique exists card 1 SHALL be a new technique; WHILE a technique is equipped and a new item is eligible card 1 SHALL be drawn by today's weighted draw (`buildWeight`) among the eligible new techniques and talents only; otherwise card 1 SHALL come from today's weighted draw.
8. POL-07: The card of a new technique or talent SHALL carry the line `OCUPA VAGA a/7→b/7`, with `a` the vacancies taken and `b = a + 1`.
9. POL-08: WHEN the União replaces two techniques by the Roxo THEN the vacancies taken SHALL drop by 1.
10. POL-09: The debug snapshot SHALL report `build.pool: {used, total, techniques, talents}` with `total` 7.
11. POL-10: The debug parameter `perks=<id>[:<level>][,...]` SHALL start the run with those talents at those levels (level 1 to 3, default 1, anything else 1), and IF an entry would pass the pool or the talent cap after the `tech=` techniques THEN that entry and the ones after it SHALL be ignored.

**Independent Test**: teste puro do pool e do preço (técnica rara na r1 com a técnica inicial = 34; talento na r2 =
28; 7ª habilidade com +48; carta de técnica nova some com 3 técnicas; compra recusada sem gasto); `shop.smoke` com
`perks=` de 6 talentos não vê carta de talento novo.

---

### P1: Talentos que mudam a cada nível ⭐ MVP

**User Story**: Como jogador, quero que cada talento suba do Nv 1 ao Nv 3 e que todo nível traga algo que eu vejo e um
gatilho novo, para o talento comprado continuar mudando a luta e não ser só um número.

**Why P1**: Metade do pool são talentos; sem nível e sem sinal, o lutador não tem o que comprar.

Tabela dos talentos da leva 1 (números do plano, seção 5.3; o texto do nível é o da carta):

| Talento (`PerkId`) | Nv 1 | Nv 2 (sinal novo) | Nv 3 (gatilho novo) |
| --- | --- | --- | --- |
| Punho Pesado (`punhoPesado`) | golpe forte ×1,15 | ×1,30; poeira e anel no chão no golpe forte que acerta | ×1,45; a derrubada do golpe forte atordoa na parede (600 ms) |
| Contra Afiado (`contraAfiado`) | Contra ×1,3 | ×1,5; o Contra perfeito deixa o alvo "aberto" 1000 ms (crítico ×1,25) | ×1,7; o Contra perfeito dá +15 de energia (arco azul até a barra) e 30% da recarga do último slot (o ícone pisca) |
| Passo Sombrio (`passoSombrio`) | golpe depois da esquiva perfeita ×1,3 | ×1,5; pós-imagem que faz o inimigo errar o próximo golpe | ×1,8; o golpe sombrio atravessa a guarda, com estilhaço roxo |
| Executor (`executor`) | finalizador cura 12 | cura 20, número verde e brilho na barra de vida | cura 30 e +20 de carga de Domínio |
| Refluxo (`refluxo`) | parry +8 de energia | +12 e arco azul do alvo até a barra | +18 e o parry zera a recarga do último slot, cujo ícone pisca (1 vez a cada 8000 ms) |
| Condutor (`condutor`) | +1 de energia por golpe | +2 e faíscas azuis do alvo à barra a cada 3º golpe | +3; com a energia cheia, raio azul `micro` de `round(6 × hpMul)` até o comum mais perto (até 2 por segundo) |
| Proporção 7:3 (`proporcao`) | linha a 30% da barra; golpe abaixo dela é crítico ×1,5 | ×1,75 e o risco 7:3 no alvo | ×2; o abate por crítico marca o comum mais perto com "7:3" na cabeça (próximo golpe nele é crítico) |
| Hora Extra (`horaExtra`) | a cada 15 abates sem perder HP, +5% de dano, até +15% | a cada 12, até +25%, com o relógio em gomos | a cada 10, até +35%, com aura laranja no teto |
| Zona Negra (`zonaNegra`) | janela do Kokusen +10 ms | +20 ms, Kokusen ×2,8 e o punho acende de preto na janela | +30 ms, Kokusen ×3,1 e anel preto `micro` de 48 px com 30% do Kokusen (só com o Divergente na mão) |

Quando pisca (TAL-17): só estes momentos soltam `talent:<id>` e piscam o ícone.

| Talento | Pisca quando |
| --- | --- |
| Punho Pesado | o golpe forte acerta |
| Contra Afiado | o Contra acerta |
| Passo Sombrio | o golpe sombrio abre a hitbox; no Nv 2 também quando a pós-imagem faz o inimigo errar |
| Executor | a cura acontece |
| Refluxo | o parry ou a Deflexão dá a energia |
| Condutor | todo 3º golpe que acerta na rodada; no Nv 3 também quando o raio salta |
| Proporção 7:3 | o crítico dela acerta; no Nv 3 também quando a marca é posta |
| Hora Extra | ganha ou perde acúmulo |
| Zona Negra | o Kokusen acerta |

**Acceptance Criteria**:

1. TAL-01: WHEN step 2a is committed THEN `Perks` SHALL keep a level from 1 to 3 per talent in acquisition order, with `levelOf(id)` (0 if not owned), `add(id)` (level 1, `false` if already owned), `levelUp(id)` (`false` at level 3 or if not owned), `list` as `{id, level}[]` in acquisition order, and `has(id)` true for any level.
2. TAL-02: WHEN step 2a is committed THEN, with every owned talent at level 1, the strike multipliers, energy gains and heals SHALL equal today's numbers, and the smokes `build`, `shop`, `power`, `vows` and `arsenal` SHALL pass unchanged.
3. TAL-03: WHEN step 2c is committed THEN `src/data/perks.ts` SHALL hold the 9 talents of the table above, each with its build affinity, one value per level and one card text per level, and the shop SHALL offer the 3 new talents from the round 2 shop like the other 6.
4. TAL-04: WHILE a talent is owned below level 3 the shop SHALL be able to offer its level card at `round(16 × inflation)` (to level 2) or `round(24 × inflation)` (to level 3), and buying it SHALL raise that talent by one level.
5. TAL-05: The talent level card preview SHALL show one line with the number change (`Forte +15%→+30%` style) and one line naming the new sign or trigger of the next level, each at most 20 characters.
6. TAL-06: WHILE a talent is owned below level 3 the option "nível de talento" SHALL be a candidate of the F33 boss chest, naming one talent drawn by `chestRng` among those below level 3 that the shop could offer a level card of (TAL-19), and choosing it SHALL raise that talent by one level with no fragment spent.
7. TAL-07: WHEN a heavy strike hits THEN its damage SHALL be multiplied by 1.15, 1.30 or 1.45 for Punho Pesado at level 1, 2 or 3.
8. TAL-07: WHILE Punho Pesado is at level 2 or more, WHEN a heavy strike hits THEN a dust puff and a ground ring SHALL appear at the hit point.
9. TAL-07: WHILE Punho Pesado is at level 3, WHEN a heavy strike knocks a common enemy down THEN that enemy SHALL follow the F30 wall rule (600 ms on the ground from the wall touch).
10. TAL-08: WHEN a Contra hits THEN its damage SHALL be multiplied by 1.3, 1.5 or 1.7 for Contra Afiado at level 1, 2 or 3.
11. TAL-08: WHILE Contra Afiado is at level 2 or more, WHEN a perfect Contra hits THEN its target SHALL show the "aberto" outline for 1000 ms and every player strike on it in that time SHALL be a critical hit ×1.25.
12. TAL-08: WHILE Contra Afiado is at level 3, WHEN a perfect Contra hits THEN the player SHALL gain 15 energy, shown by the blue arc of TAL-11 from the target to the energy bar, and the slot `loadout.lastSlot` SHALL have 30% of its full resolved cooldown refunded, with its `EnergyHud` icon flashing white for 250 ms.
13. TAL-09: WHEN the first strike after a perfect dodge opens its hitbox THEN its damage SHALL be multiplied by 1.3, 1.5 or 1.8 for Passo Sombrio at level 1, 2 or 3, and the shadow step SHALL be spent whether it hits or not, as today.
14. TAL-09: WHILE Passo Sombrio is at level 2 or more, WHEN a perfect dodge happens THEN an afterimage SHALL stay 1500 ms at the dodge point, and the next attack of the dodged enemy started in that time SHALL deal no damage to the player and remove the afterimage.
15. TAL-09: WHILE Passo Sombrio is at level 3 the shadow strike SHALL ignore the guard of a common enemy and the block of the boss, and WHEN it hits a guarding common or a blocking boss THEN a purple shatter burst SHALL appear at the hit point.
16. TAL-10: WHEN a finisher hits THEN Executor SHALL heal 12, 20 or 30 at level 1, 2 or 3.
17. TAL-10: WHILE Executor is at level 2 or more, WHEN it heals THEN a green `heal` number with the healed value SHALL appear over the player and the player HP bar SHALL glow for 400 ms.
18. TAL-10: WHILE Executor is at level 3, WHEN a finisher hits THEN the domain charge SHALL grow by 20 under the F31 charge rules.
19. TAL-11: WHEN a `parry` or `deflect` happens THEN Refluxo SHALL give 8, 12 or 18 energy at level 1, 2 or 3.
20. TAL-11: WHILE Refluxo is at level 2 or more, WHEN it gives energy THEN a blue arc SHALL travel in 300 ms from the parried enemy to the energy bar.
21. TAL-11: WHILE Refluxo is at level 3, WHEN a `parry` or `deflect` happens and 8000 ms passed since the last time this rule fired THEN the cooldown of `loadout.lastSlot` SHALL become 0 with its `EnergyHud` icon flashing white for 250 ms, and IF there is no last slot or it is empty THEN nothing SHALL change and the 8000 ms SHALL not restart.
22. TAL-12: WHEN a strike hits THEN Condutor SHALL give 1, 2 or 3 energy at level 1, 2 or 3, on top of `CE.meleeGain`.
23. TAL-12: WHILE Condutor is at level 2 or more, WHEN every 3rd strike hit of the round lands THEN blue sparks SHALL travel from the target to the energy bar.
24. TAL-12: WHILE Condutor is at level 3, WHEN a strike hits with the energy full before its gain THEN a `micro` hit of `round(6 × hpMul)` SHALL jump to the nearest living common enemy within 160 px of the target other than the target, drawn as a blue zigzag line from the target to it for 120 ms, at most 2 times per 1000 ms.
25. TAL-13: WHILE Proporção 7:3 is owned the HP bar of every common enemy and of the boss SHALL show a yellow line at 30% of its width, and a strike on a target whose HP before the hit is at most 30% of its max SHALL be a critical hit ×1.5, ×1.75 or ×2 at level 1, 2 or 3.
26. TAL-13: WHILE Proporção 7:3 is at level 2 or more, WHEN its critical hit lands THEN a 7:3 slash mark SHALL be drawn on the target for 300 ms.
27. TAL-13: WHILE Proporção 7:3 is at level 3, WHEN a critical hit kills THEN the nearest living common enemy within 200 px of the dead one SHALL be marked for 5000 ms with a yellow "7:3" sign over its head, and the next player strike on it SHALL be a critical hit ×2 and remove the mark and the sign.
28. TAL-14: WHILE Hora Extra is owned each kill SHALL add 1 to its counter, and WHEN the counter reaches 15, 12 or 10 at level 1, 2 or 3 THEN it SHALL add one stack of +5% damage up to 3, 5 or 7 stacks and reset the counter to 0.
29. TAL-14: WHEN the player loses HP to a hit that was not defended (guard chip and vow costs do not count, as the F30 Fúria) THEN the Hora Extra stacks SHALL become `floor(stacks / 2)` and the counter SHALL reset to 0, and the stacks and counter SHALL carry over between rounds and reset only on a new run.
30. TAL-14: WHILE Hora Extra is at level 3 and at its stack cap an orange aura SHALL show around the player.
31. TAL-15: WHEN a Kokusen window is rolled THEN its width SHALL grow by 10, 20 or 30 ms for Zona Negra at level 1, 2 or 3, and the Kokusen multiplier SHALL be 2.5, 2.8 or 3.1 at level 1, 2 or 3.
32. TAL-15: WHILE Zona Negra is at level 2 or more the fist of the player SHALL glow black while the Kokusen window is open.
33. TAL-15: WHILE Zona Negra is at level 3, WHEN a Kokusen lands THEN every other common enemy within 48 px of the target SHALL take a `micro` hit of 30% of the Kokusen damage, rounded, and a black ring of 48 px SHALL be drawn around the target for 200 ms.
34. TAL-16: WHEN two or more critical sources apply to one hit THEN the damage SHALL be the resolved damage times the largest critical multiplier only, rounded, and the damage number SHALL show the `crit` kind; a technique hit and the Kokusen SHALL never be critical.
35. TAL-17: WHEN the moment listed for a talent in the table "Quando pisca" happens THEN the event `talent:<id>` SHALL be emitted in that frame, and no other moment SHALL emit it (the Condutor SHALL not emit on the 1st and 2nd hits of each 3).
36. TAL-18: The debug snapshot SHALL report `build.talents` as `{id, level}[]` and `build.overtime` as `{stacks, kills}`, keeping `build.perks` as the list of ids.
37. TAL-19: WHILE the Divergente is not equipped the shop SHALL offer no new Zona Negra card and no Zona Negra level card, and WHILE an owned Zona Negra has no Divergente equipped its `TalentStrip` icon SHALL be drawn at 40% alpha and it SHALL keep its level.

**Independent Test**: `talents.smoke.mjs` com `perks=punhoPesado:3,proporcao:2,horaExtra:2,zonaNegra:3`: golpe forte
derruba e atordoa na parede; o comum abaixo de 30% leva crítico amarelo; os abates enchem os gomos; a janela do Kokusen
fica 30 ms mais larga (com o Divergente; sem ele, o ícone da Zona Negra fica apagado); o Condutor pisca só no 3º golpe; testes puros por talento nos dois lados de cada limiar.

---

### P1: A faixa de talentos mostra quem agiu ⭐ MVP

**User Story**: Como jogador, quero ver os meus talentos numa faixa durante a luta, piscando quando agem, para saber
o que a build está fazendo sem abrir menu.

**Why P1**: É o sinal comum de todos os talentos (seção 4, linha "Talentos").

**Acceptance Criteria**:

1. TSP-01: The `TalentStrip` SHALL be a class in `src/game/TalentStrip.ts`, created by the `UiSetup`, with no line added to `src/game/Hud.ts`.
2. TSP-02: The `TalentStrip` SHALL show one icon per owned talent, up to 6, in acquisition order, each with 3 dots and the first `level` filled.
3. TSP-03: WHEN the event `talent:<id>` is emitted THEN the icon of that talent SHALL flash for 250 ms, and a new event during the flash SHALL restart the 250 ms.
4. TSP-04: WHILE Hora Extra is at level 2 or more its icon SHALL show one segment per stack of its cap, with the first `stacks` filled.
5. TSP-05: The icons of the 9 talents and of the Corpo SHALL be drawn in code in `src/game/art/hd/talentIcons.ts`, 16×16 texels in HD, with palette colors only, and SHALL be reviewed on a board before the commit.
6. TSP-06: The `TalentStrip` SHALL not overlap the `EnergyHud` nor the bars of the `Hud`, as read from the bounds in the snapshot `talentStrip: {x, y, w, h, icons: [{id, level, flashing}]}`.

**Independent Test**: `talents.smoke.mjs`: com 4 talentos, a faixa tem 4 ícones na ordem de compra; o parry com o
Refluxo deixa `flashing: true` no ícone dele por 250 ms; a prancha dos ícones em `.fable-out/`.

---

### P1: A build à vista na loja, com a bandeja ⭐ MVP

**User Story**: Como jogador na konbini, quero ver a build inteira numa faixa e marcar nela o eixo-foco de cada item,
para a loja me oferecer o que eu estou montando.

**Why P1**: Sem a marca, o eixo-foco e o item-foco são automáticos e a build não é planejada (decisão 2).

**Acceptance Criteria**:

1. BBR-01: The `BuildBar` SHALL be a class in `src/game/BuildBar.ts`, created by the `UiSetup`, visible only while the shop is open.
2. BBR-02: The `BuildBar` SHALL read `Habilidades <used>/7 (Técnicas <n>/3) · Corpo Nv<c> · Arma Nv<w> · Relíquia Nv<r> · Domínio Nv<d>`, with `—` in place of `Nv<x>` for a missing weapon, relic or Domain.
3. BBR-03: The `BuildBar` SHALL show an icon per owned item with its level dots: 5 for techniques and the Corpo (axis points), 3 for talents, weapon, relic and Domain (level).
4. BBR-04: Every upgrade card SHALL show its level text as `Nv a→b`, and every card frame SHALL take the color of the level the purchase leaves (level 1 grey; technique and Corpo levels 2 to 3 blue, 4 purple, 5 to 6 gold; talent, relic, weapon and Domain level 2 blue and 3 purple; cards with no level grey).
5. BBR-05: WHILE the shop takes input and no `VowPanel` or `ChoicePanel` is open, WHEN `T` is pressed THEN the tray SHALL open, and WHEN `T` is pressed with the tray open THEN it SHALL close.
6. BBR-05: WHILE the tray is open the shop SHALL ignore the keys `1` to `4`, `J`, `R`, `Enter` as continue, and the card `W`/`S` and `A`/`D`.
7. BBR-06: The tray SHALL open with the first owned item selected, and WHILE it is open `A`/`←` and `D`/`→` SHALL move the selection over the owned items in the order slots 0 to 2, Corpo, talents in acquisition order, weapon, relic, Domain, wrapping at both ends.
8. BBR-07: WHILE the tray is open and the selected item has axes, `S`/`↓` SHALL move its focus forward and `W`/`↑` backward through the cycle `automático`, its axes below the cap in table order, `automático`, showing a star on the marked axis, with no confirmation.
9. BBR-07: WHEN an axis is marked on an item THEN that item SHALL become the focus item and any focus mark on another item SHALL return to `automático`.
10. BBR-08: WHILE a focus item is marked, card 0 SHALL use it as the F30 focus item, its axis card SHALL offer the marked axis as the focus axis, and the F33 free point and free axis pages SHALL use it as their focus option; WHILE no item is marked the F30 automatic rule SHALL hold, with ties broken slot 0, slot 1, slot 2, Corpo.
11. BBR-08: IF the marked axis reaches its cap THEN that item SHALL return to `automático` and stay the focus item.
12. BBR-09: The shop hint SHALL read `1-4 comprar · W/S eixo · T build · R rerolar (n) · Enter continuar` with the tray closed and `A/D item · W/S foco · Enter abandonar · T fechar` with it open, leaving out `W/S foco` WHILE the selected item has no axis and `Enter abandonar` WHILE it cannot be abandoned, and SHALL read `Enter confirmar · A/D/W/S/T cancelar` WHILE the abandon question is open.
13. BBR-10: WHILE 3 techniques, the Corpo and 1 talent are owned and the highest level technique has no mark, the focus axis of that technique SHALL appear in at least 60% of the shops over 1000 seeds.
14. BBR-11: The focus marks SHALL reset on a new run, and the debug parameter `focus=<item>.<axis>` SHALL mark that axis at the run reset, ignoring an unknown item or axis.
15. BBR-12: The debug snapshot SHALL report `buildBar: {open, selected, confirm, focus}` with `focus` as `{item, axis}` or `null`.

**Independent Test**: `build-bar.smoke.mjs` com `fragments=300&round=4&tech=vermelho,azul`: a faixa diz
`Habilidades 2/7 (Técnicas 2/3)`; `T`, `D`, `S` marcam o 1º eixo do Azul abaixo do teto, e na seed do smoke a carta 0
é a do Azul com esse eixo; `T` fecha e a tecla `1` volta a comprar.

---

### P1: Abandonar para trocar de rumo ⭐ MVP

**User Story**: Como jogador que errou a compra, quero abandonar um item na bandeja e receber parte do que gastei, para
trocar de rumo sem ficar preso ao erro até morrer.

**Why P1**: Com o pool, a vaga ocupada pesa no preço de tudo; sem saída, a escolha errada da r2 estraga a run.

**Acceptance Criteria**:

1. ABD-01: WHILE the tray is open, WHEN `Enter` is pressed on an abandonable item THEN the tray SHALL ask `Abandonar <nome> Nv<level>? +<n> fragmentos` (with `+0` when the refund is 0), WHEN `Enter` is pressed again at least 300 ms after the question opened THEN the item SHALL be abandoned, an earlier `Enter` SHALL be ignored, and WHEN `A`, `D`, `W`, `S` or `T` is pressed instead THEN the question SHALL close with nothing abandoned.
2. ABD-02: WHEN an item is abandoned THEN the wallet SHALL gain `floor(0.4 × spent)`, with `spent` the fragments actually paid (inflation included) for buying that item and for its levels or points since it was last acquired, and fragments of free sources (starting technique, debug, chest, mastery, choice panel) SHALL count 0.
3. ABD-02: The spent ledger of the Roxo SHALL start at the price paid for the União (60, or 0 from the chest) and SHALL not inherit the ledger of the Azul nor of the Vermelho.
4. ABD-03: WHEN a technique is abandoned THEN its slot SHALL become empty with the other slots unchanged, its axis points, branch and Despertar SHALL be cleared (`axes.resetItem`), its cooldown SHALL become 0, and its pending choices SHALL leave the choice queue, while its mastery milestones per `TechId` SHALL stay.
5. ABD-04: WHEN a talent is abandoned THEN it SHALL leave `Perks` and its run state (Hora Extra stacks and counter, marks, afterimage, Refluxo timer) SHALL be cleared.
6. ABD-05: WHEN the relic or the weapon is abandoned THEN that arsenal slot SHALL become empty and the shop SHALL be able to offer a new one from the next draw; WHEN the relic, the weapon or a talent is abandoned THEN the `StatsDirector` SHALL recompute the multipliers and the power points in the same frame (Punho Pesado takes its 2 force points with it).
7. ABD-06: IF `Enter` is pressed on the Corpo or on the Domain THEN the tray SHALL show `Não sai da build` and nothing SHALL change.
8. ABD-07: WHEN an item is abandoned THEN the open cards SHALL stay the same cards, the price and the `OCUPA VAGA` line of every new item card SHALL be recomputed from the new occupancy, and a card that stopped being eligible SHALL stay visible with a grey frame and its level line reading `SEM VAGA` (a new item with no room) or `FORA DA BUILD` (an upgrade of the abandoned item), and SHALL be refused on purchase with no fragment spent.
9. ABD-08: WHEN the focus item is abandoned THEN the focus mark SHALL clear and the automatic rule SHALL hold.
10. ABD-09: WHEN an item is abandoned THEN the event `abandon:<item>:<refund>` SHALL be emitted.

**Independent Test**: teste puro do livro de gastos (Vermelho comprado por 34 na r1 e com um ponto de 13 na r2:
abandonar devolve `floor(0,4 × 47)` = 18; técnica inicial devolve 0); `build-bar.smoke.mjs`: `T`, `Enter`, `Enter` no
Vermelho (o 2º depois de 300 ms; dois `Enter` em 100 ms não abandonam) esvazia o slot 0, a carteira sobe o devolvido e o preço do talento novo à vista cai `round(8 × inflação)`.

---

### P1: Um agregador só e o piso do custo ⭐ MVP

**User Story**: Como desenvolvedor das fases seguintes, quero todo multiplicador de talento, o teto da janela do
Kokusen e o piso do custo num agregador puro, para talento, voto e relíquia novos entrarem sem escrever direto no
`Loadout` nem no `Player`.

**Why P1**: A seção 4 do plano proíbe escrever multiplicador fora do `buildEffects`; os talentos da leva 1 já precisam
dele.

**Acceptance Criteria**:

1. BEF-01: The module `src/core/buildEffects.ts` SHALL be pure (no Phaser import) and SHALL be the only code that turns talent levels, Hora Extra stacks and critical sources into multipliers, energy gains, heals, the Kokusen window bonus, the Kokusen multiplier and the final technique cost.
2. BEF-01: No talent SHALL write `damageMul`, `vowDamageMul`, `costMul`, `damageTakenMul` nor `setMaxHp` directly, and the `statSheet` of the F29 SHALL read the talent part from `buildEffects`.
3. BEF-02: WHEN step 4 is committed THEN the 60% cost floor SHALL live in `buildEffects` and not in the `Loadout`, and for each technique, each Eficiência from 0 to 3 points, with no vow and with Fluxo selado, the final cost SHALL equal the F33 result.
4. BEF-03: The sum of the Kokusen window bonuses SHALL be capped at 30 ms in `buildEffects`, and the base window SHALL keep the rolled 50 to 90 ms.
5. BEF-04: The Kokusen multiplier SHALL come from `buildEffects` (2.5 base, Zona Negra 2.8 or 3.1) and SHALL never pass the `KOKUSEN` cap 3.4.
6. BEF-05: The Hora Extra bonus SHALL multiply the melee and the technique damage through `buildEffects`, as `1 + 0.05 × stacks`.
7. BEF-06: The debug snapshot SHALL report `stats.kokusenMul`, `stats.kokusenWindowBonusMs` and `stats.overtimeMul` next to the F29 `stats` fields.

**Independent Test**: `tests/core/buildEffects.test.ts` com a equivalência do custo contra a F33, o teto de 30 ms e o
de ×3,4, e os talentos por nível; o `statSheet.test` refeito para ler os talentos pelo agregador.

---

### P2: A aura conta quanto da build está cheia

**User Story**: Como jogador, quero que o meu personagem vá de fiapos azuis nos pés a uma chama inteira conforme a
build enche, para sentir na tela que fiquei mais forte desde a r1.

**Why P2**: É sensação de poder (seção 4), não regra; a build funciona sem ela.

**Acceptance Criteria**:

1. AUR-01: The build fraction SHALL be `min(1, levels / 45)`, with `levels` the sum of the levels of the equipped techniques, the talent levels, the Corpo axis points, and the levels of the weapon, the relic and the Domain.
2. AUR-02: The build aura stage SHALL be 0 below 0.15, 1 from 0.15, 2 from 0.35, 3 from 0.60 and 4 from 0.85.
3. AUR-03: The `powerAuraDirector` SHALL draw the build aura at the player's feet with height at most 8, 20, 36 and 60 px for stages 1 to 4 and nothing at stage 0, in palette colors, together with the F29 Força tone.
4. AUR-04: WHEN the build fraction changes THEN the aura stage SHALL follow in the same frame of `stats.update`.
5. AUR-05: The debug snapshot SHALL report `power.buildAura: {stage, fraction}`.

**Independent Test**: teste puro dos limiares nos dois lados (7/45 e 6/45; 16/45 e 15/45; 27/45 e 26/45; 39/45 e
38/45); `build-bar.smoke.mjs` monta uma build no estágio 3 e a captura confere a aura em movimento nos dois lados.

---

## Edge Cases

- IF a talent level card and the boss chest raise the same talent to level 3 THEN no further level card of it SHALL be offered.
- WHEN the pool is full and every upgrade is at its cap THEN the shop cards SHALL come from attributes, cure and tools only, as today's weighted draw allows.
- IF the player abandons the only technique THEN card 1 of the next shop SHALL be a new technique (POL-06), and the slot keys SHALL deny the cast with no energy spent.
- IF the União happens with the pool full THEN it SHALL still happen and free one vacancy.
- WHEN the player abandons an item bought in the same visit THEN the refund SHALL be `floor(0.4 × price paid)`, never more than paid.
- WHILE the tray asks for confirmation, WHEN the shop closes by any path THEN nothing SHALL be abandoned and the tray SHALL close.
- IF `T` is pressed while the `ChoicePanel` or the `VowPanel` is open THEN the tray SHALL not open.
- WHEN a Contra Afiado "aberto" target dies THEN the outline SHALL go with it and no other target SHALL become "aberto".
- WHEN the Passo Sombrio afterimage is up and a different enemy attacks THEN that attack SHALL resolve as usual and the afterimage SHALL stay.
- IF the Condutor arc finds no common enemy within 160 px THEN no arc SHALL leave and the 2 per second budget SHALL not be spent.
- WHEN Hora Extra levels up with the counter already at or above the new threshold THEN one stack SHALL be added on the next kill and the counter SHALL reset.
- WHEN the player loses HP with 1 Hora Extra stack THEN the stacks SHALL become 0.
- IF the Proporção mark target dies before being struck THEN the mark SHALL vanish with no new mark.
- WHEN the Zona Negra ring reaches the boss THEN the boss SHALL not take the ring hit (commons only).
- WHILE the Kokusen window bonus sources would sum above 30 ms the window SHALL grow by 30 ms exactly.
- WHEN the run resets THEN the pool, the talents, the focus marks, the spent ledgers, the Hora Extra state and the build aura SHALL return to empty.
- IF the debug `perks=` lists a talent twice THEN the second entry SHALL be ignored.
- WHEN the third slot holds a technique with a `slotHeld` branch (Contido, Lapso, Massa) THEN holding `O` or `B` SHALL work as holding `L` or `I`.
- IF an item is abandoned while it has a pending branch from a purchase in this visit THEN the pending branch SHALL be dropped and the next `ChoicePanel` SHALL not show it.
- WHEN an abandoned item is bought again THEN it SHALL come back at level 1 with no points, branch or Despertar, and its spent ledger SHALL start at the new price.
- WHEN `Enter` is pressed twice within 300 ms on an abandonable item THEN the question SHALL stay open and nothing SHALL be abandoned.
- IF the Divergente leaves the build (abandoned or consumed) while Zona Negra is owned THEN Zona Negra SHALL stay with its level, its icon SHALL dim (TAL-19), and no Zona Negra level card SHALL be offered until a Divergente is equipped again.

---

## Implicit-Requirement Dimensions

| Dimension | Resolução |
| --- | --- |
| Input validation & bounds | POL-01 (7, 3 e 6), TAL-19 (Zona Negra só com o Divergente), POL-05 (compra recusada sem gasto), POL-10 e BBR-11 (`perks=` e `focus=` inválidos ignorados), TRS-04 (4ª técnica ignorada), TAL-01 (nível 1 a 3), BEF-03 e BEF-04 (tetos de 30 ms e ×3,4), AUR-01 (teto 1) |
| Failure / partial-failure states | A compra continua "checar → gastar → aplicar" (SHOP-10); o abandono devolve e remove no mesmo passo (ABD-02 a ABD-05); sem I/O, o resto é N/A |
| Idempotency / retry / duplicate handling | TAL-01 (`add` devolve `false` se já tinha), ABD-01 (dois `Enter` para confirmar, o 2º só depois de 300 ms), edge case do `perks=` repetido, TSP-03 (o piscar reinicia, não empilha) |
| Auth boundaries & rate limits | TAL-12 (2 arcos por segundo), TAL-11 (1 vez a cada 8000 ms); auth N/A porque é jogo local |
| Concurrency / ordering | TRS-02 (o slot mais baixo vence no mesmo quadro), BBR-05 (bandeja só sem `VowPanel` e `ChoicePanel`), TAL-16 (só o maior crítico) |
| Data lifecycle / expiry | TAL-14 (Hora Extra dura a run), TAL-08 (1000 ms do "aberto"), TAL-09 (1500 ms da pós-imagem), TAL-13 (5000 ms da marca), edge case do reset da run |
| Observability | TRS-05, EHD-05, POL-09, TAL-17, TAL-18, TSP-06, BBR-12, ABD-09, BEF-06 e AUR-05 (snapshot e eventos) |
| External-dependency failure | N/A porque não há dependência externa em jogo |
| State-transition integrity | ABD-01 (pergunta → confirma ou cancela), BBR-07 (ciclo do foco), ABD-03 (técnica abandonada limpa eixos, ramo e pendências), TRS-07 (União com 3 slots) |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| SIX-01 | P1: O slot de técnica vira um tipo só | Tasks | Pending |
| SIX-02 | P1: O slot de técnica vira um tipo só | Tasks | Pending |
| VGX-01 | P1: O slot de técnica vira um tipo só | Tasks | Pending |
| VGX-02 | P1: O slot de técnica vira um tipo só | Tasks | Pending |
| VGX-03 | P1: O slot de técnica vira um tipo só | Tasks | Pending |
| TRS-01 | P1: Três técnicas na mão | Tasks | Pending |
| TRS-02 | P1: Três técnicas na mão | Tasks | Pending |
| TRS-03 | P1: Três técnicas na mão | Tasks | Pending |
| TRS-04 | P1: Três técnicas na mão | Tasks | Pending |
| TRS-05 | P1: Três técnicas na mão | Tasks | Pending |
| TRS-06 | P1: Três técnicas na mão | Tasks | Pending |
| TRS-07 | P1: Três técnicas na mão | Tasks | Pending |
| TRS-08 | P1: Três técnicas na mão | Tasks | Pending |
| EHD-01 | P1: Três técnicas na mão | Tasks | Pending |
| EHD-02 | P1: Três técnicas na mão | Tasks | Pending |
| EHD-03 | P1: Três técnicas na mão | Tasks | Pending |
| EHD-04 | P1: Três técnicas na mão | Tasks | Pending |
| EHD-05 | P1: Três técnicas na mão | Tasks | Pending |
| POL-01 | P1: Sete vagas para escolher o caminho | Tasks | Pending |
| POL-02 | P1: Sete vagas para escolher o caminho | Tasks | Pending |
| POL-03 | P1: Sete vagas para escolher o caminho | Tasks | Pending |
| POL-04 | P1: Sete vagas para escolher o caminho | Tasks | Pending |
| POL-05 | P1: Sete vagas para escolher o caminho | Tasks | Pending |
| POL-06 | P1: Sete vagas para escolher o caminho | Tasks | Pending |
| POL-07 | P1: Sete vagas para escolher o caminho | Tasks | Pending |
| POL-08 | P1: Sete vagas para escolher o caminho | Tasks | Pending |
| POL-09 | P1: Sete vagas para escolher o caminho | Tasks | Pending |
| POL-10 | P1: Sete vagas para escolher o caminho | Tasks | Pending |
| TAL-01 | P1: Talentos que mudam a cada nível | Tasks | Pending |
| TAL-02 | P1: Talentos que mudam a cada nível | Tasks | Pending |
| TAL-03 | P1: Talentos que mudam a cada nível | Tasks | Pending |
| TAL-04 | P1: Talentos que mudam a cada nível | Tasks | Pending |
| TAL-05 | P1: Talentos que mudam a cada nível | Tasks | Pending |
| TAL-06 | P1: Talentos que mudam a cada nível | Tasks | Pending |
| TAL-07 | P1: Talentos que mudam a cada nível | Tasks | Pending |
| TAL-08 | P1: Talentos que mudam a cada nível | Tasks | Pending |
| TAL-09 | P1: Talentos que mudam a cada nível | Tasks | Pending |
| TAL-10 | P1: Talentos que mudam a cada nível | Tasks | Pending |
| TAL-11 | P1: Talentos que mudam a cada nível | Tasks | Pending |
| TAL-12 | P1: Talentos que mudam a cada nível | Tasks | Pending |
| TAL-13 | P1: Talentos que mudam a cada nível | Tasks | Pending |
| TAL-14 | P1: Talentos que mudam a cada nível | Tasks | Pending |
| TAL-15 | P1: Talentos que mudam a cada nível | Tasks | Pending |
| TAL-16 | P1: Talentos que mudam a cada nível | Tasks | Pending |
| TAL-17 | P1: Talentos que mudam a cada nível | Tasks | Pending |
| TAL-18 | P1: Talentos que mudam a cada nível | Tasks | Pending |
| TAL-19 | P1: Talentos que mudam a cada nível | Tasks | Pending |
| TSP-01 | P1: A faixa de talentos mostra quem agiu | Tasks | Pending |
| TSP-02 | P1: A faixa de talentos mostra quem agiu | Tasks | Pending |
| TSP-03 | P1: A faixa de talentos mostra quem agiu | Tasks | Pending |
| TSP-04 | P1: A faixa de talentos mostra quem agiu | Tasks | Pending |
| TSP-05 | P1: A faixa de talentos mostra quem agiu | Tasks | Pending |
| TSP-06 | P1: A faixa de talentos mostra quem agiu | Tasks | Pending |
| BBR-01 | P1: A build à vista na loja, com a bandeja | Tasks | Pending |
| BBR-02 | P1: A build à vista na loja, com a bandeja | Tasks | Pending |
| BBR-03 | P1: A build à vista na loja, com a bandeja | Tasks | Pending |
| BBR-04 | P1: A build à vista na loja, com a bandeja | Tasks | Pending |
| BBR-05 | P1: A build à vista na loja, com a bandeja | Tasks | Pending |
| BBR-06 | P1: A build à vista na loja, com a bandeja | Tasks | Pending |
| BBR-07 | P1: A build à vista na loja, com a bandeja | Tasks | Pending |
| BBR-08 | P1: A build à vista na loja, com a bandeja | Tasks | Pending |
| BBR-09 | P1: A build à vista na loja, com a bandeja | Tasks | Pending |
| BBR-10 | P1: A build à vista na loja, com a bandeja | Tasks | Pending |
| BBR-11 | P1: A build à vista na loja, com a bandeja | Tasks | Pending |
| BBR-12 | P1: A build à vista na loja, com a bandeja | Tasks | Pending |
| ABD-01 | P1: Abandonar para trocar de rumo | Tasks | Pending |
| ABD-02 | P1: Abandonar para trocar de rumo | Tasks | Pending |
| ABD-03 | P1: Abandonar para trocar de rumo | Tasks | Pending |
| ABD-04 | P1: Abandonar para trocar de rumo | Tasks | Pending |
| ABD-05 | P1: Abandonar para trocar de rumo | Tasks | Pending |
| ABD-06 | P1: Abandonar para trocar de rumo | Tasks | Pending |
| ABD-07 | P1: Abandonar para trocar de rumo | Tasks | Pending |
| ABD-08 | P1: Abandonar para trocar de rumo | Tasks | Pending |
| ABD-09 | P1: Abandonar para trocar de rumo | Tasks | Pending |
| BEF-01 | P1: Um agregador só e o piso do custo | Tasks | Pending |
| BEF-02 | P1: Um agregador só e o piso do custo | Tasks | Pending |
| BEF-03 | P1: Um agregador só e o piso do custo | Tasks | Pending |
| BEF-04 | P1: Um agregador só e o piso do custo | Tasks | Pending |
| BEF-05 | P1: Um agregador só e o piso do custo | Tasks | Pending |
| BEF-06 | P1: Um agregador só e o piso do custo | Tasks | Pending |
| AUR-01 | P2: A aura conta quanto da build está cheia | Tasks | Pending |
| AUR-02 | P2: A aura conta quanto da build está cheia | Tasks | Pending |
| AUR-03 | P2: A aura conta quanto da build está cheia | Tasks | Pending |
| AUR-04 | P2: A aura conta quanto da build está cheia | Tasks | Pending |
| AUR-05 | P2: A aura conta quanto da build está cheia | Tasks | Pending |

**Coverage:** 85 total, 85 mapped to tasks, 0 unmapped (mapa em `tasks.md`, seção "Requirement Coverage").

---

## Testes e smokes

**Testes novos** (arquivo novo para todo sistema novo; nenhum teste da lista de exceções do `max-lines` cresce):
- `tests/core/skillSlots.test.ts` (SIX-01, TRS-01, POL-01 a POL-08), `tests/core/perksLevel.test.ts` (TAL-01, TAL-04),
  `tests/core/talents.test.ts` (TAL-07 a TAL-17, regras puras por talento, com o momento que pisca), `tests/core/overtime.test.ts` (TAL-14),
  `tests/core/buildEffects.test.ts` (BEF-01 a BEF-05), `tests/core/buildTray.test.ts` (BBR-05 a BBR-08, ABD-01),
  `tests/core/spentLedger.test.ts` (ABD-02, ABD-03), `tests/core/buildAura.test.ts` (AUR-01, AUR-02) e
  `tests/core/shopFocus.test.ts` (BBR-10, a meta de 1000 seeds).
- Cada limiar testado nos dois lados do limite (L-010): 6 e 7 vagas; 2 e 3 técnicas; 5 e 6 talentos; HP a 30% e um
  ponto acima; 14 e 15 abates; 7999 e 8000 ms do Refluxo; 150 e 151 ms do Contra perfeito; 160 e 161 px do arco; as
  frações da aura.
- O adaptador que repassa o número ao motor tem teste próprio, não só o puro (L-043): a tecla `O`/`B` que o
  `TechCaster` passa à `CastMachine`, e o multiplicador que o `BuildDirector` entrega ao `Player.strikeMods`.

**Testes refeitos:** `build` (Perks com nível, `buildPoints` por nível), `statSheet` (talentos pelo agregador; os
números de Nv 1 mudam no passo 2c), `loadout` e `loadoutAxes` (3 slots; o piso sai no passo 4), `cast`, `mastery`,
`evolution` (3 slots), `shop`, `shopAxes` (texto `Nv a→b`, carta 1 do pool, `SEM VAGA` e `FORA DA BUILD`), a elegibilidade da loja (Zona Negra só com o Divergente, TAL-19), `shopPricing` (acréscimo do pool),
`bossChest` (opção de talento), `damageNumber` (tipo `heal`), `kokusen` (janela e multiplicador pelo agregador) e
`debugApi` (campos novos).

**Smokes novos:** `third-slot`, `talents` e `build-bar`, todos com `?debug&hd=1&area=modular`.

**Smokes antigos que mudam** (cada um no passo que os quebra, citando o requisito): `hud` no passo 1 (3 vagas e o
Corpo, EHD-01 a EHD-05), `shop` no passo 2b (carta 1 do pool e etiqueta, POL-06, POL-07) e no passo 3 (`Nv a→b`,
BBR-04), `build` no passo 2c (números do Nv 1, TAL-07 a TAL-12), `boss-chest` no passo 2c (TAL-06), `shop-axes` e
`shop-progress` no passo 3 (BBR-04, BBR-09).

**Smokes que rodam junto:** `tech`, `techniques`, `kokusen`, `evolution`, `fxlab`, `red-anime`, `fight`, `impact`,
`feel`, `power`, `vows`, `arsenal`, `run-loop`, `choice-panel`, `tech-axes` e os de cada técnica da F34.

---

## Success Criteria

- [ ] Na mesma seed, o usuário joga uma run de feiticeiro (3 técnicas nas teclas `L`, `I` e `O`, 4 talentos) e uma de
      lutador (1 técnica, 6 talentos) e sente que são jogos diferentes.
- [ ] Cada talento no Nv 2 e no Nv 3 mostra na tela algo que não estava lá no Nv 1, e o ícone na faixa pisca quando
      ele age.
- [ ] Na konbini, o usuário vê a build inteira na `BuildBar`, marca o eixo-foco com `T` e `W`/`S`, vê a carta 0 seguir
      a marca, e abandona um item recebendo 40% de volta.
- [ ] A aura cresce de fiapos nos pés até a chama inteira ao longo da run, conferida em movimento nos dois lados.
- [ ] Gate verde; os 3 smokes novos e os da lista verdes; a `TestScene` sem linha líquida a mais; a prancha dos
      ícones conferida.
