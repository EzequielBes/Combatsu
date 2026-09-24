# Visual, efeitos e jogabilidade — Validation (rodada 2)

**Date**: 2026-09-23
**Spec**: `.specs/features/visual-e-jogabilidade/spec.md` (34 requisitos, incluindo AI-06, FX-06, o FX-01 com tolerância de 1 frame, o ART-01 ampliado e o caso de borda da patrulha presa)
**Diff range**: `338ad6d..1697e88` (branch `feat/visual-e-jogabilidade`, 40 commits, 51 arquivos, +4572/−296). As correções da rodada 1 estão em `eb8914a..1697e88` (8 commits: T29–T33 e os ajustes de spec/tasks).
**Verifier**: sub-agente independente, rodada 2 (autor ≠ verificador). Ele não escreveu a feature nem as correções. Toda medição foi refeita com scripts próprios (`v2-*.mjs` no scratchpad), sem reaproveitar os resultados da rodada 1.

## Validation

**Result**: FAIL

Motivo, em uma linha: as quatro lacunas da rodada 1 que tinham correção foram fechadas (AI-06, FX-06, tolerância do FX-01, `debrisColor`), e o caso da patrulha presa também, mas:

1. o T29 introduziu uma regressão: o inimigo que anda, ao levar um golpe, avança ~8 px no sentido em que andava (em direção ao player, quando persegue) em vez de parar;
2. o ART-01 ampliado continua violado em dois pontos medidos no framebuffer: as partículas da dissolução saem 100% fora da paleta (tint multiplicativo), e as faixas de dither do céu deixam aparecer a cor de fundo `#1b1b2f`, que também está fora da paleta;
3. um mutante do limiar de 1 px da patrulha presa sobrevive à suíte.

---

## Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1–T28 | ✅ Done | Verificadas na rodada 1; os pontos tocados pelas correções foram reexecutados aqui |
| T29 | ⚠️ Partial | AI-06 cumprido (medido). O done-when "Recuo, ragdoll e levantar continuam como antes" está marcado `[x]`, mas é **falso**: ver a lacuna 1 |
| T30 | ✅ Done | FX-06 medido nos cinco casos |
| T31 | ⚠️ Partial | O texto do HUD e o `setTintFill` da dissolução estão na paleta, mas as partículas da fumaça (`tint: CURSE`, multiplicativo) continuam fora dela. O grep por `0x`/`#` do done-when não pega esse caso |
| T32 | ✅ Done | `grep -rn debrisColor src tests` → 0 linhas |
| T33 | ✅ Done (teste fraco) | O comportamento foi medido no jogo, mas o limiar de 1 px não está preso por teste (mutante M3) |

`tasks.md`: 89 `[x]` e 0 `[ ]`.

---

## Gate Check

- **Gate command**: `npm run build && npm test`
- **Result**: build ok (typecheck estrito + vite; só o aviso de chunk > 500 kB). **195 passed, 0 failed, 0 skipped** (16 arquivos)
- **Test count before feature**: 76 (em `338ad6d`, medido na rodada 1)
- **Test count after feature**: 195 (191 na rodada 1, mais 4 testes do T33)
- **Delta**: +119
- **Integridade dos testes**:
  - `git diff 338ad6d..HEAD -- tests`: as únicas linhas removidas de testes pré-existentes são dois imports ampliados (`hit.test.ts:2`, `level.test.ts`), a linha `debrisColor: 0xffffff` do fixture de `props.test.ts` (T32; o campo deixou de existir) e o helper de `bodyTags.test.ts:4`. Nenhuma asserção foi removida.
  - `git diff eb8914a..HEAD -- tests`: `enemyAI.test.ts` só ganhou o bloco novo (linhas 252–288). Em `props.test.ts`, só saiu a linha do campo morto. Em `bodyTags.test.ts:4`, `receiveHit: vi.fn()` virou `vi.fn(() => true)`, que é o ajuste de tipo exigido pelo novo retorno `boolean`. Nenhum teste da feature foi enfraquecido.

---

## Spec-Anchored Acceptance Criteria

Legenda: ✅ bate com o spec · ❌ violação · ⚠️ lacuna de precisão do spec. Os ACs de adaptador (matriz = none) são verificados por inspeção `arquivo:linha` mais smoke próprio. "Simulado" = tempo de jogo com `game.headlessStep` a dt fixo (60 fps = 1 step do Matter por frame; 30 fps = 2 steps por frame), com steps contados pelo `afterupdate`.

### P1: Ataque honesto

