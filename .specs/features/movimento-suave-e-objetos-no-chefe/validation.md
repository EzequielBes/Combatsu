# Validation: movimento-suave-e-objetos-no-chefe - PASS na rodada 2 (a rodada 1 reprovou)

**Data**: 2026-10-03
**Spec**: `.specs/features/movimento-suave-e-objetos-no-chefe/spec.md`
**Branch**: `feat/movimento-suave-e-objetos-no-chefe`, HEAD `a57759d`
**Diff range**: `a595f1b..HEAD`: 9 commits (7 de feature, T1 a T7, e 2 de spec), 18 arquivos, +1237/-29
**Verifier**: independente (autor != verificador), Sonnet 5.5. Nenhum código nem teste foi alterado. O único arquivo criado na árvore real é este.

Veredito geral: PASS na rodada 2 (`a57759d..8f4e7f1`, 23 requisitos), depois de uma rodada 1 reprovada (`a595f1b..a57759d`, 20 requisitos). O texto da rodada 1 segue abaixo sem reescrita e a `## Rodada 2` fecha o arquivo.

Veredito da rodada 1: FAIL, por uma lacuna só e pequena de consertar. O EDG-02 ("ao renascer, `player.view` fica no corpo no primeiro quadro") não tem nenhum teste no nível do player: a chamada `drawPos.snap()` de `Player.resetForRun` pode ser apagada e os 1778 testes e o smoke `feel` seguem passando (mutante A6b; só `feel` e `boss-prop` leem `player.view`, nenhum outro smoke em `scripts/smoke` o faz). Uma sonda minha, só em scratch, mostra que o defeito é real (depois de renascer, `view` fica 29,3 px longe do corpo no primeiro quadro, 22,7 px no segundo) e que um smoke curto o pega. Todo o resto passa: 19 de 20 requisitos com evidência no valor da spec, build, 1778 testes e os 30 smokes (o `armed` caiu uma vez, intermitente, e passou na repetição). O sensor também achou um segundo furo, de precisão da spec e mais grave para o objetivo do usuário: nenhum teste olha o sprite que a tela desenha (mutantes A1, A4, A5), só o campo `view` do snapshot, que vem do mesmo getter.

Convenção: "rodado" = executei e vi o resultado; "lido" = conferi lendo o código, o teste ou a biblioteca.

---

## Task Completion (lido)

| Task | Status | Commit | Notas |
| --- | --- | --- | --- |
| T1 Objetos colidem com o chefe | Done | `cd01e37` | PRB-01 a PRB-03 |
| T2 Interpolação entre passos | Done | `c21ad90` | ITP-01 a ITP-03, EDG-01 |
| T3 Câmera por tempo | Done | `c79e78d` | CAM-01 a CAM-06, ITP-04 |
| T4 Player na posição interpolada | Done | `b6a9fc1` | ITP-05, EDG-02 |
| T5 Inimigo e chefe interpolados | Done | `f6181ff` | ITP-07 |
| T6 Câmera com o seguidor novo | Done | `8081736` | CAM-07, ITP-06 |
| T7 Smokes | Parcial | `a57759d` | o "Done when" do EDG-02 está marcado `[x]`, mas `feel.smoke.mjs` não tem nenhuma checagem depois de renascer (lacuna 1) |

O cabeçalho de `tasks.md` ainda diz `Status: In Progress` e a rastreabilidade de `spec.md` diz `Implementing` nos 20 IDs.

---

## Gate (rodado)

- `npm run build`: exit 0 (`tsc --noEmit` e `vite build`; só o aviso de chunk > 500 kB que já existia).
- `npm test`: 82 arquivos, **1778 passaram, 0 falharam, 0 pulados**. Antes da feature (fim da `sprite-chefes-e-acabamento`): 1741; delta +37 (collision 2, stepLerp 10, cameraFollow 18, bodyRenderPos 7). Os 5 arquivos de teste tocados (3 novos) só têm acréscimos; `debugApi.test.ts` só ganhou os campos novos no fixture. Nenhuma asserção removida ou afrouxada.
- `npm run smoke` completo: **30 cenários, 29 ok e 1 falha**. A falha foi `armed.smoke.mjs`: `ARM-12: deveria estar segurando a faca` (a faca estava em `rest`, com `vx` 0,775, na hora de pegar). Repeti só ele (`npm run smoke -- armed`): **ok**. É o intermitente conhecido; a pegada usa as distâncias do corpo (`Player.ts:751`), que a feature não mexeu. Não repeti mais vezes para medir a taxa. `heal` passou na rodada completa.
- Smokes novos, os dois verdes na rodada completa: `boss-prop.smoke.mjs` e `feel.smoke.mjs`.
- Árvore real: `git status --porcelain` antes e depois idênticos (só `.agents/ .claude/ .cursor/ .windsurf/ skills-lock.json`, não rastreados). `git stash list` vazio. `git worktree list` sem o scratch.

---

## Checagem ancorada na spec (lido; valores medidos rodando entre colchetes)

Siglas: `col` = `tests/core/collision.test.ts`; `sl` = `tests/core/stepLerp.test.ts`; `cf` = `tests/core/cameraFollow.test.ts`; `brp` = `tests/game/bodyRenderPos.test.ts`; `feel` = `scripts/smoke/feel.smoke.mjs`; `bp` = `scripts/smoke/boss-prop.smoke.mjs`.

