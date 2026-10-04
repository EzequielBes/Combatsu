# Veredito: PASS ✅ (Heroico alto no jogo, P3 do spike boneco-articulado), rodada 2

**Result**: PASS

**Data**: 2026-10-04
**Spec**: `.specs/features/boneco-articulado/spec.md`, história P3, PRA-01..PRA-09 (PRA-03, PRA-06 e PRA-09 com o texto ajustado em `1c78cac`)
**Faixa do diff**: `929e1ab..1c78cac` (16 arquivos, +939/−118)
**Verificador**: sub-agente independente (autor ≠ verificador), re-verificação depois do fix `1c78cac`

## Histórico

- **Rodada 1** (`929e1ab..7bf7c1b`): FAIL. Cinco lacunas:
  1. mutante `headOverNearArm` sobrevivente;
  2. ossos dos 12 quadros sem asserção;
  3. helper do PRA-06 com a cabeça 1 linha abaixo;
  4. três textos imprecisos na spec;
  5. cosméticos.
- **Rodada 2** (`1c78cac`): as cinco lacunas foram fechadas. Cada uma foi conferida abaixo e o sensor foi rodado de novo.

| Lacuna | Correção em `1c78cac` | Conferido |
| --- | --- | --- |
| 1. camada do braço sem teste | `tests/game/rigTall.test.ts:133-151`: `expect(TUNINGS[body.name]!.headOverNearArm).toBe(true)` (`:134`), a íris no lugar (`:143`), `expect(visible(set.frames.hit.frame)).toBe(total)` (`:147`) e `expect(visible(over)).toBeLessThan(total)` com `headOverNearArm: false` (`:150`) | ✅ O mutante m2 agora morre em `:134`. O mutante m, que inverte a ordem no rasterizador sem mexer no `TUNINGS`, morre em `:147` (48 ≠ 55 texels visíveis): a parte de comportamento também distingue sozinha |
| 2. ossos dos 12 quadros | `:128`: `for (const b of BONES) expect(Math.abs(measuredLength(r.joints, b) - boneLength(set.sequencePoses[i], b))).toBeLessThanOrEqual(0.5)` | ✅ Mutante novo q (`armScale` 1,15 só no quadro 3 da sequência) morto em `:128`: `quadro 3 upperArmNear: expected 0.72 ≤ 0.5` |
| 3. helper do PRA-06 | `:195` `const lift = styleOf(body).neck ? 1 : 0`, usado em `:200` (`wristOnHead`) e `:210` (`headTop`) | ✅ Igual à fórmula de `src/game/art/rig/rasterize.ts:439`. O mutante k (cabeça sem a subida) morre em `:143` e `:249` |
| 4. textos da spec | PRA-03: "the iris `b`, the keys `w` (eye highlight in idle, teeth in fight)". PRA-06: "the row right under it SHALL contain skin keys" e a nova cláusula "draw the head over the near arm so the iris texel stays visible in the hit". PRA-09: "`rosto.png` at 12x" | ✅ Os três textos batem com o código e com as asserções (`:97-100`, `:213`, `:133-151`; tamanhos dos PNG) |
| 5. cosméticos | `src/game/art/rig/heads.ts:35` diz "8 linhas". `src/game/Player.ts:266-267`: `placeView(texture = TEX.playerArt, origin = PLAYER_ORIGIN)` chama `setSheet`, e cada ramo de `animate` (`:806`, `:814`, `:824`, `:833`, `:843`, `:852`, `:866-867`, `:887`) chama `placeView` uma vez | ✅ `animate` só é chamado em `Player.ts:494`. Todo ramo passa pelo `placeView` antes de `setFrame`/`anims.play`, e `setSheet` não faz nada quando a folha já é a mesma: no máximo uma troca de textura por tick. Confirmado no jogo pelo smoke abaixo |

---

## Gate

- **Comando**: `npm run typecheck && npx vitest run --maxWorkers=2`
- **Resultado**: exit 0. `tsc --noEmit` limpo. **100 arquivos, 2499 passed, 0 failed, 0 skipped**.
- **Antes da feature**: 2457. **Depois**: 2499. **Delta**: +42, todos em `tests/game/rigTall.test.ts`, que é novo.
- **Testes do rig**: `rigTall` 42, `rigProportions` + `rig` 88, total 130, todos verdes.
- **Integridade**: `git diff 929e1ab..HEAD -- tests/game/rig.test.ts tests/game/rigProportions.test.ts` está vazio.

## Tarefas

A feature não tem `tasks.md` (spike Medium com passos implícitos de Execute). São 8 commits de feature/teste na faixa (`65fca15` a `1c78cac`), mais o handoff `7bf7c1b`.

---

## Checagem ancorada na spec (evidência ou zero)

