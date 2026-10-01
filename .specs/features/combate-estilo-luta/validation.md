## Validation: combate-estilo-luta - FAIL (rodada 2)

**Data**: 2026-10-01
**Spec**: `.specs/features/combate-estilo-luta/spec.md` (91 ACs)
**Faixa do diff**: `0fb3d0d..HEAD` (HEAD = `a94045b`; rodada 1 verificou até `42ab7bf`; fixes T22-T24 em `b8251a5`, `c77bc36`, `a94045b`)
**Verifier**: sub-agente independente (autor != verificador), Sonnet 5.5
**Veredito**: FAIL por um único motivo, fora dos ACs. Os 91 ACs agora têm evidência `arquivo:linha` com o valor da spec, e os mutantes M8, M9 e M10 morrem. Mas `npm run smoke` não passa de forma estável: `kokusen.smoke.mjs` (cenário da F5) falha de forma intermitente por causa da F7 (causa raiz achada e confirmada, correção de uma linha). Critério de sucesso da spec: "`npm run smoke` passa, sem regressão das técnicas".

Convenções: `M`=`tests/data/moves.test.ts`, `MM`=`tests/core/moveMachine.test.ts`, `D`=`tests/core/defense.test.ts`, `DO`=`tests/core/dodge.test.ts`, `ST`=`tests/core/structure.test.ts`, `CC`=`tests/core/comboCounter.test.ts`, `EG`=`tests/core/enemyGuard.test.ts`, `BB`=`tests/core/bossBrain.test.ts`, `F`=`fight.smoke.mjs`, `DS`=`defense.smoke.mjs`, `EGS`=`enemy-guard.smoke.mjs`, `DE`=`defense-extra.smoke.mjs`, `FS`=`finisher.smoke.mjs`, `FX`=`fight-integration.smoke.mjs` (smokes em `scripts/smoke/`). Números de linha dos arquivos que não mudaram desde a rodada 1 são os mesmos da rodada 1 (`3990888`); confirmei por `git diff 42ab7bf..HEAD`: os únicos testes tocados foram `bossBrain.test.ts`, `comboCounter.test.ts` e `debugApi.test.ts`, mais os 3 smokes novos.

---

## Gate

| Comando | Saída |
| --- | --- |
| `npm run build` | exit 0 |
| `npx vitest run` | 1054 passed, **1 failed** (1055): `tests/core/lightning.test.ts` "seeds 0..999" estourou 5000 ms sob carga (nota de ambiente conhecida). Isolado: 5/5 passam |
| `npm run smoke` (completo) | 18 ok, **1 falha**: `kokusen.smoke.mjs` ("2º impacto comum deveria tirar 18 a mais", hp 48/60), exit 1. Os 3 smokes novos (`defense-extra`, `finisher`, `fight-integration`) e `armed`, `heal` passaram |

Contagem de testes: 865 antes da feature, 1053 na rodada 1, 1055 agora (+2: `BB:336-351`, `CC:118-130`). Nenhum teste pulado ou removido.

### Atribuição da falha do `kokusen.smoke.mjs` (investigada com repetição)

| Condição | Execuções isoladas | Falhas |
| --- | --- | --- |
| `0fb3d0d` (antes da F7), worktree à parte | 13 | **0** |
| HEAD `a94045b` | 11 (3 + 3 + 5) | **3** ("2º impacto..." x1, "CE-06 ... deveria somar 3" mediu 2.80 e 2.53) |
| HEAD, rodadas completas | 3 | 2 falharam (rodada 1 e esta) |
| HEAD com `&enemyGuard=0` no `page.goto` do kokusen (só no worktree) | 8 | **0** |

Causa raiz: `scripts/smoke/kokusen.smoke.mjs:31` abre `?debug&seed=1&noshop=1&tech=divergente` sem `enemyGuard=0`. A F7 acrescentou o sorteio de guarda dos inimigos (EBL-01: 10% na rodada 1, `Run.guardRng`, `src/core/run.ts`); quando o sorteio cai, o jab ou impacto leve é bloqueado (0 de dano, +8 de estrutura) e o smoke, que mede dano exato e +3 de CE, falha. O sorteio depende da sequência de golpes e do jitter de frames, por isso é intermitente. Não é bug de jogo; é regressão de estabilidade do smoke da F5. `armed.smoke.mjs` (`:4,:30,:150`, rodada 3 = 16% de chance) tem a mesma exposição e é a provável origem da intermitência relatada pelo autor ("nenhuma segunda faca largada"); não reproduzi essa falha nesta sessão.

### Notas de ambiente
- `lightning.test.ts`: estouro de 5 s sob carga, confirmado e conhecido; passa isolado.
- `heal.smoke.mjs` HEAL-09: passou nas rodadas completas desta sessão.
- A máquina tem outras sessões do Edge e do node rodando (carga alta), o que agrava intermitências.

---

## Gaps da rodada 1: re-checagem

