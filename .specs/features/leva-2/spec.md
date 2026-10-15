# Leva 2 - Specification

## Problem Statement

Depois da F40 a run tem 8 técnicas à venda (mais o Roxo da União), 3 Domínios, 9 talentos, 3 armas imbuídas, 4
afixos de chefe e as Uniões e Evoluções da leva 1, mas os arquétipos de build ainda se repetem: não há técnica de feixe
que paga com vida, nem técnica que se apoia no moveset (Trovão), nem Domínio de controle, nem relíquia de aposta, nem
arma que carrega com a defesa, e os talentos da leva 1 não cobrem recuo, postura do chefe, Reversa, parry e custo. A
F41 (`docs/plano-builds-e-habilidades.md`, linha F41 da seção 6; seções 4 (ドン no patamar 3), 5.1, 5.3, 5.4 (Osso de
Dragão e Dedos de Sukuna), 5.6 (Vazio Ilimitado), 5.7 (Duos e Evoluções da leva 2) e 5.8 (afixos da leva 2)) liga ao
jogo tudo o que o catálogo marca como leva 2, mais a Erupção, cuja regra pura já está pronta neste branch.

A F41 depende da F29 à F40 e usa, sem mudar o contrato:
- F29 (`fundacao-de-poder`): `Hit.band` e as regras das faixas (POW-03, POW-15), o `StatsDirector` como dono único
  dos multiplicadores (POW-01), o patamar de força (`core/power.ts`, POW-07) e o `drawHeavyImpact`, o
  `DamageNumbers`, o `powerAuraDirector` e o tipo de snapshot em arquivo à parte (POW-13).
- F30 (`vermelho-e-corpo`): `core/axisBuild.ts`, `Loadout.stats(id)`/`TechStats`, `Loadout.refundCooldown`, o
  `slotHeld` (VRM-14), a carta de 2 eixos com `axisRng`, preço do ponto, trava e inflação (PRC-01 a PRC-05), o banner
  e a câmera lenta do Despertar, `core/axisParam.ts` (`axes=`, `ramo=`), a escala da rodada (`hpMul`, ESC-02) e a parede
  que atordoa (VRM-16).
- F31 (`expansao-de-dominio`): `core/domain.ts`, a barra, `P`/`N`, a ativação decisiva (DOM-08, DOM-09), o Baú do Véu
  (VEU-01 a VEU-04), o nível do Domínio (DNV), o `DomainFx` e o `domain=` do debug.
- F32 (`chefes-com-afixos`, branch `feat/chefes-com-afixos`): `core/bossAffix.ts`, `data/bossAffixes.ts`, o lineup
  pelo `bossAffixRng` (BLN-01 a BLN-11), a lista de pares incompatíveis (BLN-07, vazia na leva 1), a tuning derivada
  (AFX-01), a Moldura Portador de Dedo (PDD-01 a PDD-05), o contorno, o glifo e o aviso da loja (BRD-01 a BRD-08).
- F33 (`eixos-das-tecnicas`): o molde de eixos, ramos e Despertares (EIX), o `ChoicePanel` com o `choiceDirector`, a
  maestria por conjuração (MAE), o baú do chefe (`core/bossChest.ts`) e o teste de eixo dominante.
- F34 (`tecnicas-jjk-1`, spec no worktree `wt-leva1`): o registro `TechId → TechModule` com o portão do módulo
  (REG-01 a REG-04), o `techObjects` aberto (TOB-01 a TOB-03), o `TechEmitter` com teto de 4 por segundo por fonte
  (EMI-01 a EMI-04), o ícone HD da técnica e do Domínio (ICO-01 a ICO-09), o estado `stunned` do comum (BWG-04), o
  `bossBrain.stun(ms, 'tech')` (FLA-05), o custo em vida que não é "levar dano" (FLA-04) e a entrada comum das técnicas
  (JJK-01 a JJK-17).
- F35 (`vagas-e-talentos`): o 3º slot, o pool de 7 vagas (POL), o `Perks` com nível e a tabela de talentos aberta
  (TAL-01 a TAL-19), a `TalentStrip` e o `talentIcons.ts` (TSP), a `BuildBar` com a bandeja e o Abandonar (BBR, ABD), o
  `buildEffects` com o piso de 60% do custo, o teto de +30 ms do Kokusen e a regra do maior crítico (BEF, TAL-16), e a
  aura de build (AUR).
- F36 (`arma-imbuida`): o modelo imbuído (IMB), níveis e eixos da arma (WPN), o `meleeMul` com traço, o rastro e o
  impacto da arma (WFX) com as folhas `weapon-fx-osso-*` (`trail`, `impact`, `charge`) já desenhadas no branch
  `feat/arte-armas-imbuidas` e sem uso, a loja da arma (WSH) e as evoluções de arma com catalisador (WEV).
- F37 (`combos`): as receitas `{kind, id, minLevel}[]`, o baú com todas as receitas prontas, o preço de 60 na loja e o
  teste de nomes e textos únicos (`tests/data/combos.test.ts`). **A spec da F37 ainda não existe em nenhum branch**
  (conferido em 15/10); a F41 usa o contrato que o plano dá na seção 5.7 (ver Assumptions).
- F40 (`votos-novos`): nenhuma regra; a F41 só vem depois dela na fila do plano.
- Regras puras deste branch (`docs/spec-leva-2`, `5701321`, spec `.specs/features/regras-tecnicas-leva2/`, 41
  requisitos KIT/CNV/CAO/TRV/ERU, revisão adversarial feita): `core/techKit.ts`, `core/convergence.ts` (`fireBeam`,
  `chargeMul`), `core/divineDogs.ts` (`summonDogs`, `DogPack`), `core/thunderFist.ts` (`ThunderFist.onStrike`,
  `LandedStrike` com `swingId`), `core/eruption.ts` (`erupt`, `EruptionCast`) e `data/convergence.ts`,
  `data/divineDogs.ts`, `data/thunderFist.ts`, `data/eruption.ts`. A validação deixou para a F41 conferir no jogo o que a
  regra pura não mostra (leitura da investida, raio, pilar) e decidir se a Erupção entra agora.
- Ícones HD (branch `feat/icones-hd-tecnicas`, `687a23f`): `src/game/art/hd/techIcons.ts` (`TECH_ICON_IDS` com 11
  ids, `techIconSheet(48 | 24)`, receitas em `src/game/art/hd/icons/`), `tools/icon-boards.mjs` e
  `tests/game/art/techIcons.test.ts`. Não há ícone da Convergência, dos Cães, do Trovão, da Erupção nem do Vazio
  Ilimitado.

Código conferido em 15/10 neste worktree (base `4c0efae` mais as regras puras da leva 1 e da leva 2; ainda sem a F29 à
F40) e nos branches e worktrees citados:
- `src/data/convergence.ts`: eixos `perfuracao`, `carga`, `largura`, `vida`, `dano`, `recarga`, ramos `supernova` e
  `curva`, `releaseMs` 60, `recoverMs` 200, custo fixo de 20 sem eixo de Eficiência, `hpFloor` 1.
- `src/data/divineDogs.ts`: eixos `caes`, `alcance`, `mordidas`, `prisao`, `eficiencia`, `recarga`, ramos `totalidade`
  e `matilha`, `signMs` 120, `recoverMs` 150, `lifeMs` 1200.
- `src/data/thunderFist.ts`: eixos `cargas`, `saltos`, `dano`, `atordoa`, `eficiencia`, `recarga`, ramos `tempestade`
  e `estatica`, `signMs` 150, `recoverMs` 150, `windowMs` 8000, `hopHitstopMs` 18.
- `src/data/eruption.ts`: eixos `altura`, `erupcoes`, `queima`, `dano`, `eficiencia`, `recarga`, ramos `meteoro` e
  `lagoDeLava`, `signMs` 250, `recoverMs` 200.
- `src/data/arsenal.ts`: `RelicId` `manoplas | faixas | rosario`, `ARSENAL_TUNING.maxLevel` 3, `relicCost` 20 + 12 por
  nível, `minRound` [2, 4, 6].
- `src/core/bossBrain.ts`: estados `intro | active | roar | stagger | dead`, postura com `max`, `regenPerSec` e
  `regenDelayMs`, `StaggerCause` `poise | wall`; não há estado de chefe caído. `src/data/tuning.ts:355-357`: `restMs`
  900/700/500 por fase.
- `src/game/Hud.ts:83-88`: a barra do chefe (BHUD) não mostra a postura; o `Hud.ts` não pode crescer.
- `src/scenes/test/recovery.ts:65-70`: a Energia Reversa trava o player (`p.channeling`) e cura por
  `fx.rctHealMul`.
- `src/game/art/hd/weaponFx/bone.ts` (worktree `wt-armas`): o marcador `charge` do Osso tem 3 lascas
  (`charge-0a` a `charge-3b`).

## Goals

- [ ] Convergência, Cães Divinos, Punho de Trovão e Erupção estão na loja, sobem do Nv 1 ao Nv 6 por eixo com ramo e
      Despertar, e cada uma se joga do jeito do plano: feixe que custa vida, matilha que morde e some, punho que solta
      raio nos próximos golpes, pilar de fogo à frente.
- [ ] O pool tem 12 técnicas à venda (mais o Roxo da União), e cada técnica nova tem ícone HD no slot, na carta e na
      chamada.
- [ ] O Vazio Ilimitado entra no Baú do Véu e no nível do Domínio como os outros três, e paralisa o grupo com o acerto
      decisivo da ativação.
- [ ] Os 5 talentos da leva 2 seguem a regra da F35: cada nível tem um sinal visível e um gatilho novo.
- [ ] O Osso de Dragão é a 4ª arma imbuída, com eixos, marcador de cargas e a evolução Dragão Refletido.
- [ ] Os Dedos de Sukuna são uma relíquia de aposta de 5 níveis, e o 4º e o 5º só caem do chefe Portador.
- [ ] Os 4 afixos da leva 2 entram no sorteio do chefe, cada um com leitura própria e com as incompatibilidades do
      plano.
- [ ] Os 6 Duos e as 3 Evoluções da leva 2 entram no molde de receitas da F37.
- [ ] No patamar 3 de força, o golpe forte que derruba racha o chão e solta o ドン desenhado em HD.
- [ ] A `TestScene` não ganha nenhuma linha efetiva líquida na F41.

## Pacotes e commits

A F41 é grande demais para um pacote só. Esta spec propõe 5 sub-fases, cada uma jogável sozinha e com o seu próprio
`tasks.md` (ou um `tasks.md` com 5 fases); o design confirma ou refaz a divisão. Dentro de cada sub-fase vale a regra
de fase do plano: refatoração é passo próprio com os smokes iguais, e cada passo de técnica termina jogável.

| Sub-fase | Requisitos | Depende de | `TestScene` (efetivas) |
| --- | --- | --- | --- |
| **F41a técnicas** | TC2, CNG, DOG, RAI, ERP, IC2-01 a IC2-04 | F34, F35 | 0 |
| **F41b Domínio, talentos e ドン** | VAZ, TLV, IC2-05, DON | F29, F31, F35 | 0 |
| **F41c arsenal** | OSS, DED | F32, F35, F36 | 0 |
| **F41d chefes** | AF2, ENF, COU, SOB, PDR | F32 | 0 |
| **F41e combos** | DUO, EVL | F37, F41a, F41b, F41c | 0 |

LVX vale em todas as sub-fases.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Mudar as regras puras da leva 2 (`core/convergence.ts`, `divineDogs.ts`, `thunderFist.ts`, `eruption.ts`, `techKit.ts`) | Verificadas na `regras-tecnicas-leva2`; o adaptador só as chama. Achado de calibração muda o número do dado, não a regra |
| Caixão da Montanha de Ferro (Domínio do Jogo) | Leva 3 do catálogo da seção 5.6 |
| Chefe novo em HD (Mahoraga) e marcas no rosto pelos Dedos | Feature de arte à parte (seções 4, 5.8 e linha "Arte à parte" da seção 6) |
| Grimório (dica de meia receita, receita revelada) | F37 e F39; as receitas da F41 entram na lista da F37 e aparecem nele sem código próprio |
| Paleta própria por ramo e por Despertar das técnicas novas | Feature de arte à parte, como na F33 e na F34; a F41 usa a borda dourada, o banner e a câmera lenta da F30 |
| Elites com afixo e afixos de elite | F38 |
| Áudio (trovão, latido, ドン falado) | O jogo não tem áudio; o ドン é desenho |
| Graus de maldição, Véu Rompido e regras de ato | F26 e F38 |
| Bonecos do FxLab como alvo das técnicas novas e teclas do FxLab para elas | O FxLab é laboratório das técnicas de hoje; o smoke `fxlab` só não pode quebrar |
| Redesenhar os 11 ícones HD que já existem | Já revistos no branch `feat/icones-hd-tecnicas`; a F41 só desenha os 5 novos |
| Desbloqueio por conquista das técnicas novas | F39 decide a lista de conquistas; a F41 só põe as técnicas no pool liberado |
| Versão antiga (`?hd=0`) | Não recebe trabalho novo; os smokes antigos só não podem quebrar |

---

## Assumptions & Open Questions

