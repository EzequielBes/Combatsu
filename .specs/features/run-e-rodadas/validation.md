# Run, rodadas e dificuldade progressiva — Validation

# Rodada 1 (vigente)

**Date**: 2026-09-24
**Spec**: `.specs/features/run-e-rodadas/spec.md` (34 requisitos: RUN-01..11, WAVE-01..09, DIF-01..06, RHUD-01..08, mais 5 casos de borda)
**Diff range**: `efac150..574cd6c` (T1..T8: `6b0ed7e`, `de53839`, `ed3f4a6`, `a53a015`, `c2bfbe0`, `2fb0a82`, `4dea967`, `574cd6c`), 26 arquivos, +1638/−152
**Verifier**: sub-agente independente, rodada 1 de no máximo 3 (autor ≠ verificador). As mutações rodaram num `git worktree` descartável no scratchpad (`verify-f1`), com junction para o `node_modules`.

## Validation (rodada 1)

**Result**: FAIL

Motivo: os gates estão verdes e 27 dos 34 requisitos têm evidência ancorada no valor do spec, mas o sensor expandido deixou **7 mutantes comportamentais vivos** (de 31). Eles mostram asserções que não discriminam em WAVE-02/WAVE-07 (o `s` sorteado nunca é exercitado), DIF-04 (o snapshot lê o tuning e não o que o inimigo usa), WAVE-05 (o respawn antigo reativado passa), WAVE-06 no `Run`, RHUD-02 (duração da faixa) e RUN-02 (posição do spawn). O código de produção se comportou certo em todas as inspeções; os gaps são de teste. Nenhum requisito foi promovido para `Verified`.

---

## Gates (rodados pelo Verifier em HEAD `574cd6c`)

- `npx vitest run`: **29 arquivos, 318 passed, 0 failed, 0 skipped**. Antes da feature: 248 (`tasks.md`). Delta +70; nenhum teste removido (`git diff --stat` só adiciona arquivos de teste e troca 2 linhas de `tests/game/debugApi.test.ts` para os campos novos do snapshot).
- `npm run build`: **exit 0** (só o aviso de chunk > 500 kB que já existia).
- `npm run smoke`, duas vezes seguidas: **exit 0 nas duas**, sempre `ok` em `boot`, `enemy-died`, `hud`, `no-debug` e `run-loop` ("5 cenário(s) ok"). Estável.
- **AD-006**: `tests/core/noMathRandom.test.ts:5-22` varre `src/core/**` e `src/data/**` e passa. A aleatoriedade das ondas passa só pelo `Rng`: `src/core/waves.ts:52` (`this.s = rng.int(0, pointCount - 1)`), com o `Rng` criado por run em `src/core/run.ts:146` a partir de `seedForNewRun` (`src/scenes/TestScene.ts:159-168`, `?seed=N` só em `?debug`).
- **Isolamento do sensor**: `git status --porcelain` da árvore real antes e depois é idêntico (`?? .agents/ .claude/ .cursor/ .windsurf/`). Junction desfeita com `rmdir` antes do `git worktree remove --force`; `node_modules` real intacto; `git worktree list` mostra só a árvore principal.

---

## Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1..T6 | ✅ Done | núcleo puro com testes 1:1 |
| T7 | ⚠️ Done com gaps | DIF-04, WAVE-05 e RUN-02 com asserções que não discriminam (mutantes A2, A3, A4, A14) |
| T8 | ⚠️ Done com gap | RHUD-02 sem limite inferior da duração (mutante A13) |

---

## Spec-Anchored Acceptance Criteria

### P1: Run com permadeath

