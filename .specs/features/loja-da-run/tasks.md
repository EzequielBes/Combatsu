# Loja da run — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/loja-da-run/spec.md`
**Design**: `.specs/features/loja-da-run/design.md`
**Status**: Ready
**Branch**: `feat/loja-da-run` (a partir de `dev`; volta para `dev` com `--no-ff` após o Verifier PASS, AD-008)
**Test count before this feature**: 573

---

## Test Coverage Matrix

> Guidelines: `vitest.config.ts`; `.specs/STATE.md` AD-001/002/003/006; lição confirmada L-010 (limiares dos dois lados).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Lógica pura (`src/core/**`) | unit | 1:1 com os ACs; limites exatos dos dois lados (nível max/max+1, rodada 5/6 e 3/4, saldo = custo e custo − 1, vida cheia e cheia − 1, intermissão 2499/2500 ms) | `tests/core/*.test.ts` | `npm test` |
| Dados (`src/data/**`, cores do painel) | unit | Valores iguais às Assumptions; cores só da paleta | `tests/data/*.test.ts` | `npm test` |
| Adaptadores Phaser (`src/game/*.ts`, `src/scenes/**`) | smoke | Asserção no snapshot lendo o objeto vivo | `scripts/smoke/*.smoke.mjs` | `npm run smoke` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tasks com testes unitários | `npm run typecheck && npm test` |
| Full | Tasks com cenários de smoke | `npm run build && npm test && npm run smoke` |
| Build | Última task de cada fase | `npm run build && npm test` |

---

## Execution Plan

### Phase 1: Núcleo da loja (puro) — worker W1

```
T1 → T2 → T3 → T4 → T5 → T6 → T7
```

### Phase 2: Loja no jogo — worker W2

```
T8 → T9 → T10 → T11
```

### Phase 3: Debug e smoke — worker W3

```
T12 → T13 → T14
```

---

## Task Breakdown

### T1: Tuning e catálogo da loja

