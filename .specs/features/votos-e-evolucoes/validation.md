# Votos e evoluções — Validation: FAIL

**Data**: 2026-10-08
**Spec**: `.specs/features/votos-e-evolucoes/spec.md`
**Faixa do diff**: `a6e609a..HEAD` (`7e6160e`) no branch `feat/votos-e-evolucoes`, 18 commits, 44 arquivos
**Verifier**: subagente independente (autor ≠ verificador)

Veredito: **FAIL**. A regra pura está bem coberta e todos os mutantes de `core/` morreram, mas 4 mutantes de
adaptador sobreviveram ao smoke. São 4 ACs ou edge cases sem prova no jogo vivo: dano de técnica dos votos,
crescimento da Fúria, Vazio Roxo no chefe e votos limpos numa run nova. VOW-18 também não é conferido no jogo vivo.

---

## Tarefas

| Task | Status | Notas |
| --- | --- | --- |
| T1–T15 | ✅ Todas marcadas | Os commits batem com as tasks (`4f627ba`..`7e6160e`) |

---

## Critérios de aceite ancorados na spec

### P1: Votos Vinculativos

| AC | Resultado da spec | Evidência (`arquivo:linha` + asserção) | Resultado |
| --- | --- | --- | --- |
| VOW-01 | painel com 3 votos distintos antes da loja, depois do chefe | `scripts/smoke/vows.smoke.mjs:172` - `offers.length === 3 && new Set(offers).size === 3 && s.vows.panelCards === 3`; `:176` `shopCards(s) === 0` | ✅ PASS |
| VOW-02 | rodada comum: a loja abre sem painel | `scripts/smoke/vows.smoke.mjs:197` - `s.vows.panelCards === 0 && s.vows.offers === null && shopCards(s) > 0` (mutante S7 morto) | ✅ PASS |
| VOW-03 | 1/2/3 toma o voto, fecha o painel e abre a loja | `scripts/smoke/vows.smoke.mjs:178` - `taken === [offers[1]] && offers === null && panelCards === 0`; `:182` `shopCards(s) > 0` | ✅ PASS |
| VOW-04 | Enter recusa sem voto e abre a loja | `scripts/smoke/vows.smoke.mjs:189` - `taken === '[]' && panelCards === 0 && shopCards(s) > 0` (mutante S8 morto) | ✅ PASS |
| VOW-05 | nunca oferece um voto já tomado | `tests/core/vows.test.ts:25` - `expect(taken).not.toContain(id)` em 200 seeds (U1 morto) | ✅ PASS |
| VOW-06 | com menos de 3 restantes oferece só esses; com 0 não abre | `tests/core/vows.test.ts:31-33` - 2 → os 2, 1 → o 1, 0 → `[]`; `openPanel` devolve `false` com lista vazia (`src/scenes/test/vowDirector.ts:64`), sem teste no jogo vivo | ✅ PASS (regra) |
| VOW-07 | mesma seed e mesmos tomados dão o mesmo sorteio | `tests/core/vows.test.ts:37` - `drawVows(new Rng(42), ['furia'])` igual; `tests/core/run.test.ts:755` - `vowRng` igual com a mesma seed (U12a morto) | ✅ PASS |
| VOW-08 | run nova limpa todo voto | `tests/core/vows.test.ts:13` - `vows.list` igual a `[]` depois de `reset`; `scripts/smoke/vows.smoke.mjs:35` só abre página nova. O mutante S13 (`VowDirector.reset` sem `vows.reset()`) **sobreviveu**: nenhuma run nova depois de um voto é conferida | ❌ GAP |
| VOW-09 | snapshot com os tomados e, com o painel aberto, as ofertas | `scripts/smoke/vows.smoke.mjs:29-31` - `taken === ["corpoDeVidro"]`, `offers === null`, `effects.maxHpMul === 0.6`; `:172` ofertas com o painel aberto | ✅ PASS |
| VOW-10 | vida máx ×0,6; todo dano (golpe **e técnica**) ×1,35 | `tests/core/vows.test.ts:69` - `{ maxHpMul: 0.6, damageMul: 1.35 }`; `scripts/smoke/vows.smoke.mjs:71` - `maxHp === 60 && hp <= 60`. O dano de golpe ×1,35 e o de técnica ×1,35 não são lidos no jogo vivo; o mutante S9 (`vowDamageMul` não sincronizado) **sobreviveu** | ❌ GAP (técnica) |
| VOW-11 | sem guarda nem parry; golpe forte ×1,6 | `scripts/smoke/vows.smoke.mjs:40` - `strike.light === 1 && strike.heavy === 1.6` (S1 morto); `:78` - `player.guard === 'none'` (S4 morto) | ✅ PASS |
| VOW-12 | corpo a corpo ×0,7; técnicas ×1,5 | `scripts/smoke/vows.smoke.mjs:43` - golpe 0,7 nos dois; técnica ×1,5 só na regra (`tests/core/vows.test.ts:77`). Nada no jogo vivo; o mesmo S9 sobrevive | ❌ GAP (técnica) |
| VOW-13 | técnica custa ×0,6; a Reversa não cura | `scripts/smoke/vows.smoke.mjs:60` - custo 18 (S2 morto); `:92` - `hp === hurt` depois de canalizar | ✅ PASS |
| VOW-14 | Reversa ×2, só abaixo de 30% | `scripts/smoke/vows.smoke.mjs:100` - em 50% não cura (S5 morto); `:106` - em 10/60 cura (`hp > hurt`). O ×2 não é medido (só `> hurt`); a regra está em `tests/core/vows.test.ts:85` | ⚠️ PASS com precisão parcial |
| VOW-15 | fragmentos ×1,6; dano sofrido ×1,25 | `scripts/smoke/vows.smoke.mjs:128` - `collect:fragment:round(v*1.6)` (S6 morto); dano ×1,25 só na regra (`tests/core/vows.test.ts:89`), mas usa o mesmo caminho vivo da Pele de pedra (S3 morto) | ✅ PASS |
| VOW-16 | +3% por abate na rodada, até +45%; sem regeneração | `tests/core/vows.test.ts:94-97` - 0/1/15/16 abates (U2 morto); `scripts/smoke/vows.smoke.mjs:136` - sem regeneração, com controle em `:142`. O crescimento por abate no jogo vivo não é testado: S10 (`kills` sempre 0) **sobreviveu**; `tests/core/run.test.ts:760` só confere `roundKills === 0` | ❌ GAP |
| VOW-17 | dano sofrido ×0,7; todo dano ×0,8 | `scripts/smoke/vows.smoke.mjs:67` - 50 → 35 (S3 morto); `tests/core/vows.test.ts:102` | ✅ PASS |
| VOW-18 | votos no mesmo número multiplicam | `tests/core/vows.test.ts:107-109` - `1.35*0.8`, `1.25*0.7`, `1.35*1.3` (U3 morto). Nenhum smoke combina dois votos que mudam o mesmo número; a composição da cena (`strikeMul`, `vowDamageMul = techDamageMul*damageMul`) é multiplicativa por leitura de código, sem prova viva | ⚠️ PASS só na regra |

