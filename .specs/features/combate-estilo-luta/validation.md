## Validation: combate-estilo-luta - FAIL

**Data**: 2026-10-01
**Spec**: `.specs/features/combate-estilo-luta/spec.md` (91 ACs)
**Faixa do diff**: `0fb3d0d..HEAD` (HEAD = `42ab7bf`, 31 commits, 55 arquivos, +6575/-114)
**Verifier**: sub-agente independente (autor != verificador), Sonnet 5.5
**Veredito**: FAIL. 80 dos 91 ACs têm evidência `arquivo:linha` com o valor da spec; 5 ACs não têm nenhuma evidência (zero) e 4 têm cobertura parcial; 3 mutantes de comportamento sobreviveram, todos nos mesmos ACs sem evidência. O código parece implementar tudo (os 5 zeros existem em `src/`), o que falta é teste/smoke que os prenda.

Convenções de citação: `M`=`tests/data/moves.test.ts`, `MM`=`tests/core/moveMachine.test.ts`, `MI`=`tests/core/motionInput.test.ts`, `D`=`tests/core/defense.test.ts`, `FI`=`tests/core/fightInput.test.ts`, `DO`=`tests/core/dodge.test.ts`, `ST`=`tests/core/structure.test.ts`, `CC`=`tests/core/comboCounter.test.ts`, `EG`=`tests/core/enemyGuard.test.ts`, `ART`=`tests/game/art.test.ts`, `F`=`scripts/smoke/fight.smoke.mjs`, `DS`=`scripts/smoke/defense.smoke.mjs`, `EGS`=`scripts/smoke/enemy-guard.smoke.mjs`. Todos os caminhos são relativos à raiz do repo.

---

## Gate

| Comando | Saída |
| --- | --- |
| `npm run build` (`tsc --noEmit && vite build`) | exit 0 |
| `npx vitest run` | exit 0: 66 arquivos, **1053 passed, 0 failed** (antes da feature: 865; +188) |
| `npm run smoke` (rodada 1) | 18 ok, **1 falha**: `kokusen.smoke.mjs` ("2º impacto comum deveria tirar 18 a mais", hp 48/60) |
| `kokusen.smoke.mjs` isolado, 3 execuções | 3/3 ok |
| `npm run smoke` (rodada 2, completa) | **19/19 ok** (inclui `heal`, `kokusen`, `defense`, `fight`, `enemy-guard`) |

Testes pulados: nenhum. Contagem de testes não diminuiu (865 -> 1053).

Falha intermitente do `kokusen.smoke.mjs`: não reproduzida em 3 execuções isoladas nem na rodada 2; a rodada 1 coincidiu com leitura de arquivos e criação do worktree do sensor. Não foi possível provar que é anterior à F7 (não rodei o commit `0fb3d0d` em repetição suficiente), então registro como **intermitência não atribuída**, a reavaliar se reaparecer. Não bloqueia o veredito (que já é FAIL por outro motivo).

### Notas de ambiente (confirmadas ou não)
- `tests/core/lightning.test.ts` estourar 5 s sob carga: não ocorreu nesta máquina (passou na rodada completa).
- `heal.smoke.mjs` HEAL-09 instável: não ocorreu nas duas rodadas.

---

## Task Completion

| Fase | Tasks | Status | Notas |
| --- | --- | --- | --- |
| 1 Núcleo puro | T1-T7 | Done | testes 1:1 com ACs; limites dos dois lados na maioria |
| 2 Arte | T8-T9 | Done | `ART:694-798` |
| 3 Jogo base | T10-T14 | Done | adaptadores sem teste unitário (por design, cobertos pela fase 5) |
| 4 Extras | T15-T18 + fix AD-011 | Done | idem |
| 5 Smokes | T19-T21 | Done | os `Requirement:` de T19-T21 **não listam** CTL-08, GRD-05, PAR-07, FIN-03, FIN-04, DOD-06, AIR-03, GRD-06: a matriz prometia "cobertas pela fase 5" e essas nunca entraram |

---

## Spec-Anchored Acceptance Criteria

Legenda: PASS = evidência com o valor da spec; PARCIAL = a regra pura tem valor correto mas a fiação no jogo (ou uma das condições da conjunção) não é lida em lugar nenhum; GAP = nenhuma evidência (zero).

### P1: Controles de luta

