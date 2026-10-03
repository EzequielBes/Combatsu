# STATE

## Decisions

### AD-001
- **Decision**: Toda regra de jogo testável vive em `src/core`/`src/data` sem importar `phaser` como valor e é testada no Vitest em Node; `src/game`/`src/scenes` são adaptadores finos validados por build + smoke headless.
- **Reason**: Dá testes rápidos e determinísticos para a lógica sem precisar de navegador; é o padrão já adotado no sub-projeto 1.
- **Trade-off**: A camada Phaser não tem testes automatizados; regressões visuais dependem do smoke headless e de jogar.
- **Scope**: Todo o jogo (todos os sub-projetos).
- **Date**: 2026-09-23
- **Status**: active

### AD-002
- **Decision**: A arte é pixel art escrita como grades de texto (1 caractere = 1 cor de uma paleta única), renderizada em canvas na inicialização com escala de texel 2 e registrada por chave em `TEX`; o tamanho do sprite nunca define o corpo físico.
- **Reason**: Sem assets externos nem licenças, com paleta e escala verificáveis por teste; trocar por PNG depois é só carregar com as mesmas chaves e nomes de frame.
- **Trade-off**: Desenhar à mão em texto é lento para arte muito detalhada; o parser e o render são código a manter.
- **Scope**: Sprites, tiles, fundos e efeitos de todos os sub-projetos.
- **Date**: 2026-09-23
- **Status**: active

### AD-003
- **Decision**: Duas câmeras: a principal (zoom 1,5, segue o player) desenha o mundo e uma câmera de UI (zoom 1) desenha o HUD; cada objeto é ignorado pela câmera que não é a dele.
- **Reason**: O zoom da câmera principal amplia e desloca até objetos com `scrollFactor 0`; separar mantém o HUD nítido e fixo.
- **Trade-off**: Todo objeto novo de HUD ou de mundo precisa entrar na lista de `ignore` certa.
- **Scope**: Cenas de jogo e qualquer HUD futuro.
- **Date**: 2026-09-23
- **Status**: active

### AD-004
- **Decision**: A progressão é híbrida: uma moeda da run ("fragmentos") compra upgrades temporários na loja entre rodadas e zera no fim da run; uma moeda rara persistente ("selos") compra upgrades permanentes de efeito pequeno fora da run.
- **Reason**: Escolha do usuário; dá curva de poder dentro da run e sensação de avanço entre runs sem deixar o início trivial.
- **Trade-off**: Duas economias para balancear e um save persistente para manter (F6).
- **Scope**: Expansão roguelite (F3, F4, F6 do `.specs/ROADMAP.md`).
- **Date**: 2026-09-24
- **Status**: active

### AD-005
- **Decision**: O jogador começa sem técnica amaldiçoada; técnicas são desbloqueadas e evoluídas (nível 1–3) pela loja, e níveis altos exigem uma rodada mínima.
- **Reason**: Escolha do usuário; controla o balanceamento inicial e amarra técnicas à economia.
- **Trade-off**: O início da run depende só do corpo a corpo; a loja precisa garantir que técnicas apareçam com frequência suficiente.
- **Scope**: F4, F5.
- **Date**: 2026-09-24
- **Status**: active

### AD-006
- **Decision**: Toda aleatoriedade de gameplay (ondas, drops, ofertas da loja, chance de cura, inimigos armados) passa por um RNG com seed em `src/core/rng.ts`; `Math.random` não é usado em `src/core`/`src/data`.
- **Reason**: Testes determinísticos em Node (AD-001) e runs reproduzíveis por seed.
- **Trade-off**: O RNG precisa ser injetado em cada sistema que sorteia.
- **Scope**: Toda a expansão.
- **Date**: 2026-09-24
- **Status**: active

### AD-007
- **Decision**: No Specify, depois de `validate_spec.py`, cada AC passa por um refinamento consultivo com o Jev (TypeSafe System One): julgamentos de ambiguidade, agrupamento, testabilidade e precisão geram `refinement.md`; ACs sinalizados são reescritos ou registrados em Assumptions. A chave fica só em `TYPESAFE_API_KEY` (ambiente ou `.env.local` ignorado pelo git) e nunca em arquivos versionados. O jogo em si não chama o Jev.
- **Reason**: Pedido do usuário; um segundo par de olhos barato e tipado sobre a clareza das stories antes da aprovação.
- **Trade-off**: Depende de rede e de chave; é consultivo, então sem chave o fluxo segue com aviso.
- **Scope**: Specify de todas as features da expansão.
- **Date**: 2026-09-24
- **Status**: active

