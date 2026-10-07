# Mundo modular Validation (rodada 3)

**Verdict**: PASS

**Date**: 2026-10-07
**Spec**: `.specs/features/mundo-modular/spec.md`
**Diff range**: feature `1c75d95..HEAD` (`HEAD` = `a6170b7`); correção da rodada 3 `9fd26d2..HEAD` (só `a6170b7`, T30)
**Verifier**: sub-agente independente (autor ≠ verifier), evidence-or-zero, rodada 3 de no máximo 3

Resumo: a T30 fechou o único gap da rodada 2. As duas URLs do `world-traverse` agora levam `&tech=corte`
(`world-traverse.smoke.mjs:10` e `:347`), e com a técnica no nível 1 a rodada decide se o upgrade Nv1→2 aparece. O
mutante KA (`round + 1` só no modular) agora morre, e o KB (outro stream) continua morrendo. O diff da T30 só acrescenta
o parâmetro nas URLs e um comentário; nenhuma asserção foi enfraquecida. Gate e smokes verdes. 54/54 ACs.

---

## Rodada 3: correção T30

### Diff `9fd26d2..HEAD`

- `scripts/smoke/world-traverse.smoke.mjs`: `&tech=corte` acrescentado à URL da konbini (`:10`) e à da sala (`:347`), mais
  um comentário de 2 linhas (`:345-346`) explicando o porquê. Nenhuma asserção foi removida nem afrouxada: a captura
  (`:238-239`) e a comparação `JSON.stringify(roomShop) === JSON.stringify(konbiniShop)` (`:361-364`) são as mesmas.
- `.specs/features/mundo-modular/tasks.md`: só a Phase 6 / T30 acrescentada.
- `tech=corte` também vale para todo o resto do `world-traverse`, que passou inteiro no HEAD (sem mudança de asserção).

### Gate (rodada 3)

- `npm run gate`: exit 0. 121 arquivos, **2697 passaram**, 0 falharam, 0 pulados.
- `npm run smoke`: **41/41 ok** (`41 cenário(s) ok`, exit 0) numa execução completa; nenhum intermitente apareceu.

### Sensor (rodada 3)

Isolamento: `git worktree add --detach <scratchpad>/verifier3-wt HEAD` (`a6170b7`), junction `node_modules` para o repo
real. Cada mutação aplicada por script que exige o padrão exato em `src/scenes/test/shopDirector.ts:105`
(`this.s.run.shopRng!, round, this.s.loadout`) e revertida com `git checkout -- src`. `npm run build` e
`npm run smoke -- world-traverse` no worktree.

| # | Mutação | Result | Morto por |
| --- | --- | --- | --- |
| base | sem mutação | ✅ ok | `1 cenário(s) ok` |
| KA | `round` → `this.s.area.mode === 'modular' ? round + 1 : round` | ✅ **Killed** | `world-traverse:361-364` "KON-02: a loja da konbini difere da da sala": konbini `[corte Nv1 34, divergente 15, vida 12]` != sala `[divergente 15, vida 12, fluxo 12]` |
| KB | `shopRng!` → `this.s.area.mode === 'modular' ? this.s.run.stageRng! : this.s.run.shopRng!` | ✅ Killed | mesma asserção: konbini `[fluxo, agilidade, vida]` != sala |

Limpeza: junction desfeita (o `node_modules` real intacto), `git worktree remove --force`, o worktree some de
`git worktree list`; `git status --porcelain` do repo real antes e depois idêntico (`?? .claude/`, `?? BRIEF-FABLE.md`,
`?? SKILL.md`, `diff` vazio). **Result**: **2/2 mortos**. ✅ PASS.

---

# Relatório da rodada 2 (mantido; só a linha de KON-02, o status e o fecho foram atualizados para a rodada 3)

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1-T25 | ✅ Done | fases 1-4 (rodada 1) |
| T26-T29 | ✅ Done | Phase 5, todos os `Done when` `[x]`. O "Done when" de KON-02 da T29 foi cumprido como escrito, mas não discrimina o `round` (abaixo) |

---

## Gate Check

