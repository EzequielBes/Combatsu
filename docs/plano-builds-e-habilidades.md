# Plano: builds, upgrades por eixo e rejogabilidade da horda

Pedido do usuário em 14/10/2026, com dois esclarecimentos que valem acima do pedido:

- Do **Vampire Survivors** vem só a progressão: vagas com teto, vários níveis com bônus diferentes, evolução, combo,
  desbloqueio. Nada é automático: nenhuma arma que atira sozinha, nenhum familiar, nenhuma aura de dano, nenhuma
  subida de nível no meio da luta.
- Do **Sifu** vem só o sentimento do corpo a corpo (peso, leitura, defesa, postura). O moveset de hoje fica
  fechado: upgrade dá peso, impacto e efeito ao acertar, nunca golpe novo.
- De **Jujutsu Kaisen** vêm as funcionalidades: técnicas, votos, Black Flash, Reversa, Domínio, ferramentas.
- **Metroidvania** inspira a dificuldade em atos e a câmera e o cenário, sem copiar. Não há habilidade de movimento a
  desbloquear.
- **O loop:** horda sem fim, ver até onde se chega, morrer, rejogar com outra build.

Este documento parte do desenho A (horda-jjk, a mais bem avaliada), com a fundação e a disciplina de entrega do C e os
ramos e Duos do B, e corrige tudo o que os três juízes marcaram como obrigatório. Cada fase vira uma feature do
`tlc-spec-driven` antes de ser codada. A F29 está detalhada até o nível de spec.

**Revisão 2:** dois revisores adversariais acharam 33 problemas. Todos os de severidade alta e média foram resolvidos
no corpo do texto. A seção 8 ("Notas da revisão") diz o que mudou, onde, e o que foi ajustado em relação à correção
sugerida.

**Os números das tabelas de eixo são ponto de partida.** O teste de eixo dominante e o `expectedIncome` (seção 3.3)
calibram cada um na fase em que ele entra.

Base conferida no código: `DIFFICULTY.hpCap 3.0` e `damageCap 2.5` já existem (`tuning.ts:154`), só os dois
`perRound` estão em 0. O moveset tem `launch` no `ganchoAscendente`, mas **não há combo aéreo**: inimigo no chão
aceita 1 golpe corpo a corpo (`enemyBrain.receiveHit`, GND-05). Nenhum efeito deste plano promete juggle; o que
existe é derrubada, parede e o golpe no chão. O `H` está tomado pelo desenho de debug (`TestScene.ts:394`) e o `R`
pelo reroll da loja e pelo reinício da área.

---

## 1. Estrutura da build

### 1.1 Vagas e limites

| Categoria | Vagas | Níveis | Como entra | Tecla (WASD / setas) |
| --- | --- | --- | --- | --- |
| Técnicas amaldiçoadas | **até 3 do pool** (hoje 2) | Nv 1 a 6: compra + 5 pontos de eixo; **ramo no Nv 2** (o 1º ponto); **Despertar no Nv 5** (o 4º ponto) | loja, técnica inicial | `L`/`C`, `I`/`V`, **`O`/`B`** (novo) |
| Talentos (passivas com nível) | **até 6 do pool** | Nv 1 a 3; todo nível traz um sinal visível e um gatilho novo (seção 5.3) | loja | — |
| **Corpo Amaldiçoado** (trilha do corpo a corpo, seção 2.6) | inata, **fora do pool** | Nv 1 a 6 no molde das técnicas: ramo no Nv 2, Despertar no Nv 5 | Nv 1 desde a r1 (é o moveset de hoje); pontos pela loja e pelos pontos grátis | — (o moveset não muda) |
| Expansão de Domínio (ultimate) | **1** | Nv 1 a 3 | Baú do Véu (r3), baú do chefe, loja a partir da r8 | **`P`/`N`** |
| Arma amaldiçoada imbuída | **1** | Nv 1 a 4: compra + 3 pontos nos eixos do traço dela; evolução com catalisador | loja | — (fica guardada e muda os golpes de hoje, seção 5.4) |
| Relíquia | **1** | Nv 1 a 3 (Dedos de Sukuna: 1 a 5) | loja (o 4º e o 5º Dedo só caem do chefe Portador) | — |
| Atributos (vida, força, agilidade, ímã, sorte, energia, fluxo) | sem vaga | os tetos de hoje | loja | — |
| Votos vinculativos | sem vaga, 1 por chefe | sem nível | painel depois do chefe (F24) | — |
| Duos | sem vaga, **no máximo 4 por run** | sem nível | carta rara | — |

**Pool de habilidades: 7 vagas compartilhadas** entre técnicas (no máximo 3, o limite das teclas) e talentos (no
máximo 6):
- o feiticeiro fica com 3 técnicas e 4 talentos;
- o lutador fica com 1 técnica e 6 talentos;
- o meio-termo fica com 2 técnicas e 5 talentos.

A escolha deixa de ser só "quais itens" e passa a ser "mais técnica ou mais corpo a corpo". A identidade do arquétipo
aparece na loja da r2 em diante, não só num voto depois do chefe.

**Por que 3 técnicas e não 4:**
- A mão direita já tem J, K, U, L e I.
- Com 3 técnicas e o Domínio, cada esquema ganha só 2 teclas vizinhas: `O` e `P` no WASD, `B` e `N` nas setas.
- Nenhuma tecla é acorde, e todas estão livres no jogo e no debug.
- Acorde está descartado: o `TechCaster` dispara no `JustDown` e a `CastMachine` recusa a segunda conjuração (CAST-08), então `L+I` conjuraria o slot 1.

**O limite pesa:**
- Habilidade nova (técnica ou talento) custa **+8 fragmentos por vaga já ocupada no pool**. Com a técnica inicial, a
  2ª habilidade custa +8 e a 7ª custa +48.
- Arma, relíquia e Domínio têm 1 vaga cada e não pagam esse acréscimo.
- Com o pool cheio, ou com a categoria no máximo (3 técnicas, 6 talentos), a loja não oferece mais item novo dela,
  só melhoria (regra do VS).

### 1.2 Como o limite aparece

- **HUD de combate** (`EnergyHud`):
  - 3 ícones de técnica e o ícone do Corpo Amaldiçoado, cada um com 5 pontinhos de nível e a borda dourada no
    Despertar;
  - a barra de Domínio embaixo da energia;
  - vaga vazia aparece tracejada.
- **Faixa de talentos** (`TalentStrip`, classe própria criada no `UiSetup`; o `Hud.ts` não cresce): até 6 ícones
  pequenos de talento, que piscam quando o gatilho do talento dispara.
- **Loja:** uma faixa nova, `BuildBar` (classe própria, porque o `ShopPanel` está na exceção de complexidade), mostra `Habilidades 5/7 (Técnicas 2/3) · Corpo Nv3 · Arma Nv2 · Relíquia — · Domínio Nv1`, com ícone e pontinhos de nível.
- **Carta da loja:**
  - item novo leva a etiqueta **"OCUPA VAGA (2/3 → 3/3)"**;
  - melhoria leva **"Nv 3 → 4"**;
  - a moldura muda de cor por nível: cinza, azul, roxo e dourado no Despertar.
- **Abandonar** (troca de rumo sem prender o jogador num erro):
  - na loja, **`T`** abre a bandeja da `BuildBar`;
  - `A`/`D` escolhe o item;
  - `W`/`S` (↑/↓) troca o **eixo-foco** do item escolhido (estrela no eixo; seção 2.1), sem confirmação;
  - `Enter` pede confirmação ("Abandonar Vermelho? +38 fragmentos") e o segundo `Enter` confirma;
  - `T` fecha;
  - devolve **40%** do que foi gasto no item;
  - não usa `R` (reroll) nem segurar tecla.

---

## 2. Modelo de upgrade

### 2.1 Regra das técnicas

| Nível | O que é | De onde vem |
| --- | --- | --- |
| Nv 1 | a técnica base | loja, técnica inicial |
| Nv 2 a 6 | **1 ponto de eixo** cada; 6 eixos por técnica, **teto de 3 pontos por eixo** | carta da loja (**2 eixos à escolha na própria carta**) ou ponto grátis (3 eixos à escolha) |
| Ramo, ao chegar no **Nv 2** (o 1º ponto) | escolha entre **A e B, que se excluem** e mudam o comportamento | sempre grátis, no painel de escolha da próxima visita |
| Despertar, ao chegar no **Nv 5** (o 4º ponto) | a mutação do ramo tomado (1 por ramo, 2 por técnica). Todo Despertar tem um **componente proporcional**: 3 a 5% do HP máximo do alvo (chefe no máximo 1%), 1 vez por conjuração | automático, com banner e câmera lenta de 350 ms |
| Nv 6 (o 5º ponto) | mais um ponto de eixo, sem mutação nova | carta ou ponto grátis |

Os limiares seguem a linha do tempo da run, não a do VS: quem morre entre a r6 e a r12 já viu ramo, Despertar e
União (metas testáveis na seção 3.3).

**Como o eixo é escolhido (no máximo 1 painel por visita):**
- **Na loja**, a carta de melhoria é uma por item, com id de técnica (sem `ShopEntryId` composto, lacuna K). Ela mostra
  **2 eixos**, e o jogador escolhe com `W`/`S` (↑/↓) na carta selecionada antes de confirmar, sem painel novo:
  "Vermelho Nv 3 · ▲ **Escala** (raio 120 → 144) / ▼ Potência (35 → 40)". `W`/`S` não têm uso na loja hoje (a loja usa
  1 a 3, R, Enter, J, A e D).
  - Um dos 2 eixos é o **eixo-foco** do item enquanto ele estiver abaixo do teto. O jogador marca o foco na bandeja da
    `BuildBar` (seção 1.2); sem marca, o foco é o eixo com mais pontos, com empate pela ordem da tabela.
  - O outro eixo sai de um stream novo, `axisRng`, só entre os eixos abaixo do teto.
  - A carta 0 é a melhoria do **item-foco** (o marcado na bandeja; sem marca, a técnica de maior nível) em 60% das
    lojas, e de outro item possuído nas demais, também pelo `axisRng`.
  - **Meta em teste puro:** com 5 itens possuídos, o eixo-foco da técnica de maior nível aparece em pelo menos 60% das
    lojas, medido em 1000 seeds.
  - O `OfferView` ganha `axes: [AxisId, AxisId]`, e a compra passa o eixo escolhido.
- **Pontos grátis** (maestria, baú, selo de elite), **ramo** e **Despertar** acumulam durante a rodada. Abrem **um único painel de escolha** (`ChoicePanel`, no molde do `VowPanel`) na entrada da konbini, com uma página por pendência.
  - Ponto grátis mostra 3 eixos à escolha, sorteados pelo `choiceRng`; um deles é sempre o eixo-foco.
  - O ramo mostra as 2 opções.
- **5 pontos para 18 graus possíveis:** ninguém maximiza tudo, e o "Vermelho canhão" e o "Vermelho metralhadora" são
  builds diferentes que o jogador **monta de propósito**, não por sorte.
- **O que sai do código:** `LEVEL_FACTOR`, o "−5 de custo por nível" e o teto 3 espalhado (restrição 5). O nível passa a ser derivado: `1 + pontos`.

**Equilíbrio entre eixos (vale para toda técnica):**
- **Piso de custo:** somando todas as fontes (Eficiência, Seis Olhos, fluxo, votos, Limite Rompido), o custo final
  nunca fica abaixo de **60% da base** da técnica. O piso mora em `buildEffects`.
- **Gargalo declarado por técnica:** a energia regenera 8/s (16/s no teto do atributo) numa barra só para todas as
  técnicas. Cada técnica declara nos dados se vive presa à recarga ou à energia:
  - o Vermelho fica preso à recarga: custo 45 → 30 e recarga 3000 → 4500 ms, e os 30 de energia voltam em 3,75 s;
  - o Azul fica preso à energia: custo 35 → 40 e recarga 4000 → 2500 ms;
  - Desmantelar e Boogie ficam no meio.

  Assim a Recarga vale no Vermelho, a Eficiência vale no Azul, e as duas casam com o atributo fluxo.
- **Recarga no 3º ponto:** além do número, o abate com a técnica devolve 30% da recarga.
- **Alcance travado em 320 px:** a câmera mostra 640×360 de mundo (`camera.ts:9-10`), cerca de 320 px à frente do
  player. Nenhuma base e nenhum eixo passa disso. O Vermelho base cai de 420 para 320 px, e a Trajetória sai do jogo,
  trocada pela Perfuração, que se vê na tela.
- **Teste de eixo dominante** (puro, em `tests/data/techAxes.test.ts`): no ritmo de referência da seção 5.6, nenhum eixo
  com 3 pontos dá mais que **1,35×** o dano sustentado do eixo mediano da mesma técnica.

**Talentos, relíquia, Domínio e votos** têm tabela fixa por nível, no molde do VS, mas todo nível de talento traz um
sinal visível e um gatilho novo (seção 5.3).

**A arma tem 3 pontos de eixo, teto de 2 por eixo, e os eixos mexem no traço próprio dela** (seção 5.4).

### 2.2 Vermelho (o exemplo do usuário)

Base de hoje, com as duas mudanças da seção 2.1 marcadas:
- tiro 30, detonação 25, força 8;
- custo **30** (hoje 45), recarga **4500 ms** (hoje 3000): o gargalo passa a ser a recarga;
- sinal 250 + carga 350 ms;
- detonação de 96 px, orbe de 12 texels, sensor 6;
- 760 px/s, alcance **320** (hoje 420); atravessa os comuns (RED-06/08/09);
- repulsão de 80×48 com dano 4 cru (`red.ts:154`).

