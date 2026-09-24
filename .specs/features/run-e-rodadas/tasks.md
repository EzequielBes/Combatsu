# Run, rodadas e dificuldade progressiva — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/run-e-rodadas/spec.md`
**Design**: `.specs/features/run-e-rodadas/design.md`
**Status**: Approved
**Branch**: `feat/run-e-rodadas` (a partir de `dev`; volta para `dev` com `--no-ff` após o Verifier PASS, AD-008)
**Test count before this feature**: 248

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `vitest.config.ts` (`tests/**/*.test.ts`, node); `.specs/STATE.md` AD-001/AD-006; matriz da F0 (`fundacao-harness-jev/tasks.md`). Sem `AGENTS.md` - strong defaults aplicados.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Lógica pura (`src/core/**`) | unit | Todos os ramos; 1:1 com os ACs; todo edge case com teste próprio; limites exatos (ex.: 599/600 ms, 799/800 ms, 999/1000 ms, 2499/2500 ms) | `tests/core/*.test.ts` | `npm test` |
| Tuning (`src/data/tuning.ts`) | unit | Valores iguais às Assumptions da spec | `tests/data/*.test.ts` | `npm test` |
| Adaptadores Phaser (`src/game/*.ts`, `src/scenes/**`) | smoke | Um cenário com asserção sobre o snapshot por AC visível no jogo | `scripts/smoke/*.smoke.mjs` | `npm run smoke` |
| Paleta dos textos novos | unit | Cores novas pertencem à paleta | `tests/game/art.test.ts` | `npm test` |

## Gate Check Commands

> Generated from codebase (`package.json`) - confirm before Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tasks com testes unitários | `npm test` |
| Full | Tasks com cenários de smoke | `npm run build && npm test && npm run smoke` |
| Build | Última task de cada fase | `npm run build && npm test` |

---

## Execution Plan

As fases rodam em sequência; dentro de cada fase as tasks rodam em ordem.

### Phase 1: Núcleo da run (puro)

```
T1 → T2 → T3 → T4 → T5 → T6
```

### Phase 2: Integração no jogo

```
T7 → T8
```

---

## Task Breakdown

### T1: Constantes de dificuldade, onda e run

**What**: `DIFFICULTY`, `WAVE` e `RUN` com os valores das Assumptions da spec.
**Where**: `src/data/tuning.ts`
**Depends on**: None
**Reuses**: tipos que T2, T5 e T6 exportam (declarar as interfaces `DifficultyTuning`, `WaveTuning`, `RunTuning` onde os módulos de core as esperam, importando só tipos)
**Requirement**: DIF-01, DIF-05, DIF-06, WAVE-01, WAVE-03, WAVE-04, WAVE-09, RUN-10, RUN-11, RHUD-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `DIFFICULTY = { hpPerRound: 0.12, hpCap: 3.0, damagePerRound: 0.08, damageCap: 2.5, speedPerRound: 0.03, speedCap: 1.4 }`
- [x] `WAVE = { base: 3, max: 12, maxAlive: 4, pointGapMs: 800 }`
- [x] `RUN = { intermissionMs: 2500, gameOverLockMs: 1000, spawnGraceMs: 600, bannerMs: 1500 }`
- [x] `tests/data/tuning.test.ts` confere cada valor
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(data): add difficulty, wave and run tuning`

---

### T2: Escala de dificuldade por rodada

**What**: `multipliersFor(round)` e `scaleFor(round, base, t)`.
**Where**: `src/core/difficulty.ts`
**Depends on**: T1
**Reuses**: `EnemyTuning`, `EnemyAITuning`, `AttackStep`; `ENEMY`, `ENEMY_AI`, `ENEMY_ATTACK` como base nos testes
**Requirement**: DIF-01, DIF-05, DIF-06, DIF-02, DIF-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] maxHp: r1 = 60, r2 = 67, r5 = 89, r10 = 125, r18 = 180 (teto), r30 = 180 (DIF-01)
- [x] dano: r1 = 12, r2 = 13, r5 = 16, r19 = 29, r20 = 30 (teto), r40 = 30 (DIF-05)
- [x] velocidade: r1 = ×1, r15 = ×1,4 (teto), r30 = ×1,4, aplicado a `patrolSpeed` e `chaseSpeed`; os outros campos da IA ficam iguais (DIF-06)
- [x] Para r de 2 a 100, cada multiplicador ≥ o de r − 1 (DIF-02)
- [x] Rodadas 0, −3 e 2.5 devolvem exatamente os valores da rodada 1 (DIF-03)
- [x] `scaleFor` não altera o objeto base
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(core): add per-round enemy scaling`

