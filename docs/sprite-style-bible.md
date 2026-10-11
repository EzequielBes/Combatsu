# Bíblia de estilo dos sprites (Nano Banana)

Resumo para escrever prompts. As fontes mandam: `docs/plano-sprites-hd.md` (direção de arte), `src/game/art/hd/palette.ts`
(paleta do player HD), `src/game/art/hd/sheet.ts` (contrato da folha), `src/data/moves.ts` (golpes). Atualizada em
09/10/2026. O que está marcado **provisório** ainda não foi aprovado pelo usuário vendo uma imagem.

## O jogo

- Roguelite de luta 2D, vista lateral plana, cenário noturno urbano. Tela 1280x720 com zoom 2 (640x360 px de mundo),
  1 texel = 1 px de mundo.
- **Decisão do usuário (09/10/2026):** os sprites do protagonista gerados no Nano Banana entram no jogo como arte final
  ou perto disso (PNG), e o personagem novo substitui o protagonista atual. Hoje o jogo ainda desenha tudo em código
  (`src/game/art/hd/`, sem `load.image`); o caminho de importação está sendo aberto por quem cuida do código.
- **Densidade do player: 2x, aprovada pelo usuário em 09/10/2026** ("2x é melhor", vendo
  `.fable-out/nano/prova-ancora-v1.png`). 120 px de arte na guarda (do alto do cabelo à sola), exibidos em 60 px de
  mundo com escala 0,5. Célula 192x160, eixo do corpo na coluna 72, sola na linha 159. Hitboxes, física e números de
  mundo não mudam. Exceção consciente à densidade única do plano HD: o pixel do personagem tem metade do tamanho do
  pixel do cenário. Inimigos seguem a 52 a 56 px de mundo e, quando forem refeitos, vão para a mesma densidade.
- Alvo de redução de toda faixa: a régua (guarda) com 120 px de altura. Orçamento de detalhe: o que ocupa 2 px ou mais
  a 120 px entra (cordão da calça, fecho da jaqueta, olhos).

## Modelo

- Preferido pelo usuário: Nano Banana 2.1 (lançado em 06/10/2026). Ele testou o Pro e achou menos consistente. Não
  recomendar troca de versão sem motivo medido.

## Bloco de estilo: personagem (provisório)

Colar palavra por palavra. Luz escrita para o personagem voltado para a direita. O estilo-alvo é o da folha de
referência do usuário (sprite de jogo de luta 16-bit detalhado), com o contorno do jogo. A luz fria de recorte saiu do
bloco: o modelo a ignorou no âncora, e pedi-la nas faixas daria quadros com e sem ela.

```
Detailed 16-bit fighting-game pixel art, in the style of the attached reference: realistic slim proportions, crisp square pixels, clean hard edges, no anti-aliasing, no gradients, no blur. The figure is designed to survive being reduced to about 120 pixels tall, so shapes are large and clear and each material uses at most five flat tones, with broad shadow shapes instead of fine texture. A hard near-black navy outline (#0B0D1A) runs around the outside of the silhouette; inside the figure, folds and overlaps are drawn with a darker tone of the same material instead of black lines. Light comes from the right side of the image; shadows fall on the side nearer the left edge. Cloth is matte with a few broad folds; skin and hair have no glossy highlights.
```

## Paleta e recorte

- Fonte: `src/game/art/hd/palette.ts` (rampas de 5 tons + luz de recorte por material; contorno `#0B0D1A`). A
  quantização final é nessa paleta. Já servem: `white` (jaqueta e tênis), `skin`, `hair`, `gold` (guarda da katana).
- Faltam na paleta, a criar no código: vermelho do cabo (`#B0252F` e dois tons, provisório) e um preto de calça mais
  escuro que o `pants` atual (cinza-ardósia), se o `hair`/`shoe` não servirem.
- Cor de recorte: magenta `#FF00FF` (o personagem não usa rosa nem magenta). Efeitos luminosos: sobre preto puro, em
  camada própria; nunca dentro do quadro do personagem.

## Proporções e orientação

- ~5 cabeças em pé (medido no âncora v1: 4,6 na guarda agachada, queixo marcado a olho). Pedi 6, veio 5; fica 5,
  porque lê melhor no tamanho do jogo.
- Guarda de base larga: 78 px de largura a 120 px de altura; do eixo (centro do quadril), 40 px para trás e 38 para a
  frente. Com o eixo na coluna 72, ocupa as colunas 32 a 110 da célula de 192.
- Orientação padrão: voltado para a direita; pernas de perfil, tronco bem virado para a câmera e cabeça em três
  quartos, como na referência. Guarda: punhos erguidos, joelhos dobrados, pés afastados.

## Atlas do protagonista (pronto para o jogo)

- `.fable-out/nano/atlas/yuta-atlas.png` (RGBA 8 bits, alfa 0 ou 255; células de 192x160 em grade de 11 colunas; sola
  na linha 159, eixo na coluna 72) e `yuta-atlas.json` (grade, nomes, cores usadas, caixa, topo da cabeça, `reach`
  nos `-hit`, `hand` nas técnicas). Começa por `idle-0` (âncora v2 sem katana, 120 px) e `run-0` a `run-9`.
- A corrida saiu da última folha do usuário (11 figuras, 2400x1792; cópia de trabalho só na pasta temporária, origem
  `Generated Image October 09, 2026 - 2_37PM.jpg` em Downloads). Ciclo de 10: de cima T1, T2, T4, T5, T6 e de baixo
  B1 a B5; o T3 (agachado, sem par na outra passada) ficou de fora para as duas passadas terem 5 quadros.
