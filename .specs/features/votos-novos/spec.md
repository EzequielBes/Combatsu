# Votos novos (F40) - Specification

## Problem Statement

Os 8 votos de hoje (`src/data/vows.ts`, `src/core/vows.ts`, `src/scenes/test/vowDirector.ts`) mexem só em números
soltos: dano, custo, vida, guarda e Reversa. Nenhum deles muda a forma da build, e nenhum conversa com o que as fases
F30 a F36 trazem (pool de vagas, Domínio, Kokusen com teto de janela, eixos da arma). O jogador que vence o chefe
escolhe entre trocas de porcentagem, não entre identidades. A F40 (`docs/plano-builds-e-habilidades.md`, seção 5.5 e
linha F40 da seção 6) soma 6 votos novos, cada um ligado a uma peça da build: Revelação da técnica, Restrição
celestial, Voto do Black Flash, Expediente, Corpo emprestado e Voto de silêncio. Os 8 de hoje ficam.

A F40 depende da F29 a F36 e usa o que elas entregam sem mudar o contrato:
- F29 (`fundacao-de-poder`): `core/statSheet.ts` e o `StatsDirector`, donos únicos de `loadout.damageMul`,
  `vowDamageMul`, `costMul`, `player.damageTakenMul` e `setMaxHp` (POW-01). O `StatsDirector.sheet()` lê
  `this.s.vows.effects`; o `VowDirector` perdeu o `sync` e o `strikeMul` (conferido em
  `git show feat/fundacao-de-poder:src/scenes/test/statsDirector.ts`).
- F30 (`vermelho-e-corpo`): `Loadout.stats(id)` devolve o `TechStats` (custo, recarga, `signMs`, dano, `kokusenDamage`
  e os blocos `red`, `blue`, `cut`, `purple` com `radius` onde há área); a escala do inimigo.
- F31 (`expansao-de-dominio`): `core/domain.ts` (carga inteira 0 a 100, eventos de carga do DOM-02), `DOMAINS` com
  `santuario`, `jackpot` e `amplificacao`, o Baú do Véu (VEU-*), o nível do Domínio no baú do chefe e na loja (DNV-*),
  o `domainDenied:busy` com a Reversa canalizando (DOM-07).
- F33 e F34: o `ChoicePanel` com a fila de pendências e as 8 técnicas no registro `TechId → TechModule`.
- F35 (`vagas-e-talentos`): pool de 7 vagas com no máximo 3 técnicas e 6 talentos (POL-01), etiqueta
  `OCUPA VAGA a/7→b/7` (POL-07), `build.pool` no snapshot (POL-09), o livro de gastos e a limpeza do Abandonar
  (ABD-02, ABD-03), o `core/buildEffects.ts` com o teto conjunto de +30 ms na janela do Kokusen (BEF-03) e os ganhos de
  energia (BEF-01).
- F36 (`arma-imbuida`): a arma com 3 pontos de eixo, teto de 2 por eixo, lido do registro (`pointCap`); a própria F36
  deixou o "+1 ponto" da Restrição para a F40.
- F38 (`hordas-em-atos`, vem antes da F40 na fila): a rodada comum fecha por cota de abates (HRD-02: 6 na r1, 12 na
  r4, 22 na r6, 29 na r8, 38 na r11, 55 na r19, enxame incluído), a rodada de chefe tem cota 1 (só o chefe; os
  invocados da F32 ficam fora), e o HUD mostra `Abates: k/q` ou `Chefe` (HRD-10, `hordeDirector.counterText()`). O
  `run.roundKills` passa a contar os abates da cota. É o contador do Expediente.
- F39 (`meta-minima`): o registro de desbloqueios usa o id de voto `restricaoCelestial` (conquista
  `chefeSemTecnica`) e tranca conteúdo em todo sorteio de oferta, o painel de votos incluído (UNL-05). A F39 garante
  a técnica recém-liberada na 1ª carta do painel seguinte (STA-18) com a lista em memória do `MetaDirector`; a F40
  faz o mesmo com o voto (VEL-13).

Código conferido em 15/10 no worktree `docs/spec-meta-e-votos`:
- `src/data/vows.ts`: `VowId` com 8 ids, `VOW` com os números e `offers: 3`, `VOWS` com `name`, `boon` e `cost`,
  `VOW_IDS` na ordem do catálogo.
- `src/core/vows.ts`: `Vows` (cada voto uma vez, `list` na ordem do catálogo), `drawVows(rng, taken, count)` sorteia
  entre os não tomados sem mais nenhum filtro (l.35-40), `vowEffects(taken, { kills })` agrega os efeitos (VOW-18,
  multiplicam); a Fúria lê `run.roundKills` (abates do `spawner` na rodada, `core/run.ts:115`).
- `src/scenes/test/vowDirector.ts`: `reset` lê `?debug&vows=a,b` e toma só ids de `VOWS`; `openPanel` sorteia pelo
  `run.vowRng`; `choose(slot | null)`.
- `src/scenes/test/shopDirector.ts:121-139`: a `Shop` (com as cartas) é construída **antes** do painel de votos abrir;
  o voto escolhido não muda as cartas já sorteadas.
- `src/scenes/test/recovery.ts:62-69`: a Reversa lê `this.s.vows.effects` (`rctOff`, `rctBelow`, `rctHealMul`) direto;
  `core/reverseCursed.ts` emite `rctStart`, `rctStop` e `rctDenied`.
- `src/core/kokusen.ts`: a Zona é `zoneMs > 0`, aberta por `land` (que também dá `CE.kokusenGain` 30 de energia) e
  esfriada por `tick`; `KOKUSEN.zoneMs` 8000 hoje (a F33 pode alongar pelos eixos do Divergente).
- `src/game/VowPanel.ts`: carta de 170×130 px, nome a 14 px em negrito, ganho e custo a 11 px com quebra em 156 px; o
  custo começa 38 px antes do fim da carta (2 linhas).

## Goals

- [ ] O painel depois do chefe sorteia entre 14 votos, e cada voto novo só aparece quando a build pode usá-lo e ainda
      paga por ele: Black Flash só com o Divergente na mão, Restrição só com a Amplificação nos dados, Silêncio só com
      Domínio possuído e sem a Restrição, Revelação só com técnica no slot 1.
- [ ] A carta diz o que o voto faz **nesta** build antes de o jogador escolher: o nome da técnica que a Revelação
      reforça, quanto a Restrição devolve e qual Domínio ela converte, e que o Expediente não vale no chefe.
- [ ] Quem libera a Restrição vencendo um chefe sem técnica a vê na 1ª carta do painel seguinte, com `Novo`.
- [ ] Os 6 votos novos fazem o que a carta diz, cada um com teste puro nos dois lados de cada limiar e um smoke em HD.
- [ ] A Restrição celestial transforma a build na hora: as técnicas saem com 50% do gasto de volta, a Reversa some,
      o Domínio vira Amplificação do mesmo nível, o pool vai a 8 vagas e a loja aberta logo depois já reflete tudo.
