# Votos novos (F40) — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/votos-novos/spec.md`
**Design**: `.specs/features/votos-novos/design.md`
**Plano**: `docs/plano-builds-e-habilidades.md` (seção 5.5 e linha F40 da seção 6)
**Status**: Draft
**Branch**: `docs/spec-meta-e-votos` (spec). A implementação abre o próprio branch a partir de onde a F29 a F36 e a
F39 estiverem mergeadas: a F40 usa o `statSheet`/`StatsDirector` (F29), o `TechStats` (F30), o `core/domain.ts` e o
Baú do Véu (F31), o `ChoicePanel` e os resolvedores (F33), o registro de técnicas e o `kokusenSnapshot` (F34), o pool,
o livro de gastos, o `buildEffects` e a bandeja (F35), o `pointCap` da arma (F36), a cota e o `counterText` (F38) e o
`meta.gate` e a lista `freshTechniques` (F39).

---

## Test Coverage Matrix

> Guidelines: `CLAUDE.md` (camadas; `core/` com teste par em `tests/core/`; gate antes de cada commit; smoke só do que
> foi tocado; HD é a base e smoke novo pede `hd=1`; arte só pronta depois da prancha e do movimento no jogo),
> `.oxlintrc.json` (400 linhas efetivas por arquivo, 80 por função, complexidade 15; arquivo novo nunca entra nas
> exceções), `vitest.config.*`; lições L-010 (cada limiar nos dois lados), L-043 (testar a chamada do adaptador que
> repassa o número ao motor) e L-076 (campo de debug que repete a entrada não prova o efeito; ler o objeto vivo).
> Amostras: `tests/core/vows.test.ts` (sorteio uniforme, `vowEffects`), `tests/core/reverseCursed.test.ts`,
> `tests/core/loadout.test.ts`, `tests/core/kokusen.test.ts`, `tests/game/vowPanel.test.ts` (cores por chave da
> paleta, `Text` falso), `tests/game/debugApi.test.ts` (literal do snapshot), `scripts/smoke/vows.smoke.mjs`,
> `kokusen.smoke.mjs`, `shop.smoke.mjs`, `build.smoke.mjs`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Regra pura (`src/core/**`) | unit | 1:1 com os ACs; cada limiar nos dois lados (L-010: 9 e 10 abates, teto de 30 ms, carga 100, resto < 1); bordas da spec; `?raw` sem `phaser` | `tests/core/<arquivo>.test.ts` | `npm test` |
| Dados (`src/data/vows.ts`) | unit | Ordem dos ids do VEL-01 (filtrada pelos presentes), todo número novo em `VOW` (VQA-01), textos da carta das Assumptions | `tests/data/vows.test.ts` | `npm test` |
| Equivalência dos números (`statSheet` + `buildEffects` com os 8 votos de hoje) | unit | Fixture gravado antes de qualquer mudança: 8 votos sozinhos, 28 pares e os 8 juntos × 3 relíquias × talentos da F35 no Nv 1 e Nv 3 × 0, 9, 10 e 15 abates; igual em todo passo (VQA-03) | `tests/core/statSheetVows.test.ts` + `tests/core/fixtures/statSheetVowsBaseline.json` | `npm test` |
| Arte em código (`src/game/art/hd/**`) | unit + prancha | Teste de paleta e registro verdes; prancha olhada em `.fable-out/`; conferência no jogo em HD, parado e correndo, para os dois lados | `tests/game/art/**` | `npm test` + `node tools/hd-boards.mjs` |
| Vistas sem cena (`src/game/RevealMark.ts`, `src/game/VowPanel.ts`) | unit | Só chaves da `PALETTE`; L-043 com cena e `Text` falsos (posição, visibilidade, linhas lidas do objeto) | `tests/game/<arquivo>.test.ts` | `npm test` |
| Tipos do snapshot (`src/game/debugApi.ts`, `powerSnapshot.ts`, `buildSnapshot.ts`, `domainSnapshot.ts`) | unit | Literal do `debugApi.test.ts` com cada campo novo (VDB-01, VDB-02) | `tests/game/debugApi.test.ts` | `npm test` |
| Adaptadores de cena (`src/scenes/test/**`) | smoke | Efeito lido do jogo vivo pelo snapshot (L-043, L-076): caminho feliz + bordas da spec; `vows-new.smoke.mjs` com `?debug&hd=1&area=modular`; os smokes existentes listados na task iguais ao antes | `scripts/smoke/vows-new.smoke.mjs` + existentes da task | `npm run smoke -- <trecho>` |
| Decisão e docs (`.specs/STATE.md`, `README.md`) | none | build gate | - | `npm run gate` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tasks só com teste de unidade (core, dados, arte, vistas sem cena, tipos do snapshot) | `npm run gate` |
| Full | Tasks de adaptador de cena, ou core que muda um smoke existente | `npm run gate && npm run smoke -- <smoke da task>` (um trecho por vez) |
| Build | Decisão e docs | `npm run gate` |

Base de testes: a contagem do `npm run gate` no começo da T1, anotada na T1 (a F40 roda depois dos merges da F29 a
F39, então o número de hoje, 3009 no `90fdc03`, não vale). Cada task anota a contagem nova; nenhuma pode ficar abaixo
da anterior. Smokes instáveis conhecidos: `armed` (ARM-12) e timeouts sob carga; repetir isolado antes de suspeitar.

**Regras de execução desta feature**

- **Reconferência no começo da T4** (design, "Reconferência obrigatória"): assinatura do `drawVows` depois da F39, ordem
  dos aplicadores de debug no `runDirector.resetRun` (`tech=`, `perks=`, `arsenal=`, `domain=`), nomes reais da F35
  (`POOL`, `PoolState`, `KokusenScale.windowBonusMs`, `dropItem`) e da F36 (`pointCap`). Nome diferente do design:
  a task usa o real e anota no `Done when`; mudança de contrato vira pergunta, não improviso.
- O passo 0 (Phases 1 a 4) é refatoração: os 8 votos de hoje dão os mesmos números (fixture da T2) e o mesmo sorteio
  (lista da T3); os smokes `vows`, `shop`, `power`, `build`, `kokusen`, `tech`, `defense`, `run-loop`, `choice-panel` e
  `domain` passam iguais antes e depois.
- Cada passo de comportamento (Phases 5 a 10) termina jogável e com o `vows-new.smoke` verde no cenário dele.
- Nenhum voto escreve em `loadout.damageMul`, `loadout.vowDamageMul`, `loadout.costMul`, `player.damageTakenMul` nem
  `player.setMaxHp`; o único escritor continua o `StatsDirector.sync` (VQA-02, POW-01).
- `src/scenes/TestScene.ts` não ganha linha efetiva em nenhuma task (VQA-04). Nenhum arquivo novo entra nas exceções do
  `.oxlintrc.json`. O `vowEffects` não passa de 80 linhas nem de complexidade 15: os blocos novos vão no
  `applyNewVows`.
- Um voto entra no catálogo **na posição final** do VEL-01 dentro do bloco novo (design, "Ordem do catálogo"); o
  `tests/data/vows.test.ts` confere a ordem dos presentes contra a lista do VEL-01 filtrada.
- Arte (T28): prancha em `.fable-out/` e conferência no jogo em HD, parado e correndo, para os dois lados, antes do
  commit.

---

## Execution Plan

Phases são sequenciais; dentro da phase as tasks rodam na ordem.

### Phase 1: Decisão e linhas de base (passo 0)

```
T1
T2
T3
```

### Phase 2: Elegibilidade, sorteio e efeitos neutros (passo 0)

```
T4 → T5
T6 → T7 → T9
T6 → T10
T7 → T10
T8
```

### Phase 3: Donos dos números com valor neutro (passo 0)

```
T11 → T12
T13
T14
T15
```

### Phase 4: Adaptadores do passo 0

```
T16
T17
T18
T19
```

### Phase 5: Expediente e Corpo emprestado (passo 1)

```
T20 → T21 → T24
T22 → T24
T21 → T25
T23 → T25
T24 → T26
T25 → T26
```

### Phase 6: Revelação da técnica (passo 2)

```
T27 → T30
T28 → T29 → T30
T30 → T32
T31 → T32
```

### Phase 7: Voto do Black Flash (passo 3)

```
T33 → T34
```

### Phase 8: Voto de silêncio (passo 4)

```
T35 → T37
T36 → T37
```

### Phase 9: Restrição celestial, regras e fontes (passo 5)

```
T38 → T41
T39 → T41
T40
T42
T43
T44
```

### Phase 10: Restrição celestial, tomar, painel e fechamento (passo 5)

```
T45 → T48 → T49
T46 → T49
T47
```

### Phase 11: Legibilidade dos votos (passo 6)

```
T50 → T51 → T52 → T54 → T56
T53 → T54
T55 → T56
```

---

## Task Breakdown

## Phase 1: Decisão e linhas de base (passo 0)

### T1: Decisão dos votos vinculativos no STATE

**What**: Acrescentar ao `## Decisions` do `.specs/STATE.md` a próxima `AD-NNN` livre (número tirado na hora, depois
da última do branch) com o texto da seção "Decisão de projeto nova (passo 0)" do design (Decision, Reason, Trade-off,
Scope), citando que emenda o "como" da AD-024 para os votos; anotar a contagem base do gate.
**Where**: `.specs/STATE.md`
**Depends on**: None
**Reuses**: formato das AD existentes
**Requirement**: VQA-02 (decisão que o sustenta)

**Done when**:

- [ ] Nova AD com os quatro campos; a AD-024 continua `active` e aponta para a emenda; nenhuma outra AD muda
- [ ] `python3 <skill>/scripts/validate_state.py` sem erro
- [ ] Gate verde; contagem base anotada aqui

**Tests**: none (decisão: a matriz diz none)
**Gate**: build
**Commit**: `docs(state): record the binding vow decision`

---

### T2: Linha de base dos números dos 8 votos

**What**: Teste que monta o `statSheet` (F29) e o `buildEffects` (F35) para os 8 votos de hoje (cada um sozinho, os 28
pares e os 8 juntos) × 3 relíquias × talentos da F35 no Nv 1 e no Nv 3 × 0, 9, 10 e 15 abates, grava o resultado em
`tests/core/fixtures/statSheetVowsBaseline.json` **com o código de antes da F40** e compara contra o fixture. Nenhum
código de `src/` muda.
**Where**: `tests/core/statSheetVows.test.ts`
**Também**: `tests/core/fixtures/statSheetVowsBaseline.json` (gerado, não editado à mão)
**Depends on**: None
**Reuses**: `vowEffects`, `statSheet`, `buildEffects` como estão no começo da task
**Requirement**: VQA-03

**Done when**:

- [ ] Fixture gerado por um script do próprio teste (modo de gravação por variável de ambiente, desligado no gate) e
      commitado; o teste lê o fixture e compara campo a campo
- [ ] Teste verde no código de hoje
- [ ] Gate verde; contagem = base + novos

