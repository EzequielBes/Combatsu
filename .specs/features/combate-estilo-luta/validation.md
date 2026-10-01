## Validation: combate-estilo-luta (rodada 3) - PASS

**Data**: 2026-10-01
**Spec**: `.specs/features/combate-estilo-luta/spec.md` (91 ACs)
**Faixa do diff**: `0fb3d0d..HEAD` (HEAD = `a1caa32`; correções T25 de `a1caa32` sobre a rodada 2 em `af473b3`)
**Verifier**: sub-agente independente (autor != verificador), Sonnet 5.5
**Veredito**: PASS. Os 91 ACs têm evidência `arquivo:linha` com o valor da spec, o gate passou em 3 de 3 rodadas completas de smoke (22 cenários cada), e os mutantes M8, M10, M13d e o do balanço do `K` (`Player.ts:767`) morrem. Restam apenas gaps de precisão da spec, nenhum fix pendente.

Convenções: `M`=`tests/data/moves.test.ts`, `MM`=`tests/core/moveMachine.test.ts`, `D`=`tests/core/defense.test.ts`, `DO`=`tests/core/dodge.test.ts`, `ST`=`tests/core/structure.test.ts`, `CC`=`tests/core/comboCounter.test.ts`, `EG`=`tests/core/enemyGuard.test.ts`, `BB`=`tests/core/bossBrain.test.ts`, `F`=`fight.smoke.mjs`, `DS`=`defense.smoke.mjs`, `EGS`=`enemy-guard.smoke.mjs`, `DE`=`defense-extra.smoke.mjs`, `FS`=`finisher.smoke.mjs`, `FX`=`fight-integration.smoke.mjs` (smokes em `scripts/smoke/`). Linhas dos testes e smokes de luta não mudaram desde a rodada 2 (`git diff a94045b..HEAD` toca só smokes antigos, `finisher.smoke.mjs` e `armed.smoke.mjs`).

---

## Gate

| Comando | Saída |
| --- | --- |
| `npm run build` | exit 0 |
| `npx vitest run` | 66 arquivos, **1055 passed, 0 failed** (865 antes da feature; `lightning.test.ts` passou nesta rodada) |
| `npm run smoke` rodada 1 | **22/22 ok**, exit 0 |
| `npm run smoke` rodada 2 | **22/22 ok**, exit 0 |
| `npm run smoke` rodada 3 | **22/22 ok**, exit 0 (inclui `kokusen`, `armed`, `heal`, `finisher`, `defense-extra`, `fight-integration`) |

Testes pulados: nenhum. Nenhum teste removido.

---

## Os 3 gaps da rodada 2

| Gap R2 | Evidência `arquivo:linha` | Status |
| --- | --- | --- |
| 1. Estabilidade do gate (guarda dos inimigos nos smokes anteriores à F7) | `git diff a94045b..HEAD -- scripts/smoke` mostra, nos 15 smokes antigos (armed `:4,:30,:150`, boot, boss-victory, boss x2, drops, enemy-died, fxlab, heal, held-item, hud, kokusen `:31`, run-loop, shop x2, tech x2, techniques), pares `-page.goto(...)`/`+page.goto(...)` em que a única mudança é `&enemyGuard=0` na query. Nenhuma linha de asserção removida ou alterada nesses arquivos (`git diff ... \| grep '^-' \| grep -v page.goto` só devolve as 2 linhas de salto do `finisher`). 3 rodadas completas verdes (22/22) | FECHADO |
| 2. Pré-condição do pisão (AIR-03) | `scripts/smoke/finisher.smoke.mjs:140-145` espera o jogador parado no chão (`vy===0` e `y` estável); `:147-149` segura `Space` até `vy >= 0 && y < 440` e só então solta. As asserções `:158` (`free.s.player.vy < 900`), `:160` (`stomp.air.y < 440`), `:161` (`move==='pisao'`), `:162` (`player.vy === 900`) seguem iguais. 3 rodadas verdes sem a falha de pré-condição | FECHADO |
| 3. Edge case `K` com objeto na mão balança o objeto | `scripts/smoke/armed.smoke.mjs:153-154` a faca segue `held` depois do `J`; `:159-166` aperta `K`, exige `knifeNow().state === 'swing'` em até 15 passos de 20 ms (300 ms) e `snap.player.move === null` (`:162,:166`, nenhum golpe do grafo). Mutante `Player.ts:767` (só `J` balança) morre (ver sensor) | FECHADO |

