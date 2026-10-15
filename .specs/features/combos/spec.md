# Combos - Specification

## Problem Statement

Depois da F36 o jogo tem duas famílias de receita com formas diferentes e nenhuma regra comum: a União do Roxo
(`data/evolutions.ts`, `from: [RecipePiece, RecipePiece]` com `minLevel` por técnica, F33) e as três evoluções de arma
(`WEAPON_RECIPES` em `data/weapons.ts`, arma + relíquia ou talento, F36). A loja ainda pega **uma** receita pronta só
(`pool.find`, `core/shop.ts:292`), então uma segunda receita pronta fica escondida sem o jogador saber, e não há como
uma receita pedir talento, Domínio ou "qualquer técnica". As técnicas da leva 1 (F34) e a Zona Negra (F35) chegaram sem
as receitas da tabela de combos do plano, e nada na loja avisa que falta só uma peça para um combo. A F37
(`docs/plano-builds-e-habilidades.md`, linha F37 da seção 6; seção 5.7) junta tudo numa lista só de receitas
`{kind, id, minLevel}[]`, oferece **todas** as prontas no baú do chefe e na loja, põe a 2ª União (Ressonância
Cortante) e as Evoluções de técnica da leva 1 (Punho Negro Divergente e Vácuo de Troca), fixa a regra de combo e o
teste de nomes e textos únicos, e dá a dica do Grimório na loja. Os Duos ficam para a leva 2 (F41), mas a estrutura de
dados já os aceita.

A F37 vem depois da F29 a F36 e usa o que elas entregam sem mudar o contrato:
- F30: a carta 0 (CRD-02: com receita pronta, ela é a receita e a carta de melhoria do foco não sai), as 4 cartas
  (CRD-01), a inflação (PRC-03), o `ChoicePanel`, o `kokusenScale` (ESC-02) e o texto de carta de até 20 caracteres por
  linha (CRD-05).
- F33: `RecipePiece`/`minLevel` e a União do Roxo (RXO-01, RXO-02, RXO-12 com a herança de pontos e as páginas
  `heranca`), o baú do chefe (`core/bossChest.ts`, BAU-01 a BAU-08, `chestRng`), a fila do painel (CHC-02, CHC-03,
  CHC-08), os ramos e Despertares do Azul, do Desmantelar e do Divergente (alvos do soco, Eco Negro, Concentrado) e o
  teste de nomes únicos de ramos e Despertares (EIX-10).
- F34: o registro `TechId → TechModule`, o `TechEmitter`, o Boogie Woogie (`core/swap.ts`, `BoogieState`, BWG-01 a
  BWG-13: a troca recusa o orbe do Azul) e a Ressonância (`ResonanceState`, RSN-01 a RSN-14: pregos, marcas, 2º toque,
  Grampo, Boneco, Coroa), com os nomes de ramo e Despertar no teste do EIX-10 (JJK-13).
- F35: o `SlotIndex` com 3 slots, o pool de 7 vagas (POL-01, POL-06, POL-08), os talentos com nível (`Perks` como
  `Map`, Zona Negra `zonaNegra` e Contra Afiado `contraAfiado`), o `buildEffects` com os tetos do Kokusen (BEF-03: +30 ms
  de janela; BEF-04: multiplicador até 3,4), a `BuildBar`, o livro de gastos e o Abandonar (ABD-02: devolve
  `floor(0,4 × gasto)`; ABD-07: carta que deixou de valer fica cinza e é recusada).
- F36: a arma imbuída com nível 1 a 4, as receitas de arma (WEV-01: Lâmina + Faixas, Bastão + Manoplas, Lança +
  Contra Afiado), os efeitos das três evoluções (WEV-04 a WEV-07), a opção `arma:<id>` do baú (WEV-03) e o `evo=` de
  debug (WDB-03).
- F31: os Domínios com nível 1 a 3 (`santuario`, `jackpot`, `amplificacao`).

Código conferido em 15/10 no worktree `docs/spec-vermelho-e-corpo` (`666ad13`), que ainda não tem a F29 a F36:
- `src/data/evolutions.ts`: `Recipe { into: TechId; from: readonly [TechId, TechId]; cost; name }`, só o Roxo
  (`from: ['azul', 'vermelho']`, 60).
- `src/core/evolution.ts`: `EVOLUTION_LEVEL = 3` (l.5), `recipeReady` (l.8-10, as duas técnicas no nível),
  `evolve` (l.16-24: a técnica nova fica no slot de `from[0]`, o outro slot esvazia).
- `src/core/shop.ts`: `evolutionEligible` (l.25-28, receita pronta e resultado não equipado), o edge case da F24 em
  `techniqueEligible` (l.32: com a evolução equipada, as peças não voltam à loja), `drawFresh` (l.286-298:
  `pool.find((e) => e.kind === 'evolution')` põe **uma** evolução na carta 0), `cardCost` (l.215, EVO-04) e
  `applyEvolution` (l.246).
- `src/data/shop.ts:232-248`: `EVOLUTION_SHOP_ENTRIES` (uma carta por receita, rara, sem nível) no fim do
  `GAME_SHOP_CATALOG`.
- `src/scenes/test/shopDirector.ts:63-71`: `applyEvolution` chama `evolve`, zera a maestria dos dois slots e emite
  `evolve:<id>`.
- `src/core/kokusen.ts`: a tentativa por conjuração (`press`, l.70-75: o 1º aperto depois do 1º impacto decide, `hit`
  ou `miss`) e `land` (l.78-82: energia e Zona). `src/core/divergent.ts:26-28`: um alvo por conjuração hoje (a F33 o
  abre para até 3, com o Kokusen só no alvo principal).
- `src/data/arsenal.ts:10`: `RelicId = 'manoplas' | 'faixas' | 'rosario'`. `src/data/perks.ts:13`: `PerkId` (a F35
  acrescenta `proporcao`, `horaExtra` e `zonaNegra`).
- Branch `feat/regras-tecnicas-leva1` (`wt-leva1`): `src/data/resonance.ts` (pregos 3/4/5/6 por toque, dano do prego
  3 `micro`, detonação 20 a 44 por marca, marca 6 a 12 s) e `src/core/resonance.ts` (marcas por alvo sem teto,
  `cascade`, `crown`).

## Goals

- [ ] Toda receita do jogo (Uniões, Evoluções de técnica, de arma e, na leva 2, Duos) mora numa lista só, com peças
      `{kind, id, minLevel}` de técnica, talento, arma, relíquia ou Domínio, e uma regra pura só decide se ela está
      pronta.
- [ ] Toda receita pronta aparece no baú do chefe e na loja (até 2 por loja, em rodízio quando há 3); nenhuma fica
      escondida atrás de outra por mais de uma loja seguida, e a loja nunca fica sem carta de item novo e de sorteio.
- [ ] A Ressonância Cortante e as Evoluções Punho Negro Divergente e Vácuo de Troca entram no jogo, cada uma fazendo
      algo que nenhuma das peças faz sozinha em toda build em que fica pronta, e a Ressonância Cortante libera uma vaga
      do pool sem virar a escolha óbvia contra um alvo só.
- [ ] O `npm run gate` falha se dois Despertares, ramos, Uniões, Evoluções ou Duos tiverem o mesmo nome ou o mesmo
      texto.
- [ ] Com metade de uma receita na mão, a carta da loja que traz a peça que falta diz para qual combo ela serve.
- [ ] A `TestScene` não ganha nenhuma linha efetiva líquida na F37.

## Passos e commits

Na ordem. Refatoração é passo próprio, com os smokes iguais; a mudança de comportamento vem no passo seguinte. Cada
passo de combo termina jogável (o combo aparece na loja e no baú e funciona na luta).

| Passo | O que entra | `TestScene` (efetivas) |
| --- | --- | --- |
| 0. **Refatoração, com os smokes iguais** | Lista única de receitas em `data/evolutions.ts` com peças `{kind, id, minLevel}` e o tipo `uniao`/`evolucao`/`duo`; o Roxo e as 3 receitas de arma migram (`WEAPON_RECIPES` sai de `data/weapons.ts`); `recipeReady` genérico sobre uma vista da build; a carta 0 e o baú continuam pegando como hoje; nasce `tests/data/combos.test.ts` com os nomes e textos de hoje | 0 |
| 1. **Todas as prontas** | Loja com até 2 prontas nas cartas 0 e 1 (rodízio com 3); baú com todas as prontas; carta de receita que deixou de valer recusada; ids do baú e do snapshot `uniao:`/`evolucao:`; regra pura dos Duos com teto 4 | 0 |
| 2. **Ressonância Cortante** | União que mantém a peça principal; cortes que cravam marca, com teto de marcas por alvo; vaga liberada e devolução do Desmantelar; nome e marca do combo no HUD e na `BuildBar` | 0 |
| 3. **Punho Negro Divergente** | Kokusen em todo 2º impacto da conjuração (pede o Divergente com 2 alvos ou mais) e +0,3 no multiplicador; ganhos por Kokusen uma vez por conjuração | 0 |
| 4. **Vácuo de Troca** | Troca com o orbe do Azul levando o grupo puxado | 0 |
| 5. **Grimório** | Dica `Grimório: <dica>` na carta da peça que falta; linha `anula <dica>` na União que consome o catalisador de uma Evolução; receitas reveladas na run | 0 |

## Out of Scope

