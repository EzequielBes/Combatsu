# Vagas e talentos — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/vagas-e-talentos/spec.md`
**Design**: `.specs/features/vagas-e-talentos/design.md`
**Plano**: `docs/plano-builds-e-habilidades.md` (linha F35 da seção 6; seções 1.1, 1.2, 4 (aura de build) e 5.3, talentos
da leva 1)
**Base**: F29 `fundacao-de-poder`, F30 `vermelho-e-corpo`, F31 `expansao-de-dominio`, F33 `eixos-das-tecnicas` e F34
`tecnicas-jjk-1` mergeadas. Nenhuma tarefa começa antes do merge da F34. As linhas citadas no design valem para
`f17a6a8` mais o que os designs da F29 a F33 dizem; o que a F34 mexe é reconferido no começo de cada fase (o `grep` da
T1 roda sobre o código mergeado e a tabela "Os tipos `0 | 1`" do design ganha as linhas novas antes do commit da T2).
**Status**: Draft
**Branch**: `feat/vagas-e-talentos` (a partir do commit final da F34)
**Ferramentas**: nenhuma MCP. Skill só o `tlc-spec-driven`. Tarefas com arte (T9, T32, T37, T38, T39, T40, T41, T42,
T43, T44, T45, T63) usam `tools/hd-boards.mjs` ou `tools/sprite-preview.mjs` (saída em `.fable-out/`) e conferem em
movimento no jogo, em HD, parado e correndo, para os dois lados (memória "Conferir animação em movimento"); essas
rodam em Opus 5.5 ou Fable, nunca Sonnet.

Regras que valem para toda tarefa (CLAUDE.md): um commit por tarefa, só os arquivos dela (nunca `git add -A`), `npm run
gate` verde antes do commit (durante o trabalho, só `npx vitest run <arquivo>` dos testes tocados); smoke só do que foi
tocado; smoke novo com `?debug&hd=1&area=modular`; tetos de 400 linhas efetivas por arquivo, 80 por função e
complexidade 15; arquivo novo nunca entra no `.oxlintrc.json`; teste da lista de exceções do `max-lines` não cresce (o
caso novo vai para arquivo novo). **VGX-01:** nenhuma tarefa toca a `src/scenes/TestScene.ts`, que termina com as linhas
efetivas do fim da F34 (390 pela estimativa da F33; anotar o número na T1). **VGX-02:** `ShopPanel.ts` só troca a
expressão da borda e a linha da dica (T53, T58), `Hud.ts` só ganha `export` em 4 constantes (T36), `moves.ts` não muda,
`Player.ts` não ganha campo (T35 troca a lambda do `prepareHit`, T39 só o tipo do gancho `onDefense`). Linha efetiva =
sem linha em branco e sem comentário, como o `max-lines` do `.oxlintrc.json`.

**Desvios do design registrados aqui** (o design descreve os passos; as tarefas fazem um commit por tarefa):

- O passo 0 vira 6 commits (T1 a T6) no lugar dos "dois commits" do design: com `SlotIndex = 0 | 1` cada arquivo troca
  de tipo sem quebrar os outros, e cada commit fica revertível sozinho.
- Os campos `stats.overtimeMul`, `stats.kokusenMul` e `stats.kokusenWindowBonusMs` do BEF-06 entram na tarefa que
  passa a escrever cada número (T44 e T45), não no passo 4: o `talents.smoke` do passo 2c já os lê, e o campo nasce com
  o efeito que ele prova (L-076).
- Campo de snapshot que o design não nomeia: `talentFx: { world: string[]; hud: string[]; ratioLines: number }` (T36,
  T37), tipo em `buildSnapshot.ts` (VGX-03). Sem ele, os sinais de nível (poeira, contorno, pós-imagem, risco, marca,
  punho preto, aura laranja, arco, faíscas, brilho, linha 7:3) não teriam prova no jogo vivo; cada efeito entra com o
  nome dele na lista enquanto o objeto existe (L-076).
- O `talents.smoke.mjs` nasce na T33 (faixa de talentos) e cada tarefa de talento acrescenta o seu cenário. Passando de
  380 linhas, a Zona Negra e a Hora Extra vão para `talents-kokusen.smoke.mjs` (design, "Arquivos novos").
- O TAL-09.15 ("bloqueio do chefe") vale só para o comum até existir bloqueio de chefe no código (`bossAI.ts:19` só tem a
  parede da investida): o golpe sombrio leva `unblockable: true`, que o `EnemyGuard` respeita (design, Risks).

**Decisões do usuário que travam tarefas** (o executor para e pergunta antes da tarefa, não durante):

| Antes de | Pergunta | Origem |
| --- | --- | --- |
| T52 | Se a meta do BBR-10 medir abaixo de 62% em 1000 seeds, mexer no `0,6` do `axisRng` da F30 ou aceitar a medida? Nunca ajustar o teste | design, Risks |
| T39 | Se o `complexity` do `PlayerDefense.receiveHit` subir com o `decoyed`, montar o `IncomingHit` numa função à parte no mesmo arquivo (já decidido no design; só avisar) | design, Risks |

---

## Test Coverage Matrix

> Guidelines: `CLAUDE.md` (camadas, gate, smoke só do que foi tocado, arte só pronta depois de olhar a prancha e o
> movimento), `.oxlintrc.json` (tetos e listas de exceção), `vitest.config.ts`, `package.json` (`gate`, `test`,
> `smoke`); lições L-010 (limites nos dois lados), L-043 (testar o adaptador, não só a regra), L-076 (campo de debug que
> só repete a entrada não prova o efeito). Amostras: `tests/core/loadout.test.ts`, `tests/core/cast.test.ts`,
> `tests/core/build.test.ts`, `tests/core/shop.test.ts`, `tests/game/debugApi.test.ts`, `tests/game/shopPanel.test.ts`,
> `scripts/smoke/build.smoke.mjs`, `scripts/smoke/hud.smoke.mjs`, `scripts/smoke/shop.smoke.mjs`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Regra pura (`src/core/**`) | unit | 1:1 com os ACs; todo edge case listado; limites nos dois lados (L-010): 6/7 vagas, 2/3 técnicas, 5/6 talentos; HP a 30% e um ponto acima; 14/15, 11/12 e 9/10 abates; 7999/8000 ms do Refluxo; 150/151 ms do Contra perfeito; 999/1000 ms do "aberto"; 1499/1500 ms da pós-imagem; 160/161 px do arco; 200/201 px e 4999/5000 ms da marca; teto de 30 ms e de ×3,4; frações 7/45 e 6/45, 16/45 e 15/45, 27/45 e 26/45, 39/45 e 38/45 | `tests/core/*.test.ts` (arquivo novo por sistema novo) | `npx vitest run <arquivo>`; `npm test` no gate |
| Números de ajuste (`src/data/**`) | unit | 9 talentos × 3 níveis linha a linha contra a tabela da spec; textos com até 20 caracteres; `POOL`, `TALENT_PRICE`, `REFUND`, `BUILD_AURA`, `KOKUSEN.windowBonusCapMs`; números que não mudam continuam | `tests/data/*.test.ts` | `npx vitest run <arquivo>` |
| Arte em código (`src/game/art/hd/**`) | unit + prancha | Testes de paleta e registro verdes; prancha olhada em `.fable-out/`; conferência em movimento no jogo, dois lados, quando a arte se mexe | `tests/game/art/**`, `tests/game/hdArt.test.ts` | `npm test` + `node tools/hd-boards.mjs` |
| Vista testável sem motor (`src/game/ShopPanel.ts`) | unit | Borda pela moldura e dica lida da vista, no molde de `tests/game/shopPanel.test.ts` | `tests/game/shopPanel.test.ts` | `npx vitest run tests/game/shopPanel.test.ts` |
| Adaptadores (`src/scenes/**`, `src/game/**`) | smoke | Efeito lido do jogo vivo pelo snapshot, lendo o motor e não o stat (L-043, L-076): `tech.cast.slot`, HP do comum, `damageNumbers.last.kind`, energia, `kokusen.windowMs`; refatoração com os smokes de antes iguais | `scripts/smoke/{third-slot,talents,build-bar}.smoke.mjs` (novos) e os smokes de cada tarefa | `npm run smoke -- <trecho>` |
| Tipos de snapshot (`src/game/buildSnapshot.ts`, `debugApi.ts`) | unit | Literal do `tests/game/debugApi.test.ts` com cada campo novo | `tests/game/debugApi.test.ts` | `npx vitest run tests/game/debugApi.test.ts` |
| Documentação (`README.md`, `.specs/STATE.md`) | none | build gate only | - | `npm run gate` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tarefa só com teste unitário (regra pura, dados, vista testável) | `npm run gate` |
| Full | Tarefa de adaptador, arte ou regra que muda o jogo vivo (smoke) | `npm run gate && npm run smoke -- <cada trecho da tarefa>` |
| Build | Fim de fase | `npm run gate` e os smokes do passo ("Smokes por passo" do design) |

Base de testes: a contagem no fim da F34 (anotar no começo da T1). Nenhuma tarefa apaga teste sem mover o caso para
outro arquivo; cada uma informa a nova contagem. Smokes instáveis: `armed` (ARM-12) e timeouts sob carga: repetir
isolado antes de suspeitar.

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order. Dependências entre fases ficam só no campo `Depends on` (anotadas "fase N"); os diagramas mostram as de dentro da fase. Tarefa sem seta não depende de outra da mesma fase.

### Phase 1: Passo 0 — `SlotIndex` (refatoração, smokes iguais)

```
T1 → T2 → T3 → T5 → T6
T1 → T4 → T6
T2 → T5
```

### Phase 2: Passo 1 — 3º slot e as vagas no HUD

```
T7 → T8
T7 → T10 → T11
T9 → T11
```

### Phase 3: Passo 2a — `Perks` com nível e o `buildEffects` (refatoração, smokes iguais)

```
T12 → T13 → T14 → T15 → T16
```

### Phase 4: Passo 2b — pool de 7 vagas

```
T17 → T18 → T23
T17 → T19 → T20 → T23
T17 → T22 → T23
T21 → T22
```

### Phase 5: Passo 2c — talentos, regra pura

```
T24 → T25 → T29
T24 → T27
T26 → T28
T30
T31
```

### Phase 6: Passo 2c — faixa, diretor e golpe

```
T32 → T33 → T34 → T35 → T36
T34 → T37 → T38
T35 → T38
T37 → T39
```

### Phase 7: Passo 2c — gatilhos de energia, cura, abate e Kokusen

```
T40
T41
T42
T43 → T44
T45
```

### Phase 8: Passo 2c — talento na loja e no baú

```
T46 → T47
T48
```

### Phase 9: Passo 3 — bandeja, livro e moldura, regra pura

```
T49
T50
T51 → T52
T53
T54
T55
T56
```

### Phase 10: Passo 3 — `BuildBar` e bandeja no jogo

```
T57 → T58 → T59
T58 → T60
```

### Phase 11: Passo 4 — piso de custo, aura de build e fechamento

```
T61 → T64
T62 → T63 → T64
```

---

## Task Breakdown

### Phase 1: Passo 0 — `SlotIndex` (refatoração, smokes iguais)

#### T1: O tipo do slot de técnica

**What**: `src/core/skillSlots.ts` com `SlotIndex = 0 | 1`, `SLOT_COUNT = 2`, `SLOT_INDICES`, `emptySlots<T>(fill)` e
`isSlotIndex(n)`; rodar `grep -rnE "0 \| 1|\[boolean, boolean\]|as 0 \|" src` sobre o código mergeado da F34 e
acrescentar à tabela "Os tipos `0 | 1`" do design as linhas que a F34 criou (mesmo commit, `design.md`). Anotar a
contagem de testes e as linhas efetivas da `TestScene` no fim da F34.
**Where**: `src/core/skillSlots.ts`
**Depends on**: None
**Reuses**: nada (arquivo novo, sem `phaser`)
**Requirement**: SIX-01

**Done when**:

- [ ] `tests/core/skillSlots.test.ts` (novo): `SLOT_INDICES` tem `SLOT_COUNT` itens em ordem; `emptySlots(0)` tem
      `SLOT_COUNT` zeros e listas independentes; `isSlotIndex` com −1, 0, `SLOT_COUNT − 1`, `SLOT_COUNT` e 0,5
- [ ] Tabela do design atualizada com as linhas da F34 (ou a nota "a F34 não criou slot `0 | 1`")
- [ ] Gate verde; contagem = base + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `refactor(core): add the technique slot index type`

---

#### T2: `Loadout` em listas de `SLOT_COUNT`

**What**: `slots` e `cooldowns` criados por `emptySlots` (`loadout.ts:29-30`), `slotsView` como `[...this.slots]`,
`firstEmpty` por `findIndex`, `hasAny` e o "outro slot" do `equip` por `some`, `tick` e `reset` em laço; método novo
`slotOf(id): SlotIndex | null` no lugar dos ternários de 2 slots (l.44, l.80); todo `slot: 0 | 1` vira `SlotIndex`,
inclusive `lastSlot` e `refundCooldown(slot, fraction)` da F30.
**Where**: `src/core/loadout.ts`
**Depends on**: T1
**Reuses**: `emptySlots`, `SlotIndex`
**Requirement**: SIX-01, SIX-02

**Done when**:

