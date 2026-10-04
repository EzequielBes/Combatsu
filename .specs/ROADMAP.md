# ROADMAP — Combatsu: roguelite e corpo a corpo

Mapa das features do jogo. Cada item é uma pasta tlc em `.specs/features/<nome>/` com o fluxo completo (Specify + refinamento Jev → Design → Tasks → Execute → Verifier). Uma branch por feature (`feat/<nome>`), que entra em `dev` com `--no-ff` depois do Verifier PASS e do UAT do usuário; `main` só recebe `dev` quando ele pedir (AD-008). Decisões de base: AD-001 a AD-019 em `STATE.md`.

## Estado em 03/10/2026

- **Em `dev`**: F0 a F5, F7, F10, F11 e as quatro features de arte e sensação de jogo (`sprite-player-polish`, `enemy-sprite-variety`, `sprite-chefes-e-acabamento`, `movimento-suave-e-objetos-no-chefe`). 1780 testes unitários e 30 smokes.
- **Fora do remoto**: `dev` local está à frente de `origin/dev`; nada foi enviado nesta leva.
- **Feature em andamento**: F12 `combate-mestre`, no branch `feat/combate-mestre` (155 ACs, 34 de 41 tasks; pausada em 03/10, ver o Handoff em `STATE.md`).
- **Decisões do usuário em aberto**: silhueta própria para a Tecelã (hoje é o Oni com outro mapa de cores, BTIER-06); alcance do arremesso (a garrafa cai depois de ~260 px, a cadeira depois de ~140 px); taxa de atualização do monitor dele, para conferir o movimento acima de 60 Hz fora da simulação.

```
Parte A — Roguelite
 F0 fundacao-harness-jev ─► F1 run-e-rodadas ─┬─► F2 boss-a-cada-5
                                              └─► F3 economia-drops-cura ─► F4 loja-da-run ─► F5 energia-e-tecnicas ─┬─► F6 meta-progressao
                                                                                                                     └─► F9 tecnicas-avancadas
Parte B — Corpo a corpo estilo jogo de luta
 F7 combate-estilo-luta   (depende de F1; absorveu a F8; o Kokusen no finalizador reusa a regra de F5)

Parte C — Combate de Mestre
 F10 personagem-e-vermelho (independente)
 F11 ritmo-economia-e-chefe ─► F12 combate-mestre ─► F13 foco-e-ambiente ─► F14 ia-tatica ─► F15 inimigos-a-distancia ─► F16 pressao-e-curva

Arte e sensação de jogo (sem número; entram quando o usuário pede)
 sprite-player-polish ─► enemy-sprite-variety ─► sprite-chefes-e-acabamento ─► movimento-suave-e-objetos-no-chefe
```

