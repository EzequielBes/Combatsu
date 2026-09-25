# Energia e técnicas amaldiçoadas — Specification

## Problem Statement

Hoje o jogador só tem o corpo a corpo. Falta o que faz um feiticeiro jujutsu ser um feiticeiro: energia amaldiçoada e técnicas que ele conjura, com o peso visual que o anime dá a cada uma. Uma técnica que só "solta um projétil" não passa a fantasia; o jogador precisa ver o selo de mão, a energia se condensando, o nome sendo chamado, o lançamento e o impacto com os efeitos que ele reconhece do anime.

Esta feature cria a energia amaldiçoada, dois slots de técnica e um ritual de conjuração comum a todas as técnicas, e entrega cinco técnicas com animação e efeitos próprios: Punho Divergente, Kokusen (Black Flash), Reversão de Técnica: Vermelho, Técnica Amplificada: Azul e Desmantelar. O critério de pronto não é só "funciona": cada técnica tem uma direção de arte quadro a quadro, e cada batida dessa direção é observável no snapshot de debug.

## Goals

- [ ] O jogador conjura técnicas gastando energia amaldiçoada, e toda conjuração passa por selo de mão, carga e soltura visíveis antes de causar dano.
- [ ] Acertar o Kokusen depende de timing (não de sorte) e dispara a sequência do anime: tela invertida, raios negros com borda vermelha, cartão 黒閃 e zona.
- [ ] O Vermelho e o Azul se leem como opostos: o Vermelho empurra (faíscas saindo, explosão que repele) e o Azul puxa (espiral entrando, implosão).
- [ ] Toda regra de energia, conjuração, janela do Kokusen, zona e geração de raios vive em `src/core`/`src/data` e é testada em Node (AD-001); todo efeito é verificável pelo snapshot de debug ou por teste de dados.
- [ ] Nenhum efeito de técnica deixa objetos vivos na cena: tudo some até 300 ms depois do fim do efeito.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Vazio Roxo, Expansão de Domínio (Vazio Infinito), Encantamento | Vão para a F9 `tecnicas-avancadas`; dependem das técnicas desta feature estarem estáveis |
| Kokusen nos golpes comuns do combo | F8 reusa a regra de janela desta feature no finalizador do combo |
| Oferta e compra de técnicas na loja | F4; esta feature expõe `equip`/`upgrade` para a loja chamar e usa `?debug&tech=` para testar |
| Som, voz e trilha | Não há assets; pode virar feature própria com síntese WebAudio |
| Técnicas usadas pelos inimigos ou pelo chefe | Muda a leitura das lutas da F1/F2; fica para depois |
| Técnicas com nível acima de 3 | AD-005 fixa os níveis 1–3 |

---

## Assumptions & Open Questions

Todas as decisões abaixo foram tomadas pelo agente por delegação do usuário ("vai tomando as decisões… o jogo tem que ser divertido"; pedido de 25/09 de fidelidade ao anime). Números ficam em `src/data/techniques.ts` e `src/data/tuning.ts`.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Onde vive o Kokusen | Nesta feature (P1), no 2º impacto do Punho Divergente; a F8 só estende a regra ao combo | No anime o Yuji acerta o Black Flash no Punho Divergente quando o atraso da energia some; o usuário pediu o Kokusen nesta US | y |
| Como se acerta o Kokusen | Timing: apertar de novo a tecla do slot nos 80 ms antes do 2º impacto; um anel de aproximação que encolhe sobre o alvo marca o ritmo | Habilidade e não sorte; a janela curta faz cada acerto ser comemorado | y |
| Prioridade do Vermelho | P1 (era P3 no esboço) | Pedido explícito do usuário | y |
| Divisão do escopo | Roxo, Domínio e Encantamento vão para a F9 | Mantém a F5 executável num ciclo | y |
| Arte das técnicas | Grades de texto (AD-002) + geometria procedural e postFX do Phaser, com cores só da `PALETTE` e geometria na grade de 2 px (AD-009) | Raios, anéis e inversão de tela não saem bem só de sprites fixos | y |
| Cores novas da paleta | `b` preto do Kokusen, `R` vermelho-vivo, `W` branco puro, `d` azul-profundo | O Kokusen precisa de preto puro e vermelho saturado; o Azul precisa de um núcleo mais fundo que `c` | y |
| Nomes das técnicas na tela | Kanji desenhado em grade de texto (黒, 閃, 赫, 蒼, 解) + nome em português em texto | Não depende de fonte CJK instalada; é o que o anime mostra | y |
| Teclas | Slot 1: `L` ou `C`; slot 2: `I` ou `V` | Ficam ao lado de J/K (ataque/interação) e de X/Z (setas) | y |
| Energia | Máx. 100, regen 8/s, +3 por golpe corpo a corpo aplicado; regen para durante a conjuração | Uma técnica cara a cada ~6 s sem bater; bater acelera, o que premia agressividade | y |
| Custo e recarga | Custo pago na soltura; recarga começa na soltura | Ser interrompido não pune duas vezes | y |
| Conjurar no ar | Permitido; no selo e na carga a gravidade vale 30% | Pose de "pairar" do Gojo; dá jogadas aéreas | y |
| Conjurar durante golpe | Só na fase `recover` do golpe corpo a corpo; nunca segurando objeto nem em hitstun | Um cancel simples e divertido sem abrir o sistema de cancel da F8 | y |
| Tempo das técnicas | Todo tempo de técnica conta em tempo de jogo, que para durante o hitstop | Mesmo modelo dos golpes e do chefe | y |
| Efeitos durante o hitstop | Efeitos presos ao gameplay pausam com o hitstop; as camadas cinemáticas do Kokusen (inversão, duotom, raios, cartão) correm em tempo real | O anime congela a ação e anima o raio por cima; sem isso o Kokusen fica estático | y |
| Níveis 1–3 | Dano ×1,0 / ×1,25 / ×1,5 (arredondado); custo −0 / −5 / −10 | Curva simples para a loja da F4 | y |
| Energia do Kokusen | +30 (com teto) | No anime a energia flui melhor depois do Black Flash | y |
| Zona | 8 s; janela passa de 80 para 140 ms; cada Kokusen na zona renova os 8 s | "Estar na zona" do anime; recompensa encadear | y |
| Azul contra o chefe | Aplica dano, não puxa | O chefe tem peso e padrões próprios (F2) | y |
| Renderer sem WebGL | Pula os postFX e mantém os efeitos em sprite e geometria | Não quebrar o jogo em máquina sem WebGL; o smoke headless pode cair em Canvas | y |

