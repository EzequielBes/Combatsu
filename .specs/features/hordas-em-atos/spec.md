# Hordas em atos - Specification

## Problem Statement

A rodada de hoje é uma onda **finita** de `6 + 2·(r−1)` lutadores (teto 20), com 5 a 8 vivos, um estouro de 3 e
depois 1 a cada 1,5 s **só quando há vaga** (`core/waves.ts:70-147`, `WAVE` em `tuning.ts:164-174`): com o teto cheio
nada nasce, e a horda parece "só spawnar quando alguém morre". Não há volume (20 lutadores vivos seriam ilegíveis), não
há elite, a rodada não muda de cara entre a r1 e a r30 e o céu é sempre o mesmo. A F38
(`docs/plano-builds-e-habilidades.md`, linha F38 da seção 6 e seção 5.9; absorve a F27 de
`docs/plano-cenario-rejogabilidade-hordas.md`) entrega o diretor de horda por orçamento de pressão, o inimigo de
**enxame** (o volume), as **elites com afixo** e o **Selo de elite**, o fim da rodada por **cota de abates**, a
**rodada só de enxame**, a **fenda** 0,6 s antes de cada nascimento, os **atos I a V** com a luz do céu e a câmera da
arena-portão, e o **Véu Rompido** a partir da r21.

A dificuldade só sobe com ferramenta nova na mesma fase (regra da seção 6): o Selo dá ponto livre a cada elite, o
enxame morre em 1 ou 2 golpes e alimenta a barra de Domínio e os talentos de abate, e os eixos de área da F33 passam a
ter alvo em quantidade.

A F38 vem depois da F33 na fila e usa o que as fases anteriores entregam:
- F29: `Hit.band` (`'chip' | 'micro'`) e `core/hitBand.ts` (nenhum hitstop em massa); `game/DamageNumbers.ts` com o
  teto de 12 vivos; o `StatsDirector` e o tipo de snapshot em arquivo à parte (`game/powerSnapshot.ts` é o molde).
- F30: a escala do inimigo (`DIFFICULTY.hpPerRound` 0,06 e `damagePerRound` 0,05, ESC-01) e o `hpMul` da rodada
  (`multipliersFor`, `core/difficulty.ts:41-48`); o `expectedIncome` (`core/economy.ts:10-18`) com as metas da seção
  3.3; a cláusula "atravessa elite sem detonar" da Perfuração 3, que fica no dado até a F38.
- F31: as frações da ativação do Domínio na elite (20% e 12% do HP máximo), que ficam no dado até a F38.
- F32: o arquétipo e os afixos do chefe (a rodada de chefe segue dela), o Invocador (os comuns invocados não entram na
  cota) e o contorno de 1 px por cor de afixo (BRD-03, `outlineKeyAt` em `core/bossAffix.ts`), que a elite reaproveita.
- F33: a página `livre` do `ChoicePanel` (CHC-06, "selo da F38") e o `choiceDirector`; a cláusula "puxa elite" do
  Puxão 3 do Azul.

Código de hoje que a F38 muda (conferido): `core/waves.ts` (`WaveSpawner`, `maxAliveFor`, `waveSize`), `core/run.ts`
(o `spawner` da rodada, linhas 58 e 284-311, e os streams com salt, 296-307), `scenes/test/spawner.ts`
(`spawnFromCommand`, `pickEnemySpawnPoint`, o `curseSmoke` por inimigo da linha 103), `scenes/test/runDirector.ts`
(`applyRunCommand`, banners de `roundStart` e `roundCleared`), `scenes/test/combat.ts` (`onConnect` conta energia,
combo e `build.onMeleeHit` por alvo, linhas 83-110; `onEnemyDied`), `scenes/test/techDirector.ts:18-20` (a lista de
alvos das técnicas), `scenes/test/camera.ts` (`WORLD_ZOOM` = `zoom(1.5)`, o pulso de zoom volta a ele na linha 65),
`game/techFx/KokusenFx.ts:235` (volta a `zoom(1.5)` fixo), `scenes/test/areaDirector.ts:120-140` (`rebuild`, limites da
câmera), `scenes/test/arena.ts` (o véu da fase do chefe, `PALETTE.r` com alpha na profundidade −7), `TestScene.ts:420-425`
(o `hud.setRun` com `alive + queued`) e `game/Hud.ts:285-293` (`setRun`, texto "Inimigos: N").

## Goals

- [ ] A horda nasce por orçamento de pressão, sem esperar abate, até dois tetos (lutadores e corpos) que crescem com a
      rodada; da r6 em diante o volume vem do enxame e os lutadores ficam em no máximo 14 por rodada.
- [ ] A rodada fecha por cota de abates, com `Abates: k/q` no HUD; a renda esperada de fragmentos por rodada fica igual
      à de hoje (teste puro, r1 a r40).
- [ ] Todo nascimento é anunciado por uma fenda no mesmo ponto 600 ms antes.
- [ ] Da r8 em diante cada rodada comum tem 1 elite (sem afixo no ato II, 1 afixo no III, 2 do IV em diante), e cada
      elite morta dá 1 Selo, que vira uma página de ponto livre na konbini.
- [ ] A r13 e a cada 5 rodadas depois dela são só de enxame, rápidas, e dão 1 Selo ao fechar.
- [ ] Cada ato tem a sua luz no fundo e a sua regra nova; a arena do chefe abre o zoom para 1,8 (HD) e trava a câmera.
- [ ] Da r21 em diante, cada ato soma uma regra do Véu e ×1,15 de HP sem teto.
- [ ] Com 30 ou mais corpos Matter vivos o jogo segue fluido, medido no smoke antes de fixar o teto de corpos.
- [ ] A `TestScene` não ganha nenhuma linha efetiva líquida na F38, e o `Hud.ts` não cresce.

## Passos e commits

Na ordem. Refatoração é passo próprio, com os smokes iguais; a mudança de comportamento vem no passo seguinte. Cada
passo termina jogável.

| Passo | O que entra | `TestScene` (efetivas) |
| --- | --- | --- |
| 0. **Refatoração, com os smokes iguais** | `scenes/test/hordeDirector.ts` assume o tratamento do comando `spawn` (hoje no `runDirector`) e o `hud.setRun` da `TestScene` (linhas 420-425); o `Run` passa a falar com a onda por uma interface (`RoundHorde`) que o `WaveSpawner` de hoje implementa | +2 (import e campo do diretor) −2 (as 3 linhas do `setRun`, 423-425, viram a linha `this.horde.update(dt)`) = 0 |
| 1. **Diretor por orçamento, cota e fenda** | `core/horde.ts` (orçamento, dois tetos, cota, escolha do tipo), stream `hordeRng`, comando `rift` e a `RiftFx`, rótulo `Abates: k/q`; o ato I fica com a composição de hoje | +0 |
| 2. **Enxame e medição** | `core/swarm.ts`, `game/SwarmEnemy.ts`, folha provisória `enemy-swarm`, composição da r6 em diante, drop calibrado, smoke de desempenho; o teto de corpos é fixado no fim do passo | +0 |
| 3. **Elites e Selo** | `core/elite.ts`, `data/elites.ts`, os 4 afixos, contorno e rótulo, Selo como origem da página `livre`, aviso na r7 | +0 |
| 4. **Rodada de enxame e regras do ato IV** | r13, r18, r23...; bruto pesado e mais armados no ato IV | +0 |
| 5. **Atos: luz e arena-portão** | `data/acts.ts`, o véu de luz do ato, o banner do ato, zoom e trava da câmera na arena do chefe | +0 |
| 6. **Véu Rompido** | regras do Véu e ×1,15 de HP por ato da r21 em diante | +0 |

## Out of Scope

