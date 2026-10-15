# Expansão de domínio — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/expansao-de-dominio/spec.md`
**Design**: `.specs/features/expansao-de-dominio/design.md`
**Plano**: `docs/plano-builds-e-habilidades.md` (linha F31 da seção 6; seções 3.1, 4 e 5.6)
**Base**: F29 `fundacao-de-poder` (`.specs/features/fundacao-de-poder/tasks.md`) e F30 `vermelho-e-corpo`
(`.specs/features/vermelho-e-corpo/tasks.md`), as duas mergeadas antes da T1
**Status**: Draft
**Branch**: `feat/expansao-de-dominio`, aberta depois do merge da F30
**Ferramentas**: nenhuma MCP. Skill só o `tlc-spec-driven`. As tarefas de vista (T11, T19, T29, T36) são conferidas no
jogo em HD, em movimento e com o player virado para os dois lados (DHD-06; memória "Conferir animação em movimento"):
captura pelo `window.__game` e uma passada jogando. Vista e revisão em Opus 5.5 ou Fable, nunca Sonnet (memória
"Delegar o leve, qualidade no forte").

Regras que valem para toda tarefa (CLAUDE.md): um commit por tarefa, só os arquivos dela (nunca `git add -A`), `npm run
gate` verde uma vez antes do commit; durante a tarefa só o teste do arquivo tocado (`npx vitest run <arquivo>`), porque
a máquina roda outras frentes; smoke só do que foi tocado; smoke novo com `?debug&hd=1&area=modular`; tetos de 400
linhas efetivas por arquivo, 80 por função e complexidade 15; arquivo novo nunca entra no `.oxlintrc.json`; teste da
lista de exceções do `max-lines` (`tests/core/run.test.ts`, `bossBrain.test.ts`) não cresce: o teste vai para arquivo
novo. A `TestScene` fica com as linhas efetivas que a F30 deixou (390 pela estimativa da F29): nenhuma tarefa soma linha
nela (DOM-11); a T8 só troca o texto da chamada do `techDirector`. Linha efetiva = sem linha em branco e sem
comentário, como o `max-lines` do `.oxlintrc.json`.

Interfaces da F29 e da F30 citadas pelo nome (`StatsDirector.snapshotFields`, `statSheet`, `StrikeMods.marks`,
`PropDamage`, `DamageNumbers`, `impactFx.onKokusen`, `ChoicePanel`, `openChoiceOrShop`, `updateChoicePanel`,
`techStats`, `shopEligibility`, `shopPricing`, `shopPreview`, `shopDraw`, `build.onMeleeHit(hit, point, target)`,
`build.axes`, `build.body`): a tarefa que toca uma delas reconfere o nome e a assinatura no código mergeado antes de
começar; se mudou, segue o código e anota a troca no commit.

---

## Test Coverage Matrix

> Guidelines: `CLAUDE.md` (camadas, gate, smoke só do que foi tocado, HD é a base), `.oxlintrc.json` (tetos e lista de
> exceções), `vitest.config.ts`, `package.json` (`gate`, `test`, `smoke`); lições L-010 (limite testado nos dois
> lados), L-043 (testar o adaptador que repassa o número ao motor, não só a regra pura), L-076 (campo de debug que só
> repete a entrada não prova o efeito). Amostras: `tests/core/enemyBrain.test.ts`, `tests/core/cast.test.ts`,
> `tests/core/shop.test.ts`, `tests/game/vowPanel.test.ts`, `tests/game/debugApi.test.ts`,
> `scripts/smoke/vows.smoke.mjs`, `scripts/smoke/power.smoke.mjs` (F29).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Regra pura (`src/core/**`) | unit | 1:1 com os ACs; todo edge case listado; cada limite nos dois lados (L-010): 7999/8000/16000 ms, 320/321 px, 64/65 px, 4/5 gatilhos, 999/1000/1001 ms, 35% e 35% + 1 HP, 60% com e sem Riichi, r7/r8, Nv 2 → 3 e Nv 3 no teto, 40 < t ≤ 60 s | `tests/core/*.test.ts` (teste par por arquivo novo) | `npx vitest run tests/core/<arquivo>` |
| Números de ajuste (`src/data/**`) | unit | Números da seção 5.6 do plano conferidos um a um; toda chave de cor existe na `PALETTE` (DHD-04) | `tests/data/*.test.ts` | `npx vitest run tests/data/<arquivo>` |
| Vista testável sem motor (`src/game/ChoicePanel.ts`, tipos de snapshot) | unit | Páginas, seleção e `debug()` no molde do `VowPanel`; literal do snapshot com os campos novos | `tests/game/*.test.ts` | `npx vitest run tests/game/<arquivo>` |
| Adaptadores (`src/scenes/**`, `src/game/**`) | smoke | Efeito lido do jogo vivo pelo snapshot, medido na saída e não no pedido (L-043, L-076); refatoração com os smokes de antes iguais | `scripts/smoke/domain.smoke.mjs` (novo) e os smokes de cada tarefa | `npm run smoke -- <trecho>` |
| Documentação (`README.md`) | none | build gate only | - | `npm run gate` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tarefa só com teste unitário (regra pura, dados, vista sem motor) | `npx vitest run <arquivo do teste>` durante a tarefa; `npm run gate` uma vez antes do commit |
| Full | Tarefa de adaptador (smoke) | `npm run gate && npm run smoke -- <cada trecho da tarefa>` |
| Build | Fim de fase e tarefa só de documentação | `npm run gate` e os smokes da fase ("Smokes por passo" do design) |

Base: a contagem de testes unitários do merge da F30, anotada pela T1. Nenhuma tarefa apaga teste; cada uma informa a
nova contagem. Smokes instáveis: `armed` (ARM-12) e timeouts sob carga: repetir isolado antes de suspeitar.

`domain.smoke.mjs` nasce na T5 e ganha um cenário por tarefa de adaptador, na numeração do design ("Smoke novo", partes
1 a 7). Passando de 380 linhas efetivas, o cenário do baú do chefe sai para `domain-levels.smoke.mjs` (T46).

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Passo 1 — barra e ativação, regra pura

```
T1 → T2 → T4
T1 → T3
```

### Phase 2: Passo 2 — Domínio no jogo (diretor, carga, tecla, ativação, barra)

```
T5 → T6
T5 → T7
T5 → T8 → T9
T8 → T10
T8 → T11
T5 → T11
```

### Phase 3: Passo 3 — Baú do Véu

```
T12 → T15 → T16
T13 → T15
T14 → T16
```

### Phase 4: Passo 4 — Santuário Malevolente

```
T17 → T18 → T19
T18 → T20
```

### Phase 5: Passo 5 — Jackpot

```
T22 → T24 → T27 → T28 → T29
T25 → T26 → T27
T21 → T28
T23 → T28
```

### Phase 6: Passo 6 — Amplificação de Domínio

```
T30 → T32
T31 → T32
T30 → T33 → T34
T30 → T35
T30 → T36
```

### Phase 7: Passo 7 — níveis 2 e 3, regra pura e loja

```
T38 → T40 → T44
T39 → T40
T38 → T41 → T44
T39 → T41
T39 → T42 → T44
T39 → T43 → T44
T37
```

### Phase 8: Passo 7 — níveis no jogo e fechamento

```
T45 → T46 → T48
T47 → T48
```

---

## Task Breakdown

### Phase 1: Passo 1 — barra e ativação, regra pura

#### T1: Tabela de números e cores do Domínio

**What**: `src/data/domains.ts` com `DomainId`, `DomainLevel`, `DOMAIN_IDS`, `DomainDef`, `DOMAINS` (nome, linha de
efeito, `activation: { radiusPx, common, boss, elite }`, `durationMs` por nível), `DOMAIN_CHARGE`, `SANCTUARY`,
`JACKPOT`, `AMPLIFICATION`, `DOMAIN_HIT`, `DOMAIN_SHOP`, `DOMAIN_COLORS`, `DOMAIN_BAR` e `DOMAIN_FX`, com os valores do
design ("Components", `data/domains.ts`).
**Where**: `src/data/domains.ts`
**Depends on**: None
**Reuses**: molde de `data/perks.ts` e `data/arsenal.ts` (tabelas `as const` tipadas); `PALETTE` de `art/palette.ts`
**Requirement**: DHD-04, DOM-02, SAN-01, AMP-01

**Done when**:

- [ ] `tests/data/domains.test.ts` (novo): raios 320/64/64; frações 0,40/0,06, 0,40/0,06 e 0,25/0,04 (elite 0,20, 0,20 e
      0,12); durações 6000/8000/8000 e 7000/9000/9000; carga 1/2/2/1/5/1/5/15 com `drainAfterMs` 8000 e `drainStep` 10;
      Santuário 4 gatilhos em 1000 ms, alvos 4/6/6, corte base 6, Corte do Mundo 0,35 e 0,08; Jackpot 2000 ms, base
      0,33/0,40/0,40, Riichi 0,04, bônus 0,05, teto 0,60, piedade 2, efeito 8000/200 e 4000/400 com 0,5/0,5;
      Amplificação 1,25; loja 40 + 10 por nível a partir da r8
- [ ] Toda chave de `DOMAIN_COLORS` existe na `PALETTE` (DHD-04)
- [ ] Nenhum import de Phaser; gate verde; anotar aqui a contagem de testes do merge da F30 (base) e a nova

**Tests**: unit
**Gate**: quick
**Commit**: `feat(data): add the domain tuning table`

---

#### T2: Barra e posse do Domínio

**What**: `src/core/domain.ts` com `ChargeEvent`, `DomainState` (`owned`, `charge`, `active`, `veilPending`,
`bossChestPending`, `own`, `raise`, `addCharge`, `tick`, `setCharge`, `markVeil`, `takeVeil`, `reset`, `ready`) e
`domainBarView(state)`; `active` é tipado por uma interface mínima `{ remainingMs; totalMs }` até a T4 trazer o
`ActiveDomain`.
**Where**: `src/core/domain.ts`
**Depends on**: T1
**Reuses**: `DOMAIN_CHARGE`; padrão de relógio por `dtMs` de `core/hitBand.ts` (`MicroBudget`, F29)
**Requirement**: DOM-01, DOM-02, DOM-03, DOM-04, DOM-05, DNV-01, VEU-04, DHD-01, DHD-02, DHD-03

**Done when**:

- [ ] `tests/core/domain.test.ts` (novo): carga inteira de 0 a 100 sem passar dos limites (DOM-01); tabela evento a
      evento (+1 leve, +2 forte, +2 objeto, +1 abate, +5 defesa, +1 conjuração, +5 finalizador, +15 Kokusen); sem dono e
      com Domínio ativo nenhum evento muda a carga (DOM-02.5)
