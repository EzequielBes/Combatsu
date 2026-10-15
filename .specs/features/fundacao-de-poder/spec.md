# Fundação de poder - Specification

## Problem Statement

A força comprada na run não aparece na tela: o atributo Força, as Manoplas e o Punho Pesado só mudam um número de dano
que o jogador não vê. O dano frequente trava o jogo, porque o tique do Azul (5 de dano a cada 250 ms) dispara hitstop,
congela a física e põe o inimigo preso em `hitstun`, que interrompe o golpe dele. O objeto na mão bate com a faísca roxa
e sem os bônus da build, mais fraco que o soco. A F29 (`docs/plano-builds-e-habilidades.md`, seções 4 e 6.1) é a base
das fases F30 a F41: um dono único dos multiplicadores, as faixas de acerto, o número de dano e a força contínua.

## Goals

- [ ] Todo ponto de Força muda o soco forte de um jeito visível: impacto maior, tranco, deslize e rastro; com Força 5 o
      impacto fica vermelho; com Manoplas, preto e vermelho, com chama no punho.
- [ ] Com 5 inimigos dentro do Azul, o hitstop fica em 0 durante os tiques e o inimigo preso continua lutando.
- [ ] Todo acerto do jogador mostra o número do dano, com no máximo 12 números vivos.
- [ ] O objeto na mão e a arma vinculada batem com o impacto amaldiçoado e os bônus do golpe forte.
- [ ] A `TestScene` sai de 399 para 393 linhas efetivas ou menos, e os números de dano, custo e vida de hoje não mudam.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Escala de HP e dano do inimigo (POW-12 do plano) | Vai para a F30, junto com os eixos (decisão 3 da seção 7). `DIFFICULTY.*PerRound` continua 0 |
| Impacto do Corpo como fonte de pontos de força | O Corpo Amaldiçoado nasce na F30 (`core/cursedBody.ts`) |
| Rachadura de 1,5 s e onomatopeia ドン no patamar 3 | Leva 2 (F41) |
| Emissor de acerto `micro` | A faixa fica pronta na regra; o primeiro emissor (Onda do Punho, estilhaço do Vermelho) entra na F30 |
| Crítico (número amarelo) emitido em jogo | O tipo existe na regra pura; o primeiro crítico vem com os talentos (F35) |
| `TechStats` e vistas lendo o stat | F30, passo 1 |
| Aura de build, `TalentStrip`, marcas no rosto | F35 e feature de arte |
| Mudar slots, loja, técnicas ou o moveset | Fora da F29 por definição do plano; o moveset é fechado (Sifu só no sentimento) |
| Versão antiga (`?hd=0`) | Não recebe trabalho novo; os smokes antigos só não podem quebrar |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Id do requisito 03b | Vira POW-15 (o texto é o POW-03b do plano) | O validador do skill só aceita `CAT-NN`; o resto da numeração do plano fica igual | y |
| Hitstop do micro ("15 a 20 ms") | 15 ms no acerto `light`, 20 ms no `heavy` | Dá um valor exato por acerto e cobre a faixa do plano | n |
| Teto do micro ("60 ms por segundo") | Janela deslizante de 1000 ms de relógio real; o acerto que levaria a soma acima de 60 ms sai sem hitstop | O hitstop congela o relógio de jogo, então a janela não pode ser de tempo de jogo | n |
| Faísca do micro ("média") | Tamanho 10, o da faísca leve de hoje | Fica entre o chip (6) e o forte (15) sem desenho novo | n |
| Guarda do inimigo contra chip e micro | Regra de hoje (`guard.resolveHit` antes de tudo) | O tique do Azul vem de cima (`direction.x = 0`) e nunca conta como "de frente" | n |
| Vida e queda do número de dano | 700 ms de vida, sobe 18 px; o Kokusen entra com escala 1,6 e volta a 1,0 em 120 ms ("pop") | Mais longo que o "+N" da coleta (400 ms) para ser lido no meio da luta | n |
| Fusão de números | Acerto no mesmo alvo até 300 ms depois do último acerto somado num número vivo soma nele, reinicia a vida e fica com o tipo de maior prioridade (Kokusen > crítico > técnica > golpe > micro > chip) | Uma regra só para a soma, o tipo e o tamanho | n |
| Cores do número | golpe `w`, técnica `c`, crítico `A`, Kokusen `b` com contorno `R`, micro `c`, chip `S`; contorno `k` nos outros | Segue a seção 4 do plano, com chaves da `PALETTE` | n |
| Só acertos do jogador mostram número | O `CombatLinks.onConnect` também trata golpes de inimigo; esses não mostram número | O número é sensação de poder do jogador | n |
| Tons do impacto por patamar | 0 azul `d c C u U` (o `CURSED_TONE` de hoje); 1 azul claro `d C w c W`; 2 vermelho `r R w t T`; 3 preto e vermelho `R b R r W` (sombra, corpo, miolo, corpo e miolo alternados) | Chaves da paleta; a arte confere na prancha e pode trocar chaves dentro da paleta, atualizando esta linha | n |
| Escala e tom no impacto leve | Só o impacto `heavy` e `decisive` muda de tamanho e de tom; o leve (agulhas) fica igual | O plano fala do "soco forte"; o leve continua discreto | n |
| Tremor do patamar 2 | `fx.shake()` com os números de hoje (90 ms, 0,004) no impacto `heavy` e `decisive` do jogador; `shake(ms, int)` do plano fica sem uso e não entra | Nenhum número novo foi pedido para o tremor | n |
| Rastro do objeto (POW-11) | Risco `heavy` do centro do player ao ponto de contato, desenhado no acerto, com o bônus de largura da força; o arremesso (`knockdown`) passa pelo impacto mas não ganha risco | O golpe de objeto não passa pelo grafo de golpes e não tem fase `active` que desenhe rastro; no arremesso o contato fica longe da mão | n |
| `force` do objeto | O `PropDamage` muda só o dano; o impulso do objeto continua o `knockback` do `PropDef` | O plano só pede o dano pelo `meleeMul` | n |
| Traços do golpe de objeto | `{heavy: true, light: false, counter: false, shadow: false}`: o Punho Pesado, as Manoplas e o Sem guarda (×1,6 no forte) valem para o objeto; as Faixas não | O objeto bate como golpe forte (`propHit` já usa `strength: 'heavy'`) | n |
| Chama do patamar 2 e 3 | `CursedFlame` com a cor `red` (as cores existentes são `blue`, `red`, `white`), power 0,3 e 0,6 | Sem desenho novo de chama; preto e vermelho fica no impacto | n |
| Repouso para a aura | `movePhase === 'idle'`, no chão, sem `castLock`, sem `channeling` e com o quadro do `idle` | São os estados que o `Player` já expõe | n |
| Momento do `statsDirector.reset()` | Depois do `this.s.vows.reset()` (`runDirector.ts:147`), com os modificadores já zerados na l.140 | O `sync` do reset precisa ver build, arsenal e votos já zerados; o plano dizia "logo depois do `modifiers.reset()`" | n |
| Campos do snapshot por passo | Cada passo põe no snapshot o campo que ele cria (`damageNumbers` no passo 3, `power` no 4, `stats` no 6), num tipo em arquivo à parte | Cada tarefa prova o efeito no jogo vivo (L-076); o plano juntava tudo no passo 6 | n |
| Kokusen no número | O retorno de chamada do Kokusen da `TestScene` (l.324-327) vira `this.impactFx.onKokusen(...)`, que marca o quadro, dispara o cinema e promove o número do alvo a `kokusen` | O tipo do acerto não chega ao `onTechConnect`; a troca tira 3 linhas da cena | n |
| Alvo do acerto de técnica | `TechContext.onTechHit(hit, point, target)` (`game/tech/shared.ts:33`) ganha o alvo (as 5 técnicas, `blue`, `cut`, `divergent`, `purple` e `red`, já o têm na mão) | A fusão por alvo do POW-05 precisa saber quem levou o golpe | n |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Um dono para os multiplicadores ⭐ MVP

