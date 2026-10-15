# Vermelho e corpo — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/vermelho-e-corpo/spec.md`
**Design**: `.specs/features/vermelho-e-corpo/design.md`
**Plano**: `docs/plano-builds-e-habilidades.md` (linha F30 da seção 6; seções 2.1, 2.2, 2.6, 3.2, 3.3, 5.2; "Levado para a F30" da 6.1)
**Base**: F29 `fundacao-de-poder` mergeada (`statSheet`, `StatsDirector`, `Hit.band`, `hitBand`, `power.ts`,
`DamageNumbers`, `powerSnapshot.ts`, `Player.strikeMods`, `?mods=`, smoke `power`), já integrada em `feat/builds-integracao`
(`75a22b4`) com a F32 `chefes-com-afixos`, o `recorde-e-recomeco` e as regras puras das levas 1 e 2 (`data/techRule.ts`,
`core/axisRule.ts`, `core/techKit.ts`), que as tarefas reaproveitam em vez de repetir.
**Status**: Draft
**Branch**: `feat/vermelho-e-corpo` (a partir de `feat/builds-integracao`, `75a22b4`)
**Ferramentas**: nenhuma MCP. Skill só o `tlc-spec-driven`. Tarefas com arte (T22, T25, T26, T32, T45, T47, T49) usam
`tools/sprite-preview.mjs` ou `tools/hd-boards.mjs` e conferem em movimento no jogo, em HD, para os dois lados
(memória "Conferir animação em movimento"); essas rodam em Opus 5.5 ou Fable, nunca Sonnet.

Regras que valem para toda tarefa (CLAUDE.md): um commit por tarefa, só os arquivos dela (nunca `git add -A`), `npm run
gate` verde antes do commit; smoke só do que foi tocado; smoke novo com `?debug&hd=1&area=modular`; tetos de 400 linhas
efetivas por arquivo, 80 por função e complexidade 15; arquivo novo nunca entra no `.oxlintrc.json`; teste da lista de
exceções do `max-lines` não cresce (o caso novo vai para arquivo novo). **SHX-02:** a `TestScene` não é tocada por
nenhuma tarefa e termina com as 388 linhas efetivas que tem na base integrada (`75a22b4`) ou menos.
**SHX-03:** `ShopPanel.ts` só muda o `CARD_COUNT` e o texto da dica (T56), `Hud.ts`, `moves.ts` e `Player.ts` não mudam. Linha efetiva =
sem linha em branco e sem comentário, como o `max-lines` do `.oxlintrc.json`. As linhas citadas no design e aqui foram
reconferidas em `75a22b4`; cada fase reconfere as do arquivo que toca antes de começar.

**Decisões do usuário que travam tarefas** (o executor para e pergunta antes da tarefa, não durante):

| Antes de | Pergunta | Origem |
| --- | --- | --- |
| T64, T69 | Se a curva de build não fechar com os preços do plano, o ajuste é de número no `PRICING` com nova decisão, nunca no teste | design, Risks |

---

## Test Coverage Matrix

> Guidelines: `CLAUDE.md` (camadas, gate, smoke só do que foi tocado, arte só pronta depois de olhar), `.oxlintrc.json`
> (tetos e listas de exceção), `vitest.config.*`, `package.json` (`gate`, `test`, `smoke`); lições L-010 (limites nos
> dois lados), L-043 (testar o adaptador, não só a regra), L-076 (campo de debug que só repete a entrada não prova o
> efeito). Amostras: `tests/core/redOrb.test.ts`, `tests/core/shop.test.ts`, `tests/core/loadout.test.ts`,
> `tests/game/vowPanel.test.ts`, `scripts/smoke/vows.smoke.mjs`, `scripts/smoke/run-loop.smoke.mjs`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Regra pura (`src/core/**`) | unit | 1:1 com os ACs; todo edge case listado; limites nos dois lados (L-010): eixo 2/3/4 pontos e item 4/5/6; 59/60/61 px do estilhaço; 199/200/201 px do rebote; 319/320/321 px do player; 1199/1200 ms do Contido; 4 e 5 ondas em 999/1000/1001 ms; 47/48/49 px do Martelo; `axisRng` 0,59/0,60; trava na rodada exata e na anterior; piso do Kokusen nos dois lados | `tests/core/*.test.ts` (arquivo novo por sistema novo) | `npm test` |
| Números de ajuste (`src/data/**`) | unit | Tabela do VRM-03 linha a linha; toda cor nova existe na `PALETTE`; números que não mudam continuam (`hpCap` 3,0, `damageCap` 2,5, `KOKUSEN.damage` 45) | `tests/data/*.test.ts` | `npm test` |
| Arte em código (`src/game/art/**`, texturas) | unit + prancha | Testes de paleta e registro existentes verdes; prancha olhada; conferência em movimento no jogo, dois lados | `tests/game/art/**`, `docs/art/` ou `.fable-out/` | `npm test` + `tools/sprite-preview.mjs` |
| Vista testável sem motor (`src/game/ChoicePanel.ts`) | unit | Páginas, seleção e `debug()` como o molde do `VowPanel` | `tests/game/choicePanel.test.ts` | `npm test` |
| Adaptadores (`src/scenes/**`, `src/game/**`) | smoke | Efeito lido do jogo vivo pelo snapshot, lendo o motor e não o stat (L-043, L-076); refatoração com os smokes de antes iguais | `scripts/smoke/{red-axes,cursed-body,shop-axes,scale}.smoke.mjs` (novos) e os smokes de cada tarefa | `npm run smoke -- <trecho>` |
| Documentação (`README.md`, `.specs/STATE.md`) | none | build gate only | - | `npm run gate` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tarefa só com teste unitário (regra pura, dados, vista testável) | `npm run gate` |
| Full | Tarefa de adaptador, arte ou regra que muda o jogo vivo (smoke) | `npm run gate && npm run smoke -- <cada trecho da tarefa>` |
| Build | Fim de fase | `npm run gate` e os smokes do passo no design ("Smokes por passo") |

Base de testes: 3696 em 192 arquivos em `75a22b4` (gate verde em 15/10).
Nenhuma tarefa apaga teste sem mover o caso para outro arquivo; cada uma informa a nova contagem. Smokes instáveis:
`armed` (ARM-12) e timeouts sob carga: repetir isolado antes de suspeitar.

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order. Setas entre fases (anotadas "fase N") são dependências para trás, só para leitura.

### Phase 1: Passo 0 — loja dividida (refatoração, smokes iguais)

```
T1 → T2
```

### Phase 2: Passo 1 — `TechStats` (refatoração, smokes iguais)

```
T3 → T4 → T5
T4 → T6
T4 → T7
T4 → T8
T4 → T9
T5 → T10
T6 → T10
T7 → T10
T8 → T10
T9 → T10
```

### Phase 3: Passo 2 — eixos do Vermelho, regra pura I

```
T11 → T12 → T13 → T14
T15
```

### Phase 4: Passo 2 — ramo, orbe e marcas, regra pura II

```
T18 → T19
T16
T17
T20
T21
T11 → T16 (fase 3)
T11 → T20 (fase 3)
```

### Phase 5: Passo 2 — Vermelho no jogo I (eixos)

```
T22 → T25
T23 → T25
T24 → T25 → T26
T23 → T27
T24 → T27
T23 → T28
T24 → T28
T14 → T23 (fase 3)
T20 → T23 (fase 4)
T17 → T24 (fase 4)
```

### Phase 6: Passo 2 — Vermelho no jogo II (ramos, Despertares, HUD)

```
T29 → T31
T30 → T35
T32 → T33
T32 → T35
T27 → T30 (fase 5)
T24 → T32 (fase 5)
T19 → T33 (fase 4)
T21 → T34 (fase 4)
T23 → T35 (fase 5)
```

### Phase 7: Passo 3 — Corpo Amaldiçoado, regra pura

```
T36 → T40
T37
T38
T39
T41
T42
T11 → T36 (fase 3)
T18 → T39 (fase 4)
```

### Phase 8: Passo 3 — Corpo no jogo

```
T43 → T44 → T45 → T48
T43 → T46 → T47
T46 → T48 → T50
T46 → T49 → T50
T40 → T43 (fase 7)
T41 → T43 (fase 7)
T38 → T44 (fase 7)
T39 → T48 (fase 7)
T37 → T49 (fase 7)
```

### Phase 9: Passo 4 — carta com 2 eixos, regra pura

```
T51 → T53
T52 → T53 → T55
T54 → T55
T42 → T52 (fase 7)
```

### Phase 10: Passo 4 — loja e painel do ramo no jogo

```
T56 → T57 → T59
T58 → T59
T55 → T56 (fase 9)
```

### Phase 11: Passo 5 — preços, trava e inflação

```
T60 → T61 → T62 → T64
T60 → T62
T63 → T64
T55 → T60 (fase 9)
```

### Phase 12: Passo 6 — escala, por último

```
T65 → T66 → T67 → T68 → T69
```

---

## Task Breakdown

### Phase 1: Passo 0 — loja dividida (refatoração, smokes iguais)

#### T1: Elegibilidade da loja em arquivo próprio

**What**: mover `eligible`, `evolutionEligible`, `techniqueEligible`, `modifierEligible` e `recipeOf`
(`shop.ts:16-74`, menos o `weightOf`, que fica para o `drawOffers`) para `src/core/shopEligibility.ts`; o `shop.ts` importa
de lá e não reexporta; os testes que importam `eligible` só trocam o caminho.
**Where**: `src/core/shopEligibility.ts`
**Depends on**: None
**Reuses**: corpo de hoje, sem mudança de comportamento
**Requirement**: SHX-01

**Done when**:

- [x] `git diff` dos testes (`shop`, `techShop`, `evolutionShop`, `arsenal`, `build`) só muda linhas de `import` (SHX-01.2)
- [x] Smokes `shop`, `shop-progress`, `run-loop` e `evolution` verdes e iguais
- [x] Gate verde; contagem de testes igual à base

**Tests**: unit (os existentes, só com o caminho do import) + smoke
**Gate**: full
**Commit**: `refactor(core): move shop eligibility to its own module`

---

#### T2: Prévia da carta em arquivo próprio

**What**: mover `previewText`, `techniquePreview`, `factorText` e `oneDecimalComma` (`shop.ts:108-164`) para
`src/core/shopPreview.ts`; `shop.ts` fica com `Shop`, `drawOffers`, custo e vistas (211 linhas efetivas).
**Where**: `src/core/shopPreview.ts`
**Depends on**: T1
**Reuses**: corpo de hoje
**Requirement**: SHX-01

**Done when**:

- [x] `src/core/shop.ts` sem `eligible` nem `previewText` definidos ou reexportados; abaixo de 220 linhas efetivas (SHX-01.1)
- [x] Testes só com o caminho do import mudado; smokes `shop`, `shop-progress`, `run-loop` e `evolution` verdes e iguais
- [x] Gate verde; contagem de testes igual

**Tests**: unit (os existentes) + smoke
**Gate**: full
**Commit**: `refactor(core): move the shop card preview to its own module`

---

### Phase 2: Passo 1 — `TechStats` (refatoração, smokes iguais)

#### T3: `TechStats` resolvido e a geometria num lugar só

**What**: `TECH_GEOMETRY` no fim de `data/techniques.ts` com os números de hoje (Vermelho raio 96, orbe 12, sensor 6,
760 px/s, alcance 420, força 8, repulsão 4/10/80/48, anel 160; Azul 110/16/130/150/250/1400; Corte 0/60/120, 20/−25/70,
60/180/48, linha 240; Roxo = `PURPLE`); `src/core/techStats.ts` com `TechStats` e `resolveTechStats({ id, level,
damageMul, vowDamageMul, costMul })` na regra de hoje (`TECHNIQUES` × `LEVEL_FACTOR[level − 1]` × multiplicadores, custo
`− 5 × (level − 1)`), dano com `Math.round` na ordem de `loadout.ts:97`.
**Where**: `src/core/techStats.ts`
**Depends on**: None
**Reuses**: `TECHNIQUES`, `LEVEL_FACTOR`; constantes de `core/redOrb.ts:6-9`, `blueOrb.ts:4-9`, `cut.ts:21-25`, `purple.ts:2-11`, `game/tech/red.ts:22-25`, `purple.ts:12-15`, `blue.ts:12`, `techFx/redDetonation.ts:26-29`, `CutFx.ts:7-13`, `BlueOrb.ts:32-36`
**Requirement**: TST-01

**Done when**:

- [x] `tests/core/techStats.test.ts`: 5 técnicas × cada nível de hoje × multiplicadores 1 e 1,35, comparados com `toBe`
      contra `Loadout.cost`/`Loadout.damage` de hoje, os tempos de `TECHNIQUES` e as constantes dos módulos (TST-01.6)
