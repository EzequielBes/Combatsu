# Visual, efeitos e jogabilidade — Validation

**Date**: 2026-09-23
**Spec**: `.specs/features/visual-e-jogabilidade/spec.md`
**Diff range**: `338ad6d..542fdb7` (branch `feat/visual-e-jogabilidade`, 30 commits, 45 arquivos)
**Verifier**: sub-agente independente (autor ≠ verificador). Ele não herdou o contexto dos workers, e toda medição foi refeita por scripts próprios (`v-*.mjs` no scratchpad).

## Validation

**Result**: FAIL

Motivo: AI-01 e AI-02 dependem da taxa de quadros. A 60 fps o inimigo anda a 34,3 e 68,6 px/s (tuning: 35 e 70). A 30 fps ele anda a 17,8 e 34,3 px/s, metade do tuning. No smoke em tempo real (~25 fps) mediu 15,5 e 29,3 px/s. Os outros 30 ACs têm evidência. FX-01 tem uma lacuna de precisão do spec com efeito observável: golpe ignorado ainda gera faísca e hitstop.

---

## Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1–T28 | ✅ Done | 75 checkboxes `[x]` e 0 `[ ]` em `tasks.md`; 30 commits no intervalo |

---

## Gate Check

- **Gate command**: `npm run build && npm test`
- **Result**: build ok (typecheck estrito + vite; só o aviso de chunk > 500 kB); **191 passed, 0 failed, 0 skipped** (16 arquivos)
- **Test count before feature**: 76 (medido pelo verifier no worktree temporário, em `338ad6d`: 10 arquivos, 76 testes)
- **Test count after feature**: 191
- **Delta**: +115
- **Integridade**: nos arquivos de teste pré-existentes, as únicas linhas removidas são imports: `tests/core/hit.test.ts:2` (+`canDamage`), `tests/core/level.test.ts` (+`tileVariant`) e o helper de `tests/game/bodyTags.test.ts:4` (+`team: 'enemy'`, exigido pelo tipo `Hittable`). Nenhuma asserção foi removida ou enfraquecida. Os 14 testes de combo continuam sem alteração, e `combo.test.ts` só ganhou um bloco novo.

---

## Spec-Anchored Acceptance Criteria

Legenda: ✅ bate com o spec · ❌ violação · ⚠️ lacuna de precisão do spec. Nos ACs de adaptador (matriz = none), a evidência é `arquivo:linha` do código mais o smoke próprio.

### P1: Ataque honesto

| AC | Resultado definido no spec | Evidência (`arquivo:linha` + expressão / medição) | Resultado |
| --- | --- | --- | --- |
| FIX-01 | Sem debug, 1/2/H não fazem nada | `src/scenes/TestScene.ts:96-98` `isDebug() && this.debugHit(...)` / `isDebug() && this.toggleDebugDraw()`. Smoke `v-a`: sem `?debug`, depois de 1,2,H,1,2 os estados ficaram `[['idle',60],['idle',60]]` iguais ao antes, `drawDebug=false`, `debugGraphic` inexistente | ✅ |
| FIX-02 | Hitbox invisível fora do debug | `src/game/hitbox.ts:75` `.setVisible(isDebug())`. Smoke `v-a`: em todo frame com a hitbox aberta, `view.visible` ∈ `{false}` | ✅ |
| FIX-03 | Soco não acerta com o centro a > 46 px, chute não acerta a > 55 px, J a 60 px não acerta | Varredura `v-a` de 36 a 62 px, com o inimigo pinado: maior distância com acerto do jab/cross = **45 px**, do chute = **52 px**; de 53 a 62 px nenhum acerto; `at60 = []`. Nenhum acerto no outro inimigo | ✅ |
| FIX-04 | Com `?debug` ou F1, 1/2/H funcionam e a hitbox aparece | `src/game/debug.ts:4,17-20`. Smoke `v-e` com `?debug`: 1 → `hitstun` com 52 de hp; 2 → `ragdollStun`; H → `drawDebug=true`; hitbox `visible=[true]`. Sem `?debug`, F1 → 1 tira 8 de hp; F1 de novo → 1 não faz nada e o desenho da física desliga (`drawDebugAfterF1Off=false`) | ✅ |

