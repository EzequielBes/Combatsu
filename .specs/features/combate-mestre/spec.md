# Combate de Mestre — Specification

## Problem Statement

O corpo a corpo de hoje se resolve apertando botão. Um golpe acerta todos os inimigos dentro da hitbox, todo golpe forte derruba, a voadora atravessa a fila sem custo e ainda acerta quem já caiu, e um golpe leve cancela qualquer ataque inimigo até o último instante. Do lado da defesa, o parry vale de qualquer lado e contra qualquer golpe, não existe resposta por altura e os 700 ms de invulnerabilidade depois de apanhar tornam o ataque pelas costas quase irrelevante.

Esta feature é a F12 da expansão "Combate de Mestre" (design aprovado em `docs/superpowers/specs/2026-10-02-combate-mestre-design.md`). Ela põe no jogo o loop **ler → responder → punir**: cada golpe inimigo tem altura e telegrafo, cada defesa serve para um tipo de golpe e tem custo, a defesa certa abre uma janela de Contra, e cada golpe do jogador passa a ter limite de alvos e papel próprio. HP e dano não mudam (AD-014); muda quando e como cada golpe funciona (AD-015).

## Goals

- [ ] **Ler.** Todo golpe de inimigo comum tem um tipo (`white`, `red` ou `low`) mostrado por um marcador sobre a cabeça durante o preparo e por um flash no ponto de compromisso, 200 ms antes do golpe.
- [ ] **Responder.** Guarda e parry só valem de frente e contra `white`; abaixar evita `white` e `red`; pular evita `low`; a esquiva evita tudo. Defender bem esvazia a postura do jogador, bloquear enche.
- [ ] **Punir.** Parry, esquiva perfeita e abaixar no tempo abrem 450 ms de Contra; aparar a sequência inteira (Deflexão) dobra a janela.
- [ ] **Golpes com limite.** Leve acerta 1 alvo e forte 2; golpe forte cambaleia em vez de derrubar; inimigo no chão leva 1 golpe; a voadora custa postura, para no primeiro alvo e é punível quando erra.
- [ ] **Sem atropelar no botão.** Depois do ponto de compromisso o ataque inimigo sai mesmo levando golpe leve ou forte, e repetir o mesmo golpe faz o inimigo defender.
- [ ] Toda regra nova vive em `src/core`/`src/data`, testada em Node (AD-001), e aparece no snapshot de debug para os smokes.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Barra de Foco e golpes de Foco, parede que atordoa, empurrão em corrente, finalizadores contextuais | F13 `foco-e-ambiente` |
| Desarmar com a rasteira | F13, junto do Foco Pernas, que também desarma |
| `AttackDirector`, anel tático, fintas, flanco | F14 `ia-tatica`; o limitador simples da F11 continua |
| Arquétipos completos (postura por arquétipo, sequências de 2 a 4 golpes com altura mista e golpe atrasado, superarmadura, agarrão, parry e esquiva do inimigo, ataque ao levantar, Elite) | F14; aqui entram só o tipo do golpe por aparência e a sequência de 2 golpes da faca |
| Indicador de ataque pelas costas e fora da tela, áudio ZzFX, câmera lenta na Deflexão | F14 (feedback que ensina) |
| Conjurador e projéteis de inimigo comum | F15 `inimigos-a-distancia` |
| Curva de ensino por rodada e dicas contextuais | F16 `pressao-e-curva` |
| Telegrafo colorido no chefe e ataques novos do chefe | O chefe só ganha a altura dos golpes que já tem; o kit é o da F2/F11 |
| Rebalancear as técnicas amaldiçoadas pelas regras novas | AD-015 vale para o corpo a corpo; golpe de técnica segue derrubando e não entra no limite do chão |
| Altura nos golpes do jogador | Só serve à defesa do inimigo, que é da F14 |

---

## Assumptions & Open Questions

