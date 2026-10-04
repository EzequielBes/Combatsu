# Impacto Amaldiçoado Validation

## Validation: impacto-amaldicoado - FAIL ❌

**Date**: 2026-10-04
**Spec**: `.specs/features/impacto-amaldicoado/spec.md`
**Diff range**: `a278eda..HEAD` (HEAD = `2aebf4c`, branch `feat/impacto-amaldicoado`, 45 arquivos, +3501/-144)
**Verifier**: independent sub-agent (author ≠ verifier), Sonnet 5.5

**Veredito**: FAIL. Dois ACs falham (POS-07 e POS-08: o passo à frente perde o último pedaço do startup) e seis ficam PARTIAL. Os 56 restantes passam. O núcleo puro e a arte são sólidos e o sensor matou 10/10 mutantes; o defeito mora num adaptador (`Player.ts`) que o smoke não discrimina.

**Contagem**: 56 PASS, 6 PARTIAL, 2 FAIL (64 ACs).

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 a T24 | ✅ Done | Todas marcadas `[x]` em `tasks.md`. |

---

## Spec-Anchored Acceptance Criteria

Convenção: teste unitário citado com `arquivo:linha` do `it(...)`; adaptador sem teste usa `file:line` do código, como permite a matriz do `tasks.md`. Todos os valores assertados batem com a spec, exceto onde indicado.

### TRL (rastro)

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| TRL-01 | ponto de golpe em todo `-wind`/`-hit` de MOVES + jab/kick | `tests/game/feelArt.test.ts:200` (todo frame exigido tem ponto), `:207` (sem ponto órfão) | ✅ PASS |
| TRL-02 | ponto é texel opaco | `tests/game/feelArt.test.ts:193` (describe STRIKE_POINTS, `isOpaque`) | ✅ PASS |
| TRL-03 | rastro nasce no `active`, de `-wind` a `-hit`, em mundo com posição e facing | `src/scenes/TestScene.ts:1462` (`trail([from,to])` na fase `active`); `tests/core/strikePath.test.ts:8,14` (facing ±1); smoke `scripts/smoke/impact.smoke.mjs:60` exige rastro ao abrir a hitbox | ✅ PASS |
| TRL-04 | leve 4 px, apaga em 140 ms | `tests/core/strikePath.test.ts:50` (`widthPx 4, fadeMs 140`); `src/game/CursedFx.ts:179` (tween com `fadeMs`); smoke `:73` | ✅ PASS |
| TRL-05 | forte 8 px, apaga em 220 ms | `tests/core/strikePath.test.ts:53`; smoke `:60` (`widthPx === 8`) | ✅ PASS |
| TRL-06 | só `d,c,C,u,U` | `tests/game/cursedFx.test.ts:7` (cores exatamente as cinco); `src/game/CursedFx.ts:16` | ✅ PASS |
| TRL-07 | chama no startup do forte com `c,C,U` | `src/scenes/TestScene.ts:1450-1457`; `src/game/CursedFx.ts:285` (`'c'/'C'/'U'`) | ✅ PASS |
| TRL-08 | chama para na saída do startup, no mesmo frame | `src/scenes/TestScene.ts:1459` (`stopFlame()` no `active`) | ✅ PASS |
| TRL-09 | hitstop congela fade | `src/scenes/TestScene.ts:1687` (`tweens.pauseAll()` no congelamento); `CursedFx.ts:179` usa tween e `time.addEvent` | ✅ PASS (código) |
| TRL-10 | `fx.trails` `{tier,widthPx,ageMs}` | `src/game/CursedFx.ts:136`; `src/scenes/TestScene.ts:1347`; smoke `:61` | ✅ PASS |

