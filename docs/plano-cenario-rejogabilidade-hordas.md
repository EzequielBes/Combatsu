# Plano: cenário, rejogabilidade, hordas e Energia Reversa

Pedido do usuário em 08/10/2026, nesta ordem de prioridade: (1) cenário, (2) rejogabilidade, (3) os outros
refinamentos (hordas contínuas e a aura da Energia Amaldiçoada Reversa). Este documento é o diagnóstico e o plano;
cada fase vira uma feature do `tlc-spec-driven` em `.specs/features/<nome>/` antes de ser codada.

Base: branch `feat/builds-e-arsenal` (`fbf307b`, enviado ao `origin`), com HD como padrão desde `fadfe75`.

## Diagnóstico (capturas do jogo em HD, 08/10)

### Cenário

| # | O que se vê | Causa no código |
| --- | --- | --- |
| C1 | **"Paredes verdes"**: um retângulo verde chapado de ~128 px de altura atrás do player no `parque` (marrom no `santuario`, azul no `rua`/`beco`), cortado por pilares | Faixa próxima do fundo: `buildBackground` pinta um `rect` liso com `NEAR_COLORS[tema].wall` e uma linha de 2 px no topo (`src/game/art/background.ts:293-295`). Não tem textura, nem sombra, nem recorte |
| C2 | Troca seca de cor do muro na emenda entre dois módulos (verde → azul no meio da tela) | A faixa é cortada em `x0..x1` de cada trecho, sem peça de transição |
| C3 | Coluna marrom de terra com a altura da tela inteira na borda esquerda do `parque` | `sheetFor` dá à parede da coluna 0 a folha do módulo vizinho (`world.ts`, `sheetFor`): a terra do parque vira muro |
| C4 | Todos os temas têm o mesmo horizonte: a escola com relógio, os prédios e as árvores | As camadas distante e média de `buildBackground` não recebem o tema; só a faixa próxima muda |
| C5 | Na arena do chefe, o selo (talismãs) aparece por cima do texto "Rodada / Inimigos" do HUD | A investigar (hipótese: ordem de câmeras ou profundidade do `tileSprite` do selo). Usar `systematic-debugging` |
| C6 | Traços laranja soltos no corpo do chão da `rua` parecem defeito, não faixa de asfalto | Arte do corpo em `tilesThemes.ts` (confirmar na prancha) |
| C7 | **Arena do chefe pobre**: 40 colunas planas, um banco, a mesma escola ao fundo, muro marrom, selo só à direita | `src/data/modules/santuario.ts` é a `rua` sem objetos; não existe fundo de santuário |

Pergunta para o usuário: as "paredes verdes" que você viu são o C1 (faixa verde atrás do player no parque)? Se for
outra coisa, uma captura resolve.

### Rejogabilidade (o que existe hoje)

- Run sem fim, com permadeath: rodadas, chefe a cada 5 (Oni do Portão na 5, Tecelã na 15), loja na konbini.
- Escolhas na run: 6 atributos, 4 técnicas, 6 passivas em 3 builds (lutador, feiticeiro, veloz), 7 itens de arsenal,
  maestria por técnica. A loja puxa as ofertas para a build das compras.
- Variação entre runs: só a seed (módulos e ofertas).
- **Nada persiste entre runs** (nenhum `localStorage` no `src/`): não há desbloqueio, meta-progressão, personagem
  alternativo, desafio, recorde nem dificuldade escolhida. É o maior buraco para o jogo "viciar".

### Hordas (o que existe hoje)

- `core/waves.ts`: cada rodada tem uma onda **finita** de `6 + 2·(r−1)` inimigos (teto 20), no máximo 5 a 8 vivos,
  um estouro de 3 no começo e depois 1 a cada 1,5 s **só quando alguém morre**. Por isso parece que "só spawna
  quando muda de fase": com o teto cheio, nada nasce.
- `DIFFICULTY` (`src/data/tuning.ts:154`): `hpPerRound: 0` e `damagePerRound: 0`. **O inimigo comum não fica mais
  forte com as rodadas**, só 3% mais rápido por rodada. A dificuldade sobe apenas pela quantidade.

### Energia Reversa