| Eixo | 0 pt | 1 pt | 2 pt | 3 pt | O que se vê |
| --- | --- | --- | --- | --- | --- |
| **Potência** (dano) | 30 / 25 / força 8 | 35 / 29 / 9 | 40 / 33 / 10 | 45 / 37 / 11 | núcleo mais branco, +1 anel de choque por ponto, número maior, +10 ms de hitstop na detonação por ponto; a repulsão passa por `loadout.damage` e escala junto |
| **Escala** (tamanho) | 96 px, orbe 12, sensor 6 | 120, 14, 7 | 144, 16, 8 | 168, 18, 9 | o orbe e a esfera crescem com a hitbox (`redDetonation` lê o stat, some a cópia 96) |
| **Conjuração** | 250 + 350 = 600 ms | 200 + 280 = 480 | 165 + 225 = 390 | 125 + 175 = 300 | sinal mais curto, as 3 texturas de carga trocam no ritmo do `chargeMs` resolvido (`red.ts:91` lê o stat) |
| **Eficiência** (energia) | 30 | 26 | 22 | 18 (o piso de 60%) | marcas na barra de "cabe mais uma" |
| **Recarga** | 4500 ms | 3600 | 2900 | 2300, e o abate com o Vermelho devolve 30% da recarga | o anel do ícone volta mais rápido; casa com o fluxo |
| **Perfuração** (troca a Trajetória) | atravessa comuns | cada comum atravessado solta um estilhaço micro de 6 num vizinho a até 60 px | estilhaço 9, em 2 vizinhos | estilhaço 12, e atravessa elite sem detonar | estilhaços vermelhos saindo de cada alvo, rastro de anéis mais longo; tudo dentro dos 320 px da tela |

**Ramo no Nv 2 e Despertar no Nv 5:**

| Ramo | Efeito | Despertar | Efeito |
| --- | --- | --- | --- |
| **A: Ricochete** | o orbe para de atravessar: detona no 1º inimigo que tocar e rebate 1 vez para o inimigo mais próximo num raio de 200 px. Parede, chão e chefe também contam como rebote. A 2ª detonação dá 70% do dano | **Fliperama** | rebate até 3 vezes em qualquer alvo (inimigo, parede, chão ou chefe), cada detonação acelera o orbe em 15%, e a 3ª detonação tira 4% do HP máximo (chefe 1%) |
| **B: Contido** | segurar a tecla prende o orbe no ar por até 1,2 s; soltar detona com raio ×1,4 (pede `slotHeld`) | **Vermelho Máximo** | núcleo preto e vermelho; a detonação **derruba** todos no raio, tira 4% do HP máximo de cada um (chefe 1%), e um campo de 1,2 s empurra para fora (chip de 3 a cada 200 ms); inimigo jogado na parede fica atordoado 600 ms |

O Ricochete funciona na travessia modular da rua, que é o modo padrão (`stage.ts:190-194`) e quase não tem parede ao
alcance: o rebote principal é de inimigo para inimigo.

Exemplos:
- **Canhão** = Potência 3 + Escala 2.
- **Metralhadora** = Recarga 3 + Conjuração 2, com o fluxo no teto: recarga de 2300 ms, sinal de 390 ms, e cada abate
  devolve 30% da recarga.

### 2.3 Azul

Base: raio 130, puxão 150 px/s, tique de 5 a cada 250 ms, vida 1400 ms, implosão 10, custo **40** (hoje 35), recarga
**2500** (hoje 4000). O gargalo passa a ser a energia (seção 2.1).

| Eixo | 0 | 1 | 2 | 3 | O que se vê |
| --- | --- | --- | --- | --- | --- |
| Gravidade (raio) | 130 | 160 | 190 | 220 | halo e distorção proporcionais ao raio (hoje são 40 e 58 fixos) |
| Puxão | 150 px/s | 190 | 230 | 270, puxa armado e elite (chefe nunca) | linhas de vácuo mais densas |
| Duração | 1400 ms | 1800 | 2200 | 2600 | pulsa por mais tempo |
| Implosão | 10, tique 5 | 18, 6 | 26, 7, derruba | 34, 8 | lampejo maior, tremor a partir de 2 |
| Eficiência | 40 | 34 | 29 | 24 (o piso de 60%) | marcas na barra |
| Recarga | 2500 | 2100 | 1800 | 1500, e o abate com o Azul devolve 30% da recarga | anel do ícone |

- O tique é `chip` desde a F29: sem hitstop, sem `freeze`, sem `hitstun` e sem interromper o ataque do inimigo
  (seção 4, faixas de acerto).
- **Ramos:**
  - A: **Andante**, o orbe fica 80 px à frente e acompanha o player, com −30% de duração. Puxa os inimigos para o soco.
  - B: **Lapso**, segurar a tecla move o ponto até 220 px antes de soltar.
- **Despertares:**
  - **Azul Máximo** (Andante): implosão ×3, derrubada e 4% do HP máximo de cada preso (chefe 1%).
  - **Âncora** (Lapso): prende até o chefe por 0,5 s, e o chefe preso toma 1% do HP máximo.

### 2.4 Desmantelar (o Corte de hoje)

Base: 3 cortes a 0, 60 e 120 ms, faixa de 60 a 180 px, altura 48, dano 10, custo 30, recarga 2500.

| Eixo | 0 | 1 | 2 | 3 |
| --- | --- | --- | --- | --- |
| Cortes | 3 | 4 | 5 | 6 |
| Alcance | longe 180, altura 48 | 220, 56 | 260, 64 | 300, 72 (o `CutFx` lê o stat) |
| Afiação | 10 | 13 | 16 | 19 |
| Cadência | intervalo 60 ms, sinal 150 | 45, 120 | 35, 100 | 25, 80 |
| Eficiência | 30 | 25 | 20 | 15 |
| Recarga | 2500 | 2000 | 1600 | 1200 |

- **Ramos:**
  - A: **Para Trás**, metade dos cortes sai atrás (anticerco).
  - B: **Clivar**, cada corte soma **2%** do HP máximo do alvo (0,5% no chefe). O componente por corte fica só neste
    ramo: não soma com o Despertar, e nenhuma receita exige o Clivar (seção 5.7).
- **Despertares:**
  - **Desmantelar do Rei** (Para Trás): os cortes partem projéteis, e o último corte tira 4% do HP máximo (chefe 1%).
  - **Fenda** (Clivar): o corte que mata abre uma fenda que corta 1 vez o inimigo mais próximo a até 120 px. A fenda
    dá o dano normal do corte, sem o componente proporcional do Clivar.

O Clivar deixa de ser a única fonte que acompanha o HP sem teto. A ativação do Domínio, o Kokusen escalado e o
componente proporcional de cada Despertar também acompanham, todos com teto (seções 2.1, 5.2 e 5.6).

### 2.5 Boogie Woogie (técnica nova, leva 1)

Base: palma que troca o player de lugar com o inimigo, o orbe próprio ou o projétil mais próximo à frente. Alcance 220, custo 20, recarga 2500, sinal 80 e soltura 60 ms.

| Eixo | 0 | 1 | 2 | 3 |
| --- | --- | --- | --- | --- |
| Alcance | 220 | 260 | 290 | 320 (o teto da tela) |
| Tontura do trocado | 0 | 250 ms | 400 | 600 |
| Cargas guardadas | 1 | 2 | 3 | 3, e a recarga de cada carga −20% |
| Choque da troca (chip nos dois pontos) | 0 | 8 | 14 | 20 |
| Eficiência | 20 | 16 | 12 | 8 |
| Recarga | 2500 | 2000 | 1600 | 1200 |

- **Ramos:**
  - A: **Palma Falsa**, segurar finge a troca, e os inimigos perto erram o próximo golpe (janela de Contra de 400 ms).
  - B: **Dupla Palma**, 2 trocas seguidas sem recarga entre elas.
- **Despertares:**
  - **Finta Total** (Palma Falsa): a Palma Falsa cancela o ataque em preparo do chefe, 1 vez a cada 10 s, e o chefe
    enganado toma 1% do HP máximo.
  - **Eco da Palma** (Dupla Palma): a 2ª troca deixa um eco que troca de volta em 1 s. O player entra no cerco, bate e
    volta sozinho, e o trocado pelo eco toma 4% do HP máximo (chefe 1%). Não depende de outra técnica.
- **Regra de segurança** (`core/swap.ts`, puro):
  - o destino só vale se a caixa do player couber sem sobrepor corpo estático do Matter nem módulo do mundo; senão a troca é recusada e a energia volta;
  - o chefe troca de lugar, mas não fica tonto.

**Punho Divergente e Vazio Roxo seguem o mesmo molde:**
- **Divergente:** 2º impacto 18 → 36, alvos 1 → 3, Zona 8 → 14 s, energia devolvida pelo Kokusen 30 → 54, eficiência e recarga.
  - O Kokusen passa a multiplicar o golpe que o disparou (seção 5.2, revisão do KOK-06).
  - Ramos: Eco (anel de 48 px no 2º impacto) ou Concentrado (1 alvo, ×2).
  - Despertares: **Eco Negro** (Eco: o anel do 2º impacto também tenta Kokusen, com a janela normal e o teto de
    +30 ms) e **Impacto Único** (Concentrado: o 2º impacto tira 4% do HP máximo, chefe 1%).
- **Roxo:** largura, alcance (até 320), carga, potência, eficiência e recarga. **Entra na loja como carta de nível**, o que fecha a armadilha 11.
  - Sai da União de Vermelho Nv 4 com Azul em qualquer nível (seção 5.7) e continua alcançável até a r8, como hoje.
  - Os ramos e os Despertares do Roxo entram na spec da F33, sob as regras de Despertar e de combo deste plano.

### 2.6 Corpo Amaldiçoado (a trilha do corpo a corpo)

O corpo a corpo, que é o coração do jogo no estilo Sifu, ganha uma trilha no mesmo molde das técnicas, **sem golpe
novo**: o moveset de hoje (jab, direto, gancho, chutes, Contra, finalizador, guarda, parry e esquiva) não muda.
- É inata e fica fora do pool: o Nv 1 é o moveset de hoje, desde a r1.
- Os pontos vêm da carta da loja (2 eixos à escolha, preço de ponto de técnica) e dos pontos grátis.
- O atributo Força continua (sem vaga), e o Impacto do Corpo multiplica por cima dele.

| Eixo | 0 | 1 | 2 | 3 | O que se vê |
| --- | --- | --- | --- | --- | --- |
| **Impacto** (dano corpo a corpo) | ×1 | ×1,1 | ×1,2 | ×1,3 | número maior; cada ponto conta 1 ponto de força no patamar (seção 4) |
| **Peso** (recuo e derrubada) | — | recuo +20% | +40%, o golpe forte derruba o comum | +60%, a derrubada joga na parede (atordoa 600 ms) | o alvo voa mais e levanta poeira |
| **Ritmo** (recuperação) | — | recuperação −8% | −15% | −22% | pós-imagem de 1 quadro no 3º ponto. Mexe só na recuperação: o startup e as janelas de defesa e do Kokusen não mudam |
| **Alcance** (hitbox) | — | +6 px | +10 | +14 | rastro mais longo |
| **Fluxo** (energia por golpe) | +3 (`CE.meleeGain`) | +4 | +5 | +6 | faísca azul do alvo até a barra |
| **Fúria** (golpes seguidos sem levar dano) | — | +3% por golpe, até 15% | +4%, até 24% | +5%, até 35% | aura laranja que cresce e some ao levar dano |

| Ramo (Nv 2) | Efeito | Despertar (Nv 5) | Efeito |
| --- | --- | --- | --- |
| **A: Cadência** | todo 4º golpe seguido que acerta é decisivo: faixa `decisive` e +50% de dano | **Martelo Negro** | o decisivo derruba em área de 48 px e tira 4% do HP máximo de cada atingido (chefe 1%) |
| **B: Onda do Punho** | o golpe forte que acerta solta uma onda curta de 80 px à frente (acerto micro, 40% do dano do golpe), pelo emissor de golpe (seção 6) | **Punho que Rasga** | a onda atravessa todos e chega a 160 px; com a Fúria cheia, sai dupla |

**Meta em teste** (no `expectedIncome`): numa build só de corpo a corpo, o número de golpes para derrubar o comum na
r19 é no máximo o da r1.

### 2.7 Maestria (lacuna D)

- **1 ponto por conjuração que acerta** (não por alvo, o que acaba com o abuso da perfuração do Vermelho), +1 por abate com a técnica, +3 por acerto no chefe.
- **Marcos em 25 e 60.** Cada marco dá 1 ponto grátis à escolha, no painel. São **no máximo 2 por técnica**.
- A maestria deixa de subir nível pelo caminho da compra: a carta de nível continua viva.

---

## 3. Fontes de upgrade e economia

### 3.1 Fontes (nenhuma no meio da luta)

