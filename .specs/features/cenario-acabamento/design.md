# Cenário: acabamento — Design

**Spec**: `.specs/features/cenario-acabamento/spec.md`

## Visão geral

O fundo de hoje mora inteiro em `src/game/art/background.ts` (318 linhas): três pintores fixos (distante, médio,
próximo) e uma faixa de cor por tema na camada próxima. O desenho passa a ser **por tema**: cada tema ganha um
arquivo em `src/game/art/scenery/` com os pintores da camada média, da camada próxima, do primeiro plano e da
decoração. `background.ts` fica só com a montagem das camadas, a camada distante e o mapeamento de trecho para
coordenada de camada.

```
buildBackground(scene, w, h, spans)
 ├─ distante (0,1): paintFar (sem mudança)
 ├─ média   (0,3): para cada faixa de tema → THEMES[tema].mid(brush, faixa);  pilar nas fronteiras
 ├─ próxima (0,6): para cada faixa de tema → THEMES[tema].near(brush, faixa); pilar nas fronteiras
 └─ devolve as 3 camadas (com data 'bands' e 'midBands')
buildScenery(scene, spans, level)            (novo, no WorldBuilder, só no mundo modular)
 ├─ decoração (scrollFactor 1, profundidade -5): decorSlots(spans) → THEMES[tema].decor(brush, x, chão)
 └─ primeiro plano (scrollFactor 1,15 / 1, profundidade 50): THEMES[tema].front(brush, faixa), só abaixo de y 480
```

## Componentes

| Arquivo | Papel |
| --- | --- |
| `src/game/art/scenery/brush.ts` | `Brush` e `rng` saem de `background.ts` sem mudança de comportamento. O `Brush` passa a pintar num `PaintSink` (`fillStyle` + `fillRect`), que o `Graphics` do Phaser já satisfaz; os testes usam um sink que grava os texels |
| `src/game/art/scenery/layers.ts` | `layerBands(spans, x0, x1, factor)`: generaliza o `bandsFor` para qualquer fator de parallax (média 0,3, próxima 0,6, frente 1,15); `seams(bands)`: as fronteiras internas |
| `src/game/art/scenery/types.ts` | `ThemeScenery { near, mid, front?, decor? }` e `LayerBand` |
| `src/game/art/scenery/{rua,beco,parque,konbini,santuario}.ts` | Um arquivo por tema. O `santuario` só tem `near` (muro de pedra) e usa o `mid` da escola até a F23 |
| `src/game/art/scenery/school.ts` | Os pintores atuais da camada média e próxima (escola), usados pela sala de teste e pelo santuário |
| `src/game/art/scenery/index.ts` | `THEME_SCENERY: Record<ModuleTheme, ThemeScenery>` |
| `src/game/art/scenery/decor.ts` | `decorSlots(spans)`: posições determinísticas por hash da coluna (sem `Rng` da run); `pillar(brush, x, ground, bottom)` da emenda |
| `tests/game/art/sceneryRaster.ts` | Ajudante de teste: sink que grava texels de 2 px e a função que conta cores por janela (CEN-01, CEN-09) |
| `src/scenes/test/world.ts` | Chama `buildScenery` no mundo modular e destrói as duas camadas novas no `teardown`; usa a folha `terrain` na coluna 0 acima do chão (CEN-03) |
| `src/game/art/tilesThemes.ts` | Troca a `bodyAlt` da `rua` (linhas `a`) por bueiro e remendo (CEN-04) |
| `src/game/Hud.ts` | Contorno `k` de 3 px nos estilos de texto do HUD (CEN-05) |
| `src/scenes/test/snapshot.ts` + `debugApi.ts` | `area.midBands` (CEN-10) e `area.decor` (quantas peças de decoração) |

## Decisões

- **Medida da textura por janela de cor** (CEN-01, CEN-09): o teste rasteriza o que o pintor manda para o sink e
  conta cores por janela de 32x32 px. Não depende de como o pintor fatia os retângulos.
- **Pintor recebe a faixa em coordenada de camada**, não o trecho de mundo: cada camada rola num fator diferente, e
  o `layerBands` já resolve a conversão (o mesmo cálculo do `bandsFor` de hoje, provado em `background.test.ts`).
- **Decoração no mundo, não no fundo**: rola junto com o chão, então pode ter poça de luz no piso. Fica numa única
  `Graphics` por área (custo de desenho fixo, sem corpo do Matter, CEN-14).
- **Primeiro plano com profundidade 50**: na frente dos atores, mas só abaixo do topo do chão (y ≥ 480), então nunca
  cobre corpo de lutador. Fica fora da sala de teste para não mudar os smokes antigos.
- **`bandsFor` continua exportado** como `layerBands(..., PARALLAX[2])`, para o teste THM-02 e o smoke
  `world-traverse` seguirem valendo (CEN-06).
- **Cores novas**: no máximo 4 chaves na `PALETTE`, só se o desenho pedir; o teste de paleta cobre.

## Riscos

- `background.ts` e os pintores por tema ficam abaixo de 400 linhas cada; nenhum arquivo novo entra na lista de
  exceções do `.oxlintrc.json`.
- O teste de 3 cores por janela pode exigir que o muro tenha juntas e sombras em todo trecho: é a intenção.
- Desenho com muitos retângulos numa `Graphics` grande: medir o tempo de construção da área no smoke `world-traverse`
  (a área de 120 colunas tem 3840 px).