- [ ] `tests/core/loadout.test.ts` só muda imports e ganha os casos de `slotOf` (id no slot 0, no slot 1, ausente)
- [ ] `tests/core/loadoutAxes.test.ts` (F30) verde sem mudança
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `refactor(core): keep the loadout slots in lists sized by the slot count`

---

#### T3: Conjuração, maestria e União pelo `SlotIndex`

**What**: `cast.ts:18`, `:40`, `:74` com `SlotIndex`; `MasterySlot = SlotIndex` e `emptySlots(0)` em `mastery.ts:3`,
`:10` se a F33 mantiver maestria por slot (nada se for só por `TechId`); a União em `evolution.ts:19-20` acha `keep` e
`drop` por `loadout.slotOf(recipe.from[0])` e `slotOf(recipe.from[1])` no lugar do ternário.
**Where**: `src/core/evolution.ts`
**Depends on**: T2
**Reuses**: `Loadout.slotOf`
**Requirement**: SIX-01, SIX-02, TRS-07, TRS-08

**Done when**:

- [ ] `tests/core/cast.test.ts`, `mastery.test.ts` e `evolution.test.ts` verdes só com imports mudados
- [ ] `evolution.test.ts` ganha o caso Azul no slot 0 e Vermelho no slot 1 (ordem trocada da receita) com o Roxo no
      slot de `from[0]`
- [ ] Gate verde; contagem = anterior + o novo

**Tests**: unit
**Gate**: quick
**Commit**: `refactor(core): find the union slots by technique id`

---

#### T4: Adaptadores de conjuração em listas

**What**: `TechCaster` com `SLOT_KEYS = [[L, C], [I, V]]` e `slotKeys: Key[][]` (l.19-20, 34-35), `framePressed`
como `boolean[]` de `SLOT_COUNT` (l.23, 55), `requestSlot`/`forcePress(slot: SlotIndex)` (l.64, 75-76) e a escolha
`pressed = slotKeys.map(anyJustDown)`, `first = pressed.indexOf(true)` (l.83-87, todas as teclas consomem a borda como
hoje); `TechRunner` (`slotPressed`/`slotHeld` como `readonly boolean[]`, `CastHit.slot: SlotIndex`); `tech/shared.ts:22`;
`tech/divergent.ts:41`, `:80`, `:92`, `:139`, `:156`; `FxLab.ts:156` com `ActiveCastView | null`.
**Where**: `src/game/TechCaster.ts`
**Depends on**: T1
**Reuses**: `SLOT_INDICES`, `ActiveCastView`
**Requirement**: SIX-01, SIX-02, TRS-02

**Done when**:

- [ ] Smokes `tech`, `techniques`, `kokusen` e `fxlab` verdes e iguais (`L`+`I` no mesmo quadro continua conjurando só
      o slot 0)
- [ ] Gate verde; contagem igual

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(tech): read the slot keys and presses as lists`

---

#### T5: Diretores e snapshot pelo `SlotIndex`

**What**: `debugApi.ts:325-329` (`(TechSlotView | null)[]` e `ActiveCastView | null`); `runDirector.ts:165-166`
(`if (slot >= SLOT_COUNT) break;`, `slot as SlotIndex`) e `:173` (`SLOT_INDICES`); `shopDirector.ts:20`, `:92` e o
`applyEvolution` (`:67-69`, ou onde a F33 levou a União, `axisDirector.applyUnion`) pelos slots da receita via `slotOf`;
`snapshot.ts:215-225` com `SLOT_INDICES.map((i) => slotView(i, slots[i]))` (função da exceção de tamanho: mesmo número
de linhas ou menos).
**Where**: `src/scenes/test/snapshot.ts`
**Depends on**: T2, T3
**Reuses**: `slotOf`, `SLOT_INDICES`
**Requirement**: SIX-01, SIX-02, TRS-04, TRS-05

**Done when**:

- [ ] `tests/game/debugApi.test.ts` verde sem mudança de literal
- [ ] Smokes `shop`, `evolution` e `tech` verdes e iguais
- [ ] Gate verde; contagem igual

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(scenes): index the technique slots by the slot type`

---

#### T6: Ícones de técnica saem do `EnergyHud`

**What**: `src/game/TechSlotsHud.ts` recebe de `EnergyHud.ts` as constantes `ICON_*`, `MASTERY_*`, `SLOT_LABEL`
(l.33-44, como `readonly string[]`), `SlotIcon` (l.51-56), a criação dos ícones e barras (l.69-70, 85-128, com
`SLOT_INDICES.map` e sem `as [X, X]`), `slotIconPosition(slot: SlotIndex)` (l.149-152), o laço do `update`
(l.158-188, menos a marca de custo) e as entradas `icons`/`masteryBars` do `debugState` (l.226-230); o `EnergyHud`
ganha `readonly slotsHud`, `layer.add(slotsHud.objects)`, `slotsHud.update(loadout, mastery)`, `slotIconPosition`
repassando e o `debugState` espalhando `slotsHud.debug()` com as mesmas chaves. Fim do passo 0:
`grep -rnE "0 \| 1|\[boolean, boolean\]" src` só devolve as linhas que o design lista em "Ficam com o tipo próprio".
**Where**: `src/game/TechSlotsHud.ts`
**Depends on**: T4, T5
**Reuses**: corpo de hoje do `EnergyHud`
**Requirement**: SIX-01, SIX-02, VGX-01, VGX-02

**Done when**:

- [ ] `hud.energy` do snapshot com as mesmas chaves e valores (smoke `hud` verde e igual); `EnergyHud.ts` em ~124
      linhas efetivas, `TechSlotsHud.ts` em ~105
- [ ] O `grep` acima só devolve dodge, defesa, animador, `buySlot`, `select(option)`, `confirmBranch` e as tuplas de
      ramo e receita (anotar a saída no commit)
- [ ] Smokes `hud`, `tech`, `techniques`, `kokusen`, `evolution`, `fxlab` e `shop` verdes e iguais (SIX-02)
- [ ] `TestScene` com as linhas anotadas na T1; `.oxlintrc.json` sem mudança
- [ ] Gate verde; contagem igual

**Tests**: smoke
**Gate**: build
**Commit**: `refactor(hud): move the technique slot icons out of the energy hud`

---

### Phase 2: Passo 1 — 3º slot e as vagas no HUD

#### T7: Três slots e as teclas `O`/`B`

**What**: `SlotIndex = 0 | 1 | 2` e `SLOT_COUNT = 3` em `skillSlots.ts`; `[K.O, K.B]` como 3º par do `SLOT_KEYS` e a doc
do `TechCaster` citando `O`/`B`; `SLOT_LABEL = ['L', 'I', 'O']` no `TechSlotsHud` para o 3º ícone ter letra. Se o
`hud.smoke` conta os ícones, a contagem vai a 3 neste commit (TRS-01).
**Where**: `src/core/skillSlots.ts`
**Depends on**: T6 (fase 1)
**Reuses**: listas do passo 0 (nenhum outro arquivo muda de tipo)
**Requirement**: TRS-01, TRS-02, TRS-03, TRS-07, TRS-08

**Done when**:

- [ ] `tests/core/loadout.test.ts`: `firstEmpty` devolve 0, 1, 2 e `null` enchendo os slots; `equip` recusa id já
      equipado no slot 2 (TRS-01)
- [ ] `tests/core/cast.test.ts`: `request(2, ctx)` conjura a técnica do slot 2 pelo mesmo caminho; slot 2 vazio devolve
      `[]` sem gastar
- [ ] `tests/core/evolution.test.ts`: União com 3 técnicas mantém a 3ª no slot dela com pontos, ramo e recarga (TRS-07)
- [ ] `tests/core/mastery.test.ts`: marcos de maestria contam para a técnica no slot 2 como nos outros (TRS-08)
- [ ] `tests/core/skillSlots.test.ts` com `SLOT_COUNT` 3 (sem número mágico novo)
- [ ] Smokes `tech`, `techniques`, `kokusen`, `evolution`, `hud` verdes
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(core): open a third technique slot on O and B`

---

#### T8: Smoke do 3º slot

**What**: `scripts/smoke/third-slot.smoke.mjs` (`?debug&hd=1&area=modular&tech=vermelho,azul,divergente&seed=1`): `O`
conjura o Divergente e `tech.cast.slot === 2`; `B` também; `L` e `O` no mesmo quadro conjuram só o Vermelho; o Kokusen
sai pelo `O` na janela; `tech=` com 4 ids equipa 3; com `tech=vermelho`, `tech.slots` tem 3 entradas e as 2 últimas
`null`; compra de técnica nova com os slots 0 e 1 cheios vai ao slot 2 e o ícone voa até `slotIconPosition(2)`; com
`axes=` dando o Contido (ou o ramo de segurar da F33) no slot 2, segurar `O` age como segurar `L`. `README.md`:
`O`/`B` nos controles e `tech=` com até 3.
**Where**: `scripts/smoke/third-slot.smoke.mjs`
**Depends on**: T7
**Reuses**: `scripts/smoke/fight-kit.mjs`, `lib.ts`, o roteiro de `tech.smoke.mjs` e `kokusen.smoke.mjs`
**Requirement**: TRS-02, TRS-03, TRS-04, TRS-05, TRS-06

**Done when**:

- [ ] Smoke `third-slot` verde lendo `tech.cast.slot` do jogo vivo (a tecla que o `TechCaster` passa à `CastMachine`,
      L-043)
- [ ] Smokes `tech`, `kokusen` verdes
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `test(smoke): cover casting from the third slot`

---

#### T9: Ícone do Corpo em HD

**What**: `src/game/art/hd/talentIcons.ts` (novo) com o ícone do Corpo em 16×16 texels, só cores da `PALETTE`,
registrado como textura em `TEX` pelo caminho de `art/index.ts`; prancha em `.fable-out/` por `tools/hd-boards.mjs`.
**Where**: `src/game/art/hd/talentIcons.ts`
**Depends on**: None
**Reuses**: molde das grades HD de `art/hd/` e o registro de `art/index.ts`
**Requirement**: TSP-05, EHD-04

**Done when**:

- [ ] Testes de paleta e de registro verdes (cor fora da `PALETTE` quebra)
- [ ] Prancha olhada a 1× e 2× antes do commit (anotar o caminho)
- [ ] Gate verde

**Tests**: unit + prancha
**Gate**: quick
**Commit**: `feat(art): draw the cursed body icon in HD`

---

#### T10: Três vagas com a vazia tracejada

**What**: no `TechSlotsHud`, por vaga: moldura tracejada (`Graphics`, 4 px de traço e 3 de vão, `PALETTE.w` a 50%) e a
letra quando vazia, sem ícone, recarga nem barra de maestria (EHD-02); vagas em `x = 14 + i × 58`, `y = 92`;
`debug()` devolve `slots: { x, y, w, h, empty, dots }[]`; `src/game/buildSnapshot.ts` (novo) com `HudSlotsSnapshot`;
`debugApi.ts` ganha `hud.slots` (+1 com o import).
**Where**: `src/game/TechSlotsHud.ts`
**Depends on**: T7
**Reuses**: `TechSlotsHud` do passo 0
**Requirement**: EHD-01, EHD-02, EHD-05, VGX-03

**Done when**:

- [ ] `tests/game/debugApi.test.ts`: literal com `hud.slots` (3 entradas) e `tech.slots` com 3
- [ ] `hud.smoke.mjs`: 3 vagas na ordem `L`, `I`, `O`; com `tech=vermelho` as vagas 1 e 2 vêm `empty: true`
- [ ] Captura em HD do canto do HUD com 1 e com 3 técnicas
- [ ] Smokes `hud`, `third-slot`, `tech` verdes
- [ ] Gate verde; contagem igual

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(hud): show three technique vacancies with the empty ones dashed`

---

#### T11: Pontinhos de nível e o ícone do Corpo

**What**: 5 pontinhos de 3×3 px em `y = 149` sob cada vaga ocupada e sob o Corpo, os primeiros `axes.total(item)`
cheios (EHD-03); ícone do Corpo em `x = 188` com a borda dourada (`PALETTE.A`) enquanto `axes.awakened('corpo')`
(EHD-04); `EnergyHud.update` passa `loadout.axes` ao `slotsHud` (+2); `HudSlotsSnapshot.body` e `hud.body` no
`debugApi`.
**Where**: `src/game/TechSlotsHud.ts`
**Depends on**: T9, T10
**Reuses**: F30 `AxisBuild.total`/`awakened`; textura do T9
**Requirement**: EHD-03, EHD-04, EHD-05, VGX-01, VGX-03

**Done when**:

- [ ] `hud.smoke.mjs`: com `axes=` dando 2 pontos ao slot 0 e 1 ao Corpo, `dots` 2 e 1; com o Despertar do Corpo,
      `body.awakened`; os retângulos de `hud.slots`, `hud.body`, da barra de energia e da barra de Domínio (F31) não se
      cruzam (EHD-05)
- [ ] `tests/game/debugApi.test.ts`: literal com `hud.body`
- [ ] Captura em HD do canto do HUD (3 técnicas, Corpo com pontos, Despertar) antes do commit
- [ ] Smokes `hud`, `third-slot`, `tech`, `techniques`, `kokusen`, `evolution`, `fxlab`, `red-anime` verdes (fim do
      passo 1); `TestScene` igual
- [ ] Gate verde

**Tests**: unit + smoke
**Gate**: build
**Commit**: `feat(hud): show axis dots and the cursed body icon`

---

### Phase 3: Passo 2a — `Perks` com nível e o `buildEffects` (refatoração, smokes iguais)

