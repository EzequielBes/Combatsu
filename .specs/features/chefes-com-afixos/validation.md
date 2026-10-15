# Chefes com afixos — Validation

**Date**: 2026-10-15 (rodada 1)
**Spec**: `.specs/features/chefes-com-afixos/spec.md` (60 ACs: BLN-01..11, AFX-01/02, IGN-01..05, INV-01..07, SNG-01..03, ADP-01..07, CYC-01..11, PDD-01..05, BRD-01..09; 7 casos de borda)
**Diff range**: `4c0efae..a3b3c60`, branch `feat/chefes-com-afixos`, 40 commits, 67 arquivos (+7288/−205). Os consertos do Verifier estão em `d156a20` (`test(boss): pin the lava hit, the thread damage and the beam origin`), logo depois de `a3b3c60`.
**Verifier**: sub-agente independente (autor ≠ verificador). Na árvore real entraram só os 3 consertos de teste (seção "Fix Plans") e este arquivo; todo mutante rodou num worktree temporário (`git worktree add --detach f32-verifier/wt-sensor HEAD`, `node_modules` por junção), removido no fim.

## Validation

**Result**: PASS (depois do conserto de 3 asserções; ver "Fix Plans")

Em uma linha: os 60 ACs têm evidência `arquivo:linha`; o sensor achou 2 mutantes de adaptador vivos (golpe da lava sem `low`/imbloqueável, feixe saindo fora do chefe) e 1 asserção fraca (dano do fio só `> 0`); os três foram fechados com testes novos e os mutantes morreram na revalidação. Gate verde; smokes `boss` (11), `world-` (7), `run-loop`, `shop` (2) e `hud` verdes. Ficam 4 ressalvas menores sem teste automático, listadas no fim, nenhuma bloqueante.

---

## Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1..T5 (refatorações) | ✅ Done | Smokes antigos de chefe com `bossArch`, `bossAffix=none`, `finger=0`; `Boss.dispatch`; medidas por instância; `wireEnemy`; ciclos pela tuning |
| T6..T11 (regra pura da escalação) | ✅ Done | `data/bossAffixes.ts`, `Run.bossAffixRng`, `drawLineup`/`BossLineups`, overrides, `bossSpecFor(round, lineup)`, rótulos, glifos e contorno |
| T12..T14 (escalação na cena) | ✅ Done | `BossDirector` no `RunDirector`; barra, glifos e aviso da loja |
| T15..T24 (regra pura dos ciclos e afixos) | ✅ Done | `cyclesFor`, `bossTuningFor`, `chargeTrail`, Investida Dupla, Salto Triplo, feixe e chuva no `BossAI`, `LavaStrips`, `Adaptation`, escala no `BossBrain`, `summonCount` |
| T25..T33 (motor) | ✅ Done | `Boss` com a tuning derivada, `ThreadRain`, Portador, `LavaField`, `AffixOutline`, `BeamAttack`, invocação, `techId`, `AdaptWheel` |
| Correções da revisão (INV-06, INV-07, BRD-09) | ✅ Done | `b3029a9`, `fc67040`, `916c640`, `341ca3f`, `202991c` |

`tasks.md` marca **Status: Done** e todos os "Done when" com `[x]`.

---

## Spec-Anchored Acceptance Criteria

Smokes citados pela linha depois do commit de conserto. "Código" = leitura do adaptador, citada quando o efeito não tem como ser lido de outro jeito.

