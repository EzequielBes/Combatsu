# Eixos das técnicas — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/eixos-das-tecnicas/spec.md`
**Design**: `.specs/features/eixos-das-tecnicas/design.md`
**Plano**: `docs/plano-builds-e-habilidades.md` (linha F33 da seção 6; seções 2.1, 2.3, 2.4, fim da 2.5, 2.7, 3.1, 5.7)
**Base**: F29 `fundacao-de-poder`, F30 `vermelho-e-corpo` e F31 `expansao-de-dominio` mergeadas. Nenhuma tarefa começa
antes dos três merges. A F33 usa sem mudar o contrato o que a F30 entrega (`techAxes.ts`, `axisBuild.ts`,
`techStats.ts`, `Loadout.stats`/`refundCooldown`, `shopDraw.ts`, `shopPricing.ts`, `shopPreview.ts`, `axisParam.ts`,
`axisDirector.ts`, `ChoicePanel.ts`, `axisSnapshot.ts`, `TechCaster.slotHeld`, `dealtDamage`/`Hit.maxHpBonus`, banner e
câmera lenta do Despertar) e o que a F31 entrega (`chestRng`, `DomainState.raise()`, `domainDirector.choicePages()`/
`confirm()`/`bossPrize()`, página `bauChefe`, `bossPrizePlan`, `runDirector.bossRewardTarget()`, `AttackHitbox.rect`,
`Projectile.width`).
**Status**: Draft
**Branch**: `feat/eixos-das-tecnicas` (a partir do commit final da F31)
**Ferramentas**: nenhuma MCP. Skill só o `tlc-spec-driven`. Tarefas com arte em movimento (T21, T22, T32, T46, T58, T60,
T61) conferem no jogo, em HD (`?hd=1`), parado e correndo, para os dois lados (memória "Conferir animação em
movimento"); essas rodam em Opus 5.5 ou Fable, nunca Sonnet.

Regras que valem para toda tarefa (CLAUDE.md): um commit por tarefa, só os arquivos dela (nunca `git add -A`), `npm run
gate` verde antes do commit; smoke só do que foi tocado; smoke novo com `?debug&hd=1&area=modular`; tetos de 400 linhas
efetivas por arquivo, 80 por função e complexidade 15; arquivo novo nunca entra no `.oxlintrc.json`; teste da lista de
exceções do `max-lines` não cresce (o caso novo vai para arquivo novo). **A `TestScene` não ganha nenhuma linha efetiva
líquida** (Goals): a única tarefa que a toca é a T71, que troca só o texto da lambda da maestria (l.329 em `f17a6a8`).
`Hud.ts`, `ShopPanel.ts`, `moves.ts` e `Player.ts` não mudam. **Nada automático**: nenhum ramo, Despertar ou opção do baú
dispara efeito sem tecla do jogador; os efeitos novos só saem de conjuração e as escolhas só no painel ou na carta.
Linha efetiva = sem linha em branco e sem comentário, como o `max-lines` do `.oxlintrc.json`. As linhas citadas no
design valem para `f17a6a8`; o que a F29, a F30 e a F31 mexem é reconferido no começo de cada fase.

**Decisões do usuário que travam tarefas** (o executor para e pergunta antes da tarefa, não durante):

| Antes de | Pergunta | Origem |
| --- | --- | --- |
| T37 | Modelo do eixo dominante do Divergente: nenhum número inteiro de alvos ≥ 2 passa no modelo da spec (Alvos 2 já dá 1,54×). Recomendação do design: contar os alvos pela caixa do `direto` (`alvos efetivos = min(alvos, 1 + 2 × 26 / 96)` = 1,54, dá 1,31×); alternativa: tirar o Divergente do teste como "gargalo não declarado". A linha "Modelo do teste de eixo dominante" das Assumptions da spec muda junto, no commit da T37 | design, "Calibração do eixo dominante" |
| T25, T36, T50, T64 | Se a curva de build (EIX-12, RXO-11) não fechar com os preços da F30, o ajuste é de número com decisão nova, nunca no teste | design, pendência 2 |

A Largura do Roxo (36/44/51/58) já foi calibrada pela regra da própria spec (o 60 dava 1,38×) e está no RXO-04.

---

## Test Coverage Matrix

> Guidelines: `CLAUDE.md` (camadas, gate, smoke só do que foi tocado, arte só pronta depois de olhar em movimento),
> `.oxlintrc.json` (tetos e listas de exceção), `vitest.config.*`, `package.json` (`gate`, `test`, `smoke`); lições
> L-010 (limites nos dois lados), L-043 (testar o adaptador, não só a regra), L-076 (campo de debug que só repete a
> entrada não prova o efeito). Amostras: `tests/core/redBranch.test.ts` e `tests/core/axisBuild.test.ts` (F30),
> `tests/core/mastery.test.ts`, `tests/core/evolution.test.ts`, `tests/core/blueOrb.test.ts`,
> `tests/game/choicePanel.test.ts` (F30), `scripts/smoke/red-axes.smoke.mjs` (F30), `scripts/smoke/evolution.smoke.mjs`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Regra pura (`src/core/**`) | unit | 1:1 com os ACs; todo edge case listado; limites nos dois lados (L-010): Vermelho Nv 3/4 na União; marcos 24/25 e 59/60; 3 e 4 candidatos no baú; 999/1000 ms da Massa; 219/220/221 px do Lapso; 119/120/121 px da Fenda; 47/48/49 px do Eco; teto de 3 por eixo (2/3/4) e de 5 por técnica (4/5/6) | `tests/core/*.test.ts` (arquivo novo por sistema novo) | `npm test` |
| Números de ajuste (`src/data/**`) | unit | Tabelas AZL-02, DSM-01, DVG-01, RXO-04 linha a linha; EIX-09 (teto de 1,35× pelo modelo decidido); EIX-10 (nomes e textos únicos); números que não mudam continuam (Azul raio 130, tique 250, sinal 200, carga 250) | `tests/data/*.test.ts` | `npm test` |
| Vista testável sem motor (`src/game/ChoicePanel.ts`) | unit | 1 a 3 opções, seleção, página `despertar` com 1 carta, `debug()` do CHC-10 | `tests/game/choicePanel.test.ts` | `npm test` |
| Vistas do motor (`src/game/techFx/**`) | smoke + conferência em movimento | Tamanho lido do objeto vivo (`techObjects[...].radius`, `fx.cut.lastRect`), não do stat (L-043, L-076); conferência no jogo em HD, dois lados | `scripts/smoke/tech-axes*.smoke.mjs` | `npm run smoke -- tech-axes` |
| Adaptadores (`src/scenes/**`, `src/game/**`) | smoke | Efeito lido do jogo vivo pelo snapshot; refatoração com os smokes de antes iguais | `scripts/smoke/{tech-axes,choice-panel,boss-chest}.smoke.mjs` (novos) e os smokes de cada tarefa | `npm run smoke -- <trecho>` |
| Documentação (`README.md`, `.specs/STATE.md`) | none | build gate only | - | `npm run gate` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tarefa só com teste unitário (regra pura, dados, vista testável) | `npm run gate` |
| Full | Tarefa de adaptador, vista do motor ou regra que muda o jogo vivo (smoke) | `npm run gate && npm run smoke -- <cada trecho da tarefa>` |
| Build | Fim de fase | `npm run gate` e os smokes do passo no design ("Smokes por passo") |

Base de testes: a contagem no fim da F31 (anotar no começo da T1). Nenhuma tarefa apaga teste sem mover o caso para
outro arquivo, exceto os casos do modelo antigo que a própria tarefa remove (T62, T63, T78), que dizem quais saem; cada
tarefa informa a nova contagem. Smokes instáveis: `armed` (ARM-12) e timeouts sob carga: repetir isolado antes de
suspeitar.

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order. Setas anotadas "(fase N)" são dependências para trás, só para leitura.

### Phase 1: Passo 0 — registro e regra genérica (refatoração, smokes iguais)

```
T1 → T2 → T3
T2 → T5
T1 → T4
T1 → T6
```

### Phase 2: Passo 0 — conjuração, painel e `choiceDirector` (refatoração, smokes iguais)

```
T9 → T11
T10 → T11
T4 → T7 (fase 1)
T4 → T8 (fase 1)
T1 → T10 (fase 1)
```

### Phase 3: Passo 1 — Azul, regra pura

```
T12 → T13 → T15
T12 → T14
T16
T1 → T12 (fase 1)
T4 → T13 (fase 1)
```

### Phase 4: Passo 1 — Azul no jogo

```
T17 → T18 → T19
T18 → T20 → T24
T18 → T21 → T24
T18 → T22 → T23
T17 → T25
T5 → T17 (fase 1)
T6 → T17 (fase 1)
T13 → T17 (fase 3)
T14 → T21 (fase 3)
T15 → T21 (fase 3)
T16 → T23 (fase 3)
```

### Phase 5: Passo 2 — Desmantelar, regra pura

```
T26 → T27 → T28 → T29
T12 → T26 (fase 3)
T13 → T27 (fase 3)
```

### Phase 6: Passo 2 — Desmantelar no jogo

```
T30 → T31 → T32 → T34
T31 → T33 → T35
T31 → T36
T29 → T30 (fase 5)
```

### Phase 7: Passo 3 — Divergente, regra pura

```
T37 → T38 → T39
T40
T41
T26 → T37 (fase 5)
```

### Phase 8: Passo 3 — Divergente no jogo

```
T42 → T43 → T44 → T46 → T48
T43 → T45 → T48
T44 → T47 → T49
T43 → T50
T38 → T43 (fase 7)
T39 → T44 (fase 7)
T40 → T44 (fase 7)
T41 → T45 (fase 7)
```

### Phase 9: Passo 4 — União e Roxo, regra pura

```
T52 → T53 → T54 → T55
T51
T17 → T51 (fase 4)
T37 → T52 (fase 7)
```

### Phase 10: Passo 4 — Roxo no jogo

```
T56 → T57 → T58 → T59
T57 → T60 → T61
T55 → T56 (fase 9)
T51 → T57 (fase 9)
```

### Phase 11: Passo 4 — fim do modelo antigo

```
T62 → T63 → T64
T63 → T65
T31 → T62 (fase 6)
T43 → T62 (fase 8)
T57 → T62 (fase 10)
```

### Phase 12: Passo 5 — painel completo, regra pura

```
T66 → T67
T68
T10 → T68 (fase 2)
```

### Phase 13: Passo 5 — painel e maestria no jogo

```
T69 → T70 → T73 → T74
T71 → T72 → T73
T11 → T69 (fase 2)
T68 → T70 (fase 12)
T7 → T71 (fase 2)
T67 → T73 (fase 12)
```

### Phase 14: Passo 6 — baú do chefe

```
T75 → T77
T76 → T77 → T78 → T79
T73 → T77 (fase 13)
```

---

## Task Breakdown

### Phase 1: Passo 0 — registro e regra genérica (refatoração, smokes iguais)

#### T1: Registro `AXIS_ITEMS` em `data/techAxes.ts`

**What**: o tipo `AxisItem` passa a `'vermelho' | 'corpo' | 'azul' | 'corte' | 'divergente' | 'roxo'`; nascem
`ItemAxes` (`ids`, `names`, `branches`, `branchNames`, `awakenings`, `deadAxis?`, como em "Data Models" do design) e
`AXIS_ITEMS: Partial<Record<AxisItem, ItemAxes>>` só com o Vermelho e o Corpo; o `AXIS_NAMES`/`BRANCH_NAMES` da F30
vira campo do registro e os leitores passam a ler de lá. Os tipos de eixo, ramo e Despertar das quatro técnicas entram
já (`BlueAxisId`, `CutAxisId`, `DivergentAxisId`, `PurpleAxisId`, os 12 `BranchId` e os 12 `AwakeningId`), sem entrada
no registro.
**Where**: `src/data/techAxes.ts`
**Depends on**: None
**Reuses**: tabelas e nomes da F30
**Requirement**: CHC-01, EIX-01

**Done when**:

- [ ] `tests/data/techAxes.test.ts` (F30) lê os nomes pelo registro; `AXIS_ITEMS` tem só `vermelho` e `corpo`
- [ ] `grep -rn "AXIS_NAMES\|BRANCH_NAMES" src` só no registro (ou vazio)
- [ ] Smokes `red-axes`, `cursed-body` e `shop-axes` verdes e iguais
- [ ] Gate verde; contagem igual à base

**Tests**: unit + smoke
**Gate**: full
**Commit**: `refactor(data): register axis items in one table`

---

#### T2: `AxisBuild` genérico pelo registro

**What**: `AxisBuild` lê ids, ramos e Despertares do `AXIS_ITEMS`; ganha `has(item)`, `ids(item)` e
`offerable(item, axis)` (= `canAdd` e o eixo não é o `deadAxis` do ramo escolhido); `focusAxis` passa a usar
`offerable`; `resetItem(item)` vale para qualquer item; os pontos num eixo morto continuam no `total`.
**Where**: `src/core/axisBuild.ts`
**Depends on**: T1
**Reuses**: `AxisBuild` da F30 (`add`, `canAdd`, `pending`, `announce`)
**Requirement**: CHC-01, EIX-01, EIX-03, DVG-06

**Done when**:

- [ ] `tests/core/axisBuild.test.ts` (F30) verde sem mudança de número nos casos do Vermelho e do Corpo
- [ ] Casos novos com um registro sintético (item de teste com `deadAxis`): `has` falso para item fora do registro;
      `offerable` falso no eixo morto com o ramo escolhido e verdadeiro antes da escolha; o ponto já posto no eixo morto
      conta no nível; teto 2/3/4 pontos no eixo e 4/5/6 no item (o 4º do eixo e o 6º do item recusados sem mudar nada,
      EIX-01.2); Nv 2 deixa o ramo pendente uma vez; Nv 5 com o ramo pendente liga o Despertar na escolha (edge case)
- [ ] Gate verde; contagem = base + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `refactor(core): read the axis build from the item registry`

---

#### T3: `Loadout` genérico

**What**: em `levelOf`, `slotsView`, `equip` e `clear`, o `id === 'vermelho'` da F30 vira `axes.has(id)`; `clear(slot)`
chama `axes.resetItem(id)` para qualquer técnica do registro.
**Where**: `src/core/loadout.ts`
**Depends on**: T2
**Reuses**: `Loadout` da F30
**Requirement**: CHC-01, EIX-01, RXO-02

**Done when**:

- [ ] `tests/core/loadout.test.ts` e `tests/core/loadoutAxes.test.ts` (F30) verdes sem mudança de número
- [ ] Caso novo: `clear` de um slot com técnica do registro zera os pontos, o ramo e o Despertar dela
- [ ] Smokes `red-axes`, `evolution` e `shop` verdes e iguais
- [ ] Gate verde; contagem sem perda

**Tests**: unit + smoke
**Gate**: full
**Commit**: `refactor(core): let the loadout derive every registered technique level`

---

#### T4: `TechStats` com ramo, Despertar e reembolso no topo

**What**: `branch`, `awakened` e `killRefund` saem de dentro de `red` (F30) para o topo do `TechStats`;
`resolveTechStats` vira despacho (`RESOLVERS[id]` quando a técnica está no registro, senão a regra antiga); só o
Vermelho entra no `RESOLVERS`; o piso `max(custo, ceil(0,6 × TECHNIQUES[id].cost))` continua por último, depois do
`costMul`. Os leitores de `stats.red.branch/awakened/killRefund` passam ao topo.
**Where**: `src/core/techStats.ts`
**Depends on**: T1
**Reuses**: `resolveTechStats`, piso da PRC-05 (F30)
**Requirement**: CHC-01, EIX-02

**Done when**:

- [ ] `tests/core/techStats.test.ts` (F30) verde com as leituras trocadas para o topo e sem mudança de número
- [ ] Caso novo: técnica fora do registro cai na regra antiga com os números de hoje; o Vermelho sai do resolvedor
- [ ] Smokes `red-axes`, `tech` e `techniques` verdes e iguais
- [ ] Gate verde; contagem sem perda

**Tests**: unit + smoke
**Gate**: full
**Commit**: `refactor(core): dispatch technique stats by the axis registry`

---

#### T5: Loja lê o registro

**What**: `shopDraw.ts` (`axesFor` com `offerable`, item da carta de eixo por `axes.has`), `shopEligibility.ts`,
`shopPreview.ts` e `shopPricing.ts` trocam todo teste `item === 'vermelho'`/`'corpo'` por consulta ao registro; com só
o Vermelho e o Corpo registrados o comportamento é o de hoje.
**Where**: `src/core/shopDraw.ts`
**Depends on**: T2
**Reuses**: `drawCards`, `axesFor`, `axisRng`, `axisPointPrice`, `axisGate`, `axisPreview` (F30)
**Requirement**: CHC-01, EIX-06

**Done when**:

- [ ] `tests/core/shopAxes.test.ts`, `shopPricing.test.ts`, `shop.test.ts` e `techShop.test.ts` verdes sem mudança de
      número
- [ ] `grep -rnE "=== '(vermelho|corpo)'" src/core/shop*.ts` vazio
- [ ] Smokes `shop-axes`, `shop`, `shop-progress` e `run-loop` verdes e iguais
- [ ] Gate verde; contagem sem perda

**Tests**: unit + smoke
**Gate**: full
**Commit**: `refactor(shop): read axis cards from the item registry`

---

#### T6: `axes=` e `ramo=` pelo registro

**What**: `parseAxesParam` e `parseBranchParam` aceitam todo item e eixo do `AXIS_ITEMS` (ids e `branches[0|1]` do
registro) no lugar da lista fixa da F30.
**Where**: `src/core/axisParam.ts`
**Depends on**: T1
**Reuses**: `axisParam.ts` da F30
**Requirement**: CHC-01, EIX-07

**Done when**:

- [ ] `tests/core/axisParam.test.ts` (F30) verde; caso novo com item de teste no registro sintético; item ou eixo fora
      do registro ignorado
- [ ] Gate verde; contagem sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `refactor(core): parse axis debug params from the item registry`

---

### Phase 2: Passo 0 — conjuração, painel e `choiceDirector` (refatoração, smokes iguais)

#### T7: `castHit` genérico no `TechRunner`

**What**: `CastRef` ganha `tech: TechId`; `TechContext.masteryHit` vira `castHit(cast, target)`; o `TechRunner` monta
o aviso (com `killed = !isBoss && target.isDead?.()` lido logo depois do `receiveHit` aceito), chama a maestria com a
assinatura de hoje e, com `stats(tech).killRefund > 0` e `killed`, `loadout.refundCooldown(slot, killRefund)`; emite
`awakenCast:<id>` no `techCast:<id>` com o Despertar ligado. O reembolso e o `awakenCast` saem de `red.ts`/
`redFlight.ts` (F30); o `techDirector` lê `awakenCast:<id>` → `build.axes.announce(id)`; os adaptadores `blue`, `cut`,
`divergent` e `purple` só trocam o nome da chamada.
**Where**: `src/game/TechRunner.ts`
**Depends on**: T4 (fase 1)
**Reuses**: `Loadout.refundCooldown`, `axisDirector.announce` (F30)
**Requirement**: CHC-01, EIX-03, EIX-04

**Done when**:

- [ ] `grep -n "refundCooldown\|awakenCast" src/game/tech/red.ts src/game/tech/redFlight.ts` vazio
- [ ] Smokes `red-axes` (reembolso da Recarga 3 e banner do Despertar), `tech`, `techniques`, `shop-progress`
      (maestria de hoje) e `kokusen` verdes e iguais
- [ ] Gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(tech): report technique hits and awakenings from the runner`

---

#### T8: Borda dourada do Despertar para qualquer técnica

**What**: o `EnergyHud` troca o teste do Vermelho pela leitura `loadout.stats(s.id).awakened` na borda dourada
(VRM-17).
**Where**: `src/game/EnergyHud.ts`
**Depends on**: T4 (fase 1)
**Reuses**: borda da F30
**Requirement**: EIX-03

**Done when**:

- [ ] Smokes `red-axes` (borda com o Despertar) e `hud` verdes e iguais
- [ ] Gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(hud): draw the awakening border for any technique`

---

#### T9: `ChoicePanel` com página genérica

**What**: `ChoicePage = { kind, item, options }` com 1 a 3 `ChoiceOption = { id, title, line }`; até 3 cartas
centradas; a página `despertar` tem uma carta só e a dica "Enter"; `debug()` mantém a forma da F31 até a T69.
**Where**: `src/game/ChoicePanel.ts`
**Depends on**: None
**Reuses**: `ChoicePanel` da F30/F31 (camada, profundidade e cores do `VowPanel`, AD-003)
**Requirement**: CHC-04

**Done when**:

- [ ] `tests/game/choicePanel.test.ts`: `show` com 1, 2 e 3 opções; `select` move o realce e não passa da última;
      `hide` fecha; o `debug()` de hoje igual
- [ ] Gate verde; contagem sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `refactor(ui): make the choice panel a generic page of up to three options`

---

#### T10: Fila pura das páginas

**What**: `src/core/choice.ts` com `ChoiceRequest` (`ramo`, `ponto`, `livre`, `despertar`, `veu`, `bau` e o `bauChefe`
da F31 até a T78), `ChoiceQueue` (`add` por ordem de chegada ignorando `ramo`/`veu`/`bau` repetidos, `open(rank)`,
`current`, `advance`, `insertNext`, `pending`, `isOpen`, `reset`) e `choiceRank` na ordem da F31 (`bauChefe`, `veu`,
ramos) para os smokes não mudarem.
**Where**: `src/core/choice.ts`
**Depends on**: T1 (fase 1)
**Reuses**: ordem do `openChoiceOrShop` da F31
**Requirement**: CHC-01, CHC-03, CHC-11

**Done when**:

- [ ] `tests/core/choice.test.ts`: ordem da F31; `insertNext` põe as páginas logo depois da atual, na ordem dada;
      `ramo` repetido ignorado; `pending` conta as que faltam; `reset` esvazia e fecha
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the pending choice page queue`

---

#### T11: `choiceDirector` dono do painel

**What**: `src/scenes/test/choiceDirector.ts` (campo `choice` do `BuildDirector`) recebe `openChoiceOrShop`/
`updateChoicePanel` do `shopDirector` como `openIfPending()` e `update(input)`; `confirm` despacha `ramo` →
`axes.confirmBranch` (que passa a devolver `{ awakened }`) e `veu`/`bauChefe` → `domainDirector`; o `axisDirector`
perde o `choicePages()`; `shopDirector.openShop`/`updateShop`/`updateVowPanel` só perguntam ao `build.choice`;
`build.reset()` chama `choice.reset()`; `statsDirector.snapshotFields()` troca a fonte do `choice` (mesma linha).
**Where**: `src/scenes/test/choiceDirector.ts`
**Depends on**: T9, T10
**Reuses**: fluxo do `shopDirector` da F30/F31, `axisDirector.confirmBranch`, `domainDirector.confirm`
**Requirement**: CHC-01, CHC-04, CHC-11

**Done when**:

- [ ] `grep -n "openChoiceOrShop\|updateChoicePanel" src/scenes/test/shopDirector.ts` vazio
- [ ] Smokes `shop-axes`, `shop`, `shop-progress`, `run-loop`, `red-axes`, `cursed-body`, `evolution`, `vows` e `domain`
      verdes e sem mudança nos arquivos dos smokes (CHC-01)
- [ ] `TestScene.ts` intocado
- [ ] Gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(shop): move the between-rounds panel to a choice director`

---

### Phase 3: Passo 1 — Azul, regra pura

#### T12: Tabela do Azul

**What**: `src/data/techAxesTechniques.ts` com `BLUE_AXES` (`radius [130,160,190,220]`, `pullSpeed [150,190,230,270]`,
`lifeMs [1400,1800,2200,2600]`, `implosion [10,18,26,34]`, `tick [5,6,7,8]`, `cost [40,34,29,24]`, `cooldownMs
[2500,2100,1800,1500]`, `knockdownFrom 2`, `pullsElite 3`), `BLUE_BRANCHES` (`andante { aheadPx 80, lifeMul 0.7 }`,
`lapso { speed 200, maxPx 220, wallMarginPx 16 }`) e `BLUE_AWAKENINGS` (`azulMaximo { implosionMul 3, pct }`,
`ancora { holdMs 500, pct }`, `pct` = `MAX_HP_PCT` da F30), com nomes e textos de efeito; ainda fora do registro.
**Where**: `src/data/techAxesTechniques.ts`
**Depends on**: T1 (fase 1)
**Reuses**: molde das tabelas do Vermelho (F30), `MAX_HP_PCT`
**Requirement**: AZL-02, EIX-09, EIX-10

**Done when**:

- [ ] `tests/data/techAxesTechniques.test.ts`: AZL-02 linha a linha (0 a 3 pontos de cada eixo); EIX-09 do Azul com o
      modelo das Assumptions (período preso à energia, Puxão 0; nenhum eixo no 3 acima de 1,35 × a mediana; números
      da tabela "Calibração" do design como esperados); EIX-10 sobre os ramos e Despertares do Vermelho, do Corpo e do
      Azul (nome repetido ou texto de efeito repetido falha)
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(data): add the blue axis table`

---

#### T13: Resolvedor do Azul

**What**: `src/core/techResolvers.ts` com `resolveBlue`: lê a tabela pelos pontos, dano com
`Math.round(base × damageMul × vowDamageMul)` na ordem de `loadout.ts:97`, e preenche o bloco `blue` do `TechStats`
(`radius`, `pullSpeed`, `tickMs` 250, `lifeMs` com o ×0,7 do Andante arredondado ao ms, `implosionKnockdown =
implosao ≥ 2 || azulMaximo`, `follow`, `lapso`, `implosionPct`, `anchor`), `branch`, `awakened` e `killRefund` 0,3
com Recarga 3; base sem ponto: custo 40, recarga 2500, sinal 200, carga 250. Ainda fora do `RESOLVERS`.
**Where**: `src/core/techResolvers.ts`
**Depends on**: T12, T4 (fase 1)
**Reuses**: `resolveRed` (F30) como molde, `TECH_GEOMETRY.azul`
**Requirement**: AZL-01, AZL-02, AZL-04, EIX-02, EIX-04

**Done when**:

- [ ] `tests/core/techStatsTechniques.test.ts`: cada eixo de 0 a 3 com `damageMul`/`vowDamageMul` 1 e 1,35; piso de
      60% (custo 24 no 3º ponto de Eficiência e com o voto Fluxo selado); AZL-01 (40/2500, raio 130, puxão 150, tique 5
      a cada 250 ms, vida 1400, implosão 10, sinal 200, carga 250); `implosionKnockdown` falso com 1 ponto e verdadeiro
      com 2; vida do Andante 980 com 0 ponto e 1820 com Duração 3; `killRefund` 0 com Recarga 2 e 0,3 com 3
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): resolve the blue stats from its axes`

---

#### T14: Regra dos ramos do Azul

**What**: `src/core/blueBranch.ts` com `andantePoint(playerCenter, facing, aheadPx = 80)`, `class LapsoDrive`
(`update(dtMs, held)` → `{ x, stopped, justStopped }`; anda a 200 px/s enquanto segurado; para ao soltar, a 220 px do
centro do player no início da conjuração ou a 16 px da parede, o que vier primeiro; nasce parado se a tecla já estava
solta) e `anchorTargets(center, radius, targets)` (todo comum e o chefe dentro do raio).
**Where**: `src/core/blueBranch.ts`
**Depends on**: T12
**Reuses**: molde do `redBranch.ts` (F30)
**Requirement**: AZL-05, AZL-06, AZL-08

**Done when**:

- [ ] `tests/core/blueBranch.test.ts`: `andantePoint` a 80 px nos dois sentidos; Lapso para ao soltar, para em 220 px
      (219 anda, 220 para, nunca 221), para a 16 px da parede antes dos 220; tecla solta antes do nascimento nasce
      parado; `justStopped` verdadeiro só no quadro da parada; `anchorTargets` com alvo na borda do raio dentro e 1 px
      fora fora, chefe incluso
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the blue branch rules`

---

#### T15: Orbe do Azul pelo stat

**What**: `BlueOrbState` ganha `setPosition(x, y)`; tique, implosão, vida e `knockdown` da implosão saem do stat
copiado na criação (a vida do Andante já vem ×0,7 do resolvedor).
**Where**: `src/core/blueOrb.ts`
**Depends on**: T13
**Reuses**: `BlueOrbState` (F30)
**Requirement**: AZL-01, AZL-04, AZL-05, AZL-07

**Done when**:

- [ ] `tests/core/blueOrb.test.ts`: `setPosition` move o centro do puxão; tique e implosão do stat (5 e 10 na base, 8 e
      34 com Implosão 3); a implosão leva `knockdown` só com `implosionKnockdown`; vida pelo `lifeMs`
- [ ] Gate verde; contagem sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): drive the blue orb from its resolved stats`

---

#### T16: Chefe preso sem interromper golpe

**What**: `BossAIObservation.held`: enquanto verdadeiro, o estado `rest` não desconta o relógio (o único estado que
começa ataque); `windup` e ataque em curso seguem.
**Where**: `src/core/bossAI.ts`
**Depends on**: None
**Reuses**: `rest` de `bossAI.ts:111-121`
**Requirement**: AZL-08

**Done when**:

- [ ] `tests/core/bossAIHold.test.ts` (novo; o `bossAI.test.ts` está na exceção de tamanho): `rest` parado com `held`
      e descontando sem; investida em curso segue com `held`; `windup` segue
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): let a held boss keep its current attack`

---

### Phase 4: Passo 1 — Azul no jogo

#### T17: Azul entra no registro

**What**: o Azul entra no `AXIS_ITEMS` e no `RESOLVERS`; `data/techniques.ts` passa o Azul a `cost 40` e `cooldownMs
2500` (AZL-01); `data/shop.ts` Azul `maxLevel 6`. Smokes que quebram, no mesmo commit: `evolution.smoke.mjs:35` ganha a
ponte `tech=azul,vermelho&axes=azul.gravidade:2,vermelho.potencia:2` (a União ainda pede Nv 3 até a T51);
`shop-progress.smoke.mjs` (trecho ECN-05/08 da F30) com a carta de eixo do Azul (`Nv 2/6`, `axes` com o foco, custo
`inflate(12, 2)` = 13, `buy:azul:13`); `techniques` e `tech` com 40/2500 onde leem.
**Where**: `src/data/techAxes.ts`
**Depends on**: T5 (fase 1), T6 (fase 1), T13 (fase 3)
**Reuses**: carta de 2 eixos, preço, trava e `axes=`/`ramo=` da F30, genéricos depois das T5 e T6
**Requirement**: AZL-01, EIX-01, EIX-06, EIX-07

**Done when**:

- [ ] `tests/core/shopAxes.test.ts`: carta de melhoria do Azul é a de 2 eixos (`Nv <n+1>/6`); preço `12 + 4 × pontos`;
      nenhuma carta de eixo do Azul na r1 e o 1º ponto aceito na r2 (edge case, PRC-04); `tests/data/techniques.test.ts`
      com 40/2500
- [ ] `tech=azul:3` deixa o Azul no Nv 1 (EIX-07): caso em `tests/core/loadoutAxes.test.ts` ou no smoke `techniques`
- [ ] Smokes `evolution` (ponte), `shop-progress`, `shop-axes`, `techniques`, `tech` e `power` verdes
- [ ] Gate verde; contagem sem perda

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(blue): grow the blue by axis points`

