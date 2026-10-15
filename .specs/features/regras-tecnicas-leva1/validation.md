# Regras das técnicas da leva 1 — Validation

**Date**: 2026-10-15
**Spec**: `.specs/features/regras-tecnicas-leva1/spec.md` (TRL-01..06, BOO-01..12, RES-01..14, FAL-01..09 e os casos de borda)
**Diff range**: `4c0efae..519ac6b` (spec, Boogie, Ressonância, Fala e a correção da revisão). Os arquivos da leva 1 não
mudaram depois do `519ac6b`; a leva 2 só acrescentou arquivos novos em `src/data/`.
**Verifier**: sub-agente independente (não escreveu o código nem os testes). A validação anterior, do próprio autor,
foi substituída por esta.

## Validation

**Result**: PASS (depois de fechar as lacunas no `a3203f2`)

Os 41 ACs têm teste que confere o número da spec. O sensor de mutação rodou 166 mutantes num worktree de rascunho
(`git worktree add --detach`, removido no fim; o worktree real ficou igual à linha de base): 152 morreram, 12
sobreviveram e 2 não se aplicaram (texto repetido no arquivo). Os 12 sobreviventes eram lacunas reais de teste em 9
ACs; cada um ganhou um teste, e a segunda rodada (os 12, os 2 refeitos com texto único e 1 mutante novo) matou os 15.
Não apareceu bug de comportamento: todo sobrevivente era teste fraco, não código errado.

---

## Spec-Anchored Acceptance Criteria