**User Story**: Como desenvolvedor das fases F30 a F41, quero um único lugar que combine build, arsenal e votos, para
cada multiplicador novo entrar num agregador puro sem escrever direto nos números do combate.

**Why P1**: Todas as fases seguintes dependem disto, e a `TestScene` está no teto (399 de 400).

**Acceptance Criteria**:

1. POW-01: The `statSheet` function SHALL be the only code that combines perks, arsenal and vow effects into the melee multiplier, the two technique multipliers, the cost multiplier, the damage taken multiplier and the max HP.
2. POW-01: The `StatsDirector` SHALL be the only writer of `loadout.damageMul`, `loadout.vowDamageMul`, `loadout.costMul`, `player.damageTakenMul` and `player.setMaxHp` in `src/`.
3. POW-01: For no vow and each of the 8 vows, crossed with no relic and each of the 3 relics at levels 1 and 3, crossed with no perk and each of the 6 perks, the `statSheet` SHALL return exactly the numbers of today's composition for the strikes `jab`, `cotovelada` and the counter move, with and without the shadow step armed.
4. POW-01: WHEN the player buys `vida` THEN the system SHALL resync the stats through the `StatsDirector` before the 15 HP heal.
5. POW-01: WHEN the player buys `vida` at 50/60 HP with "Corpo de vidro" THEN the system SHALL leave 65 HP and a 69 max HP, and WHEN the player buys it at 80/100 HP with no vow THEN the system SHALL leave 95 HP and a 115 max HP.
6. POW-02: WHEN the refactor task (T2) is committed THEN `src/scenes/TestScene.ts` SHALL have 393 effective lines (blank and comment lines skipped).
7. POW-02: The tasks of steps 2 to 6 SHALL never add a net effective line to `src/scenes/TestScene.ts`, which SHALL end the feature with 393 effective lines or fewer.

