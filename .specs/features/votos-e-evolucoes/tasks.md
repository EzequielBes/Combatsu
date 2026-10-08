# Votos e evoluções — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/votos-e-evolucoes/spec.md`
**Design**: `.specs/features/votos-e-evolucoes/design.md`
**Status**: In Progress
**Branch**: `feat/votos-e-evolucoes` (a partir do `master` em `a6e609a`)
**Modelos**: Opus 5.5 executa inline (há arte: painel, glifo e a esfera) e despacha o Verifier no fim.

---

## Test Coverage Matrix

> Guidelines: `.oxlintrc.json`, `CLAUDE.md`; lições L-010, L-043, L-069, L-070, L-072, L-073, L-076 (campo de debug que só repete a entrada não prova o efeito), L-077, L-078.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Regra pura (`src/core/**`, `src/data/**`) | unit | 1:1 com os ACs; limiares nos dois lados (L-010) | `tests/core/*.test.ts`, `tests/data/*.test.ts` | `npm test` |
| Arte pura (`src/game/art/**`, cores de fx) | unit | Só cores da `PALETTE`, frames presentes | `tests/game/art/*.test.ts` | `npm test` |
| Adaptadores (`src/scenes/**`, `src/game/**`) | smoke | Efeito lido do jogo vivo (L-043, L-076) | `scripts/smoke/vows.smoke.mjs`, `evolution.smoke.mjs` | `npm run smoke -- <nome>` |
| Ferramentas | none | build gate only | - | - |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tasks com testes unitários | `npm run gate` |
| Full | Tasks de adaptador e a última de cada fase | `npm run gate && npm run smoke -- <smoke da task>` |
| Build | Ferramenta | `npm run gate` |

Base: 2814 testes unitários em `a6e609a`.

---

## Execution Plan

### Phase 1: Regra dos votos

```
T1 → T2
```

### Phase 2: Votos no combate

```
T3 → T4 → T5
```

### Phase 3: Painel de votos

```
T6 → T7
```

### Phase 4: Regra da evolução

```
T8 → T9 → T10
```

### Phase 5: Vazio Roxo

```
T11 → T12 → T13 → T14 → T15
```

---

## Task Breakdown

### T1: Votos tomados e sorteio

**What**: `src/data/vows.ts` (os 8 votos e seus números) e `Vows` + `drawVows(rng, tomados, n)` em `src/core/vows.ts`.
**Where**: `src/core/vows.ts`
**Depends on**: None
**Reuses**: `Rng`
**Requirement**: VOW-05, VOW-06, VOW-07, VOW-08

**Done when**:

- [ ] Testes: nunca repete voto tomado; com 2 restantes oferece 2, com 0 oferece 0; mesma seed e mesmos tomados dão o mesmo sorteio; `reset` limpa
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): add the binding vows and their seeded draw`

---

### T2: Efeitos agregados dos votos

**What**: `vowEffects(tomados, { kills })` com todos os multiplicadores e chaves da spec.
**Where**: `src/core/vows.ts`
**Depends on**: T1
**Reuses**: `VOWS`
**Requirement**: VOW-10..VOW-18

**Done when**:

- [ ] Um teste por voto com os números da spec; Fúria em 0, 1, 15 e 16 abates (teto de 45%); dois votos no mesmo número se multiplicam
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): aggregate the vow effects`

---

### T3: Diretor de votos

**What**: `VowDirector`: votos da run, stream de sorteio pela seed, `reset` na run nova, `?debug&vows=a,b`, campo `vows` do snapshot (tomados, ofertas, efeitos).
**Where**: `src/scenes/test/vowDirector.ts`
**Depends on**: None (fase anterior concluída)
**Reuses**: `BuildDirector`
**Requirement**: VOW-08, VOW-09

**Done when**:

- [ ] Smoke (`vows.smoke.mjs`, primeiro cenário): `?debug&vows=corpoDeVidro` aparece no snapshot e some numa run nova
- [ ] Gate verde e smoke verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(scene): track the run vows in a director`

---

### T4: Votos no dano

**What**: Ganchos de dano: golpe corpo a corpo (`damageMul` da cena), técnica (`loadout.damageMul` montado num lugar só), custo de técnica (`Loadout.costMul`), dano sofrido (`Player.damageTakenMul`), Fúria pelos abates da rodada.
**Where**: `src/scenes/test/vowDirector.ts`
**Depends on**: T3
**Reuses**: `relicTechMul`
**Requirement**: VOW-10, VOW-11, VOW-12, VOW-13, VOW-15, VOW-16, VOW-17

**Done when**:

- [ ] Teste unitário de `Loadout.cost` com `costMul`
- [ ] Smoke lê do jogo vivo: dano do golpe forte com Sem guarda, custo da técnica com Fluxo selado, dano sofrido com Pele de pedra
- [ ] Gate verde e smoke verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(scene): apply the vows to dealt and taken damage`

---

### T5: Votos na defesa, na cura e nos fragmentos

**What**: Guarda desligada (Sem guarda), Reversa (Fluxo selado e Cura proibida), regeneração (Fúria), fragmentos (Ganância) e vida máxima (Corpo de vidro, inclusive ao comprar `vida`).
**Where**: `src/scenes/test/recovery.ts`
**Depends on**: T4
**Reuses**: `Recovery`, `Drops`
**Requirement**: VOW-10, VOW-11, VOW-13, VOW-14, VOW-15, VOW-16

**Done when**:

- [ ] Smoke lê do jogo vivo: vida máxima 60 com Corpo de vidro (e o hp limitado), guarda que não sobe com Sem guarda, Reversa sem cura com Fluxo selado e só abaixo de 30% com Cura proibida
- [ ] Gate verde e smoke verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(scene): apply the vows to guard, healing and fragments`

---

### T6: Painel de votos

**What**: `VowPanel`: três cartas com o nome, a vantagem em verde e o custo em vermelho, teclas 1..3 e Enter para recusar, na câmera de UI.
**Where**: `src/game/VowPanel.ts`
**Depends on**: None (fase anterior concluída)
**Reuses**: `ShopPanel` (molde), `HUD_TEXT_STYLE`
**Requirement**: VOW-01

**Done when**:

- [ ] Captura olhada
- [ ] Gate verde

**Tests**: none
**Gate**: build
**Commit**: `feat(ui): add the vow panel`

---

### T7: Voto depois do chefe

**What**: O `ShopDirector` abre o painel antes da loja depois de uma rodada de chefe; escolher (1..3) ou recusar (Enter) abre a loja; depois de rodada comum vai direto para a loja.
**Where**: `src/scenes/test/shopDirector.ts`
**Depends on**: T6
**Reuses**: `ShopInput`
**Requirement**: VOW-01, VOW-02, VOW-03, VOW-04, VOW-06

**Done when**:

- [ ] Smoke: vence o chefe na rodada 5, o painel abre com 3 votos distintos, a tecla 2 toma o segundo e abre a loja; numa segunda carga Enter recusa; a loja da rodada 1 abre sem painel
- [ ] Gate verde e smoke verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(shop): offer a vow before the shop after each boss`

---

### T8: Técnica Vazio Roxo nos dados

**What**: `TechId` ganha `roxo`, `TECHNIQUES.roxo` (custo 70, recarga 6000 ms, dano 60); `?debug&tech=azul:3,vermelho:3` equipa com nível.
**Where**: `src/data/techniques.ts`
**Depends on**: None (fase anterior concluída)
**Reuses**: `TECHNIQUES`
**Requirement**: EVO-07

**Done when**:

- [ ] Teste dos números do Vazio Roxo; teste do parser de `tech` com nível
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(data): add the Hollow Purple technique`

---

### T9: Receita e fusão

**What**: `src/data/evolutions.ts` e `src/core/evolution.ts`: `recipeReady` e `Loadout.evolve` (técnica nova no slot da primeira, o outro slot vazio).
**Where**: `src/core/evolution.ts`
**Depends on**: T8
**Reuses**: `Loadout`
**Requirement**: EVO-01, EVO-02, EVO-03

**Done when**:

- [ ] Testes: pronta só com as duas no nível 3 (nível 2 numa delas não); fusão em qualquer ordem de slots
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): fuse two max-level techniques by recipe`

---

### T10: Evolução na loja

**What**: Entrada `evolution` no catálogo (60 fragmentos, uma vez por run), elegível só com a receita pronta; com a evolução equipada, Azul e Vermelho não voltam à loja.
**Where**: `src/core/shop.ts`
**Depends on**: T9
**Reuses**: `eligible`, `BuyContext`
**Requirement**: EVO-01, EVO-02, EVO-04

**Done when**:

- [ ] Testes da elegibilidade, do preço, da venda única e do edge case
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(shop): sell the evolution when its recipe is ready`

---

### T11: Glifo 紫

**What**: Frame `murasaki` (紫) na folha de kanji, rasterizado como os outros, em `U`/`v`; aura roxa da conjuração.
**Where**: `src/game/art/sprites/kanji.ts`
**Depends on**: None (fase anterior concluída)
**Reuses**: `tools/` (rasterização)
**Requirement**: EVO-08

**Done when**:

- [ ] Teste: frame 24x24 só com cores da `PALETTE`
- [ ] Prancha olhada
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(art): add the murasaki kanji for Hollow Purple`

---

### T12: Esfera do Vazio Roxo

**What**: `PurpleSphere` pura: posição pelo tempo (180 px/s por 1600 ms) e cada alvo tocado uma vez.
**Where**: `src/core/purple.ts`
**Depends on**: T11
**Reuses**: -
**Requirement**: EVO-05, EVO-06

**Done when**:

- [ ] Testes: posição aos 0, 800 e 1600 ms; some depois de 1600 ms; o mesmo alvo nunca duas vezes; alvo fora do raio não é tocado
- [ ] Gate verde

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): move the Hollow Purple sphere and hit each target once`

---

### T13: Vazio Roxo em jogo

**What**: `PurpleTech` (liga a esfera a inimigos e chefe, dano 60 escalado), `PurpleOrbFx` (esfera, núcleo, anel, rastro) e a ligação no `TechRunner`.
**Where**: `src/game/tech/purple.ts`
**Depends on**: T12
**Reuses**: `CutTech` (molde)
**Requirement**: EVO-05, EVO-06, EVO-08

**Done when**:

- [ ] Captura olhada
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `feat(tech): cast Hollow Purple`

---

### T14: Smoke da evolução

**What**: `scripts/smoke/evolution.smoke.mjs` (HD): com `tech=azul:3,vermelho:3` e fragmentos, a loja oferece o Vazio Roxo; comprar funde os slots; conjurar acerta cada inimigo de uma fila uma vez com o dano da spec.
**Where**: `scripts/smoke/evolution.smoke.mjs`
**Depends on**: T13
**Reuses**: `fight-kit.mjs`
**Requirement**: EVO-01, EVO-03, EVO-05, EVO-06

**Done when**:

- [ ] Smoke verde
- [ ] Gate verde

**Tests**: smoke
**Gate**: full
**Commit**: `test(smoke): cover the Hollow Purple evolution`

---

### T15: Captura

**What**: Cenário `votos` em `tools/visual-shots-hd.mjs`: o painel de votos e o Vazio Roxo em voo.
**Where**: `tools/visual-shots-hd.mjs`
**Depends on**: T14
**Reuses**: `sceneryScenario`
**Requirement**: VOW-01

**Done when**:

- [ ] Capturas olhadas
- [ ] Gate verde

**Tests**: none
**Gate**: build
**Commit**: `chore(tools): capture the vow panel and Hollow Purple`
