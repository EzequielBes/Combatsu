# Polimento do sprite do player — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/sprite-player-polish/spec.md`
**Design**: `.specs/features/sprite-player-polish/design.md`
**Status**: In progress
**Branch**: `feat/sprite-player-polish` (a partir de `dev`; volta para `dev` com `--no-ff` após o Verifier PASS, AD-008)

---

## Test Coverage Matrix

> Guidelines: `vitest.config.ts`; `.specs/STATE.md` AD-001/002; lição confirmada L-010 (limiares dos dois lados).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Lógica pura (`src/core/**`) | unit | 1:1 com os ACs; `LAND_MS` e `APEX_VY` testados exatamente no limite, dos dois lados | `tests/core/animState.test.ts` | `npm test` |
| Arte (`src/game/art/**` sem phaser) | unit | Contagens e posições de texel iguais à spec; bbox contra a fixture congelada | `tests/game/art.test.ts` | `npm test` |
| Adaptador Phaser (`src/game/Player.ts`, `src/game/art/index.ts`) | smoke | Frame `land-*` visível logo após o pouso | `scripts/smoke/*.smoke.mjs` | `npm run smoke` |
| Ferramenta (`tools/sprite-preview.mjs`) e fio do `Player` (T11, coberto pelo smoke da T12) | none | Roda com exit 0 e grava os PNGs | — | `node tools/sprite-preview.mjs <dir>` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tasks com testes unitários | `npm run typecheck && npm test` |
| Build | Tasks de adaptador e a última de cada fase | `npm run build && npm test` |
| Full | Tasks que mexem nos smokes | `npm run build && npm test && npm run smoke` |

---

## Execution Plan

### Phase 1: Fundação (linha de base, paleta, timing, estados) — worker W1

```
T1 → T2 → T3 → T4 → T5
```

### Phase 2: Arte das partes — worker W2

```
T6 → T7 → T8 → T9
```

### Phase 3: Frames novos e integração — worker W3

```
T10 → T11 → T12
```

---

## Task Breakdown

### T1: Congelar a linha de base das bboxes

**What**: gerar `tests/game/fixtures/playerBBoxBaseline.json` com a bbox `[x0, y0, x1, y1]` (texels não transparentes) de cada frame de `PLAYER_FRAMES`, `PLAYER_MOVE_FRAMES` e `PLAYER_TECH_FRAMES` **no estado atual** (102 frames), e um teste que compara cada frame da fixture com o frame atual, com tolerância de ±2 por borda. O gerador é um script único que não precisa ficar no repo; a fixture é o artefato.
**Where**: `tests/game/fixtures/playerBBoxBaseline.json`, `tests/game/art.test.ts`
**Depends on**: None
**Reuses**: imports já usados em `tests/game/art.test.ts`
**Requirement**: SPR-06

**Done when**:

- [ ] A fixture tem 102 entradas, geradas antes de qualquer mudança de arte.
- [ ] SPR-06 conferido: Each frame that existed before this feature SHALL have its bounding box within 2 texels of the frozen baseline on each edge.
- [ ] O teste falha se uma borda se move 3 texels (testado localmente e revertido).
- [ ] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `test(art): freeze player frame bounding-box baseline`

---

### T2: Ferramenta de preview de sprites

**What**: `tools/sprite-preview.mjs` conforme o design §7. Grava `player-sheet.png` (todos os frames do player, rotulados, a 4x) e `anim-<name>.png` por animação de `PLAYER_ANIMS`. `docs/art/` vai para o `.gitignore`. Rodar uma vez e guardar a prancha "antes" em `docs/art/before/`.
**Where**: `tools/sprite-preview.mjs`, `.gitignore`
**Depends on**: T1
**Reuses**: localização do Edge em `scripts/smoke/run.mjs`; `PALETTE`, `compose`/frames
**Requirement**: SPR-15

**Done when**:

- [ ] SPR-15 conferido: WHEN `node tools/sprite-preview.mjs [outDir]` runs THEN it SHALL write `player-sheet.png` (every player frame labelled) and one `anim-<name>.png` per player animation into `outDir` (default `docs/art/`) and exit 0.
- [ ] `docs/art/before/player-sheet.png` existe (não versionado).
- [ ] Gate check passes: `npm run typecheck && npm test`

**Tests**: none
**Gate**: quick
**Commit**: `feat(tools): add sprite preview sheet generator`

---

### T3: Cinco cores novas na paleta

**What**: adicionar `o`, `x`, `j`, `y`, `z` com os valores do design §2; atualizar o teste de paleta.
**Where**: `src/game/art/palette.ts`, `tests/game/art.test.ts`
**Depends on**: T2
**Reuses**: —
**Requirement**: SPR-01

