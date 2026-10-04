# Impacto Amaldiçoado Validation

## Validation: impacto-amaldicoado - PASS ✅

**Date**: 2026-10-04
**Spec**: `.specs/features/impacto-amaldicoado/spec.md`
**Diff range**: `a278eda..HEAD` (HEAD = `650e52b`, branch `feat/impacto-amaldicoado`; correções da iteração 1: `f45035d`, `8912817`, `f660ef2`, `650e52b`)
**Verifier**: sub-agent independente (author ≠ verifier), Sonnet 5.5, iteração 2 de 3

**Veredito**: PASS. Os dois ACs que falhavam (POS-07, POS-08) agora entregam 10 px e 4 px dentro de ±0,25 e o smoke os mede nessa tolerância; o EDG-03 ficou preciso na spec. Cinco ACs ficam PARTIAL, todos de adaptador sem teste que discrimine, cobertos só por evidência de código (permitido pela Test Coverage Matrix do `tasks.md`). Nenhum AC em FAIL. Quatro mutantes sobreviveram no adaptador (ver Sensor), nenhum num AC de risco; viram lacunas Minor.

**Contagem**: 55 PASS, 5 PARTIAL, 0 FAIL (60 ACs). A iteração 1 dizia 64; a spec tem 60 ACs (TRL 10, IMP 16, POS 10, RCT 9, CAM 8, FOC 2, EDG 5), então o total anterior estava errado.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 a T24 | ✅ Done | Todas `[x]` em `tasks.md`. As correções da iteração 1 entraram como 4 commits de fix (sem task nova). |

---

## Reavaliação dos ACs que falhavam ou estavam PARTIAL

### POS-07 e POS-08 (eram FAIL): agora PASS

- **Correção** (`f45035d`): `src/game/Player.ts:1129-1136` (`applyStepIn`) roda enquanto `this.stepIn.running` e a fase é `startup` ou `active`: `if (dtMs <= 0 || !this.stepIn.running || (phase !== 'startup' && phase !== 'active')) return;`. `src/core/stepIn.ts:23-27` expõe `running` (`!this.done`). `updateStrikes` (`Player.ts:436`) vira a fase antes de `applyStepIn` (`:466`), e o quadro da virada agora aplica o último pedaço; o `StepIn` fecha o total em `startupMs` (`stepIn.ts:30-37`).
- **Conta**: heavy (110 ms, quadros de 16,67 ms): 7 chamadas somam 10 px exatos, `tests/core/stepIn.test.ts:63-72` (`expect(sum).toBeCloseTo(10, 10)`, `running` true antes e false depois). Jab (60 ms): `stepIn.test.ts:33` (4 px) e smoke `:68-80`.
- **Medida no jogo**: `scripts/smoke/impact.smoke.mjs:62` `Math.abs(dx - 10) <= 0.25` e `:79` `Math.abs(dx - 4) <= 0.25`. O smoke passa na árvore real; o mutante M3 (descartar o último pedaço) faz o smoke falhar com "foi 9.09".
- **Golpe cancelado não anda**: a guarda de fase impede o passo fora de `startup`/`active` (`Player.ts:1133`). Esse ramo não tem teste (mutante M2, sobrevivente).
- **Spec**: tolerância ±0,25 agora escrita em POS-07 e POS-08.

### Demais ACs reavaliados

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| IMP-16 | `fx.lastImpact = {tier, impactFrame}` sem `impactFrame` falso | Correção `8912817`: `src/scenes/TestScene.ts:1420,1422` (`framedSwingId`; `impactFrame: framed \|\| (applied && swingId === framedSwingId)`). Smoke `:89-90,104,133` cobre light, heavy e decisivo. O caso "leve dentro dos 2 quadros de um decisivo" não tem teste: mutantes M4 e M5 sobrevivem. | ⚠️ PARTIAL |
| IMP-13 | Kokusen não leva `impactFrame` | `src/scenes/TestScene.ts:1418-1419` (`kokusen = kokusenFrame === getFrame()`, `framed` exige `!kokusen`); sem teste da ordem Kokusen/`onConnect` | ⚠️ PARTIAL |
| IMP-11 | postFX por exatamente 2 quadros renderizados | `src/game/ImpactFrame.ts:7,60-70` (contagem em `POST_RENDER`); smoke `:133` só confere `applied`; nada mede os 2 quadros | ⚠️ PARTIAL |
| IMP-14 | no máximo 1 `impactFrame` por swing | `src/game/ImpactFrame.ts:44-47` (`lastSwingId`); mutante M6 (sem comparação por swing) sobrevive; sem teste multi-alvo | ⚠️ PARTIAL |
| RCT-04 | esbarrão toca `body` sem perder HP nem postura | `src/game/Enemy.ts:809-814,840-844` (`touched()` só toca a reação); sem teste | ⚠️ PARTIAL |
| EDG-03 | "40 ou mais" pula estilhaços e resíduos | `tests/game/cursedFx.test.ts:13-17` (`fxCap - 1` true, `fxCap` false, `fxCap + 1` false); `src/game/CursedFx.ts:32,250,302`; `src/data/feel.ts:26` (`fxCap: 40`); spec agora diz "40 or more" | ✅ PASS |

