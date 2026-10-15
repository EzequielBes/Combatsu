# Regras das técnicas da leva 2 — Validation

**Date**: 2026-10-15
**Spec**: `.specs/features/regras-tecnicas-leva2/spec.md` (KIT-01..03, CNV-01..10, CAO-01..10, TRV-01..09, ERU-01..09)
**Diff range**: `519ac6b..1fc6490` (merge-base com `feat/regras-tecnicas-leva1`), branch `feat/regras-tecnicas-leva2`, 6 commits.
**Verifier**: revisor adversarial separado do autor (outra sessão, sem ter escrito o código). Leu spec, plano (seções
2.1, 4 e 5.1), as cinco regras e os cinco testes, e rodou 2 rodadas de mutação à mão.
**Pendência**: conferir no jogo, na F41, o que a regra pura não mostra (leitura da investida, raio, pilar).

## Validation

**Result**: PASS depois das correções do commit `fix(core): tighten leva 2 technique rules after review`.

Os 41 ACs têm teste que confere o número da spec. Antes das correções: 1 bug de API (Trovão), 1 borda sem guarda
(Convergência) e 12 mutantes vivos não equivalentes. Depois: os 12 morrem, e os 2 vivos que sobram são equivalentes.

---

## Achados e correções

| # | Achado | Tipo | Correção |
| --- | --- | --- | --- |
| 1 | `ThunderFist.onStrike` gastava 1 carga **por alvo**: um golpe forte que pega 3 inimigos queimava 3 cargas de uma vez. O plano diz "os próximos 3 golpes do moveset" | bug de API / divergência do plano | `LandedStrike` ganha `swingId` (o mesmo do `Hit`, IMP-14); o 2º alvo do mesmo golpe devolve `null` e não gasta. Teste novo em TRV-04 |
| 2 | Convergência: sonda de parede negativa (boca já dentro da parede) virava a faixa para trás e punha o `end` atrás do player | borda sem guarda | a distância da sonda é presa em 0. Teste novo em CNV-05 |
| 3 | Dobras, estilhaços e saltos partem do fim do alcance ou de um alvo e podiam acertar fora da tela (Sangue Perfurante chega a 800 px; o plano trava tudo em 320) | divergência do plano | contrato escrito no `techKit.ts` e na spec: o adaptador passa só os alvos vivos dentro da tela |
| 4 | O sinal dos Cães fica fora do relógio da matilha e o da Erupção fica dentro | API inconsistente | não mudou o comportamento (testes e números dependem dele); a doc de `summonDogs` e de `erupt` diz quando o adaptador chama cada um |
| 5 | Testes que não discriminavam (ver o sensor abaixo) | teste fraco | 12 testes novos ou reforçados |

## Nada automático

- **Cães**: só nascem em `summonDogs` (a tecla). Mordem o 1º alvo da própria faixa; o salto existe só no lobo da
  Totalidade e no Despertar Matilha Faminta, e tudo some aos 1200 ms (`update` força o `gone`; CAO-04 confere com
  um cão ainda mordendo). `done` fica verdadeiro e nada continua.
- **Trovão**: `update` só corre a janela e os atordoamentos; o raio sai apenas em `onStrike`, que o adaptador chama
  quando um golpe do moveset acerta. Sem golpe, nada sai; o fim da janela apaga as cargas sem soltar raio (TRV-04).
- **Convergência**: `chargeMul` satura em 1 e não há relógio de disparo: segurar além da carga cheia não dispara.
- **Erupção**: só existe a partir de `erupt` (a tecla); os pilares, a queima e a lava acabam e `done` fica verdadeiro.

## Spec-Anchored Acceptance Criteria

