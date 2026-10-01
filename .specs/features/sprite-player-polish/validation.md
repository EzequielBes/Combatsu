# Validation: sprite-player-polish - FAIL

**Result**: FAIL
**Branch**: `feat/sprite-player-polish`
**Diff range**: `dev..HEAD` = `4620da2..9178d33` (17 arquivos, +1313/-116)
**Verifier**: independente (autor != verificador), Sonnet 5.5. Nenhum código de produção foi alterado.

Motivo do FAIL: 1 mutante sobrevivente que expõe cláusula de AC sem teste (SPR-08, `registerAnims` repassar `duration`) e 1 mutante sobrevivente de baixa severidade (regra do `selOut`). Tudo o mais passa.

## Checagem ancorada na spec

| AC | Resultado definido na spec | `file:line` + asserção | Resultado |
| --- | --- | --- | --- |
| SPR-01 | 5 chaves novas, total 40 | `tests/game/art.test.ts:71` - `expect(keys).toHaveLength(40)` + `PALETTE.o..z` por valor | PASS (SPEC_DEVIATION 35+5=40 já registrada no teste) |
| SPR-02 | todos os frames parseiam, 32x24 | `tests/game/art.test.ts:186` (player), `:728` (moves), `:765` (aéreos), `:250` (técnicas) | PASS |
| SPR-03 | idle-0 com <= 8 `k` internos | `tests/game/art.test.ts:900` - `expect(n).toBeLessThanOrEqual(8)`, métrica igual à da spec | PASS |
| SPR-04 | `w` ao lado de `b`/`k`; tons `h`,`j`,`H` nas linhas 0-10 | `tests/game/art.test.ts:913` - regex `/w[bk]\|[bk]w/` + `toContain` por tom | PASS |
| SPR-05 | `A`, `y`, `o` nas linhas 11-17 | `tests/game/art.test.ts:920` | PASS |
| SPR-06 | bbox a <= 2 texels da base congelada, 102 frames | `tests/game/art.test.ts:832` (`toHaveLength(102)`), `:836` (`toBeLessThanOrEqual(2)` por borda); fixture `tests/game/fixtures/playerBBoxBaseline.json` | PASS |
| SPR-07 | ponta do membro na borda da hitbox (+1 texel), na altura | `tests/game/art.test.ts:210` (jab/cross/kick) | PASS |
| SPR-08 | 1 duration positiva por frame; `registerAnims` repassa cada uma; erro nomeando a animação | `tests/game/art.test.ts:850,858,862,867` cobrem `animFrameConfigs` (tamanho, 0, negativo, 1). Repasse em `src/game/art/index.ts:128` sem nenhuma asserção | GAP (mutante M7 sobrevive) |
| SPR-09 | idle 4 frames, loop, sem par consecutivo igual | `tests/game/art.test.ts:950` - `repeat -1`, `not.toEqual` incluindo volta ao início | PASS |
| SPR-10 | `land` se `landMs < 120`; não em 120 | `tests/core/animState.test.ts:65` (119, 119.9, 120, 121, Infinity), `:75` (correndo), `:80` (precedência) | PASS |
| SPR-11 | `apex` se `\|vy\| < 60`; `jump`/`fall` em 60 | `tests/core/animState.test.ts:49` (59, -59, 60, -60) | PASS |
| SPR-12 | catálogo jump/apex/fall/land/hurt com tamanhos e repeat | `tests/game/art.test.ts:960` (`['land',2,0,'exact']`, `['hurt',2,0,'exact']`, mínimos dos demais, frames existem) | PASS |
| SPR-13 | `landMs = 0` ao pousar, soma com o dt | `scripts/smoke/player-anim.smoke.mjs:36-45` (land-* existe após o pulo, dura <= 120 ms + 2 passos, depois idle-*; dois pulos). Código: `src/game/Player.ts:389` | PASS (smoke; mutante M5 morto) |
| SPR-14 | >= 3 `S` a mais que `*-wind`, todo `S` antes da coluna da ponta | `tests/game/art.test.ts:930` (`it.each`) e `:942` (ponta nas colunas 27/27/30) | PASS |
| SPR-15 | gera `player-sheet.png` + `anim-<name>.png` em `outDir`, exit 0 | sem teste automatizado (T2 é `Tests: none`, spec define teste independente manual). Executado pelo Verifier: `node tools/sprite-preview.mjs <tmp>` saiu 0 com `player-sheet.png` + 14 `anim-*.png` (1 por chave de `PLAYER_ANIMS`) | PASS (manual) / lacuna de precisão |

