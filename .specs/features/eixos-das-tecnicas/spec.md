# Eixos das técnicas - Specification

## Problem Statement

Depois da F30 só o Vermelho e o Corpo Amaldiçoado crescem por eixo, ramo e Despertar. O Azul, o Desmantelar, o
Punho Divergente e o Vazio Roxo continuam no modelo antigo (Nv 1 a 3, `LEVEL_FACTOR` de 1/1,25/1,5, −5 de custo por
nível, `EVOLUTION_LEVEL` 3), então três das cinco técnicas ainda sobem só de número e o Roxo, depois da União, não
tem carta nenhuma para subir. A maestria sobe nível sozinha por acerto em cada alvo (o que premia a perfuração e não a
decisão), e o prêmio do chefe (`bossRewardSlot`) sobe às cegas a técnica de menor nível. A F33
(`docs/plano-builds-e-habilidades.md`, linha F33 da seção 6; seções 2.1, 2.3, 2.4, o fim da 2.5 sobre o Divergente e
o Roxo, 2.7, 3.1 e 5.7) aplica às quatro técnicas o **mesmo molde** que a F30 cria para o Vermelho, completa o painel
de escolha entre rodadas e troca as duas fontes cegas por escolha.

A F33 depende da F30 (`vermelho-e-corpo`) e usa o que ela entrega, sem mudar o contrato:
- `data/techAxes.ts`, `core/axisBuild.ts` (`AxisBuild`: pontos, ramo, pendente, Despertar, eixo-foco, `announce`) e
  `core/techStats.ts` (`TechStats` resolvido, `TECH_GEOMETRY`): a F33 acrescenta as quatro técnicas às tabelas e ao
  tipo `AxisItem`.
- `Loadout.stats(id)`, `Loadout.refundCooldown(slot, fraction)`, o piso de custo de 60% (PRC-05) e o `kokusenScale`
  (ESC-02).
- A carta com 2 eixos (`core/shopDraw.ts`, `axesFor`, `axisRng`, `W`/`S`, CRD-04/CRD-05), o preço do ponto e a trava
  (`core/shopPricing.ts`, PRC-02 a PRC-04).
- O `ChoicePanel` mínimo (`game/ChoicePanel.ts`, só a página do ramo, CRD-08/CRD-09), aberto pelo `shopDirector`
  depois do `VowPanel`.
- O `slotHeld` no `TechCaster` e no `TechRunner` (VRM-14), o `dealtDamage(hit, maxHp, isBoss)` com `Hit.maxHpBonus`
  (componente proporcional), o banner e a câmera lenta do Despertar (VRM-17), a borda dourada no `EnergyHud` e os
  parâmetros `axes=` e `ramo=` (`core/axisParam.ts`).
- Da F29: `Hit.band` (`chip`/`micro`), `core/hitBand.ts`, `DamageNumbers`, o `StatsDirector` como dono único dos
  multiplicadores e o tipo de snapshot em arquivo à parte.
- Da F31 (`expansao-de-dominio`, antes da F33 na fila): o Domínio com nível de 1 a 3, que o baú do chefe pode subir.

Código conferido em 14/10 no worktree `docs/spec-vermelho-e-corpo` (`f17a6a8`), que ainda não tem a F29 nem a F30:
- `core/bossReward.ts:5` (`bossRewardSlot`, menor nível abaixo do 3), chamado só por
  `runDirector.bossRewardUpgrade` (`runDirector.ts:200-205`) e pelo `spawner.onBossDefeated` (`spawner.ts:168`,
  `upgradeText` do banner de rodada concluída).
- `core/mastery.ts` (pontos por slot, um por alvo por conjuração, limiares `MASTERY.thresholds {1: 15, 2: 25}` e
  `bossPoints 3` em `data/tuning.ts:325-328`, sobe nível pelo `runDirector.onMasteryHit`, `runDirector.ts:184-193`);
  `core/masteryBar.ts` (largura pelo limiar do nível; oculta no Nv 3) e `EnergyHud.ts:123`.
- `core/evolution.ts` (`EVOLUTION_LEVEL = 3`, `recipeReady`, `evolve`: a técnica nova fica no slot de `from[0]`) e
  `data/evolutions.ts` (só o Roxo, `from: ['azul', 'vermelho']`, 60 fragmentos).
- `core/blueOrb.ts:4-9` (à frente 110, margem 16, raio 130, puxão 150, tique 250, vida 1400); `game/tech/blue.ts:50-64`
  puxa todo inimigo comum, armado incluso, e nunca o chefe.
- `core/cut.ts:21-25` (cortes a 0/60/120 ms, ângulos 20/−25/70, faixa 60 a 180 px, altura 48).
- `core/divergent.ts` (um alvo por conjuração, `firstImpact`), `core/kokusen.ts:80-81` (`CE.kokusenGain` 30 e
  `KOKUSEN.zoneMs` 8000).
- `core/purple.ts:2-11` (velocidade 180, vida 1600 = 288 px, raio 36, nasce 40 px à frente).
- `data/techniques.ts` (`TECHNIQUES`, `LEVEL_FACTOR` na l.95), `data/shop.ts:110-155` (`techGate` das 4 cartas de
  técnica), `core/run.ts:298-307` (streams com salt).

## Goals

- [ ] Azul, Desmantelar, Divergente e Roxo sobem do Nv 1 ao Nv 6 por pontos em 6 eixos cada, com ramo no Nv 2 e
      Despertar no Nv 5, com os números do plano, e nenhum arquivo de `src/` usa mais `LEVEL_FACTOR`,
      `EVOLUTION_LEVEL` nem o −5 de custo por nível.
- [ ] Toda carta de melhoria de técnica é a carta de 2 eixos da F30, e o Roxo, que não se compra, ganha carta de nível.
- [ ] O Roxo sai da União de Vermelho Nv 4 com Azul em qualquer nível, e a build focada chega a ele até a loja da r8.
- [ ] Um painel só por visita à konbini resolve ramo, ponto grátis, ponto livre, Despertar e o baú do chefe, com a
      lógica num `choiceDirector`.
- [ ] A maestria conta conjuração, abate e chefe, e dá 1 ponto grátis nos marcos 25 e 60, no máximo 2 por técnica.
- [ ] O chefe deixa um baú com até 3 opções sorteadas pelo `chestRng`, no lugar do `bossRewardSlot`.
- [ ] A `TestScene` não ganha nenhuma linha efetiva líquida na F33.

## Passos e commits

Na ordem. Refatoração é passo próprio, com os smokes iguais; a mudança de comportamento vem no passo seguinte. Cada
passo de técnica termina jogável (a técnica tem eixos, ramo e Despertar na loja e no painel).

| Passo | O que entra | `TestScene` (efetivas) |
| --- | --- | --- |
| 0. **Refatoração, com os smokes iguais** | `scenes/test/choiceDirector.ts` assume a fila e a página do ramo que a F30 deixou no `shopDirector` (`updateChoicePanel`); o `ChoicePanel` passa a mostrar página genérica (`kind`, até 3 opções); `AxisItem` cresce para as 5 técnicas e o Corpo sem item novo ainda | 0 |
| 1. **Azul** | base nova (custo 40, recarga 2500), 6 eixos, Andante ou Lapso, Azul Máximo ou Âncora; halo e distorção pelo raio | 0 |
| 2. **Desmantelar** | 6 eixos, Para Trás ou Clivar, Desmantelar do Rei ou Fenda; `CutFx` pelo alcance e pela altura | 0 |
| 3. **Divergente** | 6 eixos (2º impacto, alvos, Zona, energia do Kokusen, eficiência, recarga), Eco ou Concentrado, Eco Negro ou Impacto Único; base do Kokusen pelo eixo | 0 |
| 4. **Roxo e a União** | União na regra nova (`minLevel`), carta de nível do Roxo, 6 eixos, Massa ou Retorno, Roxo 200% ou Eclipse; saem `LEVEL_FACTOR`, `EVOLUTION_LEVEL`, o −5 por nível e o `techGate` | 0 |
| 5. **Painel completo e maestria** | páginas de ponto grátis, ponto livre e Despertar, `choiceRng`, maestria por conjuração com marcos 25 e 60 | 0 |
| 6. **Baú do chefe** | `core/bossChest.ts`, `chestRng`, página do baú; saem `core/bossReward.ts` e o `bossRewardUpgrade` | 0 |

## Out of Scope