#### T12: Números de talento por nível

**What**: `data/perks.ts` ganha `TalentLevel = 1 | 2 | 3`, `ByLevel` e `TALENT` com `heavyMul`, `counterMul`,
`shadowMul`, `finisherHeal`, `parryEnergy` e `meleeEnergy` iguais aos de hoje nos três níveis (1,25, 1,4, 1,5, 20, 12,
2); o `PERK` de hoje fica até a T16.
**Where**: `src/data/perks.ts`
**Depends on**: None
**Reuses**: `PERK` de hoje (`data/perks.ts:23-40`)
**Requirement**: TAL-02

**Done when**:

- [ ] `tests/data/perks.test.ts` (novo): cada campo de `TALENT` tem 3 valores e os 3 iguais ao `PERK` de hoje
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `refactor(data): keep the talent numbers per level`

---

#### T13: `Perks` com nível na ordem de compra

**What**: `class Perks` troca o `Set` por `Map<PerkId, TalentLevel>`: `levelOf`, `has` (qualquer nível), `add` (Nv 1,
`false` se já tem), `levelUp` (`false` no Nv 3 ou sem o talento), `remove`, `list` (ids na ordem de compra), `levels`
(`{ id, level }[]`), `reset`; `buildPoints` conta `PERK_POINTS + (nível − 1)`.
**Where**: `src/core/build.ts`
**Depends on**: T12
**Reuses**: `PERK_POINTS`, `buildOfEntry`
**Requirement**: TAL-01

**Done when**:

- [ ] `tests/core/perksLevel.test.ts` (novo): `levelOf` 0 sem o talento; `add` repetido `false`; `levelUp` até 3 e
      `false` no 3 e sem o talento; `list` e `levels` na ordem de compra (não na de `PERK_IDS`); `remove`; `has` em
      todo nível
- [ ] `tests/core/build.test.ts`: o literal da lista troca para a ordem de compra citando o TAL-01; `buildPoints` 2, 3
      e 4 por nível
- [ ] Smokes `build` e `shop` verdes e iguais
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit + smoke
**Gate**: full
**Commit**: `refactor(core): keep a level per talent in purchase order`

---

#### T14: O agregador `buildEffects` com os números de hoje

**What**: `src/core/buildEffects.ts` (novo, puro): `buildEffects({ perks, overtimeStacks })` devolve `meleeMul(t)`
(pesado × contra × sombrio na ordem de `build.ts:105-107`), `finisherHeal`, `parryEnergy`, `meleeEnergy` e `level(id)`,
lendo `TALENT[campo][nível − 1]`.
**Where**: `src/core/buildEffects.ts`
**Depends on**: T13
**Reuses**: `MeleeTraits` (F29), `TALENT`
**Requirement**: TAL-02, BEF-01

**Done when**:

- [ ] `tests/core/buildEffects.test.ts` (novo): para cada combinação de `heavy`/`counter`/`shadow` e cada conjunto de
      talentos no Nv 1, `meleeMul` igual ao `strikeMultiplier` de hoje com `toBe`; cura, energia de parry e de golpe
      iguais ao `PERK`; sem talento, tudo 1 ou 0
- [ ] Arquivo sem import de `phaser` (BEF-01)
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the build effects aggregator`

---

#### T15: `statSheet` lê os talentos pelo agregador

**What**: `StatInput` troca `perks` por `effects: BuildEffects`; `meleeMul: (t) => effects.meleeMul(t) *
relicStrikeMul(...) * vowStrikeMul(...)` na mesma ordem (`statSheet.ts:70-72`); `statsDirector.sheet()` passa
`effects: buildEffects({ perks: build.perks, overtimeStacks: 0 })`; `strikeMultiplier` e `StrikeTraits` saem de
`build.ts` (o caso de teste dele vai para o `buildEffects.test.ts`).
**Where**: `src/core/statSheet.ts`
**Depends on**: T14
**Reuses**: `StatsDirector.sheet` (F29)
**Requirement**: TAL-02, BEF-01

**Done when**:

- [ ] `tests/core/statSheet.test.ts`: entrada com `effects`; os números de hoje iguais
- [ ] `grep strikeMultiplier src tests` vazio
- [ ] Smokes `build`, `power`, `vows` verdes e iguais
- [ ] Gate verde; contagem sem perda (o caso movido conta igual)

**Tests**: unit + smoke
**Gate**: full
**Commit**: `refactor(core): read the talent multipliers from the build effects`

---

#### T16: `BuildDirector` lê a energia e a cura pelo agregador

**What**: `onDefense`, `onMeleeHit` e `onFinisher` (`buildDirector.ts:39-51`) leem `buildEffects(...)` no lugar de
`PERK`; os campos `heavyMul`, `finisherHeal`, `parryEnergy`, `meleeEnergy`, `shadowMul` e `counterMul` saem do `PERK`.
**Where**: `src/scenes/test/buildDirector.ts`
**Depends on**: T15
**Reuses**: `buildEffects`
**Requirement**: TAL-02, BEF-01

**Done when**:

- [ ] `grep -n "PERK\.\(heavyMul\|finisherHeal\|parryEnergy\|meleeEnergy\|shadowMul\|counterMul\)" src` vazio
- [ ] `tests/data/perks.test.ts` compara o `TALENT` com os literais de hoje (o `PERK` não tem mais os campos)
- [ ] Smokes `build`, `shop`, `power`, `vows`, `arsenal` verdes e iguais (fim do passo 2a); `TestScene` igual
- [ ] Gate verde

**Tests**: unit + smoke
**Gate**: build
**Commit**: `refactor(build): read talent energy and heal from the build effects`

---

### Phase 4: Passo 2b — pool de 7 vagas

#### T17: Regras do pool

**What**: `data/perks.ts` ganha `POOL = { total: 7, techniques: 3, talents: 6, surcharge: 8 }`; `skillSlots.ts` ganha
`PoolState`, `poolOf(loadout, perks)` (técnicas equipadas + talentos possuídos; o Roxo conta 1), `canAddTechnique`,
`canAddTalent`, `poolSurcharge` e `vacancyTag`.
**Where**: `src/core/skillSlots.ts`
**Depends on**: T16 (fase 3)
**Reuses**: `Loadout.slotsView`, `Perks.list`
**Requirement**: POL-01, POL-02, POL-04, POL-07, POL-08

**Done when**:

- [ ] `tests/core/skillSlots.test.ts`: Corpo, arma, relíquia e Domínio não contam; Roxo depois da União conta 1 e libera
      1 vaga (POL-08); `canAddTechnique` com 2 e 3 técnicas e com 6 e 7 vagas; `canAddTalent` com 5 e 6 talentos e com
      6 e 7 vagas (L-010); `poolSurcharge` 0 com nada e 48 com 6; `vacancyTag` `OCUPA VAGA 5/7→6/7` com 18 caracteres
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): count the seven build vacancies`

---

#### T18: Acréscimo do pool no preço

**What**: `cardCost` (F30) soma `poolSurcharge(pool)` antes da inflação na técnica nova
(`inflate(newTechPrice(rarity) + surcharge, round)`) e no talento novo (`inflate(TALENT_PRICE.new + surcharge,
round)`); `TALENT_PRICE = { new: 18 }` em `data/perks.ts` no lugar do `PERK.cost`; os outros `kind` não leem o pool.
**Where**: `src/core/shopPricing.ts`
**Depends on**: T17
**Reuses**: F30 `inflate`, `newTechPrice`
**Requirement**: POL-02, POL-03

**Done when**:

- [ ] `tests/core/shopPricing.test.ts`: técnica rara na r1 com a técnica inicial = 34; talento na r2 com a técnica
      inicial = 28 (`round(26 × 1,06)`); 7ª habilidade com +48 antes da inflação; ponto de eixo, nível de talento, arma,
      relíquia, Domínio, atributo, cura e reroll com o mesmo preço com 0 e com 6 vagas (POL-03)
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(shop): add the vacancy surcharge to new ability prices`

---

#### T19: Categoria cheia na elegibilidade

**What**: `techniqueEligible` só deixa técnica nova com `canAddTechnique(pool)`; o talento novo só com
`canAddTalent(pool)`; as cartas de melhoria não leem o pool.
**Where**: `src/core/shopEligibility.ts`
**Depends on**: T17
**Reuses**: F30 `eligible`, `techniqueEligible`
**Requirement**: POL-04

**Done when**:

- [ ] Teste (no arquivo de teste da elegibilidade da F30, ou `tests/core/shopPool.test.ts` se ele estiver perto do
      teto): com 7 vagas nenhuma técnica nem talento novo; com 3 técnicas nenhuma técnica nova e talento novo sim; com
      6 talentos nenhum talento novo e técnica nova sim; ponto de eixo e nível de talento elegíveis nos três estados
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(shop): stop offering new abilities past the pool or category cap`

---

#### T20: Carta 1 pelo pool

**What**: na `drawCards` (F30), a carta 1: sem técnica equipada e com técnica elegível, técnica nova (a garantia de
hoje); com técnica e com item novo elegível, `drawOffers` com o peso de hoje só sobre técnicas e talentos novos; senão
o sorteio de hoje.
**Where**: `src/core/shopDraw.ts`
**Depends on**: T19
**Reuses**: `drawOffers`, `buildWeight`
**Requirement**: POL-06

**Done when**:

- [ ] `tests/core/shopAxes.test.ts` (F30) ou `shopPool.test.ts`: sem técnica, carta 1 técnica nova; com 1 técnica e
      vaga, carta 1 técnica ou talento novo em 200 seeds; com o pool cheio, carta 1 do sorteio de hoje; abandonar a única
      técnica volta à garantia (edge case)
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(shop): draw card one among new abilities while a vacancy is open`

---

#### T21: Parser do `perks=` com nível

**What**: `src/core/buildParam.ts` (novo) com `parsePerksParam(raw): { id; level }[]`: nível 1 a 3, padrão 1, fora
disso 1; id desconhecido e id repetido saem.
**Where**: `src/core/buildParam.ts`
**Depends on**: T13 (fase 3)
**Reuses**: `PERK_IDS`, `TalentLevel`
**Requirement**: POL-10

**Done when**:

- [ ] `tests/core/buildParam.test.ts` (novo): `punhoPesado:3,executor,naoExiste,executor:2,condutor:9` dá `punhoPesado`
      3, `executor` 1, `condutor` 1; vazio dá `[]`; `:0` e `:4` viram 1
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): parse talent levels from the debug url`

---

#### T22: Build de debug pelo pool e o snapshot do pool

**What**: sai o laço do `perks=` do `BuildDirector.reset` (l.16-21); `applyDebugBuild()` (chamado logo depois do
`applyDebugAxes` da F30) aplica `parsePerksParam` na ordem, para na 1ª entrada que passaria do pool ou da categoria
depois das técnicas do `tech=`, e sobe o nível por `levelUp`; `PoolSnapshot` em `buildSnapshot.ts`; `build.snapshot()`
ganha `pool: poolOf(...)` com `total` 7.
**Where**: `src/scenes/test/buildDirector.ts`
**Depends on**: T17, T21
**Reuses**: `canAddTalent`, F30 `applyDebugAxes`
**Requirement**: POL-09, POL-10, VGX-03

**Done when**:

- [ ] `tests/game/debugApi.test.ts`: literal com `build.pool`
- [ ] `build.smoke.mjs`: `tech=vermelho,azul&perks=punhoPesado:2,executor` dá `build.pool` `{ used: 4, total: 7,
      techniques: 2, talents: 2 }` e `build.talents` com os níveis; 7 talentos com 1 técnica param no 6º
- [ ] Smokes `build`, `run-loop` verdes
- [ ] Gate verde

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(build): apply debug talents within the pool and report it`

---

#### T23: Compra recusada pelo pool e a etiqueta da vaga

**What**: `Shop.buy` confere `canAdd*` antes de cobrar e devolve `{ ok: false, reason: 'pool' }`; a carta de item
novo mostra `vacancyTag(pool)` na linha do nível (`levelText`); `resolveBuy` emite `buyDenied:pool`; `shop.smoke.mjs`
(trecho TSH-05/CRD-03 da F30): a garantia de técnica fica na carta 1 só sem técnica, a etiqueta `OCUPA VAGA a/7→b/7`,
e o cenário novo `perks=` com 6 talentos não vê carta de talento novo; `README.md`: `perks=<id>[:<nível>]`;
`.specs/STATE.md`: AD-028 (texto do design, "Tech Decisions").
**Where**: `src/core/shop.ts`
**Depends on**: T18, T20, T22
**Reuses**: `vacancyTag`, `poolOf`
**Requirement**: POL-05, POL-07

**Done when**:

- [ ] `tests/core/shop.test.ts` está perto do teto (368): casos novos em `tests/core/shopPool.test.ts` — compra além do
      pool ou da categoria devolve `reason: 'pool'` com a carteira igual; a linha do nível da carta nova é a etiqueta
- [ ] Smokes `shop`, `build`, `run-loop`, `shop-axes`, `shop-progress` verdes (fim do passo 2b); `TestScene` igual
- [ ] AD-028 no `## Decisions` do `.specs/STATE.md`
- [ ] Gate verde

**Tests**: unit + smoke
**Gate**: build
**Commit**: `feat(shop): refuse new abilities past the pool and tag the vacancy`

### Phase 5: Passo 2c — talentos, regra pura

#### T24: Os 9 talentos com os números do plano

