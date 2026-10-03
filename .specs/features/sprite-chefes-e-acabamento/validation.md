# Validation: sprite-chefes-e-acabamento - PASS (rodadas 1 e 2)

**Data**: 2026-10-03
**Spec**: `.specs/features/sprite-chefes-e-acabamento/spec.md`
**Branch**: `feat/sprite-chefes-e-acabamento`, HEAD `dfbda56`
**Diff range**: `cd5e62c..HEAD` (`dev` até `dfbda56`): 11 commits, 13 arquivos, +1674/-177. 8 commits de feature (T1 a T8), 3 de spec
**Verifier**: independente (autor != verificador), Sonnet 5.5. Nenhum código de produção nem teste foi alterado. O único arquivo criado na árvore real é este.

Veredito geral: PASS nas duas rodadas. Rodada 1 (`cd5e62c..dfbda56`, 41 requisitos): PASS, texto abaixo, sem reescrita. Rodada 2 (`dfbda56..9765173`, 47 requisitos): PASS, ver `## Rodada 2` no fim deste arquivo.

Veredito da rodada 1: PASS. Os 41 requisitos têm evidência `file:line` com asserção no valor que a spec define; build, typecheck, 1743 testes e os smokes `boot` e `boss*` passam; 56 mutantes injetados em scratch, 46 mortos, 10 sobreviventes. Os 10 sobreviventes estão todos em comportamento que nenhum AC fixa (lista em "Lacunas de precisão da spec"), então não bloqueiam. Nenhum mutante sobreviveu em comportamento fixado por AC.

Convenção desta página: "rodado" = executei e vi o resultado; "lido" = conferi lendo o código ou o teste, sem executar.

---

## Task Completion (lido)

| Task | Status | Commit | Notas |
| --- | --- | --- | --- |
| T1 Frames do Oni por pose articulada e mapa da Tecelã | Done | `1ac88ce` | BSP-01 a BSP-13 |
| T2 Animações do chefe em laço | Done | `576669d` | BAN-01 a BAN-07, EDG-02 |
| T3 Projétil e onda de choque | Done | `6a9e014` | BPW-01 a BPW-03 |
| T4 Braço e perna esticados | Done | `7bd2f78` | LMB-01 a LMB-06, EDG-01 |
| T5 Chute alto pelo quadril e golpes derivados | Done | `a467859` | LMB-07, LMB-08; também mexe em `armPalm`, `armElbow`, `legDown` (ver gaps 3 e 7) |
| T6 Cadeira e garrafa | Done | `fe3110d` | OBJ-01, OBJ-02 |
| T7 Faca e porrete | Done | `4323dc5` | OBJ-03, OBJ-04 |
| T8 Pendências dos inimigos | Done | `dfbda56` | EPD-01 a EPD-04 |

Todas as caixas de `tasks.md` estão `[x]`. O cabeçalho de `tasks.md` ainda diz `Status: In Progress` e a tabela de rastreabilidade de `spec.md` ainda diz `Implementing` (ver "Atualização de rastreabilidade").

---

## Gate (rodado)

- **Comando**: `npm run build && npm test && npm run smoke -- boot && npm run smoke -- boss` (gate Full do `tasks.md`), cada um isolado, um por vez, mais `npm run typecheck`.
- `npm run build`: exit 0 (`tsc --noEmit` mais `vite build`; só o aviso de chunk > 500 kB que já existia).
- `npm run typecheck`: exit 0. `tsconfig.json` liga `noUnusedLocals` e `noUnusedParameters`, então não há código morto nos arquivos tocados.
- `npm test`: 79 arquivos, **1743 passaram, 0 falharam, 0 pulados**.
- `npm run smoke -- boot`: `ok boot.smoke.mjs`, 1 cenário ok, exit 0.
- `npm run smoke -- boss`: `ok boss-punish.smoke.mjs`, `ok boss-victory.smoke.mjs`, `ok boss.smoke.mjs`, 3 cenários ok, exit 0. Nenhum smoke falhou, então não houve repetição.
- **Contagem antes da feature**: 1612, medida por mim rodando `npx vitest run` num worktree de scratch em `cd5e62c`. **Depois**: 1743. **Delta**: +131 testes.
- **Integridade dos testes** (lido, `git diff --numstat`): `tests/game/art.test.ts` +406/-1 (a linha removida é o `import` de `player`, que virou lista) e `tests/game/registerAnims.test.ts` +32/-1 (o `import` e o campo `repeat` no tipo da cena falsa). Nenhuma asserção existente foi removida ou afrouxada, nenhum teste pulado.
- Árvore real: `git status --porcelain` antes e depois do trabalho idênticos (só `.agents/ .claude/ .cursor/ .windsurf/ skills-lock.json`, não rastreados). `git stash list` vazio. `git worktree list` sem o scratch.

---

## Checagem ancorada na spec (lido, com os valores medidos rodando)

Siglas: `art` = `tests/game/art.test.ts`; `reg` = `tests/game/registerAnims.test.ts`; `cons` = `tests/game/playerConsistency.test.ts`. Os números entre colchetes são medidas reais do código atual (sonda em scratch).

### P1: Chefes com desenho de verdade

| ID | Resultado definido na spec | `file:line` + asserção | Resultado |
| --- | --- | --- | --- |
| BSP-01 | todo frame de `BOSS_FRAMES` e `TECELA_FRAMES` passa no `parseSheet`, 40x32, só chaves da paleta | `art:788-790` `parseSheet(name, frames, PALETTE_KEYS)` para as duas folhas, `expect(sheet.width).toBe(40)`, `expect(sheet.height).toBe(32)`. O `parseSheet` (`src/core/pixelGrid.ts:21-55`) lança em chave fora da paleta e em frame de tamanho diferente | PASS |
| BSP-02 | `PALETTE` com exatamente 42 chaves | **pré-existente**: `art:92` `expect(keys).toHaveLength(42)` e `art:101` `expect(Object.keys(PALETTE)).toHaveLength(42)`. A feature não toca `PALETTE` | PASS |
| BSP-03 | `A`, `a`, `z`, `m` em pelo menos 10 texels cada no `idle` do Oni | `art:796` `expect(countOf(BOSS_FRAMES.idle, tone)).toBeGreaterThanOrEqual(10)` para os 4 tons [A=28, a=139, z=99, m=67] | PASS |
| BSP-04 | no máximo 12 `k` internos no `idle` | `art:801` `expect(interiorK(BOSS_FRAMES.idle)).toBeLessThanOrEqual(12)` [0]. Métrica testada nos dois lados em `art:769-773` | PASS |
| BSP-05 | caixa opaca do `idle`: esquerda <= 10, direita >= 29, topo <= 4, base = 31 | `art:806-809` `x0 <= 10`, `x1 >= 29`, `y0 <= 4`, `y1 toBe(31)` [5, 0, 32, 31] | PASS |
| BSP-06 | todo frame de `BOSS_FRAMES` com um único componente | `art:813` `expect(components(BOSS_FRAMES[name])).toBe(1)` por frame (`it.each(NAMES)`, 20 frames) | PASS |
| BSP-07 | cada par entre `idle` e os 3 preparos com diferença >= 0,20 | `art:820-821` os 6 pares, `toBeGreaterThanOrEqual(0.2)` [mínimo 0,624, idle x windup-volley] | PASS |
| BSP-08 | cada ataque com diferença >= 0,20 do seu preparo | `art:828-829` `charge`, `leap`, `volley` contra `windup-<x>` [0,876 / 0,936 / 0,710] | PASS |
| BSP-09 | `dead` com no máximo 14 linhas e base na linha 31 | `art:835-836` `y1 toBe(31)` e `y1 - y0 + 1 <= 14` [13 linhas] | PASS |
| BSP-10 | topo do `stagger` pelo menos 2 linhas abaixo do topo do `idle` | `art:840` `box(stagger)[1] - box(idle)[1] >= 2` [6 - 0 = 6] | PASS |
| BSP-11 | cada frame da Tecelã igual ao do Oni com o mapa aplicado texel a texel | `art:844` mesmas chaves de frame; `art:848-849` por frame, `expect(TECELA_FRAMES[name]).toEqual(BOSS_FRAMES[name] com TECELA_COLOR_MAP[c] ?? c)` | PASS (a asserção usa o mapa de produção; só protege o `recolor`, ver gap 1) |
| BSP-12 | cor dominante do `idle`: `a` no Oni, `u` na Tecelã | `art:853-854` `dominant(BOSS_FRAMES.idle)` `toBe('a')`, `dominant(TECELA_FRAMES.idle)` `toBe('u')` [139 e 139] | PASS |
| BSP-13 | para `A a z m H j h U u v`, o mapa dá uma chave da paleta diferente de `k` | `art:859-861` `toBeDefined`, `PALETTE_KEYS.has(to)` `toBe(true)`, `to` `not.toBe(key)` para as 10 chaves | PASS (a spec só fixa "diferente"; destinos e o `R` ficam livres, ver gap 1) |