Decisões marcadas com `y` saem do design aprovado em 02/10. As marcadas com `n` são escolhas do agente para fechar o que o design deixou em aberto; o usuário pediu para seguir com as próximas features sem consulta e avalia jogando, no UAT. Os números ficam em `src/data/moves.ts` e `src/data/tuning.ts`.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Tipos de golpe inimigo | `white` (alto, bloqueável e aparável), `red` (alto, imbloqueável), `low` (baixo, imbloqueável) | Tabela "Ler" do design | y |
| Quem usa cada tipo nesta feature | Porrete = `red` (qualquer aparência); `rastejante` sem porrete = `low`; o resto = `white` | O design dá o vermelho ao porrete e a rasteira ao Rastejante; sem isso o UAT não teria golpe baixo. Reabre a AD-013 só no tipo do golpe; corpo, hitbox e tuning seguem iguais | n |
| Marcador de telegrafo | Ícone de pixel art sobre a cabeça durante `windup` e `attack`: `!` branco (`white`), `×` carmim (`red`), `▼` âmbar (`low`) | A cor fica legível desde o começo do preparo (450 ms) e a forma não depende só da cor | n |
| Ponto de compromisso | Quando faltam 200 ms ou menos do `windup`; o corpo pisca 80 ms na cor do tipo (`w`, `t`, `A`) | O design pede um flash que separa "ainda dá para interromper" de "tem que defender"; 200 ms é o trecho que o frame `windup-1` já segura (EVR-09) | n |
| O que interrompe depois do compromisso | Só golpe que derruba, quebra de postura, morte e o Contra. Golpe leve e golpe forte comum tiram vida e postura, e o ataque sai | "Depois do flash, o ataque sai de qualquer jeito" | y |
| Limite de alvos | Leve 1, forte 2; `voadora`, `rasteira` e os dois Contras 1; objeto balançado na mão 2. Ordem: o mais perto primeiro | Design ("`maxTargets`") e tabela dos golpes de grupo | y |
| Vaga de alvo | Golpe aceito ou segurado pela guarda ocupa vaga; golpe recusado (morto, levantando, limite do chão) não ocupa | A guarda parou o golpe; um alvo que não pode apanhar não deve gastar o golpe | n |
| Cambaleio | Golpe forte sem `knockdown` em inimigo que sobrevive: estado `stagger` por 380 ms, sem ragdoll | Design ("golpe forte = cambaleio de 380 ms") | y |
| Golpes que derrubam (`knockdown`) | `rasteira`, `ganchoAscendente`, `palmaExplosiva`, o finalizador, objeto arremessado, golpe forte de técnica e o golpe forte de teste do debug (tecla 2) | Rasteira e lançador precisam do ragdoll (MOV-10, MOV-11); a palma é um especial de entrada difícil; o objeto arremessado é recurso com durabilidade; a tecla 2 mantém os smokes antigos válidos | n |
| Golpe leve durante o cambaleio | Continua em `stagger`; o tempo que falta vira `max(resto, 220)` | Leve não encurta o cambaleio nem estende além do hitstun | n |
| Limite do chão | Em `ragdollStun` só o primeiro golpe entra, sem reiniciar o tempo no chão; em `gettingUp` nenhum entra. Golpe de técnica não tem limite | Design ("leva só 1 golpe e se levanta invulnerável"); técnicas ficam fora (ver Out of Scope) | y |
| Troca de alvo | Foco = último inimigo comum que aceitou um golpe corpo a corpo ou de objeto. Fora do foco a postura cai a 40/s; no foco, 10/s. O atraso de 1500 ms vale nos dois casos | "A postura regenera rápido quando o jogador troca de alvo"; manter o atraso evita perder o ganho de um parry no inimigo que não é o foco | n |
| Invulnerabilidade pós-golpe | `PLAYER_HEALTH.invulnMs` = 300 | Design | y |
| Voadora | Custa 15 de postura ao começar; para no 1º alvo aceito, recua 36 px em 150 ms e sobe a 240 px/s; sem acerto, a `recovery` dura 460 ms | Design ("custo e quique", "punível no pouso"); 460 ms cobre um ciclo de preparo do inimigo | n |
| Parry | Só com o atacante à frente e contra golpe sem `unblockable`. Substitui o PAR-02 | Tabela de defesa do design | y |
| Virar | Com a guarda de pé, a direção vira o jogador e ele não anda. Substitui o GRD-05 (andar a 40%) | "Virar: U + direção, vira sem andar"; o parry pelas costas é virar e aparar no mesmo aperto | y |
| Abaixar | `S`+`Q` no chão: 320 ms parado, evita todo golpe `high`; divide a recarga de 450 ms com a esquiva. Com `S` segurada, `Q` sempre abaixa, mesmo com direção horizontal | Design ("fica no lugar"); 320 ms cobre o golpe de 120 ms com folga de reação | n |
| Postura ao defender bem | −10 no abaixar que evita um golpe e na esquiva perfeita (uma vez por ação); parry 0; bloqueio +15 (como hoje) | Design ("jogar bem esvazia a postura") | y |
| Pular | Golpe `low` que chega com o jogador fora do chão não acerta; sem efeito na postura | Tabela de defesa | y |
| Golpes do chefe | Projétil da rajada = `high`; onda de choque = `low`; investida e pouso sem altura (corpo inteiro: não dá para abaixar nem pular) | Passar por baixo do Oni em investida não faz sentido; a onda rasteira já é pulável pela geometria | n |
| Ordem de decisão do golpe recebido | parry → invencibilidade da esquiva → invencibilidade do Contra → abaixar → pulo → guarda → golpe cheio | L-041: fixa a precedência entre regras de defesa | n |
| Janela de Contra | 450 ms de tempo de jogo depois de parry, esquiva perfeita ou abaixar que evitou golpe; 900 ms na Deflexão. `J` ou `K` no chão dispara; a direção é ignorada | Design | y |
| Golpes de Contra | `contra` (depois de parry e esquiva): 10 de dano, 50/80/160 ms. `contraGancho` (depois de abaixar): 12 de dano, 50/90/200 ms. Os dois: fortes, +30 de postura, passam pela guarda, 1 alvo | "Golpe rápido que dá muita postura"; 30 fica entre a joelhada (30) e o parry (35) | n |
| "Não pode ser interrompido" | Durante `startup` e `active` do Contra, golpe recebido causa 0 de dano e não cancela | Mais simples e mais legível que levar o dano sem reagir | n |
| Aperto durante a esquiva | `J`/`K` apertada com a janela aberta e a esquiva (ou o abaixar) ainda em curso fica guardada e dispara no primeiro frame livre | Na câmera lenta da esquiva perfeita o resto do dash dura ~330 ms reais; perder o aperto frustraria | n |
| Aviso da janela | Texto flutuante `CONTRA` sobre o jogador e a camada `counter.ready`; na Deflexão, `DEFLEXÃO` | Reaproveita `FloatTexts`; sem arte nova de HUD | n |
| Sequência do inimigo | Faca = 2 golpes; o resto = 1. Entre dois golpes: 300 ms de preparo, já comprometido. Só o último golpe leva ao descanso | "A faca deixa as sequências rápidas"; sem sequência a Deflexão não existiria no jogo. 120 + 300 ms entre impactos respeita a recarga de 300 ms do parry | n |
| Dano da faca | Continua ×1,25 por golpe (ARM-05), agora duas vezes | Não reabre a F3; os dois golpes podem ser aparados, bloqueados ou esquivados | n |
| Deflexão | Aparar o último golpe de uma sequência de 2+ golpes tendo aparado todos os anteriores: evento `deflect`, inimigo em `stagger` por 900 ms, janela de Contra de 900 ms | Design ("o inimigo cambaleia e a janela de Contra dobra") | y |
| Parry no meio da sequência | Soma os 35 de postura e a sequência continua; os 400 ms parado do PAR-10 valem só no último golpe | Sem isso não haveria como aparar o segundo golpe | n |
| Leitura | Bônus = `min(0,25 × repetições, 1)`, repetições = inícios do mesmo golpe nos 3000 ms anteriores. Soma à chance de guarda do EBL-01 | Design ("+25% por uso", "decai com o tempo": o uso sai da janela) | y |
| Como o inimigo defende ao ler | Levanta a guarda (único recurso do inimigo nesta feature), mesmo saindo de `hitstun` ou `stagger`; a guarda de leitura segura também golpe forte, uma vez | Parry e esquiva do inimigo são da F14; sem sair do cambaleio a leitura nunca dispararia num alvo travado | n |
| Alcance da leitura | 80 px + o avanço do golpe (`travel.forwardPx`) | Cobre a voadora, que começa longe | n |
| Romper | A partir do 4º golpe leve seguido no mesmo alvo (até 1500 ms entre eles, sem forte no meio): 35% de chance de o inimigo empurrar. Empurrão: 48 px em 150 ms, sem dano, 300 ms sem controle | Design ("4 ou mais seguidos dá chance de ele romper com um empurrão") | n |
| Chaves de debug | `enemyAttack=white\|red\|low`, `enemyString=1..4`, `shove=N`; `enemyGuard=N` passa a fixar a chance total (base + leitura) | Smokes determinísticos; os smokes antigos com `enemyGuard=0` continuam sem guarda (L-042) | n |
| Arte nova | Frames `duck`, `contra-*`, `contraGancho-*` do jogador e a textura do marcador | Ficaram para esta feature na F10 | y |

**Open questions:** none - all resolved or logged above.

---

## Glossário

- **Tipo do golpe**: `white`, `red` ou `low`. No `Hit`: `white` = `height: 'high'`; `red` = `height: 'high'` e `unblockable`; `low` = `height: 'low'` e `unblockable`.
- **Comprometido**: inimigo comum cujo `windup` tem 200 ms ou menos pela frente, ou que está em `attack` ou entre dois golpes de uma sequência.
- **Golpe que derruba**: `Hit` com `knockdown: true`.
- **Golpe de técnica**: `Hit` criado pelo `TechRunner` (`tech: true`).
- **Golpe aceito**: `receiveHit` devolveu `true` (o alvo levou dano ou reagiu).
- **Sequência**: os golpes que um inimigo dá entre um `windupStart` e o descanso; cada um leva `string: { id, index, length }` no `Hit`.
- **Foco**: o último inimigo comum que aceitou um golpe corpo a corpo ou de objeto do jogador.
- **Contra**: os golpes `contra` e `contraGancho`, marcados com `counter: true` em `MOVES`.
- **Guarda de leitura**: guarda do inimigo levantada com bônus de leitura acima de 0.
- **Inimigo elegível para guarda**: inimigo comum vivo, fora de ragdoll, não quebrado, fora de `gettingUp`, não comprometido e com a IA fora de `attack`.
- **Golpe cheio**: desfecho em que nenhuma defesa valeu; o jogador perde o `damage` do `Hit`.

## Snapshot de debug (contrato usado pelos ACs)

```ts
// `player` ganha:
duck: { active: boolean };
counter: { open: boolean; kind: 'contra' | 'contraGancho' | null; remainingMs: number };
invulnerable: boolean;               // invulnerabilidade depois de um golpe (Health)
// cada item de `enemies` ganha:
state: EnemyState;                   // agora com 'stagger'
telegraph: 'white' | 'red' | 'low' | null;  // frame do marcador visível, lido do sprite
committed: boolean;
commitFlash: string | null;          // chave da PALETTE do flash em curso
attack: { kind: 'white' | 'red' | 'low'; index: number; length: number };  // index 0 fora de sequência
downHits: number;                    // golpes aceitos no ragdollStun atual
lightStreak: number;
guardRead: boolean;                  // a guarda de pé é de leitura
// na raiz:
focusId: number | null;
reading: { move: string | null; repeats: number };  // último golpe iniciado e as repetições dele
// `events` ganha: duck, duckEvade, jumpEvade, deflect, whiff:voadora,
//   armored:<id>, stagger:<id>, read:<id>, shove:<id>
```

## ACs antigos substituídos

