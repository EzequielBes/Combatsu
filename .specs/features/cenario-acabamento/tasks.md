# Cenário: acabamento — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/cenario-acabamento/spec.md`
**Design**: `.specs/features/cenario-acabamento/design.md`
**Status**: In Progress
**Branch**: `feat/cenario-acabamento` (a partir do `master` em `2914ee4`)
**Modelos**: Opus 5.5 executa inline (é trabalho de arte; regra do handoff: arte e revisão em Opus) e despacha o Verifier no fim.

---

## Test Coverage Matrix

> Guidelines: `vitest.config.ts`, `.oxlintrc.json` (400 linhas por arquivo, 80 por função, complexidade 15), `CLAUDE.md` (HD é a base, smoke só do que foi tocado); lições confirmadas L-010 (os dois lados de cada limiar) e L-043 (testar a chamada do adaptador ao motor).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Arte pura (`src/game/art/**`) | unit | 1:1 com os ACs; janelas de cor medidas por rasterização; só cores da `PALETTE` | `tests/game/art/*.test.ts` | `npm test` |
| Adaptadores Phaser (`src/scenes/**`, `src/game/Hud.ts`, `debugApi`) | unit (estilo exportado) ou smoke (valor vivo do snapshot, L-043) | Valor lido do jogo vivo para CEN-06, CEN-10..14 | `tests/game/*.test.ts`, `scripts/smoke/world-*.smoke.mjs` | `npm test`, `npm run smoke -- world-` |
| Ferramentas (`tools/**`) | none | build gate only | - | - |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tasks com testes unitários | `npm run gate` |
| Full | Tasks que mexem no adaptador da cena e a última de cada fase | `npm run gate && npm run smoke -- world-` |
| Build | Tasks sem teste próprio (ferramenta) | `npm run gate` |

Base: 2732 testes unitários em `2914ee4`.

---

## Execution Plan

### Phase 1: Consertos diretos

```
T1 → T2 → T3
```

### Phase 2: Estrutura dos pintores por tema

```
T4 → T5 → T6 → T7 → T8
```

### Phase 3: Muro e horizonte por tema

```
T9 → T10 → T11 → T12 → T13
```

### Phase 4: Decoração e primeiro plano

```
T14 → T15 → T16 → T17 → T18
```

### Phase 5: Conferência visual

```
T19
```

---

## Task Breakdown

### T1: Contorno escuro nos textos do HUD

**What**: Os estilos de texto do HUD (`TEXT_STYLE` e `RUN_TEXT_STYLE`) ganham `stroke` com a cor `PALETTE.k` e `strokeThickness` 3, exportados para o teste.
**Where**: `src/game/Hud.ts`
**Depends on**: None
**Reuses**: `css()` de `Hud.ts`
**Requirement**: CEN-05

**Done when**:

- [x] `tests/game/hudText.test.ts` confere `stroke` = `css(PALETTE.k)` e `strokeThickness` = 3 nos dois estilos
- [x] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `fix(hud): outline the HUD texts so they read over the seal`

---

### T2: Chão da rua sem faixa laranja

**What**: A `bodyAlt` da `rua` troca as duas linhas `a` por um bueiro e um remendo de asfalto.
**Where**: `src/game/art/tilesThemes.ts`
**Depends on**: T1
**Reuses**: `put`, `speckle`
**Requirement**: CEN-04

**Done when**:

- [x] `tests/game/art/tiles.test.ts`: nenhum frame da folha `rua` tem uma linha só de `a` ou `A`
- [x] Os cinco chãos continuam distintos (THM-01)
- [x] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `fix(art): replace the orange lane dashes on the street floor`

---

### T3: Borda esquerda neutra

**What**: Função pura `terrainSheetFor(tx, ty, spans)`: a coluna 0 acima das linhas do chão usa `TEX.terrain`; o resto segue o tema do trecho. O `WorldBuilder.sheetFor` passa a usá-la.
**Where**: `src/game/art/tilesThemes.ts`
**Depends on**: T2
**Reuses**: `THEME_TEXTURES`, `FLOOR_ROWS`
**Requirement**: CEN-03

**Done when**:

- [x] Teste: coluna 0 nas linhas 0 e 14 de um trecho `parque` dá `TEX.terrain`; coluna 0 na linha 15 dá a folha do parque; coluna 1 na linha 14 dá a folha do parque; sem trechos dá `TEX.terrain`
- [x] `world.ts` chama `terrainSheetFor`
- [x] Gate verde e `npm run smoke -- world-` verde

**Tests**: unit
**Gate**: full
**Commit**: `fix(world): draw the left boundary with the neutral stone sheet`

---

### T4: Pincel num módulo próprio

**What**: `Brush` e `rng` saem de `background.ts` para `scenery/brush.ts`; o `Brush` pinta num `PaintSink` (`fillStyle`, `fillRect`). Ajudante de teste `sceneryRaster.ts` com um sink que grava texels e conta cores por janela.
**Where**: `src/game/art/scenery/brush.ts`
**Depends on**: None (fase anterior concluída)
**Reuses**: `Brush` de `background.ts`
**Requirement**: CEN-01

**Done when**:

- [x] Teste: `rect` alinha à grade de 2 px e `dither` pinta metade dos texels (rasterizado)
- [x] `background.ts` importa o pincel; `background.test.ts` continua verde
- [x] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `refactor(art): move the background brush to its own module`

---

### T5: Faixas por camada

**What**: `layerBands(spans, x0, x1, factor)` e `seams(bands)` em `scenery/layers.ts`; `bandsFor` vira `layerBands(..., PARALLAX[2])` com as cores do tema.
**Where**: `src/game/art/scenery/layers.ts`
**Depends on**: T4
**Reuses**: `bandsFor`
**Requirement**: CEN-02, CEN-07

**Done when**:

- [x] Teste: fronteira de trecho no fator 0,3 e 1,15 (`f·X + (1−f)·320`); a primeira faixa começa em `x0` e a última termina em `x1`; `seams` devolve as fronteiras internas (nenhuma com um trecho só)
- [x] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(art): map module spans to any parallax layer`

---

### T6: Registro de pintores por tema

**What**: `scenery/types.ts`, `scenery/school.ts` (os pintores médio e próximo de hoje) e `scenery/index.ts` com `THEME_SCENERY`; `buildBackground` pinta a média e a próxima por faixa com o pintor do tema e guarda `midBands` na camada média.
**Where**: `src/game/art/scenery/index.ts`
**Depends on**: T5
**Reuses**: `paintMid`, `paintNear` de `background.ts`
**Requirement**: CEN-07

**Done when**:

- [x] Teste: `THEME_SCENERY` tem uma entrada por tema de `THEME_FRAMES`
- [x] Sem `spans` (a sala) o fundo é o de antes
- [x] `background.ts` abaixo de 400 linhas
- [x] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `refactor(art): paint the middle and near layers through per-theme painters`

---

### T7: `midBands` no snapshot

**What**: `WorldBuilder.midBands()` lê o `midBands` da camada média; `snapshot.ts` e o tipo do `debugApi` expõem `area.midBands` (`{ theme }` por trecho).
**Where**: `src/scenes/test/snapshot.ts`
**Depends on**: T6
**Reuses**: `nearBands()`
**Requirement**: CEN-10

**Done when**:

- [x] `world-traverse.smoke.mjs` confere um `midBands` por módulo, com o tema dele
- [x] Gate verde e `npm run smoke -- world-` verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(scene): expose the middle background bands in the debug snapshot`

---

### T8: Pilar na emenda dos módulos

**What**: `buildBackground` desenha um pilar de 20 px centrado em cada `seam` das camadas média e próxima.
**Where**: `src/game/art/background.ts`
**Depends on**: T7
**Reuses**: `seams`, pilar de `school.ts`
**Requirement**: CEN-02

**Done when**:

- [x] Teste rasterizado: a coluna da fronteira tem o pilar (cor do pilar nos texels do centro) e uma área de um trecho só não tem pilar extra
- [x] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(art): cover the module seams with a pillar`

---

### T9: Rua

**What**: `scenery/rua.ts`: muro de concreto com portas de enrolar, pichação e placas (próxima) e prédios com letreiros, fios e caixa d'água (média).
**Where**: `src/game/art/scenery/rua.ts`
**Depends on**: None (fase anterior concluída)
**Reuses**: `Brush`
**Requirement**: CEN-01, CEN-08, CEN-09

**Done when**:

- [ ] Teste: janelas de 32x32 da faixa do muro com ≥ 3 cores e janelas da média com ≥ 2 cores (rasterizado), só cores da `PALETTE`
- [ ] Prancha olhada (captura `?debug&modules=rua`)
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(art): draw the street wall and skyline`

---

### T10: Beco

**What**: `scenery/beco.ts`: tijolo, canos e ar-condicionado (próxima) e paredes de prédios com escada de incêndio e varais (média).
**Where**: `src/game/art/scenery/beco.ts`
**Depends on**: T9
**Reuses**: `Brush`
**Requirement**: CEN-01, CEN-08, CEN-09

**Done when**:

- [ ] Mesmos testes da T9 para o `beco`, e a média difere da `rua`
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(art): draw the alley wall and backdrop`

---

### T11: Parque

**What**: `scenery/parque.ts`: sebe podada com grade de ferro (próxima, substitui o verde chapado) e copas de árvore, lago e postes (média).
**Where**: `src/game/art/scenery/parque.ts`
**Depends on**: T10
**Reuses**: `Brush`
**Requirement**: CEN-01, CEN-08, CEN-09

**Done when**:

- [ ] Mesmos testes da T9 para o `parque`, e a média difere de `rua` e `beco`
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(art): draw the park hedge and tree line`

---

### T12: Konbini

**What**: `scenery/konbini.ts`: parede de lojas com vitrine (próxima) e interior com prateleiras, geladeira e caixa (média).
**Where**: `src/game/art/scenery/konbini.ts`
**Depends on**: T11
**Reuses**: `Brush`
**Requirement**: CEN-01, CEN-08, CEN-09

**Done when**:

- [ ] Mesmos testes da T9 para a `konbini`; as quatro médias são distintas entre si
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(art): draw the konbini wall and interior`

---

### T13: Santuário com muro de pedra

**What**: `scenery/santuario.ts`: muro de pedra com lanternas (próxima); a média continua a da escola até a F23.
**Where**: `src/game/art/scenery/santuario.ts`
**Depends on**: T12
**Reuses**: `school.ts`
**Requirement**: CEN-01

**Done when**:

- [ ] Teste de janelas da T9 para o `santuario` (próxima)
- [ ] Gate verde e `npm run smoke -- world-` verde

**Tests**: unit
**Gate**: full
**Commit**: `feat(art): draw the shrine stone wall`

---

### T14: Posições da decoração

**What**: `decorSlots(spans)` em `scenery/decor.ts`: de 1 a 3 posições por trecho, por hash da coluna e do tema, longe dos pontos de spawn e da coluna do player.
**Where**: `src/game/art/scenery/decor.ts`
**Depends on**: None (fase anterior concluída)
**Reuses**: hash de `tileFrameFor`
**Requirement**: CEN-13, CEN-15

**Done when**:

- [ ] Teste: ≥ 1 posição por trecho, todas dentro do trecho; a mesma entrada dá a mesma saída; trechos diferentes dão posições diferentes
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(art): pick deterministic decoration spots per module`

---

### T15: Arte da decoração

**What**: `scenery/decorArt.ts`: uma peça por tema (máquina de bebidas e placa na rua, lixeiras e caixas no beco, poste com poça de luz no parque, cestas e cartaz na konbini), pintada com o `Brush` a partir do pé no chão.
**Where**: `src/game/art/scenery/decorArt.ts`
**Depends on**: T14
**Reuses**: `Brush`
**Requirement**: CEN-13

**Done when**:

- [ ] Teste: cada tema de combate e a konbini têm peça; a peça só pinta cores da `PALETTE`; tema sem peça não pinta nada nem lança erro
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(art): draw the decoration pieces for each theme`

---

### T16: Arte do primeiro plano

**What**: `scenery/frontArt.ts`: silhuetas baixas na frente (grama alta, cones, mureta, raízes) por tema, só abaixo de y 480.
**Where**: `src/game/art/scenery/frontArt.ts`
**Depends on**: T15
**Reuses**: `Brush`, `layerBands` no fator 1,15
**Requirement**: CEN-12

**Done when**:

- [ ] Teste rasterizado: nenhum texel acima de y 480 para todo tema
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(art): draw a low foreground strip per theme`