| ID | Evidência `arquivo:linha` + asserção | Valor da spec | Status |
| --- | --- | --- | --- |
| CTL-01 | `tests/core/fightInput.test.ts:6` `combineStrikePresses(true,false)` -> `{lightPressed:true,heavyPressed:false,bothPressed:false}` | leve apertado | PASS (leitura de tecla J/X em `input.ts` não testada, só a combinação pura) |
| CTL-02 | `FI:10` `combineStrikePresses(false,true)` -> `heavyPressed:true` | forte apertado | PASS (idem) |
| CTL-03 | `F:50-52` `s.hud.heldItem !== null && s.hud.heldItem.name.length > 0` após `tap('KeyE')`, jogador a <=36 px da cadeira (`F:50`) | segura o objeto | PASS |
| CTL-07 | `scripts/smoke/armed.smoke.mjs:202-209` `thrown.state === 'thrown'` após `E` segurando a faca; `F:53-54` `heldItem === null` | objeto sai em `thrown` | PASS |
| CTL-08 | nenhuma. `S`+`E` não é pressionado em nenhum teste ou smoke (`armed.smoke.mjs` larga com `E` sem `S`) | jogador solta o objeto | **GAP (zero)** |
| CTL-04 | `FI:14` `combineStrikePresses(true,true)` -> `{lightPressed:false,heavyPressed:false,bothPressed:true}` | um `both`, sem leve/forte separados | PASS |
| CTL-05 | leitura viva: `player.move` `F:32`; `player.guard` `DS:90`; `player.structure` `DS:150`; `player.dodge` `DS:120,265`; `enemies[].structure` `DS:195`; `enemies[].guarding` `EGS:32`; `combo` `EGS:142`; `timeScale` `DS:263`. `tests/game/debugApi.test.ts:35-65` só ecoa um objeto injetado (não conta) | 8 campos do contrato | PASS (campos lidos do snapshot vivo) |
| CTL-06 | `F:35-38` `s.hud.controls.split('\n').includes('J leve · K forte · U guarda/parry · Q esquiva · E pegar')` | texto exato | PASS |
| CTL-09 | `DS:149` `player.guard==='guard' && player.frame==='guard'`; `DS:197` `frame==='guard' && guard==='parry'` | frame `guard` em guard e parry | PASS |

### P1: Grafo de golpes

| ID | Evidência | Valor da spec | Status |
| --- | --- | --- | --- |
| MOV-01 | `M:7-18` nome=chave, damage>0, strength, force>0, startup/active/recovery>0, `hitbox`, `input.via`, `followUps` definidos; `M:22-24` follow-up aponta para golpe existente | campos exigidos em dados | PASS (hitbox/input só `toBeDefined`, AC é estrutural) |
| MOV-02 | `MM:28` (caso `light`,`{}`) `starts(m.press(...)).toEqual(['jab'])`; `F:58` `player.move==='jab'` | `jab` | PASS |
| MOV-03 | `MM:72` `starts(m.update(recoveryMs)).toEqual(['direto'])`; `MM:80` buffer; `MM:91-93` `at(259)`,`at(260)` -> `['direto']`, `at(261)` -> `['jab']`; `F:69-72` sem `null` entre jab e direto | encadeia até 260 ms depois da recovery, 261 não | PASS (limite dos dois lados) |
| MOV-04 | `M:41-43,47-49` follow-ups; `M:56-65` lista exata dos seis; `MM:111,124-126` sequências | seis follow-ups da spec | PASS |
| MOV-05 | `MM:28` caso 2 -> `chuteFrontal`; `F:78` | `chuteFrontal` | PASS |
| MOV-06 | `MM:28` caso 3 -> `socoBaixo`; `F:80` | `socoBaixo` | PASS |
| MOV-17 | `MM:28` caso 4 -> `rasteira`; `F:91` | `rasteira` | PASS |
| MOV-07 | `MM:28` caso 5 -> `ganchoAscendente`; `F:134` (mesmo frame e via AD-011); `FI:24` (100 ms ok), `FI:28` (101 ms não), `FI:32`, `FI:36` | `ganchoAscendente`; AD-011 100 ms | PASS |
| MOV-08 | `MM:28` caso 6 -> `chuteEmpurrao`; `F:152` | `chuteEmpurrao` | PASS |
| MOV-09 | `MM:146-151` solta com 400 -> `[]` e carregado só ao fim da recovery; `MM:168`, `MM:173`; `F:169` | carregado ao acabar o golpe | PASS |
| MOV-16 | `MM:155-160` solta com 399 -> `starts(...).toEqual([])` e `current` null | sem carregado antes de 400 | PASS |
| MOV-10 | `F:107-110` `Math.abs(downMs - 900) <= 40` (hitstop descontado), alvo vivo `F:107` | 900 ms derrubado | PASS (tolerância de 40 ms em medição por frames; ver gaps) |
| MOV-11 | `F:142` `baseY - minY >= 64` nas duas vias | sobe >= 64 px | PASS |
| MOV-12 | `M:86-90` `m.damage===damage && m.strength===strength` para os 13 golpes do chão | valores da lista | PASS |
| MOV-13 | `F:23-24` `count(s,'move:<nome>')===count(before,...)+1` e só um `move:*` novo | exatamente um `move:<nome>` | PASS |
| MOV-18 | `MM:37` null antes; `MM:39,41,43` nome em startup/active/recovery; `MM:45` null depois; `F:32` | nome / null | PASS |
| MOV-14 | `ART:714-725` `parseSheet(...,PALETTE_KEYS)`, `sheet.width/height===PLAYER_FRAME_W/H`, 13 golpes com `-wind/-hit/-recover`; `ART:751-768` aéreos e palma | frames 32x24 só com paleta | PASS |
| MOV-15 | só a metade da energia: `scripts/smoke/kokusen.smoke.mjs:210-212` `ce06 >= 3 && ce06 <= 3.2` (jab aplicado soma 3 de CE). `modifiers.meleeDamage` no caminho do golpe (`src/game/Player.ts:854`) não tem asserção em nenhum teste/smoke | dano via `meleeDamage` **e** +3 CE | **PARCIAL** (regra da conjunção: falta o dano por `meleeDamage`) |