---

#### T18: `build.azul` no snapshot e o raio no motor

**What**: `game/axisSnapshot.ts` ganha `TechBuildSnapshot<A, S>` e `BlueBuildSnapshot`; `axisDirector.snapshot()` monta
`build.<item>` para todo item do registro (`techBuildSnapshot(id, loadout)`), `null` sem a técnica equipada;
`BlueOrbFx.debug(): { radius }` e o `snapshot` do `BlueTech` com `radius`, lido em `techObjects`; literal do
`tests/game/debugApi.test.ts`; nasce `scripts/smoke/tech-axes.smoke.mjs` (`?debug&hd=1&area=modular&seed=1&maxAlive=3`).
**Where**: `src/game/axisSnapshot.ts`
**Depends on**: T17
**Reuses**: `build.vermelho` da F30, `techObjects` do `debugApi`
**Requirement**: EIX-08, EIX-11, AZL-03, EIX-07

**Done when**:

- [ ] `tech-axes.smoke.mjs`: `tech=azul&axes=azul.gravidade:3` → `build.azul.stats.radius` 220 e `techObjects` blue
      `radius` 220 (lido do `BlueOrbFx`, L-043); halo e distorção a `40 × 220 / 130` e `58 × 220 / 130` no debug da
      vista; sem `tech=azul`, `build.azul` é `null`; `axes=azul.gravidade:3` sem o Azul equipado é ignorado