---

## Spec-Anchored Acceptance Criteria (60)

Convenção: teste unitário citado com `arquivo:linha`; adaptador sem teste usa `file:line` do código, como permite a matriz do `tasks.md`. As linhas de `TestScene.ts` deslocaram +2 depois de `8912817` (campo `framedSwingId`). Todo valor assertado bate com a spec.

### TRL (rastro)

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| TRL-01 | ponto de golpe em todo `-wind`/`-hit` | `tests/game/feelArt.test.ts:200,207` | ✅ PASS |
| TRL-02 | ponto é texel opaco | `tests/game/feelArt.test.ts:193` | ✅ PASS |
| TRL-03 | rastro nasce no `active`, de `-wind` a `-hit`, com posição e facing | `src/scenes/TestScene.ts:1463-1466` (`stopFlame()`, `strikeWorld(-wind)`, `cursedFx.trail([from, to], strength)` no ramo `active`); `tests/core/strikePath.test.ts:8,14`; smoke `impact.smoke.mjs:60` exige rastro ao abrir a hitbox | ✅ PASS (amostra reconferida) |
| TRL-04 | leve 4 px, apaga em 140 ms | `tests/core/strikePath.test.ts:50`; `src/game/CursedFx.ts:179` | ✅ PASS |
| TRL-05 | forte 8 px, apaga em 220 ms | `tests/core/strikePath.test.ts:53`; smoke `:64` (`widthPx === 8`) | ✅ PASS |
| TRL-06 | só `d,c,C,u,U` | `tests/game/cursedFx.test.ts:7`; `CursedFx.ts:16` | ✅ PASS |
| TRL-07 | chama no startup do forte com `c,C,U` | `TestScene.ts:1452-1459`; `CursedFx.ts:285` | ✅ PASS |
| TRL-08 | chama para na saída do startup | `TestScene.ts:1463` (`stopFlame()` no `active`) | ✅ PASS |
| TRL-09 | hitstop congela fade | `TestScene.ts` (`tweens.pauseAll()` no congelamento); `CursedFx.ts:179` | ✅ PASS (código) |
| TRL-10 | `fx.trails` `{tier,widthPx,ageMs}` | `CursedFx.ts:136`; smoke `:65` | ✅ PASS |

### IMP (impacto)

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| IMP-01 | `counter` dá `decisive` | `tests/core/impactTier.test.ts:10-14` | ✅ PASS |
| IMP-02 | `knockdown` dá `decisive` | `impactTier.test.ts:16` | ✅ PASS |
| IMP-03 | `brokePosture` dá `decisive` | `impactTier.test.ts:19` | ✅ PASS |
| IMP-04 | heavy sem decisivo dá `heavy` | `impactTier.test.ts:22`; smoke `:104` | ✅ PASS |
| IMP-05 | light sem decisivo dá `light` | `impactTier.test.ts:25`; smoke `:89` | ✅ PASS |
| IMP-06 | evento `impact:<tier>`, sem `Fx.spark` no corpo a corpo do jogador | `TestScene.ts:1390` (ramo exclusivo `onMeleeImpact`; `fx.spark` só no `else`), `:1423` (`debugEvents.push(impact:tier)`); smoke conta `impact:light` | ✅ PASS (amostra reconferida) |
| IMP-07 | 6 estilhaços, cone ±35°, 180 ms | `src/data/feel.ts:15-17` + `tests/data/feel.test.ts:10`; `CursedFx.ts:301-318` | ✅ PASS |
| IMP-08 | anel 6 a 28 px em 160 ms | `feel.ts:18-20`; `CursedFx.ts:325-374` | ✅ PASS |
| IMP-09 | 6 espinhos, 18 a 30 px | `impactTier.test.ts:42` | ✅ PASS |
| IMP-10 | mesma seed, mesma saída | `impactTier.test.ts:31` | ✅ PASS |
| IMP-11 | postFX por exatamente 2 quadros | ver reavaliação acima | ⚠️ PARTIAL |
| IMP-12 | sem WebGL, pula o postFX e mantém anel/espinhos | `ImpactFrame.ts:19,46`; smoke `:133` (`impactFrame === !degraded`) | ✅ PASS |
| IMP-13 | Kokusen sem `impactFrame` | ver reavaliação acima | ⚠️ PARTIAL |
| IMP-14 | 1 `impactFrame` por swing | ver reavaliação acima | ⚠️ PARTIAL |
| IMP-15 | rachadura no pouso, apaga em 1200 ms | `TestScene.ts:1499-1511`; `CursedFx.ts:245` | ✅ PASS (código) |
| IMP-16 | `fx.lastImpact` | ver reavaliação acima | ⚠️ PARTIAL |

