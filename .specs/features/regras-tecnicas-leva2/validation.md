# Regras das técnicas da leva 2 — Validation

**Date**: 2026-10-15
**Spec**: `.specs/features/regras-tecnicas-leva2/spec.md` (KIT-01..03, CNV-01..10, CAO-01..10, TRV-01..09, ERU-01..09)
**Diff range**: `519ac6b..HEAD` (merge-base com `feat/regras-tecnicas-leva1`), branch `feat/regras-tecnicas-leva2`.
**Verifier**: verificador independente (não escreveu o código nem a revisão adversarial anterior). Leu a spec, o
plano (seções 2.1, 2.5, 4 e 5.1), as cinco regras, os quatro arquivos de dados e os cinco testes, e rodou o sensor de
mutação próprio numa caixa de areia fora do worktree.
**Histórico**: a revisão adversarial (outra sessão) achou e corrigiu 1 bug de API do Trovão (`swingId`), 1 borda da
Convergência (sonda negativa) e 12 mutantes vivos, no commit `5701321`. Esta verificação parte daquele estado.

## Validation

**Result**: PASS, depois do commit `b11bfe3 test(core): close leva2 verification gaps`.

Os 41 requisitos têm teste que falha quando o requisito quebra. A 1ª rodada do sensor desta verificação deixou 9
mutantes não equivalentes vivos (nenhum bug de código: todos eram lacunas de teste); os 9 testes novos matam todos.
Sobram 2 vivos, os dois equivalentes. Nenhum bug real achado no código.

---

## Spec-Anchored Acceptance Criteria

