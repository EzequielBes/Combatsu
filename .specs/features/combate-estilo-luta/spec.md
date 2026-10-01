# Combate estilo luta — Specification

## Problem Statement

Hoje o corpo a corpo é um combo linear de um botão (soco, soco, chute) e não há defesa: o jogador só bate e apanha. Falta a profundidade de um jogo de luta — escolher o golpe, encadear sequências com dois botões e direção, e principalmente ler o inimigo para defender, esquivar ou devolver o golpe.

Esta feature transforma o combate num sistema inspirado em Sifu: **golpes leve e forte com sequências, direcionais, carregado e aéreos** num grafo dirigido por dados; **guarda, parry e esquiva** com janelas de habilidade; e uma **barra de estrutura** (postura) que enche ao defender e ao ser pressionado, cuja quebra abre um **finalizador**. Absorve as antigas F7 (moveset e voadora) e F8 (combos e estilo) do roadmap.

## Goals

- [ ] O jogador tem pelo menos 14 golpes distintos acessíveis por combinações de `J`/`K`, direção, tecla segurada e estar no ar, todos definidos em dados.
- [ ] Guarda, parry e esquiva mudam o resultado de um golpe inimigo de forma visível e verificável; o parry e a esquiva perfeita exigem timing.
- [ ] Pressionar o inimigo (parry, golpes fortes) enche a estrutura dele até quebrar e liberar um finalizador; defender demais quebra a guarda do jogador.
- [ ] Toda regra (grafo de golpes, janelas, estrutura, contador) vive em `src/core`/`src/data` e é testada em Node (AD-001); o jogo existente (objetos na mão, técnicas, Kokusen, energia) continua funcionando.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Kokusen no finalizador do combo (antiga F8) | Fica para uma feature de polimento depois; a regra de timing já existe na F5 |
| Técnicas avançadas (Roxo, Domínio) | F9 |
| Inimigos com parry ou esquiva | Muda a leitura das ondas; só o bloqueio (EBL) entra aqui |
| Remapear teclas pelo jogador | Tela de opções fica para depois; os números moram em `src/data` |
| Controle (gamepad) | Sem suporte no projeto hoje |
| Som dos golpes e do parry | Sem assets |

---

## Assumptions & Open Questions

