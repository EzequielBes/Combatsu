# Loja da run — Design

**Spec**: `.specs/features/loja-da-run/spec.md`
**Decisões usadas**: AD-001 (regra pura em `src/core`), AD-002 (paleta), AD-003 (câmera de UI), AD-004/AD-005 (economia e níveis), AD-006 (RNG com seed), AD-008 (branch).
**Lições confirmadas**: L-010 — todo limiar testado dos dois lados (nível max/max+1, rodada 5/6 e 3/4, saldo = custo e custo − 1, vida cheia e cheia − 1).

## Abordagem

Três peças puras e um adaptador:

```
Run (estado 'shop', shopRng) ──► TestScene ──► Shop (ofertas, compra, reroll, seleção)
                                    │                 │
                                    │                 └─► Modifiers (níveis, custo, valores derivados)
                                    ├─► Player / Pickups / Loot leem Modifiers a cada uso
                                    └─► ShopPanel (Phaser, câmera de UI) desenha o ShopView
```

- `Run` só ganha o estado e o RNG; ela não conhece o catálogo.
- `Shop` é recriada a cada abertura (`new Shop(catalog, modifiers, rng, round, ctx)`); guarda ofertas, `sold`, `rerollCost` e `selected`. Compra devolve um resultado tipado; a cena traduz em `events`.
- `Modifiers` é a única fonte dos valores derivados; os adaptadores perguntam a ela na hora (sem copiar números), então comprar tem efeito no frame seguinte e o reset da run zera tudo.

## Code Reuse Analysis

### Existing Components to Leverage

| Componente | Onde | Uso |
| --- | --- | --- |
| `Wallet.spend/add` | `src/core/wallet.ts` | Pagar ofertas e reroll; crédito da varredura de fragmentos |
| `Rng` | `src/core/rng.ts` | `shopRng` (`next()` para o sorteio ponderado) |
| Padrão `lootRng` | `src/core/run.ts` | Criar `shopRng` no mesmo ponto do start |
| `Health.heal` | `src/core/health.ts` | Compra de `vida` (+15) e `cura` (+30) |
| `FloatTexts` | `src/game/FloatTexts.ts` | "−N" da compra |
| `Hud` (pulso do contador) | `src/game/Hud.ts` | Carteira pulando na compra e na varredura |
| `PALETTE` | `src/game/art/palette.ts` | Todas as cores do painel |
| `isDebug`, parse de `?round=`/`?seed=` | `src/scenes/TestScene.ts` | Mesmo padrão para `?fragments=N` |

### Integration Points

- `Run.update`: em `intermission`, ao chegar a 2500 ms, vai para `shop` (em vez de `roundActive`) e emite `{ type: 'shopOpen', round }`. Novo método `closeShop()` registra o pedido; o `update` seguinte faz `round++`, cria o `WaveSpawner` e emite `roundStart` (mesma ordem de resolução por evento pendente que já existe).
- `acceptsPlayerInput('shop')` = `false` (SHOP-04).
- `TestScene.update`: com `run.state === 'shop'`, pula todo o bloco de gameplay (player, pickups, inimigos, props, projéteis) e só roda `shopInput`, `run.update`, painel e HUD. `this.matter.world.pause()` ao abrir e `resume()` ao fechar, porque o Matter avança fora do `update` da cena.
- Tecla `R` hoje reinicia a cena: passa a reiniciar só fora de `shop`; em `shop` é reroll.
- `Player`: dano do golpe (`step.damage`, linha ~394) e do objeto segurado passam por `modifiers.meleeDamage(base)`; `stepMovement` recebe `{ ...PLAYER_MOVE, runSpeed: modifiers.runSpeed }`.
- `Health`: novo `setMax(n)` (só aumenta ou diminui o teto; `hp = min(hp, n)`); a compra de `vida` chama `setMax` e depois `heal(15)`; `reset()` da nova run volta a `maxHp` da tuning.
- `Pickups`/`stepPickup`: `magnetRange` vem de `modifiers.magnetRange`.
- `Loot`: `healChance = overrides.healChance ?? modifiers.healChance` (MOD-12: o debug vence).

## Components

### `src/data/shop.ts` (novo)

```ts
export type ShopEntryKind = 'modifier' | 'consumable';        // F5 acrescenta 'technique'
export type ModifierId = 'vida' | 'forca' | 'agilidade' | 'ima' | 'sorte';
export interface ShopEntry {
  id: ModifierId | 'cura';
  kind: ShopEntryKind;
  rarity: 'common' | 'rare';
  name: string;                 // 'Vida', 'Força', 'Agilidade', 'Ímã', 'Sorte', 'Cura rápida'
  maxLevel: number;             // 0 para consumível
  cost: { base: number; step: number };
  minRound: (nextLevel: number) => number;   // SHOP-18
}
export const SHOP_CATALOG: readonly ShopEntry[];   // ordem: vida, forca, agilidade, ima, sorte, cura (SHOP-08 usa essa ordem)
```

