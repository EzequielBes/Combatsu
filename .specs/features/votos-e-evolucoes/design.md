# Votos e evoluções — Design

**Spec**: `.specs/features/votos-e-evolucoes/spec.md` · **Decisão**: AD-024

## Votos

```
data/vows.ts      VowId, VOWS (nome, vantagem, custo, números)       ← ajuste de balanceamento mora aqui
core/vows.ts      Vows (tomados), drawVows(rng, tomados), vowEffects(tomados, {kills})   ← puro, testado em Node
scenes/test/vowDirector.ts   estado da run, stream de sorteio, painel aberto/fechado, ganchos no combate
game/VowPanel.ts  painel de 3 cartas (teclas 1..3, Enter recusa), mesma câmera de UI da loja
```

- **Efeitos agregados** (`vowEffects`): `maxHpMul`, `damageMul` (todo dano do player), `heavyMul`, `meleeMul`,
  `techDamageMul`, `techCostMul`, `guardOff`, `rctOff`, `rctHealMul`, `rctBelow` (fração da vida ou `null`),
  `fragmentMul`, `damageTakenMul`, `regenOff`. Multiplicadores de votos diferentes sobre o mesmo número se multiplicam
  (VOW-18). A Fúria entra em `damageMul` com os abates da rodada.
- **Ganchos** (um ponto por número, todos já existem):
  - golpe corpo a corpo: a composição `player.damageMul` da `TestScene` (hoje build × arsenal) ganha o fator do voto;
  - técnica: `loadout.damageMul` passa a ser montado num lugar só (`relíquia × voto`), e o `Loadout` ganha `costMul`
    aplicado em `cost()`;
  - dano sofrido: `Player.damageTakenMul`, aplicado em `takeHit`;
  - guarda: `inputFor` da cena zera `guardHeld`/`guardPressed` com Sem guarda;
  - Reversa e regeneração: `Recovery` lê os efeitos (desliga, multiplica, limita por vida);
  - fragmentos: `Drops` multiplica o valor da gota;
  - vida máxima: `vowDirector.syncMaxHp()` aplica `modifiers.maxHp × maxHpMul` ao tomar um voto, ao comprar `vida`
    e na run nova, com o hp limitado ao teto.
- **Quando aparece**: o `ShopDirector`, ao abrir a loja depois de uma rodada de chefe, pede ao `VowDirector` para abrir
  o painel; enquanto ele está aberto, o `updateShop` só repassa o input ao painel. Escolher ou recusar abre a loja.
- **Sorteio**: stream próprio da seed da run (`Rng(seed ^ VOW_SALT)`), consumido só pelo painel; não mexe nos
  streams da loja, das ondas nem dos módulos.

## Evolução

```
data/evolutions.ts   RECIPES: { id: 'roxo', from: ['azul', 'vermelho'], cost: 60 }
core/evolution.ts    recipeReady(recipe, loadout), Loadout.evolve(recipe)
data/shop.ts         entrada kind 'evolution' gerada das receitas
core/purple.ts       PurpleSphere: posição por tempo, alvos tocados uma vez (puro)
game/tech/purple.ts  PurpleTech: liga a esfera aos inimigos e ao chefe
game/techFx/PurpleOrb.ts   vista: esfera roxa com núcleo branco, anel e rastro que apaga
art/sprites/kanji.ts  glifo 紫 (murasaki) rasterizado como os outros
```

- `TechId` ganha `roxo`; `TECHNIQUES.roxo` com custo 70, recarga 6000 ms e dano 60 (EVO-06, EVO-07).
- `?debug&tech=azul:3,vermelho:3` equipa com nível, para os smokes chegarem na evolução sem comprar tudo.

## Riscos

- `Hud.ts`, `ShopPanel.ts` e `TestScene.ts` já estão perto dos tetos; o painel de votos é um arquivo novo e a lógica
  nova mora nos diretores.
- O `takeHit` também recebe o dano de guarda furada: o multiplicador de dano sofrido vale para os dois, como manda a
  spec ("damage the player takes").