Decisões tomadas pelo agente por delegação do usuário ("decidir seguindo a própria recomendação, com foco em diversão"; pedido de 28/09: "mecânicas inspiradas em Sifu… combate fluido que exige habilidade, várias variações de golpes e combos com mais botões, defesa, esquiva, parry"). Números em `src/data/moves.ts` e `src/data/tuning.ts` (`DEFENSE`, `STRUCTURE`).

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Teclas | `J`/`X` leve, `K`/`Z` forte, `U`/`Shift` guarda e parry, `Q` esquiva, `E` pegar/arremessar (e `S`+`E` largar); técnicas seguem em `L`/`C` e `I`/`V` | Mão direita ataca e defende (`J K U`), mão esquerda move e esquiva; `K` deixa de ser "pegar" para virar o forte | y |
| Sequências no chão | `J` jab → `J` direto → `J` gancho → `J` cotovelada; `K` chute frontal → `K` chute alto; `J`,`K` joelhada; `J`,`J`,`K` chute giratório | Quatro leves rápidos, forte lento; misturar abre golpes próprios | y |
| Direcionais | `S`+`J` soco baixo; `S`+`K` rasteira (derruba); `W`+`J` gancho ascendente (lança); frente+`K` chute empurrão | Direção + botão como em jogo de luta | y |
| Carregado | `K` sempre sai o chute frontal na hora; continuar segurando `K` ≥ 400 ms desde o aperto e soltar dispara o chute carregado logo que o golpe atual acaba; não pode ser bloqueado | Sem atraso no `K` comum (decidir na soltura atrasaria 400 ms); carregar é uma escolha de manter a tecla | y |
| Aéreos | No ar: `J` soco aéreo; `K` voadora (avança na diagonal para baixo); `S`+`K` pisão | "Voadora" pedida no roadmap | y |
| Encadear | Próximo golpe aceito do início da `recovery` até 260 ms depois dela (janela atual); um aperto antecipado fica no buffer | Mantém o ritmo que o jogador já conhece | y |
| Guarda | Segurar `U`: golpes frontais de inimigo comum causam 0 de dano; do chefe, 25%; andar a 40% da velocidade; não bloqueia golpe pelas costas nem imbloqueável | Defesa confiável mas com custo (estrutura) | y |
| Parry | Apertar `U` abre uma janela de 150 ms; golpe inimigo que conectar nela é anulado; apertar de novo antes de 300 ms do último aperto não abre janela nova | Timing exigente, sem spam | y |
| Recompensa do parry | 0 de dano, +35 de estrutura no atacante, atacante desequilibrado 400 ms, hitstop 80 ms | Abre o contra-ataque, como em Sifu | y |
| Esquiva | `Q`: dash de 96 px em 200 ms na direção segurada (sem direção: para trás); invencível de 0 a 180 ms; recarga 450 ms; no ar não | Sai de perigo com risco de errar o tempo | y |
| Esquiva perfeita | Golpe inimigo que teria acertado durante a invencibilidade → câmera lenta 0,3× por 400 ms reais e o próximo golpe do jogador em até 1000 ms causa +50% | Recompensa o timing com "momento" | y |
| Estrutura do inimigo comum | Máx. 100; +4 por golpe leve recebido, +10 por forte, +40 pelo carregado, +20 extra pela joelhada, +35 por parry sofrido; cai 10/s depois de 1500 ms sem subir | Pressão constante quebra a guarda | y |
| Quebra do inimigo | Estrutura cheia: atordoado 1500 ms com marcador; `J`+`K` juntos a ≤ 40 px durante o atordoamento: finalizador de 40 de dano | O "takedown" de Sifu | y |
| Estrutura do jogador | Máx. 100; +15 por golpe comum bloqueado, +25 por golpe do chefe bloqueado; cai 20/s depois de 1000 ms sem bloquear; cheia: guarda quebrada, jogador atordoado 800 ms | Não dá para só segurar guarda | y |
| Chefe | Parry reduz o poise existente (F2) em 30; guarda do jogador contra o chefe usa a regra de 25% | Reusa o sistema do chefe em vez de criar outro | y |
| Inimigo bloqueia (P2) | Inimigo comum parado de frente, ao ver o jogador iniciar um golpe leve, levanta guarda com chance `min(0,1 + 0,03·(r−1), 0,4)` por 600 ms; bloqueia leves (0 de dano, +8 de estrutura), fortes quebram na hora | Obriga a misturar leve e forte | y |
| Contador de combo (P2) | Conta golpes acertados sem o jogador levar dano e sem passar 1500 ms entre acertos; nota por golpes distintos na sequência: 1–2 D, 3 C, 4 B, 5 A, 6+ S | Premia variedade, não repetição | y |
| Cancelamento (P2) | Golpe que conectou pode ser cancelado na `recovery` por esquiva ou técnica (a técnica já faz, CAST-10) | Fluidez | y |
| Entrada de meia-lua (P3) | `S`, frente, `J` em até 300 ms: palma explosiva (20, forte, empurra 200 px) | Um especial de jogo de luta | y |

**Open questions:** none - all resolved or logged above.

**Implicit-requirement dimensions sweep:**
- State-transition integrity: coberta por MOV-02/03 (grafo e janela), GRD-01..05 (guarda), PAR-01..06 (janela e recarga do parry), DOD-01..06 (esquiva e recarga), STR-05/STR-08 (quebra e recuperação).
- Input validation & bounds: coberta por STR-01/STR-06 (estrutura entre 0 e o máximo), PAR-04 (anti-spam), DOD-04 (recarga).
- Failure / partial-failure states: coberta por GRD-03 (golpe pelas costas), GRD-04 (imbloqueável), PAR-05 (parry errado não protege), DOD-05 (esquiva no ar recusada).
- Idempotency / duplicate handling: coberta por PAR-03 (um golpe anulado uma vez), FIN-03 (um finalizador por quebra).
- Auth boundaries & rate limits: N/A because é um jogo local; o "limite" é a recarga da esquiva e do parry.
- Concurrency / ordering: coberta por CTL-04 (`J`+`K` juntos) e MOV-09 (tecla segurada × apertada).
- Data lifecycle / expiry: coberta por STR-04/STR-07 (queda da estrutura) e CMB-02 (combo expira).
- Observability: coberta por CTL-05 e pelos campos novos do snapshot e `events`.
- External-dependency failure: N/A because nenhum recurso externo é usado.

---

## Snapshot de debug (contrato usado pelos ACs)

```ts
// `player` ganha:
move: string | null;                 // nome do golpe em curso (ex.: 'jab', 'rasteira')
guard: 'none' | 'guard' | 'parry';   // 'parry' = janela de parry aberta
structure: { cur: number; max: number; broken: boolean };
dodge: { active: boolean; invulnerable: boolean; cooldownMs: number };
// cada item de `enemies` ganha:
structure: { cur: number; max: number; broken: boolean };
guarding: boolean;
// novo, na raiz:
combo: { hits: number; grade: 'D' | 'C' | 'B' | 'A' | 'S' | null };
timeScale: number;                   // 1, ou 0.3 na câmera lenta da esquiva perfeita
```

