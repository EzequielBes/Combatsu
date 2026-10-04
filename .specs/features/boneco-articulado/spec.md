# Boneco Articulado 2D (spike) Specification

## Problem Statement

A arte do player é montada à mão, peça por peça, em grades de texto (AD-002). Isso dá braço curto, pose torta e só 3 frames por golpe. O usuário não desenha nem paga ferramentas: a arte tem de sair do Claude, em código. O spike prova que um esqueleto 2D com comprimentos fixos, rasterizado em pixel art, gera golpes melhores e com mais frames. Ele produz frames no mesmo formato de grade, para entrar no pipeline atual sem mexer na lógica.

## Goals

- [ ] O gancho ascendente sai do boneco articulado com 3 poses-chave (wind, hit, recover) e quadros intermediários, no mesmo formato de grade e paleta do player.
- [ ] O usuário compara lado a lado, numa prancha PNG e no jogo (`?debug&rig=1`), a versão atual e a do boneco, e decide se a arte do player migra.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Migrar os outros golpes e animações | O spike prova a técnica num golpe; a migração é uma feature depois do veredito do usuário |
| Animação com mais de 3 frames no jogo | O `Player` mostra um frame por fase; os intermediários aparecem só na prancha |
| Rotação da cabeça desenhada | A cabeça e o cabelo têm detalhe demais para girar em pixel art; entram como grade pronta, só espelhada ou deslocada |
| Inimigos e chefes | Fora do spike |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Formato de saída | Grade de texto 32x30 com as teclas da `PALETTE` e o sel-out do player | Entra no pipeline atual (AD-002, F17) e reaproveita os testes POS-* | n |
| Cabeça | Grade `HEAD_FOCUS` atual, carimbada no topo do pescoço | Mantém o rosto que o usuário já conhece | n |
| Proporções | Comprimentos dos ossos tirados do `idle-0` atual (mesma altura e largura de corpo) | O boneco novo não pode parecer outro personagem | n |
| Intermediários | Interpolação dos ângulos com easing (antecipação no wind, overshoot no hit) | É o que dá fluidez de jogo de luta sem desenhar cada quadro | n |
| Chave de debug | `?debug&rig=1` troca os 3 frames do gancho ascendente pelos do boneco | Teste no jogo sem risco para quem joga sem debug | n |
| Frame do heroico alto | Grade própria de 40x40 (origem no pé, coluna 12) numa textura `player-rig` só com `rig=1` | O corpo de 32 texels mais o punho acima da cabeça não cabem em 32x30; `PLAYER_FRAME_*` e os frames atuais não mudam | n |
| Punho do hit do heroico alto | Acima e à frente da cabeça, dentro da hitbox do `ganchoAscendente` crescida 20 px para cima (`RIG_UPPERCUT_HITBOX`), usada pelo Player só com `rig=1` | A hitbox do `MOVES` + 4 px prende o pulso a 24,5 texels do pé e o corpo de 32 tem o cabelo em ~31; sem `rig=1` a hitbox do jogo não muda | n |
| Camada do braço do gancho | Nos quadros do gancho do heroico alto a cabeça cobre o braço de perto (`headOverNearArm`) | Em vista lateral o braço que sobe cruza o rosto; por trás do queixo o olho fica visível, como nos sprites de luta de 3/4 | n |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Gancho ascendente pelo boneco articulado ⭐ MVP

**User Story**: Como jogador, quero um gancho ascendente com braço de tamanho real e movimento fluido, para o golpe ter o peso de um jogo de luta.

**Why P1**: É o golpe da queixa original e a prova da técnica.

**Acceptance Criteria**:

1. RIG-01: The rig SHALL define a skeleton with the joints hip, chest, neck, near and far shoulder, elbow, wrist, near and far hip joint, knee and ankle, each bone with a fixed length in texels.
2. RIG-02: WHEN a pose is rasterized THEN the length of every bone measured between its joint positions SHALL equal its defined length within 0.5 texel.
3. RIG-03: WHEN a pose is rasterized THEN the output SHALL be a grid of 30 rows by 32 columns using only keys of `PALETTE`.
4. RIG-04: The rasterized `ganchoAscendente-wind`, `-hit` and `-recover` frames SHALL pass POS-02 (single 8-connected component).
5. RIG-05: The rasterized `ganchoAscendente-hit` frame SHALL pass POS-03 (a texel on the bottom row).
6. RIG-06: The wrist position of the rasterized `ganchoAscendente-hit` SHALL pass POS-01, POS-05 and POS-10 when used as its ponto de golpe.
7. RIG-07: WHEN `inbetween(a, b, t)` is called with t = 0 and t = 1 THEN it SHALL return the poses `a` and `b`.
8. RIG-08: The preview tool SHALL write a PNG with the current and the rig `ganchoAscendente` frames side by side and a strip with at least 8 frames of the rig motion.
9. RIG-09: WHERE the URL has `?debug&rig=1` the game SHALL use the rig `ganchoAscendente-wind`, `-hit` and `-recover` frames in place of the current ones.
10. RIG-10: WHERE the URL does not have `rig=1` the game SHALL keep the current `ganchoAscendente` frames.

**Independent Test**: `npm test` passa os invariantes; a prancha mostra as duas versões; `?debug&rig=1` mostra o gancho novo no jogo.

---

### P2: Estudo de proporções do boneco

**User Story**: Como jogador, quero um personagem com proporções de lutador (cabeça menor, pernas longas, braço do tamanho do corpo), para ele não parecer um anão de braços grandes.

**Acceptance Criteria**:

1. PRP-01: The rig SHALL define three `Proportions` presets (`heroico`, `semi`, `inter`) whose standing height is 24 to 26 texels and equals head + neck + torso + thigh + shin + sole.
2. PRP-02: In every preset the near and far arm, leg and foot SHALL have the same length.
3. PRP-03: Each preset SHALL have its own head grid with the spiked hair, the eye and the `k` outline, with as many rows as its `head` proportion.
4. PRP-04: For each preset the rasterized idle, wind, hit, recover and the 12 sequence frames SHALL pass RIG-02, RIG-03, POS-02 (and POS-03 for the hit) with no clipped texel.
5. PRP-05: For each preset the wrist of the hit SHALL pass POS-01, POS-05 and POS-10 with the arm not longer than the preset's arm.

---

### P3: Heroico alto no jogo

**User Story**: Como jogador, quero o personagem com proporções heroicas de ~32 texels, rosto expressivo e o gancho ascendente tocando no jogo, para comparar com o sprite atual e decidir a migração.

**Acceptance Criteria**:

1. PRA-01: The rig SHALL define a `heroicoAlto` preset whose standing height is 31 to 33 texels and equals head + neck + torso + thigh + shin + sole, with head/height between 0.19 and 0.25 and (thigh + shin + sole)/height of at least 0.49.
2. PRA-02: In the `heroicoAlto` preset the near and far arm, leg, foot, shoulder and pelvis SHALL have the same length.
3. PRA-03: The `heroicoAlto` preset SHALL have an idle head grid and a fight head grid, each with `head` rows, the spiked hair (`h`, `H`, `j`), the eye with iris and highlight (`b`, `w`), the skin line (`x`) and the `k` outline, and the fight grid SHALL differ from the idle grid.
4. PRA-04: WHEN the `heroicoAlto` idle, wind, hit, recover and the 12 sequence frames are rasterized in the 40x40 frame THEN each SHALL use only `PALETTE` keys, be a single 8-connected component, have no clipped texel and keep every bone length within 0.5 texel, and the hit SHALL have a texel on the bottom row.
5. PRA-05: The wrist of the `heroicoAlto` hit, converted with the 40x40 frame origin (column 12, foot on the bottom row), SHALL lie within `RIG_UPPERCUT_HITBOX` (the `ganchoAscendente` hitbox grown 20 px upward) plus 4 px, above the hair top of `idle-0` and at least 6 texels ahead of the origin; WHERE the URL has no `rig=1` `rigHitbox` SHALL return undefined.
6. PRA-06: In every sequence frame of the `heroicoAlto` uppercut the near wrist texel SHALL NOT be an opaque texel of the head grid, and in the hit frame the topmost opaque row SHALL be above the head grid and contain skin keys (the fist is above the head).
7. PRA-07: The `heroicoAlto` idle frame SHALL contain the trousers keys `K` and `n` below the belt, the buckle `A` and `z`, the jacket highlight `s` or `S`, the cold rim `y` and a sole line under each shoe.
8. PRA-08: WHERE the URL has `?debug&rig=1` the game SHALL register a `player-rig` texture with the 12 `heroicoAlto` frames (40x40, origin at the foot on column 12), the Player SHALL draw them during the `ganchoAscendente` and return to `player-art` afterwards, and the strike points of the rig wind and hit SHALL be the rig wrist; WHERE the URL has no `rig=1` the `player-rig` texture SHALL NOT be registered.
9. PRA-09: The preview tool SHALL write `heroico.png`, `tira.png`, `rosto.png` and `escala.png` at 6x into `.fable-out/`.

