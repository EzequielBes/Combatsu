# Arma imbuída — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/arma-imbuida/spec.md`
**Design**: `.specs/features/arma-imbuida/design.md` (abordagem A)
**Plano**: `docs/plano-builds-e-habilidades.md` (linha F36 da seção 6; seção 5.4; decisão 5 da seção 7, confirmada)
**Base**: F29 `fundacao-de-poder`, F30 `vermelho-e-corpo`, F31, F32 `chefes-com-afixos`, F33 `eixos-das-tecnicas`, F34
e F35 `vagas-e-talentos` mergeadas antes da T1: o passo 1 já usa o `AXIS_ITEMS` da F33 e o passo 2 o
`PlayerStrikes.prepare(hit, target)` e o `StrikeMods.marks.unblockable` da F35. O branch de arte
`feat/arte-armas-imbuidas` (`ce6e03c`, worktree `wt-armas`) entra na base antes da Fase 8; a F36 não redesenha as folhas
`weapon-fx-*`, só liga.
**Status**: Draft
**Branch**: `feat/arma-imbuida` (a partir da base acima)
**Ferramentas**: nenhuma MCP. Skill só o `tlc-spec-driven`. As tarefas com arte ou efeito em movimento (T35, T36, T37,
T38, T39, T48) conferem no jogo em HD (`?hd=1`), parado e correndo, para os dois lados (memória "Conferir animação em
movimento"), e rodam em Opus 5.5 ou Fable, nunca Sonnet. A prancha das folhas de efeito é
`tools/weapon-fx-boards.mjs` (do `wt-armas`, `143125f`/`ce6e03c`; saída em `.fable-out/`).

Regras que valem para toda tarefa (CLAUDE.md): um commit por tarefa, só os arquivos dela (nunca `git add -A`), `npm run
gate` verde antes do commit; smoke só do que foi tocado; smoke novo com `?debug&hd=1&area=modular`; tetos de 400 linhas
efetivas por arquivo, 80 por função e complexidade 15; arquivo novo nunca entra no `.oxlintrc.json`; teste da lista de
exceções do `max-lines` não cresce (caso novo vai para arquivo novo: `tests/core/shop.test.ts` e `techShop.test.ts` não
crescem, a arma vai ao `weaponShop.test.ts`). **IMB-06 em toda tarefa**: `src/scenes/TestScene.ts` sem linha efetiva
líquida nova, `src/data/moves.ts` com 397 linhas e nenhum campo novo em `src/game/Player.ts`; a T76 confere o total.
**Nada automático**: nenhuma evolução, ponto ou efeito novo sai sem compra, escolha ou golpe do jogador. Linha efetiva =
sem linha em branco e sem comentário. As linhas citadas no design valem para `2bc1102`/`ce6e03c`; os nomes da F30 a F35
são reconferidos no começo de cada fase.

**Decisões do usuário que travam tarefas** (o executor para e pergunta antes da tarefa, não durante):

| Antes de | Pergunta | Origem |
| --- | --- | --- |
| T1 | Abordagem A do design e as assumptions marcadas `n` na spec (golpe do traço, ×1,2 fixo, Kokusen com o Bastão, janela de anulação, sangramento, varredura, derrubada, Nuvem, Toji, catalisador, preços). Este arquivo segue as escolhas padrão; trocar alguma muda a tarefa que a cita | design, "Status" |
| T1 | Sangramento a cada 600 ms com a Sangria somando 1 no tique (spec, achado da revisão: a 300 ms do plano a Lâmina Nv 1 passa de 2× o ganho das outras armas no modelo do WPN-05 e quebra o teste) ou os 300 ms do plano (o WPN-05 cai e a Lâmina vira a escolha óbvia) | spec, assumption do sangramento |
| T1 | Lança: o bloqueio também abre o Contra (LNC-04, achado da revisão: sem isso a Lança soma ~1% do dano fora do chefe) ou só o texto do plano | spec, assumption "Lança e o bloqueio" |
| T1 | O cenário 6 do `power.smoke.mjs` (T-POW-11 da F29) já está na base? Se não, a troca do bastão pela cadeira vai à tarefa da F29 que o cria e a T1 vira só conferência | design, risco do `power.smoke` |
| T28 | Eixo Derrubada com o Peso do Corpo ≥ 2 (que já derruba todo comum): (a) como está, com a carta avisando `já derruba (Corpo)`; (b) o 2º ponto vira "+400 ms no chão" (`Hit.downMs`) | design, risco "Usuário" da Derrubada |
| T36 | Escala do arco do Bastão: `R / 32` (spec WFX-02; texel torto a 1,875/2,5/3,125), 3 folhas de arco a 1 px por texel no `wt-armas`, ou escala inteira 2 | design, risco "Usuário" 1 |
| T36 | Âncora do rastro da Lâmina: o centro do giro da arte no ponto de partida (spec) ou o meio do `handTrail` (`t = 0,5`) se o arco descolar do braço | design, risco "Usuário" 2 |
| T38 | Ícone da `BuildBar` (24 px): o quadro `common` das folhas `bound-*` (spec) ou um quadro `icon` próprio (~20×20, a arma na diagonal) em cada folha; com `icon`, a T38 desenha os 3 quadros e a assumption da spec é trocada no mesmo commit | design, risco "Usuário" 3 |

---

## Test Coverage Matrix

> Guidelines: `CLAUDE.md` (camadas, gate, smoke só do que foi tocado, HD como base, arte só pronta depois de olhar a
> prancha e o movimento), `.oxlintrc.json` (tetos e listas de exceção), `vitest.config.*`, `package.json` (`gate`,
> `test`, `smoke`); lições L-010 (limites nos dois lados), L-020 (provar a ausência na janela inteira), L-036, L-043
> (testar o adaptador, não só a regra), L-047, L-055 e L-070 (ler do objeto vivo), L-074 (`flipX` nos dois lados),
> L-076 (campo de debug que repete a entrada não prova o efeito). Amostras: `tests/core/arsenal.test.ts`,
> `tests/core/statSheet.test.ts` (F29), `tests/core/axisBuild.test.ts` (F30), `tests/core/noMathRandom.test.ts`,
> `tests/game/hdWeapons.test.ts`, `scripts/smoke/arsenal.smoke.mjs`, `scripts/smoke/power.smoke.mjs`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Regra pura (`src/core/**`) | unit | 1:1 com os ACs; todo edge case listado; limites nos dois lados (L-010): 599/600/601 ms do tique; 1200 (tique) e 1800 ms (nada) com Corte 0; leves a cada 250 ms sem atrasar o tique; 119/120 e 239/240 ms dos extras; 2999/3000 ms da supressão; 99/100 ms da janela; 2 e 3 pontos no eixo; 3 e 4 no total; r3 e r4 do 3º ponto; r1 e r2 da arma nova; R 60/80/100 da varredura | `tests/core/*.test.ts` (arquivo novo por sistema novo) | `npm test` |
| Números e tabelas (`src/data/**`) | unit | Tabelas do WPN-02 e do `WEAPON` linha a linha; catálogo com a Lança por último e as 3 evoluções antes dela; o sorteio das seeds de hoje igual enquanto a Lança fica fora do catálogo | `tests/data/*.test.ts` | `npm test` |
| Arte em código (`src/game/art/hd/**`) | unit + prancha | `bound-spear` só com chaves da `PALETTE`, ≥ 14 px de largura, mais alta que a lâmina; conferência na prancha (`tools/hd-boards.mjs`) | `tests/game/hdWeapons.test.ts` | `npm test` |
| Vistas do motor (`src/game/WeaponFx.ts`, `src/game/BuildBar.ts`, `src/game/CursedFx.ts`) | smoke + conferência em movimento | Textura, quadro, `scale`, `flipX`, `originX` e `depth` lidos do `Sprite` vivo (L-043, L-055, L-070, L-074); conferência em HD, parado e correndo, dois lados | `scripts/smoke/weapon-imbued.smoke.mjs` | `npm run smoke -- weapon-imbued` |
| Adaptadores (`src/scenes/**`, `src/game/player/**`, `src/game/boss/**`, `src/game/Boss.ts`) | smoke | Efeito lido do jogo vivo pelo snapshot (HP, `state`, `projectiles`, `bleed`, `damageNumbers`, eventos), nunca só o parâmetro de entrada (L-076); refatoração com os smokes de antes iguais | `scripts/smoke/{weapon-imbued,weapon-evolution,arsenal}.smoke.mjs` e os smokes de cada tarefa | `npm run smoke -- <trecho>` |
| Tipos de snapshot (`src/game/arsenalSnapshot.ts`, `src/game/debugApi.ts`) | unit | Literal do `debugApi.test.ts` com `arsenal` novo e `bleed` | `tests/game/debugApi.test.ts` | `npm test` |
| Documentação (`README.md`, `.specs/**`) | none | build gate only | - | `npm run gate` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tarefa só com teste unitário (regra pura, dados, arte, tipo) | `npm run gate` |
| Full | Tarefa de adaptador, vista do motor ou regra que muda o jogo vivo | `npm run gate && npm run smoke -- <cada trecho da tarefa>` |
| Build | Fim de fase | `npm run gate` e os smokes do passo ("Smokes por passo" do design) |

Base de testes: a contagem no começo da T1 (anotar). Nenhuma tarefa apaga teste sem mover o caso, exceto os casos do
modelo antigo que a própria tarefa remove (T3: `weaponDef`, a arma zerando a ferramenta, a ferramenta recusada com
arma; T5: `BOUND_NAMES`), que dizem quais saem; cada tarefa informa a nova contagem. Smokes instáveis: `armed` (ARM-12)
e timeouts sob carga: repetir isolado antes de suspeitar.

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order. Setas anotadas "(fase N)" são dependências para trás, só para leitura.

### Phase 1: Passo 0 — a arma sai da mão

```
T1 → T2 → T3 → T4 → T6
T3 → T5 → T6
T2 → T7
T3 → T8
```

### Phase 2: Passo 1 — eixos e multiplicador, regra pura

```
T9 → T10 → T11 → T13 → T14
T10 → T12
```

### Phase 3: Passo 1 — eixos da arma no jogo

```
T15 → T16 → T18
T15 → T17 → T18
T15 → T19
T20
T11 → T15 (fase 2)
T12 → T15 (fase 2)
T7 → T20 (fase 1)
T14 → T20 (fase 2)
```

### Phase 4: Passo 2 — golpe da arma e sangramento, regra pura

```
T21
T22
T13 → T21 (fase 2)
```

### Phase 5: Passo 2 — Lâmina no jogo

```
T23 → T24 → T26 → T27
T25 → T27
T21 → T23 (fase 4)
T22 → T26 (fase 4)
```

### Phase 6: Passo 3 — Bastão

```
T28 → T29 → T30
T21 → T28 (fase 4)
T24 → T29 (fase 5)
```

### Phase 7: Passo 4 — Lança

```
T31 → T33
T32 → T33
T24 → T32 (fase 5)
T26 → T33 (fase 5)
```

### Phase 8: Passo 5 — rastro e impacto (com a arte na base)

```
T34 → T35 → T36 → T39
T35 → T37 → T39
T38 → T39
T26 → T35 (fase 5)
T33 → T37 (fase 7)
```

### Phase 9: Passo 6 — loja da arma, regra pura

```
T40 → T41 → T42 → T43 → T44 → T45
T40 → T45
T41 → T46
T47
T13 → T40 (fase 2)
T15 → T42 (fase 3)
T16 → T43 (fase 3)
T15 → T47 (fase 3)
```

### Phase 10: Passo 6 — loja e `BuildBar` no jogo

```
T49 → T50 → T51 → T53
T50 → T53
T48 → T53
T52 → T53
T47 → T48 (fase 9)
T38 → T48 (fase 8)
T46 → T50 (fase 9)
T44 → T52 (fase 9)
```

### Phase 11: Passo 7 — evoluções, regra pura

```
T54 → T55
T54 → T56
T54 → T57
T58
T59
T10 → T54 (fase 2)
T28 → T57 (fase 6)
T31 → T58 (fase 7)
```

### Phase 12: Passo 7 — evolução na loja e no baú, regra pura

```
T60 → T61 → T62 → T63
T64
T54 → T60 (fase 11)
T46 → T60 (fase 9)
T55 → T61 (fase 11)
T44 → T63 (fase 9)
T55 → T64 (fase 11)
```

### Phase 13: Passo 7 — evoluções no jogo

```
T65 → T66
T65 → T67
T65 → T68
T65 → T69
T56 → T65 (fase 11)
T57 → T65 (fase 11)
T63 → T66 (fase 12)
T50 → T66 (fase 10)
T64 → T67 (fase 12)
T58 → T69 (fase 11)
```

### Phase 14: Passo 7 — Arsenal de Toji e fechamento

```
T70 → T71 → T76
T70 → T73 → T76
T72 → T73
T70 → T74 → T76
T70 → T75 → T76
T65 → T70 (fase 13)
T59 → T70 (fase 11)
```

---

## Task Breakdown

### Phase 1: Passo 0 — a arma sai da mão

#### T1: Cenário 6 do `power.smoke` com a cadeira do mapa

**What**: o cenário 6 do `power.smoke.mjs` (T-POW-11 da F29: objeto com o peso da F29 e `round(X × 1,3)` com as
Manoplas) deixa de usar `arsenal=bastao` na mão e passa a pegar a cadeira do mapa (o objeto do mundo continua `Prop` com
o mesmo `PROP_TRAITS`), para a T2 poder tirar a arma da mão sem quebrar a F29.
**Where**: `scripts/smoke/power.smoke.mjs`
**Depends on**: None
**Reuses**: o pegar objeto do `held-item.smoke.mjs`; ajudantes de `scripts/smoke/fight-kit.mjs`
**Requirement**: IMB-01

**Done when**:

- [ ] O cenário 6 não tem `arsenal=bastao`; o número esperado com as Manoplas continua `round(X × 1,3)` sobre o dano do
      objeto
- [ ] `npm run smoke -- power` verde; o arquivo não passa de ~367 linhas
- [ ] Gate verde; contagem igual à base

**Tests**: smoke
**Gate**: full
**Commit**: `test(smoke): swing the map chair in the prop weight scenario`

---

#### T2: `ArsenalDirector` sem `Prop` da arma

**What**: saem o campo `bound`, `discardBound`, o ramo da arma do `onRoundStart` e os imports de `Prop` e `weaponDef`;
o `onRoundStart` só entrega a ferramenta pendente quando o player está de mãos vazias (com ou sem arma) e não faz nada
com algo na mão (a ferramenta continua pendente). O `arsenal.smoke.mjs` é reescrito em HD (`hd=1`): `arsenal=bastao,
manoplas` deixa `arsenal.weapon === 'bastao'`, `player.heldProp` nulo e `build.points.lutador` 2, no mapa padrão e no
modular; `arsenal=lamina,faca` entrega a faca na mão com a Lâmina equipada e `arsenal.tool` volta a `null`.
**Where**: `src/scenes/test/arsenalDirector.ts`
**Depends on**: T1
**Reuses**: `runDirector.applyRunCommand('roundStart')` (`runDirector.ts:69`, já chama `arsenal.onRoundStart()`)
**Requirement**: IMB-01, IMB-04

**Done when**:

- [ ] `grep -n "Prop\|weaponDef\|bound" src/scenes/test/arsenalDirector.ts` vazio
- [ ] `arsenal.smoke.mjs` reescrito como acima, com `heldProp` lido do player vivo
- [ ] Smokes `arsenal`, `held-item`, `drops` e `power` verdes
- [ ] Gate verde; contagem sem perda

**Tests**: smoke
**Gate**: full
**Commit**: `feat(arsenal): keep the bound weapon out of the hand`

---

#### T3: `Arsenal` com a arma imbuída

**What**: em `core/arsenal.ts` saem `WEAPON_KEYS`, `WEAPON_TEXTURES`, `weaponDef` e o import de `TOOL_DEFS`/`PropDef`;
`Arsenal.weapon` passa a `{ id: WeaponId; evolution: WeaponEvolutionId | null } | null` (sem `level`; o tipo
`WeaponEvolutionId`, literal das 3 evoluções da spec, nasce no `data/arsenal.ts` nesta tarefa e muda para o
`data/weapons.ts` na T11, com o import trocado);
`buy(id)` equipa a arma só com o slot vazio (id de arma repetido ignorado, WDB-01) e **não** zera a ferramenta pendente
(sai a l.42); `levelOf` vale só para a relíquia (arma devolve 0); `arsenalEligible` oferece a ferramenta com
`pendingTool === null` e a trava, com ou sem arma; `arsenalPreview` da arma passa ao texto provisório `imbuída`. Os
leitores de `arsenal.weapon.level` que o compilador apontar (`core/build.ts:57-60`: a arma soma 1 na build dela;
`core/shop.ts:367`; o snapshot do `arsenalDirector`: `weaponLevel` 1) passam ao formato novo.
**Where**: `src/core/arsenal.ts`
**Depends on**: T2
**Reuses**: `Arsenal` de hoje (relíquia, nível, trava, preço)
**Requirement**: IMB-04, IMB-05, WDB-01

**Done when**:

- [ ] `tests/core/arsenal.test.ts` refeito: a compra da arma mantém a ferramenta pendente; a ferramenta é elegível com
      arma; `arsenal=lamina,lamina` deixa a Lâmina sem nível e `manoplas,manoplas` sobe a relíquia ao Nv 2; saem os casos
      do `weaponDef` e da ferramenta recusada com arma (listados no commit)
- [ ] `tests/game/hdWeapons.test.ts` confere as folhas `bound-blade`/`bound-staff` como arte, sem importar `weaponDef`
- [ ] `tests/core/build.test.ts`: a arma soma 1 na build dela
- [ ] Smokes `arsenal`, `shop` e `build` verdes
- [ ] Gate verde; contagem informada (casos removidos listados)

**Tests**: unit + smoke
**Gate**: full
**Commit**: `refactor(arsenal): store the imbued weapon as id and evolution`

---

#### T4: Dados do arsenal sem fator de arma

**What**: em `data/arsenal.ts` as armas perdem o `tool` (`cursedClub`/`cursedKnife`, l.29-30), `ARSENAL_TUNING` perde
`weaponFactor` (l.52) e o comentário do topo troca "arma vinculada: fica na mão" por "arma imbuída: guardada, muda os
golpes". O `weaponCost` fica até a T41.
**Where**: `src/data/arsenal.ts`
**Depends on**: T3
**Reuses**: —
**Requirement**: IMB-05

**Done when**:

- [ ] `grep -rn "weaponFactor" src` vazio
- [ ] `tests/data/*` e `tests/core/arsenal.test.ts` verdes sem mudança de número
- [ ] Gate verde; contagem igual

**Tests**: unit
**Gate**: quick
**Commit**: `refactor(data): drop the bound weapon damage factor`

---

#### T5: `armed.ts` sem `BOUND_NAMES`

**What**: sai `BOUND_NAMES` (`boundClub`, `boundKnife`, l.14-18) e o `propName` passa a ler só `PROP_NAMES` (l.24).
**Where**: `src/core/armed.ts`
**Depends on**: T3
**Reuses**: `PROP_NAMES`
**Requirement**: IMB-05

**Done when**:

- [ ] `tests/core/armed.test.ts` sem os casos `boundClub`/`boundKnife` (listados) e com os objetos do mundo iguais
- [ ] `grep -rn "BOUND_NAMES\|boundClub\|boundKnife" src` vazio
- [ ] Smokes `armed` (repetir isolado se falhar, ARM-12) e `held-item` verdes
- [ ] Gate verde; contagem informada

**Tests**: unit + smoke
**Gate**: full
**Commit**: `refactor(core): drop the bound weapon prop names`

---

#### T6: Teste de fonte da arma vinculada

**What**: teste novo que varre todo `.ts` de `src/` pelo `import.meta.glob` com `?raw` (molde do
`noMathRandom.test.ts`) e falha se algum citar `weaponDef`, `WEAPON_KEYS`, `WEAPON_TEXTURES`, `BOUND_NAMES`,
`weaponFactor`, `boundClub` ou `boundKnife`.
**Where**: `tests/core/boundWeaponGone.test.ts`
**Depends on**: T4, T5
**Reuses**: `tests/core/noMathRandom.test.ts`
**Requirement**: IMB-05

**Done when**:

- [ ] O teste passa na base e falha se um dos 7 nomes for posto num arquivo de `src/` (conferido à mão e desfeito)
- [ ] Gate verde; contagem = base + 1 arquivo

**Tests**: unit
**Gate**: quick
**Commit**: `test(core): guard against the bound weapon coming back`

---

#### T7: Smoke `weapon-imbued`, cenário de mãos vazias

**What**: smoke novo `weapon-imbued.smoke.mjs` (`?debug&hd=1&area=modular`), cenário IMB com
`seed=1&maxAlive=1&enemyGuard=0&arsenal=bastao&tech=vermelho`: no começo da rodada `player.heldProp` é `null`; `J J` dá
`move:jab` e `move:direto`; a tecla do slot conjura o Vermelho; com a cadeira do mapa na mão, a mesma tecla dá
`techDenied:busy` e `J` balança a cadeira. As tarefas seguintes acrescentam cenários a este arquivo.
**Where**: `scripts/smoke/weapon-imbued.smoke.mjs`
**Depends on**: T2
**Reuses**: `scripts/smoke/fight-kit.mjs`, `scripts/smoke/lib.ts`, o pegar objeto do `held-item.smoke.mjs`
**Requirement**: IMB-01, IMB-02, IMB-03

**Done when**:

- [ ] Os 4 fatos acima lidos do jogo vivo (eventos e `heldProp`), não do parâmetro
- [ ] `npm run smoke -- weapon-imbued` verde
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `test(smoke): prove the weapon leaves the moveset intact`

---

#### T8: Decisão de projeto da arma imbuída

**What**: a AD da arma imbuída (texto em "Tech Decisions" do design) entra no `.specs/STATE.md` com o próximo número
livre (conferir se a F34 e a F35 já tomaram a AD-028 e a AD-029).
**Where**: `.specs/STATE.md`
**Depends on**: T3
**Reuses**: formato das AD de hoje
**Requirement**: IMB-01, IMB-06

**Done when**:

- [ ] A AD nova está acima do `## Handoff`, com número único (`grep -c "### AD-0NN"` = 1)
- [ ] `python3 <skill>/scripts/validate_state.py` sem erro
- [ ] Gate verde

**Tests**: none
**Gate**: build
**Commit**: `docs(state): record the imbued weapon decision`

---

### Phase 2: Passo 1 — eixos e multiplicador, regra pura

#### T9: Lança no `ARSENAL`, fora do catálogo

**What**: `WeaponId` ganha `'lanca'` e `lanca: { id: 'lanca', kind: 'weapon', name: 'Lança Invertida do Céu', build:
'lutador' }` entra por último no `ARSENAL`; o `ARSENAL_SHOP_ENTRIES` do `data/shop.ts` filtra a Lança, para o
`GAME_SHOP_CATALOG` e o sorteio de todas as seeds ficarem iguais até a T46 (só o debug `arsenal=lanca` a equipa).
**Where**: `src/data/arsenal.ts`
**Depends on**: None
**Reuses**: entradas `bastao`/`lamina`
**Requirement**: WSH-01, WDB-01

**Done when**:

- [ ] `tests/data/shop.test.ts`: o catálogo tem os mesmos ids e a mesma ordem da base
- [ ] `arsenal=lanca` equipa a Lança (caso novo em `tests/core/arsenal.test.ts`)
- [ ] Gate verde; contagem = base + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(data): add the inverted heavenly spear outside the shop`

---

#### T10: Registro de eixos aceita item com teto e preço próprios

**What**: em `data/techAxes.ts` (F33), `ItemAxes` passa a ter
`branches`, `branchNames` e `awakenings` opcionais e os campos opcionais `axisCap` (padrão `AXIS_CAP` 3), `pointCap`
(padrão `ITEM_POINT_CAP` 5) e `price` (padrão o `axisPoint` do `PRICING`). Nenhuma entrada nova no `AXIS_ITEMS`.
**Where**: `src/data/techAxes.ts`
**Depends on**: T9
**Reuses**: `ItemAxes`, `AXIS_ITEMS` da F33
**Requirement**: WPN-01, WPN-02

**Done when**:

- [ ] `tests/data/techAxes.test.ts` (F30/F33) verde sem mudança de número; os leitores de `branches` tratam o opcional
      (typecheck)
- [ ] Gate verde; contagem igual

**Tests**: unit
**Gate**: quick
**Commit**: `refactor(data): let an axis item carry its own caps and price`

---

#### T11: `data/weapons.ts`

**What**: arquivo novo com os tipos `LaminaAxisId`, `BastaoAxisId`, `LancaAxisId`, `WeaponAxisId`, `WeaponTrait`,
`WeaponEvolutionId` (o placeholder da T3 passa a vir daqui); `WEAPON_AXES` na ordem do WPN-02; `WEAPON_AXIS_NAMES`;
`WEAPON_TRAIT = { lamina: 'light', bastao: 'heavy', lanca: 'counter' }`; `WEAPON` com os números do design (`mul 1.2`,
`axisCap 2`, `pointCap 3`, `newPrice 22`, `newRound 2`, `point {16, 6}`, `evolutionCost 60`, blocos `lamina`, `bastao`,
`lanca`, `nuvem`, `toji`); `WEAPON_ICON` (só chaves de textura); `WEAPON_AXIS_ITEMS: Record<WeaponId, ItemAxes>`
(`axisCap 2`, `pointCap 3`, `price: WEAPON.point`, sem ramo). No mesmo commit, `AxisItem` do `data/techAxes.ts` ganha
`WeaponId` e `AxisId` ganha `WeaponAxisId` (`import type`; o typecheck do `WEAPON_AXIS_ITEMS` pede junto). Sem `phaser`.
**Where**: `src/data/weapons.ts`
**Depends on**: T10
**Reuses**: molde de `data/techAxes.ts`
**Requirement**: WPN-01, WPN-02

**Done when**:

- [ ] `tests/data/weapons.test.ts` (novo): ordem dos 9 eixos (WPN-02), nomes únicos, `WEAPON` linha a linha com a spec,
      `WEAPON_AXIS_ITEMS` com teto 2/3 e preço 16/6 para as 3 armas, `WEAPON_ICON` com `bound-blade`, `bound-staff`,
      `bound-spear`
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(data): tabulate imbued weapon axes and numbers`

---

#### T12: `AxisBuild` com teto por item e sem ramo opcional

**What**: `axisCap(item)` e `pointCap(item)` leem o registro; `canAdd`, `offerable` e `focusAxis` usam os dois (o 3º
ponto num eixo e o 4º no total da arma são recusados sem mudar nada); `add` só põe o item na fila `pending` e só liga o
Despertar quando o registro tem `branches`; `level(item)` continua `1 + total`.
**Where**: `src/core/axisBuild.ts`
**Depends on**: T10
**Reuses**: `AxisBuild` da F30/F33/F35
**Requirement**: WPN-01

**Done when**:

- [ ] `tests/core/axisBuild.test.ts` (F30/F33) verde sem mudança nos casos das técnicas e do Corpo
- [ ] Casos novos com item sintético `{axisCap: 2, pointCap: 3}` e sem `branches`: nível 1/2/3/4 com 0 a 3 pontos; 2º e
      3º ponto no mesmo eixo (aceito/recusado); 3º e 4º no total (aceito/recusado, sem mudar o estado); nunca fica
      `pending`
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): cap axis points per registered item`

---

#### T13: `core/weaponStats.ts` — traço, multiplicador e resolução dos eixos

**What**: arquivo novo com `weaponTraitOf(move)` (`counter` vence `strength`), `hasTrait(id, move)`,
`weaponStrikeMul(weapon, t)` (`t.object` → 1; traço da arma → `WEAPON.mul`; senão 1) e `resolveWeapon(id, points,
evolution)` com os campos de `WeaponStats` do design (Lâmina `reachPx`, `bleed`; Bastão `sweepPx`, `minTargets`,
`knockdown`, `forceMul`; Lança `reachPx`, `maxTargets`, `nullifyMs`); `unblockable`, `nuvem` e `toji` ficam `false` até
a T57. Sem `phaser` (AD-001). Mais o teste de equilíbrio entre armas (WPN-05) sobre o modelo de referência da spec.
**Where**: `src/core/weaponStats.ts`
**Depends on**: T11
**Reuses**: `MeleeTraits` (F29), `MoveDef`, `WEAPON`
**Requirement**: WPN-03, WPN-04, WPN-05

**Done when**:

- [ ] `tests/core/weaponAxes.test.ts` (novo): `weaponTraitOf` do `jab`, `cotovelada`, `contra` e `contraGancho`;
      `weaponStrikeMul` das 3 armas × leve/forte/contra/objeto; `resolveWeapon` com 0/1/2 pontos em cada eixo (alcance
      10/18/26 e 0/16/32, pilhas 1/2/3, duração 1500/2000/2500, `flat` da Sangria 0/1/2, `tickMs` 600, R 60/80/100, derrubada none/unarmed/armed,
      força 1/1,25/1,5, alvos 1/2/3, janela 0/100/200)
- [ ] `tests/data/weaponBalance.test.ts` (novo): o modelo de referência da spec (ritmo da seção 5.6, 0,25 bloqueio/s,
      alvo único e grupo de 3) com os números do `WEAPON`; ganho no melhor cenário de cada arma no Nv 1 até 1,5× o de
      cada outra e acima de zero nos dois cenários; o caso com `tickMs` 300 fora do teto, para a escolha ficar visível
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): resolve imbued weapon traits and axes`