### IMP (impacto)

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| IMP-01 | `counter` dá `decisive` | `tests/core/impactTier.test.ts:10-14` (`toBe('decisive')`, inclui light+counter) | ✅ PASS |
| IMP-02 | `knockdown` dá `decisive` | `tests/core/impactTier.test.ts:16` | ✅ PASS |
| IMP-03 | `brokePosture` dá `decisive` | `tests/core/impactTier.test.ts:19` | ✅ PASS |
| IMP-04 | heavy sem decisivo dá `heavy` | `tests/core/impactTier.test.ts:22`; smoke `:88` | ✅ PASS |
| IMP-05 | light sem decisivo dá `light` | `tests/core/impactTier.test.ts:25`; smoke `:73` | ✅ PASS |
| IMP-06 | evento `impact:<tier>`, sem `Fx.spark` no corpo a corpo do jogador | `src/scenes/TestScene.ts:1388-1392` (ramo exclusivo), `:1419`; smoke `:75` (`count 'impact:light' === 1`) | ✅ PASS |
| IMP-07 | 6 estilhaços, cone ±35°, 180 ms | `src/data/feel.ts:15-17` + `tests/data/feel.test.ts:10`; `src/game/CursedFx.ts:301-318` | ✅ PASS |
| IMP-08 | anel 6 a 28 px em 160 ms com fade | `src/data/feel.ts:18-20`; `src/game/CursedFx.ts:325-374` | ✅ PASS |
| IMP-09 | 6 espinhos, 18 a 30 px | `tests/core/impactTier.test.ts:42` (200 seeds em [18,30]); `CursedFx.ts:327` usa `impactSpikes(seed, spikeCount)` | ✅ PASS |
| IMP-10 | mesma seed, mesma saída | `tests/core/impactTier.test.ts:31` | ✅ PASS |
| IMP-11 | postFX por exatamente 2 quadros renderizados e depois removido | `src/game/ImpactFrame.ts:7,60-65,68-70` (contagem em `POST_RENDER`); smoke `:118` só confere `applied` no snapshot; o smoke usa rasteira (knockdown), não Contra, e nada mede os 2 quadros | ⚠️ PARTIAL |
| IMP-12 | sem WebGL, pula o postFX e mantém anel/espinhos | `src/game/ImpactFrame.ts:19,46`; smoke `:118` (`impactFrame === !degraded`) | ✅ PASS |
| IMP-13 | Kokusen não leva `impactFrame` | `src/scenes/TestScene.ts:1416-1417` (`kokusenFrame === getFrame()`); nenhum teste cobre a ordem Kokusen/`onConnect` no mesmo quadro | ⚠️ PARTIAL |
| IMP-14 | no máximo 1 `impactFrame` por swing | `src/game/ImpactFrame.ts:44-46` (`lastSwingId`); sem teste unitário nem smoke de golpe multi-alvo | ⚠️ PARTIAL |
| IMP-15 | rachadura no pouso da derrubada, apaga em 1200 ms | `src/scenes/TestScene.ts:1497-1509`; `src/game/CursedFx.ts:245` (`crackMs`) | ✅ PASS (código) |
| IMP-16 | `fx.lastImpact = {tier, impactFrame}` | `src/scenes/TestScene.ts:1418`; smoke `:73-74,88,118`. Defeito leve: `impactFrame` fica `true` num acerto sem postFX se o anterior foi decisivo e ainda está aplicado (ver Fix 2) | ⚠️ PARTIAL |

### POS (poses e alcance)

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| POS-01 | ponto do `-hit` dentro da hitbox +4 px | `tests/game/feelArt.test.ts:194` (borda de 4 px nos dois lados), `:200` | ✅ PASS |
| POS-02 | um componente 8-conexo por frame | `tests/game/feelArt.test.ts:112,161,232`; `tests/core/frameInvariants.test.ts:33` (diagonal) | ✅ PASS |
| POS-03 | texel na última linha do `-hit` de chão | `tests/game/feelArt.test.ts:112,232`; `:242` exclui aéreos (conforme a spec) | ✅ PASS |
| POS-04 | cabeça ±1 coluna na sequência do pulo | `tests/game/feelArt.test.ts:162` (1 passa, 2 falha), `:168` | ✅ PASS |
| POS-05 | punho do gancho acima do topo do cabelo de `idle-0` | `tests/game/feelArt.test.ts:72` (nos dois lados da linha) | ✅ PASS |
| POS-06 | coxa ≥ 1 texel mais alta que a canela (3 frames) | `tests/game/feelArt.test.ts:134,143` (1 a mais passa, igual falha) | ✅ PASS |
| POS-07 | forte avança 10 px ao longo do `startupMs` | `tests/core/stepIn.test.ts:12` valida o core (soma 10). No jogo o passo vale 9,09 px: `src/game/Player.ts:1130` | ❌ FAIL |
| POS-08 | leve avança 4 px ao longo do `startupMs` | `tests/core/stepIn.test.ts:33` valida o core. Mesmo defeito: o `jab` (startup 60 ms) perde ~10 ms de 60 | ❌ FAIL |
| POS-09 | para no contato com inimigo ou parede | `tests/core/stepIn.test.ts:43`; `src/game/Player.ts:1140-1158` (`stepBlocked`) | ✅ PASS |
| POS-10 | ponto do gancho ≥ 6 texels à frente da origem | `tests/game/feelArt.test.ts:72` | ✅ PASS |

