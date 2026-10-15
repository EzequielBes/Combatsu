# Recorde e recomeço — Validation

**Date**: 2026-10-15
**Spec**: `.specs/features/recorde-e-recomeco/spec.md` (54 ACs: SAVE-01..07, REC-01..10, RMK-01..09, END-01..16, DMG-01..07, RST-01..05; 7 casos de borda)
**Diff range**: `3aeb89b..HEAD`, branch `feat/recorde-e-recomeco`. Implementação em `5464f76..90fdc03` (T1..T14 e 5 consertos da revisão); conserto de evidência deste Verifier em `1358a23`.
**Verifier**: sub-agente independente (autor ≠ verificador). O código de `src/` não foi editado. Todo mutante rodou num worktree temporário (`git worktree add --detach … HEAD`, `node_modules` por junção desfeita antes do `worktree remove`), já removido.

## Validation

**Result**: PASS

Em uma linha: os 54 ACs têm evidência `arquivo:linha` com asserção no valor da spec. Duas lacunas de evidência (bloqueio do DMG-04 e finalizador do chefe no DMG-01) foram fechadas com asserções novas nos smokes (`1358a23`). Os 8 mutantes morreram (5 unitários, 3 de smoke), o gate está verde e os smokes pedidos passam.

---

## Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1 | ✅ Done | `5464f76`. `ctxFor(source)` em `src/game/TechRunner.ts:65-82`. O Divergente (com o Kokusen) usa `ctxFor('divergente')` |
| T2 | ✅ Done | `090c02d`. `withNoSave` em `scripts/smoke/run.mjs:99-103` |
| T3..T6 | ✅ Done | `f6abb9f`, `46a39d8`, `7af63a1`, `000945a`: regras puras com teste par |
| T7..T9 | ✅ Done | `3ac3e15`, `55572b9`, `01b78f7`: porta e vistas com teste de unidade |
| T10 | ✅ Done | `8d8f0e0`: diretor, carga e snapshot |
| T11..T14 | ✅ Done | `de61b9b`, `1e90a80`, `71847ed`, `3650803` |
| Revisão | ✅ Done | `d55f00e` (a faixa do chefe comemora), `8b7b843` (rótulo curto), `20b6ee2` (painel em blocos, END-16), `ecb23f2` (a faixa some com o painel), `90fdc03` (morte com save travado) |
| Verifier | ✅ Done | `1358a23`: asserções novas de DMG-04 (bloqueio) e DMG-01 (finalizador no chefe) |

---

## Spec-Anchored Acceptance Criteria