### P1: Guarda

| ID | Evidência | Valor da spec | Status |
| --- | --- | --- | --- |
| GRD-01 | `D:15-19` segurando no chão -> `guard`, sem segurar -> `none`; `D:22-26` `canGuard=false` -> `none`; `DS:90-105` | `guard` (ou `parry`) | PASS |
| GRD-02 | `D:103-104` `r.damage===0`, `outcome==='block'`; `DS:147` hp igual | 0 de dano | PASS |
| GRD-07 | `DS:146,152` `count(block)===blocksBefore+1`, exatamente um | um `block` | PASS |
| GRD-06 | `D:120-123` `resolve(...damage:20).damage===5`, `10->3`, `18->5`; `tests/core/health.test.ts:180-198` `Health.chip(5)` -> hp 95 | `round(dano x 0.25)` | PARCIAL (regra pura e `chip` conferidos; nenhum golpe de chefe real é bloqueado em smoke) |
| GRD-03 | `D:109` `damage===12`, `outcome==='hit'`; `DS:178-179` `hpBack - hp === attackerDamage` e sem `block` | dano exato | PASS |
| GRD-04 | `D:127-129` `unblockable:true` -> dano 12 (comum e chefe), `outcome==='hit'` | guarda não reduz | PASS |
| GRD-05 | nenhuma. `DEFENSE.guardSpeedFactor` (`src/data/moves.ts:160`) lido em `Player.ts:347`, sem teste. Mutante M8 (0.4 -> 0.5) sobreviveu | 40% da velocidade | **GAP (zero)** |
| GRD-08 | `DS:148` `fx.layers.includes('guard.spark')` no frame do `block` | `guard.spark` | PASS |
| GRD-09 | `DS:153` `Math.abs(Math.abs(dx) - 8) <= 2` | 8 px (+-2) | PASS |

### P1: Parry

