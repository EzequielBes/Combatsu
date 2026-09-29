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

## Handoff

- **Feature**: F7 `.specs/features/combate-estilo-luta` (combate estilo Sifu; absorve a antiga F8) em Execute, branch `feat/combate-estilo-luta` (a partir de `dev`, que já tem F0–F5)
- **Feito**: Specify (91 ACs, Jev em 3 rodadas + glossário da spec), Design, Tasks (21 tasks em 5 fases), alinhamento Jev (0 stories sinalizadas; revisão em `alignment.md`)
- **Phase / Task — RETOMAR ASSIM**:
  1. **Fase 1 (T1–T7, núcleo puro)**: ainda NÃO começou (o worker travou sem gravar nada; árvore limpa). Lançar 1 worker Sonnet com as tasks T1–T7.
  2. **Fase 2 (T8–T9, arte)**: PARCIAL e SEM commit no worktree `C:\Users\Usuario\AppData\Local\Temp\claude\C--Users-Usuario-documents-surgue\fc11ceb2-8480-4cb5-a593-ee9b3e9fd301\scratchpad\wt-art7` (branch `art/combate-estilo-luta`): modificados `src/game/art/index.ts`, `tests/game/art.test.ts`; novos `src/game/art/combatColors.ts`, `src/game/art/sprites/playerMoves.ts`. Último sinal: typecheck passando. Relançar 1 worker Sonnet "retome a partir do `git status`/`git diff` do worktree", gerar a prévia em `scratchpad\art7-preview\art7-preview.png`, commitar T8 e T9 separados, sem editar `tasks.md`/`spec.md`.
  3. Depois das duas: `git merge --no-ff art/combate-estilo-luta` na branch da feature, marcar T8/T9 em `tasks.md`/`spec.md`, remover o worktree e a branch `art/*`, e lançar a fase 3 (T10–T14).
- **Completed**:
  - F0–F5 mergeadas em `dev` (865 testes, 17 smokes); `feat/energia-e-tecnicas` publicada; `dev` local 110+ commits à frente do `origin` (sobe só quando o usuário pedir)
- **Como trabalhar** (memória do usuário):
  - Opus planeja; workers Sonnet, um por lote de fase; **no máximo 2 agentes ao mesmo tempo**; arte/smokes em worktree criado à mão em `scratchpad\wt-*` (o `isolation: worktree` recusa o repo por causa de maiúsculas em `Documents/surGue`)
  - Worker que cair por limite ou travar: conferir `git status`/`git diff` e relançar com "retome a partir do diff"; nunca descartar trabalho parcial que compila
  - Jev: `jev-refine` no Specify (lê `## Glossário` da spec) e `jev-align` nas tasks; Context7 `/phaserjs/phaser/v3_90_0`
  - Merge em `dev` com `--no-ff`; `main` só com validação do usuário; push só da branch da feature
- **Dicas técnicas**:
  - `npm run smoke -- <trecho>`; `?debug&seed=N&round=N&fragments=N&tech=<id>&noshop=1&fxlab`
  - Todo dano ao player passa por `Player.receiveHit` (`src/game/Player.ts:161`): é ali que a guarda/parry/esquiva decidem
  - T10 troca `K` (pegar) por `E` e `K` vira golpe forte: varrer `KeyK` em todos os `scripts/smoke/*.smoke.mjs`
  - Teclas lidas com `JustDown` precisam ficar seguradas durante um `step` no smoke (`tap`/`press1`)
  - Worktree antigo travado em `.claude/worktrees/agent-ab5458ae76ebf5ebf` e o worktree `Documents/surGue-player-refine` (branch `feat/player-sprite-refine`) NÃO são desta linha de trabalho: não mexer
- **In-progress** (file:line): arte da F7 no worktree `wt-art7` (acima)
- **Blockers**: UAT do usuário (visual, F0–F5) antes de `dev` ir para `main`
- **Uncommitted files**: só no worktree `wt-art7` (acima); na árvore principal, nenhum (fora `skills-lock.json` e pastas de ferramentas do usuário)
- **Branch**: `feat/combate-estilo-luta`
