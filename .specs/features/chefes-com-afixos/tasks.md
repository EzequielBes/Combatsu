# Chefes com afixos — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/chefes-com-afixos/spec.md`
**Design**: `.specs/features/chefes-com-afixos/design.md`
**Plano**: `docs/plano-builds-e-habilidades.md` (5.8, linha F32)
**Status**: Draft
**Branch**: `feat/chefes-com-afixos` (a partir de `4c0efae`)
**Modelos**: regra pura (fases 2, 4 e 5) pode ir para um executor mais barato; adaptadores com arte em código
(contorno, feixe, fios, lava, roda, glifos) e o Verifier em Opus 5.5 (memória: "Delegar o leve, qualidade no forte").

---

## Test Coverage Matrix

> Guidelines: `CLAUDE.md` (camadas, smoke só do que foi tocado, smoke novo em `hd=1`), `.oxlintrc.json` (400 linhas
> efetivas, 80 por função, complexidade 15; arquivo novo nunca entra nas exceções), `vitest.config.ts`; lições L-010
> (limiar testado dos dois lados) e L-043 (testar o adaptador que repassa o número ao motor, pelo snapshot).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Regra pura (`src/core/**`) | unit | 1:1 com os ACs; todo limiar nos dois lados (L-010); edge cases da spec com teste próprio | `tests/core/*.test.ts` (arquivos novos; `bossBrain.test.ts` e `bossAI.test.ts` não crescem) | `npm test` |
| Dados (`src/data/**`) | unit | Toda chave de cor existe na `PALETTE` (BRD-07); números e nomes da spec | `tests/data/*.test.ts` | `npm test` |
| Adaptadores (`src/game/**`, `src/scenes/**`) | smoke | Efeito lido do jogo vivo pelo snapshot (L-043): dano, contagem, escala, texto | `scripts/smoke/boss-*.smoke.mjs` (`hd=1&area=modular`) | `npm run smoke -- <nome>` |
| Smokes antigos e README | none | build gate e o próprio smoke tocado verde | - | `npm run gate` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tasks só de regra pura ou dados | `npm run gate` |
| Full | Tasks de adaptador e de refatoração | `npm run gate && npm run smoke -- <smoke da task>` |
| Build | Tasks sem código de jogo (smokes antigos, README) | `npm run gate` |

Base: 2913 testes unitários em 146 arquivos em `4c0efae`; nenhuma task deixa o número cair sem dizer por quê.
Smokes instáveis conhecidos: `armed` (ARM-12) e timeouts sob carga (há outras frentes rodando smokes nesta máquina):
repetir isolado antes de suspeitar. `boss.smoke` mede "investida → rajada → salto" na fase 2: se a Investida Dupla
mudar o tempo, ajustar a espera, nunca o que ele mede.

---

## Execution Plan

Fases em sequência; dentro de cada fase, tarefas em ordem. Refatorações primeiro, com os smokes iguais antes e depois.

### Phase 1: Refatorações sem mudança de comportamento

```
T1 → T2 → T3 → T4 → T5
```

### Phase 2: Regra pura da escalação

```
T6 → T7 → T8 → T9 → T10 → T11
```

### Phase 3: Escalação e leitura na cena

```
T12 → T13 → T14
```

### Phase 4: Regra pura dos ciclos e ataques novos

```
T15 → T16 → T17 → T18 → T19 → T20
```

### Phase 5: Regra pura dos afixos

```
T21 → T22 → T23 → T24
```

### Phase 6: Chefe no motor (ataques novos e Portador)

```
T25 → T26 → T27
```

### Phase 7: Afixos no motor

```
T28 → T29 → T30 → T31 → T32 → T33
```

---

## Task Breakdown

### T1: Smokes antigos de chefe com o chefe fixado

**What**: Acrescentar `bossArch=oni&bossAffix=none&finger=0` (ou `bossArch=tecela` onde hoje se espera a Tecelã, r15)
às URLs de `boss.smoke.mjs:6,250,365`, `boss-prop.smoke.mjs:5`, `boss-punish.smoke.mjs:28`, `boss-victory.smoke.mjs:3`
e `world-boss.smoke.mjs:6,134`. Os parâmetros ainda não existem e são ignorados: nada muda hoje, e os cenários ficam
prontos para quando o sorteio entrar (T12).
**Where**: `scripts/smoke/boss.smoke.mjs`
**Depends on**: None
**Reuses**: padrão de `?debug&enemyVariant=` (EVR-04)
**Requirement**: BLN-09 (preparação; cenários de spec "Smokes antigos de chefe")

**Done when**:

- [x] As 8 URLs listadas levam os 3 parâmetros; nenhuma asserção muda
- [x] `npm run smoke -- boss` e `npm run smoke -- world-boss` verdes (iguais a antes)
- [x] Gate verde

**Tests**: none
**Gate**: build
**Commit**: `test(smoke): pin the boss archetype and affixes in the boss smokes`

---

### T2: `Boss.dispatch` para os eventos do cérebro