| AC | Valor da spec | Teste (`file:line`) e asserção | Mutante que prova | Result |
| --- | --- | --- | --- | --- |
| KIT-01 | caixa, círculo e entrada de trecho, bordas inclusas | `tests/core/techKit.test.ts:7` `boxesOverlap(box(0,0), box(20,0))` → true; `:17` raio 10 vs 9,9; `:23` `segmentEntry(...)` → 40 / 0 / null, borda de cima e de baixo → 40 | K2, K4 | PASS |
| KIT-02 | mais perto no raio (borda inclusa), fora do skip, empate pelo menor id | `tests/core/techKit.test.ts:42` raio 49 → null, 50 → id 2; lista invertida → id 1 | K1 | PASS |
| KIT-03 | `round(recarga × pct)` no 1º pedido, depois 0; pct 0 → 0 | `tests/core/techKit.test.ts:53` `claim()` → 690, depois 0 | K3 | PASS |
| CNV-01 | perfura 2, carga 600, largura 4, vida 6, dano 28, recarga 3500, energia 20, alcance 320 | `tests/core/convergence.test.ts:36` `toMatchObject({...})` | — | PASS |
| CNV-02 | no 3: perfura ∞, 300, 10, 0, 52, 2000 | `tests/core/convergence.test.ts:54` `it.each` por eixo | — | PASS |
| CNV-03 | 50% no toque, linear até 100%, satura | `tests/core/convergence.test.ts:68` `chargeMul(s,0)` 0,5 / 300 → 0,75 / 5000 → 1; `:77` dano 14 no toque | C1, C7 | PASS |
| CNV-04 | recusa com `vida − custo < 1` e devolve 20; custo 0 nunca recusa | `tests/core/convergence.test.ts:87` `{ ok:false, reason:'hp', refund:20 }` com vida 6, passa com 7; `:94` vida 1 com custo 0 | C6 | PASS |
| CNV-05 | ordem da entrada (empate pelo id) até a perfuração; largura; parede | `tests/core/convergence.test.ts:100` hits [1,2], fim (120,0); `:109` 320 entra, 322 não; `:131` parede em 150; `:144` empate pelo menor id | C2 | PASS |
| CNV-06 | estilhaços micro de 50% em 48 px | `tests/core/convergence.test.ts:160` `shards` com dano 18, raio 48, `band:'micro'` | C3, C9 | PASS |
| CNV-07 | 1 dobra até 160 px para o vivo não atingido | `tests/core/convergence.test.ts:191` 1 dobra no alvo 3; `:217` 160 dobra, 161 não | — | PASS |
| CNV-08 | 96 px, 4% (chefe 1%) | `tests/core/convergence.test.ts:227` raio 96, `bite` 4 / 30 / 8 | C9 | PASS |
| CNV-09 | até 3 dobras, cada uma 4% (chefe 1%) | `tests/core/convergence.test.ts:248` `[3,36,8],[4,36,30],[5,36,4]` | C5 | PASS |
| CNV-10 | 30% da recarga no abate com Recarga no 3 (feixe, dobra ou estilhaço) | `tests/core/convergence.test.ts:277` `refundMs` 600 / 0 / 0; `:283` abate pela dobra e **pelo estilhaço** → 600 | C4 | PASS |
| CAO-01 | 2 cães, 200, 1 mordida, prisão 0, custo 24, recarga 3500 | `tests/core/divineDogs.test.ts:44` `toMatchObject({...})` | — | PASS |
| CAO-02 | no 3: 4 cães (×1,25), 320, 3 mordidas de 8, prisão 600, 14, 2000 | `tests/core/divineDogs.test.ts:64` `it.each`; `:76` 2º ponto sem o bônus | — | PASS |
| CAO-03 | investida na faixa, mordida micro no 1º alvo, depois a cada 200 ms | `tests/core/divineDogs.test.ts:87` mordida aos 190 ms, `band:'micro'`; `:108` 2ª aos 390 | D5 | PASS |
| CAO-04 | somem aos 1200 ms, no alcance ou na última mordida | `tests/core/divineDogs.test.ts:115` `gone` aos 200; `:120` no alcance (x 200); `:141` aos 1200 mordendo | D4, D11 | PASS |
| CAO-05 | só a 1ª mordida de cada cão prende; chefe 25% | `tests/core/divineDogs.test.ts:151` `[1,600],[2,600],[1,0],[2,0]`, chefe 150; `:163` lobo e cão faminto não prendem no alvo seguinte | D1, D3 | PASS |
| CAO-06 | lobo: mordida × cães, salta a até 120 px a cada 150 ms, 3 alvos | `tests/core/divineDogs.test.ts:178` mordidas aos 190/340/490 com dano 18; `:194` 121 px não salta | D6, D7, D10 | PASS |
| CAO-07 | metade (para cima) à frente, o resto para trás | `tests/core/divineDogs.test.ts:201` `[1,1],[2,1],[3,2]` | D8 | PASS |
| CAO-08 | lobo por 5 alvos, 4% (chefe 1%) | `tests/core/divineDogs.test.ts:212` 5 mordidas com `bite` 4/30/4/4/8 | D10 | PASS |
| CAO-09 | cão com tempo pula para o vivo a até 80 px não mordido (também se o alvo morre); 4% uma vez | `tests/core/divineDogs.test.ts:243` `[150,1,4],[350,1,0],[550,2,4],[750,2,0]`; `:254` alvo morto → pula aos 350; `:271` 81 px não pula | D2, D7, D9 | PASS |
| CAO-10 | 30% no 1º abate | `tests/core/divineDogs.test.ts:279` `claimKillRefund()` 600, depois 0 | — | PASS |
| TRV-01 | 3 cargas, 2 saltos, 8, 0, 30, 6000, janela 8000, hitstop 18 | `tests/core/thunderFist.test.ts:34` `toMatchObject({...})` | — | PASS |
| TRV-02 | no 3: 6, 4 (raio 160), 16, 300 (chefe 75), 18, 3500 | `tests/core/thunderFist.test.ts:55` `it.each`; `:67` 2º ponto com raio 120 | T3 | PASS |
| TRV-03 | raio micro no golpeado e N saltos ao mais perto não visitado | `tests/core/thunderFist.test.ts:73` `bolt` completo; `:93` sem repetir; `:98` 120 conta, 121 não | T11, T12 | PASS |
| TRV-04 | erro, sem carga, fim da janela e 2º alvo do mesmo golpe não soltam; reconjurar repõe sem somar | `tests/core/thunderFist.test.ts:121`, `:131` (`swingId`), `:139` (7999/8000 ms), `:150` (3 → 4) | T1, T5 | PASS |
| TRV-05 | golpe forte solta coluna micro de 2× em ±24 px | `tests/core/thunderFist.test.ts:163` dano 16, 24 entra, 25 não; `:176` fraco não solta | T2, T9, T10 | PASS |
| TRV-06 | +250 ms (chefe 25%) | `tests/core/thunderFist.test.ts:183` 250 / 63, 550 / 138 | — | PASS |
| TRV-07 | coluna derruba o comum e tira 4% (chefe 1%) | `tests/core/thunderFist.test.ts:192` `knockdown` true/false, `bite` 8 / 30, depois 0 | T4 | PASS |
| TRV-08 | alvo ainda atordoado por esta carga: 4% (chefe 1%) e +1 salto uma vez por raio | `tests/core/thunderFist.test.ts:212` 2º raio `[1,4],[2,30],[3,4],[4,0]`; `:227` 250 ms depois não descarrega | T6, T8 | PASS |
| TRV-09 | 30% no 1º abate da carga | `tests/core/thunderFist.test.ts:252` 1050, depois 0, reconjurar → 1050 | — | PASS |
| ERU-01 | altura 64, 1 erupção, queima 0, dano 24, custo 30, recarga 3500 | `tests/core/eruption.test.ts:48` `toMatchObject({...})` | — | PASS |
| ERU-02 | no 3: 112, 4, 4, 42, 18, 2000 | `tests/core/eruption.test.ts:66` `it.each` | — | PASS |
| ERU-03 | pilar `i` aos `250 + 120·i` ms, a `80 + 56·i` px, acerto normal uma vez | `tests/core/eruption.test.ts:80` evento exato aos 250; `:105` `[250,80],[370,136],[490,192],[610,248]` | E9, E10 | PASS |
| ERU-04 | chip a cada 300 ms por até 2 s, renova sem somar, no instante do acerto | `tests/core/eruption.test.ts:122` `[550,...,2050]`; `:129` renovação; `:135` passo de 1 s → `[2,3,1]` | E1 | PASS |
| ERU-05 | meteoro 400 ms depois, 56 px, 1,5×, derruba o comum | `tests/core/eruption.test.ts:153` evento aos 650, dano 36, `knockdown` true/false | E4 | PASS |
| ERU-06 | lava 64 px por 3 s, chip `max(3, queima)` a cada 300 ms | `tests/core/eruption.test.ts:173` 10 tiques de 3; `:201` passo de 1 s → `[2,3,4,1]`; `:209` queima 2 → 3; `:214` queima 4 → 4 | E2, E5, E6 | PASS |
| ERU-07 | estilhaços micro de 50% a 48 px, 200 ms depois; 4% (chefe 1%) no impacto, uma vez por alvo | `tests/core/eruption.test.ts:223` `[1,45,4],[2,45,30]`, estilhaços aos 850 em x 32 e 128; `:236` 2º meteoro → `bite` 0 | E7, E11 | PASS |
| ERU-08 | lava acaba e entra em erupção com o dano do pilar e 4% (chefe 1%), acendendo a queima | `tests/core/eruption.test.ts:258` `caldeira` aos 3250, `bite` 4 / 30; `:278` queima aos 3550..5050 | E3, E8 | PASS |
| ERU-09 | 30% no 1º abate | `tests/core/eruption.test.ts:289` 600, depois 0 | — | PASS |