| Feature | Reason |
| --- | --- |
| Os 6 Duos (Troca Explosiva, Prego Rubro, Contra Amaldiçoado, Sombra no Contra, Ordem Elétrica, Impacto Elétrico), a carta rara de Duo e o sorteio dela | Leva 2 (F41). A F37 só põe o tipo `duo`, a peça curinga e o teto de 4 por run na regra pura |
| Rede de Cortes, Sangue Eterno e Palavra no Ponto Fraco | Leva 2 (F41): dependem do Santuário como catalisador de Evolução, da Convergência e da Fala com Seis Olhos |
| Osso de Dragão e Dragão Refletido | Leva 2 (F41), como na F36 |
| Grimório persistente entre runs e a tela do Grimório | F39 (`meta-minima`). A F37 só guarda na run as receitas reveladas e as mostra no snapshot |
| Ramos, Despertares e eixos próprios da Ressonância Cortante | Ela continua sendo a Ressonância (mesmo item, eixos, ramo e Despertar); só o 1º toque muda |
| Herança de pontos (RXO-12) na União que mantém a peça principal | A herança da F33 é da "técnica nova" que a União cria; aqui a principal já está no Nv 4 (3 pontos) e o único ponto que a fórmula ainda daria seria o 4º, o Despertar de graça que o RXO-12 existe para evitar. O investimento no Desmantelar volta como a devolução do Abandonar (ver Assumptions) |
| Teste de eixo dominante com o modelo da Ressonância Cortante | O JJK-12 mede a Ressonância; a União troca duas vagas por uma e não entra no teste de eixo. O que segura o grupo é o teto de marcas por alvo (CRT-02) e a conta de marcas do CRT-09, não um teste de eixo |
| Receita com Domínio ou relíquia como peça principal | O tipo aceita (`kind: 'dominio'`, `'reliquia'`), mas nenhuma receita da leva 1 usa |
| Banner e câmera lenta na formação do combo | O combo se forma na konbini, sem luta na tela; o sinal é o nome e a marca no ícone (CGL-04) e o evento `combo:<id>` |
| Paleta própria por combo (rampa nova em `art/palette.ts`) | Feature de arte à parte, como na F33 |
| Versão antiga (`?hd=0`) | Não recebe trabalho novo; os smokes antigos só não podem quebrar |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| 3 técnicas + Domínio, pool de 7 vagas, arma imbuída (fica guardada e muda os golpes existentes, sem golpe novo, sem ir à mão), escala na F30, nada automático | Valem como estão | Confirmadas pelo usuário (decisões 1, 3, 5 e 6 da seção 7 e o pedido) | y |
| Limiar das receitas (decisão 8) | Peça principal no Nv 4 e catalisador em qualquer nível, para toda União e Evolução | Recomendação do plano, que o usuário mandou seguir | y |
| Prefixos dos requisitos | RCP (receitas e prontidão), OFR (oferta na loja e no baú), UNI (Uniões), CRT (Ressonância Cortante), PND (Punho Negro Divergente), VAC (Vácuo de Troca), NOM (nomes únicos e regra de combo), GRM (Grimório), DUO (estrutura dos Duos), CDB (debug e snapshot), CGL (regras gerais) | O validador só aceita `CAT-NN`; nenhum desses prefixos existe nas specs nem no código (`CMB` já existe) | y |
| Forma da receita | `{ type: 'uniao' \| 'evolucao' \| 'duo'; id; name; text; hint; cost; pieces: readonly RecipePiece[]; into?: TechId }`, com `RecipePiece = { kind: 'tecnica' \| 'talento' \| 'arma' \| 'reliquia' \| 'dominio' \| 'eixo'; id; minLevel }`; a peça `eixo` tem `id` `<item>.<eixo>` e pede pontos num eixo da peça principal (só o Punho Negro a usa, ver "Punho Negro com um alvo só"). A 1ª peça é a principal na Evolução e na União que mantém a principal; `into` só existe na União que cria técnica nova (o Roxo) | É o `{kind, id, minLevel}[]` da seção 5.7, com o que a loja, o baú, o Grimório e o teste de nomes precisam ler | n |
| Nível de cada tipo de peça | Técnica: `1 + pontos de eixo`, equipada num slot; talento: o nível do `Perks`; arma: `1 + pontos`, equipada; relíquia: o nível dela, equipada; Domínio: o nível dele; eixo: os pontos naquele eixo do item equipado, 0 quando o item não está equipado ou quando o ramo deixa o eixo sem efeito (o `alvos` no Concentrado, DVG-06) | O nível que cada fase já mostra na `BuildBar` (BBR-02, BBR-03); o eixo morto conta 0 porque ponto sem efeito não pode abrir combo | n |
| Receita pronta | Toda peça possuída no nível mínimo ou acima, e a receita ainda não feita: na União com `into`, o resultado não está equipado; na Evolução e na União que mantém a principal, a peça principal não carrega combo nenhum. Um item carrega no máximo 1 combo | Generaliza o `evolutionEligible` de hoje e o "não evoluída" do WEV-01; "no máximo 1" impede duas mutações no mesmo item sem regra de soma | n |
| Ids das receitas | `roxo` (União, `into: 'roxo'`), `ressonanciaCortante` (União), `punhoNegro` e `vacuoDeTroca` (Evoluções de técnica), `laminaDividida`, `nuvemItinerante` e `arsenalToji` (Evoluções de arma, os ids da F36) | Ascii sem acento, no molde dos ids da F33 a F36 | n |
| Ordem da lista | Uniões, depois Evoluções de técnica, depois Evoluções de arma, depois Duos; dentro de cada grupo, na ordem da tabela da seção 5.7 | Mantém o "Uniões de técnica primeiro" do WEV-02; a lista decide a ordem das cartas e do baú, não a posição no catálogo | n |
| Quantas prontas cabem | Baú: até 3, as 3 primeiras da lista. Loja: até 2; com 3 ou mais prontas, a loja mostra 2 das 3 primeiras da lista e deixa de fora a de índice `round mod 3` (as outras duas na ordem da lista), então cada receita fica fora de no máximo uma loja seguida. Na leva 1 nunca há mais de 3 ao mesmo tempo: com 3 slots cabem no máximo 2 receitas de técnica (Roxo e Vácuo dividem o Azul; Cortante e Punho Negro usam 3 slots) e 1 de arma | O `ChoicePanel` mostra até 3 opções (F33). Na loja, 3 receitas tomariam as cartas 0 a 2 e a carta de item novo a 3: nenhuma carta de sorteio e nenhuma melhoria, loja após loja, para quem não quer ou não pode pagar ~85 por receita (r8), porque o reroll mantém as receitas (OFR-03). O rodízio usa a rodada e não gasta `rng` | n |
| Lugar das prontas na loja | Com k receitas mostradas (k de 0 a 2), as cartas 0 a k − 1 são elas; a carta de melhoria do foco não sai (como o CRD-02 já faz com uma); a regra da carta de item novo (POL-06) vale para a carta `max(k, 1)`; as outras saem do sorteio por peso, então sobra sempre ao menos 1 carta de sorteio | "Todas as prontas" sem tirar a carta de item novo de quem ainda monta a build | n |
| Receita pronta que o jogador não quer | A carta dela continua nas cartas 0 e 1 de toda loja enquanto estiver pronta, e a carta do foco do CRD-02 não sai enquanto houver receita mostrada | É o contrato da F30 (CRD-02) estendido; o teto de 2 deixa sempre a carta de item novo e uma de sorteio. Quem quer a melhoria do foco de volta compra a receita, abandona uma peça ou espera a loja do rodízio | n |
| Linhas da carta de receita | As linhas `herda`, `+1 vaga, devolve <n>` e `anula <dica>` e a moldura cinza do OFR-06 saem da vista da build no momento de cada `view()` da loja, como o ABD-07 recalcula o preço e o `OCUPA VAGA`; a compra de uma receita muda na hora as linhas e a moldura das outras cartas abertas | Sem isso a carta do Roxo aberta na mesma loja em que o Vácuo foi comprado não avisaria `anula Vácuo`, que é o momento em que o aviso importa | n |
| Lugar das prontas no baú | Toda receita pronta (até 3) entra; as outras opções do BAU-01 (pontos, Domínio, nível de talento) completam até 3, sorteadas pelo `chestRng`; a ordem das cartas continua saindo do `chestRng` | Seção 3.1 ("evolução ou União pronta grátis") e "o baú oferece todas as prontas" (seção 5.7) | n |
| Ids de opção do baú e do snapshot | `uniao:<id>` e `evolucao:<id>`; o `arma:<id>` da F36 vira `evolucao:<id>` | Um prefixo por tipo de receita serve o baú, o snapshot e o Grimório sem tabela por família; o smoke da arma acompanha no passo 1 | n |
| Preço | 60 antes da inflação (PRC-03); grátis no baú | Seção 3.2 e WEV-02 | n |
| Livro de gastos (ABD-02) | O preço pago pela Evolução ou pela União que mantém a principal entra no livro da peça principal; o Roxo segue o ABD-02 | Abandonar o item evoluído devolve 40% do que se pagou nele, combo incluso | n |
| União que mantém a peça principal (Ressonância Cortante) | A Ressonância fica no slot dela com `TechId`, pontos, ramo, Despertar e maestria; o Desmantelar sai do slot como no Abandonar (pontos, ramo e Despertar zerados, recarga 0, páginas dele fora da fila) e a carteira recebe a devolução do ABD-02 sobre o livro dele; o pool cai 1 | "Fica no slot da Ressonância e libera uma vaga" (seção 5.7). Sem herança: a principal já está no Nv 4 e o ponto que o RXO-12 ainda daria seria o Despertar de graça que ele proíbe (ver Out of Scope); a devolução do Abandonar é a regra que o jogo já tem para "item que sai da build". Os pontos grátis do Desmantelar (maestria, baú) não voltam, como no Abandonar; a carta mostra a devolução real antes da compra (OFR-07) | n |
| Cortes da Ressonância Cortante | No 1º toque, no lugar dos pregos, saem N cortes, N o valor resolvido do eixo Pregos (3 a 6), a `i × 60 ms` (i de 0 a N − 1), cada um num retângulo de 0 a 180 px à frente do centro do player (a borda de trás no centro dele), altura 48, ângulos 20/−25/70 repetidos. Todo comum vivo e o chefe que o corte toca levam 1 acerto `micro` com o dano do prego (3), uma vez por corte; o acerto crava 1 marca enquanto o alvo tem menos de `floor(N / 2)` marcas postas por esta rajada (1, 2, 2 e 3 para N de 3 a 6), e depois disso só dá o acerto | "Cada corte crava marca". O número de cortes sai do eixo que a Ressonância já tem (os dois eixos vão de 3 a 6); a geometria fixa evita ler pontos de uma técnica que saiu da build. A faixa começa no centro do player e não nos 60 px do Desmantelar: a União promete "detonar o grupo de perto", e o comum colado no player, o primeiro que os pregos acertariam, ficaria sem marca. O teto por alvo impede a União de ser a escolha óbvia: sem ele, N marcas em cada alvo da faixa dariam N × alvos marcas (os pregos dão N, todos no 1º alvo da fila, F34), 3× o dano dos pregos com 3 comuns e 5× com 5, com a Coroa de Pregos e o Grampo multiplicando junto. Com `floor(N / 2)`, contra 1 alvo a rajada dá menos marcas que os pregos (a troca real: perde o foco, ganha o grupo) e contra 3 alvos dá no máximo 1,5× (CRT-09) | n |
| Regras da Ressonância que reagem ao prego | Toda regra que reage ao prego cravado (Grampo, contagem de marcas, Coroa de Pregos, Boneco, Propagação ao matar) reage do mesmo jeito à marca posta por um corte; o 2º toque, a vida da marca, a detonação e a recarga não mudam | Uma regra só, sem tabela nova por ramo; o ramo e o Despertar continuam valendo | n |
| Punho Negro Divergente ("todo 2º impacto tenta Black Flash") | O Kokusen continua pedindo o aperto na janela (nada automático); com o `hit`, todo 2º impacto da conjuração vira Kokusen (cada alvo registrado pelo 1º impacto, F33), não só o do alvo principal. Todo ganho que hoje sai "por Kokusen" sai uma vez por conjuração, do alvo principal: a energia, a Zona, a carga de +15 do Domínio (DOM-02, F31) e o anel de 48 px da Zona Negra Nv 3 (TAL-15, F35), que não acerta quem levou Kokusen naquela conjuração; o cinema de tela também é só do principal | Sem o aperto o Black Flash viraria chance automática; o Divergente sozinho só dá o Kokusen no alvo principal, e a Zona Negra só alarga a janela e o multiplicador. Com 3 Kokusen contando cada um, uma conjuração encheria 45 da barra de Domínio (o ritmo de referência da F31 é ~46 s para a barra inteira) e soltaria 3 anéis da Zona Negra sobre os mesmos alvos | n |
| Punho Negro com um alvo só | A receita tem uma 3ª peça, `eixo` `divergente.alvos` no mínimo 1: o Divergente precisa registrar 2 alvos ou mais. Com 0 ponto em Alvos, ou no ramo Concentrado (o eixo fica sem efeito, DVG-06), a receita não fica pronta; a carta de ponto de Alvos leva a dica do Grimório | Com 1 alvo o "Kokusen em todo alvo do soco" não faz nada, e o combo viraria só +0,3 no multiplicador, o "mesmo efeito maior" que a regra de combo proíbe, vendido por 60 e preso na carta 0 da loja. Não muda o limiar da decisão 8 (principal no Nv 4, catalisador em qualquer nível): acrescenta a condição sem a qual o combo não existe | n |
| Janela do Kokusen no Punho Negro | A Evolução não soma janela; a janela continua a sorteada com o bônus da build no teto de +30 ms (BEF-03) | O plano diz "a janela respeita o teto" sem número; somar ms seria "o mesmo efeito maior", que a regra de combo proíbe | n |
| Multiplicador do Punho Negro | +0,3 sobre o multiplicador do `buildEffects` (2,5 base, Zona Negra 2,8 ou 3,1), com o teto 3,4 do BEF-04 | Seção 5.2 ("o Punho Negro Divergente soma +0,3, teto ×3,4") | n |
| Vácuo de Troca: alvo | Com o Vácuo, o orbe vivo do Azul a até o alcance resolvido do Boogie (do centro do player ao centro do orbe, para qualquer lado) vira o alvo da troca, antes de qualquer outro candidato; sem orbe nesse alcance, a troca segue o BWG-01 e o orbe do Azul continua fora dos candidatos | O orbe do Azul costuma ficar à frente, mas o Andante e o Lapso o levam para os lados; trocar com ele é o centro do combo, e o BWG-01 o tira da troca sem o Vácuo | n |
| Vácuo de Troca: o grupo | Na troca, o player vai ao centro do orbe (pelo `fits` do BWG-01), o orbe vai ao centro antigo do player com a vida, a fase e o puxão que restam, e todo comum vivo com o centro dentro do raio resolvido do orbe naquele quadro anda o mesmo deslocamento do orbe, com velocidade zero, cada um só se a caixa dele couber (senão fica); o chefe nunca anda | "O orbe leva o grupo puxado para onde o player estava, e o player sai do cerco"; o chefe nunca é puxado pelo Azul (`blue.ts:50-64`) e não muda aqui | n |
| Catalisador depois do combo | A Evolução fica mesmo se o catalisador sair da build depois (abandono ou União); o combo sem o catalisador continua aplicado, e o efeito que depende dele (o orbe do Azul no Vácuo) só deixa de ter alvo | Regra do WEV-04 da F36 estendida às técnicas; desfazer por abandono de outro item seria armadilha | n |
| União que consome o catalisador de uma Evolução já feita | A carta e a opção do baú dessa União levam a linha `anula <dica>` (Roxo com o Vácuo de Troca feito: `anula Vácuo`) | O mesmo aviso do `anula Alvos` da F33: quem escolhe precisa saber o que perde antes de confirmar | n |
| Dica do Grimório ("metade da receita está na mão") | Uma receita está "meio na mão" quando não está feita nem pronta e ao menos `ceil(itens / 2)` das suas peças de item (todas menos a `eixo`) estão possuídas em qualquer nível. A carta à venda que traz uma peça que falta (técnica, talento, arma ou relíquia nova), um nível ou ponto de uma peça possuída abaixo do nível mínimo, ou o ponto do eixo que uma peça `eixo` pede, leva a linha `Grimório: <dica>`, com a 1ª receita da lista que ela serve | A carta é onde a decisão acontece; a `BuildBar` e o `ShopPanel` não crescem. A linha cabe nos 20 caracteres com a dica de até 10 | n |
| Dicas das receitas | `Roxo`, `Cortante`, `P. Negro`, `Vácuo`, `Lâmina Div`, `Nuvem`, `Toji`, todas com até 10 caracteres | `Grimório: ` tem 10 caracteres e a linha da carta tem até 20 (CRD-05); a dica é dado da receita, e o teste confere o tamanho | n |
| Grimório na run | A receita cuja dica aparece numa carta, cuja carta ou opção do baú aparece, ou que é formada, entra no conjunto de reveladas da run, que zera no reset e aparece no snapshot; a F39 o torna persistente | "A receita vista fica revelada no Grimório, que é persistente a partir da F39" | n |
| Duos na estrutura | O tipo aceita `duo` e a peça de técnica aceita o curinga `id: '*'` ("qualquer técnica Nv 3"), que casa com qualquer técnica equipada no nível mínimo que não seja outra peça de técnica da mesma receita; a lista de Duos fica vazia; a regra pura recusa Duo novo com 4 já feitos na run; Duo nunca entra no baú | Seção 5.7 ("carta rara sem vaga, no máximo 4 por run") e o Duo "Contra Afiado + qualquer técnica Nv 3"; a F41 só preenche a lista e o sorteio | n |
| Regra de combo como requisito | Cada receita tem uma linha na tabela "Regra de combo" desta spec dizendo o que ela faz que nenhuma peça faz sozinha; o Verifier confere a tabela contra o efeito jogado; o teste de dados só confere nome, texto, dica e limiar | A regra é de julgamento ("muda a forma de jogar"), não de dado; a tabela é a evidência | n |
| Comparação de nomes e textos | Depois de `trim` e minúsculas; vale entre os nomes e os textos de todos os ramos e Despertares (`data/techAxes.ts`, F30, F33 e F34), as Uniões, as Evoluções (de técnica e de arma) e os Duos | Seção 5.7 (Despertares, Evoluções, Uniões e Duos); os ramos entram porque o EIX-10 já os compara e um nome de ramo igual ao de um combo confundiria a carta | n |
| Nome mostrado do item com combo | O item que carrega uma Evolução ou uma União que mantém a principal passa a se chamar pelo nome do combo na `BuildBar`, na carta de melhoria, no `ChoicePanel` e na pergunta do Abandonar (`Ressonância Cortante`, `Punho Negro Divergente`, `Vácuo de Troca`); o ícone ganha uma marca de combo diferente da borda dourada do Despertar | "A Evolução troca o item por uma versão nova" (seção 5.7); a borda dourada já diz Despertar (F30) e não pode dizer duas coisas | n |
| Parâmetros de debug | `evo=<id>[,<id>]` aplica cada receita listada, na ordem, no reset da run, depois do `tech=`, do `axes=`, do `ramo=`, do `perks=`, do `arsenal=` e do `domain=`, se ela estiver pronta naquele ponto, e ignora as outras; o `evo=` da arma (WDB-03) passa a ser um caso disso | Mesmo molde do WDB-03, para os smokes montarem o combo sem comprar | n |
| Smoke novo | `combos.smoke.mjs` com `?debug&hd=1&area=modular` | Regra de smoke novo do projeto | y |