**What**: Os três laços iguais que repassam eventos do `BossBrain` em `Boss.ts` (linhas 163-210) viram um método
privado `dispatch(events)`; comportamento idêntico.
**Where**: `src/game/Boss.ts`
**Depends on**: T1
**Reuses**: laços de hoje
**Requirement**: AFX-01 (preparação; design "game/Boss.ts só delega")

**Done when**:

- [x] `Boss.ts` com menos linhas efetivas do que as 276 de hoje
- [x] `npm run smoke -- boss` verde (igual a antes)
- [x] Gate verde, contagem de testes igual

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(boss): route the brain events through one dispatch`

---

### T3: Medidas do corpo do chefe por instância

**What**: `BODY_W`/`BODY_H` (linhas 16-17) viram `w`/`h` da instância em todos os ~14 usos, ainda com escala 1;
o sprite passa a usar uma `spriteScale` (hoje 1) em `animate` (`setScale(facing × s, s)`).
**Where**: `src/game/Boss.ts`
**Depends on**: T2
**Reuses**: busca de `BODY_W`/`BODY_H` no arquivo
**Requirement**: PDD-03 (preparação)

**Done when**:

- [x] Nenhum uso de `BODY_W`/`BODY_H` fora do construtor
- [x] `npm run smoke -- boss` e `npm run smoke -- boss-prop` verdes (iguais a antes)
- [x] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(boss): size the boss body per instance`

---

### T4: `wireEnemy` no spawner

**What**: O bloco de ligação do inimigo em `spawner.ts` (linhas 89-103) sai para `wireEnemy(enemy, spawnAt)`, usado por
`spawnFromCommand`; comportamento idêntico (base do `spawnSummoned` da T31).
**Where**: `src/scenes/test/spawner.ts`
**Depends on**: T3
**Reuses**: bloco de hoje
**Requirement**: INV-05 (preparação)

**Done when**:

- [x] `npm run smoke -- spawn-pressure` e `npm run smoke -- run-loop` verdes (iguais a antes)
- [x] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(spawner): extract the enemy wiring`

---

### T5: Ciclos do `BossAI` vindos da tuning

**What**: A constante `CYCLES` (`core/bossAI.ts:45`) sai; `BossAITuning` ganha `cycles` e `step`/`enterRestAfterAttack`
leem `this.t.cycles`; `BOSS.cycles` em `data/tuning.ts` guarda os ciclos de hoje, base do `new BossAI()` sem argumento.
**Where**: `src/core/bossAI.ts`
**Depends on**: T4
**Reuses**: `BOSS` (`data/tuning.ts:330-379`)
**Requirement**: CYC-01

**Done when**:

- [x] `tests/core/bossAI.test.ts` passa sem mudança
- [x] `npm run smoke -- boss` verde (igual a antes)
- [x] Gate verde, contagem de testes igual

**Tests**: unit
**Gate**: full
**Commit**: `refactor(boss-ai): read the attack cycles from the tuning`

---

### T6: Dados dos afixos

**What**: `src/data/bossAffixes.ts`: `BossAffixId`, `BOSS_AFFIX_IDS`, `BOSS_AFFIXES` (nomes m/f, leve, contorno, glifo), `AFFIX_RULES`
(`countByTier`, `incompatible: []`, `lightPool`), números em `BOSS_AFFIX`: `lava`, `summon`, `beam`, `adapt`, `finger`,
`outlineSwapMs` e `adaptLabels`, como no design.
**Where**: `src/data/bossAffixes.ts`
**Depends on**: None (fase anterior concluída)
**Reuses**: `PALETTE_KEYS` de `art/palette.ts` (no teste; não existe tipo `PaletteKey`, as cores são `string`)
**Requirement**: AFX-02, BRD-07

**Done when**:

- [x] `tests/data/bossAffixes.test.ts`: toda chave de cor existe na `PALETTE`; nomes nas duas formas; leves = Ígneo e
      Invocador; incompatíveis vazia; números da spec (2000/600/4, 3/2/4, 800/250/16, 20000/5/2/10000/0,5, Portador)
- [x] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(data): add the boss affix table`

---

### T7: Stream `bossAffixRng` na run

**What**: `bossAffixRngValue` + getter `bossAffixRng` + `new Rng(seed ^ 0x9b05688c)` em `resolveStart`
(`core/run.ts:59-68,132-179,297-307`).
**Where**: `src/core/run.ts`
**Depends on**: T6
**Reuses**: streams com salt de `run.ts`
**Requirement**: BLN-01

**Done when**:

- [x] `tests/core/bossAffix.test.ts` (novo): sequência de `run.bossAffixRng` igual a `new Rng(seed ^ 0x9b05688c)`;
      run nova cria outro objeto `Rng`; salt diferente dos 10 existentes