| AC | Resultado definido no spec | Evidência | Resultado |
| --- | --- | --- | --- |
| FIX-01 | Sem debug, 1/2/H não fazem nada | `src/scenes/TestScene.ts:96-98` (`isDebug() && ...`). Smoke `v2-reg`: teclas 1,2,H,1,2 reais → `[['idle',60],['idle',60]]` antes e depois, `drawDebug=false`, sem `debugGraphic` | ✅ |
| FIX-02 | Hitbox invisível fora do debug | `src/game/hitbox.ts:75` `.setVisible(isDebug())`. Smoke `v2-reg`: em todos os frames com a hitbox aberta durante a varredura de alcance, `view.visible ∈ {false}` | ✅ |
| FIX-03 | Soco não acerta com o centro a > 46 px, chute não acerta a > 55 px; J a 60 px não acerta | Smoke `v2-reg`, inimigo pinado de 36 a 62 px com o combo real: maior distância com acerto do jab = **45**, do cross = **45**, do chute = **52**; nenhum acerto a ≥ 60 px; 0 acertos no outro inimigo | ✅ |
| FIX-04 | `?debug` ou F1 liga 1/2/H e desenha a hitbox | `src/game/debug.ts`. Smoke `v2-reg`: com `?debug`, 1 → `hitstun` (hp 52), 2 → `ragdollStun` (34), H → `drawDebug=true`, J → hitbox `visible=[true]`. Sem `?debug`: F1 → 1 tira 8 de hp; H liga o desenho; F1 de novo → `drawDebug=false` e 1 não faz nada | ✅ |

### P1: Base de pixel art

| AC | Resultado definido no spec | Evidência | Resultado |
| --- | --- | --- | --- |
| ART-01 | **Tudo que é desenhado** (sprite, tile, fundo, partícula, tint, texto do HUD) só com cores da paleta | Testes: `tests/game/art.test.ts:69-71,222-228,244-247` (`parseSheet(..., PALETTE_KEYS)`). Texturas (`v2-art`): leitura de pixels de **todas** as texturas de canvas (terrain, player-art, enemy, rag-*, chair/bottle e shards, smoke, hud-bar, enemy-bar, fx-star, fx-bit) → **0** cores fora da paleta. O placeholder `player` (0x3a86ff) é o corpo invisível (`visible=false`). HUD: `src/game/Hud.ts:13-15,40` usa `PALETTE.w`/`PALETTE.k`; os únicos pixels fora da paleta no texto são de borda de glifo com alpha < 255 (`offPaletteOpaque = 0`). **Violação 1, partículas/tint**: `src/game/Ragdoll.ts:36,109` `tint: CURSE` (multiplicativo) sobre a fumaça `SMOKE` toda em `w` (`src/game/art/sprites/props.ts:46`, 0xfff4e0). Leitura do framebuffer WebGL com as partículas em alpha 1 sobre preto: renderizadas **0x3b1c4e, 0xcf8ee0, 0x7b3ca2**, ou seja, **532/532 px fora da paleta** (w×v, w×U, w×u). **Violação 2, fundo**: `src/game/art/background.ts:99-103`. Nas faixas `dither(…, 'E')` (y 150–162) e `dither(…, 'f')` (y 240–252), só metade dos texels é pintada, e nada fica embaixo. A outra metade mostra o `backgroundColor: '#1b1b2f'` do jogo (`src/main.ts:11`, fora da paleta): **11 214 a 14 652 px** dessa cor por tela nos 4 cantos da sala e no centro (faixas nas linhas de tela 76–256) | ❌ |
| ART-02 | Linhas desiguais, caractere fora da paleta ou frames de tamanhos diferentes lançam erro com o nome do sprite | `tests/core/pixelGrid.test.ts:31` `toThrow(/heroi/)`; `:37-39` `/heroi/`, `/'x'/`, `/\(1, 1\)/`; `:43-44` `toThrow(/inimigo.*tamanho/)` | ✅ |
| ART-03 | 2 px de mundo por texel em sprite, tile e parte de ragdoll | `tests/game/art.test.ts:51` `expect(ART_SCALE).toBe(2)`; `:70-71` tile = `TILE`; `:113` altura × 2 = 48. Smoke `v2-misc`: partes do ragdoll com `scaleX=[1]`; `Ragdoll.ts:107` fumaça agora começa em `scale 1` | ✅ |
| RES-01 | Zoom 1,5, round pixels, segue o player, nunca mostra fora da sala | `TestScene.ts:87-92`. Smoke `v2-misc`/`v2-misc2`: `zoom=1.5`, `roundPixels=true`, `bounds=[0,0,1280,544]`, `following=true`, câmera de UI com zoom 1; `worldView` nos 4 cantos = `[0,0,640,360]`, `[640,0,1280,360]`, `[0,184,640,544]`, `[640,184,1280,544]` (dentro da sala) | ✅ |