### P1: Chefe sorteado pela seed (BLN)

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| BLN-01 | Stream próprio `seed ^ 0x9b05688c`, criado no início da run | `tests/core/bossAffix.test.ts:52` `expect(run.bossAffixRng!.next()).toBe(expected.next())` com `new Rng(7 ^ 0x9b05688c)`; `:65-66` run nova = objeto novo com a seed nova; `:71` salt fora dos 10 existentes | ✅ PASS |
| BLN-02 | Segundo pedido da rodada devolve o mesmo e não consome | `tests/core/bossLineup.test.ts:195` `toEqual(first)`; `:196` `run.bossAffixRng!.next()).toBe(after(11 ^ SALT, 3))` (só os 3 sorteios do 1º pedido) | ✅ PASS (M8 morto) |
| BLN-03 | Mesma seed e rodada inicial ⇒ mesma escalação em toda rodada | `tests/core/bossLineup.test.ts:206` r5..r30 de duas runs `toEqual(fromA)` | ✅ PASS |
| BLN-04 | 50/50 Oni/Tecelã em todo tier | `tests/core/bossLineup.test.ts:44-45` limiar `0.4999 → oni`, `0.5 → tecela`; `:48-51` r5..r25, 1000 seeds, Oni entre 450 e 550 | ✅ PASS |
| BLN-05 | r5: exatamente 1 afixo do pool leve | `tests/core/bossLineup.test.ts:59-60` `toHaveLength(1)` e `['igneo','invocador']` contém; `:89` 500 seeds só leves | ✅ PASS (M1 morto) |
| BLN-06 | tier 2: 1; tier 3–4: 2; tier ≥ 5: 3 | `tests/core/bossLineup.test.ts:66-80` `[[10,1],[15,2],[20,2],[25,3],[30,3],[50,3]]`, `toHaveLength(count)`; `:84` pool inteiro na r10 | ✅ PASS |
| BLN-07 | Sem repetido, sem par incompatível | `:78` `new Set(affixes).size === count`; `:99` com par injetado `filter(both)` `toEqual([])`, `:107-111` ordem inversa, `:118` sem a regra o par sai (discrimina) | ✅ PASS |
| BLN-08 | Fundo da arena e chefe usam o arquétipo da escalação | `tests/core/bossTier.test.ts:123-126` Tecelã na r5, Oni na r15; `scripts/smoke/boss-lineup.smoke.mjs:62` `s.area.arenaVariant === s.boss.archetype && background.variant === s.boss.archetype`; código `areaDirector.ts:83`, `spawner.ts:163` | ✅ PASS |
| BLN-09 | Override válido manda; consumo do stream igual | `tests/core/bossLineupOverrides.test.ts:107-115` `overridden.next()).toBe(plain.next())` r5/r10/r25; `:117-122` resultado do override e cache puro; `boss-lineup.smoke.mjs:89-93` `bossArch=tecela` troca o arquétipo e mantém os afixos sorteados | ✅ PASS (M9 morto) |
| BLN-10 | Inválido ignorado; `none` = lista vazia | `tests/core/bossLineupOverrides.test.ts:21-24`, `:50-57`, `:64-66` `toBeUndefined()`; `:124-131` vale o sorteio; `:133-137` `none` ⇒ `[]` onde o tier pede 3; `boss-lineup.smoke.mjs:97-99` | ✅ PASS |
| BLN-11 | Snapshot traz `affixes` (ordem) e `finger` | `scripts/smoke/boss-lineup.smoke.mjs:51-60` `Array.isArray(s.boss.affixes) && typeof s.boss.finger === 'boolean'` e iguais à escalação; código `snapshot.ts:122-123` | ✅ PASS |

