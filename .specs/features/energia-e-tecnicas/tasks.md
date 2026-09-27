# Energia e técnicas amaldiçoadas — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/energia-e-tecnicas/spec.md`
**Design**: `.specs/features/energia-e-tecnicas/design.md`
**Status**: Ready
**Branch**: `feat/energia-e-tecnicas` (a partir de `dev`; volta para `dev` com `--no-ff` após o Verifier PASS, AD-008)
**Test count before this feature**: 654

---

## Test Coverage Matrix

> Guidelines: `vitest.config.ts`; `.specs/STATE.md` AD-001/002/003/006/009/010; lição confirmada L-010 (limiares dos dois lados).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Lógica pura (`src/core/**`) | unit | 1:1 com os ACs; limites exatos dos dois lados | `tests/core/*.test.ts` | `npm test` |
| Dados e arte (`src/data/**`, `src/game/art/**` sem phaser) | unit | Números iguais à spec; grades com tamanho certo e só chaves da paleta | `tests/data/*.test.ts`, `tests/game/*.test.ts` | `npm test` |
| Adaptadores Phaser (`src/game/*.ts`, `src/scenes/**`) | smoke (fase 6) | Asserção no snapshot lendo o estado vivo; `none` nas tasks de adaptador das fases 4–5, cobertas pelos smokes da fase 6 | `scripts/smoke/*.smoke.mjs` | `npm run smoke` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tasks com testes unitários | `npm run typecheck && npm test` |
| Build | Última task de cada fase e tasks de adaptador | `npm run build && npm test` |
| Full | Tasks de smoke | `npm run build && npm test && npm run smoke` |

---

## Execution Plan

### Phase 1: Núcleo — energia, loadout, conjuração, camadas, loja (puro) — worker W1

```
T1 → T2 → T3 → T4 → T5 → T6
```

### Phase 2: Núcleo — técnicas (puro) — worker W2

```
T7 → T8 → T9 → T10 → T11 → T12
```

### Phase 3: Arte das técnicas — worker W3 (worktree paralelo à fase 2)

```
T13 → T14 → T15 → T16
```

### Phase 4: Técnicas no jogo — base — worker W4

```
T17 → T18 → T19 → T20 → T21
```

### Phase 5: As técnicas — worker W5

```
T22 → T23 → T24 → T25 → T26 → T27
```

### Phase 6: Laboratório e smoke — worker W6

```
T28 → T29 → T30 → T31
```

---

## Task Breakdown

### T1: Dados das técnicas e tuning

**What**: `src/data/techniques.ts` (`TechId`, `TechDef`, `TECHNIQUES`, `LEVEL_FACTOR`, `CE`, `KOKUSEN`, `CAST_FX`) com todos os números da spec e do design.
**Where**: `src/data/techniques.ts`
**Depends on**: None
**Reuses**: padrão de `src/data/tuning.ts`
**Requirement**: DIV-01, RED-01, BLU-01, CUT-01, TEC-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `tests/data/techniques.test.ts` confere cada número contra os ACs
- [x] DIV-01 conferido: The Punho Divergente SHALL have cost 20, cooldown 1200 ms, sign 60 ms, charge 60 ms, release 80 ms and recover 200 ms at level 1.
- [x] RED-01 conferido: The Vermelho SHALL have cost 45, cooldown 3000 ms, sign 250 ms, charge 350 ms, release 100 ms and recover 250 ms at level 1.
- [x] BLU-01 conferido: The Azul SHALL have cost 35, cooldown 4000 ms, sign 200 ms, charge 250 ms, release 100 ms and recover 200 ms at level 1.
- [x] CUT-01 conferido: The Desmantelar SHALL have cost 30, cooldown 2500 ms, sign 150 ms, charge 0 ms, release 150 ms and recover 200 ms at level 1.
- [x] TEC-14 conferido: For a technique at level `n` ∈ {1, 2, 3}, its cost SHALL be `baseCost − 5 × (n − 1)`, where `baseCost` is its level-1 cost (Vermelho: 45, 40, 35).
- [x] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(data): add technique definitions and tuning`

---

### T2: Energia amaldiçoada

**What**: `CursedEnergy` com `cur/max/regen`, `update(dtMs, casting)`, `gain`, `trySpend`, `setLevels(energia, fluxo)`, `reset`.
**Where**: `src/core/energy.ts`
**Depends on**: T1
**Reuses**: `CE` de T1
**Requirement**: CE-01, CE-02, CE-03, CE-04, CE-05, CE-07, CE-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Níveis de upgrade 5/6 (máx.) e 4/5 (regen) dos dois lados do teto
- [x] CE-01 conferido: WHEN a run starts THEN the player cursed energy SHALL be 100 with max 100 and regen 8 per second.
- [x] CE-02 conferido: The cursed energy SHALL never be below 0.
- [x] CE-03 conferido: The cursed energy SHALL never be above its max.
- [x] CE-04 conferido: WHILE no cast is in progress, the cursed energy SHALL increase by `regen × dt / 1000` per frame of game time, capped at max.
- [x] CE-05 conferido: WHILE a cast is in progress (any cast state), the cursed energy SHALL NOT regenerate.
- [x] CE-07 conferido: WHEN the max upgrade is applied at level `n` (n ≥ 0) THEN max SHALL be `min(100 + 20n, 200)`.
- [x] CE-09 conferido: WHEN the regen upgrade is applied at level `n` (n ≥ 0) THEN regen SHALL be `min(8 + 2n, 16)`.
- [x] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(core): add cursed energy`

---

### T3: Loadout de técnicas

**What**: `Loadout` com 2 slots, `equip`, `upgrade`, `levelOf`, `firstEmpty`, `cost`, `damage`, cooldowns (`start`, `tick`, `remaining`), `reset`.
**Where**: `src/core/loadout.ts`
**Depends on**: T2
**Reuses**: `TECHNIQUES`, `LEVEL_FACTOR`
**Requirement**: TEC-01, TEC-03, TEC-04, TEC-13, TEC-05, TEC-06, TEC-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Nível 0 e 4 recusados; arredondamento de meio para cima
- [x] TEC-01 conferido: WHEN a run starts without the `tech` debug parameter THEN both technique slots SHALL be empty (AD-005).
- [x] TEC-03 conferido: WHEN `equip(slot, id, level)` is called with a valid slot, a known id and a level in 1–3 THEN that slot SHALL hold that technique at that level.
- [x] TEC-04 conferido: IF `equip` is called with an id already in the other slot THEN both slots SHALL keep the technique and level they had before the call.
- [x] TEC-13 conferido: IF `equip` is called with an id already in the other slot THEN `equip` SHALL return `false`.
- [x] TEC-05 conferido: IF `equip` or `upgrade` would set a level outside 1–3 THEN the loadout SHALL stay unchanged and the call SHALL return `false`.
- [x] TEC-06 conferido: For a technique at level `n` ∈ {1, 2, 3}, each damage value SHALL be `round(base × k)`, with k = 1.0, 1.25 and 1.5 for n = 1, 2 and 3, where `base` is the level-1 value and `round` rounds halves up.
- [x] TEC-14 conferido: For a technique at level `n` ∈ {1, 2, 3}, its cost SHALL be `baseCost − 5 × (n − 1)`, where `baseCost` is its level-1 cost (Vermelho: 45, 40, 35).
- [x] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(core): add technique loadout`

---

### T4: Máquina de conjuração

**What**: `CastMachine` com `request(slot, ctx)` (recusas `energy|cooldown|busy`), estados `sign→charge→release→recover` com tempo 0 pulado, eventos de entrada, custo e recarga na entrada de `release`, `damageTaken()` que cancela em `sign/charge`, `cancelMelee` no `recover` do golpe.
**Where**: `src/core/cast.ts`
**Depends on**: T3
**Reuses**: `CursedEnergy`, `Loadout`
**Requirement**: CAST-01, CAST-02, CAST-03, CAST-04, CAST-05, CAST-06, CAST-07, CAST-21, CAST-20, CAST-08, CAST-09, CAST-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Cortes de tempo exatos em cada troca de estado (ex.: 59/60 ms no `sign` do Divergente)
- [x] CAST-01 conferido: WHEN the player presses a slot key holding a technique with enough energy and no cooldown THEN a cast SHALL start in the `sign` state.
- [x] CAST-02 conferido: WHEN a cast starts THEN it SHALL stay in `sign` for the technique sign time, then in `charge` for its charge time, then in `release` for its release time, then in `recover` for its recover time, and then end, skipping any state whose time is 0 ms.
- [x] CAST-03 conferido: WHEN a cast enters `release` THEN the technique cost SHALL be subtracted from the cursed energy exactly once.
- [x] CAST-04 conferido: WHEN a cast enters `release` THEN the slot cooldown SHALL be set to the technique cooldown.
- [x] CAST-05 conferido: IF the player presses a slot key and the cursed energy is below the cost THEN no cast SHALL start and the snapshot `events` SHALL get `techDenied:energy`.
- [x] CAST-06 conferido: IF the player presses a slot key whose cooldown is above 0 THEN no cast SHALL start and the snapshot `events` SHALL get `techDenied:cooldown`.
- [x] CAST-07 conferido: WHEN the player takes damage during `sign` or `charge` THEN the cast SHALL end and the cursed energy SHALL keep the value it had before that damage.
- [x] CAST-21 conferido: WHEN a cast ends by CAST-07 THEN the slot cooldown SHALL stay 0.
- [x] CAST-20 conferido: WHEN a cast ends by CAST-07 THEN `events` SHALL get `techCancel`.
- [x] CAST-08 conferido: WHILE a cast is in progress, a slot key press SHALL NOT start another cast.
- [x] CAST-09 conferido: IF the player presses a slot key while holding a prop, in hitstun, or in the `startup` or `active` phase of a melee attack THEN no cast SHALL start and `events` SHALL get `techDenied:busy`.
- [x] CAST-10 conferido: WHEN the player presses a slot key during the `recover` phase of a melee attack, with enough energy and no cooldown for that technique, THEN the melee attack SHALL end and the cast SHALL start in that same frame.
- [x] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(core): add technique cast state machine`

