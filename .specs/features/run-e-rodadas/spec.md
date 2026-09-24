# Run, rodadas e dificuldade progressiva — Specification

## Problem Statement

Hoje o jogo não tem começo, meio nem fim. O player morto renasce cheio (`src/game/Player.ts:189-203`), e cada inimigo morto volta ao mesmo ponto em 1,5 s (`src/scenes/TestScene.ts:135-148`). Não há objetivo, risco nem progressão, então as mecânicas roguelite pedidas (boss a cada 5 rodadas, loja, técnicas) não têm onde se encaixar.

Esta feature cria a espinha da expansão: uma run com permadeath, dividida em rodadas numeradas de inimigos que ficam mais fortes a cada rodada.

## Goals

- [ ] Uma run vai da tela de título, pelas rodadas 1, 2, 3…, até a morte do player, e termina num resumo com a rodada alcançada e os abates.
- [ ] Cada rodada termina quando todos os inimigos dela morrem, e a próxima começa sozinha após um intervalo.
- [ ] Vida, dano e velocidade dos inimigos crescem por rodada até um teto definido em `src/data/tuning.ts`.
- [ ] Toda regra de run, onda e dificuldade vive em `src/core` e é testada em Node (AD-001), com sorteio via RNG com seed (AD-006).

## Out of Scope

| Feature | Reason |
| --- | --- |
| Boss nas rodadas múltiplas de 5 | F2 (`boss-a-cada-5`); aqui a rodada 5 é uma rodada comum |
| Loja no intervalo entre rodadas | F4; aqui o intervalo só mostra a faixa e segue |
| Moeda, drops, cura ao abater, inimigos armados ou elites | F3 |
| Save persistente, recorde, meta-progressão | F6 |
| Novos tipos de inimigo ou novos mapas | Não pedido; usa o inimigo e o `LEVEL_1` atuais |
| Pausa | Não pedido |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Inimigos por rodada | `min(3 + (round − 1), 12)`: rodada 1 = 3, rodada 10 = 12, depois fica em 12 | Crescimento linear simples, com teto para não lotar a sala | n |
| Inimigos vivos ao mesmo tempo | No máximo 4; os demais ficam numa fila e entram quando um morre | O `LEVEL_1` tem espaço e só 2 pontos `E` | n |
| Onde nascem | Nos pontos `E` do mapa, em rodízio a partir de um índice sorteado pelo RNG da run; no mínimo 800 ms entre dois nascimentos no mesmo ponto | Evita inimigos sobrepostos | n |
| Curva de dificuldade | `hp × min(1 + 0,12·(r−1), 3,0)`; `dano × min(1 + 0,08·(r−1), 2,5)`; `velocidade × min(1 + 0,03·(r−1), 1,4)`, arredondando hp e dano para inteiro | Cresce sentido nas primeiras rodadas e para num teto; tudo em `tuning.ts` | n |
| Vida do player entre rodadas | Não recupera; a vida carrega de uma rodada para a outra | Risco roguelite; a cura chega em F3 (cura ao abater) e F4 (loja) | n |
| Duração do intervalo | 2500 ms entre a rodada limpa e a próxima (faixa "Rodada N concluída") | Respiro curto; F4 troca pelo estado de loja | y |
| Faixa de início | "Rodada N" no centro por 1500 ms ao começar a rodada | Feedback claro de progressão | y |
| Quando conta o abate | No evento `died` do inimigo (FND-08), não no fim da dissolução | Imediato e único por inimigo | y |
| Tela de título e game over | Desenhadas no canvas na camada de UI (AD-003); J ou Enter começa ou recomeça | Mesmo esquema de input do jogo, sem DOM | y |
| Tecla R | Continua reiniciando a cena, que volta para a tela de título | Mantém o atalho atual | y |
| Seed da run | Derivada do relógio ao começar a run; em `?debug`, `?seed=N` fixa a seed | Runs variadas no jogo e reproduzíveis no smoke | y |
| Respawn fora de run | Não existe mais: fora de run o jogo está na tela de título | Uma única forma de jogar | y |
| Graça ao nascer | 600 ms parado e sem atacar, com a fumaça amaldiçoada no ponto de spawn; pode apanhar nesse tempo | Diversão e justiça: inimigo não nasce colado batendo; o player pode punir quem acabou de entrar. Decidido pelo agente (delegação do usuário, 24/09) | y |
| Trava do game over | J/Enter ignorados nos primeiros 1000 ms do `gameOver` | J também é ataque: quem está apertando J ao morrer não pula o resumo sem querer. Decidido pelo agente | y |
| Smokes da F0 | `boot.smoke.mjs` e `enemy-died.smoke.mjs` passam a apertar J e começar a run antes das asserções de FND-08/09; as asserções continuam | O boot agora é a tela de título (RUN-01); mudança de requisito, não afrouxamento. Escolha do usuário | y |