- **Gate command**: `npm run gate` (typecheck + oxlint + prettier --check + vitest) e `npm run smoke`
- **Unit**: 121 arquivos, **2697 passaram**, 0 falharam, 0 pulados (exit 0; oxlint só com os warnings antigos de tamanho e complexidade)
- **Smokes**: **41/41 ok** (`41 cenário(s) ok`, exit 0) numa execução completa; nenhum intermitente apareceu
- **`world-exit` isolado**: `node scripts/smoke/run.mjs world-exit` 3 vezes, **3/3 ok**. Também passou na execução completa, na linha de base do worktree e em todas as execuções de mutante que chegam à medida do selo (o SB e o SK falharam na medida, como deviam). Com a máquina carregada pelo build ele foi estável. A medida pela inclinação (alpha de 0,8 a 0,1) com faixa de 350 a 450 ms separa bem 400 de 800 ms (SB: "durou 801 ms")
- **Test count**: antes da feature 2575 unit / 35 smokes; rodada 1 2694 / 39; agora **2697 / 41** (+3 unit em `tests/game/art/background.test.ts`, +2 smokes `world-exit` e `world-restart`)
- **Skipped**: nenhum. **Failures**: nenhuma

### Integridade das asserções antigas (diff `d442568..HEAD` dos smokes `world-*`)

- Dos `world-*` antigos só o `world-traverse` mudou; `world-run`, `world-boss` e `world-legacy` estão idênticos.
- `world-traverse`: só há asserções novas. A única linha trocada foi o laço que esperava a rodada 2 (passos de 50 ms → 16 ms, com saída quando o fade de entrada termina), e as asserções de KON-03 que vêm depois seguem iguais (`world-traverse.smoke.mjs:305-327`). O fade de saída de 12 a 19 quadros, o crédito dos fragmentos, a mão vazia e os corpos estáticos estão intactos.
- `tests/core/module.test.ts`: as regex `/teste/` e `/linha 5/` viraram a mensagem exata, ou seja, ficaram mais fortes. `tests/game/debugApi.test.ts` só ganhou os campos novos na forma esperada.

---

## Spec-Anchored Acceptance Criteria

Legenda: ✅ a asserção bate com o valor da spec · ⚠️ gap · ❌ sem evidência. Os arquivos que não mudaram desde a
rodada 1 (`stage.test.ts`, `stageArea.test.ts`, `run.test.ts`, `spawnPoint.test.ts`, `level.test.ts`,
`modules.test.ts`, `tiles.test.ts`, `world-run`, `world-boss`, `world-legacy`) foram conferidos de novo nas mesmas
linhas.

### P1: Módulos com gramática validada

| AC | `file:line` + assertion | Valor da spec | Result |
| --- | --- | --- | --- |
| MDL-01 | `tests/core/module.test.ts:21-22` 16 e 48 `.not.toThrow()`; `:26-27` 15 e 49; `:32-37` 16 e 18 linhas; `:44-52` linha de 19 e de 21 colunas | 17 linhas, 16-48 colunas, todas iguais | ✅ |
| MDL-02 | `module.test.ts:56` `toThrow('Módulo "teste": linha 3, coluna 7')`; `:61` `'… linha 9, coluna 0'`; `:64-66` legenda inteira aceita | só `# . E c b p` | ✅ |
| MDL-03 | `module.test.ts:26-27` `toThrow('Módulo "teste": linha 0, coluna 15: largura 15')` / `coluna 49`; `:32-37` `'… linha 16, coluna 0: a grade tem 16 linhas'` / 18; `:44-52` `'… linha 5, coluna 19: a linha tem 19 colunas; esperado 20'` / 21; `:56,61` MDL-02 | id **e** linha **e** coluna em toda quebra de MDL-01 ou MDL-02 | ✅ (gap 1 da rodada 1 fechado) |
| MDL-04 | `module.test.ts:77-79` `toHaveLength(1)`, `/MDL-04/`, `/linha 15, coluna 4/`; `:84-85` `/linha 16, coluna 19/` | linhas 15 e 16 sólidas | ✅ |
| MDL-05 | `module.test.ts:88-94` `/MDL-05/` + `/linha 14, coluna 10/`; linha 0 | nenhum `#` nas linhas 0-14 | ✅ |
| MDL-06 | `module.test.ts:104-107` 12 colunas sem MDL-06; `:110` 11 colunas falham; `:117` boss | ≥ 12 colunas abertas nas linhas 9-14 | ✅ |
| MDL-07 | `module.test.ts:130` 1 `E` falha; `:134-135` 2 `E` `toEqual([])`; `:138` `E` na linha 13; `:173` boss | ≥ 2 `E`, todos na linha 14 | ✅ |
| MDL-08 | `module.test.ts:146` sem objeto falha; `:151-158` `p` ou `b` bastam; `:173` | ≥ 1 `c`/`b`/`p` | ✅ |
| MDL-09 | `module.test.ts:163` konbini com `E` falha; `:168-170` sem `E` passa | konbini sem `E` | ✅ |
| MDL-10 | `tests/data/modules.test.ts:15-16,25-27,32-33` cinco ids, larguras 40/20/32/20/40, validate e lint `toEqual([])` | catálogo de 5 módulos válidos | ✅ |

