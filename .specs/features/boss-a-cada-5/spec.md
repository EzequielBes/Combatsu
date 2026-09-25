# Boss a cada 5 rodadas — Specification

## Problem Statement

A run da F1 é uma sequência de ondas iguais que só ficam mais fortes. Falta um marco que dê ritmo e objetivo: um momento de tensão que o jogador espera, aprende e comemora ao vencer.

Esta feature transforma cada rodada múltipla de 5 numa luta contra um chefe. O chefe tem ataques telegrafados que se aprendem, fases que mudam a luta e uma barra de vida própria, e derrotá-lo dá uma recompensa imediata.

## Goals

- [ ] As rodadas 5, 10, 15… têm só um chefe, e a rodada termina quando ele morre.
- [ ] Todo ataque do chefe é telegrafado (≥ 350 ms de preparo visível) e desviável com os movimentos que o player já tem (pular, andar).
- [ ] A luta muda em 66% e 33% de vida: ataques mais rápidos e um padrão novo.
- [ ] Derrotar o chefe cura parte da vida do player e tem um feedback de impacto maior que o de um inimigo comum.
- [ ] Toda regra do chefe (fases, padrões, tempos, postura, escala) vive em `src/core` e é testada em Node (AD-001).

## Out of Scope

| Feature | Reason |
| --- | --- |
| Recompensa em moeda, item raro ou moeda persistente | Dependem de F3 (moeda e drops) e F6 (selos); entram nelas |
| Lacaios junto com o chefe | Deixa a luta mais legível; pode voltar como P3 de uma feature futura |
| Arena nova, portas que fecham, câmera travada | Usa o `LEVEL_1`; a sala já comporta a luta |
| Música, voz, diálogo de chefe | Não pedido; exige assets |
| Técnicas amaldiçoadas contra o chefe | F5 |

---

## Assumptions & Open Questions

Todas as decisões abaixo foram tomadas pelo agente por delegação do usuário (24/09: "vai tomando as decisões… o jogo tem que ser divertido"). Números ficam em `src/data/tuning.ts`.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Rodada de chefe | `round % 5 === 0`; a onda é 1 chefe e nenhum inimigo comum | Luta focada e legível | y |
| Ponto de spawn do chefe | O ponto `E` mais distante do player no momento do spawn | Dá espaço para ver a entrada | y |
| Entrada | Faixa `Chefe: <nome>` por 1500 ms; o chefe fica parado, sem atacar e invulnerável nesse tempo | Momento de tensão; ninguém toma dano antes de ver o chefe | y |
| Vida do chefe (tier 1) | 600 | ≈ 10× um inimigo da rodada 5 (89); luta de ~40–60 s | y |
| Fases | Fase 1 com vida > 66%; fase 2 com vida ≤ 66% e > 33%; fase 3 com vida ≤ 33% | Três atos claros | y |
| Transição de fase | Rugido de 900 ms: invulnerável, sem atacar, empurra o player para longe (impulso horizontal de 6 px/step) e treme a tela | Respiro e sinal claro de "mudou" | y |
| Padrões por fase (ordem fixa, cíclica) | F1: investida, salto; F2: investida, rajada, salto; F3: rajada, investida, salto, investida | Aprendível; sem sorteio o jogador pode ler a luta | y |
| Ritmo por fase | Multiplicador dos preparos ×1,0 / ×0,85 / ×0,7; descanso entre ataques 900 / 700 / 500 ms | Fica mais difícil sem ficar injusto | y |
| Investida | Preparo 600 ms; corre a 320 px/s na direção do player por até 360 px ou até bater na parede; dano 18, forte | Ataque de chão, desvia pulando ou saindo da linha | y |
| Salto com onda de choque | Preparo 500 ms; salto até o x do player em 700 ms; ao pousar, dano 20 no impacto e duas ondas no chão (esquerda e direita) a 240 px/s por até 600 px, com 20 px de altura e dano 12 | Desvia pulando por cima da onda | y |
| Rajada amaldiçoada | Preparo 700 ms; 3 projéteis horizontais na direção do player, com 150 ms entre eles, a 260 px/s, dano 10 cada, leve; somem ao bater em parede ou após 1200 px | Desvia pulando ou abaixando a distância | y |
| Postura (poise) | 100 pontos; golpe leve tira `dano`, forte tira `2 × dano`; ao zerar, atordoado por 1200 ms (sem atacar, sem se mover); depois volta a 100. Regenera 15/s após 2000 ms sem apanhar. Imune a hitstun de golpe leve e a ragdoll | Recompensa agressividade sem permitir stun-lock | y |
| Dano por contato | O corpo do chefe empurra, mas não causa dano | Justiça: só ataques telegrafados machucam | y |
| Derrota do chefe | Hitstop de 250 ms, tremida, explosão de fumaça amaldiçoada, faixa `Chefe derrotado!` e cura de 30% do `maxHp` do player (com teto) | Comemoração e recompensa imediata | y |
| Escala por tier (`tier = round / 5`) | Vida `round(600 × min(1 + 0,5·(tier − 1), 4))`; dano dos ataques `× min(1 + 0,15·(tier − 1), 2)`, arredondado | Chefes posteriores mais duros, com teto | y |
| Arquétipos | Tier 1 e 2: "Oni do Portão". Do tier 3 em diante alterna: tier ímpar "Tecelã de Maldições", tier par "Oni do Portão". A Tecelã tem a mesma IA com projéteis 25% mais rápidos e a rajada com 5 projéteis | Variedade sem uma segunda IA inteira | y |
| Arte do chefe | Sprite próprio em grade de texto (AD-002), maior que o inimigo; a Tecelã é a mesma grade com outro mapa de cores da paleta (sem tint multiplicativo) | Coerência visual e custo baixo | y |