| # | Feature | Tamanho | IDs | Status |
|---|---|---|---|---|
| F0 | `fundacao-harness-jev` | Medium | FND | Done (Verifier PASS, rodada 3) |
| F1 | `run-e-rodadas` | Large | RUN, WAVE, DIF, RHUD | Done (Verifier PASS, rodada 3) |
| F2 | `boss-a-cada-5` | Large | BOSS, BAT, BAI, BHUD, BWIN, BTIER | Done (Verifier PASS, rodada 3) |
| F3 | `economia-drops-cura` | Large | ECO, HEAL, ARM, ITEM, RAR | Done (Verifier PASS, rodada 2) |
| F4 | `loja-da-run` | Large | SHOP, MOD | Done (Verifier PASS, rodada 2) |
| F5 | `energia-e-tecnicas` | Complex | CE, TEC, TSH, CAST, DIV, KOK, RED, BLU, CUT, FXL, TFX | Done (Verifier PASS, rodada 2) |
| F6 | `meta-progressao` | Large | META, SAVE | Planejada (depois da expansão Combate de Mestre) |
| F7 | `combate-estilo-luta` | Complex | CTL, MOV, GRD, PAR, DOD, STR, FIN, AIR, EBL, CMB, SPC | Done (Verifier PASS, rodada 3; 91 ACs); absorve a antiga F8 |
| F8 | ~~`combos-estilo-luta`~~ | — | — | Absorvida pela F7 `combate-estilo-luta` (28/09) |
| F9 | `tecnicas-avancadas` | Complex | PUR, DOM, CHT | Planejada (depois da expansão Combate de Mestre) |
| — | `sprite-player-polish` | Large | SPR | Done (Verifier PASS, rodada 2) |
| — | `enemy-sprite-variety` | Large | EVR, HRX | Done (Verifier PASS, rodada 2) |
| F10 | `personagem-e-vermelho` | Large | SPF, RDA | Done (Verifier PASS, rodada 2; 25 ACs) |
| F11 | `ritmo-economia-e-chefe` | Large | PRG, SPN, LIM, ECN, BFX, MST | Done (Verifier PASS, rodada 2; 61 ACs) |
| — | `sprite-chefes-e-acabamento` | Large | BSP, BAN, LMB, BPW, OBJ, EPD | Done (Verifier PASS, rodada 2; 47 ACs); UAT do usuário ok e merge em `dev` em 03/10 |
| — | `movimento-suave-e-objetos-no-chefe` | Medium | PRB, CAM, ITP | Done (Verifier PASS, rodada 2; 23 ACs); UAT do usuário ok e merge em `dev` em 03/10 |
| F12 | `combate-mestre` | Complex | HGT, CMT, TGT, PST, GND, VOA, DEF, CNT, DFL, RDG | Em andamento em `feat/combate-mestre`: 34 de 41 tasks (implementação pronta; faltam smokes e o Verifier), pausada em 03/10 |
| F13 | `foco-e-ambiente` | Large | FOC, WAL, TKD | Planejada |
| F14 | `ia-tatica` | Complex | DIR, RNG, STG, ARC, IND, SFX | Planejada |
| F15 | `inimigos-a-distancia` | Large | CJR, PRJ | Planejada |
| F16 | `pressao-e-curva` | Medium | PRS, CUR | Planejada (só curva/composição; volume de spawn foi para F11) |

## Próximos passos

1. **F12 `combate-mestre`** (Specify): altura e cor de telegrafo nos golpes, `maxTargets`, regras de ragdoll, limite de 1 golpe no chão, tabela de defesa, Deflexão, janela de Contra, leitura de repetição.
2. **F13 a F16**, nessa ordem, com UAT do usuário em `dev` ao fim de cada uma.
3. **F6 e F9** depois da expansão.
4. Quando o usuário pedir: `dev` → `main` e o push.

Ao criar um ator novo (o Conjurador da F15, por exemplo), valem as decisões das features de arte: 3 aparências por inimigo comum (AD-013), chefe por pose articulada (AD-018) e sprite desenhado entre os passos de física com `BodyRenderPos` (AD-019).

## Expansão "Combate de Mestre" (F10–F16)

Design completo e aprovado em `docs/superpowers/specs/2026-10-02-combate-mestre-design.md` (loop ler → responder → punir → quebrar → finalizar, inspirado em Sifu; dificuldade por mecânica, AD-014..AD-017). Ordem: F10 (independente) e F11 → F12 → F13 → F14 → F15 → F16. F10 e F11 estão em `dev`.

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

### F7 combate-estilo-luta (absorveu a F8)
- P1 Grafo de golpes dirigido por dados (substitui o combo linear sem regressão); P1 voadora; P1 aéreos.
- P1 Guarda, parry, esquiva com câmera lenta, estrutura (postura) e finalizador.
- P1 Cancel por hit-confirm e dash-cancel; P1 contador de combo e nota de estilo.
- P2 Golpes direcionais (lançador, empurrão); P2 Kokusen também no finalizador do combo (reusa a janela e os efeitos de KOK da F5).

### F9 tecnicas-avancadas
- P1 Vazio Roxo (茈): com Azul e Vermelho equipados, os dois slots juntos unem as esferas numa esfera roxa que apaga tudo numa linha; custa a barra inteira.
- P1 Expansão de Domínio — Vazio Infinito (無量空処): selo de mão, esfera negra que cobre a tela, fundo cósmico e inimigos na tela paralisados por alguns segundos; depois, técnicas travadas (queima do domínio).
- P2 Encantamento: segurar a tecla do slot para recitar e aumentar o poder da técnica, com risco de ser interrompido.

