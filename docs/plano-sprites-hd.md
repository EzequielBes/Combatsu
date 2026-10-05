# Plano: sprites em alta densidade e organização do código

Documento de partida para as próximas sessões (04/10/2026). Decisões de direção de arte tomadas pelo Claude a pedido do
usuário, que delegou a escolha técnica. Objetivo: sprites fluidos, bonitos e legíveis, num jogo inspirado em Jujutsu
Kaisen com combate inspirado em Sifu. Toda arte sai de código, sem ferramenta paga nem desenho manual.

## 1. Decisões

| Tema | Decisão | Motivo |
| --- | --- | --- |
| Densidade | 1 texel = 1 px de mundo, no jogo inteiro (hoje 2 px) | Dobra o detalhe. Uma densidade só: pixels de dois tamanhos lado a lado é o defeito mais visível em pixel art |
| Tela | Canvas 1280x720 com zoom 2 (hoje 960x540 com zoom 1,5) | O campo de visão continua 640x360 px de mundo. Cada texel vira 2 px de tela, inteiro. Com o zoom 1,5 atual o texel de 1 px daria 1,5 px de tela: pixels desiguais e tremor |
| Altura do jogador | ~60 texels em pé, frame 96x80, origem no pé | Mesmo tamanho de mundo do heroico alto. 640x360 com personagem de ~60 é a faixa de Blasphemous e Dead Cells |
| Altura do inimigo comum | ~52 a 56 texels | O jogador fica um pouco mais alto, não 1,6x como no spike |
| Técnica | Rig 2D articulado, rasterizado em pixel art e assado em atlas PNG | É o método do Dead Cells (esqueleto renderizado em baixa resolução): animação fluida sem desenhar quadro a quadro. Grade de texto à mão não escala a 60 texels |
| Cabeça | Volume procedural (crânio, mandíbula, cabelo em mechas) com feições posicionadas à mão; conjunto de ângulos e expressões | A 60 texels a cabeça tem ~15 linhas; grade de texto à mão fica lenta e não inclina |
| Paleta | Rampas de 4 a 5 tons por material; teto sobe de 42 para ~64 | 3 tons por material vira chapado a esta densidade. O atlas PNG tira o limite de 1 caractere por cor |
| Fluidez | Quadros por fase compatíveis com 60 Hz (mínimo 33 ms por quadro), pose-chave segurada no impacto | O startup de 90 ms com 6 quadros perde quadro (achado do Verifier). Fluidez vem de pose e timing, não de mais quadros |

## 2. Direção de arte

- **Leitura primeiro.** Uniforme escuro em fundo noturno some. Todo personagem tem luz de recorte fria nas costas (a lua)
  e luz quente de frente, e o valor médio do corpo fica 2 tons acima do fundo atrás dele.
- **Silhueta por golpe.** Cada pose-chave tem de ser reconhecível só pelo contorno preenchido de preto. É o teste nº 1.
- **Sifu:** antecipação curta e clara, impacto seguro por hitstop, recuperação longa e punível, peso no quadril e nos pés.
- **Jujutsu Kaisen:** energia amaldiçoada como camada própria (chama, rastro, raio do Kokusen) em roxo, azul e
  preto com vermelho, sempre mais saturada e clara que o corpo. O corpo é sóbrio; o efeito carrega o espetáculo.
- **Sem linha preta por dentro.** Contorno externo escuro; por dentro, linha na cor do material (sel-out).
- **Movimento secundário:** barra do paletó, cabelo e mangas atrasam 1 a 2 quadros em relação ao corpo.

## 3. O que o rasterizador precisa ganhar

1. Membros com perfil (bíceps, antebraço, coxa, panturrilha), não cápsulas retas.
2. Sombra por volume com duas luzes e rampa de 4 a 5 tons, com dithering só onde ajuda.
3. Mãos como biblioteca de formas (punho, palma, mão em lâmina, agarrar) em 8 direções.
4. Roupa em camadas com atraso: paletó, barra, gola, calça, sapato.
5. Cabeça procedural com inclinação e 4 expressões (neutro, foco, esforço, dor).
6. Saída em índices de cor e atlas PNG gerado por ferramenta, commitado; o jogo carrega o PNG.

## 4. Ordem de trabalho

| Fase | Entrega | Critério de saída |
| --- | --- | --- |
| 0 | Organização do código (seção 5) | Lint e formatação no gate; nenhum arquivo novo acima do teto |
| 1 | Spike HD: jogador a 60 texels, idle e gancho, tela 1280x720 atrás de `?hd=1` | O usuário aprova o rosto e o corpo na prancha e no jogo |
| 2 | Rasterizador HD (itens 1 a 6 da seção 3) | Rubrica de qualidade passa em idle, corrida, 3 golpes |
| 3 | Jogador completo: locomoção, golpes do grafo, defesa, técnicas | Todos os testes POS/TRL convertidos passam |
| 4 | Inimigos comuns (3 aparências) e chefes | Mesma densidade, mesma rubrica |
| 5 | Cenário, objetos, HUD e efeitos | `ART_SCALE` 1 no jogo inteiro; sai o caminho antigo |

