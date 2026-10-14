# Chefes com afixos — Specification

## Problem Statement

Hoje todo chefe é previsível: a r5 e a r10 trazem sempre o Oni do Portão (`archetypeFor`, paridade por tier em
`core/bossTier.ts`), o ciclo de ataques é uma constante única para os dois arquétipos (`CYCLES` em `core/bossAI.ts`) e
nada muda de uma run para outra. O loop do jogo é "morrer e rejogar com outra build" (plano, seção 5.8 e linha F32 da
seção 6): o chefe precisa ser outra luta a cada run, já na 1ª, sem arte HD nova de chefe.

## Goals

- [ ] Duas seeds diferentes dão, na r5, chefes diferentes em arquétipo ou afixo (a 1ª run já vê variação).
- [ ] Cada um dos 4 afixos da leva 1 (Ígneo, Invocador, Sangue Convergente, Adaptativo) muda o jeito de lutar e se lê
      na tela (barra, contorno ou marca própria) antes do primeiro golpe dele.
- [ ] O jogador sabe na loja anterior quem vem: "Próximo: Tecelã · Adaptativa".
- [ ] Toda regra nova é pura em `src/core/` e testada em Node; o `Boss.ts` só liga a tuning derivada ao motor.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Afixos da leva 2 (Enfurecido, Couraça, Sobrecarregado, Pele de Dragão) | Plano 5.8: leva 2 (F41). A regra de incompatibilidade fica pronta, a lista de pares da leva 1 é vazia |
| Dedos do player e o +8% de Portador por Dedo | Os Dedos não existem (F41); a chance do Portador é fixa nesta fase |
| Faixa de acerto (`Hit.band`, chip) | É da F29 em outro branch; a lava usa o caminho de dano do player de hoje, com intervalo |
| Chefe novo (Mahoraga) e qualquer arte HD de chefe | Feature de arte à parte (plano 5.8); aqui só arte B: contorno, linhas, roda e textos em código |
| Recolor do Oni legado | Plano 5.8: não há recolor |
| Elites com afixo, Graus, câmera da arena-portão (zoom 1,8) | F38 e F26 |
| Baú do chefe (`bossChest`) | F33 |
| Escala de HP/dano dos comuns por rodada | F30; os comuns invocados usam a escala que já existe (`scaleFor`) |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Quantidade de afixos | Exatamente o teto do tier: 1 leve (r5), 1 (r10), 2 (r15, r20), 3 (r25 em diante) | O plano fala em "teto" mas a r5 promete "1 afixo leve"; chefe sem afixo não cumpre "cada chefe é outra luta" | n |
| Pool leve | Só Ígneo e Invocador, sorteados com chance igual | Plano 5.8: mudam o padrão de ataque sem somar número | y (plano) |
| Arquétipo | 50% Oni, 50% Tecelã em toda rodada de chefe, pelo stream `bossAffixRng` | Plano 5.8: "o arquétipo sai do `bossAffixRng`"; a Tecelã pode aparecer na r5 | y (plano) |
| Ordem de consumo do stream | Para cada rodada de chefe, na 1ª vez que alguém pede: arquétipo, depois afixos, depois Portador; o resultado fica guardado por rodada | Area (`roundStart`), spawner e loja pedem o mesmo chefe em momentos diferentes e precisam ver o mesmo | n |
| Salt do stream | `seed ^ 0x9b05688c` em `run.ts`, ao lado dos outros | Plano 6: todo sorteio novo tem stream com salt em `run.ts`; o valor só precisa ser diferente dos 10 que já existem | n |
| Parâmetros de debug | `?debug&bossArch=oni\|tecela`, `?debug&bossAffix=igneo,invocador,sangue,adaptativo` ou `none`, `?debug&finger=1\|0`; o stream é consumido igual com ou sem eles | Mesmo padrão do `enemyVariant` (EVR-04): o override manda no resultado sem mudar a sequência | n |
| Smokes antigos de chefe | `boss`, `boss-prop`, `boss-punish`, `boss-victory` e `world-boss` passam a fixar `bossArch` e `bossAffix=none` | Com afixo sorteado, lava e invocados tornariam esses cenários instáveis; o que eles medem não muda | n |
| Gênero do nome | Cada afixo e a moldura têm forma masculina (Oni) e feminina (Tecelã): Ígneo/Ígnea, Invocador/Invocadora, Sangue Convergente, Adaptativo/Adaptativa, Portador/Portadora de Dedo | O exemplo do plano é "Tecelã · Adaptativa · Portadora de Dedo" | y (plano) |
| Nome curto no aviso | "Oni" e "Tecelã" no aviso da loja; a barra usa o nome inteiro de hoje | Exemplo do plano; a barra já mostra o nome inteiro | y (plano) |
| Lava do Ígneo | Faixa no chão do trecho que a investida percorreu, por 2000 ms; tique de 4 × multiplicador de dano do tier (arredondado) a cada 600 ms enquanto o player está no chão encostado nela; o golpe é `low` e `unblockable`, sem empurrão | "chip no player" sem a faixa da F29; 600 ms passa dos 300 ms de invulnerabilidade + 200 ms de atordoamento do player (`PLAYER_HEALTH`), então ele sempre tem tempo de sair; pular por cima evita (DEF-17) | n |
| Invocador | Na troca para a fase 2 e para a fase 3, 3 comuns (2 na r5); nunca mais de 4 invocados vivos (o excedente não nasce) | Plano 5.8; o teto impede a tela encher se o jogador não limpar | n |
| Invocados e a rodada | Morte de invocado não chega à `Run` (não conta abate, não fecha a rodada), não dá drop nem consome o stream de loot; na morte do chefe os invocados vivos somem com fumaça | A rodada de chefe tem tamanho 1 (`WaveSpawner`): a morte de um invocado fecharia a rodada; sem drop não há farm | n |
| Sangue Convergente | Ataque `beam` entra uma vez no ciclo de cada fase, logo depois do 1º ataque; aviso de 800 ms (linha que engrossa na altura do peito, do chefe até a borda da tela no lado em que ele olha), depois 250 ms de feixe com um acerto `high` de 16 × multiplicador do tier | Plano 5.8 dá só o aviso de 0,8 s; altura `high` deixa abaixar como resposta (DEF-11) e a guarda segura com o chip de chefe de hoje | n |
| Adaptativo: o que conta | Golpes aceitos pelo chefe: corpo a corpo leve, corpo a corpo forte (pela `strength`, objeto incluído) e cada técnica pelo seu `TechId`. Kokusen, finalizador e parry não contam nem são reduzidos | O plano conta leve, forte e cada técnica; Kokusen, finalizador e parry premiam leitura e tempo, e o Adaptativo "empurra para a variedade em vez de punir" | n |
| Adaptativo: quando adapta | Depois de cada golpe que conta, a fonte com mais acertos nos últimos 20 s adapta se tiver pelo menos 5 acertos nesse intervalo, não estiver adaptada e houver menos de 2 adaptações; empate fica com a que chegou ao número primeiro | Sem o mínimo, o 1º golpe da luta já adaptaria; os 20 s, o máximo de 2 e os 10 s de esquecimento são do plano | n |
| Adaptativo: efeito | Dano e postura da fonte adaptada × 0,5, arredondado, nunca abaixo de 1 de dano | Plano: "essa fonte passa a fazer 50%" | n |
| Fonte da técnica no golpe | Hoje o `Hit` não diz qual técnica o gerou (só `tech: true`, por `techMarks` em `game/tech/shared.ts`). O design escolhe o caminho; preferência por não tocar em `core/hit.ts` (a F29 mexe nele) | Restrição de frente paralela | n |
| Ciclos por arquétipo | Fase 1 igual à de hoje nos dois. Oni: fase 2 `doubleCharge, volley, leap`; fase 3 `volley, charge, tripleLeap, doubleCharge`. Tecelã: fase 2 `charge, volley, threadRain`; fase 3 `threadRain, volley, charge, tripleLeap` | A r5 continua legível; os ataques novos aparecem da fase 2 em diante; a Chuva de Fios é da Tecelã (plano) | n |
| Investida Dupla | Investida; ao terminar pelo alcance, vira para o player e investe de novo após 250 ms de preparo, sem descanso entre as duas; parede na 1ª atordoa e cancela a 2ª | "Ataques novos com os quadros de hoje" | n |
| Salto Triplo | 3 saltos seguidos, cada um mirando o X do player na hora de sair, 200 ms entre pousos; hitbox de pouso em cada um, ondas de choque só no 3º, recuperação de pouso só depois do 3º | Seis ondas de choque seriam ilegíveis | n |
| Chuva de Fios | Preparo de 600 ms com 5 marcas no chão em X do player −96, −48, 0, +48, +96 (presas aos limites da arena); depois cada marca vira um fio vertical que acerta uma vez, dano do projétil do tier; dono do golpe é o chefe | Sem sorteio: posições fixas são justas e testáveis; a guarda funciona como na rajada | n |
| Portador de Dedo | A partir da r10, 10% por chefe; escala 1,25 do sprite e do corpo, vida × 1,3 (arredondada), dano × 1,5 em todo ataque (incluindo lava, feixe e fios), +1 projétil na rajada; não ocupa vaga de afixo | Plano 5.8 sem a parte dos Dedos | y (plano) |
| Contorno | Ígneo: laranja (`a`); Invocador: roxo (`u`). Com os dois, alterna a cada 600 ms. Sangue e Adaptativo não têm contorno: leem pela linha e pela roda | Tabela do plano: leitura de cada afixo | y (plano) |
| Glifo na barra | O texto da barra vira "Nome · Afixo · Afixo" e, ao lado da barra, um quadrado de 6 px por afixo na cor dele: Ígneo `a`, Invocador `u`, Sangue `r`, Adaptativo `A`, Portador `R` | `Hud.ts` está na lista de exceções e não cresce: o texto passa pelo `showBossBar(name)` de hoje e o glifo nasce num componente novo | n |
| Roda do Adaptativo | Roda de 8 raios (`A`) sobre a cabeça enquanto houver adaptação; sob ela, o rótulo curto de cada fonte adaptada ("Leve", "Forte" ou o nome curto da técnica) | Não há ícone de técnica ainda (F34); texto curto lê | n |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Chefe sorteado pela seed com 1 afixo leve na r5 ⭐ MVP

