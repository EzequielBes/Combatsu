# Combate estilo luta — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/combate-estilo-luta/spec.md`
**Design**: `.specs/features/combate-estilo-luta/design.md`
**Status**: Ready
**Branch**: `feat/combate-estilo-luta` (a partir de `dev`; volta para `dev` com `--no-ff` após o Verifier PASS, AD-008)
**Test count before this feature**: 865

---

## Test Coverage Matrix

> Guidelines: `vitest.config.ts`; `.specs/STATE.md` AD-001/002/003/006; lição confirmada L-010 (limiares dos dois lados).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Lógica pura (`src/core/**`) | unit | 1:1 com os ACs; limites exatos dos dois lados | `tests/core/*.test.ts` | `npm test` |
| Dados e arte (`src/data/**`, `src/game/art/**` sem phaser) | unit | Números iguais à spec; frames com tamanho certo e só chaves da paleta | `tests/data/*.test.ts`, `tests/game/*.test.ts` | `npm test` |
| Adaptadores Phaser (`src/game/*.ts`, `src/scenes/**`) | smoke (fase 5) | Asserção no snapshot lendo o estado vivo; `none` nas tasks de adaptador das fases 3–4, cobertas pela fase 5 | `scripts/smoke/*.smoke.mjs` | `npm run smoke` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tasks com testes unitários | `npm run typecheck && npm test` |
| Build | Tasks de adaptador e última de cada fase | `npm run build && npm test` |
| Full | Tasks que mexem nas teclas ou nos smokes | `npm run build && npm test && npm run smoke` |

---

## Execution Plan

### Phase 1: Núcleo do combate (puro) — worker W1

```
T1 → T2 → T3 → T4 → T5 → T6 → T7
```

### Phase 2: Arte do combate — worker W2 (worktree paralelo à fase 1)

```
T8 → T9
```

### Phase 3: Combate no jogo — base — worker W3

```
T10 → T11 → T12 → T13 → T14
```

### Phase 4: Extras de luta no jogo — worker W4

```
T15 → T16 → T17 → T18
```

### Phase 5: Smoke do combate — worker W5

```
T19 → T20 → T21
```

---

## Task Breakdown

### T1: Dados dos golpes e da defesa

**What**: `src/data/moves.ts` com `MoveDef`, `MOVES` (todos os golpes do chão, aéreos e a palma), follow-ups, efeitos, `MOVE_WINDOW_MS`, `CHARGE_MS`, `DEFENSE`, `STRUCTURE`, números do combo e do bloqueio; `Hit` ganha `unblockable?` e `moveName?`.
**Where**: `src/data/moves.ts`, `src/core/hit.ts`
**Depends on**: None
**Reuses**: padrão de `src/data/tuning.ts`, `AttackStep`
**Requirement**: MOV-01, MOV-04, MOV-12

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `tests/data/moves.test.ts` confere cada golpe (dano, força, tipo) e cada follow-up contra a spec
- [x] MOV-01 conferido: The move graph SHALL be data in `src/data/moves.ts`, where each move has name, damage, strength, force, startup, active and recovery times, hitbox, the input that starts it and the moves that can follow it.
- [x] MOV-04 conferido: The ground follow-ups SHALL be: `jab`→J→`direto`→J→`gancho`→J→`cotovelada`; `chuteFrontal`→K→`chuteAlto`; `jab`→K→`joelhada`; `direto`→K→`chuteGiratorio`.
- [x] MOV-12 conferido: The damage and strength of each ground move SHALL be: `jab` 6 light, `direto` 7 light, `gancho` 9 light, `cotovelada` 14 heavy, `chuteFrontal` 12 heavy, `chuteAlto` 14 heavy, `joelhada` 12 heavy, `chuteGiratorio` 18 heavy, `socoBaixo` 6 light, `rasteira` 10 heavy, `ganchoAscendente` 10 heavy, `chuteEmpurrao` 12 heavy, `chuteCarregado` 24 heavy.
- [x] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(data): add fighting move graph and defense tuning`

---

### T2: Máquina de golpes

**What**: `MoveMachine`: escolha do golpe por botão + direção + ar, follow-up na janela de 260 ms, buffer de 1 aperto, carregado (≥ 400 ms desde o aperto, dispara ao acabar o golpe atual), um aéreo por pulo, `cancel()`, `hitLanded`, eventos `moveStart/hitboxOn/hitboxOff/moveEnd`.
**Where**: `src/core/moveMachine.ts`
**Depends on**: T1
**Reuses**: `ComboTracker` (fases), `MOVES`
**Requirement**: MOV-02, MOV-03, MOV-05, MOV-06, MOV-17, MOV-07, MOV-08, MOV-09, MOV-16, MOV-13, MOV-18, AIR-01, AIR-02, AIR-03, AIR-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Janela 260/261 ms; carregado 399/400 ms; sem golpe em andamento vs com golpe
- [x] MOV-02 conferido: WHEN a light press happens with no move in progress on the ground THEN the move `jab` SHALL start.
- [x] MOV-03 conferido: WHEN a press matching a follow-up of the current move happens between the start of its recovery and 260 ms after the recovery ends THEN that follow-up SHALL start at the end of the recovery.
- [x] MOV-05 conferido: WHEN a heavy press happens with no move in progress on the ground THEN the move `chuteFrontal` SHALL start.
- [x] MOV-06 conferido: WHEN a light press happens while `S` is held on the ground with no move in progress THEN `socoBaixo` SHALL start.
- [x] MOV-17 conferido: WHEN a heavy press happens while `S` is held on the ground with no move in progress THEN `rasteira` SHALL start.
- [x] MOV-07 conferido: WHEN a light press happens while `W` is held on the ground with no move in progress THEN `ganchoAscendente` SHALL start.
- [x] MOV-08 conferido: WHEN a heavy press happens while the direction the player faces is held on the ground with no move in progress THEN `chuteEmpurrao` SHALL start.
- [x] MOV-09 conferido: WHEN `K` is released after being held for at least 400 ms since its press THEN `chuteCarregado` SHALL start as soon as the current move ends.
- [x] MOV-16 conferido: IF `K` is released before 400 ms since its press THEN no `chuteCarregado` SHALL start.
- [x] MOV-13 conferido: WHEN a move starts THEN `events` SHALL get exactly one `move:<name>` with its name.
- [x] MOV-18 conferido: WHILE a move is in progress, `player.move` SHALL be its name, and `null` while no move is in progress.
- [x] AIR-01 conferido: WHEN a light press happens in the air with no move in progress THEN `socoAereo` (7 light) SHALL start.
- [x] AIR-02 conferido: WHEN a heavy press happens in the air with no move in progress THEN `voadora` (16 heavy) SHALL start and move the player 120 px (±8 px) forward and down over its active time.
- [x] AIR-03 conferido: WHEN a heavy press happens in the air while `S` is held THEN `pisao` (14 heavy) SHALL start and set the player vertical speed to the max fall speed.
- [x] AIR-04 conferido: The player SHALL start at most one air move per jump.
- [x] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(core): add fighting move state machine`

