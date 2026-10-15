# Hordas em atos — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/hordas-em-atos/spec.md`
**Design**: `.specs/features/hordas-em-atos/design.md`
**Plano**: `docs/plano-builds-e-habilidades.md` (linha F38 da seção 6; seções 3.1, 3.3 e 5.9) e a F27 de
`docs/plano-cenario-rejogabilidade-hordas.md`
**Base**: F29 `fundacao-de-poder`, F30 `vermelho-e-corpo`, F31 `expansao-de-dominio`, F32 `chefes-com-afixos` e F33
`eixos-das-tecnicas`, mergeadas antes da T1. As Fases 1 a 5 (passos 0 a 2) só dependem da F29 e da F30; a Fase 6 em
diante pede a F32 (`cycleKeyAt`, `AffixOutline`) e a F33 (`choiceDirector`, página `livre`), e a T47 pede também a F31
**Status**: Draft
**Branch**: `feat/hordas-em-atos`, aberta depois do merge da F33
**Ferramentas**: nenhuma MCP. Skill só o `tlc-spec-driven`. As tarefas de vista (T12 fenda, T20 folha do enxame, T21 enxame
em movimento, T41 a T44 elite, T59 véu do ato, T60 arena) são conferidas no jogo em HD, em movimento e com o personagem
virado para os dois lados (memória "Conferir animação em movimento"): prancha (`tools/hd-boards.mjs` ou
`tools/sprite-preview.mjs`), captura pelo `window.__game` e uma passada jogando. Vista e revisão em Opus 5.5 ou Fable,
nunca Sonnet (memória "Delegar o leve, qualidade no forte").

Regras que valem para toda tarefa (CLAUDE.md): um commit por tarefa, só os arquivos dela (nunca `git add -A`), `npm run
gate` verde uma vez antes do commit; durante a tarefa só o teste do arquivo tocado (`npx vitest run <arquivo>`), porque
a máquina roda outras frentes; smoke só do que foi tocado; smoke novo com `?debug&hd=1&area=modular`; tetos de 400
linhas efetivas por arquivo, 80 por função e complexidade 15; arquivo novo nunca entra no `.oxlintrc.json`; teste da
lista de exceções do `max-lines` (`tests/core/run.test.ts`, `tests/core/enemyBrain.test.ts`) não cresce: o teste vai
para arquivo novo. A `TestScene` termina cada tarefa com as linhas efetivas que tinha antes da F38 (390 pela estimativa
do design) e o `game/Hud.ts` não ganha linha (HRD-12): só a T4 mexe nas linhas da `TestScene` (+2 −2), e a T3 e a T56 só
trocam texto de linhas que já existem. Linha efetiva = sem linha em branco e sem comentário, como o `max-lines` do `.oxlintrc.json`.

Interfaces das fases anteriores citadas pelo nome (F29 `Hit.band`, `MicroBudget`, `DamageNumbers`, `powerSnapshot`; F30
`build.onMeleeHit(hit, point, target)`, `multipliersFor`/`scaleFor` com a escala nova, Perfuração 3; F31
`domainDirector`, `domainPowers`, `activationTargets`; F32 `outlineKeyAt`, `AffixOutline`, `spawner.wireEnemy`,
`runDirector.bosses`; F33 `ChoiceQueue`, `choiceRank`, `buildPage`, `choiceDirector`, Puxão 3): a tarefa que toca uma
delas reconfere o nome, a assinatura e a linha no código mergeado antes de começar; se mudou, segue o código e anota a
troca no commit.

**Ajustes ao design feitos neste passo** (o design segue valendo no resto):

1. O tamanho do grupo do enxame fica só em `HORDE.group` (T5/T18) e a contagem de afixos por ato só no `drawAffixes`
   (T31); o `ActRules` de `data/acts.ts` não repete `group` nem `affixes` (duas fontes do mesmo número divergiriam).
2. Os parâmetros `quota`, `bodyCap`, `swarm` e `swarmBurst` são lidos todos na T7 (os tipos já existem); `elite` entra na
   T36 e `veu` na T65, quando o tipo de cada um existe.
3. A troca da `Run` para o `Horde` (T9) abre a fase do jogo, porque é ela que atrasa todo nascimento em 600 ms: a espera
   do `fight-kit` e o `spawn-pressure` mudam na mesma tarefa, e o `hordeDirector` segue escolhendo o ponto no `spawn` até a
   T12 trazer a fenda.
4. ELT-09: a página do Selo entra com rank 30, depois das páginas de ponto livre da maestria (20) e, portanto, depois dos
   baús (0 e 1) da F33 (risco "Ordem da página do Selo" do design). O texto do ELT-09 da spec foi corrigido neste passo.

---

## Test Coverage Matrix

> Guidelines: `CLAUDE.md` (camadas, gate, smoke só do que foi tocado, HD é a base, arte só pronta depois da prancha e do
> movimento), `.oxlintrc.json` (tetos e lista de exceções), `vitest.config.ts`, `package.json` (`gate`, `test`,
> `smoke`); lições L-001 (velocidade aplicada a cada passo de física), L-010 (limite testado nos dois lados), L-043
> (testar o adaptador que repassa o número ao motor, não só a regra pura), L-076 (campo de debug que só repete a entrada
> não prova o efeito). Amostras: `tests/core/waves.test.ts`, `tests/core/run.test.ts`, `tests/core/loot.test.ts`,
> `tests/core/cameraKick.test.ts`, `tests/game/debugApi.test.ts`, `scripts/smoke/spawn-pressure.smoke.mjs`,
> `scripts/smoke/hud.smoke.mjs`, `scripts/smoke/fight-kit.mjs`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Regra pura (`src/core/**`) | unit | 1:1 com os ACs; todo edge case listado; cada limite nos dois lados (L-010): 599/600 ms da fenda, 159/160 px do ponto do enxame, 71/72/73 px da explosão, 1999/2000 ms do regenerador, `ceil(0,4q) − 1`/`ceil(0,4q)` abates da elite, r5/r6, r7/r8, r12/r13, r20/r21, 12/13 pontos guardados, teto de corpos e teto + 1, 40/41 px da mordida, 199/200 ms do limitador, 3/4 membros em ataque | `tests/core/*.test.ts` (teste par por arquivo novo) | `npx vitest run tests/core/<arquivo>` |
| Números de ajuste (`src/data/**`) | unit | Números da spec conferidos um a um; toda chave de cor existe na `PALETTE` (ART-01); ENX-09 sobre os dados dos golpes | `tests/data/*.test.ts`, `tests/game/swarmReach.test.ts` | `npx vitest run tests/data/<arquivo>` |
| Arte em código e tipos sem motor (`src/game/art/hd/swarmSheet.ts`, tipos de snapshot) | unit | Quadros, célula, origem, contorno e paleta (ENX-14); literal do snapshot com os campos novos | `tests/game/*.test.ts` | `npx vitest run tests/game/<arquivo>` |
| Adaptadores (`src/scenes/**`, `src/game/**`) | smoke | Efeito lido do jogo vivo pelo snapshot, medido no objeto do motor e não no pedido (L-043, L-076); refatoração com os smokes de antes iguais | `scripts/smoke/horde.smoke.mjs`, `elite.smoke.mjs`, `acts.smoke.mjs`, `spawn-pressure-horde.smoke.mjs` (novos) e os smokes de cada tarefa | `npm run smoke -- <trecho>` |
| Documentação (`README.md`, `CLAUDE.md`) | none | build gate only | - | `npm run gate` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tarefa só com teste unitário (regra pura, dados, arte em código, tipos) | `npx vitest run <arquivo do teste>` durante a tarefa; `npm run gate` uma vez antes do commit |
| Full | Tarefa de adaptador (smoke) | `npm run gate && npm run smoke -- <cada trecho da tarefa>` |
| Build | Fim de fase e tarefa só de documentação | `npm run gate` e os smokes do passo ("Smokes por passo" do design) |

Base: a contagem de testes unitários do merge da F33, anotada pela T1. Nenhuma tarefa apaga teste sem levar o caso para
outro arquivo (a T10 move os casos do `WaveSpawner` para `tests/core/horde.test.ts` e diz a contagem antes e depois);
cada tarefa informa a nova contagem. Smokes instáveis: `armed` (ARM-12) e timeouts sob carga: repetir isolado antes de
suspeitar.

`horde.smoke.mjs` nasce na T12 e ganha uma parte por tarefa de adaptador (partes 1 a 6); passando de 380 linhas
efetivas, a parte da rodada de enxame e a do Véu saem para `horde-special.smoke.mjs` (T54). `elite.smoke.mjs` nasce na
T41, `acts.smoke.mjs` na T53 e `spawn-pressure-horde.smoke.mjs` na T26.

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Passo 0 — refatoração, com os smokes iguais

```
T1 → T2 → T4
T3 → T4
```

### Phase 2: Passo 1 — diretor por orçamento, regra pura

```
T5 → T6 → T7
T6 → T8
```

### Phase 3: Passo 1 — diretor no jogo (Run, fenda, cota no HUD)

```
T9 → T10
T9 → T11 → T12 → T14
T11 → T13
```

### Phase 4: Passo 2 — enxame, regra pura

```
T15 → T16 → T17
T15 → T18
T19
```

### Phase 5: Passo 2 — enxame no jogo e medição

```
T20 → T21 → T22 → T23
T22 → T24
T21 → T25
T22 → T26
T25 → T26
```

### Phase 6: Passo 3 — refatorações e regra pura da elite

```
T27 → T28
T29
T30 → T31 → T32 → T33
```

### Phase 7: Passo 3 — elite na horda, texto, drop e Selo (regra pura)

```
T34 → T35
T36
T37
T38
T39
```

### Phase 8: Passo 3 — elite no jogo

```
T40 → T41 → T42
T41 → T43
T41 → T44
T41 → T45
T41 → T47
T46
```

### Phase 9: Passo 4 — rodada de enxame e regras do ato IV

```
T49 → T50 → T54
T49 → T54
T48 → T53
T51 → T53
T52 → T53
```

### Phase 10: Passo 5 — atos: luz e arena-portão

```
T55 → T56 → T60
T57 → T58 → T59
T57 → T59
```

### Phase 11: Passo 6 — Véu Rompido e fechamento

```
T61 → T62 → T63 → T64 → T67 → T68 → T69
T62 → T65 → T68
T62 → T66 → T68
T63 → T68
T64 → T68
```

---

## Task Breakdown

### Phase 1: Passo 0 — refatoração, com os smokes iguais

#### T1: Interface da onda da rodada e o embrulho do `WaveSpawner`

**What**: `src/core/horde.ts` com `RoundHorde` (`alive`, `kills`, `queued`, `remaining`, `cleared`, `maxAlive`, `quota`,
`rifting`, `enemyDied(id, kind)`, `update(dtMs): HordeOrder[]`, `view()`), `HordeOrder` (só a variante `spawn` com `kind`,
`rift: null`, `count: 1`, `affixes: []` neste passo) e `WaveHorde implements RoundHorde`, que embrulha o `WaveSpawner` de
hoje e transforma cada `SpawnOrder` em ordem `spawn`, com `quota = size` e `rifting = 0`.
**Where**: `src/core/horde.ts`
**Depends on**: None
**Reuses**: `WaveSpawner`, `SpawnOrder`, `SpawnKind` (`core/waves.ts:65-147`)
**Requirement**: HRD-01

**Done when**:

- [ ] `tests/core/horde.test.ts` (novo): o `WaveHorde` devolve, quadro a quadro, as mesmas ordens que o `WaveSpawner` puro
      na r1 (estouro de 3, depois 1 a cada 1,5 s com vaga), na r5 (chefe, `quota` 1) e com `maxAliveOverride` 1;
      `enemyDied` repetido conta uma vez (WAVE-06); `cleared`, `queued` e `remaining` iguais aos do `WaveSpawner`
- [ ] Nenhum import de Phaser; anotar aqui a contagem de testes do merge da F33 (base) e a nova; gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `refactor(core): wrap the wave spawner behind a round horde interface`

---

#### T2: A `Run` fala com a onda pela interface

**What**: `src/core/run.ts`: o campo `spawner` vira `horde: RoundHorde | null`, criado como `new WaveHorde(new
WaveSpawner(...))` no `resolveStart` e no `startNextRound`; os getters `alive`, `roundKills`, `queued`, `remaining` e
`maxAlive` delegam; o laço do `advanceTimers` (l.249-252) repassa cada ordem como o mesmo comando `spawn` de hoje.
**Where**: `src/core/run.ts`
**Depends on**: T1
**Reuses**: ordem fixa do `Run.update` (morte, abates, tempos, `run.ts:207-217`)
**Requirement**: HRD-01

**Done when**:

- [ ] `tests/core/run.test.ts` sem nenhuma mudança e verde (os comandos `spawn` saem nos mesmos quadros)
- [ ] `run.ts` sem ramo novo no `resolveStart` (função da exceção de complexidade)
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `refactor(core): drive the run round through the round horde interface`

---

#### T3: O HUD recebe o texto pronto do contador

**What**: `src/game/Hud.ts`: `setRun(state: { round: number; counter: string } | null)` e
`this.remainingText.setText(state.counter)` no lugar do texto montado com `remaining` (0 linha); a chamada da
`TestScene` (l.423-425) passa o `counter` "Inimigos: N" (com `alive + queued`) nas mesmas linhas (0 linha).
**Where**: `src/game/Hud.ts`
**Depends on**: None
**Reuses**: `Hud.setRun` (`Hud.ts:285-293`)
**Requirement**: HRD-01, HRD-12

**Done when**:

- [ ] `Hud.ts` com as mesmas linhas efetivas (336); `TestScene` com as mesmas linhas efetivas
- [ ] Smoke `hud` verde sem mudança (o texto ainda lê "Inimigos: N")
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(hud): take the round counter text ready-made`

---

#### T4: `HordeDirector` assume o `spawn` e o HUD da rodada

**What**: `src/scenes/test/hordeDirector.ts` (novo, campo `horde` da `TestScene`) com `onCommand(cmd)` (o `case 'spawn'`
de hoje, com o filtro de `fxLab` e `?debug&spawn=0`, chefe por `spawner.spawnBoss`, lutador por
`spawnFromCommand(pickEnemySpawnPoint(), round)`), `update(dt)` (`hud.setRun` com "Inimigos: N", escondido fora da rodada
e no laboratório) e `runOptions()` (`maxAliveOverride: debugIntParam('maxAlive', 1)`); `runDirector.applyRunCommand` chama
`this.s.horde.onCommand(cmd)` logo depois do `area.onCommand` e perde o `case 'spawn'`; na `TestScene`, `import` e
`readonly horde = new HordeDirector(this)` (+2), a l.248 vira `...this.horde.runOptions(),` e as l.423-425 viram
`this.horde.update(dt);` (−2).
**Where**: `src/scenes/test/hordeDirector.ts`
**Depends on**: T2, T3
**Reuses**: `runDirector.ts:56-63` (o `case 'spawn'` de hoje), `debugIntParam` (`params.ts:5-15`), molde dos diretores de
`scenes/test/`
**Requirement**: HRD-01, HRD-12

**Done when**:

- [ ] `TestScene` com as mesmas 390 linhas efetivas (contadas antes e depois, no commit); `debugIntParam` sai do import
      da `TestScene` se ficar sem uso
- [ ] Smokes `spawn-pressure`, `run-loop`, `hud`, `boot`, `shop`, `world-traverse` (HRD-01.2), `fxlab` e `no-debug` verdes
      **sem mudança** nos arquivos de smoke
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(scene): move spawn handling and the round hud into a horde director`

---

### Phase 2: Passo 1 — diretor por orçamento, regra pura

#### T5: Números do diretor