| Gap R1 | Evidência agora `arquivo:linha` + asserção | Valor da spec | Status |
| --- | --- | --- | --- |
| GRD-05 | `DE:44` velocidade normal `Math.abs(normal.speed - 220) <= 4`; `DE:47` `guarded.guard==='guard'`; `DE:48` `Math.abs(guarded.speed - 88) <= 4`; `DE:49` `Math.abs(ratio - 0.4) <= 0.02` (mediana do deslocamento por frame) | 40% da velocidade | PASS. Mata M8 (0.5 -> mediu 110.0) |
| PAR-07 | `DE:142` postura inicial 100; `DE:143` hp do jogador igual; `DE:144` `parried.s.boss.poise === 70`; `DE:145` hp do chefe igual; unitário `BB:340` 70, `BB:344` 10, `BB:347` piso 0 e `staggerStart`, `BB:349` hp intacto (`receiveKokusen(0,30)`) | postura -30, piso 0 | PASS. Mata M9 (29 -> ficou 71) |
| FIN-03 | `FS:83` `finisher.distPx === null` sem quebrado; `FS:88` `finishers(...)===0` e hp do inimigo igual após `both`; `FS:89` zoom não muda | nenhum finalizador sem alvo quebrado a <= 40 px | PASS |
| FIN-01 borda | `FS:106` posição em (40, 41]; `FS:111` a 40.xx px `finishers===0` e hp igual; `FS:120` posição em (36, 40]; `FS:125` `finisher:<id>` uma vez; `FS:126` dano 40 | <= 40 px | PASS. Mata M10 (41 -> "a 40.84 px não deveria finalizar") |
| FIN-04 | `FS:128` zoom antes < 1.7; `FS:134` `zoomFrames*FRAME_MS <= 100`; `FS:135` `Math.abs(zoom - 1.7) <= 1e-6` | 1.7 em <= 100 ms | PASS. Mata M12 (1.6 -> 500 ms) |
| CTL-08 | `FX:198` `heldItem === null` após `S`+`E`; `FX:202` `dropped.state==='rest' && dropped.vx===0`; `FX:203` perto do jogador | solta, sem `thrown` | PASS. Mata M14 (`interact(false)` -> `state:"thrown"`) |
| MOV-15 | `FX:241` com `forca` 1 o jab causa 7 (e não 6); `FX:243` `ceGain >= 3 && <= 3.2` | `meleeDamage` e +3 CE | PASS. Mata M16 (sem `meleeDamage` -> causou 6) |
| GRD-06 | `DE:125` guarda de pé no bloqueio; `DE:126` `prev.hp - s.hp === 5` na investida de 18 (`round(18 x 0,25)`); unitário `D:120-123` | `round(dano x 0,25)` | PASS |
| DOD-06 | `DE:64` jab na recovery; `DE:67` `player.move === null` no frame do `Q`; `DE:68` `dodge.active` e um `dodge` novo; `DE:77` golpe que não acertou não é cancelado | golpe termina e esquiva começa no frame | PASS |
| AIR-03 | `FS:161` `move==='pisao'`; `FS:162` `player.vy === 900` (sem o pisão `FS:158` `vy < 900`) | vy = queda máxima | PASS. Mata M13d (-300 -> veio 630). M13 (-1 px/s) sobrevive: a gravidade de 30 px/s por frame leva de 899 a 900 antes do snapshot, mutante praticamente equivalente (ver sensor) |
| Edge: objeto na mão | `DE:91` segurando; `DE:95` `U` abre `parry`; `DE:97` guarda de pé com `heldItem !== null`; `DE:102-103` esquiva funciona e não solta. Balanço com `J`: `armed.smoke.mjs:141,147` (faca na mão, `J`, acerta). Balanço com `K` na mão: sem evidência | guarda/parry/esquiva funcionam; `J`/`K` balançam | PASS (ressalva: `K` com objeto sem evidência) |
| Edge: técnica em conjuração | `FX:265` `guard==='none'`; `FX:266` sem esquiva; `FX:269` sem `parry`; controle `FX:273` | guarda/parry/esquiva não começam | PASS |
| Edge: chefe em `roar` | `DE:198` onda imbloqueável causa 12 apesar da guarda; `DE:199` sem `block`; `DE:201` parry anula (um `parry`); `DE:202` hp igual | regras da guarda no rugido | PASS (também fixa parry x imbloqueável, ver gaps de precisão) |
| Edge: nova run | `FX:303` estrutura do jogador 0 e não quebrada; `FX:304` estruturas dos inimigos 0; `FX:305` combo 0, nota null, HUD null; `FX:306` `timeScale === 1`; unitário `CC:122-129` | tudo zera | PASS. Mata M15 (sem `structure.reset()` -> `cur: 10`) |

---

## Spec-Anchored Acceptance Criteria (91)

Os ACs que estavam PASS na rodada 1 mantêm a mesma evidência (arquivos de teste e smokes de origem não mudaram; os três smokes de luta antigos e o gate rodaram verdes). Resumo por história, com as linhas âncora.

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
7. Edge case "J e K balançam o objeto": `K` com objeto não tem evidência.

---

## Discrimination Sensor

