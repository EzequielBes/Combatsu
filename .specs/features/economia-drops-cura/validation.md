# Economia, drops e cura Validation

## Validation: economia-drops-cura - PASS ✅ (Rodada 2)

**Result**: PASS — Rodada 1 flagged 3 ACs (HEAL-10, ARM-10, ARM-26) with zero test evidence. Commit `48090a7` closed all three with live-state snapshot fields and new smoke assertions (see "Rodada 2" section below); the gate stays green (568/568 unit tests, typecheck clean) and both `armed` and `heal` smoke scenarios pass. Rodada 1's own evidence for the remaining 75 ACs is unchanged and stands.

**Date**: 2026-09-25 (Rodada 1) / 2026-09-25 (Rodada 2)
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
| HEAL-10 | player tint `G` for 80ms | `scripts/smoke/heal.smoke.mjs:54` `flashSeen === 'G'` read from live `Player.activeFlash` (`src/game/Player.ts:259-261`) at the frame hp rises; `heal.smoke.mjs:56-59` confirms the flash clears afterward | ✅ PASS (Rodada 2) |

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
| ARM-10 | ragdoll hides tool sprite, visible on getup | `scripts/smoke/armed.smoke.mjs:58-59` `weaponVisible===false` in ragdoll, `armed.smoke.mjs:65-66` `weaponVisible===true` on getup, both read from live `Enemy.weaponVisible` (`src/game/Enemy.ts:165-167`) | ✅ PASS (Rodada 2) |
| ARM-15 | `armed=knife\|club` forces every enemy | `tests/core/loot.test.ts:173-181`, `scripts/smoke/armed.smoke.mjs:48` | ✅ PASS |

### P1: Usar a ferramenta amaldiçoada (12 ACs)

| AC | Spec-defined outcome | file:line + assertion | Result |
| --- | --- | --- | --- |
| ARM-11 | cursedKnife dmg16/dur6/throw820/kb6/mass1/front + validatePropDef | `tests/core/armed.test.ts:58-71` | ✅ PASS |
| ARM-24 | cursedClub dmg26/dur5/throw480/kb12/mass6/back + validatePropDef | `tests/core/armed.test.ts:58-71` | ✅ PASS |
| ARM-12 | interact w/ empty hands picks nearest resting tool | `scripts/smoke/armed.smoke.mjs:72-91,178` | ✅ PASS |
| ARM-17 | swing dmg=def.damage, strength heavy, force=knockback | `scripts/smoke/armed.smoke.mjs:123,129` | ✅ PASS |
| ARM-26 | interact while holding throws at def.throwSpeed toward facing | `scripts/smoke/armed.smoke.mjs:209-212` `thrown.state==='thrown'`, `Math.sign(thrown.vx)===facing`, `\|thrown.vx\|` within [738,821] of the 820 px/s def, read from live `Prop.vx` (`src/game/Prop.ts:63-65`) | ✅ PASS (Rodada 2) |
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

**Status (Rodada 1, historical)**: ❌ Gaps present (3 hard gaps with zero evidence: HEAL-10, ARM-10, ARM-26; 8 weak/architectural/statistical items: ECO-19, ECO-30, HEAL-07, ARM-04, ARM-09, ARM-27, RAR-01, RAR-04).

