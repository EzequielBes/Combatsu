# Mundo modular — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/mundo-modular/spec.md`
**Design**: `.specs/features/mundo-modular/design.md`
**Status**: Approved
**Branch**: `feat/mundo-modular` (a partir da `master` local em `0d35d77`; volta para a `master` com `--no-ff` depois do Verifier PASS e do UAT)
**Modelos**: Opus 5.5 planeja, orquestra e roda o Verifier; os workers que codam rodam em Sonnet 5.5 (`model: sonnet`), um batch por vez.

---

## Test Coverage Matrix

> Guidelines: `vitest.config.ts`, `.oxlintrc.json` (tetos de 400 linhas, 80 por função, complexidade 15), `.specs/STATE.md` AD-001/002/006/009/019; lições confirmadas L-010 (os dois lados de cada limiar) e L-043 (testar a chamada do adaptador ao motor).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Lógica pura (`src/core/**`) | unit | 1:1 com os ACs; todo edge case da spec; limiares nos dois lados (L-010) | `tests/core/*.test.ts` | `npm test` |
| Dados (`src/data/modules/**`, `src/data/tuning.ts`) | unit | Lint sobre todo módulo do catálogo; larguras exatas | `tests/data/*.test.ts` | `npm test` |
| Arte (`src/game/art/**`) | unit | Só cores da `PALETTE`, frames esperados presentes | `tests/game/art/*.test.ts` | `npm test` |
| Adaptadores Phaser (`src/scenes/**`, `src/game/Player.ts`, `debugApi`) | smoke | Valor vivo lido pelo snapshot ou pela câmera (L-043); `none` na task do adaptador, coberto pela fase 3 | `scripts/smoke/*.smoke.mjs` | `npm run smoke` |
| Docs | none | build gate only | - | - |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tasks com testes unitários | `npm run gate` |
| Build | Tasks de adaptador sem smoke próprio | `npm run gate && npm run build` |
| Full | Tasks de smoke e a última de cada fase de adaptador | `npm run gate && npm run smoke` |

Base: 2575 testes unitários e 35 smokes passando em `0d35d77`.

---

## Execution Plan

### Phase 1: Núcleo puro (módulos, área, run, spawn) — worker W1

```
T1 → T2 → T3 → T4 → T5 → T6 → T7
```

### Phase 2: Adaptadores na cena — worker W2

```
T8 → T9 → T10 → T11 → T12 → T13 → T14 → T15
```

### Phase 3: Smokes — worker W3

```
T16 → T17 → T18 → T19 → T20
```

### Phase 4: Tema visual (P2) e documentação — worker W4

```
T21 → T22 → T23 → T24 → T25
```

---

## Task Breakdown

### T1: Tipo do módulo, validação e lint

**What**: Criar `ModuleDef`, `ModuleKind`, `ModuleTheme`, `validateModule` (falha alto) e `lintModule` (lista de erros) com as constantes do design.
**Where**: `src/core/module.ts`
**Depends on**: None
**Reuses**: estilo de `parseLevel` (mensagens com linha e coluna) em `src/core/level.ts`
**Requirement**: MDL-01, MDL-02, MDL-03, MDL-04, MDL-05, MDL-06, MDL-07, MDL-08, MDL-09
**Done when**:
- [x] Testes em `tests/core/module.test.ts` cobrem: 16 e 48 colunas (aceitas), 15 e 49 (recusadas); 16 e 18 linhas (recusadas); linha de largura diferente; `P` e `x` recusados com id, linha e coluna na mensagem; chão faltando 1 tile na linha 15 e outro na 16; `#` na linha 14 e na 0; 12 colunas abertas (passa) e 11 (falha); 1 `E` (falha), 2 `E` (passa), `E` na linha 13 (falha); combate sem `c`/`b`/`p` (falha); konbini com `E` (falha); módulo `boss` sujeito a MDL-06..08.
- [x] `npm run gate` passa.
**Tests**: unit
**Gate**: quick

---

### T2: Catálogo dos cinco módulos