- [x] `tests/core/run.test.ts` intacto; gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(run): add the boss affix stream`

---

### T8: Sorteio e cache da escalação

**What**: Em `src/core/bossAffix.ts` (novo): `BossLineup`, `drawLineup(rng, round, rules)` (arquétipo 50/50, vagas pelo
tier, r5 só leves, sem repetidos nem par incompatível, Portador com `next() < p` sempre consumido) e `BossLineups`
(cache por rodada que zera quando o `Rng` muda).
**Where**: `src/core/bossAffix.ts`; testes em `tests/core/bossLineup.test.ts` (novo)
**Depends on**: T7
**Reuses**: `Rng.next`, `Rng.int`, `tierFor`
**Requirement**: BLN-02, BLN-03, BLN-04, BLN-05, BLN-06, BLN-07, PDD-01, PDD-02

**Done when**:

- [x] Testes (`tests/core/bossLineup.test.ts`): seeds 1..50 na r5 dão os 2 arquétipos e os 2 leves, sempre 1 afixo; contagem em r5/r10/r15/r20/r25;
      par incompatível injetado nunca sai; pedir a mesma rodada 2 vezes não consome; mesma seed dá a mesma escalação;
      Portador nunca na r5, sai na r10 com alguma seed; consumo do stream igual na r5 e na r10; 20 seeds seguidas
      cobrem arquétipos e leves (Success Criteria 1)
- [x] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): draw the boss lineup from the seed`

---

### T9: Overrides de debug da escalação

**What**: `LineupOverrides`, `parseBossArch`, `parseBossAffixes` (`none` → `[]`; id desconhecido invalida o valor
inteiro), `parseFinger` e `applyOverrides`; `BossLineups.lineupFor(rng, round, overrides)` aplica sobre cópia.
**Where**: `src/core/bossAffix.ts`
**Depends on**: T8
**Reuses**: `parseVariant` (`core/enemyVariant.ts:13`) como molde
**Requirement**: BLN-09, BLN-10

**Done when**:

- [ ] Testes: consumo do stream igual com e sem override (próximo `next()` igual); valor inválido ignorado; `none`
      dá lista vazia; `finger=1` antes da r10 vale (é debug)
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): apply the boss debug overrides without moving the stream`

---

### T10: `bossSpecFor` com escalação e Portador

**What**: `bossSpecFor(round, lineup?)`: com escalação, arquétipo dela; `BossSpec` ganha `affixes`, `finger`,
`bodyScale`, `damage.lava`, `damage.beam`; Portador com vida × 1,3 e cada dano `round(base × multTier × 1,5)`, rajada
+ 1. Sem escalação, segue a paridade de hoje (os chamadores mudam na T12).
**Where**: `src/core/bossTier.ts`
**Depends on**: T9
**Reuses**: `bossHpFor`, `bossDamageMultFor`
**Requirement**: PDD-03, PDD-04, PDD-05, IGN-03, SNG-03 (números)

**Done when**:

- [ ] `tests/core/bossTier.test.ts`: arquétipo da escalação; Portador na r10 com vida e danos esperados (um
      arredondamento só) e rajada + 1; `bodyScale` 1 e 1,25; lava `round(4 × mult)` e feixe `round(16 × mult)` por tier;
      lava do Portador × 1,5 (edge case)
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): build the boss spec from the lineup`

---

### T11: Rótulos, glifos e contorno (regra)

**What**: Em `core/bossAffix.ts`: `affixName(id, archetype)`, `bossBarLabel(spec)`, `announceText(lineup)`,
`glyphKeys(spec)` e `outlineKeyAt(affixes, ms)`.
**Where**: `src/core/bossAffix.ts`
**Depends on**: T10
**Reuses**: `BOSS.archetypes` (nome inteiro), `BOSS_AFFIXES`
**Requirement**: BRD-01, BRD-02, BRD-03, BRD-04

**Done when**:

- [ ] Testes: "Tecelã · Adaptativa · Portadora de Dedo" e forma masculina do Oni; sem afixo = só o nome; aviso com nome
      curto; glifos na ordem da escalação mais o `R` do Portador; contorno nenhum, um, e alternando em 599/600/1200 ms
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): label the boss lineup for the bar and the shop`

---

### T12: `BossDirector` e o chefe sorteado na cena

**What**: `scenes/test/bossDirector.ts` (novo) criado no construtor do `RunDirector`: `lineupFor(round)` com overrides
por `debugParam`, `specFor(round)`, `reset()`, `snapshot()`. `areaDirector.ts:83` e `spawner.spawnBoss` usam o
diretor; `bossSpecFor` passa a exigir a escalação e `archetypeFor` sai (com seu bloco em `bossTier.test.ts`). Snapshot
e `debugApi` ganham `affixes` e `finger`; README documenta `bossArch`, `bossAffix`, `finger` e corrige `round=5`.
**Where**: `src/scenes/test/bossDirector.ts`
**Depends on**: None (fase anterior concluída)
**Reuses**: `debugParam`, ganchos `onStartRun`/`applyRunCommand` do `RunDirector`
**Requirement**: BLN-08, BLN-09, BLN-11

**Done when**:

- [ ] Smoke novo `boss-lineup.smoke.mjs` (1º cenário): duas seeds na r5 (`hd=1&area=modular`) dão chefes diferentes
      em arquétipo ou afixo; snapshot traz `affixes` e `finger`; fundo da arena bate com o arquétipo; `bossArch=tecela`
      na r5 vale
- [ ] `npm run smoke -- boss-lineup`, `boss` e `world-boss` verdes
- [ ] `TestScene.ts` sem linha nova; gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(boss): spawn the boss drawn from the seed`

---

### T13: Barra com afixos e glifos

