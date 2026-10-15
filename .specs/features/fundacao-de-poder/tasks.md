# Fundação de poder — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/fundacao-de-poder/spec.md`
**Design**: `.specs/features/fundacao-de-poder/design.md`
**Plano**: `docs/plano-builds-e-habilidades.md` (seções 4 e 6.1)
**Status**: Draft
**Branch**: `feat/fundacao-de-poder` (a partir de `4c0efae`)
**Ferramentas**: nenhuma MCP. Skill só o `tlc-spec-driven`. A T20 (aura) usa `tools/hd-boards.mjs` e confere a chama em
movimento no jogo (memória "Conferir animação em movimento").

Regras que valem para toda tarefa (CLAUDE.md): um commit por tarefa, só os arquivos dela, `npm run gate` verde antes do
commit; smoke só do que foi tocado; smoke novo com `hd=1&area=modular`; tetos de 400 linhas efetivas por arquivo, 80
por função e complexidade 15; arquivo novo nunca entra no `.oxlintrc.json`; a `TestScene` só perde linhas (399 hoje,
393 depois da T2, 390 depois da T12, nenhuma outra tarefa soma). Linha efetiva = sem linha em branco e sem comentário,
como o `max-lines` do `.oxlintrc.json`.

---

## Test Coverage Matrix

> Guidelines: `CLAUDE.md` (camadas, gate, smoke só do que foi tocado), `.oxlintrc.json` (tetos), `vitest.config.*`,
> `package.json` (`gate`, `smoke`); lições L-010 (limites nos dois lados), L-043 (testar o adaptador, não só a regra),
> L-076 (campo de debug que só repete a entrada não prova o efeito). Amostras: `tests/core/enemyBrain.test.ts`,
> `tests/core/slide.test.ts`, `tests/game/cursedFx.test.ts`, `scripts/smoke/vows.smoke.mjs`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Regra pura (`src/core/**`) | unit | 1:1 com os ACs; todo edge case listado; limites nos dois lados (L-010: 1/2, 4/5, 7/8 pontos; 14/15 e 39/40 de dano; 300/301 ms; 60/61 ms; 12/13 números; 999/1000/1001 ms) | `tests/core/*.test.ts` (teste par por arquivo) | `npm test` |
| Números de ajuste (`src/data/**`) | unit | Toda chave de cor existe na `PALETTE`; `HITSTOP_MS` 50/90 e `kickPx` 4 intactos | `tests/data/*.test.ts` | `npm test` |
| Fx puro em `src/game/` (`cursedImpact.ts`, `CursedFx.ts`) | unit | Escala, tom e largura do rastro chegam à forma desenhada; sem `look` fica igual a hoje | `tests/game/cursedFx.test.ts` | `npm test` |
| Adaptadores (`src/scenes/**`, `src/game/**`) | smoke | Efeito lido do jogo vivo pelo snapshot (L-043, L-076); refatoração com os smokes de antes iguais | `scripts/smoke/power.smoke.mjs` (novo) e os smokes de cada tarefa | `npm run smoke -- <trecho>` |
| Documentação (`README.md`) | none | build gate only | - | `npm run gate` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tarefa só com teste unitário (regra pura, dados, fx puro) | `npm run gate` |
| Full | Tarefa de adaptador (smoke) | `npm run gate && npm run smoke -- <cada trecho da tarefa>` |
| Build | Fim de fase | `npm run gate` e os smokes da fase no design ("Smokes por passo") |

Base: 2913 testes unitários em 146 arquivos em `4c0efae`. Nenhuma tarefa apaga teste; cada uma informa a nova contagem.
Smokes instáveis: `armed` (ARM-12) e timeouts sob carga: repetir isolado antes de suspeitar.

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Um dono para os multiplicadores (refatoração, smokes iguais)

```
T1 → T2
```

### Phase 2: Faixas de acerto

```
T3 → T4 → T6 → T8
T3 → T5
T3 → T7 → T8
```

### Phase 3: Números de dano

```
T9 → T10 → T11 → T12
T10 → T13
T8 → T11 (fase 2)
```

### Phase 4: Força contínua, patamar, tom e aura

```
T14 → T17 → T19 → T20
T14 → T18 → T19
T15 → T19
T16 → T19
```

### Phase 5: Objeto e arma pelo impacto amaldiçoado

```
T2 → T21 (fase 1)
T21 → T23
T22 → T23
```

### Phase 6: Debug, snapshot e carga

```
T24 → T25 → T26
```

---

## Task Breakdown

### T1: Folha de atributos pura

**What**: `src/core/statSheet.ts` com `MeleeTraits`, `traitsOf(move, shadow)`, `PROP_TRAITS`, `StrikeMods` e
`statSheet({ perks, arsenal, vows, baseMaxHp })` devolvendo `meleeMul(t)`, `relicTechMul`, `vowTechMul`, `costMul`,
`damageTakenMul`, `maxHp` e `guardOff`, na ordem de fatores de hoje (`TestScene.ts:516`: build × arsenal × voto).
**Where**: `src/core/statSheet.ts`
**Depends on**: None
**Reuses**: `strikeMultiplier` (`core/build.ts:103`), `relicStrikeMul`/`relicTechMul` (`core/arsenal.ts:82`, `:90`), `vowEffects` (`core/vows.ts`)
**Requirement**: POW-01