| Feature | Reason |
| --- | --- |
| Arte final do enxame | O usuário gera os quadros no Nano Banana; a F38 entrega a folha provisória legível, a lista de quadros e o ponto de troca para o atlas (ENX-14) |
| Quadros novos para a elite | A elite usa os quadros do lutador com escala e contorno; arte própria fica para uma feature de arte |
| Graus de maldição, eventos na travessia, rotas e seed diária | F26, depois da F38; os Graus reaproveitam as regras do Véu (VRB) |
| Afixos do chefe, arquétipo pela seed, Portador de Dedo | F32; a rodada de chefe segue como a F32 deixar |
| Rodada de chefe com horda | A rodada de chefe continua só o chefe (mais os invocados da F32, fora da cota) |
| Fenda para o chefe | O chefe tem entrada própria (banner e barra, BOSS-03); não ganha fenda |
| Selo como objeto no chão | O Selo é creditado no abate; um item com tempo de vida poderia sumir e tirar o ponto do jogador |
| Explosão da elite ferindo outros inimigos | A explosão é perigo para o jogador; dano em inimigo pede regra de fogo amigo que nenhuma fonte pede |
| Guarda, estrutura, finalizador e ragdoll no enxame | O enxame é o volume que morre em 1 ou 2 golpes; essas regras são dos lutadores |
| Combo aéreo ou juggle no enxame | Não existe no jogo (seção "Base conferida" do plano) |
| Temas, módulos ou fundos novos por ato | O ato muda a luz sobre os temas da F22; módulo novo muda o sorteio por seed (F23) |
| Arena do chefe mais larga | A arena fica com as 50 colunas de hoje (`santuario.ts`, 48 + parede + selo) |
| Escolha de dificuldade e run com final | A run segue sem fim; o Véu Rompido é o sumidouro (seção 3.3) |
| Recorde e resumo da run | F39 (`recorde-e-recomeco`); a F38 só garante que todo abate conta em `run.kills` |
| Áudio | O jogo não tem áudio |
| Versão antiga (`?hd=0`) | Não recebe trabalho novo; os smokes antigos só não podem quebrar |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| 3 técnicas + Domínio, pool de 7 vagas, arma imbuída, escala na F30 (decisões 1, 3, 5 e 6 da seção 7) | Valem; na F38 só a escala da F30 (lida pelo `hpMul` e pelo `damageMul`) mexe no código | Confirmadas pelo usuário | y |
| Demais decisões da seção 7 | Seguem a recomendação do plano | O usuário mandou seguir a recomendação | y |
| Nada automático | A horda são inimigos; nenhum efeito do jogador age sozinho. O Selo é creditado no abate da elite (prêmio, não ataque) e vira escolha na konbini | Esclarecimento do usuário no topo do plano | y |
| Fim da rodada | Cota de abates (decisão 2 da F27, recomendada) | Recomendação do plano, que o usuário mandou seguir | y |
| Prefixos dos requisitos | HRD (diretor, cota e HUD), FEN (fenda), ENX (enxame), ELT (elite e Selo), ESP (rodada de enxame), ATO (atos, luz e regras por ato), PRT (arena-portão), VRB (Véu Rompido), HPF (desempenho), DBH (debug e snapshot) | O validador só aceita `CAT-NN`; nenhum desses prefixos existe nas specs nem no código (conferido; `VEU` é da F31) | y |
| "Para de gastar ao bater a cota" | O diretor nunca abre mais fendas do que a cota: nascidos mais fendas abertas ≤ cota. A rodada fecha quando os abates chegam à cota, que é quando o último nascido cai | Com nascimentos até os abates baterem a cota, sobrariam até 32 vivos depois dela e a rodada teria uma cauda longa; assim a contagem do HUD fecha exata | n |
| Cota por rodada `q(r)` | Rodada comum: `L(r) + S(r) + E(r)`, com lutadores `L(r) = min(6 + 2·(r−1), 14)`, enxame `S(r) = 0` até a r5 e `min(8 + 3·(r−6), 40)` da r6 em diante, e elite `E(r) = 1` da r8 em diante. Exemplos: r1 6, r4 12, r6 22, r7 25, r8 29, r9 32, r11 38, r14 47, r19 55. Rodada de chefe: 1 (o chefe) | Ato I igual a hoje; "os lutadores continuam poucos e perigosos, e o volume vem do enxame" (seção 5.9). Números de partida, calibrados no passo 2 pelo smoke e pelo usuário | n |
| Orçamento de pressão | Taxa em pontos por segundo de jogo `min(1,5 + 0,15·(r−1) + 0,02·t, 6)`, com `t` os segundos desde o início da rodada; custo: lutador 3, cada membro do enxame 1, elite 0 (ela nasce por gatilho); orçamento inicial 9 (os 3 lutadores do estouro de hoje); orçamento guardado com teto de 12 | O F27 pede orçamento que cresce com a rodada e com o tempo dentro dela; o teto do guardado impede um estouro gigante quando o teto de vivos abre | n |
| Dois tetos de vivos | Teto de lutadores (armados inclusos) = o `maxAliveFor` de hoje (5 a 8, `?debug&maxAlive` continua mandando nele); teto de corpos (lutadores, enxame e elite) = `min(6 + 2·(r−1), HORDE.bodyCap)`, com `bodyCap` provisório 32 até a medição do HPF | O teto de lutadores mantém a luta legível; o de corpos é o que cresce e é o que o desempenho limita | n |
| Escolha do tipo a nascer | Quando há orçamento e vaga, o tipo sai do `hordeRng` com peso igual ao que falta de cada tipo na cota (lutador e enxame); um tipo sem vaga no seu teto fica fora do sorteio daquele quadro | Mistura os dois ao longo da rodada, sem fila fixa; mesma seed, mesma rodada | n |
| Stream novo | `hordeRng` com `seed ^ 0xc2b2ae35`, criado no `startRun` com os outros (`run.ts:296-307`) | Regra da seção 6 (sorteio novo tem stream com salt). Conferido em 15/10 contra os 10 de hoje (`run.ts:297-307`, inclusive `SHOP.rngSalt` 0x85ebca6b em `data/tuning.ts`) e os das specs: F31 `chestRng` 0xa54ff53a e `domainRng` 0x9b05688c, F32 `bossAffixRng` 0x9b05688c, F33 `SHOP.choiceSalt` 0x71374491; o `SHOP.axisSalt` da F30 ainda não tem valor, e o teste do HRD-08 é o juiz. Achado da revisão: F31 e F32 usam o mesmo 0x9b05688c, o que não toca a F38 mas precisa ser resolvido antes do merge das duas | n |
| Fenda | 600 ms de tempo de jogo entre a fenda abrir e o nascimento, no mesmo ponto; o ponto é escolhido quando a fenda abre; a fenda conta como nascida para a cota e para os dois tetos | F27 ("fenda amaldiçoada visível 0,6 s antes de nascer"); contar a fenda nos tetos impede abrir mais fendas do que cabe | n |
| Fenda fora da câmera | O lutador e a elite seguem nascendo fora da câmera (SPN-07..09, escolhido na abertura da fenda); enquanto a fenda está fora da `worldView`, uma marca de fenda aparece na borda da tela daquele lado | "Visível 0,6 s antes" com a regra de hoje de nascer fora da câmera; a marca dá a leitura sem trazer o lutador para dentro da tela | n |
| Ponto do enxame | Ponto `E` no chão ou fenda aérea 96 px acima de um ponto `E` (30% de chance, pelo `hordeRng`), a pelo menos 160 px na horizontal do centro do player na abertura da fenda, dentro do `SPAWN.reachPx` no modular; sem ponto a 160 px ou mais, o mais distante. O enxame pode nascer dentro da câmera | F27: "pelas duas bordas e caindo do alto"; a fenda torna o nascimento à vista justo | n |
| Grupo do enxame | Uma fenda por grupo; o grupo tem 4 membros no ato II, 5 no III e 6 do IV em diante (6 na rodada de enxame), cortado pelo que falta na cota de enxame e pela vaga no teto de corpos | "Vem em grupo" (seção 5.9 e F27) | n |
| HP do enxame | `clamp(round(12 × hpMul), 12, 20)`, sem o ×1,15 do Véu | "Enxame: 12 a 20 de HP" e "morre em 1 ou 2 golpes" (seção 5.9); sem o teto, o `hpMul` da F30 levaria a 36 | n |
| Corpo do enxame | Retângulo de 18 × 24 px (o lutador é 22 × 36, `textures.ts:84`), com o mesmo filtro de colisão do inimigo (`Filters.enemy`: só terreno e hitbox) | A hitbox de chão mais alta é a do `chuteAlto` (`offsetY −10`, altura 20 sobre o centro do player: a base fica 18 px acima do chão, `data/moves.ts:148-160`); com 18 px ou menos ele passaria por cima. 24 deixa 6 px de folga e cabe na célula da folha | n |
| IA do enxame | Persegue no eixo x a 95 px/s × a escala de velocidade da rodada; cada membro de um grupo mira um deslocamento próprio de ±14 px por posição no grupo, mais um desvio fixo de `((id mod 5) − 2) × 3` px; entra no preparo com o player a até 40 px na horizontal e no mesmo chão (diferença vertical dos centros até 24 px); a mordida tem preparo de 300 ms (o corpo pisca em `w`), ativa por 120 ms com investida curta de 48 px, e descanso de 1000 ms; não sobe plataforma por conta própria (anda só em x, como a `EnemyAI`) | Inimigo pequeno e rápido, legível; mais lento que o player (`runSpeed` 220; o enxame chega a 166 com a escala de 1,4 e o `enxameVeloz`) para o jogador poder sair do grupo. Sem o desvio, grupos diferentes miram os mesmos deslocamentos e os membros se empilham no mesmo pixel (o par inimigo-inimigo não colide): três parecem um, e o jogador erra a conta de quantos faltam. Sem a regra do mesmo chão, o membro embaixo de uma plataforma morderia o player em cima dela | n |
| Mordida | `round(5 × damageMul)` de dano, força 2, altura `low` **sem** `unblockable` (bloqueável e aparável, desviada pelo pulo, não pelo agachar); o preparo pisca `w` (a cor de "bloqueável"); a mordida que conecta ou é bloqueada pede só o hitstop micro da F29 (`microHitstopMs` sob um `MicroBudget` próprio), nunca os 50 ms do `HITSTOP_MS.light`; o parry mantém o `parryHitstopMs` de hoje | Fraca sozinha, perigosa em grupo. Revisão: como golpe `white` (alto) ela seria anulada por segurar o agachar (`resolveIncomingHit`, `core/defense.ts`: `ducking && height === 'high'` evita), e um bicho de 24 px mordendo "alto" não se lê; baixa e bloqueável, guarda, parry e Contra seguem valendo e a resposta legível ao grupo é pular ou bater. Com 3 a 5 mordidas por segundo, 50 ms de hitstop cada congelariam o jogo um quarto do tempo | n |
| Limitador do enxame | No máximo 3 membros em preparo ou mordida ao mesmo tempo e 200 ms entre dois preparos, separado do `AttackGate` dos lutadores (2 vagas, `tuning.ts:186`) | Sem limite, 20 mordidas no mesmo quadro seriam injustas; no `AttackGate` o enxame roubaria as vagas dos lutadores | n |
| Parry no enxame | O parry da mordida empurra o membro 40 px e o atordoa por 500 ms; a janela de Contra do player abre como hoje | A defesa do player não muda; o membro não tem estrutura para quebrar | n |
| Reação e morte do enxame | Acerto aceito causa 150 ms de atordoamento e o empurrão do golpe; a morte toca 3 quadros de dissolução em 300 ms, sem ragdoll; o corpo sai da física no quadro da morte | Ragdoll cria vários corpos Matter por morte (`Ragdoll.ts`), o que o desempenho com 30+ corpos não aguenta | n |
| Contagem por golpe no enxame | Os membros do enxame acertados por um mesmo golpe do moveset somam juntos no máximo 1 ganho de energia, 1 acerto de combo e 1 `build.onMeleeHit`; o impacto amaldiçoado inteiro sai só no primeiro membro e os outros mostram a faísca pequena | Hoje o `onConnect` conta por alvo (`combat.ts:96-103`): um chute num grupo de 6 daria 6 ganhos de energia e 6 acertos de combo. Nos lutadores nada muda | n |
| Renda com o enxame | Cada membro solta `floor(m)` fragmentos mais 1 com chance `m − floor(m)`, com `m(r) = max(0, ((W(r) − L(r)) · μ(r) − E(r) · (8 + a(r) · 2)) / S(r))`, `W(r)` o `waveSize` de hoje, `a(r)` o `armedChance(r)` de hoje (teto 0,5) e `μ(r) = 3 + a(r) · 2` a média real do drop do lutador (2 a 4 mais o `armedBonus` 2 do armado); a elite solta 8 fragmentos fixos (mais o bônus de armado se for armada); o lutador segue 2 a 4 | "O enxame da F38 é calibrado para não mudar o total" (seção 3.3): a média real por rodada fica `W(r) · μ(r)`, a de hoje com o bônus de armado; o `expectedIncome` (que ignora o bônus) não muda. Revisão: a conta só com `3·W` tirava ~6% da renda real da r8 à r15, porque 6 lutadores a menos levam junto o bônus de armado. No ato IV o teto de armado sobe para 0,65 e a renda real fica um pouco acima da de hoje, prêmio da dificuldade | n |
| Cura e Elixir com o enxame | O membro do enxame sorteia cura com `k(r) × chance efetiva de cura` e Elixir com `k(r) × e(r)`, `k(r) = (W(r) − L(r) − E(r)) / S(r)` e `e(r) = a(r) · 0,2 + (1 − a(r)) · 0,04` (a chance média de Elixir do lutador, `ELIXIR`); nunca solta ferramenta; a elite sorteia cura e Elixir como um lutador armado | A média de curas e de Elixires por rodada fica a de hoje (`W(r) × chance`). Revisão: sem o Elixir no enxame, 6 lutadores a menos por rodada cortavam ~22% dos Elixires da r8 em diante, justo quando a run aperta; com `k(r)` a chance por membro fica entre 0,015 e 0,04 nas rodadas comuns (0,08 na rodada de enxame), e o total por rodada é o de hoje, então não há Elixir em massa | n |
| Elite: quando | Uma por rodada comum da r8 em diante (rodada de enxame não tem); a fenda dela abre no primeiro quadro em que os abates chegam a `ceil(0,4 × q)` e há vaga no teto de corpos | "~1 por rodada a partir da r8" (seção 3.1). O plano estima ~1 Selo até a r10 e ~5 entre a r11 e a r20; aqui dá 2 e 7 (ver a linha seguinte) | n |
| Selos a mais que a conta da seção 3.3 | Aceito: 2 Selos até a r10 e 7 da r11 à r20 (contra ~1 e ~5), mais 1 por rodada de enxame (r13 e r18). A meta "build fechada entre a r18 e a r22" do `expectedIncome` é o juiz; se a build fechar antes da r18, o primeiro ajuste é a elite começar na r9 | O plano diz "~1 por rodada" na tabela de fontes e ~1/~5 na conta; a regra de 1 por rodada é a que o jogador lê | n |
| Elite: corpo e números | Um lutador (`Enemy`) com HP `round(60 × hpMul × 2,5)` (o ×1,15 do Véu entra no `hpMul`), mesmo corpo físico (22 × 36), sprite em escala 1,2, guarda, estrutura e finalizador como o lutador | "Elite: ×2,5 de HP" (seção 5.9); trocar o corpo mexeria nas hitboxes e nos testes de alcance | n |
| Afixos por ato | Ato II (r8, r9): nenhum; ato III: 1; ato IV em diante: 2 distintos; sorteados pelo `hordeRng`, uniformes entre os 4 | Tabela de atos da seção 5.9 ("1ª elite" no II, "elites com afixo" no III, "2 afixos" no IV) | n |
| Escudo | Escudo de `round(0,4 × maxHp)` que toma o dano antes do HP; golpe forte (`strength: 'heavy'`) tira o dobro do escudo; o que passa do escudo vai para o HP; não regenera; ao quebrar, evento `shieldBreak:<id>` e faísca `C` | Lê como "quebre primeiro com golpe forte"; número exato para o teste | n |
| Explosivo | Na morte, um anel de 72 px de raio pisca por 700 ms de tempo de jogo no ponto da morte (o relógio para no hitstop e anda a 30% na câmera lenta, como o player); depois explode: o player com o centro a até 72 px (borda inclusa) e sem invulnerabilidade leva `round(12 × damageMul × 1,5)` como golpe `red` (imbloqueável) | O F27 só dá o nome; 700 ms é mais que a esquiva (DOD) e menos que o descanso do lutador. Em tempo real, o hitstop do golpe que mata (90 ms no forte, 150 no finalizador) comeria parte da janela de fuga justo quando o player está colado na elite | n |
| Rápido | `chaseSpeed` ×1,4, `windupMs` ×0,8 (450 → 360 ms) e `restMs` ×0,6 (800 → 480 ms) | Mais pressão sem preparo ilegível (360 ms continua acima do preparo da mordida, 300) | n |
| Regenerador | Depois de 2000 ms sem tomar dano, cura `max(1, round(0,008 × maxHp))` a cada 200 ms (4% por segundo) até o máximo, com pulso `G` a cada cura; todo dano, chip incluso, zera o relógio | Pede pressão contínua; o chip zerar o relógio dá uso ao Azul e às queimas | n |
| Leitura da elite | Contorno de 1 px na cor do afixo (escudo `c`, explosivo `a`, rápido `A`, regenerador `G`; sem afixo `U`), alternando a cada 600 ms com 2 afixos, pelo mesmo passe do BRD-03 da F32; ao nascer, texto flutuante "Elite · Afixo · Afixo" acima da cabeça por `RUN.bannerMs`; o escudo aparece como trecho `c` sobre a barra de vida do `EnemyHud` | Toda cor da `PALETTE` (ART-01); reaproveita o contorno do chefe | n |
| Gênero dos afixos | Feminino, concordando com "Elite": Escudada, Explosiva, Rápida, Regeneradora | O rótulo é "Elite · Rápida · Explosiva" | n |
| Selo | O abate da elite (por qualquer fonte) põe 1 página `livre` na fila do `choiceDirector` (CHC-06 da F33) com origem `selo` e mostra o texto flutuante "+1 Selo" no ponto da morte por `RUN.bannerMs`; as páginas de Selo entram depois das de maestria (rank 30) e, portanto, depois do Baú do Véu e do baú do chefe (CHC-02 da F33) | CHC-06 já reserva a origem; a ordem põe o ponto ganho na luta perto dos outros pontos grátis. Revisão: sem o texto no abate, o prêmio só aparece na konbini, uma rodada depois, e o momento de perigo com prêmio não se sente na hora | n |
| Selo sem eixo livre | Se a página do Selo seria pulada pelo CHC-08 (nenhum item com eixo abaixo do teto), o Selo vira `15 × fragmentValue(r)` fragmentos na carteira, com o banner "Selo: +N fragmentos" | Perder o prêmio no fim da run seria punir a build cheia; 15 é o drop do chefe (`ECONOMY.bossFragments`) | n |
| Aviso da 1ª elite | A faixa "Rodada 7 concluída" vira "Rodada 7 concluída · Próxima: elite"; a da rodada anterior a uma rodada de enxame vira "… · Próxima: rodada de enxame" | "1ª elite (r8, avisada na r7)" (seção 5.9); a faixa de hoje já fica até a próxima rodada (RHUD-03) e não pede componente novo | n |
| Rodada de enxame | Na r13 e a cada 5 depois dela (r18, r23, ...; nunca múltiplo de 5); só enxame, `S = min(30 + 2·(r−13), 60)`, taxa do orçamento ×2, orçamento guardado com teto 18, grupos de 6; banner "Rodada de enxame!"; ao fechar, 1 Selo, e a faixa de fechamento termina em " · +1 Selo" | Seção 5.9 (r13) e F27 ("a cada N rodadas, só enxame, rápida, com recompensa"); a rodada não tem elite, e o Selo do fechamento mantém o ritmo de 1 por rodada | n |
| Ato | `ato(r) = ceil(r / 5)`: I r1-r5, II r6-r10, III r11-r15, IV r16-r20, V r21-r25, e um ato a cada 5 rodadas depois; o chefe da última rodada do ato é o portão | Tabela da seção 5.9 | y (plano) |
| Luz do ato | Um véu da cor do ato com alpha fixo, preso à câmera, por cima das camadas pintadas do fundo (`BakedLayer`) e por baixo do terreno: ato I `a` 0,10 (entardecer), ato II nenhum (a noite é a arte de hoje), ato III `S` 0,12 (madrugada com névoa), ato IV `r` 0,14 (véu vermelho), ato V em diante `t` 0,18 (véu rompido); profundidade −8, abaixo do véu da fase do chefe (−7, `arena.ts:12-13`); a konbini não tem véu | O plano diz "tint no `BakedLayer`", mas o ART-01 proíbe tint multiplicativo e só permite mistura por transparência de cores da paleta (spec `visual-e-jogabilidade`, Assumptions); o véu do chefe já usa esse molde. Um objeto por área, nenhum custo na pintura | n |
| Regras novas por ato | Ato I: lutadores e armados raros (hoje). Ato II: enxame (r6) e 1ª elite (r8). Ato III: elite com afixo e rodada de enxame (r13). Ato IV: o lutador de aparência `bruto` vira pesado (HP ×1,3 e golpe `red` quando não está armado com porrete) e a chance de armado sobe o teto de 0,5 para 0,65; elites com 2 afixos. Ato V em diante: Véu Rompido | Tabela da seção 5.9 ("mais armados e brutos"); hoje o `bruto` só muda a aparência (`attackKindFor`, `core/attackKind.ts:14-17`) | n |
| Banner do ato | No 1º `roundStart` de cada ato a partir do II, a faixa "Rodada N" vira "Rodada N · Ato X"; do V em diante, "Rodada N · Véu Rompido: <regra>" | O jogador precisa ler que algo mudou; a faixa já existe | n |
| Câmera da arena | Na área de chefe, o zoom base vira `zoom(1.35)` (1,8 no HD, onde o de hoje é `zoom(1.5)` = 2,0; 1,35 na versão antiga), aplicado no `rebuild` durante o fade; a câmera não segue o player na vertical (a borda de baixo da vista fica na borda de baixo da área) e na horizontal fica entre a borda de fora do selo da esquerda e a do selo da direita | "O zoom abre de 2 para 1,8; a câmera trava nas bordas do selo" (seção 5.9). A arena tem 1600 px e a vista a 1,8 tem ~711 px, então a trava horizontal é a dos selos e a vertical é o que dá o enquadramento de sala | n |
| Volta ao zoom base | Todo caminho que hoje volta a `WORLD_ZOOM`, `zoom(CAST_FX.zoomBase)` ou `zoom(1.5)` (pulso de zoom `camera.ts:65`, conjuração `camera.ts:86-88`, finalizador `TestScene.ts:449`, Kokusen `KokusenFx.ts:235`) volta ao zoom base atual | Sem isso o primeiro golpe forte na arena devolveria o zoom de 2,0 | n |
| Véu Rompido | Do ato V em diante, cada ato soma 1 regra, na ordem de uma permutação das 4 sorteada pelo `hordeRng` no início da run: `enxameVeloz` (enxame ×1,25 de velocidade), `eliteDupla` (2ª elite no gatilho de `ceil(0,7 × q)`, com o seu Selo), `guardaFirme` (chance de guarda do lutador ×1,5) e `semTregua` (taxa do orçamento ×1,3 e teto do guardado ×1,5); depois da 4ª, nenhuma regra nova | O plano diz "cada ato soma 1 regra de Grau", mas os Graus são da F26 (depois); a F38 define as regras e a F26 as reaproveita | n |
| HP do Véu | Do ato V em diante, o `hpMul` do lutador e da elite é o da F30 × `1,15^(ato − 4)`, sem teto (r21: 2,2 × 1,15 = 2,53; r26: 2,5 × 1,3225 = 3,31); o enxame não leva (fica no teto de 20) e o chefe segue a regra dele | A seção 5.9 manda começar na r21; a 3.3 fala em "a partir da r34". Vale a 5.9, que é a seção dos atos e a que a tarefa cita ("Véu Rompido na r21+"); a meta "pico da razão dano/HP entre a r20 e a r24" pede a queda logo depois da r20 | n |
| Medição de desempenho | Smoke novo `spawn-pressure-horde.smoke.mjs` (o filtro `spawn-pressure` pega os dois) mede o tempo de `__game.step(16)` com 8, 16, 24, 32 e 40 corpos vivos; `HORDE.bodyCap` fica no maior desses que tenha o p95 até 1,5× o p95 com 8 corpos, nunca abaixo de 24; o número medido vai para o `validation.md` | "Medir com 30+ corpos Matter vivos antes de fixar o teto" (F27); comparar com 8 corpos (o teto de hoje) tira a dependência da máquina | n |
| Passo de física do enxame | Um único ouvinte de `beforeupdate` para todos os membros, que aplica a velocidade a cada passo de física | L-001 (velocidade a cada passo); um ouvinte por corpo, como o `Enemy` (`Enemy.ts` construtor), multiplica o custo por 30 | n |
| Folha provisória e ponto de troca | Folha `enemy-swarm` desenhada em código em `art/hd/swarmSheet.ts`, na densidade do atlas (2 texels = 1 px, `SWARM_SCALE` 0,5), célula de 64 × 56 texels, origem no meio da base, quadros `enxame-idle-0..1`, `enxame-move-0..3`, `enxame-windup-0`, `enxame-bite-0`, `enxame-hit-0`, `enxame-fall-0`, `enxame-die-0..2`; a troca é um import em `art/index.ts` para `art/hd/atlas/swarmSheet.ts`, gerado pelo `tools/sprite-atlas.mjs` de `assets/enxame/quadros/` e `assets/enxame/atlas.json` com os mesmos nomes. O sprite do membro fica na profundidade −1: abaixo dos lutadores (0, e 2 no ataque, `EnemyAnimator.ts:116`) e do player (1), acima da fenda (−4) | Mesmo caminho do dorminhoco (`sleeperSheet.ts`); a lista de quadros e a célula servem de molde para o prompt do Nano Banana. A profundidade garante que o preparo de um lutador nunca fique escondido atrás de um bolo de enxame (Goal "nunca perde de vista os lutadores") | n |
| Parâmetros de debug novos | `quota=<n>` (inteiro ≥ 1, a cota de toda rodada comum), `bodyCap=<n>` (inteiro ≥ 1), `swarm=0` (sem enxame; a cota perde a parte dele), `swarmBurst=<n>` (inteiro de 1 a 60: abre na 1ª atualização da rodada fendas com n membros, fora do orçamento e dos tetos), `swarmBite=0` (os membros perseguem mas nunca entram no preparo), `elite=none\|<afixo>[,<afixo>]` (toda rodada comum tem 1 elite já na 1ª fenda, com esses afixos), `veu=<regra>[,<regra>]` (ordem das regras do Véu); inválido é ignorado; o stream é consumido igual com ou sem eles | Os smokes precisam montar a horda sem jogar 13 rodadas, e medir o desempenho com corpos à vontade; mesmo padrão do `enemyVariant` (EVR-04). O `swarmBite=0` serve à medição: com 40 membros dos dois lados, a guarda só protege a frente (`attackerInFront`) e o player morreria antes dos 420 quadros; a mordida custa no máximo 3 sensores (ENX-06), irrelevante para a conta de corpos | n |
| Smoke novo | `horde.smoke.mjs`, `elite.smoke.mjs`, `acts.smoke.mjs` e `spawn-pressure-horde.smoke.mjs`, com `?debug&hd=1&area=modular` | Regra de smoke novo do projeto | y |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: A horda nasce por pressão e fecha por cota ⭐ MVP

