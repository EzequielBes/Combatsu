# Vermelho e corpo — Validation

**Date**: 2026-10-16 (rodada 2; a rodada 1 deu FAIL em `75a22b4..fcbe549`)
**Spec**: `.specs/features/vermelho-e-corpo/spec.md` (63 requisitos: SHX, TST, VRM, CRP, CRD, PRC, ESC; 17 casos de borda)
**Diff range**: `75a22b4..9abcef3`, branch `feat/vermelho-e-corpo`, 78 commits (69 tarefas, o `e86cf6a` de
reconciliação da spec, o conserto `cbfdbdf`, o relatório da rodada 1 `6c95c4f` e os 6 consertos `6538b25..9abcef3`),
173 arquivos (+12679/−1511). Consertos da rodada 1: `fcbe549..9abcef3`.
**Verifier**: sub-agente independente (autor ≠ verificador; não escreveu código nem consertos). Rodada 2: o sensor
rodou num worktree temporário destacado em `9abcef3` (`git worktree add --detach`, `node_modules` por junção), já
removido; o worktree real ficou só com ` M src/core/mastery.ts` antes e depois (diferença só de fim de linha).

## Validation

**Result**: PASS

Em uma linha: as 6 lacunas da rodada 1 fecharam com evidência do efeito no motor, os 4 mutantes que viveram (A1 a A4)
agora morrem pela asserção certa, os 2 mutantes novos nos caminhos dos consertos também morrem, e o gate passa com 4278
testes. Os consertos só acrescentaram asserções (a única linha trocada, `toHaveLength(1)` → `toEqual([[0.4, 350]])`,
ficou mais forte) e não tocaram arquivo travado nem o `.oxlintrc.json`.

### Lacunas da rodada 1, revistas na rodada 2

| # | Lacuna | Conserto | Evidência (`arquivo:linha` + asserção + valor da spec) | Raso? | Result |
| --- | --- | --- | --- | --- | --- |
| 1 | CRP-08.2, +50 % da Cadência | `6538b25` | `scripts/smoke/cursed-body-branches.mjs:67` `on.elbow.every(([, d]) => d === ELBOW_DECISIVE)` (21 = round(14 × 1,5)) e `:68` `off.elbow.every(... d === ELBOW_DAMAGE)` (14), ambos com `length > 0`; o dano vem do evento `bodyHit:cotovelada:<alvo>:<dano levado>` (`:19-24`) | Não: A1 (sem o ×1,5) cai em `:67` com `{"on":[[12,14]],"off":[[12,14]]}` | ✅ PASS |
| 2 | CRP-09, alvo do decisivo do Martelo | `fd90381` | `cursed-body-branches.mjs:111-115` `dmg === ELBOW_DECISIVE + Math.round(0.04 * t.maxHp)` (21 + round(0,04 × 60) = 23) para cada alvo da cotovelada decisiva; vizinhos seguem em `:120-121` | Não: A2 (sem `maxHpBonus`) e N2 (`bodyHit` com `hit.damage`) caem em `:113` com `{"elbow":[[13,21],[12,21]]}` | ✅ PASS |
| 3 | CRP-03.4, força do Peso | `02e3a70` | `tests/scenes/bodyDirector.test.ts:23-30` `expect(mods.force).toBeCloseTo(force, 10)` com 6 → 6/7,2/8,4/9,6 (Peso 0..3 = ×1/1,2/1,4/1,6) no `BodyDirector.strikeMods` real; `:33-37` marcas `knockdown`/`wallStun` | Não: A3 (sem `* forceMul`) falha 3 de 4 casos (`expected 6 to be close to 9.6`) | ✅ PASS |
| 4 | VRM-06, pós-imagem da Conjuração 3 | `37074e3` | `src/game/tech/red.ts:112` emite `redEcho` só se `player.fx.afterimage(...)` devolve que a cópia nasceu (`src/game/fx.ts:166`); `scripts/smoke/red-axes.smoke.mjs:78` `three === 1` e `:79` `two === 0` | Não: A4 (pós-imagem desligada) cai em `:78` (0); N1 (`redEcho` sempre) cai em `:79` (1) | ✅ PASS |
| 5 | VRM-17.12 / CRP-13, payload | `01eab27` | `tests/scenes/axisDirector.test.ts:109` `expect(r.slow).toEqual([[0.4, 350]])` (Vermelho, uma vez na rodada); `:115-124` o mesmo `[[0.4, 350]]` para o Martelo Negro do Corpo | Não: 1050 ms ou 2 chamadas quebram o `toEqual` | ✅ PASS |
| 6 | Texto do VRM-16 x desvio da T33 | `9abcef3` | `.specs/features/vermelho-e-corpo/spec.md:214` agora diz "while it is still down from that same knockdown ... disarms when the enemy gets up or at its first stun", com o motivo do chão | - | ✅ PASS |

**`bodyHit` carrega o dano levado, não o calculado**: `src/scenes/test/bodyDirector.ts:90-91` grava
`target.lastDamageTaken`, que é `brain.lastDamage` (`src/game/Enemy.ts:201-202`), o dano aplicado com a fração da vida
máxima (`src/core/hit.ts:69-73`). O evento sai do `onMeleeHit`, chamado por `combat.onConnect`
(`src/scenes/test/combat.ts:110`) depois do golpe aplicado: é o mesmo valor que o número de dano mostra (`:117`). O
mutante N2 (troca por `hit.damage`) morre, porque com o Martelo o calculado é 21 e o levado 23.

**Ressalva menor, sem efeito no veredito**: o laço do CRP-09 (`cursed-body-branches.mjs:109`) passaria vazio se
`elbow` viesse sem itens com `hits` cheio; na prática o `martelo:` só sai do decisivo da cotovelada, que empurra o
`bodyHit` antes (`bodyDirector.ts:90-97`), e os mutantes A2/N2 provam que o laço roda. Um `elbow.length > 0` deixaria
isso explícito.

---

## Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1..T69 | ✅ Done | 189 itens `[x]`, nenhum `[ ]` em `tasks.md`; 69 commits de tarefa, um por tarefa |
| `e86cf6a` | ✅ | Reconciliação da spec com o código integrado, antes da T1 |
| `cbfdbdf` | ✅ aceito | Conserto fora do esquema: a T34 empurrou `techFxScenarios` (`tools/visual-shots-fx.mjs`) acima das 80 linhas por função; o commit só move o cenário para função própria. Ferramenta fora de `src/`, sem mudança de comportamento |