### P1: Área montada pela seed

| AC | `file:line` + assertion | Valor da spec | Result |
| --- | --- | --- | --- |
| ARE-01 | `tests/core/stage.test.ts:34-35` `toHaveLength(2)`; `world-run.smoke.mjs:86` `'2,2,3'`; `world-traverse.smoke.mjs:309` | 2 módulos nas rodadas 1-2 | ✅ |
| ARE-02 | `stage.test.ts:36-38` `toHaveLength(3)` nas rodadas 3, 4 e 6 | 3 da rodada 3 em diante | ✅ |
| ARE-03 | `stage.test.ts:43-44,132`; `world-boss.smoke.mjs:162-166` `["santuario"]` | só `santuario` | ✅ |
| ARE-04 | `stage.test.ts:57,87-89` `not.toBe(modules[i-1])` | vizinhos diferentes | ✅ |
| ARE-05 | `stage.test.ts:58`; `world-run.smoke.mjs:88-93` | primeiro ≠ primeiro anterior | ✅ |
| ARE-06 | `stage.test.ts:27,59-60,97-109` 48/120 nos dois lados, troca e acréscimo | 48 a 120 colunas | ✅ |
| ARE-07 | `run.test.ts:715` `new Rng(7 ^ 0x1f83d9ab)`; `stage.test.ts:72`; `world-run.smoke.mjs:119-122`; `world-restart.smoke.mjs:54-57` a mesma seed repete a área | stream `seed ^ 0x1f83d9ab`, determinístico | ✅ |
| ARE-08 | `stageArea.test.ts:37,42-43`; `level.test.ts:125` | parede e selo de 1 coluna | ✅ |
| ARE-09 | `stageArea.test.ts:64`; `world-traverse.smoke.mjs:82` `colOf === 3`; `world-restart.smoke.mjs:37` | coluna 3, em cima da linha 14 | ✅ |
| ARE-10 | `world-traverse.smoke.mjs:35-38` `bounds.x === 0 && bounds.y === 0 && bounds.width === area.widthPx && bounds.height === area.heightPx` em toda medida (> 30, `:340`), na rodada 1, na travessia, na konbini e na rodada 2; `widthPx` amarrado ao valor absoluto em `:78` (`54*TILE`, `17*TILE`) e na konbini (`22*TILE`); `bounds` vem de `cameras.main.getBounds()` (`snapshot.ts:37-40`) | limites = largura **e** altura da área | ✅ (gap 2 fechado; BD1 e BD2 mortos) |
| ARE-11 | `world-traverse.smoke.mjs:88-90` `17 + 1`; `:230-232` konbini `17`; `:251` `worldProps.length === 0`; `:321-327` rodada 2 | nada da área anterior sobrevive | ✅ |
| ARE-12 | `stage.test.ts:120-128`; `world-traverse.smoke.mjs:74-76,310-312` | exatamente a lista, nessa ordem | ✅ |
| ARE-13 | `stage.test.ts:143-150` → `toBeNull()` | inválido ou especial: ignorado | ✅ |

### P1: Selo, travessia e saída

