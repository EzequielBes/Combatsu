# Arena do santuário — Validation

**Date**: 2026-10-08
**Spec**: `.specs/features/arena-do-santuario/spec.md` (ARN-01..ARN-12 e 3 casos de borda)
**Diff range**: `e658c64..HEAD` (`c350834`), branch `feat/arena-do-santuario`, 12 commits, 32 arquivos (+1172/−166)
**Verifier**: sub-agente independente (autor ≠ verificador). A árvore real não foi editada; todo mutante rodou num worktree temporário (`git worktree add … HEAD`), já removido.

## Validation

**Result**: FAIL

Em uma linha: a implementação faz o que a spec pede, e nenhum defeito de comportamento apareceu. O gate passa, e os smokes `world-boss` (em `hd=0` e em `hd=1`) e `world-traverse` passam. Mas 6 mutantes não equivalentes sobrevivem: dois em adaptadores (L-043, confirmada), contagem de `p` (ARN-12), arquétipo da Tecelã nunca lido no jogo vivo (ARN-05) e posição/altura do selo da esquerda (ARN-07). Pelo `validate.md` §5, todo mutante sobrevivente vira tarefa de correção. As correções mexem só em testes.

---

## Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1 | ✅ Done | `7aa6512` |
| T2 | ✅ Done | `434cc09` |
| T10 | ✅ Done | `d33f321`. Correção conferida: o modelo de câmera do Phaser (`(x − f·scrollX − cx)·zoom + cx`, `centerOn` ⇒ `scrollX = X − cx`) exige a meia largura do canvas, então 320 estava errado. Os dois testes reescritos passaram a derivar o valor de `toLayerX`, sem enfraquecer: o mutante U7/U8 (voltar a 320) morre |
| T3 | ✅ Done | `255e7eb` + `38bce4a` (ajuste visual) |
| T4 | ✅ Done | `14031ea`. O caso de borda do "tema sem peça" agora usa um tema que não existe (`sceneryDecor.test.ts:64`); continua válido |
| T5 | ✅ Done | `414d576` |
| T6+T7 | ✅ Done | Um commit só (`a37dc9c`), declarado em tasks.md. Aceitável: os dois moram no mesmo arquivo novo `src/scenes/test/arena.ts` |
| T8 | ✅ Done | `abe6208`. 48 colunas = `MODULE_MAX_COLS` (`src/core/module.ts:14`). A spec foi ajustada de 52 para 48 com justificativa na tabela de premissas. A decisão bate com o código |
| T9 | ✅ Done | `c350834` (ferramenta, sem teste) |
| extra | ✅ | `5f8393a` `tests/core/lightning.test.ts`: o predicado continua o mesmo (`isInteger(dx) && isInteger(dy) && dx%2===0 && dy%2===0`), agora juntado num array `bad` e conferido uma vez com `expect(bad).toEqual([])`, mais a guarda `checked > SEEDS.length` contra laço vazio. Não enfraquece o teste |

---

