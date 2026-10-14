# Recorde e recomeço — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/recorde-e-recomeco/spec.md`
**Design**: `.specs/features/recorde-e-recomeco/design.md`
**Status**: Draft
**Branch**: `feat/recorde-e-recomeco`

---

## Test Coverage Matrix

> Guidelines: `CLAUDE.md` (camadas, gate, smoke só do que foi tocado, HD é a base), `.oxlintrc.json` (400 linhas
> efetivas, 80 por função, complexidade 15; arquivo novo nunca entra nas exceções), `vitest.config.*`; lições L-010
> (limiar nos dois lados), L-043 (o adaptador repassa o valor que a regra decidiu), L-076 (campo de debug que só repete
> a entrada não prova o efeito). Amostras: `tests/core/*.test.ts` (teste par de cada `core/`),
> `tests/game/vowPanel.test.ts` (cores por chave da paleta), `scripts/smoke/vows.smoke.mjs`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Regra pura (`src/core/**`) | unit | 1:1 com os ACs; cada empate e limiar nos dois lados (L-010); casos de borda da spec | `tests/core/<arquivo>.test.ts` | `npm test` |
| Adaptador sem cena (`src/game/saveStorage.ts`, cores e quebra de linha das vistas) | unit | Todos os caminhos de exceção; só chaves da `PALETTE`; o adaptador repassa o que a regra decidiu (L-043) | `tests/game/<arquivo>.test.ts` | `npm test` |
| Adaptadores de cena (`src/scenes/**`, ligação no `TechRunner`, `combat`, `effects`) | smoke | Efeito lido do jogo vivo pelo snapshot (L-076), happy path + bordas da spec; smoke novo com `?debug&hd=1&area=modular` | `scripts/smoke/record-*.smoke.mjs` + smokes existentes tocados | `npm run smoke -- <trecho>` |
| Ferramentas e docs (`scripts/smoke/run.mjs`, `README.md`) | none | build gate + smokes existentes iguais | - | `npm run gate` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tasks com teste de unidade (core, adaptador sem cena) | `npm run gate` |
| Full | Tasks de adaptador de cena | `npm run gate && npm run smoke -- <smoke da task>` (um trecho por vez) |
| Build | Ferramenta ou docs | `npm run gate` (+ os smokes existentes listados na task, que devem sair iguais) |

Base: 2913 testes de unidade (146 arquivos) no commit desta especificação.
Smokes instáveis conhecidos: `armed` (ARM-12) e timeouts sob carga; repetir isolado antes de suspeitar.

**Regras de execução desta feature**

- Refatorações primeiro (Phase 1), cada uma com os smokes existentes iguais antes e depois.
- A F29 mexe em paralelo em `combat.ts`, `effects.ts` e `runDirector.ts` (linhas 51, 67, 85): todo toque nesses
  arquivos fica na Phase 5, a última, em commits de 1 a 2 linhas por arquivo (o design pedia um commit só; aqui são
  commits pequenos e consecutivos no fim da branch, para cada um ser verificável sozinho e o merge resolver um por vez).
- `TestScene.ts` (399/400) só muda a lambda da linha 319, sem ganhar linha efetiva. `Hud.ts`, `core/run.ts` e
  `tests/core/run.test.ts` não são tocados.

---

## Execution Plan

Phases são sequenciais; dentro da phase as tasks rodam na ordem.

### Phase 1: Refatorações (smokes iguais)

```
T1 → T2
```

### Phase 2: Regras puras

```
T3 → T4
T3 → T6
T5 → T6
```

### Phase 3: Adaptadores sem cena

```
T7
T8 → T9
```

### Phase 4: Diretor do recorde (sem tocar arquivos da F29)

```
T10
```

### Phase 5: Integração (pontos da F29, no fim)

```
T11 → T12
T11 → T13 → T14
```

---

## Task Breakdown

## Phase 1: Refatorações (smokes iguais)

### T1: Origem da técnica no callback de acerto