| AC | `file:line` + assertion | Valor da spec | Result |
| --- | --- | --- | --- |
| TRV-01 | `world-traverse.smoke.mjs:133` `player.x < exitX` em todo quadro de `roundActive`; `:138-140` parado com `sealed`; `:83-85` `exitX === 53*TILE` | selo sólido em `roundActive` | ✅ (para o player; inimigos e objetos usam o mesmo `Filters.terrain`, como na rodada 1) |
| TRV-02 | `run.test.ts:587-588` `'traverse'` + `[{type:'roundCleared', round:1}]`; `world-traverse.smoke.mjs:155-163` | `traverse` + `roundCleared` | ✅ |
| TRV-03 | Corpo: `world-traverse.smoke.mjs:164-166` `staticBodies === 17`; `world-boss.smoke.mjs:192-195`. Efeito: `world-exit.smoke.mjs:122-125` alpha só desce; `:139-140` `duration >= 350 && duration <= 450` (inclinação de 0,8 a 0,1 em tempo real); `:141` `burn.ms <= 800` até a imagem sumir | remove o corpo **e** toca um efeito de 400 ms | ✅ (gap 3 fechado; SB, duração ×2, e SK, imagem que não some, mortos; estável 3/3 isolado) |
| TRV-04 | `run.test.ts:597-603` | input aceito, sem spawn nem timer | ✅ |
| TRV-05 | `world-traverse.smoke.mjs:193-197` cruza `exitX` e a área vira a konbini; `:225-227` `shopOpen:1`; `run.test.ts:652-660` | `exitReached()` uma vez | ✅ |
| TRV-06 | `run.test.ts:633-649` | ignorado fora de `traverse` | ✅ |
| TRV-07 | Fragmentos: `world-traverse.smoke.mjs:240-247` `wallet === before + swept`, nenhum fragmento sobra. Curas: `world-exit.smoke.mjs:91-94` `heal` e `elixir` no chão; `:190-193` ainda vivos no quadro do dano; `:194-198` `player.hp === Math.min(maxHp, hurt.hp + sum)` (50 + 57 com teto 100); `:199` `pickups.length === 0`; `:200-204` `collect:heal:` e `collect:elixir:` | credita fragmentos **e** aplica curas e Elixir com teto no maxHp | ✅ (gap 4 fechado; HF, que credita só fragmentos, morto: "vida 50 != min(100, 50 + 57)") |
| TRV-08 | `world-traverse.smoke.mjs:142,249` `heldItem === null` | mão vazia | ✅ |
| TRV-09 | `run.test.ts:685-687` `gameOver` com `{round:1, kills:6}` | `gameOver` | ✅ |
| TRV-10 | Saída: `world-traverse.smoke.mjs:198-200` 12-19 quadros; `:202-205` `fade.running && fade.out` em todo quadro; `:206-209` `player.move === null` com `KeyJ` apertada; `:210-214` com `KeyD` apertada o `dx` só cai. Entrada da konbini: `:252-262` nasce clareando (`!fade.out`) e dura 12-19 quadros. Loja: `:292-295` saída de 11-19 quadros; `:296-299` entrada da rodada 2 de 12-19; `:300-304` `player.x` igual ao spawn e `move === null` com `KeyJ` apertada | 250 ms escurecendo, rebuild, 250 ms clareando, input neutro nos 500 ms | ✅ (gap 5 fechado; A5 morto: "o player deveria só perder velocidade", `dx` constante de 1,47) |

### P1: Konbini como loja

| AC | `file:line` + assertion | Valor da spec | Result |
| --- | --- | --- | --- |
| KON-01 | `world-traverse.smoke.mjs:216-229` `["konbini"]`, `22*TILE`, `shop`, `round === 1`, `shopOpen:1`, `colOf === 3`; `run.test.ts:613-614` | konbini, coluna 3, `shop` + `shopOpen` da rodada atual | ✅ |
| KON-02 | `world-traverse.smoke.mjs:238-239` captura `{offers:{id,level,maxLevel,cost,sold}, rerollCost}` da konbini; `:361-364` `JSON.stringify(roomShop) === JSON.stringify(konbiniShop)` contra `area=sala`, mesma seed, rodada 1, sem compras, **com `tech=corte` nas duas URLs (`:10`, `:347`)**, estado em que a rodada decide a oferta do upgrade Nv1→2 (`src/core/shop.ts:33`, `minRound(level + 1) <= round`) | a loja se comporta exatamente como antes (mesmas ofertas, preços, reroll e painel) | ✅ (rodada 3: gap fechado pela T30; KA e KB mortos. O painel segue comparado via `view`, gap menor aceito) |
| KON-03 | `world-traverse.smoke.mjs:305-318` `roundActive`, `round === 2`, `colOf === 3`, loja fechada; `run.test.ts:677` | próxima área + `roundStart(round+1)` + coluna 3 | ✅ |
| KON-04 | `run.test.ts:621-623`; `world-run.smoke.mjs:101-104` | sem `shopOpen` com `noshop` | ✅ |
| KON-05 | `world-traverse.smoke.mjs:263-274` nenhum inimigo vivo nem novo em 1 s; `stageArea.test.ts:162` | nenhum spawn na konbini | ✅ |