### P1: Chefes que se mexem

| ID | Resultado definido na spec | `file:line` + asserção | Resultado |
| --- | --- | --- | --- |
| BAN-01 | `idle` com 4 frames, `repeat` -1, 4 `durations` > 0, nenhum par consecutivo igual (com a volta) | `art:877-883` `frames toHaveLength(4)`, `repeat toBe(-1)`, `durations toHaveLength(4)`, cada `d > 0`, `BOSS_FRAMES[f]` `not.toEqual(BOSS_FRAMES[frames[(i+1) % 4]])` | PASS |
| BAN-02 | 3 preparos: 2 frames distintos em laço, o primeiro com o nome do estado, 90 ms por frame | `art:869-872` (`expectLoopOfTwo`: 2 frames, `frames[0] toBe(name)`, `repeat toBe(-1)`, grades distintas) e `art:889` `durations toEqual([90, 90])` | PASS |
| BAN-03 | `charge`, `roar`, `stagger`: idem, 80, 80 e 220 ms | `art:897-898` `expectLoopOfTwo` e `durations toEqual([ms, ms])` com `[charge 80, roar 80, stagger 220]` | PASS |
| BAN-04 | `volley`: 2 frames distintos em laço, soma das `durations` = `BOSS.volley.intervalMs` | `art:902-906` `expectLoopOfTwo('volley')`, 2 durações > 0, `durations[0] + durations[1] toBe(BOSS.volley.intervalMs)` | PASS |
| BAN-05 | `leap` e `dead`: 1 frame, com o nome do estado | `art:910` `expect(BOSS_ANIMS[name].frames).toEqual([name])` | PASS |
| BAN-06 | todo frame citado existe em `BOSS_FRAMES` e `TECELA_FRAMES` | `art:916-917` `Object.hasOwn(BOSS_FRAMES, f)` e `Object.hasOwn(TECELA_FRAMES, f)` `toBe(true)` para toda animação | PASS |
| BAN-07 | `registerAnims(BOSS_ANIMS)`: cada frame de cada animação de 2+ frames chega com a `duration` e a animação com o `repeat` declarados | `reg:48` `multi toHaveLength(8)`; `reg:52-54` por animação: `frames` `toEqual(def.frames)`, `duration` `toEqual(def.durations)`, `repeat toBe(def.repeat)`; `reg:57-59` literais `[220, 220]`, `-1`. Os literais de BAN-02 a BAN-04 fecham a cadeia | PASS |

### P1: Soco e chute sem cara de cano

| ID | Resultado definido na spec | `file:line` + asserção | Resultado |
| --- | --- | --- | --- |
| LMB-01 | `len` de 9 a 22: 5 linhas, `len` colunas na mais larga, texel opaco na coluna `len - 1` | `art:940-942` `part toHaveLength(5)`, `max(row.length) toBe(len)`, `profile(part)[len-1] >= 1`, para `armStraight` e `legStraight` (`it.each(lens(9, 22))`) | PASS |
| LMB-02 | `len` de 12 a 22, braço: 3+ colunas seguidas de perfil <= 4 antes do punho; 1+ coluna de perfil 5 entre as 5 últimas | `art:948` `thinRunBeforeTip(profile, 4) >= 3`; `art:949` `profile.slice(len - 5).filter(p => p === 5).length >= 1` | PASS ("antes do punho" = fora das 5 últimas colunas, definição do teste, ver gap 6) |
| LMB-03 | `len` de 12 a 22, perna: 3+ colunas seguidas de perfil <= 4 antes do pé; 2+ colunas de perfil 5 entre as 6 últimas | `art:954` `thinRunBeforeTip(profile, 4) >= 3`; `art:955` `profile.slice(len - 6).filter(p => p === 5).length >= 2` | PASS (mesma ressalva) |
| LMB-04 | ponta do membro em `jab-hit`, `cross-hit`, `kick-hit` nas colunas 27, 27, 30 | **pré-existente**: `art:1431-1433` `tipCol(PLAYER_FRAMES['jab-hit']) toBe(27)`, `cross-hit toBe(27)`, `kick-hit toBe(30)` | PASS |
| LMB-05 | todo frame do player que já existia com cada borda da caixa opaca a até 2 texels da linha de base congelada | **pré-existente**: `art:1305-1307` fixture com 102 frames; `art:1309-1316` `Math.abs(now[i] - base[i]) <= 2` nas 4 bordas, em `PLAYER_FRAMES` + `PLAYER_MOVE_FRAMES` + `PLAYER_TECH_FRAMES`. A fixture `tests/game/fixtures/playerBBoxBaseline.json` não está no diff | PASS |
| LMB-06 | todo frame do player com um único componente (sem `S`) e 0 pixels cortados | **pré-existente**: `cons:143-144` `componentSizes(frame(name)) toHaveLength(1)` e `cons:147-148` `clippedOf(frame(name)) toBe(0)` para todos os frames de `ALL` (`cons:6`: player + golpes + técnicas); `componentSizes` ignora `S` (`cons:20`) | PASS |
| LMB-07 | `chuteAlto-hit`: nenhum `s`, `N`, `n`, `o` nas linhas 0 a 6 à esquerda da coluna 20 | `art:968-969` laço `y` 0..6, `x` 0..19, `expect('sNno'.includes(rows[y][x])).toBe(false)` | PASS |
| LMB-08 | `chuteAlto-hit`: ponta do pé na coluna 31, numa linha de 2 a 6 | `art:974` `box(rows)[2] toBe(31)`; `art:975-980` toda linha com texel na coluna 31 em `[2, 6]` | PASS |

### P2: Projétil e onda de choque

| ID | Resultado definido na spec | `file:line` + asserção | Resultado |
| --- | --- | --- | --- |
| BPW-01 | projétil 8x8, 4 cantos transparentes, tons `w U u v` | `art:1056-1057` 8 e 8; `art:1059` `cells[y][x] toBeNull()` nos 4 cantos; `art:1061` `keys.has(tone)` para `w U u v` | PASS |
| BPW-02 | onda 16x10, >= 30% transparentes, tons `w A a z` | `art:1066-1067` 16 e 10; `art:1068` `countOf(SHOCKWAVE_FRAME, '.') / 160 >= 0.3` [0,394]; `art:1070` `keys.has(tone)` | PASS |
| BPW-03 | linha 9 da onda com pelo menos 12 opacos | `art:1074` `[...SHOCKWAVE_FRAME[9]].filter(c => c !== '.').length >= 12` [16] | PASS |