**Open questions:** none - all resolved or logged above. As linhas com `n` são escolhas do autor da spec para o
usuário revisar; nenhuma muda o que foi confirmado.

---

## User Stories

### P1: Uma lista só de receitas ⭐ MVP

**User Story**: Como desenvolvedor, quero toda receita numa lista só, com peças `{kind, id, minLevel}` de qualquer tipo
de item, para a loja, o baú, o Grimório e o teste de nomes lerem a mesma regra.

**Why P1**: Sem isso cada família de combo tem a própria forma e a própria regra de pronto, e a receita com talento ou
"qualquer técnica" não tem onde morar.

Receitas da F37, na ordem da lista (a 1ª peça é a principal na Evolução e na União sem `into`):

| Id | Tipo | Peças (`kind` `id` `minLevel`) | Resultado | Dica |
| --- | --- | --- | --- | --- |
| `roxo` | União, `into: 'roxo'` | técnica `azul` 1, técnica `vermelho` 4 | Vazio Roxo no slot do Azul (RXO-02) | `Roxo` |
| `ressonanciaCortante` | União | técnica `ressonancia` 4, técnica `corte` 1 | a Ressonância carrega o combo; o Desmantelar sai | `Cortante` |
| `punhoNegro` | Evolução | técnica `divergente` 4, talento `zonaNegra` 1, eixo `divergente.alvos` 1 | o Divergente carrega o combo | `P. Negro` |
| `vacuoDeTroca` | Evolução | técnica `boogie` 4, técnica `azul` 1 | o Boogie carrega o combo | `Vácuo` |
| `laminaDividida` | Evolução | arma `lamina` 4, relíquia `faixas` 1 | WEV-05 | `Lâmina Div` |
| `nuvemItinerante` | Evolução | arma `bastao` 4, relíquia `manoplas` 1 | WEV-06 | `Nuvem` |
| `arsenalToji` | Evolução | arma `lanca` 4, talento `contraAfiado` 1 | WEV-07 | `Toji` |