### P1: Spawn ao alcance num mapa maior

| AC | `file:line` + assertion | Valor da spec | Result |
| --- | --- | --- | --- |
| RCH-01 | `spawnPoint.test.ts:172-182`; `world-run.smoke.mjs:112-115` `maxSpawnDx <= 900` | fora da câmera e ≤ 900 px | ✅ |
| RCH-02 | `spawnPoint.test.ts:161,165` 900 sim, 901 não | limite inclusivo | ✅ |
| RCH-03 | `spawnPoint.test.ts:190-204` | o mais perto fora da câmera | ✅ |
| RCH-04 | `spawnPoint.test.ts:209-210` | `farthestPoint` | ✅ |
| RCH-05 | `spawnPoint.test.ts:230-248` | costas e gap sobre os candidatos | ✅ |

### P1: Sala de teste e compatibilidade

| AC | `file:line` + assertion | Valor da spec | Result |
| --- | --- | --- | --- |
| LEG-01 | `world-legacy.smoke.mjs:38-48,70-89` | `LEVEL_1`, intermission 2500 ms → shop | ✅ |
| LEG-02 | `stageArea.test.ts:172-176`; `world-legacy.smoke.mjs:94-102` | `fxlab` sempre sala | ✅ |
| LEG-03 | `scripts/smoke/run.mjs:89-97` `withLegacyRoom`; evidência indireta: os 35 smokes antigos passam (41/41) | `area=sala` acrescentado | ✅ (indireta, como na rodada 1) |
| LEG-04 | `stageArea.test.ts:178-...`; `world-legacy.smoke.mjs:105-117`; `world-traverse.smoke.mjs:63` | modular por padrão | ✅ |
| LEG-05 | `tests/game/debugApi.test.ts:95-108` forma do `area`, com os campos novos (`sheets`, `bands`, `seal`, `transitioning`, `fade`); campos lidos vivos nos smokes | campo `area` | ✅ |

### P2: Objetos sorteados nos slots

| AC | `file:line` + assertion | Valor da spec | Result |
| --- | --- | --- | --- |
| SLT-01 | `stageArea.test.ts:82-111`; `run.test.ts:716` `Rng(7 ^ 0x5be0cd19)` | 0,4/0,4/0,2 | ✅ |
| SLT-02 | `stageArea.test.ts:134`; `stage.test.ts:81` | ids fora do slot RNG | ✅ |
| SLT-03 | `stageArea.test.ts:118-121` | `c` e `b` fixos | ✅ |

### P2: Tema visual por módulo

| AC | `file:line` + assertion | Valor da spec | Result |
| --- | --- | --- | --- |
| THM-01 | `modules.test.ts:28`; `tiles.test.ts:74-79` | tema entre os 5 | ✅ |
| THM-02 | Tiles: `world-traverse.smoke.mjs:49-58,94-99` `area.sheets` `[{beco,'terrain-beco'},{parque,'terrain-parque'}]`, lido da textura do tile desenhado (`world.ts` `floorSheets`); `:238` konbini `terrain-konbini`; `:330-333` rodada 2. Fundo: mesma função, `area.bands` `{n,N}`, `{g,G}`, konbini `{N,s}` (lidos do objeto da camada próxima). Paleta: `tests/game/art/background.test.ts:10-16` `NEAR_COLORS` uma chave por tema e só chaves da `PALETTE`; `:18-27` `bandsFor` uma faixa por trecho com a cor do tema; `tiles.test.ts:50-55` | tiles com o tema, faixa com a cor do tema, só `PALETTE` | ✅ (gap 6 fechado; A6 morto: `"sheet":"terrain"`) |
| THM-03 | `world-traverse.smoke.mjs:100-102` `seal.texture === 'seal' && frame === 'seal' && alpha === 1` fechado; `world-exit.smoke.mjs:76-78` idem junto ao selo; `:114-141` a imagem some (`seal === null`) ao fim do efeito; `world-traverse.smoke.mjs:239` konbini `seal === null` | frame `seal` enquanto sólido; nada depois do efeito | ✅ (gap 7 fechado; SK morto) |