- [x] `TECH_GEOMETRY` sem número novo (o teste compara com as constantes ainda nos módulos)
- [x] Gate verde; contagem = base + os novos (3696 + 132 = 3828)

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): resolve technique stats in one place`

---

#### T4: `Loadout.stats(id)`

**What**: `Loadout.stats(id): TechStats` com os multiplicadores do `Loadout`; `cost`, `damage` e `startCooldown`
(`loadout.ts:88-110`) passam a ler do `stats` com o mesmo número.
**Where**: `src/core/loadout.ts`
**Depends on**: T3
**Reuses**: `resolveTechStats`
**Requirement**: TST-01, TST-02

**Done when**:

- [x] `tests/core/loadout.test.ts` verde sem mudança; `techStats.test.ts` ganha o caso `loadout.stats(id)` = `resolveTechStats`
      (mais custo, recarga do `startCooldown`, não equipada no nível 1 e base fora da tabela no `damage`)
- [x] Gate verde; contagem sem perda (3828 + 18 = 3846). O `damage(id, base)` segue recebendo `base` porque o
      estilhaço, a repulsão e os tiques ainda passam base fora da tabela: lê o nível do `stats` e divide com o
      `resolveTechStats` o `scaleDamage` de `techStats.ts`

**Tests**: unit
**Gate**: quick
**Commit**: `refactor(core): read cost, damage and cooldown from the technique stats`

---

#### T5: Conjuração lê os tempos do stat

**What**: `CastMachine` troca `TECHNIQUES[id]` por `this.loadout.stats(id)` nos tempos de fase (`cast.ts:26-37`,
`:121-124`, `msFor(stats, state)`).
**Where**: `src/core/cast.ts`
**Depends on**: T4
**Reuses**: `Loadout.stats`
**Requirement**: TST-02

**Done when**:

- [x] `tests/core/cast.test.ts` verde sem mudança de número; ganha o `TST-02` (stat com `signMs` 100 e `recoverMs` 0
      via `loadout.stats`, que a tabela crua reprovaria)
- [x] Smokes `tech` e `techniques` verdes e iguais
- [x] Gate verde; contagem sem perda (3846 + 2 = 3848)

**Tests**: unit + smoke
**Gate**: full
**Commit**: `refactor(core): take cast phase times from the technique stats`

---

#### T6: Vermelho lê o stat (regra, adaptador e vista)

**What**: `RedOrbState(x, dir, config: RedOrbConfig)` no lugar das constantes (`redOrb.ts:6-9`, `:97-99`;
`RED_ORB_SPEED` exportado lido de `TECH_GEOMETRY`; `redOrbConfig(stats)` e `redGeometry(stats)` na regra, com os danos
já escalados); `game/tech/red.ts` guarda `loadout.stats('vermelho')` na soltura (sensor, sprite, força e dano);
`RedOrb.detonate(point, facing, look)` e `redDetonationBurst(scene, registry, point, look)` com
`look = { radius, rings }` (esfera = `look.radius`, anel = `shockRingRadius(look.radius)` = `radius × ringPx / radius` da tabela, em
`techFx/redLook.ts`, sem `phaser`; `TECH_GEOMETRY.vermelho.rings: 1`, que a T de anéis da Potência passa a desenhar).
**Where**: `src/core/redOrb.ts`
**Depends on**: T4
**Reuses**: `TECH_GEOMETRY.vermelho`; `redOrbFxSource.test.ts` (o `look` só traz números, cores seguem em `RED_FX_COLORS`)
**Requirement**: TST-02, TST-03, TST-04

**Done when**:

- [x] `tests/core/redOrb.test.ts` e `redOrbFxSource.test.ts` verdes (só a construção do `RedOrbState` muda nos testes);
      `redOrb.test.ts` ganha o `TST-02` (config do Nv 1, dano escalado = `Loadout.damage`, raio 119/120/121 e voo de
      um config diferente) e o `techStats.test.ts` passa a provar que o Vermelho não tem mais cópia dos números
- [x] `grep -n "96" src/game/techFx/RedOrb.ts src/game/techFx/redDetonation.ts` sem cópia do raio de dano (TST-03),
      também em `tests/game/redLook.test.ts` (anel 96 → 160, 120 → 200, 168 → 280)
- [x] Smokes `tech`, `techniques`, `red-anime` e `kokusen` verdes e iguais
- [x] Gate verde; contagem sem perda (3848 + 7 = 3855). O dano do orbe agora é o do stat da soltura (antes era
      escalado no golpe): os multiplicadores que mudarem durante os ~550 ms de voo não entram mais nesse orbe

**Tests**: unit + smoke
**Gate**: full
**Commit**: `refactor(red): size the orb and the detonation from the technique stats`

---

#### T7: Azul lê o stat

**What**: `BlueOrbState(spawn, config: BlueOrbConfig)` (`blueOrb.ts:4-9`, `:80`, `:87`; `blueOrbConfig(stats)` e
`blueGeometry(stats)` na regra, com os danos já escalados; `blueOrbSpawn` ganha a geometria opcional);
`game/tech/blue.ts` (`:12`, `:126`) guarda `loadout.stats('azul')` no nascimento (consulta de parede, nascimento, raio,
tempos e dano); halo e distorção do `BlueOrb.ts:32-36` proporcionais ao `radius` pelo `blueOrbLook(radius)` de
`techFx/blueLook.ts`, sem `phaser` (`TECH_GEOMETRY.azul.haloPx: 40` e `distortPx: 58`; 130 dá os números de hoje).
**Where**: `src/core/blueOrb.ts`
**Depends on**: T4
**Reuses**: `TECH_GEOMETRY.azul`
**Requirement**: TST-02, TST-03, TST-04

**Done when**:

- [x] Testes do Azul verdes, só a construção muda; `BlueOrb.ts` sem literal do raio 130. O `blueOrb.test.ts` ganha o
      `TST-02` (config do Nv 1, dano escalado = `Loadout.damage`, raio 159/160/161, puxada/intervalo/vida de um config
      diferente, nascimento com outra geometria), o `tests/game/blueLook.test.ts` prova 130 → 40/58, 195 → 60/87 e
      65 → 20/29, e o `techStats.test.ts` passa a provar que o Azul não tem mais cópia dos números
- [x] Smokes `tech`, `techniques` e `power` (cenário do Azul da F29) verdes e iguais
- [x] Gate verde; contagem sem perda (3855 + 7 = 3862). Como no Vermelho, o dano do tique e da implosão é o do stat do
      nascimento (antes era escalado em cada golpe): multiplicadores que mudarem nos 1400 ms de vida não entram nesse orbe

**Tests**: unit + smoke
**Gate**: full
**Commit**: `refactor(blue): read the blue orb geometry from the technique stats`

---

#### T8: Desmantelar lê o stat

**What**: `CutSchedule(config: CutConfig)` (`cut.ts:21-25`, `:72`; `cutConfig(stats)` e `cutGeometry(stats)` na regra,
com o dano já escalado; `cutAngles` ganha os ângulos opcionais e `cutLine(geometry)` dá o meio e o comprimento da
linha); `game/tech/cut.ts` (`:26`, `:52`) guarda `loadout.stats('corte')` na conjuração (tempos, retângulo, ângulos
e dano); `CutFx.cut(..., geometry)` (`:7-13`) mede a linha pelo `cutLine` do stat.
**Where**: `src/core/cut.ts`
**Depends on**: T4
**Reuses**: `TECH_GEOMETRY.corte`
**Requirement**: TST-02, TST-03, TST-04

**Done when**:

- [x] Testes do Corte verdes, só a construção muda; `CutFx.ts` sem literal de comprimento. O `cut.test.ts` ganha o
      `TST-02` (config do Nv 1, dano escalado = `Loadout.damage`, retângulo e tempos de um config diferente, ângulos
      passados) e o `TST-03` (`cutLine` da tabela = 120/240, outra geometria, queda na tabela), e o `techStats.test.ts`
      passa a provar que o Corte não tem mais cópia dos números (nem 60/180/240 na vista)
- [x] Smokes `tech` e `techniques` verdes e iguais
- [x] Gate verde; contagem sem perda (3862 + 8 = 3870). Como no Azul, o dano dos 3 cortes é o do stat da conjuração
      (antes era escalado em cada golpe): multiplicadores que mudarem nos 120 ms da agenda não entram nesses cortes

**Tests**: unit + smoke
**Gate**: full
**Commit**: `refactor(cut): read the cut geometry from the technique stats`

---

#### T9: Roxo lê o stat

**What**: `PURPLE` em `core/purple.ts` vira reexport de `TECH_GEOMETRY.roxo` (quem lê `PURPLE` é o
`tests/core/purple.test.ts`; o `tests/data/purple.test.ts` lê `TECHNIQUES.roxo`); `PurpleSphere` ganha a geometria
opcional (`PurpleFlight`, a da tabela por padrão) e `purpleGeometry(stats)`; `game/tech/purple.ts` (`:12-15`, `:53`,
`:96`) guarda `loadout.stats('roxo')` no disparo e `PurpleOrb.charge`/`flight` recebem o raio do stat.
**Where**: `src/game/tech/purple.ts`
**Depends on**: T4
**Reuses**: `TECH_GEOMETRY.roxo`
**Requirement**: TST-02, TST-03, TST-04

**Done when**:

- [x] `tests/data/purple.test.ts` verde sem mudança; o `tests/core/purple.test.ts` também, só com 2 casos novos
      (`TST-02`: voo, vida e raio de outra geometria; `purpleGeometry` com queda na tabela), e o `techStats.test.ts`
      passa a provar `PURPLE === TECH_GEOMETRY.roxo` e que adaptador e vista não têm mais cópia (nem 36 na vista)
- [x] Smokes `evolution`, `tech` e `techniques` verdes e iguais
- [x] Gate verde; contagem sem perda (3870 + 2 = 3872). Como no Azul e no Corte, o dano do Roxo é o do stat do
      disparo (antes era escalado em cada toque)

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(purple): read the purple sphere from the technique stats`

---

#### T10: Últimos leitores de `TECHNIQUES` (Divergente, recarga do HUD, câmera)

**What**: `divergent.ts:167`, `:201` usam `stats.damage.first`/`second`; `EnergyHud.ts:171`, `:176` trocam
`def.cooldownMs` por `loadout.stats(s.id).cooldownMs`; `camera.ts:84` troca o `chargeMs` de `TECHNIQUES` por
`this.s.loadout.stats(id).chargeMs`.
**Where**: `src/game/tech/divergent.ts`, `src/game/EnergyHud.ts`, `src/scenes/test/camera.ts`
**Depends on**: T5, T6, T7, T8, T9
**Reuses**: `Loadout.stats`
**Requirement**: TST-02, TST-04

**Done when**:

- [x] `grep -rnE "TECHNIQUES\[[^]]+\]\.(cost|cooldownMs|signMs|chargeMs|releaseMs|recoverMs|damage)" src/game src/scenes` vazio (TST-02);
      o `techStats.test.ts` faz a mesma varredura (também na forma `TECHNIQUES.id.campo`) em todo `src/game` e
      `src/scenes` e confere os três leitores (falha com o `camera.ts` antigo)
- [x] Smokes `tech`, `techniques`, `red-anime`, `kokusen`, `evolution` e `fight` verdes e iguais (TST-04)
- [x] `TestScene.ts` intocado (SHX-02); gate verde; contagem sem perda (3872 + 1 = 3873). O dano do Divergente
      segue lido em cada impacto (`loadout.stats('divergente').damage.first`/`second`), como antes; o kanji do HUD
      continua do `TECHNIQUES` (não é número de ajuste)

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(tech): read divergent damage, hud cooldown and camera charge from the stats`

---

### Phase 3: Passo 2 — eixos do Vermelho, regra pura I

#### T11: Tabela dos eixos, ramos e Despertares

**What**: `src/data/techAxes.ts` com os tipos (`RedAxisId`, `BodyAxisId`, `AxisItem`, `BranchId`, `AwakeningId`),
`RED_AXIS_IDS`/`BODY_AXIS_IDS` (a ordem é o desempate), `RED_AXES`, `BODY_AXES`, `RED_BRANCHES`, `RED_AWAKENINGS`,
`BODY_BRANCHES`, `BODY_AWAKENINGS`, `EMITTER`, `AXIS_NAMES` e `BRANCH_NAMES`, como no design; cada linha de eixo é uma
`AxisTable`. Tetos (3 e 5), limiares (Nv 2 e Nv 5), a fração do HP (4 % e 1 %) e o reembolso (0,3) **não** entram:
são o `TECH_RULE` de `data/techRule.ts` (leva 1).
**Where**: `src/data/techAxes.ts`
**Depends on**: None
**Reuses**: molde de `data/perks.ts`; `AxisTable` e `TECH_RULE` (`data/techRule.ts`)
**Requirement**: VRM-03, VRM-04, ESC-03

**Done when**:

- [x] `tests/data/techAxes.test.ts`: cada linha do VRM-03 em 0/1/2/3 pontos; repulsão `round(4 × toque / 30)` dá 4/5/5/6
      (VRM-04.7); `BODY_AXES` com os números do CRP-02 a CRP-07
- [x] Mesmo arquivo: nenhum eixo do Vermelho no 3 passa de 1,35 × o dano sustentado do eixo mediano, no modelo da tabela
      de Assumptions da spec (período = `max(recarga + sinal + carga, custo ÷ 8)`, alvos = `2 × raio / 96`) (ESC-03.9)
- [x] Gate verde; contagem sem perda (3873 + 28 = 3901)

**Tests**: unit
**Gate**: quick
**Commit**: `feat(data): add the red and cursed body axis tables`

---

#### T12: Estado puro dos itens com eixo

**What**: `src/core/axisBuild.ts` com `AxisBuild` (`points`, `total`, `level`, `canAdd`, `add` → `AddResult`,
`focusAxis`, `branch`, `setBranch`, `pending`, `awakened`, `announce`, `onRoundStart`, `resetItem`, `reset`).
**Where**: `src/core/axisBuild.ts`
**Depends on**: T11
**Reuses**: `TECH_RULE` (`axisCap`, `pointCap`, `branchLevel`, `awakenLevel`), `axisLevel` e `resolveBuild`
(`core/axisRule.ts`): o `add` checa o `canAdd` antes de gravar, porque a regra comum lança `RangeError` em estado inválido
**Requirement**: VRM-02, VRM-11, VRM-17, CRP-01, CRP-08, CRP-13

**Done when**:

- [x] `tests/core/axisBuild.test.ts`: eixo 2→3 aceito e 3→4 recusado sem mudar nada; item 4→5 aceito e 5→6 recusado
      (VRM-02.3); nível = 1 + pontos; pendente só no 1º Nv 2 da run, Vermelho antes do Corpo (VRM-11, CRP-08.1); Despertar
      no Nv 5 com ramo e ao escolher o ramo depois do Nv 5 (edge case); `focusAxis` com empate pela ordem e `null` no
      teto; `announce` só uma vez por rodada; `reset` limpa a fila e volta o Corpo ao Nv 1 (CRP-01, edge case do reset);
      `resetItem('vermelho')`
- [x] Gate verde; contagem sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): track axis points, branches and awakenings`

---

#### T13: Vermelho pelos eixos, com a base nova

**What**: Vermelho em `data/techniques.ts:43-56` com `cost 30` e `cooldownMs 4500`, `TECH_GEOMETRY.vermelho.rangePx 320`;
`resolveTechStats` ganha `axes: AxisBuild` e resolve o Vermelho pela tabela, sem `LEVEL_FACTOR`, preenchendo `red`
(raio, `orbTexels`, `sensorPx`, força, repulsão, estilhaço, vizinhos, anéis, bônus de hitstop, pós-imagem,
`killRefundPct`, ramo, Despertar), lendo cada linha por `axisAt`. Como ficou: `axes` é opcional na entrada (sem ele, o
Vermelho sem ponto; o `Loadout` só passa os pontos na T14); `TechStats.level` vira `number` (no Vermelho, o nível dos
eixos); `levelFactor(stats)` dá o fator de nível (1 no Vermelho) e o `scaleDamage` recebe o fator; `RED_BASE` (o `red`
sem ponto) é o que o `redGeometry` devolve sem `red`; o `red` mantém `repulse` e `ringPx` da geometria. O
`ORB_TEX` de `game/tech/red.ts` passa a `Partial` (14/16/18 entram na T22) e cai no 12 enquanto falta a textura.
**Where**: `src/core/techStats.ts`
**Depends on**: T12
**Reuses**: `RED_AXES`, `axisAt` e `killRefundPct` (`core/axisRule.ts`)
**Requirement**: VRM-01, VRM-03, VRM-09

**Done when**:

- [x] `tests/data/techAxes.test.ts`: `resolveTechStats` do Vermelho para cada eixo de 0 a 3 = tabela, com dano ×
      `damageMul` × `vowDamageMul` e sem `LEVEL_FACTOR` (VRM-03.5); sem pontos: 30/4500/320 e o resto de hoje (VRM-01)
- [x] O caso do Vermelho sai do `techStats.test.ts` (as outras 4 ficam); `tests/data/techniques.test.ts` e
      `tests/core/loadout.test.ts` com custo 30 e recarga 4500
- [x] Smokes `tech`, `techniques` e `red-anime` verdes: além dos números de custo e recarga do Vermelho, o trecho RED-10
      do `techniques.smoke.mjs` (`:111-160`) mira o alcance novo: o player para ~100 px mais à frente, a janela do alvo
      vira `dx` de ~460 a ~510 (detonação a ~358 px da ponta dos dedos, raio 96) e a espera cobre a recarga de 4500 ms;
      os comentários de 420 px e 3000 ms citam o VRM-01