| Fonte | O que dá | Quando |
| --- | --- | --- |
| **Loja** (konbini, 1 por rodada) | **4 cartas** (hoje 3; `ShopInput.buySlot` passa a `0..3` e entra a tecla `4`, que o debug não usa na loja). Carta 0: melhoria do item-foco em 60% das lojas, de outro item possuído nas demais, sempre com 2 eixos à escolha. Carta 1: item novo enquanto houver vaga. Cartas 2 e 3: sorteio livre (os eixos delas saem do `axisRng`) | toda rodada |
| **Maestria** | 1 ponto grátis por marco, no máximo 2 por técnica | durante a luta; escolhido na konbini |
| **Baú do Véu** | escolher 1 de 2 Domínios no Nv 1, sorteados entre os 3 da leva 1 (Santuário, Jackpot, Amplificação) | **fim da r3**, sempre: quem morre cedo também experimenta a ultimate |
| **Baú do chefe** (`core/bossChest`, `chestRng`; substitui o `bossRewardSlot`) | escolher 1 de 3: evolução ou União pronta grátis, 2 pontos de eixo à escolha, nível do Domínio, nível de talento | r5, r10, r15... |
| **Selo de elite** (F38) | 1 ponto grátis à escolha | ~1 por rodada a partir da r8 |
| **Votos** | poder com custo | depois de cada chefe, como hoje |

### 3.2 Preços (base, antes da inflação)

| Item | Preço |
| --- | --- |
| Técnica nova | comum 20, rara 26, +8 por vaga ocupada no pool |
| Ponto de eixo de técnica ou do Corpo (na loja) | 12 + 4 × pontos já postos nela: 12, 16, 20, 24, 28 |
| Talento | novo 18, +8 por vaga ocupada no pool; Nv 2 16; Nv 3 24 |
| Arma | nova 22; pontos 16, 22, 28 |
| Relíquia | nova 20; níveis 16, 22 (Dedos: 16 + 6 × dedos; o 4º e o 5º só do chefe Portador) |
| Domínio | Nv 1 só pelos baús; Nv 2 40, Nv 3 50 (loja a partir da r8) |
| Atributos, cura, reroll | como hoje |
| Evolução / União | 60 (grátis no baú) |
| **Limite Rompido** (só com todas as vagas cheias e no teto) | (30 + 10 × compras daquela carta), com inflação: +2% de dano, +3% de área de técnica, −2% de custo (conta no piso de 60% da seção 2.1), +3% de vida |

- **Inflação da konbini:** preço × (1 + 0,06 × (r − 1)). Na r10 é ×1,54 e na r20 ×2,14.
- **Trava por rodada:** ponto de eixo a partir da r2; o 3º ponto da mesma técnica a partir da r4; o 5º a partir da r6.
  Com isso o ramo pode sair na r2 e o Despertar (4º ponto) na r5. Substitui o `techGate`.

### 3.3 A conta (números do critic, item C, mais as faixas seguintes)

Renda (fragmento 2 a 4 por abate, valor `1 + floor((r−1)/5)`, onda com teto de 20; o enxame da F38 é calibrado para não mudar o total):

| Faixa | Renda | Acumulado |
| --- | --- | --- |
| r1 a r10 (com 2 chefes) | ~600 | 600 |
| r11 a r15 (valor 3) | ~765 | ~1365 |
| r16 a r20 (valor 4) | ~1020 | ~2385 |

Build cheia do feiticeiro: 3 técnicas × 6 + 4 talentos × 3 + 5 pontos do Corpo + arma 4 + relíquia 3 + Domínio 3 =
**45 níveis de vaga**, que custam **~1035 de base**: os ~820 da versão anterior, mais ~100 dos pontos do Corpo e
~115 do acréscimo do pool (+8 por vaga ocupada, contra +6 por categoria). O lutador (1 técnica, 6 talentos) tem 39
níveis e custa parecido. Os 28 níveis de atributo custam **~595 de base**.

| Até a r10 (build equilibrada) | Níveis | Base |
| --- | --- | --- |
| 2 técnicas novas (a inicial é grátis), 2ª e 4ª vaga do pool | 3 | 72 |
| 2 talentos, 3ª e 5ª vaga do pool | 2 | 84 |
| 5 pontos de técnica comprados | 5 | 76 |
| 2 pontos do Corpo | 2 | 28 |
| Arma nova + 1 ponto | 2 | 38 |
| Relíquia | 1 | 20 |
| Atributos (vida 2, força 2, energia 1, fluxo 1, agilidade 1) | 7 | ~100 |
| **Subtotal comprado** | 15 de vaga + 7 de atributo | **~418 × ~1,38 de inflação média ≈ 577**, mais ~30 de reroll ≈ 607 |
| Grátis: maestria ~3, Baú do Véu 1, baú da r5 e da r10 2, selos ~1 | ~7 de vaga | — |

- **Resultado na r10:** cerca de 22 de 45 níveis de vaga, ou **~49% da build**, dentro da faixa de ~50% ± 8%.
  Uma build equilibrada já tem pelo menos 1 ramo e chega perto do 1º Despertar.
- **Linha do tempo de uma build focada em 2 técnicas** (com os limiares novos):
  - 1º ramo na r2 ou r3 (o 1º ponto, 12 de base);
  - Roxo ou a 1ª Evolução entre a r5 e a r8 (peça principal Nv 4, ou seja, 3 pontos, mais o catalisador em qualquer
    nível);
  - 1º Despertar entre a r5 e a r8 (4º ponto, liberado na r4 pela trava do 3º ponto).
- **r11 a r20:**
  - faltam ~23 níveis de vaga, dos quais ~10 vêm de graça (baús r15 e r20, ~5 selos, maestria da 3ª técnica);
  - comprados restam ~370 de vaga e ~495 de atributo, ou ~865 de base;
  - com inflação média de ×1,87 isso vira ~1615, mais ~150 de reroll e cura, contra ~1785 de renda.
  - **A build fecha por volta da r20 a r21.** Se o `expectedIncome` der depois da r22, o primeiro ajuste é o preço do
    ponto do Corpo.
- **Depois disso entra o Limite Rompido**, o sumidouro da horda sem fim:
  - cada carta dá menos de 3%, e o preço sobe 10 por compra mais a inflação;
  - com ~300 de renda por rodada na r21+, saem 3 a 4 cartas por rodada;
  - o HP do inimigo sobe 6 pontos-base por rodada até o teto ×3 (r34), e a partir dali cada ato soma ×1,15 sem teto.
  - **A run termina aí, que é o objetivo do loop.**
- **Calibração em teste:** o `expectedIncome` ganha cenários de build ("equilibrada", "2 técnicas", "corpo a corpo") e confere:
  - ~50% de níveis de vaga na r10, com tolerância de ±8%;
  - build fechada entre a r18 e a r22;
  - a razão entre o dano efetivo e o HP do inimigo atinge o pico entre a r20 e a r24 e cai depois;
  - a build focada chega ao 1º ramo até a r3, ao Roxo ou à 1ª Evolução até a r8, e ao 1º Despertar até a r10;
  - na build só de corpo a corpo, os golpes para derrubar o comum na r19 são no máximo os da r1;
  - o eixo dominante (seção 2.1) nunca passa de 1,35× o mediano.

### 3.4 O que muda na economia

- Uma carta a mais por loja.
- O ponto de eixo fica mais barato que o nível de hoje (26 a 60).
- Maestria e chefe viram decisão, não upgrade cego.
- O Abandonar devolve 40%.
- O pool compartilhado faz a vaga custar mais a cada habilidade, seja ela técnica ou talento.
- A inflação e o HP crescente substituem a economia "plana" (AD-014 revisado na **F30**, junto com os eixos, e não
  antes deles).

---

## 4. Sensação de poder

Duas peças de base:
- **`core/statSheet.ts` com o `StatsDirector`:** dono único dos multiplicadores (restrição 4).
- **`TechStats` resolvido pelo `Loadout`:** a vista lê o mesmo número que o jogo (restrição 8).

Em todo o plano, multiplicador novo entra no agregador puro `core/buildEffects.ts` e nunca escreve direto em `damageMul`, `vowDamageMul`, `costMul`, `damageTakenMul` nem `setMaxHp`. Isso vale para talentos, eixos, Dedos, Hakari, Limite Rompido e votos novos.

| Tipo | O que o jogador VÊ e SENTE | Onde entra no código |
| --- | --- | --- |
| **Força** (atributo, Impacto do Corpo, Manoplas, Punho Pesado) | **Escala contínua por ponto de força** (teto de 10 pontos): impacto +5% (de ×1,0 a ×1,5), tranco de câmera +0,3 px (de 4 a 7 px), `force` e deslize +3% (até ×1,3), rastro +1 px a cada 2 pontos (até +5). Todo ponto comprado muda algo na tela.<br>**Patamares como saltos** em 2, 5 e 8 pontos:<br>**Patamar 1:** tom azul claro.<br>**Patamar 2:** tom vermelho, brasas nas mãos em repouso e tremor também no golpe forte comum. **A Força 5 sozinha chega aqui.**<br>**Patamar 3:** tom preto e vermelho e chama no punho. As Manoplas são o caminho do patamar 3, não a porta do 2.<br>**Hitstop por patamar:** forte +10, +20 e +30 ms sobre a base 50/90 (o `hitstop.test` não muda).<br>**Leva 2:** no patamar 3, o golpe forte que derruba racha o chão por 1,5 s e solta a onomatopeia ドン desenhada em HD (o jogo não tem áudio) | `core/power.ts`; `POWER_FEEL` em `data/feel.ts`; `force` em `strikes.ts:268-274`, pelo hook `Player.strikeMods` (troca o `damageMul` de `Player.ts:84` e devolve `{damage, force}`, sem campo novo); `combat.ts:89` (bônus de hitstop); `core/cameraKick.ts` ganha `kick(dx, dy, px = CAMERA_FEEL.kickPx)`, chamado em `impactFx.ts:83`; `Enemy.slideBy(tier, dir, scale = 1)` e `EnemyMovement.slideBy` (deslize); `CursedFx.shapeAt` (`scale`); `fx.ts:183` (`shake(ms, int)`); `toneOf(s)` em `cursedImpact.ts:~150`; `powerAuraDirector` (membro do `StatsDirector`) com `CursedFlame.tick(power)` |
| **Dano** (Potência, Afiação, talentos) | **Número de dano.** O tamanho segue a magnitude. A cor segue o tipo: golpe branco, técnica azul, crítico amarelo, Kokusen preto e vermelho com "pop", micro azul pequeno, chip cinza pequeno. Acertos no mesmo alvo em 300 ms viram um número só | `core/damageNumber.ts` (puro) e `game/DamageNumbers.ts` (base `FloatTexts`, dono o `UiSetup`), chamados em `combat.ts:79` e `effects.ts:33`; teto próprio de 12 vivos, fora do `fxCap` 40 |
| **Tamanho** (Escala, Gravidade, Alcance) | Orbe, esfera, halo e risco do tamanho real da hitbox | `RedOrb`, `redDetonation:26`, `BlueOrb:32,36`, `CutFx:8,10`, `PurpleOrb` leem `TechStats` |
| **Cadência** (Conjuração, Recarga) | Sinal mais curto, aura acende e apaga mais rápido, anel do ícone volta mais rápido; no 3º ponto de Conjuração, pós-imagem de 1 quadro na soltura | `cast.ts:26 msFor` e `startCooldown` leem o stat; `red.ts:91` e `purple.ts:53` também; `Fx.afterimage` |
| **Custo** (Eficiência, fluxo) | Marcas de "cabe mais uma" na barra para a técnica do último slot usado; ao segurar a tecla, aparece o trecho que vai ser gasto | `EnergyHud` |
| **Quantidade** (cortes, cargas, pregos, cães) | Mais objetos na tela ao mesmo tempo | listas nos adaptadores; `techObjects` aberto (os 3 smokes acompanham) |
| **Talentos** | Ícone na `TalentStrip` que pisca quando o gatilho dispara, e o sinal próprio de cada nível (seção 5.3) | `game/TalentStrip.ts` (F35) |
| **Build inteira** | **Aura de build** em 5 estágios (0 a 4, pela fração de níveis de vaga: 15, 35, 60 e 85%), de fiapos azuis nos pés a chama inteira. **Com 3 ou mais Dedos de Sukuna**, a chama fica vermelha e preta. Não há marcas no rosto por tint: os quadros são PNG desenhados e isso pede sobreposição quadro a quadro, que fica para uma feature de arte | `powerAuraDirector` (F35) |
| **Ramo e Despertar** | Paleta própria da técnica, moldura dourada no ícone, banner e câmera lenta ×0,4 por 350 ms na 1ª conjuração da rodada | `ImpactFrame`, `FocusLines`, rampa nova em `art/palette.ts` |

**Três faixas de acerto** (o `Hit` ganha `band?: 'chip' | 'micro'`; sem `band`, o acerto é normal). O nome não é
`chip: true` porque `Health.chip` (`core/health.ts:79`) já existe com outro sentido.

| Faixa | Para quê | Hitstop | Inimigo | Faísca e número |
| --- | --- | --- | --- | --- |
| **chip** | tique periódico abaixo de 300 ms: Azul, queima, campo do Vermelho Máximo, sangramento | nenhum, sem `freeze` | sem `hitstun`, sem `stagger`, sem ragdoll, sem interromper o ataque, não conta em `downHits`, não soma estrutura; no chefe, a postura toma metade | faísca 6, número cinza pequeno |
| **micro** | acerto discreto ou em cadeia: raio, mordida, eco, onda do punho, estilhaço do Vermelho, cortes do Santuário | 15 a 20 ms, com teto de 60 ms somados por segundo (acima disso, sai sem hitstop) | sem `hitstun` e sem interromper; soma metade da estrutura | faísca média, número azul pequeno |
| **normal** | conjuração direta, golpe do moveset, ativação de Domínio | como hoje | como hoje | como hoje |

---

## 5. Catálogo