| ID | Resultado definido na spec | `file:line` + asserção | Resultado |
| --- | --- | --- | --- |
| PRB-01 | `propThrown` colide com `boss` | `col:45-49` (`it.each` de `propThrown`) `expect(collides(f, Filters.boss)).toBe(true)`. Mutante U1 morre aqui e no smoke `bp` (S1) | PASS |
| PRB-02 | `propSwing` colide com `boss` | `col:47-49`, mesma asserção com `propSwing`. U2 morre | PASS |
| PRB-03 | os dois colidem com `bossAirborne` e continuam sem colidir com `propRest` | `col:50` `collides(f, Filters.bossAirborne) toBe(true)` e `col:51` `collides(f, Filters.propRest) toBe(false)`; os testes pré-existentes `col:32` (`propThrown` x `propRest` false) e `col:41` (`propSwing` x `propRest` false) já cobriam a segunda metade | PASS (ver nota do U15 no sensor) |
| PRB-04 | garrafa arremessada no chefe em `rest`: vida cai exatamente 12 e a garrafa vira `breaking` | `bp:96-99` `expect(s.boss.hp).toBe(maxHp - 12)` e `expect(after.state).toBe('breaking')`; pré-condição do `rest` em `bp:66-77` (chefe parado entre 100 e 240 px). S1 morre aqui [chefe fica com 400/400] | PASS |
| CAM-01 | alvo dentro da zona morta: mesmo centro | `cf:16-18` 5 alvos (centro, as 4 bordas exatas) `expect(followCenter(C, t, CFG, FRAME)).toEqual(C)` | PASS |
| CAM-02 | alvo `d` px além da borda: depois de 1000/60 ms o centro anda `0,15 × d` | `cf:22-31` `toBeCloseTo(615, 10)`, `585`, `256`, `244` (d = 100 e 40); `cf:35-36` um texel além move 0,15, na borda exata não | PASS |
| CAM-03 | 2 quadros de 1000/120 ms levam ao mesmo ponto que 1 de 1000/60, erro <= 1e-6 | `cf:41-44` `Math.abs(two.x - one.x) <= 1e-6` (e em y); `cf:46-47` o ingênuo (lerp por quadro) daria diferença > 1 | PASS |
| CAM-04 | centro entre `bounds.x + view.w/2` e `bounds.x + bounds.w - view.w/2`, e em y | `cf:53-57` `toEqual({ x: 320, y: 180 })`, `{ x: 960, y: 364 }` e dentro; `cf:61-62` o `followCenter` já devolve clampado | PASS |
| CAM-05 | vista maior que os limites num eixo: centro em `bounds.x + view.w/2` | `cf:66-68` `toEqual({ x: 1000, y: 300 })` e `{ x: 330, y: 420 }` (limites deslocados) | PASS |
| CAM-06 | `scrollFor` = centro - metade do canvas, arredondado ao múltiplo mais próximo de `1/zoom` | `cf:74-77` `toBeCloseTo(30/1.5, 10)`, `46/1.5`; `cf:82-83` os dois lados do meio (0,45 vira 0, 0,6 vira 1); `cf:87` zoom 2 | PASS |
| CAM-07 | câmera do mundo com `roundPixels` desligado e sem o `startFollow` do Phaser | `feel:38-39` `s.camera.roundPixels === false` e `s.camera.phaserFollow === false`. A3 e A10 morrem aqui | PASS |
| ITP-01 | `stepAlpha(buffer, passo)` = `buffer/passo - 0,5` limitado a 0..1 | `sl:12-14` `toBeCloseTo(0.5/0.25/0.75, 10)`; `sl:18-23` limites dos dois lados (0, 0+epsilon, 1, 1-epsilon); `brp:30-35` o `renderAlpha` lê `timeBuffer` e `delta` | PASS |
| ITP-02 | `at(alfa)` = `anterior + (atual - anterior) × alfa`; `push` guarda a atual como anterior | `sl:42-44` `toEqual({ x: 2, y: 104 })` em alfa 0,5; `sl:51-53` dois `push` seguidos, `at(0)` = 4 | PASS |
| ITP-03 | `push` de mais de 48 px: `at(alfa)` devolve a posição nova para qualquer alfa | `sl:58-60` 48,001 devolve a nova em alfa 0 e 0,5; `sl:63-65` 48 exatos interpola; `sl:70-71` mede pela distância, não por eixo | PASS |
| ITP-04 | a 220 px/s, zona morta 40, lerp 0,15, zoom 1,5: variação na tela em regime <= 1 px a 60, 75, 120 e 144 Hz | `cf:132-134` `maxScreenJitter(hz, 'novo') <= 1` nas 4 taxas [0,5000, 0,6000, 0,7500 e 0,7083 px]; `cf:136-138` o método antigo passa de 1 [1,5, 4,5, 3,0 e 3,0 px] | PASS (simulação do acumulador do Matter, não o jogo) |
| ITP-05 | correndo, em quadro de um passo, `player.view.x` do snapshot = `anterior + (atual - anterior) × physics.alpha` (±0,01) | `feel:58-67` por quadro com `dx` de cruzeiro: `Math.abs(rows[i].view - expected) <= 0.01`, com `oneStep >= 150` e `alpha` lido do snapshot; A7 e A8 morrem aqui | PASS no que a spec diz; o `view` do snapshot é o getter `renderPos` (`TestScene.ts:1132`), não o sprite (gap 2) |
| ITP-06 | correndo em passo fixo, variação na tela com `player.view.x` e `camera.scroll.x` <= 1 px em regime | `feel:81-87` `worst <= 1` sobre `(view - scroll) × zoom` nos quadros em regime (60 depois de a câmera andar); `feel:77-80` o scroll cai na grade de 1/zoom | PASS (mesma ressalva) |
| ITP-07 | em quadro de um passo, `view.x` do inimigo andando e do chefe na investida = `anterior + (atual - anterior) × physics.alpha` (±0,01) | `feel:96-115` inimigo (30 quadros, `Math.abs(e.view.x - expected) <= 0.01`); `bp:47-61,78` chefe em `charge` (>= 10 quadros) | PASS (mesma ressalva) |
| EDG-01 | `stepAlpha` com passo <= 0 devolve 1 | `sl:27-28` `stepAlpha(10, 0)` e `stepAlpha(10, -5)` `toBe(1)` | PASS |
| EDG-02 | ao renascer, `player.view` está na posição do corpo no primeiro quadro depois do reposicionamento | só `brp:62-74`: `BodyRenderPos.snap()` leva `get()` ao corpo e continua lá depois de um passo. Nenhum teste chama o `Player` renascendo; `Player.ts:432` (`respawn`) e `Player.ts:460` (`resetForRun`) chamam `snap()` sem teste. A6b (apaga a chamada em `resetForRun`) sobrevive à suíte e ao `feel`. Sonda: com A6b, `view` fica 29,3 px do corpo no 1o quadro e 22,7 px no 2o; sem a mutação, 0 | GAP |

**Status**: 19 de 20 com evidência no valor da spec; 1 lacuna de AC (EDG-02). Lacunas de precisão da spec: ver abaixo.

**Julgamento sobre o EDG-02, como pedido**: a evidência não basta. O que o teste de unidade prova é que o mecanismo existe (`snap`); o que a spec pede é um comportamento do player ("quando o player renasce"). Sem uma checagem depois de renascer, o `snap` pode sumir sem teste falhar. O `tasks.md` T7 até lista essa checagem como feita, mas ela não está em `feel.smoke.mjs`. A correção é um bloco curto no `feel`: morrer a uns 30 px do spawn (menos que os 48 px do teleporte, senão o `StepLerp` snapa sozinho e esconde o defeito), recomeçar com J e conferir `|player.view.x - player.x| <= 0,01` nos primeiros quadros. A sonda que escrevi faz exatamente isso (tecla 3 mata, J recomeça), passa no código atual e falha com A6b.

---

## Sensor de discriminação (rodado)

**Isolamento**: `git worktree add` fora do repositório (HEAD `a57759d`), `node_modules` por junction. Mutantes de núcleo: troca textual de um trecho exato e a suíte inteira (`npx vitest run`, 1778 testes). Mutantes de adaptador: `npm run smoke -- <cenário>` dentro do scratch (o runner constrói e serve do diretório onde roda, então o build já contém a mutação). Arquivo restaurado depois de cada um. Junction removida primeiro (`cmd /c rmdir`), depois `git worktree remove --force`; `node_modules` real conferido intacto. Uma primeira tentativa de rodar os mutantes de smoke saiu com dois processos do harness ao mesmo tempo no mesmo scratch; descartei essa saída, matei os dois, restaurei o scratch com `git checkout` (só no scratch) e refiz a rodada sozinha.