Worktree manual `scratchpad/wt-verify7b` (HEAD `a94045b`, junction `node_modules`), uma mutação por vez (`git checkout -- src scripts` entre elas), executada pelo smoke que cobre o AC. Baseline `git status --porcelain` da árvore real: `?? .agents/ .claude/ .cursor/ .windsurf/ skills-lock.json`, idêntico no fim (junctions removidas, `git worktree remove --force`, `prune`; também removi o worktree de baseline `wt-base` em `0fb3d0d`).

| # | Arquivo:linha | Mudança | Morto? | Smoke e asserção que matou |
| --- | --- | --- | --- | --- |
| M8 | `src/data/moves.ts:160` | `guardSpeedFactor` 0.4 -> 0.5 | Morto | `defense-extra`, `DE:48`: "GRD-05 ... mediu 110.0" |
| M9 | `src/data/moves.ts:163` | `parryBossPoiseDamage` 30 -> 29 | Morto | `defense-extra`, `DE:144`: "ficou 71" |
| M10 | `src/data/moves.ts:186` | `finisherRangePx` 40 -> 41 | Morto | `finisher`, `FS:111`: "a 40.84 px (> 40) não deveria finalizar" |
| M12 | `src/scenes/TestScene.ts:87` | `FINISHER_ZOOM` 1.7 -> 1.6 | Morto | `finisher`, `FS:134`: "zoom levou 500 ms" |
| M13d | `src/game/Player.ts:793` | `vy` do pisão `maxFallSpeed - 300` | Morto | `finisher`, `FS:162`: "veio 630" |
| M13 | `src/game/Player.ts:793` | `vy` do pisão `maxFallSpeed - 1` (2 execuções válidas) | **Sobreviveu** (praticamente equivalente) | a gravidade (1800 px/s^2, 30 px/s por frame) re-clampa a 900 antes do snapshot; não observável por `player.vy` |
| M14 | `src/game/Player.ts:335` | `interact(input.down)` -> `interact(false)` (`S`+`E` arremessa) | Morto | `fight-integration`, `FX:202`: estado `thrown` |
| M15 | `src/game/Player.ts:425` | removeu `this.structure.reset()` | Morto | `fight-integration`, `FX:303`: `cur: 10` na nova run |
| M16 | `src/game/Player.ts:854` | `meleeDamage(move.damage)` -> `move.damage` | Morto | `fight-integration`, `FX:241`: "causou 6" |

(A primeira execução de M13 caiu na pré-condição `FS:160` "deveria estar no ar: y=441.7", antes do efeito da mutação; descartada e repetida. Isso mostra fragilidade de temporização da pré-condição do pisão no `finisher.smoke`: 1 falha em 4 execuções sob carga. Nas duas execuções completas do gate ele passou.)

**Profundidade**: leve (9 mutações novas e M8-M10 da rodada 1). **Resultado**: 8 mortas, 1 sobrevivente praticamente equivalente (M13, 1 px/s). Os 3 sobreviventes da rodada 1 morrem.

---

## Fix Plans

1. **Estabilizar `kokusen.smoke.mjs` (Blocker do gate)**: acrescentar `&enemyGuard=0` ao `page.goto` em `scripts/smoke/kokusen.smoke.mjs:31`. Verificado: 8/8 verdes no HEAD (contra 3 falhas em 11 sem a mudança). Aplicar o mesmo em `scripts/smoke/armed.smoke.mjs:4,30,150` e checar os demais smokes antigos que acertam golpe leve em inimigo comum (`techniques`, `tech`, `drops`, `enemy-died`, `heal`, `run-loop`, `held-item`) por sorteio de guarda. Re-rodar `npm run smoke` 3x.
2. **Pré-condição do pisão** (`FS:160`): esperar o frame em que `player.y` sobe abaixo do limiar em vez de contar 12 frames fixos. Minor.
3. **`K` com objeto na mão** (edge case): um teste de balanço do objeto com `K`. Minor.

---

## Requirement Traceability Update

Se o item 1 for corrigido e o gate ficar verde: todos os 91 ACs passam a Verified. Hoje o gate está vermelho, então a spec segue em Implementing.

---

## Summary

**Resultado geral**: FAIL (gate de smoke instável por regressão de estabilidade em `kokusen.smoke.mjs`)
**Spec-anchored check**: 91/91 ACs com o valor da spec (0 parciais, 0 zero); 7 spec-precision gaps
**Sensor**: 9 mutações, 8 mortas, 1 sobrevivente praticamente equivalente (M13); M8, M9, M10 mortas
**Gate**: build exit 0; vitest 1054 passed, 1 timeout conhecido de `lightning.test.ts` (passa isolado); smoke 18/19, falha em `kokusen.smoke.mjs`

**O que funciona**: os fixes T22-T24 fecham todos os gaps da rodada 1 com asserções no valor da spec, lidas do snapshot vivo, e os mutantes dos novos ACs morrem.

**Próximo passo**: aplicar o fix 1 (uma linha por smoke) e re-verificar (iteração 2 de no máximo 3).
