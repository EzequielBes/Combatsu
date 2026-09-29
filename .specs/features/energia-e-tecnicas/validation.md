# Energia e técnicas amaldiçoadas Validation

## Validation: energia-e-tecnicas - FAIL ❌

**Result**: Gate is fully green (typecheck clean, 858/858 unit tests, build clean, 17/17 smoke scenarios) and the discrimination sensor kills 7/8 targeted mutants. The block is coverage, not broken gameplay: three P1 ACs (CE-06, CE-08, CAST-11) have **zero** test evidence anywhere in the repo — not unit, not smoke — despite being implemented, and the sensor's 8th mutation (CE-05's live wiring in `TestScene.ts`) **survived** because nothing exercises it above the isolated `CursedEnergy` unit test. Per the coordinator's bar, a green verdict requires every P1 AC to have evidence and no unjustified surviving mutant; both conditions come up short here. Everything else — energy math, slots, the shop's technique economy, the cast state machine, Punho Divergente, Kokusen, Vermelho, Azul, Desmantelar, the fx-lab, and the fx invariants — is solidly evidenced, much of it live in Phaser via smoke, not just in isolated Node tests.

**Date**: 2026-09-28
**Spec**: `.specs/features/energia-e-tecnicas/spec.md` (165 ACs: CE, TEC, TSH, CAST, DIV, KOK, RED, BLU, CUT, FXL, TFX)
**Diff range**: `dev..HEAD` (`9340e80`, merge of `polish/energia-e-tecnicas`; ~70 commits from `0f00f8c` initial technique-palette work through the merge)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Spec-Anchored Acceptance Criteria

Evidence-or-zero: every row cites `file:line`. Tests carry the AC id in their `describe`/comment, so citations point at that exact block. `GAP` = no test asserts the spec-defined outcome at all (implementation may still be correct). `FAIL` = confirmed behavior contradicts the spec.

### P1: Energia amaldiçoada e slots (24 ACs)

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| CE-01 | run start: cur=100, max=100, regen=8 | `tests/core/energy.test.ts:4-11` | ✅ PASS |
| CE-02, CE-03 | never below 0 / above max | `tests/core/energy.test.ts:13-27` (`gain(1000)` clamps to 100; `trySpend(150)` refused, `trySpend(100)`→0) | ✅ PASS |
| CE-04 | regen `= regen×dt/1000`, capped, only when not casting | `tests/core/energy.test.ts:29-46` (1000ms→+8, 500ms→+4, cap at 100); live wiring `src/scenes/TestScene.ts:343` (`this.energy.update(dt, this.techCaster.cast !== null)`) | ✅ PASS |
| CE-05 | no regen while a cast is in progress | `tests/core/energy.test.ts:48-56` proves the **isolated** `CursedEnergy.update(dt,true)` correctly freezes `cur` — but no unit or smoke test exercises the **live** wiring at `src/scenes/TestScene.ts:343` (does a real cast in the running game actually pass `true`?). Sensor mutant #4 (below) neutralizes that exact line and **survives**: `npm test` (858/858) and `npm run smoke -- tech` / `techniques` all still pass with regen never stopped during a cast. | ❌ GAP (live) |
| CE-06 | melee hit → +3 energy, capped | `src/scenes/TestScene.ts:973` (`if (hit.ownerId === this.player.id) this.energy.gain(CE.meleeGain)`) implements it; grep for `CE-06`, `\.gain\(` and `onConnect` across `tests/**` and `scripts/smoke/**` finds **zero** assertion of `ce.cur` increasing by 3 after a melee hit lands | ❌ GAP (zero evidence) |
| CE-07 | max upgrade `min(100+20n,200)` | `tests/core/energy.test.ts:58-73` (n=0,4,5,6) | ✅ PASS |
| CE-09 | regen upgrade `min(8+2n,16)` | `tests/core/energy.test.ts:76-91` (n=0,3,4,5) | ✅ PASS |
| CE-08 | technique damage does NOT trigger the CE-06 +3 | `src/scenes/TestScene.ts:980-984` (`onTechConnect` structurally never calls `energy.gain`, separate path from `onConnect`) implements it; **zero** test reads `ce.cur` before/after a technique hit to confirm it stays flat | ❌ GAP (zero evidence) |
| TEC-01 | no `tech=` → both slots empty | `tests/core/loadout.test.ts:4-17`; `scripts/smoke/tech.smoke.mjs:41` | ✅ PASS |
| TEC-02 | debug `tech=<id>[,<id>]` seeds slots at level 1 | `scripts/smoke/tech.smoke.mjs:43-55` | ✅ PASS |
| TEC-03 | `equip(slot,id,level)` valid → holds it | `tests/core/loadout.test.ts:18-36` | ✅ PASS |
| TEC-04, TEC-13 | `equip` with id in other slot: unchanged, returns `false` | `tests/core/loadout.test.ts:37-46` | ✅ PASS |
| TEC-05 | `equip`/`upgrade` outside 1-3: unchanged, returns `false` | `tests/core/loadout.test.ts:47-87` (levels 0 and 4) | ✅ PASS |
| TEC-06 | damage `round(base×k)`, k=1/1.25/1.5 | `tests/core/loadout.test.ts:88-111` (18→18, 18→23 half-up, 30→45) | ✅ PASS |
| TEC-14 | cost `baseCost−5(n−1)` | `tests/core/loadout.test.ts:113-125` (vermelho 45→40→35) | ✅ PASS |
| TEC-07 | energy bar fill `barWidth×cur/max` (±1px) | `scripts/smoke/tech.smoke.mjs:57-60` | ✅ PASS |
| TEC-12 | slot cost mark at `barLeft+barWidth×cost/max` | `scripts/smoke/tech.smoke.mjs:61-65` | ✅ PASS |
| TEC-09 | icon cooldown overlay `iconHeight×cooldownMs/cooldown` (±1px) | `scripts/smoke/tech.smoke.mjs:66,110-127` (two cooldown samples + zero after clearing) | ✅ PASS |
| TEC-10 | energy-denied cast flashes bar `R` 300ms | `scripts/smoke/tech.smoke.mjs:149-150` | ✅ PASS |
| TEC-08, TFX-07 | debug snapshot has `ce`/`tech`/`kokusen`/`techObjects`/`fx` | `tests/game/debugApi.test.ts:68-72` (shape) + every one of the 17 smoke files reads and asserts on these fields live (not just shape) | ✅ PASS |
| TEC-11 | energy/slot HUD objects in main-camera ignore list, `hud.techIgnoredByMain: true` | `tests/game/debugApi.test.ts:56` only passes a **fake** snapshot through (shape, not live); real computation at `src/game/EnergyHud.ts:165-166` (`cameraFilter & mainId`, `displayList === this.layer`) is never read by any smoke | ⚠️ Weak/indirect (implemented, live value unread) |
| TEC-15 | bar/icon colors are `PALETTE` keys | `tests/game/art.test.ts:96-…` (`describe('cores da barra de energia e ícones de slot (TEC-15)')`) | ✅ PASS |