- Escala: âncora a 13,725 px por px de arte; corrida a 5,96 pela largura do cabelo, e a linha de baixo a 6,32 (o
  corpo dela veio ~6% maior para a mesma cabeça; sem isso o personagem crescia na segunda passada).
- Consertos feitos no recorte, sem nova geração: T5 e T6 separados por corte; franja roxa do JPG removida; contorno
  `#0B0D1A` reposto onde a borda ficou clara (inclui as solas cortadas da linha de baixo); cores quantizadas em
  `hd/palette.ts`, sem os três dourados claros (pintavam a pele de laranja).
- O que a paleta não tem: cinza-preto neutro para a calça (ela cai nas rampas `hair`/`shoe` e fica arroxeada).
- **Golpes acrescentados em 09/10/2026** (a corrida já está no jogo e foi aprovada pelo usuário): o atlas passou a
  2112x480, grade de 11 colunas por 3 linhas, 29 células. A linha 0 (`idle-0`, `run-0..9`) ficou idêntica, pixel a
  pixel. Novas, na ordem: `jab-wind`, `jab-hit`, `direto-wind`, `direto-hit`, `chuteFrontal-wind`, `chuteFrontal-hit`,
  `chuteAlto-wind`, `chuteAlto-hit`, `rasteira-wind`, `rasteira-hit`, `duck`, `jump-0`, `jump-1`, `apex-0`, `fall-0`,
  `land-0`, `voadora-wind`, `voadora-hit`. Origem: folha de 17 figuras do usuário (3168x1344, `Generated Image October
  09, 2026 - 3_40PM.jpg`), escala 4,442 px por px de arte (a guarda dela com 120 px; cabelo 27,7 contra 26,7 do
  âncora). `apex-0`, `fall-0` e `voadora-wind` repetem a pose de `jump-1`: a folha só tem uma pose encolhida no ar.
- Alcance medido nos `-hit` (px de arte do eixo ao ponto mais avançado): jab 59, direto 65, chuteFrontal 73, chuteAlto
  60, rasteira 72, voadora 58 (a mão; o pé fica atrás). O jogo espera punho a ~60 e pé a ~72.
- Efeitos desenhados (rastro do jab, arcos dos chutes, poeira da rasteira) saíram no recorte: some todo pixel com cor
  de efeito (claro e pouco saturado, franja magenta, poeira) que alcança o fundo de fora sem cruzar o contorno. Duas
  armadilhas: partir só do fundo de fora (buraco interno abre caminho até a jaqueta) e não tratar sombra de pele como
  franja (come o punho). O quadril de cada figura foi marcado a olho na folha (erro de ~3 px de arte).
- **Folhas 2, 3 e técnicas (09/10/2026):** o atlas passou a 2112x1120, grade 11x7, 72 células. Origem: `Generated
  Image October 09, 2026 - 3_49PM.jpg` (22 figuras, escala 4,058), `3_51PM.jpg` (24 figuras, 4,071) e `4_06PM.jpg`
  (técnicas, 32 figuras, fundo rosa `#E26ECC`, escala 3,083). Escala de cada folha = altura mediana das guardas / 120.
  - Células 29 a 54: `guard`, `parry`, `dodge-0`, `dodge-1`, `hurt`, `fall-1`, `land-1`, `socoBaixo-wind/hit`,
    `ganchoAscendente-wind/hit/recover`, `socoAereo-wind/hit`, `pisao-wind/hit`, `chuteGiratorio-wind/hit`,
    `joelhada-wind/hit`, `palmaExplosiva-wind/hit/recover`, `contra-wind/hit`, `direto-recover`.
  - Células 55 a 71: `vermelho`, `azul`, `corte`, `divergente` com `-sign`, `-charge`, `-release`, `-recover`, e
    `kokusen-hit`. Cada uma tem `hand` no JSON (mão que conjura: dx do eixo, dy acima da sola), marcada a olho.
  - Trocadas entre as 29 antigas: `apex-0`, `fall-0`, `land-0` (eram repetidas ou menos fundas) e `voadora-hit` (era a
    mão; agora é a joelhada no ar). O `land-0` antigo virou `land-1`.
  - Cópias (mesma figura, dois nomes): `pisao-wind` = `jump-1`; `fall-1` e `pisao-hit` = mesma figura; `corte-release`
    = `vermelho-release`; `divergente-release` e `kokusen-hit` = `palmaExplosiva-hit`.
  - Sem arte ainda: `hurt-1`, `stunned-0/1`, `gancho`, `cotovelada`, `chuteEmpurrao`, `chuteCarregado`, `contraGancho`,
    `idle-1..3`, e os quadros com objeto na mão.
- Lições destas folhas: (1) efeito desenhado POR CIMA do corpo não sai: as três figuras cobertas (corte com arco,
  soco com raios pretos, impacto do Kokusen) foram descartadas e trocadas por cópias de poses limpas; pedir ao usuário
  que gere as técnicas sem efeito. (2) Fundo que não é magenta puro precisa de chave própria (medir a cor). (3) Em
  folha pequena (3 px por px de arte) o contorno é fino e a remoção de claros vaza para pele e jaqueta: só ligar onde
  há efeito claro. (4) Pele avermelhada confunde a regra de "vermelho de efeito": exigir verde baixo.