- [ ] Todo número novo de dano, custo, vida, janela, energia e carga passa pelo `vowEffects` → `statSheet`/`buildEffects`;
      nenhum voto grava direto em `damageMul`, `vowDamageMul`, `costMul`, `damageTakenMul` nem `setMaxHp`.
- [ ] Com nenhum voto novo tomado, os 8 votos de hoje dão os mesmos números de hoje e a `TestScene` não ganha linha
      efetiva.

## Passos e commits

Refatoração é passo próprio, com os smokes iguais; cada passo de comportamento termina jogável.

| Passo | O que entra | `TestScene` (efetivas) |
| --- | --- | --- |
| 0. **Refatoração, com os smokes iguais** | `drawVows` recebe o contexto de elegibilidade (com os 8 de hoje sempre elegíveis, o sorteio não muda); `VowEffects` ganha os campos novos com valor neutro; a `Shop` passa a sortear as cartas depois que o painel de votos fecha | 0 |
| 1. **Expediente e Corpo emprestado** | os 2 votos, os limites do pool lidos dos votos | 0 |
| 2. **Revelação da técnica** | multiplicadores do slot 1 no `TechStats`, sinal mais longo e o kanji em HD | 0 |
| 3. **Voto do Black Flash** | janela e energia pelo `buildEffects`, custo fora da Zona | 0 |
| 4. **Voto de silêncio** | carga da barra com multiplicador e resto, técnica sem carga, Reversa travada no Domínio | 0 |
| 5. **Restrição celestial** | perda das técnicas com devolução, Reversa fora, Domínio convertido, pool 8, arma +1 ponto | 0 |
| 6. **Legibilidade** | carta com o texto da build (técnica da Revelação, devolução da Restrição) e a nota sob a carta; `Novo` no voto recém-liberado; sufixo do Expediente no contador de abates | 0 |

## Out of Scope