- [x] Gate verde; contagem sem perda

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(red): resolve the red stats from its axes on the new base`

---

#### T14: `Loadout` com os pontos de eixo

**What**: `loadout.axes = new AxisBuild()`; `levelOf('vermelho')` e `slotsView` com o nível derivado (`level: number`);
`upgrade('vermelho')` = `axes.add('vermelho', axes.focusAxis('vermelho'))` (VRM-19); `clear(slot)` chama
`axes.resetItem('vermelho')`; `refundCooldown(slot, ms)` (corta `ms` do que resta, sem passar de 0); `lastSlot`
gravado em `startCooldown`; `reset()` zera
`axes` e `lastSlot`. Ponte temporária do debug: `equip(slot, 'vermelho', N)` vira `N − 1` pontos no eixo-foco até a
T23, para o smoke `evolution` (`tech=azul:3,vermelho:3`) seguir verde. Ajusta os tipos de `level` em
`scenes/test/snapshot.ts:235-242` e `game/debugApi.ts:383-384`. Como ficou: o `slotsView` devolve cópias
(`LoadoutSlotView`, `level: number`); equipar outra técnica por cima do Vermelho também zera os pontos; o
`techAxes.test.ts` e o `redOrb.test.ts` leem a ponte (Nv N = N − 1 pontos de Potência); e, para o typecheck, as
assinaturas de `mastery.threshold`/`registerHit` já passam a `level: number` aqui (com `null` do Nv 3 em diante, o
mesmo número de hoje no Nv 1 a 3), o que deixa para a T15 só os testes.
**Where**: `src/core/loadout.ts`
**Depends on**: T13
**Reuses**: `AxisBuild`
**Requirement**: VRM-02, VRM-07, VRM-19

**Done when**:

- [x] `tests/core/loadoutAxes.test.ts`: `levelOf` 1 a 6; `upgrade` no eixo-foco e nada com 5 pontos (VRM-19);
      `clear` na evolução zera os pontos; `refundCooldown(slot, 690)` com 2300 de recarga restante tira 690 ms e com
      500 restantes para em 0 (VRM-07);
      `reset`
- [x] `tests/core/bossReward.test.ts` (Vermelho Nv 2 recebe ponto) verde
- [x] Smokes `evolution`, `tech` e `hud` verdes (e o `record-end`, que também usa `tech=vermelho:3`)
- [x] Gate verde; contagem sem perda (3937 + 23 = 3960)

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(core): keep the red axis points in the loadout`

---

#### T15: Maestria só acumula no Nv 1 e no Nv 2

**What**: `mastery.threshold(level: number)` devolve `null` a partir do Nv 3 e `registerHit(slot, level: number, ...)`
aceita o nível derivado que o `runDirector.ts:216` passa (`mastery.ts:21-23`, `:32`). As assinaturas entraram na
T14 (o typecheck pedia); a T15 fica com os testes.
**Where**: `src/core/mastery.ts`
**Depends on**: None
**Reuses**: limiares de hoje
**Requirement**: VRM-19

**Done when**:

- [x] `tests/core/mastery.test.ts`: `threshold(1)` e `threshold(2)` de hoje; `threshold(3)`, `(4)` e `(6)` = `null`
- [x] Gate verde; contagem sem perda (3960 + 2 = 3962)

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): stop red mastery after level two`

---

### Phase 4: Passo 2 — ramo, orbe e marcas, regra pura II

#### T16: Regras puras do ramo e do Despertar do Vermelho

**What**: `src/core/redBranch.ts` com `redPlan`, `detonationMul`, `speedAfter`, `pickRebound`, `shardTargets`,
`RedField` + `pushVelocity` e `ContidoHold`, como no design.
**Where**: `src/core/redBranch.ts`
**Depends on**: T11
**Reuses**: `normalize`/`Vec2` de `core/hit.ts`; `nearestTarget`/`dist` de `core/techKit.ts` (o rebote e o estilhaço
escolhem por ele, empate pelo menor id); `RED_BRANCHES`, `RED_AWAKENINGS`
**Requirement**: VRM-08, VRM-09, VRM-12, VRM-13, VRM-14, VRM-15

**Done when**:

- [x] `tests/core/redBranch.test.ts`: estilhaço 1/2/2 vizinhos a 59/60/61 px, o mais perto primeiro, cada um uma vez
      (VRM-08); rebote só a ≤ 320 px do player (319/320/321) e a ≤ 200 px do ponto (199/200/201), fora dos atingidos
      (VRM-09, VRM-12.3); sem alvo vai ao lado oposto (VRM-12.5); 1ª detonação 1,0 e as seguintes 0,7 (VRM-12.4);
      Fliperama 3 rebotes, +15% por detonação, pct só na 3ª e parede conta como rebote (VRM-13, edge case); chefe
      primeiro conta como 1ª (edge case); `ContidoHold` voa, paira no fim, detona ao soltar e em 1199/1200 ms, nasce
      solto e voa normal (VRM-14); `RedField` 6 tiques de 200 ms em 1200 ms e empurrão de 150 px/s (VRM-15)
- [x] Gate verde; contagem sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the red branch and awakening rules`

---

#### T17: Orbe com rebote, pairar e repulsão por parâmetro

**What**: `RedOrbState.rebound(x, dir, rangePx, speed)` recria o `Mover`, zera `_detonated` e conta a detonação;
`hover()` para sem detonar; `hitIds` por detonação no rebote (toque continua 1 vez por orbe);
`repulseTargets(origin, facing, targets, damage)` (VRM-04).
**Where**: `src/core/redOrb.ts`
**Depends on**: None
**Reuses**: `Mover`
**Requirement**: VRM-04, VRM-12

**Done when**:

- [x] `tests/core/redOrbConfig.test.ts` (novo): alcance 320 encerra o voo; rebote recria o movedor e permite 2ª
      detonação no mesmo alvo; toque 1 vez por orbe; `hover` não detona; repulsão usa o dano passado
- [x] `tests/core/redOrb.test.ts` verde
- [x] Gate verde; contagem sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): let the red orb rebound, hover and take its repulse damage`

---

#### T18: Marcas novas do `Hit` e o dano com a fração do HP

**What**: `Hit` ganha `maxHpBonus?: number` (fração do comum), `hitstopBonusMs?`, `wallStun?` e `decisive?`;
`dealtDamage(hit, maxHp, kind: BodyKind)` = `hit.damage + maxHpBite(maxHp, kind, hit.maxHpBonus)` (sem bônus =
`hit.damage`; o chefe fica no teto de 1 % pelo `maxHpBite`).
**Where**: `src/core/hit.ts`
**Depends on**: None
**Reuses**: `maxHpBite` e `BodyKind` (`core/axisRule.ts`), `TECH_RULE.maxHpPct`
**Requirement**: VRM-13, VRM-15, CRP-09

**Done when**:

- [x] `tests/core/hitDealt.test.ts`: 4% no comum, 1% no chefe mesmo com `maxHpBonus` 0,04, sem bônus = `hit.damage`;
      arredondamento nos dois lados
- [x] Gate verde; contagem sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add max hp bonus and wall stun marks to hits`

---

#### T19: Cérebros usam o dano com a fração e seguram o caído

**What**: `enemyBrain.ts:80` e `bossBrain.ts:112` trocam `hit.damage` por `dealtDamage(hit, maxHp, kind)` (expressão,
sem ramo novo; no chefe antes do `scale` do Adaptativo e do ×1,5 do `stagger`); o `EnemyBrain` grava o dano resolvido
em `lastDamage` (como o `BossBrain`) e o `Enemy` ganha o getter `lastDamageTaken`, para o número de dano
(`effects.ts:48`, `combat.ts:110`, que já leem `target.lastDamageTaken ?? hit.damage`) mostrar os 4 % sem mudar;
`EnemyBrain.holdDown(ms)` em `ragdollStun` põe `timer = ms`.
**Where**: `src/core/enemyBrain.ts`
**Depends on**: T18
**Reuses**: `dealtDamage`
**Requirement**: VRM-16, VRM-13, VRM-15

**Done when**:

- [x] `tests/core/enemyBrainHold.test.ts` (novo): `holdDown(600)` em `ragdollStun` segura 599 e solta em 600; fora do
      `ragdollStun` não faz nada; acerto com `maxHpBonus` tira `damage + round(0,04 × maxHp)` no comum e 1% no chefe, e o
      `lastDamage` do comum é esse total
- [x] `oxlint`: complexidade do `EnemyBrain.receiveHit` sem subir; `enemyBrain.test.ts` e `bossBrain.test.ts` verdes
- [x] Gate verde; contagem sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): apply max hp bonuses and hold downed enemies`

---

#### T20: Parser do `axes=` e do `ramo=`

**What**: `src/core/axisParam.ts` com `parseAxesParam(raw)` e `parseBranchParam(raw)`; item, eixo ou ramo desconhecido
e nível que não é inteiro positivo somem.
**Where**: `src/core/axisParam.ts`
**Depends on**: T11
**Reuses**: `RED_AXIS_IDS`, `BODY_AXIS_IDS`
**Requirement**: VRM-10, VRM-18, CRP-14

**Done when**:

- [x] `tests/core/axisParam.test.ts`: `vermelho.potencia:3,corpo.alcance:2`; `null` e vazio dão `[]`; `xx.potencia:1`,
      `vermelho.xx:1`, `vermelho.potencia:0`, `:-1`, `:1.5` e `:` somem e o resto vale; `ramo=vermelho:a,corpo:b`;
      `ramo=vermelho:c` some
- [x] Gate verde; contagem sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): parse the axes and branch debug parameters`

---

#### T21: Marcas de custo na barra de energia

**What**: `costMarks(cost, cur, max)` puro em `core/energy.ts` (múltiplos do custo que cabem na energia atual).
**Where**: `src/core/energy.ts`
**Depends on**: None
**Reuses**: `CE.maxCap`
**Requirement**: VRM-20

**Done when**:

- [x] `tests/core/energyMarks.test.ts`: custo 30 com 29/30/59/60/90 de energia dá 0/1/1/2/3 marcas; custo 0 não gera marca
- [x] Gate verde; contagem sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): compute the energy cost marks`

---

### Phase 5: Passo 2 — Vermelho no jogo I (eixos)

#### T22: Orbe vermelho nos tamanhos 14, 16 e 18

**What**: `RED_ORB_SIZES` (`art/sprites/techFx.ts:31-49`) ganha 14, 16 e 18 com os mesmos `stops` do 12; texturas
`techOrbRed14/16/18` em `game/textures.ts:80-82` e o mapa de `art/index.ts:129-131`. Como ficou: os stops do 8 ao 18
viram a constante `RED_ORB_STOPS`; o mapa do `art/index.ts` sobe para o escopo do módulo (`RED_ORB_TEX`), porque o
`createArt` passaria das 80 linhas; o `ORB_TEX` de `game/tech/red.ts` vira `Record` completo e perde o recuo para o
12; `tools/sprite-preview.mjs` ganha `--only orb` (prancha dos 6 tamanhos e tiras da carga e da Escala).
**Where**: `src/game/art/sprites/techFx.ts`
**Depends on**: None
**Reuses**: gerador do orbe de 12
**Requirement**: VRM-05

**Done when**:

- [x] Prancha dos 4 tamanhos em `tools/sprite-preview.mjs` olhada; testes de paleta e registro verdes
- [x] Gate verde; contagem sem perda

**Tests**: unit + prancha
**Gate**: quick
**Commit**: `feat(art): draw the red orb in three larger sizes`

---

#### T23: Eixos pelo debug e no snapshot

**What**: `src/scenes/test/axisDirector.ts` (`applyAxis`, `applyDebug`, `choicePages`, `confirmBranch`, `announce`,
`onRoundStart`, `snapshot`) como campo `axes` do `BuildDirector`; `runDirector.ts:174` chama
`build.applyDebugAxes()` depois do `equipDebugTech()`; `build.snapshot()` ganha `vermelho` e `corpo` com os tipos de
`game/axisSnapshot.ts` (novo) e o literal do `tests/game/debugApi.test.ts`; sai a ponte da T14 (`equip` grava Nv 1) e
o smoke `evolution` passa a `tech=azul:3,vermelho&axes=vermelho.potencia:2`; `README.md` ganha `axes=` e `ramo=` e a
nota de que `tech=vermelho:N` não muda o nível; nasce `scripts/smoke/red-axes.smoke.mjs`. Como ficou: o
`applyDebug` compra ponto a ponto pelo `applyAxis` (por isso o `axes=` também emite `axis:`, `branchPending:` e
`awaken:`) e grava o ramo pelo mesmo caminho do `confirmBranch` (eventos `branch:<item>:<ramo>` e, no Nv 5,
`awaken:<item>`); o `announce` já mostra o banner e a câmera lenta, e a T35 só o chama da soltura; o `choicePages`
devolve o `ChoicePage` (`{ item, options }`, com os nomes dos ramos), que mora em `game/axisSnapshot.ts` junto dos
tipos do snapshot (o `ChoiceSnapshot` e o `DifficultySnapshot` entram com as tarefas que os usam); o `build.corpo`
sai do `AxisBuild` com a Fúria e a Cadência zeradas até a T43. Sem a ponte, os testes que equipavam o Vermelho no
Nv 2 ou 3 (`evolution`, `evolutionShop`, `techShop`, `redOrb`, `techAxes`) usam o `equipRed` de
`tests/core/redLevel.ts` (Nv N = N − 1 pontos de Potência), o bloco da ponte do `loadoutAxes.test.ts` passa a provar
que o `equip` grava o Nv 1, e o smoke `record-end` também troca o `tech=vermelho:3` pelo `axes=`. Teste de unidade
novo: `tests/scenes/axisDirector.test.ts` (cena falsa, `debugParam` simulado).
**Where**: `src/scenes/test/axisDirector.ts`
**Depends on**: T14, T20
**Reuses**: `debugParam` (`scenes/test/params.ts`), `parseAxesParam`, `parseBranchParam`
**Requirement**: VRM-10, VRM-11, VRM-18, CRP-14

**Done when**:

- [x] `red-axes.smoke.mjs` (cenário 1), `?debug&hd=1&area=modular&seed=1&maxAlive=3&tech=vermelho`: com
      `axes=vermelho.potencia:3,vermelho.escala:2` → `build.vermelho.level` 6, `stats.radius` 144, `stats.touch` 45;
      com `axes=vermelho.recarga:3,vermelho.conjuracao:2` → `tech.slots[0].cooldownMs` 2300 logo depois do `techCast`;
      `axes=vermelho.potencia:4` fica em 3; `ramo=vermelho:a` → `branch` `'ricochete'` (VRM-10, VRM-18)
- [x] `axes=vermelho.potencia:1` chegando ao Nv 2 emite `branchPending:vermelho` (VRM-11)
- [x] Smokes `evolution`, `boot`, `no-debug`, `red-axes` verdes (e o `record-end`); `TestScene.ts` intocado
- [x] Gate verde; contagem sem perda (4049 + 8 = 4057)

**Tests**: smoke
**Gate**: full
**Commit**: `feat(debug): set red and body axes from the url and report them`

---

#### T24: Voo do orbe em arquivo próprio (refatoração)

**What**: o voo depois do nascimento (`onTouch`, `finishDetonation`, `red.ts:105-117` e `:185-226`) vai para
`src/game/tech/redFlight.ts`, recebendo o `TechStats` copiado na soltura.
**Where**: `src/game/tech/redFlight.ts`
**Depends on**: T17
**Reuses**: corpo de hoje
**Requirement**: VRM-12 (preparo), SHX-03

**Done when**:

- [x] Smokes `tech`, `techniques`, `red-anime`, `kokusen` e `red-axes` verdes e iguais
- [x] `red.ts` abaixo de 130 linhas efetivas; gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(red): move the orb flight to its own module`

---

#### T25: Soltura e orbe pelos eixos

