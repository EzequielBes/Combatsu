# Validation: ritmo-economia-e-chefe - PASS (rodada 2)

**Veredito**: PASS. Os 6 gaps de cobertura da rodada 1 estão fechados com asserção do valor da spec; typecheck, 1300 testes e 27 cenários de smoke passam; o sensor matou 5/5 mutantes novos; nada da rodada 1 regrediu.
**Date**: 2026-10-02
**Spec**: `.specs/features/ritmo-economia-e-chefe/spec.md`
**Branch**: `feat/ritmo-economia-e-chefe`
**Diff range**: `3033e7c..HEAD` (HEAD = `8ea612f`). Rodada 1 cobriu `3033e7c..10db905`; esta rodada acrescenta `10db905..8ea612f` (7 commits: `92eca78`, `2a9089c`, `a33ea93`, `6ef9d6a`, `e7921f2`, `2b2b699`, `8ea612f`; 12 arquivos, +218/-15).
**Verifier**: independente (autor != verificador), Sonnet 5.5. Nenhum código de produção ou teste foi alterado; mutações só em worktree descartável.

## Resumo da rodada 1 (FAIL por cobertura)

Gates e sensor (9/9 mortos) passavam, mas 6 cláusulas de AC não tinham asserção do valor da spec: (1) BFX-06 limiar de 48 px sem os dois lados; (2) BFX-09 regra de seleção do upgrade grátis só com smoke de uma técnica; (3) MST-08 largura exata da barra; (4) PRG-02/03/04/06 Fluxo e tetos sem prova direta; (5) SPN-08 valor 0,35 solto na cena; (6) EDG-03/EDG-05 ligações da cena. Nenhum comportamento errado foi observado. O arquivo da rodada 1 era não rastreado; esta rodada o substitui, e as evidências da rodada 1 reconferidas estão na tabela de ACs abaixo.

## Re-verificação dos gaps (evidence-or-zero, L-043)

Cada função extraída é de fato a usada pelo adaptador, e o adaptador repassa o valor real da spec.

| Gap | Spec | Código usado pelo adaptador | `file:line` + asserção | Resultado |
| --- | --- | --- | --- | --- |
| 1 BFX-06 (48 px) | `<= 48 px` tira `round(0,12 x maxHp)`; fora do `stagger` 0 | `src/scenes/TestScene.ts:1351-1358`: `tryBossFinisher` chama `bossFinisherDamage({dist: Math.abs(boss.x - player.x), state, finisherReady, maxHp: boss.maxHp, t: BOSS.finisher})` e só prossegue se `damage > 0`. `BOSS.finisher = {hpFraction: 0.12, rangePx: 48}` (`src/data/tuning.ts:292`). `src/core/bossFinisher.ts:17-18`: `dist > rangePx` -> 0, senão `Math.round(hpFraction x maxHp)` | `tests/core/bossFinisher.test.ts:7-9` `dist 48 toBe(48)`, `dist 49 toBe(0)`; `:13-15` seis estados fora de `stagger` `toBe(0)` (BFX-08); `:19` `finisherReady:false` `toBe(0)` (BFX-07); `:23-24` arredondamento 49/48 | PASS (dois lados). Ressalva menor: o dano real aplicado ainda sai de `boss.receiveFinisher()` (`bossBrain`, coberto em `bossBrain.test.ts:452`); a função nova decide só o gate de alcance/estado, que é o que o gap pedia |
| 2 BFX-09 (seleção) | menor nível vence; empate slot 0; nada upável -> nada | `TestScene.ts:810-811`: `bossRewardSlot(this.loadout.slotsView)` escolhe o slot e `pick = slotsView[slot]`; `src/core/bossReward.ts:9-14` (`s.level < 3 && s.level < best`, `i` 0 antes de 1) | `tests/core/bossReward.test.ts:5-6` (uma técnica: 0 e 1), `:10-11` (2,1 -> 1; 1,2 -> 0), `:15` (2,2 -> 0), `:19-23` (Nv3 pulado; 3,3 / 3,null / null,null -> `null`) | PASS (cada ramo) |
| 3 MST-08 (barra) | `round(larguraDoSlot x pontos / limiar)`; oculta no Nv3 | `src/game/EnergyHud.ts:157-162`: `masteryBarWidth(ICON_SIZE, mastery.points(i), mastery.threshold(s.level))`, `null` oculta a barra, senão `bar.width = width`; `ICON_SIZE = 48` (`EnergyHud.ts:29`). `src/core/masteryBar.ts:7`: `Math.round((slotW x points) / threshold)` | `tests/core/masteryBar.test.ts:6` `(48,14,15) toBe(45)`, `:7` `(48,0,15) toBe(0)`, `:8` `(48,15,15) toBe(48)`, `:9-10` `(48,12,25) toBe(23)` e `(48,13,25) toBe(25)` (separa round de floor), `:14-15` limiar `null` -> `toBeNull()` | PASS |
| 4 PRG-02/03/04/06 | Fluxo sobe 1 nível; regen = `cursedEnergyRegenAtLevel(n)`; Energia Nv5 e Fluxo Nv4 saem do sorteio | `TestScene.ts:277` `new Modifiers(FULL_SHOP_CATALOG)` e `:446` `energy.setLevels(modifiers.level('energia'), modifiers.level('fluxo'))`; o teste usa o mesmo `FULL_SHOP_CATALOG` | `tests/core/techShop.test.ts:372-385`: `shop.buy` -> `{ok:true,id:'fluxo',cost:12}`, `modifiers.level('fluxo') toBe(1)`, `energia` 0, `energy.regen toBe(cursedEnergyRegenAtLevel(1))` e `> 8`; `:394-401` energia Nv4 entra / Nv5 `not.toContain` e fluxo segue; `:403-410` fluxo Nv3 entra / Nv4 sai | PASS (dois lados dos tetos). A ligação cena->`setLevels` continua sem teste de cena, mas a causa raiz (catálogo errado) foi coberta pelo catálogo real e o smoke de Energia segue verde |
| 5 SPN-08 (0,35) | prefere as costas com prob. 0,35 | `TestScene.ts:967` `preferBackChance: SPAWN.preferBackChance` (a constante local `SPAWN_PREFER_BACK_CHANCE` foi removida); `src/data/tuning.ts:142` `SPAWN = { preferBackChance: 0.35 }` | `tests/data/tuning.test.ts:158-160` `expect(SPAWN.preferBackChance).toBe(0.35)` | PASS |
| 6 EDG-03 (reset do limitador) | permissões zeradas no reinício da run | `TestScene.ts:725` `attackGate.reset()` em `onStartRun` | `scripts/smoke/spawn-pressure.smoke.mjs` bloco 4: ocupa vaga/fila (`gate.active > 0 \|\| queue.length > 0`), morre (tecla 4), reinicia com J, e `assert(s.gate.active === 0 && s.gate.queue.length === 0)` no 1º frame da run nova | PASS (smoke, verde nesta rodada) |