### P2: Evolução Vazio Roxo

| AC | Resultado da spec | Evidência | Resultado |
| --- | --- | --- | --- |
| EVO-01 | receita pronta: a carta está nas ofertas | `tests/core/evolutionShop.test.ts:28` - `toContain('roxo')` em 40 seeds; `scripts/smoke/evolution.smoke.mjs:47` | ✅ PASS |
| EVO-02 | uma faltando ou abaixo do nível 3: sem evolução | `tests/core/evolutionShop.test.ts:33-35`; `tests/core/evolution.test.ts:16-31` (U5 morto) | ✅ PASS |
| EVO-03 | Roxo nv 1 no slot da 1ª técnica; o outro slot vazio | `tests/core/evolution.test.ts:41,49` - `[{roxo,1}, null]` e `[null, {roxo,1}]` (U6 morto); `scripts/smoke/evolution.smoke.mjs:54` | ✅ PASS |
| EVO-04 | custa 60; no máximo uma vez por run | `tests/core/evolutionShop.test.ts:43,56,57,59` - custo 60, carteira 140, `sold`; `:87` sem oferta com o Roxo equipado; `scripts/smoke/evolution.smoke.mjs:48,57` | ✅ PASS |
| EVO-05 | esfera a 180 px/s por 1600 ms | `tests/core/purple.test.ts:9-16,22-27` - 100/244/388, viva aos 1599 e morta aos 1600; `scripts/smoke/evolution.smoke.mjs:86`. O `traveled` do snapshot é `speed*ageMs` (`src/game/tech/purple.ts:40`), não a posição: repete a constante (L-076). A posição só é provada na regra | ✅ PASS (regra) / ⚠️ campo vivo ecoa |
| EVO-06 | acerta cada inimigo comum **e o chefe** uma vez, 60 no nv 1 | `tests/core/purple.test.ts:37` - `[1,2,3]` (U7 morto); `scripts/smoke/evolution.smoke.mjs:89,91` - 3 acertos e 60 por boneco. Chefe: nenhuma evidência; S11 (chefe fora dos alvos) **sobreviveu** | ❌ GAP (chefe) |
| EVO-07 | custo 70, recarga 6000 ms | `tests/data/purple.test.ts:6-7` (dados; o pipeline de conjuração é genérico e já testado) | ✅ PASS |
| EVO-08 | só cores da `PALETTE` | `tests/game/art/tech.test.ts:69-70` - kanji `murasaki` com `PALETTE_KEYS`; aura roxa no mesmo teste das auras; `PURPLE_FX_COLORS` é tipada como `Key = keyof PALETTE` (`src/game/art/scenery/brush.ts:4`); o `0xffffff` de `PurpleOrb.ts:81` é o `W` da paleta | ✅ PASS |