- [ ] Esvaziamento (DOM-03): 7999 ms sem carga não muda; 8000 ms tira 10; 16000 ms tira 20; piso 0; evento zera o
      relógio; carga 100 não esvazia; com `roundActive` falso o relógio não anda
- [ ] Ritmo de referência (DOM-04): 1 leve/s, 1 forte a cada 4 s, 1 abate a cada 5 s, 1 defesa perfeita a cada 20 s e 1
      acerto de conjuração a cada 5 s, de 0, chega a 100 com `40 < t ≤ 60` s (~46,5 s), simulado em passos de 16 ms
- [ ] `own` dá Nv 1 e carga 0; `raise` sobe 1 → 2 → 3 e recusa no Nv 3 e sem Domínio (DNV-01); `reset` zera posse,
      carga, ativo, `veilPending` e `bossChestPending` (DOM-05, VEU-04.8); `setCharge` sem dono não faz nada
- [ ] `domainBarView`: escondida sem dono; `fill = charge / 100` carregando e `remainingMs / totalMs` com ativo;
      `blinking` só com `ready` (DHD-01 a DHD-03)
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the domain charge bar`

---

#### T3: Parâmetros de debug do Domínio

**What**: `src/core/domainParam.ts` com `parseDomainParam(raw)` (`<id>[:<nível>]`) e `parseChargeParam(raw)` (inteiro de
0 a 100), os dois devolvendo `null` na entrada inválida.
**Where**: `src/core/domainParam.ts`
**Depends on**: T1
**Reuses**: molde do `core/axisParam.ts` (F30) e do parser do `?mods=` (F29)
**Requirement**: DDB-02

**Done when**:

- [ ] `tests/core/domainParam.test.ts` (novo): `santuario` → Nv 1; `jackpot:3` → Nv 3; `amplificacao:0`, `santuario:4`,
      `santuario:1.5` e `xx` → `null`; `charge` 0 e 100 aceitos; 101, -1, `5.5`, vazio e `abc` → `null`
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): parse the domain debug params`

---

#### T4: Decisão da tecla e relógio do Domínio

**What**: `src/core/domainActivation.ts` com `DomainDenial`, `activationDenial(state, busy)` (ordem `none` → `active` →
`charge` → `busy`), `ActiveDomain` (`id`, `level`, `totalMs`, `remainingMs`, `update(dtMs): boolean`, `restart(ms)`),
`inRadius` (borda inclusa), `activationDamage`, `activationTargets` e `DomainEnd`; o `DomainState.active` passa a ser
`ActiveDomain | null`.
**Where**: `src/core/domainActivation.ts`
**Depends on**: T2
**Reuses**: `DOMAINS[id].activation` e `durationMs`; `Vec2` de `core/hit.ts`
**Requirement**: DOM-06, DOM-07, DOM-08, DOM-10, SAN-01, AMP-01

**Done when**:

- [ ] `tests/core/domainActivation.test.ts` (novo): as quatro recusas na ordem, cada uma sozinha e combinadas (com ativo
      e carga 0 o motivo é `active`); nenhuma recusa muda a carga (DOM-07)
- [ ] Raio 320 com o alvo a 320 px aceito e a 321 px fora; raio 64 com 64/65 px; alvo acima do player conta pela
      distância euclidiana (DOM-08)
- [ ] Dano `max(1, round(fração × maxHp))`: 0,40/0,06 no Santuário e no Jackpot, 0,25/0,04 na Amplificação; `maxHp` 1
      dá 1; `maxHp` escalado (r35) mantém a fração (edge case)
- [ ] `ActiveDomain`: Santuário 6000 ms no Nv 1 e 8000 no Nv 2/3, Amplificação 7000 e 9000; `update` devolve falso em
      `total − 1` e verdadeiro em `total`; `restart` troca o total e o restante (DOM-10, SAN-01, AMP-01)
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): decide and time the domain activation`

---

### Phase 2: Passo 2 — Domínio no jogo (diretor, carga, tecla, ativação, barra)

#### T5: Diretor do Domínio com snapshot e debug

**What**: `src/scenes/test/domainDirector.ts` (campo `domain` do `BuildDirector`) com `state`, `reset()`,
`applyDebug()` (`domain=` e `charge=` pelo `debugParam`), `snapshot(): DomainSnapshot` e `statMods()` neutro;
`src/game/domainSnapshot.ts` com `DomainSnapshot` e `DomainBarSnapshot`; `BuildDirector.reset` chama `domain.reset()`;
`runDirector.onStartRun` chama `build.domain.applyDebug()` depois do `stats.reset()` (e do `build.applyDebugAxes()` da
F30); `StatsDirector.snapshotFields()` ganha `domain`; `GameSnapshot.domain` no `debugApi.ts`; nasce
`scripts/smoke/domain.smoke.mjs` com o cenário de debug.
**Where**: `src/scenes/test/domainDirector.ts`
**Depends on**: T2, T3
**Reuses**: molde do `axisDirector` (F30, campo `axes` do `BuildDirector`) e do `powerSnapshot`/`axisSnapshot`;
`debugParam` (`params.ts:5`); `fight-kit.mjs` e `lib.ts`
**Requirement**: DDB-01, DDB-02, DOM-05

**Done when**:

- [ ] `tests/game/debugApi.test.ts`: literal com `domain` obrigatório (`owned`, `charge`, `ready`, `active`, `jackpot`,
      `triggersLastSecond`, `veilPending`)
- [ ] `domain.smoke.mjs` (cenário 0) em `?debug&hd=1&area=modular&seed=1`: sem parâmetro, `domain.owned` nulo e `charge`
      0; com `domain=santuario:2&charge=50`, `owned` `{id: 'santuario', level: 2}` e `charge` 50; com `domain=xx` ou
      `charge=101`, o parâmetro é ignorado (DDB-02); `R` na derrota começa a run nova com o Domínio do parâmetro de novo
      e sem o estado da run velha (DOM-05)
- [ ] `debugSnapshot` sem linha nova (o campo vem do `snapshotFields`); `TestScene` sem linha nova
- [ ] Smokes `boot`, `no-debug`, `power` e `domain` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(scene): own the domain in a build director with a snapshot`

---

#### T6: Carga por golpe, defesa, finalizador e abate

**What**: `domainDirector.onMeleeHit(hit)` (um por `swingId` no golpe do moveset, `light` +1 ou `heavy` +2; objeto e
arma vinculada +2 com dedupe por quadro; pula `FINISHER_MOVE`), `onDefense(kind)` (`parry`, `deflect`,
`perfectDodge` +5), `onFinisher()` (+5) e `onKill()` (+1); `BuildDirector.onMeleeHit`, `onDefense` e `onFinisher`
repassam ao `domain`; `combat.onEnemyDied` chama `build.domain.onKill()` e `combat.tryBossFinisher` chama
`build.domain.onFinisher()` antes do `return true` (sem passar pelo `build.onFinisher`, para o `executor` não curar no
chefe).
**Where**: `src/scenes/test/domainDirector.ts`
**Depends on**: T5
**Reuses**: `Hit.swingId` (`core/hit.ts:50`, `strikes.ts:159`, `:280`); `FINISHER_MOVE` (`data/moves.ts`); ganchos de
`combat.ts` (`onConnect`, `onDefense`, `tryFinisher` l.214-243, `onEnemyDied` l.73-77, `tryBossFinisher` l.250-273)
**Requirement**: DOM-02

**Done when**:

- [ ] `domain.smoke.mjs` (parte 1) com `domain=santuario&maxAlive=1&enemyGuard=0`: `charge` sobe 1 no `jab`, 2 na
      `cotovelada`, 1 no abate; um `jab` que acerta 2 comuns encostados (`maxAlive=2`) sobe 1 (DOM-02.3); o finalizador
      sobe 5 e não 7; um parry (ajudante de defesa do `fight-kit`) sobe 5
- [ ] Sem Domínio (`seed=1` sem `domain=`), os mesmos golpes deixam `charge` em 0 (DOM-02.5)
- [ ] Smokes `fight`, `defense`, `build`, `boss` e `domain` verdes; `combat.ts` abaixo de 400 linhas efetivas
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(scene): charge the domain bar from strikes, defense and kills`

---

#### T7: Carga por conjuração e Kokusen

**What**: `domainDirector.onTechHit(hit)` (guarda a banda do último acerto de técnica; ignora o corte do próprio
Santuário pelo guarda de reentrada) e `onCastHit(castId)` (+1 uma vez por `castId` se o acerto que acabou de chegar não
era chip); `onKokusen()` (+15); `effects.onTechConnect` chama `build.domain.onTechHit(hit)` na 1ª linha;
`runDirector.onMasteryHit` chama `build.domain.onCastHit(castId)` depois do `fxLab`; `impactFx.onKokusen` (F29) chama
`build.domain.onKokusen()`.
**Where**: `src/scenes/test/domainDirector.ts`
**Depends on**: T5
**Reuses**: par `ctx.onTechHit(...)` → `ctx.masteryHit(...)` das técnicas (`game/tech/blue.ts` 132-139, `cut.ts` 61-69,
`divergent.ts` 183-241, `purple.ts` 104-105, `red.ts` 131-132); `effects.onTechConnect` (`effects.ts:40`, F29)
**Requirement**: DOM-02

**Done when**:

- [ ] `domain.smoke.mjs` (parte 1, técnica): `tech=divergente` sobe 1 por conjuração que acerta (mesmo com 2 alvos) e
      16 com Kokusen; `tech=azul` com só tiques chip não sobe; `tech=corte` sobe 1 por conjuração
- [ ] O `impactFx.onKokusen` continua sem ramo novo (exceção de complexidade sem subir no `oxlint`)
- [ ] Smokes `tech`, `kokusen`, `techniques`, `fxlab` e `domain` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(scene): charge the domain bar from technique casts and kokusen`

---

#### T8: Tecla P/N, recusas e laço do quadro

**What**: `domainPressed` no `InputSnapshot` (`JustDown` de `P` e de `N`, as duas bordas consumidas por `anyJustDown`) e
`domainPressed: false` no `NEUTRAL_INPUT` (`params.ts`); a chamada do `techDirector` na `TestScene` passa a
`update(dt, input)` (mesma linha); `TechDirector.update(dt, input)` chama primeiro
`build.domain.update(dt, input.domainPressed)`; `domainDirector.update` sai cedo no `fxLab` e fora de
`roundActive`/`intermission`/`traverse`, resolve a tecla (`tryActivate`: recusa com um evento `domainDenied:<motivo>`
sem mexer na carga; aceita: `player.cancelMelee()` se havia golpe, carga 0, `ActiveDomain`, evento `domain:<id>`,
`stats.sync()`), anda o relógio do Domínio (fim pelo tempo → `end('timer')` com `domainEnd:<id>`) e chama
`state.tick(dt, run.state === 'roundActive')`. O acerto da ativação entra na T9.
**Where**: `src/scenes/test/domainDirector.ts`
**Depends on**: T5
**Reuses**: `anyJustDown` (`input.ts:38`); `inputFor` (F29) como porteira; `player.isBusyForCast()` (`Player.ts:412`),
`player.cancelMelee()` (`:397`), `techCaster.cast`, `recovery.reverse.active`, `player.dead`; `activationDenial` e
`ActiveDomain` (T4)
**Requirement**: DOM-03, DOM-05, DOM-06, DOM-07, DOM-10, DOM-11

