# Economia, drops e cura — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/economia-drops-cura/spec.md`
**Design**: `.specs/features/economia-drops-cura/design.md`
**Status**: Ready
**Branch**: `feat/economia-drops-cura` (a partir de `dev`; volta para `dev` com `--no-ff` após o Verifier PASS, AD-008)
**Test count before this feature**: 471

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `vitest.config.ts`; `.specs/STATE.md` AD-001/002/003/006; lição confirmada L-010 (testar limiares dos dois lados). Sem `AGENTS.md` - strong defaults aplicados.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Lógica pura (`src/core/**`) | unit | Todos os ramos; 1:1 com os ACs; limites exatos dos dois lados (299/300 ms, 72/73 px, 14999/15000, 9999/10000, 19999/20000, rodada 2/3, 60/61 vivos, 6/7 ferramentas) | `tests/core/*.test.ts` | `npm test` |
| Tuning e arte (`src/data/**`, `src/game/art/**` sem phaser) | unit | Valores iguais às Assumptions; grades só com chaves da paleta | `tests/data/*.test.ts`, `tests/game/art.test.ts` | `npm test` |
| Adaptadores Phaser (`src/game/*.ts`, `src/scenes/**`) | smoke | Um cenário com asserção sobre o snapshot por AC visível, lendo valores do objeto vivo | `scripts/smoke/*.smoke.mjs` | `npm run smoke` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tasks com testes unitários | `npm run typecheck && npm test` |
| Full | Tasks com cenários de smoke | `npm run build && npm test && npm run smoke` |
| Build | Última task de cada fase | `npm run build && npm test` |

---

## Execution Plan

### Phase 1: Núcleo da economia (puro)

```
T1 → T2 → T3 → T4 → T5 → T6
```

### Phase 2: Arte

```
T7
```

### Phase 3: Economia no jogo

```
T8 → T9 → T10 → T11 → T12
```

### Phase 4: Smoke

```
T13
```

---

## Task Breakdown

### T1: Tuning e carteira

**What**: `ECONOMY`, `PICKUP`, `ARMED` e `DROPPED_TOOLS` em `src/data/tuning.ts`, com os números do Data Models do design; classe `Wallet` (`fragments`, `add`, `spend`, `reset`).
**Where**: `src/data/tuning.ts`, `src/core/wallet.ts`
**Depends on**: None
**Reuses**: padrão de `WAVE`/`RUN`/`BOSS`
**Requirement**: ECO-12, ECO-13, ECO-26, ECO-20, ECO-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `tests/data/tuning.test.ts` confere cada valor novo contra as Assumptions da spec
- [x] `tests/core/wallet.test.ts`: `spend` com n = saldo (true, 0), n = saldo + 1 (false, intacto), `add` ignora n ≤ 0 e não inteiro, `reset` volta a 0, saldo nunca negativo
- [x] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(core): add economy tuning and wallet`

---

### T2: Sorteios de loot

**What**: `Loot` com `enemyDrop`, `bossDrop`, `rollArmed`, `fragmentValue`, `armedChance`, `capDrop`, `burstVelocity` e os overrides de debug, na ordem fixa do design.
**Where**: `src/core/loot.ts`
**Depends on**: T1
**Reuses**: `Rng` (`src/core/rng.ts`)
**Requirement**: ECO-01, ECO-02, ECO-03, ECO-04, ECO-05, ECO-06, ECO-15, ECO-28, HEAL-01, HEAL-02, HEAL-06, ARM-01, ARM-02, ARM-03, ARM-04, ARM-15, RAR-01, RAR-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Quantidade sempre em [2, 4] (e [4, 6] armado) em 1000 sorteios com seed fixa, com os três valores aparecendo
- [x] Valor: rodada 1 = 1, 5 = 1, 6 = 2, 10 = 2, 11 = 3; chefe 15 pickups e sem gota
- [x] Ordem: com um `Rng` falso que registra as chamadas, a cura é sorteada antes da quantidade; `rollArmed` faz chance → ferramenta → raro
- [x] `armedChance`: rodada 2 = 0, 3 = 0,15, 4 = 0,20, 9 = 0,45, 10 = 0,5, 20 = 0,5
- [x] `capDrop`: live 56 + 4 = 4 sem extra; live 57 + 4 = 3 + 1 extra; live 60 + 3 = 1 + 2 extras; live 70 + 2 = 1 + 1 extra
- [x] `burstVelocity`: vx em [−120, 120] e vy em [−260, −180]
- [x] Overrides: `healChance: 1` dá cura sempre; `armed: 'club'` arma sempre com porrete na rodada 1; `rare: true` dá raro sempre
- [x] Mesma seed → mesma sequência de drops
- [x] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(core): add loot rolls for drops and armed enemies`

