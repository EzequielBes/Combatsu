# Impacto Amaldiçoado Specification

## Problem Statement

As mecânicas da F12 deixaram o combate profundo, mas ele ainda não parece coreografado. Os golpes acertam com uma estrelinha, alguns pedacinhos e uma tremida genérica. O gancho ascendente mostra um soquinho colado no rosto enquanto a hitbox acerta 30 px à frente. Os chutes viram uma tábua em "T" sem perna de apoio, e os frames do pulo deslocam a cabeça do tronco. O usuário quer o feel de Jujutsu Kaisen: energia amaldiçoada correndo pelo golpe e impact frames no estilo MAPPA. Quer também a coreografia e o peso do Sifu, sem efeitos genéricos como o inimigo piscar branco.

## Goals

- [ ] Todo golpe corpo a corpo do jogador deixa um rastro de energia amaldiçoada que sai do punho ou do pé desenhado, e o impacto tem camadas proporcionais ao peso do golpe (leve, forte, decisivo).
- [ ] Todo frame de impacto dos golpes do jogador mostra o membro chegando à hitbox (ponto de golpe dentro dela) e forma um corpo só, sem partes soltas. Golpes no chão têm pé de apoio no chão.
- [ ] O golpe decisivo (Contra, quebra de postura, derrubada) tem um impact frame de 2 quadros e uma câmera que reage: tranco, micro-zoom e câmera lenta curta.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Áudio e efeitos sonoros | O jogo não tem sistema de áudio; é uma feature própria. |
| Finalizações sincronizadas de dois corpos | Exigem animação conjunta do jogador e do inimigo; ficam para depois do feel básico. |
| Visual das técnicas amaldiçoadas (Divergente, Vermelho, Azul, Corte) e do Kokusen | Já têm efeitos próprios (AD-009, AD-010); esta feature cobre o corpo a corpo. |
| Golpes do chefe e do inimigo | O rastro e o impacto em camadas são dos golpes do jogador; o inimigo mantém o telegrafo da F12. |
| Redesenho dos inimigos | As reações por altura já existem (`hitReaction.ts`); só o deslizamento é novo. |
| Mudanças de dano, postura ou tempo dos golpes | A dificuldade é mecânica (AD-014..AD-017); esta feature mexe só em visual, câmera e no passo à frente. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Estética do rastro e do impacto | Energia amaldiçoada de JJK: azul (`d` núcleo escuro, `c`, `C` brilho) com fagulhas roxas (`u`, `U`) | Escolha do usuário ("vibe energia amaldiçoada igual no anime"); preto e vermelho continuam exclusivos do Kokusen | y |
| Intensidade da câmera | Pontual: tranco no forte; zoom e câmera lenta só no decisivo e no último inimigo da onda | Recomendação aceita pela regra de autonomia; câmera em todo golpe cansa e atrapalha a leitura | n |
| Profundidade do retrabalho de arte | Todos os frames `-hit` e `-wind` dos golpes do jogador passam pelos invariantes de ponto de golpe e de corpo único; pulo, gancho e chutes são redesenhados | Recomendação aceita pela regra de autonomia; corrige as queixas e evita o mesmo defeito nos outros golpes | n |
| Golpe decisivo | Contra (`counter: true`), golpe que quebra a postura e golpe com `knockdown: true`; o resto é leve ou forte pelo `strength` | São os momentos de "punir" do loop ler → responder → punir; são raros o bastante para o impact frame não cansar | n |
| Impact frame | 2 quadros renderizados com ColorMatrix (dessaturação + contraste + tom azul) dentro do hitstop; sem WebGL, é pulado | É a assinatura visual de MAPPA; dentro do hitstop não muda a duração do jogo | n |
| Faísca antiga (`Fx.spark`) | Some nos acertos corpo a corpo do jogador em inimigos; continua em guarda, parry e golpes do inimigo | A faísca é o efeito "simples" que o usuário recusou; a guarda precisa continuar legível | n |
| Passo à frente | Leve 4 px, forte 10 px, ao longo do `startupMs`; para no contato com o corpo de um inimigo ou parede | Os golpes do Sifu entram com o peso do corpo; valores pequenos não mudam o alcance efetivo do combo | n |
| Pisca-branco do inimigo | Sai do golpe recebido, do cambaleio, da armadura e do ragdoll (RCT-07/08); a armadura passa a mostrar a faísca de guarda (RCT-09). O pisca colorido do ponto de compromisso (CMT-02) fica | O usuário recusou o pisca branco por ser "coisa de jogo dos anos 2000"; o pisca do compromisso é telegrafo de gameplay da F12 | y |
| Choque em cadeia | Inimigo deslizando que encosta em outro faz o outro tocar a reação `body` sem dano | Dá a sensação de coreografia em grupo sem mexer na dificuldade | n |
| Linhas de foco de anime | P3: linhas radiais na câmera de UI por 180 ms no golpe decisivo | Referência direta de JJK; opcional para não atrasar o MVP | n |
| ACs com `ambiguous` entre 0,6 e 0,72 no Jev (`refinement.md`) | Ficam como estão | Têm valores concretos; os termos que o Jev achou vagos (ponto de golpe, nível do impacto, golpe corpo a corpo) estão no Glossário. POS-05, RCT-03, CAM-03 e CAM-06 foram reescritos | n |

