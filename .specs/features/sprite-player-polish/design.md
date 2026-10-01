# Polimento do sprite do player — Design

**Spec**: `.specs/features/sprite-player-polish/spec.md`
**Decisões de base**: AD-001 (core puro testado em Node), AD-002 (grades de texto + paleta única), AD-003 (câmera com zoom 1,5).

## Visão geral

Nada muda na arquitetura: o player continua montado como boneco de papel por `compose`/`pose` (`src/game/art/sprites/player.ts`), e `playerMoves.ts`/`playerTech.ts` reaproveitam as mesmas partes. A melhoria entra em 4 frentes:

1. **Passe de sel-out automático em `compose`**: resolve o contorno interno nos 102 frames de uma vez, sem redesenhar cada pose.
2. **Partes redesenhadas com as mesmas dimensões e encaixes**: rosto, cabelo, gakuran, mãos e sapatos.
3. **Frames novos e timing por frame** para idle, pulo, ápice, queda, pouso e hurt.
4. **Seleção de animação** (`animState`) com `land` e `apex`, alimentada por `Player`.

## 1. Sel-out em `compose` (SPR-03)

Depois de sobrepor as partes, `compose` faz um passe sobre o canvas. Todo texel `k` cujos 4 vizinhos (cima, baixo, esquerda, direita) estão dentro do frame e não são `.` vira uma linha interna, escolhida pela maioria dos vizinhos:

- 2 ou mais vizinhos de pele (`p`, `P`, `q`, `x`) → `x`
- 2 ou mais vizinhos de cabelo (`h`, `j`, `H`) → `h`
- qualquer outro caso → `o`

O contorno externo, que encosta em transparente, continua `k`. Detalhes internos que precisam ficar pretos (pupila, fresta da boca) usam `b`, o preto puro que já está na paleta e que o passe não toca. O passe vale para `mirror(pose(...))` porque roda antes do espelhamento.

Função pura exportada: `selOut(canvas: string[][]): void` (ou equivalente), testável à parte.

## 2. Paleta (SPR-01)

| Chave | Cor | Uso |
| --- | --- | --- |
| `o` | `0x161d3d` | linha interna do uniforme (sel-out) |
| `x` | `0x6b3a2e` | linha de pele, orelha, queixo |
| `j` | `0x33263b` | meio-tom do cabelo |
| `y` | `0x8fa3c9` | luz de borda fria da lua (costas, à esquerda no desenho) |
| `z` | `0x9c6a1f` | sombra do dourado (botão, fivela) |

## 3. Partes (SPR-04/05/06/07)

Regra: cada parte mantém largura, altura e a posição dos pontos de encaixe (ombro na linha 0 do braço, quadril na linha 0 da perna, centro do corpo na coluna 8). A bbox de cada frame antigo pode variar até ±2 texels (SPR-06).

**Cabeça-alvo (13x11, olhando para a direita).** O worker pode refinar, mas parte desta grade:

```
...k..k..k...
..kHk.kHkjk..
.kjHjkjHjHjk.
kyjjHjjHjjjjk
kyhjjhjjhjjhk
kyhhhhhjhhjk.
kyhhhhpphhpk.
khhhxPpwbppk.
khhhxPppppppk
.khhhxPppxpk.
.knnNkxPPxk..
```

- Linha 6: franja; `hh` nas colunas 8–9 é a sobrancelha.
- Linha 7: orelha (`x`/`P`), olho com branco `w` à esquerda e pupila `b` à direita (olhando para a frente).
- Linhas 8–9: nariz na coluna 11–12, linha do queixo em `x`, boca `x`.
- `HEAD_FOCUS`: sobrancelha desce sobre o olho, que fica estreito (`h` sobre o `w`), e a boca vira `b` (dentes cerrados).
- `HEAD_HURT`: olho fechado (`b` sem `w`), sobrancelha torta e boca aberta `r`.
- `HEAD_SWAY` (novo): igual à cabeça-alvo, com as pontas das mechas das linhas 0–1 deslocadas 1 texel para trás. É o overlap do idle e da queda.

**Tronco-alvo (8x7), gakuran:**

```
koyNNsNk
kysNNANk
kyNNNznk
kyNsNANk
kyNNNznk
konnnnnk
kKKKAKKk
```

Gola alta com luz `s`, coluna de botões `A`/`z` na coluna 5, luz de borda `y` nas costas, sombra `n` embaixo e cinto `K` com fivela `A`.

**Braços:** manga com punho `s` na linha antes da mão, mão com sombra `P` e linha `x`. `armStraight(len)` ganha o punho de manga (`s`) antes do punho fechado e o nó dos dedos em `P`/`x`, com a mesma largura (`len`) e a mesma altura (5).

