# Técnicas JJK 1 — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/tecnicas-jjk-1/spec.md`
**Design**: `.specs/features/tecnicas-jjk-1/design.md`
**Plano**: `docs/plano-builds-e-habilidades.md` (linha F34 da seção 6; seções 2.5, 4 e 5.1; regra do `TechEmitter` da
seção 6; decisão 4 da seção 7)
**Base**: F29 `fundacao-de-poder`, F30 `vermelho-e-corpo`, F31 `expansao-de-dominio`, F33 `eixos-das-tecnicas` e as
regras puras da leva 1 (`feat/regras-tecnicas-leva1`, `519ac6b`), todas mergeadas antes da T1
**Status**: Draft
**Branch**: `feat/tecnicas-jjk-1`, aberta depois do merge da F33 com as regras puras da leva 1
**Ferramentas**: nenhuma MCP. Skill só o `tlc-spec-driven`. As tarefas de vista e de ícone (T19, T20, T21, T22, T23,
T40, T50, T62) são conferidas no jogo em HD (`?hd=1`), em movimento e com o player virado para os dois lados (ICO-09,
BWG-13, RSN-14, FLA-12; memória "Conferir animação em movimento"): captura pelo `window.__game` e uma passada jogando.
Vista, arte e revisão em Opus 5.5 ou Fable, nunca Sonnet (memória "Delegar o leve, qualidade no forte").

Regras que valem para toda tarefa (CLAUDE.md): um commit por tarefa, só os arquivos dela (nunca `git add -A`), `npm run
gate` verde uma vez antes do commit; durante a tarefa só o teste do arquivo tocado (`npx vitest run <arquivo>`), porque
a máquina roda outras frentes; smoke só do que foi tocado; smoke novo com `?debug&hd=1&area=modular`; tetos de 400
linhas efetivas por arquivo, 80 por função e complexidade 15; arquivo novo nunca entra no `.oxlintrc.json`; teste da
lista de exceções do `max-lines` (`tests/core/enemyBrain.test.ts`, `bossBrain.test.ts`, `run.test.ts`) não cresce: o
caso novo vai para arquivo novo. Linha efetiva = sem linha em branco e sem comentário, como o `max-lines` do
`.oxlintrc.json`.

Regras próprias da F34:

- **`TestScene`** (JJK-15): a T2 tira as ~20 linhas da construção do `TechRunner`; nenhuma outra tarefa soma linha
  efetiva nela. `Hud.ts`, `data/moves.ts` e `ShopPanel.ts` não crescem; `Player.ts` não ganha campo; `Enemy.ts` e
  `Boss.ts` terminam com no máximo 400 efetivas.
- **REG-04**: das T32 em diante, nenhuma tarefa toca `src/game/TechRunner.ts`, `src/game/TechCaster.ts` nem
  `src/scenes/test/techDirector.ts`; a técnica nova entra por uma linha em `src/game/tech/registry.ts`. Porta nova vai
  em `game/tech/shared.ts` (`TechPorts`) e `scenes/test/techPorts.ts`.
- **Refatoração** (T2 a T10, T13 a T15): os smokes do passo passam sem mudança; teste que lê fonte (`?raw`) acompanha.
- **Interfaces das fases anteriores citadas pelo nome** (F29: `Hit.band`, `DamageNumbers`, `effects.onTechConnect`,
  `StatsDirector`; F30: `AxisBuild`, `Loadout.stats`/`refundCooldown`, `TechCaster.slotHeld`, `StrikeEmitter`,
  `bodyDirector`, `FistWaveFx`, `redFlight.ts`, `axisSnapshot.ts`, `shopPricing.newTechPrice`; F31: `SanctuaryTriggers`,
  `domainPowers.cutNow`, `DomainBar`, `TechCaster.locked`; F33: `AXIS_ITEMS`, `RESOLVERS`, `castHit`, `awakenCast`,
  `BlueOrbState.setPosition`, `PurpleFlight`, `choiceDirector`): a tarefa que toca uma delas reconfere o nome e a
  assinatura no código mergeado antes de começar; se mudou, segue o código e anota a troca no commit.
- **Aval pendente** (spec e design, Risks): a troca da mediana do eixo dominante da Ressonância (T45). Sem o aval do
  usuário até a tarefa, ela para e pergunta. A causa `tech` no atordoamento do chefe (T54) deixou de ser aval: a
  revisão a tornou o default da spec (o `stun(ms)` de hoje abre o finalizador a cada Fala).

---

## Test Coverage Matrix

> Guidelines: `CLAUDE.md` (camadas, gate, smoke só do que foi tocado, HD é a base), `.oxlintrc.json` (tetos e lista de
> exceções), `vitest.config.ts`, `package.json` (`gate`, `test`, `smoke`); lições L-010 (limite testado nos dois
> lados), L-043 (testar o adaptador que repassa o número ao motor, não só a regra pura), L-076 (campo de debug que só
> repete a entrada não prova o efeito). Amostras: `tests/core/cast.test.ts`, `tests/core/boogie.test.ts`,
> `tests/core/resonance.test.ts`, `tests/core/enemyBrain.test.ts`, `tests/data/techniques.test.ts`,
> `tests/game/debugApi.test.ts`, `tests/game/art/sceneryRaster.ts`, `scripts/smoke/techniques.smoke.mjs`,
> `scripts/smoke/hud.smoke.mjs`, `scripts/smoke/fight-kit.mjs`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Regra pura (`src/core/**`) | unit | 1:1 com os ACs; todo edge case listado; cada limite nos dois lados (L-010): 79/80/81 e 249/250/251 ms da Palma Falsa, 599/600/601 ms do atordoamento, 999/1000/1001 ms do teto do emissor, vida = custo e custo + 1, piso de 60% do custo (12 e 13 no Boogie, 15 e 16 na Ressonância e na Fala) | `tests/core/*.test.ts` (teste par por arquivo novo) | `npx vitest run tests/core/<arquivo>` |
| Números de ajuste (`src/data/**`) | unit | Números do plano (seções 2.5 e 5.1) e da spec conferidos um a um; nomes de ramo e Despertar únicos; toda chave de cor na `PALETTE` | `tests/data/*.test.ts` | `npx vitest run tests/data/<arquivo>` |
| Arte em código (`src/game/art/**`) | unit | Quadros com o tamanho e as chaves do design, só cores da `PALETTE`; prancha olhada antes do commit | `tests/game/art/*.test.ts` | `npx vitest run tests/game/art/<arquivo>` |
| Tipos de snapshot e fonte (`src/game/techSnapshot.ts`, `debugApi.ts`, teste `?raw`) | unit | Literal do snapshot com os campos novos; o fonte do runner, do caster e do registro sem nome de técnica (REG-01, REG-04) | `tests/game/*.test.ts` | `npx vitest run tests/game/<arquivo>` |
| Adaptadores (`src/game/**`, `src/scenes/**`) | smoke | Efeito lido do jogo vivo pelo snapshot, medido na saída e não no pedido (L-043, L-076); refatoração com os smokes de antes iguais | `scripts/smoke/boogie.smoke.mjs`, `resonance.smoke.mjs`, `cursed-speech.smoke.mjs` (novos) e os smokes de cada tarefa | `npm run smoke -- <trecho>` |
| Documentação (`README.md`, `CLAUDE.md`, `.specs/STATE.md`) | none | build gate only | - | `npm run gate` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tarefa só com teste unitário (regra pura, dados, arte, tipos) | `npx vitest run <arquivo do teste>` durante a tarefa; `npm run gate` uma vez antes do commit |
| Full | Tarefa de adaptador (smoke) | `npm run gate && npm run smoke -- <cada trecho da tarefa>` |
| Build | Fim de fase e tarefa só de documentação | `npm run gate` e os smokes do passo ("Smokes por passo" do design) |

Base: a contagem de testes unitários do merge da F33, anotada pela T1. Nenhuma tarefa apaga teste (a T13 move o
`strikeEmitter.test.ts` com `git mv`, sem perder caso); cada uma informa a nova contagem. Smokes instáveis: `armed`
(ARM-12) e timeouts sob carga: repetir isolado antes de suspeitar.

Os três smokes novos nascem na tarefa de entrada da técnica (T32, T46, T58) e ganham um cenário por tarefa de
adaptador, na ordem de "Testes e smokes" do design. Passando de 380 linhas efetivas, o cenário seguinte vai a um
arquivo irmão (`boogie-branches.smoke.mjs`, `resonance-branches.smoke.mjs`, `cursed-speech-branches.smoke.mjs`), com
a mesma base de URL.

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Passo 0 — portão da conjuração, portas e quadro

```
T1
T2 → T3
```

### Phase 2: Passo 0 — cinco módulos e o registro

```
T4 → T9
T5 → T9
T6 → T9
T7 → T9
T8 → T9 → T10 → T11
T9 → T11
```

### Phase 3: Passos 1 e 2 — contrato do `techObjects` e `TechEmitter`

```
T12
T13 → T14 → T15
```

### Phase 4: Passo 3 — ícone HD

```
T16 → T17 → T18 → T20 → T23
T18 → T22
T20 → T22
T17 → T19 → T23
T17 → T21 → T23
```

### Phase 5: Passo 4 — Boogie Woogie, regra pura e dados

```
T24 → T30
T25
T26
T27
T28
T29
T31
```

### Phase 6: Passo 4 — Boogie Woogie no jogo, a troca

```
T32 → T33 → T34
T33 → T35
T33 → T36
```

### Phase 7: Passo 4 — Boogie Woogie, ramos, vista e loja

```
T37 → T38
T37 → T40
T39 → T40
T41
```

### Phase 8: Passo 5 — Ressonância, regra pura, dados e entrada

```
T42 → T46
T43 → T46
T44 → T46
T45 → T46
```

### Phase 9: Passo 5 — Ressonância no jogo

```
T47 → T48
T47 → T49
T47 → T50
T51
```

### Phase 10: Passo 6 — Fala Amaldiçoada, regra pura e dados

```
T52
T53
T54
T55
T56
```

### Phase 11: Passo 6 — Fala Amaldiçoada no jogo e fechamento

```
T57 → T58 → T59 → T64
T58 → T60 → T61 → T64
T60 → T62 → T64
T58 → T63 → T64
```

---

## Task Breakdown

### Phase 1: Passo 0 — portão da conjuração, portas e quadro

#### T1: Portão do módulo e sinal segurado na `CastMachine`

**What**: em `src/core/cast.ts`, `PressAnswer` (`cast` com `skipCooldown?`, `consume`, `deny` com motivo),
`PressGate` (`answerPress`, `holdSign`), `CastSlot = ActiveCastView['slot']`, `DenyReason` com `'hp'`, `CastEvent`
`{ type: 'consumed' }` e `CastContext.answer?`; o `request` na ordem do design (`consume` sem `locked` antes de tudo →
conjuração ativa → slot vazio → `locked` → `busy` → `deny` → recarga, pulada com `skipCooldown` → energia → `sign`);
`update(dtMs, holdSign?)` que segura o `sign` enquanto o `holdSign` for verdadeiro e sai no mesmo `update` quando ele
cai. Sem resposta e sem `holdSign`, o caminho de hoje.
**Where**: `src/core/cast.ts`
**Depends on**: None
**Reuses**: `CastMachine` (`cast.ts:74-132`); molde dos casos de `tests/core/cast.test.ts`
**Requirement**: REG-02

**Done when**:

- [ ] `tests/core/castGate.test.ts` (novo): `consume` devolve `[{ type: 'consumed' }]` sem gastar energia nem iniciar
      recarga, inclusive com outra conjuração ativa e com golpe em curso, e perde para o `locked` (`denied:domain`);
      `deny` emite `denied:cooldown` e `denied:hp` e não entra em `sign`; `skipCooldown` passa com recarga > 0 e ainda
      cobra a energia na entrada de `release`; sem `answer`, os casos de recarga, energia e `busy` de hoje
- [ ] `holdSign`: com `sign` de 80 ms e o `holdSign` verdadeiro, aos 249 ms a máquina ainda está em `sign` e o
      `elapsedMs` conta 249; no `update` em que o `holdSign` cai, ela sai do `sign`; dano em `sign` segurado cancela
      sem cobrar energia nem recarga (CAST-07)
- [ ] `tests/core/cast.test.ts` sem mudança e verde
- [ ] Gate verde; anotar aqui a contagem de testes do merge da F33 (base) e a nova

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): let a technique module answer the slot press`

---

#### T2: Portas das técnicas fora da `TestScene`

**What**: em `src/game/tech/shared.ts`, `TechPorts` (o que vem da cena: `scene`, `player`, `loadout`, `energy`, `fx`,
`fxRegistry`, `uiLayer`, `terrain`, `onTechHit`, `triggerHitstop`, `onKokusen`, `onCastHit`, `roll`), `TechServices`
(`currentCast`, `castHit`, `emit`) e `TechContext = TechPorts & TechServices`; `src/scenes/test/techPorts.ts` com
`techPorts(s)` montando as lambdas que hoje estão na chamada da `TestScene` (lendo `s` na hora da chamada); o
`TechRunner` passa a ter `constructor(ports: TechPorts)` e monta o contexto; `TestScene.createTechniques` vira
`this.techRunner = new TechRunner(techPorts(this));`.
**Where**: `src/scenes/test/techPorts.ts`
**Depends on**: None
**Reuses**: a chamada de hoje (`TestScene.ts:310-331`); contrato do `TechContext` (`game/tech/shared.ts:26-47`)
**Requirement**: REG-01, JJK-15

**Done when**:

- [ ] `TestScene` perde ~20 linhas efetivas (anotar antes e depois); nenhuma lambda nova muda o que chama
- [ ] Smokes `tech`, `techniques`, `red-anime`, `kokusen`, `evolution`, `fight`, `fxlab`, `tech-axes`, `domain`, `hud`
      e `cursed-body` verdes sem mudança (REG-01.2)
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(tech): build the technique ports outside the scene`

---

#### T3: Contrato do módulo e quadro único

**What**: `src/game/tech/module.ts` com `TechModule`, `TechFrame` (`dtMs`, `cast`, `castEvents`, `slotPressed`,
`slotHeld`, `slotConsumed`, `enemies`, `boss`), `TechInput`, `TechObjectView`, `TechContribution` e `SlotHudHint`, como
em "Data Models" do design; `TechRunner.update(input: TechInput)` no lugar dos argumentos soltos (repassa às técnicas o
que cada uma lê hoje); `techDirector` monta o quadro uma vez por quadro (`slotConsumed` fica `[false, false]` até a
T10).
**Where**: `src/game/tech/module.ts`
**Depends on**: T2
**Reuses**: argumentos de hoje (`techDirector.ts:22-29`); `TechCaster.slotHeld` (F30)
**Requirement**: REG-01

**Done when**:

- [ ] Nenhuma alocação nova por quadro além do `TechFrame` (montado uma vez no `techDirector`)
- [ ] Smokes `tech`, `techniques`, `red-anime`, `kokusen`, `fight`, `fxlab` e `tech-axes` verdes sem mudança
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(tech): pass one frame to the technique runner`

---

### Phase 2: Passo 0 — cinco módulos e o registro

#### T4: Divergente como módulo

**What**: `src/game/tech/divergent.ts` implementa `TechModule`: `id`, `update(f)` lendo `f.cast`, `f.castEvents` e
`f.slotPressed`, `contribute()` com o `kokusen` (o getter de `:66-74` vira a contribuição); o construtor recebe só o
`ctx`. O `TechRunner` ainda chama o módulo pelo campo (o registro entra na T9).
**Where**: `src/game/tech/divergent.ts`
**Depends on**: T3
**Reuses**: `divergent.ts:33-90`
**Requirement**: REG-01, REG-03

**Done when**:

- [ ] `kokusenSnapshot` do runner lido da contribuição, com o mesmo contrato (REG-03)
- [ ] Smokes `kokusen`, `tech`, `techniques` e `fxlab` verdes sem mudança
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(tech): turn the divergent fist into a technique module`