**What**: `spawnBoss` mostra `bossBarLabel(spec)` pelo `showBossBar` de hoje; `game/boss/BossReadout.ts` (novo) desenha na
`uiLayer` um quadrado de 6 px por `glyphKeys` à direita da barra (`BOSS_BAR_WIDTH` e `MARGIN` viram `export` em
`Hud.ts`, sem linha nova) e some com a barra.
**Where**: `src/game/boss/BossReadout.ts`
**Depends on**: T12
**Reuses**: `uiLayer` (`uiSetup.ts:30-42`), `Hud.showBossBar`
**Requirement**: BRD-01, BRD-02, BRD-07

**Done when**:

- [ ] `boss-lineup` (2º cenário): texto da barra = `bossBarLabel`; snapshot lista os glifos visíveis; captura olhada
- [ ] `npm run smoke -- boss-lineup` e `boss` verdes; `Hud.ts` sem linha efetiva nova; gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(hud): show the boss affixes on the boss bar`

---

### T14: Aviso "Próximo:" na loja

**What**: `BossDirector.onShopOpen(round)` mostra `announceText(lineupFor(round + 1))` no `BossReadout` quando a
próxima rodada é de chefe; some no `roundStart` e no `startRun`. Ligado pelo `applyRunCommand` do `RunDirector`
(`shopDirector.ts` e `ShopPanel.ts` intocados). Snapshot traz o texto do aviso.
**Where**: `src/scenes/test/bossDirector.ts`
**Depends on**: T13
**Reuses**: `isBossRound`, `BossLineups` (cache garante o mesmo chefe)
**Requirement**: BRD-04, BRD-05, BRD-06, BRD-08

**Done when**:

- [ ] `boss-lineup` (3º cenário): `seed=N&round=4`, limpar a rodada → aviso no snapshot; a r5 nasce com o chefe
      anunciado e a barra com o mesmo arquétipo e afixos; loja da r1 sem aviso
- [ ] `npm run smoke -- boss-lineup` e `shop` verdes; gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(shop): announce the next boss in the shop`

---

### T15: Ciclos por arquétipo e tuning derivada

**What**: `BOSS.archetypes.oni/tecela` ganham `shortName` e `cycles`; `BOSS` ganha `doubleCharge`, `tripleLeap` e
`threadRain`; `core/bossAffix.ts` ganha `cyclesFor(archetype, affixes)` (Sangue põe `beam` depois do 1º ataque de cada
fase) e `bossTuningFor(spec)` (`ai` com ciclos e números; `brain` = `BOSS`).
**Where**: `src/core/bossAffix.ts`
**Depends on**: None (fase anterior concluída)
**Reuses**: `BOSS` (`data/tuning.ts:330-379`)
**Requirement**: CYC-01, CYC-02, CYC-03, CYC-04, SNG-01, AFX-01

**Done when**:

- [ ] Testes: fase 1 `charge, leap` nos dois; fases 2 e 3 do Oni e da Tecelã como na spec; com Sangue, `beam` na 2ª
      posição de cada fase; `bossTuningFor` repassa os ciclos e os números da tuning; `tests/data/tuning.test.ts`
      atualizado para `shortName`/`cycles`
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): give each boss archetype its own attack cycles`

---

### T16: Ajudantes puros dos ataques

**What**: `src/core/bossAttacks.ts` (novo): `threadXs(centerX, minX, maxX, offsets)`, `beamThickness(elapsedMs, warnMs)`
e `animBase(attack)`.
**Where**: `src/core/bossAttacks.ts`
**Depends on**: T15
**Reuses**: nenhum
**Requirement**: CYC-09, CYC-11, SNG-02

**Done when**:

- [ ] `tests/core/bossAttacks.test.ts` (novo): fios presos aos limites nas duas pontas; espessura 1 em 0 ms e 6 em 800 ms;
      `animBase` de cada ataque novo cai num quadro que existe (`charge`, `leap`, `volley`)
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the pure helpers of the new boss attacks`

---

### T17: Evento `chargeTrail` ao fim da investida

**What**: `BossAI` emite `{ type: 'chargeTrail', fromX, toX }` ao fim de toda investida (alcance ou parede).
**Where**: `src/core/bossAI.ts`
**Depends on**: T16
**Reuses**: fim da investida de hoje
**Requirement**: IGN-01

**Done when**:

- [ ] `tests/core/bossAttacks.test.ts`: `fromX`/`toX` cobrem o trecho percorrido, nos dois sentidos e com parede
- [ ] `tests/core/bossAI.test.ts` intacto; gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(boss-ai): report the ground a charge covered`

---

### T18: Investida Dupla

**What**: Ataque `doubleCharge` no `BossAI`: fim por alcance → vira para o player, preparo de 250 ms, 2ª investida sem
descanso; parede na 1ª → atordoamento e fim; troca de fase no meio para o encadeado.
**Where**: `src/core/bossAI.ts`
**Depends on**: T17
**Reuses**: corpo da `charge`, `interrupt` (linha 244)
**Requirement**: CYC-05, CYC-06

**Done when**:

- [ ] Testes: 249/250 ms de preparo; direção da 2ª para o player; parede cancela a 2ª; `interrupt` zera o encadeado e o
      ciclo novo começa do 1º ataque (edge case); complexidade do arquivo dentro do teto
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(boss-ai): add the double charge`