**Status**: ✅ **54/54** ACs com evidência que bate com a spec (rodada 3; na rodada 2 eram 53/54, com KON-02 em gap).

---

## Edge Cases

- [x] Player e último inimigo morrem no mesmo update → `gameOver`: `run.test.ts:690-697` `toEqual(['gameOver'])`
- [x] `exitReached()` duas vezes → uma transição: `run.test.ts:652-660`
- [x] Nova run depois de `gameOver` → área da rodada 1 da seed nova, player na coluna 3: `world-restart.smoke.mjs:31-43` (`roundActive`, rodada 1, vida cheia, `colOf === 3`, 2 módulos, largura exata, `sealed`); `:54-57` mesma seed repete os módulos; `:58-61` mesmo ponto de nascimento; `:62-66` dois `areaBuilt` iguais; `:68-75` com a seed do relógio também reconstrói. Gap 8 fechado: RA (o `Stage` antigo sobrevive à run nova) morto com "deveria repetir ["parque","rua"]: ["rua","beco"]"; RB (rodada 1 da run nova sem rebuild) morto com "esperava dois areaBuilt iguais"
- [x] `?debug&round=5` → `santuario`: `world-boss.smoke.mjs:161-166`
- [x] Objeto jogado além do selo aberto não chama `exitReached()`: `world-exit.smoke.mjs:158` `thrownMaxX > exitX` (a garrafa passou mesmo); `:159-162` `state === 'traverse'`, área `beco`, `player.x < exitX`. Gap 9 fechado. OC (qualquer prop além do `exitX` dispara a saída) morre; ele é pego antes, pela garrafa na mão do player parado junto ao selo (`:126-129`). OC2 (o mesmo, menos a prop da mão) morre na asserção do edge (`:159-162`: "um objeto além do selo não pode acionar a saída … konbini")
- [x] Vencer o chefe → `traverse` e o selo abre: `world-boss.smoke.mjs:187-195`

---

## Discrimination Sensor

Isolamento: `git worktree add --detach <scratchpad>/verifier2-wt HEAD` (`75624a7`), com junction `node_modules` para o
repo real. Cada mutação foi aplicada por um script que exige o padrão exato no arquivo e é revertida com
`git checkout -- src` antes da próxima. Execução: `node scripts/smoke/run.mjs <cenário>`, com o build no worktree.
Linha de base no worktree sem mutação: os 6 `world-*` ok. No fim, a junction foi desfeita, o worktree removido com
`git worktree remove --force` e ele não aparece mais em `git worktree list`. `git status --porcelain` do repo real
antes e depois: `?? .claude/`, `?? BRIEF-FABLE.md`, `?? SKILL.md`, idêntico (`diff` vazio).