Custo de arte: **B** = baixo (código, efeito e UI), **M** = médio (sprite pequeno em HD), **A** = alto (folha HD ou chefe). Cada item diz a leva em que entra.

### 5.1 Técnicas novas, todas acionadas pelo jogador

| Técnica (JJK) | O que a tecla faz | Eixos | Ramos | Arte | Leva |
| --- | --- | --- | --- | --- | --- |
| **Boogie Woogie** (Todo) | seção 2.5 | seção 2.5 | Palma Falsa / Dupla Palma | B (palma, lampejo amarelo) | 1 |
| **Ressonância** (Nobara) | 1º toque: 3 pregos que cravam e marcam. 2º toque em até 6 s: detona todas as marcas | pregos 3 → 6; dano da detonação 20 → 44; marca 6 → 12 s; propagação ao matar 0 → 100 px; eficiência; recarga | **Grampo** (o prego explode ao cravar) / **Boneco** (marca no chefe repete 50% do dano da detonação) | B (prego de poucos px) | 1 |
| **Fala Amaldiçoada** (Inumaki) | "Pare!": cone que atordoa (comum 600 ms, chefe 150 ms). **Custa vida e energia** | alcance 140 → 260; atordoamento 600 → 1200; custo em vida 8 → 2; cone 30° → 60°; eficiência; recarga | **"Exploda"** (os atordoados tomam 20) / **"Volte"** (empurra e derruba) | B (onda e glifo) | 1 |
| **Convergência** (Choso) | segurar carrega até 600 ms; soltar dispara um feixe fino que atravessa, até 320 px. Custa vida | perfuração 2 → todos; carga 600 → 300; largura 4 → 10 px; custo em vida 6 → 0; dano 28 → 52; recarga | **Supernova** (o fim estoura em anel) / **Curva** (dobra 1 vez para o mais próximo) | B | 2 |
| **Cães Divinos** (Megumi) | os 2 cães saem da sombra numa investida rasteira à frente, mordem o 1º alvo (acerto micro) e somem em 1,2 s. Não ficam e não escolhem alvo | cães 2 → 4; alcance 200 → 320; mordidas 1 → 3; prisão 0 → 600 ms; eficiência; recarga | **Totalidade** (lobo grande que salta por 3 alvos) / **Matilha** (abrem para os dois lados) | M (silhueta preta de olho branco, 4 a 6 quadros HD) | 2 |
| **Punho de Trovão** (Kashimo) | carrega o corpo: os **próximos 3 golpes do moveset** soltam raio em cadeia (**micro** de 8, 2 saltos, com o mundo parando 15 a 20 ms a cada salto). Não cria golpe | cargas 3 → 6; saltos 2 → 4; dano 8 → 16; atordoa 0 → 300 ms; eficiência; recarga | **Tempestade** (o golpe forte solta raio vertical) / **Estática** (o raio atordoa) | B (linhas) | 2 |
| **Erupção** (Jogo) | um pilar de fogo sobe do chão à frente | altura; erupções em fila 1 → 4; queima chip 0 → 4 a cada 300 ms (no máximo 2 s); dano 24 → 42; eficiência; recarga | **Meteoro** / **Lago de Lava** (3 s, chip) | B a M | 3 |

São **10 técnicas para 3 vagas** no fim da leva 2.

**Despertares da Ressonância e da Fala** (a regra do componente proporcional da seção 2.1 vale):
- Ressonância, Grampo → **Coroa de Pregos**: detonar 5 ou mais marcas de uma vez solta uma 2ª detonação no centro do
  grupo, com 4% do HP máximo de cada atingido (chefe 1%).
- Ressonância, Boneco → **Boneco de Palha**: por 3 s depois do 2º toque, a marca no chefe repete 50% de **todo** dano
  que ele toma, inclusive do corpo a corpo, e o eco também tira postura.
- Fala, "Exploda" → **Exploda em Cadeia**: o atordoado que morre explode e atordoa os vizinhos por 300 ms.
- Fala, "Volte" → **Esmague**: o empurrado que bate em parede ou em outro inimigo toma 4% do HP máximo (chefe 1%), e os
  dois caem.

### 5.2 Corpo a corpo fortalecido, sem golpe novo

- O moveset fica igual: jab, direto, gancho, chutes, Contra, finalizador, guarda, parry e esquiva.
- **Corpo Amaldiçoado:** a trilha com eixos, ramo e Despertar da seção 2.6. É onde a build de corpo a corpo gasta.
- **Força:** a escala contínua e os patamares da seção 4.
- **Manoplas:** o caminho do patamar 3.
- **Faixas:** rastro mais longo e pós-imagem no golpe leve.
- **Talentos:** reagem ao golpe, ao parry, à esquiva e ao Kokusen.
- **Arma imbuída:** muda os golpes de hoje sem tirar o combo nem o Contra (seção 5.4).

**Black Flash (revisão do KOK-06, decisão 7 da seção 7).** Hoje o Kokusen dá 45 fixos, e o HP do comum vai de 60 para
125 (r19), e o do chefe de 400 para 1600. O momento mais épico do jogo valeria menos a cada ato. Passa a ser:
- dano = **×2,5 do golpe que o disparou**, com Força, Impacto do Corpo e talentos incluídos;
- piso de 45 × o multiplicador de HP do inimigo na rodada (o mesmo que `scaleFor` aplica, `core/difficulty.ts:54`;
  daqui em diante, "escala da rodada"), para acompanhar o HP;
- a Zona Negra Nv 2 e Nv 3 sobem o multiplicador para ×2,8 e ×3,1, e o Punho Negro Divergente soma +0,3 (teto ×3,4);
- quanto maior o multiplicador, maior o "pop" do número preto e vermelho.

Entra na F30, junto com a escala de HP.

### 5.3 Talentos (até 6 vagas do pool, Nv 1 a 3)

**Regra:** todo nível tem **um sinal visível e um gatilho novo**, a mesma regra que a seção 4 aplica aos eixos. Do Nv 1
para o Nv 2 nunca muda só o número. Todo talento tem ícone na `TalentStrip`, que pisca quando o gatilho dispara.

| Talento | Nv 1 | Nv 2 (sinal novo) | Nv 3 (gatilho novo) | Arte | Leva |
| --- | --- | --- | --- | --- | --- |
| Punho Pesado | golpe forte +15% | +30%; o forte que acerta solta poeira e um anel no chão | +45%; a derrubada joga na parede (atordoa 600 ms) | B | 1 |
| Contra Afiado | Contra ×1,3 | ×1,5; o Contra perfeito deixa o alvo com contorno de "aberto" por 1 s, e todo golpe nele é crítico ×1,25 | ×1,7; o Contra perfeito devolve 15 de energia e 30% da recarga da técnica do último slot | — | 1 |
| Passo Sombrio | depois da esquiva perfeita, o próximo golpe faz ×1,3 | ×1,5; a esquiva perfeita deixa uma pós-imagem, e o inimigo erra o próximo golpe nela | ×1,8; o golpe sombrio atravessa guarda | B | 1 |
| Executor | o finalizador cura 12 | cura 20, com número verde e brilho na barra de vida | cura 30 e enche 20% da barra de Domínio | — | 1 |
| Refluxo | parry dá +8 de energia | +12, e o parry solta um arco azul do alvo até a barra | +18, e o parry perfeito recarrega a técnica do último slot (1 vez a cada 8 s) | B | 1 |
| Condutor | +1 de energia por golpe (sobre `CE.meleeGain` 3) | +2, e a cada 3º golpe voam faíscas azuis do alvo até a barra | +3; com a energia cheia, o golpe que acerta salta um arco micro de 6 × escala da rodada para o inimigo mais próximo (no máximo 2 por segundo) | B | 1 |
| **Proporção 7:3** (Nanami) | linha amarela a 30% da barra do inimigo; golpe no alvo abaixo da linha é crítico ×1,5 | ×1,75, e o crítico desenha o risco 7:3 no alvo | ×2, e o abate por crítico marca o inimigo mais próximo: o próximo golpe nele é crítico | B | 1 |
| **Hora Extra** (Nanami) | a cada 15 abates sem levar dano, +5% de dano, até +15% | a cada 12, até +25%, com o relógio no HUD em gomos | a cada 10, até +35%, com aura laranja no teto. Levar dano tira metade do bônus. O contador vale para a run inteira e não zera na rodada | B | 1 |
| **Zona Negra** (Black Flash) | janela do Kokusen +10 ms | +20 ms, Kokusen ×2,8, e o punho acende de preto no instante em que a janela abre | +30 ms e Kokusen ×3,1 | B | 1 |
| Mão de Ferro | recuo +20% | +40%; o alvo deixa rastro de poeira e quebra objeto no caminho | +60%; o inimigo jogado na parede toma 15 × escala da rodada e fica atordoado | B | 2 |
| Osso Duro | dano em postura do chefe ×1,25 | ×1,5; a barra de postura do chefe racha à vista, com 3 trincas | ×1,75; a quebra de postura derruba o chefe | B | 2 |
| Reversa Refinada | a Reversa cura +25% | +50%, com a cura em número verde e brilho | +75%; anda a 40% enquanto cura | B (casa com a F28) | 2 |
| Domínio Simples (Miwa) | janela de parry +20 ms | +30 ms; um círculo de Domínio Simples aparece no chão durante a guarda | +40 ms; o parry perfeito devolve um corte iai de 20 × escala da rodada no atacante | B | 2 |
| Seis Olhos | custo de técnica −8% (conta no piso de 60%) | −15%; o ponto fraco aparece como marca no inimigo mais próximo | −22%; a técnica que acerta o ponto fraco é crítica ×1,5 e devolve 10 de energia (1 vez a cada 6 s) | B | 2 |

**Teto conjunto do Black Flash:** a soma de bônus de janela do Kokusen (Zona Negra, voto do Black Flash, evolução) fica limitada a **+30 ms** em `buildEffects`. A base sorteada continua de 50 a 90 ms.

### 5.4 Arma amaldiçoada imbuída e relíquias

**O modelo muda:** hoje, com algo na mão, o combo inteiro e o Contra somem (`strikes.ts:106` e `:138`), então segurar a
arma é jogar pior que de mão vazia num jogo de luta. A arma vinculada passa a ser **imbuída**: fica guardada (no
Inventário Amaldiçoado, como o verme do Toji) e **modifica os golpes que já existem**.
- Não vai à mão, não é `Prop`, não entra no grafo de golpes, não cresce o `moves.ts` (397) e não põe peça nos quadros
  do Yuta (respeita "sem boneco de peças").
- Aparece como efeito: o rastro e o impacto do golpe ganham a forma e a cor da arma (a Lâmina deixa um risco fino
  branco, o Bastão um arco largo, a Lança uma estocada reta, o Osso brasas).
- O combo, o Contra e as técnicas continuam valendo, então o CAST-09 deixa de excluir arma e técnica. Não precisa de
  tecla para sacar e guardar, e o `G` fica livre.
- Objetos do mundo (drops, cenário) continuam `Prop` na mão, com o balanço de hoje e o peso da F29 (POW-11).
- O efeito da arma passa por `statSheet.meleeMul` com traços (`{heavy, light, counter, shadow}`) e pelo `ImpactFx`.

**Eixos:** 3 pontos, teto de 2 por eixo, e cada arma tem os seus 3 eixos, todos mexendo no traço próprio dela.

| Arma | Traço (Nv 1) | Eixos (por ponto) | Evolução (Nv 4 + catalisador em qualquer nível) | Arte | Leva |
| --- | --- | --- | --- | --- | --- |
| **Lâmina** (existe) | todo golpe leve corta: sangramento chip de 2 × escala da rodada a cada 300 ms por 1,5 s, e +10 px no alcance do leve | **Corte** (sangramento +0,5 s e +1 pilha, até 3); **Fio** (+8 px no leve); **Sangria** (+1 no tique) | + Faixas → **Lâmina Dividida da Alma**: o golpe leve ignora guarda e escudo de afixo | M (rastro e impacto) | 1 |
| **Bastão** (existe) | o golpe forte varre em arco: acerta na frente e atrás a até 60 px | **Arco** (+20 px de raio); **Derrubada** (1 ponto: o forte derruba o comum; 2 pontos: também o armado); **Peso** (recuo +25%) | + Manoplas → **Nuvem Itinerante**: o forte acerta 3 vezes no arco | M | 1 |
| **Lança Invertida do Céu** | o Contra atravessa guarda e anula o projétil que tocar | **Estocada** (+16 px no Contra); **Anulação** (janela de anular projétil +100 ms); **Perfuração** (o Contra atravessa 1 → 2 → 3 alvos) | + Contra Afiado → **Arsenal de Toji**: o Contra perfeito no chefe anula os afixos dele por 3 s | M | 1 |
| **Osso de Dragão** (Maki) | carrega com parry e dano recebido (1 a 3 cargas); o golpe forte solta tudo | **Cargas** (+1, até 5); **Soltura** (+25% por carga); **Estopim** (a soltura derruba em área de 60 / 90 px) | + Refluxo → **Dragão Refletido**: o parry perfeito solta a carga na hora como contragolpe | M | 2 |

O Arsenal de Toji não exige mais o Clivar (seção 2.4).

**Relíquias:**
- Manoplas, Faixas e Rosário ganham leitura visual.
- **Dedos de Sukuna** (relíquia nova, **ocupa a vaga**, Nv 1 a 5 = dedos). É aposta, não escolha óbvia:
  - +6% de dano e **+8% de dano sofrido** por dedo (no Nv 5, +30% e +40%; o Rosário dá +30% só em técnica e sem custo);
  - o 1º ao 3º dedo saem da loja; o 4º e o 5º **só caem do chefe Portador**;
  - a chance do chefe vir com a moldura Portador de Dedo sobe +8% por dedo;
  - aura vermelha a partir de 3 dedos;
  - arte B, leva 2.