### P2: Objetos com volume

| ID | Resultado definido na spec | `file:line` + asserção | Resultado |
| --- | --- | --- | --- |
| OBJ-01 | cadeira 13x13, 6+ chaves, entre elas `m M s S` | `art:987-988` 13 e 13; `art:990` `keys.size >= 6` [6: `k S s M P m`]; `art:991` `keys.has(key)` para `m M s S` | PASS |
| OBJ-02 | garrafa 4x10 com `G g w l L` | `art:996-997` 4 e 10; `art:999` `keys.has(key)` para as 5 chaves | PASS |
| OBJ-03 | `common` da faca 3x10, 7+ chaves, entre elas `w z`, nenhuma `A` | `art:1010-1015` (linha `['cursedKnife', 3, 10, ['w','z']]` em `art:1005`) `width toBe(3)`, `height toBe(10)`, `keys.size >= 7` [8], `keys.has('w')`, `keys.has('z')`, `keys.has('A') toBe(false)` | PASS |
| OBJ-04 | `common` do porrete 5x8, 7+ chaves, entre elas `l M`, nenhuma `A` | as mesmas asserções, `art:1006` `['cursedClub', 5, 8, ['l','M']]` [7 chaves: `k U l u v M m`] | PASS |

### P3: Pendências dos inimigos

| ID | Resultado definido na spec | `file:line` + asserção | Resultado |
| --- | --- | --- | --- |
| EPD-01 | `impact` do bruto, linhas 0 a 11 com exatamente 1 `w` | `art:1021` `countOf(ENEMY_VARIANT_FRAMES.bruto.impact.slice(0, 12), 'w') toBe(1)` [1; o frame todo tem 11] | PASS |
| EPD-02 | `attack-0` do bruto, coluna da ponta do punho com exatamente 3 opacos | `art:1026-1027` `tip = box(rows)[2]` e `rows.filter(row => row[tip] !== '.') toHaveLength(3)` | PASS ("ponta do punho" = borda direita da caixa opaca, definição do teste, ver gap 6) |
| EPD-03 | rastejante: topo do `hurt-uppercut-0` pelo menos 3 linhas acima do topo do `hurt-head-a-0` | `art:1034` `headTop - uppercutTop >= 3` [3 - 0 = 3, no limite] | PASS |
| EPD-04 | `hurt-uppercut-0` das 3 aparências com base da caixa opaca na linha 20 ou acima | `art:1038` `box(ENEMY_VARIANT_FRAMES[id]['hurt-uppercut-0'])[3] <= 20` para as 3 [20, 20, 20, no limite] | PASS |

### Casos de borda

| ID | Resultado definido na spec | `file:line` + asserção | Resultado |
| --- | --- | --- | --- |
| EDG-01 | `armStraight(len)` com `len` < 12 devolve a manga sem afinar: toda coluna antes do punho com perfil 5 | `art:960` `profile.slice(0, len - 5) toEqual(Array(len - 5).fill(5))` para `len` 9, 10, 11 | PASS |
| EDG-02 | `durations` de tamanho diferente de `frames` em `BOSS_ANIMS` faz `registerAnims` lançar erro com o nome da animação | `reg:64-65` `roar` com `durations: [80]` (2 frames), `expect(() => registerAnims(...)).toThrow(/roar/)` | PASS (só a direção "menos durations"; a outra fica no teste antigo do SPR-08, ver gap 8) |

**Status**: 41 de 41 com evidência e valor igual ao da spec. 0 lacunas de AC. 8 lacunas de precisão da spec (abaixo), nenhuma bloqueante.

---

## Sensor de discriminação (rodado)

**Profundidade**: ampliada (56 mutantes manuais). **Isolamento**: `git worktree add` fora do repositório (`.../scratchpad/wt-verify`, HEAD `dfbda56`), com `node_modules` por junction; cada mutante aplicado por troca textual de um trecho exato, testes rodados, arquivo restaurado antes do próximo. Junction removida primeiro (`cmd /c rmdir`), depois `git worktree remove --force`; `node_modules` real conferido intacto. Testes rodados em cada mutante: `tests/game/art.test.ts`, `tests/game/registerAnims.test.ts` e `tests/game/playerConsistency.test.ts` (544 testes, ~1 s). A suíte inteira (1743) foi rodada limpa na árvore real antes.

### Mutantes mortos (46)

