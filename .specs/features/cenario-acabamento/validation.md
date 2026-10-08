# Cenário: acabamento — Validation (rodada 3)

**Date**: 2026-10-08
**Spec**: `.specs/features/cenario-acabamento/spec.md`
**Diff range**: `2914ee4..HEAD` (`c7464f8..9f303d9`, 26 commits; consertos da rodada 2 em `28f8df6` (T24) e `9f303d9` (T25))
**Verifier**: sub-agente independente, rodada 3 de 3 (autor ≠ verificador)

**Veredito: PASS**: as duas lacunas da rodada 2 fecharam. O rótulo `CE` tem contorno lido do texto vivo e conferido
pelo smoke `hud`. A ordem decoração < atores agora vale contra player, inimigos vivos e terreno, e o N3a morre. Os 15
ACs e os 3 edge cases têm evidência `arquivo:linha`. O sensor matou os 5 mutantes (N3a, 2 do `CE`, 2 novos sobre a
T25). O gate passou. Fica uma observação fora do texto da CEN-05 (nome do chefe e combo sem contorno), anotada abaixo
como pendência que não bloqueia.

---

## Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1..T23 | ✅ Done | Validadas nas rodadas 1 e 2 |
| T24 | ✅ Done | `28f8df6`: `LABEL_STYLE = { ...HUD_TEXT_STYLE }`, `hud.ceOutline` lido do texto vivo, smoke `hud` confere |
| T25 | ✅ Done | `9f303d9`: `layout.terrainDepth` e `layout.enemyMinDepth` lidos dos objetos vivos; smoke exige `decorDepth < min(player, inimigos, terreno)` |

---

## Lacunas da rodada 2

| # | Lacuna | Conserto | Evidência | Fechou? |
| --- | --- | --- | --- | --- |
| 1 | CEN-05: rótulo `CE` sem contorno e fora do snapshot | T24 | `src/game/EnergyHud.ts:49` - `LABEL_STYLE = { ...HUD_TEXT_STYLE }` (contorno `k` de 3 px, `src/game/Hud.ts:34-35`); `:77-78` guarda o texto vivo; `:218` - `ceOutline: { stroke: String(this.ceLabel.style.stroke), thickness: this.ceLabel.style.strokeThickness }`; `scripts/smoke/hud.smoke.mjs:26-27` - para `{ ...snap.hud.outlines, ce: snap.hud.ceOutline }`, `o.stroke === '#0b0d1a' && o.thickness === 3` | ✅ CE0 e CE1 mortos |
| 2 | CEN-13: N3a (`DECOR_DEPTH = 0.5`) sobrevivia | T25 | `src/scenes/test/snapshot.ts:36` - `enemyMinDepth: Math.min(...this.s.enemies.map((e) => e.fxSprite.depth))` (`fxSprite` = `anim.view`, `src/game/Enemy.ts:191-193`); `src/scenes/test/world.ts:191` - `terrainDepth: this.tiles[0]?.depth`; `scripts/smoke/world-scenery.smoke.mjs:47-54` - `enemyMinDepth !== null && terrainDepth !== null` e `nearDepth < decorDepth && decorDepth < Math.min(playerDepth, enemyMinDepth, terrainDepth)` | ✅ N3a, N7 e N8 mortos |

---

## Spec-Anchored Acceptance Criteria

Os arquivos de teste unitário citados não mudaram desde `d91e1b8` (T24/T25 só tocam `hud.smoke`, `world-scenery.smoke`,
`EnergyHud`, `debugApi`, `snapshot`, `world` e `debugApi.test`). As linhas foram conferidas de novo nesta rodada.