O Roxo é a única receita com a peça de Nv 4 em 2º lugar: a ordem `azul, vermelho` decide o slot do Roxo (RXO-02) e fica
como está; o NOM-03 aceita essa exceção só para a União com `into`. O Punho Negro é a única com a peça `eixo` (ver
Assumptions, "Punho Negro com um alvo só").

**Acceptance Criteria**:

1. RCP-01: WHEN step 0 is committed THEN the Roxo União and the three weapon evolutions SHALL live in one list `RECIPES` in `src/data/evolutions.ts`, each entry with `type`, `id`, `name`, `text`, `hint`, `cost` and `pieces` as `{kind, id, minLevel}` with `kind` in `tecnica`, `talento`, `arma`, `reliquia` or `dominio`, `WEAPON_RECIPES` SHALL no longer exist, and the smokes `evolution`, `boss-chest`, `weapon-imbued`, `shop` and `shop-axes` SHALL pass unchanged.
2. RCP-02: WHEN every piece of a recipe is owned at its `minLevel` or above and the recipe is not done THEN the pure `recipeReady(recipe, view)` of `src/core/evolution.ts` SHALL return `true`, and IF any piece is missing or below its `minLevel` THEN it SHALL return `false`.
3. RCP-03: The level of a piece SHALL be read as `1 + axis points` for a technique equipped in a slot, the `Perks` level for a talent, `1 + axis points` for the equipped weapon, the level of the equipped relic, the level of the owned Domain, and for an `eixo` piece `<item>.<axis>` the points in that axis of the equipped item, counted as 0 WHILE a branch leaves that axis with no effect (the `alvos` axis under the Concentrado, DVG-06), and an item not owned SHALL count as missing.
4. RCP-04: IF the União has an `into` technique already equipped, or the main piece of an Evolução or of a União without `into` already carries a combo, THEN the recipe SHALL not be ready, so that an item never carries more than one combo.
5. RCP-05: The `RECIPES` list SHALL hold exactly the seven recipes of the table above, in that order, with those pieces, those minimum levels and the cost 60.
6. RCP-06: WHEN the Vermelho is at level 3 with the Azul equipped THEN the Roxo SHALL not be ready, and WHEN it is at level 4 THEN it SHALL be ready; WHEN the Ressonância, the Divergente, the Boogie or the weapon of a recipe is at level 3 with its catalyst owned THEN that recipe SHALL not be ready, and WHEN it is at level 4 THEN it SHALL be ready; WHEN the Divergente is at level 4 with the Zona Negra and 0 points in `alvos`, or with 1 point in `alvos` under the Concentrado, THEN the Punho Negro SHALL not be ready, and WHEN it has 1 point in `alvos` under the Eco or with no branch THEN it SHALL be ready.
7. RCP-07: WHILE the Roxo is equipped the Azul and the Vermelho SHALL stay out of the shop (the F24 edge case), and no other recipe SHALL keep its pieces out of the shop.

**Independent Test**: `tests/core/evolution.test.ts` refeito com uma vista de build falsa: cada tipo de peça abaixo e
no nível mínimo (L-010), técnica fora do slot, item com combo, Roxo já equipado; `npm run smoke -- evolution` e
`boss-chest` sem mudança depois do passo 0.

---

### P1: Toda receita pronta na loja e no baú ⭐ MVP

**User Story**: Como jogador com duas receitas prontas, quero ver as duas na loja e no baú do chefe, para escolher qual
combo formar em vez de o jogo escolher por mim.

**Why P1**: É o "fim do `pool.find` único" da seção 5.7; sem isso a 2ª receita pronta fica escondida.

**Acceptance Criteria**:

1. OFR-01: WHEN a shop opens with k ready Uniões and Evoluções, k 1 or 2, THEN cards 0 to k − 1 SHALL be those recipes in list order, the focus upgrade card of CRD-02 SHALL not be drawn, the new-item rule of POL-06 SHALL apply to card `max(k, 1)`, and every later card SHALL come from the weighted draw.
2. OFR-02: IF 3 or more Uniões and Evoluções are ready THEN the boss chest SHALL show the first 3 in list order, and the shop SHALL show in cards 0 and 1 the first 3 in list order minus the one at index `round mod 3`, keeping list order, with card 2 under the POL-06 rule and card 3 from the weighted draw.
3. OFR-03: WHEN the shop rerolls THEN the ready recipes SHALL stay in cards 0 to k − 1 and only the later cards SHALL be drawn again.
4. OFR-04: WHEN the boss chest is built THEN every ready União and Evolução SHALL be a candidate, the other options of BAU-01 (axis points, Domain level, talent level) SHALL fill up to 3 options drawn by `chestRng`, and the order of the options SHALL be drawn by `chestRng`.
5. OFR-05: The recipe card SHALL cost `round(60 × inflation)` with the PRC-03 factor of the shop round, and the boss chest option SHALL apply the recipe with no fragment spent.
6. OFR-06: IF a recipe card is bought while its recipe is no longer ready (a piece consumed by another recipe of the same shop, or abandoned) THEN the purchase SHALL be refused with no fragment spent, and the card SHALL stay visible with a grey frame and its level line reading `FORA DA BUILD`, as ABD-07 does.
7. OFR-07: The recipe card and the chest option SHALL show the recipe name and the line `União` or `Evolução`, the card and the chest option of a União SHALL add `herda <N> pontos` when it has an `into` technique (RXO-12) or `+1 vaga, devolve <n>` when it keeps its main piece (n the refund of UNI-04), these lines and the OFR-06 grey frame SHALL be recomputed from the build at every shop `view()`, and the recipe card frame SHALL be gold.
8. OFR-08: The shop entries of the new recipes SHALL be appended at the end of `GAME_SHOP_CATALOG`, and every entry already in the catalog SHALL keep its position.
9. OFR-09: WHEN a shop opens with no ready recipe THEN card 0 SHALL follow CRD-02 as in the F30.

**Independent Test**: `tests/core/shopDraw.test.ts` (casos novos): Roxo e Vácuo de Troca prontos → cartas 0 e 1 nessa
ordem, carta 2 de item novo, reroll mantém as duas; 3 prontas (lista sintética A, B, C) → na r6 (6 mod 3 = 0) as cartas 0
e 1 são B e C, na r7 A e C, na r8 A e B, com a carta 2 de item novo e a carta 3 de sorteio; Vácuo comprado e depois Roxo comprado → aceito; Roxo comprado e
depois Vácuo → recusado sem gasto; `tests/core/bossChest.test.ts`: 2 prontas e "2 pontos" → as 3 no baú; 3 prontas → só
elas.

---

### P1: União que libera vaga ⭐ MVP

**User Story**: Como jogador com a Ressonância no Nv 4 e o Desmantelar, quero fundir as duas e ficar com uma vaga livre,
para a União abrir espaço na build em vez de só somar poder.