Valem as premissas comuns da F34 (JJK) e da F35 (TAL) sem repetição: multiplicadores de dano só no número de dano
(nunca no atordoamento, na força ou no componente proporcional), componente proporcional `round(pct × maxHp)` uma vez
por alvo por conjuração, estado puro refeito ao fechar a konbini e no reset da run, acerto de 0 sem número, teto de 4
emissões por segundo por fonte no `TechEmitter`, e a regra do maior crítico (TAL-16).

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Decisões da seção 7 (3 técnicas + Domínio, pool de 7, arma imbuída, escala na F30, ícone HD e as demais) | Valem como nas specs da F30 à F36 | Confirmadas pelo usuário ou "seguir a recomendação" | y |
| Nada automático | Toda técnica nova sai da tecla do slot; os Cães somem em 1,2 s e não escolhem alvo; o Trovão só age no golpe do moveset que acerta; o Vazio só sai da tecla `P`/`N`; os Duos e as Evoluções só agem a partir de uma ação do jogador (golpe, Contra, parry, conjuração, ativação) | Pedido do usuário (topo do plano) | y |
| Erupção na F41 | Entra junto com as três da leva 2, com regra, eixos, ramo, Despertar e ícone; o Caixão da Montanha de Ferro continua na leva 3 | A tarefa pediu e a regra pura está pronta; a validação da leva 2 deixou a decisão para a F41 | n |
| Prefixos dos requisitos | LVX (regras de casa), TC2 (entrada comum das 4 técnicas), CNG (Convergência), DOG (Cães), RAI (Trovão), ERP (Erupção), IC2 (ícones HD novos), VAZ (Vazio Ilimitado), TLV (talentos), OSS (Osso de Dragão), DED (Dedos de Sukuna), AF2 (afixos da leva 2, comum), ENF (Enfurecido), COU (Couraça), SOB (Sobrecarregado), PDR (Pele de Dragão), DUO (Duos), EVL (Evoluções da leva 2), DON (ドン) | O validador só aceita `CAT-NN`; nenhum desses prefixos existe nas specs (conferido nos worktrees e no repositório em 15/10), e os da regra pura (KIT, CNV, CAO, TRV, ERU) continuam sendo a regra | n |
| Contrato da F37 | Receita `{kind, id, minLevel}[]` com a peça principal no Nv 4 e o catalisador em qualquer nível; União e Evolução no baú (grátis) e na loja (60); todas as prontas oferecidas; teste de nomes e textos únicos. Se a spec da F37 mudar o contrato, o design da F41 segue a F37 | É o texto da seção 5.7; a spec da F37 ainda não existe | n |
| Ids das técnicas | `TechId` `convergencia`, `caes`, `trovao`, `erupcao`, iguais aos ids dos ícones novos; nomes "Convergência", "Cães Divinos", "Punho de Trovão", "Erupção" | Molde da F34: o `TechDef.icon` é o próprio id | n |
| Ids de eixo e de ramo | Os de `data/convergence.ts`, `data/divineDogs.ts`, `data/thunderFist.ts`, `data/eruption.ts`; `ramo=<item>:a` é o 1º do par (Supernova, Totalidade, Tempestade, Meteoro), na ordem do plano | Molde da F30 e da F34 | n |
| Raridade e preço | Convergência rara (26), Cães comum (20), Trovão raro (26), Erupção comum (20), antes da inflação e do acréscimo de vaga (POL-02); as 4 entradas no fim do `GAME_SHOP_CATALOG`, nesta ordem | O plano não dá raridade; a Convergência e o Trovão são as de dano mais alto da leva (feixe que atravessa, raio em todo golpe) | n |
| Cor da aura e da chamada | Convergência `red`, Cães `white`, Trovão `blue`, Erupção `yellow` (cores que o `AuraColor` já tem depois da F34); a borda da chamada (`TechDef.aura`) é uma chave do `PALETTE` escolhida no design | Sem cor nova de aura; o sangue é vermelho, o olho dos cães é branco, o raio é azul e o fogo é âmbar | n |
| Tempos de conjuração | Os de `data/*.ts`: Convergência sinal 0, carga pelo eixo Carga (600 → 300), soltura 60, recuperação 200; Cães 120/–/–/150; Trovão 150/–/–/150; Erupção 250/–/–/200 (soltura e recuperação que faltam no dado entram no design com 60 ms) | Números já gravados; a soltura curta é a das técnicas de hoje | n |
| Carga da Convergência | A tecla do slot segurada carrega pelo `slotHeld`; soltar dispara com `chargeMul(stats, heldMs)`; segurar além da carga cheia não dispara sozinho e não tem prazo; golpe tomado na carga cancela como CAST-07, sem custo; a konbini, a morte e a troca de área cancelam sem custo | "Segurar carrega até 600 ms; soltar dispara"; nada automático | n |
| Origem do feixe | O centro da caixa do player (`hurtRect`) mais meia largura da caixa na direção do `facing`, na altura do centro | Molde da origem da F34 (centro da caixa), deslocado para o feixe não nascer dentro do player | n |
| Alvos na tela | Toda técnica nova, o raio dos Duos e o Vazio recebem só os alvos vivos com o centro dentro da vista da câmera | Contrato do `techKit.ts` (achado 3 da revisão da leva 2): o alcance travado em 320 px vale também para dobras, saltos e estilhaços | y (regra pura) |
| Custo em vida da Convergência | Igual ao da Fala (FLA-04): sai na soltura, não é "levar dano", sem reação, sem número vermelho, sem zerar Fúria, Cadência nem o combo; o portão nega o aperto com `techDenied:hp` se `vida − custo < 1`; com custo 0 nunca nega | A regra pura recusa na soltura (CNV-04); negar no aperto evita a carga à toa | n |
| Prisão dos Cães | A prisão é o estado `stunned` do comum (BWG-04) pelo tempo da prisão e, no chefe, `bossBrain.stun(ms, 'tech')` com 25% do tempo; o eixo Prisão passa de `[0, 200, 400, 600]` a `[200, 330, 470, 600]` (só o dado, a regra não muda) | A regra pura fixou "molde do atordoamento da Fala"; um estado novo de "preso que ainda ataca" cresceria o `enemyBrain` sem pedido do plano. Revisão: com prisão 0 no Nv 1, os Cães eram 2 mordidas micro de 6 (12 de dano por 24 de energia, metade do que qualquer outra técnica rende) que não param nem empurram ninguém, e a técnica não tinha leitura própria antes do 1º ponto; com 200 ms a mordida já corta o ataque em preparo do 1º alvo (BWG-04), e os Cães viram "o corte de ataque à distância". Prisão é utilidade e fica fora do teste de eixo dominante | n |
| Faixa dos acertos que derrubam | O raio vertical com Raio Celeste e o meteoro (com e sem a Chuva) saem sem faixa (normais), com `knockdown` só no comum; o raio vertical sem Raio Celeste é `micro` | A faixa `micro` não interrompe nem derruba (POW-03); a regra pura manda derrubar | n |
| Raio do Trovão e o `TechEmitter` | O raio do Trovão é efeito da conjuração (pago com energia), não passa pelo `TechEmitter` e conta na maestria da conjuração; só os raios dos Duos (Impacto Elétrico) passam pelo emissor | Molde da detonação da Ressonância (efeito adiado de uma conjuração do jogador) | n |
| Golpe do moveset para o Trovão | Todo golpe do moveset que acerta, inclusive Contra, finalizador e golpe com arma imbuída; nunca objeto do mundo, técnica nem emissão | "Os próximos 3 golpes do moveset" | n |
| Santuário e carga do Domínio | Cada conjuração das 4 solta no máximo 1 gatilho do Santuário e dá +1 de carga do Domínio no 1º acerto não chip; o raio do Trovão nunca solta gatilho (o golpe que o carregou já soltou) | SAN-02 e DOM-02 | n |
| Teste de eixo dominante | Modelos: Convergência `dano × min(perfuracao, 3)` por conjuração (3 alvos em fila); Cães `caes × mordidas × mordida` (um alvo); Trovão `cargas × min(1 + saltos, 3) × dano` (grupo de 3); Erupção `min(erupcoes, 3) × dano + 6 × queima` (grupo de 3 em fila a 56 px); período `max(recarga + sinal + carga, custo ÷ 8 energia/s)`; o mediano é o dos eixos que mudam o dano sustentado sozinhos no modelo; Vida, Prisão, Atordoa, Altura e Largura ficam fora (utilidade) | Molde do JJK-12; eixos de utilidade valem 0 no modelo | n |
| Calibração | Se um teste de eixo dominante ou de balanço falhar, o número do dado muda no passo da técnica e o design registra o valor novo e o motivo. Já calculadas no design ("Calibração do eixo dominante"): Cães `caes [2, 3, 4, 5]` e `capBiteDamage 6` (Mordidas no 3 dava 2,0× a mediana); Erupção `queima [0, 2, 3, 5]` (Erupções no 3 dava 1,5×) | "Os números das tabelas de eixo são ponto de partida" (topo do plano) | n |
| Ícones novos | `convergencia`, `caes`, `trovao`, `erupcao` e `vazio` entram no `TECH_ICON_IDS`, desenhados em código em `src/game/art/hd/icons/leva2Art.ts` no molde de `jjkArt.ts`, nos dois tamanhos (48 e 24), com placa e paleta das receitas de hoje, e passam pela prancha `tools/icon-boards.mjs` antes do commit | Molde do branch `feat/icones-hd-tecnicas`; o desenho é tarefa de arte, em Opus ou Fable (memória do usuário) | n |
| Vista dos Cães | Folha HD `dogs` de 6 quadros (silhueta preta de olho branco: 4 de corrida, 1 de mordida, 1 de sumir na sombra) e o lobo da Totalidade na mesma folha em escala 1,5; desenhados em código em `src/game/art/hd/` | Arte M do catálogo (4 a 6 quadros) | n |
| Raio do Vazio Ilimitado | 320 px em todos os níveis; o Nv 2 só sobe a paralisia dos comuns para 3,5 s e o Nv 3 a do chefe para 0,6 s | O plano repete "320 px (o teto da tela)" no Nv 2; não há raio maior que a tela | n |
| Duração do Vazio | O Domínio dura o tempo da paralisia do comum (2500 ms no Nv 1, 3500 ms nos Nv 2 e 3); o crítico ×1,5 vale só durante ele | O plano não dá duração própria; o "Durante" é o crítico no paralisado | n |
| Vazio no Baú do Véu | O Baú sorteia 2 de 4 (`santuario`, `jackpot`, `amplificacao`, `vazio`) pelo `chestRng` | O Vazio é Domínio da leva 2 como os outros | n |
| Afinidade dos talentos novos | Mão de Ferro `lutador`, Osso Duro `lutador`, Reversa Refinada `feiticeiro`, Domínio Simples `veloz`, Seis Olhos `feiticeiro` | O `buildWeight` precisa de uma linha por carta | n |
| Postura do chefe à vista | A F41 põe uma barra fina de postura logo abaixo da barra do chefe, numa classe nova (o `Hud.ts` não cresce), visível em toda luta de chefe; a Osso Duro Nv 2 desenha as 3 trincas nela, uma a cada 25% de postura perdida | A Osso Duro Nv 2 pede "a barra de postura racha à vista", e hoje não há barra de postura | n |
| Chefe derrubado (Osso Duro Nv 3) | A quebra de postura deixa o chefe em `stagger` por 1,5 × `staggerMs`, desenhado deitado (o quadro do `stagger` girado 90° para trás, sem quadro novo), com o finalizador armado como hoje | Não há estado de chefe caído; "derruba" sem arte nova | n |
| Ponto fraco do Seis Olhos | A marca fica no comum vivo ou no chefe mais perto do centro do player, refeita a cada 500 ms; no Nv 1 existe sem desenho, do Nv 2 em diante é desenhada | "O ponto fraco aparece como marca no inimigo mais próximo" | n |
| Crítico de técnica | A TAL-16 ("técnica nunca é crítica") passa a ter duas exceções: o ponto fraco do Seis Olhos Nv 3 e a Palavra no Ponto Fraco; o Kokusen continua sem crítico | O plano dá crítico de técnica nesses dois itens | n |
| "Parry perfeito" | Todo `parry` ou `deflect`, como na F35 (Refluxo Nv 3) | Definição já tomada na F35 | y (F35) |
| Recuo da Mão de Ferro | O `force` dos golpes do moveset × 1,2 / 1,4 / 1,6, depois do `forceMul` da força e do Peso do Corpo, pelo `Player.strikeMods` | "Recuo" é o empurrão do golpe | n |
| Osso de Dragão: números | Cargas: teto 3 / 4 / 5 (eixo `cargas`, 0 a 2 pontos); +1 carga a cada `parry` ou `deflect` e a cada golpe recebido que tira vida (sem defesa); a soltura é o próximo golpe forte do moveset sem `counter` que acerta com pelo menos 1 carga: dano × `1 + k × (0,25 + 0,25 × soltura)` e o impacto do osso, com `k` = as cargas gastas, ou as cargas + 1 quando elas estão no teto (soltura cheia, que também força o patamar de impacto `decisive`); Estopim: com 1 / 2 pontos, todo outro comum vivo a até 60 / 90 px do golpeado toma um acerto normal de `round(3 × cargas × hpMul)` com `knockdown`; o traço do `meleeMul` (×1,2) é o golpe forte sem `counter` | O plano dá "1 a 3 cargas", "+1 até 5", "+25% por carga" e "60 / 90 px"; a base por carga e o dano do Estopim são escolha, calibrados pelo `weaponBalance.test` (WPN-05). Revisão: com a soltura linear, gastar 1 carga em cada forte rende o mesmo que juntar 5, então o eixo Cargas (teto 3 → 5) não valia nada e a Soltura era o único eixo de dano da arma; a carga extra da soltura cheia paga quem junta e faz do teto maior uma troca (estouro maior, mais raro) | n |
| Dragão Refletido | Osso + talento Refluxo em qualquer nível; com as cargas **no teto**, o parry perfeito solta todas na hora no atacante, como um acerto do `contra` com o multiplicador da soltura cheia e o Estopim; esse parry não soma carga; abaixo do teto o parry só carrega (OSS-03) | "O parry perfeito solta a carga na hora como contragolpe". Revisão: com "pelo menos 1 carga" e o parry somando antes, todo parry soltaria (carrega 1 e solta 1, alternando), a arma nunca juntaria e o Refletido viraria um Contra +25% a cada dois parries; no teto, a guarda vira o 2º jeito de descontar o que juntou, ao lado do golpe forte | n |
| Marcador de cargas acima de 3 | O marcador `charge` do Osso passa a ter até 5 lascas (quadros `charge-0a` a `charge-5b`), desenhado no molde de `weaponFx/bone.ts` | O eixo Cargas vai a 5 e o marcador de hoje só tem 3 | n |
| Ícone do Osso na `BuildBar` | Folha nova `bound-bone` em `src/game/art/hd/weapons.ts`, como a `bound-spear` da Lança (WFX-05) | Molde da F36 | n |
| Dedos de Sukuna: vaga | Ocupam o slot da relíquia (uma relíquia só por vez) e não ocupam vaga do pool | "Ocupa a vaga" no texto da relíquia; relíquia não ocupa vaga do pool (POL-01) | n |
| Dedos: loja e drop | Nv 1 a 3 na loja com o preço do plano: novo 20, depois `16 + 6 × dedos` (22 e 28), antes da inflação, e a trava da relíquia de hoje (rodadas 2, 4, 6); o 4º e o 5º só ao vencer um chefe Portador com os Dedos no Nv 3 ou 4, aplicados na vitória com o banner `Dedo de Sukuna N/5`; vencer o Portador sem Dedos ou abaixo do Nv 3 não dá dedo | "O 1º ao 3º saem da loja; o 4º e o 5º só caem do chefe Portador"; preço da seção 3.2 ("Dedos: 16 + 6 × dedos"). Revisão: a spec cobrava 20/32/44, o preço das outras relíquias, contra o texto do plano | n |
| Dedos: aposta, não armadilha | No Nv 3 os Dedos dão +18% em golpe **e** técnica (com +24% de dano sofrido), contra +30% só em golpe das Manoplas e +30% só em técnica do Rosário: ganham na build que mistura e perdem na build pura, e o 4º e o 5º dedo (+24% e +30% em tudo) são o prêmio. O teste de relíquia prende essa ordem; a carta mostra a chance do Portador que o próximo dedo dá | Revisão: sem a ordem presa num teste, uma calibração de número deixaria os Dedos dominados em toda build (armadilha) ou à frente em toda build (escolha óbvia); sem a chance na carta, o jogador não vê o risco que está comprando | n |
| Dedos e o Portador | A chance do Portador passa a `0,10 + 0,08 × dedos` a partir da r10, com os dedos do momento em que o lineup daquela rodada é pedido pela 1ª vez (BLN-02); o sorteio consome o stream igual com qualquer número de dedos | Mesma seed e mesmos dedos dão o mesmo chefe | n |
| Dedos: afinidade e ícone | Build `lutador`; ícone HD do dedo desenhado em código para a `BuildBar` | O `buildWeight` precisa de uma linha; arte B | n |
| Duos: oferta | Cada Duo é uma entrada `duo` rara no fim do catálogo, a 40 antes da inflação, sem vaga e sem acréscimo de vaga, só nas cartas 2 e 3, elegível com a receita pronta, sem o Duo e com menos de 4 Duos na run | "Carta rara sem vaga, no máximo 4 por run"; o plano não dá preço nem posição | n |
| Duo sem peça | Abandonar uma peça desliga o efeito do Duo enquanto ela falta; o Duo continua contado nos 4 da run | O Abandonar da F35 não reembolsa Duo (não é item da `BuildBar`) | n |
| Troca Explosiva | O orbe do Vermelho trocado pelo Boogie detona na hora no ponto onde ele chega, que é o lugar de onde o player saiu | "Detona na hora, no ponto do orbe": o player sai do cerco e o orbe explode no cerco | n |
| Prego Rubro | O orbe do Vermelho em voo que toca um alvo com marcas da Ressonância detona as marcas daquele alvo na hora (como a detonação do 2º toque, só naquele alvo) e soma ao raio da sua própria detonação o raio de propagação da Ressonância resolvido, com piso de 24 px | "Herda o raio dela": a marca só tem raio na propagação | n |
| Contra Amaldiçoado | O Contra perfeito (definição da F35) com Contra Afiado e uma técnica no Nv 3 ou mais solta, pelo `TechEmitter` (fonte `contraAmaldicoado`), um acerto `micro` de 50% do dano principal da técnica do **primeiro slot (0, 1, 2) que tem técnica no Nv 3 ou mais** no alvo do Contra, 1 vez a cada 6000 ms; técnica sem dano principal (Boogie sem choque, Fala sem "Exploda") aplica o controle dela (tontura ou atordoamento) por 50% do tempo resolvido | "Solta a técnica do slot 1 pelo `TechEmitter` (micro, 50% do dano, sem gastar a conjuração)"; o "slot 1" do plano é o primeiro slot. Revisão: com "slot 0" fixo, a receita pedia uma técnica no Nv 3 e o efeito podia soltar outra no Nv 1 do slot 0; agora a técnica que solta é sempre uma que fecha a receita | n |
| Dano principal | Cada `TechModule` declara o seu dano principal resolvido, o de uma conjuração num alvo só: Vermelho detonação, Azul implosão, Roxo dano, Divergente 2º impacto, Desmantelar corte, Boogie choque, Ressonância detonação, Fala "Exploda", Convergência feixe na carga cheia, Cães mordida × mordidas × cães, Trovão raio × cargas, Erupção pilar | O Contra Amaldiçoado precisa de um número por técnica. Revisão: "Trovão raio" dava meio raio (4 de micro no Nv 1) e "Cães mordida × cães" esquecia as mordidas: as duas técnicas que mais dividem o dano viravam o pior slot do Duo sem motivo | n |
| Sombra no Contra | O Contra perfeito com Cães e Contra Afiado solta, pela fonte `sombra`, a mordida `micro` dos Cães no mesmo alvo e o prende por `max(prisão resolvida, 300 ms)` no comum (25% disso no chefe), no molde da DOG-02 | "O Contra perfeito sai com uma mordida micro no mesmo alvo". Revisão: só a mordida era "o mesmo efeito maior" (um micro de 6 somado ao Contra), contra a regra de combo da seção 5.7; o Contra sozinho nunca segura o alvo, e com a prisão ele passa a abrir o golpe seguinte | n |
| Ordem Elétrica | Com Fala e Trovão, o raio de cada carga salta, depois dos saltos normais, para todo alvo vivo atordoado por uma `SpeechCast` viva, uma vez cada, sem limite de raio dentro da tela | "Os atordoados viram condutores, e o raio salta entre todos eles" | n |
| Rede de Cortes | Cada corte do Desmantelar deixa uma marca no chão no ponto do corte (até 8, a mais velha sai, por 6000 ms); a ativação do Santuário detona todas: cada marca acerta todo alvo com a caixa a até 32 px dela com o dano do corte resolvido e o patamar de impacto forçado a `decisive` | "Como acertos decisivos"; o plano não dá raio | n |
| Sangue Eterno | Cada feixe deixa uma poça de 32 px **sob os pés do player** (centro no x do centro da `hurtRect`) por 4000 ms com a vida paga (0 com custo 0); o próximo feixe cujo trecho entre a origem e o fim contém o centro de uma poça a absorve: dano × 1,5 e cura `round(vida guardada ÷ 2)` | Com custo 0 a evolução continua dando +50% e não fica morta. Revisão: com a poça na origem, o feixe seguinte do mesmo lugar sempre a cruzava, e a evolução era "+50% a cada dois feixes" sem mudar nada no jogo (contra a regra de combo); sob os pés, a origem do feixe fica à frente da poça, e beber o sangue pede recuar ou passar por ela e atirar de volta, o vaivém do Choso | n |
| Palavra no Ponto Fraco | O "Pare!" atordoa o alvo do ponto fraco a até o alcance da Fala mesmo fora do cone e sem linha de visão, e todo acerto não chip num alvo atordoado pela Fala é crítico ×1,5 (técnica inclusive) | "O 'Pare!' acerta o ponto fraco, e o atordoado toma crítico de qualquer fonte" | n |
| Afixos: nomes | Enfurecido/Enfurecida, Couraçado/Couraçada, Sobrecarregado/Sobrecarregada, Pele de Dragão (igual nos dois) | O BRD-01 pede o nome no gênero do arquétipo | n |
| Enfurecido | `restMs` de toda fase × 0,8 (respeitando o `minRestMs`); a cada 3ª volta do ciclo da fase, os 2 primeiros ataques da volta saem encadeados, sem descanso entre eles | "Encadeia 2 ataques sem descanso a cada 3º ciclo, e `restMs` ×0,8" | n |
| Couraça | Postura máxima × 1,5 e `regenPerSec` × 2 | Texto do plano | y (plano) |
| Sobrecarregado | A vida máxima do chefe fica em 60% (arredondada) e ele ganha um escudo de `round(0,4 × vida máxima de antes)`; todo dano vai primeiro ao escudo e o que sobra à vida; o escudo regenera 10% do seu máximo por segundo depois de 3000 ms sem dano; a postura não muda | "40% da vida é escudo que regenera"; o total na hora do sorteio continua o mesmo | n |
| Pele de Dragão | 3 camadas; enquanto há camadas, o dano que o chefe toma × `1 − 0,15 × camadas`; cada um destes quebra 1 camada antes do dano: Kokusen, Contra que acerta, finalizador, quebra de postura, golpe forte do moveset com patamar de força 2 ou mais, 1º acerto não chip de uma conjuração com Despertar ligado; um acerto quebra no máximo 1; as camadas não voltam | O plano lista as fontes, não o efeito da camada | n |
| Arsenal de Toji e os afixos novos | Suspensos por 3 s: Enfurecido volta ao ciclo e ao descanso normais, Couraça volta à postura normal (sem perder a postura atual além do teto), Sobrecarregado para de regenerar e o escudo não absorve, Pele de Dragão não reduz dano (as camadas ficam) | Molde do WEV-07 | n |
| Onomatopeia ドン | No patamar 3, todo golpe forte do moveset que derruba um comum (ou o chefe pela Osso Duro Nv 3) desenha a rachadura no chão por 1500 ms (some nos últimos 300) e o ドン sobe do ponto do acerto por 600 ms; uma vez por golpe; os dois contam no `fxCap` | Seção 4 ("racha o chão por 1,5 s e solta a onomatopeia ドン desenhada em HD") | n |
| Smokes novos | `convergence.smoke.mjs`, `divine-dogs.smoke.mjs`, `thunder-fist.smoke.mjs`, `eruption.smoke.mjs`, `void-domain.smoke.mjs`, `talents-2.smoke.mjs`, `dragon-bone.smoke.mjs`, `sukuna-fingers.smoke.mjs`, `boss-affix-2.smoke.mjs`, `duos.smoke.mjs`, todos com `?debug&hd=1&area=modular` | Regra de smoke novo do projeto | y |