| Feature | Reason |
| --- | --- |
| Boogie Woogie, Ressonância, Fala, `core/swap`, registro `TechId → TechModule`, `TechEmitter` e ícone HD de técnica | F34 |
| 3º slot `O`/`B`, `SlotIndex`, pool de 7 vagas com +8 por vaga, `BuildBar`, marca do eixo-foco na bandeja, Abandonar (`T`), talentos com nível, `TalentStrip` e `buildEffects` | F35. Na F33 o eixo-foco e o item-foco continuam os automáticos da F30, e o piso de custo continua no `Loadout` |
| Opção "nível de talento" no baú do chefe | Talento com nível é da F35; o `bossChest` aceita o tipo, mas o diretor não oferece candidato até lá |
| Receitas `{kind, id, minLevel}[]`, evoluções de arma, Punho Negro Divergente, outras Uniões e Evoluções, Duos, Grimório e `tests/data/combos.test.ts` | F36 e F37. A F33 só põe `minLevel` na receita do Roxo |
| Zona Negra (janela do Kokusen e ×2,8/×3,1) | Talento da F35 |
| Selo de elite como fonte de ponto livre | F38. A fila do painel aceita a origem, mas nada a emite na F33 |
| Elites | F38. A cláusula "puxa elite" do Puxão 3 fica no dado, sem alvo até lá |
| Paleta própria por ramo e Despertar (rampa nova em `art/palette.ts`) | Feature de arte à parte; a F33 usa a borda dourada, o banner e a câmera lenta da F30 |
| Baú do Véu e o Domínio em si | F31. A F33 só sobe o nível do Domínio que a F31 já deu |
| Teste de eixo dominante do Corpo | Já fora na F30 (eixos de utilidade) |
| Meta "com 5 itens possuídos, o eixo-foco aparece em 60% das lojas" | Pede 3 slots, arma e relíquia como item (F35, F36); a meta de 3 itens da F30 (CRD-07) continua |
| Versão antiga (`?hd=0`) | Não recebe trabalho novo; os smokes antigos só não podem quebrar |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| 3 técnicas + Domínio, pool de 7 vagas, arma imbuída e escala do inimigo na F30 (decisões 1, 3, 5 e 6 da seção 7) | Valem; nenhuma delas muda código na F33 além do que a F30 e a F31 já ligaram | Confirmadas pelo usuário | y |
| Eixo escolhido na carta (decisão 2), limiares Nv 2, Nv 4 e Nv 5 (decisão 8), base nova do Azul (decisão 9) | Seguem a recomendação do plano | O usuário mandou seguir a recomendação nas demais decisões | y |
| Nada automático | Nenhum ramo, Despertar ou opção do baú dispara efeito sem tecla do jogador; os efeitos novos só saem de conjuração, e as escolhas só no painel ou na carta | Pedido do usuário (seção "Pedido" do plano) | y |
| Prefixos dos requisitos | EIX (regra comum às 4 técnicas), AZL (Azul), DSM (Desmantelar), DVG (Divergente), RXO (Roxo e União), CHC (painel e `choiceDirector`), MAE (maestria), BAU (baú do chefe) | O validador só aceita `CAT-NN`; nenhum desses prefixos existe nas specs | y |
| Ids de item e de eixo (sem acento, como a F30) | Itens `azul`, `corte` (o `TechId` do Desmantelar), `divergente`, `roxo`. Eixos: Azul `gravidade, puxao, duracao, implosao, eficiencia, recarga`; Desmantelar `cortes, alcance, afiacao, cadencia, eficiencia, recarga`; Divergente `segundo, alvos, zona, energia, eficiencia, recarga`; Roxo `largura, alcance, carga, potencia, eficiencia, recarga`. A ordem é o desempate do eixo-foco | O `axes=` e o snapshot da F30 usam `item.eixo`; o id `segundo` evita ler como o `corpo.impacto` | n |
| Ids de ramo e Despertar | `andante`/`lapso`, `azulMaximo`/`ancora`; `paraTras`/`clivar`, `desmantelarDoRei`/`fenda`; `eco`/`concentrado`, `ecoNegro`/`impactoUnico`; `massa`/`retorno`, `roxo200`/`eclipse`. O `ramo=<item>:a` é o 1º de cada par | Mesmo molde da F30 | n |
| Pontos intermediários que o plano não dá | Divergente (o plano só dá os extremos): 2º impacto 18/24/30/36, alvos 1/2/2/3, Zona 8000/10000/12000/14000 ms, energia do Kokusen 30/38/46/54, eficiência 20/17/14/12, recarga 1200/1000/850/700 ms. Roxo (o plano só dá os nomes dos eixos): largura (raio) 36/44/51/58 px (o 60 do passo linear deu 1,38× no eixo dominante; o 58 dá 1,33×, pela linha "Calibração" abaixo; ver o design), alcance 288/300/310/320 px, carga (sinal + carga) 300+400/240+320/195+260/150+200 ms, potência 60/70/80/90, eficiência 70/60/51/42, recarga 6000/5000/4200/3500 ms | Passos lineares até o extremo do plano; a eficiência no 3º ponto é o piso de 60%; a carga segue as frações do Vermelho (0,8, 0,65, 0,5). A seção do plano diz que os números de eixo são ponto de partida, calibrados pelo teste de eixo dominante | n |
| Eficiência 3 do Desmantelar (o plano diz 15) | O dado fica 30/25/20/18: o 3º ponto chega ao piso de 60% (18) | O piso de 60% da seção 2.1 vale para toda técnica e já cortaria o 15; escrever 18 deixa a carta mostrar o número que o jogo usa | n |
| Calibração pelo teste de eixo dominante | Se um eixo passar de 1,35× o mediano, o número do dado muda no passo da técnica, e o design registra o valor novo e o motivo; o requisito continua o teste, não o número | "Os números das tabelas de eixo são ponto de partida" (topo do plano) | n |
| Modelo do teste de eixo dominante (o da F30, por técnica) | Dano sustentado = dano por conjuração ÷ período, com período = `max(recarga + sinal + carga, custo ÷ 8 energia/s)` e alvos numa área = `2 × raio / 96` (fila no chão). Azul: `(tiques na vida × tique + implosão) × alvos(raio)`; o Puxão vale 0 no modelo. Desmantelar: `cortes × afiação × alvos(alcance − 60)` com `alvos = 2 × (longe − perto) / 96`, mínimo 1. Divergente: `(12 + 2º impacto) × alvos`, sem o Kokusen; Zona e energia valem 0. Roxo: `potência × alvos(2 × largura) × alcance / 288` | O mesmo jogo de lado da F30; eixo de utilidade conta como 0, como a Eficiência do Vermelho preso à recarga | n |
| Gargalo do Divergente e do Roxo | Não declarado (o plano só fixa o do Vermelho, do Azul, do Desmantelar e do Boogie); o teste só confere o teto de 1,35× | Sem número no plano; não inventar regra de recarga para elas | n |
| Recarga 3 nas quatro técnicas | O abate por acerto da técnica tira 30% da recarga cheia resolvida do que resta no slot, sem passar de 0 (a regra da VRM-07) | Seção 2.1: "Recarga no 3º ponto" vale para toda técnica | n |
| Componente proporcional dos Despertares | A regra da F30: `round(pct × maxHp)` somado ao dano do mesmo acerto (`Hit.maxHpBonus`), uma vez por alvo por conjuração, `pct` do comum o do texto e do chefe 1% (Clivar: 0,5% no chefe, por corte) | Seção 2.1 ("1 vez por conjuração") e o modelo da F30 | n |
| Eco Negro sem componente proporcional no plano | O comum atingido pelo anel com Kokusen leva também 3% do HP máximo (chefe 1%) | "Todo Despertar tem um componente proporcional: 3 a 5%" (seção 2.1); 3% porque o Kokusen já é o maior golpe | n |
| Fenda sem componente proporcional próprio | Não leva: o componente do ramo Clivar (2% por corte) é o proporcional do caminho, e o plano diz "sem o componente proporcional do Clivar" na fenda | Texto da seção 2.4 | n |
| Lapso ("segurar a tecla move o ponto até 220 px antes de soltar") | Se a tecla do slot ainda estiver segurada quando o orbe nasce (110 px à frente, como hoje), o orbe anda à frente a 200 px/s enquanto ela continuar segurada, até 220 px do centro do player no início da conjuração ou até 16 px antes da parede; soltar para o orbe onde está. Tecla solta antes do nascimento: orbe parado como hoje. A vida do orbe não muda | O mesmo uso do `slotHeld` do Contido (F30); a tecla já fica segurada no sinal e na carga | n |
| Âncora ("prende até o chefe por 0,5 s") | No instante em que o orbe do Lapso para (tecla solta ou 220 px), todo inimigo e o chefe dentro do raio ficam presos 500 ms: sem andar e sem começar ataque (o ataque já em curso continua); cada comum preso leva 4% do HP máximo e o chefe 1%, uma vez por conjuração | Prender sem interromper o golpe em curso evita travar o chefe no meio da animação; o comum segue a regra do componente proporcional | n |
| Andante | O orbe nasce e fica a 80 px à frente do centro do player, acompanha o player e vira com ele a cada quadro, e vive 70% da duração resolvida (arredondado ao ms) | Texto da seção 2.3 | n |
| Azul Máximo | A implosão dá 3 vezes o dano resolvido da implosão, com `knockdown`, e soma 4% do HP máximo de cada alvo dentro do raio (chefe 1%, sem derrubada) | Texto da seção 2.3 | n |
| Implosão 2 "derruba" e "tremor a partir de 2" | Com 2 ou mais pontos a implosão leva `knockdown` nos comuns e chama `fx.shake` | Texto da tabela do Azul | n |
| Puxão 3 "puxa armado e elite (chefe nunca)" | Hoje o Azul já puxa todo comum, armado incluso (`blue.ts:50-64`); a cláusula do elite fica no dado (`pullsElite: true`) sem alvo até a F38 | Conferido no código | n |
| Cortes além do 3º | Os instantes são `i × intervalo` (i de 0 a cortes − 1) e os ângulos repetem a lista de hoje (20, −25, 70, 20, −25, 70) | O plano não dá ângulo novo | n |
| Para Trás ("metade dos cortes sai atrás") | Os cortes de posição par na ordem (2º, 4º, 6º) saem atrás, com o retângulo espelhado: 1 de 3, 2 de 4, 2 de 5, 3 de 6 | Metade arredondada para baixo, e o 1º corte continua à frente | n |
| Desmantelar do Rei ("os cortes partem projéteis") | Todo projétil e onda de choque do chefe que tocar o retângulo de um corte some; o último corte da conjuração soma 4% do HP máximo de cada alvo que acertar (chefe 1%) | Texto da seção 2.4 | n |
| Fenda | O comum que morre por um corte abre uma fenda que dá 1 acerto `micro` com o dano do corte resolvido (sem o Clivar) no comum vivo mais perto a até 120 px do morto; a fenda que mata não abre outra | Sem cadeia, para o Despertar não limpar a tela sozinho | n |
| Alvos do Divergente | O 1º impacto registra até N alvos (os primeiros comuns que a caixa do soco tocar, o mais perto do player primeiro; o chefe conta como um alvo) e cada um leva o próprio 2º impacto no mesmo tempo sorteado; o Kokusen vale só no alvo principal (o mais perto) | O Kokusen é um aperto de tecla só por conjuração | n |
| Eco | No 2º impacto de cada alvo, os outros comuns a até 48 px do centro dele levam um acerto `micro` com o dano do 2º impacto, cada um no máximo uma vez por conjuração e nunca quem já leva o próprio 2º impacto | A seção 4 põe o eco na faixa micro | n |
| Concentrado | Força 1 alvo e dobra o dano do 2º impacto; enquanto ele vale, a carta e o painel nunca oferecem o eixo `alvos`, e os pontos já postos nele ficam sem efeito | Ponto em eixo morto seria armadilha | n |
| Base do Kokusen com o eixo | A ESC-02 da F30 passa a usar `D = 2º impacto resolvido pelo eixo` (18/24/30/36, sem `damageMul`, sem `vowDamageMul` e sem o ×2 do Concentrado) | O ×2 do Concentrado vale para o 2º impacto comum; somado ao ×2,5 o Kokusen passaria do teto de leitura da seção 5.2 | n |
| Eco Negro | Quando o Kokusen acerta o alvo principal, cada comum atingido pelo anel do Eco dele leva o dano do Kokusen (no lugar do dano do anel) mais 3% do HP máximo; a energia do Kokusen e a Zona saem uma vez por conjuração | "O anel do 2º impacto também tenta Kokusen, com a janela normal": a janela é a do mesmo aperto | n |
| Massa (ramo A do Roxo) | Se a tecla do slot ainda estiver segurada quando a esfera nasce, ela fica parada no ponto de nascimento e o raio cresce em linha reta até 1,6 vez o resolvido em 1000 ms, tocando o que alcançar; sai em voo ao soltar ou aos 1000 ms. A vida do voo conta da saída. Tecla solta antes do nascimento: voo normal | O mesmo uso do `slotHeld`; o plano manda os ramos do Roxo para a F33 | n |
| Roxo 200% (Despertar da Massa) | A esfera que sai com a massa cheia (1000 ms segurada) prende os comuns que toca, que andam com ela até o fim do voo e caem derrubados no fim; cada alvo tocado leva 5% do HP máximo (chefe 1%, sem arrasto) | Muda a forma de jogar (junta o grupo na ponta do voo) e cumpre o componente proporcional | n |
| Retorno (ramo B do Roxo) | No fim do alcance a esfera volta na mesma velocidade em direção ao centro atual do player e some ao tocá-lo ou depois de mais um alcance; na volta cada alvo pode ser tocado de novo (no máximo 2 toques por alvo por conjuração), com 50% do dano | Volta com 100% dobraria o dano por conjuração e passaria do teto de eixo dominante | n |
| Eclipse (Despertar do Retorno) | Na volta a esfera atravessa o player e segue até o alcance resolvido do outro lado; o alvo tocado na ida e na volta leva 4% do HP máximo no 2º toque (chefe 1%) | Cobre as costas (anticerco) e cumpre o componente proporcional | n |
| Roxo na loja | Não é vendido como técnica nova (continua nascendo da União); com o Roxo equipado, a carta de melhoria dele entra na loja como as outras (2 eixos, preço do ponto, trava) | "Entra na loja como carta de nível" (seção 2.5) e o comentário de `data/techniques.ts:5` | n |
| Slot do Roxo | A União continua deixando o Roxo no slot de `from[0]` (o Azul) e esvaziando o outro (EVO-03); o Vermelho sai do slot e perde os pontos (`axes.resetItem`, F30) | Mudar o slot quebraria o smoke `evolution` sem ganho para o jogador | n |
| Trava por rodada nos pontos grátis | Não vale: a trava da PRC-04 é só da loja; ponto grátis, ponto livre e baú põem ponto em qualquer rodada | A trava é ritmo de compra; as fontes grátis são poucas (2 por técnica e 1 baú a cada 5 rodadas) | n |
| Ordem das páginas no painel | Ramos pendentes (slot 0, slot 1, Corpo) → pontos grátis da maestria (na ordem em que saíram) → baú do Véu da F31 → baú do chefe; a página criada ao confirmar outra (ramo novo, Despertar, os 2 pontos livres do baú) entra logo depois dela | O ponto da maestria cai antes de uma União do baú consumir a técnica; a consequência aparece na hora | n |
| Página de Despertar | Só aparece quando um Despertar liga por uma página do mesmo painel (ramo escolhido com o item já no Nv 5, ou ponto grátis ou livre que leva ao Nv 5 com ramo); mostra o nome e o efeito e fecha com `Enter`. O Despertar ligado por compra na loja segue a F30 (a carta avisa `+ Despertar`, sem página) | No máximo 1 painel por visita (seção 2.1) e sem página repetindo o que a carta já disse | n |
| Ponto livre (baú; selo na F38) | 3 opções de par item-eixo: o eixo-foco do item-foco (F30) e 2 pares distintos sorteados pelo `choiceRng` entre os eixos abaixo do teto de todo item possuído (técnicas equipadas e Corpo) | "2 pontos de eixo à escolha" sem item fixo; o lutador escolhe o Corpo e o feiticeiro a técnica | n |
| Pontos da maestria | Por conjuração: +1 quando ela acerta qualquer alvo pela 1ª vez, +3 uma vez quando ela acerta o chefe, +1 por comum morto por acerto dela (tique `chip`, estilhaço e eco inclusos). Os pontos acumulam por slot e não zeram no marco | Seção 2.7; o +3 uma vez por conjuração impede que os tiques do Azul no chefe deem 3 cada | n |
| Teto de 2 marcos por técnica | Os marcos ficam registrados por `TechId` na run: a técnica que volta ao slot (troca, União) não ganha de novo um marco que já deu | "No máximo 2 por técnica" | n |
| Banner da maestria | `"{nome}: maestria {25 \| 60}!"` com `RUN.bannerMs` no lugar do `"{nome} Nv {n}!"` | A maestria não sobe nível; o ponto é escolhido na konbini | n |
| Barra de maestria | Mostra o progresso até o próximo marco (`round(largura × (pontos − marco anterior) / (próximo − marco anterior))`) e some depois do 60 | A barra de hoje mede o limiar do nível, que deixa de existir | n |
| Baú do chefe sem candidato | Nenhuma página; o banner de rodada concluída não leva texto de prêmio (`upgradeText: null`) em nenhum caso | Paridade com o `bossRewardUpgrade` que devolve `null`; o prêmio agora é escolhido no painel | n |
| Opções do baú | Candidatos: cada União pronta (na F33, só o Roxo), "2 pontos de eixo" (quando algum item possuído tem eixo abaixo do teto) e "nível do Domínio" (quando a F31 deu um Domínio abaixo do Nv 3). Com mais de 3, o `chestRng` sorteia 3 sem repetir; a ordem das cartas também sai do `chestRng` | Seção 3.1; "evolução" e "talento" entram com a F35 e a F37 | n |
| União grátis no baú e na loja | A opção do baú aplica a União na hora (`evolve`, sem gastar fragmento); a carta 0 da loja continua oferecendo a União pronta por 60 (EVO-01, CRD-02 da F30) | Seção 5.7: "saem do baú do chefe (grátis) ou da loja (60)" | n |
| Parâmetros de debug | `axes=` e `ramo=` aceitam `azul`, `corte`, `divergente` e `roxo`; o nível do `tech=<id>:N` passa a ser ignorado para as quatro, como já é para o Vermelho; `chest=1` deixa o baú do chefe pendente para a próxima konbini; `mastery=N` continua dando N pontos aos slots | Os smokes precisam montar a build e abrir o baú sem matar o chefe | n |
| Smokes novos | `tech-axes.smoke.mjs` (as quatro técnicas), `choice-panel.smoke.mjs` (páginas e maestria) e `boss-chest.smoke.mjs`, todos com `?debug&hd=1&area=modular` | Regra de smoke novo do projeto | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Toda técnica segue o molde do Vermelho ⭐ MVP