**User Story**: Como jogador, quero que os inimigos venham sem esperar eu matar alguém e que a rodada acabe quando eu
bater a cota mostrada no HUD, para a luta ter ritmo de horda e eu saber quanto falta.

**Why P1**: É o motor da F38; enxame, elite e rodada especial são tipos e regras que este diretor gasta.

**Acceptance Criteria**:

1. HRD-01: The horde director SHALL live in a pure module (`src/core/horde.ts`) with no `phaser` import, and the `Run` SHALL use it in place of the `WaveSpawner` through the same counters (`alive`, `kills`, `remaining`, `cleared`, `enemyDied`), with `enemyDied` counting every new id once (born or not, as WAVE-06/08 do today), `remaining = quota − kills`, and each live count per kind floored at 0.
2. HRD-01: WHEN step 0 is committed THEN the `spawn` command handling and the round HUD update SHALL live in `src/scenes/test/hordeDirector.ts`, the `spawn` command SHALL keep exactly today's shape `{ type, round, kind }`, `tests/core/run.test.ts` SHALL pass unchanged, and the smokes `spawn-pressure`, `run-loop`, `hud`, `boot`, `shop` and `world-traverse` SHALL pass unchanged.
3. HRD-02: The quota of a common round SHALL be `L(r) + S(r) + E(r)` with `L(r) = min(6 + 2·(r−1), 14)`, `S(r) = 0` for r ≤ 5 and `min(8 + 3·(r−6), 40)` from r6, and `E(r) = 1` from r8, giving 6 at r1, 12 at r4, 22 at r6, 29 at r8, 38 at r11 and 55 at r19.
4. HRD-02: WHILE the round is a boss round the director SHALL have quota 1, spawn only the boss, and SHALL not count the F32 summoned enemies in the quota.
5. HRD-03: WHILE the round is active the budget SHALL grow each frame by `min(1.5 + 0.15·(r−1) + 0.02·t, 6) × dt / 1000` points, with `t` the seconds of game time since the round started, and SHALL never exceed 12 stored points.
6. HRD-03: WHEN a common round starts THEN the budget SHALL be 9, and a lutador SHALL cost 3, each swarm member 1 and an elite 0.
7. HRD-04: The director SHALL keep the live lutadores (armed included, elites excluded) at or below `maxAliveFor(r)` (or `?debug&maxAlive`), and the live bodies (lutadores, swarm and elites, open rifts included) at or below `min(6 + 2·(r−1), HORDE.bodyCap)`.
8. HRD-05: The director SHALL never open more rifts in a round than the quota, counting born and open rifts, and WHEN the kills reach the quota THEN the round SHALL be cleared.
9. HRD-06: WHEN the budget covers the next unit and its ceilings have room THEN the director SHALL open its rift in that frame, with no kill needed.
10. HRD-06: WHEN a pure simulation of round 9 runs for 20 s of game time with no kill THEN the live bodies (open rifts included) SHALL reach the body ceiling of round 9 (22).
11. HRD-07: WHEN the director picks the next unit THEN it SHALL draw lutador or swarm from `hordeRng` weighted by what is left of each in the quota, leaving out a kind whose ceiling is full, and the same seed with the same kills SHALL give the same rifts.
12. HRD-08: The `hordeRng` SHALL be a stream created at run start with `seed ^ 0xc2b2ae35`, distinct from every other stream salt the `Run` uses, whether written in `core/run.ts` or read from `data/` (`SHOP.rngSalt`, `SHOP.axisSalt`, `SHOP.choiceSalt`).
13. HRD-09: WHILE the round is in act I the director SHALL spawn only lutadores, with quota equal to today's `waveSize(r)` and the first update opening exactly 3 rifts.
14. HRD-10: WHILE a common round is active the HUD round counter SHALL read `Abates: k/q` with `k` the round kills and `q` the quota, WHILE a boss round is active it SHALL read `Chefe`, and outside a round or in the effects lab it SHALL stay hidden.
15. HRD-11: For every non-boss round from 1 to 40, special rounds included, the expected fragments of the round (`L·μ + E·(8 + 2a) + m·S`, with `a = armedChance(r)` of today, `μ = 3 + 2a` and the `m(r)` of ENX-12) SHALL equal `waveSize(r) × μ` within 0.01, the expected heals SHALL equal `waveSize(r) × heal chance` and the expected Elixirs `(waveSize(r) − E) × e(r) + E × 0.2` (the `e(r)` of ENX-12), both within 0.01, and `expectedIncome` SHALL return today's values.
16. HRD-12: The F38 SHALL add no net effective line to `TestScene.ts` and no line to `game/Hud.ts`, and SHALL not grow `tests/core/run.test.ts`.