Eventos novos em `events`: `move:<nome>`, `block`, `parry`, `guardBreak:player`, `guardBreak:<enemyId>`, `finisher:<enemyId>`, `dodge`, `perfectDodge`, `enemyBlock:<enemyId>`.

---

## Glossário

- **light press**: aperto de `J` ou `X` lido com JustDown no frame (golpe leve).
- **heavy press**: aperto de `K` ou `Z` lido com JustDown no frame (golpe forte).
- **both press**: `J` e `K` apertados no mesmo frame.
- **move**: golpe corpo a corpo do jogador, uma entrada do grafo em `src/data/moves.ts`, com startup, active (hitbox ligada) e recovery.
- **recovery**: fase final do golpe, depois que a hitbox desliga.
- **no move in progress**: nenhum golpe em startup, active ou recovery.
- **follow-up**: golpe que pode seguir o atual no grafo.
- **guard**: estado de defesa enquanto a tecla de guarda está segurada.
- **parry window**: 150 ms depois de apertar a guarda em que um golpe inimigo é anulado.
- **structure**: barra de postura de 0 a 100 do jogador e de cada inimigo comum.
- **broken**: estrutura cheia; o dono fica atordoado.
- **dodge**: dash curto com invencibilidade.
- **hit reaches the player**: a hitbox de um ataque inimigo toca o corpo do jogador.
- **from the front**: o atacante está do lado para onde o jogador está virado.
- **within reach of a prop**: o corpo do objeto a no máximo 36 px do centro do jogador (regra atual de pegar).
- **regular enemy**: inimigo comum das ondas (não o chefe).
- **timeScale**: escala de tempo da cena (1 normal).

## User Stories

### P1: Controles de luta ⭐ MVP

**User Story**: Como jogador, quero um botão de golpe leve, um de forte, um de defesa e um de esquiva, para lutar como num jogo de luta.

**Why P1**: Toda a feature depende das teclas novas.

**Acceptance Criteria**:

1. CTL-01: WHEN `J` or `X` is pressed THEN the input snapshot SHALL report a light press in that frame.
2. CTL-02: WHEN `K` or `Z` is pressed THEN the input snapshot SHALL report a heavy press in that frame.
3. CTL-03: WHEN `E` is pressed with free hands and a prop within reach THEN the player SHALL hold that prop.
4. CTL-07: WHEN `E` is pressed while holding a prop and `S` is not held THEN the prop SHALL leave the hands in the `thrown` state.
5. CTL-08: WHEN `E` is pressed while holding a prop and `S` is held THEN the player SHALL drop it.
6. CTL-04: WHEN `J` and `K` are pressed in the same frame THEN the input snapshot SHALL report one `both` press and no separate light or heavy press.
7. CTL-05: WHERE the debug mode is on, the snapshot SHALL include the `player.move`, `player.guard`, `player.structure`, `player.dodge`, `enemies[].structure`, `enemies[].guarding`, `combo` and `timeScale` fields of the contract above.
8. CTL-06: The on-screen controls panel SHALL list `J leve · K forte · U guarda/parry · Q esquiva · E pegar`.
9. CTL-09: WHILE `player.guard` is `guard` or `parry`, the player sprite SHALL show the `guard` frame.

**Independent Test**: `input.test.ts` (pura: leitura de teclas → snapshot de input); smoke `combat.smoke.mjs` confere `E` com a cadeira e o painel.

---

### P1: Grafo de golpes ⭐ MVP

**User Story**: Como jogador, quero combinar leve, forte e direção em sequências diferentes, para ter muitos golpes e escolher o certo para cada situação.

**Why P1**: É o coração do "jogo de luta".

**Direção de arte e feel**: cada golpe tem pose própria (preparo, impacto, retorno); fortes têm tremida e faísca grande; a rasteira derruba o inimigo de costas; o gancho ascendente levanta o inimigo; o chute carregado pisca branco enquanto carrega.

**Acceptance Criteria**:

1. MOV-01: The move graph SHALL be data in `src/data/moves.ts`, where each move has name, damage, strength, force, startup, active and recovery times, hitbox, the input that starts it and the moves that can follow it.
2. MOV-02: WHEN a light press happens with no move in progress on the ground THEN the move `jab` SHALL start.
3. MOV-03: WHEN a press matching a follow-up of the current move happens between the start of its recovery and 260 ms after the recovery ends THEN that follow-up SHALL start at the end of the recovery.
4. MOV-04: The ground follow-ups SHALL be: `jab`→J→`direto`→J→`gancho`→J→`cotovelada`; `chuteFrontal`→K→`chuteAlto`; `jab`→K→`joelhada`; `direto`→K→`chuteGiratorio`.
5. MOV-05: WHEN a heavy press happens with no move in progress on the ground THEN the move `chuteFrontal` SHALL start.
6. MOV-06: WHEN a light press happens while `S` is held on the ground with no move in progress THEN `socoBaixo` SHALL start.
7. MOV-17: WHEN a heavy press happens while `S` is held on the ground with no move in progress THEN `rasteira` SHALL start.
8. MOV-07: WHEN a light press happens while `W` is held on the ground with no move in progress THEN `ganchoAscendente` SHALL start.
9. MOV-08: WHEN a heavy press happens while the direction the player faces is held on the ground with no move in progress THEN `chuteEmpurrao` SHALL start.
10. MOV-09: WHEN `K` is released after being held for at least 400 ms since its press THEN `chuteCarregado` SHALL start as soon as the current move ends.
11. MOV-16: IF `K` is released before 400 ms since its press THEN no `chuteCarregado` SHALL start.
12. MOV-10: WHEN `rasteira` hits a regular enemy that survives THEN the enemy SHALL be knocked down for 900 ms.
13. MOV-11: WHEN `ganchoAscendente` hits a regular enemy that survives THEN the enemy SHALL receive an upward impulse that lifts its center at least 64 px.
14. MOV-12: The damage and strength of each ground move SHALL be: `jab` 6 light, `direto` 7 light, `gancho` 9 light, `cotovelada` 14 heavy, `chuteFrontal` 12 heavy, `chuteAlto` 14 heavy, `joelhada` 12 heavy, `chuteGiratorio` 18 heavy, `socoBaixo` 6 light, `rasteira` 10 heavy, `ganchoAscendente` 10 heavy, `chuteEmpurrao` 12 heavy, `chuteCarregado` 24 heavy.
15. MOV-13: WHEN a move starts THEN `events` SHALL get exactly one `move:<name>` with its name.
16. MOV-18: WHILE a move is in progress, `player.move` SHALL be its name, and `null` while no move is in progress.
17. MOV-14: The player sheet SHALL contain the frames `<move>-wind`, `<move>-hit` and `<move>-recover` for every ground and air move, each 32×24 texels with only `PALETTE` keys (data test).
18. MOV-15: WHEN a move deals damage to a target THEN the damage SHALL pass through `modifiers.meleeDamage` (F4) and give the +3 cursed energy of CE-06 (F5).

**Independent Test**: `moveGraph.test.ts` em Node (cada entrada → golpe, cada sequência, janela 260/261 ms, carregado 399/400 ms, sem golpe em andamento); teste de dados de `moves.ts` e dos frames; smoke confere `move:*` nas sequências e o derrubar/lançar.

---

### P1: Guarda ⭐ MVP

**User Story**: Como jogador, quero segurar a guarda para aguentar os golpes, para sobreviver quando não dá para atacar.

**Why P1**: Defesa básica.

**Direção de arte e feel**: pose de guarda com os braços cruzados; golpe bloqueado solta faísca azul pequena e empurra o jogador 8 px.

**Acceptance Criteria**:

1. GRD-01: WHILE `U` or `Shift` is held on the ground and no move, dodge or cast is in progress, `player.guard` SHALL be `guard` (or `parry` during the parry window).
2. GRD-02: WHEN a regular enemy hit reaches the player from the front while `player.guard` is `guard` THEN the player SHALL take 0 damage.
3. GRD-07: WHEN a hit is blocked by the guard THEN `events` SHALL get exactly one `block`.
4. GRD-06: WHEN a boss hit reaches the player from the front while `player.guard` is `guard` THEN the player SHALL take `round(damage × 0.25)`.
5. GRD-03: IF a regular enemy hit reaches the guarding player while the attacker center x is on the side opposite to the player facing THEN the player SHALL take exactly the hit damage.
6. GRD-04: IF the hit is marked unblockable THEN the guard SHALL NOT reduce its damage.
7. GRD-05: WHILE guarding, the player run speed SHALL be 40% of the normal run speed.
8. GRD-08: WHEN a hit is blocked THEN `fx.layers` SHALL include `guard.spark` in that frame.
9. GRD-09: WHEN a hit is blocked THEN the player SHALL be pushed 8 px (±2 px) away from the attacker.

**Independent Test**: `defense.test.ts` em Node (frente/costas, comum/chefe, imbloqueável); smoke com um inimigo atacando o jogador em guarda confere hp e `block`.

---

### P1: Parry ⭐ MVP

**User Story**: Como jogador, quero apertar a defesa no tempo certo para anular o golpe e desequilibrar o inimigo, para ser recompensado por ler o combate.

**Why P1**: É a mecânica de habilidade central de Sifu.

**Direção de arte e feel**: flash branco em estrela no ponto do golpe, hitstop de 80 ms, o inimigo recua cambaleando; um anel dourado curto confirma o parry.