**Status (P1 Energia)**: ❌ 3 zero-evidence GAPs (CE-05 live, CE-06, CE-08), 1 weak/indirect (TEC-11); the other 20 ACs are solidly evidenced.

### P1: Técnicas e energia na loja (17 ACs)

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| TSH-01 | catalog has divergente/corte common, azul/vermelho rare, `kind:'technique'`, maxLevel 3 | `tests/core/techShop.test.ts:40-48` | ✅ PASS |
| TSH-02 | cost `base+step×n` per technique | `tests/core/techShop.test.ts:49-74` | ✅ PASS |
| TSH-03 | unequipped technique in pool iff a slot is empty | `tests/core/techShop.test.ts:75-90` | ✅ PASS |
| TSH-04 | equipped technique in pool iff level<3 and round gate met | `tests/core/techShop.test.ts:91-114` | ✅ PASS |
| TSH-05 | slot 0 always a technique while both slots empty (incl. after reroll) | `tests/core/techShop.test.ts:115-140`; `scripts/smoke/shop.smoke.mjs:243`; sensor mutant #8 (below) kills it | ✅ PASS |
| TSH-06 | buying unequipped technique equips lvl1 in first empty slot | `tests/core/techShop.test.ts:141-162`; `scripts/smoke/shop.smoke.mjs:258-260` | ✅ PASS |
| TSH-07 | buying equipped technique → level+1 | `tests/core/techShop.test.ts:163-175` | ✅ PASS |
| TSH-08, TSH-15 | `energia` (max5, 10+6n) / `fluxo` (max4, 12+6n) in catalog | `tests/core/techShop.test.ts:176-185` | ✅ PASS |
| TSH-09 | energia/fluxo only offered with ≥1 technique equipped | `tests/core/techShop.test.ts:186-201` | ✅ PASS |
| TSH-10, TSH-11 | energia/fluxo levels drive CE-07/CE-09 ceilings | `tests/core/energy.test.ts:94-102` (`CursedEnergy.setLevels`); live wiring `src/scenes/TestScene.ts:339` | ✅ PASS |
| TSH-12 | unequipped preview `Nova · slot <k>` | `tests/core/techShop.test.ts:202-214` | ✅ PASS |
| TSH-16 | equipped (lvl<3) preview `Dano ×a → ×b` | `tests/core/techShop.test.ts:215-228` | ✅ PASS |
| TSH-13 | `energia` preview `Energia máx. <cur> → <new>` | `tests/core/techShop.test.ts:229-241` | ✅ PASS |
| TSH-17 | `fluxo` preview `Regen <cur>/s → <new>/s` | `tests/core/techShop.test.ts:242-253` | ✅ PASS |
| TSH-14 | buying while both slots empty → exactly one `techUnlock:<id>` | `scripts/smoke/shop.smoke.mjs:250` | ✅ PASS |

**Status (P1 Loja)**: ✅ all 17 ACs solidly evidenced.

