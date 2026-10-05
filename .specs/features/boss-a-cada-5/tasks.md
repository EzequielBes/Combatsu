# Boss a cada 5 rodadas — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/boss-a-cada-5/spec.md`
**Design**: `.specs/features/boss-a-cada-5/design.md`
**Status**: Done (Verifier PASS na rodada 3; ver validation.md)
**Branch**: `feat/boss-a-cada-5` (a partir de `dev`; volta para `dev` com `--no-ff` após o Verifier PASS, AD-008)
**Test count before this feature**: 323

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `vitest.config.ts`; `.specs/STATE.md` AD-001/002/003/006; lição confirmada L-010 (testar limiares dos dois lados). Sem `AGENTS.md` - strong defaults aplicados.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Lógica pura (`src/core/**`) | unit | Todos os ramos; 1:1 com os ACs; limites exatos dos dois lados (ex.: 66%/66%+1, 1499/1500 ms, 899/900, 1199/1200, 1999/2000, 349/350) | `tests/core/*.test.ts` | `npm test` |
| Tuning e arte (`src/data/**`, `src/game/art/**` sem phaser) | unit | Valores iguais às Assumptions; grades válidas na paleta; mapa de cores da Tecelã dentro da paleta | `tests/data/*.test.ts`, `tests/game/art.test.ts` | `npm test` |
| Adaptadores Phaser (`src/game/*.ts`, `src/scenes/**`) | smoke | Um cenário com asserção sobre o snapshot por AC visível, lendo valores do objeto vivo (não do tuning) | `scripts/smoke/*.smoke.mjs` | `npm run smoke` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tasks com testes unitários | `npm run typecheck && npm test` (o Vitest não checa tipos; o T4 foi commitado com erro de tipo, corrigido no T6) |
| Full | Tasks com cenários de smoke | `npm run build && npm test && npm run smoke` |
| Build | Última task de cada fase | `npm run build && npm test` |

---

## Execution Plan

### Phase 1: Núcleo do chefe (puro)

```
T1 → T2 → T3 → T4 → T5 → T6
```

### Phase 2: Arte e dados

```
T7
```

### Phase 3: Chefe no jogo

```
T8 → T9 → T10
```

### Phase 4: Correções do Verifier (rodada 1)

```
T11
```

### Phase 5: Correções do Verifier (rodada 2)

```
T12
```

---

## Task Breakdown

### T1: Constantes do chefe

**What**: `BOSS` em `src/data/tuning.ts` com todos os números das Assumptions (intro, fases, ritmo, ataques, postura, vitória, tier, arquétipos) e `BOSS_DEFEAT_HITSTOP_MS = 250` em `src/data/fx.ts`.
**Where**: `src/data/tuning.ts`
**Depends on**: None
**Reuses**: padrão de `DIFFICULTY`/`WAVE`/`RUN`
**Requirement**: BOSS-06, BAT-01..04, BAI-01, BAI-03, BAI-04, BAI-07..09, BAI-11, BAI-13, BWIN-01, BWIN-02, BTIER-01, BTIER-02, BTIER-05, BTIER-07

> Toca também `src/data/fx.ts` (uma constante).

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `tests/data/tuning.test.ts` confere cada valor de `BOSS` contra as Assumptions da spec e `BOSS_DEFEAT_HITSTOP_MS === 250`
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(data): add boss tuning`

---

### T2: Tier e arquétipo do chefe

**What**: `tierFor`, `bossHpFor`, `bossDamageMultFor`, `archetypeFor` e `bossSpecFor`.
**Where**: `src/core/bossTier.ts`
**Depends on**: T1
**Reuses**: estilo de `src/core/difficulty.ts`
**Requirement**: BTIER-01, BTIER-02, BTIER-03, BTIER-04, BTIER-05, BTIER-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] maxHp: tier 1 = 600, 2 = 900, 3 = 1200, 6 = 2100, 7 = 2400 (teto), 20 = 2400 (BTIER-01)
- [x] dano da investida (18): tier 1 = 18, 2 = 21, 7 = 34, 8 = 36 (teto ×2), 20 = 36; mesma regra para pouso 20, onda 12 e projétil 10 (BTIER-02)
- [x] Para t de 2 a 50, os dois multiplicadores ≥ os de t − 1 (BTIER-03)
- [x] Arquétipo: tier 1 e 2 `oni`; 3 `tecela`; 4 `oni`; 5 `tecela`; nomes "Oni do Portão" e "Tecelã de Maldições" (BTIER-04)
- [x] Tecelã: `volleyCount` 5, `projectileSpeed` 325; Oni: 3 e 260 (BTIER-05, BTIER-07)
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(core): add boss tier scaling and archetypes`