**30 mutantes: 22 mortos, 8 sobreviventes.**

### Mortos (22)

| # | Arquivo:linha | Mutação | Quem matou |
| --- | --- | --- | --- |
| U1 | `collision.ts:52` | tira `C.BOSS` de `propThrown` | PRB-01 e PRB-03 (`col:49,50`) |
| S1 | `collision.ts:52` | o mesmo U1, rodado no smoke | `boss-prop`: `PRB-04: a garrafa deveria acertar o chefe` [chefe 400/400] |
| U2 | `collision.ts:51` | tira `C.BOSS` de `propSwing` | PRB-02 (`col:49`) |
| U15b | `collision.ts:52` e `:48` | `propThrown` aceita `PROP` e `propRest` aceita `HITBOX` | PRB-03 (`col:51`) e o teste de "outros objetos" (`col:32`) |
| U3 | `stepLerp.ts:18` | margem: `- (margin - 1)` vira `- margin` | 8 testes, entre eles ITP-01 (`sl:12-14`, `sl:18-23`), `brp:30` e o ITP-04 a 75, 120 e 144 Hz |
| U4 | `stepLerp.ts:37` | `> SNAP_PX` vira `>= SNAP_PX` | ITP-03 (`sl:63-65`, os 48 exatos) |
| U5 | `stepLerp.ts:38` | `prev = this.curr` sempre (sem teleporte) | ITP-03 (`sl:58-60` e `:70-71`) |
| U6 | `stepLerp.ts:38` | `prev = teleport ? next : this.prev` (não avança) | ITP-02 (`sl:51-53`) e ITP-04 (75, 120, 144 Hz) |
| U7 | `stepLerp.ts:10` | `SNAP_PX` de 48 para 49 | ITP-03 (`sl:58-60`) |
| U12 | `stepLerp.ts:18` | tira o teto 1 do alfa | ITP-01 (`sl:21-23`) |
| U13 | `stepLerp.ts:17` | passo inválido devolve 0 em vez de 1 | EDG-01 |
| U8 | `cameraFollow.ts:57` | lerp por quadro (`k = cfg.lerp`, ignora `dtMs`) | CAM-03 (`cf:41-44`) |
| U9 | `cameraFollow.ts:32` | tira o clamp (`return c`) | CAM-04 (2 testes) e CAM-05 |
| U14 | `cameraFollow.ts:31` | tira o `Math.max(min, ...)` de vista maior que o mundo | CAM-05 |
| U10 | `cameraFollow.ts:73` | `Math.round` vira `Math.floor` | CAM-06 (`cf:82-83` e o de zoom 2) |
| U11 | `cameraFollow.ts:60` | zona morta de 40 vira 80 (`deadzone.w` sem `/ 2`) | CAM-02 (2 testes) |
| U16 | `physics.ts:30` | `stepAlpha(runner.delta, runner.timeBuffer)` (argumentos trocados) | `brp:33-35` e `brp:40-52` |
| U17 | `physics.ts:60` | `stop()` solta o evento errado | `brp:76-92` |
| A3 | `TestScene.ts:350` | `setRoundPixels(true)` de volta | `feel`: `CAM-07: roundPixels deveria estar desligado: true` |
| A10 | `TestScene.ts:350` | `startFollow` do Phaser de volta | `feel`: `CAM-07: o startFollow do Phaser não deveria estar ligado` |
| A7 | `physics.ts:51` | `get()` usa alfa 1 em vez de `renderAlpha` | `feel`: `ITP-05: quadro 6: view 127 deveria ser 126.75 (alfa 0.932)` |
| A8 | `physics.ts:46` | assina `beforeupdate` em vez de `afterupdate` | `feel`: `ITP-05: quadro 6: view 120.47 deveria ser 123.98` |

### Sobreviventes (8)

| # | Arquivo:linha | Mutação | Testes rodados | Classificação |
| --- | --- | --- | --- | --- |
| A6b | `Player.ts:460` | `resetForRun` sem `drawPos.snap()` | suíte inteira e smoke `feel` | **sobrevive em comportamento que a spec fixa (EDG-02): FAIL**. A sonda de scratch o mata |
| A6a | `Player.ts:432` | `respawn` sem `drawPos.snap()` | suíte inteira, `feel` e a sonda | mesma lacuna, mas esse caminho (`Health` emite `respawn` com o player vivo de novo, `Player.ts:321`) não rodou no fluxo da run nem na sonda: depois da morte vem `gameOver` e o player continua morto, sem respawn automático (`run-loop.smoke.mjs:212-219`); precisa de teste no nível do player |
| A1 | `Player.ts:208-211` | `placeView` usa o corpo (`sprite.x/y`) em vez de `renderPos` | suíte inteira e `feel` | lacuna de precisão 2: o sprite desenhado volta a andar em degraus e nada falha |
| A4 | `Enemy.ts:617-618` | sprite do inimigo comum na posição do corpo | suíte inteira e `feel` | lacuna de precisão 2 |
| A5 | `Boss.ts:363-364` | sprite do chefe na posição do corpo | suíte inteira e `boss-prop` | lacuna de precisão 2 |
| A2 | `TestScene.ts:401` | a câmera segue `player.sprite` (corpo) em vez de `renderPos` | suíte inteira e `feel` | benigno: num modelo meu da simulação do ITP-04 a variação é idêntica seguindo o corpo ou o desenho (0,5, 0,6, 0,75 e 0,708 px), porque o lerp da câmera filtra o degrau. Não infringe o ITP-04; é só uma escolha de projeto sem rede |
| A11 | `Player.ts:380` | objeto na mão segue o corpo em vez do desenho | suíte inteira e `held-item` | nenhum AC fixa o objeto na mão (está só nas Assumptions e no T4) |
| U15 | `collision.ts:52` | só `propThrown` aceita `PROP` | suíte inteira | **equivalente**: `collides` exige os dois lados (`collision.ts:65`) e `propRest` não aceita `HITBOX`; o U15b, que muda os dois lados, morre |

Mortos pelo smoke e pelo teste de unidade, como pedido: o U1 morre em `collision.test.ts:49` e o S1 morre no `boss-prop`.

---

## Revisão pedida (a): `BodyRenderPos` e a margem 1,5 do Matter do Phaser 3.90 (lido, e uma checagem rodada)

A afirmação do autor confere. Fontes em `node_modules/phaser` (versão 3.90.0, `package.json:3`):