---

## Spec-Anchored Acceptance Criteria

### P1: A loja e as técnicas prontas para crescer

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| SHX-01.1 | `eligible` em `shopEligibility.ts`, `previewText` em `shopPreview.ts`; `shop.ts` com `Shop`, `drawOffers`, custo, vistas | `git show ef42255:src/core/shop.ts`: `drawOffers` `:25`, `costOf` `:99`, `Shop` `:141`, sem `eligible`/`previewText`; `src/core/shopEligibility.ts:57`, `src/core/shopPreview.ts:37`. Depois o passo 4 levou `drawOffers` a `shopDraw.ts` e o passo 5 o custo a `shopPricing.ts` (o AC vale "quando o passo 0 é commitado") | ✅ PASS |
| SHX-01.2 | testes só com o import mudado; smokes iguais | `git diff --stat 2721345~1..ef42255 -- tests`: 5 arquivos, +12/−5, só linhas de `import` | ✅ PASS |
| SHX-02 | `TestScene` intocada, ≤ 388 efetivas | `git diff --stat 75a22b4..fcbe549 -- src/scenes/TestScene.ts` vazio; contagem sem branco nem comentário: **388** | ✅ PASS |
| SHX-03 | nada novo no `.oxlintrc.json`; `ShopPanel` só `CARD_COUNT` e dica; `Hud.ts`, `moves.ts`, `Player.ts` iguais | `git diff 75a22b4..fcbe549` toca só `src/game/ShopPanel.ts` (+2/−2: `CARD_COUNT = 4` e a dica) entre os cinco; `tests/game/shopPanel.test.ts:33` `toMatch(/const CARD_COUNT = 4;/)`, `:38` a dica literal | ✅ PASS |
| TST-01.5/6 | `TechStats` = custo, recarga, fases, dano e geometria de hoje, 5 técnicas × níveis × 1 e 1,35 | `tests/core/techStats.test.ts:40-66` (`toEqual` por técnica, nível e multiplicador), `:78-95` tempos, `:96-183` geometria; Vermelho na nova base em `tests/data/techAxes.test.ts:212-262` | ✅ PASS |
| TST-02 | nenhum adaptador lê `TECHNIQUES[...]` de dano, tempo ou custo | `tests/core/techStats.test.ts:186` (grep do fonte de `src/game` e `src/scenes`); `tests/core/cast.test.ts` (TST-02) | ✅ PASS |
| TST-03 | vistas sem cópia do raio | `tests/game/redLook.test.ts:8-14`, `tests/game/blueLook.test.ts`, `tests/core/cut.test.ts` (TST-03) | ✅ PASS |
| TST-04 | smokes `tech`, `techniques`, `red-anime`, `kokusen`, `evolution`, `fight` iguais | T10 Done-when; nesta validação `kokusen` verde na base do sensor | ✅ PASS |

### P1: O Vermelho vira canhão ou metralhadora

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| VRM-01 | custo 30, recarga 4500, alcance 320; toque 30, detonação 25, força 8, 250/350 ms, raio 96, orbe 12, sensor 6, 760 px/s | `tests/data/techAxes.test.ts:215-236` `toEqual([1, 30, 4500, 250, 350, 100, 250])`, `damage` `{hit: 30, detonation: 25}`, `red` com `rangePx: 320, speed: 760, radius: 96, orbTexels: 12, sensorPx: 6, force: 8` | ✅ PASS |
| VRM-02.2 | nível = 1 + pontos (1..6), 0..3 por eixo | `tests/core/axisBuild.test.ts:20`; `tests/core/loadoutAxes.test.ts:13` `levelOf` 1 a 6; `scripts/smoke/red-axes.smoke.mjs:17` `red.level === 6` | ✅ PASS |
| VRM-02.3 | eixo > 3 ou item > 5 recusado sem mudar nada | `tests/core/axisBuild.test.ts:37` (2→3 sim, 3→4 não), `:48` (4→5 sim, 5→6 não); `red-axes.smoke.mjs:71` Potência 4 fica em 3. Mutante P9 morto | ✅ PASS |
| VRM-03.4 | tabela linha a linha | `tests/data/techAxes.test.ts:31-46` `toEqual` das 12 linhas com os números da spec | ✅ PASS |
| VRM-03.5 | `stats` = tabela, dano × `damageMul` × `vowDamageMul`, sem `LEVEL_FACTOR` | `tests/data/techAxes.test.ts:295-300` (24 casos `toMatchObject`), `:245-247` nível do slot não muda nada, `:302-304` 73/60/10/0 | ✅ PASS |
| VRM-04.6 | 1 + Potência anéis; +10 ms de hitstop por ponto | `red-axes.smoke.mjs:122` toque = 90, `:127` detonação = 90 + 30, `:136` `maxRings === 4` (lido do `fx` vivo) | ✅ PASS |
| VRM-04.7 | repulsão 4/5/5/6 | `tests/data/techAxes.test.ts:307-310` `toEqual([4, 5, 5, 6])`; `tests/core/redOrbConfig.test.ts:162` | ✅ PASS |
| VRM-05 | sprite com o orbe resolvido, sensor resolvido, esfera até o raio | `red-axes.smoke.mjs:32` `orb.sensorPx === 8 && orb.texture === 'tech-orb-red-16'` (corpo do Matter e chave do sprite), `:36` `fx.red.sphereR === 144` | ✅ PASS |
| VRM-06 (texturas) | troca nos terços do `chargeMs` resolvido, a última no `orbTexels` | `tests/core/redOrb.test.ts:42-47` 74/75/149/150 ms, `:49-` 12/14/16/18 | ✅ PASS |
| VRM-06 (pós-imagem) | soltura com Conjuração 3 desenha 1 quadro de pós-imagem do player | Stat: `tests/data/techAxes.test.ts:287`. Jogo (rodada 2): `scripts/smoke/red-axes.smoke.mjs:78` `three === 1` e `:79` `two === 0`, com `redEcho` só quando a cópia nasce (`src/game/tech/red.ts:112`). A4 e N1 mortos | ✅ PASS |
| VRM-07 | 1º abate da conjuração tira 30 % da recarga cheia (690), nunca abaixo de 0; os seguintes nada | `tests/core/loadoutAxes.test.ts:150` 690 de 2300, `:156` para em 0; `red-axes.smoke.mjs:221` sem abate não cai, `:224-226` com ≥ 2 abates cai 690 uma vez. Mutante A6 morto | ✅ PASS |
| VRM-08 | estilhaço `micro` de round(6/9/12 × mul) em 1/2/2 vizinhos a 60 px, cada um uma vez | `tests/core/redBranch.test.ts:29-44` (59/60/61 px, mais perto primeiro, uma vez); `red-axes.smoke.mjs:170-178` 2 vizinhos, dano 9 lido do alvo, ninguém repetido, `hitstop.microMs > 0` | ✅ PASS |
| VRM-09 | voo acaba aos 320 px; rebote não passa de 320 px do player | `tests/core/redOrbConfig.test.ts:13-27`; `tests/core/redBranch.test.ts:60-64` 319/320/321. Mutante P10 morto | ✅ PASS |
| VRM-10.13 | `axes=` com teto 3/5, entradas ruins ignoradas | `tests/core/axisParam.test.ts:16-66`; `tests/scenes/axisDirector.test.ts:29-48`; `red-axes.smoke.mjs:17-19`, `:71` | ✅ PASS |
| VRM-10.14 | snapshot `build.vermelho: {level, axes, branch, awakened}` | `red-axes.smoke.mjs:17`, `:71`, `:79`, `:83-84`; `src/game/axisSnapshot.ts:6` | ✅ PASS |
| VRM-19 | maestria e chefe dão 1 ponto no eixo-foco; maestria só no Nv 1 e 2; com 5 pontos nada | `tests/core/loadoutAxes.test.ts:55-86`; `tests/core/mastery.test.ts:109-121`; `tests/core/bossReward.test.ts:30` | ✅ PASS |
| VRM-20 | marcas de cada múltiplo do custo do último slot que cabe na energia | `tests/core/energyMarks.test.ts` 29/30/59/60/90 → 0/1/1/2/3; `scripts/smoke/hud.smoke.mjs:26` 3 marcas com 90, depois seguem o Azul | ✅ PASS |

