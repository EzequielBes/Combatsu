# Validation: enemy-sprite-variety - FAIL

**Result**: FAIL
**Branch**: `feat/enemy-sprite-variety`
**Diff range**: `dev..HEAD` = `24cf298..840cc6e` (26 arquivos, +2226/-301)
**Verifier**: independente (autor != verificador), Sonnet 5.5. Nenhum código de produção foi alterado.

Motivo: 2 mutantes sobreviventes que expõem cláusulas de AC sem teste (EVR-04 no adaptador `TestScene`; HRX-02 "reinicia do frame 0 mesmo já em reação" com a mesma reação repetida). Todo o resto passa. Segue a mesma régua da `sprite-player-polish`: mutante sobrevivente em cláusula de AC vira tarefa de correção.

## Checagem ancorada na spec

| AC | Resultado definido na spec | `file:line` + asserção | Resultado |
| --- | --- | --- | --- |
| EVR-01 | 3 variantes, todo frame de `ENEMY_ANIMS`, 32x24, só paleta | `tests/game/art.test.ts:1110` (`parseSheet` com `PALETTE_KEYS`, largura/altura, `hasOwn` por frame) | PASS |
| EVR-02 | >= 25% de texels diferentes no `idle-0` por par; cor dominante `i`/`g`/`u` | `tests/game/art.test.ts:1124` (`toBeGreaterThanOrEqual(0.25)` e `toEqual(['i','g','u'])`) | PASS (a métrica divide pelo menor número de texels não transparentes; a spec diz só "dos texels", lacuna de precisão baixa) |
| EVR-03 | garra alcança a borda da hitbox, até +1 texel, na altura | `tests/game/art.test.ts:1148` (`reach >= edge` e `<= edge + ART_SCALE`, faixa vertical) | PASS |
| EVR-04 | sorteio uniforme em stream próprio; mesma seed = mesma sequência; loot e guard inalterados | `tests/core/enemyVariant.test.ts:5` (30..36% em 10.000), `:18` (seed igual/diferente); `tests/core/run.test.ts:477` (`variantRng` = `new Rng(s ^ 0x6a09e667)`), `:486` (valores fixos de loot/guard), `:492` (consumir variante não muda os outros); smoke `scripts/smoke/enemy-react.smoke.mjs:81` (mesma seed, mesma sequência). Lacuna: nenhum teste prende que `TestScene` sorteia com `run.variantRng` (`src/scenes/TestScene.ts:843`) | GAP (mutante M2b sobrevive) |
| EVR-05 | override válido força; inválido cai no sorteio | `tests/core/enemyVariant.test.ts:33` (`parseVariant`); smoke `:49` (todo `bruto`), `:54-55` (inválido igual à run normal) | PASS |
| EVR-06 | 6 partes com `rag-<parte>-<variante>` | smoke `scripts/smoke/enemy-react.smoke.mjs:218-223` por variante (6 partes, regex, 3 partes presentes); texturas em `tests/game/art.test.ts:1229` | PASS (mutante M5 morto) |
| EVR-07 | bbox dos frames antigos a <= 2 texels da fixture | `tests/game/art.test.ts:1070-1080` (11 frames, `toBeLessThanOrEqual(2)`; limite dos dois lados: 2 passa, 3 falha); `tests/game/fixtures/enemyBBoxBaseline.json` | PASS |
| EVR-08 | idle>=4, walk>=6, windup 2, attack 2, getup>=3, com `durations` | `tests/game/art.test.ts:1183` | PASS |
| EVR-09 | soma antes de `windup-1` <= 250 ms | `tests/game/art.test.ts:1196` (`holdsFinal200`, 250 passa, 251 falha, durações reais) | PASS (M6 morto) |
| EVR-10 | `idle-0` com <= 4 `k` internos | `tests/game/art.test.ts:1168` (`toBeLessThanOrEqual(4)` por variante); regras do `selOut` em `:999` | PASS |
| HRX-01 | mapeamento exato + alternância | `tests/core/hitReaction.test.ts:7-48` (cada nome das 3 listas, forte, sem `moveName`, `last` nulo/a/b/body) | PASS (M1, M1b mortos) |
| HRX-02 | leve que sobrevive toca `hurt-<reação>` do frame 0, mesmo já em reação | `tests/core/animState.test.ts:162` (nome da anim); smoke `:139,142,145,149,152` (`hurt-body-0`, `head-a-0`, `head-b-0`, `head-a-0`, `uppercut-0`). Lacuna: o smoke lê o frame só no tick do dano e nunca repete a mesma reação em sequência, então o reinício do mesmo `key` e a permanência da animação nos frames seguintes não são afirmados | GAP (mutante M4 sobrevive; M3 morto só pelo unit) |
| HRX-03 | 4 reações x 3 frames (60/90/70), uma vez, frame 0 com >= 2 texels de desvio | `tests/game/art.test.ts:1211` (`toEqual([60,90,70])`, `repeat 0`, desvio `>= 2`) e `tests/core/hitReaction.test.ts:46` | PASS |
| HRX-04 | quebrado ou aparado mostra `hurt` | smoke `:185` (3 parries, `hurt`), `:191` (quebrado); unit `tests/core/animState.test.ts:168` | PASS |
| HRX-05 | forte: sprite com `impact` e ragdoll escondido no hitstop; depois o inverso | smoke `:208-210` por variante (`impact`, `spriteVisible`, `ragdollVisible === false`), `:216` (inverso no primeiro update) | PASS |
| HRX-06 | forte sem hitstop troca no próximo update | smoke `:235-242` (tecla 2, sem hitstop, ragdoll visível no frame seguinte) | PASS |