**Open questions:** none - all resolved or logged above.

**Implicit-requirement dimensions sweep:**
- State-transition integrity: coberta por BAI-01..BAI-14 (fases, rugido, postura e estados de ataque).
- Input validation & bounds: coberta por BTIER-01..03 (tetos) e BAI-07 (postura nunca negativa).
- Failure / partial-failure states: N/A because não há I/O nem rede.
- Idempotency / duplicate handling: coberta por BOSS-04 (a morte do chefe conta um abate só) e BAI-06 (cada limiar de fase dispara uma vez).
- Auth boundaries & rate limits: N/A because é um jogo local.
- Concurrency / ordering: coberta por BOSS-05 (morte do player tem prioridade, regra do `Run` da F1).
- Data lifecycle / expiry: coberta por BAT-06 e BAT-12 (projéteis e ondas somem ao bater ou ao passar do alcance).
- Observability: coberta por BHUD-04 (estado do chefe no snapshot de debug).
- External-dependency failure: N/A because nenhum recurso externo é usado.

---

## User Stories

### P1: Rodada de chefe ⭐ MVP

**User Story**: Como jogador, quero que a cada 5 rodadas apareça um chefe, com uma entrada marcante, para ter um objetivo claro e um momento de tensão na run.

**Why P1**: É o pedido central; sem isso não há chefe.

**Acceptance Criteria**:

1. BOSS-01: WHEN a round `r` with `r % 5 === 0` starts THEN the wave SHALL contain exactly one boss and zero regular enemies.
2. BOSS-02: WHEN a round `r` with `r % 5 !== 0` starts THEN the wave SHALL contain `min(3 + (r − 1), 12)` regular enemies and zero bosses.
3. BOSS-03: WHEN the boss spawns THEN it SHALL be placed at the `E` point whose x has the largest absolute difference from the player's x in that frame, choosing the lowest point index on a tie.
4. BOSS-04: WHEN the boss dies THEN the run SHALL add exactly 1 to `kills`.
5. BOSS-07: WHEN the boss dies THEN the run SHALL enter `intermission` for that round.
6. BOSS-05: IF the player dies in the same frame as the boss THEN the run SHALL enter `gameOver` (F1 priority rule).
7. BOSS-06: WHILE less than 1500 ms have passed since the boss spawned, the boss SHALL keep its x position and SHALL NOT open any attack hitbox.
8. BOSS-08: WHILE less than 1500 ms have passed since the boss spawned, a hit on the boss SHALL leave its hp unchanged.

