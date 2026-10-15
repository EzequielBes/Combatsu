# Vermelho e corpo - Specification

## Problem Statement

A técnica comprada só sobe três níveis que multiplicam o dano por 1,25 e 1,5 (`LEVEL_FACTOR`), e o soco não tem trilha
nenhuma além do atributo Força: duas runs com as mesmas compras jogam igual, e o lutador não tem onde gastar. O inimigo
comum tem HP e dano fixos desde o AD-014, então a build fecha cedo e a força comprada some contra uma horda que não
cresce. A F30 (`docs/plano-builds-e-habilidades.md`, linha F30 da seção 6, seções 2.1, 2.2, 2.6, 3.2, 3.3 e 5.2) é a
prova vertical do modelo de upgrade por eixo: o Vermelho vira canhão ou metralhadora por escolha, o corpo a corpo ganha
o Corpo Amaldiçoado, a loja passa a vender pontos de eixo, e **por último** o inimigo cresce por rodada.

A F30 depende da F29 (`fundacao-de-poder`) e usa o que ela entrega:
- `core/statSheet.ts` e o `StatsDirector` (`this.s.stats`): o dono único dos multiplicadores. O Impacto, a Fúria e a
  Cadência do Corpo entram por ele, nunca escrevendo direto em `damageMul`, `vowDamageMul` ou `costMul`.
- `Hit.band` (`'chip' | 'micro'`) e `core/hitBand.ts`: o estilhaço do Vermelho e a Onda do Punho são `micro`, e o campo
  do Vermelho Máximo é `chip`.
- `core/power.ts`: o Impacto do Corpo passa a contar pontos de força (POW-07 deixou a vaga).
- `game/DamageNumbers.ts` (`ui.damageNumbers`): os acertos novos aparecem com o tipo da faixa.
- `Player.strikeMods`: o gancho que devolve `{damage, force}` ganha o alcance e a recuperação, sem campo novo no
  `Player`.
- O tipo de snapshot em arquivo à parte e o parâmetro `mods=` (POW-13).

## Goals

- [ ] O Vermelho sobe do Nv 1 ao Nv 6 por pontos em 6 eixos, com ramo no Nv 2 e Despertar no Nv 5, e o "Canhão"
      (Potência 3 + Escala 2) e a "Metralhadora" (Recarga 3 + Conjuração 2, com o fluxo no teto, como diz a seção 2.2)
      se jogam diferente na mesma seed. Sem o fluxo, a Metralhadora fica presa à energia (30 a 8/s = 3750 ms, acima dos
      2690 ms de recarga, sinal e carga): a dupla que cabe na barra sem atributo é Recarga 3 + Eficiência 2.
- [ ] O soco tem trilha própria: o Corpo Amaldiçoado sobe do Nv 1 ao Nv 6 sem golpe novo, com ramo e Despertar.
- [ ] A loja mostra 4 cartas, a carta de melhoria oferece 2 eixos à escolha com `W`/`S`, e o ramo é escolhido num
      painel na entrada da konbini.
- [ ] Preço de ponto, trava por rodada, inflação de 6% por rodada e piso de 60% do custo valem em teste puro.
- [ ] O inimigo comum ganha 6% de HP e 5% de dano por rodada, o Kokusen escala junto, e o `expectedIncome` prova as
      metas da seção 3.3 que o conteúdo da F30 já permite medir.
- [ ] A `TestScene` não ganha nenhuma linha efetiva líquida na F30.

## Passos e commits

Na ordem do plano. Refatoração é passo próprio, com os smokes iguais; a mudança de comportamento vem no passo seguinte.
A escala de HP e dano é o **último** passo: a dificuldade não sobe antes de o jogador ter os eixos e o Corpo.

| Passo | O que entra | `TestScene` (efetivas) |
| --- | --- | --- |
| 0. **Refatoração, com os smokes iguais** | `core/shopEligibility.ts` e `core/shopPreview.ts` saem de `core/shop.ts` (292 efetivas hoje) | 0 |
| 1. **Refatoração, com os smokes iguais** | `Loadout.stats(id)` devolve `TechStats` com os números de hoje para as 5 técnicas; `CastMachine`, `Loadout`, os adaptadores de `game/tech/` e as vistas `RedOrb`, `redDetonation`, `BlueOrb`, `CutFx` e `PurpleOrb` leem o stat | 0 |
| 2. **Vermelho Nv 1 a 6** | base nova (custo 30, recarga 4500 ms, alcance 320 px), `data/techAxes.ts` com os 6 eixos, Perfuração, ramo no Nv 2 (Ricochete ou Contido, com `slotHeld` no `TechCaster` e no `TechRunner`), Despertar no Nv 5 (Fliperama ou Vermelho Máximo) e a parede que atordoa | 0 |
| 3. **Corpo Amaldiçoado** | `core/cursedBody.ts` com os 6 eixos, ramo (Cadência ou Onda do Punho) e Despertar (Martelo Negro ou Punho que Rasga), e o `strikeEmitter` mínimo | 0 |
| 4. **Carta com 2 eixos** | eixo-foco, `axisRng`, 4 cartas e `buySlot 0..3` (tecla `4`), `ChoicePanel` mínimo (só a página do ramo); a carta de eixo já sai com o preço do ponto (12 + 4 × pontos), sem inflação nem trava, para o Corpo não cair no preço de atributo | 0 |
| 5. **Preços** | técnica nova 20/26, trava por rodada (substitui o `techGate`), inflação de 6% e piso de 60% do custo | 0 |
| 6. **Escala, por último** | `DIFFICULTY.hpPerRound` 0,06 e `damagePerRound` 0,05 (AD-014 revisado), Kokusen escalado (KOK-06 revisado) e o `expectedIncome` com as metas medíveis da seção 3.3 | 0 |

## Out of Scope

