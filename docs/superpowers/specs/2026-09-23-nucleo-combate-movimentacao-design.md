# Núcleo de Combate e Movimentação — Design

**Data:** 2026-09-23
**Status:** Aprovado para planejamento de implementação
**Sub-projeto:** 1 de 3 (ver "Contexto do projeto maior" abaixo)

## Contexto do projeto maior

Este é o primeiro de três sub-projetos independentes de um jogo de plataforma
inspirado em Jujutsu Kaisen, com estrutura de mundo grande e interligado
(estilo Hollow Knight) e mecânicas roguelike:

1. **Núcleo de combate e movimentação** (este documento) — movimentação,
   combate corpo a corpo, interação física com objetos do cenário, sistema
   de impacto/ragdoll.
2. **Progressão e habilidades** (futuro) — energia amaldiçoada, técnicas
   (Domínio Infinito/Seis Olhos do Gojo, Clivar/Desmantelar do Sukuna,
   habilidades físicas da Maki), árvore de upgrades.
3. **Estrutura de mundo e roguelike** (futuro) — mapa grande interligado,
   runs, permadeath, meta-progressão entre tentativas.

Cada sub-projeto tem seu próprio ciclo spec → plano → implementação. Este
documento cobre **apenas o sub-projeto 1**.

## Objetivo e critério de sucesso

O objetivo não é produzir um jogo completo agora, e sim uma **demo web
jogável** (protótipo pequeno, vertical slice) que permita avaliar, jogando,
se o "feel" de mover, bater e usar objetos do cenário como arma é divertido
o suficiente para justificar explorar a ideia mais a fundo depois. Não há
prazo de lançamento definido nem compromisso de longo prazo — o
desenvolvimento é exploratório e incremental, e a demo web existe
justamente para decidir barato se vale a pena continuar.

**Critério de sucesso:** existe uma página web jogável com o personagem se
movendo, batendo corpo a corpo, pegando/batendo/arremessando pelo menos
dois tipos de objeto físico, contra pelo menos um inimigo que reage a
golpes leves e fortes e morre em ragdoll.

## Stack técnica

- **Plataforma:** jogo web (roda no navegador), pensado como demo — sem
  necessidade de instalar nada além de abrir a página.
- **Framework:** Phaser 3 + TypeScript, com Vite para o dev server e build.
  Phaser já resolve tilemap, câmera, animação de sprite e carregamento de
  assets — o que também vai servir de base para o mundo grande do
  sub-projeto 3.
- **Física:** Matter.js, como plugin de física nativo do Phaser. Um único
  motor de física cobre tanto os objetos interativos quanto o ragdoll
  (corpos compostos + constraints), evitando ter que sincronizar dois
  sistemas de física diferentes na mesma cena.
- **Estilo visual:** 2D pixel art. Como o jogo agora é nativamente 2D, não
  existe mais "eixo de profundidade" ou "plano travado" — isso era uma
  necessidade da versão 3D anterior e não se aplica aqui.
- **Produção de arte:** pixel art (sprites de personagem, objetos,
  cenário) precisa vir de fora do trabalho de código — Claude não gera
  imagens. Para esta fase de demo, a recomendação é usar assets prontos
  gratuitos/placeholder (ex.: packs de itch.io/OpenGameArt) para validar o
  gameplay antes de investir em arte definitiva própria ou encomendada.

## Escopo

**Dentro do escopo:**
- Controlador de movimentação do personagem (correr, pular).
- Combo de golpes corpo a corpo desarmado.
- Sistema de objetos interativos do cenário (pegar, bater, arremessar,
  quebrar) com propriedades configuráveis por objeto.
- Sistema de reação a impacto (animação vs. ragdoll) para inimigos.
- Um inimigo de teste simples e uma cena de teste pequena.

**Fora do escopo (sub-projetos futuros):**
- Energia amaldiçoada e qualquer técnica amaldiçoada.
- Progressão de nível, upgrades, seleção de habilidades.
- O mundo grande interligado — aqui existe só uma cena de teste pequena.
- Estrutura de roguelike: runs, morte permanente, meta-progressão.
- IA de inimigo sofisticada (padrões de ataque, variedade de inimigos).

