# Loja da run — Specification

## Problem Statement

A F3 encheu a carteira de fragmentos, mas não há onde gastar: juntar moeda não muda nada na run. Falta a escolha entre rodadas que dá curva de poder e faz cada run ficar diferente da anterior (AD-004).

Esta feature abre uma **loja entre rodadas** com 3 ofertas sorteadas, onde o jogador compra **modificadores de atributo com teto** (vida máxima, força, agilidade, ímã, sorte) e uma cura consumível. Níveis altos só aparecem depois de uma rodada mínima (AD-005). O catálogo é dirigido por dados, para a F5 vender técnicas e upgrades de energia pela mesma loja.

## Goals

- [ ] Depois de cada rodada limpa, a loja abre com 3 ofertas e a próxima rodada só começa quando o jogador escolhe continuar.
- [ ] Cada compra muda um número visível do jogo (vida máxima, dano, velocidade, raio do ímã, chance de cura) e a carta mostra o antes → depois.
- [ ] Todo modificador tem nível máximo; níveis altos exigem rodada mínima; nada passa do teto.
- [ ] Toda regra de oferta, custo, compra e reroll vive em `src/core`/`src/data`, usa um stream de RNG próprio (AD-006) e é testada em Node (AD-001).

## Out of Scope

| Feature | Reason |
| --- | --- |
| Técnicas amaldiçoadas e upgrades de energia na loja | F5; aqui o catálogo só aceita `kind` novo sem mudar a lógica |
| Selos e upgrades permanentes | F6 (meta-progressão) |
| Vender ou desfazer upgrades | Escolha precisa ter peso; desfazer tira a tensão |
| Mouse na loja | O jogo inteiro é por teclado |
| Mercador andando no mapa | Custo de arte e IA sem ganho na escolha; a loja é um painel |
| Som da loja | Sem assets (mesma decisão da F2 e F3) |

---

## Assumptions & Open Questions

Todas as decisões abaixo foram tomadas pelo agente por delegação do usuário ("decidir seguindo a própria recomendação, com foco em diversão"). Números ficam em `src/data/tuning.ts` (`SHOP`) e o catálogo em `src/data/shop.ts`.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Quando a loja abre | Ao fim da intermissão de 2500 ms de toda rodada limpa, inclusive a de chefe | A intermissão já deixa o ímã recolher os fragmentos; a loja vem depois, com a carteira cheia | y |
| Tempo durante a loja | Estado `shop` na `Run`: nenhum spawn, nenhum timer da run e nenhuma atualização de gameplay (player, inimigos, pickups) | Escolher com calma; nada expira enquanto o jogador lê as cartas | y |
| Fragmentos no chão ao abrir | Todo fragmento vivo é creditado na carteira e removido ao abrir a loja | Ninguém perde moeda por ter ficado longe; gotas de cura ficam no chão | y |
| Sair da loja | `Enter` continua; a próxima rodada começa no mesmo frame | Uma tecla só, sem confirmação extra | y |
| Número de ofertas | 3 cartas distintas por loja; se houver menos elegíveis, os espaços vazios mostram "Esgotado" | Escolha clara sem virar menu | y |
| Elegível | Modificador abaixo do nível máximo e cuja rodada mínima do próximo nível ≤ rodada atual; consumível sempre | Nunca oferecer o que não pode ser comprado por regra | y |
| Sorteio | Sem reposição, por peso de raridade: comum 3, raro 1 | Raros aparecem cerca de 1 vez a cada 3 lojas | y |
| RNG da loja | Stream próprio `new Rng(seed ^ 0x85ebca6b)` criado no início da run | Ondas (F1) e drops (F3) não mudam com a loja; runs reproduzíveis | y |
| Custo | `base + step × nível atual` (nível atual antes da compra; 0 para o primeiro) | Cresce linear, previsível para o jogador | y |
| Vida (comum) | +15 de vida máxima por nível, máx. 5; custo 12 + 6n; níveis 4–5 exigem rodada ≥ 6. A compra também cura 15 | Comprar vida dá sensação imediata | y |
| Força (raro) | Dano corpo a corpo do player ×(1 + 0,10n), máx. 5, arredondado com meio para cima; custo 15 + 8n; níveis 4–5 exigem rodada ≥ 6 | O upgrade mais forte é o mais caro e mais raro | y |
| Agilidade (comum) | Velocidade de corrida ×(1 + 0,08n), máx. 3; custo 10 + 6n; nível 3 exige rodada ≥ 4 | Teto baixo para não quebrar o controle | y |
| Ímã (comum) | Raio do ímã ×(1 + 0,30n), máx. 3; custo 6 + 4n | Barato; qualidade de vida | y |
| Sorte (raro) | Chance de cura por abate + 0,03n, máx. 3; custo 10 + 6n | Sustento dentro da run | y |
| Cura rápida (consumível, comum) | Restaura 30 HP; custo 8; recusada com vida cheia | Válvula de segurança antes do chefe | y |
| Compra | Carta comprada vira "Comprado" e não pode ser comprada de novo nesta loja | Uma escolha por carta; pode comprar mais de uma carta se houver saldo | y |
| Reroll (P2) | `R` sorteia 3 novas ofertas; custa 5, +5 a cada reroll na mesma loja; volta a 5 na loja seguinte | Dá agência sem virar caça-níquel | y |
| Teclas | P1: `1`/`2`/`3` compram a carta, `Enter` continua. P2: `←`/`→` ou `A`/`D` movem a seleção, `J` compra a selecionada, `R` rerola | Mesmo teclado do jogo; `J` já é "confirmar" no título | y |
| Prévia na carta | `vida`: `Vida máx. 100 → 115`; `forca`: `Dano ×1,0 → ×1,1`; `agilidade`: `Velocidade 220 → 238` (arredondado); `ima`: `Ímã 72 → 94` (arredondado); `sorte`: `Cura 10% → 13%`; `cura`: `Vida 70 → 100` (hp atual → `min(hp + 30, max)`) | O jogador vê o ganho antes de pagar | y |
| Fim da run | Game over zera todos os níveis de modificador | Upgrades da run são temporários (AD-004) | y |
| Debug | `?debug&fragments=N` começa a run com N fragmentos | Smoke determinístico sem farmar | y |
| Painel | Na câmera de UI (AD-003); só cores da `PALETTE` (AD-002); texto em português | Mesmas regras do HUD | y |