**Done when**:

- [ ] SPR-01 conferido: The palette SHALL contain exactly the 5 new keys `o`, `x`, `j`, `y`, `z` in addition to the previous 34, totalling 39 keys.
- [ ] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(art): add selective-outline and rim-light palette colors`

---

### T4: Duração por frame nas animações

**What**: `AnimDef.durations?`, a função pura `animFrameConfigs(name, def)` (em `player.ts` ou num módulo puro de arte), e `registerAnims` usando essa função para passar `duration` por frame.
**Where**: `src/game/art/sprites/player.ts`, `src/game/art/index.ts`, `tests/game/art.test.ts`
**Depends on**: T3
**Reuses**: `registerAnims`
**Requirement**: SPR-08

**Done when**:

- [ ] SPR-08 conferido: WHEN an `AnimDef` declares `durations` THEN it SHALL have one positive duration per frame, and `registerAnims` SHALL pass each one as the frame's `duration`.
- [ ] Edge: tamanho diferente lança erro com o nome da animação; duração 0 lança erro, duração 1 passa.
- [ ] Gate check passes: `npm run build && npm test`

**Tests**: unit
**Gate**: build
**Commit**: `feat(art): support per-frame durations in animation defs`

---

### T5: Estados `land` e `apex` no animState

**What**: design §6 no core: `LAND_MS`, `APEX_VY`, `landMs` em `PlayerAnimInput`, precedência nova. Ajustar os testes existentes para passar `landMs: Infinity`.
**Where**: `src/core/animState.ts`, `tests/core/animState.test.ts`
**Depends on**: T4
**Reuses**: `pickPlayerAnim`
**Requirement**: SPR-10, SPR-11

**Done when**:

- [ ] SPR-10 conferido: WHEN the player is grounded, not hurt, not attacking, not holding, and `landMs < LAND_MS` (120) THEN `pickPlayerAnim` SHALL return `land`; WHEN `landMs >= LAND_MS` THEN it SHALL NOT return `land`. Testado em 119 e 120.
- [ ] SPR-11 conferido: WHILE the player is airborne, not hurt, not attacking, and `|vy| < APEX_VY` (60) `pickPlayerAnim` SHALL return `apex`; at `|vy| >= APEX_VY` it SHALL return `jump` (vy < 0) or `fall` (vy > 0). Testado em ±59 e ±60.
- [ ] Edge: segurando objeto → `carry-*`; golpe e hurt vencem `land`.
- [ ] Gate check passes: `npm run typecheck && npm test` (o `Player.ts` compila com `landMs: Infinity` provisório até a T11)

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add land and apex player animation states`

---

### T6: Sel-out em `compose`, cabeça e tronco novos

**What**: passe de sel-out do design §1 (função pura exportada) e redesenho de `HEAD`, `HEAD_FOCUS`, `HEAD_HURT`, `HEAD_SWAY` (novo, exportado) e `BODY` a partir das grades-alvo do design §3.
**Where**: `src/game/art/sprites/player.ts`, `tests/game/art.test.ts`
**Depends on**: None (fase anterior inteira)
**Reuses**: `compose`, `pose`
**Requirement**: SPR-03, SPR-04, SPR-05, SPR-02, SPR-06

**Done when**:

- [ ] Teste unitário do passe: `k` interno com vizinhos de pele vira `x`, de cabelo vira `h`, os demais viram `o`; `k` na borda e `b` não mudam.
- [ ] SPR-03 conferido: The `idle-0` frame SHALL have at most 8 interior `k` texels (baseline 17).
- [ ] SPR-04 conferido: The head rows (0–10) of `idle-0` SHALL contain the eye white `w` horizontally adjacent to a dark pupil (`b` or `k`), and the three hair tones `h`, `j` and `H`.
- [ ] SPR-05 conferido: The torso rows (11–17) of `idle-0` SHALL contain the gold button `A`, the rim light `y` and the inner line `o`.
- [ ] SPR-06 e o teste de alcance continuam verdes.
- [ ] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(art): add selective outline pass and redraw player head and torso`

---

### T7: Braços e pernas com acabamento

**What**: design §3 (braços, `armStraight`, pernas, `RUN_LEGS`, `legStraight`, `LEG_CHAMBER`, `LEG_SUPPORT`), com as mesmas dimensões e encaixes. Conferir na prancha do preview.
**Where**: `src/game/art/sprites/player.ts`
**Depends on**: T6
**Reuses**: —
**Requirement**: SPR-02, SPR-06, SPR-07

**Done when**:

- [ ] SPR-02 conferido: Every frame of `PLAYER_FRAMES`, `PLAYER_MOVE_FRAMES` and `PLAYER_TECH_FRAMES` SHALL parse with `parseSheet` using only palette keys, at 32x24 texels.
- [ ] SPR-07 conferido: In every `*-hit` frame checked by the hitbox reach test, the limb SHALL still reach the hitbox edge (up to 1 texel beyond), at the hitbox height.
- [ ] SPR-06 verde.
- [ ] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(art): refine player arms, legs and shoes`