### P1: Ramo e Despertar do Vermelho

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| VRM-11 | 1º Nv 2 da run deixa o ramo pendente | `tests/core/axisBuild.test.ts:79-104`; `red-axes.smoke.mjs:79` `branchPending:vermelho` | ✅ PASS |
| VRM-12.2 | Ricochete detona no 1º inimigo | `tests/core/redBranch.test.ts:89` `pierce false`; `scripts/smoke/red-branches.mjs:86` o 1º leva o toque e detona | ✅ PASS |
| VRM-12.3 | 1ª detonação rebate uma vez ao comum mais perto a 200 px fora dos atingidos | `tests/core/redBranch.test.ts:54-70`, `:91-93`; `red-branches.mjs:83` 2 detonações, `:90` a 2ª acerta | ✅ PASS |
| VRM-12.4 | detonações seguintes com 70 % | `tests/core/redBranch.test.ts:99`; `red-branches.mjs:92-99` `round(full × 0,7)` lido do dano levado. Mutante P8 morto | ✅ PASS |
| VRM-12.5 | sem alvo, volta pelo lado oposto até 200 px e detona | `tests/core/redBranch.test.ts:72-75`; `red-branches.mjs:115-121` sinal oposto, `far` 180..200 | ✅ PASS |
| VRM-13 | Fliperama: 3 rebotes em qualquer alvo, +15 %/detonação, 4 % (1 % chefe) na 3ª | `tests/core/redBranch.test.ts:106-119`; `tests/core/hitDealt.test.ts:21-30`; `red-branches.mjs:145` 4 detonações, `:150` `dmg === base + round(0,04 × maxHp)` só na 3ª | ✅ PASS |
| VRM-14.7 | Contido segurado: voa, paira aos 320, detona com ×1,4 ao soltar ou aos 1,2 s | `tests/core/redBranch.test.ts:141-157` (1199/1200 ms); `red-branches.mjs:182` `traveled === 320`, `:199` e `:216` raio 134,4 | ✅ PASS |
| VRM-14.8 | solta antes da saída: orbe sem ramo | `tests/core/redBranch.test.ts:159-164`; `red-branches.mjs:227-229` raio 96. Mutante A5 morto | ✅ PASS |
| VRM-15 | Máximo derruba os comuns do raio, 4 % (1 % chefe), campo de 1200 ms que empurra a 150 px/s e dá chip de round(3 × mul) a cada 200 ms | Derrubada: todo `Hit` forte de técnica leva `knockdown` (`src/game/tech/shared.ts:52-53`, AD-021). 4 %: `tests/core/redBranch.test.ts:133-135` + `scaled()` (`src/game/tech/redFlight.ts:67-69`), o mesmo caminho que o smoke do Fliperama prova. Campo: `tests/core/redBranch.test.ts:168-198`; `red-branches.mjs:266` 6 chips de 3, `:268-272` a cada 12 quadros, `:314-327` `pull` 2,5 px/passo para fora e nenhum sobrando | ✅ PASS |
| VRM-16 | derrubado pelo Máximo ou Peso 3 que bate na parede ainda caído pela mesma derrubada (texto alinhado à T33, `spec.md:214`): `ragdollStun` 600 ms do toque e `wallStun:<id>` | `tests/core/wallStun.test.ts:8-18` 0,69/0,70; `tests/core/enemyBrainHold.test.ts:34` 599/600; `red-branches.mjs:401-402` um evento e 36 quadros; Peso 3 em `scripts/smoke/cursed-body.smoke.mjs:154` | ✅ PASS (mutante A8 morto) |
| VRM-17.11 | Nv 5 com ramo liga o Despertar; borda dourada | `tests/core/axisBuild.test.ts:130-153`; `hud.smoke.mjs:27` borda `w`, `:41` borda `A` | ✅ PASS |
| VRM-17.12 | 1ª soltura da rodada: banner com o nome e `timeScale` 0,4 por 350 ms reais | `red-branches.mjs:436-454` banner `Fliperama` e `timeScale` 0,4 na 1ª, não na 2ª, de novo na rodada 2; payload (rodada 2) em `tests/scenes/axisDirector.test.ts:109` `expect(r.slow).toEqual([[0.4, 350]])` | ✅ PASS |
| VRM-18 | `ramo=vermelho:a/b` | `tests/core/axisParam.test.ts:70-96`; `red-axes.smoke.mjs:83`; `red-branches.mjs:77`, `:176` | ✅ PASS |