**What**: `src/data/horde.ts` com `HordeTuning` e `HORDE` (`lutadorMax` 14, `bodyCap` 32 provisório, `bodyBase` 6,
`bodyPerRound` 2, `swarm` `{ from: 6, base: 8, perRound: 3, max: 40 }`, `eliteFrom` 8, `riftMs` 600, `riftCloseMs` 150,
`budget` `{ start: 9, base: 1.5, perRound: 0.15, perSec: 0.02, maxRate: 6, stored: 12 }`, `cost` `{ enemy: 3, swarm: 1,
elite: 0 }`, `group` `[0, 0, 4, 5, 6]`, `swarmRound` `{ first: 13, every: 5, base: 30, perRound: 2, max: 60, rateMul: 2,
stored: 18, group: 6 }`), com o requisito em comentário em cada grupo.
**Where**: `src/data/horde.ts`
**Depends on**: None
**Reuses**: molde de `data/perks.ts` e `data/arsenal.ts` (interface + constante `as const`)
**Requirement**: HRD-02, HRD-03, HRD-04, ENX-03, ESP-02

**Done when**:

- [ ] `tests/data/horde.test.ts` (novo): cada número acima conferido com a spec (Assumptions e HRD-02..04, ENX-03,
      ESP-02); `riftMs` 600 e `riftCloseMs` 150 (FEN-01, FEN-02)
- [ ] `data/tuning.ts` não muda; gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(data): add the horde director tuning`

---

#### T6: Plano da rodada

**What**: `src/core/hordePlan.ts` com `UnitKind`, `Composition`, `HordeOverrides` (`quota`, `bodyCap`, `swarm`,
`swarmBurst`), `RoundPlan` (Data Models do design), `actOf(round)` (`ceil(r / 5)`, rodada < 1 vale 1),
`composition(round, ctx)` (neste passo só o ramo `swarmOn: false`: `{ waveSize(r), 0, 0 }`; chefe à parte),
`applyQuota(comp, quota)`, `planRound(round, ctx)` (cota, `lutadorCap = maxAlive ?? maxAliveFor(r)`, `bodyCap = min(6 +
2·(r−1), o.bodyCap ?? HORDE.bodyCap)`, `start` 9, `rateMul` 1, `stored` 12, `eliteAt` vazio, `forcedAffixes` `null`,
`burst` somado à cota, `veu` vazio, `veuHpMul` 1; chefe com cota 1 e `special: 'boss'`) e `budgetRate(round, elapsedMs,
plan)` (`min(1,5 + 0,15·(r−1) + 0,02·t, 6) × plan.rateMul`).
**Where**: `src/core/hordePlan.ts`
**Depends on**: T5
**Reuses**: `waveSize`, `maxAliveFor`, `isBossRound` (`core/waves.ts:27-63`)
**Requirement**: HRD-02, HRD-03, HRD-04, HRD-09, ATO-01

**Done when**:

- [ ] `tests/core/hordePlan.test.ts` (novo): `actOf` em 0, 1, 5/6, 10/11, 20/21, 25/26 (ATO-01); com `swarmOn: false` a
      cota é `waveSize(r)` da r1 à r40 sem chefe (HRD-09); chefe com cota 1 e composição zerada (HRD-02.4)
- [ ] `bodyCap` 6 na r1, 22 na r9, 32 na r14 e na r40, e o override (`bodyCap` 10 na r14 dá 10); `lutadorCap` igual a
      `maxAliveFor(r)` e ao `maxAlive` quando passado (HRD-04)
- [ ] `budgetRate`: 1,5 na r1 em t 0; 2,7 na r9 em t 0; + 0,02 por segundo; teto 6 (r30 em t 0 e r1 em t 300 s);
      `rateMul` 2 dobra (HRD-03)
- [ ] `applyQuota`: `quota` 3 com composição só de lutadores dá 3 lutadores; `burst` 8 soma 8 à cota
- [ ] Nenhum import de Phaser; gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): plan each horde round`

---

#### T7: Parâmetros de debug da horda

**What**: `src/core/hordeParams.ts` com `parseHordeOverrides(get: (name: string) => string | null): HordeOverrides`
lendo `quota` (inteiro ≥ 1), `bodyCap` (inteiro ≥ 1), `swarm` (`'0'` vira `false`) e `swarmBurst` (inteiro de 1 a 60);
valor inválido some do resultado (DBH-01). `elite` e `veu` entram na T36 e na T65.
**Where**: `src/core/hordeParams.ts`
**Depends on**: T6
**Reuses**: molde do `core/axisParam.ts` (F30) e do `parseBossAffixes` (F32)
**Requirement**: DBH-01

**Done when**:

- [ ] `tests/core/hordeParams.test.ts` (novo): `quota` 0 / 1 / `abc` / `2.5`; `bodyCap` 0 / 1 / 40; `swarm=0` dá `false` e
      `swarm=1` fica ausente; `swarmBurst` 0 / 1 / 60 / 61; nenhum parâmetro dá objeto vazio
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): parse the horde debug params`

---

#### T8: Diretor por orçamento com fenda

**What**: `src/core/horde.ts` ganha `class Horde implements RoundHorde` (`constructor(plan, rng, t = HORDE)`), com o
`update(dtMs)` na ordem do design (orçamento; fendas e nascimentos; limiares de elite de `plan.eliteAt`, vazios até a
T34; laço de nascimento com o tipo guardado e o sorteio ponderado; `swarmBurst` no 1º `update`), a elegibilidade com os
dois tetos contando fendas, a contagem por id e por tipo e o `view()`; `HordeOrder` ganha a variante `rift`; o
`SpawnKind` de `core/waves.ts` passa a `'enemy' | 'boss' | 'swarm' | 'elite'`. O chefe segue com a ordem `spawn` no 1º
`update`, sem fenda.
**Where**: `src/core/horde.ts`
**Depends on**: T6
**Reuses**: contagem por id do `WaveSpawner` (WAVE-06/08); `Rng` (`core/rng.ts`)
**Requirement**: HRD-03, HRD-04, HRD-05, HRD-06, HRD-07, HRD-09, FEN-01, FEN-07, DBH-03

**Done when**:

- [ ] `tests/core/horde.test.ts`: orçamento 9 no 1º `update`; guardado chega a 12 e nunca a 13 (HRD-03); com um plano
      sintético (cota de lutadores e de enxame) o teto de lutadores e o de corpos seguram no teto e recusam no teto + 1,
      fenda aberta conta nos dois (HRD-04)
- [ ] HRD-05: em 1000 simulações com seeds e abates aleatórios, nascidos + fendas ≤ cota em todo quadro; `cleared` só
      com `kills ≥ quota`, e a última unidade ainda em fenda segura o `cleared` (edge case)
- [ ] HRD-06: com orçamento e vaga a fenda abre no mesmo quadro, sem abate; HRD-07: mesma seed e mesmos abates dão as
      mesmas fendas, e um tipo sem vaga sai do sorteio
- [ ] HRD-09: com plano do ato I o 1º `update` abre exatamente 3 fendas; com `quota` 2, só 2 (edge case)
- [ ] FEN-01: o `spawn` da fenda sai em 600 ms acumulados e não em 599, com `rift` igual ao id da fenda; FEN-07: chefe
      sem fenda; `burst` abre as fendas no 1º `update` fora do orçamento e dos tetos; `queued = max(0, quota − kills −
      alive − rifting)` (DBH-03); `enemyDied` repetido conta uma vez
- [ ] Os testes do `WaveHorde` (T1) seguem verdes; gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): spend a pressure budget through rifts`

---

### Phase 3: Passo 1 — diretor no jogo (Run, fenda, cota no HUD)

#### T9: A `Run` usa o `Horde`

**What**: `src/core/run.ts`: `RunCommand` ganha `rift` (`round`, `id`, `kind`, `count`, `aerial`, `affixes`) e o `spawn`
ganha `rift`, `count` e `affixes`; `hordeRng` (`seed ^ 0xc2b2ae35`, campo e getter, criado no `resolveStart` no molde dos
outros streams); `RunOptions.horde?: HordeOverrides`; `enemyDied(id, kind = 'enemy')`; `get hordeView`; `makeHorde()`
(sem ramo na função da exceção) cria o `Horde` com `planRound(...)` e o `hordeRng` no lugar do `WaveHorde`. No
`hordeDirector.onCommand`, `rift` ainda não faz nada e o `spawn` segue escolhendo o ponto na hora (a fenda visível vem
na T12). Como todo nascimento passa a sair 600 ms depois, o `boot` do `scripts/smoke/fight-kit.mjs` espera o 1º
`spawnFx:` (até 90 quadros), o `scripts/smoke/spawn-pressure.smoke.mjs` lê a SPN-03 600 ms depois do 1º `update`, e o
`tests/core/run.test.ts` só troca a l.298 (os dois `update`, 0 e 600 ms, na mesma linha).
**Where**: `src/core/run.ts`
**Depends on**: T8 (fase 2)
**Reuses**: streams com sal (`run.ts:297-307`), `planRound` (T6), `Horde` (T8)
**Requirement**: HRD-01, HRD-05, HRD-08, FEN-01

**Done when**:

- [ ] `tests/core/runHorde.test.ts` (novo): `rift` e depois `spawn` do mesmo id 600 ms depois; a rodada fecha quando os
      abates chegam à cota; `hordeRng` igual a `new Rng(seed ^ 0xc2b2ae35)` e o sal distinto dos de hoje e dos da F30 a
      F35 (lista conferida no código mergeado); consumir o `hordeRng` não muda nenhum outro stream; `RunOptions.horde`
      (`quota`) chega ao plano
- [ ] `tests/core/run.test.ts` com o mesmo número de linhas efetivas e verde
- [ ] Smokes `spawn-pressure`, `run-loop`, `boot`, `fight`, `defense`, `enemy-react`, `enemy-died`, `telegraph`, `targets`,
      `armed`, `drops`, `held-item`, `kokusen`, `techniques`, `tech`, `world-run`, `world-traverse`, `fxlab` e `no-debug`
      verdes (o que procurar inimigo antes de 600 ms ganha a espera do `fight-kit` na própria linha)
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(core): run each round through the pressure horde`

---

#### T10: Sai o `WaveSpawner`

**What**: `src/core/waves.ts` perde o `WaveSpawner` e o `SpawnOrder` (l.65-147); `src/core/horde.ts` perde o `WaveHorde`;
os casos do `WaveSpawner` em `tests/core/waves.test.ts` (l.93-258) saem, e cada regra que eles provavam (WAVE-06/08,
estouro, teto) já tem caso no `tests/core/horde.test.ts` (T8) ou ganha um nesta tarefa; ficam `waveSize`,
`maxAliveFor`, `isBossRound` e `farthestPoint`.
**Where**: `src/core/waves.ts`
**Depends on**: T9
**Reuses**: —
**Requirement**: HRD-01

**Done when**:

- [ ] Tabela no commit: cada caso removido de `waves.test.ts` e o caso do `horde.test.ts` que cobre a mesma regra
- [ ] Contagem de testes antes e depois anotada; nenhum caso removido sem par
- [ ] Nenhum import restante de `WaveSpawner`/`WaveHorde` (`grep`); gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `refactor(core): drop the wave spawner`

---

#### T11: Snapshot da horda

**What**: `src/game/hordeSnapshot.ts` (novo) com `HordeSnapshot` (DBH-02; `elites` vazio, `veil` `null` e `veu` com
`rules` vazio e `hpMul` 1 até as fases que os enchem; `marks` para o FEN-03); `GameSnapshot.horde` no `debugApi.ts`
(+2); `hordeDirector.runSnapshot()` (`alive` = todos os corpos vivos, `queued`, `maxAlive` = teto de lutadores, DBH-03)
e `snapshotFields()` (`horde` a partir do `run.hordeView` e do mapa de pontos de fenda); em `scenes/test/snapshot.ts`,
`run: this.s.horde.runSnapshot(),` no lugar do objeto de 8 linhas e `...this.s.horde.snapshotFields(),`.
**Where**: `src/game/hordeSnapshot.ts`
**Depends on**: T9
**Reuses**: molde do `powerSnapshot.ts` (F29); `debugSnapshot` (`snapshot.ts:137-166`)
**Requirement**: DBH-02, DBH-03

**Done when**:

- [ ] `tests/game/debugApi.test.ts`: literal com `horde` obrigatório (`act`, `quota`, `kills`, `alive`, `bodyCap`,
      `lutadorCap`, `budget`, `special`, `rifts`, `elites`, `veil`, `veu`, `marks`)
- [ ] `debugSnapshot` com menos linhas que antes (função da exceção de tamanho encolhe); `TestScene` sem linha nova
- [ ] Smokes `boot`, `no-debug`, `run-loop` e `spawn-pressure` verdes (`run.alive`, `run.queued`, `run.maxAlive` seguem)
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(debug): report the horde state in the snapshot`

---

#### T12: Fenda no mundo

**What**: `src/game/RiftFx.ts` (novo: `open(id, x, y, aerial)`, `born(id)`, `update(dtMs, worldView, toScreen)`, `clear()`,
`debug()`; um `Graphics` no mundo a −4 e um na `uiLayer` para a marca de borda, cores `b`, `v`, `u`, `U` na grade de 2
px); `hordeDirector.onRift` (lutador e elite: `pickEnemySpawnPoint` na abertura, guarda o ponto por id, `rifts.open`,
evento `rift:<id>`), `onSpawn` pelo `rift` (ponto guardado; fenda fecha em 150 ms; sem ponto conhecido não faz nada),
`reset()` no `startRun`, `onRoundStart` descarta fendas (FEN-05), `onGameOver` descarta sem nascimento e
`onSceneCreate()` recria o `RiftFx` na cena atual; o `uiSetup.addHud` chama `this.s.horde.onSceneCreate()` (+1). Nasce
`scripts/smoke/horde.smoke.mjs` com a parte 1.
**Where**: `src/game/RiftFx.ts`
**Depends on**: T11
**Reuses**: `SPAWN_VIEW_MARGIN` e `pickEnemySpawnPoint` (`spawner.ts:19-48`); `uiLayer` (AD-003); `fight-kit.mjs`, `lib.ts`
**Requirement**: FEN-01, FEN-02, FEN-03, FEN-05, FEN-06, FEN-07, DBH-04

**Done when**:

- [ ] `horde.smoke.mjs` parte 1 (`?debug&hd=1&area=modular&seed=1`): todo id novo de `enemies` tem `rift:<id>` 36
      quadros (± 1) antes do `spawnFx:<id>`, no mesmo ponto (`horde.rifts[].x/y` contra a posição do inimigo no
      nascimento) e fora da câmera com a margem de 32 px (FEN-06); com hitstop ou loja o `msLeft` não anda (FEN-01.2);
      com o player parado de costas para a fenda, `horde.marks` tem a marca do lado dela (FEN-03); a r5 nasce o chefe
      sem `rift:` (FEN-07)
- [ ] Fenda aberta e `R` (ou `roundStart`) → nenhum `spawnFx` daquela fenda depois (FEN-05); depois do `R` o `RiftFx`
      desenha na cena nova (smoke `world-restart` verde)
- [ ] Conferência em HD: captura da fenda no chão crescendo (início, meio, cheia), fechando em 150 ms, e da marca de
      borda; toda cor da `PALETTE` (FEN-02)
- [ ] Smokes `horde`, `world-restart`, `fxlab` (nenhuma fenda no laboratório) e `spawn-pressure` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(scene): announce every arrival with a rift`

---

#### T13: Contador de abates no HUD

**What**: `hordeDirector.counterText()`: `Abates: k/q` na rodada comum (`k` os abates da rodada, `q` a cota), `Chefe` na
rodada de chefe; o `update(dt)` passa a usá-lo no `hud.setRun` (escondido fora da rodada e no laboratório); o
`scripts/smoke/hud.smoke.mjs` (l.46-49) passa a esperar `Abates: k/q` com os números do `horde` do snapshot.
**Where**: `src/scenes/test/hordeDirector.ts`
**Depends on**: T11
**Reuses**: `Hud.setRun` com `counter` (T3)
**Requirement**: HRD-10, HRD-12

**Done when**:

- [ ] Smoke `hud`: r1 lê `Abates: 0/6` e sobe 1 a cada abate; r5 lê `Chefe`; na konbini e no `fxlab` o contador some
- [ ] `Hud.ts` e `TestScene` sem linha nova
- [ ] Smokes `hud`, `run-loop` e `boss` verdes; gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(hud): count the round kills against the quota`

---

#### T14: Parâmetros da horda no jogo