| # | Arquivo:linha | Mutação | Teste que matou |
| --- | --- | --- | --- |
| B01 | `boss.ts:334` | `windup-volley` passa a usar a pose do `windup-leap` (dois preparos idênticos) | BSP-07 |
| B02 | `boss.ts:229` | remove a chamada `selOut` de `figure` | BSP-04 (k internos > 12) |
| B03 | `boss.ts:349` | tira `z: 'v'` do `TECELA_COLOR_MAP` | BSP-13 (`z`) |
| B06 | `boss.ts:392` | `stagger` de 220 ms para 200 ms | BAN-03 e BAN-07 |
| B07 | `boss.ts:373` | `loop()` com `repeat: 0` em vez de -1 | 8 testes: BAN-02 (x3), BAN-03 (x3), BAN-04, BAN-07 |
| B08 | `boss.ts:390` | `volley` com `intervalMs / 3` em vez de `/ 2` | BAN-04 |
| B09 | `boss.ts:384` | `idle` com 3 durações em vez de 4 | BAN-01, BAN-07 e EDG-02 |
| B10 | `boss.ts:425` | linha 9 da onda com 11 opacos em vez de 16 | BPW-03 |
| B11 | `boss.ts:403-404` | projétil sem o tom `w` | BPW-01 |
| B12 | `boss.ts:33` | rampa de pele sem o tom `A` (`['a','a','z','m']`) | BSP-03 |
| B13 | `boss.ts:239` | tronco do `dead` mais alto (`oval(18, 24, 8.6, 7.2)`) | BSP-09 |
| B14 | `boss.ts:305-306` | `stagger` sem agachar (`drop: 0`, `head: [1, 0]`) | BSP-10 |
| B15 | `boss.ts:319` | `idle-1` igual ao `idle` | BAN-01 (par consecutivo igual) |
| B16 | `boss.ts:323` | `windup-charge-1` igual ao `windup-charge` | BAN-02 |
| B17 | `boss.ts:195` | remove a perna (só os pés ficam soltos) | BSP-06 (13 testes) |
| B18 | `boss.ts:335` | esfera do `windup-volley-1` com o mesmo raio do frame 0 | BAN-02 |
| B19 | `boss.ts:325` | `charge-1` com a mesma passada do `charge` | BAN-03 |
| B20 | `boss.ts:209` | cabeça 6 texels mais baixa no `idle` (topo da caixa passa de 0 para 6) | BSP-05 |
| B21 | `boss.ts:33` | rampa de pele `['A','z','z','m']` (`z` passa a dominar o `idle`) | BSP-12 |
| R04 | `boss.ts:361` | `recolor` devolve a grade sem aplicar o mapa | BSP-11 (20 testes), BSP-12 e o teste antigo da Tecelã |
| P01 | `player.ts:178` | `TAPER_MIN_LEN` 12 para 13 (`len` 12 deixa de afinar) | LMB-02 e LMB-03 em `len` 12 |
| P02 | `player.ts:178` | `TAPER_MIN_LEN` 12 para 11 (`len` 11 passa a afinar) | EDG-01 em `len` 11 |
| P03 | `player.ts:202-203` | `armStraight` volta ao contorno reto embaixo (não afina) | LMB-02 (11 testes) |
| P04 | `player.ts:265` | `legStraight` com `thigh = leg` (sem canela fina) | LMB-03 (11 testes) |
| P05 | `player.ts:203` | `armStraight` sem o contorno de baixo do punho (perfil 5 some da ponta) | LMB-02 (11 testes) |
| P06 | `player.ts:362` | `jab-hit` com `armStraight(18)` em vez de 17 (alcance +1) | LMB-04 (SPR-14 `art:1431`) e o teste de alcance da hitbox |
| P07 | `player.ts:373` | `kick-hit` com `legStraight(22)` em vez de 20 | LMB-04 (`art:1433`) e SPF-02 (cortado) |
| R02 | `player.ts:417` | `animFrameConfigs` sem a checagem de tamanho de `durations` | teste do SPR-08 (`art`) |
| R05 | `player.ts:417` | a checagem vira `durations.length < def.frames.length` | teste do SPR-08 (`art`) |
| M01 | `playerMoves.ts:238` | volta `legStraight(21)` no `chuteAlto-hit` | LMB-07 |
| M02 | `playerMoves.ts:238` | `legRaised(21, 4)` em vez de `(21, 12)` | LMB-07 |
| P08 | `playerMoves.ts:90` | `legRaised` sem o contorno `k` (pé solto da perna) | SPF-01 do `chuteAlto-hit` (LMB-06) e LMB-08 |
| E01 | `enemy.ts:654` | tira `rimFrom: 6` do kit do bruto | EPD-01 |
| E03 | `enemy.ts:315` | `legLift` do `hurt-uppercut` de 3 para 2 | EPD-04 (3 aparências) |
| E04 | `enemy.ts:315` | `hurt-uppercut` volta inteiro aos valores antigos (`drop -2`, `legLift 2`, `lean -2`) | EPD-03 e EPD-04 |
| E05 | `enemy.ts:612-616` | `B_ARM_REACH` volta à ponta em bloco | EPD-02 |
| E09 | `enemy.ts:315` | `drop` do `hurt-uppercut` de -3 para -2 | EPD-03 (no limite) |
| O01 | `props.ts:19,23` | cadeira sem a chave `P` (5 chaves) | OBJ-01 |
| O02 | `props.ts:39` | garrafa sem a chave `L` | OBJ-02 |
| O07 | `props.ts:37` | garrafa sem o brilho `w` | OBJ-02 |
| O03 | `tools.ts:20` | faca sem a ponta `w` | OBJ-03 |
| O04 | `tools.ts:20` | faca com uma `A` | OBJ-03 e o teste de aura do ARM-19/RAR-03 |
| O05 | `tools.ts:23` | porrete sem os cravos `l` | OBJ-04 |
| O06 | `tools.ts:20` | faca com 6 chaves (sem `v` e `M`) | OBJ-03 (contagem) |
| R01 | `art/index.ts:131` | `registerAnims` passa `repeat: 0` | BAN-07 |
| R03 | `art/index.ts:129` | `registerAnims` descarta a `duration` por frame | BAN-07 e o teste do SPR-08 |

### Mutantes sobreviventes (10), todos em comportamento sem AC

| # | Arquivo:linha | Mutação | Por que sobrevive | Classificação |
| --- | --- | --- | --- | --- |
| B04 | `boss.ts:357` | tira `R: 'C'` (olho aceso da Tecelã deixa de ser ciano) | BSP-13 não lista `R`; BSP-11 usa o mesmo mapa nos dois lados | lacuna de precisão 1 |
| B05 | `boss.ts:354` | `U: 'l'` vira `U: 'L'` (outro destino do pano) | BSP-13 só exige "diferente de k" | lacuna de precisão 1 |
| R06 | `boss.ts:376` | `still()` com `repeat: -1` | BAN-05 não fixa `repeat` de `leap` e `dead` | lacuna de precisão 5 |
| R07 | `boss.ts:332` | `leap` com `legs: 'stand'` em vez de `'tuck'` | só BSP-08 (diferença >= 0,20) e BSP-06 valem para o `leap` | lacuna de precisão 5 |
| M03 | `playerMoves.ts:63` | `armPalm` sem o brilho `A` | nenhum AC fixa `armPalm` | lacuna de precisão 3 |
| M04 | `playerMoves.ts:54` | `armElbow` sem a ponta `o` | nenhum AC fixa `armElbow` | lacuna de precisão 3 |
| M05 | `playerMoves.ts:103` | `legDown` sem o sapato (`kKsk` antigo) | nenhum AC fixa `legDown` | lacuna de precisão 3 |
| E02 | `enemy.ts:161` | padrão do `rimFrom` de 3 para 4 (corcunda e rastejante mudam a borda do `impact`) | EPD-01 só mede o bruto | lacuna de precisão 4 |
| E06 | `enemy.ts:580-584` | `B_ARM_HANG` volta ao punho em bloco | EPD-02 só mede a ponta do `attack-0` | lacuna de precisão 2 |
| E07 | `enemy.ts:593-596` | `B_ARM_FWD` volta ao punho em bloco | idem | lacuna de precisão 2 |

**Resultado**: 56 injetados, 46 mortos, 10 sobreviventes (nenhum em comportamento fixado por AC).
Cobertura por arquivo: `boss.ts` 24 (20 mortos, 4 sobreviventes), `player.ts` 9 (9 mortos), `playerMoves.ts` 6 (3 mortos, 3 sobreviventes), `enemy.ts` 8 (5 mortos, 3 sobreviventes), `props.ts` 3 (3 mortos), `tools.ts` 4 (4 mortos), `art/index.ts` 2 (2 mortos).
Os dois lados dos limiares foram exercitados: `TAPER_MIN_LEN` 11 e 13 (P01, P02), `legRaised` (M02), `rimFrom` e `legLift` (E01, E03, E09), faca com 6 chaves (O06), cadeira com 5 (O01), onda com 11 opacos (B10).

---

## Interactive UAT

Fora do escopo do Verifier. A arte é visual: o usuário revisa as pranchas e roda `?debug&round=5` (Oni) e `?debug&round=15` (Tecelã) antes do merge em `dev`, conforme os Success Criteria da spec. As pranchas antes/depois não estão no diff (a spec as exclui: saem de script avulso), então o que se lê como "lê como um oni" e "punho e pé maiores que antebraço e canela" não foi julgado aqui, só as medidas dos ACs.

---

## Code Quality (lido, com `tsc` rodado)