| Feature | Reason |
| --- | --- |
| Eixos, ramos e Despertares do Azul, Desmantelar, Divergente e Roxo | F33. Na F30 as 4 continuam no modelo de hoje (Nv 1 a 3, `LEVEL_FACTOR`, −5 de custo por nível), só lidas pelo `TechStats` |
| Página de ponto grátis e de Despertar no `ChoicePanel`, `choiceDirector`, maestria nova (marcos 25/60) e baú do chefe (`bossChest`) | F33. A F30 só tem a página do ramo |
| Pool de 7 vagas, acréscimo de +8 por vaga, 3º slot `O`/`B`, `BuildBar`, marca do eixo-foco na bandeja, Abandonar (`T`), `TalentStrip` e `buildEffects` | F35. Na F30 o eixo-foco é sempre o automático e o piso de custo mora no `Loadout` |
| Ícone do Corpo e pontinhos de nível no `EnergyHud` | F35 (HUD com 3 técnicas). A F30 mostra o nível na carta, no painel e no snapshot |
| Limite Rompido | Pede todas as vagas cheias (F35) |
| União do Roxo na regra nova (peça principal Nv 4 e catalisador em qualquer nível) | F33. Na F30 a receita continua pedindo Nv 3 nas duas (`EVOLUTION_LEVEL`) |
| `TechEmitter`, Santuário e Domínio | F34 e F31. A F30 cria só o `strikeEmitter` mínimo da Onda do Punho |
| Elites | F38. A cláusula "atravessa elite sem detonar" da Perfuração 3 fica no dado, sem alvo até lá |
| Zona Negra (×2,8 e ×3,1) e Punho Negro Divergente (+0,3) no Kokusen | Talento da F35 e Despertar da F33. A F30 deixa o multiplicador em ×2,5 e o teto ×3,4 no dado |
| Metas da seção 3.3 que pedem o catálogo inteiro: ~50% dos níveis de vaga na r10, build fechada entre a r18 e a r22, pico da razão dano/HP entre a r20 e a r24, Roxo ou 1ª Evolução até a r8 | Dependem de talentos, pool, Domínio e União nova (F31, F33, F35). Os cenários do `expectedIncome` nascem na F30 e cada fase acrescenta a sua meta |
| Técnica inicial grátis (`startRng`) | F39 |
| Componente proporcional do Kokusen | A seção 5.2 não dá o número; fica para quando o plano fixar |
| Escala de HP do chefe | O chefe já escala pelo `bossTier`; o `DIFFICULTY` só vale para o comum |
| Arma imbuída | F36 |
| Rachadura e onomatopeia ドン | Leva 2 (F41) |
| Versão antiga (`?hd=0`) | Não recebe trabalho novo; os smokes antigos só não podem quebrar |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| 3 técnicas + Domínio, pool de 7 vagas, arma imbuída e escala do inimigo ligada na F30 (decisões 1, 3, 5 e 6 da seção 7) | Valem; da F30 só a escala muda o código agora | Confirmadas pelo usuário | y |
| Eixo escolhido na carta (decisão 2), Kokusen escalado (7), limiares Nv 2 e Nv 5 (8) e base nova do Vermelho com alcance de 320 px (9) | Seguem a recomendação do plano | O usuário mandou seguir a recomendação nas demais decisões | y |
| Prefixos dos requisitos | SHX (passo 0 e regras de casa), TST (passo 1), VRM (passo 2), CRP (passo 3), CRD (passo 4), PRC (passo 5), ESC (passo 6) | O validador só aceita `CAT-NN`; nenhum desses prefixos existe nas specs | y |
| Nível do Vermelho | `1 + pontos`, de 1 a 6; o `tech=vermelho:N` do debug passa a ser ignorado no nível, e os pontos vêm do `axes=` | O nível é derivado dos pontos (seção 2.1); dois parâmetros para o mesmo número dariam conflito | n |
| Item-foco sem a bandeja (F35) | O item de maior nível entre as técnicas equipadas e o Corpo; empate: slot 0, slot 1, Corpo | O plano diz "a técnica de maior nível", mas o lutador da F30 compra o Corpo e ficaria sem foco até a F35 | n |
| Eixo-foco | O eixo com mais pontos abaixo do teto; empate pela ordem da tabela (Potência, Escala, Conjuração, Eficiência, Recarga, Perfuração; Impacto, Peso, Ritmo, Alcance, Fluxo, Fúria) | Regra do plano sem a marca da bandeja | y |
| Evolução pronta e a carta 0 | A evolução continua na carta 0 (EVO-01); nessa loja a carta de melhoria do foco não sai | O EVO-01 é regra de hoje e a evolução vale mais que um ponto | n |
| Garantia de técnica (TSH-05) | Passa para a carta 1 ("item novo enquanto houver vaga") | A carta 0 vira a de melhoria, e o Corpo sempre existe para melhorar | n |
| Ramo atingido na compra | Fica pendente e abre no `ChoicePanel` da próxima entrada na konbini | Texto do plano ("no painel de escolha da próxima visita") | y |
| Ordem dos painéis na entrada da konbini | `VowPanel` (rodada de chefe) primeiro, depois o `ChoicePanel`, depois a loja | O voto já existe e muda o que a loja vende | n |
| Maestria e prêmio do chefe no Vermelho (hoje sobem o nível) | Dão 1 ponto no eixo-foco do Vermelho, sem painel; a maestria só acumula no Nv 1 e no Nv 2 (no máximo 2 pontos por run, como os limiares de hoje) | O painel de ponto grátis é da F33; sem isso o Vermelho perderia as duas fontes que as outras técnicas têm | n |
| Contido ("segurar prende o orbe no ar por até 1,2 s; soltar detona") | Se a tecla do slot ainda estiver segurada quando o orbe sai, ele voa como hoje, atravessa os comuns e para no ar ao fim dos 320 px; soltar a tecla detona na hora, onde o orbe estiver, com raio ×1,4; aos 1,2 s desde a saída detona sozinho; parede e chefe detonam como hoje, também com ×1,4. Tecla solta antes da saída: voo normal | Detonação a distância sem prender o orbe na ponta dos dedos, já que a tecla fica segurada durante o sinal e a carga | n |
| Rebote do Ricochete e do Fliperama sem inimigo a 200 px | O orbe volta na direção horizontal oposta e voa até 200 px; detona no primeiro toque ou no fim | O Fliperama rebate "em qualquer alvo", e a rua modular quase não tem parede | n |
| Dano das detonações depois da 1ª | 70% do dano de toque e de detonação em toda detonação de rebote (Ricochete e Fliperama) | O plano só fixa a 2ª; um valor por rebote evita o 4º rebote dar 100% | n |
| Componente proporcional ("tira 4% do HP máximo") | Somado ao dano do mesmo acerto, `round(0,04 × maxHp)` no comum e `round(0,01 × maxHp)` no chefe, uma vez por alvo por conjuração (ou por golpe decisivo) | Um acerto só, com um número só; a regra "1 vez por conjuração" da seção 2.1 | n |
| Campo do Vermelho Máximo | Raio igual ao da detonação, empurra para fora a 150 px/s (a velocidade do puxão do Azul, ao contrário) os comuns em pé dentro dele e dá chip de `round(3 × multiplicadores de técnica)` a cada 200 ms por 1200 ms. Os derrubados pela detonação já voam pela força dela (o corpo do comum fica parado no ragdoll), então o empurrão segura quem entra ou levanta: o campo é negação de área | O plano não dá a velocidade do empurrão; reaproveitar a do Azul mantém a escala que a tela aguenta | n |
| Campo com o orbe Azul vivo | O Azul reescreve o `setPull` de todo comum a cada quadro (`blue.ts:60-64`, depois do Vermelho no `TechRunner.update`): com um orbe Azul vivo o puxão dele vale e o campo só dá o chip | Um escritor por quadro, sem mexer no Azul (F33) | n |
| Peso 2 e a faixa do impacto | O `impactTier` de hoje já dá `decisive` a todo `Hit` com `knockdown` (`impactTier.ts:16`): com Peso ≥ 2 todo golpe forte que acerta lê como decisivo. A Cadência continua distinta pelo +50% e por forçar o decisivo também no golpe leve | É a regra da AD-021 (derrubar = decisivo); mudar o `impactTier` mexeria no finalizador | n |
| Parede que atordoa ("inimigo jogado na parede fica atordoado 600 ms") | O comum derrubado pelo Vermelho Máximo ou pelo Peso 3 que encosta numa parede do terreno antes de pousar fica caído (`ragdollStun`) por 600 ms contados do toque | Não existe parede que atordoa comum hoje; o estado caído já é o atordoamento do comum | n |
| Estilhaço da Perfuração | Dano `round(6, 9 ou 12 × multiplicadores de técnica)`, sem a Potência; vizinhos a até 60 px do alvo atravessado, o mais perto primeiro: 1 com 1 ponto, 2 com 2 e com 3 pontos; com o Ricochete, o alvo do toque conta como atravessado | O plano dá o número cru; a Potência já sobe o toque e a detonação | n |
| Repulsão com a Potência | `round(4 × toque da Potência / 30 × multiplicadores de técnica)`: 4, 5, 5 e 6 | "A repulsão passa por `loadout.damage` e escala junto" | n |
| Recarga 3 ("o abate com o Vermelho devolve 30% da recarga") | Cada abate por acerto do Vermelho tira 30% da recarga cheia resolvida (690 ms com 2300) do que resta no slot, sem passar de 0 | Um número por abate, que casa com a horda | n |
| Fúria ("golpes seguidos sem levar dano") | Conta golpes do moveset que acertam (um por golpe, mesmo com vários alvos); zera quando o player perde HP | "Sem levar dano" é perder HP; golpe defendido não zera | n |
| Cadência ("todo 4º golpe seguido que acerta") | Contador de golpes do moveset que acertam; zera quando um golpe termina o `active` sem acertar ou quando o player perde HP; o 4º, o 8º... são decisivos | Um único contador, testável no puro | n |
| Martelo Negro | O alvo do golpe decisivo leva os 4% (1% no chefe) somados ao golpe; os outros comuns a até 48 px do ponto do acerto levam um acerto normal só com os 4%, com `knockdown` | O plano diz "derruba em área de 48 px e tira 4% de cada atingido" | n |
| Onda do Punho | Sai do ponto do acerto do golpe forte, anda 80 px à frente a 600 px/s e acerta o 1º inimigo que tocar, fora o alvo do golpe, com `micro` e `round(0,4 × dano do golpe)`; o Punho que Rasga atravessa todos e anda 160 px; com a Fúria no teto sai uma 2ª onda igual 100 ms depois | O plano dá alcance e dano; velocidade e intervalo são o mínimo para a onda ser vista | n |
| Despertar sem ramo escolhido | Se o item chega ao Nv 5 com o ramo ainda pendente, o Despertar liga quando o ramo for escolhido | Um reroll pode trazer 2 cartas do mesmo item na mesma visita | n |
| Banner e câmera lenta do Despertar | Na 1ª soltura do Vermelho de cada rodada com o Despertar ligado (no Corpo, no 1º decisivo ou na 1ª onda da rodada): banner com o nome do Despertar e `timeScale` 0,4 por 350 ms de tempo real | Seção 4 ("na 1ª conjuração da rodada") | n |
| Texto da carta de eixo | O `preview` da carta leva uma linha por eixo, `›` na escolhida e um espaço na outra, sem espaço em volta da seta para caber nos ~20 caracteres da carta (150 px, 11 px monoespaçado): "›Escala 120→144" / " Potência 35→40". Valor mostrado = o número resolvido que o jogo usa (`Loadout.stats` ou o `bodyStrike`): Potência o toque, Escala o raio, Conjuração sinal + carga em ms, Eficiência o custo, Recarga a recarga em ms, Perfuração o estilhaço; Impacto `×1→×1,1`, Peso `+0%→+20%`, Ritmo `-0%→-8%`, Alcance `+0→+6`, Fluxo a energia por golpe, Fúria o teto em %. Se a compra leva o item ao Nv 2 ou ao Nv 5, uma 3ª linha diz `+ ramo` ou `+ Despertar`. A dica do painel passa a `1-4 comprar · W/S eixo · R rerolar (n) · Enter continuar` | O `ShopPanel` está na exceção de complexidade e não cresce: muda o `CARD_COUNT` e o texto da dica (template, sem ramo). Sem a dica, nada diz ao jogador que `W`/`S` trocam o eixo; sem a 3ª linha, o 1º ponto não avisa que abre o ramo | n |
| Inflação | Vale para o preço de toda carta (atributo, cura, técnica, ponto, passiva, arsenal, evolução), `round(base × (1 + 0,06 × (r − 1)))` com `r` a rodada da loja (a que acabou); o reroll não infla | A conta da seção 3.3 soma o reroll à parte | n |
| Preço do nível das 4 técnicas sem eixo | O de hoje (`base + step × nível`, com a base e o passo de hoje), com a inflação; só o preço do item novo vira 20 (comum) ou 26 (rara) | Mudar a base mexeria no preço do nível que a F33 vai trocar inteiro | n |
| Piso do custo | `max(custo, ceil(0,6 × custo do Nv 1 em TECHNIQUES))`, depois de todas as fontes (eixo, nível e `costMul` dos votos) | Seção 2.1; o Divergente Nv 3 sobe de 10 para 12 | n |
| Modelo do teste de eixo dominante | Dano sustentado = dano por conjuração ÷ período, com período = `max(recarga + sinal + carga, custo ÷ 8 energia/s)`; dano por conjuração = toque + detonação × alvos na detonação + estilhaços; alvos na detonação = `2 × raio / 96` (inimigos em fila no chão); 1 comum atravessado com vizinhos à mão | Jogo de lado: a densidade cresce com o raio, não com a área; com esse modelo os números do plano dão 1,12× | n |
| Teste de eixo dominante no Corpo | Não se aplica: os eixos do Corpo são utilidade (alcance, recuo, energia), e só 2 dos 6 mexem no dano | Comparar contra a mediana de eixos sem dano mediria nada | n |
| Cenário "só corpo a corpo" da r19 | Força 5, Manoplas Nv 3 e Impacto 3, sem a Fúria; golpes de referência `jab` (6) e `cotovelada` (14) | É a build mais comum de lutador na F30 e cabe na renda até a r19 com a inflação | n |
| Kokusen (KOK-06 revisado) | O Kokusen conta como golpe corpo a corpo forte: `max(round(2,5 × meleeDamageAtLevel(D, forca) × meleeMul), round(45 × hpMul))`, com `D = round(18 × LEVEL_FACTOR[nível do Divergente − 1])` (o 2º impacto **sem** os multiplicadores de técnica), `meleeDamageAtLevel` a Força de hoje (`modifiers.ts:20`), `meleeMul` = `statSheet.meleeMul` com os traços `{heavy: true, light: false, counter: false, shadow: false}` (passivas, Manoplas, votos e o Impacto do Corpo, CRP-02.2, cada um uma vez) e `hpMul` o multiplicador de HP do `multipliersFor` da rodada | "×2,5 do golpe que o disparou, com Força, Impacto do Corpo e talentos". A Força não mora no `meleeMul` (vem do `modifiers.meleeDamage`), e o `loadout.damage` já traz o `vowDamageMul`, que tem o `vows.damageMul` também presente no `meleeMul`: partir do dano de técnica contaria o voto duas vezes e deixaria a Força de fora. Sem build na r1 dá 45, como hoje; com Força 5, 68 | n |
| Nome "Fúria" | O eixo do Corpo usa o id `furia` dentro de `corpo` (`corpo.furia`); o voto `furia` não muda | Os dois nomes vêm do plano e vivem em espaços diferentes | n |
| Parâmetros de debug novos | `axes=<item>.<eixo>:<n>[,...]` e `ramo=<item>:<a\|b>`, com `item` em `vermelho` ou `corpo`; entrada inválida é ignorada; lidos no reset da run, depois do `tech=` | Os smokes precisam montar a build sem comprar | n |
| Smokes novos | `red-axes.smoke.mjs`, `cursed-body.smoke.mjs`, `shop-axes.smoke.mjs` e `scale.smoke.mjs`, todos com `?debug&hd=1&area=modular` | Regra de smoke novo do projeto | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: A loja e as técnicas prontas para crescer ⭐ MVP