Arquivo dos testes: `tests/game/rigTall.test.ts`. Abaixo, `:N` é a linha nesse arquivo, em `1c78cac`.

| ID | Resultado esperado pela spec | Evidência `arquivo:linha` + asserção | Resultado | Observação |
| --- | --- | --- | --- | --- |
| PRA-01 | altura de 31 a 33 = head+neck+torso+thigh+shin+sole; head/altura entre 0,19 e 0,25; pernas/altura ≥ 0,49 | `:26-27`: `expect(body.height).toBeGreaterThanOrEqual(31)` / `toBeLessThanOrEqual(33)`. `:28`: `expect(body.head + body.neck + body.torso + body.thigh + body.shin + SOLE).toBeCloseTo(body.height, 1)`. `:32-33`: `expect(body.head / body.height).toBeGreaterThanOrEqual(0.19)` / `toBeLessThanOrEqual(0.25)`. `:34`: `expect((body.thigh + body.shin + SOLE) / body.height).toBeGreaterThanOrEqual(0.49)` | ✅ PASS | 8+1,6+6,6+7,4+6,6+1,8 = 32. A cabeça dá 0,25, no limite de cima; as pernas dão 0,494. A silhueta do idle tem 33 texels, dentro do ±1 de `:46-47` |
| PRA-02 | braço, perna, pé, ombro e pelve iguais de perto e de longe | `:55-59`: `expect(len.upperArmNear).toBe(len.upperArmFar)`, e o mesmo para `foreArm`, `thigh`, `shin` e `foot`. `:60`: `expect(body.shoulderNear).toBe(body.shoulderFar)`. `:61`: `expect(body.pelvisNear).toBe(body.pelvisFar)` | ✅ PASS | — |
| PRA-03 | grades idle e de luta, cada uma com `head` linhas; `h H j`, íris `b`, `w` (brilho no idle, dentes na luta), `x`, `k`; a de luta diferente da idle | `:65-69`: `headOf` idle/fight e `toHaveLength(body.head)`. `:80`: `expect(text, ch).toContain(ch)` para `h H j b w x p P k`. `:92`: `expect(HEAD_TALL_FIGHT.grid).not.toEqual(HEAD_TALL_IDLE.grid)`. `:97`: `expect(eyeRow(HEAD_TALL_IDLE.grid)).toContain('wb')`. `:98`: `expect(eyeRow(HEAD_TALL_FIGHT.grid)).not.toContain('w')`. `:100`: `expect(mouthRow).toContain('bw')` | ✅ PASS | O texto novo da spec bate com as asserções |
| PRA-04 | idle, wind, hit, recover e os 12 quadros em 40x40: só teclas da PALETTE, uma peça, sem recorte, ossos dentro de 0,5; hit com texel na última linha | Quadros-chave: `:110-118` (40×40, `PALETTE_KEYS`, `isSingleComponent`, `clipped` 0, ossos ≤ 0,5). 12 quadros: `:123` `toHaveLength(12)`, `:126` `isSingleComponent`, `:127` `clipped` 0, `:128` ossos de cada `sequencePoses[i]` ≤ 0,5. Teclas: `:275-276` (`expect(foreign).toEqual([])` e `toEqual(RIG_TALL.sequence[i].frame)`). Hit: `:154` `expect(touchesBottom(set.frames.hit.frame)).toBe(true)` | ✅ PASS | A lacuna 2 foi fechada |
| PRA-05 | pulso do hit, com a origem 40x40, dentro de `RIG_UPPERCUT_HITBOX` (+20 px para cima) + 4 px, acima do cabelo do `idle-0`, ≥ 6 texels à frente; sem `rig=1`, `rigHitbox` dá undefined | `:164-167`: hitbox com a borda de baixo igual e a de cima −20. `:182-184`: `strikeToBody(..., { originCol: 12, rows: 40 })` e `expect(Math.abs(p.x - offsetX)).toBeLessThanOrEqual(width / 2 + 4)` (e o mesmo em y). `:185`: `expect(row).toBeLessThan(HAIR_TOP_IDLE_40)`. `:186`: `expect(col - FRAME_ORIGIN.originCol).toBeGreaterThanOrEqual(6)`. `:176`: `expect(rigHitbox('ganchoAscendente', search)).toBeUndefined()` com `''`, `?debug`, `?rig=1` e `?debug&rig=0` | ✅ PASS | Golpe na col 18, linha 9, que no corpo dá (12, −43) px. Exatamente 6 texels à frente, no limite |
| PRA-06 | pulso de perto fora da cabeça em todo quadro; no hit, linha opaca mais alta acima da cabeça e a de baixo com pele; cabeça por cima do braço de perto, com a íris visível no hit | `:205`: `expect(wristOnHead(pose), 'quadro i').toBe(false)`, com a cabeça na posição real (`:195`, `:200`). `:212`: `expect(top).toBeLessThan(headTop)` (`:210` com `lift`). `:213`: `expect(set.frames.hit.frame[top + 1]).toMatch(/[pPqx]/)`. `:134`, `:143`, `:147`, `:150`: a camada do braço e a íris visível | ✅ PASS | A lacuna 3 foi fechada e a cláusula nova tem teste |
| PRA-07 | idle com calça `K` e `n` abaixo do cinto, fivela `A`/`z`, luz `s`/`S`, borda `y`, sola sob cada sapato | `:224-225`: `expect(below).toContain('K')` / `toContain('n')`. `:226`: `toMatch(/zA/)`. `:232-234`: `toMatch(/[sS]/)`, `toContain('S')`, `toContain('y')`. `:241-244`: ≥ 2 sapatos com `s` na linha 38, `S` na 37, só `k` na 39 | ✅ PASS | — |
| PRA-08 | com `?debug&rig=1`: textura `player-rig` com 12 quadros 40x40 (origem no pé, col 12); o Player desenha os quadros no gancho e volta para `player-art`; golpe do wind e do hit = pulso do rig. Sem `rig=1`: nada de `player-rig` | Parte pura: `:263` `expect(TEX.playerRig).toBe('player-rig')`. `:269` `expect(Object.keys(sheet!)).toEqual(RIG_NAMES)`. `:272-281`: 40×40, sem tecla de fora, igual à sequência, `parseSheet` 40×40 com 12 frames. `:285-287`: sem rig, `rigTallSheet` e `rigStrike` dão undefined. `:296-298`: `expect(rig!.pt).toEqual(wrist)`, `expect(rig!.frame).toEqual({ originCol: 12, rows: 40 })`, texel de pele. `:307`: `expect(RIG_TALL_ORIGIN).toEqual({ x: 0.3, y: 1 })`. Adaptador: `src/game/art/index.ts:56-57`, `src/game/Player.ts:266-267,863-867,1190`, `src/scenes/TestScene.ts:1481,1495` | ✅ PASS (adaptador conferido por smoke do Verifier, não persistido) | **Smoke rodado por mim** num worktree de scratch em `1c78cac` (com `window.__phaser` exposto só lá para ler a textura). Com `rig=1`: `player-rig` registrada com 12 quadros de 80×80 px (40 texels × 2). W+J dispara o gancho; nos 27 ticks dele a textura é sempre `player-rig`, com origem (0,3; 1) e quadros `ganchoAscendente-rig-*`; depois volta a `player-art`/`idle-0` com a origem antiga; nenhum erro de página. Sem `rig=1`: `player-rig` não existe e o gancho usa `ganchoAscendente-wind/hit/recover` de `player-art`. Ver a observação 1 |
| PRA-09 | `heroico.png`, `tira.png` e `escala.png` a 6x e `rosto.png` a 12x em `.fable-out/` | `node tools/rig-heroico.mjs` deu exit 0 em `1c78cac`. Dimensões: heroico 660×548, tira 1512×548, escala 576×276, rosto 720×176. A conta bate: tira = 6 × (40·6 + 12) = 1512 de largura; rosto = 4 × (13·12 + 24) = 720 (12x) | ✅ PASS | — |