### P1: Save e recorde

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| SAVE-01 | `core/save` sem Phaser nem `localStorage`; só o adaptador chama `localStorage` | `tests/core/save.test.ts:240-241` `expect(source).not.toMatch(/phaser/i)` / `not.toContain('localStorage')`; `tests/game/saveStorage.test.ts:94` `expect(files).toEqual(['game/saveStorage.ts'])` (varre todo `src/**/*.ts`) | ✅ PASS |
| SAVE-02 | JSON `{ version: 1, record }` na chave `combatsu.save` | `tests/core/save.test.ts:41-42` `toBe('combatsu.save')`, `toBe(1)`; `:47-48` `toEqual({ version: 1, record })`; no jogo vivo: `scripts/smoke/record-save.smoke.mjs:139` chave gravada `=== JSON.stringify(expected)` com `version: 1` | ✅ PASS |
| SAVE-03 | Passos de migração aplicados em ordem até a atual | `tests/core/save.test.ts:185-186` `expect(calls).toEqual([1, 2])` e `kills: 21` (a ordem inversa daria 30); `:199` só o passo 2 a partir da v2; `:208-209` passo faltando → `invalid` | ✅ PASS |
| SAVE-04 | Versão maior → sem recorde e nenhuma escrita na sessão | `tests/core/save.test.ts:227` `toEqual({ kind: 'newer', version: 4 })`; `tests/scenes/recordLoad.test.ts:141` `{ best: null, storage: 'local', locked: true }`; `scripts/smoke/record-save.smoke.mjs:196-197` `best === null && locked === true` e chave intacta; `:201-204` morrer com o save travado não escreve a chave | ✅ PASS |
| SAVE-05 | Ausente, JSON inválido ou inválido → sem recorde | `tests/core/save.test.ts:64-65` `empty`; `:69-70` `invalid`; `tests/scenes/recordLoad.test.ts:135` `best: null`; `scripts/smoke/record-save.smoke.mjs:80` JSON quebrado → `best === null && storage === 'local'` | ✅ PASS |
| SAVE-06 | `round` int ≥ 1, `kills` int ≥ 0, listas de strings, `{ id, level }` com `level` int ≥ 1 ou `null` | `tests/core/save.test.ts:88-90` (round 0/1), `:94-96` (kills −1/0), `:101-103` (level 0/1), `:107-110` (relíquia/arma), `:115-120` (1.5), `:124-142` (16 tipos errados → `invalid`) | ✅ PASS |
| SAVE-07 | Leitura ou escrita que lança → jogo segue em memória, snapshot `storage: 'memory'` | `tests/game/saveStorage.test.ts:44-46`, `:52-53`, `:59-61` → `kind === 'memory'` sem exceção; `scripts/smoke/record-save.smoke.mjs:185` `setItem` lançando → `storage === 'memory' && best.round === 1`; `:215-216` `getItem` lançando → `storage === 'memory'` e console sem erro | ✅ PASS |
| REC-01 | Run melhor no `gameOver` → troca o recorde e escreve uma vez | `tests/core/recordBook.test.ts:32-33` `toEqual({ newRecord: true, write: true })`, `best` = run; `scripts/smoke/record-save.smoke.mjs:139-142` chave gravada e `lastDeathRecord === true`. Única escrita do jogo: `src/scenes/test/recordDirector.ts:100-101` | ✅ PASS |
| REC-02 | Rodada maior; empate na rodada com mais abates; sem recorde, sempre | `tests/core/recordBook.test.ts:13-15` (abates +1/igual/−1), `:19-20` (rodada ±1), `:24` (sem recorde) | ✅ PASS |
| REC-03 | Igual ou pior → mantém e não escreve | `tests/core/recordBook.test.ts:46-47`, `:54-55` `write: false` e `best` com a mesma referência; `scripts/smoke/record-save.smoke.mjs:154` empate → chave igual byte a byte | ✅ PASS |
| REC-04 | Recorde com rodada, abates, técnicas com nível, passivas, relíquia e arma com nível, votos | `scripts/smoke/record-save.smoke.mjs:124-140` a chave inteira confere com `{ round: 1, kills: 0, build: { techniques: [{azul,2}], perks: ['executor'], relic: {manoplas,2}, weapon: {bastao,1}, vows: ['semGuarda'] } }` | ✅ PASS |
| REC-05 | Recarregar traz o mesmo recorde | `scripts/smoke/record-save.smoke.mjs:146-149` `JSON.stringify(r.best) === JSON.stringify(expected.record)` | ✅ PASS |
| REC-06 | R ou fechar a página não escreve | `scripts/smoke/record-save.smoke.mjs:173` `readKey() === null` depois do R no meio da run; `:117` chave igual depois do R. Fechar a aba: estrutural, o único `storage.write` está em `onDeath` (`recordDirector.ts:101`), sem `beforeunload` | ✅ PASS |
| REC-07 | `nosave=1` não lê nem escreve, sem recorde | `tests/scenes/recordLoad.test.ts:151-156` `storage: 'off'` e `calls.get === 0`; `scripts/smoke/record-save.smoke.mjs:85-86` `best === null && storage === 'off'` e a chave não muda | ✅ PASS |
| REC-08 | `record=N` → `{ round: N, kills: 0 }`, build vazia, não escreve | `tests/scenes/recordLoad.test.ts:160-169` (com e sem `nosave`, sem ler); `scripts/smoke/record-save.smoke.mjs:92-93` `best` = r4 e a chave não muda | ✅ PASS |
| REC-09 | `round=N` (N > 1) não troca o recorde | `tests/core/recordBook.test.ts:61-62` `canRecord: false` → nada muda; `scripts/smoke/record-save.smoke.mjs:163-164` `round=3` não grava e `best.round === 1` | ✅ PASS |
| REC-10 | Snapshot com recorde, `storage`, passou e última morte | `scripts/smoke/record-hud.smoke.mjs:61`, `:67` `passed`; `scripts/smoke/record-save.smoke.mjs:142`, `:155` `lastDeathRecord`; `:69`, `:85`, `:215` `storage` `'local'`/`'off'`/`'memory'`; `tests/game/debugApi.test.ts:193-202` forma do campo `record` | ✅ PASS |