Edge cases: reação durante `hurtWhileDown` não toca sprite (sem asserção; ramo `ragdoll?.flash()` em `src/game/Enemy.ts:597`, lacuna baixa). Morte por golpe leve passa por `impact` (mesmo caminho do HRX-05, sem smoke próprio, lacuna baixa).

## Sensor de discriminação (scratch em `git worktree` temporário com `node_modules` por junction)

| # | Mutante | Alvo | Resultado |
| --- | --- | --- | --- |
| M1 | alternância sempre `head-a` | `src/core/hitReaction.ts:25` | MORTO (`hitReaction.test.ts`, 2 testes) |
| M1b | `chuteAlto` fora do conjunto de uppercut | `src/core/hitReaction.ts:13` | MORTO (`chuteAlto (leve) dá uppercut`) |
| M2a | `variantRng` com o seed do `lootRng` | `src/core/run.ts:202` | MORTO (`run.test.ts:477`) |
| M2b | `TestScene` sorteia a aparência com `run.lootRng` | `src/scenes/TestScene.ts:843` | SOBREVIVEU (1135 testes e smoke `enemy-react` passam) |
| M3 | `pickEnemyAnim` ignora `reaction` | `src/core/animState.ts:111` | MORTO por `animState.test.ts:162`; o smoke `enemy-react` SOBREVIVE (lê o frame antes do `animate`) |
| M4 | reação leve `play(key, true)` sem `restart()` (não reinicia do frame 0) | `src/game/Enemy.ts:620-621` | SOBREVIVEU (smoke `enemy-react` passa) |
| M5 | ragdoll sempre com textura `corcunda` | `src/game/Ragdoll.ts:53` | MORTO (smoke `:221`, falha em `rastejante`) |
| M6 | `windup` `[120,330]` -> `[260,190]` (soma 260 > 250) | `src/game/art/sprites/enemy.ts:672` | MORTO (`art.test.ts:1196`) |

Resultado: 8 mutantes, 6 mortos, 2 sobreviventes (M2b, M4). Isolamento: `git status --porcelain` da árvore real idêntico ao baseline (somente `.agents/ .claude/ .cursor/ .windsurf/ skills-lock.json` não rastreados); worktree e junction removidos.

## Gates

| Gate | Resultado |
| --- | --- |
| `npm run typecheck` | exit 0 |
| `npm test` | 69 arquivos, 1135 testes passam |
| `npm run build` | exit 0 (só o aviso de chunk > 500 kB que já existia) |
| `npm run smoke` completo | 24 cenários ok (inclui `armed`, `heal`, `enemy-react`) |
| `armed.smoke.mjs` isolado | branch: 3/3 ok (4/4 contando a rodada completa); `dev` (`24cf298`, worktree): 3/3 ok. A intermitência de 1 em 4 relatada pelo worker não se reproduziu em nenhum dos lados, então não há evidência de regressão desta feature; permanece suspeita de flake de timing, não atribuível à branch |
| `heal.smoke.mjs` | passou na rodada completa; já era intermitente em `dev` (conhecido) |

## Lacunas ordenadas por severidade

1. EVR-04 (média-alta): nenhum teste prende o stream usado pelo sorteio no adaptador. Trocar `run.variantRng` por `run.lootRng` em `src/scenes/TestScene.ts:843` desloca os drops sem que nada falhe. Correção: smoke que compara a sequência de aparências contra `new Rng(seed ^ 0x6a09e667)` ou os drops com e sem sorteio (M2b).
2. HRX-02 (média): sem asserção de reinício do frame 0 quando a mesma reação se repete (dois `socoBaixo` seguidos) nem de que o frame segue em `hurt-<reação>-1` depois do tick do dano (M3 no smoke, M4). Correção: smoke com dois golpes `body` em sequência lendo `hurt-body-0` de novo, e leitura do frame 1-2 frames depois do golpe.
3. Baixa: edge cases `hurtWhileDown` (sem sprite de reação) e morte por golpe leve via `impact` sem asserção; EVR-02 não define o denominador da fração.