- `src/physics/matter-js/lib/core/Runner.js:25` `Runner._timeBufferMargin = 1.5`; `:38` e `:45` o `runner.delta` (1000/60) e o `runner.timeBuffer`. Rodei `node -e` carregando esse módulo: `margin 1.5 delta 16.67`.
- `src/physics/matter-js/World.js:1229-1233` o `update` soma o tempo do quadro em `timeBuffer` e limita a `frameDelta + engineDelta × margem`; `:1245` `while (engineDelta > 0 && timeBuffer >= engineDelta × margem)` dá um passo; `:1251` `timeBuffer -= engineDelta`. Logo, depois de qualquer passo sobram de 0,5 a 1,5 passo, e sem passo o buffer só cresce, até 1,5: o alfa `buffer/passo - 0,5` fica em 0..1.
- `:1262` com o orçamento estourado (`maxUpdates` ou `maxFrameTime`) o laço sai com o buffer ainda acima de 1,5 passo: o alfa trava em 1 pelo limitador (desenha o último passo, correto), mas isso não está comentado em `stepLerp.ts`.
- `:633-635` o evento `afterUpdate` do Matter vira `afterupdate` no Phaser, uma vez por `Engine.update` (por passo).
- `src/physics/matter-js/MatterPhysics.js:434` `world.update` roda no evento `UPDATE` da cena, antes do `update()` da própria cena; por isso o `timeBuffer` que `renderAlpha` lê em `TestScene.update` e em `Player.update` já é o do fim do passo deste quadro, e o alfa não muda dentro do quadro.
- A câmera lenta (`TestScene.ts:1332`, `engine.timing.timeScale`) não mexe na cadência dos passos, então o alfa continua valendo.

Ressalvas:

1. **A constante duplica um campo privado do Phaser** (`_timeBufferMargin`) e nada a prende ao Phaser. O teste `sl:7-9` só confere `STEP_BUFFER_MARGIN === 1.5`, e os smokes usam o mesmo `stepAlpha` para o esperado e para o real (o `physics.alpha` do snapshot vem de `renderAlpha`), então uma troca de versão do Phaser que mude a margem passaria batida e o movimento voltaria a tremer sem teste falhar. Barato de prender: o `Runner.js` carrega em Node puro (rodei), então um teste de unidade pode importar o módulo e comparar `Runner._timeBufferMargin` com `STEP_BUFFER_MARGIN`.
2. O comentário de `stepLerp.ts:3-6` ("depois do passo sobram de 0,5 a 1,5") vale só depois de um passo; antes do primeiro passo o buffer é 0 e o alfa sai 0 pelo limitador. Sem efeito.
3. `renderAlpha` lê `runner.timeBuffer` e `runner.delta` por um `as unknown as` (`physics.ts:29`), porque os tipos do Phaser não os declaram. Aceitável.

## Revisão pedida (b): o que ainda se posiciona pelo corpo enquanto o dono desenha na posição interpolada (lido)

O que o sprite visível usa `drawPos`: sprite do player (`Player.ts:208`), objeto na mão (`:380`), sprite, barras, estrela de quebra e arma do inimigo (`Enemy.ts:481,496,570,617`) e sprite do chefe (`Boss.ts:363`). O rastro de imagens (`fx.afterimage(v)`, `Player.ts:618,637,658,685`), a silhueta do Kokusen (`fxSprite`) e a ponta do dedo do Vermelho (`TechRunner.ts:404`, lê `player.view.x/y`, o sprite) copiam o sprite e acompanham.

Sobra, pelo corpo:

1. **Auras de técnica** (`TestScene.ts:485` `aura.update(..., player.sprite.x, y)` e `:487` `kokusenFx.zoneAura(..., player.sprite.x, y)`). É o caso mais visível: a aura da zona do Kokusen fica ligada enquanto o player anda; o sprite vem até 1 passo atrás do corpo (até 3,7 px de mundo, cerca de 5,5 px de tela, a 220 px/s) e a aura anda em degraus de 60 Hz. Nos 120 e 144 Hz é o mesmo tremor que a feature tira do sprite, agora na aura. A aura de carga (`castLock`) provavelmente não aparece, porque o player parado coincide com o corpo (não conferi se ele para de fato). Você disse que deixou de propósito; fica registrado como a pendência mais visível.
2. **Soltura do objeto** (`Player.ts:715` `prop.release(this.sprite.x, ...)`, `:423` e `:456` `holderGone`): o objeto sai do corpo, mas na mão ele era desenhado no ponto interpolado. Salto de até 1 passo no instante do arremesso (baixo).
3. Nascimento do ragdoll (`Enemy.ts:684`), poeira (`Player.ts:406`), faíscas (`Player.ts:268`, `Enemy.ts:346`) e números de dano: nascem uma vez no corpo; desvio de até 1 passo, sem tremor depois.
4. Os bonecos do laboratório (`FxLab.ts:84`) usam o corpo no sprite deles, de forma consistente, e não fazem parte desta feature.

---

## Code Quality (lido, com build e typecheck rodados)

| Princípio | Status |
| --- | --- |
| Nada além do pedido | OK: núcleo puro, adaptadores e snapshot só o necessário; nenhuma velocidade, hitbox ou tuning mudou |
| Sem abstração de uso único | OK: `StepLerp`/`BodyRenderPos` servem 3 donos; `followCenter`/`clampCenter`/`scrollFor` são os 3 passos do seguidor |
| Só arquivos necessários | OK: 6 de `src/game` e cena, 3 de núcleo, 5 testes e 2 smokes |
| Código morto | OK: `noUnusedLocals` e `noUnusedParameters` passam no build |
| Estilo dos vizinhos | Em geral OK: comentários em português com o ID, dados puros em `src/core`, `satisfies` mantido em `collision.ts`. Duas notas abaixo |
| Testes mapeiam ACs, limiares dos dois lados | OK no núcleo: cada AC tem o limite dos dois lados (L-010: `sl:18-23`, `sl:58-65`, `cf:35-36`, `cf:82-83`). Fraco no adaptador (lacunas 1 e 2) |
| Todo teste novo mapeia a AC, borda ou Done-when | OK |
| Diretrizes | `vitest.config.ts`; `.specs/STATE.md` AD-001/003; L-010; L-043. L-043 ("testar a chamada do adaptador que repassa a config ao motor") é justamente o que falta para o `snap()` e o `placeView` |

Notas de qualidade:

- **Doc órfã em `Enemy.ts:210-211`**: o getter `renderPos` foi inserido entre o comentário `/** Posição + tamanho do corpo ... */` e o `hurtRect()`; `hurtRect` ficou sem doc e o comentário velho ficou em cima do doc novo. Baixa; mover o getter para antes.
- `BodyRenderPos` assina `scene.events.once('shutdown', ...)` por corpo e `stop()` não o remove: cada inimigo nascido deixa um `once` até o fim da cena. É o mesmo padrão que `Player` e `Enemy` já usam para o `beforeupdate`; baixa.
- `debugApi.ts` / `TestScene.ts:1234` lê `cameras.main._follow` por cast (campo privado do Phaser) para `phaserFollow`. Frágil mas só no debug.
- Cada `drawPos.get()` aloca um objeto; o inimigo chama até 4 vezes por quadro. Sem impacto medido.
- A ordem do import em `Player.ts` (`bodyOf, BodyRenderPos, PX_PER_S_TO_STEP`) difere da de `Enemy.ts` e `Boss.ts`. Cosmético.