**Status**: todos os 41 ACs cobertos com o valor da spec; nenhum gap de precisão da spec.

---

## Discrimination Sensor

Script `mutate.mjs` no rascunho `ver-lv2/`: copia as 12 fontes da leva 2 (regras, dados, `axisRule`, `techRule`) e os
5 testes para uma caixa de areia **fora do worktree**, aplica cada mutante na cópia, roda o teste par com o vitest do
worktree e restaura a cópia. O `git status --porcelain` do worktree, medido antes e depois, não mudou com o sensor.

**Sensor depth**: reforçado (48 mutantes, todos os ramos de cada técnica).

1ª rodada: 48 mutantes, 37 mortos, 11 vivos. Os 9 não equivalentes:

| Mutante | Arquivo | O que mudou | Teste que passou a matar |
| --- | --- | --- | --- |
| K2 | `src/core/techKit.ts:36` | trecho na altura da borda de baixo da caixa vira `null` | `tests/core/techKit.test.ts:23` |
| C4 | `src/core/convergence.ts:248` | abate pelo estilhaço da Supernova não devolve a recarga | `tests/core/convergence.test.ts:283` |
| D1 | `src/core/divineDogs.ts:210` | a prisão volta a cada alvo novo do lobo e do cão faminto | `tests/core/divineDogs.test.ts:163` |
| D2 | `src/core/divineDogs.ts:232` | cão faminto cujo alvo morre some em vez de pular | `tests/core/divineDogs.test.ts:254` |
| E1 | `src/core/eruption.ts:205` | a queima conta do quadro, não do instante do acerto | `tests/core/eruption.test.ts:135` |
| E2 | `src/core/eruption.ts:159` | a lava conta do quadro, não do instante do pilar | `tests/core/eruption.test.ts:201` |
| E3 | `src/core/eruption.ts:205` | a Caldeira não acende a queima | `tests/core/eruption.test.ts:278` |
| E6 | `src/core/eruption.ts:250` | lava com `queima` no lugar de `max(3, queima)` | `tests/core/eruption.test.ts:209` |
| E11 | `src/core/eruption.ts:209` | componente sem livro (sai de novo no 2º meteoro) | `tests/core/eruption.test.ts:236` |

