# Boss a cada 5 rodadas — Validation

**Date**: 2026-09-25
**Spec**: `.specs/features/boss-a-cada-5/spec.md` (52 requisitos, 6 casos de borda)
**Diff range**: `7bda3e6..4ced596` (T1..T10, mais `75532ff` que reconcilia `WAVE-01`/edge case de `run-e-rodadas` com `BOSS-01`). 34 arquivos, +3162/−167: `src/core/{bossAI,bossBrain,bossTier,mover,collision,hitstop,run,waves}.ts`, `src/data/{tuning,fx}.ts`, `src/game/{Boss,Projectile,Hud,Player,debugApi,physics,textures}.ts`, `src/game/art/{index,sprites/boss}.ts`, `src/scenes/TestScene.ts`, `scripts/smoke/{boss,boss-victory}.smoke.mjs`, mais os `tests/**` correspondentes.
**Verifier**: sub-agente independente (autor ≠ verificador), rodada 1.

---

## Result: **FAIL** ❌

Motivo: os gates estão verdes e os 52 requisitos têm evidência `file:line` que discrimina o valor do spec (nenhum spec-precision gap), mas o sensor de discriminação (5 mutações nos pontos de maior risco do diff) matou só 2/5. As outras 3 sobrevivem porque testes existentes não isolam o comportamento específico que deveriam proteger — ver Discrimination Sensor abaixo. Por isso a Requirement Traceability **não foi promovida**.

---

## Gates

- `npx vitest run`: **33 arquivos, 471 passed, 0 failed, 0 skipped** (era 323 antes da feature, conforme `tasks.md`; delta +148, todos novos, nenhum removido/afrouxado).
- `npm run build`: **exit 0** (só o aviso de chunk > 500 kB, pré-existente).
- `npm run smoke`: **exit 0** na primeira execução — `boot`, `boss-victory`, `boss`, `enemy-died`, `hud`, `no-debug`, `run-loop` todos `ok` (7 cenários; F0/F1 continuam verdes).

## Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1..T10 | ✅ Done | Todos os 10 commits presentes (`0b35258`..`4ced596`), na ordem do plano; `75532ff` é um ajuste de spec cruzado com F1, coerente. |

---

## Spec-Anchored Acceptance Criteria (evidence-or-zero)

