# Surgue — demo de combate e movimentação

Protótipo web (Phaser 3 + Matter.js) para avaliar, jogando, se mover, bater e
usar objetos do cenário como arma é divertido. Spec:
`docs/superpowers/specs/2026-09-23-nucleo-combate-movimentacao-design.md`.

## Rodar

```bash
npm install
npm run dev     # abre o dev server (normalmente http://localhost:5173)
npm test        # testes da lógica pura (Vitest)
npm run build   # typecheck + build estático em dist/
```

## Controles

| Tecla | Ação |
| --- | --- |
| A/D ou ←/→ | mover |
| Espaço / W / ↑ | pular (segurar = pulo mais alto) |
| J / X | golpe (combo soco, soco, chute); com objeto: golpe forte |
| K / Z | pegar objeto / arremessar |
| S + K | largar objeto |
| R | reiniciar a sala |
| Tab | mostrar/esconder o painel de controles |

O painel de controles aparece por 8 s ao iniciar e a cada reinício. A barra de
vida fica no canto superior esquerdo; a barra de um inimigo aparece acima dele
depois do primeiro dano.

## Modo debug

Liga com `?debug` na URL (ex.: `http://localhost:5173/?debug`) ou com F1
durante o jogo; F1 de novo desliga. Só no modo debug:

| Tecla | Ação |
| --- | --- |
| F1 | ligar/desligar o modo debug |
| H | mostrar/esconder o desenho da física (Matter) |
| 1 / 2 | golpe leve / forte de teste em todos os inimigos |

No modo debug as hitboxes dos golpes aparecem como retângulos (branco = leve,
âmbar = forte). Fora dele, as teclas 1, 2 e H não fazem nada.

## Onde ajustar o "feel"

- Movimento, combo, inimigo, IA do inimigo e vida do player: `src/data/tuning.ts`
- Hitstop (congelamento do golpe leve e do forte): `src/data/fx.ts`
- Objetos (peso, dano, durabilidade, arremesso): `src/data/props.ts`
- Sala: `src/data/level1.ts` (legenda em `src/core/level.ts`)
- Ragdoll (juntas, impulso máximo): `src/game/Ragdoll.ts`
- Efeitos (faísca, poeira, rastro, tremida): `src/game/fx.ts`

## Arte

Toda a arte é pixel art escrita em código, em `src/game/art/`: cada sprite é
uma grade de texto (1 caractere = 1 cor, `.` = transparente), pintada em
canvas na inicialização com 1 texel = 2 px de mundo.

- Paleta única (até 32 cores): `src/game/art/palette.ts`
- Sprites do player, do inimigo e dos objetos: `src/game/art/sprites/`
- Tiles do cenário: `src/game/art/tiles.ts`
- Fundo com parallax: `src/game/art/background.ts`
- Molduras das barras de vida: `src/game/art/hud.ts`
- Registro de tudo e das animações: `src/game/art/index.ts`

Toda folha passa pelo parser nos testes (`npm test`): uma cor fora da paleta
ou uma linha de largura diferente quebra o teste com o nome do sprite. Para
trocar por PNGs, carregue-os num `preload()` com as mesmas chaves de `TEX`
(`src/game/textures.ts`) e os mesmos nomes de frame.

## Critério de sucesso da demo

- [ ] O personagem corre e pula com altura variável.
- [ ] Combo corpo a corpo de 3 golpes; o último é forte.
- [ ] Pegar, bater e arremessar cadeira (pesada, resistente) e garrafa (leve, frágil).
- [ ] Inimigo reage a golpe leve com animação e a golpe forte com ragdoll.
- [ ] Inimigo morre em ragdoll e se dissolve.
- [ ] O inimigo persegue, telegrafa e acerta; o player perde vida, pisca e renasce.
- [ ] Todo golpe que conecta congela o jogo por um instante e solta uma faísca no ponto de contato.
