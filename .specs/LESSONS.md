# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

### L-010 - Test every spec threshold exactly at its boundary value on both sides, because flipping a strict comparison to non-strict survives tests that only probe values away from the limit.
- signal: `surviving_mutant` · recurrence: 3 feature(s) · scope: `tests core` · harmful: 0
- features: visual-e-jogabilidade, run-e-rodadas, combate-estilo-luta
- evidence: M9 src/core/enemyAI.ts:128, M10 src/core/enemyAI.ts:122 vs tests/core/enemyAI.test.ts:255-281 (validation.md rodada 3, lacuna 1) (tests core) (+2 more)
- last seen: 2026-10-01T12:33:06Z

### L-043 - Test the adapter call that forwards a config field to the engine, not only the pure helper that builds it
- signal: `surviving_mutant` · recurrence: 3 feature(s) · scope: `art-adapter` · harmful: 0
- features: sprite-player-polish, enemy-sprite-variety, personagem-e-vermelho
- evidence: M7 src/game/art/index.ts:128 (art-adapter) (+2 more)
- last seen: 2026-10-02T21:33:41Z

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 - Apply game-driven velocity to Matter bodies on every physics step or give them zero ground friction, because the fixed-step runner can run several steps per frame and friction erases a once-per-frame velocity after the first step.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `src/game physics` · harmful: 0
- features: visual-e-jogabilidade
- evidence: AI-01/AI-02 src/game/Enemy.ts:151,230 (validation.md suspeita a) (src/game physics)
- last seen: 2026-09-24T00:12:03Z

### L-002 - Trigger hit feedback such as sparks, hitstop and shake only when the target reports the hit as applied, never on raw sensor contact.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `src/game combat fx` · harmful: 0
- features: visual-e-jogabilidade
- evidence: FX-01 src/game/hitbox.ts:68-71 (validation.md suspeita b) (src/game combat fx)
- last seen: 2026-09-24T00:12:03Z

### L-003 - Specify frame-bound durations as a minimum rounded up to whole frames and verify them in simulated-time smoke at 60 and 30 fps.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec timing` · harmful: 0
- features: visual-e-jogabilidade
- evidence: FX-01 tolerância de frame (validation.md suspeita d) (spec timing)
- last seen: 2026-09-24T00:12:04Z

### L-004 - State explicitly whether HUD text, tints and particle scaling fall under the single-palette and texel-scale rules.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec art` · harmful: 0
- features: visual-e-jogabilidade
- evidence: ART-01 src/game/Hud.ts:12,37 src/game/Ragdoll.ts:275,282 (spec art)
- last seen: 2026-09-24T00:12:04Z

### L-005 - Size sprite frames for the widest pose, such as an extended strike limb, and keep the frame size decoupled from the physics body.
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `src/game/art` · harmful: 0
- features: visual-e-jogabilidade
- evidence: src/game/art/sprites/player.ts:6 (src/game/art)
- last seen: 2026-09-24T00:12:05Z

### L-006 - Clear a per-step velocity override the moment a hit or state change takes over the body, because physics steps run before the next scene update and right after a hitstop unfreeze.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `src/game physics` · harmful: 0
- features: visual-e-jogabilidade
- evidence: src/game/Enemy.ts:50-53,137 regressão do T29 (validation.md rodada 2, lacuna 1) (src/game physics)
- last seen: 2026-09-24T01:27:54Z

### L-007 - Paint a solid palette base under every dithered or partially transparent background band so the canvas clear color never shows through.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `src/game/art` · harmful: 0
- features: visual-e-jogabilidade
- evidence: ART-01 src/game/art/background.ts:99-103 src/main.ts:11 (validation.md rodada 2, lacuna 2) (src/game/art)
- last seen: 2026-09-24T01:27:54Z

### L-008 - Keep particle colors inside the palette with palette-colored frames or fill tint, because a multiplicative tint over a non-white palette texture yields off-palette colors.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `src/game/art fx` · harmful: 0
- features: visual-e-jogabilidade
- evidence: ART-01 src/game/Ragdoll.ts:109 src/game/art/sprites/props.ts:46 (validation.md rodada 2, lacuna 3) (src/game/art fx)
- last seen: 2026-09-24T01:27:55Z