---

#### T14: `statSheet.meleeMul` com o fator da arma

**What**: `MeleeTraits.object?: boolean`; `PROP_TRAITS` ganha `object: true`; `meleeMul` multiplica
`weaponStrikeMul(arsenal.weapon, t)` entre `relicStrikeMul` e `vowStrikeMul` (o Impacto da F30 fica onde está).
**Where**: `src/core/statSheet.ts`
**Depends on**: T13
**Reuses**: `meleeMul` (F29/F30)
**Requirement**: WPN-03, WPN-04

**Done when**:

- [ ] `tests/core/weaponAxes.test.ts`: `meleeMul` do `jab` com a Lâmina = 1,2 × sem arma e da `cotovelada` igual;
      Bastão o inverso e o `contra` igual; Lança só `contra`/`contraGancho`; ordem entre relíquia e votos provada pelo
      `Math.round` com Manoplas Nv 3 e um voto de dano; `meleeMul(PROP_TRAITS)` igual com e sem Bastão; Kokusen
      (`KOKUSEN_TRAITS`) com e sem Bastão, número explícito
- [ ] `tests/core/statSheet.test.ts`: a grade do POW-01.3 sem arma igual (`toBe`)
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): multiply the weapon trait strikes in the stat sheet`

---

### Phase 3: Passo 1 — eixos da arma no jogo

#### T15: Armas no `AXIS_ITEMS`

**What**: `AXIS_ITEMS = { ...técnicas e Corpo, ...WEAPON_AXIS_ITEMS }`. Conferir no começo quem itera o registro (carta,
bandeja, página de ponto, baú): a arma só conta como dona pela `ownsAxisItem` (T16), então nenhum desses passa a
mostrar a arma nesta tarefa.
**Where**: `src/data/techAxes.ts`
**Depends on**: T11, T12
**Reuses**: `WEAPON_AXIS_ITEMS`
**Requirement**: WPN-01, WDB-02

**Done when**:

- [ ] `tests/core/axisBuild.test.ts`: com `lamina` real, nível 1 a 4, 3º ponto no eixo e 4º no total recusados, nunca
      `pending`
- [ ] `tests/core/axisParam.test.ts`: `axes=lamina.corte:3` corta em 2; `lamina.xyz:1` some
- [ ] Smokes `shop-axes`, `choice-panel` e `build-bar` verdes e iguais
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(data): register the imbued weapons as axis items`