---

### T3: Graça ao nascer

**What**: `SpawnGrace` com `update(dt)` e `active`.
**Where**: `src/core/spawnGrace.ts`
**Depends on**: T2
**Reuses**: padrão de `src/core/hitstop.ts`
**Requirement**: WAVE-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `new SpawnGrace(600)`: ativo em 0, ainda ativo após 599 ms somados, inativo em 600 ms e depois (WAVE-09)
- [x] Soma de vários `update` pequenos dá o mesmo resultado que um grande
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(core): add spawn grace timer`

---

### T4: Reset da vida e player sem respawn

**What**: `Health.reset()`; teste de que `respawnMs: Infinity` nunca emite `respawn`.
**Where**: `src/core/health.ts`
**Depends on**: T3
**Reuses**: `Health` e testes existentes
**Requirement**: RUN-03, RUN-02, RUN-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Com `respawnMs: Infinity`, depois de morrer e somar 1 000 000 ms de `update`, `dead` continua `true` e nenhum `respawn` é emitido (RUN-03)
- [x] `reset()` depois de morto: hp = maxHp, `dead = false`, sem invulnerabilidade nem atordoamento (RUN-02/05)
- [x] `reset()` com hp parcial e invulnerável: hp = maxHp e `invulnerable = false`
- [x] Testes HP-01..04 existentes continuam passando sem alteração
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(core): add health reset for new runs`

---

### T5: Onda da rodada

