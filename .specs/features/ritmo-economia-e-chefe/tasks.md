# Ritmo, economia e chefe — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/ritmo-economia-e-chefe/spec.md`
**Design**: `.specs/features/ritmo-economia-e-chefe/design.md`
**Status**: Approved
**Branch**: `feat/ritmo-economia-e-chefe` (a partir de `dev`; volta para `dev` com `--no-ff` após o Verifier PASS, AD-008)
**Modelos**: Opus 5.5 planeja e orquestra; workers e Verifier rodam em Sonnet 5.5 (`model: sonnet`); no máximo 2 agentes ao mesmo tempo.

---

## Test Coverage Matrix

> Guidelines: `vitest.config.ts`; `.specs/STATE.md` AD-001/006/008/014/016; lições confirmadas L-010 (os dois lados de cada limiar) e L-043 (testar a chamada do adaptador).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Lógica pura (`src/core/**`, `src/data/**`) | unit | 1:1 com os ACs; limiares testados nos dois lados (L-010); tuning diferente do padrão em pelo menos um caso | `tests/core/*.test.ts`, `tests/data/*.test.ts` | `npm test` |
| Adaptadores Phaser (`Enemy`, `Boss`, `TechRunner`, `EnergyHud`, `TestScene`, `debugApi`) | smoke | Valor vivo lido pelo snapshot; `none` na task de adaptador, coberta pela fase 4 | `scripts/smoke/*.smoke.mjs` | `npm run smoke` |
| Dados de mapa (`src/data/level1.ts`) | unit | Contagem e posição dos pontos `E` | `tests/core/level.test.ts` | `npm test` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tasks com testes unitários | `npm run typecheck && npm test` |
| Build | Tasks de adaptador e a última de cada fase | `npm run build && npm test` |
| Full | Tasks que mexem nos smokes | `npm run build && npm test && npm run smoke` |

---

## Execution Plan

### Phase 1: Onda, spawn e IA (núcleo puro) — worker W1

```
T1 → T2 → T3 → T4 → T5 → T6 → T7
```

### Phase 2: Economia, maestria e chefe (núcleo puro) — worker W2

```
T8 → T9 → T10 → T11 → T12 → T13
```

### Phase 3: Integração no jogo — worker W3

```
T14 → T15 → T16 → T17 → T18 → T19 → T20 → T21
```

### Phase 4: Smokes — worker W4

```
T22 → T23 → T24 → T25
```

---

## Task Breakdown

### T1: Tamanho da onda, vivos por rodada e ritmo do spawner

**What**: Implementar `WaveTuning` novo, `waveSize`, `maxAliveFor` e o `WaveSpawner` com burst inicial e gotejamento de 1500 ms. Sem escolha de ponto; `SpawnOrder` sem `point`.
**Where**: `src/core/waves.ts`
**Depends on**: None
**Reuses**: `WaveSpawner` atual (contagem de vivos, mortos e fila)
**Requirement**: SPN-01, SPN-02, SPN-03, SPN-04, SPN-05, EDG-01, EDG-02
**Done when**:
- [x] `WAVE` em `src/data/tuning.ts` = `{ base: 6, perRound: 2, max: 20, maxAliveBase: 5, maxAliveEvery: 2, maxAliveCap: 8, initialBurst: 3, trickleMs: 1500, pointGapMs: 800 }`.
- [x] O construtor aceita `maxAliveOverride`.
- [x] Testes cobrem:
  - `waveSize` em r = 1, 2, 4, 8 (= 20) e 9 (teto);
  - `maxAliveFor` em r = 1, 2, 3, 7 (= 8) e 30;
  - o burst de 3 no 1º `update`;
  - o gotejamento em 1499 ms (nenhum spawn) e em 1500 ms (um spawn);
  - o teto de vivos (SPN-05);
  - uma fila menor que o burst (EDG-01);
  - o fim da fila (EDG-02);
  - um tuning não padrão.
**Tests**: unit
**Gate**: quick

---

### T2: Run com stream de spawn e teto de vivos