**What**: O `TechRunner` monta um `TechContext` por técnica (`ctxFor(id)`) que embrulha `onTechHit` e passa a
`source: TechId` como terceiro argumento; a assinatura do construtor vira `onTechHit: (hit, point, source) => void`.
A lambda da `TestScene.ts:319` não muda (ignora o argumento novo); nenhum `tech/*.ts` muda; o Kokusen usa o contexto
do Divergente (base de DMG-07).
**Where**: `src/game/TechRunner.ts`
**Depends on**: None
**Reuses**: `TechContext` de `game/tech/shared.ts`
**Requirement**: DMG-02 (preparação), DMG-07 (preparação)

**Done when**:

- [ ] `TechRunner.ts` passa de 92 para no máximo 95 linhas efetivas; `tech/*.ts` e `TestScene.ts` intocados
- [ ] Mesma contagem de testes da base (2913)
- [ ] Smokes `tech`, `kokusen`, `red-anime` verdes, iguais ao antes
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(tech): tell the tech hit callback which technique landed`

---

### T2: Smokes sem save por padrão

**What**: `withNoSave` no `wrapGoto` do runner: toda URL sem `nosave=` nem `record=` ganha `nosave=1`, para o
`localStorage` de um smoke não virar recorde em outro. Hoje o parâmetro não existe no jogo, então nada muda.
**Where**: `scripts/smoke/run.mjs`
**Depends on**: T1
**Reuses**: molde de `withLegacyRoom` / `withLegacyBody`
**Requirement**: REC-07 (isolamento dos smokes, risco do design)

**Done when**:

- [ ] `withNoSave` aplicado junto dos outros embrulhos, com comentário em português
- [ ] Smokes `hud`, `drops`, `run-loop` verdes, iguais ao antes
- [ ] Gate verde

**Tests**: none (ferramenta: a matriz diz none; os smokes existentes iguais são a prova)
**Gate**: build
**Commit**: `test(smoke): run every scenario without the save by default`

---

## Phase 2: Regras puras

### T3: Formato, validação e migração do save

**What**: `core/save.ts` com `SAVE_KEY`, `SAVE_VERSION = 1`, `MIGRATIONS` (vazio), `parseSave(raw, migrations,
current)` devolvendo `LoadResult` (`ok`/`empty`/`invalid`/`newer`), `validateRecord`, `serializeSave` e os tipos
`LeveledId`, `RecordBuild`, `RunRecord`, `SaveData`.
**Where**: `src/core/save.ts`
**Teste par**: `tests/core/save.test.ts`
**Depends on**: None
**Reuses**: nada (arquivo novo, sem Phaser)
**Requirement**: SAVE-01, SAVE-02, SAVE-03, SAVE-04, SAVE-05, SAVE-06

**Done when**:

- [ ] Ida e volta `serializeSave` → `parseSave`; `null`, string vazia e JSON inválido → `empty`/`invalid`
- [ ] Cada campo nos dois lados: `round` 0 e 1, `kills` -1 e 0, `level` 0 e 1, não inteiro (1.5), tipo errado, `version` não inteira
- [ ] Migração injetada `{1: ..., 2: ...}` com `current = 3` aplicada em ordem (o teste prova a ordem); passo faltando → `invalid`; `version` maior → `newer`
- [ ] Id desconhecido continua válido (caso de borda)
- [ ] SAVE-01: lê `src/core/save.ts?raw` e garante sem `phaser` e sem `localStorage`
- [ ] Gate verde; contagem = base + novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the versioned save format`

---

### T4: Livro do recorde

**What**: `core/recordBook.ts` com `isBetter(run, best)` e `RecordBook` (`best`, `passed`, `lastDeathNewRecord`,
`startRun`, `roundBanner`, `marker(round, state)`, `death(run, { canRecord })` → `{ newRecord, write }`).
**Where**: `src/core/recordBook.ts`
**Teste par**: `tests/core/recordBook.test.ts`
**Depends on**: T3
**Reuses**: `RunRecord` de `core/save`, `RunState` de `core/run`
**Requirement**: REC-01, REC-02, REC-03, REC-09, RMK-01, RMK-03, RMK-04, RMK-05, RMK-06, RMK-07, END-10, END-11