### 5.5 Votos vinculativos: 6 novos (os 8 de hoje ficam)

| Voto | Poder | Custo | Interação com a build | Leva |
| --- | --- | --- | --- | --- |
| **Revelação da Técnica** | técnica do slot 1: +40% de dano e +20% de raio | o sinal dela fica 150 ms mais longo (o kanji aparece sobre a cabeça) | o eixo Conjuração compensa o custo | 1 |
| **Restrição Celestial** | Força ×1,4, o pool vai a 8 vagas e o máximo de talentos a 8, arma +1 ponto de eixo | perde as técnicas (devolve 50% do gasto); o máximo de técnicas vira 0 e a Reversa some | é a build Toji/Maki. O Domínio que o player tem vira Amplificação de Domínio do mesmo nível, e daí em diante o baú e a loja só oferecem a Amplificação. Só é oferecida depois que a Amplificação existe (F31) | 1 |
| **Voto do Black Flash** | janela do Kokusen +20 ms (conta no teto de +30) e +15 de energia por Kokusen | fora da Zona (o estado de 8 a 14 s que o Divergente abre depois do Kokusen), os golpes fazem −20% de dano | **só é oferecido com o Divergente no loadout**, para a Zona ser alcançável; casa com a Zona Negra | 1 |
| **Expediente** (Nanami) | a partir do 11º abate da rodada, +40% de dano | os 10 primeiros abates da rodada saem com −25% | casa com a Hora Extra; quanto mais rápido o player limpa, mais cedo chega ao bônus | 1 |
| **Corpo Emprestado** | o pool vai a 8 vagas, e o máximo de talentos a 7 | vida máxima −25% | é o único jeito de passar de 7 habilidades | 1 |
| **Voto de Silêncio** | a barra de Domínio enche 50% mais rápido | técnicas não carregam a barra, e a Reversa trava durante o Domínio | casa com build de corpo a corpo | 1 |

### 5.6 Expansão de Domínio (ultimate, tecla `P`/`N`)

**Barra de 0 a 100. Não enche com o tempo.**

| Ação | Carga |
| --- | --- |
| Golpe leve | +1 |
| Golpe forte | +2 |
| Abate | +1 |
| Parry ou esquiva perfeita | +5 |
| Técnica que acerta | +1 por conjuração |
| Finalizador | +5 |
| Kokusen | +15 |
| Acerto chip | não carrega |

- Esvazia 10% depois de 8 s sem acertar.
- No **ritmo de referência** (1 leve/s, 0,25 forte/s, 0,2 abate/s, 1 perfeita a cada 20 s, 1 técnica a cada 5 s), a barra enche em **~46 s**. Um teste puro fixa a janela de 40 a 60 s.
- **A ativação é um acerto garantido e decisivo, não chip:** tira uma fração do HP máximo (comum 40%, elite 20%,
  chefe 6%), com `ImpactFrame`, linhas de foco e o hitstop do finalizador. Cerca de 46 s de barra pagam um momento que
  mata ou quase mata o grupo, em qualquer rodada.
- O dano durante o Domínio **só amplifica o que o jogador acerta**. Os cortes e efeitos discretos são **micro**
  (15 a 20 ms de hitstop, seção 4), e só o tique contínuo é chip.
- Na F31, o Santuário chama o Corte (`CutFx` e o acerto do Desmantelar) direto pelo `domainDirector`, sem depender do
  `TechEmitter`. Na F34, o `TechEmitter` absorve esse caminho.

| Domínio | Ativação | Durante | Nv 2 / Nv 3 | Arte | Leva |
| --- | --- | --- | --- | --- | --- |
| **Santuário Malevolente** (Sukuna) | corte decisivo em todo inimigo a até 320 px: 40% do HP máximo do comum, 20% da elite, 6% do chefe | 6 s: cada golpe ou técnica do player que acerta solta 1 corte **micro** de 6 × escala da rodada em até 4 inimigos no raio (no máximo 4 por segundo) | 8 s e 6 alvos / ao fechar, o Corte do Mundo: executa os comuns abaixo de 35% e tira 8% do HP máximo do chefe | B (reaproveita o `CutFx`, vinheta) | 1 |
| **Jackpot** (Hakari) | estouro decisivo de 64 px (40% / 20% / 6%), e 3 tambores giram por 2 s; cada golpe que acerta enquanto giram dá +4% de chance (Riichi, até 60%) | Jackpot (base 33%): 8 s de energia infinita, técnicas sem recarga e cura de 5 HP/s. Falha: 4 s com metade do efeito. **Piedade:** a 3ª falha seguida é jackpot garantido | chance base 40% / +5% acumulado por jackpot na run (teto 60%) | B (UI) | 1 |
| **Amplificação de Domínio** (ultimate do lutador) | onda decisiva de 64 px que derruba (25% do HP máximo do comum, 12% da elite, 4% do chefe) | 7 s: o corpo a corpo atravessa guarda e anula projétil; técnicas travadas | 9 s / +25% no corpo a corpo | B (contorno) | **1** (puxada da leva 2: o Baú do Véu sorteia 2 de 3, e a Restrição Celestial tem para onde ir) |
| **Vazio Ilimitado** (Gojo) | comuns a até 320 px paralisados por 2,5 s, chefe por 0,3 s, com o mesmo acerto decisivo da ativação | golpe em paralisado é crítico ×1,5 | 3,5 s e raio de 320 px (o teto da tela) / chefe 0,6 s | M (estrelas) | 2 |
| **Caixão da Montanha de Ferro** (Jogo) | chão em brasa por 4 s, com o acerto decisivo da ativação | queima chip de 4 × escala da rodada a cada 300 ms nos inimigos sobre ele | 5 s / os queimados explodem ao morrer (micro) | M | 3 |

### 5.7 Combos: União, Evolução e Duo

- **União:** duas técnicas viram uma e **liberam uma vaga**.
- **Evolução:** troca o item por uma versão nova.
- **Duo:** carta rara sem vaga, no máximo 4 por run.
- União e Evolução saem do baú do chefe (grátis) ou da loja (60).
- As receitas passam a ser `{kind, id, minLevel}[]`.
- O `drawFresh` deixa de pegar só a primeira evolução (`pool.find`): o baú oferece todas as prontas.
- **Limiar:** a peça principal no **Nv 4** (3 pontos) e o catalisador em **qualquer nível**. Hoje o Roxo sai com
  Vermelho Nv 3 + Azul Nv 3. Com a regra nova, sai com Vermelho Nv 4 + Azul comprado e continua alcançável até a r8.
- **Regra de combo:** a Evolução, a União ou o Duo faz algo que nenhuma das peças faz sozinha e que muda a forma de
  jogar. Não vale "a soma dos dois ramos", "o mesmo efeito maior" nem "sem custo".
- **Teste de dados** (`tests/data/combos.test.ts`): não há dois efeitos com o mesmo nome nem com o mesmo texto entre
  Despertares, Evoluções, Uniões e Duos.

| A | + B | → C | Tipo | Condição | Arte | Leva |
| --- | --- | --- | --- | --- | --- | --- |
| Vermelho | Azul | **Vazio Roxo** (existe; ganha eixos e entra na loja) | União | Vermelho Nv 4 + Azul em qualquer nível (hoje Nv 3 + Nv 3) | — | 1 |
| Divergente | Zona Negra | **Punho Negro Divergente**: todo 2º impacto tenta Black Flash (a janela respeita o teto) e o Kokusen ganha +0,3 no multiplicador | Evolução | Divergente Nv 4 + Zona Negra em qualquer nível | B | 1 |
| Ressonância | Desmantelar | **Ressonância Cortante**: cada corte crava marca; fica no slot da Ressonância e libera uma vaga | União | Ressonância Nv 4 + Desmantelar em qualquer nível | B | 1 |
| Boogie Woogie | Azul | **Vácuo de Troca**: bater palma com o Azul ativo troca o Azul de lugar com o player; o orbe leva o grupo puxado para onde o player estava, e o player sai do cerco | Evolução | Boogie Nv 4 + Azul em qualquer nível | B | 1 |
| Desmantelar | Santuário | **Rede de Cortes**: as marcas dos cortes ficam no chão (até 8, por 6 s), e a ativação do Domínio detona todas como acertos decisivos | Evolução | Desmantelar Nv 4 + Santuário em qualquer nível | B | 2 |
| Convergência | Reversa Refinada | **Sangue Eterno**: a vida gasta no feixe fica no chão como sangue por 4 s; o próximo feixe que passa por ele o absorve, ganha +50% de dano e devolve metade da vida | Evolução | Convergência Nv 4 + talento em qualquer nível | B | 2 |
| Fala Amaldiçoada | Seis Olhos | **Palavra no Ponto Fraco**: o "Pare!" acerta o ponto fraco, e o inimigo atordoado toma crítico de qualquer fonte | Evolução | Fala Nv 4 + talento em qualquer nível | B | 2 |
| Lâmina / Bastão / Lança / Osso | catalisador da seção 5.4 | seção 5.4 | Evolução de arma | arma Nv 4 | M | 1 e 2 |

| Duo (famílias) | Efeito | Leva |
| --- | --- | --- |
| Troca + Vermelho | **Troca Explosiva**: trocar com o orbe em voo detona na hora, no ponto do orbe | 2 |
| Ressonância + Vermelho | **Prego Rubro**: o orbe que atravessa um alvo marcado detona a marca na hora e herda o raio dela | 2 |
| Contra Afiado + qualquer técnica Nv 3 | **Contra Amaldiçoado**: o Contra perfeito solta a técnica do slot 1 pelo `TechEmitter` (micro, 50% do dano, sem gastar a conjuração), 1 vez a cada 6 s | 2 |
| Cães + Contra Afiado | **Sombra no Contra**: o Contra perfeito sai com uma mordida micro no mesmo alvo | 2 |
| Fala + Trovão | **Ordem Elétrica**: os atordoados pelo "Pare!" viram condutores, e o raio salta entre todos eles | 2 |
| Trovão + Divergente | **Impacto Elétrico**: o 2º impacto salta raio (micro) para mais 2 alvos | 2 |

- **Grimório:** a loja dá a dica quando metade da receita está na mão.
- A receita vista fica revelada no Grimório, que é persistente a partir da F39.

### 5.8 Variações de chefe

**Afixos:**
- Ficam só nos dados (`data/bossAffixes.ts`, `core/bossAffix.ts`, stream `bossAffixRng`) e ligam pela tuning que `Boss.ts:72-73` passa a entregar.
- **Teto por tier:** **1 afixo leve** (r5), 1 (r10), 2 (r15 e r20), 3 (r25 em diante).
- **Arquétipo pela seed:** o chefe deixa de ser sempre o Oni na r5 e na r10 (paridade em `archetypeFor`). O
  arquétipo sai do `bossAffixRng`, e a 1ª run já vê variação no 1º chefe.
- **Pool leve** (só na r5): afixos que mudam o padrão de ataque sem somar número, hoje Ígneo e Invocador (com 2
  comuns em vez de 3).

| Afixo | Efeito | Leitura | Arte | Leva |
| --- | --- | --- | --- | --- |
| Ígneo (Jogo) | a investida deixa lava por 2 s (chip no player) | contorno laranja | B | 1 (leve) |
| Invocador (Mahito) | troca de fase solta 3 comuns (2 na r5) | contorno roxo | B | 1 (leve) |
| Sangue Convergente (Choso) | feixe horizontal com aviso de 0,8 s | linha que engrossa | B | 1 |
| **Adaptativo** (Mahoraga) | adapta à **fonte mais usada nos últimos 20 s**, contando golpe leve, golpe forte e cada técnica em separado: essa fonte passa a fazer 50%. No máximo 2 adaptações ao mesmo tempo, e a fonte que fica 10 s sem uso é esquecida. Empurra para a variedade em vez de punir quem conjura | roda de 8 raios sobre a cabeça, com o ícone da fonte adaptada | B | 1 |
| Enfurecido | encadeia 2 ataques sem descanso a cada 3º ciclo, e `restMs` ×0,8 | contorno vermelho | B | 2 |
| Couraça | postura ×1,5, regenera 2× mais rápido | contorno cinza | B | 2 |
| Sobrecarregado (Kashimo) | 40% da vida é escudo que regenera | barra azul | B | 2 |
| Pele de Dragão | 3 camadas que quebram com Kokusen, Contra, finalizador, quebra de postura, golpe forte de patamar 2 ou técnica despertada | contorno em rampa | B | 2 |

- **Incompatíveis:** Adaptativo com Pele de Dragão; Couraça com Sobrecarregado.
- **Moldura Portador de Dedo** (não ocupa vaga de afixo):
  - escala 1,25, vida ×1,3, dano ×1,5, +1 projétil;
  - chance de 10% a partir da r10, mais 8% por Dedo do player.
- **Ataques novos com os quadros de hoje:** `CYCLES` vira dado por arquétipo e ganha Investida Dupla, Salto Triplo e Chuva de Fios (Tecelã). Arte B.
- **A loja anterior ao chefe anuncia:** "Próximo: Tecelã · Adaptativa · Portadora de Dedo".
- **Chefe novo só em HD**, numa feature de arte à parte. O candidato é **Mahoraga**, com o Adaptativo nativo. Arte A. Não há recolor do Oni legado.