**What**: `SHOP` em `src/data/tuning.ts` e `SHOP_CATALOG` em `src/data/shop.ts` (tipos `ShopEntry`, `ModifierId`), na ordem vida, forca, agilidade, ima, sorte, cura, com raridade, `maxLevel`, `cost` e `minRound(nextLevel)` do design.
**Where**: `src/data/tuning.ts`, `src/data/shop.ts`
**Depends on**: None
**Reuses**: padrão de `ECONOMY`/`RUN`
**Requirement**: MOD-03, MOD-09, SHOP-18

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `tests/data/shop.test.ts` confere cada entrada contra as Assumptions (maxLevel 5/5/3/3/3/0, base/step, raridade)
- [x] `minRound`: vida e forca níveis 3 → 1, 4 → 6, 5 → 6; agilidade 2 → 1, 3 → 4; demais 1
- [x] MOD-03 conferido: For every modifier, the level SHALL stay in the range 0..maxLevel, with maxLevel 5 for `vida` and `forca` and 3 for `agilidade`, `ima` and `sorte`.
- [x] MOD-09 conferido: WHEN a modifier at level `n` is offered THEN its cost SHALL be `base + step × n`, with (base, step) = (12, 6) for `vida`, (15, 8) for `forca`, (10, 6) for `agilidade`, (6, 4) for `ima` and (10, 6) for `sorte`.
- [x] SHOP-18 conferido: For modifier `m` going to level `k`, the min round SHALL be 6 when `m` is `vida` or `forca` and `k` is 4 or 5, 4 when `m` is `agilidade` and `k` is 3, and 1 in every other case.
- [x] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(data): add shop catalog and tuning`

---

### T2: Modificadores com teto

**What**: classe `Modifiers` com `level`, `levels`, `canLevel`, `apply`, `reset`, `cost` e os derivados `maxHp`, `meleeDamage(base)`, `runSpeed`, `magnetRange`, `healChance` (base lida da tuning existente).
**Where**: `src/core/modifiers.ts`
**Depends on**: T1
**Reuses**: `PLAYER_HEALTH`, `PLAYER_MOVE`, `PICKUP`, `ECONOMY`
**Requirement**: MOD-01, MOD-02, MOD-03, MOD-04, MOD-05, MOD-06, MOD-07, MOD-08, MOD-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Níveis começam em 0; `apply` no max devolve `false` e não muda (vida 5/6, agilidade 3/4)
- [x] `maxHp` 100/115/175; `runSpeed` 220/237,6/272,8; `magnetRange` 72/93,6/136,8; `healChance` 0,10/0,13/0,19
- [x] `meleeDamage`: base 8 nível 0 → 8, nível 1 → 9 (8,8), base 18 nível 5 → 27; base 5 nível 1 → 6 (5,5 arredonda para cima)
- [x] `cost`: vida 12/18/36, forca 15/23, agilidade 10/16, ima 6/10, sorte 10/16
- [x] `reset` zera todos
- [x] MOD-01 conferido: WHEN a run starts THEN every modifier level SHALL be 0.
- [x] MOD-02 conferido: IF a modifier is at its max level THEN applying one more level SHALL leave its level unchanged and return `false`.
- [x] MOD-03 conferido: For every modifier, the level SHALL stay in the range 0..maxLevel, with maxLevel 5 for `vida` and `forca` and 3 for `agilidade`, `ima` and `sorte`.
- [x] MOD-04 conferido: WHILE `vida` is at level `n`, the player max HP SHALL be `100 + 15n`.
- [x] MOD-05 conferido: WHILE `forca` is at level `n`, each melee hit damage of the player (combo steps and held-prop hits) SHALL be `round(base × (1 + 0.10n))`, where `round` rounds halves up.
- [x] MOD-06 conferido: WHILE `agilidade` is at level `n`, the player run speed SHALL be `220 × (1 + 0.08n)` px/s.
- [x] MOD-07 conferido: WHILE `ima` is at level `n`, the pickup magnet range SHALL be `72 × (1 + 0.30n)` px.
- [x] MOD-08 conferido: WHILE `sorte` is at level `n`, the heal drop chance of a regular enemy SHALL be `0.10 + 0.03n`.
- [x] MOD-09 conferido: WHEN a modifier at level `n` is offered THEN its cost SHALL be `base + step × n`, with (base, step) = (12, 6) for `vida`, (15, 8) for `forca`, (10, 6) for `agilidade`, (6, 4) for `ima` and (10, 6) for `sorte`.
- [x] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(core): add capped run modifiers`

---

### T3: Teto de vida ajustável

**What**: `Health.setMax(n)` (hp = min(hp, n)); `reset()` volta ao `maxHp` da tuning.
**Where**: `src/core/health.ts`
**Depends on**: T2
**Reuses**: `Health.heal`
**Requirement**: MOD-04, MOD-11, MOD-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `setMax(115)` com hp 100 → max 115, hp 100; depois `heal(15)` → 115; `heal` cheio não passa de 115
- [x] `setMax(115)` com hp 110 e `heal(15)` → 115 (teto)
- [x] `reset()` → max 100 e hp 100
- [x] Testes antigos de `Health` continuam passando
- [x] MOD-04 conferido: WHILE `vida` is at level `n`, the player max HP SHALL be `100 + 15n`.
- [x] MOD-11 conferido: WHEN a `vida` level is bought THEN the player HP SHALL increase by 15, capped at the new max HP.
- [x] MOD-10 conferido: WHEN a new run starts after a game over THEN the player max HP SHALL be 100.
- [x] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(core): let health max be raised by modifiers`

---

### T4: Elegibilidade e sorteio das ofertas

**What**: `eligible(catalog, modifiers, round)` e `drawOffers(pool, rng, n)` ponderado sem reposição pelo algoritmo exato de SHOP-08.
**Where**: `src/core/shop.ts`
**Depends on**: T3
**Reuses**: `Rng.next`
**Requirement**: SHOP-06, SHOP-07, SHOP-39, SHOP-18, SHOP-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Vida no nível 3: fora do pool na rodada 5, dentro na 6; agilidade no nível 2: fora na 3, dentro na 4; modificador no max nunca entra
- [x] `cura` sempre no pool
- [x] `Rng` falso: `next()` = 0 pega a 1ª entrada; valores logo abaixo e acima de cada peso acumulado escolhem a entrada certa; sem repetição
- [x] Pool com 2 elegíveis → 2 ofertas; ids distintos em 1000 sorteios com seed
- [x] Mesma seed → mesmas ofertas
- [x] SHOP-06 conferido: WHEN the shop opens with `e` eligible entries THEN it SHALL hold exactly `min(3, e)` offers with pairwise distinct ids.
- [x] SHOP-07 conferido: The offer pool SHALL include a modifier if and only if its level is below its maxLevel and the min round of its next level (SHOP-18) is ≤ the current round.
- [x] SHOP-39 conferido: The offer pool SHALL always include the `cura` consumable.
- [x] SHOP-18 conferido: For modifier `m` going to level `k`, the min round SHALL be 6 when `m` is `vida` or `forca` and `k` is 4 or 5, 4 when `m` is `agilidade` and `k` is 3, and 1 in every other case.
- [x] SHOP-08 conferido: WHEN offers are drawn THEN slots 0, 1 and 2 SHALL be filled in order, each by taking `x = rng.next() × W` from the shop RNG, where `W` is the total weight of the eligible entries not yet drawn (common 3, rare 1), and picking the first of them in catalog order whose cumulative weight exceeds `x`.
- [x] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(core): draw weighted shop offers`