| AC | Spec-defined outcome | Teste | Result |
| --- | --- | --- | --- |
| KIT-01 | caixa, círculo, entrada de trecho (bordas inclusas, nos dois sentidos) | `tests/core/techKit.test.ts:6` | PASS |
| KIT-02 | o mais perto no raio, fora do skip, empate pelo menor id (em qualquer ordem da lista) | `tests/core/techKit.test.ts:33` | PASS |
| KIT-03 | `round(recarga × pct)` só no 1º pedido; componente uma vez por alvo | `tests/core/techKit.test.ts:50` | PASS |
| CNV-01, CNV-02 | base e cada eixo no 3 | `tests/core/convergence.test.ts:35`, `:54` | PASS |
| CNV-03 | 50% no toque, linear até 100% | `tests/core/convergence.test.ts:67` | PASS |
| CNV-04 | recusa com `vida − custo < 1`; custo 0 nunca recusa | `tests/core/convergence.test.ts:86` | PASS |
| CNV-05 | ordem da entrada (empate pelo id), perfuração, largura, parede (inclusive negativa) | `tests/core/convergence.test.ts:99` | PASS |
| CNV-06 | estilhaços micro de 50% em 48 px, empate pelo id | `tests/core/convergence.test.ts:159` | PASS |
| CNV-07 | 1 dobra só, até 160 px, só no vivo | `tests/core/convergence.test.ts:190` | PASS |
| CNV-08 | 96 px e 4% / 1% | `tests/core/convergence.test.ts:216` | PASS |
| CNV-09 | até 3 dobras com 4% / 1%; o componente conta para o abate | `tests/core/convergence.test.ts:239` | PASS |
| CNV-10 | 30% no abate com Recarga no 3 | `tests/core/convergence.test.ts:266` | PASS |
| CAO-01, CAO-02 | base, cada eixo no 3, e o 2º ponto sem o bônus do 3º | `tests/core/divineDogs.test.ts:43`, `:64` | PASS |
| CAO-03 | investida a 480 px/s em faixas rentes ao chão; micro de 6; 2ª mordida 200 ms depois | `tests/core/divineDogs.test.ts:86` | PASS |
| CAO-04 | somem na última mordida, no alcance, com o alvo morto ou aos 1200 ms | `tests/core/divineDogs.test.ts:114` | PASS |
| CAO-05 | só a 1ª mordida de cada cão prende; chefe 25% | `tests/core/divineDogs.test.ts:150` | PASS |
| CAO-06 | lobo: mordida × cães, saltos de 120 px a cada 150 ms, 3 alvos | `tests/core/divineDogs.test.ts:164` | PASS |
| CAO-07 | Matilha: metade arredondada para cima à frente | `tests/core/divineDogs.test.ts:187` | PASS |
| CAO-08 | Totalidade Negra: 5 alvos com 4% / 1% | `tests/core/divineDogs.test.ts:198` | PASS |
| CAO-09 | Matilha Faminta: pulo de 80 px para quem não mordeu, 4% uma vez | `tests/core/divineDogs.test.ts:226` | PASS |
| CAO-10 | 30% no 1º abate | `tests/core/divineDogs.test.ts:248` | PASS |
| TRV-01, TRV-02 | base, cada eixo no 3, e o 2º ponto de Saltos sem o raio maior | `tests/core/thunderFist.test.ts:33`, `:55` | PASS |
| TRV-03 | raio micro no golpeado e N saltos, borda inclusa, empate pelo id | `tests/core/thunderFist.test.ts:72` | PASS |
| TRV-04 | erro, falta de carga, fim da janela e 2º alvo do mesmo golpe não soltam; reconjurar repõe sem somar | `tests/core/thunderFist.test.ts:120` | PASS |
| TRV-05 | raio vertical de 2× em ±24 px no golpe forte | `tests/core/thunderFist.test.ts:160` | PASS |
| TRV-06 | +250 ms (chefe 25%) | `tests/core/thunderFist.test.ts:182` | PASS |
| TRV-07 | Raio Celeste derruba o comum e tira 4% / 1%; reconjurar abre o componente de novo | `tests/core/thunderFist.test.ts:191`, `:238` | PASS |
| TRV-08 | Descarga: 4% / 1% e +1 salto **uma vez por raio** (5º alvo no teste); reconjurar zera o atordoamento | `tests/core/thunderFist.test.ts:208`, `:238` | PASS |
| TRV-09 | 30% no 1º abate da carga | `tests/core/thunderFist.test.ts:251` | PASS |
| ERU-01, ERU-02 | base e cada eixo no 3 | `tests/core/eruption.test.ts:47`, `:66` | PASS |
| ERU-03 | 250 + 120·i ms, 80 + 56·i px, 32 px de largura, altura do eixo | `tests/core/eruption.test.ts:79` | PASS |
| ERU-04 | 6 tiques chip, renova sem somar, morre com o alvo | `tests/core/eruption.test.ts:121` | PASS |
| ERU-05 | meteoro 400 ms depois, 56 px, 1,5×, derruba o comum | `tests/core/eruption.test.ts:146` | PASS |
| ERU-06 | lava de 64 × 8 px por 3 s, chip `max(3, queima)` | `tests/core/eruption.test.ts:166` | PASS |
| ERU-07 | estilhaços micro de 50% em 24 px, a 48 px, 200 ms depois; 4% / 1% no impacto | `tests/core/eruption.test.ts:201` | PASS |
| ERU-08 | Caldeira com o dano do pilar e 4% / 1% | `tests/core/eruption.test.ts:230` | PASS |
| ERU-09 | 30% no 1º abate | `tests/core/eruption.test.ts:252` | PASS |

