# Mundo modular Validation

**Verdict**: FAIL

**Date**: 2026-10-07
**Spec**: `.specs/features/mundo-modular/spec.md`
**Diff range**: `1c75d95..HEAD` (`fd886bf`..`408c79e`, 25 commits; base antes da feature `0d35d77`)
**Verifier**: sub-agente independente (autor ≠ verifier), evidence-or-zero

Resumo: o núcleo puro está bem coberto e discrimina (24/24 mutantes unitários mortos). Os quatro adaptadores com
asserção viva também matam seus mutantes. O FAIL vem de 8 ACs com evidência parcial ou sem evidência, dois deles P1
(TRV-07 e TRV-10), mais 2 edge cases sem teste. Dois mutantes de adaptador sobreviveram: TRV-10 e THM-02.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1-T25 | ✅ Done | Todos marcados `[x]` em `tasks.md`; nenhuma task bloqueada ou parcial |

---

## Gate Check

- **Gate command**: `npm run gate` (typecheck + oxlint + prettier --check + vitest) e `npm run smoke`
- **Unit**: 120 arquivos, **2694 passaram**, 0 falharam, 0 pulados (exit 0)
- **Smokes**: **39/39 ok** (`39 cenário(s) ok`, exit 0) numa única execução; nenhum intermitente apareceu
- **Test count before feature**: 2575 unit e 35 smokes (`tasks.md`, base `0d35d77`)
- **Test count after feature**: 2694 unit e 39 smokes
- **Delta**: +119 unit, +4 smokes (`world-traverse`, `world-run`, `world-boss`, `world-legacy`)
- **Skipped tests**: nenhum
- **Failures**: nenhuma

---

## Spec-Anchored Acceptance Criteria

Legenda: ✅ a asserção bate com o valor da spec · ⚠️ evidência parcial ou vaga onde a spec é precisa (gap) · ❌ sem evidência

### P1: Módulos com gramática validada

| AC | `file:line` + assertion | Valor da spec | Result |
| --- | --- | --- | --- |
| MDL-01 | `tests/core/module.test.ts:21-22` `validateModule(mod(16))`/`mod(48)` `.not.toThrow()`; `:26-27` `mod(15)`/`mod(49)` `.toThrow(/teste/)`; `:32-33` 16 e 18 linhas `.toThrow`; `:40` linha de largura diferente `.toThrow(/linha 5/)` | 17 linhas, 16 a 48 colunas, todas iguais | ✅ (M21 morto) |
| MDL-02 | `tests/core/module.test.ts:45` `P` `.toThrow('Módulo "teste": linha 3, coluna 7')`; `:50` `x` `.toThrow('Módulo "teste": linha 9, coluna 0')`; `:55` legenda inteira aceita | só `# . E c b p` | ✅ |
| MDL-03 | `tests/core/module.test.ts:45,50` id + linha + coluna para caractere proibido. Para quebras de MDL-01: `:26-27,32-33` afirmam só `/teste/` (id); `:40` afirma a linha, sem a coluna | id **e** linha **e** coluna para MDL-01 **ou** MDL-02 | ⚠️ gap: nas quebras de MDL-01 a linha e a coluna não são afirmadas |
| MDL-04 | `tests/core/module.test.ts:65-68` `toHaveLength(1)`, `/MDL-04/`, `/linha 15, coluna 4/`; `:72-74` `/linha 16, coluna 19/` | linhas 15 e 16 sólidas em toda coluna | ✅ |
| MDL-05 | `tests/core/module.test.ts:80` `/MDL-05/ && /linha 14, coluna 10/`; `:85` linha 0 | nenhum `#` nas linhas 0-14 | ✅ (M7 morto) |
| MDL-06 | `tests/core/module.test.ts:96` 12 colunas abertas: sem MDL-06; `:103` 11 colunas: MDL-06; `:108` boss com 11: MDL-06 | ≥ 12 colunas com as linhas 9-14 abertas, combat e boss | ✅ (M14 morto) |
| MDL-07 | `tests/core/module.test.ts:120` 1 `E` falha; `:124` 2 `E` `toEqual([])`; `:132` `E` na linha 13 `/linha 13, coluna 5/`; `:165` boss sem `E` | ≥ 2 `E`, todos na linha 14 | ✅ (M15 morto) |
| MDL-08 | `tests/core/module.test.ts:137` combate sem objeto MDL-08; `:142,147` um `p` ou um `b` bastam; `:166` boss | ≥ 1 `c`/`b`/`p` | ✅ |
| MDL-09 | `tests/core/module.test.ts:154` `/MDL-09/ && /linha 14, coluna 6/`; `:159` konbini sem E passa | konbini com `E` falha | ✅ |
| MDL-10 | `tests/data/modules.test.ts:15` cinco ids; `:16` `COMBAT_IDS` `['rua','beco','parque']`; `:25-27` 17 linhas, largura exata (40/20/32/20/40), kind; `:32-33` validate + lint `toEqual([])` | larguras 40/20/32/20/40, todos passam no lint | ✅ |

