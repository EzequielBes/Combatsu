# surgue (Combatsu)

Roguelite de luta em pixel art para navegador: Phaser 4 + Matter.js, TypeScript 7, Vitest. Toda a arte é código.
Responder e comentar em português do Brasil; commits em inglês (Conventional Commits).

Este arquivo é o mapa de entrada. Use-o para ir direto ao arquivo certo em vez de varrer a base.

Para o detalhe de uma pasta, rode `npm run map -- <trecho do caminho>` (ex.: `npm run map -- game/enemy`): uma linha
por arquivo com tamanho, o que faz e o que exporta, tirada do código na hora. Sem argumento, lista as pastas. Só
depois disso abra arquivos, e só os que a tarefa toca.

## Por onde começar

1. Ponto de parada: só a seção `## Handoff` de `.specs/STATE.md` (as decisões `AD-*` acima dela, só a que for citada).
2. Feature em andamento: só a pasta dela em `.specs/features/<nome>/` (spec, design, tasks, validation).
3. `.specs/LESSONS.md` e `docs/plano-sprites-hd.md`: buscar pelo termo, não ler inteiros.
4. Controles, parâmetros de URL do debug e onde ajustar cada número: `README.md`.

## Camadas

| Pasta | O que mora | Regra |
| --- | --- | --- |
| `src/core/` | Regras do jogo, puras | Sem Phaser. Cada arquivo tem o teste par em `tests/core/` |
| `src/data/` | Números de ajuste e tabelas (golpes, técnicas, loja, módulos) | Mudança de "feel" começa aqui |
| `src/game/` | Adaptadores do Phaser: uma classe por entidade | Só liga `core` + `data` ao motor |
| `src/scenes/` | `TestScene.ts` é a única cena; `test/` tem um diretor por assunto | Lógica nova vai num diretor, não na cena |
| `src/game/art/` | Arte em código | Ver "Arte" abaixo |
| `scripts/smoke/` | Cenários no navegador headless | `fight-kit.mjs` e `lib.ts` são os ajudantes |
| `tools/` | Pranchas PNG para olhar a arte | Saída em `docs/art/` ou `.fable-out/`, fora do git |

## Onde mexer, por assunto

| Assunto | Regra pura | Adaptador | Smoke |
| --- | --- | --- | --- |
| Player | `core/moveMachine`, `movement`, `defense`, `dodge`, `counter` | `game/Player.ts` + `game/player/` | `fight`, `player-anim`, `defense` |
| Inimigo comum | `core/enemyAI`, `enemyBrain`, `enemyGuard`, `attackGate` | `game/Enemy.ts` + `game/enemy/` | `enemy-`, `telegraph`, `targets` |
| Chefe | `core/bossAI`, `bossBrain`, `bossTier` | `game/Boss.ts` | `boss` |
| Técnicas | `core/cast`, `divergent`, `kokusen`, `redOrb`, `blueOrb`, `cut` | `game/TechCaster.ts`, `TechRunner.ts` + `game/tech/` (uma por técnica); vistas em `game/techFx/` | `tech`, `kokusen`, `red-anime`, `fxlab` |
| Builds e passivas | `core/build`; números em `data/perks` | `scenes/test/buildDirector` (liga cada passiva ao combate) | `build.smoke` |
| Arsenal (relíquia, arma vinculada, ferramenta) | `core/arsenal`; números em `data/arsenal` | `scenes/test/arsenalDirector` (entrega na mão a cada rodada) | `arsenal` |
| Run, ondas, loja | `core/run`, `shop`, `economy`, `loadout` | `scenes/test/runDirector`, `shopDirector`, `spawner`; `game/ShopPanel.ts` | `run-loop`, `shop`, `spawn-pressure` |
| Mundo modular | `core/stage`, `level` | `scenes/test/areaDirector`, `world`; grades em `data/modules/` | `world-` |
| Impacto e efeitos | `core/fxTimeline`, `fxRegistry` | `game/fx.ts`, `CursedFx.ts`, `cursedImpact.ts`; `scenes/test/effects`, `impactFx` | `impact`, `feel` |
| HUD | — | `game/Hud.ts`, `EnergyHud.ts`; `scenes/test/uiSetup` | `hud` |
| Objetos e drops | `core/droppedTools`, `armed` | `game/Prop.ts`, `Pickups.ts`; `scenes/test/drops` | `drops`, `held-item`, `armed` |
| Estado de debug | — | `game/debugApi.ts`, `scenes/test/snapshot` (`window.__game`) | `boot`, `no-debug` |

## Arte

| Caminho | Estado |
| --- | --- |
| `art/hd/` | A base do jogo: player a 1 texel = 1 px, ligado por padrão (`?hd=0` desliga). Golpes por família em `hd/families/`. É onde a arte nova entra |
| `art/sprites/` | Caminho antigo: grades de texto (1 caractere = 1 cor). `enemy.ts`, `player.ts`, `playerMoves.ts` são enormes e saem na fase 5: **não ler inteiros nem dividir**, buscar pelo nome do frame |
| `art/rig/` | Spike do boneco articulado, só com `?debug&rig=1`. Não evoluir |
| `art/index.ts` | Registro de todas as folhas e animações |
| `art/palette.ts` | Paleta única; cor fora dela quebra o teste |

Arte só está pronta depois de olhar a prancha (`tools/hd-boards.mjs`, `tools/sprite-preview.mjs`) e de ver o
movimento no jogo: prancha estática não mostra braço trocando de lado entre quadros.

## Processo

- **HD é a base:** todo trabalho novo é feito e conferido em HD (o padrão do jogo). A versão antiga (`?hd=0`) não
  recebe trabalho; os smokes antigos ainda rodam nela porque o runner acrescenta `hd=0`, e smoke novo pede `hd=1`.
- **Gate antes de cada commit:** `npm run gate` (typecheck, oxlint, prettier, testes).
- **Smoke só do que foi tocado:** `npm run smoke -- <trecho do nome>` (coluna "Smoke" acima). A suíte inteira é lenta.
- **Tetos do lint:** 400 linhas por arquivo, 80 por função, complexidade 15. Arquivo novo nunca entra na lista de
  exceções de `.oxlintrc.json`; a lista só encolhe.
- **Tarefa pequena ou mecânica:** direto, sem spec. O `tlc-spec-driven` é para feature com requisito novo.
- **Commits:** um por passo, só os arquivos do passo (nunca `git add -A`), sem push sem pedido. Identidade:
  `git -c user.name="EzequielBes" -c user.email="ezequieltdbeserra@gmail.com" commit`.
- **Refatoração:** mover sem mudar comportamento; se um teste lê o código-fonte de um arquivo (`?raw`), ele acompanha
  a mudança.
- **Ao fechar a sessão:** reescrever (não empilhar) o `## Handoff` de `.specs/STATE.md` e, se a estrutura mudou, as tabelas acima.