| Princípio | Status |
| --- | --- |
| Nada além do pedido | Parcial: `armPalm`, `armElbow` e `legDown` foram reformatados sem AC (estão no design §1 e no T5, mas a spec não os pede nem os mede). Pequeno e coerente com o formato novo do braço, sem teste dedicado (gap 3) |
| Sem abstração de uso único | OK: `paint`, `oval`, `limb`, `stamp`, `Pose` e `figure` são usados por 20 frames; `loop()` e `still()` por 9 animações; `rimFrom` é opcional com o padrão antigo |
| Sem flexibilidade a mais | OK: `TAPER_MIN_LEN` é uma constante nomeada, não parâmetro |
| Só arquivos necessários | OK: 6 arquivos de arte, 2 de teste, specs e `STATE.md` (AD-018, registrado). Nenhum adaptador Phaser, `tuning` nem fixture mudou |
| Não "melhora" código alheio | OK: o `recolor` local de `boss.ts` já existia como cópia do de `enemy.ts` antes da feature; nada novo duplicado aqui |
| Estilo igual ao dos vizinhos | OK: comentários em português com ID de requisito, grades em `Grid`, `selOut` compartilhado, `AnimDef` reaproveitado (o tipo `BossAnimDef` saiu, sem referência sobrando) |
| Código morto | OK: `npm run typecheck` com `noUnusedLocals` e `noUnusedParameters` passa |
| Um engenheiro sênior aprovaria | Sim, com 2 notas baixas: `loop()` calcula `frameRate: Math.round(1000 / ms)` que o Phaser ignora quando há `durations`; `figure` chama `p.chest` de `breath` localmente |
| Testes mapeiam ACs e não são rasos (conferido nos 5 blocos: chefe, animações, membros, objetos, inimigos) | OK: cada `it` cita o ID; limiares conferidos dos dois lados (`art:756-780` testa as próprias medidas do glossário); o mapa pré-existente de ACs fixados por testes antigos está acima |
| Asserção igual ao resultado da spec | OK em 41 de 41 (as ressalvas são de precisão da spec, abaixo) |
| Todo teste novo mapeia a AC, borda ou Done-when | OK: os 4 testes de `art:756-780` mapeiam ao Glossário e à lição L-010 (limiares dos dois lados) |
| Diretrizes do projeto | `vitest.config.ts`; `.specs/STATE.md` AD-001/002/012/017/018; lições L-010 e L-043 (citadas no `tasks.md`). Seguidas |

Nota de duplicação baixa: `artMeasure.box` (`art:673`) repete o `bboxOf` local que já existe em `art:1291` e `art:1523`; `artMeasure.components` repete `componentSizes` de `cons:17` (este ignora `S`). Aceitável, cada um com a sua regra, mas são 3 cópias do mesmo retângulo opaco.

---

## Edge Cases

- [x] EDG-01: `armStraight` com `len` de 9 a 11 não afina (`art:960`; P02 mata a versão que afina em 11).
- [x] EDG-02: `durations` de tamanho errado em animação do chefe lança erro com o nome (`reg:65`).

---

## Lacunas de precisão da spec (não bloqueiam)

1. **BSP-13 e o mapa da Tecelã** (média). O AC fixa só "chave da paleta diferente de k" para 10 chaves. O `R -> C` (olho ciano) e os destinos de juba e pano (branca, creme) estão só na tabela de Assumptions. B04 e B05 sobrevivem: uma Tecelã de olho vermelho, ou de pano `L` em vez de `l`, passa. O BSP-11 compara contra o próprio mapa de produção, então só pega erro no `recolor` (R04 morre). Sugestão: incluir `R` na lista do BSP-13 e fixar os destinos literais, ou dizer que o AC é só de "diferença".
2. **Punho do bruto em bloco** (média-baixa). O Problem Statement fala do punho do bruto, mas o EPD-02 mede só a coluna da ponta no `attack-0`. O arredondamento de `B_ARM_HANG` e `B_ARM_FWD` (E06, E07) pode voltar sem teste falhar.
3. **Golpes derivados** (média-baixa). `armPalm` (brilho `A`), `armElbow` (ponta `o`) e `legDown` (sapato) mudaram por causa do T5 e não têm AC (M03, M04, M05). Ou ganham um AC curto, ou saem do design.
4. **Borda do `impact` dos outros kits** (baixa). O design diz "padrão 3, o valor atual", mas nenhum AC prende corcunda e rastejante em 3 (E02).
5. **`leap` e `dead`** (baixa). O BAN-05 fixa 1 frame e o nome, mas não o `repeat` (R06); a pose do `leap` só tem o piso de 0,20 do BSP-08 (R07).
6. **Termos sem definição** (baixa). "antes do punho" e "antes do pé" (LMB-02, LMB-03) e "ponta do punho" (EPD-02) não estão no Glossário. Os testes definem: as 5 últimas colunas fora da conta (`TIP_COLS`, `art:926`) e a borda direita da caixa opaca (`art:1026`). Sugestão: pôr os dois no Glossário.
7. **Margens largas** (informativa). Os valores reais ficam bem acima dos pisos da spec: tom `A` 28 contra 10 (BSP-03), diferença mínima 0,62 contra 0,20 (BSP-07), `k` interno 0 contra 12 (BSP-04). Não é erro: um preparo com 25% de diferença já passa. Se a intenção é "poses bem distintas", os pisos são frouxos. Em compensação, EPD-03 e EPD-04 estão exatamente no limite (3 e 20), e E09 e E03 provam que o teste distingue os dois lados.
8. **EDG-02** (baixa). O teste novo cobre só "menos `durations` que `frames`"; a direção oposta e a checagem em si estão no teste antigo do SPR-08 (R02 e R05 morrem lá, não no EDG-02).

---

## Lacunas ordenadas por severidade

Nenhuma lacuna de AC (nenhum requisito sem evidência, nenhum gate quebrado, nenhum mutante vivo em comportamento fixado). Ordem das lacunas de precisão, todas opcionais:

1. BSP-13 / mapa da Tecelã (B04, B05): `tests/game/art.test.ts:857-862`.
2. Punho do bruto fora do `attack-0` (E06, E07): `tests/game/art.test.ts:1024-1028`.
3. `armPalm`, `armElbow`, `legDown` sem AC (M03, M04, M05): `src/game/art/sprites/playerMoves.ts:54,63,103`.
4. `rimFrom` padrão sem AC (E02): `src/game/art/sprites/enemy.ts:161`.
5. `leap` e `dead` (R06, R07): `src/game/art/sprites/boss.ts:332,376`.
6. Termos "antes do punho/pé" e "ponta do punho" fora do Glossário.
7. Faxina: `tasks.md` com `Status: In Progress`; `spec.md` com `Implementing`.

---

## Atualização de rastreabilidade (a aplicar pelo orquestrador; não editei `spec.md`)

| Requisito | Status anterior | Novo status |
| --- | --- | --- |
| BSP-01 a BSP-12 | Implementing | Verified |
| BSP-13 | Implementing | Verified (com lacuna de precisão 1) |
| BAN-01 a BAN-07 | Implementing | Verified |
| LMB-01 a LMB-08 | Implementing | Verified (LMB-04, LMB-05, LMB-06 por testes pré-existentes citados acima) |
| BPW-01 a BPW-03 | Implementing | Verified |
| OBJ-01 a OBJ-04 | Implementing | Verified |
| EPD-01 a EPD-04 | Implementing | Verified (EPD-02 com lacuna de precisão 6) |
| EDG-01, EDG-02 | Implementing | Verified |

---

## Lições (validate.md §10)

Não registrei nada via `scripts/lessons.py`: a tarefa me limitava a criar só este arquivo na árvore real. Há sinal (mutantes sobreviventes em comportamento sem AC e lacunas de precisão), então o orquestrador deve registrar. Candidatas, já em forma geral:

- Quando um AC pede "o mapa troca cada chave por outra", fixar também os destinos que a spec escolheu; o teste que recalcula o resultado com o próprio mapa de produção não protege o mapa.
- Quando um AC mede um ponto de uma peça (ponta do punho de um frame), medir a peça nos outros frames onde ela aparece, ou aceitar que o resto fica sem rede.
- Peças alteradas pelo plano (`tasks.md`) e fora dos ACs devem ganhar um AC mínimo ou sair do plano.

---

## Summary

**Overall**: Pronto (PASS)

