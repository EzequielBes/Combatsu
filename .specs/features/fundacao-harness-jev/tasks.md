# Fundação da expansão — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/fundacao-harness-jev/spec.md`
**Design**: `.specs/features/fundacao-harness-jev/design.md`
**Status**: Approved
**Branch**: `feat/fundacao-harness-jev`
**Test count before this feature**: 198

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `vitest.config.ts` (`tests/**/*.test.ts`, ambiente node, sem limite de cobertura); `.specs/STATE.md` AD-001. Sem `AGENTS.md`/`CONTRIBUTING.md` - strong defaults aplicados.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Lógica pura (`src/core/**`) | unit | Todos os ramos; 1:1 com os ACs; todo caso de borda listado com teste próprio | `tests/core/*.test.ts` | `npm test` |
| Módulos puros sem `phaser` como valor (`src/game/debugApi.ts`, `scripts/**/lib.ts`, `tools/**/lib.ts`) | unit | 1:1 com os ACs que cabem na lógica; fakes para game, fetch, sleep e fs | `tests/game/*.test.ts`, `tests/scripts/*.test.ts`, `tests/tools/*.test.ts` | `npm test` |
| Adaptadores Phaser (`src/game/*.ts` com `phaser`, `src/scenes/**`, `src/main.ts`) | smoke | Um cenário `scripts/smoke/*.smoke.mjs` por AC de adaptador, com asserção sobre o snapshot | `scripts/smoke/*.smoke.mjs` | `npm run smoke` |
| CLIs (`scripts/smoke/run.mjs`, `tools/jev-refine.mjs`) | smoke | Execução real registrada no commit (saída e código de saída) | - | o próprio comando |
| Config (`package.json`, `.gitignore`) | none / unit | `package.json`: build gate; `.gitignore`: teste de conteúdo (FND-19) | `tests/tools/*.test.ts` | `npm test` |

## Gate Check Commands

> Generated from codebase (`package.json` scripts) - confirm before Execute. Não há linter; o typecheck estrito roda no `npm run build`.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tasks com testes unitários | `npm test` |
| Full | Tasks com cenários de smoke | `npm test && npm run smoke` |
| Build | Config, última task de cada fase | `npm run build && npm test` |

---

## Execution Plan

As fases rodam em sequência; dentro de cada fase as tasks rodam em ordem.

### Phase 1: Núcleo puro

```
T1 → T2 → T3
```

### Phase 2: Harness de smoke

```
T4 → T5 → T6
```

### Phase 3: Debug API e morte do inimigo

```
T7 → T8
```

### Phase 4: Refinamento Jev

```
T9 → T10 → T11 → T12
```

---

## Task Breakdown

### T1: Criar o Rng com seed

**What**: Classe `Rng` (mulberry32) com `next`, `int` e `chance`.
**Where**: `src/core/rng.ts`
**Depends on**: None
**Reuses**: padrão de classe pura de `src/core/hitstop.ts`
**Requirement**: FND-01, FND-02, FND-20, FND-03, FND-21

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Mesma seed dá os mesmos 1000 `next()` (FND-01); seeds diferentes dão sequências diferentes
- [x] `next()` em [0, 1) em 10 000 amostras (FND-02); `int(min, max)` inteiro em [min, max], `int(3, 3) === 3` (FND-20 + edge)
- [x] `chance(0)`, `chance(-1)` são `false` (FND-03); `chance(1)`, `chance(2)` são `true` (FND-21)
- [x] Gate check passes: `npm test`
- [x] Test count: 198 + novos testes passam

**Tests**: unit
**Gate**: quick

**Commit**: `feat(core): add seeded rng`

---

### T2: Proibir Math.random no núcleo

**What**: Teste que lê os arquivos de `src/core` e `src/data` e falha se algum citar `Math.random`.
**Where**: `tests/core/noMathRandom.test.ts`
**Depends on**: T1
**Reuses**: nenhum
**Requirement**: FND-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] O teste lista os arquivos `.ts` de `src/core` e `src/data` (lista não vazia) e nenhum contém `Math.random`
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `test(core): forbid math random in core and data`