---

### T5: Linha do tempo das camadas de efeito

**What**: `FxTimeline` puro: `add(name, ms, clock)`, `update(gameDt, realDt)`, `layers()`, `has()`; durações arredondadas para frames inteiros de 60 fps; camadas `game` não andam com `gameDt = 0` (hitstop).
**Where**: `src/core/fxTimeline.ts`
**Depends on**: T4
**Reuses**: nenhum
**Requirement**: TFX-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] 33 ms → 2 frames e 66 ms → 4 frames; `real` anda durante hitstop, `game` não
- [x] TFX-05 conferido: WHILE a hitstop is active, every technique effect layer other than `kokusen.invert`, `kokusen.duotone`, `kokusen.bolts` and the 黒閃 card SHALL NOT advance its animation time.
- [x] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(core): add named effect layer timeline`

---

### T6: Técnicas e energia no catálogo da loja

**What**: Entradas `kind: 'technique'` e modificadores `energia`/`fluxo` em `SHOP_CATALOG`; `eligible(..., loadout)`; garantia do espaço 0 com os dois slots vazios (também no reroll); `BuyContext.applyTechnique`; prévias TSH.
**Where**: `src/data/shop.ts`, `src/core/shop.ts`, `src/core/modifiers.ts`
**Depends on**: T5
**Reuses**: `Shop`, `drawOffers`, `previewText` da F4
**Requirement**: TSH-01, TSH-02, TSH-03, TSH-04, TSH-05, TSH-06, TSH-07, TSH-08, TSH-15, TSH-09, TSH-12, TSH-16, TSH-13, TSH-17

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Testes da F4 em `shop.test.ts`/`modifiers.test.ts` continuam passando sem mudança de asserção
- [x] Pool com 0, 1 e 2 slots cheios; rodada 2/3 e 5/6 para níveis 2 e 3
- [x] TSH-01 conferido: The shop catalog SHALL include the techniques `divergente` and `corte` with rarity common and `azul` and `vermelho` with rarity rare, each with `kind: 'technique'` and maxLevel 3.
- [x] TSH-02 conferido: WHEN a technique at level `n` (0 if not equipped) is offered THEN its cost SHALL be `base + step × n`, with (base, step) = (20, 15) for `divergente`, (30, 15) for `corte`, (35, 20) for `azul` and (40, 20) for `vermelho`.
- [x] TSH-03 conferido: The offer pool SHALL include a technique that is not equipped if and only if at least one slot is empty.
- [x] TSH-04 conferido: The offer pool SHALL include an equipped technique if and only if its level is below 3 and the current round is ≥ 3 for level 2 or ≥ 6 for level 3.
- [x] TSH-05 conferido: WHILE both slots are empty, slot 0 of every drawn set of offers (at shop open and after each reroll) SHALL be a technique, drawn among the eligible techniques by SHOP-08 weights before the other slots.
- [x] TSH-06 conferido: WHEN a technique that is not equipped is bought THEN it SHALL be equipped at level 1 in the first empty slot (slot 1 before slot 2).
- [x] TSH-07 conferido: WHEN an equipped technique is bought THEN its level SHALL increase by exactly 1.
- [x] TSH-08 conferido: The shop catalog SHALL include the common modifier `energia` with maxLevel 5 and cost `10 + 6n`.
- [x] TSH-15 conferido: The shop catalog SHALL include the common modifier `fluxo` with maxLevel 4 and cost `12 + 6n`.
- [x] TSH-09 conferido: The offer pool SHALL include `energia` and `fluxo` only while at least one slot holds a technique.
- [x] TSH-12 conferido: WHILE a technique is not equipped, its card preview text SHALL be `Nova · slot <k>`, where `k` is 1 if slot 1 is empty and 2 otherwise.
- [x] TSH-16 conferido: WHILE a technique is equipped at level `n` < 3, its card preview text SHALL be `Dano ×<a> → ×<b>`, with `a` and `b` the TEC-06 factors of levels `n` and `n + 1` written with a comma decimal (`×1,0`, `×1,25`, `×1,5`).
- [x] TSH-13 conferido: The `energia` card preview text SHALL be `Energia máx. <cur> → <new>`, with `cur` the current max and `new` the max at the next level.
- [x] TSH-17 conferido: The `fluxo` card preview text SHALL be `Regen <cur>/s → <new>/s`, with `cur` the current regen and `new` the regen at the next level.
- [x] Gate check passes: `npm run build && npm test`

**Tests**: unit
**Gate**: build

**Commit**: `feat(core): sell techniques and energy upgrades in the shop`

---

### T7: Estado do Punho Divergente

**What**: `DivergentState`: 1º impacto (alvo, relógio), `ringRadius(t)`, 2º impacto aos 200 ms, sem 2º se errou ou o alvo morreu.
**Where**: `src/core/divergent.ts`
**Depends on**: None (fase anterior inteira)
**Reuses**: `TECHNIQUES.divergente`
**Requirement**: DIV-03, DIV-04, DIV-05, DIV-06, DIV-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] 2º impacto aos 199 ms não, aos 200 ms sim
- [x] DIV-03 conferido: WHEN the punch hitbox touches a target THEN that target SHALL take a first impact of 12 light damage.
- [x] DIV-04 conferido: WHEN 200 ms of game time have passed since the first impact THEN the first-impact target SHALL take 18 heavy damage.
- [x] DIV-05 conferido: IF the punch hitbox touches no target during `release` THEN no second impact SHALL happen.
- [x] DIV-06 conferido: IF the target died from the first impact THEN no second impact SHALL happen.
- [x] DIV-08 conferido: WHILE the approach ring is visible, its radius SHALL be `32 × (1 − t / 200)` px (±2 px), where `t` is the ms since the first impact.
- [x] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(core): add divergent fist timing`

---

### T8: Janela, zona e sequência do Kokusen