**What**: A `Run` cria `spawnRng = new Rng(seed ^ 0x3c6ef372)`, repassa `maxAliveOverride` ao `WaveSpawner`, expõe `maxAlive` e emite o comando `spawn` sem `point` para inimigo comum (o chefe continua igual).
**Where**: `src/core/run.ts`
**Depends on**: T1
**Reuses**: o padrão dos streams `variantRng` e `guardRng`
**Requirement**: SPN-02, SPN-04, SPN-08
**Done when**:
- [x] `tests/core/run.test.ts` atualizado: o `spawnRng` é reproduzível pela seed; `maxAlive` reflete a rodada e o override.
- [x] As sequências de `variantRng`, `guardRng` e `shopRng` continuam iguais às de antes (regressão).
**Tests**: unit
**Gate**: quick

---

### T3: Escolha do ponto de spawn fora da câmera

**What**: Criar `pickSpawnPoint` conforme o design (fora da câmera com margem de 32 px, gap de 800 ms por ponto, 35% de chance de preferir o lado das costas, fallback `farthestPoint`).
**Where**: `src/core/spawnPoint.ts`
**Depends on**: T2
**Reuses**: `farthestPoint` de `src/core/waves.ts`; `Rng`
**Requirement**: SPN-07, SPN-08, SPN-09
**Done when**:
- [x] Testes cobrem:
  - ponto exatamente em `viewRight + 32` (dentro) e em `viewRight + 33` (fora);
  - preferência pelas costas com o `rng` forçado nos dois resultados;
  - o `rng.chance` é consumido sempre;
  - gap de 799 ms (ponto excluído) e 800 ms (ponto liberado);
  - todos os pontos dentro da câmera → `farthestPoint`.
**Tests**: unit
**Gate**: quick

---

### T4: Quatro pontos de spawn na sala

**What**: Acrescentar `E` nas colunas 1 e 38 da linha do chão de `LEVEL_1`.
**Where**: `src/data/level1.ts`
**Depends on**: T3
**Reuses**: o parser de `src/core/level.ts`
**Requirement**: SPN-06
**Done when**:
- [x] `tests/core/level.test.ts` verifica 4 pontos `E` e o `x` dos dois novos (coluna 1 → 48 px e coluna 38 → 1232 px, pela fórmula do parser).
**Tests**: unit
**Gate**: quick

---

### T5: Limitador de atacantes

**What**: Criar `AttackGate` (2 vagas, fila FIFO idempotente, 350 ms entre windups, `release` idempotente, `queueOrder`, `reset`).
**Where**: `src/core/attackGate.ts`
**Depends on**: T4
**Reuses**: nenhum (módulo novo)
**Requirement**: LIM-01, LIM-02, LIM-04, LIM-06, EDG-03
**Done when**:
- [x] Testes cobrem:
  - a 3ª requisição não ganha vaga;
  - a ordem FIFO;
  - `windupAllowed` em 349 ms (falso) e 350 ms (verdadeiro);
  - `release` de quem tem vaga e de quem está na fila;
  - `request` repetido não duplica a entrada;
  - `reset` limpa tudo.
**Tests**: unit
**Gate**: quick

---

### T6: IA sem patrulha, com espera e aproximação

**What**: Reescrever a `EnemyAI` com os estados `chase | hold | approach | windup | attack | rest`, a entrada `{ granted, windupAllowed, holdRank }`, o evento `wantAttack`, a corrida ×1,6 acima de 320 px, `holdDistance(k) = 64 + 24k ± 8` e `interrupt` voltando para `chase`. Atualizar `ENEMY_AI` no tuning.
**Where**: `src/core/enemyAI.ts`
**Depends on**: T5
**Reuses**: as fases `windup`, `attack` e `rest` e o `next()` com a sobra do frame
**Requirement**: SPN-10, SPN-11, SPN-12, LIM-03, LIM-05, LIM-07, LIM-08
**Done when**:
- [x] `tests/core/enemyAI.test.ts` reescrito: os casos de `patrol` saem porque o SPN-10 removeu o requisito (registrar no commit).
- [x] Testes novos cobrem:
  - nunca `patrol`;
  - 320 px (velocidade ×1) e 321 px (×1,6);
  - 96 px (`hold`) e 97 px (`chase`) sem permissão;
  - alvo do `hold` com k = 0 e k = 2, com tolerância de 8 nos dois lados;
  - `granted` sem `windupAllowed` não entra em `windup`;
  - `approach` até `attackRange`;
  - `interrupt` volta para `chase`;
  - pelo menos um caso com tuning diferente de 35/70 (fecha o item do backlog).