**What**: `hordeDirector.runOptions()` passa `horde: parseHordeOverrides(debugParam)` junto do `maxAliveOverride`, só com
`?debug`; `horde.smoke.mjs` ganha a parte 2.
**Where**: `src/scenes/test/hordeDirector.ts`
**Depends on**: T12
**Reuses**: `parseHordeOverrides` (T7), `debugParam` (`params.ts:5`)
**Requirement**: DBH-01, HRD-05, HRD-12

**Done when**:

- [ ] `horde.smoke.mjs` parte 2: `quota=3&swarm=0` → `horde.quota` 3, HUD `Abates: 0/3` e a rodada fecha no 3º abate
      (HRD-05); `quota=abc` → cota de hoje (DBH-01); `bodyCap=4` → `horde.bodyCap` 4 lido do `Horde` que a `Run` montou
      (L-043); tecla de morte com fenda aberta → nenhum `spawnFx` depois (edge case); sem `?debug` os parâmetros são
      ignorados (`no-debug`)
- [ ] Fim do passo 1: smokes `horde`, `spawn-pressure`, `hud`, `run-loop`, `boot`, `shop`, `world-run`, `world-traverse`,
      `world-restart`, `fight`, `defense`, `enemy-react`, `enemy-died`, `telegraph`, `targets`, `armed`, `drops`,
      `held-item`, `kokusen`, `techniques`, `tech`, `fxlab` e `no-debug` verdes; `TestScene` com 390 linhas efetivas
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: build
**Commit**: `feat(scene): let debug params shape the horde`

---

### Phase 4: Passo 2 — enxame, regra pura

#### T15: Números do enxame

**What**: `src/data/horde.ts` ganha `SwarmTuning` e `SWARM` (`hp` `{ base: 12, min: 12, max: 20 }`, `body` `{ w: 18, h: 24
}`, `speed` 95, `offsetPx` 14, `rangePx` 40, `windupMs` 300, `biteMs` 120, `lungePx` 48, `restMs` 1000, `damage` 5,
`force` 2, `hitStunMs` 150, `parry` `{ pushPx: 40, stunMs: 500 }`, `dieMs` 300, `gate` `{ max: 3, gapMs: 200 }`, `aerial`
`{ chance: 0.3, liftPx: 96 }`, `minDistPx` 160, `bite` `{ offsetX: 14, offsetY: -2, width: 20, height: 14 }`), e o teste do
alcance dos golpes contra o corpo de 18 × 24.
**Where**: `src/data/horde.ts`
**Depends on**: None
**Reuses**: `MOVES` (`data/moves.ts`), corpo do player (`textures.ts:84`)
**Requirement**: ENX-02, ENX-05, ENX-06, ENX-07, ENX-08, ENX-09, ENX-13

**Done when**:

- [ ] `tests/data/horde.test.ts`: cada número do `SWARM` conferido com a spec
- [ ] `tests/game/swarmReach.test.ts` (novo, ENX-09): para todo golpe de chão do `MOVES`, a hitbox do player de pé encosta
      no corpo de 18 × 24 no mesmo chão, colado à frente; o teste falha se o corpo tiver 22 px de altura (prova que o
      limite de 24 importa)
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(data): add the swarm tuning`

---

#### T16: Regras pequenas do enxame

**What**: `src/core/swarm.ts` com `swarmHp(hpMul, t = SWARM)` (`clamp(round(12 × hpMul), 12, 20)`), `groupOffset(index,
count, t)` (`(index − (count − 1) / 2) × 14`), `pickSwarmPoint({ points, playerX, minDistPx, maxReach?, rng })` (sorteia
entre os `E` a pelo menos 160 px na horizontal e dentro do alcance; sem nenhum, o mais distante) e `swarmFrame(state, ms,
dieMs?)` (nome do quadro, com os tempos do design).
**Where**: `src/core/swarm.ts`
**Depends on**: T15
**Reuses**: `farthestPoint` (`core/waves.ts`), `Rng`, `multipliersFor` (F30) só no teste
**Requirement**: ENX-01, ENX-02, ENX-04, ENX-13, ENX-14

**Done when**:

- [ ] `tests/core/swarm.test.ts` (novo): HP 12 na r1, 16 na r6, 20 na r19 e nunca fora de 12..20 até a r40, com o
      `hpMul` da F30 (ENX-02.1); o `chute` base (18) mata em até 2 golpes da r1 à r40 e em 1 na r1 (ENX-02.2)
- [ ] `groupOffset` com 4 e 6 membros (simétrico, passo de 14 px) (ENX-04)
- [ ] `pickSwarmPoint`: ponto a 159 px fora e a 160 px dentro; fora do alcance fora; sem nenhum a 160 px, o mais distante
      (ENX-13)
- [ ] `swarmFrame`: os 13 nomes da ENX-14 saem nos estados e tempos do design; `windup` alterna a cada 60 ms; `die` em 3
      quadros de 100 ms
- [ ] Nenhum import de Phaser; gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the swarm hp, offset, spawn point and frame rules`

---

#### T17: IA e limitador do enxame

**What**: `src/core/swarm.ts` ganha `SwarmState`, `SwarmIntent`, `class SwarmBrain` (`chase | windup | bite | rest | stun |
dead`; `update(dtMs, dxToTarget, distToPlayer, gate)`, `stun(ms)`, `die()`) e `class SwarmGate` (`canWindup()`,
`noteWindup(id)`, `release(id)`, `update(dtMs)`, `activeCount`), separado do `AttackGate`.
**Where**: `src/core/swarm.ts`
**Depends on**: T16
**Reuses**: molde do `EnemyAI`/`AttackGate` (`core/enemyAI.ts`, `core/attackGate.ts`) só como referência de forma
**Requirement**: ENX-04, ENX-05, ENX-06, ENX-07, ENX-08

**Done when**:

- [ ] `tests/core/swarm.test.ts`: persegue só em x a `95 × speedMul` px/s rumo ao alvo com o deslocamento (ENX-04);
      com o player a 40 px e vaga entra em `windup`, a 41 px não; `windup` dura 300 ms (299 ainda em `windup`), `bite`
      120 ms com investida de 48 px no sentido do player, `rest` 1000 ms (ENX-05)
- [ ] `SwarmGate`: 3 em ataque aceitos e o 4º recusado; 199 ms depois de um `windup` recusa, 200 ms aceita; `release`
      libera a vaga (ENX-06)
- [ ] `stun(500)` (parry, ENX-07) e `stun(150)` (golpe aceito, ENX-08) param a perseguição pelo tempo exato; `dead` não
      sai do estado
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the swarm brain and its attack limiter`

---

#### T18: Composição com enxame e calibragem da renda

**What**: `src/core/hordePlan.ts`: `composition` com `swarmOn: true` (`enemy = min(6 + 2·(r−1), 14)`, `swarm = 0` até a r5
e `min(8 + 3·(r−6), 40)` da r6, `elite` 0 até a T34; `swarm=0` zera a parte do enxame), `group` do plano por
`HORDE.group[ato]`, `swarmDropMean(round, comp)` e `swarmHealFactor(round, comp)`; o `planRound` passa a usar `swarmOn:
true` por padrão.
**Where**: `src/core/hordePlan.ts`
**Depends on**: T15
**Reuses**: `waveSize` (`W(r)`), `expectedIncome` (`core/economy.ts:10-18`, só leitura)
**Requirement**: HRD-02, HRD-06, HRD-11, ENX-03, ENX-12

**Done when**:

- [ ] `tests/core/hordePlan.test.ts`: cota 6, 12, 14, 22 e 25 nas r1, r4, r5, r6 e r7 (r5 sem enxame e r6 com); grupo 4
      no ato II, 5 no III, 6 do IV em diante (ENX-03); `swarm=0` na r9 dá só lutadores (edge case, `m` não usado)
- [ ] HRD-11: da r1 à r40 sem chefe, `3·L + 8·E + m·S` = `3·W(r)` com folga 0,01; `expectedIncome` devolve os valores de
      hoje (tabela fixa no teste); `swarmDropMean` 0,75 na r6; `swarmHealFactor` = `(W − L − E) / S`
- [ ] `tests/core/horde.test.ts`: HRD-06 com o plano real da r9 (sem elite neste passo): 20 s sem abate e os corpos vivos
      com fendas chegam a 22
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): compose rounds with the swarm and keep the income`

---

#### T19: Drop do membro do enxame

**What**: `src/core/loot.ts` ganha `swarmDrop(round, mean, healFactor)`: cura com `healFactor × chance efetiva de cura`,
depois `floor(mean)` fragmentos mais 1 com chance `mean − floor(mean)`; nunca Elixir nem ferramenta; mesmo stream de
loot e ordem "cura, depois fragmentos" (ECO-17).
**Where**: `src/core/loot.ts`
**Depends on**: None
**Reuses**: `Loot.enemyDrop` (`loot.ts:74-98`), chance efetiva de cura de hoje
**Requirement**: ENX-12

**Done when**:

- [ ] `tests/core/loot.test.ts`: média 0,75 na r6 em 10 mil sorteios (±0,02); `mean` 0 nunca dá fragmento; `mean` 2,0
      dá sempre 2; nenhuma saída tem Elixir ou ferramenta; a taxa de cura é `healFactor × chance` (±0,01 em 10 mil); a
      cura é sorteada antes dos fragmentos (ordem do stream)
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): roll the swarm member drop`

---

### Phase 5: Passo 2 — enxame no jogo e medição

#### T20: Folha provisória do enxame

**What**: `src/game/art/hd/swarmSheet.ts` (novo) com `swarmSheet(): HdSheet` (célula 64 × 56 texels, os 13 quadros da
ENX-14), `SWARM_ORIGIN` `{ x: 0.5, y: 1 }`, `SWARM_SCALE` 0,5 e `SWARM_FRAMES`; desenho de maldição pequena e baixa
(corpo de bolha ~36 × 30 texels, quatro patas que alternam no movimento, boca que abre na mordida, contorno `k` de 1
texel, olhos `W` e `R` no preparo e na mordida, rampas `u`/`U`/`v`); `TEX.swarm = 'enemy-swarm'` em `textures.ts`;
`art/index.ts` registra a folha e reexporta `SWARM_ORIGIN` e `SWARM_SCALE` (ponto de troca para o atlas).
**Where**: `src/game/art/hd/swarmSheet.ts`
**Depends on**: None
**Reuses**: `HdSheet`, `registerIndexedSheet`, molde do `art/hd/atlas/sleeperSheet.ts`; `PALETTE`
**Requirement**: ENX-14

**Done when**:

- [ ] `tests/game/swarmSheet.test.ts` (novo): os 13 nomes de `SWARM_FRAMES` existem na folha; célula 64 × 56; origem no
      meio da base; todo quadro tem contorno `k`, olhos `W` (ou `R` no `windup` e no `bite`); toda cor na `PALETTE`;
      `art/index.ts` reexporta `SWARM_ORIGIN` e `SWARM_SCALE` (o `SwarmEnemy` lê dali, ENX-14.2)
- [ ] Prancha da folha gerada (`tools/hd-boards.mjs` ou `tools/sprite-preview.mjs`) e olhada: silhueta legível a 1×,
      patas trocando de lado entre os quadros de movimento sem salto
- [ ] Comentário no topo do arquivo com a lista de quadros, a célula e a origem que o prompt do Nano Banana e o
      `tools/sprite-atlas.mjs` (`assets/enxame/quadros/`, `assets/enxame/atlas.json`) seguem
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(art): draw a placeholder swarm sheet`

---

#### T21: O enxame nasce em grupo e persegue

**What**: `src/game/SwarmPack.ts` (novo: `spawnGroup(at, count, aerial, tuning)`, um único ouvinte `beforeupdate` registrado
no construtor e tirado no `SHUTDOWN`, `update(dtMs, playerX)` com a IA da T17 só na perseguição e nos quadros (a mordida
abre hitbox na T25), `targets()`, `byId(id)`, `clear()`, `snapshot()`) e `src/game/SwarmEnemy.ts` (novo: corpo
`rectangle` 18 × 24 sem `chamfer`, `inertia` infinita, `Filters.enemy`, `tagBody`, sprite `enemy-swarm` com `BodyRenderPos`,
`applyStep()`; recusa todo golpe até a T22); `hordeDirector.onRift` do enxame (`pickSwarmPoint` com o `spawnRng`, aéreo
96 px acima), `onSpawn` do enxame (uma `curseSmoke` para o grupo, um `spawnFx:<id>` por membro), `onSceneCreate` recria o
`SwarmPack`; `combat.updateEnemies` termina com `this.s.horde.updateUnits(dt)` (+1); `SwarmSnapshot` e `swarm` no
`GameSnapshot`. `horde.smoke.mjs` ganha a parte 3.
**Where**: `src/game/SwarmPack.ts`
**Depends on**: T20
**Reuses**: `SwarmBrain`, `groupOffset`, `swarmHp`, `pickSwarmPoint`, `swarmFrame` (T16, T17); `bodyTags.ts`; `fx.curseSmoke`
(`fx.ts:113`); `BodyRenderPos` (AD-019)
**Requirement**: ENX-01, ENX-03, ENX-04, ENX-13, ENX-14, FEN-04, HPF-03, HRD-06, DBH-02

**Done when**:

- [ ] `tests/game/debugApi.test.ts`: literal com `swarm` (`id`, `x`, `y`, `hp`, `maxHp`, `state`)
- [ ] `horde.smoke.mjs` parte 3, `round=6&seed=1`: um grupo de 4 nasce de uma fenda com uma `curseSmoke` só (FEN-04); cada
      membro com `maxHp` 16 no `swarm[]`; o ponto ficou a 160 px ou mais do player (ENX-13); os membros andam rumo ao
      player só em x, cada um com o seu deslocamento (ENX-04); o `hurtRect` do membro, lido do corpo, tem 18 × 24 (L-043)
- [ ] `round=9&enemyGuard=0`: HUD `Abates: 0/31` (a cota da r9 sem elite neste passo) e mais de 3 corpos vivos antes do
      1º abate (HRD-06)
- [ ] Fenda aérea (seed que a sorteia, anotada no smoke): o grupo nasce 96 px acima do ponto `E` e cai pela gravidade
      até o chão de baixo, mesmo sob plataforma (edge case)
- [ ] O mundo Matter tem 1 ouvinte `beforeupdate` do pacote com 4 ou com 20 membros (HPF-03, contado no smoke pelo
      `matter.world.engine.events`); `R` com o enxame vivo deixa a cena nova sem membros (`world-restart`)
- [ ] Conferência em HD do membro em movimento virado para os dois lados (captura e passada jogando)
- [ ] Smokes `horde`, `world-restart`, `spawn-pressure` e `fxlab` verdes; `combat.ts` abaixo de 400 linhas efetivas
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(scene): spawn the swarm in groups that chase the player`

---

#### T22: O membro apanha, morre e conta

**What**: `SwarmEnemy.receiveHit` (morto recusa; banda F29 só tira vida; golpe comum tira vida, `stun(150)` e o empurrão
`hit.force × direção`; vida 0 marca `dead`), `SwarmPack.update` tira o corpo do morto da física no mesmo quadro, toca
os 3 quadros de dissolução em 300 ms e destrói o sprite (sem ragdoll); `onDied(member, x, y)` chama
`combat.onEnemyDied(id, x, y, 'swarm')` (o `kind` chega à `run.enemyDied`) e o drop do membro no `hordeDirector`
(`loot.swarmDrop` com o `swarmDropMean` e o `swarmHealFactor` da rodada + `drops.applyDrop`).
**Where**: `src/game/SwarmEnemy.ts`
**Depends on**: T21
**Reuses**: `Drops.applyDrop` (`drops.ts:63-80`), `combat.onEnemyDied` (`combat.ts:73-77`), `swarmDrop` (T19)
**Requirement**: ENX-02, ENX-08, ENX-12, HPF-04, HRD-05

**Done when**:

- [ ] `horde.smoke.mjs` parte 4 (`round=6&seed=1&enemyGuard=0`): um `chuteGiratorio` (18) mata um membro de 16 (ENX-02);
      no quadro da morte o corpo some do mundo Matter e nenhum corpo de ragdoll nasce (contagem de corpos antes e depois,
      HPF-04); o sprite passa pelos 3 quadros `enxame-die-*` em 300 ms (ENX-08)
- [ ] Golpe que não mata: `state` `stun` por 150 ms e o membro recua no sentido do golpe (ENX-08)
- [ ] Cada membro morto soma 1 em `horde.kills` e no HUD; nenhum Elixir nem ferramenta no chão depois de matar 20 membros
      (ENX-12)
- [ ] Smokes `horde`, `drops`, `enemy-died`, `run-loop` e `power` verdes; gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(scene): let swarm members take hits, dissolve and drop`