| Feature | Reason |
| --- | --- |
| Mudar os números ou o texto dos 8 votos de hoje | O plano diz "os 8 de hoje ficam"; a F40 só acrescenta a regra de elegibilidade sob a Restrição (Assumptions) |
| Voto com nível ou tabela por nível | A seção 3.1 do plano dá "Votos: sem vaga, 1 por chefe, sem nível" |
| Abandonar ou trocar um voto já tomado | Voto vale até o fim da run (VOW-08); a bandeja da F35 não lista votos |
| Mais de 3 ofertas no painel, reroll do painel ou voto fora do chefe | O painel continua o da F24 (VOW-01..04) |
| Votos da leva 2 | F41 (`leva-2`) |
| O registro de desbloqueios e a conquista `chefeSemTecnica` | F39 (`meta-minima`); a F40 só usa o id `restricaoCelestial` que ela fixou |
| Pontos de força, patamar e aura da F29 pela Restrição | O "Força ×1,4" entra como dano do corpo a corpo (Assumptions); o visual da força continua vindo do que se compra |
| Esconder a barra de energia sem técnicas | Com a Restrição a barra fica sem uso, mas a regra da HUD é da F31 e da F35; trocar a HUD é outra feature |
| Evolução da arma além do Nv 4 e moldura nova para o Nv 5 | A F36 fecha a arma no Nv 4; o 4º ponto da Restrição usa a moldura do Nv 4 (Assumptions) |
| A evolução do Divergente que soma janela do Kokusen | F37; o teto conjunto de +30 ms (BEF-03) já cobre a soma |
| Versão antiga (`?hd=0`) | Não recebe trabalho novo; o `vows.smoke` antigo só não pode quebrar |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Decisões do plano que valem | 3 técnicas + Domínio, pool de 7 vagas, arma imbuída e escala do inimigo na F30 (decisões 1, 3, 5 e 6 da seção 7); "nada automático" | Confirmadas pelo usuário. Aqui "nada automático" quer dizer: o painel nunca escolhe nem fecha sozinho, e a página do Véu com uma opção só ainda pede `Enter` | y |
| Ids dos votos novos | `revelacao`, `restricaoCelestial`, `votoBlackFlash`, `expediente`, `corpoEmprestado`, `votoDeSilencio`, nesta ordem depois dos 8 de hoje em `VOW_IDS` | `restricaoCelestial` é o id que a F39 fixou (UNL); camelCase como os de hoje; anexar no fim mantém a ordem do catálogo dos 8 | n |
| Nomes na carta | `Revelação da técnica`, `Restrição celestial`, `Voto do Black Flash`, `Expediente`, `Corpo emprestado`, `Voto de silêncio` | Caixa de frase como os de hoje (`Corpo de vidro`) | n |
| Textos da carta | Ganho / custo: Revelação `<técnica do slot 1>: +40% dano e +20% raio` / `o sinal dela dura +150 ms`; Restrição `golpes +40%, 8 vagas, arma +1 ponto` / `sem técnicas nem Reversa; devolve <n>`; Black Flash `Kokusen: janela +20 ms e +15 de energia` / `fora da Zona, golpes -20%`; Expediente `do 11º abate da rodada, dano +40%` / `até o 10º abate da rodada, dano -25%`; Corpo emprestado `8 vagas e até 7 talentos` / `vida máxima -25%`; Silêncio `barra de Domínio enche 50% mais rápido` / `técnica não carrega; sem Reversa no Domínio` | Cabem em 2 linhas de 156 px a 11 px (~23 caracteres por linha; o maior nome de técnica, `Boogie Woogie`, dá 38 caracteres com o `+ `). Revisão: "técnica do slot 1" obrigava o jogador a lembrar qual técnica está em `L`, e "devolve 50%" não dizia quanto; a carta agora diz o nome e o número desta build, montados quando o painel abre (VRV-08, VRC-11) | n |
| Nota sob a carta | Uma linha de 11 px na cor da dica (`S`), logo abaixo da carta, só quando o voto tem algo que a carta não diz: Expediente `não vale no chefe`; Restrição com Domínio de outro id `<Domínio> → Amplificação` (ex.: `Santuário → Amplificação`, 24 caracteres); Silêncio com técnica de Kokusen equipada `Kokusen não carrega`. A dica `1-3 tomar o voto · Enter recusar` desce para abrir o espaço | Revisão: a conversão do Domínio só aparecia numa faixa **depois** de tomar (VRC-07), e quem gostava do Santuário Nv 2 o perdia sem aviso. A carta (170×130) não tem 3ª linha livre entre o ganho (+56) e o custo (+92) | n |
| "Slot 1" da Revelação | O slot de índice 0 (teclas `L`/`C`), o mesmo que a loja chama de `slot 1` (`core/shop.ts`, `Nova · slot 1`); vale para a técnica que estiver nele a cada quadro | O texto do plano usa a contagem do jogador | n |
| "+40% de dano" da Revelação | Multiplica todo valor de `damage` do `TechStats` da técnica do slot 0, por cima dos outros multiplicadores; o `kokusenDamage` não muda | O Kokusen tem multiplicador, teto (×3,4) e voto próprios; somar a Revelação ao Voto do Black Flash no mesmo número passaria do desenho | n |
| "+20% de raio" da Revelação | Multiplica por 1,2, arredondado, todo campo `radius` dos blocos do `TechStats` da técnica do slot 0 (Vermelho, Azul, Roxo e as técnicas da F34 que tiverem `radius`); alcance (`rangePx`, `farPx`) não muda | O plano diz raio, não alcance; o alcance está travado em 320 px (seção 2.1) | n |
| "Sinal 150 ms mais longo" | O `signMs` da técnica do slot 0 ganha +150; o kanji `術` em HD, só com cores da `PALETTE`, fica sobre a cabeça do player durante toda a fase de sinal dessa técnica | O sinal é a fase que o inimigo lê; o plano pede o kanji sobre a cabeça e não nomeia qual: `術` (jutsu, técnica) | n |
| "Força ×1,4" da Restrição | Multiplica por 1,4 o `meleeMul` do `statSheet` (golpe do moveset, objeto e arma vinculada), sem mexer nos pontos de força da F29 | O dano é o que o jogador sente na hora; os pontos de força mudam patamar e visual, que vêm das compras | n |
| Devolução da Restrição | `floor(0,5 × soma dos livros de gasto (ABD-02) das técnicas tiradas)`, numa entrada só; fonte grátis vale 0 | "Devolve 50% do gasto"; o livro de gastos já existe na F35 | n |
| Limpeza das técnicas tiradas | Cada técnica sai como no Abandonar (ABD-03): slot vazio, eixos, ramo e Despertar limpos, recarga 0, pendências fora da fila, maestria por `TechId` mantida | Mesma regra de saída que a F35 já testa | n |
| "A Reversa some" | Com a Restrição, segurar a tecla da Reversa não começa a canalização, não cura, não gasta energia e não emite evento | "Some" é ausência: nada pisca porque não há o que negar | n |
| "A Reversa trava durante o Domínio" (Silêncio) | Com o Silêncio e um Domínio ativo, a Reversa não começa; o aperto emite `rctDenied` uma vez e a barra de energia pisca como hoje (RCT-08) | Trava é temporária, então o jogador precisa ver o porquê. O Domínio já é recusado com a Reversa canalizando (DOM-07), então não há canalização para cortar | n |
| Conversão do Domínio | Ao tomar a Restrição, o Domínio possuído vira `amplificacao` no mesmo nível com a mesma carga; daí em diante o Baú do Véu mostra só a Amplificação (página de uma opção, `Enter` toma) e nenhuma fonte oferece outro Domínio; o nível no baú do chefe e na loja sobe a Amplificação | Texto do plano; a página de uma opção mantém "nada automático" | n |
| Limites do pool com os votos | Pool = o maior valor entre 7 e os votos tomados (8 com Corpo emprestado ou Restrição); talentos = o maior entre 6 e os votos (7 com Corpo emprestado, 8 com Restrição); técnicas = 0 com a Restrição, 3 sem ela. Os dois votos juntos dão pool 8, talentos 8 e técnicas 0 | O plano dá valores ("vai a 8"), não acréscimos | n |
| Elegibilidade nova | Revelação: técnica no slot 0 e máximo de técnicas acima de 0. Restrição: `amplificacao` existe em `DOMAINS`. Black Flash: alguma técnica equipada com `kokusenDamage > 0` no `TechStats`. Silêncio: o player possui um Domínio. Expediente: sempre. Corpo emprestado: sem a Restrição. Com a Restrição tomada também saem do sorteio Pacto do feiticeiro, Fluxo selado, Cura proibida e Voto de silêncio | O plano condiciona Black Flash e Restrição; os outros seguem a mesma ideia: um voto que não faz nada na build atual é carta morta no painel, e um voto cujo custo a build já não paga é carta dominante. Revisão: com a Restrição os dois custos do Silêncio somem (não há técnica para carregar nem Reversa para travar) e sobrava +50% de carga de graça; o Corpo emprestado vira só custo (a Restrição já dá 8/8), e Pacto, Fluxo e Cura proibida ficam sem ganho. "Kokusen > 0" pega o Divergente e qualquer técnica futura com Kokusen sem lista à parte | n |
| Voto que perde o alvo depois de tomado | Fica tomado e continua cobrando: Black Flash sem Divergente cobra −20% sempre; Revelação com o slot 0 vazio não faz nada até uma técnica entrar nele | O voto é um pacto até o fim da run (VOW-08) | n |
| "Fora da Zona" do Black Flash | Fora da Zona = nenhuma técnica equipada com a Zona do Kokusen ativa (`zoneMs > 0`); o −20% multiplica o `meleeMul` (golpe, objeto, arma), não a técnica | "Os golpes fazem −20%"; o Kokusen é técnica e o voto o reforça | n |
| Energia do Black Flash | +15 somados ao ganho de energia do Kokusen (`CE.kokusenGain`) pelo `buildEffects` | A F35 pôs os ganhos de energia no `buildEffects` (BEF-01) | n |
| Contagem do Expediente | Pelo `run.roundKills` (os abates da cota da F38, enxame incluído), só numa rodada comum ativa: com menos de 10 abates todo dano do player é ×0,75; com 10 ou mais, ×1,4 (o acerto que faz o 11º abate já sai com +40%) | "Os 10 primeiros abates saem com −25%": o acerto do 10º abate acontece com 9 abates contados | n |
| Expediente na rodada de chefe | Fator ×1 (nem custo nem ganho), dito na nota da carta (`não vale no chefe`) | Revisão: a rodada de chefe tem cota 1 (F38, HRD-02) e os invocados não contam, então ao pé da letra o chefe inteiro sairia com −25% e o voto nunca pagaria ali. Pela conta de tempo de abate (`10/0,75 + (q−10)/1,4` contra `q`), a rodada comum dá empate na r6 (cota 22), ~7% mais rápido na r8 (29), ~12% na r11 (38) e ~17% na r19 (55); somado a −25% em todo chefe, o voto tomado na r5 seria armadilha até a r11. Com ×1 no chefe ele é o voto da horda: o começo de cada rodada, com o estouro de 3 lutadores, fica mais perigoso, e o fim paga | n |
| Estado do Expediente na tela | Numa rodada comum o contador da F38 ganha o sufixo do fator: `Abates: 4/22 · -25%` até o 10º abate e `Abates: 10/22 · +40%` daí em diante; na rodada de chefe, sem sufixo | Sem isso o jogador não sabe quando o bônus liga; o contador já está na tela e já conta o que o voto conta | n |
| Carga do Silêncio | Todo ganho de carga que não vem de técnica (eventos do DOM-02 e talentos que carregam, como o Executor Nv 3) é ×1,5; o +1 da conjuração **e o +15 do Kokusen** não carregam (o Kokusen é o acerto do Divergente, uma técnica; F31: "somado ao +1 da conjuração do Divergente que o disparou"); o resto fracionário fica guardado (0 a <1) e soma no ganho seguinte; a carga pública continua inteira; o resto zera na ativação e no reset da run | A carga é inteira (DOM-01); arredondar +1 para +2 daria o dobro no golpe leve, não 50%. Revisão: só com o +1 da conjuração o custo "técnica não carrega" valia 1 ponto por técnica, e o voto saía de graça até para o feiticeiro; com o Kokusen fora ele cobra 16 por Kokusen do Divergente e briga de verdade com o Voto do Black Flash. Para o lutador puro o custo continua pequeno (a Reversa travada no Domínio), como o Pacto é barato para o feiticeiro puro: é troca de arquétipo | n |
| Cartas da loja depois do voto | O painel de votos abre antes de a `Shop` sortear as cartas; as cartas saem da build como ficou depois da escolha (ou da recusa), com o mesmo `shopRng` | Com a Restrição a loja sorteada antes mostraria melhoria de técnica que saiu; o stream é próprio da loja, então quem não toma voto que muda a build vê as mesmas cartas | n |
| 4º ponto da arma | Com a Restrição o `pointCap` da arma sobe de 3 para 4, o teto de 2 por eixo fica; a arma chega ao Nv 5 e a carta mostra `Nv 4→5` com a moldura do Nv 4 | A F36 lê o teto do registro para a F40 subir; moldura nova é arte à parte | n |
| Voto recém-liberado | O voto liberado por conquista (hoje só a Restrição, pela `chefeSemTecnica`) fica "novo" até um painel de votos oferecê-lo; o painel seguinte em que ele é elegível e não tomado o põe na 1ª carta, com `Novo` na linha da tecla, e sorteia as outras sem ele. Lista em memória no `MetaDirector`, ao lado da `freshTechniques` da F39 (sobrevive ao R e ao J, some ao recarregar) | Com 10 a 12 elegíveis e 3 cartas, a Restrição sairia em ~1 de 4 painéis e o prêmio da conquista podia passar runs sem aparecer. A conquista se cumpre na derrota do chefe, e o painel de votos abre logo depois na konbini: o jogador que acabou de vencer de mãos vazias vê na hora o voto que a vitória liberou | n |
| `?debug&vows=` | Aceita os ids novos, toma na ordem da lista depois do `tech=`, do `perks=`, do `arsenal=` e do `domain=`, ignora a elegibilidade e aplica os efeitos de tomar (a Restrição tira as técnicas do `tech=` com devolução 0) | Os smokes montam o caso sem jogar até o chefe; o F39 já diz que o debug equipa conteúdo trancado (UNL-08) | n |
| Smoke novo | `scripts/smoke/vows-new.smoke.mjs` com `?debug&hd=1&area=modular` | Regra de smoke novo do projeto | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Sorteio que conhece a build ⭐ MVP

