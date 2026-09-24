# Fundação da expansão: RNG, cura, harness e refinamento Jev — Specification

## Problem Statement

A expansão roguelite (`.specs/ROADMAP.md`) precisa de quatro peças que ainda não existem. A primeira é aleatoriedade reproduzível para testar ondas, drops e loja em Node (AD-006). A segunda é uma forma de curar o player: `Health` só perde vida e renasce cheio. A terceira é a morte do inimigo chegar à cena: o `EnemyBrain` emite `died`, mas `Enemy.handle` ignora (`src/game/Enemy.ts:188-197`). A quarta é um smoke headless versionado. O da feature anterior existiu só no scratchpad do Verifier, então a camada Phaser ficou sem verificação reproduzível.

Além disso, o usuário quer que as stories passem por um refinamento com o Jev antes da aprovação (AD-007). Sem essa base, cada feature seguinte teria de reinventar essas peças.

## Goals

- [ ] Toda aleatoriedade de gameplay vem de um RNG com seed, com sequência idêntica para a mesma seed.
- [ ] `Health` cura com teto em `maxHp`, e a cena é notificada uma única vez por inimigo morto.
- [ ] `npm run smoke` roda cenários headless versionados contra o build e falha quando um cenário falha.
- [ ] `node tools/jev-refine.mjs <spec>` gera um `refinement.md` com os julgamentos do Jev por AC, sem nunca expor a chave.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Qualquer mecânica nova de gameplay (rodada, moeda, loja) | São F1–F6; aqui só entra a base que elas usam |
| Uso do Jev dentro do jogo | AD-007: o jogo não depende de rede |
| Smoke em Chrome/Firefox ou em CI | Não pedido; a máquina do usuário tem Edge |
| Reescrever os ACs automaticamente com IA | O refinamento é consultivo; quem reescreve é o autor da spec |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Algoritmo do RNG | mulberry32 (estado de 32 bits, seed inteira) | Pequeno, rápido, determinístico e suficiente para jogo | y |
| Navegador do smoke | `puppeteer-core` com o Edge instalado (caminhos padrão do Windows, ou `EDGE_PATH`) | O usuário tem Edge; `puppeteer-core` não baixa navegador | y |
| Servidor do smoke | `vite preview` sobre o `dist/` do `npm run build`, numa porta livre | Testa o build real, sem HMR | y |
| Forma do `window.__game` | `snapshot()` e `step(ms)`, só com `?debug` | Padrão do harness usado pelo Verifier anterior; não vaza para o jogo normal (FIX-01) | y |
| Linguagem da ferramenta Jev | Node ESM (`.mjs`), `fetch` nativo, sem dependência nova | Mesmo runtime do projeto; testável no Vitest | y |
| Origem da chave | `TYPESAFE_API_KEY` do ambiente; se ausente, linha `TYPESAFE_API_KEY=` de `.env.local` | AD-007; `.env.local` fica no `.gitignore` | y |
| Limiares de flag do Jev | ambiguous > 0,6; bundled > 0,6; testable < 0,6; precision < 2 (de 0–3) | Calibrado na 1ª rodada (24/09) sobre 45 ACs de F0/F1: `ambiguous` ficou entre 0,39 e 0,59 até em ACs claros, e os casos reais ficaram ≥ 0,65; com 0,5, 31 de 45 eram sinalizados | y |
| Concorrência das chamadas ao Jev | Até 4 ACs em paralelo | Evita rate limit sem deixar o relatório lento | y |

**Open questions:** none - all resolved or logged above.

**Implicit-requirement dimensions sweep (Medium):**
- External-dependency failure: coberta por FND-15..FND-17 e FND-24 (API do Jev) e FND-12 (Edge ausente).
- Input validation & bounds: coberta por FND-02, FND-03, FND-07, FND-20 e FND-21.
- State-transition integrity: coberta por FND-06 (cura com o player morto).
- Idempotency: coberta por FND-08 (uma notificação por morte).
- Auth boundaries: coberta por FND-18 e FND-19 (chave nunca exposta).
- Remaining dimensions N/A for this scope: não há persistência de jogo nem concorrência além das chamadas HTTP limitadas.

---

## User Stories

### P1: Aleatoriedade reproduzível ⭐ MVP

**User Story**: Como desenvolvedor, quero um RNG com seed para testar ondas, drops e loja de forma determinística e reproduzir uma run pela seed.

