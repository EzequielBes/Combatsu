# Regras das técnicas da leva 1 — Validation

**Date**: 2026-10-14
**Spec**: `.specs/features/regras-tecnicas-leva1/spec.md` (TRL-01..05, BOO-01..12, RES-01..12, FAL-01..08 e os casos de borda)
**Diff range**: `4c0efae..97439e4`, branch `feat/regras-tecnicas-leva1`, 4 commits (spec, Boogie, Ressonância, Fala).
**Verifier**: o próprio autor. Esta sessão não tinha ferramenta de sub-agente, então não houve verificador independente.
Para compensar, rodou um sensor de mutação: 8 mutantes à mão, um por regra, e o arquivo foi restaurado depois de cada um.
**Pendência**: rodar um verificador independente antes do merge da F34.

## Validation

**Result**: PASS

Os 37 ACs têm teste que confere o número da spec. O gate passou nos 3 commits de código (151 arquivos, 3023 testes,
com typecheck, oxlint e prettier verdes), e os 8 mutantes morreram.

---

## Spec-Anchored Acceptance Criteria

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| TRL-01 | nível = 1 + pontos | `src/core/axisRule.ts:31`; `tests/core/axisRule.test.ts:6` (Nv 1 e Nv 6) | PASS |
| TRL-02 | eixo fora de 0..3 / soma > 5 → `RangeError` | `tests/core/axisRule.test.ts:16` | PASS |
| TRL-03, TRL-04 | ramo abaixo do Nv 2 lança erro; o Despertar vem com ramo e Nv ≥ 5 | `src/core/axisRule.ts:44`; `tests/core/axisRule.test.ts:31` | PASS |
| TRL-05 | 4% no comum, teto de 1% no chefe | `src/core/axisRule.ts:61`; `tests/core/axisRule.test.ts:54` | PASS |
| BOO-01, BOO-02 | base e cada eixo no 3 | `src/core/boogie.ts:33`; `tests/core/boogie.test.ts:24`, `:43` | PASS |
| BOO-03 | o mais perto à frente, no alcance, empate pelo id | `src/core/swap.ts:28`; `tests/core/swap.test.ts:8` | PASS |
| BOO-04, BOO-05 | recusa por encaixe, falta de alvo ou de carga devolve o custo sem gastar carga | `src/core/swap.ts:59`; `tests/core/swap.test.ts:42`; `tests/core/boogie.test.ts:76` | PASS |
| BOO-06 | só o comum fica tonto | `src/core/swap.ts:82`; `tests/core/swap.test.ts:81`; `tests/core/boogie.test.ts:61` | PASS |
| BOO-07 | chip a até 40 px da saída e da chegada | `src/core/boogie.ts:64`; `tests/core/boogie.test.ts:97` | PASS |
| BOO-08 | uma carga volta por recarga | `src/core/boogie.ts:184`; `tests/core/boogie.test.ts:113` | PASS |
| BOO-09 | a Dupla Palma arma uma 2ª troca de 1000 ms sem gastar carga | `src/core/boogie.ts:200`; `tests/core/boogie.test.ts:138` | PASS |
| BOO-10 | a Palma Falsa (segurar 250 ms) faz os comuns a até 120 px errarem, com Contra de 400 ms | `src/core/boogie.ts:232`; `tests/core/boogie.test.ts:165` | PASS |
| BOO-11 | a Finta Total cancela o chefe com 1%, a cada 10 s | `tests/core/boogie.test.ts:203` | PASS |
| BOO-12 | o Eco da Palma manda o evento `echo` 1000 ms depois da 2ª troca (4% / 1% / 0) | `tests/core/boogie.test.ts:226` | PASS |
| RES-01, RES-02 | base e cada eixo no 3 | `src/core/resonance.ts:34`; `tests/core/resonance.test.ts:42`, `:58` | PASS |
| RES-03 | o prego crava no 1º do caminho, dá 3 micro e marca pela duração | `src/core/resonance.ts:194`; `tests/core/resonance.test.ts:71` | PASS |
| RES-04 | a detonação dá dano por marca, limpa as marcas e começa a recarga | `src/core/resonance.ts:221`; `tests/core/resonance.test.ts:126` | PASS |
| RES-05 | sem prego no ar nem marca viva, a janela fecha | `src/core/resonance.ts:207`; `tests/core/resonance.test.ts:161` | PASS |
| RES-06 | propagação em cascata na detonação | `tests/core/resonance.test.ts:181` | PASS |
| RES-07 | no abate por outra fonte, as marcas pulam | `src/core/resonance.ts:236`; `tests/core/resonance.test.ts:208` | PASS |
| RES-08 | o Grampo explode com 6 micro em 32 px | `tests/core/resonance.test.ts:233` | PASS |
| RES-09 | o Boneco dá um eco de 50% no chefe depois de 250 ms | `tests/core/resonance.test.ts:256` | PASS |
| RES-10 | a Coroa de Pregos dispara com 5+ marcas (1 marca + 4% / 1%) | `tests/core/resonance.test.ts:276` | PASS |
| RES-11 | o Boneco de Palha ecoa 50% por 3 s, e o 1º eco tira 1% | `src/core/resonance.ts:253`; `tests/core/resonance.test.ts:310` | PASS |
| RES-12 | desvio só pelo `Rng` recebido; leque regular sem ele | `src/core/resonance.ts:101`; `tests/core/resonance.test.ts:342` | PASS |
| FAL-01, FAL-02 | base e cada eixo no 3 | `src/core/cursedSpeech.ts:25`; `tests/core/cursedSpeech.test.ts:24`, `:41` | PASS |
| FAL-03 | cone pela metade da abertura, bordas inclusas | `src/core/cursedSpeech.ts:50`; `tests/core/cursedSpeech.test.ts:54` | PASS |
| FAL-04 | recusa se a vida não passa do custo | `src/core/cursedSpeech.ts:119`; `tests/core/cursedSpeech.test.ts:98` | PASS |
| FAL-05 | "Exploda" dá 20 | `tests/core/cursedSpeech.test.ts:106` | PASS |
| FAL-06 | "Volte": força 9, o comum cai, o chefe recua com força 2,7 | `tests/core/cursedSpeech.test.ts:116` | PASS |
| FAL-07 | a explosão em cadeia atordoa 300 (chefe 75) com 4% / 1%, uma vez por alvo | `src/core/cursedSpeech.ts:166`; `tests/core/cursedSpeech.test.ts:126` | PASS |
| FAL-08 | Esmague: 4% / 1% uma vez, os dois caem e o chefe não | `src/core/cursedSpeech.ts:189`; `tests/core/cursedSpeech.test.ts:166` | PASS |

## Discrimination sensor

| Mutante | Teste que matou |
| --- | --- |
| `maxHpBite` sem o teto do chefe | TRL-05 e BOO/RES com chefe (2 falhas) |
| `pickSwapTarget` aceita `dx = 0` | BOO-03 "na mesma linha vertical" |
| a Dupla Palma não desarma depois da 2ª troca | BOO-09 |
| `swapStunMs` deixa o orbe e o projétil tontos | BOO-06 |
| a detonação mata com `>` em vez de `>=` | RES-04 `killed` |
| as marcas nunca vencem | RES-03 e RES-05 (2 falhas) |
| o cone usa a abertura inteira como meio ângulo | FAL-03 |
| o componente proporcional sai mais de uma vez por alvo | FAL-07 |

## Escopo conferido

- `TechId`, `TECHNIQUES` e `GAME_SHOP_CATALOG` não mudaram: nenhum arquivo fora dos novos foi tocado (`git diff --stat 4c0efae..HEAD`).
- Não há `Math.random`: `tests/core/noMathRandom.test.ts` passa.
- Arquivos novos fora da lista de exceções do `.oxlintrc.json`, e o oxlint não aponta nada neles.