**What**: Desenhar `rua` (40), `beco` (20), `parque` (32), `konbini` (20, sem `E`) e `santuario` (40, `boss`) em arquivos próprios em `src/data/modules/` e exportar `MODULES` e `COMBAT_IDS = ['rua', 'beco', 'parque']` no `index.ts`.
**Where**: `src/data/modules/`
**Depends on**: T1
**Reuses**: legenda e chão da `LEVEL_1`
**Requirement**: MDL-10
**Done when**:
- [x] Todo módulo de combate tem um `E` a até 4 colunas de cada borda e pelo menos 1 `p`.
- [x] `tests/data/modules.test.ts`: as larguras exatas, o `kind` e o `theme` de cada um, e `validateModule` + `lintModule` sem erro para todos.
- [x] `npm run gate` passa.
**Tests**: unit
**Gate**: quick

---

### T3: Selo no `parseLevel`

**What**: `S` vira `LevelData.seal` (retângulo da coluna, do primeiro ao último `S`), fora de `solids`; `tileVariant` trata `S` como vazio.
**Where**: `src/core/level.ts`
**Depends on**: T2
**Reuses**: a mesclagem de sólidos existente
**Requirement**: ARE-08, TRV-01
**Done when**:
- [x] `tests/core/level.test.ts`: grade com `S` nas linhas 0 a 14 dá `seal = { x: col·32, y: 0, width: 32, height: 15·32 }`; grade sem `S` dá `seal = null`; o `#` vizinho do `S` não se mescla com ele; os testes atuais da `LEVEL_1` continuam passando sem mudança.
- [x] `npm run gate` passa.
**Tests**: unit
**Gate**: quick

---

### T4: Sorteio dos módulos por área

**What**: `drawModules`, `Stage.nextArea` (com o primeiro da área anterior e o modo forçado) e `parseModulesParam`, mais `AREA` (`fadeMs`, `sealBurnMs`, `playerCol`, `minCols`, `maxCols`) em `src/data/tuning.ts`.
**Where**: `src/core/stage.ts`
**Depends on**: T3
**Reuses**: `Rng` (`src/core/rng.ts`), `isBossRound` (`src/core/waves.ts`)
**Requirement**: ARE-01, ARE-02, ARE-03, ARE-04, ARE-05, ARE-06, ARE-07, ARE-12, ARE-13
**Done when**:
- [x] `tests/core/stage.test.ts` cobre: 2 módulos nas rodadas 1 e 2, 3 na rodada 3; rodada 5 e 10 = `['santuario']`; 20 seeds × rodadas 1 a 10 sem vizinho repetido, sem primeiro igual ao da área anterior e com largura entre 48 e 120; a regra de largura com um catálogo sintético que passa de 120 (troca o último) e um que fica abaixo de 48 (acrescenta o `beco`), cada um no limite exato (48 e 120 aceitos; 47 e 121 corrigidos); mesma seed = mesma sequência; `modules=beco,parque` força a ordem; `modules=konbini,xyz` e `modules=` voltam ao sorteio.
- [x] `npm run gate` passa.
**Tests**: unit
**Gate**: quick

---

### T5: Composição da grade da área

**What**: `composeArea` (parede, selo, `P` na coluna 3 da linha 14, slots pelo `slotRng`), `konbiniArea` e `areaModeFor`.
**Where**: `src/core/stage.ts`
**Depends on**: T4
**Reuses**: `parseLevel` para conferir o resultado nos testes
**Requirement**: ARE-06, ARE-08, ARE-09, SLT-01, SLT-02, SLT-03, LEG-01, LEG-02, LEG-04
**Done when**:
- [x] Testes cobrem: largura = soma + 2; coluna 0 toda `#`; última coluna `S` nas linhas 0 a 14 e `#` nas 15 e 16; `parseLevel` da grade dá o player na coluna 3; `slotRng.next()` em 0,39 → `c`, 0,4 → `b`, 0,79 → `b`, 0,8 → `.`; 1000 slots em 40/40/20 ± 5 pontos; trocar o número de slots não muda os ids sorteados para a mesma seed; `c`/`b` fixos ficam; a konbini não tem `S` nem `E`; `areaModeFor('?area=sala')`, `('?debug&fxlab')`, `('?debug&fxlab&modules=rua')` = `sala`; `('?debug')` e `('')` = `modular`.
- [x] `npm run gate` passa.
**Tests**: unit
**Gate**: quick