**Open questions:** none - all resolved or logged above.

---

## Glossário

- **Ponto de golpe**: texel do frame onde está a ponta do membro que bate (punho, pé, joelho ou cotovelo), em coordenadas do frame. Fica em `STRIKE_POINTS[<frame>]`.
- **Nível do impacto**: `light`, `heavy` ou `decisive`, dado por `impactTier(hit, ctx)` em `src/core`.
- **Golpe corpo a corpo do jogador**: `Hit` de um golpe do grafo `MOVES` (não técnica, não objeto) aceito por um inimigo comum ou pelo chefe.
- **Impact frame**: quadros renderizados com o postFX `impactFrame` no mundo.

---

## User Stories

### P1: Rastro de energia amaldiçoada ⭐ MVP

**User Story**: Como jogador, quero ver a energia amaldiçoada correndo pelo punho e pelo pé, para cada golpe parecer carregado de força como no anime.

**Why P1**: É a assinatura visual pedida e a base em que o impacto se apoia.

**Acceptance Criteria**:

1. TRL-01: The game SHALL define a ponto de golpe in `STRIKE_POINTS` for every `<move>-wind` and `<move>-hit` frame of every move in `MOVES` and for `jab-wind`, `jab-hit`, `kick-wind`, `kick-hit`.
2. TRL-02: The ponto de golpe of every frame SHALL be a non-transparent texel of that frame's grid.
3. TRL-03: WHEN a player move enters its `active` phase THEN the scene SHALL create one trail whose path starts at the `-wind` ponto de golpe and ends at the `-hit` ponto de golpe, converted to world coordinates with the player's position and facing.
4. TRL-04: WHEN a trail is created for a move with `strength: 'light'` THEN its width SHALL be 4 px and it SHALL fade to alpha 0 in 140 ms of game time.
5. TRL-05: WHEN a trail is created for a move with `strength: 'heavy'` THEN its width SHALL be 8 px and it SHALL fade to alpha 0 in 220 ms of game time.
6. TRL-06: The trail SHALL use only the palette keys `d`, `c`, `C`, `u` and `U`.
7. TRL-07: WHILE a move with `strength: 'heavy'` is in its startup phase the scene SHALL keep a cursed-flame emitter at the current ponto de golpe emitting particles with the palette frames `c`, `C` and `U`.
8. TRL-08: WHEN the move leaves its startup phase THEN the cursed-flame emitter SHALL stop emitting within the same frame.
9. TRL-09: WHILE the hitstop is frozen the trails and flame particles SHALL not advance their fade.
10. TRL-10: The debug snapshot SHALL expose `fx.trails` as the list of live trails, each with `{ tier, widthPx, ageMs }`.

**Independent Test**: Num `?debug`, dar `jab` e `chuteFrontal` no ar vazio e ver um risco azul fino e um grosso saindo do membro; `fx.trails` mostra `widthPx` 4 e 8.

---

### P1: Impacto amaldiçoado em camadas ⭐ MVP

**User Story**: Como jogador, quero que cada acerto exploda em energia proporcional ao golpe, para sentir o peso do soco forte e a recompensa do golpe decisivo.