## Spec-Anchored Acceptance Criteria

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| ARN-01 | Todo trecho `santuario` ⇒ céu do Véu na distante | `tests/game/art/sceneryFar.test.ts:11` `expect(farPainterFor([{theme:'santuario'}])).toBe(THEME_SCENERY.santuario.far)` | ⚠️ PASS no pintor puro; a chamada do adaptador (`background.ts:57`) não tem teste (mutante U15 sobrevive) |
| ARN-02 | Nenhum texel `a`/`A` no céu do Véu | `sceneryFar.test.ts:33-34` `expect(colors.has(PALETTE.a)).toBe(false)` / `PALETTE.A` | ✅ PASS |
| ARN-03 | Média do santuário ≠ escola; ≥ 2 cores em toda janela pintada de 32x32 de 60 a 20 px acima do chão | `sceneryThemes.test.ts:53-59` (MID_THEMES inclui `santuario`; duas fileiras cobrem os 40 px) `expect(flat).toEqual([])`; `:73` `expect(new Set(rasters).size).toBe(rasters.length)` com `schoolMid` no conjunto | ✅ PASS (só com `variant: null`; as variantes só acrescentam traço) |
| ARN-04 | `oni` ≠ `tecela` | `sceneryThemes.test.ts:90` `expect(new Set([draw('oni'), draw('tecela'), draw(null)]).size).toBe(3)` | ✅ PASS |
| ARN-05 | O arquétipo do chefe da rodada chega ao fundo; `area.arenaVariant` | `scripts/smoke/world-boss.smoke.mjs:42` `s.area.arenaVariant === 'oni'` (rodada 5); `world-traverse.smoke.mjs:54` `=== null` | ⚠️ PARCIAL: só o Oni é lido no jogo vivo (o mutante "chefe sempre oni" sobrevive). O snapshot lê `WorldBuilder.variant`, não o que `buildBackground` recebeu (U16 sobrevive) |
| ARN-06 | Santuário tem decoração e primeiro plano | `sceneryDecor.test.ts:50` (it.each com `santuario`); `sceneryFront.test.ts:16` `expect(sink.texels.size).toBeGreaterThan(0)` | ✅ PASS |
| ARN-07 | Coluna 0, linhas 0 a 14, frame `seal` com o selo fechado | `world-boss.smoke.mjs:49-51` `leftSeal.frame === 'seal' && leftSeal.alpha === 1` | ⚠️ Spec-precision gap: o frame é conferido, mas coluna e linhas não (leftSealPos e leftSealH sobrevivem) |
| ARN-08 | Selo da esquerda some em `AREA.sealBurnMs` como o da direita | `world-boss.smoke.mjs:111` `burn.left === null && burn.right === null`; `:112-114` pares `|l − r| < 0.15` | ✅ PASS |
| ARN-09 | Fases 2/3: `PALETTE.r`, alpha 0,18, profundidade −7, presa à câmera | `world-boss.smoke.mjs:55-57` `depth === -7 && color === 0xb3314f && scroll === 0`; `:74` `Math.abs(alpha − 0.18) < 1e-9` com `phase >= 2` | ✅ PASS (a fase 3 também é exercitada: o mutante `=== 2` morre na fase 3) |
| ARN-10 | Fase 1: alpha 0 | `world-boss.smoke.mjs:59-61` `s.boss.phase === 1 && s.area.veil.alpha === 0` | ✅ PASS |
| ARN-11 | Vitória: alpha 0 em até 600 ms | `world-boss.smoke.mjs:82` `veilAtDeath > 0`; `:83-85` `alpha === 0` depois de `step(650)` | ✅ PASS (folga de 50 ms, cerca de 3 quadros; um fade de 1200 ms morre) |
| ARN-12 | 48 colunas, `E` perto das duas bordas, dois `p` | `tests/data/modules.test.ts:26` `row.length === width` (48); `:44/:48` `E` a até 4 colunas de cada borda | ⚠️ PARCIAL: os "dois `p`" não são conferidos (com 1 ou 3 `p` o teste continua passando) |

**Status**: ❌ Lacunas presentes: 8/12 inteiramente cobertos; ARN-01, ARN-05 e ARN-12 parciais; ARN-07 com lacuna de precisão.

---

## Edge Cases

- [x] Mistura de `santuario` com outro tema ⇒ escola: `sceneryFar.test.ts:15` `farPainterFor([{santuario},{rua}])).toBe(schoolFar)`. Mata U1 (ignorar o `every`) e U2 (`some`).
- [x] Área comum ⇒ `arenaVariant` null, sem selo da esquerda e sem véu: `world-traverse.smoke.mjs:54-58`. Mata `variantOniAll` e `veilInCommon`.
- [ ] Chefe morre na fase 1 ⇒ véu fica em 0: **sem evidência**. O código garante isso pela estrutura (`arena.ts`: `Math.max(0, alpha − …)` partindo de 0), mas nenhum teste exercita o caso.

---

## Discrimination Sensor

Worktree temporário em `%TEMP%/claude/arn-wt` (node_modules via junção). Unitários: `npx vitest run <arquivos>`. Smokes: uma execução só de um harness (cópia de `run.mjs`) que roda `world-boss` e `world-traverse` com `&mut=<id>`. Os mutantes do adaptador ficam ligados por `debugParam('mut')` em `arena.ts` e `areaDirector.ts`. As linhas de base passaram: `world-boss` em hd=0, `world-boss` em hd=1 e `world-traverse`.