- **Correção de escala da folha 3 (09/10/2026):** a fonte dos quadros passou a ser `assets/yuta/quadros/` (72 PNGs
  de 192x160) com `assets/yuta/atlas.json`. Os quadros vindos da folha 3 estavam ~7% pequenos: a régua "guarda = 120
  px" enganou, porque as guardas dessa folha são mais eretas e de base mais estreita que a do âncora. Reextraídos do
  JPG com fator 1,07 nas linhas 1 e 2 da folha e 1,05 na linha 3, em `.fable-out/nano/atlas/quadros-corrigidos/`
  (o coordenador confere e copia). Lição: escala de folha se mede pela largura do cabelo na fonte (alvo ~26 px de
  arte na minha medida, ~24 na do coordenador), nunca pela altura de uma guarda; conferir folha contra folha antes de
  entregar.
- **Folhas de defesa, objeto e corrida (09/10/2026, à espera de conferência do coordenador):** 26 quadros em
  `.fable-out/nano/atlas/quadros-novos/` (com `novos.json`, `tira.png` e GIFs); nada copiado para `assets/` ainda.
  Origem: `Generated Image October 09, 2026 - 6_57PM.jpg`, `6_57PM (1).jpg` e `6_59PM.jpg` (2400x1792, 9 ou 10
  figuras de ~660 px com rótulo de texto embaixo).
  - Defesa: `guard`, `guard-hit`, `duck`, `duck-hit`, `parry`, `parry-hit`, `hurt`, `hurt-1`, `stunned-0` (sem
    `stunned-1`: a folha não tem segundo quadro de cambaleio).
  - Objeto: `carry-idle-0`, `carry-idle-1`, `swing-wind`, `swing-hit` (o disparo-0), `swing-recover`, `throw-0`,
    `throw-1`; kunai e efeitos removidos; `hand` e `angle` no JSON, marcados a olho (erro de ~2 px). Ficaram de
    fora preparar-1, finalização e recuperar-1.
  - Corrida: `run-start-0/1`, `runalt-0..3`, `run-stop-0..3`. As quatro `runalt` não fecham laço (três são a mesma
    passada, nenhuma tem a perna trocada) e são baixas (104 a 113 px contra 132 a 139 da corrida atual): a corrida do
    jogo continua sendo `run-0..9`.
  - Escala: 5,65 a 5,88 px por px de arte, uma por linha de cada folha (mediana da largura do cabelo das figuras de
    cabeça reta), calibrada para o cabelo sair com a mesma medida do `idle-0` (25 px pela régua de sequência escura;
    ~24 pela do coordenador). Guarda nova com 115 a 118 px, contra 120 do `idle-0` e 110 do `guard` antigo.
- Os scripts (`atlas.ps1`, `golpes.ps1`, `golpes23.ps1`, `tec.ps1`, `Atlas.cs`, `Fx.cs`, `Tec.cs`, `V5.cs`) são
  descartáveis e estão na pasta temporária da sessão; os das folhas de defesa, objeto e corrida ficam em `dir2/`
  (`build.ps1`, `figs.ps1`, `entrega.ps1`, `N.cs`).

## Imagens âncora

- **Âncora v1 do protagonista (aprovado pelo diretor de arte; falta o aval do usuário):**
  `.fable-out/nano/ancora-v1-limpo.png` (1792x2400, fundo trocado por magenta puro). A figura ocupa x 164..1580,
  y 120..2315; o "pixel" desenhado tem ~14 px, isto é, a figura tem ~150 px na grade dela. Serve de âncora para toda
  faixa e vira `idle-0`. Reduções de prova: `ancora-v1-60.png` e `ancora-v1-120.png` na mesma pasta.
- **Âncora atual: v2, sem katana** (edição do v1; mancha solta apagada à mão pelo coordenador):
  `.fable-out/nano/ancora-v2-sem-katana.png` (2400x1792, figura em x 647..1715, y 85..1731). É o âncora de todas as
  faixas e a origem do `idle-0`. O v1 fica só como registro de onde a katana se prende.
- Para anexar no AI Studio, usar a metade: `ancora-v2-sem-katana-meio.png` (1200x896). Imagem de 1792x2400 deu
  "Input image is too large to upsample"; manter anexos até ~1600 px no lado maior.
- **Atenção (conferido em 10/10/2026): `ref-corrida-jogo.png` está desatualizada.** Mostra o player antigo em código
  (jaqueta azul, ~4 cabeças), não o protagonista atual. Só serve como plano B de pose, dizendo no prompt que é outro
  personagem. A corrida atual (`assets/yuta/quadros/run-0..5`) também não serve de referência de pose: tem o mesmo
  defeito de braços que nunca trocam.
- **Referência de pose da corrida (antiga): os sprites do player em código.** `.fable-out/nano/ref-corrida-jogo.png` (1536x864,
  16:9, 2 linhas de 4, `run-0` a `run-7` ampliados 5x por vizinho mais próximo sobre magenta, sem moldura) e
  `ref-corrida-jogo.json` (célula, eixo e chão por quadro; topo da figura em texels: 61, 57, 59, 63, e o `run-3`/`run-7`
  com os pés 6 texels acima do chão). O script que a gera (`folha-jogo.mjs`, descartável) serve para qualquer quadro
  de `renderHdPlayer()`. As guias de palito (`guia-corrida-*.png`) estão abandonadas.
- Referência de estilo usada para gerar o âncora: `.fable-out/nano-ref-estilo-usuario.png`. Depois do âncora, não
  anexar mais: o âncora já carrega o estilo.