**Tests**: unit
**Gate**: quick

---

### T7: HP e dano dos comuns fixos por rodada

**What**: `DIFFICULTY.hpPerRound = 0` e `damagePerRound = 0` (AD-014); ajustar os testes de `scaleFor`.
**Where**: `src/data/tuning.ts`
**Depends on**: T6
**Reuses**: `scaleFor` de `src/core/difficulty.ts`
**Requirement**: SPN-13, SPN-14
**Done when**:
- [x] `tests/core/difficulty.test.ts` verifica que `maxHp` e o dano em r = 1, 2 e 30 são iguais aos da rodada 1, e que a velocidade continua escalando.
- [x] O gate de build passa (última task da fase).
**Tests**: unit
**Gate**: build

---

### T8: Preços e rodada mínima das técnicas

**What**: Aplicar os preços do ECN-01 e o novo `techGate` (Nv2 a partir da rodada 2, Nv3 a partir da rodada 4).
**Where**: `src/data/shop.ts`
**Depends on**: None
**Reuses**: `TECHNIQUE_SHOP_ENTRIES`
**Requirement**: ECN-01, ECN-02, ECN-09
**Done when**:
- [x] Testes verificam os 4 pares `base/step` e `techGate` com 1/2/3 nas rodadas 1, 2, 3 e 4, nos dois lados de cada limite.
**Tests**: unit
**Gate**: quick

---

### T9: Renda esperada

**What**: Criar `expectedIncome(r, waveT, econ)` (soma de `waveSize × média do drop × valor`, pulando rodadas de chefe).
**Where**: `src/core/economy.ts`
**Depends on**: T8
**Reuses**: `waveSize` e `isBossRound` de `src/core/waves.ts`; `ECONOMY`
**Requirement**: ECN-03, ECN-04
**Done when**:
- [x] Testes verificam `expectedIncome(1) = 18` (≥ 15) e `expectedIncome(4) = 108` (≥ 100), e que a rodada 5 não soma inimigos comuns.
**Tests**: unit
**Gate**: quick

---

### T10: Oferta "Aprimorar" e nível na carta

**What**: Em `drawFresh`, reservar o slot 0 para o upgrade de uma técnica equipada elegível (também no reroll). Em `view`, mostrar `Nv ${n + 1}/3` para técnicas.
**Where**: `src/core/shop.ts`
**Depends on**: T9
**Reuses**: `eligible`, `drawOffers`, a garantia TSH-05
**Requirement**: ECN-05, ECN-06, ECN-07, ECN-08, EDG-04
**Done when**:
- [x] `tests/core/techShop.test.ts` cobre:
  - técnica equipada no Nv1 na loja da rodada 2 → `offers[0]` é ela;
  - a mesma técnica na loja da rodada 1 → sem reserva (o gate é 2);
  - reroll mantém a reserva;
  - as duas técnicas no Nv3 → sem reserva (EDG-04);
  - TSH-05 intacto com os slots vazios;
  - `levelText` = `Nv 1/3` e `Nv 2/3`.
**Tests**: unit
**Gate**: quick

---

### T11: Maestria

**What**: Criar a classe `Mastery` (limiares 15/25, 3 pontos por acerto no chefe, deduplicação por `(castId, targetId)`, zera ao subir, não acumula no Nv3, `resetSlot`, `setPoints`).
**Where**: `src/core/mastery.ts`
**Depends on**: T10
**Reuses**: nenhum (módulo novo)
**Requirement**: MST-01, MST-02, MST-03, MST-04, MST-05, MST-06
**Done when**:
- [x] Testes cobrem:
  - 14 pontos não sobem de nível, 15 sobem;
  - no Nv2, 24 não sobem e 25 sobem;
  - o mesmo alvo na mesma conjuração conta 1 vez; em conjurações diferentes conta 2;
  - o chefe soma +3;
  - no Nv3 os pontos ficam em 0;
  - a subida não depende da rodada (MST-06).
**Tests**: unit
**Gate**: quick

---

### T12: IA do chefe com atordoamento na parede e recuperação do salto