**What**: `data/perks.ts` reescrito: `PerkId` com `proporcao`, `horaExtra` e `zonaNegra`; `PerkDef` com `levels: [3 ×
TalentText]` (`card` e `next`, textos do design); `TALENT` com os números da spec (pesado 1,15/1,30/1,45, contra
1,3/1,5/1,7, sombrio 1,3/1,5/1,8, cura 12/20/30, parry 8/12/18, golpe 1/2/3, Proporção 1,5/1,75/2, Hora Extra 15/12/10
e 3/5/7, Zona Negra 10/20/30 ms e 2,5/2,8/3,1, e os escalares); `TALENT_PRICE.level = [16, 24]`; `REFUND = 0.4`;
afinidade nova no `buildOfEntry` (`proporcao` → lutador, `horaExtra` → veloz, `zonaNegra` → feiticeiro). O Nv 1 muda o
jogo vivo: `build.smoke.mjs` troca os números (Condutor +1, Punho ×1,15) e o `statSheet.test` também.
**Where**: `src/data/perks.ts`
**Depends on**: T23 (fase 4)
**Reuses**: tabela da spec e textos do design ("Data Models")
**Requirement**: TAL-03, TAL-05

**Done when**:

- [ ] `tests/data/perks.test.ts`: 9 talentos, afinidade de cada um, 3 valores e 3 textos por nível linha a linha contra
      a tabela da spec; todo `card` e `next` com até 20 caracteres (TAL-05)
- [ ] `tests/core/statSheet.test.ts` e `buildEffects.test.ts` com os números do Nv 1 novos
- [ ] `build.smoke.mjs` com os números novos; a loja da r2 oferece os 3 talentos novos (`shop.smoke` com seed que os
      mostra, ou o teste de elegibilidade)
- [ ] Smokes `build`, `shop` verdes
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(data): add the nine talents with three levels each`

---

#### T25: Todos os números de talento pelo agregador

**What**: `buildEffects` ganha `techMul`, `overtimeMul` (`1 + 0,05 × acúmulos`), `kokusenWindowBonusMs` (`min(30,
soma)`), `kokusenMul` (`min(KOKUSEN.mulCap, maior entre 2,5 e a Zona Negra)`), `critMul(sources)` (maior fonte entre
Proporção pelo HP antes do acerto, "aberto" e marca; 1 sem fonte), `critDamage(damage, mul)`, os números de gatilho
por nível (energia do Contra Nv 3, fração da recarga, arco do Condutor) e o `meleeMul` com a Hora Extra;
`KOKUSEN.windowBonusCapMs: 30` em `data/techniques.ts`.
**Where**: `src/core/buildEffects.ts`
**Depends on**: T24
**Reuses**: `TALENT`, `KOKUSEN.mulCap` (F30)
**Requirement**: TAL-07, TAL-08, TAL-09, TAL-10, TAL-11, TAL-12, TAL-13, TAL-15, TAL-16, BEF-01, BEF-03, BEF-04, BEF-05

**Done when**:

- [ ] `tests/core/buildEffects.test.ts`: valor de cada talento em cada nível (TAL-07 a TAL-12, TAL-15); `critMul` com HP
      a 30% e um ponto acima (TAL-13); duas fontes dão só a maior (TAL-16); janela +10/+20/+30 e teto 30 com fonte
      sintética de 40 (BEF-03); 2,5/2,8/3,1 e nunca acima de 3,4 (BEF-04); `overtimeMul` com 0, 3 e 7 acúmulos (BEF-05)
- [ ] Sem import de `phaser`
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): resolve every talent number in the build effects`

---

#### T26: Regras com estado dos talentos

**What**: `src/core/talents.ts` (novo, puro, tempo em ms passado por quem chama): `isPerfectCounter`, `OpenTarget`,
`Afterimage` (`arm`, `observe(ownerId, phase, nowMs)`, `decoyed`, `view`, `reset`), `RatioMark`, `nearestWithin`,
`RateLimit`, `Cooldown` e `strikeCountTrigger`.
**Where**: `src/core/talents.ts`
**Depends on**: None
**Reuses**: `Vec2` de `core/hit.ts`; janela deslizante do `StrikeEmitter` (F30)
**Requirement**: TAL-08, TAL-09, TAL-11, TAL-12, TAL-13, ABD-04

**Done when**:

- [ ] `tests/core/talents.test.ts` (novo): Contra perfeito a 150 e 151 ms; "aberto" a 999 e 1000 ms, troca de alvo e
      `onDeath` sem herdeiro; pós-imagem com `windup` aos 1499 e 1500 ms, outro inimigo não consome, isca até sair de
      `attack`; `Cooldown` a 7999 e 8000 ms; arco a 160 e 161 px, nunca o próprio alvo, 2 por 1000 ms e sem gasto sem
      alvo; marca a 200 e 201 px, 4999 e 5000 ms, consumida no golpe, some com o alvo morto; `strikeCountTrigger` no 3º
      e no 6º; `reset` de cada classe limpa o estado (ABD-04)
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the stateful talent rules`

---

#### T27: Hora Extra

**What**: `src/core/overtime.ts` (novo): `Overtime` com `onKill(level)`, `onHpLoss()`, `stacks`, `kills`,
`atCap(level)` e `reset()`, números de `TALENT.overtime`.
**Where**: `src/core/overtime.ts`
**Depends on**: T24
**Reuses**: `TALENT.overtime`
**Requirement**: TAL-14

**Done when**:

- [ ] `tests/core/overtime.test.ts` (novo): 14 e 15 abates no Nv 1; 11 e 12 no Nv 2; 9 e 10 no Nv 3; teto 3/5/7; perder
      HP com 1, 2 e 5 acúmulos dá 0, 1 e 2 e zera o contador; subir de nível com o contador já acima do limiar soma e
      zera no próximo abate
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): track overtime stacks from kills`

---

#### T28: Contra perfeito no `CounterWindow`

**What**: `CounterWindow` guarda `opened` (o `ms` do `open`) e o momento do aperto no `buffer`; `get lastTakePerfect`
gravado no `take` com `isPerfectCounter(opened − remaining no aperto)`.
**Where**: `src/core/counter.ts`
**Depends on**: T26
**Reuses**: `isPerfectCounter`
**Requirement**: TAL-08

**Done when**:

- [ ] `tests/core/counterPerfect.test.ts` (novo): aperto direto e aperto guardado no `buffer` a 150 e a 151 ms da
      abertura; `counter.test.ts` verde sem mudança
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): tell a perfect counter by the press time`

---

#### T29: Kokusen com bônus de janela e multiplicador da escala

**What**: `Kokusen.startAttempt(roll?, bonusMs = 0)` soma `bonusMs` ao `widthMs` sorteado e expõe `windowMs`;
`kokusenDamage` (F30) lê `scale.mul` no lugar de `KOKUSEN.mul`; `KokusenScale` ganha `mul` (2,5) e `windowBonusMs` (0)
e o `reset` do `Loadout` os zera.
**Where**: `src/core/kokusen.ts`
**Depends on**: T25
**Reuses**: F30 `KokusenScale`, `kokusenDamage`
**Requirement**: TAL-15, BEF-03, BEF-04

**Done when**:

- [ ] `tests/core/kokusen.test.ts`: `startAttempt` com `bonusMs` 0 e 30 dá a largura sorteada e a sorteada + 30; a base
      continua de 50 a 90 ms; `kokusenDamage` com `mul` 2,5 igual ao de hoje e com 3,1 maior
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(kokusen): widen the window and scale the burst from the loadout`

---

#### T30: Golpe na isca não fere

**What**: `IncomingHit.decoyed?: boolean`; com `decoyed`, `resolveIncomingHit` devolve `AVOIDED('countered')` antes de
tudo (`defense.ts:81-83` já trata `countered` sem dano nem efeito).
**Where**: `src/core/defense.ts`
**Depends on**: None
**Reuses**: desfecho `countered` de hoje
**Requirement**: TAL-09

**Done when**:

- [ ] `tests/core/talents.test.ts` (o `defense.test.ts` está em 332): `decoyed` devolve `countered` sem dano com
      guarda, sem guarda e no meio da esquiva; sem `decoyed`, o desfecho de hoje
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): let a decoyed attack deal no damage`

---

#### T31: Número de cura e a marca de crítico no `Hit`

**What**: `Hit.crit?: boolean` em `core/hit.ts`; `DamageKind` ganha `heal` (verde `G`, sem fundir com dano) em
`core/damageNumber.ts` (F29).
**Where**: `src/core/damageNumber.ts`
**Depends on**: None
**Reuses**: `DamageKind` com `crit` (F29)
**Requirement**: TAL-10, TAL-16

**Done when**:

- [ ] `tests/core/damageNumber.test.ts`: `heal` tem cor `G`, não funde com `strike` nem com `crit` no mesmo alvo
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the heal damage number kind`

---

### Phase 6: Passo 2c — faixa, diretor e golpe

#### T32: Ícones dos 9 talentos

**What**: os 9 ícones de talento em `talentIcons.ts` (16×16 texels, só `PALETTE`), registrados em `TEX`; prancha dos
10 ícones (com o Corpo) em `.fable-out/`.
**Where**: `src/game/art/hd/talentIcons.ts`
**Depends on**: T9 (fase 2)
**Reuses**: arquivo do T9
**Requirement**: TSP-05

**Done when**:

- [ ] Testes de paleta e registro verdes
- [ ] Prancha olhada a 1× e 2× antes do commit; cada ícone lido sozinho a 32×32 px
- [ ] Gate verde

**Tests**: unit + prancha
**Gate**: quick
**Commit**: `feat(art): draw the nine talent icons in HD`

---

#### T33: Faixa de talentos

**What**: `src/game/TalentStrip.ts` (novo): até 6 ícones a 32×32 px de `x = 14`, 6 px de vão, `y = 164`, 3 pontinhos
em `y = 200`, `flash(id)` de 250 ms que reinicia (`setTint(PALETTE.w)` com `TintModes.FILL`, como `DodgeFx.ts:152-153`),
`update(dtMs, levels, overtime)`, `debug()`; `UiSetup.addHud` cria `ui.talentStrip`; `TalentStripSnapshot` em
`buildSnapshot.ts`; `talentStrip` no `GameSnapshot` (+1). `scripts/smoke/talents.smoke.mjs` (novo) com
`perks=punhoPesado:3,proporcao:2,horaExtra:2,zonaNegra:3&seed=1`: 4 ícones na ordem de compra com os níveis; a faixa
não cruza o `EnergyHud` (`hud.slots`, `hud.body`) nem as barras do `Hud`.
**Where**: `src/game/TalentStrip.ts`
**Depends on**: T32
**Reuses**: molde de vista na `uiLayer` (`VowPanel`), texturas do T32
**Requirement**: TSP-01, TSP-02, TSP-03, TSP-06, VGX-03

**Done when**:

- [ ] `tests/game/debugApi.test.ts`: literal com `talentStrip`
- [ ] Smoke `talents` verde (TSP-02, TSP-06); `Hud.ts` sem linha nova (TSP-01)
- [ ] Captura em HD do HUD com 6 talentos antes do commit
- [ ] Smokes `hud`, `third-slot` verdes
- [ ] Gate verde

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(hud): show the talent strip`

---

#### T34: Diretor dos talentos com cura e energia por nível

**What**: `scenes/test/talentDirector.ts` (novo, campo `talents` do `BuildDirector`): `fire(id)` (evento `talent:<id>`
e `ui.talentStrip.flash(id)`), `onMeleeHit`, `onDefense`, `onFinisher`, `onKill`, `update(dtMs)` (chama
`strip.update`), `removeTalent`, `reset`, `snapshot()`; os gatilhos de hoje mudam de dono: Executor cura pelo nível,
Refluxo dá energia no `parry`/`deflect` pelo nível, Condutor dá energia por golpe pelo nível, todos com `fire`; o
`BuildDirector` repassa, zera no `reset` e o `build.snapshot()` ganha `talents` e `overtime` (`perks` continua a lista
de ids).
**Where**: `src/scenes/test/talentDirector.ts`
**Depends on**: T33
**Reuses**: `buildEffects`, ganchos do `BuildDirector` de hoje
**Requirement**: TAL-10, TAL-11, TAL-12, TAL-17, TAL-18, TSP-03

**Done when**:

- [ ] `tests/game/debugApi.test.ts`: literal com `build.talents` e `build.overtime`
- [ ] `build.smoke.mjs`: finalizador cura 12/20/30, parry dá 8/12/18, golpe dá `CE.meleeGain` + 1/2/3, lidos da vida e
      da energia do jogo vivo; `talent:<id>` no quadro de cada um
- [ ] `talents.smoke.mjs`: com `perks=refluxo`, o parry deixa `flashing: true` no ícone dele e volta a `false` depois de
      250 ms; dois parries seguidos reiniciam (TSP-03)
- [ ] `BuildDirector` abaixo de ~80 linhas efetivas; smokes `build`, `talents`, `defense`, `finisher` verdes
- [ ] Gate verde

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(build): drive talent triggers from their own director`

---

#### T35: Crítico por alvo e a Proporção 7:3