| AC | Resultado definido na spec | `arquivo:linha` + asserção | Result |
| --- | --- | --- | --- |
| CEN-01 | Toda janela 32x32 de 76 px acima a 20 px abaixo do chão da próxima com ≥ 3 cores, todo tema | `tests/game/art/sceneryThemes.test.ts:27-30` - `windowColorCounts(sink, X0, X1, NEAR_GROUND - 76, NEAR_GROUND + 20).filter((w) => w.colors < 3)` → `toEqual([])` | ✅ PASS |
| CEN-02 | Pilar de 20 px centrado em cada fronteira da próxima | `tests/game/art/scenerySeams.test.ts:11-25` - `sink.at(seam - 10, y)` e `sink.at(seam + 8, y)` = `PALETTE.K`, miolo `PALETTE.E` | ✅ PASS |
| CEN-03 | Coluna 0 acima do chão usa `terrain` em todo tema | `tests/game/art/tiles.test.ts:84-87` - `terrainSheetFor(0, 14, spans)` → `TEX.terrain`; `(0, 15)` e `(1, 14)` → `TEX.terrainParque` | ✅ PASS |
| CEN-04 | Nenhuma linha da folha `rua` só de `a`/`A` | `tests/game/art/tiles.test.ts:94` - `expect(/^[aA]+$/.test(row)).toBe(false)` | ✅ PASS |
| CEN-05 | Textos do HUD (rótulos, fragmentos, item, rodada, restantes) com contorno `PALETTE.k` de 3 px | `scripts/smoke/hud.smoke.mjs:26-27` - `o.stroke === '#0b0d1a' && o.thickness === 3` para `hp`, `ce`, `fragments`, `heldItem`, `round`, `remaining`, todos lidos de `t.style` do texto vivo (`src/game/Hud.ts` `outlineOf`; `src/game/EnergyHud.ts:218`); `tests/game/hudText.test.ts:10-11` (constantes) | ✅ PASS (os dois rótulos, `HP` e `CE`, cobertos; ver observação 1) |
| CEN-06 | Uma faixa próxima por módulo com `wall`/`top` do tema | `scripts/smoke/world-traverse.smoke.mjs:57-59` - `JSON.stringify(s.area.bands) === JSON.stringify(expected.map((e) => e.band))`; `world-scenery.smoke.mjs:58` - `area.bands.length === 3` | ✅ PASS |
| CEN-07 | Média pinta cada trecho com o pintor do tema dele | `tests/game/art/scenerySeams.test.ts:42-60` - por faixa, `expect(got, band.theme).toEqual(want)` com 3 temas | ✅ PASS |
| CEN-08 | Médias de `rua`, `beco`, `parque`, `konbini` distintas | `tests/game/art/sceneryThemes.test.ts:52-56` - `new Set(rasters).size` = `rasters.length` | ✅ PASS |
| CEN-09 | Janela 32x32 pintada entre 60 e 20 px acima do chão da média com ≥ 2 cores | `tests/game/art/sceneryThemes.test.ts:39-45` - fileiras `[MID_GROUND - 60, MID_GROUND - 52]`, `.filter((w) => w.colors < 2)` → `toEqual([])` | ✅ PASS |
| CEN-10 | Uma `midBands` por módulo com o tema | `scripts/smoke/world-scenery.smoke.mjs:59-62`; `world-traverse.smoke.mjs:62-64` - `JSON.stringify(s.area.midBands) === JSON.stringify(expected.map((e) => ({ theme: e.id })))` | ✅ PASS |
| CEN-11 | Primeiro plano com rolagem 1,15 × 1 | `scripts/smoke/world-scenery.smoke.mjs:35-38` - `area.front.sx === 1.15 && area.front.sy === 1` (lido do objeto) | ✅ PASS |
| CEN-12 | Primeiro plano só em y ≥ 480 | `tests/game/art/sceneryFront.test.ts:10-13` - `sink.topY()` `toBeGreaterThanOrEqual(FLOOR_TOP)`, 5 temas | ✅ PASS |
| CEN-13 | ≥ 1 decoração por módulo, atrás dos atores, na frente da próxima | `scripts/smoke/world-scenery.smoke.mjs:40-43` - `decorPerModule.every((n) => n >= 1)`; `:47-54` - `nearDepth < decorDepth && decorDepth < Math.min(playerDepth, enemyMinDepth, terrainDepth)`; `:55` - `decorFoot === 480` | ✅ PASS (N3a, N7, N8 mortos) |
| CEN-14 | Decoração não cria corpo Matter | `scripts/smoke/world-scenery.smoke.mjs:71-74` - `bare.staticBodies === area.staticBodies && bare.bodies === area.bodies` | ✅ PASS |
| CEN-15 | Mesma grade → mesmas posições | `tests/game/art/sceneryDecor.test.ts:29-31` - `decorSlots(AREA)` `toEqual(decorSlots(cópia))`; `world-scenery.smoke.mjs:66` - `again.decor === area.decor` | ✅ PASS |

