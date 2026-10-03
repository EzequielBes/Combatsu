# Combate de Mestre — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/combate-mestre/spec.md`
**Design**: `.specs/features/combate-mestre/design.md`
**Status**: In Progress
**Branch**: `feat/combate-mestre` (a partir de `dev`; volta para `dev` com `--no-ff` depois do Verifier PASS e do UAT do usuário, AD-008)
**Modelos**: Opus 5.5 planeja e orquestra; workers e Verifier rodam em Sonnet 5.5 (`model: sonnet`); um worker por vez.

Regras que valem para toda task:

- Um commit por task, no formato Conventional Commits, com a task marcada aqui no mesmo commit. Identidade: `git -c user.name="Claude" -c user.email="ezequieltbeserra00@gmail.com" commit`.
- Teste antigo só muda quando o AC dele está na tabela "ACs antigos substituídos" da spec; a mensagem do commit diz qual AC foi substituído. Nenhum outro teste é apagado, pulado ou afrouxado.
- Todo limiar citado num AC é testado nos dois lados (L-010).
- Mudança de assinatura numa task de núcleo inclui o ajuste mínimo do ponto de chamada para o `typecheck` passar; o comportamento novo do adaptador fica para a task dele.
- Antes de implementar, rodar o teste novo e ver falhar (ou anotar que já passava em `dev`).

---

## Test Coverage Matrix

> Guidelines: `vitest.config.ts`; `.specs/STATE.md` AD-001, AD-006, AD-015, AD-020, AD-021; lições confirmadas L-010 (os dois lados de cada limiar) e L-043 (testar a chamada do adaptador, não só o helper).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Lógica pura (`src/core/**`, `src/data/**`) | unit | 1:1 com os ACs; limiares nos dois lados; ao menos um caso com tuning diferente do padrão | `tests/core/*.test.ts`, `tests/data/*.test.ts` | `npm test` |
| Arte em grade de texto (`src/game/art/**`) | unit | Frames existem, tamanho e paleta válidos, regras de consistência do jogador | `tests/game/art.test.ts`, `tests/game/playerConsistency.test.ts` | `npm test` |
| Roteamento de contato sem Phaser (`src/game/bodyTags.ts`) | unit | Ordem e fila adiada | `tests/game/bodyTags.test.ts` | `npm test` |
| Adaptadores Phaser (`Enemy`, `Player`, `Prop`, `TechRunner`, `Projectile`, `Boss`, `hitbox`, `TestScene`, `debugApi`) | smoke | Valor vivo lido pelo snapshot; `none` na task do adaptador, coberta pelas fases 5 e 6 (L-040) | `scripts/smoke/*.smoke.mjs` | `npm run smoke` |
| Documentação (`README.md`, `.specs/**`) | none | - | - | build gate only |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tasks com testes unitários | `npm run typecheck && npm test` |
| Build | Tasks de adaptador e a última de cada fase | `npm run build && npm test` |
| Full | Tasks de smoke | `npm run build && npm test && npm run smoke` |

`tests/core/lightning.test.ts` pode estourar 5 s com a máquina carregada; nesse caso repetir com `npx vitest run --maxWorkers=2`. Um smoke só: `npm run smoke -- <nome>`.

---

## Execution Plan

### Phase 1: Núcleo puro do golpe e do inimigo — worker W1

```
T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8
```

### Phase 2: Núcleo puro do jogador e arte — worker W2

```
T9 → T10 → T11 → T12 → T13 → T14 → T15 → T16
```

### Phase 3: Adaptadores do golpe e do inimigo — worker W3

```
T17 → T18 → T19 → T20 → T21 → T22 → T23 → T24
```

### Phase 4: Adaptadores do jogador e da cena — worker W4

```
T25 → T26 → T27 → T28 → T29 → T30 → T31
```

### Phase 5: Smokes de leitura, alvos e defesa — worker W5

```
T32 → T33 → T34 → T35 → T36
```

### Phase 6: Smokes de Contra, voadora, chefe e fechamento — worker W6

```
T37 → T38 → T39 → T40 → T41
```

---

## Task Breakdown

### T1: Campos novos do `Hit` e portão de alvos

**What**: Acrescentar ao `Hit` os campos `height`, `knockdown`, `tech`, `counter` e `string`; criar `HitReport`, `TargetGate` e `orderTargets` conforme o design (seção 1).
**Where**: `src/core/hit.ts`
**Depends on**: None
**Reuses**: `makeHitGate` (fica como está)
**Requirement**: TGT-03, TGT-04, TGT-05, TGT-06
**Done when**:
- [x] `TargetGate.wants` devolve `false` para o dono, para alvo já tentado e sem vaga; `note` com `accepted` e `blocked` gasta vaga, com `refused` não gasta.
- [x] Testes com `maxTargets` 1 e 2: o 2º alvo é recusado com teto 1 e aceito com teto 2; um alvo `refused` não impede o seguinte (TGT-05); um `blocked` com teto 1 impede (TGT-06).
- [x] `orderTargets` ordena por `dist` crescente e desempata por `id`; teste com entrada fora de ordem e com empate.
**Tests**: unit
**Gate**: quick

---

### T2: Tipo do golpe inimigo

**What**: Criar `AttackKind`, `attackKindFor`, `hitFieldsFor`, `parseAttackKind`, `parseStringLength` e `KIND_COLOR`.
**Where**: `src/core/attackKind.ts`
**Depends on**: T1
**Reuses**: `EnemyVariant`, `ToolKey`, `Hit`
**Requirement**: HGT-01, HGT-02, HGT-03, HGT-04, HGT-05, HGT-06, HGT-13, DFL-14, EDG-08, EDG-09
**Done when**:
- [ ] `attackKindFor`: porrete dá `red` nas 3 aparências (inclusive `rastejante`); `rastejante` sem arma e com faca dá `low`; `corcunda` e `bruto` sem arma e com faca dão `white`.
- [ ] `hitFieldsFor`: `white` = `{ height: 'high' }` sem `unblockable` verdadeiro; `red` = `high` + `unblockable: true`; `low` = `low` + `unblockable: true`.
- [ ] `parseAttackKind` aceita só `white`, `red`, `low`; devolve `null` para `null`, `''`, `RED`, `high`.
- [ ] `parseStringLength` aceita `1`, `2`, `3`, `4`; devolve `null` para `0`, `5`, `2.5`, `abc`, `''`, `null`.
- [ ] `KIND_COLOR` aponta para chaves que existem em `PALETTE` (`w`, `t`, `A`).
**Tests**: unit
**Gate**: quick

---

### T3: IA com ponto de compromisso e sequência

