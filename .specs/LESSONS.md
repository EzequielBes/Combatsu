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

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