**Independent Test**: `npm run gate` com `tests/core/statSheet.test.ts`; os smokes `vows`, `arsenal`, `build`, `shop`,
`fight`, `defense`, `run-loop` e `world-traverse` passam iguais depois da refatoração.

---

### P1: O dano frequente não trava o jogo ⭐ MVP

**User Story**: Como jogador, quero que o tique do Azul e os acertos pequenos não congelem a tela nem travem o inimigo,
para o Azul fluir e a luta continuar.

**Why P1**: O Azul é a técnica que mais engasga hoje, e as fases seguintes (Vermelho, Santuário, queima) dependem das
faixas.

**Acceptance Criteria**:

1. POW-03: WHEN a technique hit with `band: 'chip'` connects THEN the `EffectsDirector` SHALL trigger no hitstop and no freeze, and SHALL draw a spark of size 6.
2. POW-03: WHEN a technique hit with `band: 'micro'` connects THEN the system SHALL trigger a hitstop of 15 ms for a `light` hit and 20 ms for a `heavy` hit, and SHALL draw a spark of size 10.
3. POW-03: IF the micro hitstop granted in the last 1000 ms of real time plus the new one would exceed 60 ms THEN the system SHALL grant no hitstop to that micro hit and SHALL still draw its spark.
4. POW-03: WHEN an enemy brain receives a hit with a band and survives THEN it SHALL return exactly `[{type: 'chip', hit}]`, SHALL keep its state (no `hitstun`, `stagger` nor `ragdollStun`) and SHALL keep `downHits` unchanged.
5. POW-03: IF a hit with a band takes the enemy HP to 0 THEN the brain SHALL return `died` and `ragdoll`, as any lethal hit does today.
6. POW-03: WHEN the boss receives a `chip` hit THEN the poise damage SHALL be the damage times `BOSS.chipPoiseMul` (0.5), and WHEN it receives a `micro` hit THEN the poise damage SHALL follow today's rule (damage for `light`, twice the damage for `heavy`).
7. POW-15: WHEN an enemy accepts a hit with a band THEN the `EnemyDefense` SHALL apply the damage without `ai.interrupt`, without clearing `walkVxStep`, without `pickHitReaction`, without `trackStreak` and without the move effect, and SHALL return `true`.
8. POW-15: WHEN an enemy accepts a `chip` hit THEN its structure SHALL not grow, and WHEN it accepts a `micro` hit THEN its structure SHALL grow by half of `enemyStructureGain(hit)`.
9. POW-15: WHEN the `EnemyDefense.handle` gets a `chip` event THEN it SHALL emit the debug event `chip:<id>` and SHALL apply no body reaction.
10. POW-04: The Blue tick SHALL carry `band: 'chip'`, and the Blue implosion SHALL carry no band.
11. POW-04: WHILE 5 enemies are inside the Blue the hitstop SHALL read 0 on every frame of the ticks, no enemy SHALL enter `hitstun` from a tick, and an enemy that was in `windup` SHALL reach `attack`.
12. POW-14: WHILE 8 enemies are alive and the Blue, the Red and a strike hit at the same time the live effects SHALL stay at 40 or fewer, the live damage numbers at 12 or fewer, and the summed micro hitstop at 60 ms or less in any 1000 ms window.

**Independent Test**: `?debug&hd=1&area=modular&seed=1&tech=azul` com 5 inimigos: o snapshot mostra `hitstop.frozen`
falso em todo quadro dos tiques, eventos `chip:<id>`, nenhum inimigo em `hitstun` e um inimigo chegando a `attack`.