**What**: Estender a `EnemyAI` com `commitMs`, `stringGapMs` e `hits`: evento `commit`, getters `committed`, `hitIndex` e `hits`, e a sequência `windup → attack → (windup de stringGapMs → attack)* → rest`.
**Where**: `src/core/enemyAI.ts`
**Depends on**: T2
**Reuses**: `next()` (leva a sobra do frame) e `interrupt()`
**Requirement**: CMT-01, DFL-02, DFL-03, DFL-04, DFL-06, DFL-15, EDG-05
**Done when**:
- [ ] `ENEMY_AI` em `src/data/tuning.ts` ganha `commitMs: 200`, `stringGapMs: 300`, `hits: 1`.
- [ ] `committed` é `false` com 201 ms de preparo pela frente e `true` com 200 ms; continua `true` em `attack` e entre dois golpes; volta a `false` em `rest` e depois de `interrupt()`.
- [ ] `commit` sai exatamente uma vez por ataque; `windupStart` só no primeiro preparo, também com `hits` 3.
- [ ] Com `hits` 2: a 2ª `hitboxOn` sai 300 ms depois da 1ª `hitboxOff`, testado com `dt` de 16 ms e com `dt` que não divide os tempos; o estado entre os golpes é `windup`; `rest` só depois do último.
- [ ] `hitIndex` vale 1 no primeiro golpe, 2 no segundo e 0 fora de golpe.
- [ ] `interrupt()` e `canAct: false` no meio da sequência: nenhuma `hitboxOn` depois.
- [ ] Com `hits` 1 o ciclo continua 450 + 120 + 800 ms (regressão) e um caso usa tuning diferente do padrão.
**Tests**: unit
**Gate**: quick

---

### T4: Cérebro com cambaleio, armadura e limite do chão

**What**: Implementar a tabela de `receiveHit(hit, ctx)` do design (seção 4): estado `stagger`, eventos `stagger` e `armored`, limite do chão com `downHits`, `forceStagger(ms)` e `recover()`.
**Where**: `src/core/enemyBrain.ts`
**Depends on**: T3
**Reuses**: `enter`, estados e eventos atuais
**Requirement**: PST-01, PST-03, PST-05, PST-10, PST-11, CMT-04, CMT-06, CMT-07, CNT-21, GND-01, GND-02, GND-03, GND-04, GND-05, GND-06, GND-07, DFL-11, RDG-09
**Done when**:
- [ ] `ENEMY.staggerMs = 380` em `src/data/tuning.ts`.
- [ ] `heavy` sem `knockdown` → `stagger`; volta a `idle` em 380 ms e ainda está em `stagger` em 379 ms.
- [ ] `knockdown: true` → `ragdollStun`, com `light` e com `heavy`.
- [ ] Em `stagger`: `light` mantém `stagger` com `max(resto, 220)` (casos com resto 100 e resto 300); `heavy` volta a 380.
- [ ] `ctx.committed`: `light` e `heavy` sem `knockdown` e sem `counter` deixam o estado em `idle` e devolvem um `armored`; com `counter` → `stagger`; com `knockdown` → `ragdollStun`; golpe fatal → `died`.
- [ ] Chão: 1º golpe sem `tech` em `ragdollStun` tira vida e não muda o tempo que falta; 2º devolve `[]` com o hp igual; `gettingUp` recusa; com `tech` é aceito nos dois estados e `downHits` não muda; `downHits` volta a 0 numa nova queda; o 1º golpe no chão pode matar.
- [ ] `forceStagger(900)` dura 900 ms e é ignorado em ragdoll e morto; `recover()` leva `hitstun` e `stagger` a `idle` e devolve `false` nos outros estados.
- [ ] Os casos antigos de "forte = ragdoll" foram reescritos para PST-01 e PST-05 (AC substituído: golpe forte = ragdoll).
**Tests**: unit
**Gate**: quick

---

### T5: Postura com redução e taxa de queda por parâmetro

**What**: Acrescentar `Structure.reduce(amount)` e o parâmetro opcional `decayPerSec` em `Structure.update`.
**Where**: `src/core/structure.ts`
**Depends on**: T4
**Reuses**: `Structure`
**Requirement**: PST-14, PST-16, DEF-13, DEF-19
**Done when**:
- [ ] `STRUCTURE.enemy.offFocusDecayPerSec = 40` e `STRUCTURE.player.evadeRelief = 10` em `src/data/moves.ts`.
- [ ] `reduce(10)` leva 25 a 15 e 6 a 0; quebrada, não muda; não reinicia o atraso da queda.
- [ ] `update(dt, 40)` cai 40/s e `update(dt)` cai a taxa do tuning, os dois só depois do atraso (1499 ms não cai, 1500 ms começa).
**Tests**: unit
**Gate**: quick

---

### T6: Guarda de leitura do inimigo

**What**: Acrescentar `EnemyGuard.tryRaise(chance, read)` e a marca `read`; com a guarda de leitura, `resolveHit` segura `heavy` sem `unblockable` (0 de dano, +8, guarda termina).
**Where**: `src/core/enemyGuard.ts`
**Depends on**: T5
**Reuses**: `EnemyGuard.resolveHit`, `STRUCTURE.enemy.guardedLightGain`
**Requirement**: RDG-04, RDG-06, RDG-07, RDG-08
**Done when**:
- [ ] `tryRaise(0, ...)` não chama o sorteio (teste com sorteio falso que conta as chamadas); `tryRaise(1, ...)` levanta.
- [ ] Guarda de leitura: `heavy` de frente → dano 0, `structureGain` 8, `blocked` e `guardEnded` verdadeiros; `heavy` com `unblockable` passa com dano cheio; `light` é segurado e a guarda continua.
- [ ] Guarda comum (`read` falso): os resultados de EBL-02..05 não mudam (regressão).
- [ ] `get read()` é `false` depois que a guarda termina ou de `reset()`.
**Tests**: unit
**Gate**: quick

---

### T7: Leitura de repetição e sequência de leves

**What**: Criar `MoveReading`, `readingBonus`, `baseConditionsHold`, `guardChance`, `LightStreak` e `shoveRoll` conforme o design (seção 7).
**Where**: `src/core/moveReading.ts`
**Depends on**: T6
**Reuses**: `ENEMY_GUARD`, `GuardTrigger`
**Requirement**: RDG-01, RDG-02, RDG-03, RDG-10, RDG-13, RDG-14, RDG-15, RDG-16
**Done when**:
- [ ] `READING` em `src/data/moves.ts` com os valores do design.
- [ ] `MoveReading.note`: 1º uso devolve 0; usos seguintes do mesmo golpe contam; um uso feito há 3000 ms conta e há 3001 ms não; golpes diferentes não se somam; `reset()` esvazia.
- [ ] `readingBonus`: 0, 0,25, 0,5, 0,75, 1 e teto 1 com 5 repetições.
- [ ] `baseConditionsHold` reproduz as condições do EBL-01 (leve, `idle`, de frente, 60 px dentro e 61 px fora).
- [ ] `guardChance`: sem override soma base e leitura com teto 1; com override devolve o override se as condições base valem e 0 se não valem, sem somar leitura.
- [ ] `LightStreak`: 1500 ms soma e 1501 ms volta a 1; `onHeavy` zera.
- [ ] `shoveRoll({ streak, chance, roll })`: não sorteia com `streak` 3; sorteia com 4; devolve o resultado do sorteio.
**Tests**: unit
**Gate**: quick

---