| AC | Spec-defined outcome | `file:line` + asserção | Status |
| --- | --- | --- | --- |
| RUN-01 | boot em `title`, 0 inimigos | `tests/core/run.test.ts:32-33` - `state === 'title'`, `update(500)` → `[]`; `scripts/smoke/run-loop.smoke.mjs:18-19` - `run.state === 'title'`, `enemies.length === 0`; `scripts/smoke/boot.smoke.mjs:15-16` | ✅ PASS |
| RUN-02 | J/Enter em `title` → `roundActive`, round 1, kills 0, hp cheio **no spawn do level** | `tests/core/run.test.ts:42-45` - comandos `[startRun, roundStart(1)]`, round 1, kills 0; `scripts/smoke/run-loop.smoke.mjs:37-41` - round 1, kills 0, `hp === 100`. A posição no spawn não tem asserção: mutante A14 (`setPosition(spawn.x + 200)` em `src/game/Player.ts:219`) sobrevive | ❌ GAP (conjunção "at the level spawn") |
| RUN-03 | `Health` não renasce em `roundActive`/`intermission` | `tests/core/healthReset.test.ts:10-12` - 1 000 000 ms sem `respawn`, `dead === true`; `scripts/smoke/run-loop.smoke.mjs:146-152` - `player.dead === true` após `step(3000)`; `src/game/Player.ts:59` `respawnMs: Infinity` (A10 morto) | ✅ PASS |
| RUN-04 | morte em `roundActive` → `gameOver`, summary `{ round, kills }` | `tests/core/run.test.ts:61-63` - comando `{ gameOver, round: 1, kills: 0 }`, `summary` igual; `scripts/smoke/run-loop.smoke.mjs:128-132` - `gameOver`, round 2, kills 3 | ✅ PASS |
| RUN-05 | J/Enter em `gameOver` → round 1, kills 0, hp cheio | `tests/core/run.test.ts:87-90`; `scripts/smoke/run-loop.smoke.mjs:161-167` - round 1, kills 0, `hp === 100`, `dead === false` (A11 morto) | ✅ PASS |
| RUN-06 | último abate → `intermission` uma vez | `tests/core/run.test.ts:97-98` - `filter(roundCleared)` igual a `[{ roundCleared, round: 1 }]`; `scripts/smoke/run-loop.smoke.mjs:51-52` | ✅ PASS |
| RUN-10 | 2500 ms em `intermission` → round N + 1 | `tests/core/run.test.ts:103-105` (2499 → continua), `:111-114` (2500 → `[roundStart(2)]`, round 2); `scripts/smoke/run-loop.smoke.mjs:81-84` (C12 morto) | ✅ PASS |
| RUN-11 | J/Enter < 1000 ms após `gameOver` → fica, mesmo summary | `tests/core/run.test.ts:73-76` (999 ms → `[]`, summary `{1, 0}`); `scripts/smoke/run-loop.smoke.mjs:140-143` (C13 morto no unit e no smoke) | ✅ PASS |
| RUN-07 | eventos fora de hora não mudam state/round/kills | `tests/core/run.test.ts:119-169` - abate em `title`, `intermission`, `gameOver`; start em `roundActive` e `intermission`; cada caso confere state, round e kills | ✅ PASS |
| RUN-08 | em `title`/`gameOver` o player ignora esquerda, direita, pulo, ataque, interação | `tests/core/run.test.ts:173-180` - `acceptsPlayerInput` nos 4 estados; `scripts/smoke/run-loop.smoke.mjs:28-31` - D por 500 ms em `title` não move `x` (C14 e A8b mortos). Pulo/ataque/interação e `gameOver` saem da mesma expressão (`src/scenes/TestScene.ts:145` com `NEUTRAL_INPUT` em `:40-48`, todos os campos `false`) | ✅ PASS (cobertura estrutural para os outros inputs) |
| RUN-09 | `snapshot().run = { state, round, kills, alive, queued }` | `src/scenes/TestScene.ts:247`; `tests/game/debugApi.test.ts:39,45`; campos lidos por valor: `state/round/kills` em `run-loop.smoke.mjs:38`, `alive` em `:70`, `queued` em `hud.smoke.mjs:38-39` | ✅ PASS |

### P1: Ondas de inimigos por rodada