**What**: A `BossAI` emite `wallStun` quando a investida termina por `blocked`; o descanso depois do pouso dura `max(restMs, 800)`. Acrescentar ao tuning `BOSS.wallStunMs`, `leap.recoveryMs`, `staggerDamageMult`, `finisher` e `tier.hpBase = 400`.
**Where**: `src/core/bossAI.ts`
**Depends on**: T11
**Reuses**: a lógica de `blocked` e `landed` existente
**Requirement**: BFX-01, BFX-02, BFX-03, BFX-04
**Done when**:
- [ ] `tests/core/bossAI.test.ts` cobre:
  - `blocked` → `wallStun`;
  - alcance máximo → sem `wallStun`;
  - pouso na fase 3 → descanso de 800 ms;
  - pouso na fase 1 → descanso de 900 ms.
- [ ] `tests/core/bossTier.test.ts` verifica 400 de HP no tier 1.
**Tests**: unit
**Gate**: quick

---

### T13: Cérebro do chefe com atordoamento, dano ×1,5 e finalizador

**What**: `BossBrain` ganha:
- `stun(ms)`, que não mexe na postura e é ignorado em `roar`, `intro` e `dead`;
- `staggerCause`;
- dano ×1,5 em `stagger`;
- `finisherReady` e `receiveFinisher()`, que tira `round(0,12 × maxHp)` uma vez por `stagger`, sem o ×1,5 e podendo matar.

**Where**: `src/core/bossBrain.ts`
**Depends on**: T12
**Reuses**: `applyDamage` e as transições existentes
**Requirement**: BFX-05, BFX-06, BFX-07, BFX-08, EDG-05, EDG-06
**Done when**:
- [ ] `tests/core/bossBrain.test.ts` cobre:
  - `stun` não altera a postura, e a saída do atordoamento da parede não restaura a postura;
  - golpe de 10 em `stagger` tira 15;
  - o finalizador tira 48 com 400 de HP máximo, e um segundo uso devolve `[]`;
  - fora de `stagger` o finalizador devolve `[]`;
  - `stun` durante o `roar` é ignorado;
  - o finalizador que zera o HP emite `died`.
- [ ] O gate de build passa (última task da fase).
**Tests**: unit
**Gate**: build

---

### T14: Inimigo usando a IA nova

**What**: O `Enemy` passa `granted`, `windupAllowed` e `holdRank` (vindos da cena) para a IA, expõe `wantsAttack` e o estado da IA, e remove `patrolSpeed`.
**Where**: `src/game/Enemy.ts`
**Depends on**: None
**Reuses**: o fluxo atual de `update` e `canAct`
**Requirement**: SPN-10, SPN-11, LIM-03
**Done when**:
- [ ] Typecheck e build passam; nenhum uso de `patrolSpeed` sobra em `src/`.
**Tests**: none
**Gate**: build

---

### T15: Spawn da cena fora da câmera

**What**: `spawnFromCommand` escolhe o ponto com `pickSpawnPoint` (usando o `worldView` da câmera, o `facing` do jogador, o mapa de último uso e o `run.spawnRng`). A `Run` recebe o `?debug&maxAlive=N`. O chefe continua com `farthestPoint`.
**Where**: `src/scenes/TestScene.ts`
**Depends on**: T14
**Reuses**: `spawnFromCommand`, `debugParam`
**Requirement**: SPN-03, SPN-07, SPN-08, SPN-09
**Done when**:
- [ ] Build passa; a cena repassa ao `pickSpawnPoint` o `worldView` real da câmera, não um valor fixo (L-043).
**Tests**: none
**Gate**: build

---

### T16: Limitador ligado na cena

**What**: A cena cria o `AttackGate`, chama `update` a cada frame e, para cada inimigo:
- faz o `request` quando ele emite `wantAttack`;
- calcula o `holdRank` por lado;
- passa `granted` e `windupAllowed`;
- chama `noteWindup` no `windupStart`;
- chama `release` quando o estado sai de {`approach`, `windup`, `attack`} ou o inimigo é removido.

O `startRun` chama `reset`.

