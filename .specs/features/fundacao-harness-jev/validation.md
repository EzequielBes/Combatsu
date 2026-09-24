# Fundação da expansão (RNG, cura, harness e Jev) — Validation

# Rodada 2 (vigente)

**Date**: 2026-09-24
**Spec**: `.specs/features/fundacao-harness-jev/spec.md` (24 requisitos FND-01..FND-24 e 4 casos de borda, com o ajuste de texto de FND-08, FND-09, FND-22 e do caso de borda do parser)
**Diff range**: feature inteira `22cf49e..590e1d8` (16 commits); correções desta rodada `1cf8ded..590e1d8` (T13 `6522618`, T14 `e5c7700`, T15 `40530e1`, T16 `590e1d8`; 9 arquivos, +169/−9)
**Verifier**: sub-agente independente, rodada 2 de no máximo 3 (autor ≠ verificador). Toda evidência foi refeita contra HEAD `590e1d8`. As mutações rodaram num `git worktree` descartável no scratchpad (`verify-wt2`), com junction para o `node_modules`.

## Validation (rodada 2)

**Result**: FAIL

Motivo: quatro dos cinco gaps da rodada 1 estão fechados, com mutantes mortos (A5, M22, M24, y do snapshot, mortes no mesmo frame). Resta um sobrevivente novo no mesmo conjunto do FND-08: o mutante N6 (`onDied(this, x, y + 36)`, a posição deslocada uma altura inteira de corpo para dentro do chão) passa no smoke. Isso acontece porque `scripts/smoke/enemy-died.smoke.mjs:51` aceita até 40 px de diferença, e a diferença real medida entre a posição notificada e o snapshot anterior ao golpe é **exatamente 0** nos dois inimigos, em duas execuções. A asserção mais apertada é viável e não foi usada. Pela regra do sensor ("surviving mutants become fix tasks"), o FND-08 continua sem discriminação para erros de posição menores que 40 px. É um gap Minor, com correção de uma linha.

---

## Gates (rodados pelo Verifier em HEAD `590e1d8`)

- `npx vitest run`: **23 arquivos, 248 passed, 0 failed, 0 skipped** (246 na rodada 1, **+2**: o teste de `ceil` do T14 e o teste sem `SHALL` do T15).
- `npm run build`: **exit 0** (só o aviso de chunk > 500 kB, que já existia).
- `npm run smoke`: **exit 0**, com `ok boot.smoke.mjs`, `ok enemy-died.smoke.mjs`, `ok no-debug.smoke.mjs` e "3 cenário(s) ok".
- **Integridade dos testes**: `git diff 1cf8ded..HEAD -- tests scripts` só acrescenta testes e asserções. Nenhuma foi removida ou enfraquecida.
- **Isolamento do sensor**: `git status --porcelain` da árvore real antes e depois é idêntico (`?? .agents/ .claude/ .cursor/ .windsurf/`). A junction foi desfeita com `rmdir` antes do `git worktree remove --force`. `git worktree list` mostra só a árvore principal, e o `node_modules` real continua intacto.
- **Segurança**: `git grep -n "apikey_2" HEAD` dá 0 linhas e `git log --all -p | grep -c "apikey_2"` dá 0.

---

## Re-verificação dos 5 gaps da rodada 1

| # | Gap da rodada 1 | Evidência em HEAD | Mutante | Result |
| --- | --- | --- | --- | --- |
| 1 | FND-08: posição `x, y` sem evidência | `src/game/Enemy.ts:198` passa `body.position`; `src/scenes/TestScene.ts:142` guarda `{ id, x, y }`; `:150` copia para `deaths`. `scripts/smoke/enemy-died.smoke.mjs:47` - `deaths.length === 1` por id; `:50-53` - `Math.abs(x - was.x) < 40 && Math.abs(y - was.y) < 40` | A5 ✅ morto (`{"x":0,"y":0} longe de {"x":1013.7,...}`); N1b, N2b, N4, N5 e N8 mortos; **N6 (+36 px em y) sobrevive** | ⚠️ Parcial: fechado para erros grosseiros, sem discriminação abaixo de 40 px (gap R2-1) |
| 2 | FND-22: `ceil` vs `floor` | Spec agora diz `ceil(ms / (1000/60))`. `tests/game/debugApi.test.ts:68-71` - `step(20)` → `toHaveLength(2)`; `step(1)` → `toHaveLength(3)`; `src/game/debugApi.ts:49` `Math.ceil` | M22 (`floor`) ✅ morto; M22r (`round`) ✅ morto | ✅ Fechado |
| 3 | Parser aceitava linha sem `SHALL` (M24) e texto da spec desalinhado | Caso de borda da spec agora descreve `N. ID: … SHALL`; o marcador SPEC_DEVIATION saiu de `tools/jev-refine/lib.ts:19`. `tests/tools/jevRefine.test.ts:45` - `parseAcs('1. RUN-01: WHEN x THEN y.\n')` `toThrow('nenhum AC encontrado')`; `:40-41` ubíquo com quantificador continua aceito | M24 (regex sem `\bSHALL\b`) ✅ morto | ✅ Fechado |
| 4 | FND-09: `enemies[].y` não conferido | Spec agora define `x`/`y` como centro do corpo físico. `scripts/smoke/boot.smoke.mjs:23` - `typeof e.y === 'number' && e.y > 430 && e.y < 480` (centro de um corpo de 36 px sobre o chão em y = 480, ou seja ≈ 462); `src/scenes/TestScene.ts:148` usa `hurtRect().y` = `body.position.y` (`src/game/Enemy.ts:95-97`) | N3 (`y: 0`) ✅ morto no `boot` | ✅ Fechado |
| 5 | Mortes no mesmo frame, só indireto | `scripts/smoke/enemy-died.smoke.mjs:39-42` - algum step contém os 2 ids iniciais no diff de `events`. O golpe de teste chama `receiveHit` nos dois inimigos no mesmo laço síncrono (`src/scenes/TestScene.ts:196-204`), então as mortes caem no mesmo frame por construção. Instrumentação no worktree (não é mutante): `deaths` com `t` idêntico nos dois (`2060.83`) e `diedInStep=[[2,3]]` | N7 (a cena descarta a 2ª notificação do mesmo `time.now`) ✅ morto (`nem todos morreram: events=["enemyDied:2"]`) | ✅ Fechado |