---

## Edge Cases

- [x] EDG-01: `stepAlpha` com passo <= 0 devolve 1 (`sl:27-28`; U13 morre).
- [ ] EDG-02: **não coberto no nível do player**, ver lacuna 1.

---

## Lacunas de precisão da spec (não mudam o veredito sozinhas)

1. **O que "view" mede** (ITP-05, ITP-06, ITP-07; mutantes A1, A4, A5). Os três ACs fixam o `view` do snapshot, e o snapshot lê o getter `renderPos` (`TestScene.ts:1132,1152,1172`), o mesmo que o sprite deveria usar. Se o sprite voltar para o corpo (o defeito original), nenhum teste vê. Sugestão: o snapshot lê a posição real do sprite Phaser (`view.x`, e `view.y - altura/2`), ou a spec diz que o AC é sobre o getter.
2. **Câmera no adaptador** (A2). A spec diz que segue a posição de desenho (Assumptions), mas nenhum AC distingue seguir o corpo; o modelo mostra que a métrica do ITP-04 e do ITP-06 não muda. Escolha de projeto sem rede; sem ação obrigatória.
3. **Objeto na mão** (A11): "quem interpola" inclui o objeto na mão, sem AC.
4. **Passo duplo no harness**: o harness (`step(ms)`) só dá um passo por quadro, então o alfa fica constante e nada acima de 60 Hz pode ser testado no jogo; o ITP-04 é uma simulação do acumulador, não o jogo. Dito na spec (Assumptions), mas vale registrar como o limite do que os smokes provam.
5. **ITP-05 a ITP-07 por heurística**: os smokes acham o "quadro de um passo" por `dx` constante, não pelo número de passos. Funciona (mínimo de 150, 30 e 10 quadros) mas não é o termo da spec.

---

## Lacunas ordenadas por severidade

1. **EDG-02 sem teste do player** (bloqueia): `Player.ts:460` e `:432` (`drawPos.snap()`), `scripts/smoke/feel.smoke.mjs` (falta o bloco). Correção: um bloco no `feel` que morre a ~30 px do spawn e confere o `view` nos primeiros quadros depois de J.
2. **O sprite desenhado não é observado** (precisão, alta para o objetivo do usuário): `TestScene.ts:1132,1152,1172` e `Player.ts:208`, `Enemy.ts:617`, `Boss.ts:363`.
3. **Margem 1,5 sem contrato com o Phaser**: `src/core/stepLerp.ts:7`; teste que carrega `Runner.js` e compara.
4. **Aura de técnica pelo corpo**: `TestScene.ts:485,487`.
5. Doc órfã: `Enemy.ts:210-211`.
6. `tasks.md` com `Status: In Progress` e T7 com o EDG-02 marcado sem o teste; `spec.md` com `Implementing` nos 20 IDs.
7. `armed` intermitente (1 falha, 1 ok na repetição): conhecido, sem relação com a feature.

---

## Interactive UAT

Fora do escopo do Verifier; o usuário está testando. O que os smokes não podem dizer: se o tremor sumiu a 75, 120 e 144 Hz num monitor de verdade (o harness dá um passo por quadro).

---

## Lições candidatas (para o orquestrador registrar; não registrei, só criei este arquivo)

- Quando o AC fixa um campo de snapshot que o adaptador calcula pelo mesmo getter que usa para desenhar, o teste não vê a ligação entre o getter e o objeto desenhado (A1, A4, A5): o snapshot deve ler o objeto real, ou o AC deve dizer que mede o getter.
- Um edge case de adaptador ("ao renascer", "ao trocar") precisa de um cenário em que a posição antiga difira da nova por menos que o limiar de teleporte, senão o mecanismo automático esconde a chamada que falta (A6b: morrer a 29 px do spawn expõe o defeito, a 0 px não).
- Constante copiada de um campo privado de biblioteca (`_timeBufferMargin`) pede um teste de contrato que carregue a biblioteca; se o esperado e o real dos smokes saem da mesma função, o smoke não prova a função.
- Um "Done when" marcado `[x]` numa task de smoke deve apontar `file:line` da checagem; aqui o EDG-02 estava marcado e ausente.

---

## Atualização de rastreabilidade (a aplicar pelo orquestrador; `spec.md` não foi editado)

| Requisito | Status anterior | Novo status |
| --- | --- | --- |
| PRB-01, PRB-02, PRB-03, PRB-04 | Implementing | Verified |
| CAM-01, CAM-02, CAM-03, CAM-04, CAM-05, CAM-06, CAM-07 | Implementing | Verified |
| ITP-01, ITP-02, ITP-03, ITP-04 | Implementing | Verified |
| ITP-05, ITP-06, ITP-07 | Implementing | Verified (com a lacuna de precisão 1) |
| EDG-01 | Implementing | Verified |
| EDG-02 | Implementing | Needs Fix |

---

## Summary

**Overall**: Não pronto (FAIL), por uma lacuna de AC pequena.

**Spec-anchored check**: 19 de 20 com evidência no valor da spec; 1 lacuna de AC (EDG-02) | 5 lacunas de precisão
**Gate**: build ok; 1778 testes passaram, 0 falharam; smoke completo 29 de 30 (o `armed` caiu e passou na repetição)
**Sensor**: 30 mutantes, 22 mortos, 8 sobreviventes: 1 em comportamento fixado (A6b), 1 equivalente (U15), os outros 6 sem AC ou benignos
**Isolamento**: `git status --porcelain` da árvore real idêntico ao baseline; scratch removido (junction primeiro)

**O que funciona**: `propThrown` e `propSwing` acertam o chefe, no chão e no salto, e a garrafa tira exatamente 12 e quebra no jogo; o seguidor da câmera é por tempo, em ponto flutuante, com o scroll na grade de pixel de tela; a interpolação entre passos bate com `anterior + (atual - anterior) × alfa` nos três corpos; `roundPixels` e o `startFollow` do Phaser estão desligados; a margem 1,5 confere com o Matter do Phaser 3.90.

**Próximos passos**: (1) acrescentar o bloco do EDG-02 ao `feel.smoke.mjs` e repetir a verificação só do EDG-02 (sonda pronta no scratch, descrita acima); (2) decidir sobre o snapshot ler o sprite (lacuna 2) e o teste de contrato da margem; (3) UAT do usuário.

---

## Rodada 2