| AC | Spec-defined outcome | `file:line` + asserção | Status |
| --- | --- | --- | --- |
| WAVE-01 | `min(3 + (r − 1), 12)` | `tests/core/waves.test.ts:10-17` - r1 3, r5 7, r10 12, r11 12, r20 12 (C6 morto) | ✅ PASS |
| WAVE-02 | k-ésimo spawn no ponto `(s + k) mod P`, `s` sorteado no `Rng` | `tests/core/waves.test.ts:34-38` - pontos `[0, 1, 2]`, mas a seed 7 dá `s = 0` para P = 2 e P = 3, então o termo `s` nunca é exercitado: mutante C10b (`this.s * 0 + this.nextK`) sobrevive ao vitest e ao smoke | ❌ GAP |
| WAVE-03 | com 4 vivos, nenhum spawn | `tests/core/waves.test.ts:49-52` - `alive === 4`, `update(800)` → `[]` (C7 morto) | ✅ PASS |
| WAVE-04 | < 4 vivos e fila: spawn no primeiro instante com ≥ 800 ms no ponto | `tests/core/waves.test.ts:60-64` (799 → `[]`, 800 → `{ k: 1, point: 0, atMs: 800 }`), `:76` (vaga aberta com gap cumprido) (C8 morto) | ✅ PASS |
| WAVE-05 | morto não renasce no ponto durante a run | `scripts/smoke/run-loop.smoke.mjs:61-70` - só confere um instante (intermission + 2000 ms). Mutante A4 (respawn de 1500 ms reativado em `src/scenes/TestScene.ts:215`) sobrevive: o renascido aparece depois dessa janela | ❌ GAP |
| WAVE-06 | mesmo id duas vezes conta 1 em `kills` e em `remaining` | `tests/core/waves.test.ts:95-100` no `WaveSpawner` (C9 morto). No `Run`, cujo `kills` é o que o snapshot e o summary mostram, não há teste de morte duplicada: mutante C17 (`this._kills++` sem checar o retorno, `src/core/run.ts:113`) sobrevive | ❌ GAP (camada `Run`) |
| WAVE-08 | duas mortes no mesmo frame: kills +2, remaining −2 | `tests/core/waves.test.ts:107-110`; no `Run`, `tests/core/run.test.ts:188` e `:194` (kills 2 após duas mortes no mesmo `update`); smoke `enemy-died.smoke.mjs:49-52` | ✅ PASS |
| WAVE-07 | mesma seed e mesmas mortes → mesmos pares `(atMs, point)` | `tests/core/waves.test.ts:130` - compara duas instâncias entre si; passa também quando o `Rng` é ignorado (C10b), porque a seed usada dá `s = 0` | ⚠️ Não discriminante (mesma causa do WAVE-02) |
| WAVE-09 | < 600 ms desde o spawn: sem windup/ataque e parado | `tests/core/spawnGrace.test.ts:7,13,19,26,35,44` (599 ativo, 600 inativo; C16 morto); `scripts/smoke/run-loop.smoke.mjs:117-120` - `x` do recém-nascido igual após 500 ms (A1 morto). Windup/ataque não têm asserção própria, mas saem do mesmo `canAct` (`src/game/Enemy.ts:163`) | ✅ PASS |

### P1: Dificuldade progressiva

| AC | Spec-defined outcome | `file:line` + asserção | Status |
| --- | --- | --- | --- |
| DIF-01 | `round(60 × min(1 + 0.12(r−1), 3.0))` | `tests/core/difficulty.test.ts:16` - r1 60, r2 67, r5 89, r10 125, r18 180, r30 180 (C1, C3 mortos) | ✅ PASS |
| DIF-05 | `round(12 × min(1 + 0.08(r−1), 2.5))` | `tests/core/difficulty.test.ts:29` - r1 12, r2 13, r5 16, r19 29, r20 30, r40 30 (C2 morto) | ✅ PASS |
| DIF-06 | patrol/chase × `min(1 + 0.03(r−1), 1.4)` | `tests/core/difficulty.test.ts:36-49` (r1 ×1, r15 ×1.4, r30 ×1.4), `:54-59` (outros campos iguais) (C4 morto) | ✅ PASS |
| DIF-02 | multiplicadores não decrescem de r = 2 a 100 | `tests/core/difficulty.test.ts:68-70` | ✅ PASS |
| DIF-03 | rodada < 1 ou não inteira → valores da rodada 1 | `tests/core/difficulty.test.ts:77` - 0, −3, 2.5 (C5 morto) | ✅ PASS |
| DIF-04 | inimigo da rodada r nasce com hp, dano e velocidades de DIF-01/05/06, visíveis em `enemies[i].maxHp/damage` | `scripts/smoke/run-loop.smoke.mjs:88-92` - `maxHp === 67 && damage === 13` (A12b morto). Mas `maxHp`/`damage` do snapshot vêm dos getters `src/game/Enemy.ts:121-128`, que leem `this.tuning`, não o `EnemyBrain` nem a garra em uso: A2 (cérebro com `maxHp: 60`) e A3 (garra com `damage: 12`) sobrevivem | ❌ GAP |

### P2: HUD da run e telas

