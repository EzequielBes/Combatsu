# Arma imbuída - Specification

## Problem Statement

Hoje a arma vinculada (Bastão selado, Lâmina vinculada) vai para a mão no começo de cada rodada como um `Prop`, e com
algo na mão o combo inteiro e o Contra somem (`game/player/strikes.ts:109` e `:141`) e a técnica é recusada (CAST-09,
`Player.isBusyForCast`, `Player.ts:412`): segurar a arma é jogar pior que de mão vazia num jogo de luta. A arma também
só sobe um fator de dano (`weaponFactor` 1 / 1,25 / 1,5), sem escolha nenhuma. A F36
(`docs/plano-builds-e-habilidades.md`, linha F36 da seção 6; seção 5.4; decisão 5 da seção 7, confirmada pelo usuário)
faz a arma **imbuída**: ela fica guardada (no Inventário Amaldiçoado, como o verme do Toji), não vai à mão e
**modifica os golpes que já existem** por um traço próprio, com 3 pontos de eixo (teto 2 por eixo), uma evolução com
catalisador, e rastro e impacto desenhados em HD.

A F36 vem depois da F29 a F35 e usa o que elas entregam sem mudar o contrato:
- F29: `core/statSheet.ts` (`meleeMul(traits)`, `MeleeTraits {heavy, light, counter, shadow}`, `PROP_TRAITS`), o
  `StatsDirector` (dono único dos multiplicadores; `strikeMods(move)` devolve `{damage, force}` ao `Player.strikeMods`),
  `Hit.band` (`'chip' | 'micro'`) e as regras das faixas, o `DamageNumbers` (número cinza pequeno do chip), o
  `ImpactFx` com o `forced?: ImpactTier` do objeto (POW-11) e o tipo de snapshot em arquivo à parte (POW-13).
- F30: `core/axisBuild.ts` (eixo-foco, `resetItem`), a carta de 2 eixos com `W`/`S` e `axisRng` (CRD-04, CRD-05), a
  trava por rodada (PRC-04), a inflação (PRC-03), o retorno do `Player.strikeMods` que leva alcance e recuperação sem
  campo novo no `Player` (CRP-15), o Peso do Corpo (CRP-03) e o Alcance do Corpo (CRP-05), e a "escala da rodada"
  (`hpMul`, o multiplicador de HP do `multipliersFor` da rodada, ESC-02).
- F32: os afixos do chefe (`core/bossAffix.ts`, `data/bossAffixes.ts`: Ígneo, Invocador, Sangue Convergente,
  Adaptativo; o Portador não é afixo) e o glifo de 6 px por afixo ao lado da barra (BRD-02).