---

### T5: Compra, recusas e visão da loja

**What**: classe `Shop` com `buy(slot, ctx)` → `BuyResult`, efeitos por callback, `sold`, `view(...)` (custo, `affordable`, `Nv`, prévia) e `previewText`.
**Where**: `src/core/shop.ts`
**Depends on**: T4
**Reuses**: `Wallet.spend`, `Modifiers.apply`
**Requirement**: SHOP-45, SHOP-19, SHOP-41, SHOP-42, SHOP-43, SHOP-10, SHOP-11, SHOP-13, SHOP-12, SHOP-14, SHOP-15, SHOP-44, SHOP-21

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Saldo = custo → compra (carteira 0, nível +1, `sold`); saldo = custo − 1 → `funds`, nada muda
- [ ] Carta vendida → `sold`; espaço vazio → `empty`; nada muda nos dois
- [ ] `cura` com hp = max → `fullHp`; com hp = max − 1 → compra, hp = max; hp 70 → 100
- [ ] Depois de uma compra, as outras ofertas mantêm id, slot e custo; `affordable` = custo ≤ saldo
- [ ] `previewText` gera exatamente os textos das Assumptions (`Vida máx. 100 → 115`, `Dano ×1,0 → ×1,1`, `Velocidade 220 → 238`, `Ímã 72 → 94`, `Cura 10% → 13%`, `Vida 70 → 100`) e `Nv n+1/max`
- [ ] SHOP-45 conferido: WHEN key `k` (1, 2 or 3) is pressed while the run state is `shop` and slot `k − 1` holds an unsold offer whose cost ≤ the wallet count, and that offer is not `cura` with the player HP equal to max HP, THEN that offer SHALL be bought.
- [ ] SHOP-19 conferido: WHEN an offer is bought THEN the wallet count SHALL decrease by exactly the offer cost.
- [ ] SHOP-41 conferido: WHEN a modifier offer is bought THEN that modifier level SHALL increase by exactly 1.
- [ ] SHOP-42 conferido: WHEN an offer is bought THEN its `sold` flag SHALL become `true` and its card SHALL show the text `Comprado`.
- [ ] SHOP-43 conferido: WHEN an offer is bought THEN `events` SHALL get exactly one `buy:<id>:<cost>`.
- [ ] SHOP-10 conferido: IF key `k` is pressed in the shop while slot `k − 1` holds an unsold offer whose cost is greater than the wallet count THEN the wallet and every modifier level SHALL stay unchanged and `events` SHALL get `buyRefused:<id>:funds`.
- [ ] SHOP-11 conferido: IF key `k` is pressed in the shop while slot `k − 1` holds a sold offer THEN the wallet and every modifier level SHALL stay unchanged.
- [ ] SHOP-13 conferido: IF key `k` is pressed in the shop while slot `k − 1` holds the unsold `cura` offer and the player HP equals max HP THEN the wallet SHALL stay unchanged and `events` SHALL get `buyRefused:cura:fullHp`.
- [ ] SHOP-12 conferido: WHEN the `cura` offer is bought THEN the player HP SHALL become `min(hp + 30, maxHp)`.
- [ ] SHOP-14 conferido: IF key `k` is pressed in the shop while slot `k − 1` is empty THEN the wallet, every modifier level and `events` SHALL stay unchanged.
- [ ] SHOP-15 conferido: WHEN an offer is bought THEN every other offer of that shop SHALL keep the same id, slot and cost it had before.
- [ ] SHOP-44 conferido: The `affordable` flag of each unsold offer SHALL equal `cost ≤ wallet count` in every frame.
- [ ] SHOP-21 conferido: Each unsold card SHALL show, top to bottom, the name, the level text `Nv <n+1>/<max>` (blank for `cura`), the preview text defined in Assumptions and the cost.
- [ ] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(core): buy shop offers with refusals`

---

### T6: Reroll e seleção

**What**: `Shop.reroll(wallet)` e `Shop.move(±1)`/`selected`.
**Where**: `src/core/shop.ts`
**Depends on**: T5
**Reuses**: `drawOffers`
**Requirement**: SHOP-16, SHOP-25, SHOP-17, SHOP-26, SHOP-27, SHOP-28, SHOP-29, SHOP-30

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Loja nova: `rerollCost` 5, `selected` 0
- [ ] Reroll com saldo 5 → saldo 0, 3 ofertas novas, custo 10; com saldo 4 → recusado, nada muda; 5 → 10 → 15
- [ ] `move(+1)` 0 → 1 → 2 → 0; `move(−1)` 0 → 2
- [ ] Comprar pelo `selected` = comprar pelo slot equivalente
- [ ] SHOP-16 conferido: WHEN `R` is pressed in the shop and the reroll cost ≤ the wallet count THEN the wallet SHALL decrease by the reroll cost and 3 new offers SHALL be drawn by SHOP-08 rules.
- [ ] SHOP-25 conferido: WHEN a reroll happens THEN the reroll cost of that shop SHALL increase by 5.
- [ ] SHOP-17 conferido: WHEN a shop opens THEN its reroll cost SHALL be 5.
- [ ] SHOP-26 conferido: IF `R` is pressed with the reroll cost greater than the wallet count THEN nothing SHALL change and `events` SHALL get `rerollRefused`.
- [ ] SHOP-27 conferido: WHEN the shop opens THEN the selected slot SHALL be 0.
- [ ] SHOP-28 conferido: WHEN `→` or `D` is pressed in the shop THEN the selected slot SHALL become `(selected + 1) mod 3`.
- [ ] SHOP-29 conferido: WHEN `←` or `A` is pressed in the shop THEN the selected slot SHALL become `(selected + 2) mod 3`.
- [ ] SHOP-30 conferido: WHEN `J` is pressed in the shop THEN a purchase SHALL be attempted for the selected slot, exactly as SHOP-45 does for key `<selected + 1>`.
- [ ] Gate check passes: `npm run typecheck && npm test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(core): add shop reroll and selection`

---

### T7: Estado `shop` na run

**What**: `RunState` `'shop'`, comando `shopOpen`, `closeShop()`, `shopRng` (`seed ^ 0x85ebca6b`), `acceptsPlayerInput('shop') = false`.
**Where**: `src/core/run.ts`
**Depends on**: T6
**Reuses**: padrão de `lootRng` e eventos pendentes
**Requirement**: SHOP-01, SHOP-02, SHOP-03, SHOP-04, SHOP-09, SHOP-40

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Intermissão 2499 ms → ainda `intermission`; 2500 ms → `shop` com `shopOpen` da rodada limpa
- [ ] Em `shop`, 10 s de `update` não emitem `spawn` nem mudam a rodada
- [ ] `closeShop()` → `roundActive`, rodada + 1, `roundStart`; `closeShop()` fora de `shop` não faz nada
- [ ] Morte do player durante a intermissão vence a abertura da loja
- [ ] `shopRng` = `new Rng(seed ^ 0x85ebca6b)`; ondas e loot idênticos com e sem sorteios na loja
- [ ] Testes de `run.test.ts` atualizados para passar pela loja
- [ ] SHOP-01 conferido: WHEN the run state is `intermission` and its timer reaches 2500 ms THEN the run state SHALL become `shop`.
- [ ] SHOP-02 conferido: WHILE the run state is `shop`, the run SHALL emit no `spawn` command.
- [ ] SHOP-03 conferido: WHEN `Enter` is pressed while the run state is `shop` THEN the run state SHALL become `roundActive` with the round equal to the cleared round + 1.
- [ ] SHOP-04 conferido: WHILE the run state is `shop`, the player SHALL receive neutral input (no movement, jump or attack).
- [ ] SHOP-09 conferido: WHEN a run starts with seed `s` THEN the shop RNG SHALL be created as `new Rng(s ^ 0x85ebca6b)`.
- [ ] SHOP-40 conferido: For the same run seed, the wave spawn orders and the loot draws SHALL be identical whether or not shop draws happen.
- [ ] Gate check passes: `npm run build && npm test`

**Tests**: unit
**Gate**: build

**Commit**: `feat(core): add shop state between rounds`

---

### T8: Modificadores no jogo

**What**: `Player` usa `modifiers.meleeDamage` (combo e objeto segurado) e `runSpeed`; compra de `vida` chama `setMax` + `heal(15)`; `Pickups` usa `magnetRange`; `Loot` usa `healChance` com o override de debug vencendo; nova run zera tudo.
**Where**: `src/game/Player.ts`, `src/game/Prop.ts`, `src/game/Pickups.ts`, `src/core/loot.ts`, `src/scenes/TestScene.ts`
**Depends on**: None (fase 1 inteira)
**Reuses**: `Modifiers`
**Requirement**: MOD-04, MOD-05, MOD-06, MOD-07, MOD-08, MOD-10, MOD-11, MOD-12

**Tools**:

- MCP: NONE
- Skill: `phaser-gamedev`

**Done when**:

- [ ] `loot.test.ts`: chance com sorte 0/3 e override `heal=1` vencendo
- [ ] Build passa; smoke atual continua verde
- [ ] MOD-04 conferido: WHILE `vida` is at level `n`, the player max HP SHALL be `100 + 15n`.
- [ ] MOD-05 conferido: WHILE `forca` is at level `n`, each melee hit damage of the player (combo steps and held-prop hits) SHALL be `round(base × (1 + 0.10n))`, where `round` rounds halves up.
- [ ] MOD-06 conferido: WHILE `agilidade` is at level `n`, the player run speed SHALL be `220 × (1 + 0.08n)` px/s.
- [ ] MOD-07 conferido: WHILE `ima` is at level `n`, the pickup magnet range SHALL be `72 × (1 + 0.30n)` px.
- [ ] MOD-08 conferido: WHILE `sorte` is at level `n`, the heal drop chance of a regular enemy SHALL be `0.10 + 0.03n`.
- [ ] MOD-10 conferido: WHEN a new run starts after a game over THEN the player max HP SHALL be 100.
- [ ] MOD-11 conferido: WHEN a `vida` level is bought THEN the player HP SHALL increase by 15, capped at the new max HP.
- [ ] MOD-12 conferido: WHERE the debug mode is on and the URL has `heal=1` THEN the heal drop chance SHALL be 1 regardless of the `sorte` level.
- [ ] Gate check passes: `npm run build && npm test`

**Tests**: unit
**Gate**: build

**Commit**: `feat(game): apply run modifiers to player, pickups and loot`

---

### T9: Fluxo da loja na cena

**What**: no `shopOpen`, varre fragmentos para a carteira, pausa o Matter, pula o gameplay, emite `shopOpen:<r>`; `ShopInput` (1/2/3, Enter, R, J, setas/A-D) só em `shop`; `R` só reinicia fora da loja; `Enter` fecha (`shopClose`), retoma o Matter; eventos `buy`/`buyRefused`/`rerollRefused`.
**Where**: `src/scenes/TestScene.ts`, `src/game/input.ts`
**Depends on**: T8
**Reuses**: `Shop`, `Wallet`, `Pickups`
**Requirement**: SHOP-32, SHOP-33, SHOP-35, SHOP-05, SHOP-36, SHOP-37, SHOP-20, SHOP-45

**Tools**:

- MCP: NONE
- Skill: `phaser-gamedev`

**Done when**:

- [ ] Build passa; `npm run smoke` continua verde com o helper de T13 ainda não criado (cenários que passam da rodada 1 podem ficar para T13)
- [ ] SHOP-32 conferido: WHEN the run state becomes `shop` THEN `events` SHALL get exactly one `shopOpen:<r>`, where `r` is the round just cleared.
- [ ] SHOP-33 conferido: WHILE the run state is `shop`, the scene SHALL skip the gameplay update, so the player, enemy and pickup positions and the pickup ages SHALL stay the same between frames.
- [ ] SHOP-35 conferido: WHEN the shop closes THEN `events` SHALL get exactly one `shopClose`.
- [ ] SHOP-05 conferido: WHEN the shop opens THEN the wallet count SHALL increase by exactly the sum of the values of the fragment pickups alive in the frame before it opened.
- [ ] SHOP-36 conferido: WHEN the shop opens THEN no fragment pickup SHALL remain in the scene.
- [ ] SHOP-37 conferido: WHEN the shop opens THEN every heal pickup SHALL remain in the scene at the same position.
- [ ] SHOP-20 conferido: WHILE the run state is not `shop`, the keys `1`, `2`, `3` and `Enter` SHALL not attempt any purchase.
- [ ] SHOP-45 conferido: WHEN key `k` (1, 2 or 3) is pressed while the run state is `shop` and slot `k − 1` holds an unsold offer whose cost ≤ the wallet count, and that offer is not `cura` with the player HP equal to max HP, THEN that offer SHALL be bought.
- [ ] Gate check passes: `npm run build && npm test`

**Tests**: none (smoke em T14)
**Gate**: build

**Commit**: `feat(game): open the shop between rounds`

---

### T10: Painel da loja

**What**: `ShopPanel` na câmera de UI com 3 cartas, textos de `Shop.view`, "Esgotado", "Comprado", borda por raridade e realce do selecionado, dica de teclas; `SHOP_PANEL_COLORS` com chaves da paleta.
**Where**: `src/game/ShopPanel.ts`, `src/game/art/shopPanel.ts` (cores puras)
**Depends on**: T9
**Reuses**: `PALETTE`, padrão do `Hud`
**Requirement**: SHOP-21, SHOP-38, SHOP-31, SHOP-24

**Tools**:

- MCP: NONE
- Skill: `phaser-gamedev`

**Done when**:

- [ ] `tests/game/shopPanel.test.ts`: toda cor de `SHOP_PANEL_COLORS` é chave de `PALETTE`
- [ ] SHOP-21 conferido: Each unsold card SHALL show, top to bottom, the name, the level text `Nv <n+1>/<max>` (blank for `cura`), the preview text defined in Assumptions and the cost.
- [ ] SHOP-38 conferido: WHILE the shop holds fewer than 3 offers, each empty slot SHALL show the text `Esgotado`.
- [ ] SHOP-31 conferido: WHILE a slot is selected, its card SHALL be drawn with a highlighted border and all other cards SHALL not.
- [ ] SHOP-24 conferido: Every color key used by the shop panel (background, card borders and texts) SHALL be a key of `PALETTE`.
- [ ] Gate check passes: `npm run build && npm test`

**Tests**: unit
**Gate**: build

**Commit**: `feat(hud): draw the shop panel`

---

### T11: Polimento da loja

**What**: painel desce em 200 ms; na compra a carta pisca, "−N" sobe do custo e o contador pula; varredura faz o contador pular; custo sem saldo em cor de perigo.
**Where**: `src/game/ShopPanel.ts`, `src/game/Hud.ts`
**Depends on**: T10
**Reuses**: `FloatTexts`, pulso do contador do `Hud`
**Requirement**: SHOP-21, SHOP-46

**Tools**:

- MCP: NONE
- Skill: `phaser-gamedev`

**Done when**:

- [ ] Build passa e nada da cena anda durante as animações
- [ ] SHOP-21 conferido: Each unsold card SHALL show, top to bottom, the name, the level text `Nv <n+1>/<max>` (blank for `cura`), the preview text defined in Assumptions and the cost.
- [ ] SHOP-46 conferido: WHEN a reroll happens THEN the hint line SHALL show `R rerolar (<c>)`, where `c` is the new reroll cost.
- [ ] Gate check passes: `npm run build && npm test`

**Tests**: none
**Gate**: build

**Commit**: `feat(hud): add shop feedback animations`

---

### T12: Debug da loja

**What**: `?debug&fragments=N` e campos `shop`, `modifiers`, `player.maxHp` no snapshot.
**Where**: `src/game/debugApi.ts`, `src/scenes/TestScene.ts`
**Depends on**: None (fase 2 inteira)
**Reuses**: parse de `?round=`
**Requirement**: SHOP-22, SHOP-23

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Build passa; snapshot mostra os campos
- [ ] SHOP-22 conferido: WHERE the debug mode is on, the snapshot SHALL include the `shop`, `modifiers` and `player.maxHp` fields of the contract above, with `shop.open` true if and only if the run state is `shop`.
- [ ] SHOP-23 conferido: WHERE the debug mode is on and the URL has `fragments=N` with integer N ≥ 0 THEN the wallet SHALL be N when the run starts.
- [ ] Gate check passes: `npm run build && npm test`

**Tests**: none
**Gate**: build

**Commit**: `feat(debug): expose shop state and starting fragments`

---

### T13: Smokes existentes passam pela loja

**What**: helper `continueShop(page)` em `scripts/smoke/lib.ts` e ajuste dos cenários que avançam de rodada (`run-loop`, `boss`, `boss-victory`, `hud`, `heal`, `drops`, conforme falharem).
**Where**: `scripts/smoke/lib.ts`, `scripts/smoke/*.smoke.mjs`
**Depends on**: T12
**Reuses**: helpers de `lib.ts`
**Requirement**: SHOP-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `npm run smoke` volta a ficar verde nos 11 cenários
- [ ] SHOP-03 conferido: WHEN `Enter` is pressed while the run state is `shop` THEN the run state SHALL become `roundActive` with the round equal to the cleared round + 1.
- [ ] Gate check passes: `npm run build && npm test && npm run smoke`

**Tests**: smoke
**Gate**: full

**Commit**: `test(smoke): continue through the shop between rounds`

---

### T14: Smoke da loja

**What**: `scripts/smoke/shop.smoke.mjs` com `?debug&seed=1&fragments=200`: limpa a rodada 1, confere `shopOpen:1`, varredura, nada anda em 1 s, compra `vida` (maxHp 115, carteira −12, `buy:vida:12`), recusa por saldo com `fragments=0` numa segunda página, `cura` com vida cheia recusada, forca 1 muda o dano, reroll 5 → 10, `D`,`D`,`J` compra a carta 3, `Enter` → rodada 2 e `shopClose`.
**Where**: `scripts/smoke/shop.smoke.mjs`
**Depends on**: T13
**Reuses**: helpers de `lib.ts`
**Requirement**: SHOP-01, SHOP-32, SHOP-33, SHOP-03, SHOP-35, SHOP-05, SHOP-36, SHOP-37, SHOP-45, SHOP-19, SHOP-41, SHOP-43, SHOP-10, SHOP-13, SHOP-16, SHOP-28, SHOP-30, SHOP-20, SHOP-22, SHOP-23, MOD-04, MOD-05, MOD-06, MOD-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Cenário `shop` passa junto com os outros 11
- [ ] SHOP-01 conferido: WHEN the run state is `intermission` and its timer reaches 2500 ms THEN the run state SHALL become `shop`.
- [ ] SHOP-32 conferido: WHEN the run state becomes `shop` THEN `events` SHALL get exactly one `shopOpen:<r>`, where `r` is the round just cleared.
- [ ] SHOP-33 conferido: WHILE the run state is `shop`, the scene SHALL skip the gameplay update, so the player, enemy and pickup positions and the pickup ages SHALL stay the same between frames.
- [ ] SHOP-03 conferido: WHEN `Enter` is pressed while the run state is `shop` THEN the run state SHALL become `roundActive` with the round equal to the cleared round + 1.
- [ ] SHOP-35 conferido: WHEN the shop closes THEN `events` SHALL get exactly one `shopClose`.
- [ ] SHOP-05 conferido: WHEN the shop opens THEN the wallet count SHALL increase by exactly the sum of the values of the fragment pickups alive in the frame before it opened.
- [ ] SHOP-36 conferido: WHEN the shop opens THEN no fragment pickup SHALL remain in the scene.
- [ ] SHOP-37 conferido: WHEN the shop opens THEN every heal pickup SHALL remain in the scene at the same position.
- [ ] SHOP-45 conferido: WHEN key `k` (1, 2 or 3) is pressed while the run state is `shop` and slot `k − 1` holds an unsold offer whose cost ≤ the wallet count, and that offer is not `cura` with the player HP equal to max HP, THEN that offer SHALL be bought.
- [ ] SHOP-19 conferido: WHEN an offer is bought THEN the wallet count SHALL decrease by exactly the offer cost.
- [ ] SHOP-41 conferido: WHEN a modifier offer is bought THEN that modifier level SHALL increase by exactly 1.
- [ ] SHOP-43 conferido: WHEN an offer is bought THEN `events` SHALL get exactly one `buy:<id>:<cost>`.
- [ ] SHOP-10 conferido: IF key `k` is pressed in the shop while slot `k − 1` holds an unsold offer whose cost is greater than the wallet count THEN the wallet and every modifier level SHALL stay unchanged and `events` SHALL get `buyRefused:<id>:funds`.
- [ ] SHOP-13 conferido: IF key `k` is pressed in the shop while slot `k − 1` holds the unsold `cura` offer and the player HP equals max HP THEN the wallet SHALL stay unchanged and `events` SHALL get `buyRefused:cura:fullHp`.
- [ ] SHOP-16 conferido: WHEN `R` is pressed in the shop and the reroll cost ≤ the wallet count THEN the wallet SHALL decrease by the reroll cost and 3 new offers SHALL be drawn by SHOP-08 rules.
- [ ] SHOP-28 conferido: WHEN `→` or `D` is pressed in the shop THEN the selected slot SHALL become `(selected + 1) mod 3`.
- [ ] SHOP-30 conferido: WHEN `J` is pressed in the shop THEN a purchase SHALL be attempted for the selected slot, exactly as SHOP-45 does for key `<selected + 1>`.
- [ ] SHOP-20 conferido: WHILE the run state is not `shop`, the keys `1`, `2`, `3` and `Enter` SHALL not attempt any purchase.
- [ ] SHOP-22 conferido: WHERE the debug mode is on, the snapshot SHALL include the `shop`, `modifiers` and `player.maxHp` fields of the contract above, with `shop.open` true if and only if the run state is `shop`.
- [ ] SHOP-23 conferido: WHERE the debug mode is on and the URL has `fragments=N` with integer N ≥ 0 THEN the wallet SHALL be N when the run starts.
- [ ] MOD-04 conferido: WHILE `vida` is at level `n`, the player max HP SHALL be `100 + 15n`.
- [ ] MOD-05 conferido: WHILE `forca` is at level `n`, each melee hit damage of the player (combo steps and held-prop hits) SHALL be `round(base × (1 + 0.10n))`, where `round` rounds halves up.
- [ ] MOD-06 conferido: WHILE `agilidade` is at level `n`, the player run speed SHALL be `220 × (1 + 0.08n)` px/s.
- [ ] MOD-07 conferido: WHILE `ima` is at level `n`, the pickup magnet range SHALL be `72 × (1 + 0.30n)` px.
- [ ] Gate check passes: `npm run build && npm test && npm run smoke`

**Tests**: smoke
**Gate**: full

**Commit**: `test(smoke): cover the run shop`