**Where**: `src/scenes/TestScene.ts`
**Depends on**: T15
**Reuses**: o loop de inimigos do `update`
**Requirement**: LIM-01, LIM-02, LIM-04, LIM-05, LIM-06, LIM-07, EDG-03
**Done when**:
- [ ] Build passa.
**Tests**: none
**Gate**: build

---

### T17: Callback de maestria nas técnicas

**What**: O `TechRunner` ganha `castId` (incrementado a cada conjuração iniciada) e chama `onMasteryHit(slot, castId, targetId, isBoss)` em todo ponto onde o alvo aceita o golpe da técnica, inclusive o Kokusen.
**Where**: `src/game/TechRunner.ts`
**Depends on**: T16
**Reuses**: os pontos de `onTechHit` (linhas 239–537)
**Requirement**: MST-01, MST-02
**Done when**:
- [ ] Build passa; nenhum caminho de acerto do Vermelho, do Azul, do Desmantelar ou do Divergente fica sem a chamada.
**Tests**: none
**Gate**: build

---

### T18: Progressão ligada na cena

**What**: Na cena:
- `new Modifiers(FULL_SHOP_CATALOG)`;
- `Mastery` ligada ao `onMasteryHit`, chamando `loadout.levelUp` e o banner `"{nome} Nv {n}!"`;
- `?debug&mastery=N`;
- `resetSlot` ao equipar técnica nova num slot;
- na derrota do chefe, upgrade da técnica de menor nível (empate: slot 0) com banner.

**Where**: `src/scenes/TestScene.ts`
**Depends on**: T17
**Reuses**: `openShop`, `onBossDefeated`, `Hud.banner`
**Requirement**: PRG-01, PRG-02, PRG-03, PRG-04, PRG-05, PRG-06, MST-03, MST-07, BFX-09, BFX-10
**Done when**:
- [ ] Build passa.
**Tests**: none
**Gate**: build

---

### T19: Barra de maestria no HUD

**What**: O `EnergyHud` desenha sob cada slot ocupado com nível < 3 uma barra de 2 px de altura e largura `round(slotW × pontos / limiar)`.
**Where**: `src/game/EnergyHud.ts`
**Depends on**: T18
**Reuses**: o layout dos slots existente
**Requirement**: MST-08
**Done when**:
- [ ] Build passa; a largura da barra fica exposta para o snapshot (`energyHud.masteryBars`).
**Tests**: none
**Gate**: build

---

### T20: Chefe com atordoamento e finalizador ligados

**What**:
- O `Boss` reage a `wallStun` com `brain.stun(BOSS.wallStunMs)` e expõe `finisherReady` e `receiveFinisher`.
- O `tryFinisher` da cena aplica o finalizador do chefe (com ele em `stagger`, `finisherReady` e a ≤ 48 px do centro), com o mesmo hitstop e zoom do finalizador comum.

**Where**: `src/game/Boss.ts`
**Depends on**: T19
**Reuses**: `tryFinisher` (`TestScene.ts:1155`), `FINISHER` fx
**Requirement**: BFX-02, BFX-06, BFX-07, BFX-08
**Done when**:
- [ ] Build passa (a mudança de `tryFinisher` entra no mesmo commit, por ser a ligação do mesmo comportamento).
**Tests**: none
**Gate**: build

---

### T21: Snapshot de debug com os campos novos

**What**: O snapshot ganha `run.maxAlive`, `attackers`, `gate { active, queue }`, os estados `hold` e `approach` da IA, `techniques.slots[].mastery { points, threshold }`, `energyHud.masteryBars`, `boss.finisherReady` e `camera.worldView { left, right }`.
**Where**: `src/game/debugApi.ts`
**Depends on**: T20
**Reuses**: `GameSnapshot`
**Requirement**: SPN-07, LIM-01, MST-08, BFX-06
**Done when**:
- [ ] Build e testes passam (última task da fase).
**Tests**: none
**Gate**: build

---

### T22: Smokes antigos adaptados ao ritmo novo