**Done when**:

- [x] `tests/core/statSheet.test.ts`: grade de 9 votos (nenhum + 8) × 7 relíquias (nenhuma, 3 × Nv 1 e Nv 3) × 7
      passivas (nenhuma + 6) × `jab`, `cotovelada` e o contra, com e sem Passo sombrio, comparada com `toBe` contra a
      fórmula literal de hoje (POW-01.3)
- [x] `relicTechMul`, `vowTechMul`, `costMul` e `damageTakenMul` iguais à composição de hoje; `maxHp` 115 sem voto e 69
      com "Corpo de vidro" (a conta do POW-01.5)
- [x] `PROP_TRAITS` = `{heavy: true, light: false, counter: false, shadow: false}`
- [x] Gate verde; contagem de testes = 2913 + os novos (2930 em 147 arquivos: +17)

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): combine perks, arsenal and vows in one stat sheet`

---

### T2: Diretor de atributos (refatoração)

**What**: `StatsDirector` com `sheet`, `sync`, `update`, `reset`, `bindPlayer`, `strikeMods(move, peek)` (por enquanto
só `damage`; `force` = 1), `inputFor` e `snapshotFields` (vazio); tira da `TestScene` o `inputFor`, o `strikeMul` e os
imports deles (399 → 393), tira `sync`/`strikeMul` do `VowDirector` e `syncTechBonus`/`strikeMul` do `ArsenalDirector`,
troca o `strikeMul` do `BuildDirector` por `consumeShadow(peek)`, faz a compra de `vida` chamar `stats.sync()` antes da
cura (`shopDirector.ts:39`) e põe `stats.reset()` depois do `vows.reset()` (`runDirector.ts:147`).
**Where**: `src/scenes/test/statsDirector.ts`
**Depends on**: T1
**Reuses**: corpo do `VowDirector.sync` e do `ArsenalDirector.syncTechBonus` de hoje; `statSheet`
**Requirement**: POW-01, POW-02

**Done when**:

- [x] `grep` em `src/` mostra o `StatsDirector` como único escritor de `loadout.damageMul`, `loadout.vowDamageMul`,
      `loadout.costMul`, `player.damageTakenMul` e `player.setMaxHp` (POW-01.2)
- [x] `vowDirector.ts:89` lê `this.s.stats.strikeMods(MOVES.jab, true).damage` (mesmo número do gancho, L-076)
- [x] `src/scenes/TestScene.ts` com 393 linhas efetivas (POW-02.6)
- [x] Compra de `vida` a 50/60 com "Corpo de vidro" deixa 65/69, e a 80/100 sem voto deixa 95/115, lido no snapshot
      num cenário do smoke `vows` ou `shop` (POW-01.4, POW-01.5; edge case do teto abaixo da vida)
- [x] Smokes `vows`, `arsenal`, `build`, `shop`, `fight`, `defense`, `run-loop` e `world-traverse` verdes e iguais
- [x] Gate verde; contagem de testes sem perda (2930 em 147 arquivos, igual à T1)

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(scene): own the combat multipliers in a stats director`

---

### T3: Regra das faixas de acerto

**What**: `HitBand = 'chip' | 'micro'` e `band?: HitBand` em `core/hit.ts`; `src/core/hitBand.ts` com
`microHitstopMs`, `MicroBudget` (janela deslizante de 1000 ms de relógio real, teto de 60 ms), `bandPoiseDamage` e
`bandStructureGain`; `HIT_BAND_FEEL` no fim de `data/feel.ts` (micro 15/20 ms, teto 60 ms em 1000 ms, faísca 10; chip
faísca 6).
**Where**: `src/core/hitBand.ts`
**Depends on**: None
**Reuses**: `Hitstop.trigger` (fica com o maior; só o `ms` muda); regra de postura de `bossBrain.ts:94`
**Requirement**: POW-03, POW-14

**Done when**:

- [x] `tests/core/hitBand.test.ts`: 15 ms leve e 20 ms forte; 20+20+20 concedidos e o próximo recusado (60/61 ms);
      janela em 999/1000/1001 ms; `reset` libera; `bandPoiseDamage` do chip = dano × `chipMul`, do micro = dano (leve)
      e 2 × dano (forte); `bandStructureGain` 0 no chip e metade no micro
- [x] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the chip and micro hit bands`

---

### T4: Cérebro do inimigo aceita o chip

**What**: evento `{ type: 'chip'; hit }` no `EnemyBrain`; `receiveHit` extrai as recusas para `refuses(hit)` e, depois
da morte, devolve `[{type: 'chip', hit}]` para acerto com banda, sem mudar estado nem `downHits`.
**Where**: `src/core/enemyBrain.ts`
**Depends on**: T3
**Reuses**: regras de recusa de hoje (`gettingUp`, `downHits`, `tech`)
**Requirement**: POW-03, POW-15

**Done when**:

- [x] `tests/core/enemyBrainChip.test.ts`: vivo com banda devolve exatamente `[{type: 'chip', hit}]` e mantém o estado
      do cérebro (`idle`, `hitstun`, `stagger`, `ragdollStun`; `windup` e `attack` moram no `enemyAI`, não no cérebro)
      sem entrar em `hitstun`, `stagger` nem `ragdollStun`; `downHits` igual (POW-03.4); letal devolve `died` e `ragdoll`
      (POW-03.5); `gettingUp` e `downHits` 1 recusam sem `tech` e aceitam com `tech: true` (edge case)
- [x] `oxlint` mostra a complexidade do `receiveHit` sem subir (20 antes, 18 depois); `tests/core/enemyBrain.test.ts` verde
- [x] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): let the enemy brain take chip hits without hitstun`