---

## Spec-Anchored Acceptance Criteria (rodada 2)

Os ACs sem código alterado desde a rodada 1 foram reconferidos contra HEAD. As linhas citadas na rodada 1 continuam válidas, porque `git diff 1cf8ded..HEAD` não toca `src/core`, `tests/core`, `scripts/smoke/lib.ts`, `scripts/smoke/run.mjs`, `tests/scripts` nem `tools/jev-refine.mjs`, e os gates acima passam.

| AC | Spec-defined outcome | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| FND-01 | mesma seed: 1000 `next()` idênticos | `tests/core/rng.test.ts:8` - `toEqual` entre duas `Rng(12345)` | ✅ PASS |
| FND-02 | `next()` em [0, 1) | `tests/core/rng.test.ts:21-22` - `>= 0` e `< 1` em 10 000 amostras | ✅ PASS |
| FND-20 | `int` inteiro em [min, max] | `tests/core/rng.test.ts:33-39` - `Number.isInteger`, limites e as duas pontas alcançadas | ✅ PASS |
| FND-03 | `chance(p<=0)` é `false` | `tests/core/rng.test.ts:52-53` - `toBe(false)` | ✅ PASS |
| FND-21 | `chance(p>=1)` é `true` | `tests/core/rng.test.ts:60-61` - `toBe(true)` | ✅ PASS |
| FND-04 | nenhum `Math.random` em `src/core`/`src/data` | `tests/core/noMathRandom.test.ts:22` - `expect(offenders).toEqual([])` | ✅ PASS |
| FND-05 | hp = `min(maxHp, h+n)`, devolve o restaurado | `tests/core/health.test.ts:119-120` e `:126-127` | ✅ PASS |
| FND-06 | morto: hp 0, devolve 0 | `tests/core/health.test.ts:133-135` | ✅ PASS |
| FND-07 | `n<=0` ou não finito: inalterado, devolve 0 | `tests/core/health.test.ts:138-142` - `it.each([0, -5, NaN, Infinity])` | ✅ PASS |
| FND-08 | `onEnemyDied(id, x, y)` uma vez por inimigo, com a posição no mundo naquele frame; em `?debug`, um `enemyDied:<id>` e um `{ id, x, y }` em `deaths` com essa posição | Unicidade: `scripts/smoke/enemy-died.smoke.mjs:47` (uma entrada em `deaths`), `:61-62` (um evento por id), `:68-71` (nada novo após `step(3000)`). Posição: `:50-53` - tolerância `< 40` px contra o snapshot anterior ao golpe fatal. A5 morto; **N6 (+36 px) sobrevive**, e a diferença real medida é 0 | ⚠️ GAP R2-1: tolerância larga demais para "a posição naquele frame" |
| FND-09 | `snapshot()` = `{ player, enemies:[{id,x,y,hp,state}], events, deaths }`, com `x`/`y` do inimigo no centro do corpo | `tests/game/debugApi.test.ts:43` - `toEqual(snap)` com `deaths`; `scripts/smoke/boot.smoke.mjs:16-25` (player, `id`, `hp === 60`, `state === 'idle'`, `y` entre 430 e 480, `events` lista); `scripts/smoke/enemy-died.smoke.mjs:47` lê `deaths` | ✅ PASS |
| FND-22 | `ceil(ms / (1000/60))` passos fixos de 1000/60 ms, antes de retornar | `tests/game/debugApi.test.ts:52-55` (delta `DT`, tempo crescente), `:69` `step(20)` → 2, `:71` `step(1)` → +1 | ✅ PASS |
| FND-10 | sem `?debug`, `window.__game` undefined | `tests/game/debugApi.test.ts:30` - `toBeUndefined()`; `scripts/smoke/no-debug.smoke.mjs:6` | ✅ PASS |
| FND-23 | build, `vite preview` de `dist/` e cada `*.smoke.mjs` uma vez em Edge headless | `scripts/smoke/run.mjs:25`, `:44`, `:82-84`, `:87-91`; execução do Verifier: 3 cenários `ok`, uma vez cada | ✅ PASS |
| FND-11 | exit 0 com todos ok, 1 com falha, e o nome de cada falho | `tests/scripts/smokeLib.test.ts:48`, `:53-55`; execução no worktree com cenário falho (ex.: A5): `FALHA enemy-died.smoke.mjs` e exit 1 | ✅ PASS |
| FND-12 | sem Edge: exit 2 e os caminhos procurados | `tests/scripts/smokeLib.test.ts:24-25`, `:31-32`; `scripts/smoke/run.mjs:17-20` (execução da rodada 1: exit 2; código inalterado) | ✅ PASS |
| FND-13 | `refinement.md` com ID, 4 valores e flags ou `ok` | `tests/tools/jevRefine.test.ts:81-86`; parser exige `SHALL` (`:45`) | ✅ PASS |
| FND-14 | flag exatamente nos 4 limiares | `tests/tools/jevRefine.test.ts:54-67` - os dois lados de cada fronteira | ✅ PASS |
| FND-15 | sem chave: aviso, nenhum arquivo, exit 0 | `tests/tools/jevClient.test.ts:143-150`; `tools/jev-refine.mjs:14-19` | ✅ PASS |
| FND-16 | 429/529: 3 novas tentativas, com esperas de 1, 2 e 4 s | `tests/tools/jevClient.test.ts:163-165`, `:173-174` - `waits` `toEqual([1000, 2000, 4000])` | ✅ PASS |
| FND-24 | 3ª nova tentativa falha: `erro <status>` e segue | `tests/tools/jevClient.test.ts:172`; `tests/tools/jevRefine.test.ts:89` | ✅ PASS |
| FND-17 | 401/422: para, imprime status e mensagem, exit 1 | `tests/tools/jevClient.test.ts:181-184` | ✅ PASS |
| FND-18 | chave nunca exposta | `tests/tools/jevClient.test.ts:190-194` - `not.toContain(KEY)`; varredura do git = 0 | ✅ PASS |
| FND-19 | `.gitignore` contém `.env.local` | `tests/tools/gitignore.test.ts:8` | ✅ PASS |