### AD-008
- **Decision**: Fluxo de branches: cada feature nasce de `dev` em `feat/<nome>` e é mergeada em `dev` com `--no-ff` depois do Verifier PASS; `main` só recebe `dev` quando tudo estiver validado pelo usuário. Sem pull requests. Remote: `origin` = https://github.com/EzequielBes/Combatsu.git.
- **Reason**: Pedido do usuário; `dev` integra as features e `main` guarda só o que foi validado.
- **Trade-off**: Sem revisão via PR; a garantia vem do Verifier e do UAT antes de ir para `main`.
- **Scope**: Todas as features.
- **Date**: 2026-09-24
- **Status**: active

### AD-009
- **Decision**: Os efeitos de técnica amaldiçoada usam, além das grades de texto (AD-002), geometria procedural (`Graphics`: raios, anéis, riscos) e postFX do Phaser (ColorMatrix, Glow, Bloom). Toda cor sai da `PALETTE`, toda geometria encaixa na grade de 2 px e todo gerador de forma aleatória (ex.: raios do Kokusen) é puro, com seed, em `src/core`. Sem WebGL, os postFX são pulados e o resto toca.
- **Reason**: O usuário pediu efeitos fiéis ao anime; tela invertida, raios que mudam de forma e anéis de choque não saem bem só de sprites fixos.
- **Trade-off**: Mais código de efeito para manter e um caminho de fallback sem WebGL para testar.
- **Scope**: F5, F9 e qualquer efeito cinemático futuro.
- **Date**: 2026-09-25
- **Status**: active

### AD-010
- **Decision**: O Kokusen (Black Flash) é da F5, acertado por timing no 2º impacto do Punho Divergente (janela de 80 ms, 140 ms na zona), e não por sorte. A F8 só estende a mesma regra ao finalizador do combo.
- **Reason**: Pedido do usuário de ter o Kokusen com os efeitos do anime na US de técnicas; no anime o Black Flash nasce do Punho Divergente, e timing dá habilidade e comemoração.
- **Trade-off**: A janela curta pode frustrar no começo; o anel de aproximação e a zona existem para ensinar o ritmo.
- **Scope**: F5, F8.
- **Date**: 2026-09-25
- **Status**: active

### AD-011
- **Decision**: O `ganchoAscendente` (MOV-07) aceita J até 100 ms depois de um pulo que saiu do chão com `W`: o pulo é cancelado (volta ao chão, sem gastar o pulo) e o gancho sai. `Space` e `↑` continuam pulando normalmente; `W` continua pulando se nenhum J vier na janela.
- **Reason**: `W` é pulo e "cima" ao mesmo tempo; exigir `W`+`J` no mesmo frame deixava o golpe quase impossível e fazia o jogador pular sem querer (injusto, pouco divertido).
- **Trade-off**: 100 ms de pulo podem ser "desfeitos"; o salto nesse tempo sobe poucos px, então visualmente é um tranco curto.
- **Scope**: F7 (T11/T15, smoke T19).
- **Date**: 2026-09-29
- **Status**: active

### AD-012
- **Decision**: O player ganha acabamento sem mudar proporção, frame (32x24) nem encaixes das partes: um passe de sel-out em `compose` troca todo `k` interno pela linha do material (`x` pele, `h` cabelo, `o` uniforme), detalhes pretos de propósito usam `b`, e as animações aceitam duração por frame (`AnimDef.durations`). A bbox de cada frame antigo fica congelada em `tests/game/fixtures/playerBBoxBaseline.json` (±2 texels).
- **Reason**: Pedido do usuário por sprite "mais profissional e fluido, sem refazer do zero"; o passe automático melhora os ~100 frames de golpes e técnicas de uma vez.
- **Trade-off**: A paleta chegou ao teto de 40 cores; arte nova de outros personagens precisa reaproveitar cores ou subir o teto.
- **Scope**: Sprites do player (e, se adotado, de inimigos e chefes).
- **Date**: 2026-10-01
- **Status**: active

### AD-013
- **Decision**: O inimigo comum tem 3 aparências só visuais (`corcunda`, `rastejante`, `bruto`), sorteadas por um stream próprio (`seed ^ 0x6a09e667`), com o mesmo corpo físico, hitbox e tuning. Golpe leve toca uma reação por região (`pickHitReaction`: cabeça alternando a/b, uppercut, corpo); golpe forte e morte seguram o frame `impact` durante o hitstop e só depois trocam para o ragdoll (criado escondido, revelado no 1º update pós-congelamento).
- **Reason**: Pedido do usuário por inimigos menos genéricos e por "feeling" de impacto por golpe, sem reabrir o balanceamento.
- **Trade-off**: Toda arte nova de inimigo precisa existir nas 3 aparências; o ragdoll aparece 1 hitstop mais tarde do que antes.
- **Scope**: Inimigo comum (não chefes).
- **Date**: 2026-10-01
- **Status**: active (emendada pela AD-020: a aparência também define o tipo do golpe)