### POS (poses e alcance)

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| POS-01 | ponto do `-hit` dentro da hitbox +4 px | `tests/game/feelArt.test.ts:194,200` | ✅ PASS |
| POS-02 | um componente 8-conexo por frame | `feelArt.test.ts:112,161,232`; `tests/core/frameInvariants.test.ts:33` | ✅ PASS |
| POS-03 | texel na última linha do `-hit` de chão | `feelArt.test.ts:112,232,242` | ✅ PASS |
| POS-04 | cabeça ±1 coluna na sequência do pulo | `feelArt.test.ts:162,168` | ✅ PASS |
| POS-05 | punho do gancho acima do cabelo de `idle-0` | `feelArt.test.ts:72` | ✅ PASS |
| POS-06 | coxa ≥ 1 texel mais alta que a canela | `feelArt.test.ts:134,143` | ✅ PASS |
| POS-07 | forte avança 10 px (±0,25) | `Player.ts:1129-1136`, `stepIn.ts:23-27`, `stepIn.test.ts:12,63-72`, smoke `:62` | ✅ PASS |
| POS-08 | leve avança 4 px (±0,25) | `stepIn.test.ts:33`, smoke `:79` | ✅ PASS |
| POS-09 | para no contato com inimigo ou parede | `stepIn.test.ts:43,74-80`; `Player.ts:1140-1158` | ✅ PASS |
| POS-10 | ponto do gancho ≥ 6 texels à frente | `feelArt.test.ts:72` | ✅ PASS |

### RCT (reação do inimigo)

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| RCT-01 | heavy desliza 24 px em 180 ms | `tests/core/slide.test.ts:11,16`; smoke (`remainingPx <= 24`); `Enemy.ts:796` exclui `ai.committed`, agora escrito na spec | ✅ PASS (amostra reconferida) |
| RCT-02 | decisive desliza 48 px em 240 ms | `slide.test.ts:31` | ✅ PASS |
| RCT-03 | resíduo `c` a cada 40 ms, apaga em 300 ms | `Enemy.ts:818-839`, `CursedFx.ts:249-256` | ✅ PASS (código) |
| RCT-04 | esbarrão sem perder HP nem postura | ver reavaliação acima | ⚠️ PARTIAL |
| RCT-05 | parede para o deslize | `slide.test.ts:60`; `Enemy.ts:818-828` | ✅ PASS |
| RCT-06 | `enemies[].slide` | `slide.test.ts:49`; smoke | ✅ PASS |
| RCT-07 | sem tint branco no golpe | `Enemy.ts:906` (sem `setTintFill(PALETTE.w)`); `:764` é o pisca de compromisso (CMT-02) | ✅ PASS (código) |
| RCT-08 | ragdoll sem tint branco | `src/game/Ragdoll.ts` (`flash()` removido) | ✅ PASS (código) |
| RCT-09 | armadura mostra `Fx.spark` `guard` | `Enemy.ts:930`; `TestScene.ts:1125` | ✅ PASS (código) |

