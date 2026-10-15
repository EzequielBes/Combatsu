# Leva 2 - Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/leva-2/spec.md` (ids TLV-01..21 e DUO-01..14 renumerados neste passo, correção 1 do design)
**Design**: `.specs/features/leva-2/design.md` (abordagem A; 5 sub-fases, com o ドン na F41b)
**Plano**: `docs/plano-builds-e-habilidades.md` (linha F41 da seção 6; seções 4, 5.1, 5.3, 5.4, 5.6, 5.7, 5.8)
**Base**: F29 a F40 mergeadas antes da T1, mais as regras puras da leva 2 deste branch (`5701321`:
`core/convergence.ts`, `divineDogs.ts`, `thunderFist.ts`, `eruption.ts`, `techKit.ts`), o `feat/icones-hd-tecnicas`
(`687a23f`, `techIcons.ts`, `icons/*`, `tools/icon-boards.mjs`) e o `feat/arte-armas-imbuidas` (`wt-armas`, folhas
`weapon-fx-*`). A F41c pede a F36 e a F37; a F41e pede a F37 implementada (o design da F37 pode renomear
`recipeReady`, `duoEligible` e `build.<item>.combo`: a T99 reconfere).
**Status**: Draft
**Branch**: `feat/leva-2` (a partir da base acima; uma sub-fase pode virar branch própria se o merge pedir)
**Ferramentas**: nenhuma MCP. Skill só o `tlc-spec-driven`. Campo **Modelo** em cada tarefa (memória "Delegar o leve,
qualidade no forte"): arte, vista em movimento e conferência em Opus 5.5 ou Fable; o mecânico em Sonnet. Arte: prancha
(`tools/hd-boards.mjs`, `tools/icon-boards.mjs`, saída em `.fable-out/`) **e** movimento no jogo em HD (`?hd=1`),
parado e correndo, para os dois lados, antes do commit (memória "Conferir animação em movimento").

Regras que valem para toda tarefa (CLAUDE.md e LVX): um commit por tarefa, só os arquivos dela (nunca `git add -A`);
`npm run gate` verde antes do commit (uma vez; durante o trabalho só os testes focados, a máquina é compartilhada);
smoke só do que foi tocado, smoke novo com `?debug&hd=1&area=modular`; tetos de 400 linhas efetivas por arquivo, 80 por
função, complexidade 15; arquivo novo nunca entra no `.oxlintrc.json`; teste da lista de exceções do `max-lines` não
cresce (caso novo vai a arquivo novo). **LVX-01/02 em toda tarefa**: `src/scenes/TestScene.ts` sem linha efetiva líquida
(contagem no corpo do commit), `Hud.ts`, `moves.ts` e `ShopPanel.ts` sem crescer, nenhum campo novo em `Player.ts`,
`Enemy.ts` e `Boss.ts` até 400 efetivas. **LVX-03**: tipo de snapshot novo no arquivo do sistema dono, nunca no
`debugApi.ts`. **LVX-06**: toda cor da `PALETTE`. **LVX-07**: a linha do `README.md` de cada parâmetro e evento de debug
novo entra no commit que o cria. **Nada automático**: técnica só pela tecla do slot, Domínio só por `P`/`N`, Duo e
Evolução só a partir de uma ação do jogador; nenhum disparo, ponto ou compra sem o jogador. Linha efetiva = sem linha
em branco e sem comentário. Os nomes da F29 a F40 citados aqui são os dos designs delas: cada fase começa reconferindo
os que usa.

**Ajustes ao design feitos neste passo** (sem mudar requisito):

1. **Fases menores que as sub-fases.** O design pede "uma fase por sub-fase, ~7 a 9 tarefas"; quebradas em tarefas de
   um arquivo, as sub-fases dão de 17 a 32 tarefas. Cada sub-fase vira 3 a 6 fases de até 10 tarefas, cortadas nos
   passos do design; o lote de execução continua juntando fases inteiras e nunca atravessa sub-fase. O Verifier roda e
   escreve a seção da sub-fase em `validation.md` na última tarefa dela (T32, T64, T84, T98, T121).
2. **Técnica em 4 a 6 tarefas.** O design diz "cada passo de técnica num commit"; aqui o resolvedor puro, a calibração,
   os eixos, a folha (Cães), o módulo com a entrada e a vista são tarefas próprias. O que o LVX-05 protege continua: o
   commit do módulo (a "entrada" da técnica: `TechId`, `TECHNIQUES`, registro, loja, aura, snapshot, README, smoke)
   não toca `TechRunner.ts`, `TechCaster.ts` nem `techDirector.ts`, e cada técnica fica jogável no commit do módulo.
3. **Entrada na loja por último.** Talentos, Osso, Dedos e Duos entram no `GAME_SHOP_CATALOG` só na tarefa que fecha o
   sistema (T60, T73, T83, T114), para a loja nunca vender um item sem efeito; antes disso o debug (`perks=`,
   `arsenal=`, `duo=`) já os liga.
4. **Regra pura das Evoluções.** O design lista `tests/core/evolutionsLeva2.test.ts` sem o arquivo de regra embaixo; a
   T116 cria `src/core/evolutionsLeva2.ts` (marcas e poças, AD-001).
5. **Sinal visível no debug.** O `TechSignal` só tem efeito com um Duo; para a T100 ter prova própria, o `signal` do
   runner (T99) empurra o evento de debug `techSignal:<kind>` (linha no `README.md`).

**Decisões do usuário que travam tarefas** (o executor para e pergunta antes da tarefa, não durante):

| Antes de | Pergunta | Origem |
| --- | --- | --- |
| T1 | Abordagem A do design e as premissas marcadas `n` na spec (Erupção agora, efeito das camadas da Pele, números do Osso, escudo do Sobrecarregado e as demais). Este arquivo segue as escolhas padrão; trocar alguma muda a tarefa que a cita | spec, "Assumptions"; design, "Abordagens" |
| T1 | A renumeração TLV-01..21 e DUO-01..14 e o evento `evolve:<id>` (no lugar de `evolved:<id>`) aplicados na spec neste passo | design, correções 1 e 8 |
| T17 | Calibração dos Cães: `caes [2, 3, 4, 5]` com `capBiteDamage 6` (1,20×, recomendada) ou `caes [2, 3, 4, 6]` com o bônus de 8 (1,33×); e a prisão base de 200 ms (`prisao [200, 330, 470, 600]`) da revisão adversarial | design, "Calibração", risco dos Cães e correção 9 |
| T67 | Soltura cheia do Osso (`k` = cargas + 1 no teto, patamar `decisive`) e Dragão Refletido só no teto (revisão adversarial) | spec, "Osso de Dragão: números" e "Dragão Refletido" |
| T76 | Preço dos Dedos pelo plano (20, 22, 28) no lugar do preço das outras relíquias (20, 32, 44) | spec, "Dedos: loja e drop" |
| T27 | Calibração da Erupção: `queima [0, 2, 3, 5]` (1,333×, folga pequena) | design, "Calibração" |
| T40 | O consumo do `chestRng` muda com 4 Domínios (`int(4)`): o par sorteado por seed fixa muda no smoke `domain-veil` | design, risco do Baú do Véu |

---

## Test Coverage Matrix

> Guidelines: `CLAUDE.md` (camadas, gate, smoke só do que foi tocado, HD como base, arte só pronta depois da prancha e
> do movimento), `.oxlintrc.json` (tetos e listas de exceção), `vitest.config.*`, `package.json` (`gate`, `test`,
> `smoke`); lições L-010 (limiar testado dos dois lados), L-020 (provar a ausência na janela inteira), L-043 (testar o
> adaptador, não só a regra), L-055 e L-070 (ler do objeto vivo), L-074 (`flipX` nos dois lados), L-076 (campo de debug
> que repete a entrada não prova o efeito). Amostras: `tests/core/divineDogs.test.ts`, `tests/core/thunderFist.test.ts`
> (regras puras da leva 2), `tests/core/arsenal.test.ts`, `tests/game/hdWeapons.test.ts`, `tests/game/debugApi.test.ts`,
> `scripts/smoke/tech.smoke.mjs`, `scripts/smoke/arsenal.smoke.mjs`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Regra pura (`src/core/**`) | unit | 1:1 com os ACs; todo edge case da spec; limiares dos dois lados (L-010): vida = custo e custo + 1, 599/600/5000 ms da carga, 320/321 px e 2499/2500 ms do Vazio, 60/61 px do Estopim, 2999/3000 ms do escudo, 499/500 ms do ponto fraco, 75/50/25% das trincas, 3/4 Duos, 32/33 px das marcas, piso de custo do Seis Olhos | `tests/core/*.test.ts` (arquivo novo por sistema novo) | `npx vitest run tests/core/<arquivo>` |
| Números e tabelas (`src/data/**`) | unit | Tabela linha a linha; eixo dominante com os valores exatos de "Calibração"; nomes, textos e dicas únicos (EIX-10, NOM, TC2-14, DUO-14); catálogo na ordem da spec | `tests/data/*.test.ts` | `npx vitest run tests/data/<arquivo>` |
| Arte em código (`src/game/art/hd/**`) | unit + prancha | Quadros, nomes e tamanhos; só chaves da `PALETTE` ou índices de `ICON_COLORS`; quadros distintos; prancha olhada antes do commit | `tests/game/art/*.test.ts`, `tests/game/hd*.test.ts` | `npx vitest run tests/game/art` |
| Adaptador com lógica testável fora do motor (`src/game/tech/leva2Targets.ts`, `TechRunner.ts`, `TechSlotsHud.ts`, `src/scenes/test/strikeLog.ts`, `critDirector.ts`) | unit | Contrato com dublês: o que repassa ao motor (L-043), o `Hit` mudado no lugar, a opção `domain` | `tests/game/*.test.ts`, `tests/scenes/*.test.ts` | `npx vitest run tests/game/<arquivo>` |
| Adaptadores e diretores (`src/game/**`, `src/scenes/**`) | smoke | Efeito lido do jogo vivo pelo snapshot (HP, `state`, `stunnedMs`, `techState`, `techObjects`, `damageNumbers`, eventos), nunca só o parâmetro de entrada (L-076); refatoração com os smokes de antes iguais | `scripts/smoke/*.smoke.mjs` | `npm run smoke -- <trecho>` |
| Vistas do motor (`src/game/techFx/**`, `VoidFx`, `DonFx`, `BossBarOverlay`, `TalentFx2`) | smoke + conferência em movimento | Textura, quadro, escala, `flipX`, alfa e largura lidos do objeto vivo (L-043, L-055, L-070, L-074); conferência em HD, parado e correndo, dois lados | `scripts/smoke/*.smoke.mjs` | `npm run smoke -- <trecho>` |
| Documentação (`README.md`, `.specs/**`, `CLAUDE.md`) | none | build gate only | - | `npm run gate` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tarefa só com teste unitário (regra pura, dados, arte, contrato de adaptador) | `npx vitest run <testes da tarefa>` durante o trabalho; `npm run gate` uma vez antes do commit |
| Full | Tarefa de adaptador, diretor, vista ou regra que muda o jogo vivo | Quick + `npm run smoke -- <cada trecho da tarefa>` |
| Build | Última tarefa de cada sub-fase | `npm run gate` e todos os smokes da sub-fase (design, "Testes e smokes"), mais os antigos do sistema tocado |

Base de testes: a contagem no começo da T1 (anotar). Nenhuma tarefa apaga teste sem mover o caso; as tarefas de
calibração (T17, T27) e do Baú do Véu (T40) trocam números esperados e dizem quais no commit. Smokes instáveis sob carga
(`armed`, timeouts): repetir isolado antes de suspeitar.

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order. Setas anotadas "(fase N)" são dependências de uma fase anterior, só para leitura.

| Sub-fase | Fases | Tarefas | O jogador nota no fim |
| --- | --- | --- | --- |
| **F41a técnicas** | 1 a 5 | T1 a T32 (32) | 12 técnicas no pool, cada uma com ícone HD |
| **F41b Domínio, talentos e ドン** | 6 a 11 | T33 a T64 (32) | Domínio de controle, 5 talentos, ドン no patamar 3 |
| **F41c arsenal** | 12 a 14 | T65 a T84 (20) | arma que carrega com a defesa; relíquia de aposta |
| **F41d chefes** | 15 a 16 | T85 a T98 (14) | 4 afixos novos a partir da r10 |
| **F41e combos** | 17 a 20 | T99 a T121 (23) | 6 Duos e 3 Evoluções na caça às receitas |

### Phase 1: F41a passo 0 — portas genéricas (refatoração, smokes iguais)

```
T1 → T2 → T3
T4 → T5
T5 → T6
T5 → T10
T6 → T10
T8 → T10
T7
T9
```

### Phase 2: F41a passos 1 e 2 — ícones e Convergência

```
T12 → T13
T11 → T14 → T15
T13 → T14
T3 → T14 (fase 1)
T7 → T14 (fase 1)
T9 → T14 (fase 1)
T10 → T14 (fase 1)
```

### Phase 3: F41a passo 3 — Cães Divinos

```
T16 → T18 → T20
T17 → T18
T19 → T21
T20 → T21
T12 → T16 (fase 2)
T10 → T20 (fase 1)
T11 → T20 (fase 2)
```

### Phase 4: F41a passo 4 — Punho de Trovão

```
T22 → T23 → T24 → T25
T12 → T22 (fase 2)
T4 → T24 (fase 1)
T10 → T24 (fase 1)
T11 → T24 (fase 2)
```

### Phase 5: F41a passo 5 — Erupção e fechamento da F41a

```
T26 → T28 → T29
T27 → T28
T29 → T30
T29 → T31
T30 → T32
T31 → T32
T12 → T26 (fase 2)
T10 → T29 (fase 1)
T11 → T29 (fase 2)
```

### Phase 6: F41b passo 0 — crítico de técnica e de objeto, barra de postura

```
T33 → T35 → T36
T34
T37
```

### Phase 7: F41b passo 1 — Vazio Ilimitado

```
T38 → T39 → T41
T38 → T40
T41 → T42
T41 → T43
T41 → T44
T34 → T42 (fase 6)
T35 → T42 (fase 6)
T11 → T44 (fase 2)
```

### Phase 8: F41b passos 2 a 4 — talentos, regra pura, dados e ícones

```
T46 → T47
T45
T48
T34 → T47 (fase 6)
```

### Phase 9: F41b passos 2 e 3 — Seis Olhos, Domínio Simples, Mão de Ferro

```
T49 → T50
T49 → T51 → T52
T49 → T53 → T54
T45 → T49 (fase 8)
T47 → T49 (fase 8)
T48 → T49 (fase 8)
T10 → T49 (fase 1)
T35 → T50 (fase 6)
```

### Phase 10: F41b passos 3 e 4 — Reversa Refinada, Osso Duro e loja

```
T55 → T56
T57 → T58
T57 → T59
T56 → T60
T58 → T60
T59 → T60
T49 → T55 (fase 9)
T49 → T57 (fase 9)
T37 → T58 (fase 6)
T50 → T60 (fase 9)
T52 → T60 (fase 9)
T54 → T60 (fase 9)
```

### Phase 11: F41b passo 5 — ドン e fechamento da F41b

```
T61 → T63 → T64
T62 → T63
T59 → T63 (fase 10)
```

### Phase 12: F41c passos 0 e 1 — arte e regra do Osso de Dragão

```
T67 → T69
T68 → T69
T65
T66
```

### Phase 13: F41c passos 1 e 2 — Osso no jogo e Dragão Refletido

```
T70 → T71 → T72 → T73 → T74 → T75
T69 → T71 (fase 12)
T65 → T71 (fase 12)
```

### Phase 14: F41c passo 3 — Dedos de Sukuna e fechamento da F41c

```
T76 → T77
T76 → T78
T76 → T79
T77 → T80
T78 → T80
T79 → T80
T76 → T81
T77 → T82
T80 → T83 → T84
T81 → T83
T82 → T83
T66 → T82 (fase 12)
T75 → T84 (fase 13)
```

### Phase 15: F41d passo 0 — `BossArmor` neutro e dados dos afixos

```
T85 → T86
T86 → T87
T86 → T88
T89
```

### Phase 16: F41d passos 1 a 4 — afixos no chefe e fechamento da F41d

```
T90 → T91 → T95
T90 → T92
T90 → T93 → T94
T92 → T96 → T97 → T98
T94 → T96
T95 → T96
T89 → T90 (fase 15)
T86 → T93 (fase 15)
T87 → T95 (fase 15)
T88 → T95 (fase 15)
```

### Phase 17: F41e passo 0 — sinais, comandos e dano principal (refatoração)

```
T99 → T100
T99 → T101
```

### Phase 18: F41e passo 1 — Duos: receitas, regra pura, loja e diretor

```
T102 → T103
T103 → T104
T103 → T105
T103 → T107
T106
T99 → T107 (fase 17)
```

### Phase 19: F41e passos 1 a 3 — efeitos dos Duos

```
T108 → T109
T110 → T111
T112 → T113
T109 → T114
T111 → T114
T113 → T114
T107 → T108 (fase 18)
T100 → T108 (fase 17)
T107 → T110 (fase 18)
T101 → T110 (fase 17)
T106 → T110 (fase 18)
T107 → T112 (fase 18)
T100 → T112 (fase 17)
T106 → T113 (fase 18)
```

### Phase 20: F41e passos 4 a 6 — Evoluções e fechamento da F41

```
T115 → T117
T116 → T117
T115 → T118
T116 → T118
T115 → T119
T117 → T120 → T121
T118 → T120
T119 → T120
T114 → T121 (fase 19)
```

---

## Task Breakdown

### Phase 1: F41a passo 0 — portas genéricas (refatoração, smokes iguais)

#### T1: `holdPhase` e `abort` na `CastMachine`

**What**: o `holdSign(slot, id, elapsed, held)` da F34 vira `holdPhase(slot, id, phase: 'sign' | 'charge', elapsedMs,
keyHeld)` no `PressGate` e no `update(dtMs, hold?)`; no `charge` com `hold` verdadeiro o relógio para em 0 (o
`elapsedMs` segue contando) e, quando o `hold` cai, sai para `release` no mesmo `update`, mesmo antes do fim do
`charge`; `abort(): CastEvent[]` cancela `sign`/`charge` sem cobrar (como o `damageTaken`, CAST-07) e é no-op em
`release`/`recover`. A Palma Falsa passa a responder `phase === 'sign' && ...`.
**Where**: `src/core/cast.ts`
**Depends on**: None
**Reuses**: `holdSign` e o cancelamento do `damageTaken` (F34 `core/cast.ts`)
**Requirement**: CNG-01, CNG-07, LVX-05
**Modelo**: Sonnet
**Escopo**: 1 arquivo, 2 métodos da mesma máquina

**Done when**:

- [ ] `tests/core/castHold.test.ts` (novo): segura aos 599, 600 e 5000 ms; tecla solta aos 10 ms entra em `release` no
      mesmo `update`; sem `hold` o `charge` corre como hoje; golpe no `charge` cancela sem cobrar; `abort` em
      `sign`/`charge` cancela, em `release`/`recover` não; o `charge` de 300 ms nunca é pulado (risco do CAST-02)
- [ ] `castGate.test.ts` (F34) passa sem mudança; Palma Falsa igual
- [ ] Gate verde; contagem informada

**Tests**: unit
**Gate**: quick
**Commit**: `refactor(core): let the cast hold its charge and abort without cost`

---

#### T2: `TechCaster` repassa `holdPhase` e `abortCast`

**What**: o `TechCaster` repassa o `holdPhase` do módulo ao portão e ganha `abortCast()` (`machine.abort()` mapeado
para o evento `techCancel` de sempre). Nenhum comportamento muda.
**Where**: `src/game/TechCaster.ts`
**Depends on**: T1
**Reuses**: repasse do `holdSign` (F34)
**Requirement**: CNG-07, LVX-05
**Modelo**: Sonnet
**Escopo**: 1 arquivo

**Done when**:

- [ ] `abortCast()` existe e empurra `techCancel` só com `sign`/`charge` em curso
- [ ] Smokes `tech`, `boogie`, `cursed-speech` verdes e iguais
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(tech): expose the charge hold and the cast abort`

---

#### T3: Cancelar a conjuração na konbini, na morte e na troca de área

**What**: o `runDirector` chama `techCaster.abortCast()` no `roundCleared`, no `shopOpen`, no `startRun` e na morte do
player; o `areaDirector` chama na troca de área (+1 linha). Uma carga segurada nunca atravessa a konbini.
**Where**: `src/scenes/test/runDirector.ts`
**Depends on**: T2
**Reuses**: `applyRunCommand` (`runDirector.ts:69`)
**Requirement**: CNG-07, TC2-11
**Modelo**: Sonnet
**Escopo**: ⚠️ coeso: 4 chamadas de 1 linha no diretor e 1 no `areaDirector`, o mesmo comportamento

**Done when**:

- [ ] `grep -n abortCast src/scenes/test/runDirector.ts src/scenes/test/areaDirector.ts` mostra as 5 chamadas
- [ ] Smokes `run-loop`, `tech`, `world-traverse` verdes e iguais; `TestScene.ts` sem linha
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(run): cancel a pending cast when the round or the area changes`

---

#### T4: `StrikeLog` dos golpes do moveset

**What**: `class StrikeLog { push(targetId, strength, swingId); since(seq): readonly StrikeEntry[]; get seq(); reset() }`
em anel de 32; campo `strikes` do `BuildDirector`; o `combat.onConnect` grava quando `mine && hit.moveName` (+1 linha).
Nenhum módulo é chamado de dentro de um contato do Matter.
**Where**: `src/scenes/test/strikeLog.ts`
**Depends on**: None
**Reuses**: `combat.onConnect` (`src/scenes/test/combat.ts`)
**Requirement**: RAI-02
**Modelo**: Sonnet
**Escopo**: 1 classe nova + 1 linha de gravação

**Done when**:

- [ ] `tests/scenes/strikeLog.test.ts` (novo): `since(seq)` devolve só as entradas novas; o anel descarta a 33ª; `reset`
      zera; `seq` cresce uma por entrada
- [ ] Smoke `fight` verde e igual; objeto do mundo, técnica e emissão não gravam (sem `moveName`)
- [ ] Gate verde; contagem informada

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(build): log the landed moveset strikes per frame`

---

#### T5: Portas novas do `TechPorts`

**What**: `TechPorts` ganha `landedStrikes(sinceSeq)`, `strikeSeq()`, `camera` (vista do mundo) e `onTechSignal`
(no-op até a F41e); `TechServices.castHit(cast, target, opts?: { domain?: boolean })`; o `scenes/test/techPorts.ts`
liga cada porta (o `StrikeLog` da T4, a câmera da cena).
**Where**: `src/game/tech/shared.ts`
**Depends on**: T4
**Reuses**: `TechPorts`/`TechServices` (F34)
**Requirement**: TC2-12, RAI-02, LVX-05
**Modelo**: Sonnet
**Escopo**: ⚠️ coeso: a interface e a sua ligação de 1 linha por porta

**Done when**:

- [ ] Typecheck verde com as portas novas ligadas em `techPorts.ts`
- [ ] Smokes `tech`, `resonance` verdes e iguais
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(tech): add the strike log, camera and signal ports`

---

#### T6: `castHit` com `{ domain: false }`

**What**: o `castHit` do `TechRunner` repassa `opts.domain !== false` ao `onCastHit`: a maestria conta sempre, a carga
do Domínio e o gatilho do Santuário só sem `domain: false` (correção 4 do design).
**Where**: `src/game/TechRunner.ts`
**Depends on**: T5
**Reuses**: `castHit` e `onCastHit` (F33, F31)
**Requirement**: TC2-08, TC2-09
**Modelo**: Sonnet
**Escopo**: 1 método

**Done when**:

- [ ] `tests/game/techRunnerCastHit.test.ts` (novo, dublês): `domain: false` chama `masteryHit` e não `onCastHit`; sem
      opção chama os dois, como hoje
- [ ] `tests/game/techRunnerSource.test.ts` (F34) verde (nenhum id de técnica no runner)
- [ ] Smoke `tech` verde e igual; gate verde

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(tech): let a cast hit skip the domain charge`

---

#### T7: Anel de carga no slot

**What**: `SlotHudHint` (`game/tech/module.ts`) ganha `ring: number | null` (0 a 1; os 12 módulos devolvem `null`); o
`TechSlotsHud` desenha um arco de 2 px em `PALETTE.t` em volta do ícone na fração do `ring`; `debug()` ganha `ring`
por vaga.
**Where**: `src/game/TechSlotsHud.ts`
**Depends on**: None
**Reuses**: `badge`/`blink` do `SlotHudHint` (F35)
**Requirement**: CNG-09, LVX-06
**Modelo**: Sonnet
**Escopo**: 1 vista + o campo do tipo que ela lê

**Done when**:

- [ ] `tests/game/techSlotsRing.test.ts` (novo, `Graphics` dublê): o arco é desenhado na fração pedida e some com
      `null`, lido do objeto desenhado (L-043)
- [ ] Smoke `tech` verde: `ring` nulo em toda vaga
- [ ] Gate verde

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(hud): draw a charge ring around a technique slot`

---

#### T8: Filtro da vista da câmera

**What**: `insideView(center, view: { x; y; width; height }): boolean`, bordas inclusas.
**Where**: `src/core/viewFilter.ts`
**Depends on**: None
**Reuses**: nada (função pura)
**Requirement**: TC2-12
**Modelo**: Sonnet
**Escopo**: 1 função

**Done when**:

- [ ] `tests/core/viewFilter.test.ts` (novo): centro em cada borda dentro, 1 px fora de cada lado fora (L-010)
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the camera view filter`

---

#### T9: Portão e retenção da Convergência

**What**: `convergencePress(hp, hpCost): PressAnswer` (`hpCost > 0 && hp − hpCost < CONVERGENCE.hpFloor` → `deny hp`;
senão `cast`) e `convergenceHold(phase, keyHeld): boolean` (`charge` e tecla segura).
**Where**: `src/core/leva2Press.ts`
**Depends on**: None
**Reuses**: `PressAnswer` e o `speechPress` da Fala (F34)
**Requirement**: CNG-01, CNG-02
**Modelo**: Sonnet
**Escopo**: 2 funções pequenas do mesmo portão

**Done when**:

- [ ] `tests/core/leva2Press.test.ts` (novo): vida 6 nega e 7 passa com custo 6; custo 0 com vida 1 passa; `hold` só no
      `charge` com a tecla segura
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the convergence press and hold rules`

---

#### T10: Alvos e acerto comuns das técnicas da leva 2

**What**: `kitTargets(f, view)` (comuns vivos fora de ragdoll e o chefe vivo, `boxOfRect(hurtRect)`, `hp`, `maxHp`,
`kind`, só com o centro dentro da vista), `findTarget(f, id)` e `applyKitHit(ctx, cast, target, hit, opts)`: `Hit` com
`techMarks`, `scaleTechDamage(damage) + bite` (o proporcional nunca multiplicado), `receiveHit`, atordoamento
(`enemy.stun`/`boss.stun(ms, 'tech')`), `onTechHit`, `castHit(cast, t, opts)` e o retorno `killed`.
**Where**: `src/game/tech/leva2Targets.ts`
**Depends on**: T5, T6, T8
**Reuses**: `boxOfRect`, `scaleTechDamage`, `Enemy.stun`, `Boss.stun` (F34)
**Requirement**: TC2-08, TC2-12, CNG-06, DOG-02, RAI-03
**Modelo**: Sonnet
**Escopo**: 1 arquivo, o caminho único de acerto dos 4 módulos

**Done when**:

- [ ] `tests/game/leva2Targets.test.ts` (novo, dublês): alvo fora da vista, em ragdoll ou morto fica fora; o `bite` não
      é multiplicado e o dano é; `killed` bate com o dano escalado; comum entra em `stunned` e o chefe recebe
      `stun(ms, 'tech')`; `domain: false` chega ao `castHit`
- [ ] Gate verde; contagem informada

**Tests**: unit
**Gate**: quick
**Commit**: `feat(tech): add the shared target and hit path for leva 2`

---

### Phase 2: F41a passos 1 e 2 — ícones e Convergência

#### T11: Cinco ícones HD da leva 2

**What**: receitas `CONVERGENCIA` (gota que vira feixe, `t`/`R`), `CAES` (cabeça de cão de sombra, `b`/`k`, olho `W`),
`TROVAO` (punho com zigue-zague, `c`/`C`), `ERUPCAO` (pilar que sobe do chão, `a`/`A`/`r`) e `VAZIO` (círculo de
estrelas, `k`/`e`/`W`/`U`) com a placa e as `ICON_COLORS` das receitas de hoje, nos tamanhos 48 e 24; o `techIcons.ts`
ganha os 5 ids (`TECH_ICON_IDS` com 16) e as 5 receitas.
**Where**: `src/game/art/hd/icons/leva2Art.ts`
**Depends on**: None
**Reuses**: `drawPlate`, `IconCanvas`, `ICON_COLORS`, `jjkArt.ts` (`feat/icones-hd-tecnicas`)
**Requirement**: IC2-01, IC2-02, IC2-04, LVX-06
**Modelo**: Opus 5.5 ou Fable
**Escopo**: ⚠️ coeso: 1 arquivo de arte + o registro dos 5 ids

**Done when**:

- [ ] `tests/game/art/techIcons.test.ts`: 16 quadros em `techIconSheet(48)` e `(24)`, cada id como nome, só índices de
      `ICON_COLORS`, todo quadro distinto dos outros
- [ ] Prancha `tools/icon-boards.mjs` com os 16 lado a lado olhada antes do commit (saída em `.fable-out/`)
- [ ] Gate verde

**Tests**: unit + prancha
**Gate**: quick
**Commit**: `feat(art): draw the five leva 2 technique icons`

---

#### T12: Resolvedor da Convergência

**What**: `core/techResolversLeva2.ts` com `leva2Build(axes, item)` e `resolveConvergence` no formato da F33: chama
`convergenceStats`, custo pelo `buildEffects.techCost` (sem eixo de Eficiência, só o `costMul`), `hpCost` nunca
multiplicado, `damage × damageMul × vowDamageMul` arredondado como o `loadout.ts`, `killRefund: 0`, bloco
`convergencia` do `TechStats` com o `chargeMs` resolvido.
**Where**: `src/core/techResolversLeva2.ts`
**Depends on**: None
**Reuses**: `convergenceStats` (`core/convergence.ts`), resolvedores da F33
**Requirement**: TC2-02
**Modelo**: Sonnet
**Escopo**: 1 função (e o ajudante de leitura do build)

**Done when**:

- [ ] `tests/core/techStatsLeva2.test.ts` (novo): os 6 eixos de 0 a 3 com multiplicador 1 e 1,35 batem com
      `convergenceStats`; `hpCost` igual com qualquer multiplicador; `costMul` aplicado; `killRefund` 0
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): resolve the convergence stats from its axes`

---

#### T13: Eixos, ramos e Despertares da Convergência

**What**: `data/techAxesLeva2.ts` com `LEVA2_AXIS_ITEMS.convergencia`: eixos Perfuração, Carga, Largura, Vida, Dano,
Recarga; ramos Supernova (`:a`) e Curva (`:b`); Despertares Supernova Carmesim e Sangue Perfurante, com o texto de uma
linha da spec `regras-tecnicas-leva2`.
**Where**: `src/data/techAxesLeva2.ts`
**Depends on**: T12
**Reuses**: formato do `AXIS_ITEMS` (F33)
**Requirement**: TC2-04, TC2-05, TC2-13, TC2-14
**Modelo**: Sonnet
**Escopo**: 1 entrada de tabela

**Done when**:

- [ ] `tests/data/techAxesLeva2.test.ts` (novo): eixo dominante da Convergência com os valores de "Calibração" (Dano 3 a
      1,21× o mediano, teto 1,35)
- [ ] O teste de nomes únicos (EIX-10, `tests/data/combos.test.ts`) inclui ramos e Despertares novos
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(data): add the convergence axes, branches and awakenings`