---

#### T16: `ownsAxisItem`

**What**: `ownsAxisItem(item, loadout, arsenal)` em `core/shopEligibility.ts`: técnica equipada, Corpo sempre, arma
equipada (`arsenal.weapon?.id === item`). O `axisEligible` continua como está até a T43, para a loja não vender ponto de
arma com o preço de técnica entre os passos (desvio consciente da tabela do passo 1 do design).
**Where**: `src/core/shopEligibility.ts`
**Depends on**: T15
**Reuses**: regra de dono da F30
**Requirement**: WDB-02, WSH-05

**Done when**:

- [ ] Casos novos (em arquivo novo `tests/core/weaponOwnership.test.ts` se o teste da F30 estiver na exceção): arma
      equipada dona, outra arma não, técnica e Corpo como antes
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): tell when the player owns a weapon axis item`

---

#### T17: Snapshot do arsenal em arquivo à parte

**What**: `game/arsenalSnapshot.ts` (novo) com `ArsenalSnapshot` (`relic`, `relicLevel`, `weapon`, `weaponLevel`,
`weaponAxes`, `evolution`, `tool`; o `fx` entra na T35) e `BleedSnapshot`; o `debugApi.ts` importa o tipo (−6 linhas);
`ArsenalDirector.snapshot()` devolve `weaponLevel = axes.level(id)` (0 sem arma), `weaponAxes` `{eixo: pontos}` (`{}`
sem arma) e `evolution` (`null`).
**Where**: `src/game/arsenalSnapshot.ts`
**Depends on**: T15
**Reuses**: tipo de snapshot à parte da F29 (POW-13)
**Requirement**: WDB-04

**Done when**:

- [ ] `tests/game/debugApi.test.ts`: literal com o `arsenal` novo
- [ ] Smoke `arsenal`: `weaponLevel` 1 e `weaponAxes` `{corte: 0, fio: 0, sangria: 0}` com `arsenal=lamina`
- [ ] Gate verde; `debugApi.ts` não cresce

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(debug): report weapon axes in the arsenal snapshot`

---

#### T18: `axes=` da arma

**What**: `axisDirector.applyDebug` (F30) usa `ownsAxisItem` para aceitar o eixo de arma equipada; o teto vem do `add`
em laço (excesso ignorado); arma não equipada e eixo desconhecido ignorados.
**Where**: `src/scenes/test/axisDirector.ts`
**Depends on**: T16, T17
**Reuses**: `parseAxesParam`, `applyDebug` da F30
**Requirement**: WDB-01, WDB-02, WDB-04

**Done when**:

- [ ] Smoke `arsenal`: `arsenal=lamina&axes=lamina.corte:2,lamina.fio:2` dá `weaponAxes` `{corte: 2, fio: 1,
      sangria: 0}` e `weaponLevel` 4; `axes=lamina.corte:1` sem `arsenal=lamina` deixa `weaponAxes` `{}`;
      `arsenal=lamina,lamina` dá `weaponLevel` 1
- [ ] Smokes `red-axes` e `shop-axes` verdes e iguais
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(debug): place weapon axis points from the url`

---

#### T19: A build conta o nível da arma

**What**: `core/build.ts` passa a somar `axes.level(id)` da arma na build dela (Nv 1 a 4), no lugar do 1 fixo da T3.
**Where**: `src/core/build.ts`
**Depends on**: T15
**Reuses**: soma do arsenal na build
**Requirement**: WPN-01

**Done when**:

- [ ] `tests/core/build.test.ts`: Bastão com 0 e 3 pontos soma 1 e 4 em `lutador`
- [ ] Smoke `build` verde
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(core): count the weapon level in its build`

---

#### T20: Smoke do multiplicador da arma

**What**: cenário WPN no `weapon-imbued`: com `arsenal=lamina&maxAlive=1&enemyGuard=0`, o `jab` tira `round(1,2 ×` o
dano de sem arma`)` (medido pela queda de HP do comum vivo) e a `cotovelada` tira o mesmo de sem arma; com
`arsenal=bastao`, a cadeira do mapa tira o mesmo dano de sem arma (WPN-04).
**Where**: `scripts/smoke/weapon-imbued.smoke.mjs`
**Depends on**: T7, T14
**Reuses**: medida de dano do `power.smoke.mjs`
**Requirement**: WPN-03, WPN-04

**Done when**:

- [ ] Os 3 números lidos do HP do alvo vivo, com o caso sem arma no mesmo arquivo como referência
- [ ] `npm run smoke -- weapon-imbued` e `power` verdes
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `test(smoke): prove the weapon trait multiplier in a live fight`

---

### Phase 4: Passo 2 — golpe da arma e sangramento, regra pura

#### T21: `weaponStrike`, `strikeShape` e `targetsFor`

**What**: em `core/weaponStats.ts`: `weaponStrike(stats, move, base)` (com o traço soma `reachPx`, multiplica `force`
pelo `forceMul`, põe `sweepPx`, `maxTargets` como o maior entre golpe, `base` e arma, e `marks.unblockable` quando a
`stats` o tem; sem o traço devolve `base` igual), `strikeShape(shape, mods)` (só `widenForward` nesta tarefa; a
varredura entra na T28) e `targetsFor(moveMax, modsMax)`. `StrikeMods` em `core/statSheet.ts` ganha `sweepPx?`,
`maxTargets?` e `targetMarks?` (três campos opcionais, coeso com a função que os preenche).
**Where**: `src/core/weaponStats.ts`
**Depends on**: T13
**Reuses**: `widenForward` (F30, `core/cursedBody.ts`), `StrikeMods`
**Requirement**: LMN-01, LNC-01, LNC-03

**Done when**:

- [ ] `tests/core/weaponStrike.test.ts` (novo): Lâmina soma 10/18/26 ao alcance do Corpo com a borda de trás fixa; Lança
      0/16/32 e alvos 1/2/3 no `contra`; `contra` mantém `unblockable` com e sem a Lança; `jab` com o Bastão devolve o
      `base` igual (`toBe` por campo); `targetsFor(2, 3)` = 3, `targetsFor(undefined, 3)` = `undefined`
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): shape the weapon trait strike`

---

#### T22: `BleedBook`

**What**: `core/bleed.ts` (novo) com relógio injetado: `apply(id, spec, nowMs)` (abre com `startMs = nowMs` ou soma
1 pilha até `maxStacks`; nos dois casos `endMs = nowMs + durationMs`, sem mexer no `startMs`; guarda o `spec`),
`update(nowMs, hpMul)` (um tique em cada `startMs + k × tickMs ≤ endMs` ainda não entregue, `round((perStack × stacks
+ flat) × hpMul)`; sai quando `nowMs > endMs`), `view(id)` (`{0, 0}` sem sangramento), `drop`, `prune(liveIds)`,
`reset`.
**Where**: `src/core/bleed.ts`
**Depends on**: None
**Reuses**: molde de relógio injetado das regras puras
**Requirement**: LMN-02, LMN-03, LMN-05

**Done when**:

- [ ] `tests/core/bleed.test.ts` (novo): 599/600/601 ms; Corte 0 e um leve: tique em 1200, fim em 1500, nada em 1800;
      aplicações a cada 250 ms: um tique a cada 600 ms (o relógio não reinicia); 3 aplicações com `maxStacks` 2 dão 2
      pilhas e levam o fim adiante; `hpMul` 1 e 1,48 dão 2 e 3; `flat` 1 com 2 pilhas dá 5; o `spec`
      guardado não muda com outra arma; `prune` tira o id morto sem tique; dois `apply` no mesmo `nowMs` somam 2 até o
      teto
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): track bleed stacks and ticks`