**Why P1**: É a queixa central ("efeitos tipo impacto") e substitui a faísca genérica.

**Acceptance Criteria**:

1. IMP-01: WHEN `impactTier` receives a `Hit` with `counter: true` THEN it SHALL return `decisive`.
2. IMP-02: WHEN `impactTier` receives a `Hit` with `knockdown: true` THEN it SHALL return `decisive`.
3. IMP-03: WHEN `impactTier` receives a context with `brokePosture: true` THEN it SHALL return `decisive`.
4. IMP-04: WHEN `impactTier` receives a `Hit` with `strength: 'heavy'` and none of the decisive conditions THEN it SHALL return `heavy`.
5. IMP-05: WHEN `impactTier` receives a `Hit` with `strength: 'light'` and none of the decisive conditions THEN it SHALL return `light`.
6. IMP-06: WHEN a golpe corpo a corpo do jogador is accepted THEN the scene SHALL emit the event `impact:<tier>` and SHALL NOT call `Fx.spark` for that hit.
7. IMP-07: WHEN the impact tier is `light` THEN the scene SHALL burst 6 energy shards from the contact point inside a cone of ±35° around the hit direction, each living 180 ms.
8. IMP-08: WHEN the impact tier is `heavy` or `decisive` THEN the scene SHALL draw an energy ring at the contact point that grows from radius 6 px to 28 px in 160 ms of game time while fading to alpha 0.
9. IMP-09: WHEN the impact tier is `heavy` or `decisive` THEN the scene SHALL draw the 6 radial spikes returned by `impactSpikes(seed, 6)`, each with length between 18 px and 30 px.
10. IMP-10: The function `impactSpikes(seed, count)` SHALL return the same angles and lengths for the same seed and count.
11. IMP-11: WHEN the impact tier is `decisive` and the hit did not trigger a Kokusen THEN the world camera SHALL carry the postFX `impactFrame` for exactly 2 rendered frames and then remove it.
12. IMP-12: IF the renderer is not WebGL THEN the scene SHALL skip the `impactFrame` postFX and still draw the ring and spikes.
13. IMP-13: WHEN a hit triggers a Kokusen THEN the scene SHALL NOT apply `impactFrame` for that hit.
14. IMP-14: WHEN one swing is accepted by more than one target THEN the scene SHALL apply `impactFrame` at most once for that swing.
15. IMP-15: WHEN an enemy hit with `knockdown: true` first touches the ground THEN the scene SHALL draw a crack decal at the landing point that fades to alpha 0 in 1200 ms.
16. IMP-16: The debug snapshot SHALL expose `fx.lastImpact` as `{ tier, impactFrame }` of the latest impact, where `impactFrame` is `true` when the postFX was applied.

**Independent Test**: Num `?debug&enemyGuard=0`, um `jab` solta fagulhas, um `cotovelada` abre o anel com espinhos, e um Contra escurece a tela em 2 quadros (`fx.lastImpact.impactFrame === true`).

---

### P1: Poses com corpo inteiro e alcance real ⭐ MVP

**User Story**: Como jogador, quero que o golpe desenhado chegue onde ele acerta e que o corpo inteiro participe, para o personagem não parecer ter braços curtos nem ficar torto.

**Why P1**: Corrige as queixas diretas (gancho curto, chute e pulo tortos) e é a base de onde sai o rastro.

**Acceptance Criteria**:

1. POS-01: The ponto de golpe of every `<move>-hit` frame, converted to px relative to the player's body center with facing right, SHALL lie inside that move's hitbox rectangle expanded by 4 px on every side.
2. POS-02: The non-transparent texels of every `<move>-wind`, `<move>-hit` and `<move>-recover` frame of the moves in `MOVES`, of `jab-*`, `kick-*` and of the POS-04 jump sequence SHALL form a single 8-connected component.
3. POS-03: For every `<move>-hit` frame of a move whose `input` is not `{ via: 'press', air: true }`, at least one non-transparent texel SHALL lie on the frame's bottom row.
4. POS-04: In the frame sequence `idle-0`, `jump-0`, `jump-1`, `apex-0`, `fall-0`, `fall-1`, `land-0`, `land-1`, the leftmost column of the head SHALL differ by at most 1 texel between consecutive frames, measured with the hair color keys `h`, `H` and `j`.
5. POS-05: The ponto de golpe of `ganchoAscendente-hit` SHALL lie above the topmost hair texel (`h`, `H`, `j`) of `idle-0`.
6. POS-10: The ponto de golpe of `ganchoAscendente-hit` SHALL lie at least 6 texels in front of the frame's origin column.
7. POS-06: The leg of `chuteFrontal-hit`, `chuteEmpurrao-hit` and `kick-hit` SHALL show a thigh at least 1 texel taller than the shin.
8. POS-07: WHEN a ground move with `strength: 'heavy'` starts THEN the player SHALL advance 10 px (±0.25) in the facing direction spread over its `startupMs`.
9. POS-08: WHEN a ground move with `strength: 'light'` starts THEN the player SHALL advance 4 px (±0.25) in the facing direction spread over its `startupMs`.
10. POS-09: IF the player's body touches an enemy body or a wall during the advance THEN the advance SHALL stop at that contact.

**Independent Test**: `npm test` roda os invariantes nas grades; no jogo, o gancho ascendente mostra o punho acima da cabeça à frente e os chutes têm a perna de apoio plantada.

---

### P2: Reação coreografada do inimigo

**User Story**: Como jogador, quero que o inimigo seja jogado para trás e bata nos outros, para a luta em grupo parecer coreografada.

**Why P2**: Aumenta muito a sensação de Sifu, mas o MVP já se sustenta com rastro, impacto e poses.

**Acceptance Criteria**:

1. RCT-01: WHEN a common enemy that stays standing (not knocked down, not dead and not committed to an attack) accepts a hit of tier `heavy` THEN it SHALL slide 24 px away from the player over 180 ms of game time.
2. RCT-02: WHEN a common enemy that stays standing accepts a hit of tier `decisive` THEN it SHALL slide 48 px away from the player over 240 ms of game time.
3. RCT-03: WHILE an enemy slides the scene SHALL create one residue particle with palette frame `c` at the enemy's feet every 40 ms of game time, each fading to alpha 0 in 300 ms.
4. RCT-04: WHEN a sliding enemy's body touches another standing common enemy THEN the touched enemy SHALL play the `body` hit reaction without losing HP and without losing posture.
5. RCT-05: WHEN a sliding enemy's body touches a wall THEN its slide SHALL stop at that contact.
6. RCT-06: The debug snapshot SHALL expose `enemies[].slide` as `{ remainingPx }` while sliding and `null` otherwise.
7. RCT-07: WHEN a common enemy accepts a hit, staggers or absorbs a hit with armor THEN its sprite SHALL NOT receive a white tint fill (`PALETTE.w`).
8. RCT-08: WHEN a downed enemy's ragdoll takes a hit THEN its parts SHALL NOT receive a white tint fill.
9. RCT-09: WHEN a common enemy absorbs a hit with armor THEN the scene SHALL draw the guard spark (`Fx.spark` with kind `guard`) at the contact point.

**Independent Test**: Com `maxAlive=3` enfileirados, um golpe forte no primeiro o empurra contra o segundo, que dobra sem perder vida.

---

### P2: Câmera que reage

**User Story**: Como jogador, quero que a câmera sinta o golpe comigo, para o soco forte pesar e o golpe decisivo parecer cena de anime.

**Why P2**: Amplifica o impacto, mas depende dele.

**Acceptance Criteria**:

1. CAM-01: WHEN the impact tier is `heavy` THEN the world camera SHALL shift 4 px in the hit direction and return to its follow position in 120 ms of real time.
2. CAM-02: WHEN the impact tier is `decisive` THEN the world camera zoom SHALL go from 1.5 to 1.6 in 60 ms of real time, hold for 200 ms and return to 1.5 in 120 ms.
3. CAM-03: WHEN a hit breaks an enemy's posture THEN the scene SHALL trigger slow motion at time scale 0.4 for 350 ms of real time.
4. CAM-07: WHEN a Contra is accepted THEN the scene SHALL trigger slow motion at time scale 0.4 for 350 ms of real time.
5. CAM-08: WHEN the last enemy of a wave dies THEN the scene SHALL trigger slow motion at time scale 0.4 for 350 ms of real time.
6. CAM-04: IF slow motion is already active THEN a new trigger SHALL restart its 350 ms without stacking the scale.
7. CAM-05: WHILE the finisher zoom (`finisherZoomMs > 0` in `TestScene`, from the finisher feature) is active the scene SHALL NOT apply the CAM-02 zoom.
8. CAM-06: WHEN a golpe corpo a corpo do jogador of tier `heavy` or `decisive` is accepted THEN the scene SHALL NOT call `Fx.shake`.