---

#### T14: Convergência no jogo

**What**: a entrada da técnica num commit (LVX-05): `TechId` + `TECHNIQUES.convergencia` (sinal 0, carga 600 → 300,
soltura 60, recuperação 200, custo 20, recarga 3500, `icon`, `aura` `t`), `LEVA2_AXIS_ITEMS` espalhado no `AXIS_ITEMS`,
`RESOLVERS`, entrada rara de 26 no fim do `GAME_SHOP_CATALOG`, cor `red` da `Aura`, tipos `build.convergencia` e
`techState.convergencia` (`axisSnapshot.ts`, `techSnapshot.ts`), a linha do registro; o módulo (`answerPress` →
`convergencePress`, `holdPhase` → `convergenceHold`, `heldMs` no `charge`, `fireBeam` na entrada de `release` com a
origem da spec e o `hp` dos alvos como `ceil(hp / mul)`, recusa com energia de volta e `clearCooldown`, aceite com
`health.spend`, `hudHint().ring`, `state()`, `rebuild`/`roundEnd`) e `game/tech/convergenceHits.ts` (feixe e dobras
normais, estilhaços `micro`, `refundCooldown`, `TechSignal` `beam` no-op); `README.md` com `tech=convergencia` e os
eventos `beam:<n>`, `beamRefused:hp`, `techDenied:hp`.
**Where**: `src/game/tech/convergence.ts`
**Depends on**: T11, T13, T3, T7, T9, T10
**Reuses**: `TechModule`, `PressGate`, `Health.spend`, `TechWorld.wallAhead`, `fireBeam` (F34, `core/convergence.ts`)
**Requirement**: TC2-01, TC2-03, TC2-06, TC2-07, TC2-08, TC2-09, TC2-10, TC2-11, CNG-01, CNG-02, CNG-03, CNG-04,
CNG-05, CNG-06, CNG-07, CNG-09, CNG-10, IC2-03, LVX-05, LVX-07
**Modelo**: Sonnet (Opus 5.5 na revisão)
**Escopo**: ⚠️ coeso: a "entrada" da técnica que o LVX-05 pede num commit; o `convergenceHits.ts` é o mesmo módulo
partido pelo teto de linhas

**Done when**:

- [ ] `tests/game/convergenceAdapter.test.ts` (novo): o slot 0 recebe `setTexture('tech-icons')` e
      `setFrame('convergencia')`; o `ring` do módulo chega ao arco (L-043)
- [ ] `scripts/smoke/convergence.smoke.mjs` (novo, `?debug&hd=1&area=modular&seed=1&maxAlive=3&tech=convergencia`):
      `hp=7` dispara e deixa 1, `hp=6` nega com `techDenied:hp` sem gastar energia; toque contra carga cheia por
      `damageNumbers.last`; tecla segura 5 s não dispara; parede para o feixe; konbini com a tecla segura dá
      `techCancel`, nada gasto e nada no 1º quadro depois; golpe tomado na carga cancela sem custo
- [ ] O diff do commit não toca `TechRunner.ts`, `TechCaster.ts`, `techDirector.ts` (`techRunnerSource.test.ts` verde)
- [ ] Smokes `convergence`, `tech`, `shop` verdes; `TestScene.ts` sem linha; gate verde

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(tech): add the convergence beam technique`

---

#### T15: Vista da Convergência

**What**: `ConvergenceFx`: `beam(origin, end, widthPx)` (retângulo `t` com miolo `R`, 120 ms), `bend(from, to,
widthPx)`, `burst(center, radiusPx)` (anel `T`), todos no `FxRegistry` com prazo, e `handGlow(on)` (2 círculos
`t`/`R` presos ao `player.renderPos`); o módulo chama cada um.
**Where**: `src/game/techFx/ConvergenceFx.ts`
**Depends on**: T14
**Reuses**: `FxRegistry`, `renderPos` (AD-019)
**Requirement**: CNG-08, CNG-09, CNG-11, LVX-06
**Modelo**: Opus 5.5 ou Fable
**Escopo**: 1 vista + as chamadas do módulo

**Done when**:

- [ ] `convergence.smoke.mjs` lê do `FxRegistry` o feixe com a largura resolvida e prazo de 120 ms, a dobra com a
      Curva e o brilho da mão ligado só na carga
- [ ] Conferência em HD em movimento, dois lados, contra fila de comuns, parede e chefe (captura em `.fable-out/`)
- [ ] Smokes `convergence`, `fxlab` verdes; gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(fx): draw the convergence beam, bends and hand glow`

---

### Phase 3: F41a passo 3 — Cães Divinos

#### T16: Resolvedor dos Cães

**What**: `resolveDogs` no `techResolversLeva2.ts`: `dogsStats`, custo pelo `techCost` com eixo de Eficiência,
`damage` escalado, `killRefund: 0`, bloco `caes`.
**Where**: `src/core/techResolversLeva2.ts`
**Depends on**: T12
**Reuses**: `dogsStats` (`core/divineDogs.ts`)
**Requirement**: TC2-02
**Modelo**: Sonnet
**Escopo**: 1 função

**Done when**:

- [ ] `techStatsLeva2.test.ts`: os 6 eixos dos Cães de 0 a 3 com multiplicador 1 e 1,35; piso de custo de 60% nas
      bordas
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): resolve the divine dogs stats from their axes`

---

#### T17: Calibração dos Cães

**What**: `data/divineDogs.ts` com `caes: [2, 3, 4, 5]`, `capBiteDamage: 6` (correção 6 do design) e `prisao: [200,
330, 470, 600]` (correção 9: a mordida do Nv 1 já prende); o `tests/core/divineDogs.test.ts` (CAO-02 e a prisão base)
troca o número esperado, com o motivo no corpo do commit. A regra não muda.
**Where**: `src/data/divineDogs.ts`
**Depends on**: None
**Reuses**: tabela da calibração do design
**Requirement**: TC2-13
**Modelo**: Sonnet
**Escopo**: 3 números de 1 tabela

**Done when**:

- [ ] `divineDogs.test.ts` verde com os números novos (casos trocados listados no commit)
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `fix(data): keep the dogs bites under the dominant axis cap`

---

#### T18: Eixos, ramos e Despertares dos Cães

**What**: `LEVA2_AXIS_ITEMS.caes`: eixos Cães, Alcance, Mordidas, Prisão, Eficiência, Recarga; ramos Totalidade e
Matilha; Despertares Totalidade Negra e Matilha Faminta.
**Where**: `src/data/techAxesLeva2.ts`
**Depends on**: T16, T17
**Reuses**: a entrada da Convergência (T13)
**Requirement**: TC2-04, TC2-05, TC2-13, TC2-14
**Modelo**: Sonnet
**Escopo**: 1 entrada de tabela

**Done when**:

- [ ] `techAxesLeva2.test.ts`: Mordidas 3 a 1,20× o mediano (tabela de "Calibração")
- [ ] Nomes novos únicos no `combos.test.ts`; gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(data): add the divine dogs axes, branches and awakenings`

---

#### T19: Folha `dogs`

**What**: folha HD `dogs` (`HdSheet`, quadros de 24×16 texels, 1 texel = 1 px): `run-0..3`, `bite`, `vanish`, silhueta
`b`/`k` com olho `W`; registrada no `registerHdSheets` e em `TEX.dogs`.
**Where**: `src/game/art/hd/fx/dogsSheet.ts`
**Depends on**: None
**Reuses**: `HdSheet`, `registerHdSheets`
**Requirement**: DOG-06, LVX-06
**Modelo**: Opus 5.5 ou Fable
**Escopo**: 1 folha

**Done when**:

- [ ] `tests/game/art/dogsSheet.test.ts` (novo): 6 quadros com os nomes, 24×16, só chaves da `PALETTE`
- [ ] Prancha `tools/hd-boards.mjs` com os 6 quadros e o lobo a 1,5 olhada antes do commit
- [ ] Gate verde

**Tests**: unit + prancha
**Gate**: quick
**Commit**: `feat(art): draw the divine dogs sheet`

---

#### T20: Cães Divinos no jogo

**What**: a entrada dos Cães (LVX-05): `TechId`, `TECHNIQUES.caes` (120/0/60/150, custo 24, recarga 3500, `aura`
`W`), `AXIS_ITEMS`, `RESOLVERS`, entrada comum de 20 no fim do catálogo, `Aura` `white`, tipos de snapshot, linha do
registro; o módulo: `summonDogs(stats, feet, facing)` no `techCast:caes`, `pack.update(dt, kitTargets)` até `done`,
`bite` → `micro` de dano + bite com `stunMs = rootMs` (comum `stunned`, chefe `stun(ms, 'tech')`), abate →
`claimKillRefund` → `refundCooldown`, `objects()` com `dog`/`wolf`, `state()`; `README.md` com `tech=caes`.
**Where**: `src/game/tech/dogs.ts`
**Depends on**: T18, T10, T11
**Reuses**: `summonDogs`, `DogPack` (`core/divineDogs.ts`), `applyKitHit` (T10)
**Requirement**: TC2-01, TC2-03, TC2-06, TC2-07, TC2-08, TC2-09, TC2-10, TC2-11, DOG-01, DOG-02, DOG-05, IC2-03,
LVX-05, LVX-07
**Modelo**: Sonnet (Opus 5.5 na revisão)
**Escopo**: ⚠️ coeso: a entrada da técnica num commit (LVX-05)

**Done when**:

- [ ] `scripts/smoke/divine-dogs.smoke.mjs` (novo): custo 24 com `costMul` 1; mordida `micro` sem `hitstun`, com
      `stunnedMs` perto de 200 e o ataque em preparo perdido; os cães somem antes de 1200 ms; `axes=caes.prisao:3` deixa `stunnedMs` perto de 600; `ramo=caes:b` dá um cão com `dir`
      oposto; `techObjects` lista os cães vivos
- [ ] Diff sem `TechRunner.ts`, `TechCaster.ts`, `techDirector.ts`; smokes `divine-dogs`, `tech`, `shop` verdes; gate
      verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(tech): add the divine dogs technique`

---

#### T21: Vista dos Cães

**What**: `DogsFx`: pool de até 5 sprites da folha `dogs`, `run-0..3` a 80 ms, `bite` no `latched`,
`setFlipX(dir < 0)`, escala 1,5 no lobo, na linha do chão; `arc(dogId, from, to, 150)` no salto; `vanish(at)` com o
quadro `vanish` por 150 ms no `FxRegistry`. Pool da cena, fora do teto de 40.
**Where**: `src/game/techFx/DogsFx.ts`
**Depends on**: T19, T20
**Reuses**: folha `dogs` (T19), `FxRegistry`
**Requirement**: DOG-03, DOG-04, DOG-07, LVX-06
**Modelo**: Opus 5.5 ou Fable
**Escopo**: 1 vista + as chamadas do módulo

**Done when**:

- [ ] `divine-dogs.smoke.mjs` lê do sprite vivo textura, quadro, escala (1 e 1,5) e `flipX` nos dois sentidos (L-043,
      L-074)
- [ ] Conferência em HD em movimento: matilha nos dois lados, Matilha para trás, lobo saltando 3 alvos; a matilha de 5
      não embola (risco da calibração; se embolar, para e pergunta)
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(fx): draw the divine dogs pack`

---

### Phase 4: F41a passo 4 — Punho de Trovão

#### T22: Resolvedor do Trovão

**What**: `resolveThunder`: `thunderStats`, custo pelo `techCost`, dano escalado, `killRefund: 0`, bloco `trovao`.
**Where**: `src/core/techResolversLeva2.ts`
**Depends on**: T12
**Reuses**: `thunderStats` (`core/thunderFist.ts`)
**Requirement**: TC2-02
**Modelo**: Sonnet
**Escopo**: 1 função

**Done when**:

- [ ] `techStatsLeva2.test.ts`: os 6 eixos do Trovão de 0 a 3 com multiplicador 1 e 1,35
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): resolve the thunder fist stats from its axes`

---

#### T23: Eixos, ramos e Despertares do Trovão

**What**: `LEVA2_AXIS_ITEMS.trovao`: eixos Cargas, Saltos, Dano, Atordoa, Eficiência, Recarga; ramos Tempestade e
Estática; Despertares Raio Celeste e Descarga.
**Where**: `src/data/techAxesLeva2.ts`
**Depends on**: T22
**Reuses**: entradas das T13 e T18
**Requirement**: TC2-04, TC2-05, TC2-13, TC2-14
**Modelo**: Sonnet
**Escopo**: 1 entrada de tabela

**Done when**:

- [ ] `techAxesLeva2.test.ts`: o maior eixo do Trovão a 1,00× o mediano
- [ ] Nomes únicos; gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(data): add the thunder fist axes, branches and awakenings`

---

#### T24: Punho de Trovão no jogo

**What**: a entrada do Trovão (LVX-05): `TechId`, `TECHNIQUES.trovao` (150/0/60/150, custo 30, recarga 6000, `aura`
`C`), `AXIS_ITEMS`, `RESOLVERS`, entrada rara de 26 no fim do catálogo, `Aura` `blue`, tipos de snapshot, linha do
registro; o módulo: `fist.cast()` no `techCast:trovao`, `fist.update(dt)` antes da leitura do `StrikeLog`,
`fist.onStrike(...)` por entrada nova de `ctx.landedStrikes(lastSeq)`, raio `micro` com `stunMs` e
`triggerHitstop(hopHitstopMs)` por salto, coluna `micro` ou normal com `knockdown` só no comum, todos com `castHit(cast,
t, { domain: false })`, evento `bolt:<hops>`, `claimKillRefund`, `TechSignal` `discharge` no-op, `hudHint().badge`,
`state()`; `README.md` com `tech=trovao` e `bolt:<n>`.
**Where**: `src/game/tech/thunder.ts`
**Depends on**: T23, T4, T10, T11
**Reuses**: `ThunderFist` (`core/thunderFist.ts`), `StrikeLog` (T4), `applyKitHit` (T10)
**Requirement**: TC2-01, TC2-03, TC2-06, TC2-07, TC2-08, TC2-09, TC2-10, TC2-11, RAI-01, RAI-02, RAI-03, RAI-04,
RAI-05, RAI-06, RAI-08, IC2-03, LVX-05, LVX-07
**Modelo**: Sonnet (Opus 5.5 na revisão)
**Escopo**: ⚠️ coeso: a entrada da técnica num commit (LVX-05)

**Done when**:

- [ ] `scripts/smoke/thunder-fist.smoke.mjs` (novo): custo 30; 3 jabs dão 3 `bolt:*` e o 4º não; golpe que erra não
      gasta; 2 saltos com os comuns a menos de 120 px; golpe de 3 alvos gasta 1 carga; a janela acaba e as cargas vão a
      0; o raio não carrega a barra do Domínio
- [ ] Smokes `thunder-fist`, `tech`, `power`, `feel` verdes (rajada de `micro` dentro do teto da F29); diff sem runner,
      caster e diretor; gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(tech): add the thunder fist technique`

---

#### T25: Vista do Trovão

**What**: `ThunderFx`: `zigzag(from, to, 120)` com `lightningBolts` (seed = `swingId`, `c` com miolo `C`),
`column(x, 150)` do topo da vista ao chão, `crackle(on)` (2 zigue-zagues curtos nos punhos presos ao `renderPos`,
redesenhados a cada 100 ms), no `FxRegistry`.
**Where**: `src/game/techFx/ThunderFx.ts`
**Depends on**: T24
**Reuses**: `lightningBolts` (`src/core/lightning.ts:81`), `FxRegistry`
**Requirement**: RAI-06, RAI-07, RAI-09, LVX-06
**Modelo**: Opus 5.5 ou Fable
**Escopo**: 1 vista + as chamadas do módulo

**Done when**:

- [ ] `thunder-fist.smoke.mjs` lê do `FxRegistry` o zigue-zague por salto (120 ms), a coluna com a Tempestade e o
      estalo dos punhos só com carga
- [ ] Conferência em HD em movimento, dois lados: cadeia sobre 3 comuns, coluna da Tempestade no chefe
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(fx): draw the thunder fist bolts and fist crackle`