**Independent Test**: teste puro da r9 sem abate: os corpos vivos chegam a 22 em 20 s. `horde.smoke.mjs` com
`seed=1&round=9&enemyGuard=0`: o HUD lê `Abates: 0/32` e, antes do 1º abate, há mais de 3 corpos vivos; com
`quota=3&swarm=0` a rodada fecha no 3º abate.

---

### P1: Toda chegada é anunciada pela fenda ⭐ MVP

**User Story**: Como jogador, quero ver de onde o inimigo vai sair antes de ele nascer, para o nascimento perto de mim
ser justo.

**Why P1**: Com o enxame nascendo dentro da câmera, sem aviso o nascimento seria um golpe de graça.

**Acceptance Criteria**:

1. FEN-01: WHEN the director opens a rift THEN the unit (one lutador, one elite or one swarm group) SHALL be born at the same point exactly 600 ms of game time later, and SHALL not be born at 599 ms.
2. FEN-01: The rift timer SHALL stop during hitstop and in the shop, like the rest of the round.
3. FEN-02: WHILE a rift is open it SHALL be drawn at its point with colors from `PALETTE` only (`b`, `v`, `u`, `U`), growing from closed to full size in the 600 ms, as a vertical slit on the ground and a horizontal slit when aerial, and SHALL close in 150 ms after the birth.
4. FEN-03: WHILE an open rift is outside the camera `worldView` a rift mark SHALL show at the screen edge on its side, at the rift height clamped to the screen.
5. FEN-04: WHEN a swarm group is born THEN the scene SHALL create one spawn effect for the group, not one per member.
6. FEN-05: WHEN the run resets, the area is rebuilt or the area restarts (`R`) THEN every open rift SHALL be dropped without a birth.
7. FEN-06: The lutador and the elite SHALL pick the rift point by the rules of today (SPN-07..09, out of the camera with the 32 px margin) at the moment the rift opens.
8. FEN-07: The boss SHALL be born with no rift, as BOSS-03 says.