| # | Arquivo | Mutação | Resultado |
| --- | --- | --- | --- |
| U1 | `scenery/index.ts:40` | `farPainterFor` ignora "todo trecho" | ✅ Morto |
| U2 | idem | `some(santuario)` no lugar de `every` | ✅ Morto |
| U3/U3b | `santuarioSky.ts` | uma janela `a` / um texel `A` | ✅ Morto |
| U4 | `santuarioMid.ts:151-152` | ignora `variant` | ✅ Morto |
| U4b | idem | Tecelã sem os fios | ✅ Morto |
| U4c | idem | Tecelã pinta como Oni | ✅ Morto |
| U5 | `santuario.ts` | média = `schoolMid` | ✅ Morto |
| U6 | `santuarioMid.ts:147` | sem arbustos (janela chapada) | ✅ Morto |
| U7 | `layers.ts:32` | `toLayerX` volta a 320 | ✅ Morto |
| U8 | `layers.ts:24` | `CANVAS_CX = 320` | ✅ Morto |
| U9/U10 | `decorArt.ts`/`frontArt.ts` | santuário sem decoração / sem primeiro plano | ✅ Morto |
| U11 | `data/modules/santuario.ts` | 40 colunas | ✅ Morto |
| U13 | idem | `E` da direita a 9 colunas da borda | ✅ Morto |
| **U12** | idem | um `p` só (mesma largura) | ❌ **Sobreviveu** |
| **U14** | idem | três `p` | ❌ **Sobreviveu** |
| **U15** | `background.ts:57` | distante sempre `schoolFar` (o adaptador ignora `farPainterFor`) | ❌ **Sobreviveu** (1062 testes de `tests/game` verdes; nenhum smoke lê a distante) |
| **U16** | `background.ts:60` | `variant: null` para a média/próxima | ❌ **Sobreviveu** (o snapshot lê o campo do `WorldBuilder`) |
| S1 | `areaDirector.ts:83` | sempre `null` | ✅ Morto (`world-boss`, ARN-05) |
| **S2** | idem | área de chefe sempre `'oni'` | ❌ **Sobreviveu** (só a rodada 5 é lida) |
| S3 | idem | `'oni'` em toda área | ✅ Morto (`world-traverse`) |
| S4 | `arena.ts:32` | véu e selo também fora da arena | ✅ Morto (`world-traverse`) |
| **S5** | `arena.ts:35` | selo da esquerda na coluna 3 | ❌ **Sobreviveu** |
| **S6** | idem | selo com metade da altura | ❌ **Sobreviveu** |
| S7 | `arena.ts:49` | selo da esquerda não queima | ✅ Morto (ARN-08) |
| S8 | idem | queima 3x mais devagar | ✅ Morto (pares fora de 0,15) |
| S9 | `arena.ts:39` | cor `PALETTE.R` | ✅ Morto |
| S10 | idem | `scrollFactor` 1 | ✅ Morto |
| S11 | idem | profundidade −5 | ✅ Morto |
| S12 | `arena.ts:70` | aceso na fase 1 | ✅ Morto |
| S13 | idem | só `=== 2` (apaga na fase 3) | ✅ Morto |
| S14 | idem | alpha 0,25 | ✅ Morto |
| S15 | `arena.ts:73` | sem fade na vitória | ✅ Morto |
| S16 | idem | fade em 1200 ms | ✅ Morto |

**Sensor depth**: expandido (36 mutações), por causa dos adaptadores.
**Result**: 30/36 mortos, 6 sobreviventes ⇒ FAIL.
**Isolamento**: `git status --porcelain` da árvore real antes e depois = `?? SKILL.md` (igual); worktree removido.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code / surgical | ✅ (`ArenaDressing` isolado em arquivo novo de 97 linhas; `paintFar` movido sem mudar o comportamento para `school.ts`) |
| No scope creep | ✅ (a correção do T10 é defeito herdado, documentado como tarefa) |
| Matches patterns | ✅ (snapshot lê do objeto vivo, como pede a L-043, para selo e véu) |
| Lint | ✅ Nenhum aviso novo em arquivo do diff (`snapshot.ts:54` já existia, `debugSnapshot` cresceu 3 linhas); `.oxlintrc.json` intocado |
| Spec-anchored outcome check | ⚠️ ARN-07 (coluna/linhas) e ARN-12 (dois `p`) sem o valor da spec |
| Per-layer coverage (L-043 adaptador) | ❌ U15/U16: o encaminhamento ao motor não é testado |
| Testes mapeiam a ACs | ✅ |
| Guidelines | `CLAUDE.md`, `.oxlintrc.json`, L-010/L-043/L-069..073 |
| HD é a base | ⚠️ As asserções ARN rodam em `hd=0` (o runner acrescenta `hd=0` ao `world-boss`). O Verifier rodou o mesmo smoke com `hd=1` e passou, mas a suíte não faz isso sozinha |