**User Story**: Como jogador, quero que o 1º chefe da run já seja diferente da run anterior, para cada run começar com
uma luta nova.

**Why P1**: É o que o jogador nota já na 1ª run (plano, linha F32). Sem o sorteio, os afixos não chegam ao jogo.

**Acceptance Criteria**:

1. BLN-01: The system SHALL compute a boss lineup (archetype, affix list, Finger Bearer flag) for each boss round from a dedicated `bossAffixRng` stream seeded with `seed ^ 0x9b05688c` at run start.
2. BLN-02: WHEN any consumer (arena build, boss spawn, shop announcement) asks for the lineup of round r a second time in the same run THEN the system SHALL return the same lineup without consuming the stream again.
3. BLN-03: The same seed and the same starting round SHALL produce the same lineup for every boss round.
4. BLN-04: The lineup archetype SHALL be `oni` or `tecela` with probability 0.5 each, at every boss tier.
5. BLN-05: WHEN the boss round is r5 (tier 1) THEN the lineup SHALL have exactly 1 affix, drawn from the light pool {Ígneo, Invocador}.
6. BLN-06: WHEN the boss tier is 2 THEN the lineup SHALL have exactly 1 affix from the full pool; WHEN the tier is 3 or 4 THEN exactly 2; WHEN the tier is 5 or more THEN exactly 3.
7. BLN-07: The lineup SHALL never repeat an affix and SHALL never contain both affixes of a pair listed as incompatible in `data/bossAffixes.ts`.
8. BLN-08: The arena background (ARN-05) and the spawned boss SHALL use the lineup archetype, replacing the tier-parity rule of BTIER-04.
9. BLN-09: WHERE `?debug&bossArch=`, `?debug&bossAffix=` or `?debug&finger=` holds a valid value the lineup SHALL use it, and the stream SHALL be consumed exactly as without the parameter.
10. BLN-10: IF a debug parameter value is invalid THEN the system SHALL ignore it and use the drawn value; `bossAffix=none` SHALL yield an empty affix list.
11. BLN-11: The debug snapshot SHALL report the boss `affixes` (ids, in lineup order) and `finger` (boolean).