### RCT (reação do inimigo)

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| RCT-01 | heavy desliza 24 px em 180 ms | `tests/core/slide.test.ts:11,16`; smoke `:98` (`remainingPx <= 24`, inimigo se afasta) | ✅ PASS |
| RCT-02 | decisive desliza 48 px em 240 ms | `tests/core/slide.test.ts:31` | ✅ PASS |
| RCT-03 | resíduo `c` a cada 40 ms, apaga em 300 ms | `src/game/Enemy.ts:818-839`, `src/game/CursedFx.ts:249-256` (`'c'`, `residueFadeMs`) | ✅ PASS (código) |
| RCT-04 | esbarrão toca `body` sem perder HP nem postura | `src/game/Enemy.ts:810` (`touched()` só toca a reação, sem `takeDamage`/estrutura), `:840-844`; sem teste | ⚠️ PARTIAL |
| RCT-05 | parede para o deslize | `tests/core/slide.test.ts:60`; `src/game/Enemy.ts:818-828` | ✅ PASS |
| RCT-06 | `enemies[].slide = {remainingPx}` ou `null` | `tests/core/slide.test.ts:49`; smoke `:96-102` | ✅ PASS |
| RCT-07 | sem tint branco no golpe, cambaleio e armadura | `git diff` removeu os `setTintFill(PALETTE.w)`; `src/game/Enemy.ts:906` (comentário "sem pisca branco"); `:764` é só o pisca de compromisso (CMT-02, mantido pela spec) | ✅ PASS (código) |
| RCT-08 | ragdoll sem tint branco | `src/game/Ragdoll.ts` (`flash()` removido no diff) | ✅ PASS (código) |
| RCT-09 | armadura mostra `Fx.spark` `guard` | `src/game/Enemy.ts:930` (`onBlock` no `onArmored`) e `src/scenes/TestScene.ts:1125` (`fx.spark(..., 'guard')`) | ✅ PASS (código) |

### CAM (câmera)

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| CAM-01 | tranco 4 px, volta em 120 ms | `tests/core/cameraKick.test.ts:5,18`; ligação `src/scenes/TestScene.ts:1439,465` | ✅ PASS |
| CAM-02 | zoom 1,5 a 1,6 em 60, segura 200, volta em 120 | `tests/core/cameraKick.test.ts:55,61,65`; `src/scenes/TestScene.ts:458-460,1442-1445` | ✅ PASS |
| CAM-03 | quebra de postura dispara câmera lenta 0,4/350 | `tests/core/slowMoConfig.test.ts:5`; `src/scenes/TestScene.ts:1446` (`brokePosture`) | ✅ PASS |
| CAM-04 | novo trigger reinicia sem empilhar | `tests/core/slowMoConfig.test.ts:19,29` | ✅ PASS |
| CAM-05 | zoom do finalizador manda | `src/scenes/TestScene.ts:1442` (`finisherZoomMs <= 0`, `FINISHER_MOVE`) | ✅ PASS (código) |
| CAM-06 | sem `Fx.shake` no heavy/decisive do jogador | `src/scenes/TestScene.ts:1388-1392` (shake só no ramo `else`) | ✅ PASS (código) |
| CAM-07 | Contra dispara câmera lenta | `src/scenes/TestScene.ts:1446` (`hit.counter`); `tests/core/slowMoConfig.test.ts:5` | ✅ PASS |
| CAM-08 | último da onda dispara câmera lenta | `src/scenes/TestScene.ts:795` (`roundCleared`) | ✅ PASS (código) |

