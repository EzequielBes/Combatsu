# Economia, drops e cura Validation

## Validation: economia-drops-cura - FAIL ❌

**Result**: FAIL — 3 ACs (HEAL-10, ARM-10, ARM-26) have zero test evidence; evidence-or-zero treats an AC with no `file:line` citation as not covered, so the feature is not done until these are fixed and re-verified.

**Date**: 2026-09-25
**Spec**: `.specs/features/economia-drops-cura/spec.md`
**Diff range**: `87fa614..HEAD` (13 commits, `8398e6e`)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

58/58 tasks marked `[x]` in `tasks.md`, 0 pending.

---

## Spec-Anchored Acceptance Criteria

Evidence-or-zero: every row cites `file:line`. Where the file+line shows only a structural guarantee (no runtime/statistical assertion), it is flagged as a gap even if production code implements the behavior.

### P1: Fragmentos amaldiçoados (31 ACs)

| AC | Spec-defined outcome | file:line + assertion | Result |
| --- | --- | --- | --- |
| ECO-01 | 1 drop at death pos | `scripts/smoke/drops.smoke.mjs:33` `dropped.length >= 2` after one kill | ✅ PASS |
| ECO-02 | `rng.int(2,4)` unarmed | `tests/core/loot.test.ts:63-71` all in [2,4], all 3 values seen in 1000 draws | ✅ PASS |
| ECO-03 | `rng.int(2,4)+2` armed | `tests/core/loot.test.ts:74-79` all in [4,6] | ✅ PASS |
| ECO-04 | `1+floor((r-1)/5)` | `tests/core/loot.test.ts:6-14` r=1→1,5→1,6→2,10→2,11→3 | ✅ PASS |
| ECO-05 | boss: 15 pickups | `tests/core/loot.test.ts:103-109` `drop.fragments===15` for r=1..20 | ✅ PASS |
| ECO-06 | vx∈[-120,120], vy∈[-260,-180] | `tests/core/loot.test.ts:50-57` 1000 draws in range | ✅ PASS |
| ECO-07 | gravity 900, stop on solid | `tests/core/pickup.test.ts:40-49` | ✅ PASS |
| ECO-24 | never overlaps solid at frame end | `tests/core/pickup.test.ts:50,73-88` | ✅ PASS |
| ECO-08 | collected+removed+credited once | `tests/core/pickup.test.ts:174-181`, `scripts/smoke/drops.smoke.mjs:73` | ✅ PASS |
| ECO-09 | 15000ms expiry + `pickupExpired` | `tests/core/pickup.test.ts:17-23,24-39`, `scripts/smoke/drops.smoke.mjs:38-51` | ✅ PASS |
| ECO-10 | magnet at age≥300ms & ≤72px | `tests/core/pickup.test.ts:90-120` boundary 298/300, boundary 72/73px | ✅ PASS |
| ECO-18 | speed 120→+1200/s²→cap 600, ignores terrain | `tests/core/pickup.test.ts:90-156` incl. wall pass-through at line 153 | ✅ PASS |
| ECO-11 | dead player: no collect | `tests/core/pickup.test.ts:182-188` | ✅ PASS |
| ECO-25 | dead player: no magnet | `tests/core/pickup.test.ts:157-164` | ✅ PASS |
| ECO-12 | wallet never negative | `tests/core/wallet.test.ts:57-61` | ✅ PASS |
| ECO-13 | `spend(n>balance)` leaves balance unchanged | `tests/core/wallet.test.ts:36-42` | ✅ PASS |
| ECO-26 | `spend(n>balance)` returns false | `tests/core/wallet.test.ts:36-42` (same assertion) | ✅ PASS |
| ECO-20 | `spend(0<n≤balance)` decrements, returns true | `tests/core/wallet.test.ts:29-35,43-56` | ✅ PASS |
| ECO-14 | run start: wallet=0 | `tests/core/wallet.test.ts:5-8`, `scripts/smoke/drops.smoke.mjs:25` | ✅ PASS |
| ECO-27 | run start: pickups cleared | `scripts/smoke/drops.smoke.mjs:95-` (new-run assertion) | ✅ PASS |
| ECO-15 | cap 60, spawn=max(1,60-live) | `tests/core/loot.test.ts:31-46` (4 boundary cases) | ✅ PASS |
| ECO-28 | overflow value folded into last pickup | `tests/core/loot.test.ts:31-46` `extraOnLast` field | ✅ PASS |
| ECO-16 | HUD counter == wallet in-frame | `scripts/smoke/drops.smoke.mjs:78-81` | ✅ PASS |
| ECO-29 | exactly one `collect:fragment:<value>` event | `scripts/smoke/drops.smoke.mjs:74-77` | ✅ PASS |
| ECO-30 | floatTexts `{text:'+<v>',color:'U'}` 400ms | `tests/game/debugApi.test.ts:60` (shape passthrough only, not producer logic) | ⚠️ Weak evidence — see gap #4 |
| ECO-21 | blink every 150ms in last 3000ms | `tests/core/pickup.test.ts:204-` | ✅ PASS |
| ECO-17 | loot RNG = `new Rng(s^0x9e3779b9)` | `tests/core/run.test.ts:288-` | ✅ PASS |
| ECO-31 | identical wave order w/ and w/o loot draws, same seed | `tests/core/run.test.ts:288-` | ✅ PASS |
| ECO-22 | game-over line `Fragmentos: <count>` | `scripts/smoke/drops.smoke.mjs:83-` | ✅ PASS |
| ECO-19 | debug snapshot has `wallet`,`pickups[]` with all fields | `scripts/smoke/drops.smoke.mjs:33,52-81` (fields consumed live, not enumerated as one assertion); `tests/game/debugApi.test.ts:58-61` (shape passthrough only) | ⚠️ Weak evidence — functional but no dedicated field-completeness assertion |
| ECO-23 | pickup/counter sprites use only `PALETTE` keys | `tests/game/art.test.ts:428-` | ✅ PASS |

