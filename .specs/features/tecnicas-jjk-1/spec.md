# Técnicas JJK 1 - Specification

## Problem Statement

Depois da F33 as cinco técnicas de hoje crescem por eixo, ramo e Despertar, mas o pool ainda só tem 4 técnicas à venda
(o Roxo nasce da União), e cada técnica nova pede mexer em cinco lugares do `TechRunner` (campo, construtor, getter do
snapshot, `update` e a união fechada `'red' | 'blue' | 'purple'` do `techObjects`). O efeito de técnica que sai de golpe
ou de Domínio também mora espalhado: a Onda do Punho no `strikeEmitter` da F30 e o corte do Santuário montado à mão no
`domainDirector` da F31. O ícone da técnica ainda é o kanji legado de 24×24 esticado, e os ícones HD já desenhados no
branch `feat/icones-hd-tecnicas` não estão ligados a nada.

A F34 (`docs/plano-builds-e-habilidades.md`, linha F34 da seção 6, seções 2.5, 4 e 5.1, regra do `TechEmitter` da
seção 6, decisão 4 da seção 7) abre o `TechRunner` num registro `TechId → TechModule`, abre o `techObjects`, junta os
dois emissores no `TechEmitter`, liga o ícone HD à carta e ao `EnergyHud` e entrega as três técnicas da leva 1 (Boogie
Woogie, Ressonância e Fala Amaldiçoada) jogáveis, sobre as regras puras que o branch `feat/regras-tecnicas-leva1` já
tem verificadas (`.specs/features/regras-tecnicas-leva1/`, 41 requisitos TRL/BOO/RES/FAL).

A F34 depende da F33 (`eixos-das-tecnicas`) e usa, sem mudar o contrato:
- Da F29: `Hit.band` (`chip`/`micro`), `core/hitBand.ts`, `DamageNumbers` (número pela faixa, `effects.onTechConnect`),
  o `onTechHit(hit, point, target)` do `TechContext` e o `StatsDirector` como dono único dos multiplicadores.
- Da F30: `core/axisBuild.ts` (`AxisBuild`, `loadout.axes`), `Loadout.stats(id)`/`TechStats`,
  `Loadout.refundCooldown(slot, fraction)`, o piso de 60% do custo (PRC-05), o `slotHeld` no `TechCaster` e no
  `TechRunner` (VRM-14), a carta de 2 eixos (`axesFor`, `axisRng`, `W`/`S`), o preço do ponto e a trava (PRC-02 a
  PRC-04), o banner e a câmera lenta do Despertar, a borda dourada do `EnergyHud`, `core/axisParam.ts` (`axes=` e
  `ramo=`) e o `core/strikeEmitter.ts` (Onda do Punho, CRP-10 a CRP-12).
- Da F31: o Santuário (`core/sanctuary.ts`, `SanctuaryTriggers` com teto de 4 por segundo, SAN-01 a SAN-05), o
  `domainDirector` que hoje desenha o `CutFx` e monta o acerto do corte direto, e a barra de Domínio (DHD-01).
- Da F33: as cinco técnicas no molde de eixos (EIX-01 a EIX-12), o `AxisItem` com as técnicas, o `ChoicePanel` com
  página genérica e o `choiceDirector`, a maestria por conjuração (MAE) e o teste de eixo dominante por técnica.
- Do branch `feat/icones-hd-tecnicas` (`c1fac80`, `687a23f`): `src/game/art/hd/techIcons.ts` (`TECH_ICON_IDS`,
  `techIconSheet(48 | 24)`), `src/game/art/hd/icons/*`, o registro das folhas `TEX.techIcons` (48) e
  `TEX.techIconsSmall` (24) em `art/index.ts` (`registerHdSheets`) e `tests/game/art/techIcons.test.ts`. Ids dos
  ícones: `vermelho`, `azul`, `roxo`, `divergente`, `corte`, `boogie`, `ressonancia`, `fala`, `santuario`, `jackpot`,
  `amplificacao`.
- Do branch `feat/regras-tecnicas-leva1` (este worktree, `519ac6b`): `core/axisRule.ts`, `core/swap.ts`,
  `core/boogie.ts` (`BoogieState`), `core/resonance.ts` (`ResonanceState`), `core/cursedSpeech.ts` (`speak`,
  `SpeechCast`) e `data/techRule.ts`, `data/boogie.ts`, `data/resonance.ts`, `data/cursedSpeech.ts`.

Código conferido em 14/10 neste worktree (base `4c0efae` mais as regras puras; ainda sem a F29 a F33) e nos branches
citados:
- `src/game/TechRunner.ts`: um campo por técnica (l.28-32), construção uma a uma (l.72-76), getters
  `kokusenSnapshot` (l.85), `redDebugState` (l.90) e `techObjectsSnapshot` com a união fechada
  `'red' | 'blue' | 'purple'` (l.95-97), e o `update` que chama cada técnica pelo nome (l.111-115).
- `src/game/debugApi.ts:334`: o tipo do `techObjects` com a mesma união fechada. Os 3 smokes que buscam orbe por
  `kind`: `evolution.smoke.mjs:75,126` (`'purple'`), `red-anime.smoke.mjs:120,149` (`'red'`) e
  `techniques.smoke.mjs:106,188,225` (`'red'`, `'blue'`). `tests/game/debugApi.test.ts:212` usa `techObjects: []`.
- `src/core/cast.ts`: a `CastMachine` nega por recarga do slot (l.83-85) e por energia (l.86-89) e cobra custo e
  recarga só na entrada de `release` (l.126-130). Nada nela sabe de cargas nem de 2º toque.
- `src/game/TechCaster.ts:79-93`: toda tecla de slot (`JustDown`) vira `machine.request`; não há caminho para uma
  técnica consumir a tecla sem conjurar.
- `src/data/techniques.ts`: `TechId` (l.6), `TechDef.kanji` com 5 quadros do kanji legado (l.12) e `TECHNIQUES`
  (l.26). `Record<TechId, …>` exaustivos que crescem com o `TechId`: `TECHNIQUES` e `techFx/Aura.ts:11-17`
  (`AURA_COLOR_BY_TECH`; `AuraColor` em `art/sprites/techFx.ts:63` tem só `blue`, `red`, `white`, `purple`). Leem
  `id in TECHNIQUES` e pegam as técnicas novas sozinhos: `core/loadout.ts:21` (`parseDebugTech`), `core/build.ts:82`
  (arquétipo feiticeiro) e `game/ShopPanel.ts:239`.
- Kanji de técnica na tela: `EnergyHud.ts:98-102` (sprite `TEX.kanji` esticado a 48 px) e `:174`
  (`setFrame(def.kanji)`); `ShopPanel.ts:57-58` (`KANJI_SIZE` 18), `:161-165`, `:238-243` e `flyToSlot` `:271-286`,
  chamado em `shopDirector.ts:98-101` com o quadro do kanji; `techFx/Callout.ts:30` (`ICON_SIZE` 84) e `:68-71`. O
  cartão do Kokusen usa os quadros `kuro`/`sen` do mesmo `TEX.kanji` (KOK-29) e não é técnica.
- `src/game/Player.ts:512-515`: teleporte só em x, do FxLab; `:105` `health`. `Player.ts` tem 518 linhas e a regra do
  plano é "troca hook por hook, sem campo novo".
- `src/core/enemyBrain.ts:4`: os estados do comum (`hitstun`, `stagger`, `ragdollStun`…); não há atordoamento genérico
  nem "erra o próximo golpe". `src/core/bossBrain.ts:104` tem `stun(ms)`; `src/core/bossAI.ts:54,243` cancela o
  ataque em curso quando `canAct` cai. `src/game/Projectile.ts:13`: `ProjectileKind = 'projectile' | 'shockwave'`.
  `Enemy.ts` (437 linhas) e `Boss.ts` (381) estão perto do teto de 400 efetivas.
- `src/data/shop.ts:110-156`: `TECHNIQUE_SHOP_ENTRIES` com o `techGate` (que a F33 tira); `tests/data/shop.test.ts:96-125`
  e `tests/core/evolutionShop.test.ts:20` leem o catálogo.
- Regras puras da leva 1: o `BoogieState` guarda cargas e recarga próprias (`canCast`, `swap`, `feint`, `update` com o
  evento `echo`, `onTechKill`); o `ResonanceState` tem fases `ready`/`armed`/`cooldown`, `nextTap`, `throwNails`,
  `update(dt, targets, wall?)`, `detonate`, `onTargetDied`, `strawDollEcho`; a `speak` devolve a `SpeechCast` com
  `onTargetDied`, `onPushedImpact` e `claimKillRefund`. Os três estados recebem a build pronta no construtor.

## Goals

- [ ] Uma técnica nova entra com o arquivo do módulo, uma linha no registro, os dados e a entrada no `TECHNIQUES`, sem
      tocar no `TechRunner`, no `TechCaster` nem no `techDirector`.
- [ ] Todo efeito de técnica que sai de golpe, parry ou Domínio passa pelo `TechEmitter`, sem gastar energia.
- [ ] O slot do HUD, a carta da loja e a chamada da conjuração mostram o ícone HD da técnica, e nenhum código de
      técnica lê mais o kanji legado.