### FOC e EDG

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FOC-01 | 24 linhas radiais por 180 ms na câmera de UI | `src/data/feel.ts:54` + `tests/data/feel.test.ts:47`; `src/game/FocusLines.ts:37,93`; `src/scenes/TestScene.ts:1438` | ✅ PASS |
| FOC-02 | círculo livre de raio 120 px | `src/game/FocusLines.ts:40` (ponta em `clearRadiusPx + jitter`, sempre fora) | ✅ PASS (código) |
| EDG-01 | sem entrada: sem rastro e um aviso por nome | `src/scenes/TestScene.ts:1475-1481` (`warnedStrikeFrames`) | ✅ PASS (código) |
| EDG-02 | jogador atingido apaga a chama no frame | `src/scenes/TestScene.ts:1494` (`hp >= lastPlayerHp`) | ✅ PASS (código) |
| EDG-03 | teto de 40 pula novos estilhaços e resíduos | `tests/game/cursedFx.test.ts:13` (nos dois lados); spec ambígua em exatamente 40 (ver lacunas) | ⚠️ PARTIAL |
| EDG-04 | reinício destrói tudo | `src/scenes/TestScene.ts:365` (`destroyAll` no SHUTDOWN), `src/game/ImpactFrame.ts:32` | ✅ PASS (código) |
| EDG-05 | sem `impactFrame` pausado por loja ou título | `src/scenes/TestScene.ts:357` (`canApply`), `src/game/ImpactFrame.ts:46` | ✅ PASS (código) |

**Status**: ❌ lacunas presentes (2 FAIL, 6 PARTIAL).

### Julgamento do ponto conhecido: passo de 9,09 px

**É defeito, não medição.** O `StepIn` é correto (`src/core/stepIn.ts:30-37` soma exatamente o total ao fechar o `startupMs`; `tests/core/stepIn.test.ts:12` prova 10 px). O problema é a aplicação em `src/game/Player.ts`: `updateStrikes` (linha 436) roda antes de `applyStepIn` (linha 466) e, no quadro em que o startup acaba, `moves.phase` já virou `active`. `applyStepIn` (linha 1130, `if (this.moves.phase !== 'startup' ...) return`) sai antes de chamar `stepIn.update`, e o último pedaço do passo nunca é aplicado: nenhum quadro posterior o recupera, porque o guard só aceita `startup`. Conta: `cotovelada`/`chuteFrontal` têm startup 110 ms; 6 quadros de 16,67 ms somam 100 ms, aplicam 10 x 100/110 = 9,09 px e perdem 0,91 px (~9%). No leve (`jab`, 60 ms) perdem-se 10 de 60 ms, ou seja 3,33 px em vez de 4 (~17%). A perda varia com o `dt`, então não é erro fixo. O smoke passa porque seu limite é `±1` (`scripts/smoke/impact.smoke.mjs:60`), que engole 9,09.

---

## Discrimination Sensor

Scratch: worktree temporária em `scratchpad/wt-verify` (junção de `node_modules`), removida ao fim; `git status --porcelain` da árvore real idêntico ao de antes (conferido com `diff`).