Também endurecido em `8ea612f`: o smoke de pressão continua amostrando até achar um par em `hold` estabilizado (`settledPairs === 0 && sampledMs < TARGET_MS * 2`), sem mudar as asserções (`LIM-01/02/05` mantidas). Verde na suíte completa.

EDG-05 (rugido pendente x parede pelo caminho `Boss.ts:254`) segue só no cérebro (`bossBrain.test.ts:353`); a spec não define o instante do "rugido pendente" (ressalva baixa, não bloqueante, igual à rodada 1).

## Checagem ancorada na spec (61 ACs, atualizada)

Os `file:line` da rodada 1 foram reconferidos por spot-check nos ACs de maior risco (testes e asserções inalterados, todos verdes nos 1300 testes e nos smokes).

| Grupo | ACs | Evidência (resumo) | Resultado |
| --- | --- | --- | --- |
| Energia e Fluxo | PRG-01, PRG-05 | `spawn-pressure.smoke.mjs:164-169` (`buy:energia`, `ce.max === 120`); `energy.test.ts:94` | PASS |
| | PRG-02, PRG-06 | `techShop.test.ts:372-385` (gap 4) | PASS (era GAP) |
| | PRG-03, PRG-04 | `techShop.test.ts:394-410` (gap 4) | PASS (era parcial) |
| Mais inimigos | SPN-01..05 | `waves.test.ts:42-50` (6,8,12,20,20,20), `:62-70` (5,5,6,6,8,8), `:93`, `:116-120`, `:119` (1499 ms `[]`, +1 ms `[k:3]`), `:151` (`alive 5`, nada nasce) | PASS (sem regressão) |
| | SPN-06, SPN-07, SPN-09 | `level.test.ts:95-99`; `spawnPoint.test.ts:36-60` (832/833, 368/367, 49/50) e `:147` | PASS (sem regressão) |
| | SPN-08 | `tuning.test.ts:158-160` `toBe(0.35)` + lógica `spawnPoint.test.ts:75-107` | PASS (era GAP-baixo) |
| | SPN-10..14 | `enemyAI.test.ts:79,116,131`; `difficulty.test.ts:40,43` | PASS |
| Limitador | LIM-01, LIM-02 | `attackGate.test.ts:13` (3ª `false`, `activeCount 2`), `:111` (349 `false`, 350 `true`); smoke `:93-94`, `:134` | PASS (sem regressão; sensor M1/M2 da rodada 1 seguem válidos, código intocado) |
| | LIM-03..06, LIM-08 | `enemyAI.test.ts:150,246,467`; `attackGate.test.ts:13,70` | PASS |
| | LIM-07 | `enemyAI.test.ts:188` (62/66 parado, 67/61 andam; 110/114, 109/115) e `:483` `holdTolerance === 2` | PASS (sem regressão) |
| Renda | ECN-01..04, ECN-08, ECN-09 | `shop.test.ts:101,110`; `economy.test.ts:6,12`; `techShop.test.ts:342` | PASS |
| | ECN-05, ECN-06, ECN-07 | `techShop.test.ts:255` (25 seeds, `ids[0] === 'divergente'`; rodada 1 `['vida','forca','agilidade']`), `:291` (reroll mantém `azul`) | PASS (sem regressão; sensor M5 da rodada 1) |
| Chefe | BFX-01, BFX-03, BFX-04, BFX-07, BFX-10 | `bossTier.test.ts:15`; `bossAI.test.ts:329,370`; `bossBrain.test.ts:452`; smoke `boss-punish:224` | PASS |
| | BFX-02 | `bossBrain.test.ts:353` (`stun(1500)`, 1499 em stagger, 1500 sai); smoke `boss-punish:127,140` | PASS (sem regressão) |
| | BFX-05 | `bossBrain.test.ts:412` (10 -> 15; 7 -> 11); smoke `:176` | PASS (sem regressão) |
| | BFX-06 | `bossFinisher.test.ts:7-9` (48 -> 48, 49 -> 0) + `bossBrain.test.ts:452` (`hp 352`) | PASS (era GAP) |
| | BFX-08 | `bossFinisher.test.ts:13-15`; `bossBrain.test.ts:452`; smoke `:149-150` | PASS |
| | BFX-09 | `bossReward.test.ts:5-23`; smoke `boss-punish:217` (`slots[0].level === 2`) | PASS (era GAP) |
| Maestria | MST-01, MST-02, MST-05..07 | `mastery.test.ts:42,73,92,108`; smoke `shop-progress:104-112` | PASS |
| | MST-03, MST-04 | `mastery.test.ts:18` (14 não, 15º sobe, `points 0`), `:28` (24 não, 25º sobe) | PASS (sem regressão; sensor M8 da rodada 1) |
| | MST-08 | `masteryBar.test.ts:6-15` (gap 3) | PASS (era GAP) |
| Edge | EDG-01, EDG-02, EDG-04, EDG-06 | `waves.test.ts:194,202`; `techShop.test.ts:321`; `bossBrain.test.ts:500` | PASS |
| | EDG-03 | smoke `spawn-pressure` bloco 4 (gap 6) + `attackGate.test.ts:147` | PASS (era ressalva) |
| | EDG-05 | `bossBrain.test.ts:353` it.each `roar` | PASS no cérebro; fluxo `Boss.ts:254` sem asserção (spec-precision: instante do "rugido pendente" indefinido) |