| AC antigo | O que muda | AC novo |
| --- | --- | --- |
| PAR-02 (parry contra qualquer golpe, de qualquer lado) | Só de frente e contra golpe sem `unblockable` | DEF-01, DEF-02 |
| GRD-05 (andar a 40% com a guarda) | Com a guarda de pé o jogador vira e não anda | DEF-04, DEF-05 |
| PAR-10 (inimigo aparado para 400 ms) | Só no último golpe da sequência | DFL-08, DFL-09 |
| HP-02 (invulnerável 700 ms depois de um golpe) | 300 ms | PST-15 |
| AI-04 (levar golpe cancela o preparo) | Só antes do ponto de compromisso | CMT-03, CMT-04 |
| Golpe forte = ragdoll (`visual-e-jogabilidade`, `EnemyBrain`) | Forte cambaleia; ragdoll só com `knockdown`, finalizador ou morte | PST-01, PST-05 |
| STR-04 (postura do inimigo cai 10/s) | 10/s só no foco; 40/s fora dele | PST-14, PST-16 |
| AIR-02 (voadora anda 120 px) | Vale quando ela não acerta; ao acertar, para e recua | VOA-04, VOA-05 |
| EBL-01 (guarda só contra início de golpe leve) | A leitura soma chance e vale para qualquer golpe | RDG-03 |
| Golpe em quem está no chão ou levantando (`EnemyBrain`, sub-projeto 1: forte no chão dava novo impulso e reiniciava o tempo; leve em quem levanta interrompia) | No chão só o primeiro golpe entra e o tempo não reinicia; levantando, nenhum entra. Golpe de técnica segue como antes | GND-01, GND-02, GND-03, GND-04, GND-06 |

---

## User Stories

### P1: Ler o golpe inimigo (altura e telegrafo) ⭐ MVP

**User Story**: Como jogador, quero ver que tipo de golpe o inimigo vai dar antes de ele sair, para escolher a defesa certa em vez de adivinhar.

**Why P1**: Sem a leitura, a tabela de defesa não tem sentido; é a base do loop.

**Acceptance Criteria**:

1. HGT-01: WHEN a ferramenta do inimigo é `cursedClub` THEN `attackKindFor` SHALL devolver `red`, para qualquer aparência.
2. HGT-02: WHEN a aparência é `rastejante` e a ferramenta não é `cursedClub` THEN `attackKindFor` SHALL devolver `low`.
3. HGT-03: WHEN a aparência é `corcunda` ou `bruto` e a ferramenta não é `cursedClub` THEN `attackKindFor` SHALL devolver `white`.
4. HGT-04: WHEN um inimigo comum abre a hitbox de um golpe do tipo `white` THEN o `Hit` SHALL ter `height` igual a `high` e `unblockable` falso ou ausente.
5. HGT-05: WHEN um inimigo comum abre a hitbox de um golpe do tipo `red` THEN o `Hit` SHALL ter `height` igual a `high` e `unblockable` igual a `true`.
6. HGT-06: WHEN um inimigo comum abre a hitbox de um golpe do tipo `low` THEN o `Hit` SHALL ter `height` igual a `low` e `unblockable` igual a `true`.
7. HGT-07: WHILE a IA de um inimigo comum está em `windup` ou `attack`, o marcador sobre a cabeça dele SHALL estar visível com o frame de nome igual ao tipo do golpe.
8. HGT-08: WHILE a IA de um inimigo comum está em `chase`, `hold`, `approach` ou `rest`, o marcador dele SHALL estar invisível (`telegraph` igual a `null`).
9. HGT-09: WHEN a folha do marcador é lida THEN ela SHALL ter os frames `white`, `red` e `low`, com o conjunto de texels opacos diferente em cada par de frames.
10. HGT-10: WHEN o chefe dispara um projétil da rajada THEN o `Hit` do projétil SHALL ter `height` igual a `high`.
11. HGT-11: WHEN o chefe cria a onda de choque do pouso THEN o `Hit` da onda SHALL ter `height` igual a `low`.
12. HGT-12: WHEN o chefe acerta com a investida ou com o pouso do salto THEN o `Hit` SHALL não ter `height`.
13. HGT-13: WHERE a URL tem `?debug&enemyAttack=` com `white`, `red` ou `low`, todo inimigo comum SHALL usar esse tipo de golpe no lugar do resultado de `attackKindFor`.

**Independent Test**: `?debug&enemyVariant=rastejante&maxAlive=1`: no preparo aparece o `▼` âmbar; com `enemyAttack=red`, o `×` carmim.

---

### P1: Ponto de compromisso ⭐ MVP

**User Story**: Como jogador, quero que o inimigo que já decidiu atacar ataque mesmo apanhando, para eu ter de defender em vez de atropelar no botão.

**Why P1**: É a regra que tira o valor do button mashing.

**Acceptance Criteria**:

1. CMT-01: WHEN faltam 200 ms ou menos do `windup` de um inimigo comum THEN `committed` SHALL ser `true` até o último golpe da sequência fechar a hitbox ou o ataque ser cancelado.
2. CMT-02: WHEN um inimigo comum fica comprometido THEN o sprite dele SHALL piscar em cor sólida por 80 ms, na cor `w` para `white`, `t` para `red` e `A` para `low` (`commitFlash`).
3. CMT-03: WHILE um inimigo comum está em `windup` com mais de 200 ms pela frente, WHEN ele aceita um golpe `light` THEN a hitbox do golpe pendente SHALL não abrir.
4. CMT-04: WHILE um inimigo comum está comprometido, WHEN ele aceita um golpe que não derruba, não mata, não quebra a postura e não é um Contra THEN o cérebro dele SHALL continuar em `idle`.
5. CMT-05: WHILE um inimigo comum está comprometido, WHEN ele aceita um golpe que não derruba, não mata, não quebra a postura e não é um Contra THEN a hitbox do golpe pendente SHALL abrir no instante já previsto antes do golpe.
6. CMT-06: WHEN um inimigo comprometido aceita um golpe e continua em `idle` pelo CMT-04 THEN `events` SHALL ganhar exatamente um `armored:<id>` por golpe.
7. CMT-07: WHILE um inimigo comum está comprometido, WHEN ele aceita um golpe que derruba THEN a hitbox do golpe pendente SHALL não abrir.
8. CMT-08: WHILE um inimigo comum está comprometido, WHEN a postura dele chega a 100 THEN a hitbox do golpe pendente SHALL não abrir.
9. CMT-09: WHILE um inimigo comum está comprometido, WHEN ele aceita um Contra THEN a hitbox do golpe pendente SHALL não abrir.
10. CMT-10: WHILE um inimigo comum está comprometido, ele SHALL não levantar a guarda.

**Independent Test**: `?debug&maxAlive=1&enemyGuard=0`: um `jab` depois do flash tira 6 de vida e a garra sai do mesmo jeito; um `jab` antes do flash cancela o preparo.

---

### P1: Limite de alvos por golpe ⭐ MVP

**User Story**: Como jogador, quero que cada golpe acerte um número limitado de inimigos, para o posicionamento importar e eu não bater em três de uma vez.

**Why P1**: "Bato e os 3 apanham" foi a reclamação direta do usuário (AD-015).

**Acceptance Criteria**:

1. TGT-01: WHEN `MOVES` é lido THEN todo golpe `light`, a `voadora`, a `rasteira`, o `contra` e o `contraGancho` SHALL ter `maxTargets` igual a 1.
2. TGT-02: WHEN `MOVES` é lido THEN todo golpe `heavy` que não é `voadora`, `rasteira`, `contra` nem `contraGancho` SHALL ter `maxTargets` igual a 2.
3. TGT-03: WHEN a hitbox de um golpe do jogador toca, numa mesma abertura, mais alvos do que o `maxTargets` do golpe THEN no máximo `maxTargets` alvos SHALL aceitar ou bloquear esse golpe.
4. TGT-04: WHEN, no mesmo passo de física, tocam a hitbox mais alvos do que as vagas que sobram THEN as vagas SHALL ir para os alvos de menor `|x do alvo − x do jogador|`, medido entre os centros dos corpos nesse passo; em empate, para o de menor id.
5. TGT-05: IF um alvo recusa o golpe (morto, levantando ou no limite do chão) THEN outro alvo que toque a mesma abertura SHALL ainda poder receber o golpe.
6. TGT-06: WHEN um golpe com `maxTargets` igual a 1 é segurado pela guarda de um inimigo comum THEN nenhum outro alvo SHALL receber esse golpe naquela abertura.
7. TGT-07: WHEN o objeto na mão é balançado THEN no máximo 2 alvos SHALL receber o golpe naquele balanço.