**Open questions:** none - all resolved or logged above.

**Refinamento Jev (AD-007):** pulado em 25/09 porque `TYPESAFE_API_KEY` não estava no ambiente. No lugar, uma revisão manual dividiu os 7 ACs que juntavam dois comportamentos (CE-09, TEC-12, CAST-19, CAST-20, RED-15, RED-16, BLU-11). Rodar `node tools/jev-refine.mjs` antes do Design, quando a chave estiver disponível.

**Implicit-requirement dimensions sweep:**
- State-transition integrity: coberta por CAST-01..CAST-20 (máquina `sign → charge → release → recover`, cancelamento) e KOK-03..KOK-05 (janela, trava por tentativa).
- Input validation & bounds: coberta por CE-02, CE-03 (energia entre 0 e o máximo), CE-07/CE-09 (tetos dos upgrades) e TEC-04/TEC-05 (slot duplicado e nível fora de 1–3).
- Failure / partial-failure states: coberta por CAST-05/CAST-06 (sem energia, em recarga) e TFX-06 (sem WebGL).
- Idempotency / duplicate handling: coberta por CAST-03 (custo pago uma vez), RED-06 (cada inimigo atingido uma vez por Vermelho) e KOK-04 (um Kokusen por Punho Divergente).
- Auth boundaries & rate limits: N/A because é um jogo local sem contas; o "limite de taxa" das técnicas é a recarga (CAST-06).
- Concurrency / ordering: coberta por CAST-08 (uma conjuração por vez), KOK-12 (Kokusen e limiar de fase no mesmo frame) e pela regra de hitstop (TFX-05).
- Data lifecycle / expiry: coberta por TFX-03 (objetos de efeito somem) e pelos edge cases de morte e nova run.
- Observability: coberta por TEC-08 e pelos campos `ce`, `tech`, `kokusen`, `techObjects` e `fx` do snapshot, e pelos `events` de cada story.
- External-dependency failure: coberta por TFX-06 (renderer sem WebGL).

---

## Snapshot de debug (contrato usado pelos ACs)

Campos novos em `GameSnapshot` (`src/game/debugApi.ts`), lidos do estado vivo:

```ts
ce: { cur: number; max: number; regen: number };
tech: {
  slots: [{ id: TechId; level: 1 | 2 | 3; cooldownMs: number } | null, { … } | null];
  cast: { slot: 0 | 1; id: TechId; state: 'sign' | 'charge' | 'release' | 'recover'; elapsedMs: number } | null;
};
kokusen: { zone: boolean; zoneMs: number; streak: number; windowOpen: boolean };
techObjects: { id: number; kind: 'red' | 'blue'; x: number; y: number; traveled: number }[];
fx: { live: number; degraded: boolean; layers: string[] };
```

`TechId` = `'divergente' | 'vermelho' | 'azul' | 'corte'` (o Kokusen não é técnica de slot: é o resultado do Punho Divergente). `fx.layers` lista os nomes das camadas de efeito vivas (ex.: `kokusen.invert`), e é por ela que o smoke confere cada batida da direção de arte.

---

## User Stories

### P1: Energia amaldiçoada e slots ⭐ MVP

**User Story**: Como jogador, quero uma barra de energia amaldiçoada e dois slots de técnica, para decidir quando gastar energia e ver o que tenho equipado.

**Why P1**: Toda técnica depende disso.

**Acceptance Criteria**:

1. CE-01: WHEN a run starts THEN the player cursed energy SHALL be 100 with max 100 and regen 8 per second.
2. CE-02: The cursed energy SHALL never be below 0.
3. CE-03: The cursed energy SHALL never be above its max.
4. CE-04: WHILE no cast is in progress, the cursed energy SHALL increase by `regen × dt / 1000` per frame of game time, capped at max.
5. CE-05: WHILE a cast is in progress (any cast state), the cursed energy SHALL NOT regenerate.
6. CE-06: WHEN a basic melee hit (jab, cross, kick or prop hit) is applied to an enemy or the boss THEN the cursed energy SHALL increase by 3, capped at max.
7. CE-07: WHEN the max upgrade is applied at level `n` (n ≥ 0) THEN max SHALL be `min(100 + 20n, 200)`.
8. CE-09: WHEN the regen upgrade is applied at level `n` (n ≥ 0) THEN regen SHALL be `min(8 + 2n, 16)`.
9. CE-08: WHEN a technique hit (any damage dealt by a technique) is applied THEN the cursed energy SHALL NOT increase from the CE-06 rule.
10. TEC-01: WHEN a run starts without the `tech` debug parameter THEN both technique slots SHALL be empty (AD-005).
11. TEC-02: WHERE the debug mode is on and the URL has `tech=<id>[,<id>]` THEN the slots SHALL start with those techniques at level 1, in order, ignoring unknown ids.
12. TEC-03: WHEN `equip(slot, id, level)` is called with a valid slot, a known id and a level in 1–3 THEN that slot SHALL hold that technique at that level.
13. TEC-04: IF `equip` is called with an id already in the other slot THEN the loadout SHALL stay unchanged and the call SHALL return `false`.
14. TEC-05: IF `equip` or `upgrade` would set a level outside 1–3 THEN the loadout SHALL stay unchanged and the call SHALL return `false`.
15. TEC-06: For a technique at level `n`, its damage values SHALL be the level-1 values multiplied by 1.0, 1.25 or 1.5 (n = 1, 2, 3) and rounded to the nearest integer, and its cost SHALL be the level-1 cost minus 0, 5 or 10.
16. TEC-07: The HUD SHALL show the cursed energy bar under the HP bar, with fill width `barWidth × cur / max` (±1 px).
17. TEC-12: The energy bar SHALL show one mark per equipped technique at `barWidth × cost / max` px from its left edge (±1 px).
18. TEC-09: The HUD SHALL show one icon per slot next to the energy bar, with a dark overlay whose height is `iconHeight × cooldownMs / cooldownTotal` (±1 px).
19. TEC-10: WHEN a cast is denied for lack of energy THEN the energy bar SHALL flash in `R` for 300 ms.
20. TEC-08: WHERE the debug mode is on, the snapshot SHALL include `ce` and `tech` as defined in the snapshot contract.
21. TEC-11: The energy bar and slot icons SHALL be in the main camera's ignore list and their colors SHALL belong to `PALETTE` (data test).