| AC | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| TRL-01 | Nv = 1 + pontos | `tests/core/axisRule.test.ts:14` - `expect(axisLevel(ZERO)).toBe(1)`, Nv 6 com 5 pontos | PASS |
| TRL-02 | eixo fora de 0..3, não inteiro ou soma > 5 → `RangeError` | `tests/core/axisRule.test.ts:24` - `toThrow(RangeError)` com 4, −1, 1,5 e 3+3 | PASS |
| TRL-03 | ramo abaixo do Nv 2 → `RangeError` | `tests/core/axisRule.test.ts:40` - `toThrow(RangeError)`; Nv 2 com ramo vale (`:44`) | PASS |
| TRL-04 | Despertar só com ramo e Nv ≥ 5 | `tests/core/axisRule.test.ts:48` - Nv 4 `false`, Nv 5 `true`; Nv 6 sem ramo `false` (`:53`) | PASS |
| TRL-05 | `round(maxHp × pct)`; chefe no máximo 1% | `tests/core/axisRule.test.ts:63` - `maxHpBite(60,'enemy')` = 2, `maxHpBite(800,'boss')` = 8 | PASS |
| TRL-06 | Recarga no 3: o 1º abate da conjuração devolve 30%; abaixo de 3, nada | `tests/core/axisRule.test.ts:93`; `tests/core/boogie.test.ts:286`, `:298`; `tests/core/resonance.test.ts:305`; `tests/core/cursedSpeech.test.ts:233` | PASS (lacuna fechada) |
| BOO-01 | 220 / 20 / 2500 / 80 / 60 / 1 carga / tontura 0 / choque 0 | `tests/core/boogie.test.ts:24` - `toMatchObject({ rangePx: 220, cost: 20, ... })` | PASS |
| BOO-02 | 320 / 600 / 3 cargas e recarga × 0,8 / 20 / 8 / 1200 | `tests/core/boogie.test.ts:43` - `it.each` por eixo; Cargas 2 sem desconto (`:55`) | PASS |
| BOO-03 | o mais perto à frente no alcance, empate pelo id | `tests/core/swap.test.ts:8` - bordas 220/221, `dx = 0` fora, empate id 4 | PASS |
| BOO-04 | caixa que não cabe recusa, devolve o custo, não gasta carga | `tests/core/swap.test.ts:42`; `tests/core/boogie.test.ts:76` - `{ ok: false, reason: 'blockedPlayer', refund: 20 }`, `charges` 1 | PASS |
| BOO-05 | sem alvo ou sem carga recusa com o custo de volta | `tests/core/boogie.test.ts:83`, `:89` - `refund: 16` / `refund: 20` | PASS |
| BOO-06 | só o comum fica tonto | `tests/core/swap.test.ts:81` - chefe, orbe e projétil 0 | PASS |
| BOO-07 | chip a até 40 px da saída ou da chegada, cada corpo uma vez | `tests/core/boogie.test.ts:97`, `:113` - `[{ targetId: 1, damage: 8, band: 'chip' }]` com o corpo perto dos dois pontos | PASS (lacuna fechada) |
| BOO-08 | uma carga por recarga até o teto | `tests/core/boogie.test.ts:128` - 1999 ms não, 2000 sim; passo grande para no teto | PASS |
| BOO-09 | a Dupla Palma arma uma 2ª troca de 1000 ms sem gastar carga | `tests/core/boogie.test.ts:153` - `expect(b.charges).toBe(0)` depois da 2ª; janela 999/1000 | PASS (lacuna fechada) |
| BOO-10 | segurar ≥ 250 ms finge; comuns a até 120 px erram, Contra de 400 ms | `tests/core/boogie.test.ts:183` - 249/250 ms, −120 entra, 121 fica fora | PASS |
| BOO-11 | Finta Total cancela o chefe em preparo, 1%, a cada 10 s | `tests/core/boogie.test.ts:221` - 9999 ms ainda não, 10000 sim; 121 px fora | PASS |
| BOO-12 | eco 1000 ms depois da 2ª troca, 4% / 1% / 0 | `tests/core/boogie.test.ts:251` - `[{ type: 'echo', targetId: 2, kind: 'enemy', maxHpPct: 0.04 }]` | PASS |
| RES-01 | 3 pregos / 20 / 6000 / 0 / 25 / 3000 | `tests/core/resonance.test.ts:6` | PASS |
| RES-02 | 6 / 44 / 12000 / 100 / 15 / 1500 | `tests/core/resonance.test.ts:22` | PASS |
| RES-03 | o prego crava no 1º do caminho, 3 micro, 1 marca pela duração | `tests/core/resonance.test.ts:35` - eventos com `damage: 3`, `marksOn(1)` = 3, marca 7999/8000 | PASS |
| RES-04 | dano por marca, limpa as marcas, começa a recarga | `tests/core/resonance.test.ts:92` - 44 e 88, `totalMarks` 0, recarga 2999/3000 | PASS |
| RES-05 | sem prego no ar nem marca viva, a janela fecha | `tests/core/resonance.test.ts:127` - `phase` `cooldown`, `cooldownLeftMs` 3000 | PASS |
| RES-06 | o abate passa 1 marca ao vivo mais perto no raio; cada alvo uma vez | `tests/core/resonance.test.ts:157`, `:171`, `:183` - a marca do 2º abate vai para 3, não volta para 1; o vizinho na fila recebe +1 | PASS (lacuna fechada) |
| RES-07 | no abate por outra fonte, as marcas pulam para o vivo mais perto no raio | `tests/core/resonance.test.ts:207`, `:226` - 101 px fica fora; propagação 0 com vivo no mesmo ponto não pula | PASS (lacuna fechada) |
| RES-08 | o Grampo explode com 6 micro em 32 px | `tests/core/resonanceBranches.test.ts:5` | PASS |
| RES-09 | o chefe detonado toma eco de 50% 250 ms depois | `tests/core/resonanceBranches.test.ts:28`, `:39` - eco 40 no chefe; o comum detonado não ecoa | PASS (lacuna fechada) |
| RES-10 | 5+ marcas soltam a 2ª detonação em 80 px: 1 marca + 4% (chefe 1%) | `tests/core/resonanceBranches.test.ts:64` - 4 e 5 marcas, raio 80/81, `28 + 20` no chefe | PASS |
| RES-11 | por 3000 ms o chefe ecoa 50% com postura; o 1º eco tira 1% | `tests/core/resonanceBranches.test.ts:112` - `{ damage: 15, bite: 10, poise: true }`, 2999/3000 ms | PASS |
| RES-12 | desvio só pelo `Rng` recebido; leque regular sem ele | `tests/core/resonance.test.ts:239`, `:253` - com Rng o leque sai do regular e o `throwNails` usa o Rng | PASS (lacuna fechada) |
| RES-13 | parede antes do alvo: `nailBlocked`, sem marca | `tests/core/resonance.test.ts:262` | PASS |
| RES-14 | 2º toque com pregos no ar e nada cravado não faz nada | `tests/core/resonance.test.ts:292` - `detonate` `null`, 3 pregos seguem, fase `armed` | PASS |
| FAL-01 | 140 / 600 (chefe 150) / 8 / 30° / 25 / 4000 | `tests/core/cursedSpeech.test.ts:24` | PASS |
| FAL-02 | 260 / 1200 (300) / 2 / 60° / 15 / 2200 | `tests/core/cursedSpeech.test.ts:41` | PASS |
| FAL-03 | à frente, no alcance, ângulo ≤ metade do cone | `tests/core/cursedSpeech.test.ts:54`, `:66` - `(130, 60)` dentro do ângulo mas a 143 px fica fora; o ponto do player fica fora | PASS (lacuna fechada) |
| FAL-04 | vida não acima do custo recusa | `tests/core/cursedSpeech.test.ts:104` - vida 8 com custo 8 `{ ok: false, reason: 'hp', refund: 25 }` | PASS |
| FAL-05 | "Exploda": cada atordoado toma 20 | `tests/core/cursedSpeech.test.ts:112` | PASS |
| FAL-06 | "Volte": força 9, o comum cai, o chefe recua com 2,7 | `tests/core/cursedSpeech.test.ts:122` | PASS |
| FAL-07 | a explosão atordoa vizinhos a até 70 px por 300 (chefe 75) com 4% / 1%, e a cadeia segue | `tests/core/cursedSpeech.test.ts:132` | PASS |
| FAL-08 | Esmague: 4% / 1% uma vez, os dois caem, o chefe não | `tests/core/cursedSpeech.test.ts:172`, `:185` - o chefe atingido pelo empurrado fica com `knockdown: false` | PASS (lacuna fechada) |
| FAL-09 | sem linha de visão, a fala não acerta | `tests/core/cursedSpeech.test.ts:219` | PASS |

