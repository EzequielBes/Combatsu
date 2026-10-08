# Arena do santuário — Validation

**Date**: 2026-10-08 (rodada 3, a última do laço)
**Spec**: `.specs/features/arena-do-santuario/spec.md` (ARN-01..ARN-12 e 3 casos de borda)
**Diff range**: `e658c64..HEAD` (`7ebc7e5`), branch `feat/arena-do-santuario`, 18 commits, 35 arquivos (+1729/−173). Os consertos da rodada 2 estão em `8521be4..7ebc7e5` (T14 `3b574e7`, T15 `2f4451b`, T16 `7ebc7e5`).
**Verifier**: sub-agente independente (autor ≠ verificador), rodada 3. A árvore real não foi editada (só este arquivo); todo mutante rodou num worktree temporário (`git worktree add --detach … HEAD`), já removido.

## Validation

**Result**: PASS

Em uma linha: os 4 sobreviventes da rodada 2 (N1..N4) agora morrem, os 4 rodaram de novo junto com S5/S6 e 3 mutantes novos sobre T14..T16, e os 9 morreram. Os 12 ACs e os 3 casos de borda têm evidência `arquivo:linha` que confere o valor da spec. Gate verde.

---

## Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1..T10 | ✅ Done | Conferidas na rodada 1 |
| T11..T13 | ✅ Done | Conferidas na rodada 2; as fraquezas apontadas (N1..N4) foram resolvidas por T14..T16 |
| T14 | ✅ Done | `3b574e7`. `tests/game/art/sceneryBuild.test.ts` monta o `buildBackground` real numa cena falsa (`FakeGraphics extends RasterSink`) e compara texel a texel as camadas 0 e 1 com `veilSky`, `santuarioMid` (`oni` e `tecela`) e `schoolFar` pintados direto. Mata N1, N2, M5 e M8 |
| T15 | ✅ Done | `2f4451b`. `leftSealView` (`src/scenes/test/arena.ts:103-106`) usa `displayWidth`/`displayHeight`. Mata N3 e M6; S5/S6 seguem mortos |
| T16 | ✅ Done | `7ebc7e5`. `tests/scenes/arena.test.ts:46-49` confere `alpha === 0` a cada passo. Mata N4 e M7 |

---

## Spec-Anchored Acceptance Criteria

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| ARN-01 | Todo trecho `santuario` ⇒ distante pintada pelo céu do Véu, não pela escola | `tests/game/art/sceneryBuild.test.ts:52` `expect([...far.texels]).toEqual([...direct(veilSky, 400, 'oni', false).texels])` (fundo montado de verdade); `tests/game/art/sceneryFar.test.ts:11` `expect(farPainterFor([{theme:'santuario'}])).toBe(THEME_SCENERY.santuario.far)`; `scripts/smoke/world-boss.smoke.mjs:44-45` `background.far === 'veil'` | ✅ PASS (N1 morto) |
| ARN-02 | Nenhum texel `a`/`A` no céu do Véu | `tests/game/art/sceneryFar.test.ts:33-34` `expect(colors.has(PALETTE.a)).toBe(false)` / `PALETTE.A` | ✅ PASS |
| ARN-03 | Média ≠ escola; ≥ 2 cores em toda janela 32x32 de 60 a 20 px acima do chão | `tests/game/art/sceneryThemes.test.ts:53-59` `expect(flat).toEqual([])` (com `santuario` em `MID_THEMES`, `:17`); `:73` `expect(new Set(rasters).size).toBe(rasters.length)` com a escola no conjunto | ✅ PASS |
| ARN-04 | `oni` ≠ `tecela` | `tests/game/art/sceneryThemes.test.ts:90` `expect(new Set([draw('oni'), draw('tecela'), draw(null)]).size).toBe(3)`; montado: `tests/game/art/sceneryBuild.test.ts:63` `expect(oni).not.toBe(tecela)` | ✅ PASS |
| ARN-05 | O arquétipo do chefe da rodada chega ao fundo; `area.arenaVariant` | `tests/game/art/sceneryBuild.test.ts:55-57` `it.each(['oni','tecela'])` `expect([...mid.texels]).toEqual([...direct(santuarioMid, 420, variant, true).texels])`; `scripts/smoke/world-boss.smoke.mjs:42` `arenaVariant === 'oni'`; `:147-148` `s.run.round === 15 && s.area.arenaVariant === 'tecela'`; `world-traverse.smoke.mjs:54-56` `null` | ✅ PASS (N2 morto) |
| ARN-06 | Santuário tem decoração e primeiro plano | `tests/game/art/sceneryDecor.test.ts:50` (`it.each` com `santuario`); `tests/game/art/sceneryFront.test.ts:16-19` `expect(sink.texels.size).toBeGreaterThan(0)` | ✅ PASS |
| ARN-07 | Coluna 0, linhas 0 a 14, frame `seal`, com o selo fechado | `scripts/smoke/world-boss.smoke.mjs:54-55` `leftSeal.frame === 'seal' && alpha === 1`; `:59-61` `ls.left === 0 && ls.width === TILE && ls.top === 0 && ls.height === 15 * TILE`, agora lido de `displayWidth`/`displayHeight` (`src/scenes/test/arena.ts:103-106`) | ✅ PASS (N3 e M6 mortos) |
| ARN-08 | Selo da esquerda some em `AREA.sealBurnMs` como o da direita | `scripts/smoke/world-boss.smoke.mjs:122` `burn.left === null && burn.right === null`; `:123-124` pares `|l − r| < 0.15` | ✅ PASS |
| ARN-09 | Fases 2/3: `PALETTE.r`, alpha 0,18, profundidade −7, presa à câmera | `scripts/smoke/world-boss.smoke.mjs:66-67` `depth === -7 && color === RED && scroll === 0`; `:85` `Math.abs(alpha − 0.18) < 1e-9`; `tests/scenes/arena.test.ts:55-58` `toBe(VEIL_ALPHA)`, `expect(VEIL_ALPHA).toBe(0.18)`, fase 3 `toBe(0.18)` | ✅ PASS |
| ARN-10 | Fase 1: alpha 0 | `tests/scenes/arena.test.ts:37-39` `expect(veil.alpha).toBe(0)`; `scripts/smoke/world-boss.smoke.mjs:70-71` `s.boss.phase === 1 && s.area.veil.alpha === 0` | ✅ PASS |
| ARN-11 | Vitória: alpha 0 em até 600 ms | `tests/scenes/arena.test.ts:64-70` `expect(VEIL_FADE_MS).toBe(600)`, `toBeCloseTo(0.09, 9)` aos 300 ms, `> 0` aos 599, `toBeCloseTo(0, 9)` aos 600; `scripts/smoke/world-boss.smoke.mjs:93-95` `veilAtDeath > 0` e `alpha === 0` depois de `step(650)` | ✅ PASS |
| ARN-12 | 48 colunas, `E` perto das duas bordas, dois `p` | `tests/data/modules.test.ts:10,26` `['santuario', 48, …]` + `row.length === width`; `:51-58` `E` a até 4 colunas de cada borda; `:43` `expect(slots).toBe(2)` | ✅ PASS |