**Done when**:

- [ ] `domain.smoke.mjs` (parte 2, tecla): com `domain=santuario&charge=100`, `P` dá `domain:santuario` e `charge` 0, e
      `N` faz o mesmo numa run nova; segundo `P` dá `domainDenied:active`; sem `charge`, `domainDenied:charge`; sem
      `domain`, `domainDenied:none`; durante uma conjuração (`tech=corte`, `L` e `P` no quadro seguinte),
      `domainDenied:busy`; nenhuma recusa muda a carga e cada uma empurra um evento só (DOM-07)
- [ ] `P` e `N` no mesmo quadro dão uma tentativa (edge case); `P` apertado na konbini não dá evento nenhum, nem na
      saída da loja (DOM-06.2)
- [ ] `P` no meio do `jab` termina o golpe na hora (DOM-07.4); o Domínio acaba pelo tempo com `domainEnd:santuario` em
      6000 ms de jogo (`active.remainingMs` lido no snapshot)
- [ ] Esvaziamento no jogo: `charge=50` parado 8 s de `roundActive` cai para 40 (DOM-03)
- [ ] `src/scenes/TestScene.ts` com as mesmas linhas efetivas de antes da tarefa (DOM-11)
- [ ] Smokes `fight`, `tech`, `hud`, `boot`, `no-debug` e `domain` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(input): activate the domain with P or N`

---

#### T9: Golpe decisivo da ativação

**What**: `domainDirector.strikeActivation()`: alvos por `activationTargets` (comuns vivos e chefe vivo, centro do
`hurtRect`), um `Hit` por alvo (`ownerId: player.id`, dano `activationDamage`, `strength: 'heavy'`, `force`
`DOMAIN_HIT.force`, `direction` `{x: ±1, y: DOMAIN_HIT.liftY}`, `unblockable: true`, `tech: true`, `knockdown` só na
Amplificação, sem `band`); acerto aceito → `ui.damageNumbers.show(target, dano, 'strike', ponto)` e
`cursedFx.impact(impactTier(hit, { brokePosture: false, forced: 'decisive' }), ...)`; depois, uma vez por ativação:
`impactFrame.trigger(-(++activationSeq))`, `focusLines.show(worldToScreen(centro do player))` e
`effects.hitstop.trigger(FINISHER_HITSTOP_MS)` com `freeze()`.
**Where**: `src/scenes/test/domainDirector.ts`
**Depends on**: T8
**Reuses**: `FINISHER_HITSTOP_MS` (`combat.ts:22`); `ImpactFrame.trigger` (`ImpactFrame.ts:44`); `FocusLines.show` e
`camera.worldToScreen` (`combat.ts:180`); `impactTier` com `forced` (F29); `DamageNumbers` (F29)
**Requirement**: DOM-08, DOM-09

**Done when**:

- [ ] `domain.smoke.mjs` (parte 2, acerto) com `domain=santuario&charge=100&maxAlive=3`: os comuns a até 320 px perdem
      `round(0,40 × maxHp)` e um posto a 321 px não perde nada (L-043: o raio e a fração chegam ao motor); com
      `domain=amplificacao`, 64/65 px e 0,25 com `knockdown` no alvo
- [ ] `hitstop.remainingMs` parte de 150 no quadro da ativação, mesmo sem alvo; `damageNumbers.last.kind` é `strike` com
      o valor aplicado; um comum de guarda levantada (`enemyGuard=1`) leva o acerto (DOM-08.6)
- [ ] O comum com 40% do HP ou menos morre e a morte não carrega a barra (edge case)
- [ ] Smokes `fight`, `impact`, `feel`, `boss` e `domain` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(scene): land the decisive domain activation hit`

---

#### T10: Fim do Domínio na rodada limpa, na morte e no reinício

**What**: `runDirector.applyRunCommand('roundCleared')` chama `build.domain.onRoundCleared(cmd.round)` (por enquanto só
`end('roundCleared')`; o Baú do Véu entra na T15); `domainDirector.update` termina com `end('death')` quando o player
morre com Domínio ativo; `reset()` termina com `end('reset')`; `uiSetup.addHud` chama `build.domain.onSceneCreate()`
(o `R` reinicia a cena: encerra sem efeito de fim). Só `end('timer')` roda o efeito de fim (DOM-10.10).
**Where**: `src/scenes/test/domainDirector.ts`
**Depends on**: T8
**Reuses**: `case 'roundCleared'` (`runDirector.ts:71-79`); `UiSetup.addHud` (`uiSetup.ts:68-94`); `DomainEnd` (T4)
**Requirement**: DOM-10

**Done when**:

- [ ] `domain.smoke.mjs` (parte 2, fins): ativar com `maxAlive=1` e o último inimigo morrer pela ativação limpa a
      rodada e dá `domainEnd:santuario` na hora (edge case); morrer com o Domínio ativo (tecla `4` do debug até 0 HP) dá
      `domainEnd`; `R` com o Domínio ativo começa sem `domain.active`
- [ ] Nenhum desses fins empurra evento de efeito de fim (o `worldCut` da T20 só sai no fim pelo tempo)
- [ ] Smokes `run-loop`, `boss` e `domain` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(scene): end the domain on round clear, death and restart`

---

#### T11: Barra do Domínio sob a energia

**What**: `src/game/DomainBar.ts` (faixa de 3 px em `DOMAIN_BAR.y`, no `x` e na largura do poço da energia; cor `U`
carregando, `T` ativa, pisca `U`/`W` a cada 250 ms com a carga cheia e mostra o rótulo `P`; `bind(source)`,
`update(dtMs)`, `debug(): DomainBarSnapshot` com a largura medida no retângulo vivo); o `EnergyHud` cria a barra e chama
`domainBar.update(dtMs)` e `domainBar.debug()` no `debugState` (+4 linhas); o `UiSetup.addHud` liga
`energyHud.domainBar.bind(() => build.domain.barView())`; `hud.domainBar` no tipo do snapshot.
**Where**: `src/game/DomainBar.ts`
**Depends on**: T5, T8
**Reuses**: faixa de estrutura sob o HP (`Hud.ts:181-190`); `BAR_X`/`BAR_W` do `EnergyHud`; `domainBarView` (T2)
**Requirement**: DHD-01, DHD-02, DHD-03, DHD-06, DDB-01

**Done when**:

- [ ] `tests/game/debugApi.test.ts`: literal com `hud.domainBar` (`visible`, `fill`, `blinking`)
- [ ] `domain.smoke.mjs` (parte 1, barra): sem Domínio `hud.domainBar.visible` falso; com `domain=santuario&charge=50`,
      `fill` medido do retângulo vivo = 0,5 (L-043, L-076); com `charge=100`, `blinking` verdadeiro; ativo, o `fill`
      cai de 1 a 0 com o tempo do Domínio (DHD-03)
- [ ] Conferido no jogo em HD (captura pelo `window.__game` e uma passada jogando, virado para os dois lados): a faixa
      fica embaixo da moldura da energia sem encostar no ícone de fragmentos (`Hud.ts:192`) (DHD-06)
- [ ] `EnergyHud.ts` com +4 linhas efetivas no máximo
- [ ] Smokes `hud`, `tech` e `domain` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(hud): show the domain bar under the energy bar`

---

### Phase 3: Passo 3 — Baú do Véu

#### T12: Sorteio do Baú do Véu

**What**: `src/core/veilChest.ts` com `drawVeil(rng: Rng): [DomainId, DomainId]`, dois Domínios diferentes entre
`DOMAIN_IDS`.
**Where**: `src/core/veilChest.ts`
**Depends on**: T1
**Reuses**: `Rng` (`core/run.ts:59-68`); `DOMAIN_IDS`
**Requirement**: VEU-02

**Done when**:

- [ ] `tests/core/veilChest.test.ts` (novo): o par tem sempre 2 ids diferentes dos 3; a mesma seed dá o mesmo par; 1000
      seeds cobrem os 3 pares possíveis
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): draw two domains for the veil chest`

---

#### T13: Stream do baú

**What**: `chestRngValue`, getter `chestRng` e `new Rng(seed ^ <sal>)` no `resolveStart` de `core/run.ts`, com um sal que
nenhum stream usa (`0xa54ff53a` no design, conferido por `grep` em `src/`); se a F30 tiver passado os sais para
`data/tuning.ts` (`SHOP.axisSalt`, T51 dela), o sal novo segue o mesmo molde.
**Where**: `src/core/run.ts`
**Depends on**: None
**Reuses**: streams com seed de hoje (`run.ts:296-306`, AD-006); molde do `axisRng` (F30)
**Requirement**: VEU-02

**Done when**:

- [ ] `tests/core/domainStreams.test.ts` (novo; `run.test.ts` está na lista de exceções): `chestRng` existe depois do
      start; a mesma seed dá a mesma sequência; sorteios no `chestRng` não deslocam o `shopRng` nem o `axisRng`
- [ ] `oxlint`: complexidade do `Run.resolveStart` sem subir (só uma atribuição, sem ramo)
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the seeded chest stream`

---

#### T14: Páginas do véu e do baú do chefe no painel de escolha

**What**: `ChoiceItem = AxisItem | 'veu' | 'bauChefe'` no `game/ChoicePanel.ts` (F30); a opção ganha a linha de efeito
(`{ title, line }`) se a página da F30 só tiver o título; o `ChoiceSnapshot` do `game/axisSnapshot.ts` passa a
`item: ChoiceItem`.
**Where**: `src/game/ChoicePanel.ts`
**Depends on**: None
**Reuses**: `ChoicePanel` (`show`, `select`, `hide`, `open`, `debug`) e o teste dele (F30)
**Requirement**: VEU-02, DDB-01

**Done when**:

- [ ] `tests/game/choicePanel.test.ts` (F30): página `veu` com 2 opções de título e linha; página `bauChefe`; `select`
      e `debug().page.item` nas duas; as páginas de ramo da F30 iguais
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(ui): accept the veil and boss chest pages in the choice panel`

---

#### T15: Pendência do Baú do Véu no fim da r3

**What**: `domainDirector.onRoundCleared(round)` passa a marcar `state.markVeil(drawVeil(run.chestRng))` quando a rodada
limpa é a 3 e o player não tem Domínio; o snapshot mostra `veilPending`; `reset()` limpa a pendência.
**Where**: `src/scenes/test/domainDirector.ts`
**Depends on**: T10, T12, T13
**Reuses**: `onRoundCleared` (T10); `markVeil`/`takeVeil` (T2)
**Requirement**: VEU-01, VEU-04, DDB-01

**Done when**:

- [ ] `domain.smoke.mjs` (parte 3, pendência) com `round=3&maxAlive=1&noshop=1`: limpar a r3 deixa
      `domain.veilPending` verdadeiro e ele segue verdadeiro na r4 (VEU-04.6); com `domain=santuario&round=3`, limpar a r3
      não marca (VEU-04.7); `R` com a pendência começa a run sem ela (VEU-04.8)
- [ ] Smokes `run-loop` e `domain` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(scene): mark the veil chest after round three`

---

#### T16: Página do Baú do Véu na konbini

**What**: `domainDirector.choicePages()` (página `veu` com o par pendente, título = nome do Domínio e linha = efeito de
`DOMAINS`) e `confirm(item, option)` (`veu` → `state.own(id)`, `takeVeil()`, evento `veil:<id>`); o
`shopDirector.openChoiceOrShop()` (F30) monta `[...build.domain.choicePages(), ...build.axes.choicePages()]` e o
`updateChoicePanel` despacha `veu` e `bauChefe` para `build.domain.confirm`; a página não tem recusa e a loja não lê
entrada até o `Enter`.
**Where**: `src/scenes/test/shopDirector.ts`
**Depends on**: T14, T15
**Reuses**: `openChoiceOrShop()` e `updateChoicePanel(input)` (F30); ordem `VowPanel` → `ChoicePanel` → loja
**Requirement**: VEU-02, VEU-03, VEU-04

**Done when**:

- [ ] `domain.smoke.mjs` (parte 3) com `round=3&maxAlive=1`: limpar a r3 abre a konbini com
      `choice.page.item === 'veu'` e 2 opções diferentes; a mesma seed mostra o mesmo par em duas runs (VEU-02.3); `D` e
      `Enter` dão `veil:<id>`, `domain.owned` `{id, level: 1}`, `charge` 0, `veilPending` falso e `hud.domainBar.visible`
      (VEU-03); antes do `Enter`, as teclas da loja não compram nada (VEU-03.5)
- [ ] Com `noshop=1` na r3, a página abre na konbini seguinte (VEU-04.6)
- [ ] Smokes `shop`, `run-loop`, `vows`, `shop-axes` (F30) e `domain` verdes; `shopDirector.ts` abaixo de 400 linhas
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(shop): open the veil chest page in the konbini`

---

### Phase 4: Passo 4 — Santuário Malevolente

#### T17: Regras puras do Santuário

**What**: `src/core/sanctuary.ts` com `SanctuaryTriggers` (`tryRelease(nowMs)`, `countAt(nowMs)`, `reset`; janela
deslizante de 1000 ms de tempo de jogo, um gatilho conta enquanto `now − t < 1000`), `sanctuaryTargets(center, targets,
max, radiusPx)` (vivos a até 320 px, do mais perto ao mais longe, empate pelo id), `sanctuaryCutDamage(hpMul)` e
`worldCutHits(center, targets)`.
**Where**: `src/core/sanctuary.ts`
**Depends on**: T1, T4
**Reuses**: `SANCTUARY`; `inRadius` (T4); `multipliersFor(...).hp` (`core/difficulty.ts:41`) nos casos de teste
**Requirement**: SAN-02, SAN-03, SAN-05

**Done when**:

- [ ] `tests/core/sanctuary.test.ts` (novo): 4 gatilhos em 1000 ms aceitos e o 5º recusado; o 5º em 999 ms recusado,
      em 1000 e 1001 ms aceito; gatilho sem alvo conta (edge case) (SAN-02)
- [ ] Até 4 alvos no Nv 1 e 6 no Nv 2/3; ordem por distância e, no empate, pelo id; alvo a 320 px entra e a 321 px
      fica fora; morto fica fora; `round(6 × hpMul)` na r1 e na r19 (SAN-03)
- [ ] Corte do Mundo: comum com HP = 35% do máximo morre (leva o HP restante); com 35% + 1 HP fica de fora; chefe leva
      `round(0,08 × maxHp)`; o chefe com 8% ou menos morre; alvo a 321 px fica de fora (SAN-05)
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the sanctuary trigger and cut rules`

---

#### T18: Cortes do Santuário nos acertos do jogador

**What**: `src/scenes/test/domainPowers.ts` (campo `powers` do `domainDirector`) com `onActivate`, `onStrike(hit)` e
`onTechHit(hit)` (Santuário: `triggers.tryRelease(clockMs)` e, aceito, `pendingCuts++`), `update(dtMs)` (solta os
cortes pendentes: alvos por `sanctuaryTargets`, `Hit` micro com `strength: 'light'`, `force` 0, `direction`
`{x: 0, y: -1}`, `...techMarks('light')` e dano `sanctuaryCutDamage(hpMul)`, `receiveHit`, `effects.onTechConnect` com o
guarda de reentrada ligado, `CutFx.cut` na linha que cruza o alvo e `CutFx.split`, evento `domainCut:<targetId>`),
`reset` e `snapshot()` (`triggersLastSecond`); `const CUT_MID_PX` vira `export const` no `CutFx.ts`; os ganchos do
`domainDirector` (T6, T7) repassam ao `powers`.
**Where**: `src/scenes/test/domainPowers.ts`
**Depends on**: T17
**Reuses**: `CutFx.cut`/`split` (`techFx/CutFx.ts:28`, `:42`), criado na hora com `s.realtimeFx` e `s.fxRegistry`;
`techMarks('light')` (`game/tech/shared.ts:46`) e a composição do `game/tech/cut.ts:50-57`; `MicroBudget` e
`EnemyDefense.receiveBand` (F29)
**Requirement**: SAN-01, SAN-02, SAN-03, SAN-04, DDB-01

**Done when**:

- [ ] `domain.smoke.mjs` (parte 4) com `domain=santuario&charge=100&maxAlive=6`: cada `jab` durante o Domínio dá até 4
      `domainCut:<id>` nos mais próximos; 5 golpes em menos de 1000 ms dão 4 gatilhos (`domain.triggersLastSecond` ≤ 4);
      com `domain=santuario:3`, até 6 alvos e o Domínio dura 8000 ms (SAN-01)
- [ ] O HP do alvo cai `round(6 × hpMul)` por corte, lido no snapshot (L-043); o alvo não entra em `hitstun` pelo
      corte; `damageNumbers.last.kind` é `micro`
- [ ] O corte não muda `charge`, a maestria nem a energia (SAN-04.7); o corte não vira gatilho de outro corte
- [ ] Com o teto do micro cheio, o corte ainda acerta e mostra o número, sem hitstop (edge case)
- [ ] `fx.live` ≤ 40 durante o Santuário Nv 3 com 6 alvos (teto do POW-14)
- [ ] Smokes `impact`, `feel`, `tech`, `power` e `domain` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(scene): release sanctuary cuts on player hits`

---

#### T19: Vinheta do Santuário

**What**: `src/game/DomainFx.ts` com a vinheta (4 retângulos nas bordas da tela, `DOMAIN_FX.vignettePx`, cor `t`, alpha
0,35, na `uiLayer`), fade de 300 ms no relógio próprio, `update(dtMs, view)`, `debug()` (alpha real da vinheta) e
`destroy()`; o `UiSetup.addHud` cria `ui.domainFx` e o destrói no `SHUTDOWN`; o `domainPowers.update` passa a vista.
**Where**: `src/game/DomainFx.ts`
**Depends on**: T18
**Reuses**: `uiLayer` (AD-003); molde de criação e `SHUTDOWN` dos outros objetos do `UiSetup`; `DOMAIN_COLORS`
**Requirement**: SAN-06, DHD-04, DHD-05, DHD-06

**Done when**:

- [ ] `domain.smoke.mjs` (parte 4, vista): durante o Santuário `domainFx.vignette` lido do objeto vivo é 0,35; 300 ms
      depois do fim é 0 (L-076: alpha real, não o pedido)
- [ ] `R` com o Santuário ativo não deixa vinheta órfã (contagem de objetos da `uiLayer` igual à de antes)
- [ ] Conferido no jogo em HD, em movimento e virado para os dois lados (DHD-06)
- [ ] Smokes `hud`, `boot` e `domain` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(fx): add the sanctuary vignette`

---

#### T20: Corte do Mundo no fim do Santuário Nv 3

**What**: `domainPowers.onEnd(byTimer)`: no Santuário Nv 3 pelo tempo, `worldCutHits` com um acerto decisivo por alvo
(comum com o HP restante, chefe com `round(0,08 × maxHp)`, `DOMAIN_HIT` de empurrão), evento `worldCut`; nos outros fins,
nada.
**Where**: `src/scenes/test/domainPowers.ts`
**Depends on**: T18
**Reuses**: `worldCutHits` (T17); `impactTier` com `forced: 'decisive'` (F29); `end(reason)` (T10)
**Requirement**: SAN-05

**Done when**:

- [ ] `domain.smoke.mjs` (parte 4, fim) com `domain=santuario:3&charge=100`: com um comum posto em 35% do HP e outro
      acima, o fim pelo tempo dá `worldCut`, mata o primeiro e não toca o segundo; o Santuário Nv 2 não dá `worldCut`
- [ ] `round=5`: o chefe a até 320 px perde `round(0,08 × maxHp)`; com 8% ou menos morre e a vitória segue o fluxo de
      hoje (edge case)
- [ ] O fim por rodada limpa, morte ou `R` não dá `worldCut` (DOM-10.10)
- [ ] Smokes `boss`, `boss-victory` e `domain` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(scene): run the world cut when the sanctuary ends`

---

### Phase 5: Passo 5 — Jackpot

#### T21: Regras puras do Jackpot

**What**: `src/core/jackpot.ts` com `jackpotChance({ level, strikes, jackpotsWon })`, `JackpotState` (`misses`,
`jackpotsWon`, `phase`, `strikes`, `effectMs`, `startSpin`, `onStrike`, `stop(level, draw)`, `tickEffect(dtMs)`,
`abort`, `endEffect`, `reset`) e `reelFaces(result, misses)`.
**Where**: `src/core/jackpot.ts`
**Depends on**: None
**Reuses**: `JACKPOT` (T1, fase 1)
**Requirement**: JAC-01, JAC-02, JAC-03, JAC-04, JAC-05, JAC-06

**Done when**:

- [ ] `tests/core/jackpot.test.ts` (novo): chance 0,33 com 0 golpes no Nv 1, 0,37 com 1, 0,40 no Nv 2; 7 golpes no Nv 2
      batem no teto de 0,60 e 6 golpes no Nv 1 dão 0,57; Nv 3 com 2 jackpots ganhos soma 0,10, e no Nv 2 não soma; o teto
      vale para a soma (JAC-02)
- [ ] `onStrike` fora do giro não soma; `stop` com `draw` abaixo da chance dá jackpot e igual à chance dá falha (JAC-03)
- [ ] Piedade: com 2 falhas seguidas a 3ª parada é jackpot e `draw` não é chamado (espião); o jackpot zera `misses` e
      soma `jackpotsWon`; `reset` zera os dois (JAC-03.5)
- [ ] `tickEffect`: 40 tiques em 8000 ms de jackpot e 10 em 4000 ms de falha, com o resto guardado entre passos de 16 ms
      (JAC-04, JAC-05)
- [ ] `abort` no giro volta a `idle` sem resultado e sem mudar `misses` (edge case)
- [ ] `reelFaces`: três iguais no jackpot e pelo menos um diferente na falha, sem `Rng` (JAC-06)
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the jackpot reels, riichi and pity rules`

