# Fundação de poder — Validation

**Date**: 2026-10-15 (rodada 1, com o conserto do próprio Verifier e a revalidação)
**Spec**: `.specs/features/fundacao-de-poder/spec.md` (POW-01..POW-11, POW-13..POW-15 e 7 casos de borda)
**Diff range**: `cca7f00..739ff03`, branch `feat/fundacao-de-poder`, 31 commits, 76 arquivos (+3643/−291). O conserto
desta validação é o commit `935b89c` (`test(smoke): prove kick, shake, hand side and chip ai in the live game`, ver Fix Plans).
**Verifier**: sub-agente independente (autor ≠ verificador). O sensor rodou num worktree temporário
(`git worktree add --detach … HEAD`, `node_modules` por junção), já removido.

## Validation

**Result**: PASS (depois do conserto)

Em uma linha: as 14 exigências têm evidência `arquivo:linha` no valor da spec, mas a primeira passada do sensor achou 5
mutantes vivos em adaptadores (tranco, tremor, lado da chama, estrutura e `interrupt` no chip) que nenhum smoke lia; o
conserto pôs o efeito real no snapshot e nos smokes, os 5 morreram, os 8 mutantes de regra pura já morriam. Gate verde.

---

## Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1..T26 | ✅ Done | Todas marcadas `[x]` em `tasks.md`; conferidas pelo efeito, não pela marca |
| Correções pós-T26 | ✅ Done | `be0c885` (número mostra o dano que o chefe levou), `98210ec` (números legíveis e afastados), `9b28c47` (chama apaga no fim do repouso), `2c60721` (`mods=` com nível enorme não trava), `739ff03` (marca a conferência vazia do micro) |

---

## Spec-Anchored Acceptance Criteria

### P1: Um dono para os multiplicadores

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| POW-01.1 | `statSheet` é o único que combina passivas, arsenal e votos | `src/core/statSheet.ts:69-79`; `grep` em `src/`: nenhuma outra composição (`VowDirector.strikeMul`, `ArsenalDirector.strikeMul`, `TestScene.strikeMul` saíram) | ✅ PASS |
| POW-01.2 | `StatsDirector` é o único escritor dos 5 números | `src/scenes/test/statsDirector.ts:52-56`; `grep -E "damageMul =|vowDamageMul =|costMul =|damageTakenMul =|setMaxHp\("` em `src/` só acha esse método e o `Loadout.reset` (`src/core/loadout.ts:127-129`, pré-existente, o dono zerando os próprios campos; o `stats.reset()` refaz a folha logo depois, `runDirector.ts:151`) | ✅ PASS |
| POW-01.3 | 9 votos × 7 relíquias × 7 passivas × 3 golpes × Passo sombrio = números de hoje | `tests/core/statSheet.test.ts:62` `expect(sheet.meleeMul(traitsOf(move, shadow))).toBe(todayStrikeMul(...))`, `:76` `expect(checked).toBe(kills.length * 7 * 7 * 3 * 2)`; `:67-71` relíquia, voto, custo, dano sofrido e guarda iguais | ✅ PASS |
| POW-01.4 | `vida` refaz a folha antes da cura de 15 | `src/scenes/test/shopDirector.ts:39-40` (`stats.sync()` e depois `heal`); provado pelo valor no POW-01.5 | ✅ PASS |
| POW-01.5 | 50/60 com Corpo de vidro → 65/69; 80/100 → 95/115 | `scripts/smoke/vows.smoke.mjs:236` `glass.after === '65/69'`, `:238` `plainBuy.after === '95/115'`; `tests/core/statSheet.test.ts:113-114` `toBe(115)`, `toBe(69)` | ✅ PASS |
| POW-02.6 | `TestScene` com 393 linhas efetivas na T2 | Medido (sem linha em branco nem comentário): 399 em `cca7f00`, **393** em `9a1ddd0` (T2) | ✅ PASS |
| POW-02.7 | Passos 2 a 6 nunca somam; fim com ≤ 393 | Só 3 commits tocam a cena: 393 (`9a1ddd0`), 393 (`51594ca`), **390** (`10667be`); HEAD 390 | ✅ PASS |

