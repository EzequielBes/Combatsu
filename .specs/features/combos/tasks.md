# Combos — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/combos/spec.md`
**Design**: `.specs/features/combos/design.md` (abordagem A)
**Plano**: `docs/plano-builds-e-habilidades.md` (linha F37 da seção 6; seções 3.1, 3.2, 5.2 e 5.7; decisões 1, 3, 5, 6 e 8
da seção 7, confirmadas)
**Base**: F29 `fundacao-de-poder`, F30 `vermelho-e-corpo`, F31 `expansao-de-dominio`, F32, F33 `eixos-das-tecnicas`, F34
`tecnicas-jjk-1`, F35 `vagas-e-talentos` e F36 `arma-imbuida` mergeadas antes da T1. A F37 usa o `shopDraw`/`shopEligibility`/
`shopPreview` da F30, o `bossChest`/`choicePages`/`choiceDirector` da F33, o `TechModule`, o `ResonanceState` e o
`BoogieState` da F34, o `SlotIndex`, o `buildEffects`, o `SpentLedger` e o `trayDirector` da F35 e o
`Arsenal.weapon.evolution`/`WeaponDirector.evolve` da F36.
**Status**: Draft
**Branch**: `feat/combos` (a partir da base acima)
**Ferramentas**: nenhuma MCP. Skill só o `tlc-spec-driven`. As tarefas com efeito em movimento (T39, T40, T45, T46, T53,
T54) conferem no jogo em HD (`?hd=1`), parado e correndo, para os dois lados (memória "Conferir animação em
movimento"), e rodam em Opus 5.5 ou Fable, nunca Sonnet.

Regras que valem para toda tarefa (CLAUDE.md): um commit por tarefa, só os arquivos dela (nunca `git add -A`), `npm run
gate` verde antes do commit; smoke só do que foi tocado; smoke novo com `?debug&hd=1&area=modular`; tetos de 400 linhas
efetivas por arquivo, 80 por função e complexidade 15; arquivo novo nunca entra no `.oxlintrc.json`; teste da lista de
exceções do `max-lines` não cresce (`tests/core/shop.test.ts` e `techShop.test.ts` não crescem: caso novo de loja vai ao
`tests/core/shopDraw.test.ts` da F30 ou, se ele passar de 380, ao `tests/core/comboShop.test.ts`). **CGL-07 em toda
tarefa**: `src/scenes/TestScene.ts` sem linha efetiva líquida nova, `src/data/moves.ts`, `src/game/Hud.ts` e
`src/game/ShopPanel.ts` sem crescer, nenhum campo novo em `src/game/Player.ts`; a T62 confere o total. **Nada
automático** (CGL-01, CGL-02): receita pronta não muda nada no jogo; combo só por compra, confirmação do baú ou `evo=`;
efeito de combo só depois de um aperto. Linha efetiva = sem linha em branco e sem comentário. As linhas citadas no design
valem para `666ad13` (este worktree), `6fff962` (`feat/fundacao-de-poder`) e `649f4e6` (`wt-leva1`); os nomes da F30 a
F36 são reconferidos no começo de cada fase.

**Convivência no passo 0.** A regra antiga e a nova convivem só dentro da Fase 1: a T4 renomeia o
`recipeReady(recipe, loadout)` da F33 para `legacyRecipeReady` (só o nome; os chamadores que o typecheck apontar
acompanham) e o nome `recipeReady` passa à regra nova sobre a `RecipeView`; a T9 apaga o `legacyRecipeReady` e o
`core/weaponEvolution.ts` da F36. Toda tarefa do passo 0 termina com os smokes `evolution`, `boss-chest`, `weapon-`,
`shop` e `shop-axes` iguais (RCP-01).

**Receita no meio do passo.** A receita nova entra no `RECIPES` no começo do passo dela; até a tarefa que liga o efeito,
o baú pode oferecê-la e o `ComboDirector` a recusa (`comboDenied:<id>`) ou a aplica sem efeito na luta. A entrada da loja
da Ressonância Cortante só entra na T33, junto com a aplicação. Cada passo **termina** jogável (spec, "Passos e commits").

**Decisões do usuário que travam tarefas** (o executor para e pergunta antes da tarefa, não durante):

| Antes de | Pergunta | Origem |
| --- | --- | --- |
| T1 | Abordagem A do design e as assumptions marcadas `n` na spec (forma da receita com a peça `eixo`, nível por tipo de peça, até 3 prontas no baú e 2 na loja com rodízio, lugar na loja e no baú, linhas da carta recalculadas a cada `view()`, Punho Negro só com 2 alvos ou mais, ganhos por Kokusen uma vez por conjuração, faixa de 0 a 180 px e teto `floor(N / 2)` de marcas da Ressonância Cortante, ids `uniao:`/`evolucao:`, livro de gastos, União que mantém a principal sem herança, geometria dos cortes, Punho Negro sem janela extra, alvo e grupo do Vácuo, catalisador depois do combo, dicas, Grimório na run, Duos na estrutura, nome mostrado do item). Este arquivo segue as escolhas padrão; trocar alguma muda a tarefa que a cita | spec, Assumptions; design, "Status" |
| T40 | `Punho Negro Divergente` (22) e `Lâmina Dividida da Alma` (23) passam dos 20 caracteres do CRD-05. Se a T40 medir o nome cortado na carta, na faixa ou na pergunta do Abandonar: cada receita ganha um campo `short` para a carta e a faixa (o usuário escolhe os nomes) | design, risco "Usuário" 2 |
| T58 | A T58 começa medindo a carta mais cheia (duas linhas de eixo + `OCUPA VAGA` + `Grimório:`) com o `ShopPanel.debug()`. Se não couber sem crescer o `ShopPanel`: (a) a linha do Grimório troca a 2ª linha de eixo (fica só o eixo-foco); (b) a carta mostra só `Grimório` no lugar do `OCUPA VAGA`, com a dica completa no `ShopPanel.hint` da carta selecionada | design, risco "Usuário" 1 |

---

## Test Coverage Matrix

> Guidelines: `CLAUDE.md` (camadas, gate, smoke só do que foi tocado, HD como base, arte e efeito só prontos depois de
> ver o movimento), `.oxlintrc.json` (tetos e listas de exceção), `vitest.config.*`, `package.json` (`gate`, `test`,
> `smoke`); lições L-010 (limites nos dois lados), L-020 (provar a ausência na janela inteira), L-036 (energia uma vez),
> L-043 (testar o adaptador, não só a regra), L-055 (ler do objeto vivo), L-074 (`facing` nos dois lados), L-076 (campo
> de debug que repete a entrada não prova o efeito). Amostras: `tests/core/evolution.test.ts`,
> `tests/core/noMathRandom.test.ts`, F30 `tests/core/shopDraw.test.ts`, F33 `tests/core/bossChest.test.ts` e
> `tests/data/techAxes.test.ts`, F34 `tests/core/resonance.test.ts` e `tests/core/boogie.test.ts`, F35
> `tests/core/buildEffects.test.ts`, `scripts/smoke/evolution.smoke.mjs`, `scripts/smoke/boss-chest.smoke.mjs`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Regra pura (`src/core/**`) | unit | 1:1 com os ACs; todo edge case listado; limites nos dois lados (L-010): principal no Nv 3 e no Nv 4 em cada receita; catalisador ausente e no Nv 1; Alvos do Divergente 0 e 1; curinga no Nv 2 e no Nv 3; 3 e 4 Duos; 2 e 3 receitas prontas na loja; borda em 0/−1 e 180/181 px do corte; teto de marcas `floor(n / 2)` e um corte além; alcance do Boogie e 1 px além; raio do orbe e 1 px além; 3,1 + 0,3 = 3,4 e nunca 3,7 | `tests/core/*.test.ts` (arquivo novo por sistema novo) | `npm test` |
| Números e tabelas (`src/data/**`) | unit | `RECIPES` linha a linha (RCP-05); nomes e textos únicos lidos dos módulos (NOM-01 a NOM-04); dica de 10 passa e de 11 falha; entradas do catálogo na mesma posição e as novas no fim (OFR-08) | `tests/data/*.test.ts` | `npm test` |
| Adaptadores com porta (`src/game/tech/resonanceCortante.ts`, `src/game/tech/boogieVacuum.ts`) | unit | Porta falsa: retângulo, ângulo e destino entregues (L-043); só `import type` de `phaser` | `tests/game/*.test.ts` | `npm test` |
| Vistas do motor (`src/game/techFx/**`, `src/game/BuildBar.ts`, `src/game/TechSlotsHud.ts`, `src/game/comboMark.ts`) | smoke + conferência em movimento | Lido do objeto vivo (`CutFx.debug().lastRect`, `BoogieFx.debug()`, números de dano) nos dois lados (L-055, L-074); conferência em HD, parado e correndo | `scripts/smoke/combos.smoke.mjs` | `npm run smoke -- combos` |
| Adaptadores (`src/scenes/**`, `src/game/tech/**`) | smoke | Efeito lido do jogo vivo pelo snapshot (slots, `pool.used`, carteira, marcas, posições, eventos), nunca só o parâmetro de entrada (L-076); refatoração com os smokes de antes iguais | `scripts/smoke/combos.smoke.mjs` e os smokes de cada tarefa | `npm run smoke -- <trecho>` |
| Tipos de snapshot (`src/game/buildSnapshot.ts`, `src/game/axisSnapshot.ts`, `src/game/debugApi.ts`) | unit | Literal do `debugApi.test.ts` com `combos` e `combo` | `tests/game/debugApi.test.ts` | `npm test` |
| Documentação (`README.md`, `.specs/**`) | none | build gate only | - | `npm run gate` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tarefa só com teste unitário (regra pura, dados, porta falsa, tipo) | `npm run gate` |
| Full | Tarefa de adaptador, vista do motor ou regra que muda o jogo vivo | `npm run gate && npm run smoke -- <cada trecho da tarefa>` |
| Build | Fim de fase | `npm run gate` e os smokes do passo ("Smokes por passo" do design) |

Base de testes: a contagem no começo da T1 (anotar). Nenhuma tarefa apaga teste sem mover o caso; a T9 move os casos do
`weaponEvolution.test.ts` e lista no commit para onde foi cada um. Cada tarefa informa a nova contagem. Smokes
instáveis sob carga (`armed`, timeouts): repetir isolado antes de suspeitar.

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order. Setas anotadas "(fase N)" são dependências para trás, só para leitura.

### Phase 1: Passo 0 — receita única, regra pura

```
T1 → T4 → T5 → T6
T2 → T3
T2 → T4
T5 → T7
```

### Phase 2: Passo 0 — a regra antiga sai

```
T8 → T10
T9 → T10
T2 → T8 (fase 1)
T5 → T9 (fase 1)
T6 → T9 (fase 1)
T7 → T9 (fase 1)
```

### Phase 3: Passo 1 — combo no item e na run, regra pura

```
T11 → T12
T13
T14
T15
T1 → T11 (fase 1)
T4 → T12 (fase 1)
T2 → T13 (fase 1)
T2 → T14 (fase 1)
```

### Phase 4: Passo 1 — loja e baú, regra pura

```
T16 → T19
T17 → T18 → T19
T16 → T21
T20 → T21
T12 → T16 (fase 3)
T6 → T17 (fase 1)
T12 → T17 (fase 3)
T7 → T20 (fase 1)
T12 → T20 (fase 3)
```

### Phase 5: Passo 1 — todas as prontas no jogo

```
T22 → T23 → T26
T22 → T24 → T26
T22 → T25 → T26
T11 → T22 (fase 3)
T13 → T22 (fase 3)
T18 → T22 (fase 4)
T19 → T22 (fase 4)
T21 → T23 (fase 4)
T14 → T24 (fase 3)
T15 → T24 (fase 3)
T12 → T25 (fase 3)
```

### Phase 6: Passo 2 — Ressonância Cortante, regra pura

```
T28 → T29
T27 → T30
T27 → T31
T3 → T27 (fase 1)
T16 → T30 (fase 4)
```

### Phase 7: Passo 2 — União que libera vaga na build

```
T32 → T33
T34 → T37
T35
T36
T15 → T32 (fase 3)
T22 → T33 (fase 5)
T27 → T33 (fase 6)
T30 → T33 (fase 6)
T31 → T34 (fase 6)
T31 → T35 (fase 6)
T31 → T36 (fase 6)
```

### Phase 8: Passo 2 — Ressonância Cortante na luta

```
T38 → T39 → T40
T29 → T38 (fase 6)
T26 → T40 (fase 5)
T33 → T40 (fase 7)
T35 → T40 (fase 7)
T36 → T40 (fase 7)
T37 → T40 (fase 7)
```

### Phase 9: Passo 3 — Punho Negro Divergente

```
T42 → T43 → T46
T42 → T45 → T46
T44 → T45
T41 → T46
T27 → T41 (fase 6)
T40 → T46 (fase 8)
```

### Phase 10: Passo 4 — Vácuo de Troca, regra pura

```
T48 → T49
T47
T41 → T47 (fase 9)
```

### Phase 11: Passo 4 — Vácuo de Troca no jogo

```
T50 → T53 → T54
T51 → T53
T52 → T54
T48 → T50 (fase 10)
T49 → T53 (fase 10)
T47 → T54 (fase 10)
T46 → T54 (fase 9)
```

### Phase 12: Passo 5 — Grimório, regra pura

```
T55 → T56 → T58
T55 → T57 → T58
T56 → T59
T13 → T55 (fase 3)
T19 → T58 (fase 4)
T21 → T59 (fase 4)
```

### Phase 13: Passo 5 — Grimório no jogo e fechamento

```
T60 → T61 → T62
T57 → T60 (fase 12)
T54 → T61 (fase 11)
T58 → T61 (fase 12)
T59 → T61 (fase 12)
```

---

## Task Breakdown

### Phase 1: Passo 0 — receita única, regra pura

#### T1: `recipeView`, a vista da build que toda receita lê

**What**: função pura `recipeView({ loadout, perks, arsenal, domain }): RecipeView` com `level(kind, id)` (técnica:
`loadout.levelOf(id)`, 0 fora do slot e `1 + pontos` dentro; talento: `perks.levelOf(id)`; arma: `loadout.axes.level(id)`
só com `arsenal.weapon?.id === id`, senão 0; relíquia: `arsenal.levelOf(id)`; Domínio: `domain.level` só com
`domain.id === id`; eixo `item.eixo`: os pontos do eixo com o item equipado, 0 sem ele ou com o eixo morto pelo ramo),
`techniques` (slots ocupados com `{ id, level }`, na ordem dos slots) e `comboOf(kind, id)` (arma:
`arsenal.weapon?.evolution ?? null` da arma equipada; técnica: `null` até a T11; talento, relíquia e Domínio: `null`).
Refeita a cada chamada, sem cache; só tipos de `core/`.
**Where**: `src/core/recipeView.ts` (novo)
**Depends on**: None
**Reuses**: F30 `Loadout.levelOf`, F35 `Perks.levelOf`, F36 `Arsenal.weapon`/`levelOf`, F31 `DomainState`
**Requirement**: RCP-03

**Done when**:

- [ ] `tests/core/recipeView.test.ts` novo: técnica fora do slot → 0, no slot com 3 pontos → 4; talento ausente → 0,
      Nv 2 → 2; arma equipada com 3 pontos → 4, outra arma → 0, sem arma → 0; relíquia ausente → 0, Nv 1 → 1; Domínio
      possuído → o nível, outro id → 0; eixo `divergente.alvos` com 1 ponto → 1, com 1 ponto no Concentrado → 0, sem o
      Divergente → 0; `techniques` na ordem dos slots; `comboOf('arma')` da arma evoluída e da não evoluída
- [ ] Gate verde; contagem informada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the recipe view over the build`

---

#### T2: `RECIPES` com peças `{kind, id, minLevel}`

**What**: em `data/evolutions.ts` nascem `RecipeType`, `PieceKind`, `RecipePiece` (`id` aceita `'*'`),
`WeaponEvolutionId` (sai do `data/weapons.ts` da F36, que passa a importá-lo daqui), `RecipeId` (só os ids do passo 0:
`roxo`, `laminaDividida`, `nuvemItinerante`, `arsenalToji`; cada passo de combo soma o seu), `Recipe` (`type`, `id`,
`name`, `text`, `hint`, `cost`, `pieces`, `into?`), `PieceKind` com `eixo` (`id` `item.eixo`), `COMBO` completo
(`cost: 60`, `maxShop: 2`, `maxChest: 3`, `duoCap: 4`, `hintMax: 10`, `blackFistMul: 0.3`, `cortante: { gapMs: 60,
nearPx: 0 }`) e `recipeById`. `RECIPES` traz as 4 receitas
do passo 0 na ordem da spec, com nomes, textos e dicas do "Data Models" do design (o Roxo continua `Vazio Roxo (Azul +
Vermelho)`, a carta de hoje não muda). `UNION_INHERIT_CAP` (F33) fica. Os leitores do `from` da F33 (`evolve`,
`unionInheritance` e o que o typecheck apontar) passam a ler `pieces` sem mudar comportamento.
**Where**: `src/data/evolutions.ts`
**Depends on**: None
**Reuses**: F33 `RecipePiece`/`minLevel`; F36 `WEAPON_RECIPES` (peças, nomes e níveis das 3 de arma)
**Requirement**: RCP-01, RCP-05

**Done when**:

- [ ] Typecheck verde; `tests/core/evolution.test.ts` (F33) passa só com o nome do campo trocado
- [ ] Smokes `evolution` e `weapon-` iguais
- [ ] Gate verde; contagem igual à base

**Tests**: unit + smoke
**Gate**: full
**Commit**: `refactor(data): describe every recipe by pieces with kind and level`

---

#### T3: `combos.test.ts`, nomes e textos únicos

**What**: teste novo de dados. NOM-01: junta os nomes e textos de todo ramo e Despertar do `AXIS_ITEMS`
(`data/techAxes.ts`: Vermelho, Corpo, Azul, Desmantelar, Divergente, Roxo, Boogie, Ressonância, Fala) e o `name`/`text`
de toda receita do `RECIPES`, compara depois de `trim` e minúsculas e falha com o par repetido na mensagem. NOM-02:
nome e texto não vazios e dica de 1 a `COMBO.hintMax` caracteres, por um verificador local aplicado ao `RECIPES` e a
duas receitas sintéticas (dica de 10 passa, de 11 falha). NOM-03: União sem `into` e Evolução com exatamente uma peça
Nv 4, a primeira, as outras Nv 1 (a peça `eixo` conta como uma das outras); União com `into` com exatamente uma Nv 4
em qualquer posição. NOM-04: tudo lido dos
módulos, sem lista copiada. RCP-05: as 4 receitas do passo 0 na ordem, com peças, mínimos e custo 60 (a T27, a T41 e a
T47 somam as suas).
**Where**: `tests/data/combos.test.ts` (novo)
**Depends on**: T2
**Reuses**: F33 `tests/data/techAxes.test.ts` (EIX-10, comparação de nomes); molde `import.meta.glob` do
`tests/core/noMathRandom.test.ts`
**Requirement**: NOM-01, NOM-02, NOM-03, NOM-04, RCP-05

**Done when**:

- [ ] Teste verde com os dados de hoje
- [ ] Rascunho local (não commitado): trocar o texto do Arsenal de Toji pelo texto do Eco da Palma faz o teste falhar;
      anotado no commit
- [ ] Gate verde; contagem informada

**Tests**: unit
**Gate**: quick
**Commit**: `test(data): guard unique combo names and texts`

---

#### T4: `recipeReady` genérico sobre a `RecipeView`

**What**: em `core/evolution.ts` o `recipeReady(recipe, loadout)` da F33 vira `legacyRecipeReady` (só o nome; chamadores
acompanham) e nascem: `assignPieces(r, view, atMin)` (peças nomeadas primeiro; o curinga `'*'` pega a 1ª técnica de
`view.techniques` que não é outra peça de técnica da receita), `recipeBlocked(r, view)` (com `into`, o resultado
equipado; sem `into` e fora do Duo, `view.comboOf` da principal não nulo), `recipeReady(r, view)`, `readyRecipes(view,
list = RECIPES)` (Uniões e Evoluções prontas na ordem da lista, sem teto, nunca Duo), `consumedTechniques(r)` (com
`into`, toda peça de técnica; União sem `into`, as de técnica menos a principal; Evolução, nenhuma) e `ledgerKeyOf(r)`
(`r.into ?? r.pieces[0].id`; o `core/weaponEvolution.ts` da F36 passa a reexportá-lo daqui até a T9). `evolve` e
`unionInheritance` ficam.
**Where**: `src/core/evolution.ts`
**Depends on**: T1, T2
**Reuses**: F33 `recipeReady`, `evolve`, `unionInheritance`; F36 `ledgerKeyOf`
**Requirement**: RCP-02, RCP-04, RCP-06, RCP-07, DUO-01

**Done when**:

- [ ] `tests/core/evolution.test.ts` refeito com uma `RecipeView` falsa: RCP-02 com cada tipo de peça ausente, abaixo e
      no mínimo; RCP-04 com o Roxo equipado e com a principal carregando outro combo; RCP-06 com o Vermelho Nv 3 e Nv 4
      (Azul equipado) e com cada arma Nv 3 e Nv 4 (catalisador presente), catalisador ausente → falso; receita
      sintética com peça `eixo` no mínimo 1: 0 ponto → falso, 1 → verdadeiro, eixo morto → falso; RCP-07
      `consumedTechniques(roxo)` = `['azul', 'vermelho']`, das de arma `[]`; curinga casa com uma técnica que não é
      peça e não com a outra peça de técnica; `readyRecipes` na ordem da lista; `ledgerKeyOf` do Roxo = `'roxo'`, da
      Lâmina Dividida = `'lamina'`
- [ ] Smokes `evolution` e `weapon-` iguais
- [ ] Gate verde; contagem informada

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(core): decide recipe readiness over the recipe view`

---

#### T5: elegibilidade da loja pela regra única

**What**: no `shopEligibility` a entrada `evolution` vale com `recipeById(id)`, tipo diferente de `duo` e
`recipeReady(r, ctx.view)`; sai a elegibilidade própria da evolução de arma da F36; o edge case da F24 no
`techniqueEligible` só segura as peças de receita com `into` cujo resultado está equipado (`consumedTechniques`). O
contexto ganha `view: RecipeView`, preenchido por `BuildDirector.recipeView()` (método novo de ~3 linhas que chama
`recipeView` com `loadout`, `build.perks`, `arsenal` e `build.domain`) onde o `shopDirector` monta o contexto da loja.
**Where**: `src/core/shopEligibility.ts`, `src/scenes/test/buildDirector.ts`
**Depends on**: T4
**Reuses**: F30 `eligible`; F36 regra da evolução de arma (substituída)
**Requirement**: RCP-07

**Done when**:

- [ ] Teste de elegibilidade (F30 `shopEligibility` ou `evolutionShop.test.ts`): Roxo elegível com Vermelho Nv 4 e Azul,
      não com Nv 3; Lâmina Dividida elegível com Lâmina Nv 4 e Faixas; com o Roxo equipado, Azul e Vermelho fora da loja;
      com a arma evoluída, a relíquia catalisadora e a arma seguem a regra comum (RCP-07)
- [ ] Smokes `shop`, `shop-axes`, `evolution` e `weapon-` iguais
- [ ] Gate verde; contagem informada

**Tests**: unit + smoke
**Gate**: full
**Commit**: `refactor(shop): read recipe eligibility from the recipe view`

---

#### T6: carta 0 da receita pela lista

**What**: o `DrawContext` do `shopDraw` ganha `view`; a carta 0 da receita passa a ser a 1ª pronta na ordem do
`RECIPES` (a mesma de hoje: o Roxo antes das de arma), pelo `readyRecipes`; a ordem dos sorteios do `rng` não muda. O
chamador passa `build.recipeView()`.
**Where**: `src/core/shopDraw.ts`
**Depends on**: T5
**Reuses**: F30/F36 `drawCards` (carta 0, CRD-02)
**Requirement**: RCP-01

**Done when**:

- [ ] `tests/core/shopDraw.test.ts`: com o Roxo e a Lâmina Dividida prontos a carta 0 é o Roxo; as seeds dos casos de
      hoje dão as mesmas cartas
- [ ] Smokes `shop`, `shop-axes` e `weapon-` iguais
- [ ] Gate verde; contagem informada

**Tests**: unit + smoke
**Gate**: full
**Commit**: `refactor(shop): pick the recipe card from the recipe list`

---

#### T7: baú do chefe lendo as receitas da lista

**What**: o `chestCandidates` do `bossChest` recebe `readyRecipes(view)` e devolve as opções `uniao`/`arma` de hoje, com
os mesmos ids; o `choiceDirector` passa `build.recipeView()` onde monta o baú.
**Where**: `src/core/bossChest.ts`, `src/scenes/test/choiceDirector.ts`
**Depends on**: T5
**Reuses**: F33/F36 `chestCandidates`, `chestOptionId`
**Requirement**: RCP-01

**Done when**:

- [ ] `tests/core/bossChest.test.ts`: as seeds de hoje dão as mesmas opções
- [ ] Smokes `boss-chest` e `weapon-` iguais
- [ ] Gate verde; contagem informada

**Tests**: unit + smoke
**Gate**: full
**Commit**: `refactor(chest): offer recipes from the recipe list`

---

### Phase 2: Passo 0 — a regra antiga sai

#### T8: entradas da loja pelo `recipeEntry`

**What**: em `data/shop.ts` nasce `recipeEntry(id)` (rara, sem nível, `cost.base` da receita); as entradas de receita de
hoje (Roxo e as 3 de arma da F36) passam a sair dele com os mesmos ids e as mesmas posições no `GAME_SHOP_CATALOG`;
`ShopEntryId` aceita `RecipeId`.
**Where**: `src/data/shop.ts`
**Depends on**: T2
**Reuses**: `EVOLUTION_SHOP_ENTRIES` (`src/data/shop.ts:233-248` hoje)
**Requirement**: OFR-08

**Done when**:

- [ ] `tests/data/shop.test.ts`: o índice de cada entrada do catálogo igual ao de antes da tarefa (lista de ids lida do
      catálogo antes da mudança e fixada no teste)
- [ ] Smokes `shop` e `evolution` iguais
- [ ] Gate verde; contagem informada

**Tests**: unit + smoke
**Gate**: full
**Commit**: `refactor(data): build recipe shop entries from the recipe list`

---

#### T9: `weaponEvolution` e `legacyRecipeReady` saem

**What**: sai `core/weaponEvolution.ts` (F36); `data/weapons.ts` perde `WeaponRecipe`, `WEAPON_RECIPES` e
`WEAPON.evolutionCost`; sai o `legacyRecipeReady`; os imports do `shopDirector`, `choiceDirector`, `arsenalDirector` e
`weaponDirector` passam a `core/evolution` e `data/evolutions`. O `tests/core/weaponEvolution.test.ts` sai: os casos de
receita vão ao `evolution.test.ts` e o da supressão de afixos ao `tests/core/affixSuppression.test.ts` (com a regra, se
ela morava no `weaponEvolution.ts`, movida sem mudança para `core/affixSuppression.ts`).
**Where**: `src/core/weaponEvolution.ts` (sai), `src/data/weapons.ts`, `src/core/evolution.ts`
**Depends on**: T5, T6, T7
**Reuses**: —
**Requirement**: RCP-01

**Done when**:

- [ ] `grep -rn "WEAPON_RECIPES\|weaponEvolution\|legacyRecipeReady\|evolutionCost" src tests` vazio
- [ ] Smokes `evolution`, `boss-chest`, `weapon-`, `shop` e `shop-axes` iguais (RCP-01)
- [ ] Gate verde; contagem igual (casos movidos listados no commit)

**Tests**: unit + smoke
**Gate**: full
**Commit**: `refactor(core): drop the weapon-only recipe rule`

---

#### T10: decisão da receita única no `STATE.md`

**What**: `.specs/STATE.md` ganha a AD-NNN do design (próximo número livre, conferido no arquivo; substitui a AD-027
repetindo as partes 1, 3 e 4 e trocando a 2 pela lista única) e a AD-027 passa a `superseded by AD-NNN`. Fecha o passo 0
com o gate de build.
**Where**: `.specs/STATE.md`
**Depends on**: T8, T9
**Reuses**: texto da AD-NNN em "Tech Decisions" do design
**Requirement**: RCP-01

**Done when**:

- [ ] AD-NNN gravada e AD-027 marcada; `validate_state.py` sem erro
- [ ] Gate verde; smokes do passo 0 (`evolution`, `boss-chest`, `weapon-`, `shop`, `shop-axes`) verdes e iguais

**Tests**: none
**Gate**: build
**Commit**: `docs(state): record the single recipe list decision`

---

### Phase 3: Passo 1 — combo no item e na run, regra pura

#### T11: a técnica do slot carrega um combo

**What**: `Loadout` ganha `private readonly combos = new Map<TechId, RecipeId>()`, `comboOf(id)` e `setCombo(id,
recipe)` (só com a técnica equipada; senão ignora); `clear(slot)` apaga o combo do id que sai; `equip(slot, id)` por cima
de outro id apaga o do anterior (o Roxo entrando no slot do Azul apaga o do Azul); `reset()` apaga todos. O `recipeView`
passa a ler `comboOf('tecnica', id)` do `loadout.comboOf` (1 linha).
**Where**: `src/core/loadout.ts`, `src/core/recipeView.ts`
**Depends on**: T1
**Reuses**: F30/F35 `Loadout.clear`, `equip`, `reset`
**Requirement**: RCP-03, RCP-04, CGL-05, CGL-06

**Done when**:

- [ ] `tests/core/loadout.test.ts`: `setCombo` em técnica equipada e ignorado fora do slot; `clear` apaga; `equip` por
      cima apaga o anterior e mantém o de outro slot; `reset` apaga todos
- [ ] `tests/core/recipeView.test.ts`: `comboOf('tecnica')` lê o combo gravado
- [ ] Gate verde; contagem informada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): let a slot technique carry one combo`

---

#### T12: receita feita, id de opção e teto dos Duos

**What**: em `core/evolution.ts` nascem `recipeDone(r, view, duos)` (resultado equipado; ou a principal carrega esta
receita; ou o Duo está no conjunto da run), `duoEligible(r, view, duosDone)` (`duosDone < COMBO.duoCap &&
recipeReady`) e `recipeOptionId(r)` (`` `${r.type}:${r.id}` ``).
**Where**: `src/core/evolution.ts`
**Depends on**: T11, T4
**Reuses**: `assignPieces`/`recipeReady` da T4
**Requirement**: DUO-01, DUO-02, DUO-03

**Done when**:

- [ ] `tests/core/duo.test.ts` novo com um Duo sintético (talento `contraAfiado` 1 + técnica `'*'` 3): pronto com uma
      técnica Nv 3, não com Nv 2 (L-010); o curinga não casa com outra peça de técnica da receita; 3 Duos feitos →
      igual ao `recipeReady`, 4 → falso; `readyRecipes` nunca devolve Duo; o `RECIPES` não tem Duo
- [ ] `tests/core/evolution.test.ts`: `recipeDone` com o Roxo equipado, com a arma carregando a receita e falso com as
      peças prontas; `recipeOptionId` = `uniao:roxo` e `evolucao:laminaDividida`
- [ ] Gate verde; contagem informada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add recipe done, option ids and the duo cap`