### 5.9 Curva da run: dificuldade em atos (metroidvania, sem copiar)

Cada ato fecha com o chefe como **portão** e apresenta **uma regra nova de inimigo**. A luz do ato muda com um tint no `BakedLayer`, sobre os temas da F22.

**Câmera da arena do chefe:**
- o zoom abre de 2 para 1,8;
- a câmera trava nas bordas do selo, como uma "sala-portão";
- é inspiração de enquadramento, não cópia.

| Ato | Rodadas | Novidade | Céu |
| --- | --- | --- | --- |
| I | 1 a 5 | lutadores, armados raros, **Baú do Véu (r3)**, chefe com 1 afixo leve e arquétipo pela seed | entardecer |
| II | 6 a 10 | enxame (r6), 1ª elite (r8, avisada na r7), chefe com 1 afixo | noite |
| III | 11 a 15 | elites com afixo, rodada só de enxame (r13), chefe com 2 afixos | madrugada com névoa |
| IV | 16 a 20 | mais armados e brutos, elites com 2 afixos, Portador possível | véu vermelho |
| V+ | 21 em diante | **Véu Rompido**: cada ato soma 1 regra de Grau e ×1,15 de HP sem teto; chefe com 3 afixos | — |

**Escala do inimigo** (F30, junto com os eixos; nunca antes deles):
- Lutador: HP 60 × (1 + 0,06 × (r − 1)) com teto ×3. Nas rodadas comuns dá 89 na r9, 96 na r11 e 125 na r19. A r10 e a
  r20 são de chefe (`isBossRound`, `core/waves.ts:37`) e não têm comum para medir.
- Dano × (1 + 0,05 × (r − 1)) com teto ×2,5.
- Enxame: 12 a 20 de HP.
- Elite: ×2,5 de HP.
- Os lutadores continuam poucos e perigosos, e o volume vem do enxame.

### 5.10 Progressão entre runs

| Mínimo agora (F39) | Depois |
| --- | --- |
| `core/save` com versão (`localStorage` só no adaptador) | Graus de maldição (F26), reaproveitando afixos e as regras do Véu |
| Recorde (rodada, abates, build) com marcador "Recorde: r14" no HUD e banner ao passar | Altar: orçamento de bônus pequenos, de +5 a +10% |
| **Técnica inicial:** 1 de 3 sorteadas entre as liberadas, antes da r1 | Estilos iniciais e seed diária |
| **Desbloqueio só de conteúdo por conquista**, ~8 no começo. Exemplos: r5 libera Boogie Woogie; 3 Kokusen numa rodada libera Zona Negra; vencer um chefe sem técnicas libera Restrição Celestial; 3 Jackpots libera mais um tambor | Panteão (boss rush) |
| Fim de run com build, votos, dano por fonte e "falta pouco para: X" | Sukuna como ceifador da r30 (arte A) |
| **Recomeço em menos de 3 s** (`J` na tela de fim) | — |

**O que faz a run seguinte diferente:** técnica inicial, Domínio do Baú do Véu, eixos, ramos, Despertar, evolução encontrada, votos, afixos do chefe, desbloqueio novo no pool e seed dos módulos.

---

## 6. Fases de entrega

**Regras de toda fase:**
- **Refatoração:** passo próprio, com os smokes iguais. Mudança de comportamento: passo seguinte.
- **`TestScene`:** nunca ganha linha líquida. A F29 tira o `strikeMul` e o `inputFor` inteiro (portão de estado da run, `area.transitioning` e filtro de guarda do VOW-11) para o `StatsDirector`, e todo painel ou diretor novo nasce no `UiSetup` ou num diretor. Toda spec traz a conta de linhas efetivas por passo.
- **Arquivos no teto:** `Hud.ts`, `moves.ts` e `ShopPanel` não crescem. O `Player.ts` (358 efetivas, com folga) só troca hook por hook, sem campo novo. O `shop.ts` extrai `shopEligibility` e `shopPreview` antes de crescer. O tipo de snapshot novo vai para arquivo próprio.
- **Loja e sorteio:** carta nova entra no **fim** de `GAME_SHOP_CATALOG`, e todo sorteio novo tem stream com salt em `run.ts` (`axisRng`, `choiceRng`, `chestRng`, `bossAffixRng`, `startRng`).
- **Testes e smokes:** teste de sistema novo vai em arquivo novo, e teste que está na lista de exceções do `max-lines` (como `tests/core/bossBrain.test.ts`) não cresce. Smoke novo usa `hd=1&area=modular`.
- **Faixas de acerto** (seção 4): chip só para tique periódico abaixo de 300 ms; micro para acerto discreto ou em cadeia; normal para conjuração direta e golpe.
- **Emissor de golpe:** a F30 cria um `strikeEmitter` mínimo para a Onda do Punho, e a F31 liga o Santuário direto ao Corte. Na **F34**, os dois viram o **`TechEmitter`**, por onde sai tudo que dispara efeito de técnica a partir de golpe, parry ou Domínio, fora da `CastMachine`.
  - Os acertos são micro (os tiques, chip).
  - Não gasta energia e não para a regeneração (CE-05 só vale para conjuração).
  - Teto de 4 emissões por segundo.
- **`slotHeld`** no `TechCaster` e no `TechRunner` (F30, para o Contido): depois serve ao Lapso, à Palma Falsa e à Convergência.
- **Cada fase é um pacote jogável:** termina com algo novo que o jogador sente na run, nunca só refatoração ou só
  número. A dificuldade nunca sobe numa fase sem ferramenta nova na mesma fase.

| Fase | Escopo | Depende de | Arquivos principais | O jogador nota |
| --- | --- | --- | --- | --- |
| **F29 `fundacao-de-poder`** | detalhada abaixo. **Sem escala de HP** | — | ver abaixo | o soco forte pesa e muda a cada ponto de Força, os números saltam, o Azul flui, o objeto na mão bate com peso |
| **F30 `vermelho-e-corpo`** (prova vertical) | (0) extrair `shopEligibility` e `shopPreview`; (1) `Loadout.stats()`/`TechStats` com os números de hoje para as 5 técnicas, e as vistas lendo o stat (refatoração pura); (2) Nv 1 a 6 e `data/techAxes.ts` do **Vermelho**, com a base nova (custo 30, recarga 4500, alcance 320), Perfuração, ramo no Nv 2 (Ricochete ou Contido, com `slotHeld`) e Despertar no Nv 5; (3) **Corpo Amaldiçoado** com eixos, ramo e Despertar, e o `strikeEmitter` mínimo; (4) carta com 2 eixos e eixo-foco, `ChoicePanel` mínimo (só a página do ramo), 4 cartas e `buySlot 0..3`; (5) preços, trava, inflação e piso de custo; (6) **por último**, a escala de HP e dano, o Kokusen escalado (KOK-06 revisado) e o `expectedIncome` com as metas da seção 3.3 | F29 | `core/loadout`, `cast`, `shop`, `shopEligibility`, `shopPreview`, `cursedBody`, `kokusen`; `data/techniques`, `techAxes`, `shop`, `tuning` (`tuning.ts:155-157`); `tech/red`, `techFx/RedOrb`; `game/ChoicePanel`; `ShopPanel` (só `CARD_COUNT`), `input.ts`. Testes refeitos: `techniques`, `techShop`, `loadout`, `tuning`, `difficulty`, `kokusen`; smoke `run-loop` reescrito (ver 6.1, "Levado para a F30") | o Vermelho vira canhão ou metralhadora por escolha; o soco tem trilha própria; o inimigo cresce, e a build cresce junto |
| **F31 `expansao-de-dominio`** | barra, `P`/`N`, Baú do Véu (r3, 2 de 3), Santuário (Corte direto), Jackpot e Amplificação, ativação decisiva, nível no baú e na loja | F30 (`ChoicePanel`) | `core/domain`, `data/domains`, `domainDirector`, `game/DomainFx`, `EnergyHud` | a ultimate na r3, com um golpe que limpa a tela |
| **F32 `chefes-com-afixos`** | Ígneo, Invocador, Sangue Convergente e Adaptativo; 1 afixo leve na r5; arquétipo pela seed; ciclos como dado; Portador; glifo na barra; aviso na loja | F29 (faixas de acerto) | `bossTier`, `bossAI`, `bossAffix`, `data/bossAffixes`, `Boss.ts`, `spawner` | cada chefe é outra luta, já na 1ª run |
| **F33 `eixos-das-tecnicas`** | Azul, Desmantelar, Divergente e Roxo no molde do Vermelho (eixos, ramos, Despertares); `ChoicePanel` completo e `choiceDirector`; maestria nova (25/60, por conjuração); baú do chefe (`bossChest`, `chestRng`); União do Roxo na regra nova | F30 | `core/choice`, `mastery`, `bossChest`; `data/techAxes`, `evolutions`; `tech/*`, `techFx/*`; `scenes/test/choiceDirector`, `runDirector`. Testes refeitos: `mastery`, `evolution` | toda técnica tem caminho; escolha entre rodadas |
| **F34 `tecnicas-jjk-1`** | registro `TechId → TechModule`; `techObjects` aberto (3 smokes); `TechEmitter` (absorve o `strikeEmitter` e o caminho do Santuário); ícone HD de técnica (`TechDef.icon`); `core/swap`; Boogie Woogie, Ressonância e Fala | F33 | `TechRunner`, `debugApi` (tipo à parte), `game/tech/*`, `techFx/*`, `core/<técnica>`, `art/hd/techIcons` | 7 técnicas no pool |
| **F35 `vagas-e-talentos`** | (0) `0\|1` → `SlotIndex` (refatoração pura); (1) 3º slot `O`/`B`; (2) `Perks` vira `Map` com nível; pool de 7 vagas com +8 por vaga; talentos da leva 1 com sinal e gatilho por nível; `TalentStrip`; (3) `BuildBar`, eixo-foco na bandeja, Abandonar com `T`, regra da categoria cheia; (4) `buildEffects` com o piso de custo, e aura de build | F33 | `core/cast`, `build`, `skillSlots`, `buildEffects`; `data/perks`; `tech/shared`, `TechRunner`, `TechCaster`, `EnergyHud`; `game/BuildBar`, `TalentStrip`; `buildDirector`, `powerAuraDirector` | 3 técnicas; feiticeiro ou lutador; talentos que piscam e mudam |
| **F36 `arma-imbuida`** | arma imbuída (sai da mão), eixos por traço; Lâmina, Bastão e Lança; evoluções de arma | F35 (vaga na `BuildBar`) | `core/arsenal`, `data/arsenal`, `arsenalDirector`, `statSheet`, `impactFx`, rastro e impacto em `art/hd` | build de arma sem perder o combo nem o Contra |
| **F37 `combos`** | receitas `{kind, id, minLevel}[]`, todas as prontas no baú, as Uniões e Evoluções da leva 1, teste de nomes e textos únicos | F34, F36 | `data/evolutions`, `core/evolution` | caça às receitas no estilo VS |
| **F38 `hordas-em-atos`** (absorve a F27) | diretor por orçamento, enxame, elites com afixo e Selo, cota de abates, rodada especial, atos com tint e o zoom da arena | F30 (escala calibrada) | `core/waves`, `difficulty`, `run`; `scenes/test/spawner`; `data/tuning`; enxame em `art/hd` (M) | ondas de verdade; os eixos de área compensam |
| **F39 `meta-minima`** (núcleo da F25) | save, recorde no HUD, técnica inicial (`startRng`), ~8 conquistas que liberam conteúdo, Grimório persistente, fim de run com dano por fonte, recomeço em menos de 3 s | F33 | `core/save`, `unlocks`, `runSummary`; `scenes/test/metaDirector`; `game/RunSummaryPanel` | vontade de recomeçar já |
| **F40 `votos-novos`** | 6 votos novos (Restrição só com a Amplificação; Voto do Black Flash só com o Divergente) | F31, F35 | `data/vows`, `core/vows`, `vowDirector` | build de voto com identidade |
| **F41 `leva-2`** | Convergência, Cães, Trovão; Vazio Ilimitado; talentos e afixos da leva 2; Osso de Dragão; Dedos; Duos; ドン | F40 | — | mais arquétipos de build |
| **Arte à parte** | chefe HD (Mahoraga); marcas no rosto dos Dedos | — | `art/hd` | — |

Nas 4 primeiras fases (F29 a F32) entram o patamar de força, a 1ª técnica completa (Vermelho), a trilha do corpo a
corpo (`core/cursedBody.ts`, novo), a 1ª ultimate e a 1ª variação de chefe. A F39 (meta) só depende da F33: se o usuário quiser o recorde e o
recomeço rápido antes, ela sobe na fila sem mexer nas outras.

**O que acontece com o plano anterior:**
- **F24:** pronta. O Vermelho ganha eixos na F30, o Roxo na F33, e os votos crescem na F40.
- **F25:** o núcleo vira a F39. Altar, moeda permanente e estilos ficam depois da F41.
- **F26:** mantida depois da F38; os Graus somam afixos e as regras do Véu.
- **F27:** absorvida pela F38. A escala de HP sobe para a F30.
- **F28** (`reversa-anime`): mantida e independente; casa com a Reversa Refinada.

### 6.1 F29 `fundacao-de-poder`: spec

**Objetivo:** a força comprada passa a ser vista e sentida a cada ponto, o dano frequente para de travar o jogo, e o
objeto na mão bate com o mesmo peso do soco. Sem mexer em slots nem na loja, e **sem escala de HP**: a escala só liga
na F30, junto com os eixos (decisão 3 da seção 7).

