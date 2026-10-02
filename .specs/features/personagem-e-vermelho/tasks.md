# Personagem e Vermelho — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/personagem-e-vermelho/spec.md`
**Design**: `.specs/features/personagem-e-vermelho/design.md`
**Status**: Approved
**Branch**: `feat/personagem-e-vermelho` (worktree `scratchpad/wt-f10`, a partir de `dev`)
**Modelos**: workers e Verifier em Sonnet 5.5

---

## Test Coverage Matrix

> Guidelines: `vitest.config.ts`; AD-002/009/012/017; L-010 (os dois lados de cada limiar); L-043 (testar a chamada do adaptador).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Arte pura (`src/game/art/**`, `src/game/techFx/redPalette.ts`) | unit | Invariantes medidas em **todos** os frames; valores exatos da spec | `tests/game/*.test.ts` | `npm test` |
| Lógica pura (`src/core/redOrb.ts`) | unit | 1:1 com os ACs; limiares 80/81 e 48/49 | `tests/core/redOrb.test.ts` | `npm test` |
| Adaptadores Phaser (`RedOrbFx`, `TechRunner`, `debugApi`) | smoke | Valores vivos lidos do snapshot; `none` nas tasks de adaptador, cobertas pelo T13 | `scripts/smoke/red-anime.smoke.mjs` | `npm run smoke` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Tasks com testes unitários | `npm run typecheck && npm test` |
| Build | Tasks de adaptador e a última de cada fase | `npm run build && npm test` |
| Full | Task de smoke | `npm run build && npm test && npm run smoke` |

---

## Execution Plan

### Phase 1: Folha do player consistente

```
T1 → T2 → T3 → T4 → T5
```

### Phase 2: Vermelho (núcleo puro e arte)

```
T6 → T7 → T8 → T9
```

### Phase 3: Vermelho no jogo e smoke

```
T10 → T11 → T12 → T13
```

---

## Task Breakdown

### T1: Compose conta pixels cortados

**What**: Expor a contagem de pixels opacos descartados pelo `compose` (fora da grade) sem mudar o retorno público.
**Where**: `src/game/art/sprites/player.ts`
**Depends on**: None
**Reuses**: `compose`
**Requirement**: SPF-02
**Done when**:
- [x] Teste: uma parte com 3 pixels opacos em x = −1 gera `clipped = 3`; uma parte inteira dentro da grade gera 0.
**Tests**: unit
**Gate**: quick

---

### T2: Golpes sem salto, perna solta ou corte

**What**: Corrigir:
- `chuteGiratorio-hit`: espelhar só as partes;
- `chuteGiratorio-wind` e `chuteCarregado-wind`: pernas no quadril;
- `chuteEmpurrao-hit`: braço dentro da grade;
- `ganchoAscendente-hit`: cabeça.

**Where**: `src/game/art/sprites/playerMoves.ts`
**Depends on**: T1
**Reuses**: `pose`, `recolor`, `mirror` nas partes
**Requirement**: SPF-01, SPF-02, SPF-03, SPF-04
**Done when**:
- [x] Teste focado nesses 5 frames:
  - SPF-01: um componente, ignorando `S`;
  - SPF-02: `clipped = 0`;
  - SPF-04: centro do uniforme do giratório a ≤ 4 da coluna 10;
  - SPF-03: nas sequências `chuteGiratorio` e `chuteCarregado`.
**Tests**: unit
**Gate**: quick

---

### T3: Pouso e pulo corrigidos

**What**: `land-1` com altura ≤ `idle-0` e `jump-0` com o braço de trás conectado.
**Where**: `src/game/art/sprites/player.ts`
**Depends on**: T2
**Reuses**: `pose`
**Requirement**: SPF-01, SPF-05
**Done when**:
- [x] Teste: altura opaca de `land-1` ≤ altura de `idle-0`.
- [x] Teste: `jump-0` com um único componente.
**Tests**: unit
**Gate**: quick

---

### T4: Mão do pulso no tom do braço de trás

**What**: `WRIST_GRIP` passa pelo `far()` nos frames do Vermelho.
**Where**: `src/game/art/sprites/playerTech.ts`
**Depends on**: T3
**Reuses**: `far()`/`recolor`
**Requirement**: SPF-06
**Done when**:
- [x] Teste: nenhum pixel da região `WRIST_GRIP` nos frames `vermelho-charge-*` usa `p`.
**Tests**: unit
**Gate**: quick

---

### T5: Invariantes em todas as folhas e baseline

**What**: Criar o teste de invariantes que percorre todos os frames do player (SPF-01, SPF-02, SPF-03, SPF-05) e atualizar `playerBBoxBaseline.json` só nos frames corrigidos.
**Where**: `tests/game/playerConsistency.test.ts`
**Depends on**: T4
**Reuses**: as folhas registradas em `src/game/art/index.ts`
**Requirement**: SPF-01, SPF-02, SPF-03, SPF-05, SPF-07
**Done when**:
- [x] O teste passa em todos os frames.
- [x] O diff do baseline lista só os frames de T2–T4.
- [x] Se um frame legítimo violar SPF-01/03: PARAR e reportar (design §1).
**Tests**: unit
**Gate**: build

---

### T6: Paleta com carmim e magenta

**What**: Acrescentar `t: 0xd1103a` e `T: 0xff4f8b` à `PALETTE` e subir o teto do teste para 42.
**Where**: `src/game/art/palette.ts`
**Depends on**: None (fase 2 começa após a fase 1)
**Reuses**: `PALETTE`
**Requirement**: RDA-01
**Done when**:
- [x] `tests/game/art.test.ts` exige exatamente 42 cores, com `t` e `T` nesses valores.
**Tests**: unit
**Gate**: quick

---

