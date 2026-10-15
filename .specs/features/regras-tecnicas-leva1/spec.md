# Regras das técnicas da leva 1 — Specification

## Problem Statement

A F34 (`tecnicas-jjk-1`) liga ao jogo três técnicas novas: Boogie Woogie, Ressonância e Fala Amaldiçoada. Para
adiantar a fase, as regras puras delas (estado, passo por tempo, quem é atingido, eventos devolvidos) e os números
base e por eixo entram agora, sem Phaser e sem tocar no catálogo, na loja nem nas teclas. Fonte:
`docs/plano-builds-e-habilidades.md`, seções 2.1 (regra de eixos), 2.5 (Boogie e `core/swap.ts`) e 5.1 (Ressonância
e Fala).

## Goals

- [ ] As três técnicas têm regra pura em `src/core/` com teste par em `tests/core/`, e números em `src/data/`.
- [ ] Cada eixo é coberto no 0 e no 3, cada ramo e cada Despertar têm teste, e os casos de borda também.
- [ ] O `TechId`, o `TECHNIQUES` e o catálogo da loja não mudam (os testes da loja seguem iguais).

## Out of Scope

| Feature | Reason |
| --- | --- |
| Adaptador Phaser, vista, ícone, tecla e registro no `TechRunner` | É a F34 |
| Entrada no `TechId`, no `TECHNIQUES` e no `GAME_SHOP_CATALOG` | Quebraria os testes da loja; é a F34 |
| Estado de progressão (pontos, ramo pendente, painel) | É o `core/axisBuild.ts` da F30; aqui a regra recebe os pontos prontos |
| Piso de custo de 60% | Mora no `techStats`/`buildEffects` (F30/F35); as tabelas guardam o número cru do plano |
| Faixa `Hit.band` no `Hit` | É da F29; aqui os eventos só carregam `band: 'chip' \| 'micro' \| 'normal'` |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Entrada da regra | `{ axes, branch }` com os pontos já gastos; o Despertar é derivado (ramo escolhido e Nv ≥ 5) | O plano diz que o Despertar é automático; quem guarda os pontos é a F30 | n |
| Entrada inválida | eixo fora de 0..3 (ou não inteiro), soma acima de 5, ou ramo abaixo do Nv 2 lança `RangeError` | Erro de fiação aparece no teste, não vira número estranho no jogo | n |
| Componente proporcional | 4% do HP máximo (chefe 1%), arredondado, **uma vez por alvo por conjuração** | O "1 vez por conjuração" da 2.1 com o "de cada um" do Vermelho Máximo | n |
| Despertar sem % no texto | Boneco de Palha: o 1º eco da janela tira 1% do chefe; Exploda em Cadeia: a explosão tira 4% (chefe 1%) de cada vizinho | A 2.1 diz que todo Despertar tem o componente | n |
| Boogie: alvo | à frente (`dx × facing > 0`), distância entre centros ≤ alcance, o mais perto e, no empate, o menor id; qualquer tipo (inimigo, chefe, orbe, projétil) | "o mais próximo à frente" | n |
| Boogie: encaixe | corpo (inimigo/chefe com caixa) troca com os pés alinhados; orbe e projétil trocam centro com centro. Recusa se a caixa do player não cabe e, quando o alvo tem caixa, se a dele não cabe no lugar do player | O chefe grande não pode nascer dentro da parede | n |
| Boogie: recusa | sem alvo, sem encaixe ou sem carga: devolve o custo e não gasta carga | "a troca é recusada e a energia volta" | n |
| Boogie: cargas | uma recarga por vez: a cada `cooldownMs` volta uma carga até o máximo | Molde comum de cargas | n |
| Boogie: choque | chip em raio de 40 px em volta do ponto de saída e do de chegada; cada corpo uma vez | "chip nos dois pontos" | n |
| Boogie: Dupla Palma | a troca que gasta carga arma uma 2ª troca grátis de carga por 1000 ms; a 2ª paga energia | "sem recarga entre elas" | n |
| Boogie: Palma Falsa | segurar 250 ms ou mais finge; gasta carga e energia; comuns a até 120 px erram o próximo golpe (janela de Contra de 400 ms); o chefe só com a Finta Total e se estiver preparando golpe | O plano só cita o chefe no Despertar | n |
| Boogie: Eco da Palma | 1000 ms depois da 2ª troca, o evento `echo` pede a troca de volta; quem aplica é o adaptador, de novo pelo `swapPlacement` | A posição muda até lá | n |
| Ressonância: números sem base no plano | custo 25/21/18/15, recarga 3000/2400/1900/1500, prego 900 px/s, alcance 320, leque de 36 px, toque do prego 3 (micro) | "Desmantelar e Boogie no meio"; alcance travado em 320 | n |
| Ressonância: janela | o 2º toque vale enquanto houver prego no ar ou marca viva; a janela é a duração da marca. Sem nada vivo, a recarga começa | "em até 6 s" é o 0 do eixo Marca | n |
| Ressonância: marca | uma marca por prego cravado; a detonação dá o dano por marca | "detonar 5 ou mais marcas" conta marcas | n |
| Ressonância: propagação | no abate pela detonação, 1 marca pula para o vivo mais perto no raio e detona na mesma cascata (cada alvo uma vez); no abate por outra fonte, as marcas do morto pulam inteiras, com duração nova | "propagação ao matar" | n |
| Ressonância: Grampo | o prego explode ao cravar: 6 micro em 32 px | Plano sem número | n |
| Ressonância: Boneco | 250 ms depois da detonação, o chefe marcado toma um eco micro de 50% do que tomou | "repete 50%" | n |
| Ressonância: Coroa de Pregos | 5+ marcas na mesma detonação soltam a 2ª no centro dos marcados, raio 80: dano de 1 marca + 4% (chefe 1%) | Molde da 3ª detonação do Fliperama | n |
| Fala: números sem base | custo 25/21/18/15, recarga 4000/3300/2700/2200; chefe atordoa 25% do comum (150 no 0) | "Pare!" é controle forte | n |
| Fala: cone | abertura total (30° = ±15°), do centro do player; alvo com `dx × facing > 0` | Leitura direta da tabela | n |
| Fala: vida | recusa se a vida não passa do custo (nunca mata o player) | Custo em vida não é suicídio | n |
| Fala: "Volte" | força 9 para longe; o comum cai; o chefe só recua (força × 0,3) | Chefe não é derrubado por técnica comum | n |
| Fala: Esmague | o empurrado que bate em parede ou corpo toma 4% (chefe 1%) uma vez; os dois caem, exceto o chefe | "e os dois caem" | n |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Regra comum de eixos ⭐ MVP