---

### Phase 5: F41a passo 5 — Erupção e fechamento da F41a

#### T26: Resolvedor da Erupção

**What**: `resolveEruption`: `eruptionStats`, custo pelo `techCost`, dano escalado, `killRefund: 0`, bloco `erupcao`.
**Where**: `src/core/techResolversLeva2.ts`
**Depends on**: T12
**Reuses**: `eruptionStats` (`core/eruption.ts`)
**Requirement**: TC2-02
**Modelo**: Sonnet
**Escopo**: 1 função

**Done when**:

- [ ] `techStatsLeva2.test.ts`: os 6 eixos da Erupção de 0 a 3 com multiplicador 1 e 1,35
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): resolve the eruption stats from its axes`

---

#### T27: Calibração da Erupção

**What**: `data/eruption.ts` com `queima: [0, 2, 3, 5]` (correção 6); o `tests/core/eruption.test.ts` (ERU-02) troca o
número esperado, motivo no commit.
**Where**: `src/data/eruption.ts`
**Depends on**: None
**Reuses**: tabela da calibração do design
**Requirement**: TC2-13
**Modelo**: Sonnet
**Escopo**: 1 número de 1 tabela

**Done when**:

- [ ] `eruption.test.ts` verde com o número novo (caso trocado no commit)
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `fix(data): raise the eruption burn to balance its axes`

---

#### T28: Eixos, ramos e Despertares da Erupção

**What**: `LEVA2_AXIS_ITEMS.erupcao`: eixos Altura, Erupções, Queima, Dano, Eficiência, Recarga; ramos Meteoro e Lago
de Lava; Despertares Chuva de Meteoros e Caldeira.
**Where**: `src/data/techAxesLeva2.ts`
**Depends on**: T26, T27
**Reuses**: entradas anteriores
**Requirement**: TC2-04, TC2-05, TC2-13, TC2-14
**Modelo**: Sonnet
**Escopo**: 1 entrada de tabela

**Done when**:

- [ ] `techAxesLeva2.test.ts`: Erupções 3 a 1,333× o mediano (valores exatos da tabela)
- [ ] Nomes únicos; gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(data): add the eruption axes, branches and awakenings`

---

#### T29: Erupção no jogo

**What**: a entrada da Erupção (LVX-05): `TechId`, `TECHNIQUES.erupcao` (250/0/60/200, custo 30, recarga 3500, `aura`
`a`), `AXIS_ITEMS`, `RESOLVERS`, entrada comum de 20 no fim do catálogo, `Aura` `yellow`, tipos de snapshot, linha do
registro; o módulo: `erupt(stats, feet, facing)` no 1º quadro do `sign` sem conjuração pendente, relógio no do sinal,
descarte no `techCancel` antes da soltura (correção 5), `update(dt, kitTargets)` até `done`, `pillar`/`meteor`/
`caldeira` normal com `knockdown` no comum, `shard` `micro`, `burn`/`lava` `chip`, `claimKillRefund`, lista de
conjurações vivas, `objects()` com `lava`/`meteor`, `state()`; `README.md` com `tech=erupcao`.
**Where**: `src/game/tech/eruption.ts`
**Depends on**: T28, T10, T11
**Reuses**: `erupt`, `EruptionCast` (`core/eruption.ts`), `applyKitHit` (T10)
**Requirement**: TC2-01, TC2-03, TC2-06, TC2-07, TC2-08, TC2-09, TC2-10, TC2-11, ERP-01, ERP-02, ERP-03, ERP-05,
IC2-03, LVX-05, LVX-07
**Modelo**: Sonnet (Opus 5.5 na revisão)
**Escopo**: ⚠️ coeso: a entrada da técnica num commit (LVX-05)

**Done when**:

- [ ] `scripts/smoke/eruption.smoke.mjs` (novo): custo 30; comum a 80 px toma 24 de técnica; comum colado (centro a
      30 px) não toma; `axes=erupcao.queima:3`
      dá números `chip` por até 2 s; `ramo=erupcao:b` põe `lava` no `techObjects`; golpe tomado no sinal: nenhum pilar,
      nada cobrado; dois pilares no mesmo alvo dão dois acertos e a queima renova sem somar
- [ ] Diff sem runner, caster e diretor; smokes `eruption`, `tech`, `shop` verdes; gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(tech): add the eruption technique`

---

#### T30: Vista da Erupção

**What**: `EruptionFx`: marca no chão (`a` piscando) em cada posição durante o sinal; coluna de 32 px pela altura
resolvida em 3 faixas `r`/`a`/`A` por 300 ms; meteoro (círculo `a`/`A` com rastro) caindo 400 ms e anel de 56 px; lava
de 64 × 8 px (`r`/`a` tremulando) enquanto vive. Geometria procedural.
**Where**: `src/game/techFx/EruptionFx.ts`
**Depends on**: T29
**Reuses**: `FxRegistry`
**Requirement**: ERP-01, ERP-04, ERP-06, LVX-06
**Modelo**: Opus 5.5 ou Fable
**Escopo**: 1 vista + as chamadas do módulo

**Done when**:

- [ ] `eruption.smoke.mjs` lê as marcas no sinal, a coluna com a altura resolvida e a lava viva no `FxRegistry`
- [ ] Conferência em HD em movimento, dois lados: 4 erupções em fila, Meteoro e Lago de Lava
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(fx): draw the eruption pillars, meteor and lava`

---

#### T31: Carta de 2 eixos, ramo e Despertar das quatro

**What**: o `tech-axes.smoke.mjs` (F33) ganha os casos das 4 técnicas: `axes=trovao.cargas:1` na loja da r4 mostra a
carta de 2 eixos com a prévia; o Nv 2 abre a página de ramo; `ramo=` e `axes=` inválidos ignorados; `build.<id>` no
snapshot. Se o arquivo passar de 380 linhas, os casos vão para o `thunder-fist.smoke.mjs`.
**Where**: `scripts/smoke/tech-axes.smoke.mjs`
**Depends on**: T29
**Reuses**: casos da F33
**Requirement**: TC2-04, TC2-05, TC2-06, TC2-07
**Modelo**: Sonnet
**Escopo**: 1 smoke

**Done when**:

- [ ] Casos novos verdes com o efeito lido do jogo vivo (carta, página do ramo, `build.<id>.stats`)
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `test(smoke): cover the leva 2 technique cards and branches`

---

#### T32: Fechamento da F41a

**What**: conferência da sub-fase: contagem de linhas efetivas (`TestScene.ts` igual à base, `Hud.ts`, `moves.ts`,
`ShopPanel.ts` sem crescer, nenhum arquivo novo nas exceções), todos os smokes da F41a e os antigos do sistema, os 4
ícones no slot, na carta, no voo e na chamada em HD, e a seção F41a do `validation.md` escrita pelo Verifier.
**Where**: `.specs/features/leva-2/validation.md`
**Depends on**: T30, T31
**Reuses**: `validate_state.py` só no fim da F41e
**Requirement**: LVX-01, LVX-02, LVX-04, LVX-06, IC2-03, IC2-04
**Modelo**: Opus 5.5 ou Fable (Verifier)
**Escopo**: 1 documento de validação

**Done when**:

- [ ] Smokes `convergence`, `divine-dogs`, `thunder-fist`, `eruption`, `tech-axes`, `tech`, `boogie`, `resonance`,
      `cursed-speech`, `fxlab`, `shop`, `run-loop` verdes
- [ ] Contagens no `validation.md`; ícones conferidos em HD
- [ ] Gate verde

**Tests**: smoke
**Gate**: build
**Commit**: `docs(specs): validate the leva 2 techniques sub-phase`

---

### Phase 6: F41b passo 0 — crítico de técnica e de objeto, barra de postura

#### T33: Regra do crítico no alvo

**What**: `targetCritMul(c: { kind: 'tech' | 'prop' | 'other'; band; voidParalyzed; weakPointTech; palavraStunned })`
= 1,5 com a maior fonte que vale ou 1: objeto no paralisado do Vazio; técnica não chip no ponto fraco com Seis Olhos Nv
3; acerto não chip no atordoado pela Fala com a Palavra no Ponto Fraco. Chip nunca é crítico.
**Where**: `src/core/critRules.ts`
**Depends on**: None
**Reuses**: regra do maior da F35 (TAL-16)
**Requirement**: TLV-16, TLV-17, VAZ-04, EVL-06
**Modelo**: Sonnet
**Escopo**: 1 função

**Done when**:

- [ ] `tests/core/critRules.test.ts` (novo): cada fonte sozinha, duas fontes juntas dão 1,5 (nunca 2,25), chip fora,
      `other` só com a Palavra
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the target critical rule for techniques and objects`

---

#### T34: `CritSources` com o Vazio e a Palavra

**What**: as `CritSources` da F35 ganham `voidParalyzed` e `palavraStunned` (1,5 cada, regra do maior, sem arredondar
duas vezes); desligadas, o crítico de golpe é o de hoje.
**Where**: `src/core/buildEffects.ts`
**Depends on**: None
**Reuses**: `CritSources.critMul` (F35; reconferir o arquivo dono no começo da fase)
**Requirement**: VAZ-04, EVL-06, TLV-17
**Modelo**: Sonnet
**Escopo**: 2 campos de 1 função

**Done when**:

- [ ] `tests/core/buildEffectsLeva2.test.ts` (novo): fontes novas desligadas dão o `critMul` da F35; ligadas com a
      Proporção dão 1,5 com um arredondamento só
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the void and word critical sources`

---

#### T35: `critDirector`

**What**: campo `crits` do `BuildDirector` com `modify(hit, target)`: só `hit.ownerId === player.id`; técnica =
`hit.techId !== undefined`, objeto = `PROP_TRAITS`; com multiplicador > 1 muda o `Hit` no lugar (`damage =
round(damage × mul)`, `crit = true`). No passo 0 todas as fontes ficam desligadas.
**Where**: `src/scenes/test/critDirector.ts`
**Depends on**: T33
**Reuses**: `targetCritMul` (T33), `techMarks` (F32)
**Requirement**: TLV-16, TLV-17, VAZ-04
**Modelo**: Sonnet
**Escopo**: 1 diretor

**Done when**:

- [ ] `tests/scenes/critDirector.test.ts` (novo): o mesmo objeto `Hit` sai com dano e `crit` mudados; acerto do inimigo,
      Kokusen e emissão sem `techId` ficam iguais; com tudo desligado nada muda
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(build): add the critical director for technique and object hits`

---

#### T36: Gancho `hitMods` no comum e no chefe

**What**: `hitMods: ((hit, target) => void) | null` chamado na 1ª linha do `receiveHit` do `Enemy` (+3) e do `Boss`
(+3), atribuído no `spawner.wireEnemy` e no `bossDirector.attach`; o `effects.onTechConnect` mostra `crit` quando
`hit.crit` (+1). O Kokusen e o finalizador não passam por aqui.
**Where**: `src/game/Enemy.ts`
**Depends on**: T35
**Reuses**: `receiveHit` de hoje
**Requirement**: TLV-17
**Modelo**: Sonnet
**Escopo**: ⚠️ coeso: o mesmo gancho nos dois alvos + a ligação e o número que o provam

**Done when**:

- [ ] Nenhum campo novo além de `hitMods`; `Enemy.ts` e `Boss.ts` abaixo de 400 efetivas
- [ ] Smokes `tech`, `fight`, `boss`, `kokusen`, `finisher` verdes e iguais (fontes desligadas)
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(combat): let the target modify a player hit before it lands`

---

#### T37: Barra de postura do chefe

**What**: `BossBarOverlay`: barra de 2 px logo abaixo da barra do chefe (`BOSS_BAR_WIDTH`, `MARGIN` exportados pela
F32), cheia em `poise / poiseMax` em `PALETTE.S`, em toda luta de chefe; `update(view)`, `debug()` com a largura lida do
retângulo vivo; criada pelo `bossDirector` junto do `BossReadout`; `boss.poiseBar` no `bossSnapshot.ts`.
**Where**: `src/game/BossBarOverlay.ts`
**Depends on**: None
**Reuses**: `BossReadout`, constantes da barra (F32)
**Requirement**: TLV-06, TLV-20, LVX-02, LVX-03
**Modelo**: Sonnet (Opus 5.5 na conferência)
**Escopo**: 1 vista + o campo de snapshot que a prova

**Done when**:

- [ ] Smoke `boss` (caso novo): `boss.poiseBar.value/max` acompanha a postura e a largura do retângulo vivo é
      `round(BOSS_BAR_WIDTH × poise / max)`; sem chefe, `null`
- [ ] `Hud.ts` sem linha; conferência em HD; gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(hud): show the boss poise bar`

---

### Phase 7: F41b passo 1 — Vazio Ilimitado

#### T38: Dados do Vazio

**What**: `DomainId` + `'vazio'`; `DOMAINS.vazio` (`Vazio Ilimitado`, `Paralisa o grupo`, ativação 320 px com 0,40 /
0,20 / 0,06 e força 0, `durationMs [2500, 3500, 3500]`); `VOID = { commonMs, bossMs: [300, 300, 600], critMul: 1.5,
starRingPx: 14 }`; cores `voidSky 'e'`, `voidStar 'W'`, `voidGlow 'U'`.
**Where**: `src/data/domains.ts`
**Depends on**: None
**Reuses**: formato dos 3 Domínios (F31)
**Requirement**: VAZ-01, LVX-06
**Modelo**: Sonnet
**Escopo**: 1 entrada de tabela

**Done when**:

- [ ] `tests/data/domainsVazio.test.ts` (novo): os números do VAZ-01 linha a linha; cores na `PALETTE`
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(data): add the unlimited void domain`

---

#### T39: Paralisia do Vazio

**What**: `class VoidParalysis { start(activationId); paralyze(id, ms); isParalyzed(id); ids(); update(dtMs); reset() }`
(relógio por alvo, independente do fim do Domínio) e `voidTargets(center, targets, radiusPx)` com o `inRadius` da F31.
**Where**: `src/core/voidDomain.ts`
**Depends on**: T38
**Reuses**: `inRadius` (F31)
**Requirement**: VAZ-03, VAZ-05
**Modelo**: Sonnet
**Escopo**: 1 classe + 1 função

**Done when**:

- [ ] `tests/core/domainVazio.test.ts` (novo): 320 px dentro e 321 fora; paralisia de 2500 ms viva aos 2499 e fora aos
      2500; a paralisia sobrevive ao fim do Domínio; alvo que entra depois não é paralisado
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the void paralysis rule`

---

#### T40: Baú do Véu sorteia 2 de 4

**What**: `drawVeil` sorteia 2 de `DOMAIN_IDS` (4) pelo `chestRng`; o consumo muda (`int(4)`): o teste do baú e o smoke
`domain-veil` anotam o par novo da seed fixa.
**Where**: `src/core/veilChest.ts`
**Depends on**: T38
**Reuses**: `drawVeil` (F31)
**Requirement**: VAZ-02
**Modelo**: Sonnet
**Escopo**: 1 função

**Done when**:

- [ ] Teste do baú (F31): dois diferentes entre os 4, mesma seed dá o mesmo par (par novo listado no commit)
- [ ] Smoke `domain-veil` verde com o par novo; gate verde

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(domain): draw the veil chest pair among four domains`

---

#### T41: Vazio Ilimitado no jogo

**What**: `domainPowers.onActivate('vazio', level)`: depois do acerto da ativação (DOM-08, já feito pelo
`domainDirector`), todo comum vivo a até 320 px → `enemy.stun(commonMs)` e o chefe vivo → `boss.stun(bossMs, 'tech')`
sem armar o finalizador, `paralysis.paralyze`, evento `vazio:<n>`; `update` anda a paralisia; `isVoidCrit(id)`;
`domain.active.paralyzed` no `domainSnapshot.ts`; níveis 2 e 3 pelo baú e pela carta `dominio` (DNV); `README.md` com
`domain=vazio[:n]` e `vazio:<n>`. Se o arquivo passar de ~170 efetivas, o Vazio sai para `domainVoid.ts`.
**Where**: `src/scenes/test/domainPowers.ts`
**Depends on**: T39
**Reuses**: `domainDirector.strikeActivation`, `Enemy.stun`, `Boss.stun` (F31, F34)
**Requirement**: VAZ-03, VAZ-05, VAZ-07, VAZ-08, LVX-03, LVX-07
**Modelo**: Sonnet
**Escopo**: 1 poder de Domínio + o campo de snapshot que o prova

**Done when**:

- [ ] `scripts/smoke/void-domain.smoke.mjs` (novo, `domain=vazio`): a ativação acerta antes da paralisia; os comuns a
      até 320 px ficam `stunned` perto de 2500 ms e o chefe perto de 300; `vazio:0` sem ninguém; `paralyzed` lista os
      ids e esvazia sozinho; `domain=vazio:9` ignorado; Fala por cima fica com o maior restante
- [ ] Smokes `void-domain`, `domain-veil` verdes; gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(domain): paralyze the group with the unlimited void`

---

#### T42: Crítico no paralisado do Vazio

**What**: o `critDirector` liga `voidParalyzed` pelo `isVoidCrit(id)` para objeto do mundo, e o `StatsDirector` passa
`voidParalyzed` às `CritSources` para o golpe do moveset; vale só com o Vazio ativo.
**Where**: `src/scenes/test/critDirector.ts`
**Depends on**: T41, T34, T35
**Reuses**: `CritSources` (T34), `targetCritMul` (T33)
**Requirement**: VAZ-04
**Modelo**: Sonnet
**Escopo**: 1 fonte ligada nos 2 caminhos de crítico

**Done when**:

- [ ] `critDirector.test.ts`: com `isVoidCrit` verdadeiro o `Hit` de objeto sai ×1,5 e `crit`; o de técnica não
- [ ] `void-domain.smoke.mjs`: golpe e objeto no paralisado com o Vazio ativo saem `crit` ×1,5 (`damageNumbers.last`);
      depois do fim, mesmo paralisado, não; técnica nunca
- [ ] Gate verde

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(domain): make hits on void paralyzed targets critical`

---

#### T43: Vista do Vazio

**What**: `VoidFx`: vinheta de céu (`e` a 0,35) com 24 estrelas `W` por seed na `uiLayer`, apagando em 300 ms depois
do fim; anel de 5 estrelas `W`/`U` girando sobre cada paralisado, na posição desenhada; criado pelo `DomainFx`; `debug()`
com o alfa real.
**Where**: `src/game/VoidFx.ts`
**Depends on**: T41
**Reuses**: `DomainFx` (F31), `spritePos` (AD-019)
**Requirement**: VAZ-06, VAZ-09, LVX-06
**Modelo**: Opus 5.5 ou Fable
**Escopo**: 1 vista

**Done when**:

- [ ] `void-domain.smoke.mjs` lê o alfa real da vinheta (0,35 ativo, 0 depois de 300 ms do fim) e um anel por
      paralisado (L-043)
- [ ] Conferência em HD em movimento, dois lados, com um grupo e o chefe no raio
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(fx): draw the void starfield and paralysis rings`

---

#### T44: Ícone do Vazio na barra e na carta

**What**: o quadro `vazio` do `TEX.techIconsSmall` aparece na barra do Domínio e na carta de nível como o ICO-08 diz
(caminho genérico por id); o smoke prova no sprite vivo.
**Where**: `scripts/smoke/void-domain.smoke.mjs`
**Depends on**: T41, T11
**Reuses**: ICO-08 (`feat/icones-hd-tecnicas`)
**Requirement**: IC2-05
**Modelo**: Sonnet
**Escopo**: 1 caso de smoke (e o ajuste de 1 linha se o caminho não for genérico)

**Done when**:

- [ ] O smoke lê `frame.name === 'vazio'` na barra do Domínio e na carta `dominio`
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `test(smoke): check the void icon on the domain bar and card`

---

### Phase 8: F41b passos 2 a 4 — talentos, regra pura, dados e ícones

#### T45: Ícones dos cinco talentos

**What**: 5 grades 16×16 em `talentIcons.ts`: punho de ferro, osso rachado, mão verde, círculo azul, seis olhos.
**Where**: `src/game/art/hd/talentIcons.ts`
**Depends on**: None
**Reuses**: grades da F35
**Requirement**: TLV-19, LVX-06
**Modelo**: Opus 5.5 ou Fable
**Escopo**: 5 grades no mesmo arquivo

**Done when**:

- [ ] Teste dos ícones de talento (F35): 5 ids novos, 16×16, só `PALETTE`, distintos
- [ ] Prancha `tools/hd-boards.mjs` olhada antes do commit; gate verde

**Tests**: unit + prancha
**Gate**: quick
**Commit**: `feat(art): draw the five leva 2 talent icons`

---

#### T46: Dados dos cinco talentos

**What**: `PerkId` + `maoDeFerro`, `ossoDuro`, `reversaRefinada`, `dominioSimples`, `seisOlhos` com afinidade, textos
de carta por nível (até 20 caracteres) e `next`, e `TALENT2` com os números do design. Sem entrada no catálogo (T60).
**Where**: `src/data/perks.ts`
**Depends on**: None
**Reuses**: formato dos talentos da F35
**Requirement**: TLV-01
**Modelo**: Sonnet
**Escopo**: 1 tabela

**Done when**:

- [ ] `tests/data/perksLeva2.test.ts` (novo): afinidade, textos até 20 caracteres, `TALENT2` linha a linha
- [ ] `perks=maoDeFerro` aceito pelo `parsePerksParam` genérico; gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(data): add the five leva 2 talents`

---

#### T47: Efeitos de build dos talentos

**What**: `buildEffects` ganha `recoilMul`, `bossPoiseMul`, `rctHealMul`, `parryWindowBonusMs` e o custo do Seis Olhos
dentro do `techCost`, antes do piso de 60%.
**Where**: `src/core/buildEffects.ts`
**Depends on**: T46, T34
**Reuses**: `buildEffects` (F35)
**Requirement**: TLV-02, TLV-05, TLV-08, TLV-11, TLV-14
**Modelo**: Sonnet
**Escopo**: 1 função ampliada

**Done when**:

- [ ] `buildEffectsLeva2.test.ts`: os 5 talentos no Nv 1 a 3; piso do Seis Olhos nas duas bordas (L-010); janela de
      parry 150/170/180/190
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): apply the leva 2 talents to the build effects`

---

#### T48: Ponto fraco, empurrão e trincas

**What**: `class WeakPoint { update(nowMs, center, candidates): number | null }` (refeito a cada 500 ms; morto →
próxima escolha); `class PushTracker` (`start(id, nowMs)`, `active` enquanto `|vx| > 0,5` e até 600 ms,
`wallHit(id)` uma vez por empurrão); `crackCount(poise, max)` = 0 a 3 (≤ 75%, 50%, 25%).
**Where**: `src/core/talentsLeva2.ts`
**Depends on**: None
**Reuses**: nada (regras puras)
**Requirement**: TLV-04, TLV-06, TLV-15
**Modelo**: Sonnet
**Escopo**: 3 regras pequenas dos talentos

**Done when**:

- [ ] `tests/core/talentsLeva2.test.ts` (novo): escolha aos 499 e 500 ms; o mais perto; morto pula; trincas a 75, 50 e
      25% nos dois lados; uma parede por empurrão; empurrão acaba em 600 ms
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the weak point, push and crack rules`

---

### Phase 9: F41b passos 2 e 3 — Seis Olhos, Domínio Simples, Mão de Ferro

#### T49: Diretor dos talentos da leva 2 com o ponto fraco