**Status**: 61/61 ACs com asserção do valor da spec; 0 gaps; 1 ressalva baixa (EDG-05 pelo caminho do `Boss`, spec-precision) e 1 observação baixa (ligação cena->`setLevels` do Fluxo sem teste de cena).

Spec-precision gaps: o texto de LIM-04 diz "há mais tempo em `hold`" enquanto a implementação ordena por quem pediu permissão primeiro; equivalem-se (observação da rodada 1, inalterada). EDG-05 não define o instante do "rugido pendente".

## Sensor de discriminação (rodada 2)

Scratch: `git worktree add <scratchpad>/wt-verify2 HEAD`, `node_modules` por junction, `npx vitest run <arquivo>`, mutante revertido com `git checkout -- .`.

| # | Alvo (AC) | Mutação | Testes | Resultado |
| --- | --- | --- | --- | --- |
| N1 | `src/core/bossFinisher.ts:17` (BFX-06) | `dist > rangePx` -> `dist >= rangePx` (48 px deixa de valer) | `bossFinisher.test.ts` | MORTO (1 falha: `alcance: 48 px ...`) |
| N2 | `src/core/bossReward.ts` (BFX-09) | `s.level < best` -> `s.level <= best` (empate vai ao slot 1) | `bossReward.test.ts` | MORTO (1 falha: `empate: slot 0`) |
| N3 | `src/core/masteryBar.ts:7` (MST-08) | `Math.round` -> `Math.floor` | `masteryBar.test.ts` | MORTO (1 falha: `round(48 x pontos / limiar)`) |
| N4 | `src/data/tuning.ts:142` (SPN-08) | `0.35` -> `0.4` | `tuning.test.ts` | MORTO (2 falhas, incluindo `SPAWN (SPN-08)`) |
| N5 | `src/data/shop.ts:171` (PRG-04) | `fluxo.maxLevel` 4 -> 5 | `techShop.test.ts` | MORTO (2 falhas: `fluxo: comum, maxLevel 4` e `PRG-03, PRG-04 ... fluxo: no nível 3 ainda entra; no 4 sai`) |