---

### T3: Física, ímã e vida do pickup

**What**: `PickupState`, `stepPickup`, `lifetimeMs` e `visible`, com a física pura sobre retângulos.
**Where**: `src/core/pickup.ts`
**Depends on**: T2
**Reuses**: `Rect` de `src/core/level.ts`
**Requirement**: ECO-07, ECO-24, ECO-08, ECO-09, ECO-10, ECO-18, ECO-11, ECO-25, ECO-21, HEAL-04, HEAL-09, HEAL-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Cai com gravidade 900 e para no topo do sólido abaixo; quica uma vez com 0,35; nunca termina um passo sobrepondo um sólido (também nascendo dentro de um)
- [x] Ímã: idade 299 não entra, 300 entra; distância 72 entra, 73 não; uma vez em ímã fica; velocidade 120 + 1200·t com teto 600; atravessa sólidos
- [x] Coleta só sobrepondo o player vivo; player morto não coleta nem liga o ímã
- [x] Gota: com `canHeal` falso não coleta nem liga o ímã
- [x] Vida: fragmento 14999 fica, 15000 expira; gota 9999 fica, 10000 expira
- [x] `visible`: sempre visível até restarem 3000 ms; depois alterna a cada 150 ms
- [x] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(core): add pickup physics, magnet and lifetime`

---

### T4: Inimigo armado e ferramentas

**What**: `armFor`, `rareDef`, `PROP_DEFS.cursedKnife`/`cursedClub` e `PROP_NAMES`.
**Where**: `src/core/armed.ts`, `src/data/props.ts`
**Depends on**: T3
**Reuses**: `EnemyBase`/`scaleFor` (`src/core/difficulty.ts`), `validatePropDef`
**Requirement**: ARM-05, ARM-20, ARM-21, ARM-06, ARM-22, ARM-23, ARM-07, ARM-11, ARM-24, RAR-02, RAR-06, RAR-04, ITEM-01, RAR-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Faca sobre a garra da rodada 1 (12): dano 15, largura +8 e offsetX +4, força e preparo iguais; sobre a rodada 10 escalada (dano 21): 26
- [x] Porrete: dano 19 na rodada 1, strength `heavy`, largura +12, preparo 450 → 600; o `base` não é mutado
- [x] `cursedKnife` e `cursedClub` com os valores de ARM-11/ARM-24 e passando em `validatePropDef`
- [x] `rareDef`: faca 24/8, porrete 39/7, chave com sufixo `Rare`
- [x] Nomes: Cadeira, Garrafa, Faca Amaldiçoada, Porrete Amaldiçoado; o raro termina em ` Rara`
- [x] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(core): add armed enemy tuning and cursed tools`

---

### T5: Ferramentas largadas