**Acceptance Criteria**:

1. PAR-01: WHEN `U` or `Shift` is pressed and at least 300 ms have passed since the previous press THEN a parry window of 150 ms SHALL open (`player.guard` = `parry`).
2. PAR-02: WHEN an enemy or boss hit reaches the player during an open parry window THEN the player SHALL take 0 damage.
3. PAR-09: WHEN a hit is parried THEN `events` SHALL get exactly one `parry`.
4. PAR-03: WHEN a regular enemy hit is parried THEN that enemy structure SHALL increase by 35, capped at 100.
5. PAR-10: WHEN a regular enemy hit is parried THEN that enemy SHALL neither attack nor move for 400 ms.
6. PAR-07: WHEN a boss hit is parried THEN the boss poise SHALL decrease by 30, never below 0.
7. PAR-08: WHEN a hit is parried THEN the game SHALL apply a hitstop of 80 ms.
8. PAR-04: IF `U` or `Shift` is pressed less than 300 ms after the previous press THEN no parry window SHALL open.
9. PAR-05: IF a regular enemy hit reaches the player after the parry window closed while `U` or `Shift` is still held and the attacker is in front THEN the player SHALL take 0 damage (normal guard, GRD-02).
10. PAR-06: WHEN a hit is parried THEN the player structure SHALL NOT increase.
11. PAR-11: WHEN a hit is parried THEN `fx.layers` SHALL include `parry.flash` and `parry.ring` in that frame.

**Independent Test**: `defense.test.ts` (janela 149/150 ms, anti-spam 299/300 ms, estrutura do atacante, poise do chefe); smoke aperta `U` 60 ms antes do golpe do inimigo e confere `parry`, hp intacto e estrutura do inimigo.

---

### P1: Esquiva ⭐ MVP

**User Story**: Como jogador, quero esquivar com um dash rápido, e ser recompensado quando esquivo no último instante, para ter uma defesa ativa e estilosa.

**Why P1**: Terceiro pilar da defesa de Sifu.

**Direção de arte e feel**: rastro de imagens do jogador; na esquiva perfeita, o mundo fica em câmera lenta com um tom azulado e um "tique" branco no jogador.

**Acceptance Criteria**:

1. DOD-01: WHEN `Q` is pressed on the ground with no dodge cooldown and no move or cast in progress THEN the player SHALL move 96 px (±4 px) in 200 ms toward the held horizontal direction, or away from the facing direction if none is held.
2. DOD-09: WHEN a dodge starts THEN `events` SHALL get exactly one `dodge`.
3. DOD-02: WHILE the dodge time is between 0 and 180 ms, the player SHALL take no damage from any hit.
4. DOD-03: WHEN a hit reaches the player while it is invulnerable by DOD-02 THEN `events` SHALL get exactly one `perfectDodge` for that dodge.
5. DOD-07: WHEN a perfect dodge happens THEN `timeScale` SHALL be 0.3 for 400 ms of real time and then return to 1.
6. DOD-08: WHEN the player hits a target within 1000 ms after a perfect dodge THEN that hit damage SHALL be multiplied by 1.5 (rounded, halves up), once.
7. DOD-04: WHEN a dodge starts THEN its cooldown SHALL be 450 ms.
8. DOD-10: IF `Q` is pressed while the dodge cooldown is above 0 THEN no dodge SHALL start.
9. DOD-05: IF `Q` is pressed in the air THEN no dodge SHALL start.
10. DOD-06: WHEN a move that already hit a target is in its recovery and `Q` is pressed with no dodge cooldown THEN the move SHALL end and the dodge SHALL start in that frame.
11. DOD-11: WHILE a dodge is active, `fx.layers` SHALL include `dodge.trail`.
12. DOD-12: WHILE `timeScale` is 0.3, `fx.layers` SHALL include `dodge.slowTint`.

**Independent Test**: `defense.test.ts` (distância e tempo, 179/180 ms de invencibilidade, 449/450 ms de recarga, perfeita uma vez, bônus uma vez); smoke esquiva através do golpe do inimigo e confere `perfectDodge`, `timeScale` e hp.

---

### P1: Estrutura e finalizador ⭐ MVP

**User Story**: Como jogador, quero pressionar o inimigo até a guarda dele quebrar e finalizá-lo com um golpe especial, e ser punido se só ficar na defesa, para o combate ter ritmo de ataque e defesa.

**Why P1**: É o que dá objetivo ao parry e aos golpes fortes.

**Direção de arte e feel**: barra de estrutura amarela sob a barra de vida de cada inimigo e sob a do jogador; quebra = a barra estoura, ícone de estrela girando sobre a cabeça; o finalizador congela 150 ms, mostra um corte de câmera (zoom 1,7) e arremessa o inimigo.