- [ ] `grep -n "130\b" src/game/techFx/BlueOrb.ts` sem cópia do raio resolvido (EIX-11)
- [ ] Smokes `tech-axes`, `tech` e `fxlab` verdes; gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(blue): report the blue build and the drawn orb radius`

---

#### T19: Recarga 3 das técnicas novas no jogo vivo

**What**: prova no jogo vivo que o reembolso genérico da T7 vale para o Azul (`killRefund` do resolvedor): o abate por
tique ou implosão tira 30% da recarga cheia resolvida do que resta no slot, sem passar de 0.
**Where**: `scripts/smoke/tech-axes.smoke.mjs`
**Depends on**: T18
**Reuses**: `castHit` e `refundCooldown` (T7)
**Requirement**: EIX-04

**Done when**:

- [ ] `tech-axes.smoke.mjs`: `tech=azul&axes=azul.recarga:3` e um comum de 1 HP no raio: o `cooldownMs` restante do
      slot cai 450 (30% de 1500) no abate; com `azul.recarga:2` não cai
- [ ] Smoke `tech-axes` verde; gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `test(smoke): prove the blue kill refund at three cooldown points`

---

#### T20: Implosão 2 derruba e treme

**What**: com `implosionKnockdown`, a implosão leva `knockdown: true` nos comuns e o `BlueTech` emite
`blueImplode:heavy`, que o `techDirector` troca por `this.s.fx.shake()`.
**Where**: `src/game/tech/blue.ts`
**Depends on**: T18
**Reuses**: `BlueOrbState` (T15), `fx.shake`
**Requirement**: AZL-04

**Done when**:

- [ ] `tech-axes.smoke.mjs`: `axes=azul.implosao:2`: o comum na implosão entra em `ragdollStun` e o evento
      `blueImplode:heavy` aparece; com `azul.implosao:1`, nenhum dos dois
- [ ] Smokes `tech-axes` e `tech` verdes; gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(blue): knock down and shake on a heavy implosion`

---

#### T21: Andante

**What**: com o ramo Andante, o orbe nasce e fica a 80 px à frente do centro do player (`andantePoint`), acompanha e
vira com ele a cada quadro (`BlueOrbState.setPosition`) e vive o `lifeMs` resolvido (×0,7).
**Where**: `src/game/tech/blue.ts`
**Depends on**: T18, T14 (fase 3), T15 (fase 3)
**Reuses**: `andantePoint`
**Requirement**: AZL-05, AZL-09

**Done when**:

- [ ] `tech-axes.smoke.mjs`: `tech=azul&ramo=azul:a`: `build.azul.branch` `andante`; o orbe a 80 px do player em dois
      quadros com o player andando e depois de virar; vida 980 ms
- [ ] Andante e campo do Vermelho Máximo sobrepostos: o puxão do Azul vence e o campo segue com os tiques `chip`
      (edge case; `tech=azul,vermelho&axes=vermelho.potencia:2,vermelho.escala:2&ramo=azul:a,vermelho:b`, o Vermelho
      Máximo da F30)
- [ ] Conferido no jogo em HD, parado e correndo, para os dois lados: o orbe não pula ao virar
- [ ] Smokes `tech-axes` e `tech` verdes; gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(blue): carry the orb ahead of the player with the walker branch`

---

#### T22: Lapso

**What**: o `TechRunner` repassa o `slotHeld` ao `blue.update`; com o ramo Lapso, o orbe anda pelo `LapsoDrive` (a
consulta de parede vai até `maxPx + margem`) enquanto a tecla do slot continua segurada e para ao soltar, aos 220 px ou
a 16 px da parede; tecla solta antes do nascimento: orbe parado. A vida não muda.
**Where**: `src/game/tech/blue.ts`
**Depends on**: T18
**Reuses**: `LapsoDrive` (T14), `TechCaster.slotHeld` (F30)
**Requirement**: AZL-06, AZL-09

**Done when**:

- [ ] `tech-axes.smoke.mjs`: `tech=azul&ramo=azul:b` segurando a tecla: o orbe para a 220 px do centro do player no
      início da conjuração; soltando cedo para onde está; solta antes do nascimento fica a 110 px
- [ ] Player atingido com o orbe do Lapso andando: segue até soltar ou o limite (edge case)
- [ ] Conferido no jogo em HD, para os dois lados
- [ ] Smokes `tech-axes` e `tech` verdes; gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(blue): steer the orb forward while the key is held`

---

#### T23: Âncora

**What**: `Enemy.hold(ms)` (`heldMs` no `enemy/context.ts`: enquanto `> 0`, o `gate` passa `windupAllowed: false` e o
`vx` da IA vira 0; preparo e golpe em curso seguem) e `Boss.hold(ms)` (`held` na `BossAIObservation`, T16);
`TechTarget.hold?(ms)`; com a Âncora, no `justStopped` do Lapso todo comum e o chefe no raio (`anchorTargets`) ficam
presos 500 ms e levam o acerto proporcional de dano 0 com `maxHpBonus` (4% no comum, 1% no chefe), uma vez por conjuração.
**Where**: `src/game/tech/blue.ts`
**Depends on**: T22, T16 (fase 3)
**Reuses**: `windupAllowed` (`enemyAI.ts:150`), `dealtDamage`/`Hit.maxHpBonus` (F30)
**Requirement**: AZL-08, EIX-03, EIX-05

**Done when**:

- [ ] `tech-axes.smoke.mjs`: `tech=azul&axes=azul.duracao:2,azul.gravidade:2&ramo=azul:b`: `awakened: true`; ao soltar,
      os comuns no raio ficam parados (posição e `ai.state` sem ataque novo) por 500 ms e o número de dano de cada um é
      `round(0,04 × maxHp)`; o chefe (`area=modular&round=5`) não começa ataque nos 500 ms e o golpe em curso segue
- [ ] Banner com o nome do Despertar e escala de tempo 0,4 por 350 ms na 1ª conjuração da rodada (EIX-03.6)
- [ ] Smokes `tech-axes`, `tech`, `boss` e `enemy-` verdes; gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(blue): anchor enemies and the boss where the drift stops`

---

#### T24: Azul Máximo

**What**: com o Azul Máximo, a implosão dá 3 × o dano resolvido da implosão, leva `knockdown` nos comuns e soma 4% do
HP máximo de cada alvo no raio (1% no chefe, sem derrubada), pelo `maxHpBonus`.
**Where**: `src/game/tech/blue.ts`
**Depends on**: T20, T21
**Reuses**: `implosionPct` do resolvedor (T13)
**Requirement**: AZL-07, EIX-03, EIX-05

**Done when**:

- [ ] `tech-axes.smoke.mjs`: `tech=azul&axes=azul.implosao:2,azul.gravidade:2&ramo=azul:a`: `awakened: true`; o número
      da implosão no comum é `3 × 26 + round(0,04 × maxHp)` e ele cai; borda dourada no `EnergyHud`; banner e câmera
      lenta na 1ª conjuração da rodada
- [ ] Smokes `tech-axes` e `tech` verdes; gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(blue): triple the implosion with the maximum awakening`

---

#### T25: Curva de build do Azul

**What**: caso do Azul como técnica focada no `buildCurve` (preços, trava e inflação da F30 sobre `expectedIncome`,
toda carta à venda): Nv 2 até a loja da r3 e Nv 5 até a loja da r10.
**Where**: `tests/core/buildCurve.test.ts`
**Depends on**: T17
**Reuses**: `buildCurve.test.ts` da F30, `expectedIncome`, `cardCost`
**Requirement**: EIX-12

**Done when**:

- [ ] Caso do Azul verde; se não fechar, parar e levar ao usuário (decisão que trava a tarefa)
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `test(core): prove the focused blue build curve`

---

### Phase 5: Passo 2 — Desmantelar, regra pura

#### T26: Tabela do Desmantelar

**What**: `CUT_AXES` (`cuts [3,4,5,6]`, `farPx [180,220,260,300]`, `heightPx [48,56,64,72]`, `cut [10,13,16,19]`,
`intervalMs [60,45,35,25]`, `signMs [150,120,100,80]`, `cost [30,25,20,18]`, `cooldownMs [2500,2000,1600,1200]`),
`CUT_BRANCHES` (`paraTras {}`, `clivar { pct: { enemy 0.02, boss 0.005 } }`) e `CUT_AWAKENINGS`
(`desmantelarDoRei { lastCutPct }`, `fenda { reachPx 120 }`), com nomes e textos; ainda fora do registro.
**Where**: `src/data/techAxesTechniques.ts`
**Depends on**: T12 (fase 3)
**Reuses**: molde do `BLUE_*`
**Requirement**: DSM-01, EIX-09, EIX-10

**Done when**:

- [ ] `tests/data/techAxesTechniques.test.ts`: DSM-01 linha a linha; EIX-09 do Desmantelar (`cortes × afiação ×
      alvos(alcance − 60)`, mínimo 1 alvo; maior/mediana 1,21 pela tabela do design); EIX-10 com os ramos e
      Despertares do Desmantelar somados
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(data): add the dismantle axis table`

---

#### T27: Resolvedor do Desmantelar

**What**: `resolveCut` preenche o bloco `cut` (`times` = `i × intervalo`, `anglesDeg` = `[20, −25, 70][i mod 3]`,
`mirrored` do Para Trás, `nearPx` 60, `farPx`, `heightPx`, `lineLen`, `cutPct` do Clivar, `lastCutPct` do Rei,
`clearsProjectiles`, `fendaPx`), o dano `cut`, `branch`, `awakened` e `killRefund`.
**Where**: `src/core/techResolvers.ts`
**Depends on**: T26, T13 (fase 3)
**Reuses**: `resolveBlue` como molde, `TECH_GEOMETRY.corte`
**Requirement**: DSM-01, EIX-02, EIX-04

**Done when**:

- [ ] `tests/core/techStatsTechniques.test.ts`: cada eixo de 0 a 3 com multiplicadores 1 e 1,35; piso de 60% (18);
      `times` e `anglesDeg` com 3 e 6 cortes; `killRefund` 0,3 só com Recarga 3
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): resolve the dismantle stats from its axes`

---

#### T28: Regra dos ramos do Desmantelar

**What**: `src/core/cutBranch.ts` com `cutPlan(stats)` (`times`, `angles`, `mirrored[i] = paraTras && i % 2 === 1`),
`fendaTarget(deadAt, livingEnemies, reachPx = 120)` (o comum vivo mais perto, `null` sem nenhum) e `rectsTouch(a, b)`
(o `overlaps` de `cut.ts:14-16`, exportado).
**Where**: `src/core/cutBranch.ts`
**Depends on**: T27
**Reuses**: `overlaps` de `core/cut.ts`
**Requirement**: DSM-02, DSM-04, DSM-07

