# Inimigos variados e reações de golpe — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/enemy-sprite-variety/spec.md`
**Design**: `.specs/features/enemy-sprite-variety/design.md`
**Status**: In progress
**Branch**: `feat/enemy-sprite-variety` (a partir de `dev`; volta para `dev` com `--no-ff` após o Verifier PASS, AD-008)

---

## Test Coverage Matrix

> Guidelines: `vitest.config.ts`; `.specs/STATE.md` AD-001/002/006/012; lição confirmada L-010 (limiares dos dois lados).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Lógica pura (`src/core/**`) | unit | 1:1 com os ACs; limites exatos | `tests/core/*.test.ts` | `npm test` |
| Arte (`src/game/art/**` sem phaser) | unit | Contagens, alcance, bbox, durações iguais à spec | `tests/game/*.test.ts` | `npm test` |
| Adaptadores Phaser (`Enemy`, `Ragdoll`, `TestScene`, `art/index.ts`, `debugApi`) | smoke | Frame e visibilidade lidos no estado vivo; `none` nas tasks de adaptador, cobertas pela fase 4 | `scripts/smoke/*.smoke.mjs` | `npm run smoke` |
| Ferramenta (`tools/sprite-preview.mjs`) | none | Roda com exit 0 | — | `node tools/sprite-preview.mjs` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tasks com testes unitários | `npm run typecheck && npm test` |
| Build | Tasks de adaptador e a última de cada fase | `npm run build && npm test` |
| Full | Tasks que mexem nos smokes | `npm run build && npm test && npm run smoke` |

---

## Execution Plan

### Phase 1: Núcleo puro e base de arte — worker W1

```
T1 → T2 → T3 → T4 → T5
```

### Phase 2: Arte das aparências e animações — worker W2

```
T6 → T7 → T8 → T9
```

### Phase 3: Integração no jogo — worker W3

```
T10 → T11 → T12
```

### Phase 4: Smoke — worker W4

```
T13
```

---

## Task Breakdown

### T1: Reação por golpe (`pickHitReaction`)

**What**: `src/core/hitReaction.ts` conforme o design §1 e o HRX-01.
**Where**: `src/core/hitReaction.ts`, `tests/core/hitReaction.test.ts`
**Depends on**: None
**Reuses**: `Hit`/`Strength` de `src/core/hit.ts`
**Requirement**: HRX-01

**Done when**:

- [x] HRX-01 conferido: `pickHitReaction(hit, last)` SHALL return `impact` for a heavy hit; `body` for `socoBaixo`, `rasteira`, `cotovelada`, `joelhada`, `chuteFrontal` and `chuteEmpurrao`; `uppercut` for `gancho`, `ganchoAscendente` and `chuteAlto`; and otherwise `head-b` WHEN `last` is `head-a`, else `head-a`.
- [x] Casos: cada nome das listas; golpe sem `moveName`; `last` nulo, `head-a`, `head-b`, `body`; forte com nome de corpo dá `impact`.
- [x] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): pick enemy hit reaction from move and strength`

---

### T2: Aparência sorteada com stream próprio

**What**: `src/core/enemyVariant.ts` e `variantRng` em `run.ts` (design §1).
**Where**: `src/core/enemyVariant.ts`, `src/core/run.ts`, `tests/core/enemyVariant.test.ts`, `tests/core/run.test.ts`
**Depends on**: T1
**Reuses**: `Rng`, padrão do `guardRng`
**Requirement**: EVR-04, EVR-05

**Done when**:

- [x] EVR-04 (parte pura) conferido: uniforme (10.000 sorteios, 33% ± 3% cada); mesma seed → mesma sequência; `lootRng` e `guardRng` dão, para a mesma seed, os mesmos números de antes.
- [x] EVR-05 (parte pura): `parseVariant` aceita os 3 ids e devolve `null` para qualquer outro.
- [x] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add seeded enemy variant draw`

---