---

#### T23: Técnicas e Domínio miram o enxame

**What**: `techDirector.ts:18-20` troca `this.s.enemies` por `this.s.horde.targets()` (lutadores, elites e membros
vivos); os laços de alvo que leem `this.s.enemies` nas técnicas e no Domínio (F30 `techStats`/eixos, F31 `domainDirector` e
`domainPowers`, F33) passam a ler a mesma lista; `hordeDirector.targets()` monta o array uma vez por quadro; a morte do
membro não pede hitstop, câmera lenta nem tremida.
**Where**: `src/scenes/test/techDirector.ts`
**Depends on**: T22
**Reuses**: `Hit.band` e `MicroBudget` (F29), `DamageNumbers` (teto de 12)
**Requirement**: ENX-10, ENX-15

**Done when**:

- [ ] `horde.smoke.mjs` parte 5 (`round=6`): o Vermelho e o Azul acertam membros do enxame (HP cai no `swarm[]`); a
      ativação do Domínio (`domain=santuario&charge=100`) tira vida dos membros no raio como comuns; cada acerto de técnica
      em membro sai com a banda da F29 (`power` do snapshot) e nenhuma morte de membro muda `hitstopMs`, `slowMo` ou a
      tremida da câmera (ENX-15)
- [ ] Smokes `horde`, `tech`, `techniques`, `kokusen`, `red-anime`, `domain`, `fxlab` e `targets` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(scene): aim techniques and the domain at the swarm`

---

#### T24: Golpe em grupo conta uma vez

**What**: `SwarmPack.repeatHit(hit, target)` (`true` do 2º membro em diante com o mesmo `swingId`; golpe sem `swingId`
nunca repete); `combat.onConnect` pergunta `this.s.horde.swarm.repeatHit(hit, target)` e, com `repeat`, pula energia,
`build.onMeleeHit` e combo e troca o impacto amaldiçoado pela faísca pequena (+3); o membro nunca entra no
`AttackGate`, nunca vira o foco da postura e nunca é finalizável.
**Where**: `src/scenes/test/combat.ts`
**Depends on**: T22
**Reuses**: `Hit.swingId` (`core/hit.ts:50`), `fx.spark` (`fx.ts:193`)
**Requirement**: ENX-11

**Done when**:

- [ ] `horde.smoke.mjs` parte 6: um chute com 3 membros encostados à frente acerta 2 (AD-015, `maxTargets`), o combo sobe
      1, a energia sobe uma vez e `build.onMeleeHit` conta 1 (contador do snapshot da F30); o 2º membro mostra a faísca
      pequena e não o impacto amaldiçoado (evento de impacto contado uma vez)
- [ ] Com lutadores nada muda: smokes `fight`, `combo-*`, `impact`, `feel` e `finisher` verdes; o finalizador nunca mira
      membro e o foco da postura (`posture.focus`) nunca aponta para um id de `swarm`
- [ ] Complexidade do `onConnect` ≤ 15; gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(combat): count a strike on a swarm group once`

---

#### T25: Mordida, limitador e parry

**What**: `SwarmEnemy` abre um `AttackHitbox` próprio no `openBite` (`round(5 × damageMul)`, força 2, tipo `white`) e
fecha no `closeBite`; o `SwarmPack` passa o `SwarmGate` (3 ataques, 200 ms) a cada membro; `combat.attackerOf` procura em
`this.s.horde.swarm.byId(ownerId)` (+2) e o parry da mordida chama `member.parried()` (empurra 40 px e `stun(500)`); o
`windup` pisca `w` pelo `swarmFrame`.
**Where**: `src/game/SwarmEnemy.ts`
**Depends on**: T21
**Reuses**: `AttackHitbox` (`hitbox.ts:55-108`), `hitFieldsFor('white')` (AD-020), defesa do player de hoje
**Requirement**: ENX-05, ENX-06, ENX-07

**Done when**:

- [ ] `horde.smoke.mjs` parte 7 (`round=6&maxAlive=1`): com o player parado, a mordida tira `round(5 × damageMul)` da vida
      do player; nunca mais de 3 membros em `windup`/`bite` no mesmo quadro (amostrado a cada quadro por 10 s) e nunca 2
      `windup` com menos de 200 ms (ENX-06); segurando a guarda, a mordida é bloqueada (tipo `white`)
- [ ] Parry da mordida (ajudante de defesa do `fight-kit`): o membro recua 40 px (±2) e fica em `stun` 500 ms; a janela
      de Contra do player abre como contra o lutador (ENX-07)
- [ ] Smokes `horde`, `defense`, `telegraph` e `fight` verdes; gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(scene): let swarm members bite under a shared limiter`

---

#### T26: Medição com muitos corpos e o teto fixado

**What**: `scripts/smoke/spawn-pressure-horde.smoke.mjs` (novo) mede, com
`?debug&hd=1&area=modular&seed=1&round=6&noshop=1&enemyGuard=0&swarmBurst=<n>&maxAlive=1&quota=1`, 300 quadros de
`__game.step(16)` (num único `page.evaluate`) e 120 de `step(16)` + `render()` para `n` 8, 16, 24, 32 e 40, com a guarda
segura, e imprime p50 e p95 de cada coluna; `HORDE.bodyCap` em `src/data/horde.ts` passa ao maior `n` com p95 de `step`
≤ 1,5 × o p95 com 8, nunca abaixo de 24; o smoke passa a falhar se, com o teto fixado, o p95 passar de 1,5× o de 8.
**Where**: `scripts/smoke/spawn-pressure-horde.smoke.mjs`
**Depends on**: T22, T25
**Reuses**: `__game.step` e `render` (`debugApi.ts:428-450`); `lib.ts`
**Requirement**: HPF-01, HPF-02, HPF-04

**Done when**:

- [ ] A tabela p50/p95 de `step` e de `step + render` por `n` sai no console; a linha só vale com o player e os `n`
      corpos vivos no fim (o smoke falha com mensagem clara se não)
- [ ] `HORDE.bodyCap` fixado pelo critério; `tests/data/horde.test.ts` atualizado com o número; a tabela e o número vão
      para `.specs/features/hordas-em-atos/validation.md` (seção "Medição do passo 2", criada aqui)
- [ ] Se 32 não passar, segue a ordem de corte do design (teto menor ≥ 24; pool de sprites; fora da física pede o usuário)
      e o caminho tomado vai para o `validation.md`
- [ ] Fim do passo 2: smokes `horde`, `spawn-pressure-horde`, `spawn-pressure`, `impact`, `feel`, `tech`, `kokusen`,
      `red-anime`, `fxlab`, `drops`, `power` e `targets` verdes; UAT curto do usuário na r9 e na r13 com Fúria e com
      Domínio (risco "leitores de abate saturam") anotado no `validation.md`
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: build
**Commit**: `perf(horde): measure live bodies and fix the body cap`

---

### Phase 6: Passo 3 — refatorações e regra pura da elite

#### T27: Ciclo de chaves do contorno sai do chefe

**What**: F32 `src/core/bossAffix.ts` exporta `cycleKeyAt(keys, ms, swapMs)` (o ciclo de chaves que hoje mora dentro do
`outlineKeyAt`, l.195-203); o `outlineKeyAt` passa a filtrar as chaves e chamá-lo, sem mudar o resultado.
**Where**: `src/core/bossAffix.ts`
**Depends on**: None
**Reuses**: `outlineKeyAt` (F32)
**Requirement**: ELT-08

**Done when**:

- [ ] O teste do `bossAffix` da F32 (599/600 ms) segue igual e verde
- [ ] Casos novos de `cycleKeyAt` no mesmo arquivo de teste (ou em `tests/core/cycleKey.test.ts` se o da F32 estiver na
      lista de exceções): 1 chave fixa; 2 chaves trocando em 599/600 ms e voltando em 1200 ms; lista vazia devolve `null`
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `refactor(core): extract the outline key cycle from the boss affixes`

---

#### T28: Contorno de afixo para qualquer sprite

**What**: F32 `src/game/boss/AffixOutline.ts` recebe no construtor o sprite a seguir e uma função de chave (`(ms) =>
string | null`) em vez de depender do `Boss`; o chefe passa o próprio sprite e `outlineKeyAt`. Se a F32 já tiver deixado o
construtor genérico, a tarefa só confere e registra no commit que não houve mudança.
**Where**: `src/game/boss/AffixOutline.ts`
**Depends on**: T27
**Reuses**: `TintModes.FILL` (AD-023), passe de contorno da F32 (BRD-03)
**Requirement**: ELT-08

**Done when**:

- [ ] Smokes `boss` e os do contorno de afixo da F32 (nome reconferido no código mergeado) verdes sem mudança
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(game): let the affix outline follow any sprite`

---

#### T29: Multiplicador extra de vida na escala

**What**: `src/core/difficulty.ts`: `scaleFor(round, base, t, hpExtra = 1)` com `Math.round(base.brain.maxHp * m.hp *
hpExtra)` (o extra entra antes do único arredondamento); com 1 o número é o de hoje, bit a bit.
**Where**: `src/core/difficulty.ts`
**Depends on**: None
**Reuses**: `multipliersFor`, `scaleFor` (`difficulty.ts:41-64`, com a escala da F30)
**Requirement**: ELT-02, ATO-04, VRB-03

**Done when**:

- [ ] `tests/core/difficulty.test.ts`: sem o 4º argumento e com `hpExtra` 1, o `maxHp` da r1 à r40 é idêntico ao de antes
      (tabela gerada antes da mudança); com 2,5 na r8 é `round(60 × hpMul(8) × 2,5)`; com 1,3 é `round(60 × hpMul × 1,3)`
      (um arredondamento só)
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `refactor(core): accept an extra hp multiplier in the enemy scale`

---

#### T30: Números e nomes da elite

**What**: `src/data/elites.ts` (novo) com `EliteAffix`, `ELITE_AFFIX_IDS` (ordem fixa do sorteio), `ELITE_AFFIXES` (nome no
feminino e cor do contorno: Escudada `c`, Explosiva `a`, Rápida `A`, Regeneradora `G`) e `ELITE` (`hpMul` 2,5, `scale` 1,2,
`fragments` 8, `at` `[0.4, 0.7]`, `outlineNone` `U`, `outlineSwapMs` 600, `shield` `{ fraction: 0.4, heavyMul: 2 }`, `blast`
`{ radiusPx: 72, warnMs: 700, damage: 12, mul: 1.5 }`, `rapido` `{ speed: 1.4, windup: 0.8, rest: 0.6 }`, `regen` `{
delayMs: 2000, tickMs: 200, fraction: 0.008 }`).
**Where**: `src/data/elites.ts`
**Depends on**: None
**Reuses**: molde de `data/horde.ts` (T5); `PALETTE`
**Requirement**: ELT-02, ELT-04, ELT-05, ELT-06, ELT-07, ELT-08

**Done when**:

- [ ] `tests/data/elites.test.ts` (novo): cada número conferido com a spec; os 4 nomes no feminino; toda cor de contorno
      (e `U`) existe na `PALETTE`
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(data): add the elite affixes and tuning`

---

#### T31: Afixos, ajuste, rótulo e contorno da elite

**What**: `src/core/elite.ts` (novo) com `drawAffixes(rng, act)` (0 no ato II, 1 no III, 2 distintos do IV em diante,
uniformes; consome sempre 2 sorteios), `eliteTuning(base, affixes, t = ELITE)` (`rapido` ×1,4 / ×0,8 / ×0,6; `escudo` põe
`brain.shield = round(0,4 × maxHp)`), `eliteLabel(affixes)` ("Elite · Escudada · Rápida"; "Elite" sem afixo) e
`eliteOutlineKeys(affixes)` (`U` sem afixo).
**Where**: `src/core/elite.ts`
**Depends on**: T30
**Reuses**: `EnemyBase` (`core/difficulty.ts`), `Rng`
**Requirement**: ELT-02, ELT-03, ELT-06, ELT-08

**Done when**:

- [ ] `tests/core/elite.test.ts` (novo): 0/1/2 afixos nos atos II/III/IV e no ato VIII; 2 afixos sempre distintos; em
      1000 seeds cada afixo sai entre 22% e 28% das vezes; o stream anda 2 sorteios em todo ato (ELT-03)
- [ ] `eliteTuning` com `rapido`: `windupMs` 450 → 360 e `restMs` 800 → 480, `chaseSpeed` ×1,4 (ELT-06); com `escudo`,
      `shield` = `round(0,4 × maxHp)` sobre o `maxHp` já com o ×2,5 (ELT-02, ELT-04)
- [ ] `eliteLabel` e `eliteOutlineKeys` para 0, 1 e 2 afixos (ELT-08)
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): draw elite affixes and tune the elite`

---

#### T32: Escudo, regeneração e explosão como regra pura

**What**: `src/core/elite.ts` ganha `class EliteShield` (`value`, `absorb(damage, heavy)` devolve o que passa para o HP:
`consumed = min(damage, ceil(shield / f))`, `shield = max(0, shield − consumed × f)`, `f` 2 no `heavy`), `class RegenClock`
(`onDamage()`, `update(dtMs, hp, maxHp)`: depois de 2000 ms sem dano, `max(1, round(0,008 × maxHp))` a cada 200 ms
enquanto `hp < maxHp`), `inBlast(player, center, radius)` (borda inclusa) e `blastDamage(damageMul)` (`round(12 ×
damageMul × 1,5)`).
**Where**: `src/core/elite.ts`
**Depends on**: T31
**Reuses**: `Vec2` (`core/hit.ts`)
**Requirement**: ELT-04, ELT-05, ELT-07

**Done when**:

- [ ] `tests/core/elite.test.ts`: escudo 40 com golpe leve de 10 fica 30 e não passa nada; golpe forte de 10 tira 20; golpe
      forte de 30 com escudo 40 consome 20, zera o escudo e passa 10; escudo 0 devolve o dano inteiro; chip (leve) tira
      1× (edge case) (ELT-04)
- [ ] `inBlast` a 71, 72 e 73 px (dentro, dentro, fora); `blastDamage(1)` 18 (ELT-05)
- [ ] `RegenClock`: em 1999 ms nada, em 2000 ms o 1º tique; um tique a cada 200 ms; `maxHp` 50 cura 1 (o `max`); `maxHp`
      400 cura 3; no máximo devolve 0 (edge case); `onDamage` zera o relógio (ELT-07)
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the elite shield, regen clock and blast rules`

---

#### T33: Escudo e cura no cérebro do inimigo

**What**: `src/core/enemyBrain.ts`: `EnemyTuning.shield?: number`; campo `shield = new EliteShield(t.shield ?? 0)` no
construtor; a l.80 vira `this._hp = Math.max(0, this._hp - this.shield.absorb(hit.damage, hit.strength === 'heavy'))` (só
o golpe que o `refuses` deixou passar gasta escudo); `get shieldValue()`; `heal(n)` com teto no `maxHp` e nada se morto.
**Where**: `src/core/enemyBrain.ts`
**Depends on**: T32
**Reuses**: `EnemyBrain.receiveHit` (`enemyBrain.ts:46-80`)
**Requirement**: ELT-04, ELT-07

**Done when**:

- [ ] `tests/core/elite.test.ts` (o `enemyBrain.test.ts` está na exceção de tamanho e não muda): cérebro com escudo toma o
      golpe no escudo; golpe recusado (levantando) não gasta escudo; sem `shield` o HP cai igual a hoje; `heal` sobe até o
      `maxHp` e não cura morto
- [ ] Nenhum ramo novo no `receiveHit` (o `??` mora no construtor; função da exceção de complexidade)
- [ ] `tests/core/enemyBrain.test.ts` verde sem mudança; gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): let the enemy brain carry a shield and heal`

