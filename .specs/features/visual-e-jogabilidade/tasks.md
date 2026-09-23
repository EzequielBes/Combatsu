# Visual, efeitos e jogabilidade — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/visual-e-jogabilidade/spec.md`
**Design**: `.specs/features/visual-e-jogabilidade/design.md`
**Status**: Approved
**Branch**: `feat/visual-e-jogabilidade`
**Test count before this feature**: 76

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: `vitest.config.ts` (só `include: tests/**/*.test.ts`, ambiente node, sem limite de cobertura); `.specs/STATE.md` AD-001 (lógica pura em `src/core`/`src/data` testada, adaptadores Phaser sem teste automatizado). Sem `AGENTS.md`/`CONTRIBUTING.md` - strong defaults aplicados ao núcleo.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domain / lógica pura (`src/core/**`) | unit | Todos os ramos; 1:1 com os ACs do spec; todo caso de borda listado com teste próprio | `tests/core/*.test.ts` | `npm test` |
| Dados de arte e tuning (`src/data/**`, `src/game/art/palette.ts`, `src/game/art/sprites/**`, `src/game/art/tiles.ts`) - sem `phaser` como valor | unit | Toda folha passa no `parseSheet` com a paleta; invariantes de ART-01/02 e dos números do spec | `tests/data/*.test.ts`, `tests/game/art.test.ts` | `npm test` |
| Adaptadores Phaser (`src/game/*.ts` com `phaser`, `src/game/art/render.ts`, `src/game/art/background.ts`, `src/scenes/**`, `src/main.ts`) | none | Build gate + smoke headless (harness Puppeteer + Edge) com checagem de estado e captura de tela, citada no commit da task | - | build gate + smoke |

## Gate Check Commands

> Generated from codebase (`package.json` scripts) - confirm before Execute. Não há linter configurado; o typecheck estrito roda dentro de `npm run build`.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tasks com testes unitários | `npm test` |
| Full | Não se aplica (sem testes de integração/e2e) | `npm test` |
| Build | Tasks de adaptador, config, última task de cada fase | `npm run build && npm test` |

---

## Execution Plan

As fases rodam em sequência; dentro de cada fase as tasks rodam em ordem.

### Phase 1: Correção do ataque e fundação da arte

```
T1 -> T2
T3 -> T4 -> T5
T6
```

### Phase 2: Cenário

```
T7 -> T8
T9
```

### Phase 3: Player animado

```
T10 -> T11 -> T13
T12 -> T13 -> T14
```

### Phase 4: Inimigo animado

```
T15 -> T16 -> T18
T17 -> T18
T19
```

### Phase 5: Luta de verdade

```
T20 -> T22
T21 -> T23
T22 -> T23
```

### Phase 6: Efeitos, objetos e interface

```
T24 -> T25
T26
T27 -> T28
```

---

## Task Breakdown

### Phase 1: Correção do ataque e fundação da arte

#### T1: Módulo de modo debug

**What**: `isDebug()` (liga com `?debug` na URL, F1 alterna) e `onDebugChange(cb)`.
**Where**: `src/game/debug.ts`
**Depends on**: None
**Reuses**: nada
**Requirement**: FIX-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] `isDebug()` devolve `true` com `?debug` na URL e `false` sem
- [x] F1 alterna o estado e avisa quem se registrou
- [x] Gate check passes: `npm run build && npm test` (76 testes)

**Tests**: none (adaptador lê `window.location` e o teclado do Phaser; a matriz diz none para essa camada)
**Gate**: build
**Commit**: `feat(debug): add debug mode toggle via url flag and F1`

---

#### T2: Esconder ferramentas de teste fora do debug

**What**: Registrar as teclas 1, 2 e H só em modo debug e desenhar a hitbox do soco só em modo debug.
**Where**: `src/scenes/TestScene.ts`
**Depends on**: T1
**Reuses**: `TestScene.onKey`, `debugHit`, `toggleDebugDraw`
**Requirement**: FIX-01, FIX-02, FIX-03, FIX-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] Smoke sem `?debug`: 1/2 não mudam o estado de nenhum inimigo; H não liga o desenho da física; nenhum retângulo de hitbox aparece ao socar
- [x] Smoke com `?debug`: 1/2/H funcionam e a hitbox aparece
- [x] Smoke: J com o centro do inimigo a 60 px não acerta; encostado acerta (FIX-03)
- [x] Gate check passes: `npm run build && npm test` (76 testes)