**Status**: ✅ 15/15 ACs com evidência que bate com o resultado da spec; nenhuma lacuna de precisão da spec que bloqueie.

---

## Edge Cases

- [x] Sala (`area=sala`) sem primeiro plano nem decoração: `scripts/smoke/world-scenery.smoke.mjs:78` - `room.mode === 'sala' && room.front === null && room.decor === 0`.
- [x] Um módulo só, sem pilar (próxima e média): `tests/game/art/scenerySeams.test.ts:29-36` - `expect([...viaBands.texels]).toEqual([...direct.texels])` para `near` e `mid`; `tests/game/art/sceneryLayers.test.ts:30` - `seams(...)` = `[]`.
- [x] Tema sem pintor de decoração não pinta e não lança: `tests/game/art/sceneryDecor.test.ts:60-63` - `paintDecor(..., 'santuario', ...)` = `false`, `sink.texels.size` = 0.

---

## Discrimination Sensor

Worktree temporário `scratchpad/wt3` (HEAD `9f303d9`, `node_modules` por junção). Cada mutante foi ligado no código do
worktree por `?mut=<id>` e rodou o smoke original (`hud` ou `world-scenery`, com as asserções intactas) por um
invólucro que só acrescenta o parâmetro à URL. Foi **uma** execução de `node scripts/smoke/run.mjs vmut`, com as linhas
de base (`mut=none`, mesmo build) verdes: `ok vmut-base-hud`, `ok vmut-base-scenery`.

| # | Arquivo:linha | Mutação | Killed? |
| --- | --- | --- | --- |
| N3a | `src/scenes/test/world.ts:210` | `DECOR_DEPTH = 0.5` (na frente dos inimigos e do terreno, atrás do player) | ✅ smoke: `decorDepth 0.5`, `enemyMinDepth 0`, `terrainDepth 0` |
| CE0 | `src/game/EnergyHud.ts:77` | rótulo `CE` criado com `strokeThickness: 0` | ✅ smoke `hud`: `contorno do texto ce: {"stroke":"#0b0d1a","thickness":0}` |
| CE1 | `src/game/EnergyHud.ts:77` | rótulo `CE` com contorno de cor errada (`#ffffff`, 3 px) | ✅ smoke `hud`: `contorno do texto ce: {"stroke":"#ffffff","thickness":3}` |
| N7 | `src/game/enemy/EnemyAnimator.ts:116` | inimigo parado com profundidade -12 (atrás da decoração). Prova que `enemyMinDepth` vem do sprite vivo | ✅ smoke: `enemyMinDepth -12` |
| N8 | `src/scenes/test/world.ts:246-253` | tiles do terreno com profundidade -12 (decoração por cima do chão). Prova que `terrainDepth` vem do tile vivo | ✅ smoke: `terrainDepth -12` |

**Sensor depth**: lightweight (5 mutações: N3a repetida, 4 novas sobre T24/T25).
**Result**: 5/5 mortos. ✅ PASS

Isolamento: `git status --porcelain` da árvore real antes e depois é idêntico (`diff` vazio): `M .specs/LESSONS.md`,
`M .specs/lessons.json`, `?? .specs/features/cenario-acabamento/validation.md`, `?? SKILL.md`. Junção removida antes
de `git worktree remove --force`. `git worktree list` não mostra mais o `wt3`. Smoke: 1 execução de 3 permitidas.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ |
| Surgical changes | ✅ T24 troca o estilo do rótulo e expõe um campo; T25 só expõe dois campos e endurece a asserção |
| No scope creep | ✅ |
| Matches patterns | ✅ contornos e profundidades lidos de objetos vivos, como `outlines` e `playerDepth` |
| Spec-anchored outcome check | ✅ |
| Per-layer Coverage Expectation | ✅ |
| Every test maps to a requirement | ✅ |
| Guidelines (`CLAUDE.md`, `.oxlintrc.json`) | ✅ `EnergyHud.ts` 235, `world.ts` 331, `snapshot.ts` 220 linhas (< 400); oxlint só com o aviso antigo de `debugSnapshot` (149 linhas, já na lista de exceções, sem crescer nesta rodada) |