---

### T5: Postura do chefe no chip

**What**: `chipPoiseMul` no `BossBrainTuning`, `BOSS.chipPoiseMul: 0.5` em `data/tuning.ts` e
`poiseDamage = bandPoiseDamage(hit, t.chipPoiseMul)`.
**Where**: `src/core/bossBrain.ts`
**Depends on**: T3
**Reuses**: `bandPoiseDamage`
**Requirement**: POW-03

**Done when**:

- [x] `tests/core/bossBrainChip.test.ts` (arquivo novo; `bossBrain.test.ts` está na lista de exceções): chip = dano ×
      0,5; micro leve = dano; micro forte = 2 × dano; sem banda igual a hoje (POW-03.6)
- [x] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): halve the boss poise damage of chip hits`

---

### T6: Defesa do inimigo aceita a banda

**What**: `if (hit.band) return this.receiveBand(hit)` logo depois da guarda, com `receiveBand` como no design (dano
sem `ai.interrupt`, sem limpar `walkVxStep`, sem `pickHitReaction`, sem `trackStreak`, sem efeito do golpe; micro soma
`bandStructureGain` com `onBreak`; chip não soma); a montagem de `effect`/`reaction` vira `reactionFor(hit, wasBroken)`;
`handle` trata `chip` com o evento de debug `chip:<id>` e sem reação de corpo.
**Where**: `src/game/enemy/EnemyDefense.ts`
**Depends on**: T4
**Reuses**: `guard.resolveHit`, `hud.updateBar`, `onBreak`
**Requirement**: POW-15, POW-03

**Done when**:

- [x] `oxlint` mostra a complexidade do `EnemyDefense.receiveHit` sem subir (21 hoje); arquivo abaixo de 400 (feito:
      caiu para 15 ou menos, sem aviso; arquivo com 377 linhas)
- [x] Smokes `enemy-`, `telegraph` e `targets` verdes e iguais (provam a extração do `reactionFor`); o ramo da banda é
      provado no jogo vivo pela T8, que liga o primeiro emissor (não há emissor de banda antes dela)
- [x] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(enemy): accept banded hits without the body reaction`

---

### T7: Efeitos das faixas na técnica

**What**: `onTechConnect(hit, point)` (o `target` entra com o número, T11) trata chip (sem hitstop, sem `freeze`, faísca 6), micro
(`MicroBudget.grant(strength, game.loop.time)`, faísca 10 mesmo com o teto cheio) e normal como hoje; `Fx.spark` ganha
`size?` opcional.
**Where**: `src/scenes/test/effects.ts`
**Depends on**: T3
**Reuses**: `Fx.spark` + `sparkSize` (`game/fx.ts:75`, `:112`), `MicroBudget`
**Requirement**: POW-03, POW-14

**Done when**:

- [x] O relógio do teto é `this.s.game.loop.time` (relógio real; o hitstop congela o de jogo)
- [x] Smokes `tech`, `techniques` e `fxlab` verdes e iguais (o caminho normal não muda; o chip é provado pela T8)
- [x] Gate verde; contagem de testes sem perda

**Tests**: unit (`tests/scenes/effects.test.ts`) + smoke
**Gate**: full
**Commit**: `feat(fx): route chip and micro technique hits without the freeze`

---

### T8: Tique do Azul como chip

**What**: `applyDamage(..., band?)` no Azul: o tique passa `'chip'` e a implosão não passa nada; nasce
`scripts/smoke/power.smoke.mjs` com o cenário do Azul.
**Where**: `src/game/tech/blue.ts`
**Depends on**: T6, T7
**Reuses**: `fight-kit.mjs`, `lib.ts`
**Requirement**: POW-04, POW-15, POW-03

**Done when**:

- [x] `power.smoke.mjs` (cenário 5), `?debug&hd=1&area=modular&seed=1&tech=azul` com 5 inimigos (`maxAlive=5`): `hitstop.frozen`
      falso em todo quadro dos tiques, eventos `chip:<id>`, nenhum inimigo em `hitstun` por tique, um inimigo em
      `windup` chega a `attack` (POW-04.11, POW-15.9)