---

#### T13: `ComboRun`, reveladas e Duos da run

**What**: `core/grimoire.ts` nasce com `class ComboRun`: `reveal(id)`, `revealed: ReadonlySet<RecipeId>`, `addDuo(id)`,
`duos`, `get duosDone`, `reset()`. O resto do Grimório entra na T55.
**Where**: `src/core/grimoire.ts` (novo)
**Depends on**: T2
**Reuses**: —
**Requirement**: GRM-03, CGL-06

**Done when**:

- [ ] `tests/core/grimoire.test.ts` novo: `reveal` repetido guarda uma vez; `addDuo` soma `duosDone`; `reset` zera os
      dois
- [ ] Gate verde; contagem informada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): keep revealed recipes and duos per run`

---

#### T14: `parseEvoParam` para qualquer receita

**What**: `core/comboParam.ts` com `parseEvoParam(raw, list = RECIPES): RecipeId[]`: separa por vírgula, tira espaço,
mantém a ordem e só os ids da lista que não são Duo; id desconhecido some; repetido fica (o 2º não estará pronto e é
ignorado na aplicação).
**Where**: `src/core/comboParam.ts` (novo)
**Depends on**: T2
**Reuses**: molde do `parseBranchParam` (F30 `axisParam.ts`)
**Requirement**: CDB-01

**Done when**:

- [ ] `tests/core/comboParam.test.ts` novo: `null` e `''` → `[]`; desconhecido some; ordem mantida; espaço tirado;
      repetido fica; Duo de uma lista sintética some
- [ ] Gate verde; contagem informada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): parse the evo debug parameter for any recipe`

