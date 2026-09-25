# Economia, drops e cura — Specification

## Problem Statement

Hoje abater um inimigo só tira ele da tela. Não sobra nada para pegar, a vida só volta ao vencer um chefe, e os únicos objetos que o jogador pode usar são a cadeira e a garrafa do mapa, que quebram e não voltam. Falta a recompensa imediata que faz cada abate valer a pena, e falta o combustível da loja da F4.

Esta feature faz os inimigos derramarem **fragmentos amaldiçoados** (a moeda da run, AD-004) que o jogador coleta, dá uma chance de cair uma **gota de cura**, e coloca na run **inimigos armados com ferramentas amaldiçoadas**. Eles são mais perigosos, mas deixam a ferramenta cair ao morrer, e o jogador pode pegá-la e usá-la com o sistema de objetos que já existe.

## Goals

- [ ] Todo inimigo abatido derrama fragmentos que voam, caem e são puxados até o jogador quando ele chega perto; coletar dá um feedback claro (número subindo, "+N" no ar).
- [ ] Cerca de 1 em cada 10 abates solta uma gota de cura de 8 HP, que só é coletada quando falta vida.
- [ ] A partir da rodada 3 aparecem inimigos armados, que avisam o golpe de forma visível e deixam a ferramenta cair ao morrer; o jogador pega e usa a ferramenta como qualquer objeto.
- [ ] Toda regra de sorteio, valor, tempo de vida e ímã vive em `src/core`/`src/data`, usa o RNG com seed da run (AD-006) e é testada em Node (AD-001).
- [ ] Nada acumula sem limite na cena: fragmentos, gotas e ferramentas largadas têm tempo de vida e teto.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Gastar fragmentos (loja) | F4; esta feature só expõe `spend` para a loja chamar |
| Selos (moeda persistente) | F6 |
| Inimigo pegar ferramenta do chão | Muda a IA inteira; os inimigos já nascem armados |
| Reaparecer a cadeira e a garrafa do mapa numa run nova | Comportamento atual mantido; os objetos do mapa não são drops |
| Som dos drops e da coleta | Sem assets (mesma decisão da F2) |
| Modificadores de chance e valor de drop | F4 (`src/core/modifiers.ts`); aqui os números são tuning fixo |

---

## Assumptions & Open Questions