### AD-014
- **Decision**: A dificuldade do jogo vem de mecânica (composição de inimigos, leitura, fintas, golpes atrasados, cadência de tokens), não de vida/dano: HP e dano dos inimigos comuns ficam fixos por rodada.
- **Reason**: Pedido explícito do usuário (02/10): desafio estilo Sifu, "lutar bem", não inimigos esponja.
- **Trade-off**: `difficulty.ts` perde o escalonamento numérico; a curva depende de IA e composição bem afinadas.
- **Scope**: Inimigos comuns (F12–F16); chefes mantêm o tier próprio.
- **Date**: 2026-10-02
- **Status**: active

### AD-015
- **Decision**: A postura (estrutura) é a barra central: golpe forte só cambaleia; ragdoll apenas com postura quebrada, flag `knockdown`, morte ou impacto em parede/inimigo. Golpes têm `maxTargets` (leve 1, forte 2) e inimigo no chão leva no máximo 1 golpe.
- **Reason**: Acabar com o spam de voadora e o "bato e os 3 apanham" relatados pelo usuário.
- **Trade-off**: Reabre o balanceamento de F7 (moves.ts) e exige rever smokes que esperam ragdoll em golpe forte.
- **Scope**: Combate do player contra inimigos comuns.
- **Date**: 2026-10-02
- **Status**: active

### AD-016
- **Decision**: Um `AttackDirector` puro concede no máximo 2 tokens de ataque corpo a corpo (+1 de oportunidade em whiff) e 1 token à distância (2 a partir da rodada 8); quem não tem token fica no anel tático (90–140 px), finta e flanqueia.
- **Reason**: Escolha do usuário ("2 por vez") e padrão Sifu/battle circle: pressão legível com consciência das costas.
- **Trade-off**: A IA vira dependente de um estado global da cena; precisa estar no snapshot de debug para os smokes.
- **Scope**: Inimigos comuns e Conjurador.
- **Date**: 2026-10-02
- **Status**: active

### AD-017
- **Decision**: A paleta sobe de 40 para 42 cores (carmim `0xd1103a`, magenta-claro `0xff4f8b`) para o Vermelho no estilo do anime; áudio procedural via ZzFX (sem arquivos).
- **Reason**: O Vermelho atual lê como laranja/fogo; a consciência espacial estilo Sifu depende de deixas sonoras.
- **Trade-off**: Teto da paleta (AD-012) muda; nova dependência npm pequena (MIT).
- **Scope**: VFX de técnica e feedback de combate.
- **Date**: 2026-10-02
- **Status**: active

### AD-018
- **Decision**: A arte dos chefes é montada por pose articulada: volumes (ovais e membros afilados) pintados por código com rampa de 4 tons e contorno `k`, partes desenhadas à mão por cima (rosto, chifres, pés, pano) e o `selOut` no fim. O resultado continua sendo uma grade de texto validada pelo `parseSheet`.
- **Reason**: Um chefe de 40x32 com 20 frames desenhado texel a texel custa caro e sai com sombra incoerente entre os frames; por articulação, uma pose nova são só as posições das juntas.
- **Trade-off**: O acabamento fino (um texel fora do lugar) se resolve ajustando raio e junta, não editando a grade; quem lê `boss.ts` não vê o desenho no código.
- **Scope**: Chefes atuais e futuros. Player, inimigos comuns, objetos e tiles continuam em grades escritas à mão (AD-002).
- **Date**: 2026-10-03
- **Status**: active