**User Story**: Como desenvolvedor das fases F30 a F35, quero a elegibilidade e a prévia da loja fora de `core/shop.ts`
e todas as técnicas lendo um `TechStats` resolvido, para os eixos entrarem sem estourar o teto de linhas e a vista
mostrar o mesmo número que o jogo usa.

**Why P1**: Os passos 2 a 5 mudam a loja e o Vermelho; sem isto o `shop.ts` passa de 400 linhas e as vistas ficam com a
cópia do raio 96.

**Acceptance Criteria**:

1. SHX-01: WHEN step 0 is committed THEN `eligible` and its helpers SHALL live in `src/core/shopEligibility.ts`, `previewText` and its helpers SHALL live in `src/core/shopPreview.ts`, and `src/core/shop.ts` SHALL keep the `Shop` class, `drawOffers`, the cost and the views.
2. SHX-01: WHEN step 0 is committed THEN every existing test SHALL pass with only import paths changed, and the smokes `shop`, `shop-progress`, `run-loop` and `evolution` SHALL pass unchanged.
3. SHX-02: The F30 tasks SHALL add no net effective line to `src/scenes/TestScene.ts`, which SHALL end the feature with the effective line count it had at the end of the F29 or fewer.
4. SHX-03: The F30 SHALL put no file in the exception lists of `.oxlintrc.json`, SHALL change only `CARD_COUNT` and the hint text (`1-4 comprar · W/S eixo · R rerolar (n) · Enter continuar`) in `src/game/ShopPanel.ts`, SHALL not grow `src/game/Hud.ts` nor `src/data/moves.ts`, and SHALL add no field to `src/game/Player.ts`.
5. TST-01: The `Loadout.stats(id)` method SHALL return a `TechStats` with cost, cooldown, the four phase times, the damage values and the geometry numbers that today are constants in `core/redOrb.ts`, `game/tech/red.ts`, `core/blueOrb.ts`, `core/cut.ts`, `core/purple.ts` and the views `RedOrb`, `redDetonation`, `BlueOrb`, `CutFx` and `PurpleOrb`.
6. TST-01: WHEN step 1 is committed THEN, for each of the 5 techniques at each level it can hold today, with `damageMul`, `vowDamageMul` and `costMul` at 1 and at 1.35, the `TechStats` SHALL equal today's `Loadout.cost`, `Loadout.damage`, `TECHNIQUES` times and the module constants.
7. TST-02: The `CastMachine` phase times, `Loadout.startCooldown`, `Loadout.cost` and the adapters in `src/game/tech/` SHALL read times, cooldown, cost, damage and geometry from `Loadout.stats()`, and no adapter SHALL read `TECHNIQUES[...]` damage, time or cost fields directly.
8. TST-03: The views `RedOrb`, `redDetonation`, `BlueOrb`, `CutFx` and `PurpleOrb` SHALL size the orb, the sphere, the halo and the slash from the `TechStats` of the cast, with no literal copy of a damage radius.
9. TST-04: WHEN step 1 is committed THEN the smokes `tech`, `techniques`, `red-anime`, `kokusen`, `evolution` and `fight` SHALL pass unchanged.