**Independent Test**: `energy.test.ts` e `loadout.test.ts` em Node (limites 0/máx., regen com e sem conjuração, +3, tetos dos upgrades nos níveis 5/6 e 4/5, duplicado, nível 0 e 4); smoke `tech.smoke.mjs` com `?debug&tech=vermelho` confere barra, marca e ícone.

---

### P1: Conjuração — selo, carga e soltura ⭐ MVP

**User Story**: Como jogador, quero que toda técnica tenha um ritual visível — selo de mão, energia se condensando, o nome chamado e a soltura — para sentir que estou conjurando uma técnica, não apertando um botão de tiro.

**Why P1**: É o que dá a sensação de anime a todas as técnicas; sem isso cada técnica precisaria inventar a própria.

**Direção de arte (beats do anime)**:
1. **Selo** — o player trava no frame do selo de mão daquela técnica (grade 32×24 própria). Uma aura de energia na cor da técnica começa a tremular em volta do corpo (pixels de chama subindo, 2 frames alternando).
2. **Carga** — a aura cresce; a câmera do mundo aproxima devagar (zoom 1,5 → 1,6) como se o mundo prendesse a respiração. No ar, o player quase para de cair.
3. **Chamada** — na soltura, uma faixa no HUD mostra o kanji da técnica em pixel art e o nome em português por 900 ms, deslizando da esquerda.
4. **Soltura** — frame de soltura do player; a câmera volta ao zoom normal em 250 ms.
5. **Recuperação** — frame de recuperação; a aura se apaga em 150 ms.

**Acceptance Criteria**:

1. CAST-01: WHEN the player presses a slot key holding a technique with enough energy and no cooldown THEN a cast SHALL start in the `sign` state.
2. CAST-02: WHEN a cast starts THEN it SHALL go through `sign`, `charge`, `release` and `recover` in that order, each lasting the time defined for that technique.
3. CAST-03: WHEN a cast enters `release` THEN the technique cost SHALL be subtracted from the cursed energy exactly once.
4. CAST-04: WHEN a cast enters `release` THEN the slot cooldown SHALL be set to the technique cooldown.
5. CAST-05: IF the player presses a slot key and the cursed energy is below the cost THEN no cast SHALL start and the snapshot `events` SHALL get `techDenied:energy`.
6. CAST-06: IF the player presses a slot key whose cooldown is above 0 THEN no cast SHALL start and the snapshot `events` SHALL get `techDenied:cooldown`.
7. CAST-07: WHEN the player takes damage during `sign` or `charge` THEN the cast SHALL end without spending energy and without starting the cooldown.
8. CAST-20: WHEN a cast ends by CAST-07 THEN `events` SHALL get `techCancel`.
9. CAST-08: WHILE a cast is in progress, a slot key press SHALL NOT start another cast.
10. CAST-09: IF the player presses a slot key while holding a prop, in hitstun, or in the `startup` or `active` phase of a melee attack THEN no cast SHALL start and `events` SHALL get `techDenied:busy`.
11. CAST-10: WHEN the player presses a slot key during the `recover` phase of a melee attack and CAST-01 holds THEN the melee attack SHALL end and the cast SHALL start in that frame.
12. CAST-11: WHILE the player is airborne in `sign` or `charge`, the gravity applied to the player SHALL be 30% of `PLAYER_MOVE.gravity`.
13. CAST-12: WHILE a cast is in `sign`, `charge`, `release` or `recover`, the player SHALL NOT move horizontally from input.
14. CAST-13: WHILE a cast is in `sign`, the player sprite SHALL show that technique's sign frame; in `charge` its charge frame; in `release` its release frame; in `recover` its recover frame.
15. CAST-14: WHILE a cast is in `sign` or `charge`, `fx.layers` SHALL include `cast.aura`.
16. CAST-15: WHEN a cast enters `charge` THEN the main camera zoom SHALL move from 1.5 to 1.6 over the charge time.
17. CAST-19: WHEN a cast enters `release` THEN the main camera zoom SHALL return to 1.5 within 250 ms.
18. CAST-16: WHEN a cast enters `release` THEN the HUD SHALL show the callout with the technique kanji grid and Portuguese name for 900 ms, reported as `hud.callout` in the snapshot.
19. CAST-17: WHEN a cast enters `release` THEN `events` SHALL get `techCast:<id>`.
20. CAST-18: The sign, charge, release and recover frames of every technique SHALL be 32×24 texels and use only `PALETTE` keys (data test).

**Independent Test**: `cast.test.ts` em Node (ordem dos estados, custo único, cancelamento em `sign`/`charge` e não em `release`, recusas, cancel na `recover` do golpe); smoke confere `tech.cast.state` passo a passo, `cast.aura`, zoom e `hud.callout`.

---

### P1: Punho Divergente ⭐ MVP

**User Story**: Como jogador, quero um soco que acerta duas vezes — o punho e depois a energia atrasada —, como o do Yuji, para ter uma técnica corpo a corpo forte e com ritmo próprio.

**Why P1**: É a técnica mais barata e a base do Kokusen.

**Direção de arte (beats do anime)**:
1. **Preparo** — o punho fica envolto em energia azul (`c`/`C`) tremulando; o player puxa o braço para trás.
2. **1º impacto** — soco esticado; faísca normal de golpe leve no ponto de contato.
3. **O atraso** — nos 200 ms seguintes, o eco da energia chispa no alvo (pontinhos azuis) e um **anel de aproximação** branco encolhe de 32 px até 0 sobre o ponto de contato — é o ritmo do Kokusen.
4. **2º impacto** — anel azul-branco estoura no ponto de contato e uma cópia translúcida do punho aparece deslocada 8 px à frente; o alvo é empurrado.