Os itens com `n` são números de balanceamento que o usuário pode trocar sem mudar os ACs, porque todos vivem em `tuning.ts`.

**Open questions:** none - all resolved or logged above.

**Implicit-requirement dimensions sweep:**
- Input validation & bounds: coberta por DIF-01, DIF-05 e DIF-06 (teto dos multiplicadores), WAVE-01 (teto de 12 por rodada) e WAVE-03 (teto de 4 vivos).
- Failure / partial-failure states: coberta por RUN-07 (evento fora de hora ignorado); não há I/O.
- Idempotency / retry / duplicate handling: coberta por WAVE-06 (abate contado uma vez) e RUN-06 (rodada limpa uma vez).
- Auth boundaries & rate limits: N/A because é um jogo local sem usuários.
- Concurrency / ordering: coberta por WAVE-08 (duas mortes no mesmo frame); o jogo roda num único thread.
- Data lifecycle / expiry: coberta por RUN-05 (nova run zera rodada, abates e vida); nada é salvo (F6).
- Observability: coberta por RUN-09 (estado da run no `window.__game` em `?debug`).
- External-dependency failure: N/A because nenhum recurso externo é usado.
- State-transition integrity: coberta por RUN-01..RUN-08 e RUN-10.

---

## User Stories

### P1: Run com permadeath ⭐ MVP

**User Story**: Como jogador, quero começar uma run, lutar até morrer e ver até onde cheguei, para ter um objetivo e um motivo para tentar de novo.

**Why P1**: Sem run não existe roguelite; as outras stories e features se apoiam nesta máquina de estados.

**Acceptance Criteria**:

1. RUN-01: WHEN the game boots THEN the run SHALL be in the `title` state with no enemies spawned.
2. RUN-02: WHEN the player presses J or Enter in the `title` state THEN the run SHALL enter `roundActive` with round 1, kills 0 and the player at full hp at the level spawn.
3. RUN-03: WHILE the run is in `roundActive` or `intermission`, the player's `Health` SHALL NOT respawn after dying.
4. RUN-04: WHEN the player dies in `roundActive` THEN the run SHALL enter `gameOver` and record the current round and total kills as the summary.
5. RUN-05: WHEN the player presses J or Enter in `gameOver` THEN the run SHALL start a new run with round 1, kills 0 and full hp.
6. RUN-06: WHEN the last enemy of the round dies THEN the run SHALL enter `intermission` exactly once for that round.
7. RUN-10: WHEN 2500 ms have elapsed in `intermission` for round N THEN the run SHALL enter `roundActive` with round N + 1.
8. RUN-11: IF J or Enter is pressed less than 1000 ms after the run entered `gameOver` THEN the run SHALL stay in `gameOver` with the same summary.
9. RUN-07: IF an event arrives that the current state does not accept (enemy death in `title`, `intermission` or `gameOver`; start input in `roundActive` or `intermission`) THEN the run SHALL keep its state, round and kills unchanged.
10. RUN-08: WHILE the run is in `title` or `gameOver`, the player SHALL ignore the left, right, jump, attack and interact inputs (position, velocity and combo state stay unchanged).
11. RUN-09: WHERE the debug mode is on, `window.__game.snapshot()` SHALL include `run: { state, round, kills, alive, queued }`.

**Independent Test**: testes do `run.test.ts` para as transições; smoke `run-loop.smoke.mjs` com `?debug&seed=1`: começa a run, mata os inimigos da rodada 1 via `step`, vê `round: 2`, zera a vida do player e vê `gameOver`.

---

### P1: Ondas de inimigos por rodada ⭐ MVP

**User Story**: Como jogador, quero que cada rodada traga um número definido de inimigos, que vão entrando na sala, para lutar ondas cada vez maiores.

**Why P1**: É o conteúdo da rodada; sem ondas a run não avança.

**Acceptance Criteria**:

1. WAVE-01: The wave for round `r` SHALL contain `min(3 + (r − 1), 12)` enemies.
2. WAVE-02: WHEN the wave spawns the k-th enemy of a round (k = 0, 1, 2, …) THEN it SHALL place it at spawn point index `(s + k) mod P`, where P is the number of `E` points of the level and `s` is an integer in [0, P − 1] drawn once per round from the run's `Rng`.
3. WAVE-03: WHILE 4 enemies of the round are alive, the wave SHALL spawn no further enemy.
4. WAVE-04: WHILE fewer than 4 enemies of the round are alive and the queue is not empty, the wave SHALL spawn the next queued enemy at the first moment when at least 800 ms have passed since the previous spawn at that enemy's spawn point (from WAVE-02).
5. WAVE-05: WHILE a run is active, a dead enemy SHALL NOT respawn at its point (the old 1500 ms respawn is off).
6. WAVE-06: IF the same enemy is reported dead more than once THEN the wave SHALL count it exactly once in `kills` and in the round's remaining count.
7. WAVE-08: WHEN two different enemies die in the same frame THEN the wave SHALL add 2 to `kills` and subtract 2 from the round's remaining count.
8. WAVE-07: WHEN two runs start with the same seed THEN their waves SHALL produce the same sequence of `(spawn time in ms, spawn point index)` pairs for every round, given the same sequence of enemy deaths.
9. WAVE-09: WHILE less than 600 ms have passed since an enemy spawned, that enemy SHALL NOT start a windup or an attack and SHALL stand still (it can still be hit).

**Independent Test**: `waves.test.ts` com `Rng` de seed fixa: contagens das rodadas 1, 5, 10 e 20; rodízio de pontos; fila com teto 4; espera de 800 ms; morte duplicada.

---

### P1: Dificuldade progressiva ⭐ MVP

**User Story**: Como jogador, quero que os inimigos fiquem mais resistentes, fortes e rápidos a cada rodada, para a run ficar mais difícil conforme avanço.

**Why P1**: Pedido explícito ("o jogo vai ficando mais difícil"); sem isso as rodadas se repetem.

**Acceptance Criteria**:

1. DIF-01: WHEN the scaling is computed for round `r` THEN its enemy `maxHp` SHALL be `round(60 × min(1 + 0.12·(r − 1), 3.0))`.
2. DIF-05: WHEN the scaling is computed for round `r` THEN its enemy attack damage SHALL be `round(12 × min(1 + 0.08·(r − 1), 2.5))`.
3. DIF-06: WHEN the scaling is computed for round `r` THEN its enemy patrol speed and chase speed SHALL each be the base value from `src/data/tuning.ts` multiplied by `min(1 + 0.03·(r − 1), 1.4)`.
4. DIF-02: For every integer round `r` from 2 to 100, each of the three multipliers SHALL be greater than or equal to its value at round `r − 1`.
5. DIF-03: IF the scaling is asked for a round below 1 or not an integer THEN it SHALL return the round-1 values.
6. DIF-04: WHEN an enemy spawns in round `r` THEN its `maxHp`, attack damage and speeds SHALL equal the values of DIF-01, DIF-05 and DIF-06 for `r`, observable as `enemies[i].maxHp` and `enemies[i].damage` in the debug snapshot.

**Independent Test**: `difficulty.test.ts` confere os valores exatos nas rodadas 1, 2, 10, 15 (velocidade no teto), 18 (hp no teto), 20 (dano no teto) e 0/−3/2.5 (tratadas como 1); smoke confere `hp` do inimigo da rodada 2 no snapshot.

---

### P2: HUD da run

**User Story**: Como jogador, quero ver em que rodada estou e quantos inimigos faltam, para saber meu progresso.

**Why P2**: Melhora a leitura, mas a run funciona sem isso.

**Acceptance Criteria**:

1. RHUD-01: WHILE the run is in `roundActive`, the HUD SHALL show `Rodada N` and `Inimigos: K`, where K is alive plus queued enemies of the round.
2. RHUD-02: WHEN a round starts THEN the HUD SHALL show the banner `Rodada N` centered on the 960×540 screen for 1500 ms and then hide it.
3. RHUD-03: WHEN the run enters `intermission` THEN the HUD SHALL show `Rodada N concluída` until the next round starts.
4. RHUD-04: The text and fill colors of the HUD elements of this feature SHALL be colors of the game palette (AD-002).
5. RHUD-07: The HUD elements of this feature SHALL be in the main camera's ignore list (AD-003), reported as `hud.ignoredByMain: true` in the debug snapshot.
6. RHUD-08: WHEN an enemy spawns THEN the game SHALL play the curse smoke burst at its spawn point, reported as one `spawnFx:<enemyId>` entry in the debug snapshot `events`.