**Why P1**: F1, F3 e F4 sorteiam coisas; sem isso os testes delas ficam instáveis.

**Acceptance Criteria**:

1. FND-01: WHEN two `Rng` instances are created with the same integer seed THEN the first 1000 values of `next()` SHALL be identical in both.
2. FND-02: The `Rng` SHALL return every `next()` value in the interval [0, 1).
3. FND-20: The `Rng` SHALL return every `int(min, max)` value as an integer within [min, max] inclusive.
4. FND-03: WHEN `chance(p)` is called with `p <= 0` THEN the `Rng` SHALL return `false`.
5. FND-21: WHEN `chance(p)` is called with `p >= 1` THEN the `Rng` SHALL return `true`.
6. FND-04: The source files under `src/core` and `src/data` SHALL contain no reference to `Math.random` (verificado por um teste que lê os arquivos).

**Independent Test**: `npm test` roda os testes do `rng.test.ts` e o teste de varredura de `Math.random`.

---

### P1: Cura e morte do inimigo visível para a cena ⭐ MVP

**User Story**: Como desenvolvedor, quero curar o player e ser avisado quando um inimigo morre, para construir cura ao abater, drops e contagem de rodada.

**Why P1**: F1 conta abates e F3 cura ao abater; as duas dependem disso.

**Acceptance Criteria**:

1. FND-05: WHEN `heal(n)` is called on a living `Health` with hp `h` THEN the `Health` SHALL set hp to `min(maxHp, h + n)` and return the amount actually restored.
2. FND-06: IF `heal(n)` is called while the `Health` is dead THEN the `Health` SHALL keep hp at 0 and return 0.
3. FND-07: IF `heal(n)` is called with `n <= 0` or a non-finite `n` THEN the `Health` SHALL keep hp unchanged and return 0.
4. FND-08: WHEN an enemy's `EnemyBrain` emits `died` THEN the enemy adapter SHALL call the scene's `onEnemyDied(enemyId, x, y)` exactly once for that enemy, with its world position at that frame (in `?debug`, the snapshot `events` gains exactly one `enemyDied:<enemyId>` entry).

**Independent Test**: `health.test.ts` cobre FND-05..07; o smoke `enemy-died.smoke.mjs` mata um inimigo em `?debug` e confere uma notificação no snapshot.

---

### P1: Smoke headless versionado ⭐ MVP

**User Story**: Como desenvolvedor, quero rodar `npm run smoke` e ver o jogo real ser exercitado sem abrir o navegador, para validar a camada Phaser das features seguintes.

**Why P1**: AD-001 deixa a camada Phaser só com smoke; sem harness no repo, essa verificação não é reproduzível.

**Acceptance Criteria**:

1. FND-09: WHERE the URL has `?debug` the game SHALL expose `window.__game.snapshot()`, returning `{ player: { x, y, hp, dead }, enemies: [{ id, x, y, hp, state }], events: string[] }`.
2. FND-22: WHERE the URL has `?debug`, calling `window.__game.step(ms)` SHALL advance the game simulation by `ms` milliseconds in fixed steps of 1000/60 ms, before returning.
3. FND-10: WHERE the URL has no `?debug` the game SHALL leave `window.__game` undefined.
4. FND-23: WHEN `npm run smoke` runs THEN the harness SHALL run `npm run build`, serve `dist/` with `vite preview` and execute each `scripts/smoke/*.smoke.mjs` file once in headless Edge.
5. FND-11: WHEN all smoke scenarios have run THEN the harness SHALL exit with code 0 if every scenario passed and with code 1 if at least one failed, printing the name of each failed scenario.
6. FND-12: IF no Edge executable is found at `EDGE_PATH` or at the default Windows install paths THEN the harness SHALL exit with code 2 and print the paths it searched.

**Independent Test**: `npm run smoke` passa com os cenários `boot.smoke.mjs` (player e inimigos no snapshot) e `enemy-died.smoke.mjs`; com `EDGE_PATH` inválido e sem Edge nos caminhos padrão, sai com código 2.

---

### P1: Refinamento de stories com o Jev ⭐ MVP

**User Story**: Como autor de specs, quero que cada AC seja julgado pelo Jev quanto a ambiguidade, agrupamento, testabilidade e precisão, para corrigir ACs fracos antes de pedir aprovação.

**Why P1**: Pedido do usuário (AD-007); as specs de F1 em diante passam por isso.