Todas as decisões abaixo foram tomadas pelo agente por delegação do usuário ("vai tomando as decisões… o jogo tem que ser divertido"). Números ficam em `src/data/tuning.ts` (`ECONOMY`, `HEAL_DROP`, `ARMED`) e `src/data/props.ts`.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Fragmentos são objetos no chão, não crédito direto | O abate derrama pickups; o jogador precisa passar perto | Dá o prazer de "recolher o saque" e um risco pequeno de se expor | y |
| Quantidade por inimigo comum | `rng.int(2, 4)` pickups; +2 se ele estava armado | Variação pequena; o armado paga o risco extra | y |
| Valor de cada pickup | `1 + floor((round − 1) / 5)` | A renda cresce com a run sem inflar a tela de pickups | y |
| Chefe | 15 pickups, mesmo valor por pickup | É a "recompensa em moeda" que a F2 deixou para cá | y |
| Ímã | A partir de 300 ms de vida e com o jogador a ≤ 72 px, o pickup voa até ele (120 px/s, +1200 px/s², teto 600 px/s), atravessando o terreno | O jogador vê o estouro e depois recolhe sem ficar caçando pixel | y |
| Tempo de vida | Fragmento 15 s, gota 10 s; pisca nos últimos 3 s | Premia recolher logo, sem sujar a tela | y |
| Teto de fragmentos vivos | 60; o que não couber vai somado no último pickup do drop | Protege o desempenho sem perder valor | y |
| Cura | 10% por abate de inimigo comum; 8 HP; só coleta se faltar vida | Pedido do esboço; não coletar com vida cheia deixa a gota "guardada" para depois | y |
| Sorteios | Stream próprio de loot: `new Rng(seed ^ 0x9e3779b9)` criado no início da run | Drops não mudam as ondas já testadas da F1 e continuam reproduzíveis por seed (AD-006) | y |
| Ordem dos sorteios por abate | Primeiro a cura, depois a quantidade de fragmentos | Ordem fixa = runs reproduzíveis | y |
| Chance de inimigo armado | 0 nas rodadas 1–2; `min(0.15 + 0.05·(r − 3), 0.5)` a partir da 3 | Introduz a ameaça depois de o jogador aprender o básico; nunca passa da metade | y |
| Ferramentas | Faca Amaldiçoada (rápida, leve) e Porrete Amaldiçoado (lento, forte), sorteio uniforme | Dois estilos claros de ameaça e de arma | y |
| Faca na mão do inimigo | Dano ×1,25, alcance +8 px, mesmo preparo | Mais perigoso sem ficar injusto | y |
| Porrete na mão do inimigo | Dano ×1,6, golpe forte, preparo +150 ms, alcance +12 px | Golpe pesado com aviso mais longo | y |
| Ferramenta ao morrer | Cai sempre, em repouso, pronta para pegar | Pedido do esboço; recompensa garantida por vencer o armado | y |
| Ferramenta largada | Some 20 s depois de parar em repouso sem ser pega; no máximo 6 no mundo (a mais antiga some) | Sem acúmulo; recomeça a contar a cada vez que volta ao repouso | y |
| Números das ferramentas | Faca: dano 16, durabilidade 6, arremesso 820 px/s, empurrão 6, massa 1, na frente. Porrete: dano 26, durabilidade 5, arremesso 480 px/s, empurrão 12, massa 6, nas costas | Melhores que a cadeira e a garrafa, que são objetos comuns | y |
| Raridade (P3) | 15% das ferramentas nascem "raras": dano ×1,5 (arredondado), durabilidade +2, brilho âmbar | Um pico de sorte ocasional; o inimigo com ferramenta rara bate igual (só brilha) | y |
| Chaves de debug | `?debug&armed=knife\|club` arma todo inimigo comum; `?debug&heal=1` fixa a chance de cura em 1; `?debug&rare=1` torna toda ferramenta rara | Smoke determinístico sem depender da sorte | y |

**Open questions:** none - all resolved or logged above.

**Refinamento Jev (AD-007):** três rodadas em 25/09 (`refinement.md`): de 57 ACs com 35 sinalizados para 78 ACs com 29 sinalizados e nenhum flag de precisão ou testabilidade; o que sobrou está aceito com justificativa na revisão do autor.

**Implicit-requirement dimensions sweep:**
- State-transition integrity: coberta por ECO-06..ECO-10 (pickup: estouro → repouso → ímã → coletado ou expirado) e ARM-08/ARM-13 (ferramenta: na mão do inimigo → largada → segurada → repouso → some).
- Input validation & bounds: coberta por ECO-12 (carteira nunca negativa), ECO-13 (`spend` recusa sem saldo), ECO-15 (teto de 60 pickups) e ARM-14 (teto de 6 ferramentas).
- Failure / partial-failure states: coberta por HEAL-04 (gota não coletada com vida cheia) e ECO-11 (player morto não coleta).
- Idempotency / duplicate handling: coberta por ECO-01 (um drop por abate), ECO-08 (pickup coletado uma vez) e ARM-08 (a ferramenta cai uma vez).
- Auth boundaries & rate limits: N/A because é um jogo local sem contas.
- Concurrency / ordering: coberta por ECO-17 (ordem fixa dos sorteios) e pelos edge cases do hitstop e da nova run.
- Data lifecycle / expiry: coberta por ECO-09, HEAL-05 e ARM-13 (tempos de vida) e pela limpeza na nova run.
- Observability: coberta por ECO-19 e ARM-16 (campos novos no snapshot) e pelos `events`.
- External-dependency failure: N/A because nenhum recurso externo é usado.

---

## Snapshot de debug (contrato usado pelos ACs)

Campos novos em `GameSnapshot` (`src/game/debugApi.ts`):

