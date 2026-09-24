# Visual, efeitos e jogabilidade — Validation (rodada 3 + re-verificação final após T38)

**Date**: 2026-09-23
**Spec**: `.specs/features/visual-e-jogabilidade/spec.md`: 34 requisitos, 6 casos de borda e as premissas, incluindo a nova "Transparência e ART-01" e as SPEC_DEVIATION aceitas do frame largo (`src/game/art/sprites/player.ts:6`, `enemy.ts:6`)
**Diff range**:
- feature: `338ad6d..194aeca` (46 commits, 51 arquivos, +4787/−298);
- correções da rodada 2: `84657c2..194aeca` (5 commits: `e52468f` spec/tasks, depois T34 `605e57f`, T35 `e00203f`, T36 `be7b10d` e T37 `194aeca`).

**Verifier**: sub-agente independente, rodada 3 (autor ≠ verificador). Ele não escreveu a feature nem as correções. Não confiou nas mensagens de commit: toda medição foi refeita contra a árvore real em HEAD com scripts `v3-*.mjs` no scratchpad:
- `v3-knock`, `v3-speed`, `v3-art` e `v3-misc` foram escritos nesta rodada;
- `v3-reg` e `v3-fx` são os scripts da rodada 2, reapontados para `v3-harness.mjs` e rodados de novo.

## Validation

**Result**: FAIL

Motivo, em uma linha (re-verificação final, `ee01101`): o T38 fechou M9 e M10 (os dois agora morrem, e os 34 ACs da rodada 3 seguem válidos porque `src/` não mudou). Mas uma mutação nova na mesma regra, **M12 (não zerar `stallMs` ao inverter), sobrevive e não é equivalente**: com ela, o inimigo que acabou de virar na parede volta a virar no frame seguinte e fica tremendo contra a parede (o bug R1-extra volta). Pelo `validate.md` §5, mutante sobrevivente vira fix task. Detalhes em "Re-verificação final (após T38)".

Veredito da rodada 3 (mantido como histórico): as quatro lacunas da rodada 2 fechadas, 34/34 ACs, FAIL só por M9/M10.

## Re-verificação final (após T38)

**Date**: 2026-09-23 · **HEAD**: `ee01101` · **Verifier**: sub-agente independente (rodada 4, curta), sem autoria na feature.

### Diff desde a rodada 3

`git diff --stat 57efd18..HEAD`: só 2 arquivos, **+40/−0**:
- `.specs/features/visual-e-jogabilidade/tasks.md` (+21, task T38);
- `tests/core/enemyAI.test.ts` (+19).

`src/` não mudou, então a evidência por AC da rodada 3 continua valendo.

### Gate

- `npm run build && npm test`: build exit 0 (só o aviso de chunk > 500 kB); **198 passed, 0 failed, 0 skipped** (196 + 2 do T38).
- **Integridade**: `git diff 57efd18..HEAD -- tests` só tem linhas `+`. Nenhuma asserção removida ou enfraquecida.
- **Os testes novos asseram o valor do spec** ("advances less than 1 px in 200 ms → reverse", `spec.md:214`):
  - `enemyAI.test.ts` "fronteira: parado exatamente 200 ms…": âncora + 4 × `update(50)` parado → `toEqual([35, 35, 35, -35])` (inverte exatamente no frame dos 200 ms, e não antes);
  - "fronteira: avançando exatamente 1 px a cada 200 ms…": `x += 0.25` por passo de 50 ms, 16 passos → `vx === 35` em **todas** as saídas (1,0 px não é "menos que 1 px").

### Sensor

Scratch: `git worktree add --detach …/scratchpad/verifier4-wt` (`ee01101`) com junction de `node_modules`. Cada mutação rodou a suíte inteira (`npx vitest run`) e foi desfeita com `git checkout -- src/core/enemyAI.ts`; o porcelain do scratch ficou vazio entre elas. Baseline sem mutação no scratch: 198 passed.

| # | File:line | Mutação | Resultado |
| --- | --- | --- | --- |
| M9 | `src/core/enemyAI.ts:128` | `stallMs < PATROL_STALL_MS` → `<=` | ✅ **morto** (1 falha: "fronteira: parado exatamente 200 ms…") |
| M10 | `src/core/enemyAI.ts:122` | `Math.abs(x − stallX) >= PATROL_STALL_PX` → `>` | ✅ **morto** (1 falha: "fronteira: avançando exatamente 1 px…") |
| M11 | `src/core/enemyAI.ts:6` | `PATROL_STALL_MS` 200 → 250 | ✅ morto (2 falhas: "parado … por 200 ms … inverte" e "fronteira: parado exatamente 200 ms…") |
| M12 | `src/core/enemyAI.ts:131` | não zerar `stallMs` depois de inverter (`this.stallMs = 0;` removido) | ❌ **sobreviveu, não equivalente** (198 passed) |

**Por que M12 não é equivalente** (sonda temporária `tests/core/v4probe.test.ts`, criada e apagada **só no scratch**):
- cenário: âncora, parado 200 ms (4 × 50 ms) → vira para −35; depois sai da parede a 35 px/s em frames de 16,67 ms (0,58 px por frame, o deslocamento real a 60 fps), por 12 frames;
- código real: `vx = −35` em todos os 12 frames (a sonda passa);
- mutante: o `stallMs` fica ≥ 200 e o primeiro frame avança só 0,58 px (< 1 px), então ele vira de novo já no frame seguinte e volta para a parede. A sonda falha (`expected false to be true`);
- no jogo, isso é o bug R1-extra de volta: o inimigo treme contra a parede em vez de ir e voltar. O spec pede uma janela nova de 200 ms sem avanço para cada inversão.
- **Por que os testes não pegam**: o teste de 208 ms só olha a última saída depois de uma inversão, e nenhum teste observa os frames **depois** da inversão.