- [x] A implosão continua com hitstop (sem banda, POW-04.10)
- [x] Smokes `tech`, `techniques`, `boss`, `fxlab` e `power` verdes
- [x] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(blue): tick enemies as chip hits so the fight keeps flowing`

---

### T9: Livro dos números de dano

**What**: `src/core/damageNumber.ts` com `DamageKind`, `sizeFor`, `colorsFor` (chaves da paleta) e `DamageBook`
(`add`, `promote`, `expire`, `clear`, `live`, `last`); `DAMAGE_NUMBER_FEEL` em `data/feel.ts` (700 ms, 18 px, fusão
300 ms, teto 12, pop 1,6 em 120 ms).
**Where**: `src/core/damageNumber.ts`
**Depends on**: None
**Reuses**: padrão de vida do `FloatTexts`
**Requirement**: POW-05

**Done when**:

- [x] `tests/core/damageNumber.test.ts`: 12/16/20 px em 14/15 e 39/40 de dano para golpe, técnica, crítico e Kokusen;
      micro e chip sempre 12; cores por tipo (POW-05.2); fusão em 300 ms e número novo em 301 ms; tipo de maior
      prioridade fica; teto 12/13 com fusão no mais recente do alvo e despejo do mais antigo sem número do alvo;
      `promote`; `expire` em 700 ms; `clear`
- [x] `tests/data/powerFeel.test.ts` (novo): toda cor de número existe na `PALETTE`
- [x] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the damage number book`

---

### T10: Número do golpe do jogador

**What**: `src/game/DamageNumbers.ts` (texto no mundo, `FX_DEPTH`, contorno por `stroke`, relógio próprio por `dt`)
criado em `UiSetup.addHud()` como `ui.damageNumbers`; `update` em `drops.updatePickups`; `combat.onConnect` mostra o
número `strike` só quando `hit.ownerId === player.id`; campo `damageNumbers` no snapshot (tipo em
`game/powerSnapshot.ts`, campo no `GameSnapshot`, literal de `tests/game/debugApi.test.ts`, uma linha
`...this.s.stats.snapshotFields()` em `snapshot.ts`).
**Where**: `src/game/DamageNumbers.ts`
**Depends on**: T9
**Reuses**: `FloatTexts` (`css(PALETTE)`, `FX_DEPTH`), `route` da câmera de UI
**Requirement**: POW-05, POW-06, POW-13

**Done when**:

- [ ] `power.smoke.mjs` (cenário 4), `?debug&hd=1&area=modular&seed=1&maxAlive=1&enemyGuard=0`: o `jab` traz
      `damageNumbers.last` com o valor do acerto e o tipo `strike`; golpe de inimigo no jogador não mostra número
- [ ] Sem campo novo na `TestScene`; `fxCap` e `FloatTexts.debug` iguais (POW-06.6, POW-06.9)
- [ ] Smokes `hud`, `drops`, `fight` e `power` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(hud): show the damage number of every player strike`

---

### T11: Número da técnica por alvo e faixa

**What**: `TechContext.onTechHit(hit, point, target)` (`tech/shared.ts:33`), repassado por `TechRunner.ts:50` e pela
`TestScene` (l.319, sem linha a mais); as 5 técnicas (`blue`, `cut`, `divergent`, `purple`, `red`) passam o alvo que já
têm; `effects.onTechConnect` mostra `tech`, `micro` ou `chip` pela banda.
**Where**: `src/game/tech/shared.ts`
**Depends on**: T10, T8
**Reuses**: `DamageNumbers.show`
**Requirement**: POW-06

**Done when**:

- [ ] `power.smoke.mjs` (cenário 5) lê `damageNumbers.last.kind === 'chip'` com `tech=azul`; o micro com o teto cheio
      ainda mostra faísca e número (edge case)
- [ ] `src/scenes/TestScene.ts` continua com 393 linhas efetivas
- [ ] Smokes `tech`, `techniques`, `evolution` e `power` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(tech): show tech, micro and chip damage numbers per target`

---

### T12: Kokusen promove o número

**What**: `ImpactFx.onKokusen(target, point, facing, streak)` marca o `kokusenFrame`, dispara o `kokusenFx.trigger` e
chama `damageNumbers.promote(target.id, 'kokusen')` (pop de 1,6 a 1,0 em 120 ms); o retorno de chamada da `TestScene`
(l.324-327) vira uma linha (393 → 390).
**Where**: `src/scenes/test/impactFx.ts`
**Depends on**: T11
**Reuses**: ordem do `divergent.ts:240-246` (o `onTechHit` vem antes do Kokusen)
**Requirement**: POW-06, POW-02

**Done when**:

- [ ] O smoke `kokusen` lê `damageNumbers.last.kind === 'kokusen'` depois do Kokusen (POW-06.8)
- [ ] `src/scenes/TestScene.ts` com 390 linhas efetivas (POW-02.7)
- [ ] Smokes `kokusen`, `tech` e `evolution` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(kokusen): promote the hit number to the kokusen kind`

---

### T13: Números somem no reset e na troca de área

**What**: `this.s.ui.damageNumbers.clear()` no reset da run (`runDirector.ts:134`) e no `teardown` da área
(`world.ts:164`).
**Where**: `src/scenes/test/runDirector.ts`
**Depends on**: T10
**Reuses**: `DamageNumbers.clear`
**Requirement**: POW-06

**Done when**:

- [ ] `power.smoke.mjs`: com números vivos, a run nova começa com `damageNumbers.live === 0` no primeiro snapshot
      (edge case do reset); a troca de área também zera
- [ ] Smokes `world-restart`, `run-loop`, `world-traverse` e `power` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(hud): clear the damage numbers on run reset and area change`

---

