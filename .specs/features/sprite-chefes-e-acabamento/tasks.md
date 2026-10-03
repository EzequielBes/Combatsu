# Chefes desenhados e acabamento de golpes e objetos — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/sprite-chefes-e-acabamento/spec.md`
**Design**: `.specs/features/sprite-chefes-e-acabamento/design.md`
**Status**: In Progress
**Branch**: `feat/sprite-chefes-e-acabamento` (a partir de `dev`; volta para `dev` com `--no-ff` após o Verifier PASS e o UAT do usuário, AD-008)

---

## Test Coverage Matrix

> Guidelines: `vitest.config.ts`; `.specs/STATE.md` AD-001/002/012/017/018; lições confirmadas L-010 (limiares dos dois lados) e L-043 (testar a chamada do adaptador que repassa a config ao motor).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Arte (`src/game/art/**`, sem `phaser`) | unit | 1:1 com os ACs; contagens, caixas e durações iguais à spec; limiares conferidos dos dois lados | `tests/game/*.test.ts` | `npm test` |
| Registro das animações (`registerAnims` em `src/game/art/index.ts`) | unit | Cena falsa recebe `duration` e `repeat` de cada animação de `BOSS_ANIMS` | `tests/game/registerAnims.test.ts` | `npm test` |
| Adaptadores Phaser (`Boss`, `Projectile`, `Prop`, `Enemy`) | none | Nenhum muda; os smokes `boot` e `boss*` rodam no gate final | `scripts/smoke/*.smoke.mjs` | `npm run smoke -- boot`, `npm run smoke -- boss` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tasks com testes unitários | `npm run typecheck && npm test` |
| Build | Última task de cada fase | `npm run build && npm test` |
| Full | Última task da feature | `npm run build && npm test && npm run smoke -- boot && npm run smoke -- boss` |

---

## Execution Plan

8 tasks, um lote só: execução inline, sem workers.

### Phase 1: Chefes

```
T1 → T2 → T3
```

### Phase 2: Golpes do player

```
T4 → T5
```

### Phase 3: Objetos e inimigos

```
T6 → T7 → T8
```

---

## Task Breakdown

### T1: Frames do Oni por pose articulada e mapa da Tecelã

**What**: Reescrever a montagem dos frames do chefe (primitivas, `Pose`, `figure`, `deadFigure`, 20 frames) e o `TECELA_COLOR_MAP`, conforme o design §2. `BOSS_ANIMS` continua com 1 frame por estado; projétil e onda não mudam aqui.
**Where**: `src/game/art/sprites/boss.ts`, `tests/game/art.test.ts`
**Depends on**: None
**Reuses**: `selOut` de `src/game/art/selOut.ts`; medidas `bboxOf`/componentes já usadas em `tests/game`
**Requirement**: BSP-01, BSP-02, BSP-03, BSP-04, BSP-05, BSP-06, BSP-07, BSP-08, BSP-09, BSP-10, BSP-11, BSP-12, BSP-13

**Done when**:

- [x] BSP-01: `BOSS_FRAMES` e `TECELA_FRAMES` passam no `parseSheet` com 40×32 e só chaves da paleta.
- [x] BSP-02: a `PALETTE` tem exatamente 42 chaves.
- [x] BSP-03: no `idle` do Oni, `A`, `a`, `z` e `m` aparecem em pelo menos 10 texels cada.
- [x] BSP-04: o `idle` do Oni tem no máximo 12 `k` internos.
- [x] BSP-05: caixa opaca do `idle` com esquerda ≤ 10, direita ≥ 29, topo ≤ 4 e base = 31.
- [x] BSP-06: todo frame de `BOSS_FRAMES` tem um único componente.
- [x] BSP-07: cada par entre `idle` e os três preparos tem diferença ≥ 0,20.
- [x] BSP-08: `charge`, `leap` e `volley` têm diferença ≥ 0,20 em relação ao próprio preparo.
- [x] BSP-09: caixa opaca do `dead` com altura ≤ 14 e base = 31.
- [x] BSP-10: topo do `stagger` pelo menos 2 linhas abaixo do topo do `idle`.
- [x] BSP-11: cada frame da Tecelã é igual ao do Oni com o mapa aplicado texel a texel.
- [x] BSP-12: cor dominante do `idle` é `a` no Oni e `u` na Tecelã.
- [x] BSP-13: para cada chave de pele, juba e pano, o mapa aponta para outra chave da paleta.
- [x] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(art): draw the boss from articulated poses with shaded volumes`

---

### T2: Animações do chefe em laço

**What**: `BOSS_ANIMS` como `AnimDef` com os frames e as durações do design §2; teste do repasse pelo `registerAnims`.
**Where**: `src/game/art/sprites/boss.ts`, `tests/game/art.test.ts`, `tests/game/registerAnims.test.ts`
**Depends on**: T1
**Reuses**: `AnimDef`, `animFrameConfigs` de `player.ts`; cena falsa de `tests/game/registerAnims.test.ts`
**Requirement**: BAN-01, BAN-02, BAN-03, BAN-04, BAN-05, BAN-06, BAN-07, EDG-02

**Done when**:

- [x] BAN-01: `idle` com 4 frames, `repeat` −1, 4 durações > 0 e nenhum par consecutivo igual (contando a volta).
- [x] BAN-02: os três preparos têm 2 frames distintos em laço, o primeiro com o nome do estado, 90 ms cada.
- [x] BAN-03: `charge`, `roar` e `stagger` têm 2 frames distintos em laço, o primeiro com o nome do estado, com 80, 80 e 220 ms por frame.
- [x] BAN-04: `volley` tem 2 frames distintos em laço, o primeiro com o nome do estado, e as durações somam `BOSS.volley.intervalMs`.
- [x] BAN-05: `leap` e `dead` têm 1 frame, com o nome do estado.
- [x] BAN-06: todo frame citado existe em `BOSS_FRAMES` e em `TECELA_FRAMES`.
- [x] BAN-07: `registerAnims` com `BOSS_ANIMS` entrega ao Phaser a `duration` de cada frame e o `repeat` de cada animação.
- [x] EDG-02: `durations` com tamanho errado numa animação do chefe lança erro com o nome da animação.
- [x] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(art): loop boss animations with per-frame durations`