**Independent Test**: em Node, `bossLineupFor` com seeds 1..50 na r5 dá os dois arquétipos e os dois afixos leves, sempre
1 afixo; no jogo, `?debug&hd=1&area=modular&seed=N&round=5` com seeds diferentes mostra chefes diferentes.

---

### P1: Os 4 afixos da leva 1 ⭐ MVP

**User Story**: Como jogador, quero que cada afixo mude o que eu preciso fazer contra o chefe, para a luta pedir outra
resposta e não só mais vida.

**Why P1**: Sem efeito em jogo o sorteio é só um nome.

**Acceptance Criteria**:

1. AFX-01: The `Boss` adapter SHALL build its `BossBrain` and `BossAI` with a tuning derived from the lineup by a pure function in `src/core/`, instead of the default `BOSS` tuning.
2. AFX-02: The affix data (ids, names in both genders, light flag, outline and glyph colors, numbers) SHALL live in `src/data/bossAffixes.ts` and the rules in `src/core/bossAffix.ts`, with no `phaser` import.
3. IGN-01: WHERE the boss has Ígneo, WHEN a charge ends THEN the system SHALL leave a lava strip on the ground covering the distance that charge traveled.
4. IGN-02: Each lava strip SHALL disappear 2000 ms after it is created.
5. IGN-03: WHILE the player stands on the ground touching a lava strip the system SHALL apply one hit of `round(4 × tier damage multiplier)` every 600 ms through the player's existing `receiveHit` path.
6. IGN-04: The lava hit SHALL have height `low`, `unblockable: true`, force 0 and the boss as owner.
7. IGN-05: WHILE the player is airborne the lava SHALL deal no damage.
8. INV-01: WHERE the boss has Invocador, WHEN the boss changes to phase 2 or phase 3 THEN the system SHALL spawn 3 common enemies, or 2 when the boss round is r5.
9. INV-02: IF spawning would raise the summoned enemies alive above 4 THEN the system SHALL spawn only up to 4 alive.
10. INV-03: WHEN a summoned enemy dies THEN the system SHALL not report the death to the `Run`, SHALL not drop anything and SHALL not consume the loot stream.
11. INV-04: WHEN the boss dies THEN the system SHALL remove every summoned enemy still alive, each with the curse smoke effect.
12. INV-05: The summoned enemies SHALL use the common tuning scaled for the current round and SHALL never be armed.
13. SNG-01: WHERE the boss has Sangue Convergente the attack cycle of every phase SHALL contain one `beam` attack placed right after the cycle's first attack.
14. SNG-02: WHEN a `beam` starts THEN the system SHALL show for 800 ms a horizontal warning line at chest height, from the boss to the screen edge on the side it faces, whose thickness grows from 1 px to 6 px.
15. SNG-03: WHEN the 800 ms warning ends THEN the system SHALL open for 250 ms a beam hitbox on that line that hits the player at most once, with height `high` and `round(16 × tier damage multiplier)` damage.
16. ADP-01: WHERE the boss has Adaptativo the system SHALL record, per source, the hits the boss accepted in the last 20000 ms, where a source is light melee, heavy melee or one technique id.
17. ADP-02: The Kokusen, the finisher and the parry SHALL neither be recorded nor reduced by the Adaptativo.
18. ADP-03: WHEN the boss accepts a recorded hit THEN the source with the most hits in the last 20000 ms SHALL become adapted if it has at least 5 hits, is not adapted yet and fewer than 2 sources are adapted.
19. ADP-04: WHILE a source is adapted every hit from it SHALL deal 50% of its damage and 50% of its poise damage, rounded, with damage never below 1.
20. ADP-05: WHEN an adapted source goes 10000 ms with no hit accepted by the boss THEN the system SHALL forget it.
21. ADP-06: WHILE at least one source is adapted the system SHALL draw an 8-ray wheel over the boss head with the short label of each adapted source under it.
22. ADP-07: The debug snapshot SHALL report the adapted sources of the boss.