### P1: O soco tem trilha própria

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| CRP-01 | Corpo desde a r1 no Nv 1, fora dos slots, 1..6, volta ao Nv 1 na run nova | `tests/core/axisBuild.test.ts:12`, `:216`; `cursed-body.smoke.mjs:52-64` | ✅ PASS |
| CRP-02.2 | Impacto ×1/1,1/1,2/1,3 sobre a Força pelo `meleeMul` | `tests/core/statSheetImpact.test.ts:41-55`; `cursed-body.smoke.mjs:42` jab 12 = round(6 × 1,5 × 1,3) lido do dano | ✅ PASS |
| CRP-02.3 | cada ponto de Impacto = 1 ponto de força | `tests/core/power.test.ts` (CRP-02); `cursed-body.smoke.mjs:40` `power.points === 8` | ✅ PASS |
| CRP-03.4 | Peso multiplica a `force` por 1/1,2/1,4/1,6 pelo `strikeMods` | Regra pura `tests/core/cursedBody.test.ts:23-25`; adaptador (rodada 2) `tests/scenes/bodyDirector.test.ts:23-30` `toBeCloseTo` 6/7,2/8,4/9,6 no `BodyDirector.strikeMods` real (`bodyDirector.ts:61`). A3 morto | ✅ PASS |
| CRP-03.5 | Peso ≥ 2: forte que acerta o comum leva `knockdown` | `tests/core/cursedBody.test.ts:46-52`; `cursed-body.smoke.mjs:23` derruba com Peso 2, `:26` não com Peso 1 | ✅ PASS |
| CRP-04.6 | `recovery` × 1/0,92/0,85/0,78 (ms), resto igual | `tests/core/moveMachineRecovery.test.ts:40-110`; `cursed-body.smoke.mjs:137` jab acaba 26 ms antes, medido no jogo | ✅ PASS |
| CRP-04.7 | Ritmo 3: pós-imagem de 1 quadro na `recovery` | `cursed-body.smoke.mjs:197` `bodyEcho` só quando a cópia nasce (`bodyDirector.ts:204`) | ✅ PASS |
| CRP-05 | caixa +0/6/10/14 px para a frente, borda de trás fixa; rastro mais longo os mesmos px | `tests/core/cursedBody.test.ts:70-78`; `cursed-body.smoke.mjs:102-103` acerta a 49/erra a 52 sem eixo, 63/66 com Alcance 3; `:193` `lengthPx` +14 | ✅ PASS |
| CRP-06 | energia 3/4/5/6 por acerto | `tests/data/techAxes.test.ts:92`; `scripts/smoke/cursed-body-fury.mjs:50-51` +3 e +6 lidos em `ce.cur` | ✅ PASS |
| CRP-07.10 | +1 acúmulo por golpe (3/4/5 %, tetos 15/24/35 %); perder HP zera | `tests/core/cursedBody.test.ts:92-133`; `cursed-body-fury.mjs:84-86` 7 acúmulos = 0,35 e o dano sobe 6 → 8, `:121` guarda não zera, `:126` golpe levado zera. Mutante P7 morto | ✅ PASS |
| CRP-07.11 | aura laranja `a` que cresce; apagada sem pilha | `cursed-body-fury.mjs:89` raio desenhado 0 e crescendo | ✅ PASS |
| CRP-15 | Ritmo e Alcance pelo retorno do `strikeMods`, sem campo no `Player` | `tests/core/statSheetImpact.test.ts:74-80`; `Player.ts` sem diff (SHX-03) | ✅ PASS |
| CRP-14 | `axes=corpo...` e snapshot `build.corpo` com `fury`, `cadence` | `tests/core/axisParam.test.ts:16`; `cursed-body-fury.mjs:84`; `cursed-body-branches.mjs:66`, `:72` | ✅ PASS |

### P1: Ramo e Despertar do Corpo

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| CRP-08.1 | 1º Nv 2 deixa o ramo pendente | `tests/core/axisBuild.test.ts:79-104` | ✅ PASS |
| CRP-08.2 | todo 4º golpe seguido que acerta: tier `decisive` **e +50 % de dano** | Tier: `cursed-body-branches.mjs:64-65` 4º `impact:decisive`, sem ramo `impact:heavy`; `tests/core/cursedBody.test.ts:144-153`. Dano levado (rodada 2): `cursed-body-branches.mjs:67` 21 com ramo, `:68` 14 sem. A1 morto | ✅ PASS |
| CRP-08.3 | golpe que termina o `active` sem acertar, ou perda de HP, zera | `tests/core/cursedBody.test.ts:162-180`; `cursed-body-branches.mjs:72` golpe no ar zera | ✅ PASS |
| CRP-09 | decisivo do Martelo: o alvo leva +4 % (1 % chefe); os comuns a 48 px levam 4 % com `knockdown` | Vizinhos: `tests/core/cursedBody.test.ts:192-211` (47/48/49 px); `cursed-body-branches.mjs:120-121` 4 % e caído. Alvo (rodada 2): `cursed-body-branches.mjs:111-115` `21 + round(0,04 × maxHp)` lido do dano levado. A2 e N2 mortos. O 1 % do chefe fica na regra pura (`maxHpBite`, `src/core/hit.ts:69-73`), o mesmo caminho que o VRM-13 prova | ✅ PASS |
| CRP-10 | onda do ponto do acerto, 80 px a 600 px/s, 1º inimigo fora o alvo, `micro`, round(0,4 × dano) | `tests/core/strikeEmitter.test.ts:18-99`; `cursed-body-branches.mjs:157-162` onda e número `micro` de round(0,4 × dano) | ✅ PASS |
| CRP-11 | Punho que Rasga: atravessa, 160 px; Fúria no teto: 2ª onda 100 ms depois | `tests/core/strikeEmitter.test.ts:29-35`, `:76-79`; `cursed-body-branches.mjs:219-224` atravessa 2, `:268` 2 ondas a 6 quadros | ✅ PASS |
| CRP-12 | sem energia, sem pausar a regen, ≤ 4 ondas em 1000 ms | `tests/core/strikeEmitter.test.ts:103-148` (999/1000/1001 ms); `cursed-body-branches.mjs:163-172` regen intacta, `:269-280` `fistWave:capped` e dano do forte igual. Mutante P6 morto | ✅ PASS |
| CRP-13 | Nv 5 com ramo liga; 1º decisivo ou 1ª onda da rodada: banner e 0,4 por 350 ms | `tests/core/axisBuild.test.ts:130-153`; `cursed-body-branches.mjs:219-220` anuncia na 1ª e não na 2ª; payload (rodada 2) `tests/scenes/axisDirector.test.ts:123` `toEqual([[0.4, 350]])`, uma vez na rodada | ✅ PASS |
| CRP-14 (ramo) | `ramo=corpo:a/b` | `cursed-body-branches.mjs:52`, `:150` | ✅ PASS |