**Resultado**: 4 injetados, 3 mortos, **1 sobrevivente real (M12)**. **M9/M10: fechados** (os dois morrem pelos testes do T38).

**Isolamento**:
- a junction foi removida com `cmd //c rmdir` antes de `git worktree remove --force` e `git worktree prune`; o `node_modules` real está intacto (`.bin` presente);
- `git worktree list` mostra só a árvore principal; `git stash list` vazio;
- `git status --porcelain` da árvore real = baseline (`?? .agents/`, `?? .claude/`, `?? .cursor/`, `?? .windsurf/`), confirmado por `diff` (`PORCELAIN_IGUAL`).

### Lacuna nova (rodada 4)

**1 — [Minor] O reinício da janela de 200 ms depois de inverter não está preso por teste (M12)**

- **Onde**: `src/core/enemyAI.ts:131` (`this.stallMs = 0;` depois da inversão), contra `tests/core/enemyAI.test.ts` (bloco do caso de borda do AI-01).
- **Impacto no jogo**: nenhum hoje, o código está certo. Mas apagar essa linha passa na suíte e traz de volta o inimigo tremendo contra a parede.
- **Fix task (~10 linhas de teste, sem mudar `src/`)**: no bloco da patrulha presa, "depois de inverter, só inverte de novo após novos 200 ms sem avanço":
  - âncora + 4 × `update(50)` parado → a última saída é `−35`;
  - depois, (a) parado mais 3 × `update(50)` → `vx === −35` em todas as saídas, e o 4º → `+35`; ou (b) avançando 0,58 px por frame de 16,67 ms → `vx === −35` em todos os frames.
  - Conferir num scratch que M12 passa a morrer (e que M9/M10/M11 continuam mortos).

### Status das lacunas anteriores

| # | Lacuna | Status |
| --- | --- | --- |
| R3-1 | [Minor] Limites exatos da patrulha presa sem teste (M9, M10) | ✅ Fechada pelo T38 (`ee01101`): M9 e M10 mortos |
| R4-1 | [Minor] Reinício da janela depois de inverter sem teste (M12) | ❌ Aberta |

---

## Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1–T33 | ✅ Done | Regressões reexecutadas nesta rodada (ver abaixo) |
| T34 | ✅ Done | Medido: o golpe leve empurra ~15 px no sentido do golpe, e o jab num inimigo que persegue dá 0 px durante o hitstun. A reversão (M5) é detectada pelo smoke |
| T35 | ✅ Done | 0 px `#1b1b2f` em 5 posições de câmera. `backgroundColor` = `PALETTE.e` (`src/main.ts:13`) |
| T36 | ✅ Done | O emissor usa `smoke-curse`, frames `u`/`v`/`U` e tint `#ffffff`. Com alpha 1, os pixels da fumaça são 100% u/v/U. Teste de dados em `tests/game/art.test.ts:289-295` |
| T37 | ✅ Done | `tests/core/enemyAI.test.ts:280` asserta todas as saídas. O mutante `PATROL_STALL_PX` 1→2 agora morre (M1) |

`tasks.md`: 101 `[x]`, 0 `[ ]`.

---

## Gate Check

- **Gate command**: `npm run build && npm test` (`build` = `tsc --noEmit && vite build`)
- **Result**: build ok (só o aviso de chunk > 500 kB). **196 passed, 0 failed, 0 skipped** (16 arquivos).
- **Test count before feature**: 76 (`338ad6d`).
- **Test count after feature**: 196 (195 na rodada 2, mais 1 teste novo do T36).
- **Delta**: +120.
- **Integridade dos testes**:
  - **`git diff 338ad6d..HEAD -- tests`**: as únicas linhas `-` são:
    - dois imports ampliados (`hit.test.ts`, `level.test.ts`);
    - o campo morto `debrisColor` (T32);
    - `receiveHit: vi.fn()` → `vi.fn(() => true)` (`bodyTags.test.ts`, ajuste de tipo).

    Nenhuma asserção foi removida.
  - **`git diff 84657c2..HEAD -- tests`**:
    - `enemyAI.test.ts:271-281`: a asserção só do último `vx` (`expect(out.vx).toBe(35)`) virou `expect(vxs.every((vx) => vx === 35)).toBe(true)`. Ficou **mais forte**.
    - `art.test.ts`: import ampliado e teste novo (`:289-295`).

    Nada foi enfraquecido.

---

## Spec-Anchored Acceptance Criteria

Legenda: ✅ bate com o spec · ❌ violação · ⚠️ lacuna de precisão do spec.

Os ACs de adaptador (matriz = none) são verificados por `arquivo:linha` mais smoke próprio. "Simulado" significa `game.headlessStep` com dt fixo: 60 fps dá 1 step do Matter por frame, 30 fps dá 2 steps por frame, e os steps são contados no `afterupdate` de `scene.matter.world`.

### P1: Ataque honesto