**Independent Test**: em Node, cada regra pura (lava por tempo e contato, invocação por fase com teto, ciclo com `beam`,
janela do Adaptativo com o relógio injetado). No jogo, `?debug&hd=1&area=modular&round=10&bossAffix=<id>` mostra cada
afixo; um smoke novo por afixo confere pelo snapshot (lava ativa, invocados, `beam` no ataque, fontes adaptadas).

---

### P2: Ataques novos e ciclos por arquétipo

**User Story**: Como jogador, quero que o Oni e a Tecelã lutem de jeitos diferentes nas fases 2 e 3, para cada
arquétipo ter um padrão próprio para aprender.

**Why P2**: Aumenta a variação sem arte nova, mas a r5 já fica variada só com P1.

**Acceptance Criteria**:

1. CYC-01: The attack cycles SHALL be data per archetype and phase in the boss tuning, replacing the single `CYCLES` constant of `core/bossAI.ts`.
2. CYC-02: The phase 1 cycle of both archetypes SHALL be `charge, leap`, as today.
3. CYC-03: The Oni cycles SHALL be `doubleCharge, volley, leap` in phase 2 and `volley, charge, tripleLeap, doubleCharge` in phase 3.
4. CYC-04: The Tecelã cycles SHALL be `charge, volley, threadRain` in phase 2 and `threadRain, volley, charge, tripleLeap` in phase 3.
5. CYC-05: WHEN a `doubleCharge` first charge ends by reaching its max distance THEN the boss SHALL face the player and start a second charge after a 250 ms windup, with no rest in between.
6. CYC-06: IF the first charge of a `doubleCharge` hits a wall THEN the boss SHALL be wall-stunned (BFX-02) and SHALL not start the second charge.
7. CYC-07: WHEN a `tripleLeap` starts THEN the boss SHALL perform 3 leaps in a row, each aimed at the player X at its takeoff, with 200 ms between a landing and the next takeoff.
8. CYC-08: Each `tripleLeap` landing SHALL open the landing hitbox, only the third landing SHALL emit the shockwaves, and the landing recovery (BFX-04) SHALL apply only after the third.
9. CYC-09: WHEN a `threadRain` starts THEN the system SHALL mark 5 ground positions at the player X −96, −48, 0, +48 and +96 px, clamped to the arena bounds, for a 600 ms windup.
10. CYC-10: WHEN the `threadRain` windup ends THEN each mark SHALL become a vertical thread that hits the player at most once, with the tier projectile damage and the boss as owner.
11. CYC-11: The new attacks SHALL play only animation frames that already exist in the boss sheets.