---

#### T5: Vermelho como módulo

**What**: `src/game/tech/red.ts` (com o `redFlight.ts` da F30) implementa `TechModule`: `id`, `update(f)`, `objects()`
(a entrada de hoje, com `sensorPx` e `texture`), `contribute()` com o `red` (o `debugState` de `:53-56`); o construtor
recebe só o `ctx` (`fx`, `fxRegistry` e `terrain` vêm das portas).
**Where**: `src/game/tech/red.ts`
**Depends on**: T3
**Reuses**: `red.ts:39-73`, `redFlight.ts` (F30)
**Requirement**: REG-01, REG-03

**Done when**:

- [ ] `fx.red` do snapshot lido da contribuição, com o mesmo contrato (REG-03)
- [ ] Smokes `red-anime`, `red-axes`, `techniques`, `tech` e `fxlab` verdes sem mudança
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(tech): turn the red orb into a technique module`

---

#### T6: Azul como módulo

**What**: `src/game/tech/blue.ts` implementa `TechModule`: `id`, `update(f)`, `objects()` (as entradas de hoje, com o
`radius` da F33); construtor só com o `ctx`.
**Where**: `src/game/tech/blue.ts`
**Depends on**: T3
**Reuses**: `blue.ts:21-42`
**Requirement**: REG-01

**Done when**:

- [ ] Smokes `techniques`, `tech-axes`, `tech` e `fxlab` verdes sem mudança
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(tech): turn the blue orb into a technique module`

---

#### T7: Desmantelar como módulo

**What**: `src/game/tech/cut.ts` implementa `TechModule`: `id`, `update(f)`; construtor só com o `ctx`.
**Where**: `src/game/tech/cut.ts`
**Depends on**: T3
**Reuses**: `cut.ts:11-24`
**Requirement**: REG-01

**Done when**:

- [ ] Smokes `techniques`, `tech-axes` e `tech` verdes sem mudança
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(tech): turn the cut into a technique module`

---

#### T8: Roxo como módulo

**What**: `src/game/tech/purple.ts` implementa `TechModule`: `id`, `update(f)`, `objects()` (as entradas de hoje, com
o `radius` da F33); construtor só com o `ctx`.
**Where**: `src/game/tech/purple.ts`
**Depends on**: T3
**Reuses**: `purple.ts:21-46`, `PurpleFlight` (F33)
**Requirement**: REG-01

**Done when**:

- [ ] Smokes `evolution`, `tech-axes` e `tech` verdes sem mudança
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(tech): turn the purple orb into a technique module`

---

#### T9: Registro `TechId → TechModule` e runner sem técnica

**What**: `src/game/tech/registry.ts` com `TECH_MODULES: Record<TechId, (ctx) => TechModule>` (ordem `divergente`,
`vermelho`, `azul`, `corte`, `roxo`) e `buildModules(ctx)`; o `TechRunner` itera o registro e perde todo campo, import,
getter e ramo com nome de técnica; ganha `answerPress`, `holdSign`, `hudHint`, `rebuild`, `roundEnd`,
`snapshotFields()` (`kokusen`, `techObjects` na forma de hoje), `fxFields()` (`red`) e os serviços `objects()` e
`relocate(tech, id, at)` no contexto; `snapshot.ts:180-181` e `:186` viram os espalhamentos; `runDirector` chama
`techRunner.rebuild()` no `roundStart` e `techRunner.roundEnd()` no `roundCleared`; as 2 leituras de
`kokusenSnapshot` no `techDirector` viram `snapshotFields().kokusen`.
**Where**: `src/game/tech/registry.ts`
**Depends on**: T4, T5, T6, T7, T8
**Reuses**: `castHit` da F33 (fica como está); `TechRunner.ts:84-116`
**Requirement**: REG-01, REG-03, REG-04

**Done when**:

- [ ] `tests/game/techRunnerSource.test.ts` (novo, `?raw`): `TechRunner.ts` e `TechCaster.ts` não citam nenhum id de
      `TECHNIQUES` nem `tech/<técnica>`; `registry.ts` tem uma chave por `TechId` (REG-01, REG-04)
- [ ] `kokusen` e `fx.red` do snapshot com o contrato de hoje (REG-03)
- [ ] Smokes `tech`, `techniques`, `red-anime`, `kokusen`, `evolution`, `fight`, `fxlab`, `tech-axes`, `domain`, `hud` e
      `cursed-body` verdes sem mudança (REG-01.2)
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: full
**Commit**: `refactor(tech): run every technique from a module registry`

---

#### T10: Portão de tecla no `TechCaster`

**What**: `TechCaster.update(dtMs, gate?: PressGate)` pergunta `gate.answerPress(slot, id)` para o slot apertado e
passa a resposta no `CastContext.answer`; `consumed` marca `slotConsumed[slot]` (zerado a cada `update`), sem evento de
debug e sem `cancelMelee` (REG-02.4); o `holdSign` repassado à máquina é montado uma vez no construtor e lê o `gate` e o
`slotHeld`; `mapEvents` ignora `consumed`; o `techDirector` passa `this.s.techRunner` como portão, põe o
`slotConsumed` no quadro, pisca a barra com `techDenied:energy` e, com `techDenied:hp`, chama `energyHud.flashSlot(slot)`
(novo: o ícone do slot apertado pisca em vermelho pelo tempo do flash da TEC-10 e `icons[i].flashing` entra no
`debugState`; a barra de energia não pisca). O `requestSlot` do FxLab segue sem portão.
**Where**: `src/game/TechCaster.ts`
**Depends on**: T9
**Reuses**: `TechCaster.ts:79-94`, `:101-112`; `framePressed` como molde do `slotConsumed`
**Requirement**: REG-02

**Done when**:

- [ ] Sem módulo que declare portão, smokes `tech`, `techniques`, `red-anime`, `kokusen`, `fight`, `fxlab`, `domain` e
      `hud` verdes sem mudança (a prova do `consume` e do `deny` no jogo vivo vem na T32, T46 e T58; a regra está
      coberta pelo `castGate.test.ts` da T1)
- [ ] `techRunnerSource.test.ts` verde
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(tech): ask the technique module before the cast machine`

---

#### T11: Decisão AD-029 e mapa do CLAUDE.md

**What**: `.specs/STATE.md` ganha a **AD-029** com o texto de "Tech Decisions" do design (técnica é `TechModule` no
registro; efeito fora da conjuração pelo `TechEmitter`; ícone é o quadro HD com o id da técnica); a linha "Técnicas" da
tabela "Onde mexer" do `CLAUDE.md` passa a citar `game/tech/registry.ts` (um módulo por técnica) e, a partir da T14,
`core/techEmitter.ts` + `scenes/test/emitterDirector.ts`.
**Where**: `.specs/STATE.md`
**Depends on**: T9, T10
**Reuses**: formato das AD de `STATE.md`
**Requirement**: REG-01

**Done when**:

- [ ] AD-029 gravada (renumerar se a AD-028 da F35 ainda não entrou, anotando no commit)
- [ ] Linha "Técnicas" do `CLAUDE.md` atualizada
- [ ] Gate verde

**Tests**: none
**Gate**: build
**Commit**: `docs(state): record the technique module registry decision`

---

### Phase 3: Passos 1 e 2 — contrato do `techObjects` e `TechEmitter`

#### T12: Contrato aberto do `techObjects`

**What**: `src/game/techSnapshot.ts` com `TechObjectSnapshot = TechObjectView & { tech: TechId }`,
`TechStateSnapshot` (vazio nesta tarefa), `KokusenView`, `TechSnapshotFields`, `TechFxFields`, `EMPTY_KOKUSEN` e
`EMPTY_RED_FX`; `debugApi.ts` importa os tipos (`techObjects: TechObjectSnapshot[]`, `techState`); o runner põe `tech`
em cada entrada, na ordem do registro e depois pelo `id`, e `techState: {}`; Vermelho, Azul e Roxo declaram
`kind: 'orb'`; todo smoke que busca orbe por `kind` passa a buscar por `tech` e `kind === 'orb'` (começar com
`grep -rn "techObjects" scripts/smoke`: `evolution` 75 e 126, `red-anime` 120 e 149, `techniques` 106, 188 e 225, mais
`red-axes` da F30 e `tech-axes` da F33).
**Where**: `src/game/techSnapshot.ts`
**Depends on**: T9
**Reuses**: `debugApi.ts:334`; `objects()` dos módulos (T5, T6, T8)
**Requirement**: TOB-01, TOB-02, TOB-03

**Done when**:

- [ ] `tests/game/debugApi.test.ts`: o literal ganha uma entrada `{ id, tech, kind: 'orb', x, y, traveled }` do
      Vermelho, do Azul e do Roxo e `techState: {}` (TOB-01, TOB-02)
- [ ] Smokes `evolution`, `red-anime`, `techniques`, `red-axes` e `tech-axes` verdes só com a busca trocada, todas as
      outras asserções iguais (TOB-02); `tech`, `kokusen`, `fxlab` e `hud` verdes
- [ ] Com `tech=vermelho,azul` e os dois orbes vivos, a lista vem na ordem do registro (Vermelho antes do Azul) e
      depois pelo `id` (TOB-03), lido num cenário do `techniques.smoke.mjs`
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(debug): open the technique objects snapshot to any technique`

---

#### T13: `TechEmitter` puro

**What**: `src/core/techEmitter.ts` com `EmitSource = 'wave' | 'sanctuary' | 'strawDoll'` e a classe `TechEmitter`:
`tryEmit(source, nowMs)` e `countAt(source, nowMs)` (janela deslizante de `EMITTER.windowMs` 1000 com no máximo
`EMITTER.maxPerWindow` 4, uma por fonte; conta enquanto `now − t < 1000`); `emit`, `update`, `waves` e `reset` com a
assinatura do `StrikeEmitter` da F30 (fonte `wave`); `channel(source)` com a assinatura do `SanctuaryTriggers` da F31;
todo `WaveHit` com `band: 'micro'`. `git mv tests/core/strikeEmitter.test.ts tests/core/techEmitter.test.ts` com só o
import e o construtor trocados, mais os casos novos. O `strikeEmitter.ts` ainda fica (sai na T14).
**Where**: `src/core/techEmitter.ts`
**Depends on**: None
**Reuses**: `core/strikeEmitter.ts` (F30), `SanctuaryTriggers` (F31); `EMITTER` de `data/techAxes.ts`
**Requirement**: EMI-01, EMI-02, EMI-03, EMI-04

**Done when**:

- [ ] Casos do `strikeEmitter.test.ts` verdes no `techEmitter.test.ts` com só o import e o construtor trocados
      (EMI-04.6)
- [ ] EMI-03: 4 emissões por fonte; a 5ª a 999 ms da 1ª cai; a 1000 ms e a 1001 ms sai; a fonte `wave` cheia não muda
      o `countAt` de `sanctuary` nem de `strawDoll`
- [ ] EMI-02: todo `WaveHit` com `band: 'micro'`; a classe não recebe energia, maestria nem barra de Domínio
- [ ] Gate verde; contagem de testes sem perda (casos movidos contam iguais)

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the single technique emitter`

---

#### T14: Onda do Punho pelo emissor

**What**: `src/scenes/test/emitterDirector.ts` (campo `emitter` do `BuildDirector`, `reset` no `BuildDirector.reset`)
com `wave(at, dir, damage, opts)`, `update(dtMs)` (relógio de jogo próprio, ondas andando, `WaveHit` entregues pelo
`effects.onTechConnect`, `FistWaveFx` desenhada), `countAt(source)` e `reset()`; o `bodyDirector` chama
`build.emitter.wave(...)` e perde o `StrikeEmitter`, a entrega dos acertos e a `FistWaveFx`; o `techDirector` chama
`this.s.build.emitter.update(dt)` logo depois do `build.body.update(dt)`; `src/core/strikeEmitter.ts` sai.
**Where**: `src/scenes/test/emitterDirector.ts`
**Depends on**: T13
**Reuses**: `bodyDirector.onMeleeHit`/`update` (F30); `FistWaveFx` (F30); `effects.onTechConnect` (F29)
**Requirement**: EMI-01, EMI-02, EMI-04

**Done when**:

- [ ] `grep -rn "strikeEmitter\|StrikeEmitter" src tests` vazio (EMI-01)
- [ ] Smoke `cursed-body` verde sem mudança (a Onda com o mesmo dano, a mesma faixa e o mesmo teto); com `domain=`
      possuído, a Onda não muda a carga da barra nem a maestria (EMI-02), lido num cenário novo do `cursed-body`
- [ ] Smokes `fight` e `impact` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(scene): emit the fist wave through the technique emitter`

---

#### T15: Corte do Santuário pelo emissor

**What**: `emitterDirector.sanctuary(level)` (`tryEmit('sanctuary')`; aceito, põe um corte na fila; recusado, nada
muda; gatilho sem alvo também conta) e a saída da fila no `update` (`sanctuaryTargets`, `Hit` micro, `receiveHit`,
`effects.onTechConnect`, `CutFx.cut` e `CutFx.split`, evento `domainCut:<targetId>`); o `domainPowers` chama
`build.emitter.sanctuary(level)` e perde `triggers`, `pendingCuts`, `cutNow` e o `CutFx`; `triggersLastSecond` vira
`build.emitter.countAt('sanctuary')`; `SanctuaryTriggers` sai de `core/sanctuary.ts`; os casos da janela em
`tests/core/sanctuary.test.ts` passam a usar `new TechEmitter().channel('sanctuary')`.
**Where**: `src/scenes/test/emitterDirector.ts`
**Depends on**: T14
**Reuses**: `domainPowers.cutNow()` (F31); `sanctuaryTargets`, `sanctuaryCutDamage`, `worldCutHits` (ficam em
`core/sanctuary.ts`)
**Requirement**: EMI-01, EMI-04

**Done when**:

- [ ] `tests/core/sanctuary.test.ts`: casos da janela verdes com só o import e o construtor do canal trocados (EMI-04.6)
- [ ] Smoke `domain` verde sem mudança, com o evento `domainCut:<id>` e o `triggersLastSecond` de antes (EMI-04)
- [ ] `domainPowers` sem `CutFx` nem montagem de `Hit` de corte (`grep`)
- [ ] Smokes `cursed-body`, `fight` e `impact` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(scene): emit the sanctuary cut through the technique emitter`

---

### Phase 4: Passo 3 — ícone HD

#### T16: Ícones HD de técnica no branch

**What**: `git cherry-pick c1fac80 687a23f` (`feat/icones-hd-tecnicas`): `src/game/art/hd/techIcons.ts`
(`TECH_ICON_IDS`, `TechIconId`, `techIconSheet(48 | 24)`), `src/game/art/hd/icons/*`, `registerHdSheets` em
`art/index.ts`, `TEX.techIcons`/`techIconsSmall` em `textures.ts`, `tests/game/art/techIcons.test.ts` e
`tools/icon-boards.mjs`. Sem redesenho. Conflito só de contexto (linhas vizinhas das F29 a F33): resolver mantendo os
dois lados e anotar no commit.
**Where**: `src/game/art/hd/techIcons.ts`
**Depends on**: None
**Reuses**: commits `c1fac80` e `687a23f`
**Requirement**: ICO-01

**Done when**:

- [ ] `tests/game/art/techIcons.test.ts` verde no branch; prancha do `tools/icon-boards.mjs` gerada em `.fable-out/` e
      igual à do branch de origem
- [ ] Smoke `boot` verde (as folhas registradas não quebram o carregamento)
- [ ] Gate verde; contagem de testes (soma os casos do `techIcons.test.ts`)

**Tests**: unit
**Gate**: quick
**Commit**: os dois commits do cherry-pick, com as mensagens de origem (`feat(art): draw hd technique icons` e
`feat(art): refine hd technique icons after review`)

---

#### T17: `TechDef.icon`

**What**: em `src/data/techniques.ts`, `icon: TechIconId` (`import type` de `game/art/hd/techIcons.ts`) em cada
técnica, com o próprio id (`divergente`, `vermelho`, `azul`, `corte`, `roxo`); o `kanji` fica até a T23, porque os
leitores trocam um por tarefa.
**Where**: `src/data/techniques.ts`
**Depends on**: T16
**Reuses**: `TECHNIQUES` (`techniques.ts:26`); `TECH_ICON_IDS`
**Requirement**: ICO-01

**Done when**:

- [ ] `tests/data/techniques.test.ts`: todo `TechDef.icon` está em `TECH_ICON_IDS` e é igual à chave da técnica
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(data): give each technique its hd icon id`

---

#### T18: Ícone da oferta

**What**: `src/core/techIcon.ts` com `techIconFor(entryId, ownedDomain): TechIconId | null` (técnica →
`TechDef.icon`; `dominio` → o id do Domínio possuído; resto → `null`).
**Where**: `src/core/techIcon.ts`
**Depends on**: T17
**Reuses**: `TECHNIQUES`; `DomainId` (F31)
**Requirement**: ICO-03, ICO-08

**Done when**:

- [ ] `tests/core/techIcon.test.ts` (novo): cada técnica → o próprio id; `dominio` com `santuario`, `jackpot` e
      `amplificacao` → o id; `dominio` sem Domínio → `null`; carta comum (ex.: uma passiva) → `null`
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): pick the icon of a shop offer`

---

#### T19: Ícone HD no slot do `EnergyHud`

**What**: em `src/game/EnergyHud.ts`, o sprite do slot nasce em `TEX.techIcons` sem `setDisplaySize` (48 texels = 48
px) e troca `setFrame(def.icon)`; `bindHints(source)` com um `Text` de cargas no canto de cima à esquerda
(`hint.badge`) e o alpha do ícone piscando a cada 250 ms (`hint.blink`); `debugState().energy.icons[i]` ganha
`texture` e `frame` lidos do sprite vivo e `badge`; overlay da recarga, rótulo da tecla e borda dourada do Despertar
por cima, na mesma ordem; `uiSetup.addHud` chama `energyHud.bindHints((id) => this.s.techRunner.hudHint(id))`.
**Where**: `src/game/EnergyHud.ts`
**Depends on**: T17
**Reuses**: `EnergyHud.ts:98-102`, `:159-189`, `:195-234`; `TechRunner.hudHint` (T9)
**Requirement**: ICO-02, ICO-07, ICO-09

**Done when**:

- [ ] `tests/game/debugApi.test.ts`: literal do `hud.energy.icons[i]` com `texture`, `frame` e `badge`
- [ ] Smoke `hud` com `tech=azul`: `texture === 'tech-icons'`, `frame === 'azul'`, largura do sprite 48 e `badge`
      nulo; o overlay da recarga ainda cobre o ícone depois de uma conjuração (ICO-02, ICO-07)
- [ ] Captura em HD do slot com e sem recarga e com a borda dourada (`ramo=` + `axes=` até o Nv 5 da F33) (ICO-09)
- [ ] Smokes `tech`, `boot` e `no-debug` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(hud): show the hd technique icon on the slot`

---

#### T20: Ícone HD na carta e no voo até o slot

**What**: em `src/game/ShopPanel.ts`, `kanji` vira `icon` (mesma quantidade de objetos) em `TEX.techIconsSmall` sem
`setDisplaySize` (24 px), `setFrame(offer.icon)` e visível só com `offer.icon !== null`; `flyToSlot(slot, icon,
target)` cria o sprite com 24 px sobre a carta e anima `scale: 2` em 300 ms até o slot (48 px); saem `KANJI_SIZE`,
`KANJI_Y` e o comentário do `setScale`; `OfferView` (`core/shop.ts`) ganha `icon`, preenchido pela vista com o
`iconOf(entryId)` que o `shopDirector` passa (`techIconFor` da T18); `shopDirector` chama `flyToSlot(slot,
TECHNIQUES[id].icon, ...)`.
**Where**: `src/game/ShopPanel.ts`
**Depends on**: T18
**Reuses**: `ShopPanel.ts:57-58`, `:161-166`, `:238-243`, `:268-290`; `shopDirector.ts:98-101`, `:118-130`
**Requirement**: ICO-03, ICO-04, ICO-09

**Done when**:

- [ ] `ShopPanel.ts` com no máximo as linhas efetivas de antes (anotar antes e depois) (ICO-03)
- [ ] Smoke `shop`: carta de técnica com o ícone `tech-icons-24` no quadro da técnica e escondido em carta que não é
      técnica; a 1ª compra de técnica voa com o quadro dela até o slot (ICO-03, ICO-04)
- [ ] Captura em HD da konbini com uma carta de técnica e uma de passiva (ICO-09)
- [ ] Smokes `shop-progress`, `hud` e `boot` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(shop): show the hd technique icon on the card`

---

#### T21: Ícone HD na chamada da conjuração

**What**: em `src/game/techFx/Callout.ts`, o sprite em `TEX.techIcons` com `setScale(2)` (96 px) no lugar do
`setDisplaySize(84)`, `setFrame(def.icon)` e `ICON_SIZE` 96 para o deslocamento do texto; o cartão do Kokusen
(`KokusenFx.ts:151-158`) não muda.
**Where**: `src/game/techFx/Callout.ts`
**Depends on**: T17
**Reuses**: `Callout.ts:13`, `:29-30`, `:68-71`
**Requirement**: ICO-05, ICO-09

**Done when**:

- [ ] Smoke `tech`: a chamada do Azul com o quadro `azul` de `tech-icons` em escala 2 (lido do objeto vivo pelo
      snapshot do callout, ou pelo `fx.live` se o callout não tiver debug: neste caso acrescentar `icon` ao debug dele
      sem crescer `Hud.ts`)
- [ ] Smoke `kokusen` verde sem mudança (cartão `kuro`/`sen`)
- [ ] Captura em HD da chamada com o player virado para os dois lados (ICO-09); se o nome passar da faixa, anotar
      (ajuste do `BAND_W` é tarefa de arte à parte, Risks)
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(fx): show the hd technique icon on the cast callout`

---

#### T22: Ícone do Domínio na barra e na carta

**What**: em `src/game/DomainBar.ts` (F31), sprite de 24 px em `TEX.techIconsSmall` à esquerda da barra com o quadro do
Domínio possuído (`DomainBarView.icon: DomainId | null`), escondido sem Domínio; `debug()` ganha `icon: { texture,
frame } | null`; o `barView` do `domainDirector` preenche o `icon`; a carta de nível do Domínio mostra o mesmo quadro
pelo `iconOf` da T20.
**Where**: `src/game/DomainBar.ts`
**Depends on**: T18, T20
**Reuses**: `DomainBar` e `domainDirector.barView` (F31)
**Requirement**: ICO-08, ICO-09

**Done when**:

- [ ] Smoke `domain` com `domain=santuario`: `hud.domainBar.icon` é `{ texture: 'tech-icons-24', frame: 'santuario' }`;
      sem Domínio, `null`; a carta de nível do Domínio na loja com o quadro `santuario` (ICO-08)
- [ ] Captura em HD da barra junto da moldura da energia, sem encostar (Risks) (ICO-09)
- [ ] Smokes `hud` e `shop` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(hud): show the domain icon on the domain bar`

---

#### T23: Kanji fora das técnicas

**What**: `TechDef.kanji` sai de `src/data/techniques.ts` e das entradas; nenhum código de técnica lê `TEX.kanji`.
**Where**: `src/data/techniques.ts`
**Depends on**: T19, T20, T21
**Reuses**: —
**Requirement**: ICO-06, ICO-09

**Done when**:

- [ ] `tests/data/techniques.test.ts`: nenhuma entrada tem a chave `kanji` (ICO-06)
- [ ] `grep -rn "kanji" src --include=*.ts` só acha `sprites/kanji.ts`, o registro em `art/index.ts`, o `TEX.kanji` em
      `textures.ts` e o cartão do Kokusen em `KokusenFx.ts` (ICO-06)
- [ ] Passada no jogo em HD (combate e konbini) com slot, carta e chamada (ICO-09)
- [ ] Smokes `hud`, `shop`, `shop-progress`, `domain`, `tech`, `boot` e `no-debug` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: full
**Commit**: `refactor(data): drop the legacy kanji from the techniques`

---

### Phase 5: Passo 4 — Boogie Woogie, regra pura e dados

#### T24: Eficiência do Boogie contra o piso de 60%

**What**: `BOOGIE.axes.eficiencia` em `src/data/boogie.ts` passa de `[20, 16, 12, 8]` para `[20, 17, 14, 12]`; os casos
do BOO-02 em `tests/core/boogie.test.ts` e a tabela do BOO-02 em `.specs/features/regras-tecnicas-leva1/spec.md`
acompanham no mesmo commit.
**Where**: `src/data/boogie.ts`
**Depends on**: None
**Reuses**: `data/boogie.ts:29`
**Requirement**: JJK-17

**Done when**:

- [ ] `tests/core/boogie.test.ts`: custo 20, 17, 14 e 12 com 0 a 3 pontos de Eficiência (JJK-17); nenhum outro caso
      muda de asserção
- [ ] BOO-02 da `regras-tecnicas-leva1/spec.md` com a tabela nova
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `fix(data): keep the boogie efficiency above the cost floor`

---

#### T25: Conversão entre o retângulo da cena e a caixa das regras

**What**: `src/core/techBoxes.ts` com `boxOfRect(rect)` (o `Rect` da cena é pelo centro, o `Box` das regras puras pelo
canto), `centerOfBox(box)`, `shrink(box, px)`, `widen(box, dx, dy)`, `overlaps(a, b)` e `aimPoint(box, y)` (x do
centro, `y` preso entre o topo e o pé da caixa: a mira da Fala).
**Where**: `src/core/techBoxes.ts`
**Depends on**: None
**Reuses**: `Rect` (`game/bodyTags.ts:4-10`, só o formato, sem import de Phaser), `Box` (`core/axisRule.ts:86-91`)
**Requirement**: BWG-01, RSN-02, FLA-02

**Done when**:

- [ ] `tests/core/techBoxes.test.ts` (novo): ida e volta `Rect` → `Box` → centro igual; `shrink(box, 1)` tira 1 px de
      cada lado; `widen` alarga só o pedido; `overlaps` com borda tocando conta (o mesmo do `Bounds.overlaps` do
      Matter) e com 1 px de folga não conta; `aimPoint` com o `y` acima, dentro e
      abaixo da caixa (topo e pé exatos, L-010)
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): convert scene rects into rule boxes`

---

#### T26: Portão e decisão da palma

**What**: `src/core/leva1Press.ts` com `boogiePress(canCast): PressAnswer` (`{ kind: 'cast', skipCooldown: true }` ou
`deny cooldown`) e `palmDecision(branch, signElapsedMs, keyHeld): 'hold' | 'swap' | 'feint'` (sem Palma Falsa, `swap`;
com ela, tecla segura e `elapsed < 250` → `hold`, tecla segura e `elapsed ≥ 250` → `feint`, tecla solta → `swap`).
**Where**: `src/core/leva1Press.ts`
**Depends on**: None
**Reuses**: `PressAnswer` (T1); `BOOGIE.feintHoldMs`
**Requirement**: BWG-06, BWG-07

**Done when**:

- [ ] `tests/core/leva1Press.test.ts` (novo): com carga passa com `skipCooldown`; sem carga e com a 2ª palma armada
      (`canCast` verdadeiro) passa; sem carga e sem 2ª palma nega `cooldown` (BWG-06)
- [ ] `palmDecision` a 79, 80, 81, 249, 250 e 251 ms, com e sem a tecla, com e sem o ramo Palma Falsa e com o ramo
      Dupla Palma (BWG-07; L-010)
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): decide the boogie press and the false palm hold`

---

#### T27: Atordoamento do inimigo comum

**What**: em `src/core/enemyBrain.ts`, o estado `stunned`: `stun(ms): boolean` recusa morto, `ragdollStun` e
`gettingUp`, senão entra em `stunned` com `max(restante, ms)`; no `receiveHit`, golpe sem banda que não mata e não
derruba, com o estado em `stunned`, devolve `hitReaction` sem trocar de estado (entra na condição que já existe do
`stagger`, sem ramo novo de topo); `knockdown` leva a `ragdollStun` como hoje; `update` com `stunned` vencido → `idle`;
`stunnedMs` (0 fora do estado); o `downHits` não muda.
**Where**: `src/core/enemyBrain.ts`
**Depends on**: None
**Reuses**: `enemyBrain.ts:4` (estados), `:77-107` (`receiveHit`, F29)
**Requirement**: BWG-04, FLA-05

**Done when**:

- [ ] `tests/core/enemyStun.test.ts` (novo; o `enemyBrain.test.ts` não cresce): `stun(600)` entra em `stunned`; aos
      599 ms ainda `stunned`, aos 600 ms `idle`, aos 601 ms `idle` (L-010); `stun(300)` sobre 500 restantes fica com
      500 e `stun(800)` fica com 800 (maior restante vence); recusa morto, `ragdollStun` e `gettingUp`; golpe normal não
      encerra nem reinicia o relógio; `knockdown` derruba; `downHits` igual; golpe com banda não troca de estado
- [ ] `enemyBrain.ts` sem aviso novo de complexidade no `oxlint`
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the stunned state to the common enemy brain`

---

#### T28: Mover reposicionado sem perder a vida

**What**: em `src/core/mover.ts`, `moveTo(x)` muda a posição e mantém o `traveled` (vida restante) e a expiração.
**Where**: `src/core/mover.ts`
**Depends on**: None
**Reuses**: `mover.ts:7-38`
**Requirement**: BWG-02

**Done when**:

- [ ] `tests/core/moverMoveTo.test.ts` (novo): depois de `moveTo`, o `x` é o pedido, o `traveled` é o de antes e o
      mover expira na mesma distância total
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): move a mover without resetting its range`

---

#### T29: Recarga própria da técnica no `Loadout`

**What**: `TechDef.ownCooldown?: true` em `src/data/techniques.ts` (só o tipo); em `src/core/loadout.ts`,
`setCooldown(slot, ms)`, `cutCooldown(slot, ms)` (nunca abaixo de 0) e `slotOf(id)`; `startCooldown` e `tick` pulam a
técnica com `ownCooldown`.
**Where**: `src/core/loadout.ts`
**Depends on**: None
**Reuses**: `Loadout` (F30/F33, `refundCooldown` como molde)
**Requirement**: BWG-06, RSN-06, FLA-08

**Done when**:

- [ ] `tests/core/loadoutOwnCooldown.test.ts` (novo): com uma definição de teste com `ownCooldown`, `startCooldown` e
      `tick` não mexem no slot; sem `ownCooldown`, como hoje; `setCooldown` escreve; `cutCooldown` corta e para em 0;
      `slotOf` acha o slot e devolve `null` sem a técnica
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): let a technique own its slot cooldown`

---

#### T30: `TechStats` do Boogie

**What**: `src/core/techResolversLeva1.ts` com `leva1Build(axes, item)` (pontos na ordem de `BOOGIE_AXIS_IDS` e o ramo
do `AxisBuild`), `resolveBoogie` no formato dos resolvedores da F33 (custo com `costMul` e o piso
`max(custo, ceil(0,6 × custo base))` por último; tempos `sign`/`release`/`recover` e `charge` 0; `cooldownMs` = recarga
de uma carga, com o −20% do Cargas 3; `damage.shock` × `damageMul` × `vowDamageMul` arredondado como o `loadout.ts`;
`killRefund: 0`; bloco `boogie` do design) e `scaleTechDamage(raw, loadout)`. O registro no `RESOLVERS` entra na T32.
**Where**: `src/core/techResolversLeva1.ts`
**Depends on**: T24
**Reuses**: `boogieStats` (`core/boogie.ts`); resolvedores da F33 (`core/techResolvers.ts`); `loadout.ts:97`
(arredondamento)
**Requirement**: JJK-02

**Done when**:

- [ ] `tests/core/techStatsLeva1.test.ts` (novo): Boogie × 6 eixos × 0 a 3 pontos com `damageMul`/`vowDamageMul` 1 e
      1,35 (custo, recarga, tempos, `rangePx`, `stunMs`, `maxCharges`, `shockDamage`); piso de custo nas bordas: 12 no
      3º ponto de Eficiência, 12 com um `costMul` que o leva abaixo de 12, 13 com o que o deixa em 13 (L-010);
      `killRefund` 0 e o 0,3 no bloco com Recarga 3; `cooldownMs` com Cargas 3 = recarga × 0,8
- [ ] `scaleTechDamage` com 1 e 1,35 e o arredondamento de meio igual ao do `loadout.ts`
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): resolve the boogie technique stats`

---

#### T31: Eixos, ramos e Despertares do Boogie

**What**: `src/data/techAxesLeva1.ts` com `LEVA1_AXIS_ITEMS` só com o Boogie, no formato do `ItemAxes` da F33: eixos
Alcance, Tontura, Cargas, Choque, Eficiência, Recarga (na ordem de `BOOGIE_AXIS_IDS`); ramos Palma Falsa
(`palmaFalsa`, `:a`) e Dupla Palma (`duplaPalma`, `:b`); Despertares Finta Total (`fintaTotal`) e Eco da Palma
(`ecoDaPalma`); texto de efeito de uma linha por ramo e Despertar, do plano (seções 2.5 e 5.1). Ainda fora do
`AXIS_ITEMS` (entra na T32).
**Where**: `src/data/techAxesLeva1.ts`
**Depends on**: None
**Reuses**: `ItemAxes` e as entradas da F33 em `data/techAxes.ts`; `BOOGIE_AXIS_IDS`, `BoogieBranchId`
**Requirement**: JJK-13

**Done when**:

- [ ] `tests/data/techAxesLeva1.test.ts` (novo): ids e ordem dos eixos iguais a `BOOGIE_AXIS_IDS`; `:a` é Palma Falsa e
      `:b` Dupla Palma; nomes e textos de ramo e Despertar do Boogie únicos contra todo o `AXIS_ITEMS` da F33 (JJK-13)
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(data): add the boogie axes, branches and awakenings`

---

### Phase 6: Passo 4 — Boogie Woogie no jogo, a troca

#### T32: Boogie no `TechId` e o módulo com cargas

**What**: `TechId` ganha `'boogie'` e `TECHNIQUES` a entrada do design (`name: 'Boogie Woogie'`, `icon: 'boogie'`,
`aura: 'A'`, custo 20, recarga 2500, sinal 80, carga 0, soltura 60, recuperação 150, `damage: { shock: 0 }`,
`ownCooldown: true`); `AuraColor` ganha `yellow` (`AURA_COLORS.yellow = { base: 'A', hi: 'w' }`) e o `Aura.ts`
`boogie: 'yellow'`; `...LEVA1_AXIS_ITEMS` no `AXIS_ITEMS`, uniões de `AxisItem`/`AxisId`/`BranchId`/`AwakeningId` e
`boogie: resolveBoogie` no `RESOLVERS` com o bloco `boogie?` no `TechStats`; `src/game/tech/boogie.ts` com `rebuild()`
(`new BoogieState(leva1Build(...))` com a técnica equipada, cargas cheias; o `update` cria o estado se faltar),
`answerPress` → `boogiePress(state.canCast())`, `state.update(dt)`, o espelho da recarga (`setCooldown(slot,
charges === 0 ? rechargeLeftMs : 0)`), `hudHint()` (`badge` com `maxCharges > 1`), `state()` → `techState.boogie`;
`registry.ts` ganha a linha `boogie`; `BoogieBuildSnapshot` em `axisSnapshot.ts`; nasce `scripts/smoke/boogie.smoke.mjs`.
Nesta tarefa a soltura só gasta a carga (a troca entra na T33).
**Where**: `src/game/tech/boogie.ts`
**Depends on**: T26, T29, T30, T31
**Reuses**: `BoogieState` (`core/boogie.ts`); molde de módulo das T4 a T8; `hudHint` do `EnergyHud` (T19)
**Requirement**: JJK-01, JJK-02, JJK-06, JJK-07, JJK-11, JJK-14, JJK-16, BWG-06, REG-04, ICO-01

**Done when**:

- [ ] `tests/data/techniques.test.ts`: entrada `boogie` com os números da tabela (JJK-01); `tests/game/debugApi.test.ts`:
      `techState.boogie` e `build.boogie` no literal (JJK-07); `tests/core/axisParam.test.ts` (F30/F33):
      `axes=boogie.cargas:2` e `ramo=boogie:a` aceitos, `axes=boogie.xx:1` e `axes=boogie.cargas:4` ignorados (JJK-06)
- [ ] `boogie.smoke.mjs` (cenário 0) em `?debug&hd=1&area=modular&seed=1&maxAlive=1&tech=boogie`: `techState.boogie`
      com `charges` 1 e `maxCharges` 1; ícone `boogie` no slot; `build.boogie.stats.cost` 20; depois de uma soltura,
      `charges` 0, `tech.slots[0].cooldownMs` ≈ 2500 (o espelho) e um 2º aperto sai `techDenied:cooldown` (BWG-06); com
      `axes=boogie.cargas:2`, depois de uma soltura `cooldownMs` 0 e `hud.energy.icons[0].badge === '1'` (BWG-06.7); sem
      apertar a tecla por 3 s nenhum evento `boogie*` sai (JJK-14)
- [ ] Na rodada seguinte (`roundStart`), `charges` volta ao máximo (JJK-11)
- [ ] `Loadout.stats('boogie')` no jogo igual ao `resolveBoogie` da T30 (`build.boogie.stats` com `axes=boogie.eficiencia:3`
      dá custo 12) (JJK-02)
- [ ] Diff sem `TechRunner.ts`, `TechCaster.ts` e `techDirector.ts`; `techRunnerSource.test.ts` verde (REG-04)
- [ ] Smokes `tech`, `techniques`, `tech-axes` e `hud` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(tech): add the boogie woogie module with its charges`

---

#### T33: Troca com o corpo à frente

**What**: `src/game/tech/boogieMoves.ts` com `candidates(f)` (comuns vivos sem ragdoll e o chefe vivo, com o centro e o
tamanho do `hurtRect`) e `swap(cast, f)`: `state.swap({ player: boxOfRect(player.hurtRect()), facing, candidates, fits })`;
aceita, no mesmo quadro, `player.teleportTo(centro)` e `teleport(targetCenter)` do corpo (velocidade zerada,
`drawPos.snap()`), evento `boogieSwap:<kind>:<id>`; recusada, `energy.gain(loadout.cost('boogie'))`, nenhuma carga
gasta, ninguém se move, evento `boogieRefused:<motivo>`. Nasce `src/game/tech/techWorld.ts` com `fits(box)`
(`query.region(terrain, shrink(box, 1))` vazio). Ganchos: `Player.debugTeleportX(x)` vira `teleportTo(x, y)` com
`snap()` (o FxLab passa o `y` de hoje), `Player.debugFace(dir)` vira `face(dir)` (com corpo, o player passa a olhar para
o trocado), `Enemy.teleport(center)` e `Boss.teleport(center)`. O módulo chama o `swap` no
`techCast:boogie` (a T32 só gastava a carga).
**Where**: `src/game/tech/boogieMoves.ts`
**Depends on**: T32
**Reuses**: `swapPlacement`/`pickSwapTarget` (`core/swap.ts`); `boxOfRect`, `shrink` (T25); `query.region` sobre
`s.terrain` (`Boss.ts:342`); `BodyRenderPos.snap()`; `Player.ts:512-517`
**Requirement**: BWG-01, BWG-02, BWG-03, JJK-15

**Done when**:

- [ ] `boogie.smoke.mjs` (parte 1): o player e o comum à frente trocam de x no mesmo quadro, sai
      `boogieSwap:enemy:<id>`, o player fica com velocidade 0 e o comum também, e o `facing` do player aponta para o comum
      (BWG-02); de costas para o comum, sai
      `boogieRefused:noTarget`, a energia volta no mesmo quadro e `charges` não cai (BWG-03); com o destino do player
      dentro da parede (comum encostado no limite da área), `boogieRefused:blockedPlayer` ou `blockedTarget` e ninguém
      se move (BWG-01, BWG-03); a troca no chão plano é aceita (o `shrink` de 1 px descarta o chão)
- [ ] Com o chefe da r5 (`round=5`) à frente, `boogieSwap:boss:<id>` e o chefe no lugar do player (BWG-02)
- [ ] `Player.ts` sem campo novo e `Enemy.ts`/`Boss.ts` ≤ 400 efetivas (JJK-15); smoke `fxlab` verde (teleporte)
- [ ] Smokes `boss`, `tech` e `techniques` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(tech): swap places with the body ahead`

---

#### T34: Troca com o orbe e com o projétil

**What**: `candidates(f)` em `src/game/tech/boogieMoves.ts` soma os orbes vivos de `ctx.objects()` com `kind === 'orb'`
e os `Projectile` de `ctx.projectiles()` com `kind === 'projectile'` e não removidos; aceita, orbe →
`ctx.relocate(tech, id, targetCenter)` e projétil → `relocate(x, y)`, os dois mantendo a velocidade e a vida; um
`relocate` que devolve `false` vira `blockedTarget` antes de mover o player. Ganchos: `Projectile.relocate(x, y)`
(`mover.moveTo`, corpo e vista no ponto); `relocate(id, at)` nos módulos do Vermelho (`redFlight` com `moveTo` e o
sensor no ponto) e do Roxo (`PurpleFlight` com `moveTo`); o orbe do Azul fica fora dos candidatos (`tech !== 'azul'`:
trocar com ele é a Evolução Vácuo de Troca da F37); porta
`projectiles: () => s.projectiles` em `TechPorts` e `techPorts.ts`.
**Where**: `src/game/tech/boogieMoves.ts`
**Depends on**: T33
**Reuses**: `moveTo` (T28); serviço `relocate` do runner (T9)
**Requirement**: BWG-01, BWG-02

**Done when**:

- [ ] `boogie.smoke.mjs` (parte 2) com `tech=boogie,vermelho`: com o orbe do Vermelho em voo à frente, a troca leva o
      orbe ao lugar antigo do player com a mesma velocidade (`techObjects`, `tech: 'vermelho'`), sai
      `boogieSwap:orb:<id>` e o orbe ainda detona no 1º toque válido (edge case)
- [ ] Com o projétil do chefe da r5 à frente, `boogieSwap:projectile:<id>` e o projétil segue com a mesma velocidade e
      o player mantém o lado; a onda de choque do chefe nunca é candidata
- [ ] Com `tech=boogie,azul` e só o orbe do Azul à frente, `boogieRefused:noTarget` e a energia volta (edge case)
- [ ] Smokes `red-anime`, `techniques`, `tech-axes`, `boss` e `evolution` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(tech): swap places with an own orb or a boss projectile`

---

#### T35: Tontura do trocado

**What**: na troca aceita com `stunMs > 0`, o comum trocado chama `enemy.stun(stunMs)`; o chefe, o orbe e o projétil
não são atordoados. Ganchos: `Enemy.stun(ms)` e `get stunnedMs()` (repassam ao cérebro; o `canAct` já cai fora de
`idle`); `src/scenes/test/enemySnapshot.ts` com `enemyView(e)` tirado de `snapshot.ts:78-107` e o campo novo
`stunnedMs`; `debugApi.ts` com `stunnedMs: number` em cada comum.
**Where**: `src/game/Enemy.ts`
**Depends on**: T33
**Reuses**: `EnemyBrain.stun` (T27); `canAct` (`Enemy.ts:363-369`); `enemyAI.ts:106-110`; `animState.ts:112`
**Requirement**: BWG-04, FLA-11, JJK-15

**Done when**:

- [ ] `tests/game/debugApi.test.ts`: `stunnedMs` em cada comum do literal
- [ ] `boogie.smoke.mjs` (parte 3): com Tontura 0 o trocado fica com `stunnedMs` 0; com `axes=boogie.tontura:3`, o
      trocado fica com `stunnedMs` perto de 600, não anda e não começa golpe nesse tempo (`ai` fora de
      `windup`/`attack`), um soco nele não encerra o estado e ele não cai (BWG-04); trocado com o chefe, o chefe segue
      agindo
- [ ] `debugSnapshot` encolhe ~27 linhas (anotar); `Enemy.ts` ≤ 400 efetivas (JJK-15)
- [ ] Smokes `enemy-react`, `telegraph`, `fight` e `boss` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(enemy): stun the common enemy swapped by the boogie`

---

#### T36: Choque da troca e recarga por abate

**What**: com `shockDamage > 0`, cada corpo da lista `shock` toma um `Hit` `chip` de `scaleTechDamage(shockDamage)`
com `techMarks('light')`, `onTechHit` e `castHit` (maestria como a F33 conta o chip); no abate, `state.onTechKill()`
uma vez por abate e a recarga da carga cai pelo que ele devolve; nenhum gatilho de Santuário sai de choque `chip`.
**Where**: `src/game/tech/boogieMoves.ts`
**Depends on**: T33
**Reuses**: `techMarks` (`game/tech/shared.ts`); `castHit` (F33); `BoogieState.onTechKill`
**Requirement**: BWG-05, BWG-11, JJK-08, JJK-09, JJK-10

**Done when**:

- [ ] `boogie.smoke.mjs` (parte 4) com `axes=boogie.choque:1`: os corpos a até 40 px da saída e da chegada perdem 8 de
      HP (com o multiplicador de dano 1,35 da F29: 11) e o número aparece na faixa `chip` (BWG-05, JJK-10); com
      `domain=santuario`, o choque não muda `triggersLastSecond` (JJK-09)
- [ ] Com `axes=boogie.choque:3,boogie.recarga:3` e um comum com HP abaixo de 20, o abate pelo choque baixa o
      `rechargeLeftMs` do `techState.boogie` pelo que o `onTechKill` devolve (BWG-11)
- [ ] A troca sem choque não muda a maestria (`build.boogie`), e a com choque sobe como um acerto chip da F33 (JJK-08)
- [ ] Smokes `tech`, `domain` e `power` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(tech): shock the bodies around the boogie swap`

---

### Phase 7: Passo 4 — Boogie Woogie, ramos, vista e loja

#### T37: Palma Falsa

**What**: o módulo do Boogie implementa `holdSign(slot, elapsed, held)` → `palmDecision(...) === 'hold'`; no
`techCast:boogie`, `palmDecision` com o `slotHeld` do slot decide `swap` ou `feint`; `feint(cast, f)` em
`boogieMoves.ts`: `state.feint(centro do player, comuns e chefe)`, gastando uma carga e a energia; `misses` →
`enemy.feint(3000, onMiss)`, onde `onMiss` abre `player.counter.open('contra', 400)` com o player a até 120 px.
Ganchos: `Enemy.feint(ms, onMiss)`; `EnemyShared.feintMs` e `onFeintMiss` em `enemy/context.ts`; em
`enemy/EnemyAttack.ts`, com `feintMs > 0` o `hitboxOn` não abre a caixa e marca o golpe enganado, o `hitboxOff` desse
golpe chama `onFeintMiss()` e limpa a marca, e o `feintMs` vence pelo tempo.
**Where**: `src/game/tech/boogieMoves.ts`
**Depends on**: T33
**Reuses**: `palmDecision` (T26); `holdSign` da máquina (T1, T10); `CounterWindow.open` (`core/counter.ts:28-31`)
**Requirement**: BWG-07, BWG-08

**Done when**:

- [ ] `boogie.smoke.mjs` (parte 5) com `ramo=boogie:a&axes=boogie.alcance:1`: tecla solta aos ~50 ms troca (o
      `boogieSwap` sai aos ≥ 80 ms do aperto); tecla segura por 300 ms finge aos 250 ms, sem troca, com uma carga e a
      energia gastas (BWG-07); o comum a até 120 px que ataca em seguida não tira HP do player e a Contra abre por 400
      ms (`player.counter`) (BWG-08); o enganado que não ataca perde a marca em 3000 ms
- [ ] Golpe tomado segurando a tecla cancela a conjuração sem gastar carga nem energia (edge case, CAST-07)
- [ ] `EnemyAttack.ts` e `Enemy.ts` ≤ 400 efetivas
- [ ] Smokes `telegraph`, `enemy-react`, `defense` e `fight` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(tech): feint the swap with the false palm branch`

---

#### T38: Finta Total

**What**: quando a finta devolve `bossCancel`, `boss.feintCancel()` cancela o ataque em preparo pelo caminho do
`canAct`, o chefe toma um `Hit` normal de `round(0,01 × maxHp)` e sai o evento `fintaTotal`. Ganchos no `Boss.ts`:
`feintCancel()` (um `canAct` falso no próximo `update`) e `get windingUp()` (`ai.state === 'windup'`); a lista de
alvos da finta passa `windingUp`.
**Where**: `src/game/Boss.ts`
**Depends on**: T37
**Reuses**: `interrupt` de `bossAI.ts:244-252`; `BoogieState.feint`
**Requirement**: BWG-09, JJK-05, JJK-15

**Done when**:

- [ ] `boogie.smoke.mjs` (parte 6) com o chefe da r5, `ramo=boogie:a` e `axes=` até o Nv 5 (Despertar ligado): fingir
      com o chefe em `windup` dentro do raio cancela o golpe (`ai` sai de `windup` sem chegar a `attack`), o chefe perde
      1% do HP máximo e sai `fintaTotal`; uma 2ª finta antes de 10000 ms não cancela (BWG-09)
- [ ] A 1ª conjuração da rodada com o Despertar mostra o banner e a câmera lenta de 0,4 por 350 ms (JJK-05)
- [ ] `Boss.ts` ≤ 400 efetivas (JJK-15); smokes `boss`, `boss-punish` e `finisher` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(tech): cancel the boss windup with the total feint`

---

#### T39: Dupla Palma e Eco da Palma

**What**: o evento `echo` de `state.update` vai a `echo(ev)` em `boogieMoves.ts`: alvo vivo pelo id →
`swapPlacement(caixa do player agora, candidato agora, fits)`; aceito, troca como a `swap` e morde
`round(maxHpPct × maxHp)` (4% comum, 1% chefe) como `micro`, com `castHit` para a conjuração da 2ª troca; morto, sumido
ou sem encaixe → nada se move nem morde, evento `boogieEchoRefused`. O `hudHint` do módulo pisca o ícone enquanto a
2ª palma está armada (`blink: followUpArmed`).
**Where**: `src/game/tech/boogieMoves.ts`
**Depends on**: T33
**Reuses**: `swapPlacement` (`core/swap.ts`); `BoogieState.update` (evento `echo`)
**Requirement**: BWG-06, BWG-10, JJK-08, JJK-14

**Done when**:

- [ ] `boogie.smoke.mjs` (parte 7) com `ramo=boogie:b&axes=boogie.alcance:1,boogie.cargas:3` (Nv 5): sem carga e com a
      2ª palma armada, o 2º aperto troca sem `techDenied:cooldown` (BWG-06); a 2ª troca volta sozinha em 1 s e o alvo
      perde 4% do HP máximo como `micro` (BWG-10); a 2ª troca recusada mantém a 2ª palma armada até os 1000 ms (edge
      case); com a 2ª palma armada o ícone pisca (`hud.energy.icons[i]` alterna o alpha, BWG-06); uma tecla na
      recuperação da 1ª palma é ignorada e a 2ª palma segue armada (edge case)
- [ ] Com o alvo da 2ª troca morto antes do eco, ninguém se move e sai `boogieEchoRefused` (BWG-10, edge case)
- [ ] O eco não sai sem a 2ª troca feita pelo jogador (JJK-14); a mordida conta na maestria da 2ª troca (JJK-08)
- [ ] Smokes `tech` e `boss` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(tech): swap back with the palm echo awakening`

---

#### T40: Lampejo da palma

**What**: `src/game/art/hd/fx/leva1Fx.ts` com a folha `tech-fx-leva1` (`HdSheet`, quadros de 16×16, 1 texel = 1 px) e
os quadros `palm-0` e `palm-1` (âmbar `A` e `w`), registrada no `registerHdSheets` e em `TEX.techFxLeva1`;
`src/game/techFx/BoogieFx.ts` com `flash(x, y)` em 150 ms, registrado no `FxRegistry` com `scheduleDestroy(150)`; o
módulo desenha o lampejo na saída e na chegada da troca e do eco, e só no player na finta; prancha pelo
`tools/icon-boards.mjs` estendido (saída em `.fable-out/`).
**Where**: `src/game/techFx/BoogieFx.ts`
**Depends on**: T37, T39
**Reuses**: molde das folhas HD (`art/hd/techIcons.ts`); `FxRegistry` (`core/fxRegistry.ts`)
**Requirement**: BWG-12, BWG-13

**Done when**:

- [ ] `tests/game/art/leva1Fx.test.ts` (novo): `palm-0` e `palm-1` com 16×16 texels e só as chaves `A` e `w` da
      `PALETTE`
- [ ] `boogie.smoke.mjs` (parte 8): troca → 2 lampejos vivos em `fx.live` e 0 depois de 150 ms; finta → 1 (BWG-12)
- [ ] Prancha olhada e conferência no jogo em HD, em movimento e para os dois lados, contra um comum, o chefe, um orbe
      do Vermelho e um projétil do chefe (BWG-13)
- [ ] Smokes `power` e `fxlab` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(fx): flash the boogie palm at both ends of the swap`

---

#### T41: Boogie na loja

**What**: `LEVA1_TECHNIQUE_ENTRIES` em `src/data/shop.ts` com o Boogie (`common`, `maxLevel: 6`) espalhado no **fim**
do `GAME_SHOP_CATALOG`; preço da técnica nova pelo `newTechPrice` da raridade (20 antes da inflação).
**Where**: `src/data/shop.ts`
**Depends on**: T32
**Reuses**: entradas de técnica da F33; `newTechPrice` (F30)
**Requirement**: JJK-03, JJK-04, JJK-05

**Done when**:

- [ ] `tests/data/shop.test.ts` e `tests/core/evolutionShop.test.ts`: o catálogo termina com o Boogie e toda entrada
      anterior fica na mesma posição; preço 20 antes da inflação (JJK-03); teste que fixa o sorteio por seed e mudou
      troca só o id esperado, com o motivo no commit
- [ ] Smoke `tech-axes` com `tech=boogie` e a loja da r4: carta de 2 eixos com `Nv 2/6`, preço do ponto
      `12 + 4 × pontos` e trava da rodada; ao chegar no Nv 2, a página do ramo com Palma Falsa e Dupla Palma (JJK-04,
      JJK-05); se o arquivo passar de 380 linhas, o cenário vai ao `boogie.smoke.mjs`
- [ ] Smokes `shop` e `shop-progress` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(shop): sell the boogie woogie`

---

### Phase 8: Passo 5 — Ressonância, regra pura, dados e entrada

#### T42: Portão da Ressonância

**What**: `resonancePress(phase): PressAnswer` em `src/core/leva1Press.ts`: `ready` → `cast`; `armed` → `consume`;
`cooldown` → `deny cooldown`.
**Where**: `src/core/leva1Press.ts`
**Depends on**: None
**Reuses**: `PressAnswer` (T1); fases do `ResonanceState`
**Requirement**: RSN-04, RSN-05, RSN-06

**Done when**:

- [ ] `tests/core/leva1Press.test.ts`: as três fases e a resposta de cada uma
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): decide the resonance press by its phase`

---

#### T43: `Rng` sobre o stream das técnicas

**What**: `src/core/rollRng.ts` com `class RollRng extends Rng` que sobrescreve `next()` com o `roll` recebido.
**Where**: `src/core/rollRng.ts`
**Depends on**: None
**Reuses**: `Rng` (`core/rng.ts:23`, o `int` chama `this.next()`)
**Requirement**: RSN-01

**Done when**:

- [ ] `tests/core/rollRng.test.ts` (novo): o `int` usa o `roll` (sequência fixa → inteiros esperados); dois `RollRng`
      com o mesmo `roll` dão o mesmo leque de `throwNails` (RES-12 pelo adaptador)
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): wrap the technique roll in a seeded rng`

---

#### T44: `TechStats` da Ressonância

**What**: `resolveResonance` em `src/core/techResolversLeva1.ts` (custo com `costMul` e piso; tempos 120/80/180;
`cooldownMs` a recarga; `damage.nail`, `grampo`, `detonation` escalados; `killRefund: 0`; bloco `ressonancia`).
**Where**: `src/core/techResolversLeva1.ts`
**Depends on**: None
**Reuses**: `resonanceStats` (`core/resonance.ts`); `resolveBoogie` (T30) como molde
**Requirement**: JJK-02

**Done when**:

- [ ] `tests/core/techStatsLeva1.test.ts`: Ressonância × 6 eixos × 0 a 3 pontos com multiplicadores 1 e 1,35; piso de
      custo 15 e 16 nas bordas (L-010); `killRefund` 0 e o 0,3 no bloco com Recarga 3
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): resolve the resonance technique stats`

---

#### T45: Eixos da Ressonância e o eixo dominante

**What**: `LEVA1_AXIS_ITEMS` em `src/data/techAxesLeva1.ts` ganha a Ressonância: Pregos, Detonação, Marca, Propagação,
Eficiência, Recarga; ramos Grampo (`grampo`, `:a`) e Boneco (`boneco`, `:b`); Despertares Coroa de Pregos
(`coroaDePregos`) e Boneco de Palha (`bonecoDePalha`); textos do plano. O teste de eixo dominante mede a Ressonância
pelo modelo da spec. **Pede o aval do usuário à troca da mediana** (spec, Assumptions; design, "Calibração") antes de
começar.
**Where**: `src/data/techAxesLeva1.ts`
**Depends on**: None
**Reuses**: `RESONANCE_AXIS_IDS`, `ResonanceBranchId`; tabela da "Calibração" do design
**Requirement**: JJK-12, JJK-13

**Done when**:

- [ ] `tests/data/techAxesLeva1.test.ts`: dano por conjuração `pregos × (3 + detonação)`, período
      `max(recarga + sinal, custo ÷ 8)`; base 22,08/s; Pregos 3 = 44,16 e Detonação 3 = 45,12, os dois ≤ 1,35 × a
      mediana deles (44,64): 0,989× e 1,011×; Eficiência 3 + Recarga 3 = 36,80 > Recarga 3 sozinha = 22,08 (JJK-12);
      Boogie e Fala fora do teste
- [ ] Nomes e textos de ramo e Despertar da Ressonância únicos contra todo o `AXIS_ITEMS` (JJK-13); ids e ordem iguais a
      `RESONANCE_AXIS_IDS`
- [ ] Se o teste reprovar no modelo, o número do dado muda nesta tarefa e o design registra o valor novo e o motivo
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(data): add the resonance axes, branches and awakenings`

---

#### T46: Ressonância no `TechId`, pregos e marcas

**What**: `TechId` ganha `'ressonancia'` e `TECHNIQUES` a entrada do design (`name: 'Ressonância'`, `icon:
'ressonancia'`, `aura: 'S'`, custo 25, recarga 3000, 120/0/80/180, `damage: { nail: 3, detonation: 20 }`,
`ownCooldown: true`); `Aura.ts` `ressonancia: 'white'`; `AXIS_ITEMS`/uniões/`RESOLVERS`/`TechStats` com a Ressonância;
`src/game/tech/resonance.ts` com `rebuild()` (pronta, sem marca), `roundEnd()`, `answerPress` →
`resonancePress(state.phase)`, `throwNails(centro do player, facing, new RollRng(ctx.roll))` no
`techCast:ressonancia` com o `CastRef` guardado, `state.update(dt, alvos, world.wallAhead)` por quadro (alvos só com
prego no ar), o espelho (`setCooldown(slot, phase === 'cooldown' ? cooldownLeftMs : 0)`), `objects()` com um
`{ id, kind: 'nail', x, y, traveled }` por prego e `state()` → `techState.ressonancia`; `techWorld.wallAhead(from, dir,
maxDist)` (faixa de 2 px, borda à frente, como `blue.ts:91-113`); linha `ressonancia` no `registry.ts`;
`ResonanceBuildSnapshot`; nasce `scripts/smoke/resonance.smoke.mjs`. Os acertos dos eventos entram na T47.
**Where**: `src/game/tech/resonance.ts`
**Depends on**: T42, T43, T44, T45
**Reuses**: `ResonanceState` (`core/resonance.ts`); `wallDistanceAhead` (`blue.ts:91-113`) como molde
**Requirement**: RSN-01, RSN-02, RSN-05, RSN-06, RSN-12, TOB-03, JJK-01, JJK-02, JJK-06, JJK-07, JJK-11, JJK-14, JJK-16, REG-04, ICO-01

**Done when**:

- [ ] `tests/data/techniques.test.ts` com a entrada (JJK-01); `tests/game/debugApi.test.ts` com `techState.ressonancia`,
      `build.ressonancia` e uma entrada `kind: 'nail'` (RSN-12, JJK-07); `axisParam` com `axes=ressonancia.pregos:1` e
      `ramo=ressonancia:b` aceitos e item ou eixo desconhecido ignorado (JJK-06)
- [ ] `resonance.smoke.mjs` (cenário 0) em `?debug&hd=1&area=modular&seed=1&maxAlive=2&tech=ressonancia`: o 1º toque
      gasta 25 de energia e a recarga do slot fica em 0 (RSN-01); com os pregos no ar, `techObjects` tem 3 entradas
      `{ tech: 'ressonancia', kind: 'nail' }` (RSN-12, TOB-03) e um 2º toque não faz nada, não gasta energia e não sai
      evento (RSN-05); depois, `techState.ressonancia.marks` soma 3; na fase `cooldown`, aperto → `techDenied:cooldown`
      e `tech.slots[0].cooldownMs` = `cooldownLeftMs` (RSN-06); janela fechada sem detonar inicia a recarga (edge case)
- [ ] Com um prego indo à parede, o prego para na parede (`nailBlocked`) (RSN-02); a mesma seed dá os mesmos pregos
- [ ] `build.ressonancia.stats.cost` 25 e 15 com `axes=ressonancia.eficiencia:3` (JJK-02); rodada nova: pronta e sem
      marca (JJK-11); 3 s sem apertar, nenhum evento `resonance*` (JJK-14)
- [ ] Diff sem `TechRunner.ts`, `TechCaster.ts` e `techDirector.ts` (REG-04)
- [ ] Smokes `tech`, `techniques`, `tech-axes`, `hud` e `kokusen` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(tech): add the resonance module with nails and marks`

---

### Phase 9: Passo 5 — Ressonância no jogo

#### T47: Acertos dos pregos e a detonação no 2º toque

**What**: `src/game/tech/resonanceHits.ts` aplica os eventos: `nail` → `micro` de `scaleTechDamage(damage)`;
`nailBlocked` → a vista solta o prego ali; `grampo` → `micro` em cada um; `detonate(cast, alvos)` com o `hp` de cada
alvo trocado por `ceil(hp / mul)` (para o `killed` da regra pura bater com o dano escalado), cada `hit` → `Hit` normal
de `scaleTechDamage(damage)`, `crown` → `scaleTechDamage(detonationDamage) + (damage − detonationDamage)` (a mordida não
multiplicada), evento `resonanceDetonate:<marcas>`; todo acerto aceito chama `onTechHit` e `castHit` com o `CastRef`
do lançamento. O módulo chama o `detonate` no mesmo quadro com `slotConsumed[slot]` e `nextTap === 'detonate'`.
**Where**: `src/game/tech/resonanceHits.ts`
**Depends on**: T46
**Reuses**: `ResonanceState.detonate` (`core/resonance.ts:302-321`); `scaleTechDamage` (T30); `castHit` (F33)
**Requirement**: RSN-03, RSN-04, RSN-09, JJK-08, JJK-09, JJK-10

**Done when**:

- [ ] `resonance.smoke.mjs` (parte 1): cada prego que crava tira 3 de HP como `micro` com número da faixa (RSN-03,
      JJK-10); o 2º toque depois das marcas detona no mesmo quadro sem gastar energia nem pausar a regeneração, sai
      `resonanceDetonate:3`, os alvos perdem o dano da detonação como acerto normal e a recarga do slot começa
      (`tech.slots[0].cooldownMs` ≈ 3000) (RSN-04)
- [ ] Com `ramo=ressonancia:a` (Grampo), o prego que atravessa crava o Grampo como `micro` em cada listado (RSN-03); com
      a Coroa de Pregos (Nv 5 no ramo `:a`), a detonação desenha o anel e cada listado perde o dano da Coroa (RSN-09)
- [ ] Com `domain=santuario`, uma conjuração solta no máximo um gatilho (`triggersLastSecond` sobe 1) (JJK-09); a
      maestria sobe pela conjuração do lançamento (JJK-08)
- [ ] Smokes `power` (teto de efeitos e números com a rajada de pregos), `boss` e `tech` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(tech): land the resonance nails and detonate on the second tap`

---

#### T48: Marca que pula e eco do Boneco

**What**: em `src/game/tech/resonance.ts`, o módulo guarda o último centro de cada id com marca; o id que aparece morto
(`isDead()`) por outra fonte chama `state.onTargetDied` com os vivos, e o pulo vira `resonanceJump:<de>:<para>`; o que
some sem morrer não chama nada (as marcas vencem pelo tempo); o evento `echo` do ramo Boneco vai ao
`resonanceHits` como `micro` no chefe com `scaleTechDamage`.
**Where**: `src/game/tech/resonance.ts`
**Depends on**: T47
**Reuses**: `ResonanceState.onTargetDied`, evento `echo`
**Requirement**: RSN-07, RSN-08, JJK-08, JJK-14

**Done when**:

- [ ] `resonance.smoke.mjs` (parte 2): com duas marcas num comum e outro comum perto, matar o marcado com soco faz as
      marcas pularem e sai `resonanceJump:<de>:<para>` (RSN-07); comum marcado removido sem morrer não pula (edge case)
- [ ] Com `ramo=ressonancia:b` no chefe, o eco `micro` sai 250 ms depois da detonação e conta na maestria do lançamento
      (RSN-08, JJK-08); a detonação que mata o chefe não agenda eco (edge case); sem detonação do jogador, nenhum eco
      (JJK-14)
- [ ] Smokes `boss` e `tech` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(tech): jump the resonance marks and echo on the boss`

---

#### T49: Boneco de Palha pelo emissor

**What**: `emitterDirector.strawDoll(boss, echo)`: `tryEmit('strawDoll')`; aceito, aplica na hora um `Hit`
`{ damage: echo.damage + echo.bite, band: 'micro', tech: true }` com postura, chama `effects.onTechConnect` e devolve o
dano aplicado; recusado devolve 0 e o acerto que pediu fica igual; porta `emitter: { strawDoll(boss, echo): number }` em
`TechPorts` e `techPorts.ts`; no módulo da Ressonância, com a janela do Boneco de Palha aberta, a queda de HP do chefe
de um quadro para o outro que não veio do próprio eco vai ao `strawDollEcho`, e o eco sai por
`ctx.emitter.strawDoll(boss, echo)` sem `castHit`.
**Where**: `src/scenes/test/emitterDirector.ts`
**Depends on**: T47
**Reuses**: `TechEmitter` (T13); `ResonanceState.strawDollEcho`
**Requirement**: RSN-10, EMI-02, EMI-03, JJK-08, JJK-14

**Done when**:

- [ ] `resonance.smoke.mjs` (parte 3) com `ramo=ressonancia:b` e `axes=` até o Nv 5 (Boneco de Palha), no chefe da r5:
      depois da detonação, cada soco no chefe dentro da janela soma um eco `micro` com postura (`domain.triggersLastSecond`
      sem mudança e maestria sem mudança, EMI-02, JJK-08); com 5 socos em menos de 1000 ms, só 4 ecos saem e o 5º soco
      tira o mesmo HP de sempre (EMI-03, edge case)
- [ ] Sem detonação do jogador, a janela nunca abre (JJK-14)
- [ ] Smokes `boss`, `domain` e `cursed-body` verdes (as outras fontes do emissor não perdem teto)
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(tech): echo the straw doll damage through the emitter`

---

#### T50: Pregos, cabeças das marcas e estouro

**What**: a folha `tech-fx-leva1` ganha `nail` (8×3 texels no centro do quadro, `S`/`W`/`n`) e `nailHead`;
`src/game/techFx/ResonanceFx.ts` com um pool de 6 sprites de prego reposicionados a cada quadro, um `Graphics` para as
cabeças das marcas (até 3 por alvo e um `+N` num `Text` de um pool pequeno) na posição desenhada do alvo
(`spritePos`, AD-019), `burst(x, y)` e `crownRing(x, y, 80)` registrados no `FxRegistry` com prazo; os pools são da
cena e não entram no `FxRegistry`; o módulo devolve `hudHint()` com `blink: phase === 'armed' && marcas > 0`.
**Where**: `src/game/techFx/ResonanceFx.ts`
**Depends on**: T47
**Reuses**: folha da T40; `bindHints` do `EnergyHud` (T19)
**Requirement**: RSN-09, RSN-11, RSN-13, RSN-14

**Done when**:

- [ ] `tests/game/art/leva1Fx.test.ts`: `nail` com no máximo 8×3 texels pintados e só `S`, `W` e `n`; `nailHead` só com
      chaves da `PALETTE`
- [ ] `resonance.smoke.mjs` (parte 4): com marca viva, `hud.energy.icons[0]` alterna o alpha a cada 250 ms (RSN-11);
      `fx.live` não cresce com a Ressonância só equipada (pools fora do `FxRegistry`); a detonação põe um estouro por
      alvo e a Coroa um anel de 80 px (RSN-09, RSN-13)
- [ ] Prancha olhada e conferência no jogo em HD, em movimento e para os dois lados, com marcas num comum andando e no
      chefe (RSN-14)
- [ ] Smokes `power` e `hud` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(fx): draw the resonance nails, mark heads and bursts`

---

#### T51: Ressonância na loja

**What**: `LEVA1_TECHNIQUE_ENTRIES` ganha a Ressonância (`common`, `maxLevel: 6`), depois do Boogie, no fim do
`GAME_SHOP_CATALOG`; `tech-axes.smoke.mjs` (F33) ganha `axes=ressonancia.pregos:1` na loja da r4 e o painel do ramo.
**Where**: `src/data/shop.ts`
**Depends on**: T46
**Reuses**: entrada do Boogie (T41)
**Requirement**: JJK-03, JJK-04, JJK-05

**Done when**:

- [ ] `tests/data/shop.test.ts` e `tests/core/evolutionShop.test.ts`: o catálogo termina com Boogie e Ressonância, nada
      muda de posição, preço 20 antes da inflação (JJK-03)
- [ ] `tech-axes.smoke.mjs` com `tech=ressonancia&axes=ressonancia.pregos:1`: na loja da r4, carta de 2 eixos com `Nv 2/6`, preço
      do ponto e trava; ao chegar no Nv 2, a página do ramo com Grampo e Boneco (JJK-04, JJK-05); passando de 380 linhas, o cenário
      vai ao `resonance.smoke.mjs` com a mesma asserção
- [ ] Smokes `shop` e `shop-progress` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(shop): sell the resonance`

---

### Phase 10: Passo 6 — Fala Amaldiçoada, regra pura e dados

#### T52: Portão da Fala

**What**: `speechPress(hp, hpCost): PressAnswer` em `src/core/leva1Press.ts`: `hp <= hpCost` → `deny hp`, senão
`cast`.
**Where**: `src/core/leva1Press.ts`
**Depends on**: None
**Reuses**: `PressAnswer` (T1)
**Requirement**: FLA-01

**Done when**:

- [ ] `tests/core/leva1Press.test.ts`: vida igual ao custo nega `hp`; custo + 1 passa; custo − 1 nega (L-010)
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): deny the cursed speech without enough health`

---

#### T53: Vida paga sem dano

**What**: em `src/core/health.ts`, `spend(n): boolean` (com `hp > n`, tira `n` sem dar invulnerabilidade nem
atordoamento, mesmo durante a invulnerabilidade; senão recusa sem mudar) e `get spent(): number` (soma paga na run,
zerada no `reset`).
**Where**: `src/core/health.ts`
**Depends on**: None
**Reuses**: `Health.chip` (`health.ts:79-88`) como molde
**Requirement**: FLA-04

**Done when**:

- [ ] `tests/core/healthSpend.test.ts` (novo): `spend(8)` com 9 paga e fica 1; com 8 recusa e fica 8 (L-010); paga
      invulnerável; não dá invulnerabilidade nem atordoamento; `spent` soma os pagamentos e zera no `reset`
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): spend health without taking a hit`

---

#### T54: Atordoamento do chefe sem finalizador

**What**: em `src/core/bossBrain.ts`, `stun(ms, cause: StaggerCause = 'wall')` com a causa `tech`, que entra em
`stagger` sem armar o finalizador nem o multiplicador de dano do `stagger` (spec, assumption "Atordoamento do chefe";
antes era aval pendente, a revisão o tornou o default).
**Where**: `src/core/bossBrain.ts`
**Depends on**: None
**Reuses**: `bossBrain.ts:96`, `:104-108`, `:121-126`
**Requirement**: FLA-05

**Done when**:

- [ ] `tests/core/bossStunTech.test.ts` (novo; o `bossBrain.test.ts` não cresce): com a causa `tech`, `stagger` sem
      `finisherReady` e sem o multiplicador; a causa `wall` continua como hoje (`finisherReady` e multiplicador)
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): stun the boss without opening the finisher`

---

#### T55: `TechStats` da Fala

**What**: `resolveSpeech` em `src/core/techResolversLeva1.ts` (custo com `costMul` e piso; tempos 100/80/200;
`cooldownMs` a recarga; `damage.exploda` escalado; `killRefund: 0`; bloco `fala` com `rangePx`, `coneDeg`, `stunMs`,
`bossStunMs`, `hpCost`, `explodaDamage`, `killRefundPct`).
**Where**: `src/core/techResolversLeva1.ts`
**Depends on**: None
**Reuses**: `speechStats` (`core/cursedSpeech.ts`); `resolveBoogie` (T30) como molde
**Requirement**: JJK-02

**Done when**:

- [ ] `tests/core/techStatsLeva1.test.ts`: Fala × 6 eixos × 0 a 3 pontos com multiplicadores 1 e 1,35; piso de custo
      15 e 16 nas bordas (L-010); `hpCost` e `stunMs` não multiplicados; `killRefund` 0 e o 0,3 no bloco com Recarga 3
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): resolve the cursed speech technique stats`

---

#### T56: Eixos da Fala

**What**: `LEVA1_AXIS_ITEMS` em `src/data/techAxesLeva1.ts` ganha a Fala: Alcance, Atordoamento, Vida, Cone,
Eficiência, Recarga; ramos "Exploda" (`exploda`, `:a`) e "Volte" (`volte`, `:b`); Despertares Exploda em Cadeia
(`explodaEmCadeia`) e Esmague (`esmague`); textos do plano.
**Where**: `src/data/techAxesLeva1.ts`
**Depends on**: None
**Reuses**: `SPEECH_AXIS_IDS`, `SpeechBranchId`
**Requirement**: JJK-12, JJK-13

**Done when**:

- [ ] `tests/data/techAxesLeva1.test.ts`: ids e ordem iguais a `SPEECH_AXIS_IDS`; `:a` "Exploda" e `:b` "Volte"; nomes
      e textos de ramo e Despertar das três técnicas únicos contra todo o `AXIS_ITEMS` (JJK-13); a Fala fora do teste de
      eixo dominante (JJK-12)
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(data): add the cursed speech axes, branches and awakenings`

---

### Phase 11: Passo 6 — Fala Amaldiçoada no jogo e fechamento

#### T57: Vida inicial pelo parâmetro de debug

**What**: em `runDirector.onStartRun` (depois do `fragments=`), `?debug&hp=N` (inteiro de 1 ao máximo) aplica
`player.health.spend(hp − N)`; valor inválido ou fora da faixa é ignorado; `README.md` documenta o `hp=`.
**Where**: `src/scenes/test/runDirector.ts`
**Depends on**: T53
**Reuses**: leitura do `fragments=` (`runDirector`); `debugParam` (`params.ts:5`)
**Requirement**: FLA-01

**Done when**:

- [ ] Smoke `hud` (cenário novo): com `hp=8` o player começa com 8 de vida; com `hp=0`, `hp=abc` e `hp` acima do máximo,
      com a vida cheia
- [ ] `runDirector.ts` ≤ 400 efetivas; `TestScene` sem linha nova
- [ ] Smokes `run-loop` e `boot` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(debug): start the run with a given health`

---

#### T58: Fala no `TechId`, a voz e o custo em vida

**What**: `TechId` ganha `'fala'` e `TECHNIQUES` a entrada do design (`name: 'Fala Amaldiçoada'`, `icon: 'fala'`,
`aura: 'T'`, custo 25, recarga 4000, 100/0/80/200, `damage: { exploda: 20 }`, sem `ownCooldown`); `Aura.ts`
`fala: 'purple'`; `AXIS_ITEMS`/uniões/`RESOLVERS`/`TechStats` com a Fala; `src/game/tech/speech.ts` com
`answerPress` → `speechPress(player.hp, stats.fala.hpCost)`; no `techCast:fala`, `speak(speechStats, { origin: centro
do player, facing, hp, targets, lineOfSight: world.lineOfSight })` com o `center` de cada alvo no ponto de mira
`aimPoint(caixa, origin.y)` (T25); recusa (vida caiu no sinal):
`energy.gain(loadout.cost('fala'))`, `loadout.clearCooldown(slot)`, vida igual, evento `speechRefused:hp`; aceita:
`player.health.spend(hpCost)` e evento `speech:<n>` (os efeitos nos alvos entram na T60); `rebuild()` sem rastro;
`techWorld.lineOfSight(from, to)` (`query.ray(terrain, from, to, 1)` vazio); linha `fala` no `registry.ts`;
`SpeechBuildSnapshot`; nasce `scripts/smoke/cursed-speech.smoke.mjs`.
**Where**: `src/game/tech/speech.ts`
**Depends on**: T57
**Reuses**: `speak`/`SpeechCast` (`core/cursedSpeech.ts`); `speechPress` (T52); `Health.spend` (T53); `resolveSpeech`
(T55); eixos da T56
**Requirement**: FLA-01, FLA-02, FLA-03, FLA-04, JJK-01, JJK-02, JJK-06, JJK-07, JJK-11, JJK-14, JJK-16, REG-04, ICO-01

**Done when**:

- [ ] `tests/data/techniques.test.ts` com a entrada (JJK-01); `tests/game/debugApi.test.ts` com `build.fala` (JJK-07);
      `axisParam` com `ramo=fala:b` aceito só com a Fala equipada (JJK-06)
- [ ] `cursed-speech.smoke.mjs` (cenário 0) em `?debug&hd=1&area=modular&seed=1&maxAlive=2&tech=fala`: a fala gasta 25
      de energia e 8 de vida, sai `speech:<n>` sem reação de golpe, sem invulnerabilidade, sem número vermelho e sem
      cancelar a conjuração (FLA-04); com `hp=8` o aperto sai `techDenied:hp` e a barra pisca, com `hp=9` a fala sai
      (FLA-01, borda); a fala que não acerta ninguém cobra energia e vida e inicia a recarga (assumption)
- [ ] Vida caindo para o custo durante o sinal (golpe tomado com `hp=9` e o sinal em curso, se o golpe não cancelar):
      `speechRefused:hp`, energia de volta, recarga 0 e vida igual (FLA-03); se o golpe cancelar pela CAST-07, a prova
      do FLA-03 fica no cenário com o pagamento de outra fonte, anotada no commit
- [ ] Com `hp=8`, o ícone do slot pisca (`icons[0].flashing`) e a barra de energia não (`energy.flashing` falso) (FLA-01)
- [ ] Comum atrás de parede dentro do cone fica fora (`lineOfSight`) (FLA-02, edge case); comum num degrau acima do
      player, dentro do alcance, fica dentro (mira, edge case); 3 s sem apertar, nenhum
      evento `speech*` (JJK-14)
- [ ] Diff sem `TechRunner.ts`, `TechCaster.ts` e `techDirector.ts` (REG-04)
- [ ] Smokes `tech`, `techniques`, `tech-axes` e `hud` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(tech): add the cursed speech module with its health cost`

---

#### T59: Fala não zera a Fúria

**What**: o `bodyDirector` (F30) desconta da queda de HP do quadro o que foi pago pelo `player.health.spent`, para a
Fúria e a Cadência do Corpo não zerarem pela Fala; na `TestScene.updateGameplay`, o `damaged` e o `lastPlayerHp`
passam a usar `hp + health.spent` (troca de expressão, 0 efetivas), para o combo (CMB-02) e a recuperação não lerem a
Fala como dano (as duas expressões da cena entram no mesmo commit, por serem a mesma regra).
**Where**: `src/scenes/test/bodyDirector.ts`
**Depends on**: T58
**Reuses**: queda de HP no `bodyDirector.update` (F30); `Health.spent` (T53)
**Requirement**: FLA-04

**Done when**:

- [ ] Smoke `cursed-body` (cenário novo) com `tech=fala` e o Corpo com Fúria acumulada: a fala não zera a Fúria nem a
      Cadência; um golpe tomado de verdade continua zerando (FLA-04)
- [ ] `cursed-speech.smoke.mjs`: com combo em curso, a fala não zera o `combo` do snapshot; um golpe tomado zera
      (FLA-04); `TestScene` com as mesmas linhas efetivas (JJK-15)
- [ ] Smokes `cursed-body` e `cursed-speech` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `fix(scene): keep the body fury when paying the speech health`

---

#### T60: "Pare!" nos alvos

**What**: `src/game/tech/speechEffects.ts` aplica `SpeechHit` e `SpeechEffectHit`: comum → `enemy.stun(stunMs)` e, com
dano ou força, `Hit` `{ damage: scaleTechDamage(damage), force, direction, knockdown, tech: true }` e `receiveHit`;
chefe → `boss.stun(bossStunMs)` com a causa `tech` da T54 e, com força, `boss.shove(direction, force)`;
todo alvo atingido chama `onTechHit` e `castHit`, mesmo com dano 0; abate → `cast.claimKillRefund()` →
`loadout.cutCooldown(slot, ms)`. Ganchos: `Boss.stun(ms)` e `Boss.shove(direction, force)`; `effects.onTechConnect`
(F29) só mostra número com dano aplicado > 0.
**Where**: `src/game/tech/speechEffects.ts`
**Depends on**: T58
**Reuses**: `Enemy.stun` (T35); `cutCooldown` (T29); `bossBrain.stun` (`bossBrain.ts:104`); `effects.ts:43-44` (F29)
**Requirement**: FLA-05, FLA-08, JJK-08, JJK-09, JJK-10, JJK-15

**Done when**:

- [ ] `cursed-speech.smoke.mjs` (parte 1): os dois comuns no cone ficam com `stunnedMs` perto de 600 e nenhum ataca
      nesse tempo (`ai` fora de `windup`/`attack`) (FLA-05); nenhum número de dano aparece na fala sem ramo (JJK-10); com
      `ramo=fala:a` ("Exploda") o dano aparece × 1 e × 1,35 com o multiplicador da F29; com `ramo=fala:b` ("Volte") o
      comum cai derrubado (`ragdollStun`) (FLA-05)
- [ ] No chefe da r5, `boss.stun` com o `bossStunMs` e sem `finisherReady` (FLA-05), inclusive com o chefe colado à
      frente (mira do FLA-02); com "Volte" o chefe recua
- [ ] Atordoado pelo Boogie e depois pela Fala fica com o maior restante (edge case, com `tech=boogie,fala`)
- [ ] Com `axes=fala.recarga:3`, o abate pela Fala corta a recarga do slot pelo `claimKillRefund` uma vez por
      conjuração (FLA-08); cada alvo atordoado sobe a maestria (JJK-08); com `domain=santuario`, no máximo um gatilho
      por conjuração (JJK-09)
- [ ] `Boss.ts` ≤ 400 efetivas (JJK-15); smokes `boss`, `fight`, `impact` e `power` verdes (o número dos golpes corpo a
      corpo não muda)
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(tech): stun, push and hurt the targets of the cursed speech`

---

#### T61: Exploda em Cadeia, Esmague e vida da fala

**What**: em `src/game/tech/speech.ts`, cada `SpeechCast` fica viva enquanto houver atordoamento dela ou por 800 ms
desde a fala, o maior, com `cast.update(dt)` por quadro; Exploda em Cadeia: os ids atordoados pela fala com o último
centro; o que aparece morto chama `cast.onTargetDied`, os acertos saem como `micro` com o atordoamento e o evento
`speechChain:<id>`; Esmague: enquanto há empurrados e a janela de 800 ms não fechou, `world.touchesWall(caixa)` ou a
sobreposição com outro comum vivo chama `cast.onPushedImpact(empurrado, outro | 'wall')` uma vez e tira o empurrado do
conjunto; `state()` → `techState.fala` (`stunned` e `pushed` da `SpeechCast` viva, ou `null`);
`techWorld.touchesWall(box)` (alargada 2 px nos lados, encolhida 2 px em cima e embaixo).
**Where**: `src/game/tech/speech.ts`
**Depends on**: T60
**Reuses**: `SpeechCast.onTargetDied`, `onPushedImpact`; `widen`/`shrink` (T25); `CURSED_SPEECH.esmague.windowMs`
**Requirement**: FLA-06, FLA-07, FLA-09, FLA-11, JJK-14

**Done when**:

- [ ] `tests/game/debugApi.test.ts`: `techState.fala` no literal (FLA-11)
- [ ] `cursed-speech.smoke.mjs` (parte 2): `techState.fala.stunned` lista os ids atordoados e volta a `null` depois do
      maior atordoamento ou de 800 ms (FLA-09, FLA-11); com `ramo=fala:a` no Nv 5, matar um atordoado solta a cadeia
      `micro` com atordoamento nos vizinhos e `speechChain:<id>` (FLA-06); com `ramo=fala:b` no Nv 5, o empurrado que
      bate na parede leva uma mordida `micro` e cai; empurrado contra outro comum: uma mordida só no empurrado e o outro
      só cai (FLA-07, edge case)
- [ ] Cadeia e esmagamento só depois de uma fala do jogador (JJK-14)
- [ ] Smokes `boss` e `tech` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(tech): chain and crush with the cursed speech awakenings`

---

#### T62: Onda da voz, selo e marcador de atordoamento

**What**: a folha `tech-fx-leva1` ganha `seal` (glifo da serpente), `stun-0` e `stun-1`; `src/game/techFx/SpeechFx.ts`
com `voice(origin, facing, rangePx, coneDeg)` (3 arcos num `Graphics` por 250 ms, cor `T`), `seal(x, y)` (300 ms) e
`stunMarker(target, ms)` (sobre a posição desenhada do alvo, prazo = atordoamento), todos no `FxRegistry`.
**Where**: `src/game/techFx/SpeechFx.ts`
**Depends on**: T60
**Reuses**: folha da T40; `spritePos` (AD-019)
**Requirement**: FLA-10, FLA-12

**Done when**:

- [ ] `tests/game/art/leva1Fx.test.ts`: `seal`, `stun-0` e `stun-1` com 16×16 texels e só chaves da `PALETTE`
- [ ] `cursed-speech.smoke.mjs` (parte 3): na soltura, a onda e o selo entram em `fx.live` e saem em 250 e 300 ms; um
      marcador por alvo atordoado, que some com o atordoamento (FLA-10)
- [ ] Prancha olhada e conferência no jogo em HD, em movimento e para os dois lados, com um comum e o chefe no cone
      (FLA-12)
- [ ] Smokes `power` e `hud` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(fx): draw the cursed speech voice, seal and stun marker`

---

#### T63: Fala na loja

**What**: `LEVA1_TECHNIQUE_ENTRIES` ganha a Fala (`rare`, `maxLevel: 6`), depois da Ressonância, no fim do
`GAME_SHOP_CATALOG`; preço 26 antes da inflação.
**Where**: `src/data/shop.ts`
**Depends on**: T58
**Reuses**: entradas da T41 e da T51
**Requirement**: JJK-03, JJK-04, JJK-05

**Done when**:

- [ ] `tests/data/shop.test.ts` e `tests/core/evolutionShop.test.ts`: o catálogo termina com Boogie, Ressonância e Fala,
      nada muda de posição, preço 26 antes da inflação (JJK-03)
- [ ] Smoke `shop` (ou `cursed-speech`) com `tech=fala` e a loja da r4: carta de 2 eixos `Nv 2/6` e, no Nv 2, a página
      do ramo com "Exploda" e "Volte" (JJK-04, JJK-05)
- [ ] Smokes `shop-progress` e `tech-axes` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(shop): sell the cursed speech`

---

#### T64: Fechamento da F34

**What**: `CLAUDE.md` (linha "Técnicas" da tabela "Onde mexer") ganha os smokes `boogie`, `resonance` e
`cursed-speech`; `README.md` lista os três smokes novos; conferência final das linhas efetivas (`TestScene` com as
linhas do fim da F33 menos as ~20 da T2, `Hud.ts`, `data/moves.ts` e `ShopPanel.ts` sem crescer, `Enemy.ts` e `Boss.ts`
≤ 400, nenhum arquivo novo no `.oxlintrc.json`) anotada no commit; rodada da lista de smokes do fim da F34 (design).
**Where**: `CLAUDE.md`
**Depends on**: T59, T61, T62, T63
**Reuses**: "Smokes por passo" e "Fim da F34" do design
**Requirement**: JJK-15, JJK-16, REG-04

**Done when**:

- [ ] Tabela do `CLAUDE.md` e `README.md` atualizados
- [ ] Contagem de linhas efetivas anotada no commit e dentro dos limites do JJK-15; `git diff <base da F34>..HEAD
      --stat -- src/game/TechRunner.ts src/game/TechCaster.ts src/scenes/test/techDirector.ts` só com commits das T1 a
      T15 (REG-04)
- [ ] Smokes do fim da F34 verdes: `boogie`, `resonance`, `cursed-speech`, `tech`, `techniques`, `red-anime`,
      `red-axes`, `kokusen`, `evolution`, `fight`, `fxlab`, `tech-axes`, `domain`, `cursed-body`, `hud`, `shop`,
      `shop-progress`, `boss`, `power`, `boot` e `no-debug`
- [ ] Gate verde

**Tests**: none
**Gate**: build
**Commit**: `docs: map the leva 1 techniques and their smokes`

---

## Requirement Coverage

| Requirement | Tasks |
| --- | --- |
| REG-01 | T2, T3, T4, T5, T6, T7, T8, T9, T11 |
| REG-02 | T1, T10 |
| REG-03 | T4, T5, T9 |
| REG-04 | T9, T32, T46, T58, T64 |
| TOB-01 | T12 |
| TOB-02 | T12 |
| TOB-03 | T12, T46 |
| EMI-01 | T13, T14, T15 |
| EMI-02 | T13, T14, T49 |
| EMI-03 | T13, T49 |
| EMI-04 | T13, T14, T15 |
| ICO-01 | T16, T17, T32, T46, T58 |
| ICO-02 | T19 |
| ICO-03 | T18, T20 |
| ICO-04 | T20 |
| ICO-05 | T21 |
| ICO-06 | T23 |
| ICO-07 | T19 |
| ICO-08 | T18, T22 |
| ICO-09 | T19, T20, T21, T22, T23 |
| BWG-01 | T25, T33, T34 |
| BWG-02 | T28, T33, T34 |
| BWG-03 | T33 |
| BWG-04 | T27, T35 |
| BWG-05 | T36 |
| BWG-06 | T26, T29, T32, T39 |
| BWG-07 | T26, T37 |
| BWG-08 | T37 |
| BWG-09 | T38 |
| BWG-10 | T39 |
| BWG-11 | T36 |
| BWG-12 | T40 |
| BWG-13 | T40 |
| RSN-01 | T43, T46 |
| RSN-02 | T25, T46 |
| RSN-03 | T47 |
| RSN-04 | T42, T47 |
| RSN-05 | T42, T46 |
| RSN-06 | T29, T42, T46 |
| RSN-07 | T48 |
| RSN-08 | T48 |
| RSN-09 | T47, T50 |
| RSN-10 | T49 |
| RSN-11 | T50 |
| RSN-12 | T46 |
| RSN-13 | T50 |
| RSN-14 | T50 |
| FLA-01 | T52, T57, T58 |
| FLA-02 | T25, T58 |
| FLA-03 | T58 |
| FLA-04 | T53, T58, T59 |
| FLA-05 | T27, T54, T60 |
| FLA-06 | T61 |
| FLA-07 | T61 |
| FLA-08 | T29, T60 |
| FLA-09 | T61 |
| FLA-10 | T62 |
| FLA-11 | T35, T61 |
| FLA-12 | T62 |
| JJK-01 | T32, T46, T58 |
| JJK-02 | T30, T32, T44, T46, T55, T58 |
| JJK-03 | T41, T51, T63 |
| JJK-04 | T41, T51, T63 |
| JJK-05 | T38, T41, T51, T63 |
| JJK-06 | T32, T46, T58 |
| JJK-07 | T32, T46, T58 |
| JJK-08 | T36, T39, T47, T48, T49, T60 |
| JJK-09 | T36, T47, T60 |
| JJK-10 | T36, T47, T60 |
| JJK-11 | T32, T46, T58 |
| JJK-12 | T45, T56 |
| JJK-13 | T31, T45, T56 |
| JJK-14 | T32, T39, T46, T48, T49, T58, T61 |
| JJK-15 | T2, T33, T35, T38, T60, T64 (e nenhuma outra tarefa soma linha na `TestScene`) |
| JJK-16 | T32, T46, T58, T64 |
| JJK-17 | T24 |

76 requisitos, 76 mapeados, 0 sem tarefa.

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8 → Phase 9 → Phase 10 → Phase 11

Phase 1:  T1, T2, T3
Phase 2:  T4, T5, T6, T7, T8, T9, T10, T11
Phase 3:  T12, T13, T14, T15
Phase 4:  T16, T17, T18, T19, T20, T21, T22, T23
Phase 5:  T24, T25, T26, T27, T28, T29, T30, T31
Phase 6:  T32, T33, T34, T35, T36
Phase 7:  T37, T38, T39, T40, T41
Phase 8:  T42, T43, T44, T45, T46
Phase 9:  T47, T48, T49, T50, T51
Phase 10: T52, T53, T54, T55, T56
Phase 11: T57, T58, T59, T60, T61, T62, T63, T64
```

Ordem de execução estritamente sequencial (a lista acima é a ordem de trabalho, não dependência). 64 tarefas,
empacotadas em lotes de fases inteiras (~7 por agente): Fases 1+2 (11, uma cadeia só de refatoração: o passo 0 inteiro
num agente), Fase 3 (4), Fase 4 (8), Fase 5 (8), Fases 6+7 (10, o Boogie no jogo num agente), Fases 8+9 (10, a
Ressonância), Fases 10+11 (13, a Fala; se o agente acumular contexto, cortar entre a Fase 10 e a 11). Agente novo por
lote (memória "Agente novo por lote"). Os lotes com vista e arte (Fase 4, Fases 6+7, 8+9 e 10+11) vão em Opus 5.5 ou
Fable, nunca Sonnet; a Fase 5 é regra pura e dados e pode ir num modelo mais leve, com revisão no forte. Os avais da T45
e da T54 são pedidos ao usuário antes de despachar o lote que as contém.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | 1 módulo puro (portão e `holdSign` da `CastMachine`) | ✅ |
| T2 | 1 arquivo novo de portas + o construtor que o lê + a linha da `TestScene` | ⚠️ coeso: as portas sem o construtor não têm leitor, e a `TestScene` é o chamador |
| T3 | 1 contrato + o `update` que o recebe + quem o monta | ⚠️ coeso: o tipo sem o leitor e o montador não compila como prova |
| T4, T5, T6, T7, T8 | 1 técnica vira módulo | ✅ |
| T9 | 1 registro + o runner que o itera + os 2 leitores do snapshot e do ciclo de vida | ⚠️ coeso: o registro só existe se o runner deixar de citar técnica (REG-01) |
| T10 | 1 método (`TechCaster.update`) + o repasse no `techDirector` | ⚠️ coeso: o portão sem o repasse não é chamado |
| T11, T64 | 1 documento (com a linha da tabela do `CLAUDE.md`) | ✅ |
| T12 | 1 contrato de snapshot + os smokes que leem o contrato | ⚠️ coeso: mudança de contrato com os leitores no mesmo commit (regra do passo 1) |
| T13 | 1 módulo puro (teste movido) | ✅ |
| T14, T15 | 1 fonte do emissor ligada + o código que sai do dono antigo | ⚠️ coeso: refatoração que move o caminho, sem duplicar |
| T16 | 1 cherry-pick de 2 commits já revistos | ✅ |
| T17, T23 | 1 campo da tabela | ✅ |
| T18, T26, T42, T43, T52, T53 | 1 função ou 1 classe pequena | ✅ |
| T19, T21, T22 | 1 vista + a ligação mínima dela | ✅ |
| T20 | 1 vista + o campo da oferta e o repasse do diretor | ⚠️ coeso: a vista sem o `icon` da oferta não mostra nada |
| T24 | 1 linha de tabela + o teste e a spec que a fixam | ✅ |
| T25, T27, T28, T29, T54 | 1 mudança num módulo puro | ✅ |
| T30, T44, T55 | 1 resolvedor | ✅ |
| T31, T45, T56 | 1 bloco da tabela de eixos | ✅ |
| T32, T46, T58 | 1 técnica entra no `TechId` com o módulo mínimo (dados, eixos, registro, smoke) | ⚠️ coeso: o `Record<TechId, …>` exaustivo (`TECHNIQUES`, `AURA_COLOR_BY_TECH`, `TECH_MODULES`, `RESOLVERS`) obriga tudo no mesmo commit |
| T33, T34, T36, T37, T39 | 1 caminho do `boogieMoves` + os ganchos finos que ele chama | ⚠️ coeso: gancho sem chamador não tem prova (L-076) |
| T35, T38 | 1 gancho no corpo + o leitor no módulo | ⚠️ coeso |
| T40, T50, T62 | 1 vista + os quadros dela na folha | ✅ |
| T41, T51, T63 | 1 entrada de catálogo | ✅ |
| T47 | 1 aplicador de eventos | ✅ |
| T48, T61 | 1 parte do módulo (consequências tardias) | ✅ |
| T49 | 1 fonte do emissor + a porta e o leitor no módulo | ⚠️ coeso |
| T57 | 1 parâmetro de debug | ✅ |
| T59 | 1 desconto no diretor | ✅ |
| T60 | 1 aplicador de efeitos + 2 ganchos do chefe | ⚠️ coeso |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | — | ✅ Match |
| T2 | None | — | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 (fase 1) | — (fase anterior) | ✅ Match |
| T5 | T3 (fase 1) | — (fase anterior) | ✅ Match |
| T6 | T3 (fase 1) | — (fase anterior) | ✅ Match |
| T7 | T3 (fase 1) | — (fase anterior) | ✅ Match |
| T8 | T3 (fase 1) | — (fase anterior) | ✅ Match |
| T9 | T4, T5, T6, T7, T8 | T4/T5/T6/T7/T8 → T9 | ✅ Match |
| T10 | T9 | T9 → T10 | ✅ Match |
| T11 | T9, T10 | T9 → T11, T10 → T11 | ✅ Match |
| T12 | T9 (fase 2) | — (fase anterior) | ✅ Match |
| T13 | None | — | ✅ Match |
| T14 | T13 | T13 → T14 | ✅ Match |
| T15 | T14 | T14 → T15 | ✅ Match |
| T16 | None | — | ✅ Match |
| T17 | T16 | T16 → T17 | ✅ Match |
| T18 | T17 | T17 → T18 | ✅ Match |
| T19 | T17 | T17 → T19 | ✅ Match |
| T20 | T18 | T18 → T20 | ✅ Match |
| T21 | T17 | T17 → T21 | ✅ Match |
| T22 | T18, T20 | T18 → T22, T20 → T22 | ✅ Match |
| T23 | T19, T20, T21 | T19 → T23, T20 → T23, T21 → T23 | ✅ Match |
| T24 | None | — | ✅ Match |
| T25 | None | — | ✅ Match |
| T26 | None | — | ✅ Match |
| T27 | None | — | ✅ Match |
| T28 | None | — | ✅ Match |
| T29 | None | — | ✅ Match |
| T30 | T24 | T24 → T30 | ✅ Match |
| T31 | None | — | ✅ Match |
| T32 | T26, T29, T30, T31 (fase 5) | — (fase anterior) | ✅ Match |
| T33 | T32 | T32 → T33 | ✅ Match |
| T34 | T33 | T33 → T34 | ✅ Match |
| T35 | T33 | T33 → T35 | ✅ Match |
| T36 | T33 | T33 → T36 | ✅ Match |
| T37 | T33 (fase 6) | — (fase anterior) | ✅ Match |
| T38 | T37 | T37 → T38 | ✅ Match |
| T39 | T33 (fase 6) | — (fase anterior) | ✅ Match |
| T40 | T37, T39 | T37 → T40, T39 → T40 | ✅ Match |
| T41 | T32 (fase 6) | — (fase anterior) | ✅ Match |
| T42 | None | — | ✅ Match |
| T43 | None | — | ✅ Match |
| T44 | None | — | ✅ Match |
| T45 | None | — | ✅ Match |
| T46 | T42, T43, T44, T45 | T42/T43/T44/T45 → T46 | ✅ Match |
| T47 | T46 (fase 8) | — (fase anterior) | ✅ Match |
| T48 | T47 | T47 → T48 | ✅ Match |
| T49 | T47 | T47 → T49 | ✅ Match |
| T50 | T47 | T47 → T50 | ✅ Match |
| T51 | T46 (fase 8) | — (fase anterior) | ✅ Match |
| T52 | None | — | ✅ Match |
| T53 | None | — | ✅ Match |
| T54 | None | — | ✅ Match |
| T55 | None | — | ✅ Match |
| T56 | None | — | ✅ Match |
| T57 | T53 (fase 10) | — (fase anterior) | ✅ Match |
| T58 | T57 | T57 → T58 | ✅ Match |
| T59 | T58 | T58 → T59 | ✅ Match |
| T60 | T58 | T58 → T60 | ✅ Match |
| T61 | T60 | T60 → T61 | ✅ Match |
| T62 | T60 | T60 → T62 | ✅ Match |
| T63 | T58 | T58 → T63 | ✅ Match |
| T64 | T59, T61, T62, T63 | T59 → T64, T61 → T64, T62 → T64, T63 → T64 | ✅ Match |

Nenhuma dependência aponta para fase posterior. As dependências de fase anterior que não aparecem no corpo são
garantidas pela ordem das fases: o portão da T1 e o repasse da T10 sob os portões das T26, T42 e T52; o `hudHint` da
T19 sob o número de cargas (T32) e o piscar (T50); a folha `tech-fx-leva1` da T40 sob as T50 e T62; o `Enemy.stun` da
T35 sob a T60; o `techBoxes` da T25 sob o `techWorld` das T33, T46, T58 e T61; o `relocate` do runner (T9) sob a T34;
o `TechEmitter` (T13 a T15) sob a T49; os ícones da T16 sob o `icon` das T32, T46 e T58; o `cutCooldown` da T29 sob a
T60; a causa `tech` da T54 (se aprovada) sob a T60.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Regra pura | unit | unit | ✅ OK |
| T2 | Adaptadores | smoke | smoke | ✅ OK |
| T3 | Adaptadores (contrato e quadro) | smoke | smoke | ✅ OK |
| T4 | Adaptador | smoke | smoke | ✅ OK |
| T5 | Adaptador | smoke | smoke | ✅ OK |
| T6 | Adaptador | smoke | smoke | ✅ OK |
| T7 | Adaptador | smoke | smoke | ✅ OK |
| T8 | Adaptador | smoke | smoke | ✅ OK |
| T9 | Adaptadores + teste de fonte (`?raw`) | smoke (+ unit do fonte) | unit (gate full com os smokes) | ✅ OK |
| T10 | Adaptadores | smoke | smoke | ✅ OK |
| T11 | Documentação | none | none | ✅ OK |
| T12 | Tipos de snapshot + adaptadores + smokes | smoke (+ unit do literal) | smoke | ✅ OK |
| T13 | Regra pura | unit | unit | ✅ OK |
| T14 | Adaptadores | smoke | smoke | ✅ OK |
| T15 | Adaptadores + regra pura (sai a classe) | smoke (+ unit do canal) | smoke | ✅ OK |
| T16 | Arte em código | unit | unit | ✅ OK |
| T17 | Números de ajuste | unit | unit | ✅ OK |
| T18 | Regra pura | unit | unit | ✅ OK |
| T19 | Adaptadores (vista com motor) + tipo de snapshot | smoke (+ unit do literal) | smoke | ✅ OK |
| T20 | Adaptadores + regra pura (`OfferView`) | smoke | smoke | ✅ OK |
| T21 | Adaptador (vista com motor) | smoke | smoke | ✅ OK |
| T22 | Adaptadores (vista com motor) | smoke | smoke | ✅ OK |
| T23 | Números de ajuste | unit | unit (gate full com os smokes) | ✅ OK |
| T24 | Números de ajuste + teste da regra | unit | unit | ✅ OK |
| T25 | Regra pura | unit | unit | ✅ OK |
| T26 | Regra pura | unit | unit | ✅ OK |
| T27 | Regra pura | unit | unit | ✅ OK |
| T28 | Regra pura | unit | unit | ✅ OK |
| T29 | Regra pura (+ tipo da tabela) | unit | unit | ✅ OK |
| T30 | Regra pura | unit | unit | ✅ OK |
| T31 | Números de ajuste | unit | unit | ✅ OK |
| T32 | Adaptadores + dados + tipos de snapshot | smoke (o mais alto; + unit dos dados e do literal) | smoke | ✅ OK |
| T33 | Adaptadores | smoke | smoke | ✅ OK |
| T34 | Adaptadores | smoke | smoke | ✅ OK |
| T35 | Adaptadores + tipo de snapshot | smoke (+ unit do literal) | smoke | ✅ OK |
| T36 | Adaptador | smoke | smoke | ✅ OK |
| T37 | Adaptadores | smoke | smoke | ✅ OK |
| T38 | Adaptadores | smoke | smoke | ✅ OK |
| T39 | Adaptador | smoke | smoke | ✅ OK |
| T40 | Arte em código + adaptador (vista com motor) | smoke (+ unit da arte) | smoke | ✅ OK |
| T41 | Números de ajuste (catálogo) + loja no jogo | smoke (+ unit do catálogo) | smoke | ✅ OK |
| T42 | Regra pura | unit | unit | ✅ OK |
| T43 | Regra pura | unit | unit | ✅ OK |
| T44 | Regra pura | unit | unit | ✅ OK |
| T45 | Números de ajuste | unit | unit | ✅ OK |
| T46 | Adaptadores + dados + tipos de snapshot | smoke (o mais alto) | smoke | ✅ OK |
| T47 | Adaptador | smoke | smoke | ✅ OK |
| T48 | Adaptador | smoke | smoke | ✅ OK |
| T49 | Adaptadores | smoke | smoke | ✅ OK |
| T50 | Arte em código + adaptador (vista com motor) | smoke (+ unit da arte) | smoke | ✅ OK |
| T51 | Números de ajuste (catálogo) + loja no jogo | smoke (+ unit do catálogo) | smoke | ✅ OK |
| T52 | Regra pura | unit | unit | ✅ OK |
| T53 | Regra pura | unit | unit | ✅ OK |
| T54 | Regra pura | unit | unit | ✅ OK |
| T55 | Regra pura | unit | unit | ✅ OK |
| T56 | Números de ajuste | unit | unit | ✅ OK |
| T57 | Adaptador (+ documentação) | smoke | smoke | ✅ OK |
| T58 | Adaptadores + dados + tipos de snapshot | smoke (o mais alto) | smoke | ✅ OK |
| T59 | Adaptador | smoke | smoke | ✅ OK |
| T60 | Adaptadores | smoke | smoke | ✅ OK |
| T61 | Adaptador + tipo de snapshot | smoke (+ unit do literal) | smoke | ✅ OK |
| T62 | Arte em código + adaptador (vista com motor) | smoke (+ unit da arte) | smoke | ✅ OK |
| T63 | Números de ajuste (catálogo) + loja no jogo | smoke (+ unit do catálogo) | smoke | ✅ OK |
| T64 | Documentação | none | none | ✅ OK |

T9 e T23 dizem `unit` porque o arquivo do `Where` é coberto por teste unitário (fonte e tabela), mas o gate delas é
`full` com os smokes do passo, que é o nível mais alto da camada tocada. A T10 entrega o portão no `TechCaster` sem
módulo que o use; o `consume` e o `deny` no jogo vivo são medidos na T32 (Boogie: `skipCooldown` e `techDenied:cooldown`),
na T46 (Ressonância: `consume`) e na T58 (Fala: `techDenied:hp`), e a regra está coberta na T1 (merge forward, como a
T27/T28 da F31). Nenhuma tarefa adia teste da própria camada para outra.