---

### Phase 7: Passo 3 — elite na horda, texto, drop e Selo (regra pura)

Entre a T35 e a T41 a rodada da r8 em diante tem uma unidade de elite que a cena ainda não faz nascer: o passo 3 só
termina jogável na T41, e os cenários de r8+ do `horde.smoke.mjs` rodam de novo nela.

#### T34: Elite no plano da rodada

**What**: `src/core/hordePlan.ts`: `composition` com `elite = 1` da r8 em diante (rodada de chefe sem), `eliteAt =
[ceil(0,4 × q)]`, e `HordeOverrides.elite` (`forcedAffixes`): com `?debug&elite=` toda rodada comum tem 1 elite com
limiar 0, inclusive antes da r8; `applyQuota` mantém a elite quando `quota > elite`.
**Where**: `src/core/hordePlan.ts`
**Depends on**: None
**Reuses**: `ELITE.at` (T30)
**Requirement**: HRD-02, HRD-11, ELT-01

**Done when**:

- [ ] `tests/core/hordePlan.test.ts`: cota 22, 25, 29, 32, 38, 47 e 55 nas r6, r7, r8, r9, r11, r14 e r19 (r7 sem elite e
      r8 com, HRD-02); `eliteAt` `[ceil(0,4q)]` na r8 (12); `forcedAffixes` na r3 dá 1 elite com limiar 0; `quota` 1 com
      elite forçada dá só a elite
- [ ] HRD-11 de novo com a elite: r1 a r40 sem chefe, `3·L + 8·E + m·S` = `3·W` com folga 0,01
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add one elite per round from round 8`

---

#### T35: Fenda da elite

**What**: `src/core/horde.ts`: para cada limiar de `plan.eliteAt` ainda não usado, com `kills ≥ limiar` e vaga no teto de
corpos, abre a fenda da elite com `affixes = drawAffixes(rng, ato)` (o sorteio sempre consome o stream; `forcedAffixes`
troca só o resultado); a elite fica fora do teto de lutadores, custa 0 de orçamento e conta na cota.
**Where**: `src/core/horde.ts`
**Depends on**: T34
**Reuses**: `drawAffixes` (T31)
**Requirement**: ELT-01, ELT-03, DBH-01

**Done when**:

- [ ] `tests/core/horde.test.ts`: na r8 com cota 29, 11 abates não abrem a elite e 12 abrem; com o teto de corpos cheio o
      limiar fica pendente e abre no 1º quadro com vaga; uma elite por rodada; nenhuma com `eliteAt` vazio (ELT-01)
- [ ] Mesma seed com e sem `forcedAffixes` deixa o `hordeRng` no mesmo ponto depois da fenda da elite (DBH-01.2); a elite
      não conta no teto de lutadores (HRD-04)
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): open the elite rift at the kill threshold`

---

#### T36: Parâmetro de debug da elite

**What**: `src/core/hordeParams.ts` lê `elite` (`none` vira lista vazia; lista de afixos conhecidos, distintos, no máximo
2; qualquer id desconhecido invalida o valor inteiro).
**Where**: `src/core/hordeParams.ts`
**Depends on**: None
**Reuses**: `ELITE_AFFIX_IDS` (T30), molde do `parseBossAffixes` (F32)
**Requirement**: DBH-01

**Done when**:

- [ ] `tests/core/hordeParams.test.ts`: `elite=none` → vazio; `elite=escudo,rapido` → os dois; `elite=escudo,xx` →
      ausente; `elite=escudo,escudo` → ausente; 3 afixos → ausente
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): parse the elite debug param`

---

#### T37: Texto da faixa de fechamento

**What**: `src/core/hordeText.ts` (novo) com `clearedText(round)`: "Rodada N concluída", e " · Próxima: elite" quando
`round + 1 === 8`. O aviso da rodada de enxame entra na T50.
**Where**: `src/core/hordeText.ts`
**Depends on**: None
**Reuses**: texto de hoje (`runDirector.ts:74`)
**Requirement**: ELT-11

**Done when**:

- [ ] `tests/core/hordeText.test.ts` (novo): r7 "Rodada 7 concluída · Próxima: elite"; r6 e r8 "Rodada N concluída"
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): word the round cleared banner`

---

#### T38: Drop da elite

**What**: `src/core/loot.ts` ganha `eliteDrop(round, armed)`: cura sorteada como a do lutador armado, depois 8 fragmentos
fixos mais o bônus de armado quando armada; o Elixir segue no `rollElixir(true)` de hoje.
**Where**: `src/core/loot.ts`
**Depends on**: None
**Reuses**: `Loot.enemyDrop` (`loot.ts:74-98`), bônus de armado de hoje
**Requirement**: ELT-12

**Done when**:

- [ ] `tests/core/loot.test.ts`: desarmada dá sempre 8 fragmentos; armada dá 8 + o bônus; a taxa de cura é a do lutador
      armado (±0,01 em 10 mil); cura antes dos fragmentos no stream
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): roll the elite drop`

---

#### T39: Página de Selo na fila de escolhas

**What**: F33 `src/core/choice.ts`: `{ kind: 'livre'; origin?: 'selo' }` no `ChoiceRequest` e `choiceRank` 30 para a página
`livre` de Selo (depois do ponto de maestria, 20, e dos baús, 0 e 1).
**Where**: `src/core/choice.ts`
**Depends on**: None
**Reuses**: `ChoiceQueue`, `choiceRank` (F33)
**Requirement**: ELT-09, ESP-04

**Done when**:

- [ ] Teste do `choice` da F33: com Selo, maestria, baú do Véu e baú do chefe na fila, a ordem sai baú, Véu, ramos,
      maestria, Selo; dois Selos saem em ordem de chegada
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): queue an elite seal free point page`

---

### Phase 8: Passo 3 — elite no jogo

#### T40: Escala, cura e marca de elite no lutador

**What**: `src/game/Enemy.ts`: `elite = false` (público), `heal(n)` (cérebro + barra) e `scale` no `EnemyCtx` com 1 por
padrão; `src/game/enemy/context.ts` ganha `scale`; `EnemyAnimator.ts:115` multiplica a escala do sprite; `EnemyHud`
sobe a barra com `BAR_RISE × scale`; `Hittable` ganha `readonly elite?: boolean` em `bodyTags.ts`. Sem elite nenhum
número muda.
**Where**: `src/game/Enemy.ts`
**Depends on**: None
**Reuses**: `EnemyCtx`, `EnemyAnimator`, `EnemyHud` (`EnemyHud.ts:9`)
**Requirement**: ELT-02, ELT-12

**Done when**:

- [ ] Smokes `fight`, `enemy-react`, `enemy-guard`, `finisher`, `player-anim` e `enemy-sprite` (nome reconferido) verdes
      sem mudança; captura HD de um lutador antes e depois idêntica
- [ ] `EnemyAnimator` e `EnemyDefense` sem ramo novo (exceção de complexidade); `Enemy.ts` abaixo de 400 linhas efetivas
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(enemy): carry a scale, a heal and an elite mark`

---

#### T41: A elite nasce

**What**: `src/scenes/test/eliteDirector.ts` (novo, campo `elites` do `HordeDirector`) com `attach(enemy, spec)` (escala
1,2, `enemy.elite = true`, `AffixOutline` com `cycleKeyAt(eliteOutlineKeys)`, rótulo "Elite · ..." preso acima da cabeça
por `RUN.bannerMs`, evento `eliteSpawn:<id>`), `update(dt)` (contorno e rótulo), `reset()` e `snapshot()`;
`spawner.spawnFromCommand(point, round, elite = null)` aplica `scaleFor(..., hpExtra)` com 2,5, `eliteTuning`, o drop da
elite (`loot.eliteDrop` + `rollElixir(true)`), `combat.onEnemyDied(..., 'elite')` e `elites.attach`;
`hordeDirector.onSpawn` da elite; `elites` no `HordeSnapshot`. Nasce `scripts/smoke/elite.smoke.mjs`.
**Where**: `src/scenes/test/eliteDirector.ts`
**Depends on**: T40
**Reuses**: `spawnFromCommand`/`wireEnemy` (F32), `AffixOutline` (T28), `eliteTuning`, `eliteLabel` (T31), `eliteDrop` (T38)
**Requirement**: HRD-02, ELT-01, ELT-02, ELT-03, ELT-06, ELT-08, ELT-12, DBH-02, DBH-04

**Done when**:

- [ ] `elite.smoke.mjs` parte 1, `round=8&elite=escudo&quota=2&swarm=0`: a elite nasce por fenda com `eliteSpawn:<id>`;
      `maxHp` = `round(60 × hpMul(8) × 2,5)`; `fxSprite` em escala 1,2 lida do sprite (L-043); contorno `c` e rótulo
      "Elite · Escudada" por `RUN.bannerMs`; `horde.elites` com os afixos
- [ ] `elite=rapido,regenerador`: contorno troca `A`/`G` a cada 600 ms; preparo do golpe 360 ms (telegrafia medida no
      snapshot, ELT-06); `round=8&quota=5&swarm=0` sem `elite=`: a fenda da elite abre no 2º abate (ELT-01)
- [ ] Morte da elite desarmada solta 8 fragmentos (ELT-12)
- [ ] `horde.smoke.mjs` parte 3 passa a ler `Abates: 0/32` na r9 (HRD-02 com elite) e roda verde
- [ ] Conferência em HD da elite em movimento, virada para os dois lados, com o contorno e a barra acima da cabeça
- [ ] Smokes `elite`, `horde`, `enemy-guard`, `finisher`, `enemy-react` e `boss` verdes; gate verde; contagem de testes
      sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(scene): spawn the elite with its affixes and outline`

---

#### T42: Escudo da elite no jogo

**What**: `src/game/enemy/EnemyHud.ts` ganha `setShield(cur, max)` (um `Rectangle` `c` sobre o poço da barra de vida, largura
`inner × cur / maxHp`); o `eliteDirector.update` lê `shieldValue`, atualiza o trecho e, quando chega a 0, dispara
`shieldBreak:<id>` e a faísca `C` uma vez.
**Where**: `src/game/enemy/EnemyHud.ts`
**Depends on**: T41
**Reuses**: `EliteShield` no cérebro (T33), `fx.spark`
**Requirement**: ELT-04, ELT-08, DBH-04

**Done when**:

- [ ] `elite.smoke.mjs` parte 2: golpe forte tira do escudo o dobro do dano (`horde.elites[].shield` antes e depois);
      golpe leve e chip de técnica tiram 1×; a sobra do golpe que quebra vai para o HP; `shieldBreak:<id>` sai uma vez no
      zero; a largura do trecho `c`, lida do `Rectangle`, segue `cur / maxHp` (L-043)
- [ ] Conferência em HD da barra com o trecho do escudo
- [ ] Smokes `elite`, `enemy-react` e `hud` verdes; gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(scene): show and break the elite shield`

---

#### T43: Elite regeneradora

**What**: `eliteDirector.update` com um `RegenClock` por elite regeneradora: relógio zera quando `hp + shield` cai entre
dois quadros; a cura chama `enemy.heal(n)` e dá um pulso `G`; no máximo não cura nem pulsa.
**Where**: `src/scenes/test/eliteDirector.ts`
**Depends on**: T41
**Reuses**: `RegenClock` (T32), `Enemy.heal` (T40)
**Requirement**: ELT-07

**Done when**:

- [ ] `elite.smoke.mjs` parte 3, `elite=regenerador`: depois de um golpe e 2 s parado, o HP sobe `max(1, round(0,008 ×
      maxHp))` a cada 200 ms (±1 quadro); um chip de técnica antes dos 2 s adia a 1ª cura; no máximo o HP não muda e não
      há pulso
- [ ] Smokes `elite` verde; gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(scene): heal the regenerating elite`

---

#### T44: Elite explosiva

**What**: `eliteDirector.onDied(enemy, x, y)`: com `explosivo`, agenda um anel de 72 px que pisca 700 ms no ponto da morte
e depois chama `player.receiveHit` com `blastDamage(damageMul)` como golpe `red` quando `inBlast` e o player não está
invulnerável; evento `eliteBlast:<id>`; a explosão segue se a rodada fecha no mesmo quadro e some no `reset` (rebuild,
run nova, `R`).
**Where**: `src/scenes/test/eliteDirector.ts`
**Depends on**: T41
**Reuses**: `inBlast`, `blastDamage` (T32), `hitFieldsFor('red')` (AD-020)
**Requirement**: ELT-05, DBH-04

**Done when**:

- [ ] `elite.smoke.mjs` parte 4, `elite=explosivo`: o anel dura 700 ms; com o player a 72 px do ponto ele leva
      `round(12 × damageMul × 1,5)` imbloqueável (a guarda segura não para); a 80 px não leva; com esquiva ativa não leva
- [ ] Elite explosiva como último abate da rodada: a explosão ainda sai; `R` durante o anel: nada explode (edge cases);
      morte pela ativação do Domínio também explode
- [ ] Conferência em HD do anel piscando
- [ ] Smokes `elite`, `defense` e `world-restart` verdes; gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(scene): blow up the explosive elite on death`

---

#### T45: Selo da elite

**What**: F33 `src/scenes/test/choiceDirector.ts` ganha `addEliteSeal(origin: 'elite' | 'enxame')` (põe a página `livre` de
origem `selo` e o evento `selo:<origin>`) e, no `skip` do CHC-08 de uma página de Selo, `wallet.add(15 ×
fragmentValue(round))`, o banner "Selo: +N fragmentos" e o evento `seloFragments:<n>`; o `eliteDirector.onDied` chama
`this.s.build.choice.addEliteSeal('elite')` para toda elite morta, por qualquer fonte.
**Where**: `src/scenes/test/choiceDirector.ts`
**Depends on**: T41
**Reuses**: `buildPage`, `choiceRank` com o Selo (T39), `fragmentValue`
**Requirement**: ELT-09, ELT-10, DBH-04

**Done when**:

- [ ] `elite.smoke.mjs` parte 5, `round=8&elite=escudo&quota=2&swarm=0`: o abate da elite dá `selo:elite`; a konbini
      seguinte abre uma página `livre` de origem `selo`, depois de uma página de maestria quando as duas esperam
- [ ] Com todos os eixos no teto (parâmetro de eixos da F30), a página do Selo é pulada, a carteira sobe `15 ×
      fragmentValue(8)` e o banner "Selo: +N fragmentos" aparece (ELT-10)
- [ ] Smokes `elite`, `choice-panel`, `boss-chest` e `shop` verdes; gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(scene): grant a free point seal for each elite`

---

#### T46: Aviso da 1ª elite na faixa

**What**: `src/scenes/test/runDirector.ts`: as faixas de fechamento (l.74 e l.247) usam `clearedText(round)` (0 linha).
**Where**: `src/scenes/test/runDirector.ts`
**Depends on**: None
**Reuses**: `clearedText` (T37)
**Requirement**: ELT-11

**Done when**:

- [ ] `elite.smoke.mjs` parte 6, `round=7&quota=1&swarm=0`: a faixa de fechamento lê "Rodada 7 concluída · Próxima:
      elite" e fica até o próximo `roundStart` (RHUD-03)