| AC(s) | Spec-defined outcome | `file:line` + asserção | Result |
| --- | --- | --- | --- |
| BOSS-01, BOSS-02 | round%5===0 → onda de 1, `kind:'boss'`; senão `min(3+(r-1),12)` `kind:'enemy'`, 0 chefes | `src/core/waves.ts:30-32,63-81,121-133` · `tests/core/waves.test.ts:201-212,229-248` (`orders.every(o=>o.kind==='enemy')`, `orders[0].kind==='boss'`) · `tests/core/run.test.ts:252-270` · `scripts/smoke/boss.smoke.mjs:21-33` (`snap.enemies.length===0`, `snap.boss.maxHp===600`) | ✅ PASS |
| BOSS-03 | ponto `E` mais distante do player, empate = menor índice | `src/core/waves.ts:38-49` · `tests/core/waves.test.ts:214-227` (`farthestPoint([{x:100},{x:900}],200)===1`, empate→0, 1 ponto→0) · `scripts/smoke/boss.smoke.mjs:35-37` (`boss.x≈1200` com player em 112, `E` em 624/1200) | ✅ PASS |
| BOSS-04, BOSS-07 | morte do chefe → `kills+1` e `intermission` | `src/core/run.ts:120-130` · `tests/core/run.test.ts:273-285` (`run.kills===1`, `state==='intermission'`, `roundCleared` contido) · `scripts/smoke/boss-victory.smoke.mjs:66-68` | ✅ PASS |
| BOSS-05 | player e chefe morrem no mesmo frame → `gameOver`, não `intermission` | `src/core/run.ts:111-118` (prioridade 1: morte do player) · `tests/core/run.test.ts:287-300` (`state==='gameOver'`, nenhum `roundCleared`) | ✅ PASS |
| BOSS-06, BOSS-08 | intro 1500 ms: `x` fixo, golpe não muda hp | `src/core/bossBrain.ts:73-74` (ignora hit em `intro`) · `tests/core/bossBrain.test.ts:22-45` (1499 ms sem efeito, 1500 ms `introEnd`) · `scripts/smoke/boss.smoke.mjs:42-50` (`s.boss.x` fixo, `s.boss.hp===maxHp` com golpe de teste no meio) | ✅ PASS |
| BAT-01, BAT-09 | preparo `600×m` ms; depois `vx=±320` até 360 px ou parede; hitbox forte 18 só durante o movimento | `src/core/bossAI.ts:142-188` · `src/game/Boss.ts:205-215` (`openChargeHitbox`, dano `spec.damage.charge`) · `tests/core/bossAI.test.ts:43-52,174-231` (vx exato, hitboxOn 1x, para em 360 px somando updates pequenos, `blocked` corta antes) · `scripts/smoke/boss.smoke.mjs:64-82` (preparo ≥600 ms real, `x` só muda depois) | ✅ PASS |
| BAT-02, BAT-10 | preparo `500×m`; `toX` fixado no fim do preparo; 700 ms exatos; pouso: hitbox 1 frame, dano 20, largura corpo+16 cada lado | `src/core/bossAI.ts:154-160,190-202` · `src/game/Boss.ts:241-260` (`shape.width = BODY_W + LANDING_HITBOX_PAD*2` = 40+32) · `tests/core/bossAI.test.ts:234-257` (`progress` 0→1 em 700 ms, `landed` único, `toX` travado) | ✅ PASS |
| BAT-03 | pouso emite 2 ondas, direções opostas, 240 px/s, ≤600 px, 20 px altura, dano 12 | `src/game/Boss.ts:259` (`onLanded` duas chamadas com `dir` opostos) · `src/data/tuning.ts:160` (`BOSS.shockwave`) · `tests/data/tuning.test.ts:65` · `scripts/smoke/boss.smoke.mjs:207-214` (`dirs` -1/1, `height===20`) | ✅ PASS |
| BAT-04, BTIER-05, BTIER-07 | preparo `700×m`; N disparos (3 Oni/5 Tecelã) a 150 ms, na velocidade do arquétipo | `src/core/bossAI.ts:204-218` · `tests/core/bossAI.test.ts:260-289` (5 disparos Tecelã a 325 px/s terminando no 5º; Oni 3 a 260, `dir` para o player) · `scripts/smoke/boss.smoke.mjs:178-197,284-302` (intervalo real ~150 ms, velocidades no tier 1 e no tier 3/round 15) | ✅ PASS |
| BAT-05 | todo preparo ≥350 ms | `src/core/bossAI.ts:228-233` · `tests/core/bossAI.test.ts:55-64` (as 9 combinações ataque×fase) · `tests/game/art.test.ts:371-375` (frame de preparo ≠ idle) | ✅ PASS |
| BAT-06, BAT-12 | projétil/onda somem ao tocar parede/player, ou aos 1200/600 px | `src/game/Projectile.ts:78-100` (`onTouch`, `Mover` expira) · `src/core/mover.ts` · `tests/core/mover.test.ts` (limites exatos 1199/1200, 600) · `scripts/smoke/boss.smoke.mjs:199-205` (dano do projétil no player), `:216-222` (ondas somem) | ⚠️ ver Sensor: sub-caso "toca a parede" não isolado de "expira por distância" |
| BAT-07 | altura da onda (20 px) < ápice do pulo (49 px) | `tests/game/art.test.ts:419-423` (`jumpApex≈49`, `20<jumpApex`) | ✅ PASS |
| BAT-08 | contato sem hitbox aberta → 0 dano | `src/core/collision.ts:35,37` (filtros: corpo não é hitbox) · `scripts/smoke/boss.smoke.mjs:84-104` (`afterContact.player.hp===hpBeforeContact`) | ✅ PASS |
| BAT-11 | durante o preparo, `state==='windup'`, `attack` no evento | `src/game/Boss.ts:100-107` (getter combina `BossBrain`/`BossAI`) · `scripts/smoke/boss.smoke.mjs:59-62` | ✅ PASS |
| BAT-13 | corpo do chefe empurra o player (colisão física, não sensor) | `src/core/collision.ts:10,33,37` (`Filters.boss`/`Filters.player` incluem a categoria uma da outra, sem `isSensor`) — nenhuma asserção observa a não-sobreposição diretamente (a física do Matter garante, mas não há medição de distância no smoke) | ⚠️ Spec-precision gap (comportamento correto por construção do motor, sem asserção dedicada) |
| BAI-01 | fase por hp/maxHp: >66% =1, ≤66% e >33% =2, ≤33%=3 | `src/core/bossBrain.ts:150-154` · `tests/core/bossBrain.test.ts:47-90` (397→fase1, 396→fase2, 199→fase2, 198→fase3) | ✅ PASS |
| BAI-02, BAI-03, BAI-11 | ciclo por fase reinicia ao trocar; `m`=1,0/0,85/0,7; descanso 900/700/500 ms | `src/core/bossAI.ts:42-46,220-233` · `tests/core/bossAI.test.ts:43-52,92-172` (ciclos completos, reinício ao trocar de fase, limites 899/900 etc.) | ✅ PASS |
| BAI-04, BAI-12, BAI-13 | mudar de fase → `roar` 900 ms, invulnerável, empurra o player 6 px/step | `src/core/bossBrain.ts:87-94` · `src/game/Boss.ts:144` (`onRoarPush`) · `tests/core/bossBrain.test.ts:56-66,92-110` · `scripts/smoke/boss.smoke.mjs:106-136` (`state==='roar'`, hp inalterado, `pushDelta` no sentido certo) | ✅ PASS |
| BAI-05 | sem `canAct`: fecha hitbox, zera vx, cancela sem retomar | `src/core/bossAI.ts:236-244` · `tests/core/bossAI.test.ts:291-322` (3 casos: durante investida, durante preparo, retomada) | ✅ PASS |
| BAI-06 | cada limiar dispara uma vez só | `src/core/bossBrain.ts:87-94` (compara com `this._phase`, só sobe) · `tests/core/bossBrain.test.ts:112-135` (golpes repetidos não repetem `phaseChanged`; um golpe que atravessa os dois limiares vai direto pra fase 3 com 1 `roarStart`) | ✅ PASS |
| BAI-07, BAI-08, BAI-09, BAI-10, BAI-14 | postura leve=dano/forte=2×dano, nunca <0; 0→stagger 1200 ms→100; regen 15/s após 2000 ms; leve não gera hitstun; forte nunca ragdoll | `src/core/bossBrain.ts:78-81,96-100,125-145` · `tests/core/bossBrain.test.ts:137-238` (90/64/0 exatos, stagger 1199/1200, regen 1999/2000/+1000, sem evento em golpe leve/forte que não zera) | ✅ PASS |
| BHUD-01, BHUD-02, BHUD-03, BHUD-05, BHUD-07 | barra 400 px, marcas 66%/33%; fill=400×hp/maxHp; some ao morrer com faixa 2000 ms; faixa de entrada 1500 ms; barra ignorada pela câmera principal | `src/game/Hud.ts:26-35,192-251` · `scripts/smoke/boss-victory.smoke.mjs:24-36,38-42,61-76` (marcas 264/132 ±1, fill exato ±1, `bossBarIgnoredByMain` real via `displayList===layer`) | ✅ PASS |
| BHUD-04 | snapshot com `{hp,maxHp,phase,state,attack,poise,archetype,name}` ou `null` | `src/game/debugApi.ts:29-37` · `src/scenes/TestScene.ts:369-379` (lido do chefe vivo) · `scripts/smoke/boss.smoke.mjs:138-144` · `boss-victory.smoke.mjs:69` (`boss===null` após morte) | ✅ PASS |
| BHUD-06 | cores da barra pertencem à `PALETTE` | `src/game/Hud.ts:26-29` · `tests/game/art.test.ts:332-338` | ✅ PASS |
| BWIN-01, BWIN-02, BWIN-03 | cura `round(0,3×maxHp)` com teto; hitstop 250 ms; 1 evento `bossDefeatedFx` com shake+fumaça | `src/scenes/TestScene.ts:316-328` · `src/data/tuning.ts:172` (`healFraction`), `src/data/fx.ts` (`BOSS_DEFEAT_HITSTOP_MS`) · `tests/data/tuning.test.ts:85-93` · `scripts/smoke/boss-victory.smoke.mjs:56-60,77-78` | ⚠️ ver Sensor: BWIN-01 sobrevive a um mutante de valor (0,2 no lugar de 0,3) |
| BTIER-01, BTIER-02, BTIER-03, BTIER-04 | hp/dano escalados com teto; arquétipo por tier | `src/core/bossTier.ts:19-41` · `tests/core/bossTier.test.ts:15-93` (tiers 1,2,3,6,7,8,20; monotonicidade 2..50) | ✅ PASS |
| BTIER-06 | Tecelã: mesma grade, ≥3 cores trocadas, dentro da paleta | `src/game/art/sprites/boss.ts` (`TECELA_COLOR_MAP`) · `tests/game/art.test.ts:382-404` | ✅ PASS |