**Independent Test**: `npm run gate` com o teste de equivalência do `TechStats` (5 técnicas × níveis × multiplicadores);
os smokes listados passam sem mudança em cada um dos dois passos.

---

### P1: O Vermelho vira canhão ou metralhadora por escolha ⭐ MVP

**User Story**: Como jogador, quero pôr pontos no Vermelho em eixos que mudam o que ele faz, para montar de propósito
o canhão ou a metralhadora.

**Why P1**: É a prova do modelo de upgrade por eixo; o resto do plano copia este molde.

**Acceptance Criteria**:

1. VRM-01: The Vermelho with no axis point SHALL cost 30 energy, SHALL have a 4500 ms cooldown and a 320 px range, and SHALL keep 30 touch damage, 25 detonation damage, force 8, 250 ms sign, 350 ms charge, a 96 px detonation, a 12 texel orb, a 6 px sensor and 760 px/s.
2. VRM-02: The Vermelho level SHALL be 1 plus its total axis points, from 1 to 6, and each of its 6 axes (Potência, Escala, Conjuração, Eficiência, Recarga, Perfuração) SHALL hold 0 to 3 points.
3. VRM-02: IF a point would take an axis above 3 points or the Vermelho above 5 total points THEN the system SHALL refuse it and change nothing.
4. VRM-03: The `data/techAxes.ts` table SHALL give, for 0, 1, 2 and 3 points: Potência touch 30/35/40/45, detonation 25/29/33/37 and force 8/9/10/11; Escala radius 96/120/144/168 px, orb 12/14/16/18 texels and sensor 6/7/8/9 px; Conjuração sign 250/200/165/125 ms and charge 350/280/225/175 ms; Eficiência cost 30/26/22/18; Recarga 4500/3600/2900/2300 ms; Perfuração shard 0/6/9/12 to 0/1/2/2 neighbors.
5. VRM-03: For each axis at 0 to 3 points, `Loadout.stats('vermelho')` SHALL return the table value, with the touch, detonation and shard damage times `damageMul` and `vowDamageMul` and no `LEVEL_FACTOR`.
6. VRM-04: WHEN the Vermelho detonates THEN the system SHALL draw 1 plus the Potência points shock rings and SHALL add 10 ms per Potência point to the detonation hitstop.
7. VRM-04: WHEN the Vermelho releases THEN the repulse damage SHALL be `round(4 × Potência touch / 30 × damageMul × vowDamageMul)` (4, 5, 5 and 6 at 0 to 3 points).
8. VRM-05: WHEN the Vermelho orb spawns THEN its sprite SHALL use the resolved orb texels, its sensor SHALL use the resolved sensor radius, and the detonation sphere SHALL grow to the resolved damage radius.
9. VRM-06: WHILE the Vermelho charges the three charge textures SHALL swap at each third of the resolved charge time, the last one at the resolved orb texels (4, 8 and 12, 14, 16 or 18, so the orb does not jump in size at the release), and WHEN it releases with 3 Conjuração points THEN the system SHALL draw a 1-frame afterimage of the player.
10. VRM-07: WHILE Recarga has 3 points, WHEN a Vermelho hit kills an enemy THEN the remaining cooldown of its slot SHALL drop by 30% of the full resolved cooldown, never below 0.
11. VRM-08: WHILE Perfuração has 1 or more points, WHEN the orb passes through a common enemy THEN the system SHALL hit the nearest 1, 2 or 2 other enemies within 60 px of it (1, 2 or 3 points) with a `micro` shard of `round(6, 9 or 12 × damageMul × vowDamageMul)`, each enemy at most once per cast.
12. VRM-09: The Vermelho orb SHALL end its straight flight at 320 px from its spawn point, and no rebound SHALL pick a target farther than 320 px from the player.
13. VRM-10: WHEN the run starts with `?debug&axes=vermelho.<axis>:<n>[,...]` THEN the system SHALL set those points, capped at 3 per axis and 5 in total, and SHALL ignore entries with an unknown item, an unknown axis or a level that is not a positive integer.
14. VRM-10: The debug snapshot SHALL report `build.vermelho: {level, axes, branch, awakened}` with `branch` in `null`, `'ricochete'` or `'contido'`.
15. VRM-19: WHEN the mastery or the boss reward grants a level to the Vermelho THEN the system SHALL add 1 point to its focus axis, the mastery SHALL accumulate only at levels 1 and 2, and IF the Vermelho has 5 points THEN nothing SHALL change.
16. VRM-20: WHILE the Vermelho is in a slot the `EnergyHud` SHALL mark on the energy bar each multiple of the cost of the technique of the last slot used that fits in the current energy.

**Independent Test**: `red-axes.smoke.mjs` com `seed=1&maxAlive=3&tech=vermelho`: com `axes=vermelho.potencia:3,vermelho.escala:2`
o snapshot mostra Nv 6, raio 144 e toque 45; com `axes=vermelho.recarga:3,vermelho.conjuracao:2` a recarga lida é
2300 ms e o sinal mais carga 390 ms.

---

### P1: Ramo e Despertar do Vermelho ⭐ MVP

**User Story**: Como jogador, quero escolher no Nv 2 entre o Ricochete e o Contido e ver o Despertar do ramo no Nv 5,
para a técnica mudar de comportamento, não só de número.

**Why P1**: Sem ramo e Despertar o eixo vira só número, e o plano promete que quem morre entre a r6 e a r12 já viu os
dois.

**Acceptance Criteria**:

1. VRM-11: WHEN the Vermelho reaches level 2 for the first time in the run THEN the system SHALL add a pending branch choice for the Vermelho, shown at the next konbini entry.
2. VRM-12: WHILE the branch is Ricochete the orb SHALL detonate on the first enemy it touches instead of passing through it.
3. VRM-12: WHILE the branch is Ricochete, WHEN the orb detonates for the first time on an enemy, a wall, the floor or the boss THEN it SHALL rebound once toward the nearest enemy within 200 px of the detonation not hit by that detonation.
4. VRM-12: WHILE the branch is Ricochete each detonation after the first SHALL deal 70% of the touch and detonation damage.
5. VRM-12: IF no enemy is within 200 px at a rebound THEN the orb SHALL fly up to 200 px in the opposite horizontal direction and SHALL detonate on its first touch or at the end.
6. VRM-13: WHILE the Despertar Fliperama is on the orb SHALL rebound up to 3 times on any target (enemy, wall, floor or boss), each detonation SHALL raise the orb speed by 15%, and the 3rd detonation SHALL add 4% of each target max HP (1% on the boss).
7. VRM-14: WHILE the branch is Contido, WHEN the orb spawns with the slot key held (`slotHeld`) THEN it SHALL fly as today, SHALL hover at the end of its 320 px, and SHALL detonate with 1.4 times the resolved radius when the key is released or 1.2 s after it spawned, whichever comes first.
8. VRM-14: IF the slot key is released before the orb spawns THEN the Contido orb SHALL fly and detonate as the branchless orb.
9. VRM-15: WHILE the Despertar Vermelho Máximo is on, WHEN the orb detonates THEN it SHALL knock down every common enemy in the radius, SHALL add 4% of each target max HP (1% on the boss), and SHALL leave a 1200 ms field of the same radius that pushes the standing common enemies inside it outward at 150 px/s and deals a `chip` hit of `round(3 × damageMul × vowDamageMul)` every 200 ms to every enemy inside it.
10. VRM-16: IF a common enemy knocked down by the Vermelho Máximo or by a Peso 3 strike touches a terrain wall before it lands THEN it SHALL stay in `ragdollStun` for 600 ms from the touch and the system SHALL emit the debug event `wallStun:<id>`.
11. VRM-17: WHEN the Vermelho reaches level 5 with a branch chosen THEN the Despertar of that branch SHALL turn on, and the Vermelho icon in the `EnergyHud` SHALL get a gold border.
12. VRM-17: WHEN the first Vermelho cast of a round reaches `release` with the Despertar on THEN the system SHALL show a banner with the Despertar name and SHALL set the time scale to 0.4 for 350 ms of real time.
13. VRM-18: WHEN the run starts with `?debug&ramo=vermelho:a` or `ramo=vermelho:b` THEN the Vermelho branch SHALL be Ricochete or Contido, and the Despertar SHALL follow VRM-17 with the level from `axes=`.

**Independent Test**: `red-axes.smoke.mjs` com `ramo=vermelho:a` e 3 inimigos em fila: o orbe detona no 1º, rebate e
detona no 2º com 70%; com `ramo=vermelho:b` e a tecla segurada, o orbe para e detona ao soltar com raio ×1,4; com
`axes=` somando 4 pontos e `ramo=vermelho:b`, a detonação derruba e o snapshot mostra `awakened: true`.

---

### P1: O soco tem trilha própria ⭐ MVP

**User Story**: Como jogador lutador, quero gastar pontos num Corpo Amaldiçoado que muda o peso, o ritmo e o alcance
dos golpes de hoje, para a build de corpo a corpo crescer sem golpe novo.

**Why P1**: O corpo a corpo é o coração do jogo e não tem onde gastar; o lutador do pool de 7 vagas (F35) depende disto.

**Acceptance Criteria**:

1. CRP-01: The Corpo Amaldiçoado SHALL be owned from round 1 at level 1, outside any technique slot, with level 1 plus its axis points (1 to 6), 6 axes (Impacto, Peso, Ritmo, Alcance, Fluxo, Fúria) of 0 to 3 points each, and SHALL reset to level 1 on a new run.
2. CRP-02: The Impacto SHALL multiply the melee damage by 1, 1.1, 1.2 or 1.3 (0 to 3 points) on top of the Força, through `statSheet.meleeMul`.
3. CRP-02: Each Impacto point SHALL add 1 power point in `power.ts`.
4. CRP-03: The Peso SHALL multiply the `force` of player strikes by 1, 1.2, 1.4 or 1.6 (0 to 3 points), through `Player.strikeMods`.
5. CRP-03: WHILE the Peso has 2 or more points every `heavy` player strike that hits a common enemy SHALL carry `knockdown: true`.
6. CRP-04: The Ritmo SHALL scale the `recovery` time of every moveset strike by 1, 0.92, 0.85 or 0.78 (0 to 3 points, rounded to the ms), and SHALL leave the startup, the active time, the guard and parry windows and the Kokusen window unchanged.
7. CRP-04: WHILE the Ritmo has 3 points, WHEN a strike enters `recovery` THEN the system SHALL draw a 1-frame afterimage of the player.
8. CRP-05: The Alcance SHALL widen the hitbox of every moveset strike forward by 0, 6, 10 or 14 px (0 to 3 points), keeping its back edge, and SHALL lengthen the strike trail by the same px.
9. CRP-06: WHEN a player melee strike connects THEN the energy gain SHALL be 3, 4, 5 or 6 (`CE.meleeGain` plus the Fluxo points).
10. CRP-07: WHEN a moveset strike connects THEN the Fúria SHALL add one stack, worth 3%, 4% or 5% of melee damage (1 to 3 points) up to 15%, 24% or 35%, and WHEN the player loses HP THEN the stacks SHALL return to 0.
11. CRP-07: WHILE the Fúria has stacks the player SHALL show an orange aura (`PALETTE` key `a`) whose size grows with the stacks, and WHILE it has none the aura SHALL be off.
12. CRP-15: The Ritmo and the Alcance SHALL reach the strikes through the return of `Player.strikeMods`, with no new field in `src/game/Player.ts`.
13. CRP-14: WHEN the run starts with `?debug&axes=corpo.<axis>:<n>[,...]` THEN the system SHALL set those points with the caps of CRP-01, and the debug snapshot SHALL report `build.corpo: {level, axes, branch, awakened, fury: {stacks, bonus}, cadence}`.

**Independent Test**: `cursed-body.smoke.mjs` com `seed=1&maxAlive=1&enemyGuard=0`: com `axes=corpo.alcance:3` o
`jab` acerta um inimigo 14 px além do alcance de hoje; com `axes=corpo.peso:2` o golpe forte derruba o comum; com
`axes=corpo.impacto:3&mods=forca:5` os pontos de força do snapshot são 8.

---

### P1: Ramo e Despertar do Corpo ⭐ MVP

**User Story**: Como jogador lutador, quero escolher entre a Cadência e a Onda do Punho e ver o Despertar no Nv 5, para
o corpo a corpo ter o mesmo salto de comportamento que a técnica.

**Why P1**: O Corpo segue o molde das técnicas (seção 2.6); sem ramo ele é só multiplicador.

**Acceptance Criteria**:

1. CRP-08: WHEN the Corpo reaches level 2 for the first time in the run THEN the system SHALL add a pending branch choice for the Corpo, shown at the next konbini entry.
2. CRP-08: WHILE the branch is Cadência every 4th consecutive moveset strike that connects SHALL have its impact tier forced to `decisive` and SHALL deal 50% more damage.
3. CRP-08: WHEN a moveset strike ends its active time without connecting, or the player loses HP, THEN the Cadência count SHALL return to 0.
4. CRP-09: WHILE the Despertar Martelo Negro is on, WHEN a Cadência strike is decisive THEN its target SHALL take 4% of its max HP more (1% on the boss), and every other common enemy within 48 px of the hit point SHALL take a hit of 4% of its max HP with `knockdown: true`.
5. CRP-10: WHILE the branch is Onda do Punho, WHEN a `heavy` moveset strike connects THEN the `strikeEmitter` SHALL emit a wave from the hit point that travels 80 px forward at 600 px/s and hits the first enemy it touches, other than the strike target, with `band: 'micro'` and `round(0.4 × strike damage)`.
6. CRP-11: WHILE the Despertar Punho que Rasga is on the wave SHALL pass through every enemy and travel 160 px, and WHILE the Fúria is at its cap a second identical wave SHALL leave 100 ms after the first.
7. CRP-12: The `strikeEmitter` SHALL spend no energy, SHALL not pause the energy regen, and SHALL emit at most 4 waves in any 1000 ms of game time, dropping the excess.
8. CRP-13: WHEN the Corpo reaches level 5 with a branch chosen THEN the Despertar of that branch SHALL turn on, and WHEN its first decisive strike or first wave of a round happens THEN the system SHALL show the Despertar banner and SHALL set the time scale to 0.4 for 350 ms of real time.
9. CRP-14: WHEN the run starts with `?debug&ramo=corpo:a` or `ramo=corpo:b` THEN the Corpo branch SHALL be Cadência or Onda do Punho.

**Independent Test**: `cursed-body.smoke.mjs` com `ramo=corpo:a`: o 4º golpe seguido da cadeia `jab → direto → gancho
→ cotovelada` dispara `impact:decisive`, e a mesma cadeia sem `ramo` (e sem Peso, que derruba e já seria decisivo)
dispara `impact:heavy` no 4º; com `ramo=corpo:b`, o golpe forte solta a onda e o 2º inimigo leva um número `micro`.