**What**: `red.ts` nasce o orbe com o sprite do `orbTexels` e o sensor do `sensorPx`; repulsão com o dano do VRM-04;
texturas da carga trocam a cada terço do `chargeMs` resolvido (`RedOrbState.chargeFrame` devolve 4, 8 e o `orbTexels`
no último terço, para o orbe não pular de tamanho na soltura); Conjuração 3 solta
`fx.afterimage(player)` na soltura; a entrada `red` de `techObjects` ganha `sensorPx` (`body.circleRadius`) e
`texture` (`view.texture.key`) no snapshot (`red.ts:58-62`, `debugApi.ts:391`, literal do `debugApi.test.ts`).
**Where**: `src/game/tech/red.ts`
**Depends on**: T22, T23, T24
**Reuses**: `Fx.afterimage` (`game/fx.ts:163`), `repulseTargets`
**Requirement**: VRM-04, VRM-05, VRM-06

**Done when**:

- [x] `red-axes.smoke.mjs` (cenário 2): com `axes=vermelho.escala:2` o orbe vivo tem `sensorPx` 8 e `texture`
      `tech-orb-red-16` (L-043); a esfera da detonação no `fx` cresce até 144
- [x] Sinal + carga de 390 ms lidos pelos eventos com `axes=vermelho.recarga:3,vermelho.conjuracao:2`
- [x] Pós-imagem e esferas conferidas em movimento no jogo, nos dois lados, em cada nível de Escala
- [x] Smokes `red-axes`, `tech`, `red-anime` e `fxlab` verdes; gate verde; contagem sem perda (4059 + 3 = 4062)

**Tests**: smoke
**Gate**: full
**Commit**: `feat(red): spawn the orb and charge it from the resolved axes`

---

#### T26: Anéis e hitstop da Potência

**What**: `RedOrb.detonate` desenha `rings` anéis com 40 ms entre eles (`RedOrb.ts:329-337`); a detonação leva
`hitstopBonusMs = 10 × potência` e `effects.onTechConnect` soma `HITSTOP_MS[strength] + (hit.hitstopBonusMs ?? 0)`
(o toque e o estilhaço não levam).
**Where**: `src/game/techFx/RedOrb.ts`
**Depends on**: T25
**Reuses**: `look.rings`, `Hitstop.trigger`
**Requirement**: VRM-04

**Done when**:

- [x] `red-axes.smoke.mjs`: com `axes=vermelho.potencia:3`, 4 anéis no `fx` e `hitstop.remainingMs` partindo de
      `HITSTOP_MS.heavy + 30` na detonação; o toque sem bônus
- [x] Anéis conferidos no jogo; smokes `red-axes`, `red-anime`, `fxlab` e `power` verdes; gate verde; contagem sem perda (4062)

Como ficou: os anéis saem de um tween só no mesmo Graphics (`detonateShockRings`), o i-ésimo `i × 40 ms` depois,
porque os tweens com `delay` de 80 e 120 ms não chegavam a começar; `fx.red.rings` conta os anéis que começaram a ser
desenhados. O cenário do smoke roda no `fxlab` (sala), porque os bonecos parados garantem um alvo intocado no raio da
detonação; `tools/visual-shots-fx.mjs` ganha `vermelhoEixos` e `vermelhoAneis` para a conferência em movimento.

**Tests**: smoke
**Gate**: full
**Commit**: `feat(red): add shock rings and hitstop per power point`

---

#### T27: Estilhaço da Perfuração

**What**: no `redFlight`, ao atravessar um comum, `shardTargets` acerta 1/2/2 vizinhos a 60 px com `Hit` `band:
'micro'` de `red.shard` e `techMarks('light', 'vermelho')`, pelo `effects.onTechConnect` (F29), cada um uma vez por
conjuração. É o 1º emissor `micro` do jogo: o `scripts/smoke/power-load.mjs` (`:139`) deixa de ser conferência vazia e
passa a exigir `microMs` > 0 e ≤ 60 sob a carga com Perfuração (ressalva do POW-14 na validação da F29).
**Where**: `src/game/tech/redFlight.ts`
**Depends on**: T23, T24
**Reuses**: `shardTargets`, `MicroBudget` e `DamageNumbers` (F29)
**Requirement**: VRM-08

**Done when**:

- [x] `red-axes.smoke.mjs` (cenário 3) com `axes=vermelho.perfuracao:2` e 3 inimigos juntos: `damageNumbers` com 2
      números `micro` de 9 × multiplicadores; nenhum vizinho leva 2 estilhaços na mesma conjuração
- [x] `power-load.mjs` com o comentário de "conferência vazia" trocado pela checagem real do `microMs` (> 0 e ≤ 60)
- [x] Smokes `red-axes`, `tech`, `power` e `boss-adaptativo` verdes; gate verde; contagem sem perda (4062)

Como ficou (SPEC_DEVIATION): o vizinho do estilhaço fica no caminho do orbe, e o número `micro` dele se funde com o
do toque (300 ms, vence o tipo mais forte), então o `damageNumbers` não mostra 2 números `micro` separados. O
adaptador emite `redShard:<atravessado>:<alvo>:<dano>` com o dano que o alvo levou de fato (enfileirado no toque, que
vem do passo do Matter, e emitido no `update` seguinte), e o smoke lê 2 estilhaços de 9 no 1º atravessado, nenhum
alvo repetido e o `hitstop.microMs` > 0. O `strikeRed` passa a devolver se o alvo aceitou o golpe.

**Tests**: smoke
**Gate**: full
**Commit**: `feat(red): split pierce shards into nearby enemies`

---

#### T28: Abate devolve a recarga (Recarga 3)

**What**: na soltura, o `redFlight` cria um `KillRefund(cooldownMs, red.killRefundPct)` por conjuração (leva 2,
KIT-03); cada abate por acerto do Vermelho chama `loadout.refundCooldown(slot, refund.claim())`, e só o 1º abate da
conjuração devolve (TRL-06; os seguintes dão 0).
**Where**: `src/game/tech/redFlight.ts`
**Depends on**: T23, T24
**Reuses**: `Loadout.refundCooldown`, `KillRefund` (`core/techKit.ts`)
**Requirement**: VRM-07

**Done when**:

- [x] `red-axes.smoke.mjs` com `axes=vermelho.recarga:3` e inimigo de pouco HP: `tech.slots[n].cooldownMs` cai 690 ms
      no quadro do abate; sem abate não cai; com 2 abates na mesma detonação cai 690 ms uma vez só
- [x] Smokes `red-axes` e `tech` verdes; gate verde; contagem sem perda (4062)

Como ficou: o `KillRefund` nasce na soltura (`red.ts`), um por conjuração, dentro de um `onKill` que corta a recarga
do slot da conjuração; a repulsão e o orbe recebem o mesmo `onKill`, e o `strikeRed` o chama quando o golpe aceito deixa
o alvo morto. Assim o `redFlight.ts` segue sem ler o `loadout` (teste da T24) e o abate pela repulsão também conta.

**Tests**: smoke
**Gate**: full
**Commit**: `feat(red): refund cooldown on red kills at recharge three`

---

### Phase 6: Passo 2 — Vermelho no jogo II (ramos, Despertares, HUD)

#### T29: Tecla do slot segurada chega ao Vermelho

**What**: getter `slotHeld` no `TechCaster` (`isDown` de `L`/`C` e `I`/`V` guardado dentro do `update`, como o
`framePressed`, `TechCaster.ts:55-57`, `:79-93`); `techDirector.ts:22-29` repassa ao `TechRunner.update`
(`TechRunner.ts:104-121`), que repassa ao `red.update` (`:117`).
**Where**: `src/game/TechCaster.ts`
**Depends on**: None
**Reuses**: leitura de tecla de hoje
**Requirement**: VRM-14

**Done when**:

- [x] Smokes `tech`, `techniques` e `red-axes` verdes e iguais (o valor só é lido na T31)
- [x] Gate verde; contagem sem perda (4062)

Como ficou: `TechCaster.slotHeld` guarda o `isDown` das duas teclas de cada slot dentro do `update`; o `TechRunner`
repassa ao `red.update`, que repassa ao `RedFlight.update` (lido na T31). A repulsão da soltura sai do `red.ts` para
`tech/redRepulse.ts` (mesmo comportamento) para o `red.ts` ter folga abaixo das 130 linhas efetivas da T24 (103 agora).

**Tests**: smoke
**Gate**: full
**Commit**: `feat(tech): report the held technique slot key`

---

#### T30: Ricochete e Fliperama

**What**: o `redFlight` segue o `redPlan`: Ricochete detona no 1º inimigo e rebate uma vez (`pickRebound`, 70% depois
da 1ª); Fliperama rebate até 3 vezes em qualquer alvo, +15% de velocidade por detonação e `maxHpBonus` na 3ª;
o número já sai certo pelo `lastDamageTaken` do alvo (T19), sem mudar o `effects.onTechConnect`; todo `Hit` novo leva
`techMarks(strength, 'vermelho')`.
**Where**: `src/game/tech/redFlight.ts`
**Depends on**: T27
**Reuses**: `redPlan`, `detonationMul`, `speedAfter`, `pickRebound`, `RedOrbState.rebound`
**Requirement**: VRM-09, VRM-12, VRM-13

**Done when**:

- [x] `red-axes.smoke.mjs` (cenário 4) com `ramo=vermelho:a` e 3 em fila: 2 `redDetonate`, a 2ª com 70% (VRM-12);
      sem inimigo a 200 px o orbe volta e detona no fim (VRM-12.5)
- [x] Com `ramo=vermelho:a&axes=` somando 4 pontos: 3 rebotes e o 3º número já com os 4% (VRM-13)
- [x] Smokes `red-axes`, `tech`, `boss` e `power` verdes; gate verde; contagem sem perda (4063)

Como ficou: o `RedOrbEntry` leva o `redPlan` da soltura; sem piercing o toque no comum detona (menos em quem a
detonação atual já pegou) e o `finishDetonation` rebate pelo `shouldRebound`/`pickRebound` (200 px, Fliperama com
`speedAfter`). O dano do toque e da detonação `n` passa pelo `detonationMul(n)` e leva `maxHpBonus` 0,04 na detonação
que o plano marca. O adaptador emite `redTouch:<n>:<alvo>:<dano>` e `redBlast:<n>:<alvo>:<dano>` com o dano que o alvo
levou de fato, e o smoke lê o 70% e os 4% nesses eventos (o número na tela se funde entre toques próximos, como na
T27). O `RedOrbState` ganha o getter `dir` (o rebote sem alvo volta pelo oposto). O cenário dos 3 em fila roda no
`fxlab` (bonecos parados em 232/312/392); os cenários novos moram em `scripts/smoke/red-branches.mjs`, chamado pelo
`red-axes.smoke.mjs`, para ele caber no teto de 400 linhas. O Fliperama reabre a página até 3 vezes só se a 3ª detonação
não pegar ninguém (três inimigos soltos); as 4 detonações valem em toda tentativa.

**Tests**: smoke
**Gate**: full
**Commit**: `feat(red): rebound the orb on ricochet and pinball`

---

#### T31: Contido

**What**: com `red.branch === 'contido'` e `slotHeld` na saída, o `redFlight` usa o `ContidoHold`: voa, paira no fim
dos 320 px, detona com raio × 1,4 ao soltar ou aos 1,2 s; parede e chefe com × 1,4; solta antes da saída voa normal.
**Where**: `src/game/tech/redFlight.ts`
**Depends on**: T29
**Reuses**: `ContidoHold`, `RedOrbState.hover`
**Requirement**: VRM-14

**Done when**:

- [x] `red-axes.smoke.mjs` (cenário 5) com `ramo=vermelho:b` segurando `L`: o orbe para, detona ao soltar com o raio
      × 1,4 lido no `fx`; segurando sem soltar detona aos 1,2 s; soltando antes da saída o raio é o normal (VRM-14.8)
- [x] Levar golpe com o orbe pairando não o cancela (edge case)
- [x] Smokes `red-axes` e `tech` verdes; gate verde; contagem sem perda (4065)

Como ficou: o `RedFlight` arma o `ContidoHold` no 1º quadro do voo com a tecla do slot daquele quadro (o da soltura,
porque o `red.ts` lança antes do `update`), sem tocar o `red.ts`. O `RedOrbState.update(dt, holdAtEnd)` faz o orbe
segurado pairar no 320º px em vez de detonar, e o `detonationTargets` recebe o raio (× 1,4 em toda detonação do orbe
segurado, inclusive na parede e no chefe); a vista recebe o mesmo raio. O smoke conta os 1,2 s em 72 quadros (o
`step(16)` anda um passo fixo de 1000/60 ms) e fere o player com a tecla 4 de debug durante o pairar.

**Tests**: smoke
**Gate**: full
**Commit**: `feat(red): hold the contained orb and detonate on release`

---

#### T32: Campo do Vermelho Máximo

**What**: `src/game/tech/redField.ts`: na detonação com o Despertar Vermelho Máximo, `maxHpBonus` em todo alvo e
campo de 1200 ms do mesmo raio que empurra os comuns em pé dentro dele a 150 px/s (`setPull` só neles; `null` uma vez
ao sair ou ao fim; com um orbe Azul vivo o puxão do Azul vale, edge case) e dá `chip` de
`round(3 × damageMul × vowDamageMul)` a cada 200 ms; a detonação marca `wallStun: true`; vista mínima registrada no
`FxRegistry` (anel da `RED_FX_COLORS` que esmaece).
**Where**: `src/game/tech/redField.ts`
**Depends on**: T24
**Reuses**: `RedField`, `pushVelocity`, `TechTarget.setPull` (`tech/shared.ts:18`), `Hit.band` (F29), `techMarks`
**Requirement**: VRM-15

**Done when**:

- [x] `red-axes.smoke.mjs` (cenário 6) com `ramo=vermelho:b&axes=` somando 4 pontos: `build.vermelho.awakened` true,
      números `chip` a cada 200 ms por 1200 ms, comuns em pé afastando do centro, nenhum `pull` sobrando depois do fim;
      com `tech=vermelho,azul` e o Azul vivo, o chip continua e o puxão do Azul não é desfeito
- [x] Anel conferido no jogo; smokes `red-axes`, `tech` e `power` verdes; gate verde; contagem sem perda (4065)

Como ficou: `tech/redField.ts` (`RedFieldRunner`) mora no `RedFlight`, que o anda a cada quadro mesmo sem orbe; o chip
(`loadout.damage('vermelho', 3)`, calculado na soltura no `red.ts`) vai também ao chefe, que passa a chegar ao
`red.update`. A detonação do Vermelho Máximo leva `wallStun: true` (T33) e o `maxHpBonus` pelo `redPlan`. O adaptador
emite `redField`, `redChip:<alvo>:<dano>` e `redFieldEnd`; os números `chip` de um mesmo alvo se fundem na tela (300 ms),
então o smoke conta os tiques nesses eventos (6 chips de 3 a cada 12 quadros num boneco parado do `fxlab`). O
empurrão é lido do motor: o snapshot dos inimigos ganha `pull` (o `EnemyMovement.pullView`, px/passo); o comum em pé
que entra no campo tem `pull` de 2,5 px/passo para fora e para na borda, e nenhum `pull` sobra no fim. Com o Azul vivo,
todo `pull` aponta para o Azul (fora os colados no centro dele) e o chip segue. Vista: anel `RED_FX_COLORS.ring` com
miolo `glow` que esmaece nos 1200 ms, conferido nos dois lados em `tools/visual-shots-fx.mjs` (`vermelhoCampo`).