| AC | Spec-defined outcome | `file:line` + asserção | Status |
| --- | --- | --- | --- |
| RHUD-01 | `Rodada N` e `Inimigos: K`, K = vivos + fila | `scripts/smoke/hud.smoke.mjs:37-39` - `round === 'Rodada 1'`, `remaining === 'Inimigos: ' + (alive + queued)` com fila 1 nesse instante (A6 morto) | ✅ PASS |
| RHUD-02 | faixa `Rodada N` centralizada na tela 960×540 por 1500 ms, depois some | `scripts/smoke/hud.smoke.mjs:36` (visível logo após começar), `:46` (`null` após 1600 ms) (A5 morto). Sem limite inferior: A13 (faixa de 1000 ms) sobrevive. "Centralizada" não tem asserção, e o código põe a faixa em `y = h * 0.25` (`src/game/Hud.ts:65`), centralizada só na horizontal | ❌ GAP (duração) + ⚠️ Spec-precision gap ("centered") |
| RHUD-03 | `Rodada N concluída` até a próxima rodada | `scripts/smoke/hud.smoke.mjs:57-60`; `src/scenes/TestScene.ts:185` com `Infinity` | ✅ PASS |
| RHUD-04 | cores dos elementos novos na paleta | `tests/game/art.test.ts:306-310` - `RUN_TEXT_COLOR` e `RUN_BG_COLOR` em `PALETTE`; os estilos usam só essas constantes (`src/game/Hud.ts:18-21`) | ✅ PASS |
| RHUD-05 | título com o nome do jogo e `J / Enter para começar` | `scripts/smoke/hud.smoke.mjs:19-23` | ✅ PASS |
| RHUD-06 | `Rodada alcançada: N`, `Abates: K`, `J / Enter para tentar de novo` | `scripts/smoke/hud.smoke.mjs:80-84` (N e K vindos do `run` do mesmo snapshot; round 2 confirmado em `:69-72`) | ✅ PASS |
| RHUD-07 | HUD na lista de ignorados da câmera principal, `ignoredByMain: true` | `scripts/smoke/hud.smoke.mjs:26`; checagem real `src/game/Hud.ts:157` (`(layer.cameraFilter & main.id) === main.id`). A7 (remover `cameras.main.ignore(uiLayer)`) morto com `ignoredByMain:false` | ✅ PASS |
| RHUD-08 | fumaça no spawn, um `spawnFx:<id>` por inimigo | `scripts/smoke/run-loop.smoke.mjs:55-58` (cada id nascido tem o evento); unicidade em `scripts/smoke/enemy-died.smoke.mjs:71` (todo evento aparece 1 vez) (A9 morto) | ✅ PASS |

**Status**: 27/34 PASS ancorados; 7 com gap (RUN-02, WAVE-02, WAVE-05, WAVE-06, WAVE-07, DIF-04, RHUD-02); 1 spec-precision gap (RHUD-02 "centered").

---

## Edge Cases

- [x] Player e último inimigo no mesmo frame → `gameOver`, sem `roundCleared`: `tests/core/run.test.ts:192-195` (C11 morto).
- [x] Morte na intermission → `gameOver` com a rodada recém-limpa: `tests/core/run.test.ts:202-204` (C15 morto).
- [x] Rodada ≥ 10 com 12 inimigos: `tests/core/waves.test.ts:10-17` (r10, r11, r20).
- [x] Level com um só ponto `E`, gap de 800 ms: `tests/core/waves.test.ts:86-88`.
- [x] Level sem ponto `E` lança com o nome: `tests/core/waves.test.ts:23`; chamada no load em `src/scenes/TestScene.ts:94`.

---

## Smokes da F0 (adaptação)

A adaptação está registrada na spec (Assumptions, linha "Smokes da F0", `spec.md:47`) como mudança de requisito escolhida pelo usuário.

- `enemy-died.smoke.mjs`: as asserções de FND-08 continuam equivalentes. Unicidade por id (`:57`, `:71-72`), posição com tolerância de 1 px (`:60-63`) e duas mortes no mesmo step (`:49-52`) estão intactas. A checagem "nenhum evento novo" (`:79-82`) passou a filtrar `enemyDied:`, que é exatamente o que o FND-08 cobre, e o `spawnFx:` do 3º inimigo é esperado.
- `boot.smoke.mjs`: FND-09/22 continuam cobertos (`:28-38`, `:44-48`). Duas mudanças afrouxam de leve: `enemies.length === 2` virou `>= 2` (`:32`; aos 1200 ms a rodada 1 já tem os 3), e `Array.isArray(snap.events)` saiu. O formato de `events` continua exercitado por `.filter`/`.includes` em `enemy-died.smoke.mjs:40` e `run-loop.smoke.mjs:57`. Nada disso é gap de requisito; está registrado como observação.

## SPEC_DEVIATION