- `.fable-out/nano-ref-estilo-player-hd.png` (o player antigo de 4 cabeças): **não anexar**.
- Tudo em `.fable-out/` está fora do git; a origem do âncora é o JPG do usuário em Downloads.

## Ficha: protagonista (provisória)

- Cabelo preto bagunçado, volumoso, franja sobre a testa.
- Jaqueta branca de gola alta com fecho deslocado para o lado, mangas arregaçadas até o cotovelo (antebraços à
  mostra), barra solta na altura do quadril.
- Calça preta reta com cinto escuro e cordão branco na cintura (veio da referência; a 120 px lê); tênis branco
  de cano alto.
- Katana: **peça separada, fora dos quadros do corpo** (decisão de 09/10/2026, depois da corrida v1, em que a bainha
  cresceu e mudou de ângulo em todo quadro). As faixas são geradas com o personagem sem katana, a partir do âncora sem
  katana. A katana é um sprite próprio (cabo de ~1 cabeça enrolado em vermelho, guarda dourada pequena, bainha escura,
  ~3 cabeças no total), desenhado pelo jogo atrás do corpo, preso a um ponto das costas com ângulo por quadro. Na
  guarda: ~30 graus da vertical, cabo acima do ombro de trás, ponta da bainha abaixo da cintura do lado da frente.
  Serve ao saque futuro: bainha e espada já nascem como objetos.
- Não escrever "Yuta" nem "Jujutsu Kaisen" no prompt: descrever o desenho.

## Folha final: o que cada faixa precisa entregar

- Célula 192x160, eixo na coluna 72, sola na linha 159. Nomes de quadro iguais aos da folha atual (`idle-0`,
  `jab@startup-0`, `guard`...).
- Golpe: 7 quadros no jogo (`MOVE_PHASE_FRAMES`: 2 + 2 + 3). Na faixa gerada: régua + 6 poses (antecipação, meio da
  subida, pico, início da volta, fim da volta, retorno à guarda). O overshoot (`@active-1`) é o pico repetido com 1 px
  de avanço, feito no fatiamento.
- **Decisão do usuário (09/10/2026): o personagem é quadro desenhado inteiro, gerado e editado no Nano Banana.**
  Boneco de peças recortadas ou articuladas está descartado de vez ("horrível, nunca mais faça isso"); não propor de
  novo.
- **Método atual (o do usuário, 09/10/2026, o único que deu movimento bom):** prompt curto, em português, em linguagem
  natural, dizendo o papel de cada anexo; anexos = o âncora (`ancora-v2-sem-katana`) + várias folhas de sprite reais
  daquele movimento, pegas na internet (quais folhas: em aberto, perguntar ao usuário e guardar os arquivos). O prompt
  dele: "Preciso que crie um spritesheet de corrida seguindo o padrão mantendo consistencia visual. aqui tem varias
  referencias para utilizar na fabrição da folha de animação. o arquivo ancora-v2 é o meu personagem na forma base
  dele você deve fazer as animações pra ele mantendo exatamente o mesmo visual, proporções, tamanho, cabelo, roupa
  etc, as outras imagens são para te ajudar com referencia de sprites de corrida".
- **Molde dos próximos prompts:** o texto dele, no mesmo tom e tamanho, mais um parágrafo curto só com o que o recorte
  precisa: fundo magenta chapado sem chão nem sombra; quantos quadros e em quantas linhas, na ordem do movimento;
  espaço vazio entre as figuras, nenhuma encostando nem passando por cima da vizinha; nenhuma cortada pela borda;
  mesmo tamanho e pés na mesma linha. Nada de guias, manequins, bloco de estilo ou instrução de sistema longa.
- Referências a procurar por animação: folhas de jogo de luta em vista lateral, viradas para a direita, com o
  movimento inteiro (golpe: antecipação, impacto, volta; pulo: impulso, subida, ápice, queda, pouso; defesa: guarda,
  esquiva, levar golpe).
- Conferência de cada folha: fatiar por contorno, uma escala única pela largura do cabelo (âncora: 26,7 px de arte),
  alinhar pelo chão da fileira e pela cabeça, e olhar o ciclo inteiro em GIF. O sobe-e-desce da cabeça tem de ser
  suave e repetir a cada passada.
- Número de quadros: a corrida do usuário tem 14 (7 por passada). `AnimDef` aceita qualquer número de quadros e
  durações; o que hoje prende a corrida a 8 é `RUN_FRAMES` em `hd/families/locomotion.ts` e `hdRunAnim` em
  `hd/sheet.ts`. Com 14 quadros no mesmo tempo de ciclo (536 ms), cada quadro fica ~38 ms, acima do mínimo de 33.
- Corrida 8; idle 4 (âncora + 3 derivados por deslocamento de pixel, não gerados); pulo 2, ápice 1, queda 2, pouso 2.
  Não existe caminhada.
- Alcance das poses, em px de mundo (dobrar para px de arte): punho no pico a ~30 do eixo (hitbox `FIST` cobre de 9 a
  35), pé no pico a ~36 (`KICK` de 10 a 42).

## Lições

- Com a referência do usuário anexada, o desenho dela ganha do texto: voltaram o cordão da calça (que o texto não
  pedia), a cabeça de 5 cabeças (o texto pedia 6) e a luz sem recorte frio. Para mudar algo que a referência mostra,
  é edição sobre o resultado, não texto no prompt inicial.
- O app devolveu JPG: o magenta veio com média (252, 14, 251) e verde de 0 a 79, e sobra franja roxa na redução. Pedir
  PNG (AI Studio) nas faixas; no recorte, limiar com tolerância e descarte de borda arroxeada.