**Independent Test**: `horde.smoke.mjs`: cada inimigo novo do snapshot tem uma fenda no mesmo ponto 600 ms antes
(evento `rift:<id>` e depois `spawnFx:<id>`); com o player parado de costas, a marca de borda aparece do lado da fenda.

---

### P1: O enxame dá o volume ⭐ MVP

**User Story**: Como jogador, quero grupos de maldições pequenas que morrem em 1 ou 2 golpes, para sentir a horda sem
perder a leitura dos lutadores.

**Why P1**: Sem o enxame, a única forma de volume é encher a tela de lutadores, que fica ilegível (F27).

**Acceptance Criteria**:

1. ENX-01: The swarm rules (HP, group, AI, bite, limiter, drop) SHALL live in a pure module (`src/core/swarm.ts`) with no `phaser` import, and the swarm adapter SHALL be `src/game/SwarmEnemy.ts`.
2. ENX-02: WHEN a swarm member is born THEN its max HP SHALL be `clamp(round(12 × hpMul), 12, 20)`, giving 12 at r1 and 20 at r19.
3. ENX-02: For every round from 1 to 40 the base `chuteGiratorio` (18, no build) SHALL kill a full-HP swarm member in at most 2 hits and in 1 hit at round 1, and the base light chain `jab` → `direto` → `gancho` (6 + 7 + 9) SHALL kill one in at most 3 hits, in 2 at round 1.
4. ENX-03: WHEN a swarm rift opens THEN the group size SHALL be 4 in act II, 5 in act III and 6 from act IV, cut to what is left of the swarm quota and to the room in the body ceiling.
5. ENX-04: WHILE a swarm member is alive and not stunned it SHALL chase the player only on the x axis at `95 × speed multiplier` px/s toward the player x plus its own offset of ±14 px per position in the group plus a fixed `((id mod 5) − 2) × 3` px.
6. ENX-05: WHEN a swarm member is within 40 px of the player horizontally with at most 24 px between their centers vertically, and the swarm limiter has room, THEN it SHALL wind up for 300 ms flashing `w`, bite for 120 ms with a 48 px lunge, and rest for 1000 ms.
7. ENX-05: The bite SHALL deal `round(5 × damageMul)` with force 2 as a `low` hit without `unblockable`: the guard and the parry SHALL stop it, a jump SHALL avoid it, and ducking SHALL not.
8. ENX-05: WHEN a bite lands on the player or is blocked THEN it SHALL request only the F29 micro hitstop through a swarm `MicroBudget`, never `HITSTOP_MS.light`.
9. ENX-06: The swarm limiter SHALL allow at most 3 swarm members in windup or bite at the same time and 200 ms between two windups, apart from the lutador `AttackGate`.
10. ENX-07: WHEN the player parries a bite THEN the swarm member SHALL be pushed 40 px away and stunned for 500 ms.
11. ENX-08: WHEN a swarm member accepts a hit THEN it SHALL be stunned for 150 ms and take the hit push, and WHEN its HP reaches 0 THEN its body SHALL leave the physics in that frame and it SHALL play 3 dissolve frames in 300 ms with no ragdoll.
12. ENX-09: The swarm body SHALL be 18 × 24 px, and the hitbox of every grounded moveset strike of the player standing on the same floor next to it SHALL overlap that body (pure test over the move data).
13. ENX-10: The swarm members SHALL be in the target list that the techniques, the Domain and the effects lab read, as common targets for every rule that tells common, elite and boss apart.
14. ENX-11: WHEN one moveset strike hits several swarm members THEN those members together SHALL add at most one energy gain, one combo hit and one `build.onMeleeHit`, and only the first SHALL show the full cursed impact (the others show the small spark).
15. ENX-11: The swarm SHALL never enter the `AttackGate`, never become the posture focus and never be finishable.
16. ENX-12: WHEN a swarm member dies THEN it SHALL drop `floor(m)` fragments plus 1 more with chance `m − floor(m)`, with `m(r) = max(0, ((W(r) − L(r)) · μ(r) − E(r) · (8 + 2a(r))) / S(r))`, `W(r)` today's `waveSize`, `a(r)` today's `armedChance(r)` and `μ(r) = 3 + 2a(r)`.
17. ENX-12: WHEN a swarm member dies THEN it SHALL roll a heal with chance `k(r) × the effective heal chance` and an Elixir with chance `k(r) × e(r)`, `k(r) = (W(r) − L(r) − E(r)) / S(r)` and `e(r) = 0.2·a(r) + 0.04·(1 − a(r))`, and SHALL never drop a tool.
18. ENX-13: WHEN a swarm rift opens THEN its point SHALL be an `E` point on the ground or 96 px above one (aerial, 30% chance by `hordeRng`), at least 160 px horizontally from the player center, within `SPAWN.reachPx` in the modular world, and SHALL fall back to the farthest `E` point when none is 160 px away.
19. ENX-14: The swarm SHALL be drawn from the sheet `enemy-swarm`, a code-drawn placeholder in `src/game/art/hd/swarmSheet.ts` at 2 texels per world px with the frames `enxame-idle-0..1`, `enxame-move-0..3`, `enxame-windup-0`, `enxame-bite-0`, `enxame-hit-0`, `enxame-fall-0` and `enxame-die-0..2` in a 64 × 56 texel cell with the origin at the bottom middle.
20. ENX-14: WHEN the atlas `src/game/art/hd/atlas/swarmSheet.ts` from `assets/enxame/` exists with the same frame names THEN switching the sheet SHALL take only the import in `src/game/art/index.ts`.
21. ENX-14: The placeholder SHALL have a 1-texel `k` outline and eyes in `W` or `R`, and every color SHALL come from `PALETTE`.
22. ENX-14: The swarm sprite SHALL be drawn at depth −1, below the lutadores and the player and above the rifts.
23. ENX-15: WHEN a technique hits swarm members THEN each hit SHALL follow its F29 band, and a swarm death SHALL trigger no hitstop, no slow motion and no camera shake of its own.

**Independent Test**: `horde.smoke.mjs` com `round=6&seed=1`: nasce um grupo de 4 do enxame por uma fenda; um `chuteGiratorio`
mata um membro de 16 de HP; um chute em 3 membros acerta 2 (AD-015) e sobe o combo em 1; agachado, a mordida acerta;
o snapshot mostra `swarm` com o HP de cada um.

---

### P1: Elites com afixo e o Selo ⭐ MVP

**User Story**: Como jogador, quero uma elite por rodada que pede um jeito próprio de lutar e me dá um ponto livre, para
cada rodada ter um momento de perigo com prêmio.