- [ ] Boogie Woogie, Ressonância e Fala Amaldiçoada estão na loja, sobem do Nv 1 ao Nv 6 por eixo com ramo e Despertar,
      e cada uma se joga do jeito do plano: trocar de lugar, cravar e detonar, gritar e travar.
- [ ] O pool tem 7 técnicas à venda (mais o Roxo da União), nos 2 slots de hoje.
- [ ] A `TestScene` não ganha nenhuma linha efetiva líquida na F34.

## Passos e commits

Na ordem. Refatoração é passo próprio, com os smokes iguais; mudança de contrato do snapshot é passo próprio, com os
smokes que leem o contrato acompanhando; cada passo de técnica termina jogável (na loja, no painel e no HUD).

| Passo | O que entra | `TestScene` (efetivas) |
| --- | --- | --- |
| 0. **Refatoração, com os smokes iguais** | registro `TechId → TechModule` em `game/tech/registry.ts`; o `TechRunner` itera o registro; as 5 técnicas viram módulos sem mudar comportamento | 0 |
| 1. **Contrato do `techObjects`** | `{ id, tech, kind, x, y, traveled }` com `kind` do módulo, tipo em `game/techSnapshot.ts`; os 3 smokes trocam a busca por `tech` e `kind` | 0 |
| 2. **Refatoração, com os smokes iguais** | `core/techEmitter.ts` absorve o `strikeEmitter` (F30) e o caminho do corte do Santuário (F31) | 0 |
| 3. **Ícone HD** | `TechDef.kanji` vira `icon`; `EnergyHud`, carta, voo até o slot e chamada da conjuração com o ícone HD; ícone do Domínio na barra | 0 |
| 4. **Boogie Woogie** | `TechId`, `TECHNIQUES`, carta, eixos, ramo e Despertar; portão de cargas; módulo `tech/boogie.ts` e vista `techFx/BoogieFx.ts`; atordoamento do comum | 0 |
| 5. **Ressonância** | idem; 2º toque sem conjuração; pregos e marcas no `techObjects`; eco do Boneco de Palha pelo `TechEmitter` | 0 |
| 6. **Fala Amaldiçoada** | idem; custo em vida; cone, "Exploda" e "Volte"; Exploda em Cadeia e Esmague | 0 |

## Out of Scope