- Corrida v1 (régua + 8 numa tela modelo de 9 células): o modelo ignorou a tela modelo, redesenhou a régua e devolveu
  10 figuras em 2 linhas de 5, a 1K (1584x672). Ele não desenha este estilo com menos de ~250 px por figura; 5 figuras
  por linha em 21:9 é o que ele faz sozinho. Não pedir mais que isso por imagem.
- "Body at its lowest, knee bent" virou agachamento com o joelho no chão, e "same pose with legs swapped" virou cópia.
  Descrever cada pose por onde estão os pés e os joelhos, e dizer que ele corre ereto.
- Katana descrita em texto numa pose inclinada: a bainha cresce e fica na horizontal. Não gerar a katana nas faixas.
- Corrida v2 (régua + 4, só texto): estrutura certa (5 figuras, uma linha, desenho consistente, 3168x1344), mas a
  "passagem" virou pose em pé de frente e o "contato" não saiu. Pose descrita só por texto falhou duas vezes; a pose
  passa a vir de imagem (guia com manequins). O modelo também desenhou uma linha de chão preta e encheu a altura
  toda: pedir margem e dizer que o chão não é desenhado.
- Figuras muito juntas se sobrepõem na caixa de recorte (mão de uma dentro da caixa da outra): fatiar por componente
  conexo, não por caixa, e pedir espaço entre elas.
- Corrida v3 (âncora + guia de manequins): a guia funcionou. Layout, margens, contagem e poses saíram como na guia,
  sem resto de manequim e sem linha de chão. É o método para todas as faixas.
- Medida de escala: a largura do cabelo nas 4 figuras de corrida ficou em 199 a 202 px (1,5% de variação), contra 181
  na régua. Ou seja, as figuras da faixa são coerentes entre si e ~10% maiores que a régua, cuja cabeça está em três
  quartos. Normalizar a faixa com **um fator único**, não por figura; a régua serve para a linha dos pés.
- O modelo segue o manequim ao pé da letra: a passagem saiu ereta porque o manequim estava ereto, e o impulso saiu
  alto demais (100 px acima do chão em 809 de guarda). Inclinar o manequim como se quer a figura; a altura do salto se
  corrige no fatiamento (4 px de arte).
- Posição de cada figura na célula: usar o x do quadril do manequim na guia (escalado para a saída), não o centro da
  caixa.
- Corrida v3 reprovada pelo usuário em movimento: "cresce de tamanho", "pouco anatômica e fluida", "não fecha o laço".
  Causas: manequins desenhados à mão, cada pose solta, sem trajetória de quadril e cabeça (a altura subia 115, 118,
  127, 129 e voltava num salto); meio ciclo em laço; passagem ereta. Tira ou GIF de meio ciclo não se mostra ao
  usuário: só o ciclo inteiro.
- Corrida v4 (8 quadros, guia de manequins do rig, 2752x1536): **segunda falha de movimento**. O modelo respeitou a
  grade, a escala (cabelo de 154 a 161 px nas 8 figuras) e o acabamento, mas não as poses: tronco quase ereto em vez
  dos ~24 graus do rig, nenhum agachamento de `run-1`/`run-5`, linha de baixo copiada da de cima sem trocar as pernas.
  Ele desenha "a corrida que conhece" no lugar de cada manequim. O topo da cabeça ficou de 14 a 30 px de arte acima do
  rig; descontado o desvio comum, 4 dos 8 quadros ainda passam dos 2 px. Manequim de palito só é obedecido quando a
  pose já é a que o modelo faria (foi o caso da v3).
- Conclusão registrada: gerar quadro a quadro não converge para movimento fiel ao rig. O que o Nano Banana entrega bem
  e de forma estável neste projeto é o **desenho** (personagem, acabamento, escala). Decisão pendente do usuário entre
  (A) peças geradas uma vez e animadas pelo rig do jogo e (B) insistir em quadros gerados.
- Folha de peças v1 (7 peças, 2752x1536, a partir do âncora v2): o modelo entrega folha de peças limpa de primeira,
  com o mesmo acabamento do âncora e escala coerente (cabeça de 400 px = 25 px de arte, 16 px por px de arte). Cópia
  de trabalho só na pasta temporária; a origem é o JPG do usuário em Downloads (`Generated Image October 09, 2026 -
  1_15PM.jpg`). Defeitos da folha: antebraço veio com meia manga em cima (aproveita-se do punho da manga para baixo),
  canela veio com 53 px de arte para um osso de 29 (aproveita-se a metade de baixo), encaixe de ombro cinza no
  tronco, braço tão largo quanto a coxa.
- Prova do boneco de peças (fora do jogo, script descartável): cada peça é carimbada ao longo do osso do rig
  reescalado, amostrada por vizinho mais próximo direto na célula de 192x160; os braços saem dos encaixes de ombro do
  tronco em três quartos, não das articulações de ombro do rig. Arquivos em `.fable-out/nano/boneco-*.gif` e
  `boneco-comparacao.png`. O movimento é o do rig (laço fechado, escala fixa); o acabamento perde para o quadro
  gerado: juntas de joelho e cotovelo aparentes, braço de longe como placa cinza, guarda ~8% mais alta e de base mais
  estreita que a do âncora (a guarda do rig tem os pés a 17 px, a do âncora a 39). Decisão entre peças e quadros
  gerados segue pendente do usuário.