### P1: Área montada pela seed

| AC | `file:line` + assertion | Valor da spec | Result |
| --- | --- | --- | --- |
| ARE-01 | `tests/core/stage.test.ts:34-35` `toHaveLength(2)` nas rodadas 1 e 2; `scripts/smoke/world-run.smoke.mjs:86` `'2,2,3'` | 2 módulos | ✅ |
| ARE-02 | `tests/core/stage.test.ts:36-38` `toHaveLength(3)` nas rodadas 3, 4 e 6 | 3 módulos da rodada 3 em diante | ✅ (M13 morto) |
| ARE-03 | `tests/core/stage.test.ts:43-44` `toEqual(['santuario'])` nas rodadas 5 e 10; `:132` com `forced`; `scripts/smoke/world-boss.smoke.mjs:162-166` `["santuario"]`, `widthPx === 42*TILE` | só `santuario` | ✅ |
| ARE-04 | `tests/core/stage.test.ts:57` (20 seeds × 10 rodadas) `not.toBe(modules[i-1])`; `:87-89` | nenhum vizinho igual | ✅ |
| ARE-05 | `tests/core/stage.test.ts:58` `modules[0]` `not.toBe(prevFirst)`; `:87-89`; `world-run.smoke.mjs:88-93` | primeiro ≠ primeiro da área anterior | ✅ (M3 morto) |
| ARE-06 | `tests/core/stage.test.ts:59-60` entre `AREA.minCols` e `AREA.maxCols`; `:27` `AREA` `{minCols: 48, maxCols: 120, ...}`; `:97-98` 120 passa / 121 troca o último; `:103` troca respeita a anti-repetição; `:108-109` 48 passa / 47 acrescenta o beco | 48 a 120 colunas com a parede e o selo; > 120 troca o último pelo mais estreito; < 48 acrescenta o `beco` | ✅ (M8, M9, M10 mortos) |
| ARE-07 | `tests/core/run.test.ts:715` `stageRng.next()` `toBe(new Rng(7 ^ 0x1f83d9ab).next())`; `tests/core/stage.test.ts:72` `run(42)` `toEqual(run(42))`, rodadas 1-10; `world-run.smoke.mjs:119-122` recarga com a mesma seed | stream `seed ^ 0x1f83d9ab`; mesma seed, mesma sequência nas rodadas 1-10 | ✅ (M11 morto) |
| ARE-08 | `tests/core/stageArea.test.ts:37` coluna 0 `toBe('#')`; `:42-43` última coluna `S` nas linhas 0-14; `tests/core/level.test.ts:125` `seal` `{x: 4*TILE, y: 0, width: TILE, height: 15*TILE}` | 1 coluna de parede antes e 1 coluna de selo depois | ✅ |
| ARE-09 | `tests/core/stageArea.test.ts:64` `lvl.player` `toEqual({x: 3*TILE+TILE/2, y: 14*TILE+TILE/2})`; `world-traverse.smoke.mjs:61` `colOf(snap) === 3` (valor vivo) | coluna 3, em cima da linha 14 | ✅ (M20 morto) |
| ARE-10 | `world-traverse.smoke.mjs:31-38` `worldView.left >= -1 && worldView.right <= area.widthPx + 1`, mais de 30 medições | limites da câmera = largura **e** altura da área em px | ⚠️ gap: só o teto horizontal da vista é afirmado; um limite menor que a área ou a altura errada passariam |
| ARE-11 | `world-traverse.smoke.mjs:67-70` `staticBodies === 17 + 1`; `:178` konbini `=== 17`; `:193` `worldProps.length === 0`; `:234-236` rodada 2 `=== 17 + 1` (contagem viva do Matter) | corpos estáticos = sólidos mesclados + selo; nada da área anterior sobrevive | ✅ (a cláusula mensurável "so that" está afirmada; tiles, fundo e textos flutuantes não são contados um a um) |
| ARE-12 | `tests/core/stage.test.ts:120-122` `toEqual(['beco','parque'])` nas rodadas 1-3; `:127-128` ignora as regras; `world-traverse.smoke.mjs:54,220`; `world-run.smoke.mjs:126-129` | exatamente esses módulos, nessa ordem, em toda área comum | ✅ (M18 morto) |
| ARE-13 | `tests/core/stage.test.ts:147-150` `parseModulesParam('konbini,xyz')`, `'santuario'`, `''`, `null` → `toBeNull()`; `:143` ignora os inválidos no meio da lista | só desconhecidos ou especiais: o parâmetro é ignorado | ✅ |