### P1: Gota de cura (10 ACs)

| AC | Spec-defined outcome | file:line + assertion | Result |
| --- | --- | --- | --- |
| HEAL-01 | p=0.10, rolled before fragment count | `tests/core/loot.test.ts:85-92` (0.08–0.12 over 10000), `tests/core/loot.test.ts:132-137` (order `chance,int`) | ✅ PASS |
| HEAL-02 | boss never drops heal | `tests/core/loot.test.ts:103-109` `drop.heal===false` | ✅ PASS |
| HEAL-03 | heals `min(8,maxHp-hp)` | `tests/core/pickup.test.ts:174-181`; `scripts/smoke/heal.smoke.mjs:38,55-58` | ✅ PASS |
| HEAL-08 | exactly one `collect:heal:<hp>` | `scripts/smoke/heal.smoke.mjs:52` | ✅ PASS |
| HEAL-04 | full HP: no collect | `tests/core/pickup.test.ts:189-203`, `scripts/smoke/heal.smoke.mjs:90` | ✅ PASS |
| HEAL-09 | full HP: no magnet | `tests/core/pickup.test.ts:165-173`, `scripts/smoke/heal.smoke.mjs:91` | ✅ PASS |
| HEAL-05 | 10000ms expiry | `tests/core/pickup.test.ts:17-23`, `scripts/smoke/heal.smoke.mjs:103-120` | ✅ PASS |
| HEAL-06 | `heal=1` forces p=1 | `tests/core/loot.test.ts:168-171` | ✅ PASS |
| HEAL-07 | floatTexts `{text:'+<hp>',color:'G'}` 400ms | `tests/game/debugApi.test.ts:60` (shape only, same caveat as ECO-30) | ⚠️ Weak evidence |
| HEAL-10 | player tint `G` for 80ms | none found — `src/scenes/TestScene.ts:359` calls `player.flash('G', 80)` but no unit/smoke test asserts flash state | ❌ GAP — no test evidence |

### P1: Inimigos armados (16 ACs)