### P1: Os 4 afixos da leva 1

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AFX-01 | `Boss` monta cérebro e IA com tuning derivada por função pura | `tests/core/bossAffix.test.ts:229-238` `bossTuningFor` (ciclos, números, `brain` = `BOSS`); `:244` Oni sem afixo ≠ ciclos de base; código `Boss.ts:89-91`; vivo: `boss-attacks.smoke.mjs:91` fase 2 do Oni abre com `doubleCharge` (só existe na tuning derivada) | ✅ PASS |
| AFX-02 | Dados em `data/bossAffixes.ts`, regra em `core/bossAffix.ts`, sem `phaser` | `tests/data/bossAffixes.test.ts:7-15` ids e nomes nas duas formas, `:17-21` leveza, `:65-69` cores; `grep -n "from ['\"]phaser" src/core/*.ts src/data/*.ts` → nada | ✅ PASS |
| IGN-01 | Fim da investida ⇒ faixa no trecho percorrido | `tests/core/bossAttacks.test.ts:113-143` `chargeTrail` de `fromX` até onde o corpo parou (alcance e parede, os dois sentidos); `boss-igneo.smoke.mjs:230` pontas da faixa a ≤ 2 px do X de saída e do de parada | ✅ PASS |
| IGN-02 | Faixa some aos 2000 ms | `tests/core/bossLava.test.ts:21-29` viva aos 1999, `toHaveLength(0)` aos 2000; `boss-igneo.smoke.mjs:234` some no quadro 119 ± 1 | ✅ PASS |
| IGN-03 | No chão, encostado: `round(4 × mult)` a cada 600 ms pelo `receiveHit` | `tests/core/bossLava.test.ts:31-43` 1º contato na hora, 599 não, 600 sim; `tests/core/bossTier.test.ts:136-146` lava 4/5/8/8/8 por tier; `tests/game/lavaField.test.ts:55-64` (novo) o 2º golpe chega ao `receiveHit` só aos 600 ms; `boss-igneo.smoke.mjs:240-247` `hpLoss === 5` na r10, intervalo de 36 quadros | ✅ PASS |
| IGN-04 | Golpe `low`, `unblockable`, força 0, dono = chefe | `tests/game/lavaField.test.ts:43` (novo) `toMatchObject({ ownerId: BOSS_ID, damage: DAMAGE, height: 'low', unblockable: true, force: 0 })`; `boss-igneo.smoke.mjs:249` sem deslocamento no tique | ✅ PASS (A4 morto depois do conserto; antes sobrevivia) |
| IGN-05 | No ar, nenhum dano | `tests/core/bossLava.test.ts:53-58`; `tests/game/lavaField.test.ts:47-53` (novo); `boss-igneo.smoke.mjs:253-261` nenhum tique no ar com o relógio pronto e tique na hora ao pousar | ✅ PASS (M2 morto) |
| INV-01 | Fases 2 e 3: 3 comuns (2 na r5) | `tests/core/bossAffix.test.ts:251-257` `[2,2,2,1,0]` r5 e `[3,3,2,1,0]` r10; `boss-invocador.smoke.mjs:59` `first.length === 2` no rugido da fase 2 | ✅ PASS |
| INV-02 | Nunca acima de 4 vivos | `tests/core/bossAffix.test.ts:252,256,260` teto e piso 0; `boss-invocador.smoke.mjs:105` fase 3 `<= 4` | ✅ PASS |
| INV-03 | Morte do invocado fora da `Run`, sem drop, sem stream de loot | `boss-invocador.smoke.mjs:95-100` `summonDied` sem `enemyDied`, `run.kills` igual, `pickups` igual; código `spawner.ts:116` (`armedRoll` nulo: não lê o `lootRng`) | ✅ PASS |
| INV-04 | Morte do chefe remove os invocados com a fumaça | `boss-invocador.smoke.mjs:114-121` `bossSummoned.length === 0` e `summonDismissed:<id>` de cada um; código `bossDirector.ts:137-149` | ✅ PASS (A2 morto) |
| INV-05 | Tuning comum escalada pela rodada, nunca armado | `boss-invocador.smoke.mjs:61-64` `weapon === null`; código `spawner.ts:99` `scaleFor(round, …)` | ✅ PASS (ressalva R2) |
| INV-06 | Fumaça no chefe; nascem ao lado, alternando a partir das costas; ponto `E` só sem espaço | `tests/core/bossAffix.test.ts:267-278` `summonSpots` `[452, 548, 424]`, parede, falta de espaço; `boss-invocador.smoke.mjs:69-83` `summonFx`, dentro da câmera, a ≤ 120 px do chefe; código `bossDirector.ts:113` | ✅ PASS |
| INV-07 | Contador "Inimigos" inclui os invocados | `boss-invocador.smoke.mjs:84-85` `s.hud.remaining === "Inimigos: " + (alive + queued + invocados)` | ✅ PASS |
| SNG-01 | `beam` logo depois do 1º ataque de cada fase | `tests/core/bossAffix.test.ts:206-217` as 3 fases dos 2 arquétipos; `boss-sangue.smoke.mjs:214` `'charge,beam,leap'` vivo | ✅ PASS (M6 morto) |
| SNG-02 | 800 ms; linha no peito, do chefe à borda no lado que ele olha; 1 → 6 px | `tests/core/bossAttacks.test.ts:35-50` `beamThickness` 1 → 6; `tests/core/bossAIStrike.test.ts:40-52` 799/800 ms e `dir`; `:73-80` lado preso no aviso; `boss-sangue.smoke.mjs:224-241` duração, espessura, lado, **`fromX` a ≤ 2 px do chefe (novo, `:231-234`)**, borda da tela, altura do peito; `:59-61` sprite olhando para o lado do feixe | ✅ PASS (A5 morto depois do conserto; antes sobrevivia) |
| SNG-03 | 250 ms, um acerto, `high`, `round(16 × mult)` | `tests/core/bossAIStrike.test.ts:54-65` 249/250 ms; `tests/core/bossTier.test.ts:136-146` 16/18/30/32/32; `boss-sangue.smoke.mjs:47-48` um acerto de 18 na r10; `:52-57` abaixado não acerta (prova o `high`) e fica aberto ~250 ms | ✅ PASS |
| ADP-01 | Conta por fonte (leve, forte, técnica) nos últimos 20 s | `tests/core/bossAdapt.test.ts:15-20` fonte pela `strength` e pelo `techId`; `:56-74` 19999 conta, 20000 não; `tests/game/techMarks.test.ts:7-9` toda técnica leva o id; `boss-adaptativo.smoke.mjs:86-90` | ✅ PASS |
| ADP-02 | Kokusen, finalizador e aparo nem contam nem reduzem | `boss-adaptativo.smoke.mjs:123-126` finalizador tira os 12% inteiros e não muda `adapted`; `tests/core/bossAdapt.test.ts:22-25` técnica sem id não conta; código `Boss.ts:236-252` (`receiveFinisher`, `receiveParry`, `receiveKokusen` não tocam a `Adaptation`) e `tech/divergent.ts:238` (Kokusen no chefe vai por `receiveKokusen`) | ✅ PASS (ressalva R3) |
| ADP-03 | Adapta a fonte com mais acertos se ≥ 5 e < 2 adaptadas; empate fica com a 1ª | `tests/core/bossAdapt.test.ts:33-39` 4 não, 5 sim; `:76-91` teto 2 e a de mais acertos; `:106-115` empate nos dois sentidos | ✅ PASS (M3 morto) |
| ADP-04 | Dano e postura × 0,5, arredondados, dano ≥ 1 | `tests/core/bossBrainScale.test.ts:26-45` 15 forte ⇒ 8 de dano e 15 de postura; piso 1; `:47-52` antes do multiplicador do `stagger`; `tests/core/bossAdapt.test.ts:117-123` escala só depois da adaptação; `boss-adaptativo.smoke.mjs:92-94` o 6º golpe tira 14 (metade do 5º) | ✅ PASS (A1, M10 mortos) |
| ADP-05 | Esquece a fonte adaptada 10 s sem acerto | `tests/core/bossAdapt.test.ts:125-157` 9999 não, 10000 sim; acerto da própria fonte reinicia | ✅ PASS (M11 morto) |
| ADP-06 | Roda de 8 raios sobre a cabeça, rótulo curto de cada fonte | `boss-adaptativo.smoke.mjs:97-104` `wheel.visible && labels.join() === 'Forte'` e acima do topo do corpo; `tests/data/bossAffixes.test.ts:47-53` rótulos de leve, forte e cada técnica; código `AdaptWheel.ts:18` `RAYS = 8`; captura `boss-adaptativo.png` conferida pelo Verifier | ✅ PASS (ressalva R4) |
| ADP-07 | Snapshot traz as fontes adaptadas | `boss-adaptativo.smoke.mjs:90` `adapted[4] === 'heavy'`; código `snapshot.ts:131` | ✅ PASS |

