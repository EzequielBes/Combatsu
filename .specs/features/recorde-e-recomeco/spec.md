# Recorde e recomeço — Specification

## Problem Statement

A run termina e some: a tela de morte é um texto solto com rodada, abates e fragmentos, nada fica salvo entre runs e
não há meta para bater na próxima. O plano (`docs/plano-builds-e-habilidades.md`, seção 5.10 e linha F39 da seção 6)
pede o núcleo da meta mínima já: um save versionado, um recorde que o jogador vê durante a run, uma tela de fim que
mostra o que a build fez (inclusive o dano de cada fonte) e um recomeço em menos de 3 s, para dar "vontade de
recomeçar já". Esta feature é só esse núcleo; técnica inicial, conquistas e Grimório ficam para fases seguintes.

## Goals

- [ ] O recorde (rodada, abates e build resumida) sobrevive ao recarregar a página e aparece no HUD como "Recorde: rN".
- [ ] A morte abre um painel de fim de run com rodada, abates, fragmentos, build, votos e dano por fonte.
- [ ] Da tela de fim, J ou Enter põe o jogador numa run nova jogável em menos de 3 s contados da morte.
- [ ] Sem `localStorage` (bloqueado, cheio ou com erro) o jogo roda igual, só sem guardar entre sessões.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Técnica inicial (1 de 3 antes da r1, `startRng`) | Depende do pool liberado por conquistas; fase seguinte da F39 |
| Desbloqueios por conquista (~8) | Dependem de técnicas e sistemas das F30 a F35 |
| Grimório persistente | Depende das receitas da F33/F37 |
| "Falta pouco para: X" na tela de fim | Só faz sentido com as conquistas |
| Altar, moeda permanente, estilos, seed diária, Panteão | Depois da F41 (plano, seção 5.10) |
| Histórico de runs (mais de um registro) | O núcleo guarda só o melhor; histórico é conteúdo de depois |
| Salvar a run em andamento (continuar depois) | O jogo é roguelite com permadeath; só o fim da run é gravado |
| Sincronizar save entre abas ou dispositivos | Fora do escopo de um save local mínimo |
| Dano sofrido pelo jogador, por fonte | A tela pede o dano causado; o sofrido não foi pedido |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Onde o save mora | Uma chave `combatsu.save` no `localStorage`, JSON `{ version, record }`, versão atual 1 | Uma chave só, versionada, fácil de migrar | n |
| Regra pura e adaptador | `core/save.ts` puro (parse, validação, migração, comparação de recorde) e um adaptador fino no `game/` que só lê e escreve a string, com try/catch | Pedido do plano: `localStorage` só no adaptador; o core tem teste par | y (plano 5.10) |
| Migração | Uma lista de passos `vN → vN+1` aplicados em ordem até a versão atual; o teste injeta passos sintéticos (a v1 é a primeira) | Fica pronta antes de existir a v2, sem inventar uma v0 falsa | n |
| Save de versão mais nova que a do jogo | Ignorado: o jogo segue com recorde vazio em memória e não escreve na chave nessa sessão | Nunca apagar um save de um build mais novo | n |
| Save corrompido ou com campo inválido | Descartado inteiro (recorde vazio); a próxima gravação sobrescreve | Melhor perder um recorde quebrado que exibir lixo | n |
| O que é "melhor" | Rodada maior; empate na rodada, mais abates; empate nos dois, o recorde antigo fica | Rodada é a meta visível ("Recorde: rN"); abates desempatam | n |
| Quando grava | Só ao morrer (comando `gameOver`), e só se a run bateu o recorde | Pedido: "salvo ao morrer"; R (reiniciar a cena) e fechar a aba não gravam | y (tarefa) |
| Primeira run sem recorde | Ela vira o recorde e a tela de fim mostra "Recorde!" | Toda run que entra na tabela comemora; a primeira também | n |
| Marcador sem recorde | Escondido até existir o primeiro recorde | "Recorde: r0" não diz nada | n |
| Banner ao passar | No começo da rodada recorde+1 o banner da rodada vira `Rodada N · Novo recorde!`, uma vez por run; se ela é rodada de chefe, quem comemora é a faixa de entrada do chefe (`Chefe: <nome> · Novo recorde!`), que cobre a da rodada um update depois | O `Hud` tem uma faixa só; somar ao texto da faixa visível evita disputa de banner (achado da revisão: na r5 a comemoração ficava 0 frame na tela) | n |
| Marcador depois de passar | Mostra a rodada atual (`Recorde: rN`, N = rodada atual) na cor de destaque da paleta | A run já é o novo recorde; a cor diz que está acima | n |
| Build resumida | Técnicas equipadas com nível, passivas, relíquia e arma vinculada com nível, votos tomados; só ids no save | Ids são estáveis; o nome vem de `data/` na hora de exibir | y (tarefa) |
| Id desconhecido num save antigo | Some da exibição (não quebra o recorde) | Técnica ou passiva renomeada não pode derrubar o painel | n |
| Fragmentos na tela de fim | O saldo da carteira na morte (o mesmo número de hoje) | O smoke `drops` já confere `Fragmentos: <saldo na morte>`; mudar o sentido seria outra decisão | n |
| O que conta como dano por fonte | O `damage` do `Hit` aceito pelo alvo (`receiveHit` devolveu true), já com os multiplicadores do jogador, inclusive o excesso sobre a vida restante | É o número que o jogo entrega; medir a vida perdida pede mexer em cada alvo | n |
| Fontes | `golpe` (golpe do moveset e finalizador, `moveName` presente), uma por técnica (`divergente`, `vermelho`, `azul`, `corte`, `roxo`; Kokusen conta no Divergente), `objeto` (objeto na mão ou arremessado, arma vinculada, ferramenta) | Pedido da tarefa: golpe, cada técnica, objeto | y (tarefa) |
| Alvos que contam | Inimigos comuns e chefe; bonecos do laboratório (`?debug&fxlab`) não contam | Dano em boneco não é run | n |
| Ponto de contagem | Um registrador puro novo (`core/runSummary.ts`) alimentado por um ponto pequeno no caminho do golpe corpo a corpo e um no caminho do acerto de técnica, que precisa saber a técnica de origem | A F29 mexe em `combat.ts` e `effects.ts` em paralelo: o toque nesses arquivos fica em uma linha cada (decisão final no design) | n |
| Debug | `?debug&nosave=1` desliga leitura e escrita (recorde vazio em memória); `?debug&record=N` (inteiro >= 1) começa com o recorde `rN`, 0 abates, e também não escreve | Os smokes nunca tocam o save real nem dependem de outra run | n |
| Run com `?debug&round=N` (N > 1) | Não grava recorde (a rodada alcançada é falsa); a tela de fim abre igual | O designer pulando para a r10 não pode virar recorde | n |
| Onde nasce a UI | Painel de fim e marcador do recorde em classes novas, criadas pelo `UiSetup`; a regra liga num diretor novo (`scenes/test/recordDirector`) | `TestScene.ts` está em 399/400 linhas efetivas e `Hud.ts` está no teto: nenhum dos dois cresce | y (tarefa) |
| Texto central de game over (RHUD-06 da `run-e-rodadas`) | Substituído pelo painel; o `hud.center` fica vazio no `gameOver` e os smokes `hud` e `drops` passam a ler o painel | O painel próprio foi pedido no lugar do texto solto | y (tarefa) |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Save e recorde ⭐ MVP