### P1: A carta oferece o eixo e o painel pede o ramo

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| CRD-01 | 4 cartas, teclas 1..4, `A`/`D` ciclam nas 4 | `tests/core/shopAxisBuy.test.ts:202-208`; `scripts/smoke/shop-axes.smoke.mjs:25`, `:30`; `scripts/smoke/shop.smoke.mjs:210-231` tecla 4 | ✅ PASS |
| CRD-02.2 | evolução pronta na carta 0 | `tests/core/shopAxes.test.ts:214-220` | ✅ PASS |
| CRD-02.3/4 | foco com `axisRng` < 0,6; senão outro dono; senão sorteio | `tests/core/shopAxes.test.ts:222-273` (0,59/0,60, edge cases do teto e da trava). Mutante P3 morto | ✅ PASS |
| CRD-03 | slot vazio → carta 1 técnica nova; uma carta por item | `tests/core/shopAxes.test.ts:277-312` (100 e 200 seeds); `shop.smoke.mjs:375` | ✅ PASS |
| CRD-04 | foco + outro eixo abaixo do teto; um só quando só um cabe; `Nv N+1/6` | `tests/core/shopAxes.test.ts:326-369`; `tests/core/shopAxisBuy.test.ts:61` | ✅ PASS |
| CRD-05.7 | `W`/`S` escolhem; a compra vai ao eixo escolhido | `tests/core/shopAxisBuy.test.ts:119-165`; `shop-axes.smoke.mjs:39-71` | ✅ PASS |
| CRD-05.8 | uma linha por eixo ≤ 20 caracteres com `›`, `+ ramo`/`+ Despertar`, `axes` e `selectedAxis` no `OfferView` | `tests/core/shopAxisPreview.test.ts:31-115`, `:83` `toBeLessThanOrEqual(20)` | ✅ PASS |
| CRD-05.9 | dica literal | `tests/game/shopPanel.test.ts:37-39` | ✅ PASS |
| CRD-06 | `axisRng` com sal próprio, mesma seed = mesmas cartas | `tests/core/shopAxes.test.ts:20-70`, `:314-322` | ✅ PASS |
| CRD-07 | foco do Vermelho em ≥ 60 % de 1000 seeds | `tests/core/shopAxes.test.ts:373-390` `toBeGreaterThanOrEqual(600)` | ✅ PASS |
| CRD-08 | `VowPanel` → `ChoicePanel` (Vermelho antes do Corpo) → loja; A/D, Enter; aplica e sai da fila | `tests/game/choicePanel.test.ts:41-95`; `scripts/smoke/shop-branch.mjs:21-75`, `:106-114` | ✅ PASS |
| CRD-09 | `ChoicePanel` pelo `UiSetup`; snapshot `choice` | `tests/game/debugApi.test.ts:228`; `shop-branch.mjs:13-17` | ✅ PASS |
| CRD-10 | Azul, Desmantelar, Divergente e Roxo com o texto de hoje | `tests/core/shopAxisPreview.test.ts:119-125`; `scripts/smoke/shop-progress.smoke.mjs:2` `Nv 2/3` | ✅ PASS |

### P1: Preço, trava e inflação

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| PRC-01 | 20 comum, 26 rara | `tests/core/shopPricing.test.ts:25-33` | ✅ PASS |
| PRC-02 | 12/16/20/24/28 | `tests/core/shopPricing.test.ts:37-39`; `shop-axes.smoke.mjs:42`, `:65` | ✅ PASS |
| PRC-03 | `round(base × (1 + 0,06 × (r − 1)))`, reroll sem inflação | `tests/core/shopPricing.test.ts:43-57` (100/106/154/214; 13 na r2); `tests/core/shop.test.ts` (r10 e reroll). Mutante P1 morto | ✅ PASS |
| PRC-04 | ponto na r2, 3º na r4, 5º na r6; Nv 2/3 das outras na r2/r4 | `tests/core/shopPricing.test.ts:60-95`; `tests/core/shopAxes.test.ts:90-114`. Mutante P4 morto | ✅ PASS |
| PRC-05 | piso `ceil(0,6 × custo Nv 1)` depois de tudo; Vermelho Eficiência 3 + Fluxo selado = 18; Divergente Nv 3 = 12 | `tests/core/loadoutAxes.test.ts:208-240`. Mutante P5 morto | ✅ PASS |
| PRC-06 | nível das outras `base + step × nível` × inflação | `tests/core/shopPricing.test.ts:99-111` (41/43, 45/69) | ✅ PASS |