**Status**: 23/24 ACs PASS ancorados; o FND-08 tem um conjunto (posição) com discriminação insuficiente (N6). Nenhum spec-precision gap novo: FND-22 agora define `ceil`, e FND-09 define o centro do corpo.

## Edge Cases (rodada 2)

| Caso de borda | Evidência | Result |
| --- | --- | --- |
| Spec sem linha `N. ID: … SHALL`: exit 1 e `nenhum AC encontrado` | `tests/tools/jevRefine.test.ts:45` (linha sem `SHALL`) e `:49` (sem linha numerada); M24 morto nesta rodada (M26 na rodada 1, código inalterado) | ✅ PASS |
| `int(3, 3)` devolve 3 | `tests/core/rng.test.ts:44` | ✅ PASS |
| `heal` acima do teto devolve só o que coube (95/100 → 5) | `tests/core/health.test.ts:126-127` | ✅ PASS |
| Duas mortes no mesmo frame geram duas notificações | `scripts/smoke/enemy-died.smoke.mjs:39-42` e `:47`; mesmo `time.now` confirmado por instrumentação; N7 morto | ✅ PASS |

## SPEC_DEVIATION

Nenhum marcador ativo: o de `tools/jev-refine/lib.ts` saiu no T15, e o caso de borda da spec agora descreve o padrão aceito (`N. ID: … SHALL`).

---

## Discrimination Sensor (rodada 2)

**Sensor depth**: lightweight/expandido, focado nas correções. São **13 mutantes não equivalentes**: 3 re-execuções dos sobreviventes da rodada 1 que estão dentro da spec (A5, M22, M24) e 10 novos sobre o código das correções. Resultado: **12 mortos e 1 sobrevivente**. Os mutantes que só morreram no typecheck (N1 e N2, parâmetro `x`/`y` não usado, TS6133) foram refeitos em variantes de runtime (N1b, N2b) e não entram na contagem.

| # | File:line | Mutação | Killed? |
| --- | --- | --- | --- |
| A5 | `src/game/Enemy.ts:198` | `onDied(this, 0, 0)` | ✅ Killed (smoke: `posição do abate {"x":0,"y":0} longe de ...`) |
| M22 | `src/game/debugApi.ts:49` | `Math.ceil` → `Math.floor` | ✅ Killed (`tests/game/debugApi.test.ts:69`) |
| M22r | `src/game/debugApi.ts:49` | `Math.ceil` → `Math.round` | ✅ Killed (`:69`) |
| M24 | `tools/jev-refine/lib.ts:20` | regex do AC sem `\bSHALL\b` | ✅ Killed (`tests/tools/jevRefine.test.ts:45`) |
| N1b | `src/scenes/TestScene.ts:142` | `deaths` grava `x * 0, y * 0` (não copia a posição) | ✅ Killed (smoke) |
| N2b | `src/scenes/TestScene.ts:142` | `deaths` nunca recebe a entrada | ✅ Killed (`deaths deveria ter uma entrada para 2: []`) |
| N3 | `src/scenes/TestScene.ts:148` | snapshot com `enemies[].y = 0` | ✅ Killed (`boot`: `inimigo fora do chão`) |
| N4 | `src/game/Enemy.ts:198` | `x` e `y` trocados | ✅ Killed (smoke) |
| N5 | `src/game/Enemy.ts:198` | posição do spawn (não a do frame) | ✅ Killed (smoke: `{"x":624,"y":462}` longe de `{"x":988.2,...}`) |
| N6 | `src/game/Enemy.ts:198` | `y + 36` (uma altura de corpo abaixo do centro) | ❌ **Survived** (tolerância de 40 px em `scripts/smoke/enemy-died.smoke.mjs:51`) |
| N7 | `src/scenes/TestScene.ts:140` | a cena descarta a 2ª notificação no mesmo `time.now` (mesmo frame) | ✅ Killed (`nem todos morreram: events=["enemyDied:2"]`) |
| N8 | `src/scenes/TestScene.ts:150` | snapshot de `deaths` com `x + 60` | ✅ Killed (smoke) |
| N9 | `src/game/Enemy.ts:198` | posição do sprite (`view.x`, `view.y`) em vez do corpo | ✅ Killed (smoke: sprite sem sincronizar, `x 633` contra `964`) |

Checagens de instrumentação no worktree (não são mutantes):
- INSTR: `deaths=[{"id":2,...,"t":2060.83},{"id":3,...,"t":2060.83}]` e `diedInStep=[[2,3]]`. As duas mortes caem no mesmo `time.now`.
- INSTR2, duas execuções: `[{"id":2,"dx":0,"dy":0},{"id":3,"dx":0,"dy":0}]`. A posição notificada é idêntica à do snapshot anterior ao golpe, porque o golpe de teste é aplicado na entrada do primeiro frame do `step`, antes da física andar. Uma tolerância de 1 px é viável e determinística.

**Resultado do sensor**: 12/13 killed. **FAIL ❌** por causa do N6, que está dentro da spec (FND-08, "posição naquele frame").

---

## Code Quality (correções T13–T16)

