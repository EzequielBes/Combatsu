# ROADMAP — Expansão roguelite e corpo a corpo

Mapa das features da expansão. Cada item é uma pasta tlc em `.specs/features/<nome>/` com o fluxo completo (Specify + refinamento Jev → Design → Tasks → Execute → Verifier). Uma branch por feature (`feat/<nome>`). Decisões de base: AD-001..AD-007 em `STATE.md`.

```
Parte A — Roguelite
 F0 fundacao-harness-jev ─► F1 run-e-rodadas ─┬─► F2 boss-a-cada-5
                                              └─► F3 economia-drops-cura ─► F4 loja-da-run ─► F5 energia-e-tecnicas ─► F6 meta-progressao
Parte B — Corpo a corpo estilo jogo de luta
 F7 moveset-e-voadora ─► F8 combos-estilo-luta   (F7 depende de F1; o Black Flash de F8 usa a energia de F5)
```

| # | Feature | Tamanho | IDs | Status |
|---|---|---|---|---|
| F0 | `fundacao-harness-jev` | Medium | FND | Done (Verifier PASS, rodada 3) |
| F1 | `run-e-rodadas` | Large | RUN, WAVE, DIF, RHUD | Spec aprovada |
| F2 | `boss-a-cada-5` | Large | BOSS | Planejada |
| F3 | `economia-drops-cura` | Large | ECO, HEAL, ARM | Planejada |
| F4 | `loja-da-run` | Large | SHOP, MOD | Planejada |
| F5 | `energia-e-tecnicas` | Complex | CE, TEC | Planejada |
| F6 | `meta-progressao` | Large | META, SAVE | Planejada |
| F7 | `moveset-e-voadora` | Complex | MOV, AIR | Planejada |
| F8 | `combos-estilo-luta` | Complex | CMB, STY | Planejada |

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

### F5 energia-e-tecnicas
- P1 Energia amaldiçoada com regen e upgrades de máximo/regen; P1 2 slots, desbloqueio pela loja.
- P1 Punho Divergente; P1 Corte; P2 Azul; P3 Vermelho; P3 Expansão de Domínio.

### F6 meta-progressao
- P1 Selos persistentes; P1 altar de upgrades permanentes; P1 save versionado com fallback; P2 estatísticas.

### F7 moveset-e-voadora
- P1 Grafo de golpes dirigido por dados (substitui o combo linear sem regressão); P1 voadora; P1 aéreos.
- P2 Golpes direcionais (lançador, empurrão); P2 animações novas.

### F8 combos-estilo-luta
- P1 Cancel por hit-confirm e dash-cancel; P1 juggle com limite; P1 contador e nota de estilo.
- P2 Black Flash; P3 buffer de input de movimento.