---

### T6: Estado `traverse` e saída na run

**What**: `RunOptions.flow` e `skipShop`, estado `traverse`, `exitReached()`, `stageRng` (`^ 0x1f83d9ab`), `slotRng` (`^ 0x5be0cd19`) e `acceptsPlayerInput('traverse') === true`.
**Where**: `src/core/run.ts`
**Depends on**: T5
**Reuses**: o padrão dos streams e do pedido `closeShop`
**Requirement**: TRV-02, TRV-04, TRV-06, TRV-09, KON-01, KON-03, KON-04
**Done when**:
- [x] `tests/core/run.test.ts` ganha: modular → último abate leva a `traverse` com `roundCleared`; `traverse` não emite `spawn` nem avança timer em 10 s; `exitReached` em `traverse` → `shop` + `shopOpen`; com `skipShop` → `roundStart(r + 1)` sem `shopOpen`; `exitReached` em `roundActive`, `shop` e `title` é ignorado; dois `exitReached` no mesmo update = uma transição; morte em `traverse` → `gameOver` com o resumo; morte e último abate no mesmo update → `gameOver`; `stageRng`/`slotRng` reproduzíveis pela seed; os streams que já existem dão as mesmas sequências de antes; o fluxo `sala` continua idêntico (todos os testes atuais passam sem mudança).
- [x] `npm run gate` passa.
**Tests**: unit
**Gate**: quick

---

### T7: Alcance do ponto de spawn

**What**: `maxReach` em `pickSpawnPoint`, com o fallback do ponto fora da câmera mais perto, e `SPAWN.reachPx = 900` em `src/data/tuning.ts`.
**Where**: `src/core/spawnPoint.ts`
**Depends on**: T6
**Reuses**: `farthestPoint`
**Requirement**: RCH-01, RCH-02, RCH-03, RCH-04, RCH-05
**Done when**:
- [x] `tests/core/spawnPoint.test.ts` ganha: ponto a 900 px é candidato e a 901 px não; pontos a 500, 901 e 2000 px → só o de 500; todos acima de 900 → o fora da câmera mais perto; nenhum fora da câmera → `farthestPoint`; preferência pelas costas e gap aplicados só sobre os do alcance; `rng.chance` consumido em todos os ramos; sem `maxReach` o comportamento atual não muda.
- [x] `npm run gate` passa.
**Tests**: unit
**Gate**: quick

---

### T8: Spawn móvel do player e objeto largado na transição

**What**: `Player.setSpawn(x, y)`, `placeAtSpawn()` (como o `respawn`, sem fade e sem mexer na vida) e `dropHeldForTransition()` (destrói o objeto da mão e zera `held`).
**Where**: `src/game/Player.ts`
**Depends on**: None (fase 1 concluída)
**Reuses**: `respawn`, `resetForRun`, `Prop.destroyNow`
**Requirement**: ARE-09, TRV-08
**Done when**:
- [x] `spawn` deixa de ser `readonly`; nada mais muda no `Player`.
- [x] `npm run gate && npm run build` passa.
**Tests**: none
**Gate**: build

---

### T9: `WorldBuilder` no lugar do `TerrainBuilder`