### P1: O inimigo cresce e a build acompanha

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| ESC-01.1 | 0,06/0,05, tetos 3,0/2,5 e velocidades iguais | `tests/core/difficulty.test.ts:44-53` `toEqual`; `tests/data/tuning.test.ts:6`; `core/difficulty.ts` sem diff | ✅ PASS |
| ESC-01.2 | HP 64/89/96/125 nas r2/9/11/19; dano 13 na r2 | `tests/core/difficulty.test.ts:55-68`; `scripts/smoke/scale.smoke.mjs:24-41` 89 e 96 lidos dos comuns vivos | ✅ PASS |
| ESC-01.3 | AD-025 no STATE | `.specs/STATE.md:197` AD-025, `:115` AD-014 `superseded by AD-025` | ✅ PASS |
| ESC-02.4 | `max(round(2,5 × meleeDamageAtLevel(D, forca) × meleeMul), round(45 × hpMul))`, D sem os multiplicadores de técnica | `tests/core/kokusenDamage.test.ts:12-42`; `tests/core/techStatsKokusen.test.ts:19-56` (o 1,35 não conta duas vezes). Mutante P2 morto | ✅ PASS |
| ESC-02.5 | 45 na r1; 68 com Força 5; chefe leva o dano e dano × `poiseMul` | `scripts/smoke/kokusen-scale.smoke.mjs` 45 e 68 lidos do HP e do número `kokusen`, chefe da r5 perde 56 e entra em `stagger`; `kokusen.smoke.mjs:273`. Mutante A7 morto | ✅ PASS |
| ESC-02.6 | 2,5 e 3,4 | `tests/data/techniques.test.ts` (ESC-02) | ✅ PASS |
| ESC-03.7 | Nv 2 até a r3, Nv 5 até a r10 | `tests/core/buildCurve.test.ts:49-58` | ✅ PASS |
| ESC-03.8 | golpes para matar na r19 ≤ r1 sem build; cabe em `expectedIncome(19)` | `tests/core/buildCurve.test.ts:142-156` (15 e 35 de dano, 9/4 contra 10/5) | ✅ PASS |
| ESC-03.9 | nenhum eixo no 3 > 1,35 × mediana; Eficiência 2 sobre Recarga 3 sobe | `tests/data/techAxes.test.ts:179-195` | ✅ PASS |
| ESC-04.10 | `run-loop` pelas fórmulas; 100 − 13 = 87 | `scripts/smoke/run-loop.smoke.mjs:86`, `:190`, `:199` | ✅ PASS |
| ESC-04.11 | `scale.smoke` lê r9 (89) e r11 (96), nunca r10 | `scale.smoke.mjs:24-27` | ✅ PASS |
| ESC-05 | snapshot `difficulty` | `kokusen-scale.smoke.mjs` (1/1/1 na r1); `scale.smoke.mjs:42-45` | ✅ PASS |

**Status**: ✅ 63 de 63 requisitos com evidência (rodada 2). As 4 lacunas de efeito e os 2 gaps de payload da rodada 1
fecharam; nenhum spec-precision gap aberto.

---

## Edge Cases

- [x] Nv 5 com o ramo pendente liga o Despertar na escolha: `tests/core/axisBuild.test.ts:143`
- [x] Ramo pendente cai no reset: `tests/core/axisBuild.test.ts:216-236`
- [x] Contido pairando e o player atingido: `red-branches.mjs:187-194`
- [x] Ricochete no chefe primeiro: `tests/core/redBranch.test.ts:77-82`
- [x] Fliperama na parede conta rebote: `tests/core/redBranch.test.ts:106-111`
- [x] Dois ramos pendentes, Vermelho primeiro: `tests/core/axisBuild.test.ts:98`; `shop-branch.mjs:50-75`
- [x] Foco no teto ou travado: `tests/core/shopAxes.test.ts:241-257`
- [x] Vermelho com 5 pontos sem carta: `tests/core/shopAxes.test.ts:145-151`
- [x] Reroll sorteia o eixo e volta ao foco: `tests/core/shopAxisBuy.test.ts:190`
- [x] Fúria no teto e golpe defendido: `cursed-body-fury.mjs:121`
- [x] Mais de 4 ondas: `cursed-body-branches.mjs:269-280`
- [x] Corpo de vidro não mexe na Fúria: `cursed-body-fury.mjs:195` (a Cadência pelo mesmo `update`, `bodyDirector.ts:155-160`)
- [x] Piso do Kokusen acima de 2,5 × D e número `kokusen`: `tests/core/kokusenDamage.test.ts:35-42`; `kokusen-scale.smoke.mjs` (número `kokusen`)
- [x] Comum depois da r34 no teto: `tests/core/difficulty.test.ts:70-72`
- [x] Azul vivo: o campo não empurra e segue o chip: `red-branches.mjs:364-370`
- [x] Peso ≥ 2 decisivo pelo `impactTier`, Cadência sem mudar: `tests/core/impactTier.test.ts` (CRP-08)
- [x] Loja da r1 sem carta de eixo: `tests/core/buildCurve.test.ts:57`; `tests/core/techShop.test.ts` (ECN-05 → CRD-02, r1)

---

## Discrimination Sensor

**Sensor depth**: caminho crítico expandido. Rodada 1: 19 mutantes (10 de regra pura, 9 de adaptador). Rodada 2: os 4
que viveram (A1 a A4) reinjetados em `9abcef3` e 2 novos nos caminhos dos consertos (N1, N2). Na rodada 1 cada um foi
aplicado sozinho num worktree destacado em `fcbe549`; smokes de base (`red-axes`, `cursed-body`, `shop-axes`, `scale`, `kokusen`,
`run-loop`) verdes antes. Dois mutantes de adaptador deram "morto" na 1ª passada por instabilidade de carga (smokes em
paralelo, falha sem asserção); refeitos sozinhos, sobreviveram, e é esse o resultado registrado. Dois mutantes não
compilavam na 1ª forma (`tsc` do build) e foram reescritos.

