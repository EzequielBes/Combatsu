# Surgue — Expansão "Combate de Mestre" (inspirada em Sifu)

## Contexto

O usuário quer um combate **mecânico, com profundidade e que faça sentido**, como no Sifu. O desafio deve vir de ler o inimigo, defender ou desviar na hora certa, punir, quebrar a postura e controlar a multidão. **Não** deve vir de inimigos com mais vida ou mais dano.

Além do combate, ele pediu:
- corrigir as inconsistências do personagem;
- deixar o Vermelho parecido com o do anime;
- facilitar o upgrade de habilidades;
- ter mais inimigos, chegando com mais frequência e sempre perseguindo o jogador.

### Por que o combate hoje é "simples" (código)

- **Golpe sem limite de alvos.** O golpe acerta todo inimigo dentro do sensor. O `makeHitGate` (`src/core/hit.ts:42`) só impede repetir o mesmo alvo.
- **Todo golpe forte derruba.** Qualquer golpe `heavy` leva a ragdoll (`src/core/enemyBrain.ts:61`).
- **Voadora sem custo.** Ela varre 120 px, atravessa a fila (inimigos não colidem com o player, `collision.ts:35`), não tem custo e ainda acerta quem já está no chão.
- **Inimigos sem plano.** `enemyAI.ts` é patrulha → persegue → um golpe leve, só no eixo x:
  - não há coordenação: todos a menos de 40 px atacam juntos;
  - não há sequência de golpes (string), altura, finta, nem defesa contra golpe forte.
- **Variantes só na aparência.** `corcunda`, `rastejante` e `bruto` mudam só o visual (AD-013), e a estrutura é a mesma para todos.
- **Defesa rasa.** O parry vale de qualquer lado e não existe esquiva por altura. A invulnerabilidade de 700 ms depois de levar golpe torna o ataque pelas costas quase irrelevante.
- **Dificuldade só numérica.** `difficulty.ts` aumenta 12% de HP e 8% de dano por rodada.
- **Pouca pressão.** Só 2 pontos de spawn (no meio e à direita), no máximo 4 inimigos vivos, nascimento só quando alguém morre, patrulha com `chaseRange 200`.
- **Upgrade difícil:**
  - **Bug:** Energia e Fluxo cobram e não aplicam nada (`TestScene.ts:245` usa `new Modifiers()` com o catálogo errado).
  - Não há garantia de oferta de upgrade para a técnica equipada.
  - O Vermelho Nv3 leva cerca de 25 lojas.
  - A carta da técnica não mostra o nível.
- **Vermelho alaranjado.** O orbe é âmbar/laranja (`techFx.ts:30-48`), não tem repulsão e a âncora nos dedos é fixa (`RedOrb.ts:13`).
- **Sprites com defeito:**
  - `chuteGiratorio-hit` espelha o frame inteiro e o boneco salta 22 px;
  - as pernas ficam soltas nos dois `-wind`;
  - o braço é cortado em `chuteEmpurrao-hit`;
  - `WRIST_GRIP` tem a pele clara demais;
  - continuam as pendências de `land-1`, `jump-0` e `ganchoAscendente-hit`.

### Achados do playtest do usuário (02/10)

- Nascem poucos inimigos, então entram poucos fragmentos: o jogador só consegue comprar uma técnica boa uma rodada antes do chefe.
- O 1º chefe sempre venceu. Medição no harness (`?debug&round=5`, socos e chutes colado nele por cerca de 13 s): o soco **acerta** (não é bug de colisão), mas tirou só 100 dos 600 de HP, enquanto o player perdeu 76 dos 100. Hoje só técnica à distância compensa, e mesmo assim causa pouco dano.
- Decisão: economia, volume de inimigos e chefe sobem para a F11, que vira a primeira entrega de combate.

### Decisões do usuário

- Corrigir os sprites listados.
- Vermelho carmim, com repulsão.
- **No máximo 2 inimigos atacam ao mesmo tempo.**
- **A dificuldade vem da mecânica, nunca de vida ou dano.**

---

## O sistema de combate (o coração da expansão)