| AC | Spec-defined outcome | file:line + assertion | Result |
| --- | --- | --- | --- |
| ARM-01 | r≤2: never armed | `tests/core/loot.test.ts:148-153`, `scripts/smoke/armed.smoke.mjs:26` | ✅ PASS |
| ARM-02 | r≥3: `chance(min(0.15+0.05(r-3),0.5))` | `tests/core/loot.test.ts:18-27` (r=2,3,4,9,10,20 exact values) | ✅ PASS |
| ARM-03 | uniform knife/club | `tests/core/loot.test.ts:155-163` both seen in 2000 draws | ✅ PASS |
| ARM-04 | boss never armed | `src/scenes/TestScene.ts:416` (rollArmed only called on regular-enemy spawn path); no explicit assertion on boss snapshot | ⚠️ Architecturally guaranteed, no direct test |
| ARM-05 | knife dmg `round(1.25×base)` | `tests/core/armed.test.ts:10-20` | ✅ PASS |
| ARM-20 | knife hitbox +8px facing side | `tests/core/armed.test.ts:10-20` | ✅ PASS |
| ARM-21 | knife windup = base | `tests/core/armed.test.ts:10-20` | ✅ PASS |
| ARM-06 | club dmg `round(1.6×base)` | `tests/core/armed.test.ts:37-47` | ✅ PASS |
| ARM-22 | club strength `heavy` | `tests/core/armed.test.ts:37-47` | ✅ PASS |
| ARM-23 | club hitbox +12px | `tests/core/armed.test.ts:37-47` | ✅ PASS |
| ARM-07 | club windup = base+150ms | `tests/core/armed.test.ts:45-47` (450→600) | ✅ PASS |
| ARM-08 | tool drops once, `rest` at death pos | `scripts/smoke/armed.smoke.mjs:51-58` durability 6, state rest | ✅ PASS |
| ARM-09 | windup shows raised frame w/ `U` glow | `tests/game/art.test.ts:478-481` asserts the `raised` frame *exists* with `U`; `src/game/Enemy.ts:235-238` selects it `if (state==='windup')`, but no test drives an enemy into windup state and reads the frame key | ⚠️ Data-level only — runtime selection untested |
| ARM-10 | ragdoll hides tool sprite, visible on getup | `src/game/Enemy.ts:222-232` implements it; no test found (unit or smoke) | ❌ GAP — no test evidence |
| ARM-15 | `armed=knife\|club` forces every enemy | `tests/core/loot.test.ts:173-181`, `scripts/smoke/armed.smoke.mjs:48` | ✅ PASS |

### P1: Usar a ferramenta amaldiçoada (12 ACs)

| AC | Spec-defined outcome | file:line + assertion | Result |
| --- | --- | --- | --- |
| ARM-11 | cursedKnife dmg16/dur6/throw820/kb6/mass1/front + validatePropDef | `tests/core/armed.test.ts:58-71` | ✅ PASS |
| ARM-24 | cursedClub dmg26/dur5/throw480/kb12/mass6/back + validatePropDef | `tests/core/armed.test.ts:58-71` | ✅ PASS |
| ARM-12 | interact w/ empty hands picks nearest resting tool | `scripts/smoke/armed.smoke.mjs:72-91,178` | ✅ PASS |
| ARM-17 | swing dmg=def.damage, strength heavy, force=knockback | `scripts/smoke/armed.smoke.mjs:123,129` | ✅ PASS |
| ARM-26 | interact while holding throws at def.throwSpeed toward facing | not directly asserted (no smoke/unit checks thrown speed) | ❌ GAP — no test evidence |
| ARM-27 | durability reached → `breaking` → removed 400ms later | `scripts/smoke/armed.smoke.mjs:123` (durability decrement only; `breaking`→removal timing not asserted) | ⚠️ Partial — durability drop tested, `PROP_BREAK_MS` 400ms removal not tested |
| ARM-13 | 20000ms unpicked rest → removed w/ curse smoke | `scripts/smoke/armed.smoke.mjs:60-69`, `tests/core/droppedTools.test.ts:11-20` | ✅ PASS |
| ARM-28 | rest timer restarts on return to rest | `tests/core/droppedTools.test.ts:21-35` | ✅ PASS |
| ARM-14 | 6-tool cap, oldest-resting evicted | `tests/core/droppedTools.test.ts:36-` | ✅ PASS |
| ARM-18 | new run clears dropped tools | `scripts/smoke/armed.smoke.mjs:184-193` | ✅ PASS |
| ARM-16 | debug snapshot has `worldProps` + `weapon` per enemy | `tests/game/debugApi.test.ts:58,61` (shape only); consumed live in `scripts/smoke/armed.smoke.mjs:58,151` | ✅ PASS (functional evidence via smoke) |
| ARM-19 | tool sprites/windup/shards use only `PALETTE` keys | `tests/game/art.test.ts:456-` | ✅ PASS |