**Tests**: unit
**Gate**: quick
**Commit**: `test(core): pin the stat sheet numbers of the current vows`

---

### T3: Linha de base do sorteio dos votos

**What**: Teste que grava as ofertas do `drawVows` de hoje para 50 seeds (com 0, 3 e 6 votos tomados) numa lista
literal no próprio arquivo, gerada com o código de antes da F40, e confere contra ela.
**Where**: `tests/core/vowsDraw.test.ts`
**Depends on**: None
**Reuses**: `drawVows`, `createRng` como no `tests/core/vows.test.ts`
**Requirement**: VEL-10 (preparação), VQA-03

**Done when**:

- [ ] 150 sorteios gravados e iguais no código de hoje
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: quick
**Commit**: `test(core): pin the vow draw for fixed seeds`

---

## Phase 2: Elegibilidade, sorteio e efeitos neutros (passo 0)

### T4: Regra de elegibilidade dos votos

**What**: `src/core/vowEligibility.ts` (novo) com `VowContext`, `VowPool`, `isEligible(id, taken, ctx)` (por ora
`true` para os 8 de hoje) e `eligibleVows({ taken, locked, ctx })` na ordem do catálogo, sem os tomados nem os
trancados. Primeiro, a reconferência das "Regras de execução".
**Where**: `src/core/vowEligibility.ts`
**Teste par**: `tests/core/vowEligibility.test.ts`
**Depends on**: None
**Reuses**: `VOW_IDS` de `data/vows.ts`
**Requirement**: VEL-02, VEL-08, VEL-11

**Done when**:

- [ ] Reconferência feita; nomes reais anotados aqui quando diferirem do design
- [ ] VEL-08: os 8 de hoje elegíveis em qualquer contexto (os 16 valores de `VowContext`)
- [ ] VEL-11: id em `locked` fora da lista; `locked` não conta como tomado (o mesmo id em `taken` e em `locked` sai
      uma vez)
- [ ] VEL-02: ordem do catálogo mantida
- [ ] `src/core/vowEligibility.ts?raw` sem `phaser`
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the vow eligibility rule`

---

### T5: Sorteio dos votos com contexto

**What**: `drawVows(rng, { taken, locked, ctx }, count)` sorteia sobre `eligibleVows(pool)` com o mesmo laço de hoje;
o único chamador (`VowDirector.openPanel`) passa `taken: list`, `locked: meta?.gate.lockedIds('vow') ?? []` (F39) e um
contexto provisório que deixa os 8 elegíveis (o `context()` real entra na T19).
**Where**: `src/core/vows.ts`
**Também**: `src/scenes/test/vowDirector.ts` (`openPanel`, 1 a 3 linhas)
**Teste par**: `tests/core/vowsDraw.test.ts`, `tests/core/vows.test.ts`
**Depends on**: T3, T4
**Reuses**: laço de `src/core/vows.ts:35-37`; `meta.gate.lockedIds` da F39
**Requirement**: VEL-02, VEL-09, VEL-10, VEL-11

**Done when**:

- [ ] A lista da T3 continua igual (mesmas ofertas para as 50 seeds × 3 casos)
- [ ] VEL-09: 2 elegíveis → 2 ofertas; 0 elegíveis → `[]`
- [ ] VEL-10: mesma seed, mesmos tomados e mesmo contexto → mesmo sorteio; o sorteio só consome o `rng` dado
      (contador de chamadas)
- [ ] VEL-11: `locked: ['furia']` nunca sorteia a Fúria em 1000 seeds
- [ ] Smoke `vows` verde, igual ao antes
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: full
**Commit**: `refactor(core): draw vows from the eligible pool`

---

### T6: Pós-passe da Revelação no TechStats

**What**: `src/core/vowStats.ts` (novo) com `RevealMods`, `NEUTRAL_REVEAL` e `revealStats(stats, mods)`: com o neutro
devolve o mesmo objeto; senão uma cópia com cada `damage` × `damageMul` arredondado, cada `radius` numérico de bloco
× `radiusMul` arredondado (varredura genérica) e `signMs + signMsBonus`.
**Where**: `src/core/vowStats.ts`
**Teste par**: `tests/core/vowStats.test.ts`
**Depends on**: None
**Reuses**: `TechStats` e `resolveTechStats` (F30)
**Requirement**: VRV-01, VRV-02, VRV-03

**Done when**:

- [ ] VRV-01: Vermelho Nv 1 com 1,4/1,2/150 → toque 42; `kokusenDamage` igual
- [ ] VRV-02: raio 96 → 115; Azul e Roxo pelo mesmo caminho; `rangePx`, `farPx`, `nearPx`, `cost`, `cooldownMs` iguais
- [ ] VRV-03: `signMs` 250 → 400
- [ ] `NEUTRAL_REVEAL` devolve o próprio objeto (`toBe`)
- [ ] `?raw` sem `phaser`
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the reveal pass over technique stats`

---

### T7: Efeitos dos votos com os campos novos neutros

**What**: `VowEffects` ganha `pool`, `reveal`, `kokusenWindowMs`, `kokusenEnergy`, `domainChargeMul`,
`techChargeOff`, `rctGone`, `rctLockedInDomain` e `weaponPointBonus` com valor neutro; `vowEffects(taken, { kills,
activeKills, zone })` com o `applyNewVows(fx, has, ctx)` vazio depois dos 8 blocos de hoje; o `VowDirector.effects`
passa `activeKills` (`run.roundKills` numa rodada comum em `roundActive`; `null` na rodada de chefe e fora de rodada)
e `zone` (`zoneActive()`, só resolvido com o Black
Flash tomado, design "Risks").
**Where**: `src/core/vows.ts`
**Também**: `src/scenes/test/vowDirector.ts` (`effects`, `zoneActive`)
**Teste par**: `tests/core/vows.test.ts`, `tests/core/statSheetVows.test.ts`
**Depends on**: T2, T6
**Reuses**: molde `if (has(id))` de `src/core/vows.ts:74-124`; `POOL` (F35); `NEUTRAL_REVEAL` (T6)
**Requirement**: VEX-01 (contador), VEX-04 (`null`), VBF-03, VBF-04, VBF-05 (Zona), VDB-01 (campos), VQA-03

**Done when**:

- [ ] Sem voto novo, cada campo novo tem o valor neutro do design ("Data Models")
- [ ] O fixture da T2 continua igual
- [ ] `vowEffects` ≤ 80 linhas e complexidade ≤ 15 (`npm run lint`)
- [ ] Smokes `vows`, `power`, `defense` verdes, iguais ao antes
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: full
**Commit**: `refactor(core): give vow effects the new neutral fields`

---

### T8: Limites do pool por parâmetro

**What**: `PoolLimits` exportado; `canAddTechnique(p, limits = POOL)`, `canAddTalent(p, limits = POOL)` e
`vacancyTag(p, limits = POOL)` leem o parâmetro (`OCUPA VAGA a/N→b/N` com `N = limits.total`); `poolSurcharge` igual.
**Where**: `src/core/skillSlots.ts`
**Teste par**: `tests/core/skillSlots.test.ts`
**Depends on**: None
**Reuses**: `POOL` de `data/perks.ts` (F35)
**Requirement**: VCE-01, VCE-05, VRC-03

**Done when**:

- [ ] Os testes da F35 passam sem mudança (padrão `POOL`)
- [ ] Limite 8/3/7: 7 talentos + 1 técnica aceito; 8º talento recusado
- [ ] Limite 8/0/8: técnica recusada com o pool vazio; 8 talentos aceitos; o 9º recusado
- [ ] `vacancyTag` com limite 8 → `OCUPA VAGA 1/8→2/8`
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: quick
**Commit**: `refactor(core): read the pool limits from a parameter`

---

### T9: Kokusen dos votos no buildEffects

**What**: o input do `buildEffects` ganha `vows: Pick<VowEffects, 'kokusenWindowMs' | 'kokusenEnergy'>`;
`kokusenWindowBonusMs = min(KOKUSEN.windowBonusCapMs, zonaNegra + vows.kokusenWindowMs)`; novo `kokusenEnergyBonus =
vows.kokusenEnergy`. O único chamador (`StatsDirector.sheet`) passa `this.s.vows.effects`.
**Where**: `src/core/buildEffects.ts`
**Também**: `src/scenes/test/statsDirector.ts` (1 linha no chamador)
**Teste par**: `tests/core/buildEffects.test.ts`, `tests/core/statSheetVows.test.ts`
**Depends on**: T7
**Reuses**: soma e teto do BEF-03 (F35)
**Requirement**: VBF-01, VBF-02, VQA-03

**Done when**:

- [ ] Com `vows` neutro, todos os números da F35 iguais; o fixture da T2 igual
- [ ] VBF-01 nos dois lados do teto: só voto (20) → 20; voto + Zona Negra Nv 1 (10) → 30; voto + Nv 3 → 30; 29 → 29
- [ ] VBF-02: `kokusenEnergy` 15 → `kokusenEnergyBonus` 15
- [ ] Smokes `kokusen`, `talents` verdes, iguais ao antes
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: full
**Commit**: `feat(core): add vow sources to the kokusen build effects`

---

### T10: Campos dos votos na folha de números

**What**: `StatSheet` ganha `reveal`, `domainChargeMul`, `techChargeOff` e `weaponPointBonus`, copiados do
`VowEffects`; as fórmulas de `meleeMul`, `vowTechMul` e `maxHp` não mudam.
**Where**: `src/core/statSheet.ts`
**Teste par**: `tests/core/statSheet.test.ts`, `tests/core/statSheetVows.test.ts`
**Depends on**: T6, T7
**Reuses**: `statSheet`, `vowStrikeMul` (F29)
**Requirement**: VQA-02, VQA-03, VSI-01 (caminho), VRC-06 (caminho)

**Done when**:

- [ ] Os 4 campos copiados (teste com `VowEffects` não neutro em cada um)
- [ ] O fixture da T2 igual
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): carry the vow fields into the stat sheet`

---

## Phase 3: Donos dos números com valor neutro (passo 0)

### T11: Revelação e energia do Kokusen no Loadout

**What**: `Loadout.reveal: RevealMods = NEUTRAL_REVEAL`; `stats(id)` aplica `revealStats` só quando `slotOf(id) ===
0`; `KokusenScale.energyBonus` (0 no `reset`); o `reset()` volta o `reveal` ao neutro.
**Where**: `src/core/loadout.ts`
**Teste par**: `tests/core/loadoutReveal.test.ts` (novo)
**Depends on**: T6
**Reuses**: `slotOf` (F35), `resolveTechStats` (F30), `revealStats` (T6)
**Requirement**: VRV-04, VRV-05, VBF-02

**Done when**:

- [ ] VRV-04: o mesmo Vermelho no slot 1 com `reveal` 1,4/1,2/150 fica igual ao resolvido
- [ ] VRV-05: slot 0 vazio → nenhuma técnica muda; equipar no slot 0 aplica na chamada seguinte; trocar de slot tira
- [ ] `reset()` volta `reveal` e `energyBonus` ao neutro
- [ ] `tests/core/loadout.test.ts` sem mudança e verde
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): apply the reveal pass to the first slot`