### P1: Selo, travessia e saída

| AC | `file:line` + assertion | Valor da spec | Result |
| --- | --- | --- | --- |
| TRV-01 | `world-traverse.smoke.mjs:102` `player.x < exitX` em todo quadro de `roundActive`; `:108` parado junto ao selo com `sealed === true`; `:63` `exitX === 53*TILE` | selo sólido em `roundActive` para o player, os inimigos e os objetos | ✅ para o player (inimigos e objetos não afirmados; usam o mesmo `Filters.terrain`) |
| TRV-02 | `tests/core/run.test.ts:587-588` `state` `'traverse'`, `commands` `toEqual([{type:'roundCleared', round:1}])`; `world-traverse.smoke.mjs:128-131` | `roundActive` → `traverse` + `roundCleared` no mesmo update | ✅ (M12 morto) |
| TRV-03 | Corpo removido: `world-traverse.smoke.mjs:133-136` `staticBodies === 17`; `world-boss.smoke.mjs:192-195` `staticBefore - 1`. Efeito de 400 ms: só `tests/core/stage.test.ts:27` `AREA.sealBurnMs: 400` (constante, não o uso dela) | remove o corpo **e** toca um efeito de 400 ms | ⚠️ gap: a duração do efeito não é afirmada na cena (A1, corpo mantido, morto) |
| TRV-04 | `tests/core/run.test.ts:597-599` 2 × 10 s em `traverse` `toEqual([])` (sem spawn nem timer); `:603` `acceptsPlayerInput('traverse')` `toBe(true)` | aceita input, nenhum spawn, nenhum timer | ✅ (M4, M4b, M22 mortos) |
| TRV-05 | `world-traverse.smoke.mjs:150,158` o player passa de `exitX` e a área vira a konbini; `:173` `events.includes('shopOpen:1')`; a idempotência vem de TRV-06 e do edge case (`run.test.ts:652-660`) | centro do corpo passa da borda esquerda do selo → `exitReached()` uma única vez por área | ✅ (chamada única pela cena não afirmada diretamente; a run garante uma transição só) |
| TRV-06 | `tests/core/run.test.ts:633-635` ignorado em `roundActive` (mesmo com a onda fechando depois); `:644-649` ignorado em `shop` e `title` | ignorado fora de `traverse` | ✅ (M6, M6b mortos) |
| TRV-07 | `world-traverse.smoke.mjs:183-189` `wallet.fragments === before + swept`, nenhum fragmento sobra. Gotas de cura e Elixir (com teto de vida): **sem asserção** | credita os fragmentos **e** aplica as curas e o Elixir, com teto no maxHp | ⚠️ gap (P1): só a parte dos fragmentos tem evidência (A4 morto) |
| TRV-08 | `world-traverse.smoke.mjs:89` garrafa na mão antes; `:191` `hud.heldItem === null` depois | objeto da mão destruído, mãos vazias | ✅ (A3 morto) |
| TRV-09 | `tests/core/run.test.ts:685-687` `[{type:'gameOver', round:1, kills:6}]`, `summary` `{round:1, kills:6}` | `gameOver` com o mesmo resumo | ✅ (M5 morto) |
| TRV-10 | `world-traverse.smoke.mjs:160-161` fade de saída de 12 a 19 quadros (~250 ms). Fade de entrada de 250 ms e input neutro nos 500 ms: **sem asserção** | 250 ms escurecendo + 250 ms clareando, input neutro nos 500 ms | ⚠️ gap (P1): o mutante A5 (input cru durante a transição) **sobreviveu** |