---

### T8: Acabamento nas partes de golpes e técnicas

**What**: aplicar o mesmo acabamento às partes locais de `playerMoves.ts` (`armElbow`, `armPalm`, `LEG_KNEE_UP`, `legDown` e as demais) e de `playerTech.ts`. Conferir a prancha completa.
**Where**: `src/game/art/sprites/playerMoves.ts`, `src/game/art/sprites/playerTech.ts`
**Depends on**: T7
**Reuses**: partes exportadas de `player.ts`
**Requirement**: SPR-02, SPR-06

**Done when**:

- [ ] SPR-02 e SPR-06 verdes, incluindo o teste de silhuetas distintas das técnicas.
- [ ] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(art): carry player finish over to move and technique parts`

---

### T9: Smear nos golpes

**What**: design §4 em `jab-hit`, `cross-hit` e `kick-hit`.
**Where**: `src/game/art/sprites/player.ts`, `tests/game/art.test.ts`
**Depends on**: T8
**Reuses**: `compose`
**Requirement**: SPR-14

**Done when**:

- [ ] SPR-14 conferido: The frames `jab-hit`, `cross-hit` and `kick-hit` SHALL each have at least 3 more `S` texels than their own `*-wind` frame, and every `S` texel added SHALL sit at a column smaller than the frame's rightmost non-transparent column (the limb tip used by the reach test).
- [ ] SPR-07 verde.
- [ ] Gate check passes: `npm run build && npm test`

**Tests**: unit
**Gate**: build
**Commit**: `feat(art): add motion smears to player hit frames`

---

### T10: Frames novos de idle, pulo, ápice, queda, pouso e hurt

**What**: frames e `PLAYER_ANIMS` da tabela do design §5 (com `durations`), incluindo os `durations` da corrida.
**Where**: `src/game/art/sprites/player.ts`, `tests/game/art.test.ts`
**Depends on**: None (fase anterior inteira)
**Reuses**: `pose`, `HEAD_SWAY`
**Requirement**: SPR-09, SPR-12

**Done when**:

- [ ] SPR-09 conferido: The `idle` animation SHALL have 4 frames with no two consecutive frames identical, looping.
- [ ] SPR-12 conferido: The animations `jump` (≥ 2 frames, plays once), `apex` (≥ 1 frame), `fall` (≥ 2 frames, loops), `land` (2 frames, plays once) and `hurt` (2 frames) SHALL exist, and every frame they cite SHALL exist in the sheet.
- [ ] Gate check passes: `npm run build && npm test`

**Tests**: unit
**Gate**: build
**Commit**: `feat(art): add breathing idle and full jump-land cycle frames`

---

### T11: `Player` alimenta `landMs`

**What**: design §6 no `Player.ts`.
**Where**: `src/game/Player.ts`
**Depends on**: T10
**Reuses**: detecção de `landed` em `kickUpDust`
**Requirement**: SPR-13

**Done when**:

- [ ] SPR-13 conferido: WHEN the player touches the ground after being airborne THEN `Player` SHALL feed `landMs = 0` to the animation selection and count it up with the frame time.
- [ ] Gate check passes: `npm run build && npm test`

**Tests**: none (coberto pelo smoke da T12)
**Gate**: build
**Commit**: `feat(player): feed landing time to animation selection`

---

### T12: Smoke do pouso e do ápice

**What**: smoke novo `scripts/smoke/player-anim.smoke.mjs`. O player pula, e o smoke confere no estado vivo um frame `apex-0` no topo e um frame `land-*` até 120 ms depois do pouso; depois `idle-*`. Rodar a suíte inteira.
**Where**: `scripts/smoke/player-anim.smoke.mjs`, `scripts/smoke/run.mjs` (se precisar registrar), `src/game/debugApi.ts` (só se faltar expor o frame atual da view)
**Depends on**: T11
**Reuses**: `scripts/smoke/lib.ts`, `fight-kit.mjs`
**Requirement**: SPR-13, SPR-11

**Done when**:

- [ ] O smoke novo passa e falha se `landMs` não for zerado (testado localmente e revertido).
- [ ] Gate check passes: `npm run build && npm test && npm run smoke`

**Tests**: smoke
**Gate**: full
**Commit**: `test(smoke): cover player apex and landing frames`