### P1: Base de pixel art

| AC | Resultado definido no spec | Evidência | Resultado |
| --- | --- | --- | --- |
| ART-01 | Todo sprite, tile e camada de fundo só com cores da paleta | Teste: `tests/game/art.test.ts:69,93,170,226,245,261,290,302`, `parseSheet(..., PALETTE_KEYS)` em todas as folhas. Código: `render.ts:81` pinta `PALETTE[ch]`; `background.ts:30` `fillStyle(PALETTE[key])`. Smoke `v-d`: a leitura de pixels de **todas** as texturas de canvas (terrain, player-art, enemy, rag-*, chair/bottle e shards, smoke, hud-bar, enemy-bar, fx-star, fx-bit) deu 0 cores fora da paleta. Fora da paleta há só o placeholder `player` (corpo físico invisível, `Player.ts:86`) e as texturas de texto do HUD | ✅ (observação menor na seção de lacunas) |
| ART-02 | Linhas desiguais, caractere fora da paleta ou frames de tamanhos diferentes lançam erro que nomeia o sprite | `tests/core/pixelGrid.test.ts:31` `toThrow(/heroi/)` (largura); `:37-39` `/heroi/`, `/'x'/`, `/\(1, 1\)/`; `:43-44` `toThrow(/inimigo.*tamanho/)`; `:48-49` folha sem frames e frame sem linhas | ✅ |
| ART-03 | 2 px de mundo por texel em sprite, tile e parte de ragdoll | `tests/game/art.test.ts:51` `expect(ART_SCALE).toBe(2)`; `:70-71` tile = `TILE`; `:113,178` altura × 2 = 48. Smoke `v-d`: frames `idle-0` 64×48 (32×24 texels), tile 32×32, `rag-head` 16×14, todas as partes do ragdoll com `scaleX=1` | ✅ |
| RES-01 | Zoom 1,5, round pixels, segue o player, nunca mostra fora da sala | `TestScene.ts:87-92`. Smoke `v-d`: `zoom=1.5`, `roundPixels=true`, `bounds=[0,0,1280,544]` = sala, `following=true`, câmera de UI com zoom 1; nos 4 cantos `worldView` ficou dentro de 0..1280 × 0..544 | ✅ |

### P1: Personagens animados

| AC | Resultado definido no spec | Evidência | Resultado |
| --- | --- | --- | --- |
| CHR-01 | 12 animações; hurt > golpe/swing/throw > ar (jump se vy<0, senão fall) > run (\|vx\|>10) > idle; variante carry | `tests/core/animState.test.ts:14-17` (10 → idle, 10,5 → run), `:21-23` jump/fall, `:27-29` golpe vence ar/run, `:33-34` swing/throw, `:38-40` `toBe('hurt')`, `:44-46` carry, `:50-51` carry no ar. `tests/game/art.test.ts:116-122`: as 12 animações existem. Smoke `v-d`/`v-e`: idle, run, jump → fall, carry-idle, carry-run, throw | ✅ |
| CHR-02 | Na fase ativa, o frame de membro esticado durante toda a janela | `tests/core/animState.test.ts:61` `attackFrame('active')).toBe('hit')`; `tests/core/combo.test.ts:175-176` a fase `active` coincide com `hitboxOn`. Smoke `v-a`: em todo frame com a hitbox aberta, os frames foram só `jab-hit`, `cross-hit` e `kick-hit` | ✅ |
| CHR-03 | Inimigo: exatamente uma de 6 animações, pelo cérebro e pela IA | `tests/core/animState.test.ts:76-117`: uma linha da tabela por teste, e `:117` varre brain × IA × moving e confere que o resultado está em ALL | ✅ |
| CHR-04 | Ragdoll com texturas recortadas da arte do inimigo, mesmas cores | `tests/game/art.test.ts:222-228` (partes só com cores dos frames) e `:233` (cabeça com o olho `A`). Smoke `v-d` depois do chute: `ragdollStun`, partes `rag-torso`, `rag-head` e 4× `rag-limb`, sprite escondido | ✅ |

### P1: Impacto do golpe