**Independent Test**: `?debug&maxAlive=3&enemyGuard=0` com 3 inimigos empilhados: um `jab` tira vida de 1 e um `chuteFrontal` de 2.

---

### P1: Cambaleio, queda e troca de alvo ⭐ MVP

**User Story**: Como jogador, quero que derrubar um inimigo dependa do golpe certo ou de quebrar a postura dele, para a postura ser a barra que importa.

**Why P1**: Acaba com o ragdoll em todo golpe forte, que deixava a luta sem leitura.

**Acceptance Criteria**:

1. PST-01: WHEN um inimigo comum não quebrado e não comprometido sobrevive a um golpe `heavy` que não derruba THEN o cérebro dele SHALL entrar em `stagger` por 380 ms.
2. PST-02: WHILE o cérebro de um inimigo comum está em `stagger`, ele SHALL não ter ragdoll (`ragdollVisible` igual a `null`).
3. PST-03: WHEN os 380 ms do `stagger` terminam sem novo golpe THEN o cérebro SHALL voltar a `idle`.
4. PST-04: WHEN `MOVES` é lido THEN `knockdown` SHALL ser `true` em `rasteira`, `ganchoAscendente` e `palmaExplosiva`, e ausente nos outros golpes.
5. PST-05: WHEN um inimigo comum não quebrado sobrevive a um golpe com `knockdown: true` THEN o cérebro dele SHALL entrar em `ragdollStun`.
6. PST-06: WHEN o finalizador (`J`+`K`, FIN-01) é aceito por um inimigo comum quebrado que sobrevive THEN o cérebro dele SHALL entrar em `ragdollStun`.
7. PST-07: WHEN um objeto arremessado é aceito por um inimigo comum não quebrado que sobrevive THEN o cérebro dele SHALL entrar em `ragdollStun`.
8. PST-08: WHEN um objeto balançado na mão é aceito por um inimigo comum não quebrado e não comprometido que sobrevive THEN o cérebro dele SHALL entrar em `stagger`.
9. PST-09: WHEN um golpe `heavy` de técnica é aceito por um inimigo comum não quebrado que sobrevive THEN o cérebro dele SHALL entrar em `ragdollStun`.
10. PST-10: WHILE o cérebro está em `stagger`, WHEN um golpe `light` é aceito THEN o estado SHALL continuar `stagger`, com `max(tempo que faltava, 220)` ms pela frente.
11. PST-11: WHILE o cérebro está em `stagger`, WHEN um golpe `heavy` que não derruba é aceito THEN o `stagger` SHALL ter de novo 380 ms pela frente.
12. PST-12: WHEN o golpe forte de teste do debug (tecla 2) é aceito por um inimigo comum não quebrado que sobrevive THEN o cérebro dele SHALL entrar em `ragdollStun`.
13. PST-13: WHEN um golpe corpo a corpo ou de objeto do jogador é aceito por um inimigo comum THEN `focusId` SHALL ser o id desse inimigo.
14. PST-14: WHILE o id de um inimigo comum é diferente de `focusId` e passaram 1500 ms de jogo desde o último ganho de postura dele, a postura dele SHALL cair 40 por segundo de jogo até 0.
15. PST-15: WHEN o jogador perde hp por um golpe cheio THEN todo golpe que chegar nos 300 ms de jogo seguintes SHALL ser recusado, e um golpe que chegar depois disso SHALL ser aceito.
16. PST-16: WHILE o id de um inimigo comum é igual a `focusId` e passaram 1500 ms de jogo desde o último ganho de postura dele, a postura dele SHALL cair 10 por segundo de jogo até 0.

**Independent Test**: `?debug&maxAlive=1&enemyGuard=0`: `chuteFrontal` deixa o inimigo em `stagger` sem ragdoll; `rasteira` derruba.

---

### P1: Inimigo no chão leva um golpe só ⭐ MVP

**User Story**: Como jogador, quero que um inimigo caído receba no máximo um golpe e se levante protegido, para a luta não virar bater em quem está no chão.

**Why P1**: É metade da correção do spam de voadora (AD-015).

**Acceptance Criteria**:

1. GND-01: WHILE o cérebro está em `ragdollStun`, WHEN chega o primeiro golpe que não é de técnica THEN o hp do inimigo SHALL cair o `damage` do `Hit`.
2. GND-02: IF um segundo golpe que não é de técnica chega durante o mesmo `ragdollStun` THEN ele SHALL ser recusado e o hp SHALL não mudar.
3. GND-03: WHILE o cérebro está em `gettingUp`, todo golpe que não é de técnica SHALL ser recusado.
4. GND-04: WHILE o cérebro está em `ragdollStun` ou `gettingUp`, todo golpe de técnica SHALL ser aceito.
5. GND-05: WHEN o cérebro entra em `ragdollStun` vindo de outro estado THEN `downHits` SHALL ser 0.
6. GND-06: WHEN o primeiro golpe no chão é aceito THEN o tempo que falta do `ragdollStun` SHALL não aumentar.
7. GND-07: WHEN um golpe de técnica é aceito por um inimigo em `ragdollStun` THEN `downHits` dele SHALL não mudar.

**Independent Test**: `?debug&maxAlive=1&enemyGuard=0`: `rasteira` derruba; o primeiro `socoBaixo` no chão tira 6 de vida e o segundo não tira nada.

---

### P1: Voadora com custo e quique ⭐ MVP

**User Story**: Como jogador, quero que a voadora sirva para encurtar a distância até um alvo, com custo e risco, para ela deixar de ser o golpe que resolve tudo.

**Why P1**: O spam de voadora foi citado pelo usuário como o problema central.

**Acceptance Criteria**:

1. VOA-01: WHEN a `voadora` começa THEN a postura do jogador SHALL subir 15.
2. VOA-02: IF o custo da `voadora` leva a postura do jogador a 100 THEN `events` SHALL ganhar um `guardBreak:player`.
3. VOA-03: IF o custo da `voadora` leva a postura do jogador a 100 THEN `player.move` SHALL ser `null` nesse frame.
4. VOA-04: WHEN a `voadora` é aceita por um alvo THEN a fase `active` dela SHALL terminar nesse frame.
5. VOA-05: WHEN a `voadora` é aceita por um alvo THEN o jogador SHALL recuar 36 px (±4 px) no sentido oposto a `player.facing`, nos 150 ms seguintes.
6. VOA-06: WHEN a `voadora` é aceita por um alvo THEN a velocidade vertical do jogador SHALL ser −240 px/s nesse frame.
7. VOA-07: WHEN a fase `active` da `voadora` termina sem nenhum alvo aceitar o golpe THEN a `recovery` dela SHALL durar 460 ms.
8. VOA-08: WHEN a fase `active` da `voadora` termina sem nenhum alvo aceitar o golpe THEN `events` SHALL ganhar exatamente um `whiff:voadora`.
9. VOA-09: WHEN a `voadora` é aceita por um alvo THEN a `recovery` dela SHALL durar 160 ms.

**Independent Test**: `?debug&maxAlive=4&enemyGuard=0`: a voadora acerta 1 inimigo, o jogador quica para trás e a barra de postura sobe 15; errando, ele fica 460 ms sem poder agir.

---

### P1: Tabela de defesa ⭐ MVP

**User Story**: Como jogador, quero que cada defesa sirva para um tipo de golpe e tenha um custo, para a habilidade aparecer na escolha e no tempo da defesa.

**Why P1**: É o "responder" do loop; sem ela a leitura não muda nada.

**Acceptance Criteria**:

1. DEF-01: IF um golpe chega com a janela de parry aberta e o centro do atacante do lado oposto a `player.facing` THEN o jogador SHALL perder exatamente o `damage` do `Hit`.
2. DEF-02: IF um golpe `unblockable` chega com a janela de parry aberta e o atacante à frente THEN o jogador SHALL perder exatamente o `damage` do `Hit`.
3. DEF-03: IF um golpe `low` chega com `player.guard` igual a `guard`, o atacante à frente e o jogador no chão THEN o jogador SHALL perder exatamente o `damage` do `Hit`.
4. DEF-04: WHILE `player.guard` é `guard` ou `parry`, WHEN só uma direção horizontal está segurada THEN `player.facing` SHALL ser 1 para a direita e −1 para a esquerda.
5. DEF-05: WHILE `player.guard` é `guard` ou `parry` e o jogador parte do repouso, segurar uma direção horizontal por 500 ms SHALL mover o jogador menos de 4 px.
6. DEF-06: WHEN `U` e a direção oposta a `player.facing` são apertadas no mesmo frame e um golpe `white` chega desse lado em até 150 ms THEN `events` SHALL ganhar um `parry`.
7. DEF-07: WHEN `Q` é apertada com `S` segurada, o jogador no chão, sem recarga, golpe, conjuração nem atordoamento THEN `player.duck.active` SHALL ser `true` pelos 320 ms de jogo seguintes.
8. DEF-08: WHEN um abaixar começa THEN `events` SHALL ganhar exatamente um `duck`.
9. DEF-09: WHILE `player.duck.active` é `true`, `player.frame` SHALL ser `duck`.
10. DEF-10: WHILE `player.duck.active` é `true`, a velocidade horizontal do jogador SHALL ser 0.
11. DEF-11: WHILE `player.duck.active` é `true`, um golpe com `height` igual a `high` SHALL causar 0 de dano ao jogador.
12. DEF-12: WHEN o primeiro golpe `high` de um abaixar é evitado THEN `events` SHALL ganhar exatamente um `duckEvade` para esse abaixar, mesmo que outros golpes `high` cheguem nele.
13. DEF-13: WHEN `events` ganha um `duckEvade` THEN a postura do jogador SHALL cair 10, parando em 0.
14. DEF-14: WHILE `player.duck.active` é `true`, um golpe `low` ou sem `height` SHALL tirar do jogador exatamente o `damage` do `Hit`.
15. DEF-15: WHEN um abaixar começa THEN `Q` SHALL não iniciar esquiva nem abaixar nos 450 ms de jogo seguintes.
16. DEF-16: IF `Q` é apertada com `S` segurada e o jogador fora do chão THEN `events` SHALL não ganhar `duck` nem `dodge`.
17. DEF-17: WHEN um golpe `low` chega com o jogador fora do chão THEN o jogador SHALL levar 0 de dano.
18. DEF-18: WHEN um golpe `low` é evitado pelo DEF-17 THEN `events` SHALL ganhar exatamente um `jumpEvade`.
19. DEF-19: WHEN `events` ganha um `perfectDodge` THEN a postura do jogador SHALL cair 10, parando em 0.
20. DEF-20: WHEN um golpe chega ao jogador THEN o desfecho SHALL ser o primeiro válido desta lista, nesta ordem: parry (janela aberta, atacante à frente, golpe sem `unblockable`); esquiva invencível; Contra em `startup` ou `active`; abaixado com golpe `high`; fora do chão com golpe `low`; bloqueio (guarda de pé, atacante à frente, golpe sem `unblockable`); golpe cheio.
21. DEF-21: WHEN o painel de controles é mostrado THEN o texto dele SHALL conter uma linha com `S+Q` e `abaixar`.
22. DEF-22: IF `Q` é apertada com `S` e uma direção horizontal seguradas, no chão e sem recarga THEN `events` SHALL ganhar `duck` e não `dodge`.

**Independent Test**: `?debug&maxAlive=1&enemyAttack=red`: bloquear leva o dano cheio, abaixar no flash leva 0 e a postura cai 10. Com `enemyAttack=low`, pular evita.

---

### P1: Janela de Contra ⭐ MVP

**User Story**: Como jogador, quero um contra-ataque garantido depois de uma defesa bem feita, para a defesa ser o caminho para o dano e para quebrar a postura.

**Why P1**: É o "punir" do loop e a recompensa que justifica aprender a defender.

**Acceptance Criteria**:

1. CNT-01: WHEN `events` ganha um `parry` sem `deflect` no mesmo frame THEN `player.counter` SHALL ficar `open` por 450 ms de jogo, com `kind` igual a `contra`.
2. CNT-02: WHEN `events` ganha um `perfectDodge` THEN `player.counter` SHALL ficar `open` por 450 ms de jogo, com `kind` igual a `contra`.
3. CNT-03: WHEN `events` ganha um `duckEvade` THEN `player.counter` SHALL ficar `open` por 450 ms de jogo, com `kind` igual a `contraGancho`.
4. CNT-04: WHEN `events` ganha um `deflect` THEN `player.counter` SHALL ficar `open` por 900 ms de jogo, com `kind` igual a `contra`.
5. CNT-05: WHILE `player.counter.open` é `true` e o jogador está no chão, sem golpe em curso e de mãos vazias, WHEN `J` ou `K` é apertada THEN `player.move` SHALL ser o `kind` da janela.
6. CNT-06: WHEN um Contra começa THEN `player.counter.open` SHALL ser `false`.
7. CNT-07: WHEN `J` ou `K` é apertada com a janela aberta e uma esquiva ou um abaixar ainda ativo THEN o Contra SHALL começar no primeiro frame em que a esquiva e o abaixar já não estão ativos, se a janela ainda estiver aberta nesse frame.
8. CNT-08: IF `J` é apertada no chão, sem direção, com `player.counter.open` igual a `false` THEN `player.move` SHALL ser `jab`.
9. CNT-09: WHEN `MOVES` é lido THEN `contra` SHALL ter `damage` 10, `strength` `heavy`, `startupMs` 50, `activeMs` 80, `recoveryMs` 160, `structureGain` 30, e `unblockable` e `counter` iguais a `true`.
10. CNT-10: WHEN `MOVES` é lido THEN `contraGancho` SHALL ter `damage` 12, `strength` `heavy`, `startupMs` 50, `activeMs` 90, `recoveryMs` 200, `structureGain` 30, e `unblockable` e `counter` iguais a `true`.
11. CNT-11: WHILE um Contra está em `startup` ou `active`, um golpe que chega ao jogador SHALL causar 0 de dano.
12. CNT-12: WHILE um Contra está em `startup` ou `active`, um golpe que chega ao jogador SHALL não cancelar o Contra (`player.move` continua o mesmo).
13. CNT-13: WHEN um novo `parry`, `perfectDodge` ou `duckEvade` acontece com a janela aberta THEN `player.counter` SHALL passar a ter o `kind` e a duração inteira do novo evento, descartando o tempo que faltava.
14. CNT-14: WHILE `player.counter.open` é `true`, `fx.layers` SHALL incluir `counter.ready`.
15. CNT-15: WHEN a janela de Contra abre THEN `floatTexts` SHALL ganhar um texto `CONTRA` a menos de 40 px do centro do jogador.
16. CNT-16: WHILE `player.counter.open` é `true` e o jogador segura um objeto, WHEN `J` ou `K` é apertada THEN nenhum Contra SHALL começar (`player.move` continua `null`).
17. CNT-17: WHEN a folha do jogador é lida THEN ela SHALL ter os frames `duck`, `contra-wind`, `contra-hit`, `contra-recover`, `contraGancho-wind`, `contraGancho-hit` e `contraGancho-recover`.
18. CNT-18: WHILE `player.counter.open` é `true`, WHEN `J` é apertada com `S` segurada no chão THEN `player.move` SHALL ser o `kind` da janela.
19. CNT-19: WHILE `player.counter.open` é `true` e o jogador está fora do chão, WHEN `J` é apertada THEN `player.move` SHALL ser `socoAereo`.
20. CNT-20: WHILE o jogo está em hitstop, `player.counter.remainingMs` SHALL não diminuir.
21. CNT-21: WHEN um Contra é aceito por um inimigo comum que sobrevive e não fica quebrado THEN o cérebro dele SHALL entrar em `stagger` por 380 ms, esteja ele comprometido ou não.