| # | File:line | Mutação | Teste | Resultado |
| --- | --- | --- | --- | --- |
| P1 | `src/core/shopPricing.ts:17` | inflação `× (r − 1)` → `× r` | `shopPricing`, `techShop` | ✅ Morto (TSH-06/07, PRG-02) |
| P2 | `src/core/kokusen.ts:20` | sem o piso `max(…, 45 × hpMul)` | `kokusenDamage` | ✅ Morto (45 em vez de 67) |
| P3 | `src/core/shopDraw.ts:120` | foco `< 0,6` → `<= 0,6` | `shopAxes` | ✅ Morto |
| P4 | `src/data/tuning.ts:339` | trava do 3º ponto na r3 | `shopPricing`, `shopAxes` | ✅ Morto |
| P5 | `src/core/techStats.ts:155` | Vermelho sem o piso de 60 % | `loadoutAxes` | ✅ Morto (11 em vez de 18) |
| P6 | `src/core/strikeEmitter.ts:63` | teto `>= 4` → `> 4` | `strikeEmitter` | ✅ Morto |
| P7 | `src/core/cursedBody.ts:67-69` | Fúria não zera na perda de HP | `cursedBody` | ✅ Morto |
| P8 | `src/core/redBranch.ts:84` | 70 % só a partir da 3ª | `redBranch` | ✅ Morto |
| P9 | `src/core/axisBuild.ts:62` | teto do item `< 5` → `<= 5` | `axisBuild` | ✅ Morto |
| P10 | `src/core/redBranch.ts:116` | rebote aceita 1,5 px além dos 320 do player | `redBranch` | ✅ Morto |
| A1 | `src/scenes/test/bodyDirector.ts:56` | Cadência sem o ×1,5 | smoke `cursed-body` | Rodada 1: ❌ vivo. **Rodada 2: ✅ morto** (`CRP-08.2: +50 % = 21: {"on":[[12,14]],"off":[[12,14]]}`) |
| A2 | `src/scenes/test/bodyDirector.ts:59` | Martelo sem os 4 % no alvo | smoke `cursed-body` | Rodada 1: ❌ vivo. **Rodada 2: ✅ morto** (`CRP-09: o alvo leva 21 + 4 % de 60 = 23: {"elbow":[[13,21],[12,21]]…}`) |
| A3 | `src/scenes/test/bodyDirector.ts:61` | Peso não multiplica a `force` | `tests/scenes/bodyDirector.test.ts` | Rodada 1: ❌ vivo. **Rodada 2: ✅ morto** (3 de 5 testes falham, `expected 6 to be close to 9.6`) |
| A4 | `src/game/tech/red.ts:112` | sem a pós-imagem da Conjuração 3 (linha trocada por `void red.afterimage;`) | smoke `red-axes` | Rodada 1: ❌ vivo. **Rodada 2: ✅ morto** (`VRM-06: uma pós-imagem na soltura com Conjuração 3: 0`) |
| A5 | `src/game/tech/redFlight.ts:251` | raio ×1,4 também no orbe solto | smoke `red-axes` | ✅ Morto na rodada 1 (`VRM-14.8: raio normal (96) sem segurar: 134`) |
| A6 | `src/game/tech/red.ts:121` | devolve a recarga a todo abate | smoke `red-axes` | ✅ Morto na rodada 1 (`VRM-07 … drops [1380 … 690]`) |
| A7 | `src/scenes/test/statsDirector.ts:69` | `hpMul` do Kokusen fixo em 1 | smoke `kokusen` | ✅ Morto na rodada 1 (`o chefe deveria perder 56`; `Kokusen deveria tirar 48 (rodada 2)`) |
| A8 | `src/scenes/test/wallStun.ts:27` | parede sem o `holdDown` de 600 ms | smoke `red-axes` | ✅ Morto na rodada 1 (`VRM-16: ragdollStun por 600 ms do toque (36 quadros)`) |
| A9 | `src/scenes/test/axisDirector.ts:81` | câmera lenta do Despertar 1050 ms | smoke `red-axes` | ✅ Morto na rodada 1, por tabela (cenário da parede). Na rodada 2 o payload tem asserção direta em `tests/scenes/axisDirector.test.ts:109` e `:123`, que um 1050 quebra sem depender do cenário da parede |
| N1 | `src/game/tech/red.ts:112` | `redEcho` emitido em toda soltura, com ou sem cópia | smoke `red-axes` | **Rodada 2: ✅ morto** (`VRM-06: nenhuma pós-imagem com Conjuração 2: 1`) |
| N2 | `src/scenes/test/bodyDirector.ts:91` | `bodyHit` com o dano calculado (`hit.damage`) em vez do levado (`lastDamageTaken`) | smoke `cursed-body` | **Rodada 2: ✅ morto** (`CRP-09: o alvo leva 21 + 4 % de 60 = 23: {"elbow":[[13,21],[12,21]]…}`) |

**Rodada 2**: worktree destacado em `9abcef3`, um mutante por vez, smokes em sequência (nunca em paralelo). Cada
mutante caiu na asserção-alvo com mensagem própria (nenhuma falha por timeout ou sem asserção). Base limpa em
`9abcef3`: `cursed-body` e `red-axes` verdes (`1 cenário(s) ok`, exit 0) depois dos mutantes.

**Result**: rodada 2, 6 mutantes, 6 mortos, 0 vivos. Somando a rodada 1: 21 mutantes distintos, todos mortos - PASS ✅

---

## Desvios julgados

| Desvio | Julgamento | Motivo |
| --- | --- | --- |
| T27: estilhaço lido por evento `redShard:` em vez de 2 números `micro` | ✅ Aceito | O evento leva o dano que o alvo levou de fato (`lastDamageTaken`) e a faixa sai do `hitstop.microMs` do motor; o número na tela se funde por regra da F29 (`mergeMs`). Mede o efeito, não o stat |
| T33: o chão não desarma a parede; desarma ao levantar ou no 1º atordoamento | ✅ Aceito | O ragdoll toca o chão desde o 1º quadro (83 contatos medidos antes da parede), então "antes de pousar" literal nunca dispararia. O efeito do VRM-16 (600 ms e `wallStun:<id>`) é provado. Rodada 2: o texto do VRM-16 foi alinhado (`spec.md:214`, commit `9abcef3`), ressalva fechada |
| T45: o Alcance alonga o rastro em vez de engrossar | ✅ Aceito | O desvio é contra o design (`extraPx`), não contra a spec: o CRP-05 pede "lengthen the strike trail by the same px", que é o que o `fx.trails.lengthPx` +14 prova (`cursed-body.smoke.mjs:193`) |
| T49: teto de 4 ondas provado na T50 | ✅ Aceito | Um forte leva ~450 ms; o teto vivo sai com a 2ª onda da Fúria (`cursed-body-branches.mjs`) e a regra pura tem 999/1000/1001 ms (`strikeEmitter.test.ts:122`) |
| Lote 5: Vermelho Nv 2 de 60 para 16; ECN-05 e TSH-05 reescritos | ✅ Aceito | Exigidos pela spec: CRD-02 (carta 0 = melhoria de item dono), CRD-03 e a Assumption "Garantia de técnica passa para a carta 1"; PRC-01/02. O caso de 60 virou `shopAxisBuy.test.ts:95` (16 × 1,54 = 25). O `toHaveLength(1)` → `<= 1` é coberto pela unicidade de `shopAxes.test.ts:299-312` |
| Lote 6: preços inflados, trava a partir da r2, `difficulty`/`tuning`, AD-025 sobre a AD-014 | ✅ Aceito | PRC-03/04, ESC-01 e ESC-04 pedem cada mudança com o número novo; os testes antigos passaram a citar os IDs novos e o `run-loop` calcula pela fórmula |
| Cenários de smoke no `fxlab` em vez da área modular | ✅ Aceito | Só onde o boneco parado é a condição do AC (alvo intocado no raio, 7 golpes sem levar dano, alcance medido ao px); os demais seguem `hd=1&area=modular`. Os 4 smokes novos existem com a query da spec |
| `cbfdbdf` fora de um commit por tarefa | ✅ Aceito | Conserto de lint de ferramenta deixado pela T34, sem comportamento |
| Rodada 2: `37074e3` muda código (`red.ts:112`) além do teste | ✅ Aceito | Só acopla o `redEcho` ao retorno de `fx.afterimage` (que já devolvia se a cópia nasceu, `fx.ts:166`); a pós-imagem continua a mesma. O evento `bodyHit` (`bodyDirector.ts:90-91`) é só observabilidade, no padrão do `martelo:` e do `fistWave:` |