- [ ] Smokes `elite`, `run-loop` e `boss-victory` verdes; gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(scene): warn about the first elite on the cleared banner`

---

#### T47: Regras de elite das fases anteriores leem a marca

**What**: as regras que separam comum, elite e chefe passam a ler `target.elite === true`: F31 frações da ativação do
Domínio (elite 20% e 12%, `activationTargets`/`activationDamage`), F30 Perfuração 3 ("atravessa elite sem detonar") e F33
Puxão 3 ("puxa elite"); lutadores e enxame seguem comuns. Arquivos reconferidos no código mergeado.
**Where**: `src/core/domainActivation.ts`
**Depends on**: T41
**Reuses**: `Hittable.elite` (T40), dados de cada fase
**Requirement**: ELT-12, ENX-10

**Done when**:

- [ ] `elite.smoke.mjs` parte 7: a ativação do Santuário tira 20% do `maxHp` da elite e 40% do lutador comum, e o membro
      do enxame toma a fração de comum; a Perfuração 3 do Vermelho atravessa a elite sem detonar; o Puxão 3 do Azul puxa a
      elite (posição antes e depois)
- [ ] Testes das F30/F31/F33 que leem a fração da elite seguem verdes (o caso da elite passa a usar a marca)
- [ ] Fim do passo 3: smokes `elite`, `horde`, `enemy-guard`, `finisher`, `enemy-react`, `hud`, `shop`, `run-loop`,
      `boss-victory`, `choice-panel`, `boss-chest` e `domain` verdes; `buildCurve` da F30 rodado e a rodada em que a build
      fecha anotada no `validation.md` (risco "mais Selos que a conta")
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: build
**Commit**: `feat(combat): read the elite mark in domain, pierce and pull rules`

---

### Phase 9: Passo 4 — rodada de enxame e regras do ato IV

#### T48: Regras por ato

**What**: `src/data/acts.ts` (novo) com `ActRules` (`light: { key; alpha } | null`, `heavyBruto`, `armedCap: number | null`,
`veu`), `ACTS` de I a V (o V vale para todo ato depois; `light` nulo em todos até a T57; `heavyBruto` e `armedCap` 0,65
do IV em diante; `veu` do V em diante) e `actRules(act)` (ato além do V devolve o V; ato < 1 devolve o I).
**Where**: `src/data/acts.ts`
**Depends on**: None
**Reuses**: molde de `data/horde.ts` (T5)
**Requirement**: ATO-01, ATO-04

**Done when**:

- [ ] `tests/data/acts.test.ts` (novo): `heavyBruto` falso nos atos I a III e verdadeiro no IV, V e IX; `armedCap` nulo
      até o III e 0,65 do IV; `veu` só do V; `actRules(12)` igual ao V
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(data): add the per-act rules`

---

#### T49: Plano da rodada de enxame

**What**: `src/core/hordePlan.ts` ganha `isSwarmRound(round)` (`round ≥ 13 && (round − 13) % 5 === 0`) e o plano da rodada de
enxame: composição `{ 0, min(30 + 2·(r−13), 60), 0 }`, `rateMul` 2, `stored` 18, `group` 6, `eliteAt` vazio, `special:
'swarm'`.
**Where**: `src/core/hordePlan.ts`
**Depends on**: None
**Reuses**: `HORDE.swarmRound` (T5)
**Requirement**: ESP-01, ESP-02

**Done when**:

- [ ] `tests/core/hordePlan.test.ts`: `isSwarmRound` falso na r12 e na r14, verdadeiro na r13, r18 e r23; nenhum múltiplo de
      5 até a r100 (ESP-01); cota 30 na r13, 40 na r18, teto 60 (r58); `rateMul` 2, `stored` 18, grupo 6, sem elite
      (ESP-02); HRD-11 continua com folga 0,01 incluindo as rodadas de enxame
- [ ] `tests/core/horde.test.ts`: na r13 só nascem fendas de enxame com 6 membros (cortadas pelo teto de corpos)
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): plan swarm-only rounds`

---

#### T50: Faixas da rodada de enxame

**What**: `src/core/hordeText.ts` ganha `roundStartText(round)` ("Rodada de enxame!" na rodada de enxame; "Rodada N" no
resto) e o `clearedText` ganha " · Próxima: rodada de enxame" quando `isSwarmRound(round + 1)`.
**Where**: `src/core/hordeText.ts`
**Depends on**: T49
**Reuses**: `clearedText` (T37)
**Requirement**: ESP-03, ATO-02

**Done when**:

- [ ] `tests/core/hordeText.test.ts`: r13 "Rodada de enxame!"; r12 e r17 "Rodada N concluída · Próxima: rodada de enxame";
      r13 e r14 sem o aviso; r7 com o aviso da elite (segue)
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): word the swarm round banners`

---

#### T51: Bruto pesado no ato IV

**What**: `src/core/attackKind.ts`: `heavyBruto?: boolean` no argumento e `if (i.heavyBruto && i.variant === 'bruto') return
'red';` depois da regra da arma (o bruto armado com porrete segue o porrete).
**Where**: `src/core/attackKind.ts`
**Depends on**: None
**Reuses**: `attackKindFor` (`attackKind.ts:14-17`)
**Requirement**: ATO-04

**Done when**:

- [ ] `tests/core/attackKind.test.ts`: `bruto` desarmado com `heavyBruto` dá `red`; sem `heavyBruto` dá o de hoje; `bruto`
      com porrete segue o do porrete; `corcunda` com `heavyBruto` não muda
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): make the brute a heavy hitter from act IV`

---

#### T52: Teto da chance de armado por parâmetro

**What**: `src/core/loot.ts`: `rollArmed(round, cap?)` repassa `{ ...t.armed, cap: cap ?? t.armed.cap }` ao `armedChance`
(0 linha).
**Where**: `src/core/loot.ts`
**Depends on**: None
**Reuses**: `armedChance`, `Loot.rollArmed` (`loot.ts:39-43`, `:88-98`)
**Requirement**: ATO-04

**Done when**:

- [ ] `tests/core/loot.test.ts`: sem `cap`, a chance da r40 é 0,5 como hoje; com `cap` 0,65 a da r40 é 0,65 e a da r1 não
      muda (o teto só corta em cima)
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): accept an armed chance cap per roll`

---

#### T53: Regras do lutador por ato no jogo

**What**: `hordeDirector.unitRules(round, elite)` devolve `hpExtra` (2,5 na elite; 1,3 no `bruto` comum do ato IV em
diante; 1 no resto), `heavyBruto` e `armedCap` de `actRules(actOf(round))`; o `spawner.spawnFromCommand` passa a usar
`rollArmed(round, rules.armedCap)`, `attackKindFor({ variant, weapon, heavyBruto })` e o `hpExtra` depois de saber a
aparência (a elite segue com o seu HP, sem o ×1,3). Nasce `scripts/smoke/acts.smoke.mjs` com a parte 1.
**Where**: `src/scenes/test/spawner.ts`
**Depends on**: T48, T51, T52
**Reuses**: `scaleFor(..., hpExtra)` (T29), `attackKindFor` (T51), `rollArmed` (T52)
**Requirement**: ATO-04

**Done when**:

- [ ] `acts.smoke.mjs` parte 1, `round=16&enemyVariant=bruto&swarm=0`: o 1º `bruto` desarmado (`weapon === null`) entre os
      nascidos tem golpe `red` e `maxHp` 1,3× o do `corcunda` da mesma rodada (2º boot com `enemyVariant=corcunda`); na
      r15 o `bruto` desarmado tem o golpe e o HP de hoje
- [ ] `round=40&seed=1&quota=60&swarm=0`: a fração de armados entre os 60 lutadores nascidos fica ≥ 0,55 (com o teto de
      hoje, 0,5, a mesma seed dá menos; os dois números anotados no commit)
- [ ] Smokes `acts`, `armed`, `telegraph` e `elite` verdes; gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(scene): apply the act rules to brutes and armed odds`

---

#### T54: Rodada de enxame no jogo

**What**: `runDirector` usa `roundStartText(cmd.round)` na faixa de início (l.67, 0 linha); `hordeDirector.onRoundCleared`
chama `this.s.build.choice.addEliteSeal('enxame')` ao fechar uma rodada de enxame; `horde.smoke.mjs` ganha a parte 8
(passando de 380 linhas efetivas, as partes 8 e seguintes vão para `horde-special.smoke.mjs`).
**Where**: `src/scenes/test/hordeDirector.ts`
**Depends on**: T49, T50
**Reuses**: `addEliteSeal` (T45), `roundStartText` (T50)
**Requirement**: ESP-01, ESP-02, ESP-03, ESP-04

**Done when**:

- [ ] Parte 8, `round=13&seed=1&enemyGuard=0`: banner "Rodada de enxame!"; HUD `Abates: 0/30`; só nascem membros do enxame,
      em grupos de 6 (cortados pelo teto de corpos); nenhuma elite; ao fechar, `selo:enxame` e a konbini abre uma página
      `livre` de origem `selo`
- [ ] `round=12&quota=1&swarm=0`: a faixa de fechamento termina em " · Próxima: rodada de enxame"
- [ ] Fim do passo 4: smokes `horde` (ou `horde-special`), `armed`, `telegraph`, `shop`, `run-loop` e `acts` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: build
**Commit**: `feat(scene): run swarm-only rounds with a seal reward`

---

### Phase 10: Passo 5 — atos: luz e arena-portão

#### T55: Pulso de zoom sobre um zoom base

**What**: `src/core/cameraKick.ts`: `ZoomPulse.update(realDtMs, baseZoom = zoom(CAMERA_FEEL.zoomBase))` e o pico como
`baseZoom × zoomPeak / zoomBase` (0 linha); com o padrão o número é o de hoje.
**Where**: `src/core/cameraKick.ts`
**Depends on**: None
**Reuses**: `ZoomPulse` (`cameraKick.ts:38-57`)
**Requirement**: PRT-04

**Done when**:

- [ ] `tests/core/cameraKick.test.ts`: sem o 2º argumento a curva é idêntica à de antes (amostras gravadas antes da
      mudança); com base 1,8 o pico é `1,8 × zoomPeak / zoomBase` e o fim volta a 1,8
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `refactor(core): pulse the zoom around a given base`

---

#### T56: Câmera com zoom base único

**What**: `src/scenes/test/camera.ts`: campo `baseZoom = WORLD_ZOOM`, `resetBase()` (volta ao `WORLD_ZOOM`, grava
`kokusenFx.zoomBase`), l.65 com `this.zoomPulse.update(dtMs, this.baseZoom)` e `this.baseZoom` fora do pulso, l.86 e 88 com
`zoomTo(this.baseZoom, ...)`; `KokusenFx.ts:235` ganha o campo `zoomBase = zoom(1.5)` e volta a ele; na `TestScene`, a l.353
vira `.setZoom(this.camera.resetBase())` e a l.449 `zoomTo(this.camera.baseZoom, ...)` (0 linha; `WORLD_ZOOM` sai do
import se ficar sem uso). Sem arena-portão o base é sempre `WORLD_ZOOM`: nenhum número muda.
**Where**: `src/scenes/test/camera.ts`
**Depends on**: T55
**Reuses**: `CameraRig` (`camera.ts:28-91`)
**Requirement**: PRT-04

**Done when**:

- [ ] Smokes `feel`, `kokusen`, `finisher`, `impact`, `tech` e `hd` verdes **sem mudança**
- [ ] `TestScene` com as mesmas linhas efetivas; `KokusenFx.ts` abaixo de 400
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(camera): return every zoom to one base zoom`

---

#### T57: Luz de cada ato

**What**: `src/data/acts.ts`: `light` por ato (I `a` 0,10; II nulo; III `S` 0,12; IV `r` 0,14; V em diante `t` 0,18) e
`ROMAN` (I a X, número arábico depois do X).
**Where**: `src/data/acts.ts`
**Depends on**: None
**Reuses**: `PALETTE`
**Requirement**: ATO-03

**Done when**:

- [ ] `tests/data/acts.test.ts`: cor e alpha de cada ato; ato II nulo; ato IX igual ao V; toda chave na `PALETTE`; `ROMAN`
      de 1 a 11
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(data): give each act its light`

---

#### T58: Faixa de troca de ato

**What**: `src/core/hordeText.ts`: `roundStartText` lê "Rodada N · Ato X" no 1º round de cada ato do II ao IV (r6, r11,
r16), com o número romano; a rodada de enxame segue "Rodada de enxame!".
**Where**: `src/core/hordeText.ts`
**Depends on**: T57
**Reuses**: `ROMAN` (T57), `actOf` (T6)
**Requirement**: ATO-02

**Done when**:

- [ ] `tests/core/hordeText.test.ts`: "Rodada 6 · Ato II", "Rodada 11 · Ato III", "Rodada 16 · Ato IV"; r7 e r1 "Rodada
      N"; r13 segue "Rodada de enxame!"
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): announce each new act on the round banner`

---

#### T59: Véu de luz do ato

**What**: `src/game/ActVeil.ts` (novo: `show(light)`, `hide()`, `debug()`; um `Rectangle` `SCREEN.w × SCREEN.h` com
`PALETTE[key]`, `scrollFactor` 0, profundidade −8, alpha fixo, sem tinta multiplicativa); `hordeDirector.onRoundStart`
mostra o véu do ato na área de combate e na do chefe, `onShopOpen` e `reset` escondem, `onSceneCreate` recria; `veil` do
`HordeSnapshot` lido do `Rectangle` (`fillColor`, `alpha`). `acts.smoke.mjs` ganha a parte 2.
**Where**: `src/game/ActVeil.ts`
**Depends on**: T57, T58
**Reuses**: molde do véu da arena (`arena.ts:11-44`)
**Requirement**: ATO-02, ATO-03, DBH-02

**Done when**:

- [ ] `acts.smoke.mjs` parte 2: `round=11` → banner "Rodada 11 · Ato III" e `horde.veil` `{ key: 'S', alpha: 0.12 }` lido do
      `Rectangle` (L-043); `round=1` → `a` 0,10; `round=6` → nulo; `round=16` → `r` 0,14; `round=21` → `t` 0,18; na konbini
      `horde.veil` nulo; a profundidade do véu fica acima de toda camada do `BakedLayer` e abaixo do terreno, do véu da
      fase do chefe e dos personagens
- [ ] Conferência em HD de uma captura por ato (I, III, IV, V) com o fundo, o terreno e um inimigo
- [ ] Smokes `acts`, `world-scenery`, `world-restart` e `hd` verdes; gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(scene): tint each act with a palette light veil`

---

#### T60: Arena do chefe como sala-portão

**What**: `src/scenes/test/camera.ts` ganha `lock: { left; right } | null` e `enterArea(seals)` (com selos: `baseZoom =
zoom(1.35)`, `lock = seals`, `cam.setZoom(baseZoom)` durante o fade; sem: `WORLD_ZOOM` e trava solta); `followConfig()`
usa a trava nos limites horizontais e `followCamera` fixa a borda de baixo da vista na borda de baixo da área;
`lockSnapshot()` (`baseZoom`, `locked`); `arena.ts` ganha `sealSpan()` (borda de fora do selo da esquerda até a borda de
fora do da direita); `areaDirector.rebuild` chama `s.camera.enterArea(...)` antes do `followConfig` (+1); `camera` do
`GameSnapshot` ganha `baseZoom` e `locked` (+2) e o `snapshot.ts` espalha `lockSnapshot()` (+1). `acts.smoke.mjs` ganha
a parte 3.
**Where**: `src/scenes/test/camera.ts`
**Depends on**: T56
**Reuses**: `CameraRig` com `baseZoom` (T56), `areaDirector.rebuild` (`areaDirector.ts:120-140`), `arena.ts:29-44`
**Requirement**: PRT-01, PRT-02, PRT-03, PRT-04, PRT-05, DBH-02

**Done when**:

- [ ] `tests/game/debugApi.test.ts`: literal com `camera.baseZoom` e `camera.locked`
- [ ] `acts.smoke.mjs` parte 3, `round=5`: `camera.baseZoom` = `zoom(1.35)` (1,8 em HD) e `locked` verdadeiro, lidos da
      câmera viva (`cam.zoom` igual ao `baseZoom` fora dos pulsos); a borda de baixo da vista fica na borda de baixo da
      área com o player pulando; os limites horizontais vão da borda de fora do selo da esquerda à do da direita
- [ ] Depois de golpe forte, conjuração, finalizador e Kokusen na arena, o zoom volta a 1,8 (PRT-04); com o chefe morto
      durante o Kokusen o zoom volta a 1,8 até a konbini (edge case); o menor `y` do chefe no salto (F32) fica dentro da
      vista, ou a decisão do design ("Trava vertical da arena") é tomada e anotada no commit
- [ ] Na konbini, numa área comum, depois do `R` e numa run nova: `baseZoom` `zoom(1.5)`, `locked` falso (PRT-05)
- [ ] Conferência em HD da arena enquadrada a 1,8
- [ ] Fim do passo 5: smokes `acts`, `boss`, `world-boss`, `boss-victory`, `world-restart`, `finisher`, `kokusen`, `feel`,
      `hd` e `world-scenery` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: build
**Commit**: `feat(camera): frame the boss arena as a locked gate room`

---

### Phase 11: Passo 6 — Véu Rompido e fechamento

#### T61: Números do Véu Rompido

**What**: `src/data/acts.ts` ganha `VeuRule`, `VEU_RULES` (ordem base `enxameVeloz`, `eliteDupla`, `guardaFirme`,
`semTregua`), `VEU` (`hpPerAct` 1,15, `fromAct` 5, `swarmSpeed` 1,25, `secondEliteAt` 0,7, `guardMul` 1,5, `rateMul` 1,3,
`storedMul` 1,5) e `VEU_LABELS` ("Enxame veloz", "Elite dupla", "Guarda firme", "Sem trégua").
**Where**: `src/data/acts.ts`
**Depends on**: None
**Reuses**: —
**Requirement**: VRB-02

**Done when**:

- [ ] `tests/data/acts.test.ts`: cada número e rótulo conferido com a spec
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(data): add the broken veil rules`