| Principle | Status |
| --- | --- |
| Minimum code | ✅ Um campo `debugDeaths` e uma linha no snapshot |
| Surgical changes | ✅ Só os arquivos das tasks T13–T16 |
| No scope creep | ✅ |
| Matches patterns | ✅ Mesmo padrão de `debugEvents` |
| Spec-anchored outcome check | ⚠️ FND-08: posição conferida com tolerância larga (N6) |
| Per-layer Coverage Expectation | ✅ Unit para `debugApi`/parser; smoke para o adaptador |
| Every test maps to a spec requirement | ✅ Cada asserção nova cita FND-08, FND-09, FND-22 ou um caso de borda |
| Documented guidelines followed | ✅ `.specs/STATE.md` AD-001/AD-006/AD-007 |

---

## Fix Plans (rodada 2)

### Fix R2-1: apertar a tolerância da posição do abate (FND-08), Minor

- **Root cause**: `scripts/smoke/enemy-died.smoke.mjs:51` aceita 40 px de diferença. A diferença real é 0, porque o golpe de teste entra antes da física no primeiro frame do `step`. Assim, um desvio de até uma altura de corpo (N6, `y + 36`) passa.
- **Fix task**: trocar `< 40` por `< 1` (ou `toBeCloseTo`, com 0,5 px) nas duas comparações, mantendo a referência do snapshot anterior ao golpe fatal. Se precisar de folga, justificar com uma medição.
- **Done when**: N6 (`this.onDied?.(this, this.body.position.x, this.body.position.y + 36)` em `src/game/Enemy.ts:198`) falha no `npm run smoke`, e A5 continua falhando.

---

## Ranked gaps (rodada 2)

1. **FND-08, tolerância da posição**: o mutante N6 (`y + 36`) sobrevive a `scripts/smoke/enemy-died.smoke.mjs:50-53` (`< 40` px), e a diferença real medida é 0. (Minor)

## Requirement Traceability Update (rodada 2)

Não promovido: o veredito é FAIL. Os 24 requisitos continuam `Implementing` em `spec.md`. Depois do Fix R2-1 e de uma rodada 3 com PASS, todos passam a `Verified`.

## Summary (rodada 2)

**Overall**: ❌ Not Ready (um ajuste de uma linha)
**Spec-anchored check**: 23/24 ACs PASS; FND-08 parcial (N6); 0 spec-precision gaps.
**Sensor**: 13 injetados, 12 mortos, 1 sobrevivente (N6).
**Gate**: 248 passed, 0 failed; build exit 0; smoke exit 0 (3/3).
**Next steps**: Fix R2-1, depois a rodada 3 (última antes de escalar ao usuário). Nota para a rodada 3: o veredito vigente é a linha `**Result**` desta seção. As linhas de veredito da rodada 1 abaixo foram renomeadas (`Veredito da rodada 1`, `**Resultado**`) para não confundir o `validate_state.py`; o conteúdo não mudou.

---

# Rodada 1 (histórico)

**Date**: 2026-09-24
**Spec**: `.specs/features/fundacao-harness-jev/spec.md` (24 requisitos FND-01..FND-24 e 4 casos de borda)
**Diff range**: `22cf49e..aaed07b` (12 commits, T1 `3611713` .. T12 `aaed07b`; 28 arquivos, +1507/−105)
**Verifier**: sub-agente independente (autor ≠ verificador). Não escreveu o código nem os testes, e toda evidência foi refeita contra HEAD. As mutações rodaram num `git worktree` descartável no scratchpad, com junction para o `node_modules`.

## Veredito da rodada 1

**Resultado**: FAIL

Motivo: o FND-08 exige que `onEnemyDied(enemyId, x, y)` receba **a posição do inimigo no mundo naquele frame**, mas nenhum teste confere `x`/`y`. O mutante A5 (`onDied(this, 0, 0)`) sobrevive ao smoke, e `TestScene.onEnemyDied` descarta `_x`/`_y` (`src/scenes/TestScene.ts:138`). Pela regra de payload/conjunção isso deixa um conjunto do AC sem evidência. Há também dois sobreviventes menores ligados à spec (M22 no FND-22 e M24 no caso de borda do parser). Os outros 23 ACs têm evidência ancorada, e os três gates passam.

---

## Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1 `3611713` Rng | ✅ Done | - |
| T2 `cbe612c` sem Math.random | ✅ Done | - |
| T3 `1fa0fe4` Health.heal | ✅ Done | - |
| T4 `4357fde` puppeteer-core + script | ✅ Done | - |
| T5 `1e03583` lib do smoke | ✅ Done | - |
| T6 `721686f` run.mjs + no-debug | ✅ Done | - |
| T7 `a51f70d` debugApi | ✅ Done | Teste não discrimina ceil/floor (M22) |
| T8 `faafd28` adaptadores + cenários | ⚠️ Partial | Posição do FND-08 sem asserção (A5) |
| T9 `9de1e69` .gitignore | ✅ Done | - |
| T10 `2068fa0` parser/flags/relatório | ✅ Done | SPEC_DEVIATION do parser (aceita); M24 sobrevive |
| T11 `a97ccf0` chave + retry | ✅ Done | - |
| T12 `aaed07b` CLI | ✅ Done | Execução real: `.specs/features/run-e-rodadas/refinement.md:6` "31 ACs" |

---

## Gate Check

- **Build gate** (`npm run build && npm test`) e **Full** (`npm test && npm run smoke`), rodados pelo Verifier em HEAD:
  - `npx vitest run`: **23 arquivos, 246 passed, 0 failed, 0 skipped**.
  - `npm run build`: exit 0 (só o aviso de chunk > 500 kB, que já existia).
  - `npm run smoke`: exit 0, com `ok boot.smoke.mjs`, `ok enemy-died.smoke.mjs`, `ok no-debug.smoke.mjs` e "3 cenário(s) ok".
