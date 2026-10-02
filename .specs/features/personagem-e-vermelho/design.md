# Personagem e Vermelho — Design

**Spec**: `.specs/features/personagem-e-vermelho/spec.md`
**Status**: Approved (o usuário delegou a execução: "pode seguir")
**Branch**: `feat/personagem-e-vermelho`, numa worktree separada (`scratchpad/wt-f10`), a partir de `dev`; roda em paralelo com a F11.

**Decisões ativas respeitadas:**
- AD-002: arte em grade de texto.
- AD-009: VFX só com cores da `PALETTE`, na grade de 2 px; fallback sem WebGL.
- AD-012: sel-out e baseline de bbox ±2.
- AD-017: paleta de 42 cores.

**Lição L-043:** testar a chamada do adaptador que repassa a cor, a âncora e o tuning, não só o helper puro.

## Abordagem

Só existe uma abordagem razoável: corrigir as grades na origem (`pose`/`compose`) e cobrir com testes de invariantes sobre **todas** as folhas. O efeito do Vermelho continua no `RedOrbFx`, com as cores reunidas numa constante exportada e a geometria nova gerada por helpers puros.

## Components

### 1. Invariantes da folha do player

**`src/game/art/sprites/player.ts`**
- `compose` passa a contar os pixels opacos descartados: `composeStats().clipped` ou um retorno paralelo `composeWithStats`. O `compose` público continua devolvendo `string[]`.

**`tests/game/playerConsistency.test.ts`** (novo) percorre todos os frames registrados do player, a partir das folhas de `player.ts`, `playerMoves.ts` e `playerTech.ts`:
- **SPF-01 (conexão):** os pixels opacos, sem contar `S`, formam um único componente 8-conexo.
- **SPF-02 (corte):** `clipped === 0`.
- **SPF-03 (centro do uniforme):** o centro dos pixels `n`/`N`/`o` muda no máximo 4 texels entre frames consecutivos. As sequências comparadas são as animações (`player.ts` `ANIMS`) e as fases `wind → hit → recover` de cada golpe e `sign → charge → release → recover` de cada técnica.
- **SPF-04:** o centro do uniforme do `chuteGiratorio-hit` fica a no máximo 4 texels da coluna 10.
- **SPF-05:** a altura de `land-1` é menor ou igual à de `idle-0`.

**Lista de exceções.** Se algum frame legítimo violar SPF-01 ou SPF-03 por intenção de arte (por exemplo, a esquiva ou a voadora com deslocamento grande), o worker **não** cria a exceção sozinho. Ele para e reporta o frame com a medida, e o orquestrador decide entre corrigir a arte e registrar a exceção na spec.

### 2. Correções de arte

- **`playerMoves.ts`**
  - `chuteGiratorio-hit`: espelhar só as partes (perna e braço), sem `mirror()` no frame inteiro, e manter o tronco na coluna da origem.
  - `chuteGiratorio-wind` e `chuteCarregado-wind`: as pernas encaixam no quadril (colunas do tronco).
  - `chuteEmpurrao-hit`: o braço de trás fica dentro da grade (x ≥ 0).
  - `ganchoAscendente-hit`: cabeça reta. Não há AC numérico; vale o UAT.
- **`player.ts`**
  - `land-1`: pernas no comprimento normal ou agachadas.
  - `jump-0`: o braço de trás conectado ao ombro.
- **`playerTech.ts`**
  - `WRIST_GRIP` passa por `far()` (recolor do braço de trás).
- **Baseline.** `tests/game/fixtures/playerBBoxBaseline.json` é atualizado **só** nos frames corrigidos (SPF-07). O diff do JSON tem que listar apenas esses frames.

### 3. Paleta e orbe

- **`palette.ts`:** `t: 0xd1103a` (carmim) e `T: 0xff4f8b` (magenta-claro). O teste de paleta passa de 40 para 42 (RDA-01, AD-017).
- **`techFx.ts`:** os frames de 8 e 12 do orbe usam `[0.3,'W'],[0.55,'T'],[0.8,'R'],[1,'t']`. O de 4 usa `[0.5,'W'],[1,'t']` (RDA-02).
- **`src/game/techFx/redPalette.ts`** (novo, sem `phaser`):

  ```ts
  RED_FX_COLORS = { core: 'W', glow: 't', ring: 'T', edge: 'R', ember: ['t', 'T', 'R'], shadow: 'b', flash: 't' }
  ```

  O teste verifica que nenhuma dessas chaves é `a` ou `A` e que todas estão em {`b`, `t`, `T`, `R`, `W`} (RDA-03/14). O `RedOrbFx` lê **só** dessa constante.

### 4. Âncora nos dedos