---

### T3: Entrada de meia-lua

**What**: `MotionInput`: histórico de direções com tempo; detecta ↓, frente e leve em ≤ 300 ms, na ordem.
**Where**: `src/core/motionInput.ts`
**Depends on**: T2
**Reuses**: nenhum
**Requirement**: SPC-01

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] 299/300 ms e ordem trocada
- [x] SPC-01 conferido: WHEN `S`, then the facing direction, then a light press happen within 300 ms in that order THEN `palmaExplosiva` (20 heavy) SHALL start instead of the move the last press would start.
- [x] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(core): detect quarter-circle motion input`

---

### T4: Guarda e parry

**What**: `Guard` (segurando, janela de parry de 150 ms, anti-spam de 300 ms) e `resolveIncomingHit` (ordem parry → esquiva → guarda → golpe cheio; frente/costas; chefe 25%; imbloqueável) devolvendo resultado e dano.
**Where**: `src/core/defense.ts`
**Depends on**: T3
**Reuses**: `Hit`
**Requirement**: GRD-01, GRD-02, GRD-06, GRD-03, GRD-04, GRD-07, PAR-01, PAR-02, PAR-09, PAR-04, PAR-05, PAR-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Janela 149/150 ms; anti-spam 299/300 ms; parry e esquiva no mesmo frame → só parry
- [x] GRD-01 conferido: WHILE `U` or `Shift` is held on the ground and no move, dodge or cast is in progress, `player.guard` SHALL be `guard` (or `parry` during the parry window).
- [x] GRD-02 conferido: WHEN a regular enemy hit reaches the player from the front while `player.guard` is `guard` THEN the player SHALL take 0 damage.
- [x] GRD-06 conferido: WHEN a boss hit reaches the player from the front while `player.guard` is `guard` THEN the player SHALL take `round(damage × 0.25)`.
- [x] GRD-03 conferido: IF a regular enemy hit reaches the guarding player while the attacker center x is on the side opposite to the player facing THEN the player SHALL take exactly the hit damage.
- [x] GRD-04 conferido: IF the hit is marked unblockable THEN the guard SHALL NOT reduce its damage.
- [x] GRD-07 conferido: WHEN a hit is blocked by the guard THEN `events` SHALL get exactly one `block`.
- [x] PAR-01 conferido: WHEN `U` or `Shift` is pressed and at least 300 ms have passed since the previous press THEN a parry window of 150 ms SHALL open (`player.guard` = `parry`).
- [x] PAR-02 conferido: WHEN an enemy or boss hit reaches the player during an open parry window THEN the player SHALL take 0 damage.
- [x] PAR-09 conferido: WHEN a hit is parried THEN `events` SHALL get exactly one `parry`.
- [x] PAR-04 conferido: IF `U` or `Shift` is pressed less than 300 ms after the previous press THEN no parry window SHALL open.
- [x] PAR-05 conferido: IF a regular enemy hit reaches the player after the parry window closed while `U` or `Shift` is still held and the attacker is in front THEN the player SHALL take 0 damage (normal guard, GRD-02).
- [x] PAR-06 conferido: WHEN a hit is parried THEN the player structure SHALL NOT increase.
- [x] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(core): resolve guard and parry against incoming hits`

---

### T5: Esquiva e câmera lenta