**Data**: 2026-10-03
**Branch**: `feat/movimento-suave-e-objetos-no-chefe`, HEAD `8f4e7f1`
**Diff range**: `a57759d..HEAD`: 4 commits (`0301273` relatório da rodada 1, `399f013` spec e tasks, `ab6388c` código e testes, `8f4e7f1` lições L-055 a L-058). Em `src/`: `Player.ts`, `Enemy.ts`, `Boss.ts` (getters `spritePos`; `placeView()` ao renascer), `TestScene.ts` (aura e snapshot), `techFx/Aura.ts` (getter `pos`) e `debugApi.ts` (campo `fx.aura`). Em `tests/`: `matterRunnerContract.test.ts` (novo) e o fixture de `debugApi.test.ts`. Em `scripts/smoke/`: `feel.smoke.mjs` (+84 linhas, só acréscimos). `collision.ts`, `stepLerp.ts`, `cameraFollow.ts`, `physics.ts` e `boss-prop.smoke.mjs` não mudaram.
**Verifier**: o mesmo Verifier independente (autor != verificador). Nenhum código nem teste foi alterado; a árvore real só ganha estas linhas.
**Escopo**: o que o orquestrador pediu: evidência de EDG-02, ITP-05, ITP-07, ITP-08, ITP-09 e ITP-10, conferência rápida do resto, gate, sensor sobre os sobreviventes da rodada 1 mais mutantes novos, a opinião sobre o `enemy-react` e a rastreabilidade dos 23 IDs.

Veredito da rodada 2: PASS. Os 6 IDs alterados ou novos têm evidência `file:line` no valor da spec; build, 1780 testes e os 30 smokes passam; dos 8 sobreviventes da rodada 1 só sobrevive um, equivalente (código inalcançável). Nenhum mutante sobrevive em comportamento fixado por AC.

### Evidência dos IDs alterados ou novos (lido; os valores dos mutantes foram rodados)

| ID | Resultado definido na spec | `file:line` + asserção | Resultado |
| --- | --- | --- | --- |
| EDG-02 | player morre a menos de 48 px do spawn, a run recomeça: `player.view` no corpo (±0,01) em cada um dos 3 primeiros quadros da run nova | `scripts/smoke/feel.smoke.mjs:179-181` pré-condição `away > 15 && away < 48`; `:182-185` Digit3 mata, J recomeça; `:187-196` nos 3 primeiros quadros em `roundActive`: `Math.abs(s.player.view.x - s.player.x) <= 0.01` e o mesmo em y, mais `Math.abs(s.player.x - spawnX) < 1`; `:197` `fresh === 3`. A6b e N1 morrem aqui (sprite a 35 px e a 46 px do corpo no quadro 0) | PASS |
| ITP-05 | correndo, em quadro de um passo, `player.view.x` = `anterior + (atual - anterior) × physics.alpha` (±0,01), com `view` = o sprite desenhado de fato (Glossário novo) | `feel.smoke.mjs:58-67` (inalterado) agora lê `view` de `Player.spritePos` (`Player.ts:208-210`: `{ x: this.view.x, y: this.view.y - SIZE.player.h / 2 }`, ligado em `TestScene.ts:1134`), ou seja, a posição do `Phaser.GameObjects.Sprite`. A1 (sprite no corpo) morre aqui: `view 125,67 deveria ser 123,83` | PASS |
| ITP-07 | `view.x` do inimigo andando e do chefe na investida = `anterior + (atual - anterior) × physics.alpha` (±0,01) | `feel.smoke.mjs:165-167` (inimigo) e `boss-prop.smoke.mjs:47-61,78` (chefe), agora sobre `Enemy.spritePos` (`Enemy.ts:211-213`, `TestScene.ts:1154`) e `Boss.spritePos` (`Boss.ts:139-141`, `TestScene.ts:1174`). A4 e A5 morrem aqui | PASS |
| ITP-08 | correndo com a cadeira na mão, o x dela no snapshot = `player.view.x - 8 × facing` (±0,01) | `feel.smoke.mjs:92-126`: pega a cadeira, corre para a esquerda e, nos quadros em regime (`i >= 10`), `expect(held.x - (s.player.view.x - 8 * s.player.facing)) <= 0.01` (`:113-114`), com `heldFrames >= 20` (`:118`). A11 (objeto no corpo) morre: `cadeira em 218,67, deveria estar em 221,28` | PASS (só o sentido `facing = -1`; a fórmula é linear no `facing`, então inverter o sinal do encaixe também seria pego) |
| ITP-09 | `STEP_BUFFER_MARGIN` igual ao `_timeBufferMargin` do `Runner` do Matter do Phaser instalado | `tests/game/matterRunnerContract.test.ts:15-17` lê o texto de `Runner.js` instalado, `match(/Runner\._timeBufferMargin\s*=\s*([\d.]+)\s*;/)` não nulo e `expect(Number(match![1])).toBe(STEP_BUFFER_MARGIN)`; `:21-22` fixa também o laço do `World.js` (`while (... timeBuffer >= engineDelta * MatterRunner._timeBufferMargin)` e `timeBuffer -= engineDelta`) | PASS |
| ITP-10 | com a aura de conjuração visível e o player correndo, `fx.aura.x` = `player.view.x` (±0,01) | `feel.smoke.mjs:128-145`: tecla 1 do fxlab com o player correndo, por quadro com aura: `Math.abs(s.fx.aura.x - s.player.view.x) <= 0.01` e o mesmo em y (`:138-141`, mais estrito que a spec), com `auraFrames >= 8` (`:145`). Fonte: `Aura.pos` (`Aura.ts:47-49`, o sprite da aura) em `TestScene.ts:1227`; a aura segue `renderPos` (`TestScene.ts:486-487`). N2 e N6 morrem aqui | PASS |

**Os outros 17 IDs (releitura rápida)**: nenhum teste de `collision`, `stepLerp`, `cameraFollow` nem `bodyRenderPos` mudou (o diff de `tests/` só tem o fixture de `debugApi.test.ts` e o arquivo novo), `collision.ts`, `stepLerp.ts`, `cameraFollow.ts` e `physics.ts` ficaram iguais, e a suíte inteira segue verde. PRB-01 a PRB-04, CAM-01 a CAM-07, ITP-01 a ITP-04, ITP-06, EDG-01: sem regressão. O ITP-06 agora também mede o sprite real (usa `player.view`), o que o deixa mais forte.

**Status**: 23 de 23 com evidência no valor da spec; 0 lacunas de AC.

### Fechamento das lacunas da rodada 1