### T8: Faca com sequência de 2 golpes e tipo no golpe do inimigo

**What**: `EnemyBase.attack` vira `EnemyAttackDef` (com `kind`); `armFor` da faca põe `ai.hits = ARMED.knife.hits`.
**Where**: `src/core/armed.ts`
**Depends on**: T7
**Reuses**: `armFor`, `scaleFor`
**Requirement**: DFL-01
**Done when**:
- [ ] `ARMED.knife.hits = 2` e `ENEMY_ATTACK.kind = 'white'` em `src/data/tuning.ts`; o tipo `EnemyAttackDef` fica em `src/core/difficulty.ts`.
- [ ] `armFor('cursedKnife')` devolve `ai.hits` 2 sem mudar o resto (dano ×1,25 como hoje); `armFor('cursedClub')` mantém `hits` 1.
- [ ] `scaleFor` preserva `kind` e `hits`.
**Tests**: unit
**Gate**: quick

---

### T9: Frames `duck`, `contra` e `contraGancho` do jogador

**What**: Desenhar os frames `duck`, `contra-wind`, `contra-hit`, `contra-recover`, `contraGancho-wind`, `contraGancho-hit` e `contraGancho-recover`, compostos com `pose` e as partes existentes.
**Where**: `src/game/art/sprites/playerMoves.ts`
**Depends on**: None
**Reuses**: `pose`, `armStraight`, `armRaised`, `LEGS_WIDE`, a base agachada do `socoBaixo`
**Requirement**: CNT-17
**Done when**:
- [ ] Os 7 frames existem em `PLAYER_MOVE_FRAMES`, com o tamanho dos outros frames e só cores da paleta.
- [ ] Passam nos testes de `tests/game/playerConsistency.test.ts` (sem parte solta, tronco alinhado, pés no chão), acrescentados para os frames novos.
- [ ] `duck` tem o topo opaco pelo menos 3 texels abaixo do topo do `idle-0` (teste).
- [ ] Prancha gerada com `SPRITE_SCALE=8 node tools/sprite-preview.mjs` e olhada: braço e pernas presos ao corpo, golpe legível.
**Tests**: unit
**Gate**: quick

---

### T10: Dados dos golpes: alvos, queda, custo e Contras

**What**: `MoveDef` ganha `maxTargets`, `knockdown`, `postureCost`, `counter`, `whiffRecoveryMs` e `bounce`; entram os golpes `contra` e `contraGancho`, o `MoveInput` `{ via: 'counter' }` e as constantes `DUCK` e `COUNTER`; `DEFENSE.guardSpeedFactor` vira 0.
**Where**: `src/data/moves.ts`
**Depends on**: T9
**Reuses**: `MOVES`, `FIST`, hitbox do `ganchoAscendente`
**Requirement**: TGT-01, TGT-02, PST-04, CNT-09, CNT-10, VOA-01, VOA-07, VOA-09, DEF-05
**Done when**:
- [ ] Teste de dados: `maxTargets` 1 em todo `light`, `voadora`, `rasteira`, `contra` e `contraGancho`; 2 nos outros `heavy`.
- [ ] `knockdown` verdadeiro só em `rasteira`, `ganchoAscendente` e `palmaExplosiva`.
- [ ] `contra` e `contraGancho` com os números de CNT-09 e CNT-10.
- [ ] `voadora`: `postureCost` 15, `whiffRecoveryMs` 460, `recoveryMs` 160, `bounce` `{ backPx: 36, ms: 150, vy: -240 }`.
- [ ] `DUCK = { durationMs: 320, cooldownMs: 450 }`, `COUNTER = { windowMs: 450, deflectWindowMs: 900, deflectStaggerMs: 900 }`.
- [ ] O teste antigo da velocidade com a guarda (GRD-05, 40%) foi reescrito para o fator 0 (AC substituído: GRD-05).
- [ ] Os Contras não entram em `initialMove` nem em `followUps` de nenhum golpe (teste).
**Tests**: unit
**Gate**: quick

---

### T11: Ordem nova da defesa e Deflexão

**What**: `resolveIncomingHit` com os campos `counterInvulnerable`, `ducking` e `airborne`, os desfechos `countered`, `ducked` e `jumped` e a ordem do DEF-20; criar `DeflectTracker`.
**Where**: `src/core/defense.ts`
**Depends on**: T10
**Reuses**: `Guard`, `HitResolution`
**Requirement**: DEF-01, DEF-02, DEF-03, DEF-11, DEF-14, DEF-17, DEF-20, CNT-11, DFL-10, DFL-12, DFL-16
**Done when**:
- [ ] Parry só com `attackerInFront` e sem `unblockable`: de costas e contra `red` ou `low` dá `hit` com o dano inteiro.
- [ ] `ducked` com golpe `high` (com e sem `unblockable`); abaixado com `low` e sem `height` dá `hit`.
- [ ] `jumped` com golpe `low` fora do chão; `low` no chão com guarda dá `hit`; `high` fora do chão dá `hit`.
- [ ] `countered` com `counterInvulnerable`.
- [ ] Um teste por par vizinho da ordem (parry antes da esquiva, esquiva antes do Contra, Contra antes do abaixar, abaixar antes do pulo, pulo antes da guarda, guarda antes do golpe cheio).
- [ ] `DeflectTracker`: 2 de 2 e 3 de 3 aparados dão `true` só no último; falta de um parry dá `false`; sequência de 1 dá `false`; `undefined` dá `false`; duas sequências intercaladas não se misturam.
- [ ] Os casos antigos de PAR-02 (parry de qualquer lado e contra imbloqueável) foram reescritos (AC substituído: PAR-02).
**Tests**: unit
**Gate**: quick

---

### T12: Abaixar

**What**: Criar a classe `Duck` (320 ms ativo, recarga de 450 ms desde o início, um `registerEvade` por abaixar).
**Where**: `src/core/duck.ts`
**Depends on**: T11
**Reuses**: o padrão de relógio do `Dodge`
**Requirement**: DEF-07, DEF-12, DEF-15, EDG-06
**Done when**:
- [ ] `active` é `true` em 319 ms e `false` em 320 ms.
- [ ] `cooldownMs` vale 450 no início, 1 em 449 ms e 0 em 450 ms.
- [ ] `registerEvade()` devolve `true` uma vez por abaixar e `false` fora dele; um novo `start()` libera de novo.
- [ ] `reset()` deixa inativo e sem recarga.
**Tests**: unit
**Gate**: quick

---

### T13: Janela de Contra

**What**: Criar a classe `CounterWindow` do design (seção 5).
**Where**: `src/core/counter.ts`
**Depends on**: T12
**Reuses**: `COUNTER`
**Requirement**: CNT-01, CNT-02, CNT-03, CNT-04, CNT-06, CNT-07, CNT-13, CNT-20
**Done when**:
- [ ] Aberta com 450 ms: `isOpen` em 449 ms e fechada em 450 ms; idem 899 e 900 ms.
- [ ] `take(true)` com aperto devolve o `kind` e fecha; uma segunda chamada devolve `null`.
- [ ] `buffer()` seguido de `take(false)` devolve `null` e mantém o aperto; o `take(true)` seguinte devolve o `kind`; se a janela fecha antes, devolve `null` e o aperto guardado some.
- [ ] `open` com a janela aberta troca `kind` e tempo pelos novos.
- [ ] O tempo só anda em `update(dt)`: sem `update`, `remainingMs` não muda.
**Tests**: unit
**Gate**: quick