**What**: `Kokusen`: `windowOpen(t, zone)`, `press(t) → hit|miss|ignored` com trava por tentativa, zona de 8000 ms que renova, `streak`, ganho de energia.
**Where**: `src/core/kokusen.ts`
**Depends on**: T7
**Reuses**: `KOKUSEN`, `CursedEnergy`
**Requirement**: KOK-01, KOK-02, KOK-03, KOK-04, KOK-05, KOK-09, KOK-10, KOK-30, KOK-11, KOK-31

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Janela 119/120 e 200/201 ms; na zona 59/60 ms; zona 7999/8000 ms
- [x] KOK-01 conferido: WHILE the time since a Punho Divergente first impact is at least 120 ms and at most 200 ms (outside the zone), the Kokusen window SHALL be open (`kokusen.windowOpen === true`).
- [x] KOK-02 conferido: WHILE in the zone, the Kokusen window SHALL be open from 60 ms to 200 ms after the first impact.
- [x] KOK-03 conferido: WHEN the player presses the slot key that cast the Punho Divergente while `kokusen.windowOpen` is true and that cast is not locked by KOK-04 THEN the second impact of that cast SHALL be a Kokusen.
- [x] KOK-04 conferido: WHEN the player presses the same slot key after the first impact and before the window opens THEN that Punho Divergente SHALL NOT produce a Kokusen, and `events` SHALL get `kokusenMiss`.
- [x] KOK-05 conferido: WHILE a Punho Divergente is in `sign`, `charge` or `release` before its first impact, a press of its slot key SHALL NOT count for KOK-03 or KOK-04.
- [x] KOK-09 conferido: WHEN a Kokusen lands THEN the cursed energy SHALL increase by 30, capped at max.
- [x] KOK-10 conferido: WHEN a Kokusen lands THEN `kokusen.zoneMs` SHALL be set to 8000 and `kokusen.zone` to true.
- [x] KOK-30 conferido: WHEN a Kokusen lands THEN `kokusen.streak` SHALL increase by 1.
- [x] KOK-11 conferido: WHEN `kokusen.zoneMs` reaches 0 THEN `kokusen.zone` SHALL become false.
- [x] KOK-31 conferido: WHEN `kokusen.zone` becomes false THEN `kokusen.streak` SHALL become 0.
- [x] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(core): add kokusen window and zone`

---

### T9: Raios do Kokusen

**What**: `lightningBolts(seed, origin, dir)` puro e determinístico: 5–8 raios em zigue-zague, 40–110 px cada, vértices em inteiros pares relativos à origem.
**Where**: `src/core/lightning.ts`
**Depends on**: T8
**Reuses**: `Rng`
**Requirement**: KOK-18, KOK-33, KOK-19, KOK-20, TFX-02

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] 1000 seeds: quantidade, comprimento e grade sempre dentro dos limites
- [x] KOK-18 conferido: For any seed, `lightningBolts(seed, origin, dir)` SHALL return at least 5 and at most 8 bolts.
- [x] KOK-33 conferido: For any seed, the sum of the segment lengths of each bolt returned by `lightningBolts` SHALL be at least 40 px and at most 110 px.
- [x] KOK-19 conferido: For any seed, every vertex returned by `lightningBolts` SHALL have integer coordinates that are multiples of 2 relative to the origin.
- [x] KOK-20 conferido: WHEN `lightningBolts` is called twice with the same seed, origin and direction THEN it SHALL return the same bolts.
- [x] TFX-02 conferido: For every procedural effect geometry (bolt, ring, cut line), the x and y offsets of every vertex from the effect origin SHALL be even integers (px).
- [x] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(core): add seeded kokusen lightning bolts`

---

### T10: Estado do orbe Vermelho

**What**: `RedOrbState`: frame do orbe por terço da carga, lançamento a 560 px/s, alcance 420 px, set de atingidos, `detonationTargets(centros, ponto)` com raio 96 px, detonação em parede/chefe/alcance.
**Where**: `src/core/redOrb.ts`
**Depends on**: T9
**Reuses**: `Mover` (`src/core/mover.ts`)
**Requirement**: RED-02, RED-05, RED-06, RED-08, RED-10, RED-13, RED-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Alcance 419/420 px; raio 95/96/97 px; cada inimigo uma vez
- [x] RED-02 conferido: WHILE the Vermelho is in `charge`, the orb frame SHALL be the 4-texel frame in the first third of the charge time, the 8-texel frame in the second third and the 12-texel frame in the last third.
- [x] RED-05 conferido: WHEN the Vermelho enters `release` THEN a red orb SHALL be launched horizontally toward the player's facing at 560 px/s from the fingertip position.
- [x] RED-06 conferido: WHEN the red orb touches a regular enemy it has not hit before THEN that enemy SHALL take 30 heavy damage and enter ragdoll with an impulse pointing away from the orb.
- [x] RED-08 conferido: WHEN the red orb touches a wall, touches the boss, or has traveled 420 px THEN it SHALL detonate in that frame.
- [x] RED-10 conferido: WHEN the red orb detonates THEN every regular enemy whose center is within 96 px of the detonation point and that the orb has not hit before SHALL take 25 heavy damage and a radial impulse away from that point.
- [x] RED-13 conferido: WHEN the red orb detonates THEN it SHALL be removed from `techObjects` in that frame.
- [x] RED-14 conferido: WHILE the red orb is in flight, `techObjects` SHALL list it with `kind: 'red'` and its `traveled` distance.
- [x] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(core): add red orb flight and detonation rules`

---

### T11: Estado do orbe Azul

**What**: `BlueOrbState`: posição 110 px à frente ou 16 px antes da parede, vida 1400 ms, ticks a cada 250 ms, alvos no raio 130 px, puxão 150 px/s, implosão final.
**Where**: `src/core/blueOrb.ts`
**Depends on**: T10
**Reuses**: `Rect` de `src/core/level.ts`
**Requirement**: BLU-02, BLU-03, BLU-12, BLU-04, BLU-06, BLU-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Raio 129/130/131 px; 5 ticks + implosão; posição com e sem parede
- [x] BLU-02 conferido: WHEN the Azul enters `release` THEN a blue orb SHALL appear 110 px ahead of the player center at the player center height, or 16 px before the first wall if a wall is closer than 110 px.
- [x] BLU-03 conferido: WHEN the blue orb has existed for 1400 ms THEN it SHALL end (BLU-07, BLU-11).
- [x] BLU-12 conferido: WHILE the blue orb exists, its position SHALL stay equal to its spawn position.
- [x] BLU-04 conferido: WHILE the blue orb exists, every regular enemy whose center is within 130 px of the orb SHALL be moved toward the orb center at 150 px/s.
- [x] BLU-06 conferido: WHILE the blue orb exists, every 250 ms of its life every enemy and the boss within 130 px SHALL take 5 light damage.
- [x] BLU-07 conferido: WHEN the blue orb ends THEN every regular enemy and the boss whose center is within 130 px of the orb center SHALL take 10 light damage once.
- [x] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(core): add blue orb pull rules`

---

### T12: Agenda do Desmantelar

**What**: `CutSchedule`: cortes aos 0/60/120 ms do `release`, retângulo 60–180 × 48 px, ângulos 20°/−25°/70° espelhados à esquerda.
**Where**: `src/core/cut.ts`
**Depends on**: T11
**Reuses**: nenhum
**Requirement**: CUT-02, CUT-03, CUT-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Área 59/60 e 180/181 px
- [x] CUT-02 conferido: WHEN the Desmantelar enters `release` THEN it SHALL make 3 cuts, at 0, 60 and 120 ms after entering `release`.
- [x] CUT-03 conferido: WHEN a cut happens THEN every enemy and the boss whose body overlaps the rectangle from 60 to 180 px ahead of the player center and 48 px tall centered on it SHALL take 10 light damage.
- [x] CUT-05 conferido: The 3 cut lines of one cast SHALL be at 20°, −25° and 70° from the horizontal, in cut order, mirrored horizontally when the player faces left.
- [x] Gate check passes: `npm run build && npm test`

**Tests**: unit
**Gate**: build