| Lacuna | Situação |
| --- | --- |
| 1. EDG-02 sem teste do player | Fechada: bloco novo em `feel:172-197`; A6b e N1 morrem. A correção também achou um defeito real que a sonda da rodada 1 não pegava: no primeiro quadro da run nova o sprite ficava no ponto da morte (`player.view` a 35 px do corpo, N1); `placeView()` depois de `snap()` o resolve |
| 2. Sprite desenhado não observado | Fechada: o snapshot lê `spritePos`; A1, A4 e A5 morrem |
| 3. Margem 1,5 sem contrato com o Phaser | Fechada: `matterRunnerContract.test.ts` (ver abaixo, rodei três deriva) |
| 4. Aura pelo corpo | Fechada para a aura de conjuração (N2, N6 morrem). A aura da zona do Kokusen, a poeira, as faíscas de golpe e as hitboxes seguem no corpo, por decisão registrada nas Assumptions da spec |
| 5. Doc órfã em `Enemy.ts` | Fechada: `Enemy.ts:210-217`, o getter novo ficou antes do `hurtRect` e o comentário voltou para ele |
| 6. `tasks.md` / `spec.md` | Aberta, de forma: `tasks.md` ainda tem `Status: In Progress` e `spec.md` tem `Implementing` nos 23 IDs; o orquestrador atualiza depois do UAT |
| 7. `armed` intermitente | Passou na rodada completa desta vez |

### Gate (rodado)

- `npm run build`: exit 0 (só o aviso de chunk > 500 kB que já existia).
- `npm test`: 83 arquivos, **1780 passaram, 0 falharam, 0 pulados**. Contra os 1778 da rodada 1: +2 (os dois testes do contrato). Contra a base da feature (1741): +39.
- `npm run smoke -- feel`: ok. `npm run smoke -- boss-prop`: ok.
- `npm run smoke` completo, uma vez e sozinho: **30 cenários, 30 ok**. `heal`, `armed` e `enemy-react` passaram na rodada, então não houve o que repetir.
- Árvore real: `git status --porcelain` antes e depois idênticos (só `.agents/ .claude/ .cursor/ .windsurf/ skills-lock.json`, não rastreados). `git stash list` vazio. `git worktree list` sem o scratch.

### O `enemy-react` e a câmera nova: a flake pode ser culpa da feature?

Minha opinião: provavelmente não, é o problema de tempo do harness. Dados e raciocínio:

- **Dados**: neste ambiente `enemy-react` passou 5 de 5 (1 na rodada completa, 4 sozinhas em scratch no HEAD; rodado). Não vi nenhuma falha, então não tenho como comparar com a base. Somando o que o orquestrador viu (1 falha em rodada completa, 3 de 3 sozinhas), a taxa é baixa e ainda não atribuível.
- **O que a feature não mexe**: o `enemy-react` lê `x`, `hp` e `move` do corpo (`land()` em `enemy-react.smoke.mjs:125`: `until(cur, (x) => byId(x, id).hp < hp0, 40, 'socoBaixo deveria acertar')`). Física, hitboxes, golpes e IA ficaram iguais; a interpolação e o `renderPos` só mexem no sprite, nas barras e na câmera.
- **O único caminho da feature até a lógica** é a câmera: `pickEnemySpawnPoint` escolhe o ponto de nascimento com o `worldView` da câmera (`TestScene.ts:983-989`). O `worldView` agora depende de `renderPos` e, portanto, do alfa, que o harness deixa variar de uma execução para outra (a sobra do acumulador do Matter depende do loop em tempo real antes do primeiro `step`; está nas Assumptions da spec). Isso poderia mudar um ponto de nascimento só se ele estivesse a poucos px da borda da vista mais a margem. Com o player parado no começo, `renderPos` é o corpo qualquer que seja o alfa, então a janela de risco é pequena (só depois de o player andar). É possível, mas improvável, e eu não vi caso.
- **A explicação mais provável** é a conhecida, o tempo do harness (inferência por leitura de `debugApi.ts:280-292` e `World.js:1198-1215`, não medi): o `step(ms)` entrega quadros de exatamente 1000/60 ms, mas o Matter suaviza o delta com um histórico dos últimos 100 quadros (`frameDeltaHistory`), que no começo ainda guarda os quadros reais de antes do `step`. Enquanto o histórico se renova, alguns quadros do harness têm 0 ou 2 passos de física, e a posição relativa entre o player e o inimigo na hora do golpe muda de uma execução para outra. É o tipo de variação que faz "socoBaixo deveria acertar" errar o alcance por poucos pixels, e vale para qualquer feature.
- Para fechar a dúvida sem custo na feature, daria para comparar 15 ou 20 execuções na base e no HEAD; com 5 de 5 não há falha para comparar. Não fiz.

### Sensor de discriminação (rodado)

**Isolamento**: `git worktree add` fora do repositório (HEAD `8f4e7f1`), `node_modules` por junction; mutantes de núcleo com a suíte inteira, mutantes de adaptador com `npm run smoke -- <cenário>` dentro do scratch (o runner constrói e serve do diretório onde roda). Uma instância do harness por vez. Junction removida primeiro (`cmd /c rmdir`), depois `git worktree remove --force`; `node_modules` real conferido intacto.

**15 mutantes: 14 mortos, 1 sobrevivente.**

#### A. Os sobreviventes da rodada 1, de novo

| # | Arquivo:linha | Mutação | Resultado |
| --- | --- | --- | --- |
| A1 | `Player.ts:213-216` | `placeView` usa o corpo em vez de `renderPos` | MORTO por `feel`: `ITP-05: quadro 6: view 125,67 deveria ser 123,83` |
| A4 | `Enemy.ts:617-618` | sprite do inimigo comum na posição do corpo | MORTO por `feel`: `ITP-07: inimigo 6: view 1196,34 deveria ser 1197,23` |
| A5 | `Boss.ts:363-364` | sprite do chefe na posição do corpo | MORTO por `boss-prop`: `ITP-07: chefe: view 1217,60 deveria ser 1220,21` |
| A6b | `Player.ts:468` | `resetForRun` sem `drawPos.snap()` | MORTO por `feel`: `EDG-02: quadro 0 da run nova: sprite em x 147,3, corpo em 112` |
| A11 | `Player.ts:385` | objeto na mão segue o corpo | MORTO por `feel`: `ITP-08: cadeira em 218,67, deveria estar em 221,28` |
| A6a | `Player.ts:438` | `respawn` sem `drawPos.snap()` | SOBREVIVEU, equivalente: ver abaixo |

**A6a é inalcançável.** `Player.ts:148-149` cria o `Health` com `respawnMs: Infinity` ("fora de run não existe mais respawn, só `resetForRun`"), então o evento `respawn` nunca sai e `Player.respawn()` não roda em nenhum fluxo. O método (com o `snap()` e o `placeView()` que ganhou) é código morto; nota de qualidade, não lacuna.

#### B. Mutantes novos