**Done when**:

- [ ] REC-02 nos dois lados de cada empate (L-010): rodada igual com abates +1/igual/-1; rodada +1/-1; sem recorde sempre melhor
- [ ] REC-03: empate exato e pior → `write: false`, recorde antigo fica; `canRecord: false` não troca nada
- [ ] Marcador por estado: escondido sem recorde, em `title` e `gameOver`; visível em `roundActive`, `intermission`, `traverse`, `shop`; `round > best.round` mostra a rodada atual com `highlight`
- [ ] Banner: `Rodada N · Novo recorde!` só em `best.round + 1`, uma vez por run, de novo depois de `startRun`; sem recorde nunca comemora
- [ ] Gate verde; contagem = anterior + novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): track the run record, its marker and banner`

---

### T5: Registro de dano por fonte

**What**: `DamageSource`, `DAMAGE_SOURCES` (golpe, técnicas na ordem de `TechId`, objeto) e `DamageLedger` (`add`,
`reset`, `totals`, `rows` com rótulo, dano e porcentagem arredondados) em `core/runSummary.ts`.
**Where**: `src/core/runSummary.ts`
**Teste par**: `tests/core/runSummary.test.ts`
**Depends on**: None
**Reuses**: `TechId`, `TECHNIQUES[id].name` (rótulos)
**Requirement**: END-08, DMG-06, DMG-07

**Done when**:

- [ ] `rows` filtra dano 0, ordena do maior ao menor, desempate pela ordem de `DAMAGE_SOURCES`
- [ ] Arredondamento: dano inteiro; soma das porcentagens 100 ± 1 com três fontes de frações difíceis
- [ ] `reset` zera todas as fontes (DMG-06); rótulos `Golpe`, `Objeto` e nome da técnica
- [ ] Gate verde; contagem = anterior + novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the run damage ledger by source`

---

### T6: Linhas do painel de fim

**What**: `summaryLines(input)` em `core/runSummary.ts`: rodada, abates, fragmentos, técnicas, passivas, arsenal,
votos, dano por fonte, linha do recorde e a última linha `J / Enter para tentar de novo`; listas acima de 100
caracteres quebram em `, ` numa segunda linha.
**Where**: `src/core/runSummary.ts`
**Teste par**: `tests/core/runSummary.test.ts`
**Depends on**: T3, T5
**Reuses**: `TECHNIQUES`, `PERKS`, `ARSENAL`, `VOWS` de `data/`; `DamageLedger.rows`
**Requirement**: END-03, END-04, END-05, END-06, END-07, END-08, END-09, END-10, END-11, END-12

**Done when**:

- [ ] Cada lista com itens e vazia (`Técnicas: nenhuma`, `Passivas: nenhuma`, `Arsenal: nenhum`, `Votos: nenhum`, `Dano: nenhum`)
- [ ] Id desconhecido some da linha sem quebrar as outras (caso de borda)
- [ ] `Recorde!` com `highlight` quando bateu; `Recorde: rN` sem `highlight` quando não; nenhuma linha sem recorde
- [ ] Última linha exata; quebra em `, ` acima de 100 caracteres (99, 100 e 101 nos dois lados)
- [ ] Gate verde; contagem = anterior + novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): build the run summary lines`

---

## Phase 3: Adaptadores sem cena

### T7: Porta do localStorage

**What**: `SaveStorage` (`kind: 'local' | 'memory'`, `read`, `write`), a única porta de `src/` para o
`localStorage`; qualquer exceção (inclusive no getter) vira `'memory'` e não tenta mais.
**Where**: `src/game/saveStorage.ts`
**Teste par**: `tests/game/saveStorage.test.ts`
**Depends on**: None
**Reuses**: nada
**Requirement**: SAVE-01, SAVE-07

**Done when**:

- [ ] Storage falso: leitura e escrita; `getItem`, `setItem` e o getter lançando → `'memory'`, sem exceção, `null`/`false`
- [ ] Em `'memory'` o storage falso não é mais chamado (contador)
- [ ] Varredura `import.meta.glob('/src/**/*.ts', { query: '?raw' })`: só `game/saveStorage.ts` diz `localStorage`
- [ ] Gate verde; contagem = anterior + novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(game): add the local storage port for the save`