| # | Mutação | File | Result | Morto por |
| --- | --- | --- | --- | --- |
| A5 | TRV-10: `inputFor` sem `!this.area.transitioning` (input cru na transição) | `src/scenes/TestScene.ts:451` | ✅ Killed | `world-traverse` "TRV-10: com D apertada o player deveria só perder velocidade no fade de saída" (`dx` constante de 1,47) |
| A6 | THM-02: `sheetFor` sempre `TEX.terrain` | `src/scenes/test/world.ts:142` | ✅ Killed | `world-traverse` "THM-02 rodada 1: folhas de terreno por trecho: terrain" |
| KA | KON-02: no modular a loja nasce com `round + 1` (evento `shopOpen` intocado) | `src/scenes/test/shopDirector.ts:105` | ❌ **Survived** (rodada 2; morto na rodada 3, acima) | nenhum: `world-traverse` passou. Sonda descartável (cópia do `world-traverse` com `&tech=corte` nas duas URLs, só no worktree): passa no HEAD e **mata** o KA (a konbini oferece `corte` nível 1→2, que a sala não oferece na rodada 1). Não é equivalente |
| KB | KON-02: no modular a loja usa o `stageRng` em vez do `shopRng` | `src/scenes/test/shopDirector.ts:105` | ✅ Killed | `world-traverse` "KON-02: a loja da konbini difere da da sala" |
| RA | Edge nova run: `this.stage ??= new Stage(...)` (o `Stage` da run anterior continua) | `src/scenes/test/areaDirector.ts:71` | ✅ Killed | `world-restart` "a run nova com a mesma seed deveria repetir ["parque","rua"]: ["rua","beco"]" |
| RB | Edge nova run: o `roundStart(1)` da run nova não reconstrói (fica a área anterior) | `src/scenes/test/areaDirector.ts:78` | ✅ Killed | `world-restart` "esperava dois areaBuilt iguais (um por run)" |
| OC | Edge objeto: qualquer prop além do `exitX` chama `beginExit` | `src/scenes/test/areaDirector.ts:101` | ✅ Killed | `world-exit` "a área não deveria mudar ainda" (pego pela garrafa na mão, ao lado do selo) |
| OC2 | Edge objeto: o mesmo, menos a prop da mão | `src/scenes/test/areaDirector.ts:101` | ✅ Killed | `world-exit:159-162` "um objeto além do selo não pode acionar a saída" |
| BD1 | ARE-10: `setBounds(0, 0, widthPx + 32, …)` | `src/scenes/test/areaDirector.ts:125` | ✅ Killed | `world-traverse` "início da rodada 1: limites da câmera != área: width 1760 em 1728" |
| BD2 | ARE-10: `setBounds` com a largura da área anterior | `src/scenes/test/areaDirector.ts:121,125` | ✅ Killed | `world-traverse` "limites da câmera != área: width 1344 em 1728" (a do título) |
| HF | TRV-07: `finishExit` credita só `kind === 'fragment'` | `src/scenes/test/areaDirector.ts:154` | ✅ Killed | `world-exit` "TRV-07: vida 50 != min(100, 50 + 57) = 100" |
| SB | TRV-03: efeito do selo `sealBurnMs * 2` | `src/scenes/test/world.ts:122` | ✅ Killed | `world-exit` "TRV-03: o efeito do selo durou 801 ms (esperava 400)" |
| SK | THM-03: a imagem do selo não é destruída no fim do efeito | `src/scenes/test/world.ts:123` | ✅ Killed | `world-exit` "TRV-03: o efeito do selo durou 2327 ms" (a imagem não some) |

**Sensor depth**: expandido, todo por adaptador (smoke): A5 e A6 da rodada 1 reaplicados, mais 11 mutações novas,
cobrindo os 4 pedidos (a) KA/KB, (b) RA/RB, (c) OC/OC2, (d) BD1/BD2, e ainda HF, SB e SK.
**Result** (rodada 2): **12/13 mortos, 1 sobreviveu (KA)**, reprovado naquela rodada (KA morto na rodada 3). Os 24 mutantes unitários e os A1-A4 da rodada 1 não foram
refeitos: o código e os testes que eles mediam não mudaram desde `d442568`.

---

## Situação dos gaps da rodada 1

| # | Gap da rodada 1 | Situação | Evidência |
| --- | --- | --- | --- |
| 1 | MDL-03: linha e coluna nas quebras de MDL-01 | ✅ Fechado | `tests/core/module.test.ts:26-27,32-37,44-52` (mensagem exata) |
| 2 | ARE-10: limites da câmera | ✅ Fechado | `world-traverse.smoke.mjs:35-38`; BD1 e BD2 mortos |
| 3 | TRV-03: efeito de 400 ms | ✅ Fechado | `world-exit.smoke.mjs:139-141`; SB e SK mortos; 3/3 isolado |
| 4 | TRV-07: curas e Elixir | ✅ Fechado | `world-exit.smoke.mjs:190-204`; HF morto |
| 5 | TRV-10: input neutro e fade de entrada (A5) | ✅ Fechado | `world-traverse.smoke.mjs:198-214,252-262,292-304`; A5 morto |
| 6 | THM-02: tema por trecho e faixa (A6) | ✅ Fechado | `world-traverse.smoke.mjs:94-99,238,330-333`; `background.test.ts:10-27`; A6 morto |
| 7 | THM-03: frame do selo e sumiço | ✅ Fechado | `world-traverse.smoke.mjs:100-102,239`; `world-exit.smoke.mjs:76-78,114-141`; SK morto |
| 8 | Edge: nova run depois de `gameOver` | ✅ Fechado | `world-restart.smoke.mjs:31-75`; RA e RB mortos |
| 9 | Edge: objeto além do selo | ✅ Fechado | `world-exit.smoke.mjs:158-162`; OC e OC2 mortos |
| (KON-02) | Precisão de "exatamente como antes" | ⚠️ Parcial | A comparação com a sala existe e matou o KB, mas num estado em que o `round` não pesa: KA sobrevive (gap novo, abaixo) |