**Why P1**: O Selo é a ferramenta nova que paga a dificuldade das elites, e as F30, F31 e F33 já deixaram regras de
elite no dado esperando alvo.

**Acceptance Criteria**:

1. ELT-01: WHILE a common round from r8 is active and is not a swarm round, WHEN the kills reach `ceil(0.4 × q)` and the body ceiling has room THEN the director SHALL open one elite rift, once per round.
2. ELT-02: WHEN an elite is born THEN it SHALL be a lutador with max HP `round(60 × hpMul × 2.5)`, the lutador body (22 × 36), guard, structure and finisher, and a sprite at scale 1.2.
3. ELT-03: WHEN an elite is born THEN it SHALL have no affix in act II, 1 affix in act III and 2 distinct affixes from act IV, drawn uniformly from `escudo`, `explosivo`, `rapido` and `regenerador` by `hordeRng`.
4. ELT-04: WHERE the elite has `escudo` it SHALL take damage on a shield of `round(0.4 × maxHp)` before its HP, a `heavy` hit SHALL take twice its damage from the shield, the overflow SHALL go to the HP, and WHEN the shield reaches 0 THEN the event `shieldBreak:<id>` SHALL fire.
5. ELT-05: WHERE the elite has `explosivo`, WHEN it dies THEN a 72 px ring SHALL blink for 700 ms of game time (stopped by hitstop, slowed by slow motion) at the death point and then explode, and IF the player center is within 72 px (inclusive) and the player is not invulnerable THEN the player SHALL take `round(12 × damageMul × 1.5)` as a `red` hit.
6. ELT-06: WHERE the elite has `rapido` its `chaseSpeed` SHALL be ×1.4, its `windupMs` ×0.8 and its `restMs` ×0.6.
7. ELT-07: WHERE the elite has `regenerador`, WHILE 2000 ms of game time pass with no damage taken it SHALL heal `max(1, round(0.008 × maxHp))` every 200 ms up to its max HP, and any damage, chip included, SHALL restart the 2000 ms.
8. ELT-08: The elite SHALL have a 1 px outline in its affix color (`escudo` `c`, `explosivo` `a`, `rapido` `A`, `regenerador` `G`, no affix `U`), alternating every 600 ms with 2 affixes, and WHEN it is born THEN a floating text "Elite · <Afixo> · <Afixo>" SHALL show above its head for `RUN.bannerMs`.
9. ELT-08: WHERE the elite has `escudo` the `EnemyHud` life bar SHALL show the shield as a `c` segment over it.
10. ELT-09: WHEN an elite dies by any source THEN the `choiceDirector` SHALL queue one `livre` page with origin `selo`, shown after the mastery free point pages (and so after the Veil chest and the boss chest, CHC-02 of F33) in the next konbini, and a floating text "+1 Selo" SHALL show at the death point for `RUN.bannerMs`.
11. ELT-10: IF the Selo page would be skipped by CHC-08 THEN the wallet SHALL get `15 × fragmentValue(r)` fragments and the banner "Selo: +N fragmentos" SHALL show.
12. ELT-11: WHEN round 7 is cleared THEN the cleared banner SHALL read "Rodada 7 concluída · Próxima: elite".
13. ELT-12: The elite SHALL be read as elite by every rule that tells common, elite and boss apart (Domain activation fractions, Perfuração 3, Puxão 3), and the lutadores and the swarm SHALL not.
14. ELT-12: WHEN an elite dies THEN it SHALL drop 8 fragments (plus the armed bonus when armed) and roll heal and Elixir as an armed lutador.

**Independent Test**: `elite.smoke.mjs` com `round=8&elite=escudo&quota=2&swarm=0`: a elite nasce com contorno `c` e o
texto "Elite · Escudada"; o golpe forte tira o dobro do escudo; o abate dela põe uma página `livre` de origem `selo` na
konbini seguinte.

---

### P2: Rodada só de enxame

**User Story**: Como jogador, quero de vez em quando uma rodada rápida só de enxame, para quebrar o ritmo e ganhar um
prêmio por ela.

**Why P2**: Dá variedade às rodadas (o "round dos cães"), mas o ciclo de horda já funciona sem ela.

**Acceptance Criteria**:

1. ESP-01: The swarm rounds SHALL be r13 and every 5 rounds after it (r18, r23, ...), and a swarm round SHALL never be a boss round.
2. ESP-02: WHILE a swarm round is active the director SHALL spawn only swarm, with quota `min(30 + 2·(r−13), 60)`, budget rate ×2, a stored budget ceiling of 18 and groups of 6.
3. ESP-03: WHEN a swarm round starts THEN the banner SHALL read "Rodada de enxame!", and WHEN the round before it is cleared THEN its cleared banner SHALL end with " · Próxima: rodada de enxame".
4. ESP-04: WHEN a swarm round is cleared THEN the `choiceDirector` SHALL queue one `livre` page with origin `selo`, under the same rules as ELT-09 and ELT-10, and the cleared banner SHALL read "Rodada N concluída · +1 Selo".

**Independent Test**: `horde.smoke.mjs` com `round=13&seed=1`: só nascem membros do enxame, em grupos de 6; o HUD lê
`Abates: 0/30`; ao fechar, a konbini tem uma página `livre` de origem `selo`.

---

### P2: Os atos mudam a luz e a regra

**User Story**: Como jogador, quero ver a run passar por atos com luz própria e uma regra nova de inimigo em cada um,
para sentir que avancei e saber que algo mudou.

**Why P2**: É o que dá forma de metroidvania à run, mas a horda funciona com a luz de hoje.

**Acceptance Criteria**:

1. ATO-01: The act of a round SHALL be `ceil(r / 5)`, and the act data (light color key, light alpha, rules) SHALL live in `src/data/acts.ts`.
2. ATO-02: WHEN the first round of an act from act II starts THEN the round banner SHALL read "Rodada N · Ato X" (roman numeral), and from act V "Rodada N · Véu Rompido: <regra>".
3. ATO-03: WHEN a combat or boss area is built THEN a light veil fixed to the camera SHALL cover the screen at depth −8 with the act color and alpha: act I `a` 0.10, act II none, act III `S` 0.12, act IV `r` 0.14, act V and later `t` 0.18.
4. ATO-03: The light veil SHALL use only `PALETTE` colors with transparency and no multiplicative tint (ART-01), SHALL sit above the `BakedLayer` background and below the terrain, the arena phase veil and the characters, and the konbini SHALL have none.
5. ATO-04: WHILE the round is in act IV or later, a lutador with the `bruto` look SHALL have max HP ×1.3 and, when not armed with the club, the `red` attack kind.
6. ATO-04: WHILE the round is in act IV or later the armed chance cap SHALL be 0.65 instead of 0.5.

**Independent Test**: `acts.smoke.mjs` com `round=11`: o banner lê "Rodada 11 · Ato III" e o snapshot mostra o véu `S`
0,12; com `round=16` um `bruto` desarmado tem o golpe `red` e HP 1,3× o de um `corcunda` da mesma rodada.

---

### P2: A arena do chefe é uma sala-portão

**User Story**: Como jogador, quero que a arena do chefe abra o enquadramento e trave a câmera, para a luta de chefe ter
cara de portão do ato.

**Why P2**: Muda o sentimento do chefe sem mudar a luta; a horda não depende disso.

**Acceptance Criteria**:

1. PRT-01: WHEN a boss area is built THEN the base world zoom SHALL be `zoom(1.35)` (1.8 in HD) until the next area build, set during the fade.
2. PRT-02: WHILE the area is a boss area the camera SHALL not follow the player vertically, keeping the bottom of the view at the bottom of the area.
3. PRT-03: WHILE the area is a boss area the horizontal camera bounds SHALL go from the outer edge of the left seal to the outer edge of the right seal.
4. PRT-04: WHEN the zoom pulse, the cast zoom, the finisher zoom or the Kokusen zoom ends THEN the camera SHALL return to the current base zoom, not to `WORLD_ZOOM` or `zoom(1.5)`.
5. PRT-05: WHEN a non-boss area is built, the run resets or the area restarts THEN the base zoom SHALL be `WORLD_ZOOM` and the vertical follow SHALL be back.

**Independent Test**: `acts.smoke.mjs` com `round=5`: o snapshot lê `camera.baseZoom` igual a `zoom(1.35)` e `locked`
verdadeiro; depois de um golpe forte o zoom volta a esse valor; na konbini volta a `zoom(1.5)`.

---

### P2: Véu Rompido da r21 em diante

**User Story**: Como jogador que passou da r20, quero que cada ato some uma regra nova e deixe os inimigos mais duros sem
teto, para a horda sem fim acabar me vencendo de um jeito diferente a cada run.

**Why P2**: É o sumidouro da horda sem fim (seção 3.3); poucas runs chegam lá antes da F35.

**Acceptance Criteria**:

1. VRB-01: WHEN a run starts THEN the order of the 4 Veil rules (`enxameVeloz`, `eliteDupla`, `guardaFirme`, `semTregua`) SHALL be a permutation drawn by `hordeRng`, and from act V each act SHALL add the next rule, with no new rule after the fourth.
2. VRB-02: WHERE `enxameVeloz` is on the swarm chase speed SHALL be ×1.25.
3. VRB-02: WHERE `eliteDupla` is on the quota SHALL count 2 elites, the second elite rift SHALL open when the kills reach `ceil(0.7 × q)`, and that elite SHALL give its own Selo.
4. VRB-02: WHERE `guardaFirme` is on the lutador guard chance SHALL be ×1.5.
5. VRB-02: WHERE `semTregua` is on the budget rate SHALL be ×1.3 and the stored budget ceiling ×1.5.
6. VRB-03: WHILE the round is in act V or later the HP multiplier of lutadores and elites SHALL be the F30 `hpMul` × `1.15^(act − 4)` with no cap, giving 2.53 at r21 and 3.31 at r26, and the swarm and the boss SHALL not take it.