### T3: `pickEnemyAnim` com reação

**What**: `EnemyAnimInput.reaction?` e o retorno `hurt-<reaction>` (design §1).
**Where**: `src/core/animState.ts`, `tests/core/animState.test.ts`
**Depends on**: T2
**Reuses**: `pickEnemyAnim`
**Requirement**: HRX-02, HRX-04

**Done when**:

- [x] `brain === 'hitstun'` + `reaction` → `hurt-<reaction>`; sem `reaction` → `hurt`; outros estados ignoram `reaction`.
- [x] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): route enemy hitstun to reaction animations`

---

### T4: `selOut` compartilhado e configurável

**What**: mover `selOut` para `src/game/art/selOut.ts` com `rules` e `fallback`; `player.ts` reexporta e mantém a regra atual como padrão.
**Where**: `src/game/art/selOut.ts`, `src/game/art/sprites/player.ts`, `tests/game/art.test.ts`
**Depends on**: T3
**Reuses**: `selOut` atual
**Requirement**: EVR-10

**Done when**:

- [x] Os testes do player (sel-out, SPR-06 com a fixture) continuam verdes sem mudar asserções.
- [x] Teste novo: com regra personalizada, `k` cercado do grupo vira a linha do grupo, e o fallback vale nos demais casos.
- [x] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `refactor(art): share configurable selective-outline pass`

---

### T5: Congelar a linha de base do inimigo e preparar o preview

**What**: `tests/game/fixtures/enemyBBoxBaseline.json` com as bboxes de `ENEMY_FRAMES` atuais (gerada antes de qualquer mudança de arte do inimigo), teste ±2 (EVR-07, ainda sobre `ENEMY_FRAMES`), e `tools/sprite-preview.mjs` com um alvo de inimigo (prancha e tiras). A prancha "antes" vai para `docs/art/enemy-before/`.
**Where**: `tests/game/fixtures/enemyBBoxBaseline.json`, `tests/game/art.test.ts`, `tools/sprite-preview.mjs`
**Depends on**: T4
**Reuses**: fixture e teste do SPR-06
**Requirement**: EVR-07

**Done when**:

- [x] EVR-07 conferido (sobre a folha atual): Each frame that existed before this feature SHALL, in the `corcunda` variant, have its bounding box within 2 texels of the frozen baseline on each edge.
- [x] `node tools/sprite-preview.mjs` gera também as pranchas do inimigo e sai com 0.
- [x] Gate check passes: `npm run build && npm test`

**Tests**: unit
**Gate**: build
**Commit**: `test(art): freeze enemy frame baseline and preview enemy sheets`

---

### T6: Kit de partes e `corcunda` refinado

**What**: reestruturar `enemy.ts` em `buildEnemyFrames(kit)` (design §1) e refazer o `corcunda` com sel-out, rampa de 3 tons e veias, mantendo os nomes de frame atuais. `ENEMY_FRAMES` = `corcunda`.
**Where**: `src/game/art/sprites/enemy.ts`, `tests/game/art.test.ts`
**Depends on**: None (fase anterior inteira)
**Reuses**: `selOut`, `compose`, `AnimDef`
**Requirement**: EVR-03, EVR-07, EVR-10

**Done when**:

- [x] EVR-03 conferido para `corcunda`: In every variant, the `attack` frame claw SHALL reach the edge of the `ENEMY_ATTACK` hitbox (up to 1 texel beyond), at the hitbox height.
- [x] EVR-07 e EVR-10 (`corcunda`) verdes.
- [x] Prancha conferida visualmente contra `docs/art/enemy-before/`.
- [x] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(art): rebuild enemy sheet from a part kit and refine the hunchback`

---

### T7: Aparências `rastejante` e `bruto` e ragdoll por aparência