**9/9 fechados.** O gap de precisão de KON-02 (que na rodada 1 estava junto do Fix 4) virou uma comparação real, só que fraca demais.

---

## Spec-precision gaps restantes

- **KON-02 "panel"**: a spec diz "same … panel". O teste compara a `view` da loja (ofertas, nível, custo, vendido e reroll), não o painel desenhado. Como o `ShopPanel` não muda no diff e ele é desenhado a partir da mesma `view`, aceito como gap menor; não bloqueia sozinho.
- **TRV-10** tolera 11 a 19 quadros na saída da loja e 12 a 19 nos outros fades (~180-320 ms em volta de 250). A spec dá 250 ms sem tolerância. A folga é para o disparo dentro do quadro; aceito.
- **TRV-01** afirma o selo sólido só contra o player (inimigos e objetos usam o mesmo filtro de colisão); igual à rodada 1, aceito.
- **LEG-03** tem evidência indireta (os 35 cenários antigos passam); igual à rodada 1, aceito.

## SPEC_DEVIATION

`git diff 1c75d95..HEAD | grep SPEC_DEVIATION`: nenhum marcador.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code / sem escopo extra | ✅ (o código de produção só ganhou leituras para o snapshot de debug: `floorSheets`, `nearBands`, `sealView`, `setData('bands')`, `getBounds`) |
| Surgical changes | ✅ |
| Matches patterns | ✅ (campos de snapshot lidos do objeto vivo do Phaser, como L-043 pede) |
| Spec-anchored outcome check | ⚠️ KON-02 (KA) |
| Per-layer Coverage Expectation | ✅ núcleo 1:1 (L-010); adaptadores com valor vivo (L-043), menos o `round` da loja na konbini |
| Every test maps to a spec requirement | ✅ |
| Documented guidelines followed | ✅ `vitest.config.ts`, `.oxlintrc.json`, L-010, L-043 |

---

## Fix Plans

Nenhum. O Fix 1 da rodada 2 (KON-02 não discrimina o `round`) foi feito pela T30 (`a6170b7`) e verificado nesta rodada.

---

## Requirement Traceability Update

| Requirement | New Status |
| --- | --- |
| MDL-01..10, ARE-01..13, TRV-01..10, KON-01..05, RCH-01..05, LEG-01..05, SLT-01..03, THM-01..03 | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 54/54 ACs batem com a spec | 6/6 edge cases com evidência
**Sensor**: rodada 3 2/2 mortos (KA, KB); acumulado rodada 2 + 3: 13/13 dos mutantes de adaptador da rodada 2 mortos
**Gate**: 2697 unit passaram; smokes 41/41

**Gaps menores aceitos** (não bloqueiam): painel de KON-02 comparado via `view`; tolerância de quadros do TRV-10;
TRV-01 só contra o player; LEG-03 indireto.

---

## Rodada 2 (resumo)

Rodada 2 (`d442568..75624a7`, relatório commitado em `9fd26d2`): **FAIL**. 53/54 ACs; os 9 gaps da rodada 1 fechados
(A5 e A6 mortos). Sensor 12/13: o KA (loja da konbini com `round + 1`) sobreviveu porque a comparação konbini × sala
rodava na rodada 1 sem técnica. Gate: 2697 unit e 41/41 smokes. Virou a fix task T30 (Phase 6).

## Rodada 1 (resumo)

Rodada 1 (`1c75d95..408c79e`, relatório commitado em `d442568`): **FAIL**. 46/54 ACs ok, 8 com gap: MDL-03, ARE-10,
TRV-03, TRV-07 (P1), TRV-10 (P1), KON-02, THM-02 e THM-03. Mais 2 edge cases sem evidência (nova run depois de
`gameOver` e objeto além do selo). Sensor 28/30: os 24 mutantes unitários M1-M22 (com M4b e M6b) e os A1-A4 de
adaptador morreram; A5 (TRV-10, input cru na transição) e A6 (THM-02, `sheetFor` fixo) sobreviveram. Gate: 2694 unit e
39/39 smokes. Viraram as fix tasks T26-T29 (Phase 5).