| AC | Resultado definido no spec | Evidência | Resultado |
| --- | --- | --- | --- |
| FIX-01 | Sem debug, 1/2/H não fazem nada | `src/scenes/TestScene.ts:96-98` (`isDebug() && …`). `v3-reg`: teclas reais 1,2,H,1,2 → `[['idle',60],['idle',60]]` antes e depois; `drawDebug=false`, sem `debugGraphic` | ✅ |
| FIX-02 | Hitbox invisível fora do debug | `src/game/hitbox.ts:75` `.setVisible(isDebug())`. `v3-reg`: em todo frame com hitbox aberta na varredura de alcance, `visible ∈ {false}` | ✅ |
| FIX-03 | Soco não acerta com o centro a > 46 px; chute não acerta a > 55; J a 60 px não acerta | `v3-reg`, inimigo pinado de 36 a 62 px, combo real: maior acerto do jab **45**, do cross **45**, do chute **52**; 0 acertos a ≥ 60; 0 acertos no outro inimigo | ✅ |
| FIX-04 | `?debug` ou F1 liga 1/2/H e desenha a hitbox | `src/game/debug.ts`. `v3-reg`: com `?debug`, 1 → `hitstun` (52), 2 → `ragdollStun` (34), H → `drawDebug=true`, J → hitbox `visible=[true]`. Com F1: 1 tira 8 de hp e H liga o desenho. Com F1 de novo: `drawDebug=false` e 1 não faz nada | ✅ |

### P1: Base de pixel art

| AC | Resultado definido no spec | Evidência | Resultado |
| --- | --- | --- | --- |
| ART-01 | Toda cor de origem desenhada é da paleta. Mistura por alpha é permitida. Tint multiplicativo e fundo do canvas fora da paleta não são | Dados: `tests/game/art.test.ts:69,93,170,226,245` (`parseSheet(…, PALETTE_KEYS)`); `:290-294` fumaça (`toEqual(['U','u','v'])`, `toEqual([fr.key])`). Detalhe da medição logo abaixo da tabela | ✅ |
| ART-02 | Grade inválida lança erro com o nome do sprite | `tests/core/pixelGrid.test.ts:31` `toThrow(/heroi/)`; `:37-39` `/heroi/`, `/'x'/`, `/\(1, 1\)/`; `:43-44` `toThrow(/inimigo.*tamanho/)` | ✅ |
| ART-03 | 2 px de mundo por texel em sprite, tile e parte de ragdoll | `tests/game/art.test.ts:51` `expect(ART_SCALE).toBe(2)`. `v3-misc`: partes do ragdoll com `scaleX=[1]`. A fumaça começa em `scale 1` (`Ragdoll.ts:106`) | ✅ |
| RES-01 | Zoom 1,5, round pixels, segue o player, nunca mostra fora da sala | `TestScene.ts:87-92`. `v3-misc`: `zoom=1.5`, `roundPixels=true`, `bounds=[0,0,1280,544]`, `following=true`, câmera `ui` com zoom 1. `v3-art`: `worldView` nos 4 cantos = `[0,0]`, `[640,0]`, `[0,184]`, `[640,184]` (640×360, dentro da sala) | ✅ |

**Detalhe da medição do ART-01** (`v3-art`):

- **Texturas**: as 19 texturas de canvas foram lidas; **0** cores opacas fora da paleta. As exceções:
  - o placeholder `player` (`#3a86ff`/`#000`/`#fff`) é o corpo invisível (`src/game/Player.ts:86` `setVisible(false)`);
  - as 2 texturas de `Text` só têm pixels de alpha parcial (antialias).
- **Framebuffer** (`renderer.snapshot`) nos 4 cantos da sala e no centro:
  - **`#1b1b2f` = 0 px** em todas as posições;
  - **0 px fora da paleta fora das áreas de texto do HUD**;
  - dentro delas há 21,7k a 22,4k px, todos de mistura por alpha do painel (`k` a 0,8, `Hud.ts:40`) e das bordas dos glifos;
  - com o painel escondido, sobram 62 px, só na borda do rótulo "HP".
- **Cor de limpeza** = `#0e1326` = `PALETTE.e` (`src/main.ts:13`).
- **Fumaça da dissolução** (`Ragdoll.ts:101-109`):
  - emissor `smoke-curse`, 30 partículas vivas;
  - frames `['U','u','v']`, tints `['#ffffff']`, `tintFill=false`;
  - frames da textura: `u=#7b3fb8`, `v=#3b1d59`, `U=#cf94ff`;
  - com o alpha das partículas forçado a 1 e as partes do ragdoll escondidas: 422 px de u/v/U e **0 px fora da paleta**.
