# Inimigos variados e reações de golpe — Specification

## Problem Statement

Toda onda é feita do mesmo espírito amaldiçoado: uma massa cinza-arroxeada com um olho, desenhada com contorno preto em toda peça e animação mínima (idle e preparo com 1–2 frames). Quando o jogador acerta um golpe leve, o inimigo mostra sempre o mesmo frame `hurt` por 220 ms, seja jab, gancho ou soco baixo. No golpe forte, ele vira ragdoll no mesmo instante, sem nenhuma pose de impacto.

O combate estilo luta (F7) tem 17 golpes, mas a reação do alvo não conta qual golpe entrou. Por isso acertar não "pesa".

## Goals

- [ ] Três aparências de inimigo comum, distintas na silhueta e na cor, sorteadas por onda com o RNG da run.
- [ ] Cada golpe leve mostra uma reação animada que combina com onde ele acertou (cabeça, queixo, corpo), e golpes leves seguidos alternam a reação.
- [ ] O golpe forte mostra uma pose de impacto durante o hitstop antes do ragdoll.
- [ ] As animações do inimigo têm mais frames e duração por frame, e a telegrafia do ataque continua clara e justa.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Diferença de gameplay entre aparências (vida, dano, IA, hitbox, corpo físico) | Variedade aqui é visual; balancear tipos novos é outra feature |
| Chefes (Oni, Tecelã) e projéteis | O pedido é sobre inimigos comuns; chefe tem folha própria |
| Reação animada no player ao levar golpe | O player já ganhou hurt em 2 frames na `sprite-player-polish` |
| Cores novas na paleta | A paleta está no teto de 40 (AD-012); as variantes usam cores que já existem |
| Mudar tempos de hitstun, hitstop, preparo ou golpe do inimigo | O timing de gameplay foi validado; só a arte acompanha |
| Som | Não pedido |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Aparências | `corcunda` (a atual, refinada; tons `i`/`I`), `rastejante` (magro e alto, braços mais longos, 3 olhos pequenos; tons `g`/`G`) e `bruto` (largo, chifres grandes, boca acesa; tons `v`/`u`/`U`) | Leitura imediata por silhueta + cor, sem cores novas | y |
| Sorteio da aparência | Uniforme entre as 3, por inimigo, num stream de RNG próprio com seed derivado da run (como o `guardRng`), sem consumir números dos streams existentes | AD-006; não altera drops, ofertas nem guardas das seeds atuais | y |
| Override de debug | `?enemyVariant=corcunda|rastejante|bruto` força a aparência (só com `?debug`) | Smoke e revisão determinísticos | y |
| Mesma geometria de jogo | Todas as aparências têm frame 32x24, origem no pé (`ENEMY_ORIGIN`), garra alcançando a borda da hitbox do `ENEMY_ATTACK` e corpo físico 22x36 inalterado | Variedade só visual | y |
| Ragdoll | Cada aparência tem as próprias texturas de cabeça, tronco e membro, nas cores dela | O ragdoll não pode trocar de cor ao cair | y |
| Reação por golpe (`pickHitReaction`) | forte → `impact`; golpe de baixo/corpo (`socoBaixo`, `rasteira`, `cotovelada`, `joelhada`, `chuteFrontal`, `chuteEmpurrao`) → `body`; golpe que sobe (`gancho`, `ganchoAscendente`, `chuteAlto`) → `uppercut`; qualquer outro (incluindo sem `moveName`: objeto, técnica) → `head-a`/`head-b` alternando a partir da última reação de cabeça | Cada golpe "conta" onde acertou; a alternância evita repetição em combos | y |
| Força usada na reação | A força efetiva que o inimigo aplica (quebrado e atordoado = leve, mesmo com golpe forte) | Reflete o que acontece com o corpo | y |
| Duração da reação leve | 3 frames: impacto 60 ms, segura 90 ms, recupera 70 ms (= `hitstunMs` 220) | O impacto é o frame mais forte e mais curto; a soma bate com o hitstun | y |
| Pose de impacto do forte | O sprite fica visível com o frame `impact` enquanto o jogo está congelado pelo hitstop; o ragdoll é criado no golpe, mas só aparece (e o sprite some) no primeiro update depois do congelamento | A cena não roda o update do inimigo durante o hitstop, então a troca cai exatamente no fim do congelamento | y |
| Telegrafia | O preparo ganha 2 frames (`windup-0` puxa, `windup-1` segura no máximo); o último frame do preparo fica visível pelo menos nos últimos 200 ms antes do golpe | Justiça: o jogador lê o golpe vindo | y |
| Contorno | O passe `selOut` do player passa a ser compartilhado e configurável por material; no inimigo o `k` interno vira o tom escuro do próprio material da aparência | Mesmo acabamento do player | y |
| ACs sinalizados pelo Jev (13 de 16) | Mantidos; EVR-06 reescrito com as chaves de textura. Os termos ("variante", "interior `k`", "linha de base", "força efetiva") estão definidos nesta tabela; os agrupados (EVR-01/02/04/05/08, HRX-03) são catálogos ou um único fluxo checado num laço só | Separar geraria ACs triviais sem ganho de teste (mesma decisão da `sprite-player-polish`) | y |
| Linha de base | As bboxes dos frames atuais do inimigo ficam congeladas numa fixture (±2 texels) e valem para a aparência `corcunda` | Mesmo guarda-corpo da `sprite-player-polish` | y |