### P1: Konbini como loja

| AC | `file:line` + assertion | Valor da spec | Result |
| --- | --- | --- | --- |
| KON-01 | `world-traverse.smoke.mjs:164-176` `modules === ["konbini"]`, `widthPx === 22*TILE`, `state === 'shop'`, `round === 1`, `shop.open`, `shopOpen:1`, `colOf === 3`; `tests/core/run.test.ts:613-614` | konbini como área, player na coluna 3, `shop` + `shopOpen` da rodada atual | ✅ |
| KON-02 | `world-traverse.smoke.mjs:173` `shop.open === true`. A loja não muda no diff (só o `closeShop` ganha o fade, `shopDirector.ts`) e os smokes de loja antigos rodam na sala | mesmas ofertas, preços, reroll e painel de antes | ⚠️ gap de precisão: "exatamente como antes" não é afirmado dentro da konbini (ofertas e preços não são lidos lá) |
| KON-03 | `world-traverse.smoke.mjs:214-236` `roundActive`, `round === 2`, `colOf === 3`, `shop.open === false`, um `shopClose`, `staticBodies === 18`; `tests/core/run.test.ts:677` `[{type:'roundStart', round:2}]` | área da próxima rodada, `roundStart(round + 1)`, player na coluna 3 | ✅ |
| KON-04 | `tests/core/run.test.ts:621-623` `[{type:'roundStart', round:2}]`, `roundActive`, `round === 2`; `world-run.smoke.mjs:101-104` nenhum `shopOpen` | direto para a próxima área, sem `shopOpen` | ✅ (M19 morto) |
| KON-05 | `world-traverse.smoke.mjs:196-205` `alive === 0` e nenhum id novo depois de 1 s; `tests/core/stageArea.test.ts:162` `lvl.enemies` `toEqual([])` | nenhum inimigo nasce na konbini | ✅ |

### P1: Spawn ao alcance num mapa maior

| AC | `file:line` + assertion | Valor da spec | Result |
| --- | --- | --- | --- |
| RCH-01 | `tests/core/spawnPoint.test.ts:172-173` 500/901/2000 px → só o de 500; `:180,182` os dois lados; `world-run.smoke.mjs:112-115` `maxSpawnDx <= 900` com ≥ 12 spawns vivos | fora da câmera **e** ≤ 900 px | ✅ (A2 morto: 1766 px sem `maxReach`) |
| RCH-02 | `tests/core/spawnPoint.test.ts:161` 900 px → `toBe(0)` (candidato); `:165` 901 px → `toBe(1)` | 900 sim, 901 não | ✅ (M1 morto) |
| RCH-03 | `tests/core/spawnPoint.test.ts:190-191` → `toBe(1)` (o mais perto), `calls.int` `toBe(0)`; `:195-199` dos dois lados e no empate; `:204` só fora da câmera | o fora da câmera mais perto | ✅ (M17 morto) |
| RCH-04 | `tests/core/spawnPoint.test.ts:209-210` `farthestPoint` com `maxReach` | `farthestPoint` | ✅ |
| RCH-05 | `tests/core/spawnPoint.test.ts:230,235-236` costas só entre os do alcance; `:242,248` gap só entre os do alcance | costas e gap sobre os candidatos de RCH-01 | ✅ |

### P1: Sala de teste e compatibilidade