### T14: Pontos, patamar e visual da força

**What**: `src/core/power.ts` com `powerPoints`, `powerTier` (2, 5 e 8 pontos), `powerLook` (escala, tranco, força,
deslize, rastro, bônus de hitstop, tremor, tom por chaves, aura) e `atRest`; `POWER_FEEL` em `data/feel.ts` (sem o
`handOffset`, que nasce medido na T20).
**Where**: `src/core/power.ts`
**Depends on**: None
**Reuses**: `ToneKeys` só com chaves da paleta (AD-001, AD-009)
**Requirement**: POW-07, POW-08, POW-09, POW-10

**Done when**:

- [ ] `tests/core/power.test.ts`: pontos = Força + 2 × Manoplas + 2 com Punho Pesado; patamar em 1/2, 4/5 e 7/8
      pontos; 13 pontos reportam 13 e usam `p = 10` (edge case); em p 0, 1 e 10: escala 1,0/1,05/1,5, tranco
      4/4,3/7 px, força e deslize 1/1,03/1,3, rastro +0/+0/+5; hitstop forte +0/+10/+20/+30 e leve +0/+0/+5/+10 por
      patamar; tremor só do patamar 2; tom e aura por patamar; `atRest` falso em cada condição (andando, no ar,
      `castLock`, `channeling`, morto, quadro fora do `idle`)
- [ ] `tests/data/powerFeel.test.ts`: toda chave de tom existe na `PALETTE`; `HITSTOP_MS` 50/90 e `kickPx` 4 (POW-08.10)
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): turn power points into tier and continuous feel`

---

### T15: Tranco de câmera com distância

**What**: `CameraKick.kick(dx, dy, px = CAMERA_FEEL.kickPx)`, com o `update` usando o `px` guardado.
**Where**: `src/core/cameraKick.ts`
**Depends on**: None
**Reuses**: `CAMERA_FEEL`
**Requirement**: POW-08

**Done when**:

- [ ] `tests/core/cameraKick.test.ts`: sem `px` anda 4 px como hoje; com `px` 7 anda 7 e volta
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): let the camera kick take its distance`

---

### T16: Deslize com escala

**What**: `Slide.start(tier, dir, scale = 1)` com `totalPx = cfg.px × scale`; `EnemyMovement.slideBy` e
`Enemy.slideBy` repassam `scale = 1`.
**Where**: `src/core/slide.ts`
**Depends on**: None
**Reuses**: `SLIDE_FEEL`
**Requirement**: POW-08

**Done when**:

- [ ] `tests/core/slide.test.ts`: sem escala igual a hoje; escala 1,24 dá 1,24 × a distância
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): scale the enemy slide distance`

---

### T17: Força no golpe e no snapshot

**What**: `Player.damageMul` vira `strikeMods: ((move) => StrikeMods) | null` (mesmo número de linhas); `strikes.ts`
lê `mods` uma vez e aplica `damage × mods.damage` e `force × mods.force`; o `StatsDirector` recalcula `power` no
`update`, devolve `force = power.forceMul` no `strikeMods` e põe o campo `power` no snapshot (`PowerSnapshot` em
`game/powerSnapshot.ts`, campo no `GameSnapshot`, literal do `debugApi.test.ts`; `aura` é `'off'` até a T20).
**Where**: `src/game/player/strikes.ts`
**Depends on**: T14
**Reuses**: `modifiers.meleeDamage` e o `Math.round` no mesmo lugar (`strikes.ts:271`)
**Requirement**: POW-08, POW-13, POW-07

**Done when**:

- [ ] `power.smoke.mjs` com `arsenal=manoplas,manoplas,manoplas&perks=punhoPesado`: `power.points` 8, `tier` 3,
      `impactScale` 1,4; o empurrão do inimigo no golpe forte é maior que sem build (lido no snapshot)
- [ ] Dano de hoje igual com 0 pontos: smokes `fight`, `defense`, `vows` e `player-anim` verdes e iguais
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(player): scale the strike force with the power points`

---

### T18: Impacto forte com escala, tom e rastro largo

**What**: `ImpactShape.scale?` multiplica o `k`; as ondas de choque (`cursedImpact.ts:148-149`) usam `toneOf(s)`;
`toneFromKeys(keys)` exportado de `cursedImpact.ts`; `CursedFx.trail(path, strength, extraPx = 0)` e
`impact(tier, at, dir, seed, look?)` com `look = { scale, tone }` só no forte e no decisivo.
**Where**: `src/game/CursedFx.ts`
**Depends on**: T14
**Reuses**: `toneOf`, `ImpactTone`, getter `trails` (`widthPx`)
**Requirement**: POW-09, POW-08

**Done when**:

- [ ] `tests/game/cursedFx.test.ts`: sem `look` a forma é a de hoje; `scale` 1,5 aumenta agulhas, estrela e ondas;
      agulhas, estrela e as duas ondas usam o tom dado; o leve ignora o `look`; `extraPx` soma no `widthPx`;
      `toneFromKeys` resolve as 5 chaves da paleta
