# Personagem e Vermelho — Specification

## Problem Statement

O usuário vê dois problemas visuais no jogo.

**Inconsistências no personagem.** A leitura do código achou estes defeitos:
- `chuteGiratorio-hit` espelha o frame inteiro com `mirror()`, e o boneco salta ~11 texels para trás no impacto.
- `chuteGiratorio-wind` e `chuteCarregado-wind` desenham as pernas nas colunas 17–21, longe do tronco (colunas 0–8), e elas ficam soltas.
- `chuteEmpurrao-hit` põe o braço de trás em x = −1, e o `compose` corta essa parte sem avisar.
- A mão `WRIST_GRIP` do Vermelho não passa pelo escurecimento do braço de trás.
- Seguem pendentes do UAT de `sprite-player-polish`: `land-1` com pernas longas, braço de trás solto no `jump-0` e cabeça torta no `ganchoAscendente-hit`.

**O Vermelho não lembra o anime.**
- O orbe tem núcleo âmbar e laranja (`A`/`a`) e lê como fogo, não como o carmim da Reversão de Técnica do Gojo.
- Não existe a rajada de repulsão.
- O orbe nasce num deslocamento fixo `(20, −8)` (`RedOrb.ts:13`), que só bate com os dedos no frame de carga.

Esta feature corrige os sprites, cria testes que impedem a volta desses defeitos e refaz o visual do Vermelho em carmim, com repulsão na soltura (decisão do usuário em 02/10: "Carmim + repulsão"). Faz parte da expansão "Combate de Mestre" (`docs/superpowers/specs/2026-10-02-combate-mestre-design.md`) e pode correr em paralelo com a F11.

## Goals

- [ ] Nenhum frame do player tem parte solta, parte cortada ou salto de tronco entre frames seguidos de uma mesma animação, e testes automáticos garantem isso.
- [ ] O Vermelho é carmim, magenta e branco, sem laranja nem âmbar. O orbe nasce na ponta dos dedos em todas as fases e a soltura empurra quem está perto.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Frames novos `duck`, `duck-counter` e `counter` | Dependem da mecânica da F12 para ser validados; vão para lá |
| Trocar o personagem pelo Gojo (cabelo branco, venda) | Não foi pedido; o personagem é próprio |
| Mudar dano, custo ou recarga do Vermelho | Balanceamento fica na F11 (economia) e na F12 (combate) |
| Azul, Desmantelar, Divergente e Kokusen | Só o Vermelho foi pedido |
| Sprites de inimigos e do chefe | Fora do pedido |

---

## Assumptions & Open Questions

**Open questions:** none - all resolved or logged above.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Cores novas | `t: 0xd1103a` (carmim) e `T: 0xff4f8b` (magenta-claro); paleta de 40 para 42 (AD-017) | Chaves livres de 1 caractere, mesma família (minúscula escura, maiúscula clara) | y |
| Rampa do orbe | núcleo `W` → `T` → `R` → borda `t` | Branco no centro e carmim na borda, como no anime | y |
| Parte solta | Os pixels opacos do frame formam um único componente 8-conexo, ignorando `S` (rastro de movimento, SPR-14) | Pega as pernas soltas e o braço solto; o rastro é solto de propósito | y |
| Parte cortada | O `compose` conta os pixels opacos descartados por cair fora da grade; tem que ser 0 em todo frame | Hoje o corte é silencioso | y |
| Salto de tronco | O centro horizontal dos pixels de uniforme (`n`, `N`, `o`) muda no máximo 4 texels entre frames seguidos da mesma animação ou do mesmo golpe (wind → hit → recover) | O defeito do giratório é de ~11 texels; inclinação legítima fica abaixo de 4 | y |
| `land-1` | A altura opaca de `land-1` é ≤ a de `idle-0` | Aterrissar agacha; pernas mais longas que o normal são o defeito | y |
| Cabeça torta no `ganchoAscendente-hit` | Verificação visual no UAT (sprite-preview) | Não há medida objetiva simples | y |
| Ponta dos dedos | Em cada frame `vermelho-sign/charge/release`, o pixel `R` mais à frente (maior coluna) do braço esticado é a âncora do orbe | Os dedos já são pintados de `R`/`r` | y |
| Repulsão na soltura | Inimigos comuns à frente do player, com centro até 80 px na horizontal e até 48 px na vertical, levam 4 de dano `light` e força 10 para longe do player | Empurra e cambaleia sem ragdoll; o dano do orbe continua o mesmo | y |
| Velocidade do orbe | 760 px/s (era 560); o alcance de 420 px continua | Rajada mais rápida, como no anime | y |
| Supersede | RED-05 (560 px/s) e as cores de RED-02/03/11 da F5 passam a valer como aqui | Decisão do usuário | y |
| Sem WebGL | Os postFX (Glow) são pulados e o resto toca (AD-009) | Regra existente | y |