---

## Spec-Anchored Acceptance Criteria (91)

Evidência inalterada desde a rodada 2 (arquivos de teste e smokes de luta não mudaram; gate verde 3 vezes). Resumo por história, com as linhas âncora.

| História | ACs | Evidência âncora (inalterada, exceto o que a tabela acima atualiza) | Status |
| --- | --- | --- | --- |
| Controles | CTL-01/02/04 `tests/core/fightInput.test.ts:6,10,14`; CTL-03 `F:50-52`; CTL-07 `armed.smoke.mjs:202-209`; CTL-05 leituras vivas `F:32`, `DS:90,150,120,195`, `EGS:32,142`, `DS:263`; CTL-06 `F:35-38`; CTL-09 `DS:149,197`; **CTL-08 `FX:198-203`** | 9/9 | PASS |
| Grafo de golpes | MOV-01 `M:7-24`; MOV-02..08 `MM:28`, `F:58,78,80,91,134,152`; MOV-03 `MM:72,91-93`; MOV-04 `M:41-65`; MOV-09/16 `MM:146-160`; MOV-10 `F:107-110`; MOV-11 `F:142`; MOV-12 `M:86-90`; MOV-13 `F:23-24`; MOV-18 `MM:37-45`; MOV-14 `tests/game/art.test.ts:714-768`; **MOV-15 `FX:241,243`** | 18/18 | PASS |
| Guarda | GRD-01 `D:15-26`; GRD-02 `D:103-104`, `DS:147`; GRD-07 `DS:146,152`; GRD-03 `D:109`, `DS:178-179`; GRD-04 `D:127-129`; GRD-08 `DS:148`; GRD-09 `DS:153`; **GRD-05 `DE:44-49`**; **GRD-06 `DE:126`, `D:120-123`** | 9/9 | PASS |
| Parry | PAR-01 `D:54,58`, `DS:90,105`; PAR-02 `D:135-143`, `DS:193`; PAR-09 `DS:191,200`; PAR-03 `DS:195`, `ST:76-83`; PAR-10 `DS:213-214`; PAR-08 `DS:199`; PAR-04 `D:81,85`, `DS:100`; PAR-05 `D:156-158`; PAR-06 `D:147-148`, `DS:196`; PAR-11 `DS:194`; **PAR-07 `DE:144`, `BB:340-347`** | 11/11 | PASS |
| Esquiva | DOD-01 `DO:23-46`, `DS:130-131`; DOD-09 `DS:120`; DOD-02 `DO:56-61`; DOD-03 `DO:110-121`, `DS:262,273`; DOD-07 `DO:181-190`, `DS:263,271`; DOD-08 `DO:152-169`, `DS:282,287`; DOD-04 `DO:76`; DOD-10 `DO:80,84`; DOD-05 `DO:94`; DOD-11 `DS:132,265`; DOD-12 `DS:264`; **DOD-06 `DE:67-68`** | 12/12 | PASS |
| Estrutura e finalizador | STR-01..04,07 `ST:11-157`; STR-05/06/08/10/11 `ST:162-197`, `DS:219-231,296,314-317`; STR-09 `art.test.ts:787-798`; FIN-02 `DS:249`; **FIN-01 `FS:106-126`**; **FIN-03 `FS:88`**; **FIN-04 `FS:134-135`** | 15/15 | PASS |
| Aéreos | AIR-01 `MM:184-189`; AIR-02 `MM:191-201`, `F:219-224`; AIR-04 `MM:211-220`; AIR-05 `F:221`; **AIR-03 `FS:162`** | 5/5 | PASS |
| Inimigos que bloqueiam | EBL-01 `EG:27-74`, `run.test.ts:329-334`; EBL-02 `EG:89`, `EGS:32-36`; EBL-03/05 `EG:110`, `EGS:50-51`; EBL-04 `EG:119`, `EGS:83-84` | 5/5 | PASS |
| Combo | CMB-01 `CC:19-27`; CMB-02 `CC:35-60`; CMB-03 `CC:73-115`, `EGS:154-170`; CMB-04 `EGS:146-147`; CMB-05 `EGS:148` | 5/5 | PASS |
| Palma | SPC-01 `motionInput.test.ts:18-26,69-74`, `F:188`; SPC-02 `F:194` | 2/2 | PASS |

**Placar**: 91/91 ACs com evidência do valor da spec; 0 parciais; 0 sem evidência.

---

## Spec-precision gaps (estado)