### P1: O dano frequente não trava o jogo

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| POW-03.1 | chip: sem hitstop, sem freeze, faísca 6 | `tests/scenes/effects.test.ts:83-86` `size: HIT_BAND_FEEL.chip.sparkSize`, `hitstop.frozen` e `frozen` `false`, `log` `{shakes: 0, pauses: 0}`; `tests/core/hitBand.test.ts:94` `chip.sparkSize` `toBe(6)` | ✅ PASS |
| POW-03.2 | micro: 15 ms leve, 20 ms forte, faísca 10 | `tests/core/hitBand.test.ts:12-13` `toBe(15)`, `toBe(20)`; `tests/scenes/effects.test.ts:92-98` faísca 10, congelado aos 14 ms e solto aos 15 | ✅ PASS |
| POW-03.3 | teto de 60 ms em 1000 ms reais; recusado ainda risca a faísca | `tests/core/hitBand.test.ts:20-23` 20+20+20 e `toBe(0)`; `:34-54` 999/1000/1001 ms; `tests/scenes/effects.test.ts:109-117` faísca 10 com o teto cheio, sem pausa, e a janela anda no `game.loop.time` | ✅ PASS |
| POW-03.4 | com banda e vivo: exatamente `[{type:'chip', hit}]`, estado e `downHits` iguais | `tests/core/enemyBrainChip.test.ts:37-39`, `:45-46`, `:53-56` (hitstun), `:64-67` (stagger), `:73` (comprometido), `:79-81` (no chão, `downHits` 0) | ✅ PASS |
| POW-03.5 | letal com banda: `died` e `ragdoll` | `tests/core/enemyBrainChip.test.ts:87-92` `toEqual([{type:'died'},{type:'ragdoll'}])`, `:98` no chão | ✅ PASS |
| POW-03.6 | chefe: chip = dano × 0,5; micro = regra de hoje | `tests/core/bossBrainChip.test.ts:29` `chipPoiseMul` `toBe(0.5)`, `:33` `toBe(4)` (8 de dano), `:41-42` micro 6 e 12 | ✅ PASS |
| POW-15.7 | banda: dano sem `interrupt`, sem `walkVxStep`, sem `pickHitReaction`, sem `trackStreak`, sem efeito; devolve `true` | `src/game/enemy/EnemyDefense.ts:178-188` (`receiveBand`); no jogo, `scripts/smoke/power.smoke.mjs:104-108` só conta quem levou tique **durante o `windup`** e chegou ao `attack`, `:176-179` | ✅ PASS (A5 morto pelo conserto) |
| POW-15.8 | chip não enche a estrutura; micro enche metade | `tests/core/hitBand.test.ts:114-115` `toBe(0)`, `toBe(5)`; no jogo, `scripts/smoke/power.smoke.mjs:104` + `:151-154` `structureUp.length === 0` nos quadros de tique | ✅ PASS (A4 morto pelo conserto) |
| POW-15.9 | evento `chip:<id>`, sem reação de corpo | `src/game/enemy/EnemyDefense.ts:305`; `scripts/smoke/power.smoke.mjs:168` `chipIds.size >= 2`; `:147-150` nenhum `hitstun` | ✅ PASS |
| POW-04.10 | tique com `band: 'chip'`, implosão sem banda | `src/game/tech/blue.ts:69-73`; `scripts/smoke/power.smoke.mjs:159` `implosionFrozen === true`, `:175` | ✅ PASS |
| POW-04.11 | 5 inimigos no Azul: hitstop 0 nos tiques, sem `hitstun`, um `windup` chega ao `attack` | `scripts/smoke/power.smoke.mjs:118` (`maxAlive=5`), `:143-146` `strayFrozen.length === 0`, `:147-150` `hitstun.length === 0`, `:173` `tickFrames >= 3`, `:176-179` | ✅ PASS |
| POW-14.12 | 8 inimigos, Azul + Vermelho + soco em 1000 ms: efeitos ≤ 40, números ≤ 12, micro ≤ 60 ms | `scripts/smoke/power-load.mjs:133-138` `loadedWindow(m)`, `m.fx <= 40`, `m.numbers <= 12`, `:141` `m.micro <= 60`; medido `fx 14, numbers 12, micro 0` | ✅ PASS (ressalva: micro) |