### P1: Marcador e banner do recorde

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| RMK-01 | Com recorde, em `roundActive`/`intermission`/`traverse`/`shop`: `Recorde: rN` | `tests/core/recordBook.test.ts:93-94` `toEqual({ visible: true, text: 'Recorde: r4', highlight: false })` nos 4 estados; `scripts/smoke/record-hud.smoke.mjs:60` `Recorde: r1` na r1 | ✅ PASS |
| RMK-02 | x = 948, y = 44, origem à direita, estilo do HUD | `tests/game/recordViews.test.ts:88-90` `[948, 44]`, `origin [1, 0]`, `styles[0] toBe RUN_TEXT_STYLE` | ✅ PASS |
| RMK-03 | Sem recorde, escondido | `tests/core/recordBook.test.ts:86-87`; `scripts/smoke/record-hud.smoke.mjs:103` `marker.visible === false && best === null` | ✅ PASS |
| RMK-04 | Em `title` e `gameOver`, escondido | `tests/core/recordBook.test.ts:100-101`; `scripts/smoke/record-hud.smoke.mjs:52`, `:78`; `scripts/smoke/record-end.smoke.mjs:75-77` | ✅ PASS |
| RMK-05 | `Rodada N · Novo recorde!` na rodada recorde + 1; em rodada de chefe `Rodada N` + `Chefe: <nome> · Novo recorde!` por 1500 ms | `tests/core/recordBook.test.ts:127`, `:170-172`; `scripts/smoke/record-hud.smoke.mjs:65` `=== 'Rodada 2 · Novo recorde!'`; `:93`, `:96` faixa do chefe ainda na tela em ~1400 ms | ✅ PASS |
| RMK-06 | No máximo uma vez por run | `tests/core/recordBook.test.ts:133-134`, `:178-180`, `:193-194`; `scripts/smoke/record-hud.smoke.mjs:71` r3 → `'Rodada 3'` | ✅ PASS |
| RMK-07 | Acima do recorde: rodada atual, cor de destaque | `tests/core/recordBook.test.ts:107-108` `highlight: true`; `tests/game/recordViews.test.ts:98` `setColor` com a cor de `A`; `scripts/smoke/record-hud.smoke.mjs:66`, `:72` `highlight === true` lido da cor do `Text` | ✅ PASS |
| RMK-08 | Só cores da `PALETTE` | `tests/game/recordViews.test.ts:81` `PALETTE_KEYS.has(key)` para todo `RECORD_COLORS`. A faixa do banner é a do `Hud` (sem mudança) | ✅ PASS |
| RMK-09 | Snapshot com texto e visibilidade do marcador | `src/game/RecordMarker.ts:45-51` lê o próprio `Text`; `tests/game/recordViews.test.ts:99`, `:102`; `scripts/smoke/record-hud.smoke.mjs:28-31` `sameMarker` lê `record.marker` | ✅ PASS |