---

### T14: Máquina de golpes com Contra, fim do `active` e recuperação de quem erra

**What**: Acrescentar `MoveMachine.startCounter(name)`, `endActive()` e a `recovery` de `whiffRecoveryMs` com o evento `whiff`.
**Where**: `src/core/moveMachine.ts`
**Depends on**: T13
**Reuses**: `startMove`, `hitLanded`
**Requirement**: CNT-05, CNT-08, VOA-04, VOA-07, VOA-08, VOA-09
**Done when**:
- [ ] `startCounter('contra')` sem golpe em curso emite `moveStart` do `contra`; com golpe em curso não faz nada.
- [ ] `endActive()` em `active` emite `hitboxOff` e a `recovery` dura `recoveryMs`; fora de `active` não faz nada.
- [ ] Voadora sem `hitLanded`: `recovery` de 460 ms (ainda em golpe em 459 ms) e exatamente um evento `whiff`; com `hitLanded`: 160 ms e nenhum `whiff`.
- [ ] Golpe sem `whiffRecoveryMs` que erra mantém a `recovery` normal e não emite `whiff`.
- [ ] `press` sem contexto de Contra continua dando `jab` (CNT-08).
**Tests**: unit
**Gate**: quick

---

### T15: Invulnerabilidade de 300 ms

**What**: `PLAYER_HEALTH.invulnMs` passa de 700 para 300.
**Where**: `src/data/tuning.ts`
**Depends on**: T14
**Reuses**: `Health`
**Requirement**: PST-15
**Done when**:
- [ ] Teste com `PLAYER_HEALTH`: golpe em 299 ms depois do primeiro é `ignored`; em 300 ms é aceito.
- [ ] Nenhum teste fixa mais 700 ms (AC substituído: HP-02).
**Tests**: unit
**Gate**: quick

---

### T16: Marcador de telegrafo

**What**: Criar a folha do marcador com os frames `white` (`!` em `w`), `red` (`×` em `t`) e `low` (`▼` em `A`), contorno `k`, 7×7 texels; registrar como `TEX.fxTelegraph` em `createArt`.
**Where**: `src/game/art/sprites/telegraph.ts`
**Depends on**: T15
**Reuses**: `parseSheet`, `registerSheet`
**Requirement**: HGT-09
**Done when**:
- [ ] `TEX.fxTelegraph` existe e `createArt` registra a folha.
- [ ] Teste: 3 frames do mesmo tamanho, paleta válida, e o conjunto de texels opacos difere em cada par de frames.
- [ ] Teste: cada frame usa a cor do seu tipo (`KIND_COLOR`) além do `k`.
**Tests**: unit
**Gate**: quick

---

### T17: Roteamento de contatos com fila adiada

**What**: Criar `routeContacts(pairs)` e `deferContact(fn)`: roteia todos os pares do evento e só depois roda as funções adiadas, na ordem em que foram registradas; a cena passa a usar `routeContacts`.
**Where**: `src/game/bodyTags.ts`
**Depends on**: None
**Reuses**: `routeContact`
**Requirement**: TGT-04
**Done when**:
- [ ] Teste: com 3 pares, as funções adiadas rodam depois do 3º `onTouch`, uma vez cada, e a fila esvazia.
- [ ] Uma função adiada registrada durante a fila também roda no mesmo `routeContacts`.
- [ ] `TestScene.listenForContacts` chama `routeContacts(event.pairs)`.
**Tests**: unit
**Gate**: quick

---

### T18: Hitbox do jogador com limite de alvos

**What**: `Hittable.receiveHit(hit, report?)`; `AttackHitbox.open(..., maxTargets?)` usa `TargetGate`, junta os toques e decide os alvos na fila adiada, em ordem de `orderTargets`; `Player.openHitbox` passa `move.maxTargets`.
**Where**: `src/game/hitbox.ts`
**Depends on**: T17
**Reuses**: `TargetGate`, `orderTargets`, `deferContact`
**Requirement**: TGT-03, TGT-04, TGT-05, TGT-06
**Done when**:
- [ ] Sem `maxTargets` (inimigo, chefe) o comportamento é o de hoje.
- [ ] Com `maxTargets`, a distância usada é `|x do alvo (hurtRect) − x do dono|` e o desfecho de cada alvo vai para `gate.note` (`blocked` lido do `report`).
- [ ] `npm run build` passa.
**Tests**: none
**Gate**: build

---

### T19: Inimigo com tipo de golpe, marcador, flash e sequência

**What**: O `Enemy` lê `tuning.attack.kind`, mostra o marcador em `windup` e `attack`, pisca no evento `commit`, e abre cada golpe com `hitFieldsFor(kind)` e `string: { id, index, length }`.
**Where**: `src/game/Enemy.ts`
**Depends on**: T18
**Reuses**: `BodyRenderPos`, `HIT_FLASH_MS`, `AttackHitbox.open` (portão novo a cada abertura)
**Requirement**: HGT-04, HGT-05, HGT-06, HGT-07, HGT-08, CMT-01, CMT-02, DFL-05, DFL-15
**Done when**:
- [ ] Getters para o snapshot: `telegraph` (frame do marcador se visível, senão `null`), `committed`, `commitFlash` (chave da paleta enquanto o flash dura), `attackView` (`kind`, `index`, `length`).
- [ ] O marcador segue `drawPos`, some em ragdoll e é destruído no `cleanup`.
- [ ] O id da sequência muda a cada `windupStart`.
- [ ] `npm run build` passa.
**Tests**: none
**Gate**: build

---

### T20: Inimigo recebendo golpe: armadura, cambaleio, foco e parry

**What**: `Enemy.receiveHit(hit, report?)` passa `{ committed }` ao cérebro, trata `armored` (sem interromper a IA) e `stagger` (pose `impact` e impulso), tira `knockdown` do golpe em inimigo quebrado, avisa o bloqueio no `report`; `update` recebe `focus` e escolhe a taxa de queda; `parried(info)` segue o design.
**Where**: `src/game/Enemy.ts`
**Depends on**: T19
**Reuses**: `EnemyBrain`, `Structure.update(dt, rate)`, `playHitReaction`
**Requirement**: CMT-03, CMT-04, CMT-05, CMT-06, CMT-07, CMT-08, CMT-09, PST-02, PST-14, PST-16, DFL-07, DFL-08, DFL-09, DFL-11, EDG-05, EDG-11, TGT-06
**Done when**:
- [ ] Eventos `armored:<id>` e `stagger:<id>` saem por `onEvent`.
- [ ] `parried({ final: false })` só soma os 35; `{ final: true, deflect: false }` para 400 ms; `{ deflect: true }` chama `forceStagger(COUNTER.deflectStaggerMs)`.
- [ ] `EnemyGateInput` vira `EnemyFrameInput` com `focus`; a cena passa `focus: false` por enquanto.
- [ ] Getter `downHits` para o snapshot.
- [ ] `npm run build` passa.
**Tests**: none
**Gate**: build