**Status**: ✅ 12/12 ACs com evidência `arquivo:linha` e asserção no valor da spec; nenhuma lacuna de precisão.

---

## Edge Cases

- [x] Mistura de `santuario` com outro tema ⇒ escola: `tests/game/art/sceneryFar.test.ts:15` `expect(farPainterFor([{santuario},{rua}])).toBe(schoolFar)`; montado, área sem santuário ⇒ escola: `tests/game/art/sceneryBuild.test.ts:68` `toEqual([...direct(schoolFar, 400, null, false).texels])`.
- [x] Área comum ⇒ `arenaVariant` null, sem selo da esquerda e sem véu: `scripts/smoke/world-traverse.smoke.mjs:54-61` (`arenaVariant === null`, `background.far === 'school' && variant === null`, `leftSeal`/`veil` nulos); `tests/scenes/arena.test.ts:77` `expect(arena.veilView).toBeNull()`.
- [x] Chefe morre na fase 1 ⇒ véu **fica** em 0: `tests/scenes/arena.test.ts:46-49` `for (…1000 ms) { arena.update(16, null); expect(veil.alpha).toBe(0); }` (N4 e M7 mortos).

---

## Discrimination Sensor

Worktree temporário em `%TEMP%/claude/arn-wt3` (`node_modules` por junção, desfeita antes do `worktree remove`). Unitários: um script de rascunho aplica o mutante no worktree, roda `npx vitest run <pastas>` e restaura o arquivo. Smokes: **uma** execução de um harness (cópia de `run.mjs`) que roda `world-boss` e `world-traverse` para cada valor de `&mut=` (lido de `URLSearchParams` no `arena.ts` do worktree). A linha de base (`mut=none`) passou nos dois smokes, e os 37 testes de `sceneryBuild`/`arena`/`sceneryFar`/`sceneryThemes` passaram sem mutante.