---

### P1: A carta oferece o eixo e o painel pede o ramo ⭐ MVP

**User Story**: Como jogador na konbini, quero ver 4 cartas, escolher na carta de melhoria qual de 2 eixos subir e
escolher o ramo num painel, para planejar a build sem depender da sorte.

**Why P1**: É por aqui que os eixos dos passos 2 e 3 chegam ao jogador.

**Acceptance Criteria**:

1. CRD-01: The shop SHALL show 4 cards, the keys `1` to `4` SHALL buy cards 0 to 3 (`ShopInput.buySlot` in `0..3`), and `A`/`D` SHALL cycle the selection over the 4 cards.
2. CRD-02: WHEN a shop opens with an evolution ready THEN card 0 SHALL be the evolution, as EVO-01 does today.
3. CRD-02: WHEN a shop opens with no evolution ready THEN card 0 SHALL be the upgrade card of the focus item when `axisRng` draws below 0.6 and the focus item can be upgraded, and SHALL otherwise be the upgrade card of another owned item drawn by `axisRng` among those that can be upgraded, where an owned item is an equipped technique or the Corpo (relics and weapons are not items here) and "can be upgraded" includes the round lock of PRC-04.
4. CRD-02: IF no owned item other than the focus item can be upgraded and `axisRng` draws 0.6 or more, or no owned item can be upgraded, THEN card 0 SHALL come from the weighted draw of today.
5. CRD-03: WHILE a technique slot is empty and an eligible technique exists card 1 SHALL be a new technique; otherwise card 1 SHALL come from the weighted draw of today, like cards 2 and 3, with at most one card per item in a shop. An upgrade card drawn by weight in cards 1 to 3 SHALL carry its axes as CRD-04 says.
6. CRD-04: The upgrade card of the Vermelho or of the Corpo SHALL offer the focus axis and one other axis below the cap drawn by `axisRng`, and IF only one axis is below the cap THEN it SHALL offer only that axis; its level text SHALL be `Nv <level + 1>/6` (the Vermelho entry goes to `maxLevel 6`, and `Shop.levelOf` reads the Corpo level from `loadout.axes`).
7. CRD-05: WHILE an axis card is selected `W`/`↑` and `S`/`↓` SHALL choose between its two axes, the first being the focus axis, and buying it SHALL add the point to the chosen axis.
8. CRD-05: The axis card preview SHALL show one line per axis with the axis name, the current and the next resolved value and a `›` mark on the chosen one, each line at most 20 characters, plus a line `+ ramo` or `+ Despertar` when the purchase takes the item to level 2 or 5, and `OfferView` SHALL report `axes` and `selectedAxis`.
9. CRD-05: The shop hint SHALL read `1-4 comprar · W/S eixo · R rerolar (n) · Enter continuar`.
10. CRD-06: The `axisRng` SHALL be a stream with its own salt in `core/run.ts`, and the same seed SHALL give the same cards and axes.
11. CRD-07: WHILE the Vermelho is the highest level item and the Corpo and another technique are owned, the focus axis of the Vermelho SHALL appear in at least 60% of the shops over 1000 seeds.
12. CRD-08: WHEN the konbini opens with pending branch choices THEN, after the `VowPanel` when it opens, the `ChoicePanel` SHALL show one page per pending item (Vermelho before Corpo), `A`/`D` SHALL choose between options A and B, `Enter` SHALL confirm the page, and the shop SHALL take no input until the last page is confirmed.
13. CRD-08: WHEN a branch page is confirmed THEN the branch SHALL apply at once and the pending choice SHALL be removed.
14. CRD-09: The `ChoicePanel` SHALL live in `src/game/ChoicePanel.ts`, created by the `UiSetup`, and the debug snapshot SHALL report `choice: {open, page}` with `page` as `{item, options}` or `null`.
15. CRD-10: The upgrade card of the Azul, Desmantelar, Divergente and Roxo SHALL keep today's level text (`Nv N+1/3`), preview (`Dano ×a → ×b`, from `LEVEL_FACTOR`) and effect.

**Independent Test**: `shop-axes.smoke.mjs` com `fragments=200&round=4&axes=vermelho.potencia:1`: a loja tem 4 cartas,
a carta 0 do Vermelho mostra Potência e outro eixo, `S` e a tecla `1` compram o 2º eixo; com `ramo` pendente, o
painel abre antes da loja.

---

### P1: Preço, trava e inflação ⭐ MVP

**User Story**: Como jogador, quero que o ponto de eixo custe menos que o nível de hoje e que os preços subam com a
run, para a build crescer em degraus e fechar perto da r20.

**Why P1**: Sem o preço e a trava, o ramo e o Despertar chegam cedo ou tarde demais.

**Acceptance Criteria**:

1. PRC-01: The price of a new technique SHALL be 20 for a common one and 26 for a rare one, before inflation.
2. PRC-02: The price of a Vermelho or Corpo axis point SHALL be 12 plus 4 times the points already placed in that item (12, 16, 20, 24, 28), before inflation.
3. PRC-03: The price of every shop card SHALL be `round(base × (1 + 0.06 × (r − 1)))`, with `r` the round of the shop, and the reroll cost SHALL not be inflated.
4. PRC-04: An axis point SHALL be on sale from the round 2 shop, the 3rd point of the same item from round 4 and the 5th point from round 6, and the levels 2 and 3 of the four techniques without axes SHALL be on sale from rounds 2 and 4, replacing the `techGate`.
5. PRC-05: The final energy cost of every technique SHALL be at least `ceil(0.6 × its level 1 cost in TECHNIQUES)`, applied after the axis, the level and the vow `costMul`.
6. PRC-05: WHILE the Vermelho has 3 Eficiência points and the vow Fluxo selado is taken its cost SHALL be 18, and WHILE the Divergente is at level 3 its cost SHALL be 12.
7. PRC-06: The level price of the Azul, Desmantelar, Divergente and Roxo SHALL stay today's `base + step × level`, times the inflation.

**Independent Test**: teste puro do preço: Vermelho novo na loja da r1 custa 26, o 1º ponto na r2 custa 13
(`round(12 × 1,06)`), na r10 a inflação é ×1,54 e na r20 ×2,14; o ponto 3 é recusado na loja da r3 e aceito na r4.

---

### P1: O inimigo cresce e a build acompanha ⭐ MVP

**User Story**: Como jogador, quero que a horda fique mais dura a cada rodada e que o Kokusen continue sendo o golpe
mais forte, para a força comprada aparecer contra um inimigo que também cresce.

**Why P1**: É o objetivo do loop (morrer e rejogar com outra build); entra por último para nenhuma fase endurecer o jogo
sem ferramenta nova.

**Acceptance Criteria**:

1. ESC-01: The `DIFFICULTY` tuning SHALL have `hpPerRound` 0.06 and `damagePerRound` 0.05, keeping `hpCap` 3.0, `damageCap` 2.5 and the speed values, with `core/difficulty.ts` unchanged.
2. ESC-01: WHEN a common enemy spawns in rounds 2, 9, 11 and 19 THEN its max HP SHALL be 64, 89, 96 and 125, and WHEN it spawns in round 2 its attack damage SHALL be 13.
3. ESC-01: WHEN step 6 is committed THEN `.specs/STATE.md` SHALL record the revision of the AD-014 as a new decision.
4. ESC-02: WHEN a Kokusen lands THEN its damage SHALL be `max(round(2.5 × meleeDamageAtLevel(D, forca) × meleeMul), round(45 × hpMul))`, with `D = round(18 × LEVEL_FACTOR[Divergente level − 1])` (the second-impact base without the technique multipliers `damageMul` and `vowDamageMul`), `meleeDamageAtLevel` the Força rule of `core/modifiers.ts`, `meleeMul` the `statSheet.meleeMul` for the traits `{heavy: true, light: false, counter: false, shadow: false}` (perks, relic, vows and the Impacto of CRP-02.2, each counted once), and `hpMul` the HP multiplier of the current round.
5. ESC-02: WHEN a Kokusen lands in round 1 with no build THEN its damage SHALL be 45, WHEN it lands in round 1 with Força 5 and nothing else THEN its damage SHALL be 68, and WHEN it lands on the boss THEN the boss SHALL take that damage and that damage times `KOKUSEN.poiseMul` in poise.
6. ESC-02: The `KOKUSEN` tuning SHALL hold the multiplier 2.5 and its cap 3.4.
7. ESC-03: The build curve tests SHALL buy, on top of `expectedIncome`, with the F30 prices, lock and inflation, and every card assumed on sale: the focused Vermelho build SHALL reach level 2 by the round 3 shop and level 5 by the round 10 shop.
8. ESC-03: For the melee build of round 19 (Força 5, Manoplas level 3, Impacto 3), the hits to kill a common enemy with `jab` and with `cotovelada` (`ceil(maxHp / damage)`) SHALL be at most the round 1 hits with no build, and its purchases SHALL fit in `expectedIncome(19)`.
9. ESC-03: In `tests/data/techAxes.test.ts`, no Vermelho axis at 3 points SHALL give more than 1.35 times the sustained damage of the median axis, under the model of the Assumptions table, and Eficiência 2 on top of Recarga 3 SHALL raise the sustained damage of Recarga 3 alone (Eficiência alone gives nothing in that model, because the Vermelho is bound to its cooldown; the pair proves the axis is not dead).
10. ESC-04: The smoke `run-loop` SHALL compute the expected enemy HP and enemy damage by `Math.round(base × (1 + perRound × (r − 1)))` and the player HP after the round-2 hit as the player max HP minus that damage (100 − 13 = 87, today 88), instead of fixed numbers.
11. ESC-04: The smoke `scale.smoke.mjs` SHALL read the enemy max HP at `round=9` (89) and `round=11` (96) and SHALL never use round 10.
12. ESC-05: The debug snapshot SHALL report `difficulty: {round, hpMul, damageMul}`.

**Independent Test**: `scale.smoke.mjs` com `round=9` e `round=11`; os testes `tuning`, `difficulty`, `kokusen` e o
teste novo da curva de build passam; o `run-loop` passa com as fórmulas.

---

## Edge Cases

- IF the Vermelho reaches level 5 while its branch choice is still pending THEN the Despertar SHALL turn on when the branch is chosen.
- IF the run ends with a pending branch choice THEN the pending choice SHALL be dropped on the run reset.
- WHEN the Contido orb hovers and the player is hit THEN the orb SHALL keep hovering until the key is released or the 1.2 s end.
- IF the Ricochete orb touches the boss first THEN that detonation SHALL count as the first and the rebound SHALL look for a common enemy within 200 px.
- WHEN the Fliperama orb rebounds on a wall THEN that contact SHALL count as one of the 3 rebounds.
- WHEN both the Vermelho and the Corpo have pending branches THEN the `ChoicePanel` SHALL show two pages, Vermelho first.
- IF the focus item is at its cap or locked by the round THEN card 0 SHALL fall to another owned item, as CRD-02 says.
- IF the Vermelho has all 5 points THEN no upgrade card of it SHALL be drawn.
- WHEN a reroll draws the cards again THEN the `axisRng` SHALL draw again too, and the chosen axis SHALL reset to the focus axis.
- WHEN the Fúria is at its cap and the player blocks a hit with no HP loss THEN the stacks SHALL stay.
- IF more than 4 waves would leave in 1000 ms THEN the extra waves SHALL not leave and the strike damage SHALL be unchanged.
- WHEN the vow Corpo de vidro lowers the max HP of the player THEN the Fúria and the Cadência SHALL not change.
- IF the Kokusen floor is above `2.5 × D` THEN the damage SHALL be the floor, and the damage number SHALL show it with the Kokusen kind.
- WHEN a common enemy spawns past round 34 THEN its HP multiplier SHALL stay at the 3.0 cap.
- WHILE an Azul orb is alive the Vermelho Máximo field SHALL not push (the Azul pull wins) and SHALL keep its `chip` ticks.
- WHILE the Peso has 2 or more points every heavy strike that connects SHALL read as `decisive` (`impactTier` rule for `knockdown`), and the Cadência count SHALL not change because of it.
- WHEN the round 1 shop opens THEN no axis card SHALL be offered (PRC-04 lock, from step 5 on), and card 0 SHALL come from the weighted draw unless an evolution is ready.

---

## Implicit-Requirement Dimensions