- **Grep em `src/`**:
  - `setTint(` e `tint:` → 0;
  - `setTintFill` só com `PALETTE.*` (`Enemy.ts:203`, `Ragdoll.ts:89,98`, `fx.ts:102`);
  - `'#`/`` `#`` só na montagem de CSS a partir da `PALETTE` (`render.ts:23`, `Hud.ts:14`, `main.ts:13`);
  - `0x` fora da paleta: máscaras de colisão (`core/collision.ts`), o divisor do RNG (`background.ts:62`) e os placeholders pré-existentes de `src/game/textures.ts:37,41,49,50` (ver Observações).

### P1: Personagens animados

| AC | Resultado definido no spec | Evidência | Resultado |
| --- | --- | --- | --- |
| CHR-01 | 12 animações com a precedência do spec e a variante carry | `tests/core/animState.test.ts:14-51` (ex.: `:38-40` `toBe('hurt')`). Arquivo sem alteração desde a rodada 2 | ✅ |
| CHR-02 | Frame de membro esticado durante toda a fase ativa | `tests/core/animState.test.ts:61` `attackFrame('active')).toBe('hit')`; `tests/core/combo.test.ts:175-176` | ✅ |
| CHR-03 | Inimigo: exatamente uma de 6 animações | `tests/core/animState.test.ts:76-117` (varredura brain × IA × moving contra `ALL`) | ✅ |
| CHR-04 | Ragdoll com texturas recortadas da arte do inimigo | `tests/game/art.test.ts:222-233`. `v3-misc`: `deadRagdoll` com `rag-torso`, `rag-head` e 4× `rag-limb`; sprite escondido | ✅ |

### P1: Impacto do golpe

| AC | Resultado definido no spec | Evidência | Resultado |
| --- | --- | --- | --- |
| FX-01 | ≥ 50 e < 50 + 1 frame (leve); ≥ 90 e < 90 + 1 frame (forte) | `tests/core/hitstop.test.ts:10-11` `toEqual({ light: 50, heavy: 90 })`, `:20-36`. `v3-fx`, golpe real (do acerto ao próximo step): leve **50,0** (60 fps) e **66,7** (30 fps); forte **100** (60) e **100** (30). Todos ≥ ms e < ms + frame. Durante o congelamento, a animação e a posição do inimigo não mudam | ✅ |
| FX-02 | Novo golpe no congelamento fica com o maior, nunca a soma | `tests/core/hitstop.test.ts:63-102`; mutante M2 (soma) morto por 4 testes | ✅ |
| FX-03 | Faísca no ponto de contato: branca no leve, âmbar no forte, roxa no objeto | `src/game/fx.ts:26-30`, `hitbox.ts:69-74`. `v3-fx`: combo → `['light','light','heavy']` + 1 tremida | ✅ |
| FX-06 | Golpe ignorado não gera faísca, tremida nem congelamento | `hitbox.ts:68` `if (!other.target.receiveHit(hit)) return;`. Os 5 casos medidos estão logo abaixo da tabela | ✅ |

**Os 5 casos do FX-06** (`v3-fx`):

- **Invulnerável**: a garra recebe `false`; faísca/tremida/congelamento 0/0/0; hp fica em 99.
- **Morto** (`deadRagdoll`): 5 golpes ignorados, 0/0/0.
- **Dissolvendo**: 1 golpe ignorado, 0/0/0.
- **Dono** (a garrafa arremessada toca o player): 0 chamadas, 0/0/0.
- **Mesmo time**: 0 chamadas de `receiveHit` no inimigo 1 dentro da garra.
- **Golpe aceito mantém o feedback**: garra → `['light']` + `trigger [50]`; combo → `[50,50,90]`.

### P1: Luta de verdade

| AC | Resultado definido no spec | Evidência | Resultado |
| --- | --- | --- | --- |
| HP-01 | Perde hp = dano e fica invulnerável por 700 ms | `tests/core/health.test.ts:12` `toEqual(SPEC)` (100/700/200/1000), `:26-40`. `v3-reg`: hp 100 → 88 → 76 → 64; invulnerável por 717 ms simulados (700 mais a quantização de 1 frame) | ✅ |
| HP-02 | Invulnerável ignora golpes e pisca | `tests/core/health.test.ts:33-40`; `Player.ts:177-185`. `v3-fx`: garra na invulnerabilidade → `false`, hp inalterado | ✅ |
| HP-03 | Recuo na direção do golpe e sem controle por 200 ms | `tests/core/health.test.ts:54-63`; `Player.ts:133,157` | ✅ |
| HP-04 | hp 0 → fade, respawn no spawn com 100 depois de 1000 ms, larga o objeto | `tests/core/health.test.ts:75-89`. `v3-reg`: segurando a cadeira (`held`), o player morre; a cadeira vai para `rest`; o fade aparece; respawn em (112, 462) = spawn (112, 464) − `SPAWN_LIFT` 2, com hp 100, 1017 ms simulados depois da morte | ✅ |
| AI-01 | Player ≥ 200 px → patrulha ±48 px a 35 px/s | `tests/core/enemyAI.test.ts:40` `toEqual(SPEC)`, `:54` `toBe(35)`, `:61-64` vira em ±48. `v3-speed`, deslocamento por step (só steps com cérebro `idle` e IA `patrol`, × 60): **34,3 px/s** (−2,0%) a 60 e a 30 fps; faixa [−48, +48] a 60 e [−48,6, +48,6] a 30 | ✅ |
| AI-02 | Player < 200 px → anda até ele a 70 px/s | `tests/core/enemyAI.test.ts:97` `toBe(70)`, `:100` `toBe(-70)`. `v3-speed`: **68,6 px/s** (−2,0%) a 60 e a 30 fps | ✅ |
| AI-03 | < 40 px → preparo 450, golpe 120 com 12 de dano, descanso 800 | `tests/core/enemyAI.test.ts:44-45` (`damage 12`, `activeMs 120`), `:125-177`. `v3-reg` (tempo simulado descongelado): windup **450/450/450**, attack **133** (120 arredondado para o frame, a sobra volta no descanso), rest **800/800**, **12** de dano por golpe | ✅ |
| AI-04 | Golpe no preparo ou no ataque cancela e recomeça depois da reação | `tests/core/enemyAI.test.ts:195-233`; `Enemy.ts:111` `this.onAI(this.ai.interrupt())`. A reação ao golpe voltou ao que era antes do T29 (ver T34) | ✅ |
| AI-05 | A garra nunca fere o próprio inimigo nem outros | `tests/core/hit.test.ts:41` `canDamage('enemy','enemy')).toBe(false)`; `hitbox.ts:67`. `v3-fx`: 0 chamadas no inimigo 1; mutante M3 morto | ✅ |
| AI-06 | Patrulha e perseguição no tuning ±10% a 30 e a 60 fps | `src/game/Enemy.ts:50-55,140`. `v3-speed`, simulado: **1 step/frame** → patrulha 34,3, perseguição 68,6; **2 steps/frame** → 34,3 e 68,6. Loop real com `fpsLimit=30` (33 fps medidos, 2 steps/frame): 34,3 e 68,6 | ✅ |

### P2 / P3

| AC | Resultado definido no spec | Evidência | Resultado |
| --- | --- | --- | --- |
| ENV-01 | 9 variantes só pelos 4 vizinhos | `tests/core/level.test.ts:41-90` (ex.: `:46` `toBe('top')`) | ✅ |
| ENV-02 | 3 camadas de parallax 0,1 / 0,3 / 0,6 atrás do terreno | `background.ts:83`. `v3-misc`: `[[0.1,0.1,-30],[0.3,0.3,-20],[0.6,0.6,-10]]`, terreno com depth `[0]`. Cor: ver ART-01 (0 furos) | ✅ |
| PRP-01 | Cadeira e garrafa na escala 2; estilhaços do próprio sprite | `tests/game/art.test.ts:244-285` | ✅ |
| HUD-01 | Barra de hp do player fixa na tela | `Hud.ts:35-51`; `scrollFactor 0` na `uiLayer` (`:43-44`) | ✅ |
| HUD-02 | Barra do inimigo do primeiro dano até morrer | `Enemy.ts:118-130`. `v3-misc`: `before=false`, `after=true`, o outro inimigo sem barra, `afterDeath=false` | ✅ |
| HUD-03 | Painel por 8 s ao iniciar/reiniciar; Tab alterna | `TestScene.ts:32,211-214`. `v3-misc`, simulado: some com **8000 ms** de cena. `v3-reg`, teclas reais: visível no início; Tab → `true`, Tab → `false` | ✅ |
| FX-04 | Poeira ao pular, pousar ou virar correndo | `Player.ts:168-174` (sem alteração desde a rodada 2, que mediu 2 nuvens no pulo + pouso e 1 na virada) | ✅ |
| FX-05 | Rastro no chute ou no arremesso | `Player.ts:232` (sem alteração desde a rodada 2: 6 cópias `kick-hit`) | ✅ |

**Status**: ✅ **34/34 ACs** batem com o valor do spec. Nenhuma lacuna nova de precisão do spec.

### Regressão do T34, medida (`v3-knock`, simulado)

- **Golpe leve direto** (o `debugHit('light')` da tecla 1, fora do step): o inimigo desloca **+15,06 px** no sentido do golpe (60 fps) e **+14,97** (30 fps), tanto patrulhando (vx de andar +0,58/step) quanto perseguindo (vx −1,17/step, contra o golpe). Referência pré-T29 (rodada 2): ~15–17,5 px.
- **Jab real num inimigo que persegue**, com o aperto de 44 a 56 px e o acerto a 38–45 px:
  - deslocamento durante o hitstun: **mínimo 0,00 px** em todos os casos, a 60 e a 30 fps;
  - ele não avança para o player; o congelamento dura 5–6 frames (60 fps) ou 3–4 (30 fps).

  Com o T34 revertido (M5): −7,5 a −8,7 px em direção ao player. Os 0 px de recuo no caminho real já existiam antes da feature (rodada 2) e ficam fora do escopo.
- **Patrulha e perseguição**: 34,3 e 68,6 px/s com 1 e 2 steps/frame (ver AI-06).

---

## Edge Cases

- [x] **Player morre segurando objeto → o objeto cai em repouso**: `Player.ts:189-192`; `tests/core/props.test.ts:78,82`. `v3-reg`: `held` → `rest`.
- [x] **Inimigo morre no preparo → a hitbox nunca abre**: `tests/core/enemyAI.test.ts:242-248` `expect(out.events).toEqual([])`.
- [x] **Patrulha presa (< 1 px em 200 ms) → inverte**: `src/core/enemyAI.ts:4-6,113-132`; `tests/core/enemyAI.test.ts:255-261`, `:264-269`, `:271-281`.
  - `v3-speed`: o inimigo 1 (spawn **1200**, parede em 1248) inverte em x = 1236,6 depois de **217 ms** parado, vai até 1152 (−48) e volta. Faz 3 inversões em 8 s, a 60 e a 30 fps, na faixa [−48,5, +37,2].
  - ⚠️ Os limites exatos (1 px e 200 ms) não estão presos por teste (M9 e M10; lacuna nova 1).
- [x] **Reinício durante o hitstop → cena descongelada**: `tests/core/hitstop.test.ts:106-120`; `TestScene.ts:57-65`. `v3-reg`: `trigger(5000)` + restart → `frozen=false`, world ativo, `time.paused=false`.
- [x] **Golpe do inimigo e do próprio objeto no mesmo frame → só o do inimigo**: `tests/core/props.test.ts:89-94`. `v3-fx` (dono): 0 chamadas.
- [x] **Dois golpes de inimigo no mesmo frame → dano uma vez**: `tests/core/health.test.ts:45-49`.

---

## Status das lacunas das rodadas 1 e 2

| # | Lacuna | Status | Evidência (rodada 3) |
| --- | --- | --- | --- |
| R1-1 | [Major] AI-01/02 dependiam do fps | ✅ Fechada | 34,3/68,6 px/s com 1 e 2 steps/frame e no loop real a 33 fps |
| R1-2 | [Major] Golpe ignorado gerava feedback | ✅ Fechada | FX-06: 5 casos com 0/0/0; golpe aceito mantém o feedback |
| R1-3 | [Minor] FX-01 sem tolerância de frame | ✅ Fechada | 50/66,7 (leve) e 100/100 (forte) a 60/30 fps |
| R1-4 | [Minor] ART-01: texto do HUD, tint e fumaça | ✅ Fechada | Texto em `PALETTE.w`/`k`; ragdoll com `setTintFill`; fumaça com frames da paleta e tint neutro (ver R2-3) |
| R1-5 | [Cosmético] `debrisColor` morto | ✅ Fechada | `grep -rn debrisColor src tests` → vazio |
| R1-extra | Patrulha presa empurrava a parede | ✅ Fechada | Vai e volta: 3 inversões em 8 s |
| R2-1 | [Major] Regressão do T29: o inimigo atingido continuava andando | ✅ Fechada | Golpe leve: +15 px no sentido do golpe. Jab no inimigo que persegue: 0 px no hitstun. M5 detectado pelo smoke |
| R2-2 | [Major] Dither do céu mostrava `#1b1b2f` | ✅ Fechada | 0 px em 5 posições de câmera; clear = `PALETTE.e`. M6 (reversão) volta a 11–15k px |
| R2-3 | [Minor] Fumaça com tint multiplicativo | ✅ Fechada | Frames u/v/U, tint `#ffffff`, 0 px fora da paleta com alpha 1. M7 (tint de volta) → 504 px fora |
| R2-4 | [Minor] Mutante `PATROL_STALL_PX` 1→2 sobrevivia | ✅ Fechada | M1 morto (`enemyAI.test.ts:280`) |