| Feature | Reason |
| --- | --- |
| 3º slot `O`/`B`, `SlotIndex`, pool de 7 vagas com +8 por vaga, `BuildBar`, bandeja do eixo-foco, Abandonar, talentos com nível, `TalentStrip`, `buildEffects` e pontinhos de nível no `EnergyHud` | F35. Na F34 as técnicas novas cabem nos 2 slots de hoje, o eixo-foco é o automático da F30 e o piso de custo continua no `Loadout` |
| Ícone do Corpo Amaldiçoado e dos talentos | F35 (`talentIcons.ts`); a F34 liga só os ícones de técnica e de Domínio que já existem |
| Uniões, Evoluções e Duos com as técnicas novas (receitas `{kind, id, minLevel}[]`) | F37. O Eco da Palma não depende de outra técnica (seção 2.5) |
| Convergência, Cães Divinos, Punho de Trovão e Erupção | Leva 2 (F41) |
| Arma imbuída | F36 |
| Elites | F38 |
| Os bonecos de treino do FxLab como alvo das 3 técnicas novas e teclas do FxLab para elas | O FxLab é laboratório das técnicas de hoje; o smoke `fxlab` só não pode quebrar |
| Paleta própria por ramo e por Despertar | Feature de arte à parte, como na F33; a F34 usa a borda dourada, o banner e a câmera lenta da F30 |
| Redesenhar os ícones HD | Já desenhados e revistos no branch `feat/icones-hd-tecnicas`; a F34 só os liga |
| Mudar as regras puras da leva 1 além da revisão BOO-02 da Eficiência (JJK-17) | Verificadas na `regras-tecnicas-leva1`; o adaptador só as chama |
| Remover o `TEX.kanji` e o `sprites/kanji.ts` | O cartão do Kokusen ainda usa `kuro`/`sen`; o legado sai na fase 5 do plano de sprites |
| Versão antiga (`?hd=0`) | Não recebe trabalho novo; os smokes antigos só não podem quebrar |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| 3 técnicas + Domínio, pool de 7 vagas, arma imbuída e escala do inimigo na F30 (decisões 1, 3, 5 e 6 da seção 7) | Valem; da F34 nenhuma delas muda código além do que a F30, a F31 e a F33 já ligaram (as técnicas novas usam os 2 slots de hoje) | Confirmadas pelo usuário | y |
| Ícone HD (decisão 4) e as demais decisões da seção 7 | Seguem a recomendação do plano | O usuário mandou seguir a recomendação nas demais decisões | y |
| Nada automático | Nenhum efeito das três técnicas começa sem a tecla do slot; o que sai depois (eco da Palma, eco do Boneco, cadeia da Fala, esmagamento) é consequência da conjuração que o jogador fez, e o eco do Boneco de Palha só existe depois de uma detonação do jogador | Pedido do usuário (seção "Pedido" do plano) | y |
| Prefixos dos requisitos | REG (registro), TOB (`techObjects`), EMI (`TechEmitter`), ICO (ícone HD), JJK (entrada comum das 3 técnicas e regras de casa), BWG (Boogie no jogo), RSN (Ressonância no jogo), FLA (Fala no jogo) | O validador só aceita `CAT-NN`; nenhum desses prefixos existe nas specs (conferido em todos os branches) e os da leva 1 (TRL, BOO, RES, FAL) continuam sendo a regra pura | n |
| Ids das técnicas novas | `TechId` `boogie`, `ressonancia`, `fala`, iguais aos ids dos ícones em `techIcons.ts`; nomes "Boogie Woogie", "Ressonância", "Fala Amaldiçoada" | O `TechDef.icon` vira o próprio id do quadro, sem tabela de tradução | n |
| Ids de eixo e de ramo | Os de `data/boogie.ts`, `data/resonance.ts` e `data/cursedSpeech.ts` (`BOOGIE_AXIS_IDS`, `RESONANCE_AXIS_IDS`, `SPEECH_AXIS_IDS`; ramos `palmaFalsa`/`duplaPalma`, `grampo`/`boneco`, `exploda`/`volte`); `ramo=<item>:a` é o 1º do par (Palma Falsa, Grampo, "Exploda"), na ordem do plano | Mesmo molde da F30 e da F33 | n |
| Raridade e preço na loja | Boogie comum (20), Ressonância comum (20), Fala rara (26), antes da inflação (PRC-01); as 3 entradas vão no **fim** do `GAME_SHOP_CATALOG` | O plano não dá a raridade; a Fala é o controle forte da leva e custa vida, então fica rara como o Azul e o Vermelho. "Carta nova entra no fim do catálogo" é regra de fase do plano | n |
| Testes que fixam o sorteio da loja por seed | Os que mudarem por causa das 3 entradas novas trocam só o id esperado, com o motivo no commit; nenhum teste de regra de loja muda de asserção | O sorteio pondera o catálogo inteiro; entrar no fim minimiza, mas não zera, a mudança | n |
| Cor da aura e da chamada | `AuraColor` ganha `yellow` (âmbar `A` e branco `w`, desenhado em código como as outras); Boogie `yellow`, Ressonância `white`, Fala `purple`. `TechDef.aura` (borda da chamada): Boogie `A`, Ressonância `S`, Fala `T` | O plano pede o lampejo amarelo no Boogie; a Ressonância é aço; a Fala usa o roxo do halo do ícone. Todas são chaves do `PALETTE` | n |
| Tempos de conjuração | Os de `data/*.ts` com carga 0 (a `CastMachine` pula, CAST-02): Boogie sinal 80, soltura 60, recuperação 150; Ressonância 120/80/180; Fala 100/80/200 | Números já gravados na leva 1; o plano só dá o 80/60 do Boogie | n |
| Eficiência do Boogie contra o piso de 60% | `BOOGIE.axes.eficiencia` passa de 20/16/12/8 para 20/17/14/12, e o BOO-02 e o `tests/core/boogie.test.ts` acompanham (custo 12 no 3º ponto) | O piso da PRC-05 (`ceil(0,6 × 20)` = 12) cortaria o 8 e deixaria o 3º ponto morto; é a mesma correção que a F33 fez na Eficiência do Desmantelar | n |
| Recarga no 3º ponto das 3 técnicas | Vale a regra da leva 1 (TRL-06): só o 1º abate da conjuração devolve 30%, pelo `onTechKill` do Boogie (carga em curso), pela recarga já cortada da Ressonância e pelo `claimKillRefund` da Fala, que a F34 aplica no slot com `Loadout.refundCooldown` | A F30 e a F33 devolvem por abate; a leva 1 já fixou "uma vez por conjuração" porque 4 abates passariam de 100%. Fica registrado que as duas regras convivem até a calibração | n |
| Componente proporcional | `round(pct × maxHp)` sem `damageMul` nem `vowDamageMul`, somado ao acerto que o carrega (o `maxHpBonus` da F30), uma vez por alvo por conjuração, como as regras puras já devolvem | Regra da F30 e da F33 (EIX-05) | n |
| Multiplicadores de dano | Todo dano de número das 3 (choque, prego, Grampo, detonação, Coroa, eco do Boneco, "Exploda") sai × `damageMul` × `vowDamageMul`, arredondado como o `loadout.ts`; a tontura, o atordoamento, a força e os componentes proporcionais não | Mesmo `TechStats` das outras técnicas (EIX-02) | n |
| Build mudando no meio da run | Os estados puros recebem a build no construtor. O módulo refaz o estado ao fechar a konbini (compra, painel, `axes=`) e no reset da run: Boogie com as cargas cheias, Ressonância pronta e sem marca, Fala sem rastro | Ponto de eixo só entra na konbini, onde não há prego no ar nem carga gasta que importe | n |
| Portão de conjuração do módulo | O módulo pode decidir a tecla do slot antes da `CastMachine`: conjurar (caminho de hoje), consumir sem conjurar (2º toque da Ressonância) ou negar com motivo (`cooldown` do Boogie sem carga, `hp` da Fala). As 5 técnicas de hoje não declaram portão e seguem o caminho de hoje | O Boogie tem cargas próprias e a Ressonância cobra só o 1º toque; sem isso a `CastMachine` negaria a 2ª carga pela recarga do slot e cobraria energia de novo no 2º toque | n |
| Recarga do slot das técnicas com estado próprio | O `Loadout` espelha a recarga do estado puro: Boogie `rechargeLeftMs` enquanto não há carga, senão 0; Ressonância `cooldownLeftMs`; a `CastMachine` não inicia recarga na soltura dessas duas | O overlay do `EnergyHud` e o `cooldownOf` continuam a única leitura do HUD e do snapshot | n |
| Palma Falsa e o tempo de segurar | Com o ramo Palma Falsa, a tecla solta antes de 250 ms troca no instante `max(80 ms, soltura)` desde o aperto; segurada até 250 ms, finge aos 250 ms. A `CastMachine` fica no sinal até a decisão (lida pelo `slotHeld`) | A regra pura só sabe "segurou 250 ms ou mais"; trocar aos 80 ms sem esperar quebraria a finta, e esperar sempre 250 ms atrasaria a troca de quem não segura | n |
| Leitura da Dupla Palma | Enquanto a 2ª palma está armada o ícone do slot pisca a cada 250 ms, como a Ressonância com marca (RSN-11). Uma tecla na soltura ou na recuperação da 1ª palma (~210 ms) é ignorada como hoje (CAST-08); a janela de 1000 ms conta da troca | Sem o piscar a janela de 1 s é invisível; guardar a tecla mudaria a `CastMachine` de todas as técnicas | n |
| "Erra o próximo golpe" da Palma Falsa | O comum enganado fica marcado até o fim do próximo golpe dele ou por 3000 ms, o que vier antes; o golpe sai, mas a caixa não dá dano, e quando ele erra abre no player a janela de Contra de 400 ms (`CounterWindow`) | "Os inimigos perto erram o próximo golpe (janela de Contra de 400 ms)"; sem prazo a marca ficaria para sempre no comum que foge | n |
| Atordoamento do comum (tontura do Boogie e "Pare!" da Fala) | Um estado novo do `enemyBrain`, `stunned`: não anda, não começa golpe e cancela o golpe em preparo (telegrafado, ainda sem caixa ativa); não derruba e não conta em `downHits`; golpe recebido nele não o encerra. Atordoar de novo fica com o maior restante | Não existe atordoamento genérico hoje; reaproveitar `hitstun` encurtaria a tontura no 1º golpe, e o `ragdollStun` derrubaria | n |
| Atordoamento do chefe | `bossBrain.stun(ms, 'tech')`: a causa nova `tech` põe o chefe em `stagger` pelo `bossStunMs` da Fala **sem** armar o finalizador e sem o multiplicador de dano do `stagger`; a causa `wall` da investida segue como hoje. A Finta Total cancela pelo caminho do `canAct` (`bossAI.ts:243`) | O `stun(ms)` de hoje arma o `finisherReady` (`bossBrain.ts:121-126`): toda Fala (150 ms no chefe, a cada 4 s) abriria o finalizador de 12% do HP e o dano × `staggerDamageMult`, e a Fala viraria a melhor arma contra chefe da run. Era desvio pendente no design; a revisão adversarial o trouxe para a spec | n |
| Candidatos da troca | Comuns vivos e o chefe com a caixa (`hurtRect`), os orbes vivos do `techObjects` com `kind: 'orb'` do Vermelho e do Roxo e os `Projectile` do chefe com `kind: 'projectile'`. A onda de choque do chefe, os pregos da Ressonância e o orbe do Azul não entram | "O inimigo, o orbe próprio ou o projétil"; a onda corre no chão e prego é marca, não orbe. Trocar com o Azul é a Evolução **Vácuo de Troca** (Boogie Nv 4 + Azul, tabela de combos do plano, F37), e a regra de combo proíbe a Evolução repetir o que a peça já faz sozinha | n |
| O que acontece com o trocado | O orbe e o projétil seguem com a mesma velocidade e a vida que restava; o corpo fica com a velocidade zerada; o player fica com a velocidade zerada e sem perder o estado de golpe | Troca é teleporte; manter a velocidade do orbe deixa a combinação com o Vermelho legível | n |
| Para onde o player olha depois da troca | Trocando com um corpo (comum ou chefe), o player passa a olhar para o trocado (`Player.face`, o `debugFace` de hoje renomeado, sem campo novo); com orbe ou projétil, mantém o lado | O trocado fica atrás do player e de costas para ele: virar sozinho entrega o golpe nas costas do tonto (a cena do Todo); mantendo o lado, o player ficaria de costas para o único alvo que a troca preparou | n |
| Teleporte do player | O teleporte do FxLab (`Player.ts:512-515`, só em x) passa a aceitar x e y e serve aos dois; nenhum campo novo no `Player` | Regra do plano para o `Player.ts` ("troca hook por hook, sem campo novo") | n |
| `fits` da troca | Recusa toda caixa que sobrepõe corpo estático do Matter (terreno) ou módulo sólido do mundo; corpos vivos (inimigos, chefe) não bloqueiam | Seção 2.5; corpo vivo sai do lugar sozinho, e bloquear por ele recusaria quase toda troca na horda | n |
| Eco da Palma | O evento `echo` troca de volta pelo `swapPlacement` com as posições do momento; se o alvo morreu, sumiu ou não cabe, o eco não troca e não morde (evento `boogieEchoRefused`); trocando, o alvo toma os 4% (chefe 1%) como acerto `micro` | O plano diz "eco"; a seção 4 põe eco na faixa micro | n |
| Origem da Ressonância e da Fala | O centro da caixa do player (`hurtRect`), como o `boxCenter` que o Boogie já usa | Um ponto só para as três; a mão muda de quadro a quadro | n |
| Mira da Fala | O ponto de cada alvo passado ao `speak` é o x do centro da caixa com o y do centro do player preso à faixa vertical da caixa do alvo (o ponto da caixa mais perto do eixo do cone); a linha de visão vai até esse ponto. O `onTargetDied` e o `onPushedImpact` recebem o centro de verdade | O `inCone` mede pelo ponto (`cursedSpeech.ts:53-60`): o chefe (40×56) encostado no player (20×36) tem o centro 10 px acima a 30 px, 18° contra os 15° do cone de 30°, e a Fala de base não o travaria; num degrau o comum colado também escaparia. A regra pura não muda, só o ponto que o adaptador entrega | n |
| Pregos e o grupo | O leque de 36 px cabe num corpo de 36 px: no chão plano os pregos cravam todos no 1º alvo da fila (RES-03). A Ressonância de base é dano concentrado e adiado; o grupo vem da Propagação, do Grampo e da Coroa, e o texto da carta diz "crava no 1º alvo à frente" | Regra pura verificada; prometer "no grupo" faria o jogador achar que os pregos falharam | n |
| Sorteio do leque de pregos | O `Rng` do stream das técnicas que o `TechRunner` já recebe (`roll`), embrulhado num `Rng` | Mesma seed, mesmos pregos (RES-12); sem stream novo em `run.ts` | n |
| Eco do Boneco de Palha | Passa pelo `TechEmitter` (fonte `strawDoll`, `micro`, com postura), com o teto de 4 por segundo; o eco não gera eco; só o Boneco (ramo, 250 ms depois da detonação) sai do próprio módulo | "Tudo que dispara efeito de técnica a partir de golpe, parry ou Domínio" passa pelo `TechEmitter` (seção 6); o eco nasce do dano de outra fonte | n |
| Teto do `TechEmitter` | 4 emissões por 1000 ms de tempo de jogo **por fonte** (`wave`, `sanctuary`, `strawDoll`); uma fonte não come o teto da outra | Os dois emissores de hoje têm cada um o seu teto de 4 (CRP-12, SAN-02); um teto só mudaria o comportamento no passo de refatoração | n |
| Custo em vida da Fala | Sai na soltura junto com a energia; não é "levar dano": sem reação de golpe, sem cancelar a conjuração (CAST-07), sem invulnerabilidade, sem número de dano vermelho, sem zerar a Fúria e a Cadência do Corpo (F30) e sem contar como dano no `updateGameplay` da `TestScene`, onde a queda de `lastPlayerHp` zera o contador de combo (CMB-02) e avisa a recuperação: a comparação passa a somar o `Health.spent`, expressão por expressão, sem linha líquida | É uma escolha do jogador, não punição; zerar a Fúria ou o combo tornaria a Fala inimiga da build de lutador | n |
| Vida e o portão da Fala | O portão nega o aperto com `techDenied:hp` se a vida não passa do custo em vida; se na soltura ela já não passar (golpe tomado no sinal), a fala é recusada, a energia volta e a vida não muda | A regra pura recusa na soltura (FAL-04); negar no aperto evita o sinal à toa | n |
| Aviso da recusa por vida | `techDenied:hp` pisca em vermelho o ícone do slot apertado pelo tempo do flash da TEC-10; a barra de energia não pisca | Piscar a barra de energia diria "falta energia" e o jogador esperaria a barra encher; o `Hud.ts` (barra de vida) não pode crescer (JJK-15) | n |
| Fala que não acerta ninguém | Cobra energia e vida e inicia a recarga, como o Vermelho que erra | Conjuração feita é conjuração paga | n |
| Fala e a maestria | Cada alvo atordoado conta como acerto da conjuração (MAE: +1 no 1º alvo, +3 uma vez no chefe) mesmo sem dano, e solta o gatilho do Santuário uma vez por conjuração | O atordoamento é o efeito da técnica; sem isso a Fala nunca subiria por maestria | n |
| Acerto sem dano | Não mostra número de dano; a faísca e o hitstop seguem a faixa | Número "0" na tela é ruído | n |
| Esmague | O adaptador avisa a `SpeechCast` quando um empurrado pelo "Volte" encosta em parede do terreno, módulo sólido ou outro comum vivo dentro dos 800 ms da janela (`CURSED_SPEECH.esmague.windowMs`) | A regra pura já guarda a janela; o adaptador só detecta o toque | n |
| Teste de eixo dominante | Ressonância entra no teste com o modelo: dano por conjuração = `pregos × (3 + detonação)` (todos os pregos no mesmo alvo, em fila), período = `max(recarga + sinal, custo ÷ 8 energia/s)`; o mediano é o dos eixos que mudam o dano sozinhos nesse modelo (Pregos e Detonação), e o par Eficiência 3 + Recarga 3 precisa subir o dano sustentado da Recarga 3 sozinha. Boogie e Fala ficam fora, como o Corpo na F30 (eixos de utilidade: só o Choque e nenhum eixo da Fala dão dano) | Com o mediano dos 6 eixos (≈ 1,0, porque a Ressonância "no meio" deixa Eficiência e Recarga mortas sozinhas e Marca e Propagação valem 0 no modelo), Pregos 3 (2,0×) e Detonação 3 (2,04×) passam de 1,35× e o teste obrigaria a cortar o "3 → 6" e o "20 → 44" do plano. A troca do mediano é desvio do texto da seção 2.1 e pede o aval do usuário | n |
| Calibração | Se o teste da Ressonância falhar no modelo acima, o número do dado muda no passo 5 e o design registra o valor novo e o motivo; o requisito continua o teste | "Os números das tabelas de eixo são ponto de partida" (topo do plano), regra da F33 | n |
| Ícone na tela | 1 texel = 1 px: o slot usa a folha de 48 em escala 1, a carta a de 24 em escala 1, e a chamada da conjuração a de 48 em escala 2 (96 px, no lugar dos 84 do kanji); o voo da carta até o slot sai com 24 px e chega com 48 | Escala inteira não borra a pixel art; os dois tamanhos nativos existem porque reduzir o de 48 some com as linhas de 1 texel | n |
| Ícone do Domínio | Entra na barra de Domínio (24, à esquerda da barra) e na carta de nível do Domínio na loja | A F31 deixou o ícone do Domínio para a F34 (`expansao-de-dominio/spec.md`, Out of Scope) | n |
| Base dos ícones | O passo 3 começa com o `feat/icones-hd-tecnicas` integrado ao branch da F34 (merge ou cherry-pick dos 2 commits), sem redesenho | Os ícones já passaram pela prancha e pela revisão | n |
| `Enemy.ts` e `Boss.ts` perto do teto | Ganham só ganchos finos (atordoar, marcar a finta, teleportar), com a lógica em `game/enemy/` e no `core`; os dois terminam a F34 com no máximo 400 linhas efetivas | Regra de casa: arquivo novo nunca entra na lista de exceções, e a lista só encolhe | n |
| Smokes novos | `boogie.smoke.mjs`, `resonance.smoke.mjs` e `cursed-speech.smoke.mjs`, todos com `?debug&hd=1&area=modular` | Regra de smoke novo do projeto | y |