Nenhum marcador `// SPEC_DEVIATION` no diff. A faixa em `y = h * 0.25` (`src/game/Hud.ts:65`) é uma leitura possível de "centered" que a spec não resolve: fica como spec-precision gap, não como desvio.

---

## Discrimination Sensor

**Sensor depth**: expandido (espinha da expansão). 34 mutantes injetados; 3 deles (C10, A8, A12) morreram só pelo `tsc` (variável sem uso), sem valor comportamental, e foram refeitos como C10b, A8b e A12b. **Comportamentais: 31 injetados, 24 mortos, 7 sobreviventes.**

| # | File:line | Mutação | Killed? |
| --- | --- | --- | --- |
| C1 | `src/core/difficulty.ts:40` | teto de hp omitido | ✅ Killed (r18/r30) |
| C2 | `src/core/difficulty.ts:41` | teto de dano trocado por `hpCap` | ✅ Killed (r40) |
| C3 | `src/core/difficulty.ts:53` | `Math.floor` no lugar de `Math.round` | ✅ Killed (r5/r10) |
| C4 | `src/core/difficulty.ts:42` | teto de velocidade omitido | ✅ Killed (r15/r30) |
| C5 | `src/core/difficulty.ts:30` | sem `Number.isInteger` | ✅ Killed (2.5) |
| C6 | `src/core/waves.ts:22` | waveSize com máximo 13 | ✅ Killed (r11/r20) |
| C7 | `src/core/waves.ts:96` | `maxAlive` 5 (`<` → `<=`) | ✅ Killed |
| C8 | `src/core/waves.ts:99` | pointGap `<` → `<=` | ✅ Killed (799/800) |
| C9 | `src/core/waves.ts:84` | dedupe removido | ✅ Killed |
| C10 | `src/core/waves.ts:97` | rodízio sem `s` | morto só pelo `tsc` (TS6133), refeito como C10b |
| C10b | `src/core/waves.ts:97` | `(this.s * 0 + this.nextK) % P` | ❌ Survived (vitest e smoke) |
| C11 | `src/core/run.ts:102` | morte do player perde prioridade quando há abate no frame | ✅ Killed |
| C12 | `src/core/run.ts:131` | intermission de 2400 ms | ✅ Killed (2499) |
| C13 | `src/core/run.ts:144` | trava do game over removida | ✅ Killed (unit e smoke) |
| C14 | `src/core/run.ts:28` | `acceptsPlayerInput` true em `title` | ✅ Killed (unit e smoke) |
| C15 | `src/core/run.ts:102` | morte na intermission ignorada | ✅ Killed |
| C16 | `src/core/spawnGrace.ts:11` | graça `<` → `<=` | ✅ Killed (600) |
| C17 | `src/core/run.ts:113` | `Run` soma kill sem checar o retorno do dedupe | ❌ Survived |
| A1 | `src/game/Enemy.ts:163` | `canAct` sem a graça | ✅ Killed (inimigo andou 624.6 → 642.3) |
| A2 | `src/game/Enemy.ts:74` | cérebro com `maxHp: 60` fixo | ❌ Survived |
| A3 | `src/game/Enemy.ts:193` | garra com `damage: 12` fixo | ❌ Survived |
| A4 | `src/scenes/TestScene.ts:215` | respawn de 1500 ms reativado | ❌ Survived |
| A5 | `src/game/Hud.ts:147` | faixa que nunca some | ✅ Killed |
| A6 | `src/scenes/TestScene.ts:154` | `remaining` sem os `queued` | ✅ Killed (2 ≠ 3) |
| A7 | `src/scenes/TestScene.ts:312` | HUD fora da lista de ignorados da câmera principal | ✅ Killed (`ignoredByMain:false`) |
| A8 | `src/scenes/TestScene.ts:145` | input cru sempre | morto só pelo `tsc`, refeito como A8b |
| A8b | `src/scenes/TestScene.ts:145` | input cru também em `title` | ✅ Killed (player andou 112 → 267.7) |
| A9 | `src/scenes/TestScene.ts:222` | sem `spawnFx` | ✅ Killed |
| A10 | `src/game/Player.ts:59` | player com o respawn de 1000 ms | ✅ Killed |
| A11 | `src/scenes/TestScene.ts:201` | `startRun` sem `resetForRun` | ✅ Killed |
| A12 | `src/scenes/TestScene.ts:208` | escala sempre da rodada 1 | morto só pelo `tsc`, refeito como A12b |
| A12b | `src/scenes/TestScene.ts:208` | `scaleFor(round * 0 + 1, …)` | ✅ Killed (maxHp 60) |
| A13 | `src/game/Hud.ts:125` | faixa de 1000 ms em vez de 1500 | ❌ Survived |
| A14 | `src/game/Player.ts:219` | nova run põe o player 200 px fora do spawn | ❌ Survived |