**Status**: 52/52 requisitos com evidência `file:line` que discrimina o valor do spec (0 spec-precision gaps duros; 2 observações qualificadas em BAT-13 e nos itens que o sensor derrubou, ambas marcadas acima).

---

## Edge Cases

- [x] Player no mesmo x do chefe ao iniciar investida → usa o `facing` atual (`tests/core/bossAI.test.ts:215-231`).
- [x] Chefe atordoado quando cruza um limiar → stagger termina e o roar começa (`tests/core/bossBrain.test.ts:241-257`).
- [x] Chefe morre durante roar/stagger → morte única (stagger testado em `tests/core/bossBrain.test.ts:259-268`; durante roar é vacuamente garantido: `receiveHit` ignora todo golpe em `roar` — `bossBrain.ts:74` — logo hp só pode chegar a 0 fora do roar, antes de qualquer transição de fase).
- [x] Nova run com chefe vivo → chefe e projéteis removidos (`scripts/smoke/boss.smoke.mjs:224-249`).
- [x] Level com um único ponto `E` → chefe nasce nele (`tests/core/waves.test.ts:224-226`, nível de core; não há level real de smoke com 1 ponto, aceitável pois é dado de mapa).
- [x] Rodada de chefe limpa → "Chefe derrotado!" por 2000 ms de jogo, depois "Rodada N concluída" (`scripts/smoke/boss-victory.smoke.mjs:70-76`).