**User Story**: Como jogador que venceu o chefe, quero que o painel só me ofereça votos que fazem algo na minha build,
para cada carta ser uma escolha real e não um espaço perdido.

**Why P1**: Sem a elegibilidade, o Black Flash sem Divergente e a Restrição sem Amplificação são votos quebrados (risco
"Votos quebrados" do plano).

**Acceptance Criteria**:

1. VEL-01: The catalog (`VOW_IDS`) SHALL hold the 8 vows of today followed by `revelacao`, `restricaoCelestial`, `votoBlackFlash`, `expediente`, `corpoEmprestado` and `votoDeSilencio`, in this order.
2. VEL-02: `drawVows` SHALL draw only among the vows that are not taken and are eligible for the build context it receives, in catalog order before the draw, and SHALL consume the given `rng` only.
3. VEL-03: WHERE `revelacao` is untaken it SHALL be eligible only WHILE slot 0 holds a technique and the technique cap is above 0.
4. VEL-04: WHERE `restricaoCelestial` is untaken it SHALL be eligible only WHILE `amplificacao` is a key of `DOMAINS`.
5. VEL-05: WHERE `votoBlackFlash` is untaken it SHALL be eligible only WHILE an equipped technique has `kokusenDamage > 0` in its `TechStats`.
6. VEL-06: WHERE `votoDeSilencio` is untaken it SHALL be eligible only WHILE the player owns a domain.
7. VEL-07: WHILE `restricaoCelestial` is taken the draw SHALL not offer `corpoEmprestado`, `pactoDoFeiticeiro`, `fluxoSelado`, `curaProibida` nor `votoDeSilencio`.
8. VEL-08: WHILE `restricaoCelestial` is not taken `expediente`, `corpoEmprestado` and the 8 vows of today SHALL be eligible whenever untaken.
9. VEL-09: IF fewer than 3 untaken vows are eligible THEN the panel SHALL offer only those, and IF none is eligible THEN the panel SHALL not open (VOW-06 with eligibility).
10. VEL-10: The same run seed, the same taken vows and the same build context SHALL draw the same offers (VOW-07 with eligibility).
11. VEL-11: WHERE the F39 unlock registry locks a vow, the draw SHALL skip it on top of the eligibility rules.
12. VEL-12: WHEN the vow panel closes (vow taken or refused) THEN the shop cards SHALL be drawn from the build as it stands after the choice, from the same `shopRng` as today.
13. VEL-13: WHEN an achievement unlocks a vow THEN that vow SHALL be fresh until a vow panel offers it, and WHEN a vow panel opens with a fresh vow that is eligible and untaken THEN that vow SHALL be the first offer with the tag `Novo` and the other offers SHALL be drawn from the eligible list without it; the fresh list SHALL live in memory only (kept across R and J, lost on page reload).

**Independent Test**: teste puro do `drawVows` com contextos montados: sem Divergente o `votoBlackFlash` nunca sai em
1000 seeds e com ele sai; sem Domínio o Silêncio nunca sai; com a Restrição tomada os 5 excluídos nunca saem; com 2
elegíveis o painel oferece 2; mesma seed e mesmo contexto dão o mesmo sorteio; com a Restrição fresca ela é a 1ª
oferta em toda seed e as outras 2 nunca a repetem. `vows-new.smoke`: com
`tech=divergente` e a r5 vencida, o snapshot `vows.eligible` contém `votoBlackFlash`; sem técnica, não contém.

---

### P1: Expediente ⭐ MVP

**User Story**: Como jogador de horda, quero um voto que pune o começo e paga o fim de cada rodada comum, sem mexer no
chefe, para o volume de abates (o enxame da F38) virar poder.

**Why P1**: É o voto mais simples (só o contador da Fúria) e valida o caminho voto → `statSheet` dos votos novos.

**Acceptance Criteria**:

1. VEX-01: WHILE `expediente` is taken in an active common round and the round kill count (`run.roundKills`) is below 10, every player damage (moveset strike, prop, bound weapon and technique) SHALL be multiplied by 0.75 through `vowEffects.damageMul`.
2. VEX-02: WHILE `expediente` is taken in an active common round and the round kill count is 10 or more, every player damage SHALL be multiplied by 1.4 through `vowEffects.damageMul`.
3. VEX-03: The Expediente factor SHALL multiply with the other vows that change `damageMul` (VOW-18), and WHEN a new common round starts THEN the factor SHALL go back to 0.75.
4. VEX-04: WHILE `expediente` is taken and a boss round is active, or no round is active, the Expediente factor SHALL be 1.
5. VEX-05: WHILE `expediente` is taken and a common round is active the round counter of the F38 SHALL read `Abates: k/q · -25%` below 10 kills and `Abates: k/q · +40%` from 10 kills, WHILE a boss round is active it SHALL read `Chefe` with no suffix, and WHEN the count reaches 10 THEN the debug event `expediente:on` SHALL be pushed once in that round.

