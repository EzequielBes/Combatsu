# Visual, efeitos e jogabilidade — Specification

## Problem Statement

A demo do núcleo de combate funciona, mas não dá vontade de jogar. Os personagens são retângulos sem animação, o cenário é uma grade de blocos cinza sobre fundo liso e o personagem ocupa 36 px de altura numa tela de 540.

As teclas de teste 1 e 2 golpeiam todos os inimigos da sala, e o HUD as anuncia como controle normal. Isso dá a impressão de que "o ataque acerta de longe". Além disso, o inimigo não se mexe e o player não leva dano, então não existe uma luta de verdade para avaliar o "feel".

Esta feature torna a demo legível, consistente e jogável, para que a avaliação do sub-projeto 1 seja justa.

## Goals

- [ ] Personagens, objetos e cenário em pixel art com uma paleta única e uma escala de texel única.
- [ ] Todo golpe que conecta é visível na animação, no ponto de contato, e tem impacto (hitstop + faísca).
- [ ] Um loop de luta: o inimigo persegue, telegrafa e acerta; o player tem vida, perde e renasce.
- [ ] Ferramentas de teste não vazam para o jogo normal.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Arte externa (PNGs, packs baixados) | Decisão do usuário: pixel art desenhada em código; as chaves `TEX` continuam trocáveis depois |
| Energia amaldiçoada, técnicas, progressão | Sub-projeto 2 |
| Mais de um tipo de inimigo, padrões de ataque variados | IA sofisticada fica fora; aqui há um único ciclo simples |
| Som e música | Não pedido; exige assets |
| Menus, pausa, tela de título | Não pedido |
| Mudanças no tuning de física/movimento/combo | A física está validada; esta feature é visual + IA + vida |
| Controle por gamepad/toque | Não pedido |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Origem da arte | Grades de texto (1 caractere = 1 cor da paleta) renderizadas em canvas | Escolha do usuário; sem download nem licença | y |
| IA e vida do player | Entram, ampliando o escopo do sub-projeto 1 | Escolha do usuário para a demo ficar jogável | y |
| Tamanho da paleta | Até 32 cores, tema noturno (azul-marinho, roxo amaldiçoado, âmbar e ciano de destaque) | Pouca cor mantém a consistência | y |
| Escala de texel | 1 texel de arte = 2 px de mundo (`ART_SCALE = 2`) para todo sprite, tile e parte de ragdoll | Pixels do mesmo tamanho em toda a tela | y |
| Resolução | Canvas 960×540 com `Scale.FIT`, câmera com zoom 1,5 (área visível 640×360 px de mundo) | Personagem ~2× maior sem mudar a física | y |
| Tamanho dos sprites | Player com ~16 texels de largura desenhados num frame de 32×24 texels (64×48 px), origem no pé no centro do corpo, para caber o membro esticado do golpe (SPEC_DEVIATION aceita no lote 2; ver `src/game/art/sprites/player.ts`); inimigo 18×24 texels (36×48 px), pode usar o mesmo padrão de frame largo; corpos físicos inalterados (20×36 e 22×36), pé alinhado à base do corpo | O sprite pode passar do corpo; a física não muda | y |
| Números de vida e IA | hp do player 100; golpe do inimigo 12 de dano; invulnerabilidade 700 ms; atordoamento 200 ms; fade de respawn 1000 ms | Ponto de partida jogável; ajustável em `tuning.ts` | y |
| Distâncias da IA | patrulha ±48 px em volta do spawn a 35 px/s; persegue a 70 px/s quando o player está a < 200 px na horizontal; prepara a < 40 px; preparo 450 ms, golpe ativo 120 ms, descanso 800 ms | Telegrafia legível; ajustável em `tuning.ts` | y |
| Duração do hitstop | 50 ms golpe leve, 90 ms golpe forte | Faixa comum de jogos de ação 2D; ajustável | y |
| Como ativar o modo debug | parâmetro `?debug` na URL ou a tecla F1 | Não interfere nos controles do jogo | y |
| Painel de controles | Aparece por 8 s ao iniciar/reiniciar; Tab alterna | Não cobre a tela o tempo todo | y |
| Alcance por golpe (FIX-03) | Socos ≤ 46 px e chute ≤ 55 px do centro do inimigo, com a hitbox atual do combo; o desenho do golpe estende o membro até esse alcance | Achado no lote 1: a hitbox do chute alcança ~53 px; o usuário escolheu limite por golpe em vez de mexer no tuning do combo | y |
| O que é "golpe que conecta" (FX-01/03) | O alvo aceitou o golpe (aplicou dano ou reação); golpe ignorado não dá faísca, tremida nem congelamento (FX-06) | Lacuna apontada pelo Verifier na rodada 1: feedback de golpe ignorado mente para o jogador | y |
| Tolerância do congelamento (FX-01) | Pelo menos a duração do spec e menos que ela mais um frame | O congelamento só termina na virada de frame; lacuna apontada pelo Verifier na rodada 1 | y |
| Alcance do ART-01 | Tudo que é desenhado: sprites, tiles, fundo, partículas, tint e texto do HUD | Lacuna apontada pelo Verifier na rodada 1 | y |
| Velocidade independente de fps (AI-06) | Velocidades em px/s valem a 30 e a 60 fps (±10%) | Falha real achada pelo Verifier: o atrito zerava a velocidade entre steps do Matter | y |
| Cenário | Pátio/corredor de escola à noite, com lua e prédios ao fundo | Coerente com o tema de Jujutsu Kaisen | y |