**Spec-anchored check**: 41 de 41 com evidência no valor da spec (3 por testes pré-existentes) | 8 lacunas de precisão da spec
**Sensor**: 46 de 56 mutantes mortos; 10 sobreviventes, todos em comportamento sem AC
**Gate**: build ok, typecheck ok, 1743 testes passaram, 0 falharam (baseline 1612, +131), smokes `boot` (1 cenário) e `boss*` (3 cenários) ok
**Isolamento**: `git status --porcelain` da árvore real idêntico ao baseline; scratch removido (junction primeiro)

**O que funciona**: os dois chefes têm 20 frames por pose articulada com rampa de 4 tons e sel-out; os 3 preparos e seus ataques são distintos; as animações dos chefes repetem em laço e chegam ao Phaser com `duration` e `repeat`; braço e perna esticados afinam sem mudar alcance nem caixa; o chute alto sai do quadril; objetos e ferramentas têm mais de 2 tons; as 3 pendências dos inimigos estão fechadas.

**Próximos passos**: UAT visual do usuário (`?debug&round=5` e `?debug&round=15`) e, se quiser fechar as lacunas de precisão, os ajustes 1 a 3 acima; depois atualizar `tasks.md` e `spec.md` e mesclar em `dev` com `--no-ff` (AD-008).

---

## Rodada 2

**Data**: 2026-10-03
**Branch**: `feat/sprite-chefes-e-acabamento`, HEAD `9765173`
**Diff range**: `dfbda56..HEAD`: 4 commits (`dd04e0e` relatório da rodada 1, `709c8be` spec e tasks, `0b0859f` testes e `armElbow`, `9765173` lições L-052 a L-054). Em `src/` só muda `src/game/art/sprites/playerMoves.ts` (`armElbow`, +6/-6); em `tests/` só `tests/game/art.test.ts` (+39/-5). `boss.ts`, `enemy.ts`, `props.ts` e `tools.ts` não mudaram desde a rodada 1.
**Verifier**: o mesmo Verifier independente (autor != verificador). Nenhum código nem teste foi alterado; a árvore real só ganha estas linhas.
**Escopo**: só o que o orquestrador pediu: evidência dos 7 IDs novos ou reescritos, gate, sensor sobre os 10 sobreviventes da rodada 1 mais mutantes novos no `armElbow`, e a rastreabilidade dos 47 IDs. Os 41 requisitos antigos não foram reavaliados um a um; os testes deles seguem passando (suíte inteira abaixo).

Veredito da rodada 2: PASS. Os 7 IDs têm evidência `file:line` no valor da spec; build, 1741 testes e o smoke `boot` passam; dos 10 sobreviventes da rodada 1, 8 morrem agora e 2 seguem vivos (R06 equivalente, M04 sem AC). Nenhum mutante sobrevive em comportamento fixado por AC.

### Evidência dos 7 IDs (lido; os valores entre colchetes foram medidos rodando uma sonda em scratch)

| ID | Resultado definido na spec | `file:line` + asserção | Resultado |
| --- | --- | --- | --- |
| BSP-13 | `TECELA_COLOR_MAP` com exatamente 11 trocas: `A`→`U`, `a`→`u`, `z`→`v`, `m`→`K`, `H`→`w`, `j`→`I`, `h`→`i`, `U`→`l`, `u`→`L`, `v`→`q`, `R`→`C` | `tests/game/art.test.ts:858` `expect(TECELA_COLOR_MAP).toEqual({ A: 'U', a: 'u', z: 'v', m: 'K', H: 'w', j: 'I', h: 'i', U: 'l', u: 'L', v: 'q', R: 'C' })`. Os 11 pares do teste são os da spec, um a um [o mapa real tem 11 chaves] | PASS |
| BSP-14 | caixa opaca do `leap` com a base na linha 28 ou acima | `tests/game/art.test.ts:862` `expect(artMeasure.box(BOSS_FRAMES.leap)[3]).toBeLessThanOrEqual(28)` [base 28, no limite; o `idle` fica em 31] | PASS |
| LMB-09 | `palmaExplosiva-hit` com exatamente 2 texels `A` à direita da coluna 20 | `tests/game/art.test.ts:987-988` `beyond = frame.map(row => row.slice(21))` (colunas 21 em diante = à direita da 20) e `expect(artMeasure.countOf(beyond, 'A')).toBe(2)` [2; o frame inteiro tem 3 e o terceiro fica à esquerda da coluna 21, fora da conta] | PASS |
| LMB-10 | `cotovelada-hit`: ponta do frame na coluna 23 e exatamente 1 texel opaco nela (a "ponta de um frame" é a borda direita da caixa opaca, definida no Glossário) | `tests/game/art.test.ts:993-995` `tip = artMeasure.box(rows)[2]`, `expect(tip).toBe(23)`, `expect(rows.filter(row => row[tip] !== TRANSPARENT)).toHaveLength(1)` [caixa 3, 0, 23, 23; 1 texel]. A fixture congelada do SPR-06 tem `cotovelada-hit` em `[3,0,23,23]` (`tests/game/fixtures/playerBBoxBaseline.json:40`), então o alcance voltou ao original, e o `armElbow` de `cd5e62c` também ocupava `len + 1` colunas | PASS |
| LMB-11 | `pisao-hit` com pelo menos 3 texels `s` na linha 22 | `tests/game/art.test.ts:999` `expect(artMeasure.countOf([PLAYER_MOVE_FRAMES['pisao-hit'][22]], 's')).toBeGreaterThanOrEqual(3)` [linha 22 = `...........ksssk`, exatamente 3, no limite] | PASS |
| EPD-05 | no `impact`, o texel opaco mais à direita é `w` na linha 9 do `corcunda` e na 8 do `rastejante`, e não é `w` na linha 8 do `corcunda` nem na 7 do `rastejante` | `tests/game/art.test.ts:1062-1063` (`it.each` de `:1056-1059` com `['corcunda', 9]` e `['rastejante', 8]`) `expect(rightmost(rows[firstRimRow])).toBe('w')` e `expect(rightmost(rows[firstRimRow - 1])).not.toBe('w')`; `rightmost` pega o último não transparente da linha [corcunda: linhas 7, 8, 9 = `k`, `k`, `w`; rastejante: linhas 6, 7, 8 = `k`, `k`, `w`] | PASS |
| EPD-06 | no `bruto`, o texel (coluna 19, linha 22) do `idle-0` e o (coluna 21, linha 20) do `walk-0` são transparentes | `tests/game/art.test.ts:1067-1068` `expect(ENEMY_VARIANT_FRAMES.bruto['idle-0'][22][19]).toBe(TRANSPARENT)` e `expect(ENEMY_VARIANT_FRAMES.bruto['walk-0'][20][21]).toBe(TRANSPARENT)` (linha primeiro, coluna depois, como a spec) [os dois são `.`] | PASS |

Os termos novos do Glossário batem com os testes: "ponta de um frame" = borda direita da caixa opaca (`artMeasure.box(...)[2]`, usada em LMB-10 e no EPD-02 de `:1026`), e "antes do punho / antes do pé" = fora das 5 últimas colunas (`TIP_COLS = 5`, `:926`). A lacuna 6 da rodada 1 está fechada.

### BSP-13: trocar 10 casos por um `toEqual` não afrouxou a cobertura (lido, confirmado por mutantes)