**Independent Test**: em Node, `BossAI` com a tuning do Oni e da Tecelã percorre os ciclos e emite os eventos de cada
ataque novo; no jogo, `?debug&hd=1&area=modular&round=15&bossArch=oni&bossAffix=none` mostra a Investida Dupla na fase 2.

---

### P2: Moldura Portador de Dedo

**User Story**: Como jogador que chega longe, quero às vezes encontrar um chefe maior e mais perigoso, para a run ter
picos de tensão.

**Why P2**: É raro (10%) e só a partir da r10; P1 não depende dele.

**Acceptance Criteria**:

1. PDD-01: WHEN the boss round is r10 or later THEN the lineup SHALL be a Finger Bearer with probability 0.10, and SHALL never be one before r10.
2. PDD-02: The Finger Bearer frame SHALL not count toward the affix limit of the tier.
3. PDD-03: WHILE the boss is a Finger Bearer its sprite and its physical body SHALL be scaled by 1.25.
4. PDD-04: WHILE the boss is a Finger Bearer its max HP SHALL be multiplied by 1.3 (rounded) and the damage of every boss attack, lava, beam and thread by 1.5 (rounded).
5. PDD-05: WHILE the boss is a Finger Bearer its volley SHALL fire one more projectile than the archetype count.

**Independent Test**: em Node, `bossSpecFor` com Portador dá vida, dano e projéteis esperados; no jogo, `?debug&hd=1&area=modular&round=10&finger=1`.