**Open questions:** none - all resolved or logged above.

**Implicit-requirement dimensions sweep:**
- State-transition integrity: coberta por AI-01..04, HP-01..04 e CHR-01/02.
- Input validation & bounds: coberta por ART-02 (grade de sprite inválida).
- Failure / partial-failure states: N/A because não há I/O, rede nem persistência; a única falha possível é dado de arte inválido (ART-02).
- Idempotency / retry: N/A because não há operações repetíveis com efeito externo; o golpe único por alvo já é garantido por `makeHitGate`.
- Auth boundaries & rate limits: N/A because é um jogo local sem usuários.
- Concurrency / ordering: N/A because roda num único thread, com a ordem do frame fixada pela cena.
- Data lifecycle / expiry: N/A because nada é salvo.
- Observability: coberta por FIX-01 (modo debug com o desenho da física).
- External-dependency failure: N/A because nenhum recurso externo é carregado.

---

## User Stories

### P1: Ataque honesto e sem ferramentas vazando ⭐ MVP

**User Story**: Como jogador, quero que só meus golpes de verdade acertem, e só o que está encostado, para confiar no que vejo.

**Why P1**: É o bug relatado; sem isso a avaliação do combate é inválida.

**Acceptance Criteria**:

1. FIX-01: WHERE the debug mode is off THEN the game SHALL ignore the keys 1, 2 and H (nenhum inimigo muda de estado e o desenho da física continua desligado).
2. FIX-02: WHILE the debug mode is off the game SHALL keep every attack hitbox invisible (o golpe é mostrado pela animação).
3. FIX-03: WHEN the player presses the attack key THEN the game SHALL hit only enemies overlapping the hitbox in front of the player, and SHALL NOT hit an enemy whose center is more than 46 px away horizontally with a punch (jab, cross) or more than 55 px away with the kick.
4. FIX-04: WHERE the debug mode is on (`?debug` na URL ou F1) the game SHALL enable keys 1, 2 and H and draw the attack hitboxes.

**Independent Test**: sem `?debug`, apertar 1/2 não altera nenhum inimigo; J com o inimigo a 60 px não acerta; encostado, acerta.

---

### P1: Base de pixel art e resolução ⭐ MVP

**User Story**: Como jogador, quero ver personagens grandes e nítidos, com o mesmo estilo em tudo.

**Why P1**: Todas as outras histórias visuais dependem disso.

**Acceptance Criteria**:

1. ART-01: The game SHALL draw every sprite, tile, background layer, particle, tint and HUD text using only colors from the single palette module.
2. ART-02: IF a sprite grid has rows of different widths, a character missing from the palette, or frames of different sizes THEN the parser SHALL throw an error whose message names the sprite.
3. ART-03: The art pipeline SHALL render every sprite, tile and ragdoll part at a texel scale of exactly 2 world pixels per art pixel.
4. RES-01: The camera SHALL use zoom 1.5, round pixels, follow the player and never show anything outside the room bounds.

**Independent Test**: os testes do parser rejeitam grades inválidas; a captura de tela mostra pixels de 3 px de tela (2 × 1,5) em todos os sprites.

---

### P1: Personagens animados ⭐ MVP

**User Story**: Como jogador, quero ver o que o personagem está fazendo (correndo, pulando, socando) e o que o inimigo vai fazer.

**Why P1**: Sem animação o golpe parece acertar sem contato, e a telegrafia da IA não existe.

**Acceptance Criteria**:

1. CHR-01: The animation selector SHALL return, for the player, exactly one of: `idle`, `run`, `jump`, `fall`, `jab`, `cross`, `kick`, `carry-idle`, `carry-run`, `swing`, `throw`, `hurt`, with precedence hurt > golpe/swing/throw > ar (jump se vy < 0, senão fall) > run (|vx| > 10 px/s) > idle, and the carry variant chosen while holding a prop.
2. CHR-02: WHEN an attack step enters its active phase THEN the player SHALL show the extended-limb frame of that step for the whole active window.
3. CHR-03: The animation selector SHALL return, for the enemy, exactly one of: `idle`, `walk`, `windup`, `attack`, `hurt`, `getup`, derived from the brain state and the AI state.
4. CHR-04: WHEN the enemy enters ragdoll THEN the ragdoll parts SHALL use textures cut from the enemy sprite art (cabeça com o olho, tronco, membros) in the same palette colors.

**Independent Test**: tabela de estados → animação nos testes do seletor; no navegador, o frame do golpe no instante do `hitboxOn` é o de membro esticado.

---

### P1: Impacto do golpe ⭐ MVP

**User Story**: Como jogador, quero sentir cada golpe que conecta.

**Why P1**: É o que o protótipo existe para avaliar.

**Acceptance Criteria**:

1. FX-01: WHEN a hit connects (the target accepted it and applied damage or a reaction) THEN the game SHALL freeze physics and animations for at least 50 ms and less than 50 ms plus one frame if the hit is light, and for at least 90 ms and less than 90 ms plus one frame if it is heavy.
2. FX-02: IF a new hit connects while a freeze is active THEN the game SHALL keep the longer of the remaining freeze and the new freeze, never the sum.
3. FX-03: WHEN a hit connects THEN the game SHALL spawn a spark at the contact point, white for light hits, amber for heavy hits and purple for prop hits.
4. FX-06: IF a hit is ignored by its target (invulnerable player, dead or dissolving enemy, owner, same team) THEN the game SHALL NOT spawn a spark, shake the camera or start a freeze.

**Independent Test**: no navegador, a posição do inimigo fica parada durante o congelamento; os testes do timer de hitstop cobrem a sobreposição.

---

### P1: Luta de verdade (vida do player + IA simples) ⭐ MVP

**User Story**: Como jogador, quero um inimigo que venha me atacar e que eu possa perder, para testar o combate sob pressão.

**Why P1**: Pedido do usuário para a demo ficar jogável.

**Acceptance Criteria**:

1. HP-01: WHEN the player receives a hit while not invulnerable THEN the player SHALL lose hp equal to the hit damage and become invulnerable for 700 ms.
2. HP-02: WHILE the player is invulnerable the player SHALL ignore further hits and blink.
3. HP-03: WHEN the player receives a hit THEN the player SHALL be knocked back in the hit direction and lose movement control for 200 ms.
4. HP-04: IF the player hp reaches 0 THEN the game SHALL fade out, respawn the player at the level spawn with full hp (100) after 1000 ms, and drop any held prop.
5. AI-01: WHILE the enemy brain is idle and the player is 200 px or more away horizontally the enemy SHALL patrol within ±48 px of its spawn at 35 px/s.
6. AI-02: WHILE the enemy brain is idle and the player is less than 200 px away horizontally the enemy SHALL walk toward the player at 70 px/s.
7. AI-03: WHEN the player is less than 40 px away horizontally from a chasing enemy THEN the enemy SHALL wind up for 450 ms, attack with an active hitbox for 120 ms dealing 12 damage, then rest for 800 ms before chasing again.
8. AI-04: IF the enemy receives a hit during windup or attack THEN the enemy SHALL cancel its attack and restart the cycle after the hit reaction.
9. AI-05: The enemy attack SHALL never damage the enemy itself or other enemies.
10. AI-06: The enemy SHALL move at its tuned patrol and chase speeds within ±10% whether the game runs at 30 or 60 frames per second.

**Independent Test**: testes puros do ciclo da IA e da vida; no navegador, o player parado perto do inimigo perde 12 de hp a cada golpe e renasce ao zerar.

---

### P2: Cenário com profundidade

**User Story**: Como jogador, quero um lugar com cara de lugar, não uma grade.

**Why P2**: Melhora muito a leitura, mas o combate funciona sem isso.

**Acceptance Criteria**:

1. ENV-01: The tile selector SHALL choose, for each solid tile, one of `top`, `middle`, `left`, `right`, `top-left`, `top-right`, `thin` (plataforma de 1 tile de altura) and `thin-left`/`thin-right`, based only on its four neighbors.
2. ENV-02: The background SHALL have three parallax layers with scroll factors 0.1, 0.3 and 0.6 behind the terrain.

**Independent Test**: tabela de vizinhanças → variante nos testes; a captura mostra bordas nas plataformas e o fundo se movendo mais devagar que o chão.

---

### P2: Objetos e HUD

**User Story**: Como jogador, quero reconhecer os objetos e saber quanta vida tenho.

**Why P2**: Legibilidade; não bloqueia o loop.

**Acceptance Criteria**:

1. PRP-01: The chair and the bottle SHALL be drawn as palette sprites at texel scale 2, and WHEN a prop breaks THEN its debris SHALL be fragments cut from its own sprite.
2. HUD-01: The HUD SHALL show the player hp as a bar fixed to the screen.
3. HUD-02: WHEN an enemy takes its first damage THEN the game SHALL show an hp bar above that enemy until it dies.
4. HUD-03: WHEN the scene starts or restarts THEN the game SHALL show the controls panel for 8 s, and WHEN the player presses Tab THEN the game SHALL toggle it.

**Independent Test**: captura com a barra de vida; o painel some depois de 8 s e volta com Tab.

---

### P3: Polimento de movimento

**User Story**: Como jogador, quero que pular e correr pareçam ter peso.

**Why P3**: Refinamento.

**Acceptance Criteria**:

1. FX-04: WHEN the player jumps, lands, or reverses direction while running THEN the game SHALL spawn a dust puff at the player's feet.
2. FX-05: WHILE a kick or a throw is active the game SHALL draw a fading afterimage of the player.

**Independent Test**: captura logo após pousar mostra poeira.

---

## Edge Cases

- IF the player dies while holding a prop THEN the prop SHALL fall to rest (via `PropMachine.holderGone`) before the respawn.
- IF the enemy dies during its windup THEN its attack hitbox SHALL never open.
- WHEN the scene restarts during a hitstop THEN the new scene SHALL start unfrozen.
- IF the player is hit by an enemy and by its own thrown prop in the same frame THEN only the enemy hit SHALL apply (o dono nunca se acerta — já garantido por `makeHitGate`).
- WHEN two enemy hits land in the same frame THEN the player SHALL take damage only once (invulnerabilidade).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| FIX-01 | P1: Ataque honesto | Tasks | Implementing |
| FIX-02 | P1: Ataque honesto | Tasks | Implementing |
| FIX-03 | P1: Ataque honesto | Tasks | Implementing |
| FIX-04 | P1: Ataque honesto | Tasks | Implementing |
| ART-01 | P1: Base de pixel art | Tasks | Implementing |
| ART-02 | P1: Base de pixel art | Tasks | Implementing |
| ART-03 | P1: Base de pixel art | Tasks | Implementing |
| RES-01 | P1: Base de pixel art | Tasks | Implementing |
| CHR-01 | P1: Personagens animados | Tasks | Implementing |
| CHR-02 | P1: Personagens animados | Tasks | Implementing |
| CHR-03 | P1: Personagens animados | Tasks | Implementing |
| CHR-04 | P1: Personagens animados | Tasks | Implementing |
| FX-01 | P1: Impacto do golpe | Tasks | Implementing |
| FX-02 | P1: Impacto do golpe | Tasks | Implementing |
| FX-03 | P1: Impacto do golpe | Tasks | Implementing |
| FX-06 | P1: Impacto do golpe | Tasks | Implementing |
| HP-01 | P1: Luta de verdade | Tasks | Implementing |
| HP-02 | P1: Luta de verdade | Tasks | Implementing |
| HP-03 | P1: Luta de verdade | Tasks | Implementing |
| HP-04 | P1: Luta de verdade | Tasks | Implementing |
| AI-01 | P1: Luta de verdade | Tasks | Implementing |
| AI-02 | P1: Luta de verdade | Tasks | Implementing |
| AI-03 | P1: Luta de verdade | Tasks | Implementing |
| AI-04 | P1: Luta de verdade | Tasks | Implementing |
| AI-05 | P1: Luta de verdade | Tasks | Implementing |
| AI-06 | P1: Luta de verdade | Tasks | Implementing |
| ENV-01 | P2: Cenário | Tasks | Implementing |
| ENV-02 | P2: Cenário | Tasks | Implementing |
| PRP-01 | P2: Objetos e HUD | Tasks | Implementing |
| HUD-01 | P2: Objetos e HUD | Tasks | Implementing |
| HUD-02 | P2: Objetos e HUD | Tasks | Implementing |
| HUD-03 | P2: Objetos e HUD | Tasks | Implementing |
| FX-04 | P3: Polimento | Tasks | Implementing |
| FX-05 | P3: Polimento | Tasks | Implementing |

**Coverage:** 34 total, 34 mapped to tasks (FX-06 e AI-06 na Fase 7).

---

## Success Criteria

- [ ] `npm test` and `npm run build` pass with the new pure-logic tests added.
- [ ] Sem `?debug`, nenhum golpe acerta um inimigo a mais de 45 px do player.
- [ ] Uma luta completa (inimigo morre ou player morre e renasce) acontece sem erro no console.
- [ ] Captura de tela: nenhum retângulo placeholder visível; todo pixel de arte com o mesmo tamanho.