**Independent Test**: Golpe forte dá o tranco; um Contra fecha o zoom e desacelera o jogo por um instante.

---

### P3: Linhas de foco de anime

**User Story**: Como jogador, quero linhas de velocidade nas bordas da tela no golpe decisivo, para o momento parecer um quadro do anime.

**Why P3**: Tempero; o impact frame já carrega o momento.

**Acceptance Criteria**:

1. FOC-01: WHEN the impact tier is `decisive` THEN the UI camera SHALL draw 24 radial focus lines from the screen edges toward the contact point's screen position for 180 ms of real time.
2. FOC-02: The focus lines SHALL leave a clear circle of radius 120 px around the contact point's screen position.

**Independent Test**: Um Contra mostra as linhas de foco convergindo no ponto do acerto.

---

## Edge Cases

- EDG-01: IF a move frame has no entry in `STRIKE_POINTS` THEN the scene SHALL create no trail for that move and SHALL log one warning per frame name.
- EDG-02: WHEN the player is hit or staggered during a move's startup THEN the cursed-flame emitter SHALL stop emitting in that frame.
- EDG-03: WHILE 40 or more fx objects from this feature are alive the scene SHALL skip creating new shards and residues until the count falls below 40.
- EDG-04: WHEN the scene restarts (R) THEN every trail, ring, spike, decal, residue and flame emitter SHALL be destroyed.
- EDG-05: WHEN the impact frame would start while the game is paused by the shop or the title THEN the scene SHALL NOT apply it.

---

## Implicit-requirement dimensions sweep