| ID | Evidência | Valor da spec | Status |
| --- | --- | --- | --- |
| PAR-01 | `D:54` 149 ms -> `parry`; `D:58` 150 ms -> `guard`; `DS:90,105` abre com o aperto; 300 ms depois do aperto anterior | janela de 150 ms | PASS (limite dos dois lados) |
| PAR-02 | `D:135-138` comum -> 0, `parry`; `D:141-143` chefe -> 0, `parry`; `DS:193` hp igual após o parry | 0 de dano | PASS |
| PAR-09 | `DS:191,200` `count(parry)===before+1`, exatamente um | um `parry` | PASS |
| PAR-03 | `DS:195` `target.structure.cur===35`; `ST:76-83` 35+35+35 -> 100; `DS:219` | +35, teto 100 | PASS (a constante `parryGain` não é lida pelos testes unitários, só pelo smoke; ver sensor M7) |
| PAR-10 | `DS:213-214` `Math.abs(idleFrames*FRAME_MS - 400) <= 50` e `moved` | 400 ms sem atacar nem andar | PASS (tolerância de 50 ms) |
| PAR-07 | nenhuma. `Boss.parried()` (`src/game/Boss.ts:166`) chama `receiveKokusen(0, DEFENSE.parryBossPoiseDamage)`; só se testa `receiveKokusen(45,135)` (`tests/core/bossBrain.test.ts:290-331`). Mutante M9 (30 -> 29) sobreviveu | postura -30, mínimo 0 | **GAP (zero)** |
| PAR-08 | `DS:199` `Math.abs(frozen*FRAME_MS - 80) <= 17` | hitstop 80 ms | PASS |
| PAR-04 | `D:81` 299 ms -> `guard`; `D:85` 300 ms -> `parry`; `DS:100` 200 ms -> todas `guard` | < 300 ms não abre | PASS (limite dos dois lados) |
| PAR-05 | `D:156-158` janela de 150 fechada, `Guard.state` -> `guard`, `damage===0`, `outcome==='block'` | 0 de dano | PASS (puro) |
| PAR-06 | `D:147-148` `playerStructureGain===0`; `DS:196` `player.structure.cur===0` | estrutura do jogador não sobe | PASS |
| PAR-11 | `DS:194` `fx.layers` inclui `parry.flash` e `parry.ring` | as duas camadas | PASS |

### P1: Esquiva

| ID | Evidência | Valor da spec | Status |
| --- | --- | --- | --- |
| DOD-01 | `DO:23,28,33,35` `Math.abs(travelled(d,200) -+ 96) <= 4`; `DO:38-46` ativo em 199 ms, acabou em 200; `DS:130-131` `Math.abs(dx - dir*96) <= 4` | 96 px (+-4) em 200 ms, direção segurada ou para trás | PASS |
| DOD-09 | `DS:120` `count(dodge)===before+1` | um `dodge` | PASS |
| DOD-02 | `DO:56-61` 0 e 179 invulnerável, 180 e 181 não; `D:176-178` `dodged`, dano 0 | 0 a 180 ms | PASS |
| DOD-03 | `DO:110-111` perfeita uma vez; `DO:120-121` 179 sim, 180 não; `DS:262,273` hp intacto e um `perfectDodge` | uma vez por esquiva | PASS |
| DOD-07 | `DO:181` `0.3`; `DO:185-190` 399 -> 0.3, 400 -> 1; `DS:263,271-272` `timeScale===0.3`, 400 +-40 ms, volta a 1 | 0.3 por 400 ms | PASS |
| DOD-08 | `DO:152-153` 999 e 1000 -> 15; `DO:157` 1001 -> 10; `DO:161-162` 7 -> 11, 9 -> 14; `DO:168-169` uma vez; `DS:282,287` jab 6 -> 9, direto 7 | x1.5 arredondado, uma vez, <= 1000 ms | PASS |
| DOD-04 | `DO:76` `started().cooldownMs===450` | 450 ms | PASS |
| DOD-10 | `DO:80` 449 ms -> `false`; `DO:84` 450 ms -> `true` | recarga > 0 não esquiva | PASS |
| DOD-05 | `DO:94` `start({grounded:false})===false` | no ar não esquiva | PASS (puro; passagem de `grounded` no `Player` não lida ao vivo) |
| DOD-06 | `MM:239-245` `canDodgeCancel` falso antes de `hitLanded()`, verdadeiro depois, `cancel()` -> `['moveEnd']`. O "golpe termina **e** a esquiva começa no mesmo frame" (`Player.ts:806`) não é lido ao vivo | encerra o golpe e inicia a esquiva no frame | **PARCIAL** |
| DOD-11 | `DS:132,265` `fx.layers.includes('dodge.trail')` durante a esquiva | `dodge.trail` | PASS |
| DOD-12 | `DS:264` `fx.layers.includes('dodge.slowTint')` com `timeScale 0.3` | `dodge.slowTint` | PASS |

### P1: Estrutura e finalizador