---

#### T15: páginas de ponto passam de técnica e páginas na frente da fila

**What**: `ChoiceQueue` ganha `transferPoints(de, para)` (as páginas `ponto` pendentes de `de` passam a `para`; as de
`ramo`/`despertar` ficam para o `dropItem` que vem logo depois) e `addFront(reqs)` (põe as páginas na frente, na ordem
dada).
**Where**: `src/core/choice.ts`
**Depends on**: None
**Reuses**: F33/F35 `ChoiceQueue`, `dropItem`
**Requirement**: UNI-03, UNI-05

**Done when**:

- [ ] `tests/core/choice.test.ts`: página de ponto do Desmantelar passa à Ressonância e a de ramo sai pelo `dropItem`
      seguinte; `addFront` com 2 páginas as põe na frente na ordem; fila vazia aceita os dois
- [ ] Gate verde; contagem informada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): move pending point pages and queue pages first`

---

### Phase 4: Passo 1 — loja e baú, regra pura

#### T16: linhas da carta de receita

**What**: `core/recipePreview.ts` com `recipeKindLine(r)` (`União`, `Evolução`, `Duo`) e `recipeLines(r, ctx: { inherit;
refund; voids })` (por ora só a União com `into`: `herda <N> pontos`; a T30 soma `+1 vaga, devolve <n>`, a T56 soma
`anula` e o `grimoireLine`). As linhas são pedidas a cada `Shop.view()` com a vista do momento, nunca guardadas no
sorteio (OFR-07).
**Where**: `src/core/recipePreview.ts` (novo)
**Depends on**: T12
**Reuses**: F33 `unionInheritance`, texto `herda` do RXO-12
**Requirement**: OFR-07

**Done when**:

- [ ] `tests/core/recipePreview.test.ts` novo: `União`/`Evolução`; `herda 3 pontos`; a linha com o maior `N`
      (`UNION_INHERIT_CAP`) tem até 20 caracteres
- [ ] Gate verde; contagem informada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add recipe card lines`

---

#### T17: todas as prontas nas cartas 0 a k − 1

**What**: o `drawCards` põe as entradas `evolution` prontas, na ordem do `RECIPES`, até `COMBO.maxShop` (2), nas cartas
0 a k − 1; com 3 ou mais prontas, `shopRecipes(ready, round)` mostra as 3 primeiras menos a de índice `round % 3`, na
ordem da lista (OFR-02); com k = 0, a carta 0 do CRD-02 como na F30; a carta de item novo da F35 (POL-06) na carta
`max(k, 1)`; o resto pelo sorteio por peso (a carta 3 é sempre de sorteio); o reroll mantém as receitas nas cartas 0 a
k − 1 e sorteia só as outras; com k ≤ 1 a ordem dos sorteios é a de hoje. O `DrawContext` ganha `round` e aceita
`recipes` (padrão `RECIPES`) para o teste injetar uma lista sintética.
**Where**: `src/core/shopDraw.ts`
**Depends on**: T6, T12
**Reuses**: F30 `drawCards`, F35 regra de item novo
**Requirement**: OFR-01, OFR-02, OFR-03, OFR-09, DUO-03

**Done when**:

- [ ] Teste (`shopDraw.test.ts`, ou `comboShop.test.ts` se ele passar de 380): Roxo e Lâmina Dividida prontos → cartas 0
      e 1 nessa ordem e carta 2 de item novo; lista sintética com 3 prontas A, B, C → B e C na r6, A e C na r7, A e B
      na r8, carta 2 de item novo e carta 3 de sorteio; com 4 prontas → o rodízio só entre as 3 primeiras (OFR-02);
      reroll mantém as receitas; sem receita → carta 0 do CRD-02 (OFR-09); com 1 pronta, as seeds de
      hoje dão as mesmas cartas; Duo sintético pronto nunca vira carta
- [ ] Smokes `shop`, `shop-axes` e `shop-progress` iguais
- [ ] Gate verde; contagem informada

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(shop): offer every ready recipe in the first cards`

---

#### T18: compra da receita recusada quando deixou de valer

**What**: `BuyContext.applyEvolution` vira `applyRecipe?(id: RecipeId)` (o `shopDirector` só troca o nome, com o mesmo
corpo, até a T22); `Shop.buy` recusa a entrada `evolution` cuja receita não está pronta na vista do momento (`reason:
'item'`, sem cobrar); o `view` dá `frame: 'grey'` e a linha de nível `FORA DA BUILD` (ABD-07), recalculados a cada
`view()` com a vista do momento (OFR-07); o preço continua o `cardCost` = `round(60 × inflação)`.
**Where**: `src/core/shop.ts`
**Depends on**: T17
**Reuses**: F35 `Shop.buy` com `reason: 'item'`, `frame: 'grey'`; F30 `cardCost`
**Requirement**: OFR-05, OFR-06

**Done when**:

- [ ] Teste (`comboShop.test.ts` ou `shopDraw.test.ts`): Lâmina Dividida comprada depois de abandonar as Faixas na mesma
      loja → recusada, carteira igual, carta cinza com `FORA DA BUILD`; Roxo e Lâmina comprados em qualquer ordem →
      aceitos; preço da receita na r6 = `round(60 × 1,3)` = 78
- [ ] Smokes `shop`, `evolution` e `weapon-` verdes
- [ ] Gate verde; contagem informada

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(shop): refuse a recipe card that stopped being ready`

---

#### T19: carta de receita com `União`/`Evolução` e moldura dourada

**What**: no `shopPreview` a carta de receita usa `levelText = recipeKindLine(r)` e `preview = recipeLines(r, ...)`
(`herda <N> pontos` no Roxo pelo `unionInheritance` das peças de agora); toda carta de receita tem moldura dourada pelo
`frameFor`; a carta recusada da T18 fica cinza. Sai o texto `Funde as duas técnicas...` (`src/core/shopPreview.ts`, a
carta `evolution` de hoje).
**Where**: `src/core/shopPreview.ts`
**Depends on**: T16, T18
**Reuses**: F30 `previewText`, F35/F36 `frameFor`
**Requirement**: OFR-06, OFR-07

**Done when**:

- [ ] `tests/core/shopPreview.test.ts`: Roxo → `União` e `herda 3 pontos` com 3 pontos no Vermelho além do Nv 4; Lâmina
      Dividida → `Evolução`; moldura dourada nas duas e cinza na recusada
- [ ] Smokes `shop`, `evolution` e `weapon-` verdes (se um smoke lia o texto antigo, ele acompanha citando o OFR-07)
- [ ] Gate verde; contagem informada

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(shop): show recipe kind and inheritance on the recipe card`

---

#### T20: baú com toda receita pronta

**What**: `drawChest(candidates, rng)` põe as receitas prontas (até `COMBO.maxChest`, na ordem da lista) forçadas, sorteia
as outras opções do BAU-01 pelo `rng` até 3 e embaralha a ordem final pelo `rng`. O formato das opções (`uniao`/`arma`)
fica até a T21.
**Where**: `src/core/bossChest.ts`
**Depends on**: T7, T12
**Reuses**: F33 `drawChest`, F31 `chestRng`
**Requirement**: OFR-02, OFR-04, DUO-03

**Done when**:

- [ ] `tests/core/bossChest.test.ts`: 2 prontas e "2 pontos" → as 3; lista sintética com 3 prontas → só elas; com 4 → as
      3 primeiras; 1 pronta e 4 outras → a receita sempre e 2 outras pelo `rng`; ordem pelo `rng` com seed fixa; Duo
      sintético nunca entra
- [ ] Smoke `boss-chest` verde (se a seed do smoke passar a dar outra opção, o smoke acompanha citando o OFR-04)
- [ ] Gate verde; contagem informada

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(chest): offer every ready recipe in the boss chest`