**Acceptance Criteria**:

1. STR-01: Every regular enemy and the player SHALL have a structure between 0 and 100.
2. STR-02: WHEN a regular enemy takes a light hit, a heavy hit, the `chuteCarregado` or the `joelhada` THEN its structure SHALL increase by 4, 10, 40 or 30 (10 + 20), respectively, capped at 100.
3. STR-03: WHEN a player hit is blocked by the player guard THEN the player structure SHALL increase by 15 for a regular enemy hit and 25 for a boss hit, capped at 100.
4. STR-04: WHEN 1500 ms of game time pass since an enemy structure last increased THEN that structure SHALL decrease by 10 per second of game time, stopping at 0.
5. STR-07: WHEN 1000 ms of game time pass since the player last blocked a hit THEN the player structure SHALL decrease by 20 per second of game time, stopping at 0.
6. STR-05: WHEN a regular enemy structure reaches 100 THEN it SHALL be broken and stunned (no attack, no movement) for 1500 ms.
7. STR-10: WHEN a regular enemy structure reaches 100 THEN `events` SHALL get exactly one `guardBreak:<id>`.
8. STR-06: WHEN the player structure reaches 100 THEN the player SHALL be stunned for 800 ms, ignoring input.
9. STR-11: WHEN the player structure reaches 100 THEN `events` SHALL get exactly one `guardBreak:player`.
10. STR-08: WHEN a stun from STR-05 or STR-06 ends THEN that structure SHALL be 0 and not broken.
11. FIN-01: WHEN a `both` press (CTL-04) happens within 40 px of a broken regular enemy THEN the finisher SHALL hit that enemy for 40 damage and `events` SHALL get `finisher:<id>`.
12. FIN-02: WHEN the finisher hits THEN the game SHALL apply a hitstop of 150 ms.
13. FIN-04: WHEN the finisher hits THEN the main camera zoom SHALL reach 1.7 within 100 ms of real time.
14. FIN-03: IF a `both` press happens and no broken enemy is within 40 px THEN no finisher SHALL happen.
15. STR-09: Every color used by the enemy and player structure bars SHALL be a key of `PALETTE` (data test on the exported color constants).

**Independent Test**: `structure.test.ts` (ganhos, teto, queda depois de 1499/1500 ms e 999/1000 ms, quebra, fim do atordoamento); smoke faz parry e golpes fortes até a quebra e o finalizador.

---

### P2: Aéreos e voadora

**User Story**: Como jogador, quero golpes no ar, incluindo a voadora, para lutar também pulando.

**Why P2**: Amplia o repertório; o combate no chão já se sustenta.

**Acceptance Criteria**:

1. AIR-01: WHEN a light press happens in the air with no move in progress THEN `socoAereo` (7 light) SHALL start.
2. AIR-02: WHEN a heavy press happens in the air with no move in progress THEN `voadora` (16 heavy) SHALL start and move the player 120 px (±8 px) forward and down over its active time.
3. AIR-03: WHEN a heavy press happens in the air while `S` is held THEN `pisao` (14 heavy) SHALL start and set the player vertical speed to the max fall speed.
4. AIR-04: The player SHALL start at most one air move per jump.
5. AIR-05: WHILE `voadora` is active, `fx.layers` SHALL include `air.kickTrail`.

**Independent Test**: `moveGraph.test.ts` (entradas no ar, um por pulo); smoke pula e usa voadora.

---

### P2: Inimigos que bloqueiam

**User Story**: Como jogador, quero que os inimigos às vezes levantem a guarda, para eu precisar misturar leves, fortes e o carregado.

**Why P2**: Dá profundidade; o combate funciona sem.

**Acceptance Criteria**:

1. EBL-01: WHEN the player starts a light move facing a regular enemy in `idle` within 60 px THEN that enemy SHALL guard for 600 ms with probability `min(0.1 + 0.03 × (round − 1), 0.4)`, drawn from the run RNG.
2. EBL-02: WHILE a regular enemy guards, a light hit from its front SHALL deal 0 damage, add 8 structure and give `events` one `enemyBlock:<id>`.
3. EBL-03: WHILE a regular enemy guards, a heavy hit from its front SHALL deal its full damage.
4. EBL-05: WHEN a guarding regular enemy takes a heavy hit THEN its guard SHALL end in that frame.
5. EBL-04: WHEN `chuteCarregado` hits a guarding regular enemy THEN it SHALL deal its full damage and add 40 structure.

**Independent Test**: `enemyGuard.test.ts` (chance por rodada, leve/forte/carregado); smoke com `?debug&enemyGuard=1` (chance 1).

---

### P2: Contador de combo e nota de estilo