**Tests**: smoke
**Gate**: full
**Commit**: `feat(red): leave the maximum red field after the detonation`

---

#### T33: Parede que atordoa

**What**: `src/scenes/test/wallStun.ts` (campo `wallStun` do `CombatLinks`): `EnemyDefense.enterRagdoll` marca
`enemy.wallStunArmed` com `hit.wallStun`; `combat.listenForContacts` repassa os pares a `onContacts(pairs)`, que com
normal horizontal (`|n.x| ≥ 0,7`) chama `enemy.wallStun(600)` (→ `holdDown`) e emite `wallStun:<id>`; normal vertical
desarma. A regra `wallStunFrom(normal, armed)` mora em `src/core/wallStun.ts` (puro, AD-001).
**Where**: `src/scenes/test/wallStun.ts`
**Depends on**: T32, T19
**Reuses**: `EnemyBrain.holdDown`, contatos de `combat.ts:304-310`
**Requirement**: VRM-16

**Done when**:

- [x] `tests/core/wallStun.test.ts`: normal 0,69/0,70 nos dois lados; desarmado e normal vertical não atordoam
- [x] `red-axes.smoke.mjs` (cenário 6, `modules=beco`): evento `wallStun:<id>` e o inimigo em `ragdollStun` por 600 ms
      contados do toque
- [x] `Enemy.ts` abaixo de 400 (324); smokes `red-axes`, `enemy-`, `targets` e `world-` verdes; gate verde; contagem
      sem perda (4073)

Como ficou (SPEC_DEVIATION): a normal vertical não desarma; o alvo desarma ao se levantar (`EnemyDefense.getUp`) ou no
1º atordoamento. O empurrão da detonação leva o ragdoll rente ao chão e as partes dele tocam o chão desde o 1º quadro
(medido no `beco`: 83 contatos de chão armados antes do 1º contato com a parede), então desarmar no chão impedia toda
parede. A marca mora em `EnemyShared.wallStunArmed` (gravada no `enterRagdoll` pelo `hit.wallStun`); o `Enemy` ganha
`wallStunArmed` e `wallStun(ms)` (→ `brain.holdDown`). O smoke usa a Escala 2 (raio 144 × 1,4 do orbe segurado) para o
orbe que paira a 320 px alcançar o comum que sai da boca da direita, a ~110 px da parede do fim do beco; sem o
`holdDown` o alvo fica 48 quadros no chão depois do toque em vez de 36 (o smoke pega).

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(combat): stun enemies knocked into a wall`

---

#### T34: Marcas de custo e borda do Despertar no HUD

**What**: as 2 marcas fixas do `EnergyHud` (`:68`, `:82-84`, `:154-183`) viram até `CE.maxCap / 12` marcas por
`costMarks(loadout.stats(lastSlot).cost, cur, max)`; ícone do Vermelho com borda `A` com o Despertar; o
`debugState().hud.energy.marks` lista as marcas visíveis (literal do `debugApi.test.ts`).
**Where**: `src/game/EnergyHud.ts`
**Depends on**: T21
**Reuses**: `costMarks`, `Loadout.lastSlot`
**Requirement**: VRM-17, VRM-20

**Done when**:

- [x] Smoke `hud`: com Vermelho de custo 30 e 90 de energia, 3 marcas; com o Despertar ligado, borda dourada no snapshot
- [x] `EnergyHud.ts` abaixo de 400 (206); smokes `hud`, `red-axes` e `tech` verdes; gate verde; contagem sem perda (4073)

Como ficou: as marcas seguem o `loadout.lastSlot` e, antes da 1ª conjuração, o 1º slot equipado. O snapshot
`hud.energy.marks` passa a listar só as marcas visíveis (`number[]`) e cada `icons[i]` ganha `border` (`A`/`w`, lido do
traço vivo do ícone); o literal do `debugApi.test.ts` acompanha. O `tech.smoke.mjs` trocou a checagem do TEC-12 (uma
marca por slot, a do slot 2 vazia) pela do VRM-20 (5 marcas do custo 20 do Divergente com 100 de energia), que a
supersede. O smoke `hud` confere também que, depois de conjurar o Azul (35), as marcas passam a ser as do Azul.
Conferido em `tools/visual-shots-fx.mjs` (`hudMarcas`).

**Tests**: smoke
**Gate**: full
**Commit**: `feat(hud): mark every affordable cast and the awakened border`

---

#### T35: Banner e câmera lenta do Despertar do Vermelho

**What**: `red.ts` emite `awakenCast:vermelho` no `release` com o Despertar ligado; `axisDirector.announce('vermelho',
nome)` mostra `hud.banner` e `slowMo.trigger(CAMERA_FEEL.slowScale, CAMERA_FEEL.slowMs)` só se `axes.announce`;
`runDirector.applyRunCommand('roundStart')` chama `build.axes.onRoundStart()`.
**Where**: `src/scenes/test/axisDirector.ts`
**Depends on**: T30, T32, T23
**Reuses**: `Hud.banner`, `SlowMo.trigger(0.4, 350)`
**Requirement**: VRM-17

**Done when**:

- [x] `red-axes.smoke.mjs`: 1ª soltura da rodada com o Despertar mostra o banner e `timeScale` 0,4; a 2ª não; na
      rodada seguinte de novo
- [x] Fim do passo 2: smokes `red-axes`, `tech`, `techniques`, `red-anime`, `hud`, `power` e `fxlab` verdes;
      `TestScene.ts` intocado e `Hud.ts` sem mudança (SHX-02, SHX-03)
- [x] Gate verde; contagem sem perda (4073)

Como ficou: o `red.ts` emite `awakenCast:vermelho` em toda soltura com o Despertar; o `TechDirector` chama o
`axisDirector.announce('vermelho', AWAKENING_NAMES[...])` ao ver o evento (o `AxisBuild.announce` só deixa passar a 1ª
da rodada) e o `runDirector` chama o `onRoundStart` no `roundStart`. O cenário limpa a rodada com a tecla 2 de debug e
atravessa segurando D até a rodada 2 (o mundo modular entra em `traverse`). `git diff 75a22b4` de `TestScene.ts`,
`Hud.ts`, `moves.ts` e `Player.ts`: vazio. Smokes do passo 2 também verdes: `evolution`, `record-end` e
`boss-adaptativo`.

**Tests**: smoke
**Gate**: full
**Commit**: `feat(red): announce the awakening on the first cast of a round`

---
### Phase 7: Passo 3 — Corpo Amaldiçoado, regra pura

#### T36: Regras puras do Corpo

**What**: `src/core/cursedBody.ts` com `bodyStrike(points, move)`, `widenForward(shape, px)`, `FuryCounter`,
`CadenceCounter` e `marteloTargets(point, enemies, exceptId, areaPx = 48)`.
**Where**: `src/core/cursedBody.ts`
**Depends on**: T11
**Reuses**: `BODY_AXES`, `BODY_BRANCHES`, `BODY_AWAKENINGS`; `HitboxShape` (`core/combo.ts`); tipo `MoveDef`
**Requirement**: CRP-02, CRP-03, CRP-04, CRP-05, CRP-07, CRP-08, CRP-09

**Done when**:

- [x] `tests/core/cursedBody.test.ts`: Impacto 1/1,1/1,2/1,3, Peso 1/1,2/1,4/1,6, Ritmo 1/0,92/0,85/0,78, Alcance
      0/6/10/14 por ponto; `knockdown` só com Peso ≥ 2 (1 e 2 nos dois lados) e só no `heavy`; `wallStun` só no Peso 3;
      `widenForward` mantém a borda de trás; Fúria 3/4/5% por pilha até 15/24/35%, zera na perda de HP e fica no golpe
      defendido (edge case); Cadência decisiva no 4º e no 8º, zera no golpe sem acerto e na perda de HP (CRP-08.3);
      Martelo a 47/48/49 px, fora o alvo
- [x] Gate verde; contagem sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the cursed body combat rules`

---

#### T37: Emissor das ondas

**What**: `src/core/strikeEmitter.ts` com `StrikeEmitter` (`emit`, `update`, `waves`, `reset`): 600 px/s, 1º alvo ou
todos com `pierce`, cada alvo uma vez por onda, no máximo 4 em 1000 ms de tempo de jogo.
**Where**: `src/core/strikeEmitter.ts`
**Depends on**: None
**Reuses**: padrão do `PurpleSphere` (`core/purple.ts`); `EMITTER`
**Requirement**: CRP-10, CRP-11, CRP-12

**Done when**:

- [ ] `tests/core/strikeEmitter.test.ts`: onda acaba em 80 e em 160 px; 1º alvo só, ou todos com `pierce`; alvo
      excluído não é acertado; a 4ª onda sai e a 5ª não em 1000 ms, e volta a sair em 999/1000/1001 ms (CRP-12, edge case)
- [ ] Gate verde; contagem sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the capped strike wave emitter`

---

#### T38: Recovery com escala

**What**: `MoveMachine.scaleRecovery(mul)` só na `recovery` recém-aberta com o `recoveryMs` cheio
(`moveMachine.ts:119-128`, `:159-166`), arredondado ao ms; a `whiffRecoveryMs` não escala.
**Where**: `src/core/moveMachine.ts`
**Depends on**: None
**Reuses**: troca de fase de hoje
**Requirement**: CRP-04

**Done when**:

- [ ] `tests/core/moveMachineRecovery.test.ts` (novo): 1/0,92/0,85/0,78 arredondados; startup, active e
      `whiffRecoveryMs` iguais; chamada fora da `recovery` cheia não muda nada; `mul` 1 = hoje
- [ ] `tests/core/moveMachine.test.ts` verde
- [ ] Gate verde; contagem sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): scale the strike recovery time`

---

#### T39: Golpe marcado como decisivo

**What**: `impactTier` devolve `'decisive'` para `hit.decisive` (`impactTier.ts:12-19`: o `Pick` ganha `'decisive'` e a
condição da `:17` ganha o termo), abaixo do `forced` da F29.
**Where**: `src/core/impactTier.ts`
**Depends on**: T18
**Reuses**: regra de hoje
**Requirement**: CRP-08

**Done when**:

- [ ] `tests/core/impactTier.test.ts`: `decisive: true` dá `decisive` num golpe leve; `forced` vence o `decisive`; sem a
      marca igual a hoje
- [ ] Gate verde; contagem sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): honor the decisive hit mark in the impact tier`

---

#### T40: Impacto na folha e o `StrikeMods` ampliado

**What**: `StatInput` da F29 ganha `impact` e o `meleeMul` multiplica pelo Impacto; `StrikeMods` ganha `reachPx`,
`recoveryMul` e `marks` (`Pick<Hit, 'knockdown' | 'wallStun' | 'decisive' | 'maxHpBonus'>`), com 0, 1 e `{}` por padrão.
**Where**: `src/core/statSheet.ts`
**Depends on**: T36
**Reuses**: `statSheet` (F29)
**Requirement**: CRP-02, CRP-15

**Done when**:

- [ ] `tests/core/statSheetImpact.test.ts` (novo): Impacto 0 deixa a grade da F29 igual (`toBe`); Impacto 1/2/3
      multiplica o `meleeMul` por 1,1/1,2/1,3 em cima da Força; `StrikeMods` padrão não muda o golpe
- [ ] Gate verde; contagem sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the impact axis to the stat sheet`

---

#### T41: Impacto conta pontos de força

**What**: `powerPoints` da F29 soma os pontos do Impacto.
**Where**: `src/core/power.ts`
**Depends on**: None
**Reuses**: `powerPoints` (F29)
**Requirement**: CRP-02

**Done when**:

- [ ] `tests/core/power.test.ts`: Força 5 + Impacto 3 = 8 pontos; Impacto 0 igual à F29
- [ ] Gate verde; contagem sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): count impact points as power`

---

#### T42: Corpo no catálogo e na build de lutador

**What**: `ShopEntryKind` ganha `'body'`; `BODY_SHOP_ENTRY` (`id 'corpo'`, `kind 'body'`, comum, `maxLevel 6`,
`cost { base: 12, step: 4 }`) em `GAME_SHOP_CATALOG`
(`data/shop.ts:243-248`; o `eligible` recusa `kind 'body'` até a T52); `buildOfEntry('corpo')` = `lutador` e os pontos
do Corpo somam em `lutador` (`core/build.ts`).
**Where**: `src/core/build.ts`
**Depends on**: None
**Reuses**: `buildPoints`, `buildOfEntry`
**Requirement**: CRP-01

**Done when**:

- [ ] `tests/core/build.test.ts` e `tests/data/shop.test.ts`: `corpo` em `lutador`; o catálogo do jogo tem `corpo`; a
      loja ainda não oferece o Corpo
- [ ] Gate verde; contagem sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): count the cursed body in the fighter build`

---

### Phase 8: Passo 3 — Corpo no jogo

#### T43: Diretor do Corpo e o Peso no golpe

**What**: `src/scenes/test/bodyDirector.ts` (campo `body` do `BuildDirector`, zerado no `reset`) com
`strikeMods(move, base)`; o `StatsDirector.strikeMods` passa pelo `build.body.strikeMods` (Peso no `force`,
`knockdown`/`wallStun` nas `marks`) e o `sync` passa o `impact` à folha; `axisDirector.snapshot()` preenche
`build.corpo`; nasce `scripts/smoke/cursed-body.smoke.mjs`.
**Where**: `src/scenes/test/bodyDirector.ts`
**Depends on**: T40, T41
**Reuses**: `bodyStrike`, `StatsDirector` (F29)
**Requirement**: CRP-01, CRP-02, CRP-03, CRP-14

**Done when**:

- [ ] `cursed-body.smoke.mjs`, `?debug&hd=1&area=modular&seed=1&maxAlive=1&enemyGuard=0`: com `axes=corpo.peso:2` o
      golpe forte derruba o comum (CRP-03.5) e com `peso:1` não; com `axes=corpo.impacto:3&mods=forca:5`
      `power.points` 8 e o dano do `jab` × 1,3 sobre a Força (CRP-02); `build.corpo.level` 1 sem `axes` e de volta a 1
      no `R` (CRP-01)
- [ ] Smokes `cursed-body`, `fight`, `power` e `vows` verdes; `Player.ts` e `TestScene.ts` intocados
- [ ] Gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(body): wire the cursed body weight and impact into strikes`

---

#### T44: Alcance, ritmo e marcas no golpe

**What**: `strikes.ts` guarda o `mods` do `openHitbox` num campo do `PlayerStrikes` (não do `Player`), aplica
`widenForward(shape, mods.reachPx)` e `...mods.marks` no `Hit`, e no `hitboxOff` chama
`this.p.moves.scaleRecovery(this.mods.recoveryMul)` (`strikes.ts:177-182`, `:265-289`; o `NO_MODS` ganha os campos
neutros).
**Where**: `src/game/player/strikes.ts`
**Depends on**: T43, T38
**Reuses**: `widenForward`, `MoveMachine.scaleRecovery`
**Requirement**: CRP-04, CRP-05, CRP-15, VRM-16

**Done when**:

- [ ] `cursed-body.smoke.mjs`: com `axes=corpo.alcance:3` o `jab` acerta um inimigo 14 px além do alcance de hoje e sem
      o eixo erra (CRP-05); o `jab` dura `recoveryMs − round(0,78 × recoveryMs)` a menos com `ritmo:3`, tolerância de 1
      quadro, do evento `move:jab` até `player.move` `null` (CRP-04, L-043)
- [ ] Com `axes=corpo.peso:3&modules=beco` o forte joga o comum na parede e emite `wallStun:<id>` (VRM-16)
- [ ] O Passo sombrio é gasto uma vez só por golpe (o hook roda uma vez); `oxlint` sem ramo novo no `openHitbox`
- [ ] Smokes `cursed-body`, `fight`, `defense`, `player-anim` e `kokusen` verdes; gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(player): widen strike reach and shorten recovery from the body axes`