**Open questions:** none - all resolved or logged above. As premissas com "n" esperam o aval do usuário na revisão da
spec; as de maior impacto no jogo são a Erupção agora, o efeito da camada da Pele de Dragão, os números do Osso e o
escudo do Sobrecarregado.

**Revisão adversarial (15/10, pelo código e pelo jogador)**, já aplicada acima, no design e nas tarefas:
- **Identidade das técnicas:** Convergência (linha que fura, paga com vida) e Trovão (o golpe do moveset conduz) têm
  identidade desde o Nv 1. Os Cães não tinham: prisão 0 deixava 12 de dano micro por 24 de energia, sem parar
  ninguém; a prisão base vai a 200 ms ("Prisão dos Cães"). A Erupção ficou com a diferença para a Convergência
  escrita e testada (zona longe do corpo, colado não toma).
- **Duos:** Troca Explosiva, Prego Rubro, Ordem Elétrica e Impacto Elétrico fazem o que as peças não fazem (detonar
  pela troca, detonar marcas pelo caminho do orbe, atordoado como condutor, técnica que conduz raio). A Sombra no
  Contra era só um micro somado ao Contra e ganhou a prisão; o Contra Amaldiçoado podia soltar uma técnica que não
  fecha a receita; o dano principal do Trovão e dos Cães estava errado. A Evolução Sangue Eterno era um +50%
  passivo e passou a pedir posição.
- **Dedos:** o preço volta ao do plano (20, 22, 28) e um teste prende a ordem "ganha na build mista, perde na pura";
  a carta mostra a chance do Portador.
- **Dominantes:** o teste de eixo dominante já reprovava os Cães (2,0×) e a Erupção (1,5×), com a calibração no
  design. No Osso, a soltura linear deixava o eixo Cargas morto e a Soltura dominante; a soltura cheia e o teste de
  balanço com as duas estratégias corrigem. O Dragão Refletido soltava a cada dois parries e passou a soltar no teto.

---

## User Stories

### P1: A F41 respeita as regras de casa ⭐ MVP

**User Story**: Como desenvolvedor, quero que a leva 2 entre sem inchar a cena, os arquivos no teto nem o tipo do
debug, para a base continuar aguentando as próximas levas.

**Why P1**: É regra de toda fase do plano (seção 6); sem ela a F41, a maior fase, estoura os tetos do lint.

**Acceptance Criteria**:

1. LVX-01: Each F41 task SHALL add no net effective line to `src/scenes/TestScene.ts`, which SHALL end the F41 with the effective line count it had at the end of the F40 or fewer.
2. LVX-02: The F41 SHALL put no file in the exception lists of `.oxlintrc.json`, SHALL not grow `src/game/Hud.ts`, `src/data/moves.ts` nor `src/game/ShopPanel.ts` in effective lines, SHALL add no field to `src/game/Player.ts`, and `src/game/Enemy.ts` and `src/game/Boss.ts` SHALL end each task with at most 400 effective lines.
3. LVX-03: Every new debug snapshot field of the F41 SHALL be typed in a file apart from `src/game/debugApi.ts`.
4. LVX-04: The new smokes of the Assumptions table SHALL run with `?debug&hd=1&area=modular`, and the smokes of the F29 to F40 SHALL keep passing.
5. LVX-05: WHEN each of the four new techniques is committed THEN its commit SHALL not change `src/game/TechRunner.ts`, `src/game/TechCaster.ts` nor `src/scenes/test/techDirector.ts`, beyond its one line in `src/game/tech/registry.ts` (REG-04).
6. LVX-06: Every color drawn by a view, icon, outline, bar, marker or sprite added by the F41 SHALL be a key of the `PALETTE`.
7. LVX-07: The `README.md` SHALL document every debug parameter value and every debug event added by the F41.

**Independent Test**: `npm run gate`; contagem de linhas efetivas da `TestScene`, do `Enemy.ts` e do `Boss.ts` por
commit; `git diff --stat` dos commits de técnica sem `TechRunner.ts`, `TechCaster.ts` e `techDirector.ts`.

---

### P1: As quatro técnicas entram no build ⭐ MVP

**User Story**: Como jogador, quero comprar a Convergência, os Cães, o Trovão e a Erupção, subir os eixos delas,
escolher o ramo e ver o Despertar, como as outras oito.

**Why P1**: Sem a loja, os eixos e o painel, as quatro seriam só debug.

**Acceptance Criteria**:

1. TC2-01: The `TechId` SHALL gain `'convergencia' | 'caes' | 'trovao' | 'erupcao'`, and `TECHNIQUES` SHALL gain their entries with the names "Convergência", "Cães Divinos", "Punho de Trovão" and "Erupção", the icons of IC2-01, the aura colors of the Assumptions table, and the phase times, cost and cooldown at 0 points from `data/convergence.ts`, `data/divineDogs.ts`, `data/thunderFist.ts` and `data/eruption.ts`.
2. TC2-02: For each of the four techniques and each axis at 0 to 3 points, `Loadout.stats(id)` SHALL return the values of `convergenceStats`, `dogsStats`, `thunderStats` and `eruptionStats` for the build read from `loadout.axes`, with every damage value times `damageMul` and `vowDamageMul` (rounded as `loadout.ts` rounds), the energy cost after the `buildEffects` floor and the `costMul`, and the Convergência HP cost unchanged by any multiplier.
3. TC2-03: The `GAME_SHOP_CATALOG` SHALL end with the technique entries of the Convergência (rare), the Cães (common), the Trovão (rare) and the Erupção (common), in this order, priced by POL-02 with base 26 for rare and 20 for common, and every entry already in the catalog SHALL keep its position.
4. TC2-04: The upgrade card of the four techniques SHALL be the two-axis card of JJK-04 (focus axis plus one axis drawn by `axisRng`, `W`/`S`, preview of the resolved values, `+ ramo` or `+ Despertar`), with the level text of BBR-04 and the point price and round lock of PRC-02 to PRC-04.
5. TC2-05: WHEN one of the four reaches level 2 for the first time in the run THEN the system SHALL add a pending branch page to the `ChoicePanel` with option A (Supernova, Totalidade, Tempestade, Meteoro) and option B (Curva, Matilha, Estática, Lago de Lava), and WHEN it reaches level 5 with a branch chosen THEN its Despertar SHALL turn on with the gold border, and the first cast of a round reaching `release` SHALL show the Despertar banner and the 0.4 time scale for 350 ms of real time.
6. TC2-06: WHEN the run starts with `?debug&tech=` naming `convergencia`, `caes`, `trovao` or `erupcao`, or with `axes=<item>.<axis>:<n>` or `ramo=<item>:<a|b>` for those items THEN the system SHALL apply them as JJK-06 does, and SHALL ignore unknown items, unknown axes and invalid points.
7. TC2-07: The debug snapshot SHALL report `build.convergencia`, `build.caes`, `build.trovao` and `build.erupcao` as `{ level, axes, branch, awakened, stats }`, or `null` when the technique is not equipped.
8. TC2-08: Every hit of the four that reaches a target SHALL call `onTechHit` and then `masteryHit` for the cast that started it (every Trovão bolt and column hit counts for the cast that loaded the charge; the Erupção burn and lava count as the F33 counts chip hits; the Convergência shards and bends count for the beam cast).
9. TC2-09: Each cast of the four SHALL release at most one Santuário trigger (SAN-02) and give at most +1 domain charge (DOM-02), both on its first non-chip hit, and a Trovão bolt or column SHALL release no trigger and give no charge.
10. TC2-10: WHEN a hit of one of the four kills THEN the module SHALL call the `claimKillRefund` of its pure state and SHALL cut the returned ms from its slot cooldown through `Loadout.refundCooldown`.
11. TC2-11: WHEN the konbini closes or the run resets THEN each of the four modules SHALL rebuild its pure state from the current build, and WHEN a round ends THEN every live dog, pillar, meteor, lava pool, beam view and Trovão charge SHALL be removed with no further hit.
12. TC2-12: Every target list given to the four pure rules SHALL hold only the living common enemies and the boss whose center is inside the camera view, and the Convergência wall probe SHALL use the static terrain bodies and the solid world modules.
13. TC2-13: In the dominant-axis test of `tests/data/`, each of the four techniques SHALL be measured under its model of the Assumptions table, and no damage axis at 3 points SHALL give more than 1.35 times the median of the damage axes of that technique.
14. TC2-14: The names of the branches and Despertares of the four techniques SHALL enter the uniqueness test of EIX-10 and SHALL be unique against every other branch, Despertar, Evolução, União and Duo.

**Independent Test**: `tests/core/techStatsLeva2.test.ts` (4 técnicas × 6 eixos × 0 a 3 pontos × multiplicadores 1 e
1,35, com as bordas da L-010 no piso de custo); `tech-axes.smoke.mjs` estendido com `axes=trovao.cargas:1` na loja da
r4 e o painel do ramo.

---

### P1: Convergência no jogo ⭐ MVP

**User Story**: Como jogador, quero segurar a tecla, carregar o sangue e soltar um feixe que atravessa a fila,
pagando com vida, para limpar a linha à minha frente quando eu escolher.

**Why P1**: É a técnica de feixe da leva e a única que carrega pelo tempo da tecla.

**Acceptance Criteria**:

1. CNG-01: WHEN the Convergência slot is pressed and the press is allowed THEN the cast SHALL enter its charge, the held time SHALL grow while the slot key stays down (`slotHeld`), and the cast SHALL never fire while the key stays down, at full charge included.
2. CNG-02: IF `HP − resolved HP cost < 1` when the Convergência slot is pressed THEN the press SHALL be denied with `techDenied:hp`, the pressed slot icon SHALL flash red for the TEC-10 flash duration and the energy bar SHALL not flash, and WHEN the resolved HP cost is 0 THEN the press SHALL never be denied for HP.
3. CNG-03: WHEN the slot key goes up during the charge THEN the module SHALL call `fireBeam` in the same frame with the origin of the Assumptions table, the facing, the player HP, the held time, the targets of TC2-12 (box, HP and max HP) and the wall probe.
4. CNG-04: IF `fireBeam` refuses for HP THEN the energy SHALL be given back in the same frame, the HP SHALL not change, the cooldown SHALL not start and the system SHALL push `beamRefused:hp`.
5. CNG-05: WHEN `fireBeam` is accepted THEN the player SHALL lose exactly its `hpCost` with no hit reaction, no cast cancel, no invulnerability, no damage number, no reset of the Fúria, the Cadência or the combo counter and no damage signal to the recovery, and the system SHALL push `beam:<hits>`.
6. CNG-06: WHEN the beam result lists hits THEN each beam and bend hit SHALL land as a normal hit of its damage plus its bite, and each shard SHALL land as a `micro` hit of its damage plus its bite.
7. CNG-07: IF the player is hit during the charge, the konbini opens, the player dies or the area changes THEN the cast SHALL be cancelled with no energy, no HP and no cooldown spent.
8. CNG-08: WHEN the beam fires THEN the view SHALL draw it from the origin to its end (the wall point, the last pierced target or 320 px) with the resolved width for 120 ms, each bend as a segment from its `from` to its `to`, and the Supernova burst as a ring of the resolved radius at the beam end, registered in the `FxRegistry`.
9. CNG-09: WHILE the Convergência charges the player's hand SHALL glow red and its slot icon SHALL show a ring filled by `chargeMul(stats, heldMs)` from 0.5 to 1.
10. CNG-10: The debug snapshot SHALL report `techState.convergencia` as `{ charging, heldMs, chargeMul }`, or `null` when the technique is not equipped.
11. CNG-11: The Convergência views SHALL be checked in the game in HD, in motion, facing both sides, against a line of common enemies, against a wall and against the boss.

**Independent Test**: `convergence.smoke.mjs` com `seed=1&maxAlive=3&tech=convergencia`: segurar 600 ms e soltar gasta
20 de energia e 6 de vida e acerta 2 comuns em fila (`beam:2`); com a vida em 7 o aperto passa e a soltura deixa 1;
com a vida em 6 o aperto sai `techDenied:hp`; tocar e soltar dá metade do dano (`damageNumbers.last`).

---

### P1: Cães Divinos no jogo ⭐ MVP

**User Story**: Como jogador, quero soltar os cães da sombra numa investida rasteira que morde e prende o primeiro
inimigo do caminho e some, para cortar o ataque de quem vem antes que ele chegue, sem largar o corpo a corpo.

**Why P1**: É a técnica de investida da leva; os cães só correm por 1,2 s depois da tecla e não escolhem alvo. A
identidade dela é a prisão à distância (desde o Nv 1, ver "Prisão dos Cães"), não o dano: a Convergência é a linha
que fura, o Trovão é o golpe que conduz e a Erupção é a zona longe do corpo.

**Acceptance Criteria**:

1. DOG-01: WHEN the Cães cast reaches `release` THEN the module SHALL call `summonDogs` with the player feet point and the facing, and SHALL call `DogPack.update` every frame with the targets of TC2-12 until `done`.
2. DOG-02: WHEN `update` returns a `bite` THEN its target SHALL take one `micro` hit of its damage plus its bite, and WHEN its `rootMs` is above 0 THEN a common target SHALL enter the `stunned` state of BWG-04 for `rootMs` and the boss SHALL be stunned through `bossBrain.stun(rootMs, 'tech')`.
3. DOG-03: WHEN `update` returns a `leap` THEN the view SHALL move that dog or wolf along an arc from `from` to `to`, and WHEN it returns `gone` THEN the view SHALL play the shadow vanish frame at `at` and remove the dog.
4. DOG-04: WHILE dogs live the view SHALL draw each entry of `DogPack.view` with the HD sheet `dogs` (run frames for `run`, bite frame for `latched`) flipped by `dir`, the Totalidade wolf at scale 1.5, on the ground line, registered in the `FxRegistry`.
5. DOG-05: The `techObjects` SHALL list each live dog as `{ tech: 'caes', kind: 'dog' }` and the wolf as `{ tech: 'caes', kind: 'wolf' }`, and the debug snapshot SHALL report `techState.caes` as `{ dogs: { id, state }[] }` or `null`.
6. DOG-06: The sheet `dogs` SHALL have 6 frames drawn in code in `src/game/art/hd/` (4 run, 1 bite, 1 vanish) with a black silhouette and white eyes, and SHALL be reviewed on a board of `tools/hd-boards.mjs` before the commit.
7. DOG-07: The Cães views SHALL be checked in the game in HD, in motion, facing both sides, with Matilha going both ways and the Totalidade wolf leaping over 3 targets.

**Independent Test**: `divine-dogs.smoke.mjs` com `seed=1&maxAlive=2&tech=caes`: a conjuração gasta 24 de energia, os
2 cães saem, o comum à frente toma mordida micro (sem `hitstun`), fica com `stunnedMs` perto de 200 e perde o ataque
que preparava, e os cães somem antes de 1200 ms; com `axes=caes.prisao:3` o comum fica com `stunnedMs` perto de 600;
com `ramo=caes:b` um cão corre para trás.

---

### P1: Punho de Trovão no jogo ⭐ MVP

**User Story**: Como jogador, quero carregar o punho e ver os próximos golpes do meu moveset soltarem raio em
cadeia, para a técnica somar ao corpo a corpo em vez de trocar por ele.

**Why P1**: É a única técnica que não ataca sozinha: ela muda o golpe que já existe.

**Acceptance Criteria**:

1. RAI-01: WHEN the Trovão cast reaches `release` THEN the module SHALL call `ThunderFist.cast`, the charges SHALL be the resolved maximum, the window SHALL be 8000 ms, and a recast SHALL refill the charges and the window without stacking.
2. RAI-02: WHEN a moveset strike of the player hits a target (Contra, finisher and imbued weapon strikes included) THEN the module SHALL call `onStrike` once per target with the hit `swingId`, the strength and the targets of TC2-12, and a world object hit, a technique hit or a `TechEmitter` emission SHALL never call it.
3. RAI-03: WHEN `onStrike` returns a discharge THEN each bolt hit SHALL land as a `micro` hit of its damage plus its bite with a hitstop of 18 ms per hop inside the micro cap of POW-03, its stun SHALL put a common target in the `stunned` state of BWG-04 and SHALL stun the boss through `bossBrain.stun(ms, 'tech')`, and the system SHALL push `bolt:<hops>`.
4. RAI-04: WHEN the discharge has a column THEN each column hit SHALL land as a `micro` hit of its damage when `knockdown` is false, and as a normal hit of its damage plus its bite with `knockdown: true` on a common target (no knockdown on the boss) when `knockdown` is true.
5. RAI-05: The module SHALL call `ThunderFist.update` every frame, and WHEN the window ends THEN the charges left SHALL be 0 with no bolt.
6. RAI-06: WHILE the Trovão has charges its slot icon SHALL show the charges left as a number in its top left corner and the player's fists SHALL crackle with blue zigzag lines, and WHEN the charges reach 0 THEN both SHALL stop.
7. RAI-07: WHEN a bolt jumps THEN the view SHALL draw a blue zigzag line from its `from` to its `to` for 120 ms, and WHEN a column fires THEN it SHALL draw a vertical bolt at its `x` from the top of the view to the ground for 150 ms, registered in the `FxRegistry`.
8. RAI-08: The debug snapshot SHALL report `techState.trovao` as `{ charges, maxCharges, windowLeftMs }` or `null`.
9. RAI-09: The Trovão views SHALL be checked in the game in HD, in motion, facing both sides, with a chain over 3 common enemies and a Tempestade column on the boss.

**Independent Test**: `thunder-fist.smoke.mjs` com `seed=1&maxAlive=3&tech=trovao`: a conjuração gasta 30 de energia,
3 jabs que acertam soltam 3 raios (`bolt:*`) e o 4º jab não solta; um golpe que erra não gasta carga; com os comuns a
menos de 120 px o raio salta 2 vezes.

---

### P1: Erupção no jogo ⭐ MVP

**User Story**: Como jogador, quero fazer o chão cuspir pilares de fogo à minha frente, para segurar a fila que vem
na minha direção.

**Why P1**: A regra pura está pronta e a tarefa a pôs na leva; é a técnica de zona à frente. O que a separa da
Convergência (as duas acertam a linha da frente): o 1º pilar nasce a 80 px e não acerta quem está colado, sobe com
aviso no chão (o jogador posiciona antes, não mira na hora), não custa vida e deixa fogo (queima, lava) onde caiu;
a Convergência sai na hora, da boca do player, e paga com vida.

**Acceptance Criteria**:

1. ERP-01: WHEN the Erupção cast starts its sign THEN the module SHALL call `erupt` with the player feet point and the facing, the view SHALL draw a glowing ground mark at each pillar position for the sign time, and the module SHALL call `EruptionCast.update` every frame with the targets of TC2-12 until `done`.
2. ERP-02: WHEN `update` returns a `pillar`, `meteor` or `caldeira` event THEN each hit SHALL land as a normal hit of its damage plus its bite, with `knockdown: true` on a common target when the hit has `knockdown`.
3. ERP-03: WHEN `update` returns a `shard` THEN each hit SHALL land as a `micro` hit, and WHEN it returns a `burn` or a `lava` event THEN each hit SHALL land as a `chip` hit.
4. ERP-04: WHEN a pillar rises THEN the view SHALL draw a fire column of 32 px width and the resolved height from the ground for 300 ms, WHEN a meteor falls THEN it SHALL draw the meteor falling for 400 ms and a ring of 56 px at its impact, and WHILE a lava pool lives it SHALL draw 64 px of lava on the ground, all registered in the `FxRegistry`.
5. ERP-05: The `techObjects` SHALL list each lava pool as `{ tech: 'erupcao', kind: 'lava' }` and each falling meteor as `{ tech: 'erupcao', kind: 'meteor' }`, and the debug snapshot SHALL report `techState.erupcao` as `{ pending, lava }` or `null`.
6. ERP-06: The Erupção views SHALL be checked in the game in HD, in motion, facing both sides, with 4 eruptions in a row, the Meteoro and the Lago de Lava.

**Independent Test**: `eruption.smoke.mjs` com `seed=1&maxAlive=2&tech=erupcao`: a conjuração gasta 30 de energia e o
comum a 80 px toma 24 (número de técnica) e o comum colado (centro a 30 px) não toma nada; com
`axes=erupcao.queima:3` o mesmo comum toma números chip cinza por até 2 s; com `ramo=erupcao:b` a lava aparece no
`techObjects`.

---

### P1: Cinco ícones HD novos ⭐ MVP

**User Story**: Como jogador, quero ver o desenho de cada técnica nova e do Vazio no slot, na carta e na chamada,
como as outras.

**Why P1**: Sem ícone a carta da técnica nova sai em branco (ICO-03).

**Acceptance Criteria**:

1. IC2-01: `TECH_ICON_IDS` SHALL gain `convergencia`, `caes`, `trovao`, `erupcao` and `vazio`, each with a recipe in `src/game/art/hd/icons/leva2Art.ts` drawn in code with the plate and the `ICON_COLORS` of the existing recipes, in both native sizes (48 and 24).
2. IC2-02: WHEN `techIconSheet(48)` and `techIconSheet(24)` are built THEN each new frame SHALL have its own id as name, SHALL use only `ICON_COLORS` indices, and SHALL differ from every other frame of the same sheet.
3. IC2-03: The four technique icons SHALL appear in the `EnergyHud` slot, the shop card, the flight to the slot and the callout exactly as ICO-02 to ICO-05 say, read from `TechDef.icon`.
4. IC2-04: The five new icons SHALL be drawn on the board of `tools/icon-boards.mjs` next to the existing 11 and reviewed there, and SHALL then be checked in the game in HD on the slot, the card and the callout.
5. IC2-05: WHILE the player owns the Vazio Ilimitado the domain bar and the domain level card SHALL show the frame `vazio` of `TEX.techIconsSmall` as ICO-08 says.

**Independent Test**: `tests/game/art/techIcons.test.ts` estendido (16 quadros, ids, índices e quadros distintos);
teste do adaptador (L-043) com a Convergência no slot 0: `setTexture('tech-icons')` e `setFrame('convergencia')`.

---

### P1: Vazio Ilimitado paralisa o grupo ⭐ MVP

**User Story**: Como jogador, quero abrir o Vazio e ver todo comum à minha volta parar no lugar, para bater com
crítico em quem não se defende.

**Why P1**: É o Domínio da leva 2 e o único de controle; o Baú do Véu passa a ter 4 opções.

**Acceptance Criteria**:

1. VAZ-01: `data/domains` SHALL gain the domain `vazio` named "Vazio Ilimitado", with activation radius 320 px at every level, activation fractions 0.40 (common), 0.20 (elite) and 0.06 (boss), common paralysis 2500 ms at level 1 and 3500 ms at levels 2 and 3, and boss paralysis 300 ms at levels 1 and 2 and 600 ms at level 3.
2. VAZ-02: WHEN the Baú do Véu page opens THEN it SHALL show two different domains drawn among `santuario`, `jackpot`, `amplificacao` and `vazio` by the `chestRng` stream, and the same seed SHALL draw the same two.
3. VAZ-03: WHEN the Vazio activates THEN the activation hit of DOM-08 SHALL land first, every common enemy still alive within 320 px of the player center SHALL then enter the `stunned` state of BWG-04 for the common paralysis of the level, the live boss within 320 px SHALL be stunned through `bossBrain.stun(ms, 'tech')` for the boss paralysis without arming the finisher, and the system SHALL push `vazio:<paralyzed count>`.
4. VAZ-04: WHILE the Vazio is active, WHEN a moveset strike or a world object hit of the player lands on a target paralyzed by this activation THEN the hit SHALL be a critical hit ×1.5 under the largest-critical rule of TAL-16, and its damage number SHALL show the `crit` kind.
5. VAZ-05: The Vazio SHALL stay active for the common paralysis time of its level and SHALL end with `domainEnd:vazio`; a target that enters the radius after the activation SHALL not be paralyzed, and a paralyzed target SHALL stay paralyzed until its own timer ends even IF the domain ends first.
6. VAZ-06: WHILE the Vazio is active the `DomainFx` SHALL draw a starfield vignette with colors of the `PALETTE` and fade it out within 300 ms after the end, and WHILE a target is paralyzed by it the view SHALL draw a ring of stars over the target's drawn position.
7. VAZ-07: The Vazio SHALL rise to levels 2 and 3 through the boss chest and the `dominio` card exactly as DNV-01 to DNV-05 say.
8. VAZ-08: WHEN the run starts with `?debug&domain=vazio[:<level>]` THEN the player SHALL own the Vazio at that level, and the debug snapshot `domain.active` SHALL report `paralyzed: number[]` with the ids still paralyzed by it.
9. VAZ-09: The Vazio views SHALL be checked in the game in HD, in motion, facing both sides, with a group of common enemies and the boss in the radius.

**Independent Test**: `void-domain.smoke.mjs` com `seed=1&maxAlive=3&domain=vazio&charge=100`: `P` tira 40% do HP de
cada comum no raio, os sobreviventes ficam com `stunnedMs` perto de 2500 e não atacam, e um jab num paralisado sai com
número `crit` e 1,5 × o dano; `tests/core/domainVazio.test.ts` com as bordas 320/321 px e 2499/2500 ms.

---

### P1: Talentos da leva 2 ⭐ MVP

**User Story**: Como jogador, quero 5 talentos novos que reagem ao recuo, à postura do chefe, à Reversa, ao parry e
ao custo das técnicas, cada um mudando de cara a cada nível.

**Why P1**: São os talentos que o pool da F35 deixou aberto para a leva 2.

**Acceptance Criteria**:

1. TLV-01: `src/data/perks.ts` SHALL gain the talents `maoDeFerro` (Mão de Ferro), `ossoDuro` (Osso Duro), `reversaRefinada` (Reversa Refinada), `dominioSimples` (Domínio Simples) and `seisOlhos` (Seis Olhos), each with the affinity of the Assumptions table, one value per level and one card text per level, appended at the end of `GAME_SHOP_CATALOG` and offered from the round 2 shop with the level cards of TAL-04.
2. TLV-02: WHEN a moveset strike opens its hitbox THEN its `force` SHALL be multiplied by 1.2, 1.4 or 1.6 for Mão de Ferro at level 1, 2 or 3, after the power `forceMul` and the Corpo Peso, through `buildEffects` and `Player.strikeMods`.
3. TLV-03: WHILE Mão de Ferro is at level 2 or more, WHEN a common enemy slides from a player strike THEN a dust trail SHALL follow it for the slide, and WHEN it touches a world object lying on the ground during the slide THEN that object SHALL break as a broken object breaks today.
4. TLV-04: WHILE Mão de Ferro is at level 3, WHEN a common enemy pushed by a player strike touches a terrain wall or a solid world module during the push THEN it SHALL take one normal hit of `round(15 × hpMul)` once per push and SHALL follow the F30 wall rule (VRM-16).
5. TLV-05: WHEN a player hit deals poise damage to the boss THEN the poise damage SHALL be multiplied by 1.25, 1.5 or 1.75 for Osso Duro at level 1, 2 or 3.
6. TLV-06: The system SHALL draw, in a class apart from `src/game/Hud.ts`, a poise bar right below the boss bar during every boss fight, filled by `poise / poise max`, and WHILE Osso Duro is at level 2 or more it SHALL draw 1, 2 or 3 cracks on it once the poise is at or below 75%, 50% or 25% of its max, cleared when the poise refills.
7. TLV-07: WHILE Osso Duro is at level 3, WHEN the boss poise reaches 0 THEN the boss SHALL stay in `stagger` for 1.5 times `staggerMs`, drawn lying (its stagger frame rotated 90° backwards), with the finisher armed as today, and the system SHALL push `bossDown`.
8. TLV-08: WHEN the Reverse Cursed Energy heals THEN the heal SHALL be multiplied by 1.25, 1.5 or 1.75 for Reversa Refinada at level 1, 2 or 3 through `buildEffects`, with the energy spent per frame unchanged.
9. TLV-09: WHILE Reversa Refinada is at level 2 or more, WHEN the Reverse Cursed Energy shows its heal text THEN it SHALL be a green `heal` number and the player HP bar SHALL glow for 400 ms.
10. TLV-10: WHILE Reversa Refinada is at level 3 and the player channels the Reverse Cursed Energy, the player SHALL be able to walk at 40% of the walk speed, and a strike, a cast or a dodge SHALL still end the channel as today.
11. TLV-11: The parry window SHALL grow by 20, 30 or 40 ms for Domínio Simples at level 1, 2 or 3, through `buildEffects`.
12. TLV-12: WHILE Domínio Simples is at level 2 or more and the guard is held, a Simple Domain circle of 24 px radius SHALL be drawn on the ground under the player.
13. TLV-13: WHILE Domínio Simples is at level 3, WHEN a `parry` or `deflect` happens against a living enemy or boss attack THEN the `TechEmitter` source `iai` SHALL emit one `micro` hit of `round(20 × hpMul)` on that attacker, drawn with `CutFx.cut`, and the system SHALL push `iai:<targetId>`.
14. TLV-14: The technique energy cost SHALL be multiplied by 0.92, 0.85 or 0.78 for Seis Olhos at level 1, 2 or 3, inside `buildEffects` and under its 60% floor.
15. TLV-15: WHILE Seis Olhos is owned the weak point SHALL be the living common enemy or boss nearest to the player center among the targets of TC2-12, re-picked every 500 ms, and WHILE it is at level 2 or more the weak point SHALL be drawn as a blue eye mark over that target.
16. TLV-16: WHILE Seis Olhos is at level 3, WHEN a non-chip technique hit lands on the weak point THEN it SHALL be a critical hit ×1.5, and the player SHALL gain 10 energy at most once every 6000 ms.
17. TLV-17: The TAL-16 rule SHALL keep "a technique hit and the Kokusen SHALL never be critical" except for TLV-16 and EVL-06, and the Kokusen SHALL never be critical.
18. TLV-18: The event `talent:<id>` SHALL be emitted for Mão de Ferro on every heavy strike hit, an object broken by TLV-03 and a wall hit of TLV-04; for Osso Duro on every boss poise damage from a player hit and on the poise break; for Reversa Refinada on every heal text; for Domínio Simples on every `parry` or `deflect`; for Seis Olhos on every cast reaching `release` and every TLV-16 critical hit.
19. TLV-19: The icons of the 5 talents SHALL be drawn in code in `src/game/art/hd/talentIcons.ts`, 16×16 texels, with palette colors only, and SHALL be reviewed on a board before the commit.
20. TLV-20: The debug snapshot SHALL report `boss.poiseBar: { value, max, cracks }` during a boss fight and `build.weakPoint` as the target id or `null`, and `perks=` SHALL accept the 5 new ids as POL-10 says.
21. TLV-21: The signs of the 5 talents SHALL be checked in the game in HD, in motion and facing both sides.

**Independent Test**: `tests/core/buildEffectsLeva2.test.ts` (níveis 1 a 3 de cada talento, piso de custo do Seis
Olhos com as bordas da L-010, janela de parry 150/170/180/190); `talents-2.smoke.mjs` com `perks=maoDeFerro:3` (comum
contra a parede toma o acerto e fica no chão) e `perks=seisOlhos:2` (marca no comum mais perto).

---

### P2: Osso de Dragão, a arma que carrega com a defesa

**User Story**: Como jogador lutador, quero uma arma que guarda o que eu aparo e apanho e solta tudo no próximo
golpe forte, para transformar a defesa em ataque.

**Why P2**: É a 4ª arma imbuída; a build de arma já existe com três.

**Acceptance Criteria**:

1. OSS-01: `ARSENAL` SHALL gain the weapon `osso` named "Osso de Dragão", build `lutador`, appended at the end of `GAME_SHOP_CATALOG`, sold with the prices, round locks and card of WSH-02 to WSH-04.
2. OSS-02: The Osso axes SHALL be `cargas`, `soltura` and `estopim`, in this table order, under the caps of WPN-01, and its `meleeMul` trait SHALL be the `heavy` moveset strike without `counter` (×1.2, WPN-03).
3. OSS-03: WHILE the Osso is equipped, WHEN a `parry` or `deflect` happens or the player loses HP to a hit that was not defended (guard chip and vow costs do not count) THEN the Osso SHALL gain 1 charge up to 3, 4 or 5 for 0, 1 or 2 `cargas` points, and the system SHALL push `ossoCharge:<charges>`.
4. OSS-04: WHEN a `heavy` moveset strike without `counter` hits with at least 1 charge THEN every target of that strike SHALL take its damage times `1 + k × (0.25 + 0.25 × soltura)`, where `k` is the charges spent, or the charges + 1 WHEN the charges are at the cap (full release, which SHALL also force the impact tier to `decisive`), the charges SHALL become 0 once for that strike, the Osso impact (`weapon-fx-osso-impact`) SHALL play, and the system SHALL push `ossoRelease:<charges>`.
5. OSS-05: WHILE the Osso has 1 or 2 `estopim` points, WHEN a release hits THEN every other living common enemy whose center is within 60 or 90 px of the struck target center SHALL take one normal hit of `round(3 × charges × hpMul)` with `knockdown: true`, and the boss SHALL take none.
6. OSS-06: The Osso charges SHALL carry over between rounds and SHALL reset to 0 on a release, on the run reset and when the Osso is abandoned.
7. OSS-07: WHILE the Osso has charges the marker `weapon-fx-osso-charge` SHALL show the frame `charge-<charges>a` and `charge-<charges>b` alternating every 150 ms above the player's head, and WHILE it has none the marker SHALL be hidden; the marker SHALL have frames for 0 to 5 charges.
8. OSS-08: WHEN the release strike is the trait strike THEN the Osso trail and impact SHALL follow WFX-01 to WFX-04.
9. OSS-09: The weapon recipe Osso + talent Refluxo (any level) SHALL give `dragaoRefletido` (Dragão Refletido) under WEV-01 to WEV-04.
10. OSS-10: WHILE the Dragão Refletido is on, WHEN a `parry` or `deflect` happens against a living attacker with the charges at the cap THEN that parry SHALL add no charge, the attacker SHALL take at once one hit of the `contra` move damage times `meleeMul` times the full release multiplier of OSS-04, with the Estopim of OSS-05, the charges SHALL become 0, and the system SHALL push `ossoRelease:<charges>`; below the cap the parry SHALL only add its charge (OSS-03).
11. OSS-11: The `BuildBar` icon of the Osso SHALL be a new sheet `bound-bone` in `src/game/art/hd/weapons.ts`, drawn with `PALETTE` keys only and reviewed on a board.
12. OSS-12: WHEN the run starts with `?debug&arsenal=osso`, `axes=osso.<axis>:<n>` or `evo=dragaoRefletido` THEN the system SHALL apply them as WDB-01 to WDB-03 say, and the snapshot `arsenal` SHALL report `weaponCharges`.
13. OSS-13: In `tests/data/weaponBalance.test.ts` the Osso SHALL meet WPN-05 under the reference model with one charge gained every 5000 ms, both when every charge is spent on the next heavy strike and when the charges are kept until the cap, for each `cargas` point from 0 to 2.
14. OSS-14: The Osso marker, trail, impact and the Dragão Refletido release SHALL be checked in the game in HD, in motion, facing both sides.

**Independent Test**: `dragon-bone.smoke.mjs` com `arsenal=osso`: 2 parries dão `ossoCharge:2`, o golpe forte seguinte
sai com `ossoRelease:2` e 1,5 × o dano, e o marcador some; 3 parries (teto 3) e o forte saem com 2 × o dano (soltura
cheia, `k` = 4) e patamar `decisive`; `tests/core/dragonBone.test.ts` com o teto 3/4/5, a soltura com 2 e com 3
cargas no teto 3, e o raio 60/61 px do Estopim.

---

### P2: Dedos de Sukuna, a relíquia de aposta

**User Story**: Como jogador, quero apostar a minha vida em mais dano, dedo a dedo, sabendo que cada dedo chama o
chefe Portador, que é o único que dá o 4º e o 5º.

**Why P2**: É a relíquia de risco da leva; as três relíquias de hoje continuam.

**Acceptance Criteria**:

1. DED-01: `ARSENAL` SHALL gain the relic `dedos` named "Dedos de Sukuna", build `lutador`, with max level 5, appended at the end of `GAME_SHOP_CATALOG`, taking the relic slot.
2. DED-02: The shop SHALL offer the Dedos at levels 1 to 3, priced 20 for the first and `16 + 6 × fingers held` for the next (22 and 28), before inflation, with the relic round locks of `ARSENAL_TUNING` (rounds 2, 4, 6), and SHALL never offer level 4 or 5.
3. DED-03: WHILE the player holds `n` Dedos, `buildEffects` SHALL multiply the melee damage and the technique damage by `1 + 0.06 × n` and the damage taken by `1 + 0.08 × n` (1.30 and 1.40 at 5), and no code SHALL write `damageMul`, `vowDamageMul` nor `damageTakenMul` for the Dedos directly; and in `tests/data/relicBalance.test.ts`, at level 3, the Dedos damage multiplier on a half-melee half-technique model SHALL be above both the Manoplas and the Rosário, and below the Manoplas on an all-melee model and below the Rosário on an all-technique model.
4. DED-04: WHEN the lineup of a boss round from r10 on is asked for the first time THEN the Finger Bearer chance SHALL be `0.10 + 0.08 × n` with the Dedos held at that moment, the draw SHALL consume the `bossAffixRng` stream exactly as with no Dedos, and before r10 the chance SHALL stay 0.
5. DED-05: WHEN a Finger Bearer boss is defeated while the player holds the Dedos at level 3 or 4 THEN the Dedos SHALL rise one level at the victory with the banner `Dedo de Sukuna <n>/5` and the event `finger:<n>`, and IF the player holds no Dedos or holds them below level 3 THEN the victory SHALL give no finger.
6. DED-06: WHILE the player holds 3 or more Dedos the build aura (AUR-03) SHALL be drawn in red and black palette colors, at stage 1 at least.
7. DED-07: The `BuildBar` SHALL show `Relíquia Nv<n>` with 5 dots for the Dedos and a finger icon drawn in code in HD, and the Dedos card SHALL read the damage and damage taken change of the level it gives and the Finger Bearer chance from r10 with that level (`0.10 + 0.08 × n`, as a percent).
8. DED-08: WHEN the Dedos are abandoned THEN the refund SHALL follow ABD-02 with the 4th and 5th fingers as free sources, and the multipliers and the Finger Bearer chance SHALL return to the values without Dedos.
9. DED-09: WHEN the run starts with `?debug&arsenal=dedos` repeated up to 5 times THEN the Dedos SHALL start at that level, and the snapshot `arsenal.relicLevel` SHALL report 1 to 5.

**Independent Test**: `tests/core/buildEffectsLeva2.test.ts` (Dedos 0 a 5); `tests/data/relicBalance.test.ts` (Nv 3:
1,18 contra 1,15 na build mista, contra 1,30 na pura); `tests/core/bossLineupFingers.test.ts`
(chance com 0 e 3 dedos na r10 e na r9, mesmo consumo do stream); `sukuna-fingers.smoke.mjs` com
`arsenal=dedos,dedos,dedos&finger=1` na r10: a vitória dá `finger:4`.

---

### P2: Afixos da leva 2 no chefe

**User Story**: Como jogador, quero chefes que encadeiam ataques, aguentam mais postura, escondem a vida atrás de um
escudo ou vestem camadas que só a jogada certa quebra, para cada chefe pedir um jeito diferente de lutar.

**Why P2**: O chefe da F32 já varia; os afixos da leva 2 só aumentam o leque a partir da r10.

**Acceptance Criteria**:

1. AF2-01: `src/data/bossAffixes.ts` SHALL gain the affixes `enfurecido`, `couraca`, `sobrecarregado` and `pele`, with the names of the Assumptions table in both genders, their outline and glyph colors from the `PALETTE` and their numbers, all in the full pool and none in the light pool.
2. AF2-02: The incompatible pairs of `data/bossAffixes.ts` SHALL be `adaptativo` with `pele` and `couraca` with `sobrecarregado`, and over 1000 seeds at tier 5 no lineup SHALL hold both affixes of a pair (BLN-07).
3. AF2-03: The tuning derived from the lineup (AFX-01) SHALL apply the four new affixes through the pure function of `src/core/`, with no `phaser` import.
4. AF2-04: WHERE the boss has Enfurecido, Couraça or Pele de Dragão its sprite SHALL have the 1 px outline of that affix (red, grey and the Pele ramp of PDR-03), and WHERE it has two or more outline affixes (the F32 ones included) the outline SHALL alternate between them every 600 ms.
5. AF2-05: WHILE the Arsenal de Toji suspends the affixes (WEV-07), Enfurecido SHALL use the normal cycle and rest, Couraça the normal poise max and regen (the current poise capped at the normal max), Sobrecarregado SHALL neither regenerate nor absorb with its shield, and Pele de Dragão SHALL not reduce damage while keeping its layers.
6. AF2-06: WHEN the run starts with `?debug&bossAffix=` naming `enfurecido`, `couraca`, `sobrecarregado` or `pele` THEN the lineup SHALL use them as BLN-09 says, and the boss bar label, the glyphs and the shop announcement SHALL show them (BRD-01, BRD-02, BRD-04).
7. ENF-01: WHERE the boss has Enfurecido the rest after each attack SHALL be `restMs × 0.8` of its phase, never below `minRestMs`.
8. ENF-02: WHERE the boss has Enfurecido, WHEN a phase cycle starts its 3rd, 6th, 9th... pass THEN the second attack of that pass SHALL start right after the first ends, with no rest, and the pass count SHALL restart at each phase change.
9. COU-01: WHERE the boss has Couraça its poise max SHALL be 1.5 times the tier poise max and its poise regen per second 2 times the tier regen, with the regen delay unchanged.
10. SOB-01: WHERE the boss has Sobrecarregado its max HP SHALL be `round(0.6 × the max HP it would have)` and it SHALL start with a shield of `round(0.4 × the max HP it would have)`.
11. SOB-02: WHILE the Sobrecarregado shield is above 0, every damage the boss takes SHALL go to the shield first and only the rest to its HP, and the poise damage SHALL not change.
12. SOB-03: WHEN 3000 ms pass with no damage to the boss THEN the shield SHALL regenerate 10% of its max per second up to its max, and WHEN the shield reaches 0 THEN the system SHALL push `shieldBreak`.
13. SOB-04: WHILE the boss has Sobrecarregado, a blue shield segment SHALL be drawn on the boss bar after the HP fill, in a class apart from `src/game/Hud.ts`, and the debug snapshot SHALL report `boss.shield: { value, max }`.
14. PDR-01: WHERE the boss has Pele de Dragão it SHALL start with 3 layers, and WHILE it has layers every damage it takes SHALL be multiplied by `1 − 0.15 × layers` (rounded, at least 1).
15. PDR-02: WHEN the boss takes a Kokusen, a Contra hit, a finisher hit, a poise break, a heavy moveset strike with power tier 2 or more, or the first non-chip hit of a cast whose Despertar is on THEN one layer SHALL break before that hit's damage, at most one per hit, and the system SHALL push `layerBreak:<layers left>`; the layers SHALL never come back.
16. PDR-03: WHILE the boss has Pele de Dragão layers its outline SHALL take one of 3 ramp colors by the layers left, and WHEN the last layer breaks THEN the Pele outline SHALL go away.
17. PDR-04: The debug snapshot SHALL report `boss.layers` (0 when the boss has no Pele de Dragão).
18. AF2-07: The four affixes SHALL be checked in the game in HD against a boss with each one forced by `bossAffix=`.

**Independent Test**: `tests/core/bossAffixLeva2.test.ts` (descanso 0,8 com o piso, 3ª volta sem descanso, postura
1,5 e regeneração 2×, escudo 60/40 com 2999/3000 ms, camadas 3 → 0 com cada fonte, pares incompatíveis em 1000 seeds);
`boss-affix-2.smoke.mjs` com `bossAffix=pele` (Kokusen quebra uma camada) e `bossAffix=sobrecarregado` (escudo antes
da vida).

---

### P2: Duos

**User Story**: Como jogador, quero cartas raras que juntam duas peças da minha build num efeito que nenhuma faz
sozinha, sem gastar vaga, para caçar combinações como no Vampire Survivors.

**Why P2**: São a camada de combo da leva 2; a run joga sem eles.

**Acceptance Criteria**:

1. DUO-01: The recipe list of the F37 SHALL gain the 6 Duos with kind `duo`: `trocaExplosiva` (Boogie + Vermelho), `pregoRubro` (Ressonância + Vermelho), `contraAmaldicoado` (talent Contra Afiado + any technique at level 3 or more), `sombraNoContra` (Cães + talent Contra Afiado), `ordemEletrica` (Fala + Trovão) and `impactoEletrico` (Trovão + Divergente), every piece at any level unless written otherwise.
2. DUO-02: Each Duo SHALL be a rare shop entry of kind `duo` appended at the end of `GAME_SHOP_CATALOG`, priced 40 before inflation, taking no pool vacancy and paying no pool surcharge, eligible only in the weighted draw of cards 2 and 3 while its recipe is ready, it is not owned and fewer than 4 Duos are owned in the run.
3. DUO-03: IF 4 Duos are owned in the run THEN no Duo card SHALL be offered, and IF a Duo purchase is asked anyway THEN the shop SHALL refuse it with `buyDenied:duo` and spend no fragment.
4. DUO-04: WHEN a Duo is bought THEN the system SHALL push `duo:<id>`, the debug snapshot SHALL list it in `build.duos`, and the `BuildBar` text SHALL end with ` · Duos <n>/4` WHILE at least one Duo is owned.
5. DUO-05: WHILE a piece of an owned Duo is missing (abandoned) the Duo effect SHALL be off, and the Duo SHALL still count toward the 4 of the run.
6. DUO-06: WHILE Troca Explosiva is on, WHEN the Boogie swaps the player with a live Vermelho orb THEN the orb SHALL detonate at once at its new position (where the player was), with its resolved detonation.
7. DUO-07: WHILE Prego Rubro is on, WHEN a live Vermelho orb overlaps a target with Ressonância marks THEN the marks of that target SHALL detonate at once as the second touch detonates them, only on that target, and the orb detonation radius SHALL grow by the resolved Ressonância propagation radius, at least 24 px, once per orb.
8. DUO-08: Every `TechModule` SHALL declare its main damage resolved from its `TechStats` as listed in the Assumptions table.
9. DUO-09: WHILE Contra Amaldiçoado is on, WHEN a perfect Contra hits and 6000 ms passed since the last time this rule fired THEN the `TechEmitter` source `contraAmaldicoado` SHALL emit on the Contra target one `micro` hit of 50% of the main damage of the technique in the first slot (0, 1, 2) holding a technique at level 3 or more, or, for a technique with main damage 0, its stun or daze for 50% of its resolved time, with no energy spent and no cast.
10. DUO-10: WHILE Sombra no Contra is on, WHEN a perfect Contra hits THEN the `TechEmitter` source `sombra` SHALL emit on the same target one `micro` hit of the resolved Cães bite damage, drawn as a dog biting from the target's shadow, and SHALL root the target for `max(resolved Cães root, 300 ms)`: a common target in the `stunned` state of BWG-04, the boss through `bossBrain.stun(ms × 0.25, 'tech')`.
11. DUO-11: WHILE Ordem Elétrica is on, WHEN a Trovão discharge happens THEN, after its normal jumps, the bolt SHALL jump once to every living target stunned by a live `SpeechCast` among the targets of TC2-12, with no jump radius, each as a `micro` hit of the bolt damage.
12. DUO-12: WHILE Impacto Elétrico is on, WHEN the Divergente second impact hits a target THEN the `TechEmitter` source `impactoEletrico` SHALL emit one `micro` hit of the resolved Trovão bolt damage on each of the 2 nearest other living targets within the resolved Trovão jump radius of that target, drawn as blue zigzag lines, spending no Trovão charge.
13. DUO-13: WHEN the run starts with `?debug&duo=<id>[,<id>...]` THEN the system SHALL give each listed Duo whose recipe is ready after `tech=`, `perks=` and `axes=`, up to 4, and SHALL ignore the others.
14. DUO-14: The Duo names and texts SHALL enter `tests/data/combos.test.ts` and SHALL be unique against every Despertar, Evolução, União and Duo.