**Open questions:** none - all resolved or logged above.

**Implicit-requirement dimensions sweep:**
- State-transition integrity: coberta por SHOP-01..SHOP-04 e SHOP-20 (intermissão → loja → rodada; game over dentro da loja é impossível porque o gameplay para).
- Input validation & bounds: coberta por MOD-02, MOD-03 (teto de nível), SHOP-10 (saldo insuficiente), SHOP-11 (carta já comprada), SHOP-13 (cura com vida cheia) e SHOP-14 (índice fora de 1–3).
- Failure / partial-failure states: coberta por SHOP-10/SHOP-11/SHOP-13: compra recusada não muda carteira nem nível.
- Idempotency / duplicate handling: coberta por SHOP-11 (carta comprada uma vez) e SHOP-06 (ofertas distintas).
- Auth boundaries & rate limits: N/A because é um jogo local sem contas.
- Concurrency / ordering: coberta por SHOP-08 (ordem fixa do sorteio) e SHOP-09 (streams independentes).
- Data lifecycle / expiry: coberta por MOD-10 (níveis zeram no fim da run) e SHOP-17 (custo do reroll volta a 5).
- Observability: coberta por SHOP-22 (campo `shop` e `modifiers` no snapshot) e pelos `events`.
- External-dependency failure: N/A because nenhum recurso externo é usado.

---

## Snapshot de debug (contrato usado pelos ACs)

Campos novos em `GameSnapshot` (`src/game/debugApi.ts`):

```ts
shop: {
  open: boolean;
  offers: { id: string; level: number; maxLevel: number; cost: number; sold: boolean; affordable: boolean }[];
  rerollCost: number;
  selected: number;          // índice 0..2 (P2)
} ;
modifiers: Record<'vida' | 'forca' | 'agilidade' | 'ima' | 'sorte', number>;   // nível atual de cada um
// `player` ganha:
maxHp: number;
// `run.state` passa a aceitar 'shop'.
```

---

## User Stories

### P1: Modificadores de atributo com teto ⭐ MVP