---

### T3: Adicionar Health.heal

**What**: `heal(n)` com teto em `maxHp`, devolvendo o que foi restaurado.
**Where**: `src/core/health.ts`
**Depends on**: T2
**Reuses**: `Health` existente
**Requirement**: FND-05, FND-06, FND-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] hp 50/100, `heal(20)` → hp 70, devolve 20 (FND-05); hp 95/100, `heal(10)` → hp 100, devolve 5 (edge)
- [x] Morto: `heal(30)` → hp 0, devolve 0 (FND-06)
- [x] `heal(0)`, `heal(-5)`, `heal(NaN)`, `heal(Infinity)` → hp inalterado, devolve 0 (FND-07)
- [x] Gate check passes: `npm run build && npm test`

**Tests**: unit
**Gate**: build

**Commit**: `feat(core): add capped heal to health`

---

### T4: Adicionar puppeteer-core e o script smoke

**What**: `puppeteer-core` em devDependencies e script `"smoke": "node scripts/smoke/run.mjs"`.
**Where**: `package.json`
**Depends on**: None
**Reuses**: nenhum
**Requirement**: FND-23

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `npm install -D puppeteer-core` concluído (lockfile atualizado)
- [x] Script `smoke` presente
- [x] Gate check passes: `npm run build && npm test`

**Tests**: none
**Gate**: build

**Commit**: `build(smoke): add puppeteer-core and smoke script`

---

### T5: Lógica pura do smoke runner

**What**: `findEdge`, `DEFAULT_EDGE_PATHS`, `exitCodeFor` e `failedNames`.
**Where**: `scripts/smoke/lib.ts`
**Depends on**: T4
**Reuses**: nenhum
**Requirement**: FND-11, FND-12

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `findEdge` prefere `EDGE_PATH` existente; senão o primeiro candidato existente; nenhum → `null` (FND-12)
- [x] `DEFAULT_EDGE_PATHS` contém os dois caminhos padrão do Windows (Program Files e Program Files (x86))
- [x] `exitCodeFor` → 0 com todos ok, 1 com ao menos uma falha; `failedNames` lista só os que falharam (FND-11)
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(smoke): add edge lookup and exit code rules`

---

### T6: Smoke runner e cenário sem debug

**What**: `run.mjs` (Edge → build → preview → cenários → código de saída) e o cenário `no-debug.smoke.mjs`.
**Where**: `scripts/smoke/run.mjs`
**Depends on**: T5
**Reuses**: `scripts/smoke/lib.ts`; flags do harness antigo (`--use-angle=swiftshader`)
**Requirement**: FND-23, FND-11, FND-12, FND-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `npm run smoke` roda o build, o preview e `no-debug.smoke.mjs` (sem `?debug`: canvas existe e `window.__game === undefined`) e sai com 0 (FND-23, FND-10)
- [x] Um cenário temporário que falha de propósito faz o comando sair com 1 e imprimir o nome dele (FND-11); o cenário é apagado antes do commit
- [x] `EDGE_PATH` inválido com o Edge presente ainda acha o Edge padrão; o caminho do código 2 está coberto pelo teste do T5 (FND-12)
- [x] Gate check passes: `npm test && npm run smoke`

**Tests**: smoke
**Gate**: full

**Commit**: `feat(smoke): add headless edge smoke runner`

---

### T7: Debug API do window.__game

**What**: `registerDebugProbe`, `installDebugApi` com `snapshot` e `step` em modo manual.
**Where**: `src/game/debugApi.ts`
**Depends on**: None
**Reuses**: nenhum (sem `phaser` como valor)
**Requirement**: FND-09, FND-10, FND-22

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `debugOn=false` → `target.__game` fica `undefined` (FND-10)
- [x] `snapshot()` devolve o que o probe registrado devolve (FND-09)
- [x] `step(100)` com game falso: `loop.sleep` chamado uma vez em toda a vida; `headlessStep` chamado `ceil(100/(1000/60)) = 6` vezes, com delta 1000/60 e tempo crescente (FND-22); uma segunda chamada `step(50)` soma mais 3 chamadas sem novo `sleep`
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(debug): add window game debug api`