**User Story**: Como jogador, quero que a minha melhor run fique guardada, para ter uma meta a bater na próxima.

**Why P1**: Sem save não há recorde, e sem recorde as outras histórias não têm o que mostrar.

**Acceptance Criteria**:

1. SAVE-01: The save rules (`core/save.ts`) SHALL not import Phaser nor touch `localStorage`; only the storage adapter SHALL call `localStorage`.
2. SAVE-02: The stored save SHALL be a JSON object with an integer field `version` equal to 1 and a field `record` (object or `null`), under the key `combatsu.save`.
3. SAVE-03: WHEN the stored save has a `version` lower than the current one THEN the loader SHALL apply each migration step from that version up to the current one, in order.
4. SAVE-04: IF the stored save has a `version` higher than the current one THEN the game SHALL start with no record and SHALL not write the key during that session.
5. SAVE-05: IF the stored value is missing, is not valid JSON, or fails validation THEN the game SHALL start with no record.
6. SAVE-06: The validation SHALL accept a record only with integer `round >= 1`, integer `kills >= 0`, and the build fields as arrays of strings (techniques as `{ id, level }` with integer `level >= 1`, relic and weapon as `{ id, level }` or `null`).
7. SAVE-07: IF reading or writing `localStorage` throws THEN the game SHALL keep running with the record held in memory and the debug snapshot SHALL report `storage: 'memory'`.
8. REC-01: WHEN the run enters `gameOver` and the run is better than the stored record THEN the system SHALL replace the record with this run and write the save once.
9. REC-02: A run SHALL be better than the record WHEN its round is greater, or WHEN the rounds are equal and its kills are greater; with no record, any run SHALL be better.
10. REC-03: IF the run is equal to or worse than the record THEN the system SHALL keep the old record and SHALL not write the save.
11. REC-04: The saved record SHALL hold round, kills, the equipped techniques with level, the perks, the relic and the bound weapon with level, and the taken vows, as read at the moment of death.
12. REC-05: WHEN the page is reloaded after a record was written THEN the game SHALL load that same record.
13. REC-06: IF the scene restarts with R, or the page closes during a run THEN the system SHALL not write the save.
14. REC-07: WHERE `?debug&nosave=1` is present the game SHALL neither read nor write the save, and SHALL start with no record.
15. REC-08: WHERE `?debug&record=N` is present with an integer N >= 1 the game SHALL start with the record `{ round: N, kills: 0 }` and an empty build, and SHALL not write the save.
16. REC-09: WHERE `?debug&round=N` is present with N > 1 the run SHALL not replace the record.
17. REC-10: The debug snapshot SHALL report under `record` the loaded record (or `null`), `storage` (`'local'`, `'memory'` or `'off'`), whether the current run has passed the record, and whether the last death set a new record.

