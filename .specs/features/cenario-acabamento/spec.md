# Cenário: acabamento — Specification

## Problem Statement

O usuário vê "paredes verdes" e um cenário com cara de rascunho. Nas capturas de 08/10 (HD): a camada próxima do fundo
é um retângulo liso de cor por tema (verde no `parque`, marrom no `santuario`) com ~128 px de altura e troca de cor
seca na emenda dos módulos; a coluna da parede esquerda usa a terra do `parque` e vira um pilar marrom da altura da
tela; todos os temas têm o mesmo horizonte (a escola); o corpo do chão da `rua` tem traços laranja soltos; e, na
arena do chefe, o texto "Rodada 5" some sobre o selo (texto creme sem contorno sobre talismã creme). Plano: `docs/plano-cenario-rejogabilidade-hordas.md`, Fase A.

## Goals

- [ ] Nenhuma janela de 32x32 px da faixa do muro próximo é de uma cor só (hoje a faixa inteira é).
- [ ] Cada tema de combate (`rua`, `beco`, `parque`) e a `konbini` têm muro próximo e horizonte médio próprios.
- [ ] A borda esquerda da área é igual em todos os temas e não usa a folha de chão do tema.
- [ ] O texto do HUD fica legível sobre qualquer fundo, inclusive o selo creme.
- [ ] Os smokes `world-` e o teste de paleta continuam verdes.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Fundo, chão e decoração do `santuario` | F23 `arena-do-santuario`; aqui o santuário só troca o muro chapado pelo muro de pedra |
| Módulos novos e mudança da largura dos módulos | Mudam o sorteio por seed e `tests/data/modules.test.ts`; vêm depois da F23 |
| Objetos com colisão, destrutíveis ou interativos | F20 `portas-e-destrutiveis` |
| Iluminação dinâmica (luz que reage a técnica ou golpe) | Fora do pedido; a luz aqui é pintada |
| Mudar a camada distante (céu, lua, cidade, escola com relógio) | É a identidade do jogo e não foi apontada como defeito; só a média e a próxima mudam |
| Versão antiga (`?hd=0`) | Processo do projeto: trabalho novo só em HD; a versão antiga recebe o mesmo desenho sem conferência |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| "Paredes verdes" do pedido | São a faixa próxima chapada do `parque` (C1 do plano) | Única área verde de parede na tela nas capturas; o usuário mandou seguir o fluxo sem responder | n |
| Medida de "muro chapado" | Toda janela de 32x32 px na faixa do muro próximo (de 76 px acima da linha do chão da camada até ela) tem pelo menos 3 cores da paleta; na camada média, toda janela de 32x32 px com algo pintado entre 60 e 20 px acima do chão tem pelo menos 2 cores | Mede o defeito de forma objetiva e não pode ser burlada fatiando o retângulo |  y |
| Borda esquerda | A coluna 0, nas linhas acima do chão, usa a folha neutra `terrain` (pedra da escola) em todos os temas | Muro de contenção igual em toda área; não precisa de folha nova | y |
| Emenda entre módulos | Um pilar de 20 px de largura centrado na fronteira, nas camadas média e próxima | O pilar já existe no desenho e esconde o corte | y |
| Primeiro plano | Camada com `scrollFactor` 1,15 na horizontal e 1 na vertical, desenhada só abaixo do topo do chão | Dá profundidade sem cobrir o corpo dos lutadores | y |
| Decoração sem colisão | Desenhada no mundo (`scrollFactor` 1) atrás dos atores; posição sorteada por hash da coluna e do tema (determinística, sem consumir o `Rng` da run) | Não muda o sorteio por seed nem os testes de `stage` | y |
| Cores novas | Até 4 chaves novas na `PALETTE` (tijolo, concreto, folhagem, letreiro), se o desenho pedir | A paleta tem só um verde e nenhum tijolo; cor nova passa pelo teste de paleta | y |
| Selo sobre o HUD (C5) | Causa confirmada em 08/10 (captura ampliada): o selo fica atrás do HUD, mas o texto creme (`w`) sem contorno some sobre o talismã creme. Correção: contorno `k` de 3 px nos textos do HUD | O conserto é de contraste, não de profundidade | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Consertos visuais ⭐ MVP

**User Story**: Como jogador, quero um cenário sem retângulos chapados, emendas secas e pilares de terra, para que o
mundo não pareça quebrado.

**Why P1**: É o defeito que o usuário apontou.

**Acceptance Criteria**:

1. CEN-01: Every 32x32 px window of the near background layer between 76 px above its ground line and the ground line SHALL contain at least 3 distinct palette colors, for every theme.
2. CEN-02: WHEN an area has more than one module THEN the near background layer SHALL draw a 20 px pillar centered on each module boundary.
3. CEN-03: The tiles of column 0 above the floor rows SHALL use the neutral `terrain` sheet for every theme.
4. CEN-04: The `rua` floor frames SHALL contain no row made entirely of the orange keys `a` or `A`.
5. CEN-05: The HUD texts (labels, fragments, held item, round and remaining enemies) SHALL be drawn with a 3 px stroke of `PALETTE.k`.
6. CEN-06: WHEN an area is built THEN the debug snapshot SHALL keep reporting one near band per module with the `wall` and `top` keys of its theme.

**Independent Test**: Abrir `?debug&modules=beco,parque,rua` e andar até o selo: muro texturizado por tema, pilar em
cada emenda, borda esquerda de pedra, "Rodada" legível sobre o selo; `npm test` cobre CEN-01 a CEN-04 e CEN-06.

---

### P2: Horizonte por tema

**User Story**: Como jogador, quero que rua, beco, parque e konbini tenham paisagem própria, para sentir que mudei de
lugar ao atravessar a área.

**Why P2**: Sem isso os módulos só diferem no chão.

**Acceptance Criteria**:

1. CEN-07: The middle background layer SHALL paint each module span with the painter of that module's theme.
2. CEN-08: Each of the themes `rua`, `beco`, `parque` and `konbini` SHALL have a middle-layer painter distinct from the others.
3. CEN-09: Every 32x32 px window of the middle background layer between 60 and 20 px above its ground line that has any painted pixel SHALL contain at least 2 distinct palette colors.
4. CEN-10: WHEN an area is built THEN the debug snapshot SHALL report one middle band per module with its theme.

**Independent Test**: `?debug&modules=rua,beco,parque` mostra três horizontes; o snapshot traz `area.midBands`.

---

### P3: Profundidade e decoração

**User Story**: Como jogador, quero primeiro plano e objetos de cenário, para a cena ter profundidade e cara de lugar
habitado.

**Why P3**: Acabamento; o cenário já fica correto sem isso.

**Acceptance Criteria**:

1. CEN-11: WHEN a combat or konbini area is built THEN the scene SHALL create a foreground layer with horizontal scroll factor 1.15 and vertical scroll factor 1.
2. CEN-12: The foreground layer SHALL draw only below the top of the floor (y ≥ 480 px of world).
3. CEN-13: WHEN an area is built THEN the scene SHALL draw at least one non-colliding decoration per module, behind the actors and in front of the near layer.
4. CEN-14: The decoration SHALL create no Matter body.
5. CEN-15: The same area grid SHALL always produce the same decoration positions.

**Independent Test**: Duas cargas com a mesma seed geram a mesma decoração; a física (`H`) não mostra corpo novo.

---

## Edge Cases

- WHEN the area is the test room (`area=sala`) THEN the scene SHALL draw the background as before, without foreground or decoration.
- WHEN an area has a single module (konbini) THEN the near and middle layers SHALL draw no boundary pillar.
- IF a theme has no decoration painter THEN the scene SHALL draw no decoration for that span and SHALL not throw.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| CEN-01 | P1: Consertos visuais | Tasks | Pending |
| CEN-02 | P1: Consertos visuais | Execute | Implementing |
| CEN-03 | P1: Consertos visuais | Execute | Implementing |
| CEN-04 | P1: Consertos visuais | Execute | Implementing |
| CEN-05 | P1: Consertos visuais | Execute | Implementing |
| CEN-06 | P1: Consertos visuais | Tasks | Pending |
| CEN-07 | P2: Horizonte por tema | Tasks | Pending |
| CEN-08 | P2: Horizonte por tema | Tasks | Pending |
| CEN-09 | P2: Horizonte por tema | Tasks | Pending |
| CEN-10 | P2: Horizonte por tema | Execute | Implementing |
| CEN-11 | P3: Profundidade e decoração | Tasks | Pending |
| CEN-12 | P3: Profundidade e decoração | Tasks | Pending |
| CEN-13 | P3: Profundidade e decoração | Tasks | Pending |
| CEN-14 | P3: Profundidade e decoração | Tasks | Pending |
| CEN-15 | P3: Profundidade e decoração | Tasks | Pending |

**Coverage:** 15 total, 15 mapped to tasks, 0 unmapped.

---

## Success Criteria

- [ ] O usuário anda pelas três áreas de combate e pela konbini e não aponta parede chapada nem emenda seca.
- [ ] Gate verde; smokes `world-` verdes.