- Captura no meio da canalização: o player continua na guarda de luta, envolto por uma **bolha oval translúcida**
  lisa (não é pixel art) e chamas ciano subindo, que leem como aura de "super saiyajin" e não como cura.
- No anime a Reversa é discreta e localizada: o corpo se recompõe (ferida fechando, pele/carne voltando), uma luz
  clara e fria contornando o corpo, vapor subindo, e o personagem calmo e concentrado. O efeito é "para dentro", não
  uma explosão de energia para fora.

## Fase A — Cenário (primeiro)

Dividida em duas features para entregar o conserto rápido antes do acabamento.

### F22 `cenario-acabamento` (Large)

1. **Consertos (C1 a C6)**, um commit cada, com teste:
   - Muro próximo desenhado por tema em vez do retângulo: sebe podada e grade de ferro no `parque`; muro de concreto
     com portões de enrolar, pichação e placas na `rua`; tijolo, canos e ar-condicionado no `beco`; parede de lojas na
     `konbini`. Desenhado como folha de tiles repetível (largura ≥ 14 px, ver armadilha do Phaser 4 no handoff), não
     como `rect`.
   - Peça de emenda entre módulos (poste, pilar ou mudança de calçada) no lugar do corte seco.
   - Borda esquerda com frame próprio de limite (muro de contenção ou talismãs apagados), independente do tema.
   - Selo atrás do HUD (C5), depois de achar a causa.
   - Revisar o corpo do chão da `rua` na prancha (C6).
2. **Horizonte por tema (C4)**: a camada distante e a média passam a receber o tema do trecho. Rua: prédios,
   letreiros, fios elétricos e caixa d'água; beco: paredes próximas, escadas de incêndio, varais; parque: copas de
   árvores, lago e postes; konbini: interior (prateleiras, geladeira, caixa).
3. **Primeiro plano**: uma camada de silhuetas na frente do player (parallax > 1, escura e rala: postes, galhos,
   cones) para dar profundidade sem esconder o combate.
4. **Luz**: poças de luz dos postes e das janelas no chão (só cores da `PALETTE`; dither em vez de alpha onde a
   regra da paleta exigir).
5. **Decoração sem colisão** por módulo (máquina de bebidas, placas, lixeiras, bicicletas), sorteada pela seed da
   área para os módulos não se repetirem iguais.

Conferência: prancha por tema em `docs/art/` (ferramenta nova em `tools/`, no molde de `hd-boards.mjs`), capturas
com `tools/visual-shots.mjs` num cenário novo por tema, smokes `world-` e o teste de paleta. O usuário julga
andando pela área.

### F23 `arena-do-santuario` (Large)

Arena do chefe com identidade de "duelo dentro do Véu":

- **Fundo próprio**: céu escurecido pela cúpula do Véu, lua, escadaria de pedra subindo ao templo, torii grande
  ao fundo, árvore sagrada com corda `shimenawa`, telhado do santuário.
- **Chão**: lajes de pedra com musgo e rachaduras, folhas e pétalas soltas.
- **Bordas**: selo de talismãs dos dois lados (a arena fecha atrás do player na entrada), com o mesmo efeito de
  rompimento ao vencer.
- **Lanternas de pedra (`tōrō`)** com chama amaldiçoada que tremula; viram objetos que quebram com golpe forte
  (prepara a F20 `portas-e-destrutiveis` sem depender dela).
- **Reação ao chefe**: entrada com câmera e banner; na fase 2 a luz da arena muda (chamas e céu avermelham, poeira
  cai do telhado); na morte do chefe as lanternas apagam e o selo rompe.
- **Variante por chefe**: Oni do Portão = torii rachado e correntes; Tecelã de Maldições = fios e casulos
  pendurados no templo. A arena é a mesma, a decoração muda pelo chefe da rodada.
- Arena mais larga que uma tela (hoje 40 colunas) para o chefe ter espaço de investida; conferir com o smoke `boss`.

Efeito colateral nos testes: `tests/data/modules.test.ts` fixa os cinco módulos e a ordem de `COMBAT_IDS`; mudar a
largura do santuário mexe nele e nos smokes `world-*`. Módulos novos (estação, telhado, cemitério) ficam para depois
da F23, porque mudam o sorteio por seed.