---

### T3: Mover de projétil e onda

**What**: `Mover` com `update(dt)` que devolve `moving` ou `expired`.
**Where**: `src/core/mover.ts`
**Depends on**: T2
**Reuses**: nenhum
**Requirement**: BAT-12

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] A 260 px/s e 1200 px: `moving` com 1199 px percorridos, `expired` ao chegar a 1200 px; `x` anda na direção `dir` (±1) (BAT-12)
- [x] A 240 px/s e 600 px: `expired` exatamente em 600 px (BAT-12)
- [x] Vários `update` pequenos equivalem a um grande
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(core): add projectile mover`

---

### T4: Cérebro do chefe (vida, fases, postura)

**What**: `BossBrain` com intro, fases, rugido, postura, atordoamento e morte.
**Where**: `src/core/bossBrain.ts`
**Depends on**: T3
**Reuses**: estilo de `src/core/enemyBrain.ts`
**Requirement**: BOSS-06, BOSS-08, BAI-01, BAI-04, BAI-05, BAI-06, BAI-07, BAI-08, BAI-09, BAI-10, BAI-12, BAI-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Intro: golpe em 1499 ms não tira hp; `introEnd` em 1500 ms; golpe depois disso tira (BOSS-06, BOSS-08)
- [x] Fase por fração da vida (maxHp 600): hp 397 → fase 1; hp 396 → fase 2 (66%); hp 199 → fase 2; hp 198 → fase 3 (33%) (BAI-01)
- [x] Cruzar um limiar emite `phaseChanged` e entra em `roar` por 900 ms (899 ainda em roar, 900 sai); golpe no roar não tira hp (BAI-04, BAI-05, BAI-12)
- [x] Cada limiar dispara uma vez só, mesmo se a vida oscilar em volta dele; um golpe que atravessa os dois limiares vai direto para a fase 3 com um único roar (BAI-06)
- [x] Postura: leve de 10 → −10; forte de 18 → −36; nunca abaixo de 0 (BAI-07)
- [x] Postura em 0 → `stagger` por 1200 ms (1199 ainda, 1200 sai) e depois volta a 100 (BAI-08)
- [x] Regeneração: 1999 ms sem golpe não regenera; a partir de 2000 ms, +15/s até 100 (BAI-09)
- [x] Golpe leve com postura > 0 não muda o estado; golpe forte nunca gera ragdoll (não existe estado de ragdoll no chefe) (BAI-10, BAI-14)
- [x] Edge: em `stagger`, cruzar um limiar encerra o stagger e começa o roar; morrer no roar ou no stagger emite um único `died`
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(core): add boss brain with phases and poise`

---

### T5: Ataques do chefe