**Open questions:** none - all resolved or logged above. A troca do mediano no teste de eixo dominante da Ressonância
está registrada acima com o default escolhido e espera o aval do usuário na revisão da spec. O atordoamento do chefe com a
causa `tech` deixou de ser aval pendente: a revisão adversarial o tornou o default (o `stun` de hoje abre o finalizador).

---

## User Stories

### P1: Uma técnica nova é um módulo ⭐ MVP

**User Story**: Como desenvolvedor da F34 e da leva 2, quero o `TechRunner` iterando um registro de módulos, para
cada técnica nova entrar sem editar o runner, o caster e o diretor.

**Why P1**: As três técnicas deste pacote e as quatro da leva 2 entram por aqui; sem isso o `TechRunner` cresce um
campo, um getter e uma linha de `update` por técnica.

**Acceptance Criteria**:

1. REG-01: The `TechRunner` SHALL hold a registry `Record<TechId, TechModule>` built in `src/game/tech/registry.ts` and SHALL create, update, snapshot and reset every technique only through the `TechModule` interface, with no field, import, getter or branch named after a technique in `src/game/TechRunner.ts`.
2. REG-01: WHEN step 0 is committed THEN every existing test SHALL pass with only import paths changed, and the smokes `tech`, `techniques`, `red-anime`, `kokusen`, `evolution`, `fight`, `fxlab`, `tech-axes` and `domain` SHALL pass unchanged.
3. REG-02: The `TechModule` interface SHALL let a module answer a slot press of its technique before the `CastMachine` with one of three outcomes (start the cast, consume the press without a cast, or deny it with a reason), and a module that declares no answer SHALL keep today's path (`CastMachine.request`).
4. REG-02: WHEN a module denies a press THEN the `TechCaster` SHALL emit `techDenied:<reason>` and SHALL not call the `CastMachine`, and WHEN it consumes a press THEN the `TechCaster` SHALL emit no `techCast` and no `techDenied` event and SHALL not cancel the melee strike.
5. REG-03: The debug snapshot fields `kokusen` and `fx.red` SHALL keep their contract, read from the registry entries of the Divergente and the Vermelho.
6. REG-04: WHEN steps 4, 5 and 6 are committed THEN each SHALL add its technique without changing `src/game/TechRunner.ts`, `src/game/TechCaster.ts` or `src/scenes/test/techDirector.ts`, beyond the one registry line in `src/game/tech/registry.ts`.

**Independent Test**: `npm run gate` e os smokes listados no passo 0 sem mudança; o diff dos passos 4 a 6 não toca
`TechRunner.ts`, `TechCaster.ts` nem `techDirector.ts`.

---

### P1: O `techObjects` aceita qualquer técnica ⭐ MVP

**User Story**: Como smoke e como Boogie Woogie, quero ler todo objeto vivo de técnica pelo mesmo contrato, para achar
o orbe, o prego ou o que vier sem uma união fechada de tipos.

**Why P1**: A troca do Boogie com o orbe próprio lê esses objetos, e os pregos da Ressonância precisam aparecer.

**Acceptance Criteria**:

1. TOB-01: The `techObjects` entries of the debug snapshot SHALL be `{ id, tech, kind, x, y, traveled }`, with `tech` a `TechId` and `kind` a string declared by the module (`'orb'` for the Vermelho, the Azul and the Roxo), and the type SHALL live in `src/game/techSnapshot.ts`, imported by `src/game/debugApi.ts`.
2. TOB-02: WHEN step 1 is committed THEN the smokes `evolution`, `red-anime` and `techniques` SHALL find the orbs by `tech` (`'roxo'`, `'vermelho'`, `'azul'`) and `kind === 'orb'`, SHALL keep every other assertion unchanged and SHALL pass, and `tests/game/debugApi.test.ts` SHALL follow the new type.
3. TOB-03: The `techObjects` list SHALL hold one entry per live object of every registered module (each nail in flight is its own entry), ordered by the registry order and then by id.

**Independent Test**: os 3 smokes passam lendo `tech` e `kind`; `tests/game/debugApi.test.ts` com uma entrada de cada
técnica que tem objeto.

---

### P1: Efeito de técnica que sai de golpe passa por um emissor só ⭐ MVP

**User Story**: Como desenvolvedor, quero a Onda do Punho, o corte do Santuário e o eco do Boneco de Palha saindo do
mesmo `TechEmitter`, para todo efeito fora da `CastMachine` seguir as mesmas regras de energia, faixa e teto.