### Edge cases

| Edge case | Evidência | Resultado |
| --- | --- | --- |
| Morrer sem ter visto o painel: a run seguinte começa sem votos | Só `Vows.reset` (`tests/core/vows.test.ts:13`); a ligação `src/scenes/test/runDirector.ts:147` não é exercida. S13 sobreviveu | ❌ GAP |
| Sem guarda tomado com a guarda segurada: cai no quadro seguinte | `src/scenes/TestScene.ts:506` zera `guardHeld`/`guardPressed`; o painel só abre na loja, onde o input já é neutro, então na prática o caso não acontece. O smoke (`vows.smoke.mjs:78`) só prova que a guarda não sobe | ⚠️ coberto por construção, sem teste |
| Corpo de vidro abaixo do hp atual: hp limitado ao teto | `scripts/smoke/vows.smoke.mjs:71` - começa com 100/100 e fica `hp <= 60` | ✅ PASS |
| Comprar `vida` com Corpo de vidro: o teto novo também ×0,6 | Nenhum teste. Pelo código, `shopDirector.ts:39` põe o teto cheio e cura 15; o `sync` do quadro seguinte (`vowDirector.ts:36-37`) corta para ×0,6. Num quadro o teto fica sem o voto, e a cura de 15 é parcialmente perdida | ❌ GAP (sem evidência) |
| Evolução equipada: as técnicas da receita não voltam à loja | `tests/core/evolutionShop.test.ts:85-86` (U11 morto) | ✅ PASS |

**Status**: 18 de 26 ACs com evidência plena, 3 PASS só com a regra pura (VOW-06, VOW-14 ×2, VOW-18) e 5 com GAP
(VOW-08, VOW-10 técnica, VOW-12 técnica, VOW-16, EVO-06 chefe). Nos edge cases, 2 têm GAP.

---

## Sensor de discriminação