**Resultado do sensor**: 24/31 comportamentais mortos, 7 sobreviventes. ❌

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ |
| Surgical changes | ✅ (`ENEMY_RESPAWN_MS` ficou exportado sem uso em `src/data/tuning.ts:87`; menor) |
| No scope creep | ✅ |
| Matches patterns | ✅ (core puro com `dt`, comandos, tuning em `src/data`) |
| Spec-anchored outcome check | ❌ 7 ACs com asserção que não discrimina |
| Per-layer Coverage Expectation | ⚠️ core 1:1 com limites exatos, exceto WAVE-02 (`s ≠ 0`) e WAVE-06 no `Run`; smoke com gaps em DIF-04, WAVE-05, RHUD-02, RUN-02 |
| Every test maps to a requirement | ✅ |
| Documented guidelines followed | ✅ `vitest.config.ts`, `.specs/STATE.md` AD-001/AD-003/AD-006 |

---

## Fix Plans (ranked gaps)

1. **WAVE-02/WAVE-07: o termo `s` nunca é exercitado** (C10b). `tests/core/waves.test.ts:34-38` e `:130` usam a seed 7, com `s = 0`. Correção: achar uma seed com `rng.int(0, 2) ≠ 0`, afirmar os pontos `[(s+0)%3, (s+1)%3, (s+2)%3]` com o `s` esperado explícito e, no WAVE-07, comparar também com pares literais esperados (ou mostrar que outra seed com `s` diferente produz pontos diferentes). Prioridade: Major.
2. **DIF-04: o snapshot não reflete o hp e o dano em uso** (A2, A3). `src/game/Enemy.ts:121-128` leem `this.tuning`. Correção: em `scripts/smoke/run-loop.smoke.mjs:88-92`, afirmar `hp === 67` no inimigo da rodada 2 ainda sem dano, e expor `maxHp` a partir do `EnemyBrain` e o `damage` a partir do golpe realmente aberto (ou afirmar a perda de 13 de hp do player num golpe do inimigo da rodada 2). Prioridade: Major.
3. **WAVE-05: o respawn antigo reativado passa** (A4). `scripts/smoke/run-loop.smoke.mjs:61-70` olha um único instante. Correção: guardar os ids da rodada 1 e, avançando em passos pequenos até a rodada 2 e por mais uns 3000 ms, afirmar que nenhum inimigo vivo tem id novo fora de um `spawn` da onda (vivos com `hp > 0` sempre iguais a `run.alive`, e todo inimigo vivo da rodada 2 com `maxHp === 67`). Prioridade: Major.
4. **WAVE-06 no `Run`** (C17). Correção: em `tests/core/run.test.ts`, `run.enemyDied(1)` duas vezes antes de `update` (e de novo num `update` seguinte) → `run.kills === 1`, rodada não limpa. Prioridade: Major.
5. **RHUD-02: sem limite inferior da duração** (A13). Correção: em `scripts/smoke/hud.smoke.mjs`, conferir `banner === 'Rodada 1'` após `step(1400)` e `null` após mais `step(200)`. Decidir "centered" (só horizontal ou também vertical, `src/game/Hud.ts:65`) e registrar na spec. Prioridade: Minor.
6. **RUN-02: posição no spawn sem asserção** (A14). Correção: em `scripts/smoke/run-loop.smoke.mjs:41` e `:165`, afirmar `player.x`/`y` a menos de 1 px do spawn do level (o `x` do título é o spawn). Prioridade: Minor.

---

## Requirement Traceability Update

Nenhum requisito promovido nesta rodada (veredito FAIL). Todos seguem `Implementing` em `spec.md` até a re-verificação.

---

## validate_state.py

`python .claude/skills/tlc-spec-driven/scripts/validate_state.py run-e-rodadas` → **exit 1** ("verdict is FAIL - route the ranked gaps to fix tasks"), o esperado para um relatório reprovado.

## Veredito da rodada 1

Reprovada: gates verdes (318 testes, build, smoke 2x), 27/34 ACs ancorados, 5/5 casos de borda, sensor com 7 sobreviventes em 31. Próximo passo: fix tasks para os 6 gaps acima e rodada 2 do Verifier.