---

#### T22: Modificadores do Domínio para o Jackpot

**What**: `src/core/domainEffects.ts` com `DomainStatMods`, `NEUTRAL_DOMAIN_MODS` e `domainStatMods(active,
jackpotEffect)` na parte do Jackpot (jackpot → `costMul` 0, `cooldownMul` 0, `energyLock`; falha → 0,5 e 0,5; giro e
fora do Jackpot → neutro). A parte da Amplificação entra na T30.
**Where**: `src/core/domainEffects.ts`
**Depends on**: None
**Reuses**: `JACKPOT.miss` (T1, fase 1)
**Requirement**: JAC-04, JAC-05

**Done when**:

- [ ] `tests/core/domainEffects.test.ts` (novo): sem ativo dá `NEUTRAL_DOMAIN_MODS`; Jackpot no giro neutro; jackpot
      0/0 com `energyLock`; falha 0,5/0,5 sem `energyLock`; Santuário neutro
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the domain stat mods for the jackpot`

---

#### T23: Stream do Domínio

**What**: `domainRngValue`, getter `domainRng` e `new Rng(seed ^ <sal>)` no `resolveStart` de `core/run.ts`, com sal
próprio (`0x9b05688c` no design, conferido por `grep`), no mesmo molde da T13.
**Where**: `src/core/run.ts`
**Depends on**: None
**Reuses**: `chestRng` (T13, fase 3)
**Requirement**: JAC-03

**Done when**:

- [ ] `tests/core/domainStreams.test.ts`: `domainRng` determinístico por seed; sorteios nele não deslocam o `shopRng`,
      o `axisRng` nem o `chestRng`
- [ ] `oxlint`: complexidade do `Run.resolveStart` sem subir
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the seeded domain stream`

---

#### T24: Domínio na folha de atributos

**What**: `StatInput.domain?: DomainStatMods` no `core/statSheet.ts` (F29); o `meleeMul(t)` multiplica por
`domain.meleeMul` **por último**; a folha devolve `domainCostMul` e `domainCooldownMul`.
**Where**: `src/core/statSheet.ts`
**Depends on**: T22
**Reuses**: `statSheet` e o teste de equivalência do POW-01 (F29)
**Requirement**: JAC-04, JAC-05, AMP-05

**Done when**:

- [ ] `tests/core/statSheet.test.ts`: sem `domain` e com `NEUTRAL_DOMAIN_MODS` a grade do POW-01 dá o mesmo número com
      `toBe`; com `meleeMul` 1,25 o `meleeMul(t)` sai × 1,25; `domainCostMul`/`domainCooldownMul` 0 no jackpot e 0,5 na
      falha
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): fold the domain mods into the stat sheet`

---

#### T25: Multiplicadores do Domínio no Loadout

**What**: `domainCostMul = 1` e `domainCooldownMul = 1` no `core/loadout.ts`, zerados para 1 no `reset`.
**Where**: `src/core/loadout.ts`
**Depends on**: None
**Reuses**: campos `costMul` e `damageMul` de hoje (`loadout.ts:31-37`, `:123-130`)
**Requirement**: JAC-05

**Done when**:

- [ ] `tests/core/loadout.test.ts`: os dois nascem em 1 e voltam a 1 no `reset` depois de 0,5 (edge case do reset com o
      efeito ligado)
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the domain cost and cooldown multipliers to the loadout`

---

#### T26: Custo sem piso e recarga dentro do Jackpot

**What**: no `core/techStats.ts` (F30), custo = `domainCostMul < 1 ? round(bruto × costMul × domainCostMul) :
max(round(bruto × costMul), ceil(0,6 × base))` (sem o piso do PRC-05 dentro do Jackpot) e recarga =
`round(cooldownMs × domainCooldownMul)`.
**Where**: `src/core/techStats.ts`
**Depends on**: T25
**Reuses**: `resolveTechStats` e o piso do PRC-05 (F30)
**Requirement**: JAC-04, JAC-05

**Done when**:

- [ ] `tests/core/techStats.test.ts` (F30): com 1/1 os números da F30 iguais (equivalência TST-01.6); jackpot custo 0 e
      recarga 0; falha custo `round(bruto × costMul × 0,5)` abaixo do piso de 60% (ex.: Vermelho com "Pacto de sangue") e
      recarga × 0,5; fora do Jackpot o piso volta
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): drop the cost floor inside the jackpot`

---

#### T27: Modificadores do Domínio pelo StatsDirector

**What**: `StatsDirector.sheet()` passa `domain: build.domain.statMods()`; o `sync` grava `loadout.domainCostMul` e
`loadout.domainCooldownMul`; `domainDirector.statMods()` passa a devolver `domainStatMods(active, powers.jackpotEffect)`.
O ramo com o Jackpot ligado é provado no jogo vivo pela T28 (merge forward: não há efeito do Jackpot antes dela).
**Where**: `src/scenes/test/statsDirector.ts`
**Depends on**: T24, T26
**Reuses**: `StatsDirector.sheet`/`sync` (F29)
**Requirement**: JAC-04, JAC-05, AMP-05

**Done when**:

- [ ] `grep` em `src/` mostra o `StatsDirector` como único escritor de `loadout.damageMul`, `loadout.vowDamageMul`,
      `loadout.costMul`, `loadout.domainCostMul`, `loadout.domainCooldownMul`, `player.damageTakenMul` e
      `player.setMaxHp` (AMP-05.2, POW-01)
- [ ] Smokes `power`, `vows`, `shop`, `tech` e `domain` verdes e iguais (Domínio neutro)
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(scene): write the domain mods through the stats director`

---

#### T28: Giro, Riichi e efeito do Jackpot

**What**: no `domainPowers`: `onActivate` do Jackpot → `jackpot.startSpin()` (relógio do giro no `ActiveDomain`);
`onStrike` no giro → `jackpot.onStrike()` (um por `swingId`); `onPhaseEnd()` no giro → `stop(level, () =>
run.domainRng!.next())`, evento `jackpot:hit` ou `jackpot:miss`, no jackpot `loadout.clearCooldown(0)` e `(1)`,
`active.restart(effectMs)`, `stats.sync()`; `update` com o efeito (`energyLock` → `energy.gain(energy.max)` em todo
quadro; `tickEffect` → `player.heal(1)` por tique); `onEnd` → `abort()` no giro ou `endEffect()` e `stats.sync()`;
`snapshot().jackpot`.
**Where**: `src/scenes/test/domainPowers.ts`
**Depends on**: T21, T23, T27
**Reuses**: `energy.gain(energy.max)` e `loadout.clearCooldown(slot)` (`techDirector.ts:41-45`, o laboratório);
`player.heal` (`Player.ts:369`); `JackpotState` (T21)
**Requirement**: JAC-01, JAC-02, JAC-03, JAC-04, JAC-05, DDB-01

**Done when**:

- [ ] `domain.smoke.mjs` (parte 5) com `domain=jackpot&charge=100&tech=vermelho` e uma seed fixa em que o 1º sorteio do
      `domainRng` dá jackpot (o smoke falha com mensagem clara se a seed deixar de servir): `domain.jackpot.spinning` por
      2000 ms de jogo, sem efeito no giro; `chance` sobe 0,04 por golpe que acerta no giro (JAC-01, JAC-02)
- [ ] Depois do `jackpot:hit`, `energy` lida no máximo em todo quadro, a conjuração não gasta e não arma recarga; a vida
      (tirada antes pela tecla `4`) sobe 5 por segundo e para no máximo (JAC-04; edge case da cura no HP cheio)
- [ ] Numa seed de falha, custo × 0,5 abaixo do piso e cura de 2,5 por segundo por 4000 ms; no fim, custo, recarga e
      energia voltam aos do `Loadout` e do `StatsDirector` (JAC-05)
- [ ] Morrer no giro para os tambores sem `jackpot:` e sem mudar `misses`; `R` com o efeito ligado começa com energia,
      custo e recarga de hoje (edge cases)
- [ ] Smokes `tech`, `techniques`, `hud` e `domain` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(scene): spin the jackpot and grant its effect`

---

#### T29: Tambores do Jackpot na tela

**What**: `src/game/JackpotReels.ts` (3 caixas com borda `A`, 3 `Text` com o símbolo, no topo central da `uiLayer`, e o
texto `Riichi NN%`; no giro o símbolo troca pelo relógio de jogo, sem `Rng`; na parada mostra o `reelFaces`); o
`DomainFx` cria os tambores e o `debug().reels` (`spinning`, `faces`, `chance`).
**Where**: `src/game/JackpotReels.ts`
**Depends on**: T28
**Reuses**: `DomainFx` (T19); `reelFaces` (T21); `DOMAIN_COLORS`
**Requirement**: JAC-06, DHD-04, DHD-06

**Done when**:

- [ ] `domain.smoke.mjs` (parte 5, vista): no giro `domainFx.reels.spinning` e o `chance` do texto igual ao do snapshot
      (lido do `Text` vivo, L-076); na parada, três `faces` iguais no `jackpot:hit` e pelo menos uma diferente no
      `jackpot:miss`; os tambores somem no fim do Domínio
- [ ] Conferido no jogo em HD, em movimento e virado para os dois lados (DHD-06)
- [ ] Smokes `hud` e `domain` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(fx): show the jackpot reels`

---

### Phase 6: Passo 6 — Amplificação de Domínio

#### T30: Travas e bônus da Amplificação

**What**: no `core/domainEffects.ts`, a Amplificação ativa dá `techLocked`, `guardPierce`, `nullifyProjectiles` e
`meleeMul` 1,25 só no Nv 3; `rectsOverlap(a, b)` com retângulos pelo centro (convenção do `hurtRect`) e bordas
inclusas.
**Where**: `src/core/domainEffects.ts`
**Depends on**: None
**Reuses**: `domainStatMods` (T22, fase 5); `AMPLIFICATION` (T1)
**Requirement**: AMP-02, AMP-03, AMP-04, AMP-05