**Independent Test**: `?debug&hd=1&area=modular` → morrer na r2 → recarregar → o snapshot traz `record.best.round = 2`;
morrer na r1 → o recorde continua r2 e a chave não muda. Teste de unidade do `core/save` cobre parse, validação,
migração injetada e comparação nos dois lados de cada empate.

---

### P1: Marcador e banner do recorde ⭐ MVP

**User Story**: Como jogador, quero ver o meu recorde durante a run e saber quando passei dele, para jogar contra a
minha melhor marca.

**Why P1**: É o que faz o recorde pesar no meio da luta, não só depois.

**Acceptance Criteria**:

1. RMK-01: WHILE a record exists and the run is in `roundActive`, `intermission`, `traverse` or `shop` the HUD SHALL show the text `Recorde: rN`, with N the record round.
2. RMK-02: The marker SHALL be right-aligned at x = 948 and top at y = 44 in the 960x540 UI space (below `Inimigos`, above the combo counter), in the HUD text style.
3. RMK-03: WHILE no record exists the marker SHALL be hidden.
4. RMK-04: WHILE the run is in `title` or `gameOver` the marker SHALL be hidden.
5. RMK-05: WHEN a round with number record + 1 starts THEN the round banner SHALL read `Rodada N · Novo recorde!` for `RUN.bannerMs` (1500 ms). IF that round is a boss round THEN the round banner SHALL read `Rodada N` and the boss entry banner SHALL read `Chefe: <nome> · Novo recorde!` for `BOSS.introMs` (1500 ms) instead, because it covers the round banner.
6. RMK-06: The `Novo recorde!` banner SHALL appear at most once per run.
7. RMK-07: WHILE the current round is greater than the record round the marker SHALL read `Recorde: rN` with N the current round, in the palette highlight color instead of the default HUD text color.
8. RMK-08: The marker and the banner SHALL use only `PALETTE` colors.
9. RMK-09: The debug snapshot SHALL report the marker text and visibility.

**Independent Test**: `?debug&hd=1&area=modular&record=1&nosave=1` → a r1 mostra `Recorde: r1` → limpar a r1 → a r2
abre com `Rodada 2 · Novo recorde!` e o marcador muda para a cor de destaque.

---

### P1: Tela de fim de run ⭐ MVP

**User Story**: Como jogador, quero ver ao morrer o que a minha build fez, para entender a run e querer tentar outra.

**Why P1**: É o "resumo" que dá sentido ao recomeço; substitui o texto solto de hoje.

**Acceptance Criteria**:

1. END-01: WHEN the run enters `gameOver` THEN the system SHALL show the run summary panel, centered at (480, 270) in the 960x540 UI space, drawn over the HUD on the UI camera.
2. END-02: WHILE the summary panel is visible the HUD center text SHALL be hidden (`hud.center = null`).
3. END-03: The panel SHALL show the lines `Rodada alcançada: N`, `Abates: K` and `Fragmentos: F`, with F the wallet balance at death.
4. END-04: The panel SHALL list each equipped technique as `<nome> Nv <n>`, with `<nome>` the technique short label (`short` in `data/techniques`, no colon: `Vermelho`, not `Reversão de Técnica: Vermelho`), or `Técnicas: nenhuma` when both slots are empty.
5. END-05: The panel SHALL list the perks by name, or `Passivas: nenhuma`.
6. END-06: The panel SHALL show the relic and the bound weapon by name and level, or `Arsenal: nenhum`.
7. END-07: The panel SHALL list the taken vows by name, or `Votos: nenhum`.
8. END-08: Under a header line `Dano`, the panel SHALL list the damage of each source with damage above 0, one indented line per source, sorted from highest to lowest, as `<fonte>: <dano inteiro arredondado> (<pct>%)`, with pct the rounded share of the run total and `<fonte>` `Golpe`, `Objeto` or the technique short label.
9. END-09: IF the run dealt no damage THEN the panel SHALL show `Dano: nenhum`.
10. END-10: WHEN the death set a new record THEN the panel SHALL show `Recorde!` in the palette highlight color.
11. END-11: WHEN the death did not set a new record THEN the panel SHALL show `Recorde: rN` with the stored record round, and SHALL not show `Recorde!`.
12. END-12: The panel SHALL show `J / Enter para tentar de novo` as its last line.
13. END-13: WHEN a new run starts THEN the panel SHALL hide.
14. END-14: The panel SHALL use only `PALETTE` colors and SHALL fit inside the 960x540 UI space with 5 vows, 2 techniques, 6 perks and 7 damage sources listed.
15. END-15: The debug snapshot SHALL report the panel visibility, its text lines and the damage by source.
16. DMG-01: WHEN a common enemy or the boss accepts a hit from the player's moveset strike or finisher THEN the run ledger SHALL add the hit damage to the source `golpe`.
17. DMG-02: WHEN a common enemy or the boss accepts a technique hit THEN the run ledger SHALL add the hit damage to the source of that technique (`divergente`, `vermelho`, `azul`, `corte` or `roxo`).
18. DMG-03: WHEN a common enemy or the boss accepts a hit from an object held, thrown, the bound weapon or a tool THEN the run ledger SHALL add the hit damage to the source `objeto`.
19. DMG-04: IF the target refuses or blocks the hit THEN the run ledger SHALL add nothing.
20. DMG-05: IF the hit lands on an effects-lab training dummy THEN the run ledger SHALL add nothing.
21. DMG-06: WHEN a new run starts THEN the run ledger SHALL reset every source to 0.
22. DMG-07: A Kokusen hit SHALL count under `divergente`.
23. END-16: The panel SHALL open with the title `Fim da run`, centered, in the palette highlight color; the other lines SHALL be left-aligned inside the box (the last line centered), the continuation of a wrapped list indented, and each block (numbers, build, damage, record, instruction) SHALL start with a half-line gap.

**Independent Test**: `?debug&hd=1&area=modular&nosave=1&tech=azul` → acertar um soco, conjurar o Azul num inimigo,
morrer → o painel lista `golpe` e `Azul` com os valores do snapshot, e a soma das porcentagens dá 100 ± 1.

---

### P1: Recomeço rápido ⭐ MVP

**User Story**: Como jogador, quero recomeçar logo depois de morrer, para a próxima tentativa sair do impulso.

**Why P1**: O plano mede a feature por "vontade de recomeçar já".

**Acceptance Criteria**:

1. RST-01: WHEN J or Enter is pressed on the summary panel at least 1000 ms after the death THEN the run SHALL enter `roundActive` at round 1 in the next update.
2. RST-02: WHEN J is pressed at 1000 ms after the death THEN the player SHALL accept input (alive, full HP, run in `roundActive`) no later than 3000 ms after the death.
3. RST-03: IF J or Enter is pressed less than 1000 ms after the death THEN the run SHALL stay in `gameOver` with the panel visible (RUN-11 kept).
4. RST-04: The restart SHALL not reload the page nor restart the Phaser scene.
5. RST-05: WHEN the new run starts THEN the record marker SHALL show the record as saved by the death that just happened.

**Independent Test**: `?debug&hd=1&area=modular&nosave=1` → morrer → apertar J em 1000 ms → o snapshot mostra
`run.state = 'roundActive'`, `player.dead = false` e vida cheia antes de 3000 ms da morte.

---

## Edge Cases