---

### T12: Energia extra do Kokusen no Divergente

**What**: no resolvedor do Divergente, `kokusenGain = <tabela do eixo> + input.kokusenScale.energyBonus`.
**Where**: `src/core/techResolvers.ts`
**Teste par**: `tests/core/loadoutReveal.test.ts`
**Depends on**: T11
**Reuses**: resolvedor do Divergente (F33)
**Requirement**: VBF-02

**Done when**:

- [ ] `energyBonus` 0 → `kokusenGain` de hoje; 15 → +15
- [ ] Testes do resolvedor da F33 verdes sem mudança
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the vow energy bonus to the kokusen gain`

---

### T13: Ponto extra de eixo na arma

**What**: `AxisBuild.weaponPointBonus = 0` (zerado no `reset`); `pointCap(item) = registro + (item de arma ?
weaponPointBonus : 0)`; `axisCap` (2) igual.
**Where**: `src/core/axisBuild.ts`
**Teste par**: `tests/core/axisBuild.test.ts`
**Depends on**: None
**Reuses**: `pointCap` lido do registro (F36)
**Requirement**: VRC-06

**Done when**:

- [ ] Bônus 0 → testes da F36 iguais
- [ ] Bônus 1 → arma aceita o 4º ponto (Nv 5); o 3º ponto no mesmo eixo continua recusado; técnica sem bônus
- [ ] `reset()` zera o bônus
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): let the weapon take a bonus axis point`

---

### T14: Carga do Domínio com multiplicador, resto e conversão

**What**: em `core/domain.ts`: `ChargeMods`, `NEUTRAL_CHARGE`, `chargeGain(base, mul, carry)`; `DomainState` com
`chargeMods`, resto privado (`chargeCarry` lido), `addCharge` com `techOff` e o teto 100 (resto 0), resto zerado na
ativação e no `reset`, e `convert(id)`.
**Where**: `src/core/domain.ts`
**Teste par**: `tests/core/domainCharge.test.ts` (novo)
**Depends on**: None
**Reuses**: `DomainState`, `DOMAIN_CHARGE` (F31)
**Requirement**: VSI-01, VSI-02, VSI-03, VSI-04, VSI-07, VRC-07 (conversão)

**Done when**:

- [ ] `mul` 1 e resto 0 → números da F31 iguais (testes da F31 verdes sem mudança)
- [ ] VSI-01/02: com 1,5, 2 leves de 0 → 3; 1 forte → 3; 1 abate + 1 leve → 3; `chargeGain(15, 1,5, 0)` → 22 com
      resto 0,5; carga sempre inteira
- [ ] VSI-03: `techCast` **e** `kokusen` com `techOff` não mudam carga nem resto; sem `techOff` o Kokusen dá 15 (F31)
- [ ] Borda: carga 99 + ganho 3 → 100 com resto 0
- [ ] VSI-04: ativação e `reset()` zeram o resto
- [ ] VSI-07: o esvaziamento do `tick` igual com e sem `chargeMods`
- [ ] VRC-07: Santuário Nv 2 com carga 40 → `convert('amplificacao')` devolve `'santuario'`, dono Amplificação Nv 2
      com 40; mesmo id → `null`; sem Domínio → `null`
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): scale domain charge and convert the owned domain`

---

### T15: Reversa travada

**What**: `ReverseInput.locked?: boolean`; no ramo sem canalização, com `locked` o aperto novo emite `rctDenied` e sai
sem cura nem gasto; `held: false` continua saindo sem evento.
**Where**: `src/core/reverseCursed.ts`
**Teste par**: `tests/core/reverseLock.test.ts` (novo)
**Depends on**: None
**Reuses**: `update` de `src/core/reverseCursed.ts:56-90`
**Requirement**: VSI-05, VSI-06, VRC-05

**Done when**:

- [ ] VSI-05: `locked` + aperto → `rctDenied` uma vez; segurar por 60 quadros não repete; soltar e apertar → de novo;
      nenhum `rctStart`, energia e vida iguais
- [ ] VSI-06: sem `locked`, igual ao `tests/core/reverseCursed.test.ts` (verde sem mudança)
- [ ] VRC-05: `held: false` por 60 quadros não emite evento nenhum
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): let the reverse technique be locked`

---

## Phase 4: Adaptadores do passo 0

### T16: StatsDirector grava os números novos dos votos

**What**: o `StatsDirector.sync` grava `loadout.reveal`, `loadout.kokusenScale.energyBonus`,
`loadout.axes.weaponPointBonus` e `domain.state.chargeMods` da folha; o `reset` grava os neutros; o snapshot `stats`
ganha `domainChargeMul` (tipo em `powerSnapshot.ts` e literal no `debugApi.test.ts`).
**Where**: `src/scenes/test/statsDirector.ts`
**Também**: `src/game/powerSnapshot.ts` (tipo), `tests/game/debugApi.test.ts`
**Depends on**: T9, T10, T11, T13, T14
**Reuses**: `sheet`, `sync`, `snapshotFields` (F29)
**Requirement**: VDB-02, VQA-02, VQA-03, VSI-01 (caminho), VRC-06 (caminho)

**Done when**:

- [ ] `stats.domainChargeMul` 1 no snapshot de uma run sem voto
- [ ] `grep` mostra o `StatsDirector` como único escritor dos 4 alvos novos
- [ ] Smokes `power`, `kokusen`, `domain` verdes, iguais ao antes
- [ ] TestScene sem linha efetiva nova
- [ ] Gate verde; contagem anotada

**Tests**: smoke
**Gate**: full
**Commit**: `feat(stats): write the vow numbers to their owners`

---

### T17: Reversa lê a ausência e a trava dos votos

**What**: no `recovery.update`, `held: input.reverseHeld && !fx.rctGone` e `locked: fx.rctLockedInDomain &&
build.domain.state.active !== null`.
**Where**: `src/scenes/test/recovery.ts`
**Depends on**: T7, T15
**Reuses**: leitura de `this.s.vows.effects` em `src/scenes/test/recovery.ts:62-64`
**Requirement**: VRC-05, VSI-05

**Done when**:

- [ ] Sem voto novo, smokes `defense` e `domain` verdes, iguais ao antes
- [ ] Gate verde; contagem anotada

**Tests**: smoke
**Gate**: full
**Commit**: `feat(recovery): pass the vow lock to the reverse technique`

---

### T18: Loja sorteada depois do painel de votos

**What**: `shopDirector.startShop(round)` cria a `Shop` com o mesmo `shopRng` e segue para o painel de escolha e a loja;
o `openShop` com painel de votos aberto **não** cria a `Shop`, e o `updateVowPanel` chama `startShop` depois de tomar
ou recusar; sem painel, o `openShop` chama o mesmo método. O `round` fica num campo privado.
**Where**: `src/scenes/test/shopDirector.ts`
**Depends on**: T5
**Reuses**: `src/scenes/test/shopDirector.ts:118-157`
**Requirement**: VEL-12

**Done when**:

- [ ] `grep` confirma que nenhum smoke lê `shop.offers` com o painel de votos aberto (design, "Risks")
- [ ] Mesma seed, recusando o voto: as cartas iguais às de antes da task (registradas no smoke `vows` antes da mudança)
- [ ] Smokes `vows`, `shop`, `choice-panel`, `run-loop` verdes
- [ ] Gate verde; contagem anotada

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(shop): draw the shop cards after the vow panel`

---

### T19: VowDirector com contexto, debug e elegíveis

**What**: `VowDirector.context()` real (slot 0, técnica com `kokusenDamage > 0`, Domínio possuído, `'amplificacao' in
DOMAINS`); `applyDebug()` lê `?debug&vows=` (sai do `reset`), toma pelo `take(id)` ignorando a elegibilidade e ignora
id desconhecido; `take(id)` toma e chama `stats.sync()`; snapshot `vows.eligible`. O `runDirector.resetRun` chama
`vows.applyDebug()` depois do `domain=` e antes do `stats.reset()`; tipo `eligible` em `debugApi.ts` e no literal do
teste.
**Where**: `src/scenes/test/vowDirector.ts`
**Também**: `src/scenes/test/runDirector.ts` (+1), `src/game/debugApi.ts`, `tests/game/debugApi.test.ts`
**Depends on**: T4, T5, T7
**Reuses**: `reset`, `openPanel`, `choose` de hoje; padrão dos aplicadores de debug do `resetRun`
**Requirement**: VDB-01, VDB-03, VEL-02 (contexto), VEL-11

**Done when**:

- [ ] `?debug&vows=furia,naoExiste,peleDePedra` toma Fúria e Pele de pedra nessa ordem
- [ ] `vows.eligible` lista os 8 menos os tomados, na ordem do catálogo
- [ ] Os smokes do passo 0 verdes, iguais ao antes: `vows`, `shop`, `power`, `build`, `kokusen`, `tech`, `defense`,
      `run-loop`, `choice-panel`, `domain`
- [ ] TestScene sem linha efetiva nova
- [ ] Gate verde; contagem anotada

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(vows): build the draw context and apply the debug vows last`

---

## Phase 5: Expediente e Corpo emprestado (passo 1)

### T20: Expediente

**What**: `expediente` no catálogo (depois dos 8; nome, ganho e custo das Assumptions; `VOW.expediente = { threshold:
10, before: 0.75, after: 1.4 }`), `expedienteFactor(activeKills)` exportado (1 com `null`, VEX-04), o bloco no
`applyNewVows` (`damageMul *= expedienteFactor(activeKills)`) e sempre elegível.
**Where**: `src/core/vows.ts`
**Também**: `src/data/vows.ts`, `src/core/vowEligibility.ts`
**Teste par**: `tests/core/vowsNew.test.ts` (novo), `tests/data/vows.test.ts` (novo), `tests/core/vowEligibility.test.ts`
**Depends on**: T19
**Reuses**: bloco da Fúria em `src/core/vows.ts`
**Requirement**: VEX-01, VEX-02, VEX-03, VEX-04, VEL-01, VEL-08, VQA-01

**Done when**:

- [ ] VEX-01/02 nos dois lados: `activeKills` 9 → ×0,75; 10 → ×1,4
- [ ] VEX-03: Fúria + 10 abates → `damageMul` 1,3 × 1,4
- [ ] VEX-04: `activeKills` `null` com `kills` 15 → fator 1 (chefe, travessia e konbini)
- [ ] VEL-01: ids presentes na ordem do VEL-01 filtrada; VQA-01: números só em `VOW`; textos da carta iguais às
      Assumptions