**Tests**: none (cena Phaser; smoke headless)
**Gate**: build
**Commit**: `fix(scene): gate test hits and hitbox drawing behind debug mode`

---

#### T3: Parser de folha de pixel art

**What**: `parseSheet(name, frames, colors)` que valida e devolve células por frame.
**Where**: `src/core/pixelGrid.ts`
**Depends on**: None
**Reuses**: padrão de erro de `parseLevel` (`src/core/level.ts`)
**Requirement**: ART-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Erro com o nome do sprite para linhas desiguais, caractere fora da paleta, frames de tamanhos diferentes e folha sem frames
- [ ] `.` vira `null`; largura, altura e ordem dos frames preservadas
- [ ] Gate check passes: `npm test` (≈ 82 testes)

**Tests**: unit (`tests/core/pixelGrid.test.ts`)
**Gate**: quick
**Commit**: `feat(art): add pixel grid sheet parser`

---

#### T4: Paleta única

**What**: `PALETTE` (≤ 32 cores, tema noturno), `PALETTE_KEYS` e `ART_SCALE = 2`.
**Where**: `src/game/art/palette.ts`
**Depends on**: T3
**Reuses**: nada
**Requirement**: ART-01, ART-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Teste: no máximo 32 entradas, chaves de 1 caractere, `.` reservado (não está na paleta), cores válidas 0x000000–0xffffff, `ART_SCALE === 2`
- [ ] O módulo não importa `phaser` como valor
- [ ] Gate check passes: `npm test` (≈ 85 testes)

**Tests**: unit (`tests/game/art.test.ts`)
**Gate**: quick
**Commit**: `feat(art): add single night palette and texel scale`

---

#### T5: Render de folhas em textura de canvas

**What**: `registerSheet(scene, key, sheet)` pinta cada texel como bloco `ART_SCALE` e registra um frame nomeado por quadro.
**Where**: `src/game/art/render.ts`
**Depends on**: T4
**Reuses**: API `textures.createCanvas`, `Texture.add`, `CanvasTexture.refresh` (conferidas em `node_modules/phaser/types/phaser.d.ts`)
**Requirement**: ART-01, ART-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Smoke: uma folha de teste registrada tem frames do tamanho `largura*2 × altura*2` e pixels com as cores da paleta (lidos com `getPixel`)
- [ ] Gate check passes: `npm run build && npm test`

**Tests**: none (adaptador de canvas; smoke headless)
**Gate**: build
**Commit**: `feat(art): render parsed sheets into named canvas frames`

---

#### T6: Resolução e câmeras

**What**: `roundPixels`, câmera principal com zoom 1,5 que segue o player dentro dos limites, e câmera de UI (zoom 1) para o HUD atual com `ignore` cruzado.
**Where**: `src/scenes/TestScene.ts`
**Depends on**: None
**Reuses**: `cameras.main.startFollow` atual; `setDeadzone`, `setZoom`, `cameras.add`, `ignore`
**Requirement**: RES-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Smoke: `cameras.main.zoom === 1.5`; com o player nos cantos da sala a câmera não mostra nada fora de `0..widthPx × 0..heightPx`
- [ ] Smoke: o texto do HUD fica fixo no canto e não é ampliado
- [ ] Gate check passes: `npm run build && npm test`

**Tests**: none (câmera Phaser; smoke headless)
**Gate**: build
**Commit**: `feat(camera): zoom world camera and add fixed ui camera`

---

### Phase 2: Cenário

#### T7: Escolha da variante de tile

**What**: `tileVariant(rows, tx, ty)` devolve a variante pelos quatro vizinhos, ou `null` para tile vazio.
**Where**: `src/core/level.ts`
**Depends on**: None
**Reuses**: legenda e formato de `parseLevel`
**Requirement**: ENV-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Testes cobrem as 9 variantes do ENV-01 e a borda do mapa (fora do mapa conta como sólido nas laterais e no fundo, vazio no topo)
- [ ] Gate check passes: `npm test`