**Independent Test**: teste puro do `hpMul` do Véu na r20, r21, r25 e r26; `horde.smoke.mjs` com `round=21&veu=semTregua`:
o banner lê "Rodada 21 · Véu Rompido: Sem trégua" e o snapshot mostra a regra ligada.

---

### P1: 30 ou mais corpos sem engasgar ⭐ MVP

**User Story**: Como jogador, quero a horda cheia sem o jogo engasgar, para o volume ser diversão e não lentidão.

**Why P1**: O teto de corpos sai desta medição; sem ela, o diretor não tem número.

**Acceptance Criteria**:

1. HPF-01: The smoke `spawn-pressure-horde.smoke.mjs` SHALL measure the wall time of `__game.step(16)` over at least 300 frames with 8, 16, 24, 32 and 40 live bodies (by `swarmBurst`) and SHALL print p50 and p95 of each.
2. HPF-02: WHEN step 2 is committed THEN `HORDE.bodyCap` SHALL be the largest measured count whose p95 is at most 1.5 times the p95 with 8 bodies, never below 24, and `validation.md` SHALL record the numbers.
3. HPF-03: The swarm SHALL use one Matter `beforeupdate` listener for all members, applying the velocity on every physics step (L-001).
4. HPF-04: The swarm deaths SHALL create no ragdoll body, and a group birth SHALL create one spawn smoke (FEN-04).

**Independent Test**: o smoke imprime a tabela de p50/p95 e falha se, com o `bodyCap` fixado, o p95 passar de 1,5× o de
8 corpos.

---

### P2: Debug e snapshot da horda

**User Story**: Como desenvolvedor e smoke, quero montar a horda pela URL e ler o estado dela no snapshot, para provar
cada regra sem jogar até a r21.

**Why P2**: Necessário para os smokes, invisível para o jogador.

**Acceptance Criteria**:

1. DBH-01: WHEN `?debug` has `quota`, `bodyCap`, `swarm=0`, `swarmBurst`, `swarmBite=0`, `elite` or `veu` with a valid value THEN the run SHALL apply it as the Assumptions table says, and IF the value is invalid THEN it SHALL be ignored.
2. DBH-01: The `hordeRng` SHALL be consumed the same way with or without the debug parameters.
3. DBH-02: The debug snapshot SHALL report `horde: {act, quota, kills, alive: {lutador, swarm, elite}, bodyCap, lutadorCap, budget, special, rifts, elites, veil, veu}`, with `rifts` as `{id, kind, count, x, y, msLeft}[]`, `elites` as `{id, affixes, shield}[]`, `veil` as `{key, alpha}` or `null` and `veu` as `{rules, hpMul}`, typed in a file apart from `debugApi.ts`.
4. DBH-02: The debug snapshot SHALL report `swarm` as `{id, x, y, hp, maxHp, state}[]` and `camera.baseZoom` and `camera.locked`.
5. DBH-03: The snapshot fields `run.alive`, `run.queued` and `run.maxAlive` SHALL stay, as all live bodies, `quota − kills − alive − open rifts` floored at 0, and the lutador ceiling.
6. DBH-04: The debug events SHALL include `rift:<id>` when a rift opens, `spawnFx:<id>` when each unit is born, `eliteSpawn:<id>`, `shieldBreak:<id>`, `eliteBlast:<id>` and `selo:<origin>`.

**Independent Test**: `?debug&hd=1&area=modular&quota=4&swarm=0&elite=rapido,regenerador` mostra no snapshot a cota 4 e a
elite com os dois afixos; `quota=abc` é ignorado.

---

## Edge Cases

- IF the player dies while rifts are open THEN the rifts SHALL be dropped and no unit SHALL be born.
- IF a rift is open when the round would have no more room in the ceilings THEN the rift SHALL still give its unit, because it already counts in the ceilings.
- WHEN the last unit of the quota is still a rift THEN the round SHALL not clear until that unit is born and killed.
- IF the swarm quota left is smaller than the group size THEN the group SHALL have only what is left.
- IF the body ceiling has room for fewer members than the group size THEN the group SHALL have only the room, and the rest SHALL wait for another rift.
- WHEN an elite with `explosivo` dies in the frame the round clears THEN the blast SHALL still happen, and it SHALL be dropped if the area is rebuilt first.
- WHEN an elite with `explosivo` is killed by the Domain execution THEN the blast SHALL still happen.
- IF the regenerator elite is at max HP THEN it SHALL not heal and SHALL not pulse.
- WHEN the escudo elite takes a chip hit THEN the shield SHALL take its damage as any other hit (only `heavy` doubles).
- WHEN `quota` is smaller than 3 THEN the first update SHALL open only `quota` rifts.
- WHEN `swarm=0` is set in act II or later THEN the quota SHALL be `L + E` and the fragment calibration SHALL use `S = 0` (`m` not used).
- WHEN the run reaches the round after the fourth Veil rule THEN no new rule SHALL be added and the HP SHALL keep growing ×1.15 per act.
- IF an aerial swarm rift opens under a ceiling or a platform THEN the members SHALL fall to the floor under them by gravity.
- WHILE the player ducks a bite SHALL still hit, and WHILE the player is airborne a bite SHALL miss (ENX-05).
- IF a swarm member bites from behind the player THEN the guard and the parry SHALL not stop it (DEF-01 and DEF-02 need the attacker in front), as with the lutadores.
- WHILE the player stands on a platform above the swarm no member SHALL wind up (more than 24 px between centers vertically, ENX-05).
- WHEN the Kokusen cinema or the finisher zoom is running at the boss arena and the boss dies THEN the zoom SHALL return to the arena base zoom until the konbini build.
- WHEN a Selo page and a mastery free point page both wait THEN the mastery page SHALL show first.
- WHILE the effects lab (`?debug&fxlab`) is on the director SHALL open no rift, as FXL-01 says for the wave of today.

---

## Implicit-Requirement Dimensions