---

### T19: Salto Triplo

**What**: Ataque `tripleLeap`: 3 saltos, cada um mirando o X do player na saída, 200 ms entre pouso e saída; `landed`
ganha `final`, verdadeiro só no 3º; descanso de pouso só depois dele.
**Where**: `src/core/bossAI.ts`
**Depends on**: T18
**Reuses**: corpo do `leap`
**Requirement**: CYC-07, CYC-08

**Done when**:

- [ ] Testes: 3 eventos `landed` com `final` só no último; 199/200 ms entre pousos; alvo atualizado a cada saída;
      descanso só depois do 3º; troca de fase no meio para o encadeado
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(boss-ai): add the triple leap`

---

### T20: Feixe e Chuva de Fios no `BossAI`

**What**: Ataques `beam` (aviso fixo de 800 ms, direção presa no aviso, corpo de 250 ms) e `threadRain` (preparo fixo
de 600 ms, corpo de 200 ms); eventos `telegraph`, `strikeOn`, `strikeOff` e `telegraphCancel` no `interrupt`.
Se a complexidade passar de 15, o encadeamento sai para `core/bossChain.ts` (design, riscos).
**Where**: `src/core/bossAI.ts`
**Depends on**: T19
**Reuses**: `beginAttackBody`, `windupDurationFor` (vira tabela)
**Requirement**: SNG-02, SNG-03, CYC-09, CYC-10

**Done when**:

- [ ] Testes: 799/800 e 599/600 ms; `windupMult` da fase 3 não encurta; direção do feixe não muda se o player troca de
      lado no aviso; `telegraphCancel` sem `strikeOn` ao ser interrompido (edge case)
- [ ] Lint dentro dos tetos; gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(boss-ai): add the beam and the thread rain`

---

### T21: Faixas de lava

**What**: `src/core/bossLava.ts` (novo): `LavaStrips` com `add`, `update`, `tick(rect, grounded)`, `strips` e `clear`.
**Where**: `src/core/bossLava.ts`
**Depends on**: None (fase anterior concluída)
**Reuses**: `BOSS_AFFIX.lava`
**Requirement**: IGN-02, IGN-03, IGN-05

**Done when**:

- [ ] `tests/core/bossLava.test.ts` (novo): some em 1999/2000 ms; 1º contato bate na hora; 599/600 ms entre tiques;
      no ar não bate; fora da faixa não bate; `clear` esvazia
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the lava strips`

---

### T22: Regra do Adaptativo

**What**: `src/core/bossAdapt.ts` (novo): `AdaptSource`, `TechHit`, `adaptSourceOf(hit)` e `Adaptation` (relógio próprio,
janela de 20 s, mínimo 5, teto 2, esquece em 10 s e apaga os acertos da fonte esquecida, empate pela que chegou primeiro).
**Where**: `src/core/bossAdapt.ts`
**Depends on**: T21
**Reuses**: `TechId`, `BOSS_AFFIX.adapt`
**Requirement**: ADP-01, ADP-02, ADP-03, ADP-04, ADP-05

**Done when**:

- [ ] `tests/core/bossAdapt.test.ts` (novo): leve/forte/técnica; técnica sem `techId` → `null`; 4 e 5 acertos;
      idade 19999/20000; teto de 2; empate; escala 0,5 só a partir do golpe seguinte à adaptação; 9999/10000 ms;
      depois de esquecer, 1 golpe não readapta
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the adaptive boss affix rule`

---

### T23: Escala do golpe no cérebro do chefe

**What**: `BossBrain.receiveHit(hit, scale = 1)`: com `scale < 1`, dano `max(1, round(dano × scale))` e postura
`round(postura × scale)`, antes do multiplicador do `stagger`.
**Where**: `src/core/bossBrain.ts`
**Depends on**: T22
**Reuses**: `receiveHit` de hoje (linha 92)
**Requirement**: ADP-04

**Done when**:

- [ ] `tests/core/bossBrainScale.test.ts` (novo): dano mínimo 1; postura × 0,5; `stagger` aplicado depois; `scale` 1 igual
      a hoje
- [ ] `tests/core/bossBrain.test.ts` intacto; gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(boss-brain): scale an incoming hit`

---

### T24: Quantos invocados nascem

**What**: `summonCount(round, alive, t)` em `core/bossAffix.ts` = `min(r5 ? 2 : 3, max(0, maxAlive − alive))`.
**Where**: `src/core/bossAffix.ts`
**Depends on**: T23
**Reuses**: `BOSS_AFFIX.summon`
**Requirement**: INV-01, INV-02

**Done when**:

- [ ] Testes: vivos 0..4 na r5 e na r10 (2/2/2/1/0 e 3/3/2/1/0)
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): count the summoned enemies under the cap`

---

### T25: `Boss` com a tuning derivada e os ataques novos