Durante as fases 1 a 4 a densidade fica misturada, só atrás de `?hd=1`. O jogo sem a chave não muda.

## 5. Organização do código

**Feito em 04/10/2026**, no branch `chore/organizacao-do-codigo` (a partir de `spike/heroico-fable`). O lint é o
**oxlint**, não ESLint + typescript-eslint: o typescript-eslint recusa TypeScript 7. Regras, tetos e listas de exceção
ficam em `.oxlintrc.json`; `npm run gate` roda typecheck, lint, format:check e testes. `Player.ts`, `Enemy.ts`,
`TestScene.ts` e `art.test.ts` já foram divididos (`src/game/player/`, `src/game/enemy/`, `src/scenes/test/`,
`tests/game/art/`). O texto abaixo é o plano original.

Estado em 04/10/2026: 22.966 linhas em `src`, 10 arquivos acima de 400 linhas, sem ESLint nem Prettier.

| Arquivo | Linhas |
| --- | --- |
| `tests/game/art.test.ts` | 1895 |
| `src/scenes/TestScene.ts` | 1837 |
| `src/game/Player.ts` | 1225 |
| `src/game/Enemy.ts` | 1025 |
| `src/game/art/sprites/enemy.ts` | 725 |
| `src/game/art/sprites/playerMoves.ts` | 719 |
| `src/game/TechRunner.ts` | 659 |

- **Prettier** formata, não divide arquivo. Entra num commit único em `dev`, com as outras worktrees já mergeadas, e
  o hash vai para `.git-blame-ignore-revs`. Largura de linha 120.
- **ESLint + typescript-eslint** com `max-lines` (400), `max-lines-per-function` (80) e `complexity`, como aviso para
  os arquivos antigos (lista de exceções que só encolhe) e erro para os novos.
- **Gate:** `npm run lint` e `prettier --check` entram junto de `typecheck` e `test`.
- **Divisão, um arquivo por vez, sem mudar comportamento, com os smokes verdes:**
  - `TestScene.ts`: diretor de efeitos, diretor da run e das rodadas, câmera, snapshot de debug, ligações de combate.
  - `Player.ts`: animador (escolha de frame e folha), defesa, golpes e hitbox, movimento.
  - `Enemy.ts`: mesma divisão do Player.
  - `art.test.ts`: um arquivo de teste por família (paleta, player, inimigo, chefe, tiles, HUD).
  - Sprites em grade de texto saem de cena na fase 5; não vale dividi-los antes.

## 6. Skills a criar

| Skill | Conteúdo |
| --- | --- |
| `rig-pipeline` | Esqueleto, presets, rasterizador, estilos, tunings, pranchas (`tools/rig-heroico.mjs`), gate e armadilhas conhecidas |
| `pixel-art-rubrica` | Lista de verificação: silhueta, valor contra o fundo, clusters, banding, pillow shading, serrilhado, rampas, direção da luz, leitura a 1x. Laço obrigatório: gerar prancha, olhar, corrigir, no mínimo 5 rodadas |
| `rosto-e-cabeca` | Gabarito da cabeça, identidade do personagem (cabelo espetado em 3 mechas), ângulos e expressões |
| `poses-de-luta` | Antecipação, pose-chave, arco, overshoot, quadros por fase a 60 Hz, hitbox contra alcance do corpo |
| `revisor-de-sprite` | Agente separado que lê as pranchas e critica com a rubrica; autor diferente de revisor |
| `organizacao-do-codigo` | Tetos de tamanho, onde cada coisa mora, como dividir um arquivo grande sem mudar comportamento |

## 7. O que já existe (branch `spike/heroico-fable`)

- Rig parametrizado por `RigFrame`, preset `heroicoAlto` de 32 texels, cabeças idle e luta, estilo `TAILORED_STYLE`.
- Gancho de 12 quadros no jogo com `?debug&rig=1`, folha `player-rig`, hitbox 20 px mais alta só nesse modo.
- Lições: a cabeça desenhada sobre o braço de perto mantém o rosto visível; interpolar ângulos afunda o pé e precisa
  de correção por IK; a hitbox do golpe tem de crescer com o corpo; `Read` na prancha a cada mudança é o que pega os erros.
- Spec e validação: `.specs/features/boneco-articulado/` (P3, Verifier PASS).

## 8. Riscos

- **Qualidade a 60 texels depende do rasterizador novo.** Se a fase 1 mostrar membros de "salsicha", o trabalho da
  seção 3 vem antes de qualquer migração.
- **Migração longa.** Inimigos, chefes e cenário somam mais arte que o jogador. A chave `?hd=1` mantém o jogo jogável.
- **Testes de arte presos a 32x30.** Pontos de golpe, bbox e invariantes precisam de conversão por frame, como no P3.