**What**: Criar `WorldBuilder` com `build`, `teardown`, `openSeal`, `sealed`, `exitX` conforme o design, mover para ele a criação dos objetos que hoje está no `create` da `TestScene`, e apagar `src/scenes/test/terrain.ts`; a sala passa a usar `build` com a `LEVEL_1`.
**Where**: `src/scenes/test/world.ts`
**Depends on**: T8
**Reuses**: `TerrainBuilder.buildTerrain`, `buildBackground`, `new Prop` do `create`, `Pickups.clear`, `FloatTexts.clear`, `DroppedTools.clear`
**Requirement**: ARE-11, TRV-01, TRV-03
**Done when**:
- [x] `s.terrain` e `s.props` são esvaziados no lugar no teardown (nunca reatribuídos).
- [x] O selo usa o frame `seal` se existir, senão um retângulo da `PALETTE`; o efeito de 400 ms usa `AREA.sealBurnMs`.
- [x] `npm run gate && npm run build` passa; `npm run smoke` com a sala continua com os 35 cenários passando (o runner da T16 ainda não existe, então rodar com `?area=sala` não é preciso aqui: o modo modular só liga na T11).
**Tests**: none
**Gate**: full

---

### T10: `AreaDirector`

**What**: Criar o `AreaDirector` (comandos, `rebuild`, detecção da saída, fade de saída e entrada, dreno dos pickups pelo `drops.onPickupCollected`, `closeShopWithFade`, fundo do título) conforme o design.
**Where**: `src/scenes/test/areaDirector.ts`
**Depends on**: T9
**Reuses**: `Stage`, `composeArea`, `konbiniArea`, `parseLevel`, `requireSpawnPoints`, `WorldBuilder`, `clampCenter`
**Requirement**: ARE-09, ARE-10, ARE-11, TRV-03, TRV-05, TRV-07, TRV-08, TRV-10, KON-01, KON-03, KON-05
**Done when**:
- [x] A morte do player durante o fade de saída cancela a transição.
- [x] Evento de debug `areaBuilt:<ids separados por vírgula>` a cada `rebuild`.
- [x] `npm run gate && npm run build` passa.
**Tests**: none
**Gate**: build

---

### T11: Modo da cena e ligação na `TestScene`

**What**: A `TestScene` decide o modo com `areaModeFor`, cria a `Run` com `flow` e `skipShop` (`noshop=1`), cria o `AreaDirector`, chama o `update` dele e dá input neutro ao player enquanto `transitioning`.
**Where**: `src/scenes/TestScene.ts`
**Depends on**: T10
**Reuses**: `debugParam`, `PlayerInput` neutro de hoje (RUN-08)
**Requirement**: LEG-01, LEG-02, LEG-04, TRV-10, KON-04
**Done when**:
- [x] A `TestScene` não cresce: o que sai para o `WorldBuilder` compensa o que entra (conferir `npm run lint` sem exceção nova no `.oxlintrc.json`).
- [x] `npm run gate && npm run build` passa.
**Tests**: none
**Gate**: build

---

### T12: Repasse dos comandos da run

**What**: O `RunDirector` repassa `startRun`, `roundStart`, `roundCleared` e `shopOpen` ao `AreaDirector` antes do tratamento atual, e mostra "Rodada N concluída" também em `traverse`.
**Where**: `src/scenes/test/runDirector.ts`
**Depends on**: T11
**Reuses**: `applyRunCommand`
**Requirement**: TRV-02, TRV-03, KON-01, KON-03
**Done when**:
- [x] No modo sala o `AreaDirector` não faz nada e o fluxo fica idêntico.
- [x] `npm run gate && npm run build` passa.
**Tests**: none
**Gate**: build

---

### T13: Fechar a loja com fade no modo modular

**What**: O `ShopDirector.closeShop` usa `areaDirector.closeShopWithFade()` no modo modular e mantém o caminho de hoje na sala.
**Where**: `src/scenes/test/shopDirector.ts`
**Depends on**: T12
**Reuses**: `closeShop` atual (resume do Matter)
**Requirement**: KON-02, KON-03, TRV-10
**Done when**:
- [x] O Matter volta (`resume`) antes do fade de entrada da área nova.
- [x] `npm run gate && npm run build` passa.
**Tests**: none
**Gate**: build

---

### T14: Alcance do spawn na cena

