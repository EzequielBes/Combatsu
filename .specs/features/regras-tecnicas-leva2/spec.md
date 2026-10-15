# Regras das técnicas da leva 2 — Specification

## Problem Statement

A F41 (`leva-2`) liga ao jogo quatro técnicas novas: Convergência (Choso), Cães Divinos (Megumi), Punho de Trovão
(Kashimo) e Erupção (Jogo). Como na leva 1, as regras puras (estado, passo por tempo, quem é atingido, eventos com a
faixa de acerto) e os números base e por eixo entram agora, sem Phaser e sem tocar no catálogo, na loja nem nas teclas.
Fonte: `docs/plano-builds-e-habilidades.md`, seções 2.1 (regra de eixos), 4 (faixas de acerto) e 5.1 (as quatro
técnicas). Irmã de `.specs/features/regras-tecnicas-leva1/spec.md`, cujas decisões comuns valem aqui sem repetição.

**Nada automático:** toda técnica sai da tecla do jogador. Os Cães são uma investida curta comandada que some em
1,2 s (não ficam, não escolhem alvo); o Punho de Trovão carrega os próximos golpes do moveset e não cria golpe novo.

## Goals

- [ ] As quatro técnicas têm regra pura em `src/core/` com teste par em `tests/core/`, e números em `src/data/`.
- [ ] Cada eixo é coberto no 0 e no 3; cada ramo, cada Despertar e as bordas têm teste.
- [ ] Os eventos marcam a faixa: mordida, raio em cadeia e estilhaços são `micro`; queima e lava são `chip`.
- [ ] O `TechId`, o `TECHNIQUES` e o catálogo da loja não mudam.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Adaptador Phaser, vista, ícone, tecla, `slotHeld` e registro no `TechRunner` | É a F41 |
| Entrada no `TechId`, no `TECHNIQUES` e no `GAME_SHOP_CATALOG` | Quebraria os testes da loja; é a F41 |
| Estado de progressão (pontos, ramo pendente, painel) | É o `core/axisBuild.ts` da F30 |
| Piso de custo de 60% e teto de hitstop micro (60 ms/s) | Moram no `buildEffects` e no `Hit.band` (F29/F35) |
| Evolução Sangue Eterno, Duos (Ordem Elétrica, Impacto Elétrico, Sombra no Contra) | Seção 5.7, outra feature |

---

## Assumptions & Open Questions