### P2: Ataques novos e ciclos por arquétipo

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| CYC-01 | Ciclos por arquétipo e fase na tuning, no lugar do `CYCLES` | `tests/data/tuning.test.ts` (`archetypes.*.cycles`); `tests/core/bossAffix.test.ts:219-223` a tabela não muda; `src/core/bossAI.ts:13,184` lê `this.t.cycles` | ✅ PASS |
| CYC-02 | Fase 1 `charge, leap` nos dois | `tests/core/bossAffix.test.ts:189-192` | ✅ PASS |
| CYC-03 | Oni: `doubleCharge, volley, leap` / `volley, charge, tripleLeap, doubleCharge` | `tests/core/bossAffix.test.ts:194-198`; vivo `boss-attacks.smoke.mjs:91` e `:148` | ✅ PASS |
| CYC-04 | Tecelã: `charge, volley, threadRain` / `threadRain, volley, charge, tripleLeap` | `tests/core/bossAffix.test.ts:200-204`; vivo `boss-attacks.smoke.mjs:235` `attack === 'threadRain'` na fase 2 | ✅ PASS |
| CYC-05 | Fim pelo alcance ⇒ vira e investe de novo após 250 ms, sem descanso | `tests/core/bossAIDoubleCharge.test.ts:49-66` 249 ms prepara, 250 ms investe; `:68-74` volta para o player; `boss-attacks.smoke.mjs:115-118` duas pernas, preparo entre elas, dois rastros | ✅ PASS |
| CYC-06 | Parede na 1ª ⇒ atordoa, sem 2ª | `tests/core/bossAIDoubleCharge.test.ts:116-135` `wallStun`, `rest`, ciclo segue | ✅ PASS (M4 morto) |
| CYC-07 | 3 saltos, cada um no X do player na saída, 200 ms entre pouso e saída | `tests/core/bossAITripleLeap.test.ts:57-83` 199/200 ms e alvo preso na saída | ✅ PASS |
| CYC-08 | Hitbox em todo pouso; ondas e recuperação só no 3º | `tests/core/bossAITripleLeap.test.ts:94-114` `final` só no 3º, recuperação depois dele; `boss-attacks.smoke.mjs:151-155` 3 pousos, 2 ondas só no 3º; código `Boss.ts:392` | ✅ PASS (M7 morto) |
| CYC-09 | 5 marcas em −96..+96 do player, presas à arena, 600 ms | `tests/core/bossAttacks.test.ts:12-30` `[404,452,500,548,596]` e as bordas; `tests/core/bossAIStrike.test.ts:100-110` 599/600 ms; `:121-127` sem `windupMult`; `boss-attacks.smoke.mjs:240` marcas vivas a ≤ 3 px | ✅ PASS |
| CYC-10 | Cada marca vira fio, um acerto, dano do projétil do tier, dono = chefe | `tests/core/bossAIStrike.test.ts:112-119` 200 ms; `boss-attacks.smoke.mjs:273` **`rain.damage === 10` (novo)**, `:274` `hits === 1`, `:275` `hpLoss === damage`; código `bossDirector.ts:93` (`boss.id` como dono) | ✅ PASS (asserção apertada; antes só `> 0`) |
| CYC-11 | Só quadros que já existem | `tests/core/bossAttacks.test.ts:68-73` toda animação de preparo e corpo existe em `BOSS_ANIMS`; `boss-attacks.smoke.mjs:159` nenhum "Missing animation" | ✅ PASS |