**Why P1**: É a regra do `TechEmitter` da seção 6; o eco do Boneco de Palha (passo 5) já nasce nele.

**Acceptance Criteria**:

1. EMI-01: The Fist Wave (CRP-10, CRP-11) and the Sanctuary cut (SAN-03, SAN-04) SHALL be emitted through `src/core/techEmitter.ts`, and `src/core/strikeEmitter.ts` SHALL no longer exist.
2. EMI-02: Every `TechEmitter` emission SHALL spend no energy, SHALL not pause the energy regen, SHALL not go through the `CastMachine`, SHALL give no mastery, SHALL not charge the domain bar and SHALL carry `band: 'micro'`.
3. EMI-03: Each emitter source (`wave`, `sanctuary`, `strawDoll`) SHALL emit at most 4 times in any 1000 ms of game time and SHALL drop the excess without changing the hit that asked for it, and the count of one source SHALL not change the count of another.
4. EMI-03: WHEN a source asks for a 5th emission 999 ms after its 1st THEN the emitter SHALL drop it, and WHEN it asks 1000 ms after its 1st THEN the emitter SHALL emit it.
5. EMI-04: WHEN step 2 is committed THEN the `domainDirector` SHALL no longer build the Sanctuary cut hit nor call `CutFx` itself, the emitter view SHALL draw `CutFx.cut` and `CutFx.split` as SAN-04 says, the debug event `domainCut:<targetId>` SHALL stay, and the smokes `cursed-body` and `domain` SHALL pass unchanged.
6. EMI-04: WHEN step 2 is committed THEN the cases of `tests/core/strikeEmitter.test.ts` and of the Sanctuary trigger window in `tests/core/sanctuary.test.ts` SHALL pass against the `TechEmitter` with only the import and the constructor changed.

**Independent Test**: `tests/core/techEmitter.test.ts` com as três fontes e as bordas 999/1000/1001 ms; smokes
`cursed-body` e `domain` sem mudança.

---

### P1: A técnica tem ícone HD ⭐ MVP

**User Story**: Como jogador, quero ver o desenho da técnica no slot, na carta e na chamada, para reconhecer de relance
o que tenho e o que estou comprando.

**Why P1**: O kanji de 24×24 esticado não existe para as técnicas novas; sem ícone a carta do Boogie sai em branco.

**Acceptance Criteria**:

1. ICO-01: `TechDef` SHALL replace `kanji` with `icon`, typed as the `TechIconId` of `src/game/art/hd/techIcons.ts`, and each technique SHALL use the icon with its own id (`divergente`, `vermelho`, `azul`, `corte`, `roxo`, and from steps 4 to 6 `boogie`, `ressonancia`, `fala`).
2. ICO-02: WHILE a slot holds a technique the `EnergyHud` SHALL show the frame `TechDef.icon` of `TEX.techIcons` at scale 1 (48 × 48 px), and the recharge overlay, the key label and the gold Despertar border (VRM-17) SHALL keep working over it.
3. ICO-03: WHEN a shop card shows a technique offer (new or upgrade) THEN it SHALL show the frame `TechDef.icon` of `TEX.techIconsSmall` at scale 1 (24 × 24 px), WHEN the offer is not a technique THEN the icon SHALL be hidden, and `src/game/ShopPanel.ts` SHALL end step 3 with no more effective lines than before it.
4. ICO-04: WHEN the first technique is equipped from the shop THEN the icon that flies from the card to the slot SHALL be that technique icon, starting at 24 px over the card and arriving at 48 px on the slot in 300 ms.
5. ICO-05: WHEN a cast reaches `release` THEN the callout SHALL show the frame `TechDef.icon` of `TEX.techIcons` at scale 2 (96 × 96 px) in place of the kanji, and the Kokusen card SHALL keep its `kuro` and `sen` frames.
6. ICO-06: After step 3 no code under `src/` SHALL read a `TEX.kanji` frame for a technique, and `TechDef` SHALL have no `kanji` field.
7. ICO-07: The `EnergyHud` debug state SHALL report, per slot, the texture key and the frame of the icon sprite, and the `hud` smoke SHALL read `tech-icons` and the technique id from it.
8. ICO-09: The slot icon, the card icon and the callout SHALL be checked in the game in HD (combat and konbini, with the player facing both sides during the callout), not only on the icon board.

**Independent Test**: teste do adaptador (L-043): com o Azul no slot 0 o `EnergyHud` chama `setTexture('tech-icons')` e
`setFrame('azul')`, sem `setDisplaySize`; smoke `hud` com `tech=azul` lê o quadro; captura em HD da carta e do slot.

---

### P1: Boogie Woogie no jogo ⭐ MVP

**User Story**: Como jogador, quero apertar a palma e trocar de lugar com o inimigo, o orbe ou o projétil à minha
frente, para entrar e sair do cerco quando eu quiser.

**Why P1**: É a 1ª técnica da leva 1 e a única que mexe no posicionamento; sem ela o pool não cresce.

**Acceptance Criteria**:

1. BWG-01: WHEN the Boogie cast reaches the swap moment THEN the module SHALL call `BoogieState.swap` with the player box (`hurtRect`), the facing, the candidates (live common enemies and the boss with their `hurtRect`, the live `techObjects` with `kind: 'orb'` of the Vermelho and the Roxo, never the Azul, and the boss `Projectile` objects of kind `projectile`) and a `fits` predicate that SHALL reject any box overlapping a static Matter body of the terrain or a solid world module.
2. BWG-02: WHEN the swap is accepted THEN in the same frame the player SHALL move to the returned box with zero velocity, a body target SHALL move to the returned center with zero velocity, an orb or projectile SHALL move to the returned center keeping its velocity and remaining life, after a body swap the player SHALL face the swapped body while after an orb or projectile swap it SHALL keep its facing, and the system SHALL push the debug event `boogieSwap:<kind>:<targetId>`.
3. BWG-03: IF the swap is refused (`noTarget`, `blockedPlayer`, `blockedTarget`) THEN in the same frame the energy spent at `release` SHALL be given back, no charge SHALL be spent, nobody SHALL move, and the system SHALL push `boogieRefused:<reason>`.
4. BWG-04: WHEN a common enemy is swapped with a stun above 0 THEN it SHALL enter the `stunned` state for the resolved stun: it SHALL not walk, SHALL not start an attack, SHALL lose an attack still in windup, SHALL not be knocked down, and a hit SHALL not end the state; the boss, the orb and the projectile SHALL not be stunned.
5. BWG-05: WHEN the resolved shock is above 0 THEN every body in the `shock` list SHALL take one `chip` hit of the shock damage times `damageMul` and `vowDamageMul`, with the technique marks of a light hit.
6. BWG-06: WHILE the Boogie has at least one charge or the Dupla Palma follow-up is armed, a press of its slot SHALL not be denied for cooldown; WHILE it has no charge and no follow-up, the press SHALL be denied with `techDenied:cooldown`.
7. BWG-06: WHILE the Boogie is in a slot the slot cooldown read by the `EnergyHud` overlay and by the snapshot SHALL be the recharge left of the next charge when no charge is left and 0 otherwise, WHILE its max charges are above 1 the icon SHALL show the charges left as a number in its top left corner, and WHILE the Dupla Palma follow-up is armed the icon SHALL blink every 250 ms.
8. BWG-07: WHILE the branch is Palma Falsa, WHEN the slot key is released before 250 ms from the press THEN the swap SHALL happen at `max(80 ms, release time)` from the press, and WHEN the key is still held at 250 ms THEN the cast SHALL feint at 250 ms through `BoogieState.feint`, spending one charge and the energy.
9. BWG-08: WHEN a feint lists a common enemy in `misses` THEN that enemy SHALL be marked until its next attack ends or 3000 ms pass, whichever comes first; WHILE marked its next attack hitbox SHALL deal no damage, and WHEN that attack ends without damage near the player THEN the player `CounterWindow` SHALL open for 400 ms.
10. BWG-09: WHEN the feint returns `bossCancel` THEN the boss attack in windup SHALL be cancelled through the `canAct` path, the boss SHALL take one normal hit of `round(0.01 × maxHp)`, and the system SHALL push `fintaTotal`.
11. BWG-10: WHEN `BoogieState.update` returns an `echo` event THEN the module SHALL swap the player with that target again through `swapPlacement` with the current positions, the target SHALL take one `micro` hit of `round(maxHpPct × maxHp)` (4% common, 1% boss), and IF the target is dead, gone or does not fit THEN nothing SHALL move, no bite SHALL land and the system SHALL push `boogieEchoRefused`.
12. BWG-11: WHEN a shock, echo or Finta Total hit kills THEN the module SHALL call `BoogieState.onTechKill` once per kill, and the charge recharge SHALL drop by what it returns.
13. BWG-12: WHEN a swap, a feint or an echo happens THEN the `BoogieFx` view SHALL draw an amber palm flash (`PALETTE` keys `A` and `w`) at the departure and the arrival points for at most 150 ms, registered in the `FxRegistry`, and a feint SHALL draw the flash only at the player.
14. BWG-13: The Boogie view and the swap SHALL be checked in the game in HD, in motion, with the player facing both sides, against an enemy, the boss, a Red orb and a boss projectile.