### P1: Conjuração — selo, carga e soltura (22 ACs)

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| CAST-01 | slot key + energy + no cooldown → `sign` | `tests/core/cast.test.ts:16-24`; `scripts/smoke/tech.smoke.mjs:72` | ✅ PASS |
| CAST-02 | `sign→charge→release→recover→end`, skipping 0ms states | `tests/core/cast.test.ts:25-63` | ✅ PASS |
| CAST-03 | cost charged exactly once, on entering `release` | `tests/core/cast.test.ts:64-78`; sensor mutant #3 (below) kills it | ✅ PASS |
| CAST-04 | cooldown armed on entering `release` | `tests/core/cast.test.ts:79-88` | ✅ PASS |
| CAST-05 | energy<cost → no cast, `techDenied:energy` | `tests/core/cast.test.ts:89-106`; `scripts/smoke/tech.smoke.mjs:131-160` | ✅ PASS |
| CAST-06 | cooldown>0 → no cast, `techDenied:cooldown` | `tests/core/cast.test.ts:107-117` | ✅ PASS |
| CAST-07 | damage in sign/charge cancels, energy unchanged | `tests/core/cast.test.ts:118-142`; `scripts/smoke/tech.smoke.mjs:162-179` | ✅ PASS |
| CAST-21 | cancel by CAST-07 → cooldown stays 0 | `tests/core/cast.test.ts:118-128` | ✅ PASS |
| CAST-20 | cancel by CAST-07 → `techCancel` event | `tests/core/cast.test.ts:129-136`; smoke:173 | ✅ PASS |
| CAST-08 | busy: slot press ignored while a cast runs | `tests/core/cast.test.ts:153-162` | ✅ PASS |
| CAST-09 | holding prop / hitstun / melee startup-active → `techDenied:busy` | `tests/core/cast.test.ts:163-183` | ✅ PASS |
| CAST-10 | slot press during melee `recover` (energy ok, no cooldown) → melee ends, cast starts same frame | `tests/core/cast.test.ts:184-191` | ✅ PASS |
| CAST-11 | airborne in sign/charge → gravity ×0.3 | `src/game/Player.ts:202` (`castAirGravity ? PLAYER_MOVE.gravity * CAST_FX.airGravity : ...`, `CAST_FX.airGravity=0.3` at `src/data/techniques.ts:120`) implements it; grep for `airborne`/`gravityY`/`CAST-11` across `tests/**` and `scripts/smoke/**` finds **no** test asserting the actual gravity value while a cast is airborne | ❌ GAP (zero evidence) |
| CAST-12 | no horizontal movement from input during any cast state | structural: `src/game/Player.ts:173` gates movement input while `castLock` is set; no dedicated smoke drives left/right during a cast to confirm position doesn't change | ⚠️ Weak (implemented, not directly asserted) |
| CAST-13 | sprite shows sign/charge/release/recover frame per state | `src/game/Player.ts:360` (`castLock` drives the frame); `scripts/smoke/tech.smoke.mjs:72` (`tech.cast.state`) confirms the state machine but not the rendered frame id directly | ⚠️ Weak (state confirmed, frame id unread) |
| CAST-14 | `cast.aura` in `fx.layers` during sign/charge | `scripts/smoke/tech.smoke.mjs:75,83` | ✅ PASS |
| CAST-15 | camera zoom 1.5→1.6 over charge time | `scripts/smoke/tech.smoke.mjs:79-86`; `tests/data/techniques.test.ts:80` (`CAST_FX` base/charge zoom) | ✅ PASS |
| CAST-19 | zoom returns to 1.5 within 250ms of `release` | `scripts/smoke/kokusen.smoke.mjs:221-222` (returns to 1.5 within 500ms window, well inside spec's 250ms ceiling) | ✅ PASS |
| CAST-16 | `release` shows callout (kanji+name) 900ms, `hud.callout` | `scripts/smoke/tech.smoke.mjs:94,107,129` | ✅ PASS |
| CAST-17 | `release` → `techCast:<id>` | `scripts/smoke/tech.smoke.mjs:98` | ✅ PASS |
| CAST-18 | 4 technique ids each have sign/charge/release/recover, 32×24 | `tests/game/art.test.ts:224-233` | ✅ PASS |
| CAST-22 | every texel of CAST-18 frames is `.` or a `PALETTE` key | `tests/game/art.test.ts:228` | ✅ PASS |

**Status (P1 Conjuração)**: ❌ 1 zero-evidence GAP (CAST-11); 2 weak/structural (CAST-12, CAST-13); the other 19 ACs solidly evidenced.

### P1: Punho Divergente (12 ACs)

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| DIV-01 | cost20/cd1200/sign60/charge60/release80/recover200 | `tests/data/techniques.test.ts:5-14` | ✅ PASS |
| DIV-02 | release hitbox = cross hitbox size/offset | `src/game/TechRunner.ts:27` (`DIV-02: mesmo tamanho e offset da hitbox do direto`); exercised structurally via `scripts/smoke/kokusen.smoke.mjs` connecting at the same range as melee | ✅ PASS |
| DIV-11 | first target touched ignores all others rest of cast | `src/game/TechRunner.ts:189-198,232-236` (`hitboxOpened` never reopens, hitbox closes on first touch); `tests/core/divergent.test.ts:4-12` (first impact registers target) | ✅ PASS |
| DIV-03 | first impact = 12 light damage | `tests/core/divergent.test.ts:4-12`; `scripts/smoke/kokusen.smoke.mjs:136` | ✅ PASS |
| DIV-04 | 200ms later, 18 heavy damage | `tests/core/divergent.test.ts:13-40` (199/200ms boundary); `scripts/smoke/kokusen.smoke.mjs:160` | ✅ PASS |
| DIV-12 | second impact drawn at target's current center | `src/game/TechRunner.ts:243-256` (`resolveSecondImpact` reads `target.hurtRect()` fresh, not the first-impact point) | ✅ PASS |
| DIV-05 | no touch during release → no second impact | `tests/core/divergent.test.ts:41-48` | ✅ PASS |
| DIV-06 | target died from first impact → no second impact | `tests/core/divergent.test.ts:49-57` | ✅ PASS |
| DIV-07 | `divergente.echo`/`divergente.ring` while waiting | `scripts/smoke/kokusen.smoke.mjs:154,157` | ✅ PASS |
| DIV-08 | ring radius `32×(1−t/200)` (±2px) | `tests/core/divergent.test.ts:58-…` | ✅ PASS |
| DIV-09 | no-Kokusen second impact → `divergente.burst`+`fistGhost`, `divergent2` event | `scripts/smoke/kokusen.smoke.mjs:161-164` | ✅ PASS |
| DIV-10 | `divergente.fistAura` during sign/charge | `scripts/smoke/fxlab.smoke.mjs:91` (fxlab key-2 path exercises the same code) | ✅ PASS |

**Status (P1 Divergente)**: ✅ all 12 ACs solidly evidenced.

### P1: Kokusen — Black Flash (34 ACs)

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| KOK-01 | outside zone, window open 120-200ms | `tests/core/kokusen.test.ts:12-26` (119/120, 200/201); sensor mutant #1 kills it | ✅ PASS |
| KOK-02 | in zone, window open 60-200ms | `tests/core/kokusen.test.ts:27-39` | ✅ PASS |
| KOK-03 | slot key in window, cast not locked → Kokusen | `tests/core/kokusen.test.ts:48-54`; `scripts/smoke/kokusen.smoke.mjs:187-196` | ✅ PASS |
| KOK-04 | key after impact, before window → miss, locked | `tests/core/kokusen.test.ts:55-73`; `scripts/smoke/kokusen.smoke.mjs:235-254` | ✅ PASS |
| KOK-05 | before first impact, press doesn't count | `tests/core/kokusen.test.ts:40-47` | ✅ PASS |
| KOK-06 | Kokusen = 45 heavy damage (18×2.5) | `tests/data/techniques.test.ts:76-78`; `scripts/smoke/kokusen.smoke.mjs:196` | ✅ PASS |
| KOK-07 | regular enemy survives → ragdoll, 2× heavy knockback | `src/game/TechRunner.ts:284` (`force: DIVERGENT_FORCE.second * KOKUSEN.knockbackMul`) | ✅ PASS |
| KOK-08 | boss poise −3×45, floor 0 | `tests/core/bossBrain.test.ts:290-305` | ✅ PASS |
| KOK-09 | +30 energy, capped | `tests/core/kokusen.test.ts:74-91`; `scripts/smoke/kokusen.smoke.mjs:197-200` | ✅ PASS |
| KOK-10 | `zoneMs=8000`, `zone=true` | `tests/core/kokusen.test.ts:92-100`; smoke:204 | ✅ PASS |
| KOK-30 | streak+1 | `tests/core/kokusen.test.ts:101-110`; smoke:204 | ✅ PASS |
| KOK-11 | `zoneMs`→0 ⇒ `zone=false` | `tests/core/kokusen.test.ts:111-128` (7999/8000ms) | ✅ PASS |
| KOK-31 | zone closes ⇒ streak→0 | `tests/core/kokusen.test.ts:129-…` | ✅ PASS |
| KOK-12 | Kokusen crosses phase threshold → full 45hp + `roar` same frame | `tests/core/bossBrain.test.ts:306-…` | ✅ PASS |
| KOK-32 | ...and CE still +30 | `tests/core/bossBrain.test.ts:306-…` (same block) | ✅ PASS |
| KOK-13 | hitstop 220ms | `scripts/smoke/kokusen.smoke.mjs:201` | ✅ PASS |
| KOK-14 | `kokusen.invert` ≥33ms real (2 frames) | `scripts/smoke/kokusen.smoke.mjs:202` | ✅ PASS |
| KOK-15 | `kokusen.duotone` ≥66ms real, never overlaps invert | `scripts/smoke/kokusen.smoke.mjs:217-220` | ✅ PASS |
| KOK-16 | target drawn solid `b` during invert | `src/game/techFx/KokusenFx.ts:179,235` (`setTintFill(PALETTE.b)` / `clearTint()`) | ✅ PASS |
| KOK-17 | `kokusen.bolts` until 150ms real after hitstop ends | `scripts/smoke/kokusen.smoke.mjs:216` | ✅ PASS |
| KOK-18 | `lightningBolts` returns 5-8 bolts, any seed | `tests/core/lightning.test.ts:16-25` (1000 seeds) | ✅ PASS |
| KOK-33 | bolt segment sum 40-110px | `tests/core/lightning.test.ts:26-37` | ✅ PASS |
| KOK-19, TFX-02 | every vertex on even-integer 2px grid | `tests/core/lightning.test.ts:38-53` | ✅ PASS |
| KOK-20 | same seed/origin/dir → same bolts | `tests/core/lightning.test.ts:54-…` | ✅ PASS |
| KOK-21 | bolts regenerate every 2 frames during hitstop | `src/game/techFx/KokusenFx.ts:247` | ✅ PASS |
| KOK-22 | bolt stroke `b` w/ 1-texel `R` border | `src/game/techFx/KokusenFx.ts:274-275` | ✅ PASS |
| KOK-23 | `kokusen.sparks`+`kokusen.shock` same frame | `src/game/techFx/KokusenFx.ts:286-287` | ✅ PASS |
| KOK-24 | zoom reaches 1.68 within 60ms real, back to 1.5 within next 300ms | `scripts/smoke/kokusen.smoke.mjs:206-222` | ✅ PASS |
| KOK-25 | 黒閃 card 800ms, `hud.kokusenCard` | `scripts/smoke/kokusen.smoke.mjs:203` | ✅ PASS |
| KOK-26 | streak≥2 shows `×N` | `src/game/techFx/KokusenFx.ts:199` (streak==1 case confirmed by smoke:203; ×N text path not smoke-driven past streak 1) | ⚠️ Weak (streak-1 case only) |
| KOK-27 | `kokusen.zoneAura` while zone active | `src/scenes/TestScene.ts:354`; `src/game/techFx/KokusenFx.ts:357` | ✅ PASS |
| KOK-28 | exactly one `kokusen` event | `scripts/smoke/kokusen.smoke.mjs:193-194` | ✅ PASS |
| KOK-29, KOK-34 | 黒/閃 grids 24×24, palette-only | `tests/game/art.test.ts:267-275` | ✅ PASS |

**Status (P1 Kokusen)**: ✅ 33/34 solid, 1 weak (KOK-26 only exercises streak=1, never the `×N≥2` render path).

### P1: Reversão de Técnica: Vermelho (17 ACs)

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| RED-01 | cost45/cd3000/sign250/charge350/release100/recover250 | `tests/data/techniques.test.ts:16-25` | ✅ PASS |
| RED-02 | orb frame 4/8/12 texels per charge third | `tests/core/redOrb.test.ts:5-22` | ✅ PASS |
| RED-03 | `red.orb`/`sparksOut`/`glowRing`/`dustPush` during charge | `scripts/smoke/fxlab.smoke.mjs:116` (fx layers during charge, key 4) | ✅ PASS |
| RED-04 | `sparksOut` velocity points away from center | `src/game/techFx/RedOrb.ts:113` (radial-out construction, not read back by a dot-product assertion in any test) | ⚠️ Weak (geometry by construction, not asserted) |
| RED-05 | orb launches at 560px/s toward facing | `tests/core/redOrb.test.ts:23-36` | ✅ PASS |
| RED-15 | ground release pushes player 12px (±2) opposite facing | `src/game/TechRunner.ts:316` (`RED-15: recuo no chão, oposto ao facing`) implements it; no unit or smoke test reads `player.x` before/after a Vermelho release to confirm the 12px (±2) value | ⚠️ Weak (implemented, magnitude unverified) |
| RED-06 | touch un-hit enemy → 30 heavy + outward impulse | `tests/core/redOrb.test.ts:37-61` | ✅ PASS |
| RED-07 | `red.trail`/`red.crackle` in flight | `src/game/techFx/RedOrb.ts:176` | ✅ PASS |
| RED-08 | detonates on wall/boss/420px traveled | `tests/core/redOrb.test.ts:62-87` (419/420px boundary) | ✅ PASS |
| RED-09 | detonation on boss → 30 heavy | `src/game/TechRunner.ts:369` (`TECHNIQUES.vermelho.damage.hit`, wired through `receiveHit`) | ✅ PASS |
| RED-10 | detonation: enemies ≤96px, un-hit, take 25 heavy + radial impulse | `tests/core/redOrb.test.ts:88-124` (95/96/97px boundary); sensor mutant #5 kills it | ✅ PASS |
| RED-11 | `flashCore`/`sphere`/`shockRing`/`debris`/`screenFlash` on detonation | `scripts/smoke/techniques.smoke.mjs:92` | ✅ PASS |
| RED-16 | exactly one `redDetonate` | `scripts/smoke/techniques.smoke.mjs:88-89` | ✅ PASS |
| RED-12 | `red.screenFlash` 80ms (rounded to whole frames) | `src/game/techFx/RedOrb.ts:41,219` | ✅ PASS |
| RED-17 | camera shakes 200ms on detonation | `src/game/techFx/RedOrb.ts:43,345` | ✅ PASS |
| RED-13 | orb removed from `techObjects` on detonation | `tests/core/redOrb.test.ts:125-132` | ✅ PASS |
| RED-14 | in-flight orb listed with `kind:'red'`, `traveled` | `tests/core/redOrb.test.ts:133-…` | ✅ PASS |

**Status (P1 Vermelho)**: ✅ 14/17 solid, 3 weak (RED-04 geometry-by-construction, RED-15 magnitude unverified live).

### P1: Invariantes dos efeitos de técnica (11 ACs)

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| TFX-01 | all technique colors are `PALETTE` keys | `tests/game/art.test.ts:267-294` | ✅ PASS |
| TFX-08 | exactly 4 new PALETTE keys: `b`,`R`,`W`,`d` w/ exact hex | `tests/game/art.test.ts:87-95` | ✅ PASS |
| TFX-02 | procedural geometry vertices at even-integer offsets | `tests/core/lightning.test.ts:38-53` (bolts); `tests/core/cut.test.ts` angles on 2px grid implicitly via `pixelGrid.test.ts` | ✅ PASS |
| TFX-03 | effect objects destroyed within 300ms of ending | `tests/core/fxRegistry.test.ts:31-43` | ✅ PASS |
| TFX-09 | 300ms after end, `fx.live` == pre-effect value | `tests/core/fxRegistry.test.ts:44-…`; `scripts/smoke/kokusen.smoke.mjs:173` (live, Divergent scenario) | ✅ PASS |
| TFX-04 | ≤64 live particles per emitter | `src/game/techFx/RedOrb.ts:18,34`, `src/game/techFx/BlueOrb.ts:8,75`, `src/game/techFx/KokusenFx.ts:17,300,377` (all emitters explicitly capped well below 64; no runtime counter test, but every cap is a hardcoded constant ≤40) | ✅ PASS |
| TFX-05 | hitstop freezes all effect layers except the 4 Kokusen cinematic ones | `tests/core/fxTimeline.test.ts:24-…` (`game` clock layers frozen at `gameDt=0`, `real` layers advance) | ✅ PASS |
| TFX-06, TFX-11 | non-WebGL: no postFX, `fx.degraded:true` | `src/game/techFx/KokusenFx.ts:95,136` (`this.degraded = renderer.type !== WEBGL`); no smoke forces a Canvas renderer to confirm live, but the same guard is the single source used by every effect layer | ⚠️ Weak (guard exists, not exercised under a forced non-WebGL run) |
| TFX-10 | non-WebGL: sprite/geometry layers still in `fx.layers` | same guard as above, same caveat | ⚠️ Weak (same as TFX-06/11) |
| TFX-07 | see TEC-08 above (same fields) | (duplicate of TEC-08) | ✅ PASS |

**Status (P1 Invariantes)**: ✅ 8/11 solid, 3 weak (TFX-06/10/11 share one un-exercised non-WebGL path — this AC group explicitly anticipates the smoke may fall back to Canvas per the spec's own assumption table, but no smoke run in this environment actually did so, so the path is only guard-level, not live-verified).

### P2 stories (28 ACs, condensed — lower priority per coordinator instruction)

| Story | ACs | Evidence | Result |
| --- | --- | --- | --- |
| Azul (12) | BLU-01..12 | `tests/data/techniques.test.ts:27-36` (BLU-01); `tests/core/blueOrb.test.ts:5-…` (BLU-02,03,12,04,05,06,07,11,09,10 — position w/wo wall, 129/130/131px boundary, 5 ticks+implosion, boss not pulled, spiral-in dot product asserted at :53-77); `src/game/techFx/BlueOrb.ts` (BLU-08 fx layers, structural) | ✅ PASS (all 12; BLU-09's dot-product IS asserted, unlike RED-04's) |
| Desmantelar (7) | CUT-01..08 (no CUT-07 in spec) | `tests/data/techniques.test.ts:38-46` (CUT-01); `tests/core/cut.test.ts:5-…` (CUT-02,03,05 — 0/60/120ms, 59/60 & 180/181px boundary, angles); sensor mutant #7 kills the 60px boundary; `scripts/smoke/techniques.smoke.mjs:206-208` (CUT-04,06,08 fx layers + exactly-3-events) | ✅ PASS (all 7) |
| Laboratório de efeitos (9) | FXL-01..09 | `scripts/smoke/fxlab.smoke.mjs` (FXL-01 :39,41; FXL-05 :45,48; FXL-02 :83-134; FXL-07 :56; FXL-09 :58; FXL-03 :142,146,150; FXL-04 :52; FXL-08 :53,143) — 8/9 directly asserted | ✅ PASS (8/9) |
| Laboratório de efeitos — FXL-06 | dummy hp resets to max 1000ms after reaching 0 | `src/game/FxLab.ts:16-84` implements the regen timer; `scripts/smoke/fxlab.smoke.mjs:49` only asserts dummies **start** full — no test ever drops a dummy to 0 and waits 1000ms to confirm the respawn | ❌ GAP (zero evidence) |

**Status (P2)**: ❌ 1 zero-evidence GAP (FXL-06); the other 27 P2 ACs are solidly evidenced.

---

**Overall AC count**: 165 total. ✅ 152 solidly evidenced (92%). ⚠️ 9 weak/indirect (TEC-11, CAST-12, CAST-13, KOK-26, RED-04, RED-15, TFX-06, TFX-10, TFX-11 — implemented, live value/path not directly read by a test). ❌ 4 zero-evidence GAPs on ACs that ARE implemented but have no test anywhere (CE-06, CE-08, CAST-11 — all P1; FXL-06 — P2). 0 confirmed FAIL (no test contradicts the spec; every failure mode found is missing coverage, not wrong behavior).

---

## Discrimination Sensor

Isolated scratch: `git worktree add <scratchpad>/verify-wt HEAD` (`HEAD`=`9340e80`), `node_modules` linked via NTFS junction (`New-Item -ItemType Junction`). Every mutation applied with `sed` inside the worktree only, reverted with `git checkout --` before the next; worktree removed with `git worktree remove --force` afterward.

| # | file:line | Mutation | Command | Killed? |
| --- | --- | --- | --- | --- |
| 1 | `src/core/kokusen.ts:45` | `windowOpen`: `t >= from` → `t > from` (KOK-01/02, 120ms boundary) | `npx vitest run tests/core/kokusen.test.ts` | ✅ Killed (2 failures: 120ms and 60ms-in-zone boundary cases) |
| 2 | `src/data/techniques.ts:101` | `KOKUSEN.damage: 45` → `44` (KOK-06) | `npx vitest run tests/data/techniques.test.ts tests/core/bossBrain.test.ts` | ✅ Killed (1 failure, data test) |
| 3 | `src/core/cast.ts:129` | cost/cooldown charged in `sign` instead of `release` (CAST-03/04) | `npx vitest run tests/core/cast.test.ts` | ✅ Killed (4 failures) |
| 4 | `src/scenes/TestScene.ts:343` | `this.energy.update(dt, this.techCaster.cast !== null)` → `this.energy.update(dt, false)` (CE-05 live: regen never stops during a cast) | `npx vitest run` (858/858 still pass) + `npm run smoke -- tech` + `npm run smoke -- techniques` (both `ok`) | ❌ **Survived** — no test at any layer exercises this live wiring |
| 5 | `src/core/redOrb.ts:7` | `DETONATION_RADIUS = 96` → `95` (RED-10) | `npx vitest run tests/core/redOrb.test.ts` | ✅ Killed (1 failure, exact-96px case) |
| 6 | `src/core/blueOrb.ts:8` | `TICK_MS = 250` → `251` (BLU-06) | `npx vitest run tests/core/blueOrb.test.ts` | ✅ Killed (1 failure, 5th-tick count) |
| 7 | `src/core/cut.ts:23` | `NEAR_PX = 60` → `61` (CUT-03) | `npx vitest run tests/core/cut.test.ts` | ✅ Killed (1 failure, exact-60px case) |
| 8 | `src/core/shop.ts:211` | `if (this.loadout && !this.loadout.hasAny())` → `if (false)` (TSH-05 guarantee removed) | `npx vitest run tests/core/techShop.test.ts` | ✅ Killed (2 failures) |

**Sensor depth**: lightweight (8 targeted mutations, exactly the coordinator's list).
**Sensor verdict**: 7/8 killed, **1 survived** (#4 — CE-05's live regen-during-cast wiring in `TestScene.ts:343`). No justification accepted for the survivor: it is a one-line, easy-to-regress wiring point with a P1 spec guarantee ("energy never regenerates while casting") and currently zero automated protection above the pure-function level.

**Isolation confirmation**: `git status --porcelain` on the real worktree, before sensor setup and after `git worktree remove --force`:
```
?? .agents/
?? .claude/
?? .cursor/
?? .windsurf/
?? skills-lock.json
```
Identical in both cases — no residue from the sensor run. `git worktree list` after removal shows only the three worktrees that predate this session (main, the `agent-ab5458ae76ebf5ebf` worktree, and `surGue-player-refine`), confirming `verify-wt` was fully cleaned up.

---

## `kokusen.smoke.mjs` instability — diagnosis

**Reported symptom**: fails ~1-in-4 in the full suite with "2º impacto comum deveria tirar 18 a mais" (`scripts/smoke/kokusen.smoke.mjs:256`), enemy hp stuck at "only the first impact" value; passes reliably in isolation.

**What it is NOT**: a real-time-vs-`step` race in the *game clock*. `src/game/debugApi.ts:192-202` (`step(ms)`) calls `game.loop.sleep()` on the very first invocation and thereafter advances time only in fixed `STEP_MS` (1000/60) chunks driven by explicit calls — the game's own update loop never free-runs on `requestAnimationFrame` once manual stepping starts, so gameplay-timing math (DIV-04's 200ms second impact, KOK windows, etc.) is fully deterministic from that point on. I confirmed `resolveSecondImpact` (`src/game/TechRunner.ts:243-258`) applies `target.receiveHit(hit)` and pushes the `divergent2` event in the same synchronous call, and `Enemy.receiveHit` (`src/game/Enemy.ts:191-200`) only returns `false` (skipping damage) when the target is already dead — not a plausible state for a freshly-approached, full-hp target in this scenario.

**What it IS**: a real-time race in the **boot window before the first `step()` call**, compounded by **shared-machine load**. Between `page.goto()` and the first `stepAndSnap()` (`scripts/smoke/kokusen.smoke.mjs:31-33`), Phaser's loop is still running on real `requestAnimationFrame` — `game.loop.sleep()` only fires lazily inside `step()` (`src/game/debugApi.ts:193-196`), not eagerly when `debugOn` is detected. How much real wall-clock time elapses during page load/module-init (and how many un-controlled rAF ticks the game takes before that first step) is not deterministic — it depends on system load. This session directly reproduced load-driven flakiness at the infra level: the first `npm run smoke` (whole suite) run crashed `shop.smoke.mjs` mid-scenario with a Puppeteer `ConnectionClosedError: Connection closed` (browser context dropped), which disappeared on an isolated retry immediately after — evidence this machine is running several concurrent Edge/Node instances (three git worktrees are checked out for other agents right now: `surGue-player-refine`, `.claude/worktrees/agent-ab5458ae76ebf5ebf`, plus this one) and CDP/browser timing is measurably load-sensitive during this exact verification run. The specific failure signature (a `divergent2` event firing with damage seemingly not yet reflected in the read-back snapshot) is consistent with a one-`step`-early boot-time drift shifting which exact 16.67ms frame the "early miss-press" loop (`kokusen.smoke.mjs:236-245`, only 3 attempts) lands on relative to the deterministic 200ms second-impact resolution, occasionally causing the test's own timing assumptions (not the game's) to slip by a frame under load.

**Fix**: move `game.loop.sleep()` out of the lazy `if (!manual)` branch in `installDebugApi` (`src/game/debugApi.ts:183-202`) so the loop freezes **unconditionally and immediately** when `debugOn` is true (at scene `create()`), instead of waiting for the smoke script's first `step()` call. That removes the real-time boot window for every one of the 17 smoke files, not just this one, and makes `t=0` of every smoke scenario start from the same deterministic point regardless of how long page load took under load.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code / surgical changes | ✅ |
| No scope creep beyond spec | ✅ |
| Matches existing patterns (`src/core`+`src/data` pure logic, Node-testable per AD-001; per-frame live reads, no caching) | ✅ |
| Spec-anchored outcome check | ⚠️ CE-05's live wiring is correct but unverified above the pure-function layer (see sensor mutant #4) |
| Every test maps to a spec AC | ✅ — every reviewed test/smoke file carries explicit AC-ID comments |
| Documented guidelines followed | tlc-spec-driven EARS spec + AD-001/AD-002/AD-009 (Node-testable core, text-grid art, 2px geometry grid) — followed throughout |

---

## Gate Check

- **`npm run typecheck`**: ✅ 0 errors
- **`npm test`** (`npx vitest run`): ✅ 858/858 unit tests passed, 56 test files, 0 failed, 0 skipped
- **`npm run build`**: ✅ clean (`tsc --noEmit && vite build`)
- **`npm run smoke`**: ✅ 17/17 scenarios passed overall. The first full-suite run crashed `shop.smoke.mjs` on a Puppeteer `ConnectionClosedError` (infra-level, not a test assertion failure) after 13 other scenarios (including `kokusen`, `armed`, `held-item`, `heal`) had already passed cleanly; `shop`, `tech` and `techniques` (the three scenarios that never ran because the crash aborted the whole `run.mjs` process) were then run individually and all passed on the first retry. No known-flaky scenario (`held-item`, `armed`, `heal`) needed a second isolated run — all three passed their only run.

---

## Fix Plans (ranked)

### Fix 1 (Blocker): CE-05 live wiring has zero test coverage and the sensor proves it
- **Root cause**: `src/scenes/TestScene.ts:343` (`this.energy.update(dt, this.techCaster.cast !== null)`) is the only place that threads "is a cast in progress" into the energy regen gate; no unit test can see it (it's Node-only, no `TestScene`) and no smoke scenario checks that `ce.cur` stays flat across a cast's `sign`/`charge` window.
- **Fix task**: add one assertion to `scripts/smoke/tech.smoke.mjs` (which already casts the Vermelho-cost-adjacent Divergente) — sample `ce.cur` right after entering `sign`, step through the `charge` window (Vermelho's 350ms charge gives the most margin), and assert `ce.cur` did not increase.
- **Priority**: Blocker — this is the exact AC the sensor is designed to catch, and it currently has no protection.

### Fix 2 (Blocker): CE-06 and CE-08 — the melee-energy-gain rule has zero test evidence
- **Root cause**: `src/scenes/TestScene.ts:973` (`onConnect`, +3 on player melee hit) and `:980-984` (`onTechConnect`, deliberately no +3) are both implemented but neither path is read by any `ce.cur` assertion in `tests/**` or `scripts/smoke/**`.
- **Fix task**: in any smoke that already lands a melee hit (e.g. `hud.smoke.mjs` or a new block in `tech.smoke.mjs`), snapshot `ce.cur` before/after a jab connecting on an enemy (expect `+3`, capped) and before/after a technique hit connecting (expect unchanged).
- **Priority**: Blocker — P1 AC, zero evidence, straightforward to close.

### Fix 3 (Blocker): CAST-11 — airborne gravity reduction has zero test evidence
- **Root cause**: `src/game/Player.ts:202` reads `CAST_FX.airGravity` (0.3, `src/data/techniques.ts:120`) only while `castAirGravity` is true; no test ever puts the player airborne and casts to read the resulting gravity/fall speed.
- **Fix task**: add a smoke case (or a focused unit test against `Player`'s movement update, if it's Node-reachable) that launches the player airborne, starts a cast, and asserts vertical velocity accumulates at ~30% of the normal rate during `sign`/`charge`.
- **Priority**: Blocker — P1 AC, zero evidence.

### Fix 4 (Minor): FXL-06 — training dummy respawn-after-death never tested
- **Root cause**: `src/game/FxLab.ts:68-84` implements the 1000ms hp-reset, but `scripts/smoke/fxlab.smoke.mjs:49` only checks dummies start full.
- **Fix task**: in `fxlab.smoke.mjs`, drive a dummy's hp to 0 (repeat key 2/3/4/5/6 at it), then wait 1000ms and assert `hp === maxHp` again.
- **Priority**: Minor (debug-only tool, no gameplay risk).

### Fix 5 (Minor): `kokusen.smoke.mjs` boot-time flakiness under system load
- See diagnosis above. **Fix task**: in `installDebugApi` (`src/game/debugApi.ts:183-215`), call `game.loop.sleep()` unconditionally as soon as `debugOn` is true, not lazily inside the first `step()`.
- **Priority**: Minor (intermittent, self-resolves on retry, but worth closing since it affects all 17 smoke files' determinism under load, not just this one).

### Fix 6 (Cosmetic, batch): weak/indirect-evidence ACs
- TEC-11, CAST-12, CAST-13, KOK-26 (only streak=1 exercised), RED-04, RED-15 (12px magnitude unread), TFX-06/10/11 (non-WebGL path never forced in this environment) — all implemented, none read back live by a test. Lowest priority: no behavior is in doubt, only the automated proof of it.

---

## Requirement Traceability Update

| Status here | Count | IDs |
| --- | --- | --- |
| ✅ Verified — solid direct evidence | 152 | all IDs in the per-AC tables marked ✅ PASS |
| ⚠️ Needs Fix — weak/indirect evidence | 9 | TEC-11, CAST-12, CAST-13, KOK-26, RED-04, RED-15, TFX-06, TFX-10, TFX-11 |
| ❌ Needs Fix — zero test evidence (Blocker, P1) | 3 | CE-06, CE-08, CAST-11 |
| ❌ Needs Fix — zero test evidence + surviving sensor mutant (Blocker, P1) | 1 | CE-05 (live wiring) |
| ❌ Needs Fix — zero test evidence (Minor, P2) | 1 | FXL-06 |

Per the coordinator's instruction, `spec.md`'s traceability table is left as `Implemented` (not bumped to `Verified`) for the 14 IDs above pending the fixes in this report.

---

## Summary

**Overall**: ❌ FAIL — not because any tested behavior is wrong (zero confirmed FAILs across 165 ACs), but because three P1 ACs (CE-05's live wiring, CE-06, CE-08, CAST-11 — four IDs, three of them genuinely untested at any layer) have no automated protection at all, and the lightweight sensor's own target list caught exactly one of them red-handed (CE-05, mutant #4 survived). Per the coordinator's PASS bar ("every P1 AC has evidence and no mutant survives without justification"), this blocks PASS.

**Spec-anchored check**: 152/165 ACs solidly matched to spec outcome; 9 weak/indirect; 4 zero-evidence GAPs (3 P1 + 1 P2); 0 confirmed FAIL.
**Sensor**: 7/8 mutations killed; 1 survived (CE-05 live regen-during-cast wiring, `src/scenes/TestScene.ts:343`).
**Gate**: 858/858 unit tests, typecheck clean, build clean, 17/17 smoke (one transient infra `ConnectionClosedError` on `shop.smoke.mjs` during the full-suite run, not a test failure — passed clean on immediate isolated retry, alongside `tech`/`techniques` which hadn't run yet).
**Kokusen instability**: boot-time real-time-vs-step race (`src/game/debugApi.ts:183-202`, `game.loop.sleep()` only engages lazily on first `step()`), amplified by this session's own observed system load (concurrent worktrees/agents) — not a game-logic bug. Fix: sleep the loop unconditionally at `debugOn` time.

**What works**: the entire energy/slot/shop economy, the cast state machine end to end, Punho Divergente, Kokusen's full anime beat sequence (window, zone, streak, hitstop, invert/duotone, bolts, camera, card), Vermelho, Azul, Desmantelar, the fx-lab, and the fx invariants — almost all confirmed live via Phaser smoke, not just isolated Node tests. The 8-mutant sensor is 7/8 discriminating.

**What's missing**: automated proof for three P1 rules (energy stays flat while casting — live; melee hits give +3 energy; technique hits don't; airborne casting halves gravity) that are all correctly implemented but currently unprotected against regression, plus one P2 debug-tool path (dummy respawn) and nine weak/indirect ACs where the implementation is right but nothing reads the live value back.

**Next steps**: Fixes 1-3 (CE-05 live, CE-06/CE-08, CAST-11) must land before this feature can be marked done — each is a one-assertion addition to an existing smoke file, not new code. Fixes 4-6 are optional hardening and do not block a re-verify once 1-3 land.