> **Nota de escopo (2026-09-23):** uma IA simples de inimigo (patrulha,
> perseguição e um golpe telegrafado) e a vida do player (dano,
> invulnerabilidade e respawn) entraram neste sub-projeto pela feature
> `.specs/features/visual-e-jogabilidade`, para a demo ficar jogável. A IA
> sofisticada continua fora do escopo.

## Arquitetura

### 1. Controlador de movimentação

- Todo o jogo roda sobre o mesmo mundo de física do Matter.js (precisamos
  dele de qualquer forma para objetos e ragdoll), mas o corpo do player
  **não é controlado por física livre**: velocidade é setada diretamente a
  cada frame (`Body.setVelocity`), e a detecção de chão usa sensores em
  vez de depender da resposta de colisão do motor. Isso dá a precisão
  determinística de plataforma que um metroidvania precisa (pulos
  consistentes, sem deslizar), mesmo rodando sobre um motor de física real.
- Ações do MVP: correr, pular com altura variável pelo tempo do botão
  pressionado. Dash/esquiva curta é um stretch goal opcional deste
  sub-projeto — não bloqueia a validação do protótipo se não entrar a
  tempo.

### 2. Sistema de objetos interativos

Cada objeto do cenário (cadeira, garrafa, etc.) é dirigido por uma
definição de dados (propriedades: peso, dano causado, durabilidade — nº de
impactos até quebrar —, força de arremesso, e tags como "cortante"/
"inflamável", reservadas para uso futuro por técnicas amaldiçoadas). Criar
um objeto novo é preencher esses dados, não escrever código novo.

O objeto segue uma máquina de estados, desenhada especificamente para
**nunca poder travar fisicamente o player ou um inimigo** (requisito
central, já que o jogo é um metroidvania de plataforma precisa):

- **Repouso** — objeto solto no cenário. Colide fisicamente só com o
  terreno/ambiente; via `collisionFilter` (category/mask) do Matter.js,
  ignora completamente a colisão física com Player e Inimigo (eles podem
  encostar/atravessar sem ser bloqueados). A coleta acontece por uma zona
  de interação por proximidade (um corpo sensor), não por colisão física.
- **Segurando** — objeto na mão do player ou de um inimigo. Sem colisão
  física alguma; é posicionado visualmente num socket na frente ou atrás
  do personagem, espelhado conforme a direção que ele olha. Sem colisão,
  nunca pode ficar preso em geometria enquanto é carregado.
- **Em uso** — golpe com o objeto na mão, ou objeto em voo após ser
  arremessado. Vira um sensor de hit ativo (`isSensor: true` + evento de
  colisão do Matter). Cada acerto carrega uma referência de **dono** (quem
  bateu/arremessou); ao colidir com um personagem, se esse personagem for
  o dono, o hit é ignorado — isso evita que o player se acerte com o
  próprio arremesso mesmo que player e inimigo estejam na mesma categoria
  de "alvo atingível". Bater ou arremessar um objeto conta sempre como
  golpe **forte** (ver Sistema de impacto).
- **Quebrando** — ao acumular dano igual à durabilidade do objeto (número
  de impactos contra inimigo, parede, chão etc.), entra num estado curto
  de quebra (animação/partícula), perde toda colisão e some por fade após
  um tempo. Objetos mais resistentes (ex.: cadeira) têm durabilidade maior
  que objetos frágeis (ex.: garrafa), mas todo objeto quebra eventualmente.
- **Retorno a Repouso** — se um objeto resistente é arremessado, atinge
  algo e ainda não atingiu sua durabilidade máxima, volta ao estado de
  Repouso (perde o sensor de hit ativo, volta a ignorar Player/Inimigo)
  até ser pego de novo.

### 3. Sistema de combate corpo a corpo

Combo desarmado simples de 2-3 hits (ex.: soco, soco, chute), implementado
com sensores de hitbox/hurtbox do Matter.js — não colisão física direta,
para manter o combate responsivo e previsível. O último hit do combo é
classificado como golpe forte; os anteriores como golpes leves (ver
Sistema de impacto).

### 4. Sistema de impacto (animação vs. ragdoll)