**What**: Adaptar os smokes que dependiam de 3 inimigos, de 2 pontos, da patrulha ou de 600 de HP no chefe. Usar `?debug&maxAlive=1` onde o cenário precisa de um inimigo isolado e ler os valores pela fórmula ou pelo snapshot, sem enfraquecer nenhuma asserção de comportamento.
**Where**: `scripts/smoke/fight-kit.mjs`
**Depends on**: None
**Reuses**: os helpers do `fight-kit`
**Requirement**: SPN-01, SPN-06, BFX-01
**Done when**:
- [ ] `npm run smoke` passa. Falhas só de `heal` ou `armed` com a mesma natureza intermitente de antes ficam registradas, não mascaradas.
- [ ] Cada smoke alterado é listado no commit.
**Tests**: smoke
**Gate**: full

---

### T23: Smoke de pressão e do limitador

**What**: Criar o smoke de pressão.
- **Rodada 1 com seed 1:** 6 na onda; pelo menos 5 nascidos em 6 s; todo spawn fora do `worldView` com margem; nenhum inimigo em `patrol`.
- **Com `maxAlive=6&enemyGuard=0` e o jogador parado por 20 s:** `attackers ≤ 2` em todo frame; dois `windupStart` nunca a menos de 350 ms; inimigos em `hold` do mesmo lado a ≥ 24 px um do outro.
- **Energia:** com `tech=divergente&fragments=200`, comprar Energia sobe `energy.max`.

**Where**: `scripts/smoke/spawn-pressure.smoke.mjs`
**Depends on**: T22
**Reuses**: `fight-kit.mjs`
**Requirement**: SPN-01, SPN-03, SPN-07, SPN-10, LIM-01, LIM-02, LIM-05, PRG-01, PRG-05
**Done when**:
- [ ] O smoke passa no suite completo.
**Tests**: smoke
**Gate**: full

---

### T24: Smoke de punição do chefe

**What**: Criar o smoke de punição do chefe (`?debug&round=5&enemyGuard=0`).
- Atrair a investida até a parede: o chefe entra em `stagger` por cerca de 1500 ms (±1 frame).
- Golpe em `stagger` tira `round(dano × 1,5)`.
- Quebrar a postura e apertar J+K a ≤ 48 px tira 48; um segundo J+K não tira nada.
- J+K fora de `stagger` não tira nada.
- Ao vencer com `tech=vermelho`, a técnica sobe para o Nv2 e o banner aparece.

**Where**: `scripts/smoke/boss-punish.smoke.mjs`
**Depends on**: T23
**Reuses**: o padrão de `boss.smoke.mjs`
**Requirement**: BFX-02, BFX-05, BFX-06, BFX-07, BFX-08, BFX-09, BFX-10
**Done when**:
- [ ] O smoke passa no suite completo.
**Tests**: smoke
**Gate**: full

---

### T25: Smoke de loja e maestria

**What**: Criar o smoke de loja e maestria.
- `tech=vermelho&round=2&fragments=60`: `offers[0]` é Vermelho com `Nv 2/3` e custo 45.
- `tech=vermelho&mastery=14`: um Vermelho que acerta um inimigo sobe para o Nv2, com banner, e a barra de maestria volta a 0.

**Where**: `scripts/smoke/shop-progress.smoke.mjs`
**Depends on**: T24
**Reuses**: `shop.smoke.mjs`, `techniques.smoke.mjs`
**Requirement**: ECN-05, ECN-08, MST-01, MST-03, MST-07, MST-08
**Done when**:
- [ ] O suite completo de smokes passa.
**Tests**: smoke
**Gate**: full

---

## Diagram-Definition Cross-Check

| Task | Depends on (definição) | Diagrama | ✔ |
| --- | --- | --- | --- |
| T1 | None | início da fase 1 | ✅ |
| T2–T7 | a anterior | `T1 → … → T7` | ✅ |
| T8 | None | início da fase 2 | ✅ |
| T9–T13 | a anterior | `T8 → … → T13` | ✅ |
| T14 | None | início da fase 3 | ✅ |
| T15–T21 | a anterior | `T14 → … → T21` | ✅ |
| T22 | None | início da fase 4 | ✅ |
| T23–T25 | a anterior | `T22 → … → T25` | ✅ |

## Test Co-location Validation

| Task | Camada | Matriz exige | Tests | ✔ |
| --- | --- | --- | --- | --- |
| T1–T13 | núcleo puro e dados | unit | unit | ✅ |
| T14–T21 | adaptadores Phaser | smoke (fase 4) | none | ✅ |
| T22–T25 | smokes | smoke | smoke | ✅ |