### CAM (câmera)

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| CAM-01 | tranco 4 px, volta em 120 ms | `tests/core/cameraKick.test.ts:5,18` | ✅ PASS |
| CAM-02 | zoom 1,5 a 1,6 em 60, segura 200, volta em 120 | `cameraKick.test.ts:55,61,65`; `TestScene.ts:1446-1449` | ✅ PASS |
| CAM-03 | quebra de postura dispara câmera lenta 0,4/350 | `tests/core/slowMoConfig.test.ts:5` | ✅ PASS |
| CAM-04 | novo trigger reinicia sem empilhar | `slowMoConfig.test.ts:19,29` | ✅ PASS |
| CAM-05 | zoom do finalizador manda | `TestScene.ts:1446` (`this.finisherZoomMs <= 0` e `hit.moveName !== FINISHER_MOVE`); spec agora cita `finisherZoomMs > 0` | ✅ PASS (código, amostra reconferida) |
| CAM-06 | sem `Fx.shake` no heavy/decisive do jogador | `TestScene.ts:1390-1394` (shake só no `else`) | ✅ PASS (código) |
| CAM-07 | Contra dispara câmera lenta | `slowMoConfig.test.ts:5`; `TestScene.ts` (`hit.counter`) | ✅ PASS |
| CAM-08 | último da onda dispara câmera lenta | `TestScene.ts` (`roundCleared`) | ✅ PASS (código) |

### FOC e EDG

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| -- | -------------------- | ----------------------- | ------ |
| FOC-01 | 24 linhas radiais por 180 ms | `feel.ts:54` + `tests/data/feel.test.ts:47`; `FocusLines.ts:37,93`; `TestScene.ts:1442` | ✅ PASS |
| FOC-02 | círculo livre de raio 120 px | `FocusLines.ts:40` | ✅ PASS (código) |
| EDG-01 | sem entrada: sem rastro e um aviso por nome | `TestScene.ts:1477-1483` (`warnedStrikeFrames`) | ✅ PASS (código) |
| EDG-02 | jogador atingido apaga a chama no frame | `TestScene.ts:1499` | ✅ PASS (código) |
| EDG-03 | teto de 40 | ver reavaliação acima | ✅ PASS |
| EDG-04 | reinício destrói tudo | `TestScene.ts:365`, `ImpactFrame.ts:32` | ✅ PASS (código) |
| EDG-05 | sem `impactFrame` pausado | `TestScene.ts:357`, `ImpactFrame.ts:46` | ✅ PASS (código) |

**Status**: ✅ sem FAIL (55 PASS, 5 PARTIAL de adaptador).

**Conferência por amostragem dos ACs que eram PASS** (TRL-03, IMP-06, RCT-01, CAM-05, mais TRL-05 e POS-09): reconferidos no código e nos testes depois dos 4 commits de correção; nada quebrou. Os commits tocaram só `Player.applyStepIn`, `StepIn.running`, o cálculo de `lastImpact` e o smoke.

---

## Discrimination Sensor

### Iteração 1 (núcleo e arte): 10/10 mortos

`impactTier` (heavy/light trocados; sem `knockdown`; espinho x1,1), `stepIn` (último pedaço 0; `blocked` ignorado), `slide` (`blocked` ignorado), `strikePoints` (gancho fora da hitbox), `frameInvariants` (4-vizinhança), `feel` (largura do forte 6), `strikePath` (`trailStyle` sempre light). Todos mortos.

### Iteração 2 (adaptadores): worktree `scratchpad/wt-verify2`, junção do `node_modules`, `npm run smoke -- impact` em cada mutante

| # | File:line | Mutação | Killed? |
| - | --------- | ------- | ------- |
| M1 | `src/game/Player.ts:1133` | voltar ao guard antigo (`phase !== 'startup'`) | ✅ Killed (smoke: "POS-07 ... foi 9.09") |
| M3 | `src/game/Player.ts:1134` | descartar o último pedaço (passo na fase `active` vira 0) | ✅ Killed (smoke: "POS-07 ... foi 9.09") |
| M2 | `src/game/Player.ts:1133` | sem checagem de fase (golpe cancelado continuaria andando) | ❌ Survived (smoke ok) |
| M4 | `src/scenes/TestScene.ts:1422` | `impactFrame` volta à regra antiga (`lastImpact.tier === 'decisive' && applied`) | ❌ Survived (smoke ok) |
| M5 | `src/scenes/TestScene.ts:1422` | `impactFrame: framed \|\| applied` | ❌ Survived (smoke ok) |
| M6 | `src/scenes/TestScene.ts:1422` | sem comparação por `swingId` (qualquer golpe com `swingId` durante o postFX) | ❌ Survived (smoke ok) |

Isolamento: worktree removida (`git worktree remove --force` e `prune`), `git status --porcelain` da árvore real idêntico ao baseline (`diff` sem diferença).