1. PAR-02 x GRD-04 (parry vs imbloqueável): a spec segue omissa; agora o comportamento (parry anula a onda imbloqueável do rugido) está fixado por `DE:201-202`. Fica o gap de redação da spec.
2. EBL-01 "within 60 px": sem definição de medida; teste usa `distancePx` abstrato (`EG:68-74`).
3. FIN-04: a spec só limita a subida (100 ms), não segura nem volta; `FS:134-135` fixa só a subida.
4. AIR-03: "max fall speed" sem valor na spec; `FS:162` usa 900 (`tuning.ts:16`).
5. CMB-04: "right side" sem limiar; `EGS:147` usa `x > 480`.
6. Tolerâncias de tempo ao vivo (17 a 50 ms) em PAR-08/10, FIN-02, STR-05/06, MOV-10: a spec dá ms exatos; só os unitários provam o valor exato nos que têm unitário.
7. (fechado na rodada 3) Edge case "J e K balançam o objeto": agora `armed.smoke.mjs:159-166` cobre o `K`.

---

## Discrimination Sensor

Worktree manual `scratchpad/wt-verify7c` (HEAD `a1caa32`, junction `node_modules`), uma mutação por vez (`git checkout -- src scripts` entre elas), executada pelo smoke que cobre o AC. Baseline `git status --porcelain` da árvore real: `?? .agents/ .claude/ .cursor/ .windsurf/ skills-lock.json`, idêntico no fim (junction removida, `git worktree remove --force`, `prune`). Nenhum `git stash`.

| # | Arquivo:linha | Mudança | Morto? | Smoke e asserção que matou |
| --- | --- | --- | --- | --- |
| M17 | `src/game/Player.ts:767` | `(input.lightPressed \|\| input.heavyPressed)` -> `input.lightPressed` (só `J` balança o objeto) | Morto (2 execuções) | `armed`, `armed.smoke.mjs:165`: "F7: K com a faca na mão deveria balançar a faca" (estado `held`) |
| M10 | `src/data/moves.ts:186` | `finisherRangePx` 40 -> 41 | Morto | `finisher`, `FS:111`: "a 40.89 px (> 40) não deveria finalizar" |
| M8 | `src/data/moves.ts:160` | `guardSpeedFactor` 0.4 -> 0.5 | Morto | `defense-extra`, `DE:48`: "mediu 110.0" |
| M13d | `src/game/Player.ts:793` | `vy` do pisão `maxFallSpeed - 300` | Morto | `finisher`, `FS:162`: "veio 630" (confirma que o `FS` estabilizado ainda discrimina) |

**Profundidade**: leve, 4 mutações (5 execuções). **Resultado**: 4/4 mortas. M13 (-1 px/s, rodada 2) segue como mutante praticamente equivalente (a gravidade re-clampa a 900 antes do snapshot), registrado sem fix.

---

## Lições

L-042 (candidata, `gate_fail`: fixar a aleatoriedade nova nos smokes antigos) foi confirmada na prática pela correção T25 (22/22 em 3 rodadas, antes 3 falhas em 11 isoladas). `lessons.py` não tem comando de confirmação: a promoção a confirmada exige recorrência em um segundo recurso, então ela permanece candidata. Nenhuma lição nova (nenhuma falha fundamentada nesta rodada).

---

## Requirement Traceability Update

Os 91 ACs passam a Verified: CTL-01..09, MOV-01..18, GRD-01..09, PAR-01..11, DOD-01..12, STR-01..11, FIN-01..04, AIR-01..05, EBL-01..05, CMB-01..05, SPC-01..02.

---

## Summary

**Resultado geral**: PASS
**Spec-anchored check**: 91/91 ACs com o valor da spec; 6 spec-precision gaps abertos (o do `K` fechou)
**Sensor**: 4/4 mutações mortas (M17 `Player.ts:767`, M10, M8, M13d)
**Gate**: build exit 0; vitest 1055 passed, 0 failed; smoke 22/22 em 3 rodadas

**O que funciona**: grafo de golpes, guarda, parry, esquiva, estrutura, finalizador, bloqueio de inimigos, combo e palma estão presos por limites dos dois lados em `src/core`/`src/data` e por smokes que leem o snapshot vivo; os smokes antigos ficaram estáveis com a guarda dos inimigos fixada em `enemyGuard=0`.

**Próximo passo**: merge `--no-ff` em `dev` (AD-008) e UAT visual do usuário antes de `main`.