| Dimension | Coverage |
| --- | --- |
| Input validation & bounds | TRL-01/02, POS-01..06 (data invariants), EDG-01, EDG-03 (fx budget) |
| Failure / partial-failure states | IMP-12 (no WebGL), EDG-01 (missing strike point) |
| Idempotency / retry / duplicate handling | IMP-14 (one impact frame per swing), CAM-04 (slow-mo does not stack) |
| Auth boundaries & rate limits | N/A because o jogo é local e single-player |
| Concurrency / ordering | IMP-13 (Kokusen wins), CAM-05 (finisher zoom wins), TRL-09 (hitstop) |
| Data lifecycle / expiry | TRL-04/05, IMP-08, IMP-15, EDG-04 |
| Observability | TRL-10, IMP-06, IMP-16, RCT-06 |
| External-dependency failure | N/A because não há chamadas externas no jogo |
| State-transition integrity | TRL-07/08, EDG-02, EDG-05 |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| TRL-01 | P1: Rastro de energia amaldiçoada | Design | Pending |
| TRL-02 | P1: Rastro de energia amaldiçoada | Design | Pending |
| TRL-03 | P1: Rastro de energia amaldiçoada | Design | Pending |
| TRL-04 | P1: Rastro de energia amaldiçoada | Design | Pending |
| TRL-05 | P1: Rastro de energia amaldiçoada | Design | Pending |
| TRL-06 | P1: Rastro de energia amaldiçoada | Design | Pending |
| TRL-07 | P1: Rastro de energia amaldiçoada | Design | Pending |
| TRL-08 | P1: Rastro de energia amaldiçoada | Design | Pending |
| TRL-09 | P1: Rastro de energia amaldiçoada | Design | Pending |
| TRL-10 | P1: Rastro de energia amaldiçoada | Design | Pending |
| IMP-01 | P1: Impacto amaldiçoado em camadas | Design | Pending |
| IMP-02 | P1: Impacto amaldiçoado em camadas | Design | Pending |
| IMP-03 | P1: Impacto amaldiçoado em camadas | Design | Pending |
| IMP-04 | P1: Impacto amaldiçoado em camadas | Design | Pending |
| IMP-05 | P1: Impacto amaldiçoado em camadas | Design | Pending |
| IMP-06 | P1: Impacto amaldiçoado em camadas | Design | Pending |
| IMP-07 | P1: Impacto amaldiçoado em camadas | Design | Pending |
| IMP-08 | P1: Impacto amaldiçoado em camadas | Design | Pending |
| IMP-09 | P1: Impacto amaldiçoado em camadas | Design | Pending |
| IMP-10 | P1: Impacto amaldiçoado em camadas | Design | Pending |
| IMP-11 | P1: Impacto amaldiçoado em camadas | Design | Pending |
| IMP-12 | P1: Impacto amaldiçoado em camadas | Design | Pending |
| IMP-13 | P1: Impacto amaldiçoado em camadas | Design | Pending |
| IMP-14 | P1: Impacto amaldiçoado em camadas | Design | Pending |
| IMP-15 | P1: Impacto amaldiçoado em camadas | Design | Pending |
| IMP-16 | P1: Impacto amaldiçoado em camadas | Design | Pending |
| POS-01 | P1: Poses com corpo inteiro e alcance real | Design | Pending |
| POS-02 | P1: Poses com corpo inteiro e alcance real | Design | Pending |
| POS-03 | P1: Poses com corpo inteiro e alcance real | Design | Pending |
| POS-04 | P1: Poses com corpo inteiro e alcance real | Design | Pending |
| POS-05 | P1: Poses com corpo inteiro e alcance real | Design | Pending |
| POS-06 | P1: Poses com corpo inteiro e alcance real | Design | Pending |
| POS-07 | P1: Poses com corpo inteiro e alcance real | Design | Pending |
| POS-08 | P1: Poses com corpo inteiro e alcance real | Design | Pending |
| POS-09 | P1: Poses com corpo inteiro e alcance real | Design | Pending |
| POS-10 | P1: Poses com corpo inteiro e alcance real | Design | Pending |
| RCT-01 | P2: Reação coreografada do inimigo | Design | Pending |
| RCT-02 | P2: Reação coreografada do inimigo | Design | Pending |
| RCT-03 | P2: Reação coreografada do inimigo | Design | Pending |
| RCT-04 | P2: Reação coreografada do inimigo | Design | Pending |
| RCT-05 | P2: Reação coreografada do inimigo | Design | Pending |
| RCT-06 | P2: Reação coreografada do inimigo | Design | Pending |
| RCT-07 | P2: Reação coreografada do inimigo | Design | Pending |
| RCT-08 | P2: Reação coreografada do inimigo | Design | Pending |
| RCT-09 | P2: Reação coreografada do inimigo | Design | Pending |
| CAM-01 | P2: Câmera que reage | Design | Pending |
| CAM-02 | P2: Câmera que reage | Design | Pending |
| CAM-03 | P2: Câmera que reage | Design | Pending |
| CAM-04 | P2: Câmera que reage | Design | Pending |
| CAM-05 | P2: Câmera que reage | Design | Pending |
| CAM-06 | P2: Câmera que reage | Design | Pending |
| CAM-07 | P2: Câmera que reage | Design | Pending |
| CAM-08 | P2: Câmera que reage | Design | Pending |
| FOC-01 | P3: Linhas de foco de anime | Design | Pending |
| FOC-02 | P3: Linhas de foco de anime | Design | Pending |
| EDG-01 | Edge Cases | Design | Pending |
| EDG-02 | Edge Cases | Design | Pending |
| EDG-03 | Edge Cases | Design | Pending |
| EDG-04 | Edge Cases | Design | Pending |
| EDG-05 | Edge Cases | Design | Pending |

**Coverage:** 64 total, 0 mapped to tasks, 64 unmapped ⚠️ (tasks ainda não criadas)

---

## Success Criteria

- [ ] `npm test` passa com os invariantes POS-01..POS-06 em todos os frames do jogador.
- [ ] No UAT, o usuário diz que o combate parece JJK/Sifu e não aponta braço curto nem pose torta.
- [ ] A suíte de smokes antiga continua passando (sem regressão de mecânica).