**What**: `Spawner.pickEnemySpawnPoint` passa `maxReach: SPAWN.reachPx` só no modo modular.
**Where**: `src/scenes/test/spawner.ts`
**Depends on**: T13
**Reuses**: `pickSpawnPoint`
**Requirement**: RCH-01, LEG-01
**Done when**:
- [x] `npm run gate && npm run build` passa.
**Tests**: none
**Gate**: build

---

### T15: Campo `area` no snapshot

**What**: O snapshot ganha `area` (LEG-05, com `staticBodies` contado nos corpos estáticos do mundo do Matter), com o tipo em `GameSnapshot` (`src/game/debugApi.ts`) e a fixture de `tests/game/debugApi.test.ts` atualizada.
**Where**: `src/scenes/test/snapshot.ts`
**Depends on**: T14
**Reuses**: o padrão dos campos `worldProps` e `run`
**Requirement**: LEG-05
**Done when**:
- [x] `npm run gate && npm run smoke` passa (os 35 cenários ainda sem o `area=sala` do runner: o modo padrão já é o modular aqui, então os que quebrarem são esperados e ficam registrados para a T16 confirmar que voltam).
**Tests**: none
**Gate**: full

---

### T16: Runner dos smokes na sala de teste

**What**: `scripts/smoke/run.mjs` envolve o `page.goto` para acrescentar `area=sala` a toda URL sem `area=` nem `modules=`.
**Where**: `scripts/smoke/run.mjs`
**Depends on**: None (fase 2 concluída)
**Reuses**: o `page` que o runner já passa aos cenários
**Requirement**: LEG-03
**Done when**:
- [x] Os 35 smokes antigos passam (intermitentes conhecidos: só contam como regressão se falharem em 2 de 3 execuções isoladas).
**Tests**: smoke
**Gate**: full

---

### T17: Smoke da travessia e da konbini

**What**: `world-traverse.smoke.mjs` com `?debug&modules=beco,parque&maxAlive=1&seed=3`.
**Where**: `scripts/smoke/world-traverse.smoke.mjs`
**Depends on**: T16
**Reuses**: `stepAndSnap`, tecla 2 de debug para derrubar a onda
**Requirement**: TRV-01, TRV-02, TRV-03, TRV-05, TRV-07, TRV-08, TRV-10, KON-01, KON-02, KON-03, KON-05, ARE-09, ARE-10, ARE-11, LEG-05
**Done when**:
- [x] Confere: em `roundActive` o player andando para a direita para antes de `exitX` e `sealed === true`; ao fechar a onda, `run.state === 'traverse'` e `sealed === false`; fragmentos no chão ao sair somam na carteira (valor antes + valor vivo); objeto na mão some; `area.modules` vira `['konbini']`, `run.state === 'shop'`; nenhum inimigo vivo na konbini; fechar a loja leva à rodada 2 com `area.modules` de 2 ids e o player na coluna 3; `staticBodies` = sólidos mesclados da área nova + 1; o scroll da câmera nunca passa de `widthPx − vista` (L-043).
**Tests**: smoke
**Gate**: full

---

### T18: Smoke da run modular sem loja

**What**: `world-run.smoke.mjs` com `?debug&noshop=1&maxAlive=1&seed=11`, das rodadas 1 a 3, e recarga com a mesma seed.
**Where**: `scripts/smoke/world-run.smoke.mjs`
**Depends on**: T17
**Reuses**: o laço de derrubar a onda da T17
**Requirement**: ARE-01, ARE-02, ARE-05, ARE-07, ARE-12, KON-04, RCH-01
**Done when**:
- [x] Confere: rodadas 1 e 2 com 2 módulos e a 3 com 3; primeiro módulo diferente entre áreas seguidas; nenhum `shopOpen` nos eventos; recarregar com a mesma seed repete os ids das 3 áreas; todo inimigo nasce a no máximo 900 px do player; `?debug&modules=parque,rua` força a ordem.
**Tests**: smoke
**Gate**: full

---

### T19: Smoke do santuário