**Tests**: unit (`tests/core/level.test.ts`)
**Gate**: quick
**Commit**: `feat(level): pick tile variant from neighbors`

---

#### T8: Tileset desenhado no terreno

**What**: Folha do tileset (pedra noturna com borda de topo e variações) e o terreno desenhado tile a tile; a física continua nos retângulos mesclados.
**Where**: `src/game/art/tiles.ts`
**Depends on**: T7
**Reuses**: `registerSheet` (T5), `TestScene.buildTerrain`
**Requirement**: ENV-01, ART-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Teste de dados: a folha do tileset passa no `parseSheet` com a paleta e tem um frame por variante
- [ ] Smoke + captura: plataformas com borda de topo clara e cantos; nenhum bloco cinza placeholder
- [ ] Gate check passes: `npm run build && npm test`

**Tests**: unit (`tests/game/art.test.ts`)
**Gate**: build
**Commit**: `feat(art): draw autotiled terrain`

---

#### T9: Fundo com parallax

**What**: Céu em gradiente com lua, prédios distantes e colunas/janelas médias, com `scrollFactor` 0,1/0,3/0,6.
**Where**: `src/game/art/background.ts`
**Depends on**: None
**Reuses**: `PALETTE`, `registerSheet`
**Requirement**: ENV-02, ART-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Smoke: três camadas atrás do terreno com `scrollFactorX` 0,1, 0,3 e 0,6; ao andar 200 px o fundo desloca 20/60/120 px
- [ ] Gate check passes: `npm run build && npm test`

**Tests**: none (desenho procedural com Graphics; smoke headless)
**Gate**: build
**Commit**: `feat(art): add three-layer parallax night background`

---

### Phase 3: Player animado

#### T10: Fase pública do combo

**What**: Getter `phase` no `ComboTracker`.
**Where**: `src/core/combo.ts`
**Depends on**: None
**Reuses**: campo privado `phase` existente
**Requirement**: CHR-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Testes: `phase` passa por idle → startup → active → recovery → window → idle nos tempos do golpe
- [ ] Os 14 testes de combo existentes continuam passando sem alteração
- [ ] Gate check passes: `npm test`

**Tests**: unit (`tests/core/combo.test.ts`)
**Gate**: quick
**Commit**: `feat(combo): expose current attack phase`

---

#### T11: Seletor de animação do player

**What**: `pickPlayerAnim` com a precedência do CHR-01 e `attackFrame(phase)` (`hit` só em `active`).
**Where**: `src/core/animState.ts`
**Depends on**: T10
**Reuses**: tipo `ComboPhase` (T10)
**Requirement**: CHR-01, CHR-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Um teste por regra de precedência (hurt > golpe > ar > run > idle), limiar de 10 px/s, variante carry e jump × fall por sinal de vy
- [ ] `attackFrame`: startup → `wind`, active → `hit`, recovery/window → `recover`
- [ ] Gate check passes: `npm test`

**Tests**: unit (`tests/core/animState.test.ts`)
**Gate**: quick
**Commit**: `feat(anim): add player animation selector`

---

#### T12: Sprites do player

**What**: Folha do estudante de jujutsu (16×24 texels) com os frames de todas as animações do CHR-01.
**Where**: `src/game/art/sprites/player.ts`
**Depends on**: None
**Reuses**: `PALETTE_KEYS`
**Requirement**: CHR-01, ART-01, ART-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Teste de dados: a folha passa no `parseSheet`; todo nome de animação do CHR-01 tem pelo menos um frame; os golpes têm `wind`, `hit` e `recover`
- [ ] Gate check passes: `npm test`

**Tests**: unit (`tests/game/art.test.ts`)
**Gate**: quick
**Commit**: `feat(art): draw player sprite sheet`

---

#### T13: Registro de arte e animações

**What**: `createArt(scene)` (troca `createPlaceholderTextures`) e `registerAnims(scene)`; falha na inicialização se uma animação citar frame inexistente.
**Where**: `src/game/art/index.ts`
**Depends on**: T11, T12
**Reuses**: `TEX`, `registerSheet`, `anims.create`
**Requirement**: CHR-01, ART-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Smoke: todas as chaves de `TEX` existem; as animações do player existem com os frames certos
- [ ] Gate check passes: `npm run build && npm test`