**Independent Test**: `boogie.smoke.mjs` com `seed=1&maxAlive=1&tech=boogie`: o player e o comum à frente trocam de x, o
player passa a olhar para o comum e o evento `boogieSwap:enemy:<id>` sai; com uma parede no destino a troca é recusada e a energia volta; com
`axes=boogie.cargas:2` duas trocas seguidas saem sem `techDenied:cooldown`; com `ramo=boogie:b` e
`axes=boogie.alcance:1,boogie.cargas:3` (Nv 5) a 2ª troca volta sozinha em 1 s.

---

### P1: Ressonância no jogo ⭐ MVP

**User Story**: Como jogador, quero cravar pregos no inimigo à frente com o 1º toque e detonar todas as marcas com o 2º,
para escolher o momento da explosão (e, com Propagação, Grampo ou Coroa, levar o grupo junto).

**Why P1**: É a técnica de dano de área da leva 1 e a única de dois toques.

**Acceptance Criteria**:

1. RSN-01: WHEN the Ressonância is ready and its slot is pressed THEN the cast SHALL run through the `CastMachine`, and WHEN it reaches `release` THEN the module SHALL call `throwNails` from the player box center with the facing and a `Rng` over the technique stream, and the energy SHALL be spent while the slot cooldown SHALL not start.
2. RSN-02: WHILE nails fly or marks live, the module SHALL call `ResonanceState.update` every frame with the live common enemies and the boss (box, hp, max HP) and a `WallProbe` over the static terrain bodies and the solid world modules.
3. RSN-03: WHEN `update` returns a `nail` event THEN its target SHALL take one `micro` hit of the event damage, WHEN it returns `nailBlocked` THEN the nail view SHALL drop at that point, and WHEN it returns `grampo` THEN each listed target SHALL take one `micro` hit.
4. RSN-04: WHILE the Ressonância is armed with at least one live mark, WHEN its slot is pressed THEN the module SHALL consume the press and call `detonate` in the same frame, with no cast, no energy spent and no regen pause, each listed target SHALL take one normal hit of its damage, and the system SHALL push `resonanceDetonate:<marks>`.
5. RSN-05: WHILE the Ressonância is armed with nails in flight and no live mark, a press of its slot SHALL be consumed with no detonation, no cast, no event and no energy flash.
6. RSN-06: WHILE the Ressonância is in its cooldown phase, a press of its slot SHALL be denied with `techDenied:cooldown`, and the slot cooldown read by the HUD and the snapshot SHALL be `cooldownLeftMs`.
7. RSN-07: WHEN a marked target dies by any source other than the detonation THEN the module SHALL call `onTargetDied` with the living targets, and WHEN marks move THEN the system SHALL push `resonanceJump:<fromId>:<toId>`.
8. RSN-08: WHILE the branch is Boneco, WHEN `update` returns an `echo` event THEN the boss SHALL take one `micro` hit of its damage.
9. RSN-09: WHEN `detonate` returns a `crown` THEN each listed target SHALL take one normal hit of its damage, the bite already included, and the view SHALL draw a ring of 80 px at the crown center.
10. RSN-10: WHILE a Boneco de Palha window is open on the boss, WHEN the boss takes damage from any source other than this echo THEN the module SHALL ask `strawDollEcho` and SHALL send the returned echo through the `TechEmitter` source `strawDoll` as one `micro` hit with poise, whose damage SHALL be the echo plus its bite.
11. RSN-11: WHILE the Ressonância is armed with at least one live mark, its slot icon SHALL blink every 250 ms.
12. RSN-12: The `techObjects` SHALL list each nail in flight as `{ tech: 'ressonancia', kind: 'nail' }`, and the debug snapshot SHALL report `techState.ressonancia` as `{ phase, nailsInFlight, marks: { targetId, count }[], cooldownLeftMs }`.
13. RSN-13: WHILE nails fly the view SHALL draw each nail as a steel sprite (`PALETTE` keys `S`, `W` and `n`) of at most 8 × 3 texels; WHILE a target has marks the view SHALL draw one nail head per mark (at most 3, with a `+N` count above 3) following its drawn position; WHEN a mark detonates THEN the view SHALL draw a burst on its target.
14. RSN-14: The Ressonância views SHALL be checked in the game in HD, in motion, facing both sides, with marks on a walking enemy and on the boss.

**Independent Test**: `resonance.smoke.mjs` com `seed=1&maxAlive=2&tech=ressonancia`: o 1º toque gasta 25 de energia e
crava 3 marcas (`techState.ressonancia.marks`), o 2º toque logo em seguida, com os pregos no ar, não faz nada, e o 2º
toque depois das marcas detona sem gastar energia (`resonanceDetonate:3`) e inicia a recarga.

---

### P1: Fala Amaldiçoada no jogo ⭐ MVP

**User Story**: Como jogador, quero gritar "Pare!" e travar quem está no cone, pagando com vida, para abrir a defesa
do grupo à minha frente.

**Why P1**: É o controle forte da leva 1 e a primeira técnica que custa vida.

**Acceptance Criteria**:

1. FLA-01: IF the player HP is not above the resolved HP cost when the Fala slot is pressed THEN the press SHALL be denied with `techDenied:hp`, the pressed slot icon SHALL flash red for the TEC-10 flash duration and the energy bar SHALL not flash.
2. FLA-02: WHEN the Fala cast reaches `release` THEN the module SHALL call `speak` with the player box center, the facing, the player HP, the live common enemies and the boss, each aimed at the point of its box nearest to the cone axis (box center x, player center y clamped to the box vertical span), and a `lineOfSight` test to that point over the static terrain bodies and the solid world modules.
3. FLA-03: IF `speak` refuses for HP at `release` THEN the energy SHALL be given back in the same frame, the HP SHALL not change, the cooldown SHALL not start and the system SHALL push `speechRefused:hp`.
4. FLA-04: WHEN `speak` is accepted THEN the player SHALL lose exactly the HP cost with no hit reaction, no cast cancel, no invulnerability, no damage number, no reset of the Fúria, the Cadência or the combo counter (CMB-02) and no damage signal to the recovery, and the system SHALL push `speech:<hits>`.
5. FLA-05: WHEN `speak` returns its hits THEN each common target SHALL enter the `stunned` state of BWG-04 for its `stunMs`, the boss SHALL be stunned through `bossBrain.stun(ms, 'tech')` for its `stunMs` without arming the finisher or the stagger damage multiplier, a hit with damage above 0 SHALL deal it times `damageMul` and `vowDamageMul`, and a hit with force above 0 SHALL push along its direction, knocking the common target down when `knockdown` is set.
6. FLA-06: WHILE the cast's `SpeechCast` lives, WHEN a target stunned by it dies THEN the module SHALL call `onTargetDied`, each returned hit SHALL land as a `micro` hit with its stun, and the system SHALL push `speechChain:<deadId>`.
7. FLA-07: WHILE the cast's `SpeechCast` lives, WHEN a target pushed by it touches a terrain wall, a solid world module or another live common enemy THEN the module SHALL call `onPushedImpact` once, and each returned hit SHALL land as a `micro` hit, knocking down the common targets it marks.
8. FLA-08: WHEN a hit of the Fala kills THEN the module SHALL call `claimKillRefund` and SHALL cut the returned ms from its slot cooldown.
9. FLA-09: The module SHALL keep each `SpeechCast` alive while any of its stuns lasts or for 800 ms after the cast, whichever is longer, and SHALL drop it after that.
10. FLA-10: WHEN the Fala is released THEN the view SHALL draw the voice wave as arcs from the player center with the resolved range and cone opening for 250 ms and the serpent seal glyph over the player for 300 ms, and WHILE a target is stunned by it the view SHALL draw a stun marker over the target's drawn position, all with `PALETTE` colors and registered in the `FxRegistry`.
11. FLA-11: The debug snapshot SHALL report `techState.fala` as `{ stunned: number[], pushed: number[] }` for the live `SpeechCast`, or `null`, and each common enemy in the snapshot SHALL report `stunnedMs`.
12. FLA-12: The Fala views SHALL be checked in the game in HD, in motion, facing both sides, with a cone that holds a common enemy and the boss.

**Independent Test**: `cursed-speech.smoke.mjs` com `seed=1&maxAlive=2&tech=fala`: a fala gasta 25 de energia e 8 de
vida, os dois comuns no cone ficam com `stunnedMs` perto de 600 e nenhum ataca nesse tempo; com a vida em 8 o aperto
sai `techDenied:hp` e pisca o ícone do slot; com `ramo=fala:b` o comum cai derrubado; com o chefe da r5 encostado à
frente, o chefe trava em `stagger` sem `finisherReady`; o contador de combo não zera com a fala.

---

### P1: As três técnicas entram no build ⭐ MVP

**User Story**: Como jogador, quero comprar as técnicas novas, subir os eixos delas, escolher o ramo e ver o
Despertar, como as outras cinco.

**Why P1**: Sem a loja, os eixos e o painel, as três seriam só debug.

**Acceptance Criteria**:

1. JJK-01: The `TechId` SHALL gain `'boogie' | 'ressonancia' | 'fala'`, and `TECHNIQUES` SHALL gain their entries with the names "Boogie Woogie", "Ressonância" and "Fala Amaldiçoada", the icons of ICO-01, the aura keys of the Assumptions table, charge 0, and sign, release, recover, cost and cooldown at 0 points from `data/boogie.ts`, `data/resonance.ts` and `data/cursedSpeech.ts`.
2. JJK-02: For each of the three techniques and each axis at 0 to 3 points, `Loadout.stats(id)` SHALL return the cost, the cooldown, the phase times and the damage values of `boogieStats`, `resonanceStats` and `speechStats` for the build read from `loadout.axes`, with every damage value times `damageMul` and `vowDamageMul` (rounded as `loadout.ts` rounds) and the cost after the PRC-05 floor and the `costMul`.
3. JJK-03: The `GAME_SHOP_CATALOG` SHALL end with the technique entries of the Boogie (common), the Ressonância (common) and the Fala (rare), the new technique price SHALL be 20 or 26 before inflation (PRC-01), and every entry already in the catalog SHALL keep its position.
4. JJK-04: The upgrade card of the three techniques SHALL be the two-axis card of EIX-06 (focus axis plus one axis drawn by `axisRng`, `W`/`S`, preview of the resolved values, `+ ramo` or `+ Despertar`), with the level text `Nv <level + 1>/6`, the point price `12 + 4 × points already placed` and the round lock of PRC-04.
5. JJK-05: WHEN one of the three reaches level 2 for the first time in the run THEN the system SHALL add a pending branch page to the `ChoicePanel` with option A (Palma Falsa, Grampo, "Exploda") and option B (Dupla Palma, Boneco, "Volte"), and WHEN it reaches level 5 with a branch chosen THEN its Despertar SHALL turn on with the gold border, and the first cast of a round reaching `release` SHALL show the Despertar banner and the 0.4 time scale for 350 ms of real time (EIX-03).
6. JJK-06: WHEN the run starts with `?debug&tech=` naming `boogie`, `ressonancia` or `fala`, or with `axes=<item>.<axis>:<n>` or `ramo=<item>:<a|b>` for those items THEN the system SHALL apply them as EIX-07 does, only to an equipped technique, and SHALL ignore unknown items, unknown axes and invalid points.
7. JJK-07: The debug snapshot SHALL report `build.boogie`, `build.ressonancia` and `build.fala` as `{ level, axes, branch, awakened, stats }`, or `null` when the technique is not equipped, and `techState.boogie` as `{ charges, maxCharges, rechargeLeftMs, followUpArmed, fintaCooldownMs }` or `null`.
8. JJK-08: Every hit of the three that reaches a target SHALL call `onTechHit` and then `masteryHit` for the cast that started it (the Ressonância detonation, Boneco echo and crown count for the throw cast; each Fala target stunned counts even with 0 damage; the Boogie chip shock counts as the F33 counts chip hits), and a Boogie swap with no hit and the Boneco de Palha echo SHALL count for nothing.
9. JJK-09: WHEN a cast of the three reaches the Santuário trigger rule (SAN-02) THEN it SHALL release at most one trigger per cast, never from a `chip` shock or from a `TechEmitter` emission.
10. JJK-10: WHEN a hit of the three deals 0 damage THEN no damage number SHALL appear, and every other hit SHALL show the number of its band (F29).
11. JJK-11: WHEN the konbini closes or the run resets THEN each of the three modules SHALL rebuild its pure state from the current build, with the Boogie charges full, the Ressonância ready with no mark and no `SpeechCast` alive.
12. JJK-12: In the dominant-axis test of `tests/data/`, the Ressonância SHALL be measured under the model of the Assumptions table, neither Pregos 3 nor Detonação 3 SHALL give more than 1.35 times the median of those two axes, and Eficiência 3 with Recarga 3 SHALL give more sustained damage than Recarga 3 alone; the Boogie and the Fala SHALL stay out of the test as utility techniques.
13. JJK-13: The names of the branches and Despertares of the three techniques SHALL enter the uniqueness test of EIX-10 and SHALL be unique against every other branch and Despertar.
14. JJK-14: No effect of the three techniques SHALL start without a press of its slot key, except the delayed consequences of a press listed in BWG-10, RSN-07, RSN-08, RSN-10, FLA-06 and FLA-07.
15. JJK-15: The F34 SHALL add no net effective line to `src/scenes/TestScene.ts`, SHALL put no file in the exception lists of `.oxlintrc.json`, SHALL not grow `src/game/Hud.ts`, `src/data/moves.ts` nor `src/game/ShopPanel.ts`, SHALL add no field to `src/game/Player.ts`, and `src/game/Enemy.ts` and `src/game/Boss.ts` SHALL end with at most 400 effective lines.
16. JJK-16: The smokes `boogie.smoke.mjs`, `resonance.smoke.mjs` and `cursed-speech.smoke.mjs` SHALL run with `?debug&hd=1&area=modular`.
17. JJK-17: The Boogie Eficiência table SHALL be 20, 17, 14 and 12 for 0 to 3 points, and BOO-02 and `tests/core/boogie.test.ts` SHALL follow it.

**Independent Test**: `tests/core/techStatsLeva1.test.ts` (3 técnicas × 6 eixos × 0 a 3 pontos × multiplicadores 1 e
1,35, com as bordas da L-010 no piso de custo); `tech-axes.smoke.mjs` estendido com `axes=ressonancia.pregos:1` na loja
da r4 e o painel do ramo.

---

### P2: O Domínio também tem ícone

**User Story**: Como jogador com Domínio, quero ver o desenho do meu Domínio na barra e na carta, para lembrar qual
ultimate eu tenho.

**Why P2**: A barra da F31 funciona só com a letra da tecla; o ícone é leitura, não regra.

**Acceptance Criteria**:

1. ICO-08: WHILE the player owns a domain the domain bar SHALL show the frame of that domain (`santuario`, `jackpot` or `amplificacao`) of `TEX.techIconsSmall` at scale 1 at its left, and WHEN a shop card offers a domain level THEN the card SHALL show the same frame.

**Independent Test**: smoke `domain` com `domain=santuario` lê o quadro do ícone na barra pelo `debugState`.

---

## Edge Cases

- IF the Boogie target is exactly on the player's vertical line (`dx = 0`) or beyond the range THEN the swap SHALL be refused with the energy back (BOO-03 and BWG-03).
- IF the Boogie swaps with a Red orb in flight THEN the orb SHALL keep flying from the player's old position with the same velocity and SHALL still detonate on its first valid touch.
- IF the Eco da Palma target was killed before the echo THEN nothing SHALL move and `boogieEchoRefused` SHALL be pushed.
- WHEN the Dupla Palma second swap is refused THEN the follow-up SHALL stay armed until its 1000 ms end, as the pure rule keeps it.
- WHEN the player is hit during the Palma Falsa hold (sign) THEN the cast SHALL be cancelled as CAST-07 says, with no charge and no energy spent.
- IF a marked target leaves the screen or is removed without dying THEN its marks SHALL expire by their own timer, with no jump.
- WHEN the Ressonância detonation itself kills the boss THEN no Boneco echo and no Boneco de Palha window SHALL start (the pure rule already skips it).
- WHEN the Ressonância window closes with no detonation THEN the cooldown SHALL start and the slot overlay SHALL show it.
- IF the shop opens while nails fly or marks live THEN the round end SHALL drop them and the rebuild of JJK-11 SHALL leave the Ressonância ready.
- WHEN the Fala hits a target behind a wall inside the cone THEN that target SHALL not be stunned (FAL-09 through `lineOfSight`).
- WHEN the player HP equals the Fala HP cost THEN the press SHALL be denied (FAL-04 boundary, both sides tested: cost and cost + 1).
- IF a target already stunned by the Boogie is stunned by the Fala THEN it SHALL keep the larger remaining stun.
- WHEN a Volte push sends a common enemy into another one THEN only one Esmague bite SHALL land on the pushed target, and the other SHALL only fall.
- IF the `strawDoll` source already emitted 4 echoes in the last 1000 ms THEN the 5th echo SHALL not land and the hit that caused it SHALL be unchanged.
- WHEN the Boogie has 3 charges and spends one THEN the overlay SHALL stay empty (0) and the charge number SHALL read 2.
- IF the Azul orb is the only candidate ahead THEN the Boogie swap SHALL be refused with `noTarget` and the energy back.
- WHEN the Dupla Palma follow-up is armed and the slot key is pressed during the release or recover of the first palm THEN the press SHALL be ignored (CAST-08) and the follow-up SHALL stay armed.
- WHEN the boss touches the player in front at the base 30° cone THEN the Fala SHALL stun it (FLA-02 aim point), and WHEN a common enemy stands one step above or below the player inside the range THEN the Fala SHALL stun it too.
- WHEN the Fala HP cost is paid THEN the combo counter SHALL keep its count (FLA-04).

---

## Implicit-Requirement Dimensions