- IF the player dies on the same frame the last enemy dies THEN the summary SHALL use the round of the death, as the `gameOver` command reports it.
- IF the player dies during a boss round THEN the boss damage taken SHALL still count in the ledger and the summary SHALL open normally.
- WHEN two deaths in a row tie the record exactly THEN the record SHALL stay the first one and the second panel SHALL show `Recorde: rN`.
- IF a stored record lists a technique, perk, relic, weapon or vow id the game no longer knows THEN that entry SHALL be left out of the display and the record SHALL stay valid.
- IF `localStorage.setItem` throws at death THEN the panel SHALL still show `Recorde!` and the in-memory record SHALL be updated.
- WHEN `?debug&record=N` and `?debug&nosave=1` are both present THEN `record=N` SHALL set the starting record and no write SHALL happen.
- IF `?debug&record=` is not an integer >= 1 THEN it SHALL be ignored and the save SHALL load as usual.

---

## Implicit-requirement sweep (Medium)

- Failure / partial-failure states: SAVE-04, SAVE-05, SAVE-07.
- Input validation & bounds: SAVE-06, REC-08 e os casos de borda do `record=`.
- Data lifecycle: REC-01, REC-03, REC-06 (só a morte grava; um registro só).
- State-transition integrity: RMK-04, END-13, RST-01, RST-03.
- Observability: REC-10, RMK-09, END-15.
- Remaining dimensions N/A for this scope (sem rede, sem autenticação, uma aba só).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| SAVE-01 | P1: Save e recorde | Tasks: T3, T7 | Pending |
| SAVE-02 | P1: Save e recorde | Tasks: T3, T11 | Pending |
| SAVE-03 | P1: Save e recorde | Tasks: T3 | Pending |
| SAVE-04 | P1: Save e recorde | Tasks: T3, T10 | Pending |
| SAVE-05 | P1: Save e recorde | Tasks: T3, T10 | Pending |
| SAVE-06 | P1: Save e recorde | Tasks: T3 | Pending |
| SAVE-07 | P1: Save e recorde | Tasks: T7, T10, T11 | Pending |
| REC-01 | P1: Save e recorde | Tasks: T4, T11 | Pending |
| REC-02 | P1: Save e recorde | Tasks: T4 | Pending |
| REC-03 | P1: Save e recorde | Tasks: T4, T11 | Pending |
| REC-04 | P1: Save e recorde | Tasks: T11 | Pending |
| REC-05 | P1: Save e recorde | Tasks: T11 | Pending |
| REC-06 | P1: Save e recorde | Tasks: T11 | Pending |
| REC-07 | P1: Save e recorde | Tasks: T2, T10 | Pending |
| REC-08 | P1: Save e recorde | Tasks: T10 | Pending |
| REC-09 | P1: Save e recorde | Tasks: T4, T11 | Pending |
| REC-10 | P1: Save e recorde | Tasks: T10, T11, T12 | Pending |
| RMK-01 | P1: Marcador e banner do recorde | Tasks: T4, T12 | Pending |
| RMK-02 | P1: Marcador e banner do recorde | Tasks: T8, T12 | Pending |
| RMK-03 | P1: Marcador e banner do recorde | Tasks: T4, T12 | Pending |
| RMK-04 | P1: Marcador e banner do recorde | Tasks: T4, T11, T12 | Pending |
| RMK-05 | P1: Marcador e banner do recorde | Tasks: T4, T12 | Pending |
| RMK-06 | P1: Marcador e banner do recorde | Tasks: T4, T12 | Pending |
| RMK-07 | P1: Marcador e banner do recorde | Tasks: T4, T8, T12 | Pending |
| RMK-08 | P1: Marcador e banner do recorde | Tasks: T8 | Pending |
| RMK-09 | P1: Marcador e banner do recorde | Tasks: T12 | Pending |
| END-01 | P1: Tela de fim de run | Tasks: T9, T11 | Pending |
| END-02 | P1: Tela de fim de run | Tasks: T11 | Pending |
| END-03 | P1: Tela de fim de run | Tasks: T6, T11 | Pending |
| END-04 | P1: Tela de fim de run | Tasks: T6, T13 | Pending |
| END-05 | P1: Tela de fim de run | Tasks: T6, T13 | Pending |
| END-06 | P1: Tela de fim de run | Tasks: T6, T13 | Pending |
| END-07 | P1: Tela de fim de run | Tasks: T6, T13 | Pending |
| END-08 | P1: Tela de fim de run | Tasks: T5, T6, T13, T14 | Pending |
| END-09 | P1: Tela de fim de run | Tasks: T6, T11 | Pending |
| END-10 | P1: Tela de fim de run | Tasks: T4, T6, T11 | Pending |
| END-11 | P1: Tela de fim de run | Tasks: T4, T6, T11 | Pending |
| END-12 | P1: Tela de fim de run | Tasks: T6, T11 | Pending |
| END-13 | P1: Tela de fim de run | Tasks: T11 | Pending |
| END-14 | P1: Tela de fim de run | Tasks: T8, T9, T13 | Pending |
| END-15 | P1: Tela de fim de run | Tasks: T11, T14 | Pending |
| END-16 | P1: Tela de fim de run | Correção da revisão (painel em blocos) | Pending |
| DMG-01 | P1: Tela de fim de run | Tasks: T13 | Pending |
| DMG-02 | P1: Tela de fim de run | Tasks: T1, T14 | Pending |
| DMG-03 | P1: Tela de fim de run | Tasks: T13 | Pending |
| DMG-04 | P1: Tela de fim de run | Tasks: T13 | Pending |
| DMG-05 | P1: Tela de fim de run | Tasks: T13 | Pending |
| DMG-06 | P1: Tela de fim de run | Tasks: T5, T11 | Pending |
| DMG-07 | P1: Tela de fim de run | Tasks: T1, T5, T14 | Pending |
| RST-01 | P1: Recomeço rápido | Tasks: T11 | Pending |
| RST-02 | P1: Recomeço rápido | Tasks: T11 | Pending |
| RST-03 | P1: Recomeço rápido | Tasks: T11 | Pending |
| RST-04 | P1: Recomeço rápido | Tasks: T11 | Pending |
| RST-05 | P1: Recomeço rápido | Tasks: T12 | Pending |