---

#### T62: Ordem e vida do Véu

**What**: `src/core/veu.ts` (novo) com `drawVeuOrder(rng)` (Fisher-Yates com 3 `rng.int`), `veuRulesFor(act, order)` (do ato
V, `act − 4` regras, no máximo 4), `veuHpMul(act)` (`1,15^(act − 4)` do ato V, 1 antes) e `parseVeuOrder(raw)` (ids
conhecidos, sem repetir; completa com os que faltam na ordem de `VEU_RULES`).
**Where**: `src/core/veu.ts`
**Depends on**: T61
**Reuses**: `Rng`
**Requirement**: VRB-01, VRB-03

**Done when**:

- [ ] `tests/core/veu.test.ts` (novo): a ordem é sempre uma permutação; mesma seed, mesma ordem; as 24 ordens aparecem em
      2000 seeds (VRB-01); `veuRulesFor` dá 0 regra no ato IV, 1 no V, 4 no VIII e 4 no IX (edge case)
- [ ] `veuHpMul`: 1 no ato IV, 1,15 no V, 1,3225 no VI; com o `hpMul` da F30, 2,53 na r21 e 3,31 na r26 (VRB-03)
- [ ] `parseVeuOrder`: `semTregua` → começa por ela e completa; `semTregua,semTregua` e `foo` → `null`
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): order the broken veil rules and scale their hp`

---

#### T63: Véu no plano da rodada

**What**: `src/core/hordePlan.ts`: o `planRound` recebe a ordem do Véu no contexto e preenche `veu` (`veuRulesFor`) e
`veuHpMul`; `eliteDupla` põe 2 elites na composição e `eliteAt` `[ceil(0,4q), ceil(0,7q)]`; `semTregua` multiplica
`rateMul` por 1,3 e `stored` por 1,5; `HordeOverrides.veu` troca a ordem.
**Where**: `src/core/hordePlan.ts`
**Depends on**: T62
**Reuses**: `veuRulesFor`, `veuHpMul` (T62)
**Requirement**: VRB-02, VRB-03

**Done when**:

- [ ] `tests/core/hordePlan.test.ts`: r20 sem regra e `veuHpMul` 1; r21 com a 1ª regra da ordem e 1,15; `eliteDupla` na
      r21 dá 2 elites e limiares `ceil(0,4q)`/`ceil(0,7q)`; `semTregua` dá `rateMul` 1,3 e `stored` 18; na rodada de enxame
      com `semTregua`, 2,6 e 27; o enxame não leva o `veuHpMul` (fica em 20)
- [ ] `tests/core/horde.test.ts`: com `eliteDupla`, a 2ª fenda de elite abre em `ceil(0,7q)` abates e não em `ceil(0,7q) −
      1`
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): apply the broken veil rules to the round plan`

---

#### T64: Ordem do Véu sorteada no início da run

**What**: `src/core/run.ts`: `veuOrder = overrides.veu ?? drawVeuOrder(hordeRng)` logo depois de criar o `hordeRng` (o sorteio
acontece sempre, para o stream andar igual com e sem o parâmetro); `makeHorde` passa a ordem ao `planRound`; `get
veuRules` (regras do ato da rodada atual).
**Where**: `src/core/run.ts`
**Depends on**: T63
**Reuses**: `drawVeuOrder` (T62)
**Requirement**: VRB-01, DBH-01

**Done when**:

- [ ] `tests/core/runHorde.test.ts`: a ordem sai no `startRun` e muda com a seed; com `RunOptions.horde.veu` a ordem é a
      passada e o `hordeRng` fica no mesmo ponto que sem ela; `veuRules` vazio na r20 e com 1 regra na r21
- [ ] `run.ts` sem ramo novo no `resolveStart`; `tests/core/run.test.ts` sem mudança
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): draw the broken veil order at run start`

---

#### T65: Parâmetro de debug do Véu

**What**: `src/core/hordeParams.ts` lê `veu` com `parseVeuOrder` (inválido some).
**Where**: `src/core/hordeParams.ts`
**Depends on**: T62
**Reuses**: `parseVeuOrder` (T62)
**Requirement**: DBH-01

**Done when**:

- [ ] `tests/core/hordeParams.test.ts`: `veu=semTregua` dá a ordem começando por ela; `veu=foo` fica ausente
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): parse the broken veil debug param`

---

#### T66: Faixa do Véu Rompido

**What**: `src/core/hordeText.ts`: `roundStartText(round, veu)` lê "Rodada N · Véu Rompido: <regra nova>" no 1º round de cada
ato do V em diante, e "Rodada N · Véu Rompido" quando o ato não traz regra nova (depois da 4ª).
**Where**: `src/core/hordeText.ts`
**Depends on**: T62
**Reuses**: `VEU_LABELS` (T61), `veuRulesFor` (T62)
**Requirement**: ATO-02, VRB-01

**Done when**:

- [ ] `tests/core/hordeText.test.ts`: r21 com `semTregua` primeiro → "Rodada 21 · Véu Rompido: Sem trégua"; r26 com a 2ª
      regra; r41 "Rodada 41 · Véu Rompido"; r22 "Rodada 22"; r23 segue "Rodada de enxame!"
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): announce each broken veil rule on the round banner`

---

#### T67: Guarda firme

**What**: `combat.onPlayerMoveStart` passa `guardMul: this.s.horde.guardMul()` (1, ou 1,5 com `guardaFirme`) na leitura do
golpe (0 linha); o tipo da leitura no `Enemy.ts` ganha `guardMul`; `EnemyDefense.ts:278` vira `base:
EnemyGuard.chanceFor(round) * reading.guardMul,` (sem `??`, sem ramo novo); o snapshot do inimigo mostra a chance de guarda
efetiva da última leitura (`guardChance`, se ainda não existir).
**Where**: `src/game/enemy/EnemyDefense.ts`
**Depends on**: T64
**Reuses**: `EnemyGuard.chanceFor` (`core/enemyGuard.ts`), leitura do golpe (`combat.ts:114-122`)
**Requirement**: VRB-02

**Done when**:

- [ ] `horde.smoke.mjs` parte 9, `round=21&veu=guardaFirme&swarm=0`: a `guardChance` lida do inimigo é 1,5× a de
      `veu=enxameVeloz` na mesma rodada e seed
- [ ] Sem Véu nada muda: smokes `enemy-guard`, `fight` e `defense` verdes; `EnemyDefense` sem ramo novo
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(combat): firm up the enemy guard under the broken veil`

---

#### T68: Véu Rompido no jogo

**What**: `runDirector` passa `this.s.run.veuRules` ao `roundStartText` (0 linha); `hordeDirector.swarmTuning` multiplica a
velocidade do enxame por 1,25 com `enxameVeloz`; `unitRules` multiplica o `hpExtra` do lutador e da elite pelo `veuHpMul`
do plano; `veu` do `HordeSnapshot` com `rules` e `hpMul`; com `eliteDupla` cada elite dá o seu Selo.
**Where**: `src/scenes/test/hordeDirector.ts`
**Depends on**: T63, T64, T65, T66, T67
**Reuses**: `planRound` com o Véu (T63), `addEliteSeal` (T45)
**Requirement**: VRB-02, VRB-03, ATO-02, DBH-02

**Done when**:

- [ ] `horde.smoke.mjs` parte 10: `round=21&veu=semTregua` → banner "Rodada 21 · Véu Rompido: Sem trégua" e `horde.veu.rules`
      com a regra; `maxHp` do lutador = `round(60 × hpMul(21) × 1,15)` lido do inimigo (L-043); o membro do enxame segue
      com 20
- [ ] `veu=enxameVeloz` → velocidade medida do membro 1,25× a de `veu=semTregua` na mesma rodada; `veu=eliteDupla&quota=10`
      → 2 elites nascem e 2 `selo:elite` saem
- [ ] Fim do passo 6: smokes `horde`, `elite`, `enemy-guard` e `acts` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(scene): run the broken veil from round 21`

---

#### T69: Documentação e conferência final de linhas

**What**: `README.md` ganha os parâmetros `quota`, `bodyCap`, `swarm`, `swarmBurst`, `elite` e `veu` na tabela de debug e
onde ajustar os números da horda (`data/horde.ts`, `data/elites.ts`, `data/acts.ts`); `CLAUDE.md` atualiza as tabelas
"Onde mexer" (linha de run e ondas com `core/horde`, `hordePlan`, `swarm`, `elite`, `veu`, `hordeText`,
`scenes/test/hordeDirector`, `eliteDirector`, `game/SwarmEnemy`, `SwarmPack`, `RiftFx`, `ActVeil` e os smokes `horde`,
`elite`, `acts`, `spawn-pressure-horde`) e "Arte" (folha provisória `art/hd/swarmSheet.ts` e o ponto de troca para o
atlas de `assets/enxame/`).
**Where**: `README.md`
**Depends on**: T68
**Reuses**: tabelas de hoje do `README.md` e do `CLAUDE.md`
**Requirement**: HRD-12, DBH-01

**Done when**:

- [ ] Contagem final no commit: `TestScene` com as linhas efetivas de antes da F38; `Hud.ts` igual; `run.test.ts` e
      `enemyBrain.test.ts` sem linha nova; nenhum arquivo novo no `.oxlintrc.json` (HRD-12)
- [ ] `npm run map -- game/` e `npm run map -- scenes/test` listam os arquivos novos com a descrição do topo
- [ ] Gate verde

**Tests**: none
**Gate**: build
**Commit**: `docs: document the horde debug params and map`

---

## Requirement Coverage

| Requirement | Tasks |
| --- | --- |
| HRD-01 | T1, T2, T3, T4, T9, T10 |
| HRD-02 | T5, T6, T18, T34, T41 |
| HRD-03 | T5, T6, T8 |
| HRD-04 | T5, T6, T8 |
| HRD-05 | T8, T9, T14, T22 |
| HRD-06 | T8, T18, T21 |
| HRD-07 | T8 |
| HRD-08 | T9 |
| HRD-09 | T6, T8 |
| HRD-10 | T13 |
| HRD-11 | T18, T34 |
| HRD-12 | T3, T4, T13, T14, T69 |
| FEN-01 | T8, T9, T12 |
| FEN-02 | T12 |
| FEN-03 | T12 |
| FEN-04 | T21 |
| FEN-05 | T12 |
| FEN-06 | T12 |
| FEN-07 | T8, T12 |
| ENX-01 | T16, T21 |
| ENX-02 | T15, T16, T22 |
| ENX-03 | T5, T18, T21 |
| ENX-04 | T16, T17, T21 |
| ENX-05 | T15, T17, T25 |
| ENX-06 | T15, T17, T25 |
| ENX-07 | T15, T17, T25 |
| ENX-08 | T15, T17, T22 |
| ENX-09 | T15 |
| ENX-10 | T23, T47 |
| ENX-11 | T24 |
| ENX-12 | T18, T19, T22 |
| ENX-13 | T15, T16, T21 |
| ENX-14 | T16, T20, T21 |
| ENX-15 | T23 |
| ELT-01 | T34, T35, T41 |
| ELT-02 | T29, T30, T31, T40, T41 |
| ELT-03 | T31, T35, T41 |
| ELT-04 | T30, T32, T33, T42 |
| ELT-05 | T30, T32, T44 |
| ELT-06 | T30, T31, T41 |
| ELT-07 | T30, T32, T33, T43 |
| ELT-08 | T27, T28, T30, T31, T41, T42 |
| ELT-09 | T39, T45 |
| ELT-10 | T45 |
| ELT-11 | T37, T46 |
| ELT-12 | T38, T40, T41, T47 |
| ESP-01 | T49, T54 |
| ESP-02 | T5, T49, T54 |
| ESP-03 | T50, T54 |
| ESP-04 | T39, T54 |
| ATO-01 | T6, T48 |
| ATO-02 | T50, T58, T59, T66, T68 |
| ATO-03 | T57, T59 |
| ATO-04 | T29, T48, T51, T52, T53 |
| PRT-01 | T60 |
| PRT-02 | T60 |
| PRT-03 | T60 |
| PRT-04 | T55, T56, T60 |
| PRT-05 | T60 |
| VRB-01 | T62, T64, T66 |
| VRB-02 | T61, T63, T67, T68 |
| VRB-03 | T29, T62, T63, T68 |
| HPF-01 | T26 |
| HPF-02 | T26 |
| HPF-03 | T21 |
| HPF-04 | T22, T26 |
| DBH-01 | T7, T14, T35, T36, T64, T65, T69 |
| DBH-02 | T11, T21, T41, T59, T60, T68 |
| DBH-03 | T8, T11 |
| DBH-04 | T12, T41, T42, T44, T45 |

**Coverage:** 70 total, 70 mapeados, 0 sem tarefa.

| Edge case (spec) | Task |
| --- | --- |
| Player morre com fendas abertas: nenhuma unidade nasce | T12, T14 |
| Fenda aberta quando os tetos enchem ainda dá a sua unidade | T8 |
| Última unidade da cota ainda em fenda segura o fechamento | T8 |
| Cota de enxame restante menor que o grupo | T8, T18 |
| Teto de corpos com vaga para menos membros que o grupo | T8 |
| Elite explosiva morta no quadro em que a rodada fecha / antes do rebuild | T44 |
| Elite explosiva morta pela execução do Domínio | T44 |
| Regeneradora no HP máximo não cura nem pulsa | T32, T43 |
| Escudo toma o chip como qualquer golpe (só `heavy` dobra) | T32, T42 |
| `quota` menor que 3 abre só `quota` fendas | T8 |
| `swarm=0` do ato II em diante: cota `L + E`, calibragem com `S = 0` | T18 |
| Depois da 4ª regra do Véu: nenhuma regra nova e o HP segue ×1,15 por ato | T62, T66 |
| Fenda aérea sob teto ou plataforma: membros caem pela gravidade | T21 |
| Kokusen ou finalizador na arena com o chefe morrendo: zoom da arena até a konbini | T60 |
| Página de Selo e de maestria esperando: maestria primeiro | T39, T45 |
| Laboratório de efeitos: nenhuma fenda | T12 |

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8 → Phase 9 → Phase 10 → Phase 11

Phase 1:  T1, T2, T3, T4
Phase 2:  T5, T6, T7, T8
Phase 3:  T9, T10, T11, T12, T13, T14
Phase 4:  T15, T16, T17, T18, T19
Phase 5:  T20, T21, T22, T23, T24, T25, T26
Phase 6:  T27, T28, T29, T30, T31, T32, T33
Phase 7:  T34, T35, T36, T37, T38, T39
Phase 8:  T40, T41, T42, T43, T44, T45, T46, T47
Phase 9:  T48, T49, T50, T51, T52, T53, T54
Phase 10: T55, T56, T57, T58, T59, T60
Phase 11: T61, T62, T63, T64, T65, T66, T67, T68, T69
```