| AC | Resultado definido no spec | Evidência | Resultado |
| --- | --- | --- | --- |
| FX-01 | Golpe conecta → congela física e animações por 50 ms (leve) / 90 ms (forte) | Lógica: `tests/core/hitstop.test.ts:11` `toEqual({ light: 50, heavy: 90 })`, `:22-27` 49 → frozen, 50 → livre, `:32-36` o mesmo com 90. Adaptador: `TestScene.ts:151-158` (`world.pause`, `anims.pauseAll`, `tweens.pauseAll`, `time.paused`). Smoke `v-c2` com golpe **real** em tempo simulado: o inimigo fica parado por 3 frames = **50 ms** (60 fps) e 2 frames = 67 ms (30 fps) no leve; por 6 frames = **100 ms** (60 fps) e 3 frames = 100 ms (30 fps) no forte. `enemyMovedWhileFrozen=false` | ⚠️ ver suspeitas (b) e (d) |
| FX-02 | Novo golpe no congelamento fica com o maior, nunca a soma | `tests/core/hitstop.test.ts:63-72` (forte sobre leve = 90, não 50+90), `:74-83`, `:85-91` (dois leves = 50, não 100), `:93-102` | ✅ |
| FX-03 | Faísca no ponto de contato: branca no leve, âmbar no forte, roxa no objeto | `src/game/fx.ts:26-30` (`light: w/w`, `heavy: a/A`, `prop: u/U`); `hitbox.ts:71` `contactWith` por posição + tamanho, sem `body.bounds`. Smoke `v-d`: o combo deu faíscas `['light','light','heavy']`, e o golpe com a garrafa deu `['prop']` | ✅ |

### P1: Luta de verdade

| AC | Resultado definido no spec | Evidência | Resultado |
| --- | --- | --- | --- |
| HP-01 | Perde hp = dano, invulnerável por 700 ms | `tests/core/health.test.ts:12` `toEqual({maxHp:100, invulnMs:700, staggerMs:200, respawnMs:1000})`, `:28-30` 12 de dano → hp 88 e invulnerável, `:36-42` 699 → ainda invulnerável, 700 → `invulnEnd`. Smoke `v-b`: hp 100 → 88 no golpe da garra | ✅ |
| HP-02 | Invulnerável: ignora golpes e pisca | `tests/core/health.test.ts:37-38` `receive → 'ignored'`, hp continua 88. Piscar: `Player.ts:177-185` (alpha 0,25/1 a cada 70 ms enquanto `invulnerable`) | ✅ (o efeito do golpe ignorado está na suspeita (b)) |
| HP-03 | Recuo na direção do golpe e sem controle por 200 ms | `tests/core/health.test.ts:57-63` 199 → atordoado, 200 → `staggerEnd`. `Player.ts:132,141,149,153,156`: `stunned` trava golpe, pegar e mover; `vx = knockDir * 180`. Smoke `v-c2`: 33 px em 12 frames atordoado a 60 fps (+1 frame de atraso de medição = 36 px = 180 px/s × 0,2 s); `v-b`: recuo no sentido oposto ao inimigo (`dir=-1`) | ✅ |
| HP-04 | hp 0 → fade, respawn no spawn com 100 depois de 1000 ms, larga o objeto | `tests/core/health.test.ts:78-89` (8 × 12 → hp 4; `died`; 999 ms sem respawn; 1000 ms → `respawn`, hp 100). `Player.ts:188-202`. Smoke `v-b`: segurando a cadeira, `dead=true`, `heldAfter=false`, cadeira `rest`, `fade=true`; respawn em `(112,462)` = spawn, hp 100, 1154 ms de parede (headless) | ✅ |
| AI-01 | Player ≥ 200 px → patrulha ±48 px a 35 px/s | Lógica: `tests/core/enemyAI.test.ts:40` `toEqual(SPEC)`, `:54` `Math.abs(out.vx)).toBe(35)`, `:61-64` vira em ±48, `:78-82` fica na faixa. **Smoke por tempo (suspeita a)**: 60 fps simulado → **34,3 px/s**, faixa [-48, +48]; 30 fps simulado → **17,8 px/s**; tempo real no headless (~25 fps) → **15,5 px/s** | ❌ só a 60 fps |
| AI-02 | Player < 200 px → anda até ele a 70 px/s | Lógica: `tests/core/enemyAI.test.ts:97` `toBe(70)`, `:100` -70, `:115-116` volta a patrulhar em 200. **Smoke por tempo**: 60 fps → **68,6 px/s**; 30 fps → **34,3 px/s**; headless → **29,3 px/s** | ❌ só a 60 fps |
| AI-03 | < 40 px → preparo 450 ms, golpe ativo 120 ms com 12 de dano, descanso 800 ms, volta a perseguir | `tests/core/enemyAI.test.ts:125-128` (39 px → windup), `:134-135` (40 px → chase), `:141-163` (449/1 → attack + `hitboxOn`; 119/1 → `hitboxOff`; 799/1 → chase a 70), `:177` ordem dos eventos, `:44-45` dano 12 e activeMs 120. Smoke `v-c` a 60 fps simulado: windup **450 ms**, rest **800 ms**; attack 183 ms = 120 + ~50 do hitstop disparado pela própria garra (os timers de IA congelam, `TestScene.ts:107`) + arredondamento de frame. Tempo real: windup 454 ms; hp 100 → 88 → 76 | ✅ |
| AI-04 | Levar golpe no preparo ou no golpe cancela e recomeça o ciclo | `tests/core/enemyAI.test.ts:195-201`, `:204-212`, `:215-225` (novo `windupStart` e mais 450 ms inteiros), `:228-233`. `Enemy.ts:192` `this.onAI(this.ai.interrupt())` | ✅ |
| AI-05 | A garra nunca fere o próprio inimigo nem outros | `tests/core/hit.test.ts:36-46` `canDamage('enemy','enemy')).toBe(false)`; `hitbox.ts:67` `!canDamage(this.team, other.target.team)` antes do gate. Smoke `v-b`: segundo inimigo pinado dentro da faixa da garra por 2 golpes: `e1calls=0`, hp 60, sem dano no próprio (`e0calls=0`), player 100 → 76 | ✅ |

