# Impacto Amaldiçoado — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/impacto-amaldicoado/spec.md`
**Design**: `.specs/features/impacto-amaldicoado/design.md`
**Status**: In Progress
**Branch**: `feat/impacto-amaldicoado` (a partir de `dev`; volta para `dev` com `--no-ff` depois do Verifier PASS e do UAT, AD-008)
**Modelos**: Opus 5.5 orquestra; workers e Verifier em Sonnet 5.5. Lotes curtos: até ~4 tasks por worker (até 3 nas de integração). As fases 1 e 2 não dependem uma da outra e rodam em paralelo, em worktrees separadas.

Regras que valem para toda task:

- Um commit por task, em Conventional Commits, com a task marcada aqui no mesmo commit. Identidade: `git -c user.name="Claude" -c user.email="ezequieltbeserra00@gmail.com" commit`.
- Nenhum teste antigo é apagado, pulado ou afrouxado. As exceções são os asserts da faísca e da tremida do golpe corpo a corpo do jogador (IMP-06, CAM-06) e as linhas literais da altura 24 do frame (T9). O commit diz qual.
- Todo limiar citado num AC é testado nos dois lados (L-010). A chamada do adaptador que repassa um valor ao Phaser é conferida, não só o helper (L-043).
- Antes de implementar, rodar o teste novo e ver falhar.
- Tasks de arte: gerar a prancha com `node tools/sprite-preview.mjs <scratchpad> --only player` e olhar os PNG dos frames mexidos antes do commit.

---

## Test Coverage Matrix

> Guidelines: `vitest.config.ts`; `.specs/STATE.md` AD-001, AD-002, AD-006, AD-009, AD-022 (smoke só para o que o unitário não alcança); lições L-010 e L-043.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Lógica pura (`src/core/**`, `src/data/**`) | unit | 1:1 com os ACs; limiares nos dois lados | `tests/core/*.test.ts`, `tests/data/*.test.ts` | `npm test` |
| Arte em grade (`src/game/art/**`) | unit | Invariantes POS-01..06/POS-10 e TRL-01/02 em todos os frames do escopo | `tests/game/art.test.ts`, `tests/game/feelArt.test.ts` | `npm test` |
| Adaptadores Phaser (`CursedFx`, `ImpactFrame`, `FocusLines`, `Player`, `Enemy`, `TestScene`) | smoke | Valor vivo lido pelo snapshot; `none` na task do adaptador, coberto pelo smoke da T23 | `scripts/smoke/*.smoke.mjs` | `npm run smoke` |
| Documentação | none | - | - | build gate only |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tasks com testes unitários | `npm run typecheck && npm test` |
| Build | Tasks de adaptador | `npm run build && npm test` |
| Full | Smoke e fechamento | `npm run build && npm test && npm run smoke` |

Um smoke só: `npm run smoke -- <nome>`. Intermitentes conhecidos: `heal`, `armed`, `held-item`, `enemy-react`, `kokusen`.

---

## Execution Plan

### Phase 1: Núcleo puro (worker A)

```
T1 → T2 → T3 → T4 → T5 → T6 → T7
```

### Phase 2: Arte e invariantes (worker B, em paralelo com a fase 1; worker C a partir da T12)

```
T8 → T9 → T10 → T11 → T12 → T13 → T14
```

### Phase 3: Efeitos e ligação do golpe (workers D e E)

```
T15 → T16 → T17 → T18 → T19
```

### Phase 4: Inimigo, câmera, foco e fechamento (workers F e G)

```
T20 → T21 → T22 → T23 → T24
```

---

## Task Breakdown

### T1: Números do feel

**What**: Criar `src/data/feel.ts` com todos os números da spec: rastro (4/8 px, 140/220 ms), estilhaços (6, ±35°, 180 ms), anel (6→28 px, 160 ms), espinhos (6, 18–30 px), rachadura (1200 ms), teto 40, passo (4/10 px), deslizamento (24/180, 48/240), resíduo (40 ms, 300 ms), câmera (4 px/120 ms; zoom 1.5→1.6, 60/200/120 ms; lenta 0.4/350 ms), foco (24 linhas, 180 ms, raio 120).
**Where**: `src/data/feel.ts`
**Depends on**: None
**Reuses**: estilo de `src/data/fx.ts`
**Requirement**: TRL-04, TRL-05, IMP-07, IMP-08, IMP-09, IMP-15, EDG-03
**Done when**:
- [x] Teste confere cada valor contra a spec.
**Tests**: unit
**Gate**: quick

