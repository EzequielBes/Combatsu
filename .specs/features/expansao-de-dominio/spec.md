# Expansão de domínio - Specification

## Problem Statement

O jogo não tem ultimate: a run inteira se joga com o moveset e duas técnicas, e nada recompensa o jogador por lutar
bem (parry, Kokusen, finalizador) com um momento que limpa a tela. Quem morre cedo nunca vê o Domínio, a peça mais
marcante de Jujutsu Kaisen. A F31 (`docs/plano-builds-e-habilidades.md`, linha F31 da seção 6, seções 3.1 "Baú do
Véu", 4 "Três faixas de acerto" e 5.6 "Expansão de Domínio") entrega a barra de Domínio carregada só pelo que o
jogador acerta, a tecla `P`/`N`, o Baú do Véu no fim da r3 e os três Domínios da leva 1: Santuário Malevolente,
Jackpot e Amplificação de Domínio. Nada é automático: o Domínio só sai quando o jogador aperta a tecla.

A F31 depende da F29 (`fundacao-de-poder`) e da F30 (`vermelho-e-corpo`) e usa o que elas entregam:
- F29: `core/statSheet.ts` e o `StatsDirector` (`this.s.stats`), donos únicos dos multiplicadores (o +25% do corpo a
  corpo da Amplificação Nv 3 entra por eles); `Hit.band` (`'chip' | 'micro'`) e `core/hitBand.ts` (os cortes do
  Santuário são `micro`, com o teto de 60 ms de hitstop por segundo); `game/DamageNumbers.ts` (`ui.damageNumbers`); o
  tipo de snapshot em arquivo à parte e o `StatsDirector.snapshotFields()`.
- F30: o `ChoicePanel` mínimo (`game/ChoicePanel.ts`, `ui.choicePanel`, páginas de 2 opções com `A`/`D` e `Enter`, aberto
  pelo `shopDirector` depois do `VowPanel` e antes da loja); as 4 cartas da loja e o `buySlot 0..3`; a inflação de 6%
  por rodada (PRC-03); a escala do inimigo (`DIFFICULTY.hpPerRound` 0,06, ESC-01) e o `hpMul` da rodada (ESC-02); a
  regra do prêmio do chefe no Vermelho (1 ponto no eixo-foco) e o `strikeEmitter` (só como referência: o Santuário não
  passa por ele).

Código de hoje que a F31 lê e não reescreve: `EnergyHud` (a barra nova fica embaixo da de energia), `TechCaster`
(teclas `L`/`C` e `I`/`V`, `JustDown`, eventos `techDenied:<motivo>`), `input.ts` (`PlayerInput`, `ShopInput`),
`runDirector` (reset da run, `bossRewardUpgrade` do BFX-09), `shopDirector` (ordem dos painéis), `CutFx` (`cut` e
`split`) e `core/cut.ts` / `game/tech/cut.ts` (a composição do acerto do Desmantelar: `light`, `force` 0, direção
`{x: 0, y: -1}`, `techMarks('light')`).

## Goals

- [ ] A barra de Domínio vai de 0 a 100, carrega só com acertos do jogador pela tabela da seção 5.6, e no ritmo de
      referência enche entre 40 e 60 s (teste puro).
- [ ] No fim da r3, todo jogador escolhe 1 de 2 Domínios no Baú do Véu e entra na r4 com a barra cheia, pronto para
      apertar `P`/`N` pela primeira vez.
- [ ] A ativação de qualquer Domínio é um acerto decisivo garantido por fração do HP máximo (40% do comum, 6% do chefe
      no Santuário, a até 320 px, e no Jackpot, a até 96 px; 25% e 4% na Amplificação, a até 96 px), que interrompe o
      ataque do comum comprometido, com o nome do Domínio na tela, `ImpactFrame`, linhas de foco e o hitstop do
      finalizador.
- [ ] O Santuário, no ritmo de referência de golpes, mata um grupo de 4 comuns de HP cheio a até 320 px dentro dos 6 s,
      na r4 e na r19 (teste puro).
- [ ] Os três Domínios jogam diferente: o Santuário corta em cadeia o que o jogador acerta, o Jackpot aposta num estado
      de energia infinita com piedade visível, e a Amplificação troca as técnicas por um corpo a corpo que atravessa
      guarda e armadura (nenhum comum troca golpe com o lutador).
- [ ] O Domínio sobe ao Nv 2 e ao Nv 3 pelo baú do chefe e pela loja a partir da r8.
- [ ] A `TestScene` não ganha nenhuma linha efetiva líquida na F31.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Vazio Ilimitado e Caixão da Montanha de Ferro | Leva 2 (F41) e leva 3 do catálogo da seção 5.6 |
| `TechEmitter` absorvendo o caminho do Santuário | F34; na F31 o `domainDirector` chama o `CutFx` e o acerto do Corte direto |
| Elites (ativação de 20% e 12% do HP máximo) | F38; as frações da elite ficam no dado (`data/domains`), sem alvo até lá |
| Baú do chefe completo (`core/bossChest`, 1 de 3 com evolução, 2 pontos de eixo e nível de talento) | F33. A F31 só põe a página "Baú do chefe" de 2 opções (nível do Domínio ou o prêmio de técnica de hoje) no `ChoicePanel` |
| Abandonar o Domínio ou trocar por outro | Abandonar é da F35 (`T` na `BuildBar`); na F31 o Domínio escolhido fica até o fim da run |
| `BuildBar` com "Domínio Nv N", pool de 7 vagas e 3º slot `O`/`B` | F35. O Domínio não ocupa vaga do pool e não paga o acréscimo de +8 (seção 1.1) |
| Restrição Celestial (voto que exige a Amplificação) | F40; a F31 só faz a Amplificação existir |
| Ícone HD do Domínio | F34 traz o `art/hd/techIcons`; a barra da F31 mostra só a barra e a letra da tecla |
| Invulnerabilidade durante a ativação | Nenhuma fonte do plano pede; o player continua tomando dano como hoje |
| Áudio dos tambores e da ativação | O jogo não tem áudio |
| Versão antiga (`?hd=0`) | Não recebe trabalho novo; os smokes antigos só não podem quebrar |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| 3 técnicas + Domínio nas teclas `O`/`B` e `P`/`N`, pool de 7 vagas, arma imbuída e escala do inimigo na F30 (decisões 1, 3, 5 e 6 da seção 7) | Valem; na F31 só a tecla `P`/`N` e a escala (lida pelo `hpMul`) mexem no código | Confirmadas pelo usuário | y |
| Demais decisões da seção 7 | Seguem a recomendação do plano | O usuário mandou seguir a recomendação | y |
| Nada automático | O Domínio só ativa pela tecla `P`/`N`; os cortes do Santuário só saem de acertos do jogador; nenhum efeito do Domínio age sem um gesto do jogador além do tique de cura do Jackpot, que é o prêmio do gesto da ativação | Esclarecimento do usuário no topo do plano | y |
| Prefixos dos requisitos | DOM (barra, tecla e ativação), VEU (Baú do Véu), SAN (Santuário), JAC (Jackpot), AMP (Amplificação), DNV (níveis 2 e 3), DHD (HUD e efeitos), DDB (debug e snapshot) | O validador só aceita `CAT-NN`; nenhum desses prefixos existe nas specs | y |
| Ids dos Domínios | `santuario`, `jackpot`, `amplificacao`; o item da loja é `dominio` | Ascii sem acento, no molde de `corte`, `vermelho` | n |
| "Golpe leve +1 / forte +2" | Um por golpe do moveset que acerta, mesmo com vários alvos (a mesma contagem da Fúria da F30), pela força do golpe (`light` ou `heavy`); o golpe com objeto ou com a arma vinculada conta como forte | O ritmo de referência fala em golpes por segundo, não em alvos; a F29 trata o objeto como golpe forte | n |
| Finalizador | Dá +5 e não soma a carga do golpe forte que ele é | Uma ação, uma linha da tabela | n |
| Parry ou esquiva perfeita | +5 nos eventos de defesa `parry`, `deflect` e `perfectDodge` do `CombatLinks` | São os três eventos que abrem o Contra hoje | n |
| "Técnica que acerta +1 por conjuração" | +1 no primeiro acerto não chip de cada conjuração; uma conjuração que só acerta tiques chip não carrega | Junta as linhas "técnica" e "chip" da tabela numa regra só | n |
| Kokusen | +15, somado ao +1 da conjuração do Divergente que o disparou | São dois eventos distintos no jogo de hoje | n |
| Abate | +1 por inimigo comum morto, por qualquer fonte (o gancho é o `combat.onEnemyDied`); a morte do chefe não carrega | A tabela não restringe a fonte; o chefe morto fecha a rodada e não passa pelo `onEnemyDied`, e o +1 dele não muda o ritmo | n |
| Acerto `micro` fora de conjuração (Onda do Punho, estilhaço) | Não carrega | A tabela só lista golpe, técnica por conjuração e as ações; o micro é acessório | n |
| Barra sem Domínio | Não carrega e fica escondida enquanto o jogador não tem Domínio | A barra é do Domínio; a carga de antes da r3 não tem dono | n |
| Carga inicial do Baú do Véu | O Domínio do Baú do Véu chega com a barra cheia (100, `DOMAIN_CHARGE.veilStart`); o `domain=` do debug e o nível do baú do chefe ou da loja não mexem na carga | "Quem morre cedo também experimenta a ultimate" (seção 3.1): com a barra em 0, quem morre na r4 antes de ~46 s de acertos nunca aperta `P`. A barra cheia piscando com o `P` ensina a tecla na primeira luta, e a decisão continua do jogador (barra cheia não esvazia) | n |
| Barra durante o Domínio ativo | Não carrega | Evita encadear um Domínio no outro | n |
| Esvaziamento ("esvazia 10% depois de 8 s sem acertar") | Aos 8000 ms seguidos sem nenhum evento de carga, a barra perde 10 pontos, e perde mais 10 a cada 8000 ms seguintes sem carga, nunca abaixo de 0; o relógio só corre no estado `roundActive`, no tempo de jogo | Uma leitura exata da frase; a travessia e a konbini não têm inimigo para acertar | n |
| Barra cheia | Com 100 a barra não esvazia | O Domínio é decisão do jogador ("nada automático"); perder a ultimate pronta enquanto ele procura o momento puniria a escolha | n |
| Carga entre rodadas | A barra fica de uma rodada para a outra dentro da run e zera na run nova | A seção 5.6 diz que a barra não enche com o tempo, não que zera por rodada | n |
| Quando a tecla vale | Com a mesma porteira do `inputFor` (estado que aceita input do player e área sem transição); na konbini e na transição a tecla é ignorada, sem evento. O `ShopInput` consome a borda de `P` e `N` a cada quadro da loja, para um `P` apertado na konbini não disparar no 1º quadro da rodada seguinte | Mesma regra das outras teclas de combate. Na loja o `updateGameplay` não roda (`TestScene.ts:419-420`), então o `PlayerInput.read()` não lê nada e o `JustDown` de uma tecla que só ele lê fica represado até a loja fechar | n |
| Recusa da ativação | Barra abaixo de 100: `domainDenied:charge`; Domínio já ativo: `domainDenied:active`; player ocupado (`isBusyForCast()`, conjuração ativa, Reversa canalizando ou morto): `domainDenied:busy`; sem Domínio: `domainDenied:none`. Nenhuma recusa gasta a barra | No molde do `techDenied:<motivo>` do `TechCaster` | n |
| Golpe em andamento na ativação | Termina na hora (`cancelMelee`), como o CAST-10 | A ativação não pode esperar o fim do golpe | n |
| Alcance da ativação ("a até 320 px", "64 px") | Distância euclidiana entre o centro do player e o centro do alvo, com a borda inclusa. O Santuário fica em 320 px; o Jackpot e a Amplificação sobem de 64 para **96 px** | Com plataformas, o alvo pode estar acima; a borda inclusa segue a regra de hoje (CUT-03). Os 64 px do plano caem em cima do 1º comum da fila de espera (`ENEMY_AI.holdBase` 64 com `holdTolerance` 2, `tuning.ts:119-126`): ele entraria ou não por 2 px de tremida, e a ativação pegaria só os 1 ou 2 que estão batendo (`attackRange` 40). Com 96 px (`holdRange`) entram os que batem e os dois primeiros da fila dos dois lados (64 e 88 px), e o raio continua um terço do Santuário. Os números da seção 5.6 são ponto de partida do plano | n |
| Dano da ativação | `max(1, round(fração × maxHp do alvo))`, sem multiplicador de build nem de voto | A fração já acompanha o HP escalado da F30; somar a build daria mais de 40% | n |
| Forma do acerto da ativação | Acerto normal (sem `band`), `heavy`, `tech: true`, `counter: true`, faixa de impacto forçada em `decisive` (`impactTier` com `forced`, F29), aceito com guarda levantada, em alvo no chão e em alvo levantando; a Amplificação leva `knockdown`. Empurrão `DOMAIN_HIT.force` (8) no Santuário e na Amplificação e 0 no Jackpot | "Acerto garantido e decisivo". Sem `counter`, o comum comprometido absorve o acerto como armadura e o ataque dele sai assim mesmo (`enemyBrain.ts:96`, CMT-04): a ultimate levaria o golpe que devia impedir. O `tech: true` passa pelo `refuses` do chão e do levantar (`enemyBrain.ts:111-115`, GND-04). Só a Amplificação "derruba". O Jackpot não empurra para os atordoados ficarem ao alcance do Riichi nos 2 s do giro | n |
| Hitstop, `ImpactFrame`, linhas de foco e nome da ativação | Um só por ativação, com `FINISHER_HITSTOP_MS` (150 ms, `combat.ts:22`), mesmo com vários alvos ou nenhum; o nome do Domínio sai no `Hud.banner` por `RUN.bannerMs` | O efeito é da ativação, não de cada alvo. Em JJK o Domínio é anunciado; o banner já existe e custa uma linha | n |
| Fim do Domínio | Pelo tempo, na abertura da konbini (comando `shopOpen`, mesmo com `noshop=1`), na morte do player, na run nova e no `R`; só o fim pelo tempo dispara o Corte do Mundo. A rodada limpa **não** encerra o Domínio: ele segue na travessia (`traverse`) e no intervalo (`intermission`) até o tempo acabar ou a konbini abrir | A ativação que mata os últimos inimigos é o momento épico e o mais comum de apertar `P`; encerrar na rodada limpa jogaria fora o giro inteiro do Jackpot (sem resultado) e os segundos pagos do Santuário. A cura do Jackpot na travessia não é grátis: foram ~46 s de barra. A konbini segue fora do Domínio, porque o efeito do Jackpot (custo 0) mudaria a prévia das cartas | n |
| Relógio do Domínio | Tempo de jogo (para no hitstop, como o resto do combate) | Mesma regra das conjurações | n |
| Escala da rodada no corte do Santuário ("6 × escala da rodada") | `round(6 × hpMul)`, com `hpMul` o multiplicador de HP da rodada (`multipliersFor`, o mesmo do piso do Kokusen na F30), sem multiplicador de técnica | O plano fala em escala da rodada; a build já sobe o golpe que dispara o corte | n |
| Gatilho do corte do Santuário ("cada golpe ou técnica do player que acerta") | Um gatilho por golpe do moveset que acerta (um por golpe) e um por conjuração, no primeiro acerto não chip dela (a mesma regra da carga "+1 por conjuração", pelo caminho da maestria). A Onda do Punho (F30), o corte do próprio Santuário e os tiques chip não soltam gatilho, e uma conjuração solta no máximo um, com estilhaços do Vermelho ou não | "Técnica que acerta" lida como na tabela da barra. A Onda e o corte não chamam `masteryHit`, então ficam de fora sem guarda de reentrada; sem isso um golpe com a Onda do Punho soltava 2 gatilhos e um Vermelho com estilhaços gastava o teto de 4 sozinho | n |
| Teto de 4 por segundo e 4 alvos | Até 4 gatilhos numa janela deslizante de 1000 ms de tempo de jogo; cada gatilho corta até 4 alvos (6 no Nv 2 e 3), os mais próximos do player primeiro, dentro de 320 px | "1 corte em até 4 inimigos (no máximo 4 por segundo)" | n |
| Corte do Santuário e maestria | Não dá maestria, não carrega a barra e não conta como conjuração | Não é técnica do slot; o Desmantelar pode nem estar equipado | n |
| Corte do Mundo ("executa os comuns abaixo de 35%") | No fim do Santuário Nv 3 pelo tempo, todo comum a até 320 px com HP de 35% do máximo ou menos morre (acerto decisivo com dano igual ao HP restante), e o chefe a até 320 px leva `round(0,08 × maxHp)` | "Abaixo de 35%" lido com a borda inclusa, testada nos dois lados | n |
| Riichi ("cada golpe que acerta enquanto giram dá +4%") | +4 pontos percentuais por golpe do moveset que acerta durante os 2 s do giro (um por golpe) | O texto diz "golpe"; a técnica já carrega outras coisas | n |
| Chance do Jackpot | `min(0,60, base + 0,05 × jackpots já ganhos na run (só no Nv 3) + 0,04 × golpes no giro)`, com base 0,33 no Nv 1 e 0,40 no Nv 2 e 3; sorteio pelo stream `domainRng` | O teto de 60% vale para a soma, como no texto do Riichi e do Nv 3 | n |
| Efeito do jackpot | 8 s: a energia fica no máximo em todo quadro e a conjuração não gasta; nenhuma recarga começa e as que estavam correndo zeram; cura de 1 HP a cada 200 ms (5 HP/s) com o teto da vida | "Energia infinita, técnicas sem recarga e cura de 5 HP/s" | n |
| Falha ("4 s com metade do efeito") | 4 s: custo das técnicas ×0,5, recarga nova ×0,5 e cura de 1 HP a cada 400 ms (2,5 HP/s); o piso de 60% do custo (PRC-05) não vale dentro do Jackpot | Metade de cada um dos três efeitos, com número exato | n |
| Piedade ("a 3ª falha seguida é jackpot garantido") | Contador de falhas seguidas por run; na ativação com 2 falhas seguidas o resultado é jackpot sem sorteio; zera no jackpot e na run nova. Com a piedade armada, os tambores mostram "GARANTIDO" no lugar da chance e o snapshot lê `chance` 1 e `guaranteed` verdadeiro | Leitura direta; o sorteio não é consumido no garantido. Piedade invisível não tira frustração: o jogador precisa saber, já na 2ª falha, que a próxima é certa | n |
| Jackpot durante o giro | O efeito começa quando os tambores param, 2000 ms depois da ativação; durante o giro nada do efeito vale | O texto separa o giro do efeito | n |
| Amplificação: "atravessa guarda" | Golpe do moveset e com objeto do player não é segurado pela guarda do comum (`enemyGuard.resolveHit`, a comum e a de leitura) **nem absorvido pela armadura do comum comprometido** (CMT-04): o golpe interrompe o ataque dele como faria fora do compromisso. O chefe não tem guarda nem armadura de comum; nele valem a anulação de projétil e o +25% do Nv 3 | A guarda do comum só sobe em 10% a 40% dos golpes leves de frente com ele parado (`enemyGuard.ts:53-55`), e projétil só o chefe solta: lido só como guarda, a Amplificação Nv 1 e 2 seria quase só a trava das técnicas na maioria das rodadas. A armadura do compromisso é a defesa que todo comum usa em toda rodada; atravessá-la dá ao lutador a janela de 7 s em que ninguém troca golpe com ele, o sentimento do Sifu que o plano pede | n |
| Amplificação: "anula projétil" | Projétil inimigo que toca a hitbox ativa de um golpe do player some sem causar dano, com o evento `projectileNullified` | Os projéteis de hoje são do chefe | n |
| Amplificação: "técnicas travadas" | Pedido de conjuração recusado com `techDenied:domain`, sem gastar energia; não cancela conjuração já em andamento, porque a ativação é recusada com conjuração ativa | No molde das outras recusas da `CastMachine` | n |
| Amplificação Nv 3 (+25% no corpo a corpo) | ×1,25 no `meleeMul` do `statSheet` enquanto a Amplificação está ativa, entrando pelo `StatsDirector` | Regra da F29: multiplicador novo só pelo agregador | n |
| Baú do Véu | Fica pendente no `roundCleared` da r3 e abre no `ChoicePanel` da konbini seguinte; sorteia 2 dos 3 Domínios pelo stream `chestRng`; não tem recusa (Enter confirma a opção marcada); o Domínio escolhido chega com a barra cheia | "Fim da r3, sempre"; o `chestRng` é o stream que o plano reserva para os baús (o `bossChest` da F33 reaproveita) | n |
| Baú do Véu com Domínio já possuído | Não abre | Só há 1 vaga de Domínio; só o debug chega aqui | n |
| Baú do chefe na F31 ("nível do Domínio no baú") | Na vitória sobre o chefe com Domínio abaixo do Nv 3, o prêmio de técnica do BFX-09 (com a regra da F30 no Vermelho) não é aplicado na hora; a konbini seguinte abre a página "Baú do chefe" com A = "Domínio Nv N+1" e B = o prêmio de técnica adiado. Sem prêmio de técnica possível, o Domínio sobe direto na vitória. Com Domínio no Nv 3 ou sem Domínio, o BFX-09 fica como hoje | O `bossChest` completo é da F33; a página de 2 opções cabe no `ChoicePanel` da F30 e não inventa prêmio novo | n |
| Ordem dos painéis na konbini | `VowPanel` (rodada de chefe), depois as páginas do `ChoicePanel` na ordem Baú do chefe, Baú do Véu, ramos (Vermelho, Corpo), depois a loja | O Domínio muda o que a loja vende a partir da r8; a ordem dos ramos é a da F30 | n |
| Carta do Domínio na loja | Entra no fim de `GAME_SHOP_CATALOG` com `kind: 'domain'`, raridade rara, Nv 2 por 40 e Nv 3 por 50 antes da inflação; só no sorteio ponderado (cartas 2 e 3 da F30), nunca na carta 0 nem na 1 | Regra do catálogo (seção 6) e preços da seção 3.2 | n |
| Parâmetros de debug novos | `domain=<id>[:<nível>]`, `charge=<n>` (inteiro de 0 a 100) e `jackpotMisses=<n>` (inteiro de 0 a 2, as falhas seguidas do Jackpot), lidos no reset da run depois do `statsDirector.reset()`; entrada inválida é ignorada | Os smokes precisam montar o Domínio sem passar pela r3, e provar a piedade e o "GARANTIDO" no jogo sem encher a barra três vezes | n |
| Smoke novo | `domain.smoke.mjs`, com `?debug&hd=1&area=modular` | Regra de smoke novo do projeto | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: A barra carrega com o que o jogador acerta ⭐ MVP

**User Story**: Como jogador que tem um Domínio, quero que a barra encha pelo que eu acerto e defendo bem, para a
ultimate ser a recompensa de lutar bem e não de esperar.

**Why P1**: Sem a barra não há Domínio; a regra pura é a base de todos os outros requisitos.

**Acceptance Criteria**:

1. DOM-01: The domain charge SHALL be an integer from 0 to 100, kept in a pure module (`core/domain.ts`) with no Phaser import, and SHALL never go below 0 or above 100.
2. DOM-02: WHILE the player owns a domain and no domain is active, WHEN a charge event happens THEN the charge SHALL grow by: light strike that hits +1, heavy strike that hits +2, prop or bound weapon hit +2, common enemy kill +1, `parry`, `deflect` or `perfectDodge` +5, first non-chip hit of a technique cast +1, finisher +5, Kokusen +15.
3. DOM-02: WHEN one moveset strike hits several targets THEN the charge SHALL grow once for that strike, and WHEN the finisher hits THEN the charge SHALL grow by 5 and not also by the heavy strike value.
4. DOM-02: IF a hit carries `band: 'chip'`, or is a `micro` hit other than the first hit of a technique cast, or is a Sanctuary cut THEN the charge SHALL not grow.
5. DOM-02: IF the player owns no domain or a domain is active THEN no charge event SHALL change the charge.
6. DOM-03: WHILE the run state is `roundActive` and the charge is between 1 and 99, WHEN 8000 ms of game time pass with no charge event THEN the charge SHALL drop by 10 (floored at 0), and SHALL drop by 10 again at every further 8000 ms with no charge event.
7. DOM-03: WHEN 7999 ms pass with no charge event THEN the charge SHALL be unchanged, and WHEN a charge event happens THEN the drain timer SHALL restart from 0.
8. DOM-03: WHILE the charge is 100, or the run state is not `roundActive`, the drain timer SHALL not advance.
9. DOM-04: WHEN the reference rhythm of section 5.6 (one light strike per second, one heavy strike every 4 s, one kill every 5 s, one perfect defense every 20 s, one technique cast hit every 5 s) is fed to the pure module from charge 0 THEN the charge SHALL reach 100 after more than 40 s and no later than 60 s of simulated time.
10. DOM-05: The charge SHALL persist from one round to the next within the run, SHALL reset to 0 on the run reset, and SHALL reset to 0 on each activation.

**Independent Test**: `tests/core/domain.test.ts` alimenta a tabela evento a evento, o ritmo de referência (40 < t ≤ 60 s)
e o esvaziamento em 7999/8000/16000 ms; `?debug&hd=1&area=modular&seed=1&domain=santuario` mostra `domain.charge`
subindo 1 no jab e 2 no golpe forte.

---

### P1: A tecla `P`/`N` solta o golpe decisivo ⭐ MVP

**User Story**: Como jogador com a barra cheia, quero apertar `P` (ou `N` nas setas) e ver um golpe que limpa a tela,
para a ultimate valer os ~46 s de barra em qualquer rodada.

**Why P1**: É a ultimate; a seção 5.6 diz que a ativação decisiva é o que paga a barra.

**Acceptance Criteria**:

1. DOM-06: WHEN `P` or `N` goes down (`JustDown`) while the player accepts input (the same gate as `inputFor`: run state that accepts player input and no area transition), the player owns a domain, the charge is 100, no domain is active and the player is not busy THEN the system SHALL activate the owned domain at its level, SHALL set the charge to 0 and SHALL push the debug event `domain:<id>`.
2. DOM-06: IF `P` or `N` goes down in the shop or during an area transition THEN the system SHALL ignore it and push no event, and a press made in the shop SHALL not activate the domain on the first frame after the shop closes.
3. DOM-07: IF the activation is refused THEN the charge SHALL be unchanged and the system SHALL push exactly one event: `domainDenied:none` with no domain owned, `domainDenied:charge` below 100, `domainDenied:active` with a domain active, and `domainDenied:busy` when `player.isBusyForCast()` is true, a cast is active, the Reversa is channeling or the player is dead.
4. DOM-07: WHEN an activation is accepted while a moveset strike is in progress THEN the strike SHALL end at once through `player.cancelMelee()`, as CAST-10 does for a cast.
5. DOM-08: WHEN a domain activates THEN every live common enemy and the live boss whose center is within the activation radius of the player center (edge included) SHALL take one hit of `max(1, round(fraction × target maxHp))`, with no build or vow multiplier: Sanctuary radius 320 px with fractions 0.40 common and 0.06 boss; Jackpot radius 96 px with 0.40 and 0.06; Amplification radius 96 px with 0.25 and 0.04.
6. DOM-08: The activation hit SHALL carry no band, `strength: 'heavy'`, `tech: true` and `counter: true`, SHALL be resolved with the impact tier forced to `decisive`, SHALL be accepted by a target with its guard up, on the ground or getting up, SHALL interrupt the attack of a committed common enemy (no `armored` result), SHALL push with `force` 8 in the Sanctuary and the Amplification and 0 in the Jackpot, and SHALL carry `knockdown: true` only for the Amplification.
7. DOM-09: WHEN a domain activates THEN the system SHALL trigger one `ImpactFrame`, one `FocusLines` burst at the player, one hitstop of `FINISHER_HITSTOP_MS` (150 ms) and one `Hud.banner` with the domain name for that activation, whether it hits zero, one or many targets.
8. DOM-09: WHEN the activation hits a target THEN the damage number of that hit SHALL show the strike kind with the value dealt, through `ui.damageNumbers`.
9. DOM-10: WHILE a domain is active its remaining time SHALL fall with game time (stopped during hitstop) in `roundActive`, `intermission` and `traverse`, and WHEN it reaches 0 THEN the domain SHALL end with the debug event `domainEnd:<id>`.
10. DOM-10: WHEN the round is cleared while a domain is active THEN the domain SHALL keep running until its timer ends or the konbini opens; WHEN the konbini opens (`shopOpen`, also with `noshop=1`), the player dies or the run resets while a domain is active THEN the domain SHALL end at once, with `domainEnd:<id>`, and its end effects SHALL not run.
11. DOM-11: The F31 SHALL add no net effective line to `src/scenes/TestScene.ts`; the domain director SHALL be created and updated by an existing director or by the `UiSetup`.

**Independent Test**: `domain.smoke.mjs` com `?debug&hd=1&area=modular&seed=1&maxAlive=3&domain=santuario&charge=100`:
`P` dispara `domain:santuario`, a carga vai a 0, os comuns a até 320 px perdem 40% do HP máximo, o comum que estava no
compromisso do ataque não solta a garra (sem `armored:<id>`) e o snapshot mostra o hitstop de 150 ms; um segundo `P` dá
`domainDenied:active`; um `P` apertado na konbini não dispara nada na rodada seguinte.

---

### P1: O Baú do Véu dá a ultimate na r3 ⭐ MVP

**User Story**: Como jogador, quero ganhar um Domínio no fim da r3, mesmo numa run curta, para experimentar a ultimate
cedo e escolher entre dois estilos.

**Why P1**: "Quem morre cedo também experimenta a ultimate" (seção 3.1); é a porta de entrada do Domínio.

**Acceptance Criteria**:

1. VEU-01: WHEN round 3 is cleared and the player owns no domain THEN the system SHALL mark the Baú do Véu as pending.
2. VEU-02: WHEN the konbini opens with the Baú do Véu pending THEN the `ChoicePanel` SHALL show a page with item `veu` and two different domains drawn among `santuario`, `jackpot` and `amplificacao` by the `chestRng` stream, each option with the domain name and a one-line effect.
3. VEU-02: The `chestRng` SHALL be a stream with its own salt in `core/run.ts`, and the same seed SHALL draw the same two domains.
4. VEU-03: WHEN the Baú do Véu page is confirmed with `Enter` THEN the player SHALL own the selected domain at level 1 with the charge full (100), the pending mark SHALL be cleared and the system SHALL push the debug event `veil:<id>`.
5. VEU-03: The Baú do Véu page SHALL have no decline: `Enter` SHALL always take the marked option, and the shop SHALL take no input until the page is confirmed.
6. VEU-04: IF the konbini of round 3 is skipped (`noshop=1`) THEN the Baú do Véu SHALL stay pending and SHALL open at the next konbini.
7. VEU-04: IF the player already owns a domain when round 3 is cleared THEN the Baú do Véu SHALL not become pending.
8. VEU-04: WHEN the run resets with the Baú do Véu pending THEN the pending mark SHALL be cleared.

**Independent Test**: `domain.smoke.mjs` com `?debug&hd=1&area=modular&seed=1&round=3&maxAlive=1`: ao limpar a r3, a
konbini abre o `ChoicePanel` com `choice.page.item === 'veu'` e 2 opções; `D` e `Enter` dão `veil:<id>` e o snapshot
mostra o Domínio no Nv 1 com `charge` 100 e `ready`; o 1º `P` da r4 ativa.

---

### P1: Santuário Malevolente corta o que o jogador acerta ⭐ MVP

**User Story**: Como jogador que escolheu o Santuário, quero que cada golpe meu solte cortes em cadeia na tela, para o
Domínio amplificar o que eu já faço, sem lutar sozinho.

**Why P1**: Um dos três Domínios da leva 1, e o de menor custo de arte (reaproveita o `CutFx`).

**Acceptance Criteria**:

1. SAN-01: WHILE the Sanctuary is active the domain SHALL last 6000 ms at level 1 and 8000 ms at levels 2 and 3, counted from the activation.
2. SAN-02: WHILE the Sanctuary is active, WHEN a moveset strike of the player hits (once per strike) or a technique cast lands its first non-chip hit (once per cast) THEN the system SHALL release one cut trigger, unless 4 triggers were already released in the last 1000 ms of game time.
3. SAN-02: WHEN a 5th trigger would be released within 1000 ms THEN the system SHALL release no cut and SHALL leave the strike or technique hit unchanged; IF a hit is a Fist Wave `micro` hit, a chip tick or a Sanctuary cut THEN it SHALL release no trigger, and a cast SHALL release at most one trigger however many hits it lands (Red shards included).
4. SAN-03: WHEN a cut trigger is released THEN the system SHALL hit up to 4 live targets at level 1 and up to 6 at levels 2 and 3, chosen among the common enemies and the boss within 320 px of the player center, nearest first, each with one hit of `round(6 × hpMul)` where `hpMul` is the HP multiplier of the current round.
5. SAN-03: WHEN the Sanctuary level 1 activates at round 4 or round 19 next to 4 common enemies at full HP within 320 px and the reference strikes follow (one light strike every 1000 ms, one heavy every 4000 ms and one cast hit every 5000 ms, from 0 ms after the activation) THEN the activation hit plus the cuts released within the 6000 ms SHALL bring all 4 to 0 HP (pure test, with the round's `hpMul` and enemy max HP).
6. SAN-03: The Sanctuary cut hit SHALL carry `band: 'micro'`, `strength: 'light'`, `force` 0, direction `{x: 0, y: -1}` and the technique marks of the Desmantelar hit (`techMarks('light')`), so it follows the micro rules of the F29 (15 ms hitstop within the 60 ms per second budget, no `hitstun`, half structure, normal poise on the boss).
7. SAN-04: WHEN a Sanctuary cut hits a target THEN the domain director SHALL draw the `CutFx.cut` line crossing that target and the `CutFx.split` on it, without going through the `TechRunner`, the `CastMachine` or the `strikeEmitter`, and SHALL push the debug event `domainCut:<targetId>`.
8. SAN-04: The Sanctuary cut SHALL give no mastery, SHALL not charge the domain bar and SHALL spend no energy.
9. SAN-05: WHEN the Sanctuary at level 3 ends by its timer THEN every live common enemy within 320 px whose HP is 35% of its max or less SHALL die from one decisive hit equal to its remaining HP, and the live boss within 320 px SHALL take one decisive hit of `round(0.08 × boss maxHp)`, with the debug event `worldCut`.
10. SAN-05: IF a common enemy has HP above 35% of its max when the World Cut runs THEN it SHALL take no damage from it.
11. SAN-06: WHILE the Sanctuary is active the screen SHALL show the Sanctuary vignette of the `DomainFx` (colors from the `PALETTE`), and WHEN it ends THEN the vignette SHALL fade out within 300 ms.

**Independent Test**: `tests/core/sanctuary.test.ts` (gatilhos 4 e 5 em 1000 ms, 999/1000/1001 ms, alvos por distância,
Corte do Mundo em 35% e logo acima); no smoke, com `domain=santuario:3&charge=100`, cada jab durante o Domínio dá
`domainCut:<id>` em até 6 alvos e o fim dá `worldCut`.

---

### P1: Jackpot aposta num estado de poder ⭐ MVP

**User Story**: Como jogador que escolheu o Jackpot, quero bater durante o giro para subir a chance e ganhar energia
infinita, com a garantia de que a sorte não me deixa na mão três vezes seguidas.

**Why P1**: Um dos três Domínios da leva 1; a piedade e o Riichi tiram a frustração do acaso puro.

**Acceptance Criteria**:

1. JAC-01: WHEN the Jackpot activates THEN, after the activation hit, three reels SHALL spin for 2000 ms of game time, and no Jackpot effect SHALL apply during the spin.
2. JAC-02: WHILE the reels spin, WHEN a moveset strike of the player hits (once per strike) THEN the chance SHALL grow by 4 percentage points (Riichi).
3. JAC-02: The Jackpot chance SHALL be `min(0.60, base + bonus + 0.04 × strikes in the spin)`, with base 0.33 at level 1 and 0.40 at levels 2 and 3, and bonus `0.05 × jackpots already won in the run` at level 3 and 0 below it.
4. JAC-03: WHEN the reels stop THEN the result SHALL be a jackpot when a `domainRng` draw falls below the chance, and a miss otherwise, with the debug event `jackpot:hit` or `jackpot:miss`; the `domainRng` SHALL be a stream with its own salt in `core/run.ts`.
5. JAC-03: IF the 2 previous results in the run were misses THEN the reels SHALL stop on a jackpot without consuming a `domainRng` draw (pity), and the consecutive miss count SHALL reset to 0 on every jackpot and on the run reset.
6. JAC-04: WHILE the jackpot effect lasts (8000 ms from the reel stop) the energy SHALL read its maximum on every frame, a cast SHALL spend no energy, no technique cooldown SHALL start and the cooldowns running at the reel stop SHALL be cleared.
7. JAC-04: WHILE the jackpot effect lasts the player SHALL heal 1 HP every 200 ms through `player.heal`, capped at the max HP.
8. JAC-05: WHILE the miss effect lasts (4000 ms from the reel stop) every technique cost SHALL be multiplied by 0.5 without the 60% floor of PRC-05, every cooldown started SHALL be multiplied by 0.5, and the player SHALL heal 1 HP every 400 ms through `player.heal`.
9. JAC-05: WHEN the jackpot or miss effect ends THEN the costs, cooldowns and energy SHALL return to the values resolved by the `Loadout` and the `StatsDirector`, with no lasting change.
10. JAC-06: WHILE the reels spin the `DomainFx` SHALL show three reels on the UI layer with the current chance in percent, and WHEN they stop THEN they SHALL show three equal symbols on a jackpot and at least one different symbol on a miss.
11. JAC-06: WHILE the reels spin with 2 consecutive misses in the run (pity armed) the reels SHALL show the text "GARANTIDO" instead of the chance, and the snapshot SHALL report `chance` 1 and `guaranteed: true`.

**Independent Test**: `tests/core/jackpot.test.ts` (chance com Riichi e teto de 60%, Nv 3 com jackpots ganhos, piedade
na 3ª ativação com 2 falhas seguidas, sem sorteio no garantido, e a chance exibida 1 com a piedade armada); no smoke,
com `domain=jackpot&charge=100`, depois do `jackpot:hit` a energia fica cheia e a vida sobe 5 por segundo.

---

### P1: Amplificação de Domínio arma o lutador ⭐ MVP

**User Story**: Como jogador lutador, quero uma ultimate que deixa meu corpo a corpo atravessar guarda e anular
projéteis, para fechar a luta com o moveset em vez das técnicas.

**Why P1**: É a ultimate do lutador, puxada para a leva 1 para o Baú do Véu sortear 2 de 3 (seção 5.6).

**Acceptance Criteria**:

1. AMP-01: WHILE the Amplification is active the domain SHALL last 7000 ms at level 1 and 9000 ms at levels 2 and 3, counted from the activation.
2. AMP-02: WHILE the Amplification is active, WHEN a moveset strike or a prop hit of the player reaches a common enemy with its guard up (common or reading guard) THEN the hit SHALL be applied as an unguarded hit, with no `enemyBlock` event.
3. AMP-02: WHILE the Amplification is active, WHEN a moveset strike or a prop hit of the player reaches a committed common enemy (CMT-04) THEN the enemy SHALL not absorb it as armor (no `armored:<id>` event) and its pending attack SHALL be interrupted, as it is for a hit outside the commitment; WHILE the Amplification is off the same hit SHALL keep the armor rule of today.
4. AMP-03: WHILE the Amplification is active, WHEN an enemy projectile overlaps the active hitbox of a player strike THEN the projectile SHALL be destroyed without dealing damage and the system SHALL push the debug event `projectileNullified`.
5. AMP-04: WHILE the Amplification is active, WHEN a technique slot key goes down THEN the cast SHALL be refused with the debug event `techDenied:domain`, spending no energy and starting no cooldown.
6. AMP-05: WHILE the Amplification at level 3 is active the melee multiplier of the `statSheet` SHALL be multiplied by 1.25 through the `StatsDirector`, and WHEN it ends THEN the multiplier SHALL return to the value without it.
7. AMP-05: The `StatsDirector` SHALL stay the only writer of `loadout.damageMul`, `loadout.vowDamageMul`, `loadout.costMul`, `player.damageTakenMul` and `player.setMaxHp` (POW-01) with the domain effects on.
8. AMP-06: WHILE the Amplification is active the `DomainFx` SHALL draw an outline around the player that follows `player.renderPos` on every frame, with colors from the `PALETTE`, and SHALL remove it when the domain ends.

**Independent Test**: `tests/core/domainEffects.test.ts` (duração, travas e o ×1,25 no `statSheet` nos dois lados do
Nv 3) e `tests/core/enemyGuard.test.ts` (`armorHolds` com e sem `armorPierce`); no smoke, com
`domain=amplificacao&charge=100&enemyGuard=1`, o golpe no comum de guarda levantada aplica dano, o `jab` no comum que
entrou no compromisso do ataque interrompe a garra (sem `armored:<id>`, e com o evento fora do Domínio) e a tecla `L`
dá `techDenied:domain`.

---

### P2: O Domínio sobe ao Nv 2 e ao Nv 3

**User Story**: Como jogador que gostou do Domínio, quero subir o nível dele no baú do chefe e na loja da r8 em diante,
para a ultimate crescer junto com a run.

**Why P2**: O Nv 1 já é a ultimate inteira; os níveis são profundidade.

**Acceptance Criteria**:

1. DNV-01: The domain level SHALL go from 1 to 3, SHALL be raised by one level per source, and IF the domain is at level 3 THEN no source SHALL offer a domain level.
2. DNV-02: WHEN the boss is defeated while the player owns a domain below level 3 and today's technique prize (BFX-09, with the F30 Vermelho rule) has a target THEN the system SHALL not apply that prize nor show its banner at the victory, and the next konbini SHALL show the `ChoicePanel` page with item `bauChefe` and the options "Domínio Nv N+1" and that technique prize.
3. DNV-02: WHEN the `bauChefe` page is confirmed THEN the system SHALL apply only the selected option, with the debug event `bossChest:domain` or `bossChest:tech`.
4. DNV-03: WHEN the boss is defeated while the player owns a domain below level 3 and today's technique prize has no target THEN the domain SHALL rise one level at the victory, with the banner "Domínio Nv N!" in the slot of the BFX-10 banner.
5. DNV-03: WHEN the boss is defeated while the player owns no domain or a domain at level 3 THEN the BFX-09 prize and the BFX-10 banner SHALL work as today.
6. DNV-04: The shop catalog SHALL hold a `dominio` entry of kind `domain`, rarity rare and max level 3, appended at the end of `GAME_SHOP_CATALOG`, priced 40 for level 2 and 50 for level 3 before the F30 inflation (PRC-03).
7. DNV-04: The `dominio` card SHALL be eligible only from the round 8 shop, only while the player owns a domain below level 3, and only in the weighted draw of cards 2 and 3; it SHALL never be card 0 or card 1.
8. DNV-04: IF the shop round is 7 or earlier, or the player owns no domain, THEN the eligibility check SHALL refuse the `dominio` card (tested at rounds 7 and 8).
9. DNV-05: WHEN the `dominio` card is bought THEN the domain level SHALL rise by one, the card preview SHALL have read "Nv N → N+1", and the purchase SHALL follow the shop rule "check → spend → apply" with the debug event `buy:dominio:<cost>`.
10. DNV-05: The domain SHALL occupy no pool slot and SHALL add no pool surcharge to other cards.

**Independent Test**: `tests/core/domainShop.test.ts` (elegibilidade na r7 e r8, Nv 3 no teto, preço 40 e 50 com a
inflação da r8: `round(40 × 1,42)` = 57 e `round(50 × 1,42)` = 71); no smoke, com `domain=santuario&round=5`, a
vitória sobre o chefe abre a página `bauChefe` na konbini.

---

### P1: A barra e o Domínio aparecem na tela ⭐ MVP

**User Story**: Como jogador, quero ver a barra encher embaixo da energia, saber quando ela está pronta e ver o
Domínio ativo, para decidir a hora de apertar `P`.

**Why P1**: Sem a barra na tela, a ultimate é invisível; "nada automático" pede que o jogador saiba quando pode agir.

**Acceptance Criteria**:

1. DHD-01: WHILE the player owns a domain the `EnergyHud` SHALL show the domain bar right below the energy bar, with a fill width of `charge / 100` of the bar width, and WHILE the player owns none the bar SHALL be hidden.
2. DHD-02: WHILE the charge is 100 and no domain is active the bar SHALL blink and SHALL show the key label `P`.
3. DHD-03: WHILE a domain is active the bar SHALL show the remaining time of the domain as a fill that shrinks from full to empty.
4. DHD-04: Every color of the domain bar and of the `DomainFx` (vignette, reels, outline) SHALL be a key of the `PALETTE`.
5. DHD-05: The `DomainFx` SHALL live in `src/game/DomainFx.ts`, SHALL be created by the `UiSetup` or by the domain director, and SHALL be destroyed with the scene on `SHUTDOWN` (the `R` restart outside the shop).
6. DHD-06: The domain bar and the three domain effects SHALL be checked in the game in HD, in motion and with the player facing both sides, not only on a static board.

**Independent Test**: no smoke, o `energyHud` do snapshot mostra `domainBar: {visible, fill, blinking}`; a captura do
jogo em HD mostra a barra embaixo da energia.

---

### P2: Debug e snapshot do Domínio

**User Story**: Como desenvolvedor e smoke, quero montar o Domínio pela URL e ler o estado dele no snapshot, para provar
cada efeito no jogo vivo.

**Why P2**: Os smokes e o ajuste fino dependem disto.

**Acceptance Criteria**:

1. DDB-01: The debug snapshot SHALL report `domain: {owned: {id, level} | null, charge, ready, active: {id, level, remainingMs} | null, jackpot: {spinning, chance, guaranteed, misses, jackpotsWon, effect: 'jackpot' | 'miss' | null, effectMs} | null, triggersLastSecond, veilPending}`, required, typed in the snapshot file apart from `debugApi.ts` and added through `StatsDirector.snapshotFields()`.
2. DDB-01: The `choice.page.item` of the F30 snapshot SHALL accept `veu` and `bauChefe`, and the `energyHud` snapshot SHALL report `domainBar: {visible, fill, blinking}`.
3. DDB-02: WHEN the run starts with `?debug&domain=<id>[:<level>]` THEN the run reset SHALL give the player that domain at that level (1 when absent), WHEN it starts with `?debug&charge=<n>` THEN the charge SHALL start at `n`, and WHEN it starts with `?debug&jackpotMisses=<n>` THEN the Jackpot consecutive miss count SHALL start at `n`.
4. DDB-02: IF `domain=` has an unknown id or a level that is not an integer from 1 to 3, `charge=` is not an integer from 0 to 100, or `jackpotMisses=` is not an integer from 0 to 2, THEN the system SHALL ignore that parameter.
5. DDB-03: The `README.md` SHALL document `domain=`, `charge=`, `jackpotMisses=`, the keys `P`/`N` and the new debug events.

**Independent Test**: `domain.smoke.mjs` lê `domain` e os eventos; `tests/game/debugApi.test.ts` tem os campos novos no
literal do snapshot.

---

## Edge Cases

- IF the player presses `P` and `N` in the same frame THEN the system SHALL try the activation once.
- WHEN the activation hits a common enemy with 40% of its max HP or less THEN that enemy SHALL die and the kill SHALL not charge the bar (the domain is already active).
- IF the activation kills the last enemy of the round THEN the round SHALL be cleared and the domain SHALL keep running in the traverse (or the intermission) until its timer ends or the konbini opens, as DOM-10 says: a Jackpot spin SHALL still stop with a result and its effect SHALL still heal, and a Sanctuary level 3 that ends by its timer SHALL still push `worldCut` with no target.
- IF `P` goes down in the konbini and the shop closes with the key released THEN the first frame of the next round SHALL not activate the domain.
- WHILE the Amplification is active, WHEN a strike hits a committed common enemy whose attack hitbox is already open THEN the hit SHALL interrupt it in the same frame; a claw that touched the player before the strike landed SHALL still hurt (the armor pierce stops the attack, not a hit already dealt).
- WHEN the Sanctuary is active and a strike hits while the micro hitstop budget of the F29 is full THEN the cut SHALL still hit and show its number, with no hitstop.
- IF a Sanctuary cut trigger finds no target within 320 px THEN it SHALL still count toward the 4 triggers per second.
- WHEN the player dies during the Jackpot spin THEN the reels SHALL stop with no result, the miss count SHALL not change and no effect SHALL apply.
- IF the Jackpot effect is on when the run resets THEN the energy, costs and cooldowns SHALL start the new run with today's reset values.
- WHEN a Jackpot jackpot heals the player at full HP THEN the HP SHALL stay at the max.
- IF a cast is active when the player presses `P` for the Amplification THEN the activation SHALL be refused (`domainDenied:busy`), so a cast and the Amplification never overlap.
- IF the World Cut runs with the boss at 8% of its max HP or less THEN the boss SHALL die from it and the boss victory SHALL follow today's flow.
- WHEN the boss victory defers the technique prize (DNV-02) and the run ends before the konbini THEN the deferred prize SHALL be dropped on the run reset.
- WHEN the `bauChefe` and the `veu` pages are both pending THEN the `ChoicePanel` SHALL show the `bauChefe` page first; this only happens through debug, because the Baú do Véu is round 3 and boss rounds are multiples of 5.
- WHEN a common enemy spawns past round 34 THEN the activation SHALL keep the same fractions, because they read the max HP already scaled by the F30.

---

## Implicit-Requirement Dimensions

| Dimension | Resolução |
| --- | --- |
| Input validation & bounds | DOM-01 (carga de 0 a 100), DNV-01 (nível de 1 a 3), DDB-02 (`domain=` e `charge=` inválidos ignorados), JAC-02 (teto de 60%), SAN-02 (4 gatilhos por segundo) |
| Failure / partial-failure states | DOM-07 (recusa não gasta a barra), DNV-05 (compra "checar → gastar → aplicar"), edge case da morte no giro; sem I/O, o resto é N/A |
| Idempotency / retry / duplicate handling | DOM-02 (uma carga por golpe), edge case de `P`+`N` no mesmo quadro, VEU-03 (o baú sai da fila ao confirmar), JAC-03 (piedade sem sorteio) |
| Auth boundaries & rate limits | SAN-02 (teto de 4 gatilhos por segundo) e o teto de 60 ms de micro da F29 (SAN-03); auth N/A porque é jogo local |
| Concurrency / ordering | Ordem dos painéis (Assumptions), DOM-07 (ativação recusada com conjuração ativa), AMP-04 (técnicas travadas), edge case do `bauChefe` antes do `veu` |
| Data lifecycle / expiry | DOM-03 (esvaziamento), DOM-05 (carga zera na run nova), DOM-10 (fim do Domínio), VEU-04 e DNV-02 (pendências caem no reset), JAC-03 (contador de falhas por run) |
| Observability | DDB-01 (snapshot); eventos `domain:`, `domainDenied:`, `domainEnd:`, `domainCut:`, `worldCut`, `jackpot:`, `veil:`, `bossChest:`, `projectileNullified` e `techDenied:domain` |
| External-dependency failure | N/A porque não há dependência externa em jogo |
| State-transition integrity | DOM-06/07 (só ativa com barra cheia e sem Domínio ativo), JAC-01 (efeito só depois do giro), DOM-10 (fins do Domínio), VEU-04 (baú só sem Domínio) |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| DOM-01 | P1: A barra carrega com o que o jogador acerta | Tasks | Pending |
| DOM-02 | P1: A barra carrega com o que o jogador acerta | Tasks | Pending |
| DOM-03 | P1: A barra carrega com o que o jogador acerta | Tasks | Pending |
| DOM-04 | P1: A barra carrega com o que o jogador acerta | Tasks | Pending |
| DOM-05 | P1: A barra carrega com o que o jogador acerta | Tasks | Pending |
| DOM-06 | P1: A tecla `P`/`N` solta o golpe decisivo | Tasks | Pending |
| DOM-07 | P1: A tecla `P`/`N` solta o golpe decisivo | Tasks | Pending |
| DOM-08 | P1: A tecla `P`/`N` solta o golpe decisivo | Tasks | Pending |
| DOM-09 | P1: A tecla `P`/`N` solta o golpe decisivo | Tasks | Pending |
| DOM-10 | P1: A tecla `P`/`N` solta o golpe decisivo | Tasks | Pending |
| DOM-11 | P1: A tecla `P`/`N` solta o golpe decisivo | Tasks | Pending |
| VEU-01 | P1: O Baú do Véu dá a ultimate na r3 | Tasks | Pending |
| VEU-02 | P1: O Baú do Véu dá a ultimate na r3 | Tasks | Pending |
| VEU-03 | P1: O Baú do Véu dá a ultimate na r3 | Tasks | Pending |
| VEU-04 | P1: O Baú do Véu dá a ultimate na r3 | Tasks | Pending |
| SAN-01 | P1: Santuário Malevolente corta o que o jogador acerta | Tasks | Pending |
| SAN-02 | P1: Santuário Malevolente corta o que o jogador acerta | Tasks | Pending |
| SAN-03 | P1: Santuário Malevolente corta o que o jogador acerta | Tasks | Pending |
| SAN-04 | P1: Santuário Malevolente corta o que o jogador acerta | Tasks | Pending |
| SAN-05 | P1: Santuário Malevolente corta o que o jogador acerta | Tasks | Pending |
| SAN-06 | P1: Santuário Malevolente corta o que o jogador acerta | Tasks | Pending |
| JAC-01 | P1: Jackpot aposta num estado de poder | Tasks | Pending |
| JAC-02 | P1: Jackpot aposta num estado de poder | Tasks | Pending |
| JAC-03 | P1: Jackpot aposta num estado de poder | Tasks | Pending |
| JAC-04 | P1: Jackpot aposta num estado de poder | Tasks | Pending |
| JAC-05 | P1: Jackpot aposta num estado de poder | Tasks | Pending |
| JAC-06 | P1: Jackpot aposta num estado de poder | Tasks | Pending |
| AMP-01 | P1: Amplificação de Domínio arma o lutador | Tasks | Pending |
| AMP-02 | P1: Amplificação de Domínio arma o lutador | Tasks | Pending |
| AMP-03 | P1: Amplificação de Domínio arma o lutador | Tasks | Pending |
| AMP-04 | P1: Amplificação de Domínio arma o lutador | Tasks | Pending |
| AMP-05 | P1: Amplificação de Domínio arma o lutador | Tasks | Pending |
| AMP-06 | P1: Amplificação de Domínio arma o lutador | Tasks | Pending |
| DNV-01 | P2: O Domínio sobe ao Nv 2 e ao Nv 3 | Tasks | Pending |
| DNV-02 | P2: O Domínio sobe ao Nv 2 e ao Nv 3 | Tasks | Pending |
| DNV-03 | P2: O Domínio sobe ao Nv 2 e ao Nv 3 | Tasks | Pending |
| DNV-04 | P2: O Domínio sobe ao Nv 2 e ao Nv 3 | Tasks | Pending |
| DNV-05 | P2: O Domínio sobe ao Nv 2 e ao Nv 3 | Tasks | Pending |
| DHD-01 | P1: A barra e o Domínio aparecem na tela | Tasks | Pending |
| DHD-02 | P1: A barra e o Domínio aparecem na tela | Tasks | Pending |
| DHD-03 | P1: A barra e o Domínio aparecem na tela | Tasks | Pending |
| DHD-04 | P1: A barra e o Domínio aparecem na tela | Tasks | Pending |
| DHD-05 | P1: A barra e o Domínio aparecem na tela | Tasks | Pending |
| DHD-06 | P1: A barra e o Domínio aparecem na tela | Tasks | Pending |
| DDB-01 | P2: Debug e snapshot do Domínio | Tasks | Pending |
| DDB-02 | P2: Debug e snapshot do Domínio | Tasks | Pending |
| DDB-03 | P2: Debug e snapshot do Domínio | Tasks | Pending |

**Coverage:** 47 total, 47 mapped to tasks, 0 unmapped (mapa em `tasks.md`, seção "Requirement Coverage").

---

## Testes e smokes

**Testes novos** (arquivo novo para todo sistema novo; nenhum teste da lista de exceções do `max-lines` cresce):
- `tests/core/domain.test.ts` (DOM-01 a DOM-05, com o ritmo de referência de DOM-04), `tests/core/domainActivation.test.ts`
  (DOM-06 a DOM-10: recusas, raio com a borda inclusa, frações por tipo de alvo), `tests/core/sanctuary.test.ts`
  (SAN-01 a SAN-05, com a limpeza de 4 comuns na r4 e na r19 do SAN-03), `tests/core/jackpot.test.ts` (JAC-01 a
  JAC-06, com a chance exibida da piedade), `tests/core/domainEffects.test.ts` (AMP-01 a AMP-05),
  `tests/core/veilChest.test.ts` (VEU-01 a VEU-04, mesmo sorteio na mesma seed), `tests/core/domainShop.test.ts`
  (DNV-01 a DNV-05, inclusive a entrada do catálogo e a compra: o `tests/core/shop.test.ts` tem 368 linhas efetivas e
  não recebe caso novo) e `tests/data/domains.test.ts` (números da seção 5.6 e chaves da `PALETTE`).
- Cada limiar testado nos dois lados (L-010): esvaziamento em 7999/8000 ms; raio de 320 e 96 px com o alvo na borda e
  1 px fora; 4 e 5 gatilhos em 1000 ms (999/1000/1001 ms); Corte do Mundo em 35% e logo acima; chance no teto de 60%
  com e sem Riichi; loja da r7 e da r8; Nv 2 → 3 e o Nv 3 no teto; armadura com e sem `armorPierce`.
- O adaptador que repassa o número ao motor tem teste próprio, não só o puro (L-043): o raio e a fração que o
  `domainDirector` usa para escolher os alvos, o `FINISHER_HITSTOP_MS` que ele passa ao `EffectsDirector` e a largura
  da barra que o `EnergyHud` desenha a partir da carga.

**Testes atualizados:** `debugApi` (campos novos do snapshot), `bossReward` (o prêmio adiado de DNV-02), `choicePanel`
da F30 (páginas `veu` e `bauChefe`), `cast` (recusa `domain`), `statSheet` (Domínio neutro e ×1,25), `enemyGuard`
(`armorHolds`) e o teste do `techStats` da F30 (custo sem piso no Jackpot). Os streams `chestRng` e `domainRng` vão para
`tests/core/domainStreams.test.ts` (novo), porque o `run.test.ts` e o `enemyBrain.test.ts` estão na lista de exceções do
`max-lines` e não crescem.

**Smoke novo:** `domain.smoke.mjs`, com `?debug&hd=1&area=modular&seed=1`: ativação e recusa (DOM-06 a DOM-09), Baú do
Véu na r3 (VEU-01 a VEU-03), um cenário por Domínio (SAN, JAC, AMP) e a página `bauChefe` na r5 (DNV-02).

**Smokes que rodam junto:** `fight`, `impact`, `feel`, `tech`, `defense`, `kokusen`, `hud`, `shop`, `run-loop`, `boss`,
`world-boss`, `enemy-guard`, `telegraph` (lê o `armored:`), `enemy-react`, `power` (F29) e `shop-axes` (F30).

---

## Success Criteria

- [ ] Numa run normal, o usuário ganha o Domínio no fim da r3, ativa com `P` logo na r4 (barra cheia do baú), enche a
      barra de novo lutando em cerca de 46 s e ativa outra vez.
- [ ] Os três Domínios jogam diferente na mesma seed: cortes em cadeia, aposta com piedade visível e corpo a corpo que
      atravessa guarda e armadura.
- [ ] Na r4 e na r19, a ativação tira a mesma fração do HP máximo de todo alvo no raio (40% do comum no Santuário e no
      Jackpot, 25% na Amplificação), interrompe o ataque de quem estava no compromisso e mostra o nome do Domínio, o
      `ImpactFrame`, as linhas de foco e o hitstop do finalizador; o Santuário Nv 1 fecha um grupo de 4 comuns no ritmo
      de referência (SAN-03).
- [ ] A ativação que mata os últimos inimigos da rodada não joga o Domínio fora: o giro do Jackpot termina com
      resultado na travessia.
- [ ] Gate verde; `domain.smoke.mjs` e os smokes da lista verdes; a `TestScene` sem linha líquida a mais.
- [ ] A barra e os efeitos dos três Domínios conferidos no jogo em HD, em movimento e nos dois lados.