**What**: `scenes/test/talentsLeva2.ts` (campo `leva2` do `TalentDirector`; o diretor da F35 repassa `onMeleeHit`,
`onDefense`, `update`, `removeTalent`, `reset`, `snapshot` com uma linha cada) e `game/TalentFx2.ts` (mundo, `FX_DEPTH`,
`FxRegistry`); primeiro talento: Seis Olhos com o `WeakPoint` sobre `kitTargets`, a marca de olho `c`/`C` do Nv 2,
`talent:seisOlhos` em cada conjuração que chega a `release`, `build.weakPoint` no `buildSnapshot.ts`.
**Where**: `src/scenes/test/talentsLeva2.ts`
**Depends on**: T45, T47, T48, T10
**Reuses**: `TalentDirector`, `TalentFx` (F35), `kitTargets` (T10)
**Requirement**: TLV-15, TLV-18, TLV-20, LVX-03
**Modelo**: Sonnet (Opus 5.5 na conferência da marca)
**Escopo**: ⚠️ coeso: o diretor nasce com o 1º talento que o prova (merge forward)

**Done when**:

- [ ] `scripts/smoke/talents-2.smoke.mjs` (novo, `perks=seisOlhos`): `build.weakPoint` é o comum mais perto e muda a
      cada 500 ms; Nv 2 desenha a marca no alvo; morto pula
- [ ] `talentDirector.ts` cresce só os repasses; gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(talents): add the six eyes weak point`

---

#### T50: Seis Olhos Nv 3

**What**: com Seis Olhos Nv 3, o `critDirector` liga `weakPointTech` (acerto de técnica não chip no ponto fraco sai
×1,5) e o diretor dá +10 de energia por `Cooldown(6000)`; `talent:seisOlhos` em cada crítico.
**Where**: `src/scenes/test/talentsLeva2.ts`
**Depends on**: T49, T35
**Reuses**: `critDirector` (T35), `Cooldown` (F35)
**Requirement**: TLV-16, TLV-17, TLV-18
**Modelo**: Sonnet
**Escopo**: 1 comportamento

**Done when**:

- [ ] `talents-2.smoke.mjs`: técnica no ponto fraco sai `crit` (`damageNumbers.last.kind`); fora dele não; chip não;
      Kokusen nunca; energia +10 só uma vez em 6000 ms
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(talents): make technique hits on the weak point critical`

---

#### T51: Domínio Simples Nv 1 e 2

**What**: a janela de parry cresce pelo `parryWindowBonusMs` no ponto em que a defesa lê a janela; com Nv ≥ 2 e a
guarda segura, círculo de 24 px no chão sob o player (`TalentFx2`); `talent:dominioSimples` em cada `parry`/`deflect`.
**Where**: `src/scenes/test/talentsLeva2.ts`
**Depends on**: T49
**Reuses**: janela de parry (`core/defense`), `TalentFx2` (T49)
**Requirement**: TLV-11, TLV-12, TLV-18
**Modelo**: Sonnet
**Escopo**: 1 talento, 2 níveis

**Done when**:

- [ ] `talents-2.smoke.mjs`: parry aos 160 ms passa com Nv 1 e falha sem; círculo vivo só com a guarda segura no Nv 2
- [ ] Smoke `defense` verde e igual; gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(talents): widen the parry window with the simple domain`

---

#### T52: Corte iai do Domínio Simples Nv 3

**What**: `EmitSource` + `'iai'` (`core/techEmitter.ts`, +1); `parry`/`deflect` contra atacante vivo →
`emitter.emit('iai', ...)` `micro` de `round(20 × hpMul)`, `CutFx.cut`, evento `iai:<id>`; `README.md` com o evento.
**Where**: `src/scenes/test/talentsLeva2.ts`
**Depends on**: T51
**Reuses**: `TechEmitter`, `emitterDirector` (F34), `CutFx`
**Requirement**: TLV-13, TLV-18, LVX-07
**Modelo**: Sonnet
**Escopo**: 1 comportamento + a fonte do emissor que ele usa

**Done when**:

- [ ] `talents-2.smoke.mjs`: parry no Nv 3 tira `round(20 × hpMul)` do atacante com número `micro` e `iai:<id>`;
      teto de 4 por segundo da fonte
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(talents): cut the attacker with the simple domain iai`

---

#### T53: Mão de Ferro Nv 1 e 2

**What**: força do golpe × `recoilMul` no `StatsDirector.strikeMods` (depois do `forceMul` da força e do Peso do
Corpo); Nv 2: comum empurrado → `PushTracker.start`, poeira nos pés (`TalentFx2.dust`) e `Prop` em `rest` tocado →
`prop.breakNow()`; `talent:maoDeFerro` em todo golpe forte que acerta e em cada objeto quebrado.
**Where**: `src/scenes/test/talentsLeva2.ts`
**Depends on**: T49
**Reuses**: `PushTracker` (T48), `StatsDirector.strikeMods` (F29), quebra de objeto de hoje
**Requirement**: TLV-02, TLV-03, TLV-18
**Modelo**: Sonnet
**Escopo**: 1 talento, 2 níveis

**Done when**:

- [ ] `talents-2.smoke.mjs`: `vx` do comum depois do golpe × 1,2 no Nv 1 contra sem talento; no Nv 2 o objeto no chão
      tocado quebra; poeira viva durante o empurrão
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(talents): push harder with the iron hand`

---

#### T54: Mão de Ferro Nv 3

**What**: comum empurrado que toca parede (`world.touchesWall`) leva um acerto normal de `round(15 × hpMul)` uma vez
por empurrão, com o atordoamento de parede (VRM-16); `talent:maoDeFerro` na batida.
**Where**: `src/scenes/test/talentsLeva2.ts`
**Depends on**: T53
**Reuses**: `PushTracker.wallHit` (T48), VRM-16 (F30)
**Requirement**: TLV-04, TLV-18
**Modelo**: Sonnet
**Escopo**: 1 comportamento

**Done when**:

- [ ] `talents-2.smoke.mjs`: comum jogado na parede toma `round(15 × hpMul)` uma vez só por empurrão
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(talents): hurt enemies pushed into walls`

---

### Phase 10: F41b passos 3 e 4 — Reversa Refinada, Osso Duro e loja

#### T55: Reversa Refinada Nv 1 e 2

**What**: cura da Reversa × `rctHealMul` pelo `buildEffects` (energia por quadro igual); Nv 2: número `heal` verde e
brilho de 400 ms na barra de vida pelo `TalentHudFx`; `talent:reversaRefinada` em cada texto de cura.
**Where**: `src/scenes/test/talentsLeva2.ts`
**Depends on**: T49
**Reuses**: `TalentHudFx` (brilho do Executor Nv 2, F35)
**Requirement**: TLV-08, TLV-09, TLV-18
**Modelo**: Sonnet
**Escopo**: 1 talento, 2 níveis

**Done when**:

- [ ] `talents-2.smoke.mjs`: cura × 1,25 no Nv 1 contra sem talento com a mesma energia gasta; Nv 2 dá número `heal`
      e brilho por 400 ms
- [ ] Smoke `heal` verde e igual; gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(talents): heal more with the refined reverse`

---

#### T56: Andar curando com a Reversa Nv 3

**What**: `channeling` aceita `false | true | { walkMul }`; com `walkMul > 0` o `casting` não trava o andar e a
velocidade sai × `walkMul` (0,4); golpe, conjuração e esquiva continuam encerrando a Reversa. Nenhum campo novo.
**Where**: `src/game/Player.ts`
**Depends on**: T55
**Reuses**: campo `channeling` (`Player.ts:66`)
**Requirement**: TLV-10, LVX-02
**Modelo**: Sonnet
**Escopo**: 1 valor de campo que já existe

**Done when**:

- [ ] `talents-2.smoke.mjs`: com Nv 3 canalizando, o player anda a 40% da velocidade; golpe encerra a Reversa
- [ ] `Player.ts` sem campo novo e abaixo de 400 efetivas; smokes `heal`, `player-anim` verdes; gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(player): walk slowly while channeling the refined reverse`

---

#### T57: Osso Duro Nv 1

**What**: `bossBrain.receiveHit(hit, scale = 1, poiseMul = 1)`; o `Boss` ganha `poiseMul` (repassado ao cérebro) e o
diretor põe `boss.poiseMul = buildEffects.bossPoiseMul`; `talent:ossoDuro` em todo dano de postura de acerto do player.
**Where**: `src/core/bossBrain.ts`
**Depends on**: T49
**Reuses**: `receiveHit` do cérebro
**Requirement**: TLV-05, TLV-18
**Modelo**: Sonnet
**Escopo**: 1 parâmetro no cérebro + o repasse

**Done when**:

- [ ] `tests/core/bossPoiseMul.test.ts` (novo; `bossBrain.test.ts` não cresce): postura × 1,25 / 1,5 / 1,75; vida igual
- [ ] `talents-2.smoke.mjs` com chefe: `boss.poiseBar.value` cai 1,25× mais rápido; gate verde

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(boss): multiply the boss poise damage by the hard bone talent`

---

#### T58: Trincas na barra de postura

**What**: com Osso Duro Nv ≥ 2, a `BossBarOverlay` desenha `cracks(crackCount(poise, max))` (traços `w`) e as trincas
somem quando a postura volta; `boss.poiseBar.cracks`.
**Where**: `src/game/BossBarOverlay.ts`
**Depends on**: T57, T37
**Reuses**: `crackCount` (T48)
**Requirement**: TLV-06, TLV-20
**Modelo**: Sonnet (Opus 5.5 na conferência)
**Escopo**: 1 desenho na vista

**Done when**:

- [ ] `talents-2.smoke.mjs`: `cracks` 1, 2, 3 a 75, 50, 25% e 0 depois da regeneração, lido da vista viva
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(hud): crack the boss poise bar with the hard bone talent`

---

#### T59: Chefe caído do Osso Duro Nv 3

**What**: `staggerMul` (padrão 1) no `beginStagger('poise', …)` do cérebro; o `Boss` ganha `staggerMul` e `lying` (o
sprite do `stagger` com `setAngle(−90 × facing)`; o `AffixOutline` copia o ângulo, +1); com Nv 3 a quebra de postura
dá 1,5× `staggerMs`, deitado, finalizador armado como hoje, evento `bossDown` e `talent:ossoDuro`.
**Where**: `src/game/Boss.ts`
**Depends on**: T57
**Reuses**: `beginStagger`, `AffixOutline` (F32)
**Requirement**: TLV-07, TLV-18
**Modelo**: Sonnet (Opus 5.5 na conferência)
**Escopo**: ⚠️ coeso: 2 campos do mesmo estado (`staggerMul`, `lying`) + o repasse ao cérebro

**Done when**:

- [ ] `bossPoiseMul.test.ts`: `stagger` de postura dura 1,5× com `staggerMul`
- [ ] `talents-2.smoke.mjs`: `bossDown`, ângulo −90 × `facing` no sprite vivo dos dois lados, finalizador armado
- [ ] `Boss.ts` abaixo de 380 efetivas (senão o deitado sai para `game/boss/BossPosture.ts`); smokes `boss`,
      `finisher` verdes; gate verde

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(boss): knock the boss down with the hard bone talent`

---

#### T60: Talentos na loja e conferência

**What**: as 5 entradas de talento no fim do `GAME_SHOP_CATALOG` (se `shop.ts` passar de 380 efetivas, nasce
`data/shopLeva2.ts` espalhado no fim); `README.md` com os 5 ids do `perks=` e os eventos `talent:<id>`, `bossDown`;
conferência em HD dos sinais dos 5 talentos.
**Where**: `src/data/shop.ts`
**Depends on**: T56, T58, T59, T50, T52, T54
**Reuses**: entradas de talento da F35
**Requirement**: TLV-01, TLV-18, TLV-21, LVX-07
**Modelo**: Opus 5.5 ou Fable (conferência)
**Escopo**: 5 entradas de tabela + a linha do README

**Done when**:

- [ ] `tests/data/shopLeva2.test.ts` (novo): os 5 talentos no fim do catálogo, na ordem do TLV-01
- [ ] Smoke `shop`: os 5 talentos aparecem numa run com seed por 15 rodadas; `talents-2.smoke.mjs` completo verde
- [ ] Sinais (poeira, círculo, marca, número verde, trincas, chefe deitado) conferidos em HD em movimento, dois lados
- [ ] Gate verde

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(shop): sell the leva 2 talents`

---

### Phase 11: F41b passo 5 — ドン e fechamento da F41b

#### T61: Portão do ドン

**What**: `class DonGate { shouldDraw(c: { tier; heavy; knockedDown; bossDown; swingId }): boolean }`: patamar 3, golpe
forte do moveset, comum derrubado ou chefe derrubado pela Osso Duro Nv 3, uma vez por `swingId`.
**Where**: `src/core/don.ts`
**Depends on**: None
**Reuses**: patamar de força (`core/power.ts`, F29)
**Requirement**: DON-01, DON-05
**Modelo**: Sonnet
**Escopo**: 1 classe

**Done when**:

- [ ] `tests/core/don.test.ts` (novo): patamar 2 não, patamar 3 sim; dois derrubados no mesmo `swingId` dão um; golpe
      fraco não
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the don onomatopoeia gate`

---

#### T62: Folha da onomatopeia

**What**: folha `onomatopoeia` com `don` (ドン, 32×20 texels, `w` com contorno `k` e sombra `r`) e `crack-0`/`crack-1`
(48×6 texels, `k`/`K`), só `PALETTE`.
**Where**: `src/game/art/hd/onomatopoeia.ts`
**Depends on**: None
**Reuses**: `HdSheet`, `registerHdSheets`
**Requirement**: DON-03, DON-06, LVX-06
**Modelo**: Opus 5.5 ou Fable
**Escopo**: 1 folha

**Done when**:

- [ ] `tests/game/art/onomatopoeia.test.ts` (novo): 3 quadros, tamanhos, só `PALETTE`
- [ ] Prancha `tools/hd-boards.mjs` olhada antes do commit; gate verde

**Tests**: unit + prancha
**Gate**: quick
**Commit**: `feat(art): draw the don onomatopoeia and ground crack`

---

#### T63: ドン no jogo

**What**: `DonFx.play(hitPoint, groundY)`: rachadura na linha do chão por 1500 ms (alfa cai nos últimos 300) e o ドン
subindo 12 px em 600 ms apagando, os dois por `cursedFx.track` e só com `canSpawnParticle`; o `impactFx.onMeleeImpact`
pergunta ao `DonGate` (+3, sem ramo novo de topo) e o `bossDown` da T59 chama o mesmo caminho; evento `don` no
`README.md`.
**Where**: `src/game/DonFx.ts`
**Depends on**: T61, T62, T59
**Reuses**: `CursedFx.track`, `canSpawnParticle` (`fxCap` 40)
**Requirement**: DON-01, DON-02, DON-03, DON-04, DON-06, LVX-07
**Modelo**: Opus 5.5 ou Fable
**Escopo**: 1 vista + a chamada do impacto

**Done when**:

- [ ] `power.smoke.mjs` estendido: `mods=forca:5&arsenal=manoplas,manoplas,manoplas` + golpe forte que derruba solta
      `don` uma vez; `mods=forca:5` (patamar 2) não solta; com o `fxCap` cheio o acerto aplica sem desenho
- [ ] Conferência em HD: golpe forte derrubando nos dois lados
- [ ] Smokes `power`, `impact`, `feel` verdes; gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(fx): crack the ground with a don on tier 3 knockdowns`

---

#### T64: Fechamento da F41b

**What**: conferência da sub-fase (contagens do LVX, smokes da F41b e os antigos do sistema) e a seção F41b do
`validation.md` pelo Verifier.
**Where**: `.specs/features/leva-2/validation.md`
**Depends on**: T63
**Reuses**: T32
**Requirement**: LVX-01, LVX-02, LVX-04
**Modelo**: Opus 5.5 ou Fable (Verifier)
**Escopo**: 1 documento de validação

**Done when**:

- [ ] Smokes `void-domain`, `domain-veil`, `talents-2`, `power`, `boss`, `defense`, `heal`, `tech`, `shop` verdes
- [ ] Contagens no `validation.md`; gate verde

**Tests**: smoke
**Gate**: build
**Commit**: `docs(specs): validate the leva 2 domain and talents sub-phase`

---

### Phase 12: F41c passos 0 e 1 — arte e regra do Osso de Dragão

#### T65: Marcador de cinco cargas

**What**: o marcador `charge` da folha `weapon-fx-osso-*` passa a ter os quadros `charge-0a` a `charge-5b` (as 3 lascas
de hoje mais 2, brasas `a`/`A`), no molde do arquivo.
**Where**: `src/game/art/hd/weaponFx/bone.ts`
**Depends on**: None
**Reuses**: marcador de 3 lascas (`wt-armas`)
**Requirement**: OSS-07, LVX-06
**Modelo**: Opus 5.5 ou Fable
**Escopo**: 1 folha

**Done when**:

- [ ] Teste da folha de efeito das armas: quadros `charge-0a` a `charge-5b`, só `PALETTE`
- [ ] Prancha com o marcador de 0 a 5 em sequência olhada antes do commit; gate verde

**Tests**: unit + prancha
**Gate**: quick
**Commit**: `feat(art): extend the dragon bone charge marker to five`

---

#### T66: Ícones `bound-bone` e `bound-finger`

**What**: grade `BONE` (osso curvo com brasa) como `'bound-bone'` e grade `FINGER` (dedo seco `p`/`P`/`q` com unha `r`)
como `'bound-finger'` no `HD_WEAPONS`, para a `BuildBar`.
**Where**: `src/game/art/hd/weapons.ts`
**Depends on**: None
**Reuses**: `bound-spear` (F36)
**Requirement**: OSS-11, DED-07, LVX-06
**Modelo**: Opus 5.5 ou Fable
**Escopo**: 2 grades no mesmo arquivo

**Done when**:

- [ ] `tests/game/hdWeapons.test.ts`: as 2 folhas novas, só `PALETTE`
- [ ] Prancha olhada antes do commit; `weapons.ts` abaixo de 400 efetivas; gate verde

**Tests**: unit + prancha
**Gate**: quick
**Commit**: `feat(art): draw the bone and finger build bar icons`

---

#### T67: Regra das cargas do Osso

**What**: `class BoneCharges { gain(cap): boolean; release(): number; reset(); charges; full(cap): boolean }` (teto
3/4/5, com 5 continua 5); `releaseMul(charges, soltura, full) = 1 + k × (0,25 + 0,25 × soltura)` com `k = charges +
(full ? 1 : 0)`; `estopimTargets(center, commons, radiusPx)`; `estopimDamage(charges, hpMul) = round(3 × charges ×
hpMul)` (o Estopim conta as cargas gastas, sem o bônus).
**Where**: `src/core/dragonBone.ts`
**Depends on**: None
**Reuses**: nada (regra pura)
**Requirement**: OSS-03, OSS-04, OSS-05
**Modelo**: Sonnet
**Escopo**: 1 classe + 3 funções da mesma regra

**Done when**:

- [ ] `tests/core/dragonBone.test.ts` (novo): teto 3/4/5; 5 continua 5; `releaseMul` com 0 a 2 de soltura; no teto 3,
      2 cargas dão `k` 2 (1,5) e 3 cargas dão `k` 4 (2,0), `full` falso e verdadeiro nos dois lados; Estopim 60 px
      dentro e 61 fora, 90/91 com 2 pontos
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the dragon bone charge rule`

---

#### T68: Dados do Osso de Dragão

**What**: `WeaponId` + `'osso'` (`Osso de Dragão`, `lutador`, último do `ARSENAL` em `data/arsenal.ts`); `OssoAxisId`
`cargas | soltura | estopim`; `WEAPON_TRAIT.osso = 'heavy'`; `WEAPON_ICON.osso = 'bound-bone'`; `WEAPON.osso` com os
números do design. Sem entrada no catálogo (T73).
**Where**: `src/data/weapons.ts`
**Depends on**: None
**Reuses**: as 3 armas da F36
**Requirement**: OSS-01, OSS-02
**Modelo**: Sonnet
**Escopo**: ⚠️ coeso: a entrada da arma nas 2 tabelas que a definem

**Done when**:

- [ ] Teste de dados das armas (F36): eixos na ordem, traço, ícone, números
- [ ] `arsenal=osso` aceito pelo parser genérico; gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(data): add the dragon bone weapon`

---

#### T69: Traço e resolução do Osso

**What**: `weaponStrikeMul` com o traço do Osso (forte sem `counter`, ×1,2) e `resolveWeapon('osso', ...)` com
`chargeCap`, `soltura`, `estopimPx`.
**Where**: `src/core/weaponStats.ts`
**Depends on**: T67, T68
**Reuses**: `weaponStats` (F36)
**Requirement**: OSS-02, OSS-13
**Modelo**: Sonnet
**Escopo**: 1 entrada de 2 funções do mesmo arquivo

**Done when**:

- [ ] `tests/data/weaponBalance.test.ts` (F36): o Osso no WPN-05 com 1 carga a cada 5000 ms, gastando cada carga no
      forte seguinte e juntando até o teto, com 0 a 2 pontos de Cargas; se reprovar, a base `perCharge` (ou o
      `fullBonus`) é recalibrada e registrada no design no mesmo commit
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): resolve the dragon bone trait and axes`

---

### Phase 13: F41c passos 1 e 2 — Osso no jogo e Dragão Refletido

#### T70: Dano do player repassado com o tipo

**What**: o `Player.onDamaged` (hoje só do `TechCaster`) vira um repasse do `combat` para os dois ouvintes (`TechCaster`
e arma), com o tipo `hit` ou `chip`; custo de voto e chip de guarda não chegam como `hit`. Nada muda no jogo.
**Where**: `src/scenes/test/combat.ts`
**Depends on**: None
**Reuses**: `onDamaged` (`src/game/TechCaster.ts:37`)
**Requirement**: OSS-03
**Modelo**: Sonnet
**Escopo**: 1 repasse

**Done when**:

- [ ] Smokes `tech` (golpe tomado cancela a conjuração), `defense`, `vows` verdes e iguais
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `refactor(combat): fan out the player damage with its kind`

---

#### T71: Cargas do Osso no jogo

**What**: `scenes/test/ossoCharges.ts` (ligado pelo `weaponDirector`): `onDefense('parry' | 'deflect')` e
`onPlayerDamaged('hit')` → `gain`, evento `ossoCharge:<n>`; cargas entre rodadas e zero no reset e no abandono;
marcador acima da cabeça alternando `a`/`b` a cada 150 ms pelo `WeaponFx.marker(charges)`, escondido com 0;
`arsenal.weaponCharges` no `arsenalSnapshot.ts`; `README.md` com o evento.
**Where**: `src/scenes/test/ossoCharges.ts`
**Depends on**: T70, T69, T65
**Reuses**: `weaponDirector.onDefense` (F36), `BoneCharges` (T67)
**Requirement**: OSS-03, OSS-06, OSS-07, OSS-12, LVX-03, LVX-07
**Modelo**: Sonnet (Opus 5.5 na conferência do marcador)
**Escopo**: 1 módulo do diretor + o campo de snapshot que o prova

**Done when**:

- [ ] `scripts/smoke/dragon-bone.smoke.mjs` (novo, `arsenal=osso`): parry e golpe tomado sobem `weaponCharges`; chip
      de guarda e voto não; teto 3 sem pontos; cargas atravessam a konbini; quadro vivo do marcador `charge-<n>a/b`
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(weapon): charge the dragon bone with defense and damage`

---

#### T72: Soltura e Estopim

**What**: o `strikeMods` do Osso, num forte sem `counter` com carga, multiplica o dano pelo `releaseMul` (cheia com as
cargas no teto, com o patamar `decisive` forçado pela porta da F29) e marca o `swingId`; o `onMeleeHit` desse `swingId` zera as cargas uma vez, toca `weapon-fx-osso-impact` e empurra
`ossoRelease:<n>`; golpe que erra não gasta; com Estopim, cada outro comum vivo no raio leva um normal de
`estopimDamage` com `knockdown` (o chefe não).
**Where**: `src/scenes/test/ossoCharges.ts`
**Depends on**: T71
**Reuses**: `weaponDirector.strikeMods`/`onMeleeHit`, `WeaponFx.trail/impact` (F36)
**Requirement**: OSS-04, OSS-05, OSS-08
**Modelo**: Sonnet
**Escopo**: 1 comportamento