**User Story**: Como jogador, quero que cada upgrade comprado mude um número real do meu personagem, com um teto claro, para sentir o poder crescer sem quebrar o jogo.

**Why P1**: É o que a loja vende; sem modificadores não há o que comprar.

**Acceptance Criteria**:

1. MOD-01: WHEN a run starts THEN every modifier level SHALL be 0.
2. MOD-02: IF a modifier is at its max level THEN applying one more level SHALL leave its level unchanged and return `false`.
3. MOD-03: For every modifier, the level SHALL stay in the range 0..maxLevel, with maxLevel 5 for `vida` and `forca` and 3 for `agilidade`, `ima` and `sorte`.
4. MOD-04: WHILE `vida` is at level `n`, the player max HP SHALL be `100 + 15n`.
5. MOD-11: WHEN a `vida` level is bought THEN the player HP SHALL increase by 15, capped at the new max HP.
6. MOD-05: WHILE `forca` is at level `n`, each melee hit damage of the player (combo steps and held-prop hits) SHALL be `round(base × (1 + 0.10n))`, where `round` rounds halves up.
7. MOD-06: WHILE `agilidade` is at level `n`, the player run speed SHALL be `220 × (1 + 0.08n)` px/s.
8. MOD-07: WHILE `ima` is at level `n`, the pickup magnet range SHALL be `72 × (1 + 0.30n)` px.
9. MOD-08: WHILE `sorte` is at level `n`, the heal drop chance of a regular enemy SHALL be `0.10 + 0.03n`.
10. MOD-12: WHERE the debug mode is on and the URL has `heal=1` THEN the heal drop chance SHALL be 1 regardless of the `sorte` level.
11. MOD-09: WHEN a modifier at level `n` is offered THEN its cost SHALL be `base + step × n`, with (base, step) = (12, 6) for `vida`, (15, 8) for `forca`, (10, 6) for `agilidade`, (6, 4) for `ima` and (10, 6) for `sorte`.
12. MOD-10: WHEN a new run starts after a game over THEN the player max HP SHALL be 100.

**Independent Test**: `modifiers.test.ts` em Node: níveis 0..max e max+1 (L-010), fórmulas de vida/força/agilidade/ímã/sorte nos níveis 0, 1 e máximo, arredondamento de meio para cima, custo por nível e reset; smoke `shop.smoke.mjs` compra `vida` e confere `player.maxHp`.

---

### P1: Loja entre rodadas com 3 ofertas ⭐ MVP

**User Story**: Como jogador, quero que entre as rodadas abra uma loja com 3 cartas para eu escolher em que gastar meus fragmentos, para cada run seguir um caminho diferente.

**Why P1**: Fecha o ciclo da economia da F3 e é a base da F5 (técnicas vendidas aqui).

**Direção de arte e feel**:
1. **Abertura** — o painel desce do topo em 200 ms sobre a arena escurecida; os fragmentos que ainda estavam no chão voam até o contador.
2. **Cartas** — 3 cartas lado a lado com nome, nível "Nv 2/5", prévia "Vida 115 → 130" e custo; borda na cor da raridade (comum `g`, raro `U`).
3. **Sem saldo** — o custo fica na cor de perigo e a carta um pouco apagada.
4. **Compra** — a carta pisca branco, um "−N" sobe do custo, o contador da carteira pula e a carta vira "Comprado".
5. **Dica** — uma linha fixa embaixo: "1-3 comprar · R rerolar (N) · Enter continuar".

**Acceptance Criteria** ("rodada atual" = a rodada que acabou de ser limpa):