---

#### T21: opção `receita` do baú com ids `uniao:`/`evolucao:`

**What**: `ChestOption` troca `{ kind: 'uniao'; into }` e `{ kind: 'arma'; id }` por `{ kind: 'receita'; id: RecipeId }`;
`chestOptionId` usa o `recipeOptionId`; o `choicePages` monta a opção `receita` com o nome, `recipeKindLine` e
`recipeLines`; o `choiceDirector` troca os dois ramos por um ramo `receita` que despacha como hoje (com `into` pelo
`build.axes.applyUnion`, arma pelo `arsenal.weapon.evolve`), até a T23. Os smokes `boss-chest` e `weapon-` passam a ler
`evolucao:<id>` e `uniao:roxo` (CDB-03).
**Where**: `src/core/bossChest.ts`, `src/core/choicePages.ts`, `src/scenes/test/choiceDirector.ts`
**Depends on**: T16, T20
**Reuses**: F33 `buildPage`, `confirm`; F36 opção `arma:<id>`
**Requirement**: CDB-03, OFR-07

**Done when**:

- [ ] `tests/core/bossChest.test.ts`: ids `uniao:roxo` e `evolucao:laminaDividida`; teste do `choicePages`: opção do Roxo
      com `União` e `herda <N> pontos`, da Lâmina com `Evolução`
- [ ] `grep -rn "arma:" scripts/smoke src` sem leitura do id antigo
- [ ] Smokes `boss-chest`, `weapon-` e `choice-panel` verdes
- [ ] Gate verde; contagem informada

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(chest): name recipe options by union and evolution ids`

---

### Phase 5: Passo 1 — todas as prontas no jogo

#### T22: `ComboDirector` aplica qualquer receita

**What**: `scenes/test/comboDirector.ts` nasce como campo `combos` do `BuildDirector`: `view()` (substitui o
`BuildDirector.recipeView()` da T5; os chamadores passam a `combos.view()`), `ready()`, `apply(id, source, paid)`
(reconfere `recipeReady`; não pronta → `{ ok: false }` e `comboDenied:<id>`; com `into` → `build.axes.applyUnion(into)`
com herança e `evolve:<id>`; Evolução de arma → `arsenal.weapon.evolve(id)` com `weaponEvolved:<id>`; Evolução de
técnica → `loadout.setCombo(pieces[0].id, id)`; União sem `into` → `{ ok: false }` até a T33; depois de aplicar,
`stats.sync()`, `run.reveal(id)` e `combo:<id>`), `reset()` e `snapshot()`. O `BuildDirector.reset` chama
`combos.reset()`. O `shopDirector.applyRecipe` passa a chamar `combos.apply(id, 'shop', preço)`, com o livro pela
`ledgerKeyOf` e o `openUnion` da F33 quando `inherited ≥ 1`.
**Where**: `src/scenes/test/comboDirector.ts` (novo), `src/scenes/test/buildDirector.ts`, `src/scenes/test/shopDirector.ts`
**Depends on**: T11, T13, T18, T19
**Reuses**: F33 `axisDirector.applyUnion`, `choice.openUnion`; F36 `WeaponDirector.evolve`, `ledgerKeyOf`
**Requirement**: CGL-01, CGL-03, CGL-05, CGL-06, UNI-01, OFR-05

**Done when**:

- [ ] Comprar o Roxo na loja emite `combo:roxo` e `evolve:roxo` e mantém o RXO-02/RXO-12; comprar a Lâmina Dividida emite
      `combo:laminaDividida` e `weaponEvolved:laminaDividida`; abandonar a Lâmina evoluída devolve 40% com o preço da
      receita no livro (CGL-05); lidos do snapshot vivo
- [ ] Smokes `evolution`, `weapon-`, `shop` e `run-loop` verdes
- [ ] Gate verde; contagem informada

**Tests**: smoke
**Gate**: full
**Commit**: `feat(build): apply every recipe through the combo director`

---

#### T23: baú do chefe pelo `ComboDirector`

**What**: o `choiceDirector.queueBossChest` monta as opções com `combos.ready()`; o `confirm` da opção `receita` chama
`combos.apply(id, 'chest', 0)` e devolve `inherited` páginas `heranca` (F33); sai o despacho próprio da T21.
**Where**: `src/scenes/test/choiceDirector.ts`
**Depends on**: T22, T21
**Reuses**: F33 `confirm`, páginas `heranca`
**Requirement**: OFR-04, OFR-05, CDB-03

**Done when**:

- [ ] Confirmar a receita no baú não gasta fragmento e emite `combo:<id>`; escolher outra opção deixa a receita na loja
      da mesma konbini (edge case)
- [ ] Smokes `boss-chest`, `weapon-` e `choice-panel` verdes
- [ ] Gate verde; contagem informada

**Tests**: smoke
**Gate**: full
**Commit**: `feat(chest): confirm recipe options through the combo director`

---

#### T24: `evo=` para qualquer receita

**What**: `combos.applyDebug()` (`parseEvoParam(params.evo)` e `apply(id, 'debug', 0)` em ordem) roda no fim do
`BuildDirector.applyDebugAxes`, no lugar do `arsenal.applyDebugEvolution()` da F36, que sai do `arsenalDirector`; o Roxo
do debug põe as `heranca` na frente da fila pelo `choice.addFront`. A tarefa confere onde o `domain=` roda: se for depois
do `applyDebugAxes`, o `applyDebug()` vai logo depois dele (CDB-01; design, risco da ordem do `domain=`).
**Where**: `src/scenes/test/comboDirector.ts`, `src/scenes/test/buildDirector.ts`, `src/scenes/test/arsenalDirector.ts`
**Depends on**: T22, T14, T15
**Reuses**: F36 `applyDebugEvolution` (substituído)
**Requirement**: CDB-01

**Done when**:

- [ ] `evo=laminaDividida` com a Lâmina Nv 4 e as Faixas aplica a evolução no reset; `evo=xyz` e receita não pronta não
      mudam nada; `evo=roxo` deixa as páginas `heranca` na 1ª konbini (edge case); lidos do snapshot
- [ ] Smokes `weapon-` e `evolution` verdes
- [ ] Gate verde; contagem informada

**Tests**: smoke
**Gate**: full
**Commit**: `feat(debug): apply any ready recipe from the evo parameter`

---

#### T25: `combos` e `combo` no snapshot

**What**: `game/buildSnapshot.ts` ganha `ComboSnapshot { ready; done; revealed }` (listas de `recipeOptionId`; `ready`
sem teto, na ordem da lista) e o campo `combos` do `build.snapshot()` (montado pelo `combos.snapshot()`);
`techBuildSnapshot` ganha `combo: loadout.comboOf(id)`; `debugApi.ts` ganha o tipo do campo.
**Where**: `src/game/buildSnapshot.ts`, `src/game/axisSnapshot.ts`, `src/game/debugApi.ts`
**Depends on**: T22, T12
**Reuses**: F33 `techBuildSnapshot`, F35 `buildSnapshot`
**Requirement**: CDB-02

**Done when**:

- [ ] `tests/game/debugApi.test.ts`: literal com `combos` e `build.<técnica>.combo`
- [ ] Smokes `boot` e `evolution` verdes
- [ ] Gate verde; contagem informada

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(debug): report ready, done and revealed combos`

---

#### T26: `combos.smoke`, cena das duas prontas

**What**: `scripts/smoke/combos.smoke.mjs` nasce (`?debug&hd=1&area=modular`) com a cena 1 do design:
`tech=azul,vermelho&axes=vermelho.potencia:3&arsenal=lamina,faixas&axes=lamina.corte:2,lamina.fio:1&round=6&fragments=300`
→ `combos.ready` = `['uniao:roxo', 'evolucao:laminaDividida']` e nenhum item com `combo` antes da compra (CGL-01); cartas
0 e 1 nessa ordem com moldura dourada; com o baú (`chest=1`), as duas opções lá; comprar a Lâmina e depois o Roxo → os
dois em `combos.done`, eventos `combo:laminaDividida` e `combo:roxo`; `evo=xyz` não muda nada. Fecha o passo 1.
**Where**: `scripts/smoke/combos.smoke.mjs` (novo)
**Depends on**: T23, T24, T25
**Reuses**: `scripts/smoke/fight-kit.mjs`, `lib.ts`; cenas do `evolution.smoke.mjs` e do `boss-chest.smoke.mjs`
**Requirement**: OFR-01, OFR-06, UNI-01, CGL-01, CGL-03

**Done when**:

- [ ] `npm run smoke -- combos` verde
- [ ] Gate verde; smokes do passo 1 (`combos`, `evolution`, `boss-chest`, `weapon-`, `shop`, `shop-axes`,
      `shop-progress`, `run-loop`, `choice-panel`) verdes

**Tests**: smoke
**Gate**: build
**Commit**: `test(smoke): offer two ready recipes side by side`

---

### Phase 6: Passo 2 — Ressonância Cortante, regra pura

#### T27: receita `ressonanciaCortante`

**What**: `RecipeId` ganha `ressonanciaCortante`; o `RECIPES` ganha a receita na 2ª posição (União sem `into`:
`ressonancia` 4, `corte` 1; nome `Ressonância Cortante`, texto e dica `Cortante` do design); nasce
`COMBO_AXIS_NAMES = { ressonanciaCortante: { pregos: 'Cortes' } }`. A entrada da loja entra na T33.
**Where**: `src/data/evolutions.ts`
**Depends on**: T3
**Reuses**: "Data Models" do design
**Requirement**: RCP-05, RCP-06, NOM-05

**Done when**:

- [ ] `tests/data/combos.test.ts`: RCP-05 com 5 receitas na ordem; NOM-01 a NOM-03 verdes com a nova
- [ ] `tests/core/evolution.test.ts`: Ressonância Nv 3 com o Desmantelar → não pronta, Nv 4 → pronta (RCP-06);
      `consumedTechniques` = `['corte']`
- [ ] A linha da Ressonância Cortante na tabela "Regra de combo" da spec confere com o texto da receita (NOM-05)
- [ ] Gate verde; contagem informada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(data): add the cutting resonance union`

---

#### T28: rajada de cortes, regra pura

**What**: `core/resonanceCut.ts` com `cortantePlan(n)` (corte `i` em `i × COMBO.cortante.gapMs`, ângulo `[20, −25,
70][i mod 3]`), `class CortanteVolley(n)` (`update(dtMs)` devolve os índices vencidos uma vez cada, o corte 0 no 1º
`update`; `left`; `done`), `cortanteRect(center, facing)` (de `COMBO.cortante.nearPx` = 0, o centro do player, ao longe
de 180 px do `TECH_GEOMETRY.corte` da F30 a 0 ponto, altura 48, sem ler o `AxisBuild`), `cortanteTargets(rect, targets)`
(`rectsTouch`, bordas inclusas), `cortanteMarkCap(n)` = `floor(n / 2)` e `class CortanteMarks` (marcas que a rajada pôs
em cada alvo; `mayMark(id)`).
**Where**: `src/core/resonanceCut.ts` (novo)
**Depends on**: None
**Reuses**: F33 `cutPlan`, `rectsTouch`; F30 `TECH_GEOMETRY.corte`; `src/core/cut.ts:21-37`
**Requirement**: CRT-01, CRT-02, CRT-09

**Done when**:

- [ ] `tests/core/resonanceCut.test.ts` novo: 4 cortes a 0/60/120/180 ms com ângulos 20/−25/70/20; nos dois `facing` o
      retângulo vai de 0 a 180 px à frente com altura 48; caixa com a borda perto em 0 e em 180 px tocada, toda atrás
      do centro (a −1 px) e com a borda perto a 181 não (L-010); `cortanteMarkCap` 1/2/2/3 para n 3/4/5/6; 2 comuns na
      faixa com 4 cortes → 4 toques e `mayMark` falso no 3º; CRT-09: para n de 3 a 6, 1 alvo → menos de n marcas e 3
      alvos → no máximo 1,5 × n; `update` com passo grande devolve todos os vencidos uma vez
- [ ] Gate verde; contagem informada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): plan the cutting resonance volley`

---

#### T29: `ResonanceState` com cortes que cravam marca

**What**: `ResonanceState` ganha `cutsLeft = 0`, `throwCuts(n)` (só na fase `ready`: vai a `armed` com `cutsLeft = n`, sem
prego, devolve o custo), `cutStick(target, point, targets)` (chama o `stick` privado: evento `nail` com o dano do prego,
marca e Grampo), `cutGraze(target)` (o evento `nail` com o dano do prego, sem marca nem Grampo) e `cutDone()`
(desconta 1); `nextTap` só detona com `cutsLeft === 0`; a recarga começa com
`nails.length === 0 && cutsLeft === 0 && marks.size === 0`; `reset` e fim de detonação zeram `cutsLeft`. Nenhuma outra
regra muda.
**Where**: `src/core/resonance.ts`
**Depends on**: T28
**Reuses**: F34 `ResonanceState.stick`, `nextTap`, `update`
**Requirement**: CRT-02, CRT-03, CRT-04, CRT-05