| ID | Evidência | Valor da spec | Status |
| --- | --- | --- | --- |
| STR-01 | `ST:11` `[cur,max,broken]` = `[0,100,false]`; `ST:18` 98 (teto); `ST:22` jogador cai a 0 | 0 a 100 | PASS |
| STR-02 | `ST:28-33` ganhos 4/4/10/10/40/30; `ST:36-41` regra para todos os golpes; `ST:54` teto 100; `ST:221-228` `enemyStructureGain`; `EGS:84` +40 ao vivo | 4, 10, 40, 30, teto 100 | PASS |
| STR-03 | `D:164-165` `playerStructureGain` 15 e 25; `ST:59-72` soma e teto; `DS:150` `structure.cur===15` ao vivo | 15 comum, 25 chefe, teto 100 | PASS (+25 do chefe só puro) |
| STR-04 | `ST:91,95` 1499 e 1500 sem mudar; `ST:103` +1000 ms -> 40; `ST:111` 1499+1000 -> 40.01; `ST:128` para em 0 | 10/s depois de 1500 ms | PASS |
| STR-07 | `ST:141,149,157` 999/1000 sem mudar, +1000 -> 30, 999+1000 -> 30.02 | 20/s depois de 1000 ms | PASS |
| STR-05 | `ST:162-178` quebra em 100, `stunRemainingMs===1500`, 1499 quebrado e 1500 acabou; `DS:219,228-230` ao vivo | quebrado e atordoado 1500 ms | PASS |
| STR-10 | `DS:220` `count(guardBreak:<id>)===1` | um `guardBreak:<id>` | PASS |
| STR-06 | `ST:181-187` `stunRemainingMs===800`, 799/800; `DS:314-316` 800 +-50 ms, sem golpe, sem andar | 800 ms ignorando input | PASS |
| STR-11 | `DS:296` `count(guardBreak:player)===before+1` | um `guardBreak:player` | PASS |
| STR-08 | `ST:191-197` `[cur,broken]===[0,false]`; `DS:231,317` | 0 e não quebrado | PASS |
| FIN-01 | `DS:247` `count(finisher:<id>)===1`; `DS:251` `hpEnemy - afterFin.hp === 40`. A borda de 40 px não é testada (M10 41 sobreviveu) | 40 de dano a <= 40 px de quebrado | PASS (dano e evento) com **borda do alcance sem evidência** |
| FIN-02 | `DS:249` `Math.abs(finFrozen*FRAME_MS - 150) <= 25` | hitstop 150 ms | PASS |
| FIN-04 | nenhuma. Zoom 1.7 (`TestScene.ts:87`) sem teste/smoke (outros smokes só leem `camera.zoom` para Kokusen e técnicas) | zoom 1.7 em <= 100 ms | **GAP (zero)** |
| FIN-03 | nenhuma. Nenhum teste aperta `both` sem inimigo quebrado perto | nenhum finalizador | **GAP (zero)** |
| STR-09 | `ART:787-798` `Object.values(PALETTE)` contém as 3 cores da barra, o texto do combo e as 5 notas | cores da paleta | PASS |

### P2: Aéreos e voadora

| ID | Evidência | Valor da spec | Status |
| --- | --- | --- | --- |
| AIR-01 | `MM:184-189` `['socoAereo']`, damage 7, `light` | `socoAereo` 7 light | PASS |
| AIR-02 | `MM:191-201` `voadora` 16 heavy, `Math.abs(end.forward-120) <= 8`; `F:219-224` `Math.abs(kickDx-120) <= 8`, desce | 120 px (+-8) frente e baixo | PASS |
| AIR-03 | `MM:203-209` `['pisao']`, 14 heavy, `m.def.slam===true`. "Seta a velocidade vertical para a queda máxima" (`Player.ts:793`) não é lido ao vivo | `pisao` 14 heavy e vy = queda máxima | **PARCIAL** |
| AIR-04 | `MM:211-220` segundo aéreo recusado, `land()` libera; `MM:222-230` | um por pulo | PASS (puro) |
| AIR-05 | `F:221` `trailSeen` de `air.kickTrail` durante a `voadora` (ausente antes, `F:206`) | `air.kickTrail` | PASS |

### P2: Inimigos que bloqueiam