---

### T21: Inimigo que lê a repetição, bloqueia e empurra

**What**: Trocar `onPlayerLightMove` por `onPlayerMove(player, move, round, { repeats, override })` com a elegibilidade do Glossário, `guardChance` e `tryRaise`; guarda de leitura chama `brain.recover()` e emite `read:<id>`; depois de golpe leve aceito, `LightStreak` e `shoveRoll` com `onShove`.
**Where**: `src/game/Enemy.ts`
**Depends on**: T20
**Reuses**: `guardChance`, `baseConditionsHold`, `readingBonus`, `LightStreak`, `shoveRoll`
**Requirement**: RDG-03, RDG-05, RDG-09, RDG-16, RDG-17, RDG-18, RDG-22, CMT-10
**Done when**:
- [ ] Alcance da leitura: `READING.rangePx + (move.travel?.forwardPx ?? 0)`.
- [ ] Comprometido, em `attack`, em ragdoll, quebrado, levantando ou morto: não sorteia.
- [ ] `EnemyGuard.onPlayerLightMove` sai; os casos de teste dele vivem em `baseConditionsHold` (T7).
- [ ] Getters `lightStreak` e `guardRead`; `shoveChance` vem da cena (padrão `READING.shoveChance`).
- [ ] A cena chama `onPlayerMove` para todo golpe do grafo que não é `counter`, com `repeats` 0 por enquanto.
- [ ] `npm run build` passa.
**Tests**: none
**Gate**: build

---

### T22: Objeto: 2 alvos no balanço e arremesso que derruba

**What**: O portão do `PropMachine` passa a ter teto 2 no balanço (sem teto no arremesso); `propHit` do arremesso leva `knockdown: true`; o `Prop` passa o `report`, anota o desfecho e entrega o alvo no `onConnect`.
**Where**: `src/core/props.ts`
**Depends on**: T21
**Reuses**: `TargetGate`, `propHit`
**Requirement**: TGT-07, PST-07, PST-08
**Done when**:
- [ ] Teste: no balanço o 3º alvo é recusado; um alvo `refused` não gasta vaga; no arremesso não há teto.
- [ ] Teste: `propHit` com estado `thrown` tem `knockdown: true`; com `swing`, não.
- [ ] `src/game/Prop.ts` usa a API nova e o `onConnect` recebe o alvo como 3º argumento.
**Tests**: unit
**Gate**: quick

---

### T23: Golpes de técnica marcados

**What**: Todo `Hit` criado no `TechRunner` ganha `tech: true`; os `heavy`, também `knockdown: true`.
**Where**: `src/game/TechRunner.ts`
**Depends on**: T22
**Reuses**: os pontos de criação de `Hit` (linhas com `strength:`)
**Requirement**: PST-09, GND-04, GND-07
**Done when**:
- [ ] Um ajudante local monta as marcas, usado em todos os pontos que criam `Hit`.
- [ ] `npm run build` passa.
**Tests**: none
**Gate**: build

---

### T24: Altura dos golpes do chefe

**What**: Projétil da rajada com `height: 'high'`, onda de choque com `height: 'low'`; investida e pouso continuam sem `height`.
**Where**: `src/game/Projectile.ts`
**Depends on**: T23
**Reuses**: o `Hit` montado no construtor
**Requirement**: HGT-10, HGT-11, HGT-12
**Done when**:
- [ ] `height` sai do `kind` do projétil; `src/game/Boss.ts` não ganha `height` (comentário de uma linha dizendo por quê).
- [ ] `npm run build` passa.
**Tests**: none
**Gate**: build

---

### T25: Jogador recebendo golpe pela tabela nova

**What**: `Player.receiveHit` monta o `IncomingHit` completo e trata os desfechos `ducked`, `jumped`, `countered`, parry com Deflexão e esquiva perfeita: eventos, postura −10, abertura da janela de Contra e `attacker.parried(info)`.
**Where**: `src/game/Player.ts`
**Depends on**: None
**Reuses**: `resolveIncomingHit`, `DeflectTracker`, `CounterWindow`, `Duck`, `Structure.reduce`
**Requirement**: DEF-01, DEF-02, DEF-03, DEF-11, DEF-12, DEF-13, DEF-14, DEF-17, DEF-18, DEF-19, DEF-20, CNT-01, CNT-02, CNT-03, CNT-04, CNT-13, DFL-10, DFL-12, DFL-16
**Done when**:
- [ ] `airborne` = sem chão sob os pés ou subindo, lido na hora do golpe.
- [ ] Eventos `duckEvade`, `jumpEvade` e `deflect` saem por `onEvent`; `onDefense` ganha `duckEvade`, `jumpEvade` e `deflect`.
- [ ] `Attacker.parried(info: ParryInfo)`; a cena repassa ao inimigo e o chefe ignora o argumento.
- [ ] `counterView` (`open`, `kind`, `remainingMs`) e `duckView` para o snapshot; `CounterWindow.update` e `Duck.update` rodam no `update` do jogador; `resetDefense` fecha os dois e zera o `DeflectTracker`.
- [ ] `npm run build` passa.
**Tests**: none
**Gate**: build

---

### T26: Jogador que abaixa e vira na guarda

**What**: `S`+`Q` no chão inicia o `Duck` (frame `duck`, parado, sem guarda nem golpe); a recarga de `Q` é o maior entre esquiva e abaixar; com a guarda de pé o jogador vira e não anda.
**Where**: `src/game/Player.ts`
**Depends on**: T25
**Reuses**: `tryDodge`, `stepMovement`, `DEFENSE.guardSpeedFactor`
**Requirement**: DEF-04, DEF-05, DEF-07, DEF-08, DEF-09, DEF-10, DEF-15, DEF-16, DEF-22, EDG-06
**Done when**:
- [ ] Evento `duck` no início; abaixado, o movimento fica travado como na esquiva e a velocidade horizontal é 0.
- [ ] `dodgeView.cooldownMs` mostra o maior dos dois relógios.
- [ ] No ar, `S`+`Q` não inicia nada.
- [ ] `npm run build` passa.
**Tests**: none
**Gate**: build

---

### T27: Jogador que dá o Contra

**What**: Com a janela aberta e de mãos vazias, `J` ou `K` no chão chama `startCounter`; durante esquiva ou abaixar o aperto fica guardado; o Contra em `startup` ou `active` liga `counterInvulnerable`.
**Where**: `src/game/Player.ts`
**Depends on**: T26
**Reuses**: `CounterWindow.take` e `buffer`, `MoveMachine.startCounter`
**Requirement**: CNT-05, CNT-06, CNT-07, CNT-08, CNT-11, CNT-12, CNT-16, CNT-18, CNT-19, EDG-07
**Done when**:
- [ ] A direção segurada é ignorada com a janela aberta (CNT-18); no ar sai o golpe aéreo (CNT-19); com objeto na mão sai o balanço (CNT-16).
- [ ] O `Hit` do Contra leva `counter: true`, `unblockable: true` e o `knockdown` do `MoveDef` (ausente).
- [ ] Morte fecha a janela (EDG-07).
- [ ] `npm run build` passa.
**Tests**: none
**Gate**: build

