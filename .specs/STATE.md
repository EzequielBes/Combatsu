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
- **Status**: active

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

## Handoff

- **Feature**: F11 `ritmo-economia-e-chefe` fechada (Verifier PASS na rodada 2: 61/61 ACs, 14/14 mutantes mortos) e mergeada em `dev`. F10 `personagem-e-vermelho` em correção de cobertura na worktree `scratchpad/wt-f10` (branch `feat/personagem-e-vermelho`)
- **Feito**: F0–F5, F7, `sprite-player-polish`, `enemy-sprite-variety` e F11 em `dev`; 1300 testes, 27 smokes
- **Próximo**: re-verificar a F10, mergear em `dev` (conflitos esperados em `debugApi.ts`, `TechRunner.ts`, `TestScene.ts`, `tests/game/debugApi.test.ts`), UAT do usuário; depois F12 `combate-mestre` (Specify)
- **Como trabalhar**: Opus 5.5 planeja/orquestra, workers Sonnet 5.5 (`model: sonnet`), no máximo 2 agentes; worker que cair é retomado do `git diff`; `py`/`python` (não `python3`) roda os scripts do tlc
- **Dicas técnicas**:
  - Revisão de arte: `node tools/sprite-preview.mjs [dir]` (com `SPRITE_SCALE=8` para zoom) gera a prancha e as tiras por animação em PNG
  - Smoke novo que golpeia inimigo comum precisa de `enemyGuard=0` (ou `=1` de propósito): a guarda aleatória do EBL-01 deixa dano/energia não determinísticos (L-042)
  - `heal.smoke.mjs` (HEAL-09) e `armed.smoke.mjs` (ARM-12) são intermitentes também em `dev`; merecem tarefa de estabilização
  - Forçar aparência do inimigo: `?debug&enemyVariant=corcunda|rastejante|bruto`
  - `tests/core/lightning.test.ts` (1000 seeds) estoura 5 s com a máquina carregada; passa livre ou com `--maxWorkers=2`
  - Ciclo do inimigo: 450 ms windup + 120 ms ataque + 800 ms descanso; `step(16)` = 1 frame, `step(16.7)` pode virar 2
- **Para o UAT da F7**: pé solto nos frames `chuteGiratorio-wind` e `chuteCarregado-wind`; parry anula até golpe imbloqueável e a onda de choque do chefe (leitura literal de PAR-02; decidir se fica); tempos/hitboxes dos golpes ajustáveis em `src/data/moves.ts`; 6 spec-precision gaps de redação listados em `validation.md`
- **Para o UAT do sprite**: pontos fracos conhecidos: `land-1` com pernas um pouco longas, braço de trás solto no `jump-0`, `ganchoAscendente-hit` com cabeça torta (já vinha de antes)
- **Para o UAT dos inimigos**: `impact` do bruto com a borda branca sobre os chifres; no rastejante `hurt-head-a` e `hurt-uppercut` parecidos; punho do bruto meio "bloco"
- **Blockers**: UAT do usuário antes de `main`
- **Branch**: `dev`