**Done when**:

- [ ] Casos novos no `tests/core/resonanceCut.test.ts` (o `resonance.test.ts` da F34 não cresce se passar de 380):
      `nextTap` dá `none` com `cutsLeft > 0` em toda a rajada (L-020); `cutStick` com o ramo do Grampo emite o
      `grampo`; rajada sem marca → recarga depois do último `cutDone` (CRT-05); marca do corte conta na Coroa e no
      Boneco como a do prego (CRT-03); `cutGraze` não muda `marksOn` nem emite `grampo`
- [ ] `src/core/resonance.ts` abaixo de 380 efetivas (design, risco da Ressonância)
- [ ] Smoke `resonance` igual
- [ ] Gate verde; contagem informada

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(core): let resonance cuts place marks`

---

#### T30: linha `+1 vaga, devolve <n>`

**What**: `recipeLines` da União sem `into` devolve `+1 vaga, devolve <n>`, `n` o `refund` do contexto (ABD-02 sobre o
livro da técnica que sai).
**Where**: `src/core/recipePreview.ts`
**Depends on**: T27, T16
**Reuses**: F35 `SpentLedger.refund`
**Requirement**: OFR-07

**Done when**:

- [ ] `tests/core/recipePreview.test.ts`: Ressonância Cortante com `refund` 0 → `+1 vaga, devolve 0`; com `n` = 999 a
      linha tem 20 caracteres (o maior `n` da leva 1 tem 3 dígitos)
- [ ] Gate verde; contagem informada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): show the freed slot refund on keep-unions`

---

#### T31: nome e eixo do item com combo

**What**: `core/comboLabel.ts` com `itemLabel(kind, id, base, view)` (o `name` da receita que o item carrega, ou `base`) e
`axisLabel(item, axis, combo)` (`COMBO_AXIS_NAMES[combo]?.[axis]` ou o nome do `AXIS_ITEMS`).
**Where**: `src/core/comboLabel.ts` (novo)
**Depends on**: T27
**Reuses**: F33 `AXIS_ITEMS`
**Requirement**: CGL-04, CRT-07

**Done when**:

- [ ] `tests/core/comboLabel.test.ts` novo: `itemLabel` com e sem combo; `axisLabel('ressonancia', 'pregos',
      'ressonanciaCortante')` = `Cortes`, sem combo = o nome do registro
- [ ] Gate verde; contagem informada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): name items and axes by the combo they carry`

---

### Phase 7: Passo 2 — União que libera vaga na build

#### T32: `removeTechnique` extraído do Abandonar

**What**: o corpo do abandono de técnica do `trayDirector` vira `removeTechnique(id, pointsTo?): number` (devolução
`floor(0,4 × gasto)` na carteira, livro limpo, `loadout.clear`, `choice.transferPoints(id, pointsTo)` quando houver e
`dropItem`); o `abandon` chama ele e emite o `abandon:<item>:<n>` de hoje. Refatoração: comportamento igual.
**Where**: `src/scenes/test/trayDirector.ts`
**Depends on**: T15
**Reuses**: F35 `trayDirector.abandon`, `SpentLedger`
**Requirement**: UNI-03, UNI-04

**Done when**:

- [ ] Smokes `build-bar` e `talents` (abandono) iguais
- [ ] Gate verde; contagem igual

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(tray): extract technique removal from abandon`

---

#### T33: Ressonância Cortante aplicada, vaga liberada

**What**: `ComboDirector.applyKeepUnion(r)`: `slot = loadout.slotOf(outra)`; `n = build.tray.removeTechnique(outra,
principal)`; `mastery.resetSlot(slot)` (as marcas por `TechId` ficam); `loadout.setCombo(principal, id)`; evento
`uniaoRefund:<id>:<n>`; o ramo "União sem `into`" do `apply` passa a chamá-lo. `data/shop.ts` ganha a entrada da
Ressonância Cortante no fim do `GAME_SHOP_CATALOG` (OFR-08).
**Where**: `src/scenes/test/comboDirector.ts`, `src/data/shop.ts`
**Depends on**: T32, T22, T27, T30
**Reuses**: `removeTechnique` da T32
**Requirement**: UNI-02, UNI-03, UNI-04, UNI-05, UNI-06, OFR-08

**Done when**:

- [ ] Com `tech=ressonancia,corte&axes=ressonancia.pregos:2,ressonancia.detonacao:1&round=6`: carta 0 com `+1 vaga,
      devolve 0`; comprada, o slot do Desmantelar vazio, `build.pool.used` cai 1, a Ressonância no mesmo slot com os 3 pontos,
      ramo e maestria, `build.ressonancia.combo` = `ressonanciaCortante`, `uniaoRefund:ressonanciaCortante:0` (lidos do
      snapshot vivo, num cenário provisório do `combos.smoke` que a T40 completa)
- [ ] `tests/data/shop.test.ts`: entradas de antes na mesma posição e a nova no fim
- [ ] Smokes `combos`, `shop` e `choice-panel` verdes
- [ ] Gate verde; contagem informada

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(build): fuse resonance and dismantle into one slot`

---

#### T34: `BuildBar` e Abandonar com o nome do combo

**What**: o `TrayItem` de slot e de arma do `buildTray` ganha `combo: RecipeId | null`; o rótulo da faixa e a pergunta do
Abandonar usam `itemLabel`.
**Where**: `src/core/buildTray.ts`
**Depends on**: T31
**Reuses**: F35 `trayItems`, `buildBarText`
**Requirement**: CGL-04

**Done when**:

- [ ] `tests/core/buildTray.test.ts`: item com `ressonanciaCortante` rotulado `Ressonância Cortante` na faixa e na
      pergunta; sem combo, o nome de hoje
- [ ] Gate verde; contagem informada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(tray): name a combo item by its recipe`

---

#### T35: carta de melhoria com o nome do combo e o eixo `Cortes`

**What**: no `shopPreview` o nome da carta de melhoria sai do `itemLabel` e a linha de eixo do `axisLabel` (a Ressonância
com o combo mostra `Cortes` no eixo Pregos).
**Where**: `src/core/shopPreview.ts`
**Depends on**: T31
**Reuses**: F30 `axisPreview`
**Requirement**: CGL-04, CRT-07

**Done when**:

- [ ] `tests/core/shopPreview.test.ts`: carta de ponto da Ressonância com o combo → nome `Ressonância Cortante` e eixo
      `Cortes`; sem o combo, igual a hoje
- [ ] Gate verde; contagem informada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(shop): label combo items and renamed axes on upgrade cards`

---

#### T36: páginas do painel com o nome do combo e o eixo `Cortes`

**What**: no `choicePages` o título das páginas de ponto, ramo e Despertar e a linha de eixo usam `itemLabel` e
`axisLabel`.
**Where**: `src/core/choicePages.ts`
**Depends on**: T31
**Reuses**: F33 `buildPage`
**Requirement**: CGL-04, CRT-07

**Done when**:

- [ ] Teste do `choicePages`: página de ponto livre da Ressonância com o combo → título `Ressonância Cortante` e eixo
      `Cortes`; sem o combo, igual a hoje
- [ ] Gate verde; contagem informada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(choice): label combo items and renamed axes on pages`

---

#### T37: marca do combo no ícone

**What**: `game/comboMark.ts` com `drawComboMark(g, x, y)` (losango de 5 px na chave `u` da `PALETTE`, contorno `k`, no
canto superior esquerdo do ícone; a borda dourada do Despertar fica no contorno inteiro); a `BuildBar` e o
`TechSlotsHud` desenham a marca no item com `combo`.
**Where**: `src/game/comboMark.ts` (novo), `src/game/BuildBar.ts`, `src/game/TechSlotsHud.ts`
**Depends on**: T34
**Reuses**: F35 `BuildBar`, `TechSlotsHud`; `art/palette.ts`
**Requirement**: CGL-04

**Done when**:

- [ ] O `debug()` da `BuildBar` e do `TechSlotsHud` diz `comboMark: true` no item com combo e `false` nos outros (L-055)
- [ ] Captura em HD com a Ressonância Cortante e um Despertar: a marca e a borda dourada se distinguem
- [ ] Smokes `build-bar` e `hud` verdes
- [ ] Gate verde; contagem informada

**Tests**: smoke
**Gate**: full
**Commit**: `feat(hud): mark combo items on the build bar and slots`

---

### Phase 8: Passo 2 — Ressonância Cortante na luta

#### T38: `CortanteRunner`, a rajada no mundo

**What**: `game/tech/resonanceCortante.ts` com `class CortanteRunner(ports: { cut(center, dir, angle, rect) })`:
`start(state, facing)` (`state.throwCuts(state.stats.nails)`, nova `CortanteVolley`, guarda o `facing` do `release`),
`update(dtMs, playerCenter, targets)` (para cada corte vencido: `cortanteRect`, `ports.cut`, `cortanteTargets` e, em
cada alvo, uma vez por corte, `state.cutStick` se `CortanteMarks.mayMark(id)`, senão `state.cutGraze`; e
`state.cutDone()`; devolve os eventos), `active` e `reset()`. Só `import type` de `phaser`.
**Where**: `src/game/tech/resonanceCortante.ts` (novo)
**Depends on**: T29
**Reuses**: `core/resonanceCut.ts` (T28)
**Requirement**: CRT-01, CRT-02, CRT-06

**Done when**:

- [ ] `tests/game/resonanceCortante.test.ts` novo (L-043): porta falsa recebe o retângulo e o ângulo de cada corte com o
      centro do player do quadro e o `facing` do `release` (virar no meio da rajada não muda o lado); com 5 cortes, um
      alvo tocado pelos 5 recebe 2 marcas e 5 eventos `nail` (3 pelo `cutGraze`)
- [ ] Gate verde; contagem informada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(tech): run the cutting resonance volley`

---

#### T39: Ressonância troca pregos por cortes com o combo

**What**: no `game/tech/resonance.ts`, o `techCast:ressonancia` com `ctx.loadout.comboOf('ressonancia') ===
'ressonanciaCortante'` chama `cortante.start(state, facing)` no lugar do `throwNails`; a cada quadro, com
`cortante.active`, monta os alvos (comuns vivos e o chefe) e repassa os eventos ao `resonanceHits` como os do prego (o
`nail` vira `micro` de 3 escalado); `CutFx.cut` desenha cada corte; `objects()` sem prego; `state()` ganha `cortante`.
**Where**: `src/game/tech/resonance.ts`
**Depends on**: T38
**Reuses**: F34 `resonanceHits`, F33 `CutFx.cut`, F34 `ResonanceFx` (cabeça de prego do RSN-13)
**Requirement**: CRT-01, CRT-02, CRT-06

**Done when**:

- [ ] Com `evo=ressonanciaCortante&maxAlive=3`: 1º toque sem `techObjects` de prego, `techState.ressonancia.cortante`
      `true`, 2 marcas em cada comum perto, inclusive o colado no player, `CutFx.debug().lastRect` com largura 180,
      altura 48 e borda perto no centro do player, nos dois lados (L-074)
- [ ] Conferido no jogo em HD, parado e correndo, para os dois lados
- [ ] Smokes `resonance` e `tech` verdes
- [ ] Gate verde; contagem informada

**Tests**: smoke + conferência
**Gate**: full
**Commit**: `feat(tech): swap resonance nails for marking cuts with the union`

---

#### T40: `combos.smoke`, cenas da Ressonância Cortante

**What**: o `combos.smoke.mjs` ganha a cena 2 do design completa (compra na loja; Desmantelar volta como técnica nova e a
receita não fica pronta de novo; carta de técnica nova elegível com o pool cheio (UNI-06); abandonar a Ressonância →
`combo` nulo e a devolução conta o preço da receita (CGL-05); `BuildBar` com `Ressonância Cortante` e a marca) e a cena 3
(luta: aperto durante a rajada sem evento em toda a janela (L-020, CRT-04, CGL-02); 2º toque → `resonanceDetonate:6`
(Pregos 2, N = 5, teto 2 por comum); com `ramo=ressonancia:a`, o Grampo sai num corte; corte no chefe marca e o Boneco funciona nele). Mede a
largura dos nomes longos na carta e na faixa (decisão do usuário). Conferência em movimento, em HD, contra 3 comuns e o
chefe (CRT-08). Fecha o passo 2.
**Where**: `scripts/smoke/combos.smoke.mjs`
**Depends on**: T39, T26, T33, T35, T36, T37
**Reuses**: cenas da T26
**Requirement**: CRT-03, CRT-04, CRT-06, CRT-08, UNI-06, CGL-02, CGL-04, CGL-05

**Done when**:

- [ ] `npm run smoke -- combos` verde; arquivo abaixo de 380 linhas (senão as cenas de luta vão a
      `combos-fight.smoke.mjs`)
- [ ] Nome dos combos medido; se cortar, o executor parou e o usuário escolheu os nomes curtos antes do commit
- [ ] Conferido no jogo em HD, em movimento, dois lados
- [ ] Gate verde; smokes do passo 2 (`combos`, `resonance`, `build-bar`, `choice-panel`, `shop`, `tech-axes`, `hud`)
      verdes

**Tests**: smoke + conferência
**Gate**: build
**Commit**: `test(smoke): cover the cutting resonance union`

---

### Phase 9: Passo 3 — Punho Negro Divergente

#### T41: receita `punhoNegro`

**What**: `RecipeId` ganha `punhoNegro`; o `RECIPES` ganha a Evolução na 3ª posição (`divergente` 4, talento `zonaNegra`
1, eixo `divergente.alvos` 1; nome, texto e dica `P. Negro` do design); `data/shop.ts` ganha a entrada no fim do
catálogo.
**Where**: `src/data/evolutions.ts`, `src/data/shop.ts`
**Depends on**: T27
**Reuses**: `recipeEntry` (T8)
**Requirement**: RCP-05, RCP-06, OFR-08, NOM-05

**Done when**:

- [ ] `tests/data/combos.test.ts`: RCP-05 com 6 receitas; NOM verdes; `tests/data/shop.test.ts`: a nova no fim
- [ ] `tests/core/evolution.test.ts`: Divergente Nv 3 com a Zona Negra e 1 ponto em Alvos → não pronta, Nv 4 → pronta;
      sem a Zona Negra → não pronta; Nv 4 com 0 ponto em Alvos → não pronta; 1 ponto em Alvos no Concentrado → não
      pronta (RCP-06)
- [ ] A linha do Punho Negro na tabela "Regra de combo" confere com o texto (NOM-05)
- [ ] Gate verde; contagem informada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(data): add the black fist divergent evolution`