## Discrimination sensor

Script à mão (`mutate.mjs` no rascunho `lv2-revisao/`): troca um trecho, roda os 5 testes da leva 2 e restaura o
arquivo. 1ª rodada: 65 mutantes (números de `src/data/` e regras de `src/core/`), 51 mortos.

| Mutante vivo na 1ª rodada | Teste que passou a matar |
| --- | --- |
| `boxesOverlap` com `<` na 1ª comparação | KIT-01, caixas trocadas de lado |
| Curva com 2 dobras | CNV-07, um 5º alvo a 100 px do 1º dobrado |
| empate da entrada do feixe pelo maior id | CNV-05, "entrada empatada sai pelo menor id" |
| dobra que ignora o morto | CNV-07, "quem já morreu fica de fora" |
| empate dos estilhaços pelo maior id | CNV-06, "estilhaços à mesma distância" |
| dobra sem o componente no abate | CNV-09, "o componente conta para o abate da dobra" |
| faixa dos cães a 30 px do chão | CAO-03, alvo baixo e alvo que flutua |
| Descarga com +1 salto a cada atordoado | TRV-08, 5º alvo na fila |
| reconjurar sem zerar o atordoamento | TRV-07/08, reconjurar |
| reconjurar sem zerar o componente | TRV-07/08, reconjurar |
| lava com 4 px de altura | ERU-06, alvo pairando 7 e 9 px |
| estilhaço do meteoro com raio 30 | ERU-07, caixa a 24 e a 25 px |

2ª rodada (os 14 vivos e 3 novos): `swingId` ignorado e sonda negativa sem trava morrem. Os 2 vivos são equivalentes:

- `fireBeam` sem o `hpCost > 0`: com custo 0, `vida − 0 < 1` só recusa com vida abaixo de 1, que é player morto.
- queima com `nextMs < endMs`: os tiques caem em 300·k ms e nunca no 2000 exato.

## Não corrigido (fica anotado)

- **Cães, precisão de quadro**: a mordida seguinte conta a partir do quadro em que a anterior saiu, e a investida
  descarta o resto do passo ao travar. O erro é de no máximo 1 quadro por mordida; a Erupção, essa sim, conta no
  instante agendado. Corrigir pede outro relógio no cão e não muda nada a 60 quadros.
- **Convergência**: as dobras e os estilhaços não perguntam pela parede (passam através dela). O plano não fala disso.
- **Erupção na leva 2**: o plano a põe na leva 3; entrou porque a tarefa pediu. A F41 decide se a liga agora.
- **`DogBite.bite`**: o nome repete "mordida" para o componente proporcional, para ficar igual às outras três
  técnicas; a doc da interface diz o que é.

## Gate

`npm run gate` verde antes do commit de correção (3154 testes, typecheck, oxlint e prettier verdes).