**What**: `Dodge` (96 px em 200 ms, invencível 0–180 ms, recarga 450 ms, recusa no ar, perfeita uma vez, bônus ×1,5 uma vez em 1000 ms) e `SlowMo` (0,3 por 400 ms reais).
**Where**: `src/core/dodge.ts`, `src/core/slowMo.ts`
**Depends on**: T4
**Reuses**: nenhum
**Requirement**: DOD-01, DOD-02, DOD-03, DOD-07, DOD-08, DOD-04, DOD-10, DOD-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Invencível 179/180 ms; recarga 449/450 ms; bônus 999/1000 ms e só uma vez
- [x] DOD-01 conferido: WHEN `Q` is pressed on the ground with no dodge cooldown and no move or cast in progress THEN the player SHALL move 96 px (±4 px) in 200 ms toward the held horizontal direction, or away from the facing direction if none is held.
- [x] DOD-02 conferido: WHILE the dodge time is between 0 and 180 ms, the player SHALL take no damage from any hit.
- [x] DOD-03 conferido: WHEN a hit reaches the player while it is invulnerable by DOD-02 THEN `events` SHALL get exactly one `perfectDodge` for that dodge.
- [x] DOD-07 conferido: WHEN a perfect dodge happens THEN `timeScale` SHALL be 0.3 for 400 ms of real time and then return to 1.
- [x] DOD-08 conferido: WHEN the player hits a target within 1000 ms after a perfect dodge THEN that hit damage SHALL be multiplied by 1.5 (rounded, halves up), once.
- [x] DOD-04 conferido: WHEN a dodge starts THEN its cooldown SHALL be 450 ms.
- [x] DOD-10 conferido: IF `Q` is pressed while the dodge cooldown is above 0 THEN no dodge SHALL start.
- [x] DOD-05 conferido: IF `Q` is pressed in the air THEN no dodge SHALL start.
- [x] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(core): add dodge with invulnerability and slow motion`

---

### T6: Estrutura

**What**: `Structure` (0–100, ganho com teto, queda depois do atraso em tempo de jogo, quebra e atordoamento, volta a 0 ao fim do atordoamento).
**Where**: `src/core/structure.ts`
**Depends on**: T5
**Reuses**: nenhum
**Requirement**: STR-01, STR-02, STR-03, STR-04, STR-07, STR-05, STR-06, STR-08, PAR-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Queda 1499/1500 ms (inimigo) e 999/1000 ms (jogador); teto; quebra exatamente em 100
- [x] STR-01 conferido: Every regular enemy and the player SHALL have a structure between 0 and 100.
- [x] STR-02 conferido: WHEN a regular enemy takes a light hit, a heavy hit, the `chuteCarregado` or the `joelhada` THEN its structure SHALL increase by 4, 10, 40 or 30 (10 + 20), respectively, capped at 100.
- [x] STR-03 conferido: WHEN a player hit is blocked by the player guard THEN the player structure SHALL increase by 15 for a regular enemy hit and 25 for a boss hit, capped at 100.
- [x] STR-04 conferido: WHEN 1500 ms of game time pass since an enemy structure last increased THEN that structure SHALL decrease by 10 per second of game time, stopping at 0.
- [x] STR-07 conferido: WHEN 1000 ms of game time pass since the player last blocked a hit THEN the player structure SHALL decrease by 20 per second of game time, stopping at 0.
- [x] STR-05 conferido: WHEN a regular enemy structure reaches 100 THEN it SHALL be broken and stunned (no attack, no movement) for 1500 ms.
- [x] STR-06 conferido: WHEN the player structure reaches 100 THEN the player SHALL be stunned for 800 ms, ignoring input.
- [x] STR-08 conferido: WHEN a stun from STR-05 or STR-06 ends THEN that structure SHALL be 0 and not broken.
- [x] PAR-03 conferido: WHEN a regular enemy hit is parried THEN that enemy structure SHALL increase by 35, capped at 100.
- [x] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(core): add structure gauge with break and stun`

---

### T7: Contador de combo e guarda do inimigo

**What**: `ComboCounter` (hits, golpes distintos, nota, expiração 1500 ms, zera ao levar dano) e `EnemyGuard` (chance por rodada com RNG, guarda de 600 ms, leve bloqueado com +8 de estrutura, forte encerra a guarda, carregado ignora).
**Where**: `src/core/comboCounter.ts`, `src/core/enemyGuard.ts`
**Depends on**: T6
**Reuses**: `Rng`
**Requirement**: CMB-01, CMB-02, CMB-03, EBL-01, EBL-02, EBL-03, EBL-05, EBL-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Expiração 1499/1500 ms; notas nos limites 2/3/4/5/6 golpes distintos; chance nas rodadas 1, 11 e 20 (teto 0,4)
- [x] CMB-01 conferido: WHEN a player hit lands on a target THEN `combo.hits` SHALL increase by 1.
- [x] CMB-02 conferido: WHEN 1500 ms pass without a new landed hit, or the player takes damage, THEN `combo.hits` SHALL become 0 and `combo.grade` null.
- [x] CMB-03 conferido: WHILE `combo.hits` ≥ 2, `combo.grade` SHALL be D for 1–2 distinct moves in the combo, C for 3, B for 4, A for 5 and S for 6 or more.
- [x] EBL-01 conferido: WHEN the player starts a light move facing a regular enemy in `idle` within 60 px THEN that enemy SHALL guard for 600 ms with probability `min(0.1 + 0.03 × (round − 1), 0.4)`, drawn from the run RNG.
- [x] EBL-02 conferido: WHILE a regular enemy guards, a light hit from its front SHALL deal 0 damage, add 8 structure and give `events` one `enemyBlock:<id>`.
- [x] EBL-03 conferido: WHILE a regular enemy guards, a heavy hit from its front SHALL deal its full damage.
- [x] EBL-05 conferido: WHEN a guarding regular enemy takes a heavy hit THEN its guard SHALL end in that frame.
- [x] EBL-04 conferido: WHEN `chuteCarregado` hits a guarding regular enemy THEN it SHALL deal its full damage and add 40 structure.
- [x] Gate check passes: `npm run build && npm test`

**Tests**: unit
**Gate**: build

**Commit**: `feat(core): add combo counter and enemy guard rules`

---

### T8: Frames dos golpes do chão

