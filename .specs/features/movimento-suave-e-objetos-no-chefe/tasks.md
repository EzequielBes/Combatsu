# Movimento suave e objetos que acertam o chefe — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/movimento-suave-e-objetos-no-chefe/spec.md`
**Design**: inline nesta página (feature Medium, sem `design.md`)
**Status**: In Progress
**Branch**: `feat/movimento-suave-e-objetos-no-chefe`, a partir de `feat/sprite-chefes-e-acabamento` (ainda fora de `dev`); vai para `dev` depois dela, com `--no-ff` (AD-008)

## Design inline

- `src/core/collision.ts`: `propSwing` e `propThrown` ganham `BOSS` na máscara. `boss` e `bossAirborne` já aceitam `HITBOX`, a categoria dos dois filtros de objeto, então o objeto acerta o chefe no chão e no salto, como a hitbox do player.
- `src/core/stepLerp.ts` (novo, puro): `STEP_BUFFER_MARGIN = 1.5`, `stepAlpha(buffer, passo)`, `StepLerp` (`push`, `at`).
- `src/core/cameraFollow.ts` (novo, puro): `followCenter(centro, alvo, cfg, dtMs)`, `clampCenter`, `scrollFor(centro, canvas, zoom)`.
- `src/game/physics.ts`: `renderAlpha(scene)` lê `matter.world.runner.timeBuffer` e `.delta`.
- `Player`, `Enemy`, `Boss`: um `StepLerp` alimentado no evento `afterupdate` do Matter; o sprite visível, a barra e a arma usam `renderPos`; o objeto na mão segue a posição de desenho do player.
- `TestScene`: a câmera do mundo perde `startFollow`/`setDeadzone`/`roundPixels`; `followCamera(dt)` roda todo quadro com o `dt` real, inclusive no hitstop. O snapshot ganha `player.view`, `enemies[].view`, `boss.view`, `camera.center`, `camera.scroll`, `camera.roundPixels` e `camera.phaserFollow`.

---

## Test Coverage Matrix

> Guidelines: `vitest.config.ts`; `.specs/STATE.md` AD-001/003; lições confirmadas L-010 (limiares dos dois lados) e L-043 (testar a chamada do adaptador).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Lógica pura (`src/core/**`) | unit | 1:1 com os ACs; limites exatos dos dois lados | `tests/core/*.test.ts` | `npm test` |
| Adaptadores Phaser (`Player`, `Enemy`, `Boss`, `TestScene`, `physics`, `debugApi`) | smoke | Valores lidos do estado vivo no snapshot; `none` nas tasks de adaptador, cobertas pela T7 | `scripts/smoke/*.smoke.mjs` | `npm run smoke` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tasks com testes unitários | `npm run typecheck && npm test` |
| Build | Tasks de adaptador | `npm run build && npm test` |
| Full | Task de smoke e última task | `npm run build && npm test && npm run smoke` |

---

## Execution Plan

7 tasks, um lote só: execução inline.

### Phase 1: Núcleo puro

```
T1 → T2 → T3
```

### Phase 2: Adaptadores

```
T4 → T5 → T6
```

### Phase 3: Smoke

```
T7
```

---

## Task Breakdown

### T1: Objetos colidem com o chefe

**What**: `BOSS` na máscara de `propSwing` e `propThrown`.
**Where**: `src/core/collision.ts`, `tests/core/collision.test.ts`
**Depends on**: None
**Reuses**: `collides`, testes existentes dos filtros
**Requirement**: PRB-01, PRB-02, PRB-03

**Done when**:

- [ ] PRB-01: `collides(Filters.propThrown, Filters.boss)` é `true`.
- [ ] PRB-02: `collides(Filters.propSwing, Filters.boss)` é `true`.
- [ ] PRB-03: `propThrown` e `propSwing` colidem com `bossAirborne` e não colidem com `propRest`.
- [ ] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `fix(core): let held and thrown props hit the boss`

---

### T2: Interpolação entre passos de física

**What**: `stepAlpha` e `StepLerp`.
**Where**: `src/core/stepLerp.ts`, `tests/core/stepLerp.test.ts`
**Depends on**: T1
**Reuses**: `Vec2` de `src/core/hit.ts`
**Requirement**: ITP-01, ITP-02, ITP-03, EDG-01

**Done when**:

- [ ] ITP-01: `stepAlpha` devolve `buffer / passo − 0,5` limitado a 0..1, com os limites conferidos dos dois lados.
- [ ] ITP-02: `at(alfa)` interpola entre a posição anterior e a atual.
- [ ] ITP-03: salto de mais de 48 px não interpola; 48 px exatos interpola.
- [ ] EDG-01: passo ≤ 0 devolve 1.
- [ ] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): interpolate positions between fixed physics steps`

---

### T3: Câmera que segue por tempo, sem arredondar o estado

**What**: `followCenter`, `clampCenter` e `scrollFor`, com a simulação de 60, 75, 120 e 144 Hz.
**Where**: `src/core/cameraFollow.ts`, `tests/core/cameraFollow.test.ts`
**Depends on**: T2
**Reuses**: `StepLerp`, `stepAlpha`
**Requirement**: CAM-01, CAM-02, CAM-03, CAM-04, CAM-05, CAM-06, ITP-04

**Done when**:

- [ ] CAM-01 a CAM-06 conferidos com os valores da spec.
- [ ] ITP-04: a simulação dá variação na tela ≤ 1 px nas quatro taxas; a mesma simulação com o método antigo (floor na realimentação, sem interpolar) passa de 1 px.
- [ ] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add a time-based camera follow that keeps its state in float`