| ID | Evidência | Valor da spec | Status |
| --- | --- | --- | --- |
| EBL-01 | `EG:27-29` `chanceFor(1)` 0.1, `(11)` 0.4, `(20)` 0.4; `EG:32-35` rodada 10 = 0.37; `EG:46-52` com a seed, sobe a guarda sse `Rng.next() < 0.4`; `EG:54-60` 599 guarda, 600 não; `EG:68-74` 60 px sim, 61 não; `tests/core/run.test.ts:329-334` `guardRng` | `min(0.1+0.03(r-1),0.4)`, RNG da run, 600 ms | PASS |
| EBL-02 | `EG:89` `{damage:0,structureGain:8,blocked:true,guardEnded:false}`; `EGS:32-36` hp igual, `structure.cur===8`, um `enemyBlock:<id>` | 0 de dano, +8, um evento | PASS |
| EBL-03 | `EG:110` forte -> `damage:12`; `EGS:50` `hp0 - e.hp === 12` | dano cheio | PASS |
| EBL-05 | `EG:110` `guardEnded:true`; `EGS:51` `!e.guarding` no frame do forte | guarda acaba no frame | PASS |
| EBL-04 | `EG:119` `{damage:24,structureGain:40,blocked:false}`; `EGS:83-84` 24 e +40 ao vivo | dano cheio e +40 | PASS |

### P2: Combo e nota

| ID | Evidência | Valor da spec | Status |
| --- | --- | --- | --- |
| CMB-01 | `CC:19-27` cada acerto soma 1; `EGS:155,158` ao vivo | +1 por golpe | PASS |
| CMB-02 | `CC:35-37` 1499 -> 2 hits e `D`; `CC:44-45` 1500 -> `[0,null]`; `CC:59-60` dano zera hits, nota e distintos | 1500 ms ou dano | PASS (limite dos dois lados) |
| CMB-03 | `CC:73-115` 1 hit sem nota; D com 1-2; C 3; B 4; A 5; S 6 e 7; repetir não sobe; `EGS:154-170` ao vivo D->C->B->A->S | D/C/B/A/S | PASS |
| CMB-04 | `EGS:146-147` `hud.combo.text === \`${hits} hits\`` e `hud.combo.x > 480` | texto `<hits> hits` à direita | PASS (limiar de "direita" não definido na spec) |
| CMB-05 | `EGS:148` `hud.combo.grade===grade` | letra sob o texto | PASS (posição "sob" não conferida) |

### P3: Palma explosiva

| ID | Evidência | Valor da spec | Status |
| --- | --- | --- | --- |
| SPC-01 | `MI:18,22` 299 e 300 ms casam, `MI:26` 301 não; `MI:69-74` `palmaExplosiva` 20 heavy; `F:188` `player.move==='palmaExplosiva'` | meia-lua em <= 300 ms, nessa ordem | PASS |
| SPC-02 | `F:194` `Math.abs(dx - 200) <= 16`, alvo vivo | 200 px (+-16) | PASS |

**Placar**: 91 ACs = 82 PASS (um com ressalva de borda: FIN-01) + 4 PARCIAL (MOV-15, GRD-06, DOD-06, AIR-03) + 5 GAP zero (CTL-08, GRD-05, PAR-07, FIN-03, FIN-04).

### Edge cases da spec

| Edge case | Evidência | Status |
| --- | --- | --- |
| Segurando objeto: `J`/`K` balançam o objeto e guarda/parry/esquiva funcionam | nenhuma | sem evidência |
| Técnica em andamento: guarda/parry/esquiva não começam | `D:22-26` `canGuard=false` -> `none`; `DO:97` `busy=true` -> não esquiva (puro) | PASS (puro) |
| Parry e esquiva perfeita no mesmo frame: só o parry | `D:185-189` `outcome==='parry'`, dano 0 | PASS |
| Chefe em `roar`: golpes seguem as regras da guarda | nenhuma | sem evidência |
| Nova run: estruturas 0, combo zera, `timeScale` 1 | `ST:213-218` (`reset` do `Structure`), `DO:202-207` (`SlowMo.reset`); reset do `ComboCounter` e da fiação no `Run` sem teste | PARCIAL |

---

## Spec-precision gaps