| # | Arquivo:linha | Mutação | Resultado |
| --- | --- | --- | --- |
| N1 | `Player.ts:469` | tira o `placeView()` de `resetForRun` (deixa o `snap()`) | MORTO por `feel`: `EDG-02: quadro 0 da run nova: sprite em x 158, corpo em 112` (o sprite fica fora do corpo no quadro 0) |
| N2 | `TestScene.ts:486-487` | a aura de conjuração segue `player.sprite` (corpo) de novo | MORTO por `feel`: `ITP-10: aura em x 149,33, sprite em 147,11` |
| N6 | `Aura.ts:48` | `Aura.pos` devolve sempre `null` | MORTO por `feel`: `ITP-10: ... pelo menos 8 quadros ...: 0` |
| N5 | `Player.ts:209` | `spritePos` sem a conversão `- altura/2` | MORTO por `feel`: `parado, view deveria ser o corpo: view y 480, corpo y 462` |
| N3 | `stepLerp.ts:7` | `STEP_BUFFER_MARGIN` de 1,5 para 1 | MORTO (suíte inteira, 7 testes: o do `STEP_BUFFER_MARGIN`, ITP-01, `renderAlpha` e o contrato) |
| N4 | `stepLerp.ts:7` | `STEP_BUFFER_MARGIN` de 1,5 para 2, só o arquivo do contrato | MORTO por ITP-09 (`matterRunnerContract.test.ts:17`) |

#### C. Deriva do Phaser contra o teste de contrato (cópias em scratch, sem tocar o `node_modules`)

O `node_modules` do scratch é uma junction para o real, então não mutei o Phaser instalado. Copiei `Runner.js` e `World.js` para o scratch, gerei uma cópia do teste de contrato apontando para as cópias e rodei quatro variantes:

| Variante | Resultado |
| --- | --- |
| controle (cópias idênticas ao instalado) | passa, 2 de 2 |
| `_timeBufferMargin = 2` | MORTO: `STEP_BUFFER_MARGIN é igual ao _timeBufferMargin do Runner` |
| laço do `World` sem a margem (`timeBuffer >= engineDelta`) | MORTO: o segundo teste do contrato |
| `timeBuffer -= engineDelta * 2` | MORTO: o segundo teste do contrato |

**Resultado**: 15 mutantes, 14 mortos, 1 sobrevivente (A6a, inalcançável); mais 1 controle. Nenhum sobrevivente em comportamento fixado por AC.

### Code Quality da rodada 2 (lido, com build rodado)

| Princípio | Status |
| --- | --- |
| Nada além do pedido | OK: os getters `spritePos`, o `Aura.pos`, o campo `fx.aura` e o teste de contrato são o que as lacunas pediam; nenhuma física nem tuning mudou |
| Estilo dos vizinhos | OK: comentários em português com o ID, `?raw` do Vite no teste por falta de tipos de Node, `/// <reference types="vite/client" />` no topo |
| Código morto | Uma nota: `Player.respawn()` é inalcançável (`respawnMs: Infinity`, `Player.ts:148-149`); a feature acrescentou `snap()` e `placeView()` nele. Remover o método ou dizer que é legado |
| Testes mapeiam ACs | OK: cada bloco novo cita o ID; os mutantes do ITP-08, ITP-10, EDG-02 e ITP-09 morrem nos testes certos |
| Contrato com o Phaser | OK, com a ressalva de ser textual: o teste lê o código-fonte instalado por expressão regular, não executa o `Runner`. Falha fechado: se o Phaser reescrever a linha, o primeiro teste diz "não encontrado" em vez de passar |
| Duplicação | Baixa: `spritePos` repete a conversão `± altura/2` do posicionamento nos três donos (`Player.ts:209`, `Enemy.ts:212`, `Boss.ts:140`); `placeView` é a única fonte no player |
| Lições L-055 a L-058 | Conferi o texto (`.specs/LESSONS.md`): batem com as lacunas da rodada 1; não afetam o veredito |

### Lacunas restantes (todas informativas, nenhuma bloqueia)

1. `Player.respawn()` é código morto (A6a): remover ou documentar.
2. ITP-08 só roda com `facing = -1` (`feel:118`); a fórmula é linear no `facing`, risco baixo.
3. As faíscas da zona do Kokusen, a poeira, a faísca de golpe e as hitboxes seguem no corpo: decisão registrada, sem AC, desvio de até 1 passo.
4. O ponto de soltura do objeto (`Player.ts:724`) sai do corpo enquanto na mão o objeto era desenhado no ponto interpolado: salto de até 1 passo no arremesso; decisão registrada.
5. A câmera seguindo o corpo em vez de `renderPos` (A2 da rodada 1): benigno pela medida do ITP-04; sem rede e sem AC.
6. O harness só dá um passo por quadro, então nada acima de 60 Hz roda no jogo; o ITP-04 continua sendo simulação.
7. `tasks.md` com `Status: In Progress` e `spec.md` com `Implementing` nos 23 IDs.

### Interactive UAT

Continua fora do escopo do Verifier; o usuário está testando. O que os smokes não provam: se o tremor sumiu a 75, 120 e 144 Hz num monitor de verdade.

### Atualização de rastreabilidade (a aplicar pelo orquestrador; `spec.md` não foi editado)

| Requisito | Status anterior | Novo status |
| --- | --- | --- |
| PRB-01 | Implementing | Verified |
| PRB-02 | Implementing | Verified |
| PRB-03 | Implementing | Verified |
| PRB-04 | Implementing | Verified |
| CAM-01 | Implementing | Verified |
| CAM-02 | Implementing | Verified |
| CAM-03 | Implementing | Verified |
| CAM-04 | Implementing | Verified |
| CAM-05 | Implementing | Verified |
| CAM-06 | Implementing | Verified |
| CAM-07 | Implementing | Verified |
| ITP-01 | Implementing | Verified |
| ITP-02 | Implementing | Verified |
| ITP-03 | Implementing | Verified |
| ITP-04 | Implementing | Verified |
| ITP-05 | Implementing | Verified (rodada 2, sprite real) |
| ITP-06 | Implementing | Verified |
| ITP-07 | Implementing | Verified (rodada 2, sprite real) |
| ITP-08 | Implementing | Verified (rodada 2) |
| ITP-09 | Implementing | Verified (rodada 2) |
| ITP-10 | Implementing | Verified (rodada 2) |
| EDG-01 | Implementing | Verified |
| EDG-02 | Implementing | Verified (rodada 2; era Needs Fix) |

23 de 23 verificados (4 PRB, 7 CAM, 10 ITP, 2 EDG).

### Resumo da rodada 2

**Overall**: Pronto (PASS)

**Spec-anchored check**: 6 de 6 IDs alterados ou novos com evidência no valor da spec; 23 de 23 no total | 0 lacunas de AC (restam 7 notas informativas)
**Sensor**: 14 de 15 mortos; o sobrevivente (A6a) é código inalcançável
**Gate**: build ok, 1780 testes passaram, 0 falharam, smoke completo 30 de 30
**Isolamento**: `git status --porcelain` da árvore real idêntico ao baseline; scratch removido (junction primeiro)

**Próximos passos**: UAT do usuário (arremessar cadeira e garrafa no chefe; correr de um lado para o outro, de preferência num monitor de 120 ou 144 Hz); depois marcar os 23 IDs como Verified em `spec.md`, fechar `tasks.md` e mesclar em `dev` com `--no-ff` (AD-008).