---

### T4: Player desenhado na posição interpolada

**What**: `renderAlpha`; `StepLerp` no player; sprite visível e objeto na mão na posição de desenho; `player.view` no snapshot.
**Where**: `src/game/physics.ts`, `src/game/Player.ts`, `src/scenes/TestScene.ts`, `src/game/debugApi.ts`
**Depends on**: None
**Reuses**: `StepLerp`, `stepAlpha`
**Requirement**: ITP-05, EDG-02

**Done when**:

- [ ] O sprite visível e o objeto na mão usam `renderPos`; hitbox e física continuam no corpo.
- [ ] O snapshot expõe `player.view`.
- [ ] Gate check passes: `npm run build && npm test`

**Tests**: none
**Gate**: build
**Commit**: `feat(game): draw the player between physics steps`

---

### T5: Inimigo e chefe desenhados na posição interpolada

**What**: `StepLerp` no inimigo comum e no chefe; `view` de cada um no snapshot.
**Where**: `src/game/Enemy.ts`, `src/game/Boss.ts`, `src/scenes/TestScene.ts`, `src/game/debugApi.ts`
**Depends on**: T4
**Reuses**: `renderAlpha`, `StepLerp`
**Requirement**: ITP-07

**Done when**:

- [ ] Sprite, barra e arma do inimigo e sprite do chefe usam a posição de desenho.
- [ ] O snapshot expõe `enemies[].view` e `boss.view`.
- [ ] Gate check passes: `npm run build && npm test`

**Tests**: none
**Gate**: build
**Commit**: `feat(game): draw enemies and the boss between physics steps`

---

### T6: Câmera do mundo com o seguidor novo

**What**: sai `startFollow`/`setDeadzone`/`roundPixels`; entra `followCamera(dt)`; snapshot com `camera.center`, `camera.scroll`, `camera.roundPixels` e `camera.phaserFollow`.
**Where**: `src/scenes/TestScene.ts`, `src/game/debugApi.ts`
**Depends on**: T5
**Reuses**: `followCenter`, `scrollFor`
**Requirement**: CAM-07, ITP-06

**Done when**:

- [ ] A câmera segue `player.renderPos` todo quadro com o `dt` real.
- [ ] O snapshot expõe os quatro campos novos da câmera.
- [ ] Gate check passes: `npm run build && npm test`

**Tests**: none
**Gate**: build
**Commit**: `feat(game): follow the player with the float camera`

---

### T7: Smokes do arremesso no chefe e do movimento

**What**: `boss-prop.smoke.mjs` e `feel.smoke.mjs`.
**Where**: `scripts/smoke/boss-prop.smoke.mjs`, `scripts/smoke/feel.smoke.mjs`
**Depends on**: None
**Reuses**: padrão de `boss.smoke.mjs` e `fight-kit.mjs`
**Requirement**: PRB-04, ITP-05, ITP-06, ITP-07, CAM-07, EDG-02

**Done when**:

- [ ] PRB-04: garrafa arremessada no chefe em `rest` tira exatamente 12 de vida e fica `breaking`.
- [ ] ITP-05: correndo, `player.view.x` é o ponto médio dos dois últimos x do corpo (±0,01).
- [ ] ITP-06: correndo em regime, a variação na tela é ≤ 1 px.
- [ ] ITP-07: andando, `enemies[].view.x` é o ponto médio dos dois últimos x do corpo (±0,01); o mesmo para `boss.view.x` na investida.
- [ ] CAM-07: `camera.roundPixels` é `false` e `camera.phaserFollow` é `false`.
- [ ] EDG-02: depois de renascer, `player.view` é igual à posição do corpo.
- [ ] Gate check passes: `npm run build && npm test && npm run smoke`

**Tests**: smoke
**Gate**: full
**Commit**: `test(smoke): cover props hitting the boss and smooth movement`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3

Phase 1:  T1 ------→ T2 ------→ T3
Phase 2:  T4 ------→ T5 ------→ T6
Phase 3:  T7
```

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | 2 máscaras + testes | ✅ Granular |
| T2 | 1 módulo puro + testes | ✅ Granular |
| T3 | 1 módulo puro + testes | ✅ Granular |
| T4 | player + helper + campo do snapshot | ⚠️ Coeso (um fio só: da física ao sprite do player) |
| T5 | inimigo e chefe, mesma mudança | ⚠️ Coeso |
| T6 | câmera da cena + campos do snapshot | ✅ Coeso |
| T7 | 2 cenários de smoke | ✅ Coeso |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | início da fase 1 | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | None | início da fase 2 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |
| T7 | None | sozinha na fase 3 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Lógica pura | unit | unit | ✅ OK |
| T2 | Lógica pura | unit | unit | ✅ OK |
| T3 | Lógica pura | unit | unit | ✅ OK |
| T4 | Adaptador | smoke (none na task, coberto pela T7) | none | ✅ OK |
| T5 | Adaptador | smoke (none na task, coberto pela T7) | none | ✅ OK |
| T6 | Adaptador | smoke (none na task, coberto pela T7) | none | ✅ OK |
| T7 | Smoke | smoke | smoke | ✅ OK |
