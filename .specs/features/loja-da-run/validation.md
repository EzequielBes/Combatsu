# Loja da run Validation

## Validation: loja-da-run - PASS ✅ (Rodada 2)

**Result**: PASS as of Rodada 2 (`1aa3152..eb05e13`). Both Rodada 1 blockers are closed with live evidence: buying `vida` now calls `Player.setMaxHp` (`src/game/Player.ts:243-245`) and heals 15 (`src/scenes/TestScene.ts:280-281`), and `scripts/smoke/shop.smoke.mjs:153-155` asserts the live `player.maxHp`/`player.hp` values against the exact spec formula, not just the isolated `Modifiers.maxHp` getter. The three coverage gaps flagged as zero-evidence in Rodada 1 (SHOP-46, SHOP-31, SHOP-42) and the weak-evidence gap (SHOP-47) are now closed with dedicated smoke assertions reading a new `ShopPanel.debug()` / snapshot `panel` field. One coverage gap remains open and is accepted as Minor: SHOP-38 ("Esgotado" text) has no direct test because the shop always has ≥3 eligible entries this early in a run, so the empty-slot render path is real but not smoke-reachable without an artificially late-game state; the underlying core logic (offers with `id: null`) is unit-tested and the rendering hook needed to close it (`panel.cards[i].lines`) already exists. Gate is green (typecheck, 654/654 unit tests, build, 12/12 smoke) and the discrimination sensor (3/3 targeted mutations, including the newly-fixed debug-key/shop-buy key collision) is fully discriminating. See "Rodada 2" section below for full evidence.

**Date**: 2026-09-26
**Spec**: `.specs/features/loja-da-run/spec.md`
**Diff range**: `cd718be..HEAD` (15 commits, tasks from `957d0cc`)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