---

### T2: Nível do impacto e espinhos

**What**: `impactTier` e `impactSpikes` conforme o design.
**Where**: `src/core/impactTier.ts`
**Depends on**: T1
**Reuses**: `src/core/rng.ts`, `Hit`
**Requirement**: IMP-01, IMP-02, IMP-03, IMP-04, IMP-05, IMP-09, IMP-10
**Done when**:
- [ ] Um caso por AC; `counter` + `light` dá `decisive`; `heavy` sem nada decisivo dá `heavy`.
- [ ] `impactSpikes`: mesma seed dá a mesma saída; seeds diferentes dão saídas diferentes; todo comprimento em [18, 30] em 200 seeds; `count` respeitado.
- [ ] `Hit` ganha `swingId?: number`.
**Tests**: unit
**Gate**: quick

---

### T3: Caminho do rastro

**What**: `strikeToWorld`, `strikeToBody` e `trailStyle`.
**Where**: `src/core/strikePath.ts`
**Depends on**: T2
**Reuses**: `ART_SCALE`, e a origem do frame passada como parâmetro (sem importar a arte)
**Requirement**: TRL-03, TRL-04, TRL-05, POS-01
**Done when**:
- [ ] Facing −1 espelha em volta da coluna de origem; teste com os dois lados.
- [ ] `trailStyle('light')` = 4 px/140 ms; `trailStyle('heavy')` = 8 px/220 ms.
**Tests**: unit
**Gate**: quick

---

### T4: Passo à frente

**What**: Classe `StepIn` (POS-07..09).
**Where**: `src/core/stepIn.ts`
**Depends on**: T3
**Reuses**: padrão de relógio de `src/core/dodge.ts`
**Requirement**: POS-07, POS-08, POS-09
**Done when**:
- [ ] Soma dos passos = 10 px (forte) e 4 px (leve), terminando exatamente em `startupMs`; nada depois.
- [ ] `blocked` no meio para o resto; um novo `start` reinicia.
**Tests**: unit
**Gate**: quick

---

### T5: Deslizamento

**What**: Classe `Slide` (RCT-01/02/05/06).
**Where**: `src/core/slide.ts`
**Depends on**: T4
**Reuses**: `StepIn` como modelo
**Requirement**: RCT-01, RCT-02, RCT-05, RCT-06
**Done when**:
- [ ] `heavy` = 24 px em 180 ms; `decisive` = 48 px em 240 ms; `light` não desliza.
- [ ] `remainingPx` vira `null` no fim e no `blocked`.
**Tests**: unit
**Gate**: quick

---

### T6: Tranco e pulso de zoom

**What**: `CameraKick` e `ZoomPulse` em tempo real.
**Where**: `src/core/cameraKick.ts`
**Depends on**: T5
**Reuses**: `src/core/cameraFollow.ts` (convenções)
**Requirement**: CAM-01, CAM-02
**Done when**:
- [ ] Tranco: 4 px na direção normalizada no início; 0 em 120 ms e depois.
- [ ] Zoom: 1.6 em 60 ms, ainda 1.6 em 260 ms, 1.5 em 380 ms; valores antes e depois de cada borda.
**Tests**: unit
**Gate**: quick

---

### T7: Câmera lenta configurável

**What**: `SlowMo.trigger(scale?, ms?)`, que reinicia sem empilhar; o padrão continua o da esquiva perfeita.
**Where**: `src/core/slowMo.ts`
**Depends on**: T6
**Reuses**: `SlowMo`
**Requirement**: CAM-03, CAM-04, CAM-07, CAM-08
**Done when**:
- [ ] `trigger(0.4, 350)`: escala 0.4 até 350 ms reais, 1 depois; um segundo trigger aos 200 ms vai até 550 ms com escala 0.4.
- [ ] Os testes antigos de `SlowMo` continuam passando sem mudança.
**Tests**: unit
**Gate**: quick

---

### T8: Invariantes de grade

