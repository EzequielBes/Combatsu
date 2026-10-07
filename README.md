# Combatsu

Roguelite de luta em pixel art, para navegador (Phaser 4 + Matter.js). O jogador enfrenta ondas de espíritos
amaldiçoados num bairro de Tóquio sob o Véu, em áreas montadas por módulos, com combate corpo a corpo estilo jogo de luta, objetos do cenário como arma, técnicas
amaldiçoadas compradas na loja entre as rodadas e um chefe a cada 5 rodadas. O repositório se chama `surgue`.

O mapa das features e o que vem a seguir estão em `.specs/ROADMAP.md`; as decisões do projeto e o ponto em que o
trabalho parou, em `.specs/STATE.md`.

## Rodar

```bash
npm install
npm run dev         # servidor de desenvolvimento (normalmente http://localhost:5173)
npm test            # testes da lógica pura e da arte (Vitest, em Node)
npm run typecheck   # só o TypeScript
npm run lint        # oxlint: tetos de tamanho (400 linhas, 80 por função) e complexidade (15); exceções em .oxlintrc.json
npm run format      # Prettier em tudo (format:check só confere)
npm run gate        # typecheck + lint + format:check + test
npm run build       # typecheck + build estático em dist/
npm run smoke       # build + cenários no Edge headless (scripts/smoke/); `npm run smoke -- boss` roda só os que têm "boss" no nome
```

## Controles

| Tecla | Ação |
| --- | --- |
| A/D ou ←/→ | mover |
| W / ↑ | pular (segurar = pulo mais alto) |
| J / X | golpe leve |
| K / Z | golpe forte |
| U / Shift | guarda; apertada na hora do golpe, parry |
| Espaço (ou Q) | esquiva |
| S + Espaço | abaixar (escapa do golpe alto) |
| U + direção | virar com a guarda levantada |
| J logo depois de uma defesa certa | Contra (contra-ataque garantido) |
| E | pegar objeto / arremessar |
| S + E | largar o objeto |
| L / C e I / V | técnica do slot 1 e do slot 2 (compradas na loja) |
| F (segurar) | Energia Amaldiçoada Reversa: cura 12 HP/s gastando o dobro em energia; parado, cortada por golpe |
| J + K | finalizador, perto de um inimigo com a postura quebrada ou do chefe atordoado |
| J / Enter | começar a run (título e game over) |
| 1 / 2 / 3 e R | na loja: comprar a oferta e trocar as ofertas |
| R | fora da loja: reiniciar a área |
| Tab | mostrar/esconder o painel de controles |

O painel de controles aparece por 8 s ao iniciar e a cada reinício. Direção + golpe muda o golpe (gancho, rasteira,
chute alto e os outros do grafo em `src/data/moves.ts`).

## Mundo modular

Cada rodada acontece numa área montada com 2 módulos de cenário (rodadas 1 e 2) ou 3 (da rodada 3 em diante), sorteados
pela seed da run: `rua`, `beco` e `parque`; a rodada de chefe usa o pátio do `santuario`. Cada módulo tem o chão e
o fundo do seu tema. Os inimigos vêm em ondas, e a área é fechada à direita por um selo (uma faixa de talismãs). Ao
limpar a rodada o selo rompe e a travessia abre: é só andar até a saída. Depois da saída o jogo entra na konbini, um
mercadinho sem inimigos que é a loja; fechar a loja leva à próxima área, com módulos novos. Os módulos são escritos à
mão em `src/data/modules/` e montados por `src/core/stage.ts`.

## Modo debug

Liga com `?debug` na URL (ex.: `http://localhost:5173/?debug`) ou com F1 durante o jogo; F1 de novo desliga.

| Tecla (só no debug) | Ação |
| --- | --- |
| H | mostrar/esconder o desenho da física (Matter) |
| 1 / 2 | golpe leve / forte de teste em todos os inimigos |
| 3 | matar o player |
| 4 | tirar 50 de vida do player |

As hitboxes dos golpes aparecem como retângulos (branco = leve, âmbar = forte).

Parâmetros da URL, todos junto de `?debug`:

| Parâmetro | Efeito |
| --- | --- |
| `seed=N` | semente da run (ondas, drops, loja) |
| `round=N` | começar na rodada N: `round=5` abre o Oni do Portão, `round=15` a Tecelã de Maldições |
| `maxAlive=N` | máximo de inimigos vivos ao mesmo tempo |
| `enemyVariant=corcunda\|rastejante\|bruto` | forçar a aparência dos inimigos |
| `enemyGuard=N` | fixar a chance total de o inimigo levantar a guarda (0 = nunca, 1 = sempre); desliga a leitura de repetição |
| `enemyAttack=white\|red\|low` | forçar o tipo do golpe dos inimigos (alto, imbloqueável, baixo) |
| `enemyString=1..4` | forçar quantos golpes seguidos o inimigo dá |
| `shove=N` | chance (0 a 1) de o inimigo empurrar no 4º golpe leve seguido |
| `tech=<id>[,<id>]` | começar com técnicas equipadas (`divergente`, `vermelho`, `azul`, `corte`) |
| `fragments=N` | começar com N fragmentos |
| `noshop=1` | pular a loja entre as rodadas: a saída leva direto à próxima área, sem konbini |
| `modules=rua,beco,parque` | área de combate montada só com esses módulos, nesta ordem (ids desconhecidos ou especiais são ignorados) |
| `area=sala` | sala de teste de uma tela só (`src/data/level1.ts`), sem selo, travessia nem konbini; a loja abre na própria sala. O `fxlab` também usa a sala |
| `heal=N`, `armed=knife\|club`, `rare=1` | forçar a chance de cura, a ferramenta do inimigo armado e a raridade |
| `fxlab` | laboratório de efeitos: sem ondas, bonecos de treino, teclas 1 a 6 disparam cada efeito e 0 liga a câmera lenta |
| `hd=1` | spike de sprites HD: canvas 1280x720, zoom 2 e folha `player-hd` (1 texel = 1 px) no idle e no gancho ascendente; funciona com ou sem `debug` |