**Independent Test**: `tests/core/duos.test.ts` (receita pronta, teto de 4, peça faltando desliga, Contra Amaldiçoado no
1º slot com técnica no Nv 3); `duos.smoke.mjs` com `tech=caes&perks=contraAfiado&duo=sombraNoContra` (o Contra
perfeito deixa o alvo com `stunnedMs` perto de 300) e com
`tech=trovao,divergente&duo=impactoEletrico` (o 2º impacto salta para 2 comuns) e `tech=boogie,vermelho&duo=trocaExplosiva`
(o orbe detona onde o player estava).

---

### P3: Evoluções da leva 2

**User Story**: Como jogador que caça receitas, quero as três Evoluções da leva 2, para as técnicas e os talentos
novos também terem para onde ir.

**Why P3**: A F37 traz só as receitas da leva 1; estas pedem peças da F41.

**Acceptance Criteria**:

1. EVL-01: The recipe list of the F37 SHALL gain the evolutions `redeDeCortes` (Desmantelar at level 4 + domain Santuário), `sangueEterno` (Convergência at level 4 + talent Reversa Refinada) and `palavraNoPontoFraco` (Fala at level 4 + talent Seis Olhos), each catalyst at any level, offered by the F37 rules (all ready recipes in the boss chest, free, and in the shop at 60).
2. EVL-02: WHEN a technique evolves THEN it SHALL keep its slot, points, branch and Despertar, the evolution SHALL stay while the technique stays even IF the catalyst is abandoned later, and the system SHALL push `evolve:<id>` (with the `combo:<recipe>` of F37 CGL-03).
3. EVL-03: WHILE the Rede de Cortes is on, WHEN a Desmantelar cut lands THEN it SHALL leave a ground mark at the cut point for 6000 ms, at most 8 at a time with the oldest removed first.
4. EVL-04: WHILE the Rede de Cortes is on, WHEN the Santuário activates THEN every live mark SHALL detonate, hitting every target whose box is within 32 px of it with one hit of the resolved Desmantelar cut damage and the impact tier forced to `decisive`, and the marks SHALL be removed.
5. EVL-05: WHILE the Sangue Eterno is on, each beam SHALL leave a blood pool of 32 px centered under the player (the x of the `hurtRect` center, on the ground) for 4000 ms holding the HP paid, and WHEN the segment of a later beam from its origin to its end contains the center of a live pool THEN that beam SHALL absorb it, deal 1.5 times its damage and heal the player `round(held HP / 2)`; a beam fired from the spot where the pool was left, to either side, SHALL not absorb it.
6. EVL-06: WHILE the Palavra no Ponto Fraco is on, the Fala SHALL stun the Seis Olhos weak point within its range even outside its cone and its line of sight, and every non-chip hit on a target stunned by the Fala SHALL be a critical hit ×1.5, technique hits included.
7. EVL-07: The cut marks and the blood pools SHALL be drawn on the ground with `PALETTE` colors, listed in the `techObjects` as `kind: 'cutMark'` and `kind: 'blood'`, and checked in the game in HD.
8. EVL-08: WHEN the run starts with `?debug&evo=` naming one of the three THEN the technique SHALL evolve IF its recipe is ready after `tech=`, `domain=`, `perks=` and `axes=`, and the parameter SHALL be ignored otherwise.

**Independent Test**: `tests/core/evolutionsLeva2.test.ts` (8 marcas, 32/33 px, poça com custo 0 e 6, feixe do mesmo
lugar não bebe para nenhum dos lados, feixe de 20 px atrás bebe); `duos.smoke.mjs` estendido com `evo=sangueEterno`.

---

### P2: ドン no patamar 3

**User Story**: Como jogador com a força no máximo, quero ver o chão rachar e o ドン saltar quando o meu golpe forte
derruba, para sentir o peso do patamar 3.

**Why P2**: É o salto de sensação do patamar 3 que a F29 deixou para a leva 2; o jogo não tem áudio.

**Acceptance Criteria**:

1. DON-01: WHILE the power tier is 3, WHEN a heavy moveset strike of the player knocks a common enemy down, or breaks the boss poise with Osso Duro at level 3, THEN the system SHALL draw the ground crack and the ドン once for that strike and SHALL push `don`.
2. DON-02: The ground crack SHALL be drawn on the ground line under the target for 1500 ms, fading out over its last 300 ms.
3. DON-03: The ドン SHALL be an HD sprite drawn in code in `src/game/art/hd/onomatopoeia.ts` with `PALETTE` colors, rising 12 px from the hit point over 600 ms and fading out.
4. DON-04: The crack and the ドン SHALL count toward the `fxCap` of 40, and IF the cap is full THEN they SHALL be skipped while the hit still applies.
5. DON-05: IF the power tier is below 3 THEN no crack and no ドン SHALL be drawn.
6. DON-06: The ドン and the crack SHALL be reviewed on a board of `tools/hd-boards.mjs` and checked in the game in HD, facing both sides.

**Independent Test**: `power.smoke.mjs` estendido com `mods=forca:5&arsenal=manoplas,manoplas,manoplas`: o golpe forte
que derruba solta `don`; com `mods=forca:5` (patamar 2) não solta.

---

## Edge Cases

- WHEN the player HP equals the Convergência HP cost THEN the press SHALL be denied, and WHEN it is the cost + 1 THEN the cast SHALL pass and leave 1 HP (CNG-02, both sides tested).
- IF the slot key of the Convergência is still down when the konbini opens THEN the cast SHALL be cancelled with nothing spent, and the beam SHALL not fire on the first frame after the konbini closes.
- WHEN a dog's target dies mid-bite THEN the dog SHALL vanish, or leap with Matilha Faminta, as the pure rule says, and no bite SHALL land on the dead target.
- The dogs SHALL ignore walls (the pure rule has no probe): they run on the ground line and vanish at their range or at 1200 ms.
- WHEN one swing of the player hits 3 targets with a Trovão charge THEN only 1 charge SHALL be spent and only the first notified target SHALL release the bolt (TRV-04).
- IF the Trovão window ends while the player is mid-strike THEN that strike SHALL release no bolt.
- WHEN two Erupção pillars touch the same target THEN it SHALL take both hits, and its burn SHALL refresh, not stack.
- WHEN the Vazio activates with no target in the radius THEN the domain SHALL still run its time and push `vazio:0`.
- IF a target paralyzed by the Vazio is also stunned by the Fala THEN it SHALL keep the larger remaining stun.
- WHEN the boss with Sobrecarregado takes a hit bigger than its shield THEN the shield SHALL go to 0 and the rest SHALL go to its HP in the same hit.
- WHEN a Contra at power tier 2 hits the Pele de Dragão boss THEN only one layer SHALL break.
- IF the Dedos are at level 5 when a Finger Bearer is defeated THEN no finger SHALL be given and no banner SHALL show.
- WHEN the Osso has 5 charges and the player parries THEN the charges SHALL stay 5.
- WHEN the Osso has 2 charges with the cap at 3 and the heavy strike hits THEN the release SHALL use `k` = 2 (no full bonus), and WHEN it has 3 THEN `k` = 4 and the tier is `decisive` (OSS-04, both sides tested).
- WHILE the Dragão Refletido is on, WHEN the player parries below the cap THEN the parry SHALL add one charge and release nothing, and WHEN the parry comes at the cap THEN it SHALL release with no charge added first (OSS-10).
- WHEN the player holds Contra Afiado, a technique at level 1 in slot 0 and one at level 3 in slot 1 THEN the Contra Amaldiçoado SHALL release the slot 1 technique (DUO-09).
- IF the Seis Olhos weak point dies THEN the mark SHALL move at the next 500 ms pick.
- WHEN a Duo piece is abandoned and bought again THEN the Duo effect SHALL turn back on with no new Duo counted.
- WHEN the heavy strike knocks 2 common enemies down at tier 3 THEN only one ドン SHALL be drawn (DON-01).

---

## Implicit-Requirement Dimensions