**Why P1**: "Duas técnicas viram uma e liberam uma vaga" é o que define a União (seção 5.7), e é a 2ª União do jogo.

**Acceptance Criteria**:

1. UNI-01: WHEN a União with an `into` technique is applied THEN RXO-02, RXO-12 and POL-08 SHALL hold as in the F33 and the F35.
2. UNI-02: WHEN a União without `into` is applied (shop or boss chest) THEN its main technique SHALL keep its slot, `TechId`, axis points, branch, Despertar, cooldown and mastery, and SHALL carry the combo.
3. UNI-03: WHEN a União without `into` is applied THEN its other technique SHALL leave its slot as ABD-03 says (empty slot, axis points, branch and Despertar cleared, cooldown 0, its branch pages out of the choice queue), the vacancies taken in the pool SHALL drop by 1, and the slot mastery of that slot SHALL reset while the mastery marks per `TechId` SHALL stay.
4. UNI-04: WHEN a União without `into` is applied THEN the wallet SHALL gain `floor(0.4 × spent)` over the spent ledger of the technique that left (ABD-02), that ledger SHALL be cleared, and the event `uniaoRefund:<recipe>:<n>` SHALL be emitted.
5. UNI-05: IF a free point page of the technique that left is still pending THEN that page SHALL serve the main technique, as CHC-08 does for the Roxo.
6. UNI-06: WHEN the Ressonância Cortante is applied with the pool full THEN a new technique or talent card SHALL become eligible from the next draw (POL-04).

**Independent Test**: `combos.smoke.mjs` com `tech=ressonancia,corte&axes=ressonancia.pregos:2,ressonancia.detonacao:1&round=6`:
a carta 0 é a Ressonância Cortante com `+1 vaga, devolve 0`; comprada, o slot do Desmantelar fica vazio, `build.pool.used` cai
1, a Ressonância fica no mesmo slot com os 3 pontos e `build.ressonancia.combo` é `ressonanciaCortante`.

---

### P1: Ressonância Cortante na luta ⭐ MVP

**User Story**: Como jogador com a Ressonância Cortante, quero que o 1º toque corte a área à frente e crave marca em
todo inimigo cortado, para detonar o grupo inteiro com o 2º toque.

**Why P1**: Sem o efeito na luta a União seria só a vaga livre.

**Acceptance Criteria**:

1. CRT-01: WHILE the Ressonância carries the Ressonância Cortante, WHEN its 1st touch reaches `release` THEN the module SHALL release N cuts instead of throwing nails, N the resolved Pregos value (3 to 6), the cut i (i from 0 to N − 1) at `i × 60` ms after `release`, each with a rectangle from 0 to 180 px ahead of the player center (its back edge on the player center), height 48 centered on the player, the angle 20, −25, 70 repeated in that order, and the facing of `release`.
2. CRT-02: WHEN a Ressonância Cortante cut touches a living common enemy or the boss THEN that target SHALL take one `micro` hit of the nail damage (3), at most once per cut, and SHALL receive one mark only WHILE the marks this volley placed on it are fewer than `floor(N / 2)` (1, 2, 2 and 3 for N 3 to 6).
3. CRT-03: WHEN a cut places a mark THEN every Ressonância rule that reacts to a nail sticking (the Grampo burst, the mark count of the Coroa de Pregos, the Boneco, the propagation on death) SHALL react the same way, and the 2nd touch, the mark life, the detonation and the cooldown SHALL follow the Ressonância rules.
4. CRT-04: WHILE cuts of the 1st touch are still to come, a press of the slot SHALL be consumed with no detonation, no cast, no event and no energy flash, and the armed state SHALL start after the last cut.
5. CRT-05: IF no cut of the 1st touch places a mark THEN the Ressonância SHALL start its cooldown after the last cut, as it does when every nail is lost.
6. CRT-06: WHILE the Ressonância carries the Ressonância Cortante the `CutFx` SHALL draw each cut from its rectangle, each mark SHALL show the nail head of RSN-13, the `techObjects` SHALL list no nail, and the debug snapshot SHALL report `techState.ressonancia.cortante` as `true`.
7. CRT-07: WHILE the Ressonância carries the Ressonância Cortante the upgrade card and the free point page SHALL name its Pregos axis `Cortes`.
8. CRT-08: The cuts and the marks SHALL be checked in the game in HD, in motion, facing both sides, against a group of three common enemies and the boss.
9. CRT-09: For every N from 3 to 6, `tests/core/resonanceCut.test.ts` SHALL show that a volley on 1 target inside the rectangle places fewer marks than the N nails, and a volley on 3 targets inside the rectangle places at most 1.5 times N marks.

**Independent Test**: `tests/core/resonanceCut.test.ts` (puro): 4 cortes a 0/60/120/180 ms; caixa do comum com a borda
perto no centro do player (0 px) e com a borda perto a 180 px cortada, toda atrás do centro (borda da frente a −1 px) e
com a borda perto a 181 px não (L-010); 2 comuns na faixa com 4 cortes → 4 acertos e 2 marcas cada (teto
`floor(4 / 2)`), com 5 cortes → 2 marcas, com 6 → 3; CRT-09 para N de 3 a 6; `combos.smoke.mjs` com
`evo=ressonanciaCortante&maxAlive=3` (Pregos 2, N = 5): o 1º toque deixa 2 marcas em cada um dos 3 comuns perto,
inclusive o colado no player, e o 2º detona `resonanceDetonate:6`.

---

### P1: Punho Negro Divergente ⭐ MVP

**User Story**: Como jogador com o Divergente no Nv 4 e a Zona Negra, quero que o Black Flash acertado valha para todos
os alvos do soco, para o Kokusen limpar o grupo em vez de um só.

**Why P1**: É a Evolução que casa o talento do Black Flash com a técnica, e a única da leva 1 com talento de catalisador.

**Acceptance Criteria**:

1. PND-01: WHILE the Divergente carries the Punho Negro Divergente, WHEN the Kokusen press of a cast returns `hit` THEN the 2nd impact of every target registered by the 1st impact SHALL be a Kokusen with the ESC-02 damage, and the energy gain, the Zona renewal, the Domain charge of DOM-02 and the Zona Negra level 3 ring of TAL-15 SHALL happen once per cast, from the main target, the ring skipping every target that took a Kokusen in that cast.
2. PND-02: WHILE the Divergente carries the Punho Negro Divergente the Kokusen multiplier SHALL be the `buildEffects` multiplier plus 0.3, capped at 3.4: 2.8 with no Zona Negra or Zona Negra 1, 3.1 with Zona Negra 2 and 3.4 with Zona Negra 3.
3. PND-03: The Punho Negro Divergente SHALL add no width to the Kokusen window, which SHALL keep the BEF-03 rule.
4. PND-04: WHEN the Kokusen press of a cast returns `miss` or never comes THEN no 2nd impact of that cast SHALL be a Kokusen.
5. PND-05: IF a target would take its own 2nd-impact Kokusen and an Eco Negro ring Kokusen in the same cast THEN it SHALL take only one Kokusen, and the Eco Negro SHALL keep reading only the ring of the main target (DVG-07).
6. PND-06: WHEN a Kokusen lands on a target THEN that target SHALL show the Kokusen number and flash of the F29, and the Kokusen on several targets SHALL be checked in the game in HD, in motion, facing both sides.

**Independent Test**: `tests/core/blackFist.test.ts` (puro): 3 alvos registrados e `hit` → 3 Kokusen, energia uma vez;
`miss` → nenhum; multiplicador 2,8/3,1/3,4 com Zona Negra 1/2/3 e nunca acima de 3,4 (L-010); `combos.smoke.mjs` com
`tech=divergente&axes=divergente.alvos:3&perks=zonaNegra&evo=punhoNegro&maxAlive=3` e o aperto na janela: 3 eventos de
Kokusen no mesmo soco, a energia e a barra de Domínio sobem uma vez; com `axes=divergente.zona:3` no lugar de Alvos a
receita não fica pronta e o `evo=` é ignorado.

---

### P1: Vácuo de Troca ⭐ MVP

**User Story**: Como jogador cercado com o Azul puxando o grupo, quero bater palma e trocar de lugar com o orbe, para
o orbe levar o grupo para onde eu estava e eu sair do cerco.

**Why P1**: É a Evolução de mobilidade da leva 1 e a que dá ao Boogie um uso com outra técnica.

**Acceptance Criteria**:

1. VAC-01: WHILE the Boogie carries the Vácuo de Troca and a live Azul orb has its center within the resolved Boogie range of the player center on either side, WHEN the swap moment comes THEN the swap target SHALL be that orb, ahead of every other candidate.
2. VAC-02: IF no live Azul orb is within that range THEN the swap SHALL follow BWG-01, with the Azul orb out of the candidates.
3. VAC-03: WHEN the Boogie swaps with the Azul orb THEN the player box SHALL move to the orb center IF the `fits` predicate of BWG-01 accepts it, the orb SHALL move to the old player box center keeping its remaining life, branch state and pull, and the player SHALL keep its facing.
4. VAC-04: WHEN the Boogie swaps with the Azul orb THEN every living common enemy whose center is within the resolved Azul radius of the orb center in that frame SHALL move by the orb displacement with zero velocity, each one only IF its box fits at the new place (otherwise it SHALL stay), and the boss SHALL never move.
5. VAC-05: IF the `fits` predicate refuses the player box at the orb center THEN the swap SHALL be refused as BWG-03 says and neither the orb nor any enemy SHALL move.
6. VAC-06: WHEN the Boogie swaps with the Azul orb THEN the Choque chip SHALL hit at both points as BWG-05 says, and the events `boogieSwap:azul:<orbId>` and `vacuo:<moved>` SHALL be emitted, `moved` being the number of enemies moved.
7. VAC-07: WHILE the branch is Dupla Palma and the Despertar Eco da Palma is on, WHEN the echo of an Azul orb swap comes THEN it SHALL swap back the player and the orb with its group by VAC-03 and VAC-04 IF the orb is alive, and SHALL otherwise be refused with `boogieEchoRefused`.
8. VAC-08: WHEN the Boogie swaps with the Azul orb THEN the view SHALL draw the amber palm flash of BWG-12 and a blue ring in the Azul palette at the departure and the arrival points for at most 150 ms, registered in the `FxRegistry`, and the swap SHALL be checked in the game in HD, in motion, facing both sides, with the Andante and the Lapso orbs.