Worktree temporário (`git worktree add --detach <scratchpad>/wt HEAD`, com `node_modules` por junção), removido no
fim. O `git status --porcelain` da árvore real ficou igual antes e depois (`?? SKILL.md`). Mutantes de cena entraram
atrás de `?mut=<id>` e rodaram numa única execução de smoke, com um envoltório que inverte o resultado. Os controles
sem mutante (`vows` e `evolution`) passaram.

| # | Arquivo | Mutação | Testes | Morto? |
| --- | --- | --- | --- | --- |
| U1 | `src/core/vows.ts:34` | `drawVows` sorteia também os tomados | vows.test | ✅ |
| U2 | `src/core/vows.ts:116` | Fúria sem teto de 45% | vows.test | ✅ |
| U3 | `src/core/vows.ts:121` | Pele de pedra soma (`+= 0.8-1`) em vez de multiplicar | vows.test | ✅ |
| U4 | `src/core/loadout.ts` `cost` | `costMul` ignorado | loadout.test | ✅ |
| U5 | `src/core/evolution.ts:5` | receita pronta com nível 2 | evolution(Shop).test | ✅ |
| U6 | `src/core/evolution.ts:21` | fusão sem limpar o segundo slot | evolution.test | ✅ |
| U7 | `src/core/purple.ts` `update` | esfera sem o conjunto de já tocados | purple.test | ✅ |
| U8 | `src/data/techniques.ts` | dano do Roxo 50 | data/purple.test | ✅ |
| U9 | `src/core/loadout.ts` `damage` | `vowDamageMul` ignorado | loadout.test | ✅ |
| U10 | `src/core/shop.ts` `evolutionEligible` | sem `levelOf(into) === 0` | evolutionShop.test | ❌ sobreviveu: **equivalente** (com o Roxo equipado, a receita já não fica pronta) |
| U11 | `src/core/shop.ts` `techniqueEligible` | Azul/Vermelho voltam com o Roxo | evolutionShop.test | ✅ |
| U12a | `src/core/run.ts:300` | stream dos votos com ruído | run.test | ✅ |
| U12b | `src/core/run.ts:300` | votos dividem o stream da loja | run.test | ❌ sobreviveu (o design pede stream próprio; não fere VOW-07, risco baixo) |
| S1 | `vowDirector.ts:43` | `strikeMul` ignora `heavyMul` | smoke vows | ✅ |
| S2 | `vowDirector.ts:33` | `costMul` não sincronizado | smoke vows | ✅ |
| S3 | `Player.ts:210` | `damageTakenMul` não aplicado | smoke vows | ✅ |
| S4 | `TestScene.ts:506` | guarda não desligada | smoke vows | ✅ |
| S5 | `recovery.ts:64` | Cura proibida sem o limite de 30% | smoke vows | ✅ |
| S6 | `drops.ts:42` | Ganância sem multiplicar | smoke vows | ✅ |
| S7 | `shopDirector.ts:132` | painel também depois de rodada comum | smoke vows | ✅ |
| S8 | `vowDirector.ts:73` | Enter toma o 1º voto | smoke vows | ✅ |
| S9 | `vowDirector.ts:32` | `vowDamageMul` nunca sincronizado (técnica sem voto) | smoke vows | ❌ **sobreviveu** |
| S10 | `vowDirector.ts:48` | Fúria lê sempre 0 abates | smoke vows | ❌ **sobreviveu** |
| S11 | `game/tech/purple.ts:75` | chefe fora dos alvos da esfera | smoke evolution | ❌ **sobreviveu** |
| S13 | `vowDirector.ts:20` | run nova não limpa os votos | smoke vows | ❌ **sobreviveu** |

**Profundidade**: ampliada (27 mutantes, 2 execuções de smoke: os controles e os mutantes na mesma).
**Result**: 21 de 25 mutantes não equivalentes mortos; 4 sobreviventes reais em adaptador (S9, S10, S11, S13) — FAIL.

---

## Qualidade de código