- **Antes**: 10 casos (`it.each` das chaves `A a z m H j h U u v`), cada um com 3 asserções: definido, chave da paleta, diferente da chave.
- **Depois**: um `toEqual` contra o mapa literal de 11 entradas. Igualdade profunda com o literal implica as 3 propriedades antigas para as 10 chaves (cada alvo do literal é diferente da sua chave) e acrescenta: os valores exatos, a chave `R` e a ausência de chave extra.
- **"Alvo na paleta"**: continua guardado pelo teste antigo do BTIER-06 (`tests/game/art.test.ts:645-649`, não tocado: todo `from` e `to` do mapa em `PALETTE_KEYS`) e por BSP-01 (o `parseSheet` da Tecelã). Sonda: os 11 alvos estão na `PALETTE`.
- **Contagem**: 1743 para 1741 = -10 (casos antigos) +1 (`toEqual`) +1 (BSP-14) +3 (LMB-09 a LMB-11) +2 (EPD-05, dois casos) +1 (EPD-06) = -2. Bate.
- **Mutantes** (rodados): tirar `R` (B04), trocar o destino de `U` (B05), trocar o de `H` (X5), tirar `m` (X7) e acrescentar uma chave extra `s: 'i'` (X6) morrem só no BSP-13. Na rodada 1 os dois primeiros sobreviviam.
- Resíduo: `toEqual` ignora propriedade `undefined`; uma chave extra com valor `undefined` passaria, mas o `recolor` usa `map[ch] ?? ch`, então seria equivalente a não ter a chave.

Conclusão: sem perda de cobertura; a cobertura do BSP-13 subiu.

### Gate (rodado)

- `npm run build`: exit 0 (`tsc --noEmit` e `vite build`; só o aviso de chunk > 500 kB que já existia).
- `npm test`: 79 arquivos, **1741 passaram, 0 falharam, 0 pulados**. Antes da feature 1612 (medido na rodada 1); delta +129. Contra os 1743 da rodada 1: -2, explicado acima.
- `npm run smoke -- boot`: `ok boot.smoke.mjs`, 1 cenário ok, exit 0.
- `npm run smoke -- boss`: **não rodei de novo**, como combinado. Nada do chefe mudou desde a rodada 1 (a única mudança em `src/` é o `armElbow` do player), e o resultado da rodada 1 (3 cenários ok em `dfbda56`) continua valendo para o código do chefe.
- Árvore real: `git status --porcelain` antes e depois idênticos (só `.agents/ .claude/ .cursor/ .windsurf/ skills-lock.json`, não rastreados). `git stash list` vazio. `git worktree list` sem o scratch; `node_modules` real conferido intacto depois de remover a junction.

### Sensor de discriminação (rodado)

**Isolamento**: `git worktree add` em scratch fora do repositório (HEAD `9765173`), `node_modules` por junction, troca textual de um trecho exato por mutante, `tests/game/art.test.ts` + `tests/game/registerAnims.test.ts` + `tests/game/playerConsistency.test.ts` (542 testes) a cada um, arquivo restaurado depois. Junction removida primeiro (`cmd /c rmdir`), depois `git worktree remove --force`.

**27 mutantes rodados: 22 mortos, 5 sobreviventes.**

#### A. Os 10 sobreviventes da rodada 1, de novo

| # | Arquivo | Mutação | Resultado agora |
| --- | --- | --- | --- |
| B04 | `boss.ts:357` | tira `R: 'C'` do mapa da Tecelã | MORTO por BSP-13 |
| B05 | `boss.ts:354` | `U: 'l'` vira `U: 'L'` | MORTO por BSP-13 |
| R06 | `boss.ts:376` | `still()` com `repeat: -1` em vez de 0 | SOBREVIVEU, equivalente (abaixo) |
| R07 | `boss.ts:332` | `leap` com `legs: 'stand'` em vez de `'tuck'` | MORTO por BSP-14 |
| M03 | `playerMoves.ts:63` | `armPalm` sem o brilho `A` | MORTO por LMB-09 |
| M04 | `playerMoves.ts:54` | `armElbow` sem a ponta `o` (`'ok'` vira `'Nk'`) | SOBREVIVEU (abaixo) |
| M05 | `playerMoves.ts:103` | `legDown` sem o sapato (`rows.push('kKsk')`) | MORTO por LMB-11 |
| E02 | `enemy.ts:161` | padrão do `rimFrom` de 3 para 4 | MORTO por EPD-05 (corcunda e rastejante) |
| E06 | `enemy.ts:580-584` | `B_ARM_HANG` volta ao punho em bloco | MORTO por EPD-06 |
| E07 | `enemy.ts:593-596` | `B_ARM_FWD` volta ao punho em bloco | MORTO por EPD-06 |

**R06 é equivalente?** Concordo, no comportamento observável (lido, não rodei o Phaser). `still()` só entrega `leap` e `dead`, de 1 frame. O adaptador é o único consumidor: `src/game/Boss.ts:357` chama `anims.play(key, true)` a cada frame e não tem `animationcomplete`, `isPlaying` nem `currentAnim` (grep por `isPlaying`, `currentAnim`, `animationcomplete` e `ANIMATION_COMPLETE` em todo `src/` e `scripts/`: nenhuma ocorrência). Com `repeat: 0`, ao acabar o único frame o Phaser mantém esse frame na tela e o próximo `play(key, true)` o reinicia no mesmo frame; com `repeat: -1` ele fica em laço no mesmo frame. A tela é a mesma em qualquer instante. Não é equivalente no texto do dado (`repeat` muda), só no que o jogo faz com ele. Fica sem AC por decisão registrada nas Assumptions da spec.

**M04** (a marca escura `o` ao lado da ponta do cotovelo) segue sem AC: o LMB-10 fixa a coluna da ponta e que ela tenha 1 texel, não o miolo. É um detalhe de cor de 1 texel numa linha interna; vira nota baixa de precisão (abaixo), não bloqueio.

#### B. Mutantes novos no `armElbow` (LMB-10)

| # | Arquivo | Mutação | Resultado |
| --- | --- | --- | --- |
| N1 | `playerMoves.ts:52-56` | `armElbow` volta à versão da rodada 1 (`len` colunas, 1 texel curta) | MORTO por LMB-10 |
| N2 | `playerMoves.ts:53` | ponta com 2 texels opacos (`'Nk.'` vira `'Nkk'`) | MORTO por LMB-10 |
| N3 | `playerMoves.ts:176` | `armElbow(13)` em vez de `(12)` na `cotovelada-hit` (alcance +1) | MORTO por LMB-10 |
| N4 | `playerMoves.ts:176` | cotovelo deslocado 1 coluna para a esquerda (`9` vira `8`) | MORTO por LMB-10 |
| N5 | `playerMoves.ts:52-53` | a mesma mutação do N2, aplicada com um trecho de duas linhas (duplicata, não é um mutante independente) | MORTO por LMB-10 |

Os dois lados do limite de alcance foram exercitados: 22 (N1, N4) e 24 (N3).

#### C. Mutantes novos nos outros ACs novos

| # | Arquivo | Mutação | Resultado |
| --- | --- | --- | --- |
| X1 | `boss.ts:178` (`STANCES.tuck`) | pé de perto 1 texel mais baixo (`[12, 3]` vira `[12, 2]`; base 28 passa a 29) | MORTO por BSP-14 (no limite) |
| X2 | `playerMoves.ts:63` | brilho da palma em 3 linhas em vez de 2 (3 `A` à direita da coluna 20) | MORTO por LMB-09 |
| X3 | `playerMoves.ts:103` | sola com 2 `s` (`'ksssk'` vira `'ksskk'`) | MORTO por LMB-11 (no limite) |
| X4 | `enemy.ts:161` | padrão do `rimFrom` de 3 para 2 (borda começa uma linha antes) | MORTO por EPD-05 (o lado "e não na de cima") |
| X5 | `boss.ts:351` | `H: 'w'` vira `H: 'I'` | MORTO por BSP-13 |
| X6 | `boss.ts:357` | chave extra `s: 'i'` no mapa | MORTO por BSP-13 |
| X7 | `boss.ts:350` | tira `m: 'K'` | MORTO por BSP-13 |
| X10 | `enemy.ts` (`B_ARM_HANG`, última linha) | enche o canto de baixo à direita do punho | MORTO por EPD-06 |
| X12 | `enemy.ts` (`B_ARM_FWD`, última linha) | enche a linha de baixo do punho do `walk-0` | MORTO por EPD-06 |
| X8 | `playerMoves.ts:63` | brilho da palma 1 coluna à esquerda | SOBREVIVEU |
| X9 | `enemy.ts` (`B_ARM_HANG`, última linha) | enche o canto de baixo à esquerda do punho | SOBREVIVEU |
| X11 | `enemy.ts` (`B_ARM_FWD`, primeira linha) | enche o canto de cima à direita do punho | SOBREVIVEU |