## Fase B — Rejogabilidade (segundo)

Objetivo: cada run diferente da anterior, decisões com troca de verdade e um motivo para começar outra logo depois
de morrer. Referências: Vampire Survivors (evoluções e desbloqueios por conquista), Hades (meta-progressão e "Pacto
de Punição"), Brotato (personagens que mudam a regra), Dead Cells (ascensões), CoD Zombies (ondas sem fim e recorde).

Ordem pensada para que cada feature seja jogável sozinha.

### F24 `votos-e-evolucoes` (Complex): profundidade dentro da run

- **Votos Vinculativos** (o *shibari* de Jujutsu Kaisen): ao derrotar um chefe (e em eventos), escolher 1 de 3
  votos que trocam algo por poder. Ex.: "metade da vida máxima, técnicas custam 0 de energia por 10 s depois de
  um parry"; "não pode bloquear, golpe forte +60%"; "a Reversa cura o dobro, mas só abaixo de 30% de vida". É a peça
  que mais gera estratégias diferentes, e é fiel ao tema.
- **Evoluções** no molde do Vampire Survivors: técnica no nível máximo + passiva ou relíquia certa = forma evoluída.
  Ex.: Azul + Vermelho no máximo → **Vazio Roxo**; Divergente + Punho pesado → Punho Divergente em cadeia;
  Corte + Lâmina vinculada → Desmantelar. A loja mostra a dica quando metade da receita está na mão.
- **Mais passivas e raridade**: de 6 para cerca de 24 (8 por build), com raridade comum, rara e lendária, e uma
  quarta build ("amaldiçoado": vida trocada por dano, sinergia com votos).
- **Expansão de Domínio** como habilidade final de cada build (barra que enche com o combo), liberada por evolução.

### F25 `meta-progressao` (Complex): motivo para a próxima run

- **Save local** (`localStorage`, com versão e migração; regra pura em `core/save` e o adaptador fino na cena).
- **Moeda permanente** ganha no fim da run (por rodada, chefe e desafio), gasta numa **árvore de desbloqueios**
  que libera **conteúdo** (técnicas, passivas, votos, relíquias entram no sorteio) e um pouco de poder base (vida e
  energia iniciais, um reroll grátis), com teto para não trivializar o começo.
- **Estilos iniciais** (personagens ou escolas de luta) com kit e regra próprios: lutador de rua (o atual),
  usuário de ferramenta amaldiçoada (começa com arma vinculada, sem técnica), feiticeiro de longo alcance (energia
  maior, golpe corpo a corpo fraco). Cada um desbloqueado por conquista.
- **Conquistas e desafios** que desbloqueiam coisas ("vença o Oni sem bloquear", "100 abates com Azul").
- **Fim de run útil**: resumo com dano por fonte, build, votos, recorde, o que foi desbloqueado e o próximo
  objetivo mais perto ("faltam 12 abates com Corte para liberar X").
- **Bestiário e compêndio** que se completa jogando.

### F26 `graus-e-eventos` (Large): variedade e desafio escolhido

- **Graus de maldição** (ascensão): de 1 a 10, cada grau soma uma regra (inimigos com guarda maior, loja mais cara,
  elites mais cedo, menos cura). Recompensa maior por grau; o grau vencido fica salvo.
- **Eventos na travessia**: altar (troca vida por item), baú amaldiçoado (abre e vira emboscada), desafio com tempo
  ("mate 15 sem levar dano") e mercador raro.
- **Rotas**: ao romper o selo, escolher entre duas saídas com a recompensa visível (loja, voto, evento, desafio),
  como as portas do Hades.
- **Seed diária** com placar local.

Dependência: os graus mexem nos números da horda, então a interface da F27 (orçamento de pressão) é desenhada
junto da F26, mesmo que o código venha depois.

## Fase C — Outros refinamentos (terceiro)

### F27 `hordas` (Complex; absorve a F16 `pressao-e-curva`)

- **Diretor de horda** por orçamento: em vez de uma lista fixa, a rodada tem um orçamento de "pressão" por segundo
  que cresce com a rodada e com o tempo dentro dela; o diretor gasta o orçamento em inimigos conforme a tabela de
  composição da rodada. Nascem sem depender de alguém morrer, até um teto de vivos que também cresce.
- **Inimigo de enxame** (novo): maldição pequena, fraca, que morre em 1 a 2 golpes, vem em grupo. É o que permite a
  sensação de Vampire Survivors num jogo de luta: os lutadores atuais (guarda, sequência, telegrafia) continuam
  poucos e perigosos, e o enxame faz o volume. Sem ele, 20 lutadores vivos ficam ilegíveis.
- **Curva de dificuldade de verdade**: ligar `hpPerRound` e `damagePerRound` (hoje 0), elites com afixo (escudo,
  explosivo, rápido, regenerador) a partir de uma rodada, e composição que muda (mais armados, mais brutos).
- **Fim da rodada por cota de abates** (como o Zombies): a contagem no HUD mostra quantos faltam; ao bater a cota o
  diretor para de gastar e a rodada fecha quando o último cai.
- **Rodada especial** a cada N rodadas (o "round dos cães" do Zombies): só enxame, rápida, com recompensa.
- **Spawn justo**: fenda amaldiçoada visível 0,6 s antes de nascer, pelas duas bordas e caindo do alto.
- Desempenho: medir com 30+ corpos Matter vivos antes de fixar o teto (smoke `spawn-pressure`).

### F28 `reversa-anime` (Medium)

- **Pose de canalização** HD: o player sai da guarda, fica ereto, mão no peito ou no ferimento, olhos fechados; a
  pose segura enquanto a tecla está apertada.
- **Contorno de luz** clara e fria seguindo a silhueta (o mesmo passe de `selOut`, em branco e ciano), no lugar da
  bolha oval translúcida.
- **Partículas para dentro**: pontos de luz que convergem para o corpo, não chamas subindo; vapor fino saindo do
  corpo nos primeiros instantes.
- **Recomposição**: rachaduras/feridas desenhadas no sprite que somem conforme o HP volta (2 ou 3 níveis de dano
  visível no player HD).
- **Números**: "+HP" verdes discretos subindo; pulso curto no chão só no começo e no fim.
- **Saída**: um lampejo e o player volta à guarda; se for cortada por golpe, a luz estilhaça.
- Conferir quadro a quadro com um cenário novo em `tools/visual-shots-hd.mjs` e no jogo, em movimento.

## Ordem e entregas

| Ordem | Feature | Tamanho | Depende de |
| --- | --- | --- | --- |
| 0 | Fechar o `feat/builds-e-arsenal` (UAT do usuário e merge no `master`) | — | — |
| 1 | F22 `cenario-acabamento` | Large | 0 |
| 2 | F23 `arena-do-santuario` | Large | F22 (folhas e camadas por tema) |
| 3 | F24 `votos-e-evolucoes` | Complex | 0 |
| 4 | F25 `meta-progressao` | Complex | F24 (o que desbloquear) |
| 5 | F26 `graus-e-eventos` | Large | F25 (salvar grau vencido) |
| 6 | F27 `hordas` | Complex | interface desenhada na F26 |
| 7 | F28 `reversa-anime` | Medium | independente; pode subir a qualquer momento |

As F19 a F21 (verticalidade, portas, perigos) e a F13 a F15 do roadmap continuam válidas e entram depois da F28,
salvo decisão contrária; a F16 é absorvida pela F27. Cada feature segue o processo do `CLAUDE.md`: Specify, Design e
Tasks no `tlc-spec-driven`, HD como base, gate antes de cada commit, smoke só do que foi tocado e o usuário jogando
no fim.

## Decisões em aberto (do usuário)

1. Confirmar se as "paredes verdes" são o C1.
2. Hordas: a rodada termina por **cota de abates** (recomendado, estilo Zombies) ou por **tempo sobrevivido**
   (estilo Vampire Survivors)?
3. Meta-progressão: desbloquear **só conteúdo** ou **conteúdo e um pouco de poder base** (recomendado, com teto)?
4. Aceitar o **inimigo de enxame** como tipo novo (recomendado) para chegar ao volume de horda?
5. Run sem fim (como hoje) ou **run com final** (ex.: vencer o chefe da rodada 20) e modo sem fim desbloqueado
   depois?