| Dimension | Resolução |
| --- | --- |
| Input validation & bounds | VRM-02 e CRP-01 (teto de 3 por eixo e 5 pontos), VRM-10 e CRP-14 (`axes=` e `ramo=` inválidos ignorados), CRD-04 (só eixo abaixo do teto), PRC-05 (piso de 60%), ESC-01 (tetos de 3,0 e 2,5) |
| Failure / partial-failure states | A compra continua "checar → gastar → aplicar" (SHOP-10); o ponto recusado por VRM-02 não gasta. Sem I/O, o resto é N/A |
| Idempotency / retry / duplicate handling | CRD-03 (uma carta por item por loja), VRM-08 (cada inimigo uma vez por conjuração), CRD-08 (a página confirmada sai da fila) |
| Auth boundaries & rate limits | CRP-12 (teto de 4 ondas por segundo); auth N/A porque é jogo local |
| Concurrency / ordering | CRD-08 (`VowPanel` antes do `ChoicePanel`, Vermelho antes do Corpo), edge case do ramo pendente com o Nv 5 |
| Data lifecycle / expiry | CRP-01 (o Corpo volta ao Nv 1 na run nova), edge case do ramo pendente no reset, VRM-15 (campo de 1200 ms), VRM-14 (1,2 s do Contido) |
| Observability | VRM-10, CRP-14, CRD-09 e ESC-05 (snapshot), VRM-16 (evento `wallStun:<id>`) |
| External-dependency failure | N/A porque não há dependência externa em jogo |
| State-transition integrity | VRM-11 e CRP-08 (ramo só uma vez por run, no Nv 2), VRM-17 e CRP-13 (Despertar só com ramo), CRD-08 (loja trancada até o painel fechar) |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| SHX-01 | P1: A loja e as técnicas prontas para crescer | Tasks | Pending |
| SHX-02 | P1: A loja e as técnicas prontas para crescer | Tasks | Pending |
| SHX-03 | P1: A loja e as técnicas prontas para crescer | Tasks | Pending |
| TST-01 | P1: A loja e as técnicas prontas para crescer | Tasks | Pending |
| TST-02 | P1: A loja e as técnicas prontas para crescer | Tasks | Pending |
| TST-03 | P1: A loja e as técnicas prontas para crescer | Tasks | Pending |
| TST-04 | P1: A loja e as técnicas prontas para crescer | Tasks | Pending |
| VRM-01 | P1: O Vermelho vira canhão ou metralhadora | Tasks | Pending |
| VRM-02 | P1: O Vermelho vira canhão ou metralhadora | Tasks | Pending |
| VRM-03 | P1: O Vermelho vira canhão ou metralhadora | Tasks | Pending |
| VRM-04 | P1: O Vermelho vira canhão ou metralhadora | Tasks | Pending |
| VRM-05 | P1: O Vermelho vira canhão ou metralhadora | Tasks | Pending |
| VRM-06 | P1: O Vermelho vira canhão ou metralhadora | Tasks | Pending |
| VRM-07 | P1: O Vermelho vira canhão ou metralhadora | Tasks | Pending |
| VRM-08 | P1: O Vermelho vira canhão ou metralhadora | Tasks | Pending |
| VRM-09 | P1: O Vermelho vira canhão ou metralhadora | Tasks | Pending |
| VRM-10 | P1: O Vermelho vira canhão ou metralhadora | Tasks | Pending |
| VRM-11 | P1: Ramo e Despertar do Vermelho | Tasks | Pending |
| VRM-12 | P1: Ramo e Despertar do Vermelho | Tasks | Pending |
| VRM-13 | P1: Ramo e Despertar do Vermelho | Tasks | Pending |
| VRM-14 | P1: Ramo e Despertar do Vermelho | Tasks | Pending |
| VRM-15 | P1: Ramo e Despertar do Vermelho | Tasks | Pending |
| VRM-16 | P1: Ramo e Despertar do Vermelho | Tasks | Pending |
| VRM-17 | P1: Ramo e Despertar do Vermelho | Tasks | Pending |
| VRM-18 | P1: Ramo e Despertar do Vermelho | Tasks | Pending |
| VRM-19 | P1: O Vermelho vira canhão ou metralhadora | Tasks | Pending |
| VRM-20 | P1: O Vermelho vira canhão ou metralhadora | Tasks | Pending |
| CRP-01 | P1: O soco tem trilha própria | Tasks | Pending |
| CRP-02 | P1: O soco tem trilha própria | Tasks | Pending |
| CRP-03 | P1: O soco tem trilha própria | Tasks | Pending |
| CRP-04 | P1: O soco tem trilha própria | Tasks | Pending |
| CRP-05 | P1: O soco tem trilha própria | Tasks | Pending |
| CRP-06 | P1: O soco tem trilha própria | Tasks | Pending |
| CRP-07 | P1: O soco tem trilha própria | Tasks | Pending |
| CRP-08 | P1: Ramo e Despertar do Corpo | Tasks | Pending |
| CRP-09 | P1: Ramo e Despertar do Corpo | Tasks | Pending |
| CRP-10 | P1: Ramo e Despertar do Corpo | Tasks | Pending |
| CRP-11 | P1: Ramo e Despertar do Corpo | Tasks | Pending |
| CRP-12 | P1: Ramo e Despertar do Corpo | Tasks | Pending |
| CRP-13 | P1: Ramo e Despertar do Corpo | Tasks | Pending |
| CRP-14 | P1: O soco tem trilha própria | Tasks | Pending |
| CRP-15 | P1: O soco tem trilha própria | Tasks | Pending |
| CRD-01 | P1: A carta oferece o eixo e o painel pede o ramo | Tasks | Pending |
| CRD-02 | P1: A carta oferece o eixo e o painel pede o ramo | Tasks | Pending |
| CRD-03 | P1: A carta oferece o eixo e o painel pede o ramo | Tasks | Pending |
| CRD-04 | P1: A carta oferece o eixo e o painel pede o ramo | Tasks | Pending |
| CRD-05 | P1: A carta oferece o eixo e o painel pede o ramo | Tasks | Pending |
| CRD-06 | P1: A carta oferece o eixo e o painel pede o ramo | Tasks | Pending |
| CRD-07 | P1: A carta oferece o eixo e o painel pede o ramo | Tasks | Pending |
| CRD-08 | P1: A carta oferece o eixo e o painel pede o ramo | Tasks | Pending |
| CRD-09 | P1: A carta oferece o eixo e o painel pede o ramo | Tasks | Pending |
| CRD-10 | P1: A carta oferece o eixo e o painel pede o ramo | Tasks | Pending |
| PRC-01 | P1: Preço, trava e inflação | Tasks | Pending |
| PRC-02 | P1: Preço, trava e inflação | Tasks | Pending |
| PRC-03 | P1: Preço, trava e inflação | Tasks | Pending |
| PRC-04 | P1: Preço, trava e inflação | Tasks | Pending |
| PRC-05 | P1: Preço, trava e inflação | Tasks | Pending |
| PRC-06 | P1: Preço, trava e inflação | Tasks | Pending |
| ESC-01 | P1: O inimigo cresce e a build acompanha | Tasks | Pending |
| ESC-02 | P1: O inimigo cresce e a build acompanha | Tasks | Pending |
| ESC-03 | P1: O inimigo cresce e a build acompanha | Tasks | Pending |
| ESC-04 | P1: O inimigo cresce e a build acompanha | Tasks | Pending |
| ESC-05 | P1: O inimigo cresce e a build acompanha | Tasks | Pending |

**Coverage:** 63 total, 63 mapped to tasks, 0 unmapped (mapa em `tasks.md`, seção "Requirement Coverage").

---

## Testes e smokes

**Testes novos** (arquivo novo para todo sistema novo; nenhum teste da lista de exceções do `max-lines` cresce):
- `tests/core/techStats.test.ts` (equivalência TST-01), `tests/data/techAxes.test.ts` (tabela VRM-03 e eixo dominante
  ESC-03), `tests/core/redBranch.test.ts` (Ricochete, Fliperama, Contido, Vermelho Máximo), `tests/core/cursedBody.test.ts`
  (CRP-01 a CRP-11), `tests/core/strikeEmitter.test.ts` (CRP-12), `tests/core/shopAxes.test.ts` (CRD-02 a CRD-07, com
  a meta de 1000 seeds), `tests/core/shopPricing.test.ts` (PRC-01 a PRC-06) e `tests/core/buildCurve.test.ts` (ESC-03).
- Cada limiar testado nos dois lados do limite (L-010): 2º, 3º e 5º ponto na rodada exata da trava e na anterior;
  0,6 da carta 0 nos dois lados; teto de 3 e de 5 pontos; 4 e 5 ondas em 1000 ms.
- O adaptador que repassa o stat ao motor tem teste próprio, não só o puro (L-043): o raio do sensor e do orbe que o
  `RedTech` passa ao Matter e ao sprite, e o `recovery` que o `Player.strikeMods` entrega à máquina de golpes.

**Testes refeitos:** `techniques`, `techShop`, `loadout`, `tuning` (SPN-13/14 passam a 0,06 e 0,05, citando o AD-014
revisado), `difficulty`, `kokusen`, `shop`, `bossReward`, `mastery`, `shopPanel` (o `CARD_COUNT`, se ele lê o fonte) e
`debugApi` (campos novos do snapshot).

**Smokes novos:** `red-axes`, `cursed-body`, `shop-axes` e `scale`, todos com `?debug&hd=1&area=modular`.

**Smokes antigos que mudam** (cada um no passo que os quebra, citando o requisito): `techniques` no passo 2 (o trecho
RED-10 mira a detonação a 320 px, não a 420, e espera a recarga de 4500 ms; VRM-01), `evolution` no passo 2
(`tech=azul:3,vermelho&axes=vermelho.potencia:2`, VRM-10), `shop` no passo 4 (4 ofertas e a garantia de técnica na
carta 1; CRD-01, CRD-03), `shop-progress` no passo 4 (o trecho ECN-05/08 passa ao Azul, procurado em qualquer carta,
porque a carta 0 deixa de ser garantida e o Vermelho vira carta de eixo; CRD-02, CRD-10) e no passo 5 (preço pelo
`inflate`, PRC-03), `run-loop` no passo 6 (ESC-04).

**Smokes que rodam junto:** `run-loop` (reescrito, ESC-04), `shop`, `shop-progress`, `tech`, `techniques`, `red-anime`,
`kokusen`, `evolution`, `fight`, `fight-integration`, `impact`, `feel`, `power` (da F29), `boss` e `world-boss`.

---

## Success Criteria

- [ ] Na mesma seed, o usuário joga o Vermelho canhão (Potência 3 + Escala 2) e o metralhadora (Recarga 3 + Conjuração
      2 com `mods=fluxo:4`, o fluxo no teto) e sente a diferença; vê o Ricochete rebater e o Contido parar no ar.
- [ ] O usuário joga uma run só de corpo a corpo e vê o alcance, o recuo, a Fúria e a Cadência mudarem o soco.
- [ ] Na konbini, escolhe o eixo na carta com `W`/`S` (a dica do painel diz isso) e o ramo no painel, sem painel extra
      por compra; a carta do 1º ponto avisa `+ ramo` e a do 4º, `+ Despertar`.
- [ ] Gate verde; os 4 smokes novos e os da lista verdes; a `TestScene` sem linha líquida a mais.
- [ ] A conferência no jogo, em movimento e nos dois lados, da pós-imagem, da aura da Fúria, da onda e das esferas do
      Vermelho em cada nível de Escala, não só na prancha.