| Dimension | Resolução |
| --- | --- |
| Input validation & bounds | TC2-06, VAZ-08, OSS-12, DED-09, AF2-06, DUO-13, EVL-08 (parâmetros inválidos ignorados); CNG-02 (vida contra o custo); TLV-14 (piso de custo); DUO-03 (teto de 4 Duos); DED-02 (Nv 4 e 5 fora da loja) |
| Failure / partial-failure states | CNG-04 e CNG-07 (recusa e cancelamento devolvem tudo no mesmo quadro); DON-04 (sem vaga no `fxCap` o desenho sai e o acerto fica); DUO-05 (peça faltando desliga o Duo) |
| Idempotency / retry / duplicate handling | RAI-02 e TRV-04 (uma carga por golpe), OSS-04 (uma soltura por golpe), PDR-02 (uma camada por acerto), DON-01 (um ドン por golpe), TC2-09 (um gatilho do Santuário por conjuração), TLV-04 (uma batida de parede por empurrão) |
| Auth boundaries & rate limits | Teto de 4 por fonte no `TechEmitter` para `iai`, `contraAmaldicoado`, `sombra` e `impactoEletrico` (EMI-03); DUO-09 (1 vez a cada 6 s); TLV-16 (energia 1 vez a cada 6 s); auth N/A porque é jogo local |
| Concurrency / ordering | VAZ-03 (acerto da ativação antes da paralisia), PDR-02 (camada quebra antes do dano), SOB-02 (escudo antes da vida), DUO-11 (saltos normais antes dos condutores) |
| Data lifecycle / expiry | TC2-11 (estado refeito na konbini e objetos removidos no fim da rodada), OSS-06 (cargas entre rodadas), VAZ-05 (paralisia pelo próprio relógio), EVL-03 e EVL-05 (marcas e poças com prazo), SOB-03 (regeneração do escudo) |
| Observability | CNG-10, DOG-05, RAI-08, ERP-05, VAZ-08, TLV-20, OSS-12, DED-09, SOB-04, PDR-04, DUO-04 (snapshot) e os eventos `beam`, `beamRefused`, `bolt`, `vazio`, `iai`, `bossDown`, `ossoCharge`, `ossoRelease`, `finger`, `shieldBreak`, `layerBreak`, `duo`, `combo`, `evolve`, `don`, `talent` |
| External-dependency failure | N/A porque não há dependência externa em jogo |
| State-transition integrity | CNG-01 (carga sem disparo automático), RAI-01 e RAI-05 (cargas e janela), TC2-05 (ramo uma vez no Nv 2, Despertar só com ramo), DED-05 (Nv 4 e 5 só pela vitória), PDR-02 (camadas não voltam), TLV-06 (trincas somem quando a postura volta) |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| LVX-01 | P1: A F41 respeita as regras de casa | Tasks (T32, T64, T84, T98, T121) | Pending |
| LVX-02 | P1: A F41 respeita as regras de casa | Tasks (T32, T37, T56, T64, T84, T98, T121) | Pending |
| LVX-03 | P1: A F41 respeita as regras de casa | Tasks (T37, T41, T49, T71, T94, T107, T121) | Pending |
| LVX-04 | P1: A F41 respeita as regras de casa | Tasks (T32, T64, T84, T98, T121) | Pending |
| LVX-05 | P1: A F41 respeita as regras de casa | Tasks (T1, T2, T5, T14, T20, T24, T29, T99, T121) | Pending |
| LVX-06 | P1: A F41 respeita as regras de casa | Tasks (T7, T11, T15, T19, T21, T25, T30, T32, T38, T43, T45, T62, T65, T66, T81, T89, T121) | Pending |
| LVX-07 | P1: A F41 respeita as regras de casa | Tasks (T14, T20, T24, T29, T41, T52, T60, T63, T71, T73, T80, T93, T95, T97, T99, T107, T120, T121) | Pending |
| TC2-01 | P1: As quatro técnicas entram no build | Tasks (T14, T20, T24, T29) | Pending |
| TC2-02 | P1: As quatro técnicas entram no build | Tasks (T12, T16, T22, T26) | Pending |
| TC2-03 | P1: As quatro técnicas entram no build | Tasks (T14, T20, T24, T29) | Pending |
| TC2-04 | P1: As quatro técnicas entram no build | Tasks (T13, T18, T23, T28, T31) | Pending |
| TC2-05 | P1: As quatro técnicas entram no build | Tasks (T13, T18, T23, T28, T31) | Pending |
| TC2-06 | P1: As quatro técnicas entram no build | Tasks (T14, T20, T24, T29, T31) | Pending |
| TC2-07 | P1: As quatro técnicas entram no build | Tasks (T14, T20, T24, T29, T31) | Pending |
| TC2-08 | P1: As quatro técnicas entram no build | Tasks (T6, T10, T14, T20, T24, T29) | Pending |
| TC2-09 | P1: As quatro técnicas entram no build | Tasks (T6, T14, T20, T24, T29) | Pending |
| TC2-10 | P1: As quatro técnicas entram no build | Tasks (T14, T20, T24, T29) | Pending |
| TC2-11 | P1: As quatro técnicas entram no build | Tasks (T3, T14, T20, T24, T29) | Pending |
| TC2-12 | P1: As quatro técnicas entram no build | Tasks (T5, T8, T10) | Pending |
| TC2-13 | P1: As quatro técnicas entram no build | Tasks (T13, T17, T18, T23, T27, T28) | Pending |
| TC2-14 | P1: As quatro técnicas entram no build | Tasks (T13, T18, T23, T28) | Pending |
| CNG-01 | P1: Convergência no jogo | Tasks (T1, T9, T14) | Pending |
| CNG-02 | P1: Convergência no jogo | Tasks (T9, T14) | Pending |
| CNG-03 | P1: Convergência no jogo | Tasks (T14) | Pending |
| CNG-04 | P1: Convergência no jogo | Tasks (T14) | Pending |
| CNG-05 | P1: Convergência no jogo | Tasks (T14) | Pending |
| CNG-06 | P1: Convergência no jogo | Tasks (T10, T14) | Pending |
| CNG-07 | P1: Convergência no jogo | Tasks (T1, T2, T3, T14) | Pending |
| CNG-08 | P1: Convergência no jogo | Tasks (T15) | Pending |
| CNG-09 | P1: Convergência no jogo | Tasks (T7, T14, T15) | Pending |
| CNG-10 | P1: Convergência no jogo | Tasks (T14) | Pending |
| CNG-11 | P1: Convergência no jogo | Tasks (T15) | Pending |
| DOG-01 | P1: Cães Divinos no jogo | Tasks (T20) | Pending |
| DOG-02 | P1: Cães Divinos no jogo | Tasks (T10, T20) | Pending |
| DOG-03 | P1: Cães Divinos no jogo | Tasks (T21) | Pending |
| DOG-04 | P1: Cães Divinos no jogo | Tasks (T21) | Pending |
| DOG-05 | P1: Cães Divinos no jogo | Tasks (T20) | Pending |
| DOG-06 | P1: Cães Divinos no jogo | Tasks (T19) | Pending |
| DOG-07 | P1: Cães Divinos no jogo | Tasks (T21) | Pending |
| RAI-01 | P1: Punho de Trovão no jogo | Tasks (T24) | Pending |
| RAI-02 | P1: Punho de Trovão no jogo | Tasks (T4, T5, T24) | Pending |
| RAI-03 | P1: Punho de Trovão no jogo | Tasks (T10, T24) | Pending |
| RAI-04 | P1: Punho de Trovão no jogo | Tasks (T24) | Pending |
| RAI-05 | P1: Punho de Trovão no jogo | Tasks (T24) | Pending |
| RAI-06 | P1: Punho de Trovão no jogo | Tasks (T24, T25) | Pending |
| RAI-07 | P1: Punho de Trovão no jogo | Tasks (T25) | Pending |
| RAI-08 | P1: Punho de Trovão no jogo | Tasks (T24) | Pending |
| RAI-09 | P1: Punho de Trovão no jogo | Tasks (T25) | Pending |
| ERP-01 | P1: Erupção no jogo | Tasks (T29, T30) | Pending |
| ERP-02 | P1: Erupção no jogo | Tasks (T29) | Pending |
| ERP-03 | P1: Erupção no jogo | Tasks (T29) | Pending |
| ERP-04 | P1: Erupção no jogo | Tasks (T30) | Pending |
| ERP-05 | P1: Erupção no jogo | Tasks (T29) | Pending |
| ERP-06 | P1: Erupção no jogo | Tasks (T30) | Pending |
| IC2-01 | P1: Cinco ícones HD novos | Tasks (T11) | Pending |
| IC2-02 | P1: Cinco ícones HD novos | Tasks (T11) | Pending |
| IC2-03 | P1: Cinco ícones HD novos | Tasks (T14, T20, T24, T29, T32) | Pending |
| IC2-04 | P1: Cinco ícones HD novos | Tasks (T11, T32) | Pending |
| IC2-05 | P1: Cinco ícones HD novos | Tasks (T44) | Pending |
| VAZ-01 | P1: Vazio Ilimitado paralisa o grupo | Tasks (T38) | Pending |
| VAZ-02 | P1: Vazio Ilimitado paralisa o grupo | Tasks (T40) | Pending |
| VAZ-03 | P1: Vazio Ilimitado paralisa o grupo | Tasks (T39, T41) | Pending |
| VAZ-04 | P1: Vazio Ilimitado paralisa o grupo | Tasks (T33, T34, T35, T42) | Pending |
| VAZ-05 | P1: Vazio Ilimitado paralisa o grupo | Tasks (T39, T41) | Pending |
| VAZ-06 | P1: Vazio Ilimitado paralisa o grupo | Tasks (T43) | Pending |
| VAZ-07 | P1: Vazio Ilimitado paralisa o grupo | Tasks (T41) | Pending |
| VAZ-08 | P1: Vazio Ilimitado paralisa o grupo | Tasks (T41) | Pending |
| VAZ-09 | P1: Vazio Ilimitado paralisa o grupo | Tasks (T43) | Pending |
| TLV-01 | P1: Talentos da leva 2 | Tasks (T46, T60) | Pending |
| TLV-02 | P1: Talentos da leva 2 | Tasks (T47, T53) | Pending |
| TLV-03 | P1: Talentos da leva 2 | Tasks (T53) | Pending |
| TLV-04 | P1: Talentos da leva 2 | Tasks (T48, T54) | Pending |
| TLV-05 | P1: Talentos da leva 2 | Tasks (T47, T57) | Pending |
| TLV-06 | P1: Talentos da leva 2 | Tasks (T37, T48, T58) | Pending |
| TLV-07 | P1: Talentos da leva 2 | Tasks (T59) | Pending |
| TLV-08 | P1: Talentos da leva 2 | Tasks (T47, T55) | Pending |
| TLV-09 | P1: Talentos da leva 2 | Tasks (T55) | Pending |
| TLV-10 | P1: Talentos da leva 2 | Tasks (T56) | Pending |
| TLV-11 | P1: Talentos da leva 2 | Tasks (T47, T51) | Pending |
| TLV-12 | P1: Talentos da leva 2 | Tasks (T51) | Pending |
| TLV-13 | P1: Talentos da leva 2 | Tasks (T52) | Pending |
| TLV-14 | P1: Talentos da leva 2 | Tasks (T47) | Pending |
| TLV-15 | P1: Talentos da leva 2 | Tasks (T48, T49) | Pending |
| TLV-16 | P1: Talentos da leva 2 | Tasks (T33, T35, T50) | Pending |
| TLV-17 | P1: Talentos da leva 2 | Tasks (T33, T34, T35, T36, T50) | Pending |
| TLV-18 | P1: Talentos da leva 2 | Tasks (T49, T50, T51, T52, T53, T54, T55, T57, T59, T60) | Pending |
| TLV-19 | P1: Talentos da leva 2 | Tasks (T45) | Pending |
| TLV-20 | P1: Talentos da leva 2 | Tasks (T37, T49, T58) | Pending |
| TLV-21 | P1: Talentos da leva 2 | Tasks (T60) | Pending |
| OSS-01 | P2: Osso de Dragão | Tasks (T68, T73) | Pending |
| OSS-02 | P2: Osso de Dragão | Tasks (T68, T69) | Pending |
| OSS-03 | P2: Osso de Dragão | Tasks (T67, T70, T71) | Pending |
| OSS-04 | P2: Osso de Dragão | Tasks (T67, T72) | Pending |
| OSS-05 | P2: Osso de Dragão | Tasks (T67, T72) | Pending |
| OSS-06 | P2: Osso de Dragão | Tasks (T71) | Pending |
| OSS-07 | P2: Osso de Dragão | Tasks (T65, T71) | Pending |
| OSS-08 | P2: Osso de Dragão | Tasks (T72) | Pending |
| OSS-09 | P2: Osso de Dragão | Tasks (T74) | Pending |
| OSS-10 | P2: Osso de Dragão | Tasks (T75) | Pending |
| OSS-11 | P2: Osso de Dragão | Tasks (T66) | Pending |
| OSS-12 | P2: Osso de Dragão | Tasks (T71, T73, T75) | Pending |
| OSS-13 | P2: Osso de Dragão | Tasks (T69) | Pending |
| OSS-14 | P2: Osso de Dragão | Tasks (T73, T75) | Pending |
| DED-01 | P2: Dedos de Sukuna | Tasks (T76, T83) | Pending |
| DED-02 | P2: Dedos de Sukuna | Tasks (T77, T83) | Pending |
| DED-03 | P2: Dedos de Sukuna | Tasks (T78) | Pending |
| DED-04 | P2: Dedos de Sukuna | Tasks (T79) | Pending |
| DED-05 | P2: Dedos de Sukuna | Tasks (T80) | Pending |
| DED-06 | P2: Dedos de Sukuna | Tasks (T81) | Pending |
| DED-07 | P2: Dedos de Sukuna | Tasks (T66, T82) | Pending |
| DED-08 | P2: Dedos de Sukuna | Tasks (T83) | Pending |
| DED-09 | P2: Dedos de Sukuna | Tasks (T77, T80) | Pending |
| AF2-01 | P2: Afixos da leva 2 no chefe | Tasks (T89) | Pending |
| AF2-02 | P2: Afixos da leva 2 no chefe | Tasks (T89) | Pending |
| AF2-03 | P2: Afixos da leva 2 no chefe | Tasks (T90, T92, T93) | Pending |
| AF2-04 | P2: Afixos da leva 2 no chefe | Tasks (T91) | Pending |
| AF2-05 | P2: Afixos da leva 2 no chefe | Tasks (T96) | Pending |
| AF2-06 | P2: Afixos da leva 2 no chefe | Tasks (T97) | Pending |
| ENF-01 | P2: Afixos da leva 2 no chefe | Tasks (T90) | Pending |
| ENF-02 | P2: Afixos da leva 2 no chefe | Tasks (T90) | Pending |
| COU-01 | P2: Afixos da leva 2 no chefe | Tasks (T92) | Pending |
| SOB-01 | P2: Afixos da leva 2 no chefe | Tasks (T93) | Pending |
| SOB-02 | P2: Afixos da leva 2 no chefe | Tasks (T85, T86, T93) | Pending |
| SOB-03 | P2: Afixos da leva 2 no chefe | Tasks (T85, T93) | Pending |
| SOB-04 | P2: Afixos da leva 2 no chefe | Tasks (T94) | Pending |
| PDR-01 | P2: Afixos da leva 2 no chefe | Tasks (T85, T95) | Pending |
| PDR-02 | P2: Afixos da leva 2 no chefe | Tasks (T85, T86, T87, T88, T95) | Pending |
| PDR-03 | P2: Afixos da leva 2 no chefe | Tasks (T91) | Pending |
| PDR-04 | P2: Afixos da leva 2 no chefe | Tasks (T95) | Pending |
| AF2-07 | P2: Afixos da leva 2 no chefe | Tasks (T97) | Pending |
| DUO-01 | P2: Duos | Tasks (T102) | Pending |
| DUO-02 | P2: Duos | Tasks (T103, T104, T105, T114) | Pending |
| DUO-03 | P2: Duos | Tasks (T103, T105, T114) | Pending |
| DUO-04 | P2: Duos | Tasks (T107) | Pending |
| DUO-05 | P2: Duos | Tasks (T103, T107, T114) | Pending |
| DUO-06 | P2: Duos | Tasks (T100, T108) | Pending |
| DUO-07 | P2: Duos | Tasks (T109) | Pending |
| DUO-08 | P2: Duos | Tasks (T99, T101) | Pending |
| DUO-09 | P2: Duos | Tasks (T103, T106, T110) | Pending |
| DUO-10 | P2: Duos | Tasks (T106, T111) | Pending |
| DUO-11 | P2: Duos | Tasks (T112) | Pending |
| DUO-12 | P2: Duos | Tasks (T100, T106, T113) | Pending |
| DUO-13 | P2: Duos | Tasks (T107) | Pending |
| DUO-14 | P2: Duos | Tasks (T102) | Pending |
| EVL-01 | P3: Evoluções da leva 2 | Tasks (T115) | Pending |
| EVL-02 | P3: Evoluções da leva 2 | Tasks (T115) | Pending |
| EVL-03 | P3: Evoluções da leva 2 | Tasks (T100, T116, T117) | Pending |
| EVL-04 | P3: Evoluções da leva 2 | Tasks (T116, T117) | Pending |
| EVL-05 | P3: Evoluções da leva 2 | Tasks (T116, T118) | Pending |
| EVL-06 | P3: Evoluções da leva 2 | Tasks (T33, T34, T119) | Pending |
| EVL-07 | P3: Evoluções da leva 2 | Tasks (T117, T118, T120) | Pending |
| EVL-08 | P3: Evoluções da leva 2 | Tasks (T120) | Pending |
| DON-01 | P2: ドン no patamar 3 | Tasks (T61, T63) | Pending |
| DON-02 | P2: ドン no patamar 3 | Tasks (T63) | Pending |
| DON-03 | P2: ドン no patamar 3 | Tasks (T62, T63) | Pending |
| DON-04 | P2: ドン no patamar 3 | Tasks (T63) | Pending |
| DON-05 | P2: ドン no patamar 3 | Tasks (T61) | Pending |
| DON-06 | P2: ドン no patamar 3 | Tasks (T62, T63) | Pending |

**Coverage:** 158 total, 158 mapped to tasks, 0 unmapped (mapa em `tasks.md`, seção "Requirement Coverage").

---

## Success Criteria

- [ ] Gate verde em cada commit, e os smokes de cada sub-fase passam, os antigos sem mudança.
- [ ] Com `?debug&hd=1&area=modular&tech=convergencia,caes,trovao` o feixe, a matilha e o raio funcionam na mesma luta,
      e a carta, o slot e a chamada mostram o ícone HD de cada uma.
- [ ] Numa run da r1 à r15 sem debug, as técnicas, os talentos, o Osso e os Dedos da leva 2 aparecem na loja, e o
      Baú do Véu pode oferecer o Vazio.
- [ ] Um chefe com `bossAffix=pele` só perde as 3 camadas para as fontes do PDR-02, e um com `sobrecarregado` mostra o
      escudo azul antes da vida.
- [ ] A `TestScene` termina a F41 com as mesmas linhas efetivas do fim da F40 ou menos, e nenhum arquivo entra na lista
      de exceções do lint.