**Done when**:

- [ ] `tests/core/domainEffects.test.ts`: Amplificação Nv 1 e Nv 2 com as três travas e `meleeMul` 1; Nv 3 com 1,25;
      Santuário e Jackpot sem trava; `rectsOverlap` com as bordas encostadas (verdadeiro) e 1 px de folga (falso), nos
      dois eixos
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the amplification locks and melee bonus`

---

#### T31: Recusa de conjuração com técnicas travadas

**What**: `DenyReason` ganha `'domain'`; `CastContext.locked?: boolean`; no `CastMachine.request`, depois do slot vazio,
`if (ctx.locked) return [{ type: 'denied', reason: 'domain' }]`.
**Where**: `src/core/cast.ts`
**Depends on**: None
**Reuses**: recusas de hoje (`cast.ts:74-94`)
**Requirement**: AMP-04

**Done when**:

- [ ] `tests/core/cast.test.ts`: com `locked`, recusa `domain` sem gastar energia nem armar recarga; a recusa `domain`
      vem antes de `busy`; slot vazio continua recusando como hoje; sem `locked`, igual a hoje
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): refuse casts while a domain locks techniques`

---

#### T32: Técnicas travadas durante a Amplificação

**What**: campo `locked = false` no `TechCaster`, levado nos dois `CastContext` (`TechCaster.ts:65`, `:86`); o
`domainDirector.update` grava `techCaster.locked = statMods().techLocked` a cada quadro, antes do `techCaster.update`.
**Where**: `src/game/TechCaster.ts`
**Depends on**: T30, T31
**Reuses**: `techDenied:<motivo>` (`TechCaster.ts:108`)
**Requirement**: AMP-04

**Done when**:

- [ ] `domain.smoke.mjs` (parte 6) com `domain=amplificacao&charge=100&tech=corte`: depois do `P`, `L` dá
      `techDenied:domain`, a energia não muda e nenhuma recarga começa; depois do `domainEnd`, `L` conjura de novo
- [ ] Smokes `tech`, `techniques` e `domain` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(scene): lock techniques during the amplification`

---

#### T33: Golpe amplificado atravessa a guarda

**What**: `StrikeMods.marks` (F30) passa a aceitar `'unblockable'`; o `StatsDirector.strikeMods` espalha
`unblockable: true` nas marcas quando `statMods().guardPierce`.
**Where**: `src/scenes/test/statsDirector.ts`
**Depends on**: T30
**Reuses**: `...mods.marks` no `openHitbox` (F30, `strikes.ts`); `enemyGuard.resolveHit` com `unblockable`
(`core/enemyGuard.ts:83-96`)
**Requirement**: AMP-02

**Done when**:

- [ ] `tests/core/statSheet.test.ts`: o tipo das marcas aceita `unblockable` (caso de compilação no teste existente)
- [ ] `domain.smoke.mjs` (parte 6, guarda) com `domain=amplificacao&charge=100&enemyGuard=1`: depois do `P`, o `jab` de
      frente no comum de guarda levantada aplica dano, sem evento `block`, `parry` nem `deflect`; sem o Domínio, o mesmo
      `jab` é bloqueado (os dois lados)
- [ ] Smokes `fight`, `defense`, `enemy-guard` e `domain` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(scene): let amplified strikes pierce the guard`

---

#### T34: Objeto amplificado atravessa a guarda

**What**: `PropDamage.marks?(): Pick<Hit, 'unblockable'>` no `game/Prop.ts` (F29); o golpe do objeto espalha
`...this.damage.marks?.()`; o `StatsDirector.propDamage` implementa `marks()` com o `guardPierce`.
**Where**: `src/game/Prop.ts`
**Depends on**: T33
**Reuses**: `PropDamage` (F29, `Prop.ts:194-195`)
**Requirement**: AMP-02

**Done when**:

- [ ] `domain.smoke.mjs` (parte 6, objeto) com `domain=amplificacao&charge=100&enemyGuard=1` e um objeto na mão: o golpe
      com objeto no comum de guarda levantada aplica dano durante o Domínio e é bloqueado fora dele
- [ ] Smokes `held-item`, `armed` (repetir isolado se cair, ARM-12), `drops` e `domain` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(prop): let amplified prop hits pierce the guard`

---

#### T35: Anulação de projétil pelo golpe amplificado

**What**: `get rect(): Rect | null` no `game/hitbox.ts` (centro e tamanho do sensor aberto) e `get width()` no
`game/Projectile.ts` ao lado do `height`; o `domainPowers.update`, com `nullifyProjectiles`, testa
`rectsOverlap(player.hitbox.rect, projétil)` para cada projétil inimigo vivo e chama `destroyNow()` com o evento
`projectileNullified`.
**Where**: `src/scenes/test/domainPowers.ts`
**Depends on**: T30
**Reuses**: `Projectile.destroyNow` e `height` (`Projectile.ts:86-89`); `hitbox.ts:69-72`; `rectsOverlap` (T30)
**Requirement**: AMP-03

**Done when**:

- [ ] `domain.smoke.mjs` (parte 6, projétil) com `domain=amplificacao&charge=100&round=5`: o player parado socando
      enquanto o chefe dispara; o projétil que cruza a hitbox ativa some com `projectileNullified` e a vida do player
      não cai por ele; sem o Domínio, o mesmo projétil fere
- [ ] Smokes `boss`, `world-boss` e `domain` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(scene): nullify enemy projectiles with amplified strikes`

---

#### T36: Contorno do player na Amplificação

**What**: o `DomainFx` ganha o contorno (`Graphics` no mundo, retângulo de 1 texel em volta do corpo desenhado, cor `C`,
preso a `player.renderPos` em todo quadro, `DOMAIN_FX.outlinePad`) e `debug().outline`; o `domainPowers.onActivate` liga
o contorno na Amplificação e o `onEnd` o apaga.
**Where**: `src/game/DomainFx.ts`
**Depends on**: T30
**Reuses**: `player.renderPos` (AD-019); `DomainFx` (T19); `DOMAIN_COLORS`
**Requirement**: AMP-01, AMP-05, AMP-06, DHD-04, DHD-06

**Done when**:

- [ ] `domain.smoke.mjs` (parte 6, vista): com `domain=amplificacao&charge=100`, o Domínio dura 7000 ms no Nv 1 e 9000
      no Nv 2 (AMP-01); `domainFx.outline` verdadeiro e o centro do contorno igual ao `player.renderPos` com o player
      andando para os dois lados; some no `domainEnd`
- [ ] Com `domain=amplificacao:3`, `stats.meleeMul` lido no snapshot sobe × 1,25 durante o Domínio e volta no fim; no
      Nv 2 não sobe (AMP-05, L-043)
- [ ] Conferido no jogo em HD, em movimento, virado para os dois lados e no golpe (o contorno não fica para trás do
      corpo) (DHD-06)
- [ ] Smokes `player-anim`, `hud` e `domain` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(fx): outline the player during the amplification`

---

### Phase 7: Passo 7 — níveis 2 e 3, regra pura e loja

#### T37: Plano do prêmio do chefe com o Domínio

**What**: `bossPrizePlan({ domainLevel, techTarget }): 'chest' | 'domain' | 'tech'` no fim de `core/bossReward.ts`
(Domínio abaixo do Nv 3 com prêmio de técnica possível → `chest`; abaixo do Nv 3 sem prêmio → `domain`; sem Domínio
(`domainLevel` 0) ou no Nv 3 → `tech`).
**Where**: `src/core/bossReward.ts`
**Depends on**: None
**Reuses**: `bossRewardSlot` (BFX-09)
**Requirement**: DNV-02, DNV-03

**Done when**:

- [ ] `tests/core/bossReward.test.ts`: os três casos, com Nv 1, Nv 2 e Nv 3 nos dois lados do teto, e sem Domínio
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): plan the boss prize with the domain level`

---

#### T38: Elegibilidade e preço do nível do Domínio

**What**: `src/core/domainShop.ts` com `domainShopEligible(level, round)` (Domínio no Nv 1 ou 2 e `round ≥ 8`) e
`domainLevelPrice(level)` = `DOMAIN_SHOP.base + DOMAIN_SHOP.step × (level − 1)`.
**Where**: `src/core/domainShop.ts`
**Depends on**: None
**Reuses**: `DOMAIN_SHOP` (T1)
**Requirement**: DNV-04

**Done when**:

- [ ] `tests/core/domainShop.test.ts` (novo): r7 recusa e r8 aceita; nível 0 (sem Domínio) recusa; Nv 3 recusa; Nv 1 →
      40 e Nv 2 → 50
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the domain shop eligibility and price`

---

#### T39: Entrada do nível do Domínio no catálogo

**What**: `ShopEntryKind` ganha `'domain'` e `ShopEntryId` ganha `'dominio'` em `data/shop.ts`; `DOMAIN_SHOP_ENTRY`
(`rare`, `maxLevel: 3`, `cost: { base: 40, step: 10 }`, `minRound: () => 8`) **no fim** do `GAME_SHOP_CATALOG`.
**Where**: `src/data/shop.ts`
**Depends on**: None
**Reuses**: molde das entradas de hoje (`data/shop.ts:243-248`)
**Requirement**: DNV-04

**Done when**:

- [ ] Teste do catálogo (`tests/core/shop.test.ts` ou o teste de catálogo da F30): `dominio` é a última entrada, `kind`
      `domain`, raridade rara, `maxLevel` 3; a ordem das entradas anteriores igual (o sorteio de hoje não desloca)
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(data): add the domain level shop entry`

---

#### T40: Carta do Domínio só da r8 e abaixo do Nv 3

**What**: no `eligible` do `core/shopEligibility.ts` (F30), `if (entry.kind === 'domain') return !!domain &&
domainShopEligible(domain.level, round)`.
**Where**: `src/core/shopEligibility.ts`
**Depends on**: T38, T39
**Reuses**: `eligible` (F30)
**Requirement**: DNV-04

**Done when**:

- [ ] `tests/core/shopEligibility.test.ts` (F30): `dominio` recusado na r7 e aceito na r8 com Domínio no Nv 1; recusado
      sem Domínio e no Nv 3 (DNV-04.8)
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): gate the domain card by round and level`

---

#### T41: Preço da carta do Domínio com a inflação

**What**: no `cardCost` do `core/shopPricing.ts` (F30), `domain` → `inflate(domainLevelPrice(level), round)`.
**Where**: `src/core/shopPricing.ts`
**Depends on**: T38, T39
**Reuses**: `inflate` (PRC-03, F30)
**Requirement**: DNV-04

**Done when**:

- [ ] `tests/core/shopPricing.test.ts` (F30): na r8, `round(40 × 1,42)` = 57 no Nv 1 → 2 e `round(50 × 1,42)` = 71 no
      Nv 2 → 3
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): price the domain card with inflation`