**User Story**: Como jogador, quero que o Azul, o Desmantelar, o Divergente e o Roxo subam por eixo, ramo e Despertar
como o Vermelho, para toda técnica ter caminho e duas runs com a mesma técnica jogarem diferente.

**Why P1**: É o escopo central da F33; sem ele três técnicas continuam só número e o Roxo não sobe.

**Acceptance Criteria**:

1. EIX-01: The level of the Azul, the Desmantelar, the Divergente and the Roxo SHALL be 1 plus the total axis points of that technique, from 1 to 6, and each of their 6 axes SHALL hold 0 to 3 points.
2. EIX-01: IF a point would take an axis above 3 points or a technique above 5 total points THEN the system SHALL refuse it and change nothing.
3. EIX-01: WHEN step 4 is committed THEN no file under `src/` SHALL reference `LEVEL_FACTOR`, `EVOLUTION_LEVEL`, the 5-per-level cost discount or the `techGate` of `data/shop.ts`.
4. EIX-02: For each of the four techniques and each axis at 0 to 3 points, `Loadout.stats(id)` SHALL return the value of the `data/techAxes.ts` table, with every damage value times `damageMul` and `vowDamageMul` (rounded as `loadout.ts` rounds today) and the cost after the PRC-05 floor of 60% of the level 1 cost.
5. EIX-03: WHEN one of the four techniques reaches level 2 for the first time in the run THEN the system SHALL add a pending branch choice for it, and WHEN it reaches level 5 with a branch chosen THEN its Despertar SHALL turn on and its `EnergyHud` icon SHALL get the gold border of VRM-17.
6. EIX-03: WHEN the first cast of a round of one of the four techniques reaches `release` with its Despertar on THEN the system SHALL show a banner with the Despertar name and SHALL set the time scale to 0.4 for 350 ms of real time.
7. EIX-04: WHILE the Recarga axis of one of the four techniques has 3 points, WHEN a hit of that technique kills a common enemy THEN the remaining cooldown of its slot SHALL drop by 30% of the full resolved cooldown, never below 0.
8. EIX-05: WHEN a Despertar adds a share of the max HP THEN the hit SHALL deal `round(pct × maxHp)` on top of its damage in the same hit and the same damage number, with `pct` the share given for common enemies and 0.01 for the boss (0.005 per cut for the Clivar), at most once per target per cast except where a requirement says per cut.
9. EIX-06: The shop upgrade card of the Azul, the Desmantelar, the Divergente and the Roxo SHALL be the two-axis card of CRD-04 and CRD-05 (focus axis plus one axis drawn by `axisRng`, `W`/`S` to choose, preview of the resolved values, `+ ramo` or `+ Despertar` line), with the level text `Nv <level + 1>/6`.
10. EIX-06: The price of an axis point of the four techniques SHALL be `12 + 4 × points already placed` before inflation, with the round lock of PRC-04 (1st and 2nd point from round 2, 3rd and 4th from round 4, 5th from round 6), and the level price of PRC-06 and the old card of CRD-10 SHALL no longer exist.
11. EIX-07: WHEN the run starts with `?debug&axes=<item>.<axis>:<n>[,...]` or `ramo=<item>:<a|b>` with `item` in `azul`, `corte`, `divergente` or `roxo` THEN the system SHALL apply them as VRM-10 and VRM-18 do for the Vermelho, only to an equipped technique, and the level in `tech=<id>:<n>` SHALL be ignored for the four techniques.
12. EIX-08: The debug snapshot SHALL report `build.azul`, `build.corte`, `build.divergente` and `build.roxo`, each `{level, axes, branch, awakened, stats}` or `null` when the technique is not equipped.
13. EIX-09: In `tests/data/techAxesTechniques.test.ts`, for each of the four techniques, no axis at 3 points SHALL give more than 1.35 times the sustained damage of the median axis of the same technique under the model of the Assumptions table.
14. EIX-10: The names of all branches and Despertares in `data/techAxes.ts` (the Vermelho, the Corpo and the four techniques) SHALL be unique, and the test SHALL fail on a repeated name or a repeated effect text.
15. EIX-11: The views `BlueOrb`, `CutFx`, `DivergentFx` and `PurpleOrb` SHALL size the halo, the distortion, the slash, the ring and the sphere from the `TechStats` of the cast, with no literal copy of a resolved number.
16. EIX-12: In `tests/core/buildCurve.test.ts`, for each of the Azul, the Desmantelar and the Divergente as the focused technique (buying with the F30 prices, lock and inflation on top of `expectedIncome`, every card assumed on sale), the technique SHALL reach level 2 by the round 3 shop and level 5 by the round 10 shop.