**Sensor depth**: leve (5 mutantes manuais nas funções novas). **Resultado**: 5/5 mortos, nenhum sobrevivente (somando os 9/9 da rodada 1, 14/14).
**Isolamento**: worktree `wt-verify2` e junction removidos (`git worktree list` sem `wt-verify2`; `node_modules` do repo principal intacto, 58 entradas); `git status --porcelain` do repo principal idêntico ao baseline capturado antes do sensor. Sem `git stash`. Obs.: o primeiro `git worktree remove` deixa o junction órfão na pasta; foi removido com `rmdir` (sem seguir o link) antes de recriar a worktree para N5.

## Code Quality

| Princípio | Status |
| --- | --- |
| Minimum code | OK: 3 funções puras pequenas (`bossFinisherDamage`, `bossRewardSlot`, `masteryBarWidth`) e uma constante `SPAWN`, cada uma com um único chamador real |
| Surgical changes | OK: `TestScene.ts` troca só os trechos extraídos (+24/-15 no total); `EnergyHud.ts` +7/-4 |
| No scope creep | OK |
| Matches patterns | OK: lógica pura em `src/core`, tuning em `src/data/tuning.ts` |
| Spec-anchored outcome check | OK: valores 48/49, 45, 23/25, 0,35, tetos 5/4 afirmados |
| Per-layer Coverage Expectation | OK: núcleo 1:1 por AC, dois lados do limiar (L-010, L-047); a cena só por smoke onde a spec não dá valor novo |
| Todo teste mapeia a um AC | OK: `describe` cita BFX-06..08, BFX-09, MST-08, PRG-02/03/04/06, SPN-08 |
| Guias do projeto | L-010 e candidatas L-047/048/049 seguidas pelos testes novos |

## Gate Check

- **Gate**: `npm run typecheck`, `npm test`, `npm run smoke` (suíte completa, inclui `npm run build`).
- `npm run typecheck`: exit 0.
- `npm test`: 1300 testes passam, 0 falham, 0 ignorados (rodada 1: 1286; +14 desta faixa).
- `npm run smoke`: 27 cenários ok, 0 falhas (incluindo `spawn-pressure`, `boss-punish`, `shop-progress`, `finisher`). Rodado sem carga paralela; o flake de `finisher` da rodada 1 não reapareceu. Nenhuma intermitência nesta rodada.
- **Contagem de testes**: declarações `it(`/`test(` em `tests/` passaram de 1004 (`3033e7c`) para 1156 (`HEAD`), +152; nenhum teste removido nem asserção afrouxada (o diff da faixa só adiciona testes e uma linha de import em `tuning.test.ts`).

## Requirement Traceability Update

| Requirement | Previous | New |
| --- | --- | --- |
| PRG-01..PRG-06 | Needs Fix (PRG-02/03/04/06) / Verified | Verified |
| SPN-01..SPN-14 | Verified (SPN-08 parcial) | Verified |
| LIM-01..LIM-08 | Verified | Verified |
| ECN-01..ECN-09 | Verified | Verified |
| BFX-01..BFX-10 | Needs Fix (BFX-06, BFX-09) | Verified |
| MST-01..MST-08 | Needs Fix (MST-08) | Verified |
| EDG-01..EDG-04, EDG-06 | Verified | Verified |
| EDG-05 | Verified no núcleo | Verified no núcleo (ressalva spec-precision) |

## Summary

**Overall**: Ready (PASS)

**Spec-anchored check**: 61/61 ACs com asserção do valor da spec; 1 ressalva spec-precision (EDG-05) não bloqueante
**Sensor**: 5/5 mutantes mortos nesta rodada (14/14 somando a rodada 1)
**Gate**: typecheck ok; 1300 testes passam; smoke 27/27 ok

**Lições**: PASS limpo, sem mutante sobrevivente nem novo sinal; nenhuma lição nova. As candidatas L-047, L-048 e L-049 (registradas na rodada 1) seguem como `candidate` até corroboradas por uma segunda feature distinta, conforme `lessons.md` (promoção só por recorrência em features distintas).