### P2 / P3

| AC | Resultado definido no spec | Evidência | Resultado |
| --- | --- | --- | --- |
| ENV-01 | 9 variantes, só pelos 4 vizinhos | `tests/core/level.test.ts:46` top, `:51` top-left, `:57` middle, `:62-63` left/right, `:68-69` thin-left/thin, `:74` bloco solto, `:80-90` borda do mapa, `:41` vazio → null. `tests/game/art.test.ts:74-75`: um frame por variante | ✅ |
| ENV-02 | 3 camadas de parallax com fator 0,1 / 0,3 / 0,6 atrás do terreno | `src/game/art/background.ts:83` `setScrollFactor(factor, factor)`. Smoke `v-d`: 3 `Graphics` com `sf=[0.1],[0.3],[0.6]` e depth -30/-20/-10; terreno com depth 0 | ✅ |
| PRP-01 | Cadeira e garrafa em sprites da paleta na escala 2; estilhaços recortados do próprio sprite | `tests/game/art.test.ts:244-247` (tamanho = corpo × 2), `:256-266` (fragmentos só com cores da origem), `:269-285` (cada fragmento é um recorte e juntos cobrem todos os texels). `Prop.ts` `shatter` usa `shardsKey(texture)` | ✅ |
| HUD-01 | Barra de hp do player fixa na tela | `src/game/Hud.ts:32-47`. Smoke `v-d`: `scrollFactor=0`, na camada de UI, largura 104 → 52 com hp 50 | ✅ |
| HUD-02 | Barra do inimigo depois do primeiro dano, até morrer | `Enemy.ts:198-210` `show = !isDead && hp < maxHp`. Smoke `v-d`: `before=false`, `after=true` (hp 26); o outro inimigo continua sem barra | ✅ |
| HUD-03 | Painel por 8 s ao iniciar/reiniciar; Tab alterna | `TestScene.ts:32,211,214`. Smoke `v-e`: escondido **7916 ms** de cena depois do reinício (medido a partir do HUD pronto, fim do `create`); Tab → visível, Tab → escondido | ✅ |
| FX-04 | Poeira ao pular, pousar ou virar correndo | `Player.ts:168-174`. Smoke `v-e`: `dustJump=['jump','ground']` (pulo + pouso), `dustTurn=['ground']` | ✅ |
| FX-05 | Rastro durante o chute ou o arremesso | `Player.ts:231`. Smoke `v-d`: 3 cópias no chute e 5 no arremesso | ✅ |