**Done when**:

- [ ] `dragon-bone.smoke.mjs`: forte com 2 cargas (teto 3) tira `dano × 1,5`; com 3 cargas (cheia) tira `dano × 2,0`
      com patamar `decisive`; golpe de 2 alvos zera uma vez; erro não gasta;
      Estopim derruba o comum a 60 px e poupa o de 61; rastro e impacto do Osso no golpe do traço
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(weapon): release the dragon bone charges on a heavy strike`

---

#### T73: Osso na loja e conferência

**What**: a entrada do Osso no fim do `GAME_SHOP_CATALOG` (preço, travas e carta do WSH-02 a WSH-04); `README.md` com
`arsenal=osso`, `axes=osso.<eixo>:<n>` e `ossoRelease:<n>`; conferência em HD do marcador, do rastro e do impacto.
**Where**: `src/data/shop.ts`
**Depends on**: T72
**Reuses**: entradas de arma da F36
**Requirement**: OSS-01, OSS-12, OSS-14, LVX-07
**Modelo**: Opus 5.5 ou Fable (conferência)
**Escopo**: 1 entrada + a linha do README

**Done when**:

- [ ] `shopLeva2.test.ts`: o Osso depois dos talentos no fim do catálogo, com o preço da arma
- [ ] Smokes `shop`, `weapon-imbued`, `dragon-bone` verdes; o Osso aparece na loja com a trava de rodada
- [ ] Marcador acima da cabeça correndo, soltura com rastro e impacto conferidos em HD, dois lados
- [ ] Gate verde

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(shop): sell the dragon bone weapon`

---

#### T74: Receita do Dragão Refletido

**What**: receita `{ type: 'evolucao', id: 'dragaoRefletido', name: 'Dragão Refletido', text, hint: 'Dragão', pieces:
[arma osso 4, talento refluxo 1], cost: 60 }` depois das evoluções de arma da F37; linha da tabela "Regra de combo".
**Where**: `src/data/evolutions.ts`
**Depends on**: T73
**Reuses**: `RECIPES` (F37)
**Requirement**: OSS-09
**Modelo**: Sonnet
**Escopo**: 1 entrada de tabela

**Done when**:

- [ ] `tests/data/combos.test.ts` (F37): nome, texto e dica únicos
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(data): add the reflected dragon weapon evolution`

---

#### T75: Dragão Refletido no parry

**What**: com a evolução, `parry`/`deflect` com as cargas no teto contra atacante vivo (`combat.attackerOf`) → decide
antes do `gain` (não soma carga) e solta um acerto de `MOVES.contra.damage × meleeMul × releaseMul(charges, soltura,
true)` com o Estopim, cargas a 0, `ossoRelease:<n>`; abaixo do teto o parry só carrega; `evo=dragaoRefletido` pelo
F37.
**Where**: `src/scenes/test/ossoCharges.ts`
**Depends on**: T74
**Reuses**: soltura (T72)
**Requirement**: OSS-10, OSS-12, OSS-14
**Modelo**: Sonnet (Opus 5.5 na conferência)
**Escopo**: 1 comportamento

**Done when**:

- [ ] `dragon-bone.smoke.mjs` com `evo=dragaoRefletido`: parry com 2 cargas (teto 3) só carrega (`ossoCharge:3`, sem
      `ossoRelease`); o parry seguinte, no teto, tira do atacante o dano do Contra × 2,0 e zera, sem `ossoCharge` antes;
      atacante morto nada
- [ ] Conferência em HD da soltura no parry, dois lados; gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(weapon): release the bone charges on a parry with the reflected dragon`

---

### Phase 14: F41c passo 3 — Dedos de Sukuna e fechamento da F41c

#### T76: Dados dos Dedos

**What**: `RelicId` + `'dedos'` (`Dedos de Sukuna`, `lutador`); `ARSENAL_TUNING.relicMax = { dedos: 5 }` (as outras 3)
e `shopMax = { dedos: 3 }`; `FINGERS = { dmgStep: 0.06, takenStep: 0.08, bearerBase: 0.10, bearerStep: 0.08, auraFrom:
3, price: { first: 20, base: 16, step: 6 } }`. Sem entrada no catálogo (T83).
**Where**: `src/data/arsenal.ts`
**Depends on**: None
**Reuses**: relíquias da F36
**Requirement**: DED-01
**Modelo**: Sonnet
**Escopo**: 1 entrada de tabela

**Done when**:

- [ ] `tests/data/fingers.test.ts` (novo): números linha a linha, preço 20 / `16 + 6 × dedos` e rodadas 2/4/6 da
      relíquia
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(data): add the sukuna fingers relic`

---

#### T77: Nível máximo e oferta da relíquia

**What**: `relicMaxLevel(id)`, `shopMaxLevel(id)`, `relicPrice(id, level)` (Dedos 20, 22, 28; as outras relíquias com
o `relicCost` de hoje); `buy` sobe até o máximo (o debug chega a 5); `arsenalEligible` oferece só abaixo do
`shopMaxLevel`; `raise('dedos')` para a vitória.
**Where**: `src/core/arsenal.ts`
**Depends on**: T76
**Reuses**: `Arsenal` (F36)
**Requirement**: DED-02, DED-09
**Modelo**: Sonnet
**Escopo**: 3 funções pequenas da mesma classe

**Done when**:

- [ ] `tests/core/arsenalFingers.test.ts` (novo; `arsenal.test.ts` não cresce): loja oferece Nv 1 a 3 e nunca 4; preço
      20, 22, 28 antes da inflação e Manoplas 20, 32, 44 sem mudança; `buy` × 6 para no 5; `raise` do 3 vai a 4 e do 5
      fica
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): cap the relic level by source`

---

#### T78: Multiplicadores dos Dedos

**What**: entrada `fingers` no `buildEffects`; `meleeMul` e `techMul` × `1 + 0,06 n`, `damageTakenMul` × `1 + 0,08 n`;
nenhum `damageMul` escrito à mão fora daqui.
**Where**: `src/core/buildEffects.ts`
**Depends on**: T76
**Reuses**: `buildEffects` (F35)
**Requirement**: DED-03
**Modelo**: Sonnet
**Escopo**: 1 entrada da função

**Done when**:

- [ ] `buildEffectsLeva2.test.ts`: Dedos 0 a 5 (1,30 e 1,40 no 5)
- [ ] `tests/data/relicBalance.test.ts` (novo): no Nv 3, modelo misto Dedos 1,18 acima de Manoplas e Rosário (1,15);
      só golpe abaixo das Manoplas (1,30); só técnica abaixo do Rosário (1,30)
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): scale damage dealt and taken by the sukuna fingers`

---

#### T79: Chance do Portador com os Dedos

**What**: `drawLineup(rng, round, rules, finger, fingers = 0)` com a chance `0,10 + 0,08 × fingers` a partir da r10 e o
mesmo `next()` com qualquer número; `BossLineups.lineupFor(rng, round, o, fingers)` guarda o resultado no 1º pedido.
**Where**: `src/core/bossAffix.ts`
**Depends on**: T76
**Reuses**: `drawLineup`, `BossLineups` (F32)
**Requirement**: DED-04
**Modelo**: Sonnet
**Escopo**: 1 parâmetro em 2 funções do mesmo sorteio

**Done when**:

- [ ] `tests/core/bossLineupFingers.test.ts` (novo): chance com 0 e 3 dedos na r10 e nada na r9; o stream consumido é o
      mesmo com qualquer número de dedos; 2º pedido devolve o guardado
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): raise the finger bearer chance with the held fingers`

---

#### T80: Dedo na vitória sobre o Portador

**What**: `arsenalDirector.onBossDefeated(spec)`: `spec.finger` com Dedos no Nv 3 ou 4 → `raise`, banner `Dedo de Sukuna
<n>/5`, evento `finger:<n>`, `stats.sync()`; Nv 5 ou abaixo de 3 → nada; chamado pelo `spawner.onBossDefeated`;
`README.md` com o evento e `arsenal=dedos` × n.
**Where**: `src/scenes/test/arsenalDirector.ts`
**Depends on**: T77, T78, T79
**Reuses**: `spawner.onBossDefeated`, banner de hoje
**Requirement**: DED-05, DED-09, LVX-07
**Modelo**: Sonnet
**Escopo**: 1 método do diretor

**Done when**:

- [ ] `scripts/smoke/sukuna-fingers.smoke.mjs` (novo): `arsenal=dedos,dedos,dedos` + Portador vencido → `relicLevel` 4,
      banner e `finger:4`; com 5 nada; com 2 nada; dano dado e tomado batem com 1,24/1,32 no Nv 4
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(arsenal): grow the fingers by defeating a finger bearer`

---

#### T81: Aura vermelha e preta dos Dedos

**What**: `auraLook(stage, fingers)` → estágio pelo menos 1 e cores `r`/`b` com 3 dedos ou mais; a `BuildAura` lê (+4).
**Where**: `src/core/buildAura.ts`
**Depends on**: T76
**Reuses**: `buildAura` (AUR-03)
**Requirement**: DED-06, LVX-06
**Modelo**: Sonnet (Opus 5.5 na conferência)
**Escopo**: 1 função + a leitura na vista

**Done when**:

- [ ] Teste da aura: 2 dedos dá a aura de hoje, 3 dá `r`/`b` no estágio ≥ 1
- [ ] `sukuna-fingers.smoke.mjs`: cor viva da aura com 3 dedos; conferência em HD; gate verde

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(aura): tint the build aura with three sukuna fingers`

---

#### T82: Barra da build e carta dos Dedos

**What**: `Relíquia Nv<n>` com 5 pontinhos para os Dedos e o ícone `bound-finger` na `BuildBar`; a carta lê `Dano +6%
sofre +8%` do nível que dá e `Portador <p>%` (`0,10 + 0,08 × n` com o nível da carta: 18, 26, 34).
**Where**: `src/core/buildTray.ts`
**Depends on**: T77, T66
**Reuses**: `buildTray`, `BuildBar` (F35)
**Requirement**: DED-07
**Modelo**: Sonnet
**Escopo**: 1 texto de bandeja + o ícone que a vista lê

**Done when**:

- [ ] Teste do `buildTray`: 5 pontinhos e o texto por nível, com a chance do Portador (18, 26, 34)
- [ ] `sukuna-fingers.smoke.mjs`: quadro vivo `bound-finger` na `BuildBar`; gate verde

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(build): show the sukuna fingers level on the build bar`

---

#### T83: Dedos na loja e abandono

**What**: a entrada dos Dedos no fim do `GAME_SHOP_CATALOG` (relíquia, Nv 1 a 3); abandono pelo ABD-02 com o 4º e o 5º
como fontes grátis, multiplicadores e chance do Portador de volta.
**Where**: `src/data/shop.ts`
**Depends on**: T80, T81, T82
**Reuses**: ABD-02 (F35)
**Requirement**: DED-01, DED-02, DED-08
**Modelo**: Sonnet
**Escopo**: 1 entrada + o caso de abandono no smoke

**Done when**:

- [ ] `shopLeva2.test.ts`: os Dedos depois do Osso no fim do catálogo, como relíquia
- [ ] `sukuna-fingers.smoke.mjs`: a loja oferece Nv 1 a 3 e nunca 4, ao preço 20, 22, 28 com a inflação da rodada;
      abandono com 5 devolve só o preço dos 3 comprados e zera os multiplicadores
- [ ] Smoke `shop` verde; gate verde

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(shop): sell the sukuna fingers relic`

---

#### T84: Fechamento da F41c

**What**: conferência da sub-fase (contagens do LVX, smokes da F41c e os antigos) e a seção F41c do `validation.md`.
**Where**: `.specs/features/leva-2/validation.md`
**Depends on**: T75, T83
**Reuses**: T32
**Requirement**: LVX-01, LVX-02, LVX-04
**Modelo**: Opus 5.5 ou Fable (Verifier)
**Escopo**: 1 documento de validação

**Done when**:

- [ ] Smokes `dragon-bone`, `sukuna-fingers`, `weapon-imbued`, `arsenal`, `shop`, `boss` verdes
- [ ] Contagens no `validation.md`; gate verde

**Tests**: smoke
**Gate**: build
**Commit**: `docs(specs): validate the leva 2 arsenal sub-phase`

---

### Phase 15: F41d passo 0 — `BossArmor` neutro e dados dos afixos

#### T85: Regra da armadura do chefe

**What**: `class BossArmor { constructor({ layers, shieldMax }); layers; shield; shieldMax; suspended; resolve(damage,
breaks): { damage; events }; update(dtMs, hitThisFrame) }`; `resolve` na ordem: com `breaks` e camada quebra 1
(`layerBreak:<restantes>`); reduz por `1 − 0,15 × camadas` (arredondado, mínimo 1) se não suspenso; o escudo absorve
antes se não suspenso (`shieldBreak` a 0); `update` regenera 10% do máximo por segundo depois de 3000 ms sem dano,
parado se suspenso. Com `{ 0, 0 }` devolve o dano igual.
**Where**: `src/core/bossArmor.ts`
**Depends on**: None
**Reuses**: nada (regra pura)
**Requirement**: PDR-01, PDR-02, SOB-02, SOB-03
**Modelo**: Sonnet
**Escopo**: 1 classe

**Done when**:

- [ ] `tests/core/bossArmor.test.ts` (novo): camadas 3 → 0, uma por acerto, nunca voltam; redução 0,55/0,70/0,85 com
      mínimo 1; escudo antes da vida e golpe maior que o escudo; regeneração aos 2999 não e aos 3000 sim; suspensão sem
      redução, sem absorção, sem regeneração e com as camadas; neutro devolve igual
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the boss armor rule for layers and shield`

---

#### T86: `applyDamage` do chefe reordenado com a armadura neutra

**What**: `bossBrain` ganha `armor` (padrão neutro) e `applyDamage(damage, poiseDamage, breaksLayer = false)`: postura
primeiro; `breaks = breaksLayer || (poiseAntes > 0 && poiseDepois <= 0)`; `damage = armor.resolve(damage, breaks)`;
vida, fase, morte e `stagger` como hoje; `receiveKokusen` e o finalizador passam `breaksLayer = true`. Nada muda no
jogo.
**Where**: `src/core/bossBrain.ts`
**Depends on**: T85
**Reuses**: `applyDamage` (`src/core/bossBrain.ts:150-175`)
**Requirement**: PDR-02, SOB-02
**Modelo**: Sonnet
**Escopo**: 1 método reordenado

**Done when**:

- [ ] `tests/core/bossBrainArmor.test.ts` (novo; `bossBrain.test.ts` não cresce): com a postura a 1 o golpe que a zera
      quebra a camada antes do dano; com a postura já a 0 não; Kokusen e finalizador quebram; armadura neutra dá o dano
      de hoje
- [ ] Smokes `boss`, `kokusen`, `finisher`, `boss-punish` verdes e iguais; gate verde

**Tests**: unit + smoke
**Gate**: full
**Commit**: `refactor(boss): route boss damage through a neutral armor`

---

#### T87: Marca `breaksLayer` no golpe

**What**: `Hit.breaksLayer?: boolean` e a função pura `breaksLayerFor(move, tier)` (Contra que acerta e golpe forte do
moveset com patamar de força ≥ 2); o `StatsDirector.strikeMods` põe a marca; o `Boss.receiveHit` a repassa ao cérebro.
**Where**: `src/core/hit.ts`
**Depends on**: T86
**Reuses**: AD-021 (marca decidida por quem cria o `Hit`), patamar (`core/power.ts`)
**Requirement**: PDR-02
**Modelo**: Sonnet
**Escopo**: ⚠️ coeso: 1 campo + a função que o decide + o repasse de 1 linha

**Done when**:

- [ ] `tests/core/breaksLayer.test.ts` (novo): Contra sim, forte com patamar 1 não e 2 sim, leve nunca
- [ ] Smokes `fight`, `power` verdes e iguais (armadura neutra); gate verde

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(combat): mark the strikes that break a boss layer`

---

#### T88: 1º acerto do Despertar quebra camada

**What**: `TechRunner.lastCast(techId)` → `{ castId, awakened }` (genérico, sem nome de técnica); o `bossDirector`
expõe `castKey(techId)` ao `Boss.receiveHit`, que marca `breaksLayer` no 1º acerto não chip de cada `castId` com
Despertar ligado.
**Where**: `src/game/TechRunner.ts`
**Depends on**: T86
**Reuses**: `TechRunner` (F34)
**Requirement**: PDR-02
**Modelo**: Sonnet
**Escopo**: 1 método genérico + a porta que o lê

**Done when**:

- [ ] `tests/game/techRunnerLastCast.test.ts` (novo, dublês): `lastCast` devolve o cast vivo e o `awakened`;
      `techRunnerSource.test.ts` verde
- [ ] Smoke `tech` verde e igual; gate verde

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(tech): expose the last cast to the boss layer rule`

---

#### T89: Os quatro afixos e os pares

**What**: `BossAffixId` + `enfurecido`, `couraca`, `sobrecarregado`, `pele`; nomes m/f; contorno `R`, `S`, `null` e a
rampa `['z', 'a', 'A']`; glifo `R`, `S`, `c`, `A`; fora do pool leve; `incompatible: [['adaptativo', 'pele'],
['couraca', 'sobrecarregado']]`; `BOSS_AFFIX` com os números do design.
**Where**: `src/data/bossAffixes.ts`
**Depends on**: None
**Reuses**: formato dos afixos da F32
**Requirement**: AF2-01, AF2-02, LVX-06
**Modelo**: Sonnet
**Escopo**: 1 tabela

**Done when**:

- [ ] `tests/core/bossAffixLeva2.test.ts` (novo): números linha a linha; em 1000 seeds no tier 5 nenhum lineup com os
      dois de um par (BLN-07); fora do pool leve
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(data): add the leva 2 boss affixes`

---

### Phase 16: F41d passos 1 a 4 — afixos no chefe e fechamento da F41d

#### T90: Enfurecido

**What**: `bossTuningFor` aplica `phases[].restMs × 0,8` arredondado e `chainEvery: 3`; o `bossAI` conta as voltas do
ciclo (zera na troca de fase) e, no fim do 1º ataque da 3ª, 6ª, 9ª volta, descansa só o `minRestMs` do pouso; o
descanso × 0,8 respeita o piso `minRestMs`.
**Where**: `src/core/bossAI.ts`
**Depends on**: T89
**Reuses**: `enterRestAfterAttack(minRestMs)` (F32)
**Requirement**: ENF-01, ENF-02, AF2-03
**Modelo**: Sonnet
**Escopo**: ⚠️ coeso: 1 contador na IA + a linha da tuning que o liga

**Done when**:

- [ ] `bossAffixLeva2.test.ts`: descanso × 0,8 com o piso; 3ª volta sem descanso entre os 2 primeiros ataques; contador
      zera na troca de fase
- [ ] `scripts/smoke/boss-affix-2.smoke.mjs` (novo, `bossAffix=enfurecido`): o descanso medido cai; gate verde

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(boss): add the enraged affix`

---

#### T91: Contorno com a rampa da Pele

**What**: `outlineKeyAt(affixes, ms, layers)` com a rampa da Pele por camadas restantes e sem contorno da Pele sem
camada; o `AffixOutline` lê o `layers`.
**Where**: `src/core/bossAffix.ts`
**Depends on**: T90
**Reuses**: `outlineKeyAt`, `AffixOutline` (F32)
**Requirement**: AF2-04, PDR-03
**Modelo**: Sonnet (Opus 5.5 na conferência)
**Escopo**: 1 função

**Done when**:

- [ ] `bossAffixLeva2.test.ts`: contorno `R`/`S` do Enfurecido e da Couraça; rampa `z`/`a`/`A` com 1/2/3 camadas e
      nada com 0; alternância com 2 afixos de contorno
- [ ] `boss-affix-2.smoke.mjs`: cor viva do contorno; gate verde

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(boss): ramp the dragon skin outline by layers`

---

#### T92: Couraça

**What**: `bossTuningFor` com Couraça: `poise.max × 1,5` e `regenPerSec × 2` (atraso igual).
**Where**: `src/core/bossAffix.ts`
**Depends on**: T90
**Reuses**: `bossTuningFor` (F32)
**Requirement**: COU-01, AF2-03
**Modelo**: Sonnet
**Escopo**: 1 entrada da função

**Done when**:

- [ ] `bossAffixLeva2.test.ts`: teto 1,5× e regeneração 2× com o atraso igual
- [ ] `boss-affix-2.smoke.mjs` (`bossAffix=couraca`): `boss.poiseBar.max` 1,5× o do tier; gate verde

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(boss): add the armored affix`

---

#### T93: Sobrecarregado: vida e escudo

**What**: `bossSpecFor` com Sobrecarregado → `maxHp = round(0,6 × maxHp)` e `shieldMax = round(0,4 × maxHp)` sobre o
HP que teria (com o Portador); `armorSpecFor(spec)` passa o `shieldMax` ao `BossArmor`; evento `shieldBreak` no
`README.md`.
**Where**: `src/core/bossTier.ts`
**Depends on**: T90, T86
**Reuses**: `bossSpecFor` (F32), `BossArmor` (T85)
**Requirement**: SOB-01, SOB-02, SOB-03, AF2-03, LVX-07
**Modelo**: Sonnet
**Escopo**: 1 entrada de spec + o repasse ao cérebro

**Done when**:

- [ ] `bossAffixLeva2.test.ts`: vida 60% e escudo 40% arredondados, com e sem Portador
- [ ] `boss-affix-2.smoke.mjs` (`bossAffix=sobrecarregado`): golpe tira do escudo antes da vida; maior que o escudo
      zera e passa o resto; `shieldBreak`; 3 s sem dano regenera; gate verde

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(boss): add the overcharged affix shield`

---

#### T94: Escudo na barra do chefe

**What**: com escudo, a `BossBarOverlay` pinta por cima a barra inteira: vida em `hp / (maxHp + shieldMax)` na cor da
barra do `Hud` (constante exportada) e o escudo logo depois em `c`; `boss.shield` no `bossSnapshot.ts`.
**Where**: `src/game/BossBarOverlay.ts`
**Depends on**: T93
**Reuses**: `BossBarOverlay` (T37)
**Requirement**: SOB-04, LVX-03
**Modelo**: Sonnet (Opus 5.5 na conferência)
**Escopo**: 1 desenho + o campo de snapshot que o prova

**Done when**:

- [ ] `boss-affix-2.smoke.mjs`: larguras vivas da vida e do escudo batem com a conta; `boss.shield.value/max`
- [ ] `Hud.ts` sem linha; conferência em HD; gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(hud): draw the boss shield on the boss bar`

---

#### T95: Pele de Dragão

**What**: `armorSpecFor(spec)` com Pele → `layers: 3`; eventos `layerBreak:<n>`; `boss.layers` no `bossSnapshot.ts` (0
sem Pele); `README.md` com o evento.
**Where**: `src/core/bossAffix.ts`
**Depends on**: T91, T87, T88
**Reuses**: `BossArmor` (T85), marcas das T87 e T88
**Requirement**: PDR-01, PDR-02, PDR-04, LVX-07
**Modelo**: Sonnet
**Escopo**: 1 entrada da função + o campo de snapshot

**Done when**:

- [ ] `bossAffixLeva2.test.ts`: `armorSpecFor` com e sem Pele
- [ ] `boss-affix-2.smoke.mjs` (`bossAffix=pele`): `layers` 3; leve tira dano × 0,55 e não quebra; Contra quebra 1;
      Contra com patamar 2 quebra 1 só; Kokusen quebra; 1º acerto de Despertar quebra e o 2º não; gate verde

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(boss): add the dragon skin affix layers`

---

#### T96: Suspensão dos afixos novos