### P2: Item na mão no HUD (3 ACs)

| AC | Spec-defined outcome | file:line + assertion | Result |
| --- | --- | --- | --- |
| ITEM-01 | PT name below counter while holding | `scripts/smoke/held-item.smoke.mjs:42-` | ✅ PASS |
| ITEM-02 | pips = durability-impacts, maxPips=durability | `scripts/smoke/held-item.smoke.mjs:79-80` (4→2 after 2 impacts) | ✅ PASS |
| ITEM-03 | empty hands → `heldItem: null` | `scripts/smoke/held-item.smoke.mjs:22` | ✅ PASS |

### P3: Ferramentas raras (7 ACs)

| AC | Spec-defined outcome | file:line + assertion | Result |
| --- | --- | --- | --- |
| RAR-01 | p=0.15, drawn after tool type | `tests/core/loot.test.ts:141-145` proves RNG call order (`chance,int,chance`); **no statistical test at the natural 0.15 rate** (only `rare:true` forced override at `tests/core/loot.test.ts:182-187`) | ⚠️ GAP — natural rate untested (compare HEAL-01's dedicated 0.08–0.12 statistical test; no analog exists for RAR-01) |
| RAR-02 | rare dmg `round(1.5×common)` (knife24,club39) | `tests/core/armed.test.ts:72-88` | ✅ PASS |
| RAR-06 | rare durability = common+2 (knife8,club7) | `tests/core/armed.test.ts:72-88`, `scripts/smoke/armed.smoke.mjs:152` | ✅ PASS |
| RAR-03 | sprite alternates `A` outline every 200ms | `tests/game/art.test.ts:456-` | ✅ PASS |
| RAR-07 | HUD name ends ` Rara` | `tests/core/armed.test.ts:104-108`, `scripts/smoke/armed.smoke.mjs:181` | ✅ PASS |
| RAR-04 | enemy holding rare tool: same attack values as common | `src/core/armed.ts:24-53` (`armFor(tool, base, t)` signature never receives rarity, so rarity structurally cannot affect the return value) — no test exercises this directly | ⚠️ Architecturally guaranteed, no direct test |
| RAR-05 | `rare=1` forces every tool rare | `tests/core/loot.test.ts:182-187`, `scripts/smoke/armed.smoke.mjs:151` | ✅ PASS |

**Status**: ❌ Gaps present (2 hard gaps with zero evidence, 1 statistical-rate gap, 4 weak/architectural-only items)

**Summary count**: 71/78 ACs with solid direct evidence · 7/78 flagged (2 GAP/no test: HEAL-10, ARM-10; 1 GAP/no runtime test: ARM-26; 1 statistical-rate gap: RAR-01; 3 weak/architectural: ECO-19, ECO-30/HEAL-07 shape-only, ARM-09 data-only, ARM-04/RAR-04 structural-only, ARM-27 partial)

Recount of flagged rows precisely: ECO-30, ECO-19, ARM-04, ARM-09, ARM-26, ARM-27, RAR-01, RAR-04, HEAL-07, HEAL-10 = 10 rows flagged ⚠️/❌ out of 78. Two are hard zero-evidence gaps (HEAL-10, ARM-10 — wait ARM-10 also zero-evidence) plus ARM-26 zero-evidence = **3 hard gaps**, 7 weak/partial-evidence flags.

---

## Discrimination Sensor

Isolated scratch: `git worktree add <scratchpad>/verify-wt HEAD`, node_modules linked via NTFS junction. All mutations applied with Edit/sed inside the worktree only; each reverted with `git checkout --` before the next; worktree removed with `git worktree remove --force` afterward. Real tree `git status --porcelain` before and after sensor run: identical (`?? .agents/`, `?? .claude/`, `?? .cursor/`, `?? .windsurf/`, `?? skills-lock.json`).

| # | file:line | Mutation | Tests run | Killed? |
| --- | --- | --- | --- | --- |
| 1 | `src/data/tuning.ts:181` | `magnetDelayMs: 300` → `0` (ímã 300ms threshold, ECO-10) | `tests/core/pickup.test.ts` | ✅ Killed (298/300ms boundary test fails) |
| 2 | `src/data/tuning.ts:182` | `magnetRange: 72` → `200` (ímã 72px threshold, ECO-10) | `tests/core/pickup.test.ts` | ✅ Killed (72/73px boundary test fails) |
| 3 | `src/core/loot.ts:51` | `Math.max(1, max-live)` → `Math.max(0, max-live)` (capDrop min-1 guarantee, ECO-15) | `tests/core/loot.test.ts` | ✅ Killed (`live 70+2` case expects spawn:1, got spawn:0) |
| 4 | `src/core/loot.ts:72-77` | Swapped fragment-count roll before heal roll (order cura→quantidade, ECO-17) | `tests/core/loot.test.ts` | ✅ Killed (order assertion `['chance','int']` fails, got `['int','chance']`) |
| 5 | `src/core/loot.ts:41` | `round < t.startRound` → `round <= t.startRound` (armedChance rodada 3, ARM-02) | `tests/core/loot.test.ts` | ✅ Killed (round-3 expects 0.15, got 0) |
| 6 | `src/core/wallet.ts:17` | Removed `n > this._fragments` guard (`spend` sem saldo, ECO-13/26) | `tests/core/wallet.test.ts` | ✅ Killed (spend-without-balance now returns true) |

**Sensor depth**: lightweight (6 targeted mutations on highest-risk tuning/threshold code)
**Sensor verdict**: 6/6 killed — all mutants caught (no surviving mutants; tests are discriminating for these behaviors)

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code / surgical changes | ✅ |
| No scope creep beyond spec | ✅ |
| Matches existing patterns (src/core + src/data pure logic, Node-testable per AD-001) | ✅ |
| Spec-anchored outcome check | ⚠️ 71/78 solid, 7 flagged above |
| Every test maps to a spec AC (no unclaimed tests) | ✅ — all reviewed test/smoke files carry explicit AC-ID comments |
| Documented guidelines followed | tlc-spec-driven EARS spec + AD-001 (Node-testable core), AD-004 (currency), AD-006 (seeded RNG) — all honored |

---

## Edge Cases

- [x] Drop during hitstop: spawns that frame (not independently verified in this pass, but no contrary evidence found; low risk)
- [x] Enemy dies against wall: no pickup ends frame inside solid — `tests/core/pickup.test.ts:73-88`
- [x] Player death: pickups/tools persist — implied by ECO-11/ARM-13 lifetime tests, not independently re-verified
- [x] Round cleared: pickups persist through intermission — not independently re-verified this pass
- [x] Player holding prop when armed enemy drops tool: stays in rest — architecturally consistent with ARM-08 (drop always happens regardless of player hand state)
- [ ] Thrown tool breaking not counted toward 6-tool cap — not directly tested (related to ARM-27 gap above)

---

## Gate Check

- **Gate command**: `npm run typecheck && npm test`
- **Result**: typecheck clean (0 errors); 568/568 tests passed, 0 failed, 0 skipped, across 38 test files
- **Smoke**: not run in full (not required — no ambiguous AC needed smoke-only confirmation beyond what unit tests + existing AC-tagged smoke files already show)

---

## Fix Plans (ranked)

### Fix 1: HEAL-10 — no test for player heal-flash tint
- **Root cause**: `src/scenes/TestScene.ts:359` calls `this.player.flash('G', 80)` on heal collect; `Player.flash()`/`Player.updateFlash()` (`src/game/Player.ts:242-250`) exist but nothing (unit or smoke) reads back flash state or duration.
- **Fix task**: expose flash state in the debug snapshot (or a dedicated `player.flashMs`/`flashColor` probe) and assert it in a smoke test after a heal collect.
- **Priority**: Minor (visual-only, no gameplay-state risk)

### Fix 2: ARM-10 — no test for tool visibility during ragdoll
- **Root cause**: `src/game/Enemy.ts:222-232` hides/shows `weaponView` on ragdoll/getup; no assertion anywhere reads this state.
- **Fix task**: add a `weaponVisible` (or similar) field to the enemy debug snapshot and a smoke assertion around a ragdoll→getup cycle for an armed enemy.
- **Priority**: Minor (visual-only)

### Fix 3: ARM-26 — thrown-tool speed/direction not asserted
- **Root cause**: no test drives "interact while holding" and reads the resulting `vx`/state to confirm `throwSpeed` and facing.
- **Fix task**: extend `armed.smoke.mjs` (or a droppedTools/props unit test) to throw a held tool and assert its horizontal speed equals the def's `throwSpeed` toward the player's facing.
- **Priority**: Major (gameplay-affecting mechanic, currently unverified)

### Fix 4: RAR-01 — no statistical test for the natural 0.15 rare rate
- **Root cause**: only the debug-forced `rare:true` override is tested; the actual RNG-driven 0.15 probability (parallel to HEAL-01's 0.08–0.12 statistical check) has no analog.
- **Fix task**: add a `loot.test.ts` case sampling `rollArmed` over N draws at a round with `cap` reached, asserting the rare fraction lands in a tolerance band around 0.15.
- **Priority**: Minor (tuning value is trivially read from `ECONOMY.armed.rareChance` and exercised by RNG-order test, but the rate itself is unverified)

### Fix 5 (lower priority, architectural but untested directly): ARM-04, RAR-04, ARM-09, ECO-19, ECO-30/HEAL-07
- Consider one smoke assertion each if a future refactor could accidentally reintroduce these behaviors (e.g., `armFor` gaining a rarity parameter, or `spawnFromCommand` calling `rollArmed` for the boss path). Current risk is low because the code structure makes the violation hard to introduce accidentally.
- **Priority**: Cosmetic/Minor

---

## Requirement Traceability Update

All 78 requirement IDs move from `Implementing` to the applicable status below (see per-AC table above for the specific evidence backing each):

| Status | Count | IDs |
| --- | --- | --- |
| ✅ Verified | 68 | all IDs in the per-AC tables marked ✅ PASS |
| ⚠️ Needs Fix (weak/architectural evidence) | 7 | ECO-19, ECO-30, HEAL-07, ARM-04, ARM-09, ARM-27, RAR-04 |
| ❌ Needs Fix (no test evidence) | 3 | HEAL-10, ARM-10, ARM-26 |

---

## Summary

**Overall**: ❌ Not Ready (gate is green and the core economy/drop/armed-enemy loop is solidly covered, but 3 ACs have zero test evidence and 7 more rest on weak or purely structural evidence)

**Spec-anchored check**: 68/78 ACs solidly matched to spec outcome; 10 flagged (3 zero-evidence gaps, 7 weak/architectural)
**Sensor**: 6/6 mutations killed
**Gate**: 568/568 tests passed, typecheck clean

**What works**: fragment drops, quantities, values, magnet physics (both thresholds), wallet arithmetic, heal-drop probability and healing, armed-enemy chance/tool-type/damage/windup tuning, dropped-tool lifetime/cap, held-item HUD, rare tool damage/durability — all backed by precise, spec-matching assertions and confirmed discriminating by the sensor.

**Issues found**:
1. ARM-26 (tool throw speed/direction) — no test at all; Major, gameplay-facing.
2. HEAL-10 (heal flash tint) and ARM-10 (ragdoll tool visibility) — no test at all; Minor, visual-only.
3. RAR-01 (natural 0.15 rare rate) — only the forced-override path is tested, not the real distribution.
4. ECO-19, ECO-30/HEAL-07, ARM-04, ARM-09, ARM-27, RAR-04 — implemented and indirectly/structurally sound, but lack a dedicated assertion tying them to their exact AC.

**Next steps**: route Fix 1–4 above as fix tasks (Fix 3/ARM-26 first, being gameplay-affecting); Fix 5 items are optional hardening, not blocking.

---

## Discrimination Sensor — Isolation Confirmation

`git status --porcelain` on the real worktree, before sensor setup and after `git worktree remove`, in both cases:
```
?? .agents/
?? .claude/
?? .cursor/
?? .windsurf/
?? skills-lock.json
```
Identical — no residue from the sensor run.
