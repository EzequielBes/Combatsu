# Meta mínima (F39, restante) — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/meta-minima/spec.md`
**Design**: `.specs/features/meta-minima/design.md`
**Status**: Draft
**Branch**: `docs/spec-meta-e-votos` (spec); a implementação abre o próprio branch a partir de onde a `recorde-e-recomeco`
estiver mergeada

---

## Test Coverage Matrix

> Guidelines: `CLAUDE.md` (camadas, gate, smoke só do que foi tocado, HD é a base, `core/` com teste par em
> `tests/core/`), `.oxlintrc.json` (400 linhas efetivas, 80 por função, complexidade 15; arquivo novo nunca entra nas
> exceções), `vitest.config.*`; lições L-010 (limiar e empate nos dois lados), L-043 (o adaptador repassa o valor que a
> regra decidiu), L-076 (campo de debug que só repete a entrada não prova o efeito). Amostras: `tests/core/save.test.ts`,
> `tests/core/runSummary.test.ts`, `tests/core/vows.test.ts` (sorteio uniforme), `tests/scenes/recordLoad.test.ts`
> (tabela de carga sem cena), `tests/game/recordViews.test.ts` e `tests/game/vowPanel.test.ts` (cores por chave da
> paleta, `Text` falso), `scripts/smoke/record-save.smoke.mjs`, `record-end.smoke.mjs`, `vows.smoke.mjs`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Regra pura (`src/core/**`) | unit | 1:1 com os ACs; cada limiar e empate nos dois lados (L-010); casos de borda da spec; sem `phaser`/`localStorage` lido pelo `?raw` | `tests/core/<arquivo>.test.ts` | `npm test` |
| Dados (`src/data/unlocks.ts`) | unit | Registro igual à tabela CNQ-01 da spec, campo a campo e na ordem; forma do UNL-02 | `tests/data/unlocks.test.ts` | `npm test` |
| Carga e sessão do save sem cena (`src/scenes/test/saveLoad.ts`, `saveSession.ts`) | unit | Cada linha da tabela "Carga do save" do design; cada regra de escrita MSV-06..11 com porta falsa; nenhum parâmetro de debug lê o armazenamento | `tests/scenes/<arquivo>.test.ts` | `npm test` |
| Vistas sem cena (`src/game/StarterPanel.ts`, `MetaToast.ts`, `GrimoireHint.ts`) | unit | Só chaves da `PALETTE`; L-043 com `Text` falso (texto, posição, cor, tempo); caixas dentro de 960x540; dica abaixo da loja lendo `ShopPanel.ts?raw` | `tests/game/metaViews.test.ts` | `npm test` |
| Adaptadores de cena (`src/scenes/**`, `combat`, `effects`, `spawner`, `shopDirector`, `vowDirector`, `TestScene.ts`) | smoke | Efeito lido do jogo vivo pelo snapshot (L-076): happy path + bordas da spec; smoke novo com `?debug&hd=1&area=modular`; smokes existentes tocados iguais | `scripts/smoke/meta-*.smoke.mjs` + existentes listados na task | `npm run smoke -- <trecho>` |
| Decisão e docs (`.specs/STATE.md`, `README.md`, `CLAUDE.md`) | none | build gate | - | `npm run gate` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tasks só com teste de unidade (core, dados, carga/sessão, vistas) | `npm run gate` |
| Full | Tasks de adaptador de cena (ou core que muda um smoke existente) | `npm run gate && npm run smoke -- <smoke da task>` (um trecho por vez) |
| Build | Decisão e docs | `npm run gate` |

Base: 3009 testes de unidade (152 arquivos) no `90fdc03` (`recorde-e-recomeco/validation.md`). Cada task anota a
contagem nova; nenhuma pode ficar abaixo da anterior.
Smokes instáveis conhecidos: `armed` (ARM-12) e timeouts sob carga; repetir isolado antes de suspeitar.

**Regras de execução desta feature**

- Refatorações primeiro (Phase 1), cada uma com os smokes existentes iguais antes e depois.
- A F29 mexe em paralelo em `combat.ts` e `impactFx.ts` (modificados no worktree principal). Todo toque em
  `combat.ts`, `effects.ts` e `spawner.ts` fica na Phase 6, a última, em commits de 1 a 3 linhas por arquivo.
  `impactFx.ts` não é tocado.
- `TestScene.ts` (399/400) só perde linhas (T3, T24, T28): termina em no máximo 395 efetivas. `Hud.ts`, `ShopPanel.ts`,
  `VowPanel.ts`, `core/vows.ts`, `core/shop.ts` e `tests/core/run.test.ts` não são tocados.
- `core/run.ts` (exceção de complexidade) só ganha o stream `startRng` (T10): nenhum estado, nenhum ramo.
- Nenhum arquivo novo entra nas exceções do `.oxlintrc.json`.
- Hoje as 8 conquistas são dormentes (F31, F34, F35 e F40 ainda não estão no código). A prova no navegador de trava,
  aviso, escrita e "falta pouco" usa `?debug&achievements=test` (`testeR2`, `testeContra`). As conquistas sem par no
  registro de teste (`kokusenRodada`, `chefeSemTecnica`, `jackpots`, `chefeR10`, `semDano`, `finalizadorChefe`) têm a
  regra provada em unidade (`Achievements`) e a ligação provada no navegador só se o conteúdo dela existir no código
  quando a task rodar; senão, a task prova que nada regrediu e deixa a citação da linha de ligação para o Verifier.

---

## Execution Plan

Phases são sequenciais; dentro da phase as tasks rodam na ordem.

### Phase 1: Decisão e refatorações (smokes iguais)

```
T1
T2
T3
```

### Phase 2: Regras puras e dados

```
T4 → T5 → T6
T5 → T7
T8
T9
T10
T11
T12
```

### Phase 3: Carga, sessão e vistas sem cena

```
T13 → T14
T15 → T16
T17
```

### Phase 4: Diretores da meta (sem tocar arquivos da F29)

```
T18 → T19 → T20
T18 → T21
T19 → T21
T19 → T22
T19 → T23
T21 → T23
```

### Phase 5: Técnica inicial

```
T24 → T25
```

### Phase 6: Integração (pontos da F29 e das outras fases, no fim)

```
T26
T27
T28
T29 → T30
```

---

## Task Breakdown

## Phase 1: Decisão e refatorações (smokes iguais)

### T1: Emenda da AD-005 no STATE

**What**: Acrescentar ao `## Decisions` do `.specs/STATE.md` a próxima `AD-NNN` (número tirado na hora, depois da
última existente no branch) com o texto da seção "Decisão de projeto a registrar" do design (Decision, Reason,
Trade-off, Scope) e marcar a AD-005 como `active (emendada pela AD-NNN)`.
**Where**: `.specs/STATE.md`
**Depends on**: None
**Reuses**: formato das AD-001..AD-024
**Requirement**: STA-05, STA-07 (decisão que os permite)

**Done when**:

- [ ] Nova AD com os quatro campos; AD-005 aponta para ela; nenhuma outra AD muda
- [ ] `python3 <skill>/scripts/validate_state.py` sem erro
- [ ] Gate verde (3009 testes)

**Tests**: none (decisão: a matriz diz none)
**Gate**: build
**Commit**: `docs(state): amend AD-005 with the starter technique`

---

### T2: Carga do save com nome próprio