### P1: Personagens animados

| AC | Resultado definido no spec | Evidência | Resultado |
| --- | --- | --- | --- |
| CHR-01 | 12 animações com a precedência do spec e a variante carry | `tests/core/animState.test.ts:14-17` (10 → idle, 10,5 → run), `:21-23`, `:27-29`, `:33-34`, `:38-40` `toBe('hurt')`, `:44-46`, `:50-51` (arquivo sem alteração desde a rodada 1) | ✅ |
| CHR-02 | Frame de membro esticado durante toda a fase ativa | `tests/core/animState.test.ts:61` `attackFrame('active')).toBe('hit')`; `tests/core/combo.test.ts:175-176`. Smoke `v2-misc`: rastro do chute só em `kick-hit` | ✅ |
| CHR-03 | Inimigo: exatamente uma de 6 animações | `tests/core/animState.test.ts:76-117`; `:117` varre brain × IA × moving contra `ALL` | ✅ |
| CHR-04 | Ragdoll com texturas recortadas da arte do inimigo | `tests/game/art.test.ts:222-228,233`. Smoke `v2-misc`: `deadRagdoll` com `rag-torso`, `rag-head` e 4× `rag-limb`, sprite escondido | ✅ |

### P1: Impacto do golpe

| AC | Resultado definido no spec | Evidência | Resultado |
| --- | --- | --- | --- |
| FX-01 | Golpe aceito congela física e animações por ≥ 50 e < 50 + 1 frame (leve) e por ≥ 90 e < 90 + 1 frame (forte) | Lógica: `tests/core/hitstop.test.ts:11` `toEqual({ light: 50, heavy: 90 })`, `:23-27` (49 → congelado, 50 → livre), `:34-36`. Adaptador: `TestScene.ts:145-158`. Smoke `v2-fx`, golpe real, tempo entre o frame do acerto e o próximo step do Matter: leve **50,0 ms** (60 fps, frame 16,7) e **66,7 ms** (30 fps, frame 33,3); forte **100 ms** (60 fps) e **100 ms** (30 fps). Todos ≥ ms e < ms + frame; animação do inimigo e posição sem mudança durante o congelamento | ✅ |
| FX-02 | Novo golpe no congelamento fica com o maior, nunca a soma | `tests/core/hitstop.test.ts:63-72,74-83,85-91,93-102`; mutante M6 (`max` → último) morto | ✅ |
| FX-03 | Faísca no ponto de contato: branca no leve, âmbar no forte, roxa no objeto | `src/game/fx.ts:26-30`; `hitbox.ts:69-71` (`contactWith` por posição + tamanho). Smoke `v2-fx`: combo → `['light','light','heavy']` com `shake=1`; `v2-misc`: golpe com a garrafa → `['prop']` | ✅ |
| FX-06 | Golpe ignorado (player invulnerável, inimigo morto ou dissolvendo, dono, mesmo time) não gera faísca, tremida nem congelamento | `src/game/hitbox.ts:68` `if (!other.target.receiveHit(hit)) return;`, `src/game/Prop.ts:138-142`, `Player.ts:119-128` (`'ignored'` → `false`), `Enemy.ts:104-111` (`[]` → `false`), `bodyTags.ts:19`. Smoke `v2-fx` com contadores em `fx.spark`, `fx.shake` e `hitstop.trigger`: **invulnerável**: a garra chama `receiveHit` e recebe `false`, com 0/0/0, hp continua 99; **morto** (`deadRagdoll`): 5 golpes ignorados com 0/0/0; **dissolvendo**: 1 golpe ignorado com 0/0/0; **dono** (garrafa arremessada tocando o player): 0 chamadas e 0/0/0; **mesmo time** (inimigo 1 dentro da garra): 0 chamadas no inimigo 1. **Aceito continua**: garra no player vulnerável → `['light']` + `trigger [50]`; combo → 3 faíscas + `[50,50,90]` + 1 tremida. Mutante de adaptador M12 (gate removido) morto pelo smoke | ✅ |

### P1: Luta de verdade