**What**: Frames `<golpe>-wind|hit|recover` 32×24 dos 13 golpes do chão, compostos das partes existentes, com poses que leem o golpe (rasteira baixa, gancho ascendente para cima, chute giratório de costas, carregado com o corpo torcido).
**Where**: `src/game/art/sprites/playerMoves.ts`
**Depends on**: None (paralela à fase 1)
**Reuses**: `compose`, `pose`, `ARM_*`, `LEGS_WIDE`, `armStraight`, `legStraight`
**Requirement**: MOV-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Prévia PNG conferida antes do commit
- [x] MOV-14 conferido: The player sheet SHALL contain the frames `<move>-wind`, `<move>-hit` and `<move>-recover` for every ground and air move, each 32×24 texels with only `PALETTE` keys (data test).
- [x] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(art): add ground fighting move frames`

---

### T9: Frames aéreos, defesa e barras

**What**: Frames dos 3 aéreos e da palma, `guard`, `parry`, `dodge-0/1`, `stunned-0/1`; cores das barras de estrutura e do combo em `combatColors.ts`.
**Where**: `src/game/art/sprites/playerMoves.ts`, `src/game/art/combatColors.ts`
**Depends on**: T8
**Reuses**: `PALETTE`
**Requirement**: MOV-14, STR-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Prévia PNG conferida antes do commit
- [x] MOV-14 conferido: The player sheet SHALL contain the frames `<move>-wind`, `<move>-hit` and `<move>-recover` for every ground and air move, each 32×24 texels with only `PALETTE` keys (data test).
- [x] STR-09 conferido: Every color used by the enemy and player structure bars SHALL be a key of `PALETTE` (data test on the exported color constants).
- [x] Gate check passes: `npm run build && npm test`

**Tests**: unit
**Gate**: build

**Commit**: `feat(art): add air, defense and structure art`

---

### T10: Teclas de luta e interação no E

**What**: `InputSnapshot` com leve, forte, forte segurado, `both`, cima, guarda (segurar e apertar), esquiva e `E`; painel de controles; varredura dos smokes que usavam `KeyK` para pegar/largar/arremessar passando a `KeyE`.
**Where**: `src/game/input.ts`, `src/scenes/TestScene.ts`, `scripts/smoke/*.smoke.mjs`
**Depends on**: None (fase anterior inteira)
**Reuses**: `PlayerInput`
**Requirement**: CTL-01, CTL-02, CTL-04, CTL-03, CTL-07, CTL-08, CTL-06

**Tools**:

- MCP: context7 (`/phaserjs/phaser/v3_90_0`)
- Skill: `phaser-gamedev`

**Done when**:

- [x] Leitura de teclas → snapshot testada em Node se extraída para `src/core`
- [x] Os 17 smokes atuais passam
- [x] CTL-01 conferido: WHEN `J` or `X` is pressed THEN the input snapshot SHALL report a light press in that frame.
- [x] CTL-02 conferido: WHEN `K` or `Z` is pressed THEN the input snapshot SHALL report a heavy press in that frame.
- [x] CTL-04 conferido: WHEN `J` and `K` are pressed in the same frame THEN the input snapshot SHALL report one `both` press and no separate light or heavy press.
- [x] CTL-03 conferido: WHEN `E` is pressed with free hands and a prop within reach THEN the player SHALL hold that prop.
- [x] CTL-07 conferido: WHEN `E` is pressed while holding a prop and `S` is not held THEN the prop SHALL leave the hands in the `thrown` state.
- [x] CTL-08 conferido: WHEN `E` is pressed while holding a prop and `S` is held THEN the player SHALL drop it.
- [x] CTL-06 conferido: The on-screen controls panel SHALL list `J leve · K forte · U guarda/parry · Q esquiva · E pegar`.
- [x] Gate check passes: `npm run build && npm test && npm run smoke`

**Tests**: smoke
**Gate**: full

**Commit**: `feat(game): map fighting keys and move interaction to E`

---

### T11: Golpes no player

**What**: `Player` usa a `MoveMachine` (swing com objeto continua no `ComboTracker`); frames dos golpes; dano por `meleeDamage` e +3 de energia pelo `onConnect`; `meleePhase/cancelMelee` (F5) lendo a máquina nova; eventos `move:*` e `player.move`.
**Where**: `src/game/Player.ts`, `src/scenes/TestScene.ts`
**Depends on**: T10
**Reuses**: `MoveMachine`, `openHitbox`
**Requirement**: MOV-02, MOV-13, MOV-18, MOV-15

**Tools**:

- MCP: context7 (`/phaserjs/phaser/v3_90_0`)
- Skill: `phaser-gamedev`

**Done when**:

- [ ] `tech.smoke` e `kokusen.smoke` (F5) continuam passando
- [ ] MOV-02 conferido: WHEN a light press happens with no move in progress on the ground THEN the move `jab` SHALL start.
- [ ] MOV-13 conferido: WHEN a move starts THEN `events` SHALL get exactly one `move:<name>` with its name.
- [ ] MOV-18 conferido: WHILE a move is in progress, `player.move` SHALL be its name, and `null` while no move is in progress.
- [ ] MOV-15 conferido: WHEN a move deals damage to a target THEN the damage SHALL pass through `modifiers.meleeDamage` (F4) and give the +3 cursed energy of CE-06 (F5).
- [ ] Gate check passes: `npm run build && npm test && npm run smoke`

**Tests**: smoke
**Gate**: full

**Commit**: `feat(game): drive player strikes from the move graph`

---

### T12: Reações dos inimigos

**What**: Efeitos por golpe: derrubar 900 ms (rasteira), lançar ≥ 64 px (gancho ascendente), empurrar (empurrão e palma); `suppressedMs` para desequilíbrio (400 ms) e quebra (1500 ms, estrelas); estrutura do inimigo e 2ª barra.
**Where**: `src/game/Enemy.ts`, `src/core/enemyBrain.ts`
**Depends on**: T11
**Reuses**: `enterRagdoll`, `ragdollStun`, `updateBar`
**Requirement**: MOV-10, MOV-11, STR-02, STR-05, STR-10, PAR-10, SPC-02

**Tools**:

- MCP: context7 (`/phaserjs/phaser/v3_90_0`)
- Skill: `phaser-gamedev`

**Done when**:

- [ ] MOV-10 conferido: WHEN `rasteira` hits a regular enemy that survives THEN the enemy SHALL be knocked down for 900 ms.
- [ ] MOV-11 conferido: WHEN `ganchoAscendente` hits a regular enemy that survives THEN the enemy SHALL receive an upward impulse that lifts its center at least 64 px.
- [ ] STR-02 conferido: WHEN a regular enemy takes a light hit, a heavy hit, the `chuteCarregado` or the `joelhada` THEN its structure SHALL increase by 4, 10, 40 or 30 (10 + 20), respectively, capped at 100.
- [ ] STR-05 conferido: WHEN a regular enemy structure reaches 100 THEN it SHALL be broken and stunned (no attack, no movement) for 1500 ms.
- [ ] STR-10 conferido: WHEN a regular enemy structure reaches 100 THEN `events` SHALL get exactly one `guardBreak:<id>`.
- [ ] PAR-10 conferido: WHEN a regular enemy hit is parried THEN that enemy SHALL neither attack nor move for 400 ms.
- [ ] SPC-02 conferido: WHEN `palmaExplosiva` hits a regular enemy that survives THEN it SHALL push the enemy 200 px (±16 px) away.
- [ ] Gate check passes: `npm run build && npm test`

**Tests**: none (coberto pelos smokes da fase 5)
**Gate**: build

**Commit**: `feat(game): add knockdown, launch and structure to enemies`

---

### T13: Guarda, parry e esquiva no player

**What**: `Player.receiveHit` chama `resolveIncomingHit`; pose de guarda e velocidade 40%; parry com hitstop 80 ms, faísca e anel; parry no chefe reduz poise 30; `shockwave` do chefe imbloqueável; esquiva com dash e rastro; estrutura do jogador e guarda quebrada; cancelamento da recovery por esquiva.
**Where**: `src/game/Player.ts`, `src/game/Boss.ts`, `src/scenes/TestScene.ts`
**Depends on**: T12
**Reuses**: `Guard`, `Dodge`, `Structure`, `Hitstop`
**Requirement**: GRD-01, GRD-02, GRD-07, GRD-05, GRD-08, GRD-09, CTL-09, PAR-02, PAR-09, PAR-07, PAR-08, PAR-11, DOD-01, DOD-09, DOD-06, DOD-11, STR-03, STR-06, STR-11

**Tools**:

- MCP: context7 (`/phaserjs/phaser/v3_90_0`)
- Skill: `phaser-gamedev`

**Done when**:

- [ ] GRD-01 conferido: WHILE `U` or `Shift` is held on the ground and no move, dodge or cast is in progress, `player.guard` SHALL be `guard` (or `parry` during the parry window).
- [ ] GRD-02 conferido: WHEN a regular enemy hit reaches the player from the front while `player.guard` is `guard` THEN the player SHALL take 0 damage.
- [ ] GRD-07 conferido: WHEN a hit is blocked by the guard THEN `events` SHALL get exactly one `block`.
- [ ] GRD-05 conferido: WHILE guarding, the player run speed SHALL be 40% of the normal run speed.
- [ ] GRD-08 conferido: WHEN a hit is blocked THEN `fx.layers` SHALL include `guard.spark` in that frame.
- [ ] GRD-09 conferido: WHEN a hit is blocked THEN the player SHALL be pushed 8 px (±2 px) away from the attacker.
- [ ] CTL-09 conferido: WHILE `player.guard` is `guard` or `parry`, the player sprite SHALL show the `guard` frame.
- [ ] PAR-02 conferido: WHEN an enemy or boss hit reaches the player during an open parry window THEN the player SHALL take 0 damage.
- [ ] PAR-09 conferido: WHEN a hit is parried THEN `events` SHALL get exactly one `parry`.
- [ ] PAR-07 conferido: WHEN a boss hit is parried THEN the boss poise SHALL decrease by 30, never below 0.
- [ ] PAR-08 conferido: WHEN a hit is parried THEN the game SHALL apply a hitstop of 80 ms.
- [ ] PAR-11 conferido: WHEN a hit is parried THEN `fx.layers` SHALL include `parry.flash` and `parry.ring` in that frame.
- [ ] DOD-01 conferido: WHEN `Q` is pressed on the ground with no dodge cooldown and no move or cast in progress THEN the player SHALL move 96 px (±4 px) in 200 ms toward the held horizontal direction, or away from the facing direction if none is held.
- [ ] DOD-09 conferido: WHEN a dodge starts THEN `events` SHALL get exactly one `dodge`.
- [ ] DOD-06 conferido: WHEN a move that already hit a target is in its recovery and `Q` is pressed with no dodge cooldown THEN the move SHALL end and the dodge SHALL start in that frame.
- [ ] DOD-11 conferido: WHILE a dodge is active, `fx.layers` SHALL include `dodge.trail`.
- [ ] STR-03 conferido: WHEN a player hit is blocked by the player guard THEN the player structure SHALL increase by 15 for a regular enemy hit and 25 for a boss hit, capped at 100.
- [ ] STR-06 conferido: WHEN the player structure reaches 100 THEN the player SHALL be stunned for 800 ms, ignoring input.
- [ ] STR-11 conferido: WHEN the player structure reaches 100 THEN `events` SHALL get exactly one `guardBreak:player`.
- [ ] Gate check passes: `npm run build && npm test`

**Tests**: none (coberto pelos smokes da fase 5)
**Gate**: build

**Commit**: `feat(game): add guard, parry and dodge to the player`

---

### T14: Câmera lenta, finalizador e snapshot

**What**: `SlowMo` nos 3 timeScales (esquiva perfeita), bônus do contra-ataque, finalizador com `both` perto de inimigo quebrado (40 de dano, hitstop 150 ms, zoom 1,7), eventos e todos os campos novos do snapshot.
**Where**: `src/scenes/TestScene.ts`, `src/game/debugApi.ts`
**Depends on**: T13
**Reuses**: `SlowMo`, padrão do FxLab
**Requirement**: DOD-07, DOD-08, DOD-12, FIN-01, FIN-02, FIN-04, FIN-03, CTL-05

**Tools**:

- MCP: context7 (`/phaserjs/phaser/v3_90_0`)
- Skill: `phaser-gamedev`

**Done when**:

- [ ] DOD-07 conferido: WHEN a perfect dodge happens THEN `timeScale` SHALL be 0.3 for 400 ms of real time and then return to 1.
- [ ] DOD-08 conferido: WHEN the player hits a target within 1000 ms after a perfect dodge THEN that hit damage SHALL be multiplied by 1.5 (rounded, halves up), once.
- [ ] DOD-12 conferido: WHILE `timeScale` is 0.3, `fx.layers` SHALL include `dodge.slowTint`.
- [ ] FIN-01 conferido: WHEN a `both` press (CTL-04) happens within 40 px of a broken regular enemy THEN the finisher SHALL hit that enemy for 40 damage and `events` SHALL get `finisher:<id>`.
- [ ] FIN-02 conferido: WHEN the finisher hits THEN the game SHALL apply a hitstop of 150 ms.
- [ ] FIN-04 conferido: WHEN the finisher hits THEN the main camera zoom SHALL reach 1.7 within 100 ms of real time.
- [ ] FIN-03 conferido: IF a `both` press happens and no broken enemy is within 40 px THEN no finisher SHALL happen.
- [ ] CTL-05 conferido: WHERE the debug mode is on, the snapshot SHALL include the `player.move`, `player.guard`, `player.structure`, `player.dodge`, `enemies[].structure`, `enemies[].guarding`, `combo` and `timeScale` fields of the contract above.
- [ ] Gate check passes: `npm run build && npm test`

**Tests**: none (coberto pelos smokes da fase 5)
**Gate**: build

**Commit**: `feat(game): add slow motion, finisher and combat snapshot`

---

### T15: Aéreos e voadora

**What**: Golpes no ar com a `MoveMachine`: soco aéreo, voadora (avança 120 px na diagonal) e pisão (queda máxima); um por pulo.
**Where**: `src/game/Player.ts`
**Depends on**: None (fase anterior inteira)
**Reuses**: `MoveMachine`
**Requirement**: AIR-01, AIR-02, AIR-03, AIR-04, AIR-05

**Tools**:

- MCP: context7 (`/phaserjs/phaser/v3_90_0`)
- Skill: `phaser-gamedev`

**Done when**:

- [ ] AIR-01 conferido: WHEN a light press happens in the air with no move in progress THEN `socoAereo` (7 light) SHALL start.
- [ ] AIR-02 conferido: WHEN a heavy press happens in the air with no move in progress THEN `voadora` (16 heavy) SHALL start and move the player 120 px (±8 px) forward and down over its active time.
- [ ] AIR-03 conferido: WHEN a heavy press happens in the air while `S` is held THEN `pisao` (14 heavy) SHALL start and set the player vertical speed to the max fall speed.
- [ ] AIR-04 conferido: The player SHALL start at most one air move per jump.
- [ ] AIR-05 conferido: WHILE `voadora` is active, `fx.layers` SHALL include `air.kickTrail`.
- [ ] Gate check passes: `npm run build && npm test`

**Tests**: none (coberto pelos smokes da fase 5)
**Gate**: build

**Commit**: `feat(game): add air strikes and flying kick`

---

### T16: Inimigos que bloqueiam

**What**: IA do inimigo comum levanta guarda por `EnemyGuard` (pose, faísca azul no bloqueio, `enemyBlock:<id>`); `?debug&enemyGuard=1` fixa a chance em 1.
**Where**: `src/game/Enemy.ts`, `src/core/enemyAI.ts`
**Depends on**: T15
**Reuses**: `EnemyGuard`
**Requirement**: EBL-01, EBL-02, EBL-03, EBL-05, EBL-04

**Tools**:

- MCP: context7 (`/phaserjs/phaser/v3_90_0`)
- Skill: `phaser-gamedev`

**Done when**:

- [ ] EBL-01 conferido: WHEN the player starts a light move facing a regular enemy in `idle` within 60 px THEN that enemy SHALL guard for 600 ms with probability `min(0.1 + 0.03 × (round − 1), 0.4)`, drawn from the run RNG.
- [ ] EBL-02 conferido: WHILE a regular enemy guards, a light hit from its front SHALL deal 0 damage, add 8 structure and give `events` one `enemyBlock:<id>`.
- [ ] EBL-03 conferido: WHILE a regular enemy guards, a heavy hit from its front SHALL deal its full damage.
- [ ] EBL-05 conferido: WHEN a guarding regular enemy takes a heavy hit THEN its guard SHALL end in that frame.
- [ ] EBL-04 conferido: WHEN `chuteCarregado` hits a guarding regular enemy THEN it SHALL deal its full damage and add 40 structure.
- [ ] Gate check passes: `npm run build && npm test`

**Tests**: none (coberto pelos smokes da fase 5)
**Gate**: build

**Commit**: `feat(game): let regular enemies guard`

---

### T17: Contador de combo no HUD

**What**: `ComboCounter` ligado aos acertos e ao dano sofrido; HUD à direita com `N hits` e a nota, na câmera de UI.
**Where**: `src/game/Hud.ts`, `src/scenes/TestScene.ts`
**Depends on**: T16
**Reuses**: `ComboCounter`, `combatColors`
**Requirement**: CMB-01, CMB-02, CMB-04, CMB-05

**Tools**:

- MCP: context7 (`/phaserjs/phaser/v3_90_0`)
- Skill: `phaser-gamedev`

**Done when**:

- [ ] CMB-01 conferido: WHEN a player hit lands on a target THEN `combo.hits` SHALL increase by 1.
- [ ] CMB-02 conferido: WHEN 1500 ms pass without a new landed hit, or the player takes damage, THEN `combo.hits` SHALL become 0 and `combo.grade` null.
- [ ] CMB-04 conferido: WHILE `combo.hits` ≥ 2, the HUD SHALL show the text `<hits> hits` at the right side of the screen.
- [ ] CMB-05 conferido: WHILE `combo.hits` ≥ 2, the HUD SHALL show the grade letter under the hits text.
- [ ] Gate check passes: `npm run build && npm test`

**Tests**: none (coberto pelos smokes da fase 5)
**Gate**: build

**Commit**: `feat(hud): show combo hits and style grade`

---

### T18: Palma explosiva

**What**: Meia-lua (↓, frente, `J` em 300 ms) dispara `palmaExplosiva` pela `MotionInput`, empurrando 200 px.
**Where**: `src/game/Player.ts`
**Depends on**: T17
**Reuses**: `MotionInput`
**Requirement**: SPC-01, SPC-02

**Tools**:

- MCP: context7 (`/phaserjs/phaser/v3_90_0`)
- Skill: `phaser-gamedev`

**Done when**:

- [ ] SPC-01 conferido: WHEN `S`, then the facing direction, then a light press happen within 300 ms in that order THEN `palmaExplosiva` (20 heavy) SHALL start instead of the move the last press would start.
- [ ] SPC-02 conferido: WHEN `palmaExplosiva` hits a regular enemy that survives THEN it SHALL push the enemy 200 px (±16 px) away.
- [ ] Gate check passes: `npm run build && npm test`

**Tests**: none (coberto pelos smokes da fase 5)
**Gate**: build

**Commit**: `feat(game): add quarter-circle explosive palm`

---

### T19: Smoke dos golpes

**What**: `fight.smoke.mjs`: cada golpe do chão por entrada, as sequências, carregado, rasteira derrubando, gancho lançando, aéreos e palma, com `move:*` e `player.move`.
**Where**: `scripts/smoke/fight.smoke.mjs`
**Depends on**: None (fase anterior inteira)
**Reuses**: `tap` de `shop.smoke.mjs`
**Requirement**: MOV-02, MOV-03, MOV-05, MOV-06, MOV-17, MOV-07, MOV-08, MOV-09, MOV-10, MOV-11, MOV-13, AIR-02, AIR-05, SPC-01, CTL-03, CTL-06

**Tools**:

- MCP: context7 (`/phaserjs/phaser/v3_90_0`)
- Skill: `phaser-gamedev`

**Done when**:

- [ ] MOV-02 conferido: WHEN a light press happens with no move in progress on the ground THEN the move `jab` SHALL start.
- [ ] MOV-03 conferido: WHEN a press matching a follow-up of the current move happens between the start of its recovery and 260 ms after the recovery ends THEN that follow-up SHALL start at the end of the recovery.
- [ ] MOV-05 conferido: WHEN a heavy press happens with no move in progress on the ground THEN the move `chuteFrontal` SHALL start.
- [ ] MOV-06 conferido: WHEN a light press happens while `S` is held on the ground with no move in progress THEN `socoBaixo` SHALL start.
- [ ] MOV-17 conferido: WHEN a heavy press happens while `S` is held on the ground with no move in progress THEN `rasteira` SHALL start.
- [ ] MOV-07 conferido: WHEN a light press happens while `W` is held on the ground with no move in progress THEN `ganchoAscendente` SHALL start.
- [ ] MOV-08 conferido: WHEN a heavy press happens while the direction the player faces is held on the ground with no move in progress THEN `chuteEmpurrao` SHALL start.
- [ ] MOV-09 conferido: WHEN `K` is released after being held for at least 400 ms since its press THEN `chuteCarregado` SHALL start as soon as the current move ends.
- [ ] MOV-10 conferido: WHEN `rasteira` hits a regular enemy that survives THEN the enemy SHALL be knocked down for 900 ms.
- [ ] MOV-11 conferido: WHEN `ganchoAscendente` hits a regular enemy that survives THEN the enemy SHALL receive an upward impulse that lifts its center at least 64 px.
- [ ] MOV-13 conferido: WHEN a move starts THEN `events` SHALL get exactly one `move:<name>` with its name.
- [ ] AIR-02 conferido: WHEN a heavy press happens in the air with no move in progress THEN `voadora` (16 heavy) SHALL start and move the player 120 px (±8 px) forward and down over its active time.
- [ ] AIR-05 conferido: WHILE `voadora` is active, `fx.layers` SHALL include `air.kickTrail`.
- [ ] SPC-01 conferido: WHEN `S`, then the facing direction, then a light press happen within 300 ms in that order THEN `palmaExplosiva` (20 heavy) SHALL start instead of the move the last press would start.
- [ ] CTL-03 conferido: WHEN `E` is pressed with free hands and a prop within reach THEN the player SHALL hold that prop.
- [ ] CTL-06 conferido: The on-screen controls panel SHALL list `J leve · K forte · U guarda/parry · Q esquiva · E pegar`.
- [ ] Gate check passes: `npm run build && npm test && npm run smoke`

**Tests**: smoke
**Gate**: full

**Commit**: `test(smoke): cover fighting moves`

---

### T20: Smoke da defesa

**What**: `defense.smoke.mjs`: guarda (0 de dano, `block`), golpe pelas costas, parry 60 ms antes do golpe (`parry`, hp intacto, estrutura +35, inimigo parado 400 ms), anti-spam, esquiva perfeita (`perfectDodge`, `timeScale` 0,3, bônus), guarda quebrada do jogador, quebra do inimigo e finalizador.
**Where**: `scripts/smoke/defense.smoke.mjs`
**Depends on**: T19
**Reuses**: `tap`
**Requirement**: GRD-02, GRD-07, GRD-08, GRD-03, CTL-09, PAR-02, PAR-11, DOD-11, DOD-12, PAR-09, PAR-03, PAR-10, PAR-04, DOD-01, DOD-03, DOD-07, DOD-08, STR-05, STR-06, FIN-01, FIN-02

**Tools**:

- MCP: context7 (`/phaserjs/phaser/v3_90_0`)
- Skill: `phaser-gamedev`

**Done when**:

- [ ] GRD-02 conferido: WHEN a regular enemy hit reaches the player from the front while `player.guard` is `guard` THEN the player SHALL take 0 damage.
- [ ] GRD-07 conferido: WHEN a hit is blocked by the guard THEN `events` SHALL get exactly one `block`.
- [ ] GRD-08 conferido: WHEN a hit is blocked THEN `fx.layers` SHALL include `guard.spark` in that frame.
- [ ] GRD-03 conferido: IF a regular enemy hit reaches the guarding player while the attacker center x is on the side opposite to the player facing THEN the player SHALL take exactly the hit damage.
- [ ] CTL-09 conferido: WHILE `player.guard` is `guard` or `parry`, the player sprite SHALL show the `guard` frame.
- [ ] PAR-02 conferido: WHEN an enemy or boss hit reaches the player during an open parry window THEN the player SHALL take 0 damage.
- [ ] PAR-11 conferido: WHEN a hit is parried THEN `fx.layers` SHALL include `parry.flash` and `parry.ring` in that frame.
- [ ] DOD-11 conferido: WHILE a dodge is active, `fx.layers` SHALL include `dodge.trail`.
- [ ] DOD-12 conferido: WHILE `timeScale` is 0.3, `fx.layers` SHALL include `dodge.slowTint`.
- [ ] PAR-09 conferido: WHEN a hit is parried THEN `events` SHALL get exactly one `parry`.
- [ ] PAR-03 conferido: WHEN a regular enemy hit is parried THEN that enemy structure SHALL increase by 35, capped at 100.
- [ ] PAR-10 conferido: WHEN a regular enemy hit is parried THEN that enemy SHALL neither attack nor move for 400 ms.
- [ ] PAR-04 conferido: IF `U` or `Shift` is pressed less than 300 ms after the previous press THEN no parry window SHALL open.
- [ ] DOD-01 conferido: WHEN `Q` is pressed on the ground with no dodge cooldown and no move or cast in progress THEN the player SHALL move 96 px (±4 px) in 200 ms toward the held horizontal direction, or away from the facing direction if none is held.
- [ ] DOD-03 conferido: WHEN a hit reaches the player while it is invulnerable by DOD-02 THEN `events` SHALL get exactly one `perfectDodge` for that dodge.
- [ ] DOD-07 conferido: WHEN a perfect dodge happens THEN `timeScale` SHALL be 0.3 for 400 ms of real time and then return to 1.
- [ ] DOD-08 conferido: WHEN the player hits a target within 1000 ms after a perfect dodge THEN that hit damage SHALL be multiplied by 1.5 (rounded, halves up), once.
- [ ] STR-05 conferido: WHEN a regular enemy structure reaches 100 THEN it SHALL be broken and stunned (no attack, no movement) for 1500 ms.
- [ ] STR-06 conferido: WHEN the player structure reaches 100 THEN the player SHALL be stunned for 800 ms, ignoring input.
- [ ] FIN-01 conferido: WHEN a `both` press (CTL-04) happens within 40 px of a broken regular enemy THEN the finisher SHALL hit that enemy for 40 damage and `events` SHALL get `finisher:<id>`.
- [ ] FIN-02 conferido: WHEN the finisher hits THEN the game SHALL apply a hitstop of 150 ms.
- [ ] Gate check passes: `npm run build && npm test && npm run smoke`

**Tests**: smoke
**Gate**: full

**Commit**: `test(smoke): cover guard, parry, dodge and finisher`

---

### T21: Smoke do bloqueio dos inimigos e do combo

**What**: `enemy-guard.smoke.mjs` com `?debug&enemyGuard=1` (leve bloqueado, forte e carregado passam) e HUD do combo com a nota.
**Where**: `scripts/smoke/enemy-guard.smoke.mjs`
**Depends on**: T20
**Reuses**: `tap`
**Requirement**: EBL-02, EBL-03, EBL-04, CMB-03, CMB-04

**Tools**:

- MCP: context7 (`/phaserjs/phaser/v3_90_0`)
- Skill: `phaser-gamedev`

**Done when**:

- [ ] EBL-02 conferido: WHILE a regular enemy guards, a light hit from its front SHALL deal 0 damage, add 8 structure and give `events` one `enemyBlock:<id>`.
- [ ] EBL-03 conferido: WHILE a regular enemy guards, a heavy hit from its front SHALL deal its full damage.
- [ ] EBL-04 conferido: WHEN `chuteCarregado` hits a guarding regular enemy THEN it SHALL deal its full damage and add 40 structure.
- [ ] CMB-03 conferido: WHILE `combo.hits` ≥ 2, `combo.grade` SHALL be D for 1–2 distinct moves in the combo, C for 3, B for 4, A for 5 and S for 6 or more.
- [ ] CMB-04 conferido: WHILE `combo.hits` ≥ 2, the HUD SHALL show the text `<hits> hits` at the right side of the screen.
- [ ] Gate check passes: `npm run build && npm test && npm run smoke`

**Tests**: smoke
**Gate**: full

**Commit**: `test(smoke): cover enemy guard and combo grade`

---