**What**: `BossAI` com o ciclo por fase, preparo, investida, salto e rajada, e interrupção.
**Where**: `src/core/bossAI.ts`
**Depends on**: T4
**Reuses**: estilo de `src/core/enemyAI.ts`
**Requirement**: BAT-01, BAT-02, BAT-04, BAT-05, BAT-09, BAT-10, BAT-11, BAI-02, BAI-03, BAI-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Ciclo: fase 1 investida → salto → investida; fase 2 investida → rajada → salto; fase 3 rajada → investida → salto → investida; ao mudar de fase recomeça do primeiro (BAI-02)
- [x] Preparos na fase 1/2/3: investida 600/510/420, salto 500/425/350, rajada 700/595/490 ms (limite exato: ataque não começa 1 ms antes) (BAT-01, BAT-02, BAT-04, BAI-03)
- [x] Todo preparo ≥ 350 ms em todas as fases (BAT-05)
- [x] Descanso depois de cada ataque: 900/700/500 ms por fase (BAI-11)
- [x] Investida: `vx = ±320` na direção do player no fim do preparo; para em 360 px (somados por dt) ou quando `blocked`; `hitboxOn` só ao começar o movimento e `hitboxOff` ao parar (BAT-01, BAT-09); player no mesmo x → direção para onde o chefe olha (edge)
- [x] Salto: `leap.toX` = x do player no fim do preparo; `progress` 0 → 1 em 700 ms; `landed` emitido uma vez ao terminar (BAT-02, BAT-10)
- [x] Rajada: `fire` emitido `volleyCount` vezes, a cada 150 ms, com `speed` do spec e `dir` para o lado do player (BAT-04)
- [x] `state`/`attack` no output: `windup` + ataque durante o preparo (BAT-11)
- [x] Sem `canAct`: emite `hitboxOff` se havia hitbox aberta, zera `vx`, cancela o ataque e não o retoma (BAI-05)
- [x] Gate check passes: `npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(core): add boss attack patterns`

---

### T6: Rodada de chefe no run

**What**: `isBossRound`, onda de chefe no `WaveSpawner` (`kind: 'boss'`), `farthestPoint`, `kind` no comando `spawn` do `Run` e `firstRound` opcional.
**Where**: `src/core/waves.ts`
**Depends on**: T5
**Reuses**: `WaveSpawner`, `Run`
**Requirement**: BOSS-01, BOSS-02, BOSS-03, BOSS-04, BOSS-05, BOSS-07

> Toca também `src/core/run.ts`.

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Rodadas 5, 10, 15: onda de tamanho 1 com uma ordem `kind: 'boss'`; rodadas 4, 6, 9: `min(3 + (r − 1), 12)` inimigos `kind: 'enemy'` e nenhum chefe (BOSS-01, BOSS-02)
- [x] `farthestPoint([{x:100},{x:900}], 200) === 1`; `farthestPoint([{x:100},{x:900}], 800) === 0`; empate → menor índice; um ponto só → 0 (BOSS-03 + edge)
- [x] O comando `spawn` do `Run` carrega `kind`; morte do chefe → `kills` +1 e `intermission` (BOSS-04, BOSS-07)
- [x] Chefe e player morrem antes do mesmo `update` → `gameOver` (BOSS-05)
- [x] `new Run(..., { firstRound: 5 })` começa a run na rodada 5; sem a opção, na 1 (testes da F1 continuam passando)
- [x] Gate check passes: `npm run build && npm test`

**Tests**: unit
**Gate**: build

**Commit**: `feat(core): add boss rounds to waves and run`

---

### T7: Arte do chefe, projétil e onda

**What**: Grades do chefe (idle, windup-charge, charge, windup-leap, leap, windup-volley, volley, roar, stagger, dead), do projétil e da onda; `TECELA_COLOR_MAP`; registro das texturas; teste de dados do BAT-07.
**Where**: `src/game/art/sprites/boss.ts`
**Depends on**: None
**Reuses**: pipeline de `src/game/art/` (AD-002), `parseSheet`, `PALETTE`
**Requirement**: BTIER-06, BAT-07, BAT-05

> Toca também `src/game/art/index.ts` (registro), `src/game/textures.ts` (chaves) e `tests/game/art.test.ts`.

**Tools**:

- MCP: NONE
- Skill: `phaser-gamedev` (se precisar de referência de animação)

**Done when**:

- [x] Todas as grades novas passam no `parseSheet` com a paleta; frame do chefe maior que o do inimigo; frames de preparo distintos dos de idle (BAT-05)
- [x] `TECELA_COLOR_MAP` só usa cores da paleta e muda ao menos 3 cores em relação ao Oni (BTIER-06)
- [x] Teste confere `20 < PLAYER_MOVE.jumpSpeed² / (2 × PLAYER_MOVE.gravity)` (49 px) (BAT-07)
- [x] Gate check passes: `npm run build && npm test`

**Tests**: unit
**Gate**: build

**Commit**: `feat(art): add boss, projectile and shockwave sprites`

---

### T8: Chefe no jogo: spawn, entrada, investida e salto

**What**: `Boss.ts` (Hittable, corpo 40×56, BossBrain + BossAI, investida, salto roteirizado, hitbox de pouso, impulso do rugido, contato sem dano); a cena faz o spawn por `kind` com `farthestPoint`, aceita `?debug&round=N` e põe `boss` no snapshot; cenário `boss.smoke.mjs` (parte 1).
**Where**: `src/game/Boss.ts`
**Depends on**: None
**Reuses**: `AttackHitbox`, `tagBody`, `bossSpecFor`, `BossBrain`, `BossAI`, textures do T7
**Requirement**: BOSS-01, BOSS-03, BOSS-06, BOSS-08, BAT-01, BAT-02, BAT-05, BAT-08, BAT-09, BAT-10, BAT-11, BAT-13, BAI-04, BAI-13, BHUD-04

> Toca também `src/scenes/TestScene.ts`, `src/game/debugApi.ts`, `src/game/Player.ts` (impulso) e `scripts/smoke/boss.smoke.mjs`.

**Tools**:

- MCP: `context7` (Phaser/Matter, se precisar)
- Skill: `phaser-gamedev` (corpos Matter cinemáticos e sensores)

**Done when**:

- [x] `boss.smoke.mjs` (`?debug&seed=1&round=5`):
  - [x] ao começar há exatamente 1 chefe e 0 inimigos comuns; `boss.name === 'Oni do Portão'`, `maxHp === 600` (BOSS-01, BHUD-04)
  - [x] o chefe nasce no ponto `E` mais distante do player (BOSS-03)
  - [x] nos primeiros 1500 ms o `x` não muda e golpes de teste não tiram hp (BOSS-06, BOSS-08)
  - [x] o primeiro ataque passa por `state: 'windup'`, `attack: 'charge'` por ≥ 600 ms antes de o `x` começar a mudar (BAT-01, BAT-05, BAT-11)
  - [x] parado encostado no chefe fora de ataque, o player não perde hp (BAT-08)
  - [x] com golpes de teste até cruzar 66%, `state: 'roar'`, golpes no roar não tiram hp e o player é empurrado para longe (BAI-04, BAI-13)
- [x] O snapshot tem `boss: { hp, maxHp, phase, state, attack, poise, archetype, name }` lido do chefe vivo, e `boss: null` sem chefe (BHUD-04)
- [x] Gate check passes: `npm run build && npm test && npm run smoke`

**Tests**: smoke
**Gate**: full

**Commit**: `feat(game): add boss entity with intro, charge and leap`

---

### T9: Projéteis, ondas de choque e limpeza

**What**: `Projectile.ts` (sensor sem gravidade movido pelo `Mover`, acerta o player, some na parede, no player ou ao expirar); a rajada e as ondas do pouso usam essa classe; `startRun` remove chefe e projéteis; `snapshot().projectiles`; cenário ampliado.
**Where**: `src/game/Projectile.ts`
**Depends on**: T8
**Reuses**: `Mover`, `canDamage`, `tagBody`, `routeContact`
**Requirement**: BAT-03, BAT-04, BAT-06, BAT-12, BTIER-05, BTIER-07

> Toca também `src/game/Boss.ts`, `src/scenes/TestScene.ts`, `src/game/debugApi.ts` e `scripts/smoke/boss.smoke.mjs`.

**Tools**:

- MCP: NONE
- Skill: `phaser-gamedev`

**Done when**:

- [x] Smoke: depois de um pouso aparecem 2 ondas com `dir` opostos, cada uma com 20 px de altura, e elas somem ao bater na parede ou em 600 px (BAT-03, BAT-06, BAT-12)
- [x] Smoke: numa rajada da fase 2 saem 3 projéteis a 260 px/s, com 150 ms entre eles (±1 frame) (BAT-04)
- [x] Smoke com `?round=15` (tier 3, Tecelã): a rajada tem 5 projéteis a 325 px/s (BTIER-05, BTIER-07)
- [x] Smoke: um projétil que acerta o player some e tira o dano do spec (10 no tier 1) (BAT-06)
- [x] Smoke: J após o game over com o chefe vivo e projéteis em voo → 0 projéteis e um chefe novo (zerado, não o antigo em pleno combate) na nova run (edge; `?round=5` do debug sempre recomeça numa rodada de chefe, então "0 chefe" não é observável fora do reinício em si - o que `startRun` garante é remover a instância antiga)
- [x] Gate check passes: `npm run build && npm test && npm run smoke`

**Tests**: smoke
**Gate**: full

**Commit**: `feat(game): add boss projectiles and shockwaves`

---

### T10: Barra do chefe, vitória e cura

**What**: `Hud` com a barra do chefe (400 px, nome, marcas em 66%/33%), faixas `Chefe: <nome>` e `Chefe derrotado!`; vitória com hitstop de 250 ms, tremida, fumaça, evento `bossDefeatedFx` e cura de 30%; teste de paleta; cenário ampliado.
**Where**: `src/game/Hud.ts`
**Depends on**: T9
**Reuses**: `banner`, `css()`, `uiLayer`, `Health.heal`, `Fx.curseSmoke`, `Fx.shake`, `Hitstop`
**Requirement**: BHUD-01, BHUD-02, BHUD-03, BHUD-05, BHUD-06, BHUD-07, BWIN-01, BWIN-02, BWIN-03, BOSS-04, BOSS-07

> Toca também `src/scenes/TestScene.ts`, `src/game/debugApi.ts`, `tests/game/art.test.ts` e `scripts/smoke/boss.smoke.mjs`.

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Smoke: ao nascer, `banner === 'Chefe: Oni do Portão'` por 1500 ms (visível em 1400, oculto em 1600) (BHUD-05)
- [x] Smoke: `hud.bossBar.visible`, `name`, largura total 400 e marcas em 264 e 132 px; `fillWidth === 400 × hp / maxHp` (±1) depois de golpes (BHUD-01, BHUD-02)
- [x] Smoke: ao derrotar o chefe (golpes de teste):
  - [x] a barra some e `banner === 'Chefe derrotado!'` por 2000 ms (BHUD-03)
  - [x] `kills` +1 e `run.state === 'intermission'` (BOSS-04, BOSS-07)
  - [x] o player cura `round(0.3 × maxHp)` com teto: 30 de 100; com hp 90, vai a 100 (BWIN-01)
  - [x] um único `bossDefeatedFx` em `events` (BWIN-03)
  - [x] o `step` imediatamente seguinte fica congelado por 250 ms (medido pelo `x` de um projétil, ou por um contador de frames do hitstop no snapshot) (BWIN-02)
- [x] `hud.bossBarIgnoredByMain === true` com checagem real (BHUD-07)
- [x] `tests/game/art.test.ts` confere que as constantes de cor da barra estão na paleta (BHUD-06)
- [x] Gate check passes: `npm run build && npm test && npm run smoke`

**Tests**: smoke
**Gate**: full

**Commit**: `feat(hud): add boss bar, defeat effects and heal`

---

### T11: Correções da rodada 1 do Verifier

**What**: Cenários que discriminam os 3 mutantes sobreviventes e correção do bug real achado no caminho: depois de um pouso, o chefe afundava no chão (o par criado enquanto o corpo era sensor continuava sensor), e as ondas nasciam fora da sala.
**Where**: `src/game/Boss.ts`
**Depends on**: None
**Reuses**: `Filters`, `applyFilter`, `groundTopBelow`
**Requirement**: BOSS-08, BWIN-01, BAT-06, BAT-03