**Independent Test**: `tests/core/vacuumSwap.test.ts` (puro): orbe a exatamente o alcance resolvido → alvo, a 1 px além →
não (L-010); comum com o centro a exatamente o raio → anda, a 1 px além → fica; comum que não cabe → fica; chefe nunca;
`combos.smoke.mjs` com `tech=boogie,azul&evo=vacuoDeTroca&maxAlive=3`: Azul, palma, o player vai ao ponto do orbe e os
comuns puxados aparecem perto do ponto antigo do player, com `vacuo:<n>` e n ≥ 1.

---

### P1: Nomes únicos e regra de combo ⭐ MVP

**User Story**: Como desenvolvedor, quero que o gate falhe quando dois efeitos tiverem o mesmo nome ou o mesmo texto, e
que toda receita prove o que ela faz de novo, para o combo nunca virar "a soma dos dois" nem repetir um Despertar.

**Why P1**: A revisão do plano tirou cinco combos duplicados (seção 8); sem o teste eles voltam.

**Acceptance Criteria**:

1. NOM-01: WHEN two entries among the names and effect texts of every branch and Despertar of `src/data/techAxes.ts` (the Vermelho, the Corpo, the Azul, the Desmantelar, the Divergente, the Roxo, the Boogie, the Ressonância and the Fala), every União, every Evolução and every Duo share a name or a text after trimming and lower-casing THEN `tests/data/combos.test.ts` SHALL fail.
2. NOM-02: IF a recipe has an empty name, an empty text or a hint outside 1 to 10 characters THEN `tests/data/combos.test.ts` SHALL fail.
3. NOM-03: IF a União without `into` or an Evolução does not have exactly one piece at `minLevel` 4, placed first, with every other piece at `minLevel` 1, or IF a União with `into` does not have exactly one piece at `minLevel` 4 with every other piece at `minLevel` 1, THEN `tests/data/combos.test.ts` SHALL fail.
4. NOM-04: The test SHALL read every name and text from the data modules, with no copied list.
5. NOM-05: Every União and Evolução SHALL change a behavior that none of its pieces has alone, as the "Regra de combo" table of this spec records, and a recipe added to `RECIPES` later SHALL add its row to that table in the same commit.

**Independent Test**: `npm run gate` verde; trocar o texto do Vácuo de Troca pelo do Eco da Palma num rascunho local faz
o `combos.test.ts` falhar.

---

### P1: O combo é escolha do jogador e aparece na build ⭐ MVP

**User Story**: Como jogador, quero que o combo só se forme quando eu escolho e que eu veja na build qual item carrega
qual combo, para a caça às receitas ser decisão minha.

**Why P1**: "Nada automático" é pedido do usuário; o nome e a marca são a leitura do combo fora da luta.

**Acceptance Criteria**:

1. CGL-01: A recipe SHALL be applied only by a shop purchase, a boss chest confirmation or the `evo=` debug parameter, and a recipe becoming ready SHALL change nothing else in the game.
2. CGL-02: No combo effect SHALL start without a press of a slot key or of a moveset key, except the delayed consequences of a press listed in CRT-01, VAC-07, WEV-06 and WEV-07.
3. CGL-03: WHEN a recipe is applied by any path THEN the event `combo:<recipe>` SHALL be emitted, and the events `evolve:<id>` and `weaponEvolved:<id>` of today SHALL stay.
4. CGL-04: WHILE an item carries a combo, the `BuildBar`, its upgrade card, the `ChoicePanel` and the Abandonar question SHALL name it by the recipe name, and its icon in the `EnergyHud` and in the `BuildBar` SHALL show a combo mark different from the gold border of the Despertar.
5. CGL-05: WHEN the main item of a combo is abandoned THEN the combo SHALL go with it and the refund SHALL count the recipe price paid; WHEN a catalyst is abandoned or consumed by a União THEN the combo SHALL stay.
6. CGL-06: WHEN the run resets THEN every combo, the revealed set and the Duo count SHALL be cleared.
7. CGL-07: The F37 SHALL add no net effective line to `src/scenes/TestScene.ts`, SHALL put no file in the exception lists of `.oxlintrc.json`, SHALL not grow `src/game/Hud.ts`, `src/data/moves.ts` nor `src/game/ShopPanel.ts`, and SHALL add no field to `src/game/Player.ts`.

**Independent Test**: com as duas peças prontas e a loja fechada, o snapshot mostra `combos.ready` com a receita e
nenhum item com `combo`; só a compra muda; a `BuildBar` mostra `Ressonância Cortante` com a marca do combo.

---

### P1: O combo à vista no debug ⭐ MVP

**User Story**: Como desenvolvedor, quero montar qualquer combo por parâmetro e ler no snapshot o que está pronto e o
que foi feito, para os smokes testarem cada combo sem comprar.

**Why P1**: Os smokes da F37 dependem disso.

**Acceptance Criteria**:

1. CDB-01: WHEN the run starts with `?debug&evo=<id>[,<id>]` THEN each listed recipe SHALL be applied in order at the run reset, after `tech=`, `axes=`, `ramo=`, `perks=`, `arsenal=` and `domain=`, IF it is ready at that point, and an unknown id or a recipe not ready SHALL be ignored.
2. CDB-02: The debug snapshot SHALL report `combos` as `{ ready, done, revealed }`, each a list of ids `uniao:<id>` or `evolucao:<id>`, and every technique of `build` SHALL report `combo` as the recipe id it carries or `null`.
3. CDB-03: The boss chest options SHALL be reported as `uniao:<id>` and `evolucao:<id>`, the `arma:<id>` of WEV-03 SHALL become `evolucao:<id>`, and the smokes that read it SHALL follow in step 1.

**Independent Test**: `tests/core/comboParam.test.ts` (puro) com id desconhecido, receita não pronta e duas receitas na
ordem; `combos.smoke.mjs` lê `combos.done` depois de cada `evo=`.

---

### P2: Grimório na loja

**User Story**: Como jogador com metade de uma receita, quero que a carta da peça que falta me diga para qual combo ela
serve, para caçar a receita sem decorar a tabela.

**Why P2**: A caça no estilo VS funciona sem a dica, mas fica às cegas para quem não leu o plano.

**Acceptance Criteria**:

1. GRM-01: WHEN a recipe is not done, not ready, and at least `ceil(items / 2)` of its item pieces (every piece but `eixo`) are owned at any level THEN the pure `halfHeld(recipe, view)` SHALL return `true`, and SHALL otherwise return `false`.
2. GRM-02: WHEN the shop builds its card views THEN each card that sells a missing piece of a half-held recipe (a new technique, talent, weapon or relic), a level or axis point of an owned piece below its `minLevel`, or a point in the axis that a missing `eixo` piece asks for SHALL carry the line `Grimório: <hint>` of the first such recipe in list order.
3. GRM-03: WHEN a hint line is shown on a card, a recipe card or chest option is shown, or a recipe is applied THEN its id SHALL enter the revealed set of the run.
4. GRM-04: WHILE an Evolução is applied and a ready União would consume its catalyst, the card and the chest option of that União SHALL carry the line `anula <hint of the Evolução>`, and a União card already open in the shop SHALL show it from the first `view()` after the Evolução is applied.

**Independent Test**: `tests/core/grimoire.test.ts` (puro): com o Boogie e sem o Azul, a carta de técnica nova do Azul
leva `Grimório: Vácuo`; com o Boogie no Nv 3 e o Azul, a carta de ponto do Boogie leva `Grimório: Vácuo`, e com o
Boogie no Nv 4 e o Azul não leva (a receita está pronta); com o Azul, o Vermelho no Nv 4 e o Vácuo feito, a carta do
Roxo leva `anula Vácuo`, também na carta do Roxo aberta na mesma loja logo depois da compra do Vácuo; com o Divergente
Nv 4, a Zona Negra e 0 ponto em Alvos, a carta de ponto de Alvos leva `Grimório: P. Negro`.

---

### P3: Os Duos já cabem na estrutura

**User Story**: Como desenvolvedor da F41, quero que a receita já aceite Duo, peça curinga e o teto por run, para a leva 2
só preencher a lista.

**Why P3**: Nenhum Duo entra na F37; é só não fechar a porta.

**Acceptance Criteria**:

1. DUO-01: The recipe type SHALL accept `type: 'duo'`, and a technique piece SHALL accept the wildcard `id: '*'`, which SHALL match any equipped technique at its `minLevel` or above that is not another technique piece of the same recipe.
2. DUO-02: WHEN 4 Duos are done in the run THEN the pure `duoEligible(recipe, view, duosDone)` SHALL return `false` for every Duo, and WHEN 3 are done THEN it SHALL return what `recipeReady` returns.
3. DUO-03: The Duo list SHALL be empty in the F37, and no shop card and no boss chest option SHALL ever be a Duo.