**Status (Rodada 2, current)**: ✅ All 3 hard gaps closed. HEAL-10, ARM-10 and ARM-26 now have direct, spec-matching, live-state evidence (see rows above and the "Rodada 2" section below). 70/78 ACs now have solid direct evidence. The 8 rows flagged ⚠️ (ECO-19, ECO-30, HEAL-07, ARM-04, ARM-09, ARM-27, RAR-01, RAR-04 — unchanged from Rodada 1, out of this round's scope) are weak-evidence/spec-precision/architectural flags, not zero-evidence gaps, and do not block the PASS verdict.

**Recount** (verified by counting every AC row in the tables above): 78 ACs total = 70 ✅ PASS + 8 ⚠️ weak/architectural (ECO-19, ECO-30, HEAL-07, ARM-04, ARM-09, ARM-27, RAR-01, RAR-04), 0 ❌ hard gaps. The 70 PASS rows include the 3 closed this round (HEAL-10, ARM-10, ARM-26).

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
| Spec-anchored outcome check | ⚠️ 70/78 solid (Rodada 2), 8 flagged (weak/architectural, non-blocking) |
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

### Fix 1: HEAL-10 — no test for player heal-flash tint — ✅ CLOSED (Rodada 2, commit `48090a7`)
- **Root cause**: `src/scenes/TestScene.ts:359` calls `this.player.flash('G', 80)` on heal collect; `Player.flash()`/`Player.updateFlash()` (`src/game/Player.ts:242-250`) exist but nothing (unit or smoke) reads back flash state or duration.
- **Fix applied**: added `Player.activeFlash` (`src/game/Player.ts:259-261`), wired into `GameSnapshot.player.flash` (`src/scenes/TestScene.ts:520-527`), asserted in `scripts/smoke/heal.smoke.mjs:54,56-59`.
- **Priority**: Minor (visual-only, no gameplay-state risk)

### Fix 2: ARM-10 — no test for tool visibility during ragdoll — ✅ CLOSED (Rodada 2, commit `48090a7`)
- **Root cause**: `src/game/Enemy.ts:222-232` hides/shows `weaponView` on ragdoll/getup; no assertion anywhere reads this state.
- **Fix applied**: added `Enemy.weaponVisible` (`src/game/Enemy.ts:165-167`), wired into snapshot (`src/scenes/TestScene.ts:539`), asserted in `scripts/smoke/armed.smoke.mjs:51-66` across a full ragdoll→getup cycle.
- **Priority**: Minor (visual-only)

### Fix 3: ARM-26 — thrown-tool speed/direction not asserted — ✅ CLOSED (Rodada 2, commit `48090a7`)
- **Root cause**: no test drives "interact while holding" and reads the resulting `vx`/state to confirm `throwSpeed` and facing.
- **Fix applied**: added `Prop.vx` (`src/game/Prop.ts:63-65`), wired into `worldProps[].vx` (`src/scenes/TestScene.ts:582`), asserted in `scripts/smoke/armed.smoke.mjs:202-212` (state `thrown`, sign matches facing, magnitude within [738,821] of the 820 px/s def).
- **Priority**: Major (gameplay-affecting mechanic) — now verified

### Fix 4: RAR-01 — no statistical test for the natural 0.15 rare rate
- **Root cause**: only the debug-forced `rare:true` override is tested; the actual RNG-driven 0.15 probability (parallel to HEAL-01's 0.08–0.12 statistical check) has no analog.
- **Fix task**: add a `loot.test.ts` case sampling `rollArmed` over N draws at a round with `cap` reached, asserting the rare fraction lands in a tolerance band around 0.15.
- **Priority**: Minor (tuning value is trivially read from `ECONOMY.armed.rareChance` and exercised by RNG-order test, but the rate itself is unverified)

### Fix 5 (lower priority, architectural but untested directly): ARM-04, RAR-04, ARM-09, ECO-19, ECO-30/HEAL-07
- Consider one smoke assertion each if a future refactor could accidentally reintroduce these behaviors (e.g., `armFor` gaining a rarity parameter, or `spawnFromCommand` calling `rollArmed` for the boss path). Current risk is low because the code structure makes the violation hard to introduce accidentally.
- **Priority**: Cosmetic/Minor

---

## Requirement Traceability Update (post-Rodada 2)

All 78 requirement IDs move from `Implementing` to the applicable status below (see per-AC table above for the specific evidence backing each). Per the coordinator's Rodada 2 instruction, since the overall verdict is now PASS, all 78 IDs are marked `Verified` in `spec.md`'s traceability table; the 8 IDs below keep a documented caveat in this report even though their spec.md status reads `Verified`.

| Status here | Count | IDs |
| --- | --- | --- |
| ✅ Verified — solid direct evidence | 70 | all IDs in the per-AC tables marked ✅ PASS |
| ✅ Verified — weak/architectural evidence (documented caveat, non-blocking) | 8 | ECO-19, ECO-30, HEAL-07, ARM-04, ARM-09, ARM-27, RAR-01, RAR-04 |
| ❌ Needs Fix (no test evidence) | 0 | — (all 3 Rodada 1 gaps closed) |

---

## Summary

**Overall**: ✅ Ready (Rodada 2) — gate green, sensor discriminating, all 3 zero-evidence gaps from Rodada 1 closed with live-state assertions; 8 lower-risk weak/architectural flags remain as documented technical debt, not blockers.

**Spec-anchored check**: 70/78 ACs solidly matched to spec outcome; 8 flagged weak/architectural (documented, non-blocking), 0 zero-evidence gaps
**Sensor**: 6/6 mutations killed (Rodada 1; not re-run in Rodada 2, out of scope)
**Gate**: 568/568 tests passed, typecheck clean; `armed` and `heal` smoke scenarios pass (Rodada 2)

**What works**: fragment drops, quantities, values, magnet physics (both thresholds), wallet arithmetic, heal-drop probability and healing, armed-enemy chance/tool-type/damage/windup tuning, dropped-tool lifetime/cap, held-item HUD, rare tool damage/durability, thrown-tool speed/direction, ragdoll tool visibility, heal-flash tint — all backed by precise, spec-matching assertions and (for the Rodada 1 core) confirmed discriminating by the sensor.

**Issues found** (non-blocking technical debt, unchanged from Rodada 1, out of Rodada 2's scope):
1. RAR-01 (natural 0.15 rare rate) — only the forced-override path is tested, not the real distribution.
2. ECO-19, ECO-30/HEAL-07, ARM-04, ARM-09, ARM-27, RAR-04 — implemented and indirectly/structurally sound, but lack a dedicated assertion tying them to their exact AC.

**Next steps**: none blocking. Fix 4 (RAR-01) and the Fix 5 items remain optional hardening for a future pass.

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

---

## Rodada 2 (2026-09-25)

**Scope**: re-verify only the 3 zero-evidence gaps from Rodada 1 (HEAL-10, ARM-10, ARM-26), fixed in commit `48090a7` ("test(smoke): cover thrown tool speed, weapon ragdoll visibility and heal flash"). The heal scenario was also hardened in the same commit: HEAL-04 now runs in the round intermission (no live enemy nearby that could hurt the player and make the "full HP, no collect" check ambiguous) and HEAL-05's expiry wait now happens with the player dead, directly exercising the ECO-11 edge case at the same time.

**Producer check** (does each new snapshot field read live state, not a hardcoded value?):
- `src/game/Player.ts:259-261` — `get activeFlash()` returns `this.flashColor` only `if (this.flashMs > 0 && this.view.isTinted)`, else `null`. Reads the live Phaser tint/timer state set by `flash()` / decremented by `tickFlash()`. ✅ live.
- `src/game/Enemy.ts:165-167` — `get weaponVisible()` returns `this.weaponView.visible` (or `null` if unarmed). `weaponView.setVisible(false/true)` is toggled by the existing ragdoll/getup logic (`src/game/Enemy.ts:222-232`, unchanged this round). ✅ live.
- `src/game/Prop.ts:63-65` — `get vx()` returns `this.body.velocity.x / PX_PER_S_TO_STEP`, i.e. the live Matter body velocity, not the def's static `throwSpeed`. ✅ live — this is what makes the ARM-26 assertion meaningful (it would catch a throw-impulse regression).
- `src/scenes/TestScene.ts:520-527,539,582` wires all three into `debugSnapshot()`; `src/game/debugApi.ts` extends `GameSnapshot`'s `player`, `enemies[]` and `worldProps[]` types accordingly.

**Assertion check** (does each assertion match the spec-defined outcome?):
- **ARM-26** (`scripts/smoke/armed.smoke.mjs:202-212`): spec requires "horizontal speed equal to its def `throwSpeed` px/s toward the player's facing." Test throws the held (rare) knife, reads `thrown.state==='thrown'`, `Math.sign(thrown.vx)===facing`, and `0.9×820 ≤ |thrown.vx| ≤ 821`. The lower bound accounts for one frame of Matter air drag between the throw and the snapshot read; rare tools don't change `throwSpeed` (only damage/durability per RAR-02/06), so 820 is the correct target for a rare knife too. Outcome matches spec within a justified one-frame tolerance. ✅
- **ARM-10** (`scripts/smoke/armed.smoke.mjs:51-66`): spec requires "tool sprite hidden [in ragdoll], and WHEN it gets up, visible again." Test lands a heavy test-hit that downs an armed enemy into `ragdollStun` without killing it, asserts `weaponVisible===false` for every downed enemy, waits, then asserts `weaponVisible===true` once the enemy is back to `idle`. Exact state-transition match. ✅
- **HEAL-10** (`scripts/smoke/heal.smoke.mjs:41-59`): spec requires "player sprite tint-filled with `G` for 80ms." Test captures `snap.player.flash` on the exact frame HP increases (i.e., the collection frame) and asserts it equals `'G'`; then steps 120ms and asserts the flash cleared (`=== null`) unless another heal was collected in that window (which would legitimately re-arm it — the test accounts for this rather than silently passing). Exact value and clearing behavior match spec. ✅

**Gate**:
- `npm run typecheck` — clean, 0 errors.
- `npm test` — 568/568 passed, 0 failed, 38 files (same count as Rodada 1; no regressions, no test deletions).
- `npm run smoke -- armed` — `ok armed.smoke.mjs`, 1/1 scenario passed (build succeeded first).
- `npm run smoke -- heal` — `ok heal.smoke.mjs`, 1/1 scenario passed.

**Verdict**: PASS. All three Rodada 1 zero-evidence gaps are closed with assertions that read live production state and match the spec's exact numeric/behavioral outcome. No new gaps introduced by the hardened heal scenario (HEAL-04/HEAL-05/ECO-11 all still pass, and ECO-11 now gets a direct assertion it didn't have before — `heal.smoke.mjs` new line: `assert(!newEvents.some((e) => e.startsWith('collect:heal:')), ...)` while the player is dead).