**Pernas:** dobra de joelho com `s` na perna da frente, calça com sombra `n` na de trás e sapato `K` com brilho `s` em cima. Mesmo tamanho de grade em `LEGS_STAND`, `LEGS_WIDE`, `RUN_LEGS[0..5]`, `LEGS_TUCK`, `LEGS_DANGLE`, `LEG_CHAMBER`, `LEG_SUPPORT` e `legStraight`. As partes locais de `playerMoves.ts`/`playerTech.ts` (`armElbow`, `armPalm`, `LEG_KNEE_UP`, `legDown`, …) recebem o mesmo acabamento.

## 4. Smear (SPR-14)

Em `jab-hit`, `cross-hit` e `kick-hit`: duas linhas curtas de `S` (3 a 5 texels), uma logo acima e outra logo abaixo do membro esticado, começando 2 texels atrás da ponta e indo para trás (colunas menores). Elas não passam da ponta, então o alcance medido não muda. Ficam numa função `smear(len, ...)`, ou embutidas na grade, sobrepostas antes do membro.

## 5. Frames novos e timing (SPR-08/09/12)

`AnimDef` ganha `durations?: readonly number[]`. A função pura `animFrameConfigs(name, def)` devolve `[{ frame, duration? }]` e lança erro quando `durations.length !== frames.length` ou quando alguma duração é ≤ 0. `registerAnims` usa essa função (o Phaser 3.90 usa `frame.duration`, quando > 0, no lugar de `msPerFrame`, conforme `Animation.js:365`).

Os nomes antigos continuam (a bbox deles fica congelada). Os frames novos são:

| Anim | Frames | Durações (ms) | Repeat | Pose |
| --- | --- | --- | --- | --- |
| idle | idle-0, idle-1, idle-2, idle-3 | 520, 160, 520, 160 | -1 | 0 neutro · 1 `drop 1` · 2 `drop 1` + `HEAD_SWAY` · 3 neutro + `HEAD_SWAY` |
| jump | jump-0, jump-1 | 70, 1000 | 0 | 0 decolagem: pernas esticadas para baixo, braços para cima · 1 = pose atual do `jump-0` (subida) |
| apex | apex-0 | — | 0 | pernas bem recolhidas (`LEGS_TUCK` 1 linha acima), braços abertos |
| fall | fall-0, fall-1 | 140, 140 | -1 | `fall-0` atual · `fall-1` com as pernas soltas alternadas e `HEAD_SWAY` |
| land | land-0, land-1 | 60, 60 | 0 | 0 agachado (`drop 2`, pernas curtas e abertas, braços à frente) · 1 `drop 1` |
| hurt | hurt, hurt-1 | 90, 220 | 0 | `hurt` atual · `hurt-1` recuando (`lean -3`, braços soltos) |

Corrida: os 6 frames ficam, com `durations` de 70, 90, 80, 70, 90, 80 (o contato passa rápido e o apoio segura) e braço com 1 texel de overlap em relação à perna.

Agachado: `drop` desce cabeça e tronco. Em `land-0` as pernas usam uma grade curta (`LEGS_CROUCH`, 4 linhas, posta em `Y_LEGS + 2`) para o tronco não sobrepor o joelho.

## 6. Seleção de animação (SPR-10/11/13)

`src/core/animState.ts`:

- `PlayerAnim` ganha `'apex' | 'land'`.
- `PlayerAnimInput` ganha `landMs: number` (ms desde o último pouso; `Infinity` se nunca pousou).
- `LAND_MS = 120`, `APEX_VY = 60`.

Precedência: hurt > golpe > ar (`apex` se |vy| < 60, senão `jump`/`fall`) > carry > land (landMs < 120) > run > idle.

`src/game/Player.ts`: campo `landMs = Infinity`. Ele vai para 0 quando `landed` (o mesmo cálculo de `kickUpDust`) e soma `dtMs` a cada update. Entra em `PlayerAnimInput` no bloco da view (≈ linha 642). Nenhuma regra de jogo muda.

## 7. Preview (SPR-15)

`tools/sprite-preview.mjs`:

1. Usa o servidor do Vite em modo middleware, ou um `vite build` de uma entrada só, para importar os `.ts` do navegador. Alternativa mais simples: registrar um hook de resolução `.ts` em Node e mandar as grades já compostas como JSON para uma página `about:blank`.
2. A página desenha num `<canvas>`, com a paleta, a 4x por texel, uma grade de frames rotulados (`player-sheet.png`) e uma tira por animação (`anim-<name>.png`, frames lado a lado com a duração escrita embaixo).
3. Tira o screenshot de cada canvas com puppeteer-core e o Edge do harness (o mesmo caminho que `scripts/smoke/run.mjs` usa).

A pasta de saída é o 1º argumento, com padrão `docs/art/`, que entra no `.gitignore`.

## Riscos

- **Pose desalinhada depois do redesenho**: pega pelo SPR-06 (bbox ±2) e pela prancha.
- **Sel-out apagando um detalhe preto proposital**: esses detalhes usam `b`.
- **Smoke que procura o frame `hurt` ou `jump-0`**: os nomes antigos continuam existindo.