### sprite-player-polish
- P1 Rosto, cabelo e gakuran com volume: sel-out (o contorno interno vira a linha do material) e rampas de 3 tons (AD-012).
- P1 Idle respirando em 4 frames, ciclo de pulo completo (subida, ápice, queda, pouso) e duração por frame.
- P2 Rastro de movimento nos golpes; P2 `tools/sprite-preview.mjs`.

### enemy-sprite-variety
- P1 Três aparências só visuais do inimigo comum (`corcunda`, `rastejante`, `bruto`), sorteadas por stream próprio (AD-013).
- P1 Reação por região do golpe (cabeça, gancho, corpo) e pose de impacto antes do ragdoll.

### F10 personagem-e-vermelho
- P1 Player sem partes soltas, cortes ou saltos de tronco, com testes que impedem a volta dos defeitos.
- P1 Vermelho carmim nascendo na ponta dos dedos; P1 repulsão na soltura e rajada a 760 px/s (AD-017).

### F11 ritmo-economia-e-chefe
- P1 Mais inimigos e mais cedo: todos perseguem, onda maior, spawn nas bordas e fora da câmera, limitador de 2 atacantes.
- P1 Economia que compra a 1ª técnica ao fim da rodada 1; oferta "Aprimorar" e maestria por acertos.
- P1 Chefe vencível no soco: HP base 400, janelas de punição (parede, pouso) e finalizador do chefe (J+K).

### sprite-chefes-e-acabamento
- P1 Oni e Tecelã desenhados por pose articulada (AD-018), com 20 frames; os três preparos têm poses diferentes.
- P1 Animações em laço: idle respirando, preparo tremendo, investida, rajada, rugido e atordoado.
- P1 Braço e perna esticados do player com antebraço e canela finos; chute alto saindo do quadril.
- P2 Projétil e onda de choque; P2 cadeira, garrafa, faca e porrete; P3 pendências dos inimigos (borda do impacto do bruto, punho, `hurt-uppercut`).

### movimento-suave-e-objetos-no-chefe
- P1 Objeto arremessado ou na mão acerta o chefe (o filtro de colisão não tinha a categoria dele).
- P1 Câmera do mundo com seguidor próprio: estado em ponto flutuante, amortecimento por tempo, sem `roundPixels` (AD-019).
- P1 Player, inimigo comum e chefe desenhados entre os dois últimos passos de física; objeto na mão e aura seguem o sprite.

### F12 combate-mestre
- Altura e cor de telegrafo nos golpes; `maxTargets` (leve 1, forte 2); regras de ragdoll e limite de 1 golpe no chão (AD-015).
- Ponto de compromisso; tabela de defesa (parry só de frente, virar, abaixar, pular, desvio com custo e ganho de postura).
- Deflexão; janela de Contra; voadora com custo e quique; leitura de repetição; invulnerabilidade de 700 para 300 ms.
- Frames novos do player que ficaram para cá: `duck`, `duck-counter` e `counter`.

### F13 foco-e-ambiente
- Barra de Foco e os 3 golpes de Foco (tecla F); parede (impacto que atordoa); empurrão em corrente.
- Finalizadores contextuais (normal, parede, arremesso no grupo); cura e Foco no finalizador.

### F14 ia-tatica
- `AttackDirector` com 2 tokens e token de oportunidade (AD-016); anel tático com fintas e flanco.
- Sequências de golpes por arquétipo; parry e esquiva do inimigo; superarmadura; agarrão; Elite.
- Indicador de costas e fora da tela; áudio procedural ZzFX (AD-017).

### F15 inimigos-a-distancia
- Arquétipo Conjurador: sprite novo nas 3 aparências, dash para trás e kiting.
- Quatro ataques (dardo, esfera, morteiro com marca no chão, rajada); parry que rebate o projétil; Deflexão à distância.
- Token à distância, regra de linha bloqueada e Conjurador Elite.

### F16 pressao-e-curva
- Escalada por composição e comportamento (Rastejantes, Brutos, Conjuradores, Elites, fintas, cadência de tokens de 350 para 220 ms).
- HP e dano fixos por rodada (AD-014); curva de ensino por rodada e dicas contextuais.