**Acceptance Criteria**:

1. FND-13: WHEN `node tools/jev-refine.mjs <spec.md>` runs and the API accepts the key THEN the tool SHALL write `refinement.md` in the spec's folder with one row per AC containing its ID, the values of `ambiguous`, `bundled`, `testable` and `precision`, and the names of the judgments that flagged it (or `ok`).
2. FND-14: The tool SHALL flag an AC exactly when `ambiguous > 0.6` or `bundled > 0.6` or `testable < 0.6` or `precision < 2`.
3. FND-15: IF no key is found in `TYPESAFE_API_KEY` or `.env.local` THEN the tool SHALL print a warning, write no file and exit with code 0.
4. FND-16: IF the API answers 429 or 529 THEN the tool SHALL retry that request up to 3 times, waiting 1 s before the first retry, 2 s before the second and 4 s before the third.
5. FND-24: IF the third retry of a request also fails THEN the tool SHALL write that AC's row as `erro <status>` and continue with the other ACs.
6. FND-17: IF the API answers 401 or 422 THEN the tool SHALL stop, print the status and the API message, and exit with code 1.
7. FND-18: The tool SHALL never write the API key to stdout, stderr or any file.
8. FND-19: The repository `.gitignore` SHALL contain `.env.local`.

**Independent Test**: testes unitários do parser de ACs e da regra de flag (sem rede, com `fetch` falso cobrindo 200, 429 e 401); execução real contra `.specs/features/run-e-rodadas/spec.md` gera `refinement.md`.

---

## Edge Cases

- IF a spec has no line matching `ID: WHEN|WHILE|WHERE|IF|The … SHALL` THEN the Jev tool SHALL exit with code 1 and the message `nenhum AC encontrado`.
- WHEN `int(min, max)` is called with `min === max` THEN the `Rng` SHALL return `min`.
- IF `heal` would exceed `maxHp` THEN the `Health` SHALL return only the part that fit (e.g. hp 95/100, `heal(10)` returns 5).
- WHEN two enemies die in the same frame THEN the scene SHALL receive two notifications, one per enemy.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| FND-01 | P1: Aleatoriedade reproduzível | Specify | Implementing |
| FND-02 | P1: Aleatoriedade reproduzível | Specify | Implementing |
| FND-20 | P1: Aleatoriedade reproduzível | Specify | Implementing |
| FND-03 | P1: Aleatoriedade reproduzível | Specify | Implementing |
| FND-21 | P1: Aleatoriedade reproduzível | Specify | Implementing |
| FND-04 | P1: Aleatoriedade reproduzível | Specify | Pending |
| FND-05 | P1: Cura e morte do inimigo | Specify | Pending |
| FND-06 | P1: Cura e morte do inimigo | Specify | Pending |
| FND-07 | P1: Cura e morte do inimigo | Specify | Pending |
| FND-08 | P1: Cura e morte do inimigo | Specify | Pending |
| FND-09 | P1: Smoke headless versionado | Specify | Pending |
| FND-22 | P1: Smoke headless versionado | Specify | Pending |
| FND-10 | P1: Smoke headless versionado | Specify | Pending |
| FND-11 | P1: Smoke headless versionado | Specify | Pending |
| FND-23 | P1: Smoke headless versionado | Specify | Pending |
| FND-12 | P1: Smoke headless versionado | Specify | Pending |
| FND-13 | P1: Refinamento com o Jev | Specify | Pending |
| FND-14 | P1: Refinamento com o Jev | Specify | Pending |
| FND-15 | P1: Refinamento com o Jev | Specify | Pending |
| FND-16 | P1: Refinamento com o Jev | Specify | Pending |
| FND-24 | P1: Refinamento com o Jev | Specify | Pending |
| FND-17 | P1: Refinamento com o Jev | Specify | Pending |
| FND-18 | P1: Refinamento com o Jev | Specify | Pending |
| FND-19 | P1: Refinamento com o Jev | Specify | Pending |

**Coverage:** 24 total, 0 mapped to tasks, 24 unmapped ⚠️ (Tasks ainda não criadas)

---

## Success Criteria

- [ ] `npm test` e `npm run smoke` passam com os cenários desta feature.
- [ ] O refinamento Jev da spec de F1 é gerado e revisado antes de F1 ser aprovada.
- [ ] Nenhum arquivo versionado contém a chave da TypeSafe.