**Independent Test**: `tests/core/duo.test.ts` com uma receita de Duo de teste (talento `contraAfiado` 1 + técnica `*`
Nv 3): pronta com uma técnica Nv 3, não com Nv 2 (L-010); 3 feitos → segue a regra, 4 → recusa.

---

## Regra de combo

Toda União e Evolução faz algo que nenhuma das peças faz sozinha e que muda a forma de jogar (seção 5.7). Esta tabela é
a evidência do NOM-05; o Verifier a confere contra o efeito jogado.

| Receita | O que cada peça faz sozinha | O que só o combo faz |
| --- | --- | --- |
| Vazio Roxo | Vermelho: orbe que detona; Azul: orbe parado que puxa | esfera que atravessa a tela apagando o que toca, com caminho próprio de eixos (F33) |
| Ressonância Cortante | Ressonância: pregos em linha até 320 px cravam todos no 1º alvo da fila (dano concentrado); Desmantelar: cortes de 60 a 180 px, sem marca | cortes de 0 a 180 px que marcam cada inimigo cortado, até metade dos cortes por alvo: o 2º toque detona o grupo inteiro de perto em vez de um alvo só, e a build ganha uma vaga |
| Punho Negro Divergente | Divergente: Kokusen só no alvo principal, mesmo com 2 ou 3 alvos; Zona Negra: janela e multiplicador do Kokusen | o mesmo aperto vira Kokusen em todo alvo do soco (a receita só fica pronta com 2 alvos ou mais). O +0,3 no multiplicador (3,1 → 3,4) é o número do plano e vem junto, mas sozinho seria "o mesmo efeito maior" e não conta como a regra de combo |
| Vácuo de Troca | Boogie: troca com inimigo, orbe do Vermelho ou do Roxo e projétil, nunca com o Azul; Azul: puxa o grupo para um ponto fixo | troca com o orbe do Azul e leva o grupo puxado inteiro para outro lugar de uma vez: o player sai do cerco e o grupo fica onde ele estava |
| Lâmina Dividida da Alma | Lâmina: leve com corte e sangramento; Faixas: +15% de dano no leve por nível | o golpe leve passa pela guarda (WEV-05) |
| Nuvem Itinerante | Bastão: forte que varre em arco; Manoplas: +10% de dano corpo a corpo por nível | o forte acerta 3 vezes no arco (WEV-06) |
| Arsenal de Toji | Lança: Contra que anula projétil; Contra Afiado: Contra mais forte | o Contra perfeito no chefe suspende os afixos por 3 s (WEV-07) |

---

## Edge Cases

- WHEN the Roxo and the Vácuo de Troca are both ready and the Vácuo de Troca is bought first THEN the Azul SHALL stay, the Roxo card SHALL still be buyable in that shop, and the open Roxo card SHALL carry `anula Vácuo` from the first `view()` after the purchase, as SHALL every later Roxo card and chest option (GRM-04).
- WHEN the Roxo and the Vácuo de Troca are both ready and the Roxo is bought first THEN the Vácuo de Troca card SHALL be refused as OFR-06 says.
- IF the Roxo is formed after the Vácuo de Troca THEN the Boogie SHALL keep the combo, and while no Azul orb is alive its swaps SHALL follow BWG-01 (CGL-05, VAC-02).
- WHEN the Desmantelar leaves by the Ressonância Cortante THEN the shop SHALL be able to offer it again as a new technique, and owning it again SHALL not make the Ressonância Cortante ready again (RCP-04).
- IF the Ressonância Cortante comes from the boss chest while a branch page of the Desmantelar is pending in the same panel THEN that page SHALL be skipped, and a pending free point page of the Desmantelar SHALL serve the Ressonância (UNI-03, UNI-05).
- IF the Zona Negra is abandoned after the Punho Negro Divergente THEN the combo SHALL stay and the Kokusen multiplier SHALL be 2.8 (PND-02, CGL-05).
- IF the Concentrado is chosen after the Punho Negro Divergente is formed (the boss chest page comes before a pending Divergente branch page, CHC-02) THEN the combo SHALL stay, the cast SHALL keep one target and only the multiplier of PND-02 SHALL change; the Concentrado option already warns `anula Alvos (<points>)` (CHC-04).
- WHILE the Divergente has 0 points in `alvos`, or is under the Concentrado, the Punho Negro SHALL not be ready and SHALL never be offered in the shop nor in the boss chest (RCP-06).
- WHEN the Vácuo de Troca swaps with an Andante orb THEN the orb SHALL resume moving toward the point 80 px ahead of the player at up to 600 px/s, as the Andante rule of the F33 says.
- WHEN the Vácuo de Troca swaps with a Lapso orb that is still moving THEN the orb SHALL stop at its new center, as if the Azul key had been released.
- IF an enemy moved by the Vácuo de Troca is in hitstun, knocked down, stunned or held by the Âncora THEN it SHALL keep that state and its remaining time.
- WHEN a Ressonância Cortante cut touches the boss THEN the boss SHALL receive the mark, and the Boneco and the Boneco de Palha SHALL work on it as with a nail.
- WHEN a marked target dies by a Ressonância Cortante cut THEN its marks SHALL move as RSN-07 says.
- WHEN the boss chest holds a ready recipe and the player picks another option THEN the recipe card SHALL still be offered in that konbini's shop (OFR-01).
- IF a recipe becomes ready by a purchase in the open shop THEN its card SHALL appear only at the next draw (reroll or next shop), and the cards already open SHALL not change.
- WHEN `evo=roxo` applies the Roxo at the run reset THEN its `heranca` pages SHALL be queued for the first konbini, as RXO-12 says for the boss chest.
- WHEN 3 recipes are ready THEN the shop SHALL show 2 of them in cards 0 and 1, card 2 SHALL follow the new-item rule of POL-06 and card 3 SHALL come from the weighted draw (OFR-02), while the boss chest shows the 3.
- WHEN a Ressonância Cortante volley meets a single target (the boss alone) THEN it SHALL place `floor(N / 2)` marks on it, fewer than the N nails would (CRT-02, CRT-09).
- IF the run ends with a pending boss chest page that holds a recipe THEN it SHALL be dropped on the run reset (CGL-06 and the F33 edge case).

---

## Implicit-Requirement Dimensions