---

### Phase 5: Passo 2 — Lâmina no jogo

#### T23: `PlayerStrikes` lê a forma e os alvos do `StrikeMods`

**What**: em `openHitbox`, o `widenForward(shape, mods.reachPx)` da F30 vira `strikeShape(shape, mods)` (mesma linha) e
o `maxTargets` vira `targetsFor(move.maxTargets, mods.maxTargets)`; no `prepare(hit, target)` da F35, depois do crítico,
`mods.targetMarks?.(target)` é espalhado no `Hit` (+1). Nenhum ramo novo no `updateStrikes` nem no `onMove`.
**Where**: `src/game/player/strikes.ts`
**Depends on**: T21
**Reuses**: `AttackHitbox.open(..., maxTargets)` e o `TargetGate` (`hitbox.ts:77-129`)
**Requirement**: LMN-01, IMB-06

**Done when**:

- [ ] Smokes `fight`, `targets`, `impact` e `cursed-body` verdes e iguais (sem arma nada muda)
- [ ] `oxlint` sem subir a complexidade do `updateStrikes`/`onMove`; `Player.ts` sem campo novo
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(player): read strike shape and targets from the strike mods`

---

#### T24: `WeaponDirector` no golpe

**What**: `scenes/test/weaponDirector.ts` (novo) com `stats()` (refeito por quadro de `arsenal.weapon` e
`loadout.axes`) e `strikeMods(move, base)` (`weaponStrike`); `ArsenalDirector` ganha `readonly weapon = new
WeaponDirector(s)`; `StatsDirector.strikeMods` termina em `this.s.arsenal.weapon.strikeMods(move, mods)`. Cenário
Lâmina-alcance no `weapon-imbued`: um comum a 8 px além do alcance do `jab` leva com `arsenal=lamina` e não leva sem.
**Where**: `src/scenes/test/weaponDirector.ts`
**Depends on**: T23
**Reuses**: `StatsDirector.strikeMods` (F29/F30)
**Requirement**: LMN-01, IMB-06

**Done when**:

- [ ] Cenário acima com o HP do comum vivo; com `axes=lamina.fio:2` o comum a 24 px além leva (L-047: 1 px além de 26
      não leva)
- [ ] Smokes `weapon-imbued`, `fight` e `power` verdes; `TestScene` sem linha
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(weapon): let the imbued weapon change its trait strikes`

---

#### T25: `enemyEntry` e `bossEntry` fora do `debugSnapshot`

**What**: refatoração: a montagem da entrada de cada comum e do chefe sai do `debugSnapshot` (função na exceção, 151
linhas) para `enemyEntry(e)` e `bossEntry()`; o snapshot fica igual.
**Where**: `src/scenes/test/snapshot.ts`
**Depends on**: None
**Reuses**: `debugSnapshot` de hoje
**Requirement**: WDB-05

**Done when**:

- [ ] `tests/game/debugApi.test.ts` verde sem mudança; o `debugSnapshot` encolhe ~40 linhas
- [ ] Smokes `boot`, `hud` e `boss` verdes e iguais
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(debug): extract the enemy and boss snapshot entries`

---

#### T26: Sangramento no jogo

**What**: `scenes/test/weaponHits.ts` (novo) com o tique (`receiveHit` com `band: 'chip'`, `tech: true`, sem `techId`,
`unblockable: true`, `force: 0`;
aceito, `effects.onTechConnect`; fora do `combat.onConnect`) e o `prune` pelos ids vivos; `WeaponDirector.onMeleeHit`
(só golpe do `MOVES` e do traço: objeto do mundo não tem `moveName`) põe a pilha e `update(dt)` chama o `WeaponHits`;
`ArsenalDirector.onMeleeHit`/`update` repassam; `combat.onConnect` chama `this.s.arsenal.onMeleeHit(hit, point,
target)` logo depois do `build.onMeleeHit` (+1) e `TechDirector.update` chama `this.s.arsenal.update(dt)` (+1).
Cenário Lâmina-sangramento no `weapon-imbued`.
**Where**: `src/scenes/test/weaponHits.ts`
**Depends on**: T24, T22
**Reuses**: `Hit.band`, `effects.onTechConnect`, `DamageNumbers` (F29), `s.clockMs`, `hpMul` da rodada (F30)
**Requirement**: LMN-02, LMN-03, LMN-04, WPN-04, IMB-06

**Done when**:

- [ ] Smoke: com `arsenal=lamina`, depois do `jab` o HP do comum desce de novo sem golpe e o `damageNumbers.last.kind`
      é `chip`; `ce.cur` e o combo não sobem no tique (L-036); com a cadeira do mapa e a Lâmina, nenhum tique; com
      `enemyGuard=1`, o tique tira HP do comum de guarda levantada (a guarda resolve antes da faixa); `J J J` seguidos
      deixam sair tique durante o combo (o relógio não reinicia)
- [ ] Smokes `weapon-imbued`, `fight`, `impact` e `hud` verdes; `combat.ts` +1 linha, `techDirector.ts` +1 linha
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(weapon): bleed the target of the blade light strikes`

---

#### T27: `bleed` no snapshot

**What**: `enemyEntry` e `bossEntry` ganham `bleed: weapon.bleedOf(id)`; `debugApi.ts` tipa `bleed: BleedSnapshot` no
comum e no chefe. Cenário no `weapon-imbued`: `bleed.stacks` 1 depois do `jab`, `msLeft` descendo, `{0, 0}` depois do
fim e depois da morte do alvo (LMN-05).
**Where**: `src/scenes/test/snapshot.ts`
**Depends on**: T25, T26
**Reuses**: `BleedSnapshot` (T17)
**Requirement**: WDB-05, LMN-05

**Done when**:

- [ ] `tests/game/debugApi.test.ts`: literal com `bleed`
- [ ] Smoke: os 3 fatos acima; com `axes=lamina.corte:1`, 3 `jab` dão `stacks` 2
- [ ] Smokes `weapon-imbued`, `boot` e `boss` verdes
- [ ] Gate verde

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(debug): report bleed on enemies and boss`

---

### Phase 6: Passo 3 — Bastão

#### T28: Varredura, derrubada e peso do Bastão

**What**: em `core/weaponStats.ts`: `sweepShape(shape, R)` (borda de trás em −R, frente no maior entre a borda e R,
altura igual), `strikeShape` aplica a varredura depois do `widenForward`, `knockdownFor(level, {isBoss, armed})`,
`bastaoTargetMarks(stats, playerX, facing, target)` (`knockdown: true` só quando liga, sem a chave quando não liga;
`direction.x = −facing` no alvo de trás), e o `weaponStrike` multiplica a força pelo `1 + 0,25 × peso` e põe
`maxTargets ≥ 3` no forte sem contra.
**Where**: `src/core/weaponStats.ts`
**Depends on**: T21
**Reuses**: `widenForward`, `HitboxShape`
**Requirement**: BST-01, BST-02, BST-03, BST-04, BST-05

**Done when**:

- [ ] `tests/core/weaponStrike.test.ts`: `sweepShape` com R 60/80/100 (bordas nos dois lados de cada valor, L-010);
      `knockdownFor` nos 3 níveis × armado/desarmado/chefe; `bastaoTargetMarks` sem a chave `knockdown` no armado com
      Derrubada 1 (a `rasteira` continua derrubando) e com `direction.x = −facing` só no alvo de trás, nos dois `facing`; força 1/1,25/1,5 sobre o `forceMul` da F29 e o Peso do
      Corpo; `contra` com o Bastão sem varredura
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): sweep and weigh the staff heavy strike`

---

#### T29: Smoke da varredura do Bastão

**What**: cenários no `weapon-imbued` com `arsenal=bastao&maxAlive=2&enemyGuard=0`: comum atrás a 50 px leva a
`cotovelada` e o `x` dele se afasta do player (BST-05); com `axes=bastao.arco:2`, um comum a 95 px atrás leva e um com a borda do corpo 1 px além dos 100 px não
leva (L-047); o comum na frente e atrás da hitbox leva um acerto só (contagem de `damageNumbers` por id, BST-04); com
`axes=bastao.peso:2` o deslize do comum é maior que com 0.
**Where**: `scripts/smoke/weapon-imbued.smoke.mjs`
**Depends on**: T28, T24
**Reuses**: posicionamento de comum do `targets.smoke.mjs`
**Requirement**: BST-01, BST-03, BST-04, BST-05

**Done when**:

- [ ] Os fatos acima lidos do HP, da posição e dos números do alvo vivo
- [ ] Smokes `weapon-imbued`, `targets`, `enemy-` e `fight` verdes
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `test(smoke): prove the staff sweep behind the player`

---

#### T30: Derrubada do Bastão por alvo

**What**: `WeaponDirector.strikeMods` põe `targetMarks = (t) => bastaoTargetMarks(stats, player.x, player.facing,
sideOf(t))` no forte do Bastão (`armed` por `Enemy.weapon`, `isBoss` por `instanceof Boss`). Cenário no
`weapon-imbued`: com `axes=bastao.derrubada:1` o comum desarmado vai a `ragdoll` e o armado (`armed=club`) não; com 2
pontos os dois; o chefe nunca.
**Where**: `src/scenes/test/weaponDirector.ts`
**Depends on**: T29
**Reuses**: `prepare(hit, target)` (F35, ligado na T23), AD-021
**Requirement**: BST-02

**Done when**:

- [ ] Os 4 fatos lidos do `state` do alvo vivo; com Derrubada 1, a `rasteira` no armado continua derrubando (a marca
      não apaga o `knockdown` do golpe)
- [ ] Smokes `weapon-imbued`, `armed` (isolado se falhar) e `boss` verdes
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(weapon): knock down commons with the staff`

---

### Phase 7: Passo 4 — Lança

#### T31: `NullifyWindow`

**What**: `core/weaponTimers.ts` (novo) com `NullifyWindow`: `open(shape)`, `close(nowMs, afterMs)`, `isOpen(nowMs)`
(no `active` ou `nowMs − fim < afterMs`), `shape`, `reset`.
**Where**: `src/core/weaponTimers.ts`
**Depends on**: None
**Reuses**: —
**Requirement**: LNC-02

**Done when**:

- [ ] `tests/core/weaponTimers.test.ts` (novo): aberta no `active`; com `afterMs` 100 aberta em 99 e fechada em 100 ms
      depois do fim; com 0 fecha no fim; `reset` fecha
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): time the spear nullify window`

---

#### T32: Alcance e perfuração da Lança, e o Contra no bloqueio

**What**: `WeaponDirector.onDefense(kind)` (com a Lança e `block`, `player.counter.open('contra',
COUNTER.windowMs)`), `ArsenalDirector.onDefense` repassa e `combat.onDefense` chama `this.s.arsenal.onDefense(kind)`
logo depois do `build.onDefense` (+1). Cenários no `weapon-imbued` com `arsenal=lanca`: com `enemyGuard=1&maxAlive=1`
o bloqueio de frente deixa `player.counter` aberto e `J` dá `move:contra`, sem a Lança nenhuma janela (LNC-04); com `axes=lanca.estocada:2` o Contra acerta um comum 30 px
além do alcance de hoje e não 33 px; com `axes=lanca.perfuracao:2` o Contra acerta 3 comuns em fila (`maxAlive=3`);
com `enemyGuard=1` o Contra passa pela guarda com e sem a Lança (LNC-03).
**Where**: `src/scenes/test/weaponDirector.ts`
**Depends on**: T24
**Reuses**: parry e Contra do `defense.smoke.mjs`, `player.counter`, `COUNTER.windowMs`
**Requirement**: LNC-01, LNC-03, LNC-04

**Done when**:

- [ ] Os fatos acima lidos do HP dos comuns vivos e do `player.counter` do snapshot; `combat.ts` +1 linha; `Player.ts`
      sem campo novo