**Independent Test**: `waves`/`run` com rodadas 4, 5, 6 e 10 (composição da onda, abate e intermission); smoke `boss.smoke.mjs` com `?debug&seed=1&round=5` confere um único chefe, parado e invulnerável na entrada.

---

### P1: Ataques telegrafados e desviáveis ⭐ MVP

**User Story**: Como jogador, quero ver cada ataque do chefe chegando e ter como desviar, para a luta ser de habilidade e não de sorte.

**Why P1**: É o que torna a luta divertida e justa.

**Acceptance Criteria**:

1. BAT-01: WHEN the boss starts a charge THEN it SHALL spend `600 × m` ms in windup (m = phase windup multiplier) and then move toward the side where the player was at the end of the windup at 320 px/s, for at most 360 px or until it touches a wall.
2. BAT-09: WHILE the boss is moving in a charge, a heavy hitbox dealing 18 damage SHALL be open, and it SHALL be closed during the charge windup and after the movement ends.
3. BAT-02: WHEN the boss starts a leap THEN it SHALL spend `500 × m` ms in windup and then move from its x to the player's x recorded at the end of the windup in exactly 700 ms.
4. BAT-10: WHEN the boss lands from a leap THEN it SHALL open, for one frame, a heavy hitbox dealing 20 damage that covers the boss body width plus 16 px on each side.
5. BAT-03: WHEN the boss lands from a leap THEN it SHALL emit two shockwaves, one to each side, moving along the floor at 240 px/s for at most 600 px, each 20 px tall and dealing 12 damage.
6. BAT-04: WHEN the boss starts a volley THEN it SHALL spend `700 × phaseWindupMultiplier` ms in windup and then fire 3 horizontal projectiles toward the player, 150 ms apart, at 260 px/s, each dealing 10 light damage.
7. BAT-05: For every attack in every phase, the windup duration SHALL be at least 350 ms.
8. BAT-11: WHILE the boss is in a windup, the debug snapshot SHALL report `boss.state === 'windup'` and `boss.attack` as `charge`, `leap` or `volley`, and the boss SHALL play the windup animation of that attack.
9. BAT-06: WHEN a projectile or shockwave touches a wall or the player THEN it SHALL be removed in that frame.
10. BAT-12: WHEN a projectile has traveled 1200 px or a shockwave has traveled 600 px THEN it SHALL be removed.
11. BAT-07: The shockwave height (20 px) SHALL be less than the player's jump apex `jumpSpeed² / (2 × gravity)` computed from `PLAYER_MOVE` (49 px with the current tuning).
12. BAT-08: IF the player's body touches the boss body while no boss attack hitbox is open THEN the player SHALL lose 0 hp.
13. BAT-13: WHEN the player's body touches the boss body THEN the physics SHALL keep the two bodies from overlapping (the boss pushes the player).

**Independent Test**: `bossAI.test.ts` confere tempos, velocidades, alcance e danos por fase; teste de dados confere BAT-07 contra `PLAYER_MOVE`; smoke confere o preparo antes de cada hitbox e a remoção dos projéteis.

---

### P1: Fases e postura ⭐ MVP

**User Story**: Como jogador, quero que a luta mude conforme o chefe perde vida e que ser agressivo seja recompensado, para a luta ter ritmo e não ser só trocar golpes.

**Why P1**: Fases e postura são o que separa um chefe de um inimigo com muita vida.

**Acceptance Criteria**:

1. BAI-01: The boss phase SHALL be 1 while hp > 66% of maxHp, 2 while hp ≤ 66% and > 33%, and 3 while hp ≤ 33%.
2. BAI-02: WHILE in phase 1 the boss SHALL cycle charge → leap; in phase 2 charge → volley → leap; in phase 3 volley → charge → leap → charge, always starting the cycle from its first attack when the phase begins.
3. BAI-03: The phase windup multiplier `m` SHALL be 1.0 in phase 1, 0.85 in phase 2 and 0.7 in phase 3.
4. BAI-11: WHEN an attack ends THEN the boss SHALL rest for 900 ms in phase 1, 700 ms in phase 2 and 500 ms in phase 3 before starting the next attack.
5. BAI-04: WHEN the boss enters phase 2 or 3 THEN it SHALL be in the `roar` state for 900 ms and SHALL NOT attack during it.
6. BAI-12: WHILE the boss is in `roar`, a hit on the boss SHALL leave its hp unchanged.
7. BAI-13: WHEN a roar starts THEN the player SHALL receive a horizontal impulse of 6 px/step pointing away from the boss.
8. BAI-05: WHEN a hit takes the boss hp from above a phase threshold to at or below it while an attack is in windup or active THEN the boss SHALL close any open hitbox in that frame and enter `roar`, and the interrupted attack SHALL NOT resume.
9. BAI-06: Each phase transition SHALL happen at most once per boss.
10. BAI-07: WHEN the boss receives a hit THEN its poise SHALL drop by the damage (light) or twice the damage (heavy), never below 0.
11. BAI-08: WHEN the poise reaches 0 THEN the boss SHALL be staggered for 1200 ms (no movement, no attack, any open hitbox closed) and then have its poise restored to 100.
12. BAI-09: WHILE 2000 ms or more have passed since the last hit, the boss poise SHALL regenerate at 15 per second up to 100.
13. BAI-10: WHEN a light hit lands on the boss and its poise stays above 0 THEN the boss SHALL keep its current state (no hitstun).
14. BAI-14: WHEN a heavy hit lands on the living boss THEN the boss SHALL NOT enter ragdoll.

**Independent Test**: `bossAI.test.ts` com limites exatos (66%/33%, 1199/1200 ms, 1999/2000 ms, poise 0), cancelamento no meio do ataque e ciclo de padrões por fase.

---

### P1: Barra do chefe e vitória ⭐ MVP

**User Story**: Como jogador, quero ver a vida e as fases do chefe e sentir a vitória quando ele cai, para acompanhar a luta e ser recompensado.

**Why P1**: Sem barra a luta fica cega; sem recompensa a vitória fica vazia.

**Acceptance Criteria**:

1. BHUD-01: WHILE a boss is alive, the HUD SHALL show at the top center a 400 px wide bar with the boss name above it and marks at 66% and 33% of its width.
2. BHUD-02: WHEN the boss hp changes THEN the bar fill width SHALL equal `400 × hp / maxHp` px (±1 px).
3. BHUD-03: WHEN the boss dies THEN the HUD SHALL hide the bar and show the banner `Chefe derrotado!` for 2000 ms.
4. BHUD-04: WHERE the debug mode is on, the snapshot SHALL include `boss: { hp, maxHp, phase, state, attack, poise, archetype, name }` while a boss exists and `boss: null` otherwise.
5. BHUD-05: WHEN the boss spawns THEN the HUD SHALL show the banner `Chefe: <name>` for 1500 ms.
6. BWIN-01: WHEN the boss dies THEN the player SHALL heal `round(0.3 × maxHp)` hp, capped at maxHp.
7. BWIN-02: WHEN the boss dies THEN the game SHALL apply a hitstop of 250 ms.
8. BWIN-03: WHEN the boss dies THEN the game SHALL shake the camera and play a curse smoke burst at the boss position, reported as one `bossDefeatedFx` entry in the snapshot `events`.
9. BHUD-06: The fill, background, mark and name colors of the boss bar SHALL be exported as constants whose values belong to `PALETTE` (verified by a data test).
10. BHUD-07: The boss bar objects SHALL be in the main camera's ignore list, reported as `hud.bossBarIgnoredByMain: true` in the debug snapshot.