| AC | Resultado definido no spec | Evidência | Resultado |
| --- | --- | --- | --- |
| HP-01 | Perde hp = dano e fica invulnerável por 700 ms | `tests/core/health.test.ts:12` `toEqual(SPEC)` (100/700/200/1000), `:28-30`, `:36-40`. Smoke `v2-reg`: hp 100 → 88 → 76 → 64 pela garra; invulnerabilidade de 717 ms simulados (700 + quantização de 1 frame) | ✅ |
| HP-02 | Invulnerável ignora golpes e pisca | `tests/core/health.test.ts:37-38`; `Player.ts:177-185`. Smoke `v2-fx`: garra durante a invulnerabilidade → `receiveHit=false`, hp inalterado | ✅ |
| HP-03 | Recuo na direção do golpe e sem controle por 200 ms | `tests/core/health.test.ts:57-63`; `Player.ts:133,157` (`vx = knockDir * PLAYER_KNOCKBACK`) | ✅ |
| HP-04 | hp 0 → fade, respawn no spawn com 100 depois de 1000 ms, larga o objeto | `tests/core/health.test.ts:78-89`; `Player.ts:188-202`. Smoke `v2-reg`: segurando a cadeira (`held`), morre (`dead=true`), cadeira `rest`, fade visto, respawn em (112, 462) = spawn (112, 464 − 2 de `SPAWN_LIFT`), hp 100, ~1017 ms simulados depois da morte | ✅ |
| AI-01 | Player ≥ 200 px → patrulha ±48 px a 35 px/s | Lógica: `tests/core/enemyAI.test.ts:40` `toEqual(SPEC)`, `:54` `toBe(35)`, `:61-64` vira em ±48. Smoke `v2-speed2` (8 s simulados): inimigo 0 com faixa **[−48, +48]** (60 fps) e [−48,6, +48,6] (30 fps), **34,3 px/s** | ✅ |
| AI-02 | Player < 200 px → anda até ele a 70 px/s | `tests/core/enemyAI.test.ts:97` `toBe(70)`, `:100` `-70`, `:116`. Smoke: **68,6 px/s** a 60 e a 30 fps | ✅ |
| AI-03 | < 40 px → preparo 450, golpe ativo 120 com 12 de dano, descanso 800, volta a perseguir | `tests/core/enemyAI.test.ts:125-177`, `:44-45`. Smoke `v2-reg` (tempo simulado sem hitstop): windup **450/450/450**, attack **133** (120 quantizado ao frame; a sobra volta no descanso pela carga de `next()`), rest **800/800**, 12 de dano por golpe | ✅ |
| AI-04 | Golpe no preparo ou no golpe cancela e recomeça o ciclo | `tests/core/enemyAI.test.ts:195-233`; `Enemy.ts:108` `this.onAI(this.ai.interrupt())` | ✅ (a reação ao golpe tem a regressão da lacuna 1) |
| AI-05 | A garra nunca fere o próprio inimigo nem outros | `tests/core/hit.test.ts:41` `canDamage('enemy','enemy')).toBe(false)`; `hitbox.ts:67`. Smoke `v2-fx`: 0 chamadas de `receiveHit` no inimigo 1 dentro da garra; mutante M8 morto | ✅ |
| AI-06 | Patrulha e perseguição no tuning ±10% a 30 e a 60 fps | `src/game/Enemy.ts:49-53,77,137` (vx reaplicado em todo `beforeupdate`). Smoke `v2-speed2`, tempo simulado (distância total ÷ steps/60), **referência do player: 220,0 px/s nos dois casos**: **60 fps** (1 step/frame): patrulha **34,3** (−2,0%), perseguição **68,6** (−2,0%); **30 fps** (2 steps/frame): patrulha **34,3**, perseguição **68,6**. No loop real do headless (`v2-speed`, `afterupdate`, ~25 fps, 2 steps/frame, com e sem `fpsLimit=30`): 34,3 e 68,6. Mutante M13 (reaplique desligado) → 17,85 e 33,88 a 30 fps: morto pelo smoke | ✅ |

### P2 / P3