---

## Discrimination Sensor

**Sensor depth**: lightweight (5 mutações, conforme pedido), isoladas num `git worktree` descartável em `scratchpad/verify-f2` (junction para `node_modules`, desfeita com `rmdir` antes do `git worktree remove --force`). `git status --porcelain` da árvore real idêntico antes/depois: `?? .agents/ .claude/ .cursor/ .windsurf/ skills-lock.json`.

| # | File:line | Mutação | Ferramenta | Killed? |
| --- | --- | --- | --- | --- |
| 1 | `src/core/bossBrain.ts:151-152` | Limiar de fase `<=` → `<` | `vitest tests/core/bossBrain.test.ts` | ✅ Killed (6 testes falham: BAI-01/06, roar) |
| 2 | `src/core/bossBrain.ts:78` | Postura de golpe forte: `hit.damage * 2` → `hit.damage` (tira só `dano`, sem ×2) | `vitest tests/core/bossBrain.test.ts` | ✅ Killed (5 testes falham: BAI-07/08, edge de prioridade) |
| 3 | `src/game/Boss.ts:141` | Intro sem invulnerabilidade: removido `state === 'intro'` do guard de `receiveHit` | `npm run smoke` | ❌ **Survived**. O `BossBrain.receiveHit` (`bossBrain.ts:74`) já ignora qualquer golpe em `intro` internamente, então o hp continua protegido por uma segunda camada. O efeito real da mutação é o `Boss.receiveHit` passar a devolver `true` durante a intro; isso importa porque `hitbox.ts:68` usa esse retorno para decidir se mostra faísca/hitstop (`if (!other.target.receiveHit(hit)) return;`). Nenhum teste ataca o chefe pela hitbox real (só via `debugHit`, cujo retorno é ignorado em `TestScene.ts:445-447`) durante a intro, então o vazamento de feedback visual não é pego. |
| 4 | `src/scenes/TestScene.ts:318` | Cura fixa em `0,2` em vez de `BOSS.healFraction` (0,3) | `npm run smoke` | ❌ **Survived**. `boss-victory.smoke.mjs:60` mede `hpBefore` logo antes de cada golpe de teste, mas nessa sequência (`Digit2` repetido, sem o chefe atacar de volta a tempo) o player nunca perde hp: chega à morte do chefe com `hp=100` (teto). `min(100, 100+20)===min(100, 100+30)===100`, então o teste não distingue 20 de 30 - só prova o teto, não a fração. |
| 5 | `src/game/Projectile.ts:89-91` | Onda/projétil não some ao tocar parede (removido o `destroyNow()` do `if (other.kind === 'terrain')`, mantendo só o retorno) | `npm run smoke` | ❌ **Survived**. `boss.smoke.mjs:216-222` só espera a lista de ondas ficar vazia, e o `Mover` (`mover.ts`) sempre expira sozinho aos 600 px independentemente de tocar parede - nenhuma asserção mede que o desaparecimento aconteceu antes do alcance máximo (ou perto de uma parede real), então a remoção por parede especificamente nunca é exercida de forma isolada. |

**Resultado do sensor**: 2/5 killed, 3/5 sobreviventes (nenhum equivalente - as 3 mutações têm efeito observável real, só não são cobertas pelos testes atuais). ❌

---

## Code Quality (diff completo)