- [ ] Smokes `weapon-imbued` e `defense` verdes
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(weapon): open the counter on block with the spear`

---

#### T33: Anulação de projétil

**What**: `WeaponDirector.onStrikePhase(name, phase)` abre a `NullifyWindow` no `active` do Contra com a Lança e fecha
com `nullifyMs` no fim; `ImpactFx.onStrikePhase` repassa a fase (+1, l.135); `WeaponHits.update` apaga cada
`Projectile` vivo cujo retângulo toca a área do Contra (`strikeShape` no centro do player de agora, virada pelo
`facing`, `rectsTouch` da F33), com `destroyNow()` e o evento `nullify:<kind>`. Se o `width` público da F31 não estiver
na base, expor `width`/`height` no `Projectile.ts` (+2). Cenário no `weapon-imbued` com
`round=5&bossArch=oni&bossAffix=none&arsenal=lanca&axes=lanca.anulacao:1`.
**Where**: `src/scenes/test/weaponHits.ts`
**Depends on**: T31, T32, T26
**Reuses**: `rectsTouch` (F33), `Projectile.destroyNow`, `kind`
**Requirement**: LNC-02

**Done when**:

- [ ] Smoke: parry na rajada, Contra, e o `projectile` que toca a área no `active` e chegaria ao corpo no `recovery`
      some com `nullify:projectile` e o `hp` do player igual; sem a Lança o mesmo projétil tira `hp` (o projétil que
      chega no `startup`/`active` não serve de prova: o Contra já não leva dano, CNT-11, `defense.ts:96-100`); Contra
      sem inimigo perto também anula
- [ ] Smokes `weapon-imbued`, `defense` e `boss` verdes
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(weapon): nullify boss projectiles with the spear counter`

---

### Phase 8: Passo 5 — rastro e impacto (com a arte na base)

#### T34: `CursedFx.track` público

**What**: `track<T>(o: T): T` público em `game/CursedFx.ts`; o `add` privado (l.293) passa a chamá-lo; o objeto entra
no `live`, conta no `canSpawnParticle` e some no `destroyAll`.
**Where**: `src/game/CursedFx.ts`
**Depends on**: None
**Reuses**: conjunto vivo do `CursedFx`
**Requirement**: WFX-04

**Done when**:

- [ ] Smokes `impact`, `feel` e `fxlab` verdes e iguais
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(fx): expose cursed fx tracking for other sprites`

---

#### T35: `WeaponFx` e o impacto da arma

**What**: `game/WeaponFx.ts` (novo) com `trail(...)`, `impact(weapon, at, facing)` (4 quadros de 50 ms, âncora do
impacto, `FX_DEPTH + 1`, `cursedFx.track`, `false` com o teto cheio) e `debug()` lido do sprite vivo;
`WeaponDirector.onMeleeHit` toca o impacto da arma por cima do amaldiçoado e emite `weaponFx:<arma>:impact`;
`ArsenalSnapshot.fx: WeaponFxSnapshot`.
**Where**: `src/game/WeaponFx.ts`
**Depends on**: T34, T26
**Reuses**: `WEAPON_FX`, `weaponFxTex` (`wt-armas`), `canSpawnParticle`
**Requirement**: WFX-03, WFX-04

**Done when**:

- [ ] Smoke: com cada arma, o acerto do traço emite `weaponFx:<arma>:impact` e `arsenal.fx.last` tem a textura
      `weapon-fx-<arma>-impact`, `depth` acima do impacto amaldiçoado (L-070) e `flipX` verdadeiro virado para a
      esquerda e falso para a direita (L-074); com o conjunto vivo cheio (horda `maxAlive=8` em golpes seguidos, ou o
      gancho de debug que a tarefa expõe se a horda não encher) o HP desce e o vivo não passa de 40
- [ ] Conferência em HD do impacto, parado e correndo, dois lados
- [ ] Smokes `weapon-imbued`, `impact` e `feel` verdes
- [ ] Gate verde

**Tests**: smoke + conferência
**Gate**: full
**Commit**: `feat(fx): play the imbued weapon impact over the cursed one`

---

#### T36: Rastro da arma no golpe do traço

**What**: `ImpactFx.onStrikePhase` passa o corpo do `active` para `drawTrail(name, strength)`, que desenha o rastro
amaldiçoado como hoje e depois chama `this.s.arsenal.weapon.trail(name, start)` por cima; `WeaponDirector.trail` toca
`WeaponFx.trail` (4 quadros no `active`, `flipX` pelo `facing`, Lâmina e Lança a 1 px por texel na âncora do ponto de
partida, Bastão na escala decidida pelo usuário com a âncora no centro do player) e emite `weaponFx:<arma>:trail`;
com o teto cheio só o sprite da arma é pulado.
**Where**: `src/scenes/test/impactFx.ts`
**Depends on**: T35
**Reuses**: `strikeWorld`, `handTrail`
**Requirement**: WFX-01, WFX-02, WFX-04

**Done when**:

- [ ] Smoke: cada arma emite `weaponFx:<arma>:trail` no golpe do traço; o `jab` com o Bastão não emite nenhum
      `weaponFx:*` em toda a janela do golpe (L-020); `arsenal.fx.last.scale` do Bastão = a escala decidida; `originX`
      e `flipX` corretos nos dois lados; o rastro amaldiçoado do golpe do traço continua saindo com o `extraPx` da F29
      e o Alcance do Corpo (smokes `impact` e `cursed-body` iguais)
- [ ] `oxlint` com a complexidade do `onStrikePhase` descendo
- [ ] Conferência em HD dos 3 rastros, parado e correndo, dois lados
- [ ] Smokes `weapon-imbued`, `impact`, `feel`, `fxlab` e `fight` verdes
- [ ] Gate verde

**Tests**: smoke + conferência
**Gate**: full
**Commit**: `feat(fx): draw the imbued weapon trail on its trait strike`

---

#### T37: Impacto da Lança no projétil anulado

**What**: a anulação do `WeaponHits` toca `WeaponFx.impact('lanca', posição do projétil, facing)`.
**Where**: `src/scenes/test/weaponHits.ts`
**Depends on**: T35, T33
**Reuses**: `WeaponFx.impact`
**Requirement**: LNC-02

**Done when**:

- [ ] Smoke: depois do `nullify:projectile`, `arsenal.fx.last` tem `weapon: 'lanca'`, `part: 'impact'` e `x`/`y` no
      ponto do projétil (± 2 px)
- [ ] Conferência em HD do impacto no projétil
- [ ] Smokes `weapon-imbued` e `boss` verdes
- [ ] Gate verde

**Tests**: smoke + conferência
**Gate**: full
**Commit**: `feat(fx): flash the spear impact on a nullified projectile`

---

#### T38: Folha `bound-spear`

**What**: grade `SPEAR` (ponta para cima, haste longa, ponta preta de contorno branco como no rastro, só chaves da
`PALETTE`, ≥ 14 px de largura com as colunas vazias do molde do bastão) e `'bound-spear': art(SPEAR, grip)` no
`HD_WEAPONS`; comentário do topo vira "ícones das armas imbuídas". Com a decisão `icon` do usuário, também o quadro
`icon` nas 3 folhas.
**Where**: `src/game/art/hd/weapons.ts`
**Depends on**: None
**Reuses**: `art()`, `withOutline`, molde do `bound-staff`
**Requirement**: WFX-05

**Done when**:

- [ ] `tests/game/hdWeapons.test.ts`: `bound-spear` na paleta, ≥ 14 px, mais alta que a lâmina (e o quadro `icon` ≤ 24
      px, se escolhido)
- [ ] Prancha conferida (`node tools/hd-boards.mjs`)
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit + prancha
**Gate**: quick
**Commit**: `feat(art): draw the spear icon sheet`

---

#### T39: Conferência da arte da arma em movimento

**What**: conferência em HD, parado e correndo, para os dois lados, das 3 armas (rastro e impacto) e da prancha
`node src/game/art/hd/weaponFx/weapon-fx-boards.mjs`; aplica no `WeaponFx` o ajuste que a conferência pedir dentro das
decisões do usuário (escala do arco, âncora da Lâmina), trocando o WFX-02 da spec no mesmo commit se a âncora mudar.
**Where**: `src/game/WeaponFx.ts`
**Depends on**: T36, T37, T38
**Reuses**: —
**Requirement**: WFX-01, WFX-02, WFX-03

**Done when**:

- [ ] Capturas em HD dos 3 rastros e impactos para os dois lados olhadas (ponta do arco na borda da varredura, rastro
      preso ao braço, impacto por cima da estrela)
- [ ] Smokes `weapon-imbued`, `impact` e `fight` verdes
- [ ] Gate verde

**Tests**: smoke + conferência
**Gate**: build
**Commit**: `fix(fx): settle imbued weapon fx after the in-game review`

---

### Phase 9: Passo 6 — loja da arma, regra pura

#### T40: `core/weaponPreview.ts`

**What**: `weaponAxisLine(id, axis, points)` (as 9 linhas com o valor antes e depois, ≤ 20 caracteres),
`evolutionLine(willEvolve)` (`+ evolução` ou `null`) e `weaponNewPreview(id)` (texto do traço).
**Where**: `src/core/weaponPreview.ts`
**Depends on**: T13
**Reuses**: `resolveWeapon`
**Requirement**: WSH-04

**Done when**:

- [ ] `tests/core/weaponPreview.test.ts` (novo): as 9 linhas da tabela da spec (`Corte 1,5s→2s`, `Derrubada —→comum`,
      `comum→armado`, `Anulação +0→+100ms` ...), todas ≤ 20 caracteres; `evolutionLine` só com `true`
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): word the weapon axis card lines`

---

#### T41: Arma nova na regra do arsenal

**What**: `arsenalEligible` oferece arma nova só com o slot vazio e `round ≥ WEAPON.newRound`; `arsenalCost` da arma nova
= `WEAPON.newPrice`; `arsenalPreview` usa `weaponNewPreview`; sai `weaponCost` do `data/arsenal.ts` (l.43).
**Where**: `src/core/arsenal.ts`
**Depends on**: T40
**Reuses**: `arsenalEligible`, `arsenalCost`
**Requirement**: WSH-02, WSH-03, IMB-04

**Done when**:

- [ ] `tests/core/weaponShop.test.ts` (novo): arma nova recusada na r1 e com o slot ocupado, aceita na r2; custo 22
      antes da inflação; ferramenta elegível com arma
- [ ] `grep -rn "weaponCost" src` vazio
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): price and gate a new imbued weapon`

---

#### T42: Preço do ponto pelo registro

**What**: `axisPointPrice(item, points)` lê o `price` do registro (arma 16/22/28); a arma nova entra no `cardCost` com
o `inflate`.
**Where**: `src/core/shopPricing.ts`
**Depends on**: T41, T15
**Reuses**: `axisPointPrice`, `cardCost`, `inflate` (F30)
**Requirement**: WSH-02

**Done when**:

- [ ] `tests/core/weaponShop.test.ts`: pontos 16, 22 e 28 antes da inflação; arma nova na r2 = `round(22 × 1,06)` = 23;
      os preços das técnicas iguais (`tests/core/shopAxes.test.ts` verde)
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): price weapon axis points from the registry`

---

#### T43: Ponto de arma elegível

**What**: `axisEligible` passa a usar `ownsAxisItem` (a arma equipada vende ponto) com a trava `axisGate` (1º e 2º ponto
da r2, 3º da r4) e nunca oferece eixo com 2 pontos nem arma com 3.
**Where**: `src/core/shopEligibility.ts`
**Depends on**: T42, T16
**Reuses**: `axisGate` (F30), `AxisBuild.offerable`
**Requirement**: WSH-03

**Done when**:

- [ ] `tests/core/weaponShop.test.ts`: o 3º ponto recusado na r3 e aceito na r4; arma com 3 pontos sem carta; arma não
      equipada sem carta
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): offer weapon axis points in the shop`

---

#### T44: Sorteio da carta da arma

**What**: `DrawContext.arsenal`; a carta de ponto da arma oferece o eixo-foco e outro eixo livre por `axisRng` (ou só o
que sobra); "outro item dono" da carta 0 inclui a arma com eixo livre e a relíquia abaixo do Nv 3; o item-foco
automático não muda.
**Where**: `src/core/shopDraw.ts`
**Depends on**: T43
**Reuses**: `drawCards`, `axesFor`, `axisRng` (F30)
**Requirement**: WSH-04, WSH-05, WSH-06

**Done when**:

- [ ] `tests/core/weaponShop.test.ts`: 2 eixos com o foco primeiro; 1 só quando sobra um; arma e relíquia Nv 2 como
      "outro item dono"; ≥ 60% de foco da técnica de maior nível em 1000 seeds com 2 técnicas, Corpo, arma e relíquia
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): draw the weapon axis card`

---

#### T45: Texto e moldura da carta da arma

**What**: `axisPreview` (F30) chama `weaponAxisLine` quando o item é arma e acrescenta `evolutionLine` quando a compra
leva ao Nv 4 com o catalisador na build; `frameFor` (F35) ganha a arma (Nv 1 cinza, Nv 2 e 3 azul, Nv 4 roxo).
**Where**: `src/core/shopPreview.ts`
**Depends on**: T44, T40
**Reuses**: `axisPreview`, `frameFor`
**Requirement**: WSH-04, WSH-08

