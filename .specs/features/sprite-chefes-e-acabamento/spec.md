# Chefes desenhados e acabamento de golpes e objetos — Specification

## Problem Statement

O usuário pediu "melhore sprites" (03/10), sem apontar um alvo. A leitura das pranchas achou três buracos, em ordem de impacto:

- **Chefes.** O Oni e a Tecelã são retângulos montados por `block()`, com 1 frame por estado e 118 texels `k` internos no `idle`. O preparo da investida e o da rajada são idênticos pixel a pixel, e os dois ataques também: não dá para ler qual golpe vem. Projétil e onda de choque são retângulos.
- **Golpes do player.** Braço e perna esticados (`armStraight`, `legStraight`) têm a mesma espessura do ombro à ponta e leem como canos. No `chuteAlto-hit` a perna sai da cabeça, não do quadril.
- **Objetos e pendências.** Cadeira, garrafa, faca e porrete são chapados (2 tons). Seguem abertas as pendências do UAT dos inimigos: borda branca do `impact` do bruto sobre os chifres, punho do bruto em bloco e, no rastejante, `hurt-uppercut` parecido com `hurt-head-a`.

Player e inimigos comuns já passaram por polimento (`sprite-player-polish`, `enemy-sprite-variety`, F10). Os chefes nunca passaram.

## Goals

- [ ] Os dois chefes têm desenho com volume (rampa de 4 tons, sel-out) e os três preparos se distinguem entre si e do `idle`.
- [ ] Os chefes se mexem: `idle` respirando em 4 frames e preparo, ataque, rugido e atordoamento em 2 frames.
- [ ] Soco e chute esticados têm antebraço e canela mais finos que o punho e o pé, sem mudar alcance nem bbox.
- [ ] Objetos com mais de 2 tons e as três pendências dos inimigos fechadas.
- [ ] Nenhuma física, hitbox, tuning ou tamanho de frame muda. A paleta continua com 42 cores.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Silhueta própria para a Tecelã | Contraria o BTIER-06 (mesma grade, outro mapa de cores). Trocar isso é decisão do usuário; aqui ela ganha um mapa de cores mais rico |
| Aumentar a resolução dos personagens | AD-012: sem mudar proporção nem frame; mexeria em mais de 100 frames e nos testes de alcance |
| Arte externa (PNG) ou gerada por IA | AD-002: grades de texto com a paleta única |
| Frames novos de golpe, de inimigo ou de técnica | O pedido é melhorar o que existe |
| Fragmento, gota de cura, tiles, fundo, kanji e VFX de técnica | Já têm rampa e leitura boas; fora dos três buracos acima |
| `tools/sprite-preview.mjs` para chefes e objetos | Ferramenta, não sprite; as pranchas antes/depois desta feature saem de um script avulso |
| Mudar tempos de preparo, dano ou IA do chefe | A feature é só visual |

---

## Glossário