---

### T28: Voadora com custo e quique; jogador empurrado

**What**: No `moveStart` com `postureCost` a postura sobe; `hitLanded` de golpe com `bounce` chama `endActive`, recua e sobe; o evento `whiff` vira `whiff:voadora`; `shoved(dir)` cancela o golpe, desloca 48 px em 150 ms e ignora o input por 300 ms.
**Where**: `src/game/Player.ts`
**Depends on**: T27
**Reuses**: `scriptedDx`, `onGuardBreak`, `applyBlockPush` como modelo do deslocamento
**Requirement**: VOA-01, VOA-02, VOA-03, VOA-04, VOA-05, VOA-06, VOA-07, VOA-08, VOA-09, RDG-19, RDG-20, RDG-21, EDG-10
**Done when**:
- [ ] O `Hit` de todo golpe do grafo leva o `knockdown` do `MoveDef`.
- [ ] O recuo do quique e o do empurrão saem inteiros (36 e 48 px), no mesmo padrão de `scriptedDx`.
- [ ] `npm run build` passa.
**Tests**: none
**Gate**: build

---

### T29: Cena: tipo e sequência no spawn, leitura, foco e debug

**What**: No spawn, resolver `kind` (`parseAttackKind(enemyAttack) ?? attackKindFor`) e `hits` (`parseStringLength(enemyString)`), passar `shoveChance` (`shove=N`); `onPlayerMoveStart` com `MoveReading`; `focusId` no acerto corpo a corpo, de objeto e no finalizador; finalizador e tecla 2 com `knockdown: true`; `onShove` chama `player.shoved`; `startRun` zera leitura e foco.
**Where**: `src/scenes/TestScene.ts`
**Depends on**: T28
**Reuses**: `debugParam`, `spawnFromCommand`, `updateEnemies`, `onConnect`, `tryFinisher`, `debugHit`
**Requirement**: HGT-13, DFL-14, RDG-01, RDG-10, RDG-11, RDG-12, RDG-23, PST-06, PST-12, PST-13, EDG-01, EDG-02, EDG-03, EDG-04, EDG-08, EDG-09
**Done when**:
- [ ] `updateEnemies` passa `focus: e.id === this.focusId`.
- [ ] `enemyGuard=N` chega como override ao `onPlayerMove`.
- [ ] Golpe `counter` e o finalizador não chamam `reading.note` nem `onPlayerMove`.
- [ ] `npm run build` passa.
**Tests**: none
**Gate**: build

---

### T30: Cena: aviso do Contra e da Deflexão, painel de controles

**What**: `onDefense` solta os textos flutuantes `CONTRA` (parry, esquiva perfeita, abaixar) e `DEFLEXÃO`; a camada `counter.ready` fica viva com a janela aberta; `controlsLines` ganha `S+Q abaixar`.
**Where**: `src/scenes/TestScene.ts`
**Depends on**: T29
**Reuses**: `FloatTexts.spawn`, `realtimeFx.add`, `controlsLines`
**Requirement**: CNT-14, CNT-15, DFL-13, DEF-21
**Done when**:
- [ ] Os textos nascem a menos de 40 px do centro do jogador, com cor da paleta.
- [ ] Na Deflexão sai só `DEFLEXÃO` (não os dois textos).
- [ ] `npm run build` passa.
**Tests**: none
**Gate**: build

---

### T31: Snapshot de debug com o contrato da spec

**What**: Acrescentar ao `GameSnapshot` e ao `debugSnapshot` da cena os campos da seção "Snapshot de debug" da spec.
**Where**: `src/game/debugApi.ts`
**Depends on**: T30
**Reuses**: getters criados nas tasks T19 a T28
**Requirement**: HGT-07, HGT-08, CMT-01, CMT-02, DFL-15, GND-05, PST-13, RDG-01, RDG-13
**Done when**:
- [ ] `player.duck`, `player.counter`, `player.invulnerable`; `enemies[].telegraph`, `committed`, `commitFlash`, `attack`, `downHits`, `lightStreak`, `guardRead`; `focusId`; `reading`.
- [ ] `telegraph` e `commitFlash` são lidos do sprite desenhado (L-055).
- [ ] `tests/game/debugApi.test.ts` continua passando; `npm run build` passa.
**Tests**: none
**Gate**: build

---

### T32: Kit dos smokes com as regras novas

**What**: `makeKit.boot` acrescenta `shove=0` quando a query não traz `shove`; ajudantes `waitFor(pred, maxFrames)`, `waitCommit()` (até o inimigo mais perto ficar `committed`) e `faceEnemy()`.
**Where**: `scripts/smoke/fight-kit.mjs`
**Depends on**: None
**Reuses**: `snap`, `frame`, `nearest`
**Requirement**: CMT-01
**Done when**:
- [ ] Os smokes que já usam o kit continuam carregando (`npm run smoke -- fight` roda até o primeiro assert de regra).
**Tests**: none
**Gate**: build

---

### T33: Suíte antiga ajustada às regras substituídas

**What**: Rodar os 30 smokes e ajustar só o que a tabela "ACs antigos substituídos" cobre (ragdoll no golpe forte, parry de costas, guarda andando, 700 ms, ciclo da faca); smokes fora do kit que batem em inimigo comum recebem `shove=0`.
**Where**: `scripts/smoke/`
**Depends on**: T32
**Reuses**: tecla 2 do debug (continua derrubando), `enemyGuard=0`
**Requirement**: PST-09, PST-12, DFL-01
**Done when**:
- [ ] `npm run smoke` passa inteiro (os intermitentes conhecidos, repetidos isolados, passam).
- [ ] Cada assert alterado tem, no commit, o AC antigo e o AC novo; nenhum assert de comportamento não substituído foi removido.
- [ ] `techniques.smoke.mjs` continua vendo `ragdollStun` no golpe forte de técnica (PST-09).
**Tests**: smoke
**Gate**: full

---

### T34: Smoke do telegrafo e do ponto de compromisso