Ressalva do POW-14: nenhuma técnica emite `micro` antes da F30 (Out of Scope da spec), então `hitstop.microMs` lê 0 no
jogo e a conferência é vazia (`power-load.mjs:139-140` diz isso). O teto está provado só em `tests/core/hitBand.test.ts:18-88`
e no `EffectsDirector` (`tests/scenes/effects.test.ts:101-118`). Fica para o primeiro emissor da F30 provar no jogo.

### P1: A força se vê e se sente a cada ponto

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| POW-07.1 | Força + 2 × Manoplas + 2 com Punho Pesado | `tests/core/power.test.ts:6-10` (0, 3, 4, 2, 13); jogo: `scripts/smoke/power-strike.mjs` `p.points === 8` (Manoplas 3 + Punho), `scripts/smoke/power-mods.mjs:19` `points === 11` | ✅ PASS |
| POW-07.2 | patamar 0/1/2/3 em 2, 5, 8 | `tests/core/power.test.ts:15-26` 1→0, 2→1, 4→1, 5→2, 7→2, 8→3 | ✅ PASS |
| POW-08.3 | escala 1 + 0,05 × p (teto 10) | `tests/core/power.test.ts:38`, `:49` (1; 1,05; 1,5); jogo `power-strike.mjs:72` `near(p.impactScale, 1.4)`, `power-mods.mjs:19` 1,5 | ✅ PASS |
| POW-08.4 | tranco 4 + 0,3 × p pelo `kick(dx, dy, px)` | `tests/core/cameraKick.test.ts` (POW-08.4: 4 sem `px`, 7 com `px`; `activePx` 6,4); `tests/core/power.test.ts:50` `kickPx`; jogo: `scripts/smoke/power-strike.mjs:92` `near(plain.kickPx, 4) && near(built.kickPx, 4 + 0.3 * 8)` lido de `camera.kickPx` (`src/scenes/test/snapshot.ts:207`) | ✅ PASS (A1 morto pelo conserto) |
| POW-08.5 | `force` × (1 + 0,03 × p) pelo `strikeMods` | `src/game/player/strikes.ts` (`force: move.force * mods.force`); `tests/core/power.test.ts:51` `forceMul`; jogo `power-strike.mjs` `built.push > plain.push + 0.5` | ✅ PASS |
| POW-08.6 | deslize × (1 + 0,03 × p) pelo `slideBy(..., scale)` | `tests/core/slide.test.ts:86-91` `24 * 1.24`; jogo `power-strike.mjs` razão `1.24 ± 0.02` | ✅ PASS |
| POW-08.7 | rastro +1 px a cada 2 pontos (até +5) | `tests/core/power.test.ts:53`, `:57` `[1, 1, 2, 4]`; `tests/game/cursedFx.test.ts:153-167` `widthPx + 3`; jogo `power-strike.mjs` `built.trailPx === plain.trailPx + 4` | ✅ PASS |
| POW-08.8 | hitstop + 0/10/20/30 (forte) e 0/0/5/10 (leve) | `tests/core/power.test.ts:60-64`; `src/scenes/test/combat.ts:95-96`; jogo `power-strike.mjs` `plain.hitstopMs === 90 && built.hitstopMs === 120` | ✅ PASS |
| POW-08.9 | patamar ≥ 2: tremor de 90 ms a 0,004 no forte e no decisivo | `tests/core/power.test.ts:66-67` `shakes` `[false, false, false, true, true]`; `src/scenes/test/impactFx.ts:132`; jogo: `power-strike.mjs:96` `!plain.shook && built.shook` lido de `camera.shaking` (`snapshot.ts:208`, o `shakeEffect` da câmera) | ✅ PASS (A2 morto pelo conserto) |
| POW-08.10 | `HITSTOP_MS` 50/90 e tranco padrão 4 | `tests/data/powerFeel.test.ts:37-38` | ✅ PASS |
| POW-09.11 | agulhas, estrela e as duas ondas no tom do patamar | `tests/game/cursedFx.test.ts:138-146` (tudo no tom dado), `:169` `toneFromKeys`; `tests/core/power.test.ts:75` `['dcCuU', 'dCwcW', 'rRwtT', 'RbRrW']`; `tests/data/powerFeel.test.ts:29-33` na `PALETTE`; jogo `power-strike.mjs` `lastImpact.tone` `'c'` e `'b'` | ✅ PASS |
| POW-10.12 | patamar 2 parado: brasas (0,3); patamar 3: chama (0,6) | `tests/core/power.test.ts:84`; `tests/data/powerFeel.test.ts:44`; jogo `scripts/smoke/power.smoke.mjs` `aura === 'flame'` (8 pontos) e `'embers'` (6 pontos) | ✅ PASS |
| POW-10.13 | mão = posição de desenho + `handOffset[facing]` | `tests/data/powerFeel.test.ts:48-49` `{x: 13, y: -17}` e `{x: -13, y: -17}`; jogo: `power.smoke.mjs:328` `Math.sign(s.power.auraDx) === s.player.facing`, parado e depois de virar (`:377`) (`auraDx` lido das línguas da chama, `CursedFlame.meanX`) | ✅ PASS (A3 morto pelo conserto) |
| POW-10.14 | conjurando, canalizando, fora do repouso ou morto: apagada | `tests/core/power.test.ts:102-112`; jogo `power.smoke.mjs` andando `'off'`, lançando o Vermelho `'off'` | ✅ PASS |