**What**: `isSingleComponent`, `touchesBottom`, `headLeftCol`, `topRowOf`, `thighShinHeights`, `isOpaque`.
**Where**: `src/core/frameInvariants.ts`
**Depends on**: None
**Reuses**: `src/core/pixelGrid.ts`
**Requirement**: POS-02, POS-03, POS-04, POS-05, POS-06, TRL-02
**Done when**:
- [ ] Cada função tem casos verdadeiros e falsos em grades pequenas escritas no teste (inclui diagonal conta como conectado).
**Tests**: unit
**Gate**: quick

---

### T9: Folga de 6 linhas no frame do player

**What**: `PLAYER_FRAME_H` = 30; `compose` desloca as partes 6 linhas para baixo e os frames literais ganham 6 linhas vazias no topo; a origem continua no pé.
**Where**: `src/game/art/sprites/player.ts`
**Depends on**: T8
**Reuses**: `composeWithStats`
**Requirement**: POS-05, POS-10
**Done when**:
- [ ] Todo frame do player (incluindo `playerMoves` e `playerTech`) tem 30 linhas; a linha do pé não muda de lugar no mundo (teste compara a última linha opaca de `idle-0` antes e depois).
- [ ] `npm test` e `npm run build` passam; ajustes só em linhas literais de altura.
**Tests**: unit
**Gate**: build

---

### T10: Gancho ascendente e contra-gancho redesenhados

**What**: Redesenhar `ganchoAscendente-*` e `contraGancho-*`: corpo subindo na ponta do pé, braço esticado na diagonal para cima, punho acima e à frente da cabeça.
**Where**: `src/game/art/sprites/playerMoves.ts`
**Depends on**: T9
**Reuses**: partes de `player.ts`
**Requirement**: POS-05, POS-10
**Done when**:
- [ ] Testes POS-05 e POS-10 em `tests/game/feelArt.test.ts` com o ponto de golpe provisório do frame `-hit`.
- [ ] Prancha conferida.
**Tests**: unit
**Gate**: quick

---

### T11: Chutes redesenhados

**What**: Redesenhar `kick-*`, `chuteFrontal-*`, `chuteEmpurrao-*`, `chuteAlto-*` e `chuteCarregado-*`, com tronco inclinado para trás, perna de apoio plantada e coxa mais alta que a canela. Saem as linhas `S` soltas.
**Where**: `src/game/art/sprites/playerMoves.ts`
**Depends on**: T10
**Reuses**: `legStraight`, `legRaised`, `LEG_SUPPORT`
**Requirement**: POS-02, POS-03, POS-06
**Done when**:
- [ ] Testes POS-06 nos três frames citados e POS-02/POS-03 nos cinco golpes.
- [ ] Prancha conferida.
**Tests**: unit
**Gate**: quick

---

### T12: Pulo redesenhado

**What**: Redesenhar `jump-0`, `jump-1`, `apex-0`, `fall-0`, `fall-1`, `land-0`, `land-1` para a cabeça não saltar de coluna.
**Where**: `src/game/art/sprites/player.ts`
**Depends on**: T11
**Reuses**: partes de `player.ts`
**Requirement**: POS-02, POS-04
**Done when**:
- [ ] Teste POS-04 na sequência inteira; POS-02 em cada frame.
- [ ] Prancha conferida.
**Tests**: unit
**Gate**: quick

---

### T13: Pontos de golpe

**What**: `STRIKE_POINTS` com todo frame `-wind`/`-hit` dos golpes de `MOVES` e de `jab`/`kick`.
**Where**: `src/game/art/sprites/strikePoints.ts`
**Depends on**: T12
**Reuses**: `strikeToBody` (fase 1) se já estiver em `dev`; senão a mesma conta no teste
**Requirement**: TRL-01, TRL-02, POS-01
**Done when**:
- [ ] Teste: todo frame exigido tem ponto; ponto opaco (TRL-02); ponto do `-hit` dentro da hitbox +4 px (POS-01).
**Tests**: unit
**Gate**: quick

---

### T14: Varredura dos outros golpes