**What**: `Boss` cria `BossBrain`/`BossAI` com `bossTuningFor(spec)`; `animate` usa `animBase`; `onLand(final)` só emite as
ondas de choque no 3º pouso; eventos novos vão para `fxSink?.(ev, anchor)`; `onPhaseChanged` sai do `dispatch`.
`game/boss/BossAffixFx.ts` (novo) recebe o `fxSink` e o `BossDirector.attach(boss)` o cria (por ora só roteia).
**Where**: `src/game/Boss.ts`
**Depends on**: None (fase anterior concluída)
**Reuses**: `dispatch` (T2), `handleAIEvents`
**Requirement**: AFX-01, CYC-03, CYC-05, CYC-07, CYC-08, CYC-11

**Done when**:

- [ ] Smoke novo `boss-attacks.smoke.mjs` (1º cenário): `round=15&bossArch=oni&bossAffix=none` mostra `doubleCharge`
      na fase 2 e `tripleLeap` na fase 3 pelo snapshot (`attack`), com 3 pousos e ondas só no último
- [ ] `npm run smoke -- boss-attacks` e `boss` verdes; `Boss.ts` abaixo de ~285 linhas efetivas; gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(boss): fight with the archetype cycles`

---

### T26: Vista da Chuva de Fios

**What**: `game/boss/ThreadRain.ts` (novo): 5 marcas `u` no chão em `threadXs`; no `strikeOn` cada marca vira um fio `U`
com um `AttackHitbox` próprio (dono = chefe, dano de projétil do tier, um acerto); `strikeOff` fecha; `telegraphCancel`
apaga sem abrir.
**Where**: `src/game/boss/ThreadRain.ts`
**Depends on**: T25
**Reuses**: `AttackHitbox` (`game/hitbox.ts:55-77`)
**Requirement**: CYC-04, CYC-09, CYC-10, BRD-07

**Done when**:

- [ ] `boss-attacks` (2º cenário): `bossArch=tecela`, fase 2 → 5 fios no snapshot nas posições esperadas; player sob um
      fio perde o dano de projétil do tier uma vez; captura olhada em movimento
- [ ] `npm run smoke -- boss-attacks` verde; gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(boss): draw the thread rain`

---

### T27: Portador de Dedo no motor

**What**: `Boss` usa `spec.bodyScale` no corpo e na `spriteScale` (T3); getters `finger` e `spriteScale` no snapshot.
**Where**: `src/game/Boss.ts`
**Depends on**: T26
**Reuses**: medidas por instância (T3)
**Requirement**: PDD-03, PDD-04, PDD-05

**Done when**:

- [ ] `boss-attacks` (3º cenário): `round=10&finger=1` → `spriteScale` 1,25, corpo 1,25 maior, vida `round(base × 1,3)`
      e rajada com um projétil a mais, lidos do jogo vivo (L-043)
- [ ] `npm run smoke -- boss-attacks` verde; gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(boss): grow the finger bearer`

---

### T28: Campo de lava do Ígneo

**What**: `game/boss/LavaField.ts` (novo): `LavaStrips` + retângulo `a`/`A` por faixa; `chargeTrail` cria faixa (só com
Ígneo); por quadro, `tick(player.hurtRect(), player.grounded)` → `player.receiveHit` com `low`, `unblockable`, força 0,
dono = chefe, dano `spec.damage.lava`. `BossDirector.onBossDied` e `reset` limpam.
**Where**: `src/game/boss/LavaField.ts`
**Depends on**: None (fase anterior concluída)
**Reuses**: `player.receiveHit`, `player.grounded`, `player.hurtRect`
**Requirement**: IGN-01, IGN-02, IGN-03, IGN-04, IGN-05, BRD-07

**Done when**:

- [ ] Smoke novo `boss-igneo.smoke.mjs` (`round=10&bossArch=oni&bossAffix=igneo`): faixa depois da investida; parado
      nela perde `round(4 × mult)` a cada ~600 ms; pulando não perde; some em 2 s; morte do chefe e run nova sem lava
- [ ] `npm run smoke -- boss-igneo` verde; gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(boss): leave lava behind the igneous charge`

---

### T29: Contorno do afixo

**What**: `game/boss/AffixOutline.ts` (novo): 4 cópias do sprite do chefe com `tintMode FILL` na cor de `outlineKeyAt`,
±1 px, atrás dele, copiando textura, quadro, posição e escala a cada quadro depois do `boss.update`.
**Where**: `src/game/boss/AffixOutline.ts`
**Depends on**: T28
**Reuses**: `setTintMode(Phaser.TintModes.FILL)` (`EnemyAnimator.ts:202`)
**Requirement**: BRD-03, BRD-07

**Done when**:

- [ ] `boss-igneo`: snapshot traz o contorno com a cor `a`; com `bossAffix=igneo,invocador` alterna; sem afixo de
      contorno não existe; captura olhada em movimento (quadro trocando acompanha)