**Independent Test**: smoke confere os textos do HUD pelo snapshot de debug; teste de paleta em `tests/game/art.test.ts` para as novas cores.

---

### P2: Telas de título e game over

**User Story**: Como jogador, quero uma tela para começar e uma tela de fim com meu resultado, para entender o começo e o fim da run.

**Why P2**: Dá forma à run; o loop do P1 pode ser demonstrado com uma tela mínima.

**Acceptance Criteria**:

1. RHUD-05: WHILE the run is in `title`, the screen SHALL show the game name and `J / Enter para começar`.
2. RHUD-06: WHILE the run is in `gameOver`, the screen SHALL show `Rodada alcançada: N`, `Abates: K` and `J / Enter para tentar de novo`.

**Independent Test**: smoke confere o estado e os textos visíveis em `title` e em `gameOver`.

---

## Edge Cases

- IF the player dies in the same frame the last enemy dies THEN the run SHALL enter `gameOver` and not `intermission` (a morte do player tem prioridade).
- IF the player dies during `intermission` (e.g. by a hazard) THEN the run SHALL enter `gameOver` with the round just cleared as the summary.
- WHEN round 10 or later starts THEN the wave SHALL contain exactly 12 enemies.
- WHEN the level has a single `E` point THEN every enemy SHALL spawn at that point, respecting the 800 ms gap.
- IF the level has no `E` point THEN the run SHALL throw an error at level load naming the level (dado de mapa inválido, falha de desenvolvimento).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| RUN-01 | P1: Run com permadeath | Specify | Pending |
| RUN-02 | P1: Run com permadeath | Specify | Pending |
| RUN-03 | P1: Run com permadeath | Specify | Pending |
| RUN-04 | P1: Run com permadeath | Specify | Pending |
| RUN-05 | P1: Run com permadeath | Specify | Pending |
| RUN-06 | P1: Run com permadeath | Specify | Pending |
| RUN-07 | P1: Run com permadeath | Specify | Pending |
| RUN-08 | P1: Run com permadeath | Specify | Pending |
| RUN-09 | P1: Run com permadeath | Specify | Pending |
| RUN-10 | P1: Run com permadeath | Specify | Pending |
| RUN-11 | P1: Run com permadeath | Specify | Pending |
| WAVE-01 | P1: Ondas de inimigos | Specify | Pending |
| WAVE-02 | P1: Ondas de inimigos | Specify | Pending |
| WAVE-03 | P1: Ondas de inimigos | Specify | Pending |
| WAVE-04 | P1: Ondas de inimigos | Specify | Pending |
| WAVE-05 | P1: Ondas de inimigos | Specify | Pending |
| WAVE-06 | P1: Ondas de inimigos | Specify | Pending |
| WAVE-07 | P1: Ondas de inimigos | Specify | Pending |
| WAVE-08 | P1: Ondas de inimigos | Specify | Pending |
| WAVE-09 | P1: Ondas de inimigos | Specify | Pending |
| DIF-01 | P1: Dificuldade progressiva | Specify | Pending |
| DIF-02 | P1: Dificuldade progressiva | Specify | Pending |
| DIF-03 | P1: Dificuldade progressiva | Specify | Pending |
| DIF-04 | P1: Dificuldade progressiva | Specify | Pending |
| DIF-05 | P1: Dificuldade progressiva | Specify | Pending |
| DIF-06 | P1: Dificuldade progressiva | Specify | Pending |
| RHUD-01 | P2: HUD da run | Specify | Pending |
| RHUD-02 | P2: HUD da run | Specify | Pending |
| RHUD-03 | P2: HUD da run | Specify | Pending |
| RHUD-04 | P2: HUD da run | Specify | Pending |
| RHUD-05 | P2: Telas de título e game over | Specify | Pending |
| RHUD-06 | P2: Telas de título e game over | Specify | Pending |
| RHUD-07 | P2: HUD da run | Specify | Pending |
| RHUD-08 | P2: HUD da run | Specify | Pending |

**Coverage:** 34 total, 0 mapped to tasks, 34 unmapped ⚠️ (Tasks ainda não criadas)

---

## Success Criteria

- [ ] Uma run completa (título → rodadas → morte → resumo → nova run) é jogável sem recarregar a página.
- [ ] Na rodada 5, os inimigos têm 89 de hp e 16 de dano (valores de DIF-01), visíveis no snapshot de debug.
- [ ] `npm test`, `npm run build` e `npm run smoke` passam.