**Tests**: none (registro no Phaser; smoke headless)
**Gate**: build
**Commit**: `feat(art): register sheets and animations at scene start`

---

#### T14: Player animado com hitbox alinhada

**What**: O Player troca de animação pelo `pickPlayerAnim` e, nos golpes, faz `setFrame` pela fase; o sprite fica com o pé na base do corpo e a hitbox fica sob o membro esticado.
**Where**: `src/game/Player.ts`
**Depends on**: T13
**Reuses**: `ComboTracker.phase`, `attackFrame`
**Requirement**: CHR-01, CHR-02, FIX-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Smoke: no frame em que o `hitboxOn` dispara, o frame do sprite é o `*-hit` do golpe
- [ ] Smoke: correndo = `run`, no ar subindo = `jump`, caindo = `fall`, segurando objeto = `carry-*`
- [ ] Smoke: J com o inimigo a 60 px não acerta; encostado acerta
- [ ] Gate check passes: `npm run build && npm test`

**Tests**: none (adaptador; regra coberta pelo T11)
**Gate**: build
**Commit**: `feat(player): animate player and align strike frame with hitbox`

---

### Phase 4: Inimigo animado

#### T15: IA do inimigo

**What**: `EnemyAI` com patrulha, perseguição, preparo, golpe, descanso e `interrupt()`.
**Where**: `src/core/enemyAI.ts`
**Depends on**: None
**Reuses**: estilo de máquina de estados do `EnemyBrain`
**Requirement**: AI-01, AI-02, AI-03, AI-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Testes com os números do spec: patrulha ±48 px a 35 px/s; persegue < 200 px a 70 px/s; prepara < 40 px; 450/120/800 ms; eventos `windupStart`/`hitboxOn`/`hitboxOff` na ordem
- [ ] Testes: `canAct = false` zera `vx` e interrompe preparo e golpe (AI-04), sem emitir `hitboxOn` depois
- [ ] Borda: morrer no preparo nunca abre a hitbox
- [ ] Gate check passes: `npm test`

**Tests**: unit (`tests/core/enemyAI.test.ts`)
**Gate**: quick
**Commit**: `feat(ai): add simple enemy patrol, chase and attack cycle`

---

#### T16: Seletor de animação do inimigo

**What**: `pickEnemyAnim` a partir do estado do cérebro e da IA.
**Where**: `src/core/animState.ts`
**Depends on**: T15
**Reuses**: `EnemyState` (`enemyBrain.ts`), `EnemyAIState` (T15)
**Requirement**: CHR-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Um teste por linha da tabela brain × IA → `idle`/`walk`/`windup`/`attack`/`hurt`/`getup`
- [ ] Gate check passes: `npm test`

**Tests**: unit (`tests/core/animState.test.ts`)
**Gate**: quick
**Commit**: `feat(anim): add enemy animation selector`

---

#### T17: Sprites do inimigo e partes do ragdoll

**What**: Folha do espírito amaldiçoado (18×24 texels), com tronco nos 22 px centrais, e os recortes de ragdoll (cabeça com olho, tronco, membro) na mesma paleta.
**Where**: `src/game/art/sprites/enemy.ts`
**Depends on**: None
**Reuses**: `PALETTE_KEYS`
**Requirement**: CHR-03, CHR-04, ART-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Teste de dados: a folha passa no `parseSheet`; existem frames para as 6 animações do CHR-03; as partes do ragdoll só usam cores presentes nos frames do inimigo
- [ ] Gate check passes: `npm test`

**Tests**: unit (`tests/game/art.test.ts`)
**Gate**: quick
**Commit**: `feat(art): draw cursed spirit sheet and ragdoll parts`

---

#### T18: Inimigo e ragdoll com arte

**What**: `Enemy` toca as animações pelo `pickEnemyAnim` (o "levantar" vira `getup`) e `Ragdoll` usa as partes recortadas; registrar as animações do inimigo em `createArt`.
**Where**: `src/game/Enemy.ts`
**Depends on**: T16, T17
**Reuses**: `Ragdoll`, `createArt` (T13)
**Requirement**: CHR-03, CHR-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Smoke: golpe leve = `hurt`; forte = ragdoll com as texturas das partes; levanta com `getup`; morte dissolve
- [ ] Gate check passes: `npm run build && npm test`