**Acceptance Criteria**:

1. DIV-01: The Punho Divergente SHALL have cost 20, cooldown 1200 ms, sign 60 ms, charge 60 ms, release 80 ms and recover 200 ms at level 1.
2. DIV-02: WHILE the Punho Divergente is in `release`, a punch hitbox with the cross reach SHALL be open and SHALL hit at most one target.
3. DIV-03: WHEN the punch hitbox touches a target THEN that target SHALL take a first impact of 12 light damage.
4. DIV-04: WHEN 200 ms of game time have passed since the first impact THEN the same target SHALL take a second impact of 18 heavy damage at the first contact point.
5. DIV-05: IF the punch hitbox touches no target during `release` THEN no second impact SHALL happen.
6. DIV-06: IF the target died from the first impact THEN no second impact SHALL happen.
7. DIV-07: WHILE the time since the first impact is between 0 and 200 ms, `fx.layers` SHALL include `divergente.echo` and `divergente.ring`.
8. DIV-08: WHILE the approach ring is visible, its radius SHALL be `32 × (1 − t / 200)` px (±2 px), where `t` is the ms since the first impact.
9. DIV-09: WHEN the second impact happens without a Kokusen THEN `fx.layers` SHALL include `divergente.burst` and `divergente.fistGhost` in that frame and `events` SHALL get `divergent2`.
10. DIV-10: WHILE the Punho Divergente is in `sign` or `charge`, `fx.layers` SHALL include `divergente.fistAura`.

**Independent Test**: `divergent.test.ts` em Node (tempos, um alvo só, 2º impacto aos 199/200 ms, sem 2º quando erra ou mata); smoke com `?debug&tech=divergente` acerta um inimigo e confere hp, eventos e camadas.

---

### P1: Kokusen (Black Flash) ⭐ MVP

**User Story**: Como jogador, quero acertar o Kokusen com o timing perfeito e ver a tela explodir em preto e vermelho como no anime, para sentir o momento mais forte do jogo e querer repetir.

**Why P1**: Pedido central do usuário; é o momento de maior impacto da feature.

**Direção de arte (beats do anime)** — tudo acontece dentro do congelamento do impacto:
1. **Congelamento** — hitstop de 220 ms; o player fica no frame do soco esticado (frame próprio `kokusen-hit`, corpo mais inclinado que o `cross`).
2. **Inversão** — por 2 frames a tela do mundo inverte as cores (negativo). O alvo vira uma silhueta preta (`b`).
3. **Duotom** — por mais 4 frames o mundo fica em preto e vermelho (`b`/`R`).
4. **Raios negros** — de 5 a 8 raios pretos com borda vermelho-viva saem do ponto de contato, com 40 a 110 px, em zigue-zague, redesenhados a cada 2 frames (o raio "pisca" e muda de forma) durante o congelamento e somem em 150 ms depois.
5. **Faíscas e choque** — faíscas vermelhas e pretas em leque na direção do soco; um anel de choque branco expande em 3 frames.
6. **Câmera** — zoom-punch (+12% em 60 ms, volta em 300 ms) e tremida forte.
7. **Cartão** — "黒閃" grande no centro da tela, revelado da esquerda para a direita como uma pincelada, por 800 ms; na zona aparece "×N" ao lado.
8. **Zona** — enquanto dura, uma aura preta com faíscas vermelhas tremula no player, discreta.

**Acceptance Criteria**:

1. KOK-01: WHILE the time since a Punho Divergente first impact is at least 120 ms and at most 200 ms (outside the zone), the Kokusen window SHALL be open (`kokusen.windowOpen === true`).
2. KOK-02: WHILE in the zone, the Kokusen window SHALL be open from 60 ms to 200 ms after the first impact.
3. KOK-03: WHEN the player presses the same slot key while the window is open THEN the second impact SHALL be a Kokusen.
4. KOK-04: WHEN the player presses the same slot key after the first impact and before the window opens THEN that Punho Divergente SHALL NOT produce a Kokusen, and `events` SHALL get `kokusenMiss`.
5. KOK-05: WHILE a Punho Divergente is in `sign`, `charge` or `release` before its first impact, a press of its slot key SHALL NOT count for KOK-03 or KOK-04.
6. KOK-06: WHEN a Kokusen lands THEN the target SHALL take 45 heavy damage (18 × 2.5) instead of the normal second impact.
7. KOK-07: WHEN a Kokusen lands on a regular enemy that survives THEN the enemy SHALL enter ragdoll with twice the heavy-hit knockback.
8. KOK-08: WHEN a Kokusen lands on the boss THEN the boss poise SHALL drop by `3 × 45`, never below 0.
9. KOK-09: WHEN a Kokusen lands THEN the cursed energy SHALL increase by 30, capped at max.
10. KOK-10: WHEN a Kokusen lands THEN the zone SHALL start (or restart) with 8000 ms and `kokusen.streak` SHALL increase by 1.
11. KOK-11: WHEN the zone time reaches 0 THEN the zone SHALL end and `kokusen.streak` SHALL reset to 0.
12. KOK-12: IF a Kokusen takes the boss hp across a phase threshold THEN the boss SHALL enter `roar` (BAI-05) and the Kokusen damage and energy SHALL still apply.
13. KOK-13: WHEN a Kokusen lands THEN the game SHALL apply a hitstop of 220 ms (FX-02: the longest pending hitstop wins).
14. KOK-14: WHEN a Kokusen lands THEN `fx.layers` SHALL include `kokusen.invert` for at least 33 ms of real time (2 frames at 60 fps, rounded up to whole frames).
15. KOK-15: WHEN `kokusen.invert` ends THEN `fx.layers` SHALL include `kokusen.duotone` for at least 66 ms of real time (4 frames at 60 fps, rounded up to whole frames), and SHALL NOT include `kokusen.invert` at the same time.
16. KOK-16: WHILE `kokusen.invert` is active, the target sprite SHALL be drawn as a solid `b` silhouette.
17. KOK-17: WHEN a Kokusen lands THEN `fx.layers` SHALL include `kokusen.bolts` until 150 ms of real time after the hitstop ends.
18. KOK-18: For any seed, `lightningBolts(seed, origin, dir)` SHALL return between 5 and 8 bolts, each with total length between 40 and 110 px.
19. KOK-19: For any seed, every vertex returned by `lightningBolts` SHALL have integer coordinates that are multiples of 2 relative to the origin.
20. KOK-20: WHEN `lightningBolts` is called twice with the same seed, origin and direction THEN it SHALL return the same bolts.
21. KOK-21: WHILE `kokusen.bolts` is active during the hitstop, the bolts SHALL be regenerated with a new seed every 2 frames.
22. KOK-22: The bolt stroke SHALL be `b` with a 1-texel `R` border.
23. KOK-23: WHEN a Kokusen lands THEN `fx.layers` SHALL include `kokusen.sparks` and `kokusen.shock` in that frame.
24. KOK-24: WHEN a Kokusen lands THEN the main camera zoom SHALL reach 1.68 (1.5 × 1.12) within 60 ms of real time and return to 1.5 within the next 300 ms.
25. KOK-25: WHEN a Kokusen lands THEN the HUD SHALL show the 黒閃 card at the screen center for 800 ms, reported as `hud.kokusenCard` in the snapshot.
26. KOK-26: WHILE `kokusen.streak` ≥ 2, the card SHALL show `×N` with N = streak.
27. KOK-27: WHILE the zone is active, `fx.layers` SHALL include `kokusen.zoneAura`.
28. KOK-28: WHEN a Kokusen lands THEN `events` SHALL get exactly one `kokusen` entry.
29. KOK-29: The 黒 and 閃 grids SHALL be 24×24 texels each and use only `PALETTE` keys (data test).

