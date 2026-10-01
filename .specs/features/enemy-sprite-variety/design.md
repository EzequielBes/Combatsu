# Inimigos variados e reações de golpe — Design

**Spec**: `.specs/features/enemy-sprite-variety/spec.md`
**Decisões de base**: AD-001 (core puro), AD-002 (grades + paleta), AD-006 (RNG com seed), AD-012 (sel-out, paleta no teto de 40).

## 1. Módulos

| Módulo | Muda | Papel |
| --- | --- | --- |
| `src/core/hitReaction.ts` (novo) | — | `HitReaction`, `pickHitReaction(hit: { strength; moveName? }, last)`, `REACTION_DURATIONS = [60, 90, 70]` |
| `src/core/enemyVariant.ts` (novo) | — | `ENEMY_VARIANTS = ['corcunda', 'rastejante', 'bruto'] as const`, `EnemyVariant`, `pickEnemyVariant(rng)`, `parseVariant(s): EnemyVariant \| null` |
| `src/core/run.ts` | + `variantRng` | stream próprio `seed ^ 0x6a09e667`, criado como o `guardRng` |
| `src/core/animState.ts` | `EnemyAnimInput.reaction?` | `pickEnemyAnim` devolve `hurt-<reaction>` quando `brain === 'hitstun'` e há `reaction`; sem `reaction`, continua `hurt` |
| `src/game/art/selOut.ts` (novo) | sai de `player.ts` | `selOut(canvas, rules?)`, onde `rules` = lista `{ keys, line }` avaliada na ordem (≥ 2 vizinhos daquele grupo), mais `fallback`; o padrão = regra atual do player (pele→`x`, cabelo→`h`, resto→`o`). `player.ts` reexporta para não quebrar imports e testes |
| `src/game/art/sprites/enemy.ts` | reestruturado | `buildEnemyFrames(kit: EnemyKit)` monta todos os frames a partir das partes da aparência; `ENEMY_VARIANT_FRAMES: Record<EnemyVariant, Record<string, string[]>>`; `ENEMY_RAG_VARIANTS: Record<EnemyVariant, { head; torso; limb }>`; `ENEMY_FRAMES` = `ENEMY_VARIANT_FRAMES.corcunda` (compatibilidade); `ENEMY_ANIMS` passa a ser `AnimDef` com `durations` |
| `src/game/textures.ts` | chaves por aparência | `enemyTex(v)` = `'enemy'` para `corcunda` e `'enemy-<v>'` para as outras; `ragTex(part, v)` = `'rag-<part>-<v>'` |
| `src/game/art/index.ts` | laço por aparência | registra a folha, as animações (`enemyAnimKey(v, name)` = `enemy-<v>-<name>`) e as 3 texturas de ragdoll de cada aparência |
| `src/game/Ragdoll.ts` | recebe `variant` | usa `ragTex(part, variant)`; ganha `setVisible(v)` |
| `src/game/Enemy.ts` | recebe `variant` | textura e animações da aparência, reação leve, pose de impacto (§4) |
| `src/scenes/TestScene.ts` | spawn | sorteia `pickEnemyVariant(run.variantRng)` ou o override `?enemyVariant` (só com `?debug`) |
| `src/game/debugApi.ts` | snapshot | expõe `variant`, `frame` (já existe para o player; adicionar para o inimigo se faltar) e `ragdollVisible` |
| `tools/sprite-preview.mjs` | — | `--sheet enemy` (ou um 2º alvo) gera `enemy-<v>-sheet.png` e `enemy-<v>-anim-<name>.png` |

O `FxLab` continua usando `TEX.enemy` (`corcunda`).

## 2. Aparências (direção de arte)

As 3 aparências respeitam frame 32x24, origem `ENEMY_ORIGIN` (coluna 12,5), pé na linha 23, garra do `attack` alcançando a borda da hitbox e o mesmo tamanho das partes do ragdoll (cabeça 8x7, tronco 8x10 e membro 3x8 texels, que viram os corpos do Matter em `Ragdoll.ts`).

| Aparência | Silhueta | Cores | Assinatura |
| --- | --- | --- | --- |
| `corcunda` | a atual (corcunda atrás, cabeça à frente), refinada | `i`/`I`, sombra `H`/`K`, olho `A`/`a`, boca `w`/`r` | 1 olho grande âmbar; ganha sel-out, rampa de 3 tons e veias `v` |
| `rastejante` | magro e alto, tronco estreito inclinado, braços muito longos até o chão, pernas finas dobradas | `g`/`G`, sombra `n`/`K`, olhos `R`/`r` | 3 olhos pequenos vermelhos em fileira, costelas aparentes em `G`, garra fina |
| `bruto` | largo e baixo, ombros enormes, chifres grandes curvos, punhos pesados | `v`/`u`, luz `U`, sombra `b`/`K` | boca acesa (`A`/`a` dentro), chifres em `w`/`S`, punhos fechados em vez de garras |