**Status**: ❌ AI-01 e AI-02 violados abaixo de 60 fps. ⚠️ FX-01 com lacuna de precisão. 30 de 32 ACs com evidência que bate com o spec.

---

## Edge Cases

- [x] Player morre segurando objeto → o objeto cai em repouso: `Player.ts:189-192` + `Prop.holderGone`; `tests/core/props.test.ts:79,83`; smoke `v-b` com a cadeira em `rest`.
- [x] Inimigo morre no preparo → hitbox nunca abre: `tests/core/enemyAI.test.ts:242-249` `expect(out.events).toEqual([])`; `Enemy.ts:217` (`canAct` falso para morto).
- [x] Reinício durante o hitstop → cena descongelada: `tests/core/hitstop.test.ts:106-120`; `TestScene.ts:58-65`. Smoke `v-d`: depois de `trigger(5000)` + R: `frozen=false`, world ativo, `time.paused=false`, anims e tweens ativos, e o player andou 105 px.
- [x] Golpe do inimigo e do próprio objeto no mesmo frame → só o do inimigo: `tests/core/props.test.ts:90` (o dono nunca se acerta) e `tests/core/hit.test.ts` (`makeHitGate` pré-existente).
- [x] Dois golpes de inimigo no mesmo frame → dano uma vez só: `tests/core/health.test.ts:46-49` `receive → 'hurt'`, depois `'ignored'`, hp 88.

---

## SPEC_DEVIATION

- `src/game/art/sprites/player.ts:6` (e `enemy.ts:6`, mesmo padrão): frames de 32×24 texels (64×48 px) em vez de 16×24, para caber o membro esticado do golpe. O desvio foi aceito e registrado no spec (Assumptions, "Tamanho dos sprites"). A escala de texel continua 2 e os corpos físicos continuam 20×36 e 22×36 (`tests/game/art.test.ts:113,178,244-247`).
- A lição conhecida da feature anterior (`body.bounds` alargado pela velocidade) foi respeitada: hitbox e ponto de contato usam posição + tamanho (`src/game/hitbox.ts:69-71`, `src/game/Enemy.ts:175-178`, `src/game/Player.ts:102-104`, `src/game/Prop.ts` `onTouch`).

---

## Suspeitas investigadas

### (a) Independência de taxa de quadros — **CONFIRMADA para o inimigo, REFUTADA para o player**

`World.update` do Phaser 3.90 (`node_modules/phaser/src/physics/matter-js/World.js:1174-1262`) usa passo fixo de 16,67 ms com acumulador e no máximo `ceil(maxFrameTime/16,67) = 2` steps por frame. O jogo aplica `setVelocity` uma vez por frame, com `PX_PER_S_TO_STEP = 1/60` (`src/game/physics.ts:4`).

Medições em tempo simulado com `game.headlessStep` (`v-c.mjs`) e em tempo real (`v-b.mjs`, `performance.now()`):

| Grandeza | Tuning | 60 fps (1 step/frame) | 30 fps (2 steps/frame) | Headless real (~25 fps) |
| --- | --- | --- | --- | --- |
| Corrida do player | 220 px/s | 220,0 | 220,0 | 179,7 (limite de 2 steps/frame → ~50 steps/s) |
| Recuo | 180 px/s × 200 ms = 36 px | 36 px | 36 px | 143 px/s |
| Patrulha | 35 px/s | 34,3 | **17,8** | **15,5** |
| Perseguição | 70 px/s | 68,6 | **34,3** | **29,3** |

- **Player (friction 0)**: independente de fps a partir de 30 fps. Abaixo de ~30 fps o runner descarta tempo (limite de 2 steps) e tudo que é físico fica em câmera lenta. Isso é esperado e vale para o jogo inteiro.
- **Inimigo**: o corpo tem `friction: 0.8` (`src/game/Enemy.ts:151`) e recebe a velocidade uma vez por frame (`src/game/Enemy.ts:230`). O atrito com o chão zera a velocidade horizontal depois do primeiro step. Com 2 steps por frame, o segundo quase não anda, e a velocidade real fica ≈ `vx × (frames/s)/60`. Resultado: AI-01 e AI-02 só batem a ≥ 60 fps. A 30 fps (monitor de 30 Hz, aba em economia de energia, máquina fraca, o próprio smoke) o inimigo anda na metade.