1. SHOP-01: WHEN the run state is `intermission` and its timer reaches 2500 ms THEN the run state SHALL become `shop`.
2. SHOP-32: WHEN the run state becomes `shop` THEN `events` SHALL get exactly one `shopOpen:<r>`, where `r` is the round just cleared.
3. SHOP-02: WHILE the run state is `shop`, the run SHALL emit no `spawn` command.
4. SHOP-33: WHILE the run state is `shop`, the scene SHALL skip the gameplay update, so the player, enemy and pickup positions and the pickup ages SHALL stay the same between frames.
5. SHOP-03: WHEN `Enter` is pressed while the run state is `shop` THEN the run state SHALL become `roundActive` with the round equal to the cleared round + 1.
6. SHOP-35: WHEN the shop closes THEN `events` SHALL get exactly one `shopClose`.
7. SHOP-04: WHILE the run state is `shop`, the player SHALL receive neutral input (no movement, jump or attack).
8. SHOP-05: WHEN the shop opens THEN the wallet count SHALL increase by exactly the sum of the values of the fragment pickups alive in the frame before it opened.
9. SHOP-36: WHEN the shop opens THEN no fragment pickup SHALL remain in the scene.
10. SHOP-37: WHEN the shop opens THEN every heal pickup SHALL remain in the scene at the same position.
11. SHOP-06: WHEN the shop opens with `e` eligible entries THEN it SHALL hold exactly `min(3, e)` offers with pairwise distinct ids.
12. SHOP-38: WHILE the shop holds fewer than 3 offers, each empty slot SHALL show the text `Esgotado`.
13. SHOP-07: The offer pool SHALL include a modifier if and only if its level is below its maxLevel and the min round of its next level (SHOP-18) is ≤ the current round.
14. SHOP-39: The offer pool SHALL always include the `cura` consumable.
15. SHOP-18: For modifier `m` going to level `k`, the min round SHALL be 6 when `m` is `vida` or `forca` and `k` is 4 or 5, 4 when `m` is `agilidade` and `k` is 3, and 1 in every other case.
16. SHOP-08: WHEN offers are drawn THEN slots 0, 1 and 2 SHALL be filled in order, each by taking `x = rng.next() × W` from the shop RNG, where `W` is the total weight of the eligible entries not yet drawn (common 3, rare 1), and picking the first of them in catalog order whose cumulative weight exceeds `x`.
17. SHOP-09: WHEN a run starts with seed `s` THEN the shop RNG SHALL be created as `new Rng(s ^ 0x85ebca6b)`.
18. SHOP-40: For the same run seed, the wave spawn orders and the loot draws SHALL be identical whether or not shop draws happen.
19. SHOP-45: WHEN key `k` (1, 2 or 3) is pressed while the run state is `shop` and slot `k − 1` holds an unsold offer whose cost ≤ the wallet count, and that offer is not `cura` with the player HP equal to max HP, THEN that offer SHALL be bought.
20. SHOP-19: WHEN an offer is bought THEN the wallet count SHALL decrease by exactly the offer cost.
21. SHOP-41: WHEN a modifier offer is bought THEN that modifier level SHALL increase by exactly 1.
22. SHOP-42: WHEN an offer is bought THEN its `sold` flag SHALL become `true` and its card SHALL show the text `Comprado`.
23. SHOP-43: WHEN an offer is bought THEN `events` SHALL get exactly one `buy:<id>:<cost>`.
24. SHOP-10: IF key `k` is pressed in the shop while slot `k − 1` holds an unsold offer whose cost is greater than the wallet count THEN the wallet and every modifier level SHALL stay unchanged and `events` SHALL get `buyRefused:<id>:funds`.
25. SHOP-11: IF key `k` is pressed in the shop while slot `k − 1` holds a sold offer THEN the wallet and every modifier level SHALL stay unchanged.
26. SHOP-13: IF key `k` is pressed in the shop while slot `k − 1` holds the unsold `cura` offer and the player HP equals max HP THEN the wallet SHALL stay unchanged and `events` SHALL get `buyRefused:cura:fullHp`.
27. SHOP-12: WHEN the `cura` offer is bought THEN the player HP SHALL become `min(hp + 30, maxHp)`.
28. SHOP-14: IF key `k` is pressed in the shop while slot `k − 1` is empty THEN the wallet, every modifier level and `events` SHALL stay unchanged.
29. SHOP-15: WHEN an offer is bought THEN every other offer of that shop SHALL keep the same id, slot and cost it had before.
30. SHOP-44: The `affordable` flag of each unsold offer SHALL equal `cost ≤ wallet count` in every frame.
31. SHOP-20: WHILE the run state is not `shop`, the keys `1`, `2`, `3` and `Enter` SHALL not attempt any purchase.
32. SHOP-21: Each unsold card SHALL show, top to bottom, the name, the level text `Nv <n+1>/<max>` (blank for `cura`), the preview text defined in Assumptions and the cost.
33. SHOP-22: WHERE the debug mode is on, the snapshot SHALL include the `shop`, `modifiers` and `player.maxHp` fields of the contract above, with `shop.open` true if and only if the run state is `shop`.
34. SHOP-23: WHERE the debug mode is on and the URL has `fragments=N` with integer N ≥ 0 THEN the wallet SHALL be N when the run starts.
35. SHOP-24: Every color key used by the shop panel (background, card borders and texts) SHALL be a key of `PALETTE`.