### AD-019
- **Decision**: A tela desenha player, inimigo comum e chefe na posição interpolada entre os dois últimos passos de física (`BodyRenderPos`, alfa lido do acumulador do Matter), e a câmera do mundo usa um seguidor próprio (`followCenter`/`scrollFor`) com o centro em ponto flutuante, amortecimento por tempo e `roundPixels` desligado. Física, hitboxes e lógica continuam lendo o corpo.
- **Reason**: O usuário sentiu o personagem "dando flicadas" (03/10). O seguidor do Phaser arredondava o scroll para baixo dentro da realimentação do lerp (tremor de até 1,5 px de tela por quadro), e a física em passo fixo de 60 Hz virava degrau em monitor mais rápido.
- **Trade-off**: A tela mostra até um passo de atraso (meio passo, ~8 ms, a 60 Hz). Todo ator novo com sprite separado do corpo precisa de um `BodyRenderPos`, e tudo que fica preso ao sprite do player (objeto na mão, aura) segue `player.renderPos`, não `player.sprite`. O alfa depende da margem de 1,5 do runner do Phaser 3.90, presa por teste de contrato.
- **Scope**: Câmera do mundo e todo ator desenhado a partir de um corpo do Matter. Objetos soltos, ragdoll, projéteis e drops continuam no ritmo da física.
- **Date**: 2026-10-03
- **Status**: active

### AD-020
- **Decision**: Todo golpe de inimigo declara um tipo (`white`, `red` ou `low`), que vira `height` e `unblockable` no `Hit`; mostra o marcador do tipo sobre a cabeça durante o preparo e o golpe; e tem um ponto de compromisso (200 ms antes da hitbox), a partir do qual só golpe que derruba, quebra de postura, morte ou Contra o interrompe. Golpe de sequência leva `string: { id, index, length }` no `Hit`. O tipo sai da arma e da aparência (`attackKindFor`): porrete `red`, `rastejante` `low`, o resto `white`.
- **Reason**: O loop ler → responder → punir da F12 depende de o jogador saber o tipo antes do golpe e de a defesa certa ser a única resposta depois do compromisso. Emenda a AD-013: a aparência deixa de ser só visual no tipo do golpe; corpo, hitbox e tuning continuam iguais.
- **Trade-off**: Todo ataque novo de inimigo (arquétipos da F14, Conjurador da F15) precisa declarar tipo, marcador e compromisso; `rastejante` passa a exigir pulo ou esquiva desde a rodada 1.
- **Scope**: Inimigos comuns e seus projéteis futuros. O chefe só ganha `height` nos golpes que já tem.
- **Date**: 2026-10-03
- **Status**: active

### AD-021
- **Decision**: O inimigo comum que sobrevive a um golpe só entra em ragdoll se o `Hit` tem `knockdown: true`; golpe forte sem a marca cambaleia (`stagger`). Golpe de técnica amaldiçoada leva `tech: true`, fica fora do limite de 1 golpe no chão e, quando forte, leva `knockdown`. Golpe do jogador com limite de alvos passa pelo `TargetGate`; o alvo avisa o bloqueio pelo `report` de `receiveHit`.
- **Reason**: Implementa a AD-015 com uma regra única e legível no dado do golpe, sem reabrir o balanceamento das técnicas da F5.
- **Trade-off**: Quem cria um `Hit` novo precisa decidir as marcas; esquecer `knockdown` num golpe que deveria derrubar só aparece jogando ou no smoke.
- **Scope**: Todo `Hit` contra inimigo comum.
- **Date**: 2026-10-03
- **Status**: active

## Handoff

- **Feature**: nenhuma em andamento. `sprite-chefes-e-acabamento` (47 ACs) e `movimento-suave-e-objetos-no-chefe` (23 ACs) fechadas com Verifier PASS (rodada 2 nas duas), aprovadas pelo usuário no UAT de 03/10 ("Pode dar merge pra dev. tá legal") e mergeadas em `dev` com `--no-ff` (merges `7267f58` e `20a5cb8`). Não houve push.
- **O que entrou**: chefes redesenhados e animados, golpes do player afinados, objetos e pendências dos inimigos; objetos acertam o chefe, câmera sem tremor e interpolação entre passos de física (AD-018, AD-019).
- **Origem e escopo**: o usuário pediu "melhore sprites" e depois relatou itens atravessando o inimigo e o personagem "dando flicadas". O escopo foi escolhido sem consulta (Assumptions das duas specs com "Confirmed? n"); o resultado ele aprovou jogando.
- **Verificado em `dev` depois do merge**: build ok e 1780 testes; a árvore é idêntica à da branch que passou nos 30 smokes.
- **Pendente**:
  1. Perguntas que ficaram sem resposta do usuário: a taxa de atualização do monitor dele (75/120/144 Hz só foram conferidos por simulação) e se o alcance do arremesso incomoda (a garrafa cai depois de ~260 px, a cadeira depois de ~140 px).
  2. Decisão do usuário em aberto: silhueta própria para a Tecelã (substitui o BTIER-06).
  3. `main` só recebe `dev` quando o usuário pedir (AD-008). As branches `feat/sprite-chefes-e-acabamento` e `feat/movimento-suave-e-objetos-no-chefe` continuam existindo; apagar só se ele quiser.
  4. Pendências antigas: remover a worktree `scratchpad/wt-f10` (`git worktree remove`; o `node_modules` dela é junction, não apague com rm recursivo) e as branches já mergeadas, se o usuário quiser; UAT em `dev` de ritmo e spawn, limitador de 2 atacantes, loja/maestria, chefe vencível no soco e Vermelho carmim. A worktree `surGue-player-refine` é um rascunho de 28/09, 159 commits atrás de `dev`.