Sobreviventes X8, X9 e X11: o LMB-09 conta os `A` mas não fixa a posição; o EPD-06 fixa um texel por frame (o canto de baixo à direita do `idle-0` e o do `walk-0`), como a spec pede, e os outros cantos do punho ficam livres. Dentro do que a spec diz; vira nota informativa.

**Resultado**: 27 execuções (10 reinjeções da rodada 1 e 17 mutantes novos; o N5 repete o N2), 22 mortos, 5 sobreviventes (R06, M04, X8, X9, X11), nenhum em comportamento fixado por AC. Rodada 1: 56 mutantes. Os sobreviventes da rodada 1 que ganharam AC novo morreram todos (8 de 10; os 2 restantes estão explicados acima).

### Code Quality da rodada 2 (lido)

| Princípio | Status |
| --- | --- |
| Nada além do pedido | OK: a única mudança de produção é o `armElbow`, que o orquestrador explicou (voltar a `len + 1` colunas); o resto é teste e spec |
| Superfície mínima | OK: 6 linhas em `playerMoves.ts`, comentário do `armElbow` atualizado para dizer `len + 1` |
| Estilo dos vizinhos | OK: testes na ordem dos blocos existentes, `artMeasure` reaproveitado, `it.each` com `as const` como em `EPD-04` |
| Testes mapeiam ACs e não são rasos | OK: cada `it` cita o ID; os limiares dos dois lados foram exercitados (X1, X3, N1, N3, N4, X4) |
| Código morto | OK: o build roda `tsc --noEmit` com `noUnusedLocals` |
| Edição de `spec.md` e `tasks.md` | Não fiz (só leitura); ver pendências |

### Lacunas restantes (todas de precisão, nenhuma bloqueia)

1. `armElbow`: a marca `o` do miolo (M04) não tem AC. Baixa.
2. LMB-09 conta os 2 `A` mas não fixa a posição (X8). Baixa.
3. EPD-06 fixa um canto por frame; os outros cantos do punho (X9, X11) ficam livres. Informativa, é o que a spec escreveu.
4. `repeat` de `leap` e `dead` (R06): equivalente no jogo, sem AC por decisão da spec.
5. EDG-02: só a direção "menos `durations` que `frames`" (lacuna 8 da rodada 1, mantida por decisão). A outra direção continua no teste antigo do SPR-08 (R05 morre lá).
6. Margens largas do BSP-03, BSP-04 e BSP-07 (informativa, lacuna 7 da rodada 1): inalterada.
7. Pendência de forma: `tasks.md` ainda tem `Status: In Progress` e a tabela de rastreabilidade de `spec.md` ainda diz `Implementing` nos 47 IDs. Não editei; o orquestrador atualiza depois do UAT.

Lições L-052 a L-054 (`9765173`, `.specs/LESSONS.md` e `.specs/lessons.json`): estão no diff, mas não as revisei; não afetam o veredito.

### Interactive UAT

Continua fora do escopo do Verifier. O que a spec chama de "lê como um oni" e "punho e pé maiores que antebraço e canela" fica para o usuário em `?debug&round=5` e `?debug&round=15`; os ACs novos medem texels, não a leitura visual.

### Atualização de rastreabilidade (a aplicar pelo orquestrador; `spec.md` não foi editado)

| Requisito | Status anterior | Novo status |
| --- | --- | --- |
| BSP-01 | Implementing | Verified |
| BSP-02 | Implementing | Verified |
| BSP-03 | Implementing | Verified |
| BSP-04 | Implementing | Verified |
| BSP-05 | Implementing | Verified |
| BSP-06 | Implementing | Verified |
| BSP-07 | Implementing | Verified |
| BSP-08 | Implementing | Verified |
| BSP-09 | Implementing | Verified |
| BSP-10 | Implementing | Verified |
| BSP-11 | Implementing | Verified |
| BSP-12 | Implementing | Verified |
| BSP-13 | Implementing | Verified (rodada 2, mapa literal; B04 e B05 mortos) |
| BSP-14 | Implementing | Verified (rodada 2) |
| BAN-01 | Implementing | Verified |
| BAN-02 | Implementing | Verified |
| BAN-03 | Implementing | Verified |
| BAN-04 | Implementing | Verified |
| BAN-05 | Implementing | Verified |
| BAN-06 | Implementing | Verified |
| BAN-07 | Implementing | Verified |
| LMB-01 | Implementing | Verified |
| LMB-02 | Implementing | Verified |
| LMB-03 | Implementing | Verified |
| LMB-04 | Implementing | Verified (teste pré-existente) |
| LMB-05 | Implementing | Verified (teste pré-existente) |
| LMB-06 | Implementing | Verified (teste pré-existente) |
| LMB-07 | Implementing | Verified |
| LMB-08 | Implementing | Verified |
| LMB-09 | Implementing | Verified (rodada 2) |
| LMB-10 | Implementing | Verified (rodada 2) |
| LMB-11 | Implementing | Verified (rodada 2) |
| BPW-01 | Implementing | Verified |
| BPW-02 | Implementing | Verified |
| BPW-03 | Implementing | Verified |
| OBJ-01 | Implementing | Verified |
| OBJ-02 | Implementing | Verified |
| OBJ-03 | Implementing | Verified |
| OBJ-04 | Implementing | Verified |
| EPD-01 | Implementing | Verified |
| EPD-02 | Implementing | Verified |
| EPD-03 | Implementing | Verified |
| EPD-04 | Implementing | Verified |
| EPD-05 | Implementing | Verified (rodada 2) |
| EPD-06 | Implementing | Verified (rodada 2) |
| EDG-01 | Implementing | Verified |
| EDG-02 | Implementing | Verified |

47 de 47 verificados (14 BSP, 7 BAN, 11 LMB, 3 BPW, 4 OBJ, 6 EPD, 2 EDG).

### Resumo da rodada 2

**Overall**: Pronto (PASS)

**Spec-anchored check**: 7 de 7 IDs novos ou reescritos com evidência no valor da spec; 47 de 47 no total | 0 lacunas de precisão que mudem o veredito (restam 6 notas baixas)
**Sensor**: 22 de 27 mortos; os 5 sobreviventes (R06, M04, X8, X9, X11) não têm AC
**Gate**: build ok, 1741 testes passaram, 0 falharam, smoke `boot` ok (`boss*` não repetido; nada do chefe mudou)
**Isolamento**: `git status --porcelain` da árvore real idêntico ao baseline; scratch removido (junction primeiro)

**Próximos passos**: UAT visual do usuário; depois marcar os 47 IDs como Verified em `spec.md`, fechar `tasks.md` e mesclar em `dev` com `--no-ff` (AD-008).
