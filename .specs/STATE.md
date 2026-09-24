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

## Handoff

- **Feature**: `.specs/features/run-e-rodadas` (F1) concluída → próxima: F2 `boss-a-cada-5` ou F3 `economia-drops-cura` (ROADMAP)
- **Phase / Task**: F1 Done (T1–T16, Verifier PASS na rodada 3), mergeada em `dev`
- **Completed**: título → rodadas com ondas escaladas, graça de 600 ms no spawn, permadeath, game over com trava de 1 s, HUD de rodada e faixas; 323 testes, 5 cenários de smoke
- **In-progress** (file:line): none
- **Next step**: Specify da próxima feature (sugestão: F3 antes de F2, porque a cura e a moeda deixam as rodadas longas jogáveis); usar a skill `phaser-gamedev` nos workers de gameplay
- **Blockers**: UAT do usuário (visual-e-jogabilidade, F0, F1) antes de `dev` ir para `main`
- **Uncommitted files**: none (fora `skills-lock.json`, do usuário)
- **Branch**: `dev`