**Done when**:

- [ ] `tests/core/cutBranch.test.ts`: instantes e ângulos de 3 a 6 cortes; espelhados 1 de 3, 2 de 4, 2 de 5, 3 de 6,
      o 1º sempre à frente; `fendaTarget` a 119 e 120 px acha, a 121 não; sem vivo, `null`
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the dismantle branch rules`

---

#### T29: Agenda dos cortes pelo plano

**What**: `CutSchedule` pelo `cutPlan` (n cortes, intervalo resolvido) e `targetsHit(center, facing, i)` com o
retângulo de 60 px ao alcance resolvido, a altura resolvida e o espelho atrás do player quando `mirrored[i]`.
**Where**: `src/core/cut.ts`
**Depends on**: T28
**Reuses**: `CutSchedule` de hoje (F30)
**Requirement**: DSM-02, DSM-04

**Done when**:

- [ ] `tests/core/cut.test.ts`: na base, 3 cortes em 0/60/120 ms com a faixa 60 a 180 e altura 48 (igual a hoje);
      com 6 cortes e intervalo 25, cortes em 0..125 ms; alvo atrás tocado só pelos cortes espelhados
- [ ] Gate verde; contagem sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): schedule dismantle cuts from the resolved plan`

---

### Phase 6: Passo 2 — Desmantelar no jogo

#### T30: Cortes e `CutFx` pelo retângulo resolvido

**What**: `game/tech/cut.ts` agenda pelo `CutSchedule` novo e passa o retângulo de cada corte ao `CutFx.cut(center,
dir, angle, rect)`, que centra a linha no retângulo (inclusive o espelhado) e guarda `lastRect` no debug; o `fx.cut`
entra no snapshot. Com a base (Desmantelar ainda fora do registro) nada muda no jogo.
**Where**: `src/game/tech/cut.ts`
**Depends on**: T29 (fase 5)
**Reuses**: `CutFx` (F31)
**Requirement**: DSM-02, DSM-03, EIX-11

**Done when**:

- [ ] `tech-axes.smoke.mjs`: `tech=corte`: `fx.cut.lastRect` da faixa 60 a 180 px, altura 48 (lido da vista, L-043)
- [ ] `grep -nE "\b(180|48)\b" src/game/techFx/CutFx.ts` sem cópia do retângulo resolvido (EIX-11)
- [ ] Smokes `tech-axes`, `tech`, `techniques` e `fxlab` verdes e iguais nos números de hoje; gate verde; contagem sem
      perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(cut): draw each slash over its resolved rectangle`

---

#### T31: Desmantelar entra no registro

**What**: o Desmantelar (`corte`) entra no `AXIS_ITEMS` e no `RESOLVERS`; `data/shop.ts` Desmantelar `maxLevel 6`;
`build.corte` (`CutBuildSnapshot`); o nível do `tech=corte:N` passa a ser ignorado; `tech` e `techniques` ajustados onde
leem nível.
**Where**: `src/data/techAxes.ts`
**Depends on**: T30
**Reuses**: registro (T1), snapshot genérico (T18)
**Requirement**: DSM-01, EIX-01, EIX-06, EIX-07, EIX-08

**Done when**:

- [ ] `tests/core/shopAxes.test.ts`: carta de 2 eixos do Desmantelar, preço e trava como o Azul
- [ ] `tech-axes.smoke.mjs`: `tech=corte&axes=corte.alcance:3`: `build.corte.stats.farPx` 300 e `fx.cut.lastRect` até
      300 px; `axes=corte.cortes:3`: 6 cortes na conjuração (eventos ou números)
- [ ] Smokes `tech-axes`, `tech`, `techniques`, `shop-axes` e `shop` verdes; gate verde; contagem sem perda

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(cut): grow the dismantle by axis points`

---

#### T32: Para Trás

**What**: com o ramo Para Trás, os cortes de posição par (2º, 4º, 6º) saem com o retângulo espelhado atrás do player.
**Where**: `src/game/tech/cut.ts`
**Depends on**: T31
**Reuses**: `mirrored` do `cutPlan`
**Requirement**: DSM-04, DSM-08

**Done when**:

- [ ] `tech-axes.smoke.mjs`: `tech=corte&axes=corte.cortes:3&ramo=corte:a` com um comum de cada lado: os dois levam
      corte; `build.corte.branch` `paraTras`
- [ ] Conferido no jogo em HD, parado e correndo, para os dois lados: o corte espelhado sai do lado certo
- [ ] Smokes `tech-axes` e `tech` verdes; gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(cut): send half the cuts behind with the back branch`

---

#### T33: Clivar

**What**: com o ramo Clivar, todo corte que acerta soma 2% do HP máximo do alvo (0,5% no chefe) pelo `maxHpBonus`, e
nenhuma outra fonte empilha proporcional no mesmo corte.
**Where**: `src/game/tech/cut.ts`
**Depends on**: T31
**Reuses**: `dealtDamage`/`Hit.maxHpBonus` (F30)
**Requirement**: DSM-05, DSM-08, EIX-05

**Done when**:

- [ ] `tech-axes.smoke.mjs`: `tech=corte&ramo=corte:b`: o número de cada corte no comum é `10 + round(0,02 × maxHp)`;
      no chefe `10 + round(0,005 × maxHp)`; `build.corte.branch` `clivar`
- [ ] Smokes `tech-axes` e `tech` verdes; gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(cut): cleave a share of max HP per cut`

---

#### T34: Desmantelar do Rei

**What**: o `TechRunner` expõe `cutRects` do quadro; com o Rei, o `techDirector` apaga (`destroyNow()`) todo projétil e
onda de choque do chefe que toca um retângulo (`rectsTouch` com `Projectile.width` da F31); o último corte da conjuração
soma 4% do HP máximo de cada alvo que acertar (1% no chefe).
**Where**: `src/scenes/test/techDirector.ts`
**Depends on**: T32
**Reuses**: `rectsTouch` (T28), `Projectile` (`x`, `y`, `height`, `destroyNow`)
**Requirement**: DSM-06, EIX-03, EIX-05

**Done when**:

- [ ] `tech-axes.smoke.mjs`: `tech=corte&axes=corte.cortes:2,corte.afiacao:2&ramo=corte:a&area=modular&round=5`: o
      projétil do chefe que cruza um corte some; o último corte soma `round(0,01 × maxHp)` no chefe; `awakened: true`,
      banner e câmera lenta na 1ª conjuração da rodada
- [ ] `TestScene.ts` intocado
- [ ] Smokes `tech-axes`, `boss` e `tech` verdes; gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(cut): cut boss projectiles with the king awakening`

---

#### T35: Fenda

**What**: com a Fenda, o comum que morre por um corte abre uma fenda: 1 acerto `micro` com o dano do corte resolvido
(sem o Clivar) no comum vivo mais perto a até 120 px do morto (`fendaTarget`); o abate pela fenda não abre outra.
**Where**: `src/game/tech/cut.ts`
**Depends on**: T33
**Reuses**: `fendaTarget` (T28), `Hit.band` (F29)
**Requirement**: DSM-07, EIX-03

**Done when**:

- [ ] `tech-axes.smoke.mjs`: `tech=corte&axes=corte.afiacao:2,corte.cortes:2&ramo=corte:b` com dois comuns a 100 px
      e o primeiro com 1 HP: o segundo leva um número `micro` igual ao dano do corte; sem vivo a 120 px, nenhum acerto
      (edge case); a fenda que mata não abre outra
- [ ] Smokes `tech-axes` e `tech` verdes; gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(cut): open a rift to the next enemy on a cut kill`

---

#### T36: Curva de build do Desmantelar

**What**: caso do Desmantelar como técnica focada no `buildCurve`: Nv 2 até a loja da r3 e Nv 5 até a loja da r10.
**Where**: `tests/core/buildCurve.test.ts`
**Depends on**: T31
**Reuses**: caso do Azul (T25)
**Requirement**: EIX-12

**Done when**:

- [ ] Caso verde; se não fechar, parar e levar ao usuário
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `test(core): prove the focused dismantle build curve`

---

### Phase 7: Passo 3 — Divergente, regra pura

#### T37: Tabela do Divergente

**What**: antes de começar, a decisão do usuário sobre o modelo do eixo dominante do Divergente (tabela no topo); a
linha "Modelo do teste de eixo dominante" das Assumptions da spec muda no mesmo commit. `DIVERGENT_AXES` (`second
[18,24,30,36]`, `targets [1,2,2,3]`, `zoneMs [8000,10000,12000,14000]`, `kokusenGain [30,38,46,54]`, `cost
[20,17,14,12]`, `cooldownMs [1200,1000,850,700]`, `first 12`), `DIVERGENT_BRANCHES` (`eco { reachPx 48 }`,
`concentrado { secondMul 2 }`, `deadAxis: { concentrado: 'alvos' }`) e `DIVERGENT_AWAKENINGS` (`ecoNegro { pct enemy
0.03 }`, `impactoUnico { pct }`), com nomes e textos; ainda fora do registro.
**Where**: `src/data/techAxesTechniques.ts`
**Depends on**: T26 (fase 5)
**Reuses**: molde do `CUT_*`
**Requirement**: DVG-01, EIX-09, EIX-10

**Done when**:

- [ ] `tests/data/techAxesTechniques.test.ts`: DVG-01 linha a linha (1º impacto 12); EIX-09 do Divergente pelo modelo
      decidido; EIX-10 com os ramos e Despertares do Divergente somados
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(data): add the divergent fist axis table`

---

#### T38: Resolvedor do Divergente e o Kokusen pelo eixo

**What**: `resolveDivergent` preenche o bloco `divergent` (`targets` 1 no Concentrado, senão o eixo; `zoneMs`,
`kokusenGain`, `secondMul`, `echoPx`, `secondPct`, `echoKokusenPct`), o dano `first`/`second`, `branch`, `awakened` e
`killRefund`; o `kokusenDamage` da F30 passa a usar `D = DIVERGENT_AXES.second[pontos]` (18/24/30/36), sem `damageMul`,
sem `vowDamageMul` e sem o ×2 do Concentrado.
**Where**: `src/core/techResolvers.ts`
**Depends on**: T37
**Reuses**: `kokusenDamage` (ESC-02, F30)
**Requirement**: DVG-01, DVG-04, EIX-02, EIX-04

**Done when**:

- [ ] `tests/core/techStatsTechniques.test.ts`: cada eixo de 0 a 3 com multiplicadores 1 e 1,35; piso de 60% (12);
      Concentrado com Alvos 3 dá `targets` 1 e os pontos contam no nível (edge case)
- [ ] `tests/core/kokusenDamage.test.ts` (F30): `D` 18/24/30/36 pelo eixo, igual com `damageMul` 1,35 e com o
      Concentrado
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): resolve the divergent stats and the kokusen base from its axes`

---

#### T39: Regra dos ramos do Divergente

**What**: `src/core/divergentBranch.ts` com `pickTargets(firstId, candidates, n)` (o tocado sempre entra, os outros pelo
mais perto do player, o chefe conta como um; o principal é o `[0]`, o mais perto), `echoTargets(center, enemies,
reachPx = 48, exclude)` e `divergentPlan(stats)`.
**Where**: `src/core/divergentBranch.ts`
**Depends on**: T38
**Reuses**: molde do `redBranch.ts`
**Requirement**: DVG-02, DVG-05, DVG-06

**Done when**:

- [ ] `tests/core/divergentBranch.test.ts`: o mais perto primeiro; o tocado sempre entra; o chefe conta como 1; eco a
      47 e 48 px acerta, a 49 não; nunca em quem leva o próprio 2º impacto; Concentrado força 1 alvo e ×2
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the divergent branch rules`

---

#### T40: Vários alvos no estado do Divergente

**What**: `DivergentState.firstImpact(ids: number[])`, `markDead(id)`; `update` devolve os vivos no fim do atraso; o
principal segue em `targetId`.
**Where**: `src/core/divergent.ts`
**Depends on**: None
**Reuses**: `DivergentState` de hoje
**Requirement**: DVG-02

**Done when**:

- [ ] `tests/core/divergentState.test.ts` (novo, para não reescrever o `divergent.test.ts`): 3 ids registrados, 1 morto
      no atraso, 2 devolvidos; com 1 id, igual a hoje
- [ ] `tests/core/divergent.test.ts` verde sem mudança
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): track several divergent targets per cast`

---

#### T41: Kokusen com ganho e Zona do eixo

**What**: `KokusenState.land(energy, gain, zoneMs)` no lugar do `CE.kokusenGain` e do `KOKUSEN.zoneMs` fixos.
**Where**: `src/core/kokusen.ts`
**Depends on**: None
**Reuses**: `land` da F30
**Requirement**: DVG-03

**Done when**:

- [ ] `tests/core/kokusen.test.ts`: `land` com 30/8000 igual a hoje e com 54/14000 dá o ganho e a Zona novos
- [ ] Gate verde; contagem sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): take the kokusen gain and zone time from the caller`

---

### Phase 8: Passo 3 — Divergente no jogo

#### T42: Impactos do Divergente em arquivo próprio

**What**: a resolução do 2º impacto, do anel e do Kokusen sai de `game/tech/divergent.ts` (`:163-258`) para
`src/game/tech/divergentImpacts.ts`; `divergent.ts` fica com a hitbox, a espera e a tentativa de Kokusen; sem mudança de
comportamento.
**Where**: `src/game/tech/divergentImpacts.ts`
**Depends on**: None
**Reuses**: corpo de hoje
**Requirement**: DVG-02

**Done when**:

- [ ] `src/game/tech/divergent.ts` abaixo de 190 linhas efetivas
- [ ] Smokes `kokusen`, `tech`, `techniques`, `fight` e `impact` verdes e iguais
- [ ] Gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(tech): move divergent impact resolution to its own module`

---

#### T43: Divergente entra no registro

**What**: o Divergente entra no `AXIS_ITEMS` e no `RESOLVERS`; `data/shop.ts` Divergente `maxLevel 6`;
`build.divergente` (`DivergentBuildSnapshot` com `kokusenDamage`); o nível do `tech=divergente:N` passa a ser ignorado.
**Where**: `src/data/techAxes.ts`
**Depends on**: T42, T38 (fase 7)
**Reuses**: registro, snapshot genérico
**Requirement**: DVG-04, EIX-01, EIX-06, EIX-07, EIX-08

**Done when**:

- [ ] `tests/core/shopAxes.test.ts`: carta de 2 eixos do Divergente, preço e trava
- [ ] `tech-axes.smoke.mjs`: `tech=divergente&axes=divergente.segundo:3`: `build.divergente.stats.second` 36 e o
      `kokusenDamage` com `D` 36 (DVG-04)