---

#### T42: alvos e multiplicador do Punho Negro

**What**: `core/blackFist.ts` com `kokusenTargets({ registered, mainId, press, blackFist })` (`press !== 'hit'` → `[]`;
sem o combo → `[mainId]`; com o combo → todos os registrados pelo 1º impacto, na ordem), `blackFistMul(base, on)` (`on ?
min(KOKUSEN.mulCap, base + COMBO.blackFistMul) : base`) e `ringWithoutKokusen(ring, kokusen)`.
**Where**: `src/core/blackFist.ts` (novo)
**Depends on**: None
**Reuses**: F35 `KOKUSEN.mulCap` (3,4)
**Requirement**: PND-01, PND-02, PND-04, PND-05

**Done when**:

- [ ] `tests/core/blackFist.test.ts` novo: 3 registrados e `hit` → 3; sem combo → só o principal; `miss` e `null` →
      nenhum; 1 registrado (Concentrado depois do combo, edge case) → 1; 2,5/2,8/3,1 → 2,8/3,1/3,4; 3,4 nunca vira 3,7 (L-010); anel sem quem leva
      Kokusen
- [ ] Gate verde; contagem informada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): pick black fist kokusen targets and multiplier`

---

#### T43: +0,3 no multiplicador pela folha da build

**What**: a entrada do `buildEffects` ganha `blackFist: boolean` e `kokusenMul = blackFistMul(min(KOKUSEN.mulCap, base da
Zona Negra), blackFist)`; a janela não muda; o `StatsDirector.update` passa `blackFist: loadout.comboOf('divergente') ===
'punhoNegro'` (+1 linha).
**Where**: `src/core/buildEffects.ts`, `src/scenes/test/statsDirector.ts`
**Depends on**: T42
**Reuses**: F35 `buildEffects` (BEF-03, BEF-04)
**Requirement**: PND-02, PND-03

**Done when**:

- [ ] `tests/core/buildEffects.test.ts`: com `blackFist` → 2,8 sem Zona Negra e com Zona Negra 1, 3,1 com 2, 3,4 com 3;
      janela igual com e sem `blackFist`
- [ ] Smoke `talents` verde
- [ ] Gate verde; contagem informada

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(build): add the black fist bonus to the kokusen multiplier`

---

#### T44: Kokusen secundário sem cinema de tela

**What**: `KokusenFx.burst(point, facing)` público (chama o `spawnSparksAndShock` privado, sem congelamento, cartão nem
zoom); `ImpactFx.onKokusen(..., primary = true)`: com `primary`, como hoje; senão `burst` e o número promovido a
`kokusen`; `onKokusen` do `TechPorts` e do `game/tech/shared.ts` ganha o `primary` (só a assinatura). Sem combo, nada
muda.
**Where**: `src/game/techFx/KokusenFx.ts`, `src/scenes/test/impactFx.ts`, `src/scenes/test/techPorts.ts`, `src/game/tech/shared.ts`
**Depends on**: None
**Reuses**: F29 `KokusenFx` (`:176`, `:294`), `impactFx.ts:104-108`
**Requirement**: PND-06

**Done when**:

- [ ] Smokes `kokusen` e `impact` iguais
- [ ] Gate verde; contagem informada

**Tests**: smoke
**Gate**: full
**Commit**: `feat(fx): add a secondary kokusen burst without the screen cinema`

---

#### T45: Kokusen em todo alvo do soco

**What**: no fim da espera do `divergentImpacts`, `ids = kokusenTargets({ registered, mainId, press, blackFist:
comboOf('divergente') === 'punhoNegro' })`; cada id vivo leva o 2º impacto como Kokusen (dano do ESC-02) e o evento
`kokusen`, com `primary = id === mainId`; o anel do Eco usa `ringWithoutKokusen`; `kokusen.land` e o hitstop uma vez por
conjuração. Antes de mexer, a tarefa acha onde a F31 soma o +15 do Domínio por Kokusen (DOM-02) e onde a F35 solta o anel
da Zona Negra Nv 3 (TAL-15): os dois passam a sair só do `primary` (ou do `kokusen.land`), e o anel pula quem levou
Kokusen na conjuração (PND-01).
**Where**: `src/game/tech/divergentImpacts.ts` (e a linha da F31/F35 que soma o Domínio ou solta o anel, se for fora dele)
**Depends on**: T42, T44
**Reuses**: F33 `divergentImpacts`
**Requirement**: PND-01, PND-05, PND-06

**Done when**:

- [ ] Com `tech=divergente&axes=divergente.alvos:3&perks=zonaNegra&evo=punhoNegro&maxAlive=3` e o aperto na janela: 3
      eventos `kokusen` no mesmo soco, 3 números `kokusen`, `ce.cur` sobe uma vez (L-036), a barra de Domínio (com
      `domain=santuario`) sobe 15 uma vez; com `perks=zonaNegra:3`, um anel só
- [ ] Conferido no jogo em HD, em movimento, dois lados
- [ ] Smokes `kokusen`, `tech` e `fight` verdes
- [ ] Gate verde; contagem informada

**Tests**: smoke + conferência
**Gate**: full
**Commit**: `feat(tech): land kokusen on every divergent target with black fist`

---

#### T46: `combos.smoke`, cena do Punho Negro

**What**: cena 4 do design: com o aperto → 3 Kokusen, 3 números, energia uma vez, `stats.kokusenMul` 2,8; sem o aperto →
nenhum Kokusen e nenhum efeito de combo em toda a janela (CGL-02, L-020); sem o `evo=` → 1 evento; abandonar a Zona
Negra depois → combo fica e `kokusenMul` 2,8 (edge case); com `axes=divergente.zona:3` no lugar de Alvos → `combos.ready`
sem `evolucao:punhoNegro` e o `evo=` ignorado (RCP-06). Fecha o passo 3.
**Where**: `scripts/smoke/combos.smoke.mjs`
**Depends on**: T41, T43, T45, T40
**Reuses**: cenas da T40
**Requirement**: PND-01, PND-02, PND-04, PND-06, RCP-06, CGL-02

**Done when**:

- [ ] `npm run smoke -- combos` verde
- [ ] Conferido no jogo em HD, em movimento, dois lados
- [ ] Gate verde; smokes do passo 3 (`combos`, `kokusen`, `talents`, `tech`, `fight`) verdes

**Tests**: smoke + conferência
**Gate**: build
**Commit**: `test(smoke): cover the black fist divergent evolution`

---

### Phase 10: Passo 4 — Vácuo de Troca, regra pura

#### T47: receita `vacuoDeTroca`

**What**: `RecipeId` ganha `vacuoDeTroca`; o `RECIPES` ganha a Evolução na 4ª posição (`boogie` 4, `azul` 1; nome, texto e
dica `Vácuo` do design); `data/shop.ts` ganha a entrada no fim do catálogo. Os casos de loja da spec com o Roxo e o Vácuo
entram agora.
**Where**: `src/data/evolutions.ts`, `src/data/shop.ts`
**Depends on**: T41
**Reuses**: `recipeEntry` (T8)
**Requirement**: RCP-05, RCP-06, OFR-01, OFR-06, OFR-08, NOM-05

**Done when**:

- [ ] `tests/data/combos.test.ts`: RCP-05 com as 7 receitas da spec na ordem; NOM verdes; `tests/data/shop.test.ts`: a
      nova no fim
- [ ] `tests/core/evolution.test.ts`: Boogie Nv 3 com o Azul → não pronta, Nv 4 → pronta; Roxo feito depois do Vácuo →
      o Boogie mantém o combo (edge case)
- [ ] Teste de loja (`comboShop.test.ts` ou `shopDraw.test.ts`): Roxo e Vácuo prontos → cartas 0 e 1 nessa ordem e carta
      2 de item novo; Vácuo e depois Roxo → aceitos; Roxo e depois Vácuo → recusado sem gasto com `FORA DA BUILD`
- [ ] A linha do Vácuo na tabela "Regra de combo" confere com o texto (NOM-05)
- [ ] Gate verde; contagem informada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(data): add the vacuum swap evolution`

---

#### T48: alvo e grupo do Vácuo, regra pura

**What**: `core/vacuumSwap.ts` com `vacuumTarget(origin, rangePx, orbs)` (orbe do Azul com centro a até `rangePx` do
centro do player, para qualquer lado, o mais perto, empate pelo menor id; devolve `{ id, kind: 'orb', center }`) e
`pulledGroup(orbCenter, radius, delta, bodies, fits)` (comum com centro a até `radius`, inclusive, deslocado por `delta`,
só se a caixa nova couber).
**Where**: `src/core/vacuumSwap.ts` (novo)
**Depends on**: None
**Reuses**: F34 `SwapCandidate` (`core/swap.ts`)
**Requirement**: VAC-01, VAC-04

**Done when**:

- [ ] `tests/core/vacuumSwap.test.ts` novo: orbe a exatamente o alcance → alvo, 1 px além → nulo (L-010); atrás do player
      vale; empate pelo menor id; comum com centro a exatamente o raio anda, 1 px além fica; comum que não cabe fica;
      deslocamento igual ao do orbe
- [ ] Gate verde; contagem informada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): pick the vacuum orb and the pulled group`

---

#### T49: troca com candidato prioritário

**What**: `SwapContext` do `BoogieState` ganha `priority?: SwapCandidate | null`; `swap` usa `ctx.priority ??
pickSwapTarget(...)`; encaixe, recusa, carga, 2ª palma e eco ficam.
**Where**: `src/core/boogie.ts`
**Depends on**: T48
**Reuses**: F34 `BoogieState.swap`, `pickSwapTarget`, `swapPlacement`
**Requirement**: VAC-01, VAC-02, VAC-05, VAC-07

**Done when**:

- [ ] `tests/core/boogie.test.ts`: `priority` vence o candidato mais perto à frente; sem `priority`, igual a hoje;
      `priority` que não cabe → recusa do BWG-03 sem gastar carga; o eco guarda o alvo prioritário
- [ ] Smoke `boogie` igual
- [ ] Gate verde; contagem informada

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(core): let the boogie swap take a priority target`

---

### Phase 11: Passo 4 — Vácuo de Troca no jogo

#### T50: `boogieVacuum`, orbe prioritário e grupo levado

**What**: `game/tech/boogieVacuum.ts` com `priorityOrb(ctx, playerCenter, rangePx)` (`vacuumTarget` sobre os
`ctx.objects()` com `tech === 'azul'` e `kind === 'orb'`) e `carry(from, to, radius, bodies, fits)` (`pulledGroup` com
`delta = to − from` e `body.teleport(destino)` em cada um; devolve quantos andaram). Só `import type`.
**Where**: `src/game/tech/boogieVacuum.ts` (novo)
**Depends on**: T48
**Reuses**: F34 `ctx.objects()`, `Enemy.teleport`
**Requirement**: VAC-03, VAC-04

**Done when**:

- [ ] `tests/game/boogieVacuum.test.ts` novo (L-043): destino entregue a cada `teleport` falso; contagem devolvida;
      corpo que não cabe não recebe `teleport`; `priorityOrb` ignora objeto que não é orbe do Azul
- [ ] Gate verde; contagem informada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(tech): carry the pulled group with the vacuum swap`

---

#### T51: anel azul da troca

**What**: `BoogieFx.ring(x, y)`: anel na cor do Azul (`TECHNIQUES.azul.aura`, só `PALETTE`), raio 24 → 40 px em 150 ms,
registrado no `fxRegistry` com `scheduleDestroy(150)`; `debug()` lê o último anel vivo.
**Where**: `src/game/techFx/BoogieFx.ts`
**Depends on**: None
**Reuses**: F34 `BoogieFx.flash`, `fxRegistry`
**Requirement**: VAC-08

**Done when**:

- [ ] Smoke `boogie` igual (o anel ainda não é chamado); `debug()` com `ring: null` sem troca
- [ ] Gate verde; contagem informada

**Tests**: smoke
**Gate**: full
**Commit**: `feat(fx): add the blue ring for the vacuum swap`

---

#### T52: Lapso para no centro novo quando é movido

**What**: `relocate(id, at)` do `blue.ts`: no Lapso ainda andando, a `LapsoDrive` para no centro novo, como se a tecla
tivesse sido solta; o Andante segue o `andanteStep` (já é assim).
**Where**: `src/game/tech/blue.ts`
**Depends on**: None
**Reuses**: F33 `LapsoDrive`, F34 `relocate`
**Requirement**: VAC-03

