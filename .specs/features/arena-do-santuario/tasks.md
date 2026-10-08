# Arena do santuário — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/arena-do-santuario/spec.md`
**Design**: inline (abaixo); reaproveita a estrutura da F22 (`src/game/art/scenery/`)
**Status**: In Progress
**Branch**: `feat/arena-do-santuario` (a partir do `master` em `e658c64`)
**Modelos**: Opus 5.5 executa inline (arte) e despacha o Verifier no fim.

### Design inline

- `ThemeScenery` ganha `far?` opcional; `farPainterFor(spans)` escolhe o céu do Véu quando todo trecho é `santuario`, senão a escola (`paintFar` sai de `background.ts` para `scenery/school.ts` como `schoolFar`).
- `LayerArea` ganha `variant: 'oni' | 'tecela' | null`; `buildBackground(scene, w, h, spans, variant)` repassa. O `AreaDirector` sabe a rodada e passa `bossSpecFor(round).archetype` só na área de chefe; o `WorldBuilder` guarda e o snapshot expõe `area.arenaVariant`.
- Selo da esquerda: imagem `tileSprite` do frame `seal` na coluna 0, sem corpo; `openSeal` queima as duas.
- Véu vermelho da fase: um `Rectangle` preso à câmera (`scrollFactor` 0) na profundidade −7, criado só na área de chefe; `WorldBuilder.arenaPhase(phase, dead)` ajusta o alpha a cada quadro (chamado pela cena junto do chefe).

---

## Test Coverage Matrix

> Guidelines: `.oxlintrc.json` (400 linhas, 80 por função, complexidade 15), `CLAUDE.md`; lições L-010, L-043, L-069 (despachante testado com dois ou mais tipos), L-070 (ordem de desenho lida da cena viva), L-072 (família de elementos: procurar todos), L-073 (profundidade contra todos os membros do grupo).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Arte pura (`src/game/art/**`) | unit | 1:1 com os ACs, rasterizado (`tests/game/art/sceneryRaster.ts`) | `tests/game/art/*.test.ts` | `npm test` |
| Dados (`src/data/modules/**`) | unit | Largura e legenda exatas | `tests/data/*.test.ts` | `npm test` |
| Adaptadores (`src/scenes/**`, `debugApi`) | smoke | Valor vivo lido do objeto (L-043) | `scripts/smoke/world-boss.smoke.mjs` | `npm run smoke -- world-boss` |
| Ferramentas | none | build gate only | - | - |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tasks com testes unitários | `npm run gate` |
| Full | Tasks de adaptador e a última de cada fase | `npm run gate && npm run smoke -- world- boss` |
| Build | Ferramenta | `npm run gate` |

Base: 2788 testes unitários em `e658c64`.

---

## Execution Plan

### Phase 1: Santuário próprio

```
T1 → T2 → T10 → T3 → T4 → T5
```

### Phase 2: Reação ao chefe

```
T6 → T7
```

### Phase 3: Largura e conferência

```
T8 → T9
```

---

## Task Breakdown

### T1: Camada distante por tema

**What**: `ThemeScenery.far?`, `farPainterFor(spans)` e `schoolFar` (a `paintFar` de hoje, movida); `buildBackground` pinta a distante com `farPainterFor`.
**Where**: `src/game/art/scenery/index.ts`
**Depends on**: None
**Reuses**: `paintFar`
**Requirement**: ARN-01

**Done when**:

- [x] Teste: só `santuario` dá o pintor do santuário; `santuario` + `rua` e sem trechos dão a escola
- [x] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(art): pick the far background painter by theme`

---

### T2: Céu do Véu

**What**: Pintor da distante do santuário: céu escurecido, borda da cúpula do Véu em dither roxo, lua velada, montanhas e copas de cedro ao longe; sem janelas acesas.
**Where**: `src/game/art/scenery/santuarioSky.ts`
**Depends on**: T1
**Reuses**: `Brush`, `speckle`
**Requirement**: ARN-02

**Done when**:

- [x] Teste rasterizado: nenhum texel `a`/`A`; só cores da `PALETTE`; difere da `schoolFar`
- [x] Captura olhada
- [x] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(art): paint the Veil sky over the shrine arena`

---

### T10: Conversão de camada pelo centro do canvas

**What**: `toLayerX` e `layerBands` usam a meia largura do canvas (`SCREEN.w / 2`), que é o centro do zoom do Phaser, no lugar da meia vista de 320 px; os testes passam a derivar o valor do modelo de câmera. Defeito herdado da F18, achado na captura da arena (o santuário caiu para a esquerda; faixas de tema e pilares das emendas ficavam deslocados).
**Where**: `src/game/art/scenery/layers.ts`
**Depends on**: T2
**Reuses**: `SCREEN`
**Requirement**: ARN-03