### O loop: LER → RESPONDER → PUNIR → QUEBRAR → FINALIZAR

Toda troca de golpes segue este ciclo:

1. **Ler.** Cada golpe inimigo tem **altura** e **cor de telegrafo**:

   | Altura / telegrafo | Como lidar |
   |---|---|
   | ALTO branco | bloqueável, aceita parry |
   | ALTO vermelho | imbloqueável: **abaixar** ou desviar |
   | BAIXO (rasteira) | **pular** ou desviar |

   Ataques que vêm das costas ou de fora da tela ganham uma seta na borda e um som próprio.
2. **Responder.** A escolha certa custa menos e rende mais (ver tabela abaixo).
3. **Punir.** Depois de um parry, de uma esquiva perfeita ou de abaixar no tempo certo, abre-se a **janela de contra-ataque** de 450 ms. Nela, J ou K saem como **Contra**: um golpe rápido que dá muita postura e não pode ser interrompido.
4. **Quebrar.** A postura do inimigo (estrutura) é a barra que importa. Ela **regenera rápido** quando o jogador troca de alvo, então o certo é **isolar um inimigo por vez**.
5. **Finalizar.** Com a postura quebrada, J+K faz um **finalizador contextual**:
   - **Normal:** dá cura e Foco.
   - **Contra a parede:** dá mais Foco.
   - **Com outros inimigos perto:** o corpo é arremessado e derruba quem está no caminho, o que ajuda a controlar a multidão.

### Opções de defesa do jogador: cada uma tem um custo

| Ação | Input | Funciona contra | Efeito na postura | Observação |
|---|---|---|---|---|
| Guarda | segurar U | ALTO branco, só de frente | **enche** a postura do player (+15) | segura, mas passiva; com a postura cheia, a guarda quebra |
| Parry | tocar U no impacto (150 ms) | ALTO branco, só de frente | 0 no player e +35 no inimigo | parry em todos os golpes de uma sequência = **Deflexão**: o inimigo cambaleia e a janela de Contra dobra |
| Virar | U + direção | — | — | vira sem andar; **U + trás no tempo certo = parry pelas costas** |
| Abaixar | S+Q | ALTO (inclusive o vermelho) | **reduz** a postura do player em 10 | fica no lugar e abre o Contra "gancho subindo" |
| Pular | Espaço | BAIXO | — | permite um golpe aéreo de punição |
| Desvio | Q + direção | tudo | reduz a postura do player em 10 | tem cooldown de 450 ms; a esquiva perfeita continua igual |

Por que essa divisão: a guarda é o recurso de emergência. Jogar bem (parry, abaixar, pular, desviar) **esvazia** a postura do jogador. Jogar passivo **enche** a postura até quebrar. Isso torna a habilidade visível na tela.

### Ataque do jogador: cada golpe tem papel e limite

- **Limite de alvos (`maxTargets`):** golpe leve acerta 1, forte acerta 2. A ordem é o mais próximo na frente.
- **Ragdoll só em quatro casos:** postura quebrada, golpe com flag `knockdown`, morte, ou impacto em parede/inimigo. Fora disso, golpe forte = cambaleio de 380 ms.
- **Inimigo no chão leva só 1 golpe** (um pisão) e se levanta invulnerável. Pode levantar já atacando.
- **Golpes como ferramentas de grupo, com custo:**

  | Golpe | Efeito no grupo | Custo |
  |---|---|---|
  | Empurrão (frente+K) | joga o inimigo longe; se bater na **parede**, ele atordoa e ganha postura; se bater em **outro inimigo**, os dois cambaleiam | recuperação longa |
  | Rasteira (S+K) | derruba e **desarma** | recuperação longa; acerta só 1 alvo |
  | Carregado | quebra guarda | lento |
  | Voadora | encurta a distância; para no 1º acerto e quica de volta | +15 de postura no jogador; se errar, fica punível no pouso |