**Independent Test**: `vowEffects` com 9 abates dá ×0,75 e com 10 dá ×1,4 (L-010, os dois lados do limiar); com
Fúria e 10 abates, `damageMul` = 1,3 × 1,4; na rodada de chefe com 0 abates, ×1. `vows-new.smoke`: `vows=expediente&round=4`
(cota 12): o contador lê `Abates: 9/12 · -25%` e depois `Abates: 10/12 · +40%`, com `expediente:on` uma vez.

---

### P1: Corpo emprestado ⭐ MVP

**User Story**: Como jogador que quer mais habilidades que o pool deixa, quero trocar vida máxima por uma vaga a mais,
para montar uma build de 8 habilidades.

**Why P1**: É o único jeito de passar de 7 habilidades e prova o limite do pool vindo dos votos, que a Restrição usa.

**Acceptance Criteria**:

1. VCE-01: The pool limits SHALL come from `vowEffects`: pool size the largest of 7 and the taken vows' values, talent cap the largest of 6 and the taken vows' values, technique cap 0 WHILE `restricaoCelestial` is taken and 3 otherwise; the F35 pool rules (POL-01, POL-04, POL-05) SHALL read these limits instead of the constants.
2. VCE-02: WHILE `corpoEmprestado` is taken the pool size SHALL be 8 and the talent cap SHALL be 7.
3. VCE-03: WHILE `corpoEmprestado` is taken the player max HP SHALL be multiplied by 0.75 through `vowEffects.maxHpMul` and the `statSheet`, multiplying with Corpo de vidro (0.6 × 0.75 = 0.45).
4. VCE-04: WHEN `corpoEmprestado` is taken with the HP above the new max THEN the HP SHALL become the new max, and IF the HP is at or below it THEN the HP SHALL not change.
5. VCE-05: The card line of a new item SHALL read `OCUPA VAGA a/N→b/N` and the snapshot `build.pool.total` SHALL be N, with N the current pool size.

**Independent Test**: teste puro: pool 8 e talentos 7 com o voto, 7 e 6 sem; 7 talentos com 1 técnica é aceito e o 8º
talento é recusado (`buyDenied:pool`); vida 100 vira 75. `vows-new.smoke`: `vows=corpoEmprestado` dá
`build.pool.total` 8 e a etiqueta `OCUPA VAGA 1/8→2/8` com a técnica inicial.

---

### P1: Revelação da técnica ⭐ MVP

**User Story**: Como feiticeiro, quero revelar a técnica do slot 1 para ela bater mais forte e mais largo, pagando com
um sinal mais longo que o inimigo lê, para a técnica principal virar a assinatura da build.

**Why P1**: É o voto do arquétipo feiticeiro e o único que mexe no `TechStats` de um slot só.

**Acceptance Criteria**:

1. VRV-01: WHILE `revelacao` is taken every `damage` value of the `TechStats` of the technique in slot 0 SHALL be multiplied by 1.4 on top of the relic and vow multipliers and rounded, and the `kokusenDamage` SHALL not change.
2. VRV-02: WHILE `revelacao` is taken every `radius` field of the technique blocks in the `TechStats` of the technique in slot 0 SHALL be multiplied by 1.2 and rounded, and no range field (`rangePx`, `farPx`) SHALL change.
3. VRV-03: WHILE `revelacao` is taken the `signMs` of the technique in slot 0 SHALL be its resolved value plus 150.
4. VRV-04: The techniques in slots 1 and 2 SHALL keep their `TechStats` unchanged by `revelacao`.
5. VRV-05: WHILE `revelacao` is taken and slot 0 is empty no technique SHALL be changed by it, and WHEN a technique enters slot 0 THEN VRV-01 to VRV-03 SHALL apply to it on the next frame.
6. VRV-06: WHILE the technique in slot 0 is in its sign phase with `revelacao` taken the kanji `術`, drawn in HD code art with `PALETTE` colors only, SHALL be shown above the player head following `player.renderPos`, and SHALL be removed when the sign phase ends or the cast is cancelled.
7. VRV-07: The views and the engine (orb sprite, sensor, detonation sphere, vortex, Roxo radius) SHALL read the radius from the `TechStats` of the cast, so the drawn and the simulated radius are the same number.
8. VRV-08: WHEN the vow panel shows `revelacao` THEN its boon line SHALL name the technique in slot 0 at that moment (`<name>: +40% dano e +20% raio`).

**Independent Test**: teste puro: Vermelho Nv 1 no slot 0 com o voto dá toque `round(30 × 1,4)` = 42, raio
`round(96 × 1,2)` = 115 e `signMs` 400; o mesmo Vermelho no slot 1 fica igual. Teste do adaptador (L-043): o sensor e
a esfera do Vermelho recebem 115. Conferência no jogo em HD, nos dois lados, do kanji durante o sinal.

---

### P1: Voto do Black Flash ⭐ MVP

**User Story**: Como jogador do Divergente, quero um voto que alarga a janela do Kokusen e me paga energia por ele,
cobrando do corpo a corpo fora da Zona, para a build girar em volta do Black Flash.

**Why P1**: É um dos dois votos que o plano condiciona e o que usa o teto conjunto da janela.

**Acceptance Criteria**:

1. VBF-01: WHILE `votoBlackFlash` is taken the Kokusen window bonus SHALL include +20 ms through `buildEffects`, and the sum of all window bonuses SHALL stay capped at 30 ms (BEF-03), with the base window still rolled from 50 to 90 ms.
2. VBF-02: WHILE `votoBlackFlash` is taken, WHEN a Kokusen lands THEN the player SHALL gain 15 energy on top of the Kokusen gain of today (`CE.kokusenGain`), through the `buildEffects` energy gains, capped at the max energy.
3. VBF-03: WHILE `votoBlackFlash` is taken and no equipped technique has its Kokusen Zone active (`zoneMs > 0`), the `meleeMul` of the `statSheet` SHALL be multiplied by 0.8.
4. VBF-04: WHILE `votoBlackFlash` is taken and an equipped technique has its Kokusen Zone active, the `meleeMul` SHALL not carry the 0.8 factor, and the technique damage SHALL never carry it.
5. VBF-05: WHILE `votoBlackFlash` is taken and no technique with Kokusen is equipped, VBF-03 SHALL hold on every frame.

**Independent Test**: teste puro do `buildEffects`: só o voto dá bônus 20; voto + Zona Negra Nv 1 dá 30; voto + Zona
Negra Nv 3 dá 30 (teto). `statSheet` com `zone` falso dá `meleeMul` × 0,8 e com `zone` verdadeiro sem o fator.
`vows-new.smoke`: `tech=divergente&vows=votoBlackFlash` mostra `stats.kokusenWindowBonusMs` 20 e o `stats.meleeMul`
cai 20% fora da Zona.

---

### P1: Voto de silêncio ⭐ MVP

**User Story**: Como lutador, quero que a barra de Domínio encha mais rápido com o corpo a corpo, aceitando que
técnica não carrega e que a Reversa trava durante o Domínio, para a ultimate vir mais vezes numa build de soco.