- **Contagem de testes**: 198 antes (`tasks.md`) e 246 depois, **+48**. `git diff 22cf49e..HEAD -- tests` só adiciona arquivos novos, e `tests/core/health.test.ts` só ganhou o bloco da cura. Nenhuma asserção foi removida ou enfraquecida.
- **Isolamento do sensor**: `git status --porcelain` da árvore real antes e depois é idêntico (`?? .agents/ .claude/ .cursor/ .windsurf/`). O worktree foi removido com `git worktree remove --force` (junction desfeita antes) e `git worktree list` mostra só a árvore principal.

---

## Spec-Anchored Acceptance Criteria

| AC | Spec-defined outcome | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| FND-01 | mesma seed dá os 1000 primeiros `next()` idênticos | `tests/core/rng.test.ts:8` - `expect(take(new Rng(12345), 1000)).toEqual(take(new Rng(12345), 1000))`; `:12` seeds diferentes `not.toEqual` (mata M4c, seed ignorada) | ✅ PASS |
| FND-02 | todo `next()` em [0, 1) | `tests/core/rng.test.ts:21-22` - `toBeGreaterThanOrEqual(0)` / `toBeLessThan(1)` em 10 000 amostras | ✅ PASS |
| FND-20 | `int(min,max)` inteiro em [min, max] inclusive | `tests/core/rng.test.ts:33-35` - `Number.isInteger(v)`, `>= -2`, `<= 5`; `:38-39` alcança as duas pontas | ✅ PASS |
| FND-03 | `chance(p<=0)` é `false` | `tests/core/rng.test.ts:52-53` - `chance(0)` e `chance(-1)` `toBe(false)` | ✅ PASS |
| FND-21 | `chance(p>=1)` é `true` | `tests/core/rng.test.ts:60-61` - `chance(1)` e `chance(2)` `toBe(true)` | ✅ PASS |
| FND-04 | nenhum `.ts` de `src/core`/`src/data` cita `Math.random` | `tests/core/noMathRandom.test.ts:14-15` a lista cobre os dois diretórios; `:22` - `expect(offenders).toEqual([])` | ✅ PASS |
| FND-05 | vivo com hp `h`: hp = `min(maxHp, h+n)`, devolve o que foi restaurado | `tests/core/health.test.ts:119-120` - `heal(20)` `toBe(20)`, hp `toBe(70)`; borda `:126-127` - `heal(10)` `toBe(5)`, hp `toBe(100)` | ✅ PASS |
| FND-06 | morto: hp 0 e devolve 0 | `tests/core/health.test.ts:133-135` - `heal(30)` `toBe(0)`, hp `toBe(0)`, `dead` `toBe(true)` | ✅ PASS |
| FND-07 | `n<=0` ou não finito: hp inalterado, devolve 0 | `tests/core/health.test.ts:138-142` - `it.each([0, -5, NaN, Infinity])`: `heal(n)` `toBe(0)`, hp `toBe(50)` | ✅ PASS |
| FND-08 | `died` → `onEnemyDied(enemyId, x, y)` **uma vez** por inimigo, **com a posição no mundo naquele frame**; em `?debug`, um único `enemyDied:<id>` | Unicidade: `scripts/smoke/enemy-died.smoke.mjs:35-36` - `n === 1` por evento e `get('enemyDied:'+id) === 1`; `:42-43` - nada novo após `step(3000)`. **Posição: nenhuma asserção.** `src/scenes/TestScene.ts:138` ignora `_x, _y`; o mutante A5 (`onDied(this, 0, 0)`) sobrevive | ❌ GAP (conjunto `x, y` sem evidência) |
| FND-09 | `?debug`: `snapshot()` = `{ player:{x,y,hp,dead}, enemies:[{id,x,y,hp,state}], events:string[] }` | `tests/game/debugApi.test.ts:42` - `snapshot()` `toEqual(snap)` do probe; `scripts/smoke/boot.smoke.mjs:16-17` - `typeof player.x/y === 'number'`, `hp === 100 && dead === false`; `:20-21` - `typeof e.id === 'number'`, `e.hp === 60 && e.state === 'idle'`; `:23` - `Array.isArray(events)`; `:29-33` o `x` do inimigo muda | ✅ PASS (menor: `enemies[].y` não é conferido, gap 4) |
| FND-22 | `step(ms)` avança `ms` em passos fixos de 1000/60 ms antes de retornar | `tests/game/debugApi.test.ts:51-54` - `sleep` `toBe(1)`, `steps` `toHaveLength(6)`, `delta` `toBe(DT)`, `time` crescente; `:56-58` - `step(50)` soma 3, `sleep` continua 1 | ✅ PASS / ⚠️ Spec-precision gap: a spec não diz como arredondar `ms` que não é múltiplo de 16,67 (o design escolhe `ceil`). Os testes só usam múltiplos exatos, então o M22 (`floor`) sobrevive |
| FND-10 | sem `?debug`, `window.__game` fica `undefined` | `tests/game/debugApi.test.ts:30` - `toBeUndefined()`; `scripts/smoke/no-debug.smoke.mjs:6` - `kind === 'undefined'` (mata A4b) | ✅ PASS |
| FND-23 | `npm run smoke`: `npm run build`, `vite preview` sobre `dist/`, cada `*.smoke.mjs` uma vez em Edge headless | `scripts/smoke/run.mjs:25` build, `:44` `vite preview --port --strictPort`, `:82-84` lista ordenada de `*.smoke.mjs`, `:87-91` Edge `headless: true`. Execução do Verifier: exit 0, com os 3 cenários `ok` uma vez cada | ✅ PASS (evidência de CLI, conforme a matriz) |
| FND-11 | exit 0 se todos passam, 1 se algum falha, imprimindo o nome de cada falho | `tests/scripts/smokeLib.test.ts:48` - `exitCodeFor(allOk)` `toBe(0)`; `:53-55` - `toBe(1)` e `failedNames` `toEqual(['b.smoke.mjs','c.smoke.mjs'])`; `scripts/smoke/run.mjs:113-116` imprime os nomes. Execução no worktree com cenário falho (A7): exit 1 e `  no-debug.smoke.mjs` listado | ✅ PASS |
| FND-12 | sem Edge em `EDGE_PATH` nem nos caminhos padrão: exit 2 e imprime os caminhos | `tests/scripts/smokeLib.test.ts:24-25` - `findEdge(...)` `toBeNull()`; `:31-32` os dois caminhos padrão; `scripts/smoke/run.mjs:17-20`. Execução no worktree (caminhos padrão trocados por inexistentes e `EDGE_PATH` inválido): **exit 2**, com os 3 caminhos impressos | ✅ PASS |
| FND-13 | `refinement.md` na pasta da spec, uma linha por AC com ID, os 4 valores e os nomes das flags ou `ok` | `tests/tools/jevRefine.test.ts:81-82` - 3 linhas; `toMatch(/^\| RUN-01 \| 0\.41 \| 0\.77 \| 0\.55 \| 2\.89 \| .*bundled, testable \|$/)`; `:86` - `toBe('\| RUN-02 \| 0.39 \| 0.51 \| 0.91 \| 2.91 \| ok \|')`; `tools/jev-refine.mjs:45-54` grava em `dirname(spec)/refinement.md`; execução real em `.specs/features/run-e-rodadas/refinement.md:6` ("31 ACs"), com 31 linhas de AC | ✅ PASS |
| FND-14 | flag exatamente quando `ambiguous>0.6 ∨ bundled>0.6 ∨ testable<0.6 ∨ precision<2` | `tests/tools/jevRefine.test.ts:54-67` - cada limiar dos dois lados da fronteira (0,61/0,60; 0,59/0,60; 1,99/2) com `toEqual([...])` exato (mata M9 e M10) | ✅ PASS |
| FND-15 | sem chave no ambiente nem no `.env.local`: aviso, nenhum arquivo, exit 0 | `tests/tools/jevClient.test.ts:143` ambiente primeiro, `:146` lê o `.env.local`, `:149-150` - `toBeNull()`; `tools/jev-refine.mjs:14-19`. Execução no worktree, sem ambiente e sem `.env.local`: aviso impresso, **exit 0**, nenhum `refinement.md` criado | ✅ PASS |
| FND-16 | 429/529: até 3 novas tentativas, esperando 1 s, 2 s e 4 s | `tests/tools/jevClient.test.ts:163-165` - resultado `toEqual`, `waits` `toEqual([1000, 2000])`, 3 chamadas; `:173-174` - `waits` `toEqual([1000, 2000, 4000])`, 4 chamadas (mata M11, M12 e M13) | ✅ PASS |
| FND-24 | 3ª nova tentativa falha: linha `erro <status>` e segue com os outros ACs | `tests/tools/jevClient.test.ts:172` - `toEqual({ error: '529' })`; `tests/tools/jevRefine.test.ts:89` - `toContain('\| SHOP-01 \| erro 529 \|')`, com as linhas dos outros ACs no mesmo relatório (`:81`); na CLI só `JevAuthError` interrompe (`tools/jev-refine.mjs:37-43`) | ✅ PASS |
| FND-17 | 401/422: para, imprime o status e a mensagem da API, exit 1 | `tests/tools/jevClient.test.ts:181-184` - `toBeInstanceOf(JevAuthError)`, `status` `toBe(status)`, `message` `toContain('falha '+status)`, sem esperas (mata M17). Execução no worktree com chave falsa contra a API real: `API 401: {...authentication_error...}` e **exit 1** | ✅ PASS |
| FND-18 | a chave nunca vai para stdout, stderr nem arquivo | `tests/tools/jevClient.test.ts:190-194` - `message` `not.toContain(KEY)` mesmo com a API ecoando a chave (mata M14); relatório `not.toContain(KEY)`. Execução com chave falsa: `grep -c` da chave em stdout e stderr = 0. `git log --all -p` e `git grep HEAD` não contêm a chave real | ✅ PASS |
| FND-19 | `.gitignore` contém `.env.local` | `tests/tools/gitignore.test.ts:8` - `expect(lines).toContain('.env.local')` | ✅ PASS |