**Independent Test**: `shop.test.ts` em Node (elegibilidade nos limites de nível e rodada 5/6 e 3/4, pesos, sem repetição, menos de 3 elegíveis, determinismo por seed, compra com saldo exato e saldo − 1, carta vendida, cura com vida cheia e vida cheia − 1, recálculo após compra); `run.test.ts` (intermissão 2499/2500 ms → `shop`, nada avança em `shop`, `Enter` → `roundActive` com rodada + 1, streams independentes); smoke `shop.smoke.mjs` com `?debug&seed=1&fragments=200` limpa a rodada 1, compra, confere carteira, nível, `player.maxHp` e continua.

---

### P2: Reroll das ofertas

**User Story**: Como jogador, quero pagar para sortear ofertas novas quando nenhuma me serve, para buscar a build que eu quero.

**Why P2**: Agência extra; a loja funciona sem ele.

**Direção de feel**: as 3 cartas viram de costas e voltam com as ofertas novas em 150 ms, um "−N" sobe da dica e o novo custo aparece na dica.

**Acceptance Criteria**:

1. SHOP-16: WHEN `R` is pressed in the shop and the reroll cost ≤ the wallet count THEN the wallet SHALL decrease by the reroll cost and 3 new offers SHALL be drawn by SHOP-08 rules.
2. SHOP-25: WHEN a reroll happens THEN the reroll cost of that shop SHALL increase by 5.
3. SHOP-17: WHEN a shop opens THEN its reroll cost SHALL be 5.
4. SHOP-26: IF `R` is pressed with the reroll cost greater than the wallet count THEN nothing SHALL change and `events` SHALL get `rerollRefused`.
5. SHOP-46: WHEN a reroll happens THEN the hint line SHALL show `R rerolar (<c>)`, where `c` is the new reroll cost.

**Independent Test**: `shop.test.ts` (custo 5 → 10 → 15, saldo exato e saldo − 1, volta a 5 na loja seguinte); smoke com `fragments=200` rerola e confere `rerollCost`.

---

### P2: Navegação por teclado

**User Story**: Como jogador, quero mover a seleção entre as cartas e comprar com a tecla de ataque, para usar a loja sem tirar a mão dos controles.

**Why P2**: Conforto; os números 1–3 já bastam para jogar.

**Acceptance Criteria**:

1. SHOP-27: WHEN the shop opens THEN the selected slot SHALL be 0.
2. SHOP-28: WHEN `→` or `D` is pressed in the shop THEN the selected slot SHALL become `(selected + 1) mod 3`.
3. SHOP-29: WHEN `←` or `A` is pressed in the shop THEN the selected slot SHALL become `(selected + 2) mod 3`.
4. SHOP-30: WHEN `J` is pressed in the shop THEN a purchase SHALL be attempted for the selected slot, exactly as SHOP-45 does for key `<selected + 1>`.
5. SHOP-31: WHILE a slot is selected, its card SHALL be drawn with a highlighted border and all other cards SHALL not.

**Independent Test**: `shop.test.ts` (seleção cíclica nos dois sentidos); smoke aperta `D`, `D`, `J` e confere a compra da carta 3.

---

## Edge Cases