**Independent Test**: `npm run gate` com `tests/data/techAxesTechniques.test.ts` (tabelas, eixo dominante e nomes únicos) e o
teste do `Loadout.stats` das quatro técnicas; `tech-axes.smoke.mjs` com `axes=azul.gravidade:3` lê o raio 220 no
snapshot.

---

### P1: Azul que puxa, anda ou prende ⭐ MVP

**User Story**: Como jogador, quero escolher se o Azul anda comigo e traz o grupo para o soco ou se eu o levo até o
grupo e prendo até o chefe, para o Azul ter o papel que eu escolhi.

**Why P1**: O Azul é a técnica de controle e a única presa à energia; a base nova dele (decisão 9) entra aqui.

**Acceptance Criteria**:

1. AZL-01: The Azul with no axis point SHALL cost 40 energy and SHALL have a 2500 ms cooldown, and SHALL keep the 130 px radius, the 150 px/s pull, the tick of 5 every 250 ms as a `chip` hit, the 1400 ms life, the implosion of 10, the 200 ms sign and the 250 ms charge.
2. AZL-02: The `data/techAxes.ts` table SHALL give, for 0, 1, 2 and 3 points: Gravidade radius 130/160/190/220 px; Puxão 150/190/230/270 px/s; Duração life 1400/1800/2200/2600 ms; Implosão implosion 10/18/26/34 and tick 5/6/7/8; Eficiência cost 40/34/29/24; Recarga 2500/2100/1800/1500 ms.
3. AZL-03: WHILE an Azul orb is alive its halo and its distortion SHALL be drawn at the radii that today are 40 and 58 times the resolved radius divided by 130.
4. AZL-04: WHILE the Implosão has 2 or more points the implosion SHALL carry `knockdown: true` on common enemies and SHALL call the camera shake.
5. AZL-05: WHILE the branch is Andante the orb SHALL stay 80 px ahead of the player center in the facing direction at every frame and SHALL live 70% of the resolved life, rounded to the ms.
6. AZL-06: WHILE the branch is Lapso, WHEN the orb spawns with the slot key held THEN it SHALL move forward at 200 px/s while the key stays held and SHALL stop when the key is released, at 220 px from the player center at the cast start, or 16 px before a wall, whichever comes first.
7. AZL-06: IF the slot key is released before the Lapso orb spawns THEN the orb SHALL stay at its spawn point as the branchless orb.
8. AZL-07: WHILE the Despertar Azul Máximo is on the implosion SHALL deal 3 times its resolved damage, SHALL carry `knockdown: true` on common enemies, and SHALL add 4% of the max HP of every target in the radius (1% on the boss).
9. AZL-08: WHILE the Despertar Âncora is on, WHEN the Lapso orb stops THEN every common enemy and the boss inside the radius SHALL neither move nor start an attack for 500 ms, an attack already started SHALL go on, each held common enemy SHALL take 4% of its max HP and the held boss 1%.
10. AZL-09: WHEN the run starts with `?debug&tech=azul&ramo=azul:a` or `ramo=azul:b` THEN the Azul branch SHALL be Andante or Lapso.