---

#### T42: Prévia do nível do Domínio na carta

**What**: no `previewText` do `core/shopPreview.ts` (F30), `domain` → `Nv N → N+1`.
**Where**: `src/core/shopPreview.ts`
**Depends on**: T39
**Reuses**: `previewText` (F30)
**Requirement**: DNV-05

**Done when**:

- [ ] `tests/core/shopPreview.test.ts` (F30): `Nv 1 → 2` e `Nv 2 → 3`
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): preview the domain level on the card`

---

#### T43: Carta do Domínio fora das cartas 0 e 1

**What**: no `drawCards` do `core/shopDraw.ts` (F30), o pool das cartas 0 e 1 sai sem `kind === 'domain'`; as cartas 2 e
3 usam o pool inteiro.
**Where**: `src/core/shopDraw.ts`
**Depends on**: T39
**Reuses**: `drawCards` e o sorteio ponderado (F30)
**Requirement**: DNV-04

**Done when**:

- [ ] `tests/core/shopDraw.test.ts` (F30): em 1000 seeds com o Domínio elegível, as cartas 0 e 1 nunca são `dominio` e
      as cartas 2 ou 3 são `dominio` em pelo menos uma seed; sem o Domínio elegível, o sorteio da F30 igual
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): keep the domain card off the first two slots`

---

#### T44: Loja vende nível do Domínio

**What**: o construtor do `Shop` (`core/shop.ts`) recebe `domain?: { readonly level: number }`; `levelOf('dominio')` lê
o nível; `applyEntry` do `kind` `domain` chama `ctx.applyDomain?.()` na ordem "checar → gastar → aplicar"; o Domínio não
entra na conta do pool nem no acréscimo de +8 (DNV-05.10).
**Where**: `src/core/shop.ts`
**Depends on**: T40, T41, T42, T43
**Reuses**: `Shop.buy` e o `BuyContext` (F30)
**Requirement**: DNV-01, DNV-05

**Done when**:

- [ ] `tests/core/shop.test.ts` (ou o teste de compra da F30): comprar `dominio` com saldo chama `applyDomain` uma vez e
      gasta o preço; sem saldo nada muda (`buyRefused:dominio:funds`); no Nv 3 a carta não aparece; o preço das outras
      cartas não muda com o Domínio
- [ ] `core/shop.ts` abaixo de 400 linhas efetivas
- [ ] Gate verde; contagem de testes sem perda

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): sell domain levels in the shop`

---

### Phase 8: Passo 7 — níveis no jogo e fechamento

#### T45: Alvo do prêmio do chefe separado do upgrade

**What**: `runDirector.bossRewardTarget(): { id; nextLevel } | null` (o pedaço sem efeito do `bossRewardUpgrade`, com a
regra da F30 no Vermelho), e o `bossRewardUpgrade` passa a usá-lo; comportamento igual.
**Where**: `src/scenes/test/runDirector.ts`
**Depends on**: None
**Reuses**: `bossRewardUpgrade` (`runDirector.ts:200-207`); `bossRewardSlot`
**Requirement**: DNV-02

**Done when**:

- [ ] Smokes `boss-victory`, `boss`, `run-loop` e `world-boss` verdes e iguais (refatoração)
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(scene): split the boss reward target from its upgrade`

---

#### T46: Nível do Domínio no baú do chefe

**What**: `domainDirector.bossPrize(): string | null` (`bossPrizePlan` com `runDirector.bossRewardTarget()`: `chest` arma
`bossChestPending` e devolve `null`; `domain` sobe e devolve `"Domínio Nv N!"`; `tech` devolve o `bossRewardUpgrade()`
de hoje); o `spawner` troca a expressão do `upgradeText` (`spawner.ts:168`) por `build.domain.bossPrize()`; o
`choicePages()` põe a página `bauChefe` antes da `veu` (A = "Domínio Nv N+1", B = o prêmio de técnica adiado) e o
`confirm('bauChefe')` aplica só a opção escolhida com `bossChest:domain` ou `bossChest:tech` (o `tech` com o banner de
hoje); o `reset()` larga o prêmio adiado.
**Where**: `src/scenes/test/domainDirector.ts`
**Depends on**: T45
**Reuses**: `bossPrizePlan` (T37); `clearedBanner.upgradeText` (BFX-10, `spawner.ts:166-170`); `choicePages`/`confirm`
(T16)
**Requirement**: DNV-01, DNV-02, DNV-03, DDB-01

**Done when**:

- [ ] `domain.smoke.mjs` (parte 7) com `domain=santuario&round=5&tech=vermelho`: a vitória sobre o chefe não mostra o
      banner do prêmio de técnica e a konbini abre `choice.page.item === 'bauChefe'`; `Enter` dá `bossChest:domain` e
      `domain.owned.level` 2; numa run igual, `D` e `Enter` dão `bossChest:tech` e o nível da técnica sobe
      (DNV-02)
- [ ] Sem prêmio de técnica possível (técnicas no teto), a vitória sobe o Domínio na hora com o banner "Domínio Nv 2!";
      sem Domínio ou no Nv 3, o BFX-09 e o banner do BFX-10 iguais a hoje (DNV-03)
- [ ] `R` com o prêmio adiado começa a run sem a página `bauChefe`; com `bauChefe` e `veu` pendentes (debug), `bauChefe`
      vem primeiro (edge cases)
- [ ] Passando de 380 linhas efetivas, este cenário sai para `scripts/smoke/domain-levels.smoke.mjs`
- [ ] Smokes `boss-victory`, `world-boss`, `shop` e `domain` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(scene): offer the domain level in the boss chest`

---

#### T47: Compra do nível do Domínio da r8 em diante

**What**: `domainDirector.shopLevel` (`{ level }` com 0 sem Domínio) e `raiseFromShop()`; o `shopDirector` passa
`build.domain.shopLevel` ao `new Shop(...)` e `applyDomain: () => build.domain.raiseFromShop()` no `BuyContext`.
**Where**: `src/scenes/test/shopDirector.ts`
**Depends on**: None
**Reuses**: `Shop` com `domain` (T44, fase 7); `BuyContext` (F30)
**Requirement**: DNV-04, DNV-05

**Done when**:

- [ ] `domain.smoke.mjs` (parte 7, loja) com `domain=santuario&round=8&fragments=200` e uma seed em que a carta 2 ou 3 é
      `dominio`: a prévia lê `Nv 1 → 2`, o preço é 57 e a compra dá `buy:dominio:57` e `domain.owned.level` 2 (DNV-05);
      com `round=7` a carta nunca aparece nas seeds testadas
- [ ] Smokes `shop`, `shop-progress`, `shop-axes` (F30) e `domain` verdes
- [ ] Gate verde; contagem de testes sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(shop): buy domain levels from round eight`

---

#### T48: README do Domínio

**What**: o `README.md` documenta `domain=<id>[:<nível>]`, `charge=<n>`, as teclas `P`/`N` e os eventos de debug novos
(`domain:`, `domainDenied:`, `domainEnd:`, `domainCut:`, `worldCut`, `jackpot:`, `veil:`, `bossChest:`,
`projectileNullified`, `techDenied:domain`), e onde ajustar os números (`data/domains.ts`).
**Where**: `README.md`
**Depends on**: T46, T47
**Reuses**: tabelas de parâmetros e de teclas de hoje
**Requirement**: DDB-03

**Done when**:

- [ ] Toda chave, parâmetro e evento da lista aparece no `README.md`, cada um com uma linha do que faz
- [ ] Gate verde (build gate); smokes da fase 8 verdes; `TestScene` com as mesmas linhas efetivas do começo da F31
      (DOM-11)

**Tests**: none
**Gate**: build
**Commit**: `docs(readme): document the domain keys, params and events`

---

## Requirement Coverage

| Requirement | Tasks |
| --- | --- |
| DOM-01 | T2 |
| DOM-02 | T1, T2, T6, T7 |
| DOM-03 | T2, T8 |
| DOM-04 | T2 |
| DOM-05 | T2, T5, T8 |
| DOM-06 | T4, T8 |
| DOM-07 | T4, T8 |
| DOM-08 | T4, T9 |
| DOM-09 | T9 |
| DOM-10 | T4, T8, T10 |
| DOM-11 | T8, T48 (e nenhuma outra tarefa soma linha na `TestScene`) |
| VEU-01 | T15 |
| VEU-02 | T12, T13, T14, T16 |
| VEU-03 | T16 |
| VEU-04 | T2, T15, T16 |
| SAN-01 | T1, T4, T18 |
| SAN-02 | T17, T18 |
| SAN-03 | T17, T18 |
| SAN-04 | T18 |
| SAN-05 | T17, T20 |
| SAN-06 | T19 |
| JAC-01 | T21, T28 |
| JAC-02 | T21, T28 |
| JAC-03 | T21, T23, T28 |
| JAC-04 | T21, T22, T24, T26, T27, T28 |
| JAC-05 | T21, T22, T24, T25, T26, T27, T28 |
| JAC-06 | T21, T29 |
| AMP-01 | T1, T4, T36 |
| AMP-02 | T30, T33, T34 |
| AMP-03 | T30, T35 |
| AMP-04 | T30, T31, T32 |
| AMP-05 | T24, T27, T30, T36 |
| AMP-06 | T36 |
| DNV-01 | T2, T44, T46 |
| DNV-02 | T37, T45, T46 |
| DNV-03 | T37, T46 |
| DNV-04 | T38, T39, T40, T41, T43, T47 |
| DNV-05 | T42, T44, T47 |
| DHD-01 | T2, T11 |
| DHD-02 | T2, T11 |
| DHD-03 | T2, T11 |
| DHD-04 | T1, T19, T29, T36 |
| DHD-05 | T19 |
| DHD-06 | T11, T19, T29, T36 |
| DDB-01 | T5, T11, T14, T15, T18, T28, T46 |
| DDB-02 | T3, T5 |
| DDB-03 | T48 |

**Coverage:** 47 total, 47 mapeados, 0 sem tarefa.

| Edge case (spec) | Task |
| --- | --- |
| `P` e `N` no mesmo quadro | T8 |
| Ativação mata o comum com 40% ou menos e a morte não carrega | T9 |
| Ativação mata o último inimigo e a rodada limpa termina o Domínio | T10 |
| Corte do Santuário com o teto do micro cheio | T18 |
| Gatilho do Santuário sem alvo conta para os 4 por segundo | T17 |
| Morte no giro do Jackpot | T21, T28 |
| Run nova com o efeito do Jackpot ligado | T25, T28 |
| Cura do jackpot no HP cheio | T28 |
| Conjuração ativa e `P` na Amplificação (`domainDenied:busy`) | T4, T8 |
| Corte do Mundo com o chefe em 8% ou menos | T17, T20 |
| Prêmio do chefe adiado e run acaba antes da konbini | T46 |
| `bauChefe` e `veu` pendentes ao mesmo tempo | T46 |
| Comum depois da r34 mantém as frações da ativação | T4 |

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8