1. **PAR-02 x GRD-04**: a spec diz que o parry anula "enemy or boss hit" e que a guarda não reduz golpe imbloqueável, mas não diz o que o parry faz com um golpe imbloqueável. A implementação anula (STATE: "leitura literal de PAR-02") e nenhum teste fixa esse comportamento (`D:135-143` só usa golpes bloqueáveis).
2. **EBL-01**: "within 60 px" não diz medido centro a centro ou borda a borda; o teste usa `distancePx` abstrato (`EG:68-74`).
3. **FIN-04**: "zoom reach 1.7 within 100 ms of real time" não define quanto tempo o zoom segura nem a volta; a implementação tem 80 ms de entrada, 450 ms de espera.
4. **AIR-03**: "max fall speed" não define o valor (vem de `PLAYER_MOVE.maxFallSpeed`).
5. **CMB-04**: "right side of the screen" sem limiar; o smoke usa `x > 480` (`EGS:147`).
6. **Tolerâncias de tempo nos smokes**: a spec dá milissegundos exatos (PAR-08 80, FIN-02 150, PAR-10 400, STR-05 1500, STR-06 800, MOV-10 900, DOD-01 200) mas a medição ao vivo em frames de 16,7 ms aceita 17 a 50 ms de folga (`DS:199,213,228,249,314`, `F:109`); só os testes unitários provam o valor exato em STR-05/06 e DOD. PAR-08, FIN-02 e PAR-10 só têm a medição com folga.
7. **MOV-01**: "hitbox" e "input" só são exigidos como definidos; sem formato, `toBeDefined` é o máximo verificável.

---

## Discrimination Sensor

Worktree isolado `scratchpad/wt-verify7` (`git worktree add --detach`, junction `node_modules`), uma mutação por vez (`git checkout -- src` entre elas), `vitest --maxWorkers=2` nos arquivos relevantes. Baseline `git status --porcelain` da árvore real: `?? .agents/ .claude/ .cursor/ .windsurf/ skills-lock.json`; idêntico depois da limpeza (junction removida, `git worktree remove --force`, `git worktree prune`).

| # | Arquivo:linha | Mudança | Morto? | Teste que matou |
| --- | --- | --- | --- | --- |
| M1 | `src/data/moves.ts:156` | `parryWindowMs` 150 -> 151 | Morto | `D:58` (150 ms vira `guard`), `D:61` janela fecha sem tecla, `D:156-158` PAR-05 |
| M2 | `src/data/moves.ts:159` | `bossChipFraction` 0.25 -> 0.5 | Morto | `D:119-123` GRD-06 `round(dano x 0,25)` |
| M3 | `src/data/moves.ts:183` | `guardedLightGain` 8 -> 7 | Morto | `EG:89` EBL-02 `structureGain: 8` |
| M4 | `src/data/moves.ts:46` | `MOVE_WINDOW_MS` 260 -> 261 | Morto | `M:32`, `MM:92-93` (260 sim, 261 não) |
| M5 | `src/data/moves.ts:215` | `UPPERCUT_JUMP_CANCEL_MS` 100 -> 101 | Morto | `FI:28` (101 ms vira golpe aéreo) |
| M6 | `src/data/moves.ts:172` | `invulnMs` 180 -> 181 | Morto | `DO:60-61`, `DO:120-121` |
| M7 | `src/data/moves.ts:183` | `parryGain` 35 -> 34 | **Sobreviveu no vitest**; morto pelo smoke | `DS:195` `structure.cur===35` (smoke). `ST:76-83` usa o literal `add(35)`, não a constante |
| M8 | `src/data/moves.ts:160` | `guardSpeedFactor` 0.4 -> 0.5 | **Sobreviveu** (vitest completo de `tests/core`, `tests/data`, `tests/game`; nenhum smoke afirma a velocidade em guarda; smoke não executado nesta mutação) | nenhum |
| M9 | `src/data/moves.ts:163` | `parryBossPoiseDamage` 30 -> 29 | **Sobreviveu** | nenhum |
| M10 | `src/data/moves.ts:186` | `finisherRangePx` 40 -> 41 | **Sobreviveu** | nenhum (borda de 40 px do FIN-01 sem teste) |
| M11 | `src/data/moves.ts:184` | `player.stunMs` 800 -> 801 | Morto | `ST:184-187` (799/800) |

**Profundidade**: leve, 11 mutações. **Resultado**: 7 mortos pelo vitest, 1 morto só pelo smoke (M7), **3 sobreviventes (M8, M9, M10) -> FAIL**. Os três sobreviventes correspondem exatamente aos ACs sem evidência (GRD-05, PAR-07, FIN-03/FIN-01 borda). M10 repete a lição confirmada L-010 (limiar testado só longe do limite).

---

## Code Quality