**Independent Test**: `tech-axes.smoke.mjs` com `seed=1&maxAlive=3&tech=azul`: com `ramo=azul:a` a posição do orbe no
snapshot segue o player a 80 px; com `ramo=azul:b` e a tecla segurada o orbe para a 220 px; com
`axes=azul.implosao:2,azul.gravidade:2&ramo=azul:a` o snapshot mostra `awakened: true` e a implosão derruba.

---

### P1: Desmantelar de cerco ou de corte fundo ⭐ MVP

**User Story**: Como jogador, quero que o Desmantelar corte para os dois lados quando estou cercado ou abra fendas no
grupo quando foco num alvo, para o Corte ter dois jeitos de jogar.

**Why P1**: É uma das quatro técnicas do molde; o Clivar é a única fonte por corte que acompanha o HP.

**Acceptance Criteria**:

1. DSM-01: The `data/techAxes.ts` table SHALL give, for 0, 1, 2 and 3 points: Cortes 3/4/5/6 cuts; Alcance far edge 180/220/260/300 px and height 48/56/64/72 px; Afiação cut damage 10/13/16/19; Cadência interval 60/45/35/25 ms and sign 150/120/100/80 ms; Eficiência cost 30/25/20/18; Recarga 2500/2000/1600/1200 ms.
2. DSM-02: WHEN the Desmantelar releases THEN cut `i` (from 0 to cuts − 1) SHALL fire at `i × interval` ms with the angle `[20, −25, 70][i mod 3]`, over the rectangle from 60 px to the resolved far edge with the resolved height.
3. DSM-03: The `CutFx` slash SHALL span the resolved rectangle of each cut.
4. DSM-04: WHILE the branch is Para Trás the cuts at even positions in the order (2nd, 4th, 6th) SHALL use the rectangle mirrored behind the player.
5. DSM-05: WHILE the branch is Clivar every cut that hits SHALL add 2% of the target max HP (0.5% on the boss), and no other source SHALL stack a share of the max HP on the same cut.
6. DSM-06: WHILE the Despertar Desmantelar do Rei is on every boss projectile and shockwave that touches the rectangle of a cut SHALL be removed, and the last cut of the cast SHALL add 4% of the max HP of every target it hits (1% on the boss).
7. DSM-07: WHILE the Despertar Fenda is on, WHEN a cut kills a common enemy THEN the system SHALL hit the nearest living common enemy within 120 px of the dead one once with a `micro` hit of the resolved cut damage and no Clivar share, and a kill by that hit SHALL open no other fenda.
8. DSM-08: WHEN the run starts with `?debug&tech=corte&ramo=corte:a` or `ramo=corte:b` THEN the Desmantelar branch SHALL be Para Trás or Clivar.

**Independent Test**: `tech-axes.smoke.mjs` com `tech=corte&axes=corte.cortes:3&ramo=corte:a` e um inimigo de cada
lado: os dois levam corte; com `ramo=corte:b` o número de dano do corte passa do dano resolvido pelos 2% do HP.

---

### P1: Divergente que espalha ou concentra ⭐ MVP

**User Story**: Como jogador, quero que o Punho Divergente acerte vários alvos com eco ou um só com o dobro, e que o
Kokusen cresça com o eixo, para o golpe mais épico do jogo ter build própria.

**Why P1**: É uma das quatro técnicas do molde e a porta do Kokusen.

**Acceptance Criteria**:

1. DVG-01: The `data/techAxes.ts` table SHALL give, for 0, 1, 2 and 3 points: 2º impacto 18/24/30/36; Alvos 1/2/2/3 targets; Zona 8000/10000/12000/14000 ms; Energia (Kokusen gain) 30/38/46/54; Eficiência cost 20/17/14/12; Recarga 1200/1000/850/700 ms; the 1st impact SHALL stay 12.
2. DVG-02: WHEN the Divergente punch connects THEN the first impact SHALL register up to the resolved number of targets, nearest to the player first, each of them SHALL take its own 2nd impact after the drawn delay, and the Kokusen attempt SHALL apply only to the nearest one.
3. DVG-03: WHEN a Kokusen lands from the Divergente THEN the energy gain SHALL be the resolved Energia value and the Zona SHALL last the resolved Zona time.
4. DVG-04: WHEN a Kokusen lands THEN the ESC-02 formula SHALL use `D` = the resolved 2nd impact base of the Divergente axis (18, 24, 30 or 36), without `damageMul`, `vowDamageMul` and the Concentrado factor.
5. DVG-05: WHILE the branch is Eco, WHEN a 2nd impact hits its target THEN every other common enemy within 48 px of that target center that is not taking its own 2nd impact SHALL take a `micro` hit of the 2nd impact damage, each enemy at most once per cast.
6. DVG-06: WHILE the branch is Concentrado the first impact SHALL register 1 target, its 2nd impact SHALL deal 2 times the resolved damage, and no shop card nor choice page SHALL offer the `alvos` axis.
7. DVG-07: WHILE the Despertar Eco Negro is on, WHEN the Kokusen lands on the main target THEN every common enemy hit by its Eco ring SHALL take the Kokusen damage instead of the ring damage plus 3% of its max HP, and the energy gain and the Zona SHALL apply once per cast.
8. DVG-08: WHILE the Despertar Impacto Único is on the 2nd impact SHALL add 4% of the target max HP (1% on the boss).
9. DVG-09: WHEN the run starts with `?debug&tech=divergente&ramo=divergente:a` or `ramo=divergente:b` THEN the Divergente branch SHALL be Eco or Concentrado.

**Independent Test**: `tech-axes.smoke.mjs` com `tech=divergente&axes=divergente.alvos:3&maxAlive=3` e 3 inimigos
encostados: 3 números de 2º impacto; com `ramo=divergente:b` só 1, com o dobro.

---

### P1: Roxo pela União nova e com caminho próprio ⭐ MVP

**User Story**: Como jogador, quero fundir o Vermelho no Nv 4 com o Azul que eu tiver e depois subir o Roxo por eixos,
ramo e Despertar, para a União chegar no meio da run e não ser um beco sem saída.

**Why P1**: Fecha a armadilha 11 do plano (Roxo sem carta) e põe a primeira União na regra de limiar nova.

**Acceptance Criteria**:

1. RXO-01: WHILE the Vermelho is equipped at level 4 or more and the Azul is equipped at any level the Roxo União SHALL be ready, and IF the Vermelho is at level 3 or less THEN it SHALL not be ready.
2. RXO-01: The Roxo recipe in `data/evolutions.ts` SHALL hold the minimum level of each piece (`minLevel`: Azul 1, Vermelho 4), and `recipeReady` SHALL read it instead of `EVOLUTION_LEVEL`.
3. RXO-02: WHEN the União is applied THEN the Roxo SHALL enter at level 1 with 0 axis points in the slot of the Azul, the other slot SHALL be empty, and the Vermelho axis points, branch and Despertar SHALL be reset.
4. RXO-03: The shop SHALL never offer the Roxo as a new technique, and WHILE the Roxo is equipped and below level 6 its upgrade card SHALL be drawn as EIX-06 says.
5. RXO-04: The `data/techAxes.ts` table SHALL give, for 0, 1, 2 and 3 points: Largura radius 36/44/51/58 px; Alcance 288/300/310/320 px at 180 px/s; Carga sign 300/240/195/150 ms and charge 400/320/260/200 ms; Potência hit 60/70/80/90; Eficiência cost 70/60/51/42; Recarga 6000/5000/4200/3500 ms.
6. RXO-05: The Roxo sphere SHALL end its flight at the resolved range from its spawn point, never beyond 320 px, and the `PurpleOrb` sphere SHALL be drawn at the resolved radius.
7. RXO-06: WHILE the branch is Massa, WHEN the sphere spawns with the slot key held THEN it SHALL stay at its spawn point while its radius grows linearly to 1.6 times the resolved radius over 1000 ms, touching what it reaches, and SHALL start its flight when the key is released or at 1000 ms, with the flight range counted from the start.
8. RXO-07: WHILE the Despertar Roxo 200% is on, WHEN a sphere starts its flight after a full 1000 ms hold THEN every common enemy it touches SHALL move with it until the flight ends and SHALL be knocked down at the end, and every target it touches SHALL take 5% of its max HP (1% on the boss, which is never dragged).
9. RXO-08: WHILE the branch is Retorno, WHEN the sphere reaches its range THEN it SHALL fly back at the same speed toward the current player center, SHALL vanish when it touches the player or after one more range, and each target SHALL be touched at most twice per cast, the second touch dealing 50% of the hit damage.
10. RXO-09: WHILE the Despertar Eclipse is on the returning sphere SHALL pass through the player and fly on to the resolved range on the other side, and a target touched on the way out and on the way back SHALL take 4% of its max HP on its second touch (1% on the boss).
11. RXO-10: WHEN the run starts with `?debug&tech=roxo&ramo=roxo:a` or `ramo=roxo:b` THEN the Roxo branch SHALL be Massa or Retorno.
12. RXO-11: In `tests/core/buildCurve.test.ts`, the build focused on the Vermelho with the Azul bought, buying with the F30 prices, lock and inflation on top of `expectedIncome`, SHALL have the União ready and its 60-fragment card affordable by the round 8 shop.

**Independent Test**: `evolution.smoke.mjs` com `tech=azul,vermelho&axes=vermelho.potencia:3`: a carta 0 é a União, e a
compra deixa o Roxo no Nv 1; `tech-axes.smoke.mjs` com `tech=roxo&ramo=roxo:b`: a esfera volta e o mesmo inimigo
leva dois números, o segundo com metade.

---

### P1: Um painel só por visita resolve tudo ⭐ MVP

**User Story**: Como jogador na konbini, quero ver numa sequência de páginas o ramo, os pontos grátis, o Despertar
novo e o baú do chefe, para escolher a build entre rodadas sem painel a cada compra.

**Why P1**: É por onde a maestria e o baú chegam ao jogador; sem ele as duas fontes novas não têm onde ser escolhidas.

**Acceptance Criteria**:

1. CHC-01: WHEN step 0 is committed THEN the pending-page queue and the branch page logic SHALL live in `src/scenes/test/choiceDirector.ts` with the pure queue in `src/core/choice.ts`, the `shopDirector` SHALL only ask the `choiceDirector` whether it is open, and the smokes `shop-axes`, `shop`, `shop-progress` and `run-loop` SHALL pass unchanged.
2. CHC-02: WHEN the konbini opens with pending pages THEN, after the `VowPanel` when it opens, the `ChoicePanel` SHALL show one page at a time in the order branches (slot 0, slot 1, Corpo), mastery free points (in the order they were earned), the F31 Veil chest, the boss chest, and the shop SHALL take no input until the last page is confirmed.
3. CHC-03: WHEN confirming a page creates a new page (a branch at level 2, a Despertar, the two free points of the chest) THEN the new page SHALL be shown right after it in the same panel, and no second panel SHALL open in that konbini visit.
4. CHC-04: The branch page SHALL serve the Vermelho, the Corpo and the four techniques, with 2 options, `A`/`D` to choose and `Enter` to confirm, as CRD-08 does.
5. CHC-05: The free point page of an item SHALL offer up to 3 axes below the cap, the focus axis first and the others drawn by `choiceRng`, never the `alvos` axis under the Concentrado, with each option text as the axis card line of CRD-05, `A`/`D` to cycle and `Enter` to add the point with no fragment cost and no round lock.
6. CHC-06: The open free point page (chest; selo from F38) SHALL offer 3 distinct item-axis pairs: the focus axis of the focus item first and 2 pairs drawn by `choiceRng` among the axes below the cap of every owned item (equipped techniques and the Corpo).
7. CHC-07: WHEN a page of the same panel turns a Despertar on THEN a Despertar page SHALL show the Despertar name and effect text, and `Enter` SHALL close it.
8. CHC-08: IF the item of a free point page is no longer equipped or has no axis below the cap when the page would show THEN the page SHALL be skipped, and IF no owned item has an axis below the cap THEN an open free point page SHALL be skipped.
9. CHC-09: The `choiceRng` SHALL be a stream with its own salt in `core/run.ts`, and the same seed with the same choices SHALL give the same pages and options.
10. CHC-10: The debug snapshot SHALL report `choice: {open, page, pending}` with `page` as `{kind, item, options, selected}` or `null`, `kind` in `ramo`, `ponto`, `livre`, `despertar` or `bau`, and `pending` the number of pages still queued.
11. CHC-11: WHEN the run resets THEN every pending page SHALL be dropped.

**Independent Test**: `choice-panel.smoke.mjs` com `tech=vermelho&mastery=24&noshop=0`: depois de um acerto do Vermelho e
do fim da rodada, a konbini abre a página `ponto` com 3 eixos, o 1º o eixo-foco; com `axes=vermelho.potencia:3`, o
ponto que leva ao Nv 5 com `ramo=vermelho:b` mostra a página `despertar` logo depois.

---

### P1: Maestria que dá ponto à escolha ⭐ MVP

**User Story**: Como jogador, quero que usar a técnica me dê pontos grátis para escolher, sem subir nível sozinha, para
a técnica que eu mais uso crescer do jeito que eu quero.

**Why P1**: A maestria de hoje sobe nível por alvo, premia a perfuração e passa por cima da escolha de eixo.

**Acceptance Criteria**:

1. MAE-01: WHEN a technique cast hits any target for the first time THEN its slot SHALL gain 1 mastery point, WHEN the same cast hits the boss for the first time THEN the slot SHALL gain 3 more, and WHEN a hit of that cast kills a common enemy THEN the slot SHALL gain 1 more per kill.
2. MAE-01: WHEN the same cast hits again a target or the boss already counted THEN the slot SHALL gain nothing for that hit.
3. MAE-02: WHEN the mastery points of a slot reach 25 and again 60 THEN the system SHALL add a pending free point page for that technique, at most 2 per `TechId` per run.
4. MAE-03: The mastery SHALL never change a technique level by itself, and `Loadout.upgrade` SHALL not be called by the mastery.
5. MAE-04: WHEN a mastery mark is reached THEN the HUD SHALL show the banner `"{name}: maestria 25!"` or `"{name}: maestria 60!"` for `RUN.bannerMs`.
6. MAE-05: The mastery bar under a slot SHALL be `round(slotW × (points − previous mark) / (next mark − previous mark))` wide, with previous mark 0 before 25, and SHALL be hidden after 60.
7. MAE-06: WHEN a technique is equipped in a slot THEN the mastery points of that slot SHALL return to 0, and a mark already granted to that `TechId` in the run SHALL not be granted again.
8. MAE-07: The `MASTERY` tuning SHALL hold `marks` 25 and 60, `castPoints` 1, `bossPoints` 3 and `killPoints` 1, and the debug snapshot SHALL report `tech.slots[i].mastery` as `{points, threshold}` with `threshold` the next mark or `null` after 60.