**Independent Test**: `kokusen.test.ts` em Node (janela nos limites 119/120 e 200/201 ms, na zona 59/60 ms, trava por tentativa, zona 7999/8000 ms, streak, dano, energia com teto); `lightning.test.ts` (quantidade, comprimentos, grade de 2 px, determinismo por seed); smoke `kokusen.smoke.mjs` aperta a tecla aos 160 ms e confere camadas, hitstop, zoom, cartão e evento; um segundo cenário aperta aos 60 ms e confere `kokusenMiss`.

---

### P1: Reversão de Técnica: Vermelho ⭐ MVP

**User Story**: Como jogador, quero condensar uma esfera vermelha na ponta dos dedos e lançá-la como o Gojo, com uma explosão que joga os inimigos longe, para limpar a tela com estilo.

**Why P1**: Pedido explícito do usuário; é a técnica de área e de "uau".

**Direção de arte (beats do anime)**:
1. **Selo** — braço esticado para a frente, indicador e médio apontados (frame próprio). Aura vermelha.
2. **Carga** — uma esfera vermelha nasce na ponta dos dedos e cresce em 3 passos (4 → 8 → 12 texels), com núcleo branco-quente (`W`). Faíscas vermelhas são **expelidas** para fora (repulsão — o oposto do Azul). Um anel de brilho pulsa em volta da esfera. A poeira do chão é empurrada para longe dos pés.
3. **Chamada** — "赫 Reversão de Técnica: Vermelho".
4. **Soltura** — a esfera dispara reta; o player recua com o tranco. A esfera deixa um rastro de riscos vermelhos e estala (pequenos raios vermelhos em volta).
5. **Contato** — inimigo tocado é arremessado para longe em ragdoll.
6. **Detonação** — flash branco no núcleo → esfera vermelha expandindo em 3 frames → onda de choque em anel → detritos e fumaça. A tela pisca vermelho por 80 ms e treme.

**Acceptance Criteria**:

1. RED-01: The Vermelho SHALL have cost 45, cooldown 3000 ms, sign 250 ms, charge 350 ms, release 100 ms and recover 250 ms at level 1.
2. RED-02: WHILE the Vermelho is in `charge`, the orb frame SHALL be the 4-texel frame in the first third of the charge time, the 8-texel frame in the second third and the 12-texel frame in the last third.
3. RED-03: WHILE the Vermelho is in `charge`, `fx.layers` SHALL include `red.orb`, `red.sparksOut`, `red.glowRing` and `red.dustPush`.
4. RED-04: The `red.sparksOut` particles SHALL have velocities pointing away from the orb center (the dot product of velocity and offset from the center is positive).
5. RED-05: WHEN the Vermelho enters `release` THEN a red orb SHALL be launched horizontally toward the player's facing at 560 px/s from the fingertip position.
6. RED-15: WHEN the Vermelho enters `release` on the ground THEN the player SHALL be pushed 12 px (±2 px) opposite to its facing.
7. RED-06: WHEN the red orb touches a regular enemy it has not hit before THEN that enemy SHALL take 30 heavy damage and enter ragdoll with an impulse pointing away from the orb.
8. RED-07: WHILE the red orb is in flight, `fx.layers` SHALL include `red.trail` and `red.crackle`.
9. RED-08: WHEN the red orb touches a wall, touches the boss, or has traveled 420 px THEN it SHALL detonate in that frame.
10. RED-09: WHEN the red orb detonates on the boss THEN the boss SHALL take 30 heavy damage.
11. RED-10: WHEN the red orb detonates THEN every regular enemy whose center is within 96 px of the detonation point and that the orb has not hit before SHALL take 25 heavy damage and a radial impulse away from that point.
12. RED-11: WHEN the red orb detonates THEN `fx.layers` SHALL include `red.flashCore`, `red.sphere`, `red.shockRing`, `red.debris` and `red.screenFlash` in that frame.
13. RED-16: WHEN the red orb detonates THEN `events` SHALL get exactly one `redDetonate`.
14. RED-12: WHEN the red orb detonates THEN `red.screenFlash` SHALL last 80 ms and the camera SHALL shake for 200 ms.
15. RED-13: WHEN the red orb detonates THEN it SHALL be removed from `techObjects` in that frame.
16. RED-14: WHILE the red orb is in flight, `techObjects` SHALL list it with `kind: 'red'` and its `traveled` distance.