- **texel opaco**: caractere da grade diferente de `.`.
- **k interno**: texel `k` cujos 4 vizinhos (cima, baixo, esquerda, direita) estão dentro do frame e são opacos (mesma métrica do SPR-03).
- **diferença entre dois frames**: posições em que os dois frames têm caracteres diferentes, dividido pelas posições em que pelo menos um dos dois é opaco.
- **componente**: conjunto 8-conexo de texels opacos.
- **cor dominante**: a chave mais frequente do frame, sem contar `k`.
- **perfil de uma coluna**: quantidade de texels opacos naquela coluna da parte.
- **caixa opaca**: menor retângulo que contém todos os texels opacos do frame.

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Alvo do pedido "melhore sprites" | Os três buracos do Problem Statement, na ordem: chefes, golpes do player, objetos e pendências | O usuário não apontou alvo; estes são os sprites mais fracos na prancha e os chefes nunca foram polidos | n |
| Tecelã | Mesma grade do Oni com `TECELA_COLOR_MAP` (BTIER-06 mantido); o mapa passa a trocar pele, cabelo e pano | Dar silhueta própria substitui um AC verificado; isso é decisão do usuário | n |
| Como desenhar o chefe | Volumes (elipses e membros afilados) pintados por código com luz de cima à esquerda, mais partes desenhadas à mão (rosto, chifres, mãos, pés), e o `selOut` compartilhado no fim | Poses por articulação dão quadros de animação baratos e sombra coerente; `boss.ts` já monta frames por código (`block`) e `enemy.ts` já tem `limb()` | n |
| Rampa de pele do Oni | `A` (luz), `a` (base), `z` (sombra), `m` (sombra profunda) | Todas já estão na paleta; nenhuma cor nova (teto de 42, AD-017) | n |
| Mapa da Tecelã | Pele `A`/`a`/`z`/`m` → `U`/`u`/`v`/`K`; juba `H`/`j`/`h` → `w`/`I`/`i`; pano `U`/`u`/`v` → `l`/`L`/`q`; brilho do olho `R` → `C` | Mantém a Tecelã roxa (como hoje) e a separa do Oni em juba (branca), pano (creme) e olho (ciano). A esfera do preparo da rajada usa as chaves do pano: no Oni é roxa, na Tecelã vira um novelo creme | n |
| Grilhões e chifres | Ferro `S`/`s`/`N`/`n` e osso `w`/`l`/`L`, iguais nos dois arquétipos | Não entram no mapa; dão leitura de "Oni do Portão" sem cor nova | n |
| ACs sinalizados pelo Jev (25 de 38) | BSP-13 reescrito (precisão 1,20). Os outros 24 ficam como estão: os termos "diferença", "perfil", "caixa opaca", "componente" e "k interno" estão no Glossário, e cada AC "agrupado" é um catálogo conferido num laço só (frames, animações, chaves de cor) | Mesmo critério de `sprite-player-polish` e `enemy-sprite-variety`: separar geraria ACs triviais sem ganho de teste | n |
| Laço das animações do chefe | Toda animação de 2 frames repete (`repeat` −1); nenhuma depende de "tocar uma vez e segurar" | `Boss.animate` chama `play(key, true)` a cada frame: uma animação de uma volta recomeçaria ao terminar. Com laço, o adaptador não muda | n |
| Ciclo da rajada | A animação `volley` dura um ciclo de `BOSS.volley.intervalMs` (150 ms) | O braço bate no ritmo dos disparos | n |
| Tamanho dos membros do player | `armStraight(len)` e `legStraight(len)` continuam com 5 linhas e `len` colunas; só o contorno de baixo sobe no trecho fino | Mantém alcance (SPR-07), bbox (SPR-06) e o rastro (SPR-14) | n |
| Braço curto | Com `len` < 12 a manga não afina | Não há colunas para antebraço e punho distintos | n |
| Tamanho dos objetos | Cadeira 13×13, garrafa 4×10, faca 3×10 e porrete 5×8 não mudam | O corpo físico sai do tamanho da textura | n |
| Cadeira | Assento e encosto de madeira (`m`/`M`) com estrutura de aço (`s`/`S`) | Cadeira escolar; dois materiais dão leitura em 13×13 | n |
| Faca e porrete | Faca: ponta com brilho `w`, guarda `z` e cabo `M`/`m`. Porrete: cravos de osso `l` e cabo `M`/`m`. O limite é 7 chaves porque as grades antigas já tinham 5 | Um AC de "5 chaves" passava com o desenho antigo e não media nada | n |
| Borda do `impact` | Cada kit diz a partir de qual linha do tronco a borda branca vale; no bruto, a partir do topo da cabeça | Os chifres do bruto fazem parte da grade do tronco | n |
| `hurt-uppercut` | O corpo sobe 3 texels e sai do chão (era 2), com menos inclinação para trás e os braços ficando para baixo; vale para as 3 aparências, porque a pose é uma só. Mede-se pelo topo e pela base da caixa opaca | Em `dev` o `hurt-uppercut-0` do rastejante já fica 2 linhas acima do `hurt-head-a-0` e mesmo assim lê igual: a diferença por posição (0,82) não mede a pose. Braço erguido foi descartado: nas outras aparências o braço erguido tem a cor de alerta do preparo | n |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Chefes com desenho de verdade ⭐ MVP

**User Story**: Como jogador, quero que o chefe pareça um oni de verdade e que cada preparo tenha uma pose própria, para a luta da rodada 5 ter cara de clímax e eu ler o golpe que vem.

**Why P1**: É a arte mais fraca do jogo e o momento mais importante da run.

**Acceptance Criteria**:

1. BSP-01: Todo frame de `BOSS_FRAMES` e de `TECELA_FRAMES` SHALL passar no `parseSheet` com 40×32 texels e só chaves da `PALETTE`.
2. BSP-02: The `PALETTE` SHALL continuar com exatamente 42 chaves.
3. BSP-03: The frame `idle` do Oni SHALL ter cada um dos quatro tons de pele `A`, `a`, `z` e `m` em pelo menos 10 texels.
4. BSP-04: The frame `idle` do Oni SHALL ter no máximo 12 texels `k` internos.
5. BSP-05: The caixa opaca do `idle` do Oni SHALL ter a borda esquerda na coluna 10 ou antes, a direita na coluna 29 ou depois, o topo na linha 4 ou antes e a base na linha 31.
6. BSP-06: Todo frame de `BOSS_FRAMES` SHALL formar um único componente.
7. BSP-07: Cada par entre `idle`, `windup-charge`, `windup-leap` e `windup-volley` SHALL ter diferença de pelo menos 0,20.
8. BSP-08: Cada frame de ataque (`charge`, `leap`, `volley`) SHALL ter diferença de pelo menos 0,20 em relação ao seu preparo.
9. BSP-09: The caixa opaca do `dead` SHALL ter no máximo 14 linhas de altura e a base na linha 31.
10. BSP-10: The topo da caixa opaca do `stagger` SHALL ficar pelo menos 2 linhas abaixo do topo da caixa opaca do `idle`.
11. BSP-11: Todo frame de `TECELA_FRAMES` SHALL ser igual ao frame de mesmo nome de `BOSS_FRAMES` com o `TECELA_COLOR_MAP` aplicado texel a texel.
12. BSP-12: The cor dominante do `idle` SHALL ser `a` no Oni e `u` na Tecelã.
13. BSP-13: Para cada chave `k` entre `A`, `a`, `z`, `m`, `H`, `j`, `h`, `U`, `u` e `v`, `TECELA_COLOR_MAP[k]` SHALL ser uma chave da `PALETTE` diferente de `k`.

**Independent Test**: `npm test` (bloco do chefe em `tests/game/art.test.ts`) e a prancha antes/depois.

---

### P1: Chefes que se mexem ⭐ MVP

**User Story**: Como jogador, quero ver o chefe respirar, tremer no preparo e cambalear atordoado, para ele parecer vivo e não uma figura parada.

**Why P1**: Um desenho bom parado em 1 frame continua duro; os outros personagens já têm animação.

**Acceptance Criteria**:

1. BAN-01: The animação `idle` de `BOSS_ANIMS` SHALL ter 4 frames em laço (`repeat` −1), com 4 `durations` maiores que 0, sem dois frames consecutivos iguais (contando do último para o primeiro).
2. BAN-02: The animações `windup-charge`, `windup-leap` e `windup-volley` SHALL ter 2 frames distintos em laço, o primeiro com o nome do estado, com 90 ms por frame.
3. BAN-03: The animações `charge`, `roar` e `stagger` SHALL ter 2 frames distintos em laço, o primeiro com o nome do estado, com 80, 80 e 220 ms por frame.
4. BAN-04: The animação `volley` SHALL ter 2 frames distintos em laço, o primeiro com o nome do estado, e a soma das suas `durations` SHALL ser igual a `BOSS.volley.intervalMs`.
5. BAN-05: The animações `leap` e `dead` SHALL ter 1 frame, com o nome do estado.
6. BAN-06: Todo frame citado por `BOSS_ANIMS` SHALL existir em `BOSS_FRAMES` e em `TECELA_FRAMES`.
7. BAN-07: WHEN `registerAnims` recebe `BOSS_ANIMS` THEN cada frame de cada animação de 2 ou mais frames SHALL chegar ao Phaser com a `duration` declarada, e a animação com o `repeat` declarado.

**Independent Test**: `npm test` (catálogo de animações e `registerAnims` com cena falsa); `?debug&round=5` mostra o Oni e `?debug&round=15` a Tecelã.

---

### P1: Soco e chute sem cara de cano ⭐ MVP

**User Story**: Como jogador, quero que o braço e a perna esticados tenham antebraço, punho, canela e pé, para os golpes parecerem de um lutador e não de um boneco com canos.

**Why P1**: O jogador vê esses frames em todo golpe, o tempo inteiro.

**Acceptance Criteria**:

1. LMB-01: Para todo `len` de 9 a 22, `armStraight(len)` e `legStraight(len)` SHALL devolver 5 linhas, com `len` colunas na linha mais larga e um texel opaco na coluna `len − 1`.
2. LMB-02: Para todo `len` de 12 a 22, `armStraight(len)` SHALL ter pelo menos 3 colunas seguidas com perfil de no máximo 4 antes do punho, e pelo menos 1 coluna com perfil 5 entre as 5 últimas.
3. LMB-03: Para todo `len` de 12 a 22, `legStraight(len)` SHALL ter pelo menos 3 colunas seguidas com perfil de no máximo 4 antes do pé, e pelo menos 2 colunas com perfil 5 entre as 6 últimas.
4. LMB-04: The ponta do membro em `jab-hit`, `cross-hit` e `kick-hit` SHALL continuar nas colunas 27, 27 e 30.
5. LMB-05: Todo frame do player que já existia SHALL continuar com cada borda da caixa opaca a até 2 texels da linha de base congelada (SPR-06).
6. LMB-06: Todo frame do player SHALL continuar com um único componente (sem contar `S`) e 0 pixels cortados (SPF-01, SPF-02).
7. LMB-07: No `chuteAlto-hit`, nenhum texel de uniforme (`s`, `N`, `n`, `o`) SHALL ficar nas linhas 0 a 6 à esquerda da coluna 20.
8. LMB-08: No `chuteAlto-hit`, a ponta do pé SHALL continuar na coluna 31, numa linha de 2 a 6.

**Independent Test**: `npm test` (`art.test.ts` e `playerConsistency.test.ts`) e a prancha ampliada dos golpes.

---

### P2: Projétil e onda de choque

**User Story**: Como jogador, quero que o projétil pareça uma esfera de energia e a onda pareça uma onda, para desviar de algo que leio de relance.

**Why P2**: São pequenos e rápidos; o ganho é menor que o do corpo do chefe.

**Acceptance Criteria**:

1. BPW-01: The `PROJECTILE_FRAME` SHALL ter 8×8 texels, os 4 cantos transparentes e os tons `w`, `U`, `u` e `v`.
2. BPW-02: The `SHOCKWAVE_FRAME` SHALL ter 16×10 texels, pelo menos 30% de texels transparentes e os tons `w`, `A`, `a` e `z`.
3. BPW-03: The linha 9 (a base) do `SHOCKWAVE_FRAME` SHALL ter pelo menos 12 texels opacos.

**Independent Test**: `npm test` e a prancha.

---

### P2: Objetos com volume

**User Story**: Como jogador, quero que cadeira, garrafa, faca e porrete tenham material e brilho, para reconhecer o que vou pegar.

**Why P2**: Aparecem em toda sala, mas são pequenos.

**Acceptance Criteria**:

1. OBJ-01: The cadeira SHALL ter 13×13 texels e pelo menos 6 chaves distintas, entre elas `m`, `M`, `s` e `S`.
2. OBJ-02: The garrafa SHALL ter 4×10 texels e as chaves `G`, `g`, `w`, `l` e `L`.
3. OBJ-03: The frame `common` da faca SHALL ter 3×10 texels, pelo menos 7 chaves distintas, entre elas `w` e `z`, e nenhuma `A`.
4. OBJ-04: The frame `common` do porrete SHALL ter 5×8 texels, pelo menos 7 chaves distintas, entre elas `l` e `M`, e nenhuma `A`.

**Independent Test**: `npm test` (blocos de objetos e ferramentas, com os testes de estilhaço e de raridade que já existem).

---

### P3: Pendências dos inimigos

**User Story**: Como jogador, quero que as reações dos inimigos não tenham defeitos de acabamento, para o impacto ler limpo.

**Why P3**: São defeitos pequenos, anotados no handoff para o UAT.

**Acceptance Criteria**:

1. EPD-01: No `impact` do `bruto`, as linhas 0 a 11 SHALL ter exatamente 1 texel `w`.
2. EPD-02: No `attack-0` do `bruto`, a coluna da ponta do punho SHALL ter exatamente 3 texels opacos.
3. EPD-03: No `rastejante`, o topo da caixa opaca do `hurt-uppercut-0` SHALL ficar pelo menos 3 linhas acima do topo da caixa opaca do `hurt-head-a-0`.
4. EPD-04: No `hurt-uppercut-0` de cada uma das três aparências, a base da caixa opaca SHALL ficar na linha 20 ou acima.

**Independent Test**: `npm test` (bloco das três aparências) e a prancha dos inimigos.

---

## Edge Cases

- EDG-01: IF `armStraight` recebe `len` menor que 12 THEN ele SHALL devolver a manga sem afinar: toda coluna antes do punho com perfil 5.
- EDG-02: IF uma animação de `BOSS_ANIMS` declara `durations` com tamanho diferente de `frames` THEN `registerAnims` SHALL lançar erro com o nome da animação.

---

## Implicit-requirement dimensions sweep