### T7: Orbe carmim e cores do efeito

**What**: Trocar a rampa do orbe para `W`/`T`/`R`/`t` e criar `RED_FX_COLORS` em `src/game/techFx/redPalette.ts`.
**Where**: `src/game/art/sprites/techFx.ts`
**Depends on**: T6
**Reuses**: `disc()`
**Requirement**: RDA-02, RDA-03, RDA-14
**Done when**:
- [x] Testes: os frames de 8 e 12 têm `W` no centro e passam por `T`, `R` e `t` (borda).
- [x] Testes: nenhum frame do orbe contém `a` ou `A`.
- [x] Testes: todas as chaves de `RED_FX_COLORS` estão em {`b`, `t`, `T`, `R`, `W`}.
**Tests**: unit
**Gate**: quick

---

### T8: Ponta dos dedos por frame

**What**: Criar `redFingertip(frameName)` e `fingertipOffsetPx(frameName, facing)`.
**Where**: `src/game/art/sprites/playerTech.ts`
**Depends on**: T7
**Reuses**: `PLAYER_ORIGIN`, `ART_SCALE`
**Requirement**: RDA-04
**Done when**:
- [x] Testes nos 3 frames (sign, charge, release):
  - o pixel devolvido é `R`;
  - é o de maior coluna do braço;
  - o offset é espelhado com `facing = −1`.
**Tests**: unit
**Gate**: quick

---

### T9: Repulsão e velocidade no núcleo

**What**: `SPEED = 760` e `repulseTargets(origin, facing, targets)`.
**Where**: `src/core/redOrb.ts`
**Depends on**: T8
**Reuses**: `normalize`
**Requirement**: RDA-08, RDA-09, RDA-11, EDG-03
**Done when**:
- [x] Testes:
  - 80 px entra, 81 px não;
  - `dy` de 48 entra, 49 não;
  - alvo atrás não entra;
  - `dx = 0` não entra;
  - o hit é `{ damage: 4, strength: light, force: 10 }` com direção para longe;
  - o orbe percorre 760 px em 1000 ms.
**Tests**: unit
**Gate**: build

---

### T10: Efeito carmim, distorção, repulsão e rastro

**What**: Atualizar o `RedOrbFx`:
- âncora por frame;
- anel `t`;
- Glow `t` só com WebGL;
- `red.distortRing`;
- `red.repulse`;
- um fantasma por frame;
- flash `t`;
- cores da detonação vindas de `RED_FX_COLORS`;
- `debugState()`.

**Where**: `src/game/techFx/RedOrb.ts`
**Depends on**: None (fase 3 começa após a fase 2)
**Reuses**: `FxTimeline`, `FxRegistry`, o padrão do `KokusenFx`
**Requirement**: RDA-04, RDA-05, RDA-06, RDA-07, RDA-10, RDA-12, RDA-13, RDA-14, RDA-15, EDG-01
**Done when**:
- [x] Build passa.
- [x] Nenhuma referência a `PALETTE.a` ou `PALETTE.A` sobra no arquivo.
- [x] `RED_FINGERTIP_OFFSET` deixa de ser usado.
**Tests**: none
**Gate**: build

---

### T11: Repulsão aplicada na soltura

**What**: O `TechRunner` aplica `repulseTargets` aos inimigos comuns no `techCast:vermelho` (o chefe fica de fora) e repassa o frame do player ao `RedOrbFx`.
**Where**: `src/game/TechRunner.ts`
**Depends on**: T10
**Reuses**: `receiveHit`, `onTechHit`
**Requirement**: RDA-08, RDA-09, EDG-02, EDG-03
**Done when**:
- [x] Build passa.
**Tests**: none
**Gate**: build

---

### T12: Snapshot do Vermelho

**What**: O snapshot ganha `fx.red` (vindo de `RedOrbFx.debugState()`) e `player.frame`, se ainda não existir.
**Where**: `src/game/debugApi.ts`
**Depends on**: T11
**Reuses**: `GameSnapshot`
**Requirement**: RDA-04, RDA-05, RDA-06, RDA-13
**Done when**:
- [x] Build e testes passam.
- [x] A fixture de `debugApi.test.ts` muda só pelos campos novos.
**Tests**: none
**Gate**: build

---

### T13: Smoke do Vermelho do anime

**What**: Criar `red-anime.smoke.mjs` conforme o design §7 e rodar o suite inteiro.
**Where**: `scripts/smoke/red-anime.smoke.mjs`
**Depends on**: T12
**Reuses**: `fight-kit.mjs`, `techniques.smoke.mjs`
**Requirement**: RDA-04, RDA-05, RDA-06, RDA-07, RDA-08, RDA-09, RDA-11, RDA-13, RDA-15
**Done when**:
- [x] O smoke passa no suite completo.
- [x] `node tools/sprite-preview.mjs` gera a prancha para o UAT (os PNGs não são commitados).
**Tests**: smoke
**Gate**: full

---

## Diagram-Definition Cross-Check

| Task | Depends on | Diagrama | ✔ |
| --- | --- | --- | --- |
| T1 | None | início da fase 1 | ✅ |
| T2–T5 | a anterior | `T1 → … → T5` | ✅ |
| T6 | None | início da fase 2 | ✅ |
| T7–T9 | a anterior | `T6 → … → T9` | ✅ |
| T10 | None | início da fase 3 | ✅ |
| T11–T13 | a anterior | `T10 → … → T13` | ✅ |

## Test Co-location Validation

| Task | Camada | Matriz | Tests | ✔ |
| --- | --- | --- | --- | --- |
| T1–T9 | arte pura e núcleo | unit | unit | ✅ |
| T10–T12 | adaptadores | smoke (T13) | none | ✅ |
| T13 | smoke | smoke | smoke | ✅ |