- A guia de palitos do rig reescalado (corrida v4) lia como "perna quebrada", nas palavras do usuário: tronco esticado
  2,73x, pernas da mesma espessura cruzando uma sobre a outra nas poses agachadas, sem volume para dizer qual está na
  frente. Palito sem corpo não serve de referência de pose; o sprite do jogo, com volume e cor, serve.
- Corrida do usuário (14 quadros, 2 linhas de 7, 2752x1536): desenho fiel ao âncora, escala estável (cabelo de 25,7 a
  27,2 px de arte), ciclo completo que fecha, cabeça subindo e descendo 12 px por passada de forma suave. Defeitos só
  de disposição: as 3 últimas figuras de cada linha se sobrepõem (a perna de trás das figuras 6 e 7 some atrás da
  vizinha), a linha de baixo tem os tênis cortados pela borda e a primeira figura encosta na borda esquerda. Limpos
  para o atlas: 4 ou 5 de 14. Lição: prompts longos com guias renderam menos que o prompt curto dele com folhas reais
  de referência; o que faltou foi só pedir espaço e margem.
- Largura do cabelo medida figura a figura oscila ~3% só pela pose (cabeça inclinada ou mão por cima chegam a 7%),
  enquanto o corpo das figuras de uma mesma linha é coerente: aplicar a medida por figura faz a perna mudar de
  tamanho entre dois quadros da mesma animação. Medir figura a figura, mas aplicar a mediana por linha da folha, e
  conferir o resultado medindo o cabelo no quadro reduzido contra o `idle-0` (a redução come as pontas: mirar ~5%
  acima do alvo na fonte).
- Remoção de efeito por inundação de cor clara só serve quando o efeito não cruza o contorno. Rastro ou poeira
  desenhados por cima da borda (disparo-0, tênis das paradas) abrem a jaqueta ou o tênis e a inundação come o
  interior: nesses casos, desligar a inundação, apagar por polígono marcado na folha e recolorir o que sobrou em
  cima da peça (poeira bege sobre o tênis vira cinza).
- Rótulo de texto embaixo de cada figura não atrapalha quando há um vão até a sola: sai como componente separado.
  Objeto na mão sobre fundo (kunai acima ou abaixo do punho) sai por polígono sem retoque; pedir sempre o objeto
  fora do corpo.
- Folha de corrida pedida com rótulos "corrida-0..3" voltou com a mesma passada repetida: para ciclo, o método que
  funcionou continua sendo o do usuário (folha real de referência, ciclo inteiro numa imagem).
- Lote 3 (`.fable-out/nano/atlas/quadros-lote3/`, 20 quadros de duas folhas com o nome do jogo escrito embaixo, 5 ou
  6 figuras por linha): todas as figuras e todos os rótulos saíram como componentes separados, inclusive o rótulo
  em duas linhas; nenhum polígono de limpeza foi preciso. Figura compacta (corrida de perfil) tem ~85 mil px na
  folha: o limiar de área que separa figura de rótulo é 60 mil, não 90 mil. A linha da folha se decide por um corte
  de y por folha (as folhas têm alturas diferentes).
- Quadro que troca com um existente se alinha pelos pés do existente, não pelo quadril marcado a olho: `land-1` e
  `idle-1` saíram 5 a 6 px fora pelo olho e bateram ao pixel pelos pés.
- Respiração pedida em outra geração: só serve o quadro que repetiu a base do `idle-0`. `idle-2` repetiu (pés nas
  mesmas colunas, tronco 1 px mais baixo, punhos 1 a 3 px mais baixos) e troca com o `idle-0` sem pulo; `idle-1`
  veio com a base 11 px mais estreita e os dois pés escorregam. Ao pedir respiração, anexar o `idle-0` e pedir "pés
  nos mesmos lugares".
- `carry-run` pedido por rótulo (6 quadros): corrida baixa e inclinada, 102 a 108 px contra 131 a 141 da corrida
  atual; não é um ciclo (apoio alterna frente/trás a cada quadro, 4 e 5 quase iguais) e no quadro 1 o braço que
  segura foi para trás. `throw-run`: só o quadro 0 corre, os outros três têm os dois pés plantados. Confirma a lição
  acima: ciclo de corrida não sai de rótulos, sai de folha real de referência.
- Os quadros de golpe atuais (`divergente-release`/`kokusen-hit`, hoje o mesmo desenho) avançam o corpo ~20 px além
  do eixo dentro da célula; quadro novo recortado com o quadril na coluna 72 alcança menos (51 e 43 px contra 74).
  Compensar com deslocamento do quadro na folha, não com outro desenho.
- Lote 4 (`.fable-out/nano/atlas/quadros-lote4/`, folha `base` + `run-start-0..6` / `run-stop-0..6`, 8 e 7 figuras
  por linha em 2752x1536): caixas se sobrepõem, mas as 15 figuras e os rótulos saíram como componentes separados,
  sem efeito e sem polígono de limpeza. A `base` (régua redesenhada pelo modelo) veio 5% menor que as vizinhas da
  linha (cabelo 133 contra mediana 141): fica fora da mediana e recebe escala própria, e então bate com o `idle-0`
  (120 px, pés a 1 px).
- "Início de corrida" pedido por rótulo rende uma aceleração, não um ciclo: a figura sobe de 105 a 116 px ao longo
  dos 7 quadros e em todos é a perna do lado da câmera que apoia (a passada da outra perna não existe; 2 e 4 são a
  mesma pose). O laço aproveitável é de uma passada só (`run-start-4,5,6`: apoio, impulso, contato), estável (cabeça
  a 1 px na horizontal, 3 na vertical; o `run-0..3` antigo salta 9 e 9), porém trote ereto de braços recolhidos, não
  o sprint inclinado do antigo.