**Done when**:

- [ ] Smokes `tech-axes` e `boogie` iguais
- [ ] Gate verde; contagem informada

**Tests**: smoke
**Gate**: full
**Commit**: `feat(tech): stop a moving lapse orb when it is relocated`

---

#### T53: Boogie troca com o orbe do Azul e leva o grupo

**What**: no `boogieMoves.swap`, com o Vácuo, `priority = priorityOrb(...)` no alcance resolvido do Boogie; com a troca
aceita e o alvo igual ao orbe: `ctx.relocate('azul', id, centro antigo do player)`, `carry(centro do orbe, centro antigo
do player, raio resolvido do orbe, comuns vivos, world.fits)`, eventos `boogieSwap:azul:<id>` e `vacuo:<n>`, `BoogieFx.ring`
nos dois pontos; o choque nos dois pontos segue o BWG-05; o `echo` com alvo orbe do Azul vivo faz a mesma troca de volta
com o grupo e, morto, `boogieEchoRefused`. `candidates(f)` continua sem o Azul.
**Where**: `src/game/tech/boogieMoves.ts`
**Depends on**: T50, T51, T49
**Reuses**: F34 `boogieMoves`, `BoogieFx`
**Requirement**: VAC-01, VAC-02, VAC-03, VAC-04, VAC-05, VAC-06, VAC-07

**Done when**:

- [ ] Com `tech=boogie,azul&axes=boogie.alcance:2,boogie.cargas:1&evo=vacuoDeTroca&maxAlive=3`: Azul, palma → o player
      no ponto do orbe, os comuns puxados perto do ponto antigo do player, `boogieSwap:azul:<id>` e `vacuo:<n>` com
      n ≥ 1, o chefe parado; sem orbe no alcance, troca normal com um comum
- [ ] Conferido no jogo em HD, em movimento, dois lados, com o Andante e o Lapso
- [ ] Smokes `boogie`, `tech` e `fight` verdes
- [ ] Gate verde; contagem informada

**Tests**: smoke + conferência
**Gate**: full
**Commit**: `feat(tech): swap with the blue orb and carry its group`

---

#### T54: `combos.smoke`, cena do Vácuo de Troca

**What**: cena 5 do design nos dois lados; anel vivo nos dois pontos (`BoogieFx.debug()`); comum em hitstun ou preso pela
Âncora mantém o estado depois de andar (edge case); orbe do Andante volta a andar para os 80 px à frente e o do Lapso
fica parado dois quadros depois (edge case); nenhum efeito do combo sem a palma em toda a janela (CGL-02, L-020); eco da
Dupla Palma com o orbe vivo e morto (VAC-07). Fecha o passo 4.
**Where**: `scripts/smoke/combos.smoke.mjs`
**Depends on**: T53, T52, T47, T46
**Reuses**: cenas da T46
**Requirement**: VAC-02, VAC-06, VAC-07, VAC-08, CGL-02

**Done when**:

- [ ] `npm run smoke -- combos` verde (cenas de luta em `combos-fight.smoke.mjs` se o arquivo passar de 380)
- [ ] Conferido no jogo em HD, em movimento, dois lados
- [ ] Gate verde; smokes do passo 4 (`combos`, `boogie`, `tech-axes`, `tech`, `fight`) verdes

**Tests**: smoke + conferência
**Gate**: build
**Commit**: `test(smoke): cover the vacuum swap evolution`

---

### Phase 12: Passo 5 — Grimório, regra pura

#### T55: meia receita, dica e anulação

**What**: `core/grimoire.ts` ganha `halfHeld(r, view)` (não feita, não pronta e `assignPieces(r, view, false)` com pelo
menos `ceil(itens / 2)` não nulos entre as peças que não são `eixo`), `offerPiece(entry, offer, view)` (técnica, talento,
arma ou relíquia com nível 0 → `adds: 'new'`; ponto de eixo de técnica ou arma, nível de talento ou relíquia → `adds:
'level'`, com o eixo da carta em `axis`; o resto → `null`), `grimoireHint(piece, view, list = RECIPES)` (1ª receita meio
na mão em que a peça falta, está abaixo do mínimo ou, pelo `axis`, é o eixo que uma peça `eixo` pede) e
`voidedHint(union, view, list = RECIPES)` (dica da 1ª Evolução feita cujo catalisador de técnica está em
`consumedTechniques(union)`).
**Where**: `src/core/grimoire.ts`
**Depends on**: T13
**Reuses**: `assignPieces`, `recipeDone`, `consumedTechniques` (T4, T12)
**Requirement**: GRM-01, GRM-02, GRM-04

**Done when**:

- [ ] `tests/core/grimoire.test.ts`: GRM-01 nos dois lados de `ceil(peças / 2)` e falso com a receita feita ou pronta;
      Boogie sem Azul → a carta de técnica nova do Azul dá `Vácuo`; Boogie Nv 3 com o Azul → a carta de ponto do Boogie
      dá `Vácuo`; Boogie Nv 4 com o Azul → nada (pronta); carta que serve duas receitas → a 1ª da lista; Azul, Vermelho
      Nv 4 e o Vácuo feito → o Roxo dá `anula Vácuo`; Divergente Nv 4 com a Zona Negra e 0 ponto em Alvos → a carta de
      ponto de Alvos dá `P. Negro` e a de Zona não; só o Divergente (sem Zona Negra, Alvos 0) → a carta da Zona Negra dá
      `P. Negro`
- [ ] Gate verde; contagem informada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): find grimoire hints and voided evolutions`

---

#### T56: linhas `Grimório:` e `anula`

**What**: `recipePreview` ganha `grimoireLine(hint)` (`Grimório: <dica>`) e o `recipeLines` soma `anula <dica>` com
`ctx.voids`.
**Where**: `src/core/recipePreview.ts`
**Depends on**: T55
**Reuses**: `recipeLines` (T16, T30)
**Requirement**: GRM-02, GRM-04

**Done when**:

- [ ] `tests/core/recipePreview.test.ts`: `Grimório: Lâmina Div` com 20 caracteres; `anula Vácuo`; toda dica do `RECIPES`
      cabe na linha
- [ ] Gate verde; contagem informada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add grimoire and voided-evolution card lines`

---

#### T57: oferta com a receita da dica

**What**: `OfferView` ganha `grimoire: RecipeId | null` (a receita cuja dica a carta mostra, por `offerPiece` +
`grimoireHint` sobre a vista do momento do `view`).
**Where**: `src/core/shop.ts`
**Depends on**: T55
**Reuses**: F30/F35 `Shop.view`
**Requirement**: GRM-02

**Done when**:

- [ ] Teste (`comboShop.test.ts`): com o Boogie e sem o Azul, a oferta da técnica Azul tem `grimoire: 'vacuoDeTroca'`;
      as outras `null`
- [ ] Gate verde; contagem informada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(shop): tag offers that complete a half-held recipe`

---

#### T58: linha do Grimório na carta e `anula` na carta da União

**What**: começa medindo a carta mais cheia com a linha nova (decisão do usuário na tabela do topo); o `shopPreview` põe a
`grimoireLine` no fim do `preview` da oferta com `grimoire` e o `anula <dica>` na carta da União cujo catalisador de
Evolução feita ela consumiria.
**Where**: `src/core/shopPreview.ts`
**Depends on**: T56, T57, T19
**Reuses**: `recipeLines`, `grimoireLine`
**Requirement**: GRM-02, GRM-04

**Done when**:

- [ ] Medida da carta mais cheia anotada no commit; se não coube, a opção escolhida pelo usuário está aplicada
- [ ] `tests/core/shopPreview.test.ts`: carta do Azul com `Grimório: Vácuo`; carta do Roxo com o Vácuo feito com `anula
      Vácuo`; na mesma loja, com o Roxo e o Vácuo abertos, o `view()` logo depois da compra do Vácuo já põe `anula Vácuo`
      na carta do Roxo (GRM-04)
- [ ] Gate verde; contagem informada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(shop): show grimoire hints and voided evolutions on cards`

---

#### T59: `anula` na opção do baú

**What**: a opção `receita` do `choicePages` soma `anula <dica>` pelo `voidedHint`.
**Where**: `src/core/choicePages.ts`
**Depends on**: T56, T21
**Reuses**: `recipeLines` (T16)
**Requirement**: GRM-04

**Done when**:

- [ ] Teste do `choicePages`: opção do Roxo com o Vácuo feito → `anula Vácuo`; sem o Vácuo, sem a linha
- [ ] Gate verde; contagem informada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(choice): warn when a union voids an evolution`

---

### Phase 13: Passo 5 — Grimório no jogo e fechamento

#### T60: receitas reveladas pela loja

**What**: depois de cada `shop.view()`, o `shopDirector` repassa ao `build.combos.reveal` as ofertas com `grimoire` e as
cartas de receita à vista; o `choiceDirector` faz o mesmo com as opções de receita do baú (GRM-03).
**Where**: `src/scenes/test/shopDirector.ts`, `src/scenes/test/choiceDirector.ts`
**Depends on**: T57
**Reuses**: `ComboRun.reveal` (T13)
**Requirement**: GRM-03

**Done when**:

- [ ] Com `tech=boogie&round=4&fragments=100`, quando a carta do Azul sai, `combos.revealed` tem `evolucao:vacuoDeTroca`;
      com uma receita pronta na carta 0 ou no baú, ela também entra; depois do reset da run, vazio (CGL-06)
- [ ] Smokes `shop` e `combos` verdes
- [ ] Gate verde; contagem informada

**Tests**: smoke
**Gate**: full
**Commit**: `feat(shop): reveal recipes hinted on shop cards`

---

#### T61: `combos.smoke`, cena do Grimório

**What**: cena 6 do design: a carta do Azul com `Grimório: Vácuo` e `combos.revealed` com `evolucao:vacuoDeTroca`; com
`tech=boogie,azul,vermelho&axes=vermelho.potencia:3,boogie.alcance:2,boogie.cargas:1&evo=vacuoDeTroca&round=6`, a carta
do Roxo e a opção do baú com `anula Vácuo`; a caixa do texto da carta mais cheia dentro da carta (`ShopPanel.debug()`).
Fecha o passo 5.
**Where**: `scripts/smoke/combos.smoke.mjs`
**Depends on**: T60, T54, T58, T59
**Reuses**: cenas da T54
**Requirement**: GRM-02, GRM-03, GRM-04

**Done when**:

- [ ] `npm run smoke -- combos` verde
- [ ] Gate verde; smokes do passo 5 (`combos`, `shop`, `shop-axes`, `shop-progress`, `boss-chest`) verdes

**Tests**: smoke
**Gate**: build
**Commit**: `test(smoke): cover grimoire hints in the shop`

---

#### T62: fechamento da F37

**What**: `README.md` ganha o `evo=<id>[,<id>]` com os 7 ids e o campo `combos` do snapshot; a tarefa confere o CGL-07
(`TestScene.ts` sem linha efetiva líquida desde a base da T1, `.oxlintrc.json` com as listas de exceção iguais ou
menores, `Hud.ts`, `moves.ts` e `ShopPanel.ts` sem crescer, `Player.ts` sem campo novo) e a tabela "Regra de combo" da
spec contra o que cada smoke mostra (NOM-05); a rastreabilidade da spec fica com o status final.
**Where**: `README.md`
**Depends on**: T61
**Reuses**: seção de parâmetros de debug do README
**Requirement**: CGL-07, NOM-05

**Done when**:

- [ ] README e spec atualizados; `validate_spec.py` sem erro
- [ ] Os números do CGL-07 conferidos e escritos no commit
- [ ] Gate verde; smokes do fim da F37 (lista "Smokes que rodam junto" da spec) verdes

**Tests**: none
**Gate**: build
**Commit**: `docs: document the evo parameter for every combo`

---

## Requirement Coverage

| Requirement | Tasks |
| --- | --- |
| RCP-01 | T2, T6, T7, T9, T10 |
| RCP-02 | T4 |
| RCP-03 | T1, T11 |
| RCP-04 | T4, T11 |
| RCP-05 | T2, T3, T27, T41, T47 |
| RCP-06 | T4, T27, T41, T46, T47 |
| RCP-07 | T4, T5 |
| OFR-01 | T17, T26, T47 |
| OFR-02 | T17, T20 |
| OFR-03 | T17 |
| OFR-04 | T20, T23 |
| OFR-05 | T18, T22, T23 |
| OFR-06 | T18, T19, T26, T47 |
| OFR-07 | T16, T19, T21, T30 |
| OFR-08 | T8, T33, T41, T47 |
| OFR-09 | T17 |
| UNI-01 | T22, T26 |
| UNI-02 | T33 |
| UNI-03 | T15, T32, T33 |
| UNI-04 | T32, T33 |
| UNI-05 | T15, T33 |
| UNI-06 | T33, T40 |
| CRT-01 | T28, T38, T39 |
| CRT-02 | T28, T29, T38, T39 |
| CRT-03 | T29, T40 |
| CRT-04 | T29, T40 |
| CRT-05 | T29 |
| CRT-06 | T38, T39, T40 |
| CRT-07 | T31, T35, T36 |
| CRT-08 | T40 |
| CRT-09 | T28 |
| PND-01 | T42, T45, T46 |
| PND-02 | T42, T43, T46 |
| PND-03 | T43 |
| PND-04 | T42, T46 |
| PND-05 | T42, T45 |
| PND-06 | T44, T45, T46 |
| VAC-01 | T48, T49, T53 |
| VAC-02 | T49, T53, T54 |
| VAC-03 | T50, T52, T53 |
| VAC-04 | T48, T50, T53 |
| VAC-05 | T49, T53 |
| VAC-06 | T53, T54 |
| VAC-07 | T49, T53, T54 |
| VAC-08 | T51, T54 |
| NOM-01 | T3 |
| NOM-02 | T3 |
| NOM-03 | T3 |
| NOM-04 | T3 |
| NOM-05 | T27, T41, T47, T62 |
| CGL-01 | T22, T26 |
| CGL-02 | T40, T46, T54 |
| CGL-03 | T22, T26 |
| CGL-04 | T31, T34, T35, T36, T37, T40 |
| CGL-05 | T11, T22, T40 |
| CGL-06 | T11, T13, T22 |
| CGL-07 | T62 (e o cabeçalho, em toda tarefa) |
| CDB-01 | T14, T24 |
| CDB-02 | T25 |
| CDB-03 | T21, T23 |
| GRM-01 | T55 |
| GRM-02 | T55, T56, T57, T58, T61 |
| GRM-03 | T13, T60, T61 |
| GRM-04 | T55, T56, T58, T59, T61 |
| DUO-01 | T4, T12 |
| DUO-02 | T12 |
| DUO-03 | T12, T17, T20 |

67 de 67 requisitos com tarefa.

---

## Phase Execution Map

```
Phase 1 → Phase 2 → ... → Phase 13