Phase 1:  T1, T2, T3, T4
Phase 2:  T5, T6, T7, T8, T9, T10, T11
Phase 3:  T12, T13, T14, T15, T16
Phase 4:  T17, T18, T19, T20
Phase 5:  T21, T22, T23, T24, T25, T26, T27, T28, T29
Phase 6:  T30, T31, T32, T33, T34, T35, T36
Phase 7:  T37, T38, T39, T40, T41, T42, T43, T44
Phase 8:  T45, T46, T47, T48
```

Ordem de execução estritamente sequencial (a linha acima é a ordem de trabalho, não dependência). 48 tarefas,
empacotadas em lotes de fases inteiras (~7 por agente): Fase 1 (4), Fase 2 (7), Fases 3+4 (9), Fase 5 (9), Fase 6 (7),
Fase 7 (8), Fase 8 (4). Agente novo por lote (memória "Agente novo por lote"). Os lotes com vista (Fases 2, 3+4, 5 e 6)
vão em Opus 5.5 ou Fable, nunca Sonnet; as Fases 1 e 7 são regra pura e podem ir num modelo mais leve, com revisão no
forte. As Fases 1, 2 e 4 só dependem da F29: se a ordem de merge pedir, começam antes do fim da F30 (design, "Risks").

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1, T39 | 1 tabela de dados | ✅ |
| T2, T4, T17, T21 | 1 módulo puro | ✅ |
| T3, T12, T38 | 1 módulo puro pequeno (1 ou 2 funções) | ✅ |
| T5 | 1 diretor novo + o tipo do snapshot e as ligações mínimas para ele ser lido (campo, reset, debug) | ⚠️ coeso: sem as ligações o diretor não tem prova (L-076) |
| T6, T7 | 1 grupo de ganchos no diretor + uma linha em cada chamador | ⚠️ coeso: o gancho sem o chamador não é exercitado |
| T8 | 1 método (`update` e `tryActivate`) + o campo do input que ele lê | ⚠️ coeso: a tecla sem o laço não faz nada, e o tipo do `InputSnapshot` obriga o `NEUTRAL_INPUT` |
| T9, T10, T20 | 1 método do diretor | ✅ |
| T11 | 1 vista + a ligação no `EnergyHud` e no `UiSetup` | ⚠️ coeso: sem a ligação a vista não tem prova |
| T13, T23 | 1 stream | ✅ |
| T14 | 1 tipo ampliado | ✅ |
| T15 | 1 método | ✅ |
| T16 | 1 página + o despacho no `shopDirector` | ⚠️ coeso |
| T18 | 1 ajudante novo (Santuário) + `export` de uma constante | ✅ |
| T19, T29, T36 | 1 vista | ✅ |
| T22, T30 | 1 função pura (parte de cada Domínio) | ✅ |
| T24, T25, T26, T31 | 1 mudança num módulo puro | ✅ |
| T27 | 1 repasse no agregador | ✅ |
| T28 | 1 parte do ajudante (Jackpot) | ✅ |
| T32 | 1 campo + a escrita por quadro | ✅ |
| T33, T34 | 1 marca no golpe / no objeto | ✅ |
| T35 | 1 parte do ajudante + 2 getters que ela lê | ⚠️ coeso: os getters não têm outro leitor |
| T37, T40, T41, T42, T43 | 1 função | ✅ |
| T44 | 1 classe (3 pontos do `Shop`) | ✅ |
| T45 | 1 extração (refatoração) | ✅ |
| T46 | 1 prêmio + a página que ele abre | ⚠️ coeso: a pendência sem a página não tem prova |
| T47 | 1 ligação da loja | ✅ |
| T48 | 1 documento | ✅ |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | — | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T1 | T1 → T3 | ✅ Match |
| T4 | T2 | T2 → T4 | ✅ Match |
| T5 | T2, T3 (fase 1) | — (fase anterior) | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |
| T7 | T5 | T5 → T7 | ✅ Match |
| T8 | T5 | T5 → T8 | ✅ Match |
| T9 | T8 | T8 → T9 | ✅ Match |
| T10 | T8 | T8 → T10 | ✅ Match |
| T11 | T5, T8 | T5 → T11, T8 → T11 | ✅ Match |
| T12 | T1 (fase 1) | — (fase anterior) | ✅ Match |
| T13 | None | — | ✅ Match |
| T14 | None | — | ✅ Match |
| T15 | T10 (fase 2), T12, T13 | T12 → T15, T13 → T15 | ✅ Match |
| T16 | T14, T15 | T14 → T16, T15 → T16 | ✅ Match |
| T17 | T1, T4 (fase 1) | — (fase anterior) | ✅ Match |
| T18 | T17 | T17 → T18 | ✅ Match |
| T19 | T18 | T18 → T19 | ✅ Match |
| T20 | T18 | T18 → T20 | ✅ Match |
| T21 | None | — | ✅ Match |
| T22 | None | — | ✅ Match |
| T23 | None | — | ✅ Match |
| T24 | T22 | T22 → T24 | ✅ Match |
| T25 | None | — | ✅ Match |
| T26 | T25 | T25 → T26 | ✅ Match |
| T27 | T24, T26 | T24 → T27, T26 → T27 | ✅ Match |
| T28 | T21, T23, T27 | T21 → T28, T23 → T28, T27 → T28 | ✅ Match |
| T29 | T28 | T28 → T29 | ✅ Match |
| T30 | None | — | ✅ Match |
| T31 | None | — | ✅ Match |
| T32 | T30, T31 | T30 → T32, T31 → T32 | ✅ Match |
| T33 | T30 | T30 → T33 | ✅ Match |
| T34 | T33 | T33 → T34 | ✅ Match |
| T35 | T30 | T30 → T35 | ✅ Match |
| T36 | T30 | T30 → T36 | ✅ Match |
| T37 | None | — | ✅ Match |
| T38 | None | — | ✅ Match |
| T39 | None | — | ✅ Match |
| T40 | T38, T39 | T38 → T40, T39 → T40 | ✅ Match |
| T41 | T38, T39 | T38 → T41, T39 → T41 | ✅ Match |
| T42 | T39 | T39 → T42 | ✅ Match |
| T43 | T39 | T39 → T43 | ✅ Match |
| T44 | T40, T41, T42, T43 | T40/T41/T42/T43 → T44 | ✅ Match |
| T45 | None | — | ✅ Match |
| T46 | T45 | T45 → T46 | ✅ Match |
| T47 | None | — | ✅ Match |
| T48 | T46, T47 | T46 → T48, T47 → T48 | ✅ Match |

Nenhuma dependência aponta para fase posterior. As dependências de fase anterior que não aparecem no corpo (ex.: T18
usa os ganchos da T6/T7 e a ativação da T9; T21 usa o `JACKPOT` da T1) são garantidas pela ordem das fases.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Números de ajuste | unit | unit | ✅ OK |
| T2 | Regra pura | unit | unit | ✅ OK |
| T3 | Regra pura | unit | unit | ✅ OK |
| T4 | Regra pura | unit | unit | ✅ OK |
| T5 | Adaptadores + tipo de snapshot | smoke (+ unit do literal) | smoke | ✅ OK |
| T6 | Adaptadores | smoke | smoke | ✅ OK |
| T7 | Adaptadores | smoke | smoke | ✅ OK |
| T8 | Adaptadores (input, diretor) | smoke | smoke | ✅ OK |
| T9 | Adaptador | smoke | smoke | ✅ OK |
| T10 | Adaptadores | smoke | smoke | ✅ OK |
| T11 | Adaptadores (vista com motor) + tipo de snapshot | smoke (+ unit do literal) | smoke | ✅ OK |
| T12 | Regra pura | unit | unit | ✅ OK |
| T13 | Regra pura | unit | unit | ✅ OK |
| T14 | Vista testável sem motor | unit | unit | ✅ OK |
| T15 | Adaptador | smoke | smoke | ✅ OK |
| T16 | Adaptadores | smoke | smoke | ✅ OK |
| T17 | Regra pura | unit | unit | ✅ OK |
| T18 | Adaptadores | smoke | smoke | ✅ OK |
| T19 | Adaptadores (vista com motor) | smoke | smoke | ✅ OK |
| T20 | Adaptador | smoke | smoke | ✅ OK |
| T21 | Regra pura | unit | unit | ✅ OK |
| T22 | Regra pura | unit | unit | ✅ OK |
| T23 | Regra pura | unit | unit | ✅ OK |
| T24 | Regra pura | unit | unit | ✅ OK |
| T25 | Regra pura | unit | unit | ✅ OK |
| T26 | Regra pura | unit | unit | ✅ OK |
| T27 | Adaptador | smoke | smoke | ✅ OK |
| T28 | Adaptador | smoke | smoke | ✅ OK |
| T29 | Adaptadores (vista com motor) | smoke | smoke | ✅ OK |
| T30 | Regra pura | unit | unit | ✅ OK |
| T31 | Regra pura | unit | unit | ✅ OK |
| T32 | Adaptadores | smoke | smoke | ✅ OK |
| T33 | Regra pura (tipo) + adaptador | smoke (o mais alto) | smoke | ✅ OK |
| T34 | Adaptadores | smoke | smoke | ✅ OK |
| T35 | Adaptadores | smoke | smoke | ✅ OK |
| T36 | Adaptadores (vista com motor) | smoke | smoke | ✅ OK |
| T37 | Regra pura | unit | unit | ✅ OK |
| T38 | Regra pura | unit | unit | ✅ OK |
| T39 | Números de ajuste | unit | unit | ✅ OK |
| T40 | Regra pura | unit | unit | ✅ OK |
| T41 | Regra pura | unit | unit | ✅ OK |
| T42 | Regra pura | unit | unit | ✅ OK |
| T43 | Regra pura | unit | unit | ✅ OK |
| T44 | Regra pura | unit | unit | ✅ OK |
| T45 | Adaptador | smoke | smoke | ✅ OK |
| T46 | Adaptadores | smoke | smoke | ✅ OK |
| T47 | Adaptador | smoke | smoke | ✅ OK |
| T48 | Documentação | none | none | ✅ OK |

A T27 entrega o repasse com o Domínio neutro; o ramo com o Jackpot ligado é medido no jogo vivo pela T28, na mesma fase
e no mesmo lote (merge forward, como a T6/T8 da F29). Nenhuma tarefa adia teste para outra.