| # | File:line | Description | Killed? |
| - | --------- | ----------- | ------- |
| 1 | `src/core/impactTier.ts:19` | `heavy`/`light` trocados no retorno final | ✅ Killed (2 testes) |
| 2 | `src/core/impactTier.ts:18` | removida a condição `knockdown` do decisivo | ✅ Killed (1 teste) |
| 3 | `src/core/impactTier.ts:39` | comprimento do espinho multiplicado por 1,1 (passa de 30 px) | ✅ Killed (`impactTier.test.ts:42`) |
| 4 | `src/core/stepIn.ts:35` | último pedaço do passo devolvido como 0 (a falha do Player, em escala unitária) | ✅ Killed (5 testes) |
| 5 | `src/core/stepIn.ts:27` | `blocked` não encerra o avanço (POS-09) | ✅ Killed (1 teste) |
| 6 | `src/core/slide.ts:30` | `blocked` não encerra o deslize (RCT-05) | ✅ Killed (1 teste) |
| 7 | `src/game/art/sprites/strikePoints.ts:34` | ponto do gancho movido para a coluna 31, fora da hitbox (POS-01) | ✅ Killed (4 testes) |
| 8 | `src/core/frameInvariants.ts:32` | conectividade 8 vira 4-vizinhança (POS-02) | ✅ Killed (85 testes) |
| 9 | `src/data/feel.ts:9` | largura do rastro forte 8 vira 6 (TRL-05) | ✅ Killed (2 testes) |
| 10 | `src/core/strikePath.ts:49` | `trailStyle` ignora a força e usa sempre `light` | ✅ Killed (1 teste) |

**Sensor depth**: lightweight ampliado (10 mutantes nos ACs de maior risco).
**Result**: 10/10 killed no núcleo e na arte. **Ressalva**: nenhum mutante atingiu o adaptador `Player.applyStepIn`; a falha real do POS-07/08 mora nesse trecho e o único teste que a alcança (smoke `:60`) é frouxo demais para matá-la. Um mutante que apague o último pedaço no `Player` sobreviveria ao smoke atual.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ (o desvio abaixo é justificado no commit) |
| No scope creep | ✅ |
| Matches patterns | ✅ (core puro + adaptador fino, AD-001) |
| Spec-anchored outcome check (asserted values match spec) | ✅ (todo valor assertado bate com a spec) |
| Per-layer Coverage Expectation met | ⚠️ núcleo e arte 1:1; adaptador coberto só por 1 smoke que não toca IMP-13/14/15, RCT-03/04/07..09, CAM-*, FOC, EDG |
| Every test maps to a spec requirement | ✅ |
| Documented guidelines followed | `vitest.config.ts`, L-010 (limiares nos dois lados) e L-043 (chamada do adaptador): L-043 não foi seguida em `Player.applyStepIn` |

Teste antigo narrado: `tests/game/art.test.ts` tirou o `kick` da lista "pelo menos 3 S a mais que o wind" (POS-06 redesenhou o chute sem linhas `S`). O `tasks.md` lista só a faísca, a tremida e as linhas da altura 24 como exceções; o `kick` é uma quarta exceção, justificada em comentário no teste, mas não está na lista de exceções do `tasks.md`.

---

## Edge Cases

- [x] EDG-01 a EDG-05: tratados no código (ver tabela), EDG-03 com ambiguidade na spec.

---

## Gate Check

- **Gate command**: `npm run build && npm test`; mais `npm run smoke -- impact`
- **Result**: 2367 passed, 0 failed, 0 skipped (97 arquivos de teste); build ok; `impact.smoke.mjs` ok
- **Test count before feature**: não medido (sem checkout do commit-base)
- **Test count after feature**: 2367
- **Delta**: +9 arquivos de teste novos (`cameraKick`, `frameInvariants`, `impactTier`, `slide`, `slowMoConfig`, `stepIn`, `strikePath`, `feel`, `cursedFx`, `feelArt`); nenhum teste apagado
- **Skipped tests**: nenhum
- **Failures**: nenhuma

---

## Fix Plans (ordenadas por gravidade)

### Fix 1 (Major): passo à frente perde o último pedaço do startup - POS-07, POS-08

- **Root cause**: `src/game/Player.ts:1130` sai quando `moves.phase !== 'startup'`, mas `updateStrikes` já virou a fase no quadro final.
- **Fix task**: chamar o `stepIn.update` no quadro da virada. Opção A: guardar o `dt` e aplicar o passo antes de `updateStrikes`. Opção B: trocar o guard por "o `StepIn` ainda corre" (um `active` interno exposto, e `this.strikeName !== null`), mantendo o `blocked`. Apertar o smoke para `Math.abs(dx - 10) <= 0.25` (`scripts/smoke/impact.smoke.mjs:60`) e acrescentar um caso do `jab` com 4 px.
- **Priority**: Major