- **Ponto de compromisso do inimigo.** Um golpe leve só interrompe o windup **antes** do flash do telegrafo. Depois do flash, o ataque sai de qualquer jeito: é preciso defender, não dá para atropelar no botão.
- **Leitura.** O inimigo "aprende" golpe repetido. Usar o mesmo golpe várias vezes em 3 s dá +25% de chance por uso de ele defender (guarda, parry ou esquiva conforme o arquétipo). A chance decai com o tempo, então variar o combo é obrigatório. Martelar só leve num alvo (4 ou mais seguidos) dá chance de ele **romper** com um empurrão.
- O dano em HP não muda. A mudança está em **quando** e **como** cada golpe funciona.

### Foco: recurso de habilidade (o equivalente ao Focus do Sifu)

- **Barra com 3 segmentos.** Enche com parry, Deflexão, esquiva/abaixar perfeitos, combos variados e finalizadores. **Não** enche com golpe repetido.
- **Tecla F + direção**, com câmera lenta curta. Cada golpe custa 1 segmento:

  | Golpe de Foco | Efeito |
  |---|---|
  | F+frente — **Olhos** | interrompe qualquer ataque (até o vermelho) e atordoa por 2 s |
  | F+baixo — **Pernas** | derruba e desarma |
  | F+trás — **Giro** | empurra todos num raio de 70 px; serve para escapar do cerco |

- Assim o controle de multidão é **ganho jogando bem**, e não fica de graça.

### Inimigos: verbos próprios e trabalho em equipe

- **Diretor de ataque** (`AttackDirector`, puro):
  - Tem **2 tokens** e espera pelo menos 350 ms entre o início de dois ataques.
  - Prioriza quem está **nas costas** do jogador, quem está mais perto e quem espera há mais tempo.
  - Se o jogador erra um golpe perto, o inimigo mais próximo ganha um **token de oportunidade**.
- **Anel tático.** Quem está sem token:
  - mantém 90–140 px de distância, anda para os lados e recua quando o jogador avança;
  - faz **fintas** (windup falso);
  - se espalha e tenta ocupar as costas do jogador;
  - evita empilhar por separação suave (steering, sem física Matter).
- **Sequências de golpes:** cada arquétipo tem de 2 a 4 sequências de 1 a 4 golpes, com alturas mistas e um **golpe atrasado**. O golpe atrasado pega quem aperta o parry no ritmo errado.
- **Defesa do inimigo:** guarda, **parry do inimigo** (contra golpe repetido, com contra-ataque), esquiva para trás e superarmadura, conforme o arquétipo.
- **Arquétipos.** As 3 aparências da AD-013 passam a ter comportamento próprio:

| Arquétipo | Postura | Estilo | O que ensina |
|---|---|---|---|
| **Corcunda** | 70 | Rápido; sequências de 2–3 jabs ALTO branco; esquiva para trás depois de levar 2 leves | parry no ritmo, perseguir |
| **Rastejante** | 100 | Rasteira BAIXO, avanço rasteiro, ataque ao levantar, golpe atrasado | pular e abaixar, ler a altura |
| **Bruto** | 160 | Superarmadura durante o próprio ataque; soco ALTO **vermelho**; agarrão (só desvio ou Foco Olhos); guarda contra forte; leve quase não faz efeito | quebrar postura com parry, empurrar contra a parede |
| **Conjurador** (novo, à distância) | 60 | Fica a 200–320 px e recua quando o jogador chega perto (dash para trás com recarga). Tem 4 ataques (abaixo). | prioridade de alvo, encurtar a distância, defender projétil |
| **Elite** (modificador, rodada 6+) | +50% | Uma sequência a mais, parry do inimigo, fintas frequentes; aura distinta. No Conjurador Elite: projétil teleguiado lento e rajada maior. | dominar tudo junto |

### Ataques à distância: desviar, rebater e caçar

Os ataques à distância obrigam o jogador a se mover e a escolher prioridades, em vez de só trocar golpes corpo a corpo.