**Done when**:

- [x] Teste: o ponto convertido cai no centro da tela pelo modelo de câmera, em HD (640, zoom 2) e na versão antiga (480, zoom 1,5)
- [x] Gate verde e smokes `world-` verdes

**Tests**: unit
**Gate**: full
**Commit**: `fix(art): convert world x to layer x around the canvas center`

---

### T3: Santuário na camada média, por arquétipo

**What**: `LayerArea.variant`; pintor médio do santuário com escadaria de pedra, torii grande, telhado do santuário e a árvore sagrada com `shimenawa`; `oni` ganha o torii rachado com correntes, `tecela` ganha fios e casulos pendurados.
**Where**: `src/game/art/scenery/santuario.ts`
**Depends on**: T10
**Reuses**: `Brush`, `paint.ts`
**Requirement**: ARN-03, ARN-04

**Done when**:

- [x] Teste: janelas da média com ≥ 2 cores; difere da `schoolMid`; `oni` e `tecela` dão rasters diferentes
- [x] Captura olhada
- [x] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(art): paint the shrine backdrop with a variant per boss`

---

### T4: Decoração e primeiro plano do santuário

**What**: Peça de decoração (caixa de oferendas com sino e corda) e primeiro plano (raízes e pedras) do santuário; o teste do "tema sem peça" passa a usar um tema que não existe.
**Where**: `src/game/art/scenery/decorArt.ts`
**Depends on**: T3
**Reuses**: `paintDecor`, `paintFront`
**Requirement**: ARN-06

**Done when**:

- [x] Teste: o santuário pinta decoração e primeiro plano; o edge case do tema sem peça continua coberto
- [x] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(art): add the shrine decoration and foreground`

---

### T5: Arquétipo do chefe até o fundo

**What**: `WorldBuilder.build(rows, level, spans, variant)`, o `AreaDirector` passa o arquétipo do chefe na área de chefe, e o snapshot expõe `area.arenaVariant`.
**Where**: `src/scenes/test/world.ts`
**Depends on**: T4
**Reuses**: `bossSpecFor`
**Requirement**: ARN-05

**Done when**:

- [x] `world-boss` confere `arenaVariant` = `oni` na rodada 5; `world-traverse` confere `null` na área comum
- [x] Gate verde e `npm run smoke -- world-` verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(world): pass the boss archetype to the arena background`

---

### T6: Selo dos dois lados

**What**: Na área de chefe, a coluna 0 ganha a imagem do selo enquanto ele está fechado e ela queima junto do selo da direita; o snapshot expõe `area.leftSeal`.
**Where**: `src/scenes/test/world.ts`
**Depends on**: None (fase anterior concluída)
**Reuses**: `buildSeal`, `openSeal`
**Requirement**: ARN-07, ARN-08

**Done when**:

- [x] `world-boss` confere `leftSeal` com o frame `seal` na luta e `null` depois do efeito; área comum sem `leftSeal`
- [x] Gate verde e smokes `world-` verdes

**Tests**: smoke
**Gate**: full
**Commit**: `feat(world): seal the boss arena on both sides`

---

### T7: Véu vermelho da fase

**What**: Sobreposição `PALETTE.r` presa à câmera (profundidade −7) na área de chefe; alpha 0 na fase 1, 0,18 nas fases 2 e 3, e some em 600 ms na vitória; o snapshot expõe `area.veil`.
**Where**: `src/scenes/test/world.ts`
**Depends on**: T6
**Reuses**: `boss.phase`
**Requirement**: ARN-09, ARN-10, ARN-11

**Done when**:

- [x] `world-boss` confere alpha 0 na fase 1, 0,18 na fase 2 e 0 até 600 ms depois da vitória; profundidade −7 lida do objeto
- [x] Gate verde e smokes `world-` e `boss` verdes

**Tests**: smoke
**Gate**: full
**Commit**: `feat(world): tint the arena red from the boss second phase` (feito no mesmo commit da T6: os dois moram em `src/scenes/test/arena.ts`)

---

### T8: Arena de 48 colunas

**What**: O módulo `santuario` passa a 48 colunas (teto da gramática de módulo), com `E` nas duas bordas e dois `p`; testes e smokes que medem o santuário acompanham.
**Where**: `src/data/modules/santuario.ts`
**Depends on**: None (fase anterior concluída)
**Reuses**: lint de módulo
**Requirement**: ARN-12

**Done when**:

- [x] `tests/data/modules.test.ts` exige 48 colunas; `world-boss` mede 50 colunas com parede e selo
- [x] Gate verde e smokes `world-` e `boss` verdes

**Tests**: unit
**Gate**: full
**Commit**: `feat(world): widen the shrine arena to 48 columns`

---

### T9: Captura da arena

**What**: O cenário `cenario` de `tools/visual-shots-hd.mjs` captura a arena do Oni e a da Tecelã.
**Where**: `tools/visual-shots-hd.mjs`
**Depends on**: T8
**Reuses**: `sceneryScenario`
**Requirement**: ARN-04

**Done when**:

- [x] Capturas da rodada 5 e da 15 geradas e olhadas
- [x] Gate verde

**Tests**: none
**Gate**: build
**Commit**: `chore(tools): capture both shrine arena variants`

---

## Phase 4: Consertos do Verifier (rodada 1)

```
T11 → T12 → T13
```

### T11: Fundo da arena lido do jogo vivo

**What**: `buildBackground` guarda nas camadas qual pintor fez a distante (`veil` ou `school`) e a variante que a média recebeu; o snapshot expõe `area.background`; o `world-boss` (em HD) confere `veil` + `oni` na rodada 5 e `tecela` na rodada 15; o `world-traverse` confere `school` + `null` (mutantes U15, U16, S2).
**Where**: `src/game/art/background.ts`
**Depends on**: None (fase anterior concluída)
**Reuses**: `farPainterFor`
**Requirement**: ARN-01, ARN-05

**Done when**:

- [x] Smokes conferem o pintor da distante e a variante lidos das camadas vivas, nas rodadas 5 e 15
- [x] Gate verde e smokes `world-` verdes

**Tests**: smoke
**Gate**: full
**Commit**: `test(world): read the arena sky and variant from the live background`

---

### T12: Slots do santuário e lugar do selo da esquerda

**What**: `modules.test.ts` exige exatamente dois `p` e um `E` perto de cada borda no santuário; `leftSeal` no snapshot ganha `x`, `y`, `width` e `height`, e o `world-boss` confere coluna 0, linhas 0 a 14 (mutantes U12, U14, S5, S6).
**Where**: `tests/data/modules.test.ts`
**Depends on**: T11
**Reuses**: `ArenaDressing.leftSealView`
**Requirement**: ARN-07, ARN-12

**Done when**:

- [x] Teste do módulo e smoke conferem os valores da spec
- [x] Gate verde e smoke `world-boss` verde

**Tests**: smoke
**Gate**: full
**Commit**: `test(world): pin the shrine slots and the left seal footprint`

---

### T13: Chefe que morre na fase 1

**What**: Teste unitário do `ArenaDressing.update` com uma cena falsa: chefe na fase 1 que some deixa o véu em 0; fase 2 acende em 0,18; o fade leva 600 ms (edge case da spec).
**Where**: `tests/scenes/arena.test.ts`
**Depends on**: T12
**Reuses**: `ArenaDressing`
**Requirement**: ARN-10, ARN-11

**Done when**:

- [x] Teste cobre fase 1 → morte (alpha 0), fase 2 (0,18) e o fade (0,09 aos 300 ms, 0 aos 600 ms)
- [x] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `test(world): cover the arena veil when the boss dies in phase 1`

---

## Phase 5: Consertos do Verifier (rodada 2)

```
T14 → T15 → T16
```

### T14: Fundo conferido pela pintura

**What**: Teste unitário do `buildBackground` com uma cena falsa cujas `Graphics` gravam texels: a camada distante da arena é igual ao `veilSky` e a média é igual ao `santuarioMid` com a variante pedida (`oni` ≠ `tecela`); fora da arena, a distante é a escola (mutantes N1, N2).
**Where**: `tests/game/art/sceneryBuild.test.ts`
**Depends on**: None (fase anterior concluída)
**Reuses**: `RasterSink`
**Requirement**: ARN-01, ARN-04, ARN-05

**Done when**:

- [x] Rasters das camadas 0 e 1 comparados com os pintores diretos
- [x] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `test(art): compare the built arena layers with the shrine painters`

---

### T15: Pegada do selo pela medida exibida

**What**: `leftSealView` usa `displayWidth`/`displayHeight` (incluem a escala), no lugar de `width`/`height` (mutante N3).
**Where**: `src/scenes/test/arena.ts`
**Depends on**: T14
**Reuses**: smoke `world-boss`
**Requirement**: ARN-07

**Done when**:

- [x] Smoke `world-boss` verde com a medida exibida
- [x] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `fix(world): measure the left seal by its displayed size`

---

### T16: Véu apagado a cada passo quando o chefe morre na fase 1

**What**: O teste do edge case confere `alpha === 0` em todo passo depois que o chefe some na fase 1 (mutante N4).
**Where**: `tests/scenes/arena.test.ts`
**Depends on**: T15
**Reuses**: `ArenaDressing`
**Requirement**: ARN-10

**Done when**:

- [x] Asserção dentro do laço
- [x] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `test(world): keep the veil dark on every step after a phase 1 death`