| AC | Resultado definido no spec | Evidência | Resultado |
| --- | --- | --- | --- |
| ENV-01 | 9 variantes só pelos 4 vizinhos | `tests/core/level.test.ts:41-90` (ex.: `:46` `toBe('top')`, `:68-69` `thin-left`/`thin`); mutantes de `tileVariant` da rodada 1 (arquivo sem alteração) | ✅ |
| ENV-02 | 3 camadas de parallax 0,1 / 0,3 / 0,6 atrás do terreno | `background.ts:83`. Smoke `v2-misc`: `[[0.1,0.1,-30],[0.3,0.3,-20],[0.6,0.6,-10]]`, terreno com depth `[0]` | ✅ (cor: ver ART-01) |
| PRP-01 | Cadeira e garrafa na escala 2; estilhaços recortados do próprio sprite | `tests/game/art.test.ts:244-247,256-285`. Smoke `v2-misc`: a garrafa quebra em 10 objetos `bottle-shards:s0..` | ✅ |
| HUD-01 | Barra de hp do player fixa na tela | `Hud.ts`. Smoke `v2-misc2`: `scrollFactor=0`, na camada de UI, largura 104 → 52 com hp 50 | ✅ |
| HUD-02 | Barra do inimigo do primeiro dano até morrer | `Enemy.ts:115-127`. Smoke `v2-misc`: `before=false`, `after=true`, o outro inimigo continua sem barra, `afterDeath=false` | ✅ |
| HUD-03 | Painel por 8 s ao iniciar/reiniciar; Tab alterna | `TestScene.ts:32,211,214`; `Hud.ts:58-72` (`delayedCall(ms)`). Smoke `v2-reg`: visível no início, escondido ~8,2 s de cena depois do R (a observação começa ~300 ms depois do R); Tab → `true`, Tab → `false` | ✅ |
| FX-04 | Poeira ao pular, pousar ou virar correndo | `Player.ts:168-174`. Smoke `v2-misc`: 2 nuvens no pulo + pouso, 1 na virada | ✅ |
| FX-05 | Rastro no chute ou no arremesso | `Player.ts:232`. Smoke `v2-misc`: 6 cópias no chute, todas `kick-hit` | ✅ |

**Status**: ❌ 33/34 ACs batem com o spec. ART-01 está violado (partículas tingidas e dither do céu). Nenhuma lacuna nova de precisão do spec. Há ainda uma regressão fora da tabela de ACs (lacuna 1) e um mutante sobrevivente (lacuna 4).

Interpretação aplicada ao ART-01: composição por alpha (fade, piscar, bordas de glifo com cobertura parcial) não conta como "cor", porque a cor de origem continua da paleta. Tint multiplicativo e fundo sem pintura contam, porque a cor de origem na tela deixa de ser da paleta.

---

## Edge Cases

- [x] **Player morre segurando objeto → o objeto cai em repouso**: `Player.ts:189-192` + `Prop.holderGone`; `tests/core/props.test.ts:78,82` `holderGone()).toBe(true)`. Smoke `v2-reg`: cadeira `held` → `rest` na morte.
- [x] **Inimigo morre no preparo → a hitbox nunca abre**: `tests/core/enemyAI.test.ts:242-249` `expect(out.events).toEqual([])`.
- [x] **Patrulha presa (avança < 1 px em 200 ms) → inverte**: `src/core/enemyAI.ts:4-6,115,120-132`; `tests/core/enemyAI.test.ts:256-261` (208 ms parado → `vx -35`, `facing -1`), `:264-269` (160 ms → `35`), `:282-287` (perseguição não vira). Smoke `v2-speed2`: o inimigo da direita (spawn **1200**, parede em 1248) inverte em **x = 1236,6** depois de **217 ms** parado, vai até 1152 (−48) e volta: 3 inversões em 8 s, a 60 e a 30 fps, faixa [−48,5, +37,2]. ⚠️ O limiar de 1 px não está preso por teste (mutante M3; lacuna 4).
- [x] **Reinício durante o hitstop → cena descongelada**: `tests/core/hitstop.test.ts:105-120`; `TestScene.ts:58-65`. Smoke `v2-reg`: `trigger(5000)` + restart → `frozen=false`, world ativo, `time.paused=false`.
- [x] **Golpe do inimigo e do próprio objeto no mesmo frame → só o do inimigo**: `tests/core/props.test.ts:89-94` (`tryHit(PLAYER)).toBe(false)`); smoke `v2-fx` (dono): 0 chamadas.
- [x] **Dois golpes de inimigo no mesmo frame → dano uma vez só**: `tests/core/health.test.ts:45-49` (`'hurt'`, depois `'ignored'`, hp 88).

---

## Status das lacunas da rodada 1

| # | Lacuna da rodada 1 | Status | Evidência |
| --- | --- | --- | --- |
| 1 | [Major] AI-01/02 dependem da taxa de quadros | ✅ **Fechada** | 34,3/68,6 px/s com 1 e 2 steps/frame (antes: 17,8/34,3 a 30 fps); player a 220 nos dois; M13 volta a quebrar e o smoke detecta. O efeito colateral está na lacuna nova 1 |
| 2 | [Major] Golpe ignorado gera faísca e hitstop | ✅ **Fechada** | FX-06 nos cinco casos, com 0 faísca/tremida/trigger; golpe aceito mantém o feedback; M12 detectado |
| 3 | [Minor] FX-01 sem tolerância de frame | ✅ **Fechada** | Spec: "≥ ms e < ms + 1 frame". Medido 50/66,7 (leve) e 100/100 (forte) a 60/30 fps |
| 4 | [Minor] ART-01 (texto do HUD, tint e fumaça da dissolução) | ⚠️ **Parcial, aberta** | Texto do HUD: fechado (`PALETTE.w`/`k`). Partes do ragdoll: fechado (`setTintFill(PALETTE.u)`, smoke `tintFill=true`, `7b3fb8`). Escala da fumaça: fechado (`scale 1`). **Partículas da fumaça: abertas** (tint multiplicativo, 100% fora da paleta no framebuffer) |
| 5 | [Cosmético] Campo morto `debrisColor` | ✅ **Fechada** | `grep -rn debrisColor src tests` → vazio |
| — | Caso de borda da patrulha presa (achado depois da rodada 1) | ✅ **Fechada** (teste fraco) | Smoke: vai e volta na parede; limiar sem teste discriminante (M3) |