**Independent Test**: `redOrb.test.ts` em Node (velocidade, alcance 419/420 px, cada inimigo uma vez, raio 95/96/97 px, detonação em parede e no chefe); teste de dados das grades da esfera; smoke `red.smoke.mjs` com `?debug&tech=vermelho` e dois inimigos na linha confere dano, ragdoll, camadas e evento.

---

### P2: Técnica Amplificada: Azul

**User Story**: Como jogador, quero criar um ponto de atração azul que suga os inimigos e os esmaga, para agrupar a tela e combinar com o corpo a corpo.

**Why P2**: Dá controle de grupo e o contraste com o Vermelho; a feature se sustenta sem ela.

**Direção de arte (beats do anime)**:
1. **Selo** — mão erguida à frente, dedos juntos (frame próprio). Aura azul.
2. **Carga** — um ponto azul-profundo (`d`) aparece à frente e engrossa.
3. **Chamada** — "蒼 Técnica Amplificada: Azul".
4. **Esfera ativa** — núcleo `d` com borda ciano (`C`); partículas em espiral **entrando**; anéis de distorção contraindo; pedrinhas do chão sugadas.
5. **Implosão** — a esfera colapsa num ponto branco e some.

**Acceptance Criteria**:

1. BLU-01: The Azul SHALL have cost 35, cooldown 4000 ms, sign 200 ms, charge 250 ms, release 100 ms and recover 200 ms at level 1.
2. BLU-02: WHEN the Azul enters `release` THEN a blue orb SHALL appear 110 px ahead of the player center at the player center height, or 16 px before the first wall if a wall is closer than 110 px.
3. BLU-03: The blue orb SHALL last 1400 ms and SHALL NOT move.
4. BLU-04: WHILE the blue orb exists, every regular enemy whose center is within 130 px of the orb SHALL be moved toward the orb center at 150 px/s.
5. BLU-05: WHILE the blue orb exists, the boss SHALL NOT be moved by it.
6. BLU-06: WHILE the blue orb exists, every 250 ms of its life every enemy and the boss within 130 px SHALL take 5 light damage.
7. BLU-07: WHEN the blue orb reaches 1400 ms THEN every enemy and the boss within 130 px SHALL take 10 light damage.
8. BLU-11: WHEN the blue orb reaches 1400 ms THEN it SHALL be removed from `techObjects` and `events` SHALL get exactly one `blueImplode`.
9. BLU-08: WHILE the blue orb exists, `fx.layers` SHALL include `blue.core`, `blue.spiralIn`, `blue.distortRing` and `blue.debrisIn`.
10. BLU-09: The `blue.spiralIn` particles SHALL have velocities with a component pointing toward the orb center (the dot product of velocity and offset from the center is negative).
11. BLU-10: WHILE the blue orb exists, `techObjects` SHALL list it with `kind: 'blue'`.

**Independent Test**: `blueOrb.test.ts` em Node (posição com e sem parede, raio 129/130/131 px, 5 ticks + implosão, chefe não puxado); smoke com `?debug&tech=azul` confere puxão, dano e camadas.

---

### P2: Desmantelar

**User Story**: Como jogador, quero um corte invisível e instantâneo à distância, para acertar quem está fora do alcance do soco sem esperar um projétil.

**Why P2**: Completa o conjunto com uma técnica rápida; não é base de outras.

**Direção de arte (beats do anime)**:
1. **Selo** — gesto rápido de dois dedos cortando o ar (frame próprio). Aura branca curta.
2. **Chamada** — "解 Desmantelar".
3. **Cortes** — nada avisa. Cada corte aparece como uma linha branca fina (1 texel, `W`) cruzando a área num ângulo diferente, por 1 frame cheia e depois some em 120 ms; o alvo pisca partido ao meio (duas metades deslocadas 2 px por 2 frames).

**Acceptance Criteria**:

1. CUT-01: The Desmantelar SHALL have cost 30, cooldown 2500 ms, sign 150 ms, charge 0 ms, release 150 ms and recover 200 ms at level 1.
2. CUT-02: WHEN the Desmantelar enters `release` THEN it SHALL make 3 cuts, at 0, 60 and 120 ms after entering `release`.
3. CUT-03: WHEN a cut happens THEN every enemy and the boss whose body overlaps the rectangle from 60 to 180 px ahead of the player center and 48 px tall centered on it SHALL take 10 light damage.
4. CUT-04: WHEN a cut happens THEN `fx.layers` SHALL include `cut.line` in that frame and `events` SHALL get `cut`.
5. CUT-05: The 3 cut lines of one cast SHALL have 3 different angles.
6. CUT-06: WHEN a cut damages a target THEN `fx.layers` SHALL include `cut.split` for that target for at least 33 ms (2 frames at 60 fps, rounded up to whole frames).

**Independent Test**: `cut.test.ts` em Node (tempos, área 59/60 e 180/181 px); smoke com `?debug&tech=corte` confere dano nos 3 cortes, ângulos e camadas.

---

### P2: Laboratório de efeitos

**User Story**: Como jogador (e como quem aprova a arte), quero uma sala onde disparo cada técnica à vontade e em câmera lenta, para julgar se os efeitos estão fiéis ao anime.

**Why P2**: É a ferramenta do UAT visual; o jogo funciona sem ela.

**Acceptance Criteria**:

1. FXL-01: WHERE the debug mode is on and the URL has `fxlab` THEN the scene SHALL start with no waves and 3 training dummies whose hp resets to max 1000 ms after reaching 0.
2. FXL-02: WHILE in `fxlab`, the keys 1 to 6 SHALL play, respectively, the cast aura, the Punho Divergente, a guaranteed Kokusen, the Vermelho, the Azul and the Desmantelar on the nearest dummy, ignoring energy and cooldown.
3. FXL-03: WHILE in `fxlab`, the key 0 SHALL toggle the scene time scale between 1 and 0.25.
4. FXL-04: WHILE in `fxlab`, the HUD SHALL show the key legend and the current time scale.