### L-009 - Assert a threshold-driven toggle on every intermediate output, not only the final one, because an even number of spurious toggles leaves the final value unchanged.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `tests core` · harmful: 0
- features: visual-e-jogabilidade
- evidence: M3 src/core/enemyAI.ts:5 vs tests/core/enemyAI.test.ts:271-280 (validation.md rodada 2, lacuna 4) (tests core)
- last seen: 2026-09-24T01:27:55Z

### L-011 - When a rule acts after a timer or accumulator crosses a threshold, assert the outputs on the frames right after the action so that forgetting to reset the accumulator fails a test.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `tests core` · harmful: 0
- features: visual-e-jogabilidade
- evidence: M12 src/core/enemyAI.ts:131 vs tests/core/enemyAI.test.ts (validation.md re-verificação final, R4-1) (tests core)
- last seen: 2026-09-24T02:17:48Z

### L-012 - When a callback AC names payload values such as a position, make the adapter expose them to the debug snapshot and assert them in the smoke, not only the call count.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `src/game smoke` · harmful: 0
- features: fundacao-harness-jev
- evidence: FND-08 / mutant A5 / src/scenes/TestScene.ts:138 (src/game smoke)
- last seen: 2026-09-24T14:20:47Z

### L-013 - Test a rounding rule with an input that is not an exact multiple of the step, because exact multiples cannot tell ceil from floor.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `tests game` · harmful: 0
- features: fundacao-harness-jev
- evidence: M22 / src/game/debugApi.ts:47 (tests game)
- last seen: 2026-09-24T14:20:47Z

### L-014 - When a spec converts a duration into fixed steps, state the rounding rule for durations that are not a whole number of steps.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec timing` · harmful: 0
- features: fundacao-harness-jev
- evidence: FND-22 / tests/game/debugApi.test.ts:52 (spec timing)
- last seen: 2026-09-24T14:20:48Z

### L-015 - When a parser is widened beyond the pattern the spec quotes, update the spec text and keep a negative test for every part of the pattern that still must match.
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `tools spec` · harmful: 0
- features: fundacao-harness-jev
- evidence: SPEC_DEVIATION tools/jev-refine/lib.ts:19 (tools spec)
- last seen: 2026-09-24T14:20:48Z

### L-016 - Give every required token of a parsing regex a negative test with a line that lacks only that token.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `tests tools` · harmful: 0
- features: fundacao-harness-jev
- evidence: M24 / tools/jev-refine/lib.ts:22 (tests tools)
- last seen: 2026-09-24T14:20:48Z

### L-017 - Assert a payload position with the tightest tolerance the scenario allows, measured from a real run, because a loose tolerance lets an offset the size of the entity pass.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `src/game smoke` · harmful: 0
- features: fundacao-harness-jev
- evidence: N6 src/game/Enemy.ts:198 vs scripts/smoke/enemy-died.smoke.mjs:50-53 (validation.md rodada 2, R2-1) (src/game smoke)
- last seen: 2026-09-24T14:43:47Z

### L-018 - Test a seeded random offset with a seed that draws a nonzero value, because a seed that draws zero cannot tell whether the offset is applied at all.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `tests core rng` · harmful: 0
- features: run-e-rodadas
- evidence: C10b src/core/waves.ts:97; tests/core/waves.test.ts:34-38 (tests core rng)
- last seen: 2026-09-24T16:44:28Z

### L-019 - Read debug snapshot values from the object the game actually uses, not from the config it was built with, so the smoke checks behavior and not input.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `src/game smoke` · harmful: 0
- features: run-e-rodadas
- evidence: A2/A3 src/game/Enemy.ts:121-128; scripts/smoke/run-loop.smoke.mjs:88-92 (src/game smoke)
- last seen: 2026-09-24T16:44:28Z

### L-020 - Assert that a forbidden event never happens across the whole window where it could occur, not at a single sampled instant.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `smoke` · harmful: 0
- features: run-e-rodadas
- evidence: A4 src/scenes/TestScene.ts:215; scripts/smoke/run-loop.smoke.mjs:61-70 (smoke)
- last seen: 2026-09-24T16:44:29Z

### L-021 - When a lower layer deduplicates events, also test the duplicate through every layer that re-counts its results.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `tests core` · harmful: 0
- features: run-e-rodadas
- evidence: C17 src/core/run.ts:113 (tests core)
- last seen: 2026-09-24T16:44:30Z