- [ ] Smokes `tech-axes`, `kokusen`, `tech`, `techniques` e `shop-axes` verdes; gate verde; contagem sem perda

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(divergent): grow the divergent fist by axis points`

---

#### T44: Vários alvos no soco

**What**: a hitbox do Divergente abre com `maxTargets` = alvos resolvidos; no 1º toque escolhe os N pelo `pickTargets`
sobre o `hitbox.rect` (F31) e a distância ao player; cada alvo leva o próprio 2º impacto no mesmo tempo sorteado; o
Kokusen vale só no principal.
**Where**: `src/game/tech/divergent.ts`
**Depends on**: T43, T39 (fase 7), T40 (fase 7)
**Reuses**: `AttackHitbox.open(..., maxTargets)` (`hitbox.ts:77`)
**Requirement**: DVG-02

**Done when**:

- [ ] `tech-axes.smoke.mjs`: `tech=divergente&axes=divergente.alvos:3&maxAlive=3` com 3 comuns encostados: 3 números de
      2º impacto; com `alvos:0`, 1
- [ ] Smokes `tech-axes`, `kokusen` e `fight` verdes; gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(divergent): land the second impact on several targets`

---

#### T45: Zona e energia do Kokusen pelo eixo

**What**: o `divergentImpacts` chama `kokusen.land(energy, stats.divergent.kokusenGain, stats.divergent.zoneMs)`;
`kokusen.smoke.mjs` troca só os números de ganho e Zona onde lê (o arquivo tem 361 linhas: sem cenário novo).
**Where**: `src/game/tech/divergentImpacts.ts`
**Depends on**: T43, T41 (fase 7)
**Reuses**: `land` (T41)
**Requirement**: DVG-03

**Done when**:

- [ ] `tech-axes.smoke.mjs`: `tech=divergente&axes=divergente.energia:3,divergente.zona:2` com Kokusen forçado: energia
      +54 e Zona 12000 ms no snapshot
- [ ] `kokusen.smoke.mjs` verde com 30/8000 na base
- [ ] Smokes `tech-axes` e `kokusen` verdes; gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(divergent): grant kokusen energy and zone time by axis`

---

#### T46: Eco

**What**: com o Eco, no 2º impacto de cada alvo, os outros comuns a até 48 px do centro dele (`echoTargets`) levam um
acerto `micro` com o dano do 2º impacto, cada um uma vez por conjuração, nunca quem leva o próprio 2º impacto;
`DivergentFx.echoRing(x, y, radiusPx)` com o `echoPx` do stat, só com cores da `PALETTE`.
**Where**: `src/game/tech/divergentImpacts.ts`
**Depends on**: T44
**Reuses**: `echoTargets` (T39), `DivergentFx`
**Requirement**: DVG-05, DVG-09, EIX-11

**Done when**:

- [ ] `tech-axes.smoke.mjs`: `tech=divergente&ramo=divergente:a` com um comum encostado no alvo: número `micro` igual ao
      2º impacto; `build.divergente.branch` `eco`; o anel no debug da vista com raio 48
- [ ] Conferido no jogo em HD, para os dois lados
- [ ] Smokes `tech-axes`, `kokusen` e `fxlab` verdes; gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(divergent): echo the second impact to nearby enemies`

---

#### T47: Concentrado

**What**: com o Concentrado, o 1º impacto registra 1 alvo e o 2º impacto dá 2 × o dano resolvido; a carta e o painel não
oferecem `alvos` (o `offerable` da T2 já esconde; aqui se prova no jogo).
**Where**: `src/game/tech/divergentImpacts.ts`
**Depends on**: T44
**Reuses**: `secondMul` do resolvedor
**Requirement**: DVG-06, DVG-09

**Done when**:

- [ ] `tech-axes.smoke.mjs`: `tech=divergente&axes=divergente.alvos:3&ramo=divergente:b&maxAlive=3` com 3 comuns: 1
      número de 2º impacto, com `2 × 18`; `shop-axes` ou `tech-axes` com `fragments=200&round=4`: nenhuma carta do
      Divergente com `alvos` nos `axes`
- [ ] Smokes `tech-axes` e `shop-axes` verdes; gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(divergent): double a single second impact with the focused branch`

---

#### T48: Eco Negro

**What**: com o Eco Negro, quando o Kokusen acerta o principal, cada comum atingido pelo anel do Eco leva o dano do
Kokusen no lugar do dano do anel mais 3% do HP máximo; energia e Zona saem uma vez por conjuração; o comum no anel e no
Kokusen leva só o Kokusen.
**Where**: `src/game/tech/divergentImpacts.ts`
**Depends on**: T46, T45
**Reuses**: `echoKokusenPct` do resolvedor, `kokusenDamage`
**Requirement**: DVG-07, EIX-03, EIX-05

**Done when**:

- [ ] `tech-axes.smoke.mjs`: `tech=divergente&axes=divergente.segundo:2,divergente.energia:2&ramo=divergente:a` com
      Kokusen forçado e um comum no anel: número do tipo Kokusen com `+ round(0,03 × maxHp)`; energia somada uma vez;
      `awakened: true`, banner e câmera lenta na 1ª conjuração da rodada
- [ ] Smokes `tech-axes` e `kokusen` verdes; gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(divergent): spread the kokusen through the echo ring`

---

#### T49: Impacto Único

**What**: com o Impacto Único, o 2º impacto soma 4% do HP máximo do alvo (1% no chefe).
**Where**: `src/game/tech/divergentImpacts.ts`
**Depends on**: T47
**Reuses**: `secondPct` do resolvedor
**Requirement**: DVG-08, EIX-03, EIX-05

**Done when**:

- [ ] `tech-axes.smoke.mjs`: `tech=divergente&axes=divergente.segundo:2,divergente.zona:2&ramo=divergente:b`: número
      do 2º impacto `2 × 30 + round(0,04 × maxHp)`; `awakened: true`, banner e câmera lenta
- [ ] Smokes `tech-axes` e `kokusen` verdes; gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(divergent): add a max HP share to the single impact`

---

#### T50: Curva de build do Divergente

**What**: caso do Divergente como técnica focada no `buildCurve`: Nv 2 até a loja da r3 e Nv 5 até a loja da r10.
**Where**: `tests/core/buildCurve.test.ts`
**Depends on**: T43
**Reuses**: caso do Azul (T25)
**Requirement**: EIX-12

**Done when**:

- [ ] Caso verde; se não fechar, parar e levar ao usuário
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `test(core): prove the focused divergent build curve`

---

### Phase 9: Passo 4 — União e Roxo, regra pura

#### T51: União pelo nível mínimo de cada peça

**What**: `Recipe.from: readonly [RecipePiece, RecipePiece]` com `RecipePiece = { id, minLevel }`; o Roxo fica
`[{ id: 'azul', minLevel: 1 }, { id: 'vermelho', minLevel: 4 }]`; `recipeReady` lê o `minLevel` de cada peça;
`EVOLUTION_LEVEL` sai; `evolve` usa `from[0].id` para o slot; `shopEligibility.ts` passa a `from.some((p) => p.id ===
...)`; `evolution.smoke.mjs` troca a ponte da T17 pela forma final `tech=azul,vermelho&axes=vermelho.potencia:3`.
**Where**: `src/core/evolution.ts`
**Depends on**: T17 (fase 4)
**Reuses**: `evolve` de hoje, `Loadout.clear` → `axes.resetItem` (T3)
**Requirement**: RXO-01, RXO-02

**Done when**:

- [ ] `tests/core/evolution.test.ts`: Vermelho Nv 3 com Azul Nv 1 não está pronto e Nv 4 está; Azul em qualquer nível;
      `evolve` deixa o Roxo no Nv 1 com 0 ponto no slot do Azul, o outro slot vazio e os pontos, o ramo e o Despertar
      do Vermelho zerados; receita não pronta não muda nada; `tests/core/evolutionShop.test.ts`: carta 0 é a União com o
      Vermelho no Nv 4
- [ ] `grep -rn "EVOLUTION_LEVEL" src` vazio
- [ ] Smokes `evolution`, `shop` e `shop-axes` verdes; gate verde; contagem sem perda

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(core): fuse the purple from red level four and any blue`

---

#### T52: Tabela do Roxo

**What**: `PURPLE_AXES` (`radius [36,44,51,58]`, `rangePx [288,300,310,320]`, `signMs [300,240,195,150]`, `chargeMs
[400,320,260,200]`, `hit [60,70,80,90]`, `cost [70,60,51,42]`, `cooldownMs [6000,5000,4200,3500]`), `PURPLE_BRANCHES`
(`massa { holdMs 1000, radiusMul 1.6 }`, `retorno { backMul 0.5, maxTouches 2 }`) e `PURPLE_AWAKENINGS` (`roxo200 {
pct enemy 0.05 }`, `eclipse { pct }`), com nomes e textos; ainda fora do registro.
**Where**: `src/data/techAxesTechniques.ts`
**Depends on**: T37 (fase 7)
**Reuses**: molde do `DIVERGENT_*`
**Requirement**: RXO-04, EIX-09, EIX-10

**Done when**:

- [ ] `tests/data/techAxesTechniques.test.ts`: RXO-04 linha a linha; EIX-09 do Roxo (`potência × alvos(2 × largura) ×
      alcance / 288`; Largura 58 dá 1,33×); EIX-10 completo: os 12 ramos e os 12 Despertares (Vermelho, Corpo e as
      quatro) com nome e texto únicos
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(data): add the purple axis table`

---

#### T53: Resolvedor do Roxo

**What**: `resolvePurple` preenche o bloco `purple` (`speed` 180, `rangePx`, `radius`, `spawnAhead` 40, `lift`,
`force`, `massa`, `fullHoldPct`, `back`, `through`, `secondTouchPct`), o dano `hit`, sinal e carga do eixo, `branch`,
`awakened` e `killRefund`.
**Where**: `src/core/techResolvers.ts`
**Depends on**: T52
**Reuses**: `TECH_GEOMETRY.roxo`
**Requirement**: RXO-04, EIX-02, EIX-04

**Done when**:

- [ ] `tests/core/techStatsTechniques.test.ts`: cada eixo de 0 a 3 com multiplicadores 1 e 1,35; piso de 60% (42 com o
      voto Fluxo selado); `killRefund` 0,3 só com Recarga 3
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): resolve the purple stats from its axes`

---

#### T54: Esfera pelo alcance

**What**: `PURPLE.rangePx 288` (a vida sai do alcance); o teste círculo-caixa de `PurpleSphere.update`
(`purple.ts:62-71`) vira função exportada.
**Where**: `src/core/purple.ts`
**Depends on**: T53
**Reuses**: `PurpleSphere` de hoje
**Requirement**: RXO-05

**Done when**:

- [ ] `tests/core/purple.test.ts` e `tests/data/purple.test.ts` (só a construção): o voo da base termina a 288 px do
      nascimento, igual ao de hoje (180 px/s × 1600 ms); a função círculo-caixa com caixa tocando e a 1 px
- [ ] Gate verde; contagem sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `refactor(core): end the purple flight by range`

---

#### T55: Voo do Roxo com os ramos

**What**: `src/core/purpleBranch.ts` com `class PurpleFlight` (fases `hold`, `out`, `back`, `through`; `update(dtMs,
held, playerCenter, targets)` → `{ touches, ended, radius, x, y }`): `out` termina no alcance resolvido, nunca além de
320 px; `hold` cresce o raio em linha reta até 1,6 × em 1000 ms e sai ao soltar ou aos 1000 ms, `fullHold` só aos 1000;
`back` mira o centro atual do player a cada quadro e some ao tocá-lo ou depois de mais um alcance; `through` atravessa o
player e segue o alcance do outro lado; no máximo 2 toques por alvo, o 2º só na volta.
**Where**: `src/core/purpleBranch.ts`
**Depends on**: T54
**Reuses**: função círculo-caixa (T54), `Mover`
**Requirement**: RXO-05, RXO-06, RXO-07, RXO-08, RXO-09

**Done when**:

- [ ] `tests/core/purpleBranch.test.ts`: fim no alcance e nunca além de 320; raio 1,6× aos 1000 ms e `fullHold` falso
      aos 999; tecla solta antes do nascimento voa direto; volta ao centro atual com o player andando (edge case); 2º
      toque só na volta e nunca 3º; `through` passa do player e segue o alcance
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the purple flight with hold, return and pass-through`

---

### Phase 10: Passo 4 — Roxo no jogo

#### T56: Adaptador do Roxo pelo `PurpleFlight`

**What**: `game/tech/purple.ts` troca o uso direto do `PurpleSphere` pelo `PurpleFlight` com o stat; o `TechRunner`
repassa o `slotHeld` ao `purple.update`; `PurpleOrbFx.flight(x, y, ageMs, radius)` com o raio por quadro e `debug():
{ radius }` lido em `techObjects`. Com o Roxo ainda fora do registro, o voo é o de hoje.
**Where**: `src/game/tech/purple.ts`
**Depends on**: T55 (fase 9)
**Reuses**: `PurpleOrbFx`, `TechCaster.slotHeld`
**Requirement**: RXO-05, EIX-11

**Done when**:

- [ ] `tech-axes.smoke.mjs` (ou `tech-axes-purple.smoke.mjs` se o primeiro passar de 380 linhas): `tech=roxo`: a esfera
      some a 288 px do nascimento; `techObjects` purple `radius` 36 (lido da vista, L-043)
- [ ] `grep -n "\b36\b" src/game/techFx/PurpleOrb.ts` sem cópia do raio resolvido (EIX-11)
- [ ] Smokes `evolution`, `tech` e `red-anime` verdes e iguais; gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(purple): fly the sphere through the purple flight`

---

#### T57: Roxo entra no registro e na loja como carta de nível

**What**: o Roxo entra no `AXIS_ITEMS` e no `RESOLVERS`; `data/shop.ts` ganha a entrada `roxo` (`kind 'technique'`,
`maxLevel 6`) que `shopEligibility.ts` recusa como técnica nova; com o Roxo equipado abaixo do Nv 6 a carta de melhoria
é a de 2 eixos; `build.roxo` (`PurpleBuildSnapshot`); o nível do `tech=roxo:N` passa a ser ignorado.
**Where**: `src/data/techAxes.ts`
**Depends on**: T56, T51 (fase 9)
**Reuses**: registro, snapshot genérico, `techniqueEligible`
**Requirement**: RXO-03, EIX-01, EIX-06, EIX-07, EIX-08