**Tests**: none (adaptador; regra coberta pelo T16)
**Gate**: build
**Commit**: `feat(enemy): animate enemy and texture ragdoll from its art`

---

#### T19: Extrair a hitbox de ataque

**What**: `AttackHitbox` (abrir, seguir, fechar, desenhar só em debug) extraída de `Player`, sem mudar comportamento.
**Where**: `src/game/hitbox.ts`
**Depends on**: None
**Reuses**: `Player.openHitbox/placeHitbox/closeHitbox`, `makeHitGate`, `Filters.hitbox`
**Requirement**: FIX-02, FIX-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Smoke: o combo acerta o inimigo exatamente como antes (8, 8, 18; um acerto por golpe) e nada acerta a 60 px
- [ ] Gate check passes: `npm run build && npm test`

**Tests**: none (refatoração de adaptador; smoke de regressão)
**Gate**: build
**Commit**: `refactor(combat): extract attack hitbox from player`

---

### Phase 5: Luta de verdade

#### T20: Regra de time dos golpes

**What**: `Team` (`'player'|'enemy'`) e `canDamage(attacker, target)`: golpe de inimigo nunca atinge inimigo.
**Where**: `src/core/hit.ts`
**Depends on**: None
**Reuses**: `makeHitGate`
**Requirement**: AI-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Testes: enemy→player sim, enemy→enemy não, player→enemy sim; `Hittable` ganha `team`
- [ ] Gate check passes: `npm test`

**Tests**: unit (`tests/core/hit.test.ts`)
**Gate**: quick
**Commit**: `feat(combat): add team rule so enemies never hit each other`

---

#### T21: Vida do player

**What**: `Health` com dano, invulnerabilidade, atordoamento, morte e respawn.
**Where**: `src/core/health.ts`
**Depends on**: None
**Reuses**: estilo de timers do `EnemyBrain`
**Requirement**: HP-01, HP-02, HP-03, HP-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Testes com os números do spec: dano reduz hp; 700 ms de invulnerabilidade que ignora golpes; 200 ms de atordoamento; hp 0 → `died` e `respawn` após 1000 ms com hp 100; dano excedente não deixa hp negativo
- [ ] Borda: dois golpes no mesmo frame = um dano só
- [ ] Gate check passes: `npm test`

**Tests**: unit (`tests/core/health.test.ts`)
**Gate**: quick
**Commit**: `feat(health): add player health with invulnerability and respawn`

---

#### T22: Inimigo ataca

**What**: `Enemy` segue a `EnemyAI` (anda só em x, vira para o player) e abre uma `AttackHitbox` de 12 de dano com `team: 'enemy'` no `hitboxOn`; levar golpe chama `interrupt()`.
**Where**: `src/game/Enemy.ts`
**Depends on**: T20
**Reuses**: `AttackHitbox` (T19), `EnemyAI` (T15), `ENEMY_ATTACK`/`ENEMY_AI` em `tuning.ts`
**Requirement**: AI-01, AI-02, AI-03, AI-04, AI-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Smoke: player longe → inimigo patrulha; a 150 px → persegue; encostado → `windup` visível por ~450 ms e golpe; o outro inimigo nunca toma dano do golpe
- [ ] Smoke: socar no preparo cancela o golpe
- [ ] Gate check passes: `npm run build && npm test`

**Tests**: none (adaptador; regras cobertas por T15/T20)
**Gate**: build
**Commit**: `feat(enemy): chase and attack the player`

---

#### T23: Player leva dano e renasce

**What**: `Player.receiveHit` usa `Health`: recuo, trava de movimento, piscar, `hurt`; ao morrer larga o objeto, faz fade e renasce no spawn.
**Where**: `src/game/Player.ts`
**Depends on**: T21, T22
**Reuses**: `stepMovement(locked)`, `PropMachine.holderGone()`, `PLAYER_HEALTH`
**Requirement**: HP-01, HP-02, HP-03, HP-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Smoke: parado ao lado do inimigo o hp cai 12 por golpe; pisca e não perde vida durante a invulnerabilidade; ao zerar renasce no spawn com 100 e o objeto segurado cai
- [ ] Gate check passes: `npm run build && npm test`