```ts
wallet: { fragments: number };
pickups: { id: number; kind: 'fragment' | 'heal'; value: number; x: number; y: number; ageMs: number; magnet: boolean }[];
worldProps: { id: number; key: string; state: PropState; x: number; y: number; durabilityLeft: number; rare: boolean }[];
// cada item de `enemies` ganha:
weapon: 'cursedKnife' | 'cursedClub' | null;
// `hud` ganha:
fragments: string;            // texto do contador
heldItem: { name: string; pips: number; maxPips: number } | null;
// novo, na raiz:
floatTexts: { text: string; color: string; x: number; y: number }[];
```

---

## User Stories

### P1: Fragmentos amaldiçoados ⭐ MVP

**User Story**: Como jogador, quero que cada inimigo derrotado derrame fragmentos que eu recolho, para sentir que cada abate me deixa mais rico e juntar moeda para a loja.

**Why P1**: É a moeda da run (AD-004); sem ela a F4 não existe.

**Direção de arte e feel**:
1. **Estouro** — ao morrer, o inimigo solta os fragmentos num leque para cima; eles caem, quicam uma vez e param no chão.
2. **Brilho** — cada fragmento é um cristal roxo (`v`/`u`/`U`) de 5×7 texels que cintila em 2 frames.
3. **Ímã** — quando o jogador chega perto, os fragmentos disparam até ele em curva acelerada.
4. **Coleta** — o contador do HUD pula (escala 1,3 → 1 em 150 ms) e um "+N" roxo sobe 16 px do ponto de coleta e some em 400 ms.
5. **Aviso de sumiço** — nos últimos 3 s de vida, o fragmento pisca.

**Acceptance Criteria**:

1. ECO-01: WHEN a regular enemy dies THEN exactly one fragment drop SHALL happen at its death position.
2. ECO-02: WHEN a regular enemy that was not armed dies THEN the drop SHALL have `rng.int(2, 4)` fragment pickups, drawn from the loot RNG.
3. ECO-03: WHEN a regular enemy that was armed dies THEN the drop SHALL have `rng.int(2, 4) + 2` fragment pickups.
4. ECO-04: WHEN a drop happens in round `r` THEN each fragment pickup SHALL have value `1 + floor((r − 1) / 5)`.
5. ECO-05: WHEN the boss dies THEN a drop of 15 fragment pickups SHALL happen at its death position.
6. ECO-06: WHEN a fragment pickup spawns THEN its initial velocity SHALL have x in [−120, 120] px/s and y in [−260, −180] px/s, drawn from the loot RNG.
7. ECO-07: WHILE a pickup is not in magnet mode, it SHALL fall with gravity 900 px/s² and stop on the top surface of the first solid below it.
8. ECO-24: WHILE a pickup is not in magnet mode, its body SHALL never end a frame overlapping a solid.
9. ECO-08: WHEN a pickup overlaps the living player's body THEN it SHALL be collected and removed in that frame, and its value SHALL be credited exactly once.
10. ECO-09: WHEN a fragment pickup reaches 15000 ms of age without being collected THEN it SHALL be removed and `events` SHALL get `pickupExpired`.
11. ECO-10: WHEN a pickup has age ≥ 300 ms and its center is within 72 px of the living player's center THEN it SHALL enter magnet mode and stay in it until collected.
12. ECO-18: WHILE a pickup is in magnet mode, it SHALL move straight toward the player center, ignoring terrain, with speed starting at 120 px/s, increasing by 1200 px/s² and capped at 600 px/s.
13. ECO-11: WHILE the player is dead, no pickup SHALL be collected.
14. ECO-25: WHILE the player is dead, no pickup SHALL enter magnet mode.
15. ECO-12: The wallet fragment count SHALL never be negative.
16. ECO-13: IF `spend(n)` is called with `n` greater than the wallet count THEN the wallet count SHALL stay unchanged.
17. ECO-26: IF `spend(n)` is called with `n` greater than the wallet count THEN `spend` SHALL return `false`.
18. ECO-20: WHEN `spend(n)` is called with 0 < `n` ≤ the wallet count THEN the count SHALL decrease by `n` and `spend` SHALL return `true`.
19. ECO-14: WHEN a run starts THEN the wallet count SHALL be 0.
20. ECO-27: WHEN a run starts THEN every pickup SHALL be removed from the scene.
21. ECO-15: IF a drop of `n` fragment pickups happens while `live` fragment pickups exist and `live + n > 60` THEN only `max(1, 60 − live)` pickups SHALL spawn.
22. ECO-28: WHEN a drop spawns fewer pickups than drawn (ECO-15) THEN its last spawned pickup SHALL carry its own value plus the value of every pickup not spawned.
23. ECO-16: WHEN a fragment pickup is collected THEN the HUD counter text SHALL equal the new wallet count in that frame.
24. ECO-29: WHEN a fragment pickup is collected THEN `events` SHALL get exactly one `collect:fragment:<value>`.
25. ECO-30: WHEN a fragment pickup is collected THEN the snapshot `floatTexts` SHALL contain `{ text: '+<value>', color: 'U' }` starting at the pickup position for 400 ms (rounded up to whole frames).
26. ECO-21: WHILE a pickup has less than 3000 ms of life left, it SHALL alternate between visible and invisible every 150 ms.
27. ECO-17: WHEN a run starts with seed `s` THEN the loot RNG SHALL be created as `new Rng(s ^ 0x9e3779b9)`.
28. ECO-31: For the same run seed, the wave spawn orders of every round SHALL be identical whether or not loot draws happen.
29. ECO-22: WHEN the game over screen shows THEN it SHALL include the line `Fragmentos: <count>` with the wallet count at the moment of death.
30. ECO-19: WHERE the debug mode is on, the snapshot SHALL include `wallet.fragments` equal to the wallet count and one `pickups` entry per live pickup with `id`, `kind`, `value`, `x`, `y`, `ageMs` and `magnet`.
31. ECO-23: The fragment and heal pickup grids and the fragment counter icon SHALL use only `PALETTE` keys (data test).