**Done when**:

- [ ] `tests/core/shopAxes.test.ts` e `tests/data/shop.test.ts`: Roxo nunca como técnica nova; com o Roxo equipado, carta
      de 2 eixos `Nv 2/6`
- [ ] `tech-axes.smoke.mjs`: `tech=roxo&axes=roxo.largura:3,roxo.alcance:3`: `build.roxo.stats` raio 58 e alcance 320;
      `techObjects` purple `radius` 58; a esfera some a 320 px
- [ ] Smokes `tech-axes`, `evolution`, `shop`, `shop-axes` e `shop-progress` verdes; gate verde; contagem sem perda

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(purple): grow the purple by axis points after the union`

---

#### T58: Massa

**What**: com a Massa, se a tecla do slot ainda estiver segurada quando a esfera nasce, ela fica parada e o raio cresce
até 1,6 × em 1000 ms tocando o que alcança; sai em voo ao soltar ou aos 1000 ms, com o alcance contado da saída.
**Where**: `src/game/tech/purple.ts`
**Depends on**: T57
**Reuses**: fase `hold` do `PurpleFlight`
**Requirement**: RXO-06, RXO-10

**Done when**:

- [ ] `tech-axes.smoke.mjs`: `tech=roxo&ramo=roxo:a` segurando a tecla: `techObjects` purple `radius` cresce até `1,6 × 36` (57,6)
      e a esfera fica parada; solta antes do nascimento voa direto; `build.roxo.branch` `massa`
- [ ] Player atingido segurando a Massa: segue até soltar ou os 1000 ms (edge case)
- [ ] Conferido no jogo em HD, para os dois lados: a esfera crescendo sem pular
- [ ] Smokes `tech-axes` e `tech` verdes; gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(purple): grow the sphere in place with the mass branch`

---

#### T59: Roxo 200%

**What**: com o Roxo 200%, a esfera que sai depois de 1000 ms segurada prende os comuns que toca (`setPull` na direção
do centro dela a cada quadro; chefe nunca) até o fim do voo, e no fim cada um leva um acerto de dano 0 com `knockdown`;
cada alvo tocado leva 5% do HP máximo (1% no chefe).
**Where**: `src/game/tech/purple.ts`
**Depends on**: T58
**Reuses**: `EnemyBrain.receiveHit` com `knockdown` e dano 0 (`enemyBrain.ts:72-91`)
**Requirement**: RXO-07, EIX-03, EIX-05

**Done when**:

- [ ] `tech-axes.smoke.mjs`: `tech=roxo&axes=roxo.largura:2,roxo.potencia:2&ramo=roxo:a` segurando 1000 ms: os comuns
      tocados andam com a esfera e terminam em `ragdollStun` no fim do voo (na parede, no ponto onde estão; edge case);
      número com `+ round(0,05 × maxHp)`; o chefe não é arrastado; `awakened: true`, banner e câmera lenta
- [ ] Smokes `tech-axes` e `boss` verdes; gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(purple): drag the touched enemies with the full mass awakening`

---

#### T60: Retorno

**What**: com o Retorno, no fim do alcance a esfera volta na mesma velocidade para o centro atual do player e some ao
tocá-lo ou depois de mais um alcance; na volta cada alvo pode ser tocado de novo (no máximo 2 toques), com 50% do dano.
**Where**: `src/game/tech/purple.ts`
**Depends on**: T57
**Reuses**: fase `back` do `PurpleFlight`
**Requirement**: RXO-08, RXO-10

**Done when**:

- [ ] `tech-axes.smoke.mjs`: `tech=roxo&ramo=roxo:b`: a esfera volta e o mesmo comum leva dois números, o 2º com metade;
      com o player andando a esfera vira para ele; `build.roxo.branch` `retorno`
- [ ] Conferido no jogo em HD, para os dois lados
- [ ] Smokes `tech-axes` e `tech` verdes; gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(purple): bring the sphere back with the return branch`

---

#### T61: Eclipse

**What**: com o Eclipse, a esfera que volta atravessa o player e segue até o alcance resolvido do outro lado; o alvo
tocado na ida e na volta leva 4% do HP máximo no 2º toque (1% no chefe).
**Where**: `src/game/tech/purple.ts`
**Depends on**: T60
**Reuses**: fase `through` do `PurpleFlight`
**Requirement**: RXO-09, EIX-03, EIX-05

**Done when**:

- [ ] `tech-axes.smoke.mjs`: `tech=roxo&axes=roxo.alcance:2,roxo.carga:2&ramo=roxo:b` com um comum atrás do player: a
      esfera passa do player e o acerta; o comum tocado nos dois sentidos leva no 2º toque `round(0,5 × hit) +
      round(0,04 × maxHp)`; `awakened: true`, banner e câmera lenta
- [ ] Conferido no jogo em HD, para os dois lados: a esfera atravessa sem sumir
- [ ] Smokes `tech-axes` e `tech` verdes; gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(purple): pass the returning sphere through the player with the eclipse`

---

### Phase 11: Passo 4 — fim do modelo antigo

#### T62: Sai a regra antiga dos stats

**What**: sai o fallback de `resolveTechStats` (`LEVEL_FACTOR` e −5 de custo por nível) e o `LEVEL_FACTOR` de
`data/techniques.ts:94-95`; os testes do bloco `LEVEL_FACTOR` (`tests/data/techniques.test.ts`) e do fallback
(`tests/core/techStats.test.ts`) saem, ditos no commit.
**Where**: `src/core/techStats.ts`
**Depends on**: T31 (fase 6), T43 (fase 8), T57 (fase 10)
**Reuses**: —
**Requirement**: EIX-01, EIX-02

**Done when**:

- [ ] `grep -rn "LEVEL_FACTOR" src` vazio
- [ ] Smokes `tech`, `techniques`, `red-anime` e `evolution` verdes; gate verde; contagem = anterior − os casos
      removidos (listados)

**Tests**: unit + smoke
**Gate**: full
**Commit**: `refactor(core): drop the old technique level factor`

---

#### T63: Sai o preço de nível e a carta antiga

**What**: saem `techLevelGate` e o preço de nível (`core/shopPricing.ts`, `data/shop.ts`), o `techGate` de
`data/shop.ts:110`, `techniquePreview` e `factorText` (`core/shopPreview.ts`, CRD-10); os casos de nível das quatro
técnicas saem de `tests/core/techShop.test.ts` e `tests/data/shop.test.ts` (ditos no commit).
**Where**: `src/core/shopPricing.ts`
**Depends on**: T62
**Reuses**: —
**Requirement**: EIX-01, EIX-06

**Done when**:

- [ ] `grep -rnE "LEVEL_FACTOR|EVOLUTION_LEVEL|techGate|techLevelGate" src` vazio (EIX-01.3)
- [ ] Smokes `shop`, `shop-axes`, `shop-progress`, `run-loop` e `evolution` verdes; gate verde; contagem = anterior − os
      casos removidos (listados)

**Tests**: unit + smoke
**Gate**: full
**Commit**: `refactor(shop): drop the technique level price and card`

---

#### T64: Curva da União

**What**: no `buildCurve`, a build focada no Vermelho com o Azul comprado, com os preços, a trava e a inflação da F30
sobre `expectedIncome`, tem a União pronta e a carta de 60 inflada (`round(60 × 1,42)` = 85) ao alcance até a loja da
r8.
**Where**: `tests/core/buildCurve.test.ts`
**Depends on**: T63
**Reuses**: casos das T25, T36, T50
**Requirement**: RXO-11

**Done when**:

- [ ] Caso verde; se não fechar, parar e levar ao usuário
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `test(core): prove the purple union is reachable by round eight`

---

#### T65: Decisões AD-026 e AD-027

**What**: `.specs/STATE.md` ganha a AD-026 (substitui a AD-005: técnica sobe do Nv 1 ao Nv 6 por pontos em 6 eixos, ramo
no Nv 2, Despertar no Nv 5, trava por rodada) e a AD-027 (substitui a AD-024: receita com `minLevel`; Roxo pede Vermelho
Nv 4 e Azul em qualquer nível, sai do baú do chefe grátis ou da loja por 60); AD-005 e AD-024 passam a `superseded by`.
**Where**: `.specs/STATE.md`
**Depends on**: T63
**Reuses**: texto da seção "Tech Decisions" do design
**Requirement**: EIX-01, RXO-01

**Done when**:

- [ ] AD-026 e AD-027 no log; AD-005 e AD-024 marcadas
- [ ] Gate verde

**Tests**: none
**Gate**: build
**Commit**: `docs(state): record the axis growth and union level decisions`

---

### Phase 12: Passo 5 — painel completo, regra pura

#### T66: `choiceRng`

**What**: `SHOP.choiceSalt` (proposta `0x71374491`, conferida com `grep` contra os outros sais em `src/`) e o stream
`choiceRng` em `core/run.ts` (campo, getter, `new Rng(seed ^ SHOP.choiceSalt)`), sem ramo novo no `Run.resolveStart`.
**Where**: `src/core/run.ts`
**Depends on**: None
**Reuses**: streams com sal de `run.ts:298-307`
**Requirement**: CHC-09

**Done when**:

- [ ] `tests/core/choice.test.ts`: mesma seed dá a mesma sequência; sal diferente de todos os outros (`axisSalt`,
      `chestRng` da F31); o `run.test.ts` (exceção de tamanho) não cresce
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the seeded choice stream`

---

#### T67: Opções das páginas

**What**: `src/core/choicePages.ts` com `pointOptions(item, axes, rng, max = 3)` (eixo-foco primeiro, os outros
`offerable` sorteados), `openPointOptions(owned, focusItem, axes, rng)` (eixo-foco do item-foco e 2 pares distintos) e
`buildPage(req, ctx)` (textos pela linha de eixo do `axisPreview`, nome do ramo e linha do Despertar, nome e efeito do
Despertar, nomes das opções do baú; `null` quando a página deve ser pulada).
**Where**: `src/core/choicePages.ts`
**Depends on**: T66
**Reuses**: `axisPreview`, `focusAxis`, `offerable`
**Requirement**: CHC-05, CHC-06, CHC-07, CHC-08, CHC-09

**Done when**:

- [ ] `tests/core/choicePages.test.ts`: até 3 eixos, foco primeiro, nunca `alvos` no Concentrado; menos de 3 eixos
      abaixo do teto dão menos opções; 3 pares distintos com o foco primeiro; página `despertar` com nome e texto; `null`
      para item fora do slot, item com 5 pontos (marco ainda conta, edge case), ramo que já não está pendente (União
      zerou o Vermelho, edge case) e `livre` sem item com eixo abaixo do teto; mesma seed e mesmas escolhas = mesmas
      opções
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): build choice page options from the choice stream`

---

#### T68: Ordem das páginas do CHC-02

**What**: `choiceRank` passa à ordem do CHC-02: ramo (slot 0 = 0, slot 1 = 1, Corpo = 2), `ponto` 10 na ordem de
chegada, `veu` 20, `bau` 30; a página criada ao confirmar outra entra logo depois dela.
**Where**: `src/core/choice.ts`
**Depends on**: T10 (fase 2)
**Reuses**: `ChoiceQueue` (T10)
**Requirement**: CHC-02, CHC-03

**Done when**:

- [ ] `tests/core/choice.test.ts`: ordem ramos → pontos (na ordem em que saíram) → véu → baú; ramo do slot 1 antes do
      Corpo; página inserida logo depois da atual mesmo com rank maior
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): order choice pages branches first, chests last`

---

### Phase 13: Passo 5 — painel e maestria no jogo

#### T69: Snapshot do painel no formato do CHC-10

**What**: `ChoicePanel.debug()` e `ChoiceSnapshot` (`game/axisSnapshot.ts`) passam a `{ open, page: { kind, item,
options: ids, selected } | null, pending }`; `choiceDirector.snapshot()` soma o `pending`; literal do
`tests/game/debugApi.test.ts`; `shop-axes` e `domain` passam a ler as opções por id.
**Where**: `src/game/ChoicePanel.ts`
**Depends on**: T11 (fase 2)
**Reuses**: `debug()` da F31
**Requirement**: CHC-10

**Done when**:

- [ ] `tests/game/choicePanel.test.ts`: `debug()` com `kind`, `item`, ids e `selected`
- [ ] Smokes `shop-axes`, `domain` e `vows` verdes; gate verde; contagem sem perda

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(ui): report the choice page by kind and option ids`

---

#### T70: Diretor na ordem do CHC-02

**What**: `choiceDirector.openIfPending()` usa o `choiceRank` novo: ramos antes do Véu da F31; o `domain.smoke.mjs`
passa a esperar o ramo antes do Véu onde os dois coincidem.
**Where**: `src/scenes/test/choiceDirector.ts`
**Depends on**: T69, T68 (fase 12)
**Reuses**: `choiceRank` (T68)
**Requirement**: CHC-02

**Done when**:

- [ ] `domain.smoke.mjs`: com ramo pendente e Véu na mesma konbini, a 1ª página é `ramo`; em rodada de chefe o
      `VowPanel` vem antes de todas; a loja não lê tecla até a última página
- [ ] Smokes `domain`, `shop-axes`, `vows` e `run-loop` verdes; gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(shop): show branch pages before the domain pages`

---

#### T71: Aviso de acerto com técnica e abate

**What**: `TechRunner` passa a chamar `onCastHit(hit: CastHit)` (`{ slot, castId, tech, targetId, isBoss, killed }`);
a `TestScene` troca só o texto da lambda da l.329 para `(hit) => this.runDirector.onMasteryHit(hit),` (comentário da
l.328 cita MAE-01); `runDirector.onMasteryHit(hit)` repassa à maestria de hoje sem mudar a regra.
**Where**: `src/game/TechRunner.ts`
**Depends on**: T7 (fase 2)
**Reuses**: `castHit` (T7)
**Requirement**: MAE-01

**Done when**:

- [ ] `git diff --stat src/scenes/TestScene.ts`: 0 linha efetiva líquida
- [ ] Smokes `shop-progress` (maestria de hoje), `tech` e `run-loop` verdes e iguais
- [ ] Gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(tech): report cast hits with the technique and the kill`

---

#### T72: Maestria por marco

**What**: `MASTERY = { marks: [25, 60], castPoints: 1, bossPoints: 3, killPoints: 1 }`; `core/mastery.ts` reescrito
(`registerHit(slot, tech, castId, targetId, { isBoss, killed })` → `{ mark }`, marcos por `TechId` num `Map` que só o
`reset()` limpa, `threshold(slot)`, `resetSlot(slot)`); `masteryBarWidth(slotW, points, marks)`; `runDirector.onMasteryHit`
mostra `"{nome}: maestria {m}!"` por `RUN.bannerMs` no marco e nunca chama `Loadout.upgrade`; `EnergyHud.ts:181` e
`snapshot.ts:221` trocam só a expressão; `shop-progress.smoke.mjs` reescrito no trecho da maestria.
**Where**: `src/core/mastery.ts`
**Depends on**: T71
**Reuses**: `mastery.ts` de hoje, `Hud.banner`
**Requirement**: MAE-01, MAE-02, MAE-03, MAE-04, MAE-05, MAE-06, MAE-07

**Done when**:

- [ ] `tests/core/mastery.test.ts`: +1 no 1º acerto da conjuração e nada no 2º alvo da mesma; +3 uma vez no chefe (5
      toques do Azul no chefe dão 4); +1 por abate, inclusive de tique; marco no 24→25 e no 59→60 e nada no 23→24 e no
      58→59; terceiro marco nunca sai; `resetSlot` zera os pontos e o marco dado ao `TechId` não volta; `threshold` 25,
      60 e `null`; nenhum retorno de nível
- [ ] `tests/core/masteryBar.test.ts`: `round(48 × p / 25)` antes do 25, `round(48 × (p − 25) / 35)` entre 25 e 60,
      `null` a partir do 60
- [ ] `shop-progress.smoke.mjs`: `tech=vermelho&mastery=24&noshop=1`: um acerto dá 25, banner `maestria 25!`, nível
      continua 1, barra pelo marco; `tech.slots[i].mastery` = `{ points, threshold }`
- [ ] Smokes `shop-progress`, `hud`, `tech` e `run-loop` verdes; gate verde; contagem sem perda

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(mastery): grant marks at 25 and 60 instead of levels`

---

#### T73: Página do ponto grátis

**What**: `choiceDirector.addFreePoint(tech)` enfileira `ponto`; o `runDirector` chama no marco; `openIfPending` monta
cada página pelo `buildPage` com o `choiceRng` e pula as `null`; `axisDirector.applyFree(item, axis)` põe o ponto sem
custo e sem trava; confirmar devolve `ramo` (Nv 2) ou `despertar` (Nv 5 com ramo), inseridos logo depois; `livre` é
despachado igual (fonte só na T77); nasce `scripts/smoke/choice-panel.smoke.mjs`.
**Where**: `src/scenes/test/choiceDirector.ts`
**Depends on**: T70, T72, T67 (fase 12)
**Reuses**: `buildPage`, `pointOptions`, `axisDirector.applyAxis` (F30)
**Requirement**: CHC-03, CHC-05, CHC-08, CHC-09, MAE-02

**Done when**:

- [ ] `choice-panel.smoke.mjs` (`?debug&hd=1&area=modular&seed=1`): `tech=vermelho&mastery=24&noshop=1`: um acerto dá 25
      e o banner `maestria 25!`, nível 1; `tech=vermelho&mastery=24&noshop=0`: depois de um acerto e do fim da rodada, a
      konbini abre `ponto` com 3 eixos, o 1º o eixo-foco; `Enter` põe o ponto sem gastar fragmento; o ponto que leva ao
      Nv 2 abre o `ramo` logo depois no mesmo painel (edge case); a loja não lê tecla com o painel aberto
- [ ] Mesma seed e mesmas escolhas dão as mesmas páginas; reroll na loja não muda o `choiceRng` (edge case)
- [ ] Smokes `choice-panel`, `shop-axes`, `shop-progress` e `run-loop` verdes; gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(shop): spend mastery marks on a free axis point page`

---

#### T74: Página do Despertar

**What**: a página `despertar` (nome e texto do Despertar, uma carta, `Enter` fecha) aparece quando um Despertar liga por
página do mesmo painel (ramo escolhido com o item já no Nv 5, ou ponto grátis/livre que leva ao Nv 5 com ramo).
**Where**: `src/scenes/test/choiceDirector.ts`
**Depends on**: T73
**Reuses**: `buildPage` (`despertar`)
**Requirement**: CHC-07

**Done when**:

- [ ] `choice-panel.smoke.mjs`: `tech=vermelho&axes=vermelho.potencia:3&ramo=vermelho:b&mastery=24&noshop=0`: o ponto que
      leva ao Nv 5 abre `despertar` logo depois; `Enter` fecha; Nv 5 com o ramo pendente: `ramo` e depois `despertar`
      (edge case); compra na loja que liga o Despertar não abre página
- [ ] Smokes `choice-panel` e `shop-axes` verdes; gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(shop): announce an awakening turned on in the panel`

---

### Phase 14: Passo 6 — baú do chefe

#### T75: Regra do baú do chefe

**What**: `src/core/bossChest.ts` com `ChestOption` (`uniao`, `pontos`, `dominio`), `chestOptionId` (`uniao:roxo`,
`pontos`, `dominio`), `chestCandidates({ readyUnions, hasOpenAxis, domainLevel })` e `drawChest(candidates, rng)`
(até 3, todos numa ordem sorteada; mais de 3, 3 distintos) com o `chestRng` da F31.
**Where**: `src/core/bossChest.ts`
**Depends on**: None
**Reuses**: `chestRng` (F31)
**Requirement**: BAU-01, BAU-02, BAU-07

**Done when**:

- [ ] `tests/core/bossChest.test.ts`: 0 candidatos dão lista vazia; 1 e 3 voltam todos; 4 (lista sintética) dão 3
      distintos; mesma seed dá o mesmo baú; Domínio no Nv 3 não é candidato; sem eixo aberto, sem `pontos`
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): draw the boss chest options`

---

#### T76: União num lugar só

**What**: `axisDirector.applyUnion(into)` recebe o que o `applyEvolution` do `shopDirector.ts:64-71` faz (`evolve`,
`mastery.resetSlot` nos dois slots, evento `evolve:<id>`); a loja passa a chamar por ele.
**Where**: `src/scenes/test/axisDirector.ts`
**Depends on**: None
**Reuses**: `applyEvolution` de hoje
**Requirement**: BAU-04

**Done when**:

- [ ] Smokes `evolution`, `shop` e `shop-axes` verdes e iguais
- [ ] Gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(shop): apply unions from the axis director`

---

#### T77: Página do baú

**What**: `choiceDirector.queueBossChest()` (só enfileira com candidato), página `bau` com as opções do `drawChest`
montadas ao mostrar; confirmar: `uniao` → `axes.applyUnion` sem gastar fragmento, `pontos` → 2 páginas `livre` logo
depois (`openPointOptions`), `dominio` → `domain.state.raise()`; `chest=1` deixa o baú pendente para a 1ª konbini
(`applyDebug`); evento `choice:bau:<id>`; nasce `scripts/smoke/boss-chest.smoke.mjs`.
**Where**: `src/scenes/test/choiceDirector.ts`
**Depends on**: T75, T76, T73 (fase 13)
**Reuses**: `drawChest`, `openPointOptions`, `DomainState.raise()` (F31)
**Requirement**: BAU-04, BAU-05, BAU-06, BAU-08, CHC-03, CHC-06

**Done when**:

- [ ] `boss-chest.smoke.mjs` (`?debug&hd=1&area=modular&tech=azul,vermelho&axes=vermelho.potencia:3&chest=1`): a 1ª
      konbini abre `bau` com `uniao:roxo` e `pontos`; a União deixa o Roxo no slot e os fragmentos iguais; com `pontos`,
      duas páginas `livre` logo depois, cada uma com 3 pares distintos e o foco primeiro; com um Domínio da F31 abaixo do
      Nv 3, a opção `dominio` sobe o nível em 1
- [ ] Ponto da maestria do Vermelho gasto antes da União do baú no mesmo painel: a União zera os pontos (edge case); o
      ramo pendente do Vermelho é pulado depois da União (edge case)
- [ ] Smokes `boss-chest`, `choice-panel`, `domain` e `evolution` verdes; gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(shop): open the boss chest page with union, points or domain`

---

#### T78: Vitória enfileira o baú e o prêmio cego sai

**What**: `spawner.onBossDefeated` (`spawner.ts:165-169`) chama `this.s.build.choice.queueBossChest()` e o
`clearedBanner` perde o `upgradeText`; saem `core/bossReward.ts` (com o `bossPrizePlan` da F31),
`tests/core/bossReward.test.ts`, `runDirector.bossRewardUpgrade`, `bossRewardTarget` e `BOSS_UPGRADE_BANNER_MS`, a página
`bauChefe` da F31 (`domainDirector.bossPrize`, `confirm('bauChefe')`, `choicePages` só com o `veu`, `bauChefe` em
`core/choice.ts`) e `Loadout.upgrade` (os testes que o usavam passam a `axes.add`); `boss-punish.smoke.mjs:233-262` e o
cenário `bauChefe` do `domain.smoke.mjs` reescritos.
**Where**: `src/scenes/test/spawner.ts`
**Depends on**: T77
**Reuses**: `queueBossChest` (T77)
**Requirement**: BAU-03, BAU-07

**Done when**:

- [ ] `grep -rnE "bossRewardSlot|bossRewardUpgrade|bossRewardTarget|bossPrizePlan|bauChefe|\.upgrade\(" src` vazio
- [ ] `boss-punish.smoke.mjs`: a vitória não sobe o Vermelho nem mostra texto de prêmio; `choice.pending ≥ 1` antes da
      konbini; `domain.smoke.mjs`: o baú do chefe vira a página `bau` com `dominio`; sem candidato, nenhuma página
- [ ] Run que acaba com baú pendente: nada pendente na run nova (edge case)
- [ ] Smokes `boss-chest`, `boss-punish`, `boss-victory`, `world-boss`, `domain` e `boss` verdes; gate verde; contagem =
      anterior − os casos do `bossReward.test.ts` (provas movidas ao `bossChest.test.ts` e ao smoke)

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(boss): leave a chest instead of the blind upgrade`

---

#### T79: README com os parâmetros novos

**What**: `README.md`: `axes=`/`ramo=` aceitam `azul`, `corte`, `divergente` e `roxo` com os ids de eixo e o `:a`/`:b`
de cada ramo; nível do `tech=<id>:N` ignorado para toda técnica com eixo; `chest=1`; `mastery=N` dá pontos de maestria;
onde ajustar as tabelas (`data/techAxesTechniques.ts`) e o `MASTERY`.
**Where**: `README.md`
**Depends on**: T78
**Reuses**: seção de parâmetros de debug do README
**Requirement**: EIX-07, BAU-08

**Done when**:

- [ ] README com os parâmetros e os arquivos de ajuste
- [ ] Fim da F33: os smokes do fim no design ("Smokes por passo") verdes; `TestScene.ts` sem linha efetiva líquida a
      mais que no fim da F31
- [ ] Gate verde

**Tests**: none
**Gate**: build
**Commit**: `docs(readme): document the technique axis and chest debug params`

---

## Requirement Coverage

| Requirement | Tasks |
| --- | --- |
| EIX-01 | T1, T2, T3, T17, T31, T43, T57, T62, T63, T65 |
| EIX-02 | T4, T13, T27, T38, T53, T62 |
| EIX-03 | T2, T7, T8, T23, T24, T34, T35, T48, T49, T59, T61 |
| EIX-04 | T7, T13, T19, T27, T38, T53 |
| EIX-05 | T23, T24, T33, T34, T48, T49, T59, T61 |
| EIX-06 | T5, T17, T31, T43, T57, T63 |
| EIX-07 | T6, T17, T18, T31, T43, T57, T79 |
| EIX-08 | T18, T31, T43, T57 |
| EIX-09 | T12, T26, T37, T52 |
| EIX-10 | T12, T26, T37, T52 |
| EIX-11 | T18, T30, T46, T56 |
| EIX-12 | T25, T36, T50 |
| AZL-01 | T13, T15, T17 |
| AZL-02 | T12, T13 |
| AZL-03 | T18 |
| AZL-04 | T13, T15, T20 |
| AZL-05 | T14, T15, T21 |
| AZL-06 | T14, T22 |
| AZL-07 | T15, T24 |
| AZL-08 | T14, T16, T23 |
| AZL-09 | T21, T22 |
| DSM-01 | T26, T27, T31 |
| DSM-02 | T28, T29, T30 |
| DSM-03 | T30 |
| DSM-04 | T28, T29, T32 |
| DSM-05 | T33 |
| DSM-06 | T34 |
| DSM-07 | T28, T35 |
| DSM-08 | T32, T33 |
| DVG-01 | T37, T38 |
| DVG-02 | T39, T40, T42, T44 |
| DVG-03 | T41, T45 |
| DVG-04 | T38, T43 |
| DVG-05 | T39, T46 |
| DVG-06 | T2, T39, T47 |
| DVG-07 | T48 |
| DVG-08 | T49 |
| DVG-09 | T46, T47 |
| RXO-01 | T51, T65 |
| RXO-02 | T3, T51 |
| RXO-03 | T57 |
| RXO-04 | T52, T53 |
| RXO-05 | T54, T55, T56 |
| RXO-06 | T55, T58 |
| RXO-07 | T55, T59 |
| RXO-08 | T55, T60 |
| RXO-09 | T55, T61 |
| RXO-10 | T58, T60 |
| RXO-11 | T64 |
| CHC-01 | T1, T2, T3, T4, T5, T6, T7, T10, T11 |
| CHC-02 | T68, T70 |
| CHC-03 | T10, T68, T73, T77 |
| CHC-04 | T9, T11 |
| CHC-05 | T67, T73 |
| CHC-06 | T67, T77 |
| CHC-07 | T67, T74 |
| CHC-08 | T67, T73 |
| CHC-09 | T66, T67, T73 |
| CHC-10 | T69 |
| CHC-11 | T10, T11 |
| MAE-01 | T71, T72 |
| MAE-02 | T72, T73 |
| MAE-03 | T72 |
| MAE-04 | T72 |
| MAE-05 | T72 |
| MAE-06 | T72 |
| MAE-07 | T72 |
| BAU-01 | T75 |
| BAU-02 | T75 |
| BAU-03 | T78 |
| BAU-04 | T76, T77 |
| BAU-05 | T77 |
| BAU-06 | T77 |
| BAU-07 | T75, T78 |
| BAU-08 | T77, T79 |

**Coverage:** 75 total, 75 mapeados, 0 sem tarefa.