| Dimension | Resolução |
| --- | --- |
| Input validation & bounds | JJK-06 (`tech=`, `axes=`, `ramo=` inválidos ignorados), JJK-02 (piso de custo), FLA-01 e FLA-03 (vida não passa do custo), BWG-01 (`fits`), EMI-03 (teto de 4 por fonte) |
| Failure / partial-failure states | BWG-03 e FLA-03 (recusa devolve a energia no mesmo quadro, sem gastar carga nem vida), BWG-10 (eco recusado não move nem morde) |
| Idempotency / retry / duplicate handling | BWG-05 (cada corpo uma vez no choque), RSN-07 (marca pula uma vez), FLA-07 (um esmagamento por empurrado), JJK-09 (um gatilho de Santuário por conjuração), JJK-08 (componente proporcional uma vez por alvo por conjuração) |
| Auth boundaries & rate limits | EMI-03 (4 emissões por segundo por fonte); auth N/A porque é jogo local |
| Concurrency / ordering | REG-02 (o portão do módulo antes da `CastMachine`), RSN-04 e RSN-05 (2º toque no mesmo quadro, sem conjuração), BWG-07 (a decisão da Palma Falsa no tempo), edge case do atordoamento duplo |
| Data lifecycle / expiry | JJK-11 (estado refeito na konbini e no reset), FLA-09 (vida da `SpeechCast`), BWG-08 (marca da finta por até 3000 ms), RSN-06 (recarga depois da janela) |
| Observability | TOB-01, RSN-12, FLA-11, JJK-07 (snapshot), ICO-07 (quadro do ícone), eventos `boogieSwap`, `boogieRefused`, `boogieEchoRefused`, `fintaTotal`, `resonanceDetonate`, `resonanceJump`, `speech`, `speechRefused`, `speechChain`, `domainCut` |
| External-dependency failure | N/A porque não há dependência externa em jogo |
| State-transition integrity | RSN-04 a RSN-06 (`ready` → `armed` → `cooldown`), BWG-06 (cargas e 2ª palma), JJK-05 (ramo uma vez por run no Nv 2, Despertar só com ramo), BWG-04 (estado `stunned` sem derrubar) |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| REG-01 | P1: Uma técnica nova é um módulo | Tasks | Pending |
| REG-02 | P1: Uma técnica nova é um módulo | Tasks | Pending |
| REG-03 | P1: Uma técnica nova é um módulo | Tasks | Pending |
| REG-04 | P1: Uma técnica nova é um módulo | Tasks | Pending |
| TOB-01 | P1: O techObjects aceita qualquer técnica | Tasks | Pending |
| TOB-02 | P1: O techObjects aceita qualquer técnica | Tasks | Pending |
| TOB-03 | P1: O techObjects aceita qualquer técnica | Tasks | Pending |
| EMI-01 | P1: Efeito de técnica que sai de golpe passa por um emissor só | Tasks | Pending |
| EMI-02 | P1: Efeito de técnica que sai de golpe passa por um emissor só | Tasks | Pending |
| EMI-03 | P1: Efeito de técnica que sai de golpe passa por um emissor só | Tasks | Pending |
| EMI-04 | P1: Efeito de técnica que sai de golpe passa por um emissor só | Tasks | Pending |
| ICO-01 | P1: A técnica tem ícone HD | Tasks | Pending |
| ICO-02 | P1: A técnica tem ícone HD | Tasks | Pending |
| ICO-03 | P1: A técnica tem ícone HD | Tasks | Pending |
| ICO-04 | P1: A técnica tem ícone HD | Tasks | Pending |
| ICO-05 | P1: A técnica tem ícone HD | Tasks | Pending |
| ICO-06 | P1: A técnica tem ícone HD | Tasks | Pending |
| ICO-07 | P1: A técnica tem ícone HD | Tasks | Pending |
| ICO-08 | P2: O Domínio também tem ícone | Tasks | Pending |
| ICO-09 | P1: A técnica tem ícone HD | Tasks | Pending |
| BWG-01 | P1: Boogie Woogie no jogo | Tasks | Pending |
| BWG-02 | P1: Boogie Woogie no jogo | Tasks | Pending |
| BWG-03 | P1: Boogie Woogie no jogo | Tasks | Pending |
| BWG-04 | P1: Boogie Woogie no jogo | Tasks | Pending |
| BWG-05 | P1: Boogie Woogie no jogo | Tasks | Pending |
| BWG-06 | P1: Boogie Woogie no jogo | Tasks | Pending |
| BWG-07 | P1: Boogie Woogie no jogo | Tasks | Pending |
| BWG-08 | P1: Boogie Woogie no jogo | Tasks | Pending |
| BWG-09 | P1: Boogie Woogie no jogo | Tasks | Pending |
| BWG-10 | P1: Boogie Woogie no jogo | Tasks | Pending |
| BWG-11 | P1: Boogie Woogie no jogo | Tasks | Pending |
| BWG-12 | P1: Boogie Woogie no jogo | Tasks | Pending |
| BWG-13 | P1: Boogie Woogie no jogo | Tasks | Pending |
| RSN-01 | P1: Ressonância no jogo | Tasks | Pending |
| RSN-02 | P1: Ressonância no jogo | Tasks | Pending |
| RSN-03 | P1: Ressonância no jogo | Tasks | Pending |
| RSN-04 | P1: Ressonância no jogo | Tasks | Pending |
| RSN-05 | P1: Ressonância no jogo | Tasks | Pending |
| RSN-06 | P1: Ressonância no jogo | Tasks | Pending |
| RSN-07 | P1: Ressonância no jogo | Tasks | Pending |
| RSN-08 | P1: Ressonância no jogo | Tasks | Pending |
| RSN-09 | P1: Ressonância no jogo | Tasks | Pending |
| RSN-10 | P1: Ressonância no jogo | Tasks | Pending |
| RSN-11 | P1: Ressonância no jogo | Tasks | Pending |
| RSN-12 | P1: Ressonância no jogo | Tasks | Pending |
| RSN-13 | P1: Ressonância no jogo | Tasks | Pending |
| RSN-14 | P1: Ressonância no jogo | Tasks | Pending |
| FLA-01 | P1: Fala Amaldiçoada no jogo | Tasks | Pending |
| FLA-02 | P1: Fala Amaldiçoada no jogo | Tasks | Pending |
| FLA-03 | P1: Fala Amaldiçoada no jogo | Tasks | Pending |
| FLA-04 | P1: Fala Amaldiçoada no jogo | Tasks | Pending |
| FLA-05 | P1: Fala Amaldiçoada no jogo | Tasks | Pending |
| FLA-06 | P1: Fala Amaldiçoada no jogo | Tasks | Pending |
| FLA-07 | P1: Fala Amaldiçoada no jogo | Tasks | Pending |
| FLA-08 | P1: Fala Amaldiçoada no jogo | Tasks | Pending |
| FLA-09 | P1: Fala Amaldiçoada no jogo | Tasks | Pending |
| FLA-10 | P1: Fala Amaldiçoada no jogo | Tasks | Pending |
| FLA-11 | P1: Fala Amaldiçoada no jogo | Tasks | Pending |
| FLA-12 | P1: Fala Amaldiçoada no jogo | Tasks | Pending |
| JJK-01 | P1: As três técnicas entram no build | Tasks | Pending |
| JJK-02 | P1: As três técnicas entram no build | Tasks | Pending |
| JJK-03 | P1: As três técnicas entram no build | Tasks | Pending |
| JJK-04 | P1: As três técnicas entram no build | Tasks | Pending |
| JJK-05 | P1: As três técnicas entram no build | Tasks | Pending |
| JJK-06 | P1: As três técnicas entram no build | Tasks | Pending |
| JJK-07 | P1: As três técnicas entram no build | Tasks | Pending |
| JJK-08 | P1: As três técnicas entram no build | Tasks | Pending |
| JJK-09 | P1: As três técnicas entram no build | Tasks | Pending |
| JJK-10 | P1: As três técnicas entram no build | Tasks | Pending |
| JJK-11 | P1: As três técnicas entram no build | Tasks | Pending |
| JJK-12 | P1: As três técnicas entram no build | Tasks | Pending |
| JJK-13 | P1: As três técnicas entram no build | Tasks | Pending |
| JJK-14 | P1: As três técnicas entram no build | Tasks | Pending |
| JJK-15 | P1: As três técnicas entram no build | Tasks | Pending |
| JJK-16 | P1: As três técnicas entram no build | Tasks | Pending |
| JJK-17 | P1: As três técnicas entram no build | Tasks | Pending |

**Coverage:** 76 total, 76 mapped to tasks, 0 unmapped (mapa em `tasks.md`, seção "Requirement Coverage").

---

## Success Criteria

- [ ] Gate verde em cada commit, e os smokes de cada passo passam (os do passo 0 e do passo 2 sem mudança).
- [ ] Com `?debug&hd=1&area=modular&tech=boogie,ressonancia` a troca, o prego e a detonação funcionam na mesma luta, e
      a carta, o slot e a chamada mostram o ícone HD de cada uma.
- [ ] Numa run da r1 à r10 sem debug, as três técnicas aparecem na loja, sobem por eixo e abrem o painel do ramo no Nv 2.
- [ ] O diff dos passos 4 a 6 não toca `TechRunner.ts`, `TechCaster.ts` nem `techDirector.ts`, e a `TestScene` termina
      a F34 com as mesmas linhas efetivas do fim da F33 ou menos.