---

### P1: Leitura: barra, contorno e aviso na loja ⭐ MVP

**User Story**: Como jogador, quero saber quem vem e com quais afixos, para me preparar na loja e reconhecer o afixo na luta.

**Why P1**: Afixo que não se lê vira dano injusto; o aviso é o que liga a variação à escolha de build.

**Acceptance Criteria**:

1. BRD-01: WHEN the boss bar is shown THEN its label SHALL read the archetype full name followed by ` · ` and each affix name in the archetype gender, in lineup order, and ` · Portador de Dedo` or ` · Portadora de Dedo` when the boss is a Finger Bearer.
2. BRD-02: WHILE the boss bar is visible the system SHALL draw, next to it, one 6 px glyph per affix (and one for the Finger Bearer) in the color set in `data/bossAffixes.ts`.
3. BRD-03: WHERE the boss has Ígneo or Invocador the boss sprite SHALL have a 1 px outline in that affix color; WHERE it has both the outline SHALL alternate between the two colors every 600 ms.
4. BRD-04: WHEN the shop opens and the next round is a boss round THEN the system SHALL show the text `Próximo: <nome curto> · <afixos> [· Portador(a) de Dedo]` until the shop closes.
5. BRD-05: WHEN the shop opens and the next round is not a boss round THEN the system SHALL show no announcement.
6. BRD-06: The announced lineup SHALL be identical to the boss that spawns in the next round (BLN-02).
7. BRD-07: Every color used by the outline, glyphs, lava, warning line, beam, threads and wheel SHALL come from `PALETTE`.
8. BRD-08: The debug snapshot SHALL report the shop announcement text while it is shown.

**Independent Test**: `?debug&hd=1&area=modular&seed=N&round=4` → limpar a rodada → a loja mostra "Próximo: …" → a r5
traz o chefe anunciado, com o mesmo texto na barra e o contorno do afixo.

---

## Edge Cases

- IF the boss dies while lava strips exist THEN the system SHALL remove every lava strip at once.
- IF the boss is interrupted (stagger, roar, wall stun) during a `beam` warning or a `threadRain` windup THEN the system SHALL cancel the attack and its warning without opening the hitbox (BAI-05).
- WHEN the boss changes phase during a `doubleCharge` or a `tripleLeap` THEN the chained attack SHALL stop and the new phase cycle SHALL start from its first attack.
- IF the player dies with summoned enemies alive THEN the new run SHALL start with no summoned enemies and no lava.
- WHEN the run starts directly on a boss round (`?round=N`) THEN the lineup SHALL be drawn at the first request of that round, with the same rules.
- IF the Invocador triggers while the arena has no free enemy spawn point THEN the system SHALL spawn at the point farthest from the player.
- WHEN a Finger Bearer has Ígneo THEN the lava tick damage SHALL also be multiplied by 1.5.

---

## Notas para o design (conferidas no código)

- Pontos de mudança: `core/bossTier.ts` (`archetypeFor`, `bossSpecFor`), `core/bossAI.ts` (`CYCLES`, `BossAttack`),
  `core/run.ts` (`resolveStart`, linhas 297-307), `game/Boss.ts:72-73` (`new BossBrain(spec.maxHp)`, `new BossAI()`),
  `scenes/test/spawner.ts` (`spawnBoss`, `onBossDefeated`), `scenes/test/areaDirector.ts:83` (arquétipo da arena),
  `scenes/test/snapshot.ts` (campos do chefe).
