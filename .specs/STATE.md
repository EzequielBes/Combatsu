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

## Handoff

- **Feature**: `.specs/features/visual-e-jogabilidade`
- **Phase / Task**: Execute - lote 1 (Fase 1, T1-T6)
- **Completed**: spec, design e tasks aprovados
- **In-progress** (file:line): none
- **Next step**: worker do lote 1 executa T1-T6
- **Blockers**: none
- **Uncommitted files**: none
- **Branch**: feat/visual-e-jogabilidade