**What**: Novo smoke cobrindo marcador por tipo, flash, compromisso e armadura.
**Where**: `scripts/smoke/telegraph.smoke.mjs`
**Depends on**: T33
**Reuses**: `makeKit`, `enemyAttack=`, `enemyVariant=`, `armed=club`
**Requirement**: HGT-07, HGT-08, HGT-13, EDG-08, CMT-01, CMT-02, CMT-03, CMT-04, CMT-05, CMT-06, CMT-07, CMT-08, CMT-10, HGT-01, HGT-02, HGT-03
**Done when**:
- [ ] Marcador: `telegraph` vale o tipo em todo frame de `windup` e `attack` e `null` nos outros estados; `rastejante` dá `low`, `armed=club` dá `red`, `corcunda` dá `white`; `enemyAttack=red` manda; valor inválido é ignorado.
- [ ] `committed` vira `true` com 200 ms ou menos de preparo e `commitFlash` mostra `w`, `t` e `A` por 80 ms (±1 frame).
- [ ] `jab` antes do compromisso: a garra não sai. `jab` depois: tira 6 de vida, `armored:<id>` uma vez, a hitbox abre no mesmo frame previsto e o jogador leva o golpe.
- [ ] `rasteira` depois do compromisso: `ragdollStun` e nenhum golpe. Postura cheia depois do compromisso: quebrado e nenhum golpe.
- [ ] Comprometido não levanta guarda com `enemyGuard=1`.
**Tests**: smoke
**Gate**: full

---

### T35: Smoke dos alvos, do cambaleio e do chão

**What**: Novo smoke cobrindo `maxTargets`, `stagger`, queda, limite do chão e foco.
**Where**: `scripts/smoke/targets.smoke.mjs`
**Depends on**: T34
**Reuses**: `makeKit`, `maxAlive=3`, objetos do mapa
**Requirement**: TGT-03, TGT-04, TGT-05, TGT-06, TGT-07, PST-01, PST-02, PST-03, PST-05, PST-06, PST-07, PST-08, PST-10, PST-11, PST-13, PST-14, PST-16, GND-01, GND-02, GND-03, GND-05, GND-06, EDG-11
**Done when**:
- [ ] 3 inimigos ao alcance: `jab` tira vida de 1 (o mais perto) e `chuteFrontal` de exatamente 2 (os 2 mais perto).
- [ ] Com `enemyGuard=1`, um `jab` segurado pela guarda não acerta mais ninguém; um alvo levantando não gasta a vaga.
- [ ] `chuteFrontal`: `stagger` por 380 ms (±1 frame), `ragdollVisible` `null`; `rasteira`: `ragdollStun`.
- [ ] Objeto balançado: `stagger` e no máximo 2 alvos; objeto arremessado: `ragdollStun`; finalizador num quebrado: `ragdollStun`; `rasteira` num quebrado: continua de pé.
- [ ] No chão: 1º `socoBaixo` tira 6 e `downHits` vai a 1 sem aumentar o tempo no chão; o 2º não tira nada; levantando, nada entra; nova queda zera `downHits`.
- [ ] `focusId` segue o último alvo acertado; a postura do alvo fora do foco cai 40/s e a do foco 10/s, medidas em 1 s depois do atraso (±3).
**Tests**: smoke
**Gate**: full

---

### T36: Smoke da tabela de defesa

**What**: Novo smoke cobrindo parry só de frente, virar, abaixar, pular, postura e invulnerabilidade.
**Where**: `scripts/smoke/defense-table.smoke.mjs`
**Depends on**: T35
**Reuses**: `makeKit`, `waitCommit`, `enemyAttack=`
**Requirement**: DEF-01, DEF-02, DEF-03, DEF-04, DEF-05, DEF-06, DEF-07, DEF-08, DEF-09, DEF-10, DEF-11, DEF-12, DEF-13, DEF-14, DEF-15, DEF-16, DEF-17, DEF-18, DEF-19, DEF-20, DEF-21, DEF-22, PST-15, HGT-04, HGT-05, HGT-06, EDG-06
**Done when**:
- [ ] Parry de costas: o jogador perde o dano inteiro. `U` + trás no mesmo frame: `parry`.
- [ ] `red`: parry e guarda levam o dano inteiro; abaixar leva 0, um `duckEvade` e a postura cai 10 (partindo de 15 de um bloqueio).
- [ ] `low`: guarda leva o dano inteiro; pulo leva 0 e um `jumpEvade`; abaixado leva o dano inteiro.
- [ ] `white`: guarda bloqueia (0 de dano) e abaixar evita.
- [ ] Abaixar: `duck.active` por 320 ms (±1 frame), frame `duck`, x parado, recarga de 450 ms dividida com a esquiva; golpe `high` depois do fim acerta; `S`+`Q` no ar não faz nada; `S`+`D`+`Q` abaixa.
- [ ] Guarda: `U`+`D` vira para a direita e o jogador anda menos de 4 px em 500 ms.
- [ ] Esquiva perfeita: a postura cai 10.
- [ ] Depois de um golpe cheio, outro golpe em menos de 300 ms não tira vida e depois de 300 ms tira.
- [ ] O painel de controles contém `S+Q` e `abaixar`.
**Tests**: smoke
**Gate**: full

---

### T37: Smoke do Contra e da Deflexão

**What**: Novo smoke cobrindo a janela de Contra, os dois golpes, a sequência do inimigo e a Deflexão.
**Where**: `scripts/smoke/counter.smoke.mjs`
**Depends on**: None
**Reuses**: `makeKit`, `waitCommit`, `enemyString=`, `armed=knife`
**Requirement**: CNT-01, CNT-02, CNT-03, CNT-04, CNT-05, CNT-06, CNT-07, CNT-08, CNT-11, CNT-12, CNT-13, CNT-14, CNT-15, CNT-16, CNT-18, CNT-19, CNT-20, CNT-21, CMT-09, DFL-01, DFL-02, DFL-03, DFL-04, DFL-05, DFL-06, DFL-07, DFL-08, DFL-09, DFL-10, DFL-11, DFL-12, DFL-13, DFL-14, DFL-15, DFL-16, EDG-05, EDG-07, EDG-09
**Done when**:
- [ ] Parry abre `counter` com `kind` `contra` por 450 ms de jogo (não diminui no hitstop), camada `counter.ready` e texto `CONTRA`; `J` dá `contra`, a janela fecha, o inimigo entra em `stagger` e ganha 35 + 30 de postura.
- [ ] `K` e `S`+`J` também dão `contra`; depois da janela, `J` dá `jab`; no ar dá `socoAereo`; com objeto na mão balança o objeto.
- [ ] Abaixar que evita abre `contraGancho`; esquiva perfeita abre `contra`, e o `J` apertado durante o dash dispara no primeiro frame livre.
- [ ] Durante o `startup` e o `active` do Contra, a garra de outro inimigo não tira vida nem cancela o golpe.
- [ ] Contra num inimigo comprometido: `stagger` e a garra não sai.
- [ ] `armed=knife`: `attack.length` 2, 2ª hitbox 300 ms depois do fim da 1ª, IA em `windup` no intervalo, `rest` só no fim, os dois golpes acertam um jogador parado sem defesa (respeitando a invulnerabilidade).
- [ ] `enemyString=3`: parry nos 3 dá um `deflect`, `stagger` de 900 ms, janela de 900 ms e texto `DEFLEXÃO`; parry só nos 2 últimos não dá `deflect`; `enemyString=1` nunca dá; parry no 1º golpe soma 35 e o 2º golpe sai no tempo previsto.
- [ ] Inimigo derrubado no meio da sequência não dá o golpe seguinte; morte do jogador fecha a janela; `enemyString=9` é ignorado.
**Tests**: smoke
**Gate**: full