> Toca também `src/core/collision.ts` (`bossAirborne`), `src/game/physics.ts` (remove `setSensor` órfão), `src/game/Projectile.ts` (`traveled`), `src/game/Player.ts` (`debugHurt`), `src/game/debugApi.ts`, `src/scenes/TestScene.ts` (tecla 4, evento `bossHitAccepted`, `boss.y`, `traveled`), `scripts/smoke/boss.smoke.mjs`, `scripts/smoke/boss-victory.smoke.mjs` e `scripts/smoke/run.mjs` (filtro por nome).

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] No salto, o chefe troca o filtro de colisão (`bossAirborne`) em vez de virar sensor; o pouso ancora no topo real do chão; o smoke exige `boss.y < 544` em todo passo
- [x] Intro: o chefe recusa o golpe de teste (`bossHitAccepted` ausente) (BOSS-08)
- [x] Vitória: a tecla 4 fere o player antes do golpe fatal e a cura é conferida abaixo do teto (BWIN-01)
- [x] Parede: a onda que vai para a parede próxima some encostada nela com `traveled < 560` (BAT-06)
- [x] Gate check passes: `npm run build && npm test && npm run smoke`

**Tests**: smoke
**Gate**: full

**Commit**: `fix(game): keep boss on the floor after leaps and harden boss scenarios`

---

### T12: Pouso sempre no nível da partida

**What**: A sonda do pouso começa nos pés do chefe, então ele nunca pousa numa plataforma acima, mesmo com o player embaixo dela (edge case novo da spec); o smoke confere o pouso no piso (y 452) com o player sob a plataforma da linha 12.
**Where**: `src/game/Boss.ts`
**Depends on**: None
**Reuses**: `groundTopBelow`
**Requirement**: BAT-02 (edge case do pouso)

> Toca também `scripts/smoke/boss.smoke.mjs` e o edge case em `spec.md`.

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Com o player embaixo da plataforma, o chefe pousa com o centro em y 452 (±3)
- [x] A sonda antiga (a partir do topo do arco) pousava na plataforma e faz o smoke falhar
- [x] Gate check passes: `npm run build && npm test && npm run smoke`

**Tests**: smoke
**Gate**: full

**Commit**: `fix(game): land the boss on its takeoff floor level`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

Phase 1:  T1 ------→ T2 ------→ T3 ------→ T4 ------→ T5 ------→ T6
Phase 2:  T7
Phase 3:  T8 ------→ T9 ------→ T10
Phase 4:  T11
Phase 5:  T12
```

---

## Validation

### Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | constantes (+1 em fx) | ✅ |
| T2 | 5 funções coesas | ⚠️ OK (coeso) |
| T3 | 1 classe | ✅ |
| T4 | 1 classe | ✅ |
| T5 | 1 classe | ✅ |
| T6 | onda + run (2 arquivos) | ⚠️ Aceito: uma regra só (rodada de chefe) |
| T7 | grades + registro + teste | ⚠️ Aceito: arte coesa |
| T8 | fatia vertical | ⚠️ Aceito: merge forward |
| T9 | fatia vertical | ⚠️ Aceito: merge forward |
| T10 | fatia vertical | ⚠️ Aceito: merge forward |

### Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | início da Phase 1 | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | T2 | T2 → T3 | ✅ |
| T4 | T3 | T3 → T4 | ✅ |
| T5 | T4 | T4 → T5 | ✅ |
| T6 | T5 | T5 → T6 | ✅ |
| T7 | None | início da Phase 2 | ✅ |
| T8 | None | início da Phase 3 | ✅ |
| T9 | T8 | T8 → T9 | ✅ |
| T10 | T9 | T9 → T10 | ✅ |

### Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | tuning | unit | unit | ✅ |
| T2–T6 | `src/core` | unit | unit | ✅ |
| T7 | arte e dados | unit | unit | ✅ |
| T8–T10 | adaptadores Phaser | smoke | smoke | ✅ |