---

## Discrimination Sensor

Scratch: `git worktree add --detach …/scratchpad/verifier2-wt HEAD` (1697e88), com junction de `node_modules` (PowerShell `New-Item -ItemType Junction`). Cada mutação rodou `npx vitest run` (a suíte inteira) e foi desfeita com `git checkout -- <arquivo>`, com porcelain do scratch vazio entre uma e outra. As mutações de adaptador (M12, M13) rodaram o **smoke** contra o vite do worktree, porque a matriz de cobertura define o smoke como o teste dessa camada. Worktrees auxiliares de comparação: `verifier2-pre` (`f389390`, antes do T29) e `verifier2-base` (`338ad6d`, antes da feature).

| # | File:line | Mutação | Resultado |
| --- | --- | --- | --- |
| M1 | `src/core/enemyAI.ts:129` | patrulha presa não inverte (linha removida) | ✅ morto (1 falha) |
| M2 | `src/core/enemyAI.ts:6` | `PATROL_STALL_MS` 200 → 400 | ✅ morto (1) |
| M3 | `src/core/enemyAI.ts:5` | `PATROL_STALL_PX` 1 → 2 | ❌ **sobreviveu, e não é equivalente**. No cenário de `tests/core/enemyAI.test.ts:271-280` (0,1 px/frame), com 2 px o inimigo inverte **2 vezes** em 600 ms e termina no mesmo sentido; o teste só confere o `vx` final (`:279`). Réplica determinística: PX=1 → 0 inversões; PX=2 → 2 inversões, sentido final +1. O spec fixa "less than 1 px in 200 ms" → lacuna 4 |
| M4 | `src/core/enemyAI.ts:65` | não zera o stall ao sair da patrulha | ❌ sobreviveu, **equivalente pelo spec**. Só muda algo se a patrulha é interrompida (perseguição/preparo/descanso) e retomada sem o inimigo ter andado 1 px: aí o tempo parado de antes da interrupção continua contando. O spec diz "while it patrols" e não define se a contagem recomeça depois de uma interrupção. Não indica teste fraco para um valor do spec |
| M5 | `src/core/enemyAI.ts:127` | `stallMs += dtMs` → `= dtMs` | ✅ morto (1) |
| M6 | `src/core/hitstop.ts:13` | `Math.max(remaining, ms)` → `ms` (o último vence) | ✅ morto (1) |
| M7 | `src/core/hitstop.ts:9` | `remainingMs > 0` → `>= 0` | ✅ morto (12) |
| M8 | `src/core/hit.ts:31` | `canDamage` sempre `true` | ✅ morto (1) |
| M9 | `src/core/enemyAI.ts:110` | perseguição sem o sinal (`facing *` removido) | ✅ morto (1) |
| M10 | `src/data/fx.ts:4` | `heavy: 90` → `100` | ✅ morto (2) |
| M11 | `src/data/tuning.ts:89` | `patrolSpeed: 35` → `38` | ✅ morto (9) |
| M12 | `src/game/hitbox.ts:68` | adaptador: ignora o retorno de `receiveHit` (volta ao comportamento da rodada 1) | ✅ morto pelo smoke `v2-fx`: player invulnerável → `spark ['light']`, `trigger [50]` |
| M13 | `src/game/Enemy.ts:51` | adaptador: `onStep` não reaplica o vx | ✅ morto pelo smoke `v2-speed2`: a 30 fps, patrulha 17,85 e perseguição 33,88 px/s (60 fps continua 34,3/68,6) |