- "Freio com deslize" pedido por rótulo voltou sem deslize: passada plantada, corpo subindo até ficar em pé de
  braços soltos (3, 4 e 5, sendo 4 e 5 iguais) e volta à guarda. A pose de derrapagem (tronco para trás, braço
  aberto) só existe nos `run-stop-0/1` antigos. O último quadro (`run-stop-6`) repete a base do `idle-0` 2 px mais
  baixo e serve de assentamento antes dele.
- Lote 5 (`.fable-out/nano/atlas/quadros-lote5/`, folha "hold/throw" de 15 figuras em 2752x1536 e folha
  "combo-soco" de 10 figuras em 2400x1792): as 25 figuras e os rótulos (inclusive a legenda entre parênteses) saíram
  como componentes separados, sem efeito e sem polígono. O modelo repete rótulos na folha (`hold-idle-1`,
  `hold-run-3`, `throw-run-2` duas vezes): identificar pela posição, nunca pelo texto.
- "Segurando objeto com as duas mãos" pedido sem o objeto na imagem volta como a folha anterior redesenhada: a
  primeira figura é a régua (guarda), e `hold-run-0..4` são `run-start-2..6` do lote 4 quase ao pixel (corrida de
  punhos fechados). Só uma figura parada veio com os punhos juntos à frente do cinto. Para pose de carregar, o
  objeto (ou um bloco neutro no lugar dele) precisa estar na referência; depois sai por polígono.
- As três figuras paradas dessa folha vieram 5% menores que as de corrida da mesma linha (cabelo 133 contra mediana
  142), como a `base` do lote 4: escala própria, e então medem 120 px como o `idle-0`.
- Golpes pedidos por rótulo com legenda ("combo-soco-N (Direto/Cross)") vêm todos com a base da guarda: alinhados
  pelos pés ficam a até 3 px do `idle-0`, sem pulo, mas o braço estica menos (punho a 53 a 55 px do eixo; os quadros
  atuais chegam a 59 a 74 porque avançam o corpo). "Gancho" veio como direto com a mão no queixo, "cotovelada" como
  guarda alta e "impacto de duas mãos" como dois punhos de braço dobrado (43 px): golpe curvo ou de palma não sai
  só da legenda.
- Lote 6 (`.fable-out/nano/atlas/quadros-lote6/`, golpes pedidos por rótulo com legenda entre parênteses: voadora,
  soco baixo, soco aéreo; 5 e 7 figuras por linha em 2752x1536): golpe de 3 a 5 poses sai bem de rótulo (ao contrário
  de ciclo de corrida). As 12 figuras, os rótulos e as legendas saíram como componentes separados, sem efeito e sem
  polígono. As duas linhas vieram em escalas diferentes (cabelo 131 e 126 px): a mediana por linha resolve.
- Golpe aéreo ancorado pela sola muda de altura na célula quando a pose muda de forma: o quadril cai ~27 px entre
  `voadora-wind` (118 px de altura) e `voadora-hit` (chute horizontal, 85 px). Se a física não cobrir, sobe-se o
  quadro na folha. Alcance acertado por deslocamento do quadro: `voadora-hit` +4 px (pé a 72) e `socoAereo-hit` +8 px
  (punho a 60); o soco baixo deu 61 só com os pés alinhados aos do `idle-0`.

- Lote 7 (`.fable-out/nano/atlas/quadros-lote7/`, folha "corrida-alt" de 10 figuras, 5 + 5, em 1200x896): folha a 1K
  dá 2,9 px de fonte por px de arte (as de 2752 dão ~5). Ampliada 2x por vizinho mais próximo, passa pelos mesmos
  scripts e limiares; figuras e rótulos saem como componentes separados. O preço é o contorno: a borda chega
  cinza-arroxeada e só 5 a 6% dos pixels caem no `#0B0D1A` (os quadros atuais têm 8 a 10%). Conserto no recorte: todo
  pixel de borda externa vira contorno. As linhas internas (rosto, dobras) continuam mais fracas: pedir 2K ou mais.
- Com os quadros atuais de referência, o modelo os redesenha: 4 das 10 figuras são `run-0`, `run-1`, `run-stop-1` e
  a guarda quase ao pixel. O que veio de novo foram três poses que faltavam (contato de passada larga, apoio com o
  calcanhar atrás, impulso com os braços trocados), suficientes para um laço de duas passadas.
- Em corrida de calça igual nas duas pernas, a troca de perna se lê pelos braços (manga branca de perto, cinza de
  longe): contato e o impulso seguinte têm braços opostos. Quadro de voo recortado com a sola na 159 fica com a ponta
  do pé no chão: subir 4 px na folha.

- Folha de corrida de 10/10/2026 (`Generated Image October 10, 2026 - 10_20PM.jpg`, 2912x1440, 8 figuras em 2 linhas
  de 4, ~650 px cada; só conferida a olho, não fatiada): desenho, escala e espaçamento bons, movimento reprovado. Os
  braços não trocam em nenhum quadro, a linha de baixo repete a de cima (meio ciclo duas vezes), só há duas poses de
  perna (impulso e apoio; falta o contato de perna estendida à frente) e o tronco muda de inclinação sem padrão. Erro
  de estrutura: gera-se de novo a partir do âncora, em conversa nova e sem anexar a folha ruim (o modelo redesenha o
  que recebe). No prompt, dizer que cada linha é uma passada e qual braço vai à frente em cada uma (provisório até a
  próxima folha voltar).