- [ ] Smokes `impact`, `fxlab` e `feel` verdes e iguais
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(fx): scale and tint the heavy cursed impact`

---

### T19: Cada ponto de força no soco forte

**What**: o `ImpactFx` passa o `look` do `stats.power` ao `impact`, `slideMul` ao `slideBy`, `kickPx` ao `kick`,
`trailBonusPx` aos dois `trail` e, no patamar 2 ou mais, `fx.shake()` no forte e no decisivo do jogador; o
`combat.onConnect` soma `power.hitstopBonusMs[strength]` ao `HITSTOP_MS` nos acertos do jogador.
**Where**: `src/scenes/test/impactFx.ts`
**Depends on**: T15, T16, T17, T18
**Reuses**: `Fx.shake()` (90 ms, 0,004), `Hitstop.trigger`
**Requirement**: POW-08, POW-09

**Done when**:

- [ ] `power.smoke.mjs` (cenário 2) com 8 pontos: a `cotovelada` deixa `fx.trails[].widthPx` 4 px mais largo, o deslize
      24 % maior que sem build e `hitstop.remainingMs` partindo de 120; `fx.lastImpact` com o tom do patamar 3
- [ ] `oxlint`: complexidade do `onMeleeImpact` sem subir (16 hoje)
- [ ] Smokes `fight`, `impact`, `feel`, `player-anim` e `power` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(impact): make every power point show on the heavy strike`

---

### T20: Brasas e chama na mão parada

**What**: `PowerAuraDirector` (`bind`, `update`, `view`) com `CursedFlame('red')` de power 0,3 (patamar 2) e 0,6
(patamar 3) em `renderPos + POWER_FEEL.handOffset[facing]`; `handOffset` medido na prancha para `player-yuta` e
`player-hd`; o `StatsDirector` cria, anda e religa a aura no `bindPlayer`, e o snapshot passa a ler o `view` real.
**Where**: `src/scenes/test/powerAuraDirector.ts`
**Depends on**: T19
**Reuses**: `CursedFlame.tick(dt, at, power)`, `atRest`
**Requirement**: POW-10

**Done when**:

- [ ] `handOffset` medido com `tools/hd-boards.mjs` no quadro `idle` das duas folhas e conferido em movimento no jogo
      (repouso, corrida, repouso, dos dois lados), capturas em `.fable-out/` ou no rascunho
- [ ] `power.smoke.mjs` (cenário 3): parado `power.aura === 'flame'`, andando `'off'`, parado virado para o outro lado
      `'flame'` no quadro seguinte; lançando técnica `'off'`; patamar 2 dá `'embers'`; `R` recria sem chama órfã
- [ ] Smokes `player-anim`, `world-restart` e `power` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(power): light the fist flame on the resting hand`

---

### T21: Bônus da build no objeto

**What**: `Prop` recebe `PropDamage` (`{ damage(base) }`, interface no próprio `Prop.ts`) no lugar de `Modifiers`;
o `StatsDirector` expõe `propDamage` com `round(modifiers.meleeDamage(base) × sheet().meleeMul(PROP_TRAITS))`; os 3
pontos de criação (`arsenalDirector.ts:52`, `drops.ts:91`, `world.ts:355`) passam `this.s.stats.propDamage`.
**Where**: `src/game/Prop.ts`
**Depends on**: T2
**Reuses**: `PROP_TRAITS`, `statSheet`
**Requirement**: POW-11

**Done when**:

- [ ] `power.smoke.mjs` (cenário 6): com `arsenal=bastao` o dano do golpe é X; com `manoplas,manoplas,manoplas` junto,
      `round(X × 1,3)`; com o Passo sombrio armado, o golpe de objeto não o gasta (POW-11.2)
- [ ] Smokes `held-item`, `armed` (repetido isolado se falhar), `drops`, `arsenal`, `world-` e `power` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(prop): apply the build bonuses to held objects`

---

### T22: Faixa de impacto forçada

**What**: `impactTier(hit, { brokePosture, forced })` com `forced?: ImpactTier` vencendo tudo (o design punha no passo
4; fica aqui, junto do único uso).
**Where**: `src/core/impactTier.ts`
**Depends on**: None
**Reuses**: regra de hoje
**Requirement**: POW-11

**Done when**:

- [ ] `tests/core/impactTier.test.ts`: `forced: 'heavy'` vence leve, quebra de postura e `knockdown`; sem `forced`
      igual a hoje
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): let the caller force the impact tier`

---

### T23: Objeto bate pelo impacto amaldiçoado

**What**: no `combat.onConnect`, `mine && kind === 'prop'` vai para `impactFx.onPropImpact(hit, point, target)`, sem a
faísca roxa e sem o `fx.shake`; `onPropImpact` chama `onMeleeImpact` com a faixa forçada em `heavy` e desenha o risco
`heavy` do centro do jogador ao contato com o `trailBonusPx`.
**Where**: `src/scenes/test/impactFx.ts`
**Depends on**: T21, T22
**Reuses**: `onMeleeImpact`, `CursedFx.trail`
**Requirement**: POW-11

**Done when**:

- [ ] `power.smoke.mjs` (cenário 6): o golpe com o bastão dispara `impact:heavy` e nenhuma faísca roxa; o objeto
      arremessado com `knockdown` também passa pelo `ImpactFx`
- [ ] Smokes `held-item`, `armed` (repetido isolado se falhar), `boss-prop`, `world-`, `drops` e `power` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(impact): hit with held objects through the cursed impact`