### P1: Tela de fim de run

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| END-01 | Painel no `gameOver`, centrado em (480, 270), na câmera de UI | `scripts/smoke/record-end.smoke.mjs:49` `panel.visible`; `:71-73` centro a ±1 de (480, 270); `tests/game/recordViews.test.ts:197-198` `toBe(480)`/`toBe(270)`; `:226` na camada de UI | ✅ PASS |
| END-02 | `hud.center = null` e `hud.banner = null` na abertura | `scripts/smoke/record-end.smoke.mjs:50`, `:52`; `scripts/smoke/hud.smoke.mjs:109` | ✅ PASS |
| END-03 | `Rodada alcançada: N`, `Abates: K`, `Fragmentos: F` (carteira na morte) | `scripts/smoke/record-end.smoke.mjs:53-60`; `scripts/smoke/drops.smoke.mjs:98` `Fragmentos: ${walletAtDeath}`; `tests/core/runSummary.test.ts:126-128` | ✅ PASS |
| END-04 | `<short> Nv <n>` ou `Técnicas: nenhuma` | `tests/core/runSummary.test.ts:157` `'Técnicas: Azul Nv 2, Divergente Nv 1'`; `:129`; `:27` nenhum `short` com `:`; `scripts/smoke/record-end.smoke.mjs:360-361` `Vermelho Nv 3` no jogo | ✅ PASS |
| END-05 | Passivas pelo nome ou `Passivas: nenhuma` | `tests/core/runSummary.test.ts:158`, `:130` | ✅ PASS |
| END-06 | Relíquia e arma com nível ou `Arsenal: nenhum` | `tests/core/runSummary.test.ts:159`, `:131`, `:168-170` | ✅ PASS |
| END-07 | Votos pelo nome ou `Votos: nenhum` | `tests/core/runSummary.test.ts:160`, `:132` | ✅ PASS |
| END-08 | Cabeçalho `Dano`, uma linha recuada por fonte > 0, do maior ao menor, `<fonte>: <int> (<pct>%)` | `tests/core/runSummary.test.ts:50-52` (ordem e %), `:61` (desempate), `:70-72` (arredondado, soma 100 ± 1), `:248-251` (recuo); `scripts/smoke/record-end.smoke.mjs:281`, `:289`, `:292` (Golpe e Azul com os valores do snapshot, % 100 ± 1) | ✅ PASS |
| END-09 | Sem dano: `Dano: nenhum` | `tests/core/runSummary.test.ts:133`; `scripts/smoke/record-end.smoke.mjs:57-60` | ✅ PASS |
| END-10 | `Recorde!` em destaque | `tests/core/runSummary.test.ts:196` `{ text: 'Recorde!', highlight: true, gap: true }`; `scripts/smoke/record-save.smoke.mjs:143` | ✅ PASS |
| END-11 | `Recorde: rN` sem `Recorde!` | `tests/core/runSummary.test.ts:200-201`; `scripts/smoke/record-save.smoke.mjs:157` | ✅ PASS |
| END-12 | Última linha `J / Enter para tentar de novo` | `tests/core/runSummary.test.ts:209-215`; `scripts/smoke/record-end.smoke.mjs:62-63`; `scripts/smoke/hud.smoke.mjs:118` `center.at(-1) === …` | ✅ PASS |
| END-13 | Run nova esconde o painel | `scripts/smoke/record-end.smoke.mjs:112` `panel.visible === false` | ✅ PASS |
| END-14 | Só `PALETTE`; cabe em 960x540 com 5 votos, 2 técnicas, 6 passivas e 7 fontes | `tests/game/recordViews.test.ts:81` (paleta), `:190-200` (20 linhas no pior caso de largura cabem, altura e largura exatas); `scripts/smoke/record-end.smoke.mjs:363-365` (build cheia no jogo vivo, `bounds` dentro de 960x540) | ✅ PASS (ver nota 1) |
| END-15 | Snapshot com visibilidade, linhas e dano por fonte | `src/game/RunSummaryPanel.ts:169-176` lê os `Text` visíveis; `scripts/smoke/record-end.smoke.mjs:276-292` `record.damage` igual às linhas do painel | ✅ PASS |
| END-16 | Título `Fim da run` centrado e em destaque; esquerda; continuação recuada; folga de meia linha por bloco | `tests/core/runSummary.test.ts:234`, `:242`, `:252`, `:259-260`; `tests/game/recordViews.test.ts:215-218` (meia linha), `:246-258` (posições), `:264` (cor); `scripts/smoke/record-end.smoke.mjs:65` | ✅ PASS |
| DMG-01 | Golpe do moveset ou finalizador aceito por inimigo comum ou chefe → `golpe` | `scripts/smoke/record-end.smoke.mjs:157-159` `damage.golpe === lost` (o que o inimigo perdeu); **novo** `scripts/smoke/boss-punish.smoke.mjs:216-223` finalizador no chefe `golpe` +48 | ✅ PASS (fechado em `1358a23`) |
| DMG-02 | Acerto de técnica → fonte da técnica | `scripts/smoke/record-end.smoke.mjs:276-278` `damage.azul === blue` e o total é só azul + golpe | ✅ PASS |
| DMG-03 | Objeto na mão, arremessado, arma vinculada ou ferramenta → `objeto` | `scripts/smoke/record-end.smoke.mjs:188-190` bastão vinculado → `objeto > 0 && golpe === 0`. Arremessado, ferramenta e drop passam pelo mesmo `onConnect` sem `moveName` (`combat.ts:96-98`, `drops.ts:92`, `arsenalDirector.ts:53`) | ✅ PASS |
| DMG-04 | Recusado ou bloqueado → nada | `scripts/smoke/record-end.smoke.mjs:147` golpe no ar; **novo** `:171-175` jab bloqueado pela guarda (`enemyBlock`), vida igual e `total === 0`. Estrutural: `src/game/hitbox.ts:92`, `Prop.ts:198-201` só chamam `onConnect` com `receiveHit` verdadeiro | ✅ PASS (fechado em `1358a23`) |
| DMG-05 | Boneco do `fxlab` → nada | `scripts/smoke/record-end.smoke.mjs:204-208` o boneco perde vida e `total === 0` | ✅ PASS |
| DMG-06 | Run nova zera tudo | `tests/core/runSummary.test.ts:91-92`; `scripts/smoke/record-end.smoke.mjs:113-116` `every((d) => d === 0)` depois do recomeço | ✅ PASS |
| DMG-07 | Kokusen em `divergente` | `scripts/smoke/record-end.smoke.mjs:337-340` `damage.divergente === lost && total === lost` depois do evento `kokusen` | ✅ PASS |