---

#### T45: Rastro mais longo e pós-imagem do Ritmo

**What**: o `ImpactFx` soma `body.reachPx` ao `extraPx` da `impactFx.ts:160` (que serve os dois `trail`, `:162` e
`:170`) e o
`onStrikePhase` chama `this.s.build.body.onStrikePhase(name, phase)`; com Ritmo 3 a `recovery` solta `fx.afterimage`.
**Where**: `src/scenes/test/impactFx.ts`
**Depends on**: T44
**Reuses**: `CursedFx.trail(path, strength, extraPx)` (F29), `Fx.afterimage`
**Requirement**: CRP-04, CRP-05

**Done when**:

- [ ] `cursed-body.smoke.mjs`: com `alcance:3` o rastro do golpe em `fx.trails` cresce 14 px; com `ritmo:3` uma
      pós-imagem por golpe na `recovery`
- [ ] Pós-imagem conferida em movimento no jogo, dos dois lados; `oxlint` sem ramo novo no `onStrikePhase`
- [ ] Smokes `cursed-body`, `impact`, `feel` e `fight` verdes; gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(impact): lengthen the trail and echo recovery with the body axes`

---

#### T46: Fluxo e Fúria

**What**: `combat.onConnect` usa `CE.meleeGain + this.s.build.body.flowBonus` e chama
`this.s.build.onMeleeHit(hit, point, target)` (mesma linha); `bodyDirector.onMeleeHit` conta a Fúria (um por golpe);
`body.update(dt)`, chamado pelo `techDirector.ts:46`, zera Fúria e Cadência na queda de `player.hp` entre quadros de
jogo; a Fúria entra no `damage` do `strikeMods`.
**Where**: `src/scenes/test/bodyDirector.ts`
**Depends on**: T43
**Reuses**: `FuryCounter`
**Requirement**: CRP-06, CRP-07

**Done when**:

- [ ] `cursed-body.smoke.mjs`: com `fluxo:3` o ganho de energia por acerto é 6 (CRP-06); com `furia:3` 7 acertos dão
      `fury.bonus` 0,35 e o dano sobe; levar dano zera; golpe defendido sem perder HP não zera (edge case)
- [ ] Voto "Corpo de vidro" tomado na loja não zera a Fúria (edge case)
- [ ] Smokes `cursed-body`, `fight`, `vows` e `defense` verdes; gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(body): add flow energy and fury stacks`

---

#### T47: Aura da Fúria

**What**: `src/game/FuryAura.ts`: elipse na chave `a` da `PALETTE`, raio `base + k × pilhas`, presa a
`player.renderPos` (AD-019), escondida sem pilha, registrada no `FxRegistry` e destruída no `SHUTDOWN`; criada e
atualizada pelo `bodyDirector`.
**Where**: `src/game/FuryAura.ts`
**Depends on**: T46
**Reuses**: `player.renderPos`, `FxRegistry`
**Requirement**: CRP-07

**Done when**:

- [ ] `cursed-body.smoke.mjs`: aura `off` sem pilha e com raio crescente com as pilhas; `R` não deixa aura órfã
- [ ] Conferida no jogo em HD, parado e correndo, para os dois lados
- [ ] Smokes `cursed-body`, `world-restart` e `player-anim` verdes; gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(body): show the orange fury aura`

---

#### T48: Cadência e Martelo Negro

**What**: com `ramo=corpo:a`, o `bodyDirector` marca o 4º golpe seguido que acerta com `decisive: true` e dano × 1,5
pelo `strikeMods`; `onStrikePhase` zera no fim do `active` sem acerto; com o Martelo Negro o decisivo leva
`maxHpBonus` e os comuns a 48 px levam um acerto de 4% com `knockdown`, sem `tech`, pelo
`effects.onTechConnect(hit, point, target, 'golpe')`, que para isso troca o tipo do `source` de `TechId` para
`DamageSource` (`core/runSummary.ts:12`) e chama `record.addDamage(source, hit.damage)` em `effects.ts:47`; o número do decisivo já sai certo pelo `lastDamageTaken` (T19),
sem mudar o `combat.onConnect`.
**Where**: `src/scenes/test/bodyDirector.ts`
**Depends on**: T45, T46, T39
**Reuses**: `CadenceCounter`, `marteloTargets`, `Hit.decisive`
**Requirement**: CRP-08, CRP-09

**Done when**:

- [ ] `cursed-body.smoke.mjs` com `ramo=corpo:a`: o 4º golpe seguido da cadeia `jab → direto → gancho → cotovelada`
      dispara `impact:decisive` e o 3º não (CRP-08.2); a mesma cadeia sem ramo e sem Peso dá `impact:heavy` no 4º (o
      Peso 2 derrubaria e já seria decisivo pelo `impactTier`, então o smoke não usa Peso); um golpe no ar zera a
      contagem (CRP-08.3)
- [ ] Com `ramo=corpo:a&axes=` somando 4 pontos e `maxAlive=3`: o vizinho a 48 px cai e leva 4% do HP (CRP-09)
- [ ] Smokes `cursed-body`, `impact`, `fight`, `fight-integration` e `record-end` verdes; gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(body): make every fourth strike decisive with cadence`

---

#### T49: Onda do Punho

**What**: com `ramo=corpo:b`, o golpe `heavy` que acerta chama `StrikeEmitter.emit` do ponto do acerto (80 px a
600 px/s, `round(0,4 × dano)`, fora o alvo do golpe); `body.update` entrega os acertos com `band: 'micro'`, sem `tech`,
pelo `effects.onTechConnect(hit, point, target, 'golpe')` (o `source` já é `DamageSource` desde a T48: a onda soma
em `golpe` no recorde); `src/game/FistWaveFx.ts` desenha um risco por onda viva (`c`/`C`, 1 texel, `FX_DEPTH`,
`FxRegistry`).
**Where**: `src/game/FistWaveFx.ts`
**Depends on**: T46, T37
**Reuses**: `StrikeEmitter`, `effects.onTechConnect` (F29), `MicroBudget`
**Requirement**: CRP-10, CRP-12

**Done when**:

- [ ] `cursed-body.smoke.mjs` com `ramo=corpo:b&maxAlive=2`: o forte solta a onda e o 2º inimigo leva um número `micro`
      de `round(0,4 × dano)`; energia e regen iguais com e sem onda (CRP-12)
- [ ] A 5ª onda em 1000 ms não sai e o dano do golpe não muda (edge case)
- [ ] Onda conferida em movimento no jogo, dos dois lados
- [ ] Smokes `cursed-body`, `power`, `fight`, `fxlab` e `record-end` verdes; gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(body): throw the fist wave on heavy strikes`

---

#### T50: Punho que Rasga e o anúncio do Despertar do Corpo

**What**: com o Despertar Punho que Rasga a onda atravessa todos e anda 160 px, e com a Fúria no teto sai uma 2ª onda
igual 100 ms depois; no 1º decisivo (Martelo Negro) ou na 1ª onda (Punho que Rasga) da rodada,
`axisDirector.announce('corpo', nome)`.
**Where**: `src/scenes/test/bodyDirector.ts`
**Depends on**: T48, T49
**Reuses**: `StrikeEmitter` com `pierce`, `axisDirector.announce`
**Requirement**: CRP-11, CRP-13

**Done when**:

- [ ] `cursed-body.smoke.mjs` com `ramo=corpo:b&axes=` somando 4 pontos e `maxAlive=3`: a onda acerta os 2 inimigos
      atrás; com `furia:3` no teto, 2 ondas a 100 ms (CRP-11); banner e `timeScale` 0,4 na 1ª da rodada e não na 2ª
      (CRP-13)
- [ ] Fim do passo 3: smokes `cursed-body`, `fight`, `fight-integration`, `impact`, `feel`, `power` e `player-anim`
      verdes; `TestScene.ts`, `Player.ts`, `Hud.ts` e `moves.ts` intocados (SHX-02, SHX-03)
- [ ] Gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(body): pierce with the tearing fist and announce body awakenings`

---

### Phase 9: Passo 4 — carta com 2 eixos, regra pura

#### T51: Stream do eixo

**What**: `SHOP.axisSalt` em `data/tuning.ts`; `axisRngValue`, getter `axisRng` e `new Rng(seed ^ SHOP.axisSalt)` em
`core/run.ts` (`:59-69`, `:133-186`, `:304-314`), ao lado do `bossAffixRng` da F32 e com sal diferente de todos os
de hoje.
**Where**: `src/core/run.ts`
**Depends on**: None
**Reuses**: streams com seed de hoje (AD-006)
**Requirement**: CRD-06

**Done when**:

- [ ] `tests/core/shopAxes.test.ts` (novo; `run.test.ts` está na lista de exceções): mesma seed dá a mesma sequência do
      `axisRng`; sorteios no `axisRng` não deslocam o `shopRng`
- [ ] `oxlint`: complexidade do `Run.resolveStart` sem subir
- [ ] Gate verde; contagem sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the seeded axis stream`

---

#### T52: Elegibilidade do item com eixo

**What**: `axisEligible(entry, loadout, round)` em `shopEligibility.ts`: Corpo sempre dono, Vermelho só equipado,
`canAdd` em algum eixo; `eligible` passa a aceitar `kind 'body'` e o Vermelho por ela (a trava por rodada entra na T61);
a entrada do Vermelho em `data/shop.ts:149-156` vai a `maxLevel 6`.
**Where**: `src/core/shopEligibility.ts`
**Depends on**: T42
**Reuses**: `AxisBuild.canAdd`
**Requirement**: CRD-02, CRD-04

**Done when**:

- [ ] `tests/core/shopAxes.test.ts`: Vermelho com 5 pontos não é elegível (edge case); Corpo elegível sem compra;
      Vermelho fora do slot não é elegível
- [ ] Gate verde; contagem sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): make axis items eligible for the shop`

---

#### T53: As 4 cartas e o eixo-foco

**What**: `src/core/shopDraw.ts` com `focusItem(loadout)`, `drawCards(ctx)` (carta 0 = evolução, ou foco com
`axisRng < 0,6`, ou outro item dono, ou sorteio por peso; carta 1 = técnica nova com slot vazio; 2 e 3 por
`drawOffers`, uma por item) e `axesFor(item, axes, axisRng)`; `Offer.axes?`.
**Where**: `src/core/shopDraw.ts`
**Depends on**: T51, T52
**Reuses**: `drawOffers`, `focusAxis`
**Requirement**: CRD-02, CRD-03, CRD-04, CRD-07

**Done when**:

- [ ] `tests/core/shopAxes.test.ts`: evolução pronta vence (CRD-02.2); `axisRng` 0,59 dá o foco e 0,60 outro item;
      foco no teto ou travado cai para outro item (edge case); sem item upável, sorteio por peso (CRD-02.4); carta 1
      técnica nova com slot vazio (CRD-03); nunca 2 cartas do mesmo item; 2 eixos com o foco primeiro, ou 1 só
      (CRD-04); empate do foco slot 0, slot 1, Corpo; foco do Vermelho em ≥ 60% de 1000 seeds (CRD-07)
- [ ] Gate verde; contagem sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): draw four cards with the focus axis upgrade`

---

#### T54: Prévia da carta de eixo

**What**: `axisPreview(item, axes, selected, loadout)` em `shopPreview.ts`: uma linha por eixo com o nome, o valor
resolvido atual e o próximo, sem espaço em volta da seta e com `›` na escolhida (`›Escala 120→144` / ` Potência
35→40`), cada linha com no máximo 20 caracteres; 3ª linha `+ ramo` ou `+ Despertar` quando a compra leva o item ao Nv 2
ou ao Nv 5; as outras quatro técnicas seguem a prévia de hoje (`Dano ×a → ×b`, CRD-10).
**Where**: `src/core/shopPreview.ts`
**Depends on**: None
**Reuses**: `AXIS_NAMES`, `Loadout.stats`
**Requirement**: CRD-05, CRD-10

**Done when**:

- [ ] `tests/core/shopAxes.test.ts`: texto das duas linhas com `›` na escolhida; toda linha de todo eixo dos dois itens
      em 0, 1 e 2 pontos com até 20 caracteres; `+ ramo` só no 1º ponto e `+ Despertar` só no 4º; carta do Azul igual a
      hoje (CRD-10)
- [ ] Gate verde; contagem sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): preview both axes on the upgrade card`

---

#### T55: Loja com escolha de eixo

**What**: `Shop` ganha `axisRng?` (8º parâmetro), `drawFresh` chama `drawCards`, `axisChoice` por carta,
`chooseAxis(delta)`, `buy` chama `ctx.applyAxis(item, axis)`, `OfferView` com `axes` e `selectedAxis`; o reroll
sorteia de novo e volta ao eixo-foco; o número de cartas vem de `SHOP.offers` (ainda 3 no jogo até a T56). O custo da
carta de eixo já é `axisPointPrice(pontos)` (`core/shopPricing.ts` nasce aqui só com ele e `PRICING.axisPoint`; sem
inflação nem trava até o passo 5), porque o `costOf` de hoje mandaria o `kind 'body'` ao `modifiers.cost`; o
`Shop.levelOf` do `kind 'body'` lê `loadout.axes.level('corpo')` (o `levelText` dá `Nv N/6`).
**Where**: `src/core/shop.ts`
**Depends on**: T53, T54
**Reuses**: "checar → gastar → aplicar" (SHOP-10)
**Requirement**: CRD-01, CRD-04, CRD-05, PRC-02

**Done when**:

- [ ] `tests/core/shopAxes.test.ts`: carta de eixo custa 12, 16, 20, 24 e 28 pelo ponto (PRC-02) e mostra `Nv N/6`;
      com 4 cartas, `chooseAxis(+1)` troca para o 2º eixo e a compra põe o ponto nele;
      compra sem saldo não muda nada; reroll volta ao foco (edge case)
- [ ] Os testes do Vermelho saem do `techShop.test.ts` para o `shopAxes.test.ts`; `shop.test.ts` e
      `evolutionShop.test.ts` com a garantia na carta 1
- [ ] `shop.ts` abaixo de 230 linhas efetivas; gate verde; contagem sem perda (casos movidos contam)

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): choose the axis on the upgrade card`

---

### Phase 10: Passo 4 — loja e painel do ramo no jogo

#### T56: Quatro cartas na tela

**What**: `SHOP.offers: 4` (`tuning.ts:307`); tecla `FOUR` (`buySlot` 0..3) e `A`/`D` nas 4 cartas em `game/input.ts`
(`:115-153`); `CARD_COUNT = 4` no `ShopPanel.ts:32` e a dica do `:206` em
`` `1-${CARD_COUNT} comprar · W/S eixo · R rerolar (${view.rerollCost}) · Enter continuar` `` (SHX-03, CRD-05.9).
**Where**: `src/game/ShopPanel.ts`
**Depends on**: T55
**Reuses**: layout de hoje do `ShopPanel`
**Requirement**: CRD-01, CRD-03, CRD-05, SHX-03

**Done when**:

- [ ] `tests/game/shopPanel.test.ts` e `tests/data/shop.test.ts` com 4 cartas
- [ ] Smoke `shop`: 4 ofertas distintas no snapshot (`:86-88`), a tecla `4` compra a carta 3 e a garantia de técnica
      sem slot ocupado (TSH-05, `:325-338`) passa a `offers[1]` (CRD-03); a dica do painel lida no `panel.hint`
- [ ] `git diff src/game/ShopPanel.ts` só no `CARD_COUNT` e no texto da dica
- [ ] Smokes `shop`, `shop-progress`, `evolution` e `vows` verdes; gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(shop): show four cards and buy the fourth with key 4`