- **Próximo**: F12 `combate-mestre` (Specify), seguindo `docs/superpowers/specs/2026-10-02-combate-mestre-design.md`; depois F13–F16. F6 e F9 ficam para depois da expansão.
- **Identidade do git**: no perfil `sexta-feira` não há `user.name`/`user.email`. Os commits das duas features usaram `git -c user.name="Claude" -c user.email="ezequieltbeserra00@gmail.com"` (a identidade do histórico), sem gravar configuração; o usuário ainda não confirmou.
- **Lições**: L-052 a L-058 (candidatas) saíram das rodadas do Verifier; L-010 e L-043 seguem as únicas confirmadas. Fora do `lessons.py`: rodar o teste de cada AC novo contra a branch base antes de implementar (EPD-03, OBJ-03 e OBJ-04 já passavam em `dev`).
- **Como trabalhar**: Opus 5.5 planeja/orquestra, workers Sonnet 5.5 (`model: sonnet`), no máximo 2 agentes; `py`/`python` (não `python3`) roda os scripts do tlc; `lessons.py` recebe `--root .` antes do subcomando; o Verifier usa worktree temporária com junction para o `node_modules` (remover a junction antes da worktree).
- **Dicas técnicas**:
  - Posição de desenho: ator novo com sprite separado do corpo usa `BodyRenderPos` (`src/game/physics.ts`); o que fica preso ao sprite do player segue `player.renderPos`. No snapshot, `view` é o sprite desenhado e `physics.alpha` é a fração entre os passos.
  - No harness de debug o alfa é constante, mas nem sempre 0,5: depende do que o loop em tempo real deixou no acumulador do Matter antes do primeiro `step()`. Smoke que mede posição de desenho lê `physics.alpha` e só conta quadro com exatamente um passo.
  - Revisão de arte: `node tools/sprite-preview.mjs [dir]` (com `SPRITE_SCALE=8`) cobre player e inimigos; não cobre chefes nem objetos. Pranchas desta entrega em `docs/art/sprite-chefes-e-acabamento/` (ignorada pelo git).
  - Captura de tela do jogo: o `step()` do harness não redesenha; use `window.__game.render()` ou deixe o loop em tempo real. Em Edge headless com swiftshader o jogo roda a ~15 fps, então medir fluidez em tempo real ali não serve.
  - Smoke que golpeia inimigo comum precisa de `enemyGuard=0` (L-042). Tecla 3 do debug mata o player; `?debug&round=5` abre o Oni e `round=15` a Tecelã; `?debug&enemyVariant=corcunda|rastejante|bruto` força a aparência.
  - Intermitentes: `heal` (HEAL-09) e `armed` (ARM-12) também em `dev`; `enemy-react` falhou 1 vez em 2 suítes completas ("socoBaixo deveria acertar", golpe não chegou a sair) e passou 3 de 3 sozinho. A causa conhecida é a entrada por tecla entre o tempo real e o `step`.
  - `tests/core/lightning.test.ts` (1000 seeds) estoura 5 s com a máquina carregada; passa livre ou com `--maxWorkers=2`.
  - Ciclo do inimigo: 450 ms windup + 120 ms ataque + 800 ms descanso; `step(16)` = 1 frame, `step(16.7)` pode virar 2.
- **Para o UAT da F7**: pé solto nos frames `chuteGiratorio-wind` e `chuteCarregado-wind`; parry anula até golpe imbloqueável e a onda de choque do chefe (leitura literal de PAR-02; decidir se fica); tempos/hitboxes dos golpes em `src/data/moves.ts`.
- **Para o UAT do sprite**: seguem abertos `land-1` com pernas um pouco longas, braço de trás solto no `jump-0`, `ganchoAscendente-hit` com cabeça torta e `voadora-hit` com o joelho de trás lendo como braço. No chefe, olhar a pose do `dead`, o orbe do preparo da rajada e o novelo creme da Tecelã.
- **Blockers**: nenhum para seguir em `dev`; `main` espera o pedido do usuário.
- **Branch**: `dev`