### P1: Recomeço rápido

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| RST-01 | J em ≥ 1000 ms → `roundActive` na r1 no update seguinte | `scripts/smoke/record-end.smoke.mjs:93-100` J aos 60 passos (1000 ms) → `state === 'roundActive' && round === 1` após 1 passo | ✅ PASS |
| RST-02 | Player pronto (vivo, vida cheia, `roundActive`) até 3000 ms | `scripts/smoke/record-end.smoke.mjs:102-109` `ready(snap) && elapsed * STEP_MS <= 3000` | ✅ PASS |
| RST-03 | J antes de 1000 ms fica em `gameOver` com o painel | `scripts/smoke/record-end.smoke.mjs:81-88` J aos 966,7 ms → `gameOver` e painel visível | ✅ PASS |
| RST-04 | Sem recarregar a página nem reiniciar a cena | `scripts/smoke/record-end.smoke.mjs:92`, `:119-121` marcador de `window` igual depois do recomeço; o fluxo J/Enter é o de `Run` (sem `scene.restart`) | ✅ PASS |
| RST-05 | Run nova mostra o recorde gravado pela morte | `scripts/smoke/record-hud.smoke.mjs:83` `Recorde: r3` sem destaque depois de morrer na r3 | ✅ PASS |

**Status**: ✅ 54/54 ACs com evidência `arquivo:linha`. Nenhuma lacuna de precisão na spec.

**Nota 1 (END-14)**: o `bounds` do painel é calculado com 8 px por caractere (`PANEL_CHAR_W`), não medido no `Text`. A fonte é `monospace` 13 px (~7,8 px), então a caixa real nunca fica maior que a calculada. Não é falha.