**What**: Ajustar os frames dos golpes restantes que falham POS-01/02/03 até a suíte inteira de invariantes passar.
**Where**: `src/game/art/sprites/playerMoves.ts`
**Depends on**: T13
**Reuses**: partes existentes
**Requirement**: POS-01, POS-02, POS-03
**Done when**:
- [ ] Teste varre todos os golpes de `MOVES` + `jab` + `kick` com POS-01/02/03 e passa.
- [ ] Prancha conferida.
**Tests**: unit
**Gate**: build

---

### T15: CursedFx

**What**: Classe que desenha rastro, chamas, estilhaços, anel, espinhos, rachadura e resíduo, com teto de 40 e `destroyAll`.
**Where**: `src/game/CursedFx.ts`
**Depends on**: None
**Reuses**: `Fx.burst`, `PALETTE`, `data/feel`, `impactSpikes`
**Requirement**: TRL-03, TRL-04, TRL-05, TRL-06, TRL-07, TRL-08, TRL-09, IMP-07, IMP-08, IMP-09, IMP-15, RCT-03, EDG-03, EDG-04
**Done when**:
- [ ] `npm run build` passa; cores só `d`, `c`, `C`, `u`, `U` (teste unitário sobre a constante de cores exportada).
**Tests**: unit
**Gate**: build

---

### T16: ImpactFrame

**What**: postFX `impactFrame` por 2 quadros renderizados, dedup por `swingId`, `degraded` sem WebGL.
**Where**: `src/game/ImpactFrame.ts`
**Depends on**: T15
**Reuses**: criação do ColorMatrix de `KokusenFx.ts:136`
**Requirement**: IMP-11, IMP-12, IMP-14, EDG-05
**Done when**:
- [ ] `npm run build` passa.
**Tests**: none
**Gate**: build

---

### T17: Player: fase do golpe, swingId e passo à frente

**What**: Callback `onStrikePhase(name, phase)`, `swingId` em cada golpe iniciado e no `Hit`, `StepIn` aplicado no startup dos golpes de chão parando no contato.
**Where**: `src/game/Player.ts`
**Depends on**: T16
**Reuses**: `StepIn`, `onMove`
**Requirement**: POS-07, POS-08, POS-09, IMP-14, TRL-07, TRL-08, EDG-02
**Done when**:
- [ ] `npm run build && npm test` passam.
**Tests**: none
**Gate**: build

---

### T18: Cena: rastro e chamas

**What**: Na `TestScene`, criar o rastro no `active` e manter as chamas no startup do forte; `fx.trails` no snapshot; EDG-01 avisa uma vez.
**Where**: `src/scenes/TestScene.ts`
**Depends on**: T17
**Reuses**: `CursedFx`, `STRIKE_POINTS`, `strikeToWorld`
**Requirement**: TRL-03, TRL-07, TRL-08, TRL-10, EDG-01, EDG-04
**Done when**:
- [ ] `npm run build && npm test` passam.
**Tests**: none
**Gate**: build

---

### T19: Cena: impacto em camadas

**What**: `onMeleeImpact` chamado do `onConnect` para o golpe corpo a corpo do jogador: tier, `CursedFx.impact`, `ImpactFrame` (sem Kokusen, sem pausa), rachadura na queda, sem `spark`/`shake`, evento `impact:<tier>`, `fx.lastImpact`.
**Where**: `src/scenes/TestScene.ts`
**Depends on**: T18
**Reuses**: `impactTier`, `CursedFx`, `ImpactFrame`
**Requirement**: IMP-06, IMP-11, IMP-12, IMP-13, IMP-14, IMP-15, IMP-16, CAM-06, EDG-05
**Done when**:
- [ ] `npm run build && npm test` passam; suíte de smokes inteira roda e só asserts de faísca/tremida do golpe do jogador mudam.
**Tests**: none
**Gate**: full

---

### T20: Inimigo desliza e esbarra

**What**: `Enemy.slide`, `slideView`, resíduo a cada 40 ms, parada na parede; a cena faz o inimigo tocado tocar `body` sem dano e sem postura; `enemies[].slide` no snapshot.
**Where**: `src/game/Enemy.ts`
**Depends on**: None
**Reuses**: `Slide`, `pickHitReaction`
**Requirement**: RCT-01, RCT-02, RCT-03, RCT-04, RCT-05, RCT-06
**Done when**:
- [ ] `npm run build && npm test` passam.
**Tests**: none
**Gate**: build