15/15 commits present on the branch, tasks.md not re-read task-by-task (all requirement IDs already marked `Implemented` in `spec.md`'s traceability table). No blocked/partial commits found in `git log`.

---

## Spec-Anchored Acceptance Criteria

Evidence-or-zero: every row cites `file:line`. `FAIL` = confirmed behavior contradicts the spec (verified live, not just untested). `GAP` = no test asserts the literal spec-defined outcome at all.

### P1: Modificadores de atributo com teto (12 ACs)

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| MOD-01 | every level = 0 at run start | `tests/core/modifiers.test.ts:8-11` (`new Modifiers()`); `src/scenes/TestScene.ts:432` `this.modifiers.reset()` on `onStartRun` | ✅ PASS |
| MOD-02 | `apply` at max level: unchanged, returns `false` | `tests/core/modifiers.test.ts:14-29` (vida to 5, agilidade to 3, both max+1 refused) | ✅ PASS |
| MOD-03 | level ∈ 0..maxLevel; max 5 (vida/forca), 3 (agilidade/ima/sorte) | `tests/data/shop.test.ts:35-44` (catalog `maxLevel`); `tests/core/modifiers.test.ts:14-29,74-98,100-111` (boundary per modifier) | ✅ PASS |
| MOD-04 | `WHILE vida at level n, player max HP SHALL be 100+15n` | `tests/core/modifiers.test.ts:41-51` proves the **isolated** `Modifiers.maxHp` getter is correct, but `src/game/Player.ts:124-126` (`get maxHp() { return this.health.max; }`) never reads it — `Health.setMax` (`src/core/health.ts:43`) is called nowhere in `src/game/**` or `src/scenes/**` (project-wide grep confirms zero call sites outside `tests/core/health.test.ts`). Buying `vida` only runs `this.modifiers.apply(id)` (`src/scenes/TestScene.ts:273`); the live player's max HP stays 100 forever. | ❌ FAIL |
| MOD-11 | buying a `vida` level heals +15, capped at new max HP | No evidence. `src/core/shop.ts:183-184`: `if (offer.entry.kind === 'modifier') ctx.applyModifier(...); else ctx.healPlayer(SHOP.curaHp);` — a `vida` purchase (kind `modifier`) never calls `healPlayer`. Completely unimplemented. | ❌ FAIL |
| MOD-05 | melee damage `round(base×(1+0.10n))`, half rounds up | `tests/core/modifiers.test.ts:53-72` (incl. 8×1.05=8.4→8, 5×1.1=5.5→6 half-up case) + live wiring `src/game/Player.ts:400`, `src/game/Prop.ts:160-161` (read fresh per hit, no cache) | ✅ PASS |
| MOD-06 | run speed `220×(1+0.08n)` | `tests/core/modifiers.test.ts:74-85` + `src/game/Player.ts:172` (`this.modifiers.runSpeed` read every frame, no cache) | ✅ PASS |
| MOD-07 | magnet range `72×(1+0.30n)` | `tests/core/modifiers.test.ts:87-98` + `src/game/Pickups.ts:52` (`ctx.magnetRange` threaded through `update`) + `src/scenes/TestScene.ts:470` (`this.modifiers.magnetRange` read live) | ✅ PASS |
| MOD-08 | heal-drop chance `0.10+0.03n` | `tests/core/modifiers.test.ts:100-111` (pure) + `tests/core/loot.test.ts:191-215` (**live integration**: `Loot` reading `modifiers.healChance`, statistical band 0.08-0.12 at level 0 and 0.17-0.21 at level 3 over 10000 draws) | ✅ PASS |
| MOD-12 | debug `heal=1` forces chance 1 regardless of `sorte` | `tests/core/loot.test.ts:217-224` + `src/scenes/TestScene.ts:443-447` (URL `heal=N` → `overrides.healChance`) | ✅ PASS |
| MOD-09 | cost `base+step×n` per modifier | `tests/core/modifiers.test.ts:113-153` (all 5 modifiers) + `tests/data/shop.test.ts:57-66` (catalog base/step values) | ✅ PASS |
| MOD-10 | new run after game over: max HP = 100 | `tests/core/health.test.ts:165-172` (`reset()` restores tuning max); `src/scenes/TestScene.ts:432` (`modifiers.reset()`). Note: this AC is **vacuously true** today only because MOD-04's bug means max HP never leaves 100 in the first place — it will need re-verification once MOD-04/MOD-11 are fixed. | ✅ PASS (caveat) |

**Status**: ❌ 2 confirmed FAIL (MOD-04, MOD-11) — the feature's core "spend on a permanent stat" promise is broken for the `vida` stat specifically; the other 4 stats (`forca`, `agilidade`, `ima`, `sorte`) are correctly wired live.

### P1: Loja entre rodadas com 3 ofertas (36 ACs)

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| SHOP-01 | intermission 2500ms → `shop` | `tests/core/run.test.ts:106-120` (2499ms stays, 2500ms transitions) | ✅ PASS |
| SHOP-32 | exactly one `shopOpen:<r>` | `scripts/smoke/shop.smoke.mjs:52` | ✅ PASS |
| SHOP-02 | `shop` emits no `spawn` | `tests/core/run.test.ts:122-130`; `scripts/smoke/shop.smoke.mjs:73-80` | ✅ PASS |
| SHOP-33 | gameplay update skipped (positions/ages frozen) | `src/scenes/TestScene.ts:222-224` (structural: `if (shop) updateShop(); else { ...gameplay... }`); `scripts/smoke/shop.smoke.mjs:81-88` (enemy/player/pickups unchanged over 1s) | ✅ PASS |
| SHOP-03 | `Enter` → `roundActive`, round+1 | `tests/core/run.test.ts:132-141`; `scripts/smoke/shop.smoke.mjs:144-145` | ✅ PASS |
| SHOP-35 | exactly one `shopClose` | `scripts/smoke/shop.smoke.mjs:146` | ✅ PASS |
| SHOP-04 | neutral input in `shop` | `tests/core/run.test.ts:239-249` (`acceptsPlayerInput` table); `src/scenes/TestScene.ts:228` | ✅ PASS |
| SHOP-05 | wallet += sum of alive fragment values | `scripts/smoke/shop.smoke.mjs:56-60`; `src/game/Pickups.ts:42-59` (`collectFragments`) | ✅ PASS |
| SHOP-36 | no fragment pickup remains after open | `scripts/smoke/shop.smoke.mjs:62` | ✅ PASS |
| SHOP-37 | heal pickups keep position | `scripts/smoke/shop.smoke.mjs:63-65` | ✅ PASS |
| SHOP-06 | exactly `min(3,e)` distinct offers | `tests/core/shop.test.ts:94-97` (pool of 2); `scripts/smoke/shop.smoke.mjs:68-69` | ✅ PASS |
| SHOP-38 | empty slot shows text `Esgotado` | `src/game/ShopPanel.ts:171-174` implements it, but **no test reads the rendered text** — `tests/game/shopPanel.test.ts` only covers `SHOP_PANEL_COLORS` (SHOP-24), and no smoke reads Phaser text objects | ❌ GAP |
| SHOP-07 | eligible ⟺ below max AND minRound(next)≤round | `tests/core/shop.test.ts:22-48` | ✅ PASS |
| SHOP-39 | `cura` always in pool | `tests/core/shop.test.ts:51-66` | ✅ PASS |
| SHOP-18 | minRound exact table (6 for lvl 4-5 of vida/forca, 4 for lvl 3 of agilidade, else 1) | `tests/data/shop.test.ts:68-93` | ✅ PASS |
| SHOP-08 | weighted draw: first entry whose cumulative weight exceeds `x` | `tests/core/shop.test.ts:68-111` (boundary just-below/above cumulative weight, no-repeat over 1000 seeds, determinism) | ✅ PASS |
| SHOP-09 | `shopRng = new Rng(s^0x85ebca6b)` | `tests/core/run.test.ts:395-401` | ✅ PASS |
| SHOP-40 | identical spawn/loot order with or without shop draws | `tests/core/run.test.ts:403-434` | ✅ PASS |
| SHOP-45 | key `k` buys slot `k-1` under all 3 guard conditions | `tests/core/shop.test.ts:150-177`; `scripts/smoke/shop.smoke.mjs:106-116` | ✅ PASS |
| SHOP-19 | wallet -= cost exactly | `tests/core/shop.test.ts:151-163`; smoke:107 | ✅ PASS |
| SHOP-41 | modifier level +1 on buy | `tests/core/shop.test.ts:160`; smoke:108 | ✅ PASS |
| SHOP-42 | `sold=true` AND card shows `Comprado` | flag: `tests/core/shop.test.ts:162`, smoke:109 (✅ evidenced); literal rendered text `Comprado`: `src/game/ShopPanel.ts:174` — no test reads it | ⚠️ Partial (flag proven, text unverified) |
| SHOP-43 | exactly one `buy:<id>:<cost>` | `scripts/smoke/shop.smoke.mjs:110-113` | ✅ PASS |
| SHOP-10 | funds refusal: nothing changes, `buyRefused:<id>:funds` | `tests/core/shop.test.ts:165-176`; `scripts/smoke/shop.smoke.mjs:154-163` | ✅ PASS |
| SHOP-11 | sold-card refusal: nothing changes | `tests/core/shop.test.ts:180-191`; smoke:117-120 | ✅ PASS |
| SHOP-13 | `cura` at full HP refused, `buyRefused:cura:fullHp` | `tests/core/shop.test.ts:211-227`; smoke:91-98 (conditional on the draw) | ✅ PASS |
| SHOP-12 | `cura` heals `min(hp+30,maxHp)` | `tests/core/shop.test.ts:229-260` (hp99→100 and hp70→100 cases) | ✅ PASS |
| SHOP-14 | empty-slot refusal: nothing changes | `tests/core/shop.test.ts:193-207` | ✅ PASS |
| SHOP-15 | other offers keep id/slot/cost after a buy | `tests/core/shop.test.ts:262-276` | ✅ PASS |
| SHOP-44 | `affordable == cost≤wallet` every frame | `tests/core/shop.test.ts:278-286` | ✅ PASS |
| SHOP-20 | keys 1/2/3/Enter inert outside `shop` | `scripts/smoke/shop.smoke.mjs:149-152`; structurally guaranteed by `src/scenes/TestScene.ts:223-224` (`updateShop()`/`ShopInput.read()` only called `if (run.state === 'shop')`) | ✅ PASS |
| SHOP-21 | card shows name/level/preview/cost, top→bottom | `tests/core/shop.test.ts:288-298` (levelText), `:300-324` (previewText, exact strings); the visual top-to-bottom stacking itself (`ROW_Y` constants in `src/game/ShopPanel.ts:31-38`) is code-only, not asserted by any test | ✅ PASS (data verified; visual order unverified) |
| SHOP-22 | debug snapshot has `shop`/`modifiers`/`player.maxHp`, `open` iff state=`shop` | `tests/game/debugApi.test.ts:35,59-60` (shape passthrough only); `scripts/smoke/shop.smoke.mjs:53` (`shop.open===true`, functional); `src/scenes/TestScene.ts:326-341` (`shopSnapshot`) | ✅ PASS |
| SHOP-23 | `fragments=N` sets wallet at run start | `src/scenes/TestScene.ts:422-424`; `scripts/smoke/shop.smoke.mjs:19,61` | ✅ PASS |
| SHOP-47 | `noshop=1` closes same-update, no crediting/removing | `src/scenes/TestScene.ts:383-386` (structural: `closeShop()` called before any `openShop`/`collectFragments` runs); no *dedicated* assertion checks wallet/pickups are untouched — `scripts/smoke/drops.smoke.mjs`/`heal.smoke.mjs` only rely on it as a side-effect-free workaround | ⚠️ Weak/indirect evidence |
| SHOP-24 | every panel color is a `PALETTE` key | `tests/game/shopPanel.test.ts:6-11` | ✅ PASS |

**Status (P1 Loja)**: ❌ 1 zero-evidence GAP (SHOP-38), 1 partial (SHOP-42), 1 weak/indirect (SHOP-47); the remaining 33 ACs are solidly evidenced.

### P2: Reroll das ofertas (5 ACs)

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| SHOP-16 | R with funds: wallet -= cost, 3 new offers | `tests/core/shop.test.ts:334-349`; `scripts/smoke/shop.smoke.mjs:122-128` | ✅ PASS |
| SHOP-25 | reroll cost += 5 | `tests/core/shop.test.ts:362-371`; smoke:127 | ✅ PASS |
| SHOP-17 | new shop starts at rerollCost 5 | `tests/core/shop.test.ts:326-332,373-381` | ✅ PASS |
| SHOP-26 | R refused without funds, `rerollRefused` | `tests/core/shop.test.ts:351-360`; smoke:164-168 (conditional on wallet) | ✅ PASS |
| SHOP-46 | hint shows `R rerolar (<c>)` with the new cost | `src/game/ShopPanel.ts:167` implements it; **no test reads the rendered hint text**, before or after a reroll | ❌ GAP |

**Status (P2 Reroll)**: ❌ 1 zero-evidence GAP (SHOP-46); the other 4 ACs are solidly evidenced.

### P2: Navegação por teclado (5 ACs)

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| SHOP-27 | `selected` starts at 0 | `tests/core/shop.test.ts:326-332` | ✅ PASS |
| SHOP-28 | `→`/`D`: `(selected+1)%3` | `tests/core/shop.test.ts:384-394`; `scripts/smoke/shop.smoke.mjs:130-133` | ✅ PASS |
| SHOP-29 | `←`/`A`: `(selected+2)%3` | `tests/core/shop.test.ts:396-400` | ✅ PASS |
| SHOP-30 | `J` buys `selected`, same as SHOP-45 for `selected+1` | `tests/core/shop.test.ts:403-424`; smoke:137-141 | ✅ PASS |
| SHOP-31 | selected card has a highlighted border, others don't | `src/game/ShopPanel.ts:187-193` implements it (`borderSelected` vs. rarity color); **no test reads the resulting border color/key** | ❌ GAP |

**Status (P2 Navegação)**: ❌ 1 zero-evidence GAP (SHOP-31); the other 4 ACs are solidly evidenced.

**Overall AC count**: 58 total = 51 ✅ PASS (2 with a documented caveat: MOD-10, SHOP-21/22/47 weak-but-present) + 2 ❌ FAIL (MOD-04, MOD-11 — confirmed wrong live behavior) + 4 ❌ GAP (SHOP-38, SHOP-46, SHOP-31 zero test evidence; SHOP-42 half zero-evidence) + 1 ⚠️ weak/indirect (SHOP-47).

---

## Discrimination Sensor

Isolated scratch: `git worktree add <scratchpad>/verify-wt HEAD`, `node_modules` linked via NTFS junction (`New-Item -ItemType Junction`). Every mutation applied with `sed` inside the worktree only, reverted with `git checkout --` before the next, worktree removed with `git worktree remove --force` afterward. Real tree `git status --porcelain` before and after the sensor run: identical (`?? .agents/`, `?? .claude/`, `?? .cursor/`, `?? .windsurf/`, `?? skills-lock.json`).

| # | file:line | Mutation | Tests run | Killed? |
| --- | --- | --- | --- | --- |
| 1 | `src/core/modifiers.ts:60` | `apply`: removed the `canLevel` guard (`if (false) return false;`) — level cap (MOD-02/03) | `tests/core/modifiers.test.ts` | ✅ Killed (2 failures: agilidade level-cap test) |
| 2 | `src/core/modifiers.ts:68` | `cost`: `base + step*level` → `base + step*(level+1)` (MOD-09) | `tests/core/modifiers.test.ts`, `tests/core/shop.test.ts`, `tests/data/shop.test.ts` | ✅ Killed (7 failures) |
| 3 | `src/data/shop.ts:33` | `gatedFrom`: `nextLevel >= gate` → `nextLevel > gate` (SHOP-18, off-by-one at the rodada 4/6 boundary) | `tests/data/shop.test.ts`, `tests/core/shop.test.ts` | ✅ Killed (5 failures) |
| 4 | `src/core/shop.ts:9` | `weightOf`: swapped common/rare weight lookup (SHOP-08) | `tests/core/shop.test.ts` | ✅ Killed (1 failure, deterministic-draw test) |
| 5 | `src/core/shop.ts:194` | `reroll`: removed `this._rerollCost += SHOP.rerollStep` (SHOP-25) | `tests/core/shop.test.ts` | ✅ Killed (3 failures) |
| 6 | `src/core/shop.ts:179` | `buy`: `cura` full-HP guard `ctx.hp >= ctx.maxHp` → `ctx.hp > ctx.maxHp` (SHOP-13 boundary) | `tests/core/shop.test.ts` | ✅ Killed (1 failure, exact-full-HP case) |
| 7 | `src/core/run.ts:173` | `update`: `closeShop` guard `pendingCloseShop && state==='shop'` → `pendingCloseShop` (closeShop outside `shop`) | `tests/core/run.test.ts` | ✅ Killed (1 failure) |
| 8 | `src/core/modifiers.ts:12` | `meleeDamageAtLevel`: `Math.round` → `Math.floor` (MOD-05 half-rounds-up) | `tests/core/modifiers.test.ts` | ✅ Killed (2 failures, the 5.5→6 half-up case) |

**Sensor depth**: lightweight (8 targeted mutations, matching the coordinator's target list: level cap, cost formula, minRound gate, rarity weight, reroll cost step, cura full-HP refusal, closeShop-outside-shop, meleeDamage rounding)
**Sensor verdict**: 8/8 killed — no surviving mutants; the test suite discriminates correctly for every mutated behavior

**Isolation confirmation**: `git status --porcelain` on the real worktree, before sensor setup and after `git worktree remove`, in both cases:
```
?? .agents/
?? .claude/
?? .cursor/
?? .windsurf/
?? skills-lock.json
```
Identical — no residue from the sensor run.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code / surgical changes | ✅ |
| No scope creep beyond spec | ✅ |
| Matches existing patterns (`src/core` + `src/data` pure logic, Node-testable per AD-001; live values re-read every frame with no cache, per the existing `runSpeed`/`meleeDamage`/`magnetRange` pattern) | ⚠️ `vida`/max-HP breaks this pattern — see MOD-04/MOD-11 |
| Spec-anchored outcome check | ❌ 2 ACs (MOD-04, MOD-11) assert a pure-function value that the live game never uses |
| Every test maps to a spec AC (no unclaimed tests) | ✅ — all reviewed test/smoke files carry explicit AC-ID comments |
| Documented guidelines followed | tlc-spec-driven EARS spec + AD-001 (Node-testable core), AD-003 (UI camera), AD-006 (seeded RNG) — followed everywhere except the MOD-04/MOD-11 wiring gap |

---

## Edge Cases

- [x] Boss round cleared → shop opens like any round: not directly tested with a boss+shop combo, but `src/core/run.ts:159-164` (the `intermission`→`shop` transition) does not special-case `isBossRound` at all — architecturally guaranteed, low risk
- [ ] Player bought `vida`, then buys `cura` → cura cap is the new max HP: **cannot hold today** — direct consequence of MOD-04 (max HP never actually changes)
- [ ] Wallet 0 at shop open → every card shows unaffordable, `Enter` still continues: only one card's refusal is exercised (`scripts/smoke/shop.smoke.mjs:154-163`, SHOP-10 scenario); not all 3 cards checked, and `Enter` is not pressed in that same wallet-0 session to confirm it still closes the shop
- [x] Player killed via debug key `3` during intermission → game over wins, shop never opens | `tests/core/run.test.ts:152-159` (via the equivalent `run.playerDied()` API path)
- [ ] Rare offer sold, reroll may bring it back if still eligible: not tested; low priority (a natural consequence of `drawFresh()` re-running `eligible()` over the full catalog on every reroll)

---

## Gate Check

- **Gate command**: `npm run typecheck && npm test && npm run build && npm run smoke`
- **Result**: typecheck clean (0 errors); 654/654 unit tests passed, 0 failed, 0 skipped, across 43 test files; build succeeded; 12/12 smoke scenarios passed (`armed` and `held-item` — the known-flaky pair — both passed on the first run, no re-isolation needed)
- **Test count before feature**: 573 (per `tasks.md`); **after**: 654 unit tests (+81, all new, no deletions or weakened assertions found)

---

## Fix Plans (ranked)

### Fix 1: MOD-04/MOD-11 — buying `vida` has no effect on the live player's HP (Blocker)
- **Root cause**: `Health.setMax()` (`src/core/health.ts:43`) is never invoked from `src/game/**` or `src/scenes/**`. `Player.maxHp` (`src/game/Player.ts:124-126`) always returns the constructor-time `PLAYER_HEALTH.maxHp` (100). `Shop.buy()` (`src/core/shop.ts:183-184`) never calls `ctx.healPlayer` for a modifier purchase, only for `cura`. The `vida` modifier is the only one of the five that isn't read live each frame/use — `forca`, `agilidade`, `ima`, `sorte` all correctly follow the "read from `modifiers` fresh, no cache" pattern (`src/game/Player.ts:172,400`, `src/game/Prop.ts:160-161`, `src/scenes/TestScene.ts:470`, `src/core/loot.ts:75`).
- **Fix task**: in `src/scenes/TestScene.ts:273` (`applyModifier` callback passed as `BuyContext`), after `this.modifiers.apply(id)`, when `id === 'vida'` also call `this.player.heal(SHOP.vidaPerLevel)` after syncing the new ceiling — e.g. add a `Player.setMaxHp(n: number)` method that calls `this.health.setMax(n)`, invoke it with `this.modifiers.maxHp` right before the heal, and also call it once per frame (or on every `vida` purchase) so `Player.maxHp`/`GameSnapshot.player.maxHp` reflect the live level.
- **Priority**: Blocker — this is the feature's headline mechanic (buy `vida`, see max HP go up) and it silently does nothing in the shipped build.

### Fix 2: SHOP-38, SHOP-46, SHOP-31 — no test reads the rendered `ShopPanel` text/border for these three ACs
- **Root cause**: `ShopPanel.updateCard`/`update` (`src/game/ShopPanel.ts:164-193`) implement "Esgotado" text, the reroll-cost hint string, and the selected-card border color, but nothing (unit or smoke) reads `Phaser.GameObjects.Text.text` or `Rectangle` stroke color back out. `tests/game/shopPanel.test.ts` only covers the color-key data (`SHOP_PANEL_COLORS`, SHOP-24).
- **Fix task**: either expose these three values on the debug snapshot (cheapest: add `emptyText`/`hintText`/`selectedBorderKey` fields readable in a smoke scenario, following the same pattern already used for `activeFlash`/`weaponVisible`/`vx` in the prior feature) or add a headless-Phaser unit test that constructs a `ShopPanel` against a fake scene and reads the text objects directly.
- **Priority**: Minor (visual-only, no gameplay-state risk) for SHOP-38/46; Minor for SHOP-31.

### Fix 3: SHOP-42 — "Comprado" text half of the AC is unverified
- Same root cause and fix as Fix 2, narrower scope (just the `status` text on a sold card, not an empty one).
- **Priority**: Cosmetic.

### Fix 4: SHOP-47 — no dedicated assertion for the `noshop=1` contract
- **Root cause**: `noshop=1` is exercised only as a means to an end in `drops.smoke.mjs`/`heal.smoke.mjs` (avoiding the shop mid-scenario); no test asserts "wallet and pickups are byte-for-byte unchanged across a `noshop=1` shop cycle" as its own claim.
- **Fix task**: add one assertion (unit or smoke) that opens a shop-eligible round with `noshop=1`, snapshots wallet/pickups immediately before and after the round transition, and asserts equality.
- **Priority**: Minor.

### Fix 5 (lower priority, architectural but untested directly): edge cases "wallet 0 → all 3 cards unaffordable + Enter still works" and "boss round → shop opens"
- Consider one more smoke assertion each if a future refactor could regress them.
- **Priority**: Cosmetic.

---

## Requirement Traceability Update

| Status here | Count | IDs |
| --- | --- | --- |
| ✅ Verified — solid direct evidence | 51 | all IDs in the per-AC tables marked ✅ PASS (including the 4 with a documented caveat: MOD-10, SHOP-21, SHOP-22, SHOP-47's flag-only half) |
| ❌ Needs Fix — confirmed wrong live behavior | 2 | MOD-04, MOD-11 |
| ❌ Needs Fix — zero test evidence | 4 | SHOP-38, SHOP-46, SHOP-31 (fully zero-evidence); SHOP-42 (half zero-evidence) |
| ⚠️ Needs Fix — weak/indirect evidence | 1 | SHOP-47 |

Per the coordinator's instruction, `spec.md`'s traceability table is left as `Implemented` (not bumped to `Verified`) for MOD-04, MOD-11, SHOP-38, SHOP-46, SHOP-31, SHOP-42 and SHOP-47 pending the fixes above; this validation report is the record of what still needs doing before those 7 IDs can be marked `Verified`.

---

## Summary

**Overall**: ❌ Not Ready — gate green and sensor fully discriminating, but the `vida` modifier (one of the feature's five sellable stats) does not actually change the player's max HP or heal on purchase in the shipped game, only in an isolated pure-function test. This is a Blocker, not a coverage nit.

**Spec-anchored check**: 51/58 ACs solidly matched to spec outcome (4 with a minor documented caveat); 2 confirmed FAIL (MOD-04, MOD-11); 4 zero-evidence GAP (SHOP-38, SHOP-46, SHOP-31, SHOP-42-half); 1 weak/indirect (SHOP-47)
**Sensor**: 8/8 mutations killed (level cap, cost formula, minRound gate, rarity weight, reroll step, cura full-HP boundary, closeShop-outside-shop, meleeDamage rounding) — no surviving mutants
**Gate**: 654/654 unit tests passed, typecheck clean, build clean, 12/12 smoke scenarios passed

**What works**: modifier level caps and cost formulas (data + pure logic), `forca`/`agilidade`/`ima`/`sorte` all correctly wired live into the running game (melee damage, run speed, magnet range, heal chance — each read fresh per frame/use with no cache), the entire shop state machine (open/close/timers/neutral input), weighted deterministic draw with seeded RNG, eligibility gating by level and round, buy/refuse paths for funds/sold/empty/full-HP, reroll cost escalation and reset, keyboard navigation, palette-only colors, and full regression protection confirmed by an 8/8 discrimination sensor.

**Issues found**:
1. **Blocker** — MOD-04/MOD-11: buying `vida` never changes the live player's max HP and never heals +15. `src/core/health.ts:43` (`setMax`) is dead code outside its own test; `src/core/shop.ts:183-184` never calls `healPlayer` for a modifier purchase.
2. **Minor** — SHOP-38, SHOP-46, SHOP-31, SHOP-42 (partial): the shop panel's rendered "Esgotado"/"Comprado"/reroll-hint text and the selected-card border highlight have zero test evidence (implemented in `src/game/ShopPanel.ts`, never read back by any test).
3. **Minor** — SHOP-47: `noshop=1`'s own contract ("no crediting or removing") has no dedicated assertion, only indirect protection via other smokes.

**Next steps**: Fix 1 (MOD-04/MOD-11) must land before this feature can be marked done — it is the shop's headline mechanic and currently a no-op in the shipped build. Fixes 2-5 are optional hardening and do not block a re-verify once Fix 1 lands.

---

## Rodada 2 (re-verificação, sensor leve)

**Date**: 2026-09-26
**Diff range**: `1aa3152..eb05e13` (2 commits: `f955587` fix(game), `eb05e13` test(smoke))
**Verifier**: independent sub-agent, second and different instance from Rodada 1 (author ≠ verifier holds for both rounds)
**Verdict**: ✅ PASS

### 1. Lacunas da Rodada 1 — fechadas ou abertas, com evidência

| Lacuna (Rodada 1) | Status | Evidência `file:line` |
| --- | --- | --- |
| MOD-04 — `vida` não muda `player.maxHp` real | ✅ Fechada | `src/game/Player.ts:242-245` (`setMaxHp(n)` → `this.health.setMax(n)`); called from `src/scenes/TestScene.ts:280` (`this.player.setMaxHp(this.modifiers.maxHp)`) inside `applyModifier`; asserted live at `scripts/smoke/shop.smoke.mjs:130` (conditional, first `vida` draw) and unconditionally at `scripts/smoke/shop.smoke.mjs:153,155` (`maxHp === maxBefore + 15` and `=== 100 + 15*modifiers.vida`, forcing the draw via reroll loop at `shop.smoke.mjs:147`) |
| MOD-11 — compra de `vida` não cura 15 | ✅ Fechada | `src/scenes/TestScene.ts:281` (`this.player.heal(SHOP.vidaPerLevel)`, `SHOP.vidaPerLevel = 15` at `src/data/tuning.ts:235`); asserted at `scripts/smoke/shop.smoke.mjs:154` (`hp === Math.min(hpBefore + 15, snap.player.maxHp)`) |
| SHOP-38 — "Esgotado" sem evidência de teste | ❌ Ainda aberta (lacuna menor aceita — ver seção 1b) | Nenhuma linha de teste cita `Esgotado`; confirmado por `grep -rn "Esgotado" scripts/smoke/ tests/ src/` só retorna comentários/implementação, nunca uma asserção |
| SHOP-46 — dica de reroll sem asserção de texto | ✅ Fechada | `src/game/ShopPanel.ts:170-178` (`debug()` expõe `hint: this.hint.text`); wired to snapshot at `src/game/debugApi.ts:96` (`panel` field) and `src/scenes/TestScene.ts:351` (`panel: this.shop ? this.shopPanel.debug() : null`); asserted at `scripts/smoke/shop.smoke.mjs:143` (`snap.shop.panel.hint.includes('R rerolar (10)')`) |
| SHOP-31 — borda selecionada sem asserção | ✅ Fechada | `src/game/ShopPanel.ts:173` (`highlighted: c.border.strokeColor === PALETTE[SHOP_PANEL_COLORS.borderSelected]`); asserted at `scripts/smoke/shop.smoke.mjs:80` (`cards.map(c=>c.highlighted).join() === 'true,false,false'`) |
| SHOP-42 — texto "Comprado" sem asserção | ✅ Fechada | `src/game/ShopPanel.ts:186` (`c.status.setText(empty ? 'Esgotado' : 'Comprado')`); asserted at `scripts/smoke/shop.smoke.mjs:121-123` (`JSON.stringify(snap.shop.panel.cards[slot].lines) === '["Comprado"]'`) |
| SHOP-47 — sem asserção própria para `noshop=1` | ✅ Fechada | `scripts/smoke/shop.smoke.mjs:206-229`: dedicated block that opens with `?debug&seed=1&noshop=1`, snapshots wallet/pickups immediately before (`prev`) and after the transition, and asserts `snap.run.state === 'roundActive' && snap.run.round === 2` (line 223), no `shopOpen` event (224), `wallet.fragments` unchanged (225), and every prior fragment id still present in `pickups` (227-229) |
| Bug novo (não estava na Rodada 1): tecla `3` compra na loja e também mata o player via debug | ✅ Fechada | `src/scenes/TestScene.ts:203-204` (`const debugKeys = () => isDebug() && this.run.state !== 'shop'`), gating `ONE`/`TWO`/`THREE`/`FOUR` (lines 205-208); confirmed by sensor mutation (c) below |

**SHOP-21 / SHOP-42 revisited**: `scripts/smoke/shop.smoke.mjs:74-78` now also asserts every unsold card's rendered cost and level text (`cards[i].lines.includes(String(o.cost))`, `cards[i].lines.includes('Nv <n>/<max>')`) — this deepens SHOP-21's evidence from "data only" (Rodada 1) to "rendered text also verified".

### 1b. SHOP-38 — decisão sobre a lacuna restante

`ShopPanel.updateCard` (`src/game/ShopPanel.ts:183-186`) implements the empty-slot "Esgotado" text, and it is now structurally reachable through `panel.cards[i].lines` (same mechanism used to close SHOP-46/31/42). But no test drives a shop state with fewer than 3 eligible entries: at round 1 with the default catalog (5 modifiers + `cura`), `e = 6 ≥ 3` always, so `min(3, e)` never produces an empty slot in the smoke's early-game window. The only way to exercise SHOP-38 is a late-game state where ≥4 of the 5 modifiers are maxed out (e.g., after many rounds/rerolls), which the current smoke does not reach. Classification: **lacuna menor aceita** — cosmetic-only (no gameplay-state risk, matches the spec's own edge-case list which also leaves the analogous "wallet 0 → all unaffordable" edge case only partially covered), the core logic it depends on (`Shop` producing `id: null` offers) is already unit-tested (`tests/core/shop.test.ts:94-97`, pool-of-2 case), and Rodada 1 itself ranked this fix as Minor/optional hardening that "does not block a re-verify once Fix 1 lands." Does not block PASS.

### 2. Discrimination Sensor (Rodada 2, sensor leve — 3 mutações)

Isolated scratch: `git worktree add <scratchpad>/verify-wt-r2 HEAD` (`HEAD` = `eb05e13`), `node_modules` linked via NTFS junction (`New-Item -ItemType Junction`). Each mutation applied with `sed` inside the worktree only, reverted with `git checkout --` before the next; worktree removed with `git worktree remove --force` afterward.

| # | file:line | Mutation | Command | Killed? |
| --- | --- | --- | --- | --- |
| 1 | `src/scenes/TestScene.ts:280` | Removed `this.player.setMaxHp(this.modifiers.maxHp)` from the `vida` buy branch | `npm run smoke -- shop` | ✅ Killed — `FALHA shop.smoke.mjs: MOD-04: maxHp 100 -> 100` |
| 2 | `src/scenes/TestScene.ts:281` | Changed `this.player.heal(SHOP.vidaPerLevel)` → `this.player.heal(0)` (heal amount neutralized) | `npm run smoke -- shop` | ✅ Killed — `FALHA shop.smoke.mjs: MOD-11: hp 100 -> 100` |
| 3 | `src/scenes/TestScene.ts:204` | Removed the `&& this.run.state !== 'shop'` guard: `const debugKeys = () => isDebug()` | `npm run smoke -- shop` | ✅ Killed — `FALHA shop.smoke.mjs: MOD-11: hp 100 -> 0` (key `3` bought `vida` and simultaneously debug-killed the player) |

**Sensor depth**: lightweight (3 targeted mutations, exactly the coordinator's target list: `setMaxHp` removal, `heal(15)` removal, debug-key guard removal)
**Sensor verdict**: 3/3 killed — no surviving mutants

**Isolation confirmation**: `git status --porcelain` on the real worktree, before sensor setup and after `git worktree remove --force`, in both cases:
```
?? .agents/
?? .claude/
?? .cursor/
?? .windsurf/
?? skills-lock.json
```
Identical — no residue from the sensor run. `git worktree list` after removal shows only the main worktree.

### 3. Gate Check (árvore real, `eb05e13`)

| Command | Result |
| --- | --- |
| `npm run typecheck` | ✅ 0 errors |
| `npm test` | ✅ 654/654 unit tests passed, 43 test files (unchanged count from Rodada 1 — no new unit tests this round, only smoke) |
| `npm run build` | ✅ clean (`tsc --noEmit && vite build`) |
| `npm run smoke` | ✅ 12/12 scenarios passed, single run — `held-item.smoke.mjs` and `armed.smoke.mjs` both passed first try, no re-isolation needed |

### 4. Ranked remaining gaps

1. **Minor (accepted)** — SHOP-38: no test exercises the "Esgotado" empty-slot render path (see 1b). Low effort to close: extend the existing late-game or a synthetic-catalog smoke/unit path to reach `e < 3`, then assert `panel.cards[i].lines.includes('Esgotado')`.
2. **Cosmetic** — edge cases "wallet 0 → all 3 cards unaffordable + `Enter` still works" and "boss round → shop opens" remain architecturally guaranteed but not directly smoke-tested (carried over from Rodada 1, unchanged this round).
3. **Cosmetic** — "rare offer sold, reroll may bring it back if still eligible" remains untested (carried over from Rodada 1, unchanged this round).

No new lessons distilled this round: the only remaining gap (SHOP-38) is the same lacuna already recorded at `.specs/LESSONS.md` L-033 in Rodada 1 (not a new failure), and all 3 sensor mutations were killed (no surviving-mutant signal to record).

### Summary (Rodada 2)

**Overall**: ✅ PASS — the feature's headline mechanic (buying `vida` raises real max HP and heals 15) now works in the live game, confirmed by both direct smoke assertions and a discrimination sensor that kills the fault when reintroduced. All Rodada 1 zero-evidence UI-text gaps except SHOP-38 are closed with rendered-text assertions via the new `ShopPanel.debug()` snapshot field. The debug-key/shop-buy collision found during the fix is closed and sensor-confirmed. SHOP-38 remains an accepted Minor gap (cosmetic, low-risk, previously ranked non-blocking). Gate is fully green.