2ª rodada (os 48 de novo, contra os testes novos): 46 mortos, 2 vivos, os dois equivalentes:

- **C8** (`src/core/convergence.ts:155`, tirar o teto do alcance sobre a sonda): o contrato `WallProbe` só devolve
  distâncias até `maxDist`, então a sonda nunca passa de 320.
- **T7** (`src/core/thunderFist.ts:180`): mutante de controle, logicamente igual ao original.

Mortos que confirmam a revisão anterior: borda do raio (K1), trava da devolução (K3), perfuração (C2), piso de vida
(C6), Mordidas no lobo (D6), espera antes do salto (D7), Matilha para baixo (D8), livro da Matilha Faminta (D9),
janela do Trovão (T1), `swingId` (T5), fim do atordoamento (T6), Descarga no golpeado (T8), coluna no golpe fraco (T9),
tique do fim da lava (E5), Caldeira sem Despertar (E8), pilar atrasado um quadro (E9).

**Result**: 46/46 não equivalentes mortos.

---

## Conferência com o plano

- **2.1, regra de eixos**: Nv = 1 + pontos (`src/core/axisRule.ts:31`); ramo só a partir do Nv 2 e Despertar no Nv 5
  (`src/core/axisRule.ts:44`), conferidos pelos testes "no Nv 4 (sem Despertar)" de cada técnica e pelas bordas
  (`tests/core/divineDogs.test.ts:288`). Componente de 4% (chefe 1%) uma vez por alvo por conjuração (`BiteLedger`,
  `src/core/techKit.ts:94`); Recarga no 3 devolve 30% (`KillRefund`, `src/core/techKit.ts:75`).
- **2.1, alcance travado em 320 px**: feixe 320; Cães no 3 vão a 320; Erupção no 3 chega a 248 + 48 + 24 = 320 com o
  estilhaço. Saltos, dobras e estilhaços que partem de um alvo dependem do contrato "só alvos dentro da tela"
  (`src/core/techKit.ts:8`), que a F41 precisa honrar.
- **2.5, molde do eixo de 2 passos** (Cargas do Boogie 1, 2, 3, 3 + bônus): Cães `[2,3,4,4]` com investida ×1,25,
  Mordidas `[1,2,3,3]` com 6 → 8, Saltos `[2,3,4,4]` com raio 120 → 160; os testes do 2º ponto sem o bônus estão em
  `tests/core/divineDogs.test.ts:76` e `tests/core/thunderFist.test.ts:67`.
- **5.1, números das pontas**: Convergência 2 → ∞, 600 → 300, 4 → 10, 6 → 0, 28 → 52; Cães 2 → 4, 200 → 320, 1 → 3,
  0 → 600; Trovão 3 → 6, 2 → 4, 8 → 16, 0 → 300, micro com 18 ms por salto (faixa 15 a 20); Erupção 1 → 4, queima
  0 → 4 a cada 300 ms por no máximo 2 s, 24 → 42. Todos batem com `src/data/*.ts` e com os testes CNV/CAO/TRV/ERU-01 e 02.
- **Seção 4, faixas**: mordida, raio, coluna e estilhaços saem `micro`; queima e lava `chip`; pilar, meteoro, Caldeira e
  feixe `normal`.
- **`TechId`, `TECHNIQUES` e catálogo**: `git diff --stat 519ac6b..HEAD` só toca os 5 arquivos de regra, os 4 de dados,
  os 5 testes e a spec; nada da loja ou do catálogo.

## Nada automático