**User Story**: Como F34, quero uma regra única para nível, ramo, Despertar e componente proporcional, para as três
técnicas lerem os pontos do mesmo jeito.

**Acceptance Criteria**:

1. TRL-01: The rule SHALL compute the level as 1 plus the sum of the axis points.
2. TRL-02: IF an axis has points outside 0..3 or not an integer, or the sum exceeds 5, THEN the rule SHALL throw a `RangeError`.
3. TRL-03: IF a branch is set below level 2 THEN the rule SHALL throw a `RangeError`.
4. TRL-04: WHEN the branch is set and the level is 5 or more THEN the build SHALL be awakened; otherwise it SHALL NOT.
5. TRL-05: The proportional bite SHALL be `round(maxHp × pct)` for a common target and `round(maxHp × min(pct, 1%))` for the boss.

**Independent Test**: `tests/core/axisRule.test.ts`.

---

### P1: Boogie Woogie ⭐ MVP

**User Story**: Como jogador, quero trocar de lugar com o que está à minha frente, para entrar e sair do cerco.

**Acceptance Criteria**:

1. BOO-01: The base stats SHALL be range 220, cost 20, cooldown 2500, sign 80, release 60, 1 charge, stun 0, shock 0.
2. BOO-02: Each axis at 3 points SHALL give: range 320, stun 600, 3 charges with the cooldown × 0.8, shock 20, cost 8, cooldown 1200.
3. BOO-03: The target SHALL be the nearest candidate in front within range, ties by id; candidates behind or out of range SHALL be ignored.
4. BOO-04: WHEN the player's box (or the target's box, when it has one) does not fit THEN the swap SHALL be refused, the cost refunded and no charge spent.
5. BOO-05: WHEN there is no target or no charge THEN the cast SHALL be refused with the cost refunded.
6. BOO-06: The swapped common enemy SHALL be stunned for the stun stat; the boss, the orb and the projectile SHALL get 0.
7. BOO-07: WHEN the shock is above 0 THEN every body within 40 px of the departure or arrival point SHALL take one chip hit.
8. BOO-08: Charges SHALL refill one per cooldown up to the maximum.
9. BOO-09: WHILE the branch is Dupla Palma, a charge-spending swap SHALL arm a second swap for 1000 ms that spends no charge.
10. BOO-10: WHILE the branch is Palma Falsa, a hold of 250 ms or more SHALL feint: common enemies within 120 px miss the next attack with a 400 ms counter window.
11. BOO-11: WHEN Finta Total is awakened and a boss within 120 px is winding up THEN the feint SHALL cancel it and bite 1%, at most once every 10 s.
12. BOO-12: WHEN Eco da Palma is awakened THEN 1000 ms after the second swap the step SHALL emit an `echo` event for that target with 4% (boss 1%).