Ordem de execução estritamente sequencial (a linha acima é a ordem de trabalho, não dependência). 69 tarefas,
empacotadas em lotes de fases inteiras (~7 por agente): Fases 1+2 (8), Fase 3 (6), Fase 4 (5), Fase 5 (7), Fase 6 (7),
Fase 7 (6), Fase 8 (8), Fase 9 (7), Fase 10 (6), Fase 11 (9). Agente novo por lote (memória "Agente novo por lote"). Os
lotes com vista (Fases 3, 5, 8 e 10) vão em Opus 5.5 ou Fable, nunca Sonnet; as Fases 2, 4, 6, 7 e as tarefas puras da 9
e da 11 são regra pura e podem ir num modelo mais leve, com revisão no forte. As Fases 1 a 5 só dependem da F29 e da F30:
se a ordem de merge pedir, começam antes do fim da F31 a F33 (design, "Fases anteriores ainda sem código"). O
`validation.md` nasce na T26 com a medição do passo 2 e é completado pelo Verifier no fim.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1, T8, T35 | 1 classe pura (interface + implementação no mesmo módulo) | ✅ |
| T2, T9, T64 | 1 mudança na `Run` | ✅ (T9 ⚠️ coeso: leva a espera do `fight-kit` e o `spawn-pressure`, que o atraso de 600 ms quebraria; sem eles a tarefa não fecha verde) |
| T3 | 1 assinatura do HUD + o texto do único chamador | ⚠️ coeso: a assinatura sem o chamador não compila |
| T4 | 1 diretor novo (refatoração) + as 3 ligações (campo, chamada, opção) | ⚠️ coeso: mover sem ligar quebra a cena |
| T5, T15, T30, T48, T57, T61 | 1 tabela de dados | ✅ |
| T6, T18, T34, T49, T63 | 1 função de plano (ou um ramo dela) | ✅ |
| T7, T36, T65 | 1 parser (ou um campo dele) | ✅ |
| T10 | 1 remoção (refatoração) | ✅ |
| T11 | 1 tipo de snapshot + o campo que o preenche | ⚠️ coeso: o tipo sem o preenchimento não tem prova (L-076) |
| T12 | 1 vista (fenda) + o tratamento do comando que a abre | ⚠️ coeso: a vista sem o comando não tem prova |
| T13, T14 | 1 método do diretor | ✅ |
| T16, T17 | 1 grupo coeso de regras puras do enxame (ajudantes; IA e limitador) | ✅ |
| T19, T38, T52 | 1 função de loot | ✅ |
| T20 | 1 folha de arte + o registro dela | ✅ |
| T21 | 1 componente (pacote + membro) + o nascimento no diretor | ⚠️ coeso: o membro sem o pacote não nasce, e o pacote sem o diretor não tem prova |
| T22 | 1 comportamento do membro (golpe, morte, drop) | ✅ |
| T23 | 1 lista de alvos repassada aos leitores | ✅ |
| T24 | 1 regra no `onConnect` + o método que ela pergunta | ✅ |
| T25 | 1 comportamento do membro (mordida e parry) | ✅ |
| T26 | 1 smoke de medição + o número que ele fixa | ⚠️ coeso: o teto só existe a partir da medição |
| T27, T28, T29, T55, T56 | 1 refatoração | ✅ |
| T31, T32 | 1 grupo de funções puras da elite | ✅ |
| T33 | 1 campo + 1 método no cérebro | ✅ |
| T37, T50, T58, T66 | 1 função de texto (ou um ramo dela) | ✅ |
| T39 | 1 tipo + 1 rank | ✅ |
| T40 | 1 campo de escala atravessando o contexto do inimigo | ⚠️ coeso: escala sem o animador e a barra não aparece |
| T41 | 1 diretor novo + o caminho de nascimento da elite | ⚠️ coeso: o diretor sem o nascimento não tem prova |
| T42, T43, T44 | 1 afixo no jogo | ✅ |
| T45 | 1 prêmio + o crédito do `skip` | ✅ |
| T46 | 1 texto no diretor | ✅ |
| T47 | 1 marca lida por 3 regras de fases anteriores | ⚠️ coeso: a mesma pergunta (`target.elite`) em cada leitor |
| T51 | 1 regra pura | ✅ |
| T53 | 1 método de regras + o uso no `spawner` | ⚠️ coeso: as regras sem o uso não têm prova |
| T54 | 1 regra de rodada no diretor | ✅ |
| T59 | 1 vista + a ligação no diretor | ⚠️ coeso |
| T60 | 1 trava de câmera + a borda que ela usa e o snapshot | ⚠️ coeso: a trava sem a borda não tem limite, e sem o snapshot não tem prova |
| T62 | 1 módulo puro pequeno | ✅ |
| T67 | 1 multiplicador atravessando a leitura do golpe | ⚠️ coeso: sem o leitor a marca não muda nada |
| T68 | 1 ligação das regras do Véu no diretor | ✅ |
| T69 | 1 documento (README) + a tabela do `CLAUDE.md` | ✅ |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | — | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | None | — | ✅ Match |
| T4 | T2, T3 | T2 → T4, T3 → T4 | ✅ Match |
| T5 | None | — | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |
| T8 | T6 | T6 → T8 | ✅ Match |
| T9 | T8 (fase 2) | — (fase anterior) | ✅ Match |
| T10 | T9 | T9 → T10 | ✅ Match |
| T11 | T9 | T9 → T11 | ✅ Match |
| T12 | T11 | T11 → T12 | ✅ Match |
| T13 | T11 | T11 → T13 | ✅ Match |
| T14 | T12 | T12 → T14 | ✅ Match |
| T15 | None | — | ✅ Match |
| T16 | T15 | T15 → T16 | ✅ Match |
| T17 | T16 | T16 → T17 | ✅ Match |
| T18 | T15 | T15 → T18 | ✅ Match |
| T19 | None | — | ✅ Match |
| T20 | None | — | ✅ Match |
| T21 | T20 | T20 → T21 | ✅ Match |
| T22 | T21 | T21 → T22 | ✅ Match |
| T23 | T22 | T22 → T23 | ✅ Match |
| T24 | T22 | T22 → T24 | ✅ Match |
| T25 | T21 | T21 → T25 | ✅ Match |
| T26 | T22, T25 | T22 → T26, T25 → T26 | ✅ Match |
| T27 | None | — | ✅ Match |
| T28 | T27 | T27 → T28 | ✅ Match |
| T29 | None | — | ✅ Match |
| T30 | None | — | ✅ Match |
| T31 | T30 | T30 → T31 | ✅ Match |
| T32 | T31 | T31 → T32 | ✅ Match |
| T33 | T32 | T32 → T33 | ✅ Match |
| T34 | None | — | ✅ Match |
| T35 | T34 | T34 → T35 | ✅ Match |
| T36 | None | — | ✅ Match |
| T37 | None | — | ✅ Match |
| T38 | None | — | ✅ Match |
| T39 | None | — | ✅ Match |
| T40 | None | — | ✅ Match |
| T41 | T40 | T40 → T41 | ✅ Match |
| T42 | T41 | T41 → T42 | ✅ Match |
| T43 | T41 | T41 → T43 | ✅ Match |
| T44 | T41 | T41 → T44 | ✅ Match |
| T45 | T41 | T41 → T45 | ✅ Match |
| T46 | None | — | ✅ Match |
| T47 | T41 | T41 → T47 | ✅ Match |
| T48 | None | — | ✅ Match |
| T49 | None | — | ✅ Match |
| T50 | T49 | T49 → T50 | ✅ Match |
| T51 | None | — | ✅ Match |
| T52 | None | — | ✅ Match |
| T53 | T48, T51, T52 | T48 → T53, T51 → T53, T52 → T53 | ✅ Match |
| T54 | T49, T50 | T49 → T54, T50 → T54 | ✅ Match |
| T55 | None | — | ✅ Match |
| T56 | T55 | T55 → T56 | ✅ Match |
| T57 | None | — | ✅ Match |
| T58 | T57 | T57 → T58 | ✅ Match |
| T59 | T57, T58 | T57 → T59, T58 → T59 | ✅ Match |
| T60 | T56 | T56 → T60 | ✅ Match |
| T61 | None | — | ✅ Match |
| T62 | T61 | T61 → T62 | ✅ Match |
| T63 | T62 | T62 → T63 | ✅ Match |
| T64 | T63 | T63 → T64 | ✅ Match |
| T65 | T62 | T62 → T65 | ✅ Match |
| T66 | T62 | T62 → T66 | ✅ Match |
| T67 | T64 | T64 → T67 | ✅ Match |
| T68 | T63, T64, T65, T66, T67 | T63 → T68, T64 → T68, T65 → T68, T66 → T68, T67 → T68 | ✅ Match |
| T69 | T68 | T68 → T69 | ✅ Match |

Nenhuma dependência aponta para fase posterior. As dependências de fase anterior que não aparecem no corpo (ex.: a T21 usa o `SwarmBrain` da T17 e a composição da T18; a T41 usa a fenda da elite da T35 e o drop da T38) são garantidas pela ordem das fases.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1: Interface da onda da rodada e o embrulho do `WaveSpawner` | Regra pura | unit | unit | ✅ OK |
| T2: A `Run` fala com a onda pela interface | Regra pura | unit | unit | ✅ OK |
| T3: O HUD recebe o texto pronto do contador | Adaptador (HUD) | smoke | smoke | ✅ OK |
| T4: `HordeDirector` assume o `spawn` e o HUD da rodada | Adaptadores | smoke | smoke | ✅ OK |
| T5: Números do diretor | Números de ajuste | unit | unit | ✅ OK |
| T6: Plano da rodada | Regra pura | unit | unit | ✅ OK |
| T7: Parâmetros de debug da horda | Regra pura | unit | unit | ✅ OK |
| T8: Diretor por orçamento com fenda | Regra pura | unit | unit | ✅ OK |
| T9: A `Run` usa o `Horde` | Regra pura + smokes do jogo (o atraso de 600 ms chega à cena) | smoke (o mais alto) | smoke | ✅ OK |
| T10: Sai o `WaveSpawner` | Regra pura | unit | unit | ✅ OK |
| T11: Snapshot da horda | Tipo de snapshot + adaptadores | smoke (+ unit do literal) | smoke | ✅ OK |
| T12: Fenda no mundo | Adaptadores | smoke | smoke | ✅ OK |
| T13: Contador de abates no HUD | Adaptadores | smoke | smoke | ✅ OK |
| T14: Parâmetros da horda no jogo | Adaptadores | smoke | smoke | ✅ OK |
| T15: Números do enxame | Números de ajuste | unit | unit | ✅ OK |
| T16: Regras pequenas do enxame | Regra pura | unit | unit | ✅ OK |
| T17: IA e limitador do enxame | Regra pura | unit | unit | ✅ OK |
| T18: Composição com enxame e calibragem da renda | Regra pura | unit | unit | ✅ OK |
| T19: Drop do membro do enxame | Regra pura | unit | unit | ✅ OK |
| T20: Folha provisória do enxame | Arte em código | unit | unit | ✅ OK |
| T21: O enxame nasce em grupo e persegue | Adaptadores + tipo de snapshot | smoke (+ unit do literal) | smoke | ✅ OK |
| T22: O membro apanha, morre e conta | Adaptadores | smoke | smoke | ✅ OK |
| T23: Técnicas e Domínio miram o enxame | Adaptadores | smoke | smoke | ✅ OK |
| T24: Golpe em grupo conta uma vez | Adaptadores | smoke | smoke | ✅ OK |
| T25: Mordida, limitador e parry | Adaptadores | smoke | smoke | ✅ OK |
| T26: Medição com muitos corpos e o teto fixado | Adaptadores (smoke de medição) + número de ajuste | smoke (o mais alto) | smoke | ✅ OK |
| T27: Ciclo de chaves do contorno sai do chefe | Regra pura (F32) | unit | unit | ✅ OK |
| T28: Contorno de afixo para qualquer sprite | Adaptadores | smoke | smoke | ✅ OK |
| T29: Multiplicador extra de vida na escala | Regra pura | unit | unit | ✅ OK |
| T30: Números e nomes da elite | Números de ajuste | unit | unit | ✅ OK |
| T31: Afixos, ajuste, rótulo e contorno da elite | Regra pura | unit | unit | ✅ OK |
| T32: Escudo, regeneração e explosão como regra pura | Regra pura | unit | unit | ✅ OK |
| T33: Escudo e cura no cérebro do inimigo | Regra pura | unit | unit | ✅ OK |
| T34: Elite no plano da rodada | Regra pura | unit | unit | ✅ OK |
| T35: Fenda da elite | Regra pura | unit | unit | ✅ OK |
| T36: Parâmetro de debug da elite | Regra pura | unit | unit | ✅ OK |
| T37: Texto da faixa de fechamento | Regra pura | unit | unit | ✅ OK |
| T38: Drop da elite | Regra pura | unit | unit | ✅ OK |
| T39: Página de Selo na fila de escolhas | Regra pura (F33) | unit | unit | ✅ OK |
| T40: Escala, cura e marca de elite no lutador | Adaptadores | smoke | smoke | ✅ OK |
| T41: A elite nasce | Adaptadores | smoke | smoke | ✅ OK |
| T42: Escudo da elite no jogo | Adaptadores | smoke | smoke | ✅ OK |
| T43: Elite regeneradora | Adaptadores | smoke | smoke | ✅ OK |
| T44: Elite explosiva | Adaptadores | smoke | smoke | ✅ OK |
| T45: Selo da elite | Adaptadores | smoke | smoke | ✅ OK |
| T46: Aviso da 1ª elite na faixa | Adaptadores | smoke | smoke | ✅ OK |
| T47: Regras de elite das fases anteriores leem a marca | Regra das F30/F31/F33 + adaptadores | smoke (o mais alto) | smoke | ✅ OK |
| T48: Regras por ato | Números de ajuste | unit | unit | ✅ OK |
| T49: Plano da rodada de enxame | Regra pura | unit | unit | ✅ OK |
| T50: Faixas da rodada de enxame | Regra pura | unit | unit | ✅ OK |
| T51: Bruto pesado no ato IV | Regra pura | unit | unit | ✅ OK |
| T52: Teto da chance de armado por parâmetro | Regra pura | unit | unit | ✅ OK |
| T53: Regras do lutador por ato no jogo | Adaptadores | smoke | smoke | ✅ OK |
| T54: Rodada de enxame no jogo | Adaptadores | smoke | smoke | ✅ OK |
| T55: Pulso de zoom sobre um zoom base | Regra pura | unit | unit | ✅ OK |
| T56: Câmera com zoom base único | Adaptadores | smoke | smoke | ✅ OK |
| T57: Luz de cada ato | Números de ajuste | unit | unit | ✅ OK |
| T58: Faixa de troca de ato | Regra pura | unit | unit | ✅ OK |
| T59: Véu de luz do ato | Adaptadores | smoke | smoke | ✅ OK |
| T60: Arena do chefe como sala-portão | Adaptadores + tipo de snapshot | smoke (+ unit do literal) | smoke | ✅ OK |
| T61: Números do Véu Rompido | Números de ajuste | unit | unit | ✅ OK |
| T62: Ordem e vida do Véu | Regra pura | unit | unit | ✅ OK |
| T63: Véu no plano da rodada | Regra pura | unit | unit | ✅ OK |
| T64: Ordem do Véu sorteada no início da run | Regra pura | unit | unit | ✅ OK |
| T65: Parâmetro de debug do Véu | Regra pura | unit | unit | ✅ OK |
| T66: Faixa do Véu Rompido | Regra pura | unit | unit | ✅ OK |
| T67: Guarda firme | Adaptadores | smoke | smoke | ✅ OK |
| T68: Véu Rompido no jogo | Adaptadores | smoke | smoke | ✅ OK |
| T69: Documentação e conferência final de linhas | Documentação | none | none | ✅ OK |

A T9 é regra pura que muda o jogo (todo nascimento passa a sair 600 ms depois), por isso leva os smokes que o atraso quebraria na mesma tarefa. A T21 entrega o membro que ainda recusa golpe; a T22, na mesma fase e no mesmo lote, prova o golpe e a morte (merge forward). A T69 é só documentação e a matriz diz `none` para essa camada. Nenhuma tarefa adia teste para outra.