**Sensor depth**: expandido (13 mutações: detecção de patrulha presa, hitstop, `canDamage`, sinal da perseguição, dados de tuning e 2 adaptadores)
**Resultado do sensor**: 11/13 mortos. M4 é equivalente, com justificativa. **M3 sobreviveu sem ser equivalente → FAIL do sensor** (lacuna 4).
**Isolamento**: junctions removidas com `cmd /c rmdir` antes de `git worktree remove --force` (×3) + `git worktree prune`. `git worktree list` mostra só a árvore principal. `git status --porcelain` da árvore real = baseline (`?? .agents/`, `?? .claude/`, `?? .cursor/`, `?? .windsurf/`), confirmado por `diff` (igual). `git stash list` vazio. `node_modules` real intacto (`.bin` presente).

---

## Lacunas novas (rodada 2)

### Lacuna 1 — [Major] Regressão do T29: o inimigo atingido continua andando

- **Causa raiz**: `walkVxStep` só é recalculado em `Enemy.update` (`src/game/Enemy.ts:137`). O Matter faz os seus steps (com o `beforeupdate` → `onStep`, `:50-53`) no evento UPDATE da cena, **antes** do `TestScene.update`. Quando um golpe é aceito (`receiveHit`, `:104-111`), o hitstop congela a cena e o `update` desse frame é pulado. Ao descongelar, o primeiro step reaplica o vx de andar **velho** por cima da reação ao golpe (`playHitReaction`, `:199`, que faz `setVelocity(d.x*force, -1)` e tira o inimigo do chão). Sem atrito no ar, o inimigo desliza no sentido em que andava durante o hitstun.
- **Medição** (tempo simulado, 60 fps; `v2-knock3` em HEAD × `f389390`):
  - Jab real do player num inimigo que persegue (apertado de 46 a 56 px): em HEAD, o inimigo **avança 7,5–8,5 px em direção ao player** nos 12 steps depois do golpe. Em `f389390` e em `338ad6d`, ele fica parado (0 px).
  - Golpe leve aplicado pelo caminho `receiveHit` + `onConnect` fora de contato (igual à tecla 1 do debug, `v2-knock2`): em `f389390`, **recua 17,5 px** no sentido do golpe; em HEAD, recua **0** e desliza **7,4 px** (perseguição) ou 3,3 px (patrulha) no sentido contrário ao golpe.
- **Por que bloqueia**: o done-when do T29 ("Recuo, ragdoll e levantar continuam como antes") está marcado `[x]`, e o comportamento mudou. O spec põe mudanças de física/movimento fora do escopo. A reação ao golpe do inimigo é parte do "feel" que a feature existe para avaliar.
- **Fix task**: em `src/game/Enemy.ts`, zerar `walkVxStep` (null) no momento em que o cérebro sai de `idle`: em `receiveHit` antes de `handle`, ou no `onStep` checando `this.brain.state === 'idle' && !this.ragdoll`. Verificar com smoke simulado que o golpe leve num inimigo andando dá deslocamento ≥ 0 no sentido do golpe (igual ao `f389390`), e que AI-06 continua 35/70 ±10% a 30/60 fps.

### Lacuna 2 — [Major, AC violado] ART-01: dither do céu mostra a cor de fundo fora da paleta

- `src/game/art/background.ts:99-103`: `rect('e')` vai até y=150, `dither('E')` pinta metade dos texels de 150–162, `rect('E')` cobre 162–240, `dither('f')` pinta metade de 240–252. Os texels não pintados das duas faixas ficam transparentes e mostram o `backgroundColor: '#1b1b2f'` do jogo (`src/main.ts:11`, fora da paleta).
- Medição (`v2-art`, `v2-bg`, snapshot do WebGL): **11 214 a 14 652 px** de `#1b1b2f` por tela, sempre visíveis (faixas nas linhas de tela 76–256). Isso já existia na rodada 1, que só leu texturas; o fundo é `Graphics`.
- **Fix task**: pintar a cor de baixo da transição sob cada faixa de dither (ex.: `rect('e')` até 162 e `rect('E')` até 252 antes do `dither`) e/ou usar uma cor da paleta como `backgroundColor`. Verificar com snapshot: 0 px fora da paleta com opacidade total no céu.

### Lacuna 3 — [Minor, AC violado] ART-01: partículas da dissolução com tint multiplicativo

- `src/game/Ragdoll.ts:36,109`: `tint: CURSE` (u/v/U) multiplica a textura `smoke`, que é toda em `w` = 0xfff4e0 (`src/game/art/sprites/props.ts:46`). Cor renderizada = w × tint → **0x7b3ca2, 0x3b1c4e, 0xcf8ee0**, nenhuma na paleta (532/532 px no framebuffer, com alpha forçado a 1). O done-when do T31 ("grep por `0x` e `#`") não pega o caso, porque todos os literais vêm da `PALETTE`.
- **Fix task**: desenhar a fumaça direto nas cores da paleta (uma folha com frames `u`/`v`/`U`, sorteando o frame) em vez de tingir; ou usar uma textura branca pura (0xffffff) não herdada da paleta. Verificar lendo o framebuffer durante a dissolução.