**Tests**: none (adaptador; regra coberta pelo T21)
**Gate**: build
**Commit**: `feat(player): take damage, blink and respawn`

---

### Phase 6: Efeitos, objetos e interface

#### T24: Hitstop

**What**: `Hitstop` (maior entre o restante e o novo) e `HITSTOP_MS` em `src/data/fx.ts`.
**Where**: `src/core/hitstop.ts`
**Depends on**: None
**Reuses**: nada
**Requirement**: FX-01, FX-02

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Testes: 50/90 ms; sobreposição fica com o maior, nunca a soma; `reset()` descongela
- [ ] Gate check passes: `npm test`

**Tests**: unit (`tests/core/hitstop.test.ts`)
**Gate**: quick
**Commit**: `feat(fx): add hitstop timer`

---

#### T25: Efeitos de impacto e movimento

**What**: `Fx` (faísca por tipo, poeira, rastro, tremida só no forte) ligado aos acertos pelo `onConnect`; a cena pausa Matter, animações, tweens e timers durante o hitstop e reseta no reinício.
**Where**: `src/game/fx.ts`
**Depends on**: T24
**Reuses**: padrão de partículas de `Ragdoll.dissolve`, `PALETTE`
**Requirement**: FX-01, FX-03, FX-04, FX-05

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Smoke: a posição do inimigo fica parada ~50 ms após um jab e ~90 ms após o chute
- [ ] Smoke + captura: faísca no ponto de contato com a cor certa; poeira ao pousar; rastro no chute
- [ ] Smoke: R durante o hitstop reinicia sem ficar congelado
- [ ] Gate check passes: `npm run build && npm test`

**Tests**: none (efeitos Phaser; regra coberta pelo T24)
**Gate**: build
**Commit**: `feat(fx): add hit sparks, hitstop freeze, dust and afterimages`

---

#### T26: Objetos com arte

**What**: Sprites de cadeira e garrafa na escala 2 e estilhaços como fragmentos da própria arte.
**Where**: `src/game/art/sprites/props.ts`
**Depends on**: None
**Reuses**: `Prop.shatter`, `registerSheet`
**Requirement**: PRP-01, ART-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Teste de dados: a folha passa no `parseSheet`; os fragmentos só usam cores do sprite de origem
- [ ] Smoke + captura: cadeira e garrafa reconhecíveis; ao quebrar voam fragmentos da mesma cor
- [ ] Gate check passes: `npm run build && npm test`

**Tests**: unit (`tests/game/art.test.ts`)
**Gate**: build
**Commit**: `feat(art): draw props and shatter them into their own fragments`

---

#### T27: HUD

**What**: Barra de vida do player na câmera de UI, barra do inimigo após o primeiro dano, painel de controles por 8 s e Tab alterna.
**Where**: `src/game/Hud.ts`
**Depends on**: None
**Reuses**: câmera de UI (T6), `Health` (T21)
**Requirement**: HUD-01, HUD-02, HUD-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Smoke: a barra acompanha o hp; a barra do inimigo só aparece após o primeiro dano; o painel some em 8 s e volta com Tab
- [ ] Gate check passes: `npm run build && npm test`

**Tests**: none (UI Phaser; smoke headless)
**Gate**: build
**Commit**: `feat(hud): add health bars and collapsible controls panel`

---

#### T28: Documentação e nota de escopo

**What**: README (controles, modo debug, onde ajustar arte/IA/efeitos) e nota no spec de design do sub-projeto 1 registrando que IA simples e vida do player entraram.
**Where**: `README.md`
**Depends on**: T27
**Reuses**: README atual
**Requirement**: FIX-04, HUD-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] README cita `?debug`/F1, Tab, e aponta `tuning.ts`, `fx.ts` e `src/game/art/`
- [ ] Gate check passes: `npm run build && npm test`

**Tests**: none (documentação)
**Gate**: build
**Commit**: `docs: document controls, debug mode and art pipeline`

---

## Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1–T28 | Cada uma: 1 arquivo principal, 1 conceito | ✅ Granular |
| T8, T13, T18, T25 | Arquivo principal + ligação de 1–3 linhas na cena ou em `createArt` para ficar testável no smoke | ⚠️ Coeso (mesmo conceito; ligação é o mínimo para ser verificável) |
| T12, T17 | Folha de sprite grande, mas é um único módulo de dados | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | - | ✅ |
| T2 | T1 | T1 -> T2 | ✅ |
| T3 | None | - | ✅ |
| T4 | T3 | T3 -> T4 | ✅ |
| T5 | T4 | T4 -> T5 | ✅ |
| T6 | None | - | ✅ |
| T7 | None | - | ✅ |
| T8 | T7 | T7 -> T8 | ✅ |
| T9 | None | - | ✅ |
| T10 | None | - | ✅ |
| T11 | T10 | T10 -> T11 | ✅ |
| T12 | None | - | ✅ |
| T13 | T11, T12 | T11 -> T13, T12 -> T13 | ✅ |
| T14 | T13 | T13 -> T14 | ✅ |
| T15 | None | - | ✅ |
| T16 | T15 | T15 -> T16 | ✅ |
| T17 | None | - | ✅ |
| T18 | T16, T17 | T16 -> T18, T17 -> T18 | ✅ |
| T19 | None | - | ✅ |
| T20 | None | - | ✅ |
| T21 | None | - | ✅ |
| T22 | T20 | T20 -> T22 | ✅ |
| T23 | T21, T22 | T21 -> T23, T22 -> T23 | ✅ |
| T24 | None | - | ✅ |
| T25 | T24 | T24 -> T25 | ✅ |
| T26 | None | - | ✅ |
| T27 | None | - | ✅ |
| T28 | T27 | T27 -> T28 | ✅ |

Dependências entre fases (já garantidas pela ordem das fases, sem seta no diagrama): T8/T12/T17/T26 usam T3–T5; T13 usa T5; T14 usa T6; T18 usa T13; T22 usa T15 e T19; T25 usa T19; T27 usa T6 e T21.

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Adaptador (`src/game/debug.ts`) | none | none | ✅ OK |
| T2 | Cena | none | none | ✅ OK |
| T3 | Domínio (`src/core`) | unit | unit | ✅ OK |
| T4 | Dados de arte | unit | unit | ✅ OK |
| T5 | Adaptador (render) | none | none | ✅ OK |
| T6 | Cena | none | none | ✅ OK |
| T7 | Domínio | unit | unit | ✅ OK |
| T8 | Dados de arte + cena | unit | unit | ✅ OK |
| T9 | Adaptador (background) | none | none | ✅ OK |
| T10 | Domínio | unit | unit | ✅ OK |
| T11 | Domínio | unit | unit | ✅ OK |
| T12 | Dados de arte | unit | unit | ✅ OK |
| T13 | Adaptador | none | none | ✅ OK |
| T14 | Adaptador | none | none | ✅ OK |
| T15 | Domínio | unit | unit | ✅ OK |
| T16 | Domínio | unit | unit | ✅ OK |
| T17 | Dados de arte | unit | unit | ✅ OK |
| T18 | Adaptador | none | none | ✅ OK |
| T19 | Adaptador | none | none | ✅ OK |
| T20 | Domínio | unit | unit | ✅ OK |
| T21 | Domínio | unit | unit | ✅ OK |
| T22 | Adaptador + dados de tuning | unit se o tuning mudar | none; os números de `ENEMY_AI`/`ENEMY_ATTACK` ganham asserção no T15 (`tests/core/enemyAI.test.ts` importa o tuning real para um teste de sanidade) | ✅ OK |
| T23 | Adaptador + tuning `PLAYER_HEALTH` | unit se o tuning mudar | none; `PLAYER_HEALTH` ganha asserção no T21 | ✅ OK |
| T24 | Domínio + dados (`src/data/fx.ts`) | unit | unit | ✅ OK |
| T25 | Adaptador | none | none | ✅ OK |
| T26 | Dados de arte + adaptador | unit | unit | ✅ OK |
| T27 | Adaptador | none | none | ✅ OK |
| T28 | Documentação | none | none | ✅ OK |

**Batches (~7 tasks, fases inteiras):** Lote 1 = Fase 1 (6) · Lote 2 = Fases 2 + 3 (3 + 5 = 8) · Lote 3 = Fases 4 + 5 (5 + 4 = 9) · Lote 4 = Fase 6 (5).