---

### P1: A força se vê e se sente a cada ponto ⭐ MVP

**User Story**: Como jogador que compra Força, Manoplas ou o Punho Pesado, quero que cada ponto mude o soco forte na
tela, para sentir a build crescer.

**Why P1**: É a promessa central da F29 ("o soco forte pesa e muda a cada ponto de Força").

**Acceptance Criteria**:

1. POW-07: The power points SHALL be the Força level (0 to 5) plus 2 times the Manoplas level (0 to 3) plus 2 when the perk Punho Pesado is held.
2. POW-07: The power tier SHALL be 0 below 2 points, 1 from 2 points, 2 from 5 points and 3 from 8 points.
3. POW-08: The impact scale SHALL be 1 + 0.05 × p, with p the power points capped at 10 (1.0 to 1.5).
4. POW-08: WHEN a player strike lands with the `heavy` impact tier THEN the camera kick SHALL move 4 + 0.3 × p px, through `CameraKick.kick(dx, dy, px)` with `px = CAMERA_FEEL.kickPx` as default.
5. POW-08: WHEN a player strike opens its hitbox THEN the hit `force` SHALL be the move force times 1 + 0.03 × p, through the `Player.strikeMods` hook that replaces `Player.damageMul` and returns `{damage, force}`.
6. POW-08: WHEN a player hit makes an enemy slide THEN the slide distance SHALL be the `SLIDE_FEEL` distance times 1 + 0.03 × p, through `Enemy.slideBy(tier, dir, scale = 1)`.
7. POW-08: The strike trail width SHALL grow by 1 px for every 2 power points (floor of p / 2, up to +5).
8. POW-08: WHEN a player melee or prop hit connects THEN the hitstop SHALL be `HITSTOP_MS` plus the tier bonus: +0, +10, +20 or +30 ms for `heavy` and +0, +0, +5 or +10 ms for `light`, by tier 0 to 3.
9. POW-08: WHILE the power tier is 2 or more, WHEN a player hit lands with the `heavy` or `decisive` impact tier THEN the system SHALL shake the world camera for 90 ms at 0.004.
10. POW-08: The values of `HITSTOP_MS` SHALL stay 50 and 90 ms, and the default camera kick SHALL stay 4 px.
11. POW-09: WHEN a player hit lands with the `heavy` or `decisive` impact tier THEN `drawHeavyImpact` SHALL paint the needles, the star flash and both shockwaves with `toneOf(s)` (`cursedImpact.ts:48`), fed by `ImpactShape.tone` with the tone of the power tier (blue, light blue, red, black and red), all from the `PALETTE`.
12. POW-10: WHILE the power tier is 2 and the player is at rest the system SHALL show red embers at the hand (`CursedFlame` with power 0.3), and WHILE the tier is 3 and the player is at rest it SHALL show the fist flame (power 0.6).
13. POW-10: The hand point SHALL be the player draw position plus a fixed offset per `facing` in `POWER_FEEL.handOffset`, measured on the art board, for both the `player-yuta` and the `player-hd` frames.
14. POW-10: IF the player is casting, channeling the Reverse Cursed Energy, out of the rest pose or dead THEN the aura SHALL be off.

**Independent Test**: `?debug&hd=1&area=modular&seed=1&maxAlive=1&enemyGuard=0&arsenal=manoplas,manoplas,manoplas&perks=punhoPesado`:
o snapshot mostra 8 pontos e patamar 3; o golpe forte deixa o rastro 4 px mais largo, o deslize 24 % maior e o hitstop
em 120 ms; a chama aparece na mão parada, dos dois lados, conferida em movimento no jogo.

---

### P2: Todo acerto mostra o número

**User Story**: Como jogador, quero ver o dano de cada acerto, com tamanho e cor pelo tipo, para ler o quanto a build
bate.

**Why P2**: Dá leitura ao dano, mas o jogo funciona sem ele.

**Acceptance Criteria**:

1. POW-05: The damage number size SHALL be 12 px below 15 damage, 16 px from 15 to 39 and 20 px from 40, for the kinds strike, tech, crit and Kokusen; the kinds micro and chip SHALL always be 12 px.
2. POW-05: The damage number colors SHALL come from the kind (strike `w`, tech `c`, crit `A`, Kokusen `b` with a `R` outline, micro `c`, chip `S`, outline `k` for the others), all keys of the `PALETTE`.
3. POW-05: WHEN a hit lands on a target 300 ms or less after the last hit summed into a live number of that target THEN the system SHALL add its damage to that number, restart its life and keep the kind of higher priority (Kokusen, crit, tech, strike, micro, chip).
4. POW-05: WHEN a hit lands on a target more than 300 ms after the last hit summed into its live number THEN the system SHALL start a new number.
5. POW-05: IF 12 numbers are alive and a new hit has no number to merge into THEN the system SHALL merge it into the most recent live number of the same target, or, when that target has none, SHALL remove the oldest number before showing the new one.
6. POW-06: The `DamageNumbers` SHALL be created by the `UiSetup` as `ui.damageNumbers`, with no new field in the `TestScene`.
7. POW-06: WHEN a player hit connects through `CombatLinks.onConnect` THEN the system SHALL show a strike number, and WHEN a technique hit connects through `EffectsDirector.onTechConnect` THEN it SHALL show a tech, micro or chip number by the hit band.
8. POW-06: WHEN the Kokusen lands THEN the number of that hit SHALL show the Kokusen kind.
9. POW-06: The damage numbers SHALL update in `drops.updatePickups`, SHALL be cleared on the run reset and on the area teardown, SHALL not count toward the `fxCap`, and SHALL not change `FloatTexts.debug`.

**Independent Test**: `?debug&hd=1&area=modular&seed=1&maxAlive=1&enemyGuard=0`: o jab acerta e o snapshot traz
`damageNumbers.last` com o valor do acerto e o tipo `strike`; com `tech=azul`, o tique traz o tipo `chip`.

---

### P2: O objeto na mão bate como o soco

**User Story**: Como jogador que pega um objeto ou usa a arma vinculada, quero que ele bata com o impacto amaldiçoado e
os bônus da build, para segurar a arma não ser jogar pior.

**Why P2**: Fecha o "segurar a arma é jogar pior" antes da arma imbuída (F36).

**Acceptance Criteria**:

1. POW-11: WHEN a world object or the bound weapon hits a target THEN its damage SHALL be `round(modifiers.meleeDamage(base) × statSheet.meleeMul(traits))` with traits `{heavy: true, light: false, counter: false, shadow: false}`, resolved in `Prop.onTouch`.
2. POW-11: WHILE the shadow step is armed (Passo sombrio), WHEN an object hit is resolved THEN the system SHALL keep it armed, so the next strike of the moveset still gets `PERK.shadowMul` (1.5).
3. POW-11: The `Prop` SHALL receive a `PropDamage` from the `StatsDirector` instead of `Modifiers` at its 3 creation points (`arsenalDirector`, `drops.ts:86`, `world.ts:355`).
4. POW-11: WHEN a player object hit connects THEN the system SHALL run it through the `ImpactFx` with the impact tier forced to `heavy` (new `forced?: ImpactTier` in `impactTier`), including a thrown object with `knockdown`, and SHALL not draw the purple spark.

**Independent Test**: `?debug&hd=1&area=modular&seed=1&maxAlive=1&enemyGuard=0&arsenal=bastao`: o golpe com o bastão
dispara `impact:heavy` e nenhuma faísca roxa; com `manoplas,manoplas,manoplas` junto, o dano sobe ×1,3.

---

### P2: Debug e snapshot da força

**User Story**: Como desenvolvedor e smoke, quero ler a força, os números e os multiplicadores no snapshot e começar a
run com Força comprada, para provar cada efeito no jogo vivo.

**Why P2**: Os smokes e o ajuste fino dependem disto.

**Acceptance Criteria**:

1. POW-13: The debug snapshot SHALL report `power: {points, tier, impactScale, hitstopBonusMs: {light, heavy}, tone, aura}`, `damageNumbers: {live, last: {value, kind} | null}` and `stats: {meleeMul, techDamageMul, costMul}`, all required, typed in a file apart from `debugApi.ts`.
2. POW-13: WHEN the run starts with `?debug&mods=<id>:<n>[,<id>:<n>]` THEN the `statsDirector.reset()` SHALL raise each core modifier `<id>` by `<n>` levels, capped at its max level.
3. POW-13: IF a `mods=` entry has an unknown id or a level that is not a positive integer THEN the system SHALL ignore that entry.
4. POW-13: WHEN the run starts with `mods=forca:5&arsenal=manoplas,manoplas,manoplas` THEN the snapshot SHALL report 11 points, tier 3 and impact scale 1.5; with `mods=forca:5` alone it SHALL report tier 2; with neither it SHALL report tier 0.