---

## Edge Cases

- [x] Morte no mesmo frame do último abate: o resumo usa `cmd.round`/`cmd.kills` do comando `gameOver` (`src/scenes/test/recordDirector.ts:57`, `:95-108`). Estrutural, sem smoke próprio.
- [x] Morte em rodada de chefe: o dano no chefe conta (finalizador `scripts/smoke/boss-punish.smoke.mjs:216-223`; o golpe comum passa pelo mesmo `hitbox` → `onConnect`). O painel abre pelo mesmo `gameOver`. A morte em si na rodada de chefe não tem smoke próprio.
- [x] Dois empates seguidos: `tests/core/recordBook.test.ts:70-77`; `scripts/smoke/record-save.smoke.mjs:154-158` (chave igual, `Recorde: r1`).
- [x] Id desconhecido some e o recorde segue válido: `tests/core/save.test.ts:158-159`; `tests/core/runSummary.test.ts:186-191`.
- [x] `setItem` lançando: `Recorde!` e recorde em memória (`scripts/smoke/record-save.smoke.mjs:184-188`).
- [x] `record=N` com `nosave=1`: `record` ganha e não escreve (`tests/scenes/recordLoad.test.ts:165-168`; `scripts/smoke/record-save.smoke.mjs:90-93`).
- [x] `record=abc` ignorado: `scripts/smoke/record-save.smoke.mjs:97-100` (`debugIntParam('record', 1)` em `recordDirector.ts:38`).

---

## Discrimination Sensor

Worktree temporário em `scratchpad/rec-verifier/sensor-wt` (HEAD `90fdc03`, com os dois smokes de `1358a23` copiados). Os unitários rodaram com `npx vitest run <arquivo>`, os de smoke com `npm run smoke -- <trecho>`. Os scripts estão em `scratchpad/rec-verifier/mutate*.mjs`.

| # | Arquivo | Mutação | Teste que pega | Resultado |
| --- | --- | --- | --- | --- |
| M1 | `src/core/recordBook.ts:190` | `run.kills > best.kills` → `>=` (empate vira recorde) | `recordBook.test.ts:14`, `:46`, `:76` (3 falhas) | ✅ Morto |
| M2 | `src/core/save.ts:100` | `round >= 1` → `>= 0` | `save.test.ts:88` | ✅ Morto |
| M3 | `src/core/runSummary.ts:74` | desempate pela ordem inversa de `DAMAGE_SOURCES` | `runSummary.test.ts:61` | ✅ Morto |
| M4 | `src/scenes/test/recordLoad.ts:179-180` | `nosave` testado antes de `record=` | `recordLoad.test.ts:167` | ✅ Morto |
| M5 | `src/core/save.ts:143` | `newer` só acima de `current + 1` | `save.test.ts:227` | ✅ Morto |
| S1 | `src/scenes/test/recordDirector.ts:75` | troca `golpe` e `objeto` | `record-end`: `DMG-01: golpe deveria somar 6 … "objeto":6` | ✅ Morto |
| S2 | `src/scenes/test/recordDirector.ts:100` | grava mesmo com o save travado (`!loaded.locked` removido) | `record-save`: `SAVE-04: morrer com o save travado não pode escrever a chave` | ✅ Morto |
| S3 | `src/scenes/test/combat.ts:265` | finalizador do chefe não soma no registro | `boss-punish` (asserção nova): `DMG-01: finalizador no chefe soma 48 em golpe` | ✅ Morto |