---

### T38: Smoke da voadora e da leitura

**What**: Novo smoke cobrindo custo, quique e erro da voadora, leitura de repetição, guarda de leitura e empurrão.
**Where**: `scripts/smoke/voadora-reading.smoke.mjs`
**Depends on**: T37
**Reuses**: `makeKit`, `shove=`, `maxAlive=4`
**Requirement**: VOA-01, VOA-02, VOA-03, VOA-04, VOA-05, VOA-06, VOA-07, VOA-08, VOA-09, EDG-10, RDG-01, RDG-03, RDG-04, RDG-05, RDG-06, RDG-07, RDG-08, RDG-09, RDG-10, RDG-11, RDG-12, RDG-13, RDG-14, RDG-15, RDG-16, RDG-17, RDG-18, RDG-19, RDG-20, RDG-21, RDG-22, RDG-23, EDG-01, EDG-02, EDG-03, EDG-04, TGT-03
**Done when**:
- [ ] Voadora: postura +15 no início; acerta 1 alvo entre vários; ao acertar a fase `active` acaba, o jogador recua 36 px (±4) e `vy` vale −240; `recovery` de 160 ms. Errando: `whiff:voadora` uma vez e 460 ms sem novo golpe. 7 voadoras seguidas sem deixar a postura cair: `guardBreak:player` e `player.move` `null`.
- [ ] Sem `enemyGuard`: 5 `chuteFrontal` em 3 s; no 5º, `reading.repeats` é 4, sai `read:<id>`, o chute tira 0 de vida, soma 8 de postura e a guarda termina; o inimigo estava em `stagger` e voltou a `idle`.
- [ ] Voadora bloqueada pela guarda de leitura conta como erro (460 ms).
- [ ] Com `enemyGuard=0` a leitura não levanta guarda; o Contra e o finalizador não mudam `reading`.
- [ ] `shove=1`: o 4º `socoBaixo` seguido empurra; `shove:<id>` uma vez, `lightStreak` 0, jogador a 48 px (±4) mais longe, sem perder vida, `player.move` `null` e `J` ignorado por 300 ms; o inimigo fica `idle`. `shove=0`: nunca empurra. Um `chuteFrontal` no meio zera `lightStreak`; mais de 1500 ms entre leves volta a 1.
- [ ] 10 s de voadora seguida contra 4 inimigos: nenhum inimigo vivo em ragdoll, `read:<id>` aparece e o jogador perde vida.
- [ ] Run nova: `counter.open` `false`, `duck.active` `false`, `reading.move` `null`, `focusId` `null`.
**Tests**: smoke
**Gate**: full

---

### T39: Smoke da altura dos golpes do chefe

**What**: Novo smoke: onda de choque é pulável e não aparável; projétil é abaixável e aparável de frente; investida não é abaixável.
**Where**: `scripts/smoke/boss-heights.smoke.mjs`
**Depends on**: T38
**Reuses**: `round=5`, `round=15`, padrões de `boss.smoke.mjs`
**Requirement**: HGT-10, HGT-11, HGT-12, DEF-02, DEF-14
**Done when**:
- [ ] Onda de choque com o jogador no ar: 0 de dano e `jumpEvade`; com parry no chão: dano inteiro.
- [ ] Projétil com o jogador abaixado: 0 de dano e `duckEvade`.
- [ ] Investida com o jogador abaixado: dano inteiro.
**Tests**: smoke
**Gate**: full

---

### T40: Smoke dos dois bots

**What**: Novo smoke com seed fixa: um bot que só alterna `J` e `K` e um bot que apara no compromisso e dá o Contra, 30 s cada, contra 2 inimigos `white`.
**Where**: `scripts/smoke/bots.smoke.mjs`
**Depends on**: T39
**Reuses**: `makeKit`, `waitCommit`
**Requirement**: CMT-05, CNT-05
**Done when**:
- [ ] O bot de botão perde mais vida do que o bot de parry (medida: vida perdida até 30 s ou até morrer).
- [ ] O smoke passa 3 vezes seguidas.
**Tests**: smoke
**Gate**: full

---

### T41: README com os controles e o debug novos

**What**: Atualizar a tabela de controles (abaixar, virar, Contra), a de parâmetros de debug (`enemyAttack`, `enemyString`, `shove`) e o trecho "Onde ajustar o feel".
**Where**: `README.md`
**Depends on**: T40
**Reuses**: texto atual
**Requirement**: DEF-21
**Done when**:
- [ ] Controles e parâmetros batem com o código.
- [ ] `npm run build && npm test && npm run smoke` passa inteiro.
**Tests**: none
**Gate**: full

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6

Phase 1:  T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8
Phase 2:  T9 → T10 → T11 → T12 → T13 → T14 → T15 → T16
Phase 3:  T17 → T18 → T19 → T20 → T21 → T22 → T23 → T24
Phase 4:  T25 → T26 → T27 → T28 → T29 → T30 → T31
Phase 5:  T32 → T33 → T34 → T35 → T36
Phase 6:  T37 → T38 → T39 → T40 → T41
```

Um worker por fase (41 tasks, 6 lotes), em sequência.

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 a T8, T11 a T15 | 1 módulo puro cada | ✅ |
| T9, T16 | 1 folha de arte cada | ✅ |
| T10 | 1 arquivo de dados | ✅ |
| T17, T18, T22, T23, T24 | 1 adaptador cada | ✅ |
| T19, T20, T21 | `Enemy.ts`, uma responsabilidade por task | ✅ |
| T25 a T28 | `Player.ts`, uma responsabilidade por task | ✅ |
| T29, T30, T31 | cena e snapshot, um trecho por task | ✅ |
| T32, T34 a T40 | 1 arquivo de smoke cada | ✅ |
| T33 | ajuste da suíte antiga, só asserts de ACs substituídos | ⚠️ vários arquivos, uma regra |
| T41 | 1 documento | ✅ |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1, T9, T17, T25, T32, T37 | None | início de fase | ✅ |
| T2 a T8 | task anterior | T1 → … → T8 | ✅ |
| T10 a T16 | task anterior | T9 → … → T16 | ✅ |
| T18 a T24 | task anterior | T17 → … → T24 | ✅ |
| T26 a T31 | task anterior | T25 → … → T31 | ✅ |
| T33 a T36 | task anterior | T32 → … → T36 | ✅ |
| T38 a T41 | task anterior | T37 → … → T41 | ✅ |

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 a T8, T10 a T15, T22 | Lógica pura | unit | unit | ✅ |
| T9, T16 | Arte | unit | unit | ✅ |
| T17 | Roteamento de contato | unit | unit | ✅ |
| T18 a T21, T23 a T31 | Adaptadores Phaser | smoke (fases 5 e 6) | none | ✅ (todo AC deles está na lista de uma task de smoke, L-040) |
| T32 | Apoio de smoke | none | none | ✅ |
| T33 a T40 | Smokes | smoke | smoke | ✅ |
| T41 | Documentação | none | none | ✅ |