**What**: `world-boss.smoke.mjs` com `?debug&round=5&seed=5`: área do chefe e selo depois da vitória.
**Where**: `scripts/smoke/world-boss.smoke.mjs`
**Depends on**: T18
**Reuses**: a forma de vencer o chefe do `boss-victory.smoke.mjs`
**Requirement**: ARE-03
**Done when**:
- [x] Confere: `area.modules` = `['santuario']`; o chefe nasce; depois da vitória, `traverse` e `sealed === false`.
**Tests**: smoke
**Gate**: full

---

### T20: Smoke dos modos sala e fxlab

**What**: `world-legacy.smoke.mjs`: `?debug&area=sala` usa a `LEVEL_1` com `intermission` e loja na mesma sala; `?debug&fxlab&modules=rua` usa a `LEVEL_1`; `?debug` puro é modular.
**Where**: `scripts/smoke/world-legacy.smoke.mjs`
**Depends on**: T19
**Reuses**: snapshot `area.mode`
**Requirement**: LEG-01, LEG-02, LEG-04
**Done when**:
- [x] `npm run gate && npm run smoke` passa com os 39 cenários.
**Tests**: smoke
**Gate**: full

---

### T21: Folhas de terreno por tema e o frame do selo

**What**: Cinco folhas de terreno (`terrain-rua`, `terrain-beco`, `terrain-parque`, `terrain-konbini`, `terrain-santuario`) com as variantes do ENV-01 e a folha `seal`, só com cores da `PALETTE`, registradas em `TEX`.
**Where**: `src/game/art/tiles.ts`
**Depends on**: None (fase 3 concluída)
**Reuses**: a folha `terrain` atual e o `tileFrameFor`
**Requirement**: THM-01, THM-02, THM-03
**Done when**:
- [x] Testes de arte: cada folha tem todos os frames de `TileVariant`, todas as cores estão na `PALETTE`, e o `seal` existe.
- [x] `npm run gate` passa.
**Tests**: unit
**Gate**: quick

---

### T22: Faixa de cor do fundo por tema

**What**: `buildBackground` aceita os `spans` com tema e pinta a camada próxima com a cor do tema em cada trecho.
**Where**: `src/game/art/background.ts`
**Depends on**: T21
**Reuses**: `paintNear`
**Requirement**: THM-02
**Done when**:
- [ ] Sem `spans` (sala) o fundo fica idêntico ao de hoje.
- [ ] `npm run gate && npm run build` passa.
**Tests**: none
**Gate**: build

---

### T23: Construção da área com o tema de cada módulo

**What**: O `WorldBuilder` desenha cada coluna com a folha do tema do seu `span`, passa os `spans` ao fundo e desenha o selo com o frame `seal`.
**Where**: `src/scenes/test/world.ts`
**Depends on**: T22
**Reuses**: `tileFrameFor`
**Requirement**: THM-02, THM-03
**Done when**:
- [ ] Captura com `tools/visual-shots.mjs` de `?debug&modules=rua,beco,parque` e do `santuario`, em `hd=1` e sem ele, conferida a olho (três chãos distintos e o selo).
- [ ] `npm run gate && npm run smoke` passa.
**Tests**: smoke
**Gate**: full

---

### T24: README

**What**: Documentar o mundo modular, `area=sala`, `modules=` e o fluxo selo → konbini no `README.md`.
**Where**: `README.md`
**Depends on**: T23
**Reuses**: as tabelas de modo debug existentes
**Requirement**: LEG-03, ARE-12
**Done when**:
- [ ] `npm run format:check` passa.
**Tests**: none
**Gate**: build

---

### T25: Roadmap da expansão

**What**: Registrar F18 a F21 no `.specs/ROADMAP.md`, mover a parte de parede (WAL) da F13 para a F20 e pôr a F14 depois da F19.
**Where**: `.specs/ROADMAP.md`
**Depends on**: T24
**Reuses**: o plano aprovado (seção 9)
**Requirement**: MDL-10
**Done when**:
- [ ] `npm run format:check` passa.
**Tests**: none
**Gate**: build