| Edge case (spec) | Task |
| --- | --- |
| Nv 5 com o ramo pendente liga o Despertar na escolha, e a página `despertar` segue a do ramo | T2, T74 |
| Ponto grátis que leva ao Nv 2 abre o `ramo` logo depois | T73 |
| União do baú depois de um ponto da maestria do Vermelho no mesmo painel zera os pontos | T77 |
| Roxo formado com o ramo do Vermelho pendente: a página é pulada | T67, T77 |
| Concentrado com pontos em Alvos: contam no nível, sem efeito | T38, T47 |
| Lapso ou Massa segurados com o player atingido seguem até soltar ou o limite | T22, T58 |
| Andante e campo do Vermelho Máximo: o puxão vence e o campo segue com tiques `chip` | T21 |
| Fenda sem comum vivo a 120 px: nenhum acerto | T28, T35 |
| Retorno vira para o centro atual do player | T55, T60 |
| Roxo 200% arrastando até a parede: caem no ponto final | T59 |
| Anel do Eco e Kokusen do Eco Negro no mesmo comum: só o Kokusen | T48 |
| Técnica com 5 pontos e marco: página pulada, marco conta | T67, T72 |
| Loja da r1 sem carta de eixo das quatro técnicas | T17 |
| Reroll sorteia o `axisRng` de novo e não muda o `choiceRng` | T73 |
| Run que acaba com baú pendente: some no reset | T10, T78 |

---

## Phase Execution Map

```
Phase 1 → Phase 2 → ... → Phase 14

Phase 1:   T1, T2, T3, T4, T5, T6
Phase 2:   T7, T8, T9, T10, T11
Phase 3:   T12, T13, T14, T15, T16
Phase 4:   T17, T18, T19, T20, T21, T22, T23, T24, T25
Phase 5:   T26, T27, T28, T29
Phase 6:   T30, T31, T32, T33, T34, T35, T36
Phase 7:   T37, T38, T39, T40, T41
Phase 8:   T42, T43, T44, T45, T46, T47, T48, T49, T50
Phase 9:   T51, T52, T53, T54, T55
Phase 10:  T56, T57, T58, T59, T60, T61
Phase 11:  T62, T63, T64, T65
Phase 12:  T66, T67, T68
Phase 13:  T69, T70, T71, T72, T73, T74
Phase 14:  T75, T76, T77, T78, T79
```

Ordem estritamente sequencial (a linha é a ordem de trabalho, não dependência). 79 tarefas em lotes de fases inteiras
(~7 por agente, agente novo por lote, memória "Agente novo por lote"): Fases 1+2 (11, refatoração mecânica: Sonnet
serve), Fase 3 (5), Fase 4 (9, arte), Fases 5+6 (11, arte), Fase 7 (5), Fase 8 (9, arte), Fase 9 (5), Fase 10 (6,
arte), Fases 11+12 (7), Fase 13 (6), Fase 14 (5): 11 lotes. Lotes com arte em movimento (Fases 4, 6, 8 e 10) em Opus 5.5
ou Fable. Fim de cada passo (fases 2, 4, 6, 8, 11, 13 e 14): gate de build com os smokes do passo no design.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | 1 registro + os tipos que ele indexa | ⚠️ coeso: os tipos sem o registro não têm leitor |
| T2, T3, T4, T6 | 1 classe ou função lendo o registro | ✅ |
| T5 | 1 teste de item (`=== 'vermelho'`) trocado nos 4 módulos da loja | ⚠️ coeso: trocar só um deixa a carta e o preço discordando |
| T7 | 1 aviso (`castHit`) no `TechRunner` + a saída do reembolso e do `awakenCast` do Vermelho + o leitor no `techDirector` | ⚠️ coeso: mover sem o leitor perde o banner |
| T8, T9, T10 | 1 vista / 1 módulo puro novo | ✅ |
| T11 | 1 diretor novo + as chamadas que o `shopDirector` passa a fazer | ⚠️ coeso: refatoração com os smokes iguais |
| T12, T26, T37, T52 | 1 tabela de técnica | ✅ |
| T13, T27, T38, T53 | 1 resolvedor (T38 + a base do Kokusen que ele resolve) | ✅ / ⚠️ T38 coeso |
| T14, T28, T39, T55, T67, T75 | 1 módulo puro novo | ✅ |
| T15, T16, T29, T40, T41, T54, T66, T68 | 1 classe ou função | ✅ |
| T17, T31, T43, T57 | 1 entrada no registro + os números e os smokes que ela muda | ⚠️ coeso: ligar a técnica sem ajustar o smoke deixa o gate vermelho |
| T18 | 1 snapshot genérico + o raio da vista que o prova (L-043) + o smoke novo | ⚠️ coeso |
| T19, T25, T36, T50, T64 | 1 prova (smoke ou teste) | ✅ |
| T20, T21, T22, T24, T32, T33, T35, T44, T45, T46, T47, T48, T49, T58, T59, T60, T61 | 1 comportamento de técnica | ✅ |
| T23 | Âncora + o `hold(ms)` do comum e do chefe que só ela usa | ⚠️ coeso (merge forward: o `hold` sem leitor ficaria sem prova) |
| T30 | 1 agenda + a vista que desenha cada corte dela | ⚠️ coeso |
| T34 | 1 Despertar: `cutRects` do runner + o apagamento no `techDirector` | ⚠️ coeso |
| T42 | 1 extração | ✅ |
| T51 | 1 regra de receita + os 2 leitores (`shopEligibility`, smoke `evolution`) | ⚠️ coeso: o typecheck pede junto |
| T56 | 1 adaptador trocando o voo + a vista que lê o raio | ⚠️ coeso |
| T62, T63 | 1 remoção (stats / loja) | ✅ |
| T65, T79 | 1 documento | ✅ |
| T69 | 1 forma de `debug()` + os 2 smokes que a leem | ⚠️ coeso |
| T70, T73, T74, T77 | 1 fluxo do diretor | ✅ |
| T71 | 1 assinatura (`CastHit`) + o texto da lambda na `TestScene` | ⚠️ coeso: o typecheck pede junto |
| T72 | 1 regra de maestria + a barra, o banner e a expressão do snapshot que leem o `MASTERY` | ⚠️ coeso: o `MASTERY.thresholds` sai e os 4 leitores quebram no typecheck |
| T76 | 1 extração | ✅ |
| T78 | 1 troca (vitória → baú) + a remoção do prêmio cego que ela deixa sem chamador | ⚠️ coeso: sem a remoção ficaria código morto num commit |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | — | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T1 | T1 → T4 | ✅ Match |
| T5 | T2 | T2 → T5 | ✅ Match |
| T6 | T1 | T1 → T6 | ✅ Match |
| T7 | T4 (fase 1) | T4 → T7 (fase 1) | ✅ Match |
| T8 | T4 (fase 1) | T4 → T8 (fase 1) | ✅ Match |
| T9 | None | — | ✅ Match |
| T10 | T1 (fase 1) | T1 → T10 (fase 1) | ✅ Match |
| T11 | T9, T10 | T9 → T11, T10 → T11 | ✅ Match |
| T12 | T1 (fase 1) | T1 → T12 (fase 1) | ✅ Match |
| T13 | T12, T4 (fase 1) | T12 → T13, T4 → T13 (fase 1) | ✅ Match |
| T14 | T12 | T12 → T14 | ✅ Match |
| T15 | T13 | T13 → T15 | ✅ Match |
| T16 | None | — | ✅ Match |
| T17 | T5 (fase 1), T6 (fase 1), T13 (fase 3) | T5 → T17 (fase 1), T6 → T17 (fase 1), T13 → T17 (fase 3) | ✅ Match |
| T18 | T17 | T17 → T18 | ✅ Match |
| T19 | T18 | T18 → T19 | ✅ Match |
| T20 | T18 | T18 → T20 | ✅ Match |
| T21 | T18, T14 (fase 3), T15 (fase 3) | T18 → T21, T14 → T21 (fase 3), T15 → T21 (fase 3) | ✅ Match |
| T22 | T18 | T18 → T22 | ✅ Match |
| T23 | T22, T16 (fase 3) | T22 → T23, T16 → T23 (fase 3) | ✅ Match |
| T24 | T20, T21 | T20 → T24, T21 → T24 | ✅ Match |
| T25 | T17 | T17 → T25 | ✅ Match |
| T26 | T12 (fase 3) | T12 → T26 (fase 3) | ✅ Match |
| T27 | T26, T13 (fase 3) | T26 → T27, T13 → T27 (fase 3) | ✅ Match |
| T28 | T27 | T27 → T28 | ✅ Match |
| T29 | T28 | T28 → T29 | ✅ Match |
| T30 | T29 (fase 5) | T29 → T30 (fase 5) | ✅ Match |
| T31 | T30 | T30 → T31 | ✅ Match |
| T32 | T31 | T31 → T32 | ✅ Match |
| T33 | T31 | T31 → T33 | ✅ Match |
| T34 | T32 | T32 → T34 | ✅ Match |
| T35 | T33 | T33 → T35 | ✅ Match |
| T36 | T31 | T31 → T36 | ✅ Match |
| T37 | T26 (fase 5) | T26 → T37 (fase 5) | ✅ Match |
| T38 | T37 | T37 → T38 | ✅ Match |
| T39 | T38 | T38 → T39 | ✅ Match |
| T40 | None | — | ✅ Match |
| T41 | None | — | ✅ Match |
| T42 | None | — | ✅ Match |
| T43 | T42, T38 (fase 7) | T42 → T43, T38 → T43 (fase 7) | ✅ Match |
| T44 | T43, T39 (fase 7), T40 (fase 7) | T43 → T44, T39 → T44 (fase 7), T40 → T44 (fase 7) | ✅ Match |
| T45 | T43, T41 (fase 7) | T43 → T45, T41 → T45 (fase 7) | ✅ Match |
| T46 | T44 | T44 → T46 | ✅ Match |
| T47 | T44 | T44 → T47 | ✅ Match |
| T48 | T46, T45 | T46 → T48, T45 → T48 | ✅ Match |
| T49 | T47 | T47 → T49 | ✅ Match |
| T50 | T43 | T43 → T50 | ✅ Match |
| T51 | T17 (fase 4) | T17 → T51 (fase 4) | ✅ Match |
| T52 | T37 (fase 7) | T37 → T52 (fase 7) | ✅ Match |
| T53 | T52 | T52 → T53 | ✅ Match |
| T54 | T53 | T53 → T54 | ✅ Match |
| T55 | T54 | T54 → T55 | ✅ Match |
| T56 | T55 (fase 9) | T55 → T56 (fase 9) | ✅ Match |
| T57 | T56, T51 (fase 9) | T56 → T57, T51 → T57 (fase 9) | ✅ Match |
| T58 | T57 | T57 → T58 | ✅ Match |
| T59 | T58 | T58 → T59 | ✅ Match |
| T60 | T57 | T57 → T60 | ✅ Match |
| T61 | T60 | T60 → T61 | ✅ Match |
| T62 | T31 (fase 6), T43 (fase 8), T57 (fase 10) | T31 → T62 (fase 6), T43 → T62 (fase 8), T57 → T62 (fase 10) | ✅ Match |
| T63 | T62 | T62 → T63 | ✅ Match |
| T64 | T63 | T63 → T64 | ✅ Match |
| T65 | T63 | T63 → T65 | ✅ Match |
| T66 | None | — | ✅ Match |
| T67 | T66 | T66 → T67 | ✅ Match |
| T68 | T10 (fase 2) | T10 → T68 (fase 2) | ✅ Match |
| T69 | T11 (fase 2) | T11 → T69 (fase 2) | ✅ Match |
| T70 | T69, T68 (fase 12) | T69 → T70, T68 → T70 (fase 12) | ✅ Match |
| T71 | T7 (fase 2) | T7 → T71 (fase 2) | ✅ Match |
| T72 | T71 | T71 → T72 | ✅ Match |
| T73 | T70, T72, T67 (fase 12) | T70 → T73, T72 → T73, T67 → T73 (fase 12) | ✅ Match |
| T74 | T73 | T73 → T74 | ✅ Match |
| T75 | None | — | ✅ Match |
| T76 | None | — | ✅ Match |
| T77 | T75, T76, T73 (fase 13) | T75 → T77, T76 → T77, T73 → T77 (fase 13) | ✅ Match |
| T78 | T77 | T77 → T78 | ✅ Match |
| T79 | T78 | T78 → T79 | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Dados (refatoração que o jogo lê) | unit | unit + smoke | ✅ OK |
| T2, T6 | Regra pura | unit | unit | ✅ OK |
| T3, T4, T5 | Regra pura (lida pelo jogo vivo) | unit | unit + smoke | ✅ OK |
| T7, T8, T11 | Adaptadores | smoke | smoke | ✅ OK |
| T9 | Vista testável sem motor | unit | unit | ✅ OK |
| T10, T14, T15, T16, T28, T29, T39, T40, T41, T54, T55, T66, T67, T68, T75 | Regra pura | unit | unit | ✅ OK |
| T12, T26, T37, T52 | Dados | unit | unit | ✅ OK |
| T13, T27, T38, T53 | Regra pura + dados | unit | unit | ✅ OK |
| T17, T31, T43, T57 | Dados + regra pura + smokes que mudam | unit, smoke | unit + smoke | ✅ OK |
| T18, T30, T46, T56 | Adaptador + vista do motor | smoke + conferência | smoke (+ conferência em movimento na T46) | ✅ OK |
| T19 | Prova do adaptador (só smoke) | smoke | smoke | ✅ OK |
| T20–T24, T32–T35, T42, T44, T45, T47–T49, T58–T61, T70, T73, T74, T76, T77 | Adaptadores | smoke | smoke | ✅ OK |
| T25, T36, T50, T64 | Teste da regra pura | unit | unit | ✅ OK |
| T51, T62, T63 | Regra pura + dados (mudam o jogo vivo) | unit, smoke | unit + smoke | ✅ OK |
| T65, T79 | Documentação | none | none | ✅ OK |
| T69 | Vista testável + 2 smokes que a leem | unit, smoke | unit + smoke | ✅ OK |
| T71 | Adaptador (assinatura) | smoke | smoke | ✅ OK |
| T72 | Regra pura + adaptadores que a leem | unit, smoke | unit + smoke | ✅ OK |
| T78 | Adaptador + remoção de regra pura | unit, smoke | unit + smoke | ✅ OK |

O `hold(ms)` do comum e do chefe nasce na T23 junto da Âncora, seu único leitor, para não haver código sem prova (merge
forward); a regra pura do chefe preso tem teste próprio na T16. As pontes do smoke `evolution` (T17 → T51) e do
`choiceRank` na ordem da F31 (T10 → T68/T70) existem só para os smokes ficarem verdes no meio do caminho; cada uma é
removida na tarefa citada.