**What**: `DroppedTools` com `admit`, `update`, `forget` e `clear`.
**Where**: `src/core/droppedTools.ts`
**Depends on**: T4
**Reuses**: `PropState` (`src/core/props.ts`)
**Requirement**: ARM-13, ARM-28, ARM-14, ARM-18

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] 19999 ms em `rest` fica, 20000 sai; sair de `rest` e voltar zera a contagem
- [x] Com 6 registradas e uma nova: devolve a mais antiga em `rest`; com 6 e nenhuma em `rest`, devolve null; com 5, null
- [x] `clear` esvazia tudo; `forget` tira uma (ex.: quebrou)
- [x] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(core): add dropped tool lifetime and cap`

---

### T6: Stream de loot na run

**What**: o `Run` guarda a seed do `startRun` e expõe `lootRng = new Rng(seed ^ 0x9e3779b9)`; as ondas usam o mesmo `rng` de antes.
**Where**: `src/core/run.ts`
**Depends on**: T5
**Reuses**: `Run.update` (bloco de start)
**Requirement**: ECO-17, ECO-31

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Depois do start com seed s, `lootRng.next()` é igual ao primeiro `next()` de `new Rng(s ^ 0x9e3779b9)`
- [x] As ordens de spawn das rodadas 1–3 são iguais com e sem 50 sorteios no `lootRng` entre os updates
- [x] Nova run cria um `lootRng` novo com a seed nova
- [x] Todos os testes antigos de `run` continuam passando
- [x] Gate check passes: `npm run build && npm test`

**Tests**: unit
**Gate**: build

**Commit**: `feat(core): add seeded loot stream to the run`

---

### T7: Arte da economia e das ferramentas

**What**: grades do cristal de fragmento (2 frames, 5×7), da gota (6×8), do ícone do contador e das ferramentas: prop `common`/`rare` com estilhaços, e na mão `hold-a`, `hold-b`, `raised`, `hold-rare`. Tudo registrado em `createArt` com chaves novas em `TEX`.
**Where**: `src/game/art/sprites/economy.ts`, `src/game/art/sprites/tools.ts`, `src/game/art/index.ts`, `src/game/textures.ts`
**Depends on**: None
**Reuses**: `parseSheet`, `registerSheet`, `cutShards`, padrão de `sprites/props.ts`
**Requirement**: ECO-23, ARM-19, ARM-09, RAR-03

**Tools**:

- MCP: NONE
- Skill: phaser-gamedev

**Done when**:

- [x] `tests/game/art.test.ts` confere que todas as grades novas só usam `.` e chaves da `PALETTE`, que os frames de cada folha têm o mesmo tamanho e que o frame `rare` tem `A` no contorno
- [x] O frame `raised` tem `U`; `hold-a` e `hold-b` diferem só no contorno da aura
- [x] Gate check passes: `npm run build && npm test`

**Tests**: unit
**Gate**: build

**Commit**: `feat(art): add fragment, heal drop and cursed tool sprites`

---

### T8: Pickups, textos flutuantes e carteira na cena

**What**: os managers `Pickups` e `FloatTexts`; a cena cria `Wallet` e `Loot` a cada run; o drop do inimigo comum sai do `onDied` do `Enemy` e o do chefe do `onBossDefeated`; coleta credita a carteira ou cura (`player.heal`, `player.flash('G', 80)`); limpeza na nova run; `?debug&heal=1`; snapshot `wallet`, `pickups`, `floatTexts`; eventos `collect:*` e `pickupExpired`.
**Where**: `src/game/Pickups.ts`, `src/game/FloatTexts.ts`, `src/scenes/TestScene.ts`, `src/game/Player.ts`, `src/game/debugApi.ts`
**Depends on**: None
**Reuses**: `stepPickup`, `Loot`, `Wallet`, `Health.heal`, `registerDebugProbe`
**Requirement**: ECO-01, ECO-05, ECO-08, ECO-14, ECO-27, ECO-29, ECO-30, ECO-19, HEAL-03, HEAL-08, HEAL-07, HEAL-10, HEAL-06, ECO-16

**Tools**:

- MCP: NONE
- Skill: phaser-gamedev

**Done when**:

- [x] Abater um inimigo em `?debug&seed=1` cria 2–4 pickups no snapshot; andar até eles aumenta `wallet.fragments` pelo valor e gera `collect:fragment:<v>` e um `floatTexts` `+v`
- [x] Com `?debug&heal=1` e tecla 4, a gota cura 8 e gera `collect:heal:8`; com vida cheia a gota fica
- [x] Os pickups param durante o hitstop
- [x] Nova run: carteira 0 e `pickups` vazio
- [x] Gate check passes: `npm run build && npm test`

**Tests**: smoke
**Gate**: build

**Commit**: `feat(game): drop and collect fragments and heal pickups`

---

### T9: HUD da carteira e game over

**What**: contador de fragmentos com ícone abaixo do HP, que pulsa de 1,3 para 1 em 150 ms quando o valor muda; linha `Fragmentos: N` no game over; `hud.fragments` no snapshot.
**Where**: `src/game/Hud.ts`, `src/scenes/TestScene.ts`
**Depends on**: T8
**Reuses**: estilos e camadas do `Hud` (AD-003)
**Requirement**: ECO-16, ECO-22

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `hud.fragments` acompanha `wallet.fragments` no frame da coleta
- [x] O contador e o ícone estão na `uiLayer`
- [x] O centro do game over tem `Fragmentos: <n>`
- [x] Gate check passes: `npm run build && npm test`

**Tests**: smoke
**Gate**: build

**Commit**: `feat(hud): show fragment counter and run fragments on game over`

---

### T10: Inimigos armados no jogo

**What**: `spawnFromCommand` chama `loot.rollArmed(round)` e passa `armFor(...)` e `weapon` ao `Enemy`; o `Enemy` desenha a ferramenta na mão (aura em 2 frames, `raised` no preparo, escondida em ragdoll, brilho raro) e informa `weapon` no `onDied` e no snapshot; `?debug&armed=knife|club` e `?debug&rare=1`.
**Where**: `src/game/Enemy.ts`, `src/scenes/TestScene.ts`, `src/game/debugApi.ts`
**Depends on**: T9
**Reuses**: `armFor`, `Loot.rollArmed`, `pickEnemyAnim` (o preparo)
**Requirement**: ARM-01, ARM-02, ARM-03, ARM-15, ARM-09, ARM-10, ARM-16, RAR-05

**Tools**:

- MCP: NONE
- Skill: phaser-gamedev

**Done when**:

- [x] Com `?debug&armed=club&round=3`, todo inimigo comum tem `weapon: 'cursedClub'`, `damage` igual a `round(1.6 × base escalado)` e o preparo mais longo
- [x] O sprite da ferramenta some em ragdoll e volta ao levantar
- [x] Gate check passes: `npm run build && npm test`

**Tests**: smoke
**Gate**: build

**Commit**: `feat(game): spawn armed enemies with cursed tools`

---

### T11: Ferramenta largada e usável

**What**: na morte de um armado, a cena cria um `Prop` (def comum ou `rareDef`, frame `common`) em `rest` na posição da morte e o registra no `DroppedTools`; o `Prop` ganha `id`, `frame`, brilho raro e `destroyNow()`; sumiço aos 20 s com fumaça; teto de 6; limpeza na nova run; snapshot `worldProps`.
**Where**: `src/game/Prop.ts`, `src/scenes/TestScene.ts`, `src/game/debugApi.ts`
**Depends on**: T10
**Reuses**: `Prop`, `PropMachine`, `Player.findPickup`/`interact`, `DroppedTools`, `Fx.curseSmoke`
**Requirement**: ARM-08, ARM-12, ARM-17, ARM-26, ARM-27, ARM-13, ARM-28, ARM-14, ARM-18, RAR-02, RAR-06, RAR-03

**Tools**:

- MCP: NONE
- Skill: phaser-gamedev

**Done when**:

- [ ] Depois da morte de um armado aparece em `worldProps` uma ferramenta em `rest` com `durabilityLeft` igual à durabilidade da def
- [ ] Pegar (K) e bater (J) num inimigo tira o dano da ferramenta e desgasta 1; arremessar deixa `thrown`
- [ ] Uma ferramenta parada some aos 20 s com fumaça e sai de `worldProps`
- [ ] Nova run: nenhuma ferramenta largada
- [ ] Gate check passes: `npm run build && npm test`

**Tests**: smoke
**Gate**: build

**Commit**: `feat(game): drop usable cursed tools from armed enemies`

---

### T12: Item na mão no HUD

**What**: o HUD mostra o nome do objeto segurado (com ` Rara` quando for o caso) e as pips `durability − impacts` de `durability`; `hud.heldItem` no snapshot; `Player` expõe o objeto segurado.
**Where**: `src/game/Hud.ts`, `src/game/Player.ts`, `src/scenes/TestScene.ts`
**Depends on**: T11
**Reuses**: `PROP_NAMES`, `PropMachine.impacts`
**Requirement**: ITEM-01, ITEM-02, ITEM-03, RAR-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Segurando a cadeira: `{ name: 'Cadeira', pips: 4, maxPips: 4 }`; depois de 2 impactos, `pips: 2`; de mãos vazias, `null`
- [ ] Gate check passes: `npm run build && npm test`

**Tests**: smoke
**Gate**: build

**Commit**: `feat(hud): show held item name and durability`

---

### T13: Cenários de smoke da economia

**What**: cenários novos:
- `drops.smoke.mjs`: fragmentos, ímã, coleta, HUD, pisca e expiração com `step`;
- `heal.smoke.mjs`: cura, teto e gota esperando com vida cheia;
- `armed.smoke.mjs`: arma, preparo, ferramenta largada, pegar, bater, arremessar, sumir aos 20 s, raro;
- `held-item.smoke.mjs`: cadeira e pips.

Cada um é determinístico por `?debug&seed=N` e pelas chaves de debug.
**Where**: `scripts/smoke/drops.smoke.mjs`, `scripts/smoke/heal.smoke.mjs`, `scripts/smoke/armed.smoke.mjs`, `scripts/smoke/held-item.smoke.mjs`
**Depends on**: None
**Reuses**: `scripts/smoke/lib.ts`, padrão de `boss.smoke.mjs`
**Requirement**: ECO-01, ECO-08, ECO-09, ECO-10, ECO-16, ECO-21, ECO-22, ECO-27, HEAL-03, HEAL-04, ARM-02, ARM-08, ARM-12, ARM-13, ARM-17, ARM-18, ITEM-02, RAR-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Os 4 cenários passam junto com os 7 existentes
- [ ] Gate check passes: `npm run build && npm test && npm run smoke`

**Tests**: smoke
**Gate**: full

**Commit**: `test(smoke): add economy, heal, armed enemy and held item scenarios`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1 ------→ T2 ------→ T3 ------→ T4 ------→ T5 ------→ T6
Phase 2:  T7
Phase 3:  T8 ------→ T9 ------→ T10 ------→ T11 ------→ T12
Phase 4:  T13
```