**Independent Test**: `choice-panel.smoke.mjs` com `tech=vermelho&mastery=24&noshop=1`: um acerto em um comum dá 25, o
banner `maestria 25!` aparece e o nível continua 1; teste puro com o Azul tocando o chefe 5 vezes numa conjuração dá
4 pontos.

---

### P1: Baú do chefe com escolha ⭐ MVP

**User Story**: Como jogador, quero abrir um baú depois do chefe e escolher entre a União pronta, dois pontos de eixo
ou o nível do Domínio, para a vitória sobre o chefe virar decisão.

**Why P1**: Substitui o prêmio cego de hoje e é a fonte grátis da União.

**Acceptance Criteria**:

1. BAU-01: The pure `core/bossChest.ts` SHALL build the candidates (each ready União, "2 pontos de eixo" when an owned item has an axis below the cap, "nível do Domínio" when a domain below level 3 is owned) and SHALL return all of them in an order drawn by `chestRng` when there are 3 or fewer, or 3 distinct ones drawn by `chestRng` when there are more.
2. BAU-02: The `chestRng` SHALL be a stream with its own salt in `core/run.ts`, and the same seed SHALL give the same chest.
3. BAU-03: WHEN the boss is defeated THEN the system SHALL add a pending boss chest page for the next konbini entry, the banner of the cleared round SHALL carry no reward text, and `core/bossReward.ts` and `runDirector.bossRewardUpgrade` SHALL no longer exist.
4. BAU-04: WHEN the União option is confirmed THEN the system SHALL apply the União as RXO-02 says without spending fragments.
5. BAU-05: WHEN the "2 pontos de eixo" option is confirmed THEN the system SHALL insert two open free point pages right after the chest page.
6. BAU-06: WHERE a F31 domain is owned below level 3, WHEN the domain option is confirmed THEN its level SHALL rise by 1.
7. BAU-07: IF the chest has no candidate THEN the system SHALL add no page.
8. BAU-08: WHEN the run starts with `?debug&chest=1` THEN a boss chest page SHALL be pending for the first konbini entry, and the snapshot page SHALL report the chest options by id (`uniao:roxo`, `pontos`, `dominio`).

**Independent Test**: `boss-chest.smoke.mjs` com `tech=azul,vermelho&axes=vermelho.potencia:3&chest=1`: a 1ª konbini
abre o baú com a União e "2 pontos de eixo"; escolher a União deixa o Roxo no slot sem gastar fragmento; com `chest=1`
e "2 pontos", as duas páginas `livre` vêm logo depois.

---

## Edge Cases

- IF one of the four techniques reaches level 5 while its branch choice is still pending THEN the Despertar SHALL turn on when the branch is chosen, and a Despertar page SHALL follow the branch page in the same panel.
- WHEN a free point page takes an item to level 2 THEN the branch page of that item SHALL be shown right after it.
- IF the boss chest União is chosen after a mastery free point of the Vermelho was spent in the same panel THEN the Vermelho points SHALL be reset by the União as RXO-02 says.
- IF the Roxo is formed and the Vermelho had a pending branch page THEN that page SHALL be skipped.
- WHEN the Concentrado is chosen with points already in `alvos` THEN those points SHALL stay counted in the level and SHALL have no effect.
- IF the Lapso orb or the Massa sphere is still held when the player is hit THEN it SHALL keep its hold until the key is released or its limit ends.
- WHEN the Andante orb and the Vermelho Máximo field overlap THEN the Azul pull SHALL win and the field SHALL keep its `chip` ticks, as in the F30.
- IF the Fenda finds no living common enemy within 120 px THEN no hit SHALL happen.
- WHEN the Retorno sphere comes back and the player has moved THEN it SHALL steer to the current player center every frame.
- WHEN the Roxo 200% drags common enemies and the flight ends at a wall THEN they SHALL be knocked down at the end point.
- IF the Eco ring and an Eco Negro Kokusen would hit the same enemy THEN it SHALL take only the Kokusen hit.
- WHEN a technique at 5 points gets a mastery mark THEN the free point page SHALL be skipped by CHC-08 and the mark SHALL still count toward the 2 per `TechId`.
- WHEN the round 1 shop opens THEN no axis card of the four techniques SHALL be offered (PRC-04 lock).
- WHEN a reroll draws the cards again THEN the `axisRng` SHALL draw again and the `choiceRng` SHALL not change.
- IF the run ends with a pending boss chest THEN it SHALL be dropped on the run reset.

---

## Implicit-Requirement Dimensions