**What**: `StrikeMods.marks` ganha `unblockable` e `StrikeMods.crit?: (target) => number`; `talentDirector.strikeExtras(
move, shadow)` devolve as marcas e a função `crit` (HP do alvo antes do acerto, `OpenTarget`, `RatioMark` →
`buildEffects.critMul`); `StatsDirector.strikeMods` junta os extras; `AttackHitbox.prepareHit(hit, target)`
(`hitbox.ts:66`, `:89`); `PlayerStrikes.prepare(hit, target)` aplica o bônus da esquiva de hoje e, com `crit > 1`,
`critDamage` e `crit: true`; `Player.ts:145-148` passa `(h, t) => this.strikes.prepare(h, t)` (−2, nenhum campo);
`combat.onConnect` solta o número com `hit.crit ? 'crit' : 'strike'`.
**Where**: `src/game/player/strikes.ts`
**Depends on**: T34
**Reuses**: `prepareHit` de hoje, `StrikeMods` (F30), `critDamage`
**Requirement**: TAL-13, TAL-16, TAL-17, VGX-02

**Done when**:

- [ ] `talents.smoke.mjs` (L-043): com `perks=proporcao`, o comum abaixo de 30% perde `round(dano do golpe × 1,5)` e
      `damageNumbers.last.kind === 'crit'`; um ponto acima de 30% leva o dano normal e `strike`; `talent:proporcao` no
      quadro
- [ ] `Player.ts` sem campo novo e com ~356 linhas efetivas; `strikes.ts` sem ramo novo nas funções da exceção
- [ ] Smokes `talents`, `fight`, `impact`, `feel`, `power` verdes
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(combat): apply the largest critical multiplier per target`

---

#### T36: Linha 7:3 nas barras

**What**: `EnemyHud` desenha a linha amarela (`PALETTE.A`) de 1 px a 30% do poço com `setRatioLine(on)`;
`Enemy.setRatioLine(on)` repassa (+3); `game/TalentHudFx.ts` (novo, `uiLayer`) desenha a linha a 30% da barra do chefe
pelas constantes que o `Hud.ts` passa a exportar (`MARGIN`, `LABEL_W`, `BOSS_BAR_WIDTH`, `BOSS_BAR_HEIGHT`, 0 linha
nova); o `talentDirector` liga a linha em todo comum vivo e no chefe enquanto há Proporção; `TalentHudFx` criado pelo
`talentDirector.onSceneCreate()` chamado pelo `UiSetup` (+1). Campo novo `talentFx: { world: string[]; hud: string[];
ratioLines: number }` (efeitos vivos por nome e quantos comuns mostram a linha, lidos dos objetos e não do talento,
L-076), tipo `TalentFxSnapshot` em `buildSnapshot.ts`, entrando pelo `statsDirector.snapshotFields()` (+1 no
`debugApi`); a T37 acrescenta a parte do mundo.
**Where**: `src/game/TalentHudFx.ts`
**Depends on**: T35
**Reuses**: `EnemyHud.updateBar` (`EnemyHud.ts:51-66`), constantes do `Hud`
**Requirement**: TAL-13, VGX-02

**Done when**:

- [ ] `talents.smoke.mjs`: com a Proporção, `talentFx.ratioLines` igual ao número de comuns vivos e `talentFx.hud`
      com `bossRatio` na luta do chefe; sem ela, 0 e sem `bossRatio`
- [ ] `tests/game/debugApi.test.ts`: literal com `talentFx`
- [ ] `Hud.ts` com as mesmas linhas efetivas (VGX-02); captura em HD da barra do comum e do chefe
- [ ] Smokes `talents`, `boss`, `targets` verdes
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(hud): draw the seven three line on enemy and boss bars`

---

#### T37: Punho Pesado no Nv 2 e no Nv 3

**What**: `game/TalentFx.ts` (novo, mundo, `FX_DEPTH`, registrado no `FxRegistry`) com a poeira e o anel no chão;
o `talentDirector` dispara os dois no golpe forte que acerta com o Punho Nv 2+; com o Nv 3, `strikeExtras` liga
`wallStun` no golpe forte (quem derruba é a marca `knockdown` do golpe, AD-021) e a parede da F30 atordoa 600 ms;
o `TalentFx.debug()` preenche `talentFx.world` com os efeitos vivos por nome.
**Where**: `src/game/TalentFx.ts`
**Depends on**: T34
**Reuses**: F30 `wallStun.ts`, `EnemyDefense.enterRagdoll`; `FxRegistry`
**Requirement**: TAL-07, TAL-17

**Done when**:

- [ ] `talents.smoke.mjs`: golpe forte com Punho Nv 1/2/3 tira `round(dano × 1,15/1,30/1,45)` do comum; Nv 2 deixa
      `dust` e `ring` em `talentFx.world`; Nv 3 derruba contra a parede e solta `wallStun:<id>`
- [ ] Conferido no jogo em HD, parado e correndo, golpe para os dois lados
- [ ] Smokes `talents`, `fight`, `impact` verdes
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(talents): add the heavy fist dust and the wall stun`

---

#### T38: Contra Afiado no Nv 2 e no Nv 3

**What**: no `onMeleeHit` de um Contra com `counter.lastTakePerfect`: Nv 2+ abre o alvo no `OpenTarget` por 1000 ms e o
`TalentFx` desenha o contorno; a função `crit` dá ×1,25 no alvo aberto; Nv 3 dá +15 de energia e
`loadout.refundCooldown(lastSlot, 0.3)`; o alvo que morre leva o contorno (`onKill` → `onDeath`).
**Where**: `src/scenes/test/talentDirector.ts`
**Depends on**: T35, T37
**Reuses**: `OpenTarget`, F30 `refundCooldown`, `lastSlot`
**Requirement**: TAL-08, TAL-17

**Done when**:

- [ ] `talents.smoke.mjs`: Contra Nv 1/2/3 com ×1,3/1,5/1,7; Contra perfeito no Nv 2 deixa o alvo aberto e o golpe
      seguinte sai `crit` com ×1,25; no Nv 3 a energia sobe 15 e a recarga do último slot cai 30% da cheia
- [ ] Contorno conferido no jogo em HD com o alvo andando para os dois lados
- [ ] Smokes `talents`, `defense` verdes
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(talents): open the target on a perfect counter`

---

#### T39: Passo Sombrio no Nv 2 e no Nv 3

**What**: na esquiva perfeita com Nv 2+, `Afterimage.arm(ownerId, ponto, agora)` e o `TalentFx` desenha o quadro atual
do player a alfa 0,4 preso por 1500 ms (como `fx.ts:161`); o `talentDirector.update` observa a fase do dono (comum
`aiState`, chefe `state`); `combat.attackerOf` põe `decoyed: build.talents.decoys(ownerId)` no `Attacker`;
`Attacker.decoyed` em `player/types.ts`; `player/defense.ts` passa `decoyed` ao `resolveIncomingHit` e `hit.ownerId`
aos `onDefense`; o gancho `onDefense` do `Player.ts:82` ganha o tipo do 3º argumento; Nv 3: `strikeExtras` liga
`unblockable` no golpe sombrio.
**Where**: `src/scenes/test/combat.ts`
**Depends on**: T37
**Reuses**: `Afterimage`, `resolveIncomingHit` com `decoyed` (T30), `EnemyGuard` (`enemyGuard.ts:87`, `:90`)
**Requirement**: TAL-09, TAL-17, VGX-02

**Done when**:

- [ ] `talents.smoke.mjs`: sombrio Nv 1/2/3 com ×1,3/1,5/1,8 e o passo gasto acertando ou não; no Nv 2 o próximo golpe
      do inimigo esquivado não tira HP e a pós-imagem some; outro inimigo fere normalmente; no Nv 3 o golpe sombrio
      atravessa a guarda do comum (`enemy-guard`)
- [ ] `complexity` do `receiveHit` medido no commit (se subir, `IncomingHit` montado em função à parte); `Player.ts` sem
      campo
- [ ] Pós-imagem conferida no jogo em HD esquivando para os dois lados
- [ ] Smokes `talents`, `defense`, `enemy-guard`, `fight` verdes
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(talents): leave a decoy afterimage on a perfect dodge`

---

### Phase 7: Passo 2c — gatilhos de energia, cura, abate e Kokusen

#### T40: Executor no Nv 2 e no Nv 3

**What**: com Nv 2+, a cura solta o número `heal` verde sobre o player e o `TalentHudFx` brilha a barra de vida por
400 ms; com Nv 3, o finalizador soma 20 de carga de Domínio pela tabela `DOMAIN_CHARGE` da F31 (evento novo `executor:
20`, valendo as regras de carga dela).
**Where**: `src/scenes/test/talentDirector.ts`
**Depends on**: T36 (fase 6)
**Reuses**: `DamageNumbers` (F29), F31 `DomainState.addCharge`
**Requirement**: TAL-10, TAL-17

**Done when**:

- [ ] `talents.smoke.mjs`: finalizador no Nv 2 deixa `damageNumbers.last.kind === 'heal'` com o valor curado; no Nv 3 a
      carga de Domínio sobe 20; com Domínio ativo não carrega
- [ ] Brilho conferido no jogo em HD
- [ ] Smokes `talents`, `finisher`, `heal` verdes
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(talents): show the executor heal and charge the domain`

---

#### T41: Refluxo no Nv 2 e no Nv 3

**What**: com Nv 2+, o `TalentHudFx` leva um arco azul de 300 ms do inimigo aparado até a barra de energia (ponto do
mundo convertido para a tela); com Nv 3, o `parry`/`deflect` zera a recarga de `loadout.lastSlot` com o `Cooldown` de
8000 ms gasto só quando zerou; sem último slot ou com ele vazio, nada e o relógio não reinicia.
**Where**: `src/game/TalentHudFx.ts`
**Depends on**: T36 (fase 6)
**Reuses**: `Cooldown`, F30 `lastSlot`
**Requirement**: TAL-11, TAL-17

**Done when**:

- [ ] `talents.smoke.mjs`: parry no Nv 3 com recarga cheia no slot 0 a deixa em 0; segundo parry antes de 8 s não zera;
      parry sem técnica usada não gasta o relógio
- [ ] Arco conferido no jogo em HD aparando dos dois lados
- [ ] Smokes `talents`, `defense` verdes
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(talents): draw the reflux arc and reset the last slot`

---

#### T42: Condutor no Nv 2 e no Nv 3

**What**: com Nv 2+, a cada 3º golpe que acerta na rodada o `TalentHudFx` solta as faíscas do alvo à barra; com Nv 3 e a
energia cheia antes do ganho, um acerto `micro` de `round(6 × kokusenScale.hpMul)` no comum vivo mais perto a até
160 px do alvo (nunca ele, nunca o chefe), no máximo 2 por 1000 ms; em `combat.onConnect` a linha do `build.onMeleeHit`
sobe para antes do `energy.gain` (0 linha líquida).
**Where**: `src/scenes/test/combat.ts`
**Depends on**: T36 (fase 6)
**Reuses**: `nearestWithin`, `RateLimit`, `strikeCountTrigger`
**Requirement**: TAL-12, TAL-17

**Done when**:

- [ ] `talents.smoke.mjs`: com a energia cheia e 2 comuns a 100 px, o golpe tira `round(6 × hpMul)` do vizinho; o 3º
      golpe em 1000 ms não salta; sem vizinho a 160 px, nada
- [ ] Faíscas conferidas no jogo em HD
- [ ] Smokes `talents`, `fight` verdes
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(talents): add the conductor sparks and the chain arc`

---

#### T43: Proporção no Nv 2 e no Nv 3, e o abate no diretor

**What**: `combat.onEnemyDied` (`combat.ts:73`) chama `build.onKill(id, x, y)` (comum e chefe); com Nv 2+, o `TalentFx`
desenha o risco 7:3 por 300 ms no crítico da Proporção; com Nv 3, o abate por crítico marca o comum vivo mais perto a
até 200 px (`RatioMark`), desenhado pelo `TalentFx`; o próximo golpe nele é crítico ×2 e consome a marca.
**Where**: `src/scenes/test/talentDirector.ts`
**Depends on**: T35 (fase 6)
**Reuses**: `RatioMark`, `critMul` com `marked`
**Requirement**: TAL-13, TAL-16, TAL-17

**Done when**:

- [ ] `talents.smoke.mjs`: o crítico no Nv 2 deixa `slash` em `talentFx.world` por 300 ms; no Nv 3 o abate por
      crítico marca o vizinho e o golpe seguinte nele sai `crit` com ×2; o marcado que morre antes não passa a marca
- [ ] Risco e marca conferidos no jogo em HD
- [ ] Smokes `talents`, `enemy-died` verdes
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(talents): slash and mark with the seven three ratio`

---

#### T44: Hora Extra no combate

**What**: o `talentDirector` liga o `Overtime` ao `onKill` e à perda de HP (mesmo critério do `bodyDirector` da F30);
`StatSheet.talentTechMul` (1 exato sem acúmulo); o `StatsDirector` passa `overtimeStacks` ao `buildEffects` e grava
`loadout.damageMul = relicTechMul × talentTechMul`; a `TalentStrip` mostra os gomos da Hora Extra no Nv 2+ (TSP-04); no
Nv 3 no teto, o `TalentFx` desenha a aura laranja presa ao `renderPos`; `stats.overtimeMul` no `StatsSnapshot` (F29).
**Where**: `src/scenes/test/statsDirector.ts`
**Depends on**: T43, T27 (fase 5)
**Reuses**: `Overtime`, F30 `bodyDirector`, F29 `powerSnapshot.ts`
**Requirement**: TAL-14, TSP-04, BEF-01, BEF-05, BEF-06, TAL-17

**Done when**:

- [ ] `tests/core/statSheet.test.ts`: `talentTechMul` 1 com 0 acúmulos não muda o dano da técnica; 1,15 com 3
- [ ] `talents-kokusen.smoke.mjs` (ou `talents.smoke.mjs` se couber): 12 abates no Nv 2 dão 1 acúmulo e
      `stats.overtimeMul` 1,05; o golpe e a técnica sobem 5%; levar dano com 1 acúmulo deixa 0; a faixa mostra 5 gomos
      com 1 cheio; o estado passa de rodada
- [ ] Aura laranja conferida no jogo em HD, parado e correndo, dois lados
- [ ] Smokes `talents`, `power`, `run-loop` verdes
- [ ] Gate verde

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(talents): stack overtime damage from kills`