### L-022 - Assert every clause of a conjunctive acceptance criterion, including positions set alongside the headline values.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `smoke` · harmful: 0
- features: run-e-rodadas
- evidence: RUN-02 A14 src/game/Player.ts:219; scripts/smoke/run-loop.smoke.mjs:41 (smoke)
- last seen: 2026-09-24T16:44:31Z

### L-023 - State layout terms such as centered as explicit axes or coordinates in the spec so the smoke can assert them.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec hud` · harmful: 0
- features: run-e-rodadas
- evidence: RHUD-02 src/game/Hud.ts:65 (spec hud)
- last seen: 2026-09-24T16:44:32Z

### L-024 - Assert every clause of a conjunctive acceptance criterion, including positions set alongside the headline values.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `smoke` · harmful: 0
- features: run-e-rodadas
- evidence: validation.md rodada 2 N4 (src/game/Enemy.ts:87, DIF-04 speeds) (smoke)
- last seen: 2026-09-24T18:18:53Z

### L-025 - Assert a rendered element's layout from its visual bounds, not its anchor coordinates, because the anchor stays in place when the origin changes.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `src/game smoke hud` · harmful: 0
- features: run-e-rodadas
- evidence: validation.md rodada 2 N2 (src/game/Hud.ts:66,169, RHUD-02 centered) (src/game smoke hud)
- last seen: 2026-09-24T18:18:54Z

### L-026 - When a return value gates visible feedback (spark, hitstop), test it through the real hit-routing path, not only through a debug test-hit whose return value is discarded.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `combat-feedback` · harmful: 0
- features: boss-a-cada-5
- evidence: src/game/Boss.ts:141 (mutant 3) (combat-feedback)
- last seen: 2026-09-25T14:45:48Z

### L-027 - When testing a reward that heals or grants a capped resource, first drive the resource below the cap so the exact amount is discriminated, not masked by the ceiling.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `reward-fx` · harmful: 0
- features: boss-a-cada-5
- evidence: src/scenes/TestScene.ts:318 (mutant 4) (reward-fx)
- last seen: 2026-09-25T14:46:03Z

### L-028 - When an entity can disappear through two independent paths (a boundary trigger and a max-distance/time expiry), assert the specific path that fired, not just that the entity is eventually gone.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `lifecycle` · harmful: 0
- features: boss-a-cada-5
- evidence: src/game/Projectile.ts:89-91 (mutant 5) (lifecycle)
- last seen: 2026-09-25T14:46:04Z

### L-029 - When a scripted movement (like a leap) can start and end at different terrain heights, recompute the landing height at the destination x instead of reusing the height captured at takeoff, and test it by landing on a platform whose height differs from the takeoff point.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `physics leap` · harmful: 0
- features: boss-a-cada-5
- evidence: src/game/Boss.ts:250 (mutant 5, rodada 2) (physics leap)
- last seen: 2026-09-25T15:32:27Z

### L-030 - Expose every visual or physical state an AC names (sprite visibility, tint, body velocity) as a live-read field in the debug snapshot in the same task that implements it, so the smoke can assert it.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `smoke debug snapshot` · harmful: 0
- features: economia-drops-cura
- evidence: ARM-10/ARM-26/HEAL-10 validation.md rodada 1 (smoke debug snapshot)
- last seen: 2026-09-25T23:00:29Z

### L-031 - Make smoke scenarios that depend on the player not taking damage run with no living enemies (intermission) or with the player dead, instead of hoping enemies miss.
- signal: `gate_fail` · recurrence: 1 feature(s) · scope: `smoke determinism` · harmful: 0
- features: economia-drops-cura
- evidence: scripts/smoke/heal.smoke.mjs HEAL-04/HEAL-05 (smoke determinism)
- last seen: 2026-09-25T23:00:31Z

### L-032 - When a stat modifier changes a ceiling (max HP, max resource) that a live entity object owns, wire the setter into that entity on every level-up, not only into an isolated pure formula getter that no runtime code calls.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `core` · harmful: 0
- features: loja-da-run
- evidence: MOD-04,MOD-11 (core)
- last seen: 2026-09-26T19:43:48Z