**What**: o `bossDirector.update` grava `suspended` na IA (tuning de base), no cérebro (`useBasePoise(on)`: teto e
regeneração normais, postura atual presa no teto normal) e no `BossArmor` (sem redução, sem absorção, sem regeneração;
camadas ficam) enquanto o Arsenal de Toji suspende.
**Where**: `src/scenes/test/bossDirector.ts`
**Depends on**: T92, T94, T95
**Reuses**: `AffixSuppression`, `Boss.affixesSuppressed` (F36)
**Requirement**: AF2-05
**Modelo**: Sonnet
**Escopo**: 1 repasse aos 3 donos do estado

**Done when**:

- [ ] `bossBrainArmor.test.ts`: `useBasePoise` prende a postura no teto normal
- [ ] `boss-affix-2.smoke.mjs` com o Arsenal de Toji: 3 s sem absorção nem redução, camadas iguais, ciclo normal
- [ ] Smoke `weapon-evolution` verde; gate verde

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(boss): suspend the leva 2 affixes under the toji arsenal`

---

#### T97: Debug, rótulo e conferência dos afixos

**What**: `bossAffix=` aceita os 4 ids pelo `parseBossAffixes` da F32; rótulo da barra, glifos e aviso da loja pelo BRD
da F32; `README.md` com os ids; conferência em HD de cada afixo forçado.
**Where**: `scripts/smoke/boss-affix-2.smoke.mjs`
**Depends on**: T96
**Reuses**: `parseBossAffixes`, BRD (F32)
**Requirement**: AF2-06, AF2-07, LVX-07
**Modelo**: Opus 5.5 ou Fable (conferência)
**Escopo**: 1 smoke + a linha do README

**Done when**:

- [ ] Smoke: rótulo no gênero do arquétipo, glifos e aviso para cada afixo; `bossAffix=x` ignorado
- [ ] Os 4 conferidos em HD contra o chefe; gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `test(smoke): cover the leva 2 boss affix labels and debug`

---

#### T98: Fechamento da F41d

**What**: conferência da sub-fase (contagens do LVX; `Boss.ts`, `bossBrain.ts`, `bossAI.ts`, `bossAffix.ts` contra a
tabela do design) e a seção F41d do `validation.md`.
**Where**: `.specs/features/leva-2/validation.md`
**Depends on**: T97
**Reuses**: T32
**Requirement**: LVX-01, LVX-02, LVX-04
**Modelo**: Opus 5.5 ou Fable (Verifier)
**Escopo**: 1 documento de validação

**Done when**:

- [ ] Smokes `boss-affix-2`, `boss`, `boss-punish`, `boss-victory`, `kokusen`, `finisher`, `weapon-evolution` verdes
- [ ] Contagens no `validation.md`; gate verde

**Tests**: smoke
**Gate**: build
**Commit**: `docs(specs): validate the leva 2 boss affixes sub-phase`

---

### Phase 17: F41e passo 0 — sinais, comandos e dano principal (refatoração)

#### T99: `TechSignal`, `TechCommand` e o runner

**What**: reconfere a F37 implementada (`RECIPES`, `recipeReady`, `duoEligible`, `build.<item>.combo`) e anota
diferenças no design; `game/tech/module.ts` ganha `TechSignal`, `TechCommand`, `MainDamage`, `command?(cmd)` e
`mainDamage?()`; o `TechRunner` ganha `command(tech, cmd)`, `broadcast(cmd)`, `mainDamage(tech)` e o serviço
`signal(s)`, que chama a porta `onTechSignal` e empurra `techSignal:<kind>`; decisão AD-0xx no `.specs/STATE.md`;
`README.md` com o evento.
**Where**: `src/game/TechRunner.ts`
**Depends on**: None
**Reuses**: `TechRunner` (F34)
**Requirement**: DUO-08, LVX-05, LVX-07
**Modelo**: Sonnet (Opus 5.5 na revisão)
**Escopo**: ⚠️ coeso: os tipos e os 4 métodos genéricos que os usam

**Done when**:

- [ ] `tests/game/techRunnerCommand.test.ts` (novo, dublês): `command` chega só ao módulo pedido; `broadcast` a todos
      com `command`; `mainDamage` devolve `null` sem o método; `signal` chama a porta e empurra o evento
- [ ] `techRunnerSource.test.ts` verde (nenhum nome de técnica); smoke `tech` igual; gate verde

**Tests**: unit + smoke
**Gate**: full
**Commit**: `refactor(tech): add generic technique signals and commands`

---

#### T100: Sinais do Boogie, do Divergente e do Desmantelar

**What**: uma linha em cada módulo: Boogie solta `swapped` na troca com orbe; Divergente solta `impact2`; Desmantelar
solta `cut`. Trovão e Convergência já soltam desde a F41a.
**Where**: `src/game/tech/` (3 módulos)
**Depends on**: T99
**Reuses**: serviço `signal` (T99)
**Requirement**: DUO-06, DUO-12, EVL-03
**Modelo**: Sonnet
**Escopo**: ⚠️ coeso: 3 linhas iguais em 3 módulos, um comportamento (soltar o sinal)

**Done when**:

- [ ] Smokes `boogie`, `tech`, `resonance` verdes e iguais, cada um com o `techSignal:<kind>` do seu módulo no momento
      certo (troca com orbe, 2º impacto, corte)
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(tech): emit swap, second impact and cut signals`

---

#### T101: Dano principal dos 12 módulos

**What**: `mainDamage()` em todos os 12 módulos, do `TechStats` resolvido: Vermelho detonação, Azul implosão, Roxo dano,
Divergente 2º impacto, Desmantelar corte, Boogie choque ou tontura, Ressonância detonação, Fala "Exploda" ou
atordoamento, Convergência feixe na carga cheia, Cães mordida × mordidas × cães, Trovão raio × cargas, Erupção pilar
(o dano de uma conjuração num alvo só).
**Where**: `src/game/tech/` (12 módulos)
**Depends on**: T99
**Reuses**: `Loadout.stats(id)` (F30)
**Requirement**: DUO-08
**Modelo**: Sonnet
**Escopo**: ⚠️ coeso: 1 método curto por módulo, a mesma leitura

**Done when**:

- [ ] `tests/game/mainDamage.test.ts` (novo): cada módulo a 0 e a 3 pontos devolve o número do `TechStats` resolvido;
      Boogie e Fala de controle devolvem `{ control, ms }`
- [ ] Smoke `tech` verde e igual; gate verde

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(tech): declare the main damage of every technique`

---

### Phase 18: F41e passo 1 — Duos: receitas, regra pura, loja e diretor

#### T102: Receitas dos seis Duos

**What**: os 6 Duos no fim de `RECIPES` com `text` e `hint` da tabela "Receitas novas" do design, peças com `minLevel`
1 e o curinga `tecnica '*' 3` no Contra Amaldiçoado; linhas da tabela "Regra de combo".
**Where**: `src/data/evolutions.ts`
**Depends on**: None
**Reuses**: `RECIPES` (F37)
**Requirement**: DUO-01, DUO-14
**Modelo**: Sonnet
**Escopo**: 6 entradas de tabela

**Done when**:

- [ ] `tests/data/combos.test.ts`: nomes, textos e dicas dos 6 únicos contra Despertares, Evoluções, Uniões e Duos
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(data): add the six duo recipes`

---

#### T103: Regra dos Duos

**What**: `duoOn(recipe, view)` (todas as peças no nível; ignora "feito"), `duoOffer(recipe, view, owned, cardIndex) =
cardIndex ∈ {2, 3} && duoEligible(...) && !owned.has(id)` (correção 3 do design), `curseSlot(view)` (o 1º slot 0, 1,
2 com técnica no Nv 3 ou mais, ou `null`; DUO-09, correção 9), `DUO_CAP = 4`.
**Where**: `src/core/duos.ts`
**Depends on**: T102
**Reuses**: `duoEligible`, `halfHeld` (F37)
**Requirement**: DUO-02, DUO-03, DUO-05, DUO-09
**Modelo**: Sonnet
**Escopo**: 3 funções + 1 constante

**Done when**:

- [ ] `tests/core/duos.test.ts` (novo): receita pronta; peça faltando desliga; curinga no Nv 3 e não no 2; posições 2 e
      3 só; 3 Duos ainda oferece e 4 não; `curseSlot` com Nv 1 no slot 0 e Nv 3 no slot 1 dá 1, com Nv 2 em todos dá
      `null`
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the duo eligibility rule`

---

#### T104: Duo no sorteio das posições 2 e 3

**What**: o Duo entra no sorteio por peso só das posições 2 e 3 que sobram depois do OFR-01 da F37; nunca carta 0 nem
1, nunca no baú.
**Where**: `src/core/shopDraw.ts`
**Depends on**: T103
**Reuses**: sorteio da F30/F37
**Requirement**: DUO-02
**Modelo**: Sonnet
**Escopo**: 1 ponto do sorteio

**Done when**:

- [ ] `tests/core/shopDrawDuo.test.ts` (novo): com 3 receitas prontas só a carta 3; com a carta 2 de item novo só a 3;
      sem Duo no catálogo as seeds de hoje sorteiam igual
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(shop): draw duo cards only in the last two slots`

---

#### T105: Preço e recusa do Duo

**What**: `cardCost` do Duo = `round(40 × inflação)` sem `poolSurcharge`; compra com 4 Duos → `buyDenied:duo` sem gastar
(o `shopPricing.ts` ganha a linha do preço).
**Where**: `src/core/shop.ts`
**Depends on**: T103
**Reuses**: `shopPricing`, `poolSurcharge` (F30, F35)
**Requirement**: DUO-02, DUO-03
**Modelo**: Sonnet
**Escopo**: ⚠️ coeso: a compra e o preço do mesmo item

**Done when**:

- [ ] `tests/core/shopDuo.test.ts` (novo; `shop.test.ts` não cresce): preço com inflação e sem acréscimo de vaga; 5ª
      compra recusada sem gastar fragmento
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(shop): price duos and refuse a fifth one`

---

#### T106: Fontes novas do emissor

**What**: `EmitSource` + `'contraAmaldicoado' | 'sombra' | 'impactoEletrico'` (o `iai` veio na T52), com o teto de 4
por segundo por fonte.
**Where**: `src/core/techEmitter.ts`
**Depends on**: None
**Reuses**: `TechEmitter` (F34)
**Requirement**: DUO-09, DUO-10, DUO-12
**Modelo**: Sonnet
**Escopo**: 1 tipo

**Done when**:

- [ ] Teste do emissor (F34): as 3 fontes novas com teto próprio de 4 por segundo
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the duo emitter sources`

---

#### T107: Diretor dos Duos

**What**: campo `duos` do `BuildDirector`: `owned`, `add(id)` (`duo:<id>`), `onSignal(s)` (porta `onTechSignal` ligada
no `techPorts.ts`), `update(dt)`, `onPerfectCounter(target)`, `reset()`, `applyDebug()` (`duo=` depois de `tech=`,
`perks=` e `axes=`, até 4), `snapshot()` (`build.duos` no `buildSnapshot.ts`); o `buildTray` ganha ` · Duos <n>/4`;
`README.md` com `duo=` e `duo:<id>`.
**Where**: `src/scenes/test/duoDirector.ts`
**Depends on**: T103, T99
**Reuses**: `BuildDirector`, `buildTray` (F35)
**Requirement**: DUO-04, DUO-05, DUO-13, LVX-03, LVX-07
**Modelo**: Sonnet
**Escopo**: ⚠️ coeso: o diretor nasce com o debug e o snapshot que o provam

**Done when**:

- [ ] `scripts/smoke/duos.smoke.mjs` (novo): `tech=boogie,vermelho&duo=trocaExplosiva` lista o Duo em `build.duos` e a
      `BuildBar` termina em ` · Duos 1/4`; `duo=x` ignorado; 5 ids param em 4; receita não pronta ignorada
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(build): add the duo director`

---

### Phase 19: F41e passos 1 a 3 — efeitos dos Duos

#### T108: Troca Explosiva

**What**: `swapped` com `tech: 'vermelho'` → `techRunner.command('vermelho', { type: 'detonate', objectId })` no ponto
novo do orbe; o módulo do Vermelho aceita `detonate` (+linhas, a detonação resolvida de sempre).
**Where**: `src/scenes/test/duoDirector.ts`
**Depends on**: T107, T100
**Reuses**: detonação do Vermelho (F30)
**Requirement**: DUO-06
**Modelo**: Sonnet
**Escopo**: 1 efeito + o comando que ele manda

**Done when**:

- [ ] `duos.smoke.mjs`: o orbe detona onde o player estava, com o dano resolvido; sem o Duo não detona
- [ ] Smoke `red-anime` verde; gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(duo): detonate the red orb swapped by the boogie`

---

#### T109: Prego Rubro

**What**: por quadro, cada orbe vivo do Vermelho sobre um alvo com marcas (`techState.ressonancia.marks`) →
`command('ressonancia', { type: 'detonateMarks', targetId })` e `command('vermelho', { type: 'growRadius', objectId, px:
max(24, propagação resolvida) })` uma vez por orbe; os dois módulos aceitam o comando.
**Where**: `src/scenes/test/duoDirector.ts`
**Depends on**: T108
**Reuses**: detonação do 2º toque da Ressonância (F34)
**Requirement**: DUO-07
**Modelo**: Sonnet
**Escopo**: 1 efeito + os 2 comandos que manda

**Done when**:

- [ ] `duos.smoke.mjs` (`tech=ressonancia,vermelho&duo=pregoRubro`): as marcas do alvo tocado detonam só nele; o raio
      da detonação do orbe cresce uma vez
- [ ] Smoke `resonance` verde; gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(duo): let the red orb detonate resonance marks`

---

#### T110: Contra Amaldiçoado

**What**: `onPerfectCounter` (chamado pelo `talentDirector` no Contra perfeito da F35) com 6000 ms desde o último →
`emitter.emit('contraAmaldicoado', ...)` `micro` de 50% do `mainDamage` do 1º slot (0, 1, 2) com técnica no Nv 3 ou
mais (`curseSlot(view)`, T103), ou o controle por 50% do tempo.
**Where**: `src/scenes/test/duoDirector.ts`
**Depends on**: T107, T101, T106
**Reuses**: `mainDamage` (T101), `TechEmitter`
**Requirement**: DUO-09
**Modelo**: Sonnet
**Escopo**: 1 efeito

**Done when**:

- [ ] `duos.smoke.mjs`: Contra perfeito tira 50% do dano principal da técnica Nv 3 sem gastar energia, também com uma
      técnica Nv 1 no slot 0 e a Nv 3 no slot 1; o 2º em menos de 6 s não solta; com a Fala de controle como técnica
      Nv 3, atordoa por metade do tempo
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(duo): release half a technique on a perfect counter`

---

#### T111: Sombra no Contra

**What**: `onPerfectCounter` → `emitter.emit('sombra', ...)` `micro` da mordida resolvida dos Cães no mesmo alvo com
`stunMs = max(rootMs resolvido, 300)` (comum em `stunned`, chefe por `stun(ms × 0,25, 'tech')`), desenhada pelo
`DogsFx.shadowBite(target)`.
**Where**: `src/scenes/test/duoDirector.ts`
**Depends on**: T110
**Reuses**: `DogsFx` (T21)
**Requirement**: DUO-10
**Modelo**: Sonnet (Opus 5.5 na conferência)
**Escopo**: 1 efeito + a vista curta dele

**Done when**:

- [ ] `duos.smoke.mjs`: Contra perfeito com Cães e Contra Afiado dá um `micro` da mordida, `stunnedMs` perto de 300 no
      comum (perto de 600 com `axes=caes.prisao:3`) e o quadro `bite` vivo na sombra do alvo
- [ ] Conferência em HD; gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(duo): bite from the shadow on a perfect counter`

---

#### T112: Ordem Elétrica

**What**: `discharge` → para cada alvo vivo em `kitTargets` atordoado por uma `SpeechCast` viva e fora de `hitIds`, um
`micro` de `boltDamage` com zigue-zague a partir do `lastHop`, depois dos saltos normais, sem limite de raio na tela.
**Where**: `src/scenes/test/duoDirector.ts`
**Depends on**: T107, T100
**Reuses**: `ThunderFx.zigzag` (T25), `techState.fala` (F34)
**Requirement**: DUO-11
**Modelo**: Sonnet
**Escopo**: 1 efeito

**Done when**:

- [ ] `duos.smoke.mjs` (`tech=fala,trovao&duo=ordemEletrica`): os atordoados pela Fala longe do salto levam o raio uma
      vez cada, depois dos saltos normais; sem atordoado nada a mais
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(duo): chain thunder through speech stunned targets`

---

#### T113: Impacto Elétrico

**What**: `impact2` → `emitter.emit('impactoEletrico', ...)` `micro` do raio resolvido do Trovão nos 2 vivos mais perto
a até o raio de salto resolvido, com zigue-zague, sem gastar carga.
**Where**: `src/scenes/test/duoDirector.ts`
**Depends on**: T112, T106
**Reuses**: `ThunderFx.zigzag` (T25)
**Requirement**: DUO-12
**Modelo**: Sonnet
**Escopo**: 1 efeito

**Done when**:

- [ ] `duos.smoke.mjs` (`tech=trovao,divergente&duo=impactoEletrico`): o 2º impacto salta para 2 comuns; as cargas do
      Trovão não mudam
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(duo): jump thunder from the divergent second impact`

---

#### T114: Duos na loja e conferência

**What**: `DUO_SHOP_ENTRIES` (kind `duo`, rara, 40) no fim do catálogo; o caso de peça abandonada e comprada de novo;
conferência em HD dos efeitos dos 6.
**Where**: `src/data/shop.ts`
**Depends on**: T109, T111, T113
**Reuses**: `GAME_SHOP_CATALOG`
**Requirement**: DUO-02, DUO-03, DUO-05
**Modelo**: Opus 5.5 ou Fable (conferência)
**Escopo**: 6 entradas + os casos de loja no smoke

**Done when**:

- [ ] `shopLeva2.test.ts`: os 6 Duos no fim do catálogo, raros, 40, kind `duo`
- [ ] `duos.smoke.mjs`: carta de Duo só na posição 2 ou 3 com a receita pronta; com 4 Duos nenhuma e a compra forçada
      dá `buyDenied:duo`; abandonar uma peça desliga o efeito e recomprar religa sem contar Duo novo
- [ ] Smoke `shop` verde; gate verde

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(shop): sell the duo cards`

---

### Phase 20: F41e passos 4 a 6 — Evoluções e fechamento da F41

#### T115: Receitas das três Evoluções e a porta `combo`

**What**: `redeDeCortes` (`corte` 4 + domínio `santuario` 1), `sangueEterno` (`convergencia` 4 + talento
`reversaRefinada` 1) e `palavraNoPontoFraco` (`fala` 4 + talento `seisOlhos` 1) depois das Evoluções de técnica da F37,
com `text` e `hint`; `TechPorts.combo(tech)` lê a receita que o item carrega; a evolução fica com o catalisador
abandonado e empurra `combo:<recipe>` e `evolve:<id>` (F37).
**Where**: `src/data/evolutions.ts`
**Depends on**: None
**Reuses**: `RECIPES`, CDB-02 (F37)
**Requirement**: EVL-01, EVL-02
**Modelo**: Sonnet
**Escopo**: ⚠️ coeso: 3 entradas + a porta de 1 linha que os módulos leem

**Done when**:

- [ ] `combos.test.ts`: nomes, textos e dicas únicos
- [ ] Smoke `evolution` (F37) com uma receita nova: slot, pontos, ramo e Despertar mantidos; `evolve:<id>`; gate verde

**Tests**: unit + smoke
**Gate**: full
**Commit**: `feat(data): add the leva 2 technique evolutions`

---

#### T116: Regra das marcas e das poças

**What**: `class CutMarks` (até 8, a mais velha sai, 6000 ms, `marksHit(boxes, 32)`) e `class BloodPools` (32 px sob
os pés, 4000 ms, vida guardada, `absorb(originX, endX)` → a 1ª poça viva com o centro dentro de `[origem, fim]` →
`{ mul: 1.5, heal: round(vida / 2) }`).
**Where**: `src/core/evolutionsLeva2.ts`
**Depends on**: None
**Reuses**: nada (regras puras; ajuste 4 deste arquivo)
**Requirement**: EVL-03, EVL-04, EVL-05
**Modelo**: Sonnet
**Escopo**: 2 classes pequenas das Evoluções

**Done when**:

- [ ] `tests/core/evolutionsLeva2.test.ts` (novo): a 9ª marca tira a mais velha; 6000 ms; caixa a 32 px acerta e a 33
      não; poça com custo 0 dá +50% e cura 0, com custo 6 cura 3; poça absorvida some; feixe do mesmo lugar não bebe
      para nenhum dos lados, feixe de 20 px atrás bebe; centro da poça na origem exata bebe (borda, L-010)
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the cut mark and blood pool rules`

---

#### T117: Rede de Cortes

**What**: com `ctx.combo('corte') === 'redeDeCortes'`, cada corte deixa marca; `command({ type: 'domainActivated', id:
'santuario' })` (mandado pelo `domainDirector` por `techRunner.broadcast`, +1) detona todas com o corte resolvido e o
patamar `decisive` forçado; `objects()` com `cutMark`; vista no chão `k`/`W`.
**Where**: `src/game/tech/cutMarks.ts`
**Depends on**: T115, T116
**Reuses**: `CutMarks` (T116), patamar forçado (F29 `6fff962`)
**Requirement**: EVL-03, EVL-04, EVL-07
**Modelo**: Sonnet (Opus 5.5 na conferência)
**Escopo**: 1 módulo da evolução + a linha do `broadcast`

**Done when**:

- [ ] `duos.smoke.mjs` com `evo=redeDeCortes`: marcas no `techObjects`; a ativação do Santuário acerta os alvos a até
      32 px com patamar `decisive` e limpa as marcas
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(tech): add the cut web evolution`

---

#### T118: Sangue Eterno

**What**: com o combo, cada feixe deixa poça sob os pés (centro no x do centro da `hurtRect`) com a vida paga; o feixe
seguinte cujo trecho `[origem, fim]` contém o centro da poça a absorve: dano × 1,5 e cura; `objects()` com `blood`; vista no chão `r`/`t`.
**Where**: `src/game/tech/convergenceBlood.ts`
**Depends on**: T115, T116
**Reuses**: `BloodPools` (T116), módulo da Convergência (T14)
**Requirement**: EVL-05, EVL-07
**Modelo**: Sonnet (Opus 5.5 na conferência)
**Escopo**: 1 módulo da evolução

**Done when**:

- [ ] `duos.smoke.mjs` com `evo=sangueEterno`: poça no `techObjects`; o 2º feixe do mesmo lugar não bebe; recuar 20 px
      e atirar por cima dela tira 1,5× e cura `round(vida / 2)`
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(tech): add the eternal blood evolution`

---

#### T119: Palavra no Ponto Fraco

**What**: com o combo, o "Pare!" atordoa o ponto fraco do Seis Olhos a até o alcance da Fala, fora do cone e sem linha
de visão; `palavraStunned` liga no `critDirector` e nas `CritSources` (acerto não chip no atordoado pela Fala sai ×1,5,
técnica inclusive).
**Where**: `src/game/tech/speechWeak.ts`
**Depends on**: T115
**Reuses**: `WeakPoint` (T49), `critDirector` (T35), `CritSources` (T34)
**Requirement**: EVL-06
**Modelo**: Sonnet
**Escopo**: 1 módulo da evolução + a fonte de crítico que ele liga

**Done when**:

- [ ] `duos.smoke.mjs` com `evo=palavraNoPontoFraco`: o ponto fraco atrás do player é atordoado; golpe e técnica nele
      saem `crit`; chip não
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(tech): add the word on the weak point evolution`

---

#### T120: `evo=` e conferência das Evoluções