---

## Discrimination Sensor

**Scratch**: `git worktree add --detach …/scratchpad/verifier3-wt HEAD` (194aeca), com junction de `node_modules` (`New-Item -ItemType Junction`).

- **Mutações unitárias**: cada uma rodou `npx vitest run` (a suíte inteira) e foi desfeita com `git checkout -- <arquivo>`.
- **Mutações de adaptador** (matriz = none, teste = smoke): rodaram o smoke `v3-*` contra o vite do worktree (`V3_PROJECT`).
- **Limpeza do scratch**: o porcelain do scratch ficou vazio entre as mutações.
- **Sondas de limiar**: um arquivo de teste temporário **só no scratch** (`tests/core/v3probe.test.ts`), apagado em seguida, provou que os sobreviventes não são equivalentes.

| # | File:line | Mutação | Resultado |
| --- | --- | --- | --- |
| M1 | `src/core/enemyAI.ts:5` | `PATROL_STALL_PX` 1 → 2 | ✅ morto (1 falha) |
| M2 | `src/core/hitstop.ts:13` | regra de sobreposição: `Math.max(remaining, ms)` → `remaining + ms` (soma) | ✅ morto (4) |
| M3 | `src/core/hit.ts:31` | `canDamage` → `return true` | ✅ morto (1) |
| M4 | `src/game/art/sprites/props.ts:51` | `SMOKE_CURSE.v` pintado com `w` | ✅ morto (1) |
| M4b | `src/game/art/sprites/props.ts:52` | `SMOKE_CURSE.U` pintado com `u` | ✅ morto (1) |
| M8 | `src/core/hitstop.ts:9` | `frozen`: `> 0` → `>= 0` | ✅ morto (12) |
| M9 | `src/core/enemyAI.ts:128` | `stallMs < PATROL_STALL_MS` → `<=` | ❌ **sobreviveu, não equivalente**. Parado exatamente 200 ms (4 × 50 ms): o código real inverte, como diz o spec ("less than 1 px in 200 ms"); o mutante só inverte no frame seguinte. Os testes usam 208 ms e 160 ms (`enemyAI.test.ts:259,267`), que ficam dos dois lados sem tocar o limite. A sonda falha no mutante e passa no real |
| M10 | `src/core/enemyAI.ts:122` | `Math.abs(x − stallX) >= PATROL_STALL_PX` → `>` | ❌ **sobreviveu, não equivalente**. Avançando exatamente 1 px a cada 200 ms (0,25 px por 50 ms): o código real não inverte (1 px não é "less than 1 px"); o mutante inverte. O teste de progresso usa ~1,2 px por 200 ms (`enemyAI.test.ts:276`). A sonda falha no mutante e passa no real |
| M5 | `src/game/Enemy.ts` | adaptador: T34 revertido (versão de `84657c2`) | ✅ morto pelo smoke `v3-knock`. Golpe leve no inimigo que persegue: −8,2 px (HEAD +15,06). Jab real: −7,5 a −8,7 px em direção ao player no hitstun (HEAD 0) |
| M5a | `src/game/Enemy.ts:53` | adaptador: tira só a guarda `brain.state !== 'idle' \|\| ragdoll` do `onStep` | ⚪ equivalente. O `walkVxStep = null` do `receiveHit` (`:109`) e o `canAct` do `update` (`:140`) já zeram o vx fora de `idle`; o cérebro só sai de `idle` por golpe. Smoke idêntico ao HEAD (+15,06 / 0) |
| M5b | `src/game/Enemy.ts:109` | adaptador: tira só o `walkVxStep = null` | ⚪ equivalente. A guarda do `onStep` cobre (o cérebro já está em `hitstun`). Smoke idêntico ao HEAD. As duas proteções são redundantes de propósito, e reverter as duas é detectado (M5) |
| M6 | `src/game/art/background.ts` + `src/main.ts` | adaptador: T35 revertido | ✅ morto pelo smoke `v3-art`: 11 214 a 14 652 px de `#1b1b2f` por tela |
| M6b | `src/game/art/background.ts:101,104` | adaptador: tira só as bases sólidas das faixas de dither | ⚪ equivalente para o ART-01. Os furos mostram o clear `PALETTE.e`, que é da paleta (0 px fora da paleta em 5 posições). É só nuance de desenho, não requisito |
| M6c | `src/main.ts:13` | adaptador: `backgroundColor` de volta a `#1b1b2f` | ✅ morto pelo smoke (`clearInPalette=false`, proibido pela premissa). Hoje ele não aparece em nenhum pixel, porque o céu cobre tudo |
| M7 | `src/game/Ragdoll.ts:108` | adaptador: `tint: [u, v, U]` de volta sobre os frames roxos | ✅ morto pelo smoke `v3-art`: tints não neutros e 504 px fora da paleta (`#301159`, `#a856ff`…) |