`EnergyHud.ts` passa a importar `HUD_TEXT_STYLE` de `Hud.ts`, que não importa `EnergyHud`, então não cria ciclo.

---

## Gate Check

- **Gate command**: `npm run gate` (árvore real)
- **Result**: exit 0. Typecheck ok, oxlint só com avisos, prettier ok, 133 arquivos / 2788 testes passando, 0 falhas, 0 pulados.
- **Test count before feature**: 2732 (`2914ee4`)
- **Test count after feature**: 2788
- **Delta**: +56 (T24/T25 só mudam smoke e o esperado de `debugApi.test`, sem teste novo)
- **Smoke**: `hud` e `world-scenery` verdes como linha de base no worktree.

---

## Observações que não bloqueiam (fora do texto dos ACs)

1. **Outros textos do HUD sem contorno.** A varredura de `add.text(` em `src/game/` e `src/scenes/` encontrou:
   - `src/game/Hud.ts:59,176`: o nome do chefe (`BOSS_BAR_NAME_STYLE`, creme `PALETTE.w`, 13 px, **sem contorno nem
     fundo**) aparece no topo central, sobre o mundo, na arena do chefe, o mesmo lugar do defeito original. Não está na
     lista fechada da CEN-05 ("rótulos, fragmentos, item, rodada, restantes"): é um nome, não um rótulo como `HP`/`CE`.
     Mesmo assim fere o objetivo da spec ("texto do HUD legível sobre qualquer fundo"). Risco alto de repetir o defeito.
   - `src/game/Hud.ts:44-50,199,203`: o contador de combo e a nota (22/34 px, negrito, coloridos) também ficam sem
     contorno. Fora da lista. Risco menor, porque o texto é grande e colorido.
   - Os demais estão cobertos ou não são HUD: as teclas `L`/`I` (`src/game/EnergyHud.ts:110`) e os painéis
     (`bannerText`/`centerText`/controles) têm fundo escuro próprio; `FloatTexts`, `Callout` e `KokusenFx` são efeitos
     no mundo, não HUD; o `ShopPanel` desenha sobre um painel próprio.
   - **Sugestão**: em tarefa à parte, pôr `...OUTLINE` em `BOSS_BAR_NAME_STYLE` (e, se o usuário quiser, nos estilos de
     combo) e incluir `bossName` em `hud.outlines`.
2. `terrainDepth` lê só `tiles[0]`. Todos os tiles são criados no mesmo laço com a mesma profundidade, e o N8 (todos os
   tiles atrás) morre. Uma regressão que afete só uma parte dos tiles passaria. Risco baixo.

---

## Fix Plans

Nenhuma correção obrigatória. Pendência opcional: observação 1 (nome do chefe).

---

## Requirement Traceability Update

| Requirement | Previous | New |
| --- | --- | --- |
| CEN-01..15 | Implementing (CEN-05 Needs Fix, CEN-13 com folga na rodada 2) | ✅ Verified |

(O Verifier não edita `spec.md`. A tabela é para o orquestrador aplicar.)

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 15/15 ACs batem com o resultado da spec; 3/3 edge cases com evidência
**Sensor**: 5/5 mortos (N3a, CE0, CE1, N7, N8)
**Gate**: 2788 passed, 0 failed

**What works**: o rótulo `CE` tem contorno `#0b0d1a`/3 px, lido do texto vivo. A decoração fica entre a camada próxima
e todos os atores e o terreno, e o snapshot lê as profundidades de objetos vivos (N7/N8 provam isso). As lacunas das
rodadas 1 e 2 continuam fechadas.

**Next steps**: aplicar a rastreabilidade em `spec.md`. Decidir com o usuário se o nome do chefe (observação 1) ganha
contorno numa tarefa à parte.