### L-033 - Expose rendered UI text/state (status labels, dynamic hint strings, selection highlight) on the debug snapshot so smoke tests can assert it, instead of leaving it verifiable only by eye.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `game-ui` · harmful: 0
- features: loja-da-run
- evidence: SHOP-38,SHOP-46,SHOP-31,SHOP-42 (game-ui)
- last seen: 2026-09-26T19:43:48Z

### L-034 - A debug bypass flag (?debug&noX=1) needs its own dedicated before/after assertion proving the bypassed effect did not happen, not just reliance on other scenarios that merely avoid triggering it.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `debug-api` · harmful: 0
- features: loja-da-run
- evidence: SHOP-47 (debug-api)
- last seen: 2026-09-26T19:43:49Z

### L-035 - When a core rule's live wiring is a single boolean passed into a pure-function update (e.g. CursedEnergy.update(dt, castInProgress)), add a smoke assertion for the wired value itself, not just a unit test on the pure function - a mutant on the wiring line survives 858 unit tests otherwise.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `src/scenes/TestScene.ts` · harmful: 0
- features: energia-e-tecnicas
- evidence: src/scenes/TestScene.ts:343 (src/scenes/TestScene.ts)
- last seen: 2026-09-29T00:37:42Z

### L-036 - Energy-gain side effects wired only inside Phaser scene callbacks (onConnect/onTechConnect) need a dedicated smoke assertion on ce.cur before/after the hit - implementation-only comments do not substitute for a test.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `src/scenes/TestScene.ts` · harmful: 0
- features: energia-e-tecnicas
- evidence: CE-06,CE-08 (src/scenes/TestScene.ts)
- last seen: 2026-09-29T00:37:42Z

### L-037 - A gravity-scale-while-casting rule (Player.ts gravity * CAST_FX.airGravity) needs a smoke case that puts the player airborne during sign/charge and reads back vertical velocity/position - it has no other test surface.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `src/game/Player.ts` · harmful: 0
- features: energia-e-tecnicas
- evidence: CAST-11 (src/game/Player.ts)
- last seen: 2026-09-29T00:37:43Z

### L-038 - Debug-lab respawn/reset timers (training dummy hp->0 then back to max after 1000ms) are easy to implement and easy to forget to smoke-test end to end; the precondition check (dummies start full) is not the same AC as the respawn behavior.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `src/game/FxLab.ts` · harmful: 0
- features: energia-e-tecnicas
- evidence: FXL-06 (src/game/FxLab.ts)
- last seen: 2026-09-29T00:37:43Z

### L-039 - Assert the effect of every tuned data constant a spec states through the code path that consumes it, because a constant defined in data survives mutation when no test or smoke reads what it changes.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `src/data adapters` · harmful: 0
- features: combate-estilo-luta
- evidence: M8 src/data/moves.ts:160, M9 src/data/moves.ts:163 (validation.md combate-estilo-luta, GRD-05/PAR-07) (src/data adapters)
- last seen: 2026-10-01T12:33:05Z

### L-040 - Every AC of an adapter task marked Tests none must appear in the Requirement list of a later smoke task, because ACs left out of that list reach the Verifier with zero evidence.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `tasks adapters` · harmful: 0
- features: combate-estilo-luta
- evidence: CTL-08, FIN-03, FIN-04 (validation.md combate-estilo-luta, tasks T19-T21 Requirement lists) (tasks adapters)
- last seen: 2026-10-01T12:33:06Z

### L-041 - State the precedence when two defensive rules can apply to the same hit, such as parry versus unblockable, because the implementation picks one silently and no test fixes it.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec combat` · harmful: 0
- features: combate-estilo-luta
- evidence: PAR-02/GRD-04 (validation.md combate-estilo-luta, gap 1) (spec combat)
- last seen: 2026-10-01T12:33:06Z

### L-042 - When a feature adds randomness to hit outcomes, pin that randomness off in the debug query of every older smoke that asserts exact damage or energy, because a seeded draw still varies with frame jitter and makes those smokes flaky.
- signal: `gate_fail` · recurrence: 1 feature(s) · scope: `smoke` · harmful: 0
- features: combate-estilo-luta
- evidence: scripts/smoke/kokusen.smoke.mjs:31 (validation.md combate-estilo-luta rodada 2, atribuição do kokusen) (smoke)
- last seen: 2026-10-01T13:38:37Z