| AC | `file:line` + assertion | Valor da spec | Result |
| --- | --- | --- | --- |
| LEG-01 | `world-legacy.smoke.mjs:38-48` sala de 40×17, sem módulos, sem selo; `:70` `intermission`; `:79` nunca `traverse`; `:81-82` `shop` em 2300-2700 ms; `:72,89` sem `areaBuilt`; `tests/core/spawnPoint.test.ts:255` sem `maxReach` nada muda | `LEVEL_1`, `intermission` de 2500 ms → `shop`, sem selo, `traverse` nem konbini | ✅ |
| LEG-02 | `tests/core/stageArea.test.ts:172-176` `fxlab`, `fxlab&modules=rua`, `fxlab&area=outra` → `'sala'`; `world-legacy.smoke.mjs:94-102` três URLs vivas, `fxlab !== null` | `LEVEL_1` com `fxlab`, sejam quais forem `area` e `modules` | ✅ (M16 morto) |
| LEG-03 | `scripts/smoke/run.mjs:89-97` `withLegacyRoom`. Sem asserção direta; evidência indireta: os 35 smokes antigos passam e eles medem a geometria da sala (a T15 registrou que quebram no modo modular) | acrescenta `area=sala` sem `area=` nem `modules=` | ✅ (indireta, pelos 35 cenários) |
| LEG-04 | `tests/core/stageArea.test.ts:178-...` `'?debug'`, `''` → `'modular'`; `world-legacy.smoke.mjs:105-117`; `world-traverse.smoke.mjs:42` | sem `area=sala` nem `fxlab` → modular | ✅ |
| LEG-05 | `tests/game/debugApi.test.ts:95` forma `{mode, modules, widthPx, heightPx, sealed, exitX, staticBodies}`; os 7 campos lidos vivos nos smokes (`world-traverse.smoke.mjs:58,63,68`; `world-legacy.smoke.mjs:38-47`); `staticBodies` vem de `matter.world.getAllBodies()` | o campo `area` com essa forma | ✅ |

### P2: Objetos sorteados nos slots

| AC | `file:line` + assertion | Valor da spec | Result |
| --- | --- | --- | --- |
| SLT-01 | `tests/core/stageArea.test.ts:82-83` 0,39 → `c`, 0,4 → `b`; `:87-88` 0,79 → `b`, 0,8 → `.`; `:109-111` 1200 slots em 40/40/20 ± 5; `tests/core/run.test.ts:716` `slotRng` = `Rng(7 ^ 0x5be0cd19)` | 0,4 / 0,4 / 0,2 com o stream `seed ^ 0x5be0cd19` | ✅ (M2 morto) |
| SLT-02 | `tests/core/stageArea.test.ts:134` `ids(true)` `toEqual(ids(false))`; `tests/core/stage.test.ts:81` `slotRng` intocado pelo sorteio | os ids dos módulos nunca saem do slot RNG | ✅ |
| SLT-03 | `tests/core/stageArea.test.ts:118-121` `c`/`b` fixos ficam e não consomem o `slotRng` | `c` e `b` sempre criam o objeto | ✅ |

### P2: Tema visual por módulo

| AC | `file:line` + assertion | Valor da spec | Result |
| --- | --- | --- | --- |
| THM-01 | `tests/data/modules.test.ts:28` `def.theme` `toBe(id)` para os 5; `tests/game/art/tiles.test.ts:74-79` cinco chãos distintos | todo módulo declara um tema entre os 5 | ✅ |
| THM-02 | `tests/game/art/tiles.test.ts:50-55` as folhas existem e usam só a paleta. **Sem asserção** de que a cena desenha cada trecho com a folha do tema dele (`world.ts` `sheetFor`) nem de que a faixa de fundo usa a cor do tema (`background.ts` `NEAR_COLORS`, `bandsFor`) | tiles com os frames do tema e faixa de fundo com a cor do tema, só da `PALETTE` | ❌ gap: o mutante A6 (`sheetFor` sempre devolve `TEX.terrain`) **sobreviveu** |
| THM-03 | `tests/game/art/tiles.test.ts:86-90` o frame `seal` existe e usa a paleta. **Sem asserção** de que o selo é desenhado com ele enquanto sólido e some depois do efeito | frame `seal` enquanto sólido; nada desenhado depois do efeito | ⚠️ gap: só a existência do frame |

**Status**: ❌ gaps presentes. 46/54 ACs com evidência que bate com a spec; 8 com gap (MDL-03, ARE-10, TRV-03, TRV-07, TRV-10, KON-02, THM-02, THM-03).

---

## Edge Cases