**Why P1**: É o único voto ligado à barra da F31.

**Acceptance Criteria**:

1. VSI-01: WHILE `votoDeSilencio` is taken every domain charge gain SHALL be multiplied by 1.5 (from `statSheet.domainChargeMul`), the fractional part SHALL be kept as a carry from 0 to below 1 added to the next gain, and the charge SHALL stay an integer from 0 to 100 (DOM-01).
2. VSI-02: WHILE `votoDeSilencio` is taken two light strikes that hit from charge 0 SHALL leave the charge at 3, and one heavy strike that hits SHALL add 3.
3. VSI-03: WHILE `votoDeSilencio` is taken the first non-chip hit of a technique cast and the Kokusen SHALL add no charge and SHALL not change the carry.
4. VSI-04: WHEN a domain activates or the run resets THEN the carry SHALL become 0.
5. VSI-05: WHILE `votoDeSilencio` is taken and a domain is active, holding the Reversa key SHALL not start the channel, and each new press SHALL emit `rctDenied` once and flash the energy bar (RCT-08).
6. VSI-06: WHILE `votoDeSilencio` is taken and no domain is active the Reversa SHALL work as today.
7. VSI-07: The drain of DOM-03 SHALL be unchanged by `votoDeSilencio`.

**Independent Test**: teste puro do `core/domain.ts` com multiplicador 1,5: 2 leves = 3, 1 forte = 3, 1 abate e 1 leve
= 3 (1,5 + 1,5), ativação zera o resto; conjuração e Kokusen não carregam nem mexem no resto. No ritmo de referência da seção 5.6 sem a técnica, a barra
enche antes de com o voto desligado. `vows-new.smoke`: `domain=amplificacao&charge=100&vows=votoDeSilencio`, ativa
com `P`, segura a Reversa: `rctDenied` e nenhum `rctStart`.

---

### P1: Restrição celestial ⭐ MVP

**User Story**: Como jogador que quer a build Toji/Maki, quero trocar todas as técnicas e a Reversa por força bruta,
uma vaga a mais e a arma mais forte, com o Domínio virando Amplificação, para jogar de lutador puro de verdade.

**Why P1**: É o voto que mais muda a build e o conteúdo que a conquista `chefeSemTecnica` da F39 libera.

**Acceptance Criteria**:

1. VRC-01: WHEN `restricaoCelestial` is taken THEN every equipped technique SHALL leave the build with the ABD-03 cleanup (slot empty, axes, branch and Despertar cleared, cooldown 0, pending choices out of the queue, mastery per `TechId` kept).
2. VRC-02: WHEN `restricaoCelestial` is taken THEN the wallet SHALL gain `floor(0.5 × S)`, with `S` the sum of the ABD-02 spent ledgers of the removed techniques, and the debug event `restriction:<refund>` SHALL be pushed (with `0` when nothing was refunded).
3. VRC-03: WHILE `restricaoCelestial` is taken the technique cap SHALL be 0, the pool size 8 and the talent cap 8, and no source (shop card, boss chest, free point page) SHALL offer a new technique.
4. VRC-04: WHILE `restricaoCelestial` is taken the `meleeMul` of the `statSheet` SHALL be multiplied by 1.4.
5. VRC-05: WHILE `restricaoCelestial` is taken holding the Reversa key SHALL not start the channel, heal, spend energy nor emit any `rct*` event.
6. VRC-06: WHILE `restricaoCelestial` is taken the weapon `pointCap` SHALL be 4 with the per-axis cap of 2 unchanged, and a 4th weapon point card SHALL read `Nv 4→5`.
7. VRC-07: WHEN `restricaoCelestial` is taken while the player owns a domain other than `amplificacao` THEN that domain SHALL become `amplificacao` at the same level with the same charge, the banner `Domínio → Amplificação` SHALL show for `RUN.bannerMs` and the debug event `domainConvert:<from>` SHALL be pushed.
8. VRC-08: WHILE `restricaoCelestial` is taken the Baú do Véu page SHALL show only `amplificacao`, and `Enter` SHALL take it (no automatic grant).
9. VRC-09: WHILE `restricaoCelestial` is taken no source SHALL offer a domain other than `amplificacao`, and the domain level sources of the F31 (boss chest, `dominio` card) SHALL raise the Amplificação.
10. VRC-10: WHEN `restricaoCelestial` is taken with no technique equipped and no domain owned THEN the vow SHALL be taken with refund 0 and no conversion.
11. VRC-11: WHEN the vow panel shows `restricaoCelestial` THEN its cost line SHALL carry the refund that taking it would give now (`devolve <n>`, `floor(0.5 × S)` as VRC-02), and WHILE the player owns a domain other than `amplificacao` the card SHALL show the note `<domain name> → Amplificação` below it.

**Independent Test**: teste puro: Vermelho comprado por 34 e com um ponto de 13 devolve `floor(0,5 × 47)` = 23; técnica
inicial devolve 0; técnicas 0, pool 8 e talentos 8; Santuário Nv 2 vira Amplificação Nv 2; a carta do mesmo caso diz
`devolve 23` e a nota `Santuário → Amplificação`. `vows-new.smoke`: na r5 com
`tech=vermelho&domain=santuario:2`, toma a Restrição no painel: os slots ficam vazios, `domain.owned` é
`{amplificacao, 2}`, a loja aberta logo depois não tem carta de técnica, segurar a Reversa não emite `rctStart`.

---

### P2: Snapshot e debug dos votos novos

**User Story**: Como desenvolvedor, quero ler no snapshot o que cada voto novo mudou e montar o caso pela URL, para os
smokes provarem os votos sem jogar até o chefe.

**Why P2**: Os smokes dependem disto, mas o jogador não vê.

**Acceptance Criteria**:

1. VDB-01: The debug snapshot `vows` SHALL report `eligible: VowId[]` (the untaken eligible vows, catalog order) next to the VOW-09 fields, and `vows.effects` SHALL carry the new fields (pool size, talent cap, technique cap, slot 0 damage, radius and sign deltas, Kokusen window and energy bonus, outside-Zone melee factor, domain charge multiplier, Reversa off, Reversa locked in domain), and `vows.panelText` SHALL report the text drawn on each visible card (key line, boon, cost, note).
2. VDB-02: The debug snapshot `stats` SHALL report `domainChargeMul` next to the F29 and F35 fields.
3. VDB-03: WHEN the run starts with `?debug&vows=<ids>` THEN the run reset SHALL take each known id in the list order after `tech=`, `perks=`, `arsenal=` and `domain=`, ignoring eligibility and applying the take effects (VRC-01 to VRC-07, refund 0 for free sources), and IF an id is unknown THEN that id SHALL be ignored and the rest SHALL apply.
4. VDB-04: The `README.md` SHALL list the new vow ids for `vows=` and the debug events `restriction:<refund>`, `domainConvert:<from>` and `expediente:on`.

**Independent Test**: `tests/game/debugApi.test.ts` com os campos novos; `vows-new.smoke` lê cada campo.

---

### P1: Regras da casa ⭐ MVP