**Independent Test**: `loot.test.ts` (quantidades 2–4 e +2, valor nas rodadas 1, 5, 6, 10, 11, chefe 15, teto 60 com o valor somado, determinismo por seed, ondas iguais com e sem loot); `pickup.test.ts` (ímã aos 299/300 ms e a 72/73 px, velocidade e teto, 14999/15000 ms, pisca, player morto); `wallet.test.ts`; smoke `drops.smoke.mjs` mata um inimigo com `?debug&seed=1`, anda até os fragmentos e confere carteira, eventos e HUD.

---

### P1: Gota de cura ⭐ MVP

**User Story**: Como jogador, quero que às vezes um inimigo solte uma gota de cura, para ter um respiro no meio da onda e um motivo para arriscar ir buscá-la.

**Why P1**: Entre chefes, a vida hoje só cai; sem cura, as runs longas ficam injustas.

**Direção de arte e feel**: gota verde (`g`/`G`) com brilho `w`, 6×8 texels, pulsando devagar. Ao coletar, o player pisca em `G` por 80 ms e um "+8" verde sobe do ponto. Com vida cheia a gota fica no chão e não é puxada (ela espera por você).

**Acceptance Criteria**:

1. HEAL-01: WHEN a regular enemy dies THEN a heal pickup SHALL drop with probability 0.10, drawn from the loot RNG before the fragment count.
2. HEAL-02: WHEN the boss dies THEN no heal pickup SHALL drop.
3. HEAL-03: WHEN a heal pickup is collected THEN the player SHALL heal `min(8, maxHp − hp)` hp.
4. HEAL-08: WHEN a heal pickup is collected THEN `events` SHALL get exactly one `collect:heal:<hp restored>`.
5. HEAL-04: WHILE the player hp equals maxHp, a heal pickup overlapping the player SHALL NOT be collected.
6. HEAL-09: WHILE the player hp equals maxHp, a heal pickup SHALL NOT enter magnet mode.
7. HEAL-05: WHEN a heal pickup reaches 10000 ms of age without being collected THEN it SHALL be removed.
8. HEAL-06: WHERE the debug mode is on and the URL has `heal=1` THEN the heal drop probability SHALL be 1.
9. HEAL-07: WHEN a heal pickup is collected THEN the snapshot `floatTexts` SHALL contain `{ text: '+<hp restored>', color: 'G' }` starting at the pickup position for 400 ms (rounded up to whole frames).
10. HEAL-10: WHEN a heal pickup is collected THEN the player sprite SHALL be tint-filled with `G` for 80 ms (rounded up to whole frames).