**User Story**: Como jogador, quero ver quantos golpes encadeei e uma nota pela variedade, para querer lutar bonito.

**Why P2**: Motivação extra; não muda a mecânica.

**Acceptance Criteria**:

1. CMB-01: WHEN a player hit lands on a target THEN `combo.hits` SHALL increase by 1.
2. CMB-02: WHEN 1500 ms pass without a new landed hit, or the player takes damage, THEN `combo.hits` SHALL become 0 and `combo.grade` null.
3. CMB-03: WHILE `combo.hits` ≥ 2, `combo.grade` SHALL be D for 1–2 distinct moves in the combo, C for 3, B for 4, A for 5 and S for 6 or more.
4. CMB-04: WHILE `combo.hits` ≥ 2, the HUD SHALL show the text `<hits> hits` at the right side of the screen.
5. CMB-05: WHILE `combo.hits` ≥ 2, the HUD SHALL show the grade letter under the hits text.

**Independent Test**: `combo.test.ts` (contagem, expiração 1499/1500 ms, notas nos limites); smoke confere o HUD.

---

### P3: Palma explosiva (meia-lua)

**User Story**: Como jogador, quero um golpe especial feito com meia-lua para frente, para ter um input de jogo de luta clássico.

**Why P3**: Tempero; o resto não depende dele.

**Acceptance Criteria**:

1. SPC-01: WHEN `S`, then the facing direction, then a light press happen within 300 ms in that order THEN `palmaExplosiva` (20 heavy) SHALL start instead of the move the last press would start.
2. SPC-02: WHEN `palmaExplosiva` hits a regular enemy that survives THEN it SHALL push the enemy 200 px (±16 px) away.

**Independent Test**: `motionInput.test.ts` (ordem, 299/300 ms); smoke faz a meia-lua.

---

## Edge Cases