**Done when**:

- [ ] `tests/core/weaponPreview.test.ts`: linhas da carta da Lâmina com 2 eixos; `+ evolução` só com Faixas e o 3º
      ponto; moldura cinza, azul, azul, roxo
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): frame and word the weapon card`

---

#### T46: Entrada da arma e Lança no catálogo

**What**: entrada da arma com `maxLevel 4`, `cost.base 22`, `minRound(next)` = `newRound` no Nv 1 e `axisGate(next − 1)`
depois; `GAME_SHOP_CATALOG` termina com a Lança (o filtro da T9 sai do `ARSENAL_SHOP_ENTRIES` e a Lança entra no fim).
**Where**: `src/data/shop.ts`
**Depends on**: T41
**Reuses**: `ARSENAL_SHOP_ENTRIES`
**Requirement**: WSH-01

**Done when**:

- [ ] `tests/data/shop.test.ts`: último id = `lanca`; os ids antes dela na ordem da base
- [ ] Smokes `shop` e `shop-progress` verdes
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(data): put the spear at the end of the shop catalog`

---

#### T47: Vaga da arma na bandeja

**What**: em `core/buildTray.ts` (F35): pontinhos da arma = pontos de eixo (0 a 3); `buildBarText` com
`Arma Nv<1 + pontos>` e o nome da evolução na bandeja quando houver.
**Where**: `src/core/buildTray.ts`
**Depends on**: T15
**Reuses**: `BuildTray` (F35)
**Requirement**: WSH-07

**Done when**:

- [ ] `tests/core/buildTray.test.ts`: 3 pontinhos pelos pontos; `Arma Nv4` com 3 pontos; nome da evolução quando
      evoluída (estado montado à mão)
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): show the weapon points in the build tray`

---

### Phase 10: Passo 6 — loja e `BuildBar` no jogo

#### T48: Ícone da arma na `BuildBar`

**What**: o ícone da vaga da arma = `WEAPON_ICON[id]` no quadro decidido (T38); borda dourada `A` com a evolução.
**Where**: `src/game/BuildBar.ts`
**Depends on**: T47, T38
**Reuses**: ícones de 24 px da F35
**Requirement**: WSH-07, WFX-05

**Done when**:

- [ ] Smoke `build-bar`: a vaga da arma com `arsenal=lanca` lê a textura `bound-spear` e o texto `Arma Nv1` do objeto
      vivo
- [ ] Conferência em HD da barra com as 3 armas
- [ ] Gate verde

**Tests**: smoke + conferência
**Gate**: full
**Commit**: `feat(ui): show the imbued weapon icon in the build bar`

---

#### T49: Chave do livro da arma

**What**: `ledgerKeyOf(entryId)` no `core/spentLedger.ts` (F35): arma nova, ponto de eixo de arma e evolução de arma
gravam na chave da arma (o design o punha no `weaponEvolution.ts`, que só nasce na T55; o livro é dono da chave).
**Where**: `src/core/spentLedger.ts`
**Depends on**: None
**Reuses**: `SpentLedger` (F35)
**Requirement**: WSH-09

**Done when**:

- [ ] `tests/core/spentLedger.test.ts`: `lamina`, ponto `lamina.corte` e `laminaDividida` na chave `lamina`; técnicas
      como antes
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): key weapon spending to its slot`

---

#### T50: A loja grava a arma no livro

**What**: `shopDirector.recordBuy` grava pela `ledgerKeyOf` o que foi pago (com inflação).
**Where**: `src/scenes/test/shopDirector.ts`
**Depends on**: T49, T46
**Reuses**: `recordBuy` (F35)
**Requirement**: WSH-09

**Done when**:

- [ ] Smoke `build-bar`: com `fragments=200&round=4`, comprar a Lâmina e um ponto deixa o livro da arma com a soma paga
- [ ] Smokes `shop` e `build-bar` verdes
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(shop): record weapon spending in the ledger`

---

#### T51: Abandonar a arma limpa pontos e evolução

**What**: `ArsenalDirector.abandon(kind)` (limpa o slot, a evolução, `loadout.axes.resetItem(id)` e chama
`stats.sync()`); `trayDirector.abandon` chama `this.s.arsenal.abandon(kind)` na linha do `arsenal.clear(kind)`.
**Where**: `src/scenes/test/arsenalDirector.ts`
**Depends on**: T50
**Reuses**: `Abandonar` (F35, ABD-05)
**Requirement**: WSH-09

**Done when**:

- [ ] Smoke `build-bar`: abandonar a Lâmina com 2 pontos deixa `arsenal.weapon` nulo, `weaponAxes` `{}`, o livro da arma
      limpo, e uma Lâmina comprada de novo volta ao Nv 1; o sangramento posto antes continua até o fim (edge case)
- [ ] Smokes `build-bar` e `weapon-imbued` verdes
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(arsenal): clear weapon points when it is abandoned`

---

#### T52: A arma na página de ponto grátis e no baú

**What**: a lista de itens donos com eixo do `choiceDirector` (F33) passa a vir da `ownsAxisItem`, então a arma com eixo
livre entra na página de ponto grátis e na opção "2 pontos de eixo" do baú.
**Where**: `src/scenes/test/choiceDirector.ts`
**Depends on**: T44
**Reuses**: `ownsAxisItem`, `choicePages` (F33)
**Requirement**: WSH-05

**Done when**:

- [ ] Smoke `boss-chest` (ou `choice-panel`): com `arsenal=bastao` e a técnica no teto, a página de ponto oferece um
      eixo do Bastão e a escolha muda `arsenal.weaponAxes`
- [ ] Smokes `boss-chest` e `choice-panel` verdes
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(choice): offer weapon axes on free point pages`

---

#### T53: Smoke da loja da arma

**What**: cenário no `weapon-imbued` com `fragments=200&round=4&arsenal=lamina&axes=lamina.corte:1`: a carta da Lâmina
mostra 2 eixos com as linhas da spec e a moldura azul; `S` + `1` compra o 2º eixo e `weaponAxes` muda; na r2 sem arma,
a carta da Lança custa 23.
**Where**: `scripts/smoke/weapon-imbued.smoke.mjs`
**Depends on**: T48, T50, T51, T52
**Reuses**: compra por tecla do `shop-axes.smoke.mjs`
**Requirement**: WSH-04, WSH-08

**Done when**:

- [ ] Os fatos acima lidos do painel vivo e do snapshot
- [ ] Smokes `shop`, `shop-axes`, `shop-progress`, `build-bar`, `run-loop` e `weapon-imbued` verdes
- [ ] Gate verde

**Tests**: smoke
**Gate**: build
**Commit**: `test(smoke): buy weapon axis points in the shop`

---

### Phase 11: Passo 7 — evoluções, regra pura

#### T54: Receitas de arma

**What**: `WeaponRecipe` e `WEAPON_RECIPES` em `data/weapons.ts` (Lâmina + Faixas → `laminaDividida`, Bastão + Manoplas
→ `nuvemItinerante`, Lança + talento `contraAfiado` → `arsenalToji`), com `name` e `cost: WEAPON.evolutionCost`.
**Where**: `src/data/weapons.ts`
**Depends on**: T10
**Reuses**: `RelicId`, `PerkId`
**Requirement**: WEV-01

**Done when**:

- [ ] `tests/data/weapons.test.ts`: as 3 receitas, nomes e custo 60
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(data): list the weapon evolution recipes`

---

#### T55: `core/weaponEvolution.ts`

**What**: `weaponRecipeReady(r, s)` (arma do recibo, Nv 4, não evoluída, catalisador em qualquer nível),
`readyWeaponRecipes(s)` na ordem de `WEAPON_RECIPES` e `recipeOfWeapon(id)`.
**Where**: `src/core/weaponEvolution.ts`
**Depends on**: T54
**Reuses**: —
**Requirement**: WEV-01

**Done when**:

- [ ] `tests/core/weaponEvolution.test.ts` (novo): Nv 3 com Faixas não; Nv 4 sem Faixas não; Nv 4 com Faixas Nv 1 sim;
      evoluída não; as 3 receitas; catalisador comprado depois do Nv 4 deixa pronta (edge case)
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): tell when a weapon recipe is ready`

---

#### T56: `Arsenal.evolveWeapon`

**What**: `evolveWeapon(id)` guarda a evolução na arma equipada (mantém id; devolve `false` sem arma ou já evoluída) e o
`clear(kind)` da F35 apaga a evolução com o slot; abandonar o catalisador não toca na evolução.
**Where**: `src/core/arsenal.ts`
**Depends on**: T54
**Reuses**: `Arsenal`
**Requirement**: WEV-04

**Done when**:

- [ ] `tests/core/arsenal.test.ts`: evoluir mantém id; segunda evolução recusada; `clear('relic')` (catalisador) mantém
      a evolução; `clear('weapon')` apaga
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): evolve the equipped weapon`

---

#### T57: Efeitos das evoluções no `WeaponStats`

**What**: `resolveWeapon` liga `unblockable` (Lâmina Dividida), `nuvem` e `toji` pela evolução; `weaponStrike` põe
`marks.unblockable` no leve com a Lâmina Dividida.
**Where**: `src/core/weaponStats.ts`
**Depends on**: T54, T28
**Reuses**: `resolveWeapon`, `weaponStrike`
**Requirement**: WEV-05

**Done when**:

- [ ] `tests/core/weaponStrike.test.ts`: `unblockable` no `jab` só com a Lâmina Dividida; `cotovelada` sem; `nuvem` e
      `toji` só com a evolução certa
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): resolve weapon evolution effects`

---

#### T58: `ExtraHits`

**What**: `ExtraHits` em `core/weaponTimers.ts`: `schedule(id, firstDamage, nowMs)` agenda `round(0,5 × firstDamage)`
em +120 e +240 ms; `due(nowMs)` devolve os vencidos uma vez; `drop`, `prune`, `reset`.
**Where**: `src/core/weaponTimers.ts`
**Depends on**: T31
**Reuses**: `NullifyWindow` (mesmo arquivo)
**Requirement**: WEV-06

**Done when**:

- [ ] `tests/core/weaponTimers.test.ts`: 119/120 e 239/240 ms; dano ímpar arredondado; alvo podado não recebe; `due`
      não repete
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): schedule the travelling cloud extra hits`

---

#### T59: `AffixSuppression`

**What**: `core/affixSuppression.ts` (novo): `trigger(nowMs, ms = 3000)` (reinicia), `active(nowMs)`, `msLeft(nowMs)`,
`reset()`.
**Where**: `src/core/affixSuppression.ts`
**Depends on**: None
**Reuses**: —
**Requirement**: WEV-07

**Done when**:

- [ ] `tests/core/weaponEvolution.test.ts`: ativa em 2999 e não em 3000 ms; novo gatilho em 2000 estende até 4999
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): time the boss affix suppression`

---

### Phase 12: Passo 7 — evolução na loja e no baú, regra pura

#### T60: Evoluções de arma no catálogo

**What**: as 3 evoluções de arma entram no `GAME_SHOP_CATALOG` depois das Uniões e antes da Lança.
**Where**: `src/data/shop.ts`
**Depends on**: T54, T46
**Reuses**: entradas de evolução da F30/F33
**Requirement**: WEV-02

**Done when**:

- [ ] `tests/data/shop.test.ts`: ordem Uniões → 3 evoluções de arma → `lanca` por último
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(data): add weapon evolutions to the shop catalog`

---

#### T61: Evolução de arma elegível

**What**: a evolução de arma é elegível quando `readyWeaponRecipes` a lista.
**Where**: `src/core/shopEligibility.ts`
**Depends on**: T60, T55
**Reuses**: regra de evolução da carta 0 (EVO-01)
**Requirement**: WEV-02

**Done when**:

- [ ] `tests/core/weaponShop.test.ts`: elegível com a receita pronta; não elegível no Nv 3, sem catalisador e já
      evoluída
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): make a ready weapon evolution eligible`

---

#### T62: Preço da evolução de arma

**What**: a evolução de arma custa 60 antes da inflação no `cardCost`.
**Where**: `src/core/shopPricing.ts`
**Depends on**: T61
**Reuses**: `cardCost`, `inflate`
**Requirement**: WEV-02

**Done when**:

- [ ] `tests/core/weaponShop.test.ts`: 60 antes e `round(60 × fator)` depois da inflação numa rodada conhecida
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): price the weapon evolution card`

---

#### T63: Carta 0 com a evolução de arma

**What**: a carta 0 pega as receitas prontas na ordem do catálogo, com as Uniões de técnica primeiro.
**Where**: `src/core/shopDraw.ts`
**Depends on**: T62, T44
**Reuses**: regra EVO-01 da carta 0
**Requirement**: WEV-02

**Done when**:

- [ ] `tests/core/weaponEvolution.test.ts`: União pronta vence a evolução de arma; duas receitas de arma saem na ordem do
      catálogo
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): offer a ready weapon evolution on card zero`

---

#### T64: Opção `arma` no baú do chefe

**What**: `ChestOption` ganha `{ kind: 'arma'; id: WeaponEvolutionId }` (`chestOptionId` = `arma:<id>`);
`chestCandidates` recebe `readyWeaponRecipes`; `hasOpenAxis` conta a arma com eixo livre.
**Where**: `src/core/bossChest.ts`
**Depends on**: T55
**Reuses**: `chestCandidates` (F33)
**Requirement**: WEV-03, WSH-05

**Done when**:

- [ ] `tests/core/bossChest.test.ts`: receita pronta vira candidata grátis `arma:laminaDividida`; arma com eixo livre
      habilita "2 pontos de eixo"
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): list ready weapon evolutions in the boss chest`

---

### Phase 13: Passo 7 — evoluções no jogo

#### T65: `WeaponDirector.evolve` e `evo=`

**What**: `WeaponDirector.evolve(id)` (`Arsenal.evolveWeapon`, evento `weaponEvolved:<id>`, `stats.sync()`);
`ArsenalDirector.applyDebugEvolution()` lê `evo=` e evolui só com a receita pronta; `BuildDirector.applyDebugAxes`
chama `this.s.arsenal.applyDebugEvolution()` no fim (depois do `arsenal=`, do `perks=` e do `axes=`);
`ArsenalSnapshot.evolution` passa a vir da arma.
**Where**: `src/scenes/test/weaponDirector.ts`
**Depends on**: T56, T57
**Reuses**: `applyDebugAxes` (F30/F35)
**Requirement**: WEV-04, WDB-03, WDB-04

**Done when**:

- [ ] Smoke: `arsenal=lanca&perks=contraAfiado&axes=lanca.estocada:2,lanca.perfuracao:1&evo=arsenalToji` dá
      `arsenal.evolution` `arsenalToji`, `weaponLevel` 4 e `weaponAxes` iguais; o mesmo sem `perks=` dá `null`
- [ ] Smokes `weapon-imbued` (ou `weapon-evolution`, criado se o primeiro passar de 380 linhas) e `build` verdes
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(weapon): evolve the weapon from the url and the director`

---

#### T66: Compra da evolução de arma

**What**: `shopDirector.applyEvolution` manda a evolução de arma ao `arsenal.weapon.evolve(id)` e grava pela
`ledgerKeyOf`.
**Where**: `src/scenes/test/shopDirector.ts`
**Depends on**: T65, T63, T50
**Reuses**: `applyEvolution`
**Requirement**: WEV-02, WEV-04

**Done when**:

- [ ] Smoke: com `fragments=200` e a Lâmina no Nv 4 com Faixas, a carta 0 é a Lâmina Dividida; comprar emite
      `weaponEvolved:laminaDividida` e o livro da arma soma o pago
- [ ] Smokes `shop`, `evolution` e `build-bar` verdes
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(shop): buy a weapon evolution on card zero`

---

#### T67: Evolução de arma pelo baú

**What**: `choiceDirector.confirm` da opção `arma` chama `arsenal.weapon.evolve(id)` (grátis, sem livro).
**Where**: `src/scenes/test/choiceDirector.ts`
**Depends on**: T65, T64
**Reuses**: `confirm` (F33)
**Requirement**: WEV-03

**Done when**:

- [ ] Smoke `boss-chest`: com a receita pronta, a opção `arma:<id>` aparece e a escolha emite `weaponEvolved:<id>` sem
      tirar fragmentos
- [ ] Smokes `boss-chest` e `choice-panel` verdes
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(choice): evolve the weapon from the boss chest`

---

#### T68: Smoke da Lâmina Dividida

**What**: cenário com `arsenal=lamina,faixas&axes=lamina.corte:2,lamina.fio:1&evo=laminaDividida&enemyGuard=1`: o `jab`
passa a guarda do comum (HP desce com a guarda erguida); sem a evolução, o mesmo `jab` é segurado.
**Where**: `scripts/smoke/weapon-imbued.smoke.mjs`
**Depends on**: T65
**Reuses**: guarda do `enemy-guard`
**Requirement**: WEV-05

**Done when**:

- [ ] Os 2 fatos lidos do HP e do estado de guarda do comum vivo
- [ ] Smokes `weapon-imbued` (ou `weapon-evolution`) e `enemy-` verdes
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `test(smoke): prove the split soul blade ignores guard`

---

#### T69: Nuvem Itinerante

**What**: `WeaponDirector.onMeleeHit` agenda `ExtraHits` no forte sem contra com a Nuvem; `WeaponHits.update` entrega os
vencidos com `band: 'micro'`, `strength: 'heavy'`, `tech: true`, `unblockable: true` e o dano agendado, pulando o
alvo morto; troca de área e reset
descartam.
**Where**: `src/scenes/test/weaponHits.ts`
**Depends on**: T65, T58
**Reuses**: caminho do tique (T26)
**Requirement**: WEV-06

**Done when**:

- [ ] Smoke com `arsenal=bastao,manoplas&axes=bastao.arco:2,bastao.peso:1&evo=nuvemItinerante`: a `cotovelada` dá 3
      números no mesmo alvo, os 2 últimos `micro` com metade do 1º; alvo morto no 1º não recebe
- [ ] Smokes `weapon-imbued` (ou `weapon-evolution`), `impact` e `feel` verdes
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(weapon): repeat the staff heavy strike with the travelling cloud`

---

### Phase 14: Passo 7 — Arsenal de Toji e fechamento

#### T70: Supressão dos afixos no `BossDirector`

**What**: `BossDirector` (F32) ganha `suppression = new AffixSuppression()`, `suppressAffixes(nowMs)` (dispara ou
reinicia, evento `affixSuppressed`), `summon(phase)` não invoca enquanto ativa (a invocação perdida não volta) e
`reset()` zera; `WeaponDirector.onMeleeHit` chama `suppressAffixes` quando o Contra perfeito
(`CounterWindow.lastTakePerfect`, F35) acerta o chefe com o Toji.
**Where**: `src/scenes/test/bossDirector.ts`
**Depends on**: T65, T59
**Reuses**: `AffixSuppression`, `lastTakePerfect`
**Requirement**: WEV-07

**Done when**:

- [ ] Smoke com `round=5&bossAffix=invocador&arsenal=lanca&perks=contraAfiado&axes=...&evo=arsenalToji`: Contra
      perfeito no chefe emite `affixSuppressed`; a troca de fase nesse tempo não invoca; Contra não perfeito não emite
- [ ] Smokes `boss` e `boss-` verdes
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(boss): suppress affixes after a perfect counter with toji arsenal`

---

#### T71: Ígneo suprimido

**What**: com a supressão ativa, o `LavaField` não cria faixa nova e o contato das vivas não dá dano.
**Where**: `src/game/boss/LavaField.ts`
**Depends on**: T70
**Reuses**: `LavaField` (F32)
**Requirement**: WEV-07

**Done when**:

- [ ] Smoke com `bossAffix=igneo`: nos 3 s depois do `affixSuppressed`, nenhuma faixa nova e o `hp` do player igual sobre
      a lava; depois volta
- [ ] Smokes `boss-` e `boss` verdes
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(boss): quiet the igneous lava while affixes are suppressed`

---

#### T72: `beamBlocked` no ciclo do chefe

**What**: `BossAIObservation.beamBlocked` faz o ciclo pular o `beam`.
**Where**: `src/core/bossAI.ts`
**Depends on**: None
**Reuses**: ciclo com `beam` (F32)
**Requirement**: WEV-07

**Done when**:

- [ ] `tests/core/bossAI.test.ts` (ou arquivo novo se estiver na exceção): com `beamBlocked` o ciclo nunca escolhe
      `beam`; sem ele, igual à base
- [ ] Gate verde; contagem = anterior + os novos

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): skip the boss beam while it is blocked`

---

#### T73: Sangue Convergente suprimido

**What**: com a supressão ativa, o `BeamAttack` apaga o feixe em aviso ou ativo (`telegraphCancel`, sem hitbox) e o
`Boss` leva `beamBlocked` na observação.
**Where**: `src/game/boss/BeamAttack.ts`
**Depends on**: T70, T72
**Reuses**: `BeamAttack` (F32)
**Requirement**: WEV-07

**Done when**:

- [ ] Smoke com `bossAffix=sangue`: feixe em aviso some no `affixSuppressed` e nenhum começa nos 3 s
- [ ] Smokes `boss-` e `boss` verdes
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(boss): cancel the converging blood beam while suppressed`

---

#### T74: Adaptativo suprimido

**What**: `Boss.affixesSuppressed` (atribuído pelo diretor); `receiveHit` usa a escala 1 e não chama
`adaptation.onHit` enquanto vale.
**Where**: `src/game/Boss.ts`
**Depends on**: T70
**Reuses**: `Boss.adaptation` (F32)
**Requirement**: WEV-07

**Done when**:

- [ ] Smoke com `bossAffix=adaptativo`: o mesmo golpe repetido nos 3 s tira o dano cheio e o registro de adaptação não
      muda
- [ ] Smokes `boss-` e `boss` verdes
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(boss): stop adapting while affixes are suppressed`

---

#### T75: Glifos dos afixos apagados

**What**: `BossReadout.setSuppressed(on)` põe os glifos em alfa 0,3 enquanto a supressão vale.
**Where**: `src/game/boss/BossReadout.ts`
**Depends on**: T70
**Reuses**: glifos de 6 px (F32, BRD-02)
**Requirement**: WEV-07

**Done when**:

- [ ] Smoke: alfa dos glifos lido do objeto vivo = 0,3 nos 3 s e 1 depois
- [ ] Conferência em HD da barra do chefe
- [ ] Smokes `boss-` e `boss` verdes
- [ ] Gate verde

**Tests**: smoke + conferência
**Gate**: full
**Commit**: `feat(boss): dim affix glyphs while suppressed`

---

#### T76: Fechamento: README, rastreabilidade e IMB-06

**What**: `README.md` com `arsenal=lanca`, `axes=<arma>.<eixo>:<n>` e `evo=<evolução>` na tabela de debug (e o texto
"repetir o id sobe o nível" só para a relíquia); a tabela "Requirement Traceability" da spec com o status de cada
requisito; conferência final do IMB-06 (`git diff --stat` da base: `TestScene.ts` sem linha efetiva líquida,
`moves.ts` com 397 linhas, `Player.ts` sem campo novo).
**Where**: `README.md`
**Depends on**: T71, T73, T74, T75
**Reuses**: —
**Requirement**: IMB-06

**Done when**:

- [ ] README e spec atualizados; `validate_spec.py` sem erro
- [ ] Os 3 números do IMB-06 conferidos e escritos no commit
- [ ] Gate verde; smokes do fim da F36 (design) verdes

**Tests**: none
**Gate**: build
**Commit**: `docs: document imbued weapon debug parameters`

---

## Requirement Coverage

| Requirement | Tasks |
| --- | --- |
| IMB-01 | T1, T2, T7, T8 |
| IMB-02 | T7 |
| IMB-03 | T7 |
| IMB-04 | T2, T3, T41 |
| IMB-05 | T3, T4, T5, T6 |
| IMB-06 | T8, T23, T24, T26, T76 |
| WPN-01 | T10, T11, T12, T15, T19 |
| WPN-02 | T10, T11 |
| WPN-03 | T13, T14, T20 |
| WPN-04 | T13, T14, T20, T26 |
| WPN-05 | T13 |
| LMN-01 | T21, T23, T24 |
| LMN-02 | T22, T26 |
| LMN-03 | T22, T26 |
| LMN-04 | T26 |
| LMN-05 | T22, T27 |
| BST-01 | T28, T29 |
| BST-02 | T28, T30 |
| BST-03 | T28, T29 |
| BST-04 | T28, T29 |
| BST-05 | T28, T29, T30 |
| LNC-01 | T21, T32 |
| LNC-02 | T31, T33, T37 |
| LNC-03 | T21, T32 |
| LNC-04 | T32 |
| WFX-01 | T36, T39 |
| WFX-02 | T36, T39 |
| WFX-03 | T35, T39 |
| WFX-04 | T34, T35, T36 |
| WFX-05 | T38, T48 |
| WSH-01 | T9, T46 |
| WSH-02 | T41, T42 |
| WSH-03 | T41, T43 |
| WSH-04 | T40, T44, T45, T53 |
| WSH-05 | T16, T44, T52, T64 |
| WSH-06 | T44 |
| WSH-07 | T47, T48 |
| WSH-08 | T45, T53 |
| WSH-09 | T49, T50, T51 |
| WEV-01 | T54, T55 |
| WEV-02 | T60, T61, T62, T63, T66 |
| WEV-03 | T64, T67 |
| WEV-04 | T56, T65, T66 |
| WEV-05 | T57, T68 |
| WEV-06 | T58, T69 |
| WEV-07 | T59, T70, T71, T72, T73, T74, T75 |
| WDB-01 | T3, T9, T18 |
| WDB-02 | T15, T16, T18 |
| WDB-03 | T65 |
| WDB-04 | T17, T18, T65 |
| WDB-05 | T25, T27 |

51 de 51 requisitos com tarefa.

---

## Phase Execution Map

```
Phase 1 → Phase 2 → ... → Phase 14