---

### T8: Ligar a debug API e a morte do inimigo na cena

**What**: `main.ts` instala a API; `TestScene` registra o probe, monta o snapshot e recebe `onEnemyDied`; `Enemy` repassa `died` e expõe `hp`; `Player` expõe `dead`; cenários `boot.smoke.mjs` e `enemy-died.smoke.mjs`.
**Where**: `src/scenes/TestScene.ts`
**Depends on**: T7
**Reuses**: `debugApi.ts`, `isDebug()`, `enemy.id`
**Requirement**: FND-08, FND-09, FND-22

> Toca `src/main.ts`, `src/game/Enemy.ts`, `src/game/Player.ts` e dois cenários: é a integração de um único fluxo, e separar deixaria código de adaptador sem verificação (merge forward).

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `boot.smoke.mjs` (`?debug`): snapshot com `player { x, y, hp: 100, dead: false }` e 2 inimigos com `id`, `hp: 60`, `state: 'idle'`; após `step(500)` o `x` de algum inimigo mudou (patrulha) (FND-09, FND-22)
- [x] `enemy-died.smoke.mjs` (`?debug`): tecla 2 (golpe forte de teste, 18 de dano) até os inimigos morrerem; `events` tem exatamente um `enemyDied:<id>` por inimigo, e nenhum a mais depois de mais `step(3000)` (FND-08)
- [x] Gate check passes: `npm run build && npm test && npm run smoke`

**Tests**: smoke
**Gate**: full

**Commit**: `feat(game): expose debug snapshot and enemy death to scene`

---

### T9: Ignorar .env.local no git

**What**: Linha `.env.local` no `.gitignore` e teste que confere.
**Where**: `.gitignore`
**Depends on**: None
**Reuses**: nenhum
**Requirement**: FND-19

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `tests/tools/gitignore.test.ts` lê o `.gitignore` e acha a linha exata `.env.local` (FND-19)
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `chore(tools): ignore env local file`

---

### T10: Parser, flags e relatório do Jev refine

**What**: `parseAcs`, `flagsFor`, `buildRequest` e `formatReport`.
**Where**: `tools/jev-refine/lib.ts`
**Depends on**: T9
**Reuses**: protótipo do scratchpad (24/09)
**Requirement**: FND-13, FND-14

**Tools**:

- MCP: NONE
- Skill: `typesafe:typesafe-ai` (formato das perguntas)

**Done when**:

- [ ] `parseAcs` extrai ID, story e critério de uma spec de exemplo; spec sem AC lança `nenhum AC encontrado` (edge)
- [ ] `flagsFor`: cada limiar isolado (ambiguous 0,61 → flag, 0,60 → não; bundled idem; testable 0,59 → flag, 0,60 → não; precision 1,99 → flag, 2 → não) (FND-14)
- [ ] `formatReport`: uma linha por AC com ID, os 4 valores e os nomes dos julgamentos que sinalizaram ou `ok` (FND-13)
- [ ] `buildRequest`: `model: 'jev-latest'`, 3 perguntas noul + `precision` score com 4 níveis
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(tools): add jev refine parsing and report`

---

### T11: Chave e chamadas com retry do Jev refine

**What**: `readKey`, `askWithRetry` e `JevAuthError`.
**Where**: `tools/jev-refine/lib.ts`
**Depends on**: T10
**Reuses**: formato da API em `https://docs.typesafe.ai/api.md`
**Requirement**: FND-15, FND-16, FND-24, FND-17, FND-18

**Tools**:

- MCP: NONE
- Skill: `typesafe:typesafe-ai`

**Done when**:

- [ ] `readKey`: ambiente primeiro; senão a linha `TYPESAFE_API_KEY=` do `.env.local`; nada → `null` (FND-15)
- [ ] `fetch` falso com 429, 429, 200 → devolve as respostas, com esperas registradas `[1000, 2000]` (FND-16)
- [ ] 529 quatro vezes → `{ error: '529' }`, com esperas `[1000, 2000, 4000]` (FND-24)
- [ ] 401 e 422 → lança `JevAuthError` com o status e a mensagem da API (FND-17)
- [ ] A mensagem do erro e o texto do relatório não contêm a chave usada no teste (FND-18)
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(tools): add jev key lookup and retrying client`

---

### T12: CLI do Jev refine

**What**: `tools/jev-refine.mjs`: lê a spec e a chave, chama o Jev com até 4 ACs em paralelo, grava `refinement.md` e define o código de saída.
**Where**: `tools/jev-refine.mjs`
**Depends on**: T11
**Reuses**: `tools/jev-refine/lib.ts`
**Requirement**: FND-13, FND-15, FND-17

**Tools**:

- MCP: NONE
- Skill: `typesafe:typesafe-ai`

**Done when**:

- [ ] Sem chave: `node tools/jev-refine.mjs .specs/features/run-e-rodadas/spec.md` imprime o aviso, não cria arquivo e sai com 0 (FND-15)
- [ ] Com chave inválida: sai com 1 e imprime o status 401 (FND-17)
- [ ] Com a chave do usuário (só no ambiente): grava `.specs/features/run-e-rodadas/refinement.md` com 31 linhas de AC (FND-13); a revisão do autor existente é preservada
- [ ] Gate check passes: `npm run build && npm test`

**Tests**: smoke
**Gate**: build

**Commit**: `feat(tools): add jev refine cli`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1 ------→ T2 ------→ T3
Phase 2:  T4 ------→ T5 ------→ T6
Phase 3:  T7 ------→ T8
Phase 4:  T9 ------→ T10 -----→ T11 -----→ T12
```

---

## Validation

### Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | 1 classe | ✅ |
| T2 | 1 teste | ✅ |
| T3 | 1 método | ✅ |
| T4 | 1 arquivo de config | ✅ |
| T5 | 4 funções coesas num arquivo | ⚠️ OK (coeso) |
| T6 | runner + 1 cenário | ⚠️ OK (o cenário é o teste do runner) |
| T7 | 1 módulo | ✅ |
| T8 | integração em 5 arquivos | ⚠️ Aceito: merge forward, fluxo único |
| T9 | 1 linha + teste | ✅ |
| T10 | 4 funções coesas | ⚠️ OK (coeso) |
| T11 | 3 itens coesos | ⚠️ OK (coeso) |
| T12 | 1 CLI | ✅ |

### Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | início da Phase 1 | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | T2 | T2 → T3 | ✅ |
| T4 | None | início da Phase 2 | ✅ |
| T5 | T4 | T4 → T5 | ✅ |
| T6 | T5 | T5 → T6 | ✅ |
| T7 | None | início da Phase 3 | ✅ |
| T8 | T7 | T7 → T8 | ✅ |
| T9 | None | início da Phase 4 | ✅ |
| T10 | T9 | T9 → T10 | ✅ |
| T11 | T10 | T10 → T11 | ✅ |
| T12 | T11 | T11 → T12 | ✅ |

### Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | `src/core` | unit | unit | ✅ |
| T2 | teste de núcleo | unit | unit | ✅ |
| T3 | `src/core` | unit | unit | ✅ |
| T4 | config (`package.json`) | none | none | ✅ |
| T5 | `scripts/**/lib.ts` | unit | unit | ✅ |
| T6 | CLI + cenário | smoke | smoke | ✅ |
| T7 | `src/game/debugApi.ts` (puro) | unit | unit | ✅ |
| T8 | adaptadores Phaser | smoke | smoke | ✅ |
| T9 | config (`.gitignore`) | unit | unit | ✅ |
| T10 | `tools/**/lib.ts` | unit | unit | ✅ |
| T11 | `tools/**/lib.ts` | unit | unit | ✅ |
| T12 | CLI | smoke | smoke | ✅ |