Duas camadas de reação a dano, agnósticas da origem do golpe (soco,
objeto arremessado, ou — no futuro — técnica amaldiçoada), classificadas
como **leve** ou **forte**:

- **Golpe leve** (hits normais de combo): reação por animação de sprite
  apenas (frames de hit-reaction). Sem física. Mantém o combate legível e
  responsivo.
- **Golpe forte** (finalizador de combo, uso de objeto do cenário — e no
  futuro, técnica amaldiçoada pesada): ativa um ragdoll parcial temporário,
  construído com corpos compostos do Matter.js (poucos segmentos —
  tronco, braços, pernas, cabeça — não precisa ser um esqueleto completo)
  ligados por constraints, com um impulso aplicado na direção do golpe.
  Não é um "active ragdoll" full-time controlando a locomoção — é o
  padrão clássico de alternar entre animação e ragdoll temporário.
  - **Se o inimigo sobrevive:** fica atordoado no chão (vulnerável a mais
    dano) por um tempo curto, depois volta à animação normal com um
    "levantar" simples, sem blending físico complexo entre a pose final
    do ragdoll e a animação.
  - **Se é o golpe fatal:** ragdoll permanente por alguns segundos e
    depois o corpo se dissolve (efeito visual de fumaça/energia
    amaldiçoada), condizente com o tema de espíritos amaldiçoados e
    evitando acúmulo de corpos ragdoll na cena.
  - **Nota de estilo:** pixel art rotacionando livremente por física
    tende a serrilhar/distorcer, já que é desenhada em ângulos fixos.
    Isso é uma característica conhecida dessa combinação, não um defeito
    a resolver — jogos como *Broforce* (2D pixel art, combate corpo a
    corpo, objetos de cenário arremessáveis/destrutíveis, mortes em
    ragdoll físico) mostram que funciona bem e pode até virar parte do
    charme visual. Se incomodar na prática, a saída é usar poucos
    segmentos maiores no ragdoll (menos rotação visível por peça) em vez
    de tentar simular mais física.

Esse pipeline é reaproveitável integralmente pelo sub-projeto 2: quando
técnicas amaldiçoadas existirem, cada uma só precisa se classificar como
golpe leve ou forte para herdar todo o comportamento de impacto.

## Cena de teste (vertical slice)

Uma sala/corredor pequeno e fechado (não o mundo grande do sub-projeto 3),
rodável no navegador via dev server local, contendo:
- O player completo: movimentação, combo corpo a corpo, e interação
  (pegar/bater/arremessar) com pelo menos dois tipos de objeto com
  propriedades diferentes (ex.: cadeira pesada e resistente vs. garrafa
  leve e frágil).
- Um inimigo de teste simples, capaz de: receber e reagir a golpes leves
  (animação) e fortes (ragdoll), e morrer entrando em ragdoll permanente
  seguido de dissolução.

Essa cena é o que será jogado para decidir se vale a pena explorar a ideia
mais a fundo (sub-projetos 2 e 3).

## Riscos e pontos de atenção para o plano de implementação

- **Origem dos assets de pixel art:** não é algo que se resolve só com
  código — precisa decidir cedo entre packs prontos/placeholder (mais
  rápido, recomendado para a demo) ou arte própria/encomendada (mais lento,
  fica para depois se a demo validar a ideia).
- Ajuste fino de física do Matter.js (evitar jitter/instabilidade,
  corpos "explodindo") para os objetos em Repouso e durante o ragdoll —
  validar cedo com testes manuais, não só em teoria.
- A transição de estado do objeto (Repouso ↔ Segurando ↔ Em uso) precisa
  trocar corretamente `collisionFilter`/tipo de corpo em cada mudança de
  estado, incluindo casos de borda (ex.: objeto largado no meio do ar,
  personagem morre segurando um objeto).
- A transição ragdoll → animação ("levantar") é conhecida por ser
  visualmente ingrata se feita de forma simplista; vale reservar tempo de
  iteração visual, não só funcional.
- Controlar o player por velocidade direta sobre um corpo do Matter.js
  (em vez de física livre) precisa de testes manuais de "feel" desde
  cedo — teoria não garante que vai parecer preciso.

## Próximos passos

Este documento serve de base para o plano de implementação detalhado, a
ser criado com a skill `writing-plans`.
