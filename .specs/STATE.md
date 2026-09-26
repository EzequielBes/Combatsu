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

- **Feature**: F4 `.specs/features/loja-da-run` em Execute, branch `feat/loja-da-run` (publicada no `origin`; ainda NÃO mergeada em `dev`)
- **Phase / Task**: fases 1 (T1–T7, núcleo puro) e T8–T9 da fase 2 feitas. **Próximo: T10** (painel da loja), depois T11 (polimento), T12 (debug `?fragments=N` + snapshot), T13 (ajustar smokes), T14 (smoke da loja), Verifier Sonnet e merge `--no-ff` em `dev`
- **Estado do jogo nesta branch**: a loja abre entre rodadas e segura a rodada até `Enter`, mas **ainda não tem painel** (T10). Jogando, depois de limpar uma rodada é preciso apertar `Enter` para seguir; `1/2/3`, `J`, setas e `R` já compram, navegam e rerolam às cegas
- **Smoke**: 4 cenários quebrados de propósito desde T9 (`run-loop`, `hud`, `drops`, `heal`: esperam a rodada 2 sem passar pela loja); T13 corrige com um helper `continueShop` em `scripts/smoke/lib.ts`
- **Jev nesta feature**: spec com 3 rodadas de `jev-refine` (`refinement.md`) e a nova ferramenta `node tools/jev-align.mjs <pasta-da-feature>` (tasks × ACs e stories × diversão, `alignment.md`); usar as duas no Specify/Tasks das próximas features
- **Completed**:
  - F0–F3 mergeadas em `dev`; F4 T1–T9 (652 testes)
- **Como trabalhar** (memória do usuário):
  - Opus planeja; workers Sonnet, um por lote de fase (não um por task); workers de integração/smoke com no máximo ~3 tasks
  - Próximos lotes: W2b = T10–T11 (com `phaser-gamedev`); W3 = T12–T14; depois o Verifier
  - Correções pequenas do Verifier: inline
  - Merge em `dev` com `--no-ff` e mensagem `chore(dev): merge feat/<nome>`; `main` só com validação do usuário
- **Dicas técnicas**:
  - `npm run smoke -- <trecho>` roda só alguns cenários
  - `?debug&seed=N&round=N` começa na rodada N
  - Teclas de debug: 2 = golpe forte em todos, 3 = mata o player, 4 = 50 de dano no player; `R` reinicia a cena só fora da loja
  - O gate Quick deve incluir `npm run typecheck`
- **In-progress** (file:line): none
- **Blockers**: UAT do usuário (visual, F0–F3) antes de `dev` ir para `main`
- **Uncommitted files**: none (fora `skills-lock.json` e pastas de ferramentas, que são do usuário)
- **Branch**: `feat/loja-da-run`