### Fix 2 (Minor): `impactFrame` de `fx.lastImpact` pode ficar `true` sem ter sido aplicado - IMP-16, IMP-13

- **Root cause**: `src/scenes/TestScene.ts:1418` calcula `framed || (lastImpact.tier === 'decisive' && impactFrame.applied)`, que cobre o segundo alvo do mesmo swing mas também marca `true` num leve, ou num acerto de Kokusen, que caia dentro dos 2 quadros do decisivo anterior.
- **Fix task**: comparar o `swingId` do acerto com o do último decisivo enquadrado (`hit.swingId === lastFramedSwing && applied`), em vez do nível anterior.
- **Priority**: Minor

### Fix 3 (Minor): adaptadores sem teste que discrimine - IMP-11, IMP-13, IMP-14, RCT-04

- **Root cause**: o smoke T23 só cobre TRL-04/05/10, IMP-16, RCT-01/06 e POS-07; o Contra e os 2 quadros do postFX, o dedup por `swingId`, o Kokusen e o esbarrão em cadeia ficam só no código.
- **Fix task**: extrair `ImpactFrame` para aceitar um relógio de quadros injetável e testar `trigger` duplo no mesmo `swingId` (IMP-14) e a remoção após 2 `POST_RENDER` (IMP-11); acrescentar ao smoke o Contra (`impactFrame === !degraded`) e dois inimigos enfileirados com `slideTouch` conferindo `hp` e `structure` iguais (RCT-04).
- **Priority**: Minor

### Fix 4 (Cosmetic): lacunas de precisão da spec

- **EDG-03**: diz "mais de 40 ... até cair abaixo de 40"; o valor exatamente 40 não está definido (o código pula com 40, `src/game/CursedFx.ts:33`). Trocar por "com 40 ou mais".
- **Numeração do `spec.md`**: POS tem dois itens "6." (POS-10 e POS-06) e CAM lista CAM-07/08 entre CAM-03 e CAM-04 com números repetidos; CAM-05 cita "FIN-04", que não existe nesta spec (vem da F-anterior).
- **Tabela de rastreabilidade do `spec.md`**: continua com os 64 requisitos em `Pending` e "0 mapped to tasks"; atualizar para `Verified` depois do Fix 1.
- **POS-07/POS-08**: dizem "advance 10 px spread over its `startupMs`" sem tolerância; definir o erro aceito ajudaria o smoke (sugestão: ±0,25 px).
- **RCT-01**: "stays standing" não define o inimigo comprometido (o código exclui `ai.committed`, `src/game/Enemy.ts:796`); registrar a regra na spec.
- **`tasks.md`**: acrescentar o `kick` à lista de exceções dos testes antigos.
- **Priority**: Cosmetic

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| POS-07, POS-08 | Pending | ❌ Needs Fix |
| IMP-11, IMP-13, IMP-14, IMP-16, RCT-04, EDG-03 | Pending | ⚠️ Partial |
| Os outros 56 | Pending | ✅ Verified |

---

## Summary

**Overall**: ❌ Not Ready (um fix de uma linha de lógica e um smoke mais apertado resolvem o FAIL)

**Spec-anchored check**: 64/64 ACs com valor assertado igual ao da spec onde há teste; 5 lacunas de precisão da spec
**Sensor**: 10/10 mutantes mortos (núcleo e arte); adaptador `Player` sem mutante, ver ressalva
**Gate**: 2367 passed

**What works**: núcleo puro (`impactTier`, `impactSpikes`, `strikePath`, `slide`, `cameraKick`, `slowMo`), invariantes de grade em todos os frames, rastro, impacto em camadas, câmera, foco e limpeza no reinício.

**Issues found**: Fix 1 a Fix 4 acima.

**Next steps**: corrigir o Fix 1 e reverificar (iteração 2 de 3).