- WHEN the boss round is cleared THEN the shop SHALL open after the intermission like any other round.
- WHEN the player bought `vida` and later buys `cura` THEN the cura cap SHALL be the new max HP.
- IF the wallet is 0 when the shop opens THEN every card SHALL show as not affordable and `Enter` SHALL still continue.
- WHEN the player is killed with the debug key `3` during the intermission THEN the game over SHALL happen before the shop opens and the shop SHALL not open.
- WHEN a rare offer is sold THEN a reroll MAY bring it back only if it is still eligible.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| MOD-01 | P1: Modificadores | Specify | Pending |
| MOD-02 | P1: Modificadores | Specify | Pending |
| MOD-03 | P1: Modificadores | Specify | Pending |
| MOD-04 | P1: Modificadores | Specify | Pending |
| MOD-11 | P1: Modificadores | Specify | Pending |
| MOD-05 | P1: Modificadores | Specify | Pending |
| MOD-06 | P1: Modificadores | Specify | Pending |
| MOD-07 | P1: Modificadores | Specify | Pending |
| MOD-08 | P1: Modificadores | Specify | Pending |
| MOD-12 | P1: Modificadores | Specify | Pending |
| MOD-09 | P1: Modificadores | Specify | Pending |
| MOD-10 | P1: Modificadores | Specify | Pending |
| SHOP-01 | P1: Loja | Specify | Pending |
| SHOP-32 | P1: Loja | Specify | Pending |
| SHOP-02 | P1: Loja | Specify | Pending |
| SHOP-33 | P1: Loja | Specify | Pending |
| SHOP-03 | P1: Loja | Specify | Pending |
| SHOP-35 | P1: Loja | Specify | Pending |
| SHOP-04 | P1: Loja | Specify | Pending |
| SHOP-05 | P1: Loja | Specify | Pending |
| SHOP-36 | P1: Loja | Specify | Pending |
| SHOP-37 | P1: Loja | Specify | Pending |
| SHOP-06 | P1: Loja | Specify | Pending |
| SHOP-38 | P1: Loja | Specify | Pending |
| SHOP-07 | P1: Loja | Specify | Pending |
| SHOP-39 | P1: Loja | Specify | Pending |
| SHOP-18 | P1: Loja | Specify | Pending |
| SHOP-08 | P1: Loja | Specify | Pending |
| SHOP-09 | P1: Loja | Specify | Pending |
| SHOP-40 | P1: Loja | Specify | Pending |
| SHOP-45 | P1: Loja | Specify | Pending |
| SHOP-19 | P1: Loja | Specify | Pending |
| SHOP-41 | P1: Loja | Specify | Pending |
| SHOP-42 | P1: Loja | Specify | Pending |
| SHOP-43 | P1: Loja | Specify | Pending |
| SHOP-10 | P1: Loja | Specify | Pending |
| SHOP-11 | P1: Loja | Specify | Pending |
| SHOP-13 | P1: Loja | Specify | Pending |
| SHOP-12 | P1: Loja | Specify | Pending |
| SHOP-14 | P1: Loja | Specify | Pending |
| SHOP-15 | P1: Loja | Specify | Pending |
| SHOP-44 | P1: Loja | Specify | Pending |
| SHOP-20 | P1: Loja | Specify | Pending |
| SHOP-21 | P1: Loja | Specify | Pending |
| SHOP-22 | P1: Loja | Specify | Pending |
| SHOP-23 | P1: Loja | Specify | Pending |
| SHOP-24 | P1: Loja | Specify | Pending |
| SHOP-16 | P2: Reroll | Specify | Pending |
| SHOP-25 | P2: Reroll | Specify | Pending |
| SHOP-17 | P2: Reroll | Specify | Pending |
| SHOP-26 | P2: Reroll | Specify | Pending |
| SHOP-46 | P2: Reroll | Specify | Pending |
| SHOP-27 | P2: Navegação | Specify | Pending |
| SHOP-28 | P2: Navegação | Specify | Pending |
| SHOP-29 | P2: Navegação | Specify | Pending |
| SHOP-30 | P2: Navegação | Specify | Pending |
| SHOP-31 | P2: Navegação | Specify | Pending |

**Coverage:** 57 total, 0 Verified

---

## Success Criteria

- [ ] Numa run com `?debug&seed=1&fragments=200`, limpar a rodada 1 abre a loja; comprar `vida` sobe `player.maxHp` para 115 e a carteira cai 12; `Enter` começa a rodada 2.
- [ ] Duas runs com a mesma seed mostram as mesmas ofertas na mesma ordem, e as ondas e drops da F1/F3 não mudam.
- [ ] Nenhum modificador passa do nível máximo e níveis 4–5 de vida/força não aparecem antes da rodada 6.
- [ ] `npm test`, `npm run typecheck`, `npm run build` e `npm run smoke` passam.
