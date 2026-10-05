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

### AD-022
- **Decision**: A F12 fecha sem os smokes T36 a T40 e sem o Verifier formal: o gate foi `npm run build`, os 2088 testes unitários e a suíte inteira de smokes (31 ok; `kokusen` falhou 1 vez e passou 3 de 3 isolado), mais o UAT do usuário, que aprovou as mecânicas.
- **Reason**: Pedido do usuário ("não vai precisar de tanto smoke"); as regras novas já têm testes unitários em Node (AD-001).
- **Trade-off**: A tabela de defesa, o Contra, a voadora e a leitura não têm smoke de ponta a ponta; uma regressão na cena só aparece jogando ou na suíte antiga.
- **Scope**: F12; nas próximas features, smoke só para o que os unitários não alcançam.
- **Date**: 2026-10-03
- **Status**: active

### AD-023
- **Decision**: O motor passa do Phaser 3.90 para o Phaser 4.2 (branch `chore/phaser-4`). Os efeitos de tela e de sprite deixam o `postFX` e usam os filtros do Phaser 4: `ColorMatrix` em `cameras.main.filters.internal` (quadro de impacto e Kokusen; o do Kokusen fica inativo fora da cinemática) e `Glow` em `filters.external` do orbe do Vermelho (espaço de tela, como era). A tinta sólida é `setTint(cor).setTintMode(Phaser.TintModes.FILL)`. Emenda a AD-009 (onde se lê postFX, leia filtros; o Bloom nunca foi usado) e a AD-019 (a margem de 1,5 do runner do Matter é a mesma no 4.2, presa pelo teste de contrato).
- **Reason**: Pedido do usuário (04/10). O Phaser 4 traz o renderizador novo e recursos de pixel art (`vertexRoundMode`, `smoothPixelArt`) que o plano de sprites HD pode usar.
- **Trade-off**: O quadro de impacto agora aparece nos 2 quadros renderizados que a IMP-11 pede (no Phaser 3 o filtro recém-criado só aparecia no render seguinte, então durava 1). Objetos em px ímpar de mundo com zoom 1,5 desempatam o meio pixel para o lado oposto (marcador de telégrafo, barra de vida do inimigo, texto "CONTRA": 1 px). O renderizador Canvas está depreciado no Phaser 4 e o caminho `degraded` do jogo continua sem smoke.
- **Scope**: O jogo inteiro. A regressão visual se repete com `node tools/visual-shots.mjs <pasta> --random=0.8 --gpu` e `node tools/visual-diff.mjs <A> <B> <diff>` (75 estados; relógio virtual e `Math.random` fixo para as capturas serem comparáveis).
- **Date**: 2026-10-04
- **Status**: active

## Handoff

- **Onde está**: branch `chore/phaser-4` (sobre `feat/sprites-hd-fase1`, sobre `chore/organizacao-do-codigo`, sobre `spike/heroico-fable`), sem push, árvore limpa. Em 04/10/2026: gate verde (2527 testes), 34 smokes ok. É a base atual do projeto: nada disso foi mergeado em `dev`.
- **Feito nesta leva**:
  - Organização: Prettier, oxlint com tetos (exceções em `.oxlintrc.json`; o typescript-eslint recusa TypeScript 7), `npm run gate`, divisão de `Player.ts`, `Enemy.ts`, `TestScene.ts` e `art.test.ts`.
  - Player HD atrás de `?hd=1` (`src/game/art/hd/`): corpo de ~60 texels, 1 texel = 1 px de mundo, tela 1280x720 com zoom 2. Todas as animações refeitas por família em `families/` (core, locomotion, defense, punches, kicks, aerial, tech, carry); cada golpe é um `HdMoveSpec` de poses-chave expandido em 7 quadros. O usuário aprovou o design e pediu coreografia de Jujutsu Kaisen com peso de Sifu.
  - Phaser 4.2.1 (AD-023): migração auditada e com regressão visual de 75 estados contra o Phaser 3.
  - Pedidos do usuário depois de jogar: corrida com os braços balançando de forma contínua; Punho Divergente refeito no estilo do Itadori; chama azul de energia amaldiçoada no punho do Divergente (`src/core/flame.ts`, `src/game/techFx/CursedFlame.ts`, prancha em `node tools/flame-preview.mjs`); duas pegadas de objeto (leve na mão da frente, pesado erguido atrás do ombro, quadros `heavy-`), com o objeto preso à mão de perto e girando com o antebraço.
- **Next step**: o usuário avisou que a próxima tarefa são melhorias no jogo (ainda não disse quais). Esperando o retorno dele sobre: se a chama azul parece a do anime (aprovada, trocar por ela a aura do corpo da conjuração em `techFx/Aura.ts` e levá-la aos golpes fortes, `CursedFx.emitFlame`); a cadeira erguida acima do ombro contra apoiada nele; se liga o `?hd=1` por padrão. Depois, do plano: borrão de impacto e movimento secundário de cabelo e paletó, atlas PNG, inimigos e chefes na mesma densidade (aí reajustar as hitboxes).
- **Como conferir arte e efeitos**: `node tools/hd-boards.mjs --frames <lista> --name <nome> --out <pasta>` (pranchas de poses); `node tools/visual-shots.mjs <pasta> [cenário] --random=0.8 [--gpu]` (capturas no jogo; `hdDivergente` e `hdCarry` dão recortes ampliados do player) e `node tools/visual-diff.mjs`. O usuário joga em `npm run dev` com `?debug&hd=1`. Erro que só apareceu jogando: a corrida trocava os braços de lado a cada passo; prancha estática não pega isso.
- **Fracos conhecidos**: gancho de lado e cotovelada (rig de perfil, sem giro de tronco), pico do pisão, selos e voltas das técnicas genéricos; a aura do corpo da conjuração é a antiga, de 2 quadros; arremesso de objeto pesado usa a pose do leve; UI levemente borrada com `?hd=1` (escala 4/3); hitboxes do corpo antigo; `feel`, `impact` e `kokusen` falham de vez em quando nos smokes com a máquina carregada, e `tests/core/lightning.test.ts` estoura 5 s sob carga (`--maxWorkers=2`).
- **Restrição**: toda arte é feita pelo Claude em código e ferramentas grátis; nada manual nem pago. Qualidade primeiro: arte e revisão em Opus 5.5 ou Fable, Sonnet só no mecânico.

Pendências antigas que continuam: silhueta própria para a Tecelã; alcance do arremesso (garrafa ~260 px, cadeira ~140 px); taxa de atualização do monitor do usuário; `main` só recebe `dev` quando ele pedir; worktrees antigas e branches já mergeadas para limpar se ele quiser. Depois da F12: F13 `foco-e-ambiente`, F14, F15, F16; F6 e F9 depois da expansão.