**Commit**: `feat(core): add dismantle cut schedule`

---

### T13: Paleta e cores da interface de técnicas

**What**: +4 chaves na `PALETTE` (`b`, `R`, `W`, `d`) e constantes de cor da barra de energia, ícones, overlay e flash.
**Where**: `src/game/art/palette.ts`, `src/game/art/techColors.ts`
**Depends on**: None (paralela à fase 2; só precisa da fase 1)
**Reuses**: `PALETTE_KEYS`
**Requirement**: TFX-08, TEC-15, TFX-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Teste de arte existente (limite de cores) atualizado só no número, não na regra
- [x] TFX-08 conferido: This feature SHALL add exactly four keys to `PALETTE`: `b` = 0x050205, `R` = 0xff3344, `W` = 0xffffff and `d` = 0x14307a (data test).
- [x] TEC-15 conferido: The fill, background, mark, flash and overlay colors of the energy bar and slot icons SHALL be exported constants whose values belong to `PALETTE` (data test).
- [x] TFX-01 conferido: Every color used by technique effects, technique frames, kanji grids and technique HUD parts SHALL belong to `PALETTE` (data test).
- [x] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(art): add technique palette keys and hud colors`

---

### T14: Frames do Divergente, Desmantelar e Kokusen

**What**: Frames `divergente-*`, `corte-*` (sign/charge/release/recover) e `kokusen-hit`, 32×24, compostos a partir das partes do player.
**Where**: `src/game/art/sprites/playerTech.ts`
**Depends on**: T13
**Reuses**: `compose`, partes de `sprites/player.ts`
**Requirement**: CAST-18, CAST-22

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Teste de dados: tamanho e só chaves da paleta
- [x] CAST-18 conferido: For each technique id in {`divergente`, `vermelho`, `azul`, `corte`}, the player sheet SHALL contain the frames `<id>-sign`, `<id>-charge`, `<id>-release` and `<id>-recover`, each 32×24 texels (data test).
- [x] CAST-22 conferido: Every texel of the frames listed in CAST-18 SHALL be '.' or a `PALETTE` key (data test).
- [x] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(art): add divergent and dismantle player frames`

---

### T15: Frames do Vermelho e do Azul