- WHEN the player holds a prop THEN `J` and `K` SHALL swing the prop (current behavior) and guard, parry and dodge SHALL still work.
- WHEN a technique cast is in progress THEN guard, parry and dodge SHALL NOT start.
- WHEN a hit is both parried and would have been perfect-dodged in the same frame THEN only the parry SHALL apply.
- WHEN the boss enters `roar` THEN its hits during the roar push SHALL follow the guard rules.
- WHEN a new run starts THEN every structure SHALL be 0, the combo SHALL reset and `timeScale` SHALL be 1.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| CTL-01 | P1: Controles de luta | Specify | Verified |
| CTL-02 | P1: Controles de luta | Specify | Verified |
| CTL-03 | P1: Controles de luta | Specify | Verified |
| CTL-07 | P1: Controles de luta | Specify | Verified |
| CTL-08 | P1: Controles de luta | Specify | Verified |
| CTL-04 | P1: Controles de luta | Specify | Verified |
| CTL-05 | P1: Controles de luta | Specify | Verified |
| CTL-06 | P1: Controles de luta | Specify | Verified |
| CTL-09 | P1: Controles de luta | Specify | Verified |
| MOV-01 | P1: Grafo de golpes | Specify | Verified |
| MOV-02 | P1: Grafo de golpes | Specify | Verified |
| MOV-03 | P1: Grafo de golpes | Specify | Verified |
| MOV-04 | P1: Grafo de golpes | Specify | Verified |
| MOV-05 | P1: Grafo de golpes | Specify | Verified |
| MOV-06 | P1: Grafo de golpes | Specify | Verified |
| MOV-17 | P1: Grafo de golpes | Specify | Verified |
| MOV-07 | P1: Grafo de golpes | Specify | Verified |
| MOV-08 | P1: Grafo de golpes | Specify | Verified |
| MOV-09 | P1: Grafo de golpes | Specify | Verified |
| MOV-16 | P1: Grafo de golpes | Specify | Verified |
| MOV-10 | P1: Grafo de golpes | Specify | Verified |
| MOV-11 | P1: Grafo de golpes | Specify | Verified |
| MOV-12 | P1: Grafo de golpes | Specify | Verified |
| MOV-13 | P1: Grafo de golpes | Specify | Verified |
| MOV-18 | P1: Grafo de golpes | Specify | Verified |
| MOV-14 | P1: Grafo de golpes | Specify | Verified |
| MOV-15 | P1: Grafo de golpes | Specify | Verified |
| GRD-01 | P1: Guarda | Specify | Verified |
| GRD-02 | P1: Guarda | Specify | Verified |
| GRD-07 | P1: Guarda | Specify | Verified |
| GRD-06 | P1: Guarda | Specify | Verified |
| GRD-03 | P1: Guarda | Specify | Verified |
| GRD-04 | P1: Guarda | Specify | Verified |
| GRD-05 | P1: Guarda | Specify | Verified |
| GRD-08 | P1: Guarda | Specify | Verified |
| GRD-09 | P1: Guarda | Specify | Verified |
| PAR-01 | P1: Parry | Specify | Verified |
| PAR-02 | P1: Parry | Specify | Verified |
| PAR-09 | P1: Parry | Specify | Verified |
| PAR-03 | P1: Parry | Specify | Verified |
| PAR-10 | P1: Parry | Specify | Verified |
| PAR-07 | P1: Parry | Specify | Verified |
| PAR-08 | P1: Parry | Specify | Verified |
| PAR-04 | P1: Parry | Specify | Verified |
| PAR-05 | P1: Parry | Specify | Verified |
| PAR-06 | P1: Parry | Specify | Verified |
| PAR-11 | P1: Parry | Specify | Verified |
| DOD-01 | P1: Esquiva | Specify | Verified |
| DOD-09 | P1: Esquiva | Specify | Verified |
| DOD-02 | P1: Esquiva | Specify | Verified |
| DOD-03 | P1: Esquiva | Specify | Verified |
| DOD-07 | P1: Esquiva | Specify | Verified |
| DOD-08 | P1: Esquiva | Specify | Verified |
| DOD-04 | P1: Esquiva | Specify | Verified |
| DOD-10 | P1: Esquiva | Specify | Verified |
| DOD-05 | P1: Esquiva | Specify | Verified |
| DOD-06 | P1: Esquiva | Specify | Verified |
| DOD-11 | P1: Esquiva | Specify | Verified |
| DOD-12 | P1: Esquiva | Specify | Verified |
| STR-01 | P1: Estrutura e finalizador | Specify | Verified |
| STR-02 | P1: Estrutura e finalizador | Specify | Verified |
| STR-03 | P1: Estrutura e finalizador | Specify | Verified |
| STR-04 | P1: Estrutura e finalizador | Specify | Verified |
| STR-07 | P1: Estrutura e finalizador | Specify | Verified |
| STR-05 | P1: Estrutura e finalizador | Specify | Verified |
| STR-10 | P1: Estrutura e finalizador | Specify | Verified |
| STR-06 | P1: Estrutura e finalizador | Specify | Verified |
| STR-11 | P1: Estrutura e finalizador | Specify | Verified |
| STR-08 | P1: Estrutura e finalizador | Specify | Verified |
| FIN-01 | P1: Estrutura e finalizador | Specify | Verified |
| FIN-02 | P1: Estrutura e finalizador | Specify | Verified |
| FIN-04 | P1: Estrutura e finalizador | Specify | Verified |
| FIN-03 | P1: Estrutura e finalizador | Specify | Verified |
| STR-09 | P1: Estrutura e finalizador | Specify | Verified |
| AIR-01 | P2: Aéreos e voadora | Specify | Verified |
| AIR-02 | P2: Aéreos e voadora | Specify | Verified |
| AIR-03 | P2: Aéreos e voadora | Specify | Verified |
| AIR-04 | P2: Aéreos e voadora | Specify | Verified |
| AIR-05 | P2: Aéreos e voadora | Specify | Verified |
| EBL-01 | P2: Inimigos que bloqueiam | Specify | Verified |
| EBL-02 | P2: Inimigos que bloqueiam | Specify | Verified |
| EBL-03 | P2: Inimigos que bloqueiam | Specify | Verified |
| EBL-05 | P2: Inimigos que bloqueiam | Specify | Verified |
| EBL-04 | P2: Inimigos que bloqueiam | Specify | Verified |
| CMB-01 | P2: Contador de combo e nota de estilo | Specify | Verified |
| CMB-02 | P2: Contador de combo e nota de estilo | Specify | Verified |
| CMB-03 | P2: Contador de combo e nota de estilo | Specify | Verified |
| CMB-04 | P2: Contador de combo e nota de estilo | Specify | Verified |
| CMB-05 | P2: Contador de combo e nota de estilo | Specify | Verified |
| SPC-01 | P3: Palma explosiva (meia-lua) | Specify | Verified |
| SPC-02 | P3: Palma explosiva (meia-lua) | Specify | Verified |

**Coverage:** 91 total, 0 Verified

---

## Success Criteria

- [ ] Numa run com `?debug&seed=1`, o jogador consegue fazer pelo menos 14 golpes diferentes e vê o nome de cada um nos eventos.
- [ ] Um parry no tempo anula o golpe do inimigo; três parries seguidos e golpes fortes quebram a guarda dele e liberam o finalizador.
- [ ] Esquivar através de um golpe deixa o mundo em câmera lenta e o contra-ataque causa mais dano.
- [ ] `npm test`, `npm run typecheck`, `npm run build` e `npm run smoke` passam, sem regressão das técnicas, da loja e dos objetos.