- F33: o `ChoicePanel` com a página de ponto grátis e o baú do chefe (`core/bossChest.ts`, BAU-01, opção "2 pontos de
  eixo").
- F35: a `BuildBar` (BBR-01 a BBR-12) com a bandeja do eixo-foco, o Abandonar (ABD-01 a ABD-09) e o livro de gastos
  por `ArsenalId`, o talento Contra Afiado e a definição de **Contra perfeito** (o Contra que acerta e cujo aperto chegou
  nos primeiros 150 ms da janela aberta).

Código conferido em 14/10 no branch `feat/fundacao-de-poder` (`0414643`, F29 pronta até a T15):
- `core/arsenal.ts`: `WEAPON_KEYS` (l.13, `boundClub`/`boundKnife`), `WEAPON_TEXTURES` (l.15, `bound-staff`/
  `bound-blade`), `Arsenal.buy` (a arma zera a ferramenta pendente, l.42, "a arma vinculada ocupa a mão"),
  `arsenalEligible` (ferramenta só sem arma, l.66; nível até `maxLevel` 3 com `minRound` [2, 4, 6], l.70),
  `arsenalCost` (`weaponCost` 24 + 14 × nível, l.77), `weaponDef` (l.95, o `PropDef` da arma com `weaponFactor`),
  `arsenalPreview` (`não quebra · dano N`, l.119-121).
- `scenes/test/arsenalDirector.ts`: `onRoundStart` (l.37) cria um `Prop` com `weaponDef` e põe na mão.
- `core/armed.ts`: `BOUND_NAMES` (`boundClub`, `boundKnife`). `game/art/hd/weapons.ts`: folhas `bound-blade` e
  `bound-staff` (usadas pelo `Prop` em HD, `Prop.ts:62`).
- `data/moves.ts`: os Contras (`contra`, `contraGancho`, l.331-361) já têm `unblockable: true` ("passam pela guarda",
  CNT-09/CNT-10) e `maxTargets: 1`; o `moves.ts` tem 397 linhas e não cresce.
- `core/enemyGuard.ts:87`: a guarda do comum segura o golpe `light` sem `unblockable`. O chefe não tem guarda.
- `scenes/test/spawner.ts:136-140`: os únicos `Projectile` são do chefe (`shockwave` do salto e `projectile` da
  rajada).
- `scenes/test/impactFx.ts:135` (`onStrikePhase`): o rastro do golpe é o `cursedFx.trail` no `active`;
  `data/feel.ts:35`: `fxCap` 40.
- Arte (branch `feat/arte-armas-imbuidas`, `ce6e03c`, worktree `wt-armas`): `src/game/art/hd/weaponFx/` com
  `WEAPON_FX = {lamina, bastao, lanca, osso}`, cada um com `trail` e `impact` de 4 quadros (`trail-0..3`,
  `impact-0..3`) e a âncora (`anchor`: centro do giro ou raiz da estocada no rastro, ponto de contato no impacto), o
  `osso` também com `charge`; `weaponFxTex(weapon, part)` = `weapon-fx-<weapon>-<part>`; tudo registrado a 1 px por
  texel no `art/index.ts`, ainda sem uso no combate. O arco do Bastão tem raio de 32 texels; o rastro da Lança, 60
  texels de comprimento.

## Goals

- [ ] Com qualquer arma comprada, o player começa a rodada de mãos vazias e joga o combo, o Contra e as técnicas como
      sem arma.
- [ ] Cada arma muda um tipo de golpe que já existe, de um jeito que se vê: a Lâmina corta e sangra no leve, o Bastão
      varre na frente e atrás no forte, a Lança estende o Contra, abre o Contra também no bloqueio e desfaz o projétil do chefe.
- [ ] A arma sobe do Nv 1 ao Nv 4 por 3 pontos em 3 eixos próprios (teto 2 por eixo), escolhidos na carta como os
      eixos das técnicas, e no Nv 4 evolui com o catalisador.
- [ ] O golpe do traço sai com o rastro e o impacto HD da arma, desenhados no branch de arte.
- [ ] A `TestScene` não ganha linha efetiva, o `moves.ts` não cresce e o `Player.ts` não ganha campo.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Osso de Dragão, Dragão Refletido e o marcador de cargas (`weapon-fx-osso-*`) | Leva 2 (F41). As folhas do osso continuam registradas e sem uso |
| Receitas genéricas `{kind, id, minLevel}[]`, Grimório, dica de meia receita, teste de nomes únicos (`tests/data/combos.test.ts`) | F37. A F36 só põe as 3 receitas de arma, na forma mínima que o baú e a carta 0 leem |
| Arma com moveset próprio (golpe novo, quadros do Yuta com a arma) | Alternativa recusada da decisão 5; feature de arte alta, só se o usuário pedir |
| "Escudo de afixo" da Lâmina Dividida da Alma | Nenhum afixo da leva 1 (F32) é escudo; os afixos de elite são da F38, que decide se algum é escudo e se a Lâmina Dividida o ignora |
| Leitura visual das relíquias (Manoplas, Faixas, Rosário) e Dedos de Sukuna | Seção 5.4 do plano, fora da linha F36; Dedos na F41 |
| Novo número de nível da relíquia | A relíquia continua Nv 1 a 3, com os preços e a trava de hoje |
| Trocar de arma sem abandonar | O Abandonar da F35 (ABD-05) é a troca; a loja continua sem oferecer outra arma com o slot ocupado |
| Ferramenta comprada (faca, porrete): balanço, dano, quebra | Só muda a regra de elegibilidade e de entrega (a arma deixou de ocupar a mão) |
| Versão antiga (`?hd=0`) | Não recebe trabalho novo; os smokes antigos só não podem quebrar |
| "Arma +1 ponto de eixo" da Restrição Celestial | F40. O teto de 3 pontos é lido do registro (`pointCap`), então a F40 sobe o teto sem mexer nas regras da F36 |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| 3 técnicas + Domínio, pool de 7 vagas, arma imbuída (fica guardada e muda os golpes existentes, sem golpe novo, sem ir à mão), escala na F30, nada automático | Valem como estão | Confirmadas pelo usuário (decisões 1, 3, 5 e 6) | y |
| Prefixos dos requisitos | IMB (modelo imbuído), WPN (níveis, eixos e multiplicador), LMN (Lâmina), BST (Bastão), LNC (Lança), WEV (evoluções), WSH (loja e `BuildBar`), WFX (rastro e impacto), WDB (debug e snapshot) | O validador só aceita `CAT-NN`; nenhum desses prefixos existe nas specs nem no código | y |
| Golpe do traço | Lâmina: golpe do moveset com `strength: 'light'`; Bastão: golpe do moveset com `strength: 'heavy'` e sem `counter`; Lança: golpe do moveset com `counter` (`contra`, `contraGancho`) | Os Contras têm `strength: 'heavy'`; sem tirar o `counter` do forte, o Bastão e a Lança mexeriam no mesmo golpe | n |
| Multiplicador da arma no `meleeMul` | ×1,2 no golpe do traço, fixo do Nv 1 ao Nv 4, entrando no `statSheet` depois da relíquia e antes dos votos | O plano manda o efeito pelo `statSheet.meleeMul` com traços mas não dá o número; os eixos são o que sobe, então o multiplicador não escala com o nível | n |
| Arma e objeto do mundo | Nenhum efeito da arma (multiplicador, alcance, sangramento, varredura, derrubada, anulação, rastro, impacto) vale para o golpe ou o arremesso de objeto do mundo | Objeto do mundo continua `Prop` com o balanço de hoje e o peso da F29 (POW-11); o `PROP_TRAITS` é `heavy` e pegaria o Bastão por engano | n |
| Arma e Kokusen | O Kokusen usa o `meleeMul` com `{heavy: true, light: false, counter: false, shadow: false}` (ESC-02), então leva o ×1,2 do Bastão | É golpe corpo a corpo forte pela regra da F30; separar pediria um traço novo só para isso | n |
| "Atravessa guarda" da Lança | Os Contras já passam pela guarda hoje (`unblockable`, CNT-09/CNT-10); o traço da Lança mantém isso e não acrescenta nada à guarda | Conferido no código; o traço fica com a anulação de projétil, o ×1,2 e o rastro e impacto próprios | n |
| Projétil que a Lança anula | Todo `Projectile` vivo (a `shockwave` e o `projectile` da rajada do chefe); a lava, o feixe e os fios da F32 não são projétil | São os únicos `Projectile` do jogo (`spawner.ts:136-140`) | n |
| Janela de anulação | O `active` do Contra mais 100 ms por ponto de Anulação depois dele, na área da hitbox do Contra (com a Estocada) | "Janela de anular projétil +100 ms" pede uma janela base: o `active` é a única que existe | n |
| Sangramento | Cada golpe leve que acerta põe 1 pilha (até `1 + Corte` pilhas) e leva o fim do sangramento para `agora + 1500 + 500 × Corte` ms; o relógio do tique **não** reinicia: sai 1 acerto `chip` a cada **600 ms** contados da 1ª aplicação do sangramento em curso, de `round((2 × pilhas + Sangria) × hpMul)`; um leve só com Corte 0 dá 2 tiques (600 e 1200 ms) | Plano: "chip de 2 × escala da rodada a cada 300 ms por 1,5 s"; "+0,5 s e +1 pilha, até 3"; "+1 no tique". Três desvios, achados na revisão: (1) reiniciar o relógio a cada leve faria o combo leve (um leve a cada ~260 ms: `jab` 60 + 80 + 120) nunca tiquear; (2) a 300 ms a Lâmina Nv 1 soma ~+71% do dano corpo a corpo sustentado contra ~+38% do Bastão e ~+30% da Lança no modelo do WPN-05 (escolha óbvia); a 600 ms fica ~+42%, e o 2 × escala continua legível (com 1 × escala o `round` comeria o `hpMul` até a r10); (3) a Sangria soma 1 ao tique, como o plano diz, e não 1 por pilha (o produto Corte × Sangria daria 9 por tique no Nv 4). Voltar aos 300 ms é decisão do usuário e quebra o WPN-05 | n |
| Sangramento e a build | O tique não passa pelo `meleeMul` nem pela Força, não conta como golpe (Fúria, Cadência, ganho de energia, Kokusen, talentos) e não gasta o Passo sombrio. Sai com `unblockable: true`, `tech: true` e sem `techId`, pelo `effects.onTechConnect` sem `masteryHit` | É dano por tempo, como o arco do Condutor; contar como golpe faria o chip alimentar a build. Conferido no código: a guarda do comum resolve **antes** da faixa (`EnemyDefense.ts:117-127`) e seguraria o tique leve de frente; o `adaptSourceOf` da F32 (`wt-chefes` `core/bossAdapt.ts:34`) devolve `null` para `tech` sem `techId`, então o Adaptativo não conta o tique (3 tiques por segundo adaptariam o "Leve" em 2 s); sem `masteryHit` o Domínio da F31 não carrega nem solta corte (design da F31, linha do par `onTechHit` → `onCastHit`) | n |
| Lança e o bloqueio (LNC-04) | Com a Lança, o bloqueio (`block`) também abre a janela do `contra` (`COUNTER.windowMs`, 450 ms), como o parry, pelo `combat.onDefense` (o `player.counter` já existe; nenhum campo novo no `Player`) | Metade do traço do plano ("atravessa guarda") já existe nos Contras, e o Contra só sai depois de parry ou esquiva perfeita (0,05 por segundo no ritmo de referência): o ×1,2 somaria ~1% do dano e a anulação só vale em rodada de chefe, então a Lança seria a arma morta. O bloqueio põe o Contra no ritmo da guarda ("a leitura do ataque vira resposta"), e a postura que cada bloqueio enche (quebra de guarda, `defense.ts:89`) segura o jogo de tartaruga | n |
| Modelo de referência das armas (WPN-05) | r1, `hpMul` 1, sem build; ritmo da seção 5.6 do plano: 1 leve/s (média de `jab`/`direto`/`gancho` = 7,33), 0,25 forte/s (média dos fortes de chão = 14), 0,05 Contra/s (1 perfeita a cada 20 s; média 11) e 0,25 bloqueio/s (o comum ataca de frente a cada ~4 s); "alvo único" e "grupo de 3" (2 na frente, 1 atrás, todos no alcance; o leve e o Contra acertam 1, o forte acerta `maxTargets`); sangramento contínuo (um leve por segundo renova). Estimativa da revisão, ganho no melhor cenário: Lâmina ~+42% (alvo único), Bastão ~+38% (grupo), Lança ~+30% (alvo único, com o LNC-04) | O plano fixa o teto de 1,35× para eixos de uma mesma técnica; entre armas, que vencem em cenários diferentes, o teto é 1,5×. Com os 300 ms do plano a razão passa de 2 (~71% contra ~30%); sem o LNC-04 a Lança fica perto de zero e a razão não tem teto | n |
| Aura da F35 | O nível da arma (1 a 4) soma na aura; o denominador 45 não muda (o lutador cheio passa de 39 para 40/45) | A F35 contou a arma de hoje (Nv 1 a 3) | n |
| Sangramento ao abandonar a arma | O sangramento já posto segue até acabar | Evita apagar efeito em voo por uma ação de loja; a loja só abre entre rodadas, então na prática não acontece em luta | n |
| Varredura do Bastão | A hitbox do forte passa a cobrir de `R` px atrás do centro do player até o mais longe entre a borda da frente dela e `R` px à frente, com `R = 60 + 20 × Arco`, a altura da hitbox de hoje e `maxTargets = max(maxTargets, 3)`; o alvo atrás do player recebe o golpe com `direction.x = −facing` | "Acerta na frente e atrás a até 60 px"; sem subir o limite de alvos, quem está atrás quase nunca seria atingido. O `Hit` de hoje leva `direction.x = facing` (`strikes.ts:280`): sem a troca, o comum de trás seria jogado através do player, e a guarda dele (`fromFront`, `EnemyDefense.ts:117`) leria o lado errado | n |
| Derrubada do Bastão | 1 ponto: o forte derruba (`knockdown: true`) o comum desarmado; 2 pontos: também o comum armado; o chefe nunca. A marca do Bastão só **liga** a derrubada: nunca apaga o `knockdown` do próprio golpe (`rasteira`, `ganchoAscendente`, `palmaExplosiva`) nem o do Peso do Corpo (CRP-03) | Texto do plano ("o forte derruba o comum; 2 pontos: também o armado"), lido ao pé da letra; hoje o armado não resiste a `knockdown`. Espalhar `{knockdown: false}` no `Hit` desligaria a rasteira no armado. Com o Peso do Corpo ≥ 2 todo forte já derruba todo comum (CRP-03), e o eixo não soma nada: decisão do usuário antes da T28 (design, "Risks") | n |
| Peso do Bastão e outros multiplicadores de força | `force × (1 + 0,25 × Peso)` no forte do traço, multiplicado pelo `forceMul` da força (F29) e pelo Peso do Corpo (F30) | Os três são multiplicadores de recuo; somar mudaria o número da F30 | n |
| Nuvem Itinerante ("o forte acerta 3 vezes no arco") | O 1º acerto é o de hoje; cada alvo aceito por ele leva mais 2 acertos 120 ms e 240 ms depois, `band: 'micro'`, com `round(0,5 × dano do 1º acerto)`, se ainda estiver vivo | Faixa micro é a regra para acerto em cadeia (seção 4); três acertos cheios com hitstop prenderiam o comum e triplicariam o forte | n |
| Arsenal de Toji ("anula os afixos por 3 s") | Por 3000 ms desde o Contra perfeito no chefe: o Ígneo não deixa faixa nova e as faixas vivas não dão dano; a troca de fase do Invocador não invoca ninguém (a invocação perdida não volta); o feixe do Sangue em aviso ou ativo some e nenhum feixe começa (o ciclo pula o `beam`); o Adaptativo não registra nem reduz golpe. O Portador não muda. Novo Contra perfeito no chefe reinicia os 3000 ms. Os glifos dos afixos ficam com alfa 0,3 enquanto valer | O plano não diz o que "anular" faz em cada afixo; esta é a leitura que tira o efeito sem tirar o chefe da luta | n |
| Lâmina Dividida da Alma ("ignora guarda") | Todo golpe leve do moveset sai com `unblockable: true` (a guarda do comum deixa de segurar o leve, `enemyGuard.ts:87`) | O chefe não tem guarda; o escudo de afixo está fora de escopo | n |
| Catalisador | Faixas e Manoplas: a relíquia equipada, em qualquer nível; Contra Afiado: o talento possuído, em qualquer nível. O catalisador continua na build depois da evolução | Seção 5.7 ("catalisador em qualquer nível") e o modelo do VS | n |
| Evolução depois de abandonar o catalisador | A arma evoluída continua evoluída | A evolução troca o item por uma versão nova; desfazer por abandono de outro item seria armadilha | n |
| Nível e pontos da arma evoluída | Continua Nv 4 com os mesmos 3 pontos; a evolução soma o efeito novo ao traço | "Evolução: troca o item por uma versão nova" sem dizer que perde os pontos; perder os pontos puniria evoluir | n |
| Preço e trava da arma | Nova 22; pontos 16, 22 e 28 (`16 + 6 × pontos postos`), todos antes da inflação (PRC-03); 1ª compra a partir da loja da r2; ponto a partir da r2 e o 3º ponto a partir da r4 (a regra do PRC-04) | Seção 3.2 e trava da seção 3.2 aplicada à arma; o 5º ponto não existe na arma | n |
| Arma como item possuído | A arma com ponto livre entra onde a F30, a F33 e a F35 listam item possuído com eixo: carta 0, bandeja do eixo-foco, opção "2 pontos de eixo" do baú e página de ponto grátis. A relíquia abaixo do Nv 3 entra só na carta 0 (não tem eixo). A regra automática do item-foco não muda (técnicas e Corpo) | A F35 deixou "arma e relíquia como item" para a F36 (sua tabela, linha da carta 0); a arma não tem nível para disputar com técnica de Nv 6 | n |
| Ponto livre da arma | A arma aceita ponto num eixo enquanto ele tem menos de 2 pontos e a arma tem menos de 3 no total | Teto de 2 por eixo e 3 pontos (Nv 4) da seção 2.1 | y |
| Texto da carta de ponto da arma | Uma linha por eixo (CRD-05), com o valor resolvido: Lâmina `Corte 1,5s→2s`, `Fio +10→+18`, `Sangria 2→3`; Bastão `Arco 60→80`, `Derrubada —→comum` / `comum→armado`, `Peso +0%→+25%`; Lança `Estocada +0→+16`, `Anulação +0→+100ms`, `Perfuração 1→2`. Se a compra leva a arma ao Nv 4 com o catalisador já na build, uma 3ª linha diz `+ evolução` | Molde da carta de eixo da F30 (≤ 20 caracteres por linha) | n |
| Moldura e pontinhos da arma | Pontinhos da `BuildBar`: 3, os pontos de eixo (0 a 3); moldura da carta: Nv 1 cinza, Nv 2 e 3 azul, Nv 4 roxo; carta de evolução dourada; o ícone da arma evoluída ganha a borda dourada (`A`) | O BBR-03 e o BBR-04 da F35 contavam a arma de hoje (Nv 1 a 3); a arma passa a ter 4 níveis como a técnica tem 6, com o dourado para a mutação | n |
| Ícone da arma na `BuildBar` | O quadro `common` da folha HD da arma: `bound-blade`, `bound-staff` e uma folha nova `bound-spear` (Lança), desenhada em código e conferida na prancha | As folhas `bound-*` deixam de ir à mão e viram o ícone; é a única arte nova da F36 | n |
| Nome e build da Lança | `Lança Invertida do Céu`, id `lanca` (a chave da arte), build `lutador`; os nomes `Bastão selado` e `Lâmina vinculada` ficam | O `lanca` casa com `WEAPON_FX`; o Contra é golpe de lutador | n |
| Parâmetros de debug | `arsenal=<id>` equipa a arma no Nv 1 (repetir o id da arma não sobe nível; repetir a relíquia sobe como hoje); `axes=<arma>.<eixo>:<n>` põe pontos com o teto de 2 por eixo e 3 no total, ignorando o excesso e o eixo desconhecido; `evo=<evolução>` evolui a arma no reset da run se a receita estiver pronta depois do `arsenal=`, do `perks=` e do `axes=`, e é ignorado caso contrário | Mesmo molde do `axes=` da F30; o `evo=` passa pela regra de pronto em vez de pular ela | n |
| Rastro e impacto | O rastro da arma toca **por cima** do `cursedFx.trail` do golpe do traço (4 quadros no `active`; o rastro amaldiçoado continua saindo, com o comprimento do Alcance do Corpo e dos pontos de poder), virado pelo `facing`, a 1 px por texel, salvo o arco do Bastão, desenhado com escala `R / 32` (o raio do arco na arte) para a ponta do arco bater na borda da varredura; o impacto da arma toca **por cima** do impacto amaldiçoado (4 quadros de 50 ms, no ponto de contato); o impacto da Lança também toca no projétil anulado | A arte foi desenhada para sobrepor a estrela amaldiçoada (commit `ce6e03c`, prancha "over a mock cursed star flash"); a escala do arco mantém a regra "do tamanho real da hitbox" da seção 4 e precisa ser conferida no jogo. Trocar o rastro amaldiçoado pelo da arma (a versão anterior desta linha) esconderia no golpe da arma o rastro mais longo do Alcance do Corpo (CRP-05, "lengthen the strike trail") e o `extraPx` dos pontos de poder da F29 (`2bc1102`), e o rastro de 60 texels da Lança passaria do alcance do Contra com Estocada 0 | n |
| Branch de arte | O `feat/arte-armas-imbuidas` entra na base antes da execução da F36; a F36 não redesenha as folhas, só liga | Pedido da tarefa ("a F36 só liga essa arte") | y |
| Smoke novo | `weapon-imbued.smoke.mjs` com `?debug&hd=1&area=modular`; o smoke `arsenal` é reescrito (a arma deixa de estar na mão) | Regra de smoke novo do projeto | y |

**Open questions:** none - all resolved or logged above. As linhas com `n` são escolhas do autor da spec para o
usuário revisar; nenhuma muda o que foi confirmado.

---

## User Stories

### P1: A arma fica guardada e o combo continua ⭐ MVP

**User Story**: Como jogador que comprou uma arma, quero começar a rodada de mãos vazias e com o combo, o Contra e as
técnicas, para a arma somar à minha build em vez de tirar o moveset.

**Why P1**: É o centro da decisão 5; sem isso, comprar a arma continua sendo jogar pior.

**Acceptance Criteria**:

1. IMB-01: The weapon SHALL never become a `Prop` nor go to the player's hand, and WHEN a round starts with a weapon equipped and no tool pending THEN `player.heldProp` SHALL be `null`.
2. IMB-02: WHILE a weapon is equipped and the player holds nothing, every moveset chain, counter window and cast SHALL behave as with no weapon, so pressing a slot key outside the CAST-09 states SHALL start the cast.
3. IMB-03: WHILE the player holds a world object, CAST-09 SHALL keep refusing the cast with `techDenied:busy` and the light and heavy keys SHALL keep swinging the object, with or without a weapon equipped.
4. IMB-04: The tool card SHALL be eligible whenever no tool is pending and its round lock passes, whether a weapon is equipped or not, and buying a weapon SHALL keep a pending tool.
5. IMB-04: WHEN a round starts with a tool pending and empty hands THEN the tool SHALL be delivered to the hand, with or without a weapon equipped.
6. IMB-05: WHEN the bound-weapon removal task is committed THEN no file under `src/` SHALL reference `weaponDef`, `WEAPON_KEYS`, `WEAPON_TEXTURES`, `BOUND_NAMES`, `weaponFactor`, `boundClub` or `boundKnife`.
7. IMB-06: The weapon effects SHALL reach the strikes through the return of `Player.strikeMods`, with no new field in `src/game/Player.ts`, no line added to `src/data/moves.ts`, and no net effective line added to `src/scenes/TestScene.ts` by any task of the feature.

**Independent Test**: `weapon-imbued.smoke.mjs` com `seed=1&maxAlive=1&enemyGuard=0&arsenal=bastao&tech=vermelho`: no
começo da rodada `player.heldProp` é `null`; `J J` dá `jab → direto`; o Vermelho conjura; com uma cadeira na mão a
tecla `L` dá `techDenied:busy`.

---

### P1: A arma tem nível, eixos e multiplicador ⭐ MVP

**User Story**: Como jogador, quero subir a arma por pontos em eixos que mexem no traço dela, para montar a arma do
meu jeito como monto a técnica.

**Why P1**: Sem eixos, a arma é um número só, e o plano tira isso de todo item.

**Acceptance Criteria**:

1. WPN-01: The weapon level SHALL be `1 + its axis points`, from 1 to 4, with 3 axes per weapon, at most 2 points per axis and at most 3 points in total, and the relic SHALL keep levels 1 to 3.
2. WPN-02: The axes SHALL be Lâmina `corte`, `fio`, `sangria`; Bastão `arco`, `derrubada`, `peso`; Lança `estocada`, `anulacao`, `perfuracao`, in this table order.
3. WPN-03: WHILE a weapon is equipped, `statSheet.meleeMul` SHALL multiply by 1.2 the strikes of its trait (Lâmina: `light`; Bastão: `heavy` without `counter`; Lança: `counter`), placed after the relic factor and before the vow factor, and SHALL leave every other strike unchanged.
4. WPN-03: For no weapon, the `statSheet` SHALL return exactly the F29 numbers of the POW-01.3 grid.
5. WPN-04: IF a hit comes from a world object (held swing or throw) THEN no weapon effect of this spec SHALL apply to it.
6. WPN-05: In `tests/data/weaponBalance.test.ts`, under the reference model of the Assumptions table, the sustained melee damage gain of each weapon at level 1 in its best scenario (single target or group of 3) SHALL be at most 1.5 times the gain of every other weapon in its best scenario, and SHALL be above zero in both scenarios for every weapon.

**Independent Test**: `tests/core/weaponAxes.test.ts`: o nível da arma com 0 a 3 pontos; o 3º ponto num eixo e o 4º
ponto no total recusados; `meleeMul` do `jab` com a Lâmina = 1,2 × o de sem arma, da `cotovelada` igual; com o Bastão
o inverso; com a Lança só o `contra`.

---

### P1: Lâmina corta e sangra no leve ⭐ MVP

**User Story**: Como jogador veloz, quero que todo golpe leve com a Lâmina corte, alcance mais e deixe o alvo
sangrando, para o combo leve virar pressão.

**Why P1**: É a arma que existe e mais se vê no combo de todo dia.

**Acceptance Criteria**:

1. LMN-01: WHILE the Lâmina is equipped, every `light` moveset strike SHALL reach forward `10 + 8 × fio` px farther (10, 18, 26), keeping its back edge, added to the Corpo Alcance of CRP-05.
2. LMN-02: WHEN a `light` moveset strike with the Lâmina hits a target THEN the target SHALL gain one bleed stack, up to `1 + corte` stacks (1, 2, 3), and its bleed end SHALL move to `now + 1500 + 500 × corte` ms (1500, 2000, 2500), without restarting the tick count of LMN-03.
3. LMN-03: WHILE a target bleeds, every 600 ms counted from the first application of the current bleed the system SHALL apply one hit with `band: 'chip'`, `unblockable: true`, `tech: true` and no technique id, and damage `round((2 × stacks + sangria) × hpMul)`, with `hpMul` the HP multiplier of the current round, so a single light hit with Corte 0 gives 2 ticks (600 and 1200 ms) and light hits every 250 ms still get a tick every 600 ms.
4. LMN-04: The bleed tick SHALL not pass through `meleeMul` nor the Força, and SHALL not count as a moveset strike for the Fúria, the Cadência, the energy gain, the Kokusen, the talents or the shadow step, SHALL be neither recorded nor scaled by the Adaptativo affix, SHALL not charge the Domain bar, and SHALL not be stopped by a raised common guard.
5. LMN-05: WHEN a bleeding target dies, or the area changes, or the run resets THEN its bleed SHALL end with no further tick.

**Independent Test**: `tests/core/bleed.test.ts` com o relógio injetado (599, 600 e 601 ms; com Corte 0, tique em 1200 e nada em 1800;
leves a cada 250 ms tiqueando a cada 600 ms; 3 golpes com Corte 1 dão 2 pilhas; r1 e r9 com `hpMul` 1 e 1,48 dão tique
2 e 3; Sangria 1 com 2 pilhas dá 5); smoke com `arsenal=lamina`: o `jab` deixa o
alvo com `bleed.stacks` 1 e o `damageNumbers.last.kind` passa a `chip`.

---

### P1: Bastão varre no forte ⭐ MVP

**User Story**: Como jogador lutador, quero que o golpe forte com o Bastão acerte na frente e atrás e derrube, para
abrir o cerco da horda sem golpe novo.

**Why P1**: É a outra arma que existe e o caso da horda em volta.

**Acceptance Criteria**:

1. BST-01: WHILE the Bastão is equipped, every `heavy` moveset strike without `counter` SHALL hit from `R` px behind the player's center to the farther of its own front edge and `R` px ahead, at its own height, with `R = 60 + 20 × arco` (60, 80, 100) and at least 3 targets.
2. BST-02: WHILE the Bastão has 1 `derrubada` point, every `heavy` moveset strike without `counter` that hits an unarmed common enemy SHALL carry `knockdown: true`, and WHILE it has 2 points so SHALL the strike that hits an armed common enemy; the boss SHALL never get it from the Bastão, and the Bastão SHALL never turn off a `knockdown: true` that the move or the Corpo Peso put on the hit.
3. BST-03: WHILE the Bastão is equipped, the `force` of every `heavy` moveset strike without `counter` SHALL be multiplied by `1 + 0.25 × peso` (1, 1.25, 1.5), on top of the power `forceMul` and the Corpo Peso.
4. BST-04: A target SHALL be hit at most once per strike by the sweep, front and back included.
5. BST-05: WHEN the Bastão sweep hits a target whose center is behind the player's center THEN the hit SHALL carry `direction.x = −facing`, so the target is pushed away from the player and its guard reads the side it was hit from.

**Independent Test**: smoke com `arsenal=bastao&maxAlive=2`: um comum atrás do player, a 50 px, leva a `cotovelada`;
com `axes=bastao.arco:2` um comum a 95 px atrás também leva; com `axes=bastao.derrubada:1` o comum desarmado cai e o
armado (`armed=club`) não, com 2 pontos os dois caem; o comum de trás desliza para longe do player (`x` dele se afasta).

---

### P1: Lança estende o Contra e desfaz o projétil ⭐ MVP

**User Story**: Como jogador que vive da defesa, quero que o Contra com a Lança alcance mais, atravesse alvos e desfaça
o projétil do chefe, para a leitura do ataque virar resposta.

**Why P1**: É a terceira arma da leva 1 e a primeira que muda o Contra.

**Acceptance Criteria**:

1. LNC-01: WHILE the Lança is equipped, every counter move SHALL reach forward `16 × estocada` px farther (0, 16, 32), keeping its back edge, and SHALL hit up to `1 + perfuracao` targets (1, 2, 3).
2. LNC-02: WHILE the Lança is equipped, WHEN a live `Projectile` overlaps the counter hitbox area during the counter `active` phase or within `100 × anulacao` ms after it ends THEN the projectile SHALL be removed without hitting the player, the event `nullify:<kind>` SHALL be emitted and the Lança impact SHALL play at the projectile position.
3. LNC-03: The counter moves SHALL keep `unblockable: true` with or without the Lança.
4. LNC-04: WHILE the Lança is equipped, WHEN the player blocks a hit THEN the `contra` counter window SHALL open for `COUNTER.windowMs`, as after a parry, with no new field in `src/game/Player.ts`; without the Lança a block SHALL open no window.

**Independent Test**: smoke com `round=5&bossArch=oni&bossAffix=none&arsenal=lanca`: parry na rajada, Contra, e o
`projectile` que toca a área no `active` e chegaria ao corpo já no `recovery` some com `nullify:projectile` (no
`startup` e no `active` o Contra já não leva dano, CNT-11, então só esse projétil prova a anulação); com `enemyGuard=1`
um bloqueio de frente abre a janela e `J` dá `move:contra`; com `axes=lanca.perfuracao:2` o Contra acerta 3
comuns em fila.

---

### P1: Rastro e impacto da arma ⭐ MVP

**User Story**: Como jogador, quero ver a arma no golpe que ela muda, para saber o que comprei sem olhar a loja.

**Why P1**: A arma não aparece na mão; sem o efeito, ela fica invisível.

**Acceptance Criteria**:

1. WFX-01: WHILE a weapon is equipped, WHEN a strike of its trait enters `active` THEN the system SHALL play the 4 frames of `weapon-fx-<weapon>-trail` spread evenly over that `active` phase, flipped by `facing`, on top of the cursed trail of that strike (which SHALL still play, with the reach and power length of F29 and F30), and SHALL emit `weaponFx:<weapon>:trail`.
2. WFX-02: The Lâmina and Lança trails SHALL be drawn at 1 px per texel with their anchor on the strike start point, and the Bastão trail SHALL be drawn at scale `R / 32` with its anchor on the player's center.
3. WFX-03: WHEN a strike of the weapon trait hits a target THEN the system SHALL play the 4 frames of `weapon-fx-<weapon>-impact` at 50 ms each, with its anchor on the contact point, flipped by `facing`, above the cursed impact, and SHALL emit `weaponFx:<weapon>:impact`.
4. WFX-04: The weapon trail and impact sprites SHALL count toward the `fxCap` of 40, and IF the cap is full THEN the weapon sprite SHALL be skipped while the hit and the cursed trail still apply.
5. WFX-05: The weapon effects SHALL use only the sheets of `src/game/art/hd/weaponFx/` and the `bound-*` sheets, and the BuildBar icon of the Lança SHALL be a new `bound-spear` sheet in `src/game/art/hd/weapons.ts`, drawn with `PALETTE` keys only.

**Independent Test**: smoke com cada arma: o golpe do traço emite `weaponFx:<arma>:trail` e, no acerto,
`weaponFx:<arma>:impact`; o `jab` com o Bastão não emite nada. Conferência visual em HD, em movimento, no jogo e na
prancha (`tools/weapon-fx-boards.mjs`).

---

### P2: A loja vende a arma por pontos

**User Story**: Como jogador, quero comprar a arma e os pontos dela na mesma carta de 2 eixos das técnicas e ver a arma
na `BuildBar`, para planejar a arma junto com o resto da build.

**Why P2**: Os efeitos funcionam pelo debug sem a loja; a loja é como o jogador chega a eles na run.

**Acceptance Criteria**:

1. WSH-01: The Lança card SHALL enter at the end of `GAME_SHOP_CATALOG`, with id `lanca`, kind `weapon`, name `Lança Invertida do Céu` and build `lutador`.
2. WSH-02: Before inflation, a new weapon SHALL cost 22 and its axis points 16, 22 and 28 (`16 + 6 × points placed`).
3. WSH-03: A new weapon SHALL be on sale only while the weapon slot is empty and from the round 2 shop, an axis point from the round 2 shop and the 3rd point from the round 4 shop.
4. WSH-04: The upgrade card of the weapon SHALL offer the focus axis and one other free axis drawn by `axisRng`, or only the one free axis left, with the CRD-05 lines and values of the Assumptions table, and a line `+ evolução` WHEN the purchase takes the weapon to level 4 with its catalyst in the build.
5. WSH-05: The weapon with a free axis SHALL count as an owned item with axes for card 0, the tray focus, the chest option "2 pontos de eixo" and the free point page, and the relic below level 3 SHALL count as an owned item for card 0.
6. WSH-06: WHILE 2 techniques, the Corpo, a weapon with a free axis and a relic below level 3 are owned and the highest level technique has no mark, the focus axis of that technique SHALL appear in at least 60% of the shops over 1000 seeds.
7. WSH-07: The `BuildBar` SHALL show `Arma Nv<1 + points>`, 3 dots filled by the weapon axis points, the weapon HD sheet as its icon with a gold border (`A`) once evolved, and the evolution name in the tray once evolved.
8. WSH-08: The weapon card frame SHALL be grey at level 1, blue at levels 2 and 3 and purple at level 4, and the weapon evolution card SHALL be gold.
9. WSH-09: The spent ledger of the weapon SHALL add the new weapon, its axis points and its evolution as actually paid, and WHEN the weapon is abandoned THEN its axis points and its evolution SHALL be cleared with the slot.

**Independent Test**: teste puro do preço (arma nova na r2 = `round(22 × 1,06)` = 23; o 3º ponto recusado na r3 e
aceito na r4) e da meta de 60% (`tests/core/weaponShop.test.ts`); smoke `fragments=200&round=4&arsenal=lamina`: a
carta da Lâmina mostra 2 eixos e `S` + `1` compram o 2º.

---

### P2: Evolução de arma com catalisador

**User Story**: Como jogador que levou a arma ao Nv 4, quero evoluí-la com o catalisador certo, para a arma mudar a
forma de jogar no fim da build.

**Why P2**: É o topo da trilha da arma; os três traços já se jogam sem ela.

**Acceptance Criteria**:

1. WEV-01: The weapon recipes SHALL be Lâmina + relic Faixas → `laminaDividida` (Lâmina Dividida da Alma), Bastão + relic Manoplas → `nuvemItinerante` (Nuvem Itinerante) and Lança + talent Contra Afiado → `arsenalToji` (Arsenal de Toji), and a recipe SHALL be ready WHILE the weapon is level 4, not evolved, and its catalyst is in the build at any level.
2. WEV-02: WHEN a shop opens with a weapon recipe ready THEN that evolution SHALL be on sale under the EVO-01 card 0 rule, ready recipes taken in catalog order with the technique Uniões first, at 60 before inflation.
3. WEV-03: The boss chest SHALL list each ready weapon recipe as a candidate, free.
4. WEV-04: WHEN a weapon evolves THEN it SHALL keep its id, level 4 and its axis points, the catalyst SHALL stay in the build, the event `weaponEvolved:<evolution>` SHALL be emitted, and the evolution SHALL stay WHILE the weapon stays, even IF the catalyst is abandoned later.
5. WEV-05: WHILE the Lâmina Dividida da Alma is on, every `light` moveset strike SHALL carry `unblockable: true`.
6. WEV-06: WHILE the Nuvem Itinerante is on, WHEN a `heavy` moveset strike without `counter` hits targets THEN each target it hit SHALL take 2 more hits, 120 ms and 240 ms later, with `band: 'micro'`, `tech: true`, `unblockable: true` and `round(0.5 × the first hit damage)`, skipping a target that died.
7. WEV-07: WHILE the Arsenal de Toji is on, WHEN a perfect counter hits the boss THEN its affixes SHALL be suspended for 3000 ms as the Assumptions table lists (Ígneo, Invocador, Sangue Convergente, Adaptativo; Finger Bearer unchanged), a new perfect counter on the boss SHALL restart the 3000 ms, the affix glyphs SHALL show at alpha 0.3 meanwhile, and the event `affixSuppressed` SHALL be emitted.

**Independent Test**: teste puro da receita (Nv 3 com Faixas: não pronta; Nv 4 sem Faixas: não pronta; Nv 4 com
Faixas Nv 1: pronta; evoluída: não pronta) e da supressão com o relógio injetado (2999 e 3000 ms); smoke com
`arsenal=lamina,faixas&axes=lamina.corte:2,lamina.fio:1&evo=laminaDividida&enemyGuard=1`: o `jab` passa a guarda.

---

### P3: Debug e snapshot da arma

**User Story**: Como desenvolvedor e smoke, quero montar a arma pela URL e ler o estado dela no snapshot, para provar
cada efeito no jogo vivo.

**Why P3**: Serve aos smokes das histórias acima.

**Acceptance Criteria**:

1. WDB-01: WHEN the run starts with `?debug&arsenal=<weapon>` THEN the weapon SHALL be equipped at level 1, and a repeated weapon id SHALL be ignored while a repeated relic id SHALL raise the relic level as today.
2. WDB-02: WHEN the run starts with `?debug&axes=<weapon>.<axis>:<n>[,...]` THEN the system SHALL set those points on the equipped weapon within the caps of WPN-01, and IF the weapon is not equipped, the axis is unknown or a cap is passed THEN the excess SHALL be ignored.
3. WDB-03: WHEN the run starts with `?debug&evo=<evolution>` THEN the weapon SHALL evolve IF its recipe is ready after `arsenal=`, `perks=` and `axes=`, and the parameter SHALL be ignored otherwise.
4. WDB-04: The debug snapshot SHALL report `arsenal: {relic, relicLevel, weapon, weaponLevel, weaponAxes, evolution, tool}`, with `weaponAxes` as `{<axis>: points}` and `evolution` as the evolution id or `null`, typed in a file apart from `debugApi.ts`.
5. WDB-05: The debug snapshot SHALL report, for every common enemy and the boss, `bleed: {stacks, msLeft}`, with `{stacks: 0, msLeft: 0}` when it does not bleed.

**Independent Test**: smoke lê `arsenal.weaponAxes` e `arsenal.evolution` depois de
`arsenal=lanca&perks=contraAfiado&axes=lanca.estocada:2,lanca.perfuracao:1&evo=arsenalToji`.

---

## Edge Cases

- IF the weapon is abandoned while a target still bleeds THEN that bleed SHALL run to its end with the stacks and tick it had.
- WHEN two `light` strikes with the Lâmina hit the same target in the same frame THEN each SHALL add one stack, within the `1 + corte` cap.
- IF a bleed tick lands on a downed or ragdolled common enemy THEN it SHALL apply as a `chip` hit (no `downHits`, no reaction), as POW-15 says for every banded hit.
- WHEN the counter of the Lança touches a projectile and no enemy THEN the projectile SHALL still be removed (LNC-02).
- WHEN light strikes land on a bleeding target faster than every 600 ms THEN the ticks SHALL keep their 600 ms rhythm (LMN-03).
- WHEN a guarding common bleeds THEN its ticks SHALL pass the guard (LMN-04), and WHEN the Bastão hits a common behind the player THEN that common SHALL be pushed away from the player (BST-05).
- IF the Bastão sweep and the front hitbox both touch the same target THEN it SHALL take one hit (BST-04).
- WHEN the Nuvem Itinerante extra hits are due and the area changes or the run resets THEN they SHALL be dropped.
- IF a weapon reaches level 4 with no catalyst THEN no evolution SHALL be on sale, and WHEN the catalyst is bought later THEN the recipe SHALL become ready at the next shop.
- IF `axisRng` would draw a weapon axis with 2 points or a weapon with 3 points THEN that axis or weapon SHALL not be offered.
- WHEN a run resets THEN the weapon, its points, its evolution, every bleed and every affix suppression SHALL be cleared.

### Implicit-requirement dimensions

| Dimension | Coverage |
| --- | --- |
| Input validation & bounds | WPN-01 (teto 2 por eixo, 3 no total), WDB-01 a WDB-03 (parâmetro inválido ignorado), LMN-02 (teto de pilhas) |
| Failure / partial-failure states | WFX-04 (`fxCap` cheio: o efeito some e o golpe vale); o resto N/A because não há I/O nem salvamento |
| Idempotency / retry / duplicate handling | BST-04 (um acerto por alvo por golpe), WEV-01 (receita evoluída não fica pronta de novo), WDB-01 (id de arma repetido) |
| Auth boundaries & rate limits | N/A because é jogo local sem usuário; o único teto de frequência é o tique de 600 ms (LMN-03) |
| Concurrency / ordering | Edge cases (dois leves no mesmo quadro); WPN-03 (ordem dos fatores no `meleeMul`, que decide o `Math.round`) |
| Data lifecycle / expiry | LMN-03 e LMN-05 (fim do sangramento), WEV-07 (3000 ms da supressão), reset da run nos Edge cases |
| Observability | WDB-04, WDB-05 e os eventos `weaponFx:*`, `nullify:*`, `weaponEvolved:*`, `affixSuppressed` |
| External-dependency failure | N/A because a F36 não chama serviço externo; a dependência é o branch de arte, tratada como premissa |
| State-transition integrity | WPN-01 (nível derivado dos pontos), WEV-04 (evoluída fica até o abandono), WSH-09 (abandono limpa pontos e evolução), IMB-01 (a arma nunca vira `Prop`) |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| IMB-01 | P1: A arma fica guardada e o combo continua | Tasks | Pending |
| IMB-02 | P1: A arma fica guardada e o combo continua | Tasks | Pending |
| IMB-03 | P1: A arma fica guardada e o combo continua | Tasks | Pending |
| IMB-04 | P1: A arma fica guardada e o combo continua | Tasks | Pending |
| IMB-05 | P1: A arma fica guardada e o combo continua | Tasks | Pending |
| IMB-06 | P1: A arma fica guardada e o combo continua | Tasks | Pending |
| WPN-01 | P1: A arma tem nível, eixos e multiplicador | Tasks | Pending |
| WPN-02 | P1: A arma tem nível, eixos e multiplicador | Tasks | Pending |
| WPN-03 | P1: A arma tem nível, eixos e multiplicador | Tasks | Pending |
| WPN-04 | P1: A arma tem nível, eixos e multiplicador | Tasks | Pending |
| WPN-05 | P1: A arma tem nível, eixos e multiplicador | Tasks | Pending |
| LMN-01 | P1: Lâmina corta e sangra no leve | Tasks | Pending |
| LMN-02 | P1: Lâmina corta e sangra no leve | Tasks | Pending |
| LMN-03 | P1: Lâmina corta e sangra no leve | Tasks | Pending |
| LMN-04 | P1: Lâmina corta e sangra no leve | Tasks | Pending |
| LMN-05 | P1: Lâmina corta e sangra no leve | Tasks | Pending |
| BST-01 | P1: Bastão varre no forte | Tasks | Pending |
| BST-02 | P1: Bastão varre no forte | Tasks | Pending |
| BST-03 | P1: Bastão varre no forte | Tasks | Pending |
| BST-04 | P1: Bastão varre no forte | Tasks | Pending |
| BST-05 | P1: Bastão varre no forte | Tasks | Pending |
| LNC-01 | P1: Lança estende o Contra e desfaz o projétil | Tasks | Pending |
| LNC-02 | P1: Lança estende o Contra e desfaz o projétil | Tasks | Pending |
| LNC-03 | P1: Lança estende o Contra e desfaz o projétil | Tasks | Pending |
| LNC-04 | P1: Lança estende o Contra e desfaz o projétil | Tasks | Pending |
| WFX-01 | P1: Rastro e impacto da arma | Tasks | Pending |
| WFX-02 | P1: Rastro e impacto da arma | Tasks | Pending |
| WFX-03 | P1: Rastro e impacto da arma | Tasks | Pending |
| WFX-04 | P1: Rastro e impacto da arma | Tasks | Pending |
| WFX-05 | P1: Rastro e impacto da arma | Tasks | Pending |
| WSH-01 | P2: A loja vende a arma por pontos | Tasks | Pending |
| WSH-02 | P2: A loja vende a arma por pontos | Tasks | Pending |
| WSH-03 | P2: A loja vende a arma por pontos | Tasks | Pending |
| WSH-04 | P2: A loja vende a arma por pontos | Tasks | Pending |
| WSH-05 | P2: A loja vende a arma por pontos | Tasks | Pending |
| WSH-06 | P2: A loja vende a arma por pontos | Tasks | Pending |
| WSH-07 | P2: A loja vende a arma por pontos | Tasks | Pending |
| WSH-08 | P2: A loja vende a arma por pontos | Tasks | Pending |
| WSH-09 | P2: A loja vende a arma por pontos | Tasks | Pending |
| WEV-01 | P2: Evolução de arma com catalisador | Tasks | Pending |
| WEV-02 | P2: Evolução de arma com catalisador | Tasks | Pending |
| WEV-03 | P2: Evolução de arma com catalisador | Tasks | Pending |
| WEV-04 | P2: Evolução de arma com catalisador | Tasks | Pending |
| WEV-05 | P2: Evolução de arma com catalisador | Tasks | Pending |
| WEV-06 | P2: Evolução de arma com catalisador | Tasks | Pending |
| WEV-07 | P2: Evolução de arma com catalisador | Tasks | Pending |
| WDB-01 | P3: Debug e snapshot da arma | Tasks | Pending |
| WDB-02 | P3: Debug e snapshot da arma | Tasks | Pending |
| WDB-03 | P3: Debug e snapshot da arma | Tasks | Pending |
| WDB-04 | P3: Debug e snapshot da arma | Tasks | Pending |
| WDB-05 | P3: Debug e snapshot da arma | Tasks | Pending |

**Coverage:** 51 total, 51 mapeados para tarefas, 0 sem tarefa (mapa em `tasks.md`, "Requirement Coverage").

**Testes e smokes previstos:** `tests/core/weaponAxes.test.ts` (WPN-01 a WPN-04, com a grade do POW-01.3 sem arma),
`tests/data/weaponBalance.test.ts` (WPN-05, modelo de referência), `tests/core/bleed.test.ts` (LMN-02 a LMN-05,
limites de 600 ms e da duração dos dois lados, L-010),
`tests/core/weaponShop.test.ts` (WSH-02 a WSH-06, meta de 1000 seeds), `tests/core/weaponEvolution.test.ts` (WEV-01 a
WEV-04, WEV-07 com o relógio injetado em 2999 e 3000 ms), `tests/core/arsenal.test.ts` refeito (IMB-04, sem
`weaponDef`), `tests/game/hdWeapons.test.ts` (a folha `bound-spear` na paleta); smokes `weapon-imbued` (novo) e
`arsenal` (reescrito), mais `build-bar`, `shop`, `shop-axes`, `fight`, `defense`, `boss`, `held-item`, `armed` e
`power` iguais. O teste do adaptador confere a chamada que leva a textura, a escala e o `flipX` ao Phaser, não só a
função pura (L-043).

---

## Success Criteria

- [ ] Numa run com a Lâmina, o player faz o combo leve inteiro, conjura e contra-ataca sem nunca segurar a arma, e o
      alvo do leve sangra com o número cinza.
- [ ] Com o Bastão, o forte acerta o comum que está atrás do player, e com Derrubada 1 o comum desarmado cai.
- [ ] Com a Lança, o bloqueio abre o Contra, e o Contra depois do parry na rajada do chefe desfaz o projétil que o
      acertaria no `recovery`.
- [ ] Nenhuma arma é a escolha óbvia: no modelo do WPN-05 o ganho de uma não passa de 1,5× o de outra.
- [ ] As três evoluções saem na loja ou no baú com a arma no Nv 4 e o catalisador, e cada uma muda o golpe do traço.
- [ ] `npm run gate` verde, os smokes da lista verdes, a `TestScene` sem linha líquida nova e o `moves.ts` com 397
      linhas.