| Principle | Status |
| --- | --- |
| Minimum code | ✅ |
| Surgical changes | ✅ (arquivos batem com o que cada task declarou tocar) |
| No scope creep | ✅ |
| Matches patterns | ✅ (`BossAI`/`BossBrain` seguem o estilo de `enemyAI`/`enemyBrain`; `Mover` é novo mas coeso) |
| Spec-anchored outcome check | ✅ (tabela acima) |
| Per-layer Coverage Expectation | ✅ core com 1:1 nos ACs e limites dos dois lados; smoke com 1 cenário por AC visível de adaptador |
| Every test maps to a spec requirement | ✅ (nenhum teste órfão encontrado nas amostras lidas) |
| Documented guidelines followed | `tasks.md` Test Coverage Matrix e Gate Check Commands, seguidos à risca |

---

## Fix Plans

### Fix 1: intro do chefe devolve `true` para golpes reais (mascarado pela dupla proteção)

- **Root cause**: `src/game/Boss.ts:141` tem um guard próprio (`intro`/`roar`/`dead`) redundante com o do `BossBrain`, mas o valor de retorno (`false`) é o único jeito de suprimir faísca/hitstop via `hitbox.ts:68`. Sem `'intro'` nesse guard, um ataque real do player durante a intro mostraria feedback de acerto num chefe que não tomou dano.
- **Fix task**: em `boss.smoke.mjs`, durante a intro, aproximar o player e deixar o combo real (tecla de ataque do jogo, não `Digit2`) conectar no chefe; assert que nenhum evento de faísca/hitstop aparece e que `boss.hp` continua em `maxHp`.
- **Priority**: Minor (efeito é só visual/feedback, sem impacto em hp ou vitória).

### Fix 2: cura da vitória (BWIN-01) não é discriminada quando o player está com vida cheia

- **Root cause**: `boss-victory.smoke.mjs` nunca força dano no player antes da vitória; o teto de 100 hp mascara qualquer fração de cura ≥ 20%.
- **Fix task**: antes do loop de golpes de teste, tirar uma quantidade conhecida de hp do player (ex.: golpe de teste nele mesmo, se existir, ou deixar uma investida/rajada do chefe acertar) para `hpBefore < 70`, garantindo que `hpBefore + 30 < 100` e a asserção discrimine o valor real de `BOSS.healFraction`.
- **Priority**: Major (é o AC de recompensa da vitória, BWIN-01, e o teste atual não prova o número certo).

### Fix 3: remoção do projétil/onda por parede (parte de BAT-06) não é isolada da expiração por distância (BAT-12)

- **Root cause**: `boss.smoke.mjs` só verifica "a lista fica vazia", que é verdade tanto por tocar parede quanto por `Mover` expirar aos 600/1200 px.
- **Fix task**: medir o `traveled`/tempo de vida da onda/projétil que desaparece perto de uma parede do `LEVEL_1` e assert que ele sumiu com menos de 600/1200 px percorridos (prova que foi a parede, não o alcance).
- **Priority**: Minor (o comportamento de expiração por distância já está bem coberto; falta só isolar o caminho de parede).

---

## Requirement Traceability Update

**Não promovida** — veredito FAIL. Todas as linhas de `spec.md` permanecem `Implementing` até uma rodada de re-verificação confirmar os 3 fixes acima (sensor 5/5 ou equivalência justificada).

---

## Summary

**Overall**: ⚠️ Issues — spec-anchored coverage completa e gates verdes, mas o sensor de discriminação achou 3 testes que não provam o que deveriam.

**Spec-anchored check**: 52/52 ACs com evidência que bate com o valor do spec; 0 gaps duros (2 notas qualificadas: BAT-13 e a superfície tocada pelos mutantes sobreviventes).
**Sensor**: 2/5 mortos, 3/5 sobreviventes (não equivalentes).
**Gate**: vitest 471/471, build limpo, smoke 7/7 na primeira tentativa.

**What works**: toda a lógica pura do chefe (fases, postura, ataques, tier) tem testes de unidade com limites exatos dos dois lados; a integração Phaser (T8-T10) tem smoke cobrindo cada AC visível; nenhum teste da F0/F1 quebrou.

**Issues found**: ver Fix 1-3 acima — nenhum é uma regressão de comportamento (o jogo funciona como o spec pede), mas os testes atuais não fechariam a porta se alguém introduzisse esses 3 bugs específicos amanhã.

**Next steps**: rotear os Fix 1-3 para um implementador, aplicar, e pedir uma nova rodada de verificação (ainda dentro do limite de 3 fix→re-verify) antes de promover a Requirement Traceability.