Phase 1:   T1, T2, T3, T4, T5, T6, T7, T8
Phase 2:   T9, T10, T11, T12, T13, T14
Phase 3:   T15, T16, T17, T18, T19, T20
Phase 4:   T21, T22
Phase 5:   T23, T24, T25, T26, T27
Phase 6:   T28, T29, T30
Phase 7:   T31, T32, T33
Phase 8:   T34, T35, T36, T37, T38, T39
Phase 9:   T40, T41, T42, T43, T44, T45, T46, T47
Phase 10:  T48, T49, T50, T51, T52, T53
Phase 11:  T54, T55, T56, T57, T58, T59
Phase 12:  T60, T61, T62, T63, T64
Phase 13:  T65, T66, T67, T68, T69
Phase 14:  T70, T71, T72, T73, T74, T75, T76
```

Ordem estritamente sequencial (a linha é a ordem de trabalho, não dependência). 76 tarefas em lotes de fases inteiras
(~7 por agente, agente novo por lote, memória "Agente novo por lote"): Fase 1 (8), Fase 2 (6), Fase 3 (6), Fases 4+5
(7), Fases 6+7 (6), Fase 8 (6, arte), Fase 9 (8), Fase 10 (6), Fase 11 (6), Fase 12 (5), Fase 13 (5), Fase 14 (7): 12
lotes. Fases 2, 4, 9, 11 e 12 são regra pura e servem em Sonnet; os lotes com arte em movimento (Fase 8, T48, T75)
rodam em Opus 5.5 ou Fable. Fim de cada passo (fases 1, 3, 5, 6, 7, 8, 10 e 14): gate de build com os smokes do passo
no design.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1, T7, T20, T29, T53, T68 | 1 smoke ou cenário | ✅ |
| T32 | 1 comportamento (Contra no bloqueio): 1 método no diretor + o repasse de 1 linha + os cenários da Lança | ⚠️ coeso (merge forward: o método sem chamador não tem prova) |
| T2 | 1 diretor + o smoke que ele muda (`arsenal`) | ⚠️ coeso: tirar a arma da mão sem reescrever o smoke deixa o gate vermelho |
| T3 | 1 tipo (`Arsenal.weapon`) + os leitores que o typecheck aponta + os testes que importavam o `weaponDef` | ⚠️ coeso: o tipo sem os leitores não compila |
| T4, T5, T10, T12, T14, T19 | 1 arquivo, 1 mudança | ✅ |
| T6, T8, T76 | 1 teste / 1 documento | ✅ |
| T9 | 1 entrada de dado + o filtro que a mantém fora do catálogo | ⚠️ coeso: sem o filtro o sorteio de todas as seeds muda |
| T11 | 1 módulo de dados novo + os 2 tipos do registro que ele precisa para compilar | ⚠️ coeso: o typecheck pede junto |
| T13, T22, T31, T40, T55, T59 | 1 módulo puro novo | ✅ |
| T15, T16, T18 | 1 registro / 1 função / 1 leitura de URL | ✅ |
| T17 | 1 tipo de snapshot + o import no `debugApi` + o método que o preenche | ⚠️ coeso: o tipo sem quem o preenche não tem prova |
| T21 | 1 conjunto de funções do golpe + os 3 campos opcionais do `StrikeMods` que elas preenchem | ⚠️ coeso |
| T23 | 2 expressões e 1 linha num arquivo | ✅ |
| T24 | 1 diretor novo + o campo que o cria + a chamada que o usa | ⚠️ coeso (merge forward: o diretor sem chamador não tem prova) |
| T25 | 1 extração | ✅ |
| T26 | 1 comportamento (sangramento no jogo): módulo novo + as 2 chamadas de 1 linha que o ligam | ⚠️ coeso (merge forward) |
| T27 | 1 campo no snapshot + o tipo | ⚠️ coeso |
| T28, T57 | 1 conjunto de regras do mesmo traço | ✅ |
| T30, T65, T69, T70 | 1 comportamento no diretor | ✅ |
| T33 | 1 comportamento (anulação): o laço + a janela + o repasse de 1 linha | ⚠️ coeso |
| T34, T38, T71–T75 | 1 arquivo, 1 comportamento | ✅ |
| T35 | 1 vista nova + a chamada do impacto + o campo `fx` do snapshot que a prova (L-043) | ⚠️ coeso |
| T36 | 1 extração (`drawTrail`) + a pergunta ao diretor | ⚠️ coeso |
| T37, T39 | 1 chamada / 1 ajuste de conferência | ✅ |
| T41 | 1 regra de arma nova + a saída do `weaponCost` que ela substitui | ⚠️ coeso |
| T42–T47, T49, T60–T64 | 1 função ou entrada | ✅ |
| T48, T50, T52, T66, T67 | 1 leitura no adaptador | ✅ |
| T51 | 1 método no diretor + a troca de 1 linha no `trayDirector` | ⚠️ coeso |
| T54, T56, T58 | 1 tabela / 1 método / 1 classe | ✅ |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | — | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T3 | T3 → T4 | ✅ Match |
| T5 | T3 | T3 → T5 | ✅ Match |
| T6 | T4, T5 | T4 → T6, T5 → T6 | ✅ Match |
| T7 | T2 | T2 → T7 | ✅ Match |
| T8 | T3 | T3 → T8 | ✅ Match |
| T9 | None | — | ✅ Match |
| T10 | T9 | T9 → T10 | ✅ Match |
| T11 | T10 | T10 → T11 | ✅ Match |
| T12 | T10 | T10 → T12 | ✅ Match |
| T13 | T11 | T11 → T13 | ✅ Match |
| T14 | T13 | T13 → T14 | ✅ Match |
| T15 | T11 (fase 2), T12 (fase 2) | T11 → T15, T12 → T15 (fase 2) | ✅ Match |
| T16 | T15 | T15 → T16 | ✅ Match |
| T17 | T15 | T15 → T17 | ✅ Match |
| T18 | T16, T17 | T16 → T18, T17 → T18 | ✅ Match |
| T19 | T15 | T15 → T19 | ✅ Match |
| T20 | T7 (fase 1), T14 (fase 2) | T7 → T20, T14 → T20 | ✅ Match |
| T21 | T13 (fase 2) | T13 → T21 (fase 2) | ✅ Match |
| T22 | None | — | ✅ Match |
| T23 | T21 (fase 4) | T21 → T23 (fase 4) | ✅ Match |
| T24 | T23 | T23 → T24 | ✅ Match |
| T25 | None | — | ✅ Match |
| T26 | T24, T22 (fase 4) | T24 → T26, T22 → T26 (fase 4) | ✅ Match |
| T27 | T25, T26 | T25 → T27, T26 → T27 | ✅ Match |
| T28 | T21 (fase 4) | T21 → T28 (fase 4) | ✅ Match |
| T29 | T28, T24 (fase 5) | T28 → T29, T24 → T29 (fase 5) | ✅ Match |
| T30 | T29 | T29 → T30 | ✅ Match |
| T31 | None | — | ✅ Match |
| T32 | T24 (fase 5) | T24 → T32 (fase 5) | ✅ Match |
| T33 | T31, T32, T26 (fase 5) | T31 → T33, T32 → T33, T26 → T33 (fase 5) | ✅ Match |
| T34 | None | — | ✅ Match |
| T35 | T34, T26 (fase 5) | T34 → T35, T26 → T35 (fase 5) | ✅ Match |
| T36 | T35 | T35 → T36 | ✅ Match |
| T37 | T35, T33 (fase 7) | T35 → T37, T33 → T37 (fase 7) | ✅ Match |
| T38 | None | — | ✅ Match |
| T39 | T36, T37, T38 | T36 → T39, T37 → T39, T38 → T39 | ✅ Match |
| T40 | T13 (fase 2) | T13 → T40 (fase 2) | ✅ Match |
| T41 | T40 | T40 → T41 | ✅ Match |
| T42 | T41, T15 (fase 3) | T41 → T42, T15 → T42 (fase 3) | ✅ Match |
| T43 | T42, T16 (fase 3) | T42 → T43, T16 → T43 (fase 3) | ✅ Match |
| T44 | T43 | T43 → T44 | ✅ Match |
| T45 | T44, T40 | T44 → T45, T40 → T45 | ✅ Match |
| T46 | T41 | T41 → T46 | ✅ Match |
| T47 | T15 (fase 3) | T15 → T47 (fase 3) | ✅ Match |
| T48 | T47 (fase 9), T38 (fase 8) | T47 → T48, T38 → T48 | ✅ Match |
| T49 | None | — | ✅ Match |
| T50 | T49, T46 (fase 9) | T49 → T50, T46 → T50 (fase 9) | ✅ Match |
| T51 | T50 | T50 → T51 | ✅ Match |
| T52 | T44 (fase 9) | T44 → T52 (fase 9) | ✅ Match |
| T53 | T48, T50, T51, T52 | T48 → T53, T50 → T53, T51 → T53, T52 → T53 | ✅ Match |
| T54 | T10 (fase 2) | T10 → T54 (fase 2) | ✅ Match |
| T55 | T54 | T54 → T55 | ✅ Match |
| T56 | T54 | T54 → T56 | ✅ Match |
| T57 | T54, T28 (fase 6) | T54 → T57, T28 → T57 (fase 6) | ✅ Match |
| T58 | T31 (fase 7) | T31 → T58 (fase 7) | ✅ Match |
| T59 | None | — | ✅ Match |
| T60 | T54 (fase 11), T46 (fase 9) | T54 → T60, T46 → T60 | ✅ Match |
| T61 | T60, T55 (fase 11) | T60 → T61, T55 → T61 (fase 11) | ✅ Match |
| T62 | T61 | T61 → T62 | ✅ Match |
| T63 | T62, T44 (fase 9) | T62 → T63, T44 → T63 (fase 9) | ✅ Match |
| T64 | T55 (fase 11) | T55 → T64 (fase 11) | ✅ Match |
| T65 | T56 (fase 11), T57 (fase 11) | T56 → T65, T57 → T65 (fase 11) | ✅ Match |
| T66 | T65, T63 (fase 12), T50 (fase 10) | T65 → T66, T63 → T66, T50 → T66 | ✅ Match |
| T67 | T65, T64 (fase 12) | T65 → T67, T64 → T67 (fase 12) | ✅ Match |
| T68 | T65 | T65 → T68 | ✅ Match |
| T69 | T65, T58 (fase 11) | T65 → T69, T58 → T69 (fase 11) | ✅ Match |
| T70 | T65 (fase 13), T59 (fase 11) | T65 → T70, T59 → T70 | ✅ Match |
| T71 | T70 | T70 → T71 | ✅ Match |
| T72 | None | — | ✅ Match |
| T73 | T70, T72 | T70 → T73, T72 → T73 | ✅ Match |
| T74 | T70 | T70 → T74 | ✅ Match |
| T75 | T70 | T70 → T75 | ✅ Match |
| T76 | T71, T73, T74, T75 | T71 → T76, T73 → T76, T74 → T76, T75 → T76 | ✅ Match |

Nenhuma dependência aponta para fase posterior.

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1, T7, T20, T29, T53, T68 | Smoke (prova do adaptador) | smoke | smoke | ✅ OK |
| T2, T18, T23, T24, T25, T26, T30, T32, T33, T50, T51, T52, T65, T66, T67, T69, T70, T71, T73, T74 | Adaptadores | smoke | smoke | ✅ OK |
| T3, T5, T19 | Regra pura lida pelo jogo vivo | unit (+ smoke) | unit + smoke | ✅ OK |
| T4, T9, T10, T11, T54, T60 | Dados | unit | unit | ✅ OK |
| T6 | Teste de fonte | unit | unit | ✅ OK |
| T8, T76 | Documentação | none | none | ✅ OK |
| T12, T13, T14, T16, T21, T22, T28, T31, T40–T45, T47, T49, T55–T59, T61–T64, T72 | Regra pura | unit | unit | ✅ OK |
| T15, T46 | Dados que mudam o jogo vivo | unit (+ smoke) | unit + smoke | ✅ OK |
| T17, T27 | Tipo de snapshot + adaptador | unit, smoke | unit + smoke | ✅ OK |
| T34 | Vista do motor (refatoração) | smoke | smoke | ✅ OK |
| T35, T36, T37, T39, T48, T75 | Vista do motor / adaptador com arte | smoke + conferência | smoke + conferência | ✅ OK |
| T38 | Arte em código | unit + prancha | unit + prancha | ✅ OK |