---

### T17: Cena monta decoração e primeiro plano

**What**: `WorldBuilder` cria a decoração (profundidade -5, `scrollFactor` 1) e o primeiro plano (profundidade 50, `scrollFactor` 1,15 e 1) no mundo modular, destrói os dois no `teardown`, e o snapshot ganha `area.decor` (peças) e `area.front` (`{ sx, sy }` lidos do objeto). `?debug&decor=0` desliga os dois.
**Where**: `src/scenes/test/world.ts`
**Depends on**: T16
**Reuses**: `buildBackground`
**Requirement**: CEN-11, CEN-13, CEN-14

**Done when**:

- [ ] Fica fora da sala de teste
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(world): build the decoration and foreground layers per area`

---

### T18: Smoke do cenário

**What**: `scripts/smoke/world-scenery.smoke.mjs` (HD): `area.front` = `{ sx: 1.15, sy: 1 }`; `area.decor` ≥ número de módulos; `staticBodies` igual com e sem `decor=0`; duas cargas com a mesma seed dão a mesma decoração; a sala não tem `front`.
**Where**: `scripts/smoke/world-scenery.smoke.mjs`
**Depends on**: T17
**Reuses**: `fight-kit.mjs`, `world-traverse.smoke.mjs`
**Requirement**: CEN-11, CEN-13, CEN-14, CEN-15

**Done when**:

- [ ] `npm run smoke -- world-` verde, com o cenário novo
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `test(smoke): cover the decoration and foreground layers`

---

### T19: Captura dos temas

**What**: Cenário `cenario` em `tools/visual-shots.mjs` que captura a rua, o beco, o parque, a konbini e o santuário, para conferir a arte e para o usuário olhar.
**Where**: `tools/visual-shots.mjs`
**Depends on**: None (fase anterior concluída)
**Reuses**: cenários existentes
**Requirement**: CEN-08

**Done when**:

- [ ] `node tools/visual-shots.mjs .fable-out/cenario cenario` gera uma captura por tema
- [ ] Capturas olhadas
- [ ] Gate verde

**Tests**: none
**Gate**: build
**Commit**: `chore(tools): capture each scenery theme`

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | 2 estilos num arquivo | ✅ |
| T2 | 1 frame | ✅ |
| T3 | 1 função + chamada | ✅ |
| T4 | 1 módulo movido | ✅ |
| T5 | 2 funções coesas | ✅ |
| T6 | registro + pintores movidos | ⚠️ coeso (mesma mudança) |
| T7 | 1 campo do snapshot | ✅ |
| T8 | 1 pintura | ✅ |
| T9-T13 | 1 tema cada | ✅ |
| T14 | 1 função | ✅ |
| T15 | 1 módulo de arte | ✅ |
| T16 | 1 módulo de arte | ✅ |
| T17 | 1 ligação na cena | ✅ |
| T18 | 1 smoke | ✅ |
| T19 | 1 cenário | ✅ |

## Diagram-Definition Cross-Check

| Task | Depends On | Diagram | Status |
| --- | --- | --- | --- |
| T1 | None | início da fase 1 | ✅ |
| T2..T3 | anterior | → | ✅ |
| T4 | T3 | início da fase 2 | ✅ |
| T5..T8 | anterior | → | ✅ |
| T9 | T8 | início da fase 3 | ✅ |
| T10..T13 | anterior | → | ✅ |
| T14 | T13 | início da fase 4 | ✅ |
| T15..T18 | anterior | → | ✅ |
| T19 | T18 | fase 5 | ✅ |

## Test Co-location Validation

| Task | Layer | Matrix | Task | Status |
| --- | --- | --- | --- | --- |
| T1 | Adaptador (estilo exportado) | unit | unit | ✅ |
| T2-T6, T8-T16 | Arte pura | unit | unit | ✅ |
| T7, T17, T18 | Adaptador | smoke | smoke | ✅ |
| T19 | Ferramenta | none | none | ✅ |