---

#### T45: Zona Negra no Kokusen

**What**: o `StatsDirector` grava `kokusenScale.mul` e `windowBonusMs` do `buildEffects`; `divergent.ts:94` passa
`windowBonusMs` ao `startAttempt`; o `kokusenSnapshot` ganha `windowMs` e `lastHit: { targetId, x, y, damage }`
(mesma linha do tipo no `debugApi`); com Nv 2+, o `TalentFx` acende o punho de preto enquanto
`kokusenSnapshot.windowOpen`; com Nv 3, o evento `kokusen` chega ao `techDirector`, que chama
`build.talents.onKokusen(...)`: anel `micro` de 48 px com `round(0,3 × dano)` nos outros comuns (nunca o chefe);
`stats.kokusenMul` e `stats.kokusenWindowBonusMs` no `StatsSnapshot`.
**Where**: `src/game/tech/divergent.ts`
**Depends on**: T29 (fase 5)
**Reuses**: `startAttempt(roll, bonusMs)` (T29), `nearestWithin`
**Requirement**: TAL-15, TAL-17, BEF-03, BEF-04, BEF-06

**Done when**:

- [ ] `talents-kokusen.smoke.mjs` (L-043): com Zona Negra Nv 3, `kokusen.windowMs` 30 ms maior que sem o talento na
      mesma seed; `stats.kokusenWindowBonusMs` 30 e `stats.kokusenMul` 3,1; o Kokusen tira `kokusenDamage` com ×3,1;
      um comum a 40 px do alvo perde `round(0,3 × dano)` e o chefe a 40 px não
- [ ] Punho preto conferido no jogo em HD, dois lados
- [ ] Smokes `talents`, `kokusen`, `power` verdes
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(talents): widen and darken the kokusen with the black zone`

---

### Phase 8: Passo 2c — talento na loja e no baú

#### T46: Carta de nível de talento na regra da loja

**What**: talento abaixo do Nv 3 vira item que sobe na elegibilidade e nos itens possuídos da carta 0 e das cartas 2 e
3 (`shopEligibility`, `shopDraw`); talento novo a partir da r2 (`PERK.minRound`), níveis sem trava; o preço do nível
`inflate(TALENT_PRICE.level[nível − 1], round)` no `cardCost`; `maxLevel: 3` na entrada de `PERK_SHOP_ENTRIES`
(`data/shop.ts:193-201`, mesma linha).
**Where**: `src/core/shopPricing.ts`
**Depends on**: T24 (fase 5)
**Reuses**: F30 `cardCost`, `eligible`, `focusItem`
**Requirement**: TAL-04

**Done when**:

- [ ] `tests/core/shopPool.test.ts`: nível 2 custa `round(16 × inflação)` e nível 3 `round(24 × inflação)`; talento no
      Nv 3 não é oferecido (edge case do baú + carta); talento novo na r1 não aparece e na r2 sim
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(shop): offer talent level cards`

---

#### T47: Prévia da carta de nível e a compra que sobe o nível

**What**: `previewText` da carta de nível de talento em 2 linhas (`Forte +15%→+30%` e o `next` do nível, cada uma com até
20 caracteres); o `shopDirector` passa `applyPerk: (id) => perks.has(id) ? perks.levelUp(id) : perks.add(id)`;
`shop.smoke.mjs` ganha o cenário da compra do Nv 2.
**Where**: `src/core/shopPreview.ts`
**Depends on**: T46
**Reuses**: F30 `previewText`, `axisPreview`
**Requirement**: TAL-04, TAL-05

**Done when**:

- [ ] Teste da prévia (arquivo de teste da prévia da F30): texto do Punho Nv 1→2 `Forte +15%→+30%` e `+ poeira e anel`;
      todo texto de prévia de talento com até 20 caracteres
- [ ] `shop.smoke.mjs`: `perks=punhoPesado&fragments=200&round=3`, a carta de nível do Punho sobe `build.talents` para o
      Nv 2 e a carteira cai o preço da carta
- [ ] Smokes `shop`, `shop-progress` verdes
- [ ] Gate verde

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(shop): preview and buy the next talent level`

---

#### T48: Nível de talento no baú do chefe

**What**: `ChestOption` ganha `{ kind: 'talento'; id: PerkId }`; `chestCandidates` inclui um candidato com o talento
sorteado pelo `chestRng` entre os abaixo do Nv 3; `chestOptionId` → `talento:<id>`; o `choiceDirector` confirma com
`perks.levelUp(id)` sem fragmento.
**Where**: `src/core/bossChest.ts`
**Depends on**: T34 (fase 6)
**Reuses**: F33 `chestCandidates`, `drawChest`, `chestRng`
**Requirement**: TAL-06

**Done when**:

- [ ] `tests/core/bossChest.test.ts`: com talento abaixo do Nv 3, a opção existe e nomeia um deles pela seed; sem
      talento ou com todos no Nv 3, não existe; mesma seed, mesmo talento
- [ ] `boss-chest.smoke.mjs` (F33): `perks=executor`, a opção `talento:executor` aparece e sobe o Nv sem gastar
- [ ] Smokes `boss-chest`, `choice-panel` e os do passo 2c (`talents`, `build`, `kokusen`, `fight`, `impact`, `feel`,
      `defense`, `power`) verdes (fim do passo 2c); `TestScene` igual
- [ ] Gate verde

**Tests**: unit + smoke
**Gate**: build
**Commit**: `feat(boss): offer a talent level in the boss chest`

### Phase 9: Passo 3 — bandeja, livro e moldura, regra pura

#### T49: Livro de gastos

**What**: `src/core/spentLedger.ts` (novo): `SpentLedger` com `record(item, paid)`, `spent(item)`, `refund(item)` =
`Math.floor(REFUND × spent)`, `clear(item)`, `reset()`; `LedgerKey = TechId | PerkId | ArsenalId`.
**Where**: `src/core/spentLedger.ts`
**Depends on**: T24 (fase 5)
**Reuses**: `REFUND`
**Requirement**: ABD-02

**Done when**:

- [ ] `tests/core/spentLedger.test.ts` (novo): Vermelho por 34 na r1 + ponto de 13 na r2 devolve 18; item sem `record`
      (técnica inicial, baú, debug) devolve 0; compra na mesma visita nunca devolve mais que o pago; `clear` zera só o
      item; Roxo começa em 60 ou 0 sem herdar as peças (ABD-02.3)
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): record what was spent on each build item`

---

#### T50: Bandeja da build como máquina pura

**What**: `src/core/buildTray.ts` (novo): `TrayItem`, `trayItems(src)` (slots ocupados 0 a 2, Corpo, talentos na ordem
de compra, arma, relíquia, Domínio, só o que existe), `BuildTray` (`toggle`, `close`, `open`, `selected`, `confirm`,
`step(input, items, hasAxes): TrayAction[]`), `focusCycle(current, axesBelowCap, delta)`, `buildBarText(v)` e
`shopHint(rerollCost, trayOpen)`.
**Where**: `src/core/buildTray.ts`
**Depends on**: T17 (fase 4)
**Reuses**: `SlotIndex`, `PoolState`
**Requirement**: BBR-02, BBR-05, BBR-06, BBR-07, BBR-09, ABD-01, ABD-06

**Done when**:

- [ ] `tests/core/buildTray.test.ts` (novo): ordem dos itens; abre no 1º item; `A`/`D` com volta nas duas pontas;
      `W`/`S` só com eixo, ciclo `automático → eixos abaixo do teto → automático` nos dois sentidos; 1º `Enter`
      pergunta, 2º abandona, `A`/`D`/`W`/`S`/`T` com a pergunta aberta fecham sem abandonar; `Enter` no Corpo e no
      Domínio dá `denied`; `buildBarText` com `—` sem arma, relíquia e Domínio; as duas dicas exatas do BBR-09
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the build tray state machine`

---

#### T51: Eixo-foco marcado no `AxisBuild`

**What**: `AxisBuild` (F30/F33) ganha `mark(item, axis | null)`, `markedItem` e `marked(item)`; marcar um item desmarca
o outro; `focusAxis(item)` devolve o eixo marcado abaixo do teto, senão a regra automática; o eixo marcado que chega ao
teto volta a automático e o item continua o foco; `resetItem` e `reset` limpam a marca.
**Where**: `src/core/axisBuild.ts`
**Depends on**: None
**Reuses**: F30 `focusAxis`, `resetItem`
**Requirement**: BBR-07, BBR-08, BBR-11, ABD-08

**Done when**:

- [ ] `tests/core/shopFocus.test.ts` (novo): marca vale abaixo do teto; marcar outro item volta o 1º a automático;
      eixo marcado no teto volta a automático e `markedItem` continua; `resetItem` do item marcado e `reset` limpam
- [ ] Testes do `AxisBuild` da F30/F33 verdes sem mudança
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): let the player mark the focus axis`

---

#### T52: Item-foco marcado na loja e a meta de 60%

**What**: `focusItem` (F30) devolve o item marcado primeiro; sem marca, a regra da F30 com empate slot 0, slot 1,
slot 2, Corpo; os itens possuídos da carta 0 incluem os talentos abaixo do Nv 3 (T46).
**Where**: `src/core/shopDraw.ts`
**Depends on**: T51
**Reuses**: F30 `focusItem`, `drawCards`, `axesFor`
**Requirement**: BBR-08, BBR-10

**Done when**:

- [ ] `tests/core/shopFocus.test.ts`: carta 0 pelo item marcado com o eixo marcado; empate na ordem slot 0, 1, 2, Corpo;
      com 3 técnicas + Corpo + 1 talento e sem marca, o eixo-foco da técnica de maior nível em pelo menos 60% das lojas
      em 1000 seeds, contando as 4 cartas (BBR-10; abaixo de 62%, parar e perguntar ao usuário)
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(shop): follow the marked focus item in card zero`

---

#### T53: `Nv a→b` e a moldura pelo nível

**What**: `frameFor(kind, nextLevel)` em `shopPreview.ts` (cinza `s`, azul `c`, roxo `u`, dourado `A`); `OfferView.frame`
e `levelText` com `Nv a→b` em toda carta que sobe nível (`shop.ts`); `ShopPanel.ts:245-250` troca o ternário de raridade
por `selected ? borderSelected : FRAME_COLOR[offer.frame]` (−3 linhas); `shop.smoke`, `shop-axes.smoke` e
`shop-progress.smoke` trocam o texto `Nv N/6` por `Nv a→b`.
**Where**: `src/core/shopPreview.ts`
**Depends on**: T47 (fase 8)
**Reuses**: `SHOP_PANEL_COLORS`, `PALETTE`
**Requirement**: BBR-04, VGX-02

**Done when**:

- [ ] Teste da prévia da F30: `frameFor` de técnica Nv 2, 3, 4, 5 e 6, de talento Nv 2 e 3, de atributo; `Nv 3→4`
- [ ] `tests/game/shopPanel.test.ts`: a borda segue `offer.frame`; `ShopPanel.ts` com 3 linhas efetivas a menos
- [ ] Smokes `shop`, `shop-axes`, `shop-progress` verdes
- [ ] Gate verde

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(shop): show level steps and frame cards by the level they leave`

---

#### T54: Esvaziar relíquia ou arma

**What**: `Arsenal.clear(kind: 'relic' | 'weapon')` esvazia a vaga e o nível.
**Where**: `src/core/arsenal.ts`
**Depends on**: None
**Reuses**: estado de hoje do `Arsenal`
**Requirement**: ABD-05

**Done when**:

- [ ] Teste do arsenal (arquivo novo `tests/core/arsenalClear.test.ts` se o de hoje estiver perto do teto): `clear` da
      relíquia não mexe na arma e vice-versa; depois do `clear`, a relíquia volta a ser elegível na loja
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): clear the relic or the bound weapon`

---

#### T55: Tirar um item da fila de escolhas

**What**: `ChoiceQueue.removeItem(item)` (F33) tira as páginas pendentes daquele item.
**Where**: `src/core/choice.ts`
**Depends on**: None
**Reuses**: F33 `ChoiceQueue`
**Requirement**: ABD-03

**Done when**:

- [ ] Teste da fila da F33: com páginas do Vermelho e do Azul, `removeItem('vermelho')` deixa só as do Azul na ordem;
      item sem página não muda nada
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): drop pending choices of a removed item`

---

#### T56: Compra recusada da carta de item abandonado

**What**: `Shop.buy` recusa sem cobrar a carta de melhoria cujo item saiu da build (`reason: 'item'`) e a carta de item
novo que deixou de caber no pool (`reason: 'pool'`, já da T23).
**Where**: `src/core/shop.ts`
**Depends on**: None
**Reuses**: `buy` com `reason` (T23)
**Requirement**: ABD-07