- [ ] O fixture da T2 igual (sem o voto)
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(vows): add the Expediente vow`

---

### T21: Corpo emprestado

**What**: `corpoEmprestado` no catálogo (depois do `expediente`; `VOW.corpoEmprestado = { pool: 8, talents: 7,
maxHpMul: 0.75 }`), o bloco (`maxHpMul *= 0.75`, `pool.total`/`pool.talents` pelo maior valor) e sempre elegível.
**Where**: `src/core/vows.ts`
**Também**: `src/data/vows.ts`, `src/core/vowEligibility.ts`
**Teste par**: `tests/core/vowsNew.test.ts`, `tests/data/vows.test.ts`
**Depends on**: T20
**Reuses**: bloco do Corpo de vidro
**Requirement**: VCE-01, VCE-02, VCE-03, VEL-01, VEL-08, VQA-01

**Done when**:

- [ ] VCE-02: pool 8/3/7 com o voto; 7/3/6 sem
- [ ] VCE-03: com Corpo de vidro, `maxHpMul` 0,45; vida 100 → máximo 75 só com o Corpo emprestado
- [ ] Ordem do catálogo e números em `VOW` conferidos
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(vows): add the Corpo emprestado vow`

---

### T22: Loja lê os limites do pool

**What**: `ShopContext.poolLimits(): PoolLimits`; `shop.buy`, `view`, `shopEligibility` e a carta 1 do `shopDraw`
passam o limite a cada `canAdd*`/`vacancyTag`.
**Where**: `src/core/shop.ts`
**Também**: `src/core/shopEligibility.ts`, `src/core/shopDraw.ts` (recebem o limite do contexto)
**Teste par**: `tests/core/shop.test.ts` e os `tests/core/shopDraw*.test.ts` da F30/F35
**Depends on**: T8
**Reuses**: `canAddTechnique`, `canAddTalent`, `vacancyTag` com limite (T8)
**Requirement**: VCE-01, VCE-05

**Done when**:

- [ ] Contexto com `POOL` → testes da loja iguais
- [ ] Limite 8/3/7: 7º talento à venda com 1 técnica e 6 talentos; compra do 8º talento → `reason: 'pool'`
- [ ] Carta com `OCUPA VAGA 1/8→2/8` com o limite 8
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(shop): read the pool limits from the shop context`

---

### T23: Barra da build com o limite

**What**: `buildBarText` mostra `Habilidades a/N (Técnicas t/T)` com o limite recebido.
**Where**: `src/core/buildTray.ts`
**Teste par**: `tests/core/buildTray.test.ts`
**Depends on**: T8
**Reuses**: `buildBarText` (F35)
**Requirement**: VCE-01, VCE-05

**Done when**:

- [ ] Padrão `POOL` → texto da F35 igual
- [ ] Limite 8/0/8 → o texto do design (`Habilidades 1/8 (Técnicas 0/0)`); 8/3/7 → `Habilidades a/8 (Técnicas t/3)`
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): show the vow pool limits in the build bar`

---

### T24: Loja da konbini com os limites dos votos

**What**: `startShop` passa `poolLimits: () => this.s.vows.effects.pool` no contexto da `Shop`.
**Where**: `src/scenes/test/shopDirector.ts`
**Depends on**: T18, T21, T22
**Reuses**: `startShop` (T18)
**Requirement**: VCE-01, VCE-05

**Done when**:

- [ ] Sem voto, smokes `shop`, `vows` verdes, iguais ao antes
- [ ] Gate verde; contagem anotada

**Tests**: smoke
**Gate**: full
**Commit**: `feat(shop): pass the vow pool limits to the konbini`

---

### T25: Pool da build com o tamanho dos votos

**What**: o `BuildDirector` usa o limite dos votos no `applyDebugBuild` (`canAddTalent(p, limits)`), no
`buildBarText` e no snapshot `build.pool.total`; `PoolSnapshot.total` vira `number` (era o literal `7`).
**Where**: `src/scenes/test/buildDirector.ts`
**Também**: `src/game/buildSnapshot.ts` (tipo), `tests/game/debugApi.test.ts`
**Depends on**: T21, T23
**Reuses**: `snapshot` do `BuildDirector` (F35)
**Requirement**: VCE-01, VCE-05

**Done when**:

- [ ] Sem voto, `build.pool.total` 7; smokes `build`, `build-bar` verdes, iguais ao antes
- [ ] Gate verde; contagem anotada

**Tests**: smoke
**Gate**: full
**Commit**: `feat(build): size the pool from the vow limits`

---

### T26: Smoke dos votos novos, passo 1

**What**: `scripts/smoke/vows-new.smoke.mjs` (`?debug&hd=1&area=modular`) com os cenários 1 (elegibilidade: sem
técnica, `vows.eligible` sem `votoDeSilencio`; com a r5 vencida, o painel abre com os elegíveis), 2 (Expediente) e 3
(Corpo emprestado) do design.
**Where**: `scripts/smoke/vows-new.smoke.mjs`
**Depends on**: T24, T25
**Reuses**: `scripts/smoke/fight-kit.mjs`, `lib.ts`, `vows.smoke.mjs`
**Requirement**: VEX-01, VEX-02, VEX-04, VCE-03, VCE-04, VCE-05

**Done when**:

- [ ] Expediente (`vows=expediente&round=4`, cota 12; a r2 tem cota 8 e fecha antes do 11º abate): golpe forte antes
      do 10º abate tira `round(base × 0,75)`; depois do 10º, `round(base × 1,4)`
- [ ] VEX-04 (`vows=expediente&round=5`): o golpe forte no chefe tira `round(base × 1)`
- [ ] Corpo emprestado (`vows=corpoEmprestado&tech=vermelho`): `build.pool.total` 8; carta de item novo com
      `OCUPA VAGA 1/8→2/8`; vida máxima 75% da sem voto; vida acima do novo teto cai ao teto (VCE-04)
- [ ] Smokes `vows-new`, `vows`, `shop`, `build-bar`, `build` verdes
- [ ] Gate verde; contagem anotada

**Tests**: smoke
**Gate**: full
**Commit**: `test(smoke): cover the Expediente and Corpo emprestado vows`

---

## Phase 6: Revelação da técnica (passo 2)

### T27: Revelação da técnica

**What**: `revelacao` no catálogo (antes do `expediente`; `VOW.revelacao = { damageMul: 1.4, radiusMul: 1.2,
signMs: 150 }`), o bloco (`reveal = { 1.4, 1.2, 150 }`) e a elegibilidade (técnica no slot 0 e teto de técnicas
acima de 0).
**Where**: `src/core/vows.ts`
**Também**: `src/data/vows.ts`, `src/core/vowEligibility.ts`
**Teste par**: `tests/core/vowsNew.test.ts`, `tests/core/vowEligibility.test.ts`, `tests/data/vows.test.ts`
**Depends on**: T11, T21
**Reuses**: `RevealMods` (T6)
**Requirement**: VEL-01, VEL-03, VRV-01, VRV-02, VRV-03, VQA-01

**Done when**:

- [ ] VEL-03 nos dois lados: com slot 0 → elegível; sem → não
- [ ] `vowEffects(['revelacao'])` → `reveal` 1,4/1,2/150
- [ ] Ordem do catálogo (`revelacao`, `expediente`, `corpoEmprestado`) conferida
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(vows): add the technique reveal vow`

---

### T28: Kanji da Revelação em HD

**What**: `src/game/art/hd/revealKanji.ts` (novo): folha HD de 1 quadro 16×16 texels com o `術` em índices de uma
tabela de cores da `PALETTE` (miolo `U`, contorno `k`), registrada em `art/index.ts` como `TEX.revealKanji`.
**Where**: `src/game/art/hd/revealKanji.ts`
**Também**: `src/game/art/index.ts` (registro)
**Teste par**: testes de paleta e registro em `tests/game/art/`
**Depends on**: None
**Reuses**: molde do `src/game/art/hd/talentIcons.ts` (F35), `HdSheet` de `src/game/art/hd/sheet.ts`
**Requirement**: VRV-06

**Tools**:

- Skill: NONE; prancha por `node tools/hd-boards.mjs` (saída em `.fable-out/`)

**Done when**:

- [ ] Só cores da `PALETTE`; teste de paleta verde
- [ ] Prancha olhada; o `術` legível a 1 texel = 1 px
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(art): draw the reveal kanji`

---

### T29: Vista do kanji sobre a cabeça

**What**: `src/game/RevealMark.ts` (novo): `Image` com `TEX.revealKanji` acima do player, câmera do mundo (AD-003);
`update(visible, at)` em `at.y − REVEAL_MARK.headPx`, sem fade; `debug()` lido do objeto vivo; `destroy()`.
**Where**: `src/game/RevealMark.ts`
**Teste par**: `tests/game/revealMark.test.ts` (novo, cena falsa)
**Depends on**: T28
**Reuses**: padrão das vistas sob demanda (`recovery.reverseAura()`); cena falsa do `tests/game/vowPanel.test.ts`
**Requirement**: VRV-06

**Done when**:

- [ ] `update(true, {x, y})` → imagem visível em `(x, y − headPx)`; `update(false, …)` → escondida; `debug()` lê a
      imagem (L-076)
- [ ] `REVEAL_MARK.headPx` em `src/data/vows.ts`
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(game): add the reveal mark view`

---

### T30: Kanji durante o sinal da técnica do slot 0

**What**: `VowDirector.revealUpdate(dt, cast)` mostra o `RevealMark` (criado sob demanda, renasce com a cena nova) só
com `revelacao` tomado, `cast?.slot === 0` e `cast.state === 'sign'`, preso a `player.renderPos`; o `techDirector`
chama depois do `techRunner.update` (+1); snapshot `vows.reveal` (tipo e literal do `debugApi`).
**Where**: `src/scenes/test/vowDirector.ts`
**Também**: `src/scenes/test/techDirector.ts` (+1), `src/game/debugApi.ts`, `tests/game/debugApi.test.ts`
**Depends on**: T19, T27, T29
**Reuses**: `ActiveCastView` (F33/F34), `player.renderPos` (AD-019)
**Requirement**: VRV-05, VRV-06

**Done when**:

- [ ] Smokes `tech`, `techniques` verdes, iguais ao antes sem o voto
- [ ] TestScene sem linha efetiva nova
- [ ] Gate verde; contagem anotada

**Tests**: smoke
**Gate**: full
**Commit**: `feat(vows): show the reveal kanji while the first slot signs`

---

### T31: Vistas das técnicas leem o raio do cast

**What**: no começo, `grep` por `TECH_GEOMETRY` e números de raio em `src/game/techFx/` e `src/game/tech/`; cada vista
ou sensor que ainda lê raio de constante passa a ler o `radius` do `TechStats` do cast (a F30 fez o Vermelho e o
Azul; o passo confere o Roxo e as da F34). Uma linha por vista; a lista do `grep` vai no `Done when`.
**Where**: `src/game/techFx/` (vistas listadas pelo `grep`)
**Depends on**: T11
**Reuses**: leitura do `radius` feita pela F30 no Vermelho e no Azul
**Requirement**: VRV-07

**Done when**:

- [ ] Lista do `grep` anotada; nenhuma vista de técnica com raio de constante
- [ ] Smokes `tech`, `red-anime`, `tech-axes`, `techniques`, `fxlab` verdes, iguais ao antes
- [ ] Gate verde; contagem anotada

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(tech): read every technique radius from the cast stats`