### L-044 - When a spec fixes only an aggregate outcome, state the per-rule thresholds that tests must pin, or the rule boundary goes unasserted
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `art` · harmful: 0
- features: sprite-player-polish
- evidence: M3 src/game/art/sprites/player.ts:49 (art)
- last seen: 2026-10-01T14:45:04Z

### L-045 - Give tool-output ACs an automated check on the produced files, not only a manual run
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `tools` · harmful: 0
- features: sprite-player-polish
- evidence: SPR-15 tools/sprite-preview.mjs (tools)
- last seen: 2026-10-01T14:45:04Z

### L-046 - When a spec requires an animation to restart on a repeated trigger, smoke the same trigger twice in a row and read the frame again, because a different-key sequence hides a missing restart
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `adapter` · harmful: 0
- features: enemy-sprite-variety
- evidence: M4 src/game/Enemy.ts:620 (adapter) (adapter)
- last seen: 2026-10-01T16:00:05Z

### L-047 - Test a range-gated action at the boundary value and one unit past it, in the scene or adapter that applies the check, not only in the pure core
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `scene-adapter` · harmful: 0
- features: ritmo-economia-e-chefe
- evidence: BFX-06 src/scenes/TestScene.ts:1353 (scene-adapter)
- last seen: 2026-10-02T18:15:14Z

### L-048 - Extract selection rules (lowest level wins, tie goes to first slot, nothing eligible) into a pure function and unit-test each branch instead of leaving them to a single-candidate smoke
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `scene-adapter` · harmful: 0
- features: ritmo-economia-e-chefe
- evidence: BFX-09 src/scenes/TestScene.ts:805 (scene-adapter)
- last seen: 2026-10-02T18:15:15Z

### L-049 - Assert the exact computed value of a spec-defined formula (such as a HUD bar width), not only that it is above or equal to zero
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `hud` · harmful: 0
- features: ritmo-economia-e-chefe
- evidence: MST-08 src/game/EnergyHud.ts:160 (hud)
- last seen: 2026-10-02T18:15:15Z

### L-050 - Regras de exclusao feitas na camada de cena (ex.: filtro que poe o chefe fora de um efeito) precisam de teste proprio; extraia o filtro puro ou cubra no smoke, senao o mutante que remove o filtro sobrevive.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `src/game/TechRunner.ts` · harmful: 0
- features: personagem-e-vermelho
- evidence: M11 TechRunner.ts:348 / EDG-03 (src/game/TechRunner.ts)
- last seen: 2026-10-02T21:33:40Z

### L-051 - Duracoes e periodos de efeito visual (ms) citados no AC devem virar constantes exportadas ou camadas medidas no smoke; checar so a presenca da camada deixa o numero livre.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `src/game/techFx` · harmful: 0
- features: personagem-e-vermelho
- evidence: M10 RedOrb.ts:35,62,64 / RDA-07,RDA-10,RDA-12 (src/game/techFx)
- last seen: 2026-10-02T21:33:41Z

### L-052 - Pin the literal target of every entry in a mapping the spec chooses, because a test that recomputes the result with the production mapping cannot catch a wrong mapping
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `art` · harmful: 0
- features: sprite-chefes-e-acabamento
- evidence: B04/B05 src/game/art/sprites/boss.ts:354,357 (BSP-13, validation.md lacuna 1) (art)
- last seen: 2026-10-03T17:23:24Z

### L-053 - Measure a reshaped sprite part in every frame variant that uses it, not only in the one frame the acceptance criterion names
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `art` · harmful: 0
- features: sprite-chefes-e-acabamento
- evidence: E06/E07 src/game/art/sprites/enemy.ts:580-596 (EPD-02, validation.md lacuna 2) (art)
- last seen: 2026-10-03T17:23:24Z

### L-054 - Give every part a task reshapes at least one acceptance criterion, or leave the part out of the task
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `spec art` · harmful: 0
- features: sprite-chefes-e-acabamento
- evidence: M03/M04/M05 src/game/art/sprites/playerMoves.ts:54,63,103 (validation.md lacuna 3) (spec art)
- last seen: 2026-10-03T17:23:24Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