- [ ] `npm run smoke -- boss-igneo` verde; gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(boss): outline the boss in its affix color`

---

### T30: Feixe do Sangue Convergente

**What**: `game/boss/BeamAttack.ts` (novo): linha `r` → `R` com `beamThickness` do chefe até a borda da `worldView` no
lado avisado; `strikeOn` abre um `AttackHitbox` (dono = chefe, `high`, dano `spec.damage.beam`) por 250 ms;
`telegraphCancel` apaga sem abrir.
**Where**: `src/game/boss/BeamAttack.ts`
**Depends on**: T29
**Reuses**: `AttackHitbox`
**Requirement**: SNG-01, SNG-02, SNG-03, BRD-07

**Done when**:

- [ ] Smoke novo `boss-sangue.smoke.mjs` (`round=10&bossAffix=sangue`): `attack === 'beam'` logo depois do 1º ataque;
      aviso de ~800 ms; dano `round(16 × mult)` em pé; abaixado não leva
- [ ] `npm run smoke -- boss-sangue` verde; gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(boss): fire the convergent blood beam`

---

### T31: Invocador

**What**: `spawner.spawnSummoned(point, round, index, onGone)` (usa `wireEnemy` da T4; `scaleFor(round)`, sem
`rollArmed`, aparência por índice, morte sem `Run` nem drop); `BossDirector` chama `summonCount` em `onPhaseChanged`,
guarda os vivos e, no `onBossDied`/`reset`, remove cada um com `curseSmoke` + `destroyNow`.
**Where**: `src/scenes/test/bossDirector.ts`
**Depends on**: T30
**Reuses**: `pickEnemySpawnPoint`, `scaleFor`, `ENEMY_VARIANTS`, `fx.curseSmoke`, `Enemy.destroyNow`
**Requirement**: INV-01, INV-02, INV-03, INV-04, INV-05

**Done when**:

- [ ] Smoke novo `boss-invocador.smoke.mjs` (`round=5&bossAffix=invocador`): tecla 2 até o rugido → 2 invocados
      desarmados; matar um não muda `run.kills` nem cria drop; morte do chefe → 0 invocados
- [ ] `npm run smoke -- boss-invocador` e `spawn-pressure` verdes; gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(boss): summon commons on phase change`

---

### T32: `techId` no golpe da técnica

**What**: `techMarks(strength, id)` em `game/tech/shared.ts` devolve também `techId`; as 7 chamadas em `blue.ts:127`,
`cut.ts:56`, `divergent.ts:171,205,235`, `purple.ts:100` e `red.ts:129` passam o id. `core/hit.ts` intocado.
**Where**: `src/game/tech/shared.ts`
**Depends on**: T31
**Reuses**: `TechHit` (T22)
**Requirement**: ADP-01

**Done when**:

- [ ] `npm run smoke -- tech` verde (dano e efeito das técnicas iguais)
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(tech): tag technique hits with their id`

---

### T33: Adaptativo no chefe e a roda

**What**: `Boss` cria `Adaptation` quando tem Adaptativo, passa `onHit(adaptSourceOf(hit))` como escala ao cérebro e
atualiza o relógio; `game/boss/AdaptWheel.ts` (novo) desenha a roda de 8 raios `A` com os rótulos curtos; snapshot traz
`adapted`.
**Where**: `src/game/boss/AdaptWheel.ts`
**Depends on**: T32
**Reuses**: `Adaptation` (T22), `receiveHit(hit, scale)` (T23)
**Requirement**: ADP-01, ADP-02, ADP-04, ADP-06, ADP-07, BRD-07

**Done when**:

- [ ] Smoke novo `boss-adaptativo.smoke.mjs` (`round=10&bossAffix=adaptativo`): 5 × tecla 2 → `adapted: ['heavy']`;
      6º golpe forte tira a metade (lido da vida do chefe); roda visível; finalizador não reduzido
- [ ] `npm run smoke -- boss-` verde (toda a família nova e os antigos); gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(boss): adapt to the most used source`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7

Phase 1:  T1 → T2 → T3 → T4 → T5
Phase 2:  T6 → T7 → T8 → T9 → T10 → T11
Phase 3:  T12 → T13 → T14
Phase 4:  T15 → T16 → T17 → T18 → T19 → T20
Phase 5:  T21 → T22 → T23 → T24
Phase 6:  T25 → T26 → T27
Phase 7:  T28 → T29 → T30 → T31 → T32 → T33
```