**What**: `git mv` de `src/scenes/test/recordLoad.ts` para `saveLoad.ts` e de `tests/scenes/recordLoad.test.ts` para
`saveLoad.test.ts`; `loadRecord` vira `loadSave`, `RecordLoad` vira `SaveLoad`, `RecordDebugParams` vira
`SaveDebugParams`; o `RecordDirector` importa do arquivo novo. Comportamento igual (a meta entra na T13).
**Where**: `src/scenes/test/saveLoad.ts`
**Depends on**: None
**Reuses**: `recordLoad.ts` inteiro
**Requirement**: MSV-10 (preparação)

**Done when**:

- [ ] `git log --follow` mostra o histórico do arquivo; nenhum `recordLoad` sobra em `src/` e `tests/`
- [ ] Mesma contagem de testes (3009)
- [ ] Smokes `record-save`, `record-hud` verdes, iguais ao antes
- [ ] Gate verde

**Tests**: unit
**Gate**: full
**Commit**: `refactor(scene): rename the record load to the save load`

---

### T3: Quadro da run no RunDirector

**What**: `RunDirector.tick(dt)` com `area.update(dt)` e o laço de `run.update` → `applyRunCommand`; a cena troca as
linhas 419-420 por `this.runDirector.tick(dt);`. Ainda sem painel (o `if (this.starter.update()) return;` entra na
T24).
**Where**: `src/scenes/test/runDirector.ts`
**Depends on**: None
**Reuses**: o bloco de `TestScene.ts:416-420`
**Requirement**: STA-06 (preparação)

**Done when**:

- [ ] `TestScene.ts` cai de 399 para no máximo 398 linhas efetivas
- [ ] Smokes `run-loop`, `shop`, `world-restart`, `hud`, `record-end` verdes, iguais ao antes
- [ ] Gate verde (3009 testes)

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(run): move the run frame into the run director`

---

## Phase 2: Regras puras e dados

### T4: Save v2 com a meta e migração da v1

**What**: Em `core/save.ts`: `SAVE_VERSION = 2`, `MetaSave`, `EMPTY_META()`, `validateMeta`, `MIGRATIONS[1]` (mantém
o `record`, cria `meta` vazia) e `serializeSave(record, meta)`. O único chamador (`recordDirector.ts:101`) passa
`EMPTY_META()` até a T18 trocar a escrita pela sessão (nenhuma meta existe no jogo antes disso). O
`record-save.smoke.mjs` passa a esperar a chave `{ version: 2, record, meta }`.
**Where**: `src/core/save.ts`
**Teste par**: `tests/core/save.test.ts`
**Depends on**: None
**Reuses**: `parseSave`, `migrate`, `isPlain`, `stringList`, `isIntAtLeast`
**Requirement**: MSV-01, MSV-02, MSV-04, MSV-05

**Done when**:

- [ ] MSV-01: ida e volta v2 com meta cheia
- [ ] MSV-02: v1 com recorde r7 → v2 com r7 e `meta` `{ unlocks: [], progress: {}, grimoire: [] }`
- [ ] MSV-04 nos dois lados: `meta` ausente; `unlocks` com número; `grimoire` não lista; `progress` -1, 1,5, `'2'` (inválidos) e 0 (válido)
- [ ] MSV-05: ids desconhecidos em `unlocks`, `progress` e `grimoire` voltam iguais no `serializeSave`
- [ ] Versão 3 → `newer`; os testes de migração injetada de hoje continuam (com `current` ajustado)
- [ ] Smoke `record-save` verde com a chave v2
- [ ] Gate verde; contagem = 3009 + novos

**Tests**: unit
**Gate**: full
**Commit**: `feat(core): bump the save to v2 with the meta block`

---

### T5: Conquistas: progresso, desbloqueio e mais perto

**What**: Em `core/unlocks.ts` (novo): `ContentKind`, `AchievementScope`, `AchievementDef`, `ContentTables`,
`Nearest`, `isActive(def, tables)` e a classe `Achievements` (`startRun`, `startRound`, `bump`, `reach`, `meet`,
`isUnlocked`, `active`, `dormant`, `nearest`, `data`) com as regras da seção "core/unlocks.ts" do design.
**Where**: `src/core/unlocks.ts`
**Teste par**: `tests/core/unlocks.test.ts`
**Depends on**: T4
**Reuses**: `MetaSave` de `core/save`
**Requirement**: UNL-01, UNL-02, UNL-03, UNL-04, CNQ-02, CNQ-03, CNQ-04, CNQ-05, CNQ-06, CNQ-14, FAL-02

**Done when**:

- [ ] Registro e tabelas injetados no teste (não depende do `data/unlocks.ts`)
- [ ] UNL-03/04: dormente não soma, não guarda progresso, fica fora de `active` e de `nearest`; ativa × dormente pela tabela
- [ ] CNQ-03 nos dois lados (L-010): `target - 1` fica trancada; `target` libera no mesmo `bump`/`reach`, e a chamada devolve o id
- [ ] CNQ-04 por escopo: `run` guarda o maior entre duas runs; `round` zera no `startRound` e guarda o maior; `total` soma entre runs; marco 0/1
- [ ] CNQ-05 (`reach` com a rodada) e CNQ-06 (`bump` por Kokusen, zera no `startRound`)
- [ ] CNQ-14: cumprir de novo devolve `[]`, e o progresso continua guardado
- [ ] Duas conquistas no mesmo evento: ids devolvidos na ordem do registro (caso de borda)
- [ ] FAL-02: maior razão; empate nos dois sentidos fica com a primeira do registro; razão 0 em todas → a 1ª ativa; nenhuma ativa trancada → `null`
- [ ] `data()` preserva ids desconhecidos do save (MSV-05)
- [ ] UNL-01: `src/core/unlocks.ts?raw` sem `phaser` e sem `localStorage`
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): track achievement progress and unlocks`

---

### T6: Registro das conquistas e tabelas de conteúdo

**What**: `data/unlocks.ts` (novo) com `ACHIEVEMENTS` (as 8 da CNQ-01, na ordem e com os rótulos exatos da spec),
`TEST_ACHIEVEMENTS` (`testeR2` → técnica `corte`; `testeContra` → talento `contraAfiado`), `CONTENT_NAMES` montado de
`TECHNIQUES`, `PERKS` e `VOWS` (`domainUpgrade` vazio), `STARTER = { offers: 3 }`,
`META_TOAST = { x: 480, y: 172, ms: 2500 }` e `GRIMOIRE_HINT_Y = 368`.
**Where**: `src/data/unlocks.ts`
**Teste par**: `tests/data/unlocks.test.ts`
**Depends on**: T5
**Reuses**: `TECHNIQUES`, `PERKS`, `VOWS`
**Requirement**: CNQ-01, UNL-02, UNL-03

**Done when**:

- [ ] CNQ-01: id, rótulo, alvo, escopo e conteúdo das 8 iguais à tabela da spec, na ordem
- [ ] UNL-02: todo registro (jogo e teste) com alvo inteiro >= 1, escopo e tipo válidos, ids únicos
- [ ] UNL-03: com as tabelas reais de hoje, as 8 do jogo são dormentes e as 2 de teste são ativas (o teste falha de propósito quando uma fase trouxer o conteúdo, e a task dessa fase troca a expectativa)
- [ ] `CONTENT_NAMES.technique.corte === TECHNIQUES.corte.name` e o mesmo para talento e voto
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(data): add the achievement registry`

---

### T7: Trava de conteúdo

**What**: `UnlockGate` em `core/unlocks.ts`: `allows(kind, id)` (falso só para conteúdo de conquista ativa e não
liberada), `lockedIds(kind)` e `filterCatalog(catalog)` (`technique` pelo tipo `technique`, `perk` pelo tipo `talent`,
os outros tipos passam), lendo o conjunto vivo do `Achievements`.
**Where**: `src/core/unlocks.ts`
**Teste par**: `tests/core/unlocks.test.ts`
**Depends on**: T5
**Reuses**: `ShopEntry` de `data/shop`
**Requirement**: UNL-05, UNL-06, UNL-07

**Done when**:

- [ ] UNL-05: conteúdo de conquista ativa trancada sai do catálogo e de `allows`; dormente não tranca
- [ ] UNL-06: conteúdo sem conquista sempre livre; com o registro do jogo e as tabelas de hoje, `filterCatalog(GAME_SHOP_CATALOG)` devolve o catálogo inteiro na mesma ordem
- [ ] UNL-07: depois do `bump` que libera, `allows` vira verdadeiro sem recriar o gate
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): gate locked content out of the offer draws`

---

### T8: Contra e golpe levado como regra pura

**What**: `isContraStrike(hit, moves)` (CNQ-10: `hit.counter` e o `moveName` é um Contra do moveset) e
`isPlayerHurt(hit, playerId)` (CNQ-11: golpe aceito de outro dono) em `core/unlocks.ts`.
**Where**: `src/core/unlocks.ts`
**Teste par**: `tests/core/unlocks.test.ts`
**Depends on**: None
**Reuses**: `Hit` de `core/hit`, `MOVES` de `data/moves`
**Requirement**: CNQ-10, CNQ-11

**Done when**:

- [ ] Contra do moveset com `counter: true` conta; `counter: true` sem `moveName` (ativação do Domínio) não conta; golpe comum não conta
- [ ] Golpe de inimigo, chefe e projétil no player conta como levado; golpe do próprio player não
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): tell counter strikes and player hurts apart`

---

### T9: Pool e sorteio da Técnica inicial

**What**: `core/starter.ts` (novo) com `starterPool(catalog, recipes, allows)` e `drawStarter(pool, rng, n)`, regras
da seção "core/starter.ts" do design.
**Where**: `src/core/starter.ts`
**Teste par**: `tests/core/starter.test.ts`
**Depends on**: None
**Reuses**: molde do `drawVows` (`core/vows.ts:33`); `GAME_SHOP_CATALOG`, `RECIPES`, `TECHNIQUES`
**Requirement**: STA-01, STA-02, STA-04

**Done when**:

- [ ] STA-01: só `kind: 'technique'`; nunca `roxo` nem qualquer `into` de receita; trancado fora; ordem de `TECHNIQUES`, não a do catálogo
- [ ] STA-02: 3 distintas; pool de 2 → as 2; pool vazio → `[]`
- [ ] STA-04: mesma seed e mesmo conjunto → mesmas cartas na mesma ordem
- [ ] Uniformidade: em 3000 seeds cada uma das 4 técnicas base aparece em 75% ± 3% dos sorteios
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): draw the starter technique offers`

---

### T10: Stream startRng na run

**What**: `core/run.ts` ganha o campo `startRngValue`, o getter `startRng` e
`this.startRngValue = new Rng(seed ^ 0xb5c0fbcf);` no `resolveStart`, junto dos outros streams. Antes de gravar,
conferir de novo por `grep` em `src/` e nas `.specs/` dos worktrees que o sal não foi tomado por outra fase.
**Where**: `src/core/run.ts`
**Teste par**: `tests/core/runStartRng.test.ts` (novo: `run.test.ts` está na exceção de tamanho)
**Depends on**: None
**Reuses**: molde dos 10 streams de `run.ts:297-307`
**Requirement**: STA-03

**Done when**:

- [ ] `run.startRng` gera a mesma sequência que `new Rng(seed ^ 0xb5c0fbcf)` depois do start
- [ ] O sal difere de todo sal literal em `run.ts?raw` e de `SHOP.rngSalt`
- [ ] Consumir o `startRng` não muda a sequência de nenhum outro stream
- [ ] `run.ts` ganha no máximo 5 linhas efetivas e nenhuma complexidade (oxlint igual); `tests/core/run.test.ts` intocado
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the starter rng stream to the run`

---

### T11: Grimório e dica da loja

**What**: `core/grimoire.ts` (novo) com `RecipePiece`, `RecipeView`, `recipeViews(RECIPES)`, `Grimoire` (`has`,
`add`, `list`) e `grimoireHint(views, inHand, known)`, regras da seção "core/grimoire.ts" do design.
**Where**: `src/core/grimoire.ts`
**Teste par**: `tests/core/grimoire.test.ts`
**Depends on**: None
**Reuses**: `RECIPES` (`into`, `from`, `name`), `TECHNIQUES[id].short`
**Requirement**: GRI-01, GRI-03, GRI-04, GRI-05, GRI-06, GRI-07

**Done when**:

- [ ] GRI-01: chave = `into` (`roxo`)
- [ ] GRI-03: `add` repetido devolve `false`; chave desconhecida fica na lista
- [ ] GRI-04 com 2 peças (0, 1 e 2 na mão) e com receitas falsas de 3 e 4 peças (limiar `ceil(n/2)` e "não todas" nos dois lados, L-010)
- [ ] GRI-05/06: textos exatos `Grimório: Vermelho + Azul → Vazio Roxo` (com os `short` reais) e `Grimório: Vermelho + ? → ?`
- [ ] GRI-07: duas receitas falsas elegíveis → a primeira da ordem
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the grimoire and the shop hint text`

---

### T12: Bloco da meta no painel de fim

**What**: `MetaSummary` e `metaLines(meta?)` em `core/runSummary.ts`; `summaryLines` aceita `meta?` e põe o bloco
entre a linha do recorde e `J / Enter para tentar de novo`.
**Where**: `src/core/runSummary.ts`
**Teste par**: `tests/core/runSummary.test.ts`
**Depends on**: None
**Reuses**: `listLines`, `SummaryLine.gap/highlight`, `panelBounds` (`game/RunSummaryPanel.ts`)
**Requirement**: FAL-01, FAL-03, FAL-04, FAL-05, FAL-06

**Done when**:

- [ ] FAL-01: `Falta pouco para: <nome> · <rótulo> (<progresso>/<alvo>)` exato
- [ ] FAL-03: `nearest: null` → sem a linha; sem liberados e sem `nearest` → sem bloco; `meta` ausente → linhas iguais às de hoje
- [ ] FAL-04: `Liberado: A, B` com `highlight` em toda linha da lista, quebra de lista longa como as outras
- [ ] FAL-05: bloco depois do recorde e antes do recomeço; `gap` só na primeira linha do bloco
- [ ] FAL-06: build cheia do END-14 + 2 liberados + a linha → `panelBounds` dentro de 960x540
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the meta block to the run summary lines`

---

## Phase 3: Carga, sessão e vistas sem cena

### T13: Carga da meta e parâmetros unlock= e grimoire=

**What**: `loadSave(params, storage, registryIds)` devolve `SaveLoad = { best, meta, storage, locked }`;
`SaveDebugParams` ganha `unlock` e `grimoire`; a tabela da seção "Carga do save" do design, um `if` por linha.
**Where**: `src/scenes/test/saveLoad.ts`
**Teste par**: `tests/scenes/saveLoad.test.ts`
**Depends on**: T2, T4
**Reuses**: `parseSave`, `EMPTY_META`
**Requirement**: MSV-04, MSV-05, MSV-10

**Done when**:

- [ ] Cada linha da tabela de carga do design, com porta falsa (inclusive v1 migrado com meta vazia, v2 válido com ids desconhecidos, meta inválida → vazia e `'local'`, versão > 2 → `locked`)
- [ ] `unlock=all` → todos os ids do registro passado; `unlock=none` → `[]`; `unlock=a,b,x` com `x` desconhecido → `[a, b]`
- [ ] `grimoire=a,b` → as chaves como vieram; qualquer um dos dois (ou `record=`) → `storage: 'off'`
- [ ] Nenhum parâmetro de debug chama `read` (contador da porta falsa)
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(scene): load the meta and the unlock debug params`