**Independent Test**: `loot.test.ts` (chance 0,10 com seed fixa, ordem dos sorteios, chefe sem gota); `pickup.test.ts` (sem coleta e sem ímã com vida cheia, 9999/10000 ms); smoke com `?debug&heal=1` e a tecla 4 (dano de teste) confere a cura de 8 e o teto.

---

### P1: Inimigos armados ⭐ MVP

**User Story**: Como jogador, quero enfrentar inimigos com ferramentas amaldiçoadas que batem mais forte, mas avisam o golpe, para as ondas ganharem variedade e perigo.

**Why P1**: É a nova ameaça da run e a fonte das ferramentas.

**Direção de arte e feel**: a ferramenta aparece na mão do inimigo com uma aura roxa tremulando (2 frames). No preparo, ele ergue a ferramenta e ela brilha (`U`); o porrete fica erguido mais tempo. Em ragdoll a ferramenta some junto com o sprite e volta quando ele levanta.

**Acceptance Criteria**:

1. ARM-01: WHEN a regular enemy spawns in round `r` ≤ 2 THEN it SHALL NOT be armed.
2. ARM-02: WHEN a regular enemy spawns in round `r` ≥ 3 THEN one loot RNG draw `chance(p)` with `p = min(0.15 + 0.05 × (r − 3), 0.5)` SHALL decide whether it is armed.
3. ARM-03: WHEN a regular enemy is armed THEN its tool SHALL be `cursedKnife` or `cursedClub` with equal probability, drawn from the loot RNG.
4. ARM-04: The boss SHALL never be armed.
5. ARM-05: WHILE an enemy holds a `cursedKnife`, its attack damage SHALL be `round(1.25 × base)`, where `base` is its round-scaled attack damage.
6. ARM-20: WHILE an enemy holds a `cursedKnife`, its attack hitbox SHALL be 8 px wider, extended on its facing side.
7. ARM-21: WHILE an enemy holds a `cursedKnife`, its windup SHALL equal the base windup.
8. ARM-06: WHILE an enemy holds a `cursedClub`, its attack damage SHALL be `round(1.6 × base)`, where `base` is its round-scaled attack damage.
9. ARM-22: WHILE an enemy holds a `cursedClub`, its attack strength SHALL be `heavy`.
10. ARM-23: WHILE an enemy holds a `cursedClub`, its attack hitbox SHALL be 12 px wider, extended on its facing side.
11. ARM-07: WHILE an enemy holds a `cursedClub`, its windup SHALL be the base windup plus 150 ms.
12. ARM-08: WHEN an armed enemy dies THEN its tool SHALL drop exactly once, as a prop in `rest` at its death position.
13. ARM-09: WHILE an armed enemy is in windup, its tool SHALL show the raised windup frame with the `U` glow.
14. ARM-10: WHILE an armed enemy is in ragdoll, its tool sprite SHALL be hidden, and WHEN it gets up THEN the tool sprite SHALL be visible again.
15. ARM-15: WHERE the debug mode is on and the URL has `armed=knife` or `armed=club` THEN every regular enemy SHALL spawn armed with that tool.

**Independent Test**: `loot.test.ts` (chance por rodada 2/3/4/10/20, teto 0,5, sorteio da ferramenta, chefe nunca); `armedEnemy.test.ts` (dano, força, alcance e preparo de cada ferramenta com o tuning da rodada); smoke com `?debug&armed=club&round=3` confere `weapon`, o preparo mais longo e a ferramenta no chão depois da morte.