**Done when**:

- [ ] `tests/core/shopPool.test.ts`: carta de ponto do Vermelho depois de tirar o Vermelho do `Loadout` devolve
      `reason: 'item'` com a carteira igual; a carta continua em `view().offers`
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(shop): refuse upgrade cards of an item that left the build`

---

### Phase 10: Passo 3 — `BuildBar` e bandeja no jogo

#### T57: Faixa da build na konbini

**What**: `src/game/BuildBar.ts` (novo, `uiLayer`, profundidade do `ShopPanel`): texto do BBR-02 em `y = 360`, ícones
com os pontinhos em `y = 380` (5 para técnica e Corpo, 3 para talento, arma, relíquia e Domínio), `show`, `hide`,
`update(view)`, `debug()`; `scenes/test/trayDirector.ts` (novo, campo `tray` do `BuildDirector`) monta a vista, mostra
a faixa só com a loja aberta, grava `recordBuy(id, cost)` no `SpentLedger` (chamado pelo `resolveBuy`), `reset`,
`snapshot()`; `UiSetup.addHud` cria `ui.buildBar` (+1); `BuildBarSnapshot` em `buildSnapshot.ts`; `buildBar` pelo
`statsDirector.snapshotFields()` e no `GameSnapshot` (+1). `scripts/smoke/build-bar.smoke.mjs` (novo) com
`fragments=300&round=4&tech=vermelho,azul`: a faixa diz `Habilidades 2/7 (Técnicas 2/3) · Corpo Nv1 · Arma — ·
Relíquia — · Domínio —`, some ao sair da loja.
**Where**: `src/scenes/test/trayDirector.ts`
**Depends on**: T49, T50 (fase 9)
**Reuses**: molde do `VowPanel`, `buildBarText`, `trayItems`
**Requirement**: BBR-01, BBR-02, BBR-03, BBR-12, ABD-02, VGX-03

**Done when**:

- [ ] `tests/game/debugApi.test.ts`: literal com `buildBar`
- [ ] Smoke `build-bar` verde; captura em HD da konbini com a faixa (sem cruzar a dica nem as cartas)
- [ ] Smokes `shop`, `vows`, `arsenal` verdes
- [ ] Gate verde

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(shop): show the build bar in the konbini`

---

#### T58: Bandeja com `T` e o eixo-foco marcado

**What**: `ShopInputSnapshot.tray` e a tecla `T` em `game/input.ts` (+4); `shopDirector.updateShop` chama
`build.tray.update(input)` depois do painel da F33 e sai se ela comeu o quadro; a bandeja não abre com `vows.panelOpen`
nem `build.choice.open`; `select` e `focus` (marca no `AxisBuild` pelo `focusCycle`), estrela e nome do eixo sob o ícone;
`shopPanel.update({ ...view, hint: shopHint(rerollCost, tray.open) })` e `ShopPanel.ts:206` lendo `view.hint` (mesma
linha); `tray.onShopClose()` no `finishClose`.
**Where**: `src/scenes/test/trayDirector.ts`
**Depends on**: T57
**Reuses**: `BuildTray`, `focusCycle`, `shopHint`, `AxisBuild.mark` (T51)
**Requirement**: BBR-05, BBR-06, BBR-07, BBR-08, BBR-09, BBR-12

**Done when**:

- [ ] `build-bar.smoke.mjs`: `T`, `D`, `S` marcam o 1º eixo do Azul abaixo do teto, `buildBar.focus` é `{ item: 'azul',
      axis }`, e na seed do smoke a carta 0 do próximo reroll é a do Azul com esse eixo; com a bandeja aberta `1` não
      compra e `Enter` não sai da loja; `T` fecha e `1` volta a comprar; a dica muda entre as duas frases; `T` com o
      `ChoicePanel` aberto não abre
- [ ] `tests/game/shopPanel.test.ts`: a dica vem de `view.hint`; `ShopPanel.ts` sem linha nova
- [ ] Smokes `build-bar`, `shop`, `shop-axes`, `choice-panel` (páginas seguem a marca, BBR-08), `vows` verdes
- [ ] Gate verde

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(shop): open the build tray with T and mark the focus axis`

---

#### T59: Abandonar

**What**: `trayDirector.abandon(item)`: soma `ledger.refund` na carteira; técnica → `loadout.clear(slot)` (que chama
`axes.resetItem`) e `build.choice.removeItem(id)`; talento → `perks.remove(id)` e `talents.removeTalent(id)`; relíquia ou
arma → `arsenal.clear(kind)` e `stats.sync()` no mesmo quadro; `ledger.clear(item)`; evento
`abandon:<item>:<refund>`; `onUnion(from)` limpa o livro das peças; `resolveBuy` emite `buyDenied:item`.
**Where**: `src/scenes/test/trayDirector.ts`
**Depends on**: T58
**Reuses**: `SpentLedger`, `Arsenal.clear` (T54), `ChoiceQueue.removeItem` (T55), `Shop.buy` com `item` (T56)
**Requirement**: ABD-01, ABD-02, ABD-03, ABD-04, ABD-05, ABD-06, ABD-07, ABD-08, ABD-09

**Done when**:

- [ ] `build-bar.smoke.mjs`: `T`, `Enter`, `Enter` no Vermelho comprado esvaziam o slot 0 (o slot 1 fica), a carteira
      sobe `floor(0,4 × pago)`, `abandon:vermelho:<n>` no quadro e o preço do talento novo à vista cai
      `round(8 × inflação)`; `A` com a pergunta aberta não abandona; `Enter` no Corpo mostra `Não sai da build`; a
      carta de ponto do Vermelho é recusada com `buyDenied:item`; abandonar a relíquia baixa `stats`/`power` no mesmo
      quadro; fechar a loja com a pergunta aberta não abandona; abandonar o item marcado volta `buildBar.focus` a `null`
- [ ] Smokes `build-bar`, `shop`, `arsenal`, `power`, `choice-panel`, `run-loop` verdes
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(shop): abandon a build item for part of what it cost`

---

#### T60: `focus=` no debug

**What**: `parseFocusParam(raw)` em `buildParam.ts` (`<item>.<eixo>`, `null` para item ou eixo desconhecido);
`trayDirector.applyDebug()` marca o eixo no reset da run (chamado pelo `applyDebugBuild`, depois do `axes=`) se o
jogador tem o item; `README.md`: `T` na konbini, `focus=<item>.<eixo>`.
**Where**: `src/core/buildParam.ts`
**Depends on**: T58
**Reuses**: `AxisBuild.mark`
**Requirement**: BBR-11

**Done when**:

- [ ] `tests/core/buildParam.test.ts`: `azul.gravidade` (ou o eixo da tabela da F33) dá o par; item, eixo ou formato
      desconhecido dá `null`
- [ ] `build-bar.smoke.mjs`: `focus=azul.<eixo>` deixa `buildBar.focus` marcado na 1ª loja; run nova sem o parâmetro
      volta a `null`
- [ ] Smokes `build-bar`, `shop-axes`, `shop-progress`, `choice-panel`, `vows`, `arsenal`, `run-loop` verdes (fim do
      passo 3); `TestScene` igual
- [ ] Gate verde

**Tests**: unit + smoke
**Gate**: build
**Commit**: `feat(debug): mark the focus axis from the url`

---

### Phase 11: Passo 4 — piso de custo, aura de build e fechamento

#### T61: Piso de custo no agregador

**What**: `techCost({ base, raw, costMul })` = `max(Math.round(raw × costMul), Math.ceil(0,6 × base))` no
`buildEffects`; `techStats.ts` (F30/F33) chama `techCost` no lugar da expressão dele.
**Where**: `src/core/buildEffects.ts`
**Depends on**: None
**Reuses**: expressão de hoje do `techStats.ts`
**Requirement**: BEF-01, BEF-02

**Done when**:

- [ ] `tests/core/buildEffects.test.ts`: para cada técnica, Eficiência 0 a 3, sem voto e com Fluxo selado, `techCost`
      igual ao custo da F33 (os números anotados antes da mudança); o piso nos dois lados (60% exato e um abaixo)
- [ ] Testes `loadoutAxes` e `techStats*` verdes (os casos de equivalência continuam)
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `refactor(core): move the technique cost floor to the build effects`

---

#### T62: Fração e estágio da aura de build

**What**: `src/core/buildAura.ts` (novo): `buildLevels(src)`, `buildFraction(levels) = min(1, levels / 45)`,
`auraStage(fraction)`; `BUILD_AURA = { denominator: 45, stages: [0.15, 0.35, 0.6, 0.85], heightPx: [0, 8, 20, 36, 60] }`
em `data/feel.ts`.
**Where**: `src/core/buildAura.ts`
**Depends on**: None
**Reuses**: nada
**Requirement**: AUR-01, AUR-02

**Done when**:

- [ ] `tests/core/buildAura.test.ts` (novo): teto 1; lutador cheio 39/45; estágios em 7/45 e 6/45, 16/45 e 15/45,
      27/45 e 26/45, 39/45 e 38/45
- [ ] `tests/data/feel.test.ts`: `BUILD_AURA`
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): measure how full the build is`

---

#### T63: Aura de build no player

**What**: `src/game/BuildAura.ts` (novo): fiapos nos pés presos ao `player.renderPos`, altura até 8/20/36/60 px nos
estágios 1 a 4, `PALETTE.c`/`PALETTE.C` com o tom da força da F29 por cima, nada no estágio 0, some no `SHUTDOWN`;
o `StatsDirector.update` calcula o estágio no quadro e o `powerAuraDirector` (F29) chama `buildAura.update(dt, stage,
renderPos)`; `power.buildAura: { stage, fraction }` no `PowerSnapshot` (F29, `powerSnapshot.ts`).
**Where**: `src/game/BuildAura.ts`
**Depends on**: T62
**Reuses**: chama da F29, `powerAuraDirector`
**Requirement**: AUR-03, AUR-04, AUR-05, VGX-03

**Done when**:

- [ ] `tests/game/debugApi.test.ts`: literal com `power.buildAura`
- [ ] `build-bar.smoke.mjs`: build de `tech=` e `perks=` com 27 níveis dá `power.buildAura.stage === 3` no mesmo quadro;
      abandonar um item que derruba a fração baixa o estágio no quadro seguinte da loja
- [ ] Aura conferida no jogo em HD, parado e correndo, para os dois lados, nos estágios 1 e 4 (capturas anotadas)
- [ ] Smokes `build-bar`, `power` verdes
- [ ] Gate verde

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(fx): grow the build aura with the build`

---

#### T64: Fechamento da F35

**What**: `README.md` com o pool, os talentos por nível, a `TalentStrip`, a bandeja (`T`, `A`/`D`, `W`/`S`, `Enter`) e
os parâmetros `tech=` (3), `perks=<id>[:<nível>]` e `focus=`; conferência das regras de casa: `TestScene` com as linhas
anotadas na T1 (VGX-01), `.oxlintrc.json` sem arquivo novo, `ShopPanel.ts`, `Hud.ts` e `moves.ts` sem linha a mais,
`Player.ts` sem campo (VGX-02); `Status` deste arquivo para Done.
**Where**: `README.md`
**Depends on**: T61, T63
**Reuses**: README de hoje
**Requirement**: VGX-01, VGX-02

**Done when**:

- [ ] `git diff --stat` da F35 sem `TestScene.ts` e sem `.oxlintrc.json`; contagem efetiva dos arquivos do VGX-02 anotada
- [ ] Smokes do fim da F35 verdes: `third-slot`, `talents`, `talents-kokusen` (se existir), `build-bar`, `tech`,
      `techniques`, `kokusen`, `evolution`, `fxlab`, `red-anime`, `fight`, `impact`, `feel`, `power`, `vows`, `arsenal`,
      `run-loop`, `choice-panel`, `tech-axes`, `shop`, `shop-axes`, `shop-progress`, `build`, `boss-chest`, `hud`,
      `defense` e os de cada técnica da F34
- [ ] Gate verde

**Tests**: smoke (a lista do fim da F35; nenhum smoke novo)
**Gate**: build
**Commit**: `docs(readme): document vacancies, talents and the build tray`

---

## Requirement Coverage