Edge cases: tamanho de `durations` diferente lança com o nome (`tests/game/art.test.ts:862`); pouso segurando objeto mantém `carry-*` (`tests/core/animState.test.ts:80`); hurt/golpe vencem `land` (`tests/core/animState.test.ts:80`). Todos PASS.

## Sensor de discriminação (scratch em `git worktree` temporário, `node_modules` por junction)

| # | Mutante | Alvo | Resultado |
| --- | --- | --- | --- |
| M1 | `landMs < LAND_MS` -> `<=` | `src/core/animState.ts` | MORTO (`animState.test.ts:65`, `:75`) |
| M2 | `\|vy\| < APEX_VY` -> `<=` | `src/core/animState.ts` | MORTO (`animState.test.ts:49`) |
| M3 | `selOut`: `skin >= 2` -> `skin >= 3` | `src/game/art/sprites/player.ts:49` | SOBREVIVEU |
| M4 | `!(duration > 0)` -> `duration < 0` (aceita 0) | `src/game/art/sprites/player.ts:378` | MORTO (`art.test.ts:867`) |
| M5 | `landMs` nunca zera no pouso (`landed ? 0 :` removido) | `src/game/Player.ts:389` | MORTO pelo smoke `player-anim` ("nenhum frame land-*") |
| M6 | smear removido de `jab-hit` | `src/game/art/sprites/player.ts:318` | MORTO (`art.test.ts:930`) |
| M7 | `registerAnims` não repassa `duration` ao Phaser | `src/game/art/index.ts:128` | SOBREVIVEU (unit e smoke `player-anim` passam) |

Resultado: 5/7 mortos, 2 sobreviventes. Scratch removido; `git worktree list` sem resíduo e `git status --porcelain` da árvore real idêntico ao baseline (apenas `?? .agents/ .claude/ .cursor/ .windsurf/ skills-lock.json`, já pré-existentes).

## Gates

| Gate | Resultado |
| --- | --- |
| `npm run typecheck` | exit 0 |
| `npm test` | 1078 passed, 0 failed, 0 skipped |
| `npm run build` | exit 0 (aviso de chunk > 500 kB, pré-existente) |
| `npm run smoke -- player-anim` | ok (1 cenário) |
| `npm run smoke` completo | passou no worker; não repetido pelo Verifier |

## Lacunas (por severidade)

1. **Major - SPR-08, repasse de `duration` sem teste (M7).** Nada afirma que `registerAnims` entrega as durations ao `scene.anims.create`; a regressão que volta ao timing uniforme passa em tudo. Fix: teste de `registerAnims` com `scene` falso (captura o `config.frames`) afirmando `duration` por frame e o throw nomeando a animação, ou asserção no smoke sobre `scene.anims.get('player-idle').frames[i].duration` via `window.__game`.
2. **Minor - regra do `selOut` não definida pela spec (M3).** A spec só fixa o resultado (<= 8 `k` internos, `o`/`x`/`j` presentes). O teste `art.test.ts:877` só usa vizinhos de pele 4/4, então o limiar `skin >= 2` vs `>= 3` não é discriminado. Decidir: fixar a regra na spec (2 vizinhos de pele -> `x`) e testar o limite, ou aceitar como detalhe de implementação.
3. **Minor - SPR-15 sem teste automatizado.** Verificado só à mão (T2 `Tests: none`). Aceitável pelo "Independent Test" da spec; um teste que gere em tmp e confira 15 arquivos fecharia.
4. **Cosmético - rastreabilidade defasada.** `spec.md` ainda marca SPR-08 e SPR-15 como `Pending` apesar de T1/T2 concluídas.
5. **Cosmético - título do `it.each` em `art.test.ts:930`** imprime `%s-wind` como `undefined-wind` (segundo `%s` sem argumento); não afeta a asserção.

## Qualidade de código

Escopo restrito aos arquivos da feature; `animFrameConfigs` é pura e reutilizada por `registerAnims`; `selOut`/`compose` seguem o padrão existente. Nenhuma diretriz de teste documentada além de `tasks.md` (aplicada).

## Resumo

**Overall**: Issues (FAIL até a lacuna 1 ser fechada)
**Spec-anchored check**: 14/15 ACs com asserção no resultado da spec; 1 AC (SPR-08) com cláusula sem teste; 2 imprecisões de spec (SPR-15, regra do selOut)
**Sensor**: 5/7 mortos
**Gate**: 1078 passed, typecheck e build ok