Valem as decisões comuns da leva 1: entrada `{ axes, branch }`, `RangeError` na entrada inválida, componente
proporcional de 4% (chefe 1%) **uma vez por alvo por conjuração**, e 30% da recarga no 1º abate da conjuração com
Recarga no 3 (TRL-06).

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Kit comum | `core/techKit.ts`: caixa contra caixa, círculo contra caixa, entrada de segmento horizontal na caixa, o vivo mais perto fora de um conjunto, sonda de parede e a devolução de recarga uma vez por conjuração | As quatro técnicas repetem essas contas | n |
| Eixo de 2 passos (2 → 4, 1 → 3) | o valor sobe nos pontos 1 e 2 e o 3º ponto traz um bônus próprio, no molde das Cargas do Boogie | Todo ponto muda algo | n |
| Convergência: energia | custo fixo de 20, sem eixo de Eficiência (o plano lista 6 eixos sem ela); a vida é o gargalo | Os 6 eixos do plano | n |
| Convergência: carga | tocar e soltar dá 50% do dano; segurar sobe linear até 100% na carga cheia; depois da carga cheia segura sem disparar sozinha | "segurar carrega até 600 ms"; nada automático | n |
| Convergência: piso de vida | recusa se `vida − custo < 1`; com custo 0, nunca recusa | "Custo em vida com piso": a técnica nunca mata o player | n |
| Convergência: feixe | horizontal, 320 px, da boca do player; atinge na ordem da entrada (empate pelo id) até a perfuração; a sonda de parede corta o feixe | Alcance travado em 320 | n |
| Convergência: ramos | Supernova: no fim do feixe, estilhaços (micro) de 50% do dano em 48 px; Curva: do fim, dobra 1 vez para o vivo mais perto não atingido a até 160 px, dano cheio | Plano sem número | n |
| Convergência: Despertares | **Supernova Carmesim**: estilhaços em 96 px e 4% (chefe 1%) em cada atingido por eles; **Sangue Perfurante**: dobra até 3 vezes, e cada alvo da dobra toma 4% (chefe 1%) | Molde da 2.1 | n |
| Cães: números | cães [2,3,4,4] (no 3, investida ×1,25); mordidas [1,2,3,3] (no 3, mordida 6 → 8); alcance [200,240,280,320]; prisão [0,200,400,600] (chefe 25%); custo [24,20,17,14]; recarga [3500,2900,2400,2000] | Plano dá só as pontas | n |
| Cães: investida | os cães saem rentes ao chão em faixas de 16 px, a 480 px/s, à frente; cada um morde o 1º alvo da sua faixa (mordida na chegada e a cada 200 ms até as mordidas do eixo) e some no fim delas, no alcance ou aos 1200 ms | "mordem o 1º alvo e somem em 1,2 s" | n |
| Cães: prisão | só na 1ª mordida de cada cão; o chefe fica preso 25% | Molde do atordoamento da Fala | n |
| Cães: Totalidade | um lobo no lugar dos cães: dano por alvo = mordida × cães; salta para o vivo mais perto não atingido a até 120 px a cada 150 ms, até 3 alvos; as Mordidas não se aplicam | "lobo grande que salta por 3 alvos" | n |
| Cães: Matilha | metade (arredondada para cima) sai à frente e o resto para trás | "abrem para os dois lados" | n |
| Cães: Despertares | **Totalidade Negra**: o lobo salta por até 5 alvos e cada um toma 4% (chefe 1%); **Matilha Faminta**: o cão que acaba as mordidas (ou perde o alvo) com tempo de sobra pula para o vivo mais perto a até 80 px que ele ainda não mordeu, e todo alvo mordido pela matilha toma 4% (chefe 1%) | Molde da 2.1 | n |
| Trovão: números | cargas [3,4,5,6]; saltos [2,3,4,4] (no 3, raio do salto 120 → 160); dano [8,11,13,16]; atordoa [0,100,200,300] (chefe 25%); custo [30,25,21,18]; recarga [6000,5000,4200,3500]; janela da carga 8000 ms; hitstop por salto 18 ms | Plano dá as pontas e o 15 a 20 ms | n |
| Trovão: raio | cada golpe do moveset que acerta gasta 1 carga; o golpeado toma o raio (salto 0) e o raio salta até N vezes para o vivo mais perto do último atingido, dentro do raio do salto, sem repetir alvo, empate pelo id. Golpe que erra não gasta | "não cria golpe" | n |
| Trovão: golpe com vários alvos | o `LandedStrike` traz o `swingId` do `Hit` (IMP-14): um golpe gasta 1 carga só, e os outros alvos do mesmo golpe não soltam raio | "os próximos 3 golpes", não os próximos 3 alvos (achado da revisão) | n |
| Alvos na tela | toda técnica recebe só os alvos vivos dentro da tela; saltos, dobras e estilhaços não sabem onde a câmera está | "Alcance travado em 320 px" vale também para o que parte do fim do alcance (achado da revisão) | n |
| Trovão: reconjurar | repõe as cargas no máximo e a janela, sem somar | Molde de carga | n |
| Trovão: ramos | Tempestade: o golpe forte com carga também solta um raio vertical: micro de 2× o dano em todos com centro a até 24 px do x do golpeado; Estática: todo acerto do raio atordoa mais 250 ms (chefe 25%) | Plano sem número | n |
| Trovão: Despertares | **Raio Celeste**: o raio vertical derruba os comuns e tira 4% (chefe 1%) de cada atingido; **Descarga**: o raio que alcança um alvo ainda atordoado por esta carga tira 4% (chefe 1%) dele e ganha +1 salto (uma vez por raio) | Molde da 2.1 | n |
| Erupção: números | altura [64,80,96,112]; erupções [1,2,3,4] a 80 px à frente e 56 px uma da outra, 120 ms entre elas; queima [0,2,3,4] chip a cada 300 ms por até 2 s (6 tiques, renova sem somar); dano [24,30,36,42]; custo [30,26,22,18]; recarga [3500,3000,2500,2000]; largura do pilar 32; sinal 250 ms | Plano dá as pontas | n |
| Erupção: pilar | sobe do chão no instante da ativação e acerta (normal) cada caixa que toca, uma vez por pilar | Molde do corte | n |
| Erupção: Meteoro | o pilar vira meteoro: cai 400 ms depois, acerta num raio de 56 px em volta do ponto no chão com 1,5× o dano e derruba o comum | Plano só dá o nome | n |
| Erupção: Lago de Lava | cada pilar deixa lava de 64 px por 3 s: chip de max(3, queima) a cada 300 ms em quem toca a lava | "3 s, chip" | n |
| Erupção: Despertares | **Chuva de Meteoros**: cada meteoro solta 2 estilhaços (micro, 50% do dano, raio de 24 px) 48 px para cada lado 200 ms depois, e cada atingido pelo impacto principal toma 4% (chefe 1%); **Caldeira**: quando a lava acaba ela entra em erupção, com o dano do pilar e 4% (chefe 1%) | Molde da 2.1 | n |
| Detalhes fixados na implementação | Cães: quem pode pular (lobo, Matilha Faminta) espera o intervalo da mordida antes do salto, e a prisão é só da 1ª mordida de cada cão (o lobo inclusive). Trovão: a Descarga vale também no golpeado (salto 0); quem guarda a recarga é o adaptador, como na Fala. Erupção: os tempos contam no instante agendado, não no do quadro; a lava dá 10 tiques (o do fim incluso) e a Caldeira também acende a queima | Resultado não depende do passo do quadro | n |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Kit comum ⭐ MVP