| Dimension | Resolução |
| --- | --- |
| Input validation & bounds | HRD-03 (teto de 12 no orçamento guardado), HRD-04 (dois tetos), HRD-05 (nunca mais que a cota), ENX-02 (HP de 12 a 20), DBH-01 (parâmetros inválidos ignorados, `swarmBurst` de 1 a 60) |
| Failure / partial-failure states | FEN-05 e o 1º edge case (fendas descartadas sem nascimento na morte, no reset e no `R`), ELT-10 (Selo sem eixo livre vira fragmentos), ENX-13 (ponto de reserva quando nenhum fica a 160 px) |
| Idempotency / retry / duplicate handling | HRD-01 (`enemyDied` conta cada id uma vez, como o WAVE-06), ELT-01 (uma elite por rodada), ENX-11 (no máximo 1 ganho por golpe nos membros do enxame), ELT-09 (um Selo por elite) |
| Auth boundaries & rate limits | ENX-06 (3 mordidas e 200 ms), HRD-03 (taxa do orçamento); auth N/A porque é jogo local |
| Concurrency / ordering | FEN-01 (fenda antes do nascimento, mesmo ponto), ELT-09 (ordem das páginas), o edge case da cota que termina numa fenda, a ordem do `Run.update` de hoje (morte, abates, tempos) que segue valendo |
| Data lifecycle / expiry | FEN-03/FEN-05 (vida da fenda), ENX-08 (corpo sai da física na morte), PRT-05 (zoom e trava voltam no `rebuild`), VRB-01 (permutação por run), ELT-07 (relógio do regenerador) |
| Observability | DBH-02 a DBH-04 (snapshot e eventos), HPF-01/HPF-02 (tabela de desempenho e `validation.md`) |
| External-dependency failure | N/A porque não há dependência externa em jogo |
| State-transition integrity | HRD-05 (rodada fecha quando os abates chegam à cota), HRD-02 (rodada de chefe sem diretor de orçamento), ESP-01 (rodada de enxame nunca é de chefe), ATO-01 (ato derivado da rodada) |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| HRD-01 | P1: A horda nasce por pressão e fecha por cota | Tasks | Pending |
| HRD-02 | P1: A horda nasce por pressão e fecha por cota | Tasks | Pending |
| HRD-03 | P1: A horda nasce por pressão e fecha por cota | Tasks | Pending |
| HRD-04 | P1: A horda nasce por pressão e fecha por cota | Tasks | Pending |
| HRD-05 | P1: A horda nasce por pressão e fecha por cota | Tasks | Pending |
| HRD-06 | P1: A horda nasce por pressão e fecha por cota | Tasks | Pending |
| HRD-07 | P1: A horda nasce por pressão e fecha por cota | Tasks | Pending |
| HRD-08 | P1: A horda nasce por pressão e fecha por cota | Tasks | Pending |
| HRD-09 | P1: A horda nasce por pressão e fecha por cota | Tasks | Pending |
| HRD-10 | P1: A horda nasce por pressão e fecha por cota | Tasks | Pending |
| HRD-11 | P1: A horda nasce por pressão e fecha por cota | Tasks | Pending |
| HRD-12 | P1: A horda nasce por pressão e fecha por cota | Tasks | Pending |
| FEN-01 | P1: Toda chegada é anunciada pela fenda | Tasks | Pending |
| FEN-02 | P1: Toda chegada é anunciada pela fenda | Tasks | Pending |
| FEN-03 | P1: Toda chegada é anunciada pela fenda | Tasks | Pending |
| FEN-04 | P1: Toda chegada é anunciada pela fenda | Tasks | Pending |
| FEN-05 | P1: Toda chegada é anunciada pela fenda | Tasks | Pending |
| FEN-06 | P1: Toda chegada é anunciada pela fenda | Tasks | Pending |
| FEN-07 | P1: Toda chegada é anunciada pela fenda | Tasks | Pending |
| ENX-01 | P1: O enxame dá o volume | Tasks | Pending |
| ENX-02 | P1: O enxame dá o volume | Tasks | Pending |
| ENX-03 | P1: O enxame dá o volume | Tasks | Pending |
| ENX-04 | P1: O enxame dá o volume | Tasks | Pending |
| ENX-05 | P1: O enxame dá o volume | Tasks | Pending |
| ENX-06 | P1: O enxame dá o volume | Tasks | Pending |
| ENX-07 | P1: O enxame dá o volume | Tasks | Pending |
| ENX-08 | P1: O enxame dá o volume | Tasks | Pending |
| ENX-09 | P1: O enxame dá o volume | Tasks | Pending |
| ENX-10 | P1: O enxame dá o volume | Tasks | Pending |
| ENX-11 | P1: O enxame dá o volume | Tasks | Pending |
| ENX-12 | P1: O enxame dá o volume | Tasks | Pending |
| ENX-13 | P1: O enxame dá o volume | Tasks | Pending |
| ENX-14 | P1: O enxame dá o volume | Tasks | Pending |
| ENX-15 | P1: O enxame dá o volume | Tasks | Pending |
| ELT-01 | P1: Elites com afixo e o Selo | Tasks | Pending |
| ELT-02 | P1: Elites com afixo e o Selo | Tasks | Pending |
| ELT-03 | P1: Elites com afixo e o Selo | Tasks | Pending |
| ELT-04 | P1: Elites com afixo e o Selo | Tasks | Pending |
| ELT-05 | P1: Elites com afixo e o Selo | Tasks | Pending |
| ELT-06 | P1: Elites com afixo e o Selo | Tasks | Pending |
| ELT-07 | P1: Elites com afixo e o Selo | Tasks | Pending |
| ELT-08 | P1: Elites com afixo e o Selo | Tasks | Pending |
| ELT-09 | P1: Elites com afixo e o Selo | Tasks | Pending |
| ELT-10 | P1: Elites com afixo e o Selo | Tasks | Pending |
| ELT-11 | P1: Elites com afixo e o Selo | Tasks | Pending |
| ELT-12 | P1: Elites com afixo e o Selo | Tasks | Pending |
| ESP-01 | P2: Rodada só de enxame | Tasks | Pending |
| ESP-02 | P2: Rodada só de enxame | Tasks | Pending |
| ESP-03 | P2: Rodada só de enxame | Tasks | Pending |
| ESP-04 | P2: Rodada só de enxame | Tasks | Pending |
| ATO-01 | P2: Os atos mudam a luz e a regra | Tasks | Pending |
| ATO-02 | P2: Os atos mudam a luz e a regra | Tasks | Pending |
| ATO-03 | P2: Os atos mudam a luz e a regra | Tasks | Pending |
| ATO-04 | P2: Os atos mudam a luz e a regra | Tasks | Pending |
| PRT-01 | P2: A arena do chefe é uma sala-portão | Tasks | Pending |
| PRT-02 | P2: A arena do chefe é uma sala-portão | Tasks | Pending |
| PRT-03 | P2: A arena do chefe é uma sala-portão | Tasks | Pending |
| PRT-04 | P2: A arena do chefe é uma sala-portão | Tasks | Pending |
| PRT-05 | P2: A arena do chefe é uma sala-portão | Tasks | Pending |
| VRB-01 | P2: Véu Rompido da r21 em diante | Tasks | Pending |
| VRB-02 | P2: Véu Rompido da r21 em diante | Tasks | Pending |
| VRB-03 | P2: Véu Rompido da r21 em diante | Tasks | Pending |
| HPF-01 | P1: 30 ou mais corpos sem engasgar | Tasks | Pending |
| HPF-02 | P1: 30 ou mais corpos sem engasgar | Tasks | Pending |
| HPF-03 | P1: 30 ou mais corpos sem engasgar | Tasks | Pending |
| HPF-04 | P1: 30 ou mais corpos sem engasgar | Tasks | Pending |
| DBH-01 | P2: Debug e snapshot da horda | Tasks | Pending |
| DBH-02 | P2: Debug e snapshot da horda | Tasks | Pending |
| DBH-03 | P2: Debug e snapshot da horda | Tasks | Pending |
| DBH-04 | P2: Debug e snapshot da horda | Tasks | Pending |

**ID format:** `[CATEGORY]-[NUMBER]`; um ID cobre um ou mais critérios da mesma regra.

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 70 total, 70 mapeados para tarefas, 0 sem tarefa (mapa em `tasks.md`, seção "Requirement Coverage").

---

## Testes e smokes

**Testes novos** (arquivo novo para todo sistema novo; nenhum teste da lista de exceções do `max-lines` cresce, e
`tests/core/run.test.ts` está nela):
- `tests/core/horde.test.ts` (cota HRD-02, orçamento HRD-03, tetos HRD-04, cota máxima HRD-05, nascimento sem abate
  HRD-06, escolha determinística HRD-07, ato I igual a hoje HRD-09, renda HRD-11), `tests/core/runHorde.test.ts` (o
  `Run` com o diretor: fenda antes do nascimento FEN-01, rodada fecha na cota, streams com salt distinto HRD-08),
  `tests/core/swarm.test.ts` (HP ENX-02, grupo ENX-03, mordida ENX-05, limitador ENX-06, drop ENX-12, ponto ENX-13),
  `tests/core/elite.test.ts` (ELT-01 a ELT-07), `tests/data/acts.test.ts` (ATO-01, ATO-03, ATO-04, cores da paleta),
  `tests/core/veu.test.ts` (VRB-01, VRB-03), `tests/game/swarmReach.test.ts` (ENX-09 sobre os dados dos golpes) e
  `tests/game/swarmSheet.test.ts` (quadros, célula, origem e paleta da ENX-14).
- Cada limiar testado nos dois lados (L-010): 599 e 600 ms da fenda; 159 e 160 px do ponto do enxame; 40/41 px na
  horizontal e 24/25 px na vertical do preparo da mordida; 71, 72 e 73 px da
  explosão; 1999 e 2000 ms do regenerador; `ceil(0,4 × q) − 1` e `ceil(0,4 × q)` abates da elite; r5/r6 (enxame),
  r7/r8 (elite), r12/r13 (rodada de enxame), r20/r21 (Véu); 12 e 13 pontos de orçamento guardado; teto de corpos e
  teto + 1.
- O adaptador que repassa o número ao motor tem teste próprio, não só o puro (L-043): o zoom base que o `areaDirector`
  passa à câmera na arena, o alpha e a cor do véu do ato no `Rectangle`, e a escala 1,2 da elite no sprite.

**Testes refeitos:** `waves` (os casos do `WaveSpawner` vão para `horde.test.ts`), `debugApi` (campos novos), `loot`
(`swarmDrop`, `eliteDrop`, o Elixir do membro e o teto de armado do ato IV), `difficulty` (`hpExtra`), `cameraKick` (zoom
base) e `attackKind` (bruto pesado no ato IV). O `economy.test.ts` não muda: a igualdade da renda mora no
`hordePlan.test.ts` (HRD-11). O `run.test.ts` (exceção de tamanho) não muda no passo 0 e, no passo 1, só troca conteúdo
sem crescer (conferido no código): l.298 (os spawns da r1 saem 600 ms depois das fendas), l.363 e l.423 (`step < 400`
vira `step < 800`: com orçamento e fenda a r3 começa perto de 21 s de jogo, e os 400 passos de 50 ms só cobrem 20 s), e
os dois casos das l.551-568 (`maxAliveOverride` com spawn no 1º `update`; estouro de 3 com o formato exato
`{ type, round, kind }` e o gotejo de 1500 ms) saem dele e voltam reescritos para fenda e orçamento no
`runHorde.test.ts`.

**Smokes novos:** `horde`, `elite`, `acts` e `spawn-pressure-horde`, todos com `?debug&hd=1&area=modular`.

**Smokes antigos que mudam** (cada um no passo que os quebra, citando o requisito): `hud` no passo 1 (o texto
"Inimigos: N" vira "Abates: k/q"; HRD-10), `spawn-pressure` no passo 1 (o ritmo de nascimento passa a ser o do orçamento;
os 6 da r1 e o estouro de 3 seguem, HRD-09), o `fight-kit` no passo 1 (o `boot` espera o 1º `spawnFx:`, porque a fenda atrasa
todo nascimento em 600 ms). `run-loop` e `world-traverse` não leem a contagem do HUD, e `boss` e `world-boss` não leem a
câmera (conferido no design): rodam sem mudança prevista.

**Smokes que rodam junto:** os quatro novos, `spawn-pressure`, `run-loop`, `hud`, `boot`, `shop`, `world-run`,
`world-traverse`, `world-boss`, `world-restart`, `boss`, `boss-victory`, `fight`, `impact`, `feel`, `kokusen`,
`finisher`, `drops`, `tech`, `armed`, `telegraph`, `targets` e os da F33 (`choice-panel`, `boss-chest`).

---

## Success Criteria

- [ ] Numa run normal até a r14, o usuário sente a horda chegando sem pausa, lê de onde cada grupo vem pela fenda e nunca
      perde de vista os lutadores no meio do enxame.
- [ ] O usuário mata uma elite de cada afixo e diz que cada uma pediu um jeito diferente de lutar; o Selo aparece como
      página de ponto livre na konbini seguinte.
- [ ] O usuário reconhece a troca de ato pela luz e pelo banner, e a arena do chefe da r5 e da r10 parece uma sala.
- [ ] A renda esperada por rodada é a de hoje (teste puro), e a build fecha entre a r18 e a r22 no `expectedIncome`.
- [ ] Com 32 corpos vivos o smoke de desempenho passa, e o usuário não vê engasgo jogando a rodada de enxame da r13.
- [ ] A `TestScene` termina a F38 com no máximo as linhas efetivas que tinha antes dela, e o `Hud.ts` igual.