**Independent Test**: smoke `fxlab.smoke.mjs` dispara 1–6, confere as camadas de cada efeito e salva uma captura de cada um na pasta de saída do smoke para o UAT.

---

### P1: Invariantes dos efeitos de técnica ⭐ MVP

**User Story**: Como jogador, quero que os efeitos fiquem bonitos sem pesar o jogo nem deixar lixo na tela, para a imersão não quebrar.

**Why P1**: Vale para todas as técnicas desde a primeira.

**Acceptance Criteria**:

1. TFX-01: Every color used by technique effects, frames, kanji grids and HUD parts SHALL belong to `PALETTE`, and `PALETTE` SHALL gain exactly the keys `b`, `R`, `W` and `d` (data test).
2. TFX-02: Every procedural effect geometry (bolts, rings, lines) SHALL have vertex coordinates that are multiples of 2 px relative to its origin.
3. TFX-03: WHEN a technique effect ends THEN all of its game objects SHALL be destroyed within 300 ms, and `fx.live` SHALL return to its value before the effect started.
4. TFX-04: Every technique particle emitter SHALL have at most 64 live particles at any time.
5. TFX-05: WHILE a hitstop is active, every technique effect layer except `kokusen.invert`, `kokusen.duotone`, `kokusen.bolts` and the 黒閃 card SHALL keep its state unchanged.
6. TFX-06: IF the renderer is not WebGL THEN the postFX layers SHALL be skipped, the sprite and geometry layers SHALL still play, and the snapshot SHALL report `fx.degraded: true`.
7. TFX-07: WHERE the debug mode is on, the snapshot SHALL include `kokusen`, `techObjects` and `fx` as defined in the snapshot contract.

**Independent Test**: teste de dados da paleta e das grades; `lightning.test.ts` e testes das geometrias na grade de 2 px; smoke confere `fx.live` antes e 300 ms depois de cada técnica e o hitstop congelando as camadas.

---

## Edge Cases