**Status**: ❌ 1 AC com conjunto sem evidência (FND-08), ⚠️ 1 spec-precision gap (FND-22), 22 ACs PASS limpos.

---

## Edge Cases

| Caso de borda | Evidência | Result |
| --- | --- | --- |
| Spec sem linha de AC: exit 1 e `nenhum AC encontrado` | `tests/tools/jevRefine.test.ts:45` - `toThrow('nenhum AC encontrado')` (mata M26); `tools/jev-refine.mjs:21-27`. Execução no worktree com chave falsa e spec sem AC: mensagem impressa e **exit 1**. Obs.: sem chave, o FND-15 vem antes e sai com 0 (ordem coerente com a spec) | ✅ PASS, mas o M24 sobrevive (ver SPEC_DEVIATION) |
| `int(min, max)` com `min === max` devolve `min` | `tests/core/rng.test.ts:44` - `rng.int(3, 3)` `toBe(3)` 100 vezes | ✅ PASS |
| `heal` acima do teto devolve só o que coube (95/100, `heal(10)` → 5) | `tests/core/health.test.ts:126-127` - `toBe(5)`, hp `toBe(100)` (mata M5 e M8) | ✅ PASS |
| Dois inimigos morrendo no mesmo frame geram duas notificações | `scripts/smoke/enemy-died.smoke.mjs:35-36` confere um evento por inimigo, mas o cenário não força as duas mortes no mesmo frame. O código é por inimigo (`src/game/Enemy.ts:198`), sem estado compartilhado | ⚠️ Evidência indireta: a simultaneidade não é garantida pelo teste (gap 5) |

---

## SPEC_DEVIATION