- **Ataques do Conjurador.** Todos são anunciados por um brilho na mão e uma linha de mira tênue durante o windup. Se ele estiver fora da câmera, aparece o indicador na borda.

  | Ataque | Altura / telegrafo | Contra-jogo |
  |---|---|---|
  | **Dardo amaldiçoado** (reto, rápido) | ALTO branco | Bloquear. Com **parry, o dardo é rebatido** de volta e atordoa quem acertar: dá para usá-lo contra o próprio Conjurador ou contra quem estiver na linha. |
  | **Esfera carregada** (lenta, grande) | ALTO **vermelho** | Abaixar, desviar ou sair da linha. Se acertar, explode em área pequena. |
  | **Morteiro** (arco) | BAIXO, com **marca no chão** que aparece 600 ms antes | Sair da área ou pular na hora. A explosão também acerta inimigos, o que permite atrair o grupo para a marca. |
  | **Rajada** (3 dardos com ritmo irregular) | ALTO branco | Parry em ritmo nos três = **Deflexão à distância** (rebate o último e abre o Foco). |

- **Regras de justiça:**
  - Projéteis usam um **token à distância** separado dos 2 de corpo a corpo: 1 por vez, 2 a partir da rodada 8.
  - O Conjurador não atira com a linha bloqueada por outro inimigo. Se atirar mesmo assim (Elite), o projétil acerta o aliado.
- **Como caçar o Conjurador:**
  - A **voadora ganha papel claro**: ela encurta a distância até ele. O custo de postura continua.
  - Arremessar props.
  - Rebater os dardos dele.
  - Foco Olhos interrompe a esfera carregada.
  - De perto ele é frágil (postura 60), mas foge. Persegui-lo deixa as costas expostas para os outros, e esse é o dilema que o arquétipo cria.
- **Reaproveitamento:** `src/game/Projectile.ts` e os padrões de projétil do chefe (`src/core/bossAI.ts`, `src/game/Boss.ts`). A lógica pura de trajetória, rebatida e marca no chão fica em `src/core/rangedAttack.ts`.

- Inimigos armados continuam: a faca deixa as sequências rápidas e o porrete dá golpe vermelho. A rasteira e o Foco Pernas desarmam.

### Escalada da dificuldade: por mecânica

- **HP e dano ficam fixos.** O escalonamento por rodada de `difficulty.ts` sai.
- **O que escala:**
  - composição (mais Rastejantes e Brutos, Elites a partir da rodada 6);
  - número de inimigos vivos;
  - frequência de fintas e de golpes atrasados;
  - chance de leitura;
  - intervalo entre tokens, de 350 para 220 ms;
  - armas.
- **Curva de ensino.** Cada mecânica nova aparece sozinha antes de se misturar:
  - rodada 1: só Corcundas;
  - rodada 2: entram os Rastejantes;
  - rodada 3: entra o primeiro Bruto, sozinho;
  - rodada 4: entra o primeiro Conjurador, protegido por 2 Corcundas;
  - rodada 6 em diante: mistura e entram os Elites.

  Na primeira aparição de cada mecânica surge uma **dica contextual curta** (ex.: "VERMELHO = não dá para bloquear. S+Q abaixa"), uma única vez por run.
- **Feedback que ensina:**
  - **Áudio procedural com ZzFX** (MIT, ~1 KB, sem arquivos): windup branco, windup vermelho, parry, Deflexão, bloqueio, quebra de postura e ataque pelas costas;
  - faíscas diferentes para parry e para bloqueio;
  - câmera lenta na Deflexão.

---

## Roadmap (features tlc, em sequência; branch `feat/<nome>` → `dev` com `--no-ff`)

```
F10 personagem-e-vermelho (independente, pode correr junto com F11)
F11 ritmo-economia-e-chefe ─► F12 combate-mestre ─► F13 foco-e-ambiente ─► F14 ia-tatica ─► F15 inimigos-a-distancia ─► F16 pressao-e-curva
```