| Dimension | Resolução |
| --- | --- |
| Input validation & bounds | EIX-01 (teto de 3 por eixo e 5 pontos), EIX-07 (`axes=`, `ramo=` e `chest=` inválidos ignorados), CHC-05/CHC-06 (só eixo abaixo do teto), RXO-05 (alcance até 320 px), EIX-02 (piso de 60%) |
| Failure / partial-failure states | CHC-08 (página sem alvo válido é pulada), BAU-07 (baú sem candidato), a compra continua "checar → gastar → aplicar" (SHOP-10); sem I/O, o resto é N/A |
| Idempotency / retry / duplicate handling | MAE-01 (cada conjuração conta uma vez, chefe uma vez), MAE-02/MAE-06 (marco uma vez por `TechId`), EIX-05 (componente proporcional uma vez por alvo por conjuração), DVG-05 e RXO-08 (toques por alvo limitados) |
| Auth boundaries & rate limits | N/A porque é jogo local; o teto de emissões já é da F30 (CRP-12) |
| Concurrency / ordering | CHC-02 e CHC-03 (ordem das páginas e inserção logo depois), edge cases da União com ponto da maestria e do ramo pendente do Vermelho |
| Data lifecycle / expiry | CHC-11 e edge case do baú pendente (somem no reset), AZL-08 (prisão de 500 ms), RXO-06 (massa de 1000 ms) |
| Observability | EIX-08, CHC-10, MAE-07 e BAU-08 (snapshot), MAE-04 (banner) |
| External-dependency failure | N/A porque não há dependência externa em jogo |
| State-transition integrity | EIX-03 (ramo uma vez por run no Nv 2, Despertar só com ramo), RXO-01/RXO-02 (União só com os limiares), CHC-02 (loja trancada até a última página), MAE-03 (maestria nunca muda nível) |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| EIX-01 | P1: Toda técnica segue o molde do Vermelho | - | Pending |
| EIX-02 | P1: Toda técnica segue o molde do Vermelho | - | Pending |
| EIX-03 | P1: Toda técnica segue o molde do Vermelho | - | Pending |
| EIX-04 | P1: Toda técnica segue o molde do Vermelho | - | Pending |
| EIX-05 | P1: Toda técnica segue o molde do Vermelho | - | Pending |
| EIX-06 | P1: Toda técnica segue o molde do Vermelho | - | Pending |
| EIX-07 | P1: Toda técnica segue o molde do Vermelho | - | Pending |
| EIX-08 | P1: Toda técnica segue o molde do Vermelho | - | Pending |
| EIX-09 | P1: Toda técnica segue o molde do Vermelho | - | Pending |
| EIX-10 | P1: Toda técnica segue o molde do Vermelho | - | Pending |
| EIX-11 | P1: Toda técnica segue o molde do Vermelho | - | Pending |
| EIX-12 | P1: Toda técnica segue o molde do Vermelho | - | Pending |
| AZL-01 | P1: Azul que puxa, anda ou prende | - | Pending |
| AZL-02 | P1: Azul que puxa, anda ou prende | - | Pending |
| AZL-03 | P1: Azul que puxa, anda ou prende | - | Pending |
| AZL-04 | P1: Azul que puxa, anda ou prende | - | Pending |
| AZL-05 | P1: Azul que puxa, anda ou prende | - | Pending |
| AZL-06 | P1: Azul que puxa, anda ou prende | - | Pending |
| AZL-07 | P1: Azul que puxa, anda ou prende | - | Pending |
| AZL-08 | P1: Azul que puxa, anda ou prende | - | Pending |
| AZL-09 | P1: Azul que puxa, anda ou prende | - | Pending |
| DSM-01 | P1: Desmantelar de cerco ou de corte fundo | - | Pending |
| DSM-02 | P1: Desmantelar de cerco ou de corte fundo | - | Pending |
| DSM-03 | P1: Desmantelar de cerco ou de corte fundo | - | Pending |
| DSM-04 | P1: Desmantelar de cerco ou de corte fundo | - | Pending |
| DSM-05 | P1: Desmantelar de cerco ou de corte fundo | - | Pending |
| DSM-06 | P1: Desmantelar de cerco ou de corte fundo | - | Pending |
| DSM-07 | P1: Desmantelar de cerco ou de corte fundo | - | Pending |
| DSM-08 | P1: Desmantelar de cerco ou de corte fundo | - | Pending |
| DVG-01 | P1: Divergente que espalha ou concentra | - | Pending |
| DVG-02 | P1: Divergente que espalha ou concentra | - | Pending |
| DVG-03 | P1: Divergente que espalha ou concentra | - | Pending |
| DVG-04 | P1: Divergente que espalha ou concentra | - | Pending |
| DVG-05 | P1: Divergente que espalha ou concentra | - | Pending |
| DVG-06 | P1: Divergente que espalha ou concentra | - | Pending |
| DVG-07 | P1: Divergente que espalha ou concentra | - | Pending |
| DVG-08 | P1: Divergente que espalha ou concentra | - | Pending |
| DVG-09 | P1: Divergente que espalha ou concentra | - | Pending |
| RXO-01 | P1: Roxo pela União nova e com caminho próprio | - | Pending |
| RXO-02 | P1: Roxo pela União nova e com caminho próprio | - | Pending |
| RXO-03 | P1: Roxo pela União nova e com caminho próprio | - | Pending |
| RXO-04 | P1: Roxo pela União nova e com caminho próprio | - | Pending |
| RXO-05 | P1: Roxo pela União nova e com caminho próprio | - | Pending |
| RXO-06 | P1: Roxo pela União nova e com caminho próprio | - | Pending |
| RXO-07 | P1: Roxo pela União nova e com caminho próprio | - | Pending |
| RXO-08 | P1: Roxo pela União nova e com caminho próprio | - | Pending |
| RXO-09 | P1: Roxo pela União nova e com caminho próprio | - | Pending |
| RXO-10 | P1: Roxo pela União nova e com caminho próprio | - | Pending |
| RXO-11 | P1: Roxo pela União nova e com caminho próprio | - | Pending |
| CHC-01 | P1: Um painel só por visita resolve tudo | - | Pending |
| CHC-02 | P1: Um painel só por visita resolve tudo | - | Pending |
| CHC-03 | P1: Um painel só por visita resolve tudo | - | Pending |
| CHC-04 | P1: Um painel só por visita resolve tudo | - | Pending |
| CHC-05 | P1: Um painel só por visita resolve tudo | - | Pending |
| CHC-06 | P1: Um painel só por visita resolve tudo | - | Pending |
| CHC-07 | P1: Um painel só por visita resolve tudo | - | Pending |
| CHC-08 | P1: Um painel só por visita resolve tudo | - | Pending |
| CHC-09 | P1: Um painel só por visita resolve tudo | - | Pending |
| CHC-10 | P1: Um painel só por visita resolve tudo | - | Pending |
| CHC-11 | P1: Um painel só por visita resolve tudo | - | Pending |
| MAE-01 | P1: Maestria que dá ponto à escolha | - | Pending |
| MAE-02 | P1: Maestria que dá ponto à escolha | - | Pending |
| MAE-03 | P1: Maestria que dá ponto à escolha | - | Pending |
| MAE-04 | P1: Maestria que dá ponto à escolha | - | Pending |
| MAE-05 | P1: Maestria que dá ponto à escolha | - | Pending |
| MAE-06 | P1: Maestria que dá ponto à escolha | - | Pending |
| MAE-07 | P1: Maestria que dá ponto à escolha | - | Pending |
| BAU-01 | P1: Baú do chefe com escolha | - | Pending |
| BAU-02 | P1: Baú do chefe com escolha | - | Pending |
| BAU-03 | P1: Baú do chefe com escolha | - | Pending |
| BAU-04 | P1: Baú do chefe com escolha | - | Pending |
| BAU-05 | P1: Baú do chefe com escolha | - | Pending |
| BAU-06 | P1: Baú do chefe com escolha | - | Pending |
| BAU-07 | P1: Baú do chefe com escolha | - | Pending |
| BAU-08 | P1: Baú do chefe com escolha | - | Pending |

**Coverage:** 75 total, 75 mapeados para tarefas, 0 sem tarefa (mapa em `tasks.md`, "Requirement Coverage").

---

## Testes e smokes

**Testes novos** (arquivo novo para todo sistema novo; nenhum teste da lista de exceções do `max-lines` cresce):
- `tests/data/techAxesTechniques.test.ts` (tabelas AZL-02, DSM-01, DVG-01, RXO-04, eixo dominante EIX-09 e nomes únicos
  EIX-10), `tests/core/techStatsTechniques.test.ts` (EIX-02 e o piso), `tests/core/blueBranch.test.ts`,
  `cutBranch.test.ts`, `divergentBranch.test.ts` e `purpleBranch.test.ts` (ramos e Despertares),
  `tests/core/choice.test.ts` (fila, ordem, inserção, pulo; CHC-02 a CHC-09), `tests/core/bossChest.test.ts`
  (BAU-01, BAU-02, BAU-07).
- Cada limiar testado nos dois lados do limite (L-010): Vermelho Nv 3 e Nv 4 na União; marcos 24/25 e 59/60; 3 e 4
  candidatos no baú; 1000 ms da Massa e 999 ms; 220 px do Lapso; 120 px da Fenda; 48 px do Eco; teto de 3 e de 5
  pontos.
- O adaptador que repassa o stat ao motor tem teste próprio, não só o puro (L-043): o raio que o `BlueTech` passa ao
  `BlueOrb`, o retângulo que o `CutTech` passa ao `CutFx` e o raio que o `PurpleTech` passa ao `PurpleOrb`.

**Testes refeitos:** `mastery` e `masteryBar` (marcos), `evolution` e `evolutionShop` (`minLevel`), `techniques`,
`techShop`, `loadout`, `techStats`, `shopAxes`, `shopPricing`, `kokusen` (o `D` pelo eixo), `buildCurve` (EIX-12,
RXO-11) e `debugApi` (campos novos). `bossReward.test.ts` sai junto com o `core/bossReward.ts`.

**Smokes novos:** `tech-axes`, `choice-panel` e `boss-chest`, todos com `?debug&hd=1&area=modular`.

**Smokes antigos que mudam** (cada um no passo que os quebra, citando o requisito): `techniques` e `tech` no passo 1
(custo 40 e recarga 2500 do Azul; AZL-01) e nos passos 2 e 3 (o nível do `tech=<id>:N` ignorado; EIX-07), `kokusen` no
passo 3 (DVG-03, DVG-04), `evolution` no passo 4 (`tech=azul,vermelho&axes=vermelho.potencia:3`; RXO-01), `shop-progress`
no passo 4 (carta de eixo do Azul; EIX-06) e no passo 5 (maestria por marco no lugar do "Nv 2!"; MAE-02, MAE-04,
MAE-07), `boss-punish` no passo 6 (o banner "Vermelho Nv 2!" do prêmio do chefe some; BAU-03).

**Smokes que rodam junto:** os três novos, `red-axes`, `cursed-body` e `shop-axes` (da F30), `shop`, `shop-progress`,
`run-loop`, `tech`, `techniques`, `red-anime`, `kokusen`, `evolution`, `fight`, `impact`, `feel`, `power`, `boss`,
`boss-punish`, `boss-victory`, `world-boss` e `vows`.

---

## Success Criteria

- [ ] Na mesma seed, o usuário joga o Azul Andante e o Azul Lapso, o Desmantelar Para Trás e o Clivar, o Divergente Eco
      e o Concentrado, o Roxo Massa e o Retorno, e sente a diferença de cada par; vê cada Despertar com banner.
- [ ] Numa run normal, forma o Roxo até a r8 e ainda tem carta para subir o Roxo.
- [ ] Na konbini, resolve ramo, ponto grátis, Despertar e baú numa sequência de páginas, sem painel extra por compra.
- [ ] A maestria dá o banner no 25 e no 60, e o nível só muda pelo ponto escolhido.
- [ ] Gate verde; os 3 smokes novos e os da lista verdes; a `TestScene` sem linha líquida a mais.
- [ ] A conferência no jogo, em movimento e nos dois lados, do orbe Andante, do Lapso andando, da esfera da Massa
      crescendo, do Retorno e do Eclipse, e dos cortes Para Trás, não só na prancha.