| Local | Desvio | Julgamento |
| --- | --- | --- |
| `tools/jev-refine/lib.ts:19-22` | O caso de borda da spec descreve o AC como `ID: WHEN\|WHILE\|WHERE\|IF\|The … SHALL`, e o parser aceita qualquer `N. ID: … SHALL` | **Aceito.** O objetivo do caso de borda é falhar alto quando não há AC, e isso segue valendo (`tests/tools/jevRefine.test.ts:45`). Restringir às palavras-gatilho descartaria em silêncio ACs ubíquos com quantificador ("For every … SHALL", DIF-02; `tests/tools/jevRefine.test.ts:40-41`), o que é pior para uma ferramenta consultiva. O desvio só amplia a aceitação e continua ancorado em `N. ID:` e em `SHALL`. Ação recomendada: ajustar o texto do caso de borda na spec para `N. ID: … SHALL`. Porém nenhum teste exige o `SHALL`: o M24 (tirar `\bSHALL\b` do regex) sobrevive. Falta um teste com uma linha `N. ID:` sem `SHALL` |

---

## Discrimination Sensor

**Sensor depth**: expandido (fundação da expansão). **36 mutações não equivalentes**: 28 unitárias (Vitest) e 8 de adaptador (build + `npm run smoke` no worktree). Resultado: **31 mortas e 5 sobreviventes**. Houve ainda 3 mutações descartadas por serem equivalentes.

| # | File:line | Mutação | Killed? |
| --- | --- | --- | --- |
| M1 | `src/core/rng.ts:23` | `int`: `max - min + 1` → `+ 2` (off-by-one no max) | ✅ Killed (2 testes) |
| M2b | `src/core/rng.ts:28` | `p <= 0` → `return true` | ✅ Killed |
| M3b | `src/core/rng.ts:29` | `p >= 1` → `return false` | ✅ Killed |
| M4b | `src/core/rng.ts:18` | divisor `2^32` → `2^31` (sai de [0,1)) | ✅ Killed (3) |
| M4c | `src/core/rng.ts:9` | seed ignorada (`state = 0`) | ✅ Killed |
| M5 | `src/core/health.ts:71` | `heal` sem teto | ✅ Killed |
| M6 | `src/core/health.ts:69` | `heal` cura morto | ✅ Killed |
| M7 | `src/core/health.ts:69` | sem guarda `isFinite` | ✅ Killed (2) |
| M8 | `src/core/health.ts:72` | devolve `n` em vez do restaurado | ✅ Killed |
| M9 | `tools/jev-refine/lib.ts:43` | `ambiguous > 0.6` → `>=` | ✅ Killed |
| M10 | `tools/jev-refine/lib.ts:46` | `precision < 2` → `<=` | ✅ Killed |
| M11 | `tools/jev-refine/lib.ts:149` | sem a 3ª nova tentativa (`[1000, 2000]`) | ✅ Killed |
| M12 | `tools/jev-refine/lib.ts:149` | esperas `[1000, 2000, 3000]` | ✅ Killed |
| M13 | `tools/jev-refine/lib.ts:180` | 529 não repete | ✅ Killed |
| M14 | `tools/jev-refine/lib.ts:178` | não mascara a chave ecoada pela API | ✅ Killed |
| M15 | `tools/jev-refine/lib.ts:134` | `readKey` ignora o `.env.local` | ✅ Killed |
| M16 | `tools/jev-refine/lib.ts:131` | `readKey` ignora o ambiente | ✅ Killed |
| M17 | `tools/jev-refine/lib.ts:177` | 422 não vira `JevAuthError` | ✅ Killed |
| M18 | `scripts/smoke/lib.ts:26` | `exitCodeFor` sempre 0 | ✅ Killed |
| M19 | `scripts/smoke/lib.ts:20` | `findEdge` ignora `EDGE_PATH` | ✅ Killed |
| M20 | `scripts/smoke/lib.ts:20` | `EDGE_PATH` aceito sem existir | ✅ Killed (2) |
| M21 | `src/game/debugApi.ts:43` | `sleep` em toda chamada de `step` | ✅ Killed |
| M22 | `src/game/debugApi.ts:47` | `Math.ceil` → `Math.floor` na contagem de passos | ❌ **Survived** (100 e 50 ms são múltiplos exatos de 1000/60) |
| M23 | `src/game/debugApi.ts:45` | tempo começa em 0 em vez de `loop.now` | ❌ Survived. Fora da spec: o FND-22 não define a base do tempo, e o A6 também passa no smoke. Informativo |
| M24 | `tools/jev-refine/lib.ts:22` | regex do AC sem exigir `SHALL` | ❌ **Survived** |
| M25 | `tools/jev-refine/lib.ts:110` | linha de erro sem o status (`erro`) | ✅ Killed |
| M26 | `tools/jev-refine/lib.ts:36` | não lança `nenhum AC encontrado` | ✅ Killed |
| M27 | `tools/jev-refine/lib.ts:113` | relatório sem os nomes das flags | ✅ Killed |
| A1 | `src/game/Enemy.ts:198` | `onDied` disparado duas vezes | ✅ Killed (smoke: `enemyDied:2 apareceu 2 vezes`, exit 1) |
| A2 | `src/scenes/TestScene.ts:144` | snapshot sem `dead` | ✅ Killed (typecheck do build, exit 1) |
| A2b | `src/scenes/TestScene.ts:144` | `dead: undefined` (passa no typecheck) | ✅ Killed (smoke: `boot` "player inicial errado") |
| A3 | `src/scenes/TestScene.ts:132` | `onDied` não ligado na cena | ✅ Killed (smoke: `events=[]`) |
| A4 | `src/main.ts:25` | `installDebugApi(..., true)` | ✅ Killed (build: import não usado) |
| A4b | `src/main.ts:25` | `isDebug() \|\| true` | ✅ Killed (smoke: `no-debug` "veio object") |
| A5 | `src/game/Enemy.ts:198` | `onDied(this, 0, 0)` (posição errada) | ❌ **Survived** (FND-08, posição sem asserção) |
| A6 | `src/game/debugApi.ts:45` | M23 no jogo real | ❌ Survived (informativo, fora da spec) |