---

### T32: Smoke da Revelação

**What**: cenário 4 do design no `vows-new.smoke.mjs` e conferência em HD dos dois lados.
**Where**: `scripts/smoke/vows-new.smoke.mjs`
**Depends on**: T30, T31
**Reuses**: cenários da T26
**Requirement**: VRV-01, VRV-02, VRV-03, VRV-06, VRV-07

**Done when**:

- [ ] `vows=revelacao&tech=vermelho,azul`: `build.vermelho.stats.radius` 115 e `touch` 42; o sensor e a esfera do
      Vermelho com 115 em `techObjects` (L-043); o Azul igual ao sem voto
- [ ] `L` mostra `vows.reveal.visible` no sinal e esconde no `charge`; com `elapsedMs` 300 o cast ainda está em `sign`
- [ ] Captura em HD, parado e correndo, para os dois lados; o kanji acompanha a cabeça sem atraso
- [ ] Smokes `vows-new`, `tech`, `red-anime` verdes
- [ ] Gate verde; contagem anotada

**Tests**: smoke
**Gate**: full
**Commit**: `test(smoke): cover the technique reveal vow`

---

## Phase 7: Voto do Black Flash (passo 3)

### T33: Voto do Black Flash

**What**: `votoBlackFlash` no catálogo (depois do `restricaoCelestial` quando ele existir, hoje depois da `revelacao`;
`VOW.votoBlackFlash = { windowMs: 20, energy: 15, outsideZoneMul: 0.8 }`), o bloco (`kokusenWindowMs += 20`,
`kokusenEnergy += 15`, `meleeMul *= 0.8` sem `zone`) e a elegibilidade (`ctx.kokusenTech`).
**Where**: `src/core/vows.ts`
**Também**: `src/data/vows.ts`, `src/core/vowEligibility.ts`
**Teste par**: `tests/core/vowsNew.test.ts`, `tests/core/vowEligibility.test.ts`, `tests/core/vowsDraw.test.ts`,
`tests/core/statSheetVows.test.ts`
**Depends on**: T9, T12, T27
**Reuses**: `buildEffects` (T9), `kokusenScale.energyBonus` (T11, T12)
**Requirement**: VEL-01, VEL-05, VBF-01, VBF-02, VBF-03, VBF-04, VBF-05, VQA-01

**Done when**:

- [ ] VEL-05: 1000 seeds sem `kokusenTech` nunca sorteiam o voto; com ele sorteiam
- [ ] VBF-03/04: `zone` falso → `meleeMul` × 0,8; verdadeiro → sem o fator; `techDamageMul` igual nos dois
- [ ] VBF-01: `buildEffects` com o voto → 20; com Zona Negra Nv 1 → 30; Nv 3 → 30
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(vows): add the Black Flash vow`

---

### T34: Smoke do Black Flash

**What**: cenário 5 do design no `vows-new.smoke.mjs`, e o cenário 1 passa a esperar `votoBlackFlash` em
`vows.eligible` com `tech=divergente` e ausente sem técnica.
**Where**: `scripts/smoke/vows-new.smoke.mjs`
**Depends on**: T33
**Reuses**: `kokusen.smoke.mjs` (provocar o Kokusen)
**Requirement**: VEL-05, VBF-01, VBF-02, VBF-03, VBF-04

**Done when**:

- [ ] `tech=divergente&vows=votoBlackFlash`: `stats.kokusenWindowBonusMs` 20; `kokusen.windowMs` 20 maior que sem o
      voto; `stats.meleeMul` 20% menor fora da Zona
- [ ] Depois de um Kokusen: Zona ativa tira o fator; a energia sobe `kokusenGain + 15` (corta no máximo)
- [ ] Smokes `vows-new`, `kokusen`, `talents`, `fight` verdes
- [ ] Gate verde; contagem anotada

**Tests**: smoke
**Gate**: full
**Commit**: `test(smoke): cover the Black Flash vow`

---

## Phase 8: Voto de silêncio (passo 4)

### T35: Voto de silêncio

**What**: `votoDeSilencio` no catálogo (último; `VOW.votoDeSilencio = { chargeMul: 1.5 }`), o bloco
(`domainChargeMul *= 1.5`, `techChargeOff`, `rctLockedInDomain`) e a elegibilidade (`ctx.ownsDomain`).
**Where**: `src/core/vows.ts`
**Também**: `src/data/vows.ts`, `src/core/vowEligibility.ts`
**Teste par**: `tests/core/vowsNew.test.ts`, `tests/core/vowEligibility.test.ts`, `tests/core/vowsDraw.test.ts`
**Depends on**: T14, T17, T33
**Reuses**: `chargeGain` (T14), `locked` da Reversa (T15, T17)
**Requirement**: VEL-01, VEL-06, VSI-01, VSI-03, VSI-05, VQA-01

**Done when**:

- [ ] VEL-06: 1000 seeds sem Domínio nunca sorteiam o voto; com Domínio sorteiam
- [ ] `vowEffects(['votoDeSilencio'])` → 1,5, `techChargeOff`, `rctLockedInDomain`
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(vows): add the silence vow`

---

### T36: Resto da carga no snapshot do Domínio

**What**: `DomainSnapshot.chargeCarry: number` lido do `DomainState`; literal do `debugApi.test.ts`.
**Where**: `src/game/domainSnapshot.ts`
**Também**: `tests/game/debugApi.test.ts`
**Depends on**: T14
**Reuses**: `DomainSnapshot` (F31)
**Requirement**: VSI-01, VSI-04

**Done when**:

- [ ] Literal do snapshot com `domain.chargeCarry`
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(debug): report the domain charge carry`

---

### T37: Smoke do Silêncio

**What**: cenário 6 do design no `vows-new.smoke.mjs`.
**Where**: `scripts/smoke/vows-new.smoke.mjs`
**Depends on**: T35, T36
**Reuses**: `domain.smoke.mjs` (`P` ativa)
**Requirement**: VSI-01, VSI-02, VSI-03, VSI-05, VSI-06

**Done when**:

- [ ] `domain=amplificacao&charge=0&vows=votoDeSilencio`: 2 leves → `domain.charge` 3 e `chargeCarry` 0; uma
      conjuração que acerta não muda a carga
- [ ] `charge=100`, `P`, segurar a Reversa → `rctDenied` e nenhum `rctStart`; depois do Domínio a Reversa canaliza
- [ ] Smokes `vows-new`, `domain`, `defense` verdes
- [ ] Gate verde; contagem anotada

**Tests**: smoke
**Gate**: full
**Commit**: `test(smoke): cover the silence vow`

---

## Phase 9: Restrição celestial, regras e fontes (passo 5)

### T38: Restrição celestial

**What**: `restricaoCelestial` no catálogo (depois da `revelacao`; `VOW.restricaoCelestial = { meleeMul: 1.4, pool:
8, talents: 8, techniques: 0, refund: 0.5, weaponPoints: 1 }` e `VOW_BANNER`), o bloco (`meleeMul *= 1.4`, pool
8/0/8 pelo maior valor e técnicas 0, `rctGone`, `weaponPointBonus += 1`) e a elegibilidade (`ctx.amplificationExists`;
com ela tomada saem `corpoEmprestado`, `pactoDoFeiticeiro`, `fluxoSelado`, `curaProibida` e `votoDeSilencio`; a `revelacao` sai pelo
VEL-03, com o teto de técnicas 0).
**Where**: `src/core/vows.ts`
**Também**: `src/data/vows.ts`, `src/core/vowEligibility.ts`
**Teste par**: `tests/core/vowsNew.test.ts`, `tests/core/vowEligibility.test.ts`, `tests/core/vowsDraw.test.ts`,
`tests/data/vows.test.ts`
**Depends on**: T13, T21, T33, T35
**Reuses**: bloco do Corpo emprestado (T21)
**Requirement**: VEL-01, VEL-04, VEL-07, VRC-03, VRC-04, VRC-05, VRC-06, VQA-01

**Done when**:

- [ ] VEL-04 nos dois lados (`amplificationExists` falso → nunca; verdadeiro → sai)
- [ ] VEL-07: com a Restrição tomada os 5 nunca saem em 1000 seeds (o Silêncio incluído); `locked: ['restricaoCelestial']` não corta
      nenhum; VEL-03 com a Restrição tomada → Revelação fora
- [ ] Restrição → pool 8/0/8, `meleeMul` × 1,4, `rctGone`, `weaponPointBonus` 1; com o Corpo emprestado → 8/0/8
- [ ] VEL-01: os 14 ids na ordem final
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(vows): add the heavenly restriction vow`

---

### T39: Opções do Baú do Véu com a Restrição

**What**: `veilOptions(pair, restricted)` → `['amplificacao']` com a Restrição, o par sem ela; o `drawVeil` continua
consumindo o `chestRng` igual.
**Where**: `src/core/veilChest.ts`
**Teste par**: `tests/core/veilOptions.test.ts` (novo)
**Depends on**: None
**Reuses**: `drawVeil` (F31)
**Requirement**: VRC-08

**Done when**:

- [ ] Com e sem a Restrição; o `rng` consumido igual nos dois casos
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): offer only Amplification in the veil chest under restriction`

---

### T40: Saída de técnica sem devolução na bandeja

**What**: a limpeza do ABD-03 sai do `abandon` para `dropTechnique(slot): number` (devolve o `ledger.spent` antes de
limpar o livro); o `abandon` chama ele e aplica os 40% (0 linha líquida).
**Where**: `src/scenes/test/trayDirector.ts`
**Depends on**: T25
**Reuses**: `abandon`, `spentLedger` (F35)
**Requirement**: VRC-01

**Done when**:

- [ ] Abandonar igual ao antes: smoke `build-bar` e o cenário de abandono da F35 verdes, iguais
- [ ] Gate verde; contagem anotada

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(tray): split the technique drop out of the abandon`

---

### T41: Domínio sob a Restrição

**What**: `domainDirector.choicePages()` monta a página do Véu com `veilOptions(pair, vows.has('restricaoCelestial'))`
(uma opção, `Enter` toma); o `confirm('veu')` lê o id da mesma lista; `convertTo(id)` repassa ao `state.convert`;
nenhuma fonte oferece Domínio que não a Amplificação, e o nível do baú do chefe e da carta `dominio` sobe a dona.
**Where**: `src/scenes/test/domainDirector.ts`
**Depends on**: T38, T39
**Reuses**: `ChoicePage` de 1 opção (F33), `choicePages`, `confirm` (F31)
**Requirement**: VRC-07, VRC-08, VRC-09

**Done when**:

- [ ] Sem a Restrição, smokes `domain`, `choice-panel` verdes, iguais ao antes
- [ ] Gate verde; contagem anotada

**Tests**: smoke
**Gate**: full
**Commit**: `feat(domain): keep only Amplification under the heavenly restriction`

---

### T42: Garantia da carta 1 respeita o pool