### P2: Portador de Dedo

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| PDD-01 | 10% da r10 em diante, nunca antes | `tests/core/bossLineup.test.ts:124-132` limiar `0.0999` sim / `0.1` não; nunca na r5 nem com `next() = 0`; `:134-138` ~10% em 1000 seeds | ✅ PASS |
| PDD-02 | Não ocupa vaga | `tests/core/bossLineup.test.ts:140-151` Portador com 1 afixo na r10 e 3 na r25 | ✅ PASS |
| PDD-03 | Sprite e corpo × 1,25 | `tests/core/bossTier.test.ts:150-153`; `boss-attacks.smoke.mjs:178-183` escala lida do sprite e limites do corpo Matter | ✅ PASS |
| PDD-04 | Vida × 1,3; todo dano (lava, feixe, fio) × 1,5, arredondado | `tests/core/bossTier.test.ts:155-166` `{charge:31, leap:35, shockwave:21, projectile:17, lava:7, beam:28}` e 780 de vida; `boss-attacks.smoke.mjs:186` vida viva | ✅ PASS (M5 morto) |
| PDD-05 | Rajada com +1 projétil | `tests/core/bossTier.test.ts:168-171` 4 e 6; `boss-attacks.smoke.mjs:206` 4 projéteis vivos | ✅ PASS |

### P1: Leitura (barra, contorno, aviso)

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| BRD-01 | Nome inteiro · afixos no gênero · Portador(a) | `tests/core/bossAffix.test.ts:99-118`; `boss-lineup.smoke.mjs:109-117` barra viva `'Tecelã de Maldições · Sangue Convergente · Adaptativa · Portadora de Dedo'` | ✅ PASS |
| BRD-02 | Um glifo de 6 px por afixo (e Portador), cor dos dados | `tests/core/bossAffix.test.ts:156-160` `['r','a']`, `['A','u','w']`; `boss-lineup.smoke.mjs:107,115,138` glifos vivos e somem com a barra | ✅ PASS |
| BRD-03 | Contorno 1 px na cor; com os dois, alterna a cada 600 ms | `tests/core/bossAffix.test.ts:163-186` limiares 599/600/1199/1200; `boss-igneo.smoke.mjs:334-335` `a` e quadro igual ao do chefe em todo quadro; `:360-368` trechos de 36 ± 1 quadros; `:372` sem contorno com Sangue | ✅ PASS |
| BRD-04 | Loja antes de rodada de chefe mostra `Próximo: …` até fechar | `tests/core/bossAffix.test.ts:146-152`; `boss-lineup.smoke.mjs:190` `'Próximo: Oni · Ígneo'`, `:199` segue com a loja aberta, `:209` some ao fechar | ✅ PASS |
| BRD-05 | Sem aviso quando a próxima não é de chefe | `boss-lineup.smoke.mjs:169,176` nenhum aviso na rodada nem na travessia; `:185` loja da r1 sem aviso | ✅ PASS |
| BRD-06 | Anunciado = chefe que nasce | `boss-lineup.smoke.mjs:211-215` a r5 nasce Oni `["igneo"]` sem Portador, barra igual | ✅ PASS |
| BRD-07 | Toda cor da `PALETTE` | `tests/data/bossAffixes.test.ts:56-69` chaves de contorno e glifo existem; código: toda cor de `src/game/boss/*.ts` é `PALETTE.<chave>` (`LavaField.ts:31-32`, `BeamAttack.ts:36-37`, `ThreadRain.ts:30-31`, `AdaptWheel.ts:36-37,91`, `AffixOutline.ts:48,70`, `BossReadout.ts:15,45,90`) | ✅ PASS |
| BRD-08 | Snapshot traz o aviso enquanto visível | `boss-lineup.smoke.mjs:190` `s.bossAnnounce`; código `snapshot.ts:137` | ✅ PASS |
| BRD-09 | Rótulo abaixo da barra, dentro da tela, quebra só entre partes | `tests/core/bossAffix.test.ts:120-143` `packBarLabel` (cabe, quebra entre partes, parte larga inteira); código `Hud.ts:63-67` (`wordWrap.callback` com `packBarLabel`) e `:178-181` (origem `(0.5, 0)` em `MARGIN + 12 + 3`); captura `boss-lineup-bar.png` conferida pelo Verifier: 2 linhas sob a barra, quebra antes de "Portadora de Dedo" | ✅ PASS (ressalva R1) |