**Sensor depth**: 5 unitários + 3 de adaptador de cena (L-043/L-076).
**Result**: 8/8 mortos.
**Isolamento**: `git status --porcelain` da árvore real antes do sensor: vazio. Depois: só as duas edições deliberadas dos smokes (que viraram `1358a23`). Worktree removido, `git worktree prune` feito, `node_modules` real intacto.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ Regras puras pequenas (`save` 155, `recordBook` 125, `runSummary` 216 linhas); o diretor só liga |
| Surgical changes | ✅ `combat.ts` +2, `effects.ts` +2, `TestScene.ts` 1 linha trocada (sem linha nova), `runDirector.ts` termina menor; `Hud.ts`, `core/run.ts`, `tests/core/run.test.ts` e `.oxlintrc.json` intocados |
| No scope creep | ✅ Nada de técnica inicial, conquistas ou histórico; `short` em `data/techniques` foi pedido por END-04 |
| Matches patterns | ✅ Diretor por assunto, tipo do snapshot em arquivo próprio, cores por chave da paleta (molde do `VowPanel`) |
| Spec-anchored outcome check | ✅ |
| Per-layer Coverage Expectation met | ✅ core 1:1 com os dois lados de cada limiar (L-010); adaptadores sem cena com `Text` falso (L-043); cena por snapshot vivo (L-076) |
| Every test maps to a spec requirement | ✅ |
| Documented guidelines followed: `CLAUDE.md`, `.oxlintrc.json` | ✅ Nenhum aviso do lint em arquivo da feature; nenhum arquivo novo nas exceções |

---

## Gate Check

- **Gate command**: `npm run gate`
- **Result**: 3009 passed, 0 failed, 0 skipped (152 arquivos), no HEAD `90fdc03` e de novo depois de `1358a23`
- **Test count before feature**: 2913 (146 arquivos, base do `tasks.md`)
- **Test count after feature**: 3009 (152 arquivos)
- **Delta**: +96 testes, +6 arquivos
- **Skipped tests**: nenhum
- **Failures**: nenhuma

**Smokes** (`npm run smoke -- <trecho>`):

| Trecho | Cenários | Resultado |
| --- | --- | --- |
| `record-` | `record-end`, `record-hud`, `record-save` | ✅ 3 ok |
| `run-loop` | `run-loop` | ✅ ok |
| `hud` | `hud`, `record-hud` | ✅ 2 ok |
| `boot` | `boot` | ✅ ok |
| `shop` | `shop`, `shop-progress` | ✅ 2 ok |
| `record-end`, `boss-punish` (depois de `1358a23`) | | ✅ ok |
| `drops`, `world-restart` (critério de sucesso da spec) | | ✅ ok |

---

## Fix Plans

### Fix 1 (aplicado, `1358a23`): sem evidência do golpe bloqueado (DMG-04)

- **Root cause**: o smoke só testava golpe no ar (sem alvo), não um alvo que recusa ou bloqueia.
- **Fix**: `record-end.smoke.mjs:162-175`: com `enemyGuard=1` o jab é bloqueado (`enemyBlock`), a vida não cai e `total(record.damage) === 0`.
- **Priority**: Minor (o código já estava certo; faltava a prova)

### Fix 2 (aplicado, `1358a23`): sem evidência do finalizador no chefe (DMG-01)

- **Root cause**: `combat.ts:265` soma o finalizador do chefe por fora do `onConnect` e nenhum teste lia o registro nesse caminho.
- **Fix**: `boss-punish.smoke.mjs:216-223`: o finalizador soma os mesmos 48 em `golpe`. Mata o mutante S3.
- **Priority**: Minor

---

## Requirement Traceability Update

Os 54 requisitos passam de `Pending` para `Verified` na tabela de `spec.md`.

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 54/54 ACs batem com o valor da spec; 0 lacunas de precisão
**Sensor**: 8/8 mutantes mortos
**Gate**: 3009 passed

**What works**: o save versionado com migração e trava para versão mais nova; o recorde só grava na morte e só quando bate; o marcador e o banner (inclusive na rodada de chefe); o painel de fim em blocos com dano por fonte; o recomeço em menos de 3 s sem recarregar; o jogo segue sem `localStorage`.

**Issues found**: duas lacunas de evidência (DMG-04 bloqueio, DMG-01 finalizador do chefe), fechadas em `1358a23`.

**Next steps**: merge. Morte numa rodada de chefe e morte no mesmo frame do último abate seguem cobertas só pelo código (sem smoke próprio).