**What**: os dois kits novos (design §2), `ENEMY_VARIANT_FRAMES` e `ENEMY_RAG_VARIANTS`, com o mesmo tamanho de partes do ragdoll.
**Where**: `src/game/art/sprites/enemy.ts`, `tests/game/art.test.ts`
**Depends on**: T6
**Reuses**: `buildEnemyFrames`
**Requirement**: EVR-01, EVR-02, EVR-03, EVR-10

**Done when**:

- [x] EVR-01 conferido: The enemy art SHALL provide the 3 variants `corcunda`, `rastejante` and `bruto`, each with every frame cited by `ENEMY_ANIMS`, at 32x24 texels, using only palette keys.
- [x] EVR-02 conferido: Each pair of variants SHALL differ in at least 25% of the non-transparent texels of the `idle-0` frame (same position, different key or transparency), and the dominant body color of each variant SHALL be different (`i`/`I`, `g`/`G`, `v`/`u`).
- [x] EVR-03 e EVR-10 verdes nas 3 aparências; as partes do ragdoll das 3 têm os tamanhos 8x7, 8x10 e 3x8.
- [x] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(art): add crawler and brute enemy variants`

---

### T8: Animações de movimento do inimigo

**What**: idle 4, walk 6, windup 2, attack 2 (com smear), getup 3, com `durations` (design §3), nas 3 aparências.
**Where**: `src/game/art/sprites/enemy.ts`, `tests/game/art.test.ts`
**Depends on**: T7
**Reuses**: `HEAD`/`EYE_GLOW` do kit
**Requirement**: EVR-08, EVR-09

**Done when**:

- [ ] EVR-08 conferido: In every variant, `idle` SHALL have at least 4 frames, `walk` at least 6, `windup` 2, `attack` 2 and `getup` at least 3, all with `durations`, and every cited frame SHALL exist.
- [ ] EVR-09 conferido: The `windup` animation SHALL hold its last frame (`windup-1`) for at least the final 200 ms of `ENEMY_AI.windupMs` (450): the sum of the durations before `windup-1` SHALL be ≤ 250 ms. Testado com 250 e 251.
- [ ] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(art): add fluid idle, walk, windup, attack and getup enemy cycles`

---

### T9: Frames de reação e de impacto

**What**: `hurt-head-a/b`, `hurt-uppercut`, `hurt-body` (3 frames cada) e `impact`, nas 3 aparências (design §3).
**Where**: `src/game/art/sprites/enemy.ts`, `tests/game/art.test.ts`
**Depends on**: T8
**Reuses**: poses do kit
**Requirement**: HRX-03

**Done when**:

- [ ] HRX-03 conferido: Each light reaction animation (`hurt-head-a`, `hurt-head-b`, `hurt-uppercut`, `hurt-body`) SHALL have 3 frames with durations 60, 90 and 70 ms, plays once, in every variant; the first frame SHALL differ from the `idle-0` bounding box by at least 2 texels on some edge (visible snap).
- [ ] O frame `impact` existe nas 3 aparências.
- [ ] Tiras conferidas visualmente.
- [ ] Gate check passes: `npm run build && npm test`

**Tests**: unit
**Gate**: build
**Commit**: `feat(art): add enemy hit reaction and heavy impact frames`

---

### T10: Texturas e animações por aparência

**What**: `enemyTex`/`ragTex` em `textures.ts`, laço por aparência em `art/index.ts` (`enemyAnimKey(v, name)`) e `Ragdoll` recebendo a aparência e ganhando `setVisible`.
**Where**: `src/game/textures.ts`, `src/game/art/index.ts`, `src/game/Ragdoll.ts`
**Depends on**: None (fase anterior inteira)
**Reuses**: `registerSheet`, `registerAnims`
**Requirement**: EVR-06

**Done when**:

- [ ] EVR-06 (registro): as 9 texturas de ragdoll (`rag-<part>-<v>`) e as 3 folhas existem depois de `createArt`.
- [ ] Gate check passes: `npm run build && npm test`

**Tests**: none
**Gate**: build
**Commit**: `feat(art): register enemy sheets, anims and ragdoll parts per variant`