**Independent Test**: `npm test` passa os PRA-*; as pranchas em `.fable-out/` mostram o heroico alto; `?debug&rig=1` toca os 12 quadros no jogo.

---

## Edge Cases

- EDG-01: IF a bone end falls outside the 32x30 grid THEN the rasterizer SHALL clip it and report the clipped texel count, like `composeWithStats`.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| RIG-01 | P1: Gancho ascendente pelo boneco | Execute | Done |
| RIG-02 | P1: Gancho ascendente pelo boneco | Execute | Done |
| RIG-03 | P1: Gancho ascendente pelo boneco | Execute | Done |
| RIG-04 | P1: Gancho ascendente pelo boneco | Execute | Done |
| RIG-05 | P1: Gancho ascendente pelo boneco | Execute | Done |
| RIG-06 | P1: Gancho ascendente pelo boneco | Execute | Done |
| RIG-07 | P1: Gancho ascendente pelo boneco | Execute | Done |
| RIG-08 | P1: Gancho ascendente pelo boneco | Execute | Done |
| RIG-09 | P1: Gancho ascendente pelo boneco | Execute | Done |
| RIG-10 | P1: Gancho ascendente pelo boneco | Execute | Done |
| PRP-01 | P2: Estudo de proporções | Execute | Done |
| PRP-02 | P2: Estudo de proporções | Execute | Done |
| PRP-03 | P2: Estudo de proporções | Execute | Done |
| PRP-04 | P2: Estudo de proporções | Execute | Done |
| PRP-05 | P2: Estudo de proporções | Execute | Done |
| PRA-01 | P3: Heroico alto no jogo | Execute | Done |
| PRA-02 | P3: Heroico alto no jogo | Execute | Done |
| PRA-03 | P3: Heroico alto no jogo | Execute | Done |
| PRA-04 | P3: Heroico alto no jogo | Execute | Done |
| PRA-05 | P3: Heroico alto no jogo | Execute | Done |
| PRA-06 | P3: Heroico alto no jogo | Execute | Done |
| PRA-07 | P3: Heroico alto no jogo | Execute | Done |
| PRA-08 | P3: Heroico alto no jogo | Execute | Pending |
| PRA-09 | P3: Heroico alto no jogo | Execute | Done |
| EDG-01 | Edge Cases | Execute | Done |

**Coverage:** 25 total, 25 mapped to implicit Execute steps (spike Medium), tests in `tests/game/rig.test.ts`, `tests/game/rigProportions.test.ts` and `tests/game/rigTall.test.ts`.

---

## Success Criteria

- [ ] O usuário olha a prancha e o jogo e diz se o gancho do boneco é melhor que o atual.
- [ ] `npm test` e `npm run build` passam; nenhum frame atual muda sem `rig=1`.