**Status**: ✅ 60/60 ACs com evidência `arquivo:linha`. 3 asserções foram apertadas pelo Verifier (IGN-04, SNG-02, CYC-10). 4 ressalvas menores (R1..R4) sem teste automático, abaixo.

---

## Edge Cases

- [x] Chefe morre com lava viva ⇒ some tudo: `boss-igneo.smoke.mjs:288-289` `bossLavaStrips === 0` no quadro da morte.
- [x] Interrupção no aviso do feixe ou no preparo da chuva ⇒ cancela sem abrir: `tests/core/bossAIStrike.test.ts:131-158` (`telegraphCancel`, nunca `strikeOn`); vista: `tests/game/bossAffixFx.test.ts:31-37`.
- [x] Troca de fase no meio da Investida Dupla ou do Salto Triplo ⇒ ciclo novo do 1º ataque: `tests/core/bossAIDoubleCharge.test.ts:139-148`, `tests/core/bossAITripleLeap.test.ts:129-139`.
- [x] Player morre com invocados e lava ⇒ run nova limpa: lava em `boss-igneo.smoke.mjs:313-318` (`bossLavaStrips === 0`); invocados só por código (`runDirector.ts:172` → `BossDirector.reset` → `dismissSummoned`).
- [x] Run começando na rodada de chefe ⇒ sorteio no 1º pedido: `tests/core/bossLineup.test.ts:209-211`; todos os smokes novos abrem em `round=5/10/15`.
- [x] Invocação sem ponto livre ⇒ ponto mais distante: `bossDirector.ts:113` cai no `pickEnemySpawnPoint`, cujo `pickSpawnPoint` devolve `farthestPoint` sem candidato fora da câmera (`src/core/spawnPoint.ts:41`, `tests/core/spawnPoint.test.ts:36-38`).
- [x] Portador com Ígneo ⇒ lava × 1,5: `tests/core/bossTier.test.ts:163-166` (7 na r10, um arredondamento só).

---

## Discrimination Sensor

Worktree temporário `f32-verifier/wt-sensor` (detached em `a3b3c60`). Unitários: um script de rascunho troca uma string (deve ocorrer uma vez) no worktree, roda `npx vitest run tests/core/boss* tests/data tests/game/bossAffixFx.test.ts tests/game/techMarks.test.ts` (linha de base: 27 arquivos, 456 verdes) e restaura. Adaptadores: o mesmo script com `npm run smoke -- <cenário>` (build próprio no worktree). Fase 1 com os testes de `a3b3c60`; fase 2 com os 3 consertos copiados para o worktree.

| # | Arquivo | Mutação | Teste que pega | Resultado |
| --- | --- | --- | --- | --- |
| M1 | `src/core/bossAffix.ts:74` | pool leve só em `tier < 1` (r5 sorteia do pool inteiro) | `bossLineup.test.ts` (3 casos de r5) | ✅ Morto |
| M2 | `src/core/bossLava.ts:76` | lava bate também no ar | `bossLava.test.ts:53` | ✅ Morto |
| M3 | `src/core/bossAdapt.ts:100` | `>= minHits` → `> minHits` | `bossAdapt.test.ts` (9 casos) | ✅ Morto |
| M4 | `src/core/bossAI.ts:271` | Investida Dupla encadeia mesmo depois da parede | `bossAIDoubleCharge.test.ts:116,129` | ✅ Morto |
| M5 | `src/core/bossTier.ts:80` | lava sem o × 1,5 do Portador | `bossTier.test.ts:155,163` | ✅ Morto |
| M6 | `src/core/bossAffix.ts:247` | `beam` no fim do ciclo | `bossAffix.test.ts:206` | ✅ Morto |
| M7 | `src/core/bossAI.ts:302` | todo pouso é `final` (ondas em todo salto) | `bossAITripleLeap.test.ts` (3 casos) | ✅ Morto |
| M8 | `src/core/bossAffix.ts:148` | cache desligado: todo pedido sorteia de novo | `bossLineup.test.ts:191`, `bossLineupOverrides.test.ts:117` | ✅ Morto |
| M9 | `src/core/bossAffix.ts:153` | override de arquétipo consome um `next()` a mais | `bossLineupOverrides.test.ts:107` (r5/r10/r25) | ✅ Morto |
| M10 | `src/core/bossBrain.ts:98` | dano escalado sem o piso 1 | `bossBrainScale.test.ts:33` | ✅ Morto |
| M11 | `src/core/bossAdapt.ts:77` | esquece só depois de 10001 ms | `bossAdapt.test.ts` (4 casos) | ✅ Morto |
| A1 | `src/game/Boss.ts:222` | escala do Adaptativo ignorada (sempre 1) | `boss-adaptativo`: "o 6º golpe forte, adaptado, tira 14" (tirou 27) | ✅ Morto |
| A2 | `src/scenes/test/bossDirector.ts:180` | morte do chefe não dispensa os invocados | `boss-invocador`: "nenhum invocado depois da morte do chefe: 11,12" | ✅ Morto |
| A3 | `src/scenes/test/bossDirector.ts:93` | fio com o dano da investida (18) em vez do projétil (10) | fase 1: morto **por acaso** (`hpLoss 14 ≠ damage 18`, vida do player no fim); fase 2: `boss-attacks.smoke.mjs:273` `rain.damage === 10` | ✅ Morto (ver fase 2) |
| A4 | `src/game/boss/LavaField.ts:62-63` | golpe da lava sem `height: 'low'` e bloqueável | fase 1: **sobreviveu** (`boss-igneo` verde); fase 2: `tests/game/lavaField.test.ts:43` | ✅ Morto depois do conserto |
| A5 | `src/game/boss/BeamAttack.ts:79` | linha do feixe começa 40 px à frente do chefe | fase 1: **sobreviveu** (`boss-sangue` verde); fase 2: `boss-sangue.smoke.mjs:231-234` | ✅ Morto depois do conserto |
| A6 | `src/game/boss/LavaField.ts:61` | golpe da lava com força 4 | fase 2: `tests/game/lavaField.test.ts:43` | ✅ Morto |