**Sensor depth**: expandido. Foram 15 mutações: patrulha presa, sobreposição e limite do hitstop, `canDamage`, cores da `SMOKE_CURSE` e 7 de adaptador (T34, T35, T36).

**Resultado do sensor**: 10 mortos, 3 equivalentes com justificativa (M5a, M5b, M6b) e **2 sobreviventes reais (M9, M10) → FAIL do sensor**.

**Isolamento**:
- a junction foi removida com `cmd //c rmdir` antes de `git worktree remove --force` e `git worktree prune`;
- `git worktree list` mostra só a árvore principal, e `git stash list` está vazio;
- o `node_modules` real está intacto (`.bin` presente);
- `git status --porcelain` da árvore real = baseline (`?? .agents/`, `?? .claude/`, `?? .cursor/`, `?? .windsurf/`), confirmado por `diff` (`PORCELAIN_IGUAL`).

---

## Lacunas novas (rodada 3), ranqueadas

### 1 — [Minor] Limites exatos da patrulha presa sem teste (M9, M10)

- **Onde**: `src/core/enemyAI.ts:122` (`>= PATROL_STALL_PX`) e `:128` (`< PATROL_STALL_MS`), contra `tests/core/enemyAI.test.ts:255-281`.
- **O quê**:
  - o spec define "advances less than 1 px in 200 ms". O código real acerta os dois limites: 1,0 px não inverte, e 200 ms parado inverte;
  - a suíte só testa longe dos limites (208/160 ms e ~1,2 px), então trocar `>=`↔`>` ou `<`↔`<=` passa despercebido;
  - é o mesmo padrão da lacuna 4 da rodada 2. O T37 prendeu o valor do limiar, mas não os operadores de fronteira.