**Independent Test**: `power.smoke.mjs` lê os três cenários de `mods=` e o `README.md` documenta o parâmetro.

---

## Edge Cases

- IF the player has 13 power points (Força 5, Manoplas 3 and Punho Pesado) THEN the snapshot SHALL report 13 points and every continuous value SHALL use 10.
- IF a `chip` hit lands on an enemy in `gettingUp` or already down with `downHits` 1 THEN the brain SHALL refuse it under today's rules for non-technique hits, and SHALL accept it when the hit is a technique (`tech: true`).
- WHEN the micro budget is full THEN the micro hit SHALL still show its spark and its number.
- IF the run resets while numbers are alive THEN the numbers SHALL be cleared before the first frame of the new run.
- WHEN the player turns around at rest with the aura on THEN the aura SHALL follow the hand offset of the new `facing` on the next frame.
- IF the scene restarts (`R` outside the shop) THEN the aura SHALL be recreated for the new player and SHALL not keep the old flame.
- WHEN "Corpo de vidro" lowers the max HP below the current HP THEN the current HP SHALL be clamped to the new max, as today.

---

## Implicit-Requirement Dimensions

| Dimension | Resolução |
| --- | --- |
| Input validation & bounds | POW-13 (`mods=` inválido ignorado, nível no teto), POW-07/08 (teto de 10 pontos), POW-05 (12 números) |
| Failure / partial-failure states | N/A porque não há I/O nem gravação; o jogo roda em memória |
| Idempotency / retry / duplicate handling | POW-05 (fusão por alvo em 300 ms); POW-01 (o `sync` por quadro grava o mesmo valor) |
| Auth boundaries & rate limits | POW-03 e POW-14 (teto de 60 ms de micro por segundo); auth N/A porque é jogo local |
| Concurrency / ordering | POW-01 (o `sync` antes do `heal` da compra de `vida`); edge case do reset com números vivos |
| Data lifecycle / expiry | POW-05 (vida de 700 ms) e POW-06 (limpa no reset da run e na troca de área) |
| Observability | POW-13 (snapshot) e POW-15 (evento `chip:<id>`) |
| External-dependency failure | N/A porque não há dependência externa em jogo |
| State-transition integrity | POW-03 (o chip não muda o estado do cérebro), POW-10 (aura só no repouso) |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| POW-01 | P1: Um dono para os multiplicadores | Tasks (T1, T2, T25) | Pending |
| POW-02 | P1: Um dono para os multiplicadores | Tasks (T2, T11, T12) | Pending |
| POW-03 | P1: O dano frequente não trava o jogo | Tasks (T3-T8) | Pending |
| POW-04 | P1: O dano frequente não trava o jogo | Tasks (T8) | Pending |
| POW-05 | P2: Todo acerto mostra o número | Tasks (T9, T10) | Pending |
| POW-06 | P2: Todo acerto mostra o número | Tasks (T10-T13) | Pending |
| POW-07 | P1: A força se vê e se sente a cada ponto | Tasks (T14, T17) | Pending |
| POW-08 | P1: A força se vê e se sente a cada ponto | Tasks (T14-T19) | Pending |
| POW-09 | P1: A força se vê e se sente a cada ponto | Tasks (T14, T18, T19) | Pending |
| POW-10 | P1: A força se vê e se sente a cada ponto | Tasks (T14, T20) | Pending |
| POW-11 | P2: O objeto na mão bate como o soco | Tasks (T21-T23) | Pending |
| POW-13 | P2: Debug e snapshot da força | Tasks (T10, T17, T24, T25) | Pending |
| POW-14 | P1: O dano frequente não trava o jogo | Tasks (T3, T7, T26) | Pending |
| POW-15 | P1: O dano frequente não trava o jogo | Tasks (T4, T6, T8) | Pending |

**Coverage:** 14 total, 14 mapped to tasks, 0 unmapped (ver `tasks.md`). O POW-12 do plano saiu da F29 (ver Out of Scope).

---

## Success Criteria

- [ ] O usuário joga com Força 0, 2, 5 e com Manoplas no nível 3 e vê o soco forte mudar a cada compra.
- [ ] O Azul com 5 inimigos não congela a tela, e o inimigo preso ainda ataca.
- [ ] Gate verde; `power.smoke.mjs` verde; os smokes da lista do design verdes (com o `armed` repetido isolado se
      falhar, ARM-12).
- [ ] A `TestScene` termina com 393 linhas efetivas ou menos.
