# Polimento do sprite do player — Specification

## Problem Statement

O estudante de jujutsu (CHR-01) funciona, mas parece genérico. Cada peça do boneco de papel tem contorno preto próprio, o que gera linhas internas grossas e achata o volume. O olho é 1 pixel, o cabelo é um bloco e o uniforme é marinho liso.

A animação também é rígida: o idle tem 2 frames a 2 fps, pulo e queda têm 1 frame cada, não há pouso, o hurt tem 1 frame e todo frame dura o mesmo tempo. Como o jogador olha para esse personagem o tempo todo, ele precisa parecer vivo e marcante para a luta ser gostosa de jogar.

## Goals

- [ ] O player tem leitura de rosto, cabelo e uniforme (gakuran) com volume: no idle, o contorno preto interno cai para no máximo metade da linha de base.
- [ ] Movimento fluido: idle respirando em 4 frames, ciclo de pulo completo (subida, ápice, queda, pouso) e timing por frame.
- [ ] Nenhum dos 102 frames existentes desalinha nem perde o alcance de golpe validado.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Mudar a proporção, o tamanho do frame (32x24) ou a origem | Quebraria os ~100 frames de golpe e técnica que reusam as partes |
| Inimigos, chefes, tiles e fundo | O pedido é o personagem principal |
| Arte gerada por IA ou PNG externo | AD-002: grades de texto com a paleta única |
| Squash/stretch por `setScale` fracionário | Escala não inteira faz o texel tremer com o zoom 1,5 |
| Mudar física, hitbox, tuning ou regras de combate | A feature é só visual + seleção de animação |
| Frames novos para golpes de `playerMoves`/`playerTech` | Eles herdam o acabamento das partes; só ganham smear onde indicado |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Cores novas | Exatamente 5: `o` (linha interna do uniforme), `x` (linha de pele), `j` (meio-tom do cabelo), `y` (luz de borda fria), `z` (dourado escuro); total de 40 = teto do teste | Teto do teste de paleta; rampas de 3 tons por material | y |
| Métrica de "contorno interno" | Texel `k` cujos 4 vizinhos (cima, baixo, esquerda, direita) estão dentro do frame e não são `.` | Mede o sel-out de forma objetiva; a linha de base do `idle-0` é 17 | y |
| Tolerância de alinhamento | A caixa (bbox) de cada frame pré-existente fica a até 2 texels da linha de base em cada borda; a linha de base é congelada em fixture antes da mudança | Pega peça deslocada sem impedir refinamento de silhueta | y |
| Duração do pouso | `LAND_MS = 120` ms após tocar o chão | Curto o bastante para não atrasar a corrida, longo o bastante para ser visto (≈7 frames a 60 fps) | y |
| Ápice | `|vy| < APEX_VY = 60` px/s no ar | Janela curta no topo do arco | y |
| Pouso segurando objeto | Não mostra `land`; mantém `carry-*` | O frame de pouso não tem os braços segurando | y |
| Pouso vs. corrida | `land` vale mesmo correndo, durante `LAND_MS` | O squash curto dá peso ao pouso; 120 ms não atrapalha | y |
| ACs sinalizados pelo Jev como ambíguos (SPR-02..07) | Mantidos: os termos "interior `k`", "linha de base congelada", "head rows" e "torso rows" estão definidos nesta tabela e no próprio AC por número de linha/coluna | Cada um vira uma asserção numérica direta no `art.test.ts` | y |
| ACs sinalizados como agrupados (SPR-12, SPR-13, SPR-15) | Mantidos agrupados: SPR-12 é um catálogo de animações checado num laço só; SPR-13 é um único fio (zera no pouso, soma com o dt); SPR-15 é uma única execução da ferramenta | Separar geraria ACs triviais sem ganho de teste | y |
| Cor do smear | `S` (cinza-azulado claro), atrás do membro, nunca além da ponta | Não muda o alcance medido pelo teste de hitbox | y |
| Saída do preview | `tools/sprite-preview.mjs` grava PNGs em `docs/art/` (no `.gitignore`) ou na pasta passada como 1º argumento | Revisão visual antes/depois sem versionar binários | y |

**Open questions:** none - all resolved or logged above.

**Implicit-requirement dimensions sweep:**
- Input validation & bounds: coberta por SPR-01/02 (paleta e tamanho de frame) e SPR-08 (durations do mesmo tamanho que frames).
- State-transition integrity: coberta por SPR-10/11 (precedência de `land` e `apex`).
- Remaining dimensions N/A for this scope: não há I/O, rede, persistência, auth nem concorrência; é arte e seleção de animação.

---

## User Stories

### P1: Personagem com cara de protagonista ⭐ MVP

**User Story**: Como jogador, quero que o estudante tenha rosto, cabelo e uniforme legíveis e com volume, para sentir que controlo um personagem marcante e não um boneco genérico.

**Why P1**: É o que o jogador vê 100% do tempo; é o pedido central.

**Acceptance Criteria**:

1. SPR-01: The palette SHALL contain exactly the 5 new keys `o`, `x`, `j`, `y`, `z` in addition to the previous 35, totalling 40 keys.
2. SPR-02: Every frame of `PLAYER_FRAMES`, `PLAYER_MOVE_FRAMES` and `PLAYER_TECH_FRAMES` SHALL parse with `parseSheet` using only palette keys, at 32x24 texels.
3. SPR-03: The `idle-0` frame SHALL have at most 8 interior `k` texels (baseline 17).
4. SPR-04: The head rows (0–10) of `idle-0` SHALL contain the eye white `w` horizontally adjacent to a dark pupil (`b` or `k`), and the three hair tones `h`, `j` and `H`.
5. SPR-05: The torso rows (11–17) of `idle-0` SHALL contain the gold button `A`, the rim light `y` and the inner line `o`.
6. SPR-06: Each frame that existed before this feature SHALL have its bounding box within 2 texels of the frozen baseline on each edge.
7. SPR-07: In every `*-hit` frame checked by the hitbox reach test, the limb SHALL still reach the hitbox edge (up to 1 texel beyond), at the hitbox height.

**Independent Test**: `npm test` (tests/game/art.test.ts) + prancha "antes/depois" do `tools/sprite-preview.mjs`.

---

### P1: Movimento com peso e respiração ⭐ MVP

**User Story**: Como jogador, quero que o personagem respire parado, suba, flutue no topo, caia e amorteça o pouso, para que pular e se mover dê gosto.

**Why P1**: É a metade "fluidez" do pedido; sem isso o sprite novo continua duro.

**Acceptance Criteria**:

1. SPR-08: WHEN an `AnimDef` declares `durations` THEN it SHALL have one positive duration per frame, and `registerAnims` SHALL pass each one as the frame's `duration`.
2. SPR-09: The `idle` animation SHALL have 4 frames with no two consecutive frames identical, looping.
3. SPR-10: WHEN the player is grounded, not hurt, not attacking, not holding, and `landMs < LAND_MS` (120) THEN `pickPlayerAnim` SHALL return `land`; WHEN `landMs >= LAND_MS` THEN it SHALL NOT return `land`.
4. SPR-11: WHILE the player is airborne, not hurt, not attacking, and `|vy| < APEX_VY` (60) `pickPlayerAnim` SHALL return `apex`; at `|vy| >= APEX_VY` it SHALL return `jump` (vy < 0) or `fall` (vy > 0).
5. SPR-12: The animations `jump` (≥ 2 frames, plays once), `apex` (≥ 1 frame), `fall` (≥ 2 frames, loops), `land` (2 frames, plays once) and `hurt` (2 frames) SHALL exist, and every frame they cite SHALL exist in the sheet.
6. SPR-13: WHEN the player touches the ground after being airborne THEN `Player` SHALL feed `landMs = 0` to the animation selection and count it up with the frame time.

**Independent Test**: `tests/core/animState.test.ts` + smoke headless (pular e conferir frame `land-*` logo após o pouso).

---

### P2: Golpes com impacto visual (smear)

**User Story**: Como jogador, quero ver um rastro de movimento no instante do golpe, para que soco e chute pareçam rápidos e fortes.

**Why P2**: Melhora o feel, mas o MVP visual se sustenta sem ele.

**Acceptance Criteria**:

1. SPR-14: The frames `jab-hit`, `cross-hit` and `kick-hit` SHALL each have at least 3 more `S` texels than their own `*-wind` frame, and every `S` texel added SHALL sit at a column smaller than the frame's rightmost non-transparent column (the limb tip used by the reach test).

**Independent Test**: teste de folha em `tests/game/art.test.ts` + prancha do preview.

---

### P2: Ferramenta de preview de sprites

**User Story**: Como desenvolvedor, quero gerar uma prancha PNG dos frames e tiras por animação, para revisar arte sem abrir o jogo.

**Why P2**: Acelera a revisão de arte agora e nas próximas features.

**Acceptance Criteria**:

1. SPR-15: WHEN `node tools/sprite-preview.mjs [outDir]` runs THEN it SHALL write `player-sheet.png` (every player frame labelled) and one `anim-<name>.png` per player animation into `outDir` (default `docs/art/`) and exit 0.

**Independent Test**: rodar o comando e abrir os PNGs.

---

## Edge Cases

- IF an `AnimDef` declares `durations` with a length different from `frames` THEN `registerAnims` SHALL throw at startup naming the animation.
- WHEN the player lands while holding an object THEN the system SHALL keep `carry-idle`/`carry-run` (no `land`).
- WHEN the player lands during an attack or while hurt THEN attack/hurt SHALL keep precedence over `land`.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| SPR-01 | P1: Protagonista | Tasks | Done |
| SPR-02 | P1: Protagonista | Tasks | Done |
| SPR-03 | P1: Protagonista | Tasks | Done |
| SPR-04 | P1: Protagonista | Tasks | Done |
| SPR-05 | P1: Protagonista | Tasks | Done |
| SPR-06 | P1: Protagonista | Tasks | Done |
| SPR-07 | P1: Protagonista | Tasks | Done |
| SPR-08 | P1: Movimento | Tasks | Pending |
| SPR-09 | P1: Movimento | Tasks | Done |
| SPR-10 | P1: Movimento | Tasks | Done |
| SPR-11 | P1: Movimento | Tasks | Done |
| SPR-12 | P1: Movimento | Tasks | Done |
| SPR-13 | P1: Movimento | Tasks | Done |
| SPR-14 | P2: Smear | Tasks | Done |
| SPR-15 | P2: Preview | Tasks | Pending |

**Coverage:** 15 total, 15 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] `npm test`, `npm run typecheck`, `npm run build` e `npm run smoke` passam.
- [ ] Na prancha antes/depois, rosto, cabelo e gakuran se leem a 2x sem zoom extra, e nenhum dos 102 frames antigos aparece desalinhado.