**Open questions:** none - all resolved or logged above.

**Implicit-requirement dimensions sweep:**
- State-transition integrity: coberta por HRX-02/03/05 (reação durante o hitstun, troca sprite → ragdoll depois do hitstop).
- Input validation & bounds: coberta por EVR-05 (override inválido cai no sorteio normal).
- Concurrency / ordering: coberta por HRX-05 (golpe forte durante o congelamento).
- Remaining dimensions N/A for this scope: sem I/O, rede, persistência ou auth.

---

## User Stories

### P1: Ondas com inimigos diferentes ⭐ MVP

**User Story**: Como jogador, quero enfrentar espíritos de aparências diferentes, para que cada onda tenha cara nova e eu leia quem é quem de longe.

**Why P1**: É metade do pedido; hoje toda onda é igual.

**Acceptance Criteria**:

1. EVR-01: The enemy art SHALL provide the 3 variants `corcunda`, `rastejante` and `bruto`, each with every frame cited by `ENEMY_ANIMS`, at 32x24 texels, using only palette keys.
2. EVR-02: Each pair of variants SHALL differ in at least 25% of the non-transparent texels of the `idle-0` frame (same position, different key or transparency), and the dominant body color of each variant SHALL be different (`i`/`I`, `g`/`G`, `v`/`u`).
3. EVR-03: In every variant, the `attack` frame claw SHALL reach the edge of the `ENEMY_ATTACK` hitbox (up to 1 texel beyond), at the hitbox height.
4. EVR-04: WHEN an enemy spawns THEN the scene SHALL pick its variant uniformly from a dedicated seeded RNG stream, so that two runs with the same seed spawn the same variant sequence, and the existing streams (loot, guard) produce the same numbers as before this feature.
5. EVR-05: WHERE `?debug&enemyVariant=<id>` is set with a valid id, every common enemy SHALL spawn with that variant; IF the id is invalid THEN the normal draw SHALL be used.
6. EVR-06: WHEN an enemy enters ragdoll THEN each of its 6 ragdoll part images SHALL use the texture key `rag-<part>-<variant>` (`part` = `head`, `torso` or `limb`) of that enemy's own variant.
7. EVR-07: Each frame that existed before this feature SHALL, in the `corcunda` variant, have its bounding box within 2 texels of the frozen baseline on each edge.

**Independent Test**: `npm test` (folha das 3 variantes, alcance, sorteio) + smoke com `enemyVariant` + prancha do `tools/sprite-preview.mjs`.

---

### P1: Golpe leve que conta onde acertou ⭐ MVP

**User Story**: Como jogador, quero ver o inimigo virar a cabeça no jab, levantar o queixo no gancho e dobrar no soco baixo, para sentir que cada golpe entrou de verdade.

**Why P1**: É o "feeling de impacto" pedido.

**Acceptance Criteria**:

1. HRX-01: `pickHitReaction(hit, last)` SHALL return `impact` for a heavy hit; `body` for `socoBaixo`, `rasteira`, `cotovelada`, `joelhada`, `chuteFrontal` and `chuteEmpurrao`; `uppercut` for `gancho`, `ganchoAscendente` and `chuteAlto`; and otherwise `head-b` WHEN `last` is `head-a`, else `head-a`.
2. HRX-02: WHEN a light hit lands on an enemy that survives THEN the enemy SHALL play the `hurt-<reaction>` animation chosen by `pickHitReaction` with its effective strength, from its first frame, even if it was already in a hit reaction.
3. HRX-03: Each light reaction animation (`hurt-head-a`, `hurt-head-b`, `hurt-uppercut`, `hurt-body`) SHALL have 3 frames with durations 60, 90 and 70 ms, plays once, in every variant; the first frame SHALL differ from the `idle-0` bounding box by at least 2 texels on some edge (visible snap).
4. HRX-04: WHILE the enemy is stunned by structure break or suppressed, the system SHALL keep showing the existing `hurt` frame (not a reaction animation).