| # | Feature | Tamanho | Conteúdo |
|---|---|---|---|
| F10 | `personagem-e-vermelho` | Large | Correções de sprite (lista acima). Teste de alinhamento: tronco a ±2 texels da origem e pés no chão em todos os frames. Novos frames `duck`, `duck-counter` e `counter`. Paleta de 40 para 42 cores (carmim `0xd1103a`, magenta-claro `0xff4f8b`). Vermelho: núcleo branco→rosa→carmim, halo Glow carmim, anel de distorção, âncora nos dedos por fase, onda de repulsão em cone de ~80 px na soltura, orbe a ~760 px/s com rastro carmim e detonação carmim. |
| F11 | `ritmo-economia-e-chefe` | Large | **Prioridade 1 (playtest de 02/10).** (a) Bug de Energia/Fluxo. (b) **Mais inimigos já**: sem patrulha, todos perseguem; onda de 6 + 2 por rodada (teto 20); `maxAlive` 5 → 8; nasce um a cada ~1,5 s enquanto houver vaga; spawn nas bordas e fora da câmera. Inclui um **limitador simples de 2 atacantes** (a F14 troca pelo `AttackDirector` completo). (c) **Economia**: mais inimigos rendem mais fragmentos; meta de comprar a 1ª técnica ao fim da rodada 1 e ter uma técnica no Nv2 antes do 1º chefe. Oferta "Aprimorar" garantida, Nv2 a partir da rodada 2 e Nv3 a partir da rodada 4, maestria (15/25 acertos), chefe dá upgrade grátis, carta mostra "Nv 1→2". (d) **Chefe vencível no corpo a corpo**: HP base 600 → ~400; janelas de punição (investida que bate na parede atordoa 1,5 s; pouso do salto com 800 ms de recuperação vulnerável); postura zerada abre o **finalizador do chefe** (J+K, ~12% do HP). |
| F12 | `combate-mestre` | Complex | Altura e cor de telegrafo nos golpes; `maxTargets`; regras de ragdoll; limite de 1 golpe no chão; ponto de compromisso; tabela de defesa (parry só de frente, virar, abaixar, pular, desvio com custo/ganho de postura); Deflexão; janela de Contra; voadora com custo e quique; leitura de repetição; invulnerabilidade de 700 para 300 ms. |
| F13 | `foco-e-ambiente` | Large | Barra de Foco e os 3 golpes de Foco (tecla F); parede (impacto que atordoa); empurrão em corrente; finalizadores contextuais (normal, parede, arremesso no grupo); cura e Foco no finalizador. |
| F14 | `ia-tatica` | Complex | `AttackDirector` com 2 tokens e token de oportunidade; anel com fintas e flanco; sequências de golpes por arquétipo; parry e esquiva do inimigo; superarmadura; agarrão; Elite; indicador de costas/fora da tela; áudio ZzFX. |
| F15 | `inimigos-a-distancia` | Large | Arquétipo Conjurador: sprite novo nas 3 aparências (AD-013), dash para trás e kiting. Os 4 ataques (dardo, esfera, morteiro com marca no chão, rajada), parry que rebate o projétil, Deflexão à distância, token à distância, regra de linha bloqueada e Conjurador Elite. |
| F16 | `pressao-e-curva` | Medium | O volume de spawn já entrou na F11. Aqui fica a escalada por composição e comportamento (Rastejantes, Brutos, Conjuradores, Elites, fintas, leitura, cadência de tokens de 350 para 220 ms), HP e dano fixos (AD-014), a curva de ensino por rodada e as dicas contextuais. |

**Rejeitado:** Yuka e outras bibliotecas de steering. A IA atual é TypeScript puro e determinístico (AD-001), e o diretor mais o anel cabem em código testável. **Adotado:** ZzFX, para áudio sem assets.

## Arquivos críticos

- **Golpes e regras:**
  - `src/data/moves.ts` ganha os campos `height`, `telegraph`, `maxTargets`, `knockdown`, `postureCost` e `counter`.
  - `src/game/hitbox.ts` e `src/core/hit.ts` implementam o limite de alvos.
  - `src/core/enemyBrain.ts` trata cambaleio, limite no chão e ponto de compromisso.
- **Defesa e postura:**
  - `src/core/defense.ts` cobre parry só de frente, virar, abaixar, Deflexão e janela de Contra;
  - `src/core/structure.ts` cobre a postura por arquétipo e a regeneração ao trocar de alvo;
  - `src/core/dodge.ts`, `src/game/Player.ts` e `src/game/input.ts`.