### (b) FX-01 com o player invulnerável — **CONFIRMADA** (efeito observável; o spec não define "connects")

`AttackHitbox` chama `onConnect` sempre depois de `receiveHit` (`src/game/hitbox.ts:68-71`), sem saber se o alvo aceitou o golpe. `Player.receiveHit` descarta o golpe em silêncio quando `Health` devolve `'ignored'` (`src/game/Player.ts:120-121`). O mesmo vale para `Enemy.receiveHit` com o cérebro morto (`src/game/Enemy.ts:189-190`) e para `Prop.onTouch` (`src/game/Prop.ts`).

Smoke `v-b` (`invulnHit`): com o player invulnerável, 2 golpes da garra em 3 s deram `hp 100 → 100`, `onConnect` 2×, `fx.spark` 2× e `frozenAfter=true` nas duas vezes. O mundo inteiro congela 50 ms, e sai faísca, num golpe que HP-02 manda ignorar.

Com um único inimigo isso não acontece em jogo normal (ciclo de 1370 ms > 700 ms de invulnerabilidade). Com os dois inimigos da sala, ou batendo num ragdoll que está dissolvendo, acontece. É ⚠️ lacuna de precisão do spec: FX-01 não diz se um golpe ignorado "conecta". Pela leitura conjunta com HP-02, o comportamento esperado é não gerar faísca nem hitstop.

### (c) `PropDef.debrisColor` fora da paleta — **REFUTADA** (não é renderizada)

`grep debrisColor` encontra só `src/core/props.ts:14` (tipo), `src/data/props.ts:13,25` (0x8d5524, 0x2a9d8f) e `tests/core/props.test.ts:18`. `Prop.shatter` foi reescrito para usar os fragmentos do sprite, e nenhum código lê o campo. É um campo morto, a limpar, sem violar ART-01.

### (d) Hitstop medido 60–75 / 106–108 ms — **CONFIRMADA como granularidade de frame**

O timer puro garante 50/90 ms exatos (`tests/core/hitstop.test.ts:22-36`). No adaptador, o golpe conecta no meio do step do Matter. O `update` desse frame já é pulado, e o timer desconta no `PRE_UPDATE` dos frames seguintes (`TestScene.ts:145-149`). Assim, o mundo fica parado por `ceil(ms / frame)` frames, contando o frame do acerto. Medição com golpe real (`v-c2`): leve 3 × 16,7 = **50 ms** a 60 fps e 2 × 33,3 = 67 ms a 30 fps; forte 6 × 16,7 = **100 ms** a 60 fps e 3 × 33,3 = 100 ms a 30 fps. Nunca fica abaixo do spec e passa dele em menos de 1 frame. Os 60–75 e 106–108 ms do headless (~25–30 fps) caem nesse padrão. ⚠️ O spec não fixa a tolerância; a diferença é só quantização.

---

## Discrimination Sensor

Scratch: `git worktree add --detach .../scratchpad/verifier-wt HEAD`, com junction de `node_modules` (removida com `cmd //c rmdir` antes de `git worktree remove --force` + `git worktree prune`). Cada mutação rodou `npx vitest run` (suíte inteira) e foi desfeita com `git checkout -- <arquivo>`, conferindo o porcelain do scratch limpo entre uma e outra.