**Status**: todos os ACs cobertos depois do `a3203f2`. Notas de precisão da spec abaixo (nenhuma bloqueia).

### Notas de precisão (para a F34)

- **TRL-06 na Ressonância:** só o abate da detonação principal corta a recarga. O abate pelo prego, pelo Grampo, pela
  Coroa ou pelo eco não corta. Bate com a premissa da spec ("a recarga já começa cortada se a detonação mata"), mas o
  plano 2.1 diz "o abate com a técnica". Decidir na F34 se a Coroa conta.
- **Janela do Esmague (800 ms):** está nos dados e tem teste de borda, mas não está no texto do FAL-08.
- **Boneco com Boneco de Palha:** o eco de 250 ms do Boneco, se o adaptador repassá-lo ao `strawDollEcho`, ecoa de
  novo (50% de 50%). A regra só proíbe repassar o próprio eco da palha. Fica para o adaptador decidir.

---

## Discrimination Sensor

Rodado em `git worktree add --detach` no rascunho, com `node_modules` por junção; cada mutante foi aplicado, o teste
do arquivo rodou, e o arquivo voltou ao original (conferido byte a byte). O worktree foi removido no fim e o
`git status --porcelain` do worktree real ficou igual à linha de base.

**Rodada 1 (testes de antes):** 166 mutantes, 1 a 9 por AC, de número de dados a condição trocada, efeito removido e
borda deslocada. 152 morreram. 2 não se aplicaram (`TRL-02c/d`, texto repetido em `axisLevel` e `axisAt`). Os 12
sobreviventes:

| Mutante | File:line | Descrição | Rodada 1 | Rodada 2 |
| --- | --- | --- | --- | --- |
| BOO-09d | `src/core/boogie.ts:221` | a 2ª palma também gasta carga | Survived | Killed |
| TRL-06-boo | `src/core/boogie.ts:251` | o corte não desarma: o 2º abate corta de novo | Survived | Killed |
| RES-06a | `src/core/resonance.ts:384` | a propagação só pula o próprio morto, não quem já detonou | Survived | Killed |
| RES-06b | `src/core/resonance.ts:387` | o vizinho já na fila não recebe a marca | Survived | Killed |
| RES-07b | `src/core/resonance.ts:337` | sem o teste de propagação 0 | Survived | Killed |
| RES-07c | `src/core/resonance.ts:338` | raio de propagação infinito no abate por outra fonte | Survived | Killed |
| RES-09d | `src/core/resonance.ts:417` | o comum detonado também ganha eco | Survived | Killed |
| RES-12a | `src/core/resonance.ts:183` | o `Rng` é ignorado no leque | Survived | Killed |
| RES-12b | `src/core/resonance.ts:282` | o `throwNails` não passa o `Rng` | Survived | Killed |
| FAL-03b | `src/core/cursedSpeech.ts:98` | `ahead <= 0` vira `< 0` (dx = 0 entra) | Survived | Killed |
| FAL-03c | `src/core/cursedSpeech.ts:100` | alcance pelo dx em vez da distância | Survived | Killed |
| FAL-08a | `src/core/cursedSpeech.ts:250` | o chefe atingido pelo empurrado cai | Survived | Killed |

**Rodada 2 (testes do `a3203f2`):** os 12 acima, `TRL-02c/d` refeitos com texto único e `BOO-07e` (o choque conta o
corpo uma vez por ponto): 15 de 15 mortos.

Amostra dos mortos na rodada 1: tabelas de cada eixo no 0 e no 3 (36 mutantes, um por número), teto do chefe no
componente, empate pelo id, `dx = 0` na troca, recusa que gasta carga, tontura no chefe, raio do choque 39,
janela da Dupla Palma 1100, Finta Total sem Despertar ou sem preparo, Eco sem Despertar, marca que não vence, `>`
no abate, detonação que não começa a recarga, janela que fecha com marca viva, Coroa com 4 ou 6 marcas e raio 79,
eco do Boneco no chefe morto, RES-14 nas duas pontas, parede ignorada, meio cone, recusa da fala com vida igual ao
custo, "Exploda" sem o ramo, chefe derrubado no "Volte", cadeia que não atordoa o vizinho, componente repetido.

**Sensor depth**: P0 manual (≥ 5 por regra, todas as ramificações).
**Result**: 167/167 mortos no fim (152 + 15) — PASS

---

## Conferência com o plano (seções 2.1, 2.5 e 5.1)

| Ponto do plano | Onde | Resultado |
| --- | --- | --- |
| 2.1: Nv = 1 + pontos, teto 3 por eixo, 5 pontos, ramo no Nv 2, Despertar no Nv 5 | `src/data/techRule.ts:6`; TRL-01..04 | OK |
| 2.1: componente proporcional com chefe no máximo 1%, uma vez por conjuração | `src/core/axisRule.ts:75`; uma vez por alvo na Fala (`bitten`), na Coroa e no 1º eco da palha | OK (4% escolhido dentro dos 3 a 5%) |
| 2.1: Recarga no 3º ponto devolve 30% no abate | TRL-06 | OK, com a nota da Ressonância acima |
| 2.1: alcance travado em 320 px | Boogie 320, prego 320 (`src/data/resonance.ts:38`, borda 320/321 testada), Fala 260 | OK |
| 2.1: piso de 60% fora da regra | tabelas cruas; fora de escopo na spec | OK |
| 2.5: tabela do Boogie, ramos, Despertares e a regra de segurança em `core/swap.ts` | `src/data/boogie.ts:15`; `src/core/swap.ts:59` | OK |
| 5.1: Ressonância (3 → 6, 20 → 44, 6 → 12 s, 0 → 100 px; Grampo / Boneco; Coroa / Boneco de Palha) | `src/data/resonance.ts:16` | OK |
| 5.1: Fala (140 → 260, 600 → 1200, chefe 150, vida 8 → 2, cone 30 → 60; Exploda / Volte; Cadeia / Esmague) | `src/data/cursedSpeech.ts:15` | OK |
| "Nada é automático" (sem arma que atira sozinha, familiar ou aura) | as três regras só agem num toque do jogador (`swap`, `feint`, `throwNails`, `detonate`, `speak`); o que vem depois (eco da palma em 1 s, eco do Boneco em 250 ms, janela da palha de 3 s, cadeia da Fala) é efeito com prazo de uma conjuração, previsto no plano. A marca vencida some sem detonar; nada dispara sozinho | OK |
| `TechId`, `TECHNIQUES` e catálogo intactos | `git diff --stat 4c0efae..519ac6b`: só arquivos novos da leva | OK |

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ |
| Surgical changes | ✅ (só arquivos novos) |
| No scope creep | ✅ |
| Matches patterns | ✅ (`core` sem Phaser, números em `data`, teste par em `tests/core`) |
| Spec-anchored outcome check | ✅ |
| Per-layer Coverage Expectation met (domain 1:1 ACs) | ✅ |
| Every test maps to a spec requirement | ✅ (ajudantes `axisAt`/`boxCenter` mapeiam ao caso de borda do eixo faltando) |
| Documented guidelines followed: `CLAUDE.md` (tetos do lint, sem exceção nova) | ✅ — `resonance.test.ts` passou de 400 linhas com os testes novos; os ramos foram para `tests/core/resonanceBranches.test.ts` com `tests/core/resonanceFixtures.ts`, sem entrar na lista de exceções |