- [x] Player e último inimigo morrem no mesmo update → `gameOver`, nunca `traverse`: `tests/core/run.test.ts:690-697` `commands.map(type)` `toEqual(['gameOver'])`
- [x] `exitReached()` duas vezes no mesmo update → uma transição: `tests/core/run.test.ts:652-660` um `roundStart` e `round === 2`
- [ ] Nova run a partir de `gameOver` constrói a área da rodada 1 para a seed nova, com o player na coluna 3: **sem evidência** (nenhum smoke reinicia a run no modo modular; o código passa por `startRun` → `new Stage` → `roundStart(1)` → `rebuild`)
- [x] `?debug&round=5` → a primeira área é o `santuario`: `scripts/smoke/world-boss.smoke.mjs:161-166`
- [ ] Objeto jogado além do selo aberto não chama `exitReached()`: **sem evidência** (estruturalmente, `areaDirector.ts:101` só olha `player.sprite.x`; nenhum teste joga um objeto pela saída)
- [x] Vencer o chefe → `traverse` e o selo do santuário abre: `scripts/smoke/world-boss.smoke.mjs:187-195` `traverse`, `sealed === false`, `staticBodies === staticBefore - 1`

---

## Discrimination Sensor

Isolamento: `git worktree add --detach <scratchpad>/verifier-wt HEAD`, com junction para o `node_modules` do repo real.
Mutações aplicadas e revertidas uma a uma no worktree. Unit: `npx vitest run <arquivo>`. Adaptador:
`node scripts/smoke/run.mjs <cenário>` (build + preview no worktree). Worktree removido com
`git worktree remove --force`; `git status --porcelain` do repo real antes e depois:
`?? .claude/`, `?? BRIEF-FABLE.md`, `?? SKILL.md` (idêntico).