**Status**: 9/9 ✅. Não sobrou imprecisão na spec.

### Critérios antigos (RIG-01..10, PRP-01..05, EDG-01)

Continuam verdes: `tests/game/rig.test.ts` e `tests/game/rigProportions.test.ts` seguem idênticos a `929e1ab`, e os 88 testes passam.

---

## Sensor de discriminação (rodada 2)

Rodado num `git worktree add --detach` temporário em `1c78cac`, com `node_modules` ligado por junction. Cada mutante foi aplicado com `perl`, testado com `npx vitest run tests/game/rigTall.test.ts tests/game/rigProportions.test.ts tests/game/rig.test.ts` e revertido com `git checkout`. Depois o worktree foi removido (`git worktree remove --force` + `prune`).

| # | Arquivo:linha | Mutação | Resultado | Teste que matou |
| --- | --- | --- | --- | --- |
| a | `src/game/art/rig/flag.ts:94` | `RIG_UPPERCUT_EXTRA_PX` de 20 para 0 | ✅ morto (2) | `rigTall:162`, `:179` |
| b | `flag.ts:108` | `rigHitbox` sem `rigEnabled` | ✅ morto (4) | `rigTall:175` |
| c | `flag.ts:75` | `rigTallSheet` com 11 quadros | ✅ morto (2) | `rigTall:266` |
| d | `src/game/art/rig/presets.ts:102` | `thigh` de 7,4 para 5 | ✅ morto (4) | `rigTall:25`, `:31`, `:247`, `:311` |
| e | `presets.ts:134` | `headOf` sempre devolve a idle | ✅ morto (2) | `rigTall:64`, `:153` |
| f | `src/game/art/rig/rasterize.ts:187` | `TAILORED_STYLE.sole` false | ✅ morto (1) | `rigTall:237` |
| g | `flag.ts:88-89` | `rigStrike` troca o wind pelo hit | ✅ morto (3) | `rigTall:290` (wind e hit), `:311` |
| h | `src/game/art/rig/poses/uppercut.ts:187` | sem `grounded` | ✅ morto (1) | `rigTall:127` (`quadro 3: expected 3 to be +0`) |
| i | `rasterize.ts:184` | `litChest` false | ✅ morto (1) | `rigTall:231` |
| k | `rasterize.ts:439` | cabeça sem a subida do pescoço | ✅ morto (2) | `rigTall:143` (íris fora do lugar), `:249` |
| l | `flag.ts:74` | `rigTallSheet` sem o guarda `rigEnabled` | ✅ morto (4) | `rigTall:284` |
| m | `rasterize.ts:458` | `headOverNearArm` invertido no rasterizador | ✅ morto (2) | `rigTall:147` (48 ≠ 55), `rigProportions:82` |
| m2 | `src/game/art/rig/poses/tunings.ts:13` | `heroicoAlto.headOverNearArm` de true para false | ✅ **morto** (1) | `rigTall:134` |
| n | `tunings.ts:13` | alvo `ahead` de 7 para 5,5 | ✅ morto (1) | `rigTall:186` (via o teste de `:179`) |
| o | `uppercut.ts:189` | golpes com a cabeça idle | ✅ morto (2) | `rigTall:143`, `:153` |
| q | `uppercut.ts:191` | `armScale` 1,15 só no quadro 3 da sequência | ✅ morto (1) | `rigTall:128` (`quadro 3 upperArmNear: 0.72 ≤ 0.5`) |