**Independent Test**: `?debug&maxAlive=1&enemyAttack=white`: parry no flash, `J` em seguida sai `contra`, o inimigo cambaleia e ganha 35 + 30 de postura.

---

### P2: Sequências do inimigo e Deflexão

**User Story**: Como jogador, quero ser recompensado por aparar todos os golpes de uma sequência, para dominar o ritmo do inimigo valer mais do que um parry isolado.

**Why P2**: Depende da janela de Contra e só aparece contra inimigo com faca; o loop básico funciona sem ela.

**Acceptance Criteria**:

1. DFL-01: WHEN um inimigo comum com `cursedKnife` ataca THEN a sequência dele SHALL ter 2 golpes; sem `cursedKnife`, 1 golpe.
2. DFL-02: WHEN a fase `attack` de um golpe que não é o último da sequência termina THEN a hitbox do golpe seguinte SHALL abrir 300 ms de jogo depois.
3. DFL-03: WHILE um inimigo comum está entre dois golpes de uma sequência, a IA dele SHALL estar em `windup`.
4. DFL-04: WHEN a fase `attack` do último golpe da sequência termina THEN a IA SHALL entrar em `rest`.
5. DFL-05: WHEN o golpe seguinte de uma sequência abre a hitbox THEN ele SHALL poder acertar o jogador, mesmo que o golpe anterior da sequência já o tenha acertado.
6. DFL-06: WHEN a IA volta a `windup` entre dois golpes de uma sequência THEN ela SHALL não emitir `windupStart`.
7. DFL-07: WHEN um golpe que não é o último da sequência é aparado THEN a postura do inimigo SHALL subir 35.
8. DFL-08: WHEN um golpe que não é o último da sequência é aparado THEN a hitbox do golpe seguinte SHALL abrir 300 ms de jogo depois do fim da fase `attack` do golpe aparado, como no DFL-02.
9. DFL-09: WHEN o último golpe de uma sequência é aparado sem `deflect` THEN o inimigo SHALL ficar 400 ms sem atacar nem andar.
10. DFL-10: WHEN o último golpe de uma sequência de 2 ou mais golpes é aparado e todos os golpes anteriores dela também foram aparados THEN `events` SHALL ganhar exatamente um `deflect`.
11. DFL-11: WHEN `events` ganha um `deflect` THEN o cérebro do inimigo aparado SHALL entrar em `stagger` por 900 ms.
12. DFL-12: IF algum golpe anterior da sequência não foi aparado THEN o parry do último golpe SHALL não gerar `deflect`.
13. DFL-13: WHEN `events` ganha um `deflect` THEN `floatTexts` SHALL ganhar um texto `DEFLEXÃO` a menos de 40 px do centro do jogador.
14. DFL-14: WHERE a URL tem `?debug&enemyString=N` com N inteiro de 1 a 4, a sequência de todo inimigo comum SHALL ter N golpes.
15. DFL-15: WHILE a IA está em `windup` ou `attack`, `enemies[].attack` SHALL mostrar `index` igual à posição do golpe atual (a partir de 1) e `length` igual ao tamanho da sequência.
16. DFL-16: IF a sequência tem 1 golpe THEN aparar esse golpe SHALL não gerar `deflect`.

**Independent Test**: `?debug&maxAlive=1&enemyString=3&enemyAttack=white`: parry nos 3 golpes dá `deflect`, o inimigo cambaleia 900 ms e a janela de Contra dura 900 ms.

---

### P2: Leitura de repetição

**User Story**: Como jogador, quero que o inimigo aprenda o golpe que eu repito, para variar o combo ser obrigatório.

**Why P2**: Fecha a porta do golpe único repetido; o resto do loop funciona sem ela.

**Acceptance Criteria**:

1. RDG-01: WHEN um golpe do grafo começa THEN `reading.repeats` SHALL ser o número de inícios do mesmo golpe nos 3000 ms de jogo anteriores, sem contar o início atual.
2. RDG-02: WHEN o bônus de leitura é calculado THEN ele SHALL ser `min(0,25 × repeats, 1)`.
3. RDG-03: WHEN o jogador inicia um golpe do grafo virado para um inimigo comum elegível para guarda a até `80 + travel.forwardPx` px na horizontal THEN esse inimigo SHALL levantar a guarda com probabilidade `min(base + bônus de leitura, 1)`, onde `base` é a chance do EBL-01 se as condições do EBL-01 valem e 0 se não valem.
4. RDG-04: IF a probabilidade do RDG-03 é 0 THEN nenhum sorteio SHALL ser feito no stream de guarda da run.
5. RDG-05: WHEN a guarda sobe com bônus de leitura acima de 0 THEN `events` SHALL ganhar exatamente um `read:<id>`.
6. RDG-06: WHILE um inimigo está com a guarda de leitura, WHEN um golpe `heavy` sem `unblockable` chega de frente THEN o dano SHALL ser 0.
7. RDG-07: WHILE um inimigo está com a guarda de leitura, WHEN um golpe `heavy` sem `unblockable` chega de frente THEN a postura do inimigo SHALL subir 8.
8. RDG-08: WHILE um inimigo está com a guarda de leitura, WHEN um golpe `heavy` sem `unblockable` chega de frente THEN a guarda SHALL terminar nesse frame.
9. RDG-09: WHEN a guarda de leitura sobe com o cérebro em `hitstun` ou `stagger` THEN o cérebro SHALL voltar a `idle` nesse frame.
10. RDG-10: WHERE a URL tem `?debug&enemyGuard=N`, a probabilidade do RDG-03 SHALL ser N quando as condições do EBL-01 valem e 0 quando não valem, sem somar o bônus de leitura.
11. RDG-11: WHEN um Contra ou o finalizador começa THEN ele SHALL não entrar no histórico de leitura (`reading` não muda).
12. RDG-12: WHEN um Contra ou o finalizador começa THEN nenhum inimigo SHALL sortear a guarda por causa dele.
13. RDG-13: WHEN um golpe `light` corpo a corpo é aceito por um inimigo comum até 1500 ms de jogo depois do golpe `light` anterior aceito por ele THEN `lightStreak` dele SHALL subir 1.
14. RDG-14: WHEN um golpe `light` corpo a corpo é aceito por um inimigo comum mais de 1500 ms de jogo depois do golpe `light` anterior aceito por ele THEN `lightStreak` dele SHALL ser 1.
15. RDG-15: WHEN um golpe `heavy` do jogador é aceito por um inimigo comum THEN `lightStreak` dele SHALL ser 0.
16. RDG-16: WHEN um golpe `light` aceito leva `lightStreak` a 4 ou mais e o inimigo não está comprometido, quebrado nem em ragdoll THEN o inimigo SHALL sortear o empurrão com probabilidade 0,35 no stream de guarda da run.
17. RDG-17: WHEN um inimigo empurra o jogador THEN `events` SHALL ganhar exatamente um `shove:<id>`.
18. RDG-18: WHEN um inimigo empurra o jogador THEN `lightStreak` dele SHALL ser 0.
19. RDG-19: WHEN um inimigo empurra o jogador THEN o jogador SHALL se deslocar 48 px (±4 px) para longe do inimigo nos 150 ms seguintes, sem perder hp.
20. RDG-20: WHEN um inimigo empurra o jogador THEN o golpe em curso do jogador SHALL ser cancelado (`player.move` igual a `null`).
21. RDG-21: WHEN um inimigo empurra o jogador THEN o input do jogador SHALL ser ignorado pelos 300 ms de jogo seguintes.
22. RDG-22: WHEN um inimigo empurra o jogador THEN o cérebro do inimigo SHALL estar em `idle` nesse frame.
23. RDG-23: WHERE a URL tem `?debug&shove=N`, o sorteio do RDG-16 SHALL usar N como probabilidade (1 sempre empurra, 0 nunca).