1. KIT-01: The kit SHALL tell box overlap, circle-to-box overlap and the entry distance of a horizontal segment into a box.
2. KIT-02: The nearest pick SHALL take the closest living target within the radius outside a skip set, ties by id.
3. KIT-03: The kill refund SHALL give `round(cooldown × pct)` on the first claim of a cast and 0 afterwards or with pct 0.

**Independent Test**: `tests/core/techKit.test.ts`.

### P1: Convergência ⭐ MVP

1. CNV-01: The base stats SHALL be pierce 2, charge 600 ms, width 4, hp cost 6, damage 28, cooldown 3500, energy 20, range 320.
2. CNV-02: Each axis at 3 points SHALL give pierce all, charge 300, width 10, hp cost 0, damage 52, cooldown 2000.
3. CNV-03: The damage SHALL scale from 50% (tap) to 100% (full charge), linearly with the held time.
4. CNV-04: IF `hp − hpCost < 1` THEN the cast SHALL be refused with the energy refunded; with hp cost 0 it SHALL never be refused.
5. CNV-05: The beam SHALL hit, in entry order, the targets whose box crosses its band, up to the pierce count, and stop at a wall from the probe.
6. CNV-06: WHILE the branch is Supernova, the beam end SHALL burst into micro shards of 50% within 48 px.
7. CNV-07: WHILE the branch is Curva, the beam SHALL bend once from its end to the nearest living unhit target within 160 px.
8. CNV-08: WHEN Supernova Carmesim is awakened THEN the shards SHALL reach 96 px and bite 4% (boss 1%).
9. CNV-09: WHEN Sangue Perfurante is awakened THEN the beam SHALL bend up to 3 times and each bend target SHALL take 4% (boss 1%).
10. CNV-10: WHEN a beam hit kills and Recarga is at 3 THEN the cast SHALL report 30% of the cooldown as refund.

**Independent Test**: `tests/core/convergence.test.ts`.

### P1: Cães Divinos ⭐ MVP

1. CAO-01: The base stats SHALL be 2 dogs, range 200, 1 bite, root 0, cost 24, cooldown 3500.
2. CAO-02: Each axis at 3 points SHALL give 4 dogs (dash ×1.25), range 320, 3 bites of 8, root 600, cost 14, cooldown 2000.
3. CAO-03: Each dog SHALL dash forward along its lane and bite the first target it reaches with a micro bite, then every 200 ms up to the bite count.
4. CAO-04: Every dog SHALL vanish at 1200 ms, at the end of its range or after its last bite.
5. CAO-05: The first bite of each dog SHALL root for the root stat; the boss SHALL get 25%.
6. CAO-06: WHILE the branch is Totalidade, a single wolf SHALL bite for bite × dogs and leap to the nearest unhit living target within 120 px, up to 3 targets.
7. CAO-07: WHILE the branch is Matilha, half the dogs (rounded up) SHALL dash forward and the rest backward.
8. CAO-08: WHEN Totalidade Negra is awakened THEN the wolf SHALL leap up to 5 targets and each SHALL take 4% (boss 1%).
9. CAO-09: WHEN Matilha Faminta is awakened THEN a dog with time left SHALL jump to the nearest living target within 80 px it has not bitten, and every bitten target SHALL take 4% (boss 1%) once.
10. CAO-10: The first kill of the cast SHALL give back 30% of the cooldown with Recarga at 3.

**Independent Test**: `tests/core/divineDogs.test.ts`.