### P2: Todo acerto mostra o número

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| POW-05.1 | 12/16/20 px em 14/15 e 39/40; micro e chip sempre 12 | `tests/core/damageNumber.test.ts:8-20` | ✅ PASS |
| POW-05.2 | cores por tipo, contorno `k` (Kokusen `b`/`R`) | `tests/core/damageNumber.test.ts:33-38`; `tests/data/powerFeel.test.ts:8-12` na `PALETTE` | ✅ PASS |
| POW-05.3 | até 300 ms: soma, reinicia a vida, fica o tipo de maior prioridade | `tests/core/damageNumber.test.ts:43-55` (300 ms, valor 17, vida do último), `:57-65`, `:88-100` (todas as duplas da prioridade) | ✅ PASS |
| POW-05.4 | depois de 300 ms: número novo | `tests/core/damageNumber.test.ts:67-77` (301 ms) | ✅ PASS |
| POW-05.5 | 12 vivos: funde no mais recente do alvo ou despeja o mais antigo | `tests/core/damageNumber.test.ts:111-147` | ✅ PASS |
| POW-06.6 | `ui.damageNumbers` criado pelo `UiSetup`, sem campo novo na cena | `src/scenes/test/uiSetup.ts:26`, `:77`; o único campo novo da `TestScene` é o `stats` (POW-01) | ✅ PASS |
| POW-06.7 | golpe do jogador → `strike`; técnica → `tech`/`micro`/`chip` pela faixa | `scripts/smoke/power.smoke.mjs:206-209` `last.value === lost && last.kind === 'strike'`, `:222-225` golpe no player não mostra; `tests/scenes/effects.test.ts:122-131`; `power.smoke.mjs:169-172` tique `chip`; `scripts/smoke/boss-punish.smoke.mjs` finalizador | ✅ PASS |
| POW-06.8 | Kokusen promove o número | `scripts/smoke/kokusen.smoke.mjs` `damageNumbers.last.kind === 'kokusen'`; `tests/core/damageNumber.test.ts:151-166` `promote` | ✅ PASS |
| POW-06.9 | atualiza em `drops.updatePickups`, limpa no reset e na troca de área, fora do `fxCap` e do `FloatTexts.debug` | `src/scenes/test/drops.ts:34`; `scripts/smoke/power.smoke.mjs:267-270` (run nova) e `:300-303` (área nova) `live === 0 && last === null`; `DamageNumbers` não entra no `fxRegistry` nem no `FloatTexts` (`src/game/DamageNumbers.ts:44-47`) | ✅ PASS |