---

### P1: Usar a ferramenta amaldiçoada ⭐ MVP

**User Story**: Como jogador, quero pegar a ferramenta que o inimigo largou e usá-la para bater e arremessar, para virar a arma dele contra os outros.

**Why P1**: É a metade divertida do inimigo armado; sem ela a ferramenta seria só um enfeite.

**Acceptance Criteria**:

1. ARM-11: The prop def `cursedKnife` SHALL have damage 16, durability 6, throwSpeed 820, knockback 6, mass 1 and socket `front`, and SHALL pass `validatePropDef`.
2. ARM-24: The prop def `cursedClub` SHALL have damage 26, durability 5, throwSpeed 480, knockback 12, mass 6 and socket `back`, and SHALL pass `validatePropDef`.
3. ARM-12: WHEN the player presses interact with empty hands and a dropped tool in `rest` is the nearest prop in the `findPickup` zone THEN the player SHALL hold that tool.
4. ARM-17: WHEN a swing with a held tool hits a target THEN the hit SHALL have damage equal to the tool def damage, strength `heavy` and force equal to the tool def knockback.
5. ARM-26: WHEN the player presses interact while holding a tool THEN the tool SHALL enter `thrown` with horizontal speed equal to its def `throwSpeed` px/s toward the player's facing.
6. ARM-27: WHEN the impact count of a tool reaches its def durability THEN the tool SHALL enter `breaking` and be removed 400 ms later (`PROP_BREAK_MS`).
7. ARM-13: WHEN a dropped tool has stayed in `rest` for 20000 ms without being picked up THEN it SHALL be removed with a curse smoke burst.
8. ARM-28: WHEN a dropped tool returns to `rest` after being held or thrown THEN its rest timer SHALL restart from 0.
9. ARM-14: IF a tool drop happens while 6 dropped tools exist and at least one of them is in `rest` THEN the one in `rest` that dropped first SHALL be removed in that frame, before the new tool spawns.
10. ARM-18: WHEN a run starts THEN every dropped tool SHALL be removed.
11. ARM-16: WHERE the debug mode is on, the snapshot SHALL include `worldProps` and the `weapon` field of each enemy.
12. ARM-19: The tool sprites, windup frames and shards SHALL use only `PALETTE` keys (data test).

**Independent Test**: teste de dados dos `PropDef`; `droppedTools.test.ts` (20 s com reinício, teto de 6); smoke pega a faca depois da morte do armado, acerta um inimigo com ela e confere o dano e o desgaste.

---

### P2: Item na mão no HUD

**User Story**: Como jogador, quero ver o nome e o desgaste do objeto que estou segurando, para saber quando ele vai quebrar.

**Why P2**: Clareza; o jogo funciona sem ela.

**Acceptance Criteria**:

1. ITEM-01: WHILE the player holds a prop, the HUD SHALL show its Portuguese name (`Cadeira`, `Garrafa`, `Faca Amaldiçoada`, `Porrete Amaldiçoado`) below the fragment counter.
2. ITEM-02: WHILE the player holds a prop, `hud.heldItem.maxPips` SHALL equal its def durability and `hud.heldItem.pips` SHALL equal `durability − impacts`, with that many filled pips drawn.
3. ITEM-03: WHILE the player holds nothing, the HUD SHALL hide the item name and pips, reported as `hud.heldItem: null`.

**Independent Test**: smoke pega a cadeira do mapa, bate duas vezes e confere `hud.heldItem` com as pips caindo de 4 para 2.

---

### P3: Ferramentas raras

**User Story**: Como jogador, quero às vezes achar uma ferramenta rara e mais forte, para ter um momento de sorte na run.

**Why P3**: Tempero; não muda o laço principal.

**Acceptance Criteria**:

1. RAR-01: WHEN an armed enemy spawns THEN its tool SHALL be rare with probability 0.15, drawn from the loot RNG after the tool type.
2. RAR-02: WHEN a rare tool drops THEN its prop damage SHALL be `round(1.5 × damage)` of its common def (knife 24, club 39).
3. RAR-06: WHEN a rare tool drops THEN its prop durability SHALL be its common def durability plus 2 (knife 8, club 7).
4. RAR-03: WHILE a tool is rare, its sprite SHALL show an `A` outline that alternates with the common outline every 200 ms.
5. RAR-07: WHILE the player holds a rare tool, the HUD item name SHALL end with ` Rara`.
6. RAR-04: WHILE an enemy holds a rare tool, its attack values SHALL be the same as with the common tool.
7. RAR-05: WHERE the debug mode is on and the URL has `rare=1` THEN every tool SHALL be rare.

**Independent Test**: `loot.test.ts` (0,15 e ordem do sorteio); teste de dados do `PropDef` raro; smoke com `?debug&armed=knife&rare=1` confere `worldProps[].rare` e o nome no HUD.

---

## Edge Cases

- WHEN a drop happens during a hitstop THEN the pickups SHALL spawn in that frame and start moving when the hitstop ends.
- WHEN an enemy dies against a wall THEN no pickup SHALL end a frame inside the wall (ECO-07).
- WHEN the player dies THEN the pickups and dropped tools on the ground SHALL stay until the next run starts or they expire.
- WHEN the round is cleared THEN the pickups on the ground SHALL stay and remain collectible during the intermission and the next round.
- IF the player is holding a prop when an armed enemy drops its tool THEN the tool SHALL stay in `rest` until the player's hands are free.
- WHEN a thrown tool breaks on impact THEN it SHALL NOT count toward the 6 dropped tools.
- IF the loot RNG draws a heal drop and a fragment drop for the same death THEN both SHALL spawn in that frame.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| ECO-01 | P1: Fragmentos | Specify | Implementing |
| ECO-02 | P1: Fragmentos | Specify | Implementing |
| ECO-03 | P1: Fragmentos | Specify | Implementing |
| ECO-04 | P1: Fragmentos | Specify | Implementing |
| ECO-05 | P1: Fragmentos | Specify | Implementing |
| ECO-06 | P1: Fragmentos | Specify | Implementing |
| ECO-07 | P1: Fragmentos | Specify | Implementing |
| ECO-24 | P1: Fragmentos | Specify | Implementing |
| ECO-08 | P1: Fragmentos | Specify | Implementing |
| ECO-09 | P1: Fragmentos | Specify | Implementing |
| ECO-10 | P1: Fragmentos | Specify | Implementing |
| ECO-18 | P1: Fragmentos | Specify | Implementing |
| ECO-11 | P1: Fragmentos | Specify | Implementing |
| ECO-25 | P1: Fragmentos | Specify | Implementing |
| ECO-12 | P1: Fragmentos | Specify | Implementing |
| ECO-13 | P1: Fragmentos | Specify | Implementing |
| ECO-26 | P1: Fragmentos | Specify | Implementing |
| ECO-20 | P1: Fragmentos | Specify | Implementing |
| ECO-14 | P1: Fragmentos | Specify | Implementing |
| ECO-27 | P1: Fragmentos | Specify | Pending |
| ECO-15 | P1: Fragmentos | Specify | Implementing |
| ECO-28 | P1: Fragmentos | Specify | Implementing |
| ECO-16 | P1: Fragmentos | Specify | Pending |
| ECO-29 | P1: Fragmentos | Specify | Pending |
| ECO-30 | P1: Fragmentos | Specify | Pending |
| ECO-21 | P1: Fragmentos | Specify | Implementing |
| ECO-17 | P1: Fragmentos | Specify | Pending |
| ECO-31 | P1: Fragmentos | Specify | Pending |
| ECO-22 | P1: Fragmentos | Specify | Pending |
| ECO-19 | P1: Fragmentos | Specify | Pending |
| ECO-23 | P1: Fragmentos | Specify | Pending |
| HEAL-01 | P1: Gota de cura | Specify | Implementing |
| HEAL-02 | P1: Gota de cura | Specify | Implementing |
| HEAL-03 | P1: Gota de cura | Specify | Pending |
| HEAL-08 | P1: Gota de cura | Specify | Pending |
| HEAL-04 | P1: Gota de cura | Specify | Implementing |
| HEAL-09 | P1: Gota de cura | Specify | Implementing |
| HEAL-05 | P1: Gota de cura | Specify | Implementing |
| HEAL-06 | P1: Gota de cura | Specify | Implementing |
| HEAL-07 | P1: Gota de cura | Specify | Pending |
| HEAL-10 | P1: Gota de cura | Specify | Pending |
| ARM-01 | P1: Inimigos armados | Specify | Implementing |
| ARM-02 | P1: Inimigos armados | Specify | Implementing |
| ARM-03 | P1: Inimigos armados | Specify | Implementing |
| ARM-04 | P1: Inimigos armados | Specify | Implementing |
| ARM-05 | P1: Inimigos armados | Specify | Implementing |
| ARM-20 | P1: Inimigos armados | Specify | Implementing |
| ARM-21 | P1: Inimigos armados | Specify | Implementing |
| ARM-06 | P1: Inimigos armados | Specify | Implementing |
| ARM-22 | P1: Inimigos armados | Specify | Implementing |
| ARM-23 | P1: Inimigos armados | Specify | Implementing |
| ARM-07 | P1: Inimigos armados | Specify | Implementing |
| ARM-08 | P1: Inimigos armados | Specify | Pending |
| ARM-09 | P1: Inimigos armados | Specify | Pending |
| ARM-10 | P1: Inimigos armados | Specify | Pending |
| ARM-15 | P1: Inimigos armados | Specify | Implementing |
| ARM-11 | P1: Usar a ferramenta | Specify | Implementing |
| ARM-24 | P1: Usar a ferramenta | Specify | Implementing |
| ARM-12 | P1: Usar a ferramenta | Specify | Pending |
| ARM-17 | P1: Usar a ferramenta | Specify | Pending |
| ARM-26 | P1: Usar a ferramenta | Specify | Pending |
| ARM-27 | P1: Usar a ferramenta | Specify | Pending |
| ARM-13 | P1: Usar a ferramenta | Specify | Pending |
| ARM-28 | P1: Usar a ferramenta | Specify | Pending |
| ARM-14 | P1: Usar a ferramenta | Specify | Pending |
| ARM-18 | P1: Usar a ferramenta | Specify | Pending |
| ARM-16 | P1: Usar a ferramenta | Specify | Pending |
| ARM-19 | P1: Usar a ferramenta | Specify | Pending |
| ITEM-01 | P2: Item na mão no HUD | Specify | Implementing |
| ITEM-02 | P2: Item na mão no HUD | Specify | Pending |
| ITEM-03 | P2: Item na mão no HUD | Specify | Pending |
| RAR-01 | P3: Ferramentas raras | Specify | Implementing |
| RAR-02 | P3: Ferramentas raras | Specify | Implementing |
| RAR-06 | P3: Ferramentas raras | Specify | Implementing |
| RAR-03 | P3: Ferramentas raras | Specify | Pending |
| RAR-07 | P3: Ferramentas raras | Specify | Implementing |
| RAR-04 | P3: Ferramentas raras | Specify | Implementing |
| RAR-05 | P3: Ferramentas raras | Specify | Implementing |

**Coverage:** 78 total, 0 mapped to tasks, 78 unmapped ⚠️

---

## Success Criteria

- [ ] Numa run com `?debug&seed=1`, abater um inimigo e andar até o ponto de morte aumenta a carteira e mostra o "+N" e o contador pulando.
- [ ] Da rodada 3 em diante aparecem inimigos armados, e a ferramenta que eles largam pode ser pega, usada e quebrada.
- [ ] Duas runs com a mesma seed geram as mesmas ondas da F1 e os mesmos drops, na mesma ordem de abates.
- [ ] `npm test`, `npm run typecheck`, `npm run build` e `npm run smoke` passam.