- WHEN the player dies during a cast THEN the cast SHALL end without spending energy and every technique object SHALL be removed.
- WHEN a new run starts THEN every technique object and effect SHALL be removed, the zone SHALL end and the energy SHALL reset to CE-01.
- WHEN a round is cleared while a red or blue orb exists THEN the orb SHALL keep its behavior until it detonates or expires.
- IF the red orb passes through a regular enemy that is already in ragdoll from that same orb THEN that enemy SHALL NOT take damage again.
- IF the Punho Divergente first impact target enters ragdoll or moves before the second impact THEN the second impact SHALL still hit that same target at its current position.
- IF the Punho Divergente target is the boss in `roar` or in the entrance invulnerability THEN both impacts SHALL deal 0 damage and no Kokusen SHALL be possible (BOSS-08, BAI-12).
- WHEN the player is in the air at the end of a cast THEN normal gravity SHALL resume in that frame.
- IF both slot keys are pressed in the same frame THEN only slot 1 SHALL be considered.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| CE-01 | P1: Energia e slots | Specify | Pending |
| CE-02 | P1: Energia e slots | Specify | Pending |
| CE-03 | P1: Energia e slots | Specify | Pending |
| CE-04 | P1: Energia e slots | Specify | Pending |
| CE-05 | P1: Energia e slots | Specify | Pending |
| CE-06 | P1: Energia e slots | Specify | Pending |
| CE-07 | P1: Energia e slots | Specify | Pending |
| CE-09 | P1: Energia e slots | Specify | Pending |
| CE-08 | P1: Energia e slots | Specify | Pending |
| TEC-01 | P1: Energia e slots | Specify | Pending |
| TEC-02 | P1: Energia e slots | Specify | Pending |
| TEC-03 | P1: Energia e slots | Specify | Pending |
| TEC-04 | P1: Energia e slots | Specify | Pending |
| TEC-05 | P1: Energia e slots | Specify | Pending |
| TEC-06 | P1: Energia e slots | Specify | Pending |
| TEC-07 | P1: Energia e slots | Specify | Pending |
| TEC-12 | P1: Energia e slots | Specify | Pending |
| TEC-09 | P1: Energia e slots | Specify | Pending |
| TEC-10 | P1: Energia e slots | Specify | Pending |
| TEC-08 | P1: Energia e slots | Specify | Pending |
| TEC-11 | P1: Energia e slots | Specify | Pending |
| CAST-01 | P1: Conjuração | Specify | Pending |
| CAST-02 | P1: Conjuração | Specify | Pending |
| CAST-03 | P1: Conjuração | Specify | Pending |
| CAST-04 | P1: Conjuração | Specify | Pending |
| CAST-05 | P1: Conjuração | Specify | Pending |
| CAST-06 | P1: Conjuração | Specify | Pending |
| CAST-07 | P1: Conjuração | Specify | Pending |
| CAST-20 | P1: Conjuração | Specify | Pending |
| CAST-08 | P1: Conjuração | Specify | Pending |
| CAST-09 | P1: Conjuração | Specify | Pending |
| CAST-10 | P1: Conjuração | Specify | Pending |
| CAST-11 | P1: Conjuração | Specify | Pending |
| CAST-12 | P1: Conjuração | Specify | Pending |
| CAST-13 | P1: Conjuração | Specify | Pending |
| CAST-14 | P1: Conjuração | Specify | Pending |
| CAST-15 | P1: Conjuração | Specify | Pending |
| CAST-19 | P1: Conjuração | Specify | Pending |
| CAST-16 | P1: Conjuração | Specify | Pending |
| CAST-17 | P1: Conjuração | Specify | Pending |
| CAST-18 | P1: Conjuração | Specify | Pending |
| DIV-01 | P1: Punho Divergente | Specify | Pending |
| DIV-02 | P1: Punho Divergente | Specify | Pending |
| DIV-03 | P1: Punho Divergente | Specify | Pending |
| DIV-04 | P1: Punho Divergente | Specify | Pending |
| DIV-05 | P1: Punho Divergente | Specify | Pending |
| DIV-06 | P1: Punho Divergente | Specify | Pending |
| DIV-07 | P1: Punho Divergente | Specify | Pending |
| DIV-08 | P1: Punho Divergente | Specify | Pending |
| DIV-09 | P1: Punho Divergente | Specify | Pending |
| DIV-10 | P1: Punho Divergente | Specify | Pending |
| KOK-01 | P1: Kokusen | Specify | Pending |
| KOK-02 | P1: Kokusen | Specify | Pending |
| KOK-03 | P1: Kokusen | Specify | Pending |
| KOK-04 | P1: Kokusen | Specify | Pending |
| KOK-05 | P1: Kokusen | Specify | Pending |
| KOK-06 | P1: Kokusen | Specify | Pending |
| KOK-07 | P1: Kokusen | Specify | Pending |
| KOK-08 | P1: Kokusen | Specify | Pending |
| KOK-09 | P1: Kokusen | Specify | Pending |
| KOK-10 | P1: Kokusen | Specify | Pending |
| KOK-11 | P1: Kokusen | Specify | Pending |
| KOK-12 | P1: Kokusen | Specify | Pending |
| KOK-13 | P1: Kokusen | Specify | Pending |
| KOK-14 | P1: Kokusen | Specify | Pending |
| KOK-15 | P1: Kokusen | Specify | Pending |
| KOK-16 | P1: Kokusen | Specify | Pending |
| KOK-17 | P1: Kokusen | Specify | Pending |
| KOK-18 | P1: Kokusen | Specify | Pending |
| KOK-19 | P1: Kokusen | Specify | Pending |
| KOK-20 | P1: Kokusen | Specify | Pending |
| KOK-21 | P1: Kokusen | Specify | Pending |
| KOK-22 | P1: Kokusen | Specify | Pending |
| KOK-23 | P1: Kokusen | Specify | Pending |
| KOK-24 | P1: Kokusen | Specify | Pending |
| KOK-25 | P1: Kokusen | Specify | Pending |
| KOK-26 | P1: Kokusen | Specify | Pending |
| KOK-27 | P1: Kokusen | Specify | Pending |
| KOK-28 | P1: Kokusen | Specify | Pending |
| KOK-29 | P1: Kokusen | Specify | Pending |
| RED-01 | P1: Vermelho | Specify | Pending |
| RED-02 | P1: Vermelho | Specify | Pending |
| RED-03 | P1: Vermelho | Specify | Pending |
| RED-04 | P1: Vermelho | Specify | Pending |
| RED-05 | P1: Vermelho | Specify | Pending |
| RED-15 | P1: Vermelho | Specify | Pending |
| RED-06 | P1: Vermelho | Specify | Pending |
| RED-07 | P1: Vermelho | Specify | Pending |
| RED-08 | P1: Vermelho | Specify | Pending |
| RED-09 | P1: Vermelho | Specify | Pending |
| RED-10 | P1: Vermelho | Specify | Pending |
| RED-11 | P1: Vermelho | Specify | Pending |
| RED-16 | P1: Vermelho | Specify | Pending |
| RED-12 | P1: Vermelho | Specify | Pending |
| RED-13 | P1: Vermelho | Specify | Pending |
| RED-14 | P1: Vermelho | Specify | Pending |
| BLU-01 | P2: Azul | Specify | Pending |
| BLU-02 | P2: Azul | Specify | Pending |
| BLU-03 | P2: Azul | Specify | Pending |
| BLU-04 | P2: Azul | Specify | Pending |
| BLU-05 | P2: Azul | Specify | Pending |
| BLU-06 | P2: Azul | Specify | Pending |
| BLU-07 | P2: Azul | Specify | Pending |
| BLU-11 | P2: Azul | Specify | Pending |
| BLU-08 | P2: Azul | Specify | Pending |
| BLU-09 | P2: Azul | Specify | Pending |
| BLU-10 | P2: Azul | Specify | Pending |
| CUT-01 | P2: Desmantelar | Specify | Pending |
| CUT-02 | P2: Desmantelar | Specify | Pending |
| CUT-03 | P2: Desmantelar | Specify | Pending |
| CUT-04 | P2: Desmantelar | Specify | Pending |
| CUT-05 | P2: Desmantelar | Specify | Pending |
| CUT-06 | P2: Desmantelar | Specify | Pending |
| FXL-01 | P2: Laboratório de efeitos | Specify | Pending |
| FXL-02 | P2: Laboratório de efeitos | Specify | Pending |
| FXL-03 | P2: Laboratório de efeitos | Specify | Pending |
| FXL-04 | P2: Laboratório de efeitos | Specify | Pending |
| TFX-01 | P1: Invariantes dos efeitos | Specify | Pending |
| TFX-02 | P1: Invariantes dos efeitos | Specify | Pending |
| TFX-03 | P1: Invariantes dos efeitos | Specify | Pending |
| TFX-04 | P1: Invariantes dos efeitos | Specify | Pending |
| TFX-05 | P1: Invariantes dos efeitos | Specify | Pending |
| TFX-06 | P1: Invariantes dos efeitos | Specify | Pending |
| TFX-07 | P1: Invariantes dos efeitos | Specify | Pending |

**Coverage:** 124 total, 0 mapped to tasks, 124 unmapped ⚠️ (Design e Tasks acontecem quando a F5 entrar em execução, depois de F3 e F4).

---

## Success Criteria

- [ ] Com `?debug&tech=divergente,vermelho`, o jogador conjura as duas técnicas, e cada conjuração mostra selo, aura, chamada com kanji e soltura antes de qualquer dano.
- [ ] No laboratório de efeitos em câmera lenta, o Kokusen mostra inversão, duotom, raios negros com borda vermelha, zoom-punch e o cartão 黒閃, e o usuário aprova no UAT que "parece o anime".
- [ ] Um jogador que aprendeu o ritmo acerta o Kokusen apertando no fim do anel de aproximação, e erra ao apertar cedo.
- [ ] `npm test`, `npm run typecheck`, `npm run build` e `npm run smoke` passam, e `fx.live` volta ao valor base depois de cada técnica em todos os cenários.