**Independent Test**: smoke `boss.smoke.mjs` derrota o chefe com golpes de teste e confere barra, faixas, cura e evento; teste de paleta em `tests/game/art.test.ts`.

---

### P2: Chefes mais duros e variados

**User Story**: Como jogador, quero que os chefes seguintes sejam mais fortes e que apareça um chefe diferente, para a run continuar surpreendendo.

**Why P2**: Dá longevidade; a primeira luta funciona sem isso.

**Acceptance Criteria**:

1. BTIER-01: WHEN a boss spawns in round `r` THEN its maxHp SHALL be `round(600 × min(1 + 0.5·(tier − 1), 4))`, where `tier = r / 5`.
2. BTIER-02: WHEN a boss spawns in round `r` THEN the damage of each of its attacks SHALL be the base damage multiplied by `min(1 + 0.15·(tier − 1), 2)`, rounded to an integer.
3. BTIER-03: For every integer tier `t` from 2 to 50, the boss hp multiplier at `t` SHALL be greater than or equal to the one at `t − 1`, and so SHALL the damage multiplier.
4. BTIER-04: The boss archetype SHALL be "Oni do Portão" at tiers 1 and 2 and, from tier 3 on, "Tecelã de Maldições" at odd tiers and "Oni do Portão" at even tiers.
5. BTIER-05: WHERE the archetype is "Tecelã de Maldições" the boss SHALL fire 5 projectiles per volley.
6. BTIER-07: WHERE the archetype is "Tecelã de Maldições" the boss projectiles SHALL move at 325 px/s (260 × 1.25).
7. BTIER-06: WHERE the archetype is "Tecelã de Maldições" the boss sprite SHALL use the same grid with a different palette mapping (no multiplicative tint).

**Independent Test**: `bossTier.test.ts` confere hp e dano nos tiers 1, 2, 3, 7 (hp no teto), 8 e 20, a monotonicidade e o arquétipo por tier; teste de arte confere o mapa de cores da Tecelã.

---

## Edge Cases