- **Módulos novos e puros em `src/core`:** `focus.ts`, `attackDirector.ts`, `enemyArchetype.ts` (reaproveita `enemyVariant.ts`), `enemyStrings.ts`, `moveReading.ts`, `tutorialHints.ts` e `rangedAttack.ts`.
- **Conjurador:** sprites em `src/game/art/sprites/enemy.ts` (ou `caster.ts` novo); projéteis em `src/game/Projectile.ts`.
- **IA:** `src/core/enemyAI.ts` é reescrito (anel, tokens, sequências). Também `src/core/enemyGuard.ts`, `src/game/Enemy.ts` e `src/scenes/TestScene.ts` (ligação, indicador de costas, paredes, finalizadores).
- **Spawn:** `src/core/waves.ts`, `src/core/difficulty.ts`, `src/data/tuning.ts`, `src/data/level1.ts`.
- **Progressão:** `src/core/shop.ts`, `src/data/shop.ts`, `src/core/loadout.ts`, `src/game/EnergyHud.ts`, `TestScene.ts:245`.
- **Arte:** `src/game/art/sprites/{playerMoves,player,playerTech,techFx}.ts`, `palette.ts`, `src/game/techFx/RedOrb.ts`, `src/core/redOrb.ts`.
- **Reaproveitar:** `debugApi.ts` (snapshot ganha tokens, arquétipo, postura, leitura, foco, janela de Contra), `scripts/smoke/fight-kit.mjs`, `makeHitGate`, `Structure`, `EnemyGuard`, `pickHitReaction`, FxLab e o finalizador atual.

## Verificação

- **Por feature:** `npm test`, `npm run typecheck`, `npm run smoke` (Puppeteer, Edge e `window.__game`) e o Verifier tlc independente.
- **Smokes que discriminam o comportamento:**
  - 3 inimigos empilhados: o leve acerta 1, o forte acerta no máximo 2.
  - Spam de voadora por 10 s com 4 inimigos: nenhum ragdoll sem postura quebrada, a leitura sobe e o jogador leva dano.
  - **Bot só de botão** (só J e K por 30 s na rodada 4) **perde** para o bot que faz parry no telegrafo: a métrica de dano tomado separa os dois.
  - 30 s com 6 inimigos vivos: nunca mais de 2 em `windup|attack` ao mesmo tempo.
  - Ataque pelas costas: o indicador aparece do lado certo; parry sem virar falha; U+trás defende.
  - Vermelho do Bruto: o bloqueio falha e abaixar evita. Rasteira: pular evita.
  - Sequência de 3 golpes defendida com parry nos 3: Deflexão e janela de Contra de 900 ms.
  - Foco: Olhos interrompe o vermelho; Giro empurra todos num raio de 70 px.
  - Conjurador:
    - recua quando o jogador chega a menos de 150 px;
    - o parry no dardo o rebate e atordoa o Conjurador;
    - a esfera vermelha não pode ser bloqueada, mas abaixar evita;
    - a marca do morteiro aparece pelo menos 600 ms antes do impacto e a explosão acerta inimigos;
    - nunca há mais de 1 projétil inimigo em windup/voo na rodada 4.
  - Loja: Energia aplica o efeito, "Aprimorar" sempre aparece, maestria sobe de nível com 15 acertos.
  - Spawn: nasce fora da câmera em até 1,5 s se houver vaga; nenhum inimigo em `patrol`.
- **Visual:** sprite-preview e FxLab do Vermelho em câmera lenta, mais o teste de alinhamento de todos os frames.
- **UAT do usuário** em `dev` ao fim de cada feature de combate (F12–F16), para avaliar a sensação de jogo. Só depois vai para `main`.

## Execução (após aprovação)

1. Salvar o design em `docs/superpowers/specs/2026-10-02-combate-mestre-design.md`, atualizar `.specs/ROADMAP.md` (F10–F16) e registrar as ADs novas em `STATE.md`: paleta 42, postura no centro e regras de ragdoll, tokens, Foco e dificuldade por mecânica.
2. Rodar cada feature pelo tlc completo (Opus 5.5 planeja e orquestra, workers Sonnet 5.5, no máximo 2 agentes).