- `Boss.ts` tem 381 linhas: lava, feixe, fios, roda, contorno e invocação nascem em arquivos novos (por exemplo
  `game/boss/`), e o `Boss.ts` só delega.
- `Hud.ts` está nas exceções do lint e não cresce; `ShopPanel` não cresce (plano 6). O aviso da loja e o glifo nascem
  em componente novo, ligado por um diretor novo ou pelo `UiSetup`; `shopDirector.ts` recebe no máximo uma linha.
- `TestScene.ts` não ganha linha. Arquivos da F29 (`effects`, `combat`, `impactFx`, `hit`, `enemyBrain`,
  `EnemyDefense`, `strikes`, `Player`, `vowDirector`, `arsenalDirector`, `shopDirector`) só no mínimo indispensável.
- Testes novos em arquivos novos; `tests/core/bossBrain.test.ts` está nas exceções e não cresce. `tests/core/bossTier.test.ts`
  acompanha a troca do BTIER-04. Smoke novo usa `hd=1&area=modular`.
- README: `round=5` deixa de "abrir o Oni do Portão"; documentar `bossArch`, `bossAffix` e `finger`.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| BLN-01 | P1: Chefe sorteado pela seed | Tasks (T7) | Pending |
| BLN-02 | P1: Chefe sorteado pela seed | Tasks (T8) | Pending |
| BLN-03 | P1: Chefe sorteado pela seed | Tasks (T8) | Pending |
| BLN-04 | P1: Chefe sorteado pela seed | Tasks (T8) | Pending |
| BLN-05 | P1: Chefe sorteado pela seed | Tasks (T8) | Pending |
| BLN-06 | P1: Chefe sorteado pela seed | Tasks (T8) | Pending |
| BLN-07 | P1: Chefe sorteado pela seed | Tasks (T8) | Pending |
| BLN-08 | P1: Chefe sorteado pela seed | Tasks (T12) | Pending |
| BLN-09 | P1: Chefe sorteado pela seed | Tasks (T1, T9, T12) | Pending |
| BLN-10 | P1: Chefe sorteado pela seed | Tasks (T9) | Pending |
| BLN-11 | P1: Chefe sorteado pela seed | Tasks (T12) | Pending |
| AFX-01 | P1: Os 4 afixos da leva 1 | Tasks (T15, T25) | Pending |
| AFX-02 | P1: Os 4 afixos da leva 1 | Tasks (T6) | Pending |
| IGN-01 | P1: Os 4 afixos da leva 1 | Tasks (T17, T28) | Pending |
| IGN-02 | P1: Os 4 afixos da leva 1 | Tasks (T21, T28) | Pending |
| IGN-03 | P1: Os 4 afixos da leva 1 | Tasks (T21, T28) | Pending |
| IGN-04 | P1: Os 4 afixos da leva 1 | Tasks (T28) | Pending |
| IGN-05 | P1: Os 4 afixos da leva 1 | Tasks (T21, T28) | Pending |
| INV-01 | P1: Os 4 afixos da leva 1 | Tasks (T24, T31) | Pending |
| INV-02 | P1: Os 4 afixos da leva 1 | Tasks (T24, T31) | Pending |
| INV-03 | P1: Os 4 afixos da leva 1 | Tasks (T31) | Pending |
| INV-04 | P1: Os 4 afixos da leva 1 | Tasks (T31) | Pending |
| INV-05 | P1: Os 4 afixos da leva 1 | Tasks (T31) | Pending |
| SNG-01 | P1: Os 4 afixos da leva 1 | Tasks (T15, T30) | Pending |
| SNG-02 | P1: Os 4 afixos da leva 1 | Tasks (T16, T20, T30) | Pending |
| SNG-03 | P1: Os 4 afixos da leva 1 | Tasks (T20, T30) | Pending |
| ADP-01 | P1: Os 4 afixos da leva 1 | Tasks (T22, T32, T33) | Pending |
| ADP-02 | P1: Os 4 afixos da leva 1 | Tasks (T22, T33) | Pending |
| ADP-03 | P1: Os 4 afixos da leva 1 | Tasks (T22) | Pending |
| ADP-04 | P1: Os 4 afixos da leva 1 | Tasks (T22, T23, T33) | Pending |
| ADP-05 | P1: Os 4 afixos da leva 1 | Tasks (T22) | Pending |
| ADP-06 | P1: Os 4 afixos da leva 1 | Tasks (T33) | Pending |
| ADP-07 | P1: Os 4 afixos da leva 1 | Tasks (T33) | Pending |
| CYC-01 | P2: Ataques novos e ciclos por arquétipo | Tasks (T5, T15) | Pending |
| CYC-02 | P2: Ataques novos e ciclos por arquétipo | Tasks (T15) | Pending |
| CYC-03 | P2: Ataques novos e ciclos por arquétipo | Tasks (T15, T25) | Pending |
| CYC-04 | P2: Ataques novos e ciclos por arquétipo | Tasks (T15, T26) | Pending |
| CYC-05 | P2: Ataques novos e ciclos por arquétipo | Tasks (T18, T25) | Pending |
| CYC-06 | P2: Ataques novos e ciclos por arquétipo | Tasks (T18, T25) | Pending |
| CYC-07 | P2: Ataques novos e ciclos por arquétipo | Tasks (T19, T25) | Pending |
| CYC-08 | P2: Ataques novos e ciclos por arquétipo | Tasks (T19, T25) | Pending |
| CYC-09 | P2: Ataques novos e ciclos por arquétipo | Tasks (T16, T20, T26) | Pending |
| CYC-10 | P2: Ataques novos e ciclos por arquétipo | Tasks (T20, T26) | Pending |
| CYC-11 | P2: Ataques novos e ciclos por arquétipo | Tasks (T16, T25) | Pending |
| PDD-01 | P2: Moldura Portador de Dedo | Tasks (T8) | Pending |
| PDD-02 | P2: Moldura Portador de Dedo | Tasks (T8) | Pending |
| PDD-03 | P2: Moldura Portador de Dedo | Tasks (T3, T10, T27) | Pending |
| PDD-04 | P2: Moldura Portador de Dedo | Tasks (T10, T27) | Pending |
| PDD-05 | P2: Moldura Portador de Dedo | Tasks (T10, T27) | Pending |
| BRD-01 | P1: Leitura: barra, contorno e aviso na loja | Tasks (T11, T13) | Pending |
| BRD-02 | P1: Leitura: barra, contorno e aviso na loja | Tasks (T11, T13) | Pending |
| BRD-03 | P1: Leitura: barra, contorno e aviso na loja | Tasks (T11, T29) | Pending |
| BRD-04 | P1: Leitura: barra, contorno e aviso na loja | Tasks (T11, T14) | Pending |
| BRD-05 | P1: Leitura: barra, contorno e aviso na loja | Tasks (T14) | Pending |
| BRD-06 | P1: Leitura: barra, contorno e aviso na loja | Tasks (T14) | Pending |
| BRD-07 | P1: Leitura: barra, contorno e aviso na loja | Tasks (T6, T13, T26, T28, T29, T30, T33) | Pending |
| BRD-08 | P1: Leitura: barra, contorno e aviso na loja | Tasks (T14) | Pending |

**Coverage:** 57 total, 57 mapped to tasks, 0 unmapped (fase Tasks).

---

## Success Criteria

- [ ] Em 20 seeds seguidas, a r5 mostra os 2 arquétipos e os 2 afixos leves (teste de Node sobre `bossLineupFor`).
- [ ] O usuário joga a r5 com Ígneo e com Invocador e a r10 com Sangue Convergente e com Adaptativo, e diz que cada
      um pede outra resposta.
- [ ] O aviso da loja bate com o chefe que nasce em 100% dos casos (smoke).
- [ ] Gate verde; smokes `boss` (com o chefe fixado por debug) e os novos de afixo verdes; `TestScene.ts` sem linha nova.