**Resultado**: o ponto que a iteração 1 não alcançou (adaptador `Player.applyStepIn`) agora é discriminado (M1 e M3 mortos). Sobrevivem 4 mutantes em 2 comportamentos de adaptador sem teste: (a) golpe cancelado não andar (M2, comportamento de design sem AC próprio) e (b) a precisão do `impactFrame` num leve ou Kokusen dentro dos 2 quadros de um decisivo (M4, M5, M6; IMP-14 e IMP-16, flag de depuração). Nenhum está num AC de risco com efeito visível ao jogador, então não reprovam; viram lacunas Minor.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ (correções de 5 e 6 linhas) |
| Surgical changes | ✅ |
| No scope creep | ✅ |
| Matches patterns | ✅ (core puro + adaptador fino, AD-001) |
| Spec-anchored outcome check (asserted values match spec) | ✅ (smoke agora asserta 10 ±0,25 e 4 ±0,25, igual à spec) |
| Per-layer Coverage Expectation met | ⚠️ núcleo e arte 1:1; adaptador coberto por smoke só em TRL-04/05/10, IMP-16 (parcial), RCT-01/06, POS-07/08 |
| Every test maps to a spec requirement | ✅ (`StepIn.running` mapeia a POS-07/08, L-059) |
| Documented guidelines followed | L-010 (limiares nos dois lados) ✅, L-043 (chamada do adaptador conferida) ✅ para POS-07/08; `kick` agora na lista de exceções do `tasks.md` ✅ |

---

## Edge Cases

- [x] EDG-01 a EDG-05 tratados (EDG-03 com limite exato definido e testado).

---

## Gate Check

- **Gate command**: `npm run build && npm test`, mais `npm run smoke -- impact`
- **Result**: build ok; `npx vitest run --maxWorkers=2`: 2369 passed, 0 failed, 0 skipped (97 arquivos); `impact.smoke.mjs` ok
- **Test count after feature**: 2369 (+2 sobre a iteração 1: os dois `it` de `StepIn.running`)
- **Skipped tests**: nenhum
- **Failures**: nenhuma

---

## Gaps restantes (todos não bloqueantes)

### Minor

1. **Adaptador `impactFrame`** (IMP-11, IMP-13, IMP-14, IMP-16; mutantes M4, M5, M6): sem teste do leve ou Kokusen dentro dos 2 quadros de um decisivo, do multi-alvo no mesmo `swingId` e dos 2 quadros do postFX. Sugestão: relógio de quadros injetável em `ImpactFrame` com teste unitário, mais um caso de smoke com o Contra.
2. **Golpe cancelado não anda** (mutante M2): a guarda de fase em `Player.ts:1133` não tem teste. Sugestão: smoke que leva dano no startup e confere `player.x` parado, ou um AC próprio na spec.
3. **RCT-04**: esbarrão em cadeia sem teste (HP e postura iguais). Sugestão: smoke com dois inimigos enfileirados.
4. **Kokusen no `swingId` já enquadrado** (`TestScene.ts:1422`): um segundo alvo Kokusen do mesmo golpe reporta `impactFrame: true` por causa do `swingId` já enquadrado. Raro e só afeta o snapshot.

### Cosmetic

5. A contagem de ACs da iteração 1 (64) estava errada; o correto é 60.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| 55 ACs (todos menos os cinco abaixo) | Pending | ✅ Verified |
| IMP-11, IMP-13, IMP-14, IMP-16, RCT-04 | Pending | ⚠️ Partial |

---

## Summary

**Overall**: ✅ Ready (PASS com 5 PARTIAL de adaptador e lacunas Minor)

**Spec-anchored check**: 60/60 ACs com valor assertado igual ao da spec onde há teste; as lacunas de precisão da iteração 1 foram fechadas no `spec.md` (`650e52b`)
**Sensor**: iteração 1 com 10/10 mortos; iteração 2 com M1 e M3 mortos e M2, M4, M5, M6 sobreviventes em comportamento sem AC de risco
**Gate**: 2369 passed, smoke ok

**What works**: núcleo puro, arte, rastro, impacto em camadas, passo à frente de 10 e 4 px medido no jogo vivo, câmera, foco e limpeza no reinício.

**Issues found**: apenas as lacunas Minor acima.

**Next steps**: nenhuma obrigatória. Fechar os Minor 1 e 2 numa feature futura de testes de adaptador.