---

### T11: `Enemy` com aparência, reação leve e pose de impacto

**What**: design §4 no `Enemy.ts`, com `variant` no construtor e no snapshot de debug (`variant`, `frame`, `ragdollVisible`).
**Where**: `src/game/Enemy.ts`, `src/game/debugApi.ts`
**Depends on**: T10
**Reuses**: `pickHitReaction`, `pickEnemyAnim`
**Requirement**: HRX-02, HRX-04, HRX-05, HRX-06, EVR-06

**Done when**:

- [ ] Gate check passes: `npm run build && npm test`
- [ ] Os smokes existentes do inimigo continuam passando (`fight`, `enemy-guard`, `enemy-died`, `finisher`): `npm run smoke`.

**Tests**: none (coberto pelo smoke da T13)
**Gate**: full
**Commit**: `feat(enemy): play hit reactions and hold impact pose through hitstop`

---

### T12: Sorteio da aparência no spawn

**What**: `TestScene` sorteia com `run.variantRng` ou usa o override `?debug&enemyVariant=`.
**Where**: `src/scenes/TestScene.ts`
**Depends on**: T11
**Reuses**: `pickEnemyVariant`, `parseVariant`, padrão dos overrides de debug (≈ linha 729)
**Requirement**: EVR-04, EVR-05

**Done when**:

- [ ] Gate check passes: `npm run build && npm test && npm run smoke`

**Tests**: none (coberto pelo smoke da T13)
**Gate**: full
**Commit**: `feat(scene): draw enemy variant on spawn with debug override`

---

### T13: Smoke das aparências e reações

**What**: `scripts/smoke/enemy-react.smoke.mjs` (design §5).
**Where**: `scripts/smoke/enemy-react.smoke.mjs`
**Depends on**: None (fase anterior inteira)
**Reuses**: `scripts/smoke/lib.ts`, `fight-kit.mjs` (lição L-042: `enemyGuard=0`)
**Requirement**: EVR-04, EVR-05, EVR-06, HRX-02, HRX-04, HRX-05, HRX-06

**Done when**:

- [ ] EVR-05 conferido: WHERE `?debug&enemyVariant=<id>` is set with a valid id, every common enemy SHALL spawn with that variant; IF the id is invalid THEN the normal draw SHALL be used.
- [ ] EVR-04 conferido no jogo: mesma seed, mesma sequência de aparências nas 2 primeiras ondas.
- [ ] EVR-06 conferido: WHEN an enemy enters ragdoll THEN each of its 6 ragdoll part images SHALL use the texture key `rag-<part>-<variant>` (`part` = `head`, `torso` or `limb`) of that enemy's own variant.
- [ ] HRX-02 conferido: WHEN a light hit lands on an enemy that survives THEN the enemy SHALL play the `hurt-<reaction>` animation chosen by `pickHitReaction` with its effective strength, from its first frame, even if it was already in a hit reaction.
- [ ] HRX-04 conferido: WHILE the enemy is stunned by structure break or suppressed, the system SHALL keep showing the existing `hurt` frame (not a reaction animation).
- [ ] HRX-05 conferido: WHEN a heavy hit sends a surviving or dying enemy into ragdoll THEN, while the hitstop freeze lasts, the enemy sprite SHALL stay visible showing the `impact` frame and the ragdoll SHALL be hidden; on the first enemy update after the freeze, the sprite SHALL hide and the ragdoll SHALL show.
- [ ] HRX-06 conferido: IF a heavy hit lands with no hitstop freeze active THEN the swap to ragdoll SHALL happen on the next enemy update.
- [ ] O smoke falha se a troca sprite → ragdoll for imediata (testado localmente e revertido).
- [ ] Gate check passes: `npm run build && npm test && npm run smoke`

**Tests**: smoke
**Gate**: full
**Commit**: `test(smoke): cover enemy variants, hit reactions and impact pose`