---

#### T57: Compra de eixo na konbini

**What**: `shopDirector` passa `axisRng` ao `new Shop`, `applyAxis` ao `BuyContext` (→ `axisDirector.applyAxis`), lê
`moveUp`/`moveDown` (`W`/`↑`, `S`/`↓`, novos em `input.ts`) para `shop.chooseAxis`; `shopSnapshot()` e
`debugApi.ts:323-331` (`offers` na `:326`) ganham `axes` e `selectedAxis` (literal do `debugApi.test.ts`); nasce
`scripts/smoke/shop-axes.smoke.mjs`.
**Where**: `src/scenes/test/shopDirector.ts`
**Depends on**: T56
**Reuses**: `axisDirector.applyAxis`
**Requirement**: CRD-01, CRD-05

**Done when**:

- [ ] `shop-axes.smoke.mjs`, `?debug&hd=1&area=modular&fragments=200&round=4&tech=vermelho&axes=vermelho.potencia:1`:
      4 cartas; carta 0 do Vermelho com `axes` `['potencia', x]`; `S` muda `selectedAxis`; a tecla `1` compra o 2º eixo
      e o `build.vermelho.axes` mostra o ponto nele
- [ ] `shop-progress.smoke.mjs` reescrito no trecho ECN-05/08 (`:1-62`): com `tech=azul&round=2&fragments=200` procura a
      carta do Azul entre as 4 (rerolando até ela aparecer, porque a carta 0 sai do `axisRng`), `Nv 2/3`, custo 41 e
      `buy:azul:41`; o trecho da maestria segue com o Vermelho (CRD-02, CRD-10)
- [ ] Smokes `shop-axes`, `shop`, `shop-progress` e `world-run` verdes; gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(shop): buy axis points with the chosen axis`

---

#### T58: Painel do ramo

**What**: `src/game/ChoicePanel.ts` no molde do `VowPanel` (`show(page)`, `select(option)`, `hide`, `open`, `debug`),
duas cartas com o nome do ramo e a linha do Despertar; criado em `UiSetup.addHud()` como `ui.choicePanel` (AD-003).
**Where**: `src/game/ChoicePanel.ts`
**Depends on**: None
**Reuses**: `VowPanel` (camada, profundidade, cores), `BRANCH_NAMES`
**Requirement**: CRD-09

**Done when**:

- [ ] `tests/game/choicePanel.test.ts` (molde do `vowPanel.test.ts`): `show` abre com as 2 opções, `select` move o
      realce, `hide` fecha, `debug()` = `{ open, page: { item, options } | null }`
- [ ] Gate verde; contagem sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(ui): add the branch choice panel`

---

#### T59: Ramo escolhido na entrada da konbini

**What**: `shopDirector.openShop` e `updateVowPanel` passam por `openChoiceOrShop()` (`VowPanel` → `ChoicePanel` →
loja); `updateChoicePanel(input)` com `A`/`D` e `Enter` chama `axisDirector.confirmBranch`; a loja não lê entrada com
painel aberto; `statsDirector.snapshotFields()` ganha `choice: this.s.ui.choicePanel.debug()` (campo no
`GameSnapshot` e literal do `debugApi.test.ts`).
**Where**: `src/scenes/test/shopDirector.ts`
**Depends on**: T57, T58
**Reuses**: fluxo do `VowPanel` de hoje
**Requirement**: CRD-08, CRD-09

**Done when**:

- [ ] `shop-axes.smoke.mjs`: comprar o 1º ponto na loja da r2 deixa o ramo pendente e a próxima konbini abre
      `choice.open` antes da loja; `Enter` aplica o ramo e fecha; teclas da loja ignoradas com o painel aberto
- [ ] Vermelho e Corpo pendentes: 2 páginas, Vermelho primeiro; em rodada de chefe o `VowPanel` vem antes (edge case)
- [ ] Fim do passo 4: smokes `shop-axes`, `shop`, `shop-progress`, `vows`, `evolution` e `world-run` verdes;
      `TestScene.ts` intocado (SHX-02)
- [ ] Gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(shop): open the branch panel before the shop`

---

### Phase 11: Passo 5 — preços, trava e inflação

#### T60: Regra de preço

**What**: `src/core/shopPricing.ts` (nascido na T55 com o `axisPointPrice`) ganha `inflate`, `newTechPrice`,
`axisGate`, `techLevelGate` e `cardCost`; `PRICING` em `data/tuning.ts` ganha `inflationPerRound 0.06`, `newTech
20/26` e `axisGate [2, 2, 4, 4, 6]` (o `axisPoint 12/4` já veio na T55).
**Where**: `src/core/shopPricing.ts`
**Depends on**: T55 (fase 9)
**Reuses**: `arsenalCost` e o preço de nível de hoje (`base + step × nível`)
**Requirement**: PRC-01, PRC-02, PRC-03, PRC-04, PRC-06

**Done when**:

- [ ] `tests/core/shopPricing.test.ts`: 20/26; 12/16/20/24/28; inflação 1,00/1,06/1,54/2,14 nas r1/r2/r10/r20;
      Vermelho novo na r1 = 26; 1º ponto na r2 = 13; 2º ponto recusado na r1 e aceito na r2; 3º na r3/r4; 5º na r5/r6;
      Nv 2 e Nv 3 das outras na r1/r2 e r3/r4; preço de nível das outras = `base + step × nível` × inflação (PRC-06)
- [ ] Gate verde; contagem sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): price axis points with lock and inflation`

---

#### T61: Trava por rodada no catálogo

**What**: o `techGate` de `data/shop.ts:110-114` sai; as técnicas usam `techLevelGate`; o Vermelho e o Corpo usam
`axisGate` pelo próximo ponto (via `axisEligible`).
**Where**: `src/data/shop.ts`
**Depends on**: T60
**Reuses**: `axisGate`, `techLevelGate`
**Requirement**: PRC-04

**Done when**:

- [ ] `tests/core/techShop.test.ts` e `tests/data/shop.test.ts` com `techLevelGate`; `shopAxes.test.ts`: ponto 3 do
      Corpo recusado na loja da r3 e oferecido na r4
- [ ] Gate verde; contagem sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(data): lock axis points and technique levels by round`

---

#### T62: Inflação no preço de toda carta

**What**: `costOf` (`shop.ts:213-221`) vira `cardCost(entry, { modifiers, loadout, arsenal, round })`; o reroll
(`SHOP.rerollBase`/`rerollStep`) fica sem inflação; os smokes que leem preço (`shop-progress`, com o `buy:azul:41` da
T57 virando `round(41 × 1,06)` = 43 na loja da r2) passam a calcular pelo `inflate`.
**Where**: `src/core/shop.ts`
**Depends on**: T60, T61
**Reuses**: `cardCost`
**Requirement**: PRC-03, PRC-06

**Done when**:

- [ ] `tests/core/shop.test.ts`: carta de atributo na r10 custa `round(base × 1,54)`; reroll igual ao de hoje
- [ ] Smokes `shop`, `shop-progress`, `shop-axes` e `run-loop` verdes; gate verde; contagem sem perda

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(shop): inflate card prices by round`

---

#### T63: Piso de 60% do custo

**What**: `resolveTechStats` aplica `max(custo, ceil(0,6 × TECHNIQUES[id].cost))` depois do eixo, do nível e do
`costMul` (seção 2.1 do plano: os votos contam no piso; o Fluxo selado continua dando os 40 % no Nv 1).
**Where**: `src/core/techStats.ts`
**Depends on**: None
**Reuses**: `TECHNIQUES`
**Requirement**: PRC-05

**Done when**:

- [ ] `tests/core/loadoutAxes.test.ts`: Divergente Nv 3 = 12; Vermelho Eficiência 3 com Fluxo selado = 18 (PRC-05.6);
      custo acima do piso não muda; piso nos dois lados nas 5 técnicas
- [ ] `techStats.test.ts` ajustado só nos casos que o piso pega, citando o PRC-05
- [ ] Gate verde; contagem sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): floor technique cost at sixty percent`

---

#### T64: Curva de build do Vermelho

**What**: `tests/core/buildCurve.test.ts`: o Vermelho focado, comprado em cima do `expectedIncome` com os preços, a
trava e a inflação da F30, toda carta suposta à venda.
**Where**: `tests/core/buildCurve.test.ts`
**Depends on**: T62, T63
**Reuses**: `expectedIncome(round, WAVE, ECONOMY)` (`core/economy.ts:10`), `cardCost`
**Requirement**: ESC-03

**Done when**:

- [ ] Nv 2 até a loja da r3 e Nv 5 até a da r10 (ESC-03.7); se não fechar, parar e levar ao usuário (tabela do topo)
- [ ] Fim do passo 5: smokes `shop-axes`, `shop`, `shop-progress` e `run-loop` verdes
- [ ] Gate verde; contagem sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `test(core): prove the red build curve on the expected income`

---

### Phase 12: Passo 6 — escala, por último

#### T65: Dano do Kokusen com piso

**What**: `kokusenDamage(D, { forca, meleeMul, hpMul })` = `max(round(KOKUSEN.mul × meleeDamageAtLevel(D, forca) ×
meleeMul), round(KOKUSEN.damage × hpMul))` em `core/kokusen.ts`, com `D` o 2º impacto cru com o fator de nível (sem
os multiplicadores de técnica); `KOKUSEN.mul 2.5` e `KOKUSEN.mulCap 3.4` em `data/techniques.ts:135` (`damage` 45 fica como piso).
**Where**: `src/core/kokusen.ts`
**Depends on**: None
**Reuses**: `KOKUSEN`
**Requirement**: ESC-02

**Done when**:

- [ ] `tests/core/kokusenDamage.test.ts`: 45 na r1 sem build; 68 com Força 5 (`round(2,5 × 27)`); piso × `hpMul` na r9
      e na r11; golpe × 2,5 × `meleeMul` acima do piso; os dois lados do piso (edge case); `tests/data/techniques.test.ts` com `mul` 2,5 e `mulCap` 3,4 (ESC-02.6)
- [ ] Gate verde; contagem sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): scale kokusen damage with a round floor`

---

#### T66: Kokusen no stat do Divergente

**What**: `loadout.kokusenScale = { forca: 0, meleeMul: 1, hpMul: 1 }` (zerado no `reset`); `resolveTechStats` do
Divergente preenche `kokusenDamage` com `kokusenDamage(round(18 × LEVEL_FACTOR[nível − 1]), kokusenScale)`, nunca a
partir do `stats.damage.second` (que já traz `damageMul` e `vowDamageMul`: o voto contaria duas vezes).
**Where**: `src/core/techStats.ts`
**Depends on**: T65
**Reuses**: `kokusenDamage`
**Requirement**: ESC-02

**Done when**:

- [ ] `tests/core/techStats.test.ts`: Divergente com escala 1 dá 45; com `damageMul` e `vowDamageMul` em 1,35 continua
      45; com `forca: 5` dá 68; com o `meleeMul` da folha (traços `{heavy: true,
      light: false, counter: false, shadow: false}`, o Impacto já dentro, contado uma vez) sobe; as outras 4 com
      `kokusenDamage` 0
- [ ] Gate verde; contagem sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): resolve kokusen damage in the divergent stats`

---

#### T67: Kokusen escalado no jogo e a dificuldade no snapshot

**What**: o `StatsDirector.sync` grava `loadout.kokusenScale = { forca: modifiers.level('forca'), meleeMul:
sheet.meleeMul(PROP_TRAITS), hpMul }` (os traços do objeto, `statSheet.ts:21-26`, são os do Kokusen)
com o `hp` do `multipliersFor` da rodada; `divergent.ts:230`, `:238` trocam `KOKUSEN.damage` por
`loadout.stats('divergente').kokusenDamage` (o `receiveKokusen` segue × `KOKUSEN.poiseMul`); `snapshotFields()` ganha
`difficulty: { round, hpMul, damageMul }` (campo no `GameSnapshot`, literal do `debugApi.test.ts`).
**Where**: `src/scenes/test/statsDirector.ts`
**Depends on**: T66
**Reuses**: `multipliersFor(round, DIFFICULTY)` (`core/difficulty.ts:41`)
**Requirement**: ESC-02, ESC-05

**Done when**:

- [ ] Smoke `kokusen`: sem build na r1 o Kokusen tira 45 e o número é do tipo `kokusen`; com `mods=forca:5` tira 68; no
      chefe a postura cai dano × `poiseMul` (ESC-02.5)
- [ ] Snapshot com `difficulty` na r1 = `{ round: 1, hpMul: 1, damageMul: 1 }`
- [ ] Smokes `kokusen`, `boss`, `evolution` e `power` verdes; gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(kokusen): scale the kokusen with the build and the round`

---

#### T68: O inimigo cresce por rodada

**What**: `DIFFICULTY.hpPerRound 0.06` e `damagePerRound 0.05` (`tuning.ts:156`, `:158`), `core/difficulty.ts` sem
mudança; `tests/data/tuning.test.ts` (SPN-13/14) e `tests/core/difficulty.test.ts` com os números novos citando a
AD-025; `run-loop.smoke.mjs` (`:67-83`, `:113-192`) calcula HP e dano do comum por `Math.round(base × (1 + perRound × (r −
1)))` e a vida do player depois do golpe da r2 como 100 menos esse dano (87, hoje 88, `:185`); nasce
`scripts/smoke/scale.smoke.mjs`; `.specs/STATE.md` ganha a AD-025 e a AD-014 vira `superseded by AD-025`.
**Where**: `src/data/tuning.ts`
**Depends on**: T67
**Reuses**: `multipliersFor`
**Requirement**: ESC-01, ESC-04

**Done when**:

- [ ] `difficulty.test.ts`: HP do comum 64/89/96/125 nas r2/r9/r11/r19 e dano 13 na r2 (ESC-01.2); teto 3,0 depois da
      r34 (edge case); `hpCap`, `damageCap` e velocidades iguais
- [ ] `scale.smoke.mjs`, `?debug&hd=1&area=modular`: `round=9` → `enemies[].maxHp` 89; `round=11` → 96; nunca a r10
      (ESC-04.11)
- [ ] `run-loop` verde com as fórmulas (ESC-04.10); smokes `scale`, `run-loop`, `kokusen`, `boss` e `world-boss` verdes
- [ ] Ressalva R2 da F32 fechada: o `boss-invocador.smoke.mjs` compara o `maxHp` (e o dano) do comum invocado com o do
      comum da onda na mesma rodada, numa rodada acima da 1ª (antes da escala os dois eram a base e a conferência não
      discriminava)
- [ ] AD-025 no `.specs/STATE.md` (ESC-01.3); `TestScene.ts` com no máximo as 388 linhas da base (SHX-02); nenhum arquivo novo
      no `.oxlintrc.json` (SHX-03)
