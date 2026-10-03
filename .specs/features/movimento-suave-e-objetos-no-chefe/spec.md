# Movimento suave e objetos que acertam o chefe — Specification

## Problem Statement

No UAT de 03/10 o usuário relatou dois problemas: "itens jogáveis estão passando reto pelo inimigo" e "senti um pouco travado o personagem, como se ele desse umas flicadas".

- **Objetos atravessam o chefe.** O filtro de colisão do objeto arremessado (`propThrown`) e do objeto na mão (`propSwing`) aceita `ENEMY` e `RAGDOLL`, mas não `BOSS`. Contra inimigo comum o arremesso acerta (reproduzido a 16–130 px); contra o chefe o Matter nunca cria o par. O defeito vem da F2 e também existe em `dev`.
- **Tremor ao correr.** A câmera segue o player com `startFollow(..., roundPixels = true, 0.15, 0.15)`: o Phaser aplica `Math.floor` no scroll dentro da realimentação do lerp e no x do sprite. Em regime, a distância entre os dois oscila até 1,5 px de tela a cada quadro (simulado: média 1,0 px a 60 Hz). O lerp é por quadro, então a câmera muda de comportamento com a taxa do monitor.
- **Degraus acima de 60 Hz.** A física roda em passo fixo de 60 Hz (acumulador do Matter no Phaser 3.90) e a tela mostra sempre o último passo. A 75, 120 e 144 Hz o corpo anda em degraus de 2,5 a 4,5 px de tela (simulado).

## Goals

- [ ] Cadeira, garrafa e ferramentas acertam o chefe, arremessadas ou na mão.
- [ ] Correndo em velocidade constante, o player varia no máximo 1 px de tela de um quadro para o outro em relação à câmera, a 60, 75, 120 e 144 Hz.
- [ ] A câmera se comporta igual em qualquer taxa de atualização.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Interpolar objetos soltos, ragdoll, projéteis e drops | São sprites do próprio Matter; o ganho é pequeno e o risco de mexer na física é alto |
| Mudar o zoom (1,5), a deadzone ou o lerp da câmera | AD-003; o pedido é tirar o tremor, não mudar o enquadramento |
| Mudar velocidades, hitboxes, tempos de golpe ou a IA | A correção é de colisão e de desenho, não de balanceamento |
| Alcance do arremesso (a garrafa cai depois de ~260 px, a cadeira depois de ~140 px) | Comportamento de tuning existente; não é o defeito relatado |

---

## Glossário

- **passo**: uma atualização da física do Matter, de 1000/60 ms.
- **alfa**: fração entre o penúltimo e o último passo que a tela mostra neste quadro.
- **centro da câmera**: ponto do mundo no meio da tela, guardado em ponto flutuante.
- **posição de desenho**: posição do corpo interpolada pelo alfa.
- **variação na tela**: módulo da diferença, entre dois quadros seguidos, de (posição de desenho − scroll) × zoom.

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| "Inimigo" do relato | O chefe: o usuário testava em `?debug&round=5`; contra inimigo comum o arremesso acerta em todas as distâncias medidas | Reproduzido no jogo; o filtro explica o defeito por construção | n |
| Causa das "flicadas" | Tremor da câmera (floor na realimentação) e passo fixo sem interpolação | A lógica roda limpa em passo fixo (frames `run-*` sem piscar, dx constante de 3,67 px); o tremor aparece na simulação do que o Phaser faz ao desenhar | n |
| Alfa | `timeBuffer / passo − 0,5`, limitado a 0..1 | O acumulador do Phaser só dá um passo com 1,5 passo acumulado; depois do passo sobra de 0,5 a 1,5 | n |
| Custo da interpolação | A tela mostra até 1 passo de atraso (meio passo a 60 Hz, ~8 ms) | Padrão de passo fixo com interpolação; abaixo do que se percebe | n |
| Teleporte | Um salto de mais de 48 px num passo não interpola | Renascer e reposicionar não devem deslizar pela tela | n |
| Câmera | Segue a posição de desenho do player com a mesma deadzone (40×24) e o mesmo lerp (0,15 por quadro de 60 Hz), agora por tempo; o scroll aplicado cai na grade de pixel de tela e o arredondamento não volta para o estado | Mantém o enquadramento atual e tira o tremor | n |
| `roundPixels` da câmera do mundo | Desligado | Com 2 px por texel e zoom 1,5, todo texel ocupa 3 px de tela em qualquer posição; o floor só servia para criar o tremor | n |
| Quem interpola | Player, inimigo comum e chefe (os três têm sprite separado do corpo) e o objeto na mão | São o que o olho segue | n |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Objetos acertam o chefe ⭐ MVP

**User Story**: Como jogador, quero que a cadeira e a garrafa acertem o chefe, para usar o cenário como arma na luta mais difícil.

**Why P1**: É um defeito: o objeto atravessa o alvo.

**Acceptance Criteria**:

1. PRB-01: The filtro `propThrown` SHALL colidir com o filtro `boss`.
2. PRB-02: The filtro `propSwing` SHALL colidir com o filtro `boss`.
3. PRB-03: The filtros `propThrown` e `propSwing` SHALL colidir com `bossAirborne` e SHALL continuar sem colidir com `propRest`.
4. PRB-04: WHEN uma garrafa arremessada toca o chefe em `rest` THEN a vida do chefe SHALL cair exatamente 12 e a garrafa SHALL passar a `breaking`.