### Lacuna 4 — [Minor] Mutante sobrevivente no limiar de 1 px da patrulha presa (M3)

- `tests/core/enemyAI.test.ts:271-280` só confere o `vx` final (`:279`), e um número par de inversões espúrias passa.
- **Fix task**: no teste "avançando pelo menos 1 px a cada 200 ms não inverte", assertar `vx === 35` em **todas** as saídas do laço, e acrescentar o limite do outro lado (avançar 0,9 px em 200 ms inverte). Verificar que M3 (`PATROL_STALL_PX = 2`) passa a ser morto.

### Observações (não bloqueiam)

- `src/game/Enemy.ts:78`: cada inimigo (inclusive os que renascem) registra um `scene.events.once(SHUTDOWN, …)` que só sai no fim da cena. O `remove()` (`:235`) já tira o `beforeupdate`, então os listeners de SHUTDOWN só se acumulam por respawn até o reinício. Inofensivo, mas é sujeira.
- `src/game/Enemy.ts:148`: o `setVelocity` por frame ficou redundante com o `onStep`.
- O recuo do golpe leve no caminho real (golpe dentro do step do Matter) já era 0 em `338ad6d`. É pré-existente e fora desta feature; a lacuna 1 trata só do deslizamento novo.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ (a redundância em `Enemy.ts:148` é menor) |
| Surgical changes | ✅ as correções tocam só os arquivos das tasks |
| No scope creep | ❌ o T29 mudou a física da reação ao golpe (fora do escopo pelo spec) sem querer |
| Matches patterns | ✅ lógica pura em `src/core` (stall na `EnemyAI`), adaptadores finos (AD-001), paleta (AD-002) |
| Spec-anchored outcome check | ✅ os valores asseridos batem com o spec (tuning importado: `enemyAI.test.ts:40`, `health.test.ts:12`, `hitstop.test.ts:11`) |
| Per-layer coverage | ⚠️ domínio 1:1, exceto o limiar de 1 px (M3); adaptadores com build + smoke |
| Todo teste mapeia um requisito | ✅ os 4 testes novos mapeiam o caso de borda da patrulha presa |
| Guidelines | `vitest.config.ts`, `.specs/STATE.md` AD-001..003 |

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| FIX-01..04, ART-02, ART-03, RES-01, CHR-01..04, FX-01..06, HP-01..04, AI-01..03, AI-05, AI-06, ENV-01, ENV-02, PRP-01, HUD-01..03 | Implementing | ✅ Verified |
| AI-04 | Implementing | ⚠️ Verified (ciclo), com a regressão da reação ao golpe (lacuna 1) |
| ART-01 | Implementing | ❌ Needs Fix (dither do céu, partículas tingidas) |

---

## Summary

**Overall**: ❌ Not Ready

**Spec-anchored check**: 33/34 ACs com o valor do spec; 1 violado (ART-01, em dois pontos); 0 lacunas novas de precisão do spec
**Sensor**: 11/13 mortos (M4 equivalente; M3 sobrevivente real)
**Gate**: 195 passed, 0 failed (antes da feature: 76)

**What works**: a velocidade do inimigo agora vale em px/s a 30 e a 60 fps. Golpe ignorado não gera feedback nenhum e golpe aceito mantém faísca, tremida e hitstop. O hitstop fica dentro de [ms, ms + 1 frame). A patrulha vira na parede. Todas as regressões principais da rodada 1 continuam passando (alcance 45/45/52, debug fechado, IA 450/120/800, vida e respawn, R no hitstop, HUD e Tab). O console só tem o 404 do favicon.

**Issues found**: (1) o inimigo atingido desliza no sentido em que andava (regressão do T29); (2) o dither do céu mostra `#1b1b2f`; (3) a fumaça da dissolução está fora da paleta; (4) o teste do limiar de 1 px é fraco.

**Next steps**: rotear as fix tasks das lacunas 1–4 para um implementer e re-verificar. Esta é a iteração 2 de 3; se as lacunas persistirem na 3, escalar para o usuário.

**validate_state.py** (`python .claude/skills/tlc-spec-driven/scripts/validate_state.py visual-e-jogabilidade`): exit 1, `ERROR visual-e-jogabilidade: validation.md verdict is FAIL - route the ranked gaps to fix tasks, then re-verify (feature is not done)`. É o esperado para um relatório FAIL legível: o veredito foi reconhecido e não é placeholder.