| # | File:line | Mutação | Killed? |
| --- | --- | --- | --- |
| M1 | `src/core/enemyAI.ts:88` | `dist < attackRange` → `<=` | ✅ (1 falha) |
| M2 | `src/core/enemyAI.ts:107` | `interrupt()` no preparo deixa de sair do windup | ✅ (2) |
| M3 | `src/core/enemyAI.ts:126` | `timer += ms` → `timer = ms` (descarta a sobra) | ✅ (2) |
| M4 | `src/core/enemyAI.ts:99` | borda da patrulha `>=` → `>` | ✅ (1) |
| M5 | `src/core/enemyAI.ts:82` | fim do descanso sempre entra em `chase` | ❌ sobreviveu, **mutante equivalente**: o próximo `update()` passa pelo caminho `default` tanto em `chase` quanto em `patrol` e recalcula tudo pela distância, e `pickEnemyAnim` trata os dois estados igual (`animState.ts:94`). Não há saída observável diferente; a escolha na linha 82 é redundante |
| M6 | `src/core/health.ts:50` | tira `\|\| this.invulnerable` | ✅ (2) |
| M7 | `src/core/health.ts:60` | atordoamento = `invulnMs` | ✅ (1) |
| M8 | `src/core/health.ts:70` | respawn sem restaurar o hp | ✅ (2) |
| M9 | `src/core/hitstop.ts:13` | `Math.max` → soma | ✅ (4) |
| M10 | `src/core/animState.ts:48` | limiar de run `>` → `>=` | ✅ (2) |
| M11 | `src/core/animState.ts:46` | ar passa a vencer golpe | ✅ (2) |
| M12 | `src/core/animState.ts:58` | `hit` em `recovery` em vez de `active` | ✅ (2) |
| M13 | `src/core/animState.ts:93` | `rest` → `windup` | ✅ (1) |
| M14 | `src/core/pixelGrid.ts:47` | tira a checagem de altura entre frames | ✅ (1) |
| M15 | `src/core/pixelGrid.ts:40` | aceita caractere fora da paleta | ✅ (1) |
| M16 | `src/core/level.ts:108` | fora do mapa embaixo = vazio | ✅ (1) |
| M17 | `src/core/level.ts:112` | `left`/`right` trocados | ✅ (2) |
| M18 | `src/core/hit.ts:31` | `canDamage` sempre `true` | ✅ (1) |

**Sensor depth**: expandido (18 mutações em enemyAI, health, hitstop, animState, pixelGrid, tileVariant e canDamage)
**Resultado do sensor**: 17/18 mortos. O único sobrevivente é equivalente, com justificativa acima, e não indica teste fraco (sensor aprovado ✅)
**Isolamento**: `git status --porcelain` da árvore real depois da limpeza = baseline (`?? .agents/`, `?? .claude/`, `?? .cursor/`, `?? .windsurf/`); `node_modules` real intacto (35 entradas).

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ⚠️ `PropDef.debrisColor` ficou morto (`src/core/props.ts:14`, `src/data/props.ts:13,25`); escolha redundante em `enemyAI.ts:82` (M5) |
| Surgical changes | ✅ |
| No scope creep | ✅ (a nota de escopo de IA/vida foi registrada no design do sub-projeto 1) |
| Matches patterns | ✅ lógica pura em `src/core`, adaptadores finos (AD-001), paleta/texel (AD-002), duas câmeras (AD-003) |
| Spec-anchored outcome check | ✅ os valores asseridos batem com o spec (tuning real importado nos testes: `enemyAI.test.ts:40`, `health.test.ts:12`, `hitstop.test.ts:11`) |
| Per-layer coverage | ✅ domínio 1:1 com os ACs; dados de arte com `parseSheet`; adaptadores com build + smoke |
| Todo teste mapeia um requisito | ✅ (os testes extras de art.test cobrem Done-when de T8/T12/T17/T26/T27) |
| Guidelines | `vitest.config.ts`, `.specs/STATE.md` AD-001..003 |

---

## Lacunas ranqueadas