---

### T21: Câmera que reage

**What**: Tranco no forte, micro-zoom no decisivo (não durante o zoom do finalizador), câmera lenta na quebra de postura, no Contra e no último inimigo da onda.
**Where**: `src/scenes/TestScene.ts`
**Depends on**: T20
**Reuses**: `CameraKick`, `ZoomPulse`, `SlowMo.trigger`
**Requirement**: CAM-01, CAM-02, CAM-03, CAM-04, CAM-05, CAM-07, CAM-08
**Done when**:
- [ ] `npm run build && npm test` passam.
**Tests**: none
**Gate**: build

---

### T22: Linhas de foco

**What**: `FocusLines` na camada de UI no golpe decisivo.
**Where**: `src/game/FocusLines.ts`
**Depends on**: T21
**Reuses**: camada de UI (AD-003), `data/feel`
**Requirement**: FOC-01, FOC-02
**Done when**:
- [ ] `npm run build` passa.
**Tests**: none
**Gate**: build

---

### T23: Smoke do impacto

**What**: Um smoke que confere no jogo: `fx.trails` com 4 e 8 px; `fx.lastImpact.tier` light/heavy/decisive; `impactFrame` true no Contra; `enemies[].slide` no golpe forte; passo à frente de 10 px num forte no ar vazio.
**Where**: `scripts/smoke/impact.smoke.mjs`
**Depends on**: T22
**Reuses**: `fight-kit.mjs`
**Requirement**: TRL-04, TRL-05, TRL-10, IMP-16, RCT-01, RCT-06, POS-07
**Done when**:
- [ ] Passa 3 vezes seguidas; suíte inteira passa.
**Tests**: smoke
**Gate**: full

---

### T24: README

**What**: Seção "Feel do combate" com onde ajustar (`src/data/feel.ts`, `strikePoints.ts`) e a nova altura do frame.
**Where**: `README.md`
**Depends on**: T23
**Reuses**: texto atual
**Requirement**: TRL-01
**Done when**:
- [ ] Texto bate com o código.
**Tests**: none
**Gate**: build

---

## Phase Execution Map

```
Phase 1 ∥ Phase 2 → Phase 3 → Phase 4

Phase 1:  T1 → T2 → T3 → T4 → T5 → T6 → T7
Phase 2:  T8 → T9 → T10 → T11 → T12 → T13 → T14
Phase 3:  T15 → T16 → T17 → T18 → T19
Phase 4:  T20 → T21 → T22 → T23 → T24
```

Lotes: A = T1–T7 (núcleo puro); B = T8–T11 e C = T12–T14 (arte); D = T15–T17; E = T18–T19; F = T20–T22; G = T23–T24.

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 a T8 | 1 módulo puro cada | ✅ |
| T9, T12 | `player.ts`, uma responsabilidade cada | ✅ |
| T10, T11, T14 | `playerMoves.ts`, um grupo de golpes cada | ✅ |
| T13 | 1 arquivo de dados de arte | ✅ |
| T15, T16, T22 | 1 adaptador novo cada | ✅ |
| T17, T20 | 1 adaptador existente cada | ✅ |
| T18, T19, T21 | `TestScene.ts`, um trecho cada | ✅ |
| T23 | 1 smoke | ✅ |
| T24 | 1 documento | ✅ |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1, T8, T15, T20 | None | início de fase | ✅ |
| T2 a T7 | task anterior | T1 → … → T7 | ✅ |
| T9 a T14 | task anterior | T8 → … → T14 | ✅ |
| T16 a T19 | task anterior | T15 → … → T19 | ✅ |
| T21 a T24 | task anterior | T20 → … → T24 | ✅ |

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 a T8 | lógica pura | unit | unit | ✅ |
| T9 a T14 | arte em grade | unit | unit | ✅ |
| T15 | adaptador (constante de cor testável) | smoke | unit | ✅ (a constante de cor é pura; o resto cai no smoke da T23) |
| T16 a T22 | adaptador Phaser | smoke | none | ✅ (coberto pela T23, L-040) |
| T23 | smoke | smoke | smoke | ✅ |
| T24 | documentação | none | none | ✅ |