### P2: O objeto na mão bate como o soco

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| POW-11.1 | `round(meleeDamage(base) × meleeMul(PROP_TRAITS))` | `src/scenes/test/statsDirector.ts:27-29`; `tests/core/statSheet.test.ts:145`, `:154-155`; jogo `scripts/smoke/power-prop.mjs:106-109` `built.lost === Math.round(plain.lost * 1.3)` | ✅ PASS |
| POW-11.2 | o Passo sombrio segue armado | `scripts/smoke/power-prop.mjs:114-117` `shadow.lost === plain.lost && shadowArmed` | ✅ PASS |
| POW-11.3 | `PropDamage` nos 3 pontos de criação | `src/scenes/test/arsenalDirector.ts`, `src/scenes/test/drops.ts:92`, `src/scenes/test/world.ts:357` (`this.s.stats.propDamage`) | ✅ PASS |
| POW-11.4 | objeto pelo `ImpactFx` com `forced: 'heavy'`, arremesso incluso, sem faísca roxa | `tests/core/impactTier.test.ts` (forçado vence leve, quebra, `knockdown` e Contra); `scripts/smoke/power-prop.mjs:38-41` `impact:heavy` e sem `spark:prop`, no golpe (`:101`) e no arremesso (`:64`) | ✅ PASS |

### P2: Debug e snapshot da força

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| POW-13.1 | `power`, `damageNumbers`, `stats` obrigatórios, tipados fora do `debugApi.ts` | `src/game/powerSnapshot.ts:10-35`; `src/game/debugApi.ts` (campos sem `?`); `tests/game/debugApi.test.ts` (fixture com os três) | ✅ PASS |
| POW-13.2 | `mods=` sobe cada modificador, parando no teto | `src/scenes/test/statsDirector.ts:71-77`; `scripts/smoke/power-mods.mjs:54-58` `forca:999999999999` → 5 | ✅ PASS |
| POW-13.3 | id desconhecido ou nível não inteiro positivo é ignorado | `tests/core/modsParam.test.ts:28-41`; `scripts/smoke/power-mods.mjs:47-51` | ✅ PASS |
| POW-13.4 | 11 pontos/patamar 3/escala 1,5; Força 5 só → patamar 2; nada → 0 | `scripts/smoke/power-mods.mjs:17-21`, `:28-32`, `:41-45` | ✅ PASS |

**Status**: ✅ 14/14 exigências (47 ACs) com evidência `arquivo:linha` no valor da spec. Spec-precision gaps: nenhum.
Emenda do autor registrada: o texto do POW-14.12 mudou durante a execução ("within the same 1000 ms window", porque a
conjuração trava o player); o valor dos tetos não mudou.

---

## Edge Cases

- [x] 13 pontos reportam 13 e usam 10: `tests/core/power.test.ts:34-40` `points` 13, `p` 10, escala 1,5, tranco 7.
- [x] Chip em `gettingUp` ou `downHits` 1: recusado sem `tech`, aceito com `tech`: `tests/core/enemyBrainChip.test.ts:123-143`.
- [x] Micro com o teto cheio mostra faísca e número: `tests/scenes/effects.test.ts:109-113`, `:134-143`.
- [x] Reset da run com números vivos: `scripts/smoke/power.smoke.mjs:259-270` (o `last` existe até a run nova e some nela).
- [x] Virar no repouso com a aura acesa: `scripts/smoke/power.smoke.mjs` volta a `'flame'` no quadro seguinte ao `idle` e, com o conserto, do lado do novo `facing` (`assertAuraSide(..., 'virado')`).
- [x] `R` reinicia a cena: chama de volta no player novo e nenhum erro de página (`power.smoke.mjs`, parte "depois do R").
- [x] Corpo de vidro abaixo da vida atual: `scripts/smoke/vows.smoke.mjs:71` `maxHp === 60 && hp <= 60`.

---

## Discrimination Sensor

Worktree temporário em `scratchpad/f29-verifier/wt` (detached em `739ff03`, `node_modules` por junção). Unitários: o
mutante é aplicado no worktree, roda `npx vitest run` na pasta do teste e o arquivo volta do original. Adaptadores: o
`power.smoke` do worktree com os mutantes juntos (a primeira falha para o cenário, então cada rodada junta mutantes que
caem em cenários diferentes) e, para provar o conserto, três cenários isolados (`vmut-*.smoke.mjs`, só no worktree:
soco forte, chama, Azul).