**User Story**: Como desenvolvedor das fases seguintes, quero os votos novos no mesmo caminho dos de hoje, para a base
continuar com um dono só por número e dentro dos tetos do lint.

**Why P1**: A seção 4 do plano proíbe escrever multiplicador fora do agregador.

**Acceptance Criteria**:

1. VQA-01: Every number of the new vows SHALL live in `VOW` in `src/data/vows.ts`, and `src/core/vows.ts` SHALL stay pure (no Phaser import).
2. VQA-02: No new vow SHALL write `loadout.damageMul`, `loadout.vowDamageMul`, `loadout.costMul`, `player.damageTakenMul` nor `player.setMaxHp`; damage, cost, max HP and melee factors SHALL reach the game through `vowEffects` → `statSheet` → `StatsDirector`, and the Kokusen window and energy through `buildEffects`.
3. VQA-03: WHILE no new vow is taken, for the 8 vows of today × 3 relics × the talents of the F35, the `statSheet` and the `buildEffects` numbers SHALL equal the numbers before the F40.
4. VQA-04: The F40 SHALL add no net effective line to `src/scenes/TestScene.ts`, and no file SHALL be added to the exception list of `.oxlintrc.json`.
5. VQA-05: Each new vow card SHALL draw its name on one line and its boon and cost on at most 2 lines each inside the 170×130 card, its note (when it has one: `expediente`, `restricaoCelestial` converting a domain, `votoDeSilencio` with a Kokusen technique equipped) on one line below the card, checked in the game in HD.

**Independent Test**: teste de equivalência do `statSheet` (8 votos × 3 relíquias × talentos) contra os números
anteriores; `npm run gate`; conferência do painel com cada voto novo em HD.

---

## Edge Cases

- IF `votoBlackFlash` is taken and the Divergente later leaves the build (abandoned or consumed by a União) THEN the vow SHALL stay taken and VBF-05 SHALL hold until a technique with Kokusen is equipped again.
- IF `revelacao` is taken and the slot 0 technique is abandoned THEN slot 0 SHALL be empty with no Revelação effect and no kanji until a technique enters it (VRV-05).
- WHEN `restricaoCelestial` and `corpoEmprestado` are both taken THEN the pool SHALL be 8, the talent cap 8 and the technique cap 0 (largest value wins; VCE-01).
- IF `restricaoCelestial` is taken while the Baú do Véu is pending (round 3 konbini skipped with `noshop=1`) THEN the next Véu page SHALL show only `amplificacao` (VRC-08).
- WHEN `corpoEmprestado` lowers the max HP while the Reversa or the regen is healing THEN the heal SHALL stop at the new max.
- WHEN the domain charge with `votoDeSilencio` would pass 100 THEN it SHALL stop at 100 and the carry SHALL become 0.
- WHEN `expediente` is taken and no round is active (traverse or the konbini) THEN the factor SHALL be 1 (VEX-04); there is no enemy to hit, and the counter has no suffix.
- WHEN the boss round has F32 summoned enemies THEN killing them SHALL not change the Expediente factor, which stays 1 for the whole boss round (VEX-04).
- IF the fresh vow is not eligible when a panel opens (e.g. the Restrição already taken in a debug run) THEN it SHALL stay fresh and the panel SHALL draw as VEL-02 (VEL-13).
- IF the vow panel is refused with Enter THEN the shop SHALL draw its cards after the refusal, and those cards SHALL equal the cards today's code draws for the same seed and build (VEL-12).
- WHEN the run resets THEN every new vow effect SHALL clear with the taken vows (VOW-08), including the domain charge carry and the weapon `pointCap` back to 3.

---

## Implicit-requirement dimensions