---

## Gate Check

- **Gate command**: `npm run gate` (árvore real, HEAD `c350834`)
- **Result**: exit 0; 134 arquivos, **2803 passed**, 0 failed, 0 skipped
- **Test count before feature**: 2788 (`e658c64`, tasks.md)
- **Test count after feature**: 2803 (+15)
- **Smokes** (no worktree em HEAD, antes de ligar mutantes): `world-boss` ok (hd=0), `world-boss` ok (hd=1), `world-traverse` ok

---

## Fix Plans

Só testes; nenhuma mudança em `src/`.

### Fix 1 (Major): o adaptador do fundo não tem teste (ARN-01, ARN-04/05; L-043)
- **Root cause**: `farPainterFor` e o pintor por `variant` são testados como funções puras; nada confere que `buildBackground` usa um e repassa o outro.
- **Fix task**: expor no snapshot o pintor/variante que o fundo recebeu (ex.: `layers[0].setData('far', 'veu'|'escola')` e `setData('variant', …)` lidos do objeto), e conferir em `world-boss` (`veu`, `oni`) e em `world-traverse` (`escola`, `null`). Uma alternativa é um teste unitário de `buildBackground` com cena falsa que grave as cores da camada 0.
- **Done when**: U15 e U16 morrem.

### Fix 2 (Major): a Tecelã nunca é lida no jogo vivo (ARN-05; L-069)
- **Fix task**: num smoke (ou num passo extra de `world-boss`), abrir `round=15&area=modular` e conferir `arenaVariant === 'tecela'`.
- **Done when**: S2 morre.

### Fix 3 (Minor): ARN-12 "dois `p`"
- **Fix task**: em `tests/data/modules.test.ts`, `expect(MODULES.santuario.grid.join('').split('p').length - 1).toBe(2)`.
- **Done when**: U12 e U14 morrem.

### Fix 4 (Minor): ARN-07 coluna 0, linhas 0 a 14
- **Fix task**: expor `x`, `y`, `width`, `height` (ou os limites) no `leftSealView` e conferir em `world-boss` `x === 16 && width === 32 && height === 15*32` (centro em `y = 240`).
- **Done when**: S5 e S6 morrem.

### Fix 5 (Minor): caso de borda "morre na fase 1"
- **Fix task**: teste unitário de `ArenaDressing.update` com cena falsa: `update(16, 1)`, depois `update(16, null)` repetido ⇒ alpha continua 0. Aproveitar o mesmo teste para a vitória vinda da fase 2 (0,18 ⇒ 0 em 600 ms exatos).

---

## Requirement Traceability Update

| Requirement | New Status |
| --- | --- |
| ARN-02, 03, 04, 06, 08, 09, 10, 11 | ✅ Verified |
| ARN-01, ARN-05 | ❌ Needs Fix (teste do adaptador) |
| ARN-07, ARN-12 | ❌ Needs Fix (precisão) |

---

## Summary

**Overall**: ❌ Not Ready (só lacunas de teste; o comportamento observado bate com a spec)
**Spec-anchored check**: 8/12 inteiros; 2 parciais por adaptador (ARN-01, 05), 2 com lacuna de precisão (ARN-07, 12); 1 caso de borda sem evidência
**Sensor**: 30/36 mortos
**Gate**: 2803 passed
**Decisões do autor**: confirmadas. A correção do T10 está certa e os testes reescritos discriminam; T6+T7 num commit só é aceitável; 48 colunas está no teto da gramática e a spec foi atualizada; a mudança do `lightning.test.ts` mantém o predicado.