- **`playerTech.ts`:** nova função `redFingertip(frameName): { col, row }`, que devolve o pixel `R` de maior coluna do braço esticado nos frames `vermelho-sign-*`, `vermelho-charge-*` e `vermelho-release-*`.
- Junto vem `fingertipOffsetPx(frameName, facing)`, que converte para o deslocamento em px a partir da origem do sprite. A conversão usa `PLAYER_ORIGIN` e `ART_SCALE`: `x = (col − originCol)·2·facing`, `y = (row − 24)·2`.
- **Testes:** a função acha a ponta nos 3 frames e o deslocamento é espelhado com `facing = −1`.

### 5. Núcleo do Vermelho — `src/core/redOrb.ts`

- `SPEED = 760` (RDA-11).
- Novo `repulseTargets(origin, facing, targets): RepulseHit[]`. Seleciona os alvos com `(center.x − origin.x)·facing > 0`, `|dx| ≤ 80` e `|dy| ≤ 48`. Cada hit leva `damage: 4`, `strength: 'light'`, `force: 10` e `direction` normalizada para longe do player (RDA-08/09).
- **Testes:**
  - alvo a 80 px e alvo a 81 px;
  - alvo com `dy` de 48 e de 49;
  - alvo atrás do player;
  - alvo exatamente no x do player (dx = 0, não conta).

### 6. Adaptadores

**`RedOrbFx`**
- **Âncora:** `chargeUpdate` recebe o nome do frame atual do player e usa `fingertipOffsetPx` em vez de `RED_FINGERTIP_OFFSET`, nas três fases (RDA-04).
- **Carga:**
  - anel de brilho `t`;
  - `postFX.addGlow(PALETTE.t, …)` só com WebGL (RDA-06, EDG-01);
  - `red.distortRing`: dois arcos `T` com rotação de 2π a cada 400 ms (RDA-07).
- **Soltura:** o cone `red.repulse`, de 80 px, fica 120 ms (RDA-10).
- **Voo:** um fantasma por frame, com fade de 180 ms (RDA-12).
- **Detonação:**
  - flash de tela `t` (RDA-13/15);
  - esfera `b → t → W`;
  - onda de choque `T`/`t`;
  - faíscas `t`/`T`/`R` (RDA-14).
- **`debugState()`** devolve `{ glowColor, glow: { active, color }, screenFlashColor, orb: { x, y } | null }`.

**`TechRunner`**
- No `techCast:vermelho`, chama `repulseTargets` com os inimigos comuns (o chefe fica de fora, EDG-03), aplica `receiveHit` e chama `onTechHit` (RDA-08).
- Repassa o frame atual do player ao `RedOrbFx`.
- O recuo no chão (RED-15) não muda (EDG-02).

**`debugApi`**
- `fx.red` recebe o `RedOrbFx.debugState()`.
- O snapshot expõe `player.frame`, se ainda não existir, para o smoke medir a distância da âncora (RDA-04).

### 7. Smoke — `scripts/smoke/red-anime.smoke.mjs`

Roda com `?debug&tech=vermelho&enemyGuard=0` e verifica:
- durante a carga, a distância entre o orbe e a ponta esperada para o `player.frame` é ≤ 2 px;
- `fx.red.glowColor` e `fx.red.glow` (Edge headless tem WebGL);
- `red.distortRing` aparece nas camadas;
- na soltura, o inimigo da frente perde 4 de HP e é empurrado; o de trás não muda;
- o orbe percorre a 760 px/s (`traveled` ≈ 760 × t, com ±1 frame de tolerância);
- na detonação, `screenFlashColor` vale `t` e `red.screenFlash` fica ~80 ms.

## Risks & Concerns

| Risco | Mitigação |
| --- | --- |
| **SPF-01/03 podem pegar frames legítimos** (esquiva, voadora, poses de técnica) | Regra de parar e reportar; a exceção só entra com decisão do orquestrador, registrada na spec |
| **O rastro `S` pode coincidir com cor de corpo** | Verificar se `S` aparece no corpo do player; se aparecer, o teste ignora só os pixels pintados por `smear` (marcar via helper) |
| **Conflito de merge com a F11** em `debugApi.ts`, `TechRunner.ts` (a F11 adicionou `onMasteryHit`) e `tests/game/debugApi.test.ts` | A F10 mexe só nos blocos do Vermelho e no `fx.red`. O merge em `dev` é feito pelo orquestrador depois da F11, resolvendo à mão |
| **Smoke em paralelo** com o worker da F11 (CPU) causa intermitência | O worker da F10 só roda o suite de smoke no T13, depois que o W4 da F11 terminar (o orquestrador avisa) |