**What**: `evo=` aceita as 3 pelo F37 (depois de `tech=`, `domain=`, `perks=` e `axes=`; ignorado sem a receita
pronta); `README.md`; conferência em HD das marcas e das poças.
**Where**: `scripts/smoke/duos.smoke.mjs`
**Depends on**: T117, T118, T119
**Reuses**: `evo=` (F37)
**Requirement**: EVL-07, EVL-08, LVX-07
**Modelo**: Opus 5.5 ou Fable (conferência)
**Escopo**: 1 smoke + a linha do README

**Done when**:

- [ ] Smoke: `evo=` com a receita pronta evolui e sem ela é ignorado
- [ ] Marcas e poças conferidas em HD em movimento, dois lados; gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `test(smoke): cover the leva 2 evolution debug parameter`

---

#### T121: Fechamento da F41

**What**: conferência da F41e e da F41 inteira: `TestScene.ts` com as mesmas efetivas do fim da F40 ou menos, nenhum
arquivo nas exceções, `Hud.ts`/`moves.ts`/`ShopPanel.ts` sem crescer, todos os smokes novos e os da F29 à F40 que tocam
os sistemas; seção F41e e veredito final no `validation.md` (`validate_state.py`); tabelas "Onde mexer" e "Arte" do
`CLAUDE.md` com os arquivos e smokes novos; o `## Handoff` do `.specs/STATE.md` reescrito.
**Where**: `.specs/features/leva-2/validation.md`
**Depends on**: T114, T120
**Reuses**: T32
**Requirement**: LVX-01, LVX-02, LVX-03, LVX-04, LVX-05, LVX-06, LVX-07
**Modelo**: Opus 5.5 ou Fable (Verifier)
**Escopo**: ⚠️ coeso: o fechamento da feature (validação, mapa e handoff)

**Done when**:

- [ ] Smokes `convergence`, `divine-dogs`, `thunder-fist`, `eruption`, `void-domain`, `talents-2`, `dragon-bone`,
      `sukuna-fingers`, `boss-affix-2`, `duos`, `tech-axes`, `power`, `domain-veil`, `tech`, `boogie`, `resonance`,
      `cursed-speech`, `fxlab`, `boss`, `weapon-imbued`, `evolution`, `shop`, `run-loop` verdes
- [ ] `validate_state.py` verde; Success Criteria da spec marcados com evidência
- [ ] Gate verde

**Tests**: smoke
**Gate**: build
**Commit**: `docs(specs): validate the leva 2 feature`

---

## Requirement Coverage

158 critérios, 158 com tarefa, 0 sem tarefa.

| Requirement | Tasks |
| --- | --- |
| LVX-01 | T32, T64, T84, T98, T121 |
| LVX-02 | T32, T37, T56, T64, T84, T98, T121 |
| LVX-03 | T37, T41, T49, T71, T94, T107, T121 |
| LVX-04 | T32, T64, T84, T98, T121 |
| LVX-05 | T1, T2, T5, T14, T20, T24, T29, T99, T121 |
| LVX-06 | T7, T11, T15, T19, T21, T25, T30, T32, T38, T43, T45, T62, T65, T66, T81, T89, T121 |
| LVX-07 | T14, T20, T24, T29, T41, T52, T60, T63, T71, T73, T80, T93, T95, T97, T99, T107, T120, T121 |
| TC2-01 | T14, T20, T24, T29 |
| TC2-02 | T12, T16, T22, T26 |
| TC2-03 | T14, T20, T24, T29 |
| TC2-04 | T13, T18, T23, T28, T31 |
| TC2-05 | T13, T18, T23, T28, T31 |
| TC2-06 | T14, T20, T24, T29, T31 |
| TC2-07 | T14, T20, T24, T29, T31 |
| TC2-08 | T6, T10, T14, T20, T24, T29 |
| TC2-09 | T6, T14, T20, T24, T29 |
| TC2-10 | T14, T20, T24, T29 |
| TC2-11 | T3, T14, T20, T24, T29 |
| TC2-12 | T5, T8, T10 |
| TC2-13 | T13, T17, T18, T23, T27, T28 |
| TC2-14 | T13, T18, T23, T28 |
| CNG-01 | T1, T9, T14 |
| CNG-02 | T9, T14 |
| CNG-03 | T14 |
| CNG-04 | T14 |
| CNG-05 | T14 |
| CNG-06 | T10, T14 |
| CNG-07 | T1, T2, T3, T14 |
| CNG-08 | T15 |
| CNG-09 | T7, T14, T15 |
| CNG-10 | T14 |
| CNG-11 | T15 |
| DOG-01 | T20 |
| DOG-02 | T10, T20 |
| DOG-03 | T21 |
| DOG-04 | T21 |
| DOG-05 | T20 |
| DOG-06 | T19 |
| DOG-07 | T21 |
| RAI-01 | T24 |
| RAI-02 | T4, T5, T24 |
| RAI-03 | T10, T24 |
| RAI-04 | T24 |
| RAI-05 | T24 |
| RAI-06 | T24, T25 |
| RAI-07 | T25 |
| RAI-08 | T24 |
| RAI-09 | T25 |
| ERP-01 | T29, T30 |
| ERP-02 | T29 |
| ERP-03 | T29 |
| ERP-04 | T30 |
| ERP-05 | T29 |
| ERP-06 | T30 |
| IC2-01 | T11 |
| IC2-02 | T11 |
| IC2-03 | T14, T20, T24, T29, T32 |
| IC2-04 | T11, T32 |
| IC2-05 | T44 |
| VAZ-01 | T38 |
| VAZ-02 | T40 |
| VAZ-03 | T39, T41 |
| VAZ-04 | T33, T34, T35, T42 |
| VAZ-05 | T39, T41 |
| VAZ-06 | T43 |
| VAZ-07 | T41 |
| VAZ-08 | T41 |
| VAZ-09 | T43 |
| TLV-01 | T46, T60 |
| TLV-02 | T47, T53 |
| TLV-03 | T53 |
| TLV-04 | T48, T54 |
| TLV-05 | T47, T57 |
| TLV-06 | T37, T48, T58 |
| TLV-07 | T59 |
| TLV-08 | T47, T55 |
| TLV-09 | T55 |
| TLV-10 | T56 |
| TLV-11 | T47, T51 |
| TLV-12 | T51 |
| TLV-13 | T52 |
| TLV-14 | T47 |
| TLV-15 | T48, T49 |
| TLV-16 | T33, T35, T50 |
| TLV-17 | T33, T34, T35, T36, T50 |
| TLV-18 | T49, T50, T51, T52, T53, T54, T55, T57, T59, T60 |
| TLV-19 | T45 |
| TLV-20 | T37, T49, T58 |
| TLV-21 | T60 |
| OSS-01 | T68, T73 |
| OSS-02 | T68, T69 |
| OSS-03 | T67, T70, T71 |
| OSS-04 | T67, T72 |
| OSS-05 | T67, T72 |
| OSS-06 | T71 |
| OSS-07 | T65, T71 |
| OSS-08 | T72 |
| OSS-09 | T74 |
| OSS-10 | T75 |
| OSS-11 | T66 |
| OSS-12 | T71, T73, T75 |
| OSS-13 | T69 |
| OSS-14 | T73, T75 |
| DED-01 | T76, T83 |
| DED-02 | T77, T83 |
| DED-03 | T78 |
| DED-04 | T79 |
| DED-05 | T80 |
| DED-06 | T81 |
| DED-07 | T66, T82 |
| DED-08 | T83 |
| DED-09 | T77, T80 |
| AF2-01 | T89 |
| AF2-02 | T89 |
| AF2-03 | T90, T92, T93 |
| AF2-04 | T91 |
| AF2-05 | T96 |
| AF2-06 | T97 |
| ENF-01 | T90 |
| ENF-02 | T90 |
| COU-01 | T92 |
| SOB-01 | T93 |
| SOB-02 | T85, T86, T93 |
| SOB-03 | T85, T93 |
| SOB-04 | T94 |
| PDR-01 | T85, T95 |
| PDR-02 | T85, T86, T87, T88, T95 |
| PDR-03 | T91 |
| PDR-04 | T95 |
| AF2-07 | T97 |
| DUO-01 | T102 |
| DUO-02 | T103, T104, T105, T114 |
| DUO-03 | T103, T105, T114 |
| DUO-04 | T107 |
| DUO-05 | T103, T107, T114 |
| DUO-06 | T100, T108 |
| DUO-07 | T109 |
| DUO-08 | T99, T101 |
| DUO-09 | T103, T106, T110 |
| DUO-10 | T106, T111 |
| DUO-11 | T112 |
| DUO-12 | T100, T106, T113 |
| DUO-13 | T107 |
| DUO-14 | T102 |
| EVL-01 | T115 |
| EVL-02 | T115 |
| EVL-03 | T100, T116, T117 |
| EVL-04 | T116, T117 |
| EVL-05 | T116, T118 |
| EVL-06 | T33, T34, T119 |
| EVL-07 | T117, T118, T120 |
| EVL-08 | T120 |
| DON-01 | T61, T63 |
| DON-02 | T63 |
| DON-03 | T62, T63 |
| DON-04 | T63 |
| DON-05 | T61 |
| DON-06 | T62, T63 |

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8 → Phase 9 → Phase 10 → Phase 11 → Phase 12 → Phase 13 → Phase 14 → Phase 15 → Phase 16 → Phase 17 → Phase 18 → Phase 19 → Phase 20