| # | Arquivo | Mutação | Teste que pega | Resultado |
| --- | --- | --- | --- | --- |
| M1 | `src/core/hitBand.ts:29` | teto `>` vira `>=` | `hitBand.test.ts` "20+20+20 e recusa o próximo" | ✅ Morto |
| M2 | `src/core/enemyBrain.ts:89` | tira o retorno `chip` (o chip cai na reação) | `enemyBrainChip.test.ts` "chip vivo em idle" | ✅ Morto |
| M3 | `src/core/damageNumber.ts:137` | fusão `<= 300` vira `< 300` | `damageNumber.test.ts` "acerto a 300 ms" | ✅ Morto |
| M4 | `src/core/power.ts:69` | rastro `floor` vira `round` | `power.test.ts` "p 1 ... rastro +0" | ✅ Morto |
| M5 | `src/core/statSheet.ts:63` | voto sem o `heavyMul` | `statSheet.test.ts` grade (Sem guarda) | ✅ Morto |
| M6 | `src/scenes/test/effects.ts:48` | o chip passa a congelar | `effects.test.ts` "chip: faísca 6, sem hitstop" | ✅ Morto |
| M7 | `src/core/bossBrain.ts:108` | postura do chip volta à regra de hoje | `bossBrainChip.test.ts` "chip light tira dano × 0,5" | ✅ Morto |
| M8 | `src/core/hitBand.ts:59` | micro enche a estrutura inteira | `hitBand.test.ts` "0 no chip e metade no micro" | ✅ Morto |
| A1 | `src/scenes/test/impactFx.ts:131` | tranco sem a distância da força (`kick(dx, dy)`) | antes: nada (`power` verde); depois: `power-strike.mjs` POW-08.4 | ❌ Vivo → ✅ Morto |
| A2 | `src/scenes/test/impactFx.ts:132` | sem o tremor do patamar 2 | antes: nada; depois: `power-strike.mjs` POW-08.9 | ❌ Vivo → ✅ Morto |
| A3 | `src/scenes/test/powerAuraDirector.ts:75` | mão sempre do lado `facing = 1` | antes: nada; depois: `power.smoke.mjs` POW-10.13 (virado) | ❌ Vivo → ✅ Morto |
| A4 | `src/game/enemy/EnemyDefense.ts:185` | chip enche a estrutura inteira | antes: nada; depois: `power.smoke.mjs` POW-15.8 | ❌ Vivo → ✅ Morto |
| A5 | `src/game/enemy/EnemyDefense.ts:182` | o chip interrompe a IA mesmo com o inimigo vivo | antes: nada (o `windup → attack` contava qualquer inimigo); depois: `power.smoke.mjs` POW-04.11/15.7 | ❌ Vivo → ✅ Morto |

**Sensor depth**: expandido (13 mutantes), por ser feature de adaptador (L-043).
**Result**: primeira passada 8/13 (5 vivos); depois do conserto 13/13 mortos.
**Isolamento**: `git status --porcelain` da árvore real antes do sensor = `?? .claude/skills/tlc-spec-driven/scripts/__pycache__/`,
`?? SKILL.md`; o sensor só mexeu no worktree, removido no fim (`git worktree remove --force` e `git worktree prune`).

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code / surgical | ✅ Cada passo mexe no arquivo do seu assunto; a regra nova mora em `core/` (`statSheet`, `hitBand`, `damageNumber`, `power`, `modsParam`) com o teste par |
| No scope creep | ✅ Nada de micro emitido, crítico, escala de inimigo ou HUD novo (Out of Scope respeitado) |
| Matches patterns | ✅ Diretores novos (`StatsDirector`, `PowerAuraDirector`), snapshot em arquivo à parte (`powerSnapshot.ts`), smoke novo em `hd=1&area=modular` |
| Lint / tetos | ✅ `npm run gate` verde; `.oxlintrc.json` intocado na faixa; os avisos são de arquivos já na lista (`impactFx.onMeleeImpact` 16, como antes da T19; `enemyBrain.receiveHit` caiu de 20 para 18) |
| Spec-anchored outcome check | ✅ |
| Per-layer coverage | ✅ depois do conserto: toda fiação de adaptador do POW-08/10/15 é lida no jogo vivo |
| Testes mapeiam a ACs | ✅ todo teste novo cita o POW que prova |
| Guidelines | `CLAUDE.md`, `.oxlintrc.json`, L-010, L-043, L-076 |
| HD é a base | ✅ `power*.mjs` pedem `hd=1` |