| Requirement | Tasks |
| --- | --- |
| SIX-01 | T1, T2, T3, T4, T5, T6 |
| SIX-02 | T2, T3, T4, T5, T6 |
| VGX-01 | Todas (nenhuma toca a `TestScene`); conferido em T6, T11, T16, T23, T48, T60, T64 |
| VGX-02 | T6, T35, T36, T39, T53, T58, T64 |
| VGX-03 | T10, T11, T22, T33, T36, T57, T63 |
| TRS-01 | T7 |
| TRS-02 | T4, T7, T8 |
| TRS-03 | T7, T8 |
| TRS-04 | T5, T8 |
| TRS-05 | T5, T8 |
| TRS-06 | T8 |
| TRS-07 | T3, T7 |
| TRS-08 | T3, T7 |
| EHD-01 | T10 |
| EHD-02 | T10 |
| EHD-03 | T11 |
| EHD-04 | T9, T11 |
| EHD-05 | T10, T11 |
| POL-01 | T17 |
| POL-02 | T17, T18 |
| POL-03 | T18 |
| POL-04 | T17, T19 |
| POL-05 | T23 |
| POL-06 | T20 |
| POL-07 | T17, T23 |
| POL-08 | T17 |
| POL-09 | T22 |
| POL-10 | T21, T22 |
| TAL-01 | T13 |
| TAL-02 | T12, T14, T15, T16 |
| TAL-03 | T24 |
| TAL-04 | T46, T47 |
| TAL-05 | T24, T47 |
| TAL-06 | T48 |
| TAL-07 | T25, T37 |
| TAL-08 | T25, T26, T28, T38 |
| TAL-09 | T25, T26, T30, T39 |
| TAL-10 | T25, T31, T34, T40 |
| TAL-11 | T25, T26, T34, T41 |
| TAL-12 | T25, T26, T34, T42 |
| TAL-13 | T25, T26, T35, T36, T43 |
| TAL-14 | T27, T44 |
| TAL-15 | T25, T29, T45 |
| TAL-16 | T25, T31, T35, T43 |
| TAL-17 | T34, T35, T37, T38, T39, T40, T41, T42, T43, T44, T45 |
| TAL-18 | T34 |
| TSP-01 | T33 |
| TSP-02 | T33 |
| TSP-03 | T33, T34 |
| TSP-04 | T44 |
| TSP-05 | T9, T32 |
| TSP-06 | T33 |
| BBR-01 | T57 |
| BBR-02 | T50, T57 |
| BBR-03 | T57 |
| BBR-04 | T53 |
| BBR-05 | T50, T58 |
| BBR-06 | T50, T58 |
| BBR-07 | T50, T51, T58 |
| BBR-08 | T51, T52, T58 |
| BBR-09 | T50, T58 |
| BBR-10 | T52 |
| BBR-11 | T51, T60 |
| BBR-12 | T57, T58 |
| ABD-01 | T50, T59 |
| ABD-02 | T49, T57, T59 |
| ABD-03 | T55, T59 |
| ABD-04 | T26, T59 |
| ABD-05 | T54, T59 |
| ABD-06 | T50, T59 |
| ABD-07 | T56, T59 |
| ABD-08 | T51, T59 |
| ABD-09 | T59 |
| BEF-01 | T14, T15, T16, T25, T44, T61 |
| BEF-02 | T61 |
| BEF-03 | T25, T29, T45 |
| BEF-04 | T25, T29, T45 |
| BEF-05 | T25, T44 |
| BEF-06 | T44, T45 |
| AUR-01 | T62 |
| AUR-02 | T62 |
| AUR-03 | T63 |
| AUR-04 | T63 |
| AUR-05 | T63 |

**Coverage:** 84 total, 84 mapped to tasks, 0 unmapped. Edge cases: talento no Nv 3 por baú e carta (T46, T48); pool
cheio e tudo no teto (T19, T20); abandonar a única técnica (T20, T59); União com o pool cheio (T17); abandono na mesma
visita (T49); loja fecha com a pergunta aberta (T59); `T` com painel aberto (T58); alvo aberto ou marcado que morre
(T26, T38, T43); pós-imagem e outro inimigo (T26, T39); arco sem vizinho (T26, T42); Hora Extra subindo de nível e com
1 acúmulo (T27); anel no chefe (T45); soma de janela acima de 30 (T25); reset da run (T22, T34, T51, T57, T63);
`perks=` repetido (T21); `slotHeld` no 3º slot (T8); ramo pendente do item abandonado (T55, T59).

---

## Phase Execution Map

```
Phase 1 → Phase 2 → ... → Phase 11

Phase 1:   T1, T2, T3, T4, T5, T6
Phase 2:   T7, T8, T9, T10, T11
Phase 3:   T12, T13, T14, T15, T16
Phase 4:   T17, T18, T19, T20, T21, T22, T23
Phase 5:   T24, T25, T26, T27, T28, T29, T30, T31
Phase 6:   T32, T33, T34, T35, T36, T37, T38, T39
Phase 7:   T40, T41, T42, T43, T44, T45
Phase 8:   T46, T47, T48
Phase 9:   T49, T50, T51, T52, T53, T54, T55, T56
Phase 10:  T57, T58, T59, T60
Phase 11:  T61, T62, T63, T64
```

Ordem estritamente sequencial (a linha é a ordem de trabalho, não dependência). 64 tarefas em lotes de fases inteiras
(~7 por agente, agente novo por lote, memória "Agente novo por lote"): Fase 1 (6, refatoração mecânica: Sonnet serve),
Fase 2 (5, HUD e arte), Fase 3 (5, refatoração: Sonnet serve), Fase 4 (7), Fase 5 (8), Fase 6 (8, arte), Fase 7 (6,
arte), Fase 8 (3), Fase 9 (8), Fases 10+11 (8, arte na T63): 10 lotes. Lotes com arte (Fases 2, 6, 7 e 10+11) em Opus
5.5 ou Fable.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1, T12, T14, T21, T26, T27, T49, T50, T62 | 1 módulo novo ou 1 bloco de dados | ✅ |
| T2, T13, T17, T18, T19, T20, T28, T29, T30, T31, T51, T52, T54, T55, T56, T61 | 1 classe ou 1 função | ✅ |
| T3 | 1 regra (União) + 2 trocas de tipo em `cast.ts` e `mastery.ts` | ⚠️ coeso: só tipos além da União |
| T4 | 1 caminho (tecla → conjuração) em 5 adaptadores | ⚠️ coeso: os tipos de `slotPressed` atravessam os 5 |
| T5 | 4 leitores do slot nos diretores e no snapshot | ⚠️ coeso: só tipos e laços |
| T6 | 1 extração | ✅ |
| T7 | 1 constante + as teclas e a letra que ela exige | ⚠️ coeso: sem as teclas o 3º slot quebra em execução |
| T8 | 1 smoke + 2 linhas do README | ✅ |
| T9, T32 | 1 arquivo de arte | ✅ |
| T10, T11 | 1 vista + o tipo e o campo que a provam | ⚠️ coeso (L-076) |
| T15, T16 | 1 leitor trocado de fonte | ✅ |
| T22 | 1 método do diretor + o campo do pool | ⚠️ coeso |
| T23 | 1 recusa + a etiqueta na mesma vista + o smoke e a AD | ⚠️ coeso: a etiqueta sem a recusa deixa a carta mentindo |
| T24 | 1 tabela + a afinidade que o tipo novo exige + o smoke que os números quebram | ⚠️ coeso: o número sem a prova deixa o gate vermelho |
| T25 | 1 agregador ampliado + 1 constante de teto | ✅ |
| T33 | 1 vista + o campo + o smoke que nasce com ela | ⚠️ coeso |
| T34 | 1 diretor + os repasses do `BuildDirector` | ⚠️ coeso: o diretor sem dono não roda |
| T35 | 1 valor (crítico) por 4 camadas | ⚠️ coeso: sem o último elo o número não chega ao dano |
| T36 | 1 linha em 2 barras (comum e chefe) + o campo que prova | ⚠️ coeso |
| T37, T38, T39, T40, T41, T42, T43, T44, T45 | 1 talento nos níveis 2 e 3 | ✅ (o mesmo talento, o mesmo commit) |
| T46 | 1 carta (nível de talento) em preço, elegibilidade e sorteio | ⚠️ coeso: a carta só existe com os três |
| T47 | 1 prévia + a compra que ela anuncia | ⚠️ coeso |
| T48 | 1 opção do baú + a confirmação | ⚠️ coeso |
| T53 | 1 moldura do `core` + a leitura no `ShopPanel` | ⚠️ coeso |
| T57 | 1 diretor + a vista que ele dirige + o campo | ⚠️ coeso (L-076) |
| T58 | 1 fluxo (bandeja aberta) + a tecla e a dica | ⚠️ coeso: a tecla sem o fluxo não faz nada |
| T59 | 1 ação (abandonar) | ✅ |
| T60 | 1 parser + quem o aplica | ⚠️ coeso |
| T63 | 1 vista + o estágio e o campo que a provam | ⚠️ coeso |
| T64 | 1 documento + conferência | ✅ |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | — | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T1 | T1 → T4 | ✅ Match |
| T5 | T2, T3 | T2 → T5, T3 → T5 | ✅ Match |
| T6 | T4, T5 | T4 → T6, T5 → T6 | ✅ Match |
| T7 | T6 (fase 1) | — (fase anterior) | ✅ Match |
| T8 | T7 | T7 → T8 | ✅ Match |
| T9 | None | — | ✅ Match |
| T10 | T7 | T7 → T10 | ✅ Match |
| T11 | T9, T10 | T9 → T11, T10 → T11 | ✅ Match |
| T12 | None | — | ✅ Match |
| T13 | T12 | T12 → T13 | ✅ Match |
| T14 | T13 | T13 → T14 | ✅ Match |
| T15 | T14 | T14 → T15 | ✅ Match |
| T16 | T15 | T15 → T16 | ✅ Match |
| T17 | T16 (fase 3) | — (fase anterior) | ✅ Match |
| T18 | T17 | T17 → T18 | ✅ Match |
| T19 | T17 | T17 → T19 | ✅ Match |
| T20 | T19 | T19 → T20 | ✅ Match |
| T21 | T13 (fase 3) | — (fase anterior) | ✅ Match |
| T22 | T17, T21 | T17 → T22, T21 → T22 | ✅ Match |
| T23 | T18, T20, T22 | T18 → T23, T20 → T23, T22 → T23 | ✅ Match |
| T24 | T23 (fase 4) | — (fase anterior) | ✅ Match |
| T25 | T24 | T24 → T25 | ✅ Match |
| T26 | None | — | ✅ Match |
| T27 | T24 | T24 → T27 | ✅ Match |
| T28 | T26 | T26 → T28 | ✅ Match |
| T29 | T25 | T25 → T29 | ✅ Match |
| T30 | None | — | ✅ Match |
| T31 | None | — | ✅ Match |
| T32 | T9 (fase 2) | — (fase anterior) | ✅ Match |
| T33 | T32 | T32 → T33 | ✅ Match |
| T34 | T33 | T33 → T34 | ✅ Match |
| T35 | T34 | T34 → T35 | ✅ Match |
| T36 | T35 | T35 → T36 | ✅ Match |
| T37 | T34 | T34 → T37 | ✅ Match |
| T38 | T35, T37 | T35 → T38, T37 → T38 | ✅ Match |
| T39 | T37 | T37 → T39 | ✅ Match |
| T40 | T36 (fase 6) | — (fase anterior) | ✅ Match |
| T41 | T36 (fase 6) | — (fase anterior) | ✅ Match |
| T42 | T36 (fase 6) | — (fase anterior) | ✅ Match |
| T43 | T35 (fase 6) | — (fase anterior) | ✅ Match |
| T44 | T43, T27 (fase 5) | T43 → T44 | ✅ Match |
| T45 | T29 (fase 5) | — (fase anterior) | ✅ Match |
| T46 | T24 (fase 5) | — (fase anterior) | ✅ Match |
| T47 | T46 | T46 → T47 | ✅ Match |
| T48 | T34 (fase 6) | — (fase anterior) | ✅ Match |
| T49 | T24 (fase 5) | — (fase anterior) | ✅ Match |
| T50 | T17 (fase 4) | — (fase anterior) | ✅ Match |
| T51 | None | — | ✅ Match |
| T52 | T51 | T51 → T52 | ✅ Match |
| T53 | T47 (fase 8) | — (fase anterior) | ✅ Match |
| T54 | None | — | ✅ Match |
| T55 | None | — | ✅ Match |
| T56 | None | — | ✅ Match |
| T57 | T49, T50 (fase 9) | — (fase anterior) | ✅ Match |
| T58 | T57 | T57 → T58 | ✅ Match |
| T59 | T58 | T58 → T59 | ✅ Match |
| T60 | T58 | T58 → T60 | ✅ Match |
| T61 | None | — | ✅ Match |
| T62 | None | — | ✅ Match |
| T63 | T62 | T62 → T63 | ✅ Match |
| T64 | T61, T63 | T61 → T64, T63 → T64 | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1, T2, T3 | Regra pura (refatoração) | unit | unit | ✅ OK |
| T4, T5, T6 | Adaptadores e vista do motor (refatoração) | smoke | smoke | ✅ OK |
| T7 | Regra pura + adaptador (teclas) | unit, smoke | unit + smoke | ✅ OK |
| T8 | Smoke novo + documentação | smoke | smoke | ✅ OK |
| T9, T32 | Arte em código | unit + prancha | unit + prancha | ✅ OK |
| T10, T11 | Vista do motor + tipos de snapshot | smoke, unit | unit + smoke | ✅ OK |
| T12 | Dados | unit | unit | ✅ OK |
| T13, T15 | Regra pura (refatoração com smokes iguais) | unit | unit + smoke | ✅ OK |
| T14, T17, T18, T19, T20, T21, T25, T26, T27, T28, T29, T30, T31, T46, T49, T50, T51, T52, T54, T55, T56, T61, T62 | Regra pura / dados | unit | unit | ✅ OK |
| T16 | Adaptador + dados | smoke, unit | unit + smoke | ✅ OK |
| T22, T23, T24 | Regra pura / dados + adaptador + tipos | unit, smoke | unit + smoke | ✅ OK |
| T33, T34, T36, T44, T47, T48, T53, T57, T58, T60, T63 | Adaptador ou vista + regra pura, vista testável ou tipos | unit, smoke | unit + smoke | ✅ OK |
| T35, T37, T38, T39, T40, T41, T42, T43, T45, T59 | Adaptadores e vistas do motor | smoke | smoke | ✅ OK |
| T64 | Documentação + conferência | none | smoke (só roda a lista) | ✅ OK |