Regra de sel-out do inimigo: `rules = [{ keys: corDoCorpo, line: sombraDoCorpo }, { keys: olho/boca, line: 'b' }]`, `fallback = 'K'`.

## 3. Animações (todas as aparências têm o mesmo conjunto)

| Anim | Frames | Durações (ms) | Repeat |
| --- | --- | --- | --- |
| idle | idle-0..3 | 300, 200, 300, 200 | -1 |
| walk | walk-0..5 | 100 cada | -1 |
| windup | windup-0, windup-1 | 120, 330 | 0 |
| attack | attack-0 (golpe, smear), attack-1 (follow-through) | 60, 60 | 0 |
| hurt | hurt | — | 0 |
| hurt-head-a | hurt-head-a-0..2 | 60, 90, 70 | 0 |
| hurt-head-b | hurt-head-b-0..2 | 60, 90, 70 | 0 |
| hurt-uppercut | hurt-uppercut-0..2 | 60, 90, 70 | 0 |
| hurt-body | hurt-body-0..2 | 60, 90, 70 | 0 |
| impact | impact | — | 0 |
| getup | getup-0..2 | 120, 120, 120 | 0 |

- O nome `attack` (frame) continua existindo como alias do `attack-0`, por causa do teste de alcance e da fixture.
- `windup` (frame) e `idle-0/1`, `walk-0..3` e `getup-0/1` mantêm os nomes antigos.
- Poses:
  - **cabeça-a:** cabeça e tronco jogados para trás (`lean -2`), olho fechado, boca aberta.
  - **cabeça-b:** igual à cabeça-a, mas com a cabeça torcida para baixo e o braço da frente solto.
  - **uppercut:** queixo para cima (cabeça 2 texels acima), corpo esticado.
  - **body:** dobrado para a frente (`drop 3`), braços cruzados na barriga.
  - **impact:** dobrado com o corpo inteiro arqueado e borda branca (`w`) no lado do golpe.
- O frame 0 de cada reação é o extremo; o 1 segura; o 2 volta a meio caminho do idle.
- Telegrafia: `windup-1` é a pose de máximo preparo (braço todo para trás, olho `EYE_GLOW`) e fica 330 ms, cobrindo os últimos 200 ms do preparo.

## 4. Fluxo de golpe no `Enemy`

```
receiveHit(hit)
  ├─ guarda segurou → (como hoje)
  ├─ reaction = pickHitReaction({ strength: reaction.strength, moveName }, this.lastReaction)
  ├─ brain.receiveHit → events
  │    hitReaction → this.reaction = reaction; lastReaction = reaction; view.anims.play(hurt-<r>, false), sempre do frame 0
  │    ragdoll     → enterRagdoll(hit): cria o ragdoll (impulso aplicado), ragdoll.setVisible(false),
  │                  view visível com setFrame('impact'), pendingRagdollReveal = true
  └─ ...
update(dt)            (a cena não chama durante o hitstop)
  ├─ pendingRagdollReveal → ragdoll.setVisible(true); view.setVisible(false); pendingRagdollReveal = false
  └─ animate(): brain hitstun + reaction → anim `hurt-<reaction>` (sem reiniciar enquanto toca); fora do hitstun, reaction = null
```

- O `hurtWhileDown` continua só com o flash do ragdoll.
- O estado atordoado ou quebrado continua mostrando `hurt` (HRX-04).
- `lastReaction` só guarda reações de cabeça, para a alternância.

## 5. Testes

- `tests/core/hitReaction.test.ts` (HRX-01, incluindo sem `moveName` e a alternância).
- `tests/core/enemyVariant.test.ts`: uniformidade (10.000 sorteios, cada variante com 33% ± 3%) e mesma seed → mesma sequência.
- `tests/core/run.test.ts`: `variantRng` existe e `lootRng`/`guardRng` dão os mesmos números de antes.
- `tests/core/animState.test.ts`: `pickEnemyAnim` com `reaction`.
- `tests/game/art.test.ts`:
  - folha das 3 aparências (EVR-01) e diferença de 25% (EVR-02);
  - alcance por aparência (EVR-03);
  - bbox contra a fixture (EVR-07) e animações (EVR-08/09, HRX-03);
  - sel-out (EVR-10) e regras do `selOut` configurável;
  - o player continua idêntico, conferido pela fixture do player.
- Smoke `scripts/smoke/enemy-react.smoke.mjs`:
  - `?debug&enemyVariant=bruto` → `variant` no snapshot;
  - jab, gancho e soco baixo → frames `hurt-head-*`, `hurt-uppercut-*` e `hurt-body-*`;
  - chute forte → `impact` visível e ragdoll escondido durante o hitstop, e o inverso depois.