**Sensor depth**: expandido (11 unitários + 6 de adaptador), por ser feature de adaptador com regra nova (L-043).
**Result**: fase 1: 2 sobreviventes (A4, A5) e 1 morte por acaso (A3) ⇒ consertos; fase 2: 17/17 mortos.
**Isolamento**: `git status --porcelain` da árvore real antes do sensor = vazio; depois = só os 3 arquivos de conserto e este relatório (nenhum resto de mutante); worktree removido e `git worktree prune` feito.

Linha de base ampla do worktree (todos os testes de `tests/core tests/data tests/game`): 1 falha por tempo com a máquina carregada (`lightning.test.ts` "seeds 0..999" e `konbini: só cores da PALETTE`, laços de 5 s), sem relação com a feature; por isso o sensor rodou no recorte dos testes de chefe, verde na linha de base.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code / surgical | ✅ Regra nova toda em `src/core/` (6 arquivos); o `Boss.ts` delega para `game/boss/` (7 componentes); `TestScene.ts` perdeu 4 linhas |
| No scope creep | ✅ Nenhum afixo da leva 2, nenhum Dedo, nenhuma arte HD de chefe |
| Matches patterns | ✅ Stream com salt em `run.ts` (como os outros 10); overrides no molde do `enemyVariant`; snapshot lido do objeto vivo (L-043): escala do sprite, limites do corpo, glifos visíveis, texto do aviso |
| Lint / tetos | ✅ `npm run gate` verde; `.oxlintrc.json` intocado na faixa; nenhum aviso em arquivo novo. `Boss.ts` 400 linhas não vazias (no teto, sem aviso); `Hud.ts` (exceção) 336 → 335 linhas efetivas; `tests/core/bossBrain.test.ts` e `bossAI.test.ts` não cresceram fora do ajuste do `chargeTrail` |
| Spec-anchored outcome check | ✅ depois dos 3 consertos |
| Per-layer coverage | ✅ regra pura 1:1 com os ACs e limiares dos dois lados (L-010); adaptadores pelo snapshot vivo; `LavaField` agora também por teste de unidade com cena falsa |
| Testes mapeiam a ACs | ✅ cada `describe`/cenário cita o AC; nenhum teste órfão encontrado |
| Guidelines | `CLAUDE.md` (camadas, smoke novo em `hd=1`, tetos), `.oxlintrc.json`, L-010, L-043 |
| HD é a base | ✅ os 6 smokes novos pedem `hd=1&area=modular` |

---

## Gate Check

- **Gate command**: `npm run gate` (worktree `wt-chefes`)
- **Result em `a3b3c60`**: exit 0; 159 arquivos, **3121 passed**, 0 failed, 0 skipped
- **Result com os consertos**: exit 0; 160 arquivos, **3124 passed** (+3 de `tests/game/lavaField.test.ts`)
- **Test count before feature**: 2913 em 146 arquivos (`4c0efae`, segundo `tasks.md`)
- **Delta**: +208 testes (+211 com os consertos); nenhuma queda
- **Smokes em `a3b3c60`**: `boss` 11/11 (os 6 novos `boss-adaptativo`, `boss-attacks`, `boss-igneo`, `boss-invocador`, `boss-lineup`, `boss-sangue` e os 5 antigos), `world-` 7/7, `run-loop` 1/1, `shop` 2/2, `hud` 1/1
- **Smokes com os consertos**: `boss-attacks` e `boss-sangue` verdes com as asserções novas; os 3 smokes antigos que a feature tocou (só a URL com o chefe fixado) também verdes: `vows`, `evolution`, `defense-extra`