- Lote 8 (`.fable-out/nano/atlas/quadros-lote8/`, duas folhas "batendo-2m-0..3" / "batendo-1m-0..3" em 2752x1536, 12
  e 10 figuras): o modelo desenha mais figuras que rótulos (um rótulo sob 1 ou 2 figuras seguidas do mesmo momento);
  as 22 saíram como componentes separados, mesmo com caixas sobrepostas. Escolher o componente pela ordem na linha, não
  pelo x do quadril. A guarda de fim de linha veio de novo ~3% menor que as vizinhas (cabelo 135 contra 139,5):
  escala própria, e então bate com o `idle-0`.
- Golpe com arma pedido sem a arma volta como soco: "uma mão" é direto de punho fechado (o arco só existe do
  armar ao recolher: 20, 90, 133 graus), "duas mãos" é marretada até o chão numa folha e empurrão de mãos abertas na
  outra. Nenhuma folha traz pose de recolhimento depois do golpe: o recover sai de outra posição da linha (a figura
  antes do impacto, ou a de punho na cintura). Mão aberta não se fecha no recorte; pedir "punhos fechados".
- Quando o modelo desenha um toco de cabo na mão (dois borrões escuros, acima e abaixo do punho), sai por dois
  polígonos na folha e o punho é redesenhado fechado em px de arte (9x7); o contorno se repõe sozinho no acabamento.
- Alinhamento de golpe no chão: pé da frente parado nas colunas do `idle-0` (94 a 111) em todos os quadros da
  sequência, e o quadril sai da coluna 72 (2 a 15 px à frente). Isso dá o avanço do corpo que o recorte pelo quadril
  não dava. Pose de base muito mais larga (marretada, 118 px) não cabe na regra: fixa-se o pé de trás no do quadro
  vizinho e o da frente avança.
- Ângulo da arma "pelo antebraço" falha em duas poses de duas mãos: com as mãos acima da cabeça os antebraços dão 0
  (a arma pede -10 a -20, para trás) e na marretada apontam para baixo (a arma atravessaria o piso; fica deitada, 105).

- Lote 9 (11/10/2026, três folhas de 1376x768: defesa com 4 figuras, contra-ataque com 5, chute com 5; `Generated
  Image October 11, 2026 - 9_51AM/9_54AM/9_57AM.jpg`): as 14 figuras saíram como componentes separados, sem rótulo,
  sem efeito e sem polígono. Escala pela largura do cabelo: 5,95 (defesa), 3,75 (contra) e 4,44 (chute) px de fonte
  por px de arte. A folha do contra tem a cabeça maior para o corpo: pela medida do cabelo a guarda dela daria 108 px,
  então ficou no meio-termo (cabelo 26, guarda 112). Redução por voto da maioria na paleta dos quadros atuais (37
  cores) e contorno reposto em todo px de borda. Entraram: `guard-raise`, `guard`, `guard-hit` (pés centrados nos do
  `idle-0`, base 22 px mais estreita), `parry`, `contra-wind/hit/recover` (ponta do pé da frente na coluna 111) e
  `chuteAlto-wind/hit/recover`, copiados para `chuteGiratorio-*` por decisão do usuário (pé de apoio na coluna 72; na
  volta, 60). Ficaram de fora a guarda aberta da folha de defesa, a primeira pose do chute e as guardas de fim de linha.

- Lote 10 (11/10/2026): `Generated Image October 11, 2026 - 10_42AM.jpg` (1376x768, 6 figuras do chute giratório com
  anéis lilás, arco branco e riscos de movimento; 2,62 px de fonte por px de arte) e a captura `chutes.png` (736x453, 5
  figuras do chute alto com arco e poeira; 2,08). Os efeitos saíram por inundação a partir do fundo: todo px claro
  (r e b acima de 140) que alcança o fundo sem cruzar o contorno vira fundo. Funcionou porque nenhum efeito passa por
  cima do corpo; o tênis que chuta fica à frente do arco e o contorno dele segura a inundação. Entraram
  `chuteCarregado-wind`, `-wind-2`, `-hit`, `-recover`, `-recover-2` (figuras 1 a 5 da primeira folha) e, no chute
  alto, `chuteAlto-wind` (a primeira pose da folha de chute do lote 9), `chuteAlto-wind-2` e `chuteAlto-recover-2`
  (figuras 1 e 4 da captura). As figuras 2 e 3 da captura ficaram de fora (arco e poeira por cima da perna). A folha
  passou a aceitar mais de um quadro por fase do golpe (`<golpe>-<fase>-2`, `-3`...), repartindo o tempo da fase.

- Lote 11 (11/10/2026, `Generated Image October 11, 2026 - 11_16AM.jpg`, 1376x768, 6 figuras do gancho com salto,
  3,16 px de fonte por px de arte): a folha veio com uma linha de chão escura de ponta a ponta (linhas 607 a 612), que
  juntava as figuras; sai trocando por magenta toda linha com mais de 80% de px que não são fundo, e serve de régua da
  altura do salto. O arco branco do soco saiu pela inundação do lote 10. Entraram `ganchoAscendente-wind`, `-hit`,
  `-hit-2` (no ar, 5 px acima do chão), `-recover` (28 px acima) e `-recover-2`. O ápice tem 154 px de altura: com os
  10 px de salto da folha passava dos 160 da célula, então subiu só 5. O corpo físico do player não sai do chão neste
  golpe; o salto é só do desenho.