---

### T8: Marcador do recorde

**What**: `RecordMarker` (`Text` em (948, 44), origem (1, 0), `RUN_TEXT_STYLE`, `set(view)`, `debug()`) e
`RECORD_COLORS = { text: 'w', highlight: 'A', bg: 'k' }`.
**Where**: `src/game/RecordMarker.ts`
**Teste par**: `tests/game/recordViews.test.ts`
**Depends on**: T4
**Reuses**: `RUN_TEXT_STYLE`, `css` de `game/Hud.ts`; `PALETTE`; molde de `tests/game/vowPanel.test.ts`
**Requirement**: RMK-02, RMK-07, RMK-08

**Done when**:

- [ ] `RECORD_COLORS` só com chaves da `PALETTE`
- [ ] L-043: com um `Text` falso, `set({ highlight: true })` chama `setColor` com a cor de `A` e `highlight: false` com a de `w`; `visible` e texto repassados
- [ ] `Hud.ts` intocado
- [ ] Gate verde; contagem = anterior + novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(game): add the record marker view`

---

### T9: Painel de fim de run

**What**: `RunSummaryPanel`: fundo `PALETTE.k` a 0,85 e uma coluna de `Text` (13 px, 16 px por linha) centrada em
(480, 270); `show(lines)`, `hide()`, `debug()` com `visible`, `lines` e `bounds`; linha com `highlight` na cor `A`.
**Where**: `src/game/RunSummaryPanel.ts`
**Teste par**: `tests/game/recordViews.test.ts`
**Depends on**: T8, T6
**Reuses**: `RECORD_COLORS`; `SummaryLine` de `core/runSummary`
**Requirement**: END-01, END-14

**Done when**:

- [ ] Cálculo de `bounds` puro e testado: 19 linhas cabem em 960x540 centradas em (480, 270); a linha `highlight` usa a cor `A`
- [ ] Gate verde; contagem = anterior + novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(game): add the run summary panel view`

---

## Phase 4: Diretor do recorde (sem tocar arquivos da F29)

### T10: Diretor do recorde com carga do save e snapshot

**What**: `RecordDirector` com `load` (tabela de carga do design: `record=N`, `nosave=1`, getter lançando, ausente/
inválido, versão menor, versão maior → `locked`), `mountUi(layer)` (recria marcador e painel a cada `create`,
escondidos) e `snapshot()`; tipo `RecordSnapshot` em `game/recordSnapshot.ts`. Ligação fora dos pontos da F29:
`runDirector` constructor (`this.record = new RecordDirector(s)`, linha 20), `uiSetup` (`mountUi`), `snapshot.ts`
(`record:`), `debugApi.ts` (campo no `GameSnapshot`) + exemplo em `tests/game/debugApi.test.ts`; `README.md` ganha
`nosave=1` e `record=N`.
**Where**: `src/scenes/test/recordDirector.ts`
**Depends on**: T3, T4, T7, T8, T9
**Reuses**: `debugParam`, `debugIntParam` (`scenes/test/params.ts`); `firstRoundForDebug`
**Requirement**: SAVE-04, SAVE-05, SAVE-07, REC-07, REC-08, REC-10

**Done when**:

- [ ] `record-save.smoke.mjs` (novo, `?debug&hd=1&area=modular`), parte de carga: `nosave=0` com chave válida → `best` lido e `storage: 'local'`; `nosave=1` → `best: null`, `storage: 'off'`; `record=4` → `best.round = 4`, `'off'`; `record=4&nosave=1` → `record` ganha; `record=abc` ignorado; chave com `version: 9` → `locked`, chave intacta; `evaluateOnNewDocument` fazendo `getItem` lançar → `storage: 'memory'`, console sem erro; limpa a chave no começo e no fim
- [ ] Smokes `world-restart` (R recria as vistas sem erro), `hud`, `boot`, `no-debug` verdes
- [ ] `runDirector.ts` só ganha as linhas do construtor; `TestScene.ts` intocado; nenhum arquivo novo nas exceções do lint
- [ ] Gate verde; contagem = anterior + novos