---

### T14: Sessão do save, porta única de escrita

**What**: `SaveSession` (novo, sem Phaser como valor) com `load`, `bind`, `requestWrite`, `flush`, `remount`,
`storageKind`, `locked`, regras da seção "saveSession.ts" do design.
**Where**: `src/scenes/test/saveSession.ts`
**Teste par**: `tests/scenes/saveSession.test.ts`
**Depends on**: T13
**Reuses**: `serializeSave`, `SaveStorage` (só o tipo)
**Requirement**: MSV-03, MSV-06, MSV-07, MSV-08, MSV-10, MSV-11

**Done when**:

- [ ] `load` lê a porta só na primeira chamada
- [ ] MSV-06: dois `requestWrite` antes do `flush` → uma escrita
- [ ] MSV-07: `flush` sem mudança → nenhuma escrita; progresso mudado → uma; v1 carregado e não mudado → nenhuma
- [ ] MSV-03: v1 carregado e depois mudado → texto escrito com `version: 2` e o mesmo recorde
- [ ] MSV-08: a fonte com o recorde antigo → o recorde antigo é escrito
- [ ] MSV-10: `off` e `locked` nunca escrevem
- [ ] MSV-11: `write` lançando → `storageKind === 'memory'`, nenhuma tentativa depois
- [ ] `remount` com pedido pendente faz o `flush`; sem pendência não escreve
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(scene): add the save session as the single write port`

---

### T15: Aviso da meta

**What**: `MetaToast` (`Text` em (480, 172), origem (0.5, 0.5), cor `META_COLORS.toast`, `push`, `current`, fila de
2500 ms no `POST_UPDATE` da cena com o `delta` real, solto no `SHUTDOWN`) e `META_COLORS = { toast: 'A', hint: 'S' }`.
**Where**: `src/game/MetaToast.ts`
**Teste par**: `tests/game/metaViews.test.ts`
**Depends on**: T6
**Reuses**: `META_TOAST`; estilo do banner do HUD; molde do `RecordMarker`
**Requirement**: CNQ-15

**Done when**:

- [ ] `META_COLORS` só com chaves da `PALETTE`
- [ ] L-043 com `Text` e cena falsos: texto, posição (480, 172) e cor repassados
- [ ] Tempo nos dois lados: 2499 ms de `POST_UPDATE` ainda mostra o 1º; 2500 ms mostra o 2º da fila; o 2º fica os seus 2500 ms; fila vazia → `current() === null` e o `Text` escondido
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(game): add the meta toast view`

---

### T16: Linha da dica do Grimório

**What**: `GrimoireHint` (`Text` em (480, `GRIMOIRE_HINT_Y`), origem (0.5, 0), 12 px, cor `META_COLORS.hint`, `set`,
`debug`).
**Where**: `src/game/GrimoireHint.ts`
**Teste par**: `tests/game/metaViews.test.ts`
**Depends on**: T15
**Reuses**: `META_COLORS`, `GRIMOIRE_HINT_Y`
**Requirement**: GRI-09

**Done when**:

- [ ] L-043: `set(texto)` mostra o texto na cor de `S`; `set(null)` esconde e `debug()` devolve `null`
- [ ] GRI-09: lendo `ShopPanel.ts?raw` (`CARD_TOP`, `CARD_H`), a dica fica abaixo de `CARD_TOP + CARD_H + 16 + 14`; `ShopPanel.ts` intocado
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(game): add the grimoire hint line`

---

### T17: Painel da Técnica inicial

**What**: `StarterPanel` no molde do `VowPanel` (profundidade 210, `uiLayer`, título `Técnica inicial` em (480, 130),
três cartas 170x130 a partir de y 170 com folga 18, rodapé `1-3 escolhe · Enter: sem técnica` em y 320, `show`,
`hide`, `debug`) e `STARTER_PANEL_COLORS`.
**Where**: `src/game/StarterPanel.ts`
**Teste par**: `tests/game/metaViews.test.ts`
**Depends on**: None
**Reuses**: `VowPanel` (estrutura, `css` local), `PALETTE`
**Requirement**: STA-05, STA-15

**Done when**:

- [ ] `STARTER_PANEL_COLORS` só com chaves da `PALETTE`
- [ ] Cálculo puro das caixas: as três cartas, o título e o rodapé dentro de 960x540 e centrados em x 480
- [ ] L-043: com `Text` falso, `show` repassa tecla, nome, `Nv 1/3` e texto de cada carta; `debug()` devolve título, cartas e rodapé exatos
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(game): add the starter technique panel view`

---

## Phase 4: Diretores da meta (sem tocar arquivos da F29)

### T18: A sessão assume a escrita do recorde

**What**: O `RunDirector` cria `this.save = new SaveSession(new SaveStorage(), fn => scene.events.once('postupdate', fn))`;
o `RecordDirector` carrega pela sessão, liga a fonte (`best` + meta vazia até a T21), e a morte chama `requestWrite()`
em vez de escrever; `uiSetup` chama `save.remount()` a cada `create`. Sai o `EMPTY_META()` provisório da T4.
**Where**: `src/scenes/test/recordDirector.ts`
**Depends on**: T14, T3
**Reuses**: `SaveSession`, `RecordBook.death`
**Requirement**: MSV-07, MSV-08, MSV-09

**Done when**:

- [ ] Smoke `record-save` verde sem mudar os passos (escrita na morte, empate não escreve, `round=3` não escreve, R não escreve, `setItem` lançando → `'memory'`)
- [ ] MSV-09: R no meio da run → chave igual (já no `record-save`)
- [ ] Smokes `record-end`, `record-hud`, `world-restart`, `boot` verdes
- [ ] Gate verde; contagem anotada

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(run): write the save through the save session`

---

### T19: Diretor da meta com conquistas e snapshot

**What**: `MetaDirector` (novo) com `mountUi` (cria `Achievements`, `UnlockGate`, `Grimoire` na primeira carga; recria
`MetaToast` e `GrimoireHint`), `gate`, `onCommand` (`startRun`: zera a run e decide `counting`; `roundStart`:
`startRound`, `reach('rodada5', round)`, `hurtThisRound = false`; `roundCleared`: `semDano`; `gameOver`), aviso e
evento `unlock:<id>` no desbloqueio, `unlockedThisRun`, `snapshot()`; `?debug&achievements=test` troca o registro.
Ligação: `runDirector` (campo `meta`, `meta.onCommand` e `meta.update` no `tick`), `uiSetup` (`meta.mountUi`),
`snapshot.ts` (`meta:`), `debugApi.ts` (tipo `MetaSnapshot` de `game/metaSnapshot.ts`) e o exemplo em
`tests/game/debugApi.test.ts`.
**Where**: `src/scenes/test/metaDirector.ts`
**Depends on**: T18, T5, T6, T7, T11, T15, T16
**Reuses**: `firstRoundForDebug`, `debugParam`, `snapshot.debugEvents`
**Requirement**: UNL-04, CNQ-02, CNQ-05, CNQ-11, CNQ-13, CNQ-14, CNQ-15, CNQ-16

**Done when**:

- [ ] `meta-unlock.smoke.mjs` (novo, `?debug&hd=1&area=modular&nosave=1`), parte 1: sem `achievements=` → `meta.registry` `'game'`, `active` vazio, `dormant` com os 8 ids na ordem, nenhum aviso; `achievements=test&unlock=none` → `active` `['testeR2', 'testeContra']`, `progress.testeR2` 1 na r1; limpar a r1 → no `roundStart` da r2 `unlock:testeR2` uma vez nos eventos, `meta.toast` `Liberado: Desmantelar` (nome lido de `TECHNIQUES.corte.name`), `unlockedThisRun` `['testeR2']`; o aviso some depois de 2500 ms reais
- [ ] CNQ-14: a r3 da mesma run não empurra outro `unlock:testeR2`
- [ ] CNQ-13: `round=3&achievements=test&unlock=none` → `counting: false`, nada soma nem libera ao começar a r4
- [ ] `unlock=all&achievements=test` → `unlocks` com os 2 ids, `storage: 'off'`
- [ ] Smokes `run-loop`, `world-restart`, `hud`, `boot`, `no-debug` verdes; `runDirector.ts` abaixo de 400 efetivas
- [ ] Gate verde; contagem anotada (debugApi)

**Tests**: smoke
**Gate**: full
**Commit**: `feat(meta): track achievements in a meta director`

---

### T20: Trava nas cartas da loja e no painel de votos

**What**: `shopDirector.openShop` cria a `Shop` com `meta.gate.filterCatalog(GAME_SHOP_CATALOG)`; `vowDirector.openPanel`
sorteia com `[...this.vows.list, ...meta.gate.lockedIds('vow')]` (1 linha cada).
**Where**: `src/scenes/test/shopDirector.ts`
**Depends on**: T19
**Reuses**: `UnlockGate.filterCatalog`, `lockedIds`
**Requirement**: UNL-05, UNL-06, UNL-07, UNL-08

**Done when**:

- [ ] `meta-unlock.smoke.mjs`, parte 2 (`achievements=test&unlock=none&seed=<achada>`): a loja da r1 (com reroll) nunca tem `corte`; depois do `unlock:testeR2` a loja seguinte tem `corte` (seed escolhida e anotada no smoke); uma loja aberta no quadro do desbloqueio não muda as cartas
- [ ] UNL-08: `achievements=test&unlock=none&tech=corte` → `corte` equipado no slot 0
- [ ] UNL-06: sem `achievements=` as cartas das lojas r1 e r2 com a mesma seed são iguais às de antes da task (anotadas antes de mudar)
- [ ] Smokes `shop`, `shop-progress`, `evolution`, `vows` verdes
- [ ] Gate verde; contagem anotada

**Tests**: smoke
**Gate**: full
**Commit**: `feat(meta): keep locked content out of the shop and vow draws`

---

### T21: Save da meta no meio da run e na morte

**What**: O `MetaDirector` liga a fonte da sessão (`best` do recorde + `Achievements.data()` + `Grimoire.list()`),
pede escrita a cada desbloqueio (MSV-06) e no `gameOver` (MSV-07); o `RecordDirector` deixa de mandar a meta vazia.
**Where**: `src/scenes/test/metaDirector.ts`
**Depends on**: T18, T19
**Reuses**: `SaveSession.bind`, `requestWrite`
**Requirement**: MSV-03, MSV-06, MSV-07, MSV-09, MSV-11, MSV-12

**Done when**:

- [ ] `meta-save.smoke.mjs` (novo, `nosave=0`, limpa a chave no começo e no fim): v1 gravado à mão com recorde r7 → carregar → `best.round` 7, meta vazia; morrer na r1 sem mudança de progresso → chave igual byte a byte (MSV-07); `achievements=test` sem `unlock=` → chegar à r2 → chave v2 escrita no meio da run com `unlocks: ['testeR2']` e recorde r7 (MSV-03, MSV-06); recarregar → `testeR2` liberado (MSV-12); chave com `progress: { testeR2: -1 }` → recorde vazio e meta vazia; `Storage.prototype.setItem` lançando → `storage: 'memory'`, aviso igual (MSV-11); R depois de ganhar progresso sem desbloqueio → chave igual (MSV-09)
- [ ] Smokes `record-save`, `record-end` verdes
- [ ] Gate verde; contagem anotada

**Tests**: smoke
**Gate**: full
**Commit**: `feat(meta): persist unlocks and progress in the save`

---

### T22: Liberados e "falta pouco" no fim da run

**What**: `MetaDirector.summary()` (nomes liberados na run e o `nearest` com nome, rótulo, progresso e alvo);
`RecordDirector.onDeath` passa `meta: runDirector.meta.summary()` ao `summaryLines`; o snapshot ganha `nearest`.
**Where**: `src/scenes/test/recordDirector.ts`
**Depends on**: T19, T12
**Reuses**: `Achievements.nearest`, `metaLines`
**Requirement**: FAL-01, FAL-02, FAL-03, FAL-04, FAL-05, FAL-07

**Done when**:

- [ ] `meta-unlock.smoke.mjs`, parte 3: `achievements=test&unlock=none`, morrer na r2 → `record.panel.lines` com `Liberado: Desmantelar` e `Falta pouco para: <nome de contraAfiado> · 1 Contra numa run (0/1)` antes de `J / Enter para tentar de novo`; `meta.nearest` `'testeContra'`
- [ ] Morrer na r1 com `unlock=none` → `Falta pouco para: Desmantelar · começar a r2 numa run (1/2)` e sem `Liberado:`
- [ ] FAL-03: sem `achievements=` → nenhuma linha do bloco, `nearest: null`; `unlock=all&achievements=test` → sem `Falta pouco`
- [ ] Smokes `record-end`, `hud`, `drops` verdes
- [ ] Gate verde; contagem anotada

**Tests**: smoke
**Gate**: full
**Commit**: `feat(meta): show unlocks and the nearest goal in the run summary`

---

### T23: Grimório na loja

**What**: `MetaDirector.onShopFrame(view)` (registra toda carta `evolution` na tela e atualiza a dica, escondida com o
painel de votos aberto) e `onRecipeSeen(key)` (fusão); registrar empurra `grimoire:<key>`, enfileira
`Grimório: <nome>` e pede escrita; `shopDirector` chama os dois (2 linhas); a dica some no `startRun`, `roundStart`,
`gameOver` e ao fechar a loja.
**Where**: `src/scenes/test/metaDirector.ts`
**Depends on**: T19, T21
**Reuses**: `recipeViews`, `Grimoire`, `grimoireHint`, `loadout.levelOf`, `build.perks`, `arsenal.snapshot().weapon`
**Requirement**: GRI-02, GRI-03, GRI-04, GRI-05, GRI-06, GRI-07, GRI-08, GRI-10, MSV-06

**Done when**:

- [ ] `meta-grimoire.smoke.mjs` (novo, `?debug&hd=1&area=modular&nosave=1`): `tech=vermelho` → loja → `meta.hint` `Grimório: Vermelho + ? → ?`; `grimoire=roxo` → `Grimório: Vermelho + Azul → Vazio Roxo`; `tech=vermelho,azul` → `hint: null`; `tech=azul:3,vermelho:3` → carta do Roxo na loja → `grimoire:roxo` uma vez e aviso `Grimório: <RECIPES[0].name>`; reroll → sem segundo evento (GRI-03); painel de votos aberto → `hint: null`; loja fechada → `hint: null`
- [ ] Fusão com a receita já vista não empurra evento
- [ ] Smokes `shop`, `evolution`, `vows` verdes
- [ ] Gate verde; contagem anotada

**Tests**: smoke
**Gate**: full
**Commit**: `feat(meta): remember seen recipes and hint them in the shop`

---

## Phase 5: Técnica inicial

### T24: Diretor da Técnica inicial

**What**: `StarterDirector` (novo) com `mountUi` (recria o painel, zera `open`, `offers`, `chosen`), `open`,
`onStartRun` (abre fora do `?debug`; com `?debug` só com `starter=1` e sem `tech=`; nunca no `fxlab`; pool vazio não
abre; pausa o Matter e descarta uma leitura do `ShopInput`), `update()` (lê 1-3/Enter, descarta um `controls.read()`,
reafirma a pausa; equipa com `loadout.equip(0, id, 1)`, eventos `starter:<id>` e `starterRefused`) e `snapshot()`.
Ligação: `runDirector` (campo `starter`, `starter.onStartRun()` no fim do `onStartRun`, `if (this.starter.update())
return;` no `tick`), `uiSetup` (`starter.mountUi`), `TestScene.ts` (`else if (!this.runDirector.starter.open)` antes do
`updateGameplay`), `meta.snapshot().starter`.
**Where**: `src/scenes/test/starterDirector.ts`
**Depends on**: T3, T9, T10, T17, T19
**Reuses**: `ShopInput.read`, `drawStarter`, `starterPool`, `meta.gate`, `previewText` da carta da loja, congelamento da loja
**Requirement**: STA-01, STA-02, STA-04, STA-05, STA-06, STA-07, STA-08, STA-09, STA-10, STA-11, STA-13, STA-14, STA-17

**Done when**:

- [ ] `meta-starter.smoke.mjs` (novo, `?debug&hd=1&area=modular&nosave=1&starter=1&seed=7`): Enter começa a run → painel aberto (STA-10), 3 ofertas distintas entre as 4 base, `run.state` `roundActive`, `run.round` 1, `enemies` 0, vida e energia do player iguais e o temporizador da run parado por 2000 ms (STA-06); 4 → nada muda (STA-09); nenhuma tecla por 5000 ms → painel aberto (STA-11)
- [ ] 2 → slot 0 = `offers[1]` no nível da 1ª compra, fragmentos iguais, `starter:<id>`, `meta.starter.chosen` igual, inimigos nascem (STA-07); a 1ª loja precifica o nível 2 dessa técnica (STA-13)
- [ ] Recarregar com a mesma seed → mesmas cartas na mesma ordem (STA-04); J no lugar do Enter também não fecha o painel (STA-10)
- [ ] Enter no painel → slots vazios, `starterRefused`, `chosen: null` (STA-08)
- [ ] Sem `starter=1` e com `tech=azul&starter=1` → painel fechado e a luta começa como hoje (STA-14)
- [ ] R com o painel aberto → cena nova jogável, painel fechado
- [ ] `TestScene.ts` em no máximo 395 linhas efetivas
- [ ] Smokes `run-loop`, `shop`, `fight`, `world-restart`, `no-debug` (fora do debug o painel abre e nada quebra no carregamento) verdes
- [ ] Gate verde; contagem anotada

**Tests**: smoke
**Gate**: full
**Commit**: `feat(run): open the starter technique panel before round one`

---

### T25: Banner da r1 e recomeço com o painel

**What**: O `applyRunCommand` só mostra o banner do `roundStart` com o painel fechado; o fechamento do painel mostra
`record.roundBanner(run.round)` por `RUN.bannerMs`; o J do painel de fim abre o painel no mesmo quadro.
**Where**: `src/scenes/test/runDirector.ts`
**Depends on**: T24
**Reuses**: `record.roundBanner`, `hud.banner`
**Requirement**: STA-12, STA-16

**Done when**:

- [ ] `meta-starter.smoke.mjs` estendido: com o painel aberto `hud.banner` escondido; apertar 1 → `Rodada 1` visível por 1500 ms e a luta volta no update seguinte; com `record=1` o fechamento mostra a variante do RMK-05 quando cabe
- [ ] STA-16: morrer, J aos 1000 ms → painel aberto; 1 aceito antes de 3000 ms da morte (tempo de jogo, passos de 1000/60 ms como no `record-end`)
- [ ] Smokes `record-hud`, `record-end`, `run-loop` verdes
- [ ] Gate verde; contagem anotada

**Tests**: smoke
**Gate**: full
**Commit**: `feat(run): show the round banner when the starter panel closes`

---

## Phase 6: Integração (pontos da F29 e das outras fases, no fim)

### T26: Golpes do combate na meta

**What**: `RunDirector.onConnect(hit)` (soma o dano do recorde no golpe do player e avisa a meta: Contra e golpe
levado) e `onBossFinisher(damage, killed)`; em `combat.ts` a linha do `record.onPlayerHit` vira
`this.s.runDirector.onConnect(hit);` no topo do `onConnect`, e `record.addDamage('golpe', damage)` vira
`runDirector.onBossFinisher(damage, boss.hp <= 0)`. O `MetaDirector` ganha `onPlayerStrike` (`contras`),
`onPlayerHurt` (`semDano`) e `onBossFinisher` (`finalizadorChefe`).
**Where**: `src/scenes/test/combat.ts`
**Depends on**: T8, T19, T22
**Reuses**: `isContraStrike`, `isPlayerHurt`
**Requirement**: CNQ-10, CNQ-11, CNQ-12

**Done when**:

- [ ] `meta-unlock.smoke.mjs`, parte 4 (`achievements=test&unlock=none`): um Contra aceito por um inimigo → `unlock:testeContra`, aviso com o nome do talento; um golpe comum não libera
- [ ] `semDano` e `finalizadorChefe`: com o conteúdo deles no código (grep de `horaExtra`/`proporcao` em `PERKS`), o smoke prova cada um (rodada r3 limpa sem golpe aceito; bloqueio e esquiva não contam; finalizador no chefe); sem o conteúdo, `meta.dormant` os lista e a citação das linhas de ligação vai para o Verifier
- [ ] `record.damage` igual ao de antes nos passos do `record-end` (soco, objeto, finalizador)
- [ ] `combat.ts` com no máximo +1 linha efetiva; smokes `record-end`, `fight`, `boss`, `finisher`, `defense` verdes
- [ ] Gate verde; contagem anotada

**Tests**: smoke
**Gate**: full
**Commit**: `feat(meta): count counters, hurts and the boss finisher`

---

### T27: Chefe derrotado na meta

**What**: `spawner.onBossDefeated` chama `this.s.runDirector.meta.onBossDefeated();` (1 linha); o `MetaDirector`
acompanha o chefe no `update` (chefe novo pelo `id` → limpo; slot ocupado com chefe vivo → sujo) e cumpre
`chefeSemTecnica` e `chefeR10`.
**Where**: `src/scenes/test/spawner.ts`
**Depends on**: T19
**Reuses**: `loadout.hasAny()`
**Requirement**: CNQ-07, CNQ-09

**Done when**:

- [ ] Com `restricaoCelestial` em `VOWS` ou `ressonancia` em `TECHNIQUES`: o smoke `meta-unlock` prova a conquista correspondente (chefe vencido sem técnica em nenhum quadro, e com técnica equipada no meio da luta não; chefe da r10 com `round=10` não conta por CNQ-13, então o caminho é o registro de teste ou a run inteira); sem o conteúdo, `meta.dormant` os lista e a citação da linha vai para o Verifier
- [ ] Smokes `boss-victory`, `world-boss`, `boss` verdes
- [ ] Gate verde; contagem anotada

**Tests**: smoke
**Gate**: full
**Commit**: `feat(meta): check boss wins for the boss achievements`

---

### T28: Kokusen na meta

**What**: `effects.onKokusen(target, point, facing, streak)` faz o que a lambda da `TestScene.ts:323-327` faz hoje
(`impactFx.kokusenFrame`, `kokusenFx.trigger`) e chama `runDirector.meta.onKokusen()`; a lambda vira uma linha.
**Where**: `src/scenes/test/effects.ts`
**Depends on**: T19
**Reuses**: a lambda de hoje
**Requirement**: CNQ-06

**Done when**:

- [ ] Smoke `kokusen` verde, com o mesmo quadro de Kokusen e o mesmo efeito
- [ ] Com `zonaNegra` em `PERKS`: o smoke prova 3 Kokusen na mesma rodada liberando e a contagem zerando na rodada seguinte; sem o conteúdo, `meta.dormant` lista `kokusenRodada` e a citação vai para o Verifier
- [ ] `TestScene.ts` perde pelo menos 3 linhas efetivas; smokes `tech`, `record-end` verdes
- [ ] Gate verde; contagem anotada

**Tests**: smoke
**Gate**: full
**Commit**: `feat(meta): count kokusen hits per round`

---

### T29: Sorteios e conteúdo das outras fases

**What**: Na hora da task, conferir por `grep` em `src/` quais fases já estão no código e ligar só o que existir:
fonte de `domainUpgrade` em `CONTENT_NAMES` (lista de melhorias da F31); `meta.onJackpot()` no `jackpot:hit`;
`gate.allows` nos candidatos do baú do chefe (F33), do Baú do Véu (F31), do sorteio de cartas da F30 e dos talentos da
F35; `unlock=all` nos smokes que já sorteiam conteúdo que ficou trancável (ex.: `talents.smoke.mjs`); expectativa da
T6 (`dormant`/`active` com as tabelas reais) atualizada. Sem nenhuma dessas fases no código, a task só registra no
`tasks.md` o resultado do `grep` e fecha sem mudança de código.
**Where**: `src/data/unlocks.ts`
**Depends on**: T20, T24
**Reuses**: `UnlockGate.allows`
**Requirement**: UNL-03, UNL-05, CNQ-08

**Done when**:

- [ ] Resultado do `grep` anotado (cada sorteio e conteúdo: presente/ausente)
- [ ] Para cada sorteio presente: teste de unidade de 200 seeds sem o trancado (no teste par do sorteio) e o smoke dele verde com `unlock=all`
- [ ] Para cada conquista que acordou: o smoke `meta-unlock` prova o desbloqueio no navegador
- [ ] Smokes de todas as fases presentes verdes; gate verde; contagem anotada

**Tests**: smoke
**Gate**: full
**Commit**: `feat(meta): gate the draws of the merged phases`

---

### T30: README e mapa do CLAUDE.md

**What**: `README.md` ganha `starter=1`, `unlock=`, `grimoire=`, `achievements=test` e os eventos `starter:<id>`,
`starterRefused`, `unlock:<id>`, `grimoire:<key>`; `CLAUDE.md` ganha a linha "Meta (conquistas, Grimório, Técnica
inicial)" na tabela "Onde mexer" (`core/unlocks`, `starter`, `grimoire`, `save`; `data/unlocks`;
`scenes/test/metaDirector`, `starterDirector`, `saveSession`; smoke `meta-`).
**Where**: `README.md`
**Depends on**: T29
**Reuses**: seções de debug do README
**Requirement**: STA-14, CNQ-16 (documentação dos parâmetros)

**Done when**:

- [ ] Cada parâmetro com exemplo de URL `?debug&hd=1&area=modular`; tabela do `CLAUDE.md` com a linha nova
- [ ] Gate verde

**Tests**: none (docs: a matriz diz none)
**Gate**: build
**Commit**: `docs: document the meta debug params`

---

## Requirement Coverage

| Requirement | Tasks |
| --- | --- |
| STA-01 | T9, T24 |
| STA-02 | T9, T24 |
| STA-03 | T10 |
| STA-04 | T9, T24 |
| STA-05 | T1, T17, T24 |
| STA-06 | T3, T24 |
| STA-07 | T1, T24 |
| STA-08 | T24 |
| STA-09 | T24 |
| STA-10 | T24 |
| STA-11 | T24 |
| STA-12 | T25 |
| STA-13 | T24 |
| STA-14 | T24, T30 |
| STA-15 | T17 |
| STA-16 | T25 |
| STA-17 | T24 |
| CNQ-01 | T6 |
| UNL-01 | T5 |
| UNL-02 | T5, T6 |
| UNL-03 | T5, T6, T29 |
| UNL-04 | T5, T19 |
| UNL-05 | T7, T20, T29 |
| UNL-06 | T7, T20 |
| UNL-07 | T7, T20 |
| UNL-08 | T20 |
| CNQ-02 | T5, T19 |
| CNQ-03 | T5 |
| CNQ-04 | T5 |
| CNQ-05 | T5, T19 |
| CNQ-06 | T5, T28 |
| CNQ-07 | T27 |
| CNQ-08 | T29 |
| CNQ-09 | T27 |
| CNQ-10 | T8, T26 |
| CNQ-11 | T8, T19, T26 |
| CNQ-12 | T26 |
| CNQ-13 | T19 |
| CNQ-14 | T5, T19 |
| CNQ-15 | T15, T19 |
| CNQ-16 | T19, T30 |
| MSV-01 | T4 |
| MSV-02 | T4 |
| MSV-03 | T14, T21 |
| MSV-04 | T4, T13 |
| MSV-05 | T4, T13 |
| MSV-06 | T14, T21, T23 |
| MSV-07 | T14, T18, T21 |
| MSV-08 | T14, T18 |
| MSV-09 | T18, T21 |
| MSV-10 | T2, T13, T14 |
| MSV-11 | T14, T21 |
| MSV-12 | T21 |
| GRI-01 | T11 |
| GRI-02 | T23 |
| GRI-03 | T11, T23 |
| GRI-04 | T11, T23 |
| GRI-05 | T11, T23 |
| GRI-06 | T11, T23 |
| GRI-07 | T11, T23 |
| GRI-08 | T23 |
| GRI-09 | T16 |
| GRI-10 | T23 |
| FAL-01 | T12, T22 |
| FAL-02 | T5, T22 |
| FAL-03 | T12, T22 |
| FAL-04 | T12, T22 |
| FAL-05 | T12, T22 |
| FAL-06 | T12 |
| FAL-07 | T22 |

**Coverage:** 70 de 70 requisitos mapeados.

Casos de borda da spec: pool vazio (T9, T24); duas conquistas no mesmo update (T5, T14); morte no update de uma
conquista (T22, conferido no smoke ao morrer no `roundStart` da r2 com `testeR2`); Restrição sem Amplificação (T29,
regra da F40); `techGate` não vale para a Técnica inicial (T9: o pool ignora o `techGate`); id removido no save (T4,
T5); `unlock=` com id desconhecido (T13); R com o painel aberto (T24).

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6

Phase 1:  T1
          T2
          T3
Phase 2:  T4 → T5 → T6
          T5 → T7
          T8   T9   T10   T11   T12
Phase 3:  T13 → T14
          T15 → T16
          T17
Phase 4:  T18 → T19 → T20
          T18 → T21, T19 → T21
          T19 → T22
          T19 → T23, T21 → T23
Phase 5:  T24 → T25
Phase 6:  T26   T27   T28
          T29 → T30
```