- IF the player is at the same horizontal position as the boss when a charge starts THEN the boss SHALL charge toward its current facing.
- IF the boss is staggered when a phase threshold is crossed THEN the stagger SHALL end and the roar SHALL start (roar wins).
- WHEN the boss dies during a roar or a stagger THEN it SHALL die normally (defeat effects, heal, kill counted once).
- IF a new run starts while a boss is alive (after game over) THEN the boss, its projectiles and its shockwaves SHALL be removed.
- WHEN the level has a single `E` point THEN the boss SHALL spawn at that point.
- WHEN the boss lands from a leap THEN it SHALL stand on the floor surface at or below its takeoff level (body center at `floorTop − 28` on the main floor), never on a platform above it, even if the player is under that platform.
- WHEN a boss round is cleared THEN the HUD SHALL show `Chefe derrotado!` for 2000 ms of game time (the defeat hitstop does not count) and then `Rodada N concluída` until the next round starts (BHUD-03 + RHUD-03).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| BOSS-01 | P1: Rodada de chefe | Specify | Implementing |
| BOSS-02 | P1: Rodada de chefe | Specify | Implementing |
| BOSS-03 | P1: Rodada de chefe | Specify | Implementing |
| BOSS-04 | P1: Rodada de chefe | Specify | Implementing |
| BOSS-07 | P1: Rodada de chefe | Specify | Implementing |
| BOSS-05 | P1: Rodada de chefe | Specify | Implementing |
| BOSS-06 | P1: Rodada de chefe | Specify | Implementing |
| BOSS-08 | P1: Rodada de chefe | Specify | Implementing |
| BAT-01 | P1: Ataques telegrafados | Specify | Implementing |
| BAT-09 | P1: Ataques telegrafados | Specify | Implementing |
| BAT-02 | P1: Ataques telegrafados | Specify | Implementing |
| BAT-10 | P1: Ataques telegrafados | Specify | Implementing |
| BAT-03 | P1: Ataques telegrafados | Specify | Implementing |
| BAT-04 | P1: Ataques telegrafados | Specify | Implementing |
| BAT-05 | P1: Ataques telegrafados | Specify | Implementing |
| BAT-11 | P1: Ataques telegrafados | Specify | Implementing |
| BAT-06 | P1: Ataques telegrafados | Specify | Implementing |
| BAT-12 | P1: Ataques telegrafados | Specify | Implementing |
| BAT-07 | P1: Ataques telegrafados | Specify | Implementing |
| BAT-08 | P1: Ataques telegrafados | Specify | Implementing |
| BAT-13 | P1: Ataques telegrafados | Specify | Implementing |
| BAI-01 | P1: Fases e postura | Specify | Implementing |
| BAI-02 | P1: Fases e postura | Specify | Implementing |
| BAI-03 | P1: Fases e postura | Specify | Implementing |
| BAI-11 | P1: Fases e postura | Specify | Implementing |
| BAI-04 | P1: Fases e postura | Specify | Implementing |
| BAI-13 | P1: Fases e postura | Specify | Implementing |
| BAI-12 | P1: Fases e postura | Specify | Implementing |
| BAI-05 | P1: Fases e postura | Specify | Implementing |
| BAI-06 | P1: Fases e postura | Specify | Implementing |
| BAI-07 | P1: Fases e postura | Specify | Implementing |
| BAI-08 | P1: Fases e postura | Specify | Implementing |
| BAI-09 | P1: Fases e postura | Specify | Implementing |
| BAI-10 | P1: Fases e postura | Specify | Implementing |
| BAI-14 | P1: Fases e postura | Specify | Implementing |
| BHUD-01 | P1: Barra do chefe e vitória | Specify | Implementing |
| BHUD-02 | P1: Barra do chefe e vitória | Specify | Implementing |
| BHUD-03 | P1: Barra do chefe e vitória | Specify | Implementing |
| BHUD-04 | P1: Barra do chefe e vitória | Specify | Implementing |
| BHUD-05 | P1: Barra do chefe e vitória | Specify | Implementing |
| BHUD-06 | P1: Barra do chefe e vitória | Specify | Implementing |
| BHUD-07 | P1: Barra do chefe e vitória | Specify | Implementing |
| BWIN-01 | P1: Barra do chefe e vitória | Specify | Implementing |
| BWIN-02 | P1: Barra do chefe e vitória | Specify | Implementing |
| BWIN-03 | P1: Barra do chefe e vitória | Specify | Implementing |
| BTIER-01 | P2: Chefes mais duros e variados | Specify | Implementing |
| BTIER-02 | P2: Chefes mais duros e variados | Specify | Implementing |
| BTIER-03 | P2: Chefes mais duros e variados | Specify | Implementing |
| BTIER-04 | P2: Chefes mais duros e variados | Specify | Implementing |
| BTIER-05 | P2: Chefes mais duros e variados | Specify | Implementing |
| BTIER-07 | P2: Chefes mais duros e variados | Specify | Implementing |
| BTIER-06 | P2: Chefes mais duros e variados | Specify | Implementing |

**Coverage:** 52 total, 0 mapped to tasks, 52 unmapped ⚠️ (Tasks ainda não criadas)

---

## Success Criteria

- [ ] Da rodada 1 à 5 numa run com `?debug&seed=1`, a rodada 5 traz só o chefe, e derrotá-lo leva à rodada 6.
- [ ] Nenhum ataque do chefe acerta o player sem um preparo visível de pelo menos 350 ms antes.
- [ ] `npm test`, `npm run build` e `npm run smoke` passam.