**Independent Test**: `tests/core/hitReaction.test.ts` + smoke acertando jab, gancho e soco baixo e lendo o frame da view.

---

### P1: Pose de impacto no golpe forte ⭐ MVP

**User Story**: Como jogador, quero ver o inimigo dobrar no instante do golpe forte, congelado no hitstop, antes de voar em ragdoll.

**Why P1**: Hoje o forte "teleporta" o sprite para o ragdoll; a pose congelada é o que vende o peso.

**Acceptance Criteria**:

1. HRX-05: WHEN a heavy hit sends a surviving or dying enemy into ragdoll THEN, while the hitstop freeze lasts, the enemy sprite SHALL stay visible showing the `impact` frame and the ragdoll SHALL be hidden; on the first enemy update after the freeze, the sprite SHALL hide and the ragdoll SHALL show.
2. HRX-06: IF a heavy hit lands with no hitstop freeze active (e.g. a source that does not trigger hitstop) THEN the swap to ragdoll SHALL happen on the next enemy update (no stuck sprite).

**Independent Test**: smoke: chute forte, conferir `impact` visível e ragdoll escondido durante o hitstop e o inverso depois.

---

### P2: Movimento do inimigo mais fluido

**User Story**: Como jogador, quero que o inimigo respire, ande com peso, puxe o golpe de forma legível e levante do chão aos poucos.

**Why P2**: Completa o "fluido", mas o impacto (P1) é o centro do pedido.

**Acceptance Criteria**:

1. EVR-08: In every variant, `idle` SHALL have at least 4 frames, `walk` at least 6, `windup` 2, `attack` 2 and `getup` at least 3, all with `durations`, and every cited frame SHALL exist.
2. EVR-09: The `windup` animation SHALL hold its last frame (`windup-1`) for at least the final 200 ms of `ENEMY_AI.windupMs` (450): the sum of the durations before `windup-1` SHALL be ≤ 250 ms.
3. EVR-10: In every variant, the `idle-0` frame SHALL have at most 4 interior `k` texels (sel-out applied).

**Independent Test**: `npm test` + tiras do preview.

---

## Edge Cases

- WHEN two light hits land 1 frame apart THEN the second SHALL restart its reaction from frame 0 (HRX-02).
- WHEN a light hit kills the enemy THEN the death goes to ragdoll through `impact` like a heavy hit (HRX-05), because the brain sends the dead to ragdoll.
- IF the enemy is in ragdoll (`hurtWhileDown`) THEN no sprite reaction SHALL play (the ragdoll flash stays).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| EVR-01 | P1: Variedade | Tasks | Done |
| EVR-02 | P1: Variedade | Tasks | Done |
| EVR-03 | P1: Variedade | Tasks | Done |
| EVR-04 | P1: Variedade | Tasks | Pending |
| EVR-05 | P1: Variedade | Tasks | Pending |
| EVR-06 | P1: Variedade | Tasks | Done |
| EVR-07 | P1: Variedade | Tasks | Done |
| HRX-01 | P1: Golpe leve | Tasks | Done |
| HRX-02 | P1: Golpe leve | Tasks | Done |
| HRX-03 | P1: Golpe leve | Tasks | Done |
| HRX-04 | P1: Golpe leve | Tasks | Done |
| HRX-05 | P1: Impacto forte | Tasks | Done |
| HRX-06 | P1: Impacto forte | Tasks | Done |
| EVR-08 | P2: Fluidez | Tasks | Done |
| EVR-09 | P2: Fluidez | Tasks | Done |
| EVR-10 | P2: Fluidez | Tasks | Done |

**Coverage:** 16 total, 16 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] `npm test`, `npm run typecheck`, `npm run build` e `npm run smoke` passam.
- [ ] Na prancha, as 3 aparências se distinguem a 1x só pela silhueta e cor.
- [ ] Num combo jab → direto → gancho, o inimigo mostra 3 reações diferentes.