**Passos e commits, na ordem, com a conta de linhas efetivas da `TestScene`** (hoje 399, teto 400):

| Passo | O que entra | `TestScene` |
| --- | --- | --- |
| 1. **Refatoração, com os smokes iguais** | `core/statSheet.ts` e `scenes/test/statsDirector.ts` assumem o `strikeMul`, o `sync` dos votos, o `syncTechBonus`, o `setMaxHp` da compra de vida e o `inputFor` inteiro (portão de estado da run, `area.transitioning` e filtro de guarda do VOW-11, porque o filtro é efeito de voto, e o `StatsDirector` é o dono dos efeitos de voto) | sai `strikeMul` (l.515-517): **−3**; sai `import type { MoveDef }` (l.71, único uso): **−1**; sai `inputFor` (l.505-509): **−4**, e a chamada da l.472 vira `this.stats.inputFor(raw)`: 0; a l.284 vira `this.stats.bindPlayer(this.player)`: 0; a l.403 `this.vows.sync()` vira `this.stats.update(delta)`: 0; `acceptsPlayerInput` e `NEUTRAL_INPUT` dividem linha de import com outros nomes (l.18 e l.52): 0; entram o import e o campo `readonly stats = new StatsDirector(this)`: **+2**. **Saldo −6: 399 → 393** |
| 2. **Faixas de acerto** (`Hit.band`) | `hit.ts`, `enemyBrain.ts` (evento novo), `EnemyDefense.ts`, `bossBrain.ts`, `core/hitBand.ts` (novo: hitstop do micro e teto por segundo), `effects.ts`, `tech/blue.ts` | 0 |
| 3. **Números de dano** | `core/damageNumber.ts`, `game/DamageNumbers.ts`; dono o `UiSetup` (`this.s.ui.damageNumbers`), sem campo na cena; anda em `drops.updatePickups` ao lado do `floatTexts.update` (`drops.ts:33`) e limpa no reset do `runDirector` (`runDirector.ts:134`) | 0 |
| 4. **Força contínua, patamar e tom** | `core/power.ts`, `POWER_FEEL`; hook `Player.strikeMods` no lugar de `damageMul`; `cameraKick` com `px`; `slideBy` com `scale`; `toneOf(s)`; `powerAuraDirector` como membro do `StatsDirector`, tocado por `stats.update(delta)` | 0 |
| 5. **Objeto e arma pelo `ImpactFx`** | `Prop` recebe `PropDamage` do `StatsDirector` nos 3 pontos de criação; faixa forçada em `impactTier` | 0 |
| 6. **Debug e snapshot** | `mods=`, tipo de snapshot à parte, `debugApi.test`, README | 0 |

A `TestScene` termina a F29 com **393 efetivas ou menos**. Se a spec achar outro uso de `MoveDef` na cena, o saldo do
passo 1 cai para −5 e continua dentro do teto.

| Id | Requisito (testável) |
| --- | --- |
| POW-01 | `statSheet` é a única função que combina build, arsenal e votos. O `StatsDirector` é o único que grava `loadout.damageMul`, `vowDamageMul`, `costMul`, `player.damageTakenMul` e `setMaxHp`. A compra de `vida` (`shopDirector.ts:39`) troca o `setMaxHp(modifiers.maxHp)` por `this.s.stats.sync()` **antes** do `heal(15)`. Para os 8 votos × 3 relíquias × 6 passivas, os números saem **iguais aos de hoje**, e comprar `vida` com e sem um voto que mexe na vida máxima deixa o mesmo HP e o mesmo teto de hoje |
| POW-02 | A `TestScene` vai de 399 para 393 efetivas no passo 1 e termina a F29 com 393 ou menos (tabela acima). Nenhum passo de 2 a 6 soma linha nela |
| POW-03 | `Hit.band = 'chip'`: `onTechConnect` não chama `hitstop` nem `freeze` e usa faísca de tamanho 6; `enemyBrain.receiveHit` devolve o evento novo `{type: 'chip'; hit}` (ou `died`), sem `hitstun`, `stagger` nem ragdoll, e não conta em `downHits`; `BossBrain.receiveHit` (`bossBrain.ts:92-98`) usa `poiseDamage = dano × BOSS.chipPoiseMul` (0,5, em `data/tuning`). `Hit.band = 'micro'`: hitstop de 15 a 20 ms, com teto de 60 ms somados por segundo (`core/hitBand.ts`; acima do teto, sai sem hitstop), faísca média, o mesmo evento `chip` no cérebro e postura normal no chefe |
| POW-03b | **O chip e o micro não interrompem o ataque do inimigo.** Em `EnemyDefense.receiveHit`, com `hit.band`: aplica o dano, sem `interrupt`, sem zerar `walkVxStep`, sem `pickHitReaction` e sem `trackStreak`; o chip não soma estrutura (senão o Azul quebraria a guarda sozinho e travaria o inimigo pelo atordoamento), e o micro soma metade de `enemyStructureGain(hit)`. O `handle` (l.262) trata o evento `chip`. O acerto aceito devolve `true`, e com isso o `onTechHit`, a maestria e o número de dano continuam |
| POW-04 | O tique do Azul é chip. Com 5 inimigos dentro do Azul, o hitstop fica em 0 durante os tiques, nenhum inimigo entra em `hitstun` por eles, e o inimigo preso anda e solta o golpe que estava preparando. A implosão continua um acerto normal |
| POW-05 | `damageNumber` (puro): o tamanho é 12, 16 ou 20 px pela magnitude (abaixo de 15, de 15 a 39, 40 ou mais); a cor vem do tipo (golpe, técnica, crítico, Kokusen, micro, chip), toda da `PALETTE`; acertos no mesmo alvo em 300 ms somam num número só. Ficam no máximo 12 números vivos, e o excedente funde no mais recente do mesmo alvo |
| POW-06 | `DamageNumbers` é criado no `UiSetup` (`ui.damageNumbers`), sem campo novo na `TestScene`, e chamado em `CombatLinks.onConnect` e `EffectsDirector.onTechConnect`. Anda em `drops.updatePickups` e limpa no reset da run. Não usa o `fxCap` e não muda o `FloatTexts.debug` |
| POW-07 | `power.ts`: pontos = Força (0 a 5) + 2 × Manoplas (0 a 3) + 2 se tem Punho Pesado (o Impacto do Corpo entra na F30); patamar 1 a partir de 2 pontos, 2 a partir de 5, 3 a partir de 8. A Força 5 sozinha dá o patamar 2 |
| POW-08 | `POWER_FEEL`, contínuo por ponto `p` (teto de 10):<br>- escala do impacto 1 + 0,05 × p (1,0 a 1,5);<br>- tranco 4 + 0,3 × p px, por `CameraKick.kick(dx, dy, px)` com `px = CAMERA_FEEL.kickPx` de padrão;<br>- `force` × (1 + 0,03 × p), pelo hook `Player.strikeMods`, que troca o `damageMul` (`Player.ts:84`) e devolve `{damage, force}` sem campo novo; `strikes.ts:268-274` lê os dois;<br>- deslize × (1 + 0,03 × p), por `Enemy.slideBy(tier, dir, scale = 1)` e `EnemyMovement.slideBy`;<br>- rastro +1 px a cada 2 pontos.<br>Por patamar 0/1/2/3: hitstop no forte +0 / 10 / 20 / 30 ms e no leve +0 / 0 / 5 / 10; tremor no golpe forte do player a partir do patamar 2.<br>`HITSTOP_MS` continua 50/90, e o tranco padrão continua 4 px |
| POW-09 | `drawHeavyImpact` usa `toneOf(s)` no anel. Tons por patamar: azul, azul claro, vermelho, preto e vermelho, todos da `PALETTE` |
| POW-10 | `powerAuraDirector`: brasas nas mãos em repouso a partir do patamar 2 (`CursedFlame` com power 0,3) e chama no punho no patamar 3 (power 0,6). O ponto da mão é um **deslocamento fixo por `facing`** em `POWER_FEEL.handOffset`, medido na prancha: a folha do Yuta só marca mão nos quadros de técnica, carregar e arremesso (`yutaSheet.ts:214-227`), o `yutaAnchors` devolve `undefined` no repouso, e o `yutaAtlas.data.ts` não se edita à mão. O mesmo deslocamento vale para o quadro que cai na `player-hd`. Fica desligado na conjuração, na Reversa e fora do repouso. **Conferido em movimento no jogo** (repouso, corrida e repouso, para os dois lados), não só na prancha |
| POW-11 | O golpe com objeto do mundo ou com a arma vinculada de hoje aplica `statSheet.meleeMul(traços)`, com traços `{heavy, light, counter, shadow}`, nunca `MoveDef`. **O golpe de objeto não gasta o Passo sombrio** (`shadow: false`, leitura sem gasto). O `Prop` recebe um `PropDamage` do `StatsDirector` no lugar de `modifiers`, nos 3 pontos de criação (`arsenalDirector`, `drops.ts:86`, `world.ts:355`), e o dano continua resolvido em `Prop.onTouch`. Passa pelo `ImpactFx` com a faixa **forçada** em `heavy` (parâmetro novo `forced?: ImpactTier` em `impactTier`), inclusive o arremesso com `knockdown`, que hoje cairia em `decisive`: impacto amaldiçoado, tranco e rastro, não a faísca roxa |
| POW-12 | **Saiu da F29.** A escala do inimigo vai para a F30 (ver "Levado para a F30" abaixo) |
| POW-13 | O snapshot ganha `power: {points, tier, impactScale, hitstopBonusMs, tone}`, `damageNumbers: {live, last: {value, kind}}` e `stats: {meleeMul, techDamageMul, costMul}`, obrigatórios, num tipo em arquivo à parte; o literal `GameSnapshot` de `tests/game/debugApi.test.ts:33` ganha os três campos. Entra o parâmetro de debug `mods=forca:5` (README), lido em `statsDirector.reset()`, chamado no reset da run do `runDirector` logo depois do `this.s.modifiers.reset()` (`runDirector.ts:140-147`) |
| POW-14 | Com 8 inimigos vivos e Azul, Vermelho e soco ao mesmo tempo, os efeitos vivos ficam em 40 ou menos, os números em 12 ou menos, e o hitstop somado dos micro em 60 ms por segundo ou menos |

**Arquivos:**
- `core/statSheet.ts`, `power.ts`, `damageNumber.ts` e `hitBand.ts` (novos); `hit.ts`, `enemyBrain.ts` (evento `chip`), `bossBrain.ts` (postura do chip), `impactTier.ts` (faixa forçada) e `cameraKick.ts` (`px`);
- `data/feel.ts` (`POWER_FEEL`, faixas) e `tuning.ts` (`BOSS.chipPoiseMul`);
- `scenes/test/statsDirector.ts` e `powerAuraDirector.ts` (novos), e `vowDirector`, `arsenalDirector`, `shopDirector`, `runDirector`, `combat`, `effects`, `impactFx`, `uiSetup`, `snapshot`, `drops` e `world`;
- `game/DamageNumbers.ts` (novo), e `CursedFx`, `cursedImpact`, `fx`, `Prop.ts`, `Player.ts` (troca o hook, sem linha nova), `player/strikes.ts` (dano e `force` pelo hook), `Enemy.ts`, `enemy/EnemyMovement.ts`, `enemy/EnemyDefense.ts` e `tech/blue.ts`;
- `TestScene.ts`, que só perde linhas;
- `README.md` (parâmetro novo).

**Testes:**
- novos: `tests/core/statSheet.test.ts` (equivalência POW-01, com a compra de `vida`), `power.test.ts`, `damageNumber.test.ts`, `hitBand.test.ts`, `enemyBrainChip.test.ts`, `bossBrainChip.test.ts` (arquivo novo, porque `bossBrain.test.ts` está na lista de exceções do `max-lines`) e `tests/data/powerFeel.test.ts` (chaves na paleta);
- atualizados: `tests/game/debugApi.test.ts` (literal do snapshot), `cameraKick.test.ts` (o `px` e o padrão de 4 px) e `impactTier.test.ts` (a faixa forçada);
- sem mudança: `hitstop.test.ts`, `difficulty.test.ts` e `tuning.test.ts` (o BOSS é conferido campo a campo; os dois de dificuldade mudam na F30).

**Smoke novo:** `power.smoke.mjs` com `?debug&hd=1&area=modular&seed=1&maxAlive=1&enemyGuard=0`. Ele confere:
- POW-07/08: com `mods=forca:5&arsenal=manoplas,manoplas,manoplas` (o parser de `?arsenal=` sobe o nível repetindo o id, `arsenalDirector.ts:23`), os pontos são 11, o patamar é 3 e o `impactScale` 1,5; com `mods=forca:5` sozinho, o patamar é 2; sem nada, o patamar é 0;
- POW-05/06: o número aparece com o valor do acerto;
- POW-04/03b: com `tech=azul`, o hitstop fica em 0 nos tiques, o inimigo não entra em `hitstun` e ainda solta o golpe;
- POW-11: o golpe com arma (`arsenal=bastao`) dispara o evento de impacto amaldiçoado na faixa `heavy`.

Smokes que rodam junto: `fight`, `impact`, `feel`, `tech`, `defense`, `vows`, `arsenal`, `build`, `hud`, `boss`,
`enemy-`, `telegraph` (o `EnemyDefense` muda), `drops`, `held-item`, `armed`, `world-` (o `Prop` muda nos 3 pontos de
criação) e `shop` (a compra de `vida`).