**What**: a garantia "sem técnica → técnica nova" da carta 1 só vale com `canAddTechnique(pool, limits)`.
**Where**: `src/core/shopDraw.ts`
**Teste par**: `tests/core/shopDraw*.test.ts` (F30/F35)
**Depends on**: T22
**Reuses**: limite do contexto (T22)
**Requirement**: VRC-03

**Done when**:

- [ ] Limite 8/0/8 sem técnica: nenhuma carta de técnica em 1000 seeds
- [ ] Limite `POOL` sem técnica: a garantia de hoje (testes da F30/F35 iguais)
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: quick
**Commit**: `fix(shop): skip the technique guarantee when no technique fits`

---

### T43: Moldura da arma no Nv 5

**What**: o `frameFor` da arma usa a moldura roxa no Nv 4 **ou mais** (o Nv 5 da Restrição usa a do Nv 4).
**Where**: `src/core/shopPreview.ts`
**Teste par**: `tests/core/weaponShop.test.ts` (F36)
**Depends on**: T13
**Reuses**: `frameFor` (F36)
**Requirement**: VRC-06

**Done when**:

- [ ] Nv 5 → moldura do Nv 4; a carta do 4º ponto lê `Nv 4→5`
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: quick
**Commit**: `fix(core): keep the top weapon frame past level 4`

---

### T44: Receita da arma no Nv 5

**What**: a receita pronta de evolução da arma compara `>= 4` onde comparava `=== 4`.
**Where**: `src/core/weaponEvolution.ts`
**Teste par**: `tests/core/weaponShop.test.ts` (F36)
**Depends on**: T13
**Reuses**: receita do WEV-01 (F36)
**Requirement**: VRC-06

**Done when**:

- [ ] Arma Nv 5 (`weaponPointBonus` 1) com a receita pronta; Nv 3 continua fora
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: quick
**Commit**: `fix(core): keep the weapon recipe ready past level 4`

---

## Phase 10: Restrição celestial, tomar, painel e fechamento (passo 5)

### T45: Efeito de tomar a Restrição

**What**: `src/scenes/test/vowTake.ts` (novo) com `VowTake.apply(id)`: na Restrição, `dropTechnique` de cada slot
ocupado (0 a 2), `wallet.add(floor(0.5 × gasto))` uma vez com o evento `restriction:<n>`, `convertTo('amplificacao')`
com a faixa `VOW_BANNER.domainConvert` por `RUN.bannerMs` e o evento `domainConvert:<from>`; o `VowDirector.take`
chama `taker.apply(id)` antes do `stats.sync()`.
**Where**: `src/scenes/test/vowTake.ts`
**Também**: `src/scenes/test/vowDirector.ts` (`take`, +2)
**Depends on**: T19, T40, T41
**Reuses**: `dropTechnique` (T40), `convertTo` (T41), `hud.banner`
**Requirement**: VRC-01, VRC-02, VRC-07, VRC-10, VDB-03

**Done when**:

- [ ] `?debug&tech=vermelho&domain=santuario:2&vows=restricaoCelestial`: slots vazios, `restriction:0`,
      `domain.owned` `{ amplificacao, 2 }`, `domainConvert:santuario` (VDB-03, fonte grátis)
- [ ] `vows=restricaoCelestial` sem técnica nem Domínio → `restriction:0`, sem faixa (VRC-10)
- [ ] Smokes `vows`, `domain`, `build-bar` verdes
- [ ] TestScene sem linha efetiva nova
- [ ] Gate verde; contagem anotada

**Tests**: smoke
**Gate**: full
**Commit**: `feat(vows): strip techniques and convert the domain on restriction`

---

### T46: Cartas do painel com o nome longo

**What**: o `VowPanel.show` cai para 12 px o nome que não cabe em uma linha na largura `CARD_W − 14`; `get lines()`
lê do `Text` vivo as linhas de nome, ganho e custo; o `VowDirector.snapshot` expõe `vows.panelLines` (tipo e literal
do `debugApi`).
**Where**: `src/game/VowPanel.ts`
**Também**: `src/scenes/test/vowDirector.ts` (`snapshot`), `src/game/debugApi.ts`, `tests/game/debugApi.test.ts`
**Teste par**: `tests/game/vowPanel.test.ts`
**Depends on**: T38
**Reuses**: `buildCard`, `show` (`src/game/VowPanel.ts:91-117`)
**Requirement**: VQA-05, VDB-01

**Done when**:

- [ ] Com `Text` falso: nome que quebra → 12 px; nome que cabe → 14 px (os de hoje iguais); `lines` lido do objeto
- [ ] Cores continuam chaves da `PALETTE`
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(vows): fit long vow names on the card`

---

### T47: README dos votos novos

**What**: o `README.md` lista os 6 ids novos em `vows=` e os eventos `restriction:<refund>`, `domainConvert:<from>` e
`expediente:on` (este último emitido a partir da T55).
**Where**: `README.md`
**Depends on**: None
**Reuses**: seção de parâmetros de debug
**Requirement**: VDB-04

**Done when**:

- [ ] Ids e eventos listados; `npm run format:check` verde
- [ ] Gate verde

**Tests**: none (docs: a matriz diz none)
**Gate**: build
**Commit**: `docs(readme): list the new vow ids and events`

---

### T48: Smoke da Restrição

**What**: cenário 7 do design no `vows-new.smoke.mjs`.
**Where**: `scripts/smoke/vows-new.smoke.mjs`
**Depends on**: T45
**Reuses**: `shop.smoke.mjs` (compra na konbini), `vows.smoke.mjs` (tomar no painel)
**Requirement**: VRC-01, VRC-02, VRC-03, VRC-05, VRC-07

**Done when**:

- [ ] `tech=vermelho&domain=santuario:2&fragments=200`: compra um ponto do Vermelho na r3, vence o chefe da r5 e toma
      a Restrição no painel: slots vazios; carteira + `floor(0,5 × gasto)` e `restriction:<n>`; `domain.owned`
      `{ amplificacao, 2 }` e `domainConvert:santuario`; a loja aberta em seguida sem carta de técnica;
      `build.pool.total` 8; segurar a Reversa sem nenhum `rct*`
- [ ] Smokes `vows-new`, `vows`, `shop`, `shop-axes`, `choice-panel`, `weapon-imbued` verdes
- [ ] Gate verde; contagem anotada

**Tests**: smoke
**Gate**: full
**Commit**: `test(smoke): cover the heavenly restriction vow`

---

### T49: Smoke das cartas do painel e fechamento

**What**: cenário 8 do design no `vows-new.smoke.mjs` (duas runs que põem os 6 votos novos no painel e conferem
`vows.panelLines` com nome 1 e ganho/custo ≤ 2); fechamento: `grep` do VQA-02, contagem do VQA-04 e a lista de smokes
do fim da F40.
**Where**: `scripts/smoke/vows-new.smoke.mjs`
**Depends on**: T46, T48
**Reuses**: seed achada com a lógica do `tests/core/vowsDraw.test.ts` e escrita no smoke
**Requirement**: VQA-02, VQA-04, VQA-05

**Done when**:

- [ ] Run (a): sobram exatamente Restrição, Black Flash e Silêncio; run (b): a seed fixa mostra Revelação, Expediente
      e Corpo emprestado; `panelLines` 1/≤2/≤2 nas 6 cartas (a nota entra na T51 e é conferida na T56); captura em HD
      olhada
- [ ] VQA-02: `grep` de `damageMul =`, `vowDamageMul =`, `costMul =`, `damageTakenMul =` e `setMaxHp(` em
      `src/scenes/` só no `StatsDirector`
- [ ] VQA-04: `TestScene.ts` com as mesmas linhas efetivas da T1; `.oxlintrc.json` sem exceção nova
- [ ] Smokes do fim da F40 verdes: `vows-new`, `vows`, `shop`, `shop-axes`, `build`, `build-bar`, `power`, `kokusen`,
      `talents`, `tech`, `techniques`, `tech-axes`, `red-anime`, `fxlab`, `fight`, `defense`, `domain`,
      `choice-panel`, `weapon-imbued`, `run-loop`
- [ ] Gate verde; contagem anotada

**Tests**: smoke
**Gate**: full
**Commit**: `test(smoke): check every new vow card on the panel`

---

## Phase 11: Legibilidade dos votos (passo 6)

### T50: Texto das cartas de voto

**What**: `src/core/vowCards.ts` (novo) com `CardContext`, `VowCard`, `vowCard(id, ctx, fresh)` e
`restrictionRefund(spent)`; em `data/vows.ts`, `VowDef.note?`, a nota fixa do Expediente (`não vale no chefe`), os
moldes `{tech}` (ganho da Revelação) e `{refund}` (custo da Restrição) e `VOW_NOTES` (`{domain} → Amplificação`,
`Kokusen não carrega`).
**Where**: `src/core/vowCards.ts`
**Também**: `src/data/vows.ts`
**Teste par**: `tests/core/vowCards.test.ts` (novo), `tests/data/vows.test.ts`
**Depends on**: T27, T38
**Reuses**: `VOWS` (`data/vows.ts`), a conta da devolução do VRC-02
**Requirement**: VRV-08, VRC-11, VQA-05

**Done when**:

- [ ] VRV-08: `{tech}` com `Boogie Woogie` → `Boogie Woogie: +40% dano e +20% raio`
- [ ] VRC-11: gasto 47 → `devolve 23`; nota `Santuário → Amplificação` com Santuário; sem nota com Amplificação e sem
      Domínio
- [ ] Nota do Expediente sempre; nota do Silêncio só com `kokusenTech`; os 8 de hoje com o texto de hoje e nota `null`
- [ ] `restrictionRefund(47)` 23, `(0)` 0; `?raw` sem `phaser`
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(vows): build the vow card text from the build`

---

### T51: Nota e Novo no painel de votos

**What**: `VowPanel.show(cards: readonly VowCard[])`; um `Text` de nota por carta (11 px, cor `hint`, em
`CARD_TOP + CARD_H + 4`, visível só com `note`); a dica desce para `CARD_H + 24`; a linha da tecla vira `n · Novo` com
`fresh`; `lines` ganha `note`; `get texts()` lido do `Text` vivo; o snapshot `vows.panelText` (tipo e literal do
`debugApi`).
**Where**: `src/game/VowPanel.ts`
**Também**: `src/game/debugApi.ts`, `tests/game/debugApi.test.ts`
**Teste par**: `tests/game/vowPanel.test.ts`
**Depends on**: T46, T50
**Reuses**: `buildCard`, `show`, `lines` (T46)
**Requirement**: VQA-05, VEL-13, VRV-08, VRC-11

**Done when**:

- [ ] Com `Text` falso: nota visível só com `note`; `1 · Novo` só com `fresh`; `texts` e `lines.note` lidos do objeto
- [ ] Os 8 de hoje desenham o mesmo texto de antes (nota escondida)
- [ ] Cores continuam chaves da `PALETTE`
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(vows): show the card note and the new tag on the vow panel`

---

### T52: Cartas montadas pela build

**What**: `VowDirector.get cards()` e `cardContext()` (nome da técnica do slot 0, devolução que a Restrição daria
agora pela soma dos livros das técnicas equipadas, Domínio possuído, `kokusenTech`); o `shopDirector.openShop` passa
`this.s.vows.cards` ao `vowPanel.show` no lugar do `map` de `VOWS`; o `VowTake.restrict` usa `restrictionRefund`.
**Where**: `src/scenes/test/vowDirector.ts`
**Também**: `src/scenes/test/shopDirector.ts`, `src/scenes/test/vowTake.ts`
**Depends on**: T45, T51
**Reuses**: `context()` (T19), livro de gastos da F35
**Requirement**: VRV-08, VRC-11

**Done when**:

- [ ] `vows=` com os 8 de hoje e `tech=vermelho` na r5: a carta da Revelação em `vows.panelText` diz
      `Vermelho: +40% dano e +20% raio`
- [ ] A carta da Restrição diz `devolve <n>` com o mesmo `n` que o `restriction:<n>` dá ao tomar
- [ ] Smokes `vows`, `vows-new`, `shop` verdes
- [ ] TestScene sem linha efetiva nova
- [ ] Gate verde; contagem anotada

**Tests**: smoke
**Gate**: full
**Commit**: `feat(vows): fill the vow cards from the current build`

---

### T53: Sorteio com o voto recém-liberado

**What**: `drawVows(rng, pool, count, fresh = null)`: com `fresh` na lista de elegíveis, ele é a 1ª oferta e o laço de
hoje sorteia as `count − 1` restantes sem ele; fora da lista, o sorteio de sempre.
**Where**: `src/core/vows.ts`
**Teste par**: `tests/core/vowsDraw.test.ts`
**Depends on**: T5
**Reuses**: molde do `drawStarter` da F39
**Requirement**: VEL-13, VEL-10

**Done when**:

- [ ] `fresh` elegível → 1ª oferta em 1000 seeds, nunca repetido nas outras 2
- [ ] `fresh` tomado, trancado ou inelegível → ofertas iguais às do sorteio sem `fresh` (mesma seed)
- [ ] `fresh` `null` → a lista da T3 igual
- [ ] Gate verde; contagem anotada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): put the freshly unlocked vow first in the draw`

---

### T54: Lista de votos recém-liberados

**What**: no `MetaDirector` (F39), o conteúdo liberado `kind: 'vow'` vai para o fim de `freshVows` (memória);
`freshVow()` e `markVowOffered(ids)`; snapshot `meta.freshVows`; o `VowDirector.openPanel` passa `meta.freshVow()` ao
`drawVows`, marca as ofertas e guarda o `freshOffered` que as `cards` leem.
**Where**: `src/scenes/test/metaDirector.ts`
**Também**: `src/scenes/test/vowDirector.ts`, `src/game/debugApi.ts` (ou o tipo à parte da F39), `tests/game/debugApi.test.ts`
**Depends on**: T52, T53
**Reuses**: `freshTechniques`/`markOffered` da F39
**Requirement**: VEL-13

**Done when**:

- [ ] `nosave=1&unlock=none`, sem técnica, vencer o chefe da r5 sem técnica: o painel abre com `vows.offers[0]`
      `restricaoCelestial`, `panelText[0].key` `1 · Novo`, e `meta.freshVows` fica vazio
- [ ] R e J mantêm a lista; recarregar a página a apaga
- [ ] Smokes `vows`, `meta` verdes
- [ ] Gate verde; contagem anotada

**Tests**: smoke
**Gate**: full
**Commit**: `feat(meta): offer the freshly unlocked vow on the next panel`

---

### T55: Expediente no contador de abates

**What**: `VowDirector.counterSuffix()` (` · -25%` ou ` · +40%` pelo `expedienteFactor`; `''` sem o voto, no chefe e
fora de rodada) e o evento `expediente:on` uma vez por rodada; o `hordeDirector.counterText()` (F38) acrescenta o
sufixo ao `Abates: k/q`.
**Where**: `src/scenes/test/vowDirector.ts`
**Também**: `src/scenes/test/hordeDirector.ts`
**Depends on**: T20
**Reuses**: `expedienteFactor` (T20), `counterText` (F38)
**Requirement**: VEX-05

**Done when**:

- [ ] `vows=expediente&round=4`: HUD `Abates: 9/12 · -25%`, depois `Abates: 10/12 · +40%`, um só `expediente:on`
- [ ] `round=5`: `Chefe` sem sufixo; sem o voto, `Abates: k/q` como na F38
- [ ] Smokes `hud`, `horde` verdes
- [ ] Gate verde; contagem anotada

**Tests**: smoke
**Gate**: full
**Commit**: `feat(vows): show the Expediente factor on the kill counter`

---

### T56: Smoke da legibilidade e fechamento

**What**: cenário 9 do design no `vows-new.smoke.mjs`, o trecho do passo 6 nos cenários 2 (contador) e 7 (carta da
Restrição antes de tomar) e o fechamento da F40 de novo (a Phase 11 vem depois da T49).
**Where**: `scripts/smoke/vows-new.smoke.mjs`
**Depends on**: T54, T55
**Reuses**: cenários 2, 7 e 8 (T26, T48, T49)
**Requirement**: VRV-08, VRC-11, VEL-13, VEX-05, VQA-05

**Done when**:

- [ ] Cenário 9 (a) e (b) verdes; cenário 2 lê o sufixo; cenário 7 lê `devolve <n>` e `Santuário → Amplificação`
      antes de tomar
- [ ] `vows.panelLines` com nota ≤ 1 nas cartas que têm nota; captura em HD com a nota e o `Novo` olhada
- [ ] VQA-02 e VQA-04 conferidos de novo como na T49
- [ ] Smokes do fim da F40 verdes (a lista da T49 mais `hud`, `horde` e `meta`)
- [ ] Gate verde; contagem anotada

**Tests**: smoke
**Gate**: full
**Commit**: `test(smoke): check the vow cards and counters the player reads`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8 → Phase 9 → Phase 10 → Phase 11

Phase 1:  T1
Phase 1:  T2
Phase 1:  T3
Phase 2:  T4 ─→ T5
Phase 2:  T6 ─→ T7 ─→ T9
Phase 2:  T6 ─→ T10
Phase 2:  T7 ─→ T10
Phase 2:  T8
Phase 3:  T11 ─→ T12
Phase 3:  T13
Phase 3:  T14
Phase 3:  T15
Phase 4:  T16
Phase 4:  T17
Phase 4:  T18
Phase 4:  T19
Phase 5:  T20 ─→ T21 ─→ T24 ─→ T26
Phase 5:  T22 ─→ T24
Phase 5:  T21 ─→ T25 ─→ T26
Phase 5:  T23 ─→ T25
Phase 6:  T27 ─→ T30 ─→ T32
Phase 6:  T28 ─→ T29 ─→ T30
Phase 6:  T31 ─→ T32
Phase 7:  T33 ─→ T34
Phase 8:  T35 ─→ T37
Phase 8:  T36 ─→ T37
Phase 9:  T38 ─→ T41
Phase 9:  T39 ─→ T41
Phase 9:  T40
Phase 9:  T42
Phase 9:  T43
Phase 9:  T44
Phase 10: T45 ─→ T48 ─→ T49
Phase 10: T46 ─→ T49
Phase 10: T47
Phase 11: T50 ─→ T51 ─→ T52 ─→ T54 ─→ T56
Phase 11: T53 ─→ T54
Phase 11: T55 ─→ T56
```

Execução estritamente sequencial, na ordem T1 a T56. São 56 tasks; em lotes de ~7 a 10 sem cortar phase: Phases 1-2
(10), Phases 3-4 (9), Phase 5 (7), Phases 6-7 (8), Phases 8-9 (10), Phase 10 (5), Phase 11 (7). Um agente novo por
lote.

As dependências de phases anteriores estão no `Depends on` de cada task e não têm seta no diagrama (os diagramas
são por phase); todas apontam para trás.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | 1 decisão no STATE | ✅ Granular |
| T2 | 1 teste + o fixture que ele gera | ✅ Granular |
| T3 | 1 teste | ✅ Granular |
| T4 | 1 módulo puro novo | ✅ Granular |
| T5 | 1 função + o único chamador (merge backward: sem ele não compila) | ⚠️ OK, coeso |
| T6 | 1 função pura | ✅ Granular |
| T7 | 1 tipo + 1 função + o getter que a chama (merge backward) | ⚠️ OK, coeso |
| T8 | 3 funções do mesmo módulo, mesmo parâmetro | ✅ Granular |
| T9 | 1 função + 1 linha do único chamador | ⚠️ OK, coeso |
| T10 | 1 tipo e a cópia dele | ✅ Granular |
| T11 | 1 classe (campo + pós-passe) | ✅ Granular |
| T12 | 1 linha num resolvedor | ✅ Granular |
| T13 | 1 campo + 1 método | ✅ Granular |
| T14 | 1 classe pura com a função de ganho | ✅ Granular |
| T15 | 1 entrada + 1 ramo | ✅ Granular |
| T16 | 1 método (`sync`) + 1 campo de snapshot | ✅ Granular |
| T17 | 2 linhas de 1 método | ✅ Granular |
| T18 | 1 método extraído | ✅ Granular |
| T19 | 1 diretor + 1 linha no `resetRun` + 1 campo de tipo (merge forward: o `vows=` sai do `reset`) | ⚠️ OK, coeso |
| T20 | 1 voto (linha do catálogo + bloco + regra, 3 a 6 linhas cada) | ⚠️ OK, coeso |
| T21 | 1 voto | ⚠️ OK, coeso |
| T22 | 1 campo do contexto e os 3 leitores dele | ⚠️ OK, coeso |
| T23 | 1 função | ✅ Granular |
| T24 | 1 linha no contexto da loja | ✅ Granular |
| T25 | 1 diretor + 1 tipo | ✅ Granular |
| T26 | 1 smoke novo (3 cenários) | ✅ Granular |
| T27 | 1 voto | ⚠️ OK, coeso |
| T28 | 1 folha de arte + registro | ✅ Granular |
| T29 | 1 vista | ✅ Granular |
| T30 | 1 método + 1 linha no `techDirector` + 1 campo de tipo | ⚠️ OK, coeso |
| T31 | 1 troca de leitura por vista (lista do `grep`) | ⚠️ OK, depende do código na hora |
| T32 | 1 cenário de smoke | ✅ Granular |
| T33 | 1 voto | ⚠️ OK, coeso |
| T34 | 1 cenário de smoke | ✅ Granular |
| T35 | 1 voto | ⚠️ OK, coeso |
| T36 | 1 campo de snapshot | ✅ Granular |
| T37 | 1 cenário de smoke | ✅ Granular |
| T38 | 1 voto | ⚠️ OK, coeso |
| T39 | 1 função pura | ✅ Granular |
| T40 | 1 método extraído | ✅ Granular |
| T41 | 2 métodos do diretor + 1 repasse | ✅ Granular |
| T42 | 1 condição | ✅ Granular |
| T43 | 1 comparação | ✅ Granular |
| T44 | 1 comparação | ✅ Granular |
| T45 | 1 classe nova + 2 linhas no `take` | ✅ Granular |
| T46 | 1 vista (fonte + getter) + 1 campo de snapshot | ⚠️ OK, coeso |
| T47 | 1 doc | ✅ Granular |
| T48 | 1 cenário de smoke | ✅ Granular |
| T49 | 1 cenário de smoke + conferências de fechamento | ✅ Granular |
| T50 | 1 módulo puro novo + 3 textos do catálogo | ✅ Granular |
| T51 | 1 vista (nota, rótulo, getter) + 1 campo de snapshot | ⚠️ OK, coeso |
| T52 | 1 getter do diretor + 1 linha em cada chamador | ⚠️ OK, coeso |
| T53 | 1 parâmetro de 1 função | ✅ Granular |
| T54 | 1 lista do `MetaDirector` + 2 linhas do `openPanel` | ⚠️ OK, coeso |
| T55 | 1 método do diretor + 1 linha do `counterText` | ✅ Granular |
| T56 | 1 cenário de smoke + conferências de fechamento | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | sem seta de entrada na Phase 1 | ✅ Match |
| T2 | None | sem seta de entrada na Phase 1 | ✅ Match |
| T3 | None | sem seta de entrada na Phase 1 | ✅ Match |
| T4 | None | sem seta de entrada na Phase 2 | ✅ Match |
| T5 | T3, T4 | T4 → T5 (de phase anterior: T3) | ✅ Match |
| T6 | None | sem seta de entrada na Phase 2 | ✅ Match |
| T7 | T2, T6 | T6 → T7 (de phase anterior: T2) | ✅ Match |
| T8 | None | sem seta de entrada na Phase 2 | ✅ Match |
| T9 | T7 | T7 → T9 | ✅ Match |
| T10 | T6, T7 | T6 → T10, T7 → T10 | ✅ Match |
| T11 | T6 | sem seta de entrada na Phase 3 (de phase anterior: T6) | ✅ Match |
| T12 | T11 | T11 → T12 | ✅ Match |
| T13 | None | sem seta de entrada na Phase 3 | ✅ Match |
| T14 | None | sem seta de entrada na Phase 3 | ✅ Match |
| T15 | None | sem seta de entrada na Phase 3 | ✅ Match |
| T16 | T9, T10, T11, T13, T14 | sem seta de entrada na Phase 4 (de phase anterior: T9, T10, T11, T13, T14) | ✅ Match |
| T17 | T7, T15 | sem seta de entrada na Phase 4 (de phase anterior: T7, T15) | ✅ Match |
| T18 | T5 | sem seta de entrada na Phase 4 (de phase anterior: T5) | ✅ Match |
| T19 | T4, T5, T7 | sem seta de entrada na Phase 4 (de phase anterior: T4, T5, T7) | ✅ Match |
| T20 | T19 | sem seta de entrada na Phase 5 (de phase anterior: T19) | ✅ Match |
| T21 | T20 | T20 → T21 | ✅ Match |
| T22 | T8 | sem seta de entrada na Phase 5 (de phase anterior: T8) | ✅ Match |
| T23 | T8 | sem seta de entrada na Phase 5 (de phase anterior: T8) | ✅ Match |
| T24 | T18, T21, T22 | T21 → T24, T22 → T24 (de phase anterior: T18) | ✅ Match |
| T25 | T21, T23 | T21 → T25, T23 → T25 | ✅ Match |
| T26 | T24, T25 | T24 → T26, T25 → T26 | ✅ Match |
| T27 | T11, T21 | sem seta de entrada na Phase 6 (de phase anterior: T11, T21) | ✅ Match |
| T28 | None | sem seta de entrada na Phase 6 | ✅ Match |
| T29 | T28 | T28 → T29 | ✅ Match |
| T30 | T19, T27, T29 | T27 → T30, T29 → T30 (de phase anterior: T19) | ✅ Match |
| T31 | T11 | sem seta de entrada na Phase 6 (de phase anterior: T11) | ✅ Match |
| T32 | T30, T31 | T30 → T32, T31 → T32 | ✅ Match |
| T33 | T9, T12, T27 | sem seta de entrada na Phase 7 (de phase anterior: T9, T12, T27) | ✅ Match |
| T34 | T33 | T33 → T34 | ✅ Match |
| T35 | T14, T17, T33 | sem seta de entrada na Phase 8 (de phase anterior: T14, T17, T33) | ✅ Match |
| T36 | T14 | sem seta de entrada na Phase 8 (de phase anterior: T14) | ✅ Match |
| T37 | T35, T36 | T35 → T37, T36 → T37 | ✅ Match |
| T38 | T13, T21, T33, T35 | sem seta de entrada na Phase 9 (de phase anterior: T13, T21, T33, T35) | ✅ Match |
| T39 | None | sem seta de entrada na Phase 9 | ✅ Match |
| T40 | T25 | sem seta de entrada na Phase 9 (de phase anterior: T25) | ✅ Match |
| T41 | T38, T39 | T38 → T41, T39 → T41 | ✅ Match |
| T42 | T22 | sem seta de entrada na Phase 9 (de phase anterior: T22) | ✅ Match |
| T43 | T13 | sem seta de entrada na Phase 9 (de phase anterior: T13) | ✅ Match |
| T44 | T13 | sem seta de entrada na Phase 9 (de phase anterior: T13) | ✅ Match |
| T45 | T19, T40, T41 | sem seta de entrada na Phase 10 (de phase anterior: T19, T40, T41) | ✅ Match |
| T46 | T38 | sem seta de entrada na Phase 10 (de phase anterior: T38) | ✅ Match |
| T47 | None | sem seta de entrada na Phase 10 | ✅ Match |
| T48 | T45 | T45 → T48 | ✅ Match |
| T49 | T46, T48 | T46 → T49, T48 → T49 | ✅ Match |
| T50 | T27, T38 | sem seta de entrada na Phase 11 (de phase anterior: T27, T38) | ✅ Match |
| T51 | T46, T50 | T50 → T51 (de phase anterior: T46) | ✅ Match |
| T52 | T45, T51 | T51 → T52 (de phase anterior: T45) | ✅ Match |
| T53 | T5 | sem seta de entrada na Phase 11 (de phase anterior: T5) | ✅ Match |
| T54 | T52, T53 | T52 → T54, T53 → T54 | ✅ Match |
| T55 | T20 | sem seta de entrada na Phase 11 (de phase anterior: T20) | ✅ Match |
| T56 | T54, T55 | T54 → T56, T55 → T56 | ✅ Match |

Todas as dependências apontam para a mesma phase ou para trás.

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Decisão (`STATE.md`) | none | none | ✅ OK |
| T2 | Equivalência dos números | unit | unit | ✅ OK |
| T3 | Regra pura (teste de sorteio) | unit | unit | ✅ OK |
| T4 | Regra pura | unit | unit | ✅ OK |
| T5 | Regra pura (+ 1 linha de adaptador, smoke existente) | unit | unit, gate full com `vows` | ✅ OK |
| T6 | Regra pura | unit | unit | ✅ OK |
| T7 | Regra pura (+ getter de adaptador, smokes existentes) | unit | unit, gate full | ✅ OK |
| T8 | Regra pura | unit | unit | ✅ OK |
| T9 | Regra pura (+ 1 linha de adaptador) | unit | unit, gate full | ✅ OK |
| T10 | Regra pura | unit | unit | ✅ OK |
| T11 | Regra pura | unit | unit | ✅ OK |
| T12 | Regra pura | unit | unit | ✅ OK |
| T13 | Regra pura | unit | unit | ✅ OK |
| T14 | Regra pura | unit | unit | ✅ OK |
| T15 | Regra pura | unit | unit | ✅ OK |
| T16 | Adaptador de cena + tipo do snapshot | smoke (+ unit do `debugApi`) | smoke | ✅ OK |
| T17 | Adaptador de cena | smoke | smoke | ✅ OK |
| T18 | Adaptador de cena | smoke | smoke | ✅ OK |
| T19 | Adaptador de cena + tipo do snapshot | smoke (+ unit do `debugApi`) | smoke | ✅ OK |
| T20 | Dados + regra pura | unit | unit | ✅ OK |
| T21 | Dados + regra pura | unit | unit | ✅ OK |
| T22 | Regra pura | unit | unit | ✅ OK |
| T23 | Regra pura | unit | unit | ✅ OK |
| T24 | Adaptador de cena | smoke | smoke | ✅ OK |
| T25 | Adaptador de cena + tipo do snapshot | smoke (+ unit do `debugApi`) | smoke | ✅ OK |
| T26 | Smoke novo | smoke | smoke | ✅ OK |
| T27 | Dados + regra pura | unit | unit | ✅ OK |
| T28 | Arte em código | unit + prancha | unit (+ prancha no `Done when`) | ✅ OK |
| T29 | Vista sem cena | unit | unit | ✅ OK |
| T30 | Adaptador de cena + tipo do snapshot | smoke (+ unit do `debugApi`) | smoke | ✅ OK |
| T31 | Vistas de técnica ligadas ao motor | smoke | smoke | ✅ OK |
| T32 | Smoke | smoke | smoke | ✅ OK |
| T33 | Dados + regra pura | unit | unit | ✅ OK |
| T34 | Smoke | smoke | smoke | ✅ OK |
| T35 | Dados + regra pura | unit | unit | ✅ OK |
| T36 | Tipo do snapshot | unit | unit | ✅ OK |
| T37 | Smoke | smoke | smoke | ✅ OK |
| T38 | Dados + regra pura | unit | unit | ✅ OK |
| T39 | Regra pura | unit | unit | ✅ OK |
| T40 | Adaptador de cena | smoke | smoke | ✅ OK |
| T41 | Adaptador de cena | smoke | smoke | ✅ OK |
| T42 | Regra pura | unit | unit | ✅ OK |
| T43 | Regra pura | unit | unit | ✅ OK |
| T44 | Regra pura | unit | unit | ✅ OK |
| T45 | Adaptador de cena | smoke | smoke | ✅ OK |
| T46 | Vista sem cena + tipo do snapshot | unit | unit | ✅ OK |
| T47 | Docs | none | none | ✅ OK |
| T48 | Smoke | smoke | smoke | ✅ OK |
| T49 | Smoke | smoke | smoke | ✅ OK |
| T50 | Dados + regra pura | unit | unit | ✅ OK |
| T51 | Vista sem cena + tipo do snapshot | unit | unit | ✅ OK |
| T52 | Adaptador de cena | smoke | smoke | ✅ OK |
| T53 | Regra pura | unit | unit | ✅ OK |
| T54 | Adaptador de cena + tipo do snapshot | smoke (+ unit do `debugApi`) | smoke | ✅ OK |
| T55 | Adaptador de cena | smoke | smoke | ✅ OK |
| T56 | Smoke | smoke | smoke | ✅ OK |