`SHOP` em `src/data/tuning.ts`: `{ offers: 3, weights: { common: 3, rare: 1 }, rerollBase: 5, rerollStep: 5, rngSalt: 0x85ebca6b, curaHp: 30, vidaPerLevel: 15, forcaPerLevel: 0.10, agilidadePerLevel: 0.08, imaPerLevel: 0.30, sortePerLevel: 0.03 }`.

### `Modifiers` (novo, `src/core/modifiers.ts`)

- `level(id)`, `levels` (cópia), `canLevel(id)`, `apply(id): boolean` (MOD-02/03), `reset()` (MOD-01/10), `cost(entry)` = `base + step × level` (MOD-09).
- Derivados: `maxHp` (100 + 15n), `meleeDamage(base)` = `roundHalfUp(base × (1 + 0.10n))`, `runSpeed` = 220 × (1 + 0.08n), `magnetRange` = 72 × (1 + 0.30n), `healChance` = 0.10 + 0.03n. Os valores-base vêm de `PLAYER_HEALTH`, `PLAYER_MOVE`, `PICKUP`, `ECONOMY` (sem números repetidos).

### `Shop` (novo, `src/core/shop.ts`)

- `eligible(catalog, modifiers, round)` (SHOP-07/18/39).
- `drawOffers(pool, rng, n)` ponderado sem reposição (SHOP-06/08).
- `class Shop`: `offers: (Offer | null)[3]`, `rerollCost`, `selected`; `buy(slot, ctx: { wallet, hp, maxHp }) → BuyResult` com `{ ok: true, id, cost } | { ok: false, reason: 'empty' | 'sold' | 'funds' | 'fullHp' }`; efeito aplicado por callback (`applyModifier`, `healPlayer`) para a loja não conhecer o Player. `reroll(wallet)` (SHOP-16/25/26), `move(±1)` (SHOP-27..29), `view(wallet, hp, maxHp)` → dados prontos para o painel e o snapshot (custo atual, `affordable`, textos `Nv`, prévia).
- `previewText(entry, modifiers, hp)` puro (formatos das Assumptions; vírgula decimal).

### `Run` (alterado)

`RunState` ganha `'shop'`; `RunCommand` ganha `{ type: 'shopOpen'; round }`; `shopRng` criado no start com `seed ^ SHOP.rngSalt` (SHOP-09); `closeShop()`.

### `ShopPanel` (novo, `src/game/ShopPanel.ts`)

Container na câmera de UI (principal ignora). Fundo escuro, 3 cartas 150×120, borda por raridade (`g` comum, `U` raro), borda realçada no `selected`, custo em cor de perigo sem saldo, "Esgotado"/"Comprado". `show(view)`, `update(view)`, `hide()`, `flash(slot)`. Descida de 200 ms e flash de 120 ms são tweens (tempo real). Cores num objeto `SHOP_PANEL_COLORS` de chaves da paleta (testável sem Phaser, SHOP-24).

### `ShopInput` (novo, em `src/game/input.ts`)

Lê `1/2/3`, `Enter`, `R`, `J`, `←/→`, `A/D` com `JustDown`, só consultado em `shop`.

### Debug

`?debug&fragments=N` (inteiro ≥ 0) credita N no start (SHOP-23). Snapshot: `shop` (de `Shop.view`), `modifiers.levels`, `player.maxHp` (SHOP-22).

## Data Models

Ver `ShopEntry`, `SHOP` e `BuyResult` acima. `Offer = { id, entry }`; `sold` fica num `Set<number>` de slots.

## Error Handling Strategy

- Toda recusa é um `BuyResult` com `reason`; carteira e níveis só mudam depois de `wallet.spend` devolver `true` (ordem: checar → gastar → aplicar).
- `?fragments=` inválido (não inteiro, negativo) é ignorado.
- Menos de 3 elegíveis → espaços `null` ("Esgotado").

## Risks & Concerns

| Risco | Mitigação |
| --- | --- |
| Smokes atuais esperam a rodada 2 logo após a intermissão (`run-loop`, `boss*`, `drops`) | T13 ajusta cada um para apertar `Enter` quando `run.state === 'shop'`, via helper em `scripts/smoke/lib.ts` |
| Matter continua simulando durante a loja | `matter.world.pause/resume` (T9) e AC SHOP-33 conferido no smoke |
| `R` reinicia a cena | Guardar `R` fora de `shop` (T9) |
| Dano de objeto segurado passa por outro caminho (`Prop.ts`) | T8 cobre os dois caminhos e o smoke confere `damage` num golpe com `forca` 1 |

## Tech Decisions

- A loja é um estado da `Run`, não uma cena Phaser separada: mantém câmera, HUD e snapshot iguais e evita reiniciar objetos.
- Valores derivados sempre lidos da `Modifiers` (sem cache nos adaptadores).