**Independent Test**: `tests/core/collision.test.ts` e o smoke `boss-prop`.

---

### P1: Câmera sem tremor ⭐ MVP

**User Story**: Como jogador, quero que a câmera acompanhe o personagem sem tremer, para o jogo parecer acabado.

**Why P1**: É o que o usuário sentiu como "flicadas" ao se mover.

**Acceptance Criteria**:

1. CAM-01: WHILE o alvo está dentro da deadzone, `followCenter` SHALL devolver o mesmo centro.
2. CAM-02: WHEN o alvo está `d` px além da borda da deadzone THEN, depois de um quadro de 1000/60 ms, o centro SHALL ter andado `0,15 × d` na direção do alvo.
3. CAM-03: Para um alvo parado fora da deadzone, dois quadros de 1000/120 ms SHALL levar o centro ao mesmo ponto que um quadro de 1000/60 ms, com erro de até 0,000001 px.
4. CAM-04: The centro devolvido SHALL ficar entre `bounds.x + view.w / 2` e `bounds.x + bounds.w − view.w / 2`, e o mesmo no eixo y.
5. CAM-05: IF a vista é maior que os limites num eixo THEN o centro SHALL ficar em `bounds.x + view.w / 2` nesse eixo.
6. CAM-06: The `scrollFor` SHALL devolver `centro − metade do canvas` arredondado ao múltiplo mais próximo de `1 / zoom`.
7. CAM-07: The câmera do mundo SHALL ter `roundPixels` desligado e não usar o `startFollow` do Phaser.

**Independent Test**: `tests/core/cameraFollow.test.ts`; smoke `feel` lê `camera.center` e `camera.scroll`.

---

### P1: Movimento sem degraus ⭐ MVP

**User Story**: Como jogador com monitor acima de 60 Hz, quero ver o movimento contínuo, para o personagem não andar aos trancos.

**Why P1**: Sem isso, a câmera suave deixa os personagens tremendo contra o fundo.

**Acceptance Criteria**:

1. ITP-01: The `stepAlpha(buffer, passo)` SHALL devolver `buffer / passo − 0,5` limitado ao intervalo de 0 a 1.
2. ITP-02: The `StepLerp.at(alfa)` SHALL devolver `anterior + (atual − anterior) × alfa`, onde `push` guarda a posição atual como anterior antes de registrar a nova.
3. ITP-03: IF um `push` anda mais de 48 px THEN `at(alfa)` SHALL devolver a posição nova para qualquer alfa.
4. ITP-04: Para um alvo a 220 px/s com física a 60 Hz, deadzone de 40 px, lerp 0,15 e zoom 1,5, a variação na tela em regime SHALL ser de no máximo 1 px a 60, 75, 120 e 144 Hz.
5. ITP-05: WHILE o player corre em passo fixo, `player.view.x` do snapshot SHALL ser o ponto médio entre o x do corpo no passo anterior e no atual, com erro de até 0,01 px.
6. ITP-06: WHILE o player corre em passo fixo, a variação na tela calculada com `player.view.x` e `camera.scroll.x` SHALL ser de no máximo 1 px em regime.
7. ITP-07: The sprite do inimigo comum e o do chefe SHALL ser posicionados na posição de desenho do próprio corpo.

**Independent Test**: `tests/core/stepLerp.test.ts`, `tests/core/cameraFollow.test.ts` (simulação) e o smoke `feel`.

---

## Edge Cases

- EDG-01: IF `stepAlpha` recebe passo menor ou igual a 0 THEN ele SHALL devolver 1.
- EDG-02: WHEN o player renasce THEN `player.view` SHALL estar na posição do corpo no primeiro quadro depois do reposicionamento (sem deslizar).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| PRB-01 | P1: Objetos acertam o chefe | Execute | Implementing |
| PRB-02 | P1: Objetos acertam o chefe | Execute | Implementing |
| PRB-03 | P1: Objetos acertam o chefe | Execute | Implementing |
| PRB-04 | P1: Objetos acertam o chefe | Tasks | In Tasks |
| CAM-01 | P1: Câmera sem tremor | Tasks | In Tasks |
| CAM-02 | P1: Câmera sem tremor | Tasks | In Tasks |
| CAM-03 | P1: Câmera sem tremor | Tasks | In Tasks |
| CAM-04 | P1: Câmera sem tremor | Tasks | In Tasks |
| CAM-05 | P1: Câmera sem tremor | Tasks | In Tasks |
| CAM-06 | P1: Câmera sem tremor | Tasks | In Tasks |
| CAM-07 | P1: Câmera sem tremor | Tasks | In Tasks |
| ITP-01 | P1: Movimento sem degraus | Execute | Implementing |
| ITP-02 | P1: Movimento sem degraus | Execute | Implementing |
| ITP-03 | P1: Movimento sem degraus | Execute | Implementing |
| ITP-04 | P1: Movimento sem degraus | Tasks | In Tasks |
| ITP-05 | P1: Movimento sem degraus | Tasks | In Tasks |
| ITP-06 | P1: Movimento sem degraus | Tasks | In Tasks |
| ITP-07 | P1: Movimento sem degraus | Tasks | In Tasks |
| EDG-01 | Edge cases | Execute | Implementing |
| EDG-02 | Edge cases | Tasks | In Tasks |

**Coverage:** 20 total, 20 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] `npm run build`, `npm test` e os smokes passam.
- [ ] UAT do usuário: arremessar cadeira e garrafa no chefe; correr de um lado para o outro e sentir a câmera firme.