| Dimension | Resolução |
| --- | --- |
| Input validation & bounds | RCP-02/RCP-03 (nível mínimo por tipo de peça, eixo morto conta 0), RCP-06 (Nv 3 e Nv 4; Alvos 0 e 1), CRT-02/CRT-09 (teto de marcas por alvo), OFR-02 (no máximo 3 prontas), PND-02 (teto 3,4), NOM-02 (dica de 1 a 10 caracteres), DUO-02 (teto de 4 Duos), CDB-01 (id desconhecido ou receita não pronta ignorados), VAC-01/VAC-04 (alcance e raio resolvidos) |
| Failure / partial-failure states | OFR-06 (carta de receita que deixou de valer recusada sem gasto), VAC-05 (troca recusada sem ninguém andar), VAC-04 (comum que não cabe fica), CRT-05 (1º toque sem marca vai à recarga); sem I/O, o resto é N/A |
| Idempotency / retry / duplicate handling | RCP-04 (um combo por item; receita feita não fica pronta de novo), CRT-02 (uma marca por alvo por corte), PND-01/PND-05 (energia e Zona uma vez por conjuração; um Kokusen por alvo), CDB-01 (cada id aplicado uma vez, na ordem) |
| Auth boundaries & rate limits | N/A porque é jogo local; o teto de emissões do `TechEmitter` (EMI-03) não muda |
| Concurrency / ordering | OFR-01/OFR-04 (ordem da lista; ordem do baú pelo `chestRng`), UNI-03/UNI-05 (páginas do Desmantelar na fila), edge cases do Roxo com o Vácuo comprados na mesma loja, CDB-01 (ordem do `evo=` depois dos outros parâmetros) |
| Data lifecycle / expiry | CGL-05 (combo sai com a peça principal e fica sem o catalisador), CGL-06 (tudo zera no reset), GRM-03 (reveladas só na run até a F39) |
| Observability | CGL-03 (`combo:<id>`), UNI-04 (`uniaoRefund`), VAC-06 (`boogieSwap:azul`, `vacuo`), CRT-06 e CDB-02 (snapshot), CDB-03 (ids do baú) |
| External-dependency failure | N/A porque não há dependência externa em jogo |
| State-transition integrity | CGL-01 (combo só por compra, baú ou `evo=`; pronto não muda nada), RCP-04 (resultado já equipado ou item com combo), UNI-02/UNI-03 (a principal fica, a outra sai como no Abandonar), RCP-07 (só o Roxo segura as peças fora da loja) |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| RCP-01 | P1: Uma lista só de receitas | Tasks | Pending |
| RCP-02 | P1: Uma lista só de receitas | Tasks | Pending |
| RCP-03 | P1: Uma lista só de receitas | Tasks | Pending |
| RCP-04 | P1: Uma lista só de receitas | Tasks | Pending |
| RCP-05 | P1: Uma lista só de receitas | Tasks | Pending |
| RCP-06 | P1: Uma lista só de receitas | Tasks | Pending |
| RCP-07 | P1: Uma lista só de receitas | Tasks | Pending |
| OFR-01 | P1: Toda receita pronta na loja e no baú | Tasks | Pending |
| OFR-02 | P1: Toda receita pronta na loja e no baú | Tasks | Pending |
| OFR-03 | P1: Toda receita pronta na loja e no baú | Tasks | Pending |
| OFR-04 | P1: Toda receita pronta na loja e no baú | Tasks | Pending |
| OFR-05 | P1: Toda receita pronta na loja e no baú | Tasks | Pending |
| OFR-06 | P1: Toda receita pronta na loja e no baú | Tasks | Pending |
| OFR-07 | P1: Toda receita pronta na loja e no baú | Tasks | Pending |
| OFR-08 | P1: Toda receita pronta na loja e no baú | Tasks | Pending |
| OFR-09 | P1: Toda receita pronta na loja e no baú | Tasks | Pending |
| UNI-01 | P1: União que libera vaga | Tasks | Pending |
| UNI-02 | P1: União que libera vaga | Tasks | Pending |
| UNI-03 | P1: União que libera vaga | Tasks | Pending |
| UNI-04 | P1: União que libera vaga | Tasks | Pending |
| UNI-05 | P1: União que libera vaga | Tasks | Pending |
| UNI-06 | P1: União que libera vaga | Tasks | Pending |
| CRT-01 | P1: Ressonância Cortante na luta | Tasks | Pending |
| CRT-02 | P1: Ressonância Cortante na luta | Tasks | Pending |
| CRT-03 | P1: Ressonância Cortante na luta | Tasks | Pending |
| CRT-04 | P1: Ressonância Cortante na luta | Tasks | Pending |
| CRT-05 | P1: Ressonância Cortante na luta | Tasks | Pending |
| CRT-06 | P1: Ressonância Cortante na luta | Tasks | Pending |
| CRT-07 | P1: Ressonância Cortante na luta | Tasks | Pending |
| CRT-08 | P1: Ressonância Cortante na luta | Tasks | Pending |
| CRT-09 | P1: Ressonância Cortante na luta | Tasks | Pending |
| PND-01 | P1: Punho Negro Divergente | Tasks | Pending |
| PND-02 | P1: Punho Negro Divergente | Tasks | Pending |
| PND-03 | P1: Punho Negro Divergente | Tasks | Pending |
| PND-04 | P1: Punho Negro Divergente | Tasks | Pending |
| PND-05 | P1: Punho Negro Divergente | Tasks | Pending |
| PND-06 | P1: Punho Negro Divergente | Tasks | Pending |
| VAC-01 | P1: Vácuo de Troca | Tasks | Pending |
| VAC-02 | P1: Vácuo de Troca | Tasks | Pending |
| VAC-03 | P1: Vácuo de Troca | Tasks | Pending |
| VAC-04 | P1: Vácuo de Troca | Tasks | Pending |
| VAC-05 | P1: Vácuo de Troca | Tasks | Pending |
| VAC-06 | P1: Vácuo de Troca | Tasks | Pending |
| VAC-07 | P1: Vácuo de Troca | Tasks | Pending |
| VAC-08 | P1: Vácuo de Troca | Tasks | Pending |
| NOM-01 | P1: Nomes únicos e regra de combo | Tasks | Pending |
| NOM-02 | P1: Nomes únicos e regra de combo | Tasks | Pending |
| NOM-03 | P1: Nomes únicos e regra de combo | Tasks | Pending |
| NOM-04 | P1: Nomes únicos e regra de combo | Tasks | Pending |
| NOM-05 | P1: Nomes únicos e regra de combo | Tasks | Pending |
| CGL-01 | P1: O combo é escolha do jogador e aparece na build | Tasks | Pending |
| CGL-02 | P1: O combo é escolha do jogador e aparece na build | Tasks | Pending |
| CGL-03 | P1: O combo é escolha do jogador e aparece na build | Tasks | Pending |
| CGL-04 | P1: O combo é escolha do jogador e aparece na build | Tasks | Pending |
| CGL-05 | P1: O combo é escolha do jogador e aparece na build | Tasks | Pending |
| CGL-06 | P1: O combo é escolha do jogador e aparece na build | Tasks | Pending |
| CGL-07 | P1: O combo é escolha do jogador e aparece na build | Tasks | Pending |
| CDB-01 | P1: O combo à vista no debug | Tasks | Pending |
| CDB-02 | P1: O combo à vista no debug | Tasks | Pending |
| CDB-03 | P1: O combo à vista no debug | Tasks | Pending |
| GRM-01 | P2: Grimório na loja | Tasks | Pending |
| GRM-02 | P2: Grimório na loja | Tasks | Pending |
| GRM-03 | P2: Grimório na loja | Tasks | Pending |
| GRM-04 | P2: Grimório na loja | Tasks | Pending |
| DUO-01 | P3: Os Duos já cabem na estrutura | Tasks | Pending |
| DUO-02 | P3: Os Duos já cabem na estrutura | Tasks | Pending |
| DUO-03 | P3: Os Duos já cabem na estrutura | Tasks | Pending |

**Coverage:** 67 total, 67 mapeados para tarefas, 0 sem tarefa (mapa em `tasks.md`, "Requirement Coverage").

---

## Testes e smokes

**Testes novos** (arquivo novo para todo sistema novo; nenhum teste da lista de exceções do `max-lines` cresce):
- `tests/data/combos.test.ts` (RCP-05, NOM-01 a NOM-04), `tests/core/resonanceCut.test.ts` (CRT-01 a CRT-05, CRT-09),
  `tests/core/blackFist.test.ts` (PND-01 a PND-05), `tests/core/vacuumSwap.test.ts` (VAC-01 a VAC-05, VAC-07),
  `tests/core/grimoire.test.ts` (GRM-01 a GRM-04), `tests/core/duo.test.ts` (DUO-01 a DUO-03) e
  `tests/core/comboParam.test.ts` (CDB-01).
- Cada limiar testado nos dois lados do limite (L-010): peça principal no Nv 3 e no Nv 4 em cada receita; catalisador
  ausente e no Nv 1; Alvos do Divergente com 0 e 1 ponto, e 1 ponto no Concentrado; Duo com técnica curinga no Nv 2 e no
  Nv 3; 3 e 4 Duos feitos; 2 e 3 receitas prontas na loja (rodízio); borda de 0 e 180 px do corte (−1 e 181 fora);
  marcas por alvo no teto `floor(N / 2)` e um corte além dele; orbe do Azul no alcance resolvido e 1 px além; comum no raio resolvido e 1 px além;
  multiplicador do Kokusen 3,1 + 0,3 = 3,4 e nunca 3,7; dica de 10 e de 11 caracteres.
- O adaptador que repassa o dado ao motor tem teste próprio, não só o puro (L-043): o retângulo que o módulo da
  Ressonância passa ao `CutFx` na Ressonância Cortante e o deslocamento que o módulo do Boogie aplica a cada comum
  movido no Vácuo de Troca.

**Testes refeitos:** `evolution` (receita genérica, RCP-02 a RCP-07, UNI-02 a UNI-05), `evolutionShop` e `shopDraw`
(OFR-01 a OFR-03, OFR-06, OFR-09), `bossChest` (OFR-04, CDB-03), `weaponEvolution` da F36 (receitas na lista única),
`shopPreview` (linhas `União`/`Evolução`, `herda`, `+1 vaga, devolve`, `Grimório:`, `anula`, `Cortes`, recalculadas a cada `view()`) e `debugApi` (campos
novos).

**Smoke novo:** `combos.smoke.mjs` com `?debug&hd=1&area=modular` (Ressonância Cortante, Punho Negro Divergente, Vácuo
de Troca, duas receitas prontas na mesma loja e a dica do Grimório).

**Smokes antigos que mudam** (cada um no passo que os quebra, citando o requisito): `boss-chest` e `weapon-imbued` no
passo 1 (o `arma:<id>` vira `evolucao:<id>`; CDB-03).

**Smokes que rodam junto:** `combos`, `evolution`, `boss-chest`, `weapon-imbued`, `shop`, `shop-axes`, `shop-progress`,
`run-loop`, `choice-panel`, `build-bar`, `talents`, `resonance`, `boogie`, `kokusen`, `tech-axes`, `tech`, `fight` e
`hud`.

---

## Success Criteria

- [ ] Numa run com o Azul, o Vermelho no Nv 4 e o Boogie no Nv 4, o usuário vê o Roxo e o Vácuo de Troca lado a lado na
      loja e no baú do chefe, e escolhe qual formar.
- [ ] A Ressonância Cortante marca o grupo inteiro com o 1º toque e o 2º toque detona todos, e a `BuildBar` mostra uma
      vaga a menos ocupada.
- [ ] O Punho Negro Divergente dá Kokusen nos 3 alvos do soco com um aperto só, e o Vácuo de Troca tira o player do
      cerco deixando o grupo puxado no lugar dele.
- [ ] Com o Boogie e sem o Azul, a carta do Azul na loja diz `Grimório: Vácuo`.
- [ ] Gate verde, com o `combos.test.ts` pegando nome ou texto repetido; `combos.smoke.mjs` e os da lista verdes; a
      `TestScene` sem linha líquida a mais.
- [ ] A conferência no jogo, em HD, em movimento e nos dois lados, dos cortes da Ressonância Cortante, do Kokusen em
      vários alvos e da troca do Vácuo com o orbe Andante e o Lapso, não só na prancha.
- [ ] Toda linha da tabela "Regra de combo" confere com o que o jogador vê na luta.