- **Impacto no jogo**: nenhum hoje. O comportamento está certo, e no jogo real o deslocamento por step raramente cai exatamente no limite. É fragilidade de teste num módulo `src/core`, que pela matriz exige "todos os ramos".
- **Fix task (~10 linhas em `tests/core/enemyAI.test.ts`)**, no bloco do caso de borda:
  - (a) "avançando exatamente 1 px a cada 200 ms não inverte": `ai.update(50, …)` com `x += 0.25` por passo, asserindo `vx === 35` em todas as saídas;
  - (b) "parado exatamente 200 ms inverte": âncora + 4 × `update(50)` parado → `vx === -35`.
  - Verificar num scratch que M9 e M10 passam a morrer.

### Observações (não bloqueiam)

- **Placeholders pré-existentes em `src/game/textures.ts:37,41,49,50`**: `0x000000`, `0xffffff`, `0x4a4e69` e `0x3a86ff` estão fora da paleta, mas **não são desenhados**:
  - o `terrain` é gerado e depois substituído pelo tileset (`render.ts:13` remove a chave);
  - o `player` é o corpo físico invisível (`Player.ts:86`).

  Não violam o ART-01, que fala do que é desenhado. Vêm de antes da feature (`338ad6d`). Um `grep 0x` literal os acusa, e dá para limpar depois.