**Levado para a F30** (conferido no código, para a spec dela):
- `DIFFICULTY.hpPerRound` = 0,06 e `damagePerRound` = 0,05, com os tetos de hoje (3,0 e 2,5). O número fica em
  `src/data/tuning.ts:155-157`; o `core/difficulty` não muda.
- Exemplos em rodadas comuns: HP 89 na r9, 96 na r11 e 125 na r19 (a r10 e a r20 são de chefe).
- `tests/data/tuning.test.ts:6-14` (o `toEqual` de SPN-13/14) passa a 0,06 e 0,05, citando o AD-014 revisado, e o
  `difficulty.test.ts` acompanha.
- O smoke `run-loop` (`run-loop.smoke.mjs:82`, `:113-125`, `:185`, `:192`) fixa `maxHp === 60` em todo inimigo novo,
  `player.hp === 88` e `attacker.damage === 12`. Com a escala, a r2 dá HP `round(60 × 1,06) = 64` e dano
  `round(12 × 1,05) = 13`, e o player fica com 87. As asserções passam a calcular pela fórmula
  `Math.round(base × (1 + perRound × (r − 1)))` em vez de fixar o número, e o `run-loop` entra nos smokes da F30.
- O smoke novo da escala usa `round=9` (89) ou `round=11` (96), nunca a r10.
- O Kokusen escalado (seção 5.2) entra no mesmo passo, com o `kokusen.test` refeito.

**O que o jogador nota no fim da F29:**
- todo ponto de Força muda o soco forte (impacto maior, tranco, inimigo voando mais), e com Força 5 ele já fica
  vermelho;
- com Manoplas, o soco chega ao preto e vermelho, com chama no punho;
- todo acerto mostra o número;
- o Azul para de engasgar, e o inimigo preso nele continua lutando;
- o objeto na mão bate com o mesmo peso do soco.

---

## 7. Decisões para o usuário confirmar

1. **3 técnicas mais o Domínio, nas teclas `O`/`B` e `P`/`N`**, em vez de 4 técnicas. A arma imbuída não precisa de tecla.
   - **Recomendo** assim: o jogo é de luta, a mão já está cheia e a União libera vaga.
   - O risco é parecer pouco para quem espera o VS. A compensação são 10 técnicas no pool, os eixos, os ramos e o
     Corpo Amaldiçoado.
2. **Eixo escolhido na própria carta.** A carta de melhoria mostra 2 eixos, um deles o eixo-foco marcado pelo jogador,
   e a escolha é feita com `W`/`S` antes de confirmar. O ponto grátis, o ramo e o Despertar são escolhidos num só
   painel por visita.
   - **Recomendo:** a build é planejada, e o "canhão" ou a "metralhadora" saem de propósito, sem painel novo.
   - A alternativa é um painel a cada compra, com mais interrupções.
3. **Ligar a escala do inimigo na F30, junto com os eixos, o Corpo Amaldiçoado, a inflação de 6% e o
   `expectedIncome`.** Isso revê o AD-014.
   - **Recomendo:** sem isso, a força não se sente e a build fecha cedo demais.
   - Não há fase em que o jogo fica mais difícil sem ferramenta nova: a escala é o último passo da F30.
4. **Ícone HD novo para as técnicas** (`art/hd/techIcons`, o `TechDef.kanji` vira `icon`) em vez de glifos novos no `kanji.ts` legado de 24×24.
   - **Recomendo o HD:** é a regra do projeto, e o legado sai na fase 5.
   - O custo é desenhar 5 ícones existentes mais 3 por leva.
5. **A arma vinculada vira imbuída:** fica guardada e muda os golpes de hoje (a Lâmina corta no leve, o Bastão varre
   no forte, a Lança atravessa no Contra, o Osso carrega no parry), sem tirar o combo nem o Contra.
   - **Recomendo:** não pede quadros novos do Yuta, não cresce o `moves.ts`, respeita "sem boneco de peças" e acaba
     com o "segurar a arma é jogar pior".
   - A arma com moveset próprio fica como feature de arte alta, só se o usuário quiser.
6. **Pool compartilhado de 7 vagas** para técnicas (no máximo 3) e talentos (no máximo 6), com +8 por vaga ocupada.
   - **Recomendo:** força a escolha entre feiticeiro e lutador desde a r2.
   - A alternativa são vagas fixas por categoria (3 + 4), em que toda build enche as mesmas caixas.
7. **Revisão do KOK-06:** o Kokusen deixa de dar 45 fixos e passa a ×2,5 do golpe que o disparou, com piso de 45 ×
   escala da rodada, e sobe com a Zona Negra e o Punho Negro Divergente.
   - **Recomendo:** o Black Flash é o momento mais épico do jogo e não pode valer menos a cada ato.
   - O risco é o Kokusen de um golpe forte com Força alta passar de 100. O teto de ×3,4 e a janela limitada a +30 ms
     seguram.
8. **Limiares pela linha do tempo da run:** ramo no Nv 2, Despertar no Nv 5, União e Evolução com a peça principal no
   Nv 4 e o catalisador em qualquer nível.
   - **Recomendo:** quem morre entre a r6 e a r12, o normal numa dificuldade de metroidvania, já viu ramo, Despertar e
     União. O Roxo continua alcançável até a r8.
9. **Base nova do Vermelho e do Azul** (Vermelho custo 30 e recarga 4500; Azul custo 40 e recarga 2500) e alcance
   travado em 320 px, com a Trajetória trocada pela Perfuração.
   - **Recomendo:** a Recarga e a Eficiência passam a valer cada uma numa técnica, e nada acerta fora da tela.
   - É mudança de comportamento de técnica que já existe; entra na F30 (Vermelho) e na F33 (Azul), com os smokes de
     técnica acompanhando.

---

## 8. Notas da revisão

O que mudou para cada problema apontado pelos dois revisores, e onde o plano ajustou a correção sugerida.

**Spec da F29 (revisor de código):**
- **Conta de linhas da `TestScene` (alta).** O `inputFor` inteiro vai para o `StatsDirector`, a l.284 vira
  `stats.bindPlayer`, o `DamageNumbers` fica com o `UiSetup` e o `powerAuraDirector` é membro do `StatsDirector`,
  tocado por `stats.update(delta)` no lugar do `vows.sync()`. A conta por passo está na tabela da 6.1 (399 → 393).
  Ajuste: o tique da aura sai do `stats.update`, que já roda por quadro, e não do `techDirector` nem do `combat`.
- **`EnemyDefense` interrompia a IA (alta).** Evento novo `{type: 'chip'; hit}` e POW-03b. O chip não soma estrutura,
  e o micro soma metade.
- **Postura do chefe (média).** `bossBrain.ts` e `BOSS.chipPoiseMul` em Arquivos, e `bossBrainChip.test.ts` como
  arquivo novo.
- **`debugApi.test` (média).** Atualizado na lista, com os campos obrigatórios.
- **`tuning.test`, `run-loop` e `round=10` (médias).** A escala inteira saiu da F29 (conserta também o problema de
  fases, abaixo). Os três ajustes estão em "Levado para a F30", já com os números certos (64/13 na r2, `round=9` ou
  `11`, `tuning.ts:155-157`).
- **Parser de `?arsenal=` (média).** O smoke usa ids repetidos. O `mods=` é lido no `statsDirector.reset()`, chamado no
  reset da run do `runDirector`.
- **Compra de `vida` (média).** `shopDirector.ts` em Arquivos, `stats.sync()` antes do `heal`, e o caso no teste de
  equivalência.
- **Lacunas da POW-11 (média).** Traços em vez de `MoveDef`, `PropDamage` nos 3 pontos de criação (`drops.ts` e
  `world.ts` entraram), o golpe de objeto não gasta o Passo sombrio, e a faixa forçada em `impactTier`.
- **Pontos de mudança sem parâmetro (média).** `cameraKick` com `px`, `slideBy` com `scale`, e o hook
  `Player.strikeMods` no lugar do `damageMul`. A regra mudou de "o `Player.ts` não cresce" para "troca hook por hook,
  sem campo novo".
- **Mão do Yuta (média).** Deslocamento fixo por `facing`, medido na prancha, e conferência em movimento no POW-10.
  Ajuste: não marcar mão nos quadros de repouso pelo `sprite-atlas.mjs`, porque pede mexer na fonte de arte por causa
  de um efeito.

**Design (revisor de jogo):**
- **Conteúdo tarde e HP antes dos eixos (alta).** Fases reordenadas (seção 6): a escala só liga na F30, como último
  passo; o Vermelho e o Corpo saem completos na F30; o Domínio vem na F31 (o Santuário usa o Corte direto); os afixos
  na F32. Ajuste: a 1ª técnica nova do JJK passa da F35 para a F34, e os votos e a leva 2 descem. É o preço de pôr a
  ultimate, o chefe variado e a trilha do corpo a corpo antes. Nenhum item do pedido saiu.
- **Eixo sorteado tira agência (alta).** A carta mostra 2 eixos à escolha, com o eixo-foco, e a carta 0 é do
  item-foco em 60% das lojas. A meta de 60% virou teste.
- **Limiares altos (alta).** Ramo no Nv 2, Despertar no Nv 5, União e Evolução com Nv 4 mais catalisador em qualquer
  nível, e as metas no `expectedIncome` (seção 3.3).
- **Eficiência dominante e Trajetória inútil (alta).** Piso de 60% do custo, gargalo declarado por técnica, extra da
  Recarga no 3º ponto, Perfuração no lugar da Trajetória, alcance travado em 320 px e teste de eixo dominante.
- **Corpo a corpo sem trilha (alta).** Corpo Amaldiçoado (seção 2.6). Ajuste: ele é inato e fica ao lado do atributo
  Força, sem substituí-lo e sem ocupar vaga de talento. Substituir a Força quebraria os testes de MOD-05 e o patamar
  da F29, e ocupar vaga puniria justamente o lutador no pool novo.
- **Ultimate morna (alta).** Ativação decisiva por fração do HP máximo, cortes micro, Corte do Mundo que executa
  abaixo de 35%, Jackpot com base de 33%, Riichi até 60%, meia recompensa na falha e piedade na 3ª falha, e a
  Amplificação na leva 1.
- **Arma genérica (alta).** Arma imbuída (seção 5.4), com eixos por traço. Ajuste: entra na F36, logo depois das vagas
  (F35), e não junto delas, para a fase não ficar grande demais.
- **Força em degraus (média).** Escala contínua por ponto e patamares em 2, 5 e 8. Ajuste: o tranco cresce 0,3 px por
  ponto (não 0,5) e o rastro 1 px a cada 2 pontos (não 1 por ponto), com teto de 10 pontos, para ficar na faixa de 4 a
  7 px e +5 px que a arte já aguenta.
- **Talentos genéricos (média).** Regra do sinal visível e do gatilho novo por nível, a tabela refeita e a
  `TalentStrip`. Ajuste: o Seis Olhos Nv 3 não zera o custo, porque violaria o piso de 60%; vira crítico e +10 de
  energia.
- **Combos duplicados (média).** Regra de combo e teste de nomes e textos únicos. Saíram "Troca com Vermelho", "Prego
  no Fio", "Escama Refletida", "Palavra Absoluta" e a Evolução "Desmantelar do Rei" (o nome ficou só no Despertar).
  Entraram o Eco da Palma, a Rede de Cortes, a Palavra no Ponto Fraco, o Prego Rubro e a Ordem Elétrica, e os
  Despertares da Ressonância, da Fala e do Divergente.
- **Ricochete sem parede (média).** Rebate de inimigo para inimigo num raio de 200 px, e o Fliperama vale em qualquer
  alvo.
- **Black Flash enfraquece (média).** KOK-06 revisado (seção 5.2) e decisão 7.
- **Fontes proporcionais e Dedos (média).** O Clivar caiu para 2% e ficou só no ramo; o Toji não exige mais o Clivar;
  todo Despertar, a ativação do Domínio e o Kokusen ganharam um componente proporcional com teto; os Dedos ficaram em
  +6% de dano e +8% de dano sofrido, e o 4º e o 5º dedos só caem do chefe Portador.
- **Tudo chip (média).** Três faixas (chip, micro e normal) na seção 4, e o teto do micro no POW-03 e no POW-14. O
  `band: 'micro'` entra já na F29, junto com o chip.
- **Chefe sem variação na 1ª run (média).** Arquétipo pela seed, 1 afixo leve na r5, os afixos de padrão na leva 1
  (Couraça e Enfurecido foram para a leva 2, e o Enfurecido ganhou mudança de padrão), Adaptativo pela fonte mais usada
  com esquecimento, e a Pele de Dragão quebrando também com Contra, finalizador e quebra de postura.
- **Hora Extra e Expediente punem quem é forte (média).** Os dois passaram a contar abates: a Hora Extra soma por
  abates sem levar dano na run inteira, e o Expediente vira bônus a partir do 11º abate da rodada.
- **Votos quebrados (média).** A Restrição Celestial só é oferecida com a Amplificação existindo (leva 1, F31), e o
  Domínio do player vira Amplificação. O Voto do Black Flash só é oferecido com o Divergente no loadout. Ajuste: o
  custo "fora da Zona" ficou, porque com o Divergente a Zona é alcançável, e as outras duas saídas sugeridas punem
  quase todo golpe.
- **Limite sem escolha de caminho (média).** Pool de 7 vagas com o máximo por categoria e +8 por vaga, e a economia
  da seção 3.3 refeita com o pool e com os pontos do Corpo.