---

## Regressão dos consertos (`fcbe549..9abcef3`)

- `git diff fcbe549..9abcef3` toca 10 arquivos: `.specs/` (LESSONS, lessons.json, spec, validation), 2 smokes,
  `src/game/tech/red.ts` (+1/−1), `src/scenes/test/bodyDirector.ts` (+4), `tests/scenes/axisDirector.test.ts`,
  `tests/scenes/bodyDirector.test.ts` (novo).
- Asserções antigas: nenhuma removida nem afrouxada. A única linha de teste trocada é `axisDirector.test.ts:108`
  `toHaveLength(1)` → `:109` `toEqual([[0.4, 350]])`, mais forte. Nos smokes, o `chain` só ganhou o campo `elbow` no
  retorno; as asserções de tier e de vizinhos ficaram iguais.
- Arquivos travados (`TestScene.ts`, `ShopPanel.ts`, `Hud.ts`, `data/moves.ts`, `Player.ts`): diff vazio em
  `fcbe549..9abcef3`; em `75a22b4..9abcef3` só o `ShopPanel` da rodada 1 (`CARD_COUNT` e dica, SHX-03).
- `.oxlintrc.json`: diff vazio em `75a22b4..9abcef3`.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code / surgical | ✅ Tetos respeitados: nenhum arquivo novo no `.oxlintrc.json`; os avisos de lint em arquivos tocados já existiam em `75a22b4`; os consertos somam 5 linhas de código de produção |
| No scope creep | ✅ |
| Matches patterns | ✅ Diretores novos (`axisDirector`, `bodyDirector`, `fistWaves`, `wallStun`), regra pura com teste par; `bodyHit`/`redEcho` no padrão dos eventos de debug existentes |
| Spec-anchored outcome check | ✅ Os 4 efeitos de adaptador lidos do motor com o número da spec; payload `[[0.4, 350]]` afirmado |
| Per-layer coverage | ✅ Regra pura 1:1; adaptadores do Corpo e do Vermelho com leitura do efeito |
| Every test maps to a requirement | ✅ |
| Guidelines followed | `CLAUDE.md`, `.oxlintrc.json`, L-010, L-043, L-076, L-082 |

---

## Gate Check

- **Gate command**: `npm run gate` (worktree real, só leitura), exit 0
- **Result**: 4278 passed, 0 failed, 0 skipped, 220 arquivos; typecheck, oxlint (0 erros, só avisos de arquivos na
  exceção) e prettier verdes
- **Test count before feature**: 3696 (192 arquivos, `75a22b4`)
- **Test count rodada 1**: 4272 (219 arquivos, `fcbe549`)
- **Test count after feature**: 4278 (+5 do `bodyDirector.test.ts`, +1 do CRP-13 no `axisDirector.test.ts`)
- **Delta**: +582 sobre a base
- **Skipped tests**: nenhum
- **Smokes de base do sensor**: rodada 1 `red-axes`, `cursed-body`, `shop-axes`, `scale` (+ `kokusen-scale`),
  `kokusen`, `run-loop` verdes em `fcbe549`; rodada 2 `cursed-body` e `red-axes` verdes em `9abcef3`

---

## Fix Plans

Nenhum aberto. Os Fixes 1 a 5 da rodada 1 foram feitos em `6538b25`, `fd90381`, `02e3a70`, `37074e3` e `01eab27`; a
ressalva da T33 em `9abcef3`. Sugestão opcional, sem bloquear: `elbow.length > 0` antes do laço do CRP-09
(`cursed-body-branches.mjs:109`).

---

## Requirement Traceability Update

| Requirement | Previous Status (rodada 1) | New Status (rodada 2) |
| --- | --- | --- |
| SHX-01..03, TST-01..04 | ✅ Verified | ✅ Verified |
| VRM-01..05, VRM-07..16, VRM-18..20 | ✅ Verified | ✅ Verified |
| VRM-06 | ❌ Needs Fix (pós-imagem) | ✅ Verified |
| VRM-17 | ⚠️ gap de payload (350 ms) | ✅ Verified |
| CRP-01, CRP-02, CRP-04..07, CRP-10..12, CRP-14, CRP-15 | ✅ Verified | ✅ Verified |
| CRP-03 | ❌ Needs Fix (força do Peso) | ✅ Verified |
| CRP-08 | ❌ Needs Fix (+50 %) | ✅ Verified |
| CRP-09 | ❌ Needs Fix (alvo do Martelo) | ✅ Verified |
| CRP-13 | ⚠️ gap de payload (350 ms) | ✅ Verified |
| CRD-01..10, PRC-01..06, ESC-01..05 | ✅ Verified | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 63/63 requisitos com evidência; nenhum spec-precision gap
**Sensor**: rodada 2, 6/6 mortos (A1 a A4 e os novos N1, N2); rodada 1 + 2, 21/21 mutantes distintos mortos
**Gate**: 4278 passed, 0 failed

**What works**: eixos, tabela e base nova do Vermelho; ramos e Despertares do Vermelho lidos no motor (rebote, 70 %,
Contido, campo, parede, pós-imagem da Conjuração 3); Corpo nos números puros e no jogo (Peso na força, +50 % da
Cadência, 4 % no alvo do Martelo, alcance, ritmo, Fluxo, Fúria, onda e teto); câmera lenta do Despertar 0,4 por 350
ms; loja de 4 cartas, eixo, painel do ramo; preço, trava, inflação e piso; escala do comum e Kokusen escalado; tetos de
linha e travas de arquivo.

**Issues found**: nenhum bloqueante.

**Next steps**: feature pronta para integrar.
