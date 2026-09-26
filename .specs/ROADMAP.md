# ROADMAP — Expansão roguelite e corpo a corpo

Mapa das features da expansão. Cada item é uma pasta tlc em `.specs/features/<nome>/` com o fluxo completo (Specify + refinamento Jev → Design → Tasks → Execute → Verifier). Uma branch por feature (`feat/<nome>`). Decisões de base: AD-001..AD-007 em `STATE.md`.

```
Parte A — Roguelite
 F0 fundacao-harness-jev ─► F1 run-e-rodadas ─┬─► F2 boss-a-cada-5
                                              └─► F3 economia-drops-cura ─► F4 loja-da-run ─► F5 energia-e-tecnicas ─┬─► F6 meta-progressao
                                                                                                                     └─► F9 tecnicas-avancadas
Parte B — Corpo a corpo estilo jogo de luta
 F7 moveset-e-voadora ─► F8 combos-estilo-luta   (F7 depende de F1; o Kokusen no combo de F8 reusa a regra de F5)
```

| # | Feature | Tamanho | IDs | Status |
|---|---|---|---|---|
| F0 | `fundacao-harness-jev` | Medium | FND | Done (Verifier PASS, rodada 3) |
| F1 | `run-e-rodadas` | Large | RUN, WAVE, DIF, RHUD | Done (Verifier PASS, rodada 3) |
| F2 | `boss-a-cada-5` | Large | BOSS, BAT, BAI, BHUD, BWIN, BTIER | Done (Verifier PASS, rodada 3) |
| F3 | `economia-drops-cura` | Large | ECO, HEAL, ARM, ITEM, RAR | Done (Verifier PASS, rodada 2) |
| F4 | `loja-da-run` | Large | SHOP, MOD | Execute: T1–T9 de 14 feitas (spec com Jev 3 rodadas + alinhamento Jev) |
| F5 | `energia-e-tecnicas` | Complex | CE, TEC, CAST, DIV, KOK, RED, BLU, CUT, FXL, TFX | Specify feito (148 ACs, Jev em 3 rodadas); Design, Tasks e Execute depois de F4 |
| F6 | `meta-progressao` | Large | META, SAVE | Planejada |
| F7 | `moveset-e-voadora` | Complex | MOV, AIR | Planejada |
| F8 | `combos-estilo-luta` | Complex | CMB, STY | Planejada |
| F9 | `tecnicas-avancadas` | Complex | PUR, DOM, CHT | Planejada |

## Esboço das stories (viram spec.md completa no Specify de cada feature)

### F0 fundacao-harness-jev
- Smoke headless versionado (`scripts/smoke/`, `puppeteer-core` + Edge) com `window.__game` só em `?debug`.
- `Health.heal` com teto; evento `died` do inimigo chega à cena.
- RNG com seed (`src/core/rng.ts`).
- `tools/jev-refine.mjs`: refinamento consultivo de ACs (AD-007).

### F1 run-e-rodadas
- P1 Run com permadeath e resumo; máquina de estados pura (`src/core/run.ts`).
- P1 Ondas por rodada (`src/core/waves.ts`), rodada termina quando todos morrem.
- P1 Dificuldade progressiva com teto (`src/core/difficulty.ts`).
- P2 HUD de rodada; P2 telas de título e game over.

### F2 boss-a-cada-5
- P1 Rodada múltipla de 5 é de boss; P1 boss com 3 padrões e fases em 66%/33%; P1 barra de vida do boss.
- P2 Escala por tier e 2 arquétipos; P2 recompensa garantida.

### F3 economia-drops-cura
- P1 Fragmentos dropados e coletados; P1 cura ao abater por chance (base 10%, 8 HP).
- P1 Inimigos armados com ferramentas amaldiçoadas que dropam; P1 pegar e usar o item (sistema de props).
- P3 Raridade de itens.

### F4 loja-da-run
- P1 Modificadores de atributo com teto (`src/core/modifiers.ts`); P1 loja entre rodadas com 3 ofertas.
- P1 Nível máximo e rodada mínima por upgrade; P2 reroll; P2 navegação por teclado.

### F5 energia-e-tecnicas (spec completa em `.specs/features/energia-e-tecnicas/spec.md`)
- P1 Energia amaldiçoada (máx. 100, regen 8/s, +3 por golpe) e 2 slots (`L`/`C`, `I`/`V`); técnicas nível 1–3 vindas da loja.
- P1 Conjuração comum a toda técnica: selo de mão → carga → soltura → recuperação, com aura, câmera que aproxima, chamada com kanji em pixel art e "pairar" no ar.
- P1 Punho Divergente: 1º impacto e o 2º 200 ms depois (energia atrasada), com anel de aproximação marcando o ritmo.
- P1 Kokusen (Black Flash, veio da F8): apertar no fim do anel vira 45 de dano, com tela invertida, duotom preto/vermelho, raios negros com borda vermelha, zoom-punch, cartão 黒閃 e zona de 8 s.
- P1 Reversão de Técnica: Vermelho: esfera que nasce na ponta dos dedos expelindo faíscas, dispara, arremessa inimigos e explode em área.
- P2 Técnica Amplificada: Azul (suga e esmaga, espiral entrando); P2 Desmantelar (3 cortes invisíveis); P2 laboratório de efeitos (`?debug&fxlab`, câmera lenta) para o UAT visual.
- P1 Invariantes de VFX: só cores da paleta (+ `b`, `R`, `W`, `d`), geometria na grade de 2 px, nada sobra na cena, fallback sem WebGL (AD-009).

### F6 meta-progressao
- P1 Selos persistentes; P1 altar de upgrades permanentes; P1 save versionado com fallback; P2 estatísticas.

### F7 moveset-e-voadora
- P1 Grafo de golpes dirigido por dados (substitui o combo linear sem regressão); P1 voadora; P1 aéreos.
- P2 Golpes direcionais (lançador, empurrão); P2 animações novas.

### F8 combos-estilo-luta
- P1 Cancel por hit-confirm e dash-cancel; P1 juggle com limite; P1 contador e nota de estilo.
- P2 Kokusen também no finalizador do combo (reusa a janela e os efeitos de KOK da F5); P3 buffer de input de movimento.

### F9 tecnicas-avancadas
- P1 Vazio Roxo (茈): com Azul e Vermelho equipados, os dois slots juntos unem as esferas numa esfera roxa que apaga tudo numa linha; custa a barra inteira.
- P1 Expansão de Domínio — Vazio Infinito (無量空処): selo de mão, esfera negra que cobre a tela, fundo cósmico e inimigos na tela paralisados por alguns segundos; depois, técnicas travadas (queima do domínio).
- P2 Encantamento: segurar a tecla do slot para recitar e aumentar o poder da técnica, com risco de ser interrompido.

## Backlog técnico

- `tests/core/enemyAI.test.ts` só usa o tuning 35/70: um mutante que fixa 70 na perseguição (`src/core/enemyAI.ts:120`) sobrevive. Adicionar um caso com tuning diferente (achado fora de escopo pelo Verifier da F1, rodada 3).
- `held-item.smoke.mjs` falha de vez em quando no suite completo e passa isolado (F4, 26/09: "pips de 4 para 2: 1"). Provável dependência de tempo real entre `keyboard.press` e `step`; trocar por tecla segurada durante um passo, como em `shop.smoke.mjs`. (`armed` corrigido na F4: a tecla 3 caía na invulnerabilidade.)