| # | Mutação | File | Result | Morto por |
| --- | --- | --- | --- | --- |
| M1 | RCH-02 `<= reach` → `< reach` | `src/core/spawnPoint.ts:44` | ✅ Killed | `spawnPoint.test.ts` "ponto a 900 px é candidato (<=)" |
| M2 | SLT-01 `SLOT_CHAIR_BELOW = 0.4` → `0.5` | `src/core/stage.ts:130` | ✅ Killed | `stageArea.test.ts` "0,39 vira cadeira; 0,4 vira garrafa", distribuição 40/40/20 |
| M3 | ARE-05 `avoid = i === 0 ? prevFirst` → `null` | `src/core/stage.ts:68` | ✅ Killed | `stage.test.ts` 20 seeds × 10 rodadas; "a posição 0 evita o prevFirst" |
| M4 | TRV-04 spawn liberado em `traverse` | `src/core/run.ts` (`advanceTimers`) | ✅ Killed | `run.test.ts` "traverse não emite spawn nem avança timer" |
| M4b | TRV-04 timer da intermission correndo em `traverse` | `src/core/run.ts` (`advanceTimers`) | ✅ Killed | `run.test.ts` idem |
| M5 | TRV-09 morte em `traverse` ignorada | `src/core/run.ts:204` | ✅ Killed | `run.test.ts` "morte em traverse vai a gameOver" |
| M6 | TRV-06 `exitReached` aceito em qualquer estado | `src/core/run.ts` (`exitReached`) | ✅ Killed | `run.test.ts` "é ignorado em roundActive" |
| M6b | TRV-06 `resolveExit` fora de `traverse` | `src/core/run.ts` (`resolveExit`) | ✅ Killed | `run.test.ts` "morte e exitReached no mesmo update" |
| M7 | MDL-05 lint aceitando `#` na linha 14 (`r < 15` → `r < 14`) | `src/core/module.ts:66` | ✅ Killed | `module.test.ts` "# na linha 14 falha" |
| M8 | ARE-06 `maxCols: 120` → `121` | `src/data/tuning.ts` (`AREA`) | ✅ Killed | `stage.test.ts` "AREA bate com a spec", "120 passa; 121 troca" |
| M9 | ARE-06 `cols > maxCols` → `>=` | `src/core/stage.ts:43` | ✅ Killed | `stage.test.ts` "120 colunas passa" |
| M10 | ARE-06 `cols < minCols` → `<=` | `src/core/stage.ts:47` | ✅ Killed | `stage.test.ts` "48 colunas passa" |
| M11 | ARE-07 sal do `stageRng` trocado | `src/core/run.ts` (`resolveStart`) | ✅ Killed | `run.test.ts` "stageRng e slotRng ... new Rng(s ^ salt)" |
| M12 | TRV-02 modular indo a `intermission` | `src/core/run.ts` (`resolveKills`) | ✅ Killed | `run.test.ts` "o último abate vai a traverse" |
| M13 | ARE-02 3 módulos só da rodada 4 | `src/core/stage.ts:103` | ✅ Killed | `stage.test.ts` "2 módulos nas rodadas 1 e 2, 3 na rodada 3" |
| M14 | MDL-06 11 colunas aceitas | `src/core/module.ts:95` | ✅ Killed | `module.test.ts` "11 colunas abertas seguidas falha" |
| M15 | MDL-07 `E` fora da linha 14 aceito | `src/core/module.ts:105` | ✅ Killed | `module.test.ts` "E na linha 13 falha" |
| M16 | LEG-02 `fxlab` ignorado | `src/core/stage.ts:193` | ✅ Killed | `stageArea.test.ts` "area=sala, fxlab ... são a sala" |
| M17 | RCH-03 o mais perto vira o mais longe | `src/core/spawnPoint.ts:60` | ✅ Killed | `spawnPoint.test.ts` "todos acima de 900 px" |
| M18 | ARE-12 `forced` ignorado | `src/core/stage.ts:103` | ✅ Killed | `stage.test.ts` "usa exatamente a lista" |
| M19 | KON-04 `skipShop` ignorado | `src/core/run.ts` (`resolveExit`) | ✅ Killed | `run.test.ts` "com skipShop leva direto a roundActive" |
| M20 | ARE-09 `playerCol: 3` → `4` | `src/data/tuning.ts` (`AREA`) | ✅ Killed | `stageArea.test.ts` "o player no centro da coluna 3" |
| M21 | MDL-01 máximo 48 → 49 | `src/core/module.ts:14` | ✅ Killed | `module.test.ts` "recusa 15 e 49 colunas" |
| M22 | TRV-04 `acceptsPlayerInput('traverse')` → false | `src/core/run.ts:44` | ✅ Killed | `run.test.ts` "acceptsPlayerInput(traverse) é true" |
| A1 | TRV-03 `openSeal` não remove o corpo do selo | `src/scenes/test/world.ts:87` | ✅ Killed | `world-traverse` "TRV-03: o corpo do selo deveria sair do mundo: 18" |
| A2 | RCH-01 `maxReach` não passado no modular | `src/scenes/test/spawner.ts:44` | ✅ Killed | `world-run` "RCH-01: inimigo nasceu a 1766 px do player (máximo 900)" |
| A3 | TRV-08 `dropHeldForTransition` removido | `src/scenes/test/areaDirector.ts:156` | ✅ Killed | `world-traverse` "TRV-08: a mão deveria estar vazia" |
| A4 | TRV-07 pickups levados sem crédito | `src/scenes/test/areaDirector.ts:154` | ✅ Killed | `world-traverse` "TRV-07: carteira 4 != 4 + 11 varridos" |
| A5 | TRV-10 input cru durante a transição (sem `!this.area.transitioning`) | `src/scenes/TestScene.ts:451` | ❌ **Survived** | nenhum: `world-traverse` passou |
| A6 | THM-02 `sheetFor` sempre `TEX.terrain` | `src/scenes/test/world.ts:114` | ❌ **Survived** | nenhum: os 4 `world-*` passaram |

**Sensor depth**: expandido (feature crítica de fluxo): 24 mutações unitárias + 6 de adaptador por smoke.
**Result**: 28/30 mortos, 2 sobreviveram. ❌ FAIL (A5 e A6 precisam de fix task).

---

## SPEC_DEVIATION

`grep SPEC_DEVIATION` nos 47 arquivos do diff: nenhum marcador.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code / sem escopo extra | ✅ (nada fora da spec; `TerrainBuilder` absorvido pelo `WorldBuilder`, como na T9) |
| Surgical changes | ✅ |
| Matches patterns | ✅ (streams `seed ^ salt` como os de antes; pedidos resolvidos no `update`, como `closeShop`) |
| Spec-anchored outcome check | ⚠️ 8 ACs com gap (acima) |
| Per-layer Coverage Expectation | ⚠️ núcleo 1:1 com limiares nos dois lados (L-010 ok); adaptadores sem valor vivo para TRV-10 (fade de entrada e input neutro) e THM-02/03 (L-043) |
| Every test maps to a spec requirement | ✅ |
| Documented guidelines followed | ✅ `vitest.config.ts`, `.oxlintrc.json` (o gate passa sem exceção nova), lições L-010 e L-043 |