| Princípio | Status |
| --- | --- |
| Código mínimo, sem escopo extra | ✅ |
| Mudanças cirúrgicas, segue os padrões (diretor novo, painel em arquivo próprio, `core` sem Phaser) | ✅ |
| Tetos do lint: nenhum aviso novo nos arquivos da feature | ✅ |
| Asserções ancoradas na spec | ⚠️ `traveled` do Roxo ecoa a constante (L-076); VOW-14 mede só "curou", não ×2 |
| Cobertura por camada (adaptador lido do jogo vivo, L-043) | ❌ 4 ligações sem prova viva |
| Todo teste mapeia um AC/edge/Done-when | ✅ |
| Diretrizes: `CLAUDE.md`, `.oxlintrc.json`, L-010/L-043/L-076 | ⚠️ ver acima |

Observação de comportamento (não é um AC): ao comprar `vida` com Corpo de vidro, a cura de 15 é aplicada contra o
teto cheio e cortada no quadro seguinte. Na prática o jogador ganha menos de 15 de vida (ex.: 60 → 75 → 69).

---

## Gate

- **Comando**: `npm run gate` (árvore real)
- **Resultado**: exit 0; typecheck, oxlint (só avisos antigos, em `art/rig`), prettier ok; **2851 testes passaram**, 0 falharam, 0 pulados
- **Antes da feature**: 2814 (`a6e609a`); **depois**: 2851; **delta**: +37

---

## Lacunas ranqueadas → tarefas de correção

1. **EVO-06 no chefe** (Major): o smoke usa só bonecos. Fix: cenário em `evolution.smoke.mjs` com `?debug&round=5&tech=roxo`
   (ou o chefe do fxlab) que conjura o Roxo no chefe e confere `hp` do chefe −60 uma vez só. Mata S11.
2. **Dano de técnica dos votos no jogo vivo** (VOW-10/12, Major): conjurar o Desmantelar (ou o Roxo no fxlab) com
   `vows=pactoDoFeiticeiro` e conferir 15 (10×1,5) no alvo; com `corpoDeVidro,pactoDoFeiticeiro` conferir a
   multiplicação (VOW-18 vivo). Mata S9.
3. **Fúria por abate no jogo vivo** (VOW-16, Major): com `vows=furia`, abater N inimigos e ler o multiplicador (por
   exemplo `vows.strike.light` ≈ 1+0,03N, ou o dano real de um golpe); também um teste de `Run.roundKills` > 0 depois
   de um abate. Mata S10.
4. **Votos limpos numa run nova** (VOW-08 + edge de morte, Major): tomar um voto pelo painel, morrer (`debugKill`),
   reiniciar e conferir `vows.taken === []` na mesma página. Mata S13.
5. **Comprar `vida` com Corpo de vidro** (edge, Minor): smoke que compra `vida` e confere `maxHp === round(115×0,6)`;
   avaliar aplicar o voto já em `applyModifier` para a cura de 15 não ser cortada.
6. **VOW-14 ×2** (Minor): medir a cura por tique contra a sem voto, não só `hp > hurt`.
7. **Stream próprio dos votos** (Minor, design): teste de que o sorteio dos votos não muda a sequência do `shopRng`. Mata U12b.
8. **`traveled` do Roxo** (Cosmetic, L-076): derivar da posição (`x − startX`) em vez de `speed×age`.

---

## Rastreabilidade

| Requisito | Novo status |
| --- | --- |
| VOW-01..07, VOW-09, VOW-11, VOW-13..15, VOW-17, VOW-18 | ✅ Verified (VOW-14 e VOW-18 só na regra; ver lacunas 6 e 2) |
| VOW-08, VOW-10, VOW-12, VOW-16 | ❌ Needs Fix |
| EVO-01..05, EVO-07, EVO-08 | ✅ Verified |
| EVO-06 | ❌ Needs Fix (chefe) |

## Resumo

**Geral**: ❌ Not Ready. A regra está sólida e os principais ganchos de votos e loja estão provados no jogo vivo,
mas quatro ligações de adaptador passam sem teste que as discrimine.