| # | Arquivo | Mutação | Teste que pega | Resultado |
| --- | --- | --- | --- | --- |
| N1 | `src/game/art/background.ts:58` | pinta a distante com `schoolFar`, mas rotula com o `far` escolhido | `sceneryBuild.test.ts:52` (raster ≠ `veilSky`) | ✅ Morto |
| N2 | `src/game/art/background.ts:88` | dentro de `paintBands`, os pintores recebem `variant` nulo (a função ainda devolve o parâmetro) | `sceneryBuild.test.ts:57` (`oni` e `tecela`) e `:63` | ✅ Morto |
| N3 | `src/scenes/test/arena.ts:35` | `leftSeal.setScale(1, 0.5)` | `world-boss`: `{"left":0,"top":120,"width":32,"height":240}` | ✅ Morto |
| N4 | `src/scenes/test/arena.ts:73` | chefe some com o véu em 0: acende 0,18 uma vez e depois desce | `arena.test.ts:48` `expected 0.18 to be +0` | ✅ Morto |
| S5 | `src/scenes/test/arena.ts:35` | selo da esquerda na coluna 3 (re-checagem do Done when da T15) | `world-boss`: `left: 96` | ✅ Morto |
| S6 | idem | selo com metade da altura (re-checagem) | `world-boss`: `height: 240` | ✅ Morto |
| **M5** (novo, T14) | `src/game/art/background.ts:62` | troca as camadas: média pintada na próxima e vice-versa (`layers[3 - layer]`) | `sceneryBuild.test.ts:57`, `:63` | ✅ Morto |
| **M6** (novo, T15) | `src/scenes/test/arena.ts:35` | `leftSeal.setOrigin(0, 0)` sem mover: o selo sai meia coluna e meia altura do lugar | `world-boss`: `{"left":16,"top":240,…}` | ✅ Morto |
| **M7** (novo, T16) | `src/scenes/test/arena.ts:73` | morte na fase 1: o véu pisca 0,18 entre 800 e 820 ms depois (flash tardio, não o primeiro quadro) | `arena.test.ts:48` `expected 0.18 to be +0` | ✅ Morto |
| **M8** (novo, T14) | `src/game/art/background.ts:58` | a distante começa em x 0 em vez de −128 (o rótulo `veil` continua certo) | `sceneryBuild.test.ts:52` e `:68` | ✅ Morto |

**Sensor depth**: expandido (6 re-injetados + 4 novos = 10; contados à parte, N1..N4 + 3 novos pedidos), por ser adaptador (L-043).
**Result**: 10/10 mortos.
**Isolamento**: `git status --porcelain` da árvore real antes e depois = ` M .specs/LESSONS.md`, ` M .specs/features/arena-do-santuario/validation.md`, ` M .specs/lessons.json`, `?? SKILL.md` (igual, conferido com `diff`, antes de reescrever este arquivo); worktree removido e `git worktree prune` feito; `node_modules` da árvore real intacto.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code / surgical | ✅ T14 e T16 só mexem em testes; T15 troca 4 leituras no getter de debug |
| No scope creep | ✅ |
| Matches patterns | ✅ T14 reaproveita o `RasterSink`; a L-043 (ler o objeto vivo) agora vale para o fundo e o selo |
| Lint / tetos | ✅ `npm run gate` verde; `.oxlintrc.json` intocado na faixa; os avisos são de arquivos já na lista de exceções (`snapshot.ts` +4 linhas na feature, já listado) |
| Spec-anchored outcome check | ✅ |
| Per-layer coverage (adaptador) | ✅ fundo conferido pela pintura; selo pela medida exibida; véu quadro a quadro |
| Testes mapeiam a ACs | ✅ `sceneryBuild.test.ts` → ARN-01/04/05; `arena.test.ts` → ARN-09..11 e caso de borda |
| Guidelines | `CLAUDE.md`, `.oxlintrc.json`, L-043, L-074, L-075 |
| HD é a base | ✅ `world-boss` pede `hd=1` |

Ressalva menor, sem efeito no veredito: o comentário de `src/game/art/background.ts:79-80` ainda diz que `paintBands` devolve "a variante que os pintores receberam"; ela devolve o parâmetro. Com a T14 o comportamento é provado pela pintura, então é só texto.

---

## Gate Check

- **Gate command**: `npm run gate` (árvore real, HEAD `7ebc7e5`)
- **Result**: exit 0; 136 arquivos, **2814 passed**, 0 failed, 0 skipped
- **Test count before feature**: 2788 (`e658c64`)
- **Test count after feature**: 2814 (+26; +5 desde a rodada 2, todos em `sceneryBuild.test.ts`)
- **Smokes** (worktree em HEAD, `mut=none`): `world-boss` ok (hd=1), `world-traverse` ok. O `boss` e o resto do `world-` não rodaram nesta rodada (teto de 2 execuções de smoke; T14..T16 não tocam neles)

---

## Fix Plans

Nenhum.

---

## Requirement Traceability Update

| Requirement | New Status |
| --- | --- |
| ARN-01..ARN-12 | ✅ Verified |

(A tabela de `spec.md` ainda diz "Implementing"; atualizar ao fechar a feature.)

---

## Summary

**Overall**: ✅ Ready (rodada 3 de 3)
**Spec-anchored check**: 12/12 ACs e 3/3 casos de borda com evidência no valor da spec
**Sensor**: 10/10 mortos (N1..N4, S5, S6, M5..M8)
**Gate**: 2814 passed
**What works**: tudo o que a spec pede, agora com testes que leem o que foi desenhado: céu do Véu e santuário por variante conferidos texel a texel no fundo montado, selo medido como aparece na tela, véu apagado em todo quadro quando o chefe cai na fase 1.
**Pendências fora do sensor**: o critério de sucesso "o usuário luta contra o Oni e a Tecelã e aprova a arena" é UAT humano; smokes `boss` e `world-` completos não rodaram nesta rodada.
**Next steps**: atualizar a rastreabilidade em `spec.md`, rodar `npm run smoke -- boss` e `world-` antes do merge, e o UAT visual com o usuário.