**Coverage:** 54 total, 54 mapped (END-16 entrou na correção da revisão), 0 unmapped.

---

## Pontos de mudança conferidos no código

| Ponto | Onde está hoje | Observação |
| --- | --- | --- |
| Morte e resumo da run | `core/run.ts:221-227` (`resolveDeath`, comando `gameOver { round, kills }`) | `run.ts` e `tests/core/run.test.ts` estão nas exceções do lint: não crescem; a regra nova vai em arquivo novo |
| Texto de game over | `scenes/test/runDirector.ts:87-94` (`hud.setCenter([...])`) | Vira a abertura do painel; os smokes `hud` (linhas 108-116) e `drops` (linhas 96-99) passam a ler o painel |
| Trava e recomeço | `core/run.ts:291-316` (`gameOverLockMs` 1000, `data/tuning.ts:189`); J/Enter em `TestScene.ts:364-365` | Nada muda na `Run`; RST-02 mede o caminho de hoje |
| Reset da run | `runDirector.onStartRun` (`runDirector.ts:103-161`) | A F29 mexe aqui em paralelo: zerar o registro e esconder o painel entra por um diretor, com uma linha no máximo |
| Golpe corpo a corpo e objeto | `scenes/test/combat.ts:83` (`onConnect`, `ownerId === player.id`, `moveName` separa golpe de objeto) | Também chamado pelo finalizador (`combat.ts:238`), pelo arsenal (`arsenalDirector.ts:53`), drops e `world` |
| Acerto de técnica | `game/TechRunner.ts:50-65` (`onTechHit` único no `TechContext`), `scenes/test/effects.ts:33` | O `Hit` não diz a técnica: a origem precisa vir do módulo (`tech/*.ts`) ou de um contexto por técnica |
| HUD | `game/Hud.ts:142-149` (rodada em y 12, inimigos em y 28, combo em y 60, todos à direita) | `Hud.ts` está nas exceções do lint: o marcador é classe nova |
| Snapshot | `scenes/test/snapshot.ts:58-84`; tipo em `game/debugApi.ts` (448 linhas) | Tipo novo do snapshot em arquivo próprio (regra do plano, seção 6) |
| Parâmetros de debug | `scenes/test/params.ts` (`debugParam`, `debugIntParam`) | `nosave` e `record` usam os dois |

---

## Success Criteria

- [ ] O usuário morre, vê o painel com a build e o dano por fonte, aperta J e já está lutando de novo.
- [ ] Recarregar a página mantém o recorde; "Recorde: rN" aparece no HUD e o banner sai ao passar dele.
- [ ] Com o `localStorage` bloqueado, o jogo roda sem erro no console.
- [ ] `TestScene.ts` e `Hud.ts` não ganham linha efetiva; nenhum arquivo novo entra nas exceções do lint.
- [ ] Gate verde; smokes `hud`, `drops`, `run-loop`, `world-restart` e os novos (`hd=1&area=modular`) verdes.