| Dimensão | Resultado |
| --- | --- |
| Input validation & bounds | Grade 40×32 e paleta (BSP-01, BSP-02); `len` de 9 a 22 (LMB-01, EDG-01) |
| Failure / partial-failure states | `durations` inválidas (EDG-02); frame citado e ausente (BAN-06) |
| Idempotency / duplicate handling | N/A because os frames são dados puros, montados uma vez na carga do módulo |
| Auth boundaries & rate limits | N/A because é um jogo local, sem rede |
| Concurrency / ordering | N/A because não há estado compartilhado |
| Data lifecycle / expiry | N/A because não há persistência |
| Observability | N/A because nenhum estado novo de jogo; a arte é verificada nas grades |
| External-dependency failure | N/A because não há dependência externa |
| State-transition integrity | Toda animação de 2 frames é laço, então a troca de estado do chefe continua sendo a única transição (BAN-02 a BAN-04) |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| BSP-01 | P1: Chefes com desenho | Execute | Implementing |
| BSP-02 | P1: Chefes com desenho | Execute | Implementing |
| BSP-03 | P1: Chefes com desenho | Execute | Implementing |
| BSP-04 | P1: Chefes com desenho | Execute | Implementing |
| BSP-05 | P1: Chefes com desenho | Execute | Implementing |
| BSP-06 | P1: Chefes com desenho | Execute | Implementing |
| BSP-07 | P1: Chefes com desenho | Execute | Implementing |
| BSP-08 | P1: Chefes com desenho | Execute | Implementing |
| BSP-09 | P1: Chefes com desenho | Execute | Implementing |
| BSP-10 | P1: Chefes com desenho | Execute | Implementing |
| BSP-11 | P1: Chefes com desenho | Execute | Implementing |
| BSP-12 | P1: Chefes com desenho | Execute | Implementing |
| BSP-13 | P1: Chefes com desenho | Execute | Implementing |
| BAN-01 | P1: Chefes que se mexem | Execute | Implementing |
| BAN-02 | P1: Chefes que se mexem | Execute | Implementing |
| BAN-03 | P1: Chefes que se mexem | Execute | Implementing |
| BAN-04 | P1: Chefes que se mexem | Execute | Implementing |
| BAN-05 | P1: Chefes que se mexem | Execute | Implementing |
| BAN-06 | P1: Chefes que se mexem | Execute | Implementing |
| BAN-07 | P1: Chefes que se mexem | Execute | Implementing |
| LMB-01 | P1: Soco e chute | Execute | Implementing |
| LMB-02 | P1: Soco e chute | Execute | Implementing |
| LMB-03 | P1: Soco e chute | Execute | Implementing |
| LMB-04 | P1: Soco e chute | Execute | Implementing |
| LMB-05 | P1: Soco e chute | Execute | Implementing |
| LMB-06 | P1: Soco e chute | Execute | Implementing |
| LMB-07 | P1: Soco e chute | Execute | Implementing |
| LMB-08 | P1: Soco e chute | Execute | Implementing |
| BPW-01 | P2: Projétil e onda | Execute | Implementing |
| BPW-02 | P2: Projétil e onda | Execute | Implementing |
| BPW-03 | P2: Projétil e onda | Execute | Implementing |
| OBJ-01 | P2: Objetos | Execute | Implementing |
| OBJ-02 | P2: Objetos | Execute | Implementing |
| OBJ-03 | P2: Objetos | Execute | Implementing |
| OBJ-04 | P2: Objetos | Execute | Implementing |
| EPD-01 | P3: Pendências dos inimigos | Tasks | In Tasks |
| EPD-02 | P3: Pendências dos inimigos | Tasks | In Tasks |
| EPD-03 | P3: Pendências dos inimigos | Tasks | In Tasks |
| EPD-04 | P3: Pendências dos inimigos | Tasks | In Tasks |
| EDG-01 | Edge cases | Execute | Implementing |
| EDG-02 | Edge cases | Execute | Implementing |

**Coverage:** 41 total, 41 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] `npm run typecheck`, `npm test` e `npm run build` passam; os smokes `boot` e `boss*` passam.
- [ ] Na prancha antes/depois, o Oni lê como um oni (chifres, rosto, braços, tanga) e os três preparos têm poses diferentes à primeira vista.
- [ ] Na prancha ampliada dos golpes, braço e perna esticados têm punho e pé maiores que o antebraço e a canela.
- [ ] UAT do usuário em `?debug&round=5` (Oni) e `?debug&round=15` (Tecelã) antes de ir para `dev`.