- **O desenho da física do Matter** (tecla H, só no modo debug) usa as cores padrão do Phaser. É ferramenta de debug (FIX-04), não arte do jogo.
- `Enemy.ts:80`: cada inimigo que renasce registra um `once(SHUTDOWN)`, que se acumula até o reinício. `Enemy.ts:151`: o `setVelocity` por frame é redundante com o `onStep`. Os dois são inofensivos e já estavam na rodada 2.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ As correções têm +34/−11 linhas em `src`. A guarda dupla do T34 é redundante (M5a/M5b), mas é barata e está comentada |
| Surgical changes | ✅ Só os arquivos das tasks T34–T37 (`art/index.ts` e `textures.ts` recebem a ligação da textura nova) |
| No scope creep | ✅ O T34 devolve a reação ao golpe ao comportamento anterior (+15 px, igual ao pré-T29) |
| Matches patterns | ✅ Arte como grade da paleta (AD-002), adaptadores finos (AD-001) |
| Spec-anchored outcome check | ✅ Os valores assertados são os do spec (tuning importado: `enemyAI.test.ts:40`, `health.test.ts:12`, `hitstop.test.ts:10-11`) |
| Per-layer coverage | ⚠️ Domínio 1:1 com os ACs, mas os operadores de fronteira da patrulha presa não estão presos (M9/M10). Adaptadores com build + smoke |
| Todo teste mapeia um requisito | ✅ O teste novo mapeia ART-01 (T36); o reforço mapeia o caso de borda do AI-01 (T37) |
| Guidelines | `vitest.config.ts`, `.specs/STATE.md` AD-001..003 |

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| Os 34 (FIX-01..04, ART-01..03, RES-01, CHR-01..04, FX-01..06, HP-01..04, AI-01..06, ENV-01/02, PRP-01, HUD-01..03) | Implementing | ✅ Verified (comportamento) |
| Caso de borda da patrulha presa (AI-01) | — | ⚠️ Comportamento verificado; limites sem teste (lacuna 1) |

---

## Summary

**Overall**: ❌ Not Ready. O único motivo é o sensor; o comportamento está pronto.

**Spec-anchored check**: 34/34 ACs com o valor do spec; 0 lacunas de precisão do spec.
**Sensor**: 10/15 mortos, 3 equivalentes, 2 sobreviventes reais (M9, M10).
**Gate**: 196 passed, 0 failed (antes da feature: 76).

**What works**:
- O inimigo atingido volta a ser empurrado no sentido do golpe (+15 px) e não avança para o player no hitstun.
- A velocidade da IA fica em 34,3/68,6 px/s com 1 e 2 steps por frame.
- Nenhum pixel `#1b1b2f`, e o céu e o clear são da paleta.
- A fumaça sai direto nas cores u/v/U, sem tint.
- O mutante da rodada 2 (`PATROL_STALL_PX` 1→2) morre.
- Todas as regressões passam:
  - alcance 45/45/52;
  - debug fechado sem `?debug`/F1;
  - IA 450/133/800 com 12 de dano;
  - FX-06 nos 5 casos;
  - FX-01 dentro de [ms, ms + 1 frame);
  - vida e respawn com a cadeira;
  - R durante o hitstop;
  - HUD (8000 ms simulados) e Tab;
  - patrulha presa indo e voltando;
  - console só com o 404 do favicon.

**Issues found**: (1) os limites exatos de 1 px e 200 ms da patrulha presa não estão presos por teste (M9, M10). A correção são 2 testes de fronteira.

**Next steps**: esta é a iteração 3 de 3. Escalar para o usuário, que decide entre:
- (a) aplicar a fix task da lacuna 1 (dois testes, sem mudar código) e fazer uma re-verificação curta do sensor;
- (b) aceitar M9/M10 como risco conhecido.

**validate_state.py** (`python .claude/skills/tlc-spec-driven/scripts/validate_state.py visual-e-jogabilidade`): exit 1, `ERROR visual-e-jogabilidade: validation.md verdict is FAIL - route the ranked gaps to fix tasks, then re-verify (feature is not done)`. É o esperado para um relatório FAIL legível: o veredito foi reconhecido e não é placeholder.

**Atualização da re-verificação final (após T38)**: gate 198 passed; M9/M10 mortos (R3-1 fechada). Continua ❌ Not Ready por **M12** (não zerar `stallMs` ao inverter sobrevive e traz de volta o tremor na parede). Próximo passo: a fix task da lacuna R4-1 (um teste, sem mudar `src/`) e nova re-verificação curta do sensor. Como a rodada 3 já era a iteração 3 de 3, a decisão entre aplicar o teste ou aceitar M12 como risco conhecido fica com o usuário.

**validate_state.py (re-verificação final)**: exit 1, `ERROR visual-e-jogabilidade: validation.md verdict is FAIL - route the ranked gaps to fix tasks, then re-verify (feature is not done)`. É o esperado para um relatório FAIL legível.

---

## Decisão do usuário: M12 aceito como risco conhecido (2026-09-23)

- **Contexto:** depois de 3 rodadas de correção e da re-verificação curta, o comportamento ficou aprovado em 34/34 ACs, com evidência `arquivo:linha` e medição. O único achado aberto é o mutante M12: apagar `this.stallMs = 0;` logo depois da inversão da patrulha presa (`src/core/enemyAI.ts:131`) não quebra nenhum teste.
- **Estado do código:** correto. A janela de 200 ms recomeça depois de cada inversão. A sonda do Verifier mostrou `vx = -35` estável nos 12 frames seguintes, e o jogo não é afetado.
- **Decisão:** o usuário escolheu aceitar M12 como risco conhecido, sem teste adicional. O risco é uma regressão futura nesse reset não ser pega pela suíte. Se acontecer, o sintoma é o inimigo "tremendo" contra a parede.
- **Veredito formal:** este relatório continua FAIL, porque o Verifier não reescreveu o resultado. Por isso o `validate_state.py` sai com código 1. A feature foi encerrada com esse risco aceito explicitamente, e não com PASS.
- **Lição relacionada:** L-011 (candidate), sobre testar os frames logo depois de uma ação disparada por um acumulador.