---

## Fix Plans

### Fix 1 (Major, P1): TRV-10 sem asserção do input neutro e do fade de entrada
- **Root cause**: `world-traverse` mede só os quadros do fade de saída; nada lê o input do player nem a câmera durante a reconstrução e o fade de entrada.
- **Fix task**: em `scripts/smoke/world-traverse.smoke.mjs`, segurar `KeyD` (ou `KeyJ`) desde o cruzamento do selo e afirmar que `player.x` (e o estado de ataque) não muda enquanto a transição dura; afirmar que o fade de entrada dura ~250 ms (por exemplo, pelo `transitioning` exposto no snapshot ou pelo alpha do fade da câmera), na saída e no fechamento da loja.
- **Done when**: o mutante A5 (`TestScene.ts:451` sem `!this.area.transitioning`) morre.

### Fix 2 (Major, P1): TRV-07 sem evidência das curas e do Elixir
- **Fix task**: em `world-traverse` (ou num smoke novo), deixar uma gota de cura e o Elixir no chão com a vida abaixo do máximo e afirmar `player.hp === min(maxHp, hp antes + soma)` na konbini, e que nenhum pickup sobra.
- **Done when**: um mutante que credita só `kind === 'fragment'` no `finishExit` morre.

### Fix 3 (Minor, P2): THM-02 e THM-03 sem valor vivo
- **Fix task**: expor no snapshot (ou num evento de debug) a textura de um tile por trecho e a cor da faixa próxima; afirmar em `world-traverse` com `beco,parque` que os trechos usam `terrain-beco` e `terrain-parque`; afirmar que a imagem do selo existe com o frame `seal` enquanto `sealed` e some 400 ms depois de `openSeal`. Teste unitário de `NEAR_COLORS` (só chaves da `PALETTE`, uma por tema).
- **Done when**: o mutante A6 morre.

### Fix 4 (Minor): ARE-10, TRV-03 (400 ms), MDL-03, KON-02 e os 2 edge cases
- ARE-10: afirmar `camera.bounds` (ou `getBounds`) igual a `{0, 0, widthPx, heightPx}` no snapshot vivo.
- TRV-03: afirmar a duração do efeito do selo (a imagem some entre 350 e 450 ms).
- MDL-03: nas quebras de MDL-01 afirmar a mensagem com linha e coluna, não só `/teste/`.
- KON-02: na konbini, comparar as ofertas e os preços com os da sala para a mesma seed.
- Edge "nova run a partir de gameOver": smoke que morre, reinicia e confere `areaBuilt` da rodada 1 com a seed nova e `colOf === 3`.
- Edge "objeto além do selo": jogar a garrafa pela saída aberta e afirmar que a run continua em `traverse`.

---

## Requirement Traceability Update

| Requirement | New Status |
| --- | --- |
| MDL-01, MDL-02, MDL-04..10, ARE-01..09, ARE-11..13, TRV-01, TRV-02, TRV-04..06, TRV-08, TRV-09, KON-01, KON-03..05, RCH-01..05, LEG-01..05, SLT-01..03, THM-01 | ✅ Verified |
| MDL-03, ARE-10, TRV-03, KON-02, THM-03 | ⚠️ Gap de precisão (fix menor) |
| TRV-07, TRV-10, THM-02 | ❌ Needs Fix |

---

## Summary

**Overall**: ❌ Not Ready

**Spec-anchored check**: 46/54 ACs batem com a spec | 8 gaps (2 P1: TRV-07, TRV-10) | 2 edge cases sem evidência
**Sensor**: 28/30 mutações mortas (A5 TRV-10 e A6 THM-02 sobreviveram)
**Gate**: 2694 unit passaram; smokes 39/39

**What works**: gramática e catálogo dos módulos, sorteio por seed com as regras de vizinho, primeiro e largura,
composição da área, estado `traverse` e saída na run, konbini e `noshop`, alcance de 900 px (unit e vivo), modo sala,
`fxlab` e o runner legado; o selo, o crédito dos fragmentos e o objeto da mão são verificados ao vivo.

**Next steps**: rodar os Fix 1 e 2 (P1) e o Fix 3 (mata o A6); depois disso, dispatch de um Verifier novo.