---

## User Stories

### P1: Personagem sem partes soltas, cortes ou saltos ⭐ MVP

**User Story**: Como jogador, quero que o personagem tenha um corpo consistente em todos os golpes, para o jogo parecer bem acabado.

**Why P1**: Pedido direto do usuário.

**Acceptance Criteria**:

1. SPF-01: The conjunto de pixels opacos de todo frame do player (exceto `S`) SHALL formar um único componente 8-conexo.
2. SPF-02: The `compose` SHALL descartar 0 pixels opacos fora da grade 32×24 em todo frame do player.
3. SPF-03: The centro horizontal dos pixels `n`/`N`/`o` SHALL mudar no máximo 4 texels entre dois frames seguidos de uma mesma animação ou de um mesmo golpe (wind → hit → recover).
4. SPF-04: The `chuteGiratorio-hit` SHALL ter o centro horizontal dos pixels `n`/`N`/`o` a no máximo 4 texels da coluna 10 (origem).
5. SPF-05: The altura opaca de `land-1` SHALL ser menor ou igual à de `idle-0`.
6. SPF-06: The pixels da mão `WRIST_GRIP` nos frames do Vermelho SHALL não usar a chave `p` (pele clara do braço da frente).
7. SPF-07: The baseline de bbox (AD-012) SHALL continuar valendo (±2 texels) para todo frame que esta feature não alterou.

**Independent Test**: `npm test` roda os testes de conectividade, corte e salto em todas as folhas do player; `node tools/sprite-preview.mjs` gera a prancha para o UAT.

---

### P1: Vermelho carmim, nascendo nos dedos ⭐ MVP

**User Story**: Como fã do anime, quero que o Vermelho tenha a esfera carmim brilhante na ponta dos dedos, para reconhecer a técnica do Gojo.

**Why P1**: Pedido direto do usuário.

**Acceptance Criteria**:

1. RDA-01: The `PALETTE` SHALL ter exatamente 42 cores, incluindo `t = 0xd1103a` e `T = 0xff4f8b`.
2. RDA-02: The frames do orbe de 8 e 12 texels SHALL ter a rampa `W` (até 0,3 do raio), `T` (até 0,55), `R` (até 0,8) e `t` (borda).
3. RDA-03: The frames do orbe e todas as cores usadas pelo `RedOrbFx` SHALL não conter `a` nem `A`.
4. RDA-04: WHILE o Vermelho está em `sign`, `charge` ou `release`, o centro do orbe SHALL ficar a no máximo 2 px da ponta dos dedos do frame atual do player.
5. RDA-05: WHILE o Vermelho está em `charge`, o snapshot SHALL mostrar `fx.red.glowColor` igual a `PALETTE.t`.
6. RDA-06: WHILE o Vermelho está em `charge` num renderer WebGL, o snapshot SHALL mostrar `fx.red.glow` igual a `{ active: true, color: PALETTE.t }`.
7. RDA-07: WHILE o Vermelho está em `charge`, `fx.layers` SHALL incluir `red.distortRing`, dois arcos `T` girando em volta do orbe com período de 400 ms.

**Independent Test**: `?debug&fxlab` com câmera lenta mostra a esfera carmim nascendo nos dedos com halo e arcos girando.

---

### P1: Repulsão e rajada ⭐ MVP

**User Story**: Como jogador, quero que soltar o Vermelho empurre quem está perto e dispare uma rajada rápida, para sentir a força de repulsão do anime.

**Why P1**: A repulsão é o que define o Vermelho no anime.

**Acceptance Criteria**:

1. RDA-08: WHEN o Vermelho entra em `release` THEN todo inimigo comum à frente do player, com centro até 80 px na horizontal e até 48 px na vertical, SHALL levar um golpe de 4 de dano `light` com força 10 para longe do player.
2. RDA-09: IF o centro de um inimigo comum está atrás do player (sinal de `x − player.x` oposto ao `facing`) na soltura THEN o HP desse inimigo SHALL não mudar por causa da repulsão.
3. RDA-10: WHEN o Vermelho entra em `release` THEN `fx.layers` SHALL incluir `red.repulse`, um cone `T`/`t` de 80 px à frente, por 120 ms.
4. RDA-11: WHEN o orbe é lançado THEN ele SHALL viajar a 760 px/s.
5. RDA-12: WHILE o orbe está em voo, o rastro SHALL criar um fantasma `t` a cada frame (16,67 ms), que some em 180 ms.
6. RDA-13: WHEN o orbe detona THEN o snapshot SHALL mostrar `fx.red.screenFlashColor` igual a `PALETTE.t`.
7. RDA-14: WHEN o orbe detona THEN a esfera, a onda de choque e as faíscas SHALL usar só as cores `b`, `t`, `T`, `R` e `W`.
8. RDA-15: WHEN o orbe detona THEN a camada `red.screenFlash` SHALL ficar em `fx.layers` por 80 ms (arredondado para frames inteiros).

**Independent Test**: `?debug&tech=vermelho`: com um inimigo colado à frente e outro atrás, soltar o Vermelho empurra só o da frente; o orbe percorre 420 px em ~553 ms.

---

## Edge Cases

- EDG-01: IF o renderer não é WebGL THEN `fx.red.glow.active` SHALL ser `false` e as camadas `red.orb`, `red.glowRing` e `red.distortRing` SHALL aparecer em `fx.layers` durante a carga (AD-009).
- EDG-02: IF o Vermelho é solto no ar THEN a repulsão SHALL acontecer igual, e o recuo do player no chão (RED-15) SHALL continuar só no chão.
- EDG-03: WHEN a repulsão atinge o chefe THEN ela SHALL não ter efeito nele (só o orbe o atinge, RED-09).

---

## Implicit-requirement dimensions sweep

| Dimensão | Resultado |
| --- | --- |
| Input validation & bounds | Grade 32×24 (SPF-02); paleta de 42 (RDA-01) |
| Failure / partial-failure states | EDG-01 (sem WebGL) |
| Idempotency / duplicate handling | A repulsão acerta cada inimigo uma vez por soltura (RDA-08) |
| Auth boundaries & rate limits | N/A: jogo local |
| Concurrency / ordering | N/A: efeito de um player só |
| Data lifecycle / expiry | Fantasmas somem em 180 ms (RDA-12); `red.repulse` dura 120 ms (RDA-10) |
| Observability | `fx.layers` ganha `red.distortRing` e `red.repulse`; o snapshot mostra o centro do orbe na carga (`techObjects` ou `fx`) |
| External-dependency failure | N/A |
| State-transition integrity | RDA-04 cobre as três fases; EDG-02 |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| SPF-01 | P1: Personagem | Specify | Implementing |
| SPF-02 | P1: Personagem | Specify | Implementing |
| SPF-03 | P1: Personagem | Specify | Implementing |
| SPF-04 | P1: Personagem | Specify | Implementing |
| SPF-05 | P1: Personagem | Specify | Implementing |
| SPF-06 | P1: Personagem | Specify | Pending |
| SPF-07 | P1: Personagem | Specify | Pending |
| RDA-01 | P1: Vermelho carmim | Specify | Pending |
| RDA-02 | P1: Vermelho carmim | Specify | Pending |
| RDA-03 | P1: Vermelho carmim | Specify | Pending |
| RDA-04 | P1: Vermelho carmim | Specify | Pending |
| RDA-05 | P1: Vermelho carmim | Specify | Pending |
| RDA-06 | P1: Vermelho carmim | Specify | Pending |
| RDA-07 | P1: Vermelho carmim | Specify | Pending |
| RDA-08 | P1: Repulsão | Specify | Pending |
| RDA-09 | P1: Repulsão | Specify | Pending |
| RDA-10 | P1: Repulsão | Specify | Pending |
| RDA-11 | P1: Repulsão | Specify | Pending |
| RDA-12 | P1: Repulsão | Specify | Pending |
| RDA-13 | P1: Repulsão | Specify | Pending |
| RDA-14 | P1: Repulsão | Specify | Pending |
| RDA-15 | P1: Repulsão | Specify | Pending |
| EDG-01 | Edge cases | Specify | Pending |
| EDG-02 | Edge cases | Specify | Pending |
| EDG-03 | Edge cases | Specify | Pending |

**Coverage:** 25 total, 0 mapped to tasks, 25 unmapped ⚠️

---

## Success Criteria

- [ ] `npm test` falha se alguém reintroduzir uma perna solta, um corte ou o salto do giratório (o sensor do Verifier mostra isso).
- [ ] UAT do usuário: o Vermelho "parece o do anime" no FxLab, e o personagem não "pula" nem "quebra" nos chutes.