## Edge Cases

- [x] Eixo com 4 pontos e soma 6: `tests/core/axisRule.test.ts:24`
- [x] Boogie sem candidato, `dx = 0`, além do alcance: `tests/core/swap.test.ts:14`, `:19`, `:23`
- [x] Dupla Palma: a 2ª recusada não desarma; a janela vence sozinha: `tests/core/boogie.test.ts:164`
- [x] Ressonância: marca vencida não detona; sem marca não detona: `tests/core/resonance.test.ts:127`, `:292`
- [x] Fala com vida igual ao custo: `tests/core/cursedSpeech.test.ts:104`
- [x] Chefe morto pela detonação sem eco nem janela: `tests/core/resonanceBranches.test.ts:28`
- [x] Eixo faltando lança `RangeError`: `tests/core/axisRule.test.ts:82`

## Gate Check

- **Gate command**: `npm run gate`
- **Typecheck, oxlint, prettier**: verdes.
- **Testes**: 3165 de 3170 na suíte inteira; os 5 que falharam (`lightning`, `sceneryBuild`, `sceneryThemes`,
  `hdFlag`, `weaponCombo`) estouraram o tempo de 5 s com a máquina carregada, fora da leva 1. Rodados sozinhos com
  `--testTimeout=120000`: 45 de 45 verdes.
- **Testes da leva 1**: 125 → 134 (+9), em 6 arquivos; nenhum teste removido nem enfraquecido (só movidos de arquivo).

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| TRL-01..05, BOO-01..06, BOO-08, BOO-10..12, RES-01..05, RES-08, RES-10, RES-11, RES-13, RES-14, FAL-01, FAL-02, FAL-04..07, FAL-09 | Verified (autor) | ✅ Verified (independente) |
| TRL-06, BOO-07, BOO-09, RES-06, RES-07, RES-09, RES-12, FAL-03, FAL-08 | Verified (autor) | ✅ Verified (independente, depois do `a3203f2`) |

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 41/41 ACs batem com a spec; 3 notas de precisão para a F34.
**Sensor**: 167/167 mortos no fim (12 sobreviventes da 1ª rodada fechados com teste).
**Gate**: typecheck, lint e formato verdes; testes verdes, com 5 estouros de tempo fora da leva que passam sozinhos.

**What works**: as três regras e a regra comum batem com a spec e com o plano; nenhum bug de comportamento.

**Issues found**: 12 mutantes sobreviventes em 9 ACs (teste fraco, não código errado), fechados no `a3203f2`.

**Next steps**: a F34 liga as técnicas; decidir lá as 3 notas de precisão.