Phase 1:   T1, T2, T3, T4, T5, T6, T7
Phase 2:   T8, T9, T10
Phase 3:   T11, T12, T13, T14, T15
Phase 4:   T16, T17, T18, T19, T20, T21
Phase 5:   T22, T23, T24, T25, T26
Phase 6:   T27, T28, T29, T30, T31
Phase 7:   T32, T33, T34, T35, T36, T37
Phase 8:   T38, T39, T40
Phase 9:   T41, T42, T43, T44, T45, T46
Phase 10:  T47, T48, T49
Phase 11:  T50, T51, T52, T53, T54
Phase 12:  T55, T56, T57, T58, T59
Phase 13:  T60, T61, T62
```

Ordem estritamente sequencial (a linha é a ordem de trabalho, não dependência). 62 tarefas em lotes de fases inteiras
(~7 por agente, agente novo por lote, memória "Agente novo por lote"): Fase 1 (7), Fases 2+3 (8), Fase 4 (6), Fase 5
(5), Fase 6 (5), Fase 7 (6), Fase 8 (3), Fase 9 (6), Fases 10+11 (8), Fases 12+13 (8): 10 lotes. As fases 1, 3, 4, 6, 10
e 12 são regra pura e servem em Sonnet; os lotes com efeito em movimento (Fases 8, 9 e 10+11) rodam em Opus 5.5 ou Fable.
Fim de cada passo (fases 2, 5, 8, 9, 11 e 13): gate de build com os smokes do passo no design.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1, T13, T14, T28, T31, T42, T48, T55 | 1 módulo puro novo (ou a classe que abre o módulo) | ✅ |
| T2 | 1 módulo de dados + os leitores do campo `from` que o typecheck aponta | ⚠️ coeso: o campo novo sem os leitores não compila |
| T3 | 1 teste de dados | ✅ |
| T4 | 1 arquivo: a regra genérica + o nome antigo renomeado | ⚠️ coeso: o nome `recipeReady` não pode ter dois donos |
| T5 | 1 regra de elegibilidade + o método de 3 linhas que dá a vista ao contexto | ⚠️ coeso (merge backward: a regra sem a vista não roda) |
| T6, T17 | 1 função (`drawCards`) | ✅ |
| T7 | 1 função (`chestCandidates`) + a linha do chamador que passa a vista | ⚠️ coeso |
| T8, T27 | 1 entrada / 1 receita de dados | ✅ |
| T9 | 1 remoção (módulo antigo e as tabelas que só ele lia) + os imports que o typecheck aponta | ⚠️ coeso: remoção parcial não compila |
| T10, T62 | 1 documento | ✅ |
| T11 | 1 classe (`Loadout`) + 1 linha na vista que passa a ler o campo novo | ⚠️ coeso |
| T12, T15, T16, T29, T30, T49, T56, T57, T59 | 1 arquivo, 1 mudança | ✅ |
| T18 | 1 método (`buy`) + o `view` da mesma recusa + o nome do `BuyContext` que o chamador acompanha | ⚠️ coeso |
| T19, T35, T36, T58 | 1 função de texto | ✅ |
| T20 | 1 função (`drawChest`) | ✅ |
| T21 | 1 tipo (`ChestOption`) + os 2 leitores que o typecheck aponta + os smokes que leem o id | ⚠️ coeso: o tipo sem os leitores não compila e o id sem os smokes deixa o gate vermelho |
| T22 | 1 diretor novo + o campo que o cria + o chamador da loja | ⚠️ coeso (merge forward: o diretor sem chamador não tem prova) |
| T23, T32, T45, T52 | 1 método num adaptador | ✅ |
| T60 | 1 chamada de `reveal` em 2 diretores (loja e baú) | ⚠️ coeso: a mesma regra (GRM-03) nos dois lugares em que a receita aparece |
| T24 | 1 método (`applyDebug`) + a chamada no fim do `applyDebugAxes` + a saída do método da F36 que ele substitui | ⚠️ coeso |
| T25 | 1 tipo de snapshot + o campo que o preenche + o tipo no `debugApi` | ⚠️ coeso: o tipo sem quem o preenche não tem prova |
| T26, T40, T46, T54, T61 | 1 smoke ou cena | ✅ |
| T33 | 1 comportamento (União que mantém a principal) + a entrada da loja que a torna comprável | ⚠️ coeso: a entrada sem a aplicação venderia uma carta recusada |
| T34 | 1 tipo + o rótulo que o usa | ✅ |
| T37 | 1 desenho novo + as 2 chamadas de 1 linha que o mostram | ⚠️ coeso (merge forward) |
| T38, T50 | 1 adaptador com porta | ✅ |
| T39, T53 | 1 comportamento no módulo da técnica | ✅ |
| T41, T47 | 1 receita de dados + a entrada dela no catálogo | ⚠️ coeso: mesma receita nos dois registros |
| T43 | 1 entrada do `buildEffects` + a linha do `StatsDirector` que a preenche | ⚠️ coeso (merge forward) |
| T44 | 1 método de efeito + o parâmetro `primary` nas 3 assinaturas que o carregam | ⚠️ coeso: assinatura parcial não compila |
| T51 | 1 método de efeito | ✅ |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | — | ✅ Match |
| T2 | None | — | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T1, T2 | T1 → T4, T2 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |
| T7 | T5 | T5 → T7 | ✅ Match |
| T8 | T2 (fase 1) | T2 → T8 (fase 1) | ✅ Match |
| T9 | T5, T6, T7 (fase 1) | T5 → T9, T6 → T9, T7 → T9 (fase 1) | ✅ Match |
| T10 | T8, T9 | T8 → T10, T9 → T10 | ✅ Match |
| T11 | T1 (fase 1) | T1 → T11 (fase 1) | ✅ Match |
| T12 | T11, T4 (fase 1) | T11 → T12, T4 → T12 (fase 1) | ✅ Match |
| T13 | T2 (fase 1) | T2 → T13 (fase 1) | ✅ Match |
| T14 | T2 (fase 1) | T2 → T14 (fase 1) | ✅ Match |
| T15 | None | — | ✅ Match |
| T16 | T12 (fase 3) | T12 → T16 (fase 3) | ✅ Match |
| T17 | T6 (fase 1), T12 (fase 3) | T6 → T17, T12 → T17 | ✅ Match |
| T18 | T17 | T17 → T18 | ✅ Match |
| T19 | T16, T18 | T16 → T19, T18 → T19 | ✅ Match |
| T20 | T7 (fase 1), T12 (fase 3) | T7 → T20, T12 → T20 | ✅ Match |
| T21 | T16, T20 | T16 → T21, T20 → T21 | ✅ Match |
| T22 | T11, T13 (fase 3), T18, T19 (fase 4) | T11 → T22, T13 → T22, T18 → T22, T19 → T22 | ✅ Match |
| T23 | T22, T21 (fase 4) | T22 → T23, T21 → T23 (fase 4) | ✅ Match |
| T24 | T22, T14, T15 (fase 3) | T22 → T24, T14 → T24, T15 → T24 | ✅ Match |
| T25 | T22, T12 (fase 3) | T22 → T25, T12 → T25 (fase 3) | ✅ Match |
| T26 | T23, T24, T25 | T23 → T26, T24 → T26, T25 → T26 | ✅ Match |
| T27 | T3 (fase 1) | T3 → T27 (fase 1) | ✅ Match |
| T28 | None | — | ✅ Match |
| T29 | T28 | T28 → T29 | ✅ Match |
| T30 | T27, T16 (fase 4) | T27 → T30, T16 → T30 (fase 4) | ✅ Match |
| T31 | T27 | T27 → T31 | ✅ Match |
| T32 | T15 (fase 3) | T15 → T32 (fase 3) | ✅ Match |
| T33 | T32, T22 (fase 5), T27, T30 (fase 6) | T32 → T33, T22 → T33, T27 → T33, T30 → T33 | ✅ Match |
| T34 | T31 (fase 6) | T31 → T34 (fase 6) | ✅ Match |
| T35 | T31 (fase 6) | T31 → T35 (fase 6) | ✅ Match |
| T36 | T31 (fase 6) | T31 → T36 (fase 6) | ✅ Match |
| T37 | T34 | T34 → T37 | ✅ Match |
| T38 | T29 (fase 6) | T29 → T38 (fase 6) | ✅ Match |
| T39 | T38 | T38 → T39 | ✅ Match |
| T40 | T39, T26 (fase 5), T33, T35, T36, T37 (fase 7) | T39 → T40, T26 → T40, T33 → T40, T35 → T40, T36 → T40, T37 → T40 | ✅ Match |
| T41 | T27 (fase 6) | T27 → T41 (fase 6) | ✅ Match |
| T42 | None | — | ✅ Match |
| T43 | T42 | T42 → T43 | ✅ Match |
| T44 | None | — | ✅ Match |
| T45 | T42, T44 | T42 → T45, T44 → T45 | ✅ Match |
| T46 | T41, T43, T45, T40 (fase 8) | T41 → T46, T43 → T46, T45 → T46, T40 → T46 (fase 8) | ✅ Match |
| T47 | T41 (fase 9) | T41 → T47 (fase 9) | ✅ Match |
| T48 | None | — | ✅ Match |
| T49 | T48 | T48 → T49 | ✅ Match |
| T50 | T48 (fase 10) | T48 → T50 (fase 10) | ✅ Match |
| T51 | None | — | ✅ Match |
| T52 | None | — | ✅ Match |
| T53 | T50, T51, T49 (fase 10) | T50 → T53, T51 → T53, T49 → T53 (fase 10) | ✅ Match |
| T54 | T53, T52, T47 (fase 10), T46 (fase 9) | T53 → T54, T52 → T54, T47 → T54, T46 → T54 | ✅ Match |
| T55 | T13 (fase 3) | T13 → T55 (fase 3) | ✅ Match |
| T56 | T55 | T55 → T56 | ✅ Match |
| T57 | T55 | T55 → T57 | ✅ Match |
| T58 | T56, T57, T19 (fase 4) | T56 → T58, T57 → T58, T19 → T58 (fase 4) | ✅ Match |
| T59 | T56, T21 (fase 4) | T56 → T59, T21 → T59 (fase 4) | ✅ Match |
| T60 | T57 (fase 12) | T57 → T60 (fase 12) | ✅ Match |
| T61 | T60, T54 (fase 11), T58, T59 (fase 12) | T60 → T61, T54 → T61, T58 → T61, T59 → T61 | ✅ Match |
| T62 | T61 | T61 → T62 | ✅ Match |

Nenhuma dependência aponta para fase posterior.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1, T4, T11, T12, T13, T14, T15, T16, T28, T30, T31, T34, T35, T36, T42, T48, T55, T56, T57, T58, T59 | Regra pura | unit | unit | ✅ OK |
| T2 | Dados lidos pelo jogo vivo | unit (+ smoke) | unit + smoke | ✅ OK |
| T3 | Teste de dados | unit | unit | ✅ OK |
| T5, T6, T7, T17, T18, T19, T20, T29, T43, T49 | Regra pura que muda o jogo vivo | unit (+ smoke) | unit + smoke | ✅ OK |
| T8, T33 | Dados de loja (+ adaptador na T33) | unit (+ smoke) | unit + smoke | ✅ OK |
| T9, T21 | Remoção / tipo com leitores em regra e adaptador | unit, smoke | unit + smoke | ✅ OK |
| T10, T62 | Documentação | none | none | ✅ OK |
| T22, T23, T24, T32, T60 | Adaptadores | smoke | smoke | ✅ OK |
| T25 | Tipo de snapshot + adaptador | unit, smoke | unit + smoke | ✅ OK |
| T26, T61 | Smoke (prova do adaptador) | smoke | smoke | ✅ OK |
| T27, T41, T47 | Dados | unit | unit | ✅ OK |
| T37, T44, T51, T52 | Vista do motor / adaptador sem efeito novo visível ainda | smoke | smoke | ✅ OK |
| T38, T50 | Adaptador com porta | unit | unit | ✅ OK |
| T39, T40, T45, T46, T53, T54 | Adaptador / vista com efeito em movimento | smoke + conferência | smoke + conferência | ✅ OK |