**Tests**: smoke
**Gate**: full
**Commit**: `feat(scene): load the record in a director and expose it in the snapshot`

---

## Phase 5: Integração (pontos da F29, no fim)

### T11: Morte grava o recorde e abre o painel

**What**: `RecordDirector.onCommand`: `startRun` (zera o registro, esconde o painel, `book.startRun`), `gameOver`
(monta o `RunRecord` com `loadout.slotsView`, `build.perks`, `arsenal.snapshot()`, `vows.snapshot().taken`;
`book.death`; grava se `write` e não travado; `hud.setCenter(null)`, marcador escondido, painel com
`summaryLines`). Em `runDirector.ts`: `this.record.onCommand(cmd)` depois do `area.onCommand` (linha 51) e o
`case 'gameOver'` com `setCenter` sai (linhas 85-92). `hud.smoke.mjs` e `drops.smoke.mjs` passam a ler
`snap.record.panel.lines`.
**Where**: `src/scenes/test/recordDirector.ts` (e 2 pontos do `runDirector`, ver What)
**Depends on**: T10
**Reuses**: `serializeSave`, `SaveStorage.write`, `summaryLines`
**Requirement**: SAVE-02, SAVE-07, REC-01, REC-03, REC-04, REC-05, REC-06, REC-09, REC-10, RMK-04, END-01, END-02, END-03, END-09, END-10, END-11, END-12, END-13, END-15, DMG-06, RST-01, RST-02, RST-03, RST-04

**Done when**:

- [ ] `record-save.smoke.mjs`, parte de morte: morrer na r1 → chave `{ version: 1, record }` escrita, `lastDeathRecord`; recarregar → `best.round = 1`; morrer de novo na r1 com 0 abates → chave igual byte a byte (empate); `round=3&nosave=0` → não grava; R durante a run não grava; `setItem` lançando → painel com `Recorde!`, `storage: 'memory'`, `best` atualizado
- [ ] `record-end.smoke.mjs` (novo): morrer sem dano → painel visível com `Rodada alcançada`, `Abates`, `Fragmentos`, `Dano: nenhum`, última linha; `hud.center === null`; J em 999 ms fica em `gameOver`; J em 1000 ms → `roundActive` na r1, `player.dead = false`, vida cheia antes de 3000 ms da morte (tempo de jogo), painel escondido, `damage` zerado, sem recarregar a página
- [ ] Smokes `hud`, `drops`, `run-loop`, `world-restart`, `vows`, `build` verdes
- [ ] `runDirector.ts` termina com menos linhas efetivas que antes; gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(run): save the record on death and show the run summary`

---

### T12: Marcador e banner do recorde na run

**What**: `roundStart` mostra o marcador pelo `book.marker`; `RecordDirector.roundBanner(round)` alimenta o
`hud.banner` da linha 67 do `runDirector.ts` (troca de expressão, 0 linhas efetivas).
**Where**: `src/scenes/test/runDirector.ts` (e o diretor do recorde)
**Depends on**: T11
**Reuses**: `RecordBook.marker`, `RecordBook.roundBanner`, `RUN.bannerMs`
**Requirement**: RMK-01, RMK-02, RMK-03, RMK-04, RMK-05, RMK-06, RMK-07, RMK-09, REC-10, RST-05

**Done when**:

- [ ] `record-hud.smoke.mjs` (novo, `?debug&hd=1&area=modular&record=1&nosave=1&spawn=...`): r1 mostra `Recorde: r1` em (948, 44) sem `highlight`; limpar a r1 → banner `Rodada 2 · Novo recorde!`, marcador `Recorde: r2` com `highlight`, `passed: true`; r3 → banner `Rodada 3`; `nosave=1` sem recorde → marcador escondido
- [ ] RST-05: depois de morrer com recorde novo e apertar J, o marcador mostra o recorde gravado
- [ ] Smokes `run-loop`, `hud` verdes; gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(hud): show the record marker and the new record banner`

---

