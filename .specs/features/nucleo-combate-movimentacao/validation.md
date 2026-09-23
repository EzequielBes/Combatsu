# Validação — núcleo de combate e movimentação

Fonte de verdade: `docs/superpowers/specs/2026-09-23-nucleo-combate-movimentacao-design.md` (critério de sucesso) e o plano `docs/superpowers/plans/2026-09-23-nucleo-combate-movimentacao.md` (11 tasks, todas concluídas).
Faixa de commits: `fdb9f51..HEAD` (tasks 1–11 + teste de reforço do buffer).
Verificação feita por passada independente da autoria (fallback sem sub-agente), com sensor de discriminação em worktree descartável.

## Validation

**Result**: PASS

Gate final: `npm test` = 10 arquivos, 76 testes, 0 falhas, 0 pulados. `npm run build` (tsc estrito + vite build) sem erros.
Contagem de testes por task: 6, 22, 35, 48, 57, 75 (tasks 1, 2, 3, 5, 6, 9) e 76 após o teste de reforço. Nenhum teste foi removido, pulado ou enfraquecido.

## Critérios do spec com evidência

| Critério (spec) | Resultado esperado | Evidência | Situação |
| --- | --- | --- | --- |
| Personagem corre | velocidade final = `runSpeed` | `tests/core/movement.test.ts:53` — `expect(many.vx).toBe(200)` | ✅ |
| Pulo com altura variável pelo botão | segurar ≫ tocar | `tests/core/movement.test.ts:121` — `expect(full).toBeGreaterThan(tap * 3)` | ✅ |
| Coyote time e jump buffer | pula com tolerância; expira | `tests/core/movement.test.ts:96` — `expect(s.vy).toBe(-400)`; `:112` idem para o buffer | ✅ |
| Combo desarmado leve, leve, forte | 2–3 golpes, só o último forte | `tests/core/combo.test.ts:71` — `toEqual(['light', 'light', 'heavy'])`; `:136` — `expect(PLAYER_COMBO[PLAYER_COMBO.length - 1].strength).toBe('heavy')` | ✅ |
| Golpe com objeto é sempre forte | `heavy` | `tests/core/combo.test.ts:142` — `expect(PROP_SWING.strength).toBe('heavy')` | ✅ |
| Objeto em repouso/segurado/quebrando nunca trava player nem inimigo | sem colisão física | `tests/core/collision.test.ts:9` — `expect(collides(Filters.propRest, Filters.player)).toBe(false)`; `tests/core/props.test.ts:138` — `expect(m.filter).toEqual(Filters.propThrown)` | ✅ |
| Hit nunca atinge o dono | ignorado | `tests/core/hit.test.ts:13` (gate); `tests/core/props.test.ts:139` — `expect(m.tryHit(PLAYER)).toBe(false)` | ✅ |
| Objeto quebra ao atingir a durabilidade; garrafa frágil, cadeira resistente | `broke`; `bottle.durability = 1` | `tests/core/props.test.ts:159` — `expect(m.registerImpact()).toBe('broke')`; `tests/data/props.test.ts:19` — `expect(bottle.durability).toBe(1)` | ✅ |
| Quebrar na mão libera o player | holder nulo | `tests/core/props.test.ts:125` — `expect(m.holderId).toBeNull()` | ✅ |
| Golpe leve = animação; forte = ragdoll | `hitReaction` / `ragdoll` | `tests/core/enemyBrain.test.ts:13` e `:22` | ✅ |
| Morte em ragdoll seguida de dissolução | `died`+`ragdoll`, `dissolve`, `removed` | `tests/core/enemyBrain.test.ts:58`, `:61`, `:63` | ✅ |
| Sem morte dupla nem dano depois de morto | ignora golpes | `tests/core/enemyBrain.test.ts:82` e `:85` — `toEqual([])` | ✅ |
| Um acerto por alvo por golpe (ragdoll multi-peça) | gate bloqueia repetição | `tests/core/hit.test.ts:13` — `expect(gate(2)).toBe(false)` | ✅ |
| Spam de ataque encadeia um golpe por vez, sem combo fantasma | 1 `stepStart`; `comboEnd` no último | `tests/core/combo.test.ts:96`, `:86`, `:100` (reforço) | ✅ |

Lacuna de precisão do spec (não bloqueia): o spec não fixa números de "feel" (altura do pulo, tempos de golpe, dano). Os valores em `src/data/tuning.ts` e `src/data/props.ts` são calibração inicial, ajustável jogando.

## Sensor de discriminação

Scratch: `git worktree` descartável com `node_modules` por junction; junction removido antes do worktree; `git status --porcelain` da árvore real igual ao baseline (a única diferença foi o teste novo).

| Mutação injetada | Situação |
| --- | --- |
| coyote nunca é concedido | morto (5 testes) |
| pulo não é cortado ao soltar o botão | morto (1) |
| objeto em repouso passa a bloquear o player (só uma máscara) | equivalente: o Matter exige as duas máscaras; a versão bilateral foi morta (2) |
| dono pode se acertar | morto (3) |
| mesmo alvo acertado várias vezes por golpe | morto (2) |
| aperto sobrando no último golpe cria combo fantasma | morto (1) |
| buffer nunca é limpo ao iniciar golpe | **sobreviveu** → corrigido com `tests/core/combo.test.ts:100`; mutante morto (1) |
| golpes depois de morto deixam de ser ignorados | morto (1) |
| golpe leve vira ragdoll | morto (3) |
| quebra só com durabilidade + 1 impactos | morto (3) |
| quebrar durante o golpe não solta o holder | morto (1) |
| sólidos vizinhos não são mesclados no parser | morto (1) |

## Camada de adaptadores (`src/game`, `src/scenes`)

Não há testes automatizados nessa camada (decisão do plano: validada jogando). Foi exercitada em Edge headless via Puppeteer, com teclas reais e leitura do estado da cena: pulo (~130 px cheio, teto corta), coyote temporizado por frame (3 frames pula, 9 não), sem pulo duplo, parede sem grudar, câmera no limite da sala, combo de 3 golpes acertando o inimigo (leve 8, leve 8, forte 18), travamento durante o golpe e liberação na janela, spam sem travar, ataque no ar com queda contínua, um soco em ragdoll de 6 peças = 1 acerto, pegar/golpear/quebrar/arremessar cadeira e garrafa, arremesso encostado na parede (objeto cai a ~30 px em espaço livre), largar no ar, reinício da cena 5 vezes sem erro e sem listener duplicado. Nenhum erro de página no console (o único aviso é um 404 de favicon).

## Desvios em relação ao plano (registrados no plano)

1. `Player.touchesTerrain` e `findPickup` usam posição + tamanho do sprite em vez de `body.bounds`: o Matter alarga o AABB pela velocidade do frame e a parede virava teto/chão, cancelando o pulo (Task 4 e 10).
2. `SPAWN_LIFT` 4 → 2 (o player nascia 2 px flutuando).
3. Quebrar o objeto na mão cancela o golpe com objeto para o player ficar livre na hora (Task 10, Review Focus #2).

## Não verificado por mim

A avaliação de "feel" e o checklist "Critério de sucesso da demo" do `README.md` são julgamento humano e ficaram desmarcados de propósito. Ragdoll, dissolução e o visual em geral foram conferidos por estado e captura de tela, não por jogo real.