1. **[Major] AI-01/AI-02 dependem da taxa de quadros** (`src/game/Enemy.ts:151,230`). Velocidade real = tuning × (fps/60) abaixo de 60 fps: a 30 fps, 17,8 e 34,3 px/s em vez de 35 e 70. Correção sugerida: aplicar a velocidade horizontal da IA a cada step do Matter (evento `beforeupdate`), ou tirar o atrito de chão do inimigo enquanto ele anda (friction 0 como o player, mantendo o atrito para o ragdoll e o recuo), e cobrir o caso num smoke a 30 fps simulado.
2. **[Major, ⚠️ spec-precision] FX-01 × HP-02: golpe ignorado gera faísca e hitstop** (`src/game/hitbox.ts:68-71`, `src/game/Player.ts:120-121`, `src/game/Enemy.ts:189-190`, `src/game/Prop.ts` `onTouch`). Correção sugerida: `receiveHit` devolver se o golpe foi aplicado e chamar `onConnect` só nesse caso; e o spec definir "connects" = golpe aceito pelo alvo.
3. **[Minor, ⚠️ spec-precision] FX-01 sem tolerância de frame**: 90 ms vira 100 ms a 60 fps, e 50 ms vira 67 ms a 30 fps. Fica ≥ spec e < spec + 1 frame. O spec deveria dizer "ao menos N ms, arredondado ao frame".
4. **[Minor] ART-01 fora do escopo literal**: o texto do HUD (`src/game/Hud.ts:12,37`: `#e0e0e0`, `#00000088`) e o tint multiplicativo `setTint(PALETTE.u)` + fumaça com `scale 1.4` na dissolução (`src/game/Ragdoll.ts:275,282`, comportamento anterior à feature) geram na tela cores ou tamanhos de texel fora da regra. ART-01/ART-03 citam só sprite, tile, fundo e parte de ragdoll, mas o critério de sucesso diz "todo pixel de arte com o mesmo tamanho".
5. **[Cosmético] Campo morto `debrisColor`** com cores fora da paleta (`src/core/props.ts:14`, `src/data/props.ts:13,25`).

## Fix Plans

### Fix 1: velocidade do inimigo independente de fps
- **Root cause**: `setVelocity` uma vez por frame + `friction 0.8` contra o chão + até 2 steps fixos por frame.
- **Fix task**: em `src/game/Enemy.ts`, reaplicar `vx` da IA em todo step (`matter.world.on('beforeupdate')`) ou zerar o atrito do corpo enquanto `canAct`. Verificar: smoke em tempo simulado a 30 e 60 fps com patrulha 35±2 px/s e perseguição 70±3 px/s.
- **Priority**: Major

### Fix 2: sem faísca nem hitstop em golpe ignorado
- **Root cause**: `onConnect` não depende do resultado de `receiveHit`.
- **Fix task**: `Hittable.receiveHit(hit): boolean` (Player → `result !== 'ignored'`, Enemy → `events.length > 0`), com `hitbox.ts` e `Prop.ts` chamando `onConnect` só quando `true`. Verificar: smoke com o player invulnerável e `sparks = 0`, `frozen = false`. Atualizar o FX-01 no spec.
- **Priority**: Major

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| FIX-01..04, ART-01..03, RES-01, CHR-01..04, FX-02..05, HP-01..04, AI-03..05, ENV-01..02, PRP-01, HUD-01..03 | Implementing | ✅ Verified |
| FX-01 | Implementing | ⚠️ Verified com lacuna (golpe ignorado; tolerância de frame) |
| AI-01, AI-02 | Implementing | ❌ Needs Fix (dependência de fps) |

---

## Summary

**Overall**: ❌ Not Ready

**Spec-anchored check**: 30/32 ACs com o valor do spec; 2 violados (AI-01, AI-02 abaixo de 60 fps); 3 lacunas de precisão do spec (FX-01 "connects", tolerância de frame do FX-01, escopo de ART-01)
**Sensor**: 17/18 mortos (1 equivalente, com justificativa)
**Gate**: 191 passed, 0 failed (antes 76)

**What works**: ataque honesto e ferramentas de debug fechadas; pixel art 100% na paleta com texel 2; câmera; animações e frame do golpe presos à fase ativa; ciclo da IA com os tempos certos; vida, invulnerabilidade, recuo e respawn; hitstop sem soma; parallax, objetos, HUD e efeitos.

**Issues found**: velocidade do inimigo cai à metade a 30 fps (Fix 1); golpe ignorado ainda congela e solta faísca (Fix 2).

**Next steps**: rotear Fix 1 e Fix 2 para um implementer e re-verificar (iteração 1 de 3).

**validate_state.py** (`python .claude/skills/tlc-spec-driven/scripts/validate_state.py visual-e-jogabilidade`): exit 1 — `ERROR visual-e-jogabilidade: validation.md verdict is FAIL - route the ranked gaps to fix tasks, then re-verify (feature is not done)`. É o esperado para um relatório FAIL legível: o veredito foi reconhecido e não é placeholder.