### T13: Dano de golpe e de objeto no registro

**What**: `RecordDirector.onPlayerHit(hit)` (`moveName` → `golpe`, sem → `objeto`) e `addDamage(source, dano)`,
ignorando tudo com `s.fxLab`. Em `combat.ts`: uma linha dentro do `if (hit.ownerId === player.id)` do `onConnect`
(linha ~98) e uma depois de `boss.receiveFinisher()` (linha ~263).
**Where**: `src/scenes/test/combat.ts` (e o diretor do recorde)
**Depends on**: T11
**Reuses**: `DamageLedger.add`
**Requirement**: DMG-01, DMG-03, DMG-04, DMG-05, END-04, END-05, END-06, END-07, END-08, END-14

**Done when**:

- [ ] `record-end.smoke.mjs` estendido: um soco num inimigo soma em `golpe` o mesmo dano que o inimigo perdeu; golpe no ar não soma; golpe com o bastão vinculado na mão soma em `objeto`; com `?debug&fxlab` golpe no boneco não soma
- [ ] Painel cheio (`tech=azul:3,vermelho:3&perks=<6>&vows=<5>&arsenal=manoplas,bastao`): linhas de técnicas, passivas, arsenal e votos presentes e `panel.bounds` dentro de 960x540
- [ ] Smokes `boss` (finalizador), `arsenal`, `drops`, `fight` verdes; `combat.ts` ganha no máximo 2 linhas efetivas; gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(run): count strike and object damage in the run ledger`

---

### T14: Dano de técnica no registro

**What**: `RecordDirector.onTechHit(source, dano)`; `effects.onTechConnect(hit, point, source)` chama o registro
(+2 linhas); a lambda da `TestScene.ts:319` passa a repassar `source` (mesma linha, sem linha efetiva nova).
**Where**: `src/scenes/test/effects.ts` (e a lambda da cena e o diretor, ver What)
**Depends on**: T13, T1
**Reuses**: contexto por técnica do T1
**Requirement**: DMG-02, DMG-07, END-08, END-15

**Done when**:

- [ ] `record-end.smoke.mjs` estendido (`tech=azul`): um soco e um Azul num inimigo → painel lista `Golpe` e `Azul` com os valores de `record.damage`, soma das porcentagens 100 ± 1
- [ ] Kokusen forçado (molde do smoke `kokusen`) num inimigo soma em `divergente`
- [ ] Smokes `tech`, `kokusen`, `fxlab` verdes; `TestScene.ts` continua em 399 linhas efetivas; gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(run): count technique damage by source in the run ledger`

---

## Requirement Coverage

| Requirement | Tasks |
| --- | --- |
| SAVE-01 | T3, T7 |
| SAVE-02 | T3, T11 |
| SAVE-03 | T3 |
| SAVE-04 | T3, T10 |
| SAVE-05 | T3, T10 |
| SAVE-06 | T3 |
| SAVE-07 | T7, T10, T11 |
| REC-01 | T4, T11 |
| REC-02 | T4 |
| REC-03 | T4, T11 |
| REC-04 | T11 |
| REC-05 | T11 |
| REC-06 | T11 |
| REC-07 | T2, T10 |
| REC-08 | T10 |
| REC-09 | T4, T11 |
| REC-10 | T10, T11, T12 |
| RMK-01 | T4, T12 |
| RMK-02 | T8, T12 |
| RMK-03 | T4, T12 |
| RMK-04 | T4, T11, T12 |
| RMK-05 | T4, T12 |
| RMK-06 | T4, T12 |
| RMK-07 | T4, T8, T12 |
| RMK-08 | T8 |
| RMK-09 | T12 |
| END-01 | T9, T11 |
| END-02 | T11 |
| END-03 | T6, T11 |
| END-04 | T6, T13 |
| END-05 | T6, T13 |
| END-06 | T6, T13 |
| END-07 | T6, T13 |
| END-08 | T5, T6, T13, T14 |
| END-09 | T6, T11 |
| END-10 | T4, T6, T11 |
| END-11 | T4, T6, T11 |
| END-12 | T6, T11 |
| END-13 | T11 |
| END-14 | T8, T9, T13 |
| END-15 | T11, T14 |
| DMG-01 | T13 |
| DMG-02 | T1, T14 |
| DMG-03 | T13 |
| DMG-04 | T13 |
| DMG-05 | T13 |
| DMG-06 | T5, T11 |
| DMG-07 | T1, T5, T14 |
| RST-01 | T11 |
| RST-02 | T11 |
| RST-03 | T11 |
| RST-04 | T11 |
| RST-05 | T12 |