Execução estritamente sequencial, na ordem T1 a T30. São 30 tasks; em lotes de ~7 sem cortar phase: Phases 1-2
(12 tasks, todas curtas e quase todas de unidade), Phase 3 (5), Phase 4 (6), Phases 5-6 (7). Um agente novo por lote.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | 1 decisão no STATE | ✅ Granular |
| T2 | 1 renomeação (arquivo + teste + 1 import) | ✅ Granular |
| T3 | 1 método no RunDirector + 2 linhas da cena | ✅ Granular |
| T4 | 1 módulo puro (formato + migração, coesos) + o chamador provisório | ⚠️ OK, coeso |
| T5 | 1 classe pura com os tipos dela | ✅ Granular |
| T6 | 1 arquivo de dados | ✅ Granular |
| T7 | 1 classe pura | ✅ Granular |
| T8 | 2 predicados puros do mesmo assunto | ✅ Granular |
| T9 | 2 funções puras do mesmo sorteio | ✅ Granular |
| T10 | 1 stream | ✅ Granular |
| T11 | 1 módulo puro | ✅ Granular |
| T12 | 1 função pura | ✅ Granular |
| T13 | 1 função (tabela de carga) | ✅ Granular |
| T14 | 1 classe | ✅ Granular |
| T15 | 1 vista | ✅ Granular |
| T16 | 1 vista | ✅ Granular |
| T17 | 1 vista | ✅ Granular |
| T18 | 1 troca de porta de escrita (diretor + construtor + 1 linha do `uiSetup`) | ✅ Granular |
| T19 | 1 diretor + ligações de 1 linha em 4 arquivos (sem elas o diretor não é verificável: merge forward) | ⚠️ OK, coeso |
| T20 | 2 pontos de 1 linha (loja e votos), a mesma trava | ✅ Granular |
| T21 | 1 ligação de fonte + pedidos de escrita | ✅ Granular |
| T22 | 1 método + 1 argumento no `summaryLines` | ✅ Granular |
| T23 | 2 métodos do diretor + 2 linhas da loja | ✅ Granular |
| T24 | 1 diretor + ligações de 1 linha em 3 arquivos (merge forward) | ⚠️ OK, coeso |
| T25 | 1 regra de banner | ✅ Granular |
| T26 | 2 entradas de evento + 2 linhas em `combat.ts` | ✅ Granular |
| T27 | 1 entrada de evento + 1 linha em `spawner.ts` | ✅ Granular |
| T28 | 1 método + 1 lambda | ✅ Granular |
| T29 | ligação condicional ao que existir (pode ser vazia) | ⚠️ OK, depende do código na hora |
| T30 | 2 docs | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | T1 sozinho | ✅ Match |
| T2 | None | T2 sozinho | ✅ Match |
| T3 | None | T3 sozinho | ✅ Match |
| T4 | None | início da Phase 2 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |
| T7 | T5 | T5 → T7 | ✅ Match |
| T8 | None | T8 sozinho | ✅ Match |
| T9 | None | T9 sozinho | ✅ Match |
| T10 | None | T10 sozinho | ✅ Match |
| T11 | None | T11 sozinho | ✅ Match |
| T12 | None | T12 sozinho | ✅ Match |
| T13 | T2, T4 (phases anteriores) | início da Phase 3 | ✅ Match |
| T14 | T13 | T13 → T14 | ✅ Match |
| T15 | T6 (phase anterior) | início de cadeia | ✅ Match |
| T16 | T15 | T15 → T16 | ✅ Match |
| T17 | None | T17 sozinho | ✅ Match |
| T18 | T14, T3 (phases anteriores) | início da Phase 4 | ✅ Match |
| T19 | T18; T5, T6, T7, T11, T15, T16 (phases anteriores) | T18 → T19 | ✅ Match |
| T20 | T19 | T19 → T20 | ✅ Match |
| T21 | T18, T19 | T18 → T21, T19 → T21 | ✅ Match |
| T22 | T19; T12 (phase anterior) | T19 → T22 | ✅ Match |
| T23 | T19, T21 | T19 → T23, T21 → T23 | ✅ Match |
| T24 | T3, T9, T10, T17, T19 (phases anteriores) | início da Phase 5 | ✅ Match |
| T25 | T24 | T24 → T25 | ✅ Match |
| T26 | T8, T19, T22 (phases anteriores) | T26 sozinho | ✅ Match |
| T27 | T19 (phase anterior) | T27 sozinho | ✅ Match |
| T28 | T19 (phase anterior) | T28 sozinho | ✅ Match |
| T29 | T20, T24 (phases anteriores) | início de cadeia | ✅ Match |
| T30 | T29 | T29 → T30 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Decisão (`STATE.md`) | none | none | ✅ OK |
| T2 | Carga sem cena (+ 1 import no diretor) | unit (+ smoke do diretor) | unit, gate full com `record-save` | ✅ OK |
| T3 | Adaptador de cena | smoke | smoke | ✅ OK |
| T4 | Regra pura (+ smoke existente ajustado) | unit | unit, gate full com `record-save` | ✅ OK |
| T5 | Regra pura | unit | unit | ✅ OK |
| T6 | Dados | unit | unit | ✅ OK |
| T7 | Regra pura | unit | unit | ✅ OK |
| T8 | Regra pura | unit | unit | ✅ OK |
| T9 | Regra pura | unit | unit | ✅ OK |
| T10 | Regra pura | unit | unit | ✅ OK |
| T11 | Regra pura | unit | unit | ✅ OK |
| T12 | Regra pura | unit | unit | ✅ OK |
| T13 | Carga sem cena | unit | unit | ✅ OK |
| T14 | Sessão sem cena | unit | unit | ✅ OK |
| T15 | Vista sem cena | unit | unit | ✅ OK |
| T16 | Vista sem cena | unit | unit | ✅ OK |
| T17 | Vista sem cena | unit | unit | ✅ OK |
| T18 | Adaptador de cena | smoke | smoke | ✅ OK |
| T19 | Adaptador de cena + tipo de debug | smoke (+ unit do `debugApi`) | smoke | ✅ OK |
| T20 | Adaptador de cena | smoke | smoke | ✅ OK |
| T21 | Adaptador de cena | smoke | smoke | ✅ OK |
| T22 | Adaptador de cena | smoke | smoke | ✅ OK |
| T23 | Adaptador de cena | smoke | smoke | ✅ OK |
| T24 | Adaptador de cena | smoke | smoke | ✅ OK |
| T25 | Adaptador de cena | smoke | smoke | ✅ OK |
| T26 | Adaptador de cena | smoke | smoke | ✅ OK |
| T27 | Adaptador de cena | smoke | smoke | ✅ OK |
| T28 | Adaptador de cena | smoke | smoke | ✅ OK |
| T29 | Dados + adaptadores das fases presentes | unit + smoke | smoke (+ unit por sorteio presente) | ✅ OK |
| T30 | Docs | none | none | ✅ OK |
