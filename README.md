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
| H | mostrar/esconder o debug da física |
| 1 / 2 | golpe leve / forte de teste em todos os inimigos |

## Onde ajustar o "feel"

- Movimento, combo e inimigo: `src/data/tuning.ts`
- Objetos (peso, dano, durabilidade, arremesso): `src/data/props.ts`
- Sala: `src/data/level1.ts` (legenda em `src/core/level.ts`)
- Ragdoll (juntas, impulso máximo): `src/game/Ragdoll.ts`

## Arte

Tudo é placeholder gerado em código (`src/game/textures.ts`). Para usar pixel
art, carregue PNGs num `preload()` com as mesmas chaves de `TEX` e remova a
chamada correspondente em `createPlaceholderTextures`.

## Critério de sucesso da demo

- [ ] O personagem corre e pula com altura variável.
- [ ] Combo corpo a corpo de 3 golpes; o último é forte.
- [ ] Pegar, bater e arremessar cadeira (pesada, resistente) e garrafa (leve, frágil).
- [ ] Inimigo reage a golpe leve com animação e a golpe forte com ragdoll.
- [ ] Inimigo morre em ragdoll e se dissolve.