- [ ] Gate verde; contagem sem perda

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(difficulty): grow common enemy hp and damage per round`

---

#### T69: Curva do lutador na r19

**What**: `tests/core/buildCurve.test.ts` ganha o cenário corpo a corpo da r19 (Força 5, Manoplas Nv 3, Impacto 3, sem
Fúria) contra o HP escalado.
**Where**: `tests/core/buildCurve.test.ts`
**Depends on**: T68
**Reuses**: `statSheet`, `multipliersFor`, `expectedIncome`, `cardCost`
**Requirement**: ESC-03

**Done when**:

- [ ] `ceil(125 / dano)` do `jab` (6) e da `cotovelada` (14) com a build ≤ os da r1 sem build contra 60 de HP; as
      compras cabem em `expectedIncome(19)` (ESC-03.8); se não fechar, parar e levar ao usuário
- [ ] Gate verde; contagem sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `test(core): prove the fighter build keeps pace at round 19`

---

## Requirement Coverage

| Requirement | Tasks |
| --- | --- |
| SHX-01 | T1, T2 |
| SHX-02 | Todas (nenhuma toca a `TestScene`); conferido em T10, T35, T50, T59, T68 |
| SHX-03 | T24, T43, T50, T56, T68 |
| TST-01 | T3, T4 |
| TST-02 | T4, T5, T6, T7, T8, T9, T10 |
| TST-03 | T6, T7, T8, T9 |
| TST-04 | T6, T7, T8, T9, T10 |
| VRM-01 | T13 |
| VRM-02 | T12, T14 |
| VRM-03 | T11, T13 |
| VRM-04 | T11, T17, T25, T26 |
| VRM-05 | T22, T25 |
| VRM-06 | T25 |
| VRM-07 | T14, T28 |
| VRM-08 | T16, T27 |
| VRM-09 | T13, T16, T30 |
| VRM-10 | T20, T23 |
| VRM-11 | T12, T23 |
| VRM-12 | T16, T17, T30 |
| VRM-13 | T16, T18, T19, T30 |
| VRM-14 | T16, T29, T31 |
| VRM-15 | T16, T18, T19, T32 |
| VRM-16 | T19, T33, T44 |
| VRM-17 | T12, T34, T35 |
| VRM-18 | T20, T23 |
| VRM-19 | T14, T15 |
| VRM-20 | T21, T34 |
| CRP-01 | T12, T42, T43 |
| CRP-02 | T36, T40, T41, T43 |
| CRP-03 | T36, T43 |
| CRP-04 | T36, T38, T44, T45 |
| CRP-05 | T36, T44, T45 |
| CRP-06 | T46 |
| CRP-07 | T36, T46, T47 |
| CRP-08 | T12, T36, T39, T48 |
| CRP-09 | T18, T36, T48 |
| CRP-10 | T37, T49 |
| CRP-11 | T37, T50 |
| CRP-12 | T37, T49 |
| CRP-13 | T12, T50 |
| CRP-14 | T20, T23, T43 |
| CRP-15 | T40, T44 |
| CRD-01 | T55, T56, T57 |
| CRD-02 | T52, T53 |
| CRD-03 | T53, T56 |
| CRD-04 | T52, T53, T55 |
| CRD-05 | T54, T55, T56, T57 |
| CRD-06 | T51 |
| CRD-07 | T53 |
| CRD-08 | T59 |
| CRD-09 | T58, T59 |
| CRD-10 | T54, T57 |
| PRC-01 | T60 |
| PRC-02 | T55, T60 |
| PRC-03 | T60, T62 |
| PRC-04 | T60, T61 |
| PRC-05 | T63 |
| PRC-06 | T60, T62 |
| ESC-01 | T68 |
| ESC-02 | T65, T66, T67 |
| ESC-03 | T11, T64, T69 |
| ESC-04 | T68 |
| ESC-05 | T67 |

**Coverage:** 63 total, 63 mapeados, 0 sem tarefa.

| Edge case (spec) | Task |
| --- | --- |
| Nv 5 com o ramo pendente liga o Despertar na escolha | T12 |
| Ramo pendente some no reset da run | T12 |
| Orbe do Contido pairando e o player atingido | T31 |
| Ricochete toca o chefe primeiro | T16, T30 |
| Fliperama na parede conta como rebote | T16, T30 |
| Vermelho e Corpo pendentes: 2 páginas, Vermelho primeiro | T12, T59 |
| Item-foco no teto ou travado: carta 0 cai para outro item | T53 |
| Vermelho com 5 pontos não gera carta | T52 |
| Reroll sorteia o eixo de novo e volta ao foco | T55 |
| Fúria no teto e golpe defendido sem perder HP | T36, T46 |
| Mais de 4 ondas em 1000 ms | T37, T49 |
| Corpo de vidro não mexe na Fúria nem na Cadência | T46 |
| Piso do Kokusen acima de 2,5 × D, número do tipo Kokusen | T65, T67 |
| Comum depois da r34 fica no teto de 3,0 | T68 |

---

## Phase Execution Map

```
Phase 1 → Phase 2 → ... → Phase 12

Phase 1:   T1, T2
Phase 2:   T3, T4, T5, T6, T7, T8, T9, T10
Phase 3:   T11, T12, T13, T14, T15
Phase 4:   T16, T17, T18, T19, T20, T21
Phase 5:   T22, T23, T24, T25, T26, T27, T28
Phase 6:   T29, T30, T31, T32, T33, T34, T35
Phase 7:   T36, T37, T38, T39, T40, T41, T42
Phase 8:   T43, T44, T45, T46, T47, T48, T49, T50
Phase 9:   T51, T52, T53, T54, T55
Phase 10:  T56, T57, T58, T59
Phase 11:  T60, T61, T62, T63, T64
Phase 12:  T65, T66, T67, T68, T69
```

Ordem estritamente sequencial (a linha é a ordem de trabalho, não dependência). 69 tarefas em lotes de fases inteiras
(~7 por agente, agente novo por lote, memória "Agente novo por lote"): Fases 1+2 (10, refatoração mecânica: Sonnet
serve), Fase 3 (5), Fase 4 (6), Fase 5 (7), Fase 6 (7), Fase 7 (7), Fase 8 (8), Fases 9+10 (9), Fase 11 (5), Fase 12
(5): 10 lotes. Lotes com arte (Fases 5, 6 e 8) em Opus 5.5 ou Fable.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1, T2 | 1 módulo movido | ✅ |
| T3 | 1 módulo + o bloco de geometria que ele lê | ⚠️ coeso: o teste de equivalência precisa dos dois |
| T4, T5, T15, T17, T18, T20, T21, T38, T39, T41, T51, T54, T60, T63, T65, T66 | 1 função ou método | ✅ |
| T6, T7, T8 | 1 técnica: construtor da regra + o adaptador e a vista que o constroem | ⚠️ coeso: trocar o construtor sem o chamador quebra o typecheck |
| T9, T10 | 1 técnica / os últimos leitores | ✅ |
| T11, T12, T16, T36, T37, T53 | 1 módulo puro novo | ✅ |
| T13 | 1 resolução + a base nova que ela lê | ⚠️ coeso |
| T14 | 1 classe (`Loadout`) + o tipo do nível nos 2 leitores | ⚠️ coeso: o typecheck pede junto |
| T19 | 1 expressão nos 2 cérebros + `holdDown` | ⚠️ coeso |
| T22 | 1 tamanho de orbe em 3 registros | ⚠️ coeso: a arte só existe registrada |
| T23 | 1 diretor + a ligação mínima para o primeiro número ser lido | ⚠️ coeso (L-076) |
| T24 | 1 extração | ✅ |
| T25, T26, T27, T28, T30, T31, T32 | 1 comportamento do orbe | ✅ |
| T29 | 1 valor repassado por 3 camadas | ⚠️ coeso |
| T33 | 1 regra pura + o adaptador que a liga | ⚠️ coeso |
| T34, T35 | 1 vista / 1 anúncio | ✅ |
| T40 | 1 tipo ampliado | ✅ |
| T42 | 1 entrada de catálogo + 1 mapeamento de build | ⚠️ coeso |
| T43 | 1 diretor + o smoke que o prova | ⚠️ coeso |
| T44, T45, T46, T47, T48, T49, T50 | 1 comportamento do Corpo | ✅ |
| T52, T55, T61, T62 | 1 função / 1 classe | ✅ |
| T56 | 4 cartas: constante + tecla + dica | ⚠️ coeso: uma sem a outra deixa a loja incoerente |
| T57, T59 | 1 fluxo do diretor | ✅ |
| T58 | 1 vista | ✅ |
| T64, T69 | 1 teste | ✅ |
| T67 | 1 escrita + 1 leitura + o campo que prova | ⚠️ coeso |
| T68 | 1 número de ajuste + as provas que ele quebra (testes, `run-loop`, `scale`) + a AD | ⚠️ coeso: o número sem a prova deixa o gate vermelho |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | — | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | None | — | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T4 | T4 → T6 | ✅ Match |
| T7 | T4 | T4 → T7 | ✅ Match |
| T8 | T4 | T4 → T8 | ✅ Match |
| T9 | T4 | T4 → T9 | ✅ Match |
| T10 | T5, T6, T7, T8, T9 | T5/T6/T7/T8/T9 → T10 | ✅ Match |
| T11 | None | — | ✅ Match |
| T12 | T11 | T11 → T12 | ✅ Match |
| T13 | T12 | T12 → T13 | ✅ Match |
| T14 | T13 | T13 → T14 | ✅ Match |
| T15 | None | — | ✅ Match |
| T16 | T11 (fase 3) | T11 → T16 (fase 3) | ✅ Match |
| T17 | None | — | ✅ Match |
| T18 | None | — | ✅ Match |
| T19 | T18 | T18 → T19 | ✅ Match |
| T20 | T11 (fase 3) | T11 → T20 (fase 3) | ✅ Match |
| T21 | None | — | ✅ Match |
| T22 | None | — | ✅ Match |
| T23 | T14 (fase 3), T20 (fase 4) | T14 → T23, T20 → T23 | ✅ Match |
| T24 | T17 (fase 4) | T17 → T24 | ✅ Match |
| T25 | T22, T23, T24 | T22/T23/T24 → T25 | ✅ Match |
| T26 | T25 | T25 → T26 | ✅ Match |
| T27 | T23, T24 | T23 → T27, T24 → T27 | ✅ Match |
| T28 | T23, T24 | T23 → T28, T24 → T28 | ✅ Match |
| T29 | None | — | ✅ Match |
| T30 | T27 (fase 5) | T27 → T30 | ✅ Match |
| T31 | T29 | T29 → T31 | ✅ Match |
| T32 | T24 (fase 5) | T24 → T32 | ✅ Match |
| T33 | T32, T19 (fase 4) | T32 → T33, T19 → T33 | ✅ Match |
| T34 | T21 (fase 4) | T21 → T34 | ✅ Match |
| T35 | T30, T32, T23 (fase 5) | T30 → T35, T32 → T35, T23 → T35 | ✅ Match |
| T36 | T11 (fase 3) | T11 → T36 | ✅ Match |
| T37 | None | — | ✅ Match |
| T38 | None | — | ✅ Match |
| T39 | T18 (fase 4) | T18 → T39 | ✅ Match |
| T40 | T36 | T36 → T40 | ✅ Match |
| T41 | None | — | ✅ Match |
| T42 | None | — | ✅ Match |
| T43 | T40, T41 (fase 7) | T40 → T43, T41 → T43 | ✅ Match |
| T44 | T43, T38 (fase 7) | T43 → T44, T38 → T44 | ✅ Match |
| T45 | T44 | T44 → T45 | ✅ Match |
| T46 | T43 | T43 → T46 | ✅ Match |
| T47 | T46 | T46 → T47 | ✅ Match |
| T48 | T45, T46, T39 (fase 7) | T45 → T48, T46 → T48, T39 → T48 | ✅ Match |
| T49 | T46, T37 (fase 7) | T46 → T49, T37 → T49 | ✅ Match |
| T50 | T48, T49 | T48 → T50, T49 → T50 | ✅ Match |
| T51 | None | — | ✅ Match |
| T52 | T42 (fase 7) | T42 → T52 | ✅ Match |
| T53 | T51, T52 | T51 → T53, T52 → T53 | ✅ Match |
| T54 | None | — | ✅ Match |
| T55 | T53, T54 | T53 → T55, T54 → T55 | ✅ Match |
| T56 | T55 (fase 9) | T55 → T56 | ✅ Match |
| T57 | T56 | T56 → T57 | ✅ Match |
| T58 | None | — | ✅ Match |
| T59 | T57, T58 | T57 → T59, T58 → T59 | ✅ Match |
| T60 | T55 (fase 9) | T55 → T60 | ✅ Match |
| T61 | T60 | T60 → T61 | ✅ Match |
| T62 | T60, T61 | T60 → T62, T61 → T62 | ✅ Match |
| T63 | None | — | ✅ Match |
| T64 | T62, T63 | T62 → T64, T63 → T64 | ✅ Match |
| T65 | None | — | ✅ Match |
| T66 | T65 | T65 → T66 | ✅ Match |
| T67 | T66 | T66 → T67 | ✅ Match |
| T68 | T67 | T67 → T68 | ✅ Match |
| T69 | T68 | T68 → T69 | ✅ Match |

Nenhuma dependência aponta para fase posterior (conferido pelo `validate_tasks.py`).

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1, T2 | Regra pura (refatoração) | unit | unit + smoke | ✅ OK |
| T3, T4 | Regra pura + dados | unit | unit | ✅ OK |
| T5 | Regra pura (muda o jogo vivo) | unit | unit + smoke | ✅ OK |
| T6, T7, T8 | Regra pura + adaptador + vista | unit, smoke | unit + smoke | ✅ OK |
| T9, T10 | Adaptadores (o reexport puro do T9 é coberto pelo teste existente) | smoke | smoke | ✅ OK |
| T11, T12, T15, T16, T17, T18, T19, T20, T21 | Regra pura / dados | unit | unit | ✅ OK |
| T13, T14 | Regra pura + dados (mudam o jogo vivo) | unit | unit + smoke | ✅ OK |
| T22 | Arte | unit + prancha | unit + prancha | ✅ OK |
| T23–T32, T34, T35 | Adaptadores e vistas do motor | smoke | smoke | ✅ OK |
| T33 | Regra pura + adaptador | unit, smoke | unit + smoke | ✅ OK |
| T36–T42 | Regra pura / dados | unit | unit | ✅ OK |
| T43–T50 | Adaptadores e vistas do motor | smoke | smoke | ✅ OK |
| T51–T55 | Regra pura | unit | unit | ✅ OK |
| T56, T57, T59 | Adaptadores | smoke | smoke | ✅ OK |
| T58 | Vista testável sem motor | unit | unit | ✅ OK |
| T60, T61, T63 | Regra pura / dados | unit | unit | ✅ OK |
| T62 | Regra pura (muda o jogo vivo) | unit | unit + smoke | ✅ OK |
| T64, T69 | Teste da regra pura | unit | unit | ✅ OK |
| T65, T66 | Regra pura + dados | unit | unit | ✅ OK |
| T67 | Adaptador | smoke | smoke | ✅ OK |
| T68 | Dados + smoke + doc | unit, smoke | unit + smoke | ✅ OK |

T29 entrega o `slotHeld` antes do primeiro leitor; o smoke dela prova que o caminho de hoje não muda, e o valor novo é
medido no jogo vivo pela T31, na mesma fase (merge forward, como as T6/T7 da F29). A ponte do debug da T14
(`tech=vermelho:N` vira pontos no eixo-foco) existe só para o smoke `evolution` ficar verde até a T23, que a remove.