**Independent Test**: `tests/core/swap.test.ts`, `tests/core/boogie.test.ts`.

---

### P1: Ressonância ⭐ MVP

**User Story**: Como jogador, quero cravar pregos e detoná-los no segundo toque, para marcar o grupo e explodir tudo
de uma vez.

**Acceptance Criteria**:

1. RES-01: The base stats SHALL be 3 nails, detonation 20 per mark, mark 6000 ms, propagation 0, cost 25, cooldown 3000.
2. RES-02: Each axis at 3 points SHALL give 6 nails, 44, 12000 ms, 100 px, cost 15, cooldown 1500.
3. RES-03: The first tap SHALL throw the nails; each nail SHALL stick in the first target along its path, deal 3 micro and add one mark that lasts the mark stat.
4. RES-04: The second tap SHALL detonate every live mark, dealing the detonation damage per mark, clear the marks and start the cooldown.
5. RES-05: WHEN no nail is in flight and no mark is alive THEN the window SHALL close and the cooldown SHALL start.
6. RES-06: WHEN the detonation kills a target and propagation is above 0 THEN one mark SHALL jump to the nearest living target within range and detonate in the same cascade, each target at most once.
7. RES-07: WHEN a marked target dies by another source and propagation is above 0 THEN its marks SHALL jump to the nearest living target within range.
8. RES-08: WHILE the branch is Grampo, each nail SHALL explode on sticking for 6 micro within 32 px.
9. RES-09: WHILE the branch is Boneco, a detonated boss SHALL take an echo of 50% of the detonation 250 ms later.
10. RES-10: WHEN Coroa de Pregos is awakened and 5 or more marks detonate at once THEN a second detonation SHALL hit within 80 px of the marked group's center for one mark plus 4% (boss 1%).
11. RES-11: WHEN Boneco de Palha is awakened THEN for 3000 ms after the detonation the marked boss SHALL echo 50% of any damage, with poise, and the first echo SHALL bite 1%.
12. RES-12: Nail spread jitter SHALL come only from a received `Rng`; without it the spread SHALL be even.

**Independent Test**: `tests/core/resonance.test.ts`.

---

### P1: Fala Amaldiçoada ⭐ MVP

**User Story**: Como jogador, quero gritar "Pare!" e travar quem está no cone, pagando com vida, para abrir a defesa
do grupo.

**Acceptance Criteria**:

1. FAL-01: The base stats SHALL be range 140, stun 600 (boss 150), hp cost 8, cone 30°, cost 25, cooldown 4000.
2. FAL-02: Each axis at 3 points SHALL give range 260, stun 1200 (boss 300), hp cost 2, cone 60°, cost 15, cooldown 2200.
3. FAL-03: The cone SHALL hit targets in front within range whose angle to the facing is at most half the cone.
4. FAL-04: IF the player's hp is not above the hp cost THEN the cast SHALL be refused.
5. FAL-05: WHILE the branch is "Exploda", every stunned target SHALL take 20.
6. FAL-06: WHILE the branch is "Volte", every target SHALL be pushed away with force 9; the common one SHALL be knocked down and the boss SHALL only recoil (force × 0.3).
7. FAL-07: WHEN Exploda em Cadeia is awakened and a target stunned by the cast dies THEN it SHALL explode, stunning living neighbors within 70 px for 300 ms (boss 75) with 4% (boss 1%), and the chain SHALL continue.
8. FAL-08: WHEN Esmague is awakened and a pushed target hits a wall or a body THEN it SHALL take 4% (boss 1%) once and both SHALL fall, except the boss.