Execução estritamente em sequência. 33 tarefas → lotes de ~7 em fases inteiras: (1), (2), (3+5 regra pura junto da
cena só se o lote couber; senão 3), (4), (5+6), (7).

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | URLs de 5 smokes, mesma mudança mecânica | ⚠️ OK (uma mudança, vários arquivos de teste) |
| T2, T3 | 1 refatoração cada em `Boss.ts` | ✅ |
| T4 | 1 função extraída | ✅ |
| T5 | ciclos da tuning (`bossAI.ts` + 1 campo em `tuning.ts`) | ✅ |
| T6, T7 | 1 arquivo de dados / 1 stream | ✅ |
| T8, T9, T11 | funções coesas de `bossAffix.ts` | ✅ |
| T10 | `bossSpecFor` | ✅ |
| T12 | diretor novo + 2 chamadores + snapshot + README | ⚠️ OK (coeso: trocar a fonte do arquétipo exige mudar os chamadores juntos) |
| T13, T14 | 1 componente / 1 gancho | ✅ |
| T15 | dados dos ciclos + `cyclesFor` + `bossTuningFor` | ⚠️ OK (dado e quem o lê) |
| T16–T24 | 1 ataque ou 1 regra cada | ✅ |
| T25 | `Boss` usa a tuning derivada + roteador `BossAffixFx` | ⚠️ OK (o roteador é o destino dos eventos que a mudança cria) |
| T26–T30, T32, T33 | 1 componente de vista cada | ✅ |
| T31 | `spawnSummoned` + chamada no diretor | ⚠️ OK (sem a chamada a função não é observável) |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | início da fase 1 | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | T2 | T2 → T3 | ✅ |
| T4 | T3 | T3 → T4 | ✅ |
| T5 | T4 | T4 → T5 | ✅ |
| T6 | None (fase 1) | início da fase 2 | ✅ |
| T7 | T6 | T6 → T7 | ✅ |
| T8 | T7 | T7 → T8 | ✅ |
| T9 | T8 | T8 → T9 | ✅ |
| T10 | T9 | T9 → T10 | ✅ |
| T11 | T10 | T10 → T11 | ✅ |
| T12 | None (fase 2) | início da fase 3 | ✅ |
| T13 | T12 | T12 → T13 | ✅ |
| T14 | T13 | T13 → T14 | ✅ |
| T15 | None (fase 3) | início da fase 4 | ✅ |
| T16 | T15 | T15 → T16 | ✅ |
| T17 | T16 | T16 → T17 | ✅ |
| T18 | T17 | T17 → T18 | ✅ |
| T19 | T18 | T18 → T19 | ✅ |
| T20 | T19 | T19 → T20 | ✅ |
| T21 | None (fase 4) | início da fase 5 | ✅ |
| T22 | T21 | T21 → T22 | ✅ |
| T23 | T22 | T22 → T23 | ✅ |
| T24 | T23 | T23 → T24 | ✅ |
| T25 | None (fase 5) | início da fase 6 | ✅ |
| T26 | T25 | T25 → T26 | ✅ |
| T27 | T26 | T26 → T27 | ✅ |
| T28 | None (fase 6) | início da fase 7 | ✅ |
| T29 | T28 | T28 → T29 | ✅ |
| T30 | T29 | T29 → T30 | ✅ |
| T31 | T30 | T30 → T31 | ✅ |
| T32 | T31 | T31 → T32 | ✅ |
| T33 | T32 | T32 → T33 | ✅ |

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | smokes antigos | none | none | ✅ |
| T2–T4 | adaptadores (refatoração) | smoke | smoke | ✅ |
| T5 | regra pura + dados | unit | unit (+ smoke `boss` no gate full) | ✅ |
| T6 | dados | unit | unit | ✅ |
| T7–T11 | regra pura | unit | unit | ✅ |
| T12–T14 | adaptadores | smoke | smoke | ✅ |
| T15 | regra pura + dados | unit | unit | ✅ |
| T16–T24 | regra pura | unit | unit | ✅ |
| T25–T33 | adaptadores | smoke | smoke | ✅ |

## Requirement Coverage

| Requirement | Tasks |
| --- | --- |
| BLN-01 | T7 |
| BLN-02..07 | T8 |
| BLN-08 | T12 |
| BLN-09 | T1 (preparo), T9, T12 |
| BLN-10 | T9 |
| BLN-11 | T12 |
| AFX-01 | T15, T25 |
| AFX-02 | T6 |
| IGN-01 | T17, T28 |
| IGN-02, IGN-03, IGN-05 | T21, T28 |
| IGN-04 | T28 |
| INV-01, INV-02 | T24, T31 |
| INV-03, INV-04, INV-05 | T31 |
| SNG-01 | T15, T30 |
| SNG-02, SNG-03 | T16/T20, T30 |
| ADP-01 | T22, T32, T33 |
| ADP-02, ADP-03, ADP-05 | T22 (ADP-02 também T33) |
| ADP-04 | T22, T23, T33 |
| ADP-06, ADP-07 | T33 |
| CYC-01 | T5, T15 |
| CYC-02..04 | T15, T25, T26 |
| CYC-05, CYC-06 | T18, T25 |
| CYC-07, CYC-08 | T19, T25 |
| CYC-09, CYC-10 | T16/T20, T26 |
| CYC-11 | T16, T25 |
| PDD-01, PDD-02 | T8 |
| PDD-03 | T3 (preparo), T10, T27 |
| PDD-04, PDD-05 | T10, T27 |
| BRD-01 | T11, T13 |
| BRD-02 | T11, T13 |
| BRD-03 | T11, T29 |
| BRD-04 | T11, T14 |
| BRD-05, BRD-06, BRD-08 | T14 |
| BRD-07 | T6 (+ cada vista: T13, T26, T28–T30, T33) |

Edge cases: lava some na morte do chefe (T28); interrupção no aviso (T20, T26, T30); troca de fase no encadeado
(T18, T19); run nova sem invocados nem lava (T28, T31); run começando na rodada de chefe (T8, T12); invocação sem ponto
livre (T31, por `pickEnemySpawnPoint`); lava do Portador × 1,5 (T10).

**Coverage:** 57 requisitos, 57 mapeados, 0 sem tarefa.