**Independent Test**: `?debug&maxAlive=1` (sem `enemyGuard`): o 5º `chuteFrontal` seguido em 3 s é bloqueado (`read:<id>`). Com `shove=1`, o 4º `socoBaixo` seguido empurra o jogador.

---

## Edge Cases

**Acceptance Criteria**:

1. EDG-01: WHEN uma run começa THEN `player.counter.open` SHALL ser `false`.
2. EDG-02: WHEN uma run começa THEN `player.duck.active` SHALL ser `false`.
3. EDG-03: WHEN uma run começa THEN o histórico de leitura SHALL estar vazio (`reading.move` igual a `null`).
4. EDG-04: WHEN uma run começa THEN `focusId` SHALL ser `null`.
5. EDG-05: IF um inimigo morre, é derrubado, quebra ou leva um Contra no meio de uma sequência THEN nenhum golpe seguinte dessa sequência SHALL abrir hitbox.
6. EDG-06: IF um golpe `high` chega 320 ms de jogo ou mais depois do início do abaixar, sem outra defesa ativa THEN o jogador SHALL perder exatamente o `damage` do `Hit`.
7. EDG-07: IF o jogador morre com a janela de Contra aberta THEN `player.counter.open` SHALL ser `false`.
8. EDG-08: IF `enemyAttack` tem valor diferente de `white`, `red` e `low` THEN o parâmetro SHALL ser ignorado e valer o resultado de `attackKindFor`.
9. EDG-09: IF `enemyString` não é um inteiro de 1 a 4 THEN o parâmetro SHALL ser ignorado e valer a sequência do DFL-01.
10. EDG-10: IF a `voadora` é segurada pela guarda de um inimigo e nenhum alvo a aceita THEN a `recovery` dela SHALL durar 460 ms.
11. EDG-11: IF um inimigo comum quebrado aceita um golpe com `knockdown: true` que não é o finalizador THEN o cérebro dele SHALL não entrar em `ragdollStun`.

---

## Implicit-requirement dimensions sweep