---

### T3: Projétil e onda de choque desenhados

**What**: `PROJECTILE_FRAME` (esfera 8×8) e `SHOCKWAVE_FRAME` (labaredas 16×10) à mão; sai o `block()`.
**Where**: `src/game/art/sprites/boss.ts`, `tests/game/art.test.ts`
**Depends on**: T2
**Reuses**: testes existentes de altura da onda (BAT-03, BAT-07)
**Requirement**: BPW-01, BPW-02, BPW-03

**Done when**:

- [x] BPW-01: projétil 8×8, 4 cantos transparentes, tons `w`, `U`, `u` e `v`.
- [x] BPW-02: onda 16×10, pelo menos 30% de texels transparentes, tons `w`, `A`, `a` e `z`.
- [x] BPW-03: linha 9 da onda com pelo menos 12 texels opacos.
- [x] Gate check passes: `npm run build && npm test`

**Tests**: unit
**Gate**: build
**Commit**: `feat(art): draw the boss projectile and shockwave by hand`

---

### T4: Braço e perna esticados com antebraço e canela finos

**What**: `armStraight` e `legStraight` conforme o design §3.
**Where**: `src/game/art/sprites/player.ts`, `tests/game/art.test.ts`
**Depends on**: None
**Reuses**: testes de alcance (SPR-07), bbox (SPR-06), rastro (SPR-14) e consistência (SPF-01..03)
**Requirement**: LMB-01, LMB-02, LMB-03, LMB-04, LMB-05, LMB-06, EDG-01

**Done when**:

- [x] LMB-01: para `len` de 9 a 22, as duas funções devolvem 5 linhas, `len` colunas na mais larga e texel opaco na coluna `len − 1`.
- [x] LMB-02: para `len` de 12 a 22, o braço tem ≥ 3 colunas seguidas de perfil ≤ 4 antes do punho e ≥ 1 coluna de perfil 5 entre as 5 últimas.
- [x] LMB-03: para `len` de 12 a 22, a perna tem ≥ 3 colunas seguidas de perfil ≤ 4 antes do pé e ≥ 2 colunas de perfil 5 entre as 6 últimas.
- [x] LMB-04: ponta do membro em `jab-hit`, `cross-hit` e `kick-hit` nas colunas 27, 27 e 30.
- [x] LMB-05: todos os 102 frames da linha de base continuam a até 2 texels dela.
- [x] LMB-06: todo frame do player com um único componente (sem `S`) e 0 pixels cortados.
- [x] EDG-01: com `len` de 9 a 11, toda coluna do braço antes do punho tem perfil 5.
- [x] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(art): taper the player's straight arm and leg`

---

### T5: Chute alto pelo quadril e golpes derivados no formato novo

**What**: `legRaised` no `chuteAlto-hit`; `armPalm` derivada do `armStraight`; `armElbow` em ponta; `legDown` com sapato.
**Where**: `src/game/art/sprites/playerMoves.ts`, `tests/game/art.test.ts`
**Depends on**: T4
**Reuses**: `armStraight` de `player.ts`; testes de consistência do player
**Requirement**: LMB-05, LMB-06, LMB-07, LMB-08

**Done when**:

- [x] LMB-07: no `chuteAlto-hit`, nenhum `s`, `N`, `n` ou `o` nas linhas 0 a 6 à esquerda da coluna 20.
- [x] LMB-08: no `chuteAlto-hit`, a ponta do pé fica na coluna 31, numa linha de 2 a 6.
- [x] LMB-05 e LMB-06 continuam valendo para os frames de `PLAYER_MOVE_FRAMES`.
- [x] Gate check passes: `npm run build && npm test`

**Tests**: unit
**Gate**: build
**Commit**: `feat(art): raise the high kick from the hip and reshape derived limbs`

---

### T6: Cadeira e garrafa com volume

**What**: Grades novas `CHAIR` e `BOTTLE`, nos mesmos tamanhos.
**Where**: `src/game/art/sprites/props.ts`, `tests/game/art.test.ts`
**Depends on**: None
**Reuses**: `cutShards`; testes de corpo, contorno e estilhaços (PRP-01)
**Requirement**: OBJ-01, OBJ-02

**Done when**:

- [x] OBJ-01: cadeira 13×13 com pelo menos 6 chaves distintas, entre elas `m`, `M`, `s` e `S`.
- [x] OBJ-02: garrafa 4×10 com as chaves `G`, `g`, `w`, `l` e `L`.
- [x] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(art): give the chair and bottle material and shine`

---

### T7: Faca e porrete com volume

**What**: Grades novas `KNIFE` e `CLUB`, nos mesmos tamanhos, com `k` só no contorno.
**Where**: `src/game/art/sprites/tools.ts`, `tests/game/art.test.ts`
**Depends on**: T6
**Reuses**: `withOutline`, `toolSheet`; testes de raridade e aura (ARM-19, RAR-03)
**Requirement**: OBJ-03, OBJ-04

**Done when**:

- [x] OBJ-03: `common` da faca com 3×10, pelo menos 7 chaves distintas, entre elas `w` e `z`, e nenhuma `A`.
- [x] OBJ-04: `common` do porrete com 5×8, pelo menos 7 chaves distintas, entre elas `l` e `M`, e nenhuma `A`.
- [x] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(art): detail the cursed knife and club`

---

### T8: Pendências dos inimigos

**What**: `rimFrom` no kit (bruto = 6), punho do bruto arredondado e `hurt-uppercut` com o corpo fora do chão (design §4).
**Where**: `src/game/art/sprites/enemy.ts`, `tests/game/art.test.ts`
**Depends on**: T7
**Reuses**: testes de alcance (EVR-03), bbox (EVR-07), sel-out (EVR-10) e reações (HRX-03)
**Requirement**: EPD-01, EPD-02, EPD-03, EPD-04

**Done when**:

- [ ] EPD-01: no `impact` do bruto, as linhas 0 a 11 têm exatamente 1 `w`.
- [ ] EPD-02: no `attack-0` do bruto, a coluna da ponta do punho tem exatamente 3 texels opacos.
- [ ] EPD-03: no rastejante, o topo do `hurt-uppercut-0` fica pelo menos 3 linhas acima do topo do `hurt-head-a-0`.
- [ ] EPD-04: nas três aparências, a base da caixa opaca do `hurt-uppercut-0` fica na linha 20 ou acima.
- [ ] Gate check passes: `npm run build && npm test && npm run smoke -- boot && npm run smoke -- boss`

**Tests**: unit
**Gate**: full
**Commit**: `fix(art): close the enemy sprite follow-ups`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3

Phase 1:  T1 ------→ T2 ------→ T3
Phase 2:  T4 ------→ T5
Phase 3:  T6 ------→ T7 ------→ T8
```

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: frames do chefe | 1 conjunto de frames num arquivo + testes | ✅ Granular |
| T2: animações do chefe | 1 catálogo + testes | ✅ Granular |
| T3: projétil e onda | 2 grades do mesmo arquivo + testes | ✅ Coeso |
| T4: membros esticados | 2 funções irmãs + testes | ✅ Coeso |
| T5: golpes derivados | 4 funções do mesmo arquivo + testes | ⚠️ Coeso (todas derivam do formato da T4) |
| T6: cadeira e garrafa | 2 grades + testes | ✅ Coeso |
| T7: faca e porrete | 2 grades + testes | ✅ Coeso |
| T8: pendências dos inimigos | 3 ajustes do mesmo arquivo + testes | ⚠️ Coeso (mesmo kit e mesmo bloco de teste) |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | início da fase 1 | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | None | início da fase 2 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | None | início da fase 3 | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |
| T8 | T7 | T7 → T8 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Arte | unit | unit | ✅ OK |
| T2 | Arte + registro das animações | unit | unit | ✅ OK |
| T3 | Arte | unit | unit | ✅ OK |
| T4 | Arte | unit | unit | ✅ OK |
| T5 | Arte | unit | unit | ✅ OK |
| T6 | Arte | unit | unit | ✅ OK |
| T7 | Arte | unit | unit | ✅ OK |
| T8 | Arte | unit | unit | ✅ OK |