## Backlog técnico

### Testes e harness
- `tests/core/enemyAI.test.ts` só usa o tuning 35/70: um mutante que fixa 70 na perseguição (`src/core/enemyAI.ts:120`) sobrevive. Adicionar um caso com tuning diferente (achado fora de escopo pelo Verifier da F1, rodada 3).
- F5: ACs com evidência só indireta (TEC-11, CAST-12, CAST-13, KOK-26, RED-04, RED-15, TFX-06, TFX-10, TFX-11): implementados, mas nenhum teste lê o valor vivo (validation.md da F5).
- Smokes intermitentes: `heal` (HEAL-09), `armed` (ARM-12), `held-item` (F4, "pips de 4 para 2: 1") e, desde 03/10, `enemy-react` ("socoBaixo deveria acertar": falhou 1 vez em 3 suítes completas e passou em 8 de 8 execuções isoladas). Causas conhecidas, as duas no harness:
  - entre o `page.goto` e o 1º `step()` o loop do Phaser roda em rAF real. Dormir o loop no registro da cena quebrou 13 smokes que dependem de tempo real entre `keyboard.down/up`; a correção precisa migrar esses smokes para teclas seguradas durante `step` antes;
  - o runner do Matter suaviza o delta sobre um histórico de 100 quadros que ainda guarda os quadros em tempo real do começo, então os primeiros quadros com `step()` podem ter 0 ou 2 passos de física, e o acumulador fica com uma sobra diferente a cada carga (por isso o smoke `feel` lê `physics.alpha` em vez de supor 0,5). Zerar o histórico do runner no primeiro `step()` manual deve estabilizar os dois.
- Acima de 60 Hz o movimento só foi conferido por simulação (`tests/core/cameraFollow.test.ts`): no harness cada quadro tem um passo de física, e o Edge headless com swiftshader roda a ~15 fps. Falta uma conferência num monitor de 120 ou 144 Hz.
- Lacunas de precisão que os Verifiers deixaram abertas (nenhuma bloqueia): dobra do cotovelo no `armElbow` sem AC; LMB-09 conta o brilho da palma mas não fixa onde ele fica; EPD-06 fixa um canto do punho do bruto por frame; ITP-08 só roda virado para a esquerda; a câmera seguir o corpo em vez da posição de desenho não muda o tremor medido.

### Arte
- `tools/sprite-preview.mjs` gera pranchas do player e dos inimigos, mas não dos chefes nem dos objetos. As pranchas de 03/10 saíram de um script avulso e estão em `docs/art/sprite-chefes-e-acabamento/` (pasta ignorada pelo git).
- Frames do player que seguem fracos: `land-1` com pernas um pouco longas, braço de trás solto no `jump-0`, `ganchoAscendente-hit` com cabeça torta e `voadora-hit` com o joelho de trás lendo como braço.
- No chefe, olhar no próximo UAT: a pose do `dead`, o tamanho do orbe no preparo da rajada e o novelo creme da Tecelã.
- Paleta no teto de 42 cores (AD-017): arte nova reaproveita cores ou sobe o teto com uma decisão registrada.

### Código
- `Player.respawn()` é código morto: o `Health` do player é criado com `respawnMs: Infinity` (permadeath), então só `resetForRun()` roda.
- Efeitos de um quadro continuam saindo da posição do corpo, não do sprite: faíscas da zona do Kokusen, poeira, faísca de golpe, ponto de soltura do objeto arremessado e hitboxes do modo debug (desvio de no máximo um passo de física, AD-019).
- Objetos soltos, ragdoll, projéteis e drops não são interpolados entre os passos de física (são sprites do próprio Matter).
- `pickEnemySpawnPoint` usa o `worldView` da câmera, que agora segue a posição de desenho do player: um ponto de spawn a poucos px da borda da vista pode mudar de um lado para o outro conforme o alfa do quadro.
- Worktrees antigas no disco: `scratchpad/wt-f10` (o `node_modules` dela é junction; remover com `git worktree remove`) e `surGue-player-refine` (rascunho de 28/09, 159 commits atrás de `dev`). Branches de feature já mergeadas continuam existindo.