### P1: Punho de Trovão ⭐ MVP

1. TRV-01: The base stats SHALL be 3 charges, 2 jumps, damage 8, stun 0, cost 30, cooldown 6000, window 8000, hop hitstop 18.
2. TRV-02: Each axis at 3 points SHALL give 6 charges, 4 jumps (radius 160), damage 16, stun 300 (boss 75), cost 18, cooldown 3500.
3. TRV-03: A landed moveset hit with a charge SHALL spend it and release a micro bolt on the struck target that jumps up to N times to the nearest unvisited living target within the jump radius.
4. TRV-04: A missed strike, no charge, the end of the window or another target of a swing that already spent a charge SHALL release nothing; recasting SHALL refill without stacking.
5. TRV-05: WHILE the branch is Tempestade, a charged heavy hit SHALL also release a vertical micro bolt of 2× on every target within 24 px of the struck x.
6. TRV-06: WHILE the branch is Estática, every bolt hit SHALL stun 250 ms more (boss 25%).
7. TRV-07: WHEN Raio Celeste is awakened THEN the vertical bolt SHALL knock down commons and bite 4% (boss 1%).
8. TRV-08: WHEN Descarga is awakened and the bolt reaches a target still stunned by this charge THEN it SHALL bite 4% (boss 1%) and gain one jump, once per bolt.
9. TRV-09: The first kill of the charge SHALL give back 30% of the cooldown with Recarga at 3.

**Independent Test**: `tests/core/thunderFist.test.ts`.

### P1: Erupção ⭐ MVP

1. ERU-01: The base stats SHALL be height 64, 1 eruption, burn 0, damage 24, cost 30, cooldown 3500.
2. ERU-02: Each axis at 3 points SHALL give height 112, 4 eruptions, burn 4, damage 42, cost 18, cooldown 2000.
3. ERU-03: Eruption `i` SHALL rise at `sign + i × 120 ms`, 80 + 56 i px ahead, and hit (normal) each box it touches once.
4. ERU-04: WHEN burn is above 0 THEN a hit target SHALL take chip burn every 300 ms for up to 2 s, refreshed and not stacked.
5. ERU-05: WHILE the branch is Meteoro, each eruption SHALL fall 400 ms later as a 56 px impact of 1.5× that knocks down commons.
6. ERU-06: WHILE the branch is Lago de Lava, each eruption SHALL leave 64 px of lava for 3 s with chip `max(3, burn)` every 300 ms.
7. ERU-07: WHEN Chuva de Meteoros is awakened THEN each meteor SHALL drop micro shards of 50% 48 px to each side 200 ms later, and the main impact SHALL bite 4% (boss 1%).
8. ERU-08: WHEN Caldeira is awakened THEN the lava SHALL erupt at its end with the pillar damage and 4% (boss 1%).
9. ERU-09: The first kill of the cast SHALL give back 30% of the cooldown with Recarga at 3.

**Independent Test**: `tests/core/eruption.test.ts`.

---

## Edge Cases

- Convergência com a vida exatamente em `custo + 1`: passa e deixa o player com 1; em `custo`: recusa.
- Feixe com perfuração "todos" e parede antes do 1º alvo: não atinge ninguém; a Supernova estoura na parede.
- Cão cujo alvo morre no meio das mordidas: some (ou pula, na Matilha Faminta); alvo atrás do player não é mordido.
- Raio sem vizinho no raio do salto: só o golpeado toma; vizinho exatamente na borda do raio conta.
- Erupção: a mesma caixa tocada por dois pilares toma dos dois; a queima renova e não soma.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| KIT-01..03 | Kit comum | Execute | Implemented |
| CNV-01..10 | Convergência | Execute | Implemented |
| CAO-01..10 | Cães Divinos | Execute | Implemented |
| TRV-01..09 | Punho de Trovão | Execute | Implemented |
| ERU-01..09 | Erupção | Execute | Implemented |

**Revisão adversarial:** feita em 2026-10-15 (ver `validation.md`); o verificador de comportamento no jogo segue para a F41.

**Coverage:** 41 total, 41 com teste em `tests/core/{techKit,convergence,divineDogs,thunderFist,eruption}.test.ts`; um commit por técnica (o kit sai com a Convergência). Falta o verificador independente antes da F41.

---

## Success Criteria

- [ ] Gate verde em cada commit; `TechId`, `TECHNIQUES` e catálogo intactos.
- [ ] A F41 liga as quatro técnicas lendo só estes arquivos e o `axisBuild` da F30.