**Profundidade**: ampliada (16 mutantes; m2 era o sobrevivente da rodada 1 e q mira a lacuna 2).
**Resultado**: 16/16 mortos. ✅

**Isolamento**: o `git status --porcelain` da árvore real antes do sensor e do smoke (`?? .claude/`, `?? .specs/features/boneco-articulado/validation.md`, `?? BRIEF-FABLE.md`) é idêntico ao de depois, e `git diff --quiet -- src tests tools scripts` está limpo. O smoke temporário e a exposição de `window.__phaser` existiram só no worktree de scratch, que foi apagado.

---

## Qualidade do código (amostra)

| Item | Status |
| --- | --- |
| Mudanças cirúrgicas (rig, 3 adaptadores, ferramenta, testes) | ✅ |
| Sem `rig=1` nada muda (`index.ts:56`, `Player.ts:863,1190`, `TestScene.ts:1481`; confirmado no smoke) | ✅ |
| Frames de 32x30 intactos (testes antigos iguais e verdes) | ✅ |
| Cada teste do `rigTall` mapeia para um PRA-* ou para a decisão "Camada do braço do gancho", que agora está no PRA-06 | ✅ |
| Asserções miram o valor da spec | ✅ |

---

## Lacunas restantes

Nenhuma bloqueante. Duas observações, sem pedido de correção:

1. **Um quadro do startup não aparece num tick fixo de 60 Hz.** O startup do gancho tem 90 ms divididos em 6 quadros (`RIG_PHASE_FRAMES.startup`), ou seja, 15 ms cada, menos que o tick de 16,7 ms. No smoke apareceram 11 dos 12 quadros: o `ganchoAscendente-rig-5` nunca foi desenhado. O PRA-08 não exige que cada quadro fique ao menos um tick na tela, então isso não reprova o critério. Mas a frase "toca os 12 quadros no jogo" do *Independent Test* (e o relato do smoke do autor) não se reproduz a 60 Hz. Se for importante ver os 12, o caminho é um startup ≥ 100 ms ou 5 fatias no startup.
2. **O adaptador Phaser do PRA-08 continua sem teste automatizado persistido.** A evidência é o smoke que eu rodei em scratch e descartei. Se o spike virar migração, vale um `*.smoke.mjs` com `rig=1` no repositório.

## Rastreabilidade

PRA-01..PRA-09: Verified. A tabela da spec já marca Done e continua como está.

## Resumo

**Geral**: ✅ Ready (spike pronto para a decisão do usuário).
**Checagem ancorada na spec**: 9/9.
**Sensor**: 16/16 mortos.
**Gate**: 2499 passed, 0 failed.