Sem `area=sala`, com ou sem `?debug`, o jogo usa o mundo modular. Os smokes antigos medem posições da sala, então o
runner (`scripts/smoke/run.mjs`) acrescenta `area=sala` a toda URL de cenário que não tenha `area=` nem `modules=`;
os smokes do mundo novo pedem `area=modular` (ou `modules=`) de forma explícita.

Com `?debug` no carregamento existe `window.__game`, usado pelos smokes: `snapshot()` devolve o estado vivo,
`step(ms)` avança o jogo em passos fixos e `render()` desenha o quadro atual.

## Organização

- `src/core/`: regras do jogo em TypeScript puro, sem Phaser, testadas no Vitest (`tests/core/`).
- `src/data/`: números de ajuste.
- `src/game/` e `src/scenes/`: adaptadores do Phaser (player, inimigo, chefe, objetos, HUD, efeitos e a cena).
- `CLAUDE.md`: mapa por assunto (regra pura, adaptador e smoke de cada parte) e o processo de trabalho.
- `src/game/art/`: toda a arte, em código.
- `scripts/smoke/`: cenários que jogam o jogo de verdade num navegador headless.
- `tools/`: prévia de sprites (`sprite-preview.mjs`) e refinamento de critérios de aceite (`jev-refine.mjs`).
- `.specs/`: roadmap, decisões, lições e uma pasta por feature (spec, design, tasks, validação).

## Onde ajustar o "feel"

- Movimento, inimigo, IA, chefe, economia e drops: `src/data/tuning.ts`
- Golpes (tempos, hitboxes, dano, efeitos) e defesa (guarda, parry, esquiva): `src/data/moves.ts`
- Abaixar, janela de Contra e Deflexão, leitura de repetição e empurrão: `DUCK`, `COUNTER` e `READING` em `src/data/moves.ts`
- Técnicas amaldiçoadas: `src/data/techniques.ts`
- Ofertas e preços da loja: `src/data/shop.ts`
- Hitstop (congelamento do golpe leve e do forte): `src/data/fx.ts`
- Objetos e ferramentas (peso, dano, durabilidade, arremesso): `src/data/props.ts`
- Módulos do mundo (grades e legenda): `src/data/modules/`; montagem da área: `src/core/stage.ts`
- Sala de teste: `src/data/level1.ts` (legenda em `src/core/level.ts`)
- Câmera (zoom, zona morta e amortecimento): `WORLD_ZOOM`, `FOLLOW_DEADZONE` e `FOLLOW_LERP` em `src/scenes/test/camera.ts`
- Ragdoll (juntas, impulso máximo): `src/game/Ragdoll.ts`
- Efeitos (faísca, poeira, rastro, tremida): `src/game/fx.ts`
- Feel amaldiçoado (rastro, impacto, deslizamento, câmera, linhas de foco): números em `src/data/feel.ts`; desenho em
  `src/game/CursedFx.ts`, `src/game/ImpactFrame.ts` e `src/game/FocusLines.ts`; ligação em `onMeleeImpact` de
  `src/scenes/test/impactFx.ts`
- De onde sai o rastro de cada golpe (ponta do punho ou do pé, por frame): `src/game/art/sprites/strikePoints.ts`

A física roda em passo fixo de 60 Hz. O que a tela mostra (player, inimigos e chefe) é a posição entre os dois
últimos passos, para o movimento ficar contínuo em qualquer monitor; a lógica e as hitboxes leem sempre o corpo.

## Arte

Toda a arte é pixel art escrita em código, em `src/game/art/`: cada sprite é
uma grade de texto (1 caractere = 1 cor, `.` = transparente), pintada em
canvas na inicialização com 1 texel = 2 px de mundo.

- Paleta única (42 cores): `src/game/art/palette.ts`
- Sprites do player, do inimigo e dos objetos: `src/game/art/sprites/`
- Frames do player: 32x30 texels, com 6 linhas de folga acima da cabeça (`PLAYER_TOP_PAD`) para golpes que sobem;
  a origem fica no pé. `tests/game/feelArt.test.ts` confere que o membro do frame de impacto chega à hitbox do golpe,
  que o boneco é uma peça só e que golpes no chão têm o pé de apoio no chão
- Chefes: `src/game/art/sprites/boss.ts` monta cada frame por pose (volumes pintados por código, rosto, chifres e pés desenhados à mão por cima); o resultado é a mesma grade de texto
- Tiles do cenário: `src/game/art/tiles.ts` (sala) e `src/game/art/tilesThemes.ts` (uma folha por tema do módulo e o selo)
- Fundo com parallax: `src/game/art/background.ts`
- Molduras das barras de vida: `src/game/art/hud.ts`
- Registro de tudo e das animações: `src/game/art/index.ts`

Toda folha passa pelo parser nos testes (`npm test`): uma cor fora da paleta
ou uma linha de largura diferente quebra o teste com o nome do sprite. Para
trocar por PNGs, carregue-os num `preload()` com as mesmas chaves de `TEX`
(`src/game/textures.ts`) e os mesmos nomes de frame.

Para revisar a arte sem abrir o jogo, `node tools/sprite-preview.mjs [pasta]` grava pranchas PNG do player e dos
inimigos (`SPRITE_SCALE=8` amplia). A pasta padrão, `docs/art/`, fica fora do git.