- **Convergência**: só existe em `fireBeam`, chamado na soltura; `chargeMul` satura em 1 e não há relógio de disparo.
- **Cães**: nascem só em `summonDogs` (a tecla); todo cão some aos 1200 ms (`src/core/divineDogs.ts:172`) e `done` fica
  verdadeiro. Só o lobo (ramo) e a Matilha Faminta (Despertar) escolhem o próximo alvo, como a spec decide.
- **Trovão**: `update` só corre a janela e os atordoamentos; o raio sai apenas em `onStrike`, que o adaptador chama
  quando um golpe do moveset acerta. O fim da janela apaga as cargas sem soltar nada (`tests/core/thunderFist.test.ts:139`).
- **Erupção**: tudo nasce de `erupt` (a tecla); a Caldeira é a consequência agendada da mesma conjuração e acaba com a
  lava; `done` fica verdadeiro (`tests/core/eruption.test.ts:258`).

## Code Quality

| Princípio | Status |
| --- | --- |
| Código mínimo, sem abstração de uso único | PASS (o kit comum é usado pelas 4 técnicas) |
| Mudanças cirúrgicas | PASS (esta verificação só acrescentou testes) |
| Sem escopo extra | PASS |
| Segue o padrão da leva 1 (`{ axes, branch }`, `RangeError`, eventos com faixa) | PASS |
| Asserções com o valor da spec | PASS |
| Todo teste mapeia um AC, borda ou detalhe fixado da spec | PASS |
| Guia do projeto: `CLAUDE.md` (core puro com teste par, 400 linhas por arquivo) | PASS (maior teste: 299 linhas) |

## Edge Cases

- [x] Vida em `custo + 1` passa, em `custo` recusa: `tests/core/convergence.test.ts:87`.
- [x] Perfuração "todos" com parede antes do 1º alvo; Supernova estoura na parede: `tests/core/convergence.test.ts:131`, `:177`.
- [x] Cão com alvo morto some (`tests/core/divineDogs.test.ts:131`) ou pula na Matilha Faminta (`:254`); alvo atrás não é mordido (`:87`).
- [x] Raio sem vizinho só pega o golpeado; vizinho na borda conta: `tests/core/thunderFist.test.ts:98`.
- [x] Caixa tocada por dois pilares toma dos dois; queima renova sem somar: `tests/core/eruption.test.ts:105`, `:129`.

## Não corrigido (fica anotado)

- Os passos do meio das tabelas (ponto 1 e 2) não têm teste próprio além dos casos que os usam; a spec só exige o 0 e
  o 3 ("cada eixo é coberto no 0 e no 3").
- Herdado da revisão anterior: precisão de quadro das mordidas dos Cães (até 1 quadro), dobras e estilhaços da
  Convergência atravessam parede, Erupção adiantada da leva 3 para a 2. Nenhum contradiz a spec.
- A Supernova também acerta o último atravessado (o fim do feixe é o centro dele); a spec e o teste
  `tests/core/convergence.test.ts:160` assumem isso. Vale olhar o feel na F41.

## Gate Check

- **Comandos**: `npm run gate` e, por partes, `tsc --noEmit`, `oxlint`, `prettier --check .`, `vitest run`.
- **Testes da leva 2**: 123 passaram (eram 116; +7 casos, 9 mutantes cobertos).
- **Suíte inteira**: 3165 de 3166 verdes; o 1 que falhou é `tests/game/art/sceneryThemes.test.ts` por tempo (5000 ms
  com a máquina carregada), e passa sozinho (22/22).
- **Typecheck e prettier**: verdes.
- **Lint**: o único erro é `tests/core/resonance.test.ts` com 424 linhas, arquivo da leva 1 que o outro verificador
  editava, sem commit, no mesmo worktree. Os 4 arquivos de teste deste commit passam no oxlint e no prettier.

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| KIT-01..03 | Implemented | Verified |
| CNV-01..10 | Implemented | Verified |
| CAO-01..10 | Implemented | Verified |
| TRV-01..09 | Implemented | Verified |
| ERU-01..09 | Implemented | Verified |

## Summary

**Overall**: pronto para a F41.
**Spec-anchored check**: 41/41 ACs batem com o valor da spec.
**Sensor**: 46/46 mutantes não equivalentes mortos (2 equivalentes vivos).
**Gate**: typecheck, prettier e testes da leva 2 verdes; o lint vermelho e o teste por tempo não vêm desta leva.
