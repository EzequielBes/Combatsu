# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

_none_

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

### L-010 - Test every spec threshold exactly at its boundary value on both sides, because flipping a strict comparison to non-strict survives tests that only probe values away from the limit.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `tests core` · harmful: 0
- features: visual-e-jogabilidade
- evidence: M9 src/core/enemyAI.ts:128, M10 src/core/enemyAI.ts:122 vs tests/core/enemyAI.test.ts:255-281 (validation.md rodada 3, lacuna 1) (tests core)
- last seen: 2026-09-24T02:09:18Z

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

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