---

### T24: Parser do `?mods=`

**What**: `parseModsParam(raw)` devolve `[CoreModifierId, number][]`, descartando id desconhecido e nível que não é
inteiro positivo.
**Where**: `src/core/modsParam.ts`
**Depends on**: None
**Reuses**: ids de `core/modifiers.ts`
**Requirement**: POW-13

**Done when**:

- [ ] `tests/core/modsParam.test.ts`: `forca:5` e `forca:5,vida:2`; `null` e vazio dão `[]`; `xx:2`, `forca:-1`,
      `forca:0`, `forca:1.5` e `forca:` somem e o resto vale
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): parse the mods debug parameter`

---

### T25: Run com Força comprada e atributos no snapshot

**What**: `statsDirector.reset()` aplica cada par do `?debug&mods=` com `modifiers.apply` em laço (teto do `apply`)
antes do `sync`; campo `stats: { meleeMul, techDamageMul, costMul }` no snapshot (`StatsSnapshot` em
`game/powerSnapshot.ts`, campo no `GameSnapshot`, literal do `debugApi.test.ts`); linha de `mods=<id>:<n>[,<id>:<n>]`
na tabela de parâmetros do `README.md` (com o aviso de que `vida:N` sobe o teto sem curar).
**Where**: `src/scenes/test/statsDirector.ts`
**Depends on**: T24
**Reuses**: `debugParam` (`scenes/test/params.ts`), `Modifiers.apply`
**Requirement**: POW-13, POW-01

**Done when**:

- [ ] `power.smoke.mjs` (cenário 1): `mods=forca:5&arsenal=manoplas,manoplas,manoplas` dá 11 pontos, patamar 3 e escala
      1,5; `mods=forca:5` dá patamar 2; sem nada, patamar 0; `mods=xx:2,forca:-1` ignorado; `mods=forca:9` para em 5
- [ ] `stats.meleeMul` = `meleeMul(traitsOf(MOVES.cotovelada, false))` e `stats.techDamageMul` = `relicTechMul ×
      vowTechMul`, lidos com e sem Manoplas
- [ ] Smokes `boot`, `no-debug` e `power` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(debug): start the run with bought modifiers and report the stats`

---

### T26: Teto sob a carga inteira

**What**: cenário 7 do `power.smoke.mjs`: 8 inimigos, Azul, Vermelho e soco ao mesmo tempo; se `fx.live` passar de
40, o chip deixa de soltar os pedacinhos (`burst`) e fica só com o lampejo de tamanho 6 (mitigação do design, em
`game/fx.ts`, na mesma tarefa).
**Where**: `scripts/smoke/power.smoke.mjs`
**Depends on**: T25
**Reuses**: cenários anteriores do `power.smoke.mjs`
**Requirement**: POW-14

**Done when**:

- [ ] `fx.live` ≤ 40, `damageNumbers.live` ≤ 12 e hitstop dos micro somado ≤ 60 ms em qualquer janela de 1000 ms
- [ ] `power.smoke.mjs` inteiro verde e os smokes do passo 6 do design (`boot`, `no-debug`) verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `test(smoke): cap effects and numbers under the full power load`

---

## Requirement Coverage

| Requirement | Tasks |
| --- | --- |
| POW-01 | T1, T2, T25 |
| POW-02 | T2, T11, T12 (e nenhuma outra tarefa soma linha na `TestScene`) |
| POW-03 | T3, T4, T5, T6, T7, T8 |
| POW-04 | T8 |
| POW-05 | T9, T10 |
| POW-06 | T10, T11, T12, T13 |
| POW-07 | T14, T17 |
| POW-08 | T14, T15, T16, T17, T18, T19 |
| POW-09 | T14, T18, T19 |
| POW-10 | T14, T20 |
| POW-11 | T21, T22, T23 |
| POW-13 | T10, T17, T24, T25 |
| POW-14 | T3, T7, T26 |
| POW-15 | T4, T6, T8 |

**Coverage:** 14 total, 14 mapeados, 0 sem tarefa.

| Edge case (spec) | Task |
| --- | --- |
| 13 pontos reportam 13 e usam 10 | T14 |
| Chip em `gettingUp` ou `downHits` 1, com e sem `tech` | T4 |
| Micro com o teto cheio mostra faísca e número | T3, T7, T11 |
| Reset da run com números vivos | T13 |
| Virar no repouso com a aura acesa | T20 |
| `R` reinicia a cena | T20 |
| "Corpo de vidro" baixa o teto abaixo da vida | T2 |

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6