| Princípio | Status |
| --- | --- |
| Mínimo de código / sem escopo extra | OK (tudo mapeia a AC, STATE ou AD-011) |
| Mudanças cirúrgicas | OK (`armed`, `held-item` smokes só trocam `K` por `E`; `tools/jev-refine` por glossário por spec) |
| Segue os padrões (AD-001: regra em `src/core`/`src/data`, adaptador fino) | OK |
| Asserções com o valor da spec | OK nas regras puras; os 5 ACs zero e 4 parciais ficam fora |
| Cobertura por camada (domínio 1:1; adaptador por smoke lendo estado vivo) | **Não**: a matriz de T19-T21 deixou de listar 8 ACs de adaptador |
| Todo teste mapeia a um AC | OK |
| Diretrizes seguidas | `vitest.config.ts`, AD-001/002/003/006, L-010 (parcial: M10) |

---

## Fix Plans

Ranqueado por severidade. Todos são testes novos (o código já implementa); nenhum exige mudar regra de jogo.

1. **Smoke ou teste para GRD-05**: andar com `U` segurado e conferir velocidade = 40% da normal (mata M8). Onde: `scripts/smoke/defense.smoke.mjs` (ou teste puro da velocidade passada ao `Mover`). Prioridade Major.
2. **PAR-07**: teste de `Boss.parried()` (ou do `BossBrain` com `receiveKokusen(0,30)`): postura 100 -> 70 e piso em 0 (mata M9); de preferência smoke com chefe parry. Major.
3. **FIN-03 e borda de FIN-01**: `both` sem inimigo quebrado perto não gera `finisher:*`; `both` a 40 px sim e a 41 px não (mata M10). Major.
4. **FIN-04**: smoke lendo `camera.zoom` >= 1.7 (com a folga definida) em <= 100 ms depois do finalizador. Major.
5. **CTL-08**: smoke com objeto na mão e `S`+`E` -> `heldItem === null` e o objeto em `worldProps` fora de `thrown`. Major.
6. **MOV-15 (meleeDamage)**: com modificador de dano de corpo a corpo ligado, o golpe causa `modifiers.meleeDamage(damage)` (teste ao vivo ou da função que o `Player` chama). Minor.
7. **DOD-06, AIR-03, GRD-06 ao vivo**: smoke de esquiva cancelando a recovery de golpe que acertou; `pisao` com `vy` = queda máxima; golpe do chefe bloqueado -> `round(dano x 0.25)`. Minor.
8. **Constante `parryGain` (M7)**: o teste unitário deve usar `STRUCTURE.enemy.parryGain` em vez do literal 35 (ou fixar 35 em `moves.test.ts`). Minor.
9. **Edge cases sem evidência**: objeto na mão + guarda/esquiva; chefe em `roar`; reset de `ComboCounter` e `timeScale` em nova run. Minor.
10. **Intermitência do `kokusen.smoke.mjs`** (rodada 1): acompanhar; se reaparecer, rodar em `0fb3d0d` para atribuir. Informativo.

---

## Requirement Traceability Update

Nenhum requisito marcado como Verified neste relatório (feature FAIL). Candidatos a Verified após o fix: os 82 ACs PASS acima; permanecem Implementing: CTL-08, GRD-05, PAR-07, FIN-03, FIN-04, MOV-15, GRD-06, DOD-06, AIR-03.

---

## Summary

**Resultado geral**: FAIL
**Spec-anchored check**: 82/91 ACs com o valor da spec, 4 parciais, 5 sem evidência, 7 gaps de precisão da spec
**Sensor**: 11 mutações, 8 mortas (7 no vitest, 1 só no smoke), 3 sobreviventes
**Gate**: build exit 0; vitest 1053 passed, 0 failed; smoke 19/19 ok na rodada 2 (rodada 1: 1 falha intermitente em `kokusen.smoke.mjs`, 3/3 isolado ok)

**O que funciona**: o núcleo puro (grafo de golpes, parry, esquiva, estrutura, combo, guarda do inimigo) está preso por limites dos dois lados; os smokes leem o snapshot vivo e confirmam o fluxo de guarda, parry, esquiva perfeita, quebra, finalizador, bloqueio de inimigo e nota de combo.

**O que falta**: fechar os 5 ACs zero e as 3 mutações sobreviventes (itens 1 a 5 do plano), depois re-verificar (iteração 1 de no máximo 3).