| Dimension | Coverage |
| --- | --- |
| Input validation & bounds | VEL-03..07 (elegibilidade), VEX-01/02 (limiar 10), VEX-04 (chefe neutro), VBF-01 (teto 30 ms), VSI-01 (carga inteira 0 a 100, resto < 1), VCE-01 (limites do pool), VRC-06 (teto de 2 por eixo), VDB-03 (id desconhecido ignorado) |
| Failure / partial-failure states | VRC-10 (Restrição sem técnica nem Domínio), compra acima do pool recusada pelo POL-05 com os limites novos |
| Idempotency / retry / duplicate handling | VOW-05 (voto uma vez); VRC-02 (devolução numa entrada só) |
| Auth boundaries & rate limits | N/A because o jogo é local, sem usuário nem rede |
| Concurrency / ordering | VEL-12 (loja depois do voto); VDB-03 (ordem do debug); VRC-01 antes do VRC-02 na mesma escolha |
| Data lifecycle / expiry | VOW-08 e o edge case do reset (efeitos, resto da carga e `pointCap` voltam) |
| Observability | VDB-01..04 (snapshot e eventos `restriction:`, `domainConvert:`, `rctDenied`, `expediente:on`); para o jogador: VEX-05 (sufixo no contador), VRV-08 e VRC-11 (carta com o texto da build), VEL-13 (`Novo`) |
| External-dependency failure | N/A because a feature não chama serviço externo; o save da F39 não guarda votos |
| State-transition integrity | VRC-07..09 (Domínio convertido e fontes só de Amplificação), VSI-04 (resto zerado), VRV-05 (slot 0 trocado) |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| VEL-01 | P1: Sorteio que conhece a build | T20, T21, T27, T33, T35, T38 | In Tasks |
| VEL-02 | P1: Sorteio que conhece a build | T4, T5, T19 | In Tasks |
| VEL-03 | P1: Sorteio que conhece a build | T27, T38 | In Tasks |
| VEL-04 | P1: Sorteio que conhece a build | T38 | In Tasks |
| VEL-05 | P1: Sorteio que conhece a build | T33, T34 | In Tasks |
| VEL-06 | P1: Sorteio que conhece a build | T35 | In Tasks |
| VEL-07 | P1: Sorteio que conhece a build | T38 | In Tasks |
| VEL-08 | P1: Sorteio que conhece a build | T4, T20, T21 | In Tasks |
| VEL-09 | P1: Sorteio que conhece a build | T5 | In Tasks |
| VEL-10 | P1: Sorteio que conhece a build | T3, T5 | In Tasks |
| VEL-11 | P1: Sorteio que conhece a build | T4, T5, T19 | In Tasks |
| VEL-12 | P1: Sorteio que conhece a build | T18 | In Tasks |
| VEL-13 | P1: Sorteio que conhece a build | T51, T53, T54, T56 | In Tasks |
| VEX-01 | P1: Expediente | T7, T20, T26 | In Tasks |
| VEX-02 | P1: Expediente | T20, T26 | In Tasks |
| VEX-03 | P1: Expediente | T20 | In Tasks |
| VEX-04 | P1: Expediente | T7, T20, T26 | In Tasks |
| VEX-05 | P1: Expediente | T55, T56 | In Tasks |
| VCE-01 | P1: Corpo emprestado | T8, T21, T22, T23, T24, T25 | In Tasks |
| VCE-02 | P1: Corpo emprestado | T21 | In Tasks |
| VCE-03 | P1: Corpo emprestado | T21, T26 | In Tasks |
| VCE-04 | P1: Corpo emprestado | T26 | In Tasks |
| VCE-05 | P1: Corpo emprestado | T8, T22, T23, T24, T25, T26 | In Tasks |
| VRV-01 | P1: Revelação da técnica | T6, T27, T32 | In Tasks |
| VRV-02 | P1: Revelação da técnica | T6, T27, T32 | In Tasks |
| VRV-03 | P1: Revelação da técnica | T6, T27, T32 | In Tasks |
| VRV-04 | P1: Revelação da técnica | T11 | In Tasks |
| VRV-05 | P1: Revelação da técnica | T11, T30 | In Tasks |
| VRV-06 | P1: Revelação da técnica | T28, T29, T30, T32 | In Tasks |
| VRV-07 | P1: Revelação da técnica | T31, T32 | In Tasks |
| VRV-08 | P1: Revelação da técnica | T50, T51, T52, T56 | In Tasks |
| VBF-01 | P1: Voto do Black Flash | T9, T33, T34 | In Tasks |
| VBF-02 | P1: Voto do Black Flash | T9, T11, T12, T33, T34 | In Tasks |
| VBF-03 | P1: Voto do Black Flash | T7, T33, T34 | In Tasks |
| VBF-04 | P1: Voto do Black Flash | T7, T33, T34 | In Tasks |
| VBF-05 | P1: Voto do Black Flash | T7, T33 | In Tasks |
| VSI-01 | P1: Voto de silêncio | T10, T14, T16, T35, T36, T37 | In Tasks |
| VSI-02 | P1: Voto de silêncio | T14, T37 | In Tasks |
| VSI-03 | P1: Voto de silêncio | T14, T35, T37 | In Tasks |
| VSI-04 | P1: Voto de silêncio | T14, T36 | In Tasks |
| VSI-05 | P1: Voto de silêncio | T15, T17, T35, T37 | In Tasks |
| VSI-06 | P1: Voto de silêncio | T15, T37 | In Tasks |
| VSI-07 | P1: Voto de silêncio | T14 | In Tasks |
| VRC-01 | P1: Restrição celestial | T40, T45, T48 | In Tasks |
| VRC-02 | P1: Restrição celestial | T45, T48 | In Tasks |
| VRC-03 | P1: Restrição celestial | T8, T38, T42, T48 | In Tasks |
| VRC-04 | P1: Restrição celestial | T38 | In Tasks |
| VRC-05 | P1: Restrição celestial | T15, T17, T38, T48 | In Tasks |
| VRC-06 | P1: Restrição celestial | T10, T13, T16, T38, T43, T44 | In Tasks |
| VRC-07 | P1: Restrição celestial | T14, T41, T45, T48 | In Tasks |
| VRC-08 | P1: Restrição celestial | T39, T41 | In Tasks |
| VRC-09 | P1: Restrição celestial | T41 | In Tasks |
| VRC-10 | P1: Restrição celestial | T45 | In Tasks |
| VRC-11 | P1: Restrição celestial | T50, T51, T52, T56 | In Tasks |
| VDB-01 | P2: Snapshot e debug dos votos novos | T7, T19, T46 | In Tasks |
| VDB-02 | P2: Snapshot e debug dos votos novos | T16 | In Tasks |
| VDB-03 | P2: Snapshot e debug dos votos novos | T19, T45 | In Tasks |
| VDB-04 | P2: Snapshot e debug dos votos novos | T47 | In Tasks |
| VQA-01 | P1: Regras da casa | T20, T21, T27, T33, T35, T38 | In Tasks |
| VQA-02 | P1: Regras da casa | T1, T10, T16, T49 | In Tasks |
| VQA-03 | P1: Regras da casa | T2, T3, T7, T9, T10, T16 | In Tasks |
| VQA-04 | P1: Regras da casa | T49 | In Tasks |
| VQA-05 | P1: Regras da casa | T46, T49, T50, T51, T56 | In Tasks |

**ID format:** `[CATEGORY]-[NUMBER]`. Prefixos: VEL (elegibilidade), VEX (Expediente), VCE (Corpo emprestado), VRV
(Revelação), VBF (Black Flash), VSI (Silêncio), VRC (Restrição), VDB (snapshot e debug), VQA (regras da casa); nenhum
existe nas outras specs.

**Coverage:** 63 total, 63 mapped to tasks (`tasks.md`), 0 unmapped.

---

## Pontos de mudança conferidos no código

| O quê | Onde (hoje) | Por quê |
| --- | --- | --- |
| Catálogo e números | `src/data/vows.ts` (`VowId`, `VOW`, `VOWS`, `VOW_IDS`) | VEL-01, VQA-01 |
| Sorteio sem filtro | `src/core/vows.ts:35-40` (`drawVows`) | VEL-02..11 |
| Efeitos agregados | `src/core/vows.ts` (`VowEffects`, `vowEffects(taken, { kills })`) | VEX, VCE, VRC, VBF, VSI |
| Debug dos votos | `src/scenes/test/vowDirector.ts` (`reset` lê `vows=`) | VDB-03 |
| Loja sorteada antes do painel | `src/scenes/test/shopDirector.ts:121-139` | VEL-12 |
| Reversa lendo os votos | `src/scenes/test/recovery.ts:62-69`; `src/core/reverseCursed.ts` | VSI-05, VRC-05 |
| Zona e energia do Kokusen | `src/core/kokusen.ts` (`zone`, `land`); `CE.kokusenGain` em `src/data/techniques.ts:109` | VBF-02..05 |
| Folha de números (F29) | `src/core/statSheet.ts` e `src/scenes/test/statsDirector.ts` (branch `feat/fundacao-de-poder`) | VQA-02, VQA-03 |
| Carta do painel | `src/game/VowPanel.ts` (170×130, quebra em 156 px; ganho em +56, custo em +92, dica 20 px abaixo da carta) | VQA-05, VRV-08, VRC-11, VEL-13 |
| Contador de abates (F38) | `scenes/test/hordeDirector.ts` (`counterText()`) | VEX-05 |
| Lista de recém-liberados (F39) | `scenes/test/metaDirector.ts` (`freshTechniques`, `markOffered`) | VEL-13 |

---

## Success Criteria

- [ ] Numa run com o Divergente, o painel do 1º chefe pode oferecer o Voto do Black Flash; numa run sem técnica, nunca.
- [ ] Vencer o chefe da r5 sem técnica (sem save anterior) abre o painel de votos com a Restrição na 1ª carta, `Novo`.
- [ ] Nenhum voto novo sai de graça: com a Restrição tomada, o Silêncio não aparece; com o Silêncio, o Kokusen não
      carrega a barra; com o Expediente, o chefe não sai com −25%.
- [ ] Tomar a Restrição celestial no painel deixa os slots vazios, a carteira com a metade do gasto, o Domínio como
      Amplificação e a loja seguinte sem carta de técnica, no mesmo quadro em que o painel fecha.
- [ ] Os 6 votos novos têm teste puro nos dois lados de cada limiar (L-010) e passam no `vows-new.smoke` em HD.
- [ ] `npm run gate` passa e o `vows.smoke` antigo continua verde.