Phase 1:  T1, T2
Phase 2:  T3, T4, T5, T6, T7, T8
Phase 3:  T9, T10, T11, T12, T13
Phase 4:  T14, T15, T16, T17, T18, T19, T20
Phase 5:  T21, T22, T23
Phase 6:  T24, T25, T26
```

Ordem de execução estritamente sequencial (a linha acima é a ordem de trabalho, não dependência). 26 tarefas:
empacotadas em lotes de fases inteiras (~7 por agente): Fases 1+2 (8), Fase 3 (5), Fase 4 (7), Fases 5+6 (6). Agente novo
por lote (memória "Agente novo por lote"). A T20 tem arte: Opus 5.5 ou Fable, nunca Sonnet.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | 1 módulo puro | ✅ |
| T2 | 1 diretor + a mudança dos chamadores (refatoração que só fecha junta) | ⚠️ coeso: mover sem mudar comportamento; partir quebra o gate |
| T3 | 1 módulo + o tipo + o bloco de feel | ⚠️ coeso |
| T4, T5, T15, T16, T22, T24 | 1 função | ✅ |
| T6 | 1 classe | ✅ |
| T7 | 1 método + parâmetro opcional | ✅ |
| T8 | 1 técnica + smoke novo | ✅ |
| T9 | 1 módulo puro | ✅ |
| T10 | 1 vista + a ligação mínima para o primeiro número ser lido | ⚠️ coeso: sem a ligação a vista não tem prova (L-076) |
| T11 | 1 assinatura repassada | ✅ |
| T12, T13 | 1 método / 2 chamadas | ✅ |
| T14 | 1 módulo puro + feel | ✅ |
| T17 | 1 gancho + o campo que prova | ⚠️ coeso |
| T18 | 1 forma de impacto | ✅ |
| T19 | 1 adaptador | ✅ |
| T20 | 1 diretor | ✅ |
| T21 | 1 interface + 3 trocas de argumento | ⚠️ coeso |
| T23 | 1 método | ✅ |
| T25 | 1 método + o campo | ✅ |
| T26 | 1 cenário | ✅ |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | — | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | None | — | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T3 | T3 → T5 | ✅ Match |
| T6 | T4 | T4 → T6 | ✅ Match |
| T7 | T3 | T3 → T7 | ✅ Match |
| T8 | T6, T7 | T6 → T8, T7 → T8 | ✅ Match |
| T9 | None | — | ✅ Match |
| T10 | T9 | T9 → T10 | ✅ Match |
| T11 | T10, T8 (fase 2) | T10 → T11, T8 → T11 | ✅ Match |
| T12 | T11 | T11 → T12 | ✅ Match |
| T13 | T10 | T10 → T13 | ✅ Match |
| T14 | None | — | ✅ Match |
| T15 | None | — | ✅ Match |
| T16 | None | — | ✅ Match |
| T17 | T14 | T14 → T17 | ✅ Match |
| T18 | T14 | T14 → T18 | ✅ Match |
| T19 | T15, T16, T17, T18 | T15/T16/T17/T18 → T19 | ✅ Match |
| T20 | T19 | T19 → T20 | ✅ Match |
| T21 | T2 (fase 1) | T2 → T21 | ✅ Match |
| T22 | None | — | ✅ Match |
| T23 | T21, T22 | T21 → T23, T22 → T23 | ✅ Match |
| T24 | None | — | ✅ Match |
| T25 | T24 | T24 → T25 | ✅ Match |
| T26 | T25 | T25 → T26 | ✅ Match |

Nenhuma dependência aponta para fase posterior.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Regra pura | unit | unit | ✅ OK |
| T2 | Adaptadores | smoke | smoke | ✅ OK |
| T3 | Regra pura + dados | unit | unit | ✅ OK |
| T4 | Regra pura | unit | unit | ✅ OK |
| T5 | Regra pura + dados | unit | unit | ✅ OK |
| T6 | Adaptador | smoke | smoke | ✅ OK |
| T7 | Adaptador | smoke | smoke | ✅ OK |
| T8 | Adaptador | smoke | smoke | ✅ OK |
| T9 | Regra pura + dados | unit | unit | ✅ OK |
| T10 | Adaptadores | smoke | smoke | ✅ OK |
| T11 | Adaptadores | smoke | smoke | ✅ OK |
| T12 | Adaptador | smoke | smoke | ✅ OK |
| T13 | Adaptador | smoke | smoke | ✅ OK |
| T14 | Regra pura + dados | unit | unit | ✅ OK |
| T15 | Regra pura | unit | unit | ✅ OK |
| T16 | Regra pura (+ repasse de argumento padrão nos adaptadores, sem mudança de comportamento) | unit | unit | ✅ OK |
| T17 | Adaptadores | smoke | smoke | ✅ OK |
| T18 | Fx puro em `src/game/` | unit | unit (e smokes iguais) | ✅ OK |
| T19 | Adaptadores | smoke | smoke | ✅ OK |
| T20 | Adaptador | smoke | smoke | ✅ OK |
| T21 | Adaptadores | smoke | smoke | ✅ OK |
| T22 | Regra pura | unit | unit | ✅ OK |
| T23 | Adaptadores | smoke | smoke | ✅ OK |
| T24 | Regra pura | unit | unit | ✅ OK |
| T25 | Adaptador + README | smoke | smoke | ✅ OK |
| T26 | Smoke (+ mitigação no `fx.ts` se precisar) | smoke | smoke | ✅ OK |

T6 e T7 entregam o ramo da banda antes do primeiro emissor; o smoke delas prova a parte que muda o caminho de hoje
(extração do `reactionFor`, caminho normal da técnica) e o ramo novo é medido no jogo vivo pela T8, que liga o emissor
na fase seguinte do mesmo lote (merge forward).