**Coverage:** 53 de 53 requisitos mapeados.

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

Phase 1:  T1 → T2
Phase 2:  T3 → T4
          T3 → T6
          T5 → T6
Phase 3:  T7
          T8 → T9
Phase 4:  T10
Phase 5:  T11 → T12
          T11 → T13 → T14
```

Execução estritamente sequencial, na ordem T1 a T14. São 14 tasks: em lotes de ~7, Phases 1-3 (9 tasks) num lote e
Phases 4-5 (5 tasks) no outro.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | 1 função (montagem do contexto) em 1 arquivo | ✅ Granular |
| T2 | 1 função no runner | ✅ Granular |
| T3 | 1 módulo puro (parse + validação + migração, coesos) | ✅ Granular |
| T4 | 1 classe pura | ✅ Granular |
| T5 | 1 classe pura | ✅ Granular |
| T6 | 1 função pura | ✅ Granular |
| T7 | 1 classe | ✅ Granular |
| T8 | 1 vista | ✅ Granular |
| T9 | 1 vista | ✅ Granular |
| T10 | 1 diretor + ligações de 1 linha em 4 arquivos (sem elas o diretor não é verificável: merge forward) | ⚠️ OK, coeso |
| T11 | 1 fluxo (morte) + 2 pontos de 1 linha + 2 smokes que leem o painel | ⚠️ OK, coeso |
| T12 | 1 ponto de ligação (marcador e banner) | ✅ Granular |
| T13 | 1 entrada de dano + 2 linhas em `combat.ts` | ✅ Granular |
| T14 | 1 entrada de dano + 2 linhas em `effects.ts` + 1 lambda | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | início da Phase 1 | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | None | início da Phase 2 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | None | início de cadeia | ✅ Match |
| T6 | T3, T5 | T3 → T6, T5 → T6 | ✅ Match |
| T7 | None | T7 sozinho | ✅ Match |
| T8 | T4 (phase anterior) | início de cadeia | ✅ Match |
| T9 | T8, T6 (T6 phase anterior) | T8 → T9 | ✅ Match |
| T10 | T3, T4, T7, T8, T9 (phases anteriores) | T10 sozinho | ✅ Match |
| T11 | T10 (phase anterior) | início da Phase 5 | ✅ Match |
| T12 | T11 | T11 → T12 | ✅ Match |
| T13 | T11 | T11 → T13 | ✅ Match |
| T14 | T13, T1 (T1 phase anterior) | T13 → T14 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Adaptador de cena (`TechRunner`) | smoke | smoke | ✅ OK |
| T2 | Ferramenta (runner de smoke) | none | none | ✅ OK |
| T3 | Regra pura | unit | unit | ✅ OK |
| T4 | Regra pura | unit | unit | ✅ OK |
| T5 | Regra pura | unit | unit | ✅ OK |
| T6 | Regra pura | unit | unit | ✅ OK |
| T7 | Adaptador sem cena | unit | unit | ✅ OK |
| T8 | Adaptador sem cena (vista + cores) | unit | unit | ✅ OK |
| T9 | Adaptador sem cena (vista + bounds) | unit | unit | ✅ OK |
| T10 | Adaptador de cena + tipo de debug | smoke (+ unit do `debugApi`) | smoke | ✅ OK |
| T11 | Adaptador de cena | smoke | smoke | ✅ OK |
| T12 | Adaptador de cena | smoke | smoke | ✅ OK |
| T13 | Adaptador de cena | smoke | smoke | ✅ OK |
| T14 | Adaptador de cena | smoke | smoke | ✅ OK |