Lotes de execução: **Lote A** = Phase 1 + Phase 2 (T1–T7); **Lote B** = Phase 3 + Phase 4 (T8–T13).

---

## Validation

### Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | constantes + 1 classe pequena | ⚠️ Aceito: carteira é o consumidor direto do tuning |
| T2 | 1 classe | ✅ |
| T3 | 1 módulo | ✅ |
| T4 | 1 função + defs | ⚠️ Aceito: arma e ferramenta são a mesma regra |
| T5 | 1 classe | ✅ |
| T6 | 1 alteração | ✅ |
| T7 | grades + registro | ⚠️ Aceito: arte coesa |
| T8 | fatia vertical | ⚠️ Aceito: managers + ligação da cena |
| T9 | HUD | ✅ |
| T10 | fatia vertical | ⚠️ Aceito: spawn + sprite da arma |
| T11 | fatia vertical | ⚠️ Aceito: drop + ciclo de vida |
| T12 | HUD | ✅ |
| T13 | cenários de smoke | ✅ |

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
| T11 | T10 | T10 → T11 | ✅ |
| T12 | T11 | T11 → T12 | ✅ |
| T13 | None | início da Phase 4 | ✅ |

### Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | tuning + core | unit | unit | ✅ |
| T2–T6 | `src/core` | unit | unit | ✅ |
| T7 | arte e dados | unit | unit | ✅ |
| T8–T12 | adaptadores Phaser | smoke | smoke | ✅ |
| T13 | smoke | smoke | smoke | ✅ |