**Independent Test**: `tests/core/cursedSpeech.test.ts`.

---

## Edge Cases

- Eixo com 3 pontos não aceita o 4º (TRL-02); 5 pontos é o teto do item.
- Boogie sem candidato à frente, com candidato exatamente na linha do player (`dx = 0`) ou além do alcance: recusa.
- Boogie com Dupla Palma: a 2ª troca recusada não desarma a janela; a janela vence sozinha em 1000 ms.
- Ressonância: detonar sem marca nenhuma não acontece (o 2º toque só existe com algo vivo); marca vencida não detona.
- Fala com a vida igual ao custo: recusa.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| TRL-01 | P1: Regra comum de eixos | Execute | Verified |
| TRL-02 | P1: Regra comum de eixos | Execute | Verified |
| TRL-03 | P1: Regra comum de eixos | Execute | Verified |
| TRL-04 | P1: Regra comum de eixos | Execute | Verified |
| TRL-05 | P1: Regra comum de eixos | Execute | Verified |
| BOO-01 | P1: Boogie Woogie | Execute | Verified |
| BOO-02 | P1: Boogie Woogie | Execute | Verified |
| BOO-03 | P1: Boogie Woogie | Execute | Verified |
| BOO-04 | P1: Boogie Woogie | Execute | Verified |
| BOO-05 | P1: Boogie Woogie | Execute | Verified |
| BOO-06 | P1: Boogie Woogie | Execute | Verified |
| BOO-07 | P1: Boogie Woogie | Execute | Verified |
| BOO-08 | P1: Boogie Woogie | Execute | Verified |
| BOO-09 | P1: Boogie Woogie | Execute | Verified |
| BOO-10 | P1: Boogie Woogie | Execute | Verified |
| BOO-11 | P1: Boogie Woogie | Execute | Verified |
| BOO-12 | P1: Boogie Woogie | Execute | Verified |
| RES-01 | P1: Ressonância | Execute | Verified |
| RES-02 | P1: Ressonância | Execute | Verified |
| RES-03 | P1: Ressonância | Execute | Verified |
| RES-04 | P1: Ressonância | Execute | Verified |
| RES-05 | P1: Ressonância | Execute | Verified |
| RES-06 | P1: Ressonância | Execute | Verified |
| RES-07 | P1: Ressonância | Execute | Verified |
| RES-08 | P1: Ressonância | Execute | Verified |
| RES-09 | P1: Ressonância | Execute | Verified |
| RES-10 | P1: Ressonância | Execute | Verified |
| RES-11 | P1: Ressonância | Execute | Verified |
| RES-12 | P1: Ressonância | Execute | Verified |
| FAL-01 | P1: Fala Amaldiçoada | Execute | Verified |
| FAL-02 | P1: Fala Amaldiçoada | Execute | Verified |
| FAL-03 | P1: Fala Amaldiçoada | Execute | Verified |
| FAL-04 | P1: Fala Amaldiçoada | Execute | Verified |
| FAL-05 | P1: Fala Amaldiçoada | Execute | Verified |
| FAL-06 | P1: Fala Amaldiçoada | Execute | Verified |
| FAL-07 | P1: Fala Amaldiçoada | Execute | Verified |
| FAL-08 | P1: Fala Amaldiçoada | Execute | Verified |

**Coverage:** 37 total, 37 mapped to commits (one per technique; the shared rule ships with Boogie), 0 unmapped.

---

## Success Criteria

- [ ] Gate verde em cada commit; `TechId`, `TECHNIQUES` e catálogo intactos.
- [ ] A F34 liga as três técnicas lendo só estes arquivos e o `axisBuild` da F30.