**What**: Frames `vermelho-*` e `azul-*` 32×24 (braço esticado com dois dedos; mão erguida).
**Where**: `src/game/art/sprites/playerTech.ts`
**Depends on**: T14
**Reuses**: `compose`
**Requirement**: CAST-18, CAST-22

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Registrados na folha do player junto com os de T14
- [x] CAST-18 conferido: For each technique id in {`divergente`, `vermelho`, `azul`, `corte`}, the player sheet SHALL contain the frames `<id>-sign`, `<id>-charge`, `<id>-release` and `<id>-recover`, each 32×24 texels (data test).
- [x] CAST-22 conferido: Every texel of the frames listed in CAST-18 SHALL be '.' or a `PALETTE` key (data test).
- [x] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(art): add red and blue player frames`

---

### T16: Kanji, orbes e aura

**What**: Grades 24×24 de 黒 閃 赫 蒼 解; orbe vermelho 4/8/12 texels com núcleo `W`; núcleo azul `d`/`C`; chamas da aura em 2 frames; faíscas.
**Where**: `src/game/art/sprites/kanji.ts`, `src/game/art/sprites/techFx.ts`
**Depends on**: T15
**Reuses**: `parseSheet`
**Requirement**: KOK-29, KOK-34, TFX-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Kanji legíveis numa captura (conferir no UAT)
- [x] KOK-29 conferido: The 黒 and 閃 grids SHALL be 24×24 texels each (data test).
- [x] KOK-34 conferido: Every texel of the 黒 and 閃 grids SHALL be '.' or a `PALETTE` key (data test).
- [x] TFX-01 conferido: Every color used by technique effects, technique frames, kanji grids and technique HUD parts SHALL belong to `PALETTE` (data test).
- [x] Gate check passes: `npm run build && npm test`

**Tests**: unit
**Gate**: build

**Commit**: `feat(art): add kanji, orb and aura grids`

---

### T17: Energia e loadout na cena

**What**: `CursedEnergy` e `Loadout` na cena; `?debug&tech=`; +3 por golpe corpo a corpo aplicado (não por técnica); níveis `energia`/`fluxo` aplicados; reset na nova run; snapshot `ce` e `tech`.
**Where**: `src/scenes/TestScene.ts`, `src/game/debugApi.ts`, `src/game/Player.ts`
**Depends on**: None (fase anterior inteira)
**Reuses**: T2, T3
**Requirement**: TEC-02, TEC-08, CE-06, CE-08, TSH-10, TSH-11

**Tools**:

- MCP: context7 (`/phaserjs/phaser/v3_90_0`)
- Skill: `phaser-gamedev`

**Done when**:

- [x] TEC-02 conferido: WHERE the debug mode is on and the URL has `tech=<id>[,<id>]` THEN the slots SHALL start with those techniques at level 1, in order, ignoring unknown ids.
- [x] TEC-08 conferido: WHERE the debug mode is on, the snapshot SHALL include `ce` and `tech` as defined in the snapshot contract.
- [x] CE-06 conferido: WHEN a basic melee hit (jab, cross, kick or prop hit) is applied to an enemy or the boss THEN the cursed energy SHALL increase by 3, capped at max.
- [x] CE-08 conferido: WHEN damage dealt by a technique is applied to a target THEN the cursed energy SHALL NOT receive the +3 of CE-06.
- [x] TSH-10 conferido: WHILE `energia` is at level `n`, the cursed energy max SHALL be `min(100 + 20n, 200)`.
- [x] TSH-11 conferido: WHILE `fluxo` is at level `n`, the cursed energy regen SHALL be `min(8 + 2n, 16)` per second.
- [x] Gate check passes: `npm run build && npm test`

**Tests**: none (coberto pelos smokes da fase 6)
**Gate**: build

**Commit**: `feat(game): add cursed energy and loadout to the run`

---

### T18: HUD de energia e slots

**What**: `EnergyHud` na `uiLayer`: barra sob a de HP, marcas de custo, ícones com overlay de recarga, flash `R` na recusa; `hud.energy` e `hud.techIgnoredByMain` no snapshot.
**Where**: `src/game/EnergyHud.ts`
**Depends on**: T17
**Reuses**: padrão do `Hud`, `techColors`
**Requirement**: TEC-07, TEC-12, TEC-09, TEC-10, TEC-11

**Tools**:

- MCP: context7 (`/phaserjs/phaser/v3_90_0`)
- Skill: `phaser-gamedev`

**Done when**:

- [x] TEC-07 conferido: The HUD SHALL show the cursed energy bar under the HP bar, with fill width `barWidth × cur / max` (±1 px).
- [x] TEC-12 conferido: WHILE a slot holds a technique, the energy bar SHALL show a vertical mark for it at `barLeft + barWidth × cost / max` px (±1 px), where `cost` is that technique cost at its level.
- [x] TEC-09 conferido: WHILE a slot holds a technique, its HUD icon SHALL have a dark overlay of height `iconHeight × cooldownMs / cooldown` px (±1 px), where `cooldown` is that technique full cooldown.
- [x] TEC-10 conferido: WHEN a cast is denied for lack of energy THEN the energy bar SHALL flash in `R` for 300 ms.
- [x] TEC-11 conferido: The energy bar and slot icon objects SHALL be in the main camera ignore list, reported as `hud.techIgnoredByMain: true` in the debug snapshot.
- [x] Gate check passes: `npm run build && npm test`

**Tests**: none (coberto pelos smokes da fase 6)
**Gate**: build

**Commit**: `feat(hud): add cursed energy bar and technique slots`

---

### T19: Conjuração no player

**What**: `TechCaster` (teclas L/C e I/V, slot 1 vence no mesmo frame) e ganchos do `Player` (`castLock`, gravidade 30% no ar em sign/charge, frame da técnica, `meleePhase`, `cancelMelee`, `isBusyForCast`, cancelamento por dano); eventos `techCast/techDenied/techCancel`.
**Where**: `src/game/TechCaster.ts`, `src/game/Player.ts`
**Depends on**: T18
**Reuses**: `CastMachine`
**Requirement**: CAST-01, CAST-05, CAST-06, CAST-07, CAST-20, CAST-21, CAST-09, CAST-10, CAST-11, CAST-12, CAST-13, CAST-17

**Tools**:

- MCP: context7 (`/phaserjs/phaser/v3_90_0`)
- Skill: `phaser-gamedev`

**Done when**:

- [x] CAST-01 conferido: WHEN the player presses a slot key holding a technique with enough energy and no cooldown THEN a cast SHALL start in the `sign` state.
- [x] CAST-05 conferido: IF the player presses a slot key and the cursed energy is below the cost THEN no cast SHALL start and the snapshot `events` SHALL get `techDenied:energy`.
- [x] CAST-06 conferido: IF the player presses a slot key whose cooldown is above 0 THEN no cast SHALL start and the snapshot `events` SHALL get `techDenied:cooldown`.
- [x] CAST-07 conferido: WHEN the player takes damage during `sign` or `charge` THEN the cast SHALL end and the cursed energy SHALL keep the value it had before that damage.
- [x] CAST-20 conferido: WHEN a cast ends by CAST-07 THEN `events` SHALL get `techCancel`.
- [x] CAST-21 conferido: WHEN a cast ends by CAST-07 THEN the slot cooldown SHALL stay 0.
- [x] CAST-09 conferido: IF the player presses a slot key while holding a prop, in hitstun, or in the `startup` or `active` phase of a melee attack THEN no cast SHALL start and `events` SHALL get `techDenied:busy`.
- [x] CAST-10 conferido: WHEN the player presses a slot key during the `recover` phase of a melee attack, with enough energy and no cooldown for that technique, THEN the melee attack SHALL end and the cast SHALL start in that same frame.
- [x] CAST-11 conferido: WHILE the player is airborne in `sign` or `charge`, the gravity applied to the player SHALL be 30% of `PLAYER_MOVE.gravity`.
- [x] CAST-12 conferido: WHILE a cast is in `sign`, `charge`, `release` or `recover`, the player SHALL NOT move horizontally from input.
- [x] CAST-13 conferido: WHILE a cast is in `sign`, the player sprite SHALL show that technique's sign frame; in `charge` its charge frame; in `release` its release frame; in `recover` its recover frame.
- [x] CAST-17 conferido: WHEN a cast enters `release` THEN `events` SHALL get `techCast:<id>`.
- [x] Gate check passes: `npm run build && npm test`

**Tests**: none (coberto pelos smokes da fase 6)
**Gate**: build

**Commit**: `feat(game): cast techniques from the player`

---

### T20: Efeitos comuns da conjuração

**What**: `FxTimeline` e `FxRegistry` na cena (`realtimeFx.update` antes do `frozen`); aura por técnica; zoom 1,5→1,6 na carga e volta em 250 ms; callout com kanji + nome por 900 ms; snapshot `fx` e `hud.callout`.
**Where**: `src/game/techFx/Aura.ts`, `src/game/techFx/Callout.ts`, `src/scenes/TestScene.ts`
**Depends on**: T19
**Reuses**: `FxTimeline`, grades de T16
**Requirement**: CAST-14, CAST-15, CAST-19, CAST-16, TFX-03, TFX-09, TFX-07

**Tools**:

- MCP: context7 (`/phaserjs/phaser/v3_90_0`)
- Skill: `phaser-gamedev`

**Done when**:

- [x] CAST-14 conferido: WHILE a cast is in `sign` or `charge`, `fx.layers` SHALL include `cast.aura`.
- [x] CAST-15 conferido: WHEN a cast enters `charge` THEN the main camera zoom SHALL move from 1.5 to 1.6 over the charge time.
- [x] CAST-19 conferido: WHEN a cast enters `release` THEN the main camera zoom SHALL return to 1.5 within 250 ms.
- [x] CAST-16 conferido: WHEN a cast enters `release` THEN the HUD SHALL show the callout with the technique kanji grid and Portuguese name for 900 ms, reported as `hud.callout` in the snapshot.
- [x] TFX-03 conferido: WHEN a technique effect ends THEN every game object it created SHALL be destroyed within 300 ms.
- [x] TFX-09 conferido: WHEN 300 ms have passed since a technique effect ended THEN `fx.live` SHALL equal its value from the frame before that effect started.
- [x] TFX-07 conferido: WHERE the debug mode is on, the snapshot SHALL include `kokusen`, `techObjects` and `fx` as defined in the snapshot contract.
- [x] Gate check passes: `npm run build && npm test`

**Tests**: none (coberto pelos smokes da fase 6)
**Gate**: build

**Commit**: `feat(game): add cast aura, camera zoom and callout`

---

### T21: Técnicas compradas na loja

**What**: Compra de técnica equipa/sobe nível pelo `applyTechnique`; `techUnlock:<id>`; kanji no topo da carta de técnica; ícone voa da carta ao slot em 300 ms.
**Where**: `src/scenes/TestScene.ts`, `src/game/ShopPanel.ts`
**Depends on**: T20
**Reuses**: `Shop`, `EnergyHud`
**Requirement**: TSH-06, TSH-07, TSH-14, TSH-05

**Tools**:

- MCP: context7 (`/phaserjs/phaser/v3_90_0`)
- Skill: `phaser-gamedev`

**Done when**:

- [x] TSH-06 conferido: WHEN a technique that is not equipped is bought THEN it SHALL be equipped at level 1 in the first empty slot (slot 1 before slot 2).
- [x] TSH-07 conferido: WHEN an equipped technique is bought THEN its level SHALL increase by exactly 1.
- [x] TSH-14 conferido: WHEN a technique is bought while both slots are empty THEN `events` SHALL get exactly one `techUnlock:<id>`, where `id` is the bought technique id.
- [x] TSH-05 conferido: WHILE both slots are empty, slot 0 of every drawn set of offers (at shop open and after each reroll) SHALL be a technique, drawn among the eligible techniques by SHOP-08 weights before the other slots.
- [x] Gate check passes: `npm run build && npm test`

**Tests**: none (coberto pelos smokes da fase 6)
**Gate**: build

**Commit**: `feat(game): equip techniques bought in the shop`

---

### T22: Punho Divergente no jogo

**What**: Hitbox do cross no `release`, 1 alvo, 1º impacto 12 leve, eco e anel sobre o alvo, 2º impacto 18 forte com estouro e punho fantasma no centro atual do alvo.
**Where**: `src/game/TechRunner.ts`, `src/game/techFx/DivergentFx.ts`
**Depends on**: None (fase anterior inteira)
**Reuses**: `AttackHitbox`, `DivergentState`
**Requirement**: DIV-02, DIV-11, DIV-07, DIV-09, DIV-10, DIV-12

**Tools**:

- MCP: context7 (`/phaserjs/phaser/v3_90_0`)
- Skill: `phaser-gamedev`

**Done when**:

- [x] DIV-02 conferido: WHILE the Punho Divergente is in `release`, a punch hitbox with the same size and offset as the cross hitbox SHALL be open.
- [x] DIV-11 conferido: WHEN the Punho Divergente punch hitbox touches its first target THEN it SHALL ignore every other target for the rest of that cast.
- [x] DIV-07 conferido: WHILE the time since the first impact is between 0 and 200 ms, `fx.layers` SHALL include `divergente.echo` and `divergente.ring`.
- [x] DIV-09 conferido: WHEN the second impact happens without a Kokusen THEN `fx.layers` SHALL include `divergente.burst` and `divergente.fistGhost` in that frame and `events` SHALL get `divergent2`.
- [x] DIV-10 conferido: WHILE the Punho Divergente is in `sign` or `charge`, `fx.layers` SHALL include `divergente.fistAura`.
- [x] DIV-12 conferido: WHEN the second impact happens THEN its effects SHALL be drawn at the first-impact target center in that frame.
- [x] Gate check passes: `npm run build && npm test`

**Tests**: none (coberto pelos smokes da fase 6)
**Gate**: build

**Commit**: `feat(game): add divergent fist technique`

---

### T23: Kokusen: acerto

**What**: Tecla do slot durante a janela vira Kokusen: 45 de dano forte, ragdoll com knockback ×2, poise do chefe −135, +30 de energia, zona e streak, hitstop 220 ms, `kokusen`/`kokusenMiss`, limiar de fase do chefe (roar) no mesmo frame.
**Where**: `src/game/TechRunner.ts`
**Depends on**: T22
**Reuses**: `Kokusen`, `Hitstop`, `BossBrain`
**Requirement**: KOK-06, KOK-07, KOK-08, KOK-12, KOK-32, KOK-13, KOK-28

**Tools**:

- MCP: context7 (`/phaserjs/phaser/v3_90_0`)
- Skill: `phaser-gamedev`

**Done when**:

- [x] KOK-06 conferido: WHEN a Kokusen lands THEN the target SHALL take 45 heavy damage (18 × 2.5) instead of the normal second impact.
- [x] KOK-07 conferido: WHEN a Kokusen lands on a regular enemy that survives THEN the enemy SHALL enter ragdoll with twice the heavy-hit knockback.
- [x] KOK-08 conferido: WHEN a Kokusen lands on the boss THEN the boss poise SHALL drop by `3 × 45`, never below 0.
- [x] KOK-12 conferido: IF a Kokusen takes the boss hp from above a phase threshold to at or below it THEN the boss SHALL lose the full 45 hp and enter `roar` in that frame (BAI-05).
- [x] KOK-32 conferido: IF a Kokusen takes the boss hp from above a phase threshold to at or below it THEN the cursed energy SHALL still increase by 30 (KOK-09).
- [x] KOK-13 conferido: WHEN a Kokusen lands THEN the game SHALL apply a hitstop of 220 ms (FX-02: the longest pending hitstop wins).
- [x] KOK-28 conferido: WHEN a Kokusen lands THEN `events` SHALL get exactly one `kokusen` entry.
- [x] Gate check passes: `npm run build && npm test`

**Tests**: none (coberto pelos smokes da fase 6)
**Gate**: build

**Commit**: `feat(game): land kokusen on the divergent second impact`

---

### T24: Kokusen: cinema

**What**: `KokusenFx` em tempo real: negativo 2 frames, duotom 4 frames, silhueta `b`, raios redesenhados a cada 2 frames com seed nova e borda `R`, faíscas e anel, zoom-punch 1,68, card 黒閃 com ×N, aura da zona; sem WebGL pula só o ColorMatrix e marca `fx.degraded`.
**Where**: `src/game/techFx/KokusenFx.ts`
**Depends on**: T23
**Reuses**: `lightningBolts`, `FxTimeline`, Context7 `/phaserjs/phaser/v3_90_0` (postFX ColorMatrix)
**Requirement**: KOK-14, KOK-15, KOK-16, KOK-17, KOK-21, KOK-22, KOK-23, KOK-24, KOK-25, KOK-26, KOK-27, TFX-06, TFX-10, TFX-11

**Tools**:

- MCP: context7 (`/phaserjs/phaser/v3_90_0`)
- Skill: `phaser-gamedev`

**Done when**:

- [x] KOK-14 conferido: WHEN a Kokusen lands THEN `fx.layers` SHALL include `kokusen.invert` for at least 33 ms of real time (2 frames at 60 fps, rounded up to whole frames).
- [x] KOK-15 conferido: WHEN `kokusen.invert` ends THEN `fx.layers` SHALL include `kokusen.duotone` for at least 66 ms of real time (4 frames at 60 fps, rounded up to whole frames), and SHALL NOT include `kokusen.invert` at the same time.
- [x] KOK-16 conferido: WHILE `kokusen.invert` is active, the target sprite SHALL be drawn as a solid `b` silhouette.
- [x] KOK-17 conferido: WHEN a Kokusen lands THEN `fx.layers` SHALL include `kokusen.bolts` until 150 ms of real time after the hitstop ends.
- [x] KOK-21 conferido: WHILE `kokusen.bolts` is active during the hitstop, the bolts SHALL be regenerated with a new seed every 2 frames.
- [x] KOK-22 conferido: The bolt stroke SHALL be `b` with a 1-texel `R` border.
- [x] KOK-23 conferido: WHEN a Kokusen lands THEN `fx.layers` SHALL include `kokusen.sparks` and `kokusen.shock` in that frame.
- [x] KOK-24 conferido: WHEN a Kokusen lands THEN the main camera zoom SHALL reach 1.68 (1.5 × 1.12) within 60 ms of real time and return to 1.5 within the next 300 ms.
- [x] KOK-25 conferido: WHEN a Kokusen lands THEN the HUD SHALL show the 黒閃 card at the screen center for 800 ms, reported as `hud.kokusenCard` in the snapshot.
- [x] KOK-26 conferido: WHILE `kokusen.streak` ≥ 2, the card SHALL show `×N` with N = streak.
- [x] KOK-27 conferido: WHILE the zone is active, `fx.layers` SHALL include `kokusen.zoneAura`.
- [x] TFX-06 conferido: IF the renderer is not WebGL THEN no postFX SHALL be added to any camera or game object.
- [x] TFX-10 conferido: IF the renderer is not WebGL THEN the sprite and geometry layers of each effect SHALL still appear in `fx.layers` as with WebGL.
- [x] TFX-11 conferido: IF the renderer is not WebGL THEN the snapshot SHALL report `fx.degraded: true`.
- [x] Gate check passes: `npm run build && npm test && npm run smoke`

**Tests**: none (coberto pelos smokes da fase 6)
**Gate**: build

**Commit**: `feat(game): add kokusen cinematic effects`

---

### T25: Reversão de Técnica: Vermelho

**What**: Carga com orbe que cresce e faíscas saindo; lançamento com recuo de 12 px; orbe sensor com rastro e estalos; ragdoll no contato; detonação com flash, esfera, anel, detritos, tela vermelha 80 ms e tremida 200 ms.
**Where**: `src/game/techFx/RedOrb.ts`, `src/game/TechRunner.ts`
**Depends on**: T24
**Reuses**: `RedOrbState`, padrão do `Projectile`
**Requirement**: RED-03, RED-04, RED-15, RED-07, RED-09, RED-11, RED-16, RED-12, RED-17, TFX-04

**Tools**:

- MCP: context7 (`/phaserjs/phaser/v3_90_0`)
- Skill: `phaser-gamedev`

**Done when**:

- [x] RED-03 conferido: WHILE the Vermelho is in `charge`, `fx.layers` SHALL include `red.orb`, `red.sparksOut`, `red.glowRing` and `red.dustPush`.
- [x] RED-04 conferido: The `red.sparksOut` particles SHALL have velocities pointing away from the orb center (the dot product of velocity and offset from the center is positive).
- [x] RED-15 conferido: WHEN the Vermelho enters `release` on the ground THEN the player SHALL be pushed 12 px (±2 px) opposite to its facing.
- [x] RED-07 conferido: WHILE the red orb is in flight, `fx.layers` SHALL include `red.trail` and `red.crackle`.
- [x] RED-09 conferido: WHEN the red orb detonates on the boss THEN the boss SHALL take 30 heavy damage.
- [x] RED-11 conferido: WHEN the red orb detonates THEN `fx.layers` SHALL include `red.flashCore`, `red.sphere`, `red.shockRing`, `red.debris` and `red.screenFlash` in that frame.
- [x] RED-16 conferido: WHEN the red orb detonates THEN `events` SHALL get exactly one `redDetonate`.
- [x] RED-12 conferido: WHEN the red orb detonates THEN `red.screenFlash` SHALL stay in `fx.layers` for 80 ms (rounded up to whole frames).
- [x] RED-17 conferido: WHEN the red orb detonates THEN the main camera SHALL shake for 200 ms.
- [x] TFX-04 conferido: Every technique particle emitter SHALL have at most 64 live particles at any time.
- [x] Gate check passes: `npm run build && npm test`

**Tests**: none (coberto pelos smokes da fase 6)
**Gate**: build

**Commit**: `feat(game): add red reversal technique`

---

### T26: Técnica Amplificada: Azul

**What**: Orbe azul fixo que puxa inimigos comuns (não o chefe) a cada step, espiral entrando, anéis de distorção, detritos sugados e implosão.
**Where**: `src/game/techFx/BlueOrb.ts`, `src/game/TechRunner.ts`
**Depends on**: T25
**Reuses**: `BlueOrbState`
**Requirement**: BLU-05, BLU-08, BLU-09, BLU-10, BLU-11

**Tools**:

- MCP: context7 (`/phaserjs/phaser/v3_90_0`)
- Skill: `phaser-gamedev`

**Done when**:

- [x] BLU-05 conferido: WHILE the blue orb exists, the boss SHALL NOT be moved by it.
- [x] BLU-08 conferido: WHILE the blue orb exists, `fx.layers` SHALL include `blue.core`, `blue.spiralIn`, `blue.distortRing` and `blue.debrisIn`.
- [x] BLU-09 conferido: The `blue.spiralIn` particles SHALL have velocities with a component pointing toward the orb center (the dot product of velocity and offset from the center is negative).
- [x] BLU-10 conferido: WHILE the blue orb exists, `techObjects` SHALL list it with `kind: 'blue'`.
- [x] BLU-11 conferido: WHEN the blue orb reaches 1400 ms THEN it SHALL be removed from `techObjects` and `events` SHALL get exactly one `blueImplode`.
- [x] Gate check passes: `npm run build && npm test`

**Tests**: none (coberto pelos smokes da fase 6)
**Gate**: build

**Commit**: `feat(game): add blue amplification technique`

---

### T27: Desmantelar

**What**: 3 cortes com linha `W` de 1 texel nos ângulos da agenda, dano na área e alvo partido ao meio por 2 frames; evento `cut` por corte.
**Where**: `src/game/techFx/CutFx.ts`, `src/game/TechRunner.ts`
**Depends on**: T26
**Reuses**: `CutSchedule`
**Requirement**: CUT-04, CUT-08, CUT-06

**Tools**:

- MCP: context7 (`/phaserjs/phaser/v3_90_0`)
- Skill: `phaser-gamedev`

**Done when**:

- [ ] CUT-04 conferido: WHEN a cut happens THEN `fx.layers` SHALL include `cut.line` in that frame.
- [ ] CUT-08 conferido: WHEN a cut happens THEN `events` SHALL get exactly one `cut`.
- [ ] CUT-06 conferido: WHEN a cut damages a target THEN `fx.layers` SHALL include `cut.split` for that target for at least 33 ms (2 frames at 60 fps, rounded up to whole frames).
- [ ] Gate check passes: `npm run build && npm test`

**Tests**: none (coberto pelos smokes da fase 6)
**Gate**: build

**Commit**: `feat(game): add dismantle technique`

---

### T28: Laboratório de efeitos

**What**: `?debug&fxlab`: sem ondas, 3 bonecos que regeneram, teclas 1–6 disparam os efeitos sem gastar energia nem recarga, 0 alterna câmera lenta, legenda e velocidade no HUD.
**Where**: `src/game/FxLab.ts`
**Depends on**: None (fase anterior inteira)
**Reuses**: `TechRunner`
**Requirement**: FXL-01, FXL-05, FXL-06, FXL-02, FXL-07, FXL-09, FXL-03, FXL-04, FXL-08

**Tools**:

- MCP: context7 (`/phaserjs/phaser/v3_90_0`)
- Skill: `phaser-gamedev`

**Done when**:

- [ ] FXL-01 conferido: WHERE the debug mode is on and the URL has `fxlab` THEN the run SHALL spawn no waves.
- [ ] FXL-05 conferido: WHERE the debug mode is on and the URL has `fxlab` THEN the scene SHALL place 3 training dummies on the main floor at `playerSpawn.x + 120`, `+ 200` and `+ 280` px.
- [ ] FXL-06 conferido: WHEN a training dummy hp reaches 0 THEN the dummy SHALL stay in place and its hp SHALL be set to max 1000 ms later.
- [ ] FXL-02 conferido: WHILE in `fxlab`, the keys 1, 2, 3, 4, 5 and 6 SHALL play, respectively, the cast aura, the Punho Divergente, a Kokusen, the Vermelho, the Azul and the Desmantelar, aimed at the nearest dummy.
- [ ] FXL-07 conferido: WHILE in `fxlab`, the effects played by the keys 1 to 6 SHALL NOT change the cursed energy.
- [ ] FXL-09 conferido: WHILE in `fxlab`, the effects played by the keys 1 to 6 SHALL NOT change any slot cooldown.
- [ ] FXL-03 conferido: WHILE in `fxlab`, the key 0 SHALL toggle the scene time scale between 1 and 0.25.
- [ ] FXL-04 conferido: WHILE in `fxlab`, the HUD SHALL show the legend `1 aura · 2 divergente · 3 kokusen · 4 vermelho · 5 azul · 6 corte · 0 lento`.
- [ ] FXL-08 conferido: WHILE in `fxlab`, the HUD SHALL show `velocidade: 1x` when the time scale is 1 and `velocidade: 0.25x` when it is 0.25.
- [ ] Gate check passes: `npm run build && npm test`

**Tests**: none (coberto pelos smokes da fase 6)
**Gate**: build

**Commit**: `feat(debug): add technique effects lab`

---

### T29: Smoke de energia, conjuração e loja

**What**: `tech.smoke.mjs` (`?tech=vermelho`: barra, marca, ícone, estados passo a passo, aura, zoom, callout, recusas, cancelamento) e compra da técnica garantida em `shop.smoke.mjs`.
**Where**: `scripts/smoke/tech.smoke.mjs`
**Depends on**: T28
**Reuses**: `tap` de `shop.smoke.mjs`
**Requirement**: CE-01, TEC-01, TEC-02, TEC-07, TEC-09, TEC-10, TEC-12, CAST-01, CAST-05, CAST-07, CAST-14, CAST-15, CAST-16, CAST-17, TSH-05, TSH-06, TSH-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] CE-01 conferido: WHEN a run starts THEN the player cursed energy SHALL be 100 with max 100 and regen 8 per second.
- [ ] TEC-01 conferido: WHEN a run starts without the `tech` debug parameter THEN both technique slots SHALL be empty (AD-005).
- [ ] TEC-02 conferido: WHERE the debug mode is on and the URL has `tech=<id>[,<id>]` THEN the slots SHALL start with those techniques at level 1, in order, ignoring unknown ids.
- [ ] TEC-07 conferido: The HUD SHALL show the cursed energy bar under the HP bar, with fill width `barWidth × cur / max` (±1 px).
- [ ] TEC-09 conferido: WHILE a slot holds a technique, its HUD icon SHALL have a dark overlay of height `iconHeight × cooldownMs / cooldown` px (±1 px), where `cooldown` is that technique full cooldown.
- [ ] TEC-10 conferido: WHEN a cast is denied for lack of energy THEN the energy bar SHALL flash in `R` for 300 ms.
- [ ] TEC-12 conferido: WHILE a slot holds a technique, the energy bar SHALL show a vertical mark for it at `barLeft + barWidth × cost / max` px (±1 px), where `cost` is that technique cost at its level.
- [ ] CAST-01 conferido: WHEN the player presses a slot key holding a technique with enough energy and no cooldown THEN a cast SHALL start in the `sign` state.
- [ ] CAST-05 conferido: IF the player presses a slot key and the cursed energy is below the cost THEN no cast SHALL start and the snapshot `events` SHALL get `techDenied:energy`.
- [ ] CAST-07 conferido: WHEN the player takes damage during `sign` or `charge` THEN the cast SHALL end and the cursed energy SHALL keep the value it had before that damage.
- [ ] CAST-14 conferido: WHILE a cast is in `sign` or `charge`, `fx.layers` SHALL include `cast.aura`.
- [ ] CAST-15 conferido: WHEN a cast enters `charge` THEN the main camera zoom SHALL move from 1.5 to 1.6 over the charge time.
- [ ] CAST-16 conferido: WHEN a cast enters `release` THEN the HUD SHALL show the callout with the technique kanji grid and Portuguese name for 900 ms, reported as `hud.callout` in the snapshot.
- [ ] CAST-17 conferido: WHEN a cast enters `release` THEN `events` SHALL get `techCast:<id>`.
- [ ] TSH-05 conferido: WHILE both slots are empty, slot 0 of every drawn set of offers (at shop open and after each reroll) SHALL be a technique, drawn among the eligible techniques by SHOP-08 weights before the other slots.
- [ ] TSH-06 conferido: WHEN a technique that is not equipped is bought THEN it SHALL be equipped at level 1 in the first empty slot (slot 1 before slot 2).
- [ ] TSH-14 conferido: WHEN a technique is bought while both slots are empty THEN `events` SHALL get exactly one `techUnlock:<id>`, where `id` is the bought technique id.
- [ ] Gate check passes: `npm run build && npm test && npm run smoke`

**Tests**: smoke
**Gate**: full

**Commit**: `test(smoke): cover cursed energy, casting and technique shop`

---

### T30: Smoke do Divergente e do Kokusen

**What**: `kokusen.smoke.mjs`: 2º impacto normal; tecla aos 160 ms → Kokusen (camadas, hitstop, zoom, card, evento, energia); tecla aos 60 ms → `kokusenMiss`; `fx.live` volta ao valor anterior 300 ms depois.
**Where**: `scripts/smoke/kokusen.smoke.mjs`
**Depends on**: T29
**Reuses**: `tap`
**Requirement**: DIV-03, DIV-04, DIV-07, DIV-09, KOK-03, KOK-04, KOK-06, KOK-09, KOK-13, KOK-14, KOK-15, KOK-17, KOK-24, KOK-25, KOK-28, TFX-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] DIV-03 conferido: WHEN the punch hitbox touches a target THEN that target SHALL take a first impact of 12 light damage.
- [ ] DIV-04 conferido: WHEN 200 ms of game time have passed since the first impact THEN the first-impact target SHALL take 18 heavy damage.
- [ ] DIV-07 conferido: WHILE the time since the first impact is between 0 and 200 ms, `fx.layers` SHALL include `divergente.echo` and `divergente.ring`.
- [ ] DIV-09 conferido: WHEN the second impact happens without a Kokusen THEN `fx.layers` SHALL include `divergente.burst` and `divergente.fistGhost` in that frame and `events` SHALL get `divergent2`.
- [ ] KOK-03 conferido: WHEN the player presses the slot key that cast the Punho Divergente while `kokusen.windowOpen` is true and that cast is not locked by KOK-04 THEN the second impact of that cast SHALL be a Kokusen.
- [ ] KOK-04 conferido: WHEN the player presses the same slot key after the first impact and before the window opens THEN that Punho Divergente SHALL NOT produce a Kokusen, and `events` SHALL get `kokusenMiss`.
- [ ] KOK-06 conferido: WHEN a Kokusen lands THEN the target SHALL take 45 heavy damage (18 × 2.5) instead of the normal second impact.
- [ ] KOK-09 conferido: WHEN a Kokusen lands THEN the cursed energy SHALL increase by 30, capped at max.
- [ ] KOK-13 conferido: WHEN a Kokusen lands THEN the game SHALL apply a hitstop of 220 ms (FX-02: the longest pending hitstop wins).
- [ ] KOK-14 conferido: WHEN a Kokusen lands THEN `fx.layers` SHALL include `kokusen.invert` for at least 33 ms of real time (2 frames at 60 fps, rounded up to whole frames).
- [ ] KOK-15 conferido: WHEN `kokusen.invert` ends THEN `fx.layers` SHALL include `kokusen.duotone` for at least 66 ms of real time (4 frames at 60 fps, rounded up to whole frames), and SHALL NOT include `kokusen.invert` at the same time.
- [ ] KOK-17 conferido: WHEN a Kokusen lands THEN `fx.layers` SHALL include `kokusen.bolts` until 150 ms of real time after the hitstop ends.
- [ ] KOK-24 conferido: WHEN a Kokusen lands THEN the main camera zoom SHALL reach 1.68 (1.5 × 1.12) within 60 ms of real time and return to 1.5 within the next 300 ms.
- [ ] KOK-25 conferido: WHEN a Kokusen lands THEN the HUD SHALL show the 黒閃 card at the screen center for 800 ms, reported as `hud.kokusenCard` in the snapshot.
- [ ] KOK-28 conferido: WHEN a Kokusen lands THEN `events` SHALL get exactly one `kokusen` entry.
- [ ] TFX-09 conferido: WHEN 300 ms have passed since a technique effect ended THEN `fx.live` SHALL equal its value from the frame before that effect started.
- [ ] Gate check passes: `npm run build && npm test && npm run smoke`

**Tests**: smoke
**Gate**: full

**Commit**: `test(smoke): cover divergent fist and kokusen`

---

### T31: Smoke do Vermelho, Azul, Desmantelar e laboratório

**What**: `techniques.smoke.mjs` (dano, ragdoll, camadas e eventos das três) e `fxlab.smoke.mjs` (teclas 1–6 com captura de cada efeito na pasta de saída para o UAT).
**Where**: `scripts/smoke/techniques.smoke.mjs`
**Depends on**: T30
**Reuses**: `tap`
**Requirement**: RED-06, RED-10, RED-11, RED-16, BLU-04, BLU-07, BLU-11, CUT-03, CUT-08, FXL-01, FXL-02, FXL-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] RED-06 conferido: WHEN the red orb touches a regular enemy it has not hit before THEN that enemy SHALL take 30 heavy damage and enter ragdoll with an impulse pointing away from the orb.
- [ ] RED-10 conferido: WHEN the red orb detonates THEN every regular enemy whose center is within 96 px of the detonation point and that the orb has not hit before SHALL take 25 heavy damage and a radial impulse away from that point.
- [ ] RED-11 conferido: WHEN the red orb detonates THEN `fx.layers` SHALL include `red.flashCore`, `red.sphere`, `red.shockRing`, `red.debris` and `red.screenFlash` in that frame.
- [ ] RED-16 conferido: WHEN the red orb detonates THEN `events` SHALL get exactly one `redDetonate`.
- [ ] BLU-04 conferido: WHILE the blue orb exists, every regular enemy whose center is within 130 px of the orb SHALL be moved toward the orb center at 150 px/s.
- [ ] BLU-07 conferido: WHEN the blue orb ends THEN every regular enemy and the boss whose center is within 130 px of the orb center SHALL take 10 light damage once.
- [ ] BLU-11 conferido: WHEN the blue orb reaches 1400 ms THEN it SHALL be removed from `techObjects` and `events` SHALL get exactly one `blueImplode`.
- [ ] CUT-03 conferido: WHEN a cut happens THEN every enemy and the boss whose body overlaps the rectangle from 60 to 180 px ahead of the player center and 48 px tall centered on it SHALL take 10 light damage.
- [ ] CUT-08 conferido: WHEN a cut happens THEN `events` SHALL get exactly one `cut`.
- [ ] FXL-01 conferido: WHERE the debug mode is on and the URL has `fxlab` THEN the run SHALL spawn no waves.
- [ ] FXL-02 conferido: WHILE in `fxlab`, the keys 1, 2, 3, 4, 5 and 6 SHALL play, respectively, the cast aura, the Punho Divergente, a Kokusen, the Vermelho, the Azul and the Desmantelar, aimed at the nearest dummy.
- [ ] FXL-03 conferido: WHILE in `fxlab`, the key 0 SHALL toggle the scene time scale between 1 and 0.25.
- [ ] Gate check passes: `npm run build && npm test && npm run smoke`

**Tests**: smoke
**Gate**: full

**Commit**: `test(smoke): cover red, blue, dismantle and effects lab`

---