---

## Fix Plans

Aplicados pelo Verifier em `d156a20` (só testes; nenhum código de jogo mudou).

### Fix 1: golpe da lava sem teste dos campos (IGN-04) — Major

- **Root cause**: o `boss-igneo` mede dano e ausência de empurrão, mas nunca põe o player abaixado ou na guarda; o `Hit` da lava (`LavaField.ts:57-65`) podia perder `low` e `unblockable` sem nenhum teste notar (A4 sobreviveu).
- **Fix**: `tests/game/lavaField.test.ts` (novo) monta o `LavaField` com uma cena falsa e um player falso e confere o golpe que chega ao `receiveHit` (`ownerId`, `damage`, `height: 'low'`, `unblockable: true`, `force: 0`), o "no ar, nada" e o intervalo de 600 ms pelo adaptador.

### Fix 2: dano do fio só `> 0` (CYC-10) — Minor

- **Root cause**: `boss-attacks.smoke.mjs` aceitava qualquer dano positivo no fio; o mutante A3 só morreu porque o player estava com pouca vida.
- **Fix**: `rain.damage === 10` (o projétil do tier 1 na r5), separado do `hits === 1`.

### Fix 3: origem da linha do feixe sem asserção (SNG-02) — Minor

- **Root cause**: o `boss-sangue` gravava `fromX` mas não o comparava com o chefe (A5 sobreviveu).
- **Fix**: cada quadro do aviso guarda o X do chefe e a asserção nova exige `|fromX − x do chefe| ≤ 2`.

---

## Ressalvas (sem teste automático, não bloqueiam)

- **R1 (BRD-09)**: a posição do rótulo (abaixo da barra, dentro da tela) só tem prova visual; a regra de quebra é testada. Medir o retângulo do texto exigiria um campo novo no snapshot do `Hud.ts`, que está nas exceções do lint e não cresce. Sugestão: quando o `Hud` for dividido, expor `bossBar.nameBounds` e medir no `boss-lineup`.
- **R2 (INV-05)**: a escala por rodada dos invocados não é discriminável hoje: `DIFFICULTY.hpPerRound` e `damagePerRound` são 0 até a F30, então vida e dano escalados = base. Quando a F30 entrar, o `boss-invocador` deve comparar `maxHp`/`damage` do invocado com o da onda na mesma rodada.
- **R3 (ADP-02)**: Kokusen e aparo não contam pelo desenho (`receiveKokusen`/`receiveParry` não passam pela `Adaptation`), sem cenário vivo; o finalizador tem.
- **R4 (ADP-06)**: os 8 raios da roda só por código (`RAYS = 8`) e pela captura.

---

## Lessons

Registradas com `lessons.py` (sinais desta validação):

- **L-082** (candidata, `surviving_mutant`, A4): campos do golpe que o adaptador monta (`height`, `unblockable`, `force`, dono) pedem teste de unidade com cena falsa; o smoke só vê o dano.
- **L-024** (recorrência 2, **promovida a confirmada**, `surviving_mutant`, A5): conferir toda cláusula do AC conjuntivo, inclusive as posições ao lado dos números principais.
- **L-083** (candidata, `ac_gap`, A3/CYC-10): conferir o valor exato da spec num dano vivo, nunca só que é positivo.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| BLN-01..11, AFX-01/02, IGN-01..05, INV-01..07, SNG-01..03, ADP-01..07, CYC-01..11, PDD-01..05, BRD-01..09 | Implemented | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready (rodada 1, com 3 consertos de teste do Verifier)
**Spec-anchored check**: 60/60 ACs e 7/7 casos de borda com evidência; 3 asserções apertadas; 4 ressalvas menores
**Sensor**: 17/17 mortos depois dos consertos (fase 1: A4 e A5 vivos, A3 morto por acaso)
**Gate**: 3124 passed
**What works**: o chefe sai da seed já na r5 (arquétipo e afixo leve), é o mesmo na loja, no fundo e no spawn; cada afixo muda a luta e se lê (lava no chão, invocados ao lado do chefe, linha do feixe, roda do Adaptativo, contorno e glifos); ciclos próprios do Oni e da Tecelã; Portador maior e mais forte.
**Pendências fora do sensor**: o critério de sucesso "o usuário joga a r5 com Ígneo e Invocador e a r10 com Sangue e Adaptativo e diz que cada um pede outra resposta" é UAT humano.
**Next steps**: UAT com o usuário (`?debug&hd=1&area=modular&round=5&bossAffix=igneo`, `invocador`; `round=10&bossAffix=sangue`, `adaptativo`); atualizar a rastreabilidade de `spec.md` para Verified ao fechar a feature.