Equivalentes descartadas (não contam):
- M2 (`p <= 0` → `p < 0`): com `p = 0`, `next() < 0` é sempre falso.
- M3 (`p >= 1` → `p > 1`): com `p = 1`, `next() < 1` é sempre verdadeiro.
- M4 (divisor `2^32 − 1`): só difere quando o uint32 sorteado é `0xFFFFFFFF`, o que uma amostragem não alcança na prática.

Checagem de CLI no worktree (não é mutante): A7, um cenário que falha de propósito, deu exit 1 e o nome listado (FND-11). A troca dos caminhos padrão por inexistentes deu exit 2 e os caminhos impressos (FND-12).

**Resultado**: 31/36 killed. **FAIL ❌**: A5, M22 e M24 são sobreviventes ligados à spec. M23 e A6 são informativos.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ |
| Surgical changes | ✅ Só os arquivos das tasks; a integração de 5 arquivos do T8 foi aceita no tasks.md |
| No scope creep | ✅ |
| Matches patterns | ✅ Lógica pura em `.ts` e casca `.mjs` (design, Tech Decisions) |
| Spec-anchored outcome check | ❌ FND-08: a posição não é conferida |
| Per-layer Coverage Expectation | ⚠️ Núcleo 1:1 ok. Adaptador: um cenário por AC ok, mas o FND-08 está parcial |
| Every test maps to a spec requirement | ✅ Os testes extras (seeds diferentes, `buildRequest`) vêm dos "Done when" do T1 e do T10 |
| Documented guidelines followed | ✅ `vitest.config.ts`, `.specs/STATE.md` AD-001/AD-006/AD-007 |

Segurança: `git grep` em HEAD e `git log --all -p` não contêm a string da chave real. O `.env.local` está ignorado (`tests/tools/gitignore.test.ts:8`).

---

## Fix Plans

### Fix 1: conferir a posição do `onEnemyDied` (FND-08), Major

- **Root cause**: `TestScene.onEnemyDied` descarta `x`/`y` (`src/scenes/TestScene.ts:138`) e o evento de debug é só `enemyDied:<id>`. Nenhum observável carrega a posição, e o A5 sobrevive.
- **Fix task**: expor a posição recebida para o smoke. Uma opção é guardar `{ id, x, y }` num campo de debug ou incluir no evento. Então `enemy-died.smoke.mjs` confere que o `x, y` notificado bate com a posição do inimigo no snapshot do frame da morte (tolerância de 1 px). Se o formato do evento mudar, ajustar a spec ou o design.
- **Done when**: o A5 (`onDied(this, 0, 0)`) falha no smoke.

### Fix 2: `step(ms)` com `ms` não múltiplo de 1000/60 (FND-22), Minor

- **Root cause**: a spec não define o arredondamento, e os testes só usam 100 e 50 ms.
- **Fix task**: definir na spec "`ceil(ms / (1000/60))` passos", como no design. Em `tests/game/debugApi.test.ts`, somar `step(20)` → 2 passos e opcionalmente conferir o primeiro `time` = `loop.now + 1000/60`.
- **Done when**: o M22 (`floor`) falha.

### Fix 3: parser do Jev exige `SHALL` (caso de borda), Minor

- **Fix task**: em `tests/tools/jevRefine.test.ts`, a linha `1. X-01: the game shows the round.` (sem `SHALL`) deve dar `nenhum AC encontrado`. Atualizar o texto do caso de borda da spec para o padrão aceito, `N. ID: … SHALL`.
- **Done when**: o M24 falha.

---

## Ranked gaps

1. **FND-08, posição `x, y` sem evidência.** O mutante A5 sobrevive, e `src/scenes/TestScene.ts:138` e `scripts/smoke/enemy-died.smoke.mjs:35-36` só conferem a contagem. (Major)
2. **FND-22, `ceil` vs `floor` não discriminado** (M22) e spec sem regra de arredondamento. `tests/game/debugApi.test.ts:52,58`. (Minor)
3. **Caso de borda do parser**: nenhum teste exige `SHALL` (M24). O SPEC_DEVIATION é aceito, mas o texto da spec precisa acompanhar. `tests/tools/jevRefine.test.ts:44-46`. (Minor)
4. **FND-09**: `enemies[].y` nunca é conferido, nem como número (`scripts/smoke/boot.smoke.mjs:19-22`). (Cosmetic)
5. **Caso de borda "duas mortes no mesmo frame"**: a evidência é indireta, e o cenário não força a simultaneidade (`scripts/smoke/enemy-died.smoke.mjs:23-27`). (Minor)

---

## Requirement Traceability Update

Não promovido: o veredito é FAIL. O status dos 24 requisitos continua `Implementing` na spec. Depois dos fixes e de uma re-verificação PASS, FND-01..07, FND-09..24 e FND-08 passam a `Verified`.

---

## Summary

**Overall**: ❌ Not Ready (falta pouco)

**Spec-anchored check**: 23/24 ACs com evidência ancorada. O FND-08 está parcial (posição) e há 1 spec-precision gap (FND-22).
**Sensor**: 31/36 killed. 3 sobreviventes ligados à spec (A5, M22, M24) e 2 informativos (M23, A6).
**Gate**: 246 passed, 0 failed; build exit 0; smoke exit 0 (3/3).

**What works**:
- Rng, cura, regras do smoke, cliente Jev com retry e redação da chave, todos com testes que matam os mutantes.
- O harness de smoke é real e discrimina: pega `onDied` duplicado, `dead` ausente, `onDied` não ligado e `__game` vazando sem `?debug`.
- Os códigos de saída 0, 1 e 2 do smoke e 0 e 1 do Jev foram conferidos por execução.

**Next steps**: Fix 1 a Fix 3 como tasks de correção, depois re-verificação.