Phase  1:  T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8 | T9 | T10
Phase  2:  T11 | T12 | T13 | T14 | T15
Phase  3:  T16 | T17 | T18 | T19 | T20 | T21
Phase  4:  T22 | T23 | T24 | T25
Phase  5:  T26 | T27 | T28 | T29 | T30 | T31 | T32
Phase  6:  T33 | T34 | T35 | T36 | T37
Phase  7:  T38 | T39 | T40 | T41 | T42 | T43 | T44
Phase  8:  T45 | T46 | T47 | T48
Phase  9:  T49 | T50 | T51 | T52 | T53 | T54
Phase 10:  T55 | T56 | T57 | T58 | T59 | T60
Phase 11:  T61 | T62 | T63 | T64
Phase 12:  T65 | T66 | T67 | T68 | T69
Phase 13:  T70 | T71 | T72 | T73 | T74 | T75
Phase 14:  T76 | T77 | T78 | T79 | T80 | T81 | T82 | T83 | T84
Phase 15:  T85 | T86 | T87 | T88 | T89
Phase 16:  T90 | T91 | T92 | T93 | T94 | T95 | T96 | T97 | T98
Phase 17:  T99 | T100 | T101
Phase 18:  T102 | T103 | T104 | T105 | T106 | T107
Phase 19:  T108 | T109 | T110 | T111 | T112 | T113 | T114
Phase 20:  T115 | T116 | T117 | T118 | T119 | T120 | T121
```

Dentro de cada fase as tarefas rodam na ordem listada (as dependências estão nos diagramas do "Execution Plan"). Execution is strictly sequential - there is no intra-phase parallelism. Lotes propostos (fases inteiras, ~7 tarefas, nunca atravessando sub-fase; o orquestrador confirma no Execute):

| Lote | Sub-fase | Fases | Tarefas |
| --- | --- | --- | --- |
| 1 | F41a técnicas | 1 | T1 a T10 (10) |
| 2 | F41a técnicas | 2, 3 | T11 a T21 (11) |
| 3 | F41a técnicas | 4, 5 | T22 a T32 (11) |
| 4 | F41b Domínio, talentos e ドン | 6 | T33 a T37 (5) |
| 5 | F41b Domínio, talentos e ドン | 7 | T38 a T44 (7) |
| 6 | F41b Domínio, talentos e ドン | 8, 9 | T45 a T54 (10) |
| 7 | F41b Domínio, talentos e ドン | 10, 11 | T55 a T64 (10) |
| 8 | F41c arsenal | 12, 13 | T65 a T75 (11) |
| 9 | F41c arsenal | 14 | T76 a T84 (9) |
| 10 | F41d chefes | 15 | T85 a T89 (5) |
| 11 | F41d chefes | 16 | T90 a T98 (9) |
| 12 | F41e combos | 17, 18 | T99 a T107 (9) |
| 13 | F41e combos | 19 | T108 a T114 (7) |
| 14 | F41e combos | 20 | T115 a T121 (7) |

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1: `holdPhase` e `abort` na `CastMachine` | 1 arquivo, 2 métodos da mesma máquina | ✅ Granular |
| T2: `TechCaster` repassa `holdPhase` e `abortCast` | 1 arquivo | ✅ Granular |
| T3: Cancelar a conjuração na konbini, na morte e na troca de área | 4 chamadas de 1 linha no diretor e 1 no `areaDirector`, o mesmo comportamento | ⚠️ coeso |
| T4: `StrikeLog` dos golpes do moveset | 1 classe nova + 1 linha de gravação | ✅ Granular |
| T5: Portas novas do `TechPorts` | a interface e a sua ligação de 1 linha por porta | ⚠️ coeso |
| T6: `castHit` com `{ domain: false }` | 1 método | ✅ Granular |
| T7: Anel de carga no slot | 1 vista + o campo do tipo que ela lê | ✅ Granular |
| T8: Filtro da vista da câmera | 1 função | ✅ Granular |
| T9: Portão e retenção da Convergência | 2 funções pequenas do mesmo portão | ✅ Granular |
| T10: Alvos e acerto comuns das técnicas da leva 2 | 1 arquivo, o caminho único de acerto dos 4 módulos | ✅ Granular |
| T11: Cinco ícones HD da leva 2 | 1 arquivo de arte + o registro dos 5 ids | ⚠️ coeso |
| T12: Resolvedor da Convergência | 1 função (e o ajudante de leitura do build) | ✅ Granular |
| T13: Eixos, ramos e Despertares da Convergência | 1 entrada de tabela | ✅ Granular |
| T14: Convergência no jogo | a "entrada" da técnica que o LVX-05 pede num commit; o `convergenceHits.ts` é o mesmo módulo | ⚠️ coeso |
| T15: Vista da Convergência | 1 vista + as chamadas do módulo | ✅ Granular |
| T16: Resolvedor dos Cães | 1 função | ✅ Granular |
| T17: Calibração dos Cães | 2 números de 1 tabela | ✅ Granular |
| T18: Eixos, ramos e Despertares dos Cães | 1 entrada de tabela | ✅ Granular |
| T19: Folha `dogs` | 1 folha | ✅ Granular |
| T20: Cães Divinos no jogo | a entrada da técnica num commit (LVX-05) | ⚠️ coeso |
| T21: Vista dos Cães | 1 vista + as chamadas do módulo | ✅ Granular |
| T22: Resolvedor do Trovão | 1 função | ✅ Granular |
| T23: Eixos, ramos e Despertares do Trovão | 1 entrada de tabela | ✅ Granular |
| T24: Punho de Trovão no jogo | a entrada da técnica num commit (LVX-05) | ⚠️ coeso |
| T25: Vista do Trovão | 1 vista + as chamadas do módulo | ✅ Granular |
| T26: Resolvedor da Erupção | 1 função | ✅ Granular |
| T27: Calibração da Erupção | 1 número de 1 tabela | ✅ Granular |
| T28: Eixos, ramos e Despertares da Erupção | 1 entrada de tabela | ✅ Granular |
| T29: Erupção no jogo | a entrada da técnica num commit (LVX-05) | ⚠️ coeso |
| T30: Vista da Erupção | 1 vista + as chamadas do módulo | ✅ Granular |
| T31: Carta de 2 eixos, ramo e Despertar das quatro | 1 smoke | ✅ Granular |
| T32: Fechamento da F41a | 1 documento de validação | ✅ Granular |
| T33: Regra do crítico no alvo | 1 função | ✅ Granular |
| T34: `CritSources` com o Vazio e a Palavra | 2 campos de 1 função | ✅ Granular |
| T35: `critDirector` | 1 diretor | ✅ Granular |
| T36: Gancho `hitMods` no comum e no chefe | o mesmo gancho nos dois alvos + a ligação e o número que o provam | ⚠️ coeso |
| T37: Barra de postura do chefe | 1 vista + o campo de snapshot que a prova | ✅ Granular |
| T38: Dados do Vazio | 1 entrada de tabela | ✅ Granular |
| T39: Paralisia do Vazio | 1 classe + 1 função | ✅ Granular |
| T40: Baú do Véu sorteia 2 de 4 | 1 função | ✅ Granular |
| T41: Vazio Ilimitado no jogo | 1 poder de Domínio + o campo de snapshot que o prova | ✅ Granular |
| T42: Crítico no paralisado do Vazio | 1 fonte ligada nos 2 caminhos de crítico | ✅ Granular |
| T43: Vista do Vazio | 1 vista | ✅ Granular |
| T44: Ícone do Vazio na barra e na carta | 1 caso de smoke (e o ajuste de 1 linha se o caminho não for genérico) | ✅ Granular |
| T45: Ícones dos cinco talentos | 5 grades no mesmo arquivo | ✅ Granular |
| T46: Dados dos cinco talentos | 1 tabela | ✅ Granular |
| T47: Efeitos de build dos talentos | 1 função ampliada | ✅ Granular |
| T48: Ponto fraco, empurrão e trincas | 3 regras pequenas dos talentos | ✅ Granular |
| T49: Diretor dos talentos da leva 2 com o ponto fraco | o diretor nasce com o 1º talento que o prova (merge forward) | ⚠️ coeso |
| T50: Seis Olhos Nv 3 | 1 comportamento | ✅ Granular |
| T51: Domínio Simples Nv 1 e 2 | 1 talento, 2 níveis | ✅ Granular |
| T52: Corte iai do Domínio Simples Nv 3 | 1 comportamento + a fonte do emissor que ele usa | ✅ Granular |
| T53: Mão de Ferro Nv 1 e 2 | 1 talento, 2 níveis | ✅ Granular |
| T54: Mão de Ferro Nv 3 | 1 comportamento | ✅ Granular |
| T55: Reversa Refinada Nv 1 e 2 | 1 talento, 2 níveis | ✅ Granular |
| T56: Andar curando com a Reversa Nv 3 | 1 valor de campo que já existe | ✅ Granular |
| T57: Osso Duro Nv 1 | 1 parâmetro no cérebro + o repasse | ✅ Granular |
| T58: Trincas na barra de postura | 1 desenho na vista | ✅ Granular |
| T59: Chefe caído do Osso Duro Nv 3 | 2 campos do mesmo estado (`staggerMul`, `lying`) + o repasse ao cérebro | ⚠️ coeso |
| T60: Talentos na loja e conferência | 5 entradas de tabela + a linha do README | ✅ Granular |
| T61: Portão do ドン | 1 classe | ✅ Granular |
| T62: Folha da onomatopeia | 1 folha | ✅ Granular |
| T63: ドン no jogo | 1 vista + a chamada do impacto | ✅ Granular |
| T64: Fechamento da F41b | 1 documento de validação | ✅ Granular |
| T65: Marcador de cinco cargas | 1 folha | ✅ Granular |
| T66: Ícones `bound-bone` e `bound-finger` | 2 grades no mesmo arquivo | ✅ Granular |
| T67: Regra das cargas do Osso | 1 classe + 3 funções da mesma regra | ✅ Granular |
| T68: Dados do Osso de Dragão | a entrada da arma nas 2 tabelas que a definem | ⚠️ coeso |
| T69: Traço e resolução do Osso | 1 entrada de 2 funções do mesmo arquivo | ✅ Granular |
| T70: Dano do player repassado com o tipo | 1 repasse | ✅ Granular |
| T71: Cargas do Osso no jogo | 1 módulo do diretor + o campo de snapshot que o prova | ✅ Granular |
| T72: Soltura e Estopim | 1 comportamento | ✅ Granular |
| T73: Osso na loja e conferência | 1 entrada + a linha do README | ✅ Granular |
| T74: Receita do Dragão Refletido | 1 entrada de tabela | ✅ Granular |
| T75: Dragão Refletido no parry | 1 comportamento | ✅ Granular |
| T76: Dados dos Dedos | 1 entrada de tabela | ✅ Granular |
| T77: Nível máximo e oferta da relíquia | 3 funções pequenas da mesma classe | ✅ Granular |
| T78: Multiplicadores dos Dedos | 1 entrada da função | ✅ Granular |
| T79: Chance do Portador com os Dedos | 1 parâmetro em 2 funções do mesmo sorteio | ✅ Granular |
| T80: Dedo na vitória sobre o Portador | 1 método do diretor | ✅ Granular |
| T81: Aura vermelha e preta dos Dedos | 1 função + a leitura na vista | ✅ Granular |
| T82: Barra da build e carta dos Dedos | 1 texto de bandeja + o ícone que a vista lê | ✅ Granular |
| T83: Dedos na loja e abandono | 1 entrada + o caso de abandono no smoke | ✅ Granular |
| T84: Fechamento da F41c | 1 documento de validação | ✅ Granular |
| T85: Regra da armadura do chefe | 1 classe | ✅ Granular |
| T86: `applyDamage` do chefe reordenado com a armadura neutra | 1 método reordenado | ✅ Granular |
| T87: Marca `breaksLayer` no golpe | 1 campo + a função que o decide + o repasse de 1 linha | ⚠️ coeso |
| T88: 1º acerto do Despertar quebra camada | 1 método genérico + a porta que o lê | ✅ Granular |
| T89: Os quatro afixos e os pares | 1 tabela | ✅ Granular |
| T90: Enfurecido | 1 contador na IA + a linha da tuning que o liga | ⚠️ coeso |
| T91: Contorno com a rampa da Pele | 1 função | ✅ Granular |
| T92: Couraça | 1 entrada da função | ✅ Granular |
| T93: Sobrecarregado: vida e escudo | 1 entrada de spec + o repasse ao cérebro | ✅ Granular |
| T94: Escudo na barra do chefe | 1 desenho + o campo de snapshot que o prova | ✅ Granular |
| T95: Pele de Dragão | 1 entrada da função + o campo de snapshot | ✅ Granular |
| T96: Suspensão dos afixos novos | 1 repasse aos 3 donos do estado | ✅ Granular |
| T97: Debug, rótulo e conferência dos afixos | 1 smoke + a linha do README | ✅ Granular |
| T98: Fechamento da F41d | 1 documento de validação | ✅ Granular |
| T99: `TechSignal`, `TechCommand` e o runner | os tipos e os 4 métodos genéricos que os usam | ⚠️ coeso |
| T100: Sinais do Boogie, do Divergente e do Desmantelar | 3 linhas iguais em 3 módulos, um comportamento (soltar o sinal) | ⚠️ coeso |
| T101: Dano principal dos 12 módulos | 1 método curto por módulo, a mesma leitura | ⚠️ coeso |
| T102: Receitas dos seis Duos | 6 entradas de tabela | ✅ Granular |
| T103: Regra dos Duos | 2 funções + 1 constante | ✅ Granular |
| T104: Duo no sorteio das posições 2 e 3 | 1 ponto do sorteio | ✅ Granular |
| T105: Preço e recusa do Duo | a compra e o preço do mesmo item | ⚠️ coeso |
| T106: Fontes novas do emissor | 1 tipo | ✅ Granular |
| T107: Diretor dos Duos | o diretor nasce com o debug e o snapshot que o provam | ⚠️ coeso |
| T108: Troca Explosiva | 1 efeito + o comando que ele manda | ✅ Granular |
| T109: Prego Rubro | 1 efeito + os 2 comandos que manda | ✅ Granular |
| T110: Contra Amaldiçoado | 1 efeito | ✅ Granular |
| T111: Sombra no Contra | 1 efeito + a vista curta dele | ✅ Granular |
| T112: Ordem Elétrica | 1 efeito | ✅ Granular |
| T113: Impacto Elétrico | 1 efeito | ✅ Granular |
| T114: Duos na loja e conferência | 6 entradas + os casos de loja no smoke | ✅ Granular |
| T115: Receitas das três Evoluções e a porta `combo` | 3 entradas + a porta de 1 linha que os módulos leem | ⚠️ coeso |
| T116: Regra das marcas e das poças | 2 classes pequenas das Evoluções | ✅ Granular |
| T117: Rede de Cortes | 1 módulo da evolução + a linha do `broadcast` | ✅ Granular |
| T118: Sangue Eterno | 1 módulo da evolução | ✅ Granular |
| T119: Palavra no Ponto Fraco | 1 módulo da evolução + a fonte de crítico que ele liga | ✅ Granular |
| T120: `evo=` e conferência das Evoluções | 1 smoke + a linha do README | ✅ Granular |
| T121: Fechamento da F41 | o fechamento da feature (validação, mapa e handoff) | ⚠️ coeso |

Os ⚠️ juntam o que não se prova separado (merge forward da skill): a entrada de uma técnica que o LVX-05 pede num commit, um diretor que nasce com o 1º efeito que o prova, ou uma chamada de 1 linha junto da vista que ela liga. Nenhuma tarefa junta dois comportamentos independentes.

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | — | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | None | — | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |
| T7 | None | — | ✅ Match |
| T8 | None | — | ✅ Match |
| T9 | None | — | ✅ Match |
| T10 | T5, T6, T8 | T5 → T10, T6 → T10, T8 → T10 | ✅ Match |
| T11 | None | — | ✅ Match |
| T12 | None | — | ✅ Match |
| T13 | T12 | T12 → T13 | ✅ Match |
| T14 | T11, T13, T3 (fase 1), T7 (fase 1), T9 (fase 1), T10 (fase 1) | T11 → T14, T13 → T14, T3 → T14 (fase 1), T7 → T14 (fase 1), T9 → T14 (fase 1), T10 → T14 (fase 1) | ✅ Match |
| T15 | T14 | T14 → T15 | ✅ Match |
| T16 | T12 (fase 2) | T12 → T16 (fase 2) | ✅ Match |
| T17 | None | — | ✅ Match |
| T18 | T16, T17 | T16 → T18, T17 → T18 | ✅ Match |
| T19 | None | — | ✅ Match |
| T20 | T18, T10 (fase 1), T11 (fase 2) | T18 → T20, T10 → T20 (fase 1), T11 → T20 (fase 2) | ✅ Match |
| T21 | T19, T20 | T19 → T21, T20 → T21 | ✅ Match |
| T22 | T12 (fase 2) | T12 → T22 (fase 2) | ✅ Match |
| T23 | T22 | T22 → T23 | ✅ Match |
| T24 | T23, T4 (fase 1), T10 (fase 1), T11 (fase 2) | T23 → T24, T4 → T24 (fase 1), T10 → T24 (fase 1), T11 → T24 (fase 2) | ✅ Match |
| T25 | T24 | T24 → T25 | ✅ Match |
| T26 | T12 (fase 2) | T12 → T26 (fase 2) | ✅ Match |
| T27 | None | — | ✅ Match |
| T28 | T26, T27 | T26 → T28, T27 → T28 | ✅ Match |
| T29 | T28, T10 (fase 1), T11 (fase 2) | T28 → T29, T10 → T29 (fase 1), T11 → T29 (fase 2) | ✅ Match |
| T30 | T29 | T29 → T30 | ✅ Match |
| T31 | T29 | T29 → T31 | ✅ Match |
| T32 | T30, T31 | T30 → T32, T31 → T32 | ✅ Match |
| T33 | None | — | ✅ Match |
| T34 | None | — | ✅ Match |
| T35 | T33 | T33 → T35 | ✅ Match |
| T36 | T35 | T35 → T36 | ✅ Match |
| T37 | None | — | ✅ Match |
| T38 | None | — | ✅ Match |
| T39 | T38 | T38 → T39 | ✅ Match |
| T40 | T38 | T38 → T40 | ✅ Match |
| T41 | T39 | T39 → T41 | ✅ Match |
| T42 | T41, T34 (fase 6), T35 (fase 6) | T41 → T42, T34 → T42 (fase 6), T35 → T42 (fase 6) | ✅ Match |
| T43 | T41 | T41 → T43 | ✅ Match |
| T44 | T41, T11 (fase 2) | T41 → T44, T11 → T44 (fase 2) | ✅ Match |
| T45 | None | — | ✅ Match |
| T46 | None | — | ✅ Match |
| T47 | T46, T34 (fase 6) | T46 → T47, T34 → T47 (fase 6) | ✅ Match |
| T48 | None | — | ✅ Match |
| T49 | T45 (fase 8), T47 (fase 8), T48 (fase 8), T10 (fase 1) | T45 → T49 (fase 8), T47 → T49 (fase 8), T48 → T49 (fase 8), T10 → T49 (fase 1) | ✅ Match |
| T50 | T49, T35 (fase 6) | T49 → T50, T35 → T50 (fase 6) | ✅ Match |
| T51 | T49 | T49 → T51 | ✅ Match |
| T52 | T51 | T51 → T52 | ✅ Match |
| T53 | T49 | T49 → T53 | ✅ Match |
| T54 | T53 | T53 → T54 | ✅ Match |
| T55 | T49 (fase 9) | T49 → T55 (fase 9) | ✅ Match |
| T56 | T55 | T55 → T56 | ✅ Match |
| T57 | T49 (fase 9) | T49 → T57 (fase 9) | ✅ Match |
| T58 | T57, T37 (fase 6) | T57 → T58, T37 → T58 (fase 6) | ✅ Match |
| T59 | T57 | T57 → T59 | ✅ Match |
| T60 | T56, T58, T59, T50 (fase 9), T52 (fase 9), T54 (fase 9) | T56 → T60, T58 → T60, T59 → T60, T50 → T60 (fase 9), T52 → T60 (fase 9), T54 → T60 (fase 9) | ✅ Match |
| T61 | None | — | ✅ Match |
| T62 | None | — | ✅ Match |
| T63 | T61, T62, T59 (fase 10) | T61 → T63, T62 → T63, T59 → T63 (fase 10) | ✅ Match |
| T64 | T63 | T63 → T64 | ✅ Match |
| T65 | None | — | ✅ Match |
| T66 | None | — | ✅ Match |
| T67 | None | — | ✅ Match |
| T68 | None | — | ✅ Match |
| T69 | T67, T68 | T67 → T69, T68 → T69 | ✅ Match |
| T70 | None | — | ✅ Match |
| T71 | T70, T69 (fase 12), T65 (fase 12) | T70 → T71, T69 → T71 (fase 12), T65 → T71 (fase 12) | ✅ Match |
| T72 | T71 | T71 → T72 | ✅ Match |
| T73 | T72 | T72 → T73 | ✅ Match |
| T74 | T73 | T73 → T74 | ✅ Match |
| T75 | T74 | T74 → T75 | ✅ Match |
| T76 | None | — | ✅ Match |
| T77 | T76 | T76 → T77 | ✅ Match |
| T78 | T76 | T76 → T78 | ✅ Match |
| T79 | T76 | T76 → T79 | ✅ Match |
| T80 | T77, T78, T79 | T77 → T80, T78 → T80, T79 → T80 | ✅ Match |
| T81 | T76 | T76 → T81 | ✅ Match |
| T82 | T77, T66 (fase 12) | T77 → T82, T66 → T82 (fase 12) | ✅ Match |
| T83 | T80, T81, T82 | T80 → T83, T81 → T83, T82 → T83 | ✅ Match |
| T84 | T75 (fase 13), T83 | T75 → T84 (fase 13), T83 → T84 | ✅ Match |
| T85 | None | — | ✅ Match |
| T86 | T85 | T85 → T86 | ✅ Match |
| T87 | T86 | T86 → T87 | ✅ Match |
| T88 | T86 | T86 → T88 | ✅ Match |
| T89 | None | — | ✅ Match |
| T90 | T89 (fase 15) | T89 → T90 (fase 15) | ✅ Match |
| T91 | T90 | T90 → T91 | ✅ Match |
| T92 | T90 | T90 → T92 | ✅ Match |
| T93 | T90, T86 (fase 15) | T90 → T93, T86 → T93 (fase 15) | ✅ Match |
| T94 | T93 | T93 → T94 | ✅ Match |
| T95 | T91, T87 (fase 15), T88 (fase 15) | T91 → T95, T87 → T95 (fase 15), T88 → T95 (fase 15) | ✅ Match |
| T96 | T92, T94, T95 | T92 → T96, T94 → T96, T95 → T96 | ✅ Match |
| T97 | T96 | T96 → T97 | ✅ Match |
| T98 | T97 | T97 → T98 | ✅ Match |
| T99 | None | — | ✅ Match |
| T100 | T99 | T99 → T100 | ✅ Match |
| T101 | T99 | T99 → T101 | ✅ Match |
| T102 | None | — | ✅ Match |
| T103 | T102 | T102 → T103 | ✅ Match |
| T104 | T103 | T103 → T104 | ✅ Match |
| T105 | T103 | T103 → T105 | ✅ Match |
| T106 | None | — | ✅ Match |
| T107 | T103, T99 (fase 17) | T103 → T107, T99 → T107 (fase 17) | ✅ Match |
| T108 | T107 (fase 18), T100 (fase 17) | T107 → T108 (fase 18), T100 → T108 (fase 17) | ✅ Match |
| T109 | T108 | T108 → T109 | ✅ Match |
| T110 | T107 (fase 18), T101 (fase 17), T106 (fase 18) | T107 → T110 (fase 18), T101 → T110 (fase 17), T106 → T110 (fase 18) | ✅ Match |
| T111 | T110 | T110 → T111 | ✅ Match |
| T112 | T107 (fase 18), T100 (fase 17) | T107 → T112 (fase 18), T100 → T112 (fase 17) | ✅ Match |
| T113 | T112, T106 (fase 18) | T112 → T113, T106 → T113 (fase 18) | ✅ Match |
| T114 | T109, T111, T113 | T109 → T114, T111 → T114, T113 → T114 | ✅ Match |
| T115 | None | — | ✅ Match |
| T116 | None | — | ✅ Match |
| T117 | T115, T116 | T115 → T117, T116 → T117 | ✅ Match |
| T118 | T115, T116 | T115 → T118, T116 → T118 | ✅ Match |
| T119 | T115 | T115 → T119 | ✅ Match |
| T120 | T117, T118, T119 | T117 → T120, T118 → T120, T119 → T120 | ✅ Match |
| T121 | T114 (fase 19), T120 | T114 → T121 (fase 19), T120 → T121 | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Regra pura (`src/core/cast.ts`) | unit | unit | ✅ OK |
| T2 | Adaptador/diretor (`src/game/TechCaster.ts`) | smoke | smoke | ✅ OK |
| T3 | Adaptador/diretor (`src/scenes/test/runDirector.ts`) | smoke | smoke | ✅ OK |
| T4 | Adaptador testável (`src/scenes/test/strikeLog.ts`) | unit | unit + smoke | ✅ OK |
| T5 | Adaptador/diretor (`src/game/tech/shared.ts`) | smoke | smoke | ✅ OK |
| T6 | Adaptador testável (`src/game/TechRunner.ts`) | unit | unit + smoke | ✅ OK |
| T7 | Adaptador testável (`src/game/TechSlotsHud.ts`) | unit | unit + smoke | ✅ OK |
| T8 | Regra pura (`src/core/viewFilter.ts`) | unit | unit | ✅ OK |
| T9 | Regra pura (`src/core/leva2Press.ts`) | unit | unit | ✅ OK |
| T10 | Adaptador testável (`src/game/tech/leva2Targets.ts`) | unit | unit | ✅ OK |
| T11 | Arte em código (`src/game/art/hd/icons/leva2Art.ts`) | prancha + unit | unit + prancha | ✅ OK |
| T12 | Regra pura (`src/core/techResolversLeva2.ts`) | unit | unit | ✅ OK |
| T13 | Números e tabelas (`src/data/techAxesLeva2.ts`) | unit | unit | ✅ OK |
| T14 | Adaptador/diretor (`src/game/tech/convergence.ts`) | smoke | unit + smoke | ✅ OK |
| T15 | Vista do motor (`src/game/techFx/ConvergenceFx.ts`) | smoke | smoke | ✅ OK |
| T16 | Regra pura (`src/core/techResolversLeva2.ts`) | unit | unit | ✅ OK |
| T17 | Números e tabelas (`src/data/divineDogs.ts`) | unit | unit | ✅ OK |
| T18 | Números e tabelas (`src/data/techAxesLeva2.ts`) | unit | unit | ✅ OK |
| T19 | Arte em código (`src/game/art/hd/fx/dogsSheet.ts`) | prancha + unit | unit + prancha | ✅ OK |
| T20 | Adaptador/diretor (`src/game/tech/dogs.ts`) | smoke | smoke | ✅ OK |
| T21 | Vista do motor (`src/game/techFx/DogsFx.ts`) | smoke | smoke | ✅ OK |
| T22 | Regra pura (`src/core/techResolversLeva2.ts`) | unit | unit | ✅ OK |
| T23 | Números e tabelas (`src/data/techAxesLeva2.ts`) | unit | unit | ✅ OK |
| T24 | Adaptador/diretor (`src/game/tech/thunder.ts`) | smoke | smoke | ✅ OK |
| T25 | Vista do motor (`src/game/techFx/ThunderFx.ts`) | smoke | smoke | ✅ OK |
| T26 | Regra pura (`src/core/techResolversLeva2.ts`) | unit | unit | ✅ OK |
| T27 | Números e tabelas (`src/data/eruption.ts`) | unit | unit | ✅ OK |
| T28 | Números e tabelas (`src/data/techAxesLeva2.ts`) | unit | unit | ✅ OK |
| T29 | Adaptador/diretor (`src/game/tech/eruption.ts`) | smoke | smoke | ✅ OK |
| T30 | Vista do motor (`src/game/techFx/EruptionFx.ts`) | smoke | smoke | ✅ OK |
| T31 | Smoke (`scripts/smoke/tech-axes.smoke.mjs`) | smoke | smoke | ✅ OK |
| T32 | Documentação (`.specs/features/leva-2/validation.md`) | none | smoke | ✅ OK |
| T33 | Regra pura (`src/core/critRules.ts`) | unit | unit | ✅ OK |
| T34 | Regra pura (`src/core/buildEffects.ts`) | unit | unit | ✅ OK |
| T35 | Adaptador testável (`src/scenes/test/critDirector.ts`) | unit | unit | ✅ OK |
| T36 | Adaptador/diretor (`src/game/Enemy.ts`) | smoke | smoke | ✅ OK |
| T37 | Vista do motor (`src/game/BossBarOverlay.ts`) | smoke | smoke | ✅ OK |
| T38 | Números e tabelas (`src/data/domains.ts`) | unit | unit | ✅ OK |
| T39 | Regra pura (`src/core/voidDomain.ts`) | unit | unit | ✅ OK |
| T40 | Regra pura (`src/core/veilChest.ts`) | unit | unit + smoke | ✅ OK |
| T41 | Adaptador/diretor (`src/scenes/test/domainPowers.ts`) | smoke | smoke | ✅ OK |
| T42 | Adaptador testável (`src/scenes/test/critDirector.ts`) | unit | unit + smoke | ✅ OK |
| T43 | Vista do motor (`src/game/VoidFx.ts`) | smoke | smoke | ✅ OK |
| T44 | Smoke (`scripts/smoke/void-domain.smoke.mjs`) | smoke | smoke | ✅ OK |
| T45 | Arte em código (`src/game/art/hd/talentIcons.ts`) | prancha + unit | unit + prancha | ✅ OK |
| T46 | Números e tabelas (`src/data/perks.ts`) | unit | unit | ✅ OK |
| T47 | Regra pura (`src/core/buildEffects.ts`) | unit | unit | ✅ OK |
| T48 | Regra pura (`src/core/talentsLeva2.ts`) | unit | unit | ✅ OK |
| T49 | Adaptador/diretor (`src/scenes/test/talentsLeva2.ts`) | smoke | smoke | ✅ OK |
| T50 | Adaptador/diretor (`src/scenes/test/talentsLeva2.ts`) | smoke | smoke | ✅ OK |
| T51 | Adaptador/diretor (`src/scenes/test/talentsLeva2.ts`) | smoke | smoke | ✅ OK |
| T52 | Adaptador/diretor (`src/scenes/test/talentsLeva2.ts`) | smoke | smoke | ✅ OK |
| T53 | Adaptador/diretor (`src/scenes/test/talentsLeva2.ts`) | smoke | smoke | ✅ OK |
| T54 | Adaptador/diretor (`src/scenes/test/talentsLeva2.ts`) | smoke | smoke | ✅ OK |
| T55 | Adaptador/diretor (`src/scenes/test/talentsLeva2.ts`) | smoke | smoke | ✅ OK |
| T56 | Adaptador/diretor (`src/game/Player.ts`) | smoke | smoke | ✅ OK |
| T57 | Regra pura (`src/core/bossBrain.ts`) | unit | unit + smoke | ✅ OK |
| T58 | Vista do motor (`src/game/BossBarOverlay.ts`) | smoke | smoke | ✅ OK |
| T59 | Adaptador/diretor (`src/game/Boss.ts`) | smoke | unit + smoke | ✅ OK |
| T60 | Números e tabelas (`src/data/shop.ts`) | unit | unit + smoke | ✅ OK |
| T61 | Regra pura (`src/core/don.ts`) | unit | unit | ✅ OK |
| T62 | Arte em código (`src/game/art/hd/onomatopoeia.ts`) | prancha + unit | unit + prancha | ✅ OK |
| T63 | Vista do motor (`src/game/DonFx.ts`) | smoke | smoke | ✅ OK |
| T64 | Documentação (`.specs/features/leva-2/validation.md`) | none | smoke | ✅ OK |
| T65 | Arte em código (`src/game/art/hd/weaponFx/bone.ts`) | prancha + unit | unit + prancha | ✅ OK |
| T66 | Arte em código (`src/game/art/hd/weapons.ts`) | prancha + unit | unit + prancha | ✅ OK |
| T67 | Regra pura (`src/core/dragonBone.ts`) | unit | unit | ✅ OK |
| T68 | Números e tabelas (`src/data/weapons.ts`) | unit | unit | ✅ OK |
| T69 | Regra pura (`src/core/weaponStats.ts`) | unit | unit | ✅ OK |
| T70 | Adaptador/diretor (`src/scenes/test/combat.ts`) | smoke | smoke | ✅ OK |
| T71 | Adaptador/diretor (`src/scenes/test/ossoCharges.ts`) | smoke | smoke | ✅ OK |
| T72 | Adaptador/diretor (`src/scenes/test/ossoCharges.ts`) | smoke | smoke | ✅ OK |
| T73 | Números e tabelas (`src/data/shop.ts`) | unit | unit + smoke | ✅ OK |
| T74 | Números e tabelas (`src/data/evolutions.ts`) | unit | unit | ✅ OK |
| T75 | Adaptador/diretor (`src/scenes/test/ossoCharges.ts`) | smoke | smoke | ✅ OK |
| T76 | Números e tabelas (`src/data/arsenal.ts`) | unit | unit | ✅ OK |
| T77 | Regra pura (`src/core/arsenal.ts`) | unit | unit | ✅ OK |
| T78 | Regra pura (`src/core/buildEffects.ts`) | unit | unit | ✅ OK |
| T79 | Regra pura (`src/core/bossAffix.ts`) | unit | unit | ✅ OK |
| T80 | Adaptador/diretor (`src/scenes/test/arsenalDirector.ts`) | smoke | smoke | ✅ OK |
| T81 | Regra pura (`src/core/buildAura.ts`) | unit | unit + smoke | ✅ OK |
| T82 | Regra pura (`src/core/buildTray.ts`) | unit | unit + smoke | ✅ OK |
| T83 | Números e tabelas (`src/data/shop.ts`) | unit | unit + smoke | ✅ OK |
| T84 | Documentação (`.specs/features/leva-2/validation.md`) | none | smoke | ✅ OK |
| T85 | Regra pura (`src/core/bossArmor.ts`) | unit | unit | ✅ OK |
| T86 | Regra pura (`src/core/bossBrain.ts`) | unit | unit + smoke | ✅ OK |
| T87 | Regra pura (`src/core/hit.ts`) | unit | unit + smoke | ✅ OK |
| T88 | Adaptador testável (`src/game/TechRunner.ts`) | unit | unit + smoke | ✅ OK |
| T89 | Números e tabelas (`src/data/bossAffixes.ts`) | unit | unit | ✅ OK |
| T90 | Regra pura (`src/core/bossAI.ts`) | unit | unit + smoke | ✅ OK |
| T91 | Regra pura (`src/core/bossAffix.ts`) | unit | unit + smoke | ✅ OK |
| T92 | Regra pura (`src/core/bossAffix.ts`) | unit | unit + smoke | ✅ OK |
| T93 | Regra pura (`src/core/bossTier.ts`) | unit | unit + smoke | ✅ OK |
| T94 | Vista do motor (`src/game/BossBarOverlay.ts`) | smoke | smoke | ✅ OK |
| T95 | Regra pura (`src/core/bossAffix.ts`) | unit | unit + smoke | ✅ OK |
| T96 | Adaptador/diretor (`src/scenes/test/bossDirector.ts`) | smoke | unit + smoke | ✅ OK |
| T97 | Smoke (`scripts/smoke/boss-affix-2.smoke.mjs`) | smoke | smoke | ✅ OK |
| T98 | Documentação (`.specs/features/leva-2/validation.md`) | none | smoke | ✅ OK |
| T99 | Adaptador testável (`src/game/TechRunner.ts`) | unit | unit + smoke | ✅ OK |
| T100 | Adaptador/diretor (`src/game/tech/`) | smoke | smoke | ✅ OK |
| T101 | Adaptador/diretor (`src/game/tech/`) | smoke | unit + smoke | ✅ OK |
| T102 | Números e tabelas (`src/data/evolutions.ts`) | unit | unit | ✅ OK |
| T103 | Regra pura (`src/core/duos.ts`) | unit | unit | ✅ OK |
| T104 | Regra pura (`src/core/shopDraw.ts`) | unit | unit | ✅ OK |
| T105 | Regra pura (`src/core/shop.ts`) | unit | unit | ✅ OK |
| T106 | Regra pura (`src/core/techEmitter.ts`) | unit | unit | ✅ OK |
| T107 | Adaptador/diretor (`src/scenes/test/duoDirector.ts`) | smoke | smoke | ✅ OK |
| T108 | Adaptador/diretor (`src/scenes/test/duoDirector.ts`) | smoke | smoke | ✅ OK |
| T109 | Adaptador/diretor (`src/scenes/test/duoDirector.ts`) | smoke | smoke | ✅ OK |
| T110 | Adaptador/diretor (`src/scenes/test/duoDirector.ts`) | smoke | smoke | ✅ OK |
| T111 | Adaptador/diretor (`src/scenes/test/duoDirector.ts`) | smoke | smoke | ✅ OK |
| T112 | Adaptador/diretor (`src/scenes/test/duoDirector.ts`) | smoke | smoke | ✅ OK |
| T113 | Adaptador/diretor (`src/scenes/test/duoDirector.ts`) | smoke | smoke | ✅ OK |
| T114 | Números e tabelas (`src/data/shop.ts`) | unit | unit + smoke | ✅ OK |
| T115 | Números e tabelas (`src/data/evolutions.ts`) | unit | unit + smoke | ✅ OK |
| T116 | Regra pura (`src/core/evolutionsLeva2.ts`) | unit | unit | ✅ OK |
| T117 | Adaptador/diretor (`src/game/tech/cutMarks.ts`) | smoke | smoke | ✅ OK |
| T118 | Adaptador/diretor (`src/game/tech/convergenceBlood.ts`) | smoke | smoke | ✅ OK |
| T119 | Adaptador/diretor (`src/game/tech/speechWeak.ts`) | smoke | smoke | ✅ OK |
| T120 | Smoke (`scripts/smoke/duos.smoke.mjs`) | smoke | smoke | ✅ OK |
| T121 | Documentação (`.specs/features/leva-2/validation.md`) | none | smoke | ✅ OK |

As tarefas de documentação (T32, T64, T84, T98, T121) rodam os smokes da sub-fase como prova do fechamento; a matriz não pede teste para o documento em si.