**What**: `waveSize`, `requireSpawnPoints` e `WaveSpawner`.
**Where**: `src/core/waves.ts`
**Depends on**: T4
**Reuses**: `Rng` (`src/core/rng.ts`)
**Requirement**: WAVE-01, WAVE-02, WAVE-03, WAVE-04, WAVE-06, WAVE-07, WAVE-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `waveSize`: r1 = 3, r5 = 7, r10 = 12, r11 = 12, r20 = 12 (WAVE-01 + edge das rodadas ≥ 10)
- [ ] Rodízio: o k-ésimo spawn sai no ponto `(s + k) mod P`, com `s` igual a `rng.int(0, P − 1)` de um `Rng` de mesma seed (WAVE-02)
- [ ] Com 4 vivos nenhum spawn sai, mesmo passados 800 ms (WAVE-03)
- [ ] Com menos de 4 vivos e fila não vazia: o próximo sai assim que passam 800 ms desde o último spawn naquele ponto (799 ms não sai, 800 ms sai) (WAVE-04)
- [ ] `P = 1`: todos no ponto 0, espaçados de 800 ms (edge)
- [ ] O mesmo id morto duas vezes conta 1 em `kills` e 1 em `remaining`; o segundo `enemyDied` devolve `false` (WAVE-06)
- [ ] Dois ids diferentes mortos antes do mesmo `update`: `kills` +2 e `remaining` −2 (WAVE-08)
- [ ] Duas instâncias com a mesma seed e a mesma sequência de mortes produzem os mesmos pares `(atMs, point)` (WAVE-07)
- [ ] `requireSpawnPoints({ enemies: [] }, 'level1')` lança uma mensagem com `level1` (edge)
- [ ] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(core): add round wave spawner`

---

### T6: Máquina de estados da run

**What**: `Run`, `RunCommand` e `acceptsPlayerInput`.
**Where**: `src/core/run.ts`
**Depends on**: T5
**Reuses**: `WaveSpawner`, `Rng`
**Requirement**: RUN-01, RUN-02, RUN-04, RUN-05, RUN-06, RUN-07, RUN-08, RUN-10, RUN-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Estado inicial `title`, sem comandos de spawn (RUN-01)
- [ ] Start em `title` → `roundActive`, round 1, kills 0, comandos `startRun` e `roundStart(1)` (RUN-02)
- [ ] Morte do player em `roundActive` → `gameOver`, com `summary = { round, kills }` e comando `gameOver` (RUN-04)
- [ ] Start em `gameOver` após 1000 ms → nova run, round 1, kills 0, `startRun` (RUN-05); em 999 ms continua `gameOver` com o mesmo summary (RUN-11)
- [ ] Último abate → `intermission` e um único `roundCleared` (RUN-06); 2499 ms depois continua `intermission`, 2500 ms → `roundActive` com round + 1 e `roundStart` (RUN-10)
- [ ] Abate em `title`/`intermission`/`gameOver` e start em `roundActive`/`intermission` não mudam state, round nem kills (RUN-07)
- [ ] `acceptsPlayerInput` é `true` só em `roundActive` e `intermission` (RUN-08)
- [ ] Player e último inimigo morrem antes do mesmo `update` → `gameOver`, não `intermission` (edge)
- [ ] Morte do player em `intermission` → `gameOver` com a rodada recém-limpa (edge)
- [ ] Gate check passes: `npm run build && npm test`

**Tests**: unit
**Gate**: build

**Commit**: `feat(core): add run state machine`

---

### T7: Loop da run no jogo

**What**: A cena usa o `Run`: título no boot, J/Enter começa, ondas com tuning escalado e graça, permadeath, game over com trava, fumaça no spawn, snapshot com `run`, `maxHp` e `damage`; tecla 3 de debug mata o player; smokes da F0 adaptados; cenário novo `run-loop.smoke.mjs`.
**Where**: `src/scenes/TestScene.ts`
**Depends on**: None
**Reuses**: `Run`, `scaleFor`, `SpawnGrace`, `Health.reset`, `requireSpawnPoints`, `Fx`, textura `smokeCurse`, `debugApi`
**Requirement**: RUN-01, RUN-02, RUN-03, RUN-04, RUN-05, RUN-06, RUN-08, RUN-09, RUN-10, RUN-11, WAVE-05, WAVE-09, DIF-04, RHUD-08

> Toca `src/game/Enemy.ts`, `src/game/Player.ts`, `src/game/fx.ts`, `src/game/debugApi.ts` e os cenários `scripts/smoke/*.smoke.mjs`: é um único fluxo vertical, e separar deixaria adaptador sem verificação.

**Tools**:

- MCP: `context7` (API do Phaser, se houver dúvida sobre teclado ou texto)
- Skill: NONE

**Done when**:

- [ ] `run-loop.smoke.mjs` (`?debug&seed=1`):
  - [ ] boot em `title`, com 0 inimigos (RUN-01)
  - [ ] J → `roundActive`, round 1, player com hp 100 no spawn (RUN-02)
  - [ ] tecla 2 até limpar a rodada → `intermission` (RUN-06); `step(2600)` → round 2 (RUN-10)
  - [ ] os inimigos da rodada 2 têm `maxHp: 67`, `damage: 13` (DIF-04)
  - [ ] um inimigo recém-nascido não muda de `x` nos primeiros 500 ms (WAVE-09)
  - [ ] cada spawn gera um `spawnFx:<id>` (RHUD-08)
  - [ ] nenhum inimigo morto volta a aparecer com o mesmo ponto em 1500 ms fora da onda (WAVE-05)
  - [ ] tecla 3 → `gameOver` com `summary` da rodada 2; o player continua `dead` após `step(3000)` (RUN-03/04)
  - [ ] J com `step(100)` → ainda `gameOver` (RUN-11); após `step(1000)`, J → round 1, kills 0, hp 100 (RUN-05)
  - [ ] em `title`, segurar D por 500 ms não move o player (RUN-08)
- [ ] `boot.smoke.mjs` e `enemy-died.smoke.mjs` começam a run com J; as asserções de FND-08/09 continuam (a checagem "nenhum evento novo" filtra `enemyDied:`); `boot` avança 1200 ms por causa da graça
- [ ] `snapshot().run` tem `{ state, round, kills, alive, queued }` (RUN-09)
- [ ] Gate check passes: `npm run build && npm test && npm run smoke`

**Tests**: smoke
**Gate**: full

**Commit**: `feat(game): run rounds with permadeath in the scene`

---

### T8: HUD da run, título e game over

**What**: `Hud` mostra rodada, restantes, faixa `Rodada N` por 1500 ms, `Rodada N concluída`, a tela de título e a de game over; `snapshot().hud`; cores na paleta; cenário `hud.smoke.mjs`.
**Where**: `src/game/Hud.ts`
**Depends on**: T7
**Reuses**: `css()` e `TEXT_STYLE` do `Hud`, `uiLayer`, `PALETTE`
**Requirement**: RHUD-01, RHUD-02, RHUD-03, RHUD-04, RHUD-05, RHUD-06, RHUD-07

> Toca `src/scenes/TestScene.ts` (chamadas ao HUD e snapshot), `src/game/debugApi.ts` (tipo), `tests/game/art.test.ts` (paleta) e `scripts/smoke/hud.smoke.mjs`.

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `hud.smoke.mjs` (`?debug&seed=1`):
  - [ ] em `title`, `center` contém o nome do jogo e `J / Enter para começar` (RHUD-05)
  - [ ] em `roundActive`, `round === 'Rodada 1'` e `remaining === 'Inimigos: K'`, com K = alive + queued do `run` (RHUD-01)
  - [ ] `banner === 'Rodada 1'` logo após começar e `null` depois de `step(1600)` (RHUD-02)
  - [ ] na `intermission`, `banner === 'Rodada 1 concluída'` (RHUD-03)
  - [ ] em `gameOver`, `center` contém `Rodada alcançada: N`, `Abates: K` e `J / Enter para tentar de novo` (RHUD-06)
  - [ ] `ignoredByMain === true` (RHUD-07)
- [ ] `tests/game/art.test.ts` confere que as cores de texto e de fundo usadas pelos elementos novos do HUD estão na paleta (RHUD-04)
- [ ] Gate check passes: `npm run build && npm test && npm run smoke`

**Tests**: smoke
**Gate**: full

**Commit**: `feat(hud): show round, banners, title and game over screens`

---

## Phase Execution Map

```
Phase 1 → Phase 2

Phase 1:  T1 ------→ T2 ------→ T3 ------→ T4 ------→ T5 ------→ T6
Phase 2:  T7 ------→ T8
```

---

## Validation

### Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | 3 constantes num arquivo | ✅ |
| T2 | 2 funções coesas | ✅ |
| T3 | 1 classe | ✅ |
| T4 | 1 método | ✅ |
| T5 | 1 classe + 2 funções coesas | ⚠️ OK (coeso) |
| T6 | 1 classe + 1 função | ✅ |
| T7 | fatia vertical em 5 arquivos + cenários | ⚠️ Aceito: merge forward, fluxo único |
| T8 | HUD + fiação + cenário | ⚠️ Aceito: merge forward |

### Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | início da Phase 1 | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | T2 | T2 → T3 | ✅ |
| T4 | T3 | T3 → T4 | ✅ |
| T5 | T4 | T4 → T5 | ✅ |
| T6 | T5 | T5 → T6 | ✅ |
| T7 | None | início da Phase 2 | ✅ |
| T8 | T7 | T7 → T8 | ✅ |

### Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | tuning | unit | unit | ✅ |
| T2 | `src/core` | unit | unit | ✅ |
| T3 | `src/core` | unit | unit | ✅ |
| T4 | `src/core` | unit | unit | ✅ |
| T5 | `src/core` | unit | unit | ✅ |
| T6 | `src/core` | unit | unit | ✅ |
| T7 | adaptadores Phaser | smoke | smoke | ✅ |
| T8 | adaptadores Phaser + paleta | smoke (+ unit de paleta) | smoke | ✅ |