---

## Gate Check

- **Gate command**: `npm run gate`
- **Result**: exit 0 em `739ff03`: 156 arquivos, **3071 passed**, 0 failed, 0 skipped. Depois do conserto (`935b89c`): exit 0, 156 arquivos, **3072 passed** (+1, `activePx`); o único aviso novo é o `debugSnapshot` de `snapshot.ts` (155 → 157 linhas), arquivo já na lista de exceções.
- **Test count before feature**: 2913 em 146 arquivos (`4c0efae`/`cca7f00`)
- **Test count after feature**: 3072 em 156 arquivos (+159, nenhum teste apagado)
- **Smokes** (árvore real, `739ff03`): `power`, `fight`, `impact`, `tech` (com `techniques`), `defense`, `vows`, `arsenal`,
  `build`, `hud`, `boss` (com `boss-prop`, `boss-punish`, `boss-victory`, `world-boss`), `drops`, `held-item`, `shop`,
  `world-` (7), `kokusen`, `run-loop` verdes. `feel` falhou uma vez no EDG-02 (renascer: o player andou 65 px em vez de
  15 a 48 antes da morte) com outros smokes rodando em paralelo na máquina, e passou repetido isolado depois do conserto:
  instável sob carga, fora da superfície da feature.
- **Depois do conserto** (`935b89c`, árvore real): `power` verde (`POW-14 sob a carga: fx 14, numbers 12, micro 0`) e
  `feel` verde. No worktree do sensor, os três cenários fortalecidos passaram sem mutante antes de matar A1..A5.

---

## Fix Plans

### Fix 1 (aplicado): provar no jogo vivo a fiação que nenhum smoke lia

- **Root cause**: os smokes da feature liam o snapshot da força (`power.*`), mas não o efeito do tranco, do tremor, do
  lado da chama, da estrutura no chip nem a IA de quem levou o tique no `windup`. A regra pura estava testada; o
  adaptador podia esquecer de usá-la (L-043, L-076).
- **Conserto**: `CameraKick.activePx` (`src/core/cameraKick.ts:27`, teste em `tests/core/cameraKick.test.ts:59`),
  `camera.kickPx` e `camera.shaking` no snapshot (`src/scenes/test/snapshot.ts:207-208`, do objeto real da câmera),
  `power.auraDx` (`CursedFlame.meanX`, x médio das línguas visíveis, menos o x de desenho do player); a parte 2 do
  `power.smoke` foi para `scripts/smoke/power-strike.mjs` (o `power.smoke` estava em 394 linhas efetivas) com o tranco
  e o tremor; o Azul conta só quem levou tique no `windup` e confere a estrutura; a chama confere o lado.
- **Priority**: Major (5 mutantes vivos em adaptador).

---

## Requirement Traceability Update

| Requirement | New Status |
| --- | --- |
| POW-01..POW-11, POW-13..POW-15 | ✅ Verified |

(A tabela de `spec.md` ainda diz "Pending"; atualizar ao fechar a feature.)

---

## Summary

**Overall**: ✅ Ready (rodada 1, com o conserto)
**Spec-anchored check**: 47/47 ACs e 7/7 casos de borda com evidência no valor da spec
**Sensor**: 13/13 mortos depois do conserto (5 vivos na primeira passada: A1..A5)
**What works**: a folha de atributos é a dona única dos números e reproduz a composição de antes em toda a grade; o
tique do Azul não congela nem trava o inimigo; todo acerto do jogador mostra o número; cada ponto de força muda o soco
forte no jogo (escala, tom, tranco, tremor, deslize, rastro, hitstop e chama na mão certa); o objeto bate pelo impacto
amaldiçoado com a build.
**Pendências fora do sensor**: UAT visual (chama nos dois lados em movimento, tons do impacto na tela); o teto do micro
só é provado no jogo quando a F30 trouxer o primeiro emissor.