| Dimensão | Resultado |
| --- | --- |
| Input validation & bounds | EDG-08, EDG-09 (parâmetros de debug); DEF-13, DEF-19 (postura para em 0); RDG-02 (bônus com teto 1); TGT-03 (teto de alvos) |
| Failure / partial-failure states | DEF-01, DEF-02, DEF-03, DEF-14 (defesa errada leva o golpe cheio); VOA-07 (voadora que erra); DFL-12 (sequência não aparada inteira); CNT-08 (janela fechada) |
| Idempotency / duplicate handling | DEF-12 (um `duckEvade` por abaixar); CMT-06 (um `armored` por golpe); GND-02 (segundo golpe no chão recusado); DFL-10 (um `deflect`); CNT-06 (um Contra por janela) |
| Auth boundaries & rate limits | N/A because é um jogo local de um jogador; os limites de uso são a recarga dividida da esquiva e do abaixar (DEF-15) e a janela de Contra |
| Concurrency / ordering | DEF-20 (ordem das defesas); TGT-04 (ordem dos alvos no mesmo passo); CNT-13 (janela reaberta); RDG-04 (stream de sorteio não consumido com chance 0) |
| Data lifecycle / expiry | RDG-01 (janela de 3000 ms); RDG-13, RDG-14 (sequência de leves expira em 1500 ms); PST-14, PST-16 (queda da postura); EDG-01..04 (zera na run nova); EDG-07 |
| Observability | Seção "Snapshot de debug": todo estado citado num AC é lido do objeto vivo (L-030, L-055) |
| External-dependency failure | N/A because nenhuma dependência externa em runtime |
| State-transition integrity | CMT-01..10 (compromisso), PST-01..12 (`stagger`, `ragdollStun`), GND-01..07, DFL-02..04, EDG-05 |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| HGT-01 | P1: Ler o golpe inimigo | Specify | Pending |
| HGT-02 | P1: Ler o golpe inimigo | Specify | Pending |
| HGT-03 | P1: Ler o golpe inimigo | Specify | Pending |
| HGT-04 | P1: Ler o golpe inimigo | Specify | Pending |
| HGT-05 | P1: Ler o golpe inimigo | Specify | Pending |
| HGT-06 | P1: Ler o golpe inimigo | Specify | Pending |
| HGT-07 | P1: Ler o golpe inimigo | Specify | Pending |
| HGT-08 | P1: Ler o golpe inimigo | Specify | Pending |
| HGT-09 | P1: Ler o golpe inimigo | Specify | Pending |
| HGT-10 | P1: Ler o golpe inimigo | Specify | Pending |
| HGT-11 | P1: Ler o golpe inimigo | Specify | Pending |
| HGT-12 | P1: Ler o golpe inimigo | Specify | Pending |
| HGT-13 | P1: Ler o golpe inimigo | Specify | Pending |
| CMT-01 | P1: Ponto de compromisso | Specify | Pending |
| CMT-02 | P1: Ponto de compromisso | Specify | Pending |
| CMT-03 | P1: Ponto de compromisso | Specify | Pending |
| CMT-04 | P1: Ponto de compromisso | Specify | Pending |
| CMT-05 | P1: Ponto de compromisso | Specify | Pending |
| CMT-06 | P1: Ponto de compromisso | Specify | Pending |
| CMT-07 | P1: Ponto de compromisso | Specify | Pending |
| CMT-08 | P1: Ponto de compromisso | Specify | Pending |
| CMT-09 | P1: Ponto de compromisso | Specify | Pending |
| CMT-10 | P1: Ponto de compromisso | Specify | Pending |
| TGT-01 | P1: Limite de alvos | Specify | Pending |
| TGT-02 | P1: Limite de alvos | Specify | Pending |
| TGT-03 | P1: Limite de alvos | Specify | Pending |
| TGT-04 | P1: Limite de alvos | Specify | Pending |
| TGT-05 | P1: Limite de alvos | Specify | Pending |
| TGT-06 | P1: Limite de alvos | Specify | Pending |
| TGT-07 | P1: Limite de alvos | Specify | Pending |
| PST-01 | P1: Cambaleio e queda | Specify | Pending |
| PST-02 | P1: Cambaleio e queda | Specify | Pending |
| PST-03 | P1: Cambaleio e queda | Specify | Pending |
| PST-04 | P1: Cambaleio e queda | Specify | Pending |
| PST-05 | P1: Cambaleio e queda | Specify | Pending |
| PST-06 | P1: Cambaleio e queda | Specify | Pending |
| PST-07 | P1: Cambaleio e queda | Specify | Pending |
| PST-08 | P1: Cambaleio e queda | Specify | Pending |
| PST-09 | P1: Cambaleio e queda | Specify | Pending |
| PST-10 | P1: Cambaleio e queda | Specify | Pending |
| PST-11 | P1: Cambaleio e queda | Specify | Pending |
| PST-12 | P1: Cambaleio e queda | Specify | Pending |
| PST-13 | P1: Cambaleio e queda | Specify | Pending |
| PST-14 | P1: Cambaleio e queda | Specify | Pending |
| PST-15 | P1: Cambaleio e queda | Specify | Pending |
| PST-16 | P1: Cambaleio e queda | Specify | Pending |
| GND-01 | P1: Inimigo no chão | Specify | Pending |
| GND-02 | P1: Inimigo no chão | Specify | Pending |
| GND-03 | P1: Inimigo no chão | Specify | Pending |
| GND-04 | P1: Inimigo no chão | Specify | Pending |
| GND-05 | P1: Inimigo no chão | Specify | Pending |
| GND-06 | P1: Inimigo no chão | Specify | Pending |
| GND-07 | P1: Inimigo no chão | Specify | Pending |
| VOA-01 | P1: Voadora | Specify | Pending |
| VOA-02 | P1: Voadora | Specify | Pending |
| VOA-03 | P1: Voadora | Specify | Pending |
| VOA-04 | P1: Voadora | Specify | Pending |
| VOA-05 | P1: Voadora | Specify | Pending |
| VOA-06 | P1: Voadora | Specify | Pending |
| VOA-07 | P1: Voadora | Specify | Pending |
| VOA-08 | P1: Voadora | Specify | Pending |
| VOA-09 | P1: Voadora | Specify | Pending |
| DEF-01 | P1: Tabela de defesa | Specify | Pending |
| DEF-02 | P1: Tabela de defesa | Specify | Pending |
| DEF-03 | P1: Tabela de defesa | Specify | Pending |
| DEF-04 | P1: Tabela de defesa | Specify | Pending |
| DEF-05 | P1: Tabela de defesa | Specify | Pending |
| DEF-06 | P1: Tabela de defesa | Specify | Pending |
| DEF-07 | P1: Tabela de defesa | Specify | Pending |
| DEF-08 | P1: Tabela de defesa | Specify | Pending |
| DEF-09 | P1: Tabela de defesa | Specify | Pending |
| DEF-10 | P1: Tabela de defesa | Specify | Pending |
| DEF-11 | P1: Tabela de defesa | Specify | Pending |
| DEF-12 | P1: Tabela de defesa | Specify | Pending |
| DEF-13 | P1: Tabela de defesa | Specify | Pending |
| DEF-14 | P1: Tabela de defesa | Specify | Pending |
| DEF-15 | P1: Tabela de defesa | Specify | Pending |
| DEF-16 | P1: Tabela de defesa | Specify | Pending |
| DEF-17 | P1: Tabela de defesa | Specify | Pending |
| DEF-18 | P1: Tabela de defesa | Specify | Pending |
| DEF-19 | P1: Tabela de defesa | Specify | Pending |
| DEF-20 | P1: Tabela de defesa | Specify | Pending |
| DEF-21 | P1: Tabela de defesa | Specify | Pending |
| DEF-22 | P1: Tabela de defesa | Specify | Pending |
| CNT-01 | P1: Janela de Contra | Specify | Pending |
| CNT-02 | P1: Janela de Contra | Specify | Pending |
| CNT-03 | P1: Janela de Contra | Specify | Pending |
| CNT-04 | P1: Janela de Contra | Specify | Pending |
| CNT-05 | P1: Janela de Contra | Specify | Pending |
| CNT-06 | P1: Janela de Contra | Specify | Pending |
| CNT-07 | P1: Janela de Contra | Specify | Pending |
| CNT-08 | P1: Janela de Contra | Specify | Pending |
| CNT-09 | P1: Janela de Contra | Specify | Pending |
| CNT-10 | P1: Janela de Contra | Specify | Pending |
| CNT-11 | P1: Janela de Contra | Specify | Pending |
| CNT-12 | P1: Janela de Contra | Specify | Pending |
| CNT-13 | P1: Janela de Contra | Specify | Pending |
| CNT-14 | P1: Janela de Contra | Specify | Pending |
| CNT-15 | P1: Janela de Contra | Specify | Pending |
| CNT-16 | P1: Janela de Contra | Specify | Pending |
| CNT-17 | P1: Janela de Contra | Specify | Pending |
| CNT-18 | P1: Janela de Contra | Specify | Pending |
| CNT-19 | P1: Janela de Contra | Specify | Pending |
| CNT-20 | P1: Janela de Contra | Specify | Pending |
| CNT-21 | P1: Janela de Contra | Specify | Pending |
| DFL-01 | P2: Sequências e Deflexão | Specify | Pending |
| DFL-02 | P2: Sequências e Deflexão | Specify | Pending |
| DFL-03 | P2: Sequências e Deflexão | Specify | Pending |
| DFL-04 | P2: Sequências e Deflexão | Specify | Pending |
| DFL-05 | P2: Sequências e Deflexão | Specify | Pending |
| DFL-06 | P2: Sequências e Deflexão | Specify | Pending |
| DFL-07 | P2: Sequências e Deflexão | Specify | Pending |
| DFL-08 | P2: Sequências e Deflexão | Specify | Pending |
| DFL-09 | P2: Sequências e Deflexão | Specify | Pending |
| DFL-10 | P2: Sequências e Deflexão | Specify | Pending |
| DFL-11 | P2: Sequências e Deflexão | Specify | Pending |
| DFL-12 | P2: Sequências e Deflexão | Specify | Pending |
| DFL-13 | P2: Sequências e Deflexão | Specify | Pending |
| DFL-14 | P2: Sequências e Deflexão | Specify | Pending |
| DFL-15 | P2: Sequências e Deflexão | Specify | Pending |
| DFL-16 | P2: Sequências e Deflexão | Specify | Pending |
| RDG-01 | P2: Leitura de repetição | Specify | Pending |
| RDG-02 | P2: Leitura de repetição | Specify | Pending |
| RDG-03 | P2: Leitura de repetição | Specify | Pending |
| RDG-04 | P2: Leitura de repetição | Specify | Pending |
| RDG-05 | P2: Leitura de repetição | Specify | Pending |
| RDG-06 | P2: Leitura de repetição | Specify | Pending |
| RDG-07 | P2: Leitura de repetição | Specify | Pending |
| RDG-08 | P2: Leitura de repetição | Specify | Pending |
| RDG-09 | P2: Leitura de repetição | Specify | Pending |
| RDG-10 | P2: Leitura de repetição | Specify | Pending |
| RDG-11 | P2: Leitura de repetição | Specify | Pending |
| RDG-12 | P2: Leitura de repetição | Specify | Pending |
| RDG-13 | P2: Leitura de repetição | Specify | Pending |
| RDG-14 | P2: Leitura de repetição | Specify | Pending |
| RDG-15 | P2: Leitura de repetição | Specify | Pending |
| RDG-16 | P2: Leitura de repetição | Specify | Pending |
| RDG-17 | P2: Leitura de repetição | Specify | Pending |
| RDG-18 | P2: Leitura de repetição | Specify | Pending |
| RDG-19 | P2: Leitura de repetição | Specify | Pending |
| RDG-20 | P2: Leitura de repetição | Specify | Pending |
| RDG-21 | P2: Leitura de repetição | Specify | Pending |
| RDG-22 | P2: Leitura de repetição | Specify | Pending |
| RDG-23 | P2: Leitura de repetição | Specify | Pending |
| EDG-01 | Edge cases | Specify | Pending |
| EDG-02 | Edge cases | Specify | Pending |
| EDG-03 | Edge cases | Specify | Pending |
| EDG-04 | Edge cases | Specify | Pending |
| EDG-05 | Edge cases | Specify | Pending |
| EDG-06 | Edge cases | Specify | Pending |
| EDG-07 | Edge cases | Specify | Pending |
| EDG-08 | Edge cases | Specify | Pending |
| EDG-09 | Edge cases | Specify | Pending |
| EDG-10 | Edge cases | Specify | Pending |
| EDG-11 | Edge cases | Specify | Pending |

**Coverage:** 155 total, 155 mapped to tasks, 0 unmapped

---

## Success Criteria

- [ ] Smoke: 3 inimigos empilhados; o `jab` tira vida de 1 e o `chuteFrontal` de no máximo 2.
- [ ] Smoke: 10 s de voadora seguida contra 4 inimigos; nenhum entra em ragdoll sem estar morto, a leitura sobe (`read:<id>` aparece) e o jogador perde vida.
- [ ] Smoke: golpe pelas costas; parry sem virar leva o dano cheio e `U` + trás apara.
- [ ] Smoke: golpe `red` passa pela guarda e o abaixar evita; golpe `low` passa pela guarda e o pulo evita.
- [ ] Smoke: sequência de 3 golpes aparada inteira dá `deflect` e janela de Contra de 900 ms.
- [ ] Smoke: em 30 s de duelo com seed fixa, o bot que só aperta `J`/`K` perde mais vida do que o bot que apara no flash e dá o Contra.
- [ ] Os 30 smokes e os testes que já existiam passam, ajustados só onde um AC antigo foi substituído (tabela "ACs antigos substituídos").
- [ ] UAT do usuário em `dev`: a luta pede leitura e defesa, e a voadora deixou de resolver tudo.
